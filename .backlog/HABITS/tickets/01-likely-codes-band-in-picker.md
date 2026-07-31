# BIZ-083 — Likely-codes band in the code picker

ID: BIZ-083
Status: ✅ done
Type: feature
Priority: P2

## Parent

Lot HABITS — `.backlog/HABITS/PRD.md`. Model, rationale and rejected alternatives: **ADR-0015**.

## Problem

Tier 1 of `CodePicker` is name-sorted over the user's whole catalog (200+ rows on prod-shaped data),
so every categorization is a scroll or a typed query — even when the answer is nearly determined by
the time of day and the day of the week. Walker stores everything needed to rank those candidates
(`Entry.date`, `Entry.start_minute`, code, activity) and uses none of it. The description dropdown
covers "resume what I was doing", not "which code, at this hour".

## Solution

Vertical slice, end to end, with the row count **hardcoded to 5** (made configurable in BIZ-084).

**Backend** — new web-independent service `src/walker/services/likely_codes.py`:

- `likely_codes(session, user_id, *, at: datetime, limit: int) -> list[LikelyCode]` returning
  (code_id, activity, score) ranked descending.
- Score per ADR-0015: one vote per past **day** (that day's best-matching Entry), vote =
  `K_hour × K_day` with `K_hour` Gaussian on |Δ start_minute| (σ = 90 min, 0 beyond ±3σ) and `K_day`
  = 1.0 same weekday / 0.35 other workday / 0 across the workday boundary, workdays read from the
  user's settings.
- Evidence: `end_minute IS NOT NULL`, `timesheet_code_id IS NOT NULL`, `activity IS NOT NULL`, date in
  the **8 weeks preceding `at`'s date, excluding that date**. `source` ignored.
- Candidates intersected with the live catalog: code still among the user's codes (virtual included),
  activity still present on that code.
- Cut at score `>= 1.0`, then `limit`.
- The four constants (σ, other-workday weight, window, threshold) in one commented block at the top of
  the module, each with its justification.

**API** — `GET /api/codes/likely?at=<ISO datetime>` → `list[LikelyCodeRead]` (code id, number, name,
colour, activity). Invalid/absent `at` → `422`.

**Frontend** — `wk-likely-*` band at the top of `CodePicker`'s body, above "Your codes":

- Title "Likely at this time"; one row per pair (colour dot, code name, `number · activity`), click
  picks the pair exactly like a Tier-1 activity button.
- Fetched when the picker opens, from the context passed in; **not cached** across opens (reopening
  after changing the start time must reflect the new hour).
- Hidden while the search query is non-empty, in `codeOnly` / `realOnly` modes, during the fetch, on
  error, and when the response is empty — never a skeleton (it would make the list jump).
- Context wiring: `TimerBar` → now; `EntryEditor` → **the values currently typed** in its `date` /
  `start` fields (not `entry.date` / `entry.start`), so a just-corrected start time is honoured;
  `onOpenPicker` carries `{ date, startMinute }`, and if `parseMilitaryClock` returns `null` no
  context is sent and the band stays hidden.

No schema migration.

## Acceptance criteria

- [x] `tests/test_services_likely_codes.py`: on synthetic 8-week histories — a pair used every morning
      outranks a pair used every afternoon at 09:30 and the reverse at 14:00; a same-weekday hit
      outranks an equally-timed other-weekday hit; a choppy day of 12 Entries on one code casts a
      single vote (score exactly 1.0) and loses to four separate days; a lone **off-hour** use stays
      below the threshold while a lone perfectly-aligned same-weekday day reaches exactly 1.0 and *is*
      shown (that case is what the threshold is calibrated on); the context day's own Entries never
      contribute; evidence older than the window is ignored; a non-workday context draws no workday
      evidence and vice versa; only closed, fully categorized Entries count; another user's history
      does not leak.
- [x] `tests/test_api_likely_codes.py`: ranked payload for a given `at` (and **no score** in it), the
      hour of the context changing the result, `422` on a malformed *or missing* `at` and on an
      out-of-range `limit`, pairs whose activity vanished or whose code is `backing_only` excluded,
      `limit` respected.
- [x] The band appears in the picker opened from the Timer and reflects the hour of day.
- [x] The band appears in the picker opened from the entry editor using the **typed** start time, and
      is absent while that field doesn't parse.
- [x] The band disappears as soon as a query is typed, and never renders (nor fetches) in `codeOnly` /
      `realOnly`.
- [x] Clicking a band row selects code + activity and closes the picker, like a Tier-1 pick.
- [x] No percentage, score or confidence is rendered anywhere — the score never leaves the backend.
- [x] `CodePicker.test.tsx` covers: band shown / pick / hidden-on-query / hidden-without-context /
      hidden-when-empty / never-fetched-in-codeOnly / silent-on-fetch-failure.
- [x] Quality gate clean both sides (`ruff`, `mypy`, `pytest` 341 ✓ 95%; `lint`, `format:check`,
      `build`, `test` 463 ✓).
- [x] Verified against the real dev database: at 08:30 the band offers only the morning mail/admin
      routine, by 11:30 project work has overtaken it, and at 17:30 the band is empty.

## Delivery

Shipped in [PR #144](https://github.com/davidp57/walker/pull/144) → `develop`.

One acceptance criterion was wrong as first written ("a pair used only once scores below 1.0"): a lone
**perfectly aligned** same-weekday day scores exactly 1.0 and *is* shown — that case is precisely what
the threshold is calibrated on. What stays below the bar is a lone use an hour off, or on another
weekday. Both are now tested separately.

## Blocked by

None.
