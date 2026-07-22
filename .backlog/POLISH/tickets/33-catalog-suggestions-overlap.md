# BIZ-074 — Code catalog: reference suggestions no longer cover the code list

ID: BIZ-074
Status: ✅ done
Type: fix
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

On the **Code catalog** screen the single search box drives two things at once:

1. it fuzzy-filters the user's own active codes **in place** (BIZ-073), and
2. it opens a **floating** reference-catalog suggestions dropdown (`position: absolute`,
   `z-index: dropdown`) positioned right under the box.

Because the dropdown floats over the content, as soon as you type it covers the (now filtered)
list of active codes below and blocks access to it — the very codes you filtered to are hidden
behind the overlay, and the narrower 430px panel lets the cards behind it bleed out on the right.
The two roles fight for the same screen space.

## Solution (frontend-only) — separate the two roles

- The search box keeps its **primary role**: filter your active codes in place (BIZ-073 unchanged).
- The reference-catalog suggestions **stop floating**. They render as a distinct, in-flow section
  **below** the active-codes list — titled "Add from your reference catalog (N)", with a capped
  height and internal scroll. Nothing overlays the list; both roles are separated spatially.

## Acceptance criteria

- [x] Typing in the search box never overlays/hides the active-codes list.
- [x] Matching reference codes appear as an in-flow "Add from your reference catalog" section below
      the list; clicking one still activates it (`onActivateReference`) and clears the query.
- [x] The section is capped in height and scrolls internally on many results.
- [x] The section only shows for a non-empty query with at least one (non-active) reference match.
- [x] Component tests cover: no overlay, in-flow suggestions render + activate, hidden on empty query.
- [x] Frontend quality gate clean (lint, format, build, 419 tests).
- [x] Verified in the live browser (typing `team`: filtered active codes first, then a separate
      in-flow region with the 20 reference matches — no overlay).

## Delivery

Shipped in [PR #131](https://github.com/davidp57/walker/pull/131) → `develop`.

## Blocked by

None.

## Notes

- Completes BIZ-073, which introduced the in-place filter that created the overlap conflict.
