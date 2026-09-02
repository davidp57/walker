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

# How long a SQLite connection waits for a write lock before giving up with "database is locked".
# SQLite serialises writers even under WAL, and a bulk catalog import holds the write lock for far
# longer than the 5 s the ``sqlite3`` driver defaults to — a concurrent request then failed outright
# instead of simply waiting its turn.
_BUSY_TIMEOUT_MS = 30_000


def _configure_sqlite_engine(sqlite_engine: Engine) -> None:
    """Set WAL journaling, foreign-key enforcement, and a write-lock timeout on new SQLite connections.

    WAL (Write-Ahead Logging) lets concurrent readers proceed without blocking on a writer —
    SQLite still allows only one writer at a time (see TEC-005), hence ``busy_timeout``, which makes
    a second writer wait rather than fail. All three PRAGMAs are per-connection state in SQLite, so
    they must be reapplied on every new DBAPI connection rather than once at engine-creation time.
    """

    @event.listens_for(sqlite_engine, "connect")
    def _set_sqlite_pragmas(dbapi_connection: Any, connection_record: Any) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute(f"PRAGMA busy_timeout={_BUSY_TIMEOUT_MS}")
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
