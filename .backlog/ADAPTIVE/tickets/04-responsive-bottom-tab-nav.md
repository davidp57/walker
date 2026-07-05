# BIZ-033 — Responsive: bottom tab bar on phone-sized screens

ID: BIZ-033
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot ADAPTIVE — `.backlog/ADAPTIVE/PRD.md`.

## What to build

Below a phone-portrait width breakpoint, replace the fixed 238px sidebar (`AppShell`'s
`.wk-sidebar`) with a fixed bottom tab bar showing the same 5 sections (Activity, Timesheet period,
Tasks, Code catalog, Settings), driving the same `Route`/`onNavigate` contract `AppShell` already
exposes. Above the breakpoint, today's sidebar is unchanged.

This is a CSS + markup change inside `AppShell` — no new routing concept, no new state. Introduce
the breakpoint as a CSS custom property (e.g. `--wk-bp-phone`) if one doesn't already exist from a
sibling ticket (BIZ-034 uses the same breakpoint) so both stay in sync from one definition.

## Acceptance criteria

- [ ] Below the breakpoint, the sidebar is replaced by a bottom tab bar with all 5 sections,
      reachable with one tap each; the active section is visually distinguished.
- [ ] Above the breakpoint, the existing sidebar renders exactly as before — no regression.
- [ ] Resizing across the breakpoint (e.g. rotating a phone, or resizing a browser window) switches
      between the two without a reload or loss of the current screen/state.
- [ ] Verified manually at phone-portrait and desktop viewport sizes via the browser preview.

## Blocked by

None — can start immediately.
