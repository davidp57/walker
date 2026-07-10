# BIZ-064 — Activity view: a per-day "Add" button with the date prefilled

ID: BIZ-064
Status: ✅ done
Type: feature
Priority: P3

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`.

## Problem

The Activity view has a single global **+ Add entry** button in the screen head
(`screens/TrackerScreen.tsx`), and `addEntry` always prefills the draft date to **today**
(`App.tsx`). To log a forgotten entry on a past day, the user adds via the global button and then has
to change the date by hand — friction on exactly the days it matters most.

## Solution

Give **each day group** its own Add button, prefilling that group's date, so adding to a specific day
is one click with the date already right. Keep the page uncluttered.

### Behaviour

- Each day-group header (`{group.label}` … `Total: …`) gets an **Add** button that opens the same
  manual-entry draft editor (nothing written until Save — BIZ-011), with the draft **date prefilled
  to `group.date`** and the usual 9:00–10:00 default times.
- Extend the existing `onAddEntry` to take a date (`onAddEntry(date: string)`); `App.addEntry` uses
  it instead of hardcoding `TODAY`.

### Visual weight (avoid clutter)

- The **Today** group's Add button is **primary/blue and always visible** — it replaces the global
  header button.
- **Other** day groups' Add buttons are **quiet (greyed)**, revealed on **hover *and* keyboard
  `:focus-visible`** on desktop.
- **Remove the global "+ Add entry"** button from the screen head — the Today group's button is now
  the primary add affordance (no duplicate blue buttons stacked at the top).

### Two edges to handle

- **Today must always be present.** Day groups are derived from entries, so on a day with nothing
  tracked yet there is no "Today" group — and thus no always-on blue Add. Ensure a **Today group
  always renders** (its header + Add button) even when it has zero entries, so the permanent Today
  Add is always available. Its empty state should stay minimal (no error/empty-row noise).
- **Touch has no hover.** On the phone layout (BIZ-033) the non-today buttons must not be
  hover-gated — render them **always visible at reduced opacity** (still tappable) below the hover
  breakpoint.

## Acceptance criteria

- [x] Every day group shows an Add button that opens the entry draft with that group's date
      prefilled; saving creates the entry on that day.
- [x] The Today group's Add button is primary/blue and always visible; the global header
      "+ Add entry" button is removed.
- [x] Other days' Add buttons are quiet by default and revealed on hover and on keyboard focus
      (`:focus-visible`) on desktop.
- [x] A Today group (header + Add) renders even when today has no entries.
- [x] On the phone layout, the non-today Add buttons are visible and tappable (not hover-gated).
- [x] Frontend tests cover: per-group Add prefills the right date (today vs a past day), the Today
      group renders with zero entries, and the global header button is gone.

## Blocked by

None.

## Notes

- `onAddEntry` currently takes no argument and always defaults to today (`App.addEntry`,
  `App.tsx`); the period view has its own `openAddEntryInPeriod` and is out of scope here.
