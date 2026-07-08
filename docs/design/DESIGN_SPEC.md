# Walker — Design Spec (engineering handoff)

Walker is a personal **Timer** + timesheet helper. You track work during the day against real
**Timesheet codes**; at the end of each **Fortnight** Walker shows exactly what to key into the
timesheet system.

**Non-goals (do not build):** no timesheet automation / "submit to the timesheet system", no rounding
controls, no enforced daily/fortnight totals. Walker shows **real, to-the-minute** durations only.
Rounding to the quarter hour and hitting 8h/day is the user's job inside the timesheet system.

Desktop-first (99% usage: work PC, browser). Responsive is a bonus, not a requirement.
Dark theme by default. Subtle western personality — a wink in the logo, empty states and microcopy
("Adios, backlog"), never a full skin.

---

## Vocabulary (use these exact labels in the UI)
- **Entry** — a tracked period of work. Can be empty/**uncategorized**; always editable.
- **Timesheet code** (a.k.a. *code*) — a charge code: a number (`N9/…`) + a technical label
  (`MNT - PAP V4`) + a human **project name** (the *libellé*, e.g. "Paper V4"). The project name is
  the primary identifier the user reads; the number is only needed for the timesheet system.
- **Activity** — a code's sub-category: `Bug fixing`, `Change request`, `Communication & Meeting`,
  `Support`.
- **Fortnight** — the period 1st–15th, then 16th–end of month.
- **Absence** — a non-worked day (leave, public holiday, part-time). Reflected from the timesheet
  system; read-only.
- **Timer** — the persistent, always-visible running clock.
- **Code catalog** — browse/search codes & activities; import from a file.

---

## Global layout & navigation

`AppShell` = fixed left **Sidebar** (238px) + main column.
- **Sidebar:** logo (star badge + "Walker" wordmark + `time → timesheet` tagline), nav, user footer.
- **Nav routes:** `Today` (Tracker) · `Fortnight` · `Enter in the timesheet system` (Checklist) · `Code catalog` ·
  `Settings`.
- **Main column:** the **persistent Timer bar** (76px, visible on every route) above the routed screen.

Nav active state: raised background + high-contrast text. Screens scroll independently under the fixed
Timer bar.

---

## The persistent Timer bar (all screens)

Left→right: running **dot** (pulses when running) · **stopwatch** `H:MM:SS` · **description input**
(free text, "What are you working on?") · **task chip** (project name + `code · activity`, click to
switch task) · **✕ cancel** (conditional) · **Start / Stop**.

**Behaviors**
- **One-click start:** Start with zero input — an Entry may be uncategorized and completed later.
- **Live clock:** the stopwatch ticks every second while running (parent owns a 1s interval; passes
  `elapsedSeconds`). The displayed value = current segment elapsed (resets on start/switch), Clockify-style.
- **Switch task without stopping:** clicking the task chip opens the **Code picker**. Picking a
  code/activity while running **splits** the segment: the elapsed segment becomes an Entry, a new
  segment starts immediately, clock keeps running.
- **Stop:** creates an Entry from the segment, then **resets** description + code + activity to empty.
- **Cancel (✕):** appears whenever there's something to cancel.
  - Running → "Cancel timer — discard, nothing saved": stops without creating an Entry, clears fields.
  - Idle with a selection → "Clear selection": wipes code/activity/description (e.g. user picked the
    wrong past task). Hidden when the Timer is empty and stopped.
- **Comment suggestions (autocomplete):** focusing the description input pops a dropdown of previous
  tasks (`description` + `code · project · activity`). Picking one fills code + activity + description
  in one action — "resume something started earlier". If a code is already set on the Timer, the list
  is scoped to that code's previous descriptions. Selection via `onMouseDown` + `preventDefault` so the
  input's blur doesn't dismiss the list first.

**Military time** applies everywhere a clock time is entered: typing `1345` → `13:45`, `930` → `09:30`,
`9` → `09:00`. Duration entry: `130`/`1:30` → 1h30, `45` → 45min.

---

## Screen: Tracker (`Today`)

**Purpose:** track the current day; review/repair today's Entries.

**Layout**
- Header: day label ("Thursday, July 2") + microcopy `Today · to the minute · no rounding`; right-aligned
  **day total** `H:MM` (informational only — *no target, no progress bar*).
- Entry list: column header row + card of Entry rows.
- **Entry row** grid columns: `dot | time range | duration | project·code·activity | description | ▶ resume | ✕ delete`.

**Entry row**
- **Dot:** the code color (amber if uncategorized).
- **Time range:** `HH:MM – HH:MM`, each side click-to-edit inline (military time).
- **Duration:** `H:MM`, derived (read-only display).
- **Code cell:** project **name** (primary) with `code · activity` beneath. Click → Code picker to
  (re)categorize.
- **Uncategorized Entry:** the whole row gets an amber wash; the code cell shows an amber
  **"⚑ Add code & activity"** pill. This is the "needs completing" flag.
- **Description:** click-to-edit inline; placeholder "Add a description…" when empty.
- **▶ Resume:** starts a new running segment from this Entry's code/activity/description (splitting any
  running segment first).
- **✕ Delete:** removes the Entry.

**States**
- *Empty:* dashed panel, western microcopy — "Adios, backlog. Nothing tracked yet. Hit **Start** —
  categorize it later."
- *Timer running:* reflected in the Timer bar (dot pulses, stopwatch ticks).
- *Uncategorized Entry:* amber row + Add-code pill (see above).
- *Full day:* multiple Entries, day total shown.

**Interaction/animation:** inline edit fields autofocus + select-all; hover backgrounds on editable
spans; amber pill brightens on hover; resume/delete affordances change color on hover. No enforced totals.

---

## Screen: Fortnight (`Fortnight` — "by code")

**Purpose:** a 1:1 **visual mirror of the timesheet system's BY-CODE grid**, so re-keying is a straight visual match.

**Layout:** sticky-left "Code · Activity" column; one column per day of the period; a right **Total**
column; a footer **Daily total** row + grand total.
- Period switcher: segmented `1–15` / `16–31` + period label ("1 – 15 July 2026").
- **Rows** = Timesheet code × Activity. **Cells** = real duration `H:MM` for that code/activity/day.
- **Weekend** columns greyed. **Absence** columns striped (read-only, reflected from the timesheet
  system). **Today** column marked.
- Row header shows code number (mono) + activity. Row Total and Daily totals are informational.

**States/interaction**
- Any weekday cell is **click-to-edit** (duration, military-style). Weekend/absence cells inert.
- Legend below: weekend / absence / "click any cell to edit".

---

## Screen: Checklist (`Enter in the timesheet system`)

**Purpose:** track progress while keying the Fortnight grid into the timesheet system — tick each cell
as it's entered.

**Layout:** same grid geometry as Fortnight (identical column order, so it reads 1:1), plus:
- Header: "Enter into the timesheet system" + instruction ("Tick each cell as you key it into the
  timesheet system. Shift-click for a range, ⌘/Ctrl-click to toggle one."), an `X / Y lines entered`
  counter, and **Reset**.
- A thin green **progress bar** (`done/total`).
- Each row header carries a small **`done/total` badge** (click to mark the whole row entered; turns
  green when complete).

**Cell interaction (key requirement)**
- **Plain click:** toggle that cell entered/not; sets the range anchor.
- **Shift-click:** mark the range **from anchor to target as entered**. Range order is **column-major**
  (vertical): traversal goes *down a day column first, then to the next column* — the natural order for
  entering a full day into the timesheet system.
- **⌘/Ctrl-click:** toggle a single cell without disturbing the anchor.
- Entered cells: green wash, green text, corner ✓.

**States:** empty (nothing entered) · partial (mid-entry, progress bar + badges reflect it) · complete.

---

## Screen: Entry editor

Inline editing lives in the Tracker row (times, description) and the grid (durations). For a fuller
edit surface, `EntryEditor` (modal) edits one Entry's start/end (military), code+activity (via Code
picker), and description in one place. Same parse/format rules. Reachable from an Entry (e.g. a future
"edit" affordance) — presentational; commit via `onSave(patch)`.

---

## Screen: Code catalog (`Code catalog`)

Search box (filters by number, project name, technical label, or activity) + "⇪ Import from file"
(presentational; wire to your importer). Each card: color dot + **project name** (primary) +
`number · technical label` (secondary) + activity chips. No editing here in v1.

---

## Screen: Settings

Fortnight-view personalization (read-only presentational cards in v1): **Work rhythm** (Mon–Fri),
**Part-time** (recurring non-worked day), **Absences this fortnight** (reflected from the timesheet
system, striped chip per Absence). No rounding/target controls anywhere.

---

## Component inventory

| Component | Purpose | Key props | States/variants |
|---|---|---|---|
| `AppShell` | Sidebar + persistent Timer bar + routed screen | `route`, `onNavigate`, `timer`, `children` | active-route |
| `Logo` | Star badge + wordmark (western wink) | `wink?` | wink on/off |
| `TimerBar` | Persistent Timer | running, elapsedSeconds, description, code, activity, suggestions, on{Start,Stop,Cancel,SwitchTask,DescriptionChange,PickSuggestion} | idle / running / has-task / uncategorized / suggestions-open |
| `EntryRow` | One Entry in Tracker | entry, code, on{Edit,Categorize,Resume,Delete} | normal / uncategorized(flagged) / editing time / editing desc |
| `EntryEditor` | Modal full edit of an Entry | entry, code, on{Save,OpenPicker,Close} | — |
| `CodePicker` | Modal code+activity chooser | title, codes, on{Pick,Close} | searching / no-results |
| `FortnightGrid` | Shared BY-CODE grid | mode('fortnight'|'checklist'), days, rows, (+edit or check callbacks) | weekend / absence / today / editing cell / entered cell |
| `TrackerScreen` | Today | dateLabel, totalLabel, entries, codesById, handlers | empty / full-day |
| `FortnightScreen` | Fortnight mirror | period, periodLabel, days, rows, onPeriodChange, onEditCell | period 1–15 / 16–31 |
| `ChecklistScreen` | Enter in the timesheet system | days, rows, checked, onChange, onReset | empty / partial / complete |
| `CodeCatalogScreen` | Code catalog | codes, onImport? | search / results |
| `SettingsScreen` | Settings | workRhythm, partTime, absences | — |

**Tokens/behavioral constants:** row height & cell height are density-driven
(`[data-density="compact"]`). Accent color is a single token (`--wk-accent` + soft/line) — themeable
without touching components.
