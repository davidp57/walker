# BIZ-014 — Two-level Fortnight / checklist aggregation

ID: BIZ-014
Status: ✅ done
Type: feature
Priority: P2

## Parent

Lot VCODE — `.backlog/VCODE/PRD.md`.

## What to build

Aggregate at **two levels**. The **Fortnight / Review** working view groups by code, so each **virtual
code is its own row** (the user's fine classification), and real codes without virtuals stay normal
rows. The **Enter-in-T&E** checklist **resolves** virtual codes to their real code and aggregates by
**real code × activity × day** — several virtual codes sharing a real code **collapse into one** line,
matching what is keyed into T&E. Durations stay real, to the minute (ADR-0005).

## Acceptance criteria

- [x] The Fortnight/Review view shows one row per virtual code (and one per real code that has no virtual).
- [x] The Enter-in-T&E checklist collapses virtual codes into their real code: one line per real code × activity × day.
- [x] Row / daily / grand totals are exact summed real minutes (no rounding, no target).
- [x] Backend service + API tests for the two-level aggregation; frontend tests (Review shows a row per virtual code; the checklist collapses to the real code).

## Blocked by

BIZ-012.

## Comments

- **Review needed zero backend change.** `aggregate_fortnight` already groups by the raw
  `(entry.timesheet_code_id, entry.activity)` tuple, and a virtual code has its own distinct `id`,
  so the Fortnight/Review grid already produced one row per virtual code (plus one per virtualless
  real code). Added an API test (`test_fortnight_shows_one_row_per_virtual_code`) proving this holds
  with a fixture of one real code and two virtual codes pointing to it — confirms the existing
  `GET /api/fortnight/{date}` endpoint stays untouched.
- **The resolve step lives in `src/walker/services/fortnight.py`** as a new
  `resolve_to_real_codes(session, grid) -> FortnightGrid`: given an already-aggregated
  `FortnightGrid`, it looks up each row's code, maps virtual codes to their `real_code_id` (real
  codes pass through as themselves), and re-merges rows that collapse onto the same
  `(real code, activity)` pair, summing `minutes_by_day` per day exactly (no rounding, ADR-0005).
  Placed next to `aggregate_fortnight` since it operates on the same `FortnightGrid`/`FortnightRow`
  dataclasses and needs no entry-fetching logic of its own.
- **`src/walker/services/checklist.py`'s `derive_checklist`** now calls
  `resolve_to_real_codes(session, aggregate_fortnight(session, user_id, on))` before deriving
  checklist items, so items are always keyed by real `timesheet_code_id`. `toggle_mark` and
  `reset_checklist` needed no change (they only touch `ChecklistMark` rows via `fortnight_bounds`,
  not the grid).
- **Frontend backend contract needed no change** (`ChecklistItemRead.timesheet_code_id` shape is
  identical), but a genuine frontend gap was found and fixed: `App.tsx` was feeding
  `ChecklistScreen` the same per-virtual-code `rows` used by `FortnightScreen` (Review), while the
  `checked` map (from `fetchChecklist`) is now keyed by real-code ids after the backend change —
  the two would no longer match by key for virtual-code cells, silently breaking tick display and
  toggling. Fixed by extracting a pure `resolveChecklistRows(rows, codesById)` helper in the new
  `frontend/src/lib/checklist.ts` (mirrors `resolve_to_real_codes` client-side: collapses rows onto
  their real code, summing `minutesByDay`) and wiring `App.tsx`'s `checklistRows` memo through it,
  passed to `ChecklistScreen` instead of the raw `rows`. Covered by
  `frontend/src/lib/checklist.test.ts` (collapses two virtuals sharing a real code, summing minutes
  exactly; passes a virtualless real code through unchanged; keeps virtuals on different real codes
  as separate rows).
- Totals (row / daily / grand) are computed client-side by summing whatever `minutesByDay` the
  resolved rows carry, so no separate change was needed for the "exact summed real minutes"
  criterion — it falls out of both `resolve_to_real_codes` and `resolveChecklistRows` never
  rounding.
