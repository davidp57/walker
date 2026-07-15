# CHR-012 — Standalone .exe crashes on startup (missing alembic submodules)

ID: CHR-012
Status: 🔄 in-progress
Type: fix
Priority: P1

## Parent

Lot TECH — `.backlog/TECH/PRD.md`. Build/packaging follow-up to CHR-009 (the `.exe` build).

## Problem

A freshly built standalone `walker.exe` crashed immediately on launch:

```
File "standalone.py", line 94, in _run_migrations
ModuleNotFoundError: No module named 'alembic.command'
```

`standalone._run_migrations` runs the Alembic chain on startup via
`from alembic.command import upgrade` / `from alembic.config import Config`, but `walker.spec`
declared only a bare `"alembic"` hidden-import. PyInstaller (6.21) did not pull in the dynamically
imported submodules (`alembic.command`, `alembic.config`, `alembic.ddl.*`), so the frozen app could
not migrate and exited before serving. Surfaced when rebuilding the `.exe` from `develop` to ship
BIZ-068.

## What was built

- Added `collect_submodules("alembic")` to `walker.spec`'s hidden imports (mirroring the existing
  treatment for `walker` and `pydantic_settings`).

## Acceptance criteria

- [x] The packaged `.exe` starts, runs `alembic upgrade head` on the standalone DB, and serves the
      SPA + API (verified against a copy of a real DB: `a7b8c9d0e1f2 → b1c2d3e4f5a6`, 200s).
- [x] No runtime/source change — build packaging only.

## Delivery

In review — [PR #122](https://github.com/davidp57/walker/pull/122) → `develop`.

## Notes

CI's `cd-exe.yml` builds from the same spec, so the fix also covers tagged-release artifacts. Consider
a tiny smoke step in that workflow (launch the exe, assert it migrates + answers `/api/health`) to
catch bundling regressions before release — possible follow-up.

## Blocked by

None.
