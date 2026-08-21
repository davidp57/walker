# BIZ-091 — A Timer left running overnight must not silently destroy the day it was tracking

ID: BIZ-091
Status: ✅ done
Type: fix
Priority: P1

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`. Amends the timer-close paths shipped in BIZ-003 / BIZ-023 /
BIZ-065; extends the midnight work started in TEC-001 (which fixed the *displayed* elapsed time only).

## Problem

A Timer started on one day and stopped on the next writes an **end time from the wrong day** onto the
entry, producing a negative duration that the UI renders as `0:00`. The tracked work is lost, in
silence.

Observed on 2026-08-21 in real data: an entry dated 2026-08-20, `start_minute = 600` (10:00), closed
the next morning at 09:02 with `end_minute = 542`. End before start. The Activity view showed
`10:00 – 09:02` with a duration of `0:00`, and the day total counted the entry as nothing.

Three defects compound:

1. **The close paths ignore the entry's own day.** `/timer/stop`, `/timer/switch` and
   `/timer/complete` pass `_now_minute()` — minutes since *today's* midnight — to a service that
   assigns it to `Entry.end_minute` without ever comparing `Entry.date` to today. A timer that
   crossed midnight is closed with a minute belonging to a different day.
2. **Nothing enforces the invariant.** `end_minute >= start_minute` is assumed everywhere (every
   duration is computed as `end - start`) and guaranteed nowhere: no database constraint, no
   validation on `POST /api/entries` or `PATCH /api/entries/{id}`. A single bad write corrupts the
   row permanently, and every consumer clamps the result with `max(0, …)`, which hides it.
3. **The front end's "today" is frozen at page load.** `App.tsx` computes `const TODAY` once, at
   module evaluation. An app left open across midnight keeps believing it is yesterday: the entries
   window (`from`/`to`) stops covering the real today, the `Today` / `Yesterday` group labels are
   off by one, and a per-day `+ Add` files new entries under the wrong date. It also makes any
   day-comparison fix in the UI unreachable — the very case that produces the bug is the case where
   `TODAY` is wrong.

Walker's contract makes the third-party workaround unacceptable: durations are real minutes, to the
minute (ADR-0005). We cannot guess when the user stopped working, so we must neither invent a
duration nor destroy the evidence.

## Solution

**A. Never write an impossible duration (backend).**

- One close path for every timer: `stop_timer`, `switch_timer`, `complete_timer` and
  `stop_all_running` all take the current *date* alongside the current minute, and close the running
  entry through a single helper. When the entry belongs to the current day the close minute is
  `max(start_minute, at_minute)`; when it belongs to an **earlier day** the entry is closed at its own
  `start_minute` — zero minutes, no invented time — and flagged to the user (see B).
- `end_minute >= start_minute` becomes a real invariant: a `CHECK` constraint on `entries` plus
  validation (422, not a 500) on the two paths that accept an arbitrary end — `create_entry` and
  `patch_entry`. The Alembic migration repairs any pre-existing offending row before adding the
  constraint, since production already holds one.

**B. Ask, don't guess (frontend).**

- **A live civil day**: `today` becomes state, refreshed on a tick and when the tab regains focus,
  so an app left open overnight rolls over to the new day (fixing the entries window, the day-group
  labels and the per-day `+ Add` at the same time).
- **A stale-timer prompt**: when the running entry's date is not today, Walker says so and asks for
  the end time — "This Timer has been running since Thu 20 Aug, 10:00. When did you stop?" — with the
  entry's own day as the frame of reference. Answering patches the entry; there is also an explicit
  *discard* for a timer that tracked nothing real. Nothing is guessed on the user's behalf, and the
  prompt reappears until the entry is resolved.
- **A visible scar, not a silent `0:00`**: a timer-sourced entry with a zero duration is flagged in
  the Activity view (like an uncategorized one) instead of quietly reading `0:00`, so a timer closed
  at zero minutes stays obviously unfinished business.

## Non-goals

- **Splitting an overnight timer across midnight** (10:00→23:59 + 00:00→09:02). It would invent 14
  hours of work, which is exactly what ADR-0005 forbids.
- **Auto-closing a timer at end of day.** Walker has no idea when the user's day ended, and a
  fabricated 18:00 close is the same lie as a fabricated 23:59 one. The `stop_all_running` shutdown
  hook stays what it is: a best-effort close for a *graceful* shutdown, on the day it happens.

## Acceptance criteria

- [x] Stopping, switching or completing a Timer whose entry is dated an earlier day never writes a
      minute from today onto it, and never produces a duration below zero.
- [x] `entries` carries a `CHECK` constraint making `end_minute < start_minute` unrepresentable, and
      the migration repairs offending rows (there is one in production) before adding it.
- [x] `POST /api/entries` and `PATCH /api/entries/{id}` reject an end before the start with 422 —
      including a patch that moves only the start, or only the end.
- [x] The frontend's notion of "today" survives midnight without a reload: entries window, day-group
      labels and per-day `+ Add` all follow the real civil day.
- [x] A running entry dated before today raises a prompt asking for its real end time, framed on the
      entry's own day; it can also be discarded outright.
- [x] A timer-sourced entry with a zero duration is visibly flagged in the Activity view.
- [x] The docs site's day-to-day guide documents what happens to a Timer left running overnight
      (EN + FR, per CHR-010).
- [x] Quality gate clean both sides.

## Blocked by

None.

## Delivery

Shipped in [PR #156](https://github.com/davidp57/walker/pull/156) -> `develop`.

On upgrade, the migration flattens the production row that triggered this ticket (2026-08-20,
`600 -> 542`) to `600 -> 600` and flags it "no duration". That day was already re-entered by hand, so
the row is a partial duplicate and can be deleted from the Activity view.
