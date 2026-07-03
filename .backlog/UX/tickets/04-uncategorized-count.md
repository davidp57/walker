# BIZ-010 — Uncategorized-Entry count

ID: BIZ-010
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot UX — `.backlog/UX/PRD.md`.

## What to build

Surface, persistently in the shell, how many Entries still lack a Timesheet code — so nothing is left
uncoded before the fortnight closes. Show a live count (on the Today nav item and/or the header) that
updates as Entries are categorized or new uncategorized Entries appear. Derived from the Entries
already loaded; no API change.

## Acceptance criteria

- [ ] The shell shows a live count of uncategorized Entries; at zero it is hidden or neutral.
- [ ] The count decreases when an Entry is categorized and increases when a new uncategorized Entry appears.
- [ ] The count is derived client-side from loaded Entries (no new endpoint).
- [ ] A frontend test asserts the count reflects uncategorized Entries and updates on categorization.

## Blocked by

None — can start immediately.
