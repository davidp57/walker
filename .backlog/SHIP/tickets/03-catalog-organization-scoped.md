# BIZ-030 — Real-code catalog becomes Organization-scoped

ID: BIZ-030
Status: ⬜ ready
Type: feature
Priority: P2

## Parent

Lot SHIP — `.backlog/SHIP/PRD.md`.

## What to build

Move **real** Timesheet codes (`real_code_id IS NULL`) from being scoped by `user_id` to being scoped
by `organization_id` (BIZ-028), so every member of an Organization sees and imputes against the same
catalog instead of each re-importing it. **Virtual** codes stay scoped to the `User` who created them —
personal classification, never shared. Entries and Tasks are untouched. The existing in-use delete
guard on a real code must check usage across the whole Organization, not just the acting User.

## Acceptance criteria

- [ ] Real Timesheet codes are scoped by `organization_id`; virtual codes remain scoped by `user_id`.
- [ ] Two Users in the same Organization see and can impute against the identical real-code catalog.
- [ ] A User's virtual codes, Entries, and Tasks are invisible to other members of their Organization.
- [ ] The real-code delete guard blocks deletion while **any** Organization member has an Entry or
      virtual code depending on it, not just the User attempting the delete.
- [ ] A migration re-points existing real codes at the Organization each affected User was migrated
      into (BIZ-028), preserving today's single-user behavior for standalone deployments.
- [ ] Backend tests: shared visibility across two Users in one Organization; isolation of
      virtual-code/Entry/Task data; the delete guard triggered by another member's data.

## Blocked by

BIZ-028.
