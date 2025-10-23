# backend/analyses_trains_h3.py
from pathlib import Path
from typing import List, Set, Tuple
import pandas as pd
import geopandas as gpd
from shapely.geometry import Polygon, MultiPolygon
from shapely.ops import unary_union
import h3
from pyproj import Transformer

MASTER = Path(r"data_master/master.gpkg")
TARGET_EPSG = 7855

to_wgs84  = Transformer.from_crs(TARGET_EPSG, 4326, always_xy=True)
to_metric = Transformer.from_crs(4326, TARGET_EPSG, always_xy=True)

# ---- H3 shims (v3/v4) ----
def _geo_to_cell(lat: float, lon: float, res: int) -> str:
    if hasattr(h3, "geo_to_h3"):
        return h3.geo_to_h3(lat, lon, res)           # v3
    return h3.latlng_to_cell(lat, lon, res)          # v4

def _disk(cell: str, k: int) -> Set[str]:
    if hasattr(h3, "k_ring"):
        return set(h3.k_ring(cell, k))               # v3
    return set(h3.grid_disk(cell, k))                # v4

def _boundary(cell: str) -> List[Tuple[float, float]]:
    if hasattr(h3, "h3_to_geo_boundary"):
        latlon = h3.h3_to_geo_boundary(cell, geo_json=True)  # [[lat, lon], ...]
        return [(lng, lat) for lat, lng in latlon]
    latlng = h3.cell_to_boundary(cell)                        # [(lat, lng), ...] v4
    return [(lng, lat) for (lat, lng) in latlng]

def hex_polygon_metric(cell: str) -> Polygon:
    pts_metric = [to_metric.transform(lon, lat) for (lon, lat) in _boundary(cell)]
    return Polygon(pts_metric)

def hex_disk_and_rings(center_lon: float, center_lat: float, res: int, k: int):
    center_cell = _geo_to_cell(center_lat, center_lon, res)
    disk_cells = _disk(center_cell, k)
    rings: List[Set[str]] = []
    prev = set()
    for d in range(0, k + 1):
        incl = _disk(center_cell, d)
        ring_d = {center_cell} if d == 0 else incl - prev
        rings.append(ring_d)
        prev = incl
    return center_cell, disk_cells, rings

class TrainAnalysisH3:
    def __init__(self):
        metro = gpd.read_file(MASTER, layer="metro_stations")
        regional = gpd.read_file(MASTER, layer="regional_stations")
        # robust reprojection: if CRS known, transform; if missing, assume target
        if metro.crs:
            metro = metro.to_crs(TARGET_EPSG)
        else:
            metro = metro.set_crs(TARGET_EPSG, allow_override=True)
        if regional.crs:
            regional = regional.to_crs(TARGET_EPSG)
        else:
            regional = regional.set_crs(TARGET_EPSG, allow_override=True)

        self.gdf = pd.concat([metro, regional], ignore_index=True)
        self.gdf = self.gdf.loc[~self.gdf.geometry.is_empty]
        self.sindex = self.gdf.sindex  # spatial index

    def run(self, center_lon: float, center_lat: float, res: int = 8, k: int = 4, band_index: int = 4):
        # 1) H3 disk/rings
        _, disk_cells, rings = hex_disk_and_rings(center_lon, center_lat, res, k)

        # 2) Build polygons
        disk_poly = unary_union([hex_polygon_metric(c) for c in disk_cells])
        ring_polys = [unary_union([hex_polygon_metric(c) for c in ring]) for ring in rings]

        # 3) Prefilter candidates using spatial index against disk polygon
        cand_idx = self.sindex.query(disk_poly, predicate="intersects")
        candidates = self.gdf.iloc[cand_idx]

        # 4) Count per ring using intersects (captures boundary points)
        counts = []
        per_ring_idx = []
        for d, ring_poly in enumerate(ring_polys):
            mask = candidates.geometry.intersects(ring_poly)
            idxs = candidates.index[mask].tolist()
            per_ring_idx.append(idxs)
            counts.append({"ring_distance": d, "count": len(idxs)})

        # 5) Select band, convert to WGS84
        bi = max(0, min(band_index, k))
        sel = self.gdf.loc[per_ring_idx[bi]].copy().to_crs(4326)

        feats = []
        for _, r in sel.iterrows():
            p = r.geometry
            feats.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [p.x, p.y]},
                "properties": {
                    "STOP_NAME": r.get("STOP_NAME"),
                    "ROUTEUSSP": r.get("ROUTEUSSP"),
                    "STOP_ID": r.get("STOP_ID"),
                    "ring_distance": bi
                }
            })

        # 6) Return selected ring polygon in WGS84 (handle MultiPolygon)
        ring_poly = ring_polys[bi]
        features = []
        geoms = list(ring_poly.geoms) if isinstance(ring_poly, MultiPolygon) else [ring_poly]
        for geom in geoms:
            coords = []
            if not geom.is_empty:
                for x, y in list(geom.exterior.coords):
                    lon, lat = to_wgs84.transform(x, y)
                    coords.append([lon, lat])
            if coords:
                features.append({
                    "type": "Feature",
                    "geometry": {"type": "Polygon", "coordinates": [coords]},
                    "properties": {"ring_distance": bi}
                })
        ring_fc = {"type": "FeatureCollection", "features": features}

        return {
            "features": {"type": "FeatureCollection", "features": feats},
            "summary": {"counts": counts, "ring_selected": bi, "h3": {"res": res, "k": k}},
            "ring": ring_fc
        }
