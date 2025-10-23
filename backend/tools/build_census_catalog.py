# backend/tools/build_census_catalog.py
import re, json
from pathlib import Path
from typing import Optional, List, Dict
import pandas as pd
import yaml

BASE = Path("data_master/census")
RAW = BASE / "raw"
CLEAN = BASE / "clean"
CATDIR = BASE / "catalog"
CONFIG = BASE / "config" / "catalog_config.yaml"

CLEAN.mkdir(parents=True, exist_ok=True)
CATDIR.mkdir(parents=True, exist_ok=True)

def _norm_cols(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [str(c).strip().replace(" ", "_").replace("-", "_") for c in df.columns]
    return df

def _find_sa2_col(cols: List[str], hints: List[str]) -> Optional[str]:
    # exact hints first
    for h in hints:
        if h in cols:
            return h
    # regex fallback (SA2...CODE)
    patt = re.compile(r"^SA2.*CODE", re.IGNORECASE)
    for c in cols:
        if patt.search(c):
            return c
    return None

def _find_raw_for_table(table_no: str) -> Optional[Path]:
    for p in RAW.glob(f"{table_no}*.csv"):
        return p
    for p in RAW.glob(f"*{table_no}*.csv"):
        return p
    return None

def build():
    if not CONFIG.exists():
        print(f"[ERROR] Missing config: {CONFIG}")
        return

    with open(CONFIG, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    items: List[Dict] = cfg.get("items", [])
    sa2_hints: List[str] = cfg.get("sa2_code_hints", [])

    # 1) Clean each table into Parquet (wide)
    seen = set()
    for it in items:
        tno = str(it.get("table_no", "")).strip().upper()
        if not tno or tno in seen:
            continue
        seen.add(tno)

        raw_file_cfg = it.get("raw_file")
        src = Path(raw_file_cfg) if raw_file_cfg else _find_raw_for_table(tno)
        if not src or not src.exists():
            print(f"[WARN] Missing CSV for {tno}. Put it in {RAW} or set raw_file in YAML.")
            continue

        print(f"[CLEAN] {tno} <- {src.name}")
        df = pd.read_csv(src, low_memory=False)
        df = _norm_cols(df)

        sa2_col = _find_sa2_col(list(df.columns), sa2_hints)
        if not sa2_col:
            print(f"   [WARN] No SA2 code column detected in {src.name} (columns: {list(df.columns)[:8]}...)")
            continue

        df.rename(columns={sa2_col: "SA2_CODE"}, inplace=True)
        outp = CLEAN / f"{tno}_sa2.parquet"
        df.to_parquet(outp, index=False)
        print(f"   -> {outp}")

    # 2) Write catalog.csv (drives the /census endpoints)
    rows = []
    for it in items:
        rows.append({
            "id": it["id"],
            "table_no": str(it["table_no"]).strip().upper(),
            "title": it.get("title", ""),
            "keywords": ",".join(it.get("keywords", [])),
            "years": json.dumps([int(y) for y in it.get("years", [])]),
            "geo": it.get("geo", "SA2"),
            "shape": it.get("shape", "scalar"),
            "columns_template": it.get("columns_template", ""),
            "bins": json.dumps(it.get("bins", [])),
            "cats": json.dumps(it.get("cats", [])),
        })
    pd.DataFrame(rows).to_csv(CATDIR / "catalog.csv", index=False)
    print(f"[OK] catalog -> {CATDIR/'catalog.csv'}")

if __name__ == "__main__":
    build()
