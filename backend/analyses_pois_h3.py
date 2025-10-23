# backend/analyses_pois_h3.py
from pathlib import Path
from typing import Iterable, List, Optional, Set, Tuple

import geopandas as gpd
from shapely.ops import unary_union
from shapely.geometry import Polygon
from pyproj import Transformer
import h3

MASTER = Path("data_master/master.gpkg")   # your authoritative package (EPSG:7855)
TARGET_EPSG = 7855

# transformers
to_wgs84  = Transformer.from_crs(TARGET_EPSG, 4326, always_xy=True)
to_metric = Transformer.from_crs(4326, TARGET_EPSG, always_xy=True)

# ---- H3 helpers (support v3 and v4 APIs) ----
def _geo_to_cell(lat: float, lon: float, res: int) -> str:
    if hasattr(h3, "geo_to_h3"):
        return h3.geo_to_h3(lat, lon, res)         # v3
    return h3.latlng_to_cell(lat, lon, res)        # v4

def _disk(center_cell: str, k: int) -> Set[str]:
    if hasattr(h3, "k_ring"):
        return set(h3.k_ring(center_cell, k))      # v3
    return set(h3.grid_disk(center_cell, k))       # v4

def _boundary(cell: str) -> List[Tuple[float, float]]:
    """Return list of (lon, lat) pairs around the hex boundary."""
    if hasattr(h3, "h3_to_geo_boundary"):
        latlon = h3.h3_to_geo_boundary(cell, geo_json=True)  # v3 -> [[lat,lon]...]
        return [(lng, lat) for (lat, lng) in latlon]
    latlng = h3.cell_to_boundary(cell)                        # v4 -> [(lat,lon)...]
    return [(lng, lat) for (lat, lng) in latlng]

def _hex_polygon_metric(cell: str) -> Polygon:
    pts = [to_metric.transform(lon, lat) for (lon, lat) in _boundary(cell)]
    return Polygon(pts)

def _disk_polygon_metric(center_lon: float, center_lat: float, res: int, disk_k: int) -> Polygon:
    c = _geo_to_cell(center_lat, center_lon, res)
    cells = _disk(c, disk_k)
    return unary_union([_hex_polygon_metric(cc) for cc in cells])

def _geom_to_wgs84_fc(geom) -> dict:
    """Return a WGS84 FeatureCollection for a metric Polygon/MultiPolygon."""
    from shapely.geometry import Polygon, MultiPolygon, mapping
    if geom.is_empty:
        return {"type":"FeatureCollection","features":[]}
    geoms = [geom] if isinstance(geom, Polygon) else list(geom.geoms)
    feats = []
    for g in geoms:
        if g.is_empty:
            continue
        # exterior only for a mask
        coords = []
        for x, y in list(g.exterior.coords):
            lon, lat = to_wgs84.transform(x, y)
            coords.append([lon, lat])
        feats.append({
            "type":"Feature",
            "geometry":{"type":"Polygon","coordinates":[coords]},
            "properties":{}
        })
    return {"type":"FeatureCollection","features":feats}

# ------------------------------------------------

class POIsAnalysisH3:
    """Loads POIs (EPSG:7855) once; filters by H3 disk and optional FTYPE groups."""
    def __init__(self):
        gdf = gpd.read_file(MASTER, layer="pois")
        # ensure CRS
        if gdf.crs is None or gdf.crs.to_epsg() != TARGET_EPSG:
            gdf = gdf.set_crs(TARGET_EPSG, allow_override=True)
        # keep only what we need (adjust names if your columns differ)
        keep_cols = [c for c in ["FTYPE", "UFI", "geometry"] if c in gdf.columns]
        self.gdf = gdf[keep_cols].copy()
        self.sindex = self.gdf.sindex   # spatial index for speed

    def run(
        self,
        center_lon: float,
        center_lat: float,
        res: int = 8,
        k: int = 4,
        disk_k: Optional[int] = 3,
        include_ftypes: Optional[List[str]] = None,
        max_points: int = 4000
    ) -> dict:
        dk = 3 if disk_k is None else max(0, min(int(disk_k), int(k)))
        # 1) build mask polygon in metric CRS
        mask_geom = _disk_polygon_metric(center_lon, center_lat, res, dk).buffer(0)

        # 2) prefilter via sindex/bbox, then precise intersects
        minx, miny, maxx, maxy = mask_geom.bounds
        candidates_idx = list(self.sindex.intersection((minx, miny, maxx, maxy)))
        cand = self.gdf.iloc[candidates_idx]
        cand = cand[cand.geometry.intersects(mask_geom)]

        # 3) optional attribute filter
        if include_ftypes:
            cand = cand[cand["FTYPE"].isin(include_ftypes)]

        # 4) clip strictly (optional for points; intersects is enough)
        # for points, intersects == inside; we can skip clip for speed
        # 5) cap and convert to WGS84 features
        if len(cand) > max_points:
            cand = cand.iloc[:max_points].copy()

        out = cand.to_crs(4326)

        feats = []
        for _, r in out.iterrows():
            p = r.geometry
            if p.is_empty:
                continue
            feats.append({
                "type":"Feature",
                "geometry":{"type":"Point","coordinates":[p.x, p.y]},
                "properties":{
                    "FTYPE": r.get("FTYPE"),
                    "UFI":   r.get("UFI"),
                }
            })

        mask_fc = _geom_to_wgs84_fc(mask_geom)

        return {
            "features": {"type":"FeatureCollection","features":feats},
            "mask": mask_fc,
            "summary": {
                "count": len(feats),
                "h3": {"res": res, "disk_k": dk, "k_built": k},
                "filtered_types": include_ftypes or []
            }
        }
