# SWITCH — Switch blocks: one-click codes on the Timer bar (archived)

Status: ✅ done
Branch: feature/\* per ticket → PR → develop

## Summary

Changing what you're working on was the app's most frequent gesture and its most expensive one: Stop,
then the code picker (a modal), then a search through 200+ codes — for a destination that, most days,
is one of the same four projects. Those projects now sit on the Timer bar as **Switch blocks**, beside
the Timer chip: one block = one code (colour dot + name), one click switches onto it. A code with
several Activities offers them in a hover/focus menu; a plain click starts the ranked one.

The band is composed server-side and reshapes the ADR-0015 habit ranking for a surface that is
*clicked* rather than *read* (ADR-0016): the ranking **selects** which codes deserve a block, plain
recency **fills** the rest so the row is always full, pairs **collapse to codes**, the result is
sorted by **name** so positions never move as the hour does, and the **running code is excluded** —
it is already on the bar as the chip.

## Tickets

| ID | Title | Priority | Status |
| --- | --- | --- | --- |
| BIZ-093 | Switch blocks on the Timer bar | P2 | ✅ done |

## Verified against

- Backend: full suite green (497 tests, 96% coverage); `ruff` / `ruff format` / `mypy` clean.
- Frontend: full suite green (568 Vitest tests); `eslint` / `prettier --check` /
  `tsc --noEmit && vite build` clean.
- **Exercised in a live browser** against a throwaway seeded database: 4 blocks at ~2000px, stacked
  mode at 737px (bar grows to 110px, description on its own line), the running code excluded and
  replaced by the next candidate, the activity menu, and the switch itself writing two segments.

## Key implementation notes

- `services/switch_targets.py` — web-independent composition. Calls `likely_codes` for selection,
  then a grouped most-recent-first query for the fill, keeping the first activity seen per code as
  that block's default. Applies the picker's own exclusions throughout (no `backing_only`, no
  `obsolete`, no activity absent from the live catalog), so a block can never start a Timer on
  something the picker would refuse.
- `GET /api/codes/switch-targets?at=&limit=&exclude=` → `SwitchTargetRead[]`. `limit ≥ 1`, matching
  `/codes/likely`: a disabled band means the SPA does not call at all.
- `switch_count` view preference (default 4, 0–10, `0` removes the band), deliberately **separate**
  from `likely_count` — different geometry, and each needs its own off switch.
- `lib/switchLayout.ts` — pure `planSwitchLayout()`. The Timer bar measures itself with a
  `ResizeObserver` and feeds it; layout priority is chip/clock/buttons → blocks → description field,
  which yields first by dropping onto its own row. `.wk-timerbar` becomes `min-height`.
- Switching reuses `shouldRetagInPlace` + `switchTimer`, so a capture stub is re-tagged in place and
  real work is split — the same rule as resuming an entry or starting a Task.

## Bug found by verifying in a browser, not in tests

`resetDraft` clears the `descriptionTouched` flag, and the first implementation read that flag
*after* resetting it — so the answer was always "the user typed nothing" and a description typed on
the bar vanished with the segment it described. Only visible against a real backend, since the jsdom
suite cannot render the measured band. Fixed by reading the pending text first, with a regression
test in `App.test.tsx`.

## Known rough edge

The bar's untouchable tail grows from ~500px to ~750px once a Timer runs (the ✕, the break button and
Stop appear), so on a mid-width window the band can vanish exactly when you want to switch. Captured
in `IDEAS.md` rather than fixed here.
