"""reference_codes.search_blob - normalized fuzzy-search key (TEC-011)

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
Create Date: 2026-07-16 00:00:00.000000
"""

from __future__ import annotations

import json
import unicodedata
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c2d3e4f5a6b7"
down_revision: str | None = "b1c2d3e4f5a6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _normalize(text: str) -> str:
    """Self-contained copy of the search normalization (kept inline so the migration is stable)."""
    decomposed = unicodedata.normalize("NFD", text)
    without_marks = "".join(ch for ch in decomposed if not unicodedata.combining(ch))
    return "".join(ch for ch in without_marks.lower() if ch.isalnum())


def upgrade() -> None:
    op.add_column(
        "reference_codes",
        sa.Column("search_blob", sa.String(length=1000), nullable=False, server_default=""),
    )
    # Backfill existing rows: number + name + label + activity labels, normalized.
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, number, name, label, activities FROM reference_codes")).fetchall()
    for row_id, number, name, label, activities in rows:
        try:
            acts = json.loads(activities) if isinstance(activities, str) else (activities or [])
        except (TypeError, ValueError):
            acts = []
        labels = [a.get("label", "") for a in acts if isinstance(a, dict)]
        blob = _normalize(" ".join([number or "", name or "", label or "", *labels]))
        bind.execute(
            sa.text("UPDATE reference_codes SET search_blob = :blob WHERE id = :id"),
            {"blob": blob, "id": row_id},
        )


def downgrade() -> None:
    op.drop_column("reference_codes", "search_blob")
