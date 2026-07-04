"""entry task link

Revision ID: 2dcd1014de82
Revises: c78f0831d366
Create Date: 2026-07-03 21:37:10.129786
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "2dcd1014de82"
down_revision: str | None = "c78f0831d366"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # A nullable Task reference on the Entry (BIZ-023), set when a Timer is started from a Task —
    # batch mode: SQLite requires rebuilding the table to add a foreign key constraint.
    with op.batch_alter_table("entries", schema=None) as batch_op:
        batch_op.add_column(sa.Column("task_id", sa.Integer(), nullable=True))
        batch_op.create_index(op.f("ix_entries_task_id"), ["task_id"], unique=False)
        batch_op.create_foreign_key("fk_entries_task_id_tasks", "tasks", ["task_id"], ["id"])


def downgrade() -> None:
    with op.batch_alter_table("entries", schema=None) as batch_op:
        batch_op.drop_constraint("fk_entries_task_id_tasks", type_="foreignkey")
        batch_op.drop_index(op.f("ix_entries_task_id"))
        batch_op.drop_column("task_id")
