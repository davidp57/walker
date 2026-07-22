# BIZ-077 — Merge two overlapping entries (the inverse of "insert a break")

ID: BIZ-077
Status: ✅ done
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

The overlap detector (BIZ-052/BIZ-072) already flags two entries whose time ranges intersect and, for
the staggered case, offers a one-click **Trim** on the earlier entry. But sometimes the right fix
isn't to trim — it's to **merge**: the two entries are really one stretch of the same work
(e.g. an accidental double timer, or a switch that split one task into two segments). This is the
inverse of "insert a break" (BIZ-076): instead of splitting one entry around a gap, combine two into
one continuous entry.

## Solution — a Merge action in the overlap note

- **Server `merge_entries(a, b)`**: one entry spanning `[min(start), max(end)]`; the other is deleted.
  Exact to the minute (ADR-0005).
- **Same code + activity only** (design decision): merge is offered — and accepted server-side — only
  when the two entries share the same `timesheet_code_id` **and** `activity`, so there's no
  categorization to lose. The merged entry keeps that shared code/activity; it keeps the earlier
  entry's description (falling back to the later's when the earlier is empty). Different code/activity
  → no merge.
- **Completed entries only**: the running timer is never merged (read-only, like Trim never trims it).
- **UI**: a **Merge** button in the existing overlap note (`wk-overlap-note`), next to **Trim to** —
  same affordance as the start-time overlap fix — shown only when an overlapping partner is completed
  and shares this entry's code + activity.

## Acceptance criteria

- [x] `merge_entries` produces one entry spanning the union and deletes the other; rejects a
      mismatched code/activity and two running entries.
- [x] A completed + the running entry merge into the still-running timer, started earlier.
- [x] The merged entry keeps the shared code/activity and a non-empty description.
- [x] The Merge button appears (in the overlap note, next to Trim) only for a same-code+activity
      partner — an overlapping completed entry or the directly-following running timer.
- [x] Clicking Merge combines the pair and refreshes the tracker.
- [x] Python + frontend quality gates clean; unit + component + API tests.
- [x] Verified in the live browser (two overlapping "Dev" entries 09:00–10:20 + 10:00–11:40 →
      one 09:00–11:40, description preserved; API confirms).

## Delivery

Shipped in [PR #134](https://github.com/davidp57/walker/pull/134) → `develop`.

## Scope note

Extended during build (developer request): merge also joins a completed entry with the **running
timer** that directly follows it (adjacent or overlapping, same code+activity) — the timer survives
and starts earlier. UI shows Merge in the overlap note even without an overlap for the adjacent case.

## Blocked by

None.

## Notes

- Reuses the BIZ-052/BIZ-072 overlap detection and the `wk-overlap-note` UI; no new detection logic.
