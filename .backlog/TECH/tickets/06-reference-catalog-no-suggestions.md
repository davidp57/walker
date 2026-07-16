# TEC-011 — Reference-catalog suggestions no longer appear when adding a code not yet in your list

ID: TEC-011
Status: ⬜ ready
Type: fix
Priority: P2

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

- [ ] Reproduce on the live DB: log the resolved `user_id` for the session, then
      `SELECT user_id, COUNT(*) FROM reference_codes GROUP BY user_id` and compare. Empty for the
      live user_id ⇒ scoping/data mismatch (this ticket's prime suspect).
- [ ] If reference rows exist for the live user_id, check the frontend path instead: is
      `onSearchReference` wired on both surfaces, is the debounced request firing (`/api/reference`
      in the network tab), and does `sortReferenceByName` filter everything out?
- [ ] Confirm whether it's a regression: which release last showed suggestions (SHIP/org-scoping is
      the suspected boundary).

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
