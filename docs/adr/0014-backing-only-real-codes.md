# Backing-only real codes: hidden real codes that exist only to back virtual codes

A virtual code (ADR-0008) is a `TimesheetCode` with a self-referential `real_code_id` pointing at a
**real** code, from which it borrows `number`/`label`/`activities`; the Timesheet-system export
resolves virtual → real and aggregates by real code × activity, and the "entered" ticks
(`ChecklistMark`) are keyed by that **real code's id**.

This makes the backing real code structurally necessary. But when a user creates a virtual code
backed by a reference-catalog code they don't otherwise track, materializing that real code as a
first-class catalog entry is unwanted: it forces a second, near-identical editor dialog (to give the
real code a colour, BIZ-049) and leaves a real code cluttering the catalog list that the user never
tracks on directly (BIZ-075).

## Considered Options

- **Virtual code backed directly by a reference number (no real-code row) — rejected.** Matches the
  user's mental model most literally, but the export resolves and the checklist ticks are keyed by the
  real code's **id**; dropping the real-code row forces resolution + `ChecklistMark` to re-key by
  **number**, a schema change that migrates persisted tick data. Large blast radius, hard to reverse,
  for a purely cosmetic gain.
- **Auto-create the backing real code but leave it visible — rejected.** Removes the second dialog but
  not the "extra code in my list" complaint.
- **Backing-only real codes (chosen).** Add a `backing_only` boolean to `TimesheetCode`. A backing-only
  real code is a normal real-code row for **all** domain logic (resolution, `ChecklistMark` keying,
  number uniqueness, reference-search exclusion) — nothing about ADR-0008's resolution changes — but it
  is **hidden** from the user-facing surfaces (Code catalog list, code pickers). It is created
  automatically, colour auto-assigned, with no editor step.

## Consequences

- Minimal new surface: one nullable-defaulting boolean column + a visibility filter at the
  presentation edges. The period grid, checklist, and `ChecklistMark` schema are untouched.
- The backing-only code stays in the API `list_codes` response so the SPA can still resolve a
  checklist line's number/label by id; the SPA filters `backing_only` out of the catalog and pickers.
- **Un-hide on explicit add:** adding the same code from the reference as a normal code clears
  `backing_only`, promoting it to a first-class tracked code.
- **Orphan cleanup:** deleting the last virtual code pointing at a backing-only real code deletes the
  backing too (guarded by the existing no-entries / no-other-virtuals checks).
- Known limitation: a number active only through a hidden backing (via its virtual's resolved number)
  is excluded from reference search, so re-adding it as a visible real code isn't reachable via search.
  Accepted for the single-user POC (ADR-0007).
- Amends ADR-0008: a real code may now be **hidden** (`backing_only`), but the virtual→real resolution
  model it defines is unchanged.
