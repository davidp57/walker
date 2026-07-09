# BIZ-057 — Frontend: edit kanban columns; dynamic states across the Tasks screen

ID: BIZ-057
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot STATES — `.backlog/STATES/PRD.md`. Implements ADR-0011. Builds on BIZ-056.

## Problem

The frontend hardcodes the status workflow: `STATUS_ORDER`/`STATUS_LABEL` in `TaskBoard`,
`STATUS_OPTIONS` in `TasksScreen`, and status-based group/sort all assume the fixed five. With
user-defined states (BIZ-056), these must come from the user's list, and the user needs an in-kanban
way to edit the columns.

## What to build

**Dynamic states everywhere.** Drive kanban columns, the inline status dropdown, group-by-status
lanes, and sort-by-status from the user's state list (order + labels), not the hardcoded constants.
Remove `STATUS_ORDER`/`STATUS_LABEL`/`STATUS_OPTIONS` literals.

**In-kanban column editing** (the primary surface, per the request):

- **Add** a column (a "+ column" control) — inserts **before** the terminal (last) column by default,
  so it doesn't hijack the `done` role; the user can then move it last if they want a new terminal.
- **Rename** a column inline from its header.
- **Move** a column (reorder) via drag or move-left/right controls — reordering the ends reassigns the
  initial/terminal role (ADR-0011), so surface that consequence (e.g. a subtle "start"/"done" marker
  on the first/last columns).
- **Delete** a column: disabled at 2 columns; a **non-empty** column prompts "move its N tasks to
  which column?" (default: the neighbour) before deleting; an **empty** column deletes directly.

Wire these to the BIZ-056 endpoints; keep the existing drag-to-move-card and the Complete flow working
against the now-dynamic terminal.

## Acceptance criteria

- [ ] Kanban columns, the status dropdown, group-by-status and sort-by-status all render from the
      user's state list (order + labels); no hardcoded status constants remain.
- [ ] Add / rename / move / delete columns from within the kanban, wired to the backend; add inserts
      before the terminal.
- [ ] Deleting a non-empty column prompts for a reassignment target; delete is disabled at 2 columns.
- [ ] The first/last columns are visibly marked as start/terminal; moving a column to an end updates
      that marking (and the behaviour follows).
- [ ] Frontend tests: columns render from a custom list; add-before-terminal; delete-with-reassign;
      group/sort reflect the custom order.

## Blocked by

BIZ-056 (the state model + endpoints).
