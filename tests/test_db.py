"""Regression guard for the SQLite PRAGMAs applied to Walker's sync engine (TEC-005).

WAL mode only takes effect on a file-backed database (in-memory ``sqlite://`` databases always
report ``memory`` regardless of the requested journal mode), so these tests spin up a throwaway
file-backed engine via ``walker.db._configure_sqlite_engine`` rather than asserting against the
in-memory engines used elsewhere in the test suite.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from walker.db import _configure_sqlite_engine
from walker.models import Task


def test_configure_sqlite_engine_enables_wal_mode(tmp_path: Path) -> None:
    """A connection from the configured engine reports WAL as its journal mode."""
    db_path = tmp_path / "wal.db"
    engine = create_engine(f"sqlite:///{db_path}", future=True)
    _configure_sqlite_engine(engine)

    try:
        with engine.connect() as connection:
            journal_mode = connection.execute(text("PRAGMA journal_mode")).scalar_one()
    finally:
        engine.dispose()

    assert journal_mode.lower() == "wal"


def test_configure_sqlite_engine_enables_foreign_keys(tmp_path: Path) -> None:
    """A connection from the configured engine reports foreign-key enforcement as on."""
    db_path = tmp_path / "fk.db"
    engine = create_engine(f"sqlite:///{db_path}", future=True)
    _configure_sqlite_engine(engine)

    try:
        with engine.connect() as connection:
            foreign_keys = connection.execute(text("PRAGMA foreign_keys")).scalar_one()
    finally:
        engine.dispose()

    assert foreign_keys == 1


def test_configure_sqlite_engine_applies_pragmas_to_new_connections(tmp_path: Path) -> None:
    """Each new connection from the pool gets the PRAGMAs, not just the first one."""
    db_path = tmp_path / "multi.db"
    engine = create_engine(f"sqlite:///{db_path}", future=True)
    _configure_sqlite_engine(engine)

    try:
        with engine.connect() as first:
            first.execute(text("SELECT 1"))
        with engine.connect() as second:
            journal_mode = second.execute(text("PRAGMA journal_mode")).scalar_one()
            foreign_keys = second.execute(text("PRAGMA foreign_keys")).scalar_one()
    finally:
        engine.dispose()

    assert journal_mode.lower() == "wal"
    assert foreign_keys == 1


def test_in_memory_test_session_enforces_foreign_keys(session: Session) -> None:
    """The shared in-memory test session rejects a dangling foreign key, matching production.

    Guards the suite-wide invariant wired in ``conftest`` (``_configure_sqlite_engine`` on the test
    engine): without ``foreign_keys=ON`` SQLite silently accepts orphan rows, which is exactly why
    the code-deletion FK crash slipped past the tests before.
    """
    session.add(Task(user_id=999, title="orphan"))
    with pytest.raises(IntegrityError):
        session.commit()
