# BIZ-069 — Double vertical scrollbar on the Walker screen

ID: BIZ-069
Status: 🔄 in-progress
Type: fix
Priority: P3

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

Reported by a user: the app shows **two vertical scrollbars** side by side.

## Cause

No reset of the UA `body` margin, so `body` kept its default ~8px margin. With `.wk-app` at
`height: 100vh`, the margin pushes the app 16px past the viewport → the **document** grows its own
scrollbar on top of the intended `.wk-outlet` scroll. Confirmed in-browser: `document.scrollHeight`
736 vs `clientHeight` 720 (= 2×8px), `getComputedStyle(body).margin === "8px"`.

## What was built

- `html, body { margin: 0 }` reset in `walker.css`, so only `.wk-outlet` scrolls.

## Acceptance criteria

- [x] Only one vertical scrollbar (the content outlet); the page/document does not scroll.
- [x] Verified in-browser: body margin `0`, `document.scrollHeight === clientHeight`, outlet still scrolls.
- [x] Frontend quality gate clean (lint, format, build, 397 tests).

## Delivery

In review — [PR #123](https://github.com/davidp57/walker/pull/123) → `develop`.

## Notes

No unit test: a UA-margin / `100vh` overflow isn't exercisable in jsdom (no layout engine) — verified
in the real browser.

## Blocked by

None.
