"""JWT / OAuth 2.1 authentication service."""
from __future__ import annotations

import time
from typing import Any, Optional

import httpx
import structlog
from cachetools import TTLCache
from jose import JWTError, jwt

from app.config import settings

log = structlog.get_logger(__name__)

_jwks_cache: TTLCache[str, Any] = TTLCache(maxsize=5, ttl=3600)


class AuthService:
    """
    Validates Bearer JWT tokens from:
    - Grafana native auth (HMAC)
    - Azure AD / Entra ID
    - AWS Cognito
    - Google OIDC
    - KeyCloak
    Falls back to API key validation (X-API-Key header).
    """

    async def _get_jwks(self) -> dict[str, Any]:
        """Fetch and cache JWKS from the configured JWKS URI."""
        cache_key = settings.auth_jwks_uri
        if cache_key in _jwks_cache:
            return _jwks_cache[cache_key]  # type: ignore[return-value]

        if not settings.auth_jwks_uri:
            return {}

        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(settings.auth_jwks_uri)
            resp.raise_for_status()
            jwks = resp.json()
            _jwks_cache[cache_key] = jwks
            return jwks  # type: ignore[return-value]

    async def validate_token(self, token: str) -> dict[str, Any]:
        """
        Validate a JWT Bearer token.
        Returns the decoded claims on success.
        Raises ValueError on failure.
        """
        try:
            jwks = await self._get_jwks()
            if jwks:
                claims = jwt.decode(
                    token,
                    jwks,
                    algorithms=[settings.jwt_algorithm],
                    options={"verify_aud": False},
                )
            else:
                # Local dev: decode without verification
                claims = jwt.decode(
                    token,
                    options={"verify_signature": False, "verify_aud": False},
                    algorithms=["RS256", "HS256"],
                )

            # Validate issuer if configured
            if settings.auth_issuer and claims.get("iss") != settings.auth_issuer:
                raise ValueError(
                    f"Invalid issuer: {claims.get('iss')} != {settings.auth_issuer}"
                )

            # Check expiration
            if "exp" in claims and claims["exp"] < time.time():
                raise ValueError("Token has expired")

            log.info("auth.token_valid", sub=claims.get("sub"), iss=claims.get("iss"))
            return claims

        except JWTError as exc:
            raise ValueError(f"Invalid JWT: {exc}") from exc

    def validate_api_key(self, api_key: str) -> bool:
        """Validate a static API key (local dev / service-to-service)."""
        return api_key == settings.api_key_secret

    def extract_user_id(self, claims: dict[str, Any]) -> str:
        """Extract a stable user identifier from JWT claims."""
        return (
            claims.get("sub")
            or claims.get("email")
            or claims.get("preferred_username")
            or "anonymous"
        )


auth_service = AuthService()
