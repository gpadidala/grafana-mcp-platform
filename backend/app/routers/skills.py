"""Skills CRUD + run endpoints."""
from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException, Query

from app.middleware.auth_middleware import CurrentUser
from app.models.skill import Skill, SkillRunRequest, SkillRunResult
from app.services.skills_engine import skills_engine

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/v1/skills", tags=["skills"])


@router.get("", response_model=list[Skill])
async def list_skills(
    current_user: CurrentUser,
    category: str | None = Query(default=None),
    query: str | None = Query(default=None),
) -> list[Skill]:
    """List all available skills, optionally filtered by category and search query."""
    return skills_engine.list_skills(category=category, query=query)


@router.get("/{skill_id}", response_model=Skill)
async def get_skill(
    skill_id: str,
    current_user: CurrentUser,
) -> Skill:
    """Get a specific skill by ID."""
    skill = skills_engine.get_skill(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")
    return skill


@router.post("", response_model=Skill)
async def create_skill(
    skill: Skill,
    current_user: CurrentUser,
) -> Skill:
    """Create a new skill."""
    return skills_engine.create_skill(
        name=skill.name,
        description=skill.description,
        category=skill.category.value,
        tags=skill.tags,
        content=skill.content or "",
    )


@router.post("/{skill_id}/run", response_model=SkillRunResult)
async def run_skill(
    skill_id: str,
    request: SkillRunRequest,
    current_user: CurrentUser,
) -> SkillRunResult:
    """Execute a skill with the given variables."""
    skill = skills_engine.get_skill(skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")

    log.info("skills.run", skill_id=skill_id, user=current_user["user_id"])
    return await skills_engine.run_skill(skill_id, request)


@router.delete("/{skill_id}")
async def delete_skill(
    skill_id: str,
    current_user: CurrentUser,
) -> dict[str, str]:
    """Delete a skill."""
    if not skills_engine.delete_skill(skill_id):
        raise HTTPException(status_code=404, detail=f"Skill '{skill_id}' not found")
    return {"status": "deleted", "skill_id": skill_id}
