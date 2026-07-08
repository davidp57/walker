# BIZ-036 — Group tasks by project (code): list group + board swimlanes

ID: BIZ-036
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot PROJECTS — `.backlog/PROJECTS/PRD.md`.

## What to build

Add **Project (code)** as a grouping dimension for Tasks, driven by the existing "Group by" control
and applied to both the list and the board.

**List view** (`screens/TasksScreen.tsx`):

- Extend `TaskGroupField` with `'code'` and add a `Project (code)` option to the "Group by"
  `<select>`.
- `groupKeyFor` resolves a task to its code's `name` via `codesById` (falling back to the code
  `number` if the code isn't in the active set), or `'No project'` when `task.codeId` is null.
- Group order: by code name ascending, with `'No project'` last.

**Board view** (`components/TaskBoard.tsx`):

- When the selected grouping is `'code'`, render one **swimlane per project** (plus a "No project"
  lane), each lane containing the full `STATUS_ORDER` columns. When grouping is anything else
  (including `none`), the board renders exactly as today (a single set of status columns).
- Drag-and-drop (and the keyboard drag path) still changes **status only**, within a lane. A task's
  code is not changed by dragging across lanes — the drop target's status is applied and the code is
  untouched. `onMoveTask(task, status)` is unchanged.
- Lane order matches the list's group order (code name ascending, "No project" last).
- Pass the selected grouping from `TasksScreen` into `TaskBoard` (new prop).

## Acceptance criteria

- [ ] List "Group by" offers "Project (code)"; selecting it groups rows by code name, tasks with no
      code under "No project" (shown last).
- [ ] Board, when grouped by project, shows one swimlane per code + a "No project" lane, each with
      the To-do → Done status columns; the flat board is unchanged for other groupings.
- [ ] Dragging a card between status columns within a lane changes only its status; the task's code
      is unchanged. The keyboard drag path still works.
- [ ] A task whose code is not in the active set still groups (falls back to the code number), and
      does not crash.
- [ ] Frontend tests cover: list grouping by code (including "No project"), board swimlane layout
      when grouped by code, and that a within-lane drag calls `onMoveTask` with status only.

## Blocked by

None — can start immediately. Independent of BIZ-037.
