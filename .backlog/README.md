# Backlog — Walker

Per-lot backlog. Active lots are directories under `.backlog/<LOT-ID>/`; completed lots are compacted
into `.backlog/archive/<LOT-ID>.md`. Sequencing lives in [ROADMAP](../ROADMAP.md); this index is the
source of truth for **scope and status**.

## Legend

- **Status**: ⬜ ready · 🔄 in-progress · 🧑 waiting-human · ✅ done · 🚫 wontfix

## Active lots

| Lot | Status |
|-----|--------|
| [UX](UX/PRD.md) — Post-MVP UX improvements: daily-loop keyboard flow, uncategorized count, delete undo, WCAG-AA contrast, label consistency, error/loading feedback, unified Fortnight grid (Review / Enter in T&E) | ⬜ |
| [TASKS](TASKS/PRD.md) — Task manager: Tasks (markdown, status, priority, due, tags, optional code), list + kanban views, start-timer-from-task, Stop\|Complete, recurrence | ⬜ |

## Archived lots

| Lot | Status |
|-----|--------|
| [CORE](archive/CORE.md) — MVP tracker: domain model, catalog import, timer/entries, fortnight view, checklist, frontend shell | ✅ |
| [VCODE](archive/VCODE.md) — Virtual codes: user-created codes backed by a real T&E code, for finer classification (two-level aggregation; amends BIZ-007) | ✅ |

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
