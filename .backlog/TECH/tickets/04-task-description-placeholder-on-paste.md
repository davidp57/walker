# TEC-010 — Task description placeholder stays visible after pasting text

ID: TEC-010
Status: 🔄 in-progress
Type: fix
Priority: P3

## Parent

Lot TECH — `.backlog/TECH/PRD.md`.

## Problem

In the Task **details** panel, the description editor's placeholder stayed visible **behind pasted
text**: pasting into an empty description didn't clear the placeholder.

## Cause

The placeholder was rendered from a *derived paragraph attribute* (`paragraphAttr` → `is-empty` +
`data-placeholder`, styled via `p.is-empty::before`). ProseMirror reuses the same `<p>` DOM element
across content changes and only diffs its children, so the derived attribute went stale — after a
paste the paragraph had content but kept its `is-empty` marker.

## What was built

- Replaced the derived attribute with a **ProseMirror decoration** (`$prose` + a `decorations`
  plugin in `MarkdownEditor.tsx`) recomputed on every editor state. It marks the sole empty leading
  paragraph and drops the mark the moment it has content, so the placeholder toggles correctly on
  paste, type, and delete. No CSS change.
- Added a `MarkdownEditor.test.tsx` regression test that pastes into an empty editor (real
  Milkdown/ProseMirror + clipboard plugin in jsdom) and asserts `p.is-empty` disappears. It
  reproduced the bug (failed before, passes after).

## Acceptance criteria

- [x] Pasting text into an empty description hides the placeholder.
- [x] The placeholder still shows when the description is empty and reappears if cleared.
- [x] Regression test reproduces the former behaviour and passes after the fix.
- [x] Frontend quality gate (lint, format, build, test) clean.

## Delivery

In review — [PR #119](https://github.com/davidp57/walker/pull/119) → `develop`.

## Blocked by

None.
