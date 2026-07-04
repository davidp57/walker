"""Tests for the health endpoint."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from walker.config import settings


def test_health_returns_ok(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["version"]


def test_health_reports_none_auth_mode_and_no_providers(client: TestClient) -> None:
    response = client.get("/api/health")

    body = response.json()
    assert body["auth_mode"] == "none"
    assert body["sso_providers"] == []


def test_health_reports_sso_auth_mode_and_configured_providers(sso_client: TestClient) -> None:
    response = sso_client.get("/api/health")

    body = response.json()
    assert body["auth_mode"] == "sso"
    assert set(body["sso_providers"]) == {"google", "apple", "microsoft"}


def test_health_omits_providers_missing_a_secret(sso_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "apple_client_secret", "")

    response = sso_client.get("/api/health")

    assert "apple" not in response.json()["sso_providers"]
