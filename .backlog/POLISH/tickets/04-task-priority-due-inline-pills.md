# BIZ-041 — Tasks list: priority & due as inline pills, not always-empty columns

ID: BIZ-041
Status: ⬜ ready
Type: feature
Priority: P3

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

In the Tasks **list** view the **Priority** column is almost always `—` (unused) and **Due** is empty
for most tasks. Two near-empty columns waste horizontal space and attention for little information.

## What to build

In `screens/TasksScreen.tsx`, stop dedicating always-visible columns to values that are usually
absent. Show priority and due date as compact **inline pills** attached to the task title/row, and
only when set:

- Priority → a small colored pill (e.g. High/Med/Low) shown only when the task has a priority;
  nothing when unset.
- Due date → a small pill shown only when set; keep the overdue styling (red) already used.
- Sorting by priority / due must still work (the sort control stays; sorting just reads the values
  even when not shown as a column).

Keep it simple — this is a rendering change to the list rows, not a data-model change.

## Acceptance criteria

- [ ] A task with no priority shows no priority pill (and no `—`); one with a priority shows a
      colored pill.
- [ ] A task with no due date shows no due pill; a due date shows a pill, overdue in red.
- [ ] Sort by priority and by due date still order correctly.
- [ ] The list reads less cluttered — no column that is empty for every row.
- [ ] Frontend tests cover pill presence/absence and that overdue styling still applies.

## Blocked by

None.
