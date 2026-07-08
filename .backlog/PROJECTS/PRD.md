# PROJECTS — Project (code)-centric task organization + unified code picker

Status: ⬜ ready
Branch: feature/* per ticket → PR → develop

## Parent

Requested directly by the user: organize tasks by their Timesheet code (which the user thinks of as
the "project"), and make picking a code consistent — searchable and creatable — everywhere a code is
selected.

## Problem Statement

The Timesheet code is, in practice, the user's "project": several tasks belong to the same code, and
the user wants to see and work with tasks grouped by it. Two gaps today:

1. **No way to group tasks by project (code).** The list view's "Group by" offers only
   none/status/priority/due; the kanban board has only fixed status columns. Neither surfaces the
   project dimension, so tasks for one project are scattered across the board and list.
2. **Code selection is inconsistent.** The entry flow (`EntryEditor`/`TimerBar`) opens the rich
   `CodePicker` — searchable, with create-real-code, create-virtual-code, and add-from-reference on
   the fly. But the Task editor (`TaskPanel`) uses a plain `<select>` of active codes only: no
   search on large catalogs, and no way to create a code (real or virtual) without leaving the task.

## Solution

1. Add **Project (code)** as a grouping dimension for tasks, applied consistently to both views: the
   list groups rows by code, and the board renders one **swimlane per project (code)** (plus a "No
   project" lane) when grouped by project. Status columns (and status drag-and-drop) are preserved
   inside each swimlane.
2. Replace the Task editor's plain code `<select>` with the same `CodePicker` used for entries, in a
   **code-only mode** (tasks have no activity), so search + create-real + create-virtual +
   add-from-reference are available wherever a code is chosen.

## Out of Scope

- `VirtualCodeEditor`'s "Real code" `<select>` — that picks the real code *backing* a virtual code
  while defining it; offering "create a code" there would be circular. Stays a plain select.
- Persisting a per-user default grouping choice — grouping is view state, reset per session (matches
  the existing sort/group controls, which are not persisted).
- Changing a task's project by dragging it between swimlanes — see BIZ-036's decision (status-only
  drag; project is changed in the task panel).

## User Stories

1. As a user, I want to group my task list by project (code), so that I see all tasks for one
   project together.
2. As a user, I want the kanban board split into per-project swimlanes, so that I can run each
   project's status workflow without other projects' cards in the way.
3. As a user, I want tasks with no code to gather under a "No project" group/lane, so that nothing
   is hidden.
4. As a user assigning a code to a task, I want to search my codes and create a new real or virtual
   code on the fly, so that I get the same fluid picker I already have when categorizing an entry.

## Implementation Decisions

- **Shared grouping control**: reuse the existing "Group by" control and extend `TaskGroupField`
  with `'code'`; the same selected grouping drives the list (row groups) and the board (swimlanes).
- **Board swimlanes**: when grouped by project, the board lays out one lane per code (ordered by
  code name, "No project" last), each lane keeping the full `STATUS_ORDER` columns. Drag-and-drop
  within a lane changes status only; a task's code is not changed by dragging across lanes (kept out
  of scope to preserve the current status-only DnD semantics and keyboard drag).
- **Code-only picker mode**: `CodePicker` gains a mode that selects a code without requiring an
  activity (tasks have no activity), keeping the "No code (orphan task)" escape. All four on-the-fly
  hooks (`onCreateNew`, `onCreateNewVirtual`, `onSearchReference`, `onAddFromReference`) are wired
  from the task context exactly as `App.tsx` wires them for entries.
