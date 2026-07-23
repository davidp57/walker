# TEC-015 — Replace layout-property animations with transform/clip

ID: TEC-015
Status: 🚫 wontfix
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

## Resolution — wontfix (reviewed, kept)

Reviewed and deliberately kept as-is; the layout-property animations here are not worth reworking:

- **Merge pill `width`** — the pill is right-aligned and *alone* in a `height: 0` seam, so its
  width change reflows no siblings; the "layout thrash" the detector heuristic warns about doesn't
  materialise. A transform (scaleX) would distort the label text; a `clip-path` reveal would shift
  the resting node's carefully-placed position.
- **Picker activities `max-height`** — a single hovered accordion row. A `grid-template-rows` rewrite
  means restructuring `.wk-picker-code` to a grid, risking regression of the signed-off "Palette + B"
  design for negligible gain.
- The running-readout **`box-shadow` breathe** is a paint animation (not layout) on one small
  element, active only while a timer runs.
- All are already neutralised by `prefers-reduced-motion` guards.

Reopen if a profiler ever shows these on a hot path.

## Acceptance criteria

- [ ] The merge-pill expand and picker-activity reveal no longer animate `width` / `max-height`
      (or a written rationale explains why one must stay).
- [ ] Visual result is unchanged at rest and on hover.
- [ ] `prefers-reduced-motion` still disables the motion.
- [ ] Frontend quality gate clean.

## Blocked by

None.
