# BIZ-072 — Overlap detection should include the running timer (it has a start time)

ID: BIZ-072
Status: 🔄 in-progress
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

The overlap check (BIZ-052) deliberately **excludes the running timer** from detection
(`lib/overlaps.ts` — entries with `end === null` are dropped). But the running entry **does have a
known start time**, so a completed entry can overlap it — e.g. a completed entry `13:30–14:30` while
the timer is running since `14:00`. Today that conflict is invisible: the completed entry looks fine,
and the day's total is silently inflated across the boundary with the live timer.

Since the running entry's start is known, we can detect the overlap and act on it — safely, on the
**completed** side.

## Current behavior

`detectOverlaps` filters to completed entries only (`e.end != null`) and pairs them; the running
entry never participates. `EntryInterval.end` documents `null = the running timer (excluded from
detection)`.

## Solution

Include the running timer in detection using its `start`, treating it as an interval that is open on
the right (it has no end yet — it's live). Keep the running entry itself **read-only** (BIZ-038):
never trim or edit it; only ever act on the completed entry.

**Detection.** A completed entry `A` overlaps the running entry `R` when `A.end > R.start` (with
`A.start` before `A.end`, i.e. `R.start` falls inside `A`'s interval, or `A` extends past `R.start`).
Touching (`A.end === R.start`) is not an overlap, consistent with BIZ-052.

**Classification / fix.**

- **Fixable (staggered):** `A.start < R.start`. Offer the same one-click trim as BIZ-052 on the
  completed entry: set `A.end := R.start`. This never touches the live timer.
- **Same start** (`A.start === R.start`) or **`A.start > R.start`** (A starts after the timer began):
  **flag only**, no auto-fix — an automatic rule would either zero real time or require editing the
  live entry. The user resolves these by hand.

**Highlighting.** Reuse the existing danger/red overlap treatment and badge, naming the running
timer as the conflicting partner (e.g. "⚠ overlaps running timer (since HH:MM)").

## Acceptance criteria

- [ ] A completed entry whose interval crosses the running timer's start is flagged as overlapping,
      with the running timer named as the partner; touching (`A.end === R.start`) is not flagged.
- [ ] The running entry itself is never edited or trimmed (stays read-only, BIZ-038); any fix acts on
      the completed entry only.
- [ ] A staggered overlap with the running timer (`A.start < R.start`) offers the one-click trim
      `A.end := R.start`, reusing `patchEntry`.
- [ ] Same-start and `A.start > R.start` cases are flagged but show no auto-fix.
- [ ] Detection stays a pure, unit-tested helper; the running timer is passed in by its start and the
      existing completed-vs-completed behavior is unchanged (regression-covered).
- [ ] Frontend quality gate (lint, format, build, test) clean.

## Delivery

In review — [PR #125](https://github.com/davidp57/walker/pull/125) → `develop`.

## Blocked by

None.

## Notes

- Amends BIZ-052, which explicitly excluded the running timer; this reverses that exclusion now that
  we act on the completed side only.
- `overlaps.ts` will need the running entry's start (currently signalled solely by `end === null`);
  decide whether to pass it as a distinct argument or as an interval with an open/`+∞` end so the
  existing pairwise math still applies.
- Stays capture-first (ADR-0006): allow, then flag — no prevention at start/stop.
