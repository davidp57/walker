# BIZ-032 — Theme toggle: light palette + Settings UI (HITL)

ID: BIZ-032
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot ADAPTIVE — `.backlog/ADAPTIVE/PRD.md`.

## What to build

Wire the theme preference (BIZ-031) into the SPA end-to-end: a User can pick Dark / Light / System
in Settings, and the app actually renders in the resolved theme.

- On load (and whenever the preference or the OS's `prefers-color-scheme` changes), compute the
  resolved theme via the same logic as `resolve_theme` (read via `matchMedia('(prefers-color-scheme:
  dark)')` for the "system" case) and set `document.documentElement.dataset.theme` — the same
  existing pattern `App.tsx` already uses for `document.documentElement.dataset.density`.
- Add a `:root[data-theme="light"] { ... }` block to `tokens.css` overriding every color token with
  a light equivalent. Keep the same font tokens (`--wk-font-ui`, `--wk-font-display`,
  `--wk-font-mono`) and the same accent hue family as the existing dark palette — only
  surface/text/border tokens actually change value. The dark palette (today's `:root` values) does
  not change.
- Make TEC-006's `html`/`body` `color-scheme`/background dynamic, driven by the resolved theme,
  instead of hardcoded to dark.
- Add a Dark / Light / System control to the Settings screen, next to the existing
  density/period-scheme controls, calling `PUT /api/settings` with the chosen `theme`.

**HITL**: this ticket produces new visual design (the light palette's actual color values) —
flag it for a quick human look (screenshot or live preview) before merging, unlike the rest of
this lot's mechanical wiring.

## Acceptance criteria

- [ ] Settings has a Dark / Light / System control; changing it persists via `PUT /api/settings`
      and is reflected immediately (no reload).
- [ ] A User who has never touched the setting sees Walker match their OS's light/dark preference
      on load.
- [ ] Switching the OS preference while `"system"` is selected updates the rendered theme live,
      without a reload.
- [ ] The light theme reads as the same product as the dark theme — same fonts, same accent hue —
      not a generic/default light palette.
- [ ] No flash of the wrong theme is visible on page load.

## Blocked by

- TEC-006 (reuses its `color-scheme`/background mechanism, made dynamic here)
- BIZ-031 (needs the persisted `theme` field to exist)
