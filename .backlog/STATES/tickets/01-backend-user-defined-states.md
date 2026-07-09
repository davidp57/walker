# BIZ-056 — Backend: user-defined task states with positional roles

ID: BIZ-056
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot STATES — `.backlog/STATES/PRD.md`. Implements ADR-0011.

## Problem

`Task.status` is a hardcoded `TaskStatus` enum (`todo/in_progress/waiting/test/done`) that carries
behaviour: `done` is the target of Complete (`services/tasks.py::complete_task`), the trigger of
recurrence roll-forward, and the terminal state; `todo` is the new-Task default, the recurrence
reset target, and the origin of the BIZ-050 nudge. To let users customize their workflow, states must
become data — without breaking those behaviours.

## What to build

Per-user **ordered list of states**, each an **opaque stable `id`** + **editable `label`**, ordered
by position, stored as a **JSON list** (per user; distinct concept from BIZ-053 view preferences,
same JSON technique). `Task.status` stores the `id`. Roles are **positional**: first = `initial`,
last = `terminal` (ADR-0011).

- **Migration.** `Task.status` `Enum` → `String`. Seed each user's list with the five current
  defaults (opaque ids, labels To-do/In progress/Waiting/Test/Done, in order) and rewrite existing
  Task statuses to the matching ids. Minimum **2** states enforced.
- **Validation.** `_validate_status` validates against the user's list (unknown id → error).
- **Rewire behaviour to position** (no more literal `todo`/`done`):
  - New Task default = the **first** state; recurrence reset target = the **first** state.
  - `complete_task` / roll-forward key off the **last** (terminal) state.
  - The BIZ-050 nudge = **first → second** state.
- **State CRUD service + API** (per user): add (insert **before** the terminal by default), rename
  (label only — never re-tags Tasks), move (reorder), delete. **Delete** is blocked at 2 states;
  a non-empty state's delete must reassign its Tasks to a caller-chosen target state; an empty state
  deletes outright.
- Expose the state list on the API (e.g. in `GET /api/settings` or a dedicated read) and a
  write/CRUD endpoint for the operations above.

## Acceptance criteria

- [ ] `Task.status` is a string id; a migration seeds the five defaults per user and rewrites existing
      statuses, with existing Tasks unchanged in meaning.
- [ ] State add/rename/move/delete work per user; rename changes only the label (Tasks keep their id);
      add inserts before the terminal; a minimum of 2 states is enforced.
- [ ] Deleting a non-empty state reassigns its Tasks to a chosen target; deleting is refused at 2.
- [ ] New-Task default, recurrence reset, Complete/roll-forward, and the BIZ-050 nudge all resolve by
      position (first/last/second), verified by tests including a customized, reordered list.
- [ ] `_validate_status` rejects an id not in the user's list.

## Blocked by

None.
