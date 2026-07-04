"""period scheme and checklist mark rename

Revision ID: a9cdfb036926
Revises: f9ed91b40e40
Create Date: 2026-07-04 13:19:56.643672
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a9cdfb036926"
down_revision: str | None = "f9ed91b40e40"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # BIZ-027 / ADR-0009: configurable Timesheet period scheme, defaulting to "semi_monthly" so
    # existing users see no behavior change.
    op.add_column(
        "settings",
        sa.Column("period_scheme", sa.String(length=20), nullable=False, server_default="semi_monthly"),
    )

    # "Fortnight" -> "Timesheet period" rename (BIZ-027): the checklist mark's anchor column.
    with op.batch_alter_table("checklist_marks", recreate="always") as batch_op:
        batch_op.drop_index("ix_checklist_marks_fortnight_start")
        batch_op.drop_constraint("uq_checklist_mark", type_="unique")
        batch_op.alter_column("fortnight_start", new_column_name="period_start")

    op.create_index("ix_checklist_marks_period_start", "checklist_marks", ["period_start"], unique=False)
    with op.batch_alter_table("checklist_marks") as batch_op:
        batch_op.create_unique_constraint(
            "uq_checklist_mark",
            ["user_id", "period_start", "timesheet_code_id", "activity", "day"],
        )


def downgrade() -> None:
    with op.batch_alter_table("checklist_marks") as batch_op:
        batch_op.drop_constraint("uq_checklist_mark", type_="unique")

    with op.batch_alter_table("checklist_marks", recreate="always") as batch_op:
        batch_op.drop_index("ix_checklist_marks_period_start")
        batch_op.alter_column("period_start", new_column_name="fortnight_start")

    op.create_index("ix_checklist_marks_fortnight_start", "checklist_marks", ["fortnight_start"], unique=False)
    with op.batch_alter_table("checklist_marks") as batch_op:
        batch_op.create_unique_constraint(
            "uq_checklist_mark",
            ["user_id", "fortnight_start", "timesheet_code_id", "activity", "day"],
        )

    op.drop_column("settings", "period_scheme")
