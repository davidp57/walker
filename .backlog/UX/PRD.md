# Post-MVP UX improvements — PRD

Status: ⬜ ready
Lot: UX
Branch: feature/ux-* per slice → PR → develop

## Problem Statement

Walker's MVP works, but a UX review of the running app surfaced friction across five areas. Each item
is small; together they slow the everyday loop, hurt legibility, and — on a tool of record — risk
silent data loss.

From my perspective as the consultant using it every day:

- The core start / stop / switch loop is mouse-only; typing what I'm working on and pressing Enter
  does nothing.
- I can't see at a glance how many Entries still need a Timesheet code before the fortnight closes.
- A single mis-click on ✕ deletes a tracked Entry with no confirmation and no undo.
- A lot of secondary text is too low-contrast and too small to read comfortably.
- Labels don't line up (nav "Today" vs screen title "Activity"; a Code's Activity repeated on a row
  when it equals the project name).
- When a save fails or the backend is down, nothing tells me — my edit silently disappears.
- Fortnight and "Enter in T&E" are two look-alike screens with opposite click behavior, and the
  tick-off ritual isn't discoverable.

## Solution

A set of independently-shippable UX improvements, grouped as one lot. Respect the ADRs throughout:
no rounding and no targets on durations (ADR-0005); capture-first and everything editable (ADR-0006).
The work is frontend / presentation only — no domain or API change.

- **Faster daily loop** — Enter-to-start from the description field; keyboard shortcuts for
  start / stop / switch.
- **Nothing left uncoded** — a persistent count of uncategorized Entries.
- **A safety net** — undo on Entry deletion; "+ Add entry" no longer persists a phantom before save.
- **Readability / accessibility pass** — raise the failing secondary-text contrast to WCAG AA and
  floor functional text sizes.
- **Consistent labels** — align nav labels with screen titles; hide an Activity that merely repeats
  the project name.
- **Visible feedback** — surface API errors; basic loading states.
- **Unified Fortnight grid** — merge Fortnight and "Enter in T&E" into one screen with a
  Review / Enter in T&E toggle (detailed in its own section below).

## User Stories

**Daily loop (Tracker + Timer)**

1. As a consultant, I want to press Enter in the "What are you working on?" field to start a Timer with
   that description, so that naming and starting are one gesture.
2. As a consultant, I want keyboard shortcuts to start / stop the Timer and open the task switcher, so
   that the loop I run dozens of times a day doesn't need the mouse.
3. As a consultant, I want a persistent count of uncategorized Entries, so that I can see what still
   needs a Timesheet code before the fortnight closes.
4. As a consultant, I want deleting an Entry to be undoable, so that a mis-click never loses tracked
   time.
5. As a consultant, I want "+ Add entry" to persist nothing until I save, so that cancelling never
   leaves a phantom 09:00–10:00 Entry.
6. As a consultant, I want the running Timer's elapsed time correct even when it crosses midnight, so
   that a Timer I forget to stop stays trustworthy.
7. As a consultant, I want the row actions (edit / resume / delete) clearer and easier to hit, so that
   I don't mis-click tiny glyphs.

**Readability & accessibility**

8. As a consultant, I want secondary text to meet WCAG AA contrast, so that meta labels, totals
   labels, and microcopy are readable. (Concretely, the token used for most secondary text currently
   measures ~3.2:1 on the app background — below the 4.5:1 AA threshold — and is used at 9–11px.)
9. As a consultant, I want functional text (column headers, totals, meta) to have a minimum legible
   size, so that I'm not squinting at 9–10px mono labels.

**Information architecture & labels**

10. As a consultant, I want nav labels to match their screen titles, so that "Today" / "Activity" and
    "Enter in T&E" / "Enter into T&E" don't read as different things.
11. As a consultant, I want a Code's Activity hidden when it merely repeats the project name, so that
    grid rows and Entry rows aren't doubled with the same words.

**Feedback & trust**

12. As a consultant, I want a visible error when a save or load fails, so that I never lose an edit
    silently.
13. As a consultant, I want basic loading feedback while data arrives, so that the empty state
    ("Adios, backlog") doesn't flash before my Entries load.

**Unified Fortnight grid (Review / Enter in T&E)**

14. As a consultant, I want a single Fortnight entry in the nav (dropping the separate "Enter in T&E"
    destination), so that I have one obvious place to prepare my fortnight.
15. As a consultant, I want a Review / Enter in T&E toggle in the header, so that I choose what I'm
    doing rather than guessing from which screen I opened.
16. As a consultant, I want the grid geometry identical in both modes (rows, day columns, durations,
    weekend greying, absence striping, the tinted read-only running-Timer cell, and the Total column),
    so that it stays a 1:1 mirror of T&E and totals stay visible while I tick.
17. As a consultant, I want the period navigation available in both modes and switching modes to keep
    period and data in place, so that toggling never reloads or loses context; the screen opens in
    Review by default.
18. As a consultant, in Review I want to drill into a filled cell's Entries and add a prefilled Entry
    into an empty working cell, with no progress bar on durations, so that I inspect and fix aggregates
    without a quota implied.
19. As a consultant, in Enter in T&E I want each filled cell to show a checkbox beside its duration and
    turn green with a check when entered, so that it's obvious the cell is tickable and I can still
    read the number I copy into T&E.
20. As a consultant, in Enter in T&E I want to shift-click a column-major range, ⌘/Ctrl-click a single
    cell, and mark a whole row via its n/N badge, so that keying a full day or a full code is fast.
21. As a consultant, in Enter in T&E I want a progress bar, an "X / Y lines entered" counter, and a
    Reset, so that I can see how much of the fortnight I've keyed and start a fresh pass; "+ Add entry"
    is hidden and the running-Timer cell is not tickable.
22. As a consultant, I want my entered marks to persist per fortnight as today, so that switching
    modes, changing period, or reloading keeps my checklist state.

## Implementation Decisions

Frontend only. Grouped by area; the unified grid is the largest, most-specified piece.

**Daily loop**

- Enter in the description field starts a Timer carrying that description; the one-click empty Start
  (capture-first) stays. Keyboard shortcuts drive start / stop / switch without the mouse.
- A persistent uncategorized-Entry count is surfaced in the shell (e.g. on the Today nav item /
  header), derived from Entries lacking a Timesheet code.
- Entry deletion becomes undoable (an undo affordance rather than a blocking confirm). "+ Add entry"
  composes locally and persists only on save, matching the fortnight add path (no phantom on cancel).
- The running Timer's elapsed time is derived from the Entry's real start, not from local midnight, so
  it holds across a midnight boundary.

**Readability & accessibility**

- The secondary-text token that fails AA is lightened to reach ~4.5:1 on the app background (or
  reserved strictly for non-essential decoration). Functional text (column headers, totals, meta) gets
  a minimum legible size.

**IA & labels**

- Nav labels and screen titles are aligned. In grid and Entry rows, a Code's Activity line is hidden
  when it equals the project name, removing the duplicate.

**Feedback & trust**

- API failures surface to the user (error toast / indicator) instead of being swallowed; screens show
  basic loading feedback so the empty state doesn't flash before data arrives.

**Unified Fortnight grid (validated in a design brainstorm)**

- Navigation collapses two destinations into one: the Fortnight entry becomes the single door; the
  standalone "Enter in T&E" nav item and its dedicated route are removed (nav 5 → 4).
- One Fortnight screen owns a `mode` state — **Review** and **Enter in T&E** — defaulting to Review,
  not persisted across reloads. A segmented header toggle switches it (reusing the existing
  segmented-control pattern). Review shows "+ Add entry"; Enter in T&E shows the progress bar, the
  "X / Y lines entered" counter, and Reset. Period navigation is shared.
- The shared grid keeps identical geometry across modes, including the Total column (row / daily /
  grand), which was previously hidden in the checklist. Weekend greying, absence striping, and the
  read-only running-Timer cell are the same in both modes.
- Review interactions are unchanged (drill into a filled cell; prefilled new Entry on an empty working
  cell; no progress bar). In Enter in T&E, each filled working cell renders a checkbox beside its
  duration; toggling marks the Code × Activity × Day line entered; a per-row badge marks the row;
  shift-click selects a column-major range; ⌘/Ctrl-click toggles one; Reset clears the fortnight's
  marks; the running-Timer cell is not tickable.
- Colour semantics: unticked cells stay neutral (a hollow checkbox), ticked cells go green. Amber is
  intentionally not reused for "not yet entered", keeping its single existing meaning ("uncategorized").
- The former checklist screen is removed; its fill-order, cell/row toggling, and progress logic move
  into the unified screen. No API, schema, or persistence change: checklist marks stay server-backed
  per fortnight; durations aggregate as today.

## Testing Decisions

Test external behavior through the highest UI seam; frontend tests use Vitest + Testing Library.
Prior art: the CORE lot's frontend tests (`lib/time`, `timer`, `api`) and its Testing Decisions
(fortnight cell edit, checklist range selection). Coverage gate ≥ 80% unchanged.

- **Unified grid — primary seam is the Fortnight screen:** the toggle switches modes and mode-specific
  controls; Review drill/add; Enter tick/untick persists (mocked API), shift-click range, row badge;
  the Total column shows in both modes; the nav exposes four items with no separate "Enter in T&E".
  Drop to the shared grid component only for the checkbox affordance and per-mode click semantics.
- **Daily loop:** Enter-to-start starts a Timer with the typed description; shortcuts start/stop/switch;
  the uncategorized count reflects Entries without a code; delete-then-undo restores the Entry;
  add-entry cancel leaves nothing persisted; elapsed time is correct across a midnight boundary
  (deterministic clock).
- **Feedback:** a mocked failing API surfaces an error rather than silently reverting.
- **Readability:** the contrast/size changes are token-level; assert the resulting values meet the AA
  threshold where practical, otherwise verify visually — don't test implementation details.

## Out of Scope

- Any API, schema, or data-model change; durations are recorded and aggregated exactly as today.
- Any rounding, target, or progress indicator on **durations** — ADR-0005 stands (the grid's progress
  bar measures entry completion, not hours).
- Remembering the grid's last-used mode across reloads; auto-selecting the mode by date (rejected in
  design in favour of an explicit toggle).
- Mobile / responsive work and density behavior.
- Authentication / multi-user.

## Further Notes

- Sourced from a UX review of the running MVP (this session); contrast ratios were computed against the
  dark-theme tokens.
- The unified-grid section's design was validated in a brainstorm with the user: one nav item plus a
  header toggle; mode labels Review / Enter in T&E; Enter-mode cells show a checkbox beside the visible
  duration, ticked = green ✓.
- Next step: `/to-issues` slices this lot into per-finding tracer-bullet tickets (BIZ / TEC / CHR).
