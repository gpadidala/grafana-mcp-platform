"""Chat streaming endpoint with LLM + MCP tool use."""
from __future__ import annotations

import json
import uuid
from typing import Any

import structlog
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings
from app.middleware.auth_middleware import CurrentUser, get_current_user
from app.models.chat import ChatRequest, ChatStreamEvent
from app.services.llm_gateway import llm_gateway
from app.services.mcp_client import mcp_client

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/v1", tags=["chat"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/chat")
@limiter.limit(f"{settings.rate_limit_chat_per_minute}/minute")
async def chat_stream(
    request: Request,
    body: ChatRequest,
    current_user: CurrentUser,
) -> StreamingResponse:
    """
    Stream a chat completion with LLM + Grafana MCP tool use.

    Returns: text/event-stream with ChatStreamEvent JSON lines.
    """
    request_id = str(uuid.uuid4())[:8]
    user_id = current_user["user_id"]

    log.info(
        "chat.request",
        request_id=request_id,
        user_id=user_id,
        provider=body.provider,
        model=body.model,
        message_count=len(body.messages),
    )

    # Fetch available tools (cached)
    tools = await mcp_client.list_tools() if body.enable_tools else []

    async def event_generator():
        try:
            async for event in llm_gateway.chat_stream(
                provider=body.provider,
                model=body.model,
                messages=body.messages,
                tools=tools,
                temperature=body.temperature,
                max_tokens=body.max_tokens,
                system_prompt=body.system_prompt,
            ):
                yield f"data: {event.model_dump_json()}\n\n"
        except Exception as exc:
            log.error("chat.stream_error", request_id=request_id, error=str(exc))
            error_event = ChatStreamEvent(type="error", message=str(exc))
            yield f"data: {error_event.model_dump_json()}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Request-ID": request_id,
            "X-Accel-Buffering": "no",  # Disable nginx buffering for SSE
        },
    )
