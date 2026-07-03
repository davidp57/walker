"""virtual codes

Revision ID: b3b4a90edd53
Revises: ee96a7476366
Create Date: 2026-07-03 15:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b3b4a90edd53"
down_revision: str | None = "ee96a7476366"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # A virtual code (ADR-0008) shares its real code's `number`, so `number` uniqueness moves from a
    # DB constraint to the service layer (scoped to real codes only) — batch mode: SQLite requires
    # rebuilding the table to drop a unique constraint.
    with op.batch_alter_table("timesheet_codes", schema=None) as batch_op:
        batch_op.add_column(sa.Column("real_code_id", sa.Integer(), nullable=True))
        batch_op.drop_constraint("uq_timesheet_code_user_number", type_="unique")
        batch_op.create_index(op.f("ix_timesheet_codes_real_code_id"), ["real_code_id"], unique=False)
        batch_op.create_foreign_key(
            "fk_timesheet_codes_real_code_id_timesheet_codes", "timesheet_codes", ["real_code_id"], ["id"]
        )


def downgrade() -> None:
    with op.batch_alter_table("timesheet_codes", schema=None) as batch_op:
        batch_op.drop_constraint("fk_timesheet_codes_real_code_id_timesheet_codes", type_="foreignkey")
        batch_op.drop_index(op.f("ix_timesheet_codes_real_code_id"))
        batch_op.drop_column("real_code_id")
        batch_op.create_unique_constraint("uq_timesheet_code_user_number", ["user_id", "number"])
