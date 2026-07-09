"""Migration test: Task.status Enum→String + seeded per-user task states (BIZ-056, ADR-0011).

Runs the real Alembic chain in a subprocess against a temp SQLite file (same technique as
``test_migration_catalog_organization_scoped.py`` — ``alembic/env.py`` reads the DB URL from the
``walker.config.settings`` singleton at import time, so it must be set before import).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import sqlalchemy as sa

_REPO_ROOT = Path(__file__).resolve().parents[1]
_BEFORE = "b1f2c3d4e5a6"
_UNDER_TEST = "c4d5e6f7a8b9"


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


def test_status_becomes_free_string_and_states_are_seeded(tmp_path: Path) -> None:
    db_path = tmp_path / "states.db"
    database_url = f"sqlite:///{db_path.as_posix()}"

    _run_alembic("upgrade", _BEFORE, database_url=database_url)

    engine = sa.create_engine(database_url, future=True)
    with engine.begin() as connection:
        connection.execute(sa.text("INSERT INTO users (id, username) VALUES (1, 'me')"))
        connection.execute(
            sa.text(
                "INSERT INTO settings (id, user_id, workdays, density, period_scheme, theme, view_preferences) "
                "VALUES (1, 1, '0111110', 'comfortable', 'semi_monthly', 'system', '{}')"
            )
        )
        connection.execute(
            sa.text("INSERT INTO tasks (id, user_id, title, status, tags) VALUES (1, 1, 'Old task', 'done', '[]')")
        )

    _run_alembic("upgrade", _UNDER_TEST, database_url=database_url)

    engine = sa.create_engine(database_url, future=True)
    with engine.begin() as connection:
        # The existing Task keeps its status (unchanged in meaning).
        assert connection.execute(sa.text("SELECT status FROM tasks WHERE id = 1")).scalar_one() == "done"
        # The user's settings are seeded with the five defaults, in order.
        raw = connection.execute(sa.text("SELECT task_states FROM settings WHERE user_id = 1")).scalar_one()
        seeded = json.loads(raw)
        assert [s["id"] for s in seeded] == ["todo", "in_progress", "waiting", "test", "done"]
        # The CHECK constraint is gone — an opaque, user-defined id now inserts fine.
        connection.execute(
            sa.text("INSERT INTO tasks (id, user_id, title, status, tags) VALUES (3, 1, 'y', 'ab12cd34', '[]')")
        )
        assert connection.execute(sa.text("SELECT status FROM tasks WHERE id = 3")).scalar_one() == "ab12cd34"
