# TEC-003 — WCAG-AA contrast + minimum functional text sizes

ID: TEC-003
Status: ⬜ ready
Type: tech
Priority: P2

## Parent

Lot UX — `.backlog/UX/PRD.md`.

## What to build

Fix the systemic readability issue. The secondary-text token used for most meta / totals / microcopy
currently measures ~3.2:1 on the app background — below the WCAG AA threshold of 4.5:1 — and is used at
9–11px. Lighten it to reach ≥4.5:1 (or reserve it strictly for non-essential decoration), and set a
minimum legible size for functional text (column headers, totals labels, meta).

## Acceptance criteria

- [ ] The secondary-text token used for readable content meets WCAG AA (≥4.5:1) against its background.
- [ ] Functional text (column headers, totals labels, meta) meets the agreed minimum size.
- [ ] Key screens (Tracker, unified Fortnight, catalog, settings) are spot-checked for dark-theme regressions.

## Blocked by

None — can start immediately.
