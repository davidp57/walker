# User-facing documentation site — PRD

Status: 🔄 in-progress
Lot: DOCS
Branch: chore/docs-* or feature/* per ticket → PR → develop

## Problem Statement

The published docs site (`docs-site/`, MkDocs Material on GitHub Pages) is the front door for anyone
running Walker. As features land and questions recur, the site needs new or expanded pages — content
work that doesn't belong to a feature lot but shouldn't be lost as ad-hoc notes.

## Solution

A living lot for user-facing documentation-site content: pages are added/expanded here as gaps are
identified, and tickets are resolved individually (like the TECH lot), rather than the whole lot
closing at once. Internal dev docs (`docs/adr`, `docs/agents`, `docs/design`) are **out of scope** —
this lot is only the published `docs-site/`. Every page is bilingual EN/FR (see archived I18N lot).

## Out of Scope

- Internal dev docs and ADRs (`docs/`), the repo `README.md`, code, and UI copy.
- Anything that would publish organization-internal details (e.g. a specific employer's SQL/schema)
  on the public site — those stay in the internal `docs/`.
