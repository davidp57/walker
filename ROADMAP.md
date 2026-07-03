# Roadmap — Walker

Sequencing source of truth: **what order, with which hard dependencies**. Scope and status live in
[`.backlog/`](.backlog/README.md). Priorities: **P1** blocker · **P2** useful · **P3** nice-to-have.

## Done

- **CORE** (MVP tracker) — the design UI wired end-to-end to a real FastAPI `/api`: catalog, timer/entries,
  fortnight aggregation, entry checklist, settings. See `.backlog/archive/CORE.md`.
- **VCODE** (virtual codes) — user-created codes resolving to a real T&E code, two-level aggregation
  (Review by code, Enter in T&E resolved to the real code). See `.backlog/archive/VCODE.md`.
- **UX** (post-MVP UX improvements) — keyboard-first daily loop, uncategorized count, delete undo,
  WCAG-AA contrast, label consistency, visible error/loading feedback, unified Fortnight grid (Review /
  Enter in T&E). See `.backlog/archive/UX.md`.

## Now — not yet chosen

## Forward-looking (not scheduled)

- **TASKS** — task manager (list + kanban, start-timer-from-task, recurrence). See `.backlog/TASKS/PRD.md`.
- **RELEASE** (working name) — professionalize Walker into a shareable, general-purpose app:
  - Genericize branding/domain wording — strip PwC/T&E-specific naming so the app reads as a generic
    time-and-expenses tracker (Timesheet code → configurable term, etc.).
  - Docs site on GitHub Pages, chatbot-assisted — model on the VMCT v6 doc site.
  - CI: efficient, covering unit tests, coverage gate > 80% (already the local `pytest`/`vitest`
    convention — wire it into an actual pipeline).
  - CD #1: standalone Docker image that runs Alembic migrations itself on boot — model on the Solde
    app's setup.
  - CD #2: standalone `.exe` bundling Alembic + backend + frontend.
  - Not yet scoped — grilling session + `/to-prd` + `/to-issues` planned for next session.
- Shared TS types generated from the OpenAPI spec (ADR-0003).
- "Tracked vs theoretical hours" visual cue (default 8h, customizable) — nice-to-have.
- Multi-user: add an auth layer over the already user-scoped data (ADR-0007).
- Switch SQLite → external DBMS (PostgreSQL / SQL Server) when hosted (ADR-0004).
