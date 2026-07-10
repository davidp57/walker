# BIZ-063 — Enter view: optional intelligent quarter-hour rounding

ID: BIZ-063
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`. Introduces ADR-0013 (amends ADR-0005).

## Problem

The Timesheet system only accepts quarter-hour increments, but Walker's **Enter** view shows real
minutes (ADR-0005). So every period close the user re-does the same arithmetic by hand: round each
cell to a quarter, then nudge cells up/down so the day still totals what they actually worked.
Walker already has the real minutes — it can do this rounding, and do it better than ad-hoc manual
rounding.

## Solution

Add an **optional, non-destructive** quarter-hour rounding to the **Enter view only** (ADR-0013).
Real minutes remain the system of record — this is a frontend display transform, nothing rounded is
ever persisted.

### 1. Toggle, persisted per user

- A toggle on the Enter view — e.g. "Round to the quarter-hour" — visible only in Enter mode
  (not Review).
- Persisted as a new per-user view preference (e.g. `enter_rounding: boolean`) alongside
  `period_mode`: `ViewPreferences` model (`models/settings.py`), the API contract
  (`ViewPreferencesRead` / `ViewPreferencesUpdate` in `api/schemas.py`), the frontend `ViewPreferences`
  type + `DEFAULT_VIEW_PREFERENCES`, and the settings load/patch path (BIZ-053 plumbing).
- **Defaults to off** — ADR-0005 behaviour (real minutes) is the default.

### 2. Error-carried rounding (the "intelligent" part)

A pure helper (e.g. `lib/rounding.ts`) rounds a day column's cells to quarter-hours with
**error-carry**:

- Walk the day's cells; keep a running signed error `err = Σrounded − Σreal` so far.
- Round each cell to the quarter (down or up) that brings `err` closest to zero.
- Result: the day's rounded total equals the real day total rounded to the nearest quarter (closest
  reachable on the quarter grid); per-cell drift stays < 15 min.

Worked example — five 6-minute cells (real total 30 min): naive nearest-quarter rounds each to 0
(day shown as 0 min); error-carry yields 0, 15, 0, 15, 0 → 30 min, matching the real total.

Carry is scoped **per day column** (per ADR-0013): a code's period total may drift a few minutes;
day-total fidelity is what matters at entry time.

### 3. Display

With rounding on, every Enter-view **cell and total** shows the **rounded** value prominently and
the **real** value small/greyed (so the truth is never hidden). With it off, the view is unchanged
(real minutes only). The rounding is computed frontend-side over the exact grid returned by the API;
`services/period` is untouched.

## Acceptance criteria

- [ ] An Enter-view toggle turns quarter-hour rounding on/off; it is hidden/inert in Review mode.
- [ ] The toggle state is persisted per user (survives reload) via `ViewPreferences`, defaulting to
      off.
- [ ] With rounding on, every cell and every total is a multiple of 15 minutes, and each day
      column's rounded total equals the real day total rounded to the nearest quarter-hour.
- [ ] The error-carry helper is pure and unit-tested, including the "five 6-minute cells → 30 min"
      case and cases where the naive nearest-quarter would drift.
- [ ] With rounding on, each cell/total also shows the real value in a small, greyed style; with it
      off, only real minutes are shown.
- [ ] Review view and the persisted/exact backend data are unaffected (no rounded value is ever
      written back).
- [ ] Frontend tests cover: toggle visibility (Enter only), persistence, and dual (rounded + real)
      rendering.

## Blocked by

None. (ADR-0013 documents the decision; no dependency on another ticket.)

## Notes

- ADR-0013 amends the "no rounding" consequence of ADR-0005; read it before implementing.
- Open question if it ever matters: optimise per-code period totals in addition to per-day
  (deferred in ADR-0013).
