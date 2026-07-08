# BIZ-043 — Change a task's status inline from the list view

ID: BIZ-043
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

In the Tasks **list** view, changing a task's status requires switching to the board or opening the
side panel. For quick triage (marking things done, moving to in-progress), that's more clicks than it
should be.

## What to build

Let the user change a task's status directly on its list row — e.g. the status cell becomes a small
inline status selector (dropdown of To-do / In progress / Waiting / Test / Done), or a compact
control. Selecting a new status persists it immediately (reusing the existing task-update path, the
same one the board's move uses), with no need to open the panel.

- Clicking the status control must not also open the task panel (stop propagation, like the existing
  row Start action).
- The row reflects the new status immediately.

## Acceptance criteria

- [ ] The list row exposes an inline status control; changing it persists via the existing update
      API and the row updates in place.
- [ ] Interacting with the status control does not trigger the row's open-panel click.
- [ ] Board and panel status changes are unaffected.
- [ ] Frontend test covers picking a new status inline → update called with the new status, panel
      not opened.

## Blocked by

None.
