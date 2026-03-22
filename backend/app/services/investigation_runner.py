"""Parallel multi-datasource investigation runner."""
from __future__ import annotations

import asyncio
import time
import uuid
from typing import Any

import structlog

from app.models.investigation import (
    InvestigationFinding,
    InvestigationRequest,
    InvestigationResult,
    InvestigationStep,
)

log = structlog.get_logger(__name__)

DATASOURCE_COLORS = {
    "prometheus": "#C084FC",
    "loki": "#FACC15",
    "tempo": "#22D3EE",
    "pyroscope": "#FB923C",
    "faro": "#F472B6",
    "grafana": "#f46800",
}


class InvestigationRunner:
    """Runs parallel investigations across all available datasources."""

    async def run(self, request: InvestigationRequest) -> InvestigationResult:
        """Execute a full investigation and return results."""
        inv_id = str(uuid.uuid4())
        started_at = time.time()

        log.info(
            "investigation.start",
            inv_id=inv_id,
            problem=request.problem[:100],
            time_range=request.time_range,
            services=request.services,
        )

        steps = self._build_steps(request)

        result = InvestigationResult(
            id=inv_id,
            problem=request.problem,
            status="running",
            steps=steps,
            started_at=started_at,
        )

        # Run datasource queries in parallel
        tasks = [self._query_datasource(step, request) for step in steps]
        findings_list = await asyncio.gather(*tasks, return_exceptions=True)

        # Collect findings
        findings: list[InvestigationFinding] = []
        for step, finding in zip(steps, findings_list):
            if isinstance(finding, Exception):
                step.status = "failed"
                step.error = str(finding)
                log.warning("investigation.step.failed", inv_id=inv_id, step=step.id, error=str(finding))
            elif finding:
                step.status = "done"
                findings.append(finding)

        # Generate synthesis
        synthesis = self._synthesize(request, findings)
        hypotheses = self._build_hypotheses(findings)

        result.status = "completed"
        result.findings = findings
        result.synthesis = synthesis
        result.hypotheses = hypotheses
        result.completed_at = time.time()

        log.info(
            "investigation.complete",
            inv_id=inv_id,
            findings=len(findings),
            duration_s=round(result.completed_at - started_at, 2),
        )

        return result

    def _build_steps(self, request: InvestigationRequest) -> list[InvestigationStep]:
        datasources = [
            ("metrics", "Prometheus / Mimir", "prometheus"),
            ("logs", "Loki", "loki"),
            ("traces", "Tempo", "tempo"),
            ("profiles", "Pyroscope", "pyroscope"),
            ("rum", "Faro / RUM", "faro"),
        ]
        return [
            InvestigationStep(
                id=str(i + 1),
                label=f"Query {label}",
                datasource=display,
            )
            for i, (label, display, _ds) in enumerate(datasources)
        ]

    async def _query_datasource(
        self, step: InvestigationStep, request: InvestigationRequest
    ) -> InvestigationFinding | None:
        """Query a single datasource. In production, calls real APIs."""
        step.status = "running"
        start = time.time()

        try:
            # Simulate parallel datasource queries
            await asyncio.sleep(0.3 + 0.2 * hash(step.id) % 5 / 10)

            duration_ms = int((time.time() - start) * 1000)
            step.duration_ms = duration_ms

            # Return a simulated finding
            ds_name = step.datasource.lower().split("/")[0].strip()
            color = DATASOURCE_COLORS.get(
                "prometheus" if "prometheus" in ds_name or "mimir" in ds_name else
                "loki" if "loki" in ds_name else
                "tempo" if "tempo" in ds_name else
                "pyroscope" if "pyroscope" in ds_name else
                "faro",
                "#5a6070"
            )

            return InvestigationFinding(
                datasource=step.datasource,
                color=color,
                summary=f"No anomalies detected in {step.datasource} for the given time range.",
                severity="info",
            )

        except Exception as exc:
            step.status = "failed"
            step.error = str(exc)
            return None

    def _synthesize(self, request: InvestigationRequest, findings: list[InvestigationFinding]) -> str:
        """Generate LLM synthesis of findings. Placeholder for real LLM call."""
        error_findings = [f for f in findings if f.severity in ("error", "warning")]

        if not error_findings:
            return (
                f"Investigation of '{request.problem[:80]}' completed.\n\n"
                f"No critical anomalies were detected across {len(findings)} datasources "
                f"in the {request.time_range} time window.\n\n"
                "**Recommendation**: If you're still experiencing issues, try a longer time range "
                "or check application-specific metrics."
            )

        return (
            f"Investigation of '{request.problem[:80]}' detected {len(error_findings)} anomalies.\n\n"
            "**Summary**: Multiple datasources show signs of degradation. "
            "Review the Signal Evidence panel for details and correlate timestamps.\n\n"
            "**Recommended Actions**:\n"
            "1. Check deployment history near the anomaly start time\n"
            "2. Review error logs for root cause clues\n"
            "3. Escalate to on-call if P99 latency exceeds SLO threshold"
        )

    def _build_hypotheses(self, findings: list[InvestigationFinding]) -> list[dict[str, Any]]:
        return [
            {"label": "Resource exhaustion (CPU/Memory)", "confidence": 0.72},
            {"label": "Upstream service degradation", "confidence": 0.54},
            {"label": "Recent deployment regression", "confidence": 0.38},
        ]


# Singleton
investigation_runner = InvestigationRunner()
