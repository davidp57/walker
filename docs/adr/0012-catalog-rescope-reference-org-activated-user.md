# Catalog re-scope: reference per-Organization, activated codes per-User (deferred)

**Status:** accepted, **deferred** — not implemented until a hosted multi-user instance actually
exists. Supersedes the catalog-scoping decision of ADR-0010 (only that part; the Organization entity,
SSO, and auto-join-by-domain stand).

ADR-0010 made the **activated** real-code catalog (`TimesheetCode`, `real_code_id IS NULL`)
Organization-scoped (shared by all members) and left the **imported reference** catalog
(`ReferenceCode`) per-User. Revisiting it showed the two layers were conflated: the redundant-import
problem ADR-0010 set out to solve is about the *reference import* (colleagues re-importing the same
firm export), not the *activated set* (which codes each person actually charges to — inherently
personal).

**Decision (to apply when a hosted multi-user instance is built).** Split the catalog by layer:

- `ReferenceCode` (imported catalog) → **Organization-scoped**: imported once per org, shared source
  list. A user with no Organization (standalone `.exe`, ADR-0007) keeps a **private, User-scoped**
  reference (fallback).
- `TimesheetCode` real (activated codes) → **User-scoped** again: each user activates and imputes
  against their own subset; colour, number-uniqueness, Entries, and virtual codes are all personal.
- `TimesheetCode` virtual → **User-scoped** (unchanged).

Consequence: `list_codes(user)` becomes purely the user's real + virtual codes — the model-agnostic
assumption already relied on by the colour automation (CODEUX / BIZ-048) and view-preference work.

## Why deferred

Both current users run the standalone `.exe`, single-user, with no Organization. For a user without
an org, the existing code already falls back to **user-scoped** visibility
(`services/catalog.py::_visible_codes_filter`), so this re-scope is a **functional no-op** today. It
only changes behaviour once several real people share one hosted instance — which does not exist yet.
Recording the decision now prevents re-implementing ADR-0010's shared-activated model when multi-user
is eventually built.

## Migration (when implemented)

- **Reference → per-org:** merge each Organization's members' `ReferenceCode` rows into one set,
  deduplicated by `number`; on conflict the most recently updated row wins. No-org users keep a
  private user-scoped reference.
- **Activated real → per-user:** each real code is owned by its creator (`user_id`), dropping
  `organization_id`. Defensive branch for genuine multi-user data: if another user references a code
  (via an Entry, Task, or virtual code), create a user-scoped copy for them (colour + activities
  copied) and repoint their references. Expected to be empty in practice (everyone is org-of-one or
  no-org).
