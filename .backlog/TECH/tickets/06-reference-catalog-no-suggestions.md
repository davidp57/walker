# TEC-011 — Reference-catalog suggestions no longer appear when adding a code not yet in your list

ID: TEC-011
Status: ✅ done
Type: fix
Priority: P2

## Resolution (2026-07-16)

**Not a bug in the reported form, and not a scoping issue.** The reference API and both picker
surfaces work (see the investigation findings below). The user's real pain — reproduced with them —
was searching a **long catalog of their own codes**: the Code catalog screen never filtered the
displayed list, plain substring matching missed `HRHUB` → `Mnt - HR Hub`, and ordering wasn't
alphabetical. That is fixed in **BIZ-073** (`.backlog/POLISH/tickets/32-…`, PR #126).

Two latent gaps found here are **not fixed** and left as optional low-priority follow-ups (they don't
bite the current user — sparse active set):

1. Reference (Tier 2) search is server-side `ilike`, so it is not fuzzy (`HRHUB` won't match `HR Hub`
   in the *reference* catalog — only in the user's own codes).
2. `searchReference` applies `limit=20` **before** the client-side active-number filter; if the first
   20 matches are all already-active, addable matches below are never fetched. Clean fix: exclude
   active numbers server-side so the limit applies after exclusion.

Reopen or file a new TEC ticket if either follow-up becomes worth doing.

## Problem

When the user searches for a Timesheet code that isn't in their active list yet, the **reference
catalog** (Tier 2) no longer suggests anything to add. Reproduced by the user on the **Code catalog**
screen and in the **timer's code picker**; it's very likely the same everywhere, because every
code-selection surface shares one search path.

Expected: typing a query that matches a code in the imported reference catalog shows a
"From your reference catalog — add to your codes" section (or, on the Code catalog screen, the
suggestions list) with an `+ add` action. Actual: nothing appears; only already-active codes (Tier 1)
show.

## Where it lives (shared path)

All surfaces funnel through the same code:

- Frontend: `CodeCatalogScreen.tsx` and `components/CodePicker.tsx` both call
  `onSearchReference` → `lib/api.searchReference` → `GET /api/reference?q=…&limit=…`, then filter out
  already-active numbers via `codeSearch.sortReferenceByName`.
- Backend: `services/reference.search_reference(session, user_id, query, limit)` — filters
  `ReferenceCode.user_id == user_id` with an `ilike` over number/label/name.

So a single root cause plausibly breaks all surfaces at once ("c'est partout pareil").

## Prime suspect — user vs. organization scoping

There is a scoping asymmetry between the two catalogs:

- **`reference_codes`** is scoped by **`user_id`** (`models/reference_code.py`,
  `uq_reference_code_user_number`).
- **`timesheet_codes`** (active codes) is scoped by **`organization_id`** — shared across all
  Organization members (ADR-0010, SHIP lot).

Consequence: if the reference catalog was imported under one `user_id`, but the current session's
`user_id` differs (e.g. an account created/rebound via SSO after the org work landed), then the
**active codes still show** (they're shared org-wide) while the **reference search returns nothing**
(scoped to a `user_id` that has no reference rows). That matches the "I still see my codes but get no
suggestions" symptom exactly.

Evidence (indicative only — from the stale repo-root `walker.db`, pre-org migration): 9131
`reference_codes` all under `user_id = 1`. If the live user's id is no longer `1`, the search comes
back empty.

## Investigation steps (do these first — confirm before fixing)

- [x] Reproduce on the live DB: log the resolved `user_id` for the session, then
      `SELECT user_id, COUNT(*) FROM reference_codes GROUP BY user_id` and compare. Empty for the
      live user_id ⇒ scoping/data mismatch (this ticket's prime suspect).
- [x] If reference rows exist for the live user_id, check the frontend path instead: is
      `onSearchReference` wired on both surfaces, is the debounced request firing (`/api/reference`
      in the network tab), and does `sortReferenceByName` filter everything out?
- [x] Confirm whether it's a regression: which release last showed suggestions (SHIP/org-scoping is
      the suspected boundary).

## Investigation findings (2026-07-16) — prime suspect DISPROVEN

Reproduced against the live running app (v1.6.0, `auth_mode: none`, single user; backend serves the
built SPA on :8000) by driving both surfaces in-browser and hitting the API directly.

- **The API works.** `GET /api/reference?q=…` returns populated, correctly-scoped results for every
  term tried (`N9`, `mnt`, `Connect`, `Workday`, empty query, …). The reference catalog holds ~9k
  codes owned by the current session user. **No scoping/data mismatch** — the `user_id` vs
  `organization_id` asymmetry is real in the schema but does **not** cause this here (no SSO, one
  user, and the session user owns the reference rows).
- **Both surfaces work** for a genuinely-not-active code. On the Code catalog screen and the timer
  `CodePicker`, searching e.g. "Connect" renders 17 / 34 add-able suggestions under "From your
  reference catalog". Wiring (`onSearchReference` / `onActivateReference`) is intact on all picker
  instances.
- **The only "no suggestions" cases are codes the user already has.** `sortReferenceByName` dedups by
  **number** (`activeNumbers.has(r.number)`, introduced in BIZ-049, #105 — not a recent regression).
  Terms like `APSAL`, `ScanUp`, `N9/6069436`, `Mnt - Workday Product` return nothing *because the
  real code for that number is already active* (the user has 23 active codes over 15 distinct numbers,
  many virtual codes sharing a number). Hiding an already-owned code is arguably correct behavior.
- **Could not reproduce "no suggestion for a code not yet in my list."** Every non-active number
  tried does surface. The reported symptom is therefore **not currently reproducible**.

### Two real issues surfaced anyway (candidates, lower urgency than first thought)

1. **Latent limit-before-filter correctness gap.** `searchReference` fetches `limit=20`
   (server caps at 100), ordered by number ascending, and the active-number filter is applied
   **client-side afterwards**. If the first 20 matches are all already-active, addable matches further
   down are never fetched → zero suggestions despite valid results existing. Does **not** bite this
   user today (sparse active set), but it's a genuine gap. Clean fix: exclude already-active numbers
   **server-side** in `search_reference` so the limit applies after exclusion.
2. **Coarse dedup by number.** Once *any* code (including a virtual code) uses a number, the whole
   number disappears from suggestions. Fine when the real code is active (this user's case); worth
   revisiting if a number is only used by virtual codes.

### Most likely explanation for the report

A **transient state** when the user tried — e.g. mid re-import of the catalog (the user had recently
rebuilt the import CSV for BIZ-068, see the `te-catalog-export-query` note). Note `import_reference`
upserts and never deletes, so a normal re-import shouldn't empty the catalog — a failed/empty import
file is the more plausible transient cause. **Needs the user to confirm the exact search term and
rough timing** before committing to a fix.

## Likely fix directions (decide after investigation)

- Scope the reference catalog consistently with active codes (per Organization, ADR-0010) so any
  member sees the shared reference catalog, **or**
- Ensure reference-catalog ownership follows the user across SSO/account rebinding, **or**
- If purely a data issue: re-import / re-associate the reference catalog to the correct scope.

An ADR touch-up may be warranted if the fix changes the reference catalog's scoping model.

## Acceptance criteria

- [ ] Searching a query that matches an imported-but-not-active code shows it as an add-able
      suggestion on **both** the Code catalog screen and the timer code picker (and any other picker
      surface).
- [ ] Activating a suggestion adds it to the active codes (existing `add_from_reference` flow) and it
      then appears in Tier 1.
- [ ] A regression test drives the search path end-to-end and asserts a matching reference code is
      returned when it isn't already active — covering the scoping that broke it.
- [ ] Backend + frontend quality gates clean.

## Blocked by

None.
