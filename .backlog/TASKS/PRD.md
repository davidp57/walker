# Task manager — PRD

Status: ⬜ ready
Lot: TASKS
Branch: feature/task-manager → PR → develop

## Problem Statement

I keep a running list of things to do — some tied to a project or code, some not. Today they live
scattered in notes, and Walker (which already knows my time and my codes) has nowhere for them. When I
actually start working on one, I re-type its description into the Timer and re-pick its code by hand.
And recurring chores — keying my timesheet into T&E each fortnight — have nowhere to live, so I forget
them.

## Solution

Give Walker a task manager. I capture **Tasks** with the usual fields (title, a markdown description,
status, priority, due date, tags) and optionally link each to a **code** (real or virtual). I see them
two ways — a sortable/groupable **list** and a **kanban** board by status — and pick whichever fits.
When I start working, I hit a button on a Task to start a **Timer** with the Task's title as the
comment and its code prefilled; and I can mark it done straight from the Timer (Stop splits into
**Stop** and **Complete**). Recurring Tasks reappear on schedule, including "the last working day
before the fortnight ends." A Task is simply the persisted, metadata-rich form of *what I'm working
on* — the same notion as an Entry's comment.

## User Stories

**Capture**

1. As a consultant, I want to create a Task with a title, so that I capture a thing to do in one step.
2. As a consultant, I want a markdown **description** edited WYSIWYG (in preview) and stored as
   markdown, so that I can keep rich notes on a Task.
3. As a consultant, I want to **paste markdown** into a description and have it render, and **copy** it
   back out as markdown, so that I move notes in and out losslessly.
4. As a consultant, I want to set a **status** (To-do / In-progress / Waiting / Test / Done), so that I
   track a Task's progression.
5. As a consultant, I want to set a **priority**, so that I know what to do first.
6. As a consultant, I want to set a **due date**, so that time-sensitive Tasks surface.
7. As a consultant, I want free-text **tags** with autocomplete over tags I've used, so that I group
   Tasks my own way.
8. As a consultant, I want to link a Task to a **code (real or virtual)** or leave it **orphan**, so
   that project Tasks carry their charge code and loose Tasks still fit.
9. As a consultant, I want to **edit** any field of a Task, so that I can keep it up to date.
10. As a consultant, I want to **delete** a Task, so that stale items don't pile up.

**Views**

11. As a consultant, I want a **list** view of Tasks that I can sort and group, so that I scan them
    densely.
12. As a consultant, I want a **kanban** board with columns = the status workflow, so that I see and
    move progression at a glance.
13. As a consultant, I want to **toggle** between list and board, so that I use whichever fits the
    moment.
14. As a consultant, I want to move a Task across statuses on the board, with trivial Tasks going
    straight **To-do → Done** (skipping Waiting/Test), so that the board is never overkill.
15. As a consultant, I want a Task's detail (fields + the markdown editor) to open in a **side panel**,
    so that I edit without leaving the view.
16. As a consultant, I want to **group/sort** the list by status, priority, or due date, so that I
    organise the way I need.

**Tracking integration**

17. As a consultant, I want to **start a Timer from a Task** in one click, opening the Timer with the
    Task's **title as the comment** and the Task's **code prefilled** (Activity still chosen), so that
    starting work is instant.
18. As a consultant, I want starting a Timer on a **To-do** Task to move it to **In-progress**, so that
    its status reflects reality.
19. As a consultant, I want the Timer's **Stop** control to split into **Stop** and **Complete** while
    it runs on a Task, so that I can finish the Task from where I'm working.
20. As a consultant, I want **Complete** to stop the Timer and mark the Task **Done**, so that I close
    it in one action.
21. As a consultant, I want **Stop** to just stop the Timer and leave the Task's status unchanged, so
    that I can pause without closing it.
22. As a consultant, I want an Entry started from a Task to **carry that Task**, so that the link is
    recorded (and roll-up is possible later).

**Recurrence**

23. As a consultant, I want to make a Task **recurring** with a rule, so that routine work reappears
    on its own.
24. As a consultant, I want an **every-N-days** rule.
25. As a consultant, I want a **weekly** rule on chosen weekdays.
26. As a consultant, I want a **monthly** rule on a day-of-month.
27. As a consultant, I want a **fortnight-relative** rule anchored on a fortnight boundary (start or
    end), offset by N **working** days and snapped to working days (respecting my work rhythm +
    absences) — e.g. "the last working day before a fortnight ends" — so that my timesheet chore lands
    on the right day.
28. As a consultant, I want completing a recurring Task to **roll it forward** — its due date advances
    per the rule and its status resets to To-do — so that there's always one live instance and I never
    lose it.

**Navigation**

29. As a consultant, I want to reach Tasks from a dedicated **nav item**, so that the task manager has
    a home.

## Implementation Decisions

Frontend + backend. All data scoped to `user_id` from day one (ADR-0007); durations untouched
(ADR-0005).

- **New Task entity**: title (required — becomes the Timer comment when tracked), description (markdown
  text), status (enum: To-do, In-progress, Waiting, Test, Done), priority (optional), due date
  (optional), tags (free-text, many per Task), optional Timesheet-code reference (real **or** virtual),
  recurrence rule (optional), created/updated. Manual drag-ordering is out of scope.
- **Vocabulary**: "Task" is the persisted, metadata-rich form of what the Timer tracks; the Timer's
  informal "task" (comment + code/activity) is the same notion, simply not saved in the list. The
  Timer's "switch task" is **not** renamed.
- **Status workflow**: To-do → In-progress → Waiting → Test → Done; Waiting and Test are skippable;
  Done is terminal. Automatic transitions: starting a Timer on a To-do Task → In-progress; Complete
  from the Timer → Done. All other moves are manual.
- **Entry ↔ Task**: the Entry gains a **nullable Task reference** (Entry *—0..1 Task), set when a Timer
  is started from a Task; it powers Complete-from-Timer. Time **roll-up per Task** is out of scope (the
  link only).
- **Timer integration**: a start-from-Task action opens a Timer with the Task's title as the
  description and the Task's code prefilled (Activity chosen, as in the virtual-code flow). The Timer's
  Stop control **splits** into Stop and Complete whenever the running Entry is linked to a Task.
- **Two views** over the same Tasks with a toggle: a **sortable/groupable list** (grid, matching the
  app's dense data-grid aesthetic) and a **kanban board** with fixed columns = the status workflow
  (trivial Tasks skip the middle columns). Detail opens in a **side panel** (fields + markdown editor).
  New **"Tasks"** nav item.
- **Markdown editor**: a WYSIWYG-in-preview editor storing **markdown**, with **faithful markdown
  copy/paste** (round-trip). Standard richness — headings, bold/italic/strike, bullet/numbered lists,
  links, quotes, inline + block code, task-list checkboxes. Leading library **Milkdown** (markdown-
  native serialisation via remark) — to confirm/benchmark at implementation; **TipTap** is the
  fallback; **BlockNote** is rejected (its markdown is lossy, which contradicts the faithful-copy/paste
  requirement). Live docs were unavailable during design (Context7 quota); verify React-19 compatibility
  at build.
- **Recurrence**: **roll-forward on completion** — no history, one active instance; completing a
  recurring Task advances its due date per the rule and resets status to To-do. Rules: every N days;
  weekly (chosen weekdays); monthly (day-of-month); **fortnight-relative with a working-day delta**
  (anchor = fortnight start 1st/16th or **end** 15th/month-end; offset by N working days before/after;
  snapped to working days using the existing work rhythm + Absences). No RRULE/iCal.
- **Recurrence math is a pure, dependency-injected function** (takes work rhythm + absences as inputs)
  so it is deterministic and testable without a database.

## Testing Decisions

Test **external behaviour** through the highest seams; never internals. Coverage gate ≥ 80% unchanged.

- **Backend — API seam** (FastAPI `TestClient`, prior art `tests/test_api_*.py`): Task CRUD; status
  transitions; the Entry's Task link set on start-from-Task; Complete marking the Task Done; the
  recurrence next-due (including the working-day fortnight-delta) via the API.
- **Backend — pure service tests** (prior art: the fortnight-aggregation service tests): the recurrence
  date math (roll-forward + working-day fortnight-delta) as pure functions given seeded work rhythm +
  absences.
- **Frontend** (Vitest + Testing Library, prior art lot CORE): the list grid (sort/group); moving a
  Task on the board; the side-panel editor; start-timer-from-Task setting comment + code; the
  Stop | Complete split; and the markdown editor's **markdown round-trip** (paste md → edit → serialise
  md), asserted at the behaviour level, not the library's internals.

## Out of Scope

- Time **roll-up / totals per Task** (the Entry↔Task link only; a future addition).
- **Manual drag-ordering** of Tasks (sort by status / priority / due instead).
- Recurrence **history / per-occurrence records** (roll-forward keeps one active instance).
- **Virtual codes** (lot VCODE) — a Task links to whatever codes exist; before VCODE lands, real codes
  only.
- Any change to how durations are recorded or rounded (ADR-0005 stands).
- Full **RRULE/iCal** recurrence.

## Further Notes

- Decisions validated in a grilling + domain-modeling session; CONTEXT.md carries the **Task** term.
- Independent of VCODE: a Task may link to a virtual code once VCODE lands, but the two lots share no
  dependency and can ship in either order.
- The recurrence's fortnight-boundary + working-day logic reuses the same **Fortnight** and **work
  rhythm / Absence** concepts as the Fortnight view — keep them consistent.
- Next: `/to-issues` to slice into tickets — Task CRUD + list view; kanban board; markdown editor;
  Timer integration (Entry link + Stop | Complete); recurrence.
