# BIZ-034 — Responsive: Timesheet period grid reflows to day cards on phone

ID: BIZ-034
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot ADAPTIVE — `.backlog/ADAPTIVE/PRD.md`.

## What to build

Below the same phone-portrait width breakpoint BIZ-033 introduces, `PeriodGrid` reflows from the
Code × Activity × Day table to one card per day (its code/activity/duration lines stacked
vertically) — the table is unreadable at phone-portrait widths, especially in the monthly scheme
(up to ~31 day columns). Above the breakpoint — including a phone turned to landscape, which is
comfortably wider than portrait — today's scrollable table is unchanged. One width breakpoint
covers both orientations; no separate orientation detection is needed.

Both representations read from the same aggregated grid data — this is a rendering/layout change
only, no data-shape change, no new endpoint.

## Acceptance criteria

- [ ] Below the breakpoint, the Timesheet period grid shows as a vertical list of day cards
      (each showing that day's code/activity/duration lines), for all three period schemes
      (weekly, semi-monthly, monthly).
- [ ] Above the breakpoint — including a phone in landscape — the existing table renders exactly
      as before, no regression.
- [ ] Totals (row/daily/grand) remain visible and correct in the card layout.
- [ ] Verified manually at phone-portrait, phone-landscape, and desktop viewport sizes via the
      browser preview, across all three period schemes.

## Blocked by

None — can start immediately (coordinate the shared breakpoint value with BIZ-033, but this is not
a hard blocker).
