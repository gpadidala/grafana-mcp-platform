"""
FastAPI application entry point.
Grafana MCP Platform — LLM Gateway + MCP Proxy backend.
"""
from __future__ import annotations

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address

from app.config import settings
from app.routers import auth, chat, grafana, health, mcp

# ── Structured logging ────────────────────────────────────────────────────────
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.JSONRenderer(),
    ]
)
log = structlog.get_logger(__name__)

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="Grafana MCP Platform API",
    description="LLM Gateway + MCP Proxy for the Grafana observability stack",
    version=settings.app_version,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# ── Middleware ─────────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    """Log every request with method, path, and status."""
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        method=request.method,
        path=request.url.path,
        env=settings.app_env.value,
        version=settings.app_version,
    )
    response = await call_next(request)
    log.info("http.request", status=response.status_code)
    return response


# ── Prometheus metrics ─────────────────────────────────────────────────────────
Instrumentator(
    should_group_status_codes=False,
    should_ignore_untemplated=True,
    should_respect_env_var=True,
    should_instrument_requests_inprogress=True,
    excluded_handlers=["/healthz", "/readyz", "/metrics"],
).instrument(app).expose(app, endpoint="/metrics", tags=["monitoring"])

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(mcp.router)
app.include_router(grafana.router)


@app.on_event("startup")
async def startup_event() -> None:
    log.info(
        "app.startup",
        name=settings.app_name,
        version=settings.app_version,
        env=settings.app_env.value,
        mcp_url=settings.mcp_server_url,
        grafana_url=settings.grafana_url,
    )


@app.on_event("shutdown")
async def shutdown_event() -> None:
    from app.services.grafana_client import grafana_client
    await grafana_client.close()
    log.info("app.shutdown")
