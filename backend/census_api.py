# backend/census_api.py
from pathlib import Path
from typing import List, Optional, Dict
import json, re
import pandas as pd
import geopandas as gpd
from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter()

TARGET_EPSG = 7855
MASTER_GPKG = Path("data_master/master.gpkg")
BASE = Path("data_master/census")
CATALOG_CSV = BASE / "catalog" / "catalog.csv"
CLEAN_DIR = BASE / "clean"

# Load catalog
_catalog = pd.read_csv(CATALOG_CSV) if CATALOG_CSV.exists() else pd.DataFrame(
    columns=["id","table_no","title","keywords","years","geo","shape","columns_template","bins","cats"]
)
if not _catalog.empty:
    _catalog["years"] = _catalog["years"].apply(json.loads)
    _catalog["bins"] = _catalog["bins"].apply(lambda s: json.loads(s) if isinstance(s,str) and s.strip().startswith("[") else [])
    _catalog["cats"] = _catalog["cats"].apply(lambda s: json.loads(s) if isinstance(s,str) and s.strip().startswith("[") else [])

def _yy(year: int) -> str:
    return {"2011":"11","2016":"16","2021":"21"}[str(year)]

class CatalogItem(BaseModel):
    id: str
    table_no: str
    title: str
    years: List[int]
    geo: str
    shape: str

@router.get("/census/catalog/search", response_model=List[CatalogItem])
def census_search(q: str, limit: int = 8):
    if _catalog.empty:
        return []
    ql = q.lower()
    df = _catalog.copy()

    def hit(s):
        s = str(s).lower()
        return (ql in s)

    df["score"] = (
        df["title"].apply(hit).astype(int)*3 +
        df["keywords"].apply(hit).astype(int)*2 +
        df["table_no"].apply(hit).astype(int)
    )
    out = df[df["score"]>0].sort_values("score", ascending=False).head(limit)
    return [
        CatalogItem(
            id=r["id"], table_no=r["table_no"], title=r["title"],
            years=r["years"], geo=r["geo"], shape=r["shape"]
        )
        for _, r in out.iterrows()
    ]

class CensusReq(BaseModel):
    id: str
    year: int
    sa2_codes: Optional[List[str]] = None
    mask: Optional[dict] = None  # WGS84 polygon FeatureCollection (optional)

def _sa2_in_mask(mask_geojson: dict) -> List[str]:
    if not mask_geojson:
        return []
    sa2 = gpd.read_file(MASTER_GPKG, layer="sa2")
    mask = gpd.GeoDataFrame.from_features(mask_geojson, crs="EPSG:4326").to_crs(TARGET_EPSG)
    inter = sa2[sa2.geometry.intersects(mask.unary_union)]
    code_col = next((c for c in inter.columns if "SA2" in c and "CODE" in c), "SA2_CODE16")
    return inter[code_col].astype(str).unique().tolist()

@router.post("/census/data")
def census_data(req: CensusReq):
    if _catalog.empty:
        return {"error":"catalog not built yet"}, 400
    row = _catalog[_catalog["id"]==req.id]
    if row.empty:
        return {"error":"unknown id"}, 404
    item = row.iloc[0]
    table_no = item["table_no"]
    if req.year not in item["years"]:
        return {"error":"year not supported"}, 400
    yy = _yy(req.year)
    f = CLEAN_DIR / f"{table_no}_sa2.parquet"
    if not f.exists():
        return {"error":"table parquet missing"}, 404

    df = pd.read_parquet(f)

    # SA2 filtering (codes or mask)
    if req.sa2_codes:
        df = df[df["SA2_CODE"].astype(str).isin(req.sa2_codes)]
    elif req.mask:
        codes = _sa2_in_mask(req.mask)
        df = df[df["SA2_CODE"].astype(str).isin(codes)]

    templ = item["columns_template"]
    shape = item["shape"]
    payload: Dict = {"id": item["id"], "title": item["title"], "year": req.year, "shape": shape}

    if item["id"] == "pop_total":
        col = templ.format(yy=yy, sex="P")
        if col not in df.columns:
            # attempt fallback
            alt = [c for c in df.columns if re.fullmatch(r"Tot_persons_C\d{2}_[Pp]", c)]
            if alt: col = alt[0]
        out = df[["SA2_CODE", col]].copy()
        out.rename(columns={col: "TOTAL_PERSONS"}, inplace=True)
        payload["data"] = out.to_dict(orient="records")
        return payload

    if item["id"] == "pop_age":
        bins = item["bins"] or []
        cols_m = [templ.format(bin=b, yy=yy, sex="M").replace("Age_grp_", "Age_") for b in bins]
        cols_f = [templ.format(bin=b, yy=yy, sex="F").replace("Age_grp_", "Age_") for b in bins]
        keep_m = [c for c in cols_m if c in df.columns]
        keep_f = [c for c in cols_f if c in df.columns]
        out = df[["SA2_CODE"] + keep_m + keep_f].copy()
        payload["data"] = out.to_dict(orient="records")
        payload["meta"] = {"bins": bins, "male_cols": keep_m, "female_cols": keep_f}
        return payload

    # generic wide (e.g., dwellings)
    cats = item.get("cats", [])
    if cats:
        cols = [templ.format(cat=c, yy=yy) for c in cats]
        cols = [c for c in cols if c in df.columns]
        out = df[["SA2_CODE"] + cols].copy()
        payload["data"] = out.to_dict(orient="records")
        payload["meta"] = {"cats": cats, "cols": cols}
        return payload

    return {"error":"unhandled id"}, 501
