# TEC-012 — Hover-revealed controls have no touch fallback

ID: TEC-012
Status: ✅ done
Type: fix
Priority: P2

## Parent

Lot TECH — `.backlog/TECH/PRD.md`. Follow-up from the UI redesign (`feat(ui)` 04a048a) surfaced by
`/impeccable audit`.

## Problem

The redesign hides routine per-row controls until hover, via `opacity: 0` + reveal on
`:hover` / `:focus-visible`:

- `.wk-row-action` — edit / insert-break / resume / delete on Activity entry rows.
- `.wk-copy-code` — the copy-code button in the Timesheet-period grid row-head (the code number
  itself is no longer shown, so copy is the *only* way to get it).

On a **touch device there is no hover**, so these controls never appear and are unreachable. The
pre-existing per-day add (`.wk-period-add.is-quiet`) already handles this with a
`@media (hover: none)` fallback (shown at ~0.55 opacity); the new reveal controls don't.

Secondary: several touch targets are below the 44px "enhanced" size — merge node 26px,
`.wk-row-action` 28px, the copy button — fine for a mouse, small for touch.

Mitigated by desktop-first (PRODUCT.md: ~99% on the work PC), but the app ships a functional phone
layout (lot ADAPTIVE), so this is a real regression for touch.

## Proposed fix

- Add `@media (hover: none)` fallbacks so the revealed controls are visible/tappable on touch
  (mirror `.wk-period-add.is-quiet`), or switch to a tap-to-reveal affordance.
- Where feasible, grow touch targets toward 44px (or document them as desktop-only).
- Keep the desktop reveal-on-hover behaviour unchanged.

## Acceptance criteria

- [x] On a `hover: none` viewport, Activity row actions and the grid copy button are reachable.
- [x] Desktop reveal-on-hover behaviour is unchanged (`:hover` / `:focus-visible`).
- [x] Touch targets reviewed against 44px — kept as-is (desktop-first; the merge node is 26px,
      clearing the 24px WCAG 2.5.8 minimum; row actions 28px). Explicitly accepted as desktop-first.
- [x] Frontend quality gate (lint, format, build, test) clean.

## Delivery

Added a `@media (hover: none)` block in `walker.css` keeping `.wk-entry-list .wk-row-action` and
`.wk-copy-code` at `opacity: 1` on touch (mirrors the existing `.wk-period-add` fallback). Desktop
reveal-on-hover unchanged. Shipped via [PR #141](https://github.com/davidp57/walker/pull/141)
→ `develop`.

## Blocked by

None.
