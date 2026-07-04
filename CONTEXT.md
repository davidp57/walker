# Walker

A personal daily task-tracking tool whose purpose is to fill an external corporate timesheet
painlessly at the end of each period. Walker replaces Clockify with a tracker wired natively to that
system's code catalog.

The name comes from *Walker, Texas Ranger*: a previous internal tool at the author's employer was
called "Texas" (even worse than the corporate timesheet app it fed).

## Language

**Timesheet system**:
The external, corporate web app where time must be entered and submitted each Timesheet period. The
final destination of what Walker produces. Often notoriously unpleasant to use.
_Avoid_: "T&E" / "Time & Expenses" (that was PwC's own timesheet system's name — genericized, see
ADR-0009), "the timesheet" alone (ambiguous with the Timesheet concept below).

**Timesheet**:
The set of time entries submitted to the Timesheet system for a given Timesheet period.
_Avoid_: using "timesheet" for tracking data (on Walker's side we say _tracking_).

**Timesheet code**:
The charge code work is booked against, as defined by the Timesheet system. Has a **number** (e.g.
`N9/6015238/020`), a **technical label** (e.g. "MNT - PAP V4", "IT - Team meeting"), and a human
**project name** — the *libellé*, e.g. "Paper V4" — which is what the user reads first; the number is
only needed for the Timesheet system. Walker also gives each code a display **color**. In the
Timesheet system each grid row is a code, picked by number, label or client name.
(Whether the project name exists in the real export, or must default to the technical label, is to be
confirmed with the catalog sample — see backlog BIZ-002.)
_Avoid_: "project code" (a Clockify _project_ is not the same object), "engagement code".

A code is either **real** (exists in the Timesheet system, imported from the catalog — scoped to an
**Organization**, shared by everyone in it) or **virtual** (see below).

**Virtual code**:
A Timesheet code that exists **only in Walker**, not in the Timesheet system — created by a **User**
and linked to exactly one **real** Timesheet code. Unlike a real code, a virtual code is scoped to the
User who created it, not shared across the Organization. It carries its own **name** (e.g.
"workday-work-contact-information") and **color**, but **borrows** its **number**, technical **label**,
and **Activities** from the real code it points to. Work is tracked and classified against virtual
codes, for a finer breakdown than the Timesheet system offers; when exported, every virtual code
**resolves to its real code**, so several virtual codes sharing a real code **collapse into one**
Timesheet-system line.
_Avoid_: "truc" (a working placeholder), "sub-code" (that's an Activity's Timesheet-system code),
calling it a new hierarchy level (it is a *kind of* code, not a layer above codes).

**Activity**:
A sub-breakdown of a Timesheet code, with its own Timesheet-system **sub-code** (e.g. `0001`) and a
**label** (e.g. "Bug fixing"). Activities are **per code** — each code carries its own list
(hierarchical: Code → Activities); different codes may have different activities. Not every code has
activities.
_Avoid_: "task" (reserved for the tracking side); a single global/shared activity list (it's per code).

**Timesheet entry**:
The elementary cell of a Timesheet: a (Timesheet code [+ Activity], Day) pair assigned a duration in
quarter-hours. A Timesheet is the matrix of these entries across the Timesheet period.
_Avoid_: "T&E entry" (superseded), "entry" alone (ambiguous with a tracking Entry).

**Timesheet period**:
The calendar-based window a Timesheet covers, per a **period scheme** the user picks in Settings:
weekly, semi-monthly (1st–15th, then 16th–end of month — PwC's own scheme, and Walker's original,
still-default behavior), or monthly. Each period has an **hours target** in the Timesheet system
(working days × 8h) — but Walker does not manage that target (see ADR-0005). Formerly called a
"Fortnight" (PwC-specific wording, semi-monthly hardcoded); genericized so other period schemes are
possible (see ADR-0009).
_Avoid_: "Fortnight" (superseded), "pay period" (Walker doesn't touch pay), a period in the loose sense
of "any rolling window" (it's always one of the three fixed schemes).

**Timesheet period view**:
Walker's grid that **reproduces how the Timesheet period looks in the Timesheet system**, to ease entry
and tracking: weekends greyed, Absence / part-time days shown pre-filled, working days receiving the
Entries. Customizable to match the Timesheet system closely.
_Avoid_: "Fortnight view" (superseded), "calendar" (it's not an agenda), "planner".

**Absence**:
A non-worked day (or half-day) — leave, public holiday, part-time day… Each **type** of absence has
its own Timesheet code and is **already pre-filled in the Timesheet system**; Walker merely
**reflects** it in the Timesheet period view, it does not re-enter it.
_Avoid_: "leave" as a generic term (it's one absence type among several).

**Quarter-hour**:
The entry granularity in the Timesheet system: every duration there is a multiple of 15 minutes.
Walker itself records the real duration to the minute; rounding to the quarter-hour is done by the
user when entering into the Timesheet system.

**Entry**:
A tracked period of work in Walker (start/end or duration), with a description, imputed to a Timesheet
code [+ Activity]. Can start **empty** (uncategorized) and be left to complete; all its fields (times,
duration, imputation, description) are **editable** afterwards. Records the **real** duration, to the
minute (no rounding). Aggregated, it feeds the Timesheet period's Timesheet entries.
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

**Organization**:
A group of Users who share one **Code catalog** — real Timesheet codes (and their Activities) are
scoped to the Organization, not to the User, so colleagues at the same company import and impute
against the same catalog once. Formed automatically at sign-in: the first person with a given email
domain creates it, anyone signing in with the same domain joins it. Virtual codes, Entries, and Tasks
stay scoped to the **User** — never shared within the Organization (see ADR-0010).
_Avoid_: "tenant", "team", "workspace" (Organization is the one canonical word — it also matches how
the SSO providers themselves group accounts by email domain).

**Code catalog**:
The list of Timesheet codes and Activities available to impute against, shared by everyone in an
Organization. Populated by **importing** a list (codes / labels / activities) exported or generated
from the Timesheet system.
_Avoid_: "referential" (franglais), "project list".

**Entry checklist**:
The aviation-style checklist that tracks progress re-keying the Timesheet into the Timesheet system:
each line / cell is ticked once reported there.
_Avoid_: "todo", "tracking".

**Clockify**:
The tracking tool used until now (app.clockify.me), which Walker **replaces** (see ADR-0001). It is a
UX reference (switchable Timer, military time entry) but not a dependency or a data source.
