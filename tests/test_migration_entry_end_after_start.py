"""Migration test: repair then forbid an Entry ending before it starts (BIZ-091).

Production already held such a row when this shipped — a Timer started at 10:00 and closed the next
morning with that morning's minute — so the migration must repair before it constrains, or it would
fail on the very database that needs it.

Runs the real Alembic chain in a subprocess against a temp SQLite file (same technique as
``test_migration_user_defined_states.py``).
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import pytest
import sqlalchemy as sa

_REPO_ROOT = Path(__file__).resolve().parents[1]
_BEFORE = "a1b2c3d4e5f6"
_UNDER_TEST = "e1f2a3b4c5d6"


def _run_alembic(*args: str, database_url: str) -> None:
    env = {**os.environ, "WALKER_DATABASE_URL": database_url}
    subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=_REPO_ROOT,
        env=env,
        check=True,
        capture_output=True,
        text=True,
    )


def test_a_negative_duration_is_flattened_and_then_made_unrepresentable(tmp_path: Path) -> None:
    db_path = tmp_path / "spans.db"
    database_url = f"sqlite:///{db_path.as_posix()}"

    _run_alembic("upgrade", _BEFORE, database_url=database_url)

    engine = sa.create_engine(database_url, future=True)
    with engine.begin() as connection:
        connection.execute(sa.text("INSERT INTO users (id, username) VALUES (1, 'me')"))
        # The production row: 10:00 on 2026-08-20, closed at 09:02 the next morning.
        connection.execute(
            sa.text(
                "INSERT INTO entries (id, user_id, date, start_minute, end_minute, source) "
                "VALUES (1, 1, '2026-08-20', 600, 542, 'timer')"
            )
        )
        # A sane entry and a still-running timer, both of which must survive untouched.
        connection.execute(
            sa.text(
                "INSERT INTO entries (id, user_id, date, start_minute, end_minute, source) "
                "VALUES (2, 1, '2026-08-20', 570, 589, 'timer')"
            )
        )
        connection.execute(
            sa.text(
                "INSERT INTO entries (id, user_id, date, start_minute, end_minute, source) "
                "VALUES (3, 1, '2026-08-21', 546, NULL, 'timer')"
            )
        )
    engine.dispose()

    _run_alembic("upgrade", _UNDER_TEST, database_url=database_url)

    engine = sa.create_engine(database_url, future=True)
    with engine.begin() as connection:
        spans = connection.execute(sa.text("SELECT id, start_minute, end_minute FROM entries ORDER BY id")).all()
    assert spans == [(1, 600, 600), (2, 570, 589), (3, 546, None)]

    # And the invariant now holds at the storage layer, whatever the code above it does.
    with pytest.raises(sa.exc.IntegrityError), engine.begin() as connection:
        connection.execute(
            sa.text(
                "INSERT INTO entries (id, user_id, date, start_minute, end_minute) "
                "VALUES (4, 1, '2026-08-22', 600, 542)"
            )
        )
    engine.dispose()
