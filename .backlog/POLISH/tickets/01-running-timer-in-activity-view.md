# BIZ-038 — Show the running timer in the Activity view

ID: BIZ-038
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

The in-progress entry (the running Timer) shows in the **TimerBar** (top) and is folded live into
the **Timesheet period** grid, but it is deliberately excluded from the **Activity** view's list:
`App.tsx`'s `trackerGroups` skips it (`if (entry.end === null) continue // the running entry lives in
the TimerBar`). So the screen that is literally titled "Your tracked time, most recent first" omits
the one entry currently being tracked, which is surprising.

## What to build

Show the running entry as a **live, read-only row** in the Activity view, in Today's group, so the
Activity list reflects what's being tracked right now — consistent with how the Timesheet period grid
already shows the running cell live.

- Include the running entry in its day group (Today) instead of skipping it. Pin it to the **top** of
  Today's list (it's the current activity), with a visible "running" treatment (matching the grid's
  `is-running` styling — e.g. an accent/live dot).
- Its duration updates live (ticks each second) from the same elapsed-time source the TimerBar uses,
  rather than showing a fixed `end - start`.
- The row is **read-only while running**: no time editing, resume, or delete inline (the running
  entry is controlled from the TimerBar — Stop/Complete/Cancel there). Categorization is already
  handled by the TimerBar's task picker, so the Activity row does not need its own categorize action
  while running (keep it display-only; revisit only if it feels needed).
- Today's day **total** includes the running entry's live minutes (consistent with the period grid's
  totals folding in the running cell).
- When no timer is running, the Activity view is unchanged.

Touch points: `App.tsx` (`trackerGroups` — stop skipping the running entry; thread the running id +
live elapsed minutes to the tracker), `screens/TrackerScreen.tsx` (render the running row, pinned),
`components/EntryRow.tsx` (a running/live mode: live duration, running styling, controls suppressed).

## Acceptance criteria

- [ ] With a timer running, the Activity view shows a row for it under Today, at the top, styled as
      running, with a live-updating duration.
- [ ] That row exposes no inline edit / resume / delete affordances while running (stop it first).
- [ ] Today's total in the Activity view includes the running entry's live minutes.
- [ ] Stopping the timer turns the row into a normal completed entry (with the usual controls), in
      its start-sorted position; no duplicate row.
- [ ] With no timer running, the Activity view is byte-for-byte the same as before.
- [ ] Frontend tests cover: a running entry renders in the Activity list (read-only, live), and its
      absence/normal behavior when nothing is running.

## Blocked by

None.
