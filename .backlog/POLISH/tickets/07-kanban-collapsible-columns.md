# BIZ-044 — Kanban: tame the horizontal scroll (compact + collapsible Done)

ID: BIZ-044
Status: ⬜ ready
Type: feature
Priority: P3

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

The board has five fixed status columns (To-do, In progress, Waiting, Test, Done) at a 220px min
width, so it needs horizontal scrolling even on a desktop — while Test/Done are frequently empty. The
useful columns get pushed off-screen.

## What to build

Reduce the board's horizontal footprint so the active columns fit without scrolling in the common
case:

- Make **Done collapsible** — a narrow collapsed rail showing just the header + count, expandable on
  click (Done cards are rarely acted on; they mostly need to be *out of the way but countable*).
- Optionally tighten column min-width / spacing so the remaining columns fit a typical desktop width.
- A drop onto a collapsed Done column still works (drops there mark Done), and its collapsed state is
  remembered for the session.

Keep the status workflow itself unchanged (columns and drag semantics from BIZ-036 stay).

## Acceptance criteria

- [ ] The Done column can be collapsed to a narrow rail (header + count) and expanded again; state
      persists for the session.
- [ ] With Done collapsed, the other columns fit a typical desktop width without horizontal scroll
      (on a narrow/phone width the existing responsive behavior is unchanged).
- [ ] Dragging a card onto a collapsed Done still sets its status to Done.
- [ ] Frontend test covers collapse/expand and a drop onto collapsed Done.

## Blocked by

None. (Independent of, but shares the board with, BIZ-036 swimlanes.)
