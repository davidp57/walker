# BIZ-055 — Open links in the task description via Cmd/Ctrl+click

ID: BIZ-055
Status: ⬜ ready
Type: feature
Priority: P3

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

The Task description is a Milkdown (ProseMirror) WYSIWYG editor (`MarkdownEditor`, commonmark + gfm),
so links **are** rendered — but a plain click places the caret to edit, it doesn't navigate. So
stored links feel "not clickable". The description only appears in this editor (`TaskPanel`), nowhere
read-only, so the fix is scoped there.

## What to build

Keep the editor behaviour intact (plain click still edits — you must be able to click into link text
to change it) and add the standard editor convention: **Cmd/Ctrl+click on a link opens it**.

- Intercept clicks on a link mark via Milkdown's `editorViewOptionsCtx` (`handleClickOn` /
  `handleDOMEvents.click`); when the modifier (Cmd on macOS, Ctrl elsewhere) is held, open the mark's
  `href`.
- Open in a **new tab** with `target="_blank"` + `rel="noopener noreferrer"`.
- Only open **safe schemes** — `http`, `https`, `mailto`; ignore anything else (e.g. a pasted
  `javascript:` URL) so a crafted link in notes can't execute.
- Show the URL as a native `title` tooltip on hover so the destination is visible.
- gfm autolink already turns bare URLs into links — those become openable too.

No backend change; no new heavy dependency (a click handler on the existing Milkdown view).

## Acceptance criteria

- [ ] Cmd/Ctrl+click on a link in the task description opens its href in a new tab
      (`rel="noopener noreferrer"`); a plain click still edits.
- [ ] Only `http`/`https`/`mailto` hrefs open; other schemes are ignored.
- [ ] Hovering a link shows its URL (native `title`).
- [ ] Frontend test: a modifier-click on a rendered link triggers an open with the expected safe URL,
      and a plain click does not.

## Blocked by

None.
