# backend/app.py
import os
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import yaml

load_dotenv(Path(__file__).parent / ".env")

# Optional: pull data from Supabase on boot
if os.environ.get("BOOTSTRAP_FROM_SUPABASE", "false").lower() == "true":
    try:
        from storage_sync import sync as storage_sync
        storage_sync()
        print("[app] storage sync complete")
    except Exception as e:
        print(f"[app] storage sync failed: {e}")

# --- analyzers ---
from analyses_trains_h3 import TrainAnalysisH3
from analyses_meshprops_h3 import MeshPropsAnalysisH3
from analyses_pois_h3 import POIsAnalysisH3
from analyses_zones_h3 import ZonesAnalysisH3
from census_api import router as census_router




if os.environ.get("BOOTSTRAP_FROM_SUPABASE", "false").lower() == "true":
    try:
        from storage_sync import sync as storage_sync  # no dot
        storage_sync()
        print("[app] storage sync complete")
    except Exception as e:
        print(f"[app] storage sync failed: {e}")


MASTER_GPKG = Path("data_master/master.gpkg")

app = FastAPI(title="EchoApp Backend", version="1.0.0")

# CORS (adjust for your domains)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ALLOW_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Singletons
_h3_trains  = TrainAnalysisH3()
_meshprops  = MeshPropsAnalysisH3()
_pois       = POIsAnalysisH3()
_zones      = ZonesAnalysisH3()

# ---------- config endpoint ----------
CATALOG_PATH = Path(os.environ.get("MASTER_CATALOG_PATH", "config/master_catalog.yaml"))

@app.get("/config/master_catalog")
def get_master_catalog():
    if not CATALOG_PATH.exists():
        return JSONResponse({"error": f"catalog file not found: {CATALOG_PATH}"}, status_code=404)
    data = yaml.safe_load(open(CATALOG_PATH, "r", encoding="utf-8"))
    return data

# ---------- request models ----------
class HexClip(BaseModel):
    center_lat: float
    center_lon: float
    res: int = 8
    k: int = 4

class ZonesReq(HexClip):
    layer: Optional[str] = "planning_zones"
    band_index: int = 2
    codes: Optional[List[str]] = None
    clip_mode: str = "disk"  # "disk" | "band"
    simplify_tolerance_m: Optional[float] = None

class MeshPropsReq(HexClip):
    which: Optional[str] = None   # "mesh" | "parcels" | None -> both
    disk_k: Optional[int] = None  # override k for this endpoint

class POIsReq(HexClip):
    include_ftypes: Optional[List[str]] = None
    disk_k: Optional[int] = None

class TrainsReq(HexClip):
    band_index: int = 2

# ---------- routes ----------

@app.post("/analyze/zones_h3")
def analyze_zones_h3(req: ZonesReq):
    try:
        out = _zones.run(
            center_lon=req.center_lon,
            center_lat=req.center_lat,
            res=req.res,
            k=req.k,
            band_index=req.band_index,
            clip_mode=req.clip_mode,
            # layer=req.layer,  # <-- remove this line
            zone_codes=req.codes,
            simplify_tolerance_m=req.simplify_tolerance_m,  
        )
        return out
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)



@app.post("/analyze/meshprops_h3")
def analyze_meshprops_h3(req: MeshPropsReq):
    try:
        k = req.k if (req.disk_k is None) else req.disk_k
        return _meshprops.run(center_lon=req.center_lon, center_lat=req.center_lat, res=req.res, disk_k=k)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/analyze/pois_h3")
def analyze_pois_h3(req: POIsReq):
    try:
        k = req.k if (req.disk_k is None) else req.disk_k
        return _pois.run(center_lon=req.center_lon, center_lat=req.center_lat, res=req.res, disk_k=k, include_ftypes=req.include_ftypes)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/analyze/trains_h3")
def analyze_trains_h3(req: TrainsReq):
    try:
        return _h3_trains.run(center_lon=req.center_lon, center_lat=req.center_lat, res=req.res, k=req.k, band_index=req.band_index)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

# Mount the census API
app.include_router(census_router, prefix="")

@app.get("/healthz")
def healthz():
    ok = MASTER_GPKG.exists()
    return {"ok": ok, "gpkg": str(MASTER_GPKG), "catalog": str(CATALOG_PATH)}
