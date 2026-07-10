# BIZ-061 — Global Help link to the docs site in the nav

ID: BIZ-061
Status: ✅ done
Type: feature
Priority: P3

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

The published documentation site (`https://davidp57.github.io/walker/`) is only reachable from the
app through a single **contextual** link — the "catalog-import" `<a>` inside `CodeCatalogScreen`
(`frontend/src/screens/CodeCatalogScreen.tsx`). There is no global, always-available way to reach
the docs home from anywhere in the app, so a user who is not on the Code-catalog screen has no entry
point to the documentation.

## What to build

Add a persistent **Help** entry point in the app navigation (`AppShell`) that opens the docs-site
**root** in a new tab.

- Render a Help item in **both** nav surfaces so it works on desktop and phone:
  - the desktop sidebar (`wk-nav`), and
  - the phone bottom tab bar (`wk-tabbar`).
- It is an **external link**, not an app route — it must not change the `Route` / active-nav state.
  Open `https://davidp57.github.io/walker/` in a new tab with `target="_blank"` +
  `rel="noopener noreferrer"`. Keep the URL casing lower-case `/walker/` (see TEC-007).
- Use a **help/question-mark icon** (add `IconHelp` to `frontend/src/components/icons.tsx`, matching
  the stroke style of the existing nav icons) and the label `Help`.
- Place it visually apart from the route items (e.g. after `Settings`, or pinned near the sidebar
  footer) so it doesn't read as another screen tab. It never shows the active/selected state.
- Reuse the docs base URL rather than hard-coding the string twice — factor a small constant (e.g.
  `DOCS_SITE_URL` in `frontend/src/lib/links.ts`) and have both the new Help link and the existing
  `CodeCatalogScreen` contextual link build from it.

No backend change.

## Acceptance criteria

- [x] A **Help** item appears in the desktop sidebar and in the phone bottom tab bar.
- [x] Activating it opens `https://davidp57.github.io/walker/` in a new tab
      (`rel="noopener noreferrer"`); it does **not** change the active app route.
- [x] The Help item never renders the active/selected nav state.
- [x] The docs-site base URL is defined once and shared by the Help link and the existing
      `CodeCatalogScreen` contextual link.
- [x] Frontend test: the Help control targets the docs root URL, opens in a new tab with
      `rel="noopener noreferrer"`, and clicking it does not fire `onNavigate`.

## Blocked by

None.
