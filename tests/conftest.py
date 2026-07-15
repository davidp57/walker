"""Shared pytest fixtures for Walker tests.

The API is exercised end-to-end (the primary seam) against an isolated in-memory SQLite
database: a ``StaticPool`` keeps a single connection so the seeding ``session`` fixture and
the API share the same schema and rows.
"""

from __future__ import annotations

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from walker.api.app import create_app
from walker.config import settings
from walker.db import _configure_sqlite_engine, get_session
from walker.models import Base


@pytest.fixture
def session_factory() -> Iterator[sessionmaker[Session]]:
    """A session factory bound to a fresh, isolated in-memory SQLite database."""
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    # Apply the same per-connection PRAGMAs as production (foreign_keys=ON, WAL) so tests exercise
    # real foreign-key enforcement rather than SQLite's default lax behavior.
    _configure_sqlite_engine(engine)
    Base.metadata.create_all(engine)
    try:
        yield sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    finally:
        engine.dispose()


@pytest.fixture
def session(session_factory: sessionmaker[Session]) -> Iterator[Session]:
    """A database session for seeding and inspecting test data."""
    db = session_factory()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(session_factory: sessionmaker[Session]) -> Iterator[TestClient]:
    """A TestClient whose API uses the isolated test database."""
    app = create_app()

    def _override_get_session() -> Iterator[Session]:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_session] = _override_get_session
    # No `with`: the app lifespan (which stops running timers on shutdown against the real DB) must
    # not run during tests — the API uses the injected in-memory session instead.
    yield TestClient(app)


@pytest.fixture
def sso_client(session_factory: sessionmaker[Session], monkeypatch: pytest.MonkeyPatch) -> Iterator[TestClient]:
    """A TestClient with ``auth_mode=sso``, for exercising the hosted-deployment login flow.

    Kept separate from ``client`` (which stays on the ``none`` default) so a regression that
    accidentally flips the default cannot slip past the standalone-mode tests.
    """
    monkeypatch.setattr(settings, "auth_mode", "sso")
    monkeypatch.setattr(settings, "session_secret", "test-session-secret-not-for-prod")
    monkeypatch.setattr(settings, "google_client_id", "google-client-id")
    monkeypatch.setattr(settings, "google_client_secret", "google-client-secret")
    monkeypatch.setattr(settings, "apple_client_id", "apple-client-id")
    monkeypatch.setattr(settings, "apple_client_secret", "apple-client-secret")
    monkeypatch.setattr(settings, "microsoft_client_id", "microsoft-client-id")
    monkeypatch.setattr(settings, "microsoft_client_secret", "microsoft-client-secret")

    app = create_app()

    def _override_get_session() -> Iterator[Session]:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_session] = _override_get_session
    # A dotted base_url (rather than TestClient's default bare "testserver") so httpx's cookie jar
    # stores the session cookie under the same host it later sends requests to: with a single-label
    # host, some http.cookiejar versions store/match cookies under a synthesized "testserver.local",
    # silently dropping them on the next request.
    yield TestClient(app, base_url="https://testserver.local")
