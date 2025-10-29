# Railway Deployment Guide

## Prerequisites
✅ Docker image built and tested locally
✅ All PostGIS tables uploaded to Supabase
✅ Railway.toml and Dockerfile configured

## Local Testing Results
- **Planning Zones**: 110 features ✅
- **Mesh Blocks**: 515 features ✅
- **SA2 Boundaries**: 13 features ✅
- **Health Check**: PostGIS connected ✅

## Deploy to Railway

### 1. Push Code to GitHub
```bash
cd /Users/muimsd/projects/freelance/upwork_eoghann/echomap
git add .
git commit -m "Add Railway deployment configuration"
git push origin main
```

### 2. Create Railway Project
1. Go to https://railway.com
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose the `echomap` repository
5. Railway will detect the `Dockerfile` and `railway.toml`

### 3. Set Environment Variables
In Railway dashboard, add these variables:

**Required:**
- `SUPABASE_DB_URL` - PostgreSQL connection string from Supabase
  ```
  postgresql://postgres.PROJECT_REF:PASSWORD@HOST:5432/postgres
  ```
- `SUPABASE_URL` - Your Supabase project URL
  ```
  https://PROJECT_REF.supabase.co
  ```
- `SUPABASE_SERVICE_KEY` - Service role key from Supabase

**Optional:**
- `PORT` - Railway sets this automatically (usually 8000)

### 4. Deploy
1. Railway will automatically build the Docker image
2. Wait for deployment to complete (~5-10 minutes)
3. Railway will provide a public URL (e.g., `https://your-app.up.railway.app`)

### 5. Test Deployment
Once deployed, test the endpoints:

```bash
# Health check
curl https://your-app.up.railway.app/healthz

# Planning zones
curl -X POST https://your-app.up.railway.app/analyze/zones_h3 \
  -H "Content-Type: application/json" \
  -d '{"center_lat": -37.8136, "center_lon": 144.9631, "res": 8, "k": 1}'

# Mesh blocks
curl -X POST https://your-app.up.railway.app/analyze/meshprops_h3 \
  -H "Content-Type: application/json" \
  -d '{"center_lat": -37.8136, "center_lon": 144.9631, "res": 8, "k": 1}'

# SA2 boundaries
curl -X POST https://your-app.up.railway.app/analyze/zones_h3 \
  -H "Content-Type: application/json" \
  -d '{"center_lat": -37.8136, "center_lon": 144.9631, "res": 8, "k": 1, "layer": "sa2"}'
```

### 6. Update Frontend
Update the frontend API URL to point to Railway:

In `frontend/src/components/MapApp.tsx` or environment config:
```typescript
const API_URL = 'https://your-app.up.railway.app';
```

## Architecture
- **Frontend**: Next.js (separate deployment)
- **Backend**: FastAPI on Railway (this deployment)
- **Database**: Supabase PostgreSQL with PostGIS
- **Data Size**: ~2.19GB Docker image (no GeoPackage files needed)

## Benefits of PostGIS Deployment
✅ No 1.7GB data files in container
✅ Instant spatial queries via database
✅ Scalable and production-ready
✅ Easy to update data without redeployment

## Monitoring
- Railway provides automatic monitoring and logs
- Check logs in Railway dashboard for any errors
- Health endpoint: `/healthz` returns PostGIS connection status

## Cost Estimate
- Railway: ~$5-20/month (depending on usage)
- Supabase: Free tier or ~$25/month for Pro
- Total: ~$5-45/month for production-ready deployment
