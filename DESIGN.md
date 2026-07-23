---
name: Walker
description: A dark, dense precision instrument for tracking real time against real charge codes — a felt-lined ledger with a quiet Texas wink.
colors:
  canvas: "#0e0f13"
  panel: "#15171d"
  raised: "#1b1e26"
  hover: "#232733"
  line: "#282c36"
  line-soft: "#20242c"
  weekend: "#101217"
  text-hi: "#e9ebef"
  text: "#b7bdc8"
  text-mid: "#868d9b"
  text-lo: "#818897"
  frontier-sky: "#5b9cf6"
  on-accent: "#08131f"
  sunset-amber: "#e8a84b"
  cactus-green: "#3fb68b"
  danger: "#e5644e"
typography:
  display:
    fontFamily: "'Zilla Slab', Georgia, serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.3px"
  title:
    fontFamily: "'Zilla Slab', Georgia, serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "'Hanken Grotesk', system-ui, -apple-system, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "1px"
  data:
    fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace"
    fontSize: "27px"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "0.5px"
rounded:
  sm: "5px"
  md: "9px"
  lg: "13px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "7": "30px"
  "8": "40px"
components:
  button-primary:
    backgroundColor: "{colors.frontier-sky}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.md}"
    padding: "11px 26px"
    typography: "{typography.body}"
  button-ghost:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text-mid}"
    rounded: "{rounded.md}"
    padding: "8px 14px"
  button-danger:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: "11px 26px"
  input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text-hi}"
    rounded: "{rounded.md}"
    padding: "10px 13px"
    typography: "{typography.body}"
  chip:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
    typography: "{typography.label}"
  card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "16px 18px"
  nav-item:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text-mid}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  pill-uncategorized:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.sunset-amber}"
    rounded: "{rounded.pill}"
    padding: "4px 11px"
    typography: "{typography.label}"
---

# Design System: Walker

## Overview

**Creative North Star: "The Texas Ledger"**

Walker is a dark, dense precision instrument for recording real work time against real charge codes.
The whole surface reads like a well-kept ledger seen under low console light: rows of tabular
monospace numerals, thin ruled lines, entries ticked off one at a time. The name earns a quiet
western wink — a five-point **star badge**, a **Zilla Slab** slab-serif for titles, microcopy like
"Adios, backlog." — which is a deliberate homage to *Texas*, an earlier in-house timesheet tool this
one supersedes. The wink is affectionate, never a costume: it lives in the badge, the display type,
and empty states, and it stops there so nothing dents the data density.

The mood is **precise and quiet**. This is a working instrument, not a landing page: information first,
zero decorative noise, and character that lives in the exactness of the details rather than in
ornament. Where it softens — and it does — it softens gently: muted, desaturated color (no pure black,
no pure white), translucent state tints instead of hard highlights, and generously rounded containers.
Think a **felt-lined** ledger, not a steel cockpit. Depth is carried mostly by tonal surface layering,
with soft ambient shadows allowed to lift resting cards and panels a touch.

Every number the user reads or edits — durations, clock times, totals, the running stopwatch — is set
in monospace with tabular figures, so columns align and digits never jitter as they tick. This is the
single most defining trait of the system: **the data speaks in monospace; the interface speaks in
sans**.

**Key Characteristics:**
- Dark-first (with a fully maintained light theme), muted and desaturated — never pure black or white.
- Monospace tabular numerals for all time/duration/quantitative data; sans-serif for UI; slab-serif for titles.
- Dense data-grid readability over expressive flourish; the layout mirrors the target Timesheet system's grid.
- A quiet Texas/western wink confined to the badge, display type, and copy.
- Semantic color is functional and rationed: amber = needs attention, green = done, blue = live/active.

## Colors

A muted, low-glare dark palette built from four cool near-black surface tones, a soft cool-grey text
ramp, one cornflower-blue brand accent, and a rationed amber/green/red semantic set. Colors are
desaturated on purpose so long grid sessions stay comfortable; the code catalog's own 64-color swatch
palette (see Named Rules) is the one place saturated hue is allowed.

### Primary
- **Frontier Sky** (`#5b9cf6` dark / `#2f6fe0` light): The single brand accent. Marks anything *live or
  active* — the running timer clock and pulse dot, focused inputs, active nav, links, the grand total,
  selected segmented-control options, and drop targets. Used as a solid fill for the primary button
  (`on-accent #08131f` text) and, far more often, as a translucent wash (`accent-soft`, ~14% alpha) and
  hairline (`accent-line`, ~42% alpha) for hovers, selection, and quiet emphasis.

### Secondary (semantic, not decorative)
- **Sunset Amber** (`#e8a84b` dark / `#8f5710` light): The "needs you" color. Flags uncategorized
  entries, the coded-but-no-activity marker, the sidebar attention badge, and off-matrix uncategorized
  totals. Appears solid on pills and as a ~13% soft wash on flagged rows.
- **Cactus Green** (`#3fb68b` dark / `#0f7050` light): The "done" color. Marks a Timesheet entry keyed
  into the Timesheet system — ticked checklist cells, the checklist progress bar, the copy-code
  confirmation, done-status pills and the collapsed Done kanban lane.
- **Danger Red** (`#e5644e` dark / `#b8341f` light): Destructive actions, overlap warnings on entry
  rows, and overdue/high-priority task markers. Never used for mere emphasis.

### Neutral
- **Canvas** (`#0e0f13`): The app background — the deepest surface, nearly black but cool.
- **Panel** (`#15171d`): Cards, sidebar, timer bar, grid body, modals — the primary content surface.
- **Raised** (`#1b1e26`): Chips, headers, totals, segmented controls — one step up from panel.
- **Hover** (`#232733`): Hover/active nav and inline hover targets — the top tonal step.
- **Weekend** (`#101217`): Greyed-out weekend columns in the grid, a hair below canvas.
- **Line** (`#282c36`) / **Line-soft** (`#20242c`): Structural borders vs. internal row dividers.
- **Text ramp** — **Text-hi** (`#e9ebef`, headings/values), **Text** (`#b7bdc8`, body),
  **Text-mid** (`#868d9b`, secondary), **Text-lo** (`#818897`, meta/labels; floored to hold WCAG AA
  ≥4.5:1 on every surface it lands on — enforced by `contrast.test.ts`).

### Named Rules
**The Two-Theme-One-Hue Rule.** Dark and light themes share the same fonts and the same accent *hue
family*; only surface/text/border tokens invert. The accent is darkened for AA on light
(`#2f6fe0`), never re-hued. Never introduce a token that exists in one theme but not the other.

**The Rationed Semantic Rule.** Amber, green, and red are meanings, not decoration. Amber only ever
says "needs categorizing/attention," green only ever says "entered/done," red only ever says
"destructive/error." If a color would be decorative, use a neutral surface instead.

**The Catalog-Palette Exception.** Saturated color belongs to exactly one place: the 64-swatch code
palette (`palette.ts`) that users assign to Timesheet codes for at-a-glance identity in the grid.
Chrome stays muted; only user-owned code dots carry vivid hue.

## Typography

**Display Font:** Zilla Slab (with Georgia, serif) — the western/Texas wink, weights 500–700.
**Body / UI Font:** Hanken Grotesk (with system-ui, -apple-system, sans-serif), weights 400–700.
**Data / Mono Font:** JetBrains Mono (with ui-monospace, SF Mono, Menlo), weights 400–600.

**Character:** A three-voice system. The slab-serif gives titles a touch of frontier warmth; the
grotesk keeps the working UI clean and modern; the monospace turns every number into an aligned,
instrument-panel readout. The pairing is what makes Walker feel like a *ledger*, not a generic SaaS app.

### Hierarchy
- **Display** (Zilla Slab, 600, 24px): Screen titles. The brand wordmark is a heavier cut (700, 22px).
- **Title** (Zilla Slab, 600, 17px): Modal and panel titles.
- **Body** (Hanken Grotesk, 400, 14px): The UI base — labels, descriptions, task titles, settings.
- **Label** (JetBrains Mono, 500, 11px, uppercase, ~1px tracking): Column headers, totals labels,
  meta lines, section eyebrows. Floored at 11px for legibility — never smaller for functional text.
- **Data** (JetBrains Mono, 500, 27px, tabular): The signature readout — the running stopwatch and
  day-total value. The same mono at 12–13px carries every inline duration, clock time, and cell value.

### Named Rules
**The Monospace-Data Rule.** Every quantitative or time value — durations, clock times, `HHMM`
military-time inputs, totals, counts, code numbers — is set in JetBrains Mono with
`font-variant-numeric: tabular-nums`. Prose and labels never borrow the mono; data never borrows the
sans. This one split is the backbone of the whole look.

**The Slab-For-Identity Rule.** Zilla Slab appears only on identity and titling (wordmark, screen
titles, modal titles, empty-state headlines). It never sets body copy or data.

## Layout

A fixed **app shell**: a 238px left sidebar (brand → nav → user footer) beside a main column that
holds the persistent 76px timer bar above a single scrolling outlet. The shell is `100vh` with
`overflow: hidden`; only the outlet scrolls, so the timer bar and nav never leave.

Screens use a `26px 30px` padding frame (`.wk-screen`), optionally capped at 820px for narrow,
form-like screens (Settings). Spacing is a **4px base scale** (4/8/12/16/20/24/30/40). Rhythm is tight
and consistent — this is a dense tool, not an airy marketing page.

The **grid** (Timesheet period view + checklist) is the centerpiece: a fixed-layout table with a
sticky left row-header column (260px) and sticky day headers, `min-width: 940px`, horizontally
scrollable. Row and cell heights are tokenized (`--wk-row-h` 44px, `--wk-cell-h` 34px) and shrink
under a `compact` density mode (36px / 28px).

**Responsive** (desktop-first; mobile is a bonus). One breakpoint at **640px** (`--wk-bp-phone`): below
it the sidebar becomes a bottom tab bar, and the grid table reflows into one stacked **day-card** per
day (same aggregated data, different representation). Above it, including phones in landscape, the full
table holds.

## Elevation & Depth

**Subtly lifted, tonal-first.** Depth is read primarily through the four-step surface ramp
(canvas → panel → raised → hover): higher surfaces are lighter. On top of that, soft ambient shadows
are permitted to lift resting cards and panels a touch, and are required for anything that genuinely
floats. The system avoids hard, high-contrast drop shadows — shadows are diffuse and low-opacity, in
keeping with the muted palette.

### Shadow Vocabulary
- **Ambient** (`0 2px 8px rgba(0,0,0,0.28)`): Gentle rest-state lift for cards, chips, and small
  raised elements. The everyday shadow.
- **Floating** (`0 18px 44px rgba(0,0,0,0.5)`): Dropdowns, suggestion popovers, toasts, right-hand
  task drawer — things detached from the document flow.
- **Modal** (`0 24px 60px rgba(0,0,0,0.55)`): Centered dialogs (code picker, entry editor) over the
  62%-black scrim. The deepest layer.

(Light theme uses the same three roles at much lower opacity — 0.08 / 0.16 / 0.22 — since there is no
dark backdrop to separate against.)

### Named Rules
**The Live-Ring Rule.** The one non-shadow "glow" in the system is the accent focus ring on the running
timer: a solid `2px` accent outline with offset, plus the pulsing accent halo
(`box-shadow: 0 0 0 4px accent-soft`) on the live dot. Reserve halos for *live* state; do not use them
decoratively.

## Shapes

Rounded and calm. A four-step radius scale — **sm 5px** (inline inputs, small controls),
**md 9px** (buttons, nav items, fields, most controls), **lg 13px** (cards, lists, the grid wrapper,
modals lean slightly larger at 12–15px), and **pill 999px** (status/attention pills, chips, badges).
Circles (`50%`) are reserved for the star badge, the avatar, and the timer/live dots.

Borders are a defining element: **hairline 1px** lines everywhere, in `line` (structural) or
`line-soft` (internal dividers). Selection and hover states swap the border to a translucent
`accent-line` rather than thickening it. Dashed 1px borders mark *provisional* affordances — empty
states, the "add kanban column" target. Absence days get a signature **45° hatched fill** rather than a
flat tone.

## Components

Buttons, cards, and fields lean **soft and muted**: moderate radii, hairline borders, and translucent
tint changes on interaction rather than hard color jumps.

### Buttons
- **Shape:** Rounded (md, 9px), bold label, `0.2px` tracking.
- **Primary:** Solid Frontier Sky fill, `on-accent` (`#08131f`) text, `11px 26px`. Hover brightens the
  fill (`filter: brightness(1.08)`) — no color swap.
- **Ghost:** Raised surface, `line` border, `text-mid`, smaller (`8px 14px`, 12px). Hover lifts the
  border and text toward `text-hi`.
- **Danger:** Transparent with a `danger` border and text; hover fills with ~12% red wash.
- **Icon:** Transparent, `line` border, square-ish (`10px 13px`); hover turns danger-red for
  destructive icons, accent for neutral row actions.

### Chips & Pills
- **Activity / catalog chips:** Raised surface, `line-soft` border, pill radius (16px), mono 11–12px.
  Hover tints with `accent-soft` and an accent border.
- **Attention pill (uncategorized):** `amber-soft` fill, `amber-line` border, Sunset Amber text — the
  "+ add code/activity" call to finish an entry.
- **Status pill:** Pill outline, mono 11px; neutral by default, `accent-soft` for in-progress,
  `green-soft` for done.

### Cards / Containers
- **Corner:** lg (13px); catalog/settings cards and modals sit at 12–15px.
- **Background:** Panel (`#15171d`) on canvas; raised (`#1b1e26`) for headers and totals.
- **Shadow:** Ambient at rest (see Elevation); floating/modal when detached.
- **Border:** Hairline `line`.
- **Padding:** 16–18px for cards; grid cells are tight (`0 2px`, tokenized height).

### Inputs / Fields
- **Style:** Canvas (`#0e0f13`) fill, `line` border, md radius, `text-hi`. Inline grid/time inputs
  drop to sm radius and use a live **accent** border to signal edit mode.
- **Focus:** Border shifts to accent (`accent` or `accent-line`); no glow except the live-timer ring.
- **Military time:** Time fields accept `1345`→`13:45`; always mono, tabular.

### Navigation
- **Sidebar item:** Body-weight 13px, `text-mid`, md radius, 10–12px padding. Hover → raised surface +
  `text-hi`; active → hover surface + semibold + `text-hi`. An amber count badge can pin right.
- **Bottom tab bar (≤640px):** Same five sections; active item turns accent (color, not fill).

### Signature: The Timer Bar & Live Row
The always-visible 76px timer bar is the product's heartbeat: a live/idle dot (accent + pulsing halo
when running), a large mono stopwatch (27px, accent when running), a borderless comment input, and the
one-click start. When running, the timer also renders as a read-only accent-tinted row in the entry
list and as a pulsing "live" cell in the grid — the same running state, three synchronized surfaces.

### Signature: The Timesheet Grid
A 1:1 visual mirror of the external Timesheet system's "BY CODE" grid: sticky code rows × day columns,
weekends hatched-grey, absences hatched, per-cell durations in mono, row/column/grand totals in raised
surfaces, and an in-cell green **tick checkbox** (visible at rest) for the aviation-style "entered into
the Timesheet system" checklist.

## Do's and Don'ts

### Do:
- **Do** set every duration, clock time, total, count, and code number in JetBrains Mono with
  `font-variant-numeric: tabular-nums`. Data is monospace; UI is sans.
- **Do** build depth from the surface ramp (canvas → panel → raised → hover) first; add an ambient
  shadow only for a gentle rest-state lift, and a floating/modal shadow only for things that detach.
- **Do** signal interaction with translucent accent tints (`accent-soft` fill, `accent-line` border),
  not hard color swaps or thickened borders.
- **Do** keep amber/green/red strictly semantic (needs-attention / done / destructive).
- **Do** define any new color token in *both* dark and light themes, same hue family.
- **Do** floor functional text at 11px and keep `text-lo` only on surfaces where it clears WCAG AA.

### Don't:
- **Don't** use pure black (`#000`) or pure white (`#fff`); the palette is muted and cool by design.
- **Don't** let the Texas/western wink grow past the badge, display type, and microcopy — no full
  western skin, textures, or ornament that would cost data density.
- **Don't** spend saturated color on chrome; vivid hue is reserved for user-assigned code swatches.
- **Don't** draw progress bars or gauges that enforce an 8h/day or period target — Walker shows real,
  to-the-minute durations and never editorializes totals (the checklist progress bar, which counts
  *entered* lines, is the one allowed progress meter).
- **Don't** introduce a third numeric typeface or set data in the sans; don't set body copy in the slab.
