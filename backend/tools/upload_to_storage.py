"""
Upload parquet files from data_web to Supabase Storage.
Run this locally to populate the Storage bucket with all datasets.
"""

import os
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("[ERROR] Missing Supabase credentials in .env")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
BUCKET_NAME = "geo-data"

DATA_WEB = Path(__file__).parent.parent / "data_web"

# Define all files to upload: (local_path, storage_path, description)
FILES_TO_UPLOAD = [
    # POIs
    (DATA_WEB / "shard_data" / "pois_h3.parquet", "places/pois_h3.parquet", "POIs"),
    
    # Roads
    (DATA_WEB / "SHARDS_ROADS" / "roads_h3.parquet", "roads/roads_h3.parquet", "Roads main"),
    
    # Contours
    (DATA_WEB / "SHARDS_CONTOURS" / "contours_h3.parquet", "contours/contours_h3.parquet", "Contours main"),
    (DATA_WEB / "SHARDS_CONTOURS" / "contours_h3_links.parquet", "contours/contours_h3_links.parquet", "Contours links"),
    
    # Electricity
    (DATA_WEB / "SHARDS_ELEC" / "electricity_transmission_h3.parquet", "electricity/electricity_transmission_h3.parquet", "Powerlines main"),
    
    # Hydro
    (DATA_WEB / "SHARDS_HYDRO" / "modified_rivers_h3.parquet", "hydro/modified_rivers_h3.parquet", "Modified rivers"),
    (DATA_WEB / "SHARDS_HYDRO" / "priority_rivers_h3.parquet", "hydro/priority_rivers_h3.parquet", "Priority rivers"),
    
    # Meshblocks
    (DATA_WEB / "shard_meshblock" / "SHARDED_MESHBLOCK_h3.parquet", "meshblock/SHARDED_MESHBLOCK_h3.parquet", "Meshblocks main"),
    (DATA_WEB / "shard_meshblock" / "SHARDED_MESHBLOCK_h3_links.parquet", "meshblock/SHARDED_MESHBLOCK_h3_links.parquet", "Meshblocks links"),
    
    # Property
    (DATA_WEB / "shard_property" / "property_h3.parquet", "property/property_h3.parquet", "Property main"),
    
    # Flora
    (DATA_WEB / "shard_flora" / "flora_fauna_h3.parquet", "flora/flora_fauna_h3.parquet", "Flora main"),
    
    # Hextable
    (DATA_WEB / "hextable" / "hex_polys_with_tags_res8_vic_enriched.parquet", "hextable/hex_polys_with_tags_res8_vic_enriched.parquet", "Hextable"),
]

# Directories with multiple parquet files (links folders)
DIRS_TO_UPLOAD = [
    (DATA_WEB / "SHARDS_ROADS" / "roads_h3_links.parquet_by_prefix2", "roads/roads_h3_links.parquet_by_prefix2", "Roads links"),
    (DATA_WEB / "SHARDS_ELEC" / "electricity_transmission_h3_links.parquet_by_prefix2", "electricity/electricity_transmission_h3_links.parquet_by_prefix2", "Powerlines links"),
    (DATA_WEB / "SHARDS_HYDRO" / "modified_rivers_h3_links.parquet_by_prefix2", "hydro/modified_rivers_h3_links.parquet_by_prefix2", "Modified rivers links"),
    (DATA_WEB / "SHARDS_HYDRO" / "priority_rivers_h3_links.parquet_by_prefix2", "hydro/priority_rivers_h3_links.parquet_by_prefix2", "Priority rivers links"),
    (DATA_WEB / "shard_property" / "property_h3_links.parquet_by_prefix2", "property/property_h3_links.parquet_by_prefix2", "Property links"),
    (DATA_WEB / "shard_flora" / "flora_fauna_h3_links.parquet_by_prefix2", "flora/flora_fauna_h3_links.parquet_by_prefix2", "Flora links"),
    (DATA_WEB / "SHARDS_CONTOURS" / "contours_h3_links.parquet_by_prefix2", "contours/contours_h3_links.parquet_by_prefix2", "Contours links dir"),
]


def upload_file(local_path: Path, storage_path: str, desc: str) -> bool:
    """Upload a single file to Storage."""
    if not local_path.exists():
        print(f"  [SKIP] File not found: {local_path}")
        return False
    
    file_size_mb = local_path.stat().st_size / (1024 * 1024)
    print(f"\n[{desc}]")
    print(f"  Local: {local_path}")
    print(f"  Storage: {storage_path}")
    print(f"  Size: {file_size_mb:.1f} MB")
    
    try:
        with open(local_path, 'rb') as f:
            supabase.storage.from_(BUCKET_NAME).upload(
                storage_path,
                f,
                file_options={"content-type": "application/octet-stream", "upsert": "true"}
            )
        print(f"  [OK] Uploaded!")
        return True
    except Exception as e:
        print(f"  [ERROR] {e}")
        return False


def upload_directory(local_dir: Path, storage_prefix: str, desc: str) -> bool:
    """Upload all parquet files in a directory."""
    if not local_dir.exists():
        print(f"  [SKIP] Directory not found: {local_dir}")
        return False
    
    parquet_files = list(local_dir.glob("*.parquet"))
    if not parquet_files:
        print(f"  [SKIP] No parquet files in: {local_dir}")
        return False
    
    print(f"\n[{desc}]")
    print(f"  Local: {local_dir}")
    print(f"  Storage: {storage_prefix}/")
    print(f"  Files: {len(parquet_files)}")
    
    success_count = 0
    for parquet_file in parquet_files:
        storage_path = f"{storage_prefix}/{parquet_file.name}"
        file_size_mb = parquet_file.stat().st_size / (1024 * 1024)
        
        try:
            with open(parquet_file, 'rb') as f:
                supabase.storage.from_(BUCKET_NAME).upload(
                    storage_path,
                    f,
                    file_options={"content-type": "application/octet-stream", "upsert": "true"}
                )
            print(f"    [OK] {parquet_file.name} ({file_size_mb:.1f} MB)")
            success_count += 1
        except Exception as e:
            print(f"    [ERROR] {parquet_file.name}: {e}")
    
    print(f"  Uploaded {success_count}/{len(parquet_files)} files")
    return success_count == len(parquet_files)


def main():
    print("="*70)
    print("Uploading parquet files to Supabase Storage")
    print("="*70)
    
    # Upload single files
    print("\n--- Single Files ---")
    file_results = []
    for local_path, storage_path, desc in FILES_TO_UPLOAD:
        success = upload_file(local_path, storage_path, desc)
        file_results.append((desc, success))
    
    # Upload directories
    print("\n--- Directories (Links Files) ---")
    dir_results = []
    for local_dir, storage_prefix, desc in DIRS_TO_UPLOAD:
        success = upload_directory(local_dir, storage_prefix, desc)
        dir_results.append((desc, success))
    
    # Summary
    print("\n" + "="*70)
    print("UPLOAD SUMMARY")
    print("="*70)
    
    print("\nSingle Files:")
    for desc, success in file_results:
        status = "[OK]" if success else "[FAIL]"
        print(f"  {status} {desc}")
    
    print("\nDirectories:")
    for desc, success in dir_results:
        status = "[OK]" if success else "[FAIL]"
        print(f"  {status} {desc}")
    
    total = len(file_results) + len(dir_results)
    success = sum(1 for _, s in file_results + dir_results if s)
    
    print(f"\nTotal: {success}/{total} uploaded successfully")
    print("="*70)


if __name__ == "__main__":
    main()
