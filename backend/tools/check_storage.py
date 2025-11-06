"""Check what's in Supabase Storage"""
import sys
sys.path.insert(0, r'c:\Users\mccar\PROJECTS\2400 ECHO XYZ\backend')
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'), 
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

print("Files in Storage geo-data bucket:")
print("="*60)

folders = supabase.storage.from_('geo-data').list()

for folder in folders:
    folder_name = folder['name']
    print(f"\n[{folder_name}/]")
    
    try:
        items = supabase.storage.from_('geo-data').list(folder_name)
        if not items:
            print(f"  (empty)")
            continue
            
        for item in items:
            name = item.get('name', 'unknown')
            metadata = item.get('metadata')
            
            # Check if it's a folder (has no metadata) or file
            if metadata is None:
                # It's a subdirectory
                print(f"  [{name}/] (folder)")
            else:
                size_bytes = metadata.get('size', 0)
                size_mb = size_bytes / (1024*1024)
                print(f"  {name} - {size_mb:.1f} MB")
    except Exception as e:
        print(f"  Error: {e}")
