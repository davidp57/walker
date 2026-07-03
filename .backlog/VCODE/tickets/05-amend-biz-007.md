# CHR-002 — Amend BIZ-007 acceptance criterion for virtual codes (cross-lot)

ID: CHR-002
Status: ✅ done
Type: chore
Priority: P3

## Parent

Lot VCODE — `.backlog/VCODE/PRD.md`.

## What to build

Update the UX lot's **BIZ-007** so its "identical geometry" acceptance criterion reflects virtual codes.
With two-level aggregation, the two Fortnight modes no longer share an identical row set: **Review**
groups by code (virtual rows), **Enter-in-T&E** resolves to the real code. Reword that acceptance
criterion accordingly; leave the rest of BIZ-007 unchanged. Best applied when VCODE and the UX lot are
scheduled together. See ADR-0008.

## Acceptance criteria

- [x] BIZ-007's "identical geometry" criterion is reworded to "same grid; Review by code (virtual rows), Enter resolved to the real code."
- [x] BIZ-008 and the UX PRD are checked for consistency with the two-level model; any further edit needed is noted.
- [x] No other BIZ-007 content is changed.

## Blocked by

None — can start immediately.

## Comments

Reworded the "identical geometry" language in `.backlog/UX/PRD.md` (user story 16, implementation
decision) and `.backlog/UX/tickets/01-unified-fortnight-grid.md` ("What to build") to: row/day/duration/
Total-column geometry stays shared, but row **grouping** differs by mode per ADR-0008 (Review by code,
Enter in T&E resolved to the real code). No other BIZ-007 content touched.

Checked BIZ-008 (checkbox affordance ticket): it operates per rendered cell regardless of whether that
row is a real or a resolved-virtual code, so it needs no edit — the two-level model is transparent to
it. No further edit noted.
