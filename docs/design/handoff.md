# Design handoff — Walker (time tracker → company timesheet)

You are a UI/UX designer. Design the interface of **Walker**, a personal time-tracking web app.
Deliver an **interactive prototype** of the key screens plus a small visual system (colors,
typography, components, states). All UI copy is in **English**.

## The product in one sentence
Walker helps a consultant **fill their company timesheet painlessly** (the company timesheet system,
notoriously unpleasant): you track your time during the day against the **real charge codes**, and at
the end of each fortnight Walker shows you **exactly what to enter** into the timesheet system.

## User & context
- **Single user** for now (a consultant). Multi-user is later, out of design scope.
- Today he tracks in **Clockify**, then **re-keys everything into the timesheet system by hand** every
  fortnight — a chore, because Clockify doesn't know the charge codes. **Walker replaces Clockify.**
- Usage: **99% on his work PC, in the browser.** Desktop-first. Responsive/mobile is a *bonus*, not
  a priority.

## Two references to keep in mind
- **Clockify** — for the tracking side: an always-visible timer bar, instant start, fast task
  switching, "military" time entry (`1345` = 13:45). Borrow this feel.
- **The timesheet system** — for the fortnight view: a **"BY CODE" grid** = code rows, day columns,
  one duration per cell; weekends greyed out; absence days pre-filled. Walker's fortnight view must
  **look like this grid** so re-keying is a 1:1 visual match.

## Non-negotiable UX principles
1. **One-click start**: start a timer with **zero input** (the user is often interrupted).
   Categorization comes later.
2. **Categorize later, everything editable**: an entry can be **uncategorized**; all its fields
   (times, duration, code, activity, description) are editable afterwards, including in a grid.
   Entries that "need completing" must be **visually flagged**.
3. **Persistent, always-visible timer**; you can **switch** task (change code/description) **without
   stopping the clock**.
4. **Military time entry** (`1345` → 13:45) everywhere a time is entered.
5. **No rounding, no targets in the UI**: Walker shows **real, to-the-minute** durations. Rounding to
   the quarter-hour and hitting 8h/day is the user's job inside the timesheet system — do **not** draw
   progress bars or enforce daily/fortnight totals.
6. **Fortnight view = mirror of the timesheet system** (see reference above).
7. **Aviation-style checklist**: at fortnight-end, a line-by-line checklist ticked off as each line is
   entered into the timesheet system — so nothing is missed or double-entered. Show progress.

## Vocabulary (use these exact labels in the UI)
- **Entry**: a tracked period of work (can be empty/uncategorized, always editable).
- **Timesheet code** (or just *code*): the charge code — a number (`N9/…`) + a label
  (e.g. "MNT - PAP V4").
- **Activity**: a code's sub-category (e.g. Bug fixing, Change request, Communication & Meeting,
  Support).
- **Fortnight**: the period from the 1st–15th, then 16th–end of month.
- **Absence**: a non-worked day (leave, public holiday, part-time) — already handled by the timesheet
  system, just **reflected** here.

## Screens to design (proposed inventory, refine as needed)
1. **Today / Tracker** (home, the daily driver): big always-visible running timer, a "start" button,
   today's entries list, quick task switcher, inline editing (military time).
2. **Entry editor**: code/activity/description/times (inline + within the grid).
3. **Fortnight view (timesheet mirror)**: the BY-CODE grid for the fortnight, real durations aggregated
   per Code × Activity × Day, weekends greyed, absences shown.
4. **Timesheet entry mode / Checklist**: a guided, tick-as-you-go list derived from the grid, with
   progress (X/Y lines entered).
5. **Code catalog**: browse/search codes & activities; import from a file.
6. **Settings**: fortnight-view personalization (work rhythm, part-time, absences).

## States to cover
Empty (no entries) · timer running · uncategorized entry (needs completing) · a full day · a fortnight
mid-entry (checklist partially ticked).

## Do NOT design (non-goals)
- No **timesheet automation** (no "submit to the timesheet system" button).
- No **rounding controls** and no **enforced totals** (8h/day, 88h/fortnight).
- No multi-user admin screens.

## Visual direction
- **Dark theme** by default, in Clockify's clean, dense spirit (data-grid readability, not a landing
  page).
- **Subtle western personality**: a light western wink runs through the brand. Keep it **light and
  professional** — a wink in the logo (a star badge), empty states, and microcopy
  ("Adios, backlog."…), **not** a full western skin that would hurt information density.
- **Tech constraint**: it's a **React** SPA — think reusable components, a lightweight design system.

## Deliverable
An **interactive prototype** the user can click through and iterate on (ping-pong), covering at least
**Tracker + Fortnight view + Checklist**. Plus a set of **tokens** (colors, typography, spacing) and a
**component inventory** (timer, entry row, grid cell, checklist item, code/activity picker).
