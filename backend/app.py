# backend/app.py
import os
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent / ".env")

# Download parquet files from Supabase Storage on Railway startup
from storage_download import ensure_data_files
ensure_data_files()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import yaml
from functools import lru_cache
from fastapi import HTTPException


# --- analyzers (absolute imports for running from backend dir) ---
# ORIGINAL: GeoPackage/GeoJSON-based analyzers (commented out)
# from analyses_trains_h3 import TrainAnalysisH3
# from analyses_meshprops_h3 import MeshPropsAnalysisH3
# from analyses_pois_h3 import POIsAnalysisH3
# from analyses_zones_h3 import ZonesAnalysisH3

# NEW: PostGIS-based analyzer
from analyses_postgis import PostGISAnalyzer

from census_api import router as census_router

# Hex enrichment lookup
import pandas as pd
from utils_h3 import _geo_to_cell

# ORIGINAL analyzer factories (commented out for now)
# @lru_cache(maxsize=1)
# def get_trains() -> TrainAnalysisH3:
#     try:
#         return TrainAnalysisH3()
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Trains analyzer init failed: {e}")

# NEW: PostGIS analyzer factory
@lru_cache(maxsize=1)
def get_postgis() -> PostGISAnalyzer:
    try:
        return PostGISAnalyzer()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PostGIS analyzer init failed: {e}")

# Comment out old analyzer factories
# @lru_cache(maxsize=1)
# def get_meshprops() -> MeshPropsAnalysisH3:
#     try:
#         return MeshPropsAnalysisH3()
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"MeshProps init failed: {e}")

# @lru_cache(maxsize=1)
# def get_pois() -> POIsAnalysisH3:
#     try:
#         return POIsAnalysisH3()
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"POIs init failed: {e}")

# @lru_cache(maxsize=1)
# def get_zones() -> ZonesAnalysisH3:
#     try:
#         return ZonesAnalysisH3()
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Zones init failed: {e}")


# ---------- Hex enrichment lookup ----------
HEX_ENRICHMENT_PATH = Path(__file__).parent.parent / "data_web" / "hextable" / "hex_polys_with_tags_res8_vic_enriched.parquet"
_hex_enrichment_cache = None

@lru_cache(maxsize=1)
def get_hex_enrichment_data():
    """Load and cache hex enrichment parquet data"""
    global _hex_enrichment_cache
    if _hex_enrichment_cache is None:
        if not HEX_ENRICHMENT_PATH.exists():
            raise RuntimeError(f"Hex enrichment file not found: {HEX_ENRICHMENT_PATH}")
        df = pd.read_parquet(HEX_ENRICHMENT_PATH)
        # Create a dict for fast lookup: {HexID: {SA2_NAME21, LGA_NAME24, parent_r7}}
        _hex_enrichment_cache = df.set_index('HexID')[['SA2_NAME21', 'LGA_NAME24', 'parent_r7']].to_dict('index')
    return _hex_enrichment_cache






# Optional: pull data from Supabase on boot
if os.environ.get("BOOTSTRAP_FROM_SUPABASE", "false").lower() == "true":
    try:
        from .storage_sync import sync as storage_sync
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
    """Query planning zones or SA2 boundaries from PostGIS"""
    try:
        out = get_postgis().query_zones(
            center_lon=req.center_lon,
            center_lat=req.center_lat,
            res=req.res,
            k=req.k,
            band_index=req.band_index,
            clip_mode=req.clip_mode,
            layer=req.layer,  # "planning_zones" or "sa2"
            zone_codes=req.codes,
            simplify_tolerance_m=req.simplify_tolerance_m,  
        )
        return out
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/analyze/meshprops_h3")
def analyze_meshprops_h3(req: MeshPropsReq):
    """Query mesh blocks (parcels) from PostGIS"""
    try:
        k = req.k if (req.disk_k is None) else req.disk_k
        out = get_postgis().query_meshprops(
            center_lon=req.center_lon,
            center_lat=req.center_lat,
            res=req.res,
            k=req.k,
            which=req.which,
            disk_k=k,
        )
        return out
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/analyze/parcels")
def analyze_parcels(req: MeshPropsReq):
    """Query property parcels only from PostGIS"""
    try:
        k = req.k if (req.disk_k is None) else req.disk_k
        out = get_postgis().query_meshprops(
            center_lon=req.center_lon,
            center_lat=req.center_lat,
            res=req.res,
            k=req.k,
            which="parcels",
            disk_k=k,
        )
        return out
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.post("/analyze/mesh_blocks")
def analyze_mesh_blocks(req: MeshPropsReq):
    """Query mesh blocks only from PostGIS"""
    try:
        k = req.k if (req.disk_k is None) else req.disk_k
        out = get_postgis().query_meshprops(
            center_lon=req.center_lon,
            center_lat=req.center_lat,
            res=req.res,
            k=req.k,
            which="mesh",
            disk_k=k,
        )
        return out
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

# Mount the census API
app.include_router(census_router, prefix="")

@app.get("/api/hex-info")
def get_hex_info(lat: float, lon: float, res: int = 8):
    """
    Get hex enrichment data (SA2, LGA, shard) for a location.
    
    Args:
        lat: Latitude (WGS84)
        lon: Longitude (WGS84)
        res: H3 resolution (default: 8)
    
    Returns:
        {
            "hex_id": "88be6a2103fffff",
            "sa2_name": "Horsham Surrounds",
            "lga_name": "Horsham",
            "shard_id": "87be6a210ffffff"
        }
    """
    try:
        # Calculate hex ID from lat/lon
        hex_id = _geo_to_cell(lat, lon, res)
        
        # Get enrichment data
        enrichment_data = get_hex_enrichment_data()
        
        # Lookup hex info
        if hex_id not in enrichment_data:
            return JSONResponse({
                "hex_id": hex_id,
                "sa2_name": None,
                "lga_name": None,
                "shard_id": None,
                "note": "Hex not found in enrichment data (may be outside Victoria)"
            }, status_code=200)
        
        info = enrichment_data[hex_id]
        return {
            "hex_id": hex_id,
            "sa2_name": info.get('SA2_NAME21'),
            "lga_name": info.get('LGA_NAME24'),
            "shard_id": info.get('parent_r7')
        }
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


# ---------- Data Path Configuration ----------
# Works for both local development and Railway volumes
if os.path.exists("/app/data_web"):
    # Railway production (volume mounted at /app/data_web)
    DATA_BASE = Path("/app/data_web")
else:
    # Local development (relative to backend directory)
    DATA_BASE = Path(__file__).parent.parent / "data_web"

# ---------- Places (POI) API ----------
PLACES_PARQUET_PATH = DATA_BASE / "shard_data" / "pois_h3.parquet"
_places_cache = None

# ---------- Meshblock Shards API ----------
MESHBLOCK_PARQUET_PATH = DATA_BASE / "shard_meshblock" / "SHARDED_MESHBLOCK_h3.parquet"
MESHBLOCK_LINKS_PATH = DATA_BASE / "shard_meshblock" / "SHARDED_MESHBLOCK_h3_links.parquet"
_meshblock_cache = None
_meshblock_links_cache = None

# ---------- Flora/Fauna Shards API ----------
FLORA_PARQUET_PATH = DATA_BASE / "shard_flora" / "flora_fauna_h3.parquet"
FLORA_LINKS_DIR = DATA_BASE / "shard_flora" / "flora_fauna_h3_links.parquet_by_prefix2"
_flora_cache = None
_flora_links_cache = {}

# ---------- Property Shards API ----------
PROPERTY_PARQUET_PATH = DATA_BASE / "shard_property" / "property_h3.parquet"
PROPERTY_LINKS_DIR = DATA_BASE / "shard_property" / "property_h3_links.parquet_by_prefix2"
_property_cache = None
_property_links_cache = {}

# ---------- Roads Shards API ----------
ROADS_PARQUET_PATH = DATA_BASE / "SHARDS_ROADS" / "roads_h3.parquet"
ROADS_LINKS_DIR = DATA_BASE / "SHARDS_ROADS" / "roads_h3_links.parquet_by_prefix2"
_roads_cache = None
_roads_links_cache = {}

# ---------- Contours Shards API ----------
CONTOURS_PARQUET_PATH = DATA_BASE / "SHARDS_CONTOURS" / "contours_h3.parquet"
CONTOURS_LINKS_DIR = DATA_BASE / "SHARDS_CONTOURS" / "contours_h3_links.parquet_by_prefix2"
_contours_cache = None
_contours_links_cache = {}

# ---------- Electricity Shards API ----------
ELECTRICITY_PARQUET_PATH = DATA_BASE / "SHARDS_ELEC" / "electricity_transmission_h3.parquet"
ELECTRICITY_LINKS_DIR = DATA_BASE / "SHARDS_ELEC" / "electricity_transmission_h3_links.parquet_by_prefix2"
_electricity_cache = None
_electricity_links_cache = {}

# ---------- Hydro Shards API ----------
HYDRO_MODIFIED_PARQUET_PATH = DATA_BASE / "SHARDS_HYDRO" / "modified_rivers_h3.parquet"
HYDRO_MODIFIED_LINKS_DIR = DATA_BASE / "SHARDS_HYDRO" / "modified_rivers_h3_links.parquet_by_prefix2"
HYDRO_PRIORITY_PARQUET_PATH = DATA_BASE / "SHARDS_HYDRO" / "priority_rivers_h3.parquet"
HYDRO_PRIORITY_LINKS_DIR = DATA_BASE / "SHARDS_HYDRO" / "priority_rivers_h3_links.parquet_by_prefix2"
_hydro_modified_cache = None
_hydro_priority_cache = None
_hydro_modified_links_cache = {}
_hydro_priority_links_cache = {}

# Load places metadata from catalog
@lru_cache(maxsize=1)
def get_places_metadata():
    """Load places grouping and colors - hardcoded for now to avoid YAML encoding issues"""
    
    # Group definitions from spec
    groups = {
        'cultural': {
            'color': '#D36CF6',
            'members': ['sport facility', 'recreational resource', 'reserve', 'cultural centre', 'community space', 'community venue']
        },
        'health': {
            'color': '#22B573',
            'members': ['health facility', 'hospital', 'care facility']
        },
        'social': {
            'color': '#6B5B95',
            'members': ['place of worship', 'education centre']
        },
        'industrial': {
            'color': '#5D4E37',
            'members': ['power line', 'pipeline', 'pipeline facility', 'industrial facility', 'dumping ground', 'defence site', 'agricultural area', 'cableway']
        },
        'commercial': {
            'color': '#FF8A00',
            'members': ['commercial facility']
        },
        'other': {
            'color': '#808080',
            'members': []
        }
    }
    
    # Build FTYPE -> (group_name, color) mapping
    ftype_map = {}
    for group_name, group_data in groups.items():
        color = group_data.get('color', '#808080')
        members = group_data.get('members', [])
        for ftype in members:
            ftype_map[ftype] = (group_name, color)
    
    # Default group for unmapped types
    default_group = ('other', groups.get('other', {}).get('color', '#808080'))
    
    return ftype_map, default_group

@lru_cache(maxsize=1)
def get_places_data():
    """Load and cache POI parquet data"""
    global _places_cache
    if _places_cache is None:
        if not PLACES_PARQUET_PATH.exists():
            raise RuntimeError(f"Places parquet not found: {PLACES_PARQUET_PATH}")
        
        import geopandas as gpd
        _places_cache = gpd.read_parquet(PLACES_PARQUET_PATH)
        print(f"[Places] Loaded {len(_places_cache)} POIs from parquet")
    
    return _places_cache

@lru_cache(maxsize=1)
def get_meshblock_data():
    """Load and cache meshblock parquet data"""
    global _meshblock_cache
    if _meshblock_cache is None:
        if not MESHBLOCK_PARQUET_PATH.exists():
            raise RuntimeError(f"Meshblock parquet not found: {MESHBLOCK_PARQUET_PATH}")
        
        import geopandas as gpd
        _meshblock_cache = gpd.read_parquet(MESHBLOCK_PARQUET_PATH)
        print(f"[Meshblock] Loaded {len(_meshblock_cache)} meshblocks from parquet")
    
    return _meshblock_cache

@lru_cache(maxsize=1)
def get_meshblock_links():
    """Load and cache meshblock links (feature_id -> h3_r7 shard mapping)"""
    global _meshblock_links_cache
    if _meshblock_links_cache is None:
        if not MESHBLOCK_LINKS_PATH.exists():
            raise RuntimeError(f"Meshblock links not found: {MESHBLOCK_LINKS_PATH}")
        
        import pandas as pd
        _meshblock_links_cache = pd.read_parquet(MESHBLOCK_LINKS_PATH)
        print(f"[Meshblock] Loaded {len(_meshblock_links_cache)} feature links")
    
    return _meshblock_links_cache

@lru_cache(maxsize=1)
def get_flora_data():
    """Load and cache flora/fauna parquet data"""
    global _flora_cache
    if _flora_cache is None:
        if not FLORA_PARQUET_PATH.exists():
            raise RuntimeError(f"Flora parquet not found: {FLORA_PARQUET_PATH}")
        
        import geopandas as gpd
        _flora_cache = gpd.read_parquet(FLORA_PARQUET_PATH)
        print(f"[Flora] Loaded {len(_flora_cache)} flora/fauna features from parquet")
    
    return _flora_cache

def get_flora_links_for_prefixes(prefixes: set):
    """Load flora links for specific prefixes (optimized partitioned loading)"""
    global _flora_links_cache
    import pandas as pd
    
    all_links = []
    for prefix in prefixes:
        if prefix not in _flora_links_cache:
            parquet_file = FLORA_LINKS_DIR / f"{prefix}.parquet"
            if parquet_file.exists():
                _flora_links_cache[prefix] = pd.read_parquet(parquet_file)
        
        if prefix in _flora_links_cache:
            all_links.append(_flora_links_cache[prefix])
    
    if all_links:
        return pd.concat(all_links, ignore_index=True)
    else:
        return pd.DataFrame(columns=['feature_id', 'h3_r7'])

@lru_cache(maxsize=1)
def get_property_data():
    """Load and cache property parquet data"""
    global _property_cache
    if _property_cache is None:
        if not PROPERTY_PARQUET_PATH.exists():
            raise RuntimeError(f"Property parquet not found: {PROPERTY_PARQUET_PATH}")
        
        import geopandas as gpd
        _property_cache = gpd.read_parquet(PROPERTY_PARQUET_PATH)
        print(f"[Property] Loaded {len(_property_cache)} property parcels from parquet")
    
    return _property_cache

def get_property_links_for_prefixes(prefixes: set):
    """Load property links for specific prefixes (optimized partitioned loading)"""
    global _property_links_cache
    import pandas as pd
    
    all_links = []
    for prefix in prefixes:
        if prefix not in _property_links_cache:
            parquet_file = PROPERTY_LINKS_DIR / f"{prefix}.parquet"
            if parquet_file.exists():
                _property_links_cache[prefix] = pd.read_parquet(parquet_file)
        
        if prefix in _property_links_cache:
            all_links.append(_property_links_cache[prefix])
    
    if all_links:
        return pd.concat(all_links, ignore_index=True)
    else:
        return pd.DataFrame(columns=['feature_id', 'h3_r7'])

@lru_cache(maxsize=1)
def get_roads_data():
    """Load and cache roads parquet data"""
    global _roads_cache
    if _roads_cache is None:
        if not ROADS_PARQUET_PATH.exists():
            raise RuntimeError(f"Roads parquet not found: {ROADS_PARQUET_PATH}")
        
        import geopandas as gpd
        _roads_cache = gpd.read_parquet(ROADS_PARQUET_PATH)
        print(f"[Roads] Loaded {len(_roads_cache)} road features from parquet")
    
    return _roads_cache

def get_roads_links_for_prefixes(prefixes: set):
    """Load roads links for specific prefixes (optimized partitioned loading)"""
    global _roads_links_cache
    import pandas as pd
    
    all_links = []
    for prefix in prefixes:
        if prefix not in _roads_links_cache:
            parquet_file = ROADS_LINKS_DIR / f"{prefix}.parquet"
            if parquet_file.exists():
                _roads_links_cache[prefix] = pd.read_parquet(parquet_file)
        
        if prefix in _roads_links_cache:
            all_links.append(_roads_links_cache[prefix])
    
    if all_links:
        return pd.concat(all_links, ignore_index=True)
    else:
        return pd.DataFrame(columns=['feature_id', 'h3_r7'])

@lru_cache(maxsize=1)
def get_contours_data():
    """Load and cache contours parquet data"""
    global _contours_cache
    if _contours_cache is None:
        if not CONTOURS_PARQUET_PATH.exists():
            raise RuntimeError(f"Contours parquet not found: {CONTOURS_PARQUET_PATH}")
        
        import geopandas as gpd
        _contours_cache = gpd.read_parquet(CONTOURS_PARQUET_PATH)
        print(f"[Contours] Loaded {len(_contours_cache)} contour features from parquet")
    
    return _contours_cache

def get_contours_links_for_prefixes(prefixes: set):
    """Load contours links for specific prefixes (optimized partitioned loading)"""
    global _contours_links_cache
    import pandas as pd
    
    all_links = []
    for prefix in prefixes:
        if prefix not in _contours_links_cache:
            parquet_file = CONTOURS_LINKS_DIR / f"{prefix}.parquet"
            if parquet_file.exists():
                _contours_links_cache[prefix] = pd.read_parquet(parquet_file)
        
        if prefix in _contours_links_cache:
            all_links.append(_contours_links_cache[prefix])
    
    if all_links:
        return pd.concat(all_links, ignore_index=True)
    else:
        return pd.DataFrame(columns=['feature_id', 'h3_r7'])

@lru_cache(maxsize=1)
def get_electricity_data():
    """Load and cache electricity transmission parquet data"""
    global _electricity_cache
    if _electricity_cache is None:
        if not ELECTRICITY_PARQUET_PATH.exists():
            raise RuntimeError(f"Electricity parquet not found: {ELECTRICITY_PARQUET_PATH}")
        
        import geopandas as gpd
        _electricity_cache = gpd.read_parquet(ELECTRICITY_PARQUET_PATH)
        print(f"[Electricity] Loaded {len(_electricity_cache)} transmission line features from parquet")
    
    return _electricity_cache

def get_electricity_links_for_prefixes(prefixes: set):
    """Load electricity links for specific prefixes (optimized partitioned loading)"""
    global _electricity_links_cache
    import pandas as pd
    
    all_links = []
    for prefix in prefixes:
        if prefix not in _electricity_links_cache:
            parquet_file = ELECTRICITY_LINKS_DIR / f"{prefix}.parquet"
            if parquet_file.exists():
                _electricity_links_cache[prefix] = pd.read_parquet(parquet_file)
        
        if prefix in _electricity_links_cache:
            all_links.append(_electricity_links_cache[prefix])
    
    if all_links:
        return pd.concat(all_links, ignore_index=True)
    else:
        return pd.DataFrame(columns=['feature_id', 'h3_r7'])

@lru_cache(maxsize=1)
def get_hydro_modified_data():
    """Load and cache modified rivers parquet data"""
    global _hydro_modified_cache
    if _hydro_modified_cache is None:
        if not HYDRO_MODIFIED_PARQUET_PATH.exists():
            raise RuntimeError(f"Modified rivers parquet not found: {HYDRO_MODIFIED_PARQUET_PATH}")
        
        import geopandas as gpd
        _hydro_modified_cache = gpd.read_parquet(HYDRO_MODIFIED_PARQUET_PATH)
        print(f"[Hydro] Loaded {len(_hydro_modified_cache)} modified river features from parquet")
    
    return _hydro_modified_cache

def get_hydro_modified_links_for_prefixes(prefixes: set):
    """Load modified rivers links for specific prefixes (optimized partitioned loading)"""
    global _hydro_modified_links_cache
    import pandas as pd
    
    all_links = []
    for prefix in prefixes:
        if prefix not in _hydro_modified_links_cache:
            parquet_file = HYDRO_MODIFIED_LINKS_DIR / f"{prefix}.parquet"
            if parquet_file.exists():
                _hydro_modified_links_cache[prefix] = pd.read_parquet(parquet_file)
        
        if prefix in _hydro_modified_links_cache:
            all_links.append(_hydro_modified_links_cache[prefix])
    
    if all_links:
        return pd.concat(all_links, ignore_index=True)
    else:
        return pd.DataFrame(columns=['feature_id', 'h3_r7'])

@lru_cache(maxsize=1)
def get_hydro_priority_data():
    """Load and cache priority rivers parquet data"""
    global _hydro_priority_cache
    if _hydro_priority_cache is None:
        if not HYDRO_PRIORITY_PARQUET_PATH.exists():
            raise RuntimeError(f"Priority rivers parquet not found: {HYDRO_PRIORITY_PARQUET_PATH}")
        
        import geopandas as gpd
        _hydro_priority_cache = gpd.read_parquet(HYDRO_PRIORITY_PARQUET_PATH)
        print(f"[Hydro] Loaded {len(_hydro_priority_cache)} priority river features from parquet")
    
    return _hydro_priority_cache

def get_hydro_priority_links_for_prefixes(prefixes: set):
    """Load priority rivers links for specific prefixes (optimized partitioned loading)"""
    global _hydro_priority_links_cache
    import pandas as pd
    
    all_links = []
    for prefix in prefixes:
        if prefix not in _hydro_priority_links_cache:
            parquet_file = HYDRO_PRIORITY_LINKS_DIR / f"{prefix}.parquet"
            if parquet_file.exists():
                _hydro_priority_links_cache[prefix] = pd.read_parquet(parquet_file)
        
        if prefix in _hydro_priority_links_cache:
            all_links.append(_hydro_priority_links_cache[prefix])
    
    if all_links:
        return pd.concat(all_links, ignore_index=True)
    else:
        return pd.DataFrame(columns=['feature_id', 'h3_r7'])

@app.get("/api/places")
def get_places(
    lat: float,
    lon: float,
    k: int = 4,
    r_work: int = 8,
    r_shard: int = 7,
    ftypes: Optional[str] = None
):
    """
    Get POI places for a location using shard-based filtering.
    
    Args:
        lat: Latitude (WGS84)
        lon: Longitude (WGS84)
        k: K-ring radius around center hex (default: 4)
        r_work: Working resolution for hex grid (default: 8)
        r_shard: Shard resolution for filtering (default: 7)
        ftypes: Optional comma-separated list of FTYPE values to filter
    
    Returns:
        GeoJSON FeatureCollection with POIs
    """
    try:
        from shapely.ops import unary_union
        from utils_h3 import _geo_to_cell, _disk, _boundary, hex_polygon_wgs84
        import h3
        
        # 1. Get ROI hexagons
        center_hex = _geo_to_cell(lat, lon, r_work)
        roi_cells = _disk(center_hex, k)
        
        # 2. Get ROI polygon (WGS84 for geopandas intersection)
        roi_polygons = [hex_polygon_wgs84(cell) for cell in roi_cells]
        roi_polygon = unary_union(roi_polygons)
        
        # 3. Get shard keys (parent r7 hexagons)
        shard_keys = set()
        for cell in roi_cells:
            if hasattr(h3, 'h3_to_parent'):
                parent = h3.h3_to_parent(cell, r_shard)
            else:
                parent = h3.cell_to_parent(cell, r_shard)
            shard_keys.add(parent)
        
        # 4. Load POI data
        pois_gdf = get_places_data()
        
        # 5. Filter by shards
        pois_filtered = pois_gdf[pois_gdf['h3_r7'].isin(shard_keys)].copy()
        
        # 6. Filter by FTYPE if specified
        if ftypes:
            ftype_list = [f.strip() for f in ftypes.split(',')]
            pois_filtered = pois_filtered[pois_filtered['FTYPE'].isin(ftype_list)]
        
        # 7. Clip to ROI polygon
        pois_clipped = pois_filtered[pois_filtered.geometry.intersects(roi_polygon)].copy()
        
        # 8. Add group and color metadata
        ftype_map, default_group = get_places_metadata()
        
        def add_metadata(row):
            ftype = row['FTYPE']
            group_name, color = ftype_map.get(ftype, default_group)
            row['group'] = group_name
            row['color'] = color
            return row
        
        pois_clipped = pois_clipped.apply(add_metadata, axis=1)
        
        # 9. Select relevant columns for output
        output_cols = ['NAME', 'FTYPE', 'group', 'color', 'h3_r7', 'h3_r8', 'geometry']
        pois_output = pois_clipped[output_cols]
        
        # 10. Convert to GeoJSON
        geojson = pois_output.__geo_interface__
        
        return {
            "type": "FeatureCollection",
            "features": geojson['features'],
            "summary": {
                "total_pois": len(pois_output),
                "center_hex": center_hex,
                "roi_cells": len(roi_cells),
                "shard_keys": len(shard_keys),
                "groups": pois_output['group'].value_counts().to_dict()
            }
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/api/meshblocks")
def get_meshblocks(
    lat: float,
    lon: float,
    k: int = 4,
    r_work: int = 8,
    r_shard: int = 7,
    layer: str = "both"
):
    """
    Get meshblock data (mesh blocks and/or parcels) using shard-based filtering.
    
    Args:
        lat: Latitude (WGS84)
        lon: Longitude (WGS84)
        k: K-ring radius around center hex (default: 4)
        r_work: Working resolution for hex grid (default: 8)
        r_shard: Shard resolution for filtering (default: 7)
        layer: Which layer to return - "mesh", "parcels", "density", or "both" (default: "both")
    
    Returns:
        GeoJSON FeatureCollection(s) with meshblock data
    """
    try:
        from shapely.ops import unary_union
        from utils_h3 import _geo_to_cell, _disk, hex_polygon_wgs84
        import h3
        import geopandas as gpd
        
        # 1. Get ROI hexagons at res8
        center_hex = _geo_to_cell(lat, lon, r_work)
        roi_cells = _disk(center_hex, k)
        
        print(f"[Meshblocks API] Center: {lat},{lon} | r_work={r_work} | k={k}")
        print(f"[Meshblocks API] ROI cells: {len(roi_cells)} at res{r_work}")
        
        # 2. Get ROI polygon (WGS84 for geopandas intersection)
        roi_polygons = [hex_polygon_wgs84(cell) for cell in roi_cells]
        roi_polygon = unary_union(roi_polygons)
        
        # 3. Get shard keys (parent r7 hexagons)
        shard_keys = set()
        for cell in roi_cells:
            if hasattr(h3, 'h3_to_parent'):
                parent = h3.h3_to_parent(cell, r_shard)
            else:
                parent = h3.cell_to_parent(cell, r_shard)
            shard_keys.add(parent)
        
        print(f"[Meshblocks API] Shard keys (r7): {len(shard_keys)}")
        
        # 4. Load meshblock data and links
        meshblocks_gdf = get_meshblock_data()
        links_df = get_meshblock_links()
        
        print(f"[Meshblocks API] Total meshblocks: {len(meshblocks_gdf)}, Total links: {len(links_df)}")
        
        # 5. Use shard-based filtering with the fixed links table
        print(f"[Meshblocks API] Using shard-based filtering")
        
        # Filter links by shard keys (r7 hexagons)
        links_filtered = links_df[links_df['h3_r7'].isin(shard_keys)]
        print(f"[Meshblocks API] Features in shards: {len(links_filtered)} feature_ids from {len(links_filtered['h3_r7'].unique())} shards")
        
        # Get unique feature IDs from filtered links
        feature_ids = set(links_filtered['feature_id'].unique())
        print(f"[Meshblocks API] Unique features to load: {len(feature_ids)}")
        
        # 6. Filter meshblocks by feature IDs
        meshblocks_filtered = meshblocks_gdf[meshblocks_gdf['feature_id'].isin(feature_ids)].copy()
        print(f"[Meshblocks API] Meshblocks after shard filter: {len(meshblocks_filtered)}")
        
        # 7. Clip to actual ROI polygon for precise boundary
        meshblocks_clipped = meshblocks_filtered[meshblocks_filtered.geometry.intersects(roi_polygon)].copy()
        
        print(f"[Meshblocks API] Meshblocks after ROI clipping: {len(meshblocks_clipped)}")
        
        # 8. Prepare output based on layer type
        result = {}
        
        if layer in ["mesh", "both"]:
            # Mesh blocks layer
            mesh_output = meshblocks_clipped[['MB_CODE21', 'MB_CAT21', 'SA2_CODE21', 'Dwelling', 'Person', 'AREASQKM21', 'geometry']].copy()
            mesh_geojson = mesh_output.__geo_interface__
            result["mesh_blocks"] = {
                "type": "FeatureCollection",
                "features": mesh_geojson['features']
            }
        
        if layer in ["parcels", "both"]:
            # TODO: Parcels layer should use separate property/parcel dataset
            # Currently using meshblocks as placeholder - need actual property parcel data
            parcels_output = meshblocks_clipped[['MB_CODE21', 'geometry']].copy()
            parcels_geojson = parcels_output.__geo_interface__
            result["parcels"] = {
                "type": "FeatureCollection",
                "features": parcels_geojson['features']
            }
        
        if layer == "density":
            # Density layer with Person count for gradient styling
            density_output = meshblocks_clipped[['MB_CODE21', 'SA2_CODE21', 'Person', 'Dwelling', 'AREASQKM21', 'geometry']].copy()
            density_geojson = density_output.__geo_interface__
            result["density"] = {
                "type": "FeatureCollection",
                "features": density_geojson['features']
            }
        
        # Add summary
        result["summary"] = {
            "total_features": len(meshblocks_clipped),
            "center_hex": center_hex,
            "roi_cells": len(roi_cells),
            "shard_keys": len(shard_keys),
            "method": "shard_based_filtering",
            "features_in_shards": len(feature_ids),
            "after_roi_clip": len(meshblocks_clipped)
        }
        
        return result
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": str(e)}, status_code=500)


@app.get("/geocode/search")
async def geocode_search(q: str, limit: int = 5):
    """Proxy for Nominatim search to avoid CORS and 403 issues"""
    import httpx
    
    params = {
        "q": q,
        "format": "jsonv2",
        "addressdetails": "1",
        "limit": str(limit),
        "countrycodes": "au",
        "viewbox": "140.96,-39.20,150.05,-33.98",
        "bounded": "1"
    }
    
    headers = {
        "User-Agent": "EchoMapVictoria/1.0 (contact@echomap.app)",
        "Accept-Language": "en",
        "Referer": "https://echomap.app"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params=params,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
            # Filter for Victoria
            filtered = [p for p in data if p.get("address", {}).get("state", "").lower().find("victoria") >= 0]
            return filtered
    except Exception as e:
        print(f"[geocode/search] Error: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/geocode/reverse")
async def geocode_reverse(lon: float, lat: float):
    """Proxy for Nominatim reverse geocoding"""
    import httpx
    
    params = {
        "lon": str(lon),
        "lat": str(lat),
        "format": "jsonv2",
        "addressdetails": "1"
    }
    
    headers = {
        "User-Agent": "EchoMapVictoria/1.0 (contact@echomap.app)",
        "Accept-Language": "en",
        "Referer": "https://echomap.app"
    }
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params=params,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()
            # Check if in Victoria
            if data.get("address", {}).get("state", "").lower().find("victoria") < 0:
                return None
            return data
    except Exception as e:
        print(f"[geocode/reverse] Error: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/properties")
def get_properties(lat: float, lon: float, k: int = 4, res: int = 8, r_work: int = 8):
    """
    Get property parcels using local sharded parquet with H3 links for fast filtering.
    Returns red outlined polygons with no fill.
    
    Args:
        lat: Latitude (WGS84)
        lon: Longitude (WGS84)
        k: K-ring radius around center hex (default: 4)
        res: H3 resolution (default: 8, ignored - always uses r_work)
        r_work: Working resolution for hex grid (default: 8)
    
    Returns:
        GeoJSON FeatureCollection with property parcels
    """
    try:
        import h3
        from shapely.geometry import Polygon, box
        from utils_h3 import hex_polygon_wgs84
        
        # Step 1: Get ROI hex cells
        center_hex = _geo_to_cell(lat, lon, r_work)
        roi_cells = set(h3.grid_disk(center_hex, k))
        print(f"[Property] Center: {lat},{lon} | r_work={r_work} | k={k}")
        print(f"[Property] ROI cells: {len(roi_cells)} at res{r_work}")
        
        # Step 2: Get parent r7 shards
        shard_keys = set()
        for cell in roi_cells:
            parent = h3.cell_to_parent(cell, 7)
            shard_keys.add(parent)
        
        print(f"[Property] Shard keys (r7): {len(shard_keys)}")
        
        # Step 3: Load property data and links
        property_gdf = get_property_data()
        
        # Get prefixes from shard keys
        prefixes = {str(sk)[:2] for sk in shard_keys}
        links_df = get_property_links_for_prefixes(prefixes)
        
        print(f"[Property] Total properties: {len(property_gdf)}, Total links: {len(links_df)}")
        print(f"[Property] Using shard-based filtering")
        
        # Step 4: Filter links by shard keys
        shard_keys_str = {str(sk) for sk in shard_keys}
        links_filtered = links_df[links_df['h3_r7'].isin(shard_keys_str)]
        feature_ids = set(links_filtered['feature_id'].unique())
        
        print(f"[Property] Features in shards: {len(feature_ids)} feature_ids from {len(shard_keys)} shards")
        
        # Step 5: Filter properties by feature IDs
        property_filtered = property_gdf[property_gdf['feature_id'].isin(feature_ids)]
        
        print(f"[Property] Unique features to load: {len(feature_ids)}")
        print(f"[Property] Properties after shard filter: {len(property_filtered)}")
        
        # Step 6: Create ROI polygon for final clipping
        from shapely.ops import unary_union
        roi_polygons = [hex_polygon_wgs84(cell) for cell in roi_cells]
        roi_polygon = unary_union(roi_polygons)
        property_clipped = property_filtered[property_filtered.geometry.intersects(roi_polygon)].copy()
        
        print(f"[Property] Properties after ROI clipping: {len(property_clipped)}")
        
        # Step 7: Convert to GeoJSON
        result = property_clipped.__geo_interface__
        
        summary = {
            "center": [lat, lon],
            "k": k,
            "r_work": r_work,
            "roi_cells": len(roi_cells),
            "shards": len(shard_keys),
            "features_in_shards": len(feature_ids),
            "features_returned": len(property_clipped),
            "method": "shard_based_filtering"
        }
        
        result['summary'] = summary
        return result
        
    except Exception as e:
        print(f"[Property] Error: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/flora")
def get_flora(lat: float, lon: float, k: int = 4, r_work: int = 8):
    """
    Get flora/fauna features using local sharded parquet with H3 links for fast filtering.
    Returns polygons colored by EVC (Ecological Vegetation Class).
    
    Args:
        lat: Latitude (WGS84)
        lon: Longitude (WGS84)
        k: K-ring radius around center hex (default: 4)
        r_work: Working resolution for hex grid (default: 8)
    
    Returns:
        GeoJSON FeatureCollection with flora/fauna features
    """
    try:
        import h3
        from shapely.geometry import Polygon
        from utils_h3 import hex_polygon_wgs84
        
        # Step 1: Get ROI hex cells
        center_hex = _geo_to_cell(lat, lon, r_work)
        roi_cells = set(h3.grid_disk(center_hex, k))
        print(f"[Flora] Center: {lat},{lon} | r_work={r_work} | k={k}")
        print(f"[Flora] ROI cells: {len(roi_cells)} at res{r_work}")
        
        # Step 2: Get parent r7 shards
        shard_keys = set()
        for cell in roi_cells:
            parent = h3.cell_to_parent(cell, 7)
            shard_keys.add(parent)
        
        print(f"[Flora] Shard keys (r7): {len(shard_keys)}")
        
        # Step 3: Load flora data and links
        flora_gdf = get_flora_data()
        
        # Get prefixes from shard keys
        prefixes = {str(sk)[:2] for sk in shard_keys}
        links_df = get_flora_links_for_prefixes(prefixes)
        
        print(f"[Flora] Total flora features: {len(flora_gdf)}, Total links: {len(links_df)}")
        print(f"[Flora] Using shard-based filtering")
        
        # Step 4: Filter links by shard keys
        shard_keys_str = {str(sk) for sk in shard_keys}
        links_filtered = links_df[links_df['h3_r7'].isin(shard_keys_str)]
        feature_ids = set(links_filtered['feature_id'].unique())
        
        print(f"[Flora] Features in shards: {len(feature_ids)} feature_ids from {len(shard_keys)} shards")
        
        # Step 5: Filter flora by feature IDs
        flora_filtered = flora_gdf[flora_gdf['feature_id'].isin(feature_ids)]
        
        print(f"[Flora] Unique features to load: {len(feature_ids)}")
        print(f"[Flora] Flora features after shard filter: {len(flora_filtered)}")
        
        # Step 6: Create ROI polygon for final clipping
        from shapely.ops import unary_union
        roi_polygons = [hex_polygon_wgs84(cell) for cell in roi_cells]
        roi_polygon = unary_union(roi_polygons)
        flora_clipped = flora_filtered[flora_filtered.geometry.intersects(roi_polygon)].copy()
        
        print(f"[Flora] Flora features after ROI clipping: {len(flora_clipped)}")
        
        # Step 7: Convert to GeoJSON
        result = flora_clipped.__geo_interface__
        
        summary = {
            "center": [lat, lon],
            "k": k,
            "r_work": r_work,
            "roi_cells": len(roi_cells),
            "shards": len(shard_keys),
            "features_in_shards": len(feature_ids),
            "features_returned": len(flora_clipped),
            "method": "shard_based_filtering"
        }
        
        result['summary'] = summary
        return result
        
    except Exception as e:
        print(f"[Flora] Error: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/roads")
def get_roads(lat: float, lon: float, k: int = 4, r_work: int = 8):
    """
    Get road features using local sharded parquet with H3 links for fast filtering.
    Returns line geometries for roads clipped to the analysis area.
    
    Args:
        lat: Latitude (WGS84)
        lon: Longitude (WGS84)
        k: K-ring radius around center hex (default: 4)
        r_work: Working resolution for hex grid (default: 8)
    
    Returns:
        GeoJSON FeatureCollection with road features
    """
    try:
        import h3
        from shapely.geometry import Polygon
        from utils_h3 import hex_polygon_wgs84
        
        # Step 1: Get ROI hex cells
        center_hex = _geo_to_cell(lat, lon, r_work)
        roi_cells = set(h3.grid_disk(center_hex, k))
        print(f"[Roads] Center: {lat},{lon} | r_work={r_work} | k={k}")
        print(f"[Roads] ROI cells: {len(roi_cells)} at res{r_work}")
        
        # Step 2: Get parent r7 shards
        shard_keys = set()
        for cell in roi_cells:
            parent = h3.cell_to_parent(cell, 7)
            shard_keys.add(parent)
        
        print(f"[Roads] Shard keys (r7): {len(shard_keys)}")
        
        # Step 3: Load roads data and links
        roads_gdf = get_roads_data()
        
        # Get prefixes from shard keys
        prefixes = {str(sk)[:2] for sk in shard_keys}
        links_df = get_roads_links_for_prefixes(prefixes)
        
        print(f"[Roads] Total road features: {len(roads_gdf)}, Total links: {len(links_df)}")
        print(f"[Roads] Using shard-based filtering")
        
        # Step 4: Filter links by shard keys
        shard_keys_str = {str(sk) for sk in shard_keys}
        links_filtered = links_df[links_df['h3_r7'].isin(shard_keys_str)]
        feature_ids = set(links_filtered['feature_id'].unique())
        
        print(f"[Roads] Features in shards: {len(feature_ids)} feature_ids from {len(shard_keys)} shards")
        
        # Step 5: Filter roads by feature IDs
        roads_filtered = roads_gdf[roads_gdf['feature_id'].isin(feature_ids)]
        
        print(f"[Roads] Unique features to load: {len(feature_ids)}")
        print(f"[Roads] Road features after shard filter: {len(roads_filtered)}")
        
        # Step 6: Create ROI polygon for final clipping
        from shapely.ops import unary_union
        roi_polygons = [hex_polygon_wgs84(cell) for cell in roi_cells]
        roi_polygon = unary_union(roi_polygons)
        roads_clipped = roads_filtered[roads_filtered.geometry.intersects(roi_polygon)].copy()
        
        print(f"[Roads] Road features after ROI clipping: {len(roads_clipped)}")
        
        # Step 7: Convert to GeoJSON
        result = roads_clipped.__geo_interface__
        
        summary = {
            "center": [lat, lon],
            "k": k,
            "r_work": r_work,
            "roi_cells": len(roi_cells),
            "shards": len(shard_keys),
            "features_in_shards": len(feature_ids),
            "features_returned": len(roads_clipped),
            "method": "shard_based_filtering"
        }
        
        result['summary'] = summary
        return result
        
    except Exception as e:
        print(f"[Roads] Error: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/contours")
def get_contours(lat: float, lon: float, k: int = 4, r_work: int = 8):
    """
    Get contour features using local sharded parquet with H3 links for fast filtering.
    Returns line geometries for elevation contours clipped to the analysis area.
    
    Args:
        lat: Latitude (WGS84)
        lon: Longitude (WGS84)
        k: K-ring radius around center hex (default: 4)
        r_work: Working resolution for hex grid (default: 8)
    
    Returns:
        GeoJSON FeatureCollection with contour features
    """
    try:
        import h3
        from shapely.geometry import Polygon
        from utils_h3 import hex_polygon_wgs84
        
        # Step 1: Get ROI hex cells
        center_hex = _geo_to_cell(lat, lon, r_work)
        roi_cells = set(h3.grid_disk(center_hex, k))
        print(f"[Contours] Center: {lat},{lon} | r_work={r_work} | k={k}")
        print(f"[Contours] ROI cells: {len(roi_cells)} at res{r_work}")
        
        # Step 2: Get parent r7 shards
        shard_keys = set()
        for cell in roi_cells:
            parent = h3.cell_to_parent(cell, 7)
            shard_keys.add(parent)
        
        print(f"[Contours] Shard keys (r7): {len(shard_keys)}")
        
        # Step 3: Load contours data and links
        contours_gdf = get_contours_data()
        
        # Get prefixes from shard keys
        prefixes = {str(sk)[:2] for sk in shard_keys}
        links_df = get_contours_links_for_prefixes(prefixes)
        
        print(f"[Contours] Total contour features: {len(contours_gdf)}, Total links: {len(links_df)}")
        print(f"[Contours] Using shard-based filtering")
        
        # Step 4: Filter links by shard keys
        shard_keys_str = {str(sk) for sk in shard_keys}
        links_filtered = links_df[links_df['h3_r7'].isin(shard_keys_str)]
        feature_ids = set(links_filtered['feature_id'].unique())
        
        print(f"[Contours] Features in shards: {len(feature_ids)} feature_ids from {len(shard_keys)} shards")
        
        # Step 5: Filter contours by feature IDs
        contours_filtered = contours_gdf[contours_gdf['feature_id'].isin(feature_ids)]
        
        print(f"[Contours] Unique features to load: {len(feature_ids)}")
        print(f"[Contours] Contour features after shard filter: {len(contours_filtered)}")
        
        # Step 6: Create ROI polygon for final clipping
        from shapely.ops import unary_union
        roi_polygons = [hex_polygon_wgs84(cell) for cell in roi_cells]
        roi_polygon = unary_union(roi_polygons)
        contours_clipped = contours_filtered[contours_filtered.geometry.intersects(roi_polygon)].copy()
        
        print(f"[Contours] Contour features after ROI clipping: {len(contours_clipped)}")
        
        # Step 7: Convert to GeoJSON
        result = contours_clipped.__geo_interface__
        
        summary = {
            "center": [lat, lon],
            "k": k,
            "r_work": r_work,
            "roi_cells": len(roi_cells),
            "shards": len(shard_keys),
            "features_in_shards": len(feature_ids),
            "features_returned": len(contours_clipped),
            "method": "shard_based_filtering"
        }
        
        result['summary'] = summary
        return result
        
    except Exception as e:
        print(f"[Contours] Error: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/powerlines")
def get_powerlines(lat: float, lon: float, k: int = 4, r_work: int = 8):
    """
    Get electricity transmission line features using local sharded parquet with H3 links for fast filtering.
    Returns line geometries for power transmission lines clipped to the analysis area.
    
    Args:
        lat: Latitude (WGS84)
        lon: Longitude (WGS84)
        k: K-ring radius around center hex (default: 4)
        r_work: Working resolution for hex grid (default: 8)
    
    Returns:
        GeoJSON FeatureCollection with power line features
    """
    try:
        import h3
        from shapely.geometry import Polygon
        from utils_h3 import hex_polygon_wgs84
        
        # Step 1: Get ROI hex cells
        center_hex = _geo_to_cell(lat, lon, r_work)
        roi_cells = set(h3.grid_disk(center_hex, k))
        print(f"[Powerlines] Center: {lat},{lon} | r_work={r_work} | k={k}")
        print(f"[Powerlines] ROI cells: {len(roi_cells)} at res{r_work}")
        
        # Step 2: Get parent r7 shards
        shard_keys = set()
        for cell in roi_cells:
            parent = h3.cell_to_parent(cell, 7)
            shard_keys.add(parent)
        
        print(f"[Powerlines] Shard keys (r7): {len(shard_keys)}")
        
        # Step 3: Load electricity data and links
        electricity_gdf = get_electricity_data()
        
        # Get prefixes from shard keys
        prefixes = {str(sk)[:2] for sk in shard_keys}
        links_df = get_electricity_links_for_prefixes(prefixes)
        
        print(f"[Powerlines] Total transmission line features: {len(electricity_gdf)}, Total links: {len(links_df)}")
        print(f"[Powerlines] Using shard-based filtering")
        
        # Step 4: Filter links by shard keys
        shard_keys_str = {str(sk) for sk in shard_keys}
        links_filtered = links_df[links_df['h3_r7'].isin(shard_keys_str)]
        feature_ids = set(links_filtered['feature_id'].unique())
        
        print(f"[Powerlines] Features in shards: {len(feature_ids)} feature_ids from {len(shard_keys)} shards")
        
        # Step 5: Filter electricity by feature IDs
        electricity_filtered = electricity_gdf[electricity_gdf['feature_id'].isin(feature_ids)]
        
        print(f"[Powerlines] Unique features to load: {len(feature_ids)}")
        print(f"[Powerlines] Power line features after shard filter: {len(electricity_filtered)}")
        
        # Step 6: Create ROI polygon for final clipping
        from shapely.ops import unary_union
        roi_polygons = [hex_polygon_wgs84(cell) for cell in roi_cells]
        roi_polygon = unary_union(roi_polygons)
        electricity_clipped = electricity_filtered[electricity_filtered.geometry.intersects(roi_polygon)].copy()
        
        print(f"[Powerlines] Power line features after ROI clipping: {len(electricity_clipped)}")
        
        # Step 7: Convert to GeoJSON
        result = electricity_clipped.__geo_interface__
        
        summary = {
            "center": [lat, lon],
            "k": k,
            "r_work": r_work,
            "roi_cells": len(roi_cells),
            "shards": len(shard_keys),
            "features_in_shards": len(feature_ids),
            "features_returned": len(electricity_clipped),
            "method": "shard_based_filtering"
        }
        
        result['summary'] = summary
        return result
        
    except Exception as e:
        print(f"[Powerlines] Error: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/rivers")
def get_rivers(lat: float, lon: float, k: int = 4, r_work: int = 8):
    """
    Get river features (both modified and priority rivers) using local sharded parquet with H3 links for fast filtering.
    Returns line geometries for rivers clipped to the analysis area.
    
    Args:
        lat: Latitude (WGS84)
        lon: Longitude (WGS84)
        k: K-ring radius around center hex (default: 4)
        r_work: Working resolution for hex grid (default: 8)
    
    Returns:
        GeoJSON FeatureCollection with river features
    """
    try:
        import h3
        from shapely.geometry import Polygon
        from utils_h3 import hex_polygon_wgs84
        import geopandas as gpd
        
        # Step 1: Get ROI hex cells
        center_hex = _geo_to_cell(lat, lon, r_work)
        roi_cells = set(h3.grid_disk(center_hex, k))
        print(f"[Rivers] Center: {lat},{lon} | r_work={r_work} | k={k}")
        print(f"[Rivers] ROI cells: {len(roi_cells)} at res{r_work}")
        
        # Step 2: Get parent r7 shards
        shard_keys = set()
        for cell in roi_cells:
            parent = h3.cell_to_parent(cell, 7)
            shard_keys.add(parent)
        
        print(f"[Rivers] Shard keys (r7): {len(shard_keys)}")
        
        # Step 3: Load both modified and priority rivers data
        modified_gdf = get_hydro_modified_data()
        priority_gdf = get_hydro_priority_data()
        
        # Get prefixes from shard keys
        prefixes = {str(sk)[:2] for sk in shard_keys}
        modified_links_df = get_hydro_modified_links_for_prefixes(prefixes)
        priority_links_df = get_hydro_priority_links_for_prefixes(prefixes)
        
        print(f"[Rivers] Total modified rivers: {len(modified_gdf)}, modified links: {len(modified_links_df)}")
        print(f"[Rivers] Total priority rivers: {len(priority_gdf)}, priority links: {len(priority_links_df)}")
        print(f"[Rivers] Using shard-based filtering")
        
        # Step 4: Filter links by shard keys
        shard_keys_str = {str(sk) for sk in shard_keys}
        
        # Filter modified rivers
        modified_links_filtered = modified_links_df[modified_links_df['h3_r7'].isin(shard_keys_str)]
        modified_feature_ids = set(modified_links_filtered['feature_id'].unique())
        modified_filtered = modified_gdf[modified_gdf['feature_id'].isin(modified_feature_ids)]
        
        # Filter priority rivers
        priority_links_filtered = priority_links_df[priority_links_df['h3_r7'].isin(shard_keys_str)]
        priority_feature_ids = set(priority_links_filtered['feature_id'].unique())
        priority_filtered = priority_gdf[priority_gdf['feature_id'].isin(priority_feature_ids)]
        
        print(f"[Rivers] Modified rivers after shard filter: {len(modified_filtered)}")
        print(f"[Rivers] Priority rivers after shard filter: {len(priority_filtered)}")
        
        # Step 5: Combine both river types
        # Add a 'river_type' property to distinguish them
        modified_filtered = modified_filtered.copy()
        priority_filtered = priority_filtered.copy()
        modified_filtered['river_type'] = 'modified'
        priority_filtered['river_type'] = 'priority'
        
        rivers_gdf = gpd.GeoDataFrame(pd.concat([modified_filtered, priority_filtered], ignore_index=True))
        
        print(f"[Rivers] Combined rivers after shard filter: {len(rivers_gdf)}")
        
        # Step 6: Create ROI polygon for final clipping
        from shapely.ops import unary_union
        roi_polygons = [hex_polygon_wgs84(cell) for cell in roi_cells]
        roi_polygon = unary_union(roi_polygons)
        rivers_clipped = rivers_gdf[rivers_gdf.geometry.intersects(roi_polygon)].copy()
        
        print(f"[Rivers] River features after ROI clipping: {len(rivers_clipped)}")
        
        # Step 7: Convert to GeoJSON
        result = rivers_clipped.__geo_interface__
        
        summary = {
            "center": [lat, lon],
            "k": k,
            "r_work": r_work,
            "roi_cells": len(roi_cells),
            "shards": len(shard_keys),
            "modified_features": len(modified_filtered),
            "priority_features": len(priority_filtered),
            "features_returned": len(rivers_clipped),
            "method": "shard_based_filtering"
        }
        
        result['summary'] = summary
        return result
        
    except Exception as e:
        print(f"[Rivers] Error: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/api/rail")
def get_rail_lines(lat: float, lon: float, k: int = 10, res: int = 8):
    """
    Get rail lines from PostGIS within analysis area.
    Returns line geometries for railway infrastructure.
    """
    try:
        analyzer = get_postgis()
        result = analyzer.query_rail_lines(
            center_lon=lon,
            center_lat=lat,
            res=res,
            k=k,
            max_features=1000
        )
        return result
    except Exception as e:
        print(f"[rail] Error: {e}")
        return JSONResponse(content={"error": str(e)}, status_code=500)

@app.get("/healthz")
def healthz():
    # Check if PostGIS connection works
    try:
        analyzer = get_postgis()
        return {
            "ok": True, 
            "postgis": "connected",
            "catalog": str(CATALOG_PATH)
        }
    except Exception as e:
        return {
            "ok": False,
            "error": str(e),
            "catalog": str(CATALOG_PATH)
        }




