# BIZ-027 — Timesheet period rename + configurable period scheme

ID: BIZ-027
Status: ✅ done
Type: feature
Priority: P2

## Parent

Lot SHIP — `.backlog/SHIP/PRD.md`. Vocabulary already fixed in `CONTEXT.md`; see ADR-0009.

## What to build

Rename "Fortnight" to **Timesheet period** across backend, frontend, and docs (`fortnight_bounds` →
`period_bounds`, `FortnightGrid`/`FortnightScreen` → matching new names, `/api/fortnight/*` routes
renamed, every UI string). Alongside the rename, make the period **configurable**: a new `Settings`
field lets a User pick **weekly**, **semi-monthly**, or **monthly** — semi-monthly is today's
1st–15th/16th–end split and stays the default, so existing users see no behavior change unless they
opt into something else. No custom N-day cycles (rejected in ADR-0009).

## Acceptance criteria

- [x] No "Fortnight" wording remains in code, API routes, UI strings, or docs — replaced by "Timesheet
      period" throughout.
- [x] A User can choose weekly / semi-monthly / monthly as their period scheme in Settings; semi-monthly
      is the default and matches today's exact 1st–15th/16th–end boundaries.
- [x] Changing the period scheme immediately reshapes the Timesheet period view and its date boundaries
      — no stale cached period, no reload required.
- [x] `period_bounds(scheme, on_date)` is a pure function computing `(start, end)` per scheme, with no
      dependency on a database session.
- [x] Backend tests: exhaustive date-math coverage per scheme (prior art:
      `tests/test_services_fortnight.py`'s existing coverage style) + an API test that `period_scheme`
      round-trips through `/api/settings` (prior art: `tests/test_api_settings.py`).
- [x] Frontend tests: the period-scheme Settings control, and the Timesheet period view recomputing on
      change.

## Blocked by

None — can start immediately.
