"""Tests for the current-user endpoint (CHR-004)."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session, sessionmaker

from walker.config import settings
from walker.models import User


def test_get_user_without_a_name(client: TestClient) -> None:
    body = client.get("/api/user").json()

    assert body["username"] == settings.default_user
    assert body["name"] is None


def test_get_user_surfaces_the_name_when_set(client: TestClient, session_factory: sessionmaker[Session]) -> None:
    # Trigger implicit user creation, then set a display name directly.
    client.get("/api/user")
    db = session_factory()
    try:
        user = db.query(User).filter_by(username=settings.default_user).one()
        user.name = "Jane Doe"
        db.commit()
    finally:
        db.close()

    body = client.get("/api/user").json()
    assert body["name"] == "Jane Doe"
