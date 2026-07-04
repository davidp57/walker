# CHR-004 — Remove PwC branding; optional User display name

ID: CHR-004
Status: ⬜ ready
Type: chore
Priority: P3

## Parent

Lot SHIP — `.backlog/SHIP/PRD.md`.

## What to build

Remove the hardcoded "PwC" branding from the app (shell footer's "PwC · Advisory" line, seed data, any
remaining doc references) and stop hardcoding "Consultant" as a role. Add an optional `name` field on
`User`; the shell footer shows `name` if set, falling back to `username` otherwise. No role/organization
line is shown at all — the account is just a username and, optionally, a person's name.

## Acceptance criteria

- [ ] No "PwC" string remains in the app's UI, seed data, or docs.
- [ ] `User` gains an optional `name` column (nullable, no default value required at account creation).
- [ ] The shell footer shows `name` when set, `username` otherwise — no hardcoded role or employer text.
- [ ] Backend tests: creating a `User` without a `name` still works; the API surfaces `name` when set.
- [ ] Frontend tests: the footer renders the display name, and falls back to username when absent.

## Blocked by

None — can start immediately.
