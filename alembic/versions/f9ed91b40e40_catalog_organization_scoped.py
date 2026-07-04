"""catalog organization scoped

Revision ID: f9ed91b40e40
Revises: d3fe489557c3
Create Date: 2026-07-04 12:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f9ed91b40e40"
down_revision: str | None = "d3fe489557c3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Real codes (`real_code_id IS NULL`) move from `user_id` to `organization_id` scoping (ADR-0010,
    # BIZ-030): every member of an Organization shares one catalog. Virtual codes are untouched and
    # keep `organization_id` NULL — they stay scoped to `user_id` (ADR-0008). SQLite needs batch mode
    # to add a foreign key constraint.
    with op.batch_alter_table("timesheet_codes", schema=None) as batch_op:
        batch_op.add_column(sa.Column("organization_id", sa.Integer(), nullable=True))
        batch_op.create_index(op.f("ix_timesheet_codes_organization_id"), ["organization_id"], unique=False)
        batch_op.create_foreign_key(
            "fk_timesheet_codes_organization_id_organizations", "organizations", ["organization_id"], ["id"]
        )

    # Backfill: every existing real code gets the Organization its owning User was migrated into by
    # BIZ-028 (`d3fe489557c3`) — a standalone single-user deployment has one User in an Organization
    # of one, so its catalog keeps working exactly as before, just addressed by Organization now.
    connection = op.get_bind()
    codes_table = sa.table(
        "timesheet_codes",
        sa.column("id", sa.Integer),
        sa.column("user_id", sa.Integer),
        sa.column("organization_id", sa.Integer),
        sa.column("real_code_id", sa.Integer),
    )
    users_table = sa.table("users", sa.column("id", sa.Integer), sa.column("organization_id", sa.Integer))

    users = connection.execute(sa.select(users_table.c.id, users_table.c.organization_id))
    user_org_by_id = {row.id: row.organization_id for row in users}
    real_codes = connection.execute(
        sa.select(codes_table.c.id, codes_table.c.user_id).where(codes_table.c.real_code_id.is_(None))
    )
    for code_id, user_id in real_codes:
        org_id = user_org_by_id.get(user_id)
        if org_id is not None:
            connection.execute(codes_table.update().where(codes_table.c.id == code_id).values(organization_id=org_id))


def downgrade() -> None:
    with op.batch_alter_table("timesheet_codes", schema=None) as batch_op:
        batch_op.drop_constraint("fk_timesheet_codes_organization_id_organizations", type_="foreignkey")
        batch_op.drop_index(op.f("ix_timesheet_codes_organization_id"))
        batch_op.drop_column("organization_id")
