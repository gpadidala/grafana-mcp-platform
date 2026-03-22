"""Query validation, explanation, and autocomplete endpoints."""
from __future__ import annotations

import structlog
from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.middleware.auth_middleware import CurrentUser
from app.services.query_validator import (
    AutocompleteSuggestion,
    QueryLanguage,
    ValidationResult,
    detect_language,
    get_autocomplete_suggestions,
    validate_query,
)

log = structlog.get_logger(__name__)
router = APIRouter(prefix="/api/v1/queries", tags=["queries"])


class QueryRequest(BaseModel):
    query: str
    language: str | None = None


class ExplainResult(BaseModel):
    explanation: str
    language: str
    components: list[dict[str, str]] = []


class DetectLanguageResult(BaseModel):
    language: str
    confidence: str = "high"


@router.post("/validate", response_model=ValidationResult)
async def validate(
    body: QueryRequest,
    current_user: CurrentUser,
) -> ValidationResult:
    """Validate a query and return errors/warnings."""
    lang = QueryLanguage(body.language) if body.language else None
    return validate_query(body.query, lang)


@router.post("/explain", response_model=ExplainResult)
async def explain(
    body: QueryRequest,
    current_user: CurrentUser,
) -> ExplainResult:
    """Return a plain-English explanation of a query."""
    lang = QueryLanguage(body.language) if body.language else detect_language(body.query)
    explanation, components = _explain_query(body.query, lang)
    return ExplainResult(explanation=explanation, language=lang.value, components=components)


@router.post("/detect-language", response_model=DetectLanguageResult)
async def detect(
    body: QueryRequest,
    current_user: CurrentUser,
) -> DetectLanguageResult:
    """Detect the query language (PromQL, LogQL, TraceQL, SQL)."""
    lang = detect_language(body.query)
    return DetectLanguageResult(language=lang.value)


@router.get("/autocomplete", response_model=list[AutocompleteSuggestion])
async def autocomplete(
    current_user: CurrentUser,
    prefix: str = Query(..., min_length=1),
    language: QueryLanguage = Query(default=QueryLanguage.promql),
) -> list[AutocompleteSuggestion]:
    """Get autocomplete suggestions for a query prefix."""
    return get_autocomplete_suggestions(prefix, language)


# ── Query explanation logic ──────────────────────────────────────────────────

def _explain_query(query: str, language: QueryLanguage) -> tuple[str, list[dict[str, str]]]:
    """Generate a plain-English explanation of a query."""
    import re

    components: list[dict[str, str]] = []
    q = query.strip()

    if language == QueryLanguage.promql:
        # Extract metric name
        metric_match = re.search(r'(\w+)\s*\{', q) or re.search(r'(\w+)\s*\[', q)
        metric = metric_match.group(1) if metric_match else "the metric"

        # Extract range window
        window_match = re.search(r'\[(\w+)\]', q)
        window = window_match.group(1) if window_match else None

        # Detect function
        if "rate(" in q:
            explanation = f"Computes the per-second rate of increase of `{metric}` over the last {window or '5m'}."
            components.append({"part": f"rate({metric}[{window or '5m'}])", "description": "Per-second rate of change"})
        elif "histogram_quantile" in q:
            p_match = re.search(r'histogram_quantile\s*\(\s*([\d.]+)', q)
            percentile = f"P{int(float(p_match.group(1)) * 100)}" if p_match else "P99"
            explanation = f"Calculates the {percentile} latency from a Prometheus histogram metric."
            components.append({"part": "histogram_quantile(0.99, ...)", "description": f"{percentile} latency calculation"})
        elif "increase(" in q:
            explanation = f"Computes the total increase of `{metric}` over the last {window or '1h'}."
            components.append({"part": f"increase({metric}[{window or '1h'}])", "description": "Total increase over time window"})
        elif "predict_linear" in q:
            explanation = f"Uses linear regression to predict the future value of `{metric}` based on historical data."
        else:
            explanation = f"Queries `{metric}` metric from Prometheus/Mimir."

        # Explain label filters
        label_match = re.search(r'\{([^}]+)\}', q)
        if label_match:
            labels = label_match.group(1)
            components.append({"part": f"{{{labels}}}", "description": f"Filter: only series matching {labels}"})

    elif language == QueryLanguage.logql:
        selector_match = re.search(r'\{([^}]+)\}', q)
        selector = selector_match.group(1) if selector_match else ""
        explanation = f"Queries log streams matching `{{{selector}}}`"
        if selector:
            components.append({"part": f"{{{selector}}}", "description": "Stream selector — picks which log streams to query"})
        if "| json" in q:
            explanation += ", parsing each line as JSON"
            components.append({"part": "| json", "description": "Parse log lines as JSON to extract structured fields"})
        if "|~" in q or "| grep" in q:
            filter_match = re.search(r'\|~\s*"([^"]+)"', q)
            if filter_match:
                components.append({"part": f'|~ "{filter_match.group(1)}"', "description": f"Regex filter: only lines matching {filter_match.group(1)}"})
        explanation += "."

    elif language == QueryLanguage.traceql:
        explanation = "Queries distributed traces using TraceQL."
        if "duration" in q:
            dur_match = re.search(r'duration\s*[><=]+\s*([\w.]+)', q)
            if dur_match:
                components.append({"part": f"duration > {dur_match.group(1)}", "description": f"Filter traces slower than {dur_match.group(1)}"})
        if ".service.name" in q:
            svc_match = re.search(r'\.service\.name\s*=\s*"([^"]+)"', q)
            if svc_match:
                components.append({"part": f'.service.name = "{svc_match.group(1)}"', "description": f"Only traces from the {svc_match.group(1)} service"})

    elif language == QueryLanguage.sql:
        explanation = "SQL query against the NovaSRE incidents database."
        if "SELECT" in q.upper():
            table_match = re.search(r'FROM\s+(\w+)', q, re.IGNORECASE)
            if table_match:
                components.append({"part": f"FROM {table_match.group(1)}", "description": f"Queries the {table_match.group(1)} table"})
        if "WHERE" in q.upper():
            components.append({"part": "WHERE clause", "description": "Filters rows based on conditions"})
        if "ORDER BY" in q.upper():
            components.append({"part": "ORDER BY", "description": "Sorts results"})
        if "LIMIT" in q.upper():
            limit_match = re.search(r'LIMIT\s+(\d+)', q, re.IGNORECASE)
            if limit_match:
                components.append({"part": f"LIMIT {limit_match.group(1)}", "description": f"Returns at most {limit_match.group(1)} rows"})
    else:
        explanation = "Unknown query language."

    return explanation, components
