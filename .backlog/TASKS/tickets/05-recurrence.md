# BIZ-020 — Recurring tasks (roll-forward)

ID: BIZ-020
Status: ⬜ ready
Type: feature
Priority: P3

## Parent

Lot TASKS — `.backlog/TASKS/PRD.md`.

## What to build

Let a Task carry a **recurrence rule**; completing a recurring Task **rolls it forward** — its due date
advances per the rule and its status resets to **To-do** (one active instance, **no history**). Rules:
**every N days**; **weekly** (chosen weekdays); **monthly** (day-of-month); and **fortnight-relative
with a working-day delta** (anchor = fortnight start 1st/16th or **end** 15th/month-end; offset by N
working days before/after; snapped to working days using the existing **work rhythm + Absences**). No
RRULE/iCal. The next-due computation is a **pure, dependency-injected function** (work rhythm + absences
as inputs).

## Acceptance criteria

- [ ] A Task can carry a recurrence rule of each kind: every N days; weekly; monthly; fortnight-relative working-day delta.
- [ ] Completing a recurring Task advances its due date per the rule and resets its status to To-do (one live instance, no history).
- [ ] The fortnight-relative rule snaps to working days using the work rhythm + absences (e.g. "last working day before a fortnight ends").
- [ ] Pure service tests for the recurrence date math (deterministic, seeded work rhythm + absences) + an API test for roll-forward on completion.

## Blocked by

BIZ-016.
