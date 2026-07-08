# Backlog — Walker

Per-lot backlog. Active lots are directories under `.backlog/<LOT-ID>/`; completed lots are compacted
into `.backlog/archive/<LOT-ID>.md`. Sequencing lives in [ROADMAP](../ROADMAP.md); this index is the
source of truth for **scope and status**.

## Legend

- **Status**: ⬜ ready · 🔄 in-progress · 🧑 waiting-human · ✅ done · 🚫 wontfix

## Active lots

| Lot | Status |
|-----|--------|
| [DOCS](DOCS/PRD.md) — User-facing documentation-site content (living lot; bilingual EN/FR pages) | 🔄 |
| [TECH](TECH/PRD.md) — Cross-cutting technical debt (living lot; tickets added/resolved individually) | 🔄 |

## Archived lots

| Lot | Status |
|-----|--------|
| [CORE](archive/CORE.md) — MVP tracker: domain model, catalog import, timer/entries, fortnight view, checklist, frontend shell | ✅ |
| [VCODE](archive/VCODE.md) — Virtual codes: user-created codes backed by a real T&E code, for finer classification (two-level aggregation; amends BIZ-007) | ✅ |
| [UX](archive/UX.md) — Post-MVP UX improvements: daily-loop keyboard flow, uncategorized count, delete undo, WCAG-AA contrast, label consistency, error/loading feedback, unified Fortnight grid (Review / Enter in T&E) | ✅ |
| [TASKS](archive/TASKS.md) — Task manager: Tasks (markdown, status, priority, due, tags, optional code), list + kanban views, start-timer-from-task, Stop\|Complete, recurrence, kanban drag-and-drop | ✅ |
| [SHIP](archive/SHIP.md) — Professionalize Walker into a shareable app: generic vocabulary, configurable Timesheet period, Organization-scoped catalog + SSO, docs site, CI, Docker + `.exe` CD | ✅ |
| [ADAPTIVE](archive/ADAPTIVE.md) — Theme toggle (dark/light, server-persisted) + a fully-functional responsive phone layout | ✅ |
| [PROJECTS](archive/PROJECTS.md) — Project (code)-centric task grouping (list group + kanban swimlanes) + unified searchable/creatable code picker on the Task editor | ✅ |
| [I18N](archive/I18N.md) — Bilingual user-facing documentation site (EN primary, FR secondary) via `mkdocs-static-i18n` | ✅ |

## ID prefixes & priorities

| Prefix | Meaning |
| --- | --- |
| BIZ-NNN | Business feature — direct user value |
| TEC-NNN | Technical — quality, refactoring, tests, security |
| CHR-NNN | Chore — tooling, documentation, CI, DevOps |

| Priority | Meaning |
| --- | --- |
| P1 | Critical — blocks the MVP |
| P2 | Useful — improvement to schedule |
| P3 | Nice-to-have — polish or optional technical debt |
