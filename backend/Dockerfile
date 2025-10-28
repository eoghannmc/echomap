FROM python:3.11-slim

# System deps for geopandas / pyogrio / rtree / proj
RUN apt-get update && apt-get install -y \
    gdal-bin libgdal-dev libspatialindex-dev libproj-dev proj-bin gdal-data proj-data \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# copy backend sources
COPY backend/ .
# copy config (for master_catalog.yaml)
COPY config/ ./config/

ENV PYTHONPATH=/app
ENV PORT=8080
EXPOSE 8080

CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080", "--log-level", "debug"]
