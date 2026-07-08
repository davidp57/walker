# Timesheet period becomes a per-user setting; "Fortnight" is genericized

Walker's period concept was hardcoded to the original semi-monthly scheme: `fortnight_bounds()`
(`services/fortnight.py`) always splits a month into 1st–15th and 16th–end, with no parameter. As part
of professionalizing Walker into a general-purpose, shareable app (the RELEASE-lot work), this needed
to become a choice, not a constant — and the name "Fortnight" needed to stop implying "always two
weeks."

## Considered Options

- **Fully custom cycles (rejected)**: let the user pick any N-day period length and an anchor date.
  Maximally flexible, but invites edge cases with no real-world need behind them (e.g. a 10-day cycle
  anchored on the 25th crossing month boundaries unpredictably) — more surface to test for a
  scenario nobody asked for.
- **Fixed presets — weekly, semi-monthly, monthly (chosen)**: covers the three period lengths actually
  used by corporate timesheet systems in practice. Semi-monthly with the existing 1st–15th/16th–end
  split remains one of the three choices (and the default), so today's behavior for existing users is
  unchanged.

## Consequences

- A new `period_scheme` setting (`weekly | semi_monthly | monthly`) on the user's `Settings`, read by
  the period-bounds computation instead of a hardcoded split.
- "Fortnight" is retired as the domain term in favor of **Timesheet period** (see `CONTEXT.md`); the
  semi-monthly scheme is what "Fortnight" used to mean unconditionally.
- Renaming reaches deep: `FortnightGrid`/`FortnightScreen` components, `/api/fortnight/*` routes,
  `fortnight_bounds()` and friends, and every UI string that said "Fortnight." This is a mechanical
  rename plus the new scheme parameter — not a rewrite of the aggregation logic itself, which stays a
  pure function of (period scheme, a date) → (start, end).
