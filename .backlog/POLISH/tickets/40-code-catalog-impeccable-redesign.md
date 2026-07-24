# BIZ-081 — Code catalog screen refinement pass (impeccable critique)

ID: BIZ-081
Status: ✅ done
Type: refinement
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`. UI refinement of the Code catalog screen driven by an
`impeccable` design critique (28/40; snapshot in `.impeccable/critique/`).

## Problem

The catalog's highest-stakes action — deleting a real charge code from a shared catalog — fired on a
single click with no confirmation. Real vs virtual codes (ADR-0008) were near-indistinguishable
(virtual reused the activity-chip badge, tiers intermixed), the list dropped the design system's
ledger character (no colour bar, no hover), the editors ignored Escape and dimmed Save with no
reason, and the one-time Import sat at equal weight with the create actions.

## Solution (frontend-only)

- **Delete confirm** — a shared `InlineDeleteConfirm` guards the card ✕ and both editors' Delete.
- **Real/virtual** — a distinct outlined "virtual" badge, a muted card wash + softened rail; every
  card leads with its own code-colour bar (identity, DESIGN.md). "backed by" is dropped when it
  merely repeats the code's own number.
- **Ledger** — tightened rows with a row-hover rule.
- **Editors** — Escape closes (a shared `useEscapeToClose` hook); a disabled Save names the missing
  fields.
- **Header** — Import demoted to a quiet utility, set apart from the create actions.
- **Polish** — a Texas-Ledger empty state.

## Acceptance criteria

- [x] Deleting a code (card or editor) requires an inline confirm; in-use codes stay guarded.
- [x] Virtual codes are visually distinct; every card shows its colour rail.
- [x] Rows hover-highlight; Escape closes the editors; disabled Save explains itself.
- [x] Import reads as secondary to "New code".
- [x] Frontend quality gate clean; catalog/editor tests updated.
- [x] Verified live on prod-shaped data (28 codes).

## Delivery

Shipped in [PR #142](https://github.com/davidp57/walker/pull/142) → `develop`.

## Blocked by

None.
