"""settings theme preference

Revision ID: 30f1671e028d
Revises: a9cdfb036926
Create Date: 2026-07-05 11:05:14.875885
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "30f1671e028d"
down_revision: str | None = "a9cdfb036926"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # BIZ-031 / ADAPTIVE: per-user theme preference, defaulting to "system" so existing users keep
    # following their OS's prefers-color-scheme.
    op.add_column(
        "settings",
        sa.Column("theme", sa.String(length=20), nullable=False, server_default="system"),
    )


def downgrade() -> None:
    op.drop_column("settings", "theme")
