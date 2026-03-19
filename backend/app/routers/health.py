"""Health and readiness check endpoints."""
from __future__ import annotations

import time

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import settings
from app.services.grafana_client import grafana_client
from app.services.mcp_client import mcp_client

router = APIRouter(tags=["health"])

_start_time = time.time()


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    uptime_seconds: float
    grafana: str
    mcp_server: str


@router.get("/healthz", response_model=HealthResponse)
async def liveness() -> HealthResponse:
    """Liveness probe — always 200 if process is alive."""
    grafana_ok = await grafana_client.health()
    mcp_tools = await mcp_client.list_tools()

    return HealthResponse(
        status="ok",
        version=settings.app_version,
        environment=settings.app_env.value,
        uptime_seconds=round(time.time() - _start_time, 1),
        grafana="ok" if grafana_ok else "degraded",
        mcp_server="ok" if mcp_tools else "degraded",
    )


@router.get("/readyz")
async def readiness() -> dict[str, str]:
    """Readiness probe — 200 only when fully ready to serve traffic."""
    return {"status": "ready"}
