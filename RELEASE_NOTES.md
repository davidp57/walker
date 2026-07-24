# Walker 1.9.0 — the "Texas Ledger" redesign

This release is a full pass over Walker's interface: every core surface and every screen has been
redesigned to one deliberate design system ("Texas Ledger"), and the controls are now properly
accessible. It's a presentation-and-interaction release — nothing changed about your data, the API,
or how Walker is deployed, so upgrading is drop-in.

## Highlights

- **One coherent instrument, end to end.** Ledger-style rows you can follow, affordances that stay
  quiet until you reach for them, code-colour as identity, and a safety net before anything
  destructive.
- **Accessibility with real teeth.** Keyboard and screen-reader support for the Settings controls,
  and hover-only actions that now also work by touch and keyboard.

## Core tracking surfaces

- **Timer bar** — while a timer runs, the readout reads as a lit, breathing instrument panel with a
  live pulse from the status dot.
- **Activity list** — each entry leads with its code-colour bar; the row actions (edit, break,
  resume, delete) reveal on hover (and stay visible on touch); merging two entries is a quiet
  join-node on the seam that expands into a "⇕ Merge" pill bracketing both rows.
- **Code picker** — a command-palette list: one-line rows with the code inline, activities on hover,
  the hovered row lifting into an accent-bordered box.
- **Timesheet period view** — a cleaner header (Review / Enter as tabs, a toolbar for the rest,
  quarter-hour rounding highlighted while active) and a far more scannable grid: non-working days
  collapse into a greyed strip, zebra striping and row-hover to follow lines, the daily total echoed
  at the top, code numbers tucked behind copy-on-hover, and the rounded value shown with the exact
  value on hover. The checklist cells are keyboard-toggleable.

## Tasks

- A **Focus filter** surfaces the tasks that need attention — overdue, due today, or high priority —
  in both List and Board, without changing your saved view.
- **Deleting a task now asks for confirmation** in place.
- On the board, the column tools stay out of the way until you hover a column, and adding a column
  is an inline field instead of a browser prompt.
- The start-timer action stands out, table headers are more legible, and the empty state has some
  personality.

## Code catalog

- **Deleting a code asks for confirmation** (from the card and the editors); codes in use stay
  protected.
- **Real and virtual codes are now clearly distinct**, and every code leads with its own colour bar.
- Rows highlight on hover; the editors close with Escape and tell you what's missing when Save is
  disabled; the one-time Import is demoted to a quiet utility.

## Settings

- The Density / Period-scheme / Theme controls and the workday toggles are now **accessible**
  (labelled groups, keyboard arrow navigation, visible focus, a non-colour selected cue) and the
  screen has a proper heading structure.
- Changing a setting shows a brief **"✓ Saved"**, and the period-scheme control warns that changing
  it reshapes your period view right away.
- The screen no longer scrolls sideways on a phone, and a **multi-day absence shows and removes as a
  single range**.

## Other changes

- The one-time "N tasks due" startup toast is gone — the always-visible badge on the Tasks tab is
  the single due-tasks indicator now.

## Upgrading

Drop-in. No database migration, no API or configuration change. Replace the image (or the `.exe`)
and your existing data carries over unchanged. The interface looks noticeably different — that's
expected.
