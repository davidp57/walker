"""Migration test: backfilling existing Users into an Organization of one (BIZ-028).

Runs the real Alembic migration chain (via the ``alembic`` CLI, in a subprocess) against a temporary
SQLite file so the test exercises the same upgrade path used in production, not a re-implementation
of it. A subprocess is required because ``alembic/env.py`` reads the database URL from
``walker.config.settings`` — a module-level singleton read once at import time — so pointing it at an
isolated database means setting ``WALKER_DATABASE_URL`` before that module is ever imported.
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import sqlalchemy as sa

_REPO_ROOT = Path(__file__).resolve().parents[1]


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


def test_backfill_gives_each_existing_user_its_own_organization(tmp_path: Path) -> None:
    db_path = tmp_path / "backfill.db"
    database_url = f"sqlite:///{db_path.as_posix()}"

    # Migrate up to just before the Organization migration, seed two pre-existing Users (mirroring
    # a standalone install's implicit user — no email, ADR-0007), then run the migration under test.
    _run_alembic("upgrade", "2dcd1014de82", database_url=database_url)

    engine = sa.create_engine(database_url, future=True)
    with engine.begin() as connection:
        connection.execute(sa.text("INSERT INTO users (id, username) VALUES (1, 'me')"))
        connection.execute(sa.text("INSERT INTO users (id, username) VALUES (2, 'colleague')"))
    engine.dispose()

    _run_alembic("upgrade", "d3fe489557c3", database_url=database_url)

    engine = sa.create_engine(database_url, future=True)
    with engine.begin() as connection:
        rows = connection.execute(sa.text("SELECT id, organization_id, email FROM users ORDER BY id")).fetchall()
        org_domains = connection.execute(sa.text("SELECT id, email_domain FROM organizations")).fetchall()
    engine.dispose()

    assert len(rows) == 2
    # Every existing user got backfilled into an Organization — nothing is orphaned.
    assert all(row.organization_id is not None for row in rows)
    # Each pre-existing user ends up in its own Organization of one (never merged together).
    assert rows[0].organization_id != rows[1].organization_id
    # No email existed before the migration, so none is invented.
    assert all(row.email is None for row in rows)
    # Two users in, two Organizations out.
    assert len(org_domains) == 2
    assert len({domain for _, domain in org_domains}) == 2


def test_downgrade_removes_organization_and_user_columns(tmp_path: Path) -> None:
    db_path = tmp_path / "downgrade.db"
    database_url = f"sqlite:///{db_path.as_posix()}"

    _run_alembic("upgrade", "d3fe489557c3", database_url=database_url)
    _run_alembic("downgrade", "2dcd1014de82", database_url=database_url)

    engine = sa.create_engine(database_url, future=True)
    inspector = sa.inspect(engine)
    tables = inspector.get_table_names()
    user_columns = {col["name"] for col in inspector.get_columns("users")}
    engine.dispose()

    assert "organizations" not in tables
    assert "email" not in user_columns
    assert "organization_id" not in user_columns
