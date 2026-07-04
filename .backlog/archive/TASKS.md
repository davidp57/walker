# TASKS — Task manager (archived)

Status: ✅ done
Branch: feature/task-* per slice → PR → develop

## Summary

A task manager living inside Walker: Tasks (title, markdown description, status, priority, due date,
free-text tags, optional real/virtual code) with a sortable/groupable list and a kanban board over the
same data, a side panel for viewing/editing, one-click start-from-Task into the Timer (title as
comment, code prefilled, Stop | Complete split), and recurrence (roll-forward on completion, four rule
kinds including a fortnight-relative working-day delta). No API/schema change to existing Entry/Code
data beyond a nullable `Entry.task_id` link.

## Tickets

| ID | Title | Priority | Status |
| --- | --- | --- | --- |
| BIZ-021 | Task CRUD + list view | P2 | ✅ done |
| BIZ-022 | Kanban board view | P2 | ✅ done |
| BIZ-023 | Timer integration (start-from-task, Stop \| Complete) | P2 | ✅ done |
| BIZ-024 | Markdown WYSIWYG editor for Task descriptions | P2 | ✅ done |
| BIZ-025 | Recurring tasks (roll-forward) | P3 | ✅ done |
| BIZ-026 | Drag-and-drop on the Tasks kanban board | P3 | ✅ done |

## Verified against

- Backend: 121 tests passing, 96%+ coverage; `ruff check`/`ruff format --check`/`mypy` clean.
- Frontend: 205 Vitest tests passing (up from 137 at the end of the UX lot); `eslint`/`prettier --check`/
  `tsc --noEmit && vite build` clean.
- Manual browser verification: created a Task end-to-end (list → panel → save), confirmed the kanban
  board renders its five columns, and drove a real keyboard drag-and-drop move (`@dnd-kit`'s actual event
  pipeline, not mocked) that persisted via `PUT /api/tasks/{id}` with no failed requests.
- BIZ-021 was implemented and re-verified independently after a real environment bug was found mid-lot:
  the shared `.venv`'s editable install can silently point at a stale agent worktree after another agent
  reinstalls from theirs, making backend test runs pass against the wrong source. Always re-run
  `pip install -e ".[dev]"` from the target checkout and verify the import path before trusting a backend
  quality-gate result taken after parallel agent work.

## Key implementation notes

- Tags are a JSON string list on `Task` (no separate `Tag` entity — they carry no attributes of their
  own, unlike a Code's `Activity`).
- `Task.timesheet_code_id` reuses the same FK target as `Entry.timesheet_code_id` (real or virtual code,
  or `None` for an orphan Task).
- `POST /api/timer/complete` is a single backend endpoint (not two frontend calls) so stopping the Timer
  and marking the Task Done happen in one commit — no window where they can disagree.
- Recurrence rules are a discriminated-union JSON shape (`kind`: `every_n_days` / `weekly` / `monthly` /
  `fortnight_relative`) on `Task.recurrence_rule`; `services/recurrence.py::next_due_date` is a pure,
  dependency-injected function (work rhythm + absences as plain inputs) — no DB access, fully
  unit-testable. Completing a recurring Task rolls its due date forward and resets status to To-do (one
  live instance, no history).
- The markdown description editor is **Milkdown** (`@milkdown/core` + `preset-commonmark` + `preset-gfm`
  + `plugin-listener`/`plugin-clipboard`/`plugin-history`), spiked first against this repo's React 19 +
  Vite 6 setup — it worked cleanly, so the planned TipTap fallback was never needed. Task-list checkboxes
  use a small custom ProseMirror `NodeView` rather than Milkdown's own list-item component, which embeds
  a Vue app internally.
- The kanban board's drag-and-drop uses `@dnd-kit/core` (no `sortable` — columns don't need in-column
  reordering): ~13.5KB gzipped, React 19-compatible, and its keyboard sensor gives a
  Testing-Library-drivable activation path. The original click-to-move buttons (back/forward/straight-to-
  Done) are kept as the accessibility fallback alongside the drag handle.
