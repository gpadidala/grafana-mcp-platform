"""MCP tools and resources endpoints."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends

from app.middleware.auth_middleware import CurrentUser
from app.services.mcp_client import mcp_client

router = APIRouter(prefix="/api/v1/mcp", tags=["mcp"])


@router.get("/tools")
async def list_mcp_tools(current_user: CurrentUser) -> list[dict[str, Any]]:
    """Return all available MCP tools with their input schemas."""
    tools = await mcp_client.list_tools()
    return [t.model_dump() for t in tools]


@router.post("/tools/refresh")
async def refresh_mcp_tools(current_user: CurrentUser) -> dict[str, Any]:
    """Force-refresh the cached tool list from the MCP server."""
    tools = await mcp_client.list_tools(force_refresh=True)
    return {"refreshed": True, "tool_count": len(tools)}


@router.get("/resources")
async def list_mcp_resources(current_user: CurrentUser) -> list[dict[str, Any]]:
    """Return all available MCP resources."""
    return await mcp_client.list_resources()
