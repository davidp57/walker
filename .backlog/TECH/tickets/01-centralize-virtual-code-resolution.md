# TEC-004 — Centralize virtual-code resolution logic (backend/frontend)

ID: TEC-004
Status: ⬜ ready
Type: technical
Priority: P3

## Parent

Lot TECH — `.backlog/TECH/PRD.md`.

## What to build

The virtual-code "resolve to real code" rule (ADR-0008: a virtual `TimesheetCode` collapses into its
real code for T&E-facing views) is implemented independently in two places:

- Backend: `src/walker/services/fortnight.py::resolve_to_real_codes` (used by
  `services/checklist.py::derive_checklist`).
- Frontend: `frontend/src/lib/checklist.ts::resolveChecklistRows` (used by `App.tsx` to build the
  Enter-in-T&E rows passed to the unified `FortnightScreen` — BIZ-007 later merged the standalone
  `ChecklistScreen` into `FortnightScreen`'s Enter-in-T&E mode, but the resolution call site and the
  duplication it describes are otherwise unchanged).

If the resolution rule changes later, both places need updating in sync, and they could silently
diverge. Flagged in code review (sourcery-ai on
[PR #1](https://github.com/davidp57/walker/pull/1)).

Investigate whether the frontend's `resolveChecklistRows` can be eliminated by having the
Enter-in-T&E mode consume the already-resolved data from `GET /api/fortnight/{date}/checklist`
(`ChecklistItemRead[]`, already resolved to real codes server-side) instead of re-deriving resolved
rows client-side from the Review-level `FortnightRow[]`. This likely means changing
`frontend/src/lib/api.ts::fetchChecklist`'s return shape (it currently discards everything except an
`entered` boolean map) and updating `App.tsx`/`FortnightScreen.tsx` accordingly. Weigh this against
just keeping both implementations but adding a shared test fixture/contract test that fails if they
diverge. Pick whichever approach reduces duplication with the least blast radius.

## Acceptance criteria

- [ ] Either the frontend resolution step is eliminated (consuming server-resolved data), or a
      contract test exists that fails if the backend and frontend resolution rules diverge.
- [ ] No change in observable behavior (Review still shows one row per virtual code; Enter-in-T&E
      still collapses virtual codes into their real code).
- [ ] Existing backend + frontend tests for the two-level aggregation still pass; new tests added if
      the approach changes the code paths they exercise.

## Blocked by

None — can start immediately.
