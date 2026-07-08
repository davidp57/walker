# CHR-010 — Bilingual docs site (EN primary, FR secondary)

ID: CHR-010
Status: ⬜ ready
Type: chore
Priority: P3

## Parent

Lot I18N — `.backlog/I18N/PRD.md`.

## What to build

Turn the published MkDocs site (`docs-site/`) into a bilingual site: English primary (default,
served at the root, fallback), French secondary with full parity and a language switcher.

1. **Dependency**: add `mkdocs-static-i18n` to the `docs` optional-dependency group in
   `pyproject.toml`.
2. **Config** (`mkdocs.yml`): add the `i18n` plugin with two languages —
   English (`locale: en`, `default: true`) and French (`locale: fr`) — using the `suffix` file
   structure so English filenames stay unchanged. Keep the existing `search` plugin. Translate the
   `nav` labels per language via the plugin's `nav_translations`.
3. **Translations**: for each of the 7 existing pages, add its French sibling with the `.fr.md`
   suffix, translated in full:
   - `index.md` → `index.fr.md`
   - `getting-started.md` → `getting-started.fr.md`
   - `guide.md` → `guide.fr.md`
   - `self-hosting/docker.md` → `self-hosting/docker.fr.md`
   - `self-hosting/portainer.md` → `self-hosting/portainer.fr.md`
   - `self-hosting/sso.md` → `self-hosting/sso.fr.md`
   - `self-hosting/standalone-exe.md` → `self-hosting/standalone-exe.fr.md`
   Keep Timesheet-system code names, product names, and CLI/commands verbatim (per CLAUDE.md, T&E
   codes and labels keep their original wording).
4. **CLAUDE.md**: update the *Language* section to record the scoped exception — the published
   `docs-site/` may be bilingual (EN primary, FR secondary); code, ADRs, agent/design docs, commit
   messages, and UI copy stay English-only.

## Acceptance criteria

- [ ] `mkdocs build --strict` passes locally and in the `docs.yml` CI job with the new plugin
      installed via `pip install ".[docs]"`.
- [ ] The built site serves English at the existing paths (root unchanged) and French under the
      plugin's French paths; a language switcher is visible in the header on every page.
- [ ] All 7 pages have a complete French translation — no page falls back to English at ship time.
- [ ] Nav labels are translated in French (via `nav_translations`).
- [ ] Product/Timesheet-system code names and CLI commands are left verbatim in the French pages.
- [ ] CLAUDE.md's Language section documents the `docs-site/` bilingual exception.

## Blocked by

None — can start immediately.
