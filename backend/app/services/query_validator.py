"""Query validation and explanation for PromQL/LogQL/TraceQL/SQL."""
from __future__ import annotations

import re
from enum import Enum
from pydantic import BaseModel


class QueryLanguage(str, Enum):
    promql = "promql"
    logql = "logql"
    traceql = "traceql"
    sql = "sql"


class ValidationResult(BaseModel):
    valid: bool
    language: QueryLanguage
    errors: list[str] = []
    warnings: list[str] = []
    suggested_fix: str | None = None


class AutocompleteSuggestion(BaseModel):
    label: str
    type: str  # metric, label, value, function
    documentation: str | None = None


PROMQL_FUNCTIONS = [
    "rate", "irate", "increase", "delta", "deriv",
    "histogram_quantile", "avg_over_time", "max_over_time", "min_over_time",
    "sum", "avg", "min", "max", "count", "stddev", "stdvar",
    "topk", "bottomk", "count_values", "absent", "absent_over_time",
    "predict_linear", "clamp", "clamp_max", "clamp_min", "ceil", "floor",
    "round", "changes", "resets", "label_replace", "label_join",
    "vector", "scalar", "time", "timestamp",
]

LOGQL_FILTERS = [
    "json", "logfmt", "regexp", "pattern", "unpack",
    "line_format", "label_format", "decolorize",
    "count_over_time", "rate", "bytes_rate", "bytes_over_time",
    "avg_over_time", "max_over_time", "min_over_time", "sum_over_time",
    "quantile_over_time", "first_over_time", "last_over_time",
]


def detect_language(query: str) -> QueryLanguage:
    q = query.strip().lower()
    if re.search(r'rate\s*\(|histogram_quantile|irate\s*\(|avg_over_time', q):
        return QueryLanguage.promql
    if re.match(r'^\{[^}]+\}', q) or re.search(r'\|\s*(json|logfmt|regexp|pattern)', q):
        return QueryLanguage.logql
    if re.search(r'\{\s*\.(service\.name|duration|status)', q) or 'spanset' in q:
        return QueryLanguage.traceql
    if re.match(r'^\s*(select|with|insert|update|delete)\s', query, re.IGNORECASE):
        return QueryLanguage.sql
    return QueryLanguage.promql


def validate_query(query: str, language: QueryLanguage | None = None) -> ValidationResult:
    if not language:
        language = detect_language(query)

    errors: list[str] = []
    warnings: list[str] = []

    # Check balanced braces/parens
    depth = 0
    for ch in query:
        if ch in ('{', '(', '['):
            depth += 1
        elif ch in ('}', ')', ']'):
            depth -= 1
        if depth < 0:
            errors.append("Unmatched closing bracket")
            break

    if depth > 0:
        errors.append(f"Unclosed bracket(s) — missing {depth} closing bracket(s)")

    if not query.strip():
        errors.append("Query is empty")

    if language == QueryLanguage.logql and not re.search(r'\{[^}]*\}', query):
        errors.append("LogQL query must start with a stream selector {label=...}")

    suggested_fix = None
    if errors and language == QueryLanguage.promql:
        suggested_fix = "Check that all parentheses and brackets are balanced. Example: rate(metric[5m])"

    return ValidationResult(
        valid=len(errors) == 0,
        language=language,
        errors=errors,
        warnings=warnings,
        suggested_fix=suggested_fix,
    )


def get_autocomplete_suggestions(prefix: str, language: QueryLanguage) -> list[AutocompleteSuggestion]:
    suggestions: list[AutocompleteSuggestion] = []

    if language == QueryLanguage.promql:
        for fn in PROMQL_FUNCTIONS:
            if fn.startswith(prefix.lower()):
                suggestions.append(
                    AutocompleteSuggestion(
                        label=fn,
                        type="function",
                        documentation=f"PromQL function: {fn}()",
                    )
                )

    elif language == QueryLanguage.logql:
        for f in LOGQL_FILTERS:
            if f.startswith(prefix.lower()):
                suggestions.append(
                    AutocompleteSuggestion(
                        label=f,
                        type="function",
                        documentation=f"LogQL parser/filter: {f}",
                    )
                )

    return suggestions[:20]
