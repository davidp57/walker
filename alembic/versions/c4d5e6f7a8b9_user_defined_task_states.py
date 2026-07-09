"""user-defined task states

Revision ID: c4d5e6f7a8b9
Revises: b1f2c3d4e5a6
Create Date: 2026-07-09 00:00:00.000000
"""

from __future__ import annotations

import json
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c4d5e6f7a8b9"
down_revision: str | None = "b1f2c3d4e5a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_ENUM = sa.Enum("todo", "in_progress", "waiting", "test", "done", name="taskstatus")

# The five default states, ids matching the old enum values (so no Task status needs rewriting).
# Hardcoded here — a migration must stay self-contained, not import the evolving app code.
_DEFAULT_STATES = json.dumps(
    [
        {"id": "todo", "label": "To-do"},
        {"id": "in_progress", "label": "In progress"},
        {"id": "waiting", "label": "Waiting"},
        {"id": "test", "label": "Test"},
        {"id": "done", "label": "Done"},
    ]
)


def upgrade() -> None:
    # BIZ-056 (ADR-0011): `Task.status` becomes an opaque string id from the user's per-user state
    # list, not a fixed enum. Recreate the column as a plain String so the SQLite CHECK constraint
    # the Enum created (status IN ('todo', …)) is dropped — otherwise user-defined ids would be
    # rejected. The five default state ids keep the old enum values, so no status value is rewritten.
    with op.batch_alter_table("tasks", recreate="always") as batch:
        batch.alter_column("status", existing_type=_ENUM, type_=sa.String(length=40), existing_nullable=False)

    # Per-user ordered state list (each {"id", "label"}); new rows default to "[]" (resolved to the
    # built-in defaults at read time).
    op.add_column(
        "settings",
        sa.Column("task_states", sa.JSON(), nullable=False, server_default=sa.text("'[]'")),
    )
    # Seed every existing user's settings with the five defaults (AC: seeds the defaults per user).
    op.execute(sa.text("UPDATE settings SET task_states = :states").bindparams(states=_DEFAULT_STATES))


def downgrade() -> None:
    op.drop_column("settings", "task_states")
    with op.batch_alter_table("tasks", recreate="always") as batch:
        batch.alter_column("status", existing_type=sa.String(length=40), type_=_ENUM, existing_nullable=False)
