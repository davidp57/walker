# BIZ-009 — Keyboard-driven timer loop

ID: BIZ-009
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot UX — `.backlog/UX/PRD.md`.

## What to build

Make the everyday Timer loop keyboard-first. Pressing **Enter** in the "What are you working on?" field
starts a Timer carrying that description (the one-click empty Start — capture-first — stays). Add
global shortcuts to **start / stop** the Timer and to **open the task switcher**, so the loop run
dozens of times a day needs no mouse.

## Acceptance criteria

- [ ] Enter in the description field starts a Timer with that description.
- [ ] A shortcut toggles start/stop of the Timer; a shortcut opens the task switcher.
- [ ] Shortcuts do not fire while the user is typing in an unrelated input (aside from the intended Enter-to-start).
- [ ] The capture-first empty Start still works with no input.
- [ ] Frontend tests cover Enter-to-start and the start/stop shortcut.

## Blocked by

None — can start immediately.
