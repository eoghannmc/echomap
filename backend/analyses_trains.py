# backend/analyses_trains.py
from pathlib import Path
from typing import List, Set, Tuple
import pandas as pd
import geopandas as gpd
from shapely.geometry import Polygon
from shapely.ops import unary_union
import h3
from pyproj import Transformer

MASTER = Path(r"data_master/master.gpkg")   # authoritative (EPSG:7855)
TARGET_EPSG = 7855

# transformers
to_wgs84  = Transformer.from_crs(TARGET_EPSG, 4326, always_xy=True)
to_metric = Transformer.from_crs(4326, TARGET_EPSG, always_xy=True)

# ---------- H3 helpers ----------
def _geo_to_cell(lat: float, lon: float, res: int) -> str:
    # v3 vs v4 compatibility
    if hasattr(h3, "geo_to_h3"):
        return h3.geo_to_h3(lat, lon, res)     # v3
    return h3.latlng_to_cell(lat, lon, res)    # v4

def _disk(cell: str, k: int) -> Set[str]:
    if hasattr(h3, "k_ring"):
        return set(h3.k_ring(cell, k))         # v3
    return set(h3.grid_disk(cell, k))          # v4

def _boundary(cell: str):
    if hasattr(h3, "h3_to_geo_boundary"):
        latlon = h3.h3_to_geo_boundary(cell, geo_json=True)  # [[lat, lon], ...]
        return [(lng, lat) for lat, lng in latlon]
    latlng = h3.cell_to_boundary(cell)                         # [(lat, lng), ...]
    return [(lng, lat) for (lat, lng) in latlng]

def hex_polygon_metric(cell: str) -> Polygon:
    pts = [to_metric.transform(lon, lat) for (lon, lat) in _boundary(cell)]
    return Polygon(pts)

def hex_disk_and_rings(center_lon: float, center_lat: float, res: int, k: int):
    """Return (center_cell, disk_cells, rings) where rings[d] = set of cells at distance d."""
    center_cell = _geo_to_cell(center_lat, center_lon, res)
    disk_cells = _disk(center_cell, k)
    rings = []
    prev = set()
    for d in range(0, k + 1):
        incl = _disk(center_cell, d)
        ring_d = {center_cell} if d == 0 else incl - prev
        rings.append(ring_d)
        prev = incl
    return center_cell, disk_cells, rings

# ---------- GeoJSON helper ----------
def _geom_to_wgs84_fc(geom):
    """Return a WGS84 FeatureCollection for a metric geom (Polygon/MultiPolygon)."""
    from shapely.geometry import Polygon, MultiPolygon
    geoms = [geom] if isinstance(geom, Polygon) else list(geom.geoms)
    feats = []
    for g in geoms:
        if g.is_empty:
            continue
        # exterior only for speed
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

# ---------- Analysis ----------
class TrainAnalysis:
    def __init__(self):
        metro = gpd.read_file(MASTER, layer="metro_stations")
        regional = gpd.read_file(MASTER, layer="regional_stations")

        # Ensure metric CRS
        if metro.crs is None or metro.crs.to_epsg() != TARGET_EPSG:
            metro = metro.set_crs(TARGET_EPSG, allow_override=True)
        if regional.crs is None or regional.crs.to_epsg() != TARGET_EPSG:
            regional = regional.set_crs(TARGET_EPSG, allow_override=True)

        self.gdf = pd.concat([metro, regional], ignore_index=True)
        self.sindex = self.gdf.sindex  # spatial index

    def run(
        self,
        center_lon: float,
        center_lat: float,
        res: int = 8,
        k: int = 4,
        band_index: int = 4,
        select_mode: str = "disk",   # "disk" or "ring"
        disk_k: int | None = None
    ):
        # 1) H3 disk/rings geometry in metric CRS
        _, disk_cells, rings = hex_disk_and_rings(center_lon, center_lat, res, k)
        disk_poly = unary_union([hex_polygon_metric(c) for c in disk_cells])
        ring_polys = [unary_union([hex_polygon_metric(c) for c in ring]) for ring in rings]

        # 2) Candidate stations within the disk (fast prefilter)
        candidates = self.gdf[self.gdf.geometry.intersects(disk_poly)]

        # 3) counts per ring
        counts = []
        per_ring_idx = []
        for d, ring_poly in enumerate(ring_polys):
            mask = candidates.geometry.intersects(ring_poly)
            idxs = candidates.index[mask].tolist()
            per_ring_idx.append(idxs)
            counts.append({"ring_distance": d, "count": len(idxs)})

        # 4) choose what to RETURN: disk(0..dk) or single ring(bi)
        bi = max(0, min(band_index, k))
        if select_mode == "disk":
            dk = bi if disk_k is None else max(0, min(disk_k, k))
            idxs = sorted(set().union(*per_ring_idx[: dk + 1]))
            selection_mask_geom = unary_union(ring_polys[: dk + 1])
        else:
            idxs = per_ring_idx[bi]
            selection_mask_geom = ring_polys[bi]

        # 5) features as WGS84 points
        sel = self.gdf.loc[idxs].copy().to_crs(4326)
        feats = []
        for _, r in sel.iterrows():
            p = r.geometry
            feats.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [p.x, p.y]},
                "properties": {
                    "STOP_NAME": r.get("STOP_NAME"),
                    "ROUTEUSSP": r.get("ROUTEUSSP"),
                    "STOP_ID":  r.get("STOP_ID")
                }
            })

        # 6) WGS84 mask polygon for drawing
        mask_fc = _geom_to_wgs84_fc(selection_mask_geom)

        return {
            "features": {"type": "FeatureCollection", "features": feats},
            "summary": {
                "counts": counts,
                "select_mode": select_mode,
                "ring_selected": bi,
                "disk_k": disk_k if disk_k is not None else bi,
                "h3": {"res": res, "k": k}
            },
            "mask": mask_fc
        }
