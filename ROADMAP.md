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
- **TASKS** (task manager) — Tasks (markdown, status, priority, due, tags, optional code), list + kanban
  views (with drag-and-drop), start-timer-from-task, Stop\|Complete, recurrence. See
  `.backlog/archive/TASKS.md`.
- **SHIP** (professionalize Walker into a shareable app) — generic vocabulary ("Timesheet system",
  configurable Timesheet period), Organization-scoped catalog + SSO for a hosted deployment, SQLite WAL
  mode, MkDocs docs site on GitHub Pages, blocking CI + branch protection, Docker CD to GHCR, standalone
  `.exe` CD to GitHub Releases. See `.backlog/archive/SHIP.md`, ADR-0009, ADR-0010.

## Now — not yet chosen

- **ADAPTIVE** (theme toggle + responsive phone layout) — PRD ready, tickets not yet cut. See
  `.backlog/ADAPTIVE/PRD.md`.

## Forward-looking (not scheduled)

- **Docs chatbot**: parked for now, but the target architecture is scoped — copy VMCT v6's
  `poc/doc-chatbot/` model verbatim: a free-tier Cloudflare Worker holding the Gemini API key (Origin
  allow-list + per-IP KV rate-limit), RAG over a KV-stored vector index built from the new user-facing
  docs (not the dev docs), `gemini-2.5-flash-lite` streaming answers, CI job to rebuild the index on doc
  changes. Zero cost (free tiers only, no paid vector DB) — see `VEAF/VEAF-Mission-Creation-Tools`
  (`develop-v6` branch) lot DOC-CHATBOT for the reference implementation.
- Shared TS types generated from the OpenAPI spec (ADR-0003).
- "Tracked vs theoretical hours" visual cue (default 8h, customizable) — nice-to-have.
- Multi-user: add an auth layer over the already user-scoped data (ADR-0007).
- Switch SQLite → external DBMS (PostgreSQL / SQL Server) when hosted (ADR-0004).
