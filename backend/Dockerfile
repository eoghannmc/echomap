# backend/Dockerfile  (Railway "Root Directory" must be set to: backend)
FROM python:3.11-slim

# System deps for geopandas/pyogrio/proj
RUN apt-get update && apt-get install -y \
    gdal-bin libgdal-dev libspatialindex-dev libproj-dev proj-bin gdal-data proj-data \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# requirements.txt must be in backend/
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend sources (includes app.py, analyses_*.py, utils_*.py, census_api.py, config/)
COPY . .

# Ensure Python can import from /app
ENV PYTHONPATH=/app
ENV PORT=8080
EXPOSE 8080

CMD ["python","-m","uvicorn","app:app","--host","0.0.0.0","--port","8080","--log-level","debug"]
