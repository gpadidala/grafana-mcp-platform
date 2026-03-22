"""Investigation runner endpoint."""
from __future__ import annotations

import structlog
from fastapi import APIRouter, Depends

from app.middleware.auth_middleware import CurrentUser
from app.models.investigation import InvestigationRequest, InvestigationResult
from app.services.investigation_runner import investigation_runner

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/v1", tags=["investigations"])


@router.post("/investigations", response_model=InvestigationResult)
async def run_investigation(
    request: InvestigationRequest,
    current_user: CurrentUser,
) -> InvestigationResult:
    """
    Run a parallel multi-datasource investigation.
    Queries Prometheus, Loki, Tempo, Pyroscope, and Faro concurrently.
    Returns findings + AI synthesis.
    """
    log.info(
        "investigation.request",
        user=current_user["user_id"],
        problem=request.problem[:80],
        time_range=request.time_range,
    )
    return await investigation_runner.run(request)
