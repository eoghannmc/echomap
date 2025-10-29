# Running EchoMap - Complete Setup Guide

This project consists of three main components:
1. **Frontend**: Next.js 16 app (React 19) on port 3000
2. **Server**: Node.js/TypeScript Express API on port 4000
3. **Backend**: Python FastAPI spatial analysis service on port 8000

---

## System Requirements

### Node.js Environment
- **Node.js**: 20.x (required by `server/package.json`)
- **npm**: comes with Node (or use yarn/pnpm)
- **System**: Xcode Command Line Tools (macOS)
  ```bash
  xcode-select --install
  ```

### Python Environment
- **Python**: 3.10+ (3.11 or 3.12 recommended; 3.13 may have wheel compatibility issues)
- **System packages** (macOS via Homebrew):
  ```bash
  brew update
  brew install gdal proj geos spatialindex
  ```
- **Recommended**: Use `conda`/`mamba` for easier geospatial package management:
  ```bash
  # Install mambaforge from https://github.com/conda-forge/miniforge
  conda create -n echomap python=3.11
  conda activate echomap
  conda install -c conda-forge geopandas pyogrio pyproj shapely rtree h3 uvicorn fastapi pandas pyyaml python-dotenv
  ```

### Data Files
- **Backend requires**: `data_master/master.gpkg` with layers:
  - `metro_stations`
  - `regional_stations`
  - `mesh_blocks`
  - `vic_properties`
  - `planning_zones`
  - `pois`
  - `sa2`
  
  If missing, the backend will start but endpoints will return HTTP 500 errors on first request (lazy initialization will fail with a clear error message).

---

## Installation & Running

### Option A: Run All Components (Recommended for Development)

#### 1. Install Node Dependencies
```bash
# From repo root
npm install

# Install frontend packages
cd frontend && npm install && cd ..

# Install server packages
cd server && npm install && cd ..
```

#### 2. Set Up Python Backend
```bash
# Using venv (if you prefer pip)
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r backend/requirements.txt

# OR using conda (recommended)
conda create -n echomap python=3.11
conda activate echomap
conda install -c conda-forge geopandas pyogrio pyproj shapely rtree h3 uvicorn fastapi pandas pyyaml python-dotenv
pip install -r backend/requirements.txt  # for any remaining packages
```

#### 3. Start All Services

**Terminal 1 - Frontend & Node Server:**
```bash
# From repo root
npm run dev
```
This starts:
- Next.js dev server on port 3000
- TypeScript compilation watch for server
- Node Express server on port 4000 (via nodemon)

**Terminal 2 - Python Backend:**
```bash
# Activate venv or conda
source .venv/bin/activate  # or: conda activate echomap

# Run from repo root
uvicorn backend.app:app --reload --port 8000
```

**Access the app:**
- Frontend: http://localhost:3000
- Node API: http://localhost:4000
- Python API: http://localhost:8000
- Health check: http://localhost:8000/healthz

---

### Option B: Run Components Separately

#### Frontend Only
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
```

#### Server Only
```bash
cd server
npm install
npm run build  # compile TypeScript
npm start      # runs compiled JS
# Runs on http://localhost:4000 (default)
```

#### Backend Only
```bash
# Activate Python environment
source .venv/bin/activate  # or: conda activate echomap

# From repo root
uvicorn backend.app:app --reload --port 8000
# Runs on http://localhost:8000
```

---

## Environment Variables

### Backend (`backend/.env`)
Create `backend/.env` with:
```env
# Optional: path to master catalog YAML (default: config/master_catalog.yaml)
MASTER_CATALOG_PATH=backend/config/master_catalog.yaml

# Optional: bootstrap data from Supabase on startup (default: false)
BOOTSTRAP_FROM_SUPABASE=false

# Optional: CORS allowed origins (default: *)
CORS_ALLOW_ORIGINS=http://localhost:3000,http://localhost:4000

# If using Supabase storage sync:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
RAW_BUCKET=raw-master
RAW_GPKG_PATH=master.gpkg
RAW_CENSUS_PREFIX=census/clean/
LOCAL_DATA_BASE=data_master
```

### Server (`server/.env`)
Create `server/.env` with:
```env
# Optional: data directory (default: ../data)
DATA_ROOT=/path/to/data

# Optional: server port (default: 4000)
PORT=4000
```

---

## Production Build

```bash
# Build frontend
cd frontend
npm run build
npm run start  # production server on port 3000

# Build server
cd server
npm run build
npm start      # runs compiled server/dist/index.js

# Backend (no build step needed)
uvicorn backend.app:app --host 0.0.0.0 --port 8000
```

---

## Troubleshooting

### Backend: ModuleNotFoundError for `analyses_*`
- **Cause**: Running `uvicorn app:app` instead of `uvicorn backend.app:app`
- **Fix**: Always run from repo root with package path: `uvicorn backend.app:app`

### Backend: Import errors with geopandas/pyogrio/rtree
- **Cause**: Missing system libraries or Python 3.13 incompatibility
- **Fix**: 
  1. Install system deps: `brew install gdal proj geos spatialindex`
  2. Use Python 3.11: `conda create -n echomap python=3.11`
  3. Install via conda-forge: `conda install -c conda-forge geopandas pyogrio`

### Backend: RuntimeError on `/analyze/*` endpoints
- **Cause**: `data_master/master.gpkg` missing or incomplete
- **Fix**: 
  - Obtain or generate the geopackage file
  - Place at `data_master/master.gpkg`
  - Ensure it contains required layers (metro_stations, regional_stations, etc.)

### Frontend: `npm run dev` fails
- **Cause**: Node version mismatch or missing dependencies
- **Fix**:
  1. Check Node version: `node -v` (should be 20.x)
  2. Re-install: `rm -rf node_modules package-lock.json && npm install`

### Server: better-sqlite3 build errors
- **Cause**: Missing Xcode Command Line Tools or node-gyp issues
- **Fix**: 
  1. Install tools: `xcode-select --install`
  2. Clean rebuild: `cd server && rm -rf node_modules && npm install`

---

## Architecture Notes

### Monorepo Structure
This is a monorepo with multiple packages:
- `frontend/` - Next.js app
- `server/` - Node.js Express API
- `backend/` - Python FastAPI service (separate from Node `server/`)
- `app/` - Shared Next.js pages (deprecated, use `frontend/`)

### Backend: Lazy Initialization
The Python backend uses lazy initialization:
- Analyzers are NOT loaded on import (prevents startup failures)
- Each analyzer class is instantiated on first request via `@lru_cache` factories
- `get_trains()`, `get_meshprops()`, `get_pois()`, `get_zones()` create singletons
- If data files are missing, first request returns HTTP 500 with clear error

### Backend: Relative Imports
Because `backend/` is a package within the monorepo (not a standalone package), it uses:
- Relative imports: `from .analyses_trains_h3 import TrainAnalysisH3`
- Package invocation: `uvicorn backend.app:app` (not `uvicorn app:app`)
- This differs from the standalone `echoapp-backend` repo which uses absolute imports

---

## Next Steps

- [ ] Generate or obtain `data_master/master.gpkg` if missing
- [ ] Configure environment variables in `backend/.env` and `server/.env`
- [ ] Set up Supabase connection (optional, if using remote data storage)
- [ ] Add development convenience scripts to root `package.json`
- [ ] Update main `README.md` with this running guide

---

## Quick Reference

```bash
# Install everything
npm install && cd frontend && npm install && cd ../server && npm install && cd ..
python3 -m venv .venv && source .venv/bin/activate && pip install -r backend/requirements.txt

# Start dev (2 terminals)
npm run dev                                    # Terminal 1: frontend + server
uvicorn backend.app:app --reload --port 8000  # Terminal 2: backend

# Check health
curl http://localhost:8000/healthz

# Run tests (if available)
npm test
```
