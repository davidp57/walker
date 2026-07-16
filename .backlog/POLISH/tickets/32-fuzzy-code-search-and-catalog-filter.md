# BIZ-073 — Fuzzy code search, in-place catalog filtering, name-sorted everywhere

ID: BIZ-073
Status: ✅ done
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

With a long catalog (real + virtual codes), code search was hard to use:

- On the **Code catalog** screen the search box only queried the *reference* catalog (Tier 2) for
  codes to add — it never filtered the displayed list of the user's **own** codes, so a long list
  couldn't be searched in place.
- Matching was plain substring, so `HRHUB` did not find `Mnt - HR Hub` (a space breaks it).
- Ordering wasn't consistently alphabetical.

This is what the user actually experienced as "no suggestions" while investigating TEC-011 — the
reference API and pickers work; the pain was searching a long list. Supersedes the TEC-011 scoping
hypothesis (disproven).

## Solution (frontend-only)

- **Fuzzy matching** — `normalizeForSearch()` in `lib/codeSearch.ts`: NFD + strip diacritics +
  lower-case + drop non-alphanumerics. So `HRHUB` → `Mnt - HR Hub`, `developpement` →
  `Développement`, `6149505` → `N9/6149505/020`. `searchUserCodes` uses it, so **every picker**
  (timer, task panel, virtual-code backing) inherits fuzzy matching.
- **Filter the catalog list in place** — the Code catalog screen renders
  `searchUserCodes(codes, query, { codeOnly: true })`, fuzzy-filtered and name-sorted, with a
  distinct "No codes match" state (separate from the "No codes yet" onboarding).
- **Alphabetical everywhere** — the pickers already name-sorted (`searchUserCodes` /
  `sortReferenceByName`); the Code catalog list now does too.

## Acceptance criteria

- [x] `HRHUB` finds `Mnt - HR Hub`; accents and punctuation are ignored; number fragments match.
- [x] The Code catalog screen filters its own displayed codes by the query in real time (empty query
      shows all) and shows a no-match message when nothing matches.
- [x] Code lists render alphabetically by name on the catalog screen and in the pickers.
- [x] Unit + component tests cover fuzzy matching, in-place filtering, no-match, and sort order.
- [x] Verified in the live browser (Code catalog + timer picker): `HRHUB` → `Mnt - HR Hub`.
- [x] Frontend quality gate clean (lint, format, build, 407 tests).

## Delivery

Shipped in [PR #126](https://github.com/davidp57/walker/pull/126) → merged to `develop`. Sourcery
review addressed (Unicode `\p{L}`/`\p{N}` normalization; precompute-cache suggestion declined as
negligible at this scale).

## Blocked by

None.

## Notes

- Out of scope: server-side fuzzy on the **reference** catalog (Tier 2 still uses `ilike`), and the
  latent limit-before-filter gap in reference suggestions — both noted in TEC-011 as optional
  follow-ups.
