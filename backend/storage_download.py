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

def download_file(storage_path: str, local_path: Path, suppress_errors: bool = False):
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
        if not suppress_errors:
            print(f"  ❌ Error downloading {storage_path}: {e}")
        return False

def list_files_in_storage(prefix: str):
    """List all files in a storage prefix (filters out folders)."""
    if not SUPABASE_ENABLED:
        return []
    
    try:
        result = supabase.storage.from_(BUCKET_NAME).list(prefix)
        # Filter out folders (they have no metadata/size)
        files = []
        for item in result:
            # Files have metadata with size, folders don't
            if item.get('metadata') is not None:
                files.append(item['name'])
        return files
    except Exception as e:
        print(f"  ❌ Error listing files in {prefix}: {e}")
        return []

def download_directory(storage_prefix: str, local_dir: Path):
    """Download all files from a storage prefix to local directory."""
    if not SUPABASE_ENABLED:
        return False
    
    try:
        # Try direct download of likely shard files
        # Victoria typically uses shards 80-89 range, but try broader range to be safe
        expected_files = [f"{i:02d}.parquet" for i in range(100)]  # 00-99.parquet
        
        success_count = 0
        attempted = 0
        
        for filename in expected_files:
            storage_path = f"{storage_prefix}/{filename}"
            local_path = local_dir / filename
            
            # Skip if already exists locally
            if local_path.exists():
                success_count += 1
                continue
            
            # Try to download - download_file() handles errors internally
            attempted += 1
            if download_file(storage_path, local_path, suppress_errors=True):
                success_count += 1
        
        if success_count > 0:
            print(f"  📊 {success_count} shard files available ({attempted} attempted downloads)")
        else:
            print(f"  ⚠️  No shard files found (tried {attempted} downloads)")
        
        return success_count > 0  # Return True if at least one file available
    except Exception as e:
        print(f"  ❌ Error downloading directory {storage_prefix}: {e}")
        return False

def ensure_data_files():
    """
    Download only LINKS files on startup (small, ~50MB total).
    Main parquet files will be loaded on-demand from Storage.
    This prevents Railway startup timeouts.
    """
    print("=" * 60)
    print("📦 Downloading links files for shard filtering...")
    print("=" * 60)
    
    if not SUPABASE_ENABLED:
        print("⚠️  Supabase not configured, will use local files/on-demand loading")
        print()
        return
    
    # Only download small links files - main files loaded on-demand
    links_to_download = [
        # (storage_path, local_path, description)
        ("meshblock/SHARDED_MESHBLOCK_h3_links.parquet", BASE_PATH / "shard_meshblock" / "SHARDED_MESHBLOCK_h3_links.parquet", "Meshblock links"),
        ("contours/contours_h3_links.parquet", BASE_PATH / "SHARDS_CONTOURS" / "contours_h3_links.parquet", "Contours links"),
    ]
    
    dirs_to_download = [
        # (storage_prefix, local_dir, description)
        ("flora/flora_fauna_h3_links.parquet_by_prefix2", BASE_PATH / "shard_flora" / "flora_fauna_h3_links.parquet_by_prefix2", "Flora links"),
        ("property/property_h3_links.parquet_by_prefix2", BASE_PATH / "shard_property" / "property_h3_links.parquet_by_prefix2", "Property links"),
        ("roads/roads_h3_links.parquet_by_prefix2", BASE_PATH / "SHARDS_ROADS" / "roads_h3_links.parquet_by_prefix2", "Roads links"),
        ("electricity/electricity_transmission_h3_links.parquet_by_prefix2", BASE_PATH / "SHARDS_ELEC" / "electricity_transmission_h3_links.parquet_by_prefix2", "Electricity links"),
        ("hydro/modified_rivers_h3_links.parquet_by_prefix2", BASE_PATH / "SHARDS_HYDRO" / "modified_rivers_h3_links.parquet_by_prefix2", "Hydro modified rivers links"),
        ("hydro/priority_rivers_h3_links.parquet_by_prefix2", BASE_PATH / "SHARDS_HYDRO" / "priority_rivers_h3_links.parquet_by_prefix2", "Hydro priority rivers links"),
    ]
    
    downloads_needed = False
    
    # Download single links files
    for storage_path, local_path, desc in links_to_download:
        if not local_path.exists():
            print(f"⬇️  Downloading: {desc}")
            downloads_needed = True
            download_file(storage_path, local_path)
        else:
            file_size_mb = local_path.stat().st_size / (1024 * 1024)
            print(f"✅ Found: {desc} ({file_size_mb:.1f} MB)")
    
    # Download links directories
    for storage_prefix, local_dir, desc in dirs_to_download:
        needs_download = not local_dir.exists() or not list(local_dir.glob("*.parquet"))
        
        if needs_download:
            print(f"⬇️  Downloading: {desc} directory")
            downloads_needed = True
            success = download_directory(storage_prefix, local_dir)
            
            # Verify files were actually downloaded
            downloaded_files = list(local_dir.glob("*.parquet"))
            if downloaded_files:
                print(f"✅ Downloaded: {desc} ({len(downloaded_files)} files)")
            else:
                print(f"⚠️  Warning: {desc} - no shard files found in Storage")
        else:
            file_count = len(list(local_dir.glob("*.parquet")))
            print(f"✅ Found: {desc} ({file_count} files)")
    
    print("=" * 60)
    if downloads_needed:
        print("✅ Links files downloaded (~50MB total)")
    else:
        print("✅ All links files available")
    print("📌 Main parquet files will be loaded on-demand from Storage")
    print("=" * 60)
    print()

if __name__ == "__main__":
    ensure_data_files()
