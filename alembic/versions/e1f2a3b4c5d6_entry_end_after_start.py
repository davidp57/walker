"""entry end must not precede its start

Revision ID: e1f2a3b4c5d6
Revises: a1b2c3d4e5f6
Create Date: 2026-08-21 10:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "e1f2a3b4c5d6"
down_revision: str | None = "a1b2c3d4e5f6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_CONSTRAINT = "ck_entries_end_after_start"


def upgrade() -> None:
    # BIZ-091: a Timer left running across midnight used to be closed with *today's*
    # minutes-since-midnight, writing an end before the start of an entry dated yesterday — a negative
    # duration that read as 0:00 everywhere. Repair such rows first: the honest value is zero minutes
    # (Walker cannot know when the user stopped and invents nothing — ADR-0005), and the frontend
    # prompts for the real end time. Only then can the invariant be enforced.
    op.execute(sa.text("UPDATE entries SET end_minute = start_minute WHERE end_minute < start_minute"))
    # SQLite cannot ALTER TABLE ADD CONSTRAINT — batch mode rebuilds the table.
    with op.batch_alter_table("entries", schema=None) as batch_op:
        batch_op.create_check_constraint(_CONSTRAINT, "end_minute IS NULL OR end_minute >= start_minute")


def downgrade() -> None:
    with op.batch_alter_table("entries", schema=None) as batch_op:
        batch_op.drop_constraint(_CONSTRAINT, type_="check")
