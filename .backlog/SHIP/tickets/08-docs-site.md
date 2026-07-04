# CHR-005 — Docs site (MkDocs + Material) on GitHub Pages

ID: CHR-005
Status: ⬜ ready
Type: chore
Priority: P2

## Parent

Lot SHIP — `.backlog/SHIP/PRD.md`.

## What to build

Publish a public, user-facing documentation site on GitHub Pages using MkDocs with the Material theme
— mirroring the shape of VMCT v6's `mkdocs.yml` (theme config, nav structure, built-in search). Content
is written specifically for an external user (installation per distribution target — hosted, Docker,
standalone `.exe` — and a day-to-day usage guide), organized by what the reader is trying to do. This
is distinct from `CONTEXT.md` and `docs/adr/*`, which stay internal developer documentation and are not
surfaced on this site.

## Acceptance criteria

- [ ] An MkDocs + Material site builds successfully and deploys to GitHub Pages via a GitHub Actions
      workflow.
- [ ] The site's navigation is organized by user intent (e.g. Getting Started, Self-hosting / Docker,
      Standalone `.exe`, Day-to-day guide) rather than mirroring the internal dev-docs structure.
- [ ] Content is hand-written for an external reader — no content is copy-pasted verbatim from
      `CONTEXT.md` or `docs/adr/*`.
- [ ] Search works out of the box (MkDocs Material's built-in search).

## Blocked by

None — can start immediately.
