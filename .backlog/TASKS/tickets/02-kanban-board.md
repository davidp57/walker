# BIZ-022 — Kanban board view

ID: BIZ-022
Status: ✅ done
Type: feature
Priority: P2

## Parent

Lot TASKS — `.backlog/TASKS/PRD.md`.

## What to build

A **kanban board** view of Tasks with **fixed columns = the status workflow** (To-do, In-progress,
Waiting, Test, Done), and a **toggle** between the list and the board over the same Tasks. Moving a Task
across columns changes its status; trivial Tasks can go straight **To-do → Done**, skipping Waiting and
Test, so the board is never overkill.

## Acceptance criteria

- [x] A toggle switches between the list and the kanban board over the same Tasks.
- [x] The board has fixed columns To-do / In-progress / Waiting / Test / Done; each Task appears in its status column.
- [x] Moving a Task to another column updates its status; a Task can move directly To-do → Done.
- [x] Frontend tests (toggle; moving a Task changes its column and status).

## Blocked by

BIZ-021.
