# BIZ-046 — Guided first-run empty states (lightweight onboarding)

ID: BIZ-046
Status: ✅ done
Type: feature
Priority: P3

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

On a brand-new instance the empty states have personality ("Adios, backlog.") but don't guide a
first-time user toward the two things they need to do to get value: import a code catalog, and start
a timer. There's no gentle path from "empty app" to "tracking + ready to enter".

## What to build

Turn the key empty states into a minimal, dismissible guided path — no heavy wizard:

- **Activity (no entries yet)**: keep the tone, add a clear primary action ("Start your first timer")
  and a hint that categorizing can happen later.
- **Code catalog (no active codes)**: point to "Import reference" / "New code" with one line on the
  two-tier model (import the full catalog once, then add the codes you charge to). Link to the docs
  page ([Importing your code catalog](../catalog-import.md) on the site).
- **Timesheet period (nothing tracked in the period)**: a one-liner explaining the view fills in as
  you track.

Keep it copy + existing buttons; no new framework, and nothing shown once the user has data.

## Acceptance criteria

- [ ] With no data, Activity and Code catalog empty states present a clear next action (start timer /
      import or add a code) with a one-line explanation.
- [ ] The catalog empty state conveys the reference-vs-active two-tier idea in one line and links to
      the docs import page.
- [ ] None of the guidance shows once the user has entries / codes.
- [ ] Frontend tests cover the guided empty states rendering only when empty.

## Blocked by

None.
