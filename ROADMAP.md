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

## Now — not yet chosen

## Forward-looking (not scheduled)

- **SHIP** — professionalize Walker into a shareable, general-purpose app. Grilled in a domain session;
  decisions below, `/to-prd` + `/to-issues` still needed before this becomes real tickets.
  - **Vocabulary**: "Fortnight" → **Timesheet period**, "T&E"/"Time & Expenses" → **Timesheet system**,
    PwC branding removed (footer becomes `User.name`, optional, falls back to `username`). Done in
    `CONTEXT.md`; not yet done in code/UI strings.
  - **Timesheet period becomes a per-user setting**: weekly / semi-monthly (today's 1st–15th/16th–end,
    still default) / monthly presets — no custom cycles. See ADR-0009.
  - **Multi-tenant + SSO** (Google/Apple/Microsoft) for the **hosted instance only** — the standalone
    Docker/`.exe` keep ADR-0007's implicit-user, no-login behavior unchanged. New **Organization**
    entity, auto-joined by email domain (no invite flow). Real-code catalog becomes
    Organization-scoped (shared); virtual codes, Entries, and Tasks stay User-scoped (private). See
    ADR-0010.
  - **Docs site**: MkDocs + Material theme on GitHub Pages (model: VMCT v6's `mkdocs.yml`), hand-written
    user-facing guide content — distinct from `CONTEXT.md`/ADRs, which stay internal dev docs.
  - **Docs chatbot**: parked for now, but the target architecture is scoped — copy VMCT v6's
    `poc/doc-chatbot/` model verbatim: a free-tier Cloudflare Worker holding the Gemini API key
    (Origin allow-list + per-IP KV rate-limit), RAG over a KV-stored vector index built from the new
    user-facing docs (not the dev docs), `gemini-2.5-flash-lite` streaming answers, CI job to rebuild
    the index on doc changes. Zero cost (free tiers only, no paid vector DB) — see
    `VEAF/VEAF-Mission-Creation-Tools` (`develop-v6` branch) lot DOC-CHATBOT for the reference
    implementation.
  - **CI**: GitHub Actions, **blocking** (branch-protection required check) — backend
    ruff/mypy/pytest + coverage ≥80%, frontend eslint/vitest/build. Replaces today's manual
    before-merge gate-running with an enforced one.
  - **CD #1 — Docker**: the image *already* self-migrates (`alembic upgrade head && exec walker` in the
    existing `Dockerfile`) — the missing piece is publishing it automatically to **GHCR**, triggered on
    version tags (`vX.Y.Z`), same pattern as the Solde app.
  - **CD #2 — standalone `.exe`**: **PyInstaller**, bundling Alembic + backend + built frontend, no
    Python/npm/git needed on the target machine. Auto-runs `alembic upgrade head` on launch (mirrors
    Docker); SQLite lives in `%APPDATA%\Walker\`, not next to the binary. Opens the default browser to
    `http://localhost:8000` on launch; keeps a visible console window (no system-tray mode). Built and
    attached to a **GitHub Release** on version tags, mirroring the Docker CD.
- Shared TS types generated from the OpenAPI spec (ADR-0003).
- "Tracked vs theoretical hours" visual cue (default 8h, customizable) — nice-to-have.
- Multi-user: add an auth layer over the already user-scoped data (ADR-0007).
- Switch SQLite → external DBMS (PostgreSQL / SQL Server) when hosted (ADR-0004).
