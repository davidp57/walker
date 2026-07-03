# BIZ-015 — Edit / delete virtual codes + real-parent delete guard

ID: BIZ-015
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot VCODE — `.backlog/VCODE/PRD.md`.

## What to build

Let the user **edit** a virtual code (name, colour, target real code) and **delete** it when nothing
uses it, reusing the existing code CRUD. Add a **guard** so a **real** code cannot be deleted while any
virtual code points to it — in addition to the existing block while Entries reference it — so a virtual
code is never orphaned.

## Acceptance criteria

- [ ] A virtual code can be edited (name, colour, target real code).
- [ ] A virtual code can be deleted when no Entry uses it, and is blocked when in use (as for real codes).
- [ ] Deleting a real code is blocked, with a clear reason, while virtual codes point to it — alongside the existing in-use-by-Entries guard.
- [ ] API tests (edit/delete a virtual code; the real-parent delete guard) + a frontend test for the edit/delete affordance.

## Blocked by

BIZ-012.
