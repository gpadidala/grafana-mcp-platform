"""
Application configuration using Pydantic Settings v2.
All values loaded from environment variables / .env file.
"""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class CloudProvider(str, Enum):
    AWS = "aws"
    AZURE = "azure"
    GCP = "gcp"
    LOCAL = "local"


class Environment(str, Enum):
    DEVELOPMENT = "development"
    PERF = "perf"
    PRODUCTION = "production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ────────────────────────────────────────────────────────────
    app_name: str = "grafana-mcp-platform"
    app_version: str = "1.0.0"
    app_env: Environment = Environment.DEVELOPMENT
    log_level: str = "INFO"
    debug: bool = False

    # ── CORS ───────────────────────────────────────────────────────────────────
    allowed_origins: str = Field(
        default="http://localhost:3001,http://localhost:5173"
    )

    # ── Grafana ────────────────────────────────────────────────────────────────
    grafana_url: str = "http://grafana:3000"
    grafana_api_key: str = ""
    grafana_org_id: int = 1
    grafana_timeout: int = 30

    # ── MCP Server ─────────────────────────────────────────────────────────────
    mcp_server_url: str = "http://mcp-server:8080/sse"
    mcp_max_retries: int = 5
    mcp_retry_delay: float = 1.0

    # ── LLM Providers ─────────────────────────────────────────────────────────
    # OpenAI
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"

    # Anthropic
    anthropic_api_key: str = ""

    # Azure OpenAI
    azure_openai_api_key: str = ""
    azure_openai_endpoint: str = ""
    azure_openai_api_version: str = "2024-02-01"
    azure_openai_deployment: str = ""

    # Google Gemini
    google_api_key: str = ""

    # Ollama (local)
    ollama_base_url: str = "http://ollama:11434"

    # OpenAI-compatible (vLLM, LM Studio, LiteLLM)
    openai_compatible_base_url: str = ""
    openai_compatible_api_key: str = ""

    # ── LLM Defaults ──────────────────────────────────────────────────────────
    default_llm_provider: str = "openai"
    default_model: str = "gpt-4o"
    default_temperature: float = 0.7
    default_max_tokens: int = 4096
    max_tool_iterations: int = 10
    enable_streaming: bool = True

    # ── Auth ───────────────────────────────────────────────────────────────────
    auth_jwks_uri: str = ""
    auth_issuer: str = ""
    api_key_secret: str = "change-me-local-dev-only"
    jwt_algorithm: str = "RS256"

    # ── Rate Limiting ──────────────────────────────────────────────────────────
    rate_limit_chat_per_minute: int = 20
    rate_limit_api_per_minute: int = 60

    # ── Cloud Provider (for secret management) ────────────────────────────────
    cloud_provider: CloudProvider = CloudProvider.LOCAL

    # AWS
    aws_region: str = "us-east-1"
    aws_secret_prefix: str = "grafana-mcp"

    # Azure Key Vault
    azure_keyvault_url: str = ""

    # GCP
    gcp_project_id: str = ""
    gcp_secret_prefix: str = "grafana-mcp"

    @property
    def allowed_origins_list(self) -> list[str]:
        """Parse allowed_origins string (comma-separated or JSON array) into a list."""
        import json
        v = self.allowed_origins.strip()
        try:
            parsed = json.loads(v)
            if isinstance(parsed, list):
                return [str(o) for o in parsed]
        except (json.JSONDecodeError, ValueError):
            pass
        return [o.strip() for o in v.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env == Environment.PRODUCTION


settings = Settings()
