# BIZ-015 — Edit / delete virtual codes + real-parent delete guard

ID: BIZ-015
Status: ✅ done
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

- [x] A virtual code can be edited (name, colour, target real code).
- [x] A virtual code can be deleted when no Entry uses it, and is blocked when in use (as for real codes).
- [x] Deleting a real code is blocked, with a clear reason, while virtual codes point to it — alongside the existing in-use-by-Entries guard.
- [x] API tests (edit/delete a virtual code; the real-parent delete guard) + a frontend test for the edit/delete affordance.

## Blocked by

BIZ-012.

## Comments

Backend: added `catalog.update_virtual_code` (mirrors `create_virtual_code`'s validation — target
real code owned/exists/not virtual, name unique per user excluding the code being edited) and a guard
in `catalog.delete_code` that rejects deleting a real code while any virtual code still points to it
(`real_code_id == code.id`), alongside the existing Entry-reference guard. Added `VirtualCodeUpdate`
schema and `PUT /codes/virtual/{code_id}` (registered before `PUT /codes/{code_id}` to avoid a path
collision), mapping `NotFoundError` → 404 and `ValidationError` → 409 like the other handlers.

Frontend: `VirtualCodeEditor` now takes a `code: TimesheetCode | null` prop (prefilling
name/color/realCodeId when editing) and an optional `onDelete`, mirroring `CodeEditor`.
`CodeCatalogScreen`'s Edit button routes to `onEdit` or the new `onEditVirtual` based on
`c.isVirtual`. `App.tsx`'s `virtualEditorOpen` boolean became `virtualEditor: { code } | null` so it can
carry the code being edited; `saveVirtualCode` picks create vs. update accordingly, and `onDelete` is
wired through (reusing the generic `deleteCode`). `isCodeInUse` now also returns `true` when a virtual
code points at the given real code, so the catalog's delete-button-disable UI matches the new
server-side guard. Added `updateVirtualCode` to `lib/api.ts`.

Tests: backend covers edit (name/colour/target change, persisted + reflected in `GET /api/codes`),
keeping a virtual code's own name on edit, rejecting a duplicate name from another virtual code,
rejecting an unknown (404) or virtual (409) new target, deleting an unused virtual code, blocking
delete of a virtual code referenced by an Entry, and blocking delete of a real code with a virtual
child. Frontend covers `CodeCatalogScreen`'s Edit routing (real → `onEdit`, virtual → `onEditVirtual`)
and `VirtualCodeEditor`'s create/edit title, prefill, delete button visibility, and save payload.
