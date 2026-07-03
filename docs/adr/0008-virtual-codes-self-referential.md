# Virtual codes: user-created Timesheet codes backed by a real T&E code

You work on finer-grained things — projects, sub-topics — than T&E codes represent, and several of
them map to the **same** real T&E code (e.g. a project with no budget of its own, booked on a shared
code). You want to **track and classify by these in Walker**, while Time & Expenses only accepts real
**codes + activities**. The working name was "truc"; the concept is a **virtual code**.

A virtual code is a `TimesheetCode` with a nullable self-reference **`real_code_id`**: null = a **real**
code (exists in T&E, imported from the catalog); set = a **virtual** code (Walker-only), which
**inherits** `number`, technical `label`, and `activities` from its real code and has its **own**
`name` and `color`. An Entry references the code it was **tracked on** (real or virtual).

This yields **two levels of aggregation**:

- **Walker (working view)** — the Fortnight/Review grid groups by code, so a virtual code is its **own
  row**: the user's fine classification.
- **T&E (export)** — the Enter-in-T&E checklist and anything keyed into T&E **resolve virtual → real**
  and aggregate by **real code × activity**: virtual codes sharing a real code **collapse into one**
  T&E line.

`(user_id, number)` uniqueness holds for **real** codes only; a virtual code is identified by its
`name` (it shares its real code's number).

## Considered Options

- **A separate "Truc" entity, a hierarchy layer above Code (rejected)**: duplicates code-like
  machinery (catalog, picker, fortnight rows, colour) and adds surface; and the user's own framing is
  "a truc *is* a code".
- **Flat model — several code rows sharing a `number`, no self-reference (rejected)**: breaks the
  catalog import's upsert-by-number (which row to update?) and duplicates activities across rows, with
  no single source of truth.
- **Self-referential virtual code (chosen)**: reuses all existing code machinery; the only additions
  are one nullable FK and a resolve-to-real step. Fortnight classification "by truc" comes for free
  because the grid already groups by code.

## Consequences

- Minimal new surface: a nullable `real_code_id` on `TimesheetCode`, plus a virtual→real **resolve**
  step wherever T&E-facing aggregation happens (fortnight export, checklist).
- The two Fortnight modes no longer share an identical row set — Review groups **by code** (virtual
  rows), Enter-in-T&E resolves **to the real code**. This **amends** BIZ-007's "identical geometry"
  acceptance criterion (see the UX lot) to "same grid; Review by code, Enter resolved to real code".
- `number` is no longer unique per user; the catalog **import** upserts by number against **real**
  codes only — virtual codes are user-created and invisible to import.
- **Activities** have a single source (the real code); a virtual code resolves its activities from the
  real code rather than owning its own.
- Deleting a real code must consider the virtual codes that point to it (guard, like the existing
  in-use guard for Entries).
