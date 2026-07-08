# Walker — Developer Handoff (Claude Code)

Target stack: **React 19 + Vite + TypeScript SPA**, JSON API under `/api`.

**Styling approach:** a global `tokens.css` (CSS custom properties) plus one global `walker.css`
referencing those tokens. Components apply semantic class names and use inline `style` **only** for
genuinely dynamic values (a Timesheet code's dot color, the checklist progress width).
**No new runtime dependencies** — React 19 + Vite's built-in CSS handling cover everything; icons and
the logo are inline SVG. Components are presentational (data in via props, actions out via callbacks).

Exact UI terms used throughout: **Entry, Timesheet code, Activity, Fortnight, Absence, Timer, Code
catalog**. Dark theme, subtle western wink (logo / empty states / microcopy). No timesheet automation,
no rounding controls, no enforced totals — real to-the-minute durations only.

An illustrative `App.tsx` wires the components against a mock store so it runs immediately; replace the
store with your `/api` layer.

---

## File manifest

1. `docs/design/DESIGN_SPEC.md`
2. `frontend/src/styles/tokens.css`
3. `frontend/src/styles/walker.css`
4. `frontend/src/types.ts`
5. `frontend/src/lib/time.ts`
6. `frontend/src/components/icons.tsx`
7. `frontend/src/components/Logo.tsx`
8. `frontend/src/components/AppShell.tsx`
9. `frontend/src/components/TimerBar.tsx`
10. `frontend/src/components/CodePicker.tsx`
11. `frontend/src/components/EntryRow.tsx`
12. `frontend/src/components/FortnightGrid.tsx`
13. `frontend/src/components/EntryEditor.tsx`
14. `frontend/src/screens/TrackerScreen.tsx`
15. `frontend/src/screens/FortnightScreen.tsx`
16. `frontend/src/screens/ChecklistScreen.tsx`
17. `frontend/src/screens/CodeCatalogScreen.tsx`
18. `frontend/src/screens/SettingsScreen.tsx`
19. `public/favicon.svg`
20. `frontend/src/App.tsx` (illustrative wiring)

---

`docs/design/DESIGN_SPEC.md`
~~~markdown
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
~~~

---

`frontend/src/styles/tokens.css`
~~~css
/* Walker design tokens. Import once (e.g. in main.tsx) before walker.css. */
:root {
  /* ---- Surfaces (dark theme) ---- */
  --wk-bg-0: #0e0f13;   /* app background */
  --wk-bg-1: #15171d;   /* panels / cards / sidebar / timer bar */
  --wk-bg-2: #1b1e26;   /* raised (chips, headers, totals) */
  --wk-bg-3: #232733;   /* hover / active nav */
  --wk-line: #282c36;   /* borders */
  --wk-line-soft: #20242c;
  --wk-weekend: #101217; /* greyed weekend columns */

  /* ---- Text ---- */
  --wk-text-hi: #e9ebef;
  --wk-text: #b7bdc8;
  --wk-text-mid: #868d9b;
  --wk-text-lo: #5b626f;

  /* ---- Accent (brand, themeable) ---- */
  --wk-accent: #5b9cf6;
  --wk-accent-soft: rgba(91, 156, 246, 0.14);
  --wk-accent-line: rgba(91, 156, 246, 0.42);
  --wk-on-accent: #08131f;               /* text on solid accent */

  /* ---- Semantic ---- */
  --wk-amber: #e8a84b;                    /* uncategorized / needs completing */
  --wk-amber-soft: rgba(232, 168, 75, 0.13);
  --wk-amber-line: rgba(232, 168, 75, 0.38);
  --wk-green: #3fb68b;                    /* entered into the timesheet system / complete */
  --wk-green-soft: rgba(63, 182, 139, 0.14);
  --wk-danger: #e5644e;

  /* ---- Typography ---- */
  --wk-font-ui: 'Hanken Grotesk', system-ui, -apple-system, sans-serif;
  --wk-font-mono: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
  --wk-font-display: 'Zilla Slab', Georgia, serif; /* logo / screen titles — western wink */

  --wk-fs-9: 9.5px;   /* micro labels (uppercase mono) */
  --wk-fs-10: 10.5px;
  --wk-fs-11: 11px;
  --wk-fs-12: 12.5px;
  --wk-fs-13: 13.5px;
  --wk-fs-14: 14px;   /* body base */
  --wk-fs-15: 15px;
  --wk-fs-17: 17px;
  --wk-fs-20: 20px;
  --wk-fs-24: 24px;   /* screen title */
  --wk-fs-27: 27px;   /* stopwatch */

  --wk-fw-regular: 400;
  --wk-fw-medium: 500;
  --wk-fw-semibold: 600;
  --wk-fw-bold: 700;

  /* ---- Spacing (4px base) ---- */
  --wk-space-1: 4px;
  --wk-space-2: 8px;
  --wk-space-3: 12px;
  --wk-space-4: 16px;
  --wk-space-5: 20px;
  --wk-space-6: 24px;
  --wk-space-7: 30px;
  --wk-space-8: 40px;

  /* ---- Radii ---- */
  --wk-radius-sm: 5px;
  --wk-radius-md: 9px;
  --wk-radius-lg: 13px;
  --wk-radius-pill: 999px;

  /* ---- Shadows ---- */
  --wk-shadow-1: 0 2px 8px rgba(0, 0, 0, 0.28);
  --wk-shadow-2: 0 18px 44px rgba(0, 0, 0, 0.5);
  --wk-shadow-modal: 0 24px 60px rgba(0, 0, 0, 0.55);

  /* ---- Z-index ---- */
  --wk-z-sticky: 2;      /* sticky grid headers */
  --wk-z-dropdown: 60;   /* comment suggestions */
  --wk-z-modal: 100;     /* code picker / entry editor */

  /* ---- Density (row/cell heights) ---- */
  --wk-row-h: 44px;
  --wk-cell-h: 34px;
}

:root[data-density="compact"] {
  --wk-row-h: 36px;
  --wk-cell-h: 28px;
}
~~~

---

`frontend/src/styles/walker.css`
~~~css
/* Walker global styles. Requires tokens.css imported first. */
/* Fonts (Vite: keep, or self-host). */
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Zilla+Slab:wght@500;600;700&display=swap');

* { box-sizing: border-box; }
.wk-app, .wk-app * { font-family: var(--wk-font-ui); }
.wk-mono { font-family: var(--wk-font-mono); font-variant-numeric: tabular-nums; }

@keyframes wk-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }

/* ---------- App shell ---------- */
.wk-app {
  display: flex; height: 100vh; overflow: hidden;
  background: var(--wk-bg-0); color: var(--wk-text); font-size: var(--wk-fs-14);
}
.wk-sidebar {
  width: 238px; flex-shrink: 0; background: var(--wk-bg-1);
  border-right: 1px solid var(--wk-line); display: flex; flex-direction: column;
}
.wk-brand { padding: 22px 20px 18px; display: flex; align-items: center; gap: 12px;
  border-bottom: 1px solid var(--wk-line-soft); }
.wk-brand-name { font-family: var(--wk-font-display); font-weight: var(--wk-fw-bold);
  font-size: 22px; letter-spacing: 0.3px; color: var(--wk-text-hi); line-height: 1; }
.wk-brand-sub { font-family: var(--wk-font-mono); font-size: var(--wk-fs-9); letter-spacing: 1.5px;
  color: var(--wk-text-lo); margin-top: 4px; text-transform: uppercase; }

.wk-nav { padding: 14px 12px; display: flex; flex-direction: column; gap: 3px; flex: 1; }
.wk-nav-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  border-radius: var(--wk-radius-md); cursor: pointer; font-size: var(--wk-fs-13);
  font-weight: var(--wk-fw-medium); color: var(--wk-text-mid); background: transparent;
  border: none; text-align: left; width: 100%; }
.wk-nav-item:hover { background: var(--wk-bg-2); color: var(--wk-text-hi); }
.wk-nav-item.is-active { background: var(--wk-bg-3); color: var(--wk-text-hi);
  font-weight: var(--wk-fw-semibold); }
.wk-nav-ico { width: 19px; display: flex; justify-content: center; opacity: 0.85; }

.wk-sidebar-foot { padding: 14px 20px; border-top: 1px solid var(--wk-line-soft);
  display: flex; align-items: center; gap: 10px; }
.wk-avatar { width: 26px; height: 26px; border-radius: 50%; background: var(--wk-bg-3);
  display: flex; align-items: center; justify-content: center; font-family: var(--wk-font-mono);
  font-size: var(--wk-fs-11); color: var(--wk-text-mid); }
.wk-foot-meta { font-family: var(--wk-font-mono); font-size: var(--wk-fs-10);
  color: var(--wk-text-lo); line-height: 1.4; }

.wk-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.wk-outlet { flex: 1; overflow: auto; }

/* ---------- Logo badge ---------- */
.wk-badge { width: 34px; height: 34px; border-radius: 50%; background: var(--wk-accent-soft);
  border: 1px solid var(--wk-accent-line); display: flex; align-items: center; justify-content: center;
  color: var(--wk-accent); flex-shrink: 0; }
.wk-badge.is-plain { background: var(--wk-bg-3); border-color: var(--wk-line); color: var(--wk-text-mid); }

/* ---------- Timer bar ---------- */
.wk-timerbar { height: 76px; flex-shrink: 0; background: var(--wk-bg-1);
  border-bottom: 1px solid var(--wk-line); display: flex; align-items: center; gap: 14px;
  padding: 0 22px; }
.wk-timer-left { display: flex; align-items: center; gap: 11px; flex-shrink: 0; }
.wk-timer-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--wk-text-lo); flex-shrink: 0; }
.wk-timer-dot.is-running { background: var(--wk-accent); box-shadow: 0 0 0 4px var(--wk-accent-soft);
  animation: wk-pulse 1.5s ease-in-out infinite; }
.wk-timer-clock { font-family: var(--wk-font-mono); font-size: var(--wk-fs-27);
  font-weight: var(--wk-fw-medium); letter-spacing: 0.5px; color: var(--wk-text-mid);
  font-variant-numeric: tabular-nums; min-width: 116px; }
.wk-timer-clock.is-running { color: var(--wk-accent); }

.wk-timer-input-wrap { position: relative; flex: 1; min-width: 60px; }
.wk-timer-input { width: 100%; background: transparent; border: none; outline: none;
  color: var(--wk-text-hi); font-size: var(--wk-fs-15); font-family: var(--wk-font-ui); }
.wk-timer-input::placeholder { color: var(--wk-text-lo); }

/* Comment suggestions dropdown */
.wk-suggest { position: absolute; top: calc(100% + 12px); left: -8px; width: 430px; max-width: 70vw;
  background: var(--wk-bg-1); border: 1px solid var(--wk-line); border-radius: 12px;
  box-shadow: var(--wk-shadow-2); z-index: var(--wk-z-dropdown); overflow: hidden; }
.wk-suggest-title { padding: 9px 14px; font-family: var(--wk-font-mono); font-size: var(--wk-fs-9);
  letter-spacing: 0.9px; text-transform: uppercase; color: var(--wk-text-lo);
  border-bottom: 1px solid var(--wk-line-soft); }
.wk-suggest-item { display: flex; align-items: center; gap: 11px; padding: 10px 14px; cursor: pointer;
  border-bottom: 1px solid var(--wk-line-soft); border-left: none; border-right: none; border-top: none;
  background: none; width: 100%; text-align: left; }
.wk-suggest-item:hover { background: var(--wk-bg-2); }
.wk-suggest-body { min-width: 0; flex: 1; }
.wk-suggest-desc { font-size: var(--wk-fs-13); color: var(--wk-text-hi); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.wk-suggest-meta { font-family: var(--wk-font-mono); font-size: var(--wk-fs-10); color: var(--wk-text-mid);
  margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wk-suggest-key { color: var(--wk-text-lo); font-size: var(--wk-fs-12); flex-shrink: 0; }

/* Task chip */
.wk-taskchip { display: flex; align-items: center; gap: 10px; padding: 7px 13px;
  border-radius: var(--wk-radius-md); border: 1px solid var(--wk-line); cursor: pointer;
  background: var(--wk-bg-2); flex-shrink: 0; }
.wk-taskchip:hover { border-color: var(--wk-accent-line); }
.wk-taskchip-main { font-family: var(--wk-font-mono); font-size: var(--wk-fs-12); color: var(--wk-text-hi);
  line-height: 1.15; }
.wk-taskchip-sub { font-size: var(--wk-fs-11); color: var(--wk-text-mid); line-height: 1.2; }
.wk-taskchip-caret { color: var(--wk-text-lo); font-size: var(--wk-fs-11); margin-left: 2px; }

/* ---------- Buttons ---------- */
.wk-btn { font-size: var(--wk-fs-14); border-radius: var(--wk-radius-md); cursor: pointer;
  border: 1px solid transparent; padding: 11px 26px; font-weight: var(--wk-fw-bold);
  letter-spacing: 0.2px; flex-shrink: 0; }
.wk-btn-primary { background: var(--wk-accent); color: var(--wk-on-accent); }
.wk-btn-primary:hover { filter: brightness(1.08); }
.wk-btn-danger { background: transparent; color: var(--wk-danger); border-color: var(--wk-danger); }
.wk-btn-danger:hover { background: rgba(229, 100, 78, 0.12); }
.wk-btn-icon { background: transparent; color: var(--wk-text-lo); font-size: var(--wk-fs-15);
  padding: 10px 13px; border: 1px solid var(--wk-line); border-radius: var(--wk-radius-md);
  line-height: 1; cursor: pointer; }
.wk-btn-icon:hover { color: var(--wk-danger); border-color: var(--wk-danger); }
.wk-btn-ghost { background: var(--wk-bg-2); border: 1px solid var(--wk-line); color: var(--wk-text-mid);
  font-size: var(--wk-fs-12); padding: 8px 14px; border-radius: var(--wk-radius-md);
  cursor: pointer; font-weight: var(--wk-fw-medium); }
.wk-btn-ghost:hover { border-color: var(--wk-text-mid); color: var(--wk-text-hi); }

/* ---------- Screen chrome ---------- */
.wk-screen { padding: 26px 30px; }
.wk-screen.is-narrow { max-width: 820px; }
.wk-screen-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 20px; }
.wk-screen-title { font-family: var(--wk-font-display); font-size: var(--wk-fs-24); color: var(--wk-text-hi);
  font-weight: var(--wk-fw-semibold); }
.wk-screen-title .wk-accent { color: var(--wk-accent); }
.wk-screen-sub { font-family: var(--wk-font-mono); font-size: var(--wk-fs-11); color: var(--wk-text-lo);
  letter-spacing: 0.5px; margin-top: 5px; }

.wk-daytotal { text-align: right; }
.wk-daytotal-value { font-family: var(--wk-font-mono); font-size: var(--wk-fs-27); color: var(--wk-text-hi);
  font-variant-numeric: tabular-nums; }
.wk-daytotal-label { font-family: var(--wk-font-mono); font-size: var(--wk-fs-10); color: var(--wk-text-lo);
  letter-spacing: 0.8px; text-transform: uppercase; margin-top: 3px; }

.wk-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }

/* ---------- Tracker: Entry list ---------- */
.wk-entry-cols { --wk-entry-grid: 14px 118px 48px minmax(150px, 1.25fr) minmax(120px, 1.4fr) 26px 24px; }
.wk-entry-head, .wk-entry-row { display: grid; grid-template-columns: var(--wk-entry-grid); gap: 13px; align-items: center; }
.wk-entry-head { padding: 0 16px 9px; font-family: var(--wk-font-mono); font-size: var(--wk-fs-9);
  letter-spacing: 1px; text-transform: uppercase; color: var(--wk-text-lo); }
.wk-entry-list { background: var(--wk-bg-1); border: 1px solid var(--wk-line);
  border-radius: var(--wk-radius-lg); overflow: hidden; }
.wk-entry-row { padding: 9px 16px; min-height: var(--wk-row-h); border-bottom: 1px solid var(--wk-line-soft); }
.wk-entry-row.is-flagged { background: var(--wk-amber-soft); }

.wk-time { display: flex; align-items: center; gap: 5px; font-family: var(--wk-font-mono);
  font-size: var(--wk-fs-12); color: var(--wk-text); }
.wk-time-sep { color: var(--wk-text-lo); }
.wk-time-span { cursor: text; padding: 2px 5px; border-radius: var(--wk-radius-sm); }
.wk-time-span:hover { background: var(--wk-bg-3); }
.wk-input-inline { font-family: var(--wk-font-mono); font-size: var(--wk-fs-12); background: var(--wk-bg-0);
  border: 1px solid var(--wk-accent); border-radius: var(--wk-radius-sm); color: var(--wk-text-hi);
  padding: 3px 5px; outline: none; width: 52px; }
.wk-dur { font-family: var(--wk-font-mono); font-size: var(--wk-fs-13); color: var(--wk-text-hi);
  font-variant-numeric: tabular-nums; }

.wk-code-cell { cursor: pointer; padding: 4px 7px; border-radius: 7px; min-width: 0; }
.wk-code-cell:hover { background: var(--wk-bg-3); }
.wk-code-name-row { display: flex; align-items: center; gap: 8px; }
.wk-code-name { font-size: var(--wk-fs-13); color: var(--wk-text-hi); font-weight: var(--wk-fw-medium);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wk-code-meta { font-family: var(--wk-font-mono); font-size: var(--wk-fs-11); color: var(--wk-text-mid);
  margin-top: 2px; margin-left: 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.wk-pill-add { display: inline-flex; align-items: center; gap: 6px; padding: 4px 11px;
  border-radius: var(--wk-radius-pill); background: var(--wk-amber-soft); border: 1px solid var(--wk-amber-line);
  color: var(--wk-amber); font-size: var(--wk-fs-12); cursor: pointer; font-weight: var(--wk-fw-semibold); }
.wk-pill-add:hover { filter: brightness(1.15); }

.wk-desc { font-size: var(--wk-fs-13); color: var(--wk-text-hi); cursor: text; padding: 2px 6px;
  border-radius: var(--wk-radius-sm); display: inline-block; max-width: 100%; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.wk-desc:hover { background: var(--wk-bg-3); }
.wk-desc.is-empty { color: var(--wk-text-lo); }
.wk-desc-edit { width: 100%; font-size: var(--wk-fs-13); background: var(--wk-bg-0);
  border: 1px solid var(--wk-accent); border-radius: var(--wk-radius-sm); color: var(--wk-text-hi);
  padding: 4px 7px; outline: none; }

.wk-resume { cursor: pointer; color: var(--wk-text-mid); font-size: var(--wk-fs-12); text-align: center;
  border-radius: 6px; padding: 5px 4px; border: 1px solid var(--wk-line); background: none; }
.wk-resume:hover { color: var(--wk-accent); border-color: var(--wk-accent-line); background: var(--wk-accent-soft); }
.wk-delete { cursor: pointer; color: var(--wk-text-lo); font-size: var(--wk-fs-14); text-align: center;
  border-radius: 6px; padding: 4px; background: none; border: none; }
.wk-delete:hover { color: var(--wk-danger); background: var(--wk-bg-3); }

.wk-tip { margin-top: 14px; font-family: var(--wk-font-mono); font-size: var(--wk-fs-11);
  color: var(--wk-text-lo); padding-left: 4px; }
.wk-tip b { color: var(--wk-text-mid); font-weight: var(--wk-fw-medium); }

.wk-empty { text-align: center; padding: 90px 20px; border: 1px dashed var(--wk-line);
  border-radius: 16px; }
.wk-empty-title { font-family: var(--wk-font-display); font-size: 22px; color: var(--wk-text-mid); }
.wk-empty-sub { color: var(--wk-text-lo); margin-top: 8px; font-size: var(--wk-fs-14); }
.wk-empty-sub .wk-accent { color: var(--wk-accent); }

/* ---------- Grid (Fortnight + Checklist) ---------- */
.wk-grid-wrap { overflow: auto; border: 1px solid var(--wk-line); border-radius: var(--wk-radius-lg);
  background: var(--wk-bg-1); }
.wk-grid { border-collapse: collapse; width: 100%; min-width: 940px; table-layout: fixed; }
.wk-grid th, .wk-grid td { border-right: 1px solid var(--wk-line-soft); }
.wk-grid-rowhead-h { position: sticky; left: 0; z-index: var(--wk-z-sticky); background: var(--wk-bg-2);
  width: 260px; text-align: left; padding: 11px 16px; font-family: var(--wk-font-mono);
  font-size: var(--wk-fs-9); letter-spacing: 1px; text-transform: uppercase; color: var(--wk-text-lo);
  border-bottom: 1px solid var(--wk-line); border-right: 1px solid var(--wk-line); font-weight: var(--wk-fw-medium); }
.wk-day { text-align: center; padding: 7px 4px; font-family: var(--wk-font-mono); color: var(--wk-text-mid);
  border-bottom: 1px solid var(--wk-line); background: var(--wk-bg-2); min-width: 44px; }
.wk-day.is-weekend { background: var(--wk-weekend); color: var(--wk-text-lo); }
.wk-day-name { font-size: 9px; letter-spacing: 0.5px; }
.wk-day-num { font-size: var(--wk-fs-12); color: var(--wk-text-hi); margin-top: 1px; }
.wk-day-sub { font-size: 8px; letter-spacing: 0.5px; margin-top: 1px; min-height: 10px; }
.wk-day-sub.is-today { color: var(--wk-accent); }
.wk-day-sub.is-absence { color: var(--wk-amber); }
.wk-total-h { width: 64px; background: var(--wk-bg-2); text-align: center; padding: 8px 6px;
  font-family: var(--wk-font-mono); font-size: var(--wk-fs-9); letter-spacing: 0.5px; text-transform: uppercase;
  color: var(--wk-text-lo); border-bottom: 1px solid var(--wk-line); border-left: 1px solid var(--wk-line); }

.wk-rowhead { position: sticky; left: 0; z-index: 1; background: var(--wk-bg-1); padding: 8px 16px;
  border-bottom: 1px solid var(--wk-line-soft); border-right: 1px solid var(--wk-line); }
.wk-rowhead-inner { display: flex; align-items: center; gap: 9px; }
.wk-rowhead-body { min-width: 0; flex: 1; }
.wk-rowhead-code { font-family: var(--wk-font-mono); font-size: var(--wk-fs-12); color: var(--wk-text-hi); }
.wk-rowhead-act { font-size: var(--wk-fs-11); color: var(--wk-text-mid); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.wk-rowbadge { font-family: var(--wk-font-mono); font-size: 10px; padding: 3px 7px; border-radius: 12px;
  cursor: pointer; border: 1px solid var(--wk-line); color: var(--wk-text-lo); flex-shrink: 0;
  white-space: nowrap; background: none; }
.wk-rowbadge:hover { border-color: var(--wk-green); color: var(--wk-green); }
.wk-rowbadge.is-alldone { border-color: var(--wk-green); color: var(--wk-green); }

.wk-cell { text-align: center; font-family: var(--wk-font-mono); font-size: var(--wk-fs-12);
  height: var(--wk-cell-h); padding: 0 2px; border-bottom: 1px solid var(--wk-line-soft);
  position: relative; cursor: default; color: var(--wk-text-hi); user-select: none;
  font-variant-numeric: tabular-nums; }
.wk-cell.is-weekend { background: var(--wk-weekend); color: var(--wk-text-lo); }
.wk-cell.is-absence { color: var(--wk-text-mid);
  background: repeating-linear-gradient(45deg, #171a20, #171a20 4px, #1b1f27 4px, #1b1f27 8px); }
.wk-cell.is-empty { color: var(--wk-text-lo); }
.wk-cell.is-clickable { cursor: pointer; }
.wk-cell.is-done { background: var(--wk-green-soft); color: var(--wk-green); }
.wk-cell-check { position: absolute; top: 3px; right: 4px; font-size: 9px; color: var(--wk-green); }
.wk-cell-input { width: 100%; height: 100%; text-align: center; font-family: var(--wk-font-mono);
  font-size: var(--wk-fs-12); background: var(--wk-bg-0); border: 1px solid var(--wk-accent);
  border-radius: 4px; color: var(--wk-text-hi); outline: none; padding: 0; }

.wk-rowtotal { width: 64px; text-align: center; font-family: var(--wk-font-mono); font-size: var(--wk-fs-12);
  color: var(--wk-text-hi); background: var(--wk-bg-2); border-bottom: 1px solid var(--wk-line-soft);
  border-left: 1px solid var(--wk-line); font-variant-numeric: tabular-nums; }
.wk-foot-label { position: sticky; left: 0; z-index: 1; background: var(--wk-bg-2); padding: 10px 16px;
  font-family: var(--wk-font-mono); font-size: var(--wk-fs-11); letter-spacing: 0.5px; text-transform: uppercase;
  color: var(--wk-text-mid); border-top: 1px solid var(--wk-line); border-right: 1px solid var(--wk-line); }
.wk-coltotal { text-align: center; font-family: var(--wk-font-mono); font-size: var(--wk-fs-12);
  padding: 9px 2px; color: var(--wk-text-mid); border-top: 1px solid var(--wk-line);
  background: var(--wk-bg-2); font-variant-numeric: tabular-nums; }
.wk-coltotal.is-weekend { color: var(--wk-text-lo); }
.wk-grandtotal { width: 64px; text-align: center; font-family: var(--wk-font-mono); font-size: var(--wk-fs-13);
  color: var(--wk-accent); background: var(--wk-bg-2); border-top: 1px solid var(--wk-line);
  border-left: 1px solid var(--wk-line); font-weight: var(--wk-fw-semibold); }

.wk-legend { margin-top: 16px; display: flex; gap: 22px; font-family: var(--wk-font-mono);
  font-size: var(--wk-fs-11); color: var(--wk-text-lo); flex-wrap: wrap; }
.wk-legend-swatch { display: inline-block; width: 11px; height: 11px; vertical-align: middle; margin-right: 6px; }

/* Period segmented control */
.wk-period { display: flex; background: var(--wk-bg-2); border: 1px solid var(--wk-line);
  border-radius: var(--wk-radius-md); overflow: hidden; }
.wk-seg { padding: 7px 15px; font-family: var(--wk-font-mono); font-size: var(--wk-fs-12); cursor: pointer;
  color: var(--wk-text-mid); background: transparent; border: none; }
.wk-seg.is-active { color: var(--wk-on-accent); background: var(--wk-accent); font-weight: var(--wk-fw-semibold); }
.wk-period-label { font-family: var(--wk-font-mono); font-size: var(--wk-fs-12); color: var(--wk-text-mid);
  min-width: 120px; text-align: right; }

/* Checklist progress */
.wk-progress { height: 6px; background: var(--wk-bg-2); border-radius: 4px; overflow: hidden; margin-bottom: 20px; }
.wk-progress-bar { height: 100%; background: var(--wk-green); border-radius: 4px; transition: width 0.25s; }
.wk-progress-count { font-family: var(--wk-font-mono); font-size: var(--wk-fs-20); color: var(--wk-text-hi); }
.wk-progress-count span { color: var(--wk-text-lo); font-size: var(--wk-fs-15); }
.wk-progress-label { font-family: var(--wk-font-mono); font-size: var(--wk-fs-9); letter-spacing: 0.8px;
  text-transform: uppercase; color: var(--wk-text-lo); margin-top: 2px; }

/* ---------- Modal (Code picker / Entry editor) ---------- */
.wk-overlay { position: fixed; inset: 0; background: rgba(6, 8, 12, 0.62); display: flex;
  align-items: flex-start; justify-content: center; z-index: var(--wk-z-modal); padding-top: 96px; }
.wk-modal { width: 520px; max-width: 92vw; background: var(--wk-bg-1); border: 1px solid var(--wk-line);
  border-radius: 15px; box-shadow: var(--wk-shadow-modal); overflow: hidden; }
.wk-modal-head { padding: 16px 20px; border-bottom: 1px solid var(--wk-line-soft); display: flex;
  align-items: center; justify-content: space-between; }
.wk-modal-title { font-family: var(--wk-font-display); font-size: var(--wk-fs-17); color: var(--wk-text-hi);
  font-weight: var(--wk-fw-semibold); }
.wk-modal-close { cursor: pointer; color: var(--wk-text-lo); font-size: 16px; background: none; border: none; }
.wk-modal-search-wrap { padding: 14px 20px 6px; }
.wk-input { width: 100%; background: var(--wk-bg-0); border: 1px solid var(--wk-line);
  border-radius: var(--wk-radius-md); padding: 10px 13px; color: var(--wk-text-hi);
  font-size: var(--wk-fs-14); outline: none; }
.wk-input:focus { border-color: var(--wk-accent-line); }
.wk-modal-body { max-height: 52vh; overflow: auto; padding: 6px 12px 14px; }
.wk-picker-code { padding: 9px 8px 4px; }
.wk-picker-code-head { display: flex; align-items: center; gap: 10px; padding: 0 8px 8px; }
.wk-picker-name { font-size: var(--wk-fs-13); color: var(--wk-text-hi); font-weight: var(--wk-fw-semibold); }
.wk-picker-meta { font-family: var(--wk-font-mono); font-size: var(--wk-fs-11); color: var(--wk-text-mid); margin-top: 1px; }
.wk-picker-acts { display: flex; flex-wrap: wrap; gap: 6px; padding-left: 26px; }
.wk-act { font-family: var(--wk-font-mono); font-size: var(--wk-fs-12); color: var(--wk-text);
  background: var(--wk-bg-2); border: 1px solid var(--wk-line-soft); border-radius: 16px; padding: 5px 12px;
  cursor: pointer; }
.wk-act:hover { border-color: var(--wk-accent); color: var(--wk-text-hi); background: var(--wk-accent-soft); }
.wk-modal-empty { padding: 26px; text-align: center; color: var(--wk-text-lo); font-family: var(--wk-font-mono);
  font-size: var(--wk-fs-12); }

/* ---------- Code catalog ---------- */
.wk-catalog-list { display: flex; flex-direction: column; gap: 10px; }
.wk-catalog-card { background: var(--wk-bg-1); border: 1px solid var(--wk-line); border-radius: 12px; padding: 16px 18px; }
.wk-catalog-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.wk-catalog-name { font-size: var(--wk-fs-15); color: var(--wk-text-hi); font-weight: var(--wk-fw-semibold); }
.wk-catalog-meta { font-family: var(--wk-font-mono); font-size: var(--wk-fs-11); color: var(--wk-text-mid); margin-top: 3px; }
.wk-catalog-acts { display: flex; flex-wrap: wrap; gap: 7px; }
.wk-act-chip { font-family: var(--wk-font-mono); font-size: var(--wk-fs-11); color: var(--wk-text);
  background: var(--wk-bg-2); border: 1px solid var(--wk-line-soft); border-radius: 16px; padding: 4px 11px; }

/* ---------- Settings ---------- */
.wk-set-list { display: flex; flex-direction: column; gap: 12px; }
.wk-set-card { background: var(--wk-bg-1); border: 1px solid var(--wk-line); border-radius: 12px; padding: 16px 18px; }
.wk-set-card.is-row { display: flex; justify-content: space-between; align-items: center; }
.wk-set-title { color: var(--wk-text-hi); font-size: var(--wk-fs-14); }
.wk-set-desc { color: var(--wk-text-mid); font-size: var(--wk-fs-12); margin-top: 2px; }
.wk-set-value { font-family: var(--wk-font-mono); font-size: var(--wk-fs-12); color: var(--wk-text);
  background: var(--wk-bg-2); border: 1px solid var(--wk-line); border-radius: var(--wk-radius-md); padding: 7px 12px; }
.wk-set-value.is-muted { color: var(--wk-text-lo); }
.wk-absence-chip { display: flex; align-items: center; gap: 10px; font-family: var(--wk-font-mono);
  font-size: var(--wk-fs-12); color: var(--wk-text); background: var(--wk-bg-2);
  border: 1px solid var(--wk-line-soft); border-radius: var(--wk-radius-md); padding: 9px 12px; }
.wk-absence-swatch { width: 9px; height: 9px; border-radius: 2px;
  background: repeating-linear-gradient(45deg, #171a20, #171a20 3px, #1b1f27 3px, #1b1f27 6px); }
~~~

---

`frontend/src/types.ts`
~~~ts
export type ActivityName =
  | 'Bug fixing'
  | 'Change request'
  | 'Communication & Meeting'
  | 'Support';

/** A charge code. `number` is only needed for the timesheet system; `name` (libellé) is the primary label. */
export interface TimesheetCode {
  id: string;
  number: string;            // e.g. "N9/1042"
  name: string;              // human project name (libellé), e.g. "Paper V4"
  label: string;             // technical timesheet label, e.g. "MNT - PAP V4"
  color: string;             // accent dot color (hex)
  activities: ActivityName[];
}

/** A tracked period of work. Can be uncategorized (codeId === null) and is always editable. */
export interface Entry {
  id: string;
  date: string;              // ISO date "YYYY-MM-DD"
  start: number;             // minutes since midnight
  end: number;               // minutes since midnight
  codeId: string | null;     // null = uncategorized / needs completing
  activity: ActivityName | null;
  description: string;
}

/** A non-worked day, reflected from the timesheet system (read-only). */
export interface Absence {
  date: string;              // ISO date
  reason: string;            // "Annual leave", "Public holiday", ...
}

export type FortnightPeriod = 'first' | 'second'; // 1–15 | 16–end

/** One day column in the Fortnight/Checklist grid. */
export interface DayColumn {
  day: number;               // day-of-month
  weekday: string;           // "Mon", "Tue", ...
  isWeekend: boolean;
  isAbsence: boolean;
  absenceReason?: string;
  isToday: boolean;
}

export type FortnightRowKey = string; // `${codeId}|${activity}`

/** A Code × Activity row: minutes per day-of-month. */
export interface FortnightRow {
  key: FortnightRowKey;
  code: TimesheetCode;
  activity: ActivityName;
  minutesByDay: Record<number, number>;
}

/** Which grid cells have been keyed into the timesheet system. Key = `${rowKey}#${day}`. */
export type ChecklistState = Record<string, boolean>;

/** A previously-used task, surfaced as a comment-autocomplete suggestion. */
export interface TaskSuggestion {
  codeId: string | null;
  codeNumber: string;
  codeName: string;
  activity: ActivityName | null;
  description: string;
  color: string;
}

export const checklistKey = (rowKey: FortnightRowKey, day: number): string => `${rowKey}#${day}`;
~~~

---

`frontend/src/lib/time.ts`
~~~ts
/** Parse a military-time string into minutes-since-midnight. "1345" -> 825, "930" -> 570, "9" -> 540. */
export function parseMilitaryClock(input: string): number | null {
  const d = (input || '').replace(/[^0-9]/g, '');
  if (!d) return null;
  let h: number;
  let m: number;
  if (d.length <= 2) { h = +d; m = 0; }
  else if (d.length === 3) { h = +d.slice(0, 1); m = +d.slice(1); }
  else { h = +d.slice(0, 2); m = +d.slice(2, 4); }
  if (h > 23) h = 23;
  if (m > 59) m = 59;
  return h * 60 + m;
}

/** minutes-since-midnight -> "HH:MM" (24h). */
export function formatClock(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Parse a duration entry. "1:30"/"130" -> 90, "45" -> 45, "" -> 0. */
export function parseDuration(input: string): number {
  const s = (input || '').trim();
  if (s.includes(':')) {
    const [a, b] = s.split(':');
    return (+a || 0) * 60 + (+(b || 0));
  }
  const d = s.replace(/[^0-9]/g, '');
  if (!d) return 0;
  if (d.length <= 2) return +d;
  if (d.length === 3) return (+d.slice(0, 1)) * 60 + (+d.slice(1));
  return (+d.slice(0, 2)) * 60 + (+d.slice(2, 4));
}

/** minutes -> "H:MM" (real, unrounded). */
export function formatDuration(min: number): string {
  if (!min) return '0:00';
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;
}

/** seconds -> "H:MM:SS" for the running Timer. */
export function formatStopwatch(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Select-all helper for inline edit inputs. */
export const selectOnFocus = (e: React.FocusEvent<HTMLInputElement>): void => {
  try { e.target.select(); } catch { /* noop */ }
};
~~~

---

`frontend/src/components/icons.tsx`
~~~tsx
import type { CSSProperties } from 'react';

interface IconProps { size?: number; style?: CSSProperties; className?: string; }
const base = (size: number): CSSProperties => ({ width: size, height: size, display: 'block' });

export const IconTracker = ({ size = 15, style, className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" style={{ ...base(size), ...style }} className={className} aria-hidden>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
    <path d="M10 8.5 15.5 12 10 15.5V8.5Z" fill="currentColor" />
  </svg>
);

export const IconFortnight = ({ size = 15, style, className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" style={{ ...base(size), ...style }} className={className} aria-hidden>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
    <path d="M3.5 9h17M9 9v10.5M14.5 9v10.5" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

export const IconChecklist = ({ size = 15, style, className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" style={{ ...base(size), ...style }} className={className} aria-hidden>
    <path d="M4 12.5 8 16.5 20 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconCatalog = ({ size = 15, style, className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" style={{ ...base(size), ...style }} className={className} aria-hidden>
    <path d="M6 4.5h10a2 2 0 0 1 2 2v13l-7-3-7 3v-13a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);

export const IconSettings = ({ size = 15, style, className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" style={{ ...base(size), ...style }} className={className} aria-hidden>
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    <path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

/** Sheriff-star app mark — the western wink. Simple 5-point star. */
export const IconStar = ({ size = 16, style, className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ ...base(size), ...style }} className={className} aria-hidden>
    <path d="M12 2.2l2.7 5.9 6.5.7-4.8 4.4 1.3 6.4L12 16.9 6.3 20l1.3-6.4L2.8 9.2l6.5-.7L12 2.2Z" />
  </svg>
);

export const IconPlay = ({ size = 13, style, className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ ...base(size), ...style }} className={className} aria-hidden>
    <path d="M7 5v14l11-7L7 5Z" />
  </svg>
);

export const IconStop = ({ size = 13, style, className }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" style={{ ...base(size), ...style }} className={className} aria-hidden>
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
  </svg>
);
~~~

---

`frontend/src/components/Logo.tsx`
~~~tsx
import { IconStar } from './icons';

interface LogoProps { wink?: boolean; }

/** Sidebar brand: star badge + "Walker" wordmark + tagline. `wink` toggles the western accent. */
export function Logo({ wink = true }: LogoProps) {
  return (
    <div className="wk-brand">
      <div className={`wk-badge${wink ? '' : ' is-plain'}`}>
        <IconStar size={16} />
      </div>
      <div>
        <div className="wk-brand-name">Walker</div>
        <div className="wk-brand-sub">time &rarr; T&amp;E</div>
      </div>
    </div>
  );
}
~~~

---

`frontend/src/components/AppShell.tsx`
~~~tsx
import type { ReactNode } from 'react';
import { Logo } from './Logo';
import { IconTracker, IconFortnight, IconChecklist, IconCatalog, IconSettings } from './icons';

export type Route = 'tracker' | 'fortnight' | 'checklist' | 'codes' | 'settings';

interface NavItem { key: Route; label: string; icon: ReactNode; }

const NAV: NavItem[] = [
  { key: 'tracker', label: 'Today', icon: <IconTracker /> },
  { key: 'fortnight', label: 'Fortnight', icon: <IconFortnight /> },
  { key: 'checklist', label: 'Enter in the timesheet system', icon: <IconChecklist /> },
  { key: 'codes', label: 'Code catalog', icon: <IconCatalog /> },
  { key: 'settings', label: 'Settings', icon: <IconSettings /> },
];

interface AppShellProps {
  route: Route;
  onNavigate: (route: Route) => void;
  /** The persistent Timer bar, rendered above every screen. */
  timer: ReactNode;
  children: ReactNode;
}

export function AppShell({ route, onNavigate, timer, children }: AppShellProps) {
  return (
    <div className="wk-app">
      <aside className="wk-sidebar">
        <Logo />
        <nav className="wk-nav">
          {NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`wk-nav-item${route === item.key ? ' is-active' : ''}`}
              onClick={() => onNavigate(item.key)}
            >
              <span className="wk-nav-ico">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="wk-sidebar-foot">
          <div className="wk-avatar">JD</div>
          <div className="wk-foot-meta">Consultant</div>
        </div>
      </aside>

      <main className="wk-main">
        {timer}
        <div className="wk-outlet">{children}</div>
      </main>
    </div>
  );
}
~~~

---

`frontend/src/components/TimerBar.tsx`
~~~tsx
import { useState } from 'react';
import type { ActivityName, TaskSuggestion, TimesheetCode } from '../types';
import { formatStopwatch } from '../lib/time';
import { IconPlay, IconStop } from './icons';

interface TimerBarProps {
  running: boolean;
  elapsedSeconds: number;              // parent ticks this every second while running
  description: string;
  code: TimesheetCode | null;
  activity: ActivityName | null;
  suggestions: TaskSuggestion[];       // computed by parent (scoped to code when set)
  onDescriptionChange: (value: string) => void;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;                // discard running / clear selection
  onSwitchTask: () => void;            // open Code picker
  onPickSuggestion: (s: TaskSuggestion) => void;
}

export function TimerBar({
  running, elapsedSeconds, description, code, activity, suggestions,
  onDescriptionChange, onStart, onStop, onCancel, onSwitchTask, onPickSuggestion,
}: TimerBarProps) {
  const [focused, setFocused] = useState(false);
  const showSuggestions = focused && suggestions.length > 0;

  const hasTask = !!code;
  const canCancel = running || hasTask || description.trim().length > 0;
  const cancelTitle = running ? 'Cancel timer — discard, nothing saved' : 'Clear selection';
  const suggestTitle = hasTask ? `Recent on ${code!.name}` : 'Resume a recent task';

  return (
    <div className="wk-timerbar">
      <div className="wk-timer-left">
        <span className={`wk-timer-dot${running ? ' is-running' : ''}`} />
        <span className={`wk-timer-clock${running ? ' is-running' : ''}`}>
          {formatStopwatch(elapsedSeconds)}
        </span>
      </div>

      <div className="wk-timer-input-wrap">
        <input
          className="wk-timer-input"
          value={description}
          placeholder="What are you working on?"
          onChange={(e) => onDescriptionChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
        />
        {showSuggestions && (
          <div className="wk-suggest">
            <div className="wk-suggest-title">{suggestTitle}</div>
            {suggestions.map((s, i) => (
              <button
                key={`${s.codeId ?? 'none'}-${i}`}
                type="button"
                className="wk-suggest-item"
                // mousedown + preventDefault keeps input focus so blur doesn't close first
                onMouseDown={(e) => { e.preventDefault(); onPickSuggestion(s); }}
              >
                <span className="wk-dot" style={{ background: s.color }} />
                <span className="wk-suggest-body">
                  <span className="wk-suggest-desc">{s.description}</span>
                  <span className="wk-suggest-meta">
                    {s.codeId ? `${s.codeNumber} · ${s.codeName}` : 'Uncategorized'}
                    {s.activity ? ` · ${s.activity}` : ''}
                  </span>
                </span>
                <span className="wk-suggest-key">↵ fill</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="button" className="wk-taskchip" onClick={onSwitchTask}>
        <span className="wk-dot" style={{ background: code ? code.color : 'var(--wk-amber)' }} />
        <span style={{ textAlign: 'left' }}>
          <span className="wk-taskchip-main" style={{ display: 'block' }}>
            {code ? code.name : 'Uncategorized'}
          </span>
          <span className="wk-taskchip-sub" style={{ display: 'block' }}>
            {code ? `${code.number}${activity ? ` · ${activity}` : ''}` : 'pick a code'}
          </span>
        </span>
        <span className="wk-taskchip-caret">switch ⌄</span>
      </button>

      {canCancel && (
        <button type="button" className="wk-btn-icon" title={cancelTitle} onClick={onCancel}>✕</button>
      )}

      {running ? (
        <button type="button" className="wk-btn wk-btn-danger" onClick={onStop}>
          <IconStop style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: 6 }} /> Stop
        </button>
      ) : (
        <button type="button" className="wk-btn wk-btn-primary" onClick={onStart}>
          <IconPlay style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: 6 }} /> Start
        </button>
      )}
    </div>
  );
}
~~~

---

`frontend/src/components/CodePicker.tsx`
~~~tsx
import { useMemo, useState } from 'react';
import type { ActivityName, TimesheetCode } from '../types';

interface CodePickerProps {
  title: string;                                    // "Switch task" | "Categorize entry"
  codes: TimesheetCode[];
  onPick: (codeId: string, activity: ActivityName) => void;
  onClose: () => void;
}

/** Modal chooser for Timesheet code + Activity. Search matches number, project name, label, activity. */
export function CodePicker({ title, codes, onPick, onClose }: CodePickerProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return codes
      .map((c) => {
        const codeMatch = `${c.number} ${c.name} ${c.label}`.toLowerCase().includes(q);
        const activities = c.activities.filter((a) => q === '' || codeMatch || a.toLowerCase().includes(q));
        return { code: c, activities };
      })
      .filter((r) => r.activities.length > 0);
  }, [codes, query]);

  return (
    <div className="wk-overlay" onClick={onClose}>
      <div className="wk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wk-modal-head">
          <span className="wk-modal-title">{title}</span>
          <button type="button" className="wk-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="wk-modal-search-wrap">
          <input
            className="wk-input"
            autoFocus
            value={query}
            placeholder="Search code or activity…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="wk-modal-body">
          {results.map(({ code, activities }) => (
            <div key={code.id} className="wk-picker-code">
              <div className="wk-picker-code-head">
                <span className="wk-dot" style={{ background: code.color }} />
                <span>
                  <span className="wk-picker-name" style={{ display: 'block' }}>{code.name}</span>
                  <span className="wk-picker-meta" style={{ display: 'block' }}>
                    {code.number} · {code.label}
                  </span>
                </span>
              </div>
              <div className="wk-picker-acts">
                {activities.map((a) => (
                  <button key={a} type="button" className="wk-act" onClick={() => onPick(code.id, a)}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {results.length === 0 && <div className="wk-modal-empty">No codes match. Adjust your search.</div>}
        </div>
      </div>
    </div>
  );
}
~~~

---

`frontend/src/components/EntryRow.tsx`
~~~tsx
import { useState } from 'react';
import type { Entry, TimesheetCode } from '../types';
import { formatClock, formatDuration, parseMilitaryClock, selectOnFocus } from '../lib/time';

interface EntryRowProps {
  entry: Entry;
  code: TimesheetCode | null;
  onEdit: (patch: Partial<Entry>) => void;   // commit an edited field
  onCategorize: () => void;                   // open Code picker for this Entry
  onResume: () => void;
  onDelete: () => void;
}

type Field = 'start' | 'end' | 'desc';

export function EntryRow({ entry, code, onEdit, onCategorize, onResume, onDelete }: EntryRowProps) {
  const [editing, setEditing] = useState<Field | null>(null);
  const [buffer, setBuffer] = useState('');
  const flagged = !entry.codeId;

  const begin = (field: Field) => {
    setEditing(field);
    setBuffer(field === 'desc' ? entry.description : formatClock(field === 'start' ? entry.start : entry.end));
  };
  const commit = () => {
    if (!editing) return;
    if (editing === 'desc') {
      onEdit({ description: buffer });
    } else {
      const m = parseMilitaryClock(buffer);
      if (m != null) {
        if (editing === 'start') onEdit({ start: m, end: Math.max(m, entry.end) });
        else onEdit({ end: Math.max(entry.start, m) });
      }
    }
    setEditing(null);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') setEditing(null);
  };

  return (
    <div className={`wk-entry-row${flagged ? ' is-flagged' : ''}`}>
      <span className="wk-dot" style={{ background: flagged ? 'var(--wk-amber)' : code?.color ?? 'var(--wk-text-lo)' }} />

      {/* time range (military inline edit) */}
      <div className="wk-time">
        {editing === 'start' ? (
          <input className="wk-input-inline" autoFocus value={buffer} onFocus={selectOnFocus}
            onChange={(e) => setBuffer(e.target.value)} onKeyDown={onKey} onBlur={commit} />
        ) : (
          <span className="wk-time-span" onClick={() => begin('start')}>{formatClock(entry.start)}</span>
        )}
        <span className="wk-time-sep">–</span>
        {editing === 'end' ? (
          <input className="wk-input-inline" autoFocus value={buffer} onFocus={selectOnFocus}
            onChange={(e) => setBuffer(e.target.value)} onKeyDown={onKey} onBlur={commit} />
        ) : (
          <span className="wk-time-span" onClick={() => begin('end')}>{formatClock(entry.end)}</span>
        )}
      </div>

      <div className="wk-dur">{formatDuration(Math.max(0, entry.end - entry.start))}</div>

      {/* project · code · activity — or the uncategorized flag */}
      <div style={{ minWidth: 0 }}>
        {flagged ? (
          <span className="wk-pill-add" onClick={onCategorize}>⚑ Add code &amp; activity</span>
        ) : (
          <div className="wk-code-cell" onClick={onCategorize}>
            <div className="wk-code-name-row">
              <span className="wk-dot" style={{ background: code?.color }} />
              <span className="wk-code-name">{code?.name}</span>
            </div>
            <div className="wk-code-meta">{code?.number}{entry.activity ? ` · ${entry.activity}` : ''}</div>
          </div>
        )}
      </div>

      {/* description (inline edit) */}
      <div style={{ minWidth: 0 }}>
        {editing === 'desc' ? (
          <input className="wk-desc-edit" autoFocus value={buffer} onFocus={selectOnFocus}
            onChange={(e) => setBuffer(e.target.value)} onKeyDown={onKey} onBlur={commit} />
        ) : (
          <div className={`wk-desc${entry.description ? '' : ' is-empty'}`} onClick={() => begin('desc')}>
            {entry.description || 'Add a description…'}
          </div>
        )}
      </div>

      <button type="button" className="wk-resume" title="Resume this task" onClick={onResume}>▶</button>
      <button type="button" className="wk-delete" title="Delete entry" onClick={onDelete}>✕</button>
    </div>
  );
}
~~~

---

`frontend/src/components/FortnightGrid.tsx`
~~~tsx
import { useState } from 'react';
import type { DayColumn, FortnightRow } from '../types';
import { checklistKey } from '../types';
import { formatDuration, parseDuration, selectOnFocus } from '../lib/time';

interface BaseProps {
  days: DayColumn[];
  rows: FortnightRow[];
}

interface FortnightModeProps extends BaseProps {
  mode: 'fortnight';
  onEditCell: (rowKey: string, day: number, minutes: number) => void;
}

interface ChecklistModeProps extends BaseProps {
  mode: 'checklist';
  checked: Record<string, boolean>;
  onToggleCell: (rowKey: string, day: number, mods: { shift: boolean; meta: boolean }) => void;
  onToggleRow: (rowKey: string) => void;
}

type FortnightGridProps = FortnightModeProps | ChecklistModeProps;

/**
 * Shared BY-CODE grid. `fortnight` cells edit durations; `checklist` cells toggle "entered into the timesheet system".
 * The visual geometry is identical so the two screens read 1:1.
 */
export function FortnightGrid(props: FortnightGridProps) {
  const { days, rows, mode } = props;
  const [editingCell, setEditingCell] = useState<{ rowKey: string; day: number } | null>(null);
  const [buffer, setBuffer] = useState('');

  const isFortnight = mode === 'fortnight';

  const commitEdit = () => {
    if (editingCell && isFortnight) {
      (props as FortnightModeProps).onEditCell(editingCell.rowKey, editingCell.day, parseDuration(buffer));
    }
    setEditingCell(null);
  };

  // Column (daily) totals + grand total for the fortnight footer.
  const colTotal = (day: number) =>
    rows.reduce((sum, r) => sum + (r.minutesByDay[day] || 0), 0);
  const grandTotal = days.reduce(
    (sum, d) => (d.isWeekend || d.isAbsence ? sum : sum + colTotal(d.day)),
    0,
  );

  return (
    <table className="wk-grid">
      <thead>
        <tr>
          <th className="wk-grid-rowhead-h">Code · Activity</th>
          {days.map((d) => (
            <th key={d.day} className={`wk-day${d.isWeekend ? ' is-weekend' : ''}`}>
              <div className="wk-day-name">{d.weekday}</div>
              <div className="wk-day-num">{d.day}</div>
              <div className={`wk-day-sub${d.isAbsence ? ' is-absence' : d.isToday ? ' is-today' : ''}`}>
                {d.isAbsence ? 'leave' : d.isToday ? 'today' : ''}
              </div>
            </th>
          ))}
          {isFortnight && <th className="wk-total-h">Total</th>}
        </tr>
      </thead>

      <tbody>
        {rows.map((row) => {
          const fillDays = days.filter((d) => !d.isWeekend && !d.isAbsence && (row.minutesByDay[d.day] || 0) > 0);
          const doneCount = mode === 'checklist'
            ? fillDays.filter((d) => (props as ChecklistModeProps).checked[checklistKey(row.key, d.day)]).length
            : 0;
          const rowTotal = fillDays.reduce((s, d) => s + (row.minutesByDay[d.day] || 0), 0);

          return (
            <tr key={row.key}>
              <td className="wk-rowhead">
                <div className="wk-rowhead-inner">
                  <span className="wk-dot" style={{ background: row.code.color }} />
                  <div className="wk-rowhead-body">
                    <div className="wk-rowhead-code">{row.code.number}</div>
                    <div className="wk-rowhead-act">{row.activity}</div>
                  </div>
                  {mode === 'checklist' && (
                    <button
                      type="button"
                      className={`wk-rowbadge${fillDays.length > 0 && doneCount === fillDays.length ? ' is-alldone' : ''}`}
                      title="Mark whole row as entered"
                      onClick={() => (props as ChecklistModeProps).onToggleRow(row.key)}
                    >
                      {doneCount}/{fillDays.length}
                    </button>
                  )}
                </div>
              </td>

              {days.map((d) => {
                const minutes = row.minutesByDay[d.day] || 0;
                const filled = minutes > 0;
                const key = checklistKey(row.key, d.day);
                const editing = isFortnight && editingCell?.rowKey === row.key && editingCell?.day === d.day;
                const done = mode === 'checklist' && (props as ChecklistModeProps).checked[key];

                const clickable = !d.isWeekend && !d.isAbsence && (isFortnight || filled);
                const cls = [
                  'wk-cell',
                  d.isWeekend ? 'is-weekend' : '',
                  d.isAbsence ? 'is-absence' : '',
                  !filled && !d.isWeekend && !d.isAbsence ? 'is-empty' : '',
                  clickable ? 'is-clickable' : '',
                  done ? 'is-done' : '',
                ].filter(Boolean).join(' ');

                const onClick = (e: React.MouseEvent) => {
                  if (!clickable) return;
                  if (isFortnight) {
                    setEditingCell({ rowKey: row.key, day: d.day });
                    setBuffer(filled ? formatDuration(minutes) : '');
                  } else {
                    (props as ChecklistModeProps).onToggleCell(row.key, d.day, {
                      shift: e.shiftKey, meta: e.metaKey || e.ctrlKey,
                    });
                  }
                };

                return (
                  <td key={d.day} className={cls} onClick={onClick}>
                    {editing ? (
                      <input
                        className="wk-cell-input"
                        autoFocus
                        value={buffer}
                        onFocus={selectOnFocus}
                        onChange={(e) => setBuffer(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit();
                          if (e.key === 'Escape') setEditingCell(null);
                        }}
                        onBlur={commitEdit}
                      />
                    ) : (
                      <>
                        <span>{filled ? formatDuration(minutes) : ''}</span>
                        {done && <span className="wk-cell-check">✓</span>}
                      </>
                    )}
                  </td>
                );
              })}

              {isFortnight && <td className="wk-rowtotal">{formatDuration(rowTotal)}</td>}
            </tr>
          );
        })}
      </tbody>

      {isFortnight && (
        <tfoot>
          <tr>
            <td className="wk-foot-label">Daily total</td>
            {days.map((d) => {
              const t = colTotal(d.day);
              return (
                <td key={d.day} className={`wk-coltotal${d.isWeekend ? ' is-weekend' : ''}`}>
                  {!d.isWeekend && !d.isAbsence && t > 0 ? formatDuration(t) : ''}
                </td>
              );
            })}
            <td className="wk-grandtotal">{formatDuration(grandTotal)}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}
~~~

---

`frontend/src/components/EntryEditor.tsx`
~~~tsx
import { useState } from 'react';
import type { Entry, TimesheetCode } from '../types';
import { formatClock, formatDuration, parseMilitaryClock, selectOnFocus } from '../lib/time';

interface EntryEditorProps {
  entry: Entry;
  code: TimesheetCode | null;
  onSave: (patch: Partial<Entry>) => void;
  onOpenPicker: () => void;     // reuse CodePicker to change code/activity
  onClose: () => void;
}

/** Modal full editor for one Entry — start/end (military), description; code/activity via CodePicker. */
export function EntryEditor({ entry, code, onSave, onOpenPicker, onClose }: EntryEditorProps) {
  const [start, setStart] = useState(formatClock(entry.start));
  const [end, setEnd] = useState(formatClock(entry.end));
  const [description, setDescription] = useState(entry.description);

  const save = () => {
    const s = parseMilitaryClock(start);
    const e = parseMilitaryClock(end);
    const patch: Partial<Entry> = { description };
    if (s != null) patch.start = s;
    if (e != null) patch.end = Math.max(s ?? entry.start, e);
    onSave(patch);
    onClose();
  };

  const s = parseMilitaryClock(start) ?? entry.start;
  const e = parseMilitaryClock(end) ?? entry.end;

  return (
    <div className="wk-overlay" onClick={onClose}>
      <div className="wk-modal" onClick={(ev) => ev.stopPropagation()}>
        <div className="wk-modal-head">
          <span className="wk-modal-title">Edit entry</span>
          <button type="button" className="wk-modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <label style={{ flex: 1 }}>
              <div className="wk-screen-sub" style={{ marginBottom: 6 }}>Start</div>
              <input className="wk-input" value={start} onFocus={selectOnFocus}
                onChange={(ev) => setStart(ev.target.value)} placeholder="0900" />
            </label>
            <label style={{ flex: 1 }}>
              <div className="wk-screen-sub" style={{ marginBottom: 6 }}>End</div>
              <input className="wk-input" value={end} onFocus={selectOnFocus}
                onChange={(ev) => setEnd(ev.target.value)} placeholder="1030" />
            </label>
            <div style={{ paddingBottom: 10, fontFamily: 'var(--wk-font-mono)', color: 'var(--wk-text-mid)' }}>
              {formatDuration(Math.max(0, e - s))}
            </div>
          </div>

          <div>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>Timesheet code &amp; activity</div>
            <button type="button" className="wk-taskchip" style={{ width: '100%' }} onClick={onOpenPicker}>
              <span className="wk-dot" style={{ background: code ? code.color : 'var(--wk-amber)' }} />
              <span style={{ textAlign: 'left', flex: 1 }}>
                <span className="wk-taskchip-main" style={{ display: 'block' }}>
                  {code ? code.name : 'Uncategorized'}
                </span>
                <span className="wk-taskchip-sub" style={{ display: 'block' }}>
                  {code ? `${code.number}${entry.activity ? ` · ${entry.activity}` : ''}` : 'pick a code'}
                </span>
              </span>
              <span className="wk-taskchip-caret">change ⌄</span>
            </button>
          </div>

          <label>
            <div className="wk-screen-sub" style={{ marginBottom: 6 }}>Description</div>
            <input className="wk-input" value={description} onFocus={selectOnFocus}
              onChange={(ev) => setDescription(ev.target.value)} placeholder="Add a description…" />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
            <button type="button" className="wk-btn-ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="wk-btn wk-btn-primary" style={{ padding: '10px 22px' }} onClick={save}>
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
~~~

---

`frontend/src/screens/TrackerScreen.tsx`
~~~tsx
import type { Entry, TimesheetCode } from '../types';
import { EntryRow } from '../components/EntryRow';

interface TrackerScreenProps {
  dateLabel: string;                    // "Thursday, July 2"
  totalLabel: string;                   // day total "H:MM" (informational only)
  entries: Entry[];                     // already sorted by start
  codesById: Record<string, TimesheetCode>;
  onEditEntry: (id: string, patch: Partial<Entry>) => void;
  onCategorizeEntry: (id: string) => void;
  onResumeEntry: (id: string) => void;
  onDeleteEntry: (id: string) => void;
}

export function TrackerScreen({
  dateLabel, totalLabel, entries, codesById,
  onEditEntry, onCategorizeEntry, onResumeEntry, onDeleteEntry,
}: TrackerScreenProps) {
  return (
    <div className="wk-screen wk-entry-cols" style={{ maxWidth: 1120 }}>
      <div className="wk-screen-head">
        <div>
          <div className="wk-screen-title">{dateLabel}</div>
          <div className="wk-screen-sub">Today · to the minute · no rounding</div>
        </div>
        <div className="wk-daytotal">
          <div className="wk-daytotal-value">{totalLabel}</div>
          <div className="wk-daytotal-label">tracked today</div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="wk-empty">
          <div className="wk-empty-title">Adios, backlog.</div>
          <div className="wk-empty-sub">
            Nothing tracked yet. Hit <span className="wk-accent">Start</span> — categorize it later.
          </div>
        </div>
      ) : (
        <>
          <div className="wk-entry-head">
            <div /><div>Time</div><div>Dur</div><div>Project · code · activity</div><div>Description</div><div /><div />
          </div>
          <div className="wk-entry-list">
            {entries.map((entry) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                code={entry.codeId ? codesById[entry.codeId] ?? null : null}
                onEdit={(patch) => onEditEntry(entry.id, patch)}
                onCategorize={() => onCategorizeEntry(entry.id)}
                onResume={() => onResumeEntry(entry.id)}
                onDelete={() => onDeleteEntry(entry.id)}
              />
            ))}
          </div>
          <div className="wk-tip">Tip — click any time to edit it military-style: type <b>1345</b> → 13:45.</div>
        </>
      )}
    </div>
  );
}
~~~

---

`frontend/src/screens/FortnightScreen.tsx`
~~~tsx
import type { DayColumn, FortnightPeriod, FortnightRow } from '../types';
import { FortnightGrid } from '../components/FortnightGrid';

interface FortnightScreenProps {
  period: FortnightPeriod;
  periodLabel: string;                  // "1 – 15 July 2026"
  days: DayColumn[];
  rows: FortnightRow[];
  onPeriodChange: (period: FortnightPeriod) => void;
  onEditCell: (rowKey: string, day: number, minutes: number) => void;
}

export function FortnightScreen({
  period, periodLabel, days, rows, onPeriodChange, onEditCell,
}: FortnightScreenProps) {
  return (
    <div className="wk-screen">
      <div className="wk-screen-head">
        <div>
          <div className="wk-screen-title">Fortnight — <span className="wk-accent">by code</span></div>
          <div className="wk-screen-sub">
            A 1:1 mirror of Time &amp; Expenses. Real durations — round in T&amp;E, not here.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="wk-period">
            <button type="button" className={`wk-seg${period === 'first' ? ' is-active' : ''}`}
              onClick={() => onPeriodChange('first')}>1–15</button>
            <button type="button" className={`wk-seg${period === 'second' ? ' is-active' : ''}`}
              onClick={() => onPeriodChange('second')}>16–31</button>
          </div>
          <div className="wk-period-label">{periodLabel}</div>
        </div>
      </div>

      <div className="wk-grid-wrap">
        <FortnightGrid mode="fortnight" days={days} rows={rows} onEditCell={onEditCell} />
      </div>

      <div className="wk-legend">
        <span><span className="wk-legend-swatch" style={{ background: 'var(--wk-weekend)', border: '1px solid var(--wk-line)' }} />Weekend</span>
        <span><span className="wk-legend-swatch" style={{ background: 'repeating-linear-gradient(45deg,#171a20,#171a20 3px,#1b1f27 3px,#1b1f27 6px)' }} />Absence (from T&amp;E)</span>
        <span style={{ color: 'var(--wk-text-mid)' }}>Click any cell to edit its duration.</span>
      </div>
    </div>
  );
}
~~~

---

`frontend/src/screens/ChecklistScreen.tsx`
~~~tsx
import { useRef } from 'react';
import type { ChecklistState, DayColumn, FortnightRow } from '../types';
import { checklistKey } from '../types';
import { FortnightGrid } from '../components/FortnightGrid';

interface ChecklistScreenProps {
  days: DayColumn[];
  rows: FortnightRow[];
  checked: ChecklistState;
  onChange: (next: ChecklistState) => void;   // full next map (entered-into-timesheet flags)
  onReset: () => void;
}

/**
 * "Enter in the timesheet system" — tick each grid cell as you key it. Range selection is COLUMN-MAJOR (vertical):
 * fill order walks down a day column first, then across — the natural order for entering a full day.
 */
export function ChecklistScreen({ days, rows, checked, onChange, onReset }: ChecklistScreenProps) {
  const lastIndex = useRef<number | null>(null);

  // Column-major fill order over interactive (filled, non-weekend, non-absence) cells.
  const fillOrder: string[] = [];
  days.forEach((d) => {
    if (d.isWeekend || d.isAbsence) return;
    rows.forEach((r) => {
      if ((r.minutesByDay[d.day] || 0) > 0) fillOrder.push(checklistKey(r.key, d.day));
    });
  });

  const total = fillOrder.length;
  const doneCount = fillOrder.filter((k) => checked[k]).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  const toggleCell = (rowKey: string, day: number, mods: { shift: boolean; meta: boolean }) => {
    const key = checklistKey(rowKey, day);
    const idx = fillOrder.indexOf(key);
    const next: ChecklistState = { ...checked };

    if (mods.shift && lastIndex.current != null && idx >= 0) {
      const [a, b] = [lastIndex.current, idx].sort((x, y) => x - y);
      for (let i = a; i <= b; i++) next[fillOrder[i]] = true;   // vertical range → entered
    } else {
      if (next[key]) delete next[key]; else next[key] = true;   // plain / ⌘-Ctrl toggle
    }
    lastIndex.current = idx;
    onChange(next);
  };

  const toggleRow = (rowKey: string) => {
    const next: ChecklistState = { ...checked };
    days.forEach((d) => {
      if (d.isWeekend || d.isAbsence) return;
      const r = rows.find((x) => x.key === rowKey);
      if (r && (r.minutesByDay[d.day] || 0) > 0) next[checklistKey(rowKey, d.day)] = true;
    });
    onChange(next);
  };

  return (
    <div className="wk-screen">
      <div className="wk-screen-head">
        <div>
          <div className="wk-screen-title">Enter into T&amp;E</div>
          <div className="wk-screen-sub">
            Tick each cell as you key it into T&amp;E. Shift-click for a range, ⌘/Ctrl-click to toggle one.
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ textAlign: 'right' }}>
            <div className="wk-progress-count">{doneCount} <span>/ {total}</span></div>
            <div className="wk-progress-label">lines entered</div>
          </div>
          <button type="button" className="wk-btn-ghost" onClick={onReset}>Reset</button>
        </div>
      </div>

      <div className="wk-progress"><div className="wk-progress-bar" style={{ width: `${pct}%` }} /></div>

      <div className="wk-grid-wrap">
        <FortnightGrid
          mode="checklist"
          days={days}
          rows={rows}
          checked={checked}
          onToggleCell={toggleCell}
          onToggleRow={toggleRow}
        />
      </div>
    </div>
  );
}
~~~

---

`frontend/src/screens/CodeCatalogScreen.tsx`
~~~tsx
import { useMemo, useState } from 'react';
import type { TimesheetCode } from '../types';

interface CodeCatalogScreenProps {
  codes: TimesheetCode[];
  onImport?: () => void;   // presentational — wire to your file importer
}

export function CodeCatalogScreen({ codes, onImport }: CodeCatalogScreenProps) {
  const [query, setQuery] = useState('');
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return codes.filter((c) =>
      `${c.number} ${c.name} ${c.label} ${c.activities.join(' ')}`.toLowerCase().includes(q));
  }, [codes, query]);

  return (
    <div className="wk-screen is-narrow">
      <div className="wk-screen-head">
        <div>
          <div className="wk-screen-title">Code catalog</div>
          <div className="wk-screen-sub">Your timesheet codes &amp; their activities.</div>
        </div>
        <button type="button" className="wk-btn-ghost" onClick={onImport}>⇪ Import from file</button>
      </div>

      <input
        className="wk-input"
        style={{ marginBottom: 16 }}
        value={query}
        placeholder="Search code number, project name, label or activity…"
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="wk-catalog-list">
        {list.map((c) => (
          <div key={c.id} className="wk-catalog-card">
            <div className="wk-catalog-head">
              <span className="wk-dot" style={{ width: 10, height: 10, background: c.color }} />
              <div>
                <div className="wk-catalog-name">{c.name}</div>
                <div className="wk-catalog-meta">{c.number} · {c.label}</div>
              </div>
            </div>
            <div className="wk-catalog-acts">
              {c.activities.map((a) => <span key={a} className="wk-act-chip">{a}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
~~~

---

`frontend/src/screens/SettingsScreen.tsx`
~~~tsx
import type { Absence } from '../types';

interface SettingsScreenProps {
  workRhythm: string;        // "Mon – Fri"
  partTime: string;          // "None"
  absences: Absence[];       // reflected from the timesheet system (read-only)
}

export function SettingsScreen({ workRhythm, partTime, absences }: SettingsScreenProps) {
  return (
    <div className="wk-screen" style={{ maxWidth: 720 }}>
      <div className="wk-screen-title" style={{ marginBottom: 5 }}>Settings</div>
      <div className="wk-screen-sub" style={{ marginBottom: 22 }}>
        Personalize how the Fortnight view reads. Absences come from T&amp;E.
      </div>

      <div className="wk-set-list">
        <div className="wk-set-card is-row">
          <div>
            <div className="wk-set-title">Work rhythm</div>
            <div className="wk-set-desc">Which days show as workdays in the grid.</div>
          </div>
          <div className="wk-set-value">{workRhythm}</div>
        </div>

        <div className="wk-set-card is-row">
          <div>
            <div className="wk-set-title">Part-time</div>
            <div className="wk-set-desc">Grey out a recurring non-worked day.</div>
          </div>
          <div className="wk-set-value is-muted">{partTime}</div>
        </div>

        <div className="wk-set-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="wk-set-title">Absences this fortnight</div>
            <span style={{ fontFamily: 'var(--wk-font-mono)', fontSize: 11, color: 'var(--wk-text-lo)' }}>
              reflected from T&amp;E
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {absences.map((a) => (
              <div key={a.date} className="wk-absence-chip">
                <span className="wk-absence-swatch" />
                {a.date} · {a.reason}
              </div>
            ))}
            {absences.length === 0 && (
              <div style={{ color: 'var(--wk-text-lo)', fontFamily: 'var(--wk-font-mono)', fontSize: 12 }}>
                No absences this fortnight.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
~~~

---

`public/favicon.svg`
~~~svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48">
  <rect width="48" height="48" rx="11" fill="#15171d"/>
  <circle cx="24" cy="24" r="15" fill="rgba(91,156,246,0.14)" stroke="rgba(91,156,246,0.42)"/>
  <path d="M24 10.5l3.9 8.5 9.3 1-6.9 6.3 1.9 9.2L24 30.3l-8.1 4.2 1.9-9.2-6.9-6.3 9.3-1L24 10.5Z" fill="#5b9cf6"/>
</svg>
~~~

---

`frontend/src/App.tsx` *(illustrative wiring — replace the in-memory store with your `/api` layer; shows the timer tick, split-on-switch, aggregation, and every screen connected)*
~~~tsx
import { useEffect, useMemo, useState } from 'react';
import './styles/tokens.css';
import './styles/walker.css';
import { AppShell, type Route } from './components/AppShell';
import { TimerBar } from './components/TimerBar';
import { CodePicker } from './components/CodePicker';
import { TrackerScreen } from './screens/TrackerScreen';
import { FortnightScreen } from './screens/FortnightScreen';
import { ChecklistScreen } from './screens/ChecklistScreen';
import { CodeCatalogScreen } from './screens/CodeCatalogScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import type {
  ActivityName, ChecklistState, DayColumn, Entry, FortnightPeriod, FortnightRow,
  TaskSuggestion, TimesheetCode,
} from './types';
import { formatDuration } from './lib/time';

// ---- Mock data (replace with GET /api/...) ----
const CODES: TimesheetCode[] = [
  { id: 'c1', number: 'N9/1042', name: 'Paper V4', label: 'MNT - PAP V4', color: '#5b9cf6',
    activities: ['Bug fixing', 'Change request', 'Communication & Meeting', 'Support'] },
  { id: 'c2', number: 'N9/2318', name: 'Client Portal', label: 'DEV - CLIENT PORTAL', color: '#3fb68b',
    activities: ['Bug fixing', 'Change request', 'Communication & Meeting', 'Support'] },
  { id: 'c3', number: 'N9/0007', name: 'Internal & Admin', label: 'INT - INTERNAL / ADMIN', color: '#c88b5b',
    activities: ['Communication & Meeting', 'Support'] },
  { id: 'c4', number: 'N9/5501', name: 'Data Platform', label: 'MNT - DATA PLATFORM', color: '#a879d6',
    activities: ['Bug fixing', 'Change request', 'Support'] },
];
const CODES_BY_ID = Object.fromEntries(CODES.map((c) => [c.id, c]));
const TODAY = '2026-07-02';

const INITIAL_ENTRIES: Entry[] = [
  { id: 'e1', date: TODAY, start: 542, end: 588, codeId: 'c1', activity: 'Communication & Meeting', description: 'Daily stand-up + backlog grooming' },
  { id: 'e2', date: TODAY, start: 588, end: 675, codeId: 'c1', activity: 'Bug fixing', description: 'PAP V4 – fix date parsing on CSV import' },
  { id: 'e3', date: TODAY, start: 680, end: 725, codeId: 'c2', activity: 'Change request', description: 'Client portal – add CSV export button' },
  { id: 'e4', date: TODAY, start: 850, end: 875, codeId: null, activity: null, description: '' },
];
// Prior-day descriptions that power comment autocomplete
const HISTORY: Pick<Entry, 'codeId' | 'activity' | 'description'>[] = [
  { codeId: 'c2', activity: 'Communication & Meeting', description: 'Client portal – weekly sync with client' },
  { codeId: 'c1', activity: 'Support', description: 'PAP V4 – answer user support tickets' },
  { codeId: 'c4', activity: 'Change request', description: 'Data platform – add data retention policy' },
];
const MATRIX: Record<string, Record<number, number>> = {
  'c1|Bug fixing': { 1: 132, 2: 87, 3: 96, 6: 145, 7: 63, 8: 120, 10: 54 },
  'c1|Communication & Meeting': { 1: 46, 2: 46, 6: 52, 8: 38, 13: 60 },
  'c2|Change request': { 2: 45, 3: 180, 6: 75, 7: 210, 9: 150, 10: 95 },
  'c2|Support': { 1: 35, 7: 40, 9: 55 },
  'c3|Communication & Meeting': { 1: 30, 8: 25, 13: 45 },
  'c4|Bug fixing': { 3: 60, 10: 130, 13: 110 },
};
const ABSENCES: Record<number, string> = { 14: 'Annual leave' };
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const nowMinutes = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

interface TimerState {
  running: boolean; segStartTs: number | null; segStartMin: number | null;
  codeId: string | null; activity: ActivityName | null; description: string;
}

export default function App() {
  const [route, setRoute] = useState<Route>('tracker');
  const [entries, setEntries] = useState<Entry[]>(INITIAL_ENTRIES);
  const [timer, setTimer] = useState<TimerState>({ running: false, segStartTs: null, segStartMin: null, codeId: null, activity: null, description: '' });
  const [now, setNow] = useState(Date.now());
  const [period, setPeriod] = useState<FortnightPeriod>('first');
  const [matrix, setMatrix] = useState(MATRIX);
  const [checked, setChecked] = useState<ChecklistState>(() => {
    const c: ChecklistState = {};
    Object.keys(MATRIX).forEach((k) => [1, 2, 3].forEach((d) => { if (MATRIX[k][d]) c[`${k}#${d}`] = true; }));
    return c;
  });
  const [picker, setPicker] = useState<{ target: 'timer' | string } | null>(null);

  useEffect(() => {
    const iv = window.setInterval(() => { if (timer.running) setNow(Date.now()); }, 1000);
    return () => window.clearInterval(iv);
  }, [timer.running]);

  const timerCode = timer.codeId ? CODES_BY_ID[timer.codeId] : null;
  const elapsedSeconds = timer.running && timer.segStartTs ? (now - timer.segStartTs) / 1000 : 0;

  const pushSegment = (t: TimerState, list: Entry[]): Entry[] => {
    if (!t.running || t.segStartMin == null) return list;
    const mins = Math.max(1, Math.round((Date.now() - (t.segStartTs ?? Date.now())) / 60000));
    return [...list, { id: `e${Date.now()}`, date: TODAY, start: t.segStartMin, end: t.segStartMin + mins, codeId: t.codeId, activity: t.activity, description: t.description }];
  };

  const startTimer = () => setTimer((t) => t.running ? t : { ...t, running: true, segStartTs: Date.now(), segStartMin: nowMinutes() });
  const stopTimer = () => setTimer((t) => {
    if (t.running) setEntries((es) => pushSegment(t, es));
    return { running: false, segStartTs: null, segStartMin: null, codeId: null, activity: null, description: '' };
  });
  const cancelTimer = () => setTimer({ running: false, segStartTs: null, segStartMin: null, codeId: null, activity: null, description: '' });

  const pickForTimer = (codeId: string, activity: ActivityName) => setTimer((t) => {
    if (t.running) {
      setEntries((es) => pushSegment(t, es));
      return { ...t, codeId, activity, segStartTs: Date.now(), segStartMin: nowMinutes() };
    }
    return { ...t, codeId, activity };
  });

  const resumeEntry = (id: string) => {
    const e = entries.find((x) => x.id === id);
    if (!e) return;
    setTimer((t) => { if (t.running) setEntries((es) => pushSegment(t, es)); return { running: true, segStartTs: Date.now(), segStartMin: nowMinutes(), codeId: e.codeId, activity: e.activity, description: e.description }; });
    setNow(Date.now());
  };

  // Comment suggestions (scoped to timer code when set)
  const suggestions: TaskSuggestion[] = useMemo(() => {
    const q = timer.description.trim().toLowerCase();
    const seen = new Set<string>();
    const pool = [...entries].reverse().concat(HISTORY as Entry[])
      .filter((e) => e.description)
      .filter((e) => { const k = `${e.codeId}|${e.activity}|${e.description}`; if (seen.has(k)) return false; seen.add(k); return true; });
    return pool
      .filter((e) => (timer.codeId ? e.codeId === timer.codeId : true))
      .filter((e) => !q || e.description.toLowerCase().includes(q) || (e.codeId ? CODES_BY_ID[e.codeId].name.toLowerCase().includes(q) : false))
      .slice(0, 6)
      .map((e) => ({ codeId: e.codeId, codeNumber: e.codeId ? CODES_BY_ID[e.codeId].number : '', codeName: e.codeId ? CODES_BY_ID[e.codeId].name : '', activity: e.activity, description: e.description, color: e.codeId ? CODES_BY_ID[e.codeId].color : 'var(--wk-amber)' }));
  }, [entries, timer.description, timer.codeId]);

  // Fortnight columns + rows
  const days: DayColumn[] = useMemo(() => {
    const nums = period === 'first' ? Array.from({ length: 15 }, (_, i) => i + 1)
      : Array.from({ length: 31 - 15 }, (_, i) => i + 16);
    return nums.map((day) => {
      const dt = new Date(2026, 6, day); const dow = dt.getDay();
      return { day, weekday: WD[dow], isWeekend: dow === 0 || dow === 6, isAbsence: !!ABSENCES[day], absenceReason: ABSENCES[day], isToday: day === 2 };
    });
  }, [period]);
  const rows: FortnightRow[] = useMemo(() => Object.keys(matrix).map((key) => {
    const [codeId, activity] = key.split('|') as [string, ActivityName];
    return { key, code: CODES_BY_ID[codeId], activity, minutesByDay: matrix[key] };
  }), [matrix]);

  const editCell = (rowKey: string, day: number, minutes: number) => setMatrix((m) => {
    const row = { ...(m[rowKey] || {}) };
    if (minutes > 0) row[day] = minutes; else delete row[day];
    return { ...m, [rowKey]: row };
  });

  const sortedToday = [...entries].filter((e) => e.date === TODAY).sort((a, b) => a.start - b.start);
  const dayTotal = sortedToday.reduce((s, e) => s + Math.max(0, e.end - e.start), 0);
  const dateLabel = new Date(2026, 6, 2).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const timerBar = (
    <TimerBar
      running={timer.running}
      elapsedSeconds={elapsedSeconds}
      description={timer.description}
      code={timerCode}
      activity={timer.activity}
      suggestions={suggestions}
      onDescriptionChange={(v) => setTimer((t) => ({ ...t, description: v }))}
      onStart={startTimer}
      onStop={stopTimer}
      onCancel={cancelTimer}
      onSwitchTask={() => setPicker({ target: 'timer' })}
      onPickSuggestion={(s) => setTimer((t) => ({ ...t, codeId: s.codeId, activity: s.activity, description: s.description }))}
    />
  );

  return (
    <AppShell route={route} onNavigate={setRoute} timer={timerBar}>
      {route === 'tracker' && (
        <TrackerScreen
          dateLabel={dateLabel}
          totalLabel={formatDuration(dayTotal)}
          entries={sortedToday}
          codesById={CODES_BY_ID}
          onEditEntry={(id, patch) => setEntries((es) => es.map((e) => e.id === id ? { ...e, ...patch } : e))}
          onCategorizeEntry={(id) => setPicker({ target: id })}
          onResumeEntry={resumeEntry}
          onDeleteEntry={(id) => setEntries((es) => es.filter((e) => e.id !== id))}
        />
      )}
      {route === 'fortnight' && (
        <FortnightScreen
          period={period}
          periodLabel={period === 'first' ? '1 – 15 July 2026' : '16 – 31 July 2026'}
          days={days}
          rows={rows}
          onPeriodChange={setPeriod}
          onEditCell={editCell}
        />
      )}
      {route === 'checklist' && (
        <ChecklistScreen
          days={days}
          rows={rows}
          checked={checked}
          onChange={setChecked}
          onReset={() => setChecked({})}
        />
      )}
      {route === 'codes' && <CodeCatalogScreen codes={CODES} />}
      {route === 'settings' && (
        <SettingsScreen workRhythm="Mon – Fri" partTime="None"
          absences={[{ date: 'Tue 14 Jul', reason: 'Annual leave' }]} />
      )}

      {picker && (
        <CodePicker
          title={picker.target === 'timer' ? 'Switch task' : 'Categorize entry'}
          codes={CODES}
          onPick={(codeId, activity) => {
            if (picker.target === 'timer') pickForTimer(codeId, activity);
            else setEntries((es) => es.map((e) => e.id === picker.target ? { ...e, codeId, activity } : e));
            setPicker(null);
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </AppShell>
  );
}
~~~

---

## Notes for the engineer

- **Dependencies:** none beyond your existing React 19 + Vite + TS. Fonts load via the `@import` in
  `walker.css` (Hanken Grotesk / JetBrains Mono / Zilla Slab) — self-host if you prefer no external
  requests.
- **Import order:** `tokens.css` before `walker.css` (see `App.tsx`).
- **Theming:** override `--wk-accent` (+ `--wk-accent-soft`, `--wk-accent-line`, `--wk-on-accent`) to
  re-skin; set `document.documentElement.dataset.density = 'compact'` for denser rows.
- **Presentational contract:** every component takes data via props and emits intent via callbacks.
  `App.tsx`'s in-memory store (entries, timer split-on-switch, fortnight aggregation, checklist range)
  is the reference behavior — replace it with your `/api` calls; the components don't change.
- **Assets:** logo/app-mark and favicon are inline SVG (a sheriff star — the western wink). To use a
  custom avatar, drop an image into the sidebar footer's `.wk-avatar` slot; kept as an original mark
  rather than a likeness.
- The three core screens (Tracker, Fortnight, Checklist) are fully interactive; Code catalog search and
  Settings are presentational as speced.

> Note: inside this Markdown the code blocks are fenced with `~~~` so the nested triple-backtick-free
> content stays intact. When saving each file, copy the block body verbatim.
