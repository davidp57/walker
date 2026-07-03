# BIZ-023 — Timer integration (start-from-task, Stop | Complete)

ID: BIZ-023
Status: ✅ done
Type: feature
Priority: P2

## Parent

Lot TASKS — `.backlog/TASKS/PRD.md`.

## What to build

Link tracking to Tasks. The **Entry** gains a **nullable Task reference**, set when a Timer is started
from a Task. A **start-from-Task** action (list row / board card) opens a Timer with the Task's **title
as the comment** and the Task's **code prefilled** (Activity chosen, as in the virtual-code flow).
Starting a Timer on a **To-do** Task moves it to **In-progress**. While a Timer runs on a Task, the
**Stop** control splits into **Stop** (just stop) and **Complete** (stop + mark the Task **Done**).

## Acceptance criteria

- [x] Starting a Timer from a Task opens it with the Task's title as the comment and the Task's code prefilled; the Entry records the Task.
- [x] Starting a Timer on a To-do Task moves the Task to In-progress.
- [x] While the running Entry is linked to a Task, the control shows Stop and Complete; Complete stops the Timer and marks the Task Done; Stop leaves the Task's status unchanged.
- [x] Backend API tests (the Entry carries the Task; Complete marks it Done) + frontend tests (start-from-task sets comment + code; the Stop | Complete split).

## Blocked by

BIZ-021.
