# BIZ-067 — Add a task straight from a project section (kanban + list)

ID: BIZ-067
Status: ✅ done
Type: feature
Priority: P3

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

When Tasks are grouped by **Project (code)** (BIZ-036/BIZ-051), the section header (list) and the
swimlane head (kanban) name the project, but the only way to add a task to that project is the global
**+ New task** followed by manually re-picking the code the section already implies. Small, repeated
friction when capturing several tasks against the same project.

## Solution

Give **each project section** its own **Add** button that opens the new-task panel prefilled with
that section's code. The "No project" section adds a task with no code. The affordance appears only
when grouping by project (code); other groupings are unchanged.

### Behaviour

- **List** — a `+` on each project section header (`wk-task-group-add-<codeId>`, `none` for "No
  project").
- **Kanban** — a `+` on each project swimlane head (`wk-board-lane-add-<codeId>` / `-none`).
- Clicking opens the existing Task side panel in create mode with the code preselected; nothing is
  written until the user saves.

## Implementation

- `TaskPanel` gains an `initialCodeId` prop, used to seed the code state when creating a new Task
  (ignored when editing an existing one).
- `TasksScreen` and `TaskBoard` gain an optional `onNewInCode(codeId | null)`; `App` wires it to open
  the panel with `initialCodeId`.

## Acceptance criteria

- [x] Grouped by project, each list section header and kanban swimlane head shows an Add button.
- [x] It opens the new-task panel with that section's code prefilled ("No project" → no code).
- [x] The button is absent for non-project groupings.
- [x] Frontend tests cover list + board Add wiring and the `initialCodeId` prefill.
- [x] Frontend quality gate (lint, format, build, test) clean.

## Delivery

Shipped in [PR #120](https://github.com/davidp57/walker/pull/120) → merged to `develop`.

## Blocked by

None.
