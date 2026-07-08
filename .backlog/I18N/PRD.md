# I18N — Bilingual user-facing documentation (EN primary, FR secondary)

Status: ⬜ ready
Branch: chore/i18n-* per ticket → PR → develop

## Parent

Requested directly by the user: the published documentation should be bilingual — English as the
primary language, French as a fully-maintained secondary.

## Problem Statement

Walker's published documentation site (`docs-site/`, MkDocs Material on GitHub Pages) is
English-only. The user base is at least partly French-speaking, and the day-to-day guide,
getting-started, and self-hosting pages are exactly the kind of content a French reader would rather
follow in French. There is today no French version and no way to switch language.

Note this is a deliberate, scoped exception to CLAUDE.md's "all repo artifacts are in English" rule:
it applies **only to the published user-facing site** (`docs-site/`). Internal dev docs — ADRs
(`docs/adr/`), agent docs (`docs/agents/`), design (`docs/design/`), commit messages, code, UI copy
— stay English-only.

## Solution

Make the MkDocs site multilingual with the `mkdocs-static-i18n` plugin: English stays the default
(served at the site root, the fallback for any untranslated page) and French is added as a second
language with a language switcher in the header. Every existing `docs-site/` page gets a
full, maintained French translation (full parity — no page left falling back to English at ship
time).

## Out of Scope

- **In-app (SPA) internationalization** — the React UI copy stays English-only (CLAUDE.md). This lot
  is documentation-only; app i18n, if ever wanted, is a separate future lot.
- **Internal dev docs** (`docs/adr`, `docs/agents`, `docs/design`) and the repo `README.md` — remain
  English-only.

## User Stories

1. As a French-speaking user, I want to read the getting-started, day-to-day guide, and self-hosting
   pages in French, so that I don't have to translate as I go.
2. As any reader, I want a visible language switcher, so that I can move between the English and
   French versions of the page I'm on.
3. As an English reader, I want nothing to change: English stays the default served at the site
   root.
4. As a maintainer, I want `mkdocs build --strict` to keep passing in CI, so that a missing or
   malformed translation is caught before it ships.

## Implementation Decisions

- **Plugin**: `mkdocs-static-i18n` (the de-facto standard for MkDocs Material multi-language),
  added to the `docs` optional-dependency group in `pyproject.toml`.
- **Structure**: per-file `suffix` layout (`index.md` = English default, `index.fr.md` = French),
  so English filenames/paths are unchanged and the diff is purely additive.
- **Default & fallback**: English is `default: true`; untranslated pages fall back to English (but
  at ship time every page is translated → full parity).
- **Language switcher**: enabled via the plugin's `nav_translations` + Material's language selector
  in the header.
- **CI**: `docs.yml` already runs `mkdocs build --strict` on push to `main`; the new plugin dep is
  installed via `pip install ".[docs]"` — no workflow change beyond the dependency.
- **CLAUDE.md**: the Language section is updated to record this scoped exception (published
  `docs-site/` may be bilingual; everything else stays English).
