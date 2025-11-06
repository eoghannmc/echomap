"""
Download sharded parquet files from Supabase Storage on backend startup.

This ensures parquet files are available locally for fast querying,
while keeping them out of git for cleaner repo management.
"""

import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    print("⚠️  Warning: Missing Supabase credentials, will use local files if available")
    SUPABASE_ENABLED = False
else:
    SUPABASE_ENABLED = True
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

BUCKET_NAME = "geo-data"
# Path works for both local (backend/../data_web) and Railway (/app/data_web created on demand)
if os.path.exists(Path(__file__).parent / "data_web"):
    # Railway: data_web is in /app/data_web
    BASE_PATH = Path(__file__).parent / "data_web"
else:
    # Local dev: data_web is at repo root
    BASE_PATH = Path(__file__).parent.parent / "data_web"

def download_file(storage_path: str, local_path: Path):
    """Download a single file from Supabase Storage."""
    if not SUPABASE_ENABLED:
        return False
    
    try:
        # Ensure parent directory exists
        local_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Download file
        response = supabase.storage.from_(BUCKET_NAME).download(storage_path)
        
        # Write to local file
        with open(local_path, 'wb') as f:
            f.write(response)
        
        file_size_mb = len(response) / (1024 * 1024)
        print(f"  ✅ Downloaded {storage_path} ({file_size_mb:.1f} MB)")
        return True
    except Exception as e:
        print(f"  ❌ Error downloading {storage_path}: {e}")
        return False

def list_files_in_storage(prefix: str):
    """List all files in a storage prefix."""
    if not SUPABASE_ENABLED:
        return []
    
    try:
        result = supabase.storage.from_(BUCKET_NAME).list(prefix)
        return [item['name'] for item in result]
    except Exception as e:
        print(f"  ❌ Error listing files in {prefix}: {e}")
        return []

def download_directory(storage_prefix: str, local_dir: Path):
    """Download all files from a storage prefix to local directory."""
    if not SUPABASE_ENABLED:
        return False
    
    try:
        # List files in storage
        files = list_files_in_storage(storage_prefix)
        print(f"  📁 Found {len(files)} files in storage/{storage_prefix}")
        
        success_count = 0
        for filename in files:
            storage_path = f"{storage_prefix}/{filename}"
            local_path = local_dir / filename
            
            if download_file(storage_path, local_path):
                success_count += 1
        
        print(f"  📊 Downloaded {success_count}/{len(files)} files")
        return success_count == len(files)
    except Exception as e:
        print(f"  ❌ Error downloading directory {storage_prefix}: {e}")
        return False

def ensure_data_files():
    """
    Ensure all required parquet files exist locally.
    Download from Supabase Storage if missing.
    """
    print("=" * 60)
    print("📦 Checking parquet data files...")
    print("=" * 60)
    
    if not SUPABASE_ENABLED:
        print("⚠️  Supabase not configured, using local files only")
        print()
        return
    
    files_to_check = [
        # (storage_path, local_path, description)
        ("flora/flora_fauna_h3.parquet", BASE_PATH / "shard_flora" / "flora_fauna_h3.parquet", "Flora main"),
        ("property/property_h3.parquet", BASE_PATH / "shard_property" / "property_h3.parquet", "Property main"),
        ("meshblock/SHARDED_MESHBLOCK_h3.parquet", BASE_PATH / "shard_meshblock" / "SHARDED_MESHBLOCK_h3.parquet", "Meshblock main"),
        ("meshblock/SHARDED_MESHBLOCK_h3_links.parquet", BASE_PATH / "shard_meshblock" / "SHARDED_MESHBLOCK_h3_links.parquet", "Meshblock links"),
        ("places/pois_h3.parquet", BASE_PATH / "shard_data" / "pois_h3.parquet", "Places/POIs"),
        ("roads/roads_h3.parquet", BASE_PATH / "SHARDS_ROADS" / "roads_h3.parquet", "Roads main"),
        ("contours/contours_h3.parquet", BASE_PATH / "SHARDS_CONTOURS" / "contours_h3.parquet", "Contours main"),
        ("contours/contours_h3_links.parquet", BASE_PATH / "SHARDS_CONTOURS" / "contours_h3_links.parquet", "Contours links"),
        ("electricity/electricity_transmission_h3.parquet", BASE_PATH / "SHARDS_ELEC" / "electricity_transmission_h3.parquet", "Electricity main"),
        ("hydro/modified_rivers_h3.parquet", BASE_PATH / "SHARDS_HYDRO" / "modified_rivers_h3.parquet", "Hydro modified rivers"),
        ("hydro/priority_rivers_h3.parquet", BASE_PATH / "SHARDS_HYDRO" / "priority_rivers_h3.parquet", "Hydro priority rivers"),
        ("hextable/hex_polys_with_tags_res8_vic_enriched.parquet", BASE_PATH / "hextable" / "hex_polys_with_tags_res8_vic_enriched.parquet", "Hextable enriched"),
    ]
    
    dirs_to_check = [
        # (storage_prefix, local_dir, description)
        ("flora/flora_fauna_h3_links.parquet_by_prefix2", BASE_PATH / "shard_flora" / "flora_fauna_h3_links.parquet_by_prefix2", "Flora links"),
        ("property/property_h3_links.parquet_by_prefix2", BASE_PATH / "shard_property" / "property_h3_links.parquet_by_prefix2", "Property links"),
        ("roads/roads_h3_links.parquet_by_prefix2", BASE_PATH / "SHARDS_ROADS" / "roads_h3_links.parquet_by_prefix2", "Roads links"),
        ("electricity/electricity_transmission_h3_links.parquet_by_prefix2", BASE_PATH / "SHARDS_ELEC" / "electricity_transmission_h3_links.parquet_by_prefix2", "Electricity links"),
        ("hydro/modified_rivers_h3_links.parquet_by_prefix2", BASE_PATH / "SHARDS_HYDRO" / "modified_rivers_h3_links.parquet_by_prefix2", "Hydro modified rivers links"),
        ("hydro/priority_rivers_h3_links.parquet_by_prefix2", BASE_PATH / "SHARDS_HYDRO" / "priority_rivers_h3_links.parquet_by_prefix2", "Hydro priority rivers links"),
    ]
    
    downloads_needed = False
    
    # Check single files
    for storage_path, local_path, desc in files_to_check:
        if not local_path.exists():
            print(f"⬇️  Missing: {desc}")
            downloads_needed = True
            download_file(storage_path, local_path)
        else:
            file_size_mb = local_path.stat().st_size / (1024 * 1024)
            print(f"✅ Found: {desc} ({file_size_mb:.1f} MB)")
    
    # Check directories
    for storage_prefix, local_dir, desc in dirs_to_check:
        if not local_dir.exists() or not list(local_dir.glob("*.parquet")):
            print(f"⬇️  Missing: {desc} directory")
            downloads_needed = True
            download_directory(storage_prefix, local_dir)
        else:
            file_count = len(list(local_dir.glob("*.parquet")))
            print(f"✅ Found: {desc} ({file_count} files)")
    
    print("=" * 60)
    if downloads_needed:
        print("✅ Downloaded missing files from Supabase Storage")
    else:
        print("✅ All parquet files available locally")
    print("=" * 60)
    print()

if __name__ == "__main__":
    ensure_data_files()
