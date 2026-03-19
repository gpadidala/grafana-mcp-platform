"""JWT Bearer token authentication middleware / dependency."""
from __future__ import annotations

from typing import Annotated, Optional

import structlog
from fastapi import Depends, Header, HTTPException, status

from app.services.auth_service import auth_service

log = structlog.get_logger(__name__)


async def get_current_user(
    authorization: Annotated[Optional[str], Header()] = None,
    x_api_key: Annotated[Optional[str], Header(alias="X-API-Key")] = None,
) -> dict[str, str]:
    """
    FastAPI dependency for authentication.
    Accepts: Bearer JWT token or X-API-Key header.
    Returns dict with 'user_id' and 'auth_type'.
    """
    # Try Bearer JWT
    if authorization and authorization.startswith("Bearer "):
        token = authorization.removeprefix("Bearer ")
        try:
            claims = await auth_service.validate_token(token)
            user_id = auth_service.extract_user_id(claims)
            return {"user_id": user_id, "auth_type": "jwt"}
        except ValueError as exc:
            log.warning("auth.jwt_invalid", error=str(exc))
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {exc}",
                headers={"WWW-Authenticate": "Bearer"},
            ) from exc

    # Try API Key
    if x_api_key:
        if auth_service.validate_api_key(x_api_key):
            return {"user_id": "api-key-user", "auth_type": "api_key"}
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    # No credentials provided
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
        headers={"WWW-Authenticate": "Bearer"},
    )


CurrentUser = Annotated[dict[str, str], Depends(get_current_user)]
