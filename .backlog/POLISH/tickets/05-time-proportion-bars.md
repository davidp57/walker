# BIZ-042 — Time-proportion bars in the Activity list

ID: BIZ-042
Status: ⬜ ready
Type: feature
Priority: P3

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

The Activity list shows durations only as numbers (`0:36`, `2:40`, …). There's no at-a-glance sense
of *where the time went* without reading and comparing every figure — which is exactly what a
time-tracker view should make instant.

## What to build

Add a subtle, proportional **duration bar** to each entry row, in the entry's code color, scaled
against the longest entry in that day group (or against the day total — pick whichever reads best;
per-day relative is simplest and keeps bars comparable within a day). The bar is decorative/secondary
— it must not push the numbers around or hurt density; think a thin track behind or beside the `DUR`
value.

Keep it to the Activity list for this ticket (the Timesheet period grid already conveys distribution
via the matrix; a bar there is out of scope).

## Acceptance criteria

- [ ] Each entry row shows a duration bar proportional to its duration, in the code's color (a
      neutral color for uncoded entries).
- [ ] Bars are scaled consistently within a day group so they're visually comparable.
- [ ] The bar is unobtrusive: no layout shift of the existing columns, works in both density modes
      and both themes.
- [ ] Frontend test covers proportional width for a couple of durations.

## Blocked by

None.
