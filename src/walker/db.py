"""Database engine, session factory, and the FastAPI session dependency.

Engine-agnostic on purpose (see ADR-0004): only the ``database_url`` changes to move
from embedded SQLite to an external DBMS.
"""

from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from walker.config import settings

_connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=_connect_args, future=True)
SessionFactory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    """Yield a database session, closing it when the request ends."""
    session = SessionFactory()
    try:
        yield session
    finally:
        session.close()
