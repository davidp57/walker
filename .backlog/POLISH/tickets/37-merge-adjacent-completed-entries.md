# BIZ-078 — Offer Merge on adjacent completed entries too

ID: BIZ-078
Status: ✅ done
Type: fix
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`. Completes BIZ-077.

## Problem

BIZ-077 offered **Merge** only for entries that *overlap*, or a completed entry directly followed by
the *running timer*. But the most common case — **two completed entries of the same code + activity
sitting back-to-back** (touching, no gap, no overlap) — showed no Merge button, because the overlap
detector treats merely-touching intervals as non-overlapping and the "directly follows" check only
matched the running timer. This is exactly the intended inverse of "insert a break", so it should be
offered. (Reported from a real Thursday: two adjacent `N9/6208251/010 · Change request` entries at
10:17–12:45 and 12:45–13:45 with no Merge.)

## Solution (frontend-only)

Generalize the merge-eligibility check: an entry can merge with a same-code+activity partner that
**either overlaps it or directly follows it** (`follower.start === entry.end`) — whether that
follower is completed or the running timer. The `merge_entries` service already supports every one of
these (it merges any two same-code entries), so no backend change is needed.

## Acceptance criteria

- [x] Two adjacent completed entries with the same code + activity show a Merge button on the earlier
      one, and merging produces one entry spanning both.
- [x] Adjacent entries with a different code or activity show no Merge button.
- [x] The overlap and completed-plus-running cases (BIZ-077) still behave as before.
- [x] Frontend quality gate clean; component test for the adjacency eligibility.
- [x] Verified in the live browser (10:17–12:45 + 12:45–13:45, same code/activity → one 10:17–13:45,
      description preserved).

## Delivery

Shipped in [PR #136](https://github.com/davidp57/walker/pull/136) → `develop`.

## Blocked by

None.
