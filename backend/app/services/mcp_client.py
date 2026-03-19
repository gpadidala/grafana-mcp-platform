"""
MCP Client Service — connects to Grafana MCP Server via SSE transport.
Uses the official Anthropic MCP Python SDK.
"""
from __future__ import annotations

import asyncio
import time
from typing import Any, Optional

import structlog
from tenacity import (
    AsyncRetrying,
    RetryError,
    stop_after_attempt,
    wait_exponential,
)

from app.config import settings
from app.models.mcp import MCPTool, MCPToolInputSchema, MCPToolResult

log = structlog.get_logger(__name__)

# Cache TTL for tool list
_TOOL_CACHE_TTL = 60.0


class MCPClientService:
    """
    Async MCP client that maintains a connection to the Grafana MCP server.
    Implements tool listing, resource listing, and tool execution.
    """

    def __init__(self) -> None:
        self._tools: list[MCPTool] = []
        self._tools_last_fetched: float = 0.0
        self._session: Any = None  # mcp.ClientSession
        self._lock = asyncio.Lock()

    async def _get_session(self) -> Any:
        """Return a live MCP ClientSession, creating one if needed."""
        try:
            # Lazy import — mcp package may not be available in unit tests
            from mcp import ClientSession
            from mcp.client.sse import sse_client

            if self._session is None:
                async with self._lock:
                    if self._session is None:
                        log.info("mcp.connecting", url=settings.mcp_server_url)
                        async with sse_client(settings.mcp_server_url) as (read, write):
                            self._session = ClientSession(read, write)
                            await self._session.initialize()
                            log.info("mcp.connected")
        except ImportError:
            log.warning("mcp.sdk_not_installed", fallback="mock_mode")
        return self._session

    async def list_tools(self, force_refresh: bool = False) -> list[MCPTool]:
        """Return cached list of available MCP tools (refreshes every 60s)."""
        now = time.monotonic()
        if not force_refresh and (now - self._tools_last_fetched) < _TOOL_CACHE_TTL:
            return self._tools

        async def _fetch() -> list[MCPTool]:
            session = await self._get_session()
            if session is None:
                return self._mock_tools()
            result = await session.list_tools()
            tools = []
            for t in result.tools:
                schema = MCPToolInputSchema(
                    type=getattr(t.inputSchema, "type", "object"),
                    properties=getattr(t.inputSchema, "properties", {}),
                    required=getattr(t.inputSchema, "required", []),
                )
                tools.append(MCPTool(
                    name=t.name,
                    description=t.description or "",
                    input_schema=schema,
                ))
            return tools

        try:
            async for attempt in AsyncRetrying(
                stop=stop_after_attempt(settings.mcp_max_retries),
                wait=wait_exponential(
                    multiplier=settings.mcp_retry_delay, min=1, max=10
                ),
            ):
                with attempt:
                    self._tools = await _fetch()
                    self._tools_last_fetched = time.monotonic()
        except RetryError:
            log.error("mcp.list_tools_failed", retries=settings.mcp_max_retries)
            self._tools = self._mock_tools()

        return self._tools

    async def call_tool(
        self, name: str, arguments: dict[str, Any]
    ) -> MCPToolResult:
        """Execute a tool on the MCP server and return the result."""
        start = time.monotonic()
        log.info("mcp.call_tool", tool=name, args=arguments)

        try:
            session = await self._get_session()
            if session is None:
                return MCPToolResult(
                    tool_name=name,
                    success=False,
                    content=None,
                    error="MCP session not available",
                    duration_ms=(time.monotonic() - start) * 1000,
                )

            result = await session.call_tool(name, arguments)
            content = [c.text for c in result.content if hasattr(c, "text")]
            duration_ms = (time.monotonic() - start) * 1000
            log.info("mcp.tool_success", tool=name, duration_ms=duration_ms)
            return MCPToolResult(
                tool_name=name,
                success=not result.isError,
                content=content[0] if len(content) == 1 else content,
                error=None if not result.isError else str(content),
                duration_ms=duration_ms,
            )

        except Exception as exc:
            duration_ms = (time.monotonic() - start) * 1000
            log.error("mcp.tool_error", tool=name, error=str(exc))
            return MCPToolResult(
                tool_name=name,
                success=False,
                content=None,
                error=str(exc),
                duration_ms=duration_ms,
            )

    async def list_resources(self) -> list[dict[str, Any]]:
        """List available MCP resources."""
        try:
            session = await self._get_session()
            if session is None:
                return []
            result = await session.list_resources()
            return [
                {
                    "uri": str(r.uri),
                    "name": r.name,
                    "description": getattr(r, "description", None),
                    "mime_type": getattr(r, "mimeType", None),
                }
                for r in result.resources
            ]
        except Exception as exc:
            log.error("mcp.list_resources_error", error=str(exc))
            return []

    def _mock_tools(self) -> list[MCPTool]:
        """Return minimal mock tools for local dev when MCP server is unavailable."""
        return [
            MCPTool(
                name="search_dashboards",
                description="Search Grafana dashboards by title or tag",
                input_schema=MCPToolInputSchema(
                    properties={
                        "query": {"type": "string", "description": "Search query"},
                        "tag": {"type": "string", "description": "Dashboard tag"},
                    },
                ),
            ),
            MCPTool(
                name="query_datasource",
                description="Execute a query against a Grafana datasource",
                input_schema=MCPToolInputSchema(
                    properties={
                        "datasource_uid": {"type": "string"},
                        "query": {"type": "string"},
                        "from": {"type": "string", "default": "now-1h"},
                        "to": {"type": "string", "default": "now"},
                    },
                    required=["datasource_uid", "query"],
                ),
            ),
            MCPTool(
                name="get_alerts",
                description="Get active Grafana alerts",
                input_schema=MCPToolInputSchema(
                    properties={
                        "state": {"type": "string", "enum": ["firing", "normal", "pending"]},
                    },
                ),
            ),
        ]


# Singleton instance
mcp_client = MCPClientService()
