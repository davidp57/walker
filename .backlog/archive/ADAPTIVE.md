# ADAPTIVE — Theme toggle + responsive phone layout (archived)

Status: ✅ done
Branch: fix/*, feature/* per ticket → PR → develop

## Summary

Fixes the dark theme's rendering defect, adds a real per-user dark/light/system theme (persisted on
`Settings`, defaulting to `prefers-color-scheme`), and makes Walker fully usable on a phone —
bottom tab bar, a day-card Timesheet period grid below a shared width breakpoint, and touch-capable
Timer/entry-editing/kanban drag-and-drop. Grilled from 3 raw ideas captured in `IDEAS.md`.

## Tickets

| ID | Title | Priority | Status |
| --- | --- | --- | --- |
| TEC-006 | Fix the dark-mode rendering defect around the app's own surfaces | P2 | ✅ done |
| BIZ-031 | Theme preference: schema + API | P2 | ✅ done |
| BIZ-032 | Theme toggle: light palette + Settings UI (HITL) | P2 | ✅ done |
| BIZ-033 | Responsive: bottom tab bar on phone-sized screens | P2 | ✅ done |
| BIZ-034 | Responsive: Timesheet period grid reflows to day cards on phone | P2 | ✅ done |
| BIZ-035 | Responsive: touch-capable Timer, entry editing, and kanban drag-and-drop | P2 | ✅ done |

## Verified against

- Backend and frontend quality gates green on every merged PR; 244 frontend tests / 219 backend
  tests passing at lot completion.
- All 5 AFK tickets ran in parallel background agents; BIZ-032 (HITL) held for an explicit visual
  review of the light palette (screenshots of Activity and Settings in light mode) before merging.
- A live browser-preview pass (not just automated tests) confirmed, after all 6 tickets merged: the
  dark-mode background/`color-scheme` fix, the light theme actually switching via Settings and
  persisting, the bottom tab bar replacing the sidebar and navigating correctly at phone-portrait
  width, the Timesheet period grid switching between day cards (portrait) and the table (landscape/
  desktop) at the shared breakpoint, and the kanban board's `touch-action` CSS being correctly
  scoped (cards non-scrollable during drag, columns still touch-scrollable).
- Two real bugs were caught and fixed during this pass, both environmental rather than app defects:
  a stale local dev server serving pre-merge code (fixed by restarting it) and a local SQLite dev
  database missing BIZ-031's migration (fixed with `alembic upgrade head` — Docker/`.exe` deployments
  auto-migrate on boot, but the raw `uvicorn --reload` dev flow does not).
- BIZ-033 and BIZ-034 were implemented independently, in parallel, and both needed the same
  `--wk-bp-phone: 640px` breakpoint token — landing in that order produced one real (trivial, purely
  cosmetic) merge conflict on `tokens.css`, resolved by keeping one definition.
- A pre-existing shared-checkout mistake was caught and corrected mid-lot: two agents (TEC-006,
  BIZ-031) were initially launched without worktree isolation and began racing in the same working
  directory; the non-progressing one was stopped and relaunched isolated, the other (already making
  correct, isolated-in-effect progress) was left to finish undisturbed. All agents after that point
  used `isolation: "worktree"`.

## Key implementation notes

- The dark-mode fix (TEC-006) and the theme toggle (BIZ-032) deliberately share one mechanism: TEC-006
  hardcodes `html, body { color-scheme: dark; background: var(--wk-bg-0); }`; BIZ-032 only had to
  make that dynamic (`html[data-theme="light"]` override) rather than build it from scratch.
- Theme preference follows the exact shape already established by `period_scheme`: a `Literal`-typed
  string column on `Settings`, an optional field on the update schema (omitted = unchanged), and a
  pure resolution function (`resolve_theme` server-side, mirrored as `resolveTheme` client-side) with
  no I/O — `"system"` defers to `prefers-color-scheme`; `"dark"`/`"light"` always win outright.
- The light palette keeps the same font tokens and the same blue accent hue family as dark (adjusted
  for WCAG AA on light backgrounds) — a deliberate identity-preservation call made during the
  grilling session, not a generic/default light theme.
- Both responsive tickets (BIZ-033 nav, BIZ-034 period grid) render both markup variants
  unconditionally and let a single `@media (max-width: 640px)` breakpoint (`--wk-bp-phone` token)
  decide which is visible — no JS-based breakpoint state, no orientation detection. A phone in
  landscape is comfortably wider than the breakpoint, so one width query naturally covers both
  orientations.
- BIZ-035 needed no source code changes at all: BIZ-026's kanban drag-and-drop already had correctly
  scoped `touch-action: none`, and `.wk-modal`'s existing `max-width: 92vw` already kept every named
  dialog on-screen on a phone viewport. Its only real output was a separate, out-of-scope bug found
  along the way — `CellEntriesModal` (not one of the three ticket-named dialogs) overrides the
  standard modal width and does overflow on a phone screen — flagged as its own follow-up rather than
  fixed inline.
