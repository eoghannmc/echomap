from pathlib import Path
from typing import Iterable, List, Optional, Set, Tuple

import geopandas as gpd
from shapely.ops import unary_union
from shapely.geometry import Polygon
from pyproj import Transformer
from pyogrio import errors as pyogrio_errors  # NEW
import h3

MASTER = Path("data_master/master.gpkg")
TARGET_EPSG = 7855

to_wgs84  = Transformer.from_crs(TARGET_EPSG, 4326, always_xy=True)
to_metric = Transformer.from_crs(4326, TARGET_EPSG, always_xy=True)

# … (helpers unchanged) …

class POIsAnalysisH3:
    """Loads POIs on first use; filters by H3 disk and optional FTYPE groups."""
    def __init__(self) -> None:
        self._gdf: Optional[gpd.GeoDataFrame] = None
        self._sindex = None

    def _load(self) -> None:
        if self._gdf is not None:
            return
        try:
            gdf = gpd.read_file(MASTER, layer="pois")
        except Exception as e:
            raise RuntimeError(f"Failed to read {MASTER} (layer=pois): {e}")
        if gdf.crs is None or gdf.crs.to_epsg() != TARGET_EPSG:
            gdf = gdf.set_crs(TARGET_EPSG, allow_override=True)
        keep = [c for c in ["FTYPE", "UFI", "geometry"] if c in gdf.columns]
        self._gdf = gdf[keep].copy()
        self._gdf = self._gdf.loc[~self._gdf.geometry.is_empty]
        self._sindex = self._gdf.sindex

    def run(
        self,
        center_lon: float,
        center_lat: float,
        res: int = 8,
        k: int = 4,
        disk_k: Optional[int] = 3,
        include_ftypes: Optional[List[str]] = None,
        max_points: int = 4000,
    ) -> dict:
        self._load()
        dk = 3 if disk_k is None else max(0, min(int(disk_k), int(k)))

        mask_geom = _disk_polygon_metric(center_lon, center_lat, res, dk).buffer(0)
        minx, miny, maxx, maxy = mask_geom.bounds

        idx = list(self._sindex.intersection((minx, miny, maxx, maxy)))
        cand = self._gdf.iloc[idx]
        cand = cand[cand.geometry.intersects(mask_geom)]

        if include_ftypes:
            cand = cand[cand["FTYPE"].isin(include_ftypes)]

        if len(cand) > max_points:
            cand = cand.iloc[:max_points].copy()

        out = cand.to_crs(4326)
        feats = []
        for _, r in out.iterrows():
            p = r.geometry
            if p.is_empty:
                continue
            feats.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [p.x, p.y]},
                "properties": {"FTYPE": r.get("FTYPE"), "UFI": r.get("UFI")},
            })

        mask_fc = _geom_to_wgs84_fc(mask_geom)
        return {
            "features": {"type": "FeatureCollection", "features": feats},
            "mask": mask_fc,
            "summary": {"count": len(feats), "h3": {"res": res, "disk_k": dk, "k_built": k}, "filtered_types": include_ftypes or []},
        }
