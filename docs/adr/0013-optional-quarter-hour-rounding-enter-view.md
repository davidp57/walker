# Optional quarter-hour rounding in the Enter view (non-destructive display layer)

ADR-0005 decided Walker does **no rounding**: it records and reports real minutes, and rounding to
the quarter-hour + balancing the day is the user's job inside the Timesheet system. In practice the
Timesheet system only accepts quarter-hour increments, so every period close the user re-does the
same tedious mental arithmetic: round each cell to a quarter, then nudge cells up/down so the day
still totals what they actually worked. Walker already knows the real minutes — it can offer that
rounding.

**Decision.** Add an **optional, non-destructive quarter-hour rounding** to the **Enter view only**.

- Walker still **stores and aggregates real minutes** to the minute (ADR-0004, ADR-0005 invariant
  unchanged); the backend `services/period` grid stays exact. Rounding is a **frontend display
  transform** over that grid — nothing rounded is ever persisted.
- It is **opt-in**: a toggle on the Enter view, persisted as a per-user view preference (alongside
  `period_mode`, BIZ-053).
- The real value is never hidden: with rounding on, each cell/total shows the **rounded** value
  prominently and the **real** value small/greyed.
- Rounding uses **error-carried rounding within each day column**: walking a day's cells, keep the
  running signed error `err = Σrounded − Σreal`; round each cell to the quarter (down or up) that
  brings `err` closest to zero. The day's rounded total therefore equals the real day total rounded
  to the nearest quarter — the closest reachable on the quarter grid — and per-cell drift stays
  under 15 minutes.

This **amends the "no rounding" consequence of ADR-0005 only**. Everything else in ADR-0005 stands:
Walker still doesn't drive the Timesheet system, still outputs a Timesheet-shaped matrix + checklist,
still keeps real durations as the system of record.

## Considered options

- **Keep no rounding (rejected):** leaves the repetitive quarter-hour arithmetic to the user every
  period, which is exactly the chore Walker exists to remove — and Walker already has the data to do
  it better (error-carry) than ad-hoc manual rounding.
- **Round destructively / store rounded minutes (rejected):** would break the "real durations to the
  minute" invariant (ADR-0005, ADR-0004), make the data lossy, and prevent ever showing the truth or
  re-deriving it. A display-only transform keeps the record honest.
- **Round each cell independently to the nearest quarter (rejected):** simple, but the per-cell
  errors accumulate and the day total drifts arbitrarily (e.g. five 6-minute cells each round to 0 →
  a 30-minute day shown as 0). Error-carried rounding keeps the day total faithful, which is the
  whole point of rounding *for entry*.
- **Backend-side rounding (rejected):** would push a display concern into the web-independent service
  layer and muddy the "exact minutes" contract of `services/period`. Rounding is a per-user view
  preference about presentation, so it belongs in the frontend.
- **Optimise per-code period totals instead of per-day (deferred):** the carry is scoped to the day
  column, so a code's fortnight total may drift a few minutes. Day-total fidelity matches how the
  user reasons at entry time ("did today add up?"); period-total optimisation can be revisited if it
  proves needed.

## Consequences

- A new per-user view preference (e.g. `enter_rounding`) is added to the `ViewPreferences` model +
  API contract (BIZ-053 plumbing) and defaults to **off** (ADR-0005 behaviour is the default).
- The Enter view gains a rounding helper (pure, unit-tested) and dual value rendering (rounded
  prominent, real greyed) on cells and totals.
- The Review view is unaffected — it always shows real minutes.
- ADR-0005's "no rounding" line is superseded by this ADR; its other consequences remain in force.
