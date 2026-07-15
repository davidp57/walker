# TEC-008 — Deleting a code referenced by a Task or ChecklistMark crashes (FK 500)

ID: TEC-008
Status: ✅ done
Type: fix
Priority: P2

## Parent

Lot TECH — `.backlog/TECH/PRD.md`.

## Problem

Deleting a code from the catalog (`DELETE /api/codes/{id}`) crashed with a **500
(`sqlite3.IntegrityError: FOREIGN KEY constraint failed`)** whenever a `Task` or a `ChecklistMark`
referenced it. Reported live by Julien.

`services/catalog.delete_code` only guarded two of the four foreign keys pointing at
`timesheet_codes.id`:

- `Entry.timesheet_code_id` → blocked with a 409 (kept).
- `TimesheetCode.real_code_id` (virtual codes) → blocked with a 409 (kept).
- `ChecklistMark.timesheet_code_id` → **unguarded** → FK violation at commit.
- `Task.timesheet_code_id` → **unguarded** → FK violation at commit.

Tests never caught it because the test SQLite engine was created without `PRAGMA foreign_keys=ON`
(production applies it via `db._configure_sqlite_engine`), so it silently tolerated orphan rows.

## What was built

- `delete_code` now cleans up the two unguarded references, matching the domain: **Tasks** are
  orphaned (`timesheet_code_id` reset to `NULL` — orphan Tasks are explicitly allowed) and
  **ChecklistMarks** are removed (per-period derived ticks, meaningless without the code). Entries
  and virtual codes still block deletion with a 409.
- The conftest test engine reuses `db._configure_sqlite_engine`, so tests now enforce foreign keys
  like production; a `test_db` invariant test asserts a dangling FK raises `IntegrityError`.
- Twelve settings/view-preferences unit tests that seeded orphan `Settings` rows now seed the
  referenced `User` first.

## Acceptance criteria

- [x] Deleting a code referenced only by Tasks/ChecklistMarks succeeds (204); the Tasks survive as
      orphans and the marks are gone.
- [x] Codes referenced by Entries or virtual codes still return 409.
- [x] Test SQLite enforces foreign keys; regression tests reproduce the former 500.
- [x] Backend quality gate (ruff, format, mypy, pytest) clean.

## Delivery

Shipped in [PR #117](https://github.com/davidp57/walker/pull/117) → merged to `develop` (`e71139a`).

## Blocked by

None.
