# CORE — MVP tracker (archived)

Status: ✅ done
Branch: feature/core → PR → develop

## Summary

Domain model, catalog import, timer/entries, fortnight aggregation, entry checklist, and settings —
delivered end-to-end (real FastAPI `/api`, SQLAlchemy + Alembic migrations, SPA wired off the mock
store). Full PRD and per-ticket detail are preserved in git history (`.backlog/CORE/` prior to
archival); this file keeps the ticket table for reference.

## Tickets

| ID | Title | Priority | Status |
| --- | --- | --- | --- |
| BIZ-001 | See the real Code catalog (foundation slice) | P1 | ✅ done |
| BIZ-002 | Edit & import the Code catalog | P1 | ✅ done |
| BIZ-003 | Track an entry end-to-end (Timer + entries) | P1 | ✅ done |
| BIZ-004 | Fortnight view from real entries | P1 | ✅ done |
| BIZ-005 | Entry checklist (T&E entry mode) | P2 | ✅ done |
| BIZ-006 | Settings (work rhythm, density, absences) | P2 | ✅ done |

## Verified against

- 47 backend tests passing, 95.76% coverage (`pytest`).
- Alembic migrations: `2c26d29416b2` (catalog), `097aee9a73aa` (entries), `857bcfc43322`
  (checklist marks), `3636fb0361b3` (settings & absences), `ee96a7476366` (reference codes).
- API routers cover every ticket's contract: `/codes`, `/catalog/import`, `/codes/from-reference`,
  `/timer/start|switch|stop`, `/entries`, `/fortnight/{date}`, `/fortnight/{date}/checklist`,
  `/settings`, `/settings/absences`.
- Frontend (`App.tsx`) calls the real client (`fetchCodes`, `fetchEntriesRange`, `fetchFortnight`,
  `fetchChecklist`, `fetchSettings`) — no mock store remains.
