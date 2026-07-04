# BIZ-029 — SSO login (Google/Apple/Microsoft) for the hosted instance

ID: BIZ-029
Status: ✅ done
Type: feature
Priority: P2

## Parent

Lot SHIP — `.backlog/SHIP/PRD.md`.

## What to build

Wire a real sign-in flow for the **hosted deployment only**, using OAuth2/OIDC against Google, Apple,
and Microsoft. A successful callback resolves the User's email, runs it through the Organization
auto-join logic (BIZ-028), and finds-or-creates the `User` under that Organization — no separate
sign-up step, no invite flow. The standalone Docker image and `.exe` are untouched: a deployment-mode
setting selects between "hosted" (SSO required) and "standalone" (today's implicit default user,
ADR-0007) — this ticket must not change standalone behavior at all.

Note for whoever picks this up: writing and testing this ticket doesn't require real accounts (see
Testing below), but running it against real providers later needs OAuth client credentials registered
with each of Google, Apple, and Microsoft — that registration is a human prerequisite outside this
ticket's scope, not something to block on.

## Acceptance criteria

- [x] A User can sign in via Google, Apple, or Microsoft on the hosted deployment; a successful login
      creates or joins their Organization by email domain (BIZ-028) and creates or reuses their `User`.
- [x] The standalone Docker/`.exe` deployment mode is entirely unaffected — no login screen, same
      implicit default user as before this ticket.
- [x] A deployment-mode setting/flag controls which auth path is active; it's impossible to accidentally
      run the hosted OAuth path in a standalone build or vice versa.
- [x] Session handling (however implemented) keeps a signed-in User's identity across requests securely.
- [x] Backend tests exercise the OAuth callback flow with each provider's response **mocked** — never
      against real Google/Apple/Microsoft accounts.

## Blocked by

BIZ-028.
