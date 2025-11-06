"""Upload links parquet files from _by_prefix2 directories"""
import os
from pathlib import Path
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)
BUCKET = "geo-data"
DATA_WEB = Path(__file__).parent.parent.parent / "data_web"

# Links directories to upload
LINKS_DIRS = [
    (DATA_WEB / "SHARDS_ROADS" / "roads_h3_links.parquet_by_prefix2", "roads/roads_h3_links.parquet_by_prefix2"),
    (DATA_WEB / "SHARDS_ELEC" / "electricity_transmission_h3_links.parquet_by_prefix2", "electricity/electricity_transmission_h3_links.parquet_by_prefix2"),
    (DATA_WEB / "SHARDS_HYDRO" / "modified_rivers_h3_links.parquet_by_prefix2", "hydro/modified_rivers_h3_links.parquet_by_prefix2"),
    (DATA_WEB / "SHARDS_HYDRO" / "priority_rivers_h3_links.parquet_by_prefix2", "hydro/priority_rivers_h3_links.parquet_by_prefix2"),
    (DATA_WEB / "shard_property" / "property_h3_links.parquet_by_prefix2", "property/property_h3_links.parquet_by_prefix2"),
    (DATA_WEB / "shard_flora" / "flora_fauna_h3_links.parquet_by_prefix2", "flora/flora_fauna_h3_links.parquet_by_prefix2"),
    (DATA_WEB / "SHARDS_CONTOURS" / "contours_h3_links.parquet_by_prefix2", "contours/contours_h3_links.parquet_by_prefix2"),
]

print("="*70)
print("Uploading links files to Supabase Storage")
print("="*70)

total_uploaded = 0
total_failed = 0

for local_dir, storage_prefix in LINKS_DIRS:
    print(f"\n[{storage_prefix}]")
    
    if not local_dir.exists():
        print(f"  [SKIP] Directory not found: {local_dir}")
        continue
    
    parquet_files = list(local_dir.glob("*.parquet"))
    if not parquet_files:
        print(f"  [SKIP] No parquet files found")
        continue
    
    print(f"  Found {len(parquet_files)} files")
    
    for pfile in parquet_files:
        storage_path = f"{storage_prefix}/{pfile.name}"
        size_mb = pfile.stat().st_size / (1024*1024)
        
        try:
            with open(pfile, 'rb') as f:
                supabase.storage.from_(BUCKET).upload(
                    storage_path,
                    f,
                    file_options={"content-type": "application/octet-stream", "upsert": "true"}
                )
            print(f"    [OK] {pfile.name} ({size_mb:.1f} MB)")
            total_uploaded += 1
        except Exception as e:
            print(f"    [FAIL] {pfile.name}: {e}")
            total_failed += 1

print("\n" + "="*70)
print(f"Uploaded: {total_uploaded}, Failed: {total_failed}")
print("="*70)
