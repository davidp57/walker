"""obsolete codes

Revision ID: a1b2c3d4e5f6
Revises: d7a1b2c3e4f5
Create Date: 2026-08-07 15:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: str | None = "d7a1b2c3e4f5"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # BIZ-090: a retired code — hidden from the catalog (behind a toggle) and from every picker, but
    # still fully resolvable so past Entries stay readable. Every existing code is live, so they
    # default to False. SQLite needs a server default to backfill the NOT NULL column on existing rows.
    with op.batch_alter_table("timesheet_codes", schema=None) as batch_op:
        batch_op.add_column(sa.Column("obsolete", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    with op.batch_alter_table("timesheet_codes", schema=None) as batch_op:
        batch_op.drop_column("obsolete")
