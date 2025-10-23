# backend/utils_h3.py
from typing import Tuple, List, Set
from shapely.geometry import Polygon
from shapely.ops import unary_union
from pyproj import Transformer
import h3

TARGET_EPSG = 7855
to_wgs84  = Transformer.from_crs(TARGET_EPSG, 4326, always_xy=True)
to_metric = Transformer.from_crs(4326, TARGET_EPSG, always_xy=True)

def _geo_to_cell(lat: float, lon: float, res: int) -> str:
    # h3 v3 vs v4
    if hasattr(h3, "geo_to_h3"):
        return h3.geo_to_h3(lat, lon, res)
    return h3.latlng_to_cell(lat, lon, res)

def _disk(cell: str, k: int) -> Set[str]:
    if hasattr(h3, "k_ring"):
        return set(h3.k_ring(cell, k))
    return set(h3.grid_disk(cell, k))

def _boundary(cell: str):
    if hasattr(h3, "h3_to_geo_boundary"):
        latlon = h3.h3_to_geo_boundary(cell, geo_json=True)
        return [(lng, lat) for lat, lng in latlon]
    latlng = h3.cell_to_boundary(cell)
    return [(lng, lat) for (lat, lng) in latlng]

def hex_polygon_metric(cell: str) -> Polygon:
    pts = [to_metric.transform(lon, lat) for (lon, lat) in _boundary(cell)]
    return Polygon(pts)

def disk_and_rings(center_lon: float, center_lat: float, res: int, k: int):
    c = _geo_to_cell(center_lat, center_lon, res)
    disk_cells = _disk(c, k)
    rings = []
    prev = set()
    for d in range(0, k+1):
        incl = _disk(c, d)
        ring_d = {c} if d == 0 else incl - prev
        rings.append(ring_d)
        prev = incl
    disk_poly = unary_union([hex_polygon_metric(cc) for cc in disk_cells])
    ring_polys = [unary_union([hex_polygon_metric(cc) for cc in rr]) for rr in rings]
    return c, disk_cells, rings, disk_poly, ring_polys
