# Walker doesn't automate timesheet entry: timesheet-shaped matrix + entry checklist

The chore Walker removes is *knowing what to enter* into the timesheet system. The entry itself stays
manual in the timesheet system.

Walker **does not drive the timesheet system** (no scraping, no browser automation). It computes the
fortnight's Timesheet and presents it **in the same shape as the timesheet grid** (BY CODE view: Code ×
Day, with Activity), plus an **aviation-style checklist**: each line / cell is ticked as it's reported
into the timesheet system, so nothing is missed or double-entered.

## Considered Options

- **Browser automation of the timesheet system (rejected)**: the timesheet system is a corporate app
  (authentication, DOM out of our control, may change) — automating it would be fragile and risky for
  little gain, since we only re-key an already-prepared, ticked grid.
- **Output in timesheet shape + checklist (chosen)**: robust, no dependency on the timesheet app.

## Consequences

- Walker **records and reports real time** (to the minute): it does **no rounding** and manages **no
  target** (8h/day, 88h/fortnight). Rounding to the quarter-hour and balancing the day are done by the
  user when entering into the timesheet system — outside Walker's scope.
- The output mirrors the **layout** of the timesheet grid (BY CODE: Code × Day, with Activity), in real
  durations.
- Model an **entry progress** (checklist): "to enter / entered" state per line or cell.
- Reconsider only if an official **timesheet-system API** becomes available.

> **Amended by [ADR-0013](0013-optional-quarter-hour-rounding-enter-view.md)**: the "no rounding"
> consequence is relaxed — the Enter view gains an *optional, non-destructive* quarter-hour rounding
> (display layer only; real minutes stay the system of record). Every other consequence here stands.
