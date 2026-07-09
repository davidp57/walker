# Roadmap — Walker

Sequencing source of truth: **what order, with which hard dependencies**. Scope and status live in
[`.backlog/`](.backlog/README.md). Priorities: **P1** blocker · **P2** useful · **P3** nice-to-have.

## Done

- **CORE** (MVP tracker) — the design UI wired end-to-end to a real FastAPI `/api`: catalog, timer/entries,
  fortnight aggregation, entry checklist, settings. See `.backlog/archive/CORE.md`.
- **VCODE** (virtual codes) — user-created codes resolving to a real timesheet code, two-level
  aggregation (Review by code, Enter in the timesheet system resolved to the real code). See
  `.backlog/archive/VCODE.md`.
- **UX** (post-MVP UX improvements) — keyboard-first daily loop, uncategorized count, delete undo,
  WCAG-AA contrast, label consistency, visible error/loading feedback, unified Fortnight grid (Review /
  Enter in the timesheet system). See `.backlog/archive/UX.md`.
- **TASKS** (task manager) — Tasks (markdown, status, priority, due, tags, optional code), list + kanban
  views (with drag-and-drop), start-timer-from-task, Stop\|Complete, recurrence. See
  `.backlog/archive/TASKS.md`.
- **SHIP** (professionalize Walker into a shareable app) — generic vocabulary ("Timesheet system",
  configurable Timesheet period), Organization-scoped catalog + SSO for a hosted deployment, SQLite WAL
  mode, MkDocs docs site on GitHub Pages, blocking CI + branch protection, Docker CD to GHCR, standalone
  `.exe` CD to GitHub Releases. See `.backlog/archive/SHIP.md`, ADR-0009, ADR-0010.
- **ADAPTIVE** (theme toggle + responsive phone layout) — dark-mode rendering fix, a real per-user
  dark/light/system theme (server-persisted, defaults to `prefers-color-scheme`), and a
  fully-functional phone layout (bottom tab bar, day-card Timesheet period grid, touch-capable
  Timer/entry-editing/kanban drag-and-drop). See `.backlog/archive/ADAPTIVE.md`.
- **PROJECTS** (project/code-centric tasks) — group tasks by their Timesheet code: a "Project (code)"
  group-by in the list and per-project swimlanes on the kanban, plus the searchable/creatable
  `CodePicker` on the Task editor (code-only mode). See `.backlog/archive/PROJECTS.md`.
- **I18N** (bilingual user-facing docs) — the published MkDocs site is bilingual: English primary
  (default/root/fallback), French secondary with full parity and a language switcher, via
  `mkdocs-static-i18n`; scope was `docs-site/` only. See `.backlog/archive/I18N.md`, CHR-010.

## Now — not yet chosen

- **CODEUX** (code colour automation + unified code-selection UX) — a single 64-colour palette
  (mirrored back/front, contract-tested) with a least-used-first random suggestion and a rich colour
  picker (BIZ-048), then a unified tiered code search (grouped by tier, sorted by name) applied to
  every picker, replacing the virtual-code backing `<select>` and routing reference activation through
  `CodeEditor` (BIZ-049). Sequenced BIZ-048 → BIZ-049. Model-agnostic w.r.t. the parked catalog
  re-scoping (see `IDEAS.md`). See `.backlog/CODEUX/PRD.md`.
- **POLISH** (living lot of small UX improvements) — first batch shipped (BIZ-038 … BIZ-047: running
  Timer in Activity, absence date range, description de-noise, task priority/due pills + inline
  status, time-proportion bars, kanban collapsible Done, catalog activity collapse, guided empty
  states, Review/Enter explainer). Ready next: BIZ-050 (one-click start-timer arrow on tasks, list +
  board), BIZ-051 (grouped task list as a single aligned table), BIZ-052 (flag overlapping
  entries + one-click trim), and BIZ-053 (persist per-user view preferences). Lot stays open for
  future UX polish. See `.backlog/POLISH/PRD.md`.

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
