# BIZ-035 — Responsive: touch-capable Timer, entry editing, and kanban drag-and-drop

ID: BIZ-035
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot ADAPTIVE — `.backlog/ADAPTIVE/PRD.md`.

## What to build

Make the app's core interactions actually usable by touch on a phone, not just readable:

- Starting/stopping the Timer and editing an Entry must work with a finger tap, same as a mouse
  click today.
- The Tasks kanban board's drag-and-drop (BIZ-026) already uses dnd-kit's `PointerSensor`, which
  natively covers touch pointers — no sensor or library change needed. Verify (and set, where
  missing) `touch-action: none` on the draggable Task cards so a drag gesture doesn't fight the
  browser's native scroll gesture.
- Confirm dialogs (code editor, entry editor, task panel) fit on a phone screen without horizontal
  overflow — `.wk-modal`'s existing `max-width: 92vw` should already cover this; this ticket
  verifies it rather than changing it.

## Acceptance criteria

- [ ] Starting and stopping the Timer works via touch tap on a phone-sized touch-capable viewport.
- [ ] Editing an Entry (opening the editor, changing fields, saving) works via touch.
- [ ] Dragging a Task between kanban columns works via a touch drag gesture, without the page
      scrolling instead of the drag registering.
- [ ] The code editor, entry editor, and task panel dialogs render fully on screen on a phone
      viewport, with no horizontal overflow or clipped content.
- [ ] Verified manually on a touch-capable browser viewport (browser preview with touch emulation)
      at phone-portrait size.

## Blocked by

None — can start immediately.
