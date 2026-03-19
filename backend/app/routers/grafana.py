"""Grafana proxy endpoints — dashboards, datasources, alerts."""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Query

from app.middleware.auth_middleware import CurrentUser
from app.services.grafana_client import grafana_client

router = APIRouter(prefix="/api/v1/grafana", tags=["grafana"])


@router.get("/dashboards")
async def search_dashboards(
    current_user: CurrentUser,
    q: Optional[str] = Query(default=None, description="Search query"),
    tag: Optional[str] = Query(default=None, description="Filter by tag"),
    limit: int = Query(default=50, le=200),
) -> list[dict[str, Any]]:
    """Search Grafana dashboards."""
    return await grafana_client.search_dashboards(query=q or "", tag=tag, limit=limit)


@router.get("/dashboards/{uid}")
async def get_dashboard(uid: str, current_user: CurrentUser) -> dict[str, Any]:
    """Get a single Grafana dashboard by UID."""
    return await grafana_client.get_dashboard(uid)


@router.get("/datasources")
async def list_datasources(current_user: CurrentUser) -> list[dict[str, Any]]:
    """List all configured Grafana datasources."""
    return await grafana_client.get_datasources()


@router.get("/alerts")
async def get_alerts(
    current_user: CurrentUser,
    state: str = Query(default="firing"),
) -> list[dict[str, Any]]:
    """Get Grafana alerts filtered by state."""
    return await grafana_client.get_alerts(state=state)
