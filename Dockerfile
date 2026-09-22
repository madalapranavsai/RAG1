# Stage 1: Build the React frontend with Vite
FROM node:22-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend runtime
FROM python:3.12-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PORT=8000

WORKDIR /app

# Install minimal build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the FastEmbed MiniLM model inside the container image for fast cold starts
RUN python3 -c "from fastembed import TextEmbedding; TextEmbedding('sentence-transformers/all-MiniLM-L6-v2')"

# Copy application source code and evaluation benchmark
COPY app/ ./app/
COPY evals/ ./evals/
COPY templates/ ./templates/
RUN mkdir -p static

# Copy compiled React distribution from frontend-builder
COPY --from=frontend-builder /frontend/dist ./frontend/dist

EXPOSE 8000

# Start FastAPI server using uvicorn
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
