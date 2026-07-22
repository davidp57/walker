# BIZ-075 — Virtual code: auto-create a hidden backing real code from the reference

ID: BIZ-075
Status: ✅ done
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

Creating a virtual code (ADR-0008) whose backing real code isn't in the user's active catalog is
clumsy:

- You pick the backing from the reference catalog, which routes through **`activateReference`** — it
  opens the **real-code editor** (to give the real code a deliberate colour, BIZ-049). That editor is
  visually near-identical to the virtual-code editor, so it reads as a confusing duplicate step.
- It leaves you with **two codes**: the virtual code *and* the newly-activated real code, which now
  clutters the Code catalog list — even though you only ever track on the virtual.

The user only wants the virtual code to exist as a first-class, tracked code. The backing real code
is a structural necessity (it's the resolve target for the Timesheet-system export, ADR-0008), but it
doesn't need to be a visible, standalone entry in the catalog.

## Solution — hidden ("backing-only") real codes

Chosen over a deeper model change (virtual→reference by number, which would have re-keyed the
persisted checklist ticks) because it delivers the same user-visible outcome at a fraction of the
risk. See ADR-0012.

- **`backing_only` flag** on `TimesheetCode` (real codes only). A backing-only real code exists solely
  to back virtual codes and to resolve the Timesheet-system export; it is **hidden** from the Code
  catalog list and the code pickers, but stays in the data layer (needed for checklist name
  resolution, number uniqueness, and reference-search exclusion). Resolution and `ChecklistMark`
  keying are **unchanged** — a backing-only code is a normal real-code row.
- **Auto-create, no second dialog.** Picking a reference code as a virtual's backing creates the
  backing real code directly (colour auto-assigned) via a dedicated endpoint — no real-code editor.
- **Un-hide on explicit add.** Adding the same code from the reference as a normal code
  (`as_backing=False`) flips `backing_only` off, so it becomes a first-class tracked code.
- **Cleanup.** Deleting the last virtual code pointing at a backing-only real code deletes the orphan
  backing too (no entries, no other virtuals).

## Acceptance criteria

- [x] Picking a reference code as a virtual's backing creates the backing real code **without** opening
      the real-code editor, and selects it.
- [x] The auto-created backing real code does **not** appear in the Code catalog list or the code
      pickers (timer / task). It stays visible in the virtual-backing selector (for resolution + reuse).
- [x] The virtual code resolves correctly for the Timesheet period grid + checklist (backing-only code
      behaves as a normal real code for resolution).
- [x] Adding the same code explicitly from the reference un-hides it (becomes a normal tracked code).
- [x] Deleting the last virtual backed by a backing-only code removes the orphan backing.
- [x] Python + frontend quality gates clean; Alembic migration for the new column.
- [x] Verified in the live browser (fresh backend + built SPA + migrated DB): backing on a reference →
      no editor, backing selected, catalog shows only the virtual; API confirms the hidden backing.

## Delivery

Shipped in [PR #132](https://github.com/davidp57/walker/pull/132) → `develop`.

**Correction during build:** the virtual-backing selector must receive the *full* code set (not the
`backing_only`-filtered `visibleCodes`), or it can't resolve an already-chosen backing for display or
let a second virtual reuse one. Backing-only codes are hidden everywhere **except** that selector.

## Blocked by

None.

## Notes

- Known limitation (accepted for the POC): once a number is active only through a hidden backing (and
  its virtual), it is excluded from reference search (the virtual's resolved number counts as active),
  so re-adding that number as a visible real code isn't reachable via search. Documented, not solved
  here.
