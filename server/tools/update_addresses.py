#!/usr/bin/env python3
"""
update_addresses.py

One-stop script to:
  1) Load Vicmap Address *Point* (from local SHP/FileGDB OR a remote ZIP URL),
  2) Reproject to WGS84 (EPSG:4326) and export a slim CSV for autocomplete,
  3) Build a fast SQLite FTS5 index for the Express /api/address-suggest route.

USAGE EXAMPLES
--------------
# SHP stored outside the project; write CSV/DB into echoapp/server/data
python server/tools/update_addresses.py --shp "D:/data/vicmap_address_point.shp"

# FileGDB; specify the layer name (open in QGIS to confirm layer)
python server/tools/update_addresses.py --gdb "D:/data/Vicmap_Address.gdb" --layer "ADDRESS_POINT"

# Download a ZIP once (if provider allows direct download); auto-extract & pick SHP/FGDB inside
python server/tools/update_addresses.py --zip-url "https://example.com/Vicmap_Address_Point.zip"

OUTPUTS
-------
echoapp/server/data/addresses.csv
echoapp/server/data/addresses.sqlite

The Express route can then query SQLite with sub-100ms responses.
"""

import argparse
import csv
import os
import re
import shutil
import sqlite3
import sys
import tempfile
import zipfile
from pathlib import Path

# Optional geospatial stack
try:
    import geopandas as gpd
    _HAS_GPD = True
except Exception:
    _HAS_GPD = False

# ---------- Configuration ----------
PROJECT_ROOT = Path(__file__).resolve().parents[2]          # echoapp/
DATA_DIR     = PROJECT_ROOT / "server" / "data"
CSV_OUT      = DATA_DIR / "addresses.csv"
SQLITE_OUT   = DATA_DIR / "addresses.sqlite"

# Column name variants we’ll try to find (Vicmap sometimes renames)
FIELD_VARIANTS = {
    "id": ["OBJECTID", "OBJECTID_1", "FID", "ID"],
    "num_road_address": ["NUM_ROAD_ADDRESS", "FULL_ADDRESS", "ADDRESS", "ADDRESS_LABEL", "ADD_FULL"],
    "road_name": ["ROAD_NAME", "STREET_NAME", "RD_NAME", "NAME", "RD_FULL_NAME"],
    "locality_name": ["LOCALITY_NAME", "LOCALITY", "SUBURB", "TOWN"],
    "postcode": ["POSTCODE", "PSTCD", "POST_CODE"],
    # coords (if already lon/lat in the data)
    "lon": ["LON", "LONG", "LONGITUDE", "X", "POINT_X"],
    "lat": ["LAT", "LATITUDE", "Y", "POINT_Y"],
    # building blocks (if num_road_address missing)
    "house_number": ["HOUSE_NUMBER", "HSE_NO", "HSE_NUM", "NUMBER_1", "ADDR_NUM"],
    "road_type": ["ROAD_TYPE", "RD_TYPE", "STREET_TYPE", "TYPE"],
    "road_suffix": ["SUFFIX", "RD_SUFFIX"],
}

# Regex to detect “starts with number” for ranking
HAS_DIGIT = re.compile(r"\d")

def find_col(cols, variants):
    """Return the first column name present from variants (case-insensitive)."""
    cols_lower = {c.lower(): c for c in cols}
    for v in variants:
        if v.lower() in cols_lower:
            return cols_lower[v.lower()]
    return None

def ensure_dirs():
    DATA_DIR.mkdir(parents=True, exist_ok=True)

def load_with_geopandas(src_path: Path, layer: str | None = None):
    """Load vector with GeoPandas (pyogrio) and return a GeoDataFrame in EPSG:4326."""
    if not _HAS_GPD:
        raise RuntimeError("geopandas/pyogrio not available")
    if src_path.suffix.lower() == ".gdb":
        if layer is None:
            raise ValueError("For FileGDB, you must pass --layer <LAYER_NAME> (open in QGIS to inspect).")
        gdf = gpd.read_file(src_path, layer=layer)
    else:
        gdf = gpd.read_file(src_path)
    # Reproject to WGS84 for lon/lat
    if gdf.crs is None:
        # Try to guess; if Vicmap is MGA94 Zone 55 (EPSG:28355), set manually
        # You can change this default if needed:
        print("WARNING: No CRS found; assuming EPSG:28355 (MGA94 Zone 55). Adjust if needed.", file=sys.stderr)
        gdf = gdf.set_crs(epsg=28355)
    gdf = gdf.to_crs(epsg=4326)
    # Extract lon/lat from geometry
    gdf["lon"] = gdf.geometry.x
    gdf["lat"] = gdf.geometry.y
    return gdf

def load_with_ogr2ogr(src_path: Path, layer: str | None = None) -> Path:
    """
    Fallback if geopandas isn't available:
    Call ogr2ogr to write a temporary CSV with lon/lat in EPSG:4326.
    Returns the temporary CSV path.
    """
    import subprocess
    tmpdir = Path(tempfile.mkdtemp())
    out_csv = tmpdir / "ogr_export.csv"
    layer_arg = []
    if src_path.suffix.lower() == ".gdb":
        if not layer:
            raise ValueError("For FileGDB, pass --layer <LAYER_NAME> with --gdb.")
        layer_arg = [layer]
    cmd = [
        "ogr2ogr", "-f", "CSV", str(out_csv), str(src_path), *layer_arg,
        "-t_srs", "EPSG:4326", "-lco", "GEOMETRY=AS_XY"
    ]
    print("Running:", " ".join(cmd))
    subprocess.check_call(cmd)
    return out_csv

def pick_vector_inside_zip(zip_path: Path) -> tuple[Path, str | None]:
    """
    Extract ZIP and return (path, layer) to pass to the loader.
    Prefer SHP. If only a GDB exists, return the .gdb path and require layer name.
    """
    tmpdir = Path(tempfile.mkdtemp())
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(tmpdir)

    # Find SHP first
    shp_list = list(tmpdir.rglob("*.shp"))
    if shp_list:
        return shp_list[0], None

    # Else find GDB
    gdb_list = list(tmpdir.rglob("*.gdb"))
    if gdb_list:
        # We cannot know the layer name here—user must pass --layer
        return gdb_list[0], None

    raise FileNotFoundError("No SHP or GDB found in ZIP.")

def download_zip(url: str) -> Path:
    import urllib.request
    tmpzip = Path(tempfile.mkdtemp()) / "download.zip"
    print(f"Downloading {url} → {tmpzip}")
    with urllib.request.urlopen(url) as resp, open(tmpzip, "wb") as f:
        shutil.copyfileobj(resp, f)
    return tmpzip

def build_num_road_address(row, cols) -> str | None:
    """
    Fallback to compose full address if NUM_ROAD_ADDRESS is missing.
    Try house_number + road_name (+ road_type) + locality + postcode.
    """
    hn = row.get(cols["house_number"]) if cols.get("house_number") else None
    rn = row.get(cols["road_name"]) if cols.get("road_name") else None
    rt = row.get(cols["road_type"]) if cols.get("road_type") else None
    loc = row.get(cols["locality_name"]) if cols.get("locality_name") else None
    pc  = row.get(cols["postcode"]) if cols.get("postcode") else None

    parts = []
    if hn: parts.append(str(hn).strip())
    if rn: parts.append(str(rn).strip())
    if rt: parts.append(str(rt).strip())
    core = " ".join([p for p in parts if p])
    tail = ", ".join([x for x in [loc and str(loc).strip(), pc and str(pc).strip()] if x])
    full = core + (f", {tail}" if tail else "")
    return full or None

def write_csv_from_gdf(gdf, csv_out: Path):
    cols = list(gdf.columns)

    # Find columns
    colmap = {}
    for key, variants in FIELD_VARIANTS.items():
        colmap[key] = find_col(cols, variants)

    # Ensure lon/lat exist
    if colmap["lon"] is None or colmap["lat"] is None:
        # Already added by load_with_geopandas
        if "lon" in gdf.columns and "lat" in gdf.columns:
            colmap["lon"], colmap["lat"] = "lon", "lat"
        else:
            raise RuntimeError("Could not determine lon/lat columns.")

    # Build rows
    records = []
    for _, r in gdf.iterrows():
        rid = r[colmap["id"]] if colmap["id"] else None
        lon = float(r[colmap["lon"]])
        lat = float(r[colmap["lat"]])

        # Prefer a ready-made combined field
        full = r[colmap["num_road_address"]] if colmap["num_road_address"] else None
        if not full or not str(full).strip():
            # compose fallback
            row_dict = {c: r.get(c, None) for c in cols}
            full = build_num_road_address(row_dict, colmap)

        locality = (r[colmap["locality_name"]] if colmap["locality_name"] else None) or ""
        postcode = (r[colmap["postcode"]] if colmap["postcode"] else None) or ""

        records.append({
            "objectid": int(rid) if rid is not None and str(rid).isdigit() else None,
            "num_road_address": str(full).upper().strip() if full else "",
            "locality_name": str(locality).upper().strip(),
            "postcode": str(postcode).strip(),
            "lon": lon,
            "lat": lat,
        })

    # Filter empties
    records = [x for x in records if x["num_road_address"]]

    # Write CSV
    csv_out.parent.mkdir(parents=True, exist_ok=True)
    with open(csv_out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["objectid","num_road_address","locality_name","postcode","lon","lat"])
        w.writeheader()
        for rec in records:
            w.writerow(rec)
    print(f"Wrote {csv_out} ({len(records):,} rows)")

def write_csv_from_csv(in_csv: Path, out_csv: Path):
    """If ogr2ogr exported a CSV with X/Y, rename to lon/lat and normalize headers."""
    import pandas as pd
    df = pd.read_csv(in_csv)
    cols = [c for c in df.columns]

    # Map columns
    def pick(name_list):
        for n in name_list:
            if n in df.columns:
                return n
            if n.lower() in [c.lower() for c in cols]:
                # case-insensitive
                return next(cc for cc in cols if cc.lower() == n.lower())
        return None

    idc  = pick(FIELD_VARIANTS["id"])
    numc = pick(FIELD_VARIANTS["num_road_address"])
    locc = pick(FIELD_VARIANTS["locality_name"])
    pcc  = pick(FIELD_VARIANTS["postcode"])
    xc   = pick(FIELD_VARIANTS["lon"]) or "X"
    yc   = pick(FIELD_VARIANTS["lat"]) or "Y"

    # Normalize & write
    out_rows = []
    for _, r in df.iterrows():
        rid = r.get(idc, None)
        full = r.get(numc, None)
        loc = r.get(locc, "")
        pc  = r.get(pcc, "")
        lon = float(r.get(xc))
        lat = float(r.get(yc))
        out_rows.append({
            "objectid": int(rid) if rid is not None and str(rid).isdigit() else None,
            "num_road_address": (str(full).upper().strip() if full else ""),
            "locality_name": str(loc).upper().strip(),
            "postcode": str(pc).strip(),
            "lon": lon,
            "lat": lat,
        })
    out_df = pd.DataFrame(out_rows)
    out_df = out_df[out_df["num_road_address"] != ""]
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    out_df.to_csv(out_csv, index=False)
    print(f"Wrote {out_csv} ({len(out_df):,} rows)")

def build_sqlite(csv_path: Path, sqlite_path: Path):
    """Create the SQLite DB with FTS5 mirroring the Node version."""
    if sqlite_path.exists():
        sqlite_path.unlink()

    con = sqlite3.connect(sqlite_path)
    con.execute("PRAGMA journal_mode=WAL;")
    con.execute("PRAGMA synchronous=NORMAL;")

    # main table
    con.executescript("""
    DROP TABLE IF EXISTS addr;
    CREATE TABLE addr (
      id INTEGER PRIMARY KEY,
      num_road_address TEXT,
      road_name TEXT,          -- unused but kept for future
      locality_name TEXT,
      postcode TEXT,
      lon REAL,
      lat REAL
    );
    """)

    # load CSV
    with open(csv_path, "r", encoding="utf-8") as f:
        dr = csv.DictReader(f)
        rows = [
            (
                r.get("objectid"),
                r.get("num_road_address",""),
                "",  # road_name placeholder
                r.get("locality_name",""),
                r.get("postcode",""),
                float(r.get("lon")),
                float(r.get("lat")),
            )
            for r in dr
        ]
    con.executemany(
        "INSERT INTO addr (id,num_road_address,road_name,locality_name,postcode,lon,lat) VALUES (?,?,?,?,?,?,?)",
        rows
    )

    # FTS5: compact, content backed by addr
    con.executescript("""
    DROP TABLE IF EXISTS addr_fts;
    CREATE VIRTUAL TABLE addr_fts USING fts5(
      full_text, content='addr', content_rowid='id', tokenize='porter'
    );
    """)
    # Populate FTS – use combined text “num_road_address, locality, postcode”
    con.execute("DELETE FROM addr_fts;")
    con.execute("""
      INSERT INTO addr_fts(rowid, full_text)
      SELECT id, TRIM(
        COALESCE(num_road_address,'') || ', ' ||
        COALESCE(locality_name,'') || ' ' ||
        COALESCE(postcode,'')
      ) FROM addr;
    """)

    con.executescript("""
    CREATE INDEX IF NOT EXISTS idx_addr_locality ON addr(locality_name, postcode);
    """)
    con.commit()
    con.close()
    print(f"Built {sqlite_path}")

def main():
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--shp", help="Path to Vicmap Address Point .shp (outside project)")
    src.add_argument("--gdb", help="Path to Vicmap FileGDB .gdb (outside project)")
    src.add_argument("--zip-url", help="Direct URL to a ZIP containing SHP or GDB")

    ap.add_argument("--layer", help="Layer name (required for GDB)")
    ap.add_argument("--csv-out", help="Override CSV output path", default=str(CSV_OUT))
    ap.add_argument("--db-out", help="Override SQLite output path", default=str(SQLITE_OUT))
    args = ap.parse_args()

    ensure_dirs()

    # 1) Resolve source path (download if zip-url)
    layer = args.layer
    if args.zip_url:
        z = download_zip(args.zip_url)
        src_path, layer_from_zip = pick_vector_inside_zip(z)
        # only overwrite layer if user didn’t pass
        layer = layer or layer_from_zip
    elif args.shp:
        src_path = Path(args.shp)
    else:
        src_path = Path(args.gdb)

    # 2) Load & write CSV
    csv_out = Path(args.csv_out)
    if _HAS_GPD:
        gdf = load_with_geopandas(src_path, layer)
        write_csv_from_gdf(gdf, csv_out)
    else:
        print("geopandas not installed—using ogr2ogr fallback.")
        ogr_csv = load_with_ogr2ogr(src_path, layer)
        write_csv_from_csv(ogr_csv, csv_out)

    # 3) Build SQLite FTS5
    build_sqlite(csv_out, Path(args.db_out))

if __name__ == "__main__":
    main()
