"""
PostGIS-based spatial analysis using Supabase database.
Queries spatial data directly from PostGIS with ST_Intersects.
Much more efficient than loading GeoJSON files.
"""
import os
from typing import List, Optional
from sqlalchemy import create_engine, text
from sqlalchemy.pool import NullPool
import geopandas as gpd
from shapely.geometry import Polygon
from shapely.ops import unary_union
import h3
from pyproj import Transformer
from functools import lru_cache

# Database connection
SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")

# Table names in Supabase
POSTGIS_TABLES = {
    "planning_zones": "planning_zones",
    "sa2": "sa2_boundaries",
    "parcels": "vic_properties",
    "mesh_blocks": "mesh_blocks",
}

TARGET_EPSG = 7855  # GDA2020 / MGA55

# Note: PostGIS tables are stored in WGS84 (EPSG:4326)
# We'll work directly in WGS84 for spatial queries

# H3 compatibility helpers
def _geo_to_cell(lat: float, lon: float, res: int) -> str:
    if hasattr(h3, "geo_to_h3"):
        return h3.geo_to_h3(lat, lon, res)
    return h3.latlng_to_cell(lat, lon, res)

def _disk(cell: str, k: int):
    if hasattr(h3, "k_ring"):
        return set(h3.k_ring(cell, k))
    return set(h3.grid_disk(cell, k))

def _boundary(cell: str):
    """Get H3 cell boundary as (lon, lat) tuples"""
    if hasattr(h3, "h3_to_geo_boundary"):
        latlon = h3.h3_to_geo_boundary(cell, geo_json=True)
        return [(lon, lat) for (lat, lon) in latlon]
    # cell_to_boundary returns (lat, lon), so we need to swap
    latlon = list(h3.cell_to_boundary(cell))
    return [(lon, lat) for (lat, lon) in latlon]

def _hex_polygon_wgs84(cell: str) -> Polygon:
    """Get hex polygon in WGS84 (lon, lat order)"""
    pts = _boundary(cell)  # Already in (lon, lat)
    return Polygon(pts)

def _disk_ring_polys(center_lon: float, center_lat: float, res: int, k: int):
    """Generate disk and ring polygons in WGS84"""
    c = _geo_to_cell(center_lat, center_lon, res)
    disk_cells = _disk(c, k)
    rings = []
    prev = set()
    for d in range(0, k + 1):
        incl = _disk(c, d)
        ring_d = {c} if d == 0 else (incl - prev)
        rings.append(ring_d)
        prev = incl
    disk_poly = unary_union([_hex_polygon_wgs84(cc) for cc in disk_cells])
    ring_polys = [unary_union([_hex_polygon_wgs84(cc) for cc in rr]) for rr in rings]
    return disk_poly, ring_polys


class PostGISAnalyzer:
    """
    Spatial analyzer using PostGIS queries.
    Fetches data from Supabase with ST_Intersects filtering.
    """
    
    def __init__(self):
        if not SUPABASE_DB_URL:
            raise RuntimeError("SUPABASE_DB_URL environment variable not set")
        # Use NullPool to avoid connection pooling issues
        self.engine = create_engine(SUPABASE_DB_URL, poolclass=NullPool)
    
    def query_zones(
        self,
        center_lon: float,
        center_lat: float,
        res: int = 8,
        k: int = 4,
        band_index: int = 2,
        layer: str = "planning_zones",
        zone_codes: Optional[List[str]] = None,
        simplify_tolerance_m: float = 5.0,
        max_features: int = 1500,
        clip_mode: str = "disk",
        disk_k: Optional[int] = None,
    ) -> dict:
        """
        Query planning zones or SA2 boundaries from PostGIS.
        Uses ST_Intersects for efficient spatial filtering.
        """
        # Get H3 clip geometry (already in WGS84)
        _, ring_polys = _disk_ring_polys(center_lon, center_lat, res, k)
        bi = max(0, min(band_index, k))
        if clip_mode == "disk":
            dk = bi if disk_k is None else max(0, min(disk_k, k))
            clip_geom = unary_union(ring_polys[: dk + 1])
        else:
            clip_geom = ring_polys[bi]
        
        # Check if geometry is valid
        if not clip_geom.is_valid or clip_geom.is_empty:
            raise RuntimeError(f"Invalid H3 geometry generated")
        
        # Geometry is already in WGS84
        clip_wkt = clip_geom.wkt
        
        # Get table name
        table_name = POSTGIS_TABLES.get(layer, layer)
        
        # Build SQL query with ST_Intersects
        sql_query = f"""
            SELECT *
            FROM {table_name}
            WHERE ST_Intersects(
                geometry,
                ST_GeomFromText('{clip_wkt}', 4326)
            )
        """
        
        # Add zone code filter if specified (use uppercase column name)
        if zone_codes and layer == "planning_zones":
            codes_str = "', '".join(zone_codes)
            sql_query += f' AND "ZONE_CODE" IN (\'{codes_str}\')'
        
        sql_query += f" LIMIT {max_features};"
        
        # Execute query
        try:
            gdf = gpd.read_postgis(
                sql=sql_query,
                con=self.engine,
                geom_col="geometry"
            )
        except Exception as e:
            raise RuntimeError(f"PostGIS query failed: {e}")
        
        if gdf.empty:
            return {
                "features": {"type": "FeatureCollection", "features": []},
                "mask": self._geom_to_wgs84_fc(clip_geom),
                "summary": {
                    "count": 0,
                    "clip_mode": clip_mode,
                    "ring_selected": bi,
                    "disk_k": disk_k,
                    "h3": {"res": res, "k": k},
                    "filtered_codes": zone_codes or [],
                },
            }
        
        # Data is already in WGS84, clip directly
        clipped = gpd.clip(gdf, gpd.GeoDataFrame(geometry=[clip_geom], crs="EPSG:4326"))
        clipped = clipped.loc[~clipped.geometry.is_empty]
        
        # Simplify if requested (convert tolerance from meters to degrees - approximate)
        if simplify_tolerance_m and not clipped.geom_type.isin(["Point", "MultiPoint"]).all():
            # Approximate: 1 degree ≈ 111km at equator, use smaller value for safety
            tolerance_deg = simplify_tolerance_m / 111000.0
            clipped["geometry"] = clipped.geometry.simplify(tolerance_deg, preserve_topology=True)
        
        # Already in WGS84
        clipped_wgs84 = clipped
        
        # Build GeoJSON features
        features = []
        for _, row in clipped_wgs84.iterrows():
            if row.geometry.is_empty:
                continue
            
            # Extract properties
            props = {k: v for k, v in row.items() if k != "geometry" and k != "id"}
            
            features.append({
                "type": "Feature",
                "geometry": row.geometry.__geo_interface__,
                "properties": props,
            })
        
        return {
            "features": {"type": "FeatureCollection", "features": features},
            "mask": self._geom_to_wgs84_fc(clip_geom),
            "summary": {
                "count": len(features),
                "clip_mode": clip_mode,
                "ring_selected": bi,
                "disk_k": disk_k if disk_k is not None else bi,
                "h3": {"res": res, "k": k},
                "filtered_codes": zone_codes or [],
            },
        }
    
    def _geom_to_wgs84_fc(self, geom):
        """Convert geometry to WGS84 FeatureCollection (already in WGS84)"""
        geoms = [geom] if isinstance(geom, Polygon) else list(geom.geoms)
        feats = []
        for g in geoms:
            if g.is_empty:
                continue
            # Geometry is already in WGS84, just extract coordinates
            coords = list(g.exterior.coords)
            feats.append({
                "type": "Feature",
                "geometry": {"type": "Polygon", "coordinates": [coords]},
                "properties": {}
            })
        return {"type": "FeatureCollection", "features": feats}
    
    def query_meshprops(
        self,
        center_lon: float,
        center_lat: float,
        res: int = 8,
        k: int = 4,
        which: Optional[str] = None,  # "mesh" | "parcels" | None (both)
        disk_k: Optional[int] = None,
        max_features: int = 5000,
    ) -> dict:
        """
        Query mesh blocks from PostGIS.
        Returns population and dwelling data.
        """
        # Get H3 clip geometry
        disk_poly, _ = _disk_ring_polys(center_lon, center_lat, res, k)
        dk = disk_k if disk_k is not None else k
        
        # Use disk_k rings
        if dk == 0:
            clip_geom = _hex_polygon_wgs84(h3.latlng_to_cell(center_lat, center_lon, res))
        else:
            _, ring_polys = _disk_ring_polys(center_lon, center_lat, res, dk)
            clip_geom = unary_union(ring_polys[: dk + 1])
        
        # Query mesh_blocks table
        clip_wkt = clip_geom.wkt
        sql_query = f"""
            SELECT *
            FROM mesh_blocks
            WHERE ST_Intersects(
                geometry,
                ST_GeomFromText('{clip_wkt}', 4326)
            )
            LIMIT {max_features}
        """
        
        try:
            gdf = gpd.read_postgis(sql=sql_query, con=self.engine, geom_col="geometry")
        except Exception as e:
            raise RuntimeError(f"PostGIS query failed: {e}")
        
        if gdf.empty:
            return {
                "features": {"type": "FeatureCollection", "features": []},
                "mask": self._geom_to_wgs84_fc(clip_geom),
                "summary": {"count": 0, "h3": {"res": res, "k": k}},
            }
        
        # Clip to geometry
        clipped = gpd.clip(gdf, gpd.GeoDataFrame(geometry=[clip_geom], crs="EPSG:4326"))
        clipped = clipped.loc[~clipped.geometry.is_empty]
        
        # Build features
        features = []
        for _, row in clipped.iterrows():
            if row.geometry.is_empty:
                continue
            
            props = {}
            # Add mesh block properties
            if "MB_CODE21" in row:
                props["MB_CODE21"] = row["MB_CODE21"]
            if "Person" in row:
                props["Person"] = int(row["Person"]) if row["Person"] is not None else 0
            if "Dwelling" in row:
                props["Dwelling"] = int(row["Dwelling"]) if row["Dwelling"] is not None else 0
            
            features.append({
                "type": "Feature",
                "geometry": row.geometry.__geo_interface__,
                "properties": props,
            })
        
        return {
            "features": {"type": "FeatureCollection", "features": features},
            "mask": self._geom_to_wgs84_fc(clip_geom),
            "summary": {
                "count": len(features),
                "h3": {"res": res, "k": k},
                "disk_k": dk,
            },
        }
    
    def __del__(self):
        """Cleanup database connection"""
        if hasattr(self, 'engine'):
            self.engine.dispose()

