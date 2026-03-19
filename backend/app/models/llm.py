"""LLM provider configuration models."""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel


class LLMProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    AZURE_OPENAI = "azure"
    GOOGLE_GEMINI = "gemini"
    OLLAMA = "ollama"
    OPENAI_COMPATIBLE = "openai_compatible"


class ModelConfig(BaseModel):
    provider: LLMProvider
    model_id: str
    display_name: str
    max_context_tokens: int
    supports_tools: bool = True
    supports_streaming: bool = True
    supports_vision: bool = False


# Catalogue of supported models per provider
SUPPORTED_MODELS: list[ModelConfig] = [
    # OpenAI
    ModelConfig(provider=LLMProvider.OPENAI, model_id="gpt-4o", display_name="GPT-4o",
                max_context_tokens=128000, supports_vision=True),
    ModelConfig(provider=LLMProvider.OPENAI, model_id="gpt-4o-mini",
                display_name="GPT-4o Mini", max_context_tokens=128000),
    ModelConfig(provider=LLMProvider.OPENAI, model_id="gpt-4-turbo",
                display_name="GPT-4 Turbo", max_context_tokens=128000, supports_vision=True),

    # Anthropic
    ModelConfig(provider=LLMProvider.ANTHROPIC, model_id="claude-opus-4-6",
                display_name="Claude Opus 4.6", max_context_tokens=200000),
    ModelConfig(provider=LLMProvider.ANTHROPIC, model_id="claude-sonnet-4-6",
                display_name="Claude Sonnet 4.6", max_context_tokens=200000),
    ModelConfig(provider=LLMProvider.ANTHROPIC, model_id="claude-haiku-4-5-20251001",
                display_name="Claude Haiku 4.5", max_context_tokens=200000),

    # Google Gemini
    ModelConfig(provider=LLMProvider.GOOGLE_GEMINI, model_id="gemini-1.5-pro",
                display_name="Gemini 1.5 Pro", max_context_tokens=1000000, supports_vision=True),
    ModelConfig(provider=LLMProvider.GOOGLE_GEMINI, model_id="gemini-1.5-flash",
                display_name="Gemini 1.5 Flash", max_context_tokens=1000000),
]


class ProviderStatus(BaseModel):
    provider: LLMProvider
    available: bool
    models: list[str]
    error: Optional[str] = None
