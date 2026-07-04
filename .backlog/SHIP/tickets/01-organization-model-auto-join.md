# BIZ-028 — Organization model + domain-based auto-join

ID: BIZ-028
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot SHIP — `.backlog/SHIP/PRD.md`.

## What to build

Introduce the **Organization** entity: a group of Users who will share one real-code catalog (the
sharing itself is BIZ-030; this ticket is the entity and how a User ends up in one). An Organization
is formed automatically — the first User signing in with a given email domain creates it, and any
later User with the same domain joins it. No invite flow, no roles. `User` gains an `email` field and
an `organization_id`. Existing single-user deployments migrate each User into an Organization of one,
so nothing breaks for a standalone install that's never touched by this lot's hosted-only features.

This ticket has no login UI yet (SSO is BIZ-029) — the auto-join logic is exercised directly via its
service function and the API, ahead of anything calling it from a real sign-in.

## Acceptance criteria

- [ ] A new `Organization` model exists (`id`, `email_domain` unique, timestamps).
- [ ] `User` gains `email` and `organization_id` columns/relationships.
- [ ] A pure/service-level function takes an email and returns the Organization it belongs to —
      creating one if the domain is new, reusing the existing one otherwise.
- [ ] A migration backfills every existing `User` into a new Organization of one (one Organization per
      existing user), so no existing data is orphaned.
- [ ] Backend tests: the find-or-create-by-domain logic (new domain creates, existing domain joins, two
      different domains never merge) + the migration's backfill behavior.

## Blocked by

None — can start immediately.
