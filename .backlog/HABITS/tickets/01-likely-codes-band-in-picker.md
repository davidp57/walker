# BIZ-083 — Likely-codes band in the code picker

ID: BIZ-083
Status: ⬜ ready
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

- [ ] `tests/test_likely_codes.py`: on synthetic 8-week histories — a pair used every morning outranks
      a pair used every afternoon at 09:30 and the reverse at 14:00; a same-weekday hit outranks an
      equally-timed other-weekday hit; a choppy day with 8 Entries on one code does not outweigh
      8 separate days; a pair used only once scores below 1.0 and is absent; the context day's own
      Entries never contribute; a non-workday context draws no workday evidence.
- [ ] `tests/test_api_likely_codes.py`: ranked payload for a given `at`, `422` on a malformed `at`,
      pairs whose code was deactivated or whose activity vanished are excluded, `limit` respected.
- [ ] The band appears in the picker opened from the Timer and reflects the hour of day.
- [ ] The band appears in the picker opened from the entry editor using the **typed** start time, and
      is absent while that field doesn't parse.
- [ ] The band disappears as soon as a query is typed, and never renders in `codeOnly` / `realOnly`.
- [ ] Clicking a band row selects code + activity and closes the picker, like a Tier-1 pick.
- [ ] No percentage, score or confidence is rendered anywhere.
- [ ] `CodePicker.test.tsx` covers: band shown / hidden-on-query / hidden-without-context / pick.
- [ ] Quality gate clean both sides (`ruff`, `mypy`, `pytest`; `lint`, `format:check`, `build`, `test`).

## Blocked by

None.
