# BIZ-086 — A period-relative recurring Task never becomes due

ID: BIZ-086
Status: 🔄 in-progress
Type: bug
Priority: P1

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

A Task set to recur relative to the Timesheet period (e.g. "period end − 1 day") never fires. Reported
on the last day of a period, where the user expected it to come due.

Three distinct defects stack up, and the first one alone is enough to make the feature inert.

### 1. No initial due date is ever computed (the blocker)

[`create_task`](../../../src/walker/services/tasks.py:100) stores `recurrence_rule` but never derives a
`due_date` from it. The recurrence is only ever advanced in
[`complete_task`](../../../src/walker/services/tasks.py:148) — i.e. on **completion**. So a recurring
Task created without a due date has `due_date = None` for ever: it is never overdue, never due today,
never badged, never in Focus. And it cannot be bootstrapped by completing it, because it never presents
itself as due in the first place. Same hole in `update_task`, which lets a rule be added to an existing
Task without seeding a date.

### 2. The period scheme is hardcoded

[`_next_period_relative`](../../../src/walker/services/recurrence.py:145) calls
`period_bounds("semi_monthly", …)` twice, a literal — even though ADR-0009 made the scheme a per-user
setting (`weekly` / `semi_monthly` / `monthly`) and `period_bounds` takes it as a parameter. A user on
`weekly` or `monthly` gets dates computed against a period they don't use, silently. The docstring
documents the semi-monthly assumption, so this reads as an oversight from before ADR-0009 rather than a
decision.

### 3. The first occurrence can never land in the current period

`_next_period_relative` takes `current_due`, finds *its* period, then deliberately steps to the
following one. Correct for a roll-forward after completion; wrong as a general "when is this next due".
With the fix for (1) naively applied — seeding from today — a Task created on 20 July with "period end
− 1 working day" would be due **14 August**, skipping the 30 July occurrence entirely.

## Solution

- **Seed the due date when a rule is set and no date is given** — in `create_task` and `update_task`,
  compute it through the same pure `next_due_date` path so there is one implementation.
- **Anchor on the current period when that date is still ahead**, else on the next one. "Period end − 1
  day" created on 20 July → 30 July; created on 31 July (already past) → the next period's. This is the
  decided semantics: a rule set today should fire this period if it still can.
  This means `next_due_date` needs to distinguish "advance past `current_due`" (roll-forward, today's
  behaviour) from "the first date at or after `from`" (seeding). Keep both explicit rather than
  overloading one function with a flag whose meaning has to be remembered at each call site.
- **Thread the user's `period_scheme` through** instead of the `"semi_monthly"` literal. `services/tasks`
  already reads the settings view for `workdays` and `absences`, so the scheme rides along; the pure
  function keeps taking it as an argument (no DB access in `services/recurrence`).

## Acceptance criteria

- [x] Creating a recurring Task with no due date gives it one immediately.
- [x] Adding a rule to an existing dateless Task seeds a date too.
- [x] "Period end − 1 working day" set mid-period is due **in that same period**; set after that date
      has passed, it lands in the next one. The occurrence falling on **today** counts as ahead — "at
      or after", not "after", which is the whole point of the reported case.
- [x] The date is computed against the user's own `period_scheme`, proven by a test where the same rule
      on the same day yields three different dates for `weekly` / `semi_monthly` / `monthly`.
- [x] Roll-forward on completion still advances to the *next* period (BIZ-025 tests untouched, beyond
      threading the scheme argument through).
- [x] Offsets still snap to working days, skipping weekends per the work rhythm and Absences.
- [x] An explicit due date is never overwritten by the seeding.
- [x] Quality gate clean (`ruff`, `mypy`, 356 pytest, 95%). Backend-only — the SPA already sends a null
      due date and renders whatever comes back, so no frontend change was needed.
- [x] Verified live against a copy of the real settings (Wed–Fri work rhythm, real Absences): a rule
      anchored on the period end with offset 0, created on the period's **last day**, comes due **that
      day** instead of skipping a month — the reported symptom. With offset −1 it seeded 2026-08-13,
      correctly stepping over the 2026-08-14 Absence.

## Design note: two functions, not a flag

`next_due_date` (advance *past* a date) and `first_due_date` (first occurrence *at or after* a date) are
kept as separate functions. A boolean on one function would put the distinction at the call site, where
it is exactly the kind of thing that gets passed wrong — and getting it wrong is invisible, since both
answers are plausible dates. `period_scheme` is likewise a **required** argument: defaulting it is how
it came to be hardcoded in the first place.

## Blocked by

None.
