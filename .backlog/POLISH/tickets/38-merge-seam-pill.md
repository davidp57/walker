# BIZ-079 — Move the Merge action to a seam pill between the two rows

ID: BIZ-079
Status: ✅ done
Type: feature
Priority: P3

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`. UI refinement of BIZ-077/BIZ-078.

## Problem

The Merge action lived in the overlap-note line under one row (bottom-left), which didn't make it
obvious *which two entries* would merge, and read as unrelated to the pair. The developer wanted a
compact control that clearly ties the two mergeable entries together without cluttering the list.

## Solution (frontend-only)

Replace the in-note Merge button with a **compact "⇕ Merge" pill on the seam between the two
mergeable rows** — rendered in flow between the two DOM-consecutive rows, right-aligned, so its
position alone identifies the pair. **Hovering the pill tints both affected rows** (a subtle accent
background), revealing the pair on demand with no permanent bracket.

- Two rows are a mergeable pair when they are DOM-consecutive (the list is newest-first, BIZ-019),
  share code + activity, and are adjacent or overlapping in time (`lower.end >= upper.start`). The
  upper row may be the running timer (it then survives the merge, BIZ-077).
- Clicking the pill calls the existing merge endpoint; the Trim affordance and overlap badge stay in
  the overlap note untouched.

## Acceptance criteria

- [x] A "⇕ Merge" pill appears on the seam between two same-code+activity adjacent/overlapping rows.
- [x] Hovering the pill tints both rows; leaving clears it (unit-tested via `fireEvent.mouseEnter`).
- [x] Clicking merges the pair (same behavior as before).
- [x] No Merge button remains in the overlap note; Trim still works there.
- [x] Frontend quality gate clean (428 tests); component/eligibility tests updated.
- [x] Verified in the live browser: pill sits on the seam of the mergeable pair, absent for a
      different-activity neighbor, and clicking it merges (12:45–13:45 + 10:17–12:45 → 10:17–13:45).

## Delivery

Shipped in [PR #138](https://github.com/davidp57/walker/pull/138) → `develop`.

## Blocked by

None.
