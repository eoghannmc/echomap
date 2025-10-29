# Supabase PostGIS Integration

## Overview
Instead of bundling GeoJSON files or downloading a 1.7GB GeoPackage in Docker, we upload spatial data to Supabase PostGIS tables and query directly from the database.

## Architecture

```
┌─────────────┐      ┌─────────────┐      ┌──────────────────┐
│  Frontend   │─────▶│   Backend   │─────▶│ Supabase PostGIS │
│  (Next.js)  │      │  (FastAPI)  │      │   (PostgreSQL)   │
└─────────────┘      └─────────────┘      └──────────────────┘
                            │
                            ▼
                     ┌─────────────┐
                     │ H3 Hexagon  │
                     │  Geometry   │
                     └─────────────┘
                            │
                            ▼
                     ST_Intersects(
                         geometry,
                         h3_polygon
                     )
```

## Benefits

### 1. **Efficient Spatial Queries**
- PostGIS native operations: `ST_Intersects`, `ST_Within`, `ST_Distance`
- GIST spatial indexes for fast lookups
- Database filters data before sending to backend
- Only relevant features returned (not entire datasets)

### 2. **Small Docker Image**
- No data files bundled in image
- No 1.7GB download on startup
- Image size: ~200-500MB instead of 2GB+
- Faster deployments on Railway.com

### 3. **Scalability**
- Database handles concurrent queries
- Connection pooling
- Can scale backend independently of data

### 4. **Real-time Updates**
- Update data without redeploying backend
- Add new layers easily
- Modify geometries on the fly

## Implementation Steps

### Step 1: Upload Data to Supabase

```bash
cd /Users/muimsd/projects/freelance/upwork_eoghann/echomap

# Install required package if not already installed
source .venv/bin/activate
pip install sqlalchemy psycopg2-binary

# Run upload script
python backend/tools/upload_to_supabase_postgis.py
```

This will:
- Read layers from `data_master/master.gpkg`
- Upload to Supabase PostGIS tables
- Create spatial indexes (GIST)
- Convert to WGS84 (EPSG:4326)

### Step 2: Update Backend Code

**Option A: Replace existing analyzers** (comment out GeoJSON code)
```python
# In app.py, use PostGIS analyzer
from .analyses_postgis import PostGISAnalyzer

@lru_cache(maxsize=1)
def get_postgis_analyzer():
    return PostGISAnalyzer()

@app.post("/analyze/zones_h3")
def analyze_zones_h3(req: ZonesReq):
    analyzer = get_postgis_analyzer()
    return analyzer.query_zones(
        center_lon=req.center_lon,
        center_lat=req.center_lat,
        res=req.res,
        k=req.k,
        band_index=req.band_index,
        layer=req.layer,
        zone_codes=req.codes,
        simplify_tolerance_m=req.simplify_tolerance_m,
    )
```

**Option B: Add new endpoints** (keep existing code)
```python
@app.post("/analyze/zones_postgis")
def analyze_zones_postgis(req: ZonesReq):
    # New PostGIS-based endpoint
    ...
```

### Step 3: Update requirements.txt

```txt
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.0
```

### Step 4: Test Queries

```bash
# Test planning zones
curl -X POST http://localhost:8000/analyze/zones_h3 \
  -H "Content-Type: application/json" \
  -d '{
    "center_lat": -37.8136,
    "center_lon": 144.9631,
    "res": 8,
    "k": 4,
    "layer": "planning_zones"
  }'

# Test SA2 boundaries
curl -X POST http://localhost:8000/analyze/zones_h3 \
  -H "Content-Type: application/json" \
  -d '{
    "center_lat": -37.8136,
    "center_lon": 144.9631,
    "res": 8,
    "k": 4,
    "layer": "sa2"
  }'
```

## SQL Query Example

```sql
-- What the backend generates and sends to PostGIS
SELECT *
FROM planning_zones
WHERE ST_Intersects(
    geometry,
    ST_GeomFromText('POLYGON((...))', 4326)
)
AND zone_code IN ('C1Z', 'C2Z')
LIMIT 1500;
```

PostGIS executes this with spatial index:
1. Uses GIST index to find candidate geometries
2. Performs exact ST_Intersects check
3. Filters by zone_code
4. Returns only matching features

## Database Tables

After upload, you'll have these PostGIS tables in Supabase:

| Table Name | Source Layer | Features | Columns |
|------------|--------------|----------|---------|
| `planning_zones` | planning_zones | ~50k | zone_code, geometry |
| `sa2_boundaries` | sa2 | ~300 | sa2_code, sa2_name, geometry |
| `vic_properties` | vic_properties | ~3M | Various property attributes |
| `mesh_blocks` | mesh_blocks | ~50k | Census mesh blocks |
| `metro_stations` | metro_stations | ~200 | Station names, lines |
| `rail_lines` | rail | ~100 | Rail network |
| `lga_boundaries` | lga | ~80 | Local government areas |

Each table has:
- Primary key: `id` (auto-increment)
- Geometry column: `geometry` (WGS84, EPSG:4326)
- Spatial index: `{table_name}_geom_idx` (GIST)

## Performance Comparison

### Current Approach (GeoJSON files)
```
1. Load entire 60MB planning_zones.geojson into memory
2. Apply bbox filter (still loads large file)
3. Clip geometries in Python
4. Convert to GeoJSON
Time: ~2-5 seconds per request
Memory: ~200MB per worker
```

### PostGIS Approach
```
1. Send H3 polygon WKT to database (~1KB)
2. PostGIS uses spatial index to find intersecting features
3. Database returns only relevant geometries
4. Minimal clipping needed in Python
Time: ~100-500ms per request
Memory: ~50MB per worker
```

**Result: 5-10x faster, 75% less memory**

## Deployment Checklist

- [ ] Upload data to Supabase PostGIS
- [ ] Update backend to use `analyses_postgis.py`
- [ ] Add `sqlalchemy` and `psycopg2-binary` to requirements
- [ ] Remove GeoJSON files from deployment (optional)
- [ ] Remove GeoPackage download from startup (optional)
- [ ] Test all endpoints
- [ ] Update RUNNING.md documentation
- [ ] Deploy to Railway.com

## Notes

- **Connection Pooling**: Using `NullPool` to avoid connection issues in serverless
- **SRID 4326**: All data stored in WGS84 for web compatibility
- **Spatial Indexes**: Automatically created for fast queries
- **Geometry Format**: PostGIS handles WKT/WKB/GeoJSON conversion
- **Security**: Use service key for backend, never expose in frontend

## Troubleshooting

### Connection Issues
```python
# Test connection
from sqlalchemy import create_engine, text
engine = create_engine(SUPABASE_DB_URL)
with engine.connect() as conn:
    result = conn.execute(text("SELECT PostGIS_version();"))
    print(result.fetchone())
```

### Check Tables
```sql
-- List all spatial tables
SELECT table_name, type 
FROM geometry_columns;

-- Check table size
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE '%zones%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Verify Spatial Index
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'planning_zones';
```
