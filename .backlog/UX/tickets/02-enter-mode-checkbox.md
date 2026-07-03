# BIZ-008 — Enter-in-T&E checkbox affordance

ID: BIZ-008
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot UX — `.backlog/UX/PRD.md`.

## What to build

In **Enter in T&E** mode, make it obvious at rest that cells are tickable. Each filled working cell
renders a **checkbox beside its duration**; a ticked cell turns green with a check; an unticked cell is
neutral (no amber — amber keeps its "uncategorized" meaning). The duration stays readable in both
states so the number keyed into T&E is always visible. The existing tick interactions (plain click,
shift-click column-major range, ⌘/Ctrl-click, per-row badge) are unchanged.

## Acceptance criteria

- [ ] Each filled working cell shows a checkbox + its duration at rest (no hover required to discover it).
- [ ] A ticked cell shows a green check on a green background; an unticked cell is neutral.
- [ ] The duration remains legible in both states; the running-Timer cell shows no checkbox.
- [ ] Plain/shift/⌘-Ctrl click and the row `n/N` badge continue to work as before.
- [ ] A frontend test covers the affordance and the ticked/unticked visual on the shared grid.

## Blocked by

BIZ-007.
