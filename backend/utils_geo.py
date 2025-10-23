from pyproj import Transformer
from shapely.geometry import Point
from shapely import difference

TARGET_EPSG = 7855  # GDA2020 / MGA Zone 55

_to_metric = Transformer.from_crs(4326, TARGET_EPSG, always_xy=True)
_to_wgs84  = Transformer.from_crs(TARGET_EPSG, 4326, always_xy=True)

def to_metric(lon: float, lat: float):
    return _to_metric.transform(lon, lat)

def build_rings(cx: float, cy: float, edges_m: list[float]):
    edges = sorted(edges_m)
    rings = []
    prev = 0.0
    center = Point(cx, cy)
    for edge in edges:
        outer = center.buffer(edge)
        ring = difference(outer, center.buffer(prev)) if prev > 0 else outer
        rings.append((prev, edge, ring))
        prev = edge
    return rings
