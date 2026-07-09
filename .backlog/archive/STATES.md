# STATES — User-defined task states / kanban columns (archived)

Status: ✅ done
Branch: feature/* per ticket → PR → develop

## Summary

Task status stops being a hardcoded five-value enum and becomes a **per-user, ordered list** of
states — each an opaque stable `id` + an editable `label` — with **positional roles** (ADR-0011):
the first state is `initial`, the last is `terminal`. Everything that used to name `todo`/`done`
now resolves through position — new-Task default and recurrence reset use the first state; Complete,
the stop-timer roll-forward and the "done" collapse use the last; the start-timer nudge (BIZ-050)
is first → second. Users add / rename / move / delete their columns from within the kanban.

## Tickets

| ID | Title | Priority | Status |
| --- | --- | --- | --- |
| BIZ-056 | Backend: user-defined task states with positional roles | P2 | ✅ done |
| BIZ-057 | Frontend: edit kanban columns; dynamic states across the Tasks screen | P2 | ✅ done |

## Verified against

- Backend: full suite green (271 tests, ~95% coverage); `ruff` / `ruff format` / `mypy` clean.
- Frontend: full suite green (348 Vitest tests, incl. the pure state rules, the migration, the CRUD
  endpoints, dynamic columns, in-kanban editing, and group/sort by the custom order);
  `eslint` / `prettier --check` / `tsc --noEmit && vite build` clean.
- Not exercised in a live browser this session (the worktree had no backend venv / seeded DB);
  behaviour is covered by the test suites, the in-kanban editing and modal/reassign flows included.

## Key implementation notes

- `services/states.py` — pure rules: the five defaults (ids = the old enum values, so the migration
  rewrites no Task status), positional roles (`initial_id`/`terminal_id`/`nudge_id`), and the
  `add`/`rename`/`reorder`/`delete` list ops with the 2-state minimum. No DB access, so `tasks` and
  `entries` import it without a cycle. Added states get a freshly generated opaque id
  (`secrets.token_hex`) — a re-add can't collide with or re-tag another.
- `services/settings.py` persists the list on `Settings.task_states` (JSON, distinct from BIZ-053
  view preferences) and handles delete-with-reassign; `services/tasks.py`/`entries.py` resolve
  default / reset / complete / nudge by position.
- Migration `c4d5e6f7a8b9`: `Task.status` `Enum`→`String` (no CHECK — SQLAlchemy 1.4+ sets
  `create_constraint=False`, so user-defined ids insert fine) + a `task_states` column seeded with
  the five defaults per user.
- API: `GET /api/settings` exposes `task_states`; `POST/PATCH/PUT/DELETE /api/task-states`.
- Frontend: `TaskStatus` is now a `string` alias; `TaskState[]` drives `TaskBoard` columns, the
  `TaskPanel` dropdown, and `TasksScreen` group/sort. In-kanban editing (add before terminal, inline
  rename, move ◀▶, delete with reassign + 2-column guard) lives on the single-board view; project
  swimlanes stay read-only. The state list is an optional prop defaulting to the built-in five.

## Deliberate deviation from ADR-0011

The ADR preferred fully-opaque default ids; here the five **defaults** keep the readable historical
enum values so the migration is a no-op on Task data (existing statuses stay valid ids), while
**added** states are opaque. All of ADR-0011's goals hold — rename/reorder O(1), roles positional —
at no functional cost, since status is internal and never leaves Walker.
