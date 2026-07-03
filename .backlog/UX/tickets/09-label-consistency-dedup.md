# CHR-001 — Label consistency + de-duplicate Code/Activity display

ID: CHR-001
Status: ⬜ ready
Type: chore
Priority: P3

## Parent

Lot UX — `.backlog/UX/PRD.md`.

## What to build

Tidy the labels. Align nav labels with their screen titles (e.g. "Today" / "Activity";
"Enter in T&E" / "Enter into T&E") so the same destination reads the same way. And hide a Code's
**Activity** line when it merely repeats the project name, so grid rows and Entry rows aren't doubled
with the same words (seen live with single-activity codes such as "Internal administration").

## Acceptance criteria

- [ ] Each nav label and its screen title read consistently.
- [ ] In grid rows and Entry rows, the Activity line is omitted when it equals the Code's project name.
- [ ] A frontend test asserts a single-activity Code (activity == project name) renders no duplicate line.

## Blocked by

None — can start immediately.
