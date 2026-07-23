# TEC-015 — Replace layout-property animations with transform/clip

ID: TEC-015
Status: ⬜ ready
Type: perf
Priority: P3

## Parent

Lot TECH — `.backlog/TECH/PRD.md`. Surfaced by `/impeccable audit` (detector flagged
`transition: width`).

## Problem

A few hover interactions animate **layout properties**, which trigger reflow rather than staying on
the compositor:

- `.wk-merge-pill` animates `width` (26px → 86px) as it expands into the labelled pill on hover.
- `.wk-modal--picker .wk-picker-acts` reveals activities via `max-height` / `max-width`.
- The running-timer readout animates `box-shadow` continuously (breathes) while a timer runs.

All are small, hover-triggered (or single-element) so real-world impact is minor — but they read as
avoidable jank and the detector calls out the width transition.

## Proposed fix

- Prefer `transform` / `clip-path` / `grid-template-rows` over `width` / `max-height` where it gives
  the same visual (e.g. scaleX or a clip reveal for the pill; grid-rows for the activity reveal).
- Keep the existing `prefers-reduced-motion` guards.
- Where a layout animation is genuinely the simplest correct choice (e.g. the checklist progress
  bar's `width`), leave it and note why.

## Acceptance criteria

- [ ] The merge-pill expand and picker-activity reveal no longer animate `width` / `max-height`
      (or a written rationale explains why one must stay).
- [ ] Visual result is unchanged at rest and on hover.
- [ ] `prefers-reduced-motion` still disables the motion.
- [ ] Frontend quality gate clean.

## Blocked by

None.
