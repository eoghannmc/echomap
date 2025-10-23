# backend/analyses_zones_h3.py
from pathlib import Path
from typing import List, Set
import geopandas as gpd
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
import h3
from pyproj import Transformer
from functools import lru_cache
import pyogrio  # fast read + bbox

MASTER = Path(r"data_master/master.gpkg")
TARGET_EPSG = 7855

to_wgs84  = Transformer.from_crs(TARGET_EPSG, 4326, always_xy=True)
to_metric = Transformer.from_crs(4326, TARGET_EPSG, always_xy=True)

def _geo_to_cell(lat: float, lon: float, res: int) -> str:
    if hasattr(h3, "geo_to_h3"):
        return h3.geo_to_h3(lat, lon, res)     # v3
    return h3.latlng_to_cell(lat, lon, res)    # v4

def _disk(cell: str, k: int):
    if hasattr(h3, "k_ring"):
        return set(h3.k_ring(cell, k))         # v3
    return set(h3.grid_disk(cell, k))          # v4

def _boundary(cell: str):
    if hasattr(h3, "h3_to_geo_boundary"):
        latlon = h3.h3_to_geo_boundary(cell, geo_json=True)
        return [(lng, lat) for lat, lng in latlon]
    latlng = h3.cell_to_boundary(cell)
    return [(lng, lat) for (lat, lng) in latlng]

def _hex_polygon_metric(cell: str) -> Polygon:
    pts = [to_metric.transform(lon, lat) for (lon, lat) in _boundary(cell)]
    return Polygon(pts)

def _disk_ring_polys(center_lon: float, center_lat: float, res: int, k: int):
    c = _geo_to_cell(center_lat, center_lon, res)
    disk_cells = _disk(c, k)
    rings = []
    prev = set()
    for d in range(0, k+1):
        incl = _disk(c, d)
        ring_d = {c} if d == 0 else incl - prev
        rings.append(ring_d)
        prev = incl
    disk_poly = unary_union([_hex_polygon_metric(cc) for cc in disk_cells])
    ring_polys = [unary_union([_hex_polygon_metric(cc) for cc in rr]) for rr in rings]
    return disk_poly, ring_polys

def _geom_to_wgs84_fc(geom):
    """Return a WGS84 FeatureCollection for a metric geom (Polygon/MultiPolygon)."""
    geoms = [geom] if isinstance(geom, Polygon) else list(geom.geoms)
    feats = []
    for g in geoms:
        if g.is_empty:
            continue
        # exterior only for speed; holes can be added later if needed
        coords = []
        for x, y in list(g.exterior.coords):
            lon, lat = to_wgs84.transform(x, y)
            coords.append([lon, lat])
        feats.append({
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": [coords]},
            "properties": {}
        })
    return {"type": "FeatureCollection", "features": feats}

class ZonesAnalysisH3:
    def __init__(self):
        pass  # defer reading to per-request bbox

    @staticmethod
    @lru_cache(maxsize=128)
    def _cached_ring_key(center_cell: str, res: int, k: int, band_index: int, codes_key: str, tol_mm: int):
        return f"{center_cell}|r{res}|k{k}|b{band_index}|{codes_key}|tol{tol_mm}"

    def run(
        self,
        center_lon: float,
        center_lat: float,
        res: int = 8,
        k: int = 4,
        band_index: int = 4,
        zone_codes: List[str] | None = None,
        simplify_tolerance_m: float = 5.0,
        max_features: int = 1500,
        clip_mode: str = "disk",
        disk_k: int | None = None,
    ):
        # Build all rings once
        _, ring_polys = _disk_ring_polys(center_lon, center_lat, res, k)
        bi = max(0, min(band_index, k))

        # Choose clip geometry
        if clip_mode == "disk":
            dk = bi if disk_k is None else max(0, min(disk_k, k))
            # union of rings [0..dk]
            clip_geom = unary_union(ring_polys[0:dk+1])
        else:
            clip_geom = ring_polys[bi]

        # Small simplify to speed up intersections
        clip_geom = clip_geom.simplify(1.0, preserve_topology=True)
        minx, miny, maxx, maxy = clip_geom.bounds

        # Read only bbox from the GPKG
        cols = ["ZONE_CODE", "ZONE_NAME", "geometry"]
        gdf = pyogrio.read_dataframe(
            MASTER, layer="planning_zones",
            columns=cols, bbox=(minx, miny, maxx, maxy)
        )
        if gdf.crs:
            gdf = gdf.to_crs(TARGET_EPSG)
        else:
            gdf = gdf.set_crs(TARGET_EPSG, allow_override=True)

        if zone_codes:
            gdf = gdf[gdf["ZONE_CODE"].isin(zone_codes)]

        # Coarse filter by intersects, then hard clip to geometry
        gdf = gdf[gdf.geometry.intersects(clip_geom)]
        if len(gdf) == 0:
            mask_fc = _geom_to_wgs84_fc(clip_geom)
            return {
                "features": {"type":"FeatureCollection","features":[]},
                "mask": mask_fc,
                "summary": {
                    "count": 0,
                    "clip_mode": clip_mode,
                    "ring_selected": bi,
                    "disk_k": disk_k,
                    "h3": {"res":res,"k":k},
                    "filtered_codes": zone_codes or []
                }
            }

        clipped = gpd.clip(gdf, gpd.GeoDataFrame(geometry=[clip_geom], crs=f"EPSG:{TARGET_EPSG}"))
        clipped = clipped[~clipped.geometry.is_empty]

        if len(clipped) > max_features:
            clipped = clipped.iloc[:max_features].copy()

        if simplify_tolerance_m and not clipped.geom_type.isin(["Point","MultiPoint"]).all():
            clipped["geometry"] = clipped.geometry.simplify(simplify_tolerance_m, preserve_topology=True)

        out = clipped.to_crs(4326)
        feats = []
        for _, r in out.iterrows():
            geom = r.geometry
            if geom.is_empty:
                continue
            feats.append({
                "type": "Feature",
                "geometry": geom.__geo_interface__,
                "properties": {
                    "ZONE_CODE": r.get("ZONE_CODE"),
                    "ZONE_NAME": r.get("ZONE_NAME")
                }
            })

        # Return also the clip mask polygon for drawing (as WGS84)
        mask_fc = _geom_to_wgs84_fc(clip_geom)

        return {
            "features": {"type": "FeatureCollection", "features": feats},
            "mask": mask_fc,
            "summary": {
                "count": len(feats),
                "clip_mode": clip_mode,
                "ring_selected": bi,
                "disk_k": disk_k if disk_k is not None else bi,
                "h3": {"res": res, "k": k},
                "filtered_codes": zone_codes or []
            }
        }
