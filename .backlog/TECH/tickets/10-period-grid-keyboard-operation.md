# TEC-014 — Keyboard operation of the Timesheet-period grid (checklist toggle + revealed real value)

ID: TEC-014
Status: ✅ done
Type: a11y
Priority: P2

## Parent

Lot TECH — `.backlog/TECH/PRD.md`. Surfaced by `/impeccable audit`. The checklist part is
pre-existing; the revealed-value part came with the redesign (`feat(ui)` 04a048a).

## Problem

Two keyboard gaps in the `PeriodGrid` (Enter-in-Timesheet-system mode):

1. **Checklist toggle (pre-existing).** A cell is ticked by clicking the `<td>` (`onClick`) with a
   `readOnly` `<input type="checkbox">` inside. The `<td>` isn't focusable and the checkbox is
   read-only, so ticking lines "entered" by keyboard is unclear — at odds with PRODUCT.md's stated
   keyboard-only aspiration for time entry.
2. **Revealed real value (from the redesign).** Under ¼h rounding, the real (unrounded) value is
   shown only on `td:hover` (`.wk-dur-real` → `display: inline`). It's not reachable by keyboard or
   exposed to assistive tech, so keyboard users can't see the real duration behind a rounded cell.

## Proposed fix

- Make checklist cells focusable and toggle on Space/Enter (roving tabindex or a real control),
  keeping mouse click + Shift-range + ⌘/Ctrl behaviour.
- Expose the real value to keyboard/AT — e.g. reveal `.wk-dur-real` on cell focus as well as hover,
  and/or an accessible label carrying both values.

## Acceptance criteria

- [x] Checklist lines can be marked/unmarked entirely by keyboard.
- [x] Range (Shift) and single-toggle (⌘/Ctrl) still work with mouse.
- [x] The real value is reachable by keyboard / announced to AT under rounding.
- [x] Frontend quality gate clean; a regression test covers keyboard toggle.

## Delivery

Each tickable checklist cell is now a real keyboard checkbox: `role="checkbox"` + `aria-checked` +
`tabIndex={0}` + `aria-label`, toggled on Space/Enter (Shift still extends a range via the keydown
modifiers); the inner `<input>` is `aria-hidden` decorative. A focus ring (`.wk-cell:focus-visible`)
marks the focused cell, and the real (unrounded) value now reveals on `:focus-visible` as well as
hover, so keyboard users see it. A `PeriodGrid.test.tsx` regression test drives the Space toggle.

Known minor residue: the real value on the daily-total row cells (`.wk-coltotal` / `.wk-grandtotal`)
is still hover-only (those cells aren't focusable) — left as-is; the per-cell values are the ones
that matter for keyboard entry.

Shipped via [PR #141](https://github.com/davidp57/walker/pull/141) → `develop`.

## Blocked by

None.
