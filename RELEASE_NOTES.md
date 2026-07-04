# Walker v1.0.2

A bug-fix release that makes SSO actually usable end-to-end. Anyone running a hosted deployment
with `WALKER_AUTH_MODE=sso` should upgrade — v1.0.0/v1.0.1 could not complete a sign-in at all.

## Added

- **A real sign-in screen for SSO deployments.** Previously SSO was backend-only: there was no way
  to actually sign in through the app short of typing a login URL into the address bar by hand.
  Walker now shows a proper "Sign in with Google/Apple/Microsoft" screen when a sign-in is needed.

## Fixed

- **Missing dependency crashed startup with `WALKER_AUTH_MODE=sso` set** (`ModuleNotFoundError:
  httpx`) — affected every Docker deployment with SSO enabled.
- **Sign-in failed behind a reverse proxy** (`Error 400: redirect_uri_mismatch` from Google) —
  Walker now correctly recognizes the original request was HTTPS even when the proxy forwards to
  it over plain HTTP internally.
- **Random 500 errors on a brand-new database's first launch** (standalone Docker/`.exe`, and any
  user's first SSO sign-in): the app's first few requests could race each other while creating the
  default settings/user, and the loser would fail instead of just using what the winner created.

## Under the hood

- The published Docker image (`ghcr.io/davidp57/walker:develop`) and a `.exe` build are now
  produced on every push to `develop`, kept as a downloadable build artifact rather than a
  release, so a fix can be smoke-tested before it's actually released.
