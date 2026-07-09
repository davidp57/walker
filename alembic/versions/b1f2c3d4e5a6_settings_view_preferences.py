"""settings view preferences

Revision ID: b1f2c3d4e5a6
Revises: 30f1671e028d
Create Date: 2026-07-09 00:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b1f2c3d4e5a6"
down_revision: str | None = "30f1671e028d"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # BIZ-053: per-user view preferences (task view/group/sort, period mode, Done collapse) as a JSON
    # bag, defaulting to "{}" so existing users resolve to the built-in defaults until they change one.
    op.add_column(
        "settings",
        sa.Column("view_preferences", sa.JSON(), nullable=False, server_default=sa.text("'{}'")),
    )


def downgrade() -> None:
    op.drop_column("settings", "view_preferences")
