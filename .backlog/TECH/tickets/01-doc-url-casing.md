# TEC-007 — Fix broken documentation-site URLs (/Walker/ → /walker/)

ID: TEC-007
Status: ✅ done
Type: fix
Priority: P2

## Parent

Lot TECH — `.backlog/TECH/PRD.md`.

## Problem

The published docs site lives at `https://davidp57.github.io/walker/` (repo is `davidp57/walker`;
GitHub Pages paths are case-sensitive, and `CHANGELOG.md` already uses the lowercase form). Several
links instead point to `/Walker/` (capital W) and are **broken** — they 404.

Occurrences (repo-wide):

- `mkdocs.yml:3` — `site_url: https://davidp57.github.io/Walker/` (drives the canonical URL, sitemap,
  and the i18n language switcher base — this is the "root" the idea referred to).
- `README.md:10` and `README.md:17` — the "Documentation site" link and the resources table.
- `frontend/src/screens/CodeCatalogScreen.tsx:170` — the catalog-import help link
  (`https://davidp57.github.io/Walker/catalog-import/`).
- `frontend/src/screens/CodeCatalogScreen.test.tsx:126` — the test asserting that href.

## What to build

Replace `/Walker/` with `/walker/` in all five occurrences. Verify no other capital-`Walker` URL
path exists (grep `davidp57\.github\.io/Walker`).

Note the split delivery per CLAUDE.md: `README.md` and `mkdocs.yml` may go direct to `develop`, but
the two `frontend/src/` files are **code** and must go via a `fix/*` branch → PR. Simplest to do the
whole casing fix as one `fix/*` PR so it stays atomic.

## Acceptance criteria

- [ ] No `davidp57.github.io/Walker` (capital W) remains anywhere in the repo.
- [ ] `mkdocs.yml` `site_url`, both README links, and the CodeCatalogScreen help link use
      `/walker/`.
- [ ] `CodeCatalogScreen.test.tsx` asserts the corrected lowercase URL and passes.
- [ ] Frontend quality gate (lint, format, build, test) is clean.

## Blocked by

None.
