"""Chat request/response models."""
from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


class MessageRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class Message(BaseModel):
    role: MessageRole
    content: str
    tool_call_id: Optional[str] = None
    tool_calls: Optional[list[dict[str, Any]]] = None


class ChatRequest(BaseModel):
    messages: list[Message]
    provider: str = "openai"
    model: str = "gpt-4o"
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=4096, ge=1, le=128000)
    system_prompt: Optional[str] = None
    context_dashboards: list[str] = Field(default_factory=list)
    enable_tools: bool = True
    session_id: Optional[str] = None


class ToolCallInfo(BaseModel):
    id: str
    tool_name: str
    arguments: dict[str, Any]
    result: Optional[Any] = None
    error: Optional[str] = None
    duration_ms: Optional[float] = None


class ChatStreamEvent(BaseModel):
    type: str  # text_delta | tool_call_start | tool_call_result | done | error
    content: Optional[str] = None
    tool: Optional[str] = None
    args: Optional[dict[str, Any]] = None
    result: Optional[Any] = None
    message: Optional[str] = None
    usage: Optional[dict[str, int]] = None


class ChatResponse(BaseModel):
    id: str
    provider: str
    model: str
    messages: list[Message]
    tool_calls: list[ToolCallInfo] = Field(default_factory=list)
    usage: Optional[dict[str, int]] = None
