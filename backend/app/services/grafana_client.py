"""Grafana HTTP API client."""
from __future__ import annotations

from typing import Any, Optional

import httpx
import structlog
from cachetools import TTLCache

from app.config import settings

log = structlog.get_logger(__name__)

_dashboard_cache: TTLCache[str, Any] = TTLCache(maxsize=200, ttl=30)


class GrafanaClient:
    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=settings.grafana_url,
                headers={
                    "Authorization": f"Bearer {settings.grafana_api_key}",
                    "Content-Type": "application/json",
                    "X-Grafana-Org-Id": str(settings.grafana_org_id),
                },
                timeout=settings.grafana_timeout,
            )
        return self._client

    async def search_dashboards(
        self, query: str = "", tag: Optional[str] = None, limit: int = 50
    ) -> list[dict[str, Any]]:
        cache_key = f"search:{query}:{tag}:{limit}"
        if cache_key in _dashboard_cache:
            return _dashboard_cache[cache_key]  # type: ignore[return-value]

        params: dict[str, Any] = {"type": "dash-db", "limit": limit}
        if query:
            params["query"] = query
        if tag:
            params["tag"] = tag

        try:
            resp = await self._get_client().get("/api/search", params=params)
            resp.raise_for_status()
            result = resp.json()
            _dashboard_cache[cache_key] = result
            return result  # type: ignore[return-value]
        except httpx.HTTPError as exc:
            log.error("grafana.search_dashboards_error", error=str(exc))
            return []

    async def get_dashboard(self, uid: str) -> dict[str, Any]:
        cache_key = f"dash:{uid}"
        if cache_key in _dashboard_cache:
            return _dashboard_cache[cache_key]  # type: ignore[return-value]

        try:
            resp = await self._get_client().get(f"/api/dashboards/uid/{uid}")
            resp.raise_for_status()
            result = resp.json()
            _dashboard_cache[cache_key] = result
            return result  # type: ignore[return-value]
        except httpx.HTTPError as exc:
            log.error("grafana.get_dashboard_error", uid=uid, error=str(exc))
            return {}

    async def get_datasources(self) -> list[dict[str, Any]]:
        try:
            resp = await self._get_client().get("/api/datasources")
            resp.raise_for_status()
            return resp.json()  # type: ignore[return-value]
        except httpx.HTTPError as exc:
            log.error("grafana.get_datasources_error", error=str(exc))
            return []

    async def get_alerts(self, state: str = "firing") -> list[dict[str, Any]]:
        try:
            resp = await self._get_client().get(
                "/api/alerting/alerts", params={"state": state}
            )
            resp.raise_for_status()
            return resp.json()  # type: ignore[return-value]
        except httpx.HTTPError as exc:
            log.error("grafana.get_alerts_error", state=state, error=str(exc))
            return []

    async def health(self) -> bool:
        try:
            resp = await self._get_client().get("/api/health")
            return resp.status_code == 200
        except Exception:
            return False

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()


grafana_client = GrafanaClient()
