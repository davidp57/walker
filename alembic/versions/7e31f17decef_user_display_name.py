"""user display name

Revision ID: 7e31f17decef
Revises: d3fe489557c3
Create Date: 2026-07-04 13:15:39.401703
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7e31f17decef"
down_revision: str | None = "d3fe489557c3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Optional display name shown in the shell footer (CHR-004); falls back to username when unset.
    op.add_column("users", sa.Column("name", sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "name")
