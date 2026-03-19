"""MCP Tool, Resource, and related models."""
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class MCPToolInputSchema(BaseModel):
    type: str = "object"
    properties: dict[str, Any] = {}
    required: list[str] = []


class MCPTool(BaseModel):
    name: str
    description: str
    input_schema: MCPToolInputSchema

    def to_openai_tool(self) -> dict[str, Any]:
        """Convert to OpenAI function/tool definition."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.input_schema.model_dump(),
            },
        }

    def to_anthropic_tool(self) -> dict[str, Any]:
        """Convert to Anthropic tool definition."""
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema.model_dump(),
        }


class MCPResource(BaseModel):
    uri: str
    name: str
    description: Optional[str] = None
    mime_type: Optional[str] = None


class MCPToolResult(BaseModel):
    tool_name: str
    success: bool
    content: Any
    error: Optional[str] = None
    duration_ms: float = 0.0


class MCPPrompt(BaseModel):
    name: str
    description: Optional[str] = None
    arguments: list[dict[str, Any]] = []
