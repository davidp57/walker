# TEC-009 — Code picker renders beneath the Timesheet-period cell modal (z-order)

ID: TEC-009
Status: ✅ done
Type: fix
Priority: P2

## Parent

Lot TECH — `.backlog/TECH/PRD.md`.

## Problem

In the Timesheet period **Review** view, drilling into a cell opens the `CellEntriesModal`. When you
try to change an entry's Timesheet code from there, the code selector (`CodePicker`) appears
**underneath** that dialog (Z-order), so it's unusable. Reported with a screenshot.

## Cause

Every modal shares one z-index (`--wk-z-modal`), so **DOM order alone** decides stacking — the
codebase's existing convention (see the `CodeEditor` "rendered last" comment in `App.tsx`). The
`CodePicker` block was rendered *before* `CellEntriesModal`, yet the picker is opened *from* that
modal, so the modal painted on top of it.

## What was built

- Moved the `CodePicker` block to render **after** `CellEntriesModal` in `App.tsx`, and still
  **before** `CodeEditor` (which must stay topmost so the picker's create-a-code-on-the-fly flow
  keeps stacking correctly). Pure reorder, no z-index/CSS changes.
- Added an `App.test.tsx` regression test that drives the real flow (period Review → open cell →
  click the entry's code) and asserts the picker overlay follows the cell modal in the DOM
  (`compareDocumentPosition`). It reproduced the bug (failed before, passes after).

## Acceptance criteria

- [x] Opening the code selector from the cell drill-down shows it above the cell dialog.
- [x] The create-on-the-fly (`CodeEditor`) flow still stacks above the picker.
- [x] Regression test reproduces the former z-order and passes after the fix.
- [x] Frontend quality gate (lint, format, build, test) clean.

## Delivery

Shipped in [PR #118](https://github.com/davidp57/walker/pull/118) → merged to `develop`.

## Blocked by

None.
