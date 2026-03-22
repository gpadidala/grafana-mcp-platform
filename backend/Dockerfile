# Stage 1: dependency installation
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY requirements.txt .

# Install into a virtual environment
RUN python -m venv /venv && \
    /venv/bin/pip install --upgrade pip && \
    /venv/bin/pip install --no-cache-dir -r requirements.txt

# Stage 2: runtime image
FROM python:3.12-slim AS runtime

LABEL org.opencontainers.image.title="grafana-mcp-backend" \
      org.opencontainers.image.description="FastAPI LLM Gateway + MCP Proxy" \
      org.opencontainers.image.licenses="Apache-2.0"

WORKDIR /app

# Create non-root user (use a different GID to avoid conflict with nogroup=65534)
RUN groupadd --gid 10001 appgroup && \
    useradd --uid 10001 --gid 10001 --no-create-home --shell /bin/false appuser

# Copy venv from builder
COPY --from=builder /venv /venv

# Copy application code
COPY app/ ./app/

# Ensure non-root ownership
RUN chown -R 10001:10001 /app

USER 10001:10001

ENV PATH="/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/healthz')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
