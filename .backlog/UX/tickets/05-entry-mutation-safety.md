# BIZ-011 — Entry mutation safety (undo delete, deferred add, clearer row actions)

ID: BIZ-011
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot UX — `.backlog/UX/PRD.md`.

## What to build

Protect tracked time from mis-clicks. **Deleting an Entry becomes undoable** (an undo affordance that
restores it) instead of an immediate, irreversible delete. **`+ Add entry` persists nothing until
Save** (no phantom 09:00–10:00 Entry left when the editor is cancelled), matching the fortnight add
path. And **the row actions (edit / resume / delete) are made clearer and easier to hit** (less
ambiguous glyphs, adequate target size).

## Acceptance criteria

- [ ] Deleting an Entry offers an undo that restores it with its fields intact.
- [ ] `+ Add entry` followed by cancel leaves no persisted Entry.
- [ ] Row actions are visually clearer and have adequately sized click targets.
- [ ] Frontend tests: delete → undo restores the Entry; add-entry → cancel persists nothing.

## Blocked by

None — can start immediately.
