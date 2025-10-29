"""
Central configuration for GeoJSON data paths.
Uses files from data_web/geojson/ directory.
"""
from pathlib import Path

# Base directory for GeoJSON files
GEOJSON_DIR = Path("data_web/geojson")

# GeoJSON file paths
GEOJSON_FILES = {
    "planning_zones": GEOJSON_DIR / "planning_zones.geojson",
    "sa2": GEOJSON_DIR / "sa2.geojson",
    "parcels": GEOJSON_DIR / "vic_properties.geojson",  # if exists
    "mesh_blocks": GEOJSON_DIR / "mesh_blocks.geojson",
    "metro_stations": GEOJSON_DIR / "metro_stations.geojson",
    "regional_stations": GEOJSON_DIR / "regional_stations.geojson",
    "rail": GEOJSON_DIR / "rail.geojson",
    "lga": GEOJSON_DIR / "lga.geojson",
    "postcodes": GEOJSON_DIR / "postcodes.geojson",
}

def get_geojson_path(layer_name: str) -> Path:
    """Get the path to a GeoJSON file for a given layer."""
    return GEOJSON_FILES.get(layer_name, GEOJSON_DIR / f"{layer_name}.geojson")
