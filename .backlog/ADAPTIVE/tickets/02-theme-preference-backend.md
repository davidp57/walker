# BIZ-031 — Theme preference: schema + API

ID: BIZ-031
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot ADAPTIVE — `.backlog/ADAPTIVE/PRD.md`.

## What to build

Add a per-user theme preference, persisted alongside the rest of `Settings` (same place as
`period_scheme`/`density`/`workdays`), so it follows a User across devices exactly like every other
Settings field already does.

`Settings` gains a `theme` column: `Literal["dark", "light", "system"]`, default `"system"`. A new
Alembic migration backfills existing rows to `"system"`. `SettingsRead` gains
`theme: Literal["dark", "light", "system"]`; `SettingsUpdate` gains
`theme: Literal["dark", "light", "system"] | None = None` (omitted on update means "don't change
it", same convention `period_scheme` already uses there).

Also add a pure function resolving a preference to an actual dark/light value:
`resolve_theme(preference, prefers_dark: bool) -> "dark" | "light"` — `"system"` defers to
`prefers_dark`; `"dark"`/`"light"` always win outright regardless of `prefers_dark`. No DOM/browser
access — this is a plain function over two inputs, matching the shape of
`services/period.py::period_bounds`.

This ticket has no UI yet (BIZ-032 is the frontend) — `theme` is exercised directly via
`GET`/`PUT /api/settings` and the service layer, ahead of anything calling it from a real toggle.

## Acceptance criteria

- [ ] `GET /api/settings` returns `theme`, defaulting to `"system"` for a User who has never set it.
- [ ] `PUT /api/settings` accepts an optional `theme` and persists it; omitting it leaves the
      stored value unchanged.
- [ ] A migration backfills every existing `Settings` row to `"system"` — no existing row is left
      without a value.
- [ ] `resolve_theme` is unit-tested against its full truth table: `system`+`prefers_dark=True` →
      `dark`; `system`+`prefers_dark=False` → `light`; `dark`+either → `dark`; `light`+either →
      `light`.
- [ ] Backend tests cover the `theme` get/update round-trip the same way existing tests cover
      `period_scheme`.

## Blocked by

None — can start immediately.
