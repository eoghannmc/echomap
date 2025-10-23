from pathlib import Path
import pandas as pd

RAW = Path("data_master/census/raw")
OUT = Path("data_master/census/clean")
OUT.mkdir(parents=True, exist_ok=True)

def _norm_cols(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [str(c).strip().replace(" ", "_").replace("-", "_") for c in df.columns]
    return df

def clean_table(table_no: str):
    # assuming filenames like T01_SA2_timeseries.csv etc.
    src = next((p for p in RAW.glob(f"{table_no}*.csv")), None)
    if not src:
        print(f"[WARN] missing raw for {table_no}"); return
    df = pd.read_csv(src, low_memory=False)
    df = _norm_cols(df)
    # try to locate SA2 code column
    sa2_col = next((c for c in df.columns if c.lower().startswith("sa2") and "code" in c.lower()), None)
    if not sa2_col:
        print(f"[WARN] no SA2 code col in {src}"); return
    df.rename(columns={sa2_col: "SA2_CODE"}, inplace=True)
    df.to_parquet(OUT / f"{table_no}_sa2.parquet", index=False)
    print(f"[OK] {table_no} -> {OUT / f'{table_no}_sa2.parquet'}")

if __name__ == "__main__":
    for t in ["T01","T14"]:  # add more as you grow
        clean_table(t)
