"""Skill models — Pydantic v2."""
from __future__ import annotations
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
import uuid
from datetime import datetime


class SkillCategory(str, Enum):
    investigation = "investigation"
    metrics = "metrics"
    logs = "logs"
    traces = "traces"
    general = "general"
    dashboards = "dashboards"
    knowledge = "knowledge"


class SkillVariable(BaseModel):
    name: str
    description: str
    default: Optional[str] = None
    required: bool = True


class SkillStep(BaseModel):
    step: int
    name: str
    datasource: str
    query_template: Optional[str] = None
    description: str


class Skill(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    category: SkillCategory
    tags: list[str] = []
    step_count: int = 0
    steps: list[SkillStep] = []
    variables: list[SkillVariable] = []
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_run_at: Optional[datetime] = None
    run_count: int = 0


class SkillCreate(BaseModel):
    name: str
    description: str
    category: SkillCategory
    tags: list[str] = []
    content: str


class SkillUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[SkillCategory] = None
    tags: Optional[list[str]] = None
    content: Optional[str] = None


class SkillRunRequest(BaseModel):
    variables: dict[str, str] = {}


class SkillRunResult(BaseModel):
    skill_id: str
    status: str  # running | completed | failed
    steps_completed: int
    total_steps: int
    findings: list[dict] = []
    synthesis: Optional[str] = None
    started_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    duration_ms: Optional[float] = None
