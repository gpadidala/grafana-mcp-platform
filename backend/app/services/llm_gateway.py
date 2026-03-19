"""
LLM Gateway Service — unified multi-provider streaming LLM interface.
Supports: OpenAI, Anthropic, Azure OpenAI, Google Gemini, Ollama, OpenAI-compatible.
Implements agentic tool-use loop (ReAct pattern).
"""
from __future__ import annotations

import json
import time
from collections.abc import AsyncGenerator
from typing import Any, Optional

import structlog

from app.config import settings
from app.models.chat import ChatStreamEvent, Message, MessageRole
from app.models.llm import LLMProvider
from app.models.mcp import MCPTool
from app.services.mcp_client import mcp_client

log = structlog.get_logger(__name__)

DEFAULT_SYSTEM_PROMPT = """You are an expert observability engineer and SRE with access to a \
Grafana instance. You can use the provided tools to query dashboards, metrics, logs, traces, \
and alerts. When the user asks about system health, incidents, or metrics, proactively use the \
available tools to retrieve real data. Always cite which dashboard, datasource, or query you \
used in your response. Be concise and actionable."""

# Strip prompt injection tokens before sending to LLM
_INJECTION_TOKENS = [
    "<|im_start|>", "<|im_end|>", "[INST]", "[/INST]",
    "<<SYS>>", "<</SYS>>", "<|endoftext|>",
]


def _sanitize_input(text: str) -> str:
    for token in _INJECTION_TOKENS:
        text = text.replace(token, "")
    return text.strip()


class LLMGateway:
    """
    Unified LLM gateway that:
    1. Accepts a provider + model + messages
    2. Streams responses as ChatStreamEvent
    3. Handles tool calls via MCP client (agentic loop)
    4. Enforces max_tool_iterations guard
    """

    async def chat_stream(
        self,
        provider: str,
        model: str,
        messages: list[Message],
        tools: list[MCPTool],
        temperature: float = 0.7,
        max_tokens: int = 4096,
        system_prompt: Optional[str] = None,
    ) -> AsyncGenerator[ChatStreamEvent, None]:
        """Yield ChatStreamEvents for a streaming LLM conversation with tool use."""
        effective_system = system_prompt or DEFAULT_SYSTEM_PROMPT

        # Sanitize all user inputs
        sanitized_messages = []
        for msg in messages:
            sanitized_messages.append(Message(
                role=msg.role,
                content=_sanitize_input(msg.content) if msg.role == MessageRole.USER
                else msg.content,
                tool_call_id=msg.tool_call_id,
                tool_calls=msg.tool_calls,
            ))

        llm_provider = LLMProvider(provider)
        dispatch = {
            LLMProvider.OPENAI: self._stream_openai,
            LLMProvider.ANTHROPIC: self._stream_anthropic,
            LLMProvider.AZURE_OPENAI: self._stream_azure,
            LLMProvider.GOOGLE_GEMINI: self._stream_gemini,
            LLMProvider.OLLAMA: self._stream_ollama,
            LLMProvider.OPENAI_COMPATIBLE: self._stream_openai_compatible,
        }

        stream_fn = dispatch.get(llm_provider)
        if stream_fn is None:
            yield ChatStreamEvent(type="error", message=f"Unsupported provider: {provider}")
            return

        async for event in stream_fn(
            model=model,
            messages=sanitized_messages,
            tools=tools,
            temperature=temperature,
            max_tokens=max_tokens,
            system_prompt=effective_system,
        ):
            yield event

    # ── OpenAI / Azure / Ollama / OpenAI-compatible ───────────────────────────

    async def _stream_openai(
        self,
        model: str,
        messages: list[Message],
        tools: list[MCPTool],
        temperature: float,
        max_tokens: int,
        system_prompt: str,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
    ) -> AsyncGenerator[ChatStreamEvent, None]:
        from openai import AsyncOpenAI

        client = AsyncOpenAI(
            api_key=api_key or settings.openai_api_key,
            base_url=base_url or settings.openai_base_url,
        )

        oai_messages = [{"role": "system", "content": system_prompt}]
        oai_messages += [
            {"role": m.role.value, "content": m.content,
             **({"tool_call_id": m.tool_call_id} if m.tool_call_id else {}),
             **({"tool_calls": m.tool_calls} if m.tool_calls else {})}
            for m in messages
        ]
        oai_tools = [t.to_openai_tool() for t in tools] if tools else None

        iteration = 0
        total_input_tokens = 0
        total_output_tokens = 0

        while iteration < settings.max_tool_iterations:
            iteration += 1
            collected_tool_calls: list[dict[str, Any]] = []
            collected_text = ""

            kwargs: dict[str, Any] = dict(
                model=model,
                messages=oai_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True,
            )
            if oai_tools:
                kwargs["tools"] = oai_tools

            async with client.beta.chat.completions.stream(**kwargs) if hasattr(
                client.beta.chat.completions, "stream"
            ) else _openai_stream_ctx(client, kwargs) as stream:
                async for chunk in stream:
                    choice = chunk.choices[0] if chunk.choices else None
                    if not choice:
                        continue
                    delta = choice.delta

                    # Stream text tokens
                    if delta.content:
                        collected_text += delta.content
                        yield ChatStreamEvent(type="text_delta", content=delta.content)

                    # Collect tool calls
                    if delta.tool_calls:
                        for tc in delta.tool_calls:
                            idx = tc.index
                            while len(collected_tool_calls) <= idx:
                                collected_tool_calls.append(
                                    {"id": "", "type": "function",
                                     "function": {"name": "", "arguments": ""}}
                                )
                            if tc.id:
                                collected_tool_calls[idx]["id"] = tc.id
                            if tc.function.name:
                                collected_tool_calls[idx]["function"]["name"] += tc.function.name
                            if tc.function.arguments:
                                collected_tool_calls[idx]["function"]["arguments"] += (
                                    tc.function.arguments
                                )

                    if chunk.usage:
                        total_input_tokens += chunk.usage.prompt_tokens or 0
                        total_output_tokens += chunk.usage.completion_tokens or 0

            # Execute tool calls if any
            if not collected_tool_calls:
                break

            # Add assistant message with tool calls
            oai_messages.append({
                "role": "assistant",
                "content": collected_text or None,
                "tool_calls": collected_tool_calls,
            })

            # Execute each tool and stream events
            for tc in collected_tool_calls:
                tool_name = tc["function"]["name"]
                try:
                    tool_args = json.loads(tc["function"]["arguments"])
                except json.JSONDecodeError:
                    tool_args = {}

                yield ChatStreamEvent(
                    type="tool_call_start", tool=tool_name, args=tool_args
                )

                start_ms = time.monotonic()
                result = await mcp_client.call_tool(tool_name, tool_args)
                duration_ms = (time.monotonic() - start_ms) * 1000

                yield ChatStreamEvent(
                    type="tool_call_result",
                    tool=tool_name,
                    result={"content": result.content, "success": result.success,
                            "duration_ms": duration_ms},
                )

                # Feed result back
                oai_messages.append({
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": json.dumps(result.content) if result.success
                    else f"Error: {result.error}",
                })

        yield ChatStreamEvent(
            type="done",
            usage={"input_tokens": total_input_tokens, "output_tokens": total_output_tokens},
        )

    async def _stream_azure(
        self,
        model: str,
        messages: list[Message],
        tools: list[MCPTool],
        temperature: float,
        max_tokens: int,
        system_prompt: str,
    ) -> AsyncGenerator[ChatStreamEvent, None]:
        from openai import AsyncAzureOpenAI

        client = AsyncAzureOpenAI(
            api_key=settings.azure_openai_api_key,
            azure_endpoint=settings.azure_openai_endpoint,
            api_version=settings.azure_openai_api_version,
        )
        # Re-use OpenAI streaming logic with Azure client
        async for event in self._stream_openai(
            model=settings.azure_openai_deployment or model,
            messages=messages,
            tools=tools,
            temperature=temperature,
            max_tokens=max_tokens,
            system_prompt=system_prompt,
            api_key=settings.azure_openai_api_key,
        ):
            yield event

    async def _stream_ollama(
        self,
        model: str,
        messages: list[Message],
        tools: list[MCPTool],
        temperature: float,
        max_tokens: int,
        system_prompt: str,
    ) -> AsyncGenerator[ChatStreamEvent, None]:
        async for event in self._stream_openai(
            model=model,
            messages=messages,
            tools=tools,
            temperature=temperature,
            max_tokens=max_tokens,
            system_prompt=system_prompt,
            base_url=f"{settings.ollama_base_url}/v1",
            api_key="ollama",
        ):
            yield event

    async def _stream_openai_compatible(
        self,
        model: str,
        messages: list[Message],
        tools: list[MCPTool],
        temperature: float,
        max_tokens: int,
        system_prompt: str,
    ) -> AsyncGenerator[ChatStreamEvent, None]:
        async for event in self._stream_openai(
            model=model,
            messages=messages,
            tools=tools,
            temperature=temperature,
            max_tokens=max_tokens,
            system_prompt=system_prompt,
            base_url=settings.openai_compatible_base_url,
            api_key=settings.openai_compatible_api_key or "none",
        ):
            yield event

    # ── Anthropic ──────────────────────────────────────────────────────────────

    async def _stream_anthropic(
        self,
        model: str,
        messages: list[Message],
        tools: list[MCPTool],
        temperature: float,
        max_tokens: int,
        system_prompt: str,
    ) -> AsyncGenerator[ChatStreamEvent, None]:
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        ant_tools = [t.to_anthropic_tool() for t in tools] if tools else []
        ant_messages = [
            {"role": m.role.value if m.role != MessageRole.SYSTEM else "user",
             "content": m.content}
            for m in messages if m.role != MessageRole.SYSTEM
        ]

        iteration = 0
        total_input = 0
        total_output = 0

        while iteration < settings.max_tool_iterations:
            iteration += 1
            kwargs: dict[str, Any] = dict(
                model=model,
                max_tokens=max_tokens,
                system=system_prompt,
                messages=ant_messages,
                temperature=temperature,
            )
            if ant_tools:
                kwargs["tools"] = ant_tools

            tool_uses: list[dict[str, Any]] = []

            async with client.messages.stream(**kwargs) as stream:
                async for event in stream:
                    if event.type == "content_block_delta":
                        if hasattr(event.delta, "text"):
                            yield ChatStreamEvent(
                                type="text_delta", content=event.delta.text
                            )
                        elif hasattr(event.delta, "partial_json"):
                            pass  # buffered below
                    elif event.type == "content_block_start":
                        if hasattr(event.content_block, "type"):
                            if event.content_block.type == "tool_use":
                                tool_uses.append({
                                    "id": event.content_block.id,
                                    "name": event.content_block.name,
                                    "input": {},
                                })

                final = await stream.get_final_message()
                total_input += final.usage.input_tokens
                total_output += final.usage.output_tokens

                # Extract tool use blocks from final message
                tool_blocks = [b for b in final.content if b.type == "tool_use"]

            if not tool_blocks:
                break

            tool_results = []
            for tb in tool_blocks:
                yield ChatStreamEvent(type="tool_call_start", tool=tb.name, args=tb.input)
                result = await mcp_client.call_tool(tb.name, tb.input)
                yield ChatStreamEvent(
                    type="tool_call_result", tool=tb.name,
                    result={"content": result.content, "success": result.success},
                )
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tb.id,
                    "content": json.dumps(result.content) if result.success
                    else f"Error: {result.error}",
                })

            # Append assistant + tool_results to messages
            ant_messages.append({"role": "assistant", "content": final.content})
            ant_messages.append({"role": "user", "content": tool_results})

        yield ChatStreamEvent(
            type="done",
            usage={"input_tokens": total_input, "output_tokens": total_output},
        )

    # ── Google Gemini ─────────────────────────────────────────────────────────

    async def _stream_gemini(
        self,
        model: str,
        messages: list[Message],
        tools: list[MCPTool],
        temperature: float,
        max_tokens: int,
        system_prompt: str,
    ) -> AsyncGenerator[ChatStreamEvent, None]:
        import google.generativeai as genai

        genai.configure(api_key=settings.google_api_key)
        gemini_model = genai.GenerativeModel(
            model_name=model,
            system_instruction=system_prompt,
        )
        history = [
            {"role": "user" if m.role == MessageRole.USER else "model",
             "parts": [m.content]}
            for m in messages[:-1]
        ]
        last_message = messages[-1].content if messages else ""

        chat = gemini_model.start_chat(history=history)
        response = await chat.send_message_async(
            last_message,
            generation_config=genai.GenerationConfig(
                temperature=temperature, max_output_tokens=max_tokens
            ),
            stream=True,
        )

        async for chunk in response:
            if chunk.text:
                yield ChatStreamEvent(type="text_delta", content=chunk.text)

        yield ChatStreamEvent(type="done", usage={})


# Singleton
llm_gateway = LLMGateway()


class _openai_stream_ctx:
    """Compatibility shim for openai streaming."""
    def __init__(self, client: Any, kwargs: dict[str, Any]) -> None:
        self._client = client
        self._kwargs = kwargs
        self._stream: Any = None

    async def __aenter__(self) -> Any:
        self._stream = await self._client.chat.completions.create(**self._kwargs)
        return self._stream

    async def __aexit__(self, *args: Any) -> None:
        pass

    def __aiter__(self) -> Any:
        return self._stream.__aiter__()
