# BIZ-007 — Unified Fortnight grid with Review / Enter in T&E toggle

ID: BIZ-007
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot UX — `.backlog/UX/PRD.md`.

## What to build

Merge the Fortnight and "Enter in T&E" screens into **one** Fortnight screen with a header segmented
toggle (**Review** | **Enter in T&E**), defaulting to Review. The standalone "Enter in T&E" nav item
and its route are removed (nav 5 → 4); the checklist screen's logic (fill order, cell/row toggling,
progress) folds into the unified screen. Grid geometry is identical across modes — including the
**Total column (row / daily / grand), now visible in both** — so it stays a 1:1 T&E mirror. Review
shows `+ Add entry` and no progress bar; Enter in T&E shows the progress bar, the `X / Y lines entered`
counter, and Reset. Both modes reproduce today's behavior. No API, schema, or persistence change.

## Acceptance criteria

- [ ] The nav has a single **Fortnight** entry and four items total; no separate "Enter in T&E" destination or route.
- [ ] The header toggle switches Review ⇄ Enter in T&E; the screen opens in Review; switching keeps the period and data in place.
- [ ] Review behaves as today: drill into a filled cell, prefilled new Entry on an empty working cell, `+ Add entry`, no progress bar.
- [ ] Enter in T&E behaves as today's checklist: toggle a cell, shift-click a column-major range, ⌘/Ctrl-click one, row `n/N` badge, progress bar + `X / Y lines entered` + Reset; `+ Add entry` hidden.
- [ ] The Total column shows in both modes; the running-Timer cell is tinted and read-only in both, and not tickable in Enter in T&E.
- [ ] Frontend tests drive the screen (toggle + mode-specific controls, Review drill/add, Enter tick/persist via mocked API, Total column in both, four nav items).

## Blocked by

None — can start immediately.
