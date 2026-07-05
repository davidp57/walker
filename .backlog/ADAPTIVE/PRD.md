# ADAPTIVE — Theme toggle + responsive phone layout

Status: ⬜ ready
Branch: fix/*, feature/* per ticket → PR → develop

## Parent

Grilled from `IDEAS.md`'s 3 captured UI ideas (dated 2026-07-05); no prior PRD.

## Problem Statement

Walker only renders correctly as a fixed-width, dark-only, desktop layout:

- The dark theme has a visible defect — a light-colored edge/panel shows around the app's own dark
  surfaces (scrollbars, native `<select>` dropdowns, any area outside the app's own painted
  background), because nothing tells the browser the page itself is dark.
- There is no light theme at all, and no way to choose one — Walker ignores whatever appearance the
  user's system is set to.
- The layout has a fixed 238px sidebar and no responsive breakpoints anywhere; on a phone-sized
  screen the sidebar alone consumes nearly the whole viewport, and the Timesheet period grid (up to
  ~31 day columns in the monthly scheme) is unusable. A time tracker is precisely the kind of app
  someone wants to start or stop a Timer from their phone, away from their desk — today that's not
  possible.

## Solution

1. Fix the dark-theme rendering defect on its own, first (small, independent of everything else).
2. Add a real dark/light theme: a per-user preference (`system` by default, following the OS's
   `prefers-color-scheme`; `dark`/`light` once explicitly chosen) persisted alongside the user's
   other Settings, so it follows them across devices exactly like `period_scheme`/`density` already
   do. The light palette carries Walker's existing visual identity (same fonts, same accent hue) —
   only surface/text contrast inverts.
3. Make the whole app usable on a phone, not just non-broken: a bottom tab bar replaces the sidebar
   nav below a width breakpoint, the Timesheet period grid reflows to a vertical per-day card list
   below that same breakpoint (a phone in landscape gets the existing scrollable table — one width
   breakpoint naturally covers both orientations), and the kanban board's drag-and-drop works by
   touch.

## User Stories

1. As a User, I want the dark theme's edges to actually look dark, so that the app doesn't look
   broken around its own surfaces.
2. As a User, I want Walker to open in light mode when my system is set to light mode, so that it
   matches the rest of my device without me having to configure anything.
3. As a User, I want to explicitly choose dark or light in Settings, so that I can override my
   system's appearance if I prefer something different for this app specifically.
4. As a User who signs in on more than one device (via SSO), I want my chosen theme to follow me,
   so that I don't have to re-pick it on every device.
5. As a User, I want the light theme to feel like the same app as the dark theme (same fonts, same
   accent color), so that switching themes doesn't feel like using a different product.
6. As a User on a phone, I want to see a bottom tab bar instead of the desktop sidebar, so that I
   can reach every section with my thumb.
7. As a User on a phone in portrait orientation, I want the Timesheet period grid to show as a
   stack of day cards instead of a cramped table, so that I can actually read my entries.
8. As a User on a phone turned to landscape, I want the Timesheet period grid to show as the normal
   scrollable table, so that I get the fuller view when there's room for it.
9. As a User on a phone, I want to start and stop the Timer, edit an entry, and drag a Task between
   kanban columns with my finger, so that the phone layout is actually usable day-to-day, not just
   readable.
10. As a User on a phone, I want dialogs (code editor, entry editor, task panel) to fit on screen
    without horizontal overflow, so that I can complete the same actions I can on desktop.
11. As a developer, I want the theme's `data-theme` attribute set before/alongside the app's first
    paint, so that there's no flash of the wrong theme on load.

## Implementation Decisions

### Theme toggle

- **Schema**: `Settings` gains a `theme` column, `Literal["dark", "light", "system"]`, default
  `"system"` — mirrors `period_scheme`'s existing string-column + `Literal`-type shape. A new
  Alembic migration backfills existing rows to `"system"`.
- **API**: `SettingsRead`/`SettingsUpdate` gain `theme: Literal["dark", "light", "system"]` (Read)
  and `theme: Literal["dark", "light", "system"] | None = None` (Update, optional like
  `period_scheme`'s update field — omitted means "don't change it").
- **Resolution to an actual rendered theme**: a pure function
  `resolve_theme(preference, prefers_dark: bool) -> "dark" | "light"` — `preference == "system"`
  defers to `prefers_dark` (from the browser's `matchMedia('(prefers-color-scheme: dark)')`);
  `"dark"`/`"light"` always win outright. Pure, no DOM access, unit-testable on its own (same shape
  as `services/period.py`'s `period_bounds`).
- **Applying it**: the SPA sets `document.documentElement.dataset.theme` to the resolved value in a
  `useEffect`, the same existing pattern `App.tsx` already uses for
  `document.documentElement.dataset.density`.
- **CSS**: `tokens.css`'s `:root` block stays the dark palette (today's values, unchanged — no
  regression risk for the default). A new `:root[data-theme="light"] { ... }` block overrides every
  token with a light equivalent, keeping the same font tokens (`--wk-font-ui`, `--wk-font-display`,
  `--wk-font-mono`) and the same accent hue family — only surface/text/border tokens actually
  change value.
- **Fix the underlying dark-mode rendering defect (ships first, independent ticket)**: set
  `color-scheme: dark` (or `light`, matching the resolved theme) and a matching `background` on
  `html`/`body`, not just `.wk-app` — this is also the mechanism the later theme toggle needs to
  make dynamic, so fixing it narrowly now doesn't get thrown away.

### Responsive phone layout

- **Breakpoint**: one width-based `@media` breakpoint (exact px value is an implementation detail
  the ticket resolves against real device widths, not a product decision) does double duty —
  narrow (phone portrait) gets the mobile layout, wide (phone landscape, tablet, desktop) gets
  today's layout. No JS-based orientation or user-agent detection.
- **Nav**: below the breakpoint, the sidebar (`.wk-sidebar`) is replaced by a fixed bottom tab bar
  showing the same 5 sections (Activity, Timesheet period, Tasks, Code catalog, Settings) driving
  the same `Route`/`onNavigate` contract `AppShell` already exposes — this is a CSS + markup change
  in `AppShell`, not a new routing concept.
- **Timesheet period grid**: below the breakpoint, `PeriodGrid` reflows to one card per day
  (code/activity/duration lines stacked vertically) instead of the Code × Activity × Day table;
  above it, today's table is unchanged. Both representations read from the same aggregated grid
  data — this is a rendering/layout change, not a data-shape change.
- **Modals**: already cap at `max-width: 92vw` (`.wk-modal`) — confirmed no change needed.
- **Kanban drag-and-drop**: already uses dnd-kit's `PointerSensor`, which natively covers touch
  pointers — no sensor/library change. Verify (and set, where missing) `touch-action: none` on the
  draggable Task cards so a drag gesture doesn't fight the browser's native scroll gesture.

## Testing Decisions

- **`resolve_theme`** (pure function): unit-tested directly for its 3×2 truth table
  (`system`/`dark`/`light` × `prefers_dark` true/false) — same seam and rigor as
  `services/period.py::period_bounds`'s tests.
- **Backend**: `services/settings.py` get/update round-trips the `theme` field the same way
  existing tests cover `period_scheme` (`tests/test_services_settings.py`,
  `tests/test_api_settings.py`).
- **Frontend `data-theme` application**: an `App.test.tsx` case asserting
  `document.documentElement.dataset.theme` is set correctly after mount, mirroring how `density`
  is presumably already covered — new prior art if not.
- **Responsive layout**: CSS/`@media`-only behavior is not meaningfully unit-testable in jsdom (no
  real layout engine, same reason this repo has never had automated tests for e.g. the desktop
  sidebar's fixed width). Verified manually via the browser preview at phone-portrait and
  phone-landscape viewport sizes (`preview_resize`), consistent with how visual/CSS-only work has
  been verified throughout this project (e.g. TEC-003's contrast fix combined automated
  contrast-ratio math tests with manual visual verification).
- **Kanban touch drag-and-drop**: manual verification on a real touch-capable browser viewport
  (dnd-kit's own sensor behavior isn't something this repo re-tests; existing kanban tests already
  drive its keyboard-sensor path per the TASKS lot's precedent).

## Out of Scope

- Redesigning the color palette itself beyond deriving a light equivalent of the existing dark one
  — no new accent colors, no rebrand.
- A tablet-specific (as opposed to phone-specific) layout — the responsive work targets the
  phone-portrait/phone-landscape split; anything wide enough to comfortably fit the sidebar keeps
  today's desktop layout unchanged.
- Native mobile app / PWA installability — this is a responsive web layout, not an installable app
  shell.
- Per-Organization or per-device theme (theme is a per-User Settings field, same scope as every
  other Settings field).

## Further Notes

- The dark-mode rendering defect (ships as its own first ticket) and the theme toggle share a
  mechanism (`color-scheme` + `html`/`body` background driven by the resolved theme) — the first
  ticket's fix should be written so the second ticket only has to make the value dynamic, not
  rebuild it.
- No ADR: confirmed during grilling that none of this is a hard-to-reverse, surprising architectural
  trade-off — it's routine additive UI work layered on the existing Settings/tokens.css patterns.
- No `CONTEXT.md` changes: no new business/domain vocabulary, purely UI/technical concepts.
