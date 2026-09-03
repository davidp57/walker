# BIZ-093 — Switch blocks on the Timer bar

ID: BIZ-093
Status: ✅ done
Type: feature
Priority: P2

## Parent

Lot SWITCH — `.backlog/SWITCH/PRD.md`. See **ADR-0016** for the composition rules and the trade-offs
they cost.

## Problem

Switching tasks is the app's most frequent gesture and costs a Stop plus a modal plus a search. The
destination is nearly always one of a handful of codes, and Walker already knows which ones — it just
never offers them outside the picker.

## Solution

**Backend**

- `services/switch_targets.py` — composes `likely_codes` (selection) with a recency fill, collapses
  pairs to codes, excludes the running code, sorts by code name. Web-independent.
- `GET /api/codes/switch-targets?at=…&limit=…&exclude=…` → `SwitchTargetRead[]`
  (`code_id`, `number`, `name`, `color`, `activity`, `activities`). `limit ≥ 1`: a disabled band
  means the SPA does not call, exactly as for `/codes/likely`.
- `switch_count` view preference: default **4**, range **0–10**, `0` removes the band. Separate from
  `likely_count` — a vertical list in a modal and a horizontal row on the Timer bar cannot share one
  number, and each needs its own off switch.

**Frontend**

- `SwitchBlocks` — colour dot + code name only; the activity menu opens on hover *and* on keyboard
  focus, so a multi-activity block is usable without a mouse.
- `lib/switchLayout.ts` — pure `planSwitchLayout()`: how many blocks fit, and whether the description
  field must take a line of its own. The Timer bar measures itself (`ResizeObserver`) and feeds it.
- Layout priority: the Timer chip / clock / buttons never yield, blocks yield next (the preference is
  a cap), the description field yields **first** by moving to its own row. `.wk-timerbar` therefore
  becomes `min-height` rather than a fixed height.
- Clicking a block reuses `shouldRetagInPlace` + `switchTimer`; a typed-but-unsaved description is
  saved onto the closing segment first, as Stop does.
- A Settings control beside "Likely codes", with the same "✓ Saved" feedback.

## Acceptance criteria

- [x] A block is a code; two activities of one code produce one block, not two.
- [x] The band is sorted by code name and does not reorder as the hour changes.
- [x] The band is topped up by recency when the habit threshold leaves it short, and is empty only
      when the user has no usable history at all.
- [x] Retired, backing-only and uncategorized history never surface as blocks.
- [x] The running code has no block.
- [x] A plain click starts the ranked activity; the hover/focus menu offers the others.
- [x] Switching off a capture stub re-tags in place; switching off real work closes it and opens a new
      segment, keeping a typed description on the closed one.
- [x] `switch_count` defaults to 4, persists per user, `0` renders no band and fires no request.
- [x] A narrow window drops blocks before it squeezes the description field, then stacks the field.
- [x] Quality gate clean both sides.

## Blocked by

Nothing — builds on BIZ-083 (shipped).

## Delivery

Shipped in [PR #167](https://github.com/davidp57/walker/pull/167) → `develop`.
