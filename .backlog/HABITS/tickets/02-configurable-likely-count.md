# BIZ-084 — Configurable number of likely codes (0 disables)

ID: BIZ-084
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot HABITS — `.backlog/HABITS/PRD.md`. See **ADR-0015** for why this is the *only* user-facing knob of
the feature.

## Problem

BIZ-083 ships the band with a hardcoded cap of 5 rows. Five is a guess: the band sits above a list that
already contains the same codes, so its cost is vertical space, and the right trade-off is only knowable
after living with it. There is also no way to turn the band off if the ranking turns out to be noise.

The model's own constants (σ, weekday weight, window, threshold) stay hardcoded on purpose — they are
internals whose effect a user cannot observe, so exposing them would only invite endless fiddling. The
row count is the opposite: directly visible, immediately evaluable, and `0` doubles as the off switch,
which avoids adding a second toggle.

## Solution

- `likely_count` added to the view preferences JSON bag: default **5**, clamped to **0–10**, `0` = band
  disabled (`services/settings.py` — `_DEFAULT_VIEW_PREFERENCES`, plus a **clamped-int** branch in
  `_resolve_view_preferences`; it is the first integer preference, the existing ones being booleans and
  enums, so it needs its own handling rather than joining `_BOOL_VIEW_PREFERENCES`).
- `ViewPreferencesRead` / `ViewPreferencesUpdate` (`api/schemas.py`), the frontend `ViewPreferences`
  type and `DEFAULT_VIEW_PREFERENCES`.
- `CodePicker` takes the cap from the preference instead of the constant; `0` skips the fetch entirely
  (no request, no band).
- A control in the Settings screen, in the tracker/view section, labelled so that 0 reads as off (e.g.
  "Likely codes shown in the picker — 0 to hide the band"), following the existing pattern for
  `enter_rounding` (BIZ-063) including the "✓ Saved" feedback (BIZ-082).

## Acceptance criteria

- [ ] `likely_count` defaults to 5, survives a reload, and is persisted per user.
- [ ] Out-of-range or non-integer stored values fall back to the default (service test).
- [ ] `10` shows at most 10 rows; `0` renders no band **and fires no request**.
- [ ] The Settings control is accessible (labelled, focus ring) and flashes "✓ Saved" on change.
- [ ] Settings + picker tests updated; quality gate clean both sides.

## Blocked by

BIZ-083.
