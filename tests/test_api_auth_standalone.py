"""Standalone (``auth_mode=none``) deployment must be byte-for-byte unaffected by BIZ-029.

The default ``client`` fixture already runs with ``settings.auth_mode == "none"`` (the default);
these tests pin that assumption down explicitly so a future change to the default cannot silently
enable SSO for every existing deployment.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from walker.config import settings


def test_default_auth_mode_is_none() -> None:
    assert settings.auth_mode == "none"


def test_no_auth_routes_are_mounted_in_standalone_mode(client: TestClient) -> None:
    assert settings.auth_mode == "none"

    response = client.get("/api/auth/login/google")

    assert response.status_code == 404


def test_health_endpoint_requires_no_session_cookie(client: TestClient) -> None:
    response = client.get("/api/health")

    assert response.status_code == 200


def test_settings_endpoint_uses_implicit_default_user_without_login(client: TestClient) -> None:
    response = client.get("/api/settings")

    assert response.status_code == 200
