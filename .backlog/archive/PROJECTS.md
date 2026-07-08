# PROJECTS — Project (code)-centric task organization + unified code picker (archived)

Status: ✅ done
Branch: feature/* per ticket → PR → develop

## Summary

Makes the Timesheet code (the user's "project") a first-class dimension for Tasks. Tasks can be
grouped by project (code): a "Project (code)" option in the list's "Group by" control and one
swimlane per project on the kanban board (drag stays status-only within a lane). The Task editor's
plain code dropdown is replaced by the same searchable/creatable `CodePicker` used for entries, in a
code-only mode (tasks have no activity).

## Tickets

| ID | Title | Priority | Status |
| --- | --- | --- | --- |
| BIZ-036 | Group tasks by project (code): list group + board swimlanes | P2 | ✅ done |
| BIZ-037 | Searchable/creatable code selection everywhere a code is picked | P2 | ✅ done |

## Verified against

- Backend and frontend quality gates green on both merged PRs (#82, #83); 268 frontend tests passing
  at lot completion.
- A live browser-preview pass against the running instance confirmed: the list groups by project
  (ordered by code name, "No project" last), the board renders per-project swimlanes each with the
  full status columns, the Task editor's code field opens a searchable code-only picker (search
  narrows, single-click picks, no activity step), a picked code shows in the field with a "No code"
  clear action, and clearing returns the task to orphan — with no console errors.

## Notes / deviations

- **Board swimlanes** appear only when grouping is "Project (code)"; every other grouping (including
  none) renders the flat status board, exactly as before. A single "Group by" control drives both
  the list and the board.
- **Drag stays status-only**: a task's code is changed in the task panel, not by dragging cards
  between lanes — preserving the existing status-only drag-and-drop and keyboard-drag semantics
  (`TaskBoard` was refactored so each lane is an independent `StatusBoard`/`DndContext`).
- **Code creation from the task picker** opens App's existing real/virtual code editors (parity with
  the entry flow) with the Task editor kept mounted underneath so the in-progress draft is preserved;
  selection and add-from-reference auto-assign the code. `VirtualCodeEditor`'s "Real code" select was
  left as a plain select (out of scope — it picks the backing real code while defining a virtual).
