# ECHO Map - Victoria

Interactive mapping application for Victorian planning zones, property parcels, mesh blocks, and SA2 boundaries.

## Tech Stack

- **Frontend**: Next.js 16 + React 19 + MapLibre GL + TypeScript
- **Backend**: FastAPI (Python) + PostGIS + Supabase
- **Database**: PostgreSQL with PostGIS extensions

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Access to Supabase database (configured in backend/.env)

### Backend Setup

1. **Navigate to backend directory and activate virtual environment:**
   ```bash
   cd backend
   source .venv/bin/activate
   ```

2. **Install Python dependencies (if not already installed):**
   ```bash
   pip install -r requirements.txt
   ```

3. **Create `.env` file in `backend/` directory with:**
   ```
   SUPABASE_DB_URL=your_supabase_db_url
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_KEY=your_service_key
   ```

4. **Start the backend server from the repo root:**
   ```bash
   cd ..
   source backend/.venv/bin/activate
   uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
   ```

   The backend API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env.local` file in `frontend/` directory with:**
   ```
   NEXT_PUBLIC_API_BASE=http://localhost:8000
   NEXT_PUBLIC_MAPTILER_KEY=your_maptiler_key
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser

## Running Both Servers

**Terminal 1 - Backend:**
```bash
cd /path/to/echomap
source backend/.venv/bin/activate
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd /path/to/echomap/frontend
npm run dev
```

## Features

- **Planning Zones**: Victorian planning zone boundaries with comprehensive color coding
- **Property Parcels**: Property boundary data with red outlines
- **Mesh Blocks**: Census mesh block boundaries with orange outlines
- **SA2 Boundaries**: Statistical Area Level 2 boundaries with random green patterns
- **Export**: DXF, PDF, CSV, and GeoJSON export with proper projection (GDA2020 MGA Zone 55)

## Project Structure

```
echomap/
├── backend/              # FastAPI backend
│   ├── app.py           # Main FastAPI application
│   ├── analyses_*.py    # PostGIS query handlers
│   ├── requirements.txt # Python dependencies
│   └── .venv/           # Python virtual environment
├── frontend/            # Next.js frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── lib/         # Utilities and export functions
│   │   └── app/         # Next.js app router
│   └── public/          # Static assets
└── data_master/         # Master data and catalog
```

## Deployment

- **Frontend**: Configured for Vercel deployment
- **Backend**: Configured for Railway deployment

See `RAILWAY_DEPLOYMENT.md` in the backend directory for deployment instructions.

## License

Proprietary - Echo Map Victoria 2025
