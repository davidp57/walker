# Day-to-day Guide

This page walks through how Walker is meant to be used, day to day: starting a timer, sorting your
tracked time into charge codes, and preparing the period-end view you re-key into your timesheet
system.

## The Timer

The Timer bar sits at the top of the app, always visible. Starting it takes one click — there's
nothing to fill in first. Type a short description of what you're doing if you like, but you don't
have to: you can leave it blank and sort it out later.

While the Timer is running, you can:

- **Switch tasks** without losing time: click the task chip to pick a different charge code (and,
  if the code has them, an Activity — a finer sub-category under that code). Switching closes the
  entry that was running and immediately opens a new one, so no time is lost or double-counted
  between the two.
- **Edit the start time** if you forgot to start the Timer exactly when you began working — click the
  "since HH:MM" label next to the clock and correct it.
- **Stop** to end the entry, or **Complete** (shown when the running entry is linked to a listed
  Task) to stop the Timer and mark that Task done in the same click.

Every duration is recorded to the minute — Walker never rounds. Rounding to whatever increment your
timesheet system expects (typically the quarter hour) is something you do when you copy the numbers
over there, not something Walker decides for you.

## Entries and categorizing

Everything you track — whether started from the Timer or added by hand — is called an **entry**: a
block of time with a description, optionally linked to a charge code and Activity. The Activity view
lists your entries, most recent first, so you can review and edit any of them: change the times, fix
the description, or attach a charge code you didn't pick while the clock was running.

An entry with no charge code yet is "uncategorized" — a small badge on the navigation shows you how
many are still waiting. There's no deadline to categorize an entry immediately; Walker is built
around capturing time first and sorting it out whenever is convenient, even the next day.

## Charge codes and the catalog

Walker's charge codes mirror the codes your timesheet system uses to bucket work, each with a number,
a label, and a color for quick visual scanning in the grid. You (or your organization) import this
list once from your timesheet system's own catalog (see [Importing your code catalog](catalog-import.md)),
and it becomes searchable when picking a code for an entry.

On top of those real codes, you can create **virtual codes**: your own, more specific categories that
point back to one real code (for example, splitting a broad "Project work" code into a few virtual
codes that mean something to you personally). Track and organize your time against virtual codes for
as fine a breakdown as you want — when it's time to prepare your timesheet, every virtual code
collapses back into the single real code it points to, so the system you're re-entering into only
ever sees the codes it actually knows about.

## The Timesheet period view

At the end of each period (weekly, twice a month, or monthly — whichever matches your timesheet
system, chosen once in Settings), switch to the period view. It reshapes your tracked entries into a
grid that looks like the entry screen of your timesheet system: one row per charge code, one column
per day, cells totaling the time you tracked.

The view has two modes:

- **Review** — a straightforward mirror of your tracked time by code, so you can sanity-check the
  totals before typing anything anywhere. Click any cell to see (and edit) the individual entries
  behind that total. Weekends are greyed out, and days you've marked as an absence (leave, a public
  holiday, and so on) are shown pre-filled, matching what your timesheet system already knows about
  those days.
- **Enter in [timesheet system]** — the same grid, but organized exactly as your timesheet system's
  own entry screen expects (virtual codes resolved back to their real code), with a checklist:
  tick each cell off as you key it into the other system. A progress bar tracks how much of the
  period you've re-entered, and Shift-click lets you tick a whole range at once.

Use the arrows (or "Today") above the grid to move between periods.

## Tasks

The Tasks screen is a lightweight to-do list, separate from time entries but connected to them. A
Task has a title, an optional description, a status (To-do, In progress, Waiting, Test, Done), and
optionally a charge code. View it as a simple list or as a kanban-style board you can drag cards
across.

Starting the Timer from a listed Task pre-fills the entry's description with the Task's title and its
charge code, so you don't have to re-type either — you still pick the Activity yourself. This is
useful for recurring or planned work you want to track consistently; for one-off things, typing a
description directly into the Timer without going through the Task list works exactly the same way.
