# BIZ-053 — Persist per-user view preferences (task view/group/sort, period mode, Done collapse)

ID: BIZ-053
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

Screen-shape choices reset on every reload: the Tasks screen's list/board `view`, `group`, `sort` +
`sortDir`, the Timesheet period screen's Review/Enter `mode`, and the kanban's collapsed-Done state.
All are component `useState`, lost on refresh — you re-set your grouping and view every time. They
should be remembered in the user's profile, which also covers the standalone `.exe`'s implicit user
(it runs the backend locally with its own `Settings`/preferences row).

## What to build

Persist these as **view preferences** — a concept kept **distinct from `Settings`**: `Settings`
(workdays, density, period_scheme, theme) is deliberate configuration set on the Settings screen;
view preferences are ephemeral view state that changes on nearly every click and is merely
remembered. Chosen shape (C over "extend `Settings` with typed columns"): a JSON bag + a dedicated
lightweight endpoint — because the set is open-ended (avoid a migration per new preference), writes
are frequent (a partial merge, not a full `Settings` PUT), and the config/view-state split stays
clean.

**Preferences & defaults:** `task_view` (list|board, default `list`) · `task_group`
(none|code|status|priority|due, default `none`) · `task_sort` (due|status|priority|title, default
`due`) · `task_sort_dir` (asc|desc, default asc) · `period_mode` (review|enter, default `review`) ·
`done_collapsed` (bool, default `false`).

**Storage.** A JSON column `view_preferences` on the existing `settings` row (one Alembic migration,
no new table). Exposed through a dedicated service/schema so the concept stays separate even though
storage shares the table.

**API.**
- Read: piggyback on `GET /api/settings` — add a `view_preferences` sub-object to its response (no
  extra boot round-trip).
- Write: `PATCH /api/view-preferences` taking a **partial** dict; validate each key against its enum
  (invalid value → the default, mirroring `_as_theme`/`_as_period_scheme`), ignore unknown keys, and
  merge into the stored bag.

**Frontend.** On boot the server is the source of truth: initialize `TasksScreen` and `PeriodScreen`
state from the loaded `view_preferences`. On each change, update local state immediately (optimistic)
and fire a debounced `PATCH` (fire-and-forget). A brief default→persisted snap on cold load is
acceptable (a view flip isn't a full-page repaint like the theme) — no localStorage mirror.

**`done_collapsed` scope.** Today each `StatusBoard` (one per swimlane when grouping by code) owns its
own collapse state; persist a **single global** `done_collapsed` shared by all lanes, not one per
lane.

## Acceptance criteria

- [ ] `view_preferences` JSON column added via an Alembic migration; existing users default cleanly
      (empty bag → the defaults above).
- [ ] `GET /api/settings` returns a `view_preferences` sub-object; `PATCH /api/view-preferences`
      merges a partial dict, validates enums (bad value → default), ignores unknown keys.
- [ ] Tasks `view`/`group`/`sort`/`sortDir` and Period `mode` and `done_collapsed` survive a reload.
- [ ] Changes write back debounced and optimistically; the server value wins on next load.
- [ ] `done_collapsed` is a single global flag across all kanban lanes.
- [ ] Backend tests (defaults, partial merge, enum fallback, unknown-key ignore) and a frontend test
      (a screen initializes from loaded preferences) are green.

## Blocked by

None. (Independent of BIZ-050/051, though it touches the same screens.)
