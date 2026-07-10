# BIZ-065 — Mark manual entries so they're distinguishable from timer entries

ID: BIZ-065
Status: ✅ done
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

An Entry can be created two ways — started from the **timer** (`services/entries.start_timer`,
capture-first, ADR-0006) or **entered manually** (`services/entries.create_entry`, the "+ Add entry"
draft). Once saved they look identical: `Entry` records nothing about its origin. The user wants to
tell hand-entered time apart from timer-tracked time at a glance, in the **Activity** view, the
**Timesheet period** grid, and the **Enter in Timesheet system** view.

## Solution

Persist each Entry's origin and surface a subtle marker on manual ones across the three views. Timer
entries stay unmarked (the common case); the marker is a positive flag on manual time.

### Backend

- Add a nullable `Entry.source` column: `'timer' | 'manual'`, `NULL` for legacy rows (origin
  genuinely unknown — do **not** backfill a fabricated value). Alembic migration adds the column.
- Set it at creation: `start_timer` → `'timer'` (this also covers resume / timer-switch, which go
  through the same path); `create_entry` → `'manual'`. No other write path infers it.
- Expose `source` on the Entry read schema (`EntryRead`, `api/schemas.py`).
- Period aggregation (`services/period.aggregate_period`): track, per `(code, activity, day)` cell,
  whether it contains **any** manual minutes — e.g. add `manual_by_day: dict[int, bool]` (or a
  `manual_days: set[int]`) to `PeriodRow`, carried through `resolve_to_real_codes` (OR-combined when
  virtual rows merge). Minutes stay exact; this only adds an origin flag.

### Frontend

- `Entry` type gains `source?: 'timer' | 'manual' | null`.
- **Activity view** (`EntryRow`): show a small, quiet **manual** marker (e.g. a pencil glyph or an
  "M" chip, `title="Added manually"`) on rows where `source === 'manual'`. Timer and legacy-`NULL`
  rows show nothing.
- **Timesheet period + Enter views** (`PeriodGrid`): show the same subtle marker on a cell that
  contains any manual minutes (`title="Contains manually-added time"`). A cell that is purely
  timer-tracked (or legacy) shows nothing.
- One shared marker component/style so the three surfaces look identical.

## Acceptance criteria

- [x] A new Entry started from the timer has `source = 'timer'`; one created via "+ Add entry" has
      `source = 'manual'`; the value round-trips through the API.
- [x] A migration adds the column; existing rows are `NULL` and render unmarked (no fabricated
      backfill).
- [x] Activity rows show the manual marker only when `source === 'manual'`.
- [x] A period/Enter cell shows the marker when it aggregates at least one manual entry, and nothing
      when it is purely timer/legacy; exact minutes are unchanged.
- [x] Virtual-code resolution (`resolve_to_real_codes`) preserves the manual flag (OR-combined on
      merge).
- [x] Backend tests: `start_timer`/`create_entry` set the right source; aggregation flags a mixed
      cell as manual; resolution OR-combines. Frontend tests: the marker shows for manual entries in
      Activity and for cells with manual minutes in the period/Enter grid, and is absent otherwise.

## Blocked by

None.

## Notes

- Decisions taken (overridable): legacy rows stay `NULL`/unmarked rather than being backfilled to a
  guessed origin; an aggregated cell is marked if it contains **any** manual minutes (no separate
  "fully manual" vs "mixed" state).
- Out of scope: changing how manual vs timer entries behave — this is identification only.
