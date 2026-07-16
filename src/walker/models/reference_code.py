"""The ReferenceCode model — the full imported Timesheet-system catalog to pick active codes from.

Separate from :class:`TimesheetCode` (the user's *active* codes): the reference table can hold the
whole firm catalog (tens of thousands of rows) and is only searched + copied, so its activities are
kept inline as JSON rather than as their own table.
"""

from __future__ import annotations

from sqlalchemy import JSON, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from walker.models.base import Base, TimestampMixin


class ReferenceCode(TimestampMixin, Base):
    """A code in the reference catalog: number, labels, and its activities as ``[{code, label}]``."""

    __tablename__ = "reference_codes"
    __table_args__ = (UniqueConstraint("user_id", "number", name="uq_reference_code_user_number"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    number: Mapped[str] = mapped_column(String(50), index=True)
    label: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    # T&E grid ordering keys (BIZ-068): client name + single-char type (C/N/A). Nullable — absent from
    # the pre-enrichment CSV layouts.
    customer: Mapped[str | None] = mapped_column(String(255), default=None)
    code_type: Mapped[str | None] = mapped_column(String(1), default=None)
    activities: Mapped[list[dict[str, str]]] = mapped_column(JSON, default=list)
    # TEC-011: precomputed fuzzy-search key — number + name + label + activity labels, normalized
    # (lower-cased, accents stripped, non-alphanumerics dropped) so "HRHUB" matches "HR Hub". Kept in
    # sync on every import; searched with a substring LIKE.
    search_blob: Mapped[str] = mapped_column(String(1000), default="", index=False)
