# BIZ-076 — Insert a break (punch a hole) in an entry

ID: BIZ-076
Status: ✅ done
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

You leave the timer running (or stop it too late) and later need to carve out non-worked time in
the middle of a recorded stretch — e.g. a 20-minute lunch break inside a 4-hour entry. Today the only
way is to hand-edit the entry's end and manually recreate the tail segment, which is fiddly and
error-prone.

## Solution — an atomic "insert a break" operation

Punch a hole `[bs, be]` inside an entry, splitting it into the worked segments around the hole:

- **Completed entry `[s, e]`** (`s ≤ bs < be ≤ e`): becomes `[s, bs]` + `[be, e]`, both carrying the
  original code / activity / description / task; the hole `[bs, be]` is left as untracked time.
- **Running entry `[s, …)`** (`s ≤ bs < be ≤ now`): the elapsed part before the break becomes a
  completed `[s, bs]` segment, the hole is untracked, and **the timer keeps running from `be`** — so
  you can retroactively account for a lunch you took while the timer was left running.
- **The hole itself**: untracked by default, or optionally given its own entry (code / activity /
  description) — e.g. categorized as an Absence — in the same action ("avec ou sans entrée").
- Edge cases: a break at the very start / end just trims that side; a break spanning the whole entry
  removes it (replaced by the hole entry, if categorized).

### UX

- **Three entry points**: a button in the Edit-entry modal, an action on each entry row in the
  Activity view, and an action on the **running timer** (TimerBar).
- **Break specified by a linked start + duration + end triptych** (like the entry editor: editing two
  recomputes the third), pre-filled to a sensible spot inside the entry, plus an optional code picker
  to categorize the hole.

## Acceptance criteria

- [x] Server `insert_break` splits a completed entry into the worked segments around the hole, exact
      to the minute (ADR-0005), carrying code/activity/description/task to the tail.
- [x] On a running entry the before-part is completed and the timer continues from the break end.
- [x] The hole is untracked by default; when categorized, a matching entry fills it.
- [x] Start/end trims and whole-entry breaks behave as described; out-of-range breaks are rejected.
- [x] Reachable from the entry editor, an Activity row, and the running timer.
- [x] Linked start+duration+end form; optional code picker for the hole.
- [x] Python + frontend quality gates clean; unit + component + API tests.
- [x] Verified in the live browser (Activity row → 09:00–13:00 split into 09:00–12:00 + 12:20–13:00,
      the 20-min gap left untracked; API confirms both segments carry the original fields).

## Delivery

Shipped in [PR #133](https://github.com/davidp57/walker/pull/133) → `develop`.

## Blocked by

None.

## Notes

- No ADR: this is a feature built on the existing Entry model, not a hard-to-reverse architectural
  trade-off.
