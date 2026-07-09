# User-defined task states — PRD

Status: ⬜ ready
Lot: STATES
Branch: feature/* per ticket → PR → develop

## Problem Statement

Task status is a hardcoded five-value enum (`todo → in_progress → waiting → test → done`) that both
draws the kanban columns and carries behaviour. Users want their own workflow — add, rename, reorder,
and delete states / kanban columns — without Walker dictating the stages. But some behaviour is tied
to specific statuses today (`done` is terminal for Complete, recurrence roll-forward, and the
collapsible column; `todo` is the default and the recurrence/nudge origin), so "just make it free"
would break those.

## Solution

Task states become a **per-user, ordered list** — each an opaque stable id + an editable label —
with **positional roles**: first = initial, last = terminal (see ADR-0011). Behaviour resolves
through position instead of naming `todo`/`done`. Editing happens in the kanban.

Two tickets, sequenced BIZ-056 → BIZ-057:

- **BIZ-056** — Backend: the state model, migration, positional roles, validation, and rewiring of
  Complete / recurrence / nudge / deletion-reassignment.
- **BIZ-057** — Frontend: in-kanban column editing (add/rename/move/delete) and dynamic
  columns/labels/order across the list, board, group-by and sort-by.

## Out of Scope

- **Per-Organization or shared workflows** — states are per-user (matching the User-scoping of Tasks,
  ADR-0007/0010). No sharing.
- **Extra reserved roles beyond initial/terminal** (e.g. a dedicated "in progress" role) — the nudge
  uses "the state after the first"; richer role semantics can come later if needed.
- **A Settings-screen editor** for states — the kanban is the editing surface for now; a Settings
  mirror is a possible later addition.
