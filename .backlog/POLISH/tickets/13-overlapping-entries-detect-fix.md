# BIZ-052 — Flag overlapping entries and offer a one-click trim

ID: BIZ-052
Status: ✅ done
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

Two Entries on the same day can overlap in time — you forget to stop one before starting the next,
or you type overlapping times when editing/adding an entry manually. (The Timer never causes this: a
switch closes the current Entry and opens the next, back to back.) Nothing surfaces the conflict
today, so overlapping time silently inflates a day's tracked total. The user wants overlaps
highlighted, with a one-click fix for the common case.

Note on vocabulary: this is about **Entries** overlapping in time (the "Activity" screen lists
Entries), not the **Activity** concept (a code's sub-breakdown) — see `CONTEXT.md`.

## What to build

All frontend — detection is pure interval math over the day's already-loaded Entries; the fix reuses
the existing `patchEntry`. No backend change and **no prevention at creation** (stay capture-first,
ADR-0006: allow, then flag).

**Detection.** Within a single day, over **completed** Entries only (the running Timer is excluded —
it's live and read-only, BIZ-038). Two Entries overlap when their `[start, end)` intervals strictly
intersect (`aStart < bEnd && bStart < aEnd`). Touching (`aEnd == bStart`) is **not** an overlap.

**Classify each overlapping pair** (A = earlier by start):

- **Fixable (staggered):** `A.start < B.start` and `A.start < ... ` with `A.end > B.start` **and**
  `A.end ≤ B.end`. A one-click fix sets `A.end := B.start`.
- **Nested** (`A.end > B.end` — A contains B) **or same start** (`A.start == B.start`): **flag only**,
  no auto-fix — any automatic rule here would delete or zero real tracked time (against ADR-0005's
  "real durations, nothing lost silently"). The user edits these by hand.

**Highlighting.** Both Entries of an overlap are marked, in a **danger/red** treatment **distinct
from the amber "uncategorized"** flag so the two problems aren't confused. Each carries a small badge
"⚠ overlaps HH:MM–HH:MM" naming the *other* Entry's conflicting range (tooltip with the detail), so
the conflict is legible without counting rows.

**The fix.** On a *fixable* pair, a row-action on the **earlier** Entry (alongside
edit/resume/delete in `EntryRow`), tooltip e.g. "Shorten end to 10:00 (start of next entry)". One
click, no modal — the edit is small, safe, and the times are visible. Detection re-runs after the
edit, so a chain of 3+ overlaps is resolved one deliberate step at a time. Nested/same-start pairs
show the badge but **no** fix action.

## Acceptance criteria

- [ ] Same-day completed Entries whose intervals strictly intersect are highlighted (both members);
      touching entries and the running Timer are not flagged.
- [ ] The highlight is visually distinct from the uncategorized amber, with a badge naming the other
      Entry's conflicting time range.
- [ ] Staggered overlaps (`A.end > B.start`, `A.end ≤ B.end`, distinct starts) show a one-click trim
      that sets `A.end := B.start`; it reuses `patchEntry`.
- [ ] Nested overlaps and same-start pairs are flagged but show no fix action.
- [ ] After a fix, detection re-runs; a 3-entry chain resolves via successive per-pair fixes.
- [ ] Detection is a pure, unit-tested frontend helper (staggered / nested / same-start / touching /
      running-excluded cases covered); no backend change, no creation-time prevention.

## Blocked by

None.
