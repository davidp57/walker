# TEC-014 — Keyboard operation of the Timesheet-period grid (checklist toggle + revealed real value)

ID: TEC-014
Status: ⬜ ready
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

- [ ] Checklist lines can be marked/unmarked entirely by keyboard.
- [ ] Range (Shift) and single-toggle (⌘/Ctrl) still work with mouse.
- [ ] The real value is reachable by keyboard / announced to AT under rounding.
- [ ] Frontend quality gate clean; a regression test covers keyboard toggle.

## Blocked by

None.
