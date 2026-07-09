# Organization-scoped code catalog, SSO for the hosted instance only

> **Revisited by ADR-0012 (deferred):** the catalog-scoping decision below (activated real codes
> Organization-scoped) is superseded — when a hosted multi-user instance is actually built — by
> reference-per-Organization + activated-codes-per-User. It remains in force until then. The
> Organization/SSO/auto-join parts of this ADR stand.

The RELEASE-lot plan to share one hosted Walker instance among colleagues raised two questions ADR-0007
left for "a later layer": how users authenticate, and whether data stays fully per-user once several
real people share an instance.

**SSO (Google / Apple / Microsoft)** authenticates the hosted, multi-tenant instance only. The
standalone Docker image and `.exe` — both meant to run locally, single-user, with zero external
dependency — keep ADR-0007's implicit-user, no-login behavior unchanged. OAuth needs internet
connectivity and a pre-registered redirect URI per provider; baking that into a binary anyone downloads
and runs locally would either leak shared credentials or force each user to register their own OAuth
app, defeating the "autonomous" point of those two distribution targets.

**Organization** is a new entity above `User`, formed automatically: the first person to sign in with a
given email domain creates it, anyone signing in with the same domain joins it. No invite flow, no
roles — deliberately minimal for a handful of colleagues, not a public SaaS.

**Only the real-code catalog is Organization-scoped.** `TimesheetCode` rows with `real_code_id IS NULL`
move from `user_id` to `organization_id`, so colleagues import and impute against one shared catalog
instead of each re-importing the same export. Virtual codes, Entries, and Tasks stay scoped to the
`User` exactly as today — they're personal classification and personal tracking, not organizational
data; sharing them was never asked for and isn't implied by sharing a catalog.

## Considered Options

- **Per-user catalog even when hosted (rejected)**: no new entity, but colleagues on the same
  Timesheet system redundantly import an identical catalog, and the CSV-import UX doesn't reflect that
  they're the same company.
- **Explicit Organization creation + invite flow (rejected for now)**: more control over membership,
  but a real chunk of product surface (invites, pending state, roles for who can edit the shared
  catalog) for a need — a handful of colleagues on the same email domain — that auto-join already
  covers.
- **SSO everywhere, including Docker/`.exe` (rejected)**: keeps one auth code path, but breaks the
  "autonomous, zero-dependency" promise of those two distribution targets for no benefit to a
  single local user.

## Consequences

- New `Organization` model; `TimesheetCode.organization_id` replaces `TimesheetCode.user_id` for real
  codes (virtual codes keep `user_id`). Existing single-user data migrates each user's real codes into
  an Organization of one.
- Two live auth code paths: the hosted instance's OAuth/SSO login, and the standalone builds' unchanged
  implicit default user. Anything catalog-related must resolve "which Organization" instead of "which
  User" for real-code queries; Entries/Tasks/virtual-code queries are untouched.
- Auto-join by email domain means anyone with a same-domain account can see the shared catalog (not
  other members' Entries or Tasks). Acceptable for the intended scale (colleagues on one corporate
  domain); revisit if this is ever opened beyond that.
- Amends ADR-0007: "no authentication" now describes the standalone Docker/`.exe` targets specifically,
  not Walker as a whole — the hosted target gets real authentication.
