"""Skills engine — load, search, and execute skills."""
from __future__ import annotations
import re
import uuid
from pathlib import Path
from typing import Optional
import structlog
from app.models.skill import Skill, SkillCategory, SkillRunRequest, SkillRunResult

log = structlog.get_logger(__name__)

# In-memory store (replace with DB in production)
_skills_store: dict[str, Skill] = {}

TEMPLATES_DIR = Path(__file__).parent.parent.parent / "skills" / "templates"


def _parse_frontmatter(content: str) -> tuple[dict, str]:
    """Parse YAML frontmatter from markdown content."""
    if not content.startswith("---"):
        return {}, content

    end = content.find("---", 3)
    if end == -1:
        return {}, content

    frontmatter_text = content[3:end].strip()
    body = content[end + 3:].strip()

    meta: dict = {}
    for line in frontmatter_text.splitlines():
        if ":" in line:
            key, _, value = line.partition(":")
            key = key.strip()
            value = value.strip()
            if value.startswith("[") and value.endswith("]"):
                meta[key] = [v.strip().strip("'\"") for v in value[1:-1].split(",") if v.strip()]
            else:
                meta[key] = value.strip("'\"")

    return meta, body


def _count_steps(content: str) -> int:
    """Count ## Step N sections in markdown."""
    return len(re.findall(r'^##\s+Step\s+\d+', content, re.MULTILINE))


def load_skill_templates() -> list[Skill]:
    """Load built-in skill templates from the skills/templates directory."""
    skills = []

    if not TEMPLATES_DIR.exists():
        log.warning("skills.templates_dir_not_found", path=str(TEMPLATES_DIR))
        return skills

    for md_file in TEMPLATES_DIR.glob("*.md"):
        try:
            content = md_file.read_text(encoding="utf-8")
            meta, body = _parse_frontmatter(content)

            skill = Skill(
                id=md_file.stem,
                name=meta.get("title", md_file.stem.replace("-", " ").title()),
                description=meta.get("description", ""),
                category=SkillCategory(meta.get("category", "general")),
                tags=meta.get("datasources", meta.get("tags", [])),
                step_count=_count_steps(body),
                content=content,
            )
            skills.append(skill)

        except Exception as e:
            log.error("skills.load_error", file=str(md_file), error=str(e))

    return skills


class SkillsEngine:
    def __init__(self):
        self._initialized = False

    def _ensure_initialized(self):
        if not self._initialized:
            templates = load_skill_templates()
            for skill in templates:
                if skill.id not in _skills_store:
                    _skills_store[skill.id] = skill
            self._initialized = True

    def list_skills(
        self,
        category: Optional[str] = None,
        query: Optional[str] = None,
    ) -> list[Skill]:
        self._ensure_initialized()

        skills = list(_skills_store.values())

        if category and category != "all":
            skills = [s for s in skills if s.category.value == category]

        if query:
            q = query.lower()
            skills = [
                s for s in skills
                if q in s.name.lower() or q in s.description.lower()
                or any(q in t.lower() for t in s.tags)
            ]

        return sorted(skills, key=lambda s: s.name)

    def get_skill(self, skill_id: str) -> Optional[Skill]:
        self._ensure_initialized()
        return _skills_store.get(skill_id)

    def create_skill(self, name: str, description: str, category: str, tags: list[str], content: str) -> Skill:
        self._ensure_initialized()
        skill = Skill(
            name=name,
            description=description,
            category=SkillCategory(category),
            tags=tags,
            content=content,
            step_count=_count_steps(content),
        )
        _skills_store[skill.id] = skill
        log.info("skills.created", skill_id=skill.id, name=skill.name)
        return skill

    def update_skill(self, skill_id: str, **updates) -> Optional[Skill]:
        self._ensure_initialized()
        skill = _skills_store.get(skill_id)
        if not skill:
            return None

        skill_dict = skill.model_dump()
        skill_dict.update({k: v for k, v in updates.items() if v is not None})

        if "content" in updates and updates["content"]:
            skill_dict["step_count"] = _count_steps(updates["content"])

        from datetime import datetime
        skill_dict["updated_at"] = datetime.utcnow()

        updated = Skill(**skill_dict)
        _skills_store[skill_id] = updated
        return updated

    def delete_skill(self, skill_id: str) -> bool:
        self._ensure_initialized()
        if skill_id in _skills_store:
            del _skills_store[skill_id]
            log.info("skills.deleted", skill_id=skill_id)
            return True
        return False

    async def run_skill(
        self,
        skill_id: str,
        run_request: SkillRunRequest,
    ) -> SkillRunResult:
        """Execute a skill with the provided variables."""
        self._ensure_initialized()

        skill = _skills_store.get(skill_id)
        if not skill:
            raise ValueError(f"Skill not found: {skill_id}")

        log.info("skills.run_start", skill_id=skill_id, name=skill.name)

        # Placeholder: real implementation would parse steps, substitute variables,
        # execute via MCP tools, and synthesize with LLM.
        result = SkillRunResult(
            skill_id=skill_id,
            status="completed",
            steps_completed=skill.step_count,
            total_steps=skill.step_count,
            findings=[
                {
                    "step": 1,
                    "datasource": "Prometheus",
                    "summary": "Skill executed successfully. Configure MCP tools for real results.",
                }
            ],
            synthesis=f"Skill '{skill.name}' executed with variables: {run_request.variables}",
        )

        from datetime import datetime
        skill.last_run_at = datetime.utcnow()
        skill.run_count += 1

        log.info("skills.run_complete", skill_id=skill_id)
        return result


skills_engine = SkillsEngine()
