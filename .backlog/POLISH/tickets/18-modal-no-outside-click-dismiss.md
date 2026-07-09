# BIZ-059 — Form modals don't dismiss on an outside click

ID: BIZ-059
Status: ✅ done
Type: fix
Priority: P3

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

Clicking outside a data-entry modal (on the overlay) closes it, silently discarding what you typed.
E.g. filling in "New code" and mis-clicking the backdrop loses the form. A form dialog should stay
open until you explicitly **Save** or **Cancel** (or ✕).

## What to build

Remove the overlay-click dismiss (`onClick={onClose}` on the `.wk-overlay` / `.wk-panel-overlay`)
from the four **form** modals, where an accidental outside click loses input:

- `CodeEditor`, `VirtualCodeEditor`, `TaskPanel`, `EntryEditor`.

They already have explicit exits — the ✕ close button and the Cancel/Save buttons — which stay.

**Out of scope (kept dismissable on outside click):** `CodePicker` and `CellEntriesModal` — no
unsaved input to lose, so click-outside-to-dismiss stays convenient there. (Escape handling, where
present, is unchanged — it's a deliberate key, not an accidental click.)

## Acceptance criteria

- [ ] Clicking the backdrop of `CodeEditor`, `VirtualCodeEditor`, `TaskPanel`, or `EntryEditor` does
      **not** close it; only ✕ / Cancel / Save do.
- [ ] `CodePicker` and `CellEntriesModal` still close on an outside click.
- [ ] A frontend test asserts a form modal stays open on a backdrop click and closes on Cancel.

## Blocked by

None.
