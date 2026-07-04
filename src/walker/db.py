"""Database engine, session factory, and the FastAPI session dependency.

Engine-agnostic on purpose (see ADR-0004): only the ``database_url`` changes to move
from embedded SQLite to an external DBMS.
"""

from __future__ import annotations

from collections.abc import Iterator
from typing import Any

from sqlalchemy import Engine, create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from walker.config import settings

_connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}


def _configure_sqlite_engine(sqlite_engine: Engine) -> None:
    """Enable WAL journaling and foreign-key enforcement on every new SQLite connection.

    WAL (Write-Ahead Logging) lets concurrent readers proceed without blocking on a writer —
    SQLite still allows only one writer at a time (see TEC-005). Both PRAGMAs are per-connection
    state in SQLite, so they must be reapplied on every new DBAPI connection rather than once at
    engine-creation time.
    """

    @event.listens_for(sqlite_engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection: Any, connection_record: Any) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


engine = create_engine(settings.database_url, connect_args=_connect_args, future=True)
if settings.database_url.startswith("sqlite"):
    _configure_sqlite_engine(engine)
SessionFactory = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    """Yield a database session, closing it when the request ends."""
    session = SessionFactory()
    try:
        yield session
    finally:
        session.close()
