# BIZ-026 — Drag-and-drop on the Tasks kanban board

ID: BIZ-026
Status: ⬜ ready
Type: feature
Priority: P3

## Parent

Lot TASKS — `.backlog/TASKS/PRD.md`. Amends BIZ-022 (kanban board view).

## What to build

Replace (or augment) the kanban board's click-to-move controls with real **drag-and-drop** of a card
between status columns. BIZ-022 deliberately shipped with click-to-move buttons (← / → / ✓ Done) as a
first cut — keyboard- and test-friendly, but not the interaction PwC consultants already know from
**Azure DevOps** boards. Model the feel after Azure DevOps: pick up a card, drag it over a column, drop
to change its status; a card can still be moved by click for keyboard/accessibility parity — don't
regress that.

## Acceptance criteria

- [ ] A Task card can be dragged from one status column and dropped into another, updating its status
      to match the target column (same transition rules as today — any column to any column, including
      a trivial To-do → Done skip).
- [ ] A clear drop-target affordance (column highlight) while dragging.
- [ ] The existing click-to-move controls remain available (keyboard/accessibility fallback) — or are
      replaced by an equally accessible alternative if removed.
- [ ] Frontend tests cover a drag-and-drop move via the appropriate testing approach for whatever DnD
      mechanism is chosen (e.g. `@dnd-kit` exposes a keyboard/simulated-event testing path — avoid a
      library whose interactions can't be driven from Testing Library).

## Blocked by

None — can start immediately (BIZ-022 is shipped on `develop`).

## Further notes

- Source: user feedback after using the shipped board — the click-to-move mechanism works but doesn't
  match the muscle memory of Azure DevOps, PwC's day-to-day tool.
- Pick a drag-and-drop library deliberately (e.g. `@dnd-kit`) — evaluate bundle size and React 19
  compatibility; the app already took on a heavy dependency for BIZ-024's markdown editor, so weigh
  that when picking this one too.
