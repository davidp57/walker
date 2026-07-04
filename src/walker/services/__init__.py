"""Domain / service layer — business logic independent of the web layer.

Keep imputation, Timesheet period aggregation, catalog import, and timer rules here so the API
(and any future client) stays a thin adapter over these services (see ADR-0003). This
layer must not import from ``walker.api``.
"""
