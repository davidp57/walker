# CHR-002 — Amend BIZ-007 acceptance criterion for virtual codes (cross-lot)

ID: CHR-002
Status: ⬜ ready
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

- [ ] BIZ-007's "identical geometry" criterion is reworded to "same grid; Review by code (virtual rows), Enter resolved to the real code."
- [ ] BIZ-008 and the UX PRD are checked for consistency with the two-level model; any further edit needed is noted.
- [ ] No other BIZ-007 content is changed.

## Blocked by

None — can start immediately.
