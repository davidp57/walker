# TEC-006 — Fix the dark-mode rendering defect around the app's own surfaces

ID: TEC-006
Status: ⬜ ready
Type: technical
Priority: P2

## Parent

Lot ADAPTIVE — `.backlog/ADAPTIVE/PRD.md`.

## What to build

The dark theme's background is only ever painted on `.wk-app`, never on `html`/`body`, and nothing
sets `color-scheme`. Anything outside `.wk-app`'s own painted area — native scrollbars, native
`<select>` dropdowns, any edge the app's container doesn't perfectly cover — renders with the
browser's default light appearance, showing as a visible light-colored edge/panel around Walker's
dark surfaces.

Set `color-scheme: dark` and a matching `background` on `html`/`body` (today's dark palette
values — this ticket does not introduce a light theme). Write this so a later ticket (BIZ-032, the
theme toggle) only has to make the value dynamic based on the resolved theme, not rebuild the
mechanism from scratch.

## Acceptance criteria

- [ ] No light-colored edge/panel is visible around any of the app's surfaces at any viewport size.
- [ ] Native browser UI influenced by `color-scheme` (scrollbars, `<select>` dropdowns, form
      control chrome) renders dark, not light.
- [ ] No visual regression to any existing screen — this is additive (`html`/`body` background +
      `color-scheme`), not a change to any existing token value.

## Blocked by

None — can start immediately.
