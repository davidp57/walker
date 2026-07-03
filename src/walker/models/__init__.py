"""ORM models.

Import every model here so that ``Base.metadata`` — used by Alembic autogenerate and by
the test-database setup — sees them all. Data is scoped to a ``User`` from day one (ADR-0007).
"""

from walker.models.absence import Absence
from walker.models.activity import Activity
from walker.models.base import Base
from walker.models.checklist_mark import ChecklistMark
from walker.models.entry import Entry
from walker.models.reference_code import ReferenceCode
from walker.models.settings import Settings
from walker.models.task import Task, TaskPriority, TaskStatus
from walker.models.timesheet_code import TimesheetCode
from walker.models.user import User

__all__ = [
    "Absence",
    "Activity",
    "Base",
    "ChecklistMark",
    "Entry",
    "ReferenceCode",
    "Settings",
    "Task",
    "TaskPriority",
    "TaskStatus",
    "TimesheetCode",
    "User",
]
