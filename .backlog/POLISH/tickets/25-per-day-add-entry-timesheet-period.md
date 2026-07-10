# BIZ-066 — Timesheet period view: a per-day-column "Add" action with the date prefilled

ID: BIZ-066
Status: ⬜ ready
Type: feature
Priority: P3

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`. Companion to BIZ-064 (same idea, applied to the period grid).

## Problem

Same friction as BIZ-064, in the **Timesheet period** view (Review mode). Today it offers a single
global **+ Add entry** (`PeriodScreen`, `App.openAddEntryInPeriod`) whose date defaults to today (or
the period start when viewing another period), plus a per-empty-**cell** add (`onAddCell(rowKey,
day)`) that requires picking a specific code row. There's no lightweight **per-day** add that
prefills just that column's date — the natural gesture in a Code × Day grid is "add to this day".

## Solution

Give **each day column** its own Add action that opens the manual-entry draft with that column's date
prefilled (code/activity empty, times defaulting as today's add does — nothing written until Save).
Mirror BIZ-064's visual treatment so the two views feel the same.

### Behaviour

- A per-column Add action in the table header of each **working** day column, and in each day-card
  header on the phone layout (`PeriodGrid` — both the table and `DayCards` renderings). Weekend /
  absence columns don't get it (matching the existing `onAddCell` `isWorkingDay` rule).
- It opens the draft with `date = that column's date` (extend `openAddEntryInPeriod` to take a day, or
  add a sibling handler). Review mode only — the Enter/checklist mode is for ticking, not adding.
- **Remove the global "+ Add entry"** button from the period view, replaced by the per-column
  actions (mirrors BIZ-064 removing the Activity header button).

### Visual weight (mirror BIZ-064)

- When the viewed period **contains today**, that day's column Add is **primary/blue and always
  visible**; the other columns' are **quiet, revealed on hover + keyboard `:focus-visible`**.
- When the viewed period **does not contain today** (a past/future period), there is no primary
  column — **all** columns' Add actions are quiet/hover-revealed (nothing is privileged). There is
  still always a way to add: hover a column (desktop) or the always-visible touch treatment below.
- On the **phone layout**, per-day Add actions are always visible at reduced opacity (not
  hover-gated), as in BIZ-064.
- Reuse BIZ-064's shared marker/affordance styling so both views are visually identical.

## Acceptance criteria

- [ ] Each working day column (table header + phone day-card header) has an Add action that opens the
      draft with that day's date prefilled; saving creates the entry on that day.
- [ ] The global "+ Add entry" button is removed from the period view.
- [ ] When the viewed period contains today, that column's Add is primary/always-visible and the
      others are quiet (hover/focus); when it doesn't, all columns' Adds are quiet.
- [ ] Weekend/absence columns show no per-day Add (consistent with the empty-cell add rule).
- [ ] The action appears only in Review mode, not in the Enter/checklist mode.
- [ ] On the phone layout the per-day Adds are visible and tappable (not hover-gated).
- [ ] Frontend tests cover: per-column Add prefills the right date; primary-today vs
      all-quiet-when-not-current-period; weekend column excluded; absent in Enter mode; global button
      removed.

## Blocked by

Best done with or after **BIZ-064** (shares the per-day Add affordance/component and its hover/focus/
touch treatment).

## Notes

- `onAddCell(rowKey, day)` (empty-cell add) stays — it prefills a specific code+day; this adds the
  code-agnostic per-day gesture alongside it.
