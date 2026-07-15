"""code customer and type (T&E grid ordering, BIZ-068)

Revision ID: b1c2d3e4f5a6
Revises: a7b8c9d0e1f2
Create Date: 2026-07-15 00:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b1c2d3e4f5a6"
down_revision: str | None = "a7b8c9d0e1f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Nullable: codes imported/created before the enriched catalog keep NULL and sort last (BIZ-068).
    for table in ("timesheet_codes", "reference_codes"):
        op.add_column(table, sa.Column("customer", sa.String(length=255), nullable=True))
        op.add_column(table, sa.Column("code_type", sa.String(length=1), nullable=True))


def downgrade() -> None:
    for table in ("timesheet_codes", "reference_codes"):
        op.drop_column(table, "code_type")
        op.drop_column(table, "customer")
