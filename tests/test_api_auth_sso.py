"""API tests for the hosted-deployment SSO login flow (BIZ-029).

Every provider round trip is mocked at the ``authlib`` OAuth-client boundary: these tests never
call out to Google, Apple, or Microsoft.
"""

from __future__ import annotations

from typing import Any
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient
from starlette.responses import RedirectResponse

from walker.api.routers import auth as auth_router
from walker.models import User
from walker.services.auth_session import create_session_token


class _FakeProviderClient:
    """Stands in for an ``authlib`` ``StarletteOAuth2App`` during tests."""

    def __init__(self, userinfo: dict[str, Any]) -> None:
        self._userinfo = userinfo
        self.authorize_redirect = AsyncMock(side_effect=self._authorize_redirect)
        self.authorize_access_token = AsyncMock(return_value={"userinfo": self._userinfo})

    async def _authorize_redirect(self, request: Any, redirect_uri: str) -> Any:
        return RedirectResponse(url="https://provider.example/authorize")


@pytest.fixture(autouse=True)
def _fake_oauth_clients(monkeypatch: pytest.MonkeyPatch) -> dict[str, _FakeProviderClient]:
    """Replace every registered provider client with a fake, keyed by provider name."""
    fakes = {
        "google": _FakeProviderClient({"email": "alice@acme.com", "email_verified": True}),
        "apple": _FakeProviderClient({"email": "bob@acme.com", "email_verified": True}),
        "microsoft": _FakeProviderClient({"email": "carol@acme.com"}),
    }

    def _fake_create_client(name: str) -> _FakeProviderClient:
        return fakes[name]

    monkeypatch.setattr(auth_router.oauth, "create_client", _fake_create_client)
    return fakes


def test_login_redirects_to_provider(sso_client: TestClient) -> None:
    response = sso_client.get("/api/auth/login/google", follow_redirects=False)

    assert response.status_code in (302, 307)


def test_login_rejects_unknown_provider(sso_client: TestClient) -> None:
    response = sso_client.get("/api/auth/login/facebook", follow_redirects=False)

    assert response.status_code == 404


def test_callback_creates_user_and_sets_session_cookie(sso_client: TestClient) -> None:
    response = sso_client.get("/api/auth/callback/google", follow_redirects=False)

    assert response.status_code in (302, 307)
    assert "walker_session" in response.cookies

    me = sso_client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "alice@acme.com"


def test_callback_joins_existing_organization_by_domain(sso_client: TestClient) -> None:
    sso_client.get("/api/auth/callback/google", follow_redirects=False)  # alice@acme.com
    sso_client.cookies.clear()

    response = sso_client.get("/api/auth/callback/apple", follow_redirects=False)  # bob@acme.com
    assert response.status_code in (302, 307)

    me = sso_client.get("/api/auth/me").json()
    assert me["email"] == "bob@acme.com"


def test_callback_reuses_existing_user_on_repeat_login(sso_client: TestClient, session: Any) -> None:
    sso_client.get("/api/auth/callback/google", follow_redirects=False)
    sso_client.cookies.clear()
    sso_client.get("/api/auth/callback/google", follow_redirects=False)

    assert session.query(User).filter_by(email="alice@acme.com").count() == 1


def test_me_requires_a_session(sso_client: TestClient) -> None:
    response = sso_client.get("/api/auth/me")

    assert response.status_code == 401


def test_protected_endpoint_requires_a_session(sso_client: TestClient) -> None:
    response = sso_client.get("/api/settings")

    assert response.status_code == 401


def test_protected_endpoint_works_after_login(sso_client: TestClient) -> None:
    sso_client.get("/api/auth/callback/google", follow_redirects=False)

    response = sso_client.get("/api/settings")

    assert response.status_code == 200


def test_logout_clears_the_session_cookie(sso_client: TestClient) -> None:
    sso_client.get("/api/auth/callback/google", follow_redirects=False)
    assert sso_client.get("/api/auth/me").status_code == 200

    logout = sso_client.post("/api/auth/logout")
    assert logout.status_code == 200

    assert sso_client.get("/api/auth/me").status_code == 401


def test_callback_with_microsoft_missing_email_verified_flag_still_logs_in(sso_client: TestClient) -> None:
    """Microsoft's userinfo response doesn't always carry ``email_verified``; it must not be required."""
    response = sso_client.get("/api/auth/callback/microsoft", follow_redirects=False)

    assert response.status_code in (302, 307)
    me = sso_client.get("/api/auth/me")
    assert me.json()["email"] == "carol@acme.com"


def test_callback_rejects_unverified_email(
    sso_client: TestClient, _fake_oauth_clients: dict[str, _FakeProviderClient]
) -> None:
    _fake_oauth_clients["google"]._userinfo = {"email": "mallory@acme.com", "email_verified": False}
    _fake_oauth_clients["google"].authorize_access_token = AsyncMock(
        return_value={"userinfo": {"email": "mallory@acme.com", "email_verified": False}}
    )

    response = sso_client.get("/api/auth/callback/google", follow_redirects=False)

    assert response.status_code == 401


def test_callback_persists_user_scoped_to_organization(sso_client: TestClient, session: Any) -> None:
    sso_client.get("/api/auth/callback/google", follow_redirects=False)

    user = session.query(User).filter_by(email="alice@acme.com").one()
    assert user.organization_id is not None


def test_callback_rejects_missing_email(
    sso_client: TestClient, _fake_oauth_clients: dict[str, _FakeProviderClient]
) -> None:
    _fake_oauth_clients["google"].authorize_access_token = AsyncMock(return_value={"userinfo": {}})

    response = sso_client.get("/api/auth/callback/google", follow_redirects=False)

    assert response.status_code == 401


def test_me_rejects_a_valid_token_for_a_deleted_user(sso_client: TestClient) -> None:
    stale_token = create_session_token(user_id=999999, secret=auth_router.settings.session_secret, max_age_seconds=60)
    sso_client.cookies.set("walker_session", stale_token)

    response = sso_client.get("/api/auth/me")

    assert response.status_code == 401
