"""
Utility to load parquet files on-demand from Supabase Storage.
Used when files are not available locally (e.g., on Railway).
"""

import os
import io
from pathlib import Path
from typing import Optional
import pandas as pd
import geopandas as gpd
from supabase import create_client, Client
from dotenv import load_dotenv
from functools import lru_cache

load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("⚠️  Warning: Missing Supabase credentials")
    supabase = None
else:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

BUCKET_NAME = "geo-data"

# In-memory cache for recently accessed files (max 3 files ~500MB each)
_file_cache = {}
_cache_size_limit = 3


def load_parquet_from_storage(storage_path: str, use_cache: bool = True) -> Optional[pd.DataFrame]:
    """
    Load a parquet file from Supabase Storage.
    
    Args:
        storage_path: Path in storage bucket (e.g., "roads/roads_h3.parquet")
        use_cache: Whether to cache the file in memory
    
    Returns:
        DataFrame or GeoDataFrame
    """
    if not supabase:
        print(f"[ERROR] Supabase not configured, cannot load {storage_path}")
        return None
    
    # Check cache first
    if use_cache and storage_path in _file_cache:
        print(f"  [CACHE] Using cached: {storage_path}")
        return _file_cache[storage_path]
    
    try:
        print(f"  [DOWNLOAD] From Storage: {storage_path}")
        
        # Download file bytes from storage
        response = supabase.storage.from_(BUCKET_NAME).download(storage_path)
        
        # Read parquet from bytes - use geopandas which handles geometry properly
        df = gpd.read_parquet(io.BytesIO(response))
        
        # Ensure CRS is set if it has geometry
        if 'geometry' in df.columns and df.crs is None:
            df = df.set_crs('EPSG:4326')
        
        print(f"  [OK] Loaded {len(df):,} rows from {storage_path}")
        
        # Cache if requested and not too many cached files
        if use_cache:
            # Evict oldest if cache is full
            if len(_file_cache) >= _cache_size_limit:
                oldest_key = next(iter(_file_cache))
                del _file_cache[oldest_key]
                print(f"  [EVICT] Removed from cache: {oldest_key}")
            
            _file_cache[storage_path] = df
            print(f"  [CACHE] Stored: {storage_path} ({len(_file_cache)}/{_cache_size_limit} slots)")
        
        return df
        
    except Exception as e:
        print(f"  [ERROR] Loading {storage_path}: {e}")
        return None


def load_links_from_storage(storage_prefix: str, shard_prefix: str) -> Optional[pd.DataFrame]:
    """
    Load a specific links file from a sharded directory in Storage.
    
    Args:
        storage_prefix: Directory in storage (e.g., "roads/roads_h3_links.parquet_by_prefix2")
        shard_prefix: Shard file name (e.g., "87.parquet")
    
    Returns:
        DataFrame with links
    """
    storage_path = f"{storage_prefix}/{shard_prefix}"
    
    try:
        if not supabase:
            return None
        
        print(f"  [DOWNLOAD] Links: {storage_path}")
        response = supabase.storage.from_(BUCKET_NAME).download(storage_path)
        df = pd.read_parquet(io.BytesIO(response))
        print(f"  [OK] Loaded {len(df):,} links from {storage_path}")
        return df
        
    except Exception as e:
        print(f"  [ERROR] Loading links {storage_path}: {e}")
        return None


def clear_cache():
    """Clear the in-memory file cache."""
    global _file_cache
    _file_cache = {}
    print("[CACHE] Cleared")


def get_cache_info():
    """Get information about cached files."""
    return {
        "cached_files": list(_file_cache.keys()),
        "cache_count": len(_file_cache),
        "cache_limit": _cache_size_limit
    }
