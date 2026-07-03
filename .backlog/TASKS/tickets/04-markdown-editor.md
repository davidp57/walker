# BIZ-019 — Markdown WYSIWYG editor for Task descriptions

ID: BIZ-019
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot TASKS — `.backlog/TASKS/PRD.md`.

## What to build

Replace the plain description field (from BIZ-016) with a **WYSIWYG-in-preview** markdown editor that
**stores markdown** and supports **faithful markdown copy/paste** (round-trip). Standard richness:
headings, bold/italic/strike, bullet/numbered lists, links, quotes, inline + block code, and task-list
checkboxes. Leading library **Milkdown** (markdown-native via remark); confirm React-19 compatibility
and benchmark at implementation — **TipTap** is the fallback.

## Acceptance criteria

- [ ] The Task description is edited WYSIWYG (in preview) and stored as markdown.
- [ ] Pasting markdown renders it, and copying yields markdown — a faithful round-trip across the standard feature set, including task-list checkboxes and code blocks.
- [ ] The editor lives in the Task side panel and persists on save.
- [ ] Frontend tests assert the markdown round-trip at the behaviour level (paste md → edit → serialise md), not the library's internals.

## Blocked by

BIZ-016.
