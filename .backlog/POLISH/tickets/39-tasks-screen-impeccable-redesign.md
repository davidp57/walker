# BIZ-080 — Tasks screen refinement pass (impeccable critique)

ID: BIZ-080
Status: ✅ done
Type: refinement
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`. UI refinement of the Tasks screen driven by an `impeccable`
design critique (snapshot in `.impeccable/critique/`).

## Problem

The Tasks screen was hard to triage at a glance and had a few rough affordances: no fast way to
surface what needs attention, a one-click task delete with no safety net, always-on column toolbars
and a blocking `window.prompt` for adding a kanban column, a start-timer control that was the
faintest thing on a card, cramped table headers, and a flavourless empty state.

## Solution (frontend-only)

- **Focus filter** — a transient "⚑ Focus" toggle that narrows both List and Board to tasks needing
  attention (overdue / due today / high priority) without touching the saved view; amber-lit with a
  live count, disabled when nothing qualifies.
- **Delete confirm** — the task panel's Delete arms an inline Keep / Delete confirm in place (no undo
  existed).
- **Board editing** — column tools reveal on hover/focus-within (floating, no card reflow); the
  `window.prompt` "+ column" becomes an inline field.
- **Start-timer prominence** — the card/row start action wears the interactive accent at rest.
- **Polish** — table headers 9px → 11px; a Texas-Ledger empty state.

## Acceptance criteria

- [x] Focus filter narrows List and Board and preserves the saved view/group; disabled at count 0.
- [x] Task delete requires a second confirm; Keep cancels.
- [x] Column tools hidden until hover/focus-within; add-column is inline (Enter commits, Esc cancels).
- [x] Start-timer reads as the accent action; drag handle stays quiet.
- [x] Frontend quality gate clean; component tests updated (Focus, delete, add-column, board reveal).
- [x] Verified live on prod-shaped data.

## Delivery

Shipped in [PR #142](https://github.com/davidp57/walker/pull/142) → `develop`.

## Blocked by

None.
