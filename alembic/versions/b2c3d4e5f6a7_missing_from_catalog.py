"""missing from catalog

Revision ID: b2c3d4e5f6a7
Revises: e1f2a3b4c5d6
Create Date: 2026-09-02 16:40:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b2c3d4e5f6a7"
down_revision: str | None = "e1f2a3b4c5d6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # BIZ-092: when a complete-catalog import last found this code's number missing from the file.
    # Nullable, and NULL for every existing row: no import has made that claim about them yet, and
    # backfilling one would invent a fact. The column is a prompt, not a verdict — a code can be
    # missing because the export was scoped too narrowly rather than because it closed.
    with op.batch_alter_table("timesheet_codes", schema=None) as batch_op:
        batch_op.add_column(sa.Column("missing_from_catalog_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("timesheet_codes", schema=None) as batch_op:
        batch_op.drop_column("missing_from_catalog_at")
