# BIZ-087 — Done Tasks clutter the Tasks list: hide them behind a toggle

ID: BIZ-087
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

The Tasks list shows every Task, terminal state included, so finished work accumulates in the middle of
what still has to be done. The list is the default view, so this is the first thing seen on the screen.

Nothing existing covers it: the **Focus** filter (BIZ-080) is far narrower — it keeps only
overdue / due-today / high-priority, so it is a triage lens, not "hide what's finished" — and it is
deliberately transient. The kanban has `done_collapsed` for its Done column (BIZ-044); the list has no
equivalent.

## Solution

- The list hides Tasks in the **terminal state** (the last one, ADR-0011 — not a hardcoded "done") by
  default.
- A toggle brings them back, labelled with the count — "Done (12)" — so it never looks as though Tasks
  vanished. The count is what makes hiding safe rather than mysterious.
- Persisted per user in `ViewPreferences` (a new key alongside `done_collapsed`, whose kanban role it
  mirrors), so the choice survives a reload.
- Composes with the existing group-by / sort and with Focus rather than replacing any of them: Focus
  already excludes terminal Tasks, so with Focus on the toggle simply has nothing to add.

## Acceptance criteria

- [ ] By default the list shows no terminal-state Tasks; the toggle reveals them with a count.
- [ ] The choice is persisted per user and survives a reload.
- [ ] "Terminal" resolves through the user's own state list (renaming or reordering states keeps
      working — ADR-0011), with no hardcoded status id.
- [ ] Grouping and sorting still behave with the terminal Tasks hidden (no empty group left behind).
- [ ] The toggle is accessible: labelled, focus ring, state not conveyed by colour alone (BIZ-082).
- [ ] Tests: default hides, toggle reveals, count correct, preference persisted.
- [ ] Quality gate clean both sides.

## Blocked by

None.
