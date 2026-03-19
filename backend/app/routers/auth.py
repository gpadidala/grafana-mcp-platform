"""Auth endpoints — token introspection, provider info."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.config import settings
from app.middleware.auth_middleware import CurrentUser

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.get("/me")
async def get_me(current_user: CurrentUser) -> dict[str, str]:
    """Return info about the currently authenticated user."""
    return current_user


@router.get("/providers")
async def list_providers() -> dict[str, str]:
    """Return configured auth provider info (no secrets)."""
    return {
        "jwks_uri": settings.auth_jwks_uri or "not_configured",
        "issuer": settings.auth_issuer or "not_configured",
        "api_key_enabled": "true",
    }
