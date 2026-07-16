# BIZ-071 — Edit the running timer's start time by clicking the whole widget, not just the "since" line

ID: BIZ-071
Status: ✅ done
Type: feature
Priority: P3

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

While a timer runs, you can correct its **start time** — but only by clicking the small
`since HH:MM` line under the stopwatch (`TimerBar.tsx`, the `wk-timer-since` span). That target is
tiny and easy to miss; the user expects clicking **the timer widget itself** (the running-clock area,
not just the little sub-line) to open the start-time edit.

## Current behavior

In `components/TimerBar.tsx`, the inline start-time editor is opened only from the `wk-timer-since`
span's `onClick` (it swaps `since HH:MM` for the `wk-input-inline` field, committed on Enter/blur via
`parseMilitaryClock` → `onEditStart`). The stopwatch itself (`wk-timer-clock` / the clock wrap) is
not clickable.

## Solution

Make the whole running-timer clock area open the start-time editor, so the click target is the
obvious big element rather than the small caption:

- When the timer is running (`running && startMinute != null && onEditStart`), clicking the clock
  region (`wk-timer-clock-wrap`, covering both `wk-timer-clock` and the `since` line) enters edit
  mode — same behavior currently on `wk-timer-since`.
- Keep the `since HH:MM` line working too; it's just no longer the only hit target.
- Show the affordance on the whole area (cursor/pointer, the existing "Edit the start time of the
  running timer" title) so it reads as clickable.
- No change when stopped, or when there's no running entry to edit.

## Acceptance criteria

- [ ] While a timer runs, clicking anywhere on the clock/widget area (not only the `since` line)
      opens the start-time edit field.
- [ ] Editing still commits on Enter/blur and cancels on Escape, via the existing
      `parseMilitaryClock` → `onEditStart` path (no new edit logic).
- [ ] The clickable area shows a clear affordance (pointer cursor + tooltip).
- [ ] Clicking the widget while **stopped** does nothing (no edit field, no phantom start).
- [ ] Frontend quality gate (lint, format, build, test) clean, with a test asserting a click on the
      clock area (not the `since` line) opens the editor.

## Delivery

Shipped in [PR #127](https://github.com/davidp57/walker/pull/127) → merged to `develop`. Sourcery
review addressed (added a `:focus-visible` ring; kept the TS-narrowing null guard and the
stopwatch-text test with rationale).

## Blocked by

None.

## Notes

- Scope is the click target only; the edit mechanism, parsing, and `onEditStart` wiring already
  exist and stay unchanged.
- Watch for overlap with the description input and the code chip — don't make unrelated parts of the
  bar swallow clicks meant for them.
