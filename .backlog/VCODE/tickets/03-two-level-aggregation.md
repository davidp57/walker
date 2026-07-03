# BIZ-014 — Two-level Fortnight / checklist aggregation

ID: BIZ-014
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot VCODE — `.backlog/VCODE/PRD.md`.

## What to build

Aggregate at **two levels**. The **Fortnight / Review** working view groups by code, so each **virtual
code is its own row** (the user's fine classification), and real codes without virtuals stay normal
rows. The **Enter-in-T&E** checklist **resolves** virtual codes to their real code and aggregates by
**real code × activity × day** — several virtual codes sharing a real code **collapse into one** line,
matching what is keyed into T&E. Durations stay real, to the minute (ADR-0005).

## Acceptance criteria

- [ ] The Fortnight/Review view shows one row per virtual code (and one per real code that has no virtual).
- [ ] The Enter-in-T&E checklist collapses virtual codes into their real code: one line per real code × activity × day.
- [ ] Row / daily / grand totals are exact summed real minutes (no rounding, no target).
- [ ] Backend service + API tests for the two-level aggregation; frontend tests (Review shows a row per virtual code; the checklist collapses to the real code).

## Blocked by

BIZ-012.
