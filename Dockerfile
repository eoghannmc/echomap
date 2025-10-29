# EchoApp Backend — Dockerfile (Ubuntu + GDAL)
# ==============================================
FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Set working directory
WORKDIR /app

# Install Python and build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-dev \
    python3-pip \
    gdal-bin \
    libgdal-dev \
    libspatialindex-dev \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set GDAL environment variables
ENV GDAL_CONFIG=/usr/bin/gdal-config
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

# Create symlinks for python3.11
RUN ln -sf /usr/bin/python3.11 /usr/bin/python3 && \
    ln -sf /usr/bin/python3.11 /usr/bin/python

# Copy requirements first for better caching
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy config directory
COPY backend/config/ ./backend/config/

# Expose port (Railway will set PORT env var)
EXPOSE 8000

# Run the application
CMD ["sh", "-c", "uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
