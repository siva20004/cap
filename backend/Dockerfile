FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend and data
COPY backend /app/backend
COPY data /app/data
COPY ml /app/ml
COPY scripts /app/scripts
COPY experiments /app/experiments
COPY .env.example /app/.env

WORKDIR /app/backend

ENV PYTHONPATH=/app/backend:/app
EXPOSE 8000

CMD ["sh", "-c", "alembic upgrade head && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"]
