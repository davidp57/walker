# CHR-009 — Standalone `.exe` (PyInstaller) + CD to GitHub Releases

ID: CHR-009
Status: ⬜ ready
Type: chore
Priority: P2

## Parent

Lot SHIP — `.backlog/SHIP/PRD.md`.

## What to build

Package the FastAPI backend, the built frontend static files, and the Alembic migration chain into one
Windows `.exe` via PyInstaller — replacing the current manual `scripts/deploy-local.ps1` +
`start-walker.bat` flow (git clone + venv + npm build + manual migrate) with a single double-clickable
binary. On launch, it runs `alembic upgrade head` against a SQLite database at
`%APPDATA%\Walker\walker.db` (not next to the binary, so it survives replacing the `.exe` on upgrade),
opens the default browser at `http://localhost:8000`, and keeps a visible console window (no
system-tray mode — closing the window stops the server, same mental model as today's
`start-walker.bat`). A GitHub Actions workflow, triggered on `v*` tags, runs this build on a Windows
runner and attaches the resulting `.exe` to that tag's GitHub Release.

## Acceptance criteria

- [ ] A PyInstaller build produces a single `.exe` requiring no pre-installed Python, Node, or git on
      the target machine.
- [ ] Launching the `.exe` runs pending Alembic migrations automatically, then serves the app.
- [ ] The SQLite database lives at `%APPDATA%\Walker\walker.db`, independent of the `.exe`'s location.
- [ ] Launching the `.exe` opens the default browser at `http://localhost:8000` automatically.
- [ ] A visible console window stays open while the server runs; closing it stops the server.
- [ ] Pushing a `vX.Y.Z` tag builds the `.exe` on a Windows CI runner and attaches it to that tag's
      GitHub Release.
- [ ] Running a newer `.exe` against an existing `%APPDATA%\Walker\walker.db` from a prior version
      preserves and migrates the existing data.

## Blocked by

None — can start immediately.
