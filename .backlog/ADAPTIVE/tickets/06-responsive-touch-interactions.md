# BIZ-035 — Responsive: touch-capable Timer, entry editing, and kanban drag-and-drop

ID: BIZ-035
Status: 🧑 waiting-human
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

- [x] Starting and stopping the Timer works via touch tap on a phone-sized touch-capable viewport.
      (Plain `<button>` elements, no mouse-only handlers — verified by code inspection.)
- [x] Editing an Entry (opening the editor, changing fields, saving) works via touch.
      (Plain `<button>`/`<input>` elements throughout `EntryEditor.tsx` — verified by code inspection.)
- [x] Dragging a Task between kanban columns works via a touch drag gesture, without the page
      scrolling instead of the drag registering.
      (`touch-action: none` already present on `.wk-board-card` and `.wk-board-drag-handle` since
      BIZ-026, correctly scoped so `.wk-board-column`/`.wk-board-column-body` stay touch-scrollable.)
- [x] The code editor, entry editor, and task panel dialogs render fully on screen on a phone
      viewport, with no horizontal overflow or clipped content.
      (Verified by layout arithmetic at 375px viewport: `.wk-modal`/`.wk-panel` max-width 92vw ≈
      345px, no fixed-width element inside `CodeEditor`, `EntryEditor`, `VirtualCodeEditor`, or
      `TaskPanel` exceeds that. Found and flagged a separate, out-of-scope overflow bug in
      `CellEntriesModal` — not one of the three named dialogs — as a follow-up task.)
- [ ] Verified manually on a touch-capable browser viewport (browser preview with touch emulation)
      at phone-portrait size.
      **Not completed**: the session's browser-preview tooling was bound to a different git
      worktree/branch than this one, and Chrome DevTools MCP was unavailable in this environment.
      Live touch-emulation verification is still needed before fully closing this ticket.

## Blocked by

None — can start immediately.

## Implementation notes

No source code changes were required: the touch-action CSS (BIZ-026) and modal max-width (existing)
already satisfy every acceptance criterion covered by static inspection. This ticket's only change is
this status update, pending a human (or a session with working browser-preview tooling) to confirm
the last item live.
