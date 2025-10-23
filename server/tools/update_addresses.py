# server/tools/update_addresses.py
import argparse
import logging
import re
import sys
from pathlib import Path

import pandas as pd

try:
    import geopandas as gpd
    GPD_ENGINE = "pyogrio"
except Exception:
    import geopandas as gpd
    GPD_ENGINE = None

try:
    from unidecode import unidecode
except Exception:
    def unidecode(s): return s

# --- helpers ---------------------------------------------------------------
STREET_ABBR = {
    "ROAD": "RD", "STREET": "ST", "AVENUE": "AVE", "BOULEVARD": "BLVD", "DRIVE": "DR",
    "COURT": "CT", "CRESCENT": "CRES", "HIGHWAY": "HWY", "LANE": "LN", "PLACE": "PL",
    "TERRACE": "TCE", "PARADE": "PDE", "WAY": "WAY", "CLOSE": "CL"
}

def clean_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())

def U(s: str) -> str:
    return clean_spaces(unidecode(str(s or "")).upper())

def make_street(road_name, road_type, road_suffix):
    name = U(road_name)
    typ = U(road_type)
    suf = U(road_suffix)
    if typ in STREET_ABBR: typ = STREET_ABBR[typ]
    parts = [p for p in [name, typ, suf] if p]
    return clean_spaces(" ".join(parts))

def make_number(n1, s1, n2, s2):
    a = f"{str(n1).split('.')[0]}{(s1 or '').strip()}" if pd.notna(n1) and str(n1).strip() not in ("", "nan") else ""
    if pd.notna(n2) and str(n2).strip() not in ("", "0", "nan") and str(n2) != str(n1):
        b = f"{str(n2).split('.')[0]}{(s2 or '').strip()}"
        return f"{a}–{b}".replace("--", "-")
    return a

def build_label_from_fields(row):
    # Prefer LABEL_ADD if it exists and looks complete
    lab = row.get("LABEL_ADD")
    if isinstance(lab, str) and len(lab.strip()) > 0:
        # Normalise to our uppercase style
        labU = U(lab)
        # Ensure " VIC " + postcode suffix if missing state
        if " VIC " not in labU and U(row.get("STATE")) == "VIC":
            pc = str(row.get("POSTCODE") or "").split(".")[0]
            loc = U(row.get("LOCALITY"))
            left = labU
            right = ", ".join([p for p in [loc if loc else None, f"VIC {pc}" if pc else "VIC"] if p])
            return f"{left}, {right}" if right else left
        return labU

    num = make_number(row.get("HSE_NUM1"), row.get("HSE_SUF1"),
                      row.get("HSE_NUM2"), row.get("HSE_SUF2"))
    street = make_street(row.get("ROAD_NAME"), row.get("ROAD_TYPE"), row.get("RD_SUF"))
    loc = U(row.get("LOCALITY"))
    pc = str(row.get("POSTCODE") or "").split(".")[0]
    state = U(row.get("STATE") or "VIC") or "VIC"

    left = clean_spaces(" ".join([p for p in [num, street] if p]))
    right = ", ".join([p for p in [loc, f"{state} {pc}" if pc else state] if p])
    return f"{left}, {right}" if right else left

def auto_find_shp(in_path: Path) -> Path:
    if in_path.is_file() and in_path.suffix.lower() == ".shp":
        return in_path
    cands = list(in_path.glob("**/*.shp"))
    if not cands:
        raise FileNotFoundError(f"No .shp found under {in_path}")
    # prefer names that look like ADDRESS/VMADD
    for c in cands:
        if c.stem.upper().startswith(("ADDRESS", "VMADD")):
            return c
    return cands[0]

# --- main ------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Build addresses.csv from VMADD (ADDRESS*.shp)")
    parser.add_argument("--input", "-i", required=False,
                        default=r"C:\Users\mccar\PROJECTS\2400 PyPROPERTY\MAP PLOT\SOURCE DATA\SHPFILES\ADDRESSES\VMADD",
                        help="Path to ADDRESS.shp or folder containing it")
    parser.add_argument("--out_csv", default="data/addresses.csv")
    parser.add_argument("--out_parquet", default="data/addresses.parquet")
    parser.add_argument("--max_rows", type=int, default=0)
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")

    shp_path = auto_find_shp(Path(args.input))
    logging.info(f"Reading: {shp_path}")

    try:
        gdf = gpd.read_file(shp_path, engine=GPD_ENGINE)
    except Exception:
        gdf = gpd.read_file(shp_path)

    # CRS handling
    try:
        if gdf.crs is None:
            logging.warning("Input has no CRS; assuming GDA94 / MGA Zone 55 (EPSG:28355). Adjust if needed.")
            gdf = gdf.set_crs(28355, allow_override=True)
        gdf = gdf.to_crs(4326)
    except Exception as e:
        logging.warning(f"Reprojection failed ({e}); continuing without reprojection.")

    # Expected VMADD fields (per your schema)
    needed = [
        "UFI", "HSE_NUM1", "HSE_SUF1", "HSE_NUM2", "HSE_SUF2",
        "ROAD_NAME", "ROAD_TYPE", "RD_SUF",
        "LOCALITY", "STATE", "POSTCODE",
        "LABEL_ADD"
    ]
    for c in needed:
        if c not in gdf.columns:
            # create empty if missing to keep logic safe
            gdf[c] = None

    # Build output table
    df = pd.DataFrame(gdf.drop(columns="geometry", errors="ignore"))

    # Geometry → lon/lat
    if "geometry" in gdf.columns:
        df["lon"] = gdf.geometry.x
        df["lat"] = gdf.geometry.y
    else:
        df["lon"] = None
        df["lat"] = None

    # ID
    if "UFI" in df.columns and df["UFI"].notna().any():
        df["id"] = df["UFI"].astype(str)
    else:
        df["id"] = pd.util.hash_pandas_object(df.index, index=False).astype(str)

    # Label
    df["label"] = gdf.apply(build_label_from_fields, axis=1)

    # Locality/postcode normalisation
    df["locality"] = df["LOCALITY"].map(lambda s: U(s))
    df["postcode"] = df["POSTCODE"].map(lambda s: str(s).split(".")[0] if pd.notna(s) else "")

    out = df[["id", "label", "lon", "lat", "locality", "postcode"]].copy()

    if args.max_rows and args.max_rows > 0:
        out = out.head(args.max_rows)

    Path(args.out_csv).parent.mkdir(parents=True, exist_ok=True)
    out.to_csv(args.out_csv, index=False, encoding="utf-8")
    logging.info(f"Wrote CSV: {args.out_csv} ({len(out):,} rows)")

    # Optional Parquet
    try:
        Path(args.out_parquet).parent.mkdir(parents=True, exist_ok=True)
        out.to_parquet(args.out_parquet, index=False)
        logging.info(f"Wrote Parquet: {args.out_parquet}")
    except Exception as e:
        logging.warning(f"Parquet write skipped ({e}).")

if __name__ == "__main__":
    sys.exit(main())
