from typing import Set
import geopandas as gpd

"""
Storage loader for split parquet files.
Downloads only the specific 6-char or 8-char prefix files needed for the query.
"""
import os
from pathlib import Path
import geopandas as gpd
import pandas as pd
from typing import Set, List
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables (optional for Railway deployment)
try:
    env_path = Path(__file__).parent / '.env'
    if env_path.exists():
        load_dotenv(env_path)
        print("[Storage] Loaded environment from .env file")
    else:
        print("[Storage] No .env file found, using system environment variables")
except Exception as e:
    print(f"[Storage] Warning: Could not load .env file: {e}")

SUPABASE_URL = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print(f"[Storage] SUPABASE_URL: {'***' if SUPABASE_URL else 'MISSING'}")
    print(f"[Storage] SUPABASE_KEY: {'***' if SUPABASE_KEY else 'MISSING'}")
    raise RuntimeError("Missing Supabase credentials in environment. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Cache for downloaded split files
_split_cache = {}

def get_prefix_level(r7_cells: Set[str], dataset: str) -> int:
    """
    Determine whether to use 6-char or 8-char prefixes based on dataset.
    
    Large datasets (Contours, Property, Flora) use 8-char for some prefixes.
    Others use 6-char.
    """
    # Datasets that may have 8-char splits for certain prefixes
    EIGHT_CHAR_DATASETS = {'contours', 'property', 'flora'}
    
    if dataset.lower() not in EIGHT_CHAR_DATASETS:
        return 6
    
    # Check if any of the R7 cells need 8-char (oversized 6-char prefixes)
    # These specific 6-char prefixes are split into 8-char
    OVERSIZED_PREFIXES = {
        'contours': {'87be74', '87be62', '87be71', '87be76', '87be70', '87be72', '87be75', '87be44', '87be73', '87be45', '87be63'},
        'property': {'87be63'},
        'flora': {'87be75', '87be6a'}
    }
    
    dataset_lower = dataset.lower()
    if dataset_lower in OVERSIZED_PREFIXES:
        # Check if any r7 cell starts with an oversized prefix
        for r7 in r7_cells:
            prefix_6 = r7[:6]
            if prefix_6 in OVERSIZED_PREFIXES[dataset_lower]:
                return 8  # Use 8-char for this query
    
    return 6  # Default to 6-char

def extract_prefixes(r7_cells: Set[str], prefix_length: int) -> Set[str]:
    """Extract unique prefixes of specified length from R7 cell IDs"""
    return {cell[:prefix_length] for cell in r7_cells}

def download_split_file(dataset: str, filename: str, bucket: str = 'geo-data') -> gpd.GeoDataFrame:
    """
    Download a single split parquet file from Supabase Storage.
    
    Args:
        dataset: Dataset name (e.g., 'roads', 'contours')
        filename: Filename (e.g., 'roads_87be45.parquet')
        bucket: Storage bucket name
    
    Returns:
        GeoDataFrame with the data
    """
    cache_key = f"{dataset}/{filename}"
    
    # Check cache first
    if cache_key in _split_cache:
        print(f"[Storage] Cache hit: {cache_key}")
        return _split_cache[cache_key]
    
    try:
        # Download from Storage
        remote_path = f"{dataset}/by_prefix/{filename}"
        print(f"[Storage] Downloading: {remote_path}")
        
        response = supabase.storage.from_(bucket).download(remote_path)
        
        if not response:
            print(f"[Storage] File not found: {remote_path}")
            return None
        
        # Save to temp file and load
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.parquet') as tmp:
            tmp.write(response)
            tmp_path = tmp.name
        
        # Load with geopandas
        gdf = gpd.read_parquet(tmp_path)
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        # Cache it
        _split_cache[cache_key] = gdf
        print(f"[Storage] Loaded {len(gdf)} features from {filename}")
        
        return gdf
        
    except Exception as e:
        print(f"[Storage] Error downloading {remote_path}: {e}")
        return None

def load_split_files_for_shards(
    dataset: str,
    r7_cells: Set[str],
    filename_pattern: str
) -> gpd.GeoDataFrame:
    """
    Load split parquet files for specific R7 shards from Supabase Storage.
    
    Args:
        dataset: Dataset name (e.g., 'roads', 'contours')
        r7_cells: Set of R7 cell IDs
        filename_pattern: Pattern for filenames (e.g., 'roads_{prefix}.parquet')
    
    Returns:
        Combined GeoDataFrame with all features from matching files
    """
    if not r7_cells:
        return gpd.GeoDataFrame()
    
    # Determine prefix length (6 or 8 char)
    prefix_length = get_prefix_level(r7_cells, dataset)
    print(f"[{dataset}] Using {prefix_length}-char prefixes")
    
    # Extract unique prefixes
    prefixes = extract_prefixes(r7_cells, prefix_length)
    print(f"[{dataset}] Need {len(prefixes)} split files for {len(r7_cells)} R7 cells")
    
    # Download each file
    gdfs = []
    for prefix in prefixes:
        filename = filename_pattern.format(prefix=prefix)
        gdf = download_split_file(dataset, filename)
        if gdf is not None and len(gdf) > 0:
            gdfs.append(gdf)
    
    if not gdfs:
        print(f"[{dataset}] No data found for prefixes: {prefixes}")
        return gpd.GeoDataFrame()
    
    # Combine all GeoDataFrames
    combined = pd.concat(gdfs, ignore_index=True)
    print(f"[{dataset}] Combined {len(combined)} features from {len(gdfs)} files")
    
    return combined

# Dataset-specific loaders
def load_roads_for_shards(r7_cells: Set[str]) -> gpd.GeoDataFrame:
    """Load roads data for specific R7 shards"""
    gdf = load_split_files_for_shards('roads', r7_cells, 'roads_{prefix}.parquet')
    if not gdf.empty and "geometry" in gdf.columns:
        gdf = gdf.set_geometry("geometry")
    return gdf

def load_contours_for_shards(r7_cells: Set[str]) -> gpd.GeoDataFrame:
    """Load contours data for specific R7 shards"""
    gdf = load_split_files_for_shards('contours', r7_cells, 'contours_{prefix}.parquet')
    if not gdf.empty and "geometry" in gdf.columns:
        gdf = gdf.set_geometry("geometry")
    return gdf

def load_flora_for_shards(r7_cells: Set[str]) -> gpd.GeoDataFrame:
    """Load flora data for specific R7 shards"""
    gdf = load_split_files_for_shards('flora', r7_cells, 'flora_fauna_{prefix}.parquet')
    if not gdf.empty and "geometry" in gdf.columns:
        gdf = gdf.set_geometry("geometry")
    return gdf

def load_property_for_shards(r7_cells: Set[str]) -> gpd.GeoDataFrame:
    """Load property data for specific R7 shards"""
    gdf = load_split_files_for_shards('property', r7_cells, 'property_{prefix}.parquet')
    if not gdf.empty and "geometry" in gdf.columns:
        gdf = gdf.set_geometry("geometry")
    return gdf

def load_powerlines_for_shards(r7_cells: Set[str]) -> gpd.GeoDataFrame:
    """Load powerlines data for specific R7 shards"""
    gdf = load_split_files_for_shards('powerlines', r7_cells, 'electricity_transmission_{prefix}.parquet')
    if not gdf.empty and "geometry" in gdf.columns:
        gdf = gdf.set_geometry("geometry")
    return gdf

def load_rivers_for_shards(r7_cells: Set[str]) -> gpd.GeoDataFrame:
    """Load rivers data for specific R7 shards"""
    gdf = load_split_files_for_shards('rivers', r7_cells, 'modified_rivers_{prefix}.parquet')
    if not gdf.empty and "geometry" in gdf.columns:
        gdf = gdf.set_geometry("geometry")
    return gdf

def load_rail_for_shards(r7_cells: Set[str]) -> gpd.GeoDataFrame:
    """Load rail data for specific R7 shards"""
    gdf = load_split_files_for_shards('rail', r7_cells, 'rail_{prefix}.parquet')
    if not gdf.empty and "geometry" in gdf.columns:
        gdf = gdf.set_geometry("geometry")
    return gdf
