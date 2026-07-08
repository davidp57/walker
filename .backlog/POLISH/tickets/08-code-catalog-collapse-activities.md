# BIZ-045 — Code catalog: collapse a code's activities behind a count

ID: BIZ-045
Status: ⬜ ready
Type: feature
Priority: P3

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

In the Code catalog, each active code card renders all its activities as chips, making each card tall.
With a real set of codes you scroll a lot to see them all — density suffers.

## What to build

In `screens/CodeCatalogScreen.tsx`, collapse the activity chips by default behind a small expander,
e.g. "4 activities ▸", that expands to show the chips on click (per card). Codes with 0–1 activities
can stay inline (nothing to collapse). This shrinks the resting height of each card so more codes are
visible at once; search is unaffected.

## Acceptance criteria

- [ ] A code with several activities shows a compact "N activities" affordance at rest, expandable to
      reveal the chips; collapsing again hides them.
- [ ] Cards are visibly shorter at rest, so more codes fit on screen.
- [ ] A code with no/one activity renders without a pointless expander.
- [ ] Edit/delete and the virtual "backed by" line are unchanged.
- [ ] Frontend test covers expand/collapse of a multi-activity code.

## Blocked by

None.
