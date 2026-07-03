# Walker doesn't automate T&E entry: T&E-shaped matrix + entry checklist

The chore Walker removes is *knowing what to enter* into Time & Expenses. The entry itself stays
manual in the PwC app.

Walker **does not drive T&E** (no scraping, no browser automation). It computes the fortnight's
Timesheet and presents it **in the same shape as the T&E grid** (BY CODE view: Code × Day, with
Activity), plus an **aviation-style checklist**: each line / cell is ticked as it's reported into T&E,
so nothing is missed or double-entered.

## Considered Options

- **Browser automation of T&E (rejected)**: T&E is a corporate app (authentication, DOM out of our
  control, may change) — automating it would be fragile and risky for little gain, since we only
  re-key an already-prepared, ticked grid.
- **Output in T&E shape + checklist (chosen)**: robust, no dependency on the PwC app.

## Consequences

- Walker **records and reports real time** (to the minute): it does **no rounding** and manages **no
  target** (8h/day, 88h/fortnight). Rounding to the quarter-hour and balancing the day are done by the
  user when entering into T&E — outside Walker's scope.
- The output mirrors the **layout** of the T&E grid (BY CODE: Code × Day, with Activity), in real
  durations.
- Model an **entry progress** (checklist): "to enter / entered" state per line or cell.
- Reconsider only if an official **T&E API** becomes available.
