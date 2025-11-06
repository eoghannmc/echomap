#!/usr/bin/env python3
"""
Download and partition contours links from Supabase storage.
This creates the _by_prefix2 directory structure needed for fast shard-based filtering.
"""

import urllib.request
import pandas as pd
from pathlib import Path

# Supabase storage URL for contours links
CONTOURS_LINKS_URL = "https://fyxddjzjpjepmiotssae.supabase.co/storage/v1/object/public/geo-data/contours/contours_h3_links.parquet"

# Local paths
DATA_BASE = Path(__file__).parent.parent.parent / "data_web"
CONTOURS_DIR = DATA_BASE / "SHARDS_CONTOURS"
CONTOURS_LINKS_FILE = CONTOURS_DIR / "contours_h3_links.parquet"
CONTOURS_LINKS_DIR = CONTOURS_DIR / "contours_h3_links.parquet_by_prefix2"

def download_contours_links():
    """Download the contours links file from Supabase"""
    print(f"Downloading contours links from Supabase...")
    CONTOURS_DIR.mkdir(parents=True, exist_ok=True)
    
    req = urllib.request.Request(CONTOURS_LINKS_URL)
    with urllib.request.urlopen(req) as resp, open(CONTOURS_LINKS_FILE, "wb") as f:
        data = resp.read()
        f.write(data)
    
    size_mb = CONTOURS_LINKS_FILE.stat().st_size / (1024 * 1024)
    print(f"Downloaded: {CONTOURS_LINKS_FILE} ({size_mb:.1f} MB)")

def partition_links():
    """Partition the links file by h3_r7 prefix (first 2 chars)"""
    print(f"Loading links file...")
    df = pd.read_parquet(CONTOURS_LINKS_FILE)
    print(f"Loaded {len(df)} links")
    
    # Create output directory
    CONTOURS_LINKS_DIR.mkdir(parents=True, exist_ok=True)
    
    # Add prefix column (first 2 chars of h3_r7)
    df['prefix'] = df['h3_r7'].str[:2]
    
    # Group by prefix and save
    print(f"Partitioning by prefix...")
    for prefix, group in df.groupby('prefix'):
        output_file = CONTOURS_LINKS_DIR / f"{prefix}.parquet"
        group[['feature_id', 'h3_r7']].to_parquet(output_file, index=False)
        print(f"  {prefix}.parquet: {len(group)} links")
    
    print(f"Partitioned into {len(df['prefix'].unique())} files in {CONTOURS_LINKS_DIR}")

def main():
    # Check if already partitioned
    if CONTOURS_LINKS_DIR.exists() and any(CONTOURS_LINKS_DIR.glob("*.parquet")):
        print(f"Contours links already partitioned in {CONTOURS_LINKS_DIR}")
        return
    
    # Download if needed
    if not CONTOURS_LINKS_FILE.exists():
        download_contours_links()
    else:
        print(f"Contours links file already exists: {CONTOURS_LINKS_FILE}")
    
    # Partition
    partition_links()
    
    print("\nDone! Contours links ready for shard-based filtering.")

if __name__ == "__main__":
    main()
