"""The TimesheetCode model — a real Timesheet-system charge code, scoped to an Organization."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from walker.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from walker.models.activity import Activity


class TimesheetCode(TimestampMixin, Base):
    """A Timesheet-system Timesheet code (e.g. ``N9/1042``) with its per-code activities.

    A code is either **real** (``real_code_id`` is ``None`` — exists in the Timesheet system,
    imported) or **virtual** (Walker-only, ``real_code_id`` points at exactly one real code — see
    ADR-0008). A real code is scoped by ``organization_id``: every member of the Organization sees
    and imputes against the same catalog (ADR-0010, BIZ-030). A virtual code stays scoped by
    ``user_id`` — personal classification, never shared; its ``organization_id`` is always ``None``.
    ``number`` uniqueness applies to real codes only, scoped per Organization and enforced in the
    service layer (``services/catalog.py``); a virtual code is identified by its ``name``.
    """

    __tablename__ = "timesheet_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    organization_id: Mapped[int | None] = mapped_column(ForeignKey("organizations.id"), default=None, index=True)
    number: Mapped[str] = mapped_column(String(50))
    label: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    color: Mapped[str] = mapped_column(String(32))
    # T&E grid ordering keys (BIZ-068), populated from the enriched catalog import; nullable so codes
    # imported/created before the enrichment still load. ``customer`` is the client name; ``code_type``
    # is the single-char T&E type (``C`` Chargeable · ``N`` Non-chargeable · ``A`` Absence).
    customer: Mapped[str | None] = mapped_column(String(255), default=None)
    code_type: Mapped[str | None] = mapped_column(String(1), default=None)
    real_code_id: Mapped[int | None] = mapped_column(ForeignKey("timesheet_codes.id"), default=None, index=True)

    activities: Mapped[list[Activity]] = relationship(
        back_populates="timesheet_code",
        cascade="all, delete-orphan",
        order_by="Activity.code",
    )
    real_code: Mapped[TimesheetCode | None] = relationship(
        remote_side="TimesheetCode.id", back_populates="virtual_codes"
    )
    virtual_codes: Mapped[list[TimesheetCode]] = relationship(back_populates="real_code")

    @property
    def is_virtual(self) -> bool:
        """``True`` when this code is Walker-only, backed by a real Timesheet-system code (ADR-0008)."""
        return self.real_code_id is not None

    @property
    def resolved_number(self) -> str:
        """The Timesheet-system number: own for a real code, borrowed from the real code for a virtual one."""
        return self.real_code.number if self.real_code is not None else self.number

    @property
    def resolved_label(self) -> str:
        """The technical Timesheet-system label: own for a real code, borrowed for a virtual one."""
        return self.real_code.label if self.real_code is not None else self.label

    @property
    def resolved_activities(self) -> list[Activity]:
        """The Activities available: own for a real code, borrowed for a virtual one."""
        return self.real_code.activities if self.real_code is not None else self.activities

    @property
    def resolved_customer(self) -> str | None:
        """The client name (BIZ-068): own for a real code, borrowed from the real code for a virtual one."""
        return self.real_code.customer if self.real_code is not None else self.customer

    @property
    def resolved_type(self) -> str | None:
        """The T&E type C/N/A (BIZ-068): own for a real code, borrowed for a virtual one."""
        return self.real_code.code_type if self.real_code is not None else self.code_type
