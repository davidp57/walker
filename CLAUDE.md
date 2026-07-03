# CLAUDE.md — Walker

Guidance for AI coding agents working on this repository.

## Project

Walker is a personal, single-user (for now) web app that makes filling the PwC **Time & Expenses**
(T&E) timesheet painless. You track time during the day against the real PwC charge codes
(**Timesheet code** + **Activity**); at fortnight-end Walker shows the T&E-shaped matrix plus an
**entry checklist**. It **replaces Clockify** (see `docs/adr/0001-walker-replaces-clockify.md`).

- **Stack**: Python 3.13+ · FastAPI + Uvicorn (JSON API) · SQLAlchemy 2.0 + Alembic · SQLite (POC) ·
  pip + venv (PEP 621) · React 19 + Vite + TypeScript (SPA) · Docker.
- **Repository**: GitHub. Use the `gh` CLI.
- **OS**: Windows + PowerShell. Activate the venv with `.\.venv\Scripts\Activate.ps1`. After a
  version bump, reinstall the package: `pip install -e .`.

## Architecture

API-first (see `docs/adr/0003-api-first-react-spa.md`): FastAPI exposes a JSON API under `/api`; the
React SPA consumes it; in production FastAPI also serves the built SPA as static files (single image
at first). Keep the web layer thin over a web-independent service layer:

- `src/walker/services/` — domain logic (imputation, fortnight aggregation, catalog import, timer
  rules). **Web-independent; must not import from `walker.api`.**
- `src/walker/api/` — routers + Pydantic `schemas.py` (the JSON contract) + dependencies.
- `src/walker/models/` — SQLAlchemy models; `db.py` holds the engine/session; migrations in `alembic/`.
- `config.py` — `Settings` via pydantic-settings (`WALKER_*` env). `exceptions.py` — `WalkerError`
  hierarchy; always `raise ... from e`.

Invariants baked into ADRs:

- Data is scoped to a `user_id` **from day one**; no auth for the POC (ADR-0007).
- Walker records **real durations to the minute** — no rounding, no targets (ADR-0005). Rounding to
  the quarter-hour and hitting 8h/day is the user's job inside T&E.
- Walker **does not automate T&E** (no scraping): it outputs a T&E-shaped matrix + checklist (ADR-0005).
- Timers are **capture-first**: start in one click with no input, categorize later; entries are
  editable (ADR-0006).
- DB access is **engine-agnostic** (SQLAlchemy + Alembic) so SQLite → external DBMS is config, not a
  rewrite (ADR-0004).

## Code style & quality

**Quality gate before every push — all clean:**

- Python: `ruff check`, `ruff format`, `mypy`, `pytest`.
- Frontend (`cd frontend`): `npm run lint`, `npm run format:check`, `npm run build`, `npm run test`.

- Ruff with a 120-character line limit; mypy strict.
- Type annotations mandatory, with explicit return types; modern unions (`Path | None`).
- Google-style docstrings; always use `pathlib.Path`.
- Surgical changes: match the surrounding style, touch only what's needed, clean up imports you add.

## Testing (TDD)

- Write a failing test before production code.
- Python tests live in `tests/test_*.py` (API endpoints in `tests/test_api_*.py`); annotate every
  test `-> None`. Use `tmp_path` for file output; mock external dependencies. Coverage gate:
  `fail_under = 80`.
- Frontend: Vitest + Testing Library, colocated under `frontend/src/`.

## Git & PRs (GitHub)

- Work on `feature/*` or `fix/*` branches from `develop`. `main` is production, `develop` is
  integration. Commit directly to `develop` only on explicit user request.
- Conventional Commits in English (`type(scope): description`); PR titles and descriptions in English.
- **Authorship**: do not sign commits, PRs, or docs with AI/Claude attribution — the user is the
  author of record.

## Backlog (`.backlog/`)

Per-lot markdown under `.backlog/`.

- One active lot per directory: `.backlog/<LOT-ID>/PRD.md` + `tickets/<NN>-<slug>.md`. Each ticket
  keeps a stable ID (`BIZ-`/`TEC-`/`CHR-`) in its `ID:` line; priorities P1–P3.
- `.backlog/README.md` is the hand-maintained lot index; `ROADMAP.md` holds sequencing.
- Status: single `Status:` line (⬜ ready · 🔄 in-progress · 🧑 waiting-human · ✅ done · 🚫 wontfix).
- `CHANGELOG.md` = shipped work; `.backlog/` = planned work — an item never lives in both. Move closed
  lots to `.backlog/archive/<LOT-ID>.md`.

## Domain & decisions

- **Ubiquitous language**: `CONTEXT.md` (glossary). Use those exact terms in code, API, and UI.
- **Architectural decisions**: `docs/adr/`. Read the relevant ADR before changing an area with a prior
  decision; add a new ADR when a decision is hard to reverse, surprising, and the result of a trade-off.
- **UI design brief**: `docs/design/handoff.md` (the prompt handed to the design tool).

## Agent skills

This repo is configured for the Matt Pocock engineering skills (`/to-prd`, `/to-issues`, `/triage`,
`/qa`). Per-repo config:

### Issue tracker

Local markdown under `.backlog/` (per-lot: `.backlog/<LOT-ID>/PRD.md` + `tickets/`). Code is on
GitHub; issues are tracked locally. Not triaged from external PRs. See `docs/agents/issue-tracker.md`.

### Triage labels

Single `Status:` line vocabulary (⬜ ready · 🔄 in-progress · 🧑 waiting-human · ✅ done · 🚫 wontfix)
mapping the five canonical roles. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context — `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.

## Language

All repo artifacts — code, docs, ADRs, commit messages, and **UI copy** — are in **English**.
Conversation with the user may be in French. T&E codes and labels keep their original wording.

## Run

- **Dev**: backend `walker` (or `uvicorn walker.api.app:app --reload`) on `:8000`; frontend
  `cd frontend && npm install && npm run dev` (Vite proxies `/api` to the backend).
- **Container**: `docker compose up --build` → <http://localhost:8000> (serves API + SPA; SQLite lives
  on the `walker-data` volume).
- **Migrations**: `alembic upgrade head` (once the first models & migration exist).
