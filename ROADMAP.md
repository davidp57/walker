# Roadmap — Walker

Sequencing source of truth: **what order, with which hard dependencies**. Scope and status live in
[`.backlog/`](.backlog/README.md). Priorities: **P1** blocker · **P2** useful · **P3** nice-to-have.

## Done

- **CORE** (MVP tracker) — the design UI wired end-to-end to a real FastAPI `/api`: catalog, timer/entries,
  fortnight aggregation, entry checklist, settings. See `.backlog/archive/CORE.md`.

## Now — VCODE (virtual codes)

Let the user create finer-grained codes that resolve to a real T&E code for classification, without
changing what actually gets keyed into T&E. See `.backlog/VCODE/PRD.md`.

## Forward-looking (not scheduled)

- **UX** — post-MVP UX improvements (daily-loop keyboard flow, uncategorized count, delete undo,
  WCAG-AA contrast, label consistency, unified Fortnight grid). See `.backlog/UX/PRD.md`.
- **TASKS** — task manager (list + kanban, start-timer-from-task, recurrence). See `.backlog/TASKS/PRD.md`.
- Shared TS types generated from the OpenAPI spec (ADR-0003).
- "Tracked vs theoretical hours" visual cue (default 8h, customizable) — nice-to-have.
- Multi-user: add an auth layer over the already user-scoped data (ADR-0007).
- Switch SQLite → external DBMS (PostgreSQL / SQL Server) when hosted (ADR-0004).
