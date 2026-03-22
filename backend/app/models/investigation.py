"""Investigation models — Pydantic v2."""
from __future__ import annotations
from enum import Enum
from typing import Optional, Any
from pydantic import BaseModel, Field
import uuid
from datetime import datetime


class InvestigationStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class InvestigationStep(BaseModel):
    id: str
    label: str
    datasource: str
    status: str = "pending"  # pending | running | done | failed
    duration_ms: Optional[float] = None
    summary: Optional[str] = None
    query: Optional[str] = None
    raw_result: Optional[dict[str, Any]] = None
    error: Optional[str] = None


class Finding(BaseModel):
    datasource: str
    color: str
    summary: str
    severity: str  # error | warning | info
    query: Optional[str] = None
    raw: Optional[str] = None


# Aliases used by investigation_runner and routers
InvestigationFinding = Finding


class InvestigationRequest(BaseModel):
    problem: str
    time_range: str = "last_1h"  # last_30m | last_1h | last_3h | last_24h
    services: list[str] = []
    namespaces: list[str] = []


class Investigation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    problem: str
    status: str = "pending"
    steps: list[InvestigationStep] = []
    findings: list[Finding] = []
    synthesis: Optional[str] = None
    hypotheses: list[dict[str, Any]] = []
    time_range: str = "last_1h"
    services: list[str] = []
    started_at: float = Field(default_factory=lambda: datetime.utcnow().timestamp())
    completed_at: Optional[float] = None
    duration_ms: Optional[float] = None


# Alias used by routers and services
InvestigationResult = Investigation
