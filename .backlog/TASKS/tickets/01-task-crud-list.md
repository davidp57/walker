# BIZ-021 — Task CRUD + list view

ID: BIZ-021
Status: ✅ done
Type: feature
Priority: P2

## Parent

Lot TASKS — `.backlog/TASKS/PRD.md`.

## What to build

Introduce the **Task** entity (title, markdown **description** — a plain text field for now, the
WYSIWYG editor comes in BIZ-024 —, status enum To-do/In-progress/Waiting/Test/Done, priority, due date,
tags, an optional Timesheet-code reference [real or virtual, or none], created/updated) with full
create/read/update/delete. Add a **"Tasks"** nav item and a **sortable/groupable list** (grid); a
**side panel** shows and edits a Task's fields. Orphan Tasks (no code) are allowed.

## Acceptance criteria

- [x] A Task can be created, edited, and deleted with title, description, status, priority, due date, tags, and an optional code (real or virtual, or none).
- [x] The Tasks list renders as a grid, sortable and groupable by status / priority / due; a "Tasks" nav item opens it.
- [x] Clicking a Task opens a side panel to view and edit its fields.
- [x] Tags are free-text with autocomplete over already-used tags.
- [x] Backend API tests (Task CRUD) + frontend tests (list sort/group; create/edit/delete via the panel).

## Blocked by

None — can start immediately.
