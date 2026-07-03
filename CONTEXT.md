# Walker

A personal daily task-tracking tool whose purpose is to fill the PwC timesheet (Time & Expenses)
painlessly at the end of each fortnight. Walker replaces Clockify with a tracker wired natively to the
T&E code catalog.

The name comes from *Walker, Texas Ranger*: the previous internal tool was called "Texas" (even worse
than Time & Expenses).

## Language

**Time & Expenses (T&E)**:
The official PwC web app where time must be entered and submitted each fortnight. The final
destination of what Walker produces. Notoriously unpleasant to use.
_Avoid_: "the timesheet system" (ambiguous).

**Timesheet**:
The set of time entries submitted to Time & Expenses for a given fortnight.
_Avoid_: using "timesheet" for tracking data (on Walker's side we say _tracking_).

**Timesheet code**:
The PwC charge code work is booked against. Has a **number** (e.g. `N9/6015238/020`), a **technical
label** (e.g. "MNT - PAP V4", "IT - Team meeting"), and a human **project name** — the *libellé*, e.g.
"Paper V4" — which is what the user reads first; the number is only needed for T&E. Walker also gives
each code a display **color**. In Time & Expenses each grid row is a code, picked by number, label or
client name.
(Whether the project name exists in the real T&E export, or must default to the technical label, is to
be confirmed with the catalog sample — see backlog BIZ-002.)
_Avoid_: "project code" (a Clockify _project_ is not the same object), "engagement code".

A code is either **real** (exists in Time & Expenses, imported from the catalog) or **virtual**
(see below).

**Virtual code**:
A Timesheet code that exists **only in Walker**, not in Time & Expenses — created by the user and
linked to exactly one **real** Timesheet code. It carries its own **name** (e.g.
"workday-work-contact-information") and **color**, but **borrows** its **number**, technical **label**,
and **Activities** from the real code it points to. Work is tracked and classified against virtual
codes, for a finer breakdown than T&E offers; for T&E every virtual code **resolves to its real code**,
so several virtual codes sharing a real code **collapse into one** T&E line.
_Avoid_: "truc" (a working placeholder), "sub-code" (that's an Activity's T&E code), calling it a new
hierarchy level (it is a *kind of* code, not a layer above codes).

**Activity**:
A sub-breakdown of a Timesheet code, with its own T&E **sub-code** (e.g. `0001`) and a **label**
(e.g. "Bug fixing"). Activities are **per code** — each code carries its own list (hierarchical:
Code → Activities); different codes may have different activities. Not every code has activities.
_Avoid_: "task" (reserved for the tracking side); a single global/shared activity list (it's per code).

**T&E entry**:
The elementary cell of a Timesheet: a (Timesheet code [+ Activity], Day) pair assigned a duration in
quarter-hours. A Timesheet is the matrix of these entries across the fortnight.
_Avoid_: "entry" alone (ambiguous with a tracking Entry).

**Fortnight**:
The fixed, calendar-based period a Timesheet covers: the 1st–15th, then the 16th–end of month. Each
fortnight has an **hours target** in T&E (working days × 8h; e.g. 88h for 1–15 July 2026) — but Walker
does not manage that target (see ADR-0005).
_Avoid_: "fortnight" in the loose sense of "any rolling two weeks".

**Fortnight view**:
Walker's grid that **reproduces how the fortnight looks in T&E**, to ease entry and tracking: weekends
greyed, Absence / part-time days shown pre-filled, working days receiving the Entries. Customizable to
match T&E closely.
_Avoid_: "calendar" (it's not an agenda), "planner".

**Absence**:
A non-worked day (or half-day) — leave, public holiday, part-time day… Each **type** of absence has
its own Timesheet code and is **already pre-filled in T&E**; Walker merely **reflects** it in the
Fortnight view, it does not re-enter it.
_Avoid_: "leave" as a generic term (it's one absence type among several).

**Quarter-hour**:
The entry granularity in Time & Expenses: every duration there is a multiple of 15 minutes. Walker
itself records the real duration to the minute; rounding to the quarter-hour is done by the user when
entering into T&E.

**Entry**:
A tracked period of work in Walker (start/end or duration), with a description, imputed to a Timesheet
code [+ Activity]. Can start **empty** (uncategorized) and be left to complete; all its fields (times,
duration, imputation, description) are **editable** afterwards. Records the **real** duration, to the
minute (no rounding). Aggregated, it feeds the fortnight's T&E entries.
_Avoid_: "log", "session".

**Timer**:
The stopwatch of an Entry in progress. Starts in **one click, with no input** (categorize later). You
can **switch** from one task to another (change code or description) without stopping the clock: the
Timer closes the current Entry and opens a new one. Its state is persisted server-side and survives a
restart.
_Avoid_: "stopwatch" (canonical = Timer).

**Task**:
A unit of work to do or being done, identified by its **title** — the same notion as the *comment* on
an Entry. A Task saved in the **task list** carries metadata: a markdown **description**, a status, and
an optional **Timesheet code** (real or virtual). Starting a **Timer** from a listed Task opens an
**Entry** whose description is the Task's title and whose code is the Task's code (the **Activity** is
still chosen). Time tracked without a listed Task — just a description typed on the Timer — is the same
notion, simply **not saved** in the list.
_Avoid_: "ticket", "issue"; "todo" for a listed Task (that word leans to the Entry checklist's sense).

**Code catalog**:
The list of Timesheet codes and Activities available to impute against, known locally by Walker.
Populated by **importing** a list (codes / labels / activities) exported or generated from T&E.
_Avoid_: "referential" (franglais), "project list".

**Entry checklist**:
The aviation-style checklist that tracks progress re-keying the Timesheet into Time & Expenses: each
line / cell is ticked once reported into T&E.
_Avoid_: "todo", "tracking".

**Clockify**:
The tracking tool used until now (app.clockify.me), which Walker **replaces** (see ADR-0001). It is a
UX reference (switchable Timer, military time entry) but not a dependency or a data source.
