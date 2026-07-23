# TEC-013 — Timer running-readout halo uses a hard-coded accent (light-theme drift)

ID: TEC-013
Status: ✅ done
Type: fix
Priority: P2

## Parent

Lot TECH — `.backlog/TECH/PRD.md`. Follow-up from the UI redesign (`feat(ui)` 04a048a) surfaced by
`/impeccable audit`.

## Problem

The running-timer readout "breathes" via the `wk-readout-breathe` keyframe, whose halo is written as
a **literal colour** rather than a token:

```css
/* frontend/src/styles/walker.css */
50% { box-shadow: 0 0 22px 1px rgba(91, 156, 246, 0.32); }
```

`rgb(91, 156, 246)` is the **dark-theme** accent (`--wk-accent` = `#5b9cf6`). In the **light theme**
the accent is darkened for AA (`#2f6fe0`), so the breathing halo keeps the dark-theme blue — a
violation of DESIGN.md's "Two-Theme-One-Hue" rule. (The dot ping already uses `var(--wk-accent)` and
is fine.)

## Proposed fix

- Drive the halo from the accent token, e.g.
  `box-shadow: 0 0 22px 1px color-mix(in srgb, var(--wk-accent) 32%, transparent)` at the 50% stop
  (and the transparent stop from the same token at 0%), so it follows the active theme.
- Verify in both themes (dark + `data-theme="light"`).

## Acceptance criteria

- [x] The breathing halo uses the accent **token**, not a literal.
- [x] In light theme the halo matches `#2f6fe0`, not `#5b9cf6`.
- [x] `prefers-reduced-motion` guard still disables the animation.
- [x] Frontend quality gate clean.

## Delivery

Fixed in the `wk-readout-breathe` keyframe: `box-shadow` at the 50% stop now uses
`color-mix(in srgb, var(--wk-accent) 32%, transparent)`, and the 0%/100% stop is a plain
`transparent` (blur/spread 0, invisible). Ships with the redesign PR (`feature/redesign-with-impeccable`
→ `develop`).

## Blocked by

None.
