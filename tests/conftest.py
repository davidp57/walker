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
from walker.db import get_session
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
