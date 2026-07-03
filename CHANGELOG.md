# Changelog

All notable changes to Walker are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); this project uses semantic-ish versioning.

## [Unreleased]

### Added

- **VCODE lot shipped**: virtual codes (ADR-0008) — user-created codes backed by exactly one real T&E
  code, for finer classification than T&E offers.
  - A virtual code borrows its real code's number, technical label, and Activities, and owns its own
    name and colour; `POST/PUT /api/codes/virtual` (create/edit), reusing `DELETE /api/codes/{id}`.
  - Two-level aggregation: the Fortnight/Review grid shows a virtual code as its own row; the
    Enter-in-T&E checklist resolves virtual codes to their real code, collapsing several virtual codes
    sharing one real code into a single T&E line.
  - Code catalog: virtual codes listed among real ones with a "virtual" badge and backing real code;
    "New virtual code" and per-card edit/delete (delete guard when an Entry or a virtual code depends
    on it).
  - Code picker: lists virtual codes, supports creating one on the fly (picks the real code + name,
    reopens the picker to use it immediately), and prefills the description from the last comment used
    on that code + activity.
- **CORE lot shipped**: the SPA now runs entirely off the real `/api`, mock store removed.
  - Code catalog: `GET/POST/PUT/DELETE /api/codes`, `POST /api/codes/from-reference`, CSV import
    (`POST /api/catalog/import`, upsert by `code_number`); delete blocked while a code is in use.
  - Timer & entries: `POST /api/timer/start|switch|stop` (at most one running Entry per user, atomic
    switch), full CRUD on `/api/entries`; real to-the-minute durations, no rounding (ADR-0005).
  - Fortnight view: `GET /api/fortnight/{date}` aggregates Entries into the Code × Activity × Day
    T&E-shaped matrix (1st–15th / 16th–end boundaries).
  - Entry checklist: `GET/PATCH/DELETE /api/fortnight/{date}/checklist`, derived from the fortnight
    grid, idempotent toggling, progress tracking.
  - Settings: `GET/PUT /api/settings` (work rhythm, density) and `POST/DELETE /api/settings/absences`,
    driving the fortnight grid's greying/striping.
  - Alembic migrations for all of the above (catalog, entries, checklist marks, settings & absences,
    reference codes).
- Project scaffold: `src/` layout, `pyproject.toml` (ruff / mypy strict / pytest, coverage ≥ 80%).
- FastAPI JSON API skeleton (`/api/health`) with the app factory serving the built SPA (ADR-0003).
- SQLAlchemy + Alembic setup, engine-agnostic; `User` model (ADR-0004, ADR-0007).
- React + Vite + TypeScript frontend shell (proxies `/api` in dev).
- Frontend: integrated the Claude Design UI — design tokens + global CSS, presentational components
  (AppShell, TimerBar, EntryRow, FortnightGrid, CodePicker, EntryEditor) and the Tracker / Fortnight /
  Checklist / Code catalog / Settings screens. Runs on an in-memory mock store pending the `/api` layer
  (see `docs/design/DESIGN_SPEC.md`).
- Frontend: made the Code catalog **editable** (create/edit/delete codes + their activities, via a
  `CodeEditor` modal; create-from-picker; delete blocked when a code is in use) and Settings
  **functional** (work rhythm, density, manual absences — driving the Fortnight grid).
- Modeled activities hierarchically: each Timesheet code owns its `Activity[]` (`{ sub-code, label }`),
  per code (replaces the fixed global activity list). Import CSV spec captured in ticket BIZ-002.
- Docker: multi-stage image (build SPA → Python runtime serving it) + `docker-compose.yml`.
- Governance: `CLAUDE.md`, `CONTRIBUTING.md`, `README.md`, `ROADMAP.md`, `CONTEXT.md`,
  `docs/adr/0001`–`0007`, `docs/design/handoff.md`, and the `.backlog/` structure.
