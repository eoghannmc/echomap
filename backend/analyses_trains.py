from pathlib import Path
from typing import List, Set, Tuple, Dict, Any, Optional

import geopandas as gpd
import pandas as pd
from shapely.geometry import Polygon
from shapely.ops import unary_union
from pyproj import Transformer
import h3

MASTER = Path("data_master/master.gpkg")
TARGET_EPSG = 7855  # GDA2020 / MGA55

# Fast transforms
to_wgs84  = Transformer.from_crs(TARGET_EPSG, 4326, always_xy=True)
to_metric = Transformer.from_crs(4326, TARGET_EPSG, always_xy=True)


# ------------------------------ H3 helpers ------------------------------
def _geo_to_cell(lat: float, lon: float, res: int) -> str:
    """h3 v3 vs v4 compatibility."""
    if hasattr(h3, "geo_to_h3"):
        return h3.geo_to_h3(lat, lon, res)          # v3
    return h3.latlng_to_cell(lat, lon, res)         # v4

def _disk(cell: str, k: int) -> Set[str]:
    """Return the k-ring including center (v3/v4 compatible)."""
    if hasattr(h3, "k_ring"):
        return set(h3.k_ring(cell, k))               # v3
    return set(h3.grid_disk(cell, k))                # v4

def _boundary(cell: str) -> List[Tuple[float, float]]:
    """Return boundary as list of (lon, lat) pairs."""
    if hasattr(h3, "h3_to_geo_boundary"):
        latlon = h3.h3_to_geo_boundary(cell, geo_json=True)
        return [(lng, lat) for lat, lng in latlon]   # (lon, lat)
    latlng = h3.cell_to_boundary(cell)
    return [(lng, lat) for (lat, lng) in latlng]

def _hex_polygon_metric(cell: str) -> Polygon:
    """Hexagon polygon in target metric CRS (EPSG:7855)."""
    pts = [to_metric.transform(lon, lat) for (lon, lat) in _boundary(cell)]
    return Polygon(pts)

def _disk_and_rings(center_lon: float, center_lat: float, res: int, k: int) -> Tuple[str, Set[str], List[Set[str]]]:
    """Return (center_cell, disk_cells, rings_list[0..k])."""
    center_cell = _geo_to_cell(center_lat, center_lon, res)
    disk_cells  = _disk(center_cell, k)
    rings: List[Set[str]] = []
    prev: Set[str] = set()
    for d in range(0, k + 1):
        incl = _disk(center_cell, d)
        ring_d = {center_cell} if d == 0 else incl - prev
        rings.append(ring_d)
        prev = incl
    return center_cell, disk_cells, rings


# ------------------------------ Analysis ------------------------------
class TrainAnalysisH3:
    """
    H3-based train station selection.

    Reads `metro_stations` + `regional_stations` from MASTER (GPKG), reprojects to EPSG:7855
    on first use, then for a given center + (res,k) builds:
      - an H3 disk mask polygon (union of all hexes up to k),
      - per-ring polygons (0..k),
      - selects stations intersecting the chosen geometry (disk or a specific ring/band).

    Returns a FeatureCollection (stations as points in WGS84), the mask polygon, and a summary.
    """

    def __init__(self) -> None:
        self._gdf: Optional[gpd.GeoDataFrame] = None       # EPSG:7855
        self._sindex: Any = None

    # ----------- loading -----------
    def _load(self) -> None:
        """Lazy-load stations from the GPKG; raise RuntimeError if unreadable."""
        if self._gdf is not None:
            return

        try:
            metro    = gpd.read_file(MASTER, layer="metro_stations")
            regional = gpd.read_file(MASTER, layer="regional_stations")
        except Exception as e:
            # This bubbles up as a JSON error from the route handler
            raise RuntimeError(f"Failed to read {MASTER} (train layers): {e}")

        # Reproject (or set) to EPSG:7855
        if metro.crs:
            metro = metro.to_crs(TARGET_EPSG)
        else:
            metro = metro.set_crs(TARGET_EPSG, allow_override=True)
        if regional.crs:
            regional = regional.to_crs(TARGET_EPSG)
        else:
            regional = regional.set_crs(TARGET_EPSG, allow_override=True)

        # Concatenate + drop empties
        all_stations = pd.concat([metro, regional], ignore_index=True)
        all_stations = all_stations.loc[~all_stations.geometry.is_empty]

        self._gdf = all_stations
        self._sindex = self._gdf.sindex

    # ----------- run -----------
    def run(
        self,
        center_lon: float,
        center_lat: float,
        res: int = 8,
        k: int = 4,
        band_index: int = 2,
        select_mode: str = "disk",   # "disk" or "band"
        disk_k: Optional[int] = None # override when select_mode="disk"
    ) -> Dict[str, Any]:
        """
        center_lon/lat  : map focus
        res, k          : H3 parameters
        band_index      : which ring to return if select_mode='band'
        select_mode     : 'disk' => union of rings [0..disk_k], 'band' => ring[band_index]
        disk_k          : optional override for disk depth (default uses band_index)
        """
        self._load()

        center_cell, disk_cells, rings = _disk_and_rings(center_lon, center_lat, res, k)
        disk_poly  = unary_union([_hex_polygon_metric(c) for c in disk_cells])
        ring_polys = [unary_union([_hex_polygon_metric(c) for c in ring]) for ring in rings]

        # Choose mask geometry
        bi = max(0, min(band_index, k))
        if select_mode == "disk":
            dk = bi if disk_k is None else max(0, min(disk_k, k))
            mask_geom = unary_union(ring_polys[: dk + 1])
        else:
            mask_geom = ring_polys[bi]

        # Spatial prefilter by intersection with mask
        candidates = self._gdf[self._gdf.geometry.intersects(mask_geom)]

        # Build WGS84 outputs
        feats: List[Dict[str, Any]] = []
        for _, row in candidates.to_crs(4326).iterrows():
            geom = row.geometry
            if geom.is_empty:
                continue
            feats.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [geom.x, geom.y]},
                "properties": {k: row.get(k) for k in row.index if k != "geometry"}
            })

        # Make WGS84 mask polygon
        mask_coords = []
        for x, y in list(mask_geom.exterior.coords):
            lon, lat = to_wgs84.transform(x, y)
            mask_coords.append([lon, lat])

        mask_fc = {"type": "FeatureCollection",
                   "features": [{"type": "Feature",
                                 "geometry": {"type": "Polygon", "coordinates": [mask_coords]},
                                 "properties": {}}]}

        return {
            "features": {"type": "FeatureCollection", "features": feats},
            "mask": mask_fc,
            "summary": {
                "count": len(feats),
                "select_mode": select_mode,
                "ring_selected": bi,
                "h3": {"res": res, "k": k},
            },
        }
