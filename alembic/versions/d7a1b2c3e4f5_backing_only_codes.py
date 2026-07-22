"""backing-only real codes

Revision ID: d7a1b2c3e4f5
Revises: c2d3e4f5a6b7
Create Date: 2026-07-22 12:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d7a1b2c3e4f5"
down_revision: str | None = "c2d3e4f5a6b7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # BIZ-075 (ADR-0012): a nullable-defaulting flag marking a real code that exists only to back a
    # virtual code. Existing rows are all first-class codes, so they default to False. SQLite needs a
    # server default to backfill the NOT NULL column on existing rows.
    with op.batch_alter_table("timesheet_codes", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column("backing_only", sa.Boolean(), nullable=False, server_default=sa.false())
        )


def downgrade() -> None:
    with op.batch_alter_table("timesheet_codes", schema=None) as batch_op:
        batch_op.drop_column("backing_only")
