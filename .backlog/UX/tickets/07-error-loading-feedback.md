# TEC-002 — Visible API errors + loading feedback

ID: TEC-002
Status: ⬜ ready
Type: tech
Priority: P2

## Parent

Lot UX — `.backlog/UX/PRD.md`.

## What to build

Stop swallowing API failures. Surface a visible error (toast / indicator) when a save or load fails, so
an edit is never lost silently on a tool of record. Add basic loading feedback so the empty state
("Adios, backlog") doesn't flash before Entries arrive.

## Acceptance criteria

- [ ] A failed save or load surfaces a visible error instead of silently reverting or doing nothing.
- [ ] Screens show loading feedback until first data arrives; the empty state appears only after a successful empty response.
- [ ] A frontend test asserts a mocked failing API surfaces an error to the user.

## Blocked by

None — can start immediately.
