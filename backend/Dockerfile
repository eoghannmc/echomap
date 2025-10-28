# ==============================================
# EchoApp Backend — Dockerfile (root level)
# ==============================================
# Base image with Python 3.11
FROM python:3.11-slim

# ------------------------------------------------
# 1. Install system dependencies for GeoPandas,
#    Pyogrio, and GeoPackage (SQLite / SpatiaLite)
# ------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin \
    libgdal-dev \
    libsqlite3-0 \
    sqlite3 \
    libspatialite7 \
    libspatialindex-dev \
    libproj-dev \
    proj-bin \
    gdal-data \
    proj-data \
 && rm -rf /var/lib/apt/lists/*

# ------------------------------------------------
# 2. Create working directory
# ------------------------------------------------
WORKDIR /app

# ------------------------------------------------
# 3. Upgrade pip and tooling
# ------------------------------------------------
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# ------------------------------------------------
# 4. Install Python dependencies
# ------------------------------------------------
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ------------------------------------------------
# 5. Copy backend source code into container
# ------------------------------------------------
# Make sure your repo root contains:
#   app.py, analyses_*.py, utils_*.py,
#   census_api.py, storage_sync.py,
#   config/master_catalog.yaml, Dockerfile, requirements.txt
COPY . .

# ------------------------------------------------
# 6. Environment and startup configuration
# ------------------------------------------------
ENV PYTHONPATH=/app
ENV PORT=8080
EXPOSE 8080

# ------------------------------------------------
# 7. Run the FastAPI app via Uvicorn
# ------------------------------------------------
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080", "--log-level", "debug"]
