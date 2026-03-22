"""
MCP Client Service — connects to Grafana MCP Server via SSE transport.
Uses the official Anthropic MCP Python SDK.
"""
from __future__ import annotations

import asyncio
import time
from typing import Any

import structlog

from app.config import settings
from app.models.mcp import MCPTool, MCPToolInputSchema, MCPToolResult

log = structlog.get_logger(__name__)

# Cache TTL for tool list
_TOOL_CACHE_TTL = 60.0


class MCPClientService:
    """
    Async MCP client that connects to the Grafana MCP server.
    Maintains a background task that holds the SSE connection open.
    Falls back to mock tools when the MCP server is unreachable.
    """

    def __init__(self) -> None:
        self._tools: list[MCPTool] = []
        self._tools_last_fetched: float = 0.0
        self._session: Any = None
        self._connected: bool = False
        self._connect_task: asyncio.Task[None] | None = None
        self._session_ready = asyncio.Event()

    async def connect(self) -> None:
        """
        Start a background task that holds the SSE connection open.
        Call this once on app startup from a lifespan event.
        """
        if self._connect_task is None or self._connect_task.done():
            self._connect_task = asyncio.create_task(self._run_session())

    async def _run_session(self) -> None:
        """Background coroutine that keeps the SSE session alive."""
        try:
            from mcp import ClientSession
            from mcp.client.sse import sse_client
        except ImportError:
            log.warning("mcp.sdk_not_installed", fallback="mock_mode")
            self._session = None
            self._session_ready.set()
            return

        while True:
            try:
                log.info("mcp.connecting", url=settings.mcp_server_url)
                async with sse_client(settings.mcp_server_url) as (read, write):
                    async with ClientSession(read, write) as session:
                        await session.initialize()
                        self._session = session
                        self._connected = True
                        self._session_ready.set()
                        log.info("mcp.connected")
                        # Keep alive — yield control back until connection drops
                        while True:
                            await asyncio.sleep(30)
                            # Ping to detect dropped connection
                            try:
                                await session.list_tools()
                            except Exception:
                                break
            except Exception as exc:
                log.warning("mcp.connection_failed", error=str(exc))
                self._connected = False
                self._session = None
                self._session_ready.set()  # unblock waiters — they'll get mock tools
                await asyncio.sleep(10)   # retry after 10s
                self._session_ready.clear()

    async def _wait_for_session(self, timeout: float = 5.0) -> Any:
        """Wait up to `timeout` seconds for the session to be ready."""
        try:
            await asyncio.wait_for(self._session_ready.wait(), timeout=timeout)
        except asyncio.TimeoutError:
            log.warning("mcp.session_wait_timeout")
        return self._session

    async def list_tools(self, force_refresh: bool = False) -> list[MCPTool]:
        """Return cached list of available MCP tools (refreshes every 60s)."""
        now = time.monotonic()
        if not force_refresh and (now - self._tools_last_fetched) < _TOOL_CACHE_TTL:
            return self._tools

        # Ensure background connection is running
        await self.connect()

        session = await self._wait_for_session(timeout=5.0)

        if session is None:
            log.warning("mcp.using_mock_tools")
            self._tools = self._mock_tools()
            self._tools_last_fetched = time.monotonic()
            return self._tools

        try:
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
            self._tools = tools
            self._tools_last_fetched = time.monotonic()
            log.info("mcp.tools_loaded", count=len(tools))
            return self._tools
        except Exception as exc:
            log.error("mcp.list_tools_error", error=str(exc))
            self._tools = self._mock_tools()
            self._tools_last_fetched = time.monotonic()
            return self._tools

    async def call_tool(
        self, name: str, arguments: dict[str, Any]
    ) -> MCPToolResult:
        """Execute a tool on the MCP server and return the result."""
        start = time.monotonic()
        log.info("mcp.call_tool", tool=name, args=arguments)

        session = await self._wait_for_session(timeout=5.0)

        if session is None:
            return MCPToolResult(
                tool_name=name,
                success=False,
                content=None,
                error="MCP server not connected",
                duration_ms=(time.monotonic() - start) * 1000,
            )

        try:
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
        session = await self._wait_for_session(timeout=5.0)
        if session is None:
            return []
        try:
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
        """Return Grafana MCP tools for local dev / when server is unavailable."""
        return [
            MCPTool(
                name="search_dashboards",
                description="Search Grafana dashboards by title or tag",
                input_schema=MCPToolInputSchema(
                    properties={
                        "query": {"type": "string", "description": "Search query"},
                        "tag": {"type": "string", "description": "Dashboard tag filter"},
                    },
                ),
            ),
            MCPTool(
                name="query_datasource",
                description="Execute PromQL/LogQL/TraceQL query against a Grafana datasource",
                input_schema=MCPToolInputSchema(
                    properties={
                        "datasource_uid": {"type": "string", "description": "Datasource UID"},
                        "query": {"type": "string", "description": "Query expression"},
                        "from": {"type": "string", "default": "now-1h"},
                        "to": {"type": "string", "default": "now"},
                    },
                    required=["datasource_uid", "query"],
                ),
            ),
            MCPTool(
                name="get_alerts",
                description="Get active Grafana alert rules and their states",
                input_schema=MCPToolInputSchema(
                    properties={
                        "state": {"type": "string", "enum": ["firing", "normal", "pending"]},
                        "folder": {"type": "string", "description": "Alert folder name"},
                    },
                ),
            ),
            MCPTool(
                name="get_datasources",
                description="List all configured Grafana datasources",
                input_schema=MCPToolInputSchema(properties={}),
            ),
            MCPTool(
                name="get_dashboard",
                description="Get a Grafana dashboard by UID",
                input_schema=MCPToolInputSchema(
                    properties={"uid": {"type": "string", "description": "Dashboard UID"}},
                    required=["uid"],
                ),
            ),
            MCPTool(
                name="list_incidents",
                description="List Grafana Incident records",
                input_schema=MCPToolInputSchema(
                    properties={
                        "status": {"type": "string", "enum": ["active", "resolved"]},
                        "limit": {"type": "integer", "default": 10},
                    },
                ),
            ),
        ]

    @property
    def is_connected(self) -> bool:
        return self._connected


# Singleton instance
mcp_client = MCPClientService()
