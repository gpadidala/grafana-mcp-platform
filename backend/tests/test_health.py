"""Health endpoint tests."""
from __future__ import annotations

import pytest


def test_healthz_returns_200(client):
    resp = client.get("/healthz")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "uptime_seconds" in data


def test_readyz_returns_200(client):
    resp = client.get("/readyz")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ready"
