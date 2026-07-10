# Changelog

All notable changes to Walker are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/); this project uses semantic-ish versioning.

## [Unreleased]

## [1.5.0] - 2026-07-10

### Added

- **Global Help link to the documentation** (BIZ-061): a Help entry in the navigation (desktop
  sidebar + phone tab bar) opens the documentation-site root in a new tab, alongside the existing
  in-context links.
- **Visible, alerting task due dates** (BIZ-062): due dates render as glanceable relative labels
  (`Today`, `Tomorrow`, `in 3d`, `3d overdue`) in the task list and on the kanban cards (which had
  none), with the exact date on hover. A count badge on the Tasks nav item (sidebar + phone tab bar)
  shows overdue/due-today tasks, and a once-per-load startup toast summarises them; tasks in the
  terminal (done) state are never flagged.
- **Optional quarter-hour rounding in the Enter view** (BIZ-063; ADR-0013): an opt-in "Round to ¼h"
  toggle rounds each day's durations to the quarter-hour with error-carry, so the day total stays
  closest to the real total. Display-only and non-destructive — the real minutes are kept and shown
  greyed beside the rounded value; off by default. Relaxes ADR-0005's "no rounding" consequence.
- **Per-day "Add" buttons** (BIZ-064, BIZ-066): add an entry straight to a given day, with the date
  prefilled — in the Activity list (today's is always visible, other days reveal on hover/focus) and
  on each working day column of the Timesheet period grid. The former global "+ Add entry" buttons
  are replaced by these.
- **Manual vs timer entry marking** (BIZ-065): each entry records its origin (timer-started vs
  manually added) and manual ones get a subtle ✎ marker in the Activity, Timesheet period, and Enter
  views (a period/Enter cell is marked when it contains any manually-added time).

### Migrations

- Adds a nullable `source` column to `entries` (BIZ-065). Run `alembic upgrade head`. Existing rows
  stay `NULL` (origin unknown) and render unmarked; new entries are tagged `timer`/`manual`.

## [1.4.0] - 2026-07-09

### Added

- **Automatic code colour + rich colour picker** (BIZ-048): one curated 64-colour palette (mirrored
  backend/frontend, contract-tested) replaces the old modulo palette and the two divergent frontend
  palettes. New codes open on a colour picked at random from the least-used palette colours (so
  siblings stay distinct, degrading gracefully once all 64 are in use); a rich picker offers a 🎲
  re-roll, a hue-ordered swatch grid marking used colours with a tooltip naming the code(s), and the
  native analog colour input.
- **Unified tiered code search** (BIZ-049): every code-selection surface (categorize entry, switch
  task, task code, catalog search, and the new virtual-code backing selector) uses one search,
  results grouped by tier (your codes, then the reference catalog) and sorted by name. The
  virtual-code backing `<select>` is replaced by the shared searchable picker, and activating a
  reference code now routes through the code editor (with the colour picker) instead of a one-click
  add.
- **User-defined task states / kanban columns** (BIZ-056, BIZ-057; ADR-0011): task statuses become a
  per-user, ordered list (opaque id + editable label) with positional roles — the first state is
  initial (new-task default, recurrence reset), the last is terminal (Complete, roll-forward). Add,
  rename, reorder, and delete columns from within the kanban; add inserts before the terminal, a
  2-state minimum is enforced, and deleting a non-empty column reassigns its tasks to a chosen
  target. The first/last columns are marked start/done.
- **One-click start-timer from a task** (BIZ-050): a play action on each task (list + board) starts a
  timer immediately, carrying the task title as the entry description.
- **Persisted per-user view preferences** (BIZ-053): task view/group/sort, period mode, and the
  collapsed-Done state are remembered per user across sessions.
- **Overlapping-entry detection + one-click trim** (BIZ-052): entries that overlap in time are
  flagged, with a one-click action to trim the overlap.
- **Cmd/Ctrl+click to open links in a task description** (BIZ-055).

### Changed

- **Grouped task list as a single aligned table** (BIZ-051): grouped views render as one table with
  per-group section rows, so columns stay aligned across groups.
- **Edit the running entry inline; Timer description looks like a field** (BIZ-054).
- **Changing the running Timer's code edits the entry in place** (BIZ-058) rather than starting a new
  one.
- **Form modals no longer dismiss on an outside click** (BIZ-059): a form modal closes only via
  ✕ / Cancel / Save.
- **A day's Activity entries are listed newest-first** (BIZ-060).

### Fixed

- **Broken documentation-site URLs** (TEC-007): corrected `/Walker/` → `/walker/`.

## [1.3.0] - 2026-07-08

### Added

- **Running Timer shown in the Activity view** (BIZ-038): the in-progress entry now appears as a
  live, read-only row pinned to the top of Today (not only in the Timer bar and period grid), and
  the day's total folds in its live minutes.
- **Add an absence over a date range** (BIZ-039): the Settings absence form takes an optional "to"
  date and fans out to one absence per day across the inclusive range (weekends included); the API
  accepts an optional `end` and validates it.
- **Time-proportion bars in the Activity list** (BIZ-042): each entry row shows a thin bar in the
  code's color, proportional to the longest entry that day, for an at-a-glance sense of where time
  went.
- **Change a task's status inline from the list** (BIZ-043): the Tasks list status cell is now a
  selector — retriage without opening the board or the panel.
- **Review vs Enter explainer** (BIZ-047): the Timesheet period toggle now explains that Review is
  by the code you tracked on (virtual codes as their own rows) while Enter resolves to the real code.

### Changed

- **Tidier Activity descriptions** (BIZ-040): an entry with no description shows a discreet `—` at
  rest; the "Add a description…" invite reveals on hover/focus.
- **Tasks list: priority & due as inline pills** (BIZ-041): the always-empty Priority/Due columns are
  gone; priority and due render as inline pills only when set.
- **Kanban Done column is collapsible** (BIZ-044): collapse Done to a slim rail (count kept visible)
  to tame the horizontal scroll; columns are slightly tighter.
- **Code catalog activities collapse behind a count** (BIZ-045): a code with several activities shows
  "N activities ▸", expandable — so more codes fit on screen.
- **Guided first-run empty states** (BIZ-046): the Code catalog empty state explains the
  reference/active two-tier model and links the docs; the period view notes it fills in as you track.
- Removed the remaining employer-specific references (and the app's naming-origin note) from the
  README, docs, ADRs, and internal notes, so the repository reads as a generic, shareable product.
  Added a link to the published documentation site from the README.

## [1.2.0] - 2026-07-08

### Added

- **Group tasks by project (code)** (BIZ-036): the Tasks list gains a "Project (code)" option in its
  "Group by" control (ordered by code name, "No project" last), and the kanban board splits into one
  swimlane per project (plus a "No project" lane) when grouped by project. Drag-and-drop stays
  status-only within a lane — a task's code is changed in the task panel, not by moving cards
  between lanes.
- **Searchable, creatable code picker on the Task editor** (BIZ-037): the task's code field is now
  the same rich picker used when categorizing an entry — search your codes, add one from the
  reference catalog on the fly, or create a new real/virtual code — instead of a plain dropdown of
  active codes. The picker runs in a code-only mode (a task has no activity): one click picks the
  code. "No code (orphan task)" stays available.
- **French documentation** (CHR-010): the published docs site is now bilingual — English primary
  (the default, served at the site root, and the fallback), French a fully-translated secondary —
  with a language switcher in the header, via the `mkdocs-static-i18n` plugin.
- **Catalog-import documentation page** (CHR-011): a user-facing "Importing your code catalog" page
  (EN/FR) on the docs site — the two-tier reference/active model, the accepted CSV layouts, and how
  to import — linked from the day-to-day guide.

## [1.1.0] - 2026-07-08

### Added

- **Per-user theme (dark / light / system)** (BIZ-031, BIZ-032): a theme preference persisted
  server-side per user, defaulting to the OS `prefers-color-scheme`, wired through the SPA with a
  full light palette alongside the original dark one.
- **Responsive phone layout** (ADAPTIVE lot): a bottom tab bar for portrait navigation (BIZ-033),
  the Timesheet period grid reflowed into day cards instead of a wide matrix (BIZ-034), and
  touch-capable timer, entry editing, and kanban drag-and-drop (BIZ-035).

### Fixed

- **Dark-mode rendering defect**: the dark background is now painted on `html`/`body` with the
  correct `color-scheme`, removing a rendering defect at the page edges.

## [1.0.2] - 2026-07-04

### Added

- **A real sign-in screen for SSO deployments** (BIZ-029 gap): `GET /api/health` now reports
  `auth_mode` and which SSO providers have both a client id and secret configured. The SPA checks
  this on boot and, when a sign-in is needed, renders provider buttons (real page navigations to
  `/api/auth/login/{provider}`) instead of the app — previously SSO was backend-only, with no way
  to actually sign in short of typing a login URL by hand.
- **Rolling `:develop` Docker image + `.exe` build artifact**: both CD workflows now also run on
  every push to `develop` (image tag `:develop`; the `.exe` as a downloadable workflow artifact,
  not a release), so a fix can be smoke-tested before it's actually released.

### Fixed

- **Missing `httpx` runtime dependency**: `authlib`'s Starlette OAuth client hard-imports it, but
  it was only declared under the `dev` extra — any deployment with `WALKER_AUTH_MODE=sso` crashed
  on startup with `ModuleNotFoundError`, including the Docker image.
- **SSO `redirect_uri_mismatch` behind a reverse proxy**: uvicorn only trusted
  `X-Forwarded-Proto`/`X-Forwarded-Host` from `127.0.0.1` by default, so behind a reverse proxy
  terminating TLS, Walker built the OAuth `redirect_uri` as `http://...` instead of `https://...`,
  which Google (correctly) rejected. The hosted entry point now trusts forwarded headers from any
  peer (`forwarded_allow_ips="*"`), safe since Walker is meant to sit behind exactly one trusted
  proxy.
- **Get-or-create races on first launch**: a brand-new database's first few parallel boot requests
  (`/api/user`, `/api/settings`, `/api/codes`, ...) could all race to create the implicit default
  user, a User's Settings row, or (SSO) an Organization/User — the losing request hit a unique
  constraint and 500'd instead of just using the winner's row. Affected the very first launch of
  every standalone Docker/`.exe` deployment, and any user's first SSO sign-in.

## [1.0.1] - 2026-07-04

### Fixed

- **Free-mail domains no longer auto-join a shared Organization**: `resolve_organization_for_email`
  had no exclusion at all — two strangers signing in via SSO with personal `@gmail.com` (or
  `outlook.com`, `icloud.com`, and other free-mail providers) accounts would land in the same
  Organization and share a real-code catalog. Free-mail domains now resolve to no Organization,
  matching the existing `organization_id=None` fallback (private, self-only catalog) that a
  standalone single-user deployment already had.

### Added

- **Portainer self-hosting guide**: deploying the published `ghcr.io/davidp57/walker` image as a
  Portainer stack, including the GitHub Container Registry private-by-default gotcha and optional
  SSO env vars.
- **SSO configuration guide**: step-by-step Google Cloud Console setup (OAuth consent screen,
  client ID, the exact redirect URI Walker expects), the HTTPS-is-mandatory requirement for the
  session cookie to persist, and a pointer for Apple/Microsoft following the same shape.

## [1.0.0] - 2026-07-04

### Added

- **Timesheet period rename + configurable period scheme** (BIZ-027): "Fortnight" is retired in favor
  of **Timesheet period** across the backend (`services/period.py`'s `period_bounds`/`aggregate_period`,
  `/api/period/*` routes), frontend (`PeriodGrid`/`PeriodScreen` components, UI strings), and docs. A
  new `period_scheme` field on `Settings` (`weekly | semi_monthly | monthly`, default `semi_monthly`)
  lets a User pick their Timesheet period's shape in Settings; `period_bounds(scheme, on_date)` is a
  pure function with no database dependency, and changing the scheme reshapes the Timesheet period view
  immediately (no reload). Existing users on the default scheme see byte-for-byte identical boundaries
  (1st–15th / 16th–end of month). See ADR-0009.
- **Remove employer branding; optional User display name** (CHR-004): the shell footer no longer
  hardcodes a role/employer line — it shows the `User`'s optional `name` when set, falling back to
  `username`, with no role/employer line at all. `User` gains a nullable `name` column, surfaced via a
  new `GET /api/user` endpoint. Remaining standalone employer mentions in docs and code comments (not
  part of the timesheet-system wording handled separately) are also gone.
- **Old timesheet-system name → "Timesheet system" rename** (CHR-003): mechanical rename across code,
  API strings/labels, UI copy, and docs, completing the vocabulary shift started by BIZ-027. No
  behavior change.
- **Organization model + domain-based auto-join** (BIZ-028): a new `Organization` entity groups Users
  who will share one real-code catalog. A User is auto-joined to the Organization matching their
  email's domain on first login (creating it if none exists yet); free-mail domains (gmail.com,
  outlook.com, etc.) never auto-join or auto-create an Organization, keeping today's implicit
  single-user behavior for anyone not on a shared company domain. See ADR-0010.
- **SSO login (Google/Apple/Microsoft) for the hosted instance** (BIZ-029): OAuth2/OIDC sign-in via
  `authlib`, session cookies via `joserfc`. Gated by a new `auth_mode` setting (`sso` / `none`,
  default `none`) so standalone Docker/`.exe` deployments keep ADR-0007's no-login implicit-user
  behavior unchanged — SSO only activates for the hosted deployment.
- **Real-code catalog becomes Organization-scoped** (BIZ-030): real Timesheet codes move from
  `user_id` to `organization_id` scoping (BIZ-028), so every member of an Organization sees and
  imputes against the same catalog. Virtual codes, Entries, and Tasks stay `user_id`-scoped. Users
  with no Organization keep a catalog visible only to themselves. See ADR-0010.
- **SQLite WAL mode for the hosted deployment** (TEC-005): enables Write-Ahead Logging and foreign-key
  enforcement at startup (same PRAGMAs already proven by the author's Solde app), improving
  concurrent-access behavior now that a hosted instance can have several Organization members reading
  and writing at once. Fully sync, no change to `db.py`'s engine model.
- **Docs site (MkDocs + Material) on GitHub Pages** (CHR-005): a public, user-facing documentation site
  under `docs-site/`, mirroring the shape of VMCT v6's `mkdocs.yml` (theme, nav, built-in search),
  separate from the internal `docs/adr/`. Deploys from `main` to
  <https://davidp57.github.io/walker/>.
- **CI: backend + frontend quality gates on every PR** (CHR-006): a GitHub Actions workflow
  (`ci.yml`) running on every pull request — backend (`ruff check`, `ruff format --check`, `mypy`,
  `pytest` with the ≥80% coverage gate) and frontend (`eslint`, `prettier --check`, `vitest`,
  `vite build`).
- **Branch protection requires CI to pass before merge** (CHR-007): `develop` and `main` both require
  CHR-006's `Backend quality gate`/`Frontend quality gate` checks to pass, with `enforce_admins`
  enabled, before a pull request can merge.
- **CD: publish the Docker image to GHCR on version tags** (CHR-008): a `v*`-tag-triggered workflow
  builds and pushes the existing self-migrating `Dockerfile` image to `ghcr.io/davidp57/walker`.
- **Standalone `.exe` (PyInstaller) + CD to GitHub Releases** (CHR-009): packages the FastAPI backend,
  the built frontend, and the Alembic migration chain into one Windows `.exe`
  (`src/walker/standalone.py`, `walker.spec`) — no Python/Node install required. Resolves its SQLite
  file under `%APPDATA%\Walker`, runs migrations on boot, and opens the default browser. A `v*`-tag
  CD workflow attaches `walker.exe` to the GitHub Release.
- **Kanban drag-and-drop** (BIZ-026): Tasks board columns support a real keyboard-and-mouse
  drag-and-drop move (via `@dnd-kit`), persisted through the existing `PUT /api/tasks/{id}`, replacing
  click-to-move as the primary way to change a Task's status.
- **UX lot shipped**: post-MVP UX improvements surfaced by a review of the running app — frontend-only,
  no API/schema/domain change (durations still recorded and aggregated exactly as before, ADR-0005).
  - **Unified Fortnight grid** (BIZ-007): Fortnight and "Enter in the timesheet system" merged into one
    screen with a Review / Enter header toggle (default Review); the standalone "Enter in the timesheet
    system" nav item and route are gone (nav 5 → 4). Same grid — Review groups by code (virtual codes as
    their own rows), Enter resolves to the real code (ADR-0008) — sharing day columns, the Total column
    (row/daily/grand), weekend/absence styling, and the tinted read-only running-Timer cell; switching
    modes keeps period and data in place.
  - **Enter checkbox affordance** (BIZ-008): each filled working cell shows a checkbox beside its
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
  - **Copy the timesheet code** (BIZ-016): a copy icon beside the row header's timesheet code number in
    the Fortnight grid copies it to the clipboard with visible confirmation.
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
- **VCODE lot shipped**: virtual codes (ADR-0008) — user-created codes backed by exactly one real
  timesheet code, for finer classification than the timesheet system offers.
  - A virtual code borrows its real code's number, technical label, and Activities, and owns its own
    name and colour; `POST/PUT /api/codes/virtual` (create/edit), reusing `DELETE /api/codes/{id}`.
  - Two-level aggregation: the Fortnight/Review grid shows a virtual code as its own row; the
    Enter checklist resolves virtual codes to their real code, collapsing several virtual codes
    sharing one real code into a single timesheet line.
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
    timesheet-shaped matrix (1st–15th / 16th–end boundaries).
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
