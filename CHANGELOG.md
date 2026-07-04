# Changelog

All notable changes to Walker are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); this project uses semantic-ish versioning.

## [Unreleased]

### Added

- **Timesheet period rename + configurable period scheme** (BIZ-027): "Fortnight" is retired in favor
  of **Timesheet period** across the backend (`services/period.py`'s `period_bounds`/`aggregate_period`,
  `/api/period/*` routes), frontend (`PeriodGrid`/`PeriodScreen` components, UI strings), and docs. A
  new `period_scheme` field on `Settings` (`weekly | semi_monthly | monthly`, default `semi_monthly`)
  lets a User pick their Timesheet period's shape in Settings; `period_bounds(scheme, on_date)` is a
  pure function with no database dependency, and changing the scheme reshapes the Timesheet period view
  immediately (no reload). Existing users on the default scheme see byte-for-byte identical boundaries
  (1st–15th / 16th–end of month). See ADR-0009.
- **UX lot shipped**: post-MVP UX improvements surfaced by a review of the running app — frontend-only,
  no API/schema/domain change (durations still recorded and aggregated exactly as before, ADR-0005).
  - **Unified Fortnight grid** (BIZ-007): Fortnight and "Enter in T&E" merged into one screen with a
    Review / Enter in T&E header toggle (default Review); the standalone "Enter in T&E" nav item and
    route are gone (nav 5 → 4). Same grid — Review groups by code (virtual codes as their own rows),
    Enter in T&E resolves to the real code (ADR-0008) — sharing day columns, the Total column
    (row/daily/grand), weekend/absence styling, and the tinted read-only running-Timer cell; switching
    modes keeps period and data in place.
  - **Enter-in-T&E checkbox affordance** (BIZ-008): each filled working cell shows a checkbox beside its
    duration at rest; ticked turns green with a check, matching the existing tick/shift-click/⌘-click/
    row-badge interactions.
  - **Keyboard-driven timer loop** (BIZ-009): Enter in the description field starts a Timer with that
    description; Ctrl/Cmd+Enter toggles start/stop, Ctrl/Cmd+K opens the task switcher — ignored while
    typing elsewhere. The capture-first empty Start is unchanged.
  - **Uncategorized-Entry count** (BIZ-010): a live, client-derived badge on the Activity nav item shows
    how many Entries still lack a Timesheet code; hidden at zero.
  - **Entry mutation safety** (BIZ-011): deleting an Entry is now undoable (6s window, recreates via the
    existing create endpoint); "+ Add entry" persists nothing until Save; row actions (edit/resume/
    delete) have clearer icons and larger click targets.
  - **Copy the T&E code** (BIZ-016): a copy icon beside the row header's T&E code number in the Fortnight
    grid copies it to the clipboard with visible confirmation.
  - **Timer midnight fix** (TEC-001): the running Timer's elapsed time is derived from the Entry's real
    start instead of local midnight, so it stays correct across a midnight boundary.
  - **Visible API errors + loading feedback** (TEC-002): a toast surfaces failed saves/loads instead of
    swallowing them silently; screens show loading feedback so the empty state no longer flashes before
    first data.
  - **WCAG-AA contrast + minimum text sizes** (TEC-003): the secondary-text token went from ~3.2:1 to
    4.68–5.38:1 against dark-theme surfaces; functional text (headers, totals, meta) floored at 11px.
  - **Label consistency + Activity dedup** (CHR-001): nav labels now match their screen titles; a Code's
    Activity line is hidden in grid/Entry rows when it merely repeats the project name.
  - See `.backlog/archive/UX.md` for the full ticket list and implementation notes.
- **Virtual-code resolution contract test** (TEC-004): the backend's `resolve_to_real_codes`
  (`services/fortnight.py`) and the frontend's `resolveChecklistRows` (`lib/checklist.ts`) both resolve
  virtual codes to their real code (ADR-0008) but stayed independent implementations — the frontend
  also folds in the live running-timer cell, which the server can't know about, so eliminating it in
  favor of server-resolved data would have meant polling every second. Instead, both are now asserted
  against a shared fixture (`tests/fixtures/virtual_code_resolution.json`) via a pytest test and a
  Vitest test, so a change to one rule that isn't mirrored in the other fails a test. No behavior
  change.
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
