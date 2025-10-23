# backend/analyses_meshprops_h3.py
from pathlib import Path
from typing import Tuple, Iterable, List, Optional, Set
import geopandas as gpd
from shapely.geometry import Polygon
from shapely.ops import unary_union
from functools import lru_cache
import h3
import pyogrio
from pyproj import Transformer

MASTER = Path("data_master/master.gpkg")
TARGET_EPSG = 7855  # GDA2020 / MGA55

to_wgs84  = Transformer.from_crs(TARGET_EPSG, 4326, always_xy=True)
to_metric = Transformer.from_crs(4326, TARGET_EPSG, always_xy=True)


# ---------- H3 compat helpers ----------
def _geo_to_cell(lat: float, lon: float, res: int) -> str:
    # v3/v4 compat
    if hasattr(h3, "geo_to_h3"):
        return h3.geo_to_h3(lat, lon, res)     # v3
    return h3.latlng_to_cell(lat, lon, res)    # v4

def _grid_disk(center_cell: str, k: int) -> Set[str]:
    if k <= 0:
        return {center_cell}
    if hasattr(h3, "k_ring"):
        return set(h3.k_ring(center_cell, k))  # v3
    return set(h3.grid_disk(center_cell, k))   # v4

def _boundary(cell: str):
    if hasattr(h3, "h3_to_geo_boundary"):
        latlon = h3.h3_to_geo_boundary(cell, geo_json=True)  # [(lat,lon),...]
        return [(lng, lat) for lat, lng in latlon]
    latlng = h3.cell_to_boundary(cell)  # v4 -> [(lat,lng),...]
    return [(lng, lat) for (lat, lng) in latlng]

def _hex_polygon_metric(cell: str) -> Polygon:
    pts = [to_metric.transform(lon, lat) for (lon, lat) in _boundary(cell)]
    return Polygon(pts)


# ---------- Geometry helpers ----------
def _geom_to_fc_wgs84(poly: Polygon):
    """Return a minimal FeatureCollection (WGS84) for a Polygon."""
    coords = []
    for x, y in list(poly.exterior.coords):
        lon, lat = to_wgs84.transform(x, y)
        coords.append([lon, lat])
    return {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "geometry": {"type": "Polygon", "coordinates": [coords]},
            "properties": {}
        }]
    }


class MeshPropsAnalysisH3:
    """
    Reads mesh blocks and property polygons from MASTER (already in TARGET_EPSG),
    clips them to a hex mask (home hex only by default), simplifies lightly,
    and returns WGS84 GeoJSON FeatureCollections.
    """
    def __init__(self, master_path: Path = MASTER):
        self.master = master_path

    # ---- internal I/O ----
    def _read_clip(self, layer: str, mask_poly: Polygon, columns=None) -> gpd.GeoDataFrame:
        minx, miny, maxx, maxy = mask_poly.bounds
        # bbox is in layer CRS; ETL should have written TARGET_EPSG
        g = pyogrio.read_dataframe(self.master, layer=layer, columns=columns, bbox=(minx, miny, maxx, maxy))
        if g.crs:
            g = g.to_crs(TARGET_EPSG)
        else:
            g = g.set_crs(TARGET_EPSG, allow_override=True)
        # hard clip to keep only inside mask
        mask_gdf = gpd.GeoDataFrame(geometry=[mask_poly], crs=f"EPSG:{TARGET_EPSG}")
        g = gpd.clip(g, mask_gdf)
        g = g.loc[~g.geometry.is_empty]
        return g

    # ---- mask builders ----
    def _home_hex_poly(self, lon: float, lat: float, res: int) -> Polygon:
        c = _geo_to_cell(lat, lon, res)
        return _hex_polygon_metric(c)

    def _disk_poly(self, lon: float, lat: float, res: int, k: int) -> Polygon:
        center = _geo_to_cell(lat, lon, res)
        cells = _grid_disk(center, k)
        polys = [_hex_polygon_metric(cc) for cc in cells]
        return unary_union(polys)

    # ---- public helpers (still available if you need them independently) ----
    def meshblocks(self, lon: float, lat: float, res: int = 8, disk_k: int = 0):
        # k=0 => only the home hex
        poly = self._home_hex_poly(lon, lat, res) if disk_k <= 0 else self._disk_poly(lon, lat, res, disk_k)
        cols = ["MB_CODE21", "Person", "Dwelling", "geometry"]
        try:
            gdf = self._read_clip("mesh_blocks", poly, columns=cols)
        except Exception:
            gdf = gpd.GeoDataFrame(geometry=[], crs=f"EPSG:{TARGET_EPSG}")

        # ensure attributes exist
        if "Dwelling" not in gdf.columns:
            gdf["Dwelling"] = 0
        if "Person" not in gdf.columns:
            gdf["Person"] = 0

        # tiny simplify to reduce payload
        if len(gdf) and not gdf.geom_type.isin(["Point", "MultiPoint"]).all():
            gdf["geometry"] = gdf.geometry.simplify(1.5, preserve_topology=True)

        out = gdf.to_crs(4326)
        feats = []
        for _, r in out.iterrows():
            feats.append({
                "type": "Feature",
                "geometry": r.geometry.__geo_interface__,
                "properties": {
                    "dw": int(r.get("Dwelling", 0) or 0),
                    "pop": int(r.get("Person", 0) or 0),
                    "mb": r.get("MB_CODE21")
                }
            })

        vals = gdf["Dwelling"].fillna(0) if len(gdf) else []
        vmin = float(vals.min()) if len(gdf) else 0.0
        vmax = float(vals.max()) if len(gdf) else 0.0

        return {
            "features": {"type": "FeatureCollection", "features": feats},
            "summary": {"count": len(feats), "dw_min": vmin, "dw_max": vmax, "res": res, "disk_k": int(max(0, disk_k))},
            "mask": _geom_to_fc_wgs84(poly)
        }

    def properties(self, lon: float, lat: float, res: int = 8, disk_k: int = 0):
        poly = self._home_hex_poly(lon, lat, res) if disk_k <= 0 else self._disk_poly(lon, lat, res, disk_k)
        try:
            gdf = self._read_clip("vic_properties", poly, columns=["geometry"])
        except Exception:
            gdf = gpd.GeoDataFrame(geometry=[], crs=f"EPSG:{TARGET_EPSG}")

        if len(gdf) and not gdf.geom_type.isin(["Point","MultiPoint"]).all():
            gdf["geometry"] = gdf.geometry.simplify(1.5, preserve_topology=True)

        out = gdf.to_crs(4326)
        feats = [{"type":"Feature","geometry": r.geometry.__geo_interface__,"properties":{}} for _, r in out.iterrows()]

        return {
            "features": {"type":"FeatureCollection", "features": feats},
            "summary": {"count": len(feats), "res": res, "disk_k": int(max(0, disk_k))},
            "mask": _geom_to_fc_wgs84(poly)
        }

    # ---- unified run for /analyze/meshprops_h3 ----
    def run(self, center_lon: float, center_lat: float, res: int = 8, k: int = 4, disk_k: Optional[int] = 0):
        """
        disk_k = 0 -> ONLY the home hex (your default requirement)
        disk_k >=1 -> union of hex rings 0..disk_k
        """
        dk = 0 if (disk_k is None) else int(max(0, disk_k))

        # Build mask once
        mask_poly = self._home_hex_poly(center_lon, center_lat, res) if dk <= 0 else self._disk_poly(center_lon, center_lat, res, dk)

        # Mesh blocks
        mesh_cols = ["MB_CODE21", "Person", "Dwelling", "geometry"]
        try:
            mesh_gdf = self._read_clip("mesh_blocks", mask_poly, columns=mesh_cols)
        except Exception:
            mesh_gdf = gpd.GeoDataFrame(geometry=[], crs=f"EPSG:{TARGET_EPSG}")
        if len(mesh_gdf) and not mesh_gdf.geom_type.isin(["Point","MultiPoint"]).all():
            mesh_gdf["geometry"] = mesh_gdf.geometry.simplify(1.5, preserve_topology=True)

        # Properties
        try:
            prop_gdf = self._read_clip("vic_properties", mask_poly, columns=["geometry"])
        except Exception:
            prop_gdf = gpd.GeoDataFrame(geometry=[], crs=f"EPSG:{TARGET_EPSG}")
        if len(prop_gdf) and not prop_gdf.geom_type.isin(["Point","MultiPoint"]).all():
            prop_gdf["geometry"] = prop_gdf.geometry.simplify(1.5, preserve_topology=True)

        # Convert to WGS84 for output
        mesh_out = mesh_gdf.to_crs(4326)
        prop_out = prop_gdf.to_crs(4326)

        mesh_feats = []
        for _, r in mesh_out.iterrows():
            mesh_feats.append({
                "type":"Feature",
                "geometry": r.geometry.__geo_interface__,
                "properties": {
                    "dw": int(r.get("Dwelling", 0) or 0),
                    "pop": int(r.get("Person", 0) or 0),
                    "mb": r.get("MB_CODE21")
                }
            })
        prop_feats = [{"type":"Feature","geometry": r.geometry.__geo_interface__,"properties":{}} for _, r in prop_out.iterrows()]

        # Dwelling stats for summary
        vals = mesh_gdf["Dwelling"].fillna(0) if len(mesh_gdf) else []
        vmin = float(vals.min()) if len(mesh_gdf) else 0.0
        vmax = float(vals.max()) if len(mesh_gdf) else 0.0

        return {
            "mesh": {"type":"FeatureCollection","features": mesh_feats},
            "properties": {"type":"FeatureCollection","features": prop_feats},
            "mask": _geom_to_fc_wgs84(mask_poly),
            "summary": {
                "mesh_count": len(mesh_feats),
                "prop_count": len(prop_feats),
                "dw_min": vmin,
                "dw_max": vmax,
                "h3": {"res": res, "disk_k": dk}
            }
        }
