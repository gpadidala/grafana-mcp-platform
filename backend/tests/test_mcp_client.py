"""MCP Client service tests."""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch

from app.services.mcp_client import MCPClientService


@pytest.mark.asyncio
async def test_list_tools_returns_mock_when_no_server():
    """When MCP server is unreachable, should return mock tools."""
    client = MCPClientService()
    # Force cache miss and no session
    client._tools_last_fetched = 0
    tools = await client.list_tools()
    assert len(tools) > 0
    assert all(hasattr(t, "name") for t in tools)
    assert all(hasattr(t, "description") for t in tools)


@pytest.mark.asyncio
async def test_list_tools_caching():
    """Second call within TTL should use cache."""
    client = MCPClientService()
    tools1 = await client.list_tools()
    tools2 = await client.list_tools()
    assert tools1 is tools2  # Same object from cache


@pytest.mark.asyncio
async def test_call_tool_handles_no_session():
    """Should return error result gracefully when session is unavailable."""
    client = MCPClientService()
    result = await client.call_tool("search_dashboards", {"query": "test"})
    # No session available → should not raise, returns MCPToolResult
    assert result.tool_name == "search_dashboards"
    assert not result.success or result.content is not None


def test_mock_tools_have_correct_schema():
    client = MCPClientService()
    tools = client._mock_tools()
    for tool in tools:
        assert tool.name
        assert tool.description
        assert tool.input_schema.type == "object"
