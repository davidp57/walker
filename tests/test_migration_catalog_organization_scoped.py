"""Migration test: backfilling real codes onto their owning User's Organization (BIZ-030).

Runs the real Alembic migration chain (via the ``alembic`` CLI, in a subprocess) against a temporary
SQLite file, mirroring ``test_migration_organization_backfill.py`` (BIZ-028). A subprocess is required
because ``alembic/env.py`` reads the database URL from ``walker.config.settings`` — a module-level
singleton read once at import time — so pointing it at an isolated database means setting
``WALKER_DATABASE_URL`` before that module is ever imported.
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


def test_backfill_repoints_real_codes_at_the_owning_users_organization(tmp_path: Path) -> None:
    db_path = tmp_path / "catalog_backfill.db"
    database_url = f"sqlite:///{db_path.as_posix()}"

    # Migrate up to just before this migration (BIZ-028 already ran, so Users have Organizations),
    # seed two pre-existing real codes owned by two different Users, then run the migration under test.
    _run_alembic("upgrade", "d3fe489557c3", database_url=database_url)

    engine = sa.create_engine(database_url, future=True)
    with engine.begin() as connection:
        connection.execute(sa.text("INSERT INTO users (id, username) VALUES (1, 'me')"))
        connection.execute(sa.text("INSERT INTO users (id, username) VALUES (2, 'colleague')"))
        connection.execute(
            sa.text(
                "INSERT INTO organizations (id, email_domain) VALUES (100, 'org-a.invalid'), (200, 'org-b.invalid')"
            )
        )
        connection.execute(sa.text("UPDATE users SET organization_id = 100 WHERE id = 1"))
        connection.execute(sa.text("UPDATE users SET organization_id = 200 WHERE id = 2"))
        connection.execute(
            sa.text(
                "INSERT INTO timesheet_codes (id, user_id, number, label, name, color) "
                "VALUES (1, 1, 'N9/1042', 'MNT', 'MNT', '#111')"
            )
        )
        connection.execute(
            sa.text(
                "INSERT INTO timesheet_codes (id, user_id, number, label, name, color) "
                "VALUES (2, 2, 'N9/0007', 'INT', 'INT', '#222')"
            )
        )
    engine.dispose()

    _run_alembic("upgrade", "f9ed91b40e40", database_url=database_url)

    engine = sa.create_engine(database_url, future=True)
    with engine.begin() as connection:
        rows = connection.execute(
            sa.text("SELECT id, user_id, organization_id FROM timesheet_codes ORDER BY id")
        ).fetchall()
    engine.dispose()

    assert len(rows) == 2
    # Each real code lands in the Organization its owning User was migrated into by BIZ-028.
    assert rows[0].organization_id == 100
    assert rows[1].organization_id == 200


def test_downgrade_removes_organization_id_column(tmp_path: Path) -> None:
    db_path = tmp_path / "catalog_downgrade.db"
    database_url = f"sqlite:///{db_path.as_posix()}"

    _run_alembic("upgrade", "f9ed91b40e40", database_url=database_url)
    _run_alembic("downgrade", "d3fe489557c3", database_url=database_url)

    engine = sa.create_engine(database_url, future=True)
    inspector = sa.inspect(engine)
    code_columns = {col["name"] for col in inspector.get_columns("timesheet_codes")}
    engine.dispose()

    assert "organization_id" not in code_columns
