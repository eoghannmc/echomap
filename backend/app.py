# backend/app.py
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional, List
import geopandas as gpd
from shapely.ops import unary_union
from shapely.geometry import Point
from fastapi import FastAPI
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel
from pathlib import Path
from backend.utils_h3 import TARGET_EPSG, disk_and_rings
import pyogrio
from backend.analyses_meshprops_h3 import MeshPropsAnalysisH3
from functools import lru_cache
from fastapi import Query
import geopandas as gpd

# app
app = FastAPI()
MASTER_GPKG = Path("data_master/master.gpkg")

class RegionSearchRes(BaseModel):
    type: str
    code: str
    name: str
    lat: float
    lon: float
@lru_cache(maxsize=1)
def _sa2_index():
    g = gpd.read_file(MASTER_GPKG, layer="sa2")
    if g.crs is None or g.crs.to_epsg() != TARGET_EPSG:
        g = g.set_crs(TARGET_EPSG, allow_override=True)
    # common column names – adjust if your layer differs
    # try a few sensible defaults
    cand = [c for c in g.columns if c.lower().startswith("sa2_name")]
    name_col = cand[0] if cand else "SA2_NAME21"
    candc = [c for c in g.columns if "code" in c.lower()]
    code_col = candc[0] if candc else "SA2_CODE21"
    cent = g.to_crs(4326).centroid
    return [
        {"name": str(n), "code": str(c), "lat": float(pt.y), "lon": float(pt.x)}
        for n, c, pt in zip(g[name_col].fillna(""), g[code_col].fillna(""), cent)
        if pt is not None
    ]

@lru_cache(maxsize=1)
def _lga_index():
    g = gpd.read_file(MASTER_GPKG, layer="lga")
    if g.crs is None or g.crs.to_epsg() != TARGET_EPSG:
        g = g.set_crs(TARGET_EPSG, allow_override=True)
    cand = [c for c in g.columns if "name" in c.lower()]
    name_col = cand[0] if cand else "LGA_NAME"
    candc = [c for c in g.columns if "code" in c.lower()]
    code_col = candc[0] if candc else "LGA_CODE"
    cent = g.to_crs(4326).centroid
    return [
        {"name": str(n), "code": str(c), "lat": float(pt.y), "lon": float(pt.x)}
        for n, c, pt in zip(g[name_col].fillna(""), g[code_col].fillna(""), cent)
        if pt is not None
    ]

@app.get("/search/sa2")
def search_sa2(q: str = Query(min_length=2, description="substring match, case-insensitive")):
    ql = q.lower()
    rows = [r for r in _sa2_index() if ql in r["name"].lower() or (r["code"] and ql in r["code"].lower())]
    return rows[:10]

@app.get("/search/lga")
def search_lga(q: str = Query(min_length=2, description="substring match, case-insensitive")):
    ql = q.lower()
    rows = [r for r in _lga_index() if ql in r["name"].lower() or (r["code"] and ql in r["code"].lower())]
    return rows[:10]

@app.get("/search/regions")
def search_regions(q: str, type: str = "SA2", limit: int = 8):
    layer = "sa2" if type.upper() == "SA2" else "lga"
    cols = ["SA2_CODE16","SA2_NAME16","geometry"] if layer=="sa2" else ["LGA_CODE","LGA_NAME","geometry"]
    try:
        g = gpd.read_file(MASTER_GPKG, layer=layer)[cols]
        # crude contains; you can improve with casefold/startswith
        name_col = "SA2_NAME16" if layer=="sa2" else "LGA_NAME"
        g = g[g[name_col].str.contains(q, case=False, na=False)].head(limit)
        out = []
        for _, r in g.iterrows():
            c = r.geometry.centroid
            out.append(RegionSearchRes(
                type=type.upper(),
                code=str(r["SA2_CODE16"] if layer=="sa2" else r["LGA_CODE"]),
                name=str(r[name_col]),
                lat=float(c.y), lon=float(c.x)
            ).dict())
        return out
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
class HomeReq(BaseModel):
    center_lat: float
    center_lon: float
    res: int = 8
    k: int = 4  # default disk radius
# instances
_meshprops = MeshPropsAnalysisH3()

class MeshPropsReq(BaseModel):
    center_lon: float
    center_lat: float
    res: int = 8
    k: int = 4
    disk_k: Optional[int] = 1  # k=1 as requested

@app.post("/analyze/meshprops_h3")
def analyze_meshprops_h3(req: MeshPropsReq):
    out = _meshprops.run(
        req.center_lon, req.center_lat,
        res=req.res, k=req.k, disk_k=(req.disk_k or 1)
    )
    return JSONResponse(out)



@app.post("/context/home")
def context_home(req: HomeReq):
    _, disk_cells, rings, disk_poly, ring_polys = disk_and_rings(req.center_lon, req.center_lat, req.res, req.k)
    # intersect SA2 and LGA to collect codes covering the disk
    bbox = disk_poly.bounds
    # SA2
    sa2 = pyogrio.read_dataframe(MASTER_GPKG, layer="sa2", bbox=bbox)
    sa2 = sa2.to_crs(TARGET_EPSG)
    sa2 = sa2[sa2.geometry.intersects(disk_poly)]
    sa2_codes = sorted(set(sa2["SA2_CODE16"].astype(str)))

    # LGA
    lga = pyogrio.read_dataframe(MASTER_GPKG, layer="lga", bbox=bbox)
    lga = lga.to_crs(TARGET_EPSG)
    lga = lga[lga.geometry.intersects(disk_poly)]
    lga_codes = sorted(set(lga["LGA_CODE"].astype(str)))

    return {
        "h3": {"res": req.res, "k": req.k, "cells": list(disk_cells)},
        "sa2_codes": sa2_codes,
        "lga_codes": lga_codes
    }

class ClipReq(BaseModel):
    center_lat: float
    center_lon: float
    res: int = 8
    k: int = 4
    disk_k: Optional[int] = None   # if None → use k
    layer: str

@app.post("/clip")
@app.post("/clip")
def clip_layer(req: ClipReq):
    _, _, _, disk_poly, ring_polys = disk_and_rings(req.center_lon, req.center_lat, req.res, req.k)
    dk = req.k if req.disk_k is None else max(0, min(req.disk_k, req.k))
    # union of rings 0..dk
    from shapely.ops import unary_union
    mask = unary_union(ring_polys[:dk+1])
    bbox = mask.bounds

    # read bbox slice from GPKG
    try:
        g = pyogrio.read_dataframe(MASTER_GPKG, layer=req.layer, bbox=bbox)
    except Exception as e:
        return JSONResponse({"error": f"layer '{req.layer}' not found or unreadable: {e}"}, status_code=404)

    # ensure metric & intersect mask
    if g.crs is None or g.crs.to_epsg() != TARGET_EPSG:
        g = g.set_crs(TARGET_EPSG, allow_override=True)
    g = g[g.geometry.intersects(mask)]
    if len(g)==0:
        return {"type":"FeatureCollection","features":[]}

    # for heavy layers you can simplify lightly here
    out = g.to_crs(4326)
    feats = []
    for _, r in out.iterrows():
        feats.append({
            "type":"Feature",
            "geometry": r.geometry.__geo_interface__,
            "properties": {k: (None if k=="geometry" else r.get(k)) for k in out.columns if k!="geometry"}
        })
    return {"type":"FeatureCollection","features":feats}

# backend/app.py
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# --- analyzers ---
from backend.analyses_trains_h3 import TrainAnalysisH3
from backend.analyses_meshprops_h3 import MeshPropsAnalysisH3
from backend.analyses_pois_h3 import POIsAnalysisH3
from backend.analyses_zones_h3 import ZonesAnalysisH3

_h3_trains  = TrainAnalysisH3()
_meshprops  = MeshPropsAnalysisH3()
_pois       = POIsAnalysisH3()
_zones      = ZonesAnalysisH3()
# --- app & dirs ---
app = FastAPI()

FRONTEND_DIR = Path("frontend")
DATA_WEB_DIR  = Path("data_web/geojson")
FRONTEND_DIR.mkdir(parents=True, exist_ok=True)
DATA_WEB_DIR.mkdir(parents=True, exist_ok=True)

# serve the web assets
app.mount("/data",   StaticFiles(directory=str(DATA_WEB_DIR)), name="data")
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR / "static")), name="static")

@app.get("/")
def home():
    return FileResponse(str(FRONTEND_DIR / "index.html"))

# --- request models ---
class AnalyzeH3Req(BaseModel):
    center_lon: float
    center_lat: float
    res: int = 8          # H3 resolution
    k: int = 4            # build rings up to k
    band_index: int = 4   # used by trains summary
    select_mode: str = "disk"  # "disk" or "ring"
    disk_k: Optional[int] = None  # if None, uses band_index

class ZonesReq(BaseModel):
    center_lon: float
    center_lat: float
    res: int = 8
    k: int = 4
    band_index: int = 4
    clip_mode: str = "disk"            # "disk" or "ring"
    disk_k: Optional[int] = None       # if None -> use band_index
    zone_codes: Optional[List[str]] = None  # None = all

class POIsReq(BaseModel):
    center_lon: float
    center_lat: float
    res: int = 8
    k: int = 4
    disk_k: Optional[int] = 3
    include_ftypes: Optional[List[str]] = None   # None = all
    max_points: int = 4000

class MeshPropsReq(BaseModel):
    center_lon: float
    center_lat: float
    res: int = 8
    k: int = 4
    disk_k: Optional[int] = 0  # 0 = home hex only


# --- instances ---
_h3_trains = TrainAnalysisH3()
_zones     = ZonesAnalysisH3()
_pois      = POIsAnalysisH3()

# --- routes ---
@app.post("/analyze/trains_h3")
def analyze_trains_h3(req: AnalyzeH3Req):
    out = _h3_trains.run(req.center_lon, req.center_lat, req.res, req.k, req.band_index)
    return JSONResponse(out)

@app.post("/analyze/meshprops_h3")
def analyze_meshprops_h3(req: MeshPropsReq):
    out = _meshprops.run(
        center_lon=req.center_lon, center_lat=req.center_lat,
        res=req.res, k=req.k, disk_k=req.disk_k
    )
    return JSONResponse(out)

@app.post("/analyze/zones_h3")
def analyze_zones_h3(req: AnalyzeH3Req):
    out = _zones.run(req.center_lon, req.center_lat, res=req.res, k=req.k,
                     band_index=req.band_index, clip_mode="disk", disk_k=req.band_index)
    return JSONResponse(out)

@app.post("/analyze/pois_h3")
def analyze_pois_h3(req: POIsReq):
    out = _pois.run(
        req.center_lon, req.center_lat, res=req.res, k=req.k,
        disk_k=req.disk_k, include_ftypes=req.include_ftypes, max_points=req.max_points
    )
    return JSONResponse(out)



# Serve data_web/geojson at /data/
DATA_DIR = Path("data_web/geojson")
app.mount("/data", StaticFiles(directory=str(DATA_DIR), html=False), name="data")

# --- config/paths
TARGET_EPSG = 7855
MASTER_GPKG = Path("data_master/master.gpkg")
FRONTEND_DIR = Path("frontend")

# Routers
from backend.census_api import router as census_router
app.include_router(census_router)

# Static + index
app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR / "static")), name="static")

@app.get("/")
def home():
    return FileResponse(str(FRONTEND_DIR / "index.html"))


