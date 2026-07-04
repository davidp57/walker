# CHR-003 — "T&E"/"Time & Expenses" → "Timesheet system" rename

ID: CHR-003
Status: ⬜ ready
Type: chore
Priority: P3

## Parent

Lot SHIP — `.backlog/SHIP/PRD.md`. Vocabulary already fixed in `CONTEXT.md`.

## What to build

Mechanical rename: every occurrence of "T&E" and "Time & Expenses" in code, comments, API
strings/labels, UI copy, and docs becomes "**Timesheet system**" (or "Timesheet-system" as an
adjective, per `CONTEXT.md`). Includes UI-visible labels like the "Enter in T&E" mode name in the
Fortnight/Timesheet-period screen. No behavior change — purely wording.

## Acceptance criteria

- [ ] No "T&E" or "Time & Expenses" string remains anywhere in `src/`, `frontend/src/`, or user-facing
      docs — replaced by "Timesheet system" per `CONTEXT.md`.
- [ ] Mode/screen labels that said "Enter in T&E" now say the generic equivalent, without breaking the
      existing mode-toggle behavior.
- [ ] Existing backend and frontend tests are updated in place (same assertions, new label text) — no
      new test scenarios needed since this changes no behavior.

## Blocked by

None — can start immediately.
