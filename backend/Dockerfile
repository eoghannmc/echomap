# backend/Dockerfile (Railway root directory = backend)
FROM pypy:3.10-slim

# System deps for geopandas / pyogrio / rtree / proj (use debian packages)
RUN apt-get update && apt-get install -y \
    gdal-bin libgdal-dev libspatialindex-dev libproj-dev proj-bin gdal-data proj-data \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install Python deps from backend/requirements.txt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend sources (this copies app.py, analyses_*.py, utils_*.py, census_api.py, config/, etc.)
COPY . .

# Ensure Python can import modules from /app
ENV PYTHONPATH=/app
ENV PORT=8080
EXPOSE 8080

# Start FastAPI via Uvicorn on the port Railway will proxy to
CMD ["python","-m","uvicorn","app:app","--host","0.0.0.0","--port","8080","--log-level","debug"]
