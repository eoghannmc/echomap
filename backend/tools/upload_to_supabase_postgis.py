#!/usr/bin/env python3
"""
Upload GeoPackage layers to Supabase PostGIS tables.
This enables spatial queries directly in the database.
"""
import os
from pathlib import Path
from dotenv import load_dotenv
import geopandas as gpd
from sqlalchemy import create_engine, text
import pyogrio

# Load environment variables
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)

SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")
MASTER_GPKG = Path("data_master/master.gpkg")

# Layers to upload with their table names
LAYERS_TO_UPLOAD = {
    "planning_zones": "planning_zones",
    "sa2": "sa2_boundaries", 
    "vic_properties": "vic_properties",
    "mesh_blocks": "mesh_blocks",
    "metro_stations": "metro_stations",
    "regional_stations": "regional_stations",
    "rail": "rail_lines",
    "lga": "lga_boundaries",
}

def upload_layer(engine, layer_name: str, table_name: str, gpkg_path: Path):
    """Upload a single layer to PostGIS"""
    print(f"\n{'='*60}")
    print(f"Processing: {layer_name} -> {table_name}")
    print(f"{'='*60}")
    
    try:
        # Read from GeoPackage
        print(f"Reading {layer_name} from {gpkg_path}...")
        gdf = gpd.read_file(gpkg_path, layer=layer_name)
        
        print(f"  ✓ Loaded {len(gdf)} features")
        print(f"  ✓ CRS: {gdf.crs}")
        print(f"  ✓ Columns: {list(gdf.columns)}")
        
        # Ensure WGS84 for Supabase (standard for PostGIS web apps)
        if gdf.crs and gdf.crs.to_epsg() != 4326:
            print(f"  → Converting from {gdf.crs} to EPSG:4326...")
            gdf = gdf.to_crs("EPSG:4326")
        
        # Upload to PostGIS with chunking for large datasets
        print(f"  → Uploading to Supabase table '{table_name}'...")
        # Use smaller chunks to avoid timeout (Supabase has 60s statement timeout by default)
        chunk_size = 5000 if len(gdf) > 50000 else 10000 if len(gdf) > 10000 else None
        
        if chunk_size:
            print(f"  → Using chunked upload ({chunk_size:,} rows per chunk)")
            total_chunks = (len(gdf) + chunk_size - 1) // chunk_size
            print(f"  → Total chunks: {total_chunks}")
        
        # Set statement timeout to avoid issues
        with engine.connect() as conn:
            conn.execute(text("SET statement_timeout = '300000';"))  # 5 minutes
            conn.commit()
        
        gdf.to_postgis(
            name=table_name,
            con=engine,
            if_exists="replace",  # Replace if exists
            index=True,
            index_label="id",
            chunksize=chunk_size
        )
        
        # Create spatial index
        print(f"  → Creating spatial index...")
        with engine.connect() as conn:
            conn.execute(text(f"""
                CREATE INDEX IF NOT EXISTS {table_name}_geom_idx 
                ON {table_name} USING GIST (geometry);
            """))
            conn.commit()
        
        print(f"  ✓ Successfully uploaded {table_name}")
        
        # Show table info (fixed query)
        try:
            with engine.connect() as conn:
                # Get count
                result = conn.execute(text(f"SELECT COUNT(*) as count FROM {table_name};"))
                count = result.fetchone()[0]
                
                # Get geometry info from first row
                result = conn.execute(text(f"""
                    SELECT ST_SRID(geometry) as srid, GeometryType(geometry) as geom_type
                    FROM {table_name}
                    LIMIT 1;
                """))
                row = result.fetchone()
                if row:
                    print(f"  ✓ Verified: count={count:,}, srid={row[0]}, geom_type={row[1]}")
                else:
                    print(f"  ✓ Verified: count={count:,}")
        except Exception as e:
            print(f"  ⚠ Could not verify table info: {e}")
        
        return True
        
    except Exception as e:
        print(f"  ✗ Error uploading {layer_name}: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main upload process"""
    print(f"""
╔═══════════════════════════════════════════════════════════════╗
║  Upload GeoPackage to Supabase PostGIS                        ║
╚═══════════════════════════════════════════════════════════════╝
    """)
    
    if not SUPABASE_DB_URL:
        print("❌ SUPABASE_DB_URL not found in environment")
        return
    
    if not MASTER_GPKG.exists():
        print(f"❌ GeoPackage not found: {MASTER_GPKG}")
        return
    
    print(f"Database: {SUPABASE_DB_URL.split('@')[1]}")
    print(f"GeoPackage: {MASTER_GPKG}")
    print(f"Layers to upload: {len(LAYERS_TO_UPLOAD)}")
    
    # Create database engine with longer timeout
    engine = create_engine(
        SUPABASE_DB_URL,
        connect_args={"options": "-c statement_timeout=300000"}  # 5 minutes
    )
    
    # Test connection
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version(), PostGIS_version();"))
            row = result.fetchone()
            print(f"\n✓ Connected to PostgreSQL")
            print(f"  PostgreSQL: {row[0].split()[0]}")
            print(f"  PostGIS: {row[1]}")
    except Exception as e:
        print(f"\n❌ Database connection failed: {e}")
        return
    
    # Upload each layer
    results = {}
    for layer_name, table_name in LAYERS_TO_UPLOAD.items():
        success = upload_layer(engine, layer_name, table_name, MASTER_GPKG)
        results[layer_name] = success
    
    # Summary
    print(f"\n{'='*60}")
    print("UPLOAD SUMMARY")
    print(f"{'='*60}")
    for layer_name, success in results.items():
        status = "✓" if success else "✗"
        print(f"{status} {layer_name}")
    
    successful = sum(1 for s in results.values() if s)
    print(f"\nTotal: {successful}/{len(results)} layers uploaded successfully")
    
    if successful == len(results):
        print("\n🎉 All layers uploaded successfully!")
        print("\nNext steps:")
        print("1. Update backend code to use PostGIS queries")
        print("2. Remove GeoJSON files from deployment")
        print("3. Test spatial queries with ST_Intersects")
    
    engine.dispose()


if __name__ == "__main__":
    main()
