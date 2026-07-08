# BIZ-039 — Add an absence over a date range, not just a single day

ID: BIZ-039
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

Adding an absence is one day at a time: the Settings "Absences" form has a single `<input
type="date">`, the API (`POST /api/settings/absences`, `AbsenceWrite{date, reason}`) takes one date,
and the service `add_absence(user_id, on, reason)` writes one row. Entering a week of annual leave
means clicking Add seven times. You should be able to pick a **range** (from → to) in one go.

## What to build

Let the user enter an absence over an inclusive date range `[start, end]`, fanning out to one
`Absence` row per day (the model stays one row per date — `UniqueConstraint(user_id, date)` — so the
period grid's per-day `isAbsence` rendering is unchanged).

- **Backend**: extend `AbsenceWrite` with an optional `end: date | None = None` (omitted ⇒ single
  day, backward compatible). `add_absence` (or a small range wrapper) creates/updates one absence per
  day from `date` to `end` inclusive, with the same `reason`, upserting per day (idempotent, reusing
  the existing per-date upsert). Validate `end >= start`; reject an unreasonably long range (e.g.
  cap at ~366 days) with a clear error. Return the updated `SettingsRead` as today.
- **Every calendar day** in the range gets an absence row (weekends included — harmless, the grid
  already greys weekends, and a natural "1–15" range spans them). Do not silently skip days.
- **Frontend** (`SettingsScreen`): add an optional **end-date** input beside the existing date (e.g.
  "from" / "to"); leaving "to" empty adds a single day exactly as now. On Add, call the range-aware
  API once. Existing per-day removal (the chips) is unchanged — each day remains individually
  removable.
- **API client + types** updated accordingly.

## Out of scope

- Range *removal* (clearing a whole range at once) — keep the existing per-day delete; revisit later
  if needed.
- A visual calendar/range picker — two native date inputs are enough for the POC.

## Acceptance criteria

- [ ] `POST /api/settings/absences` with `date` + `end` creates an absence for every day in the
      inclusive range; re-posting an overlapping range is idempotent (no duplicates, reason updated).
- [ ] Omitting `end` (or `end == date`) adds exactly one day — unchanged behavior.
- [ ] `end < date`, and a range longer than the cap, are rejected with a clear 4xx error.
- [ ] The Settings form lets you pick from/to and adds the whole range in one action; the absence
      chips then show each day, each individually removable.
- [ ] Backend tests cover: range fan-out (incl. weekends), single-day (no `end`), idempotent
      re-post, and the `end < date` / too-long-range validation. Frontend tests cover the from/to add
      calling the API once with the range.

## Blocked by

None.
