# Self-hosting: configuring SSO

SSO (`WALKER_AUTH_MODE=sso`) is for a **shared, hosted** deployment where more than one person will
use the same Walker instance and each should sign in as themselves. It requires registering an
OAuth app with each provider you want to offer — Walker can't do this part for you.

!!! warning "HTTPS is required, not optional"
    Walker's session cookie is set with the `Secure` flag, so browsers silently refuse to store it
    over plain HTTP. SSO will *appear* to work — the provider's consent screen and redirect both
    complete — but you'll land back on Walker still signed out, or immediately get a 401 from
    `/api/auth/me`. Put a reverse proxy with a real TLS certificate (Traefik, Caddy, nginx,
    Synology's built-in reverse proxy, ...) in front of Walker before enabling `sso` mode; a bare
    `http://<ip>:8000` deployment cannot work with SSO regardless of how the provider apps are
    configured.

!!! warning "Behind a reverse proxy, Walker must be told the real scheme is HTTPS"
    If the reverse proxy terminates TLS and forwards to Walker over plain HTTP internally (the
    normal setup), Walker builds the OAuth `redirect_uri` from what *it* sees — plain HTTP —
    unless it trusts the proxy's `X-Forwarded-Proto` header. Symptom: Google rejects the sign-in
    with `Error 400: redirect_uri_mismatch`, and the "error details" link shows a `redirect_uri`
    starting with `http://` even though you're browsing over `https://`. Walker's own server
    entry point already trusts forwarded headers from any peer (`forwarded_allow_ips="*"` in
    `uvicorn.run`, safe here since Walker is meant to sit behind exactly one trusted proxy) — make
    sure your reverse proxy actually sends `X-Forwarded-Proto: https` (Synology's and most
    others do this by default).

## Google

1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a project (or
   pick an existing one) for this Walker deployment.
2. **APIs & Services → OAuth consent screen**: configure it if you haven't already.
   - **User type**: *External* (unless every future user is inside a Google Workspace
     organization you control, in which case *Internal* is simpler and skips verification).
   - App name, support email, etc. — cosmetic, shown on the consent screen.
   - **Scopes**: none need adding manually; Walker requests `openid email profile` at login time.
   - If you chose *External* and stay in "Testing" publishing status, only the test users you
     explicitly add can sign in — add yourself and anyone else you want to try it, or publish the
     app (no Google review is required for these basic scopes).
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - **Application type**: *Web application*.
   - **Authorized redirect URIs**: add exactly

     ```
     https://<your-domain>/api/auth/callback/google
     ```

     Match your real deployment scheme and host precisely (`https://`, no trailing slash) — this
     is the fixed path Walker's backend registers for Google's callback
     (`src/walker/api/routers/auth.py`); a mismatch here is the most common source of an
     `redirect_uri_mismatch` error from Google.
4. Save. Google shows a **Client ID** and **Client secret** — copy both.
5. Set them on your deployment:

   ```yaml
   environment:
     WALKER_AUTH_MODE: sso
     WALKER_SESSION_SECRET: "<generate one — see below>"
     WALKER_GOOGLE_CLIENT_ID: "<client ID from step 4>"
     WALKER_GOOGLE_CLIENT_SECRET: "<client secret from step 4>"
   ```

6. Restart/redeploy Walker, then open `https://<your-domain>/api/auth/login/google` — you should
   land on Google's consent screen, and be redirected back signed in.

Only Google accounts with a **verified** email are accepted (Walker rejects the login otherwise);
this is essentially always the case for real Google accounts.

### What happens on first Google sign-in

Walker finds-or-creates a `User` by the signed-in email, with no separate sign-up step:

- Emails on a company/custom domain (e.g. `alice@acme.com`) auto-join the shared Organization for
  that domain, creating it if this is the first person from `acme.com` to sign in — every teammate
  on the same domain then sees the same real-code catalog.
- Emails on a personal/free-mail provider (`gmail.com`, `outlook.com`, `icloud.com`, and similar —
  see `services/organization.py` for the full list) never join or create a shared Organization;
  each such user gets their own private catalog, same as a standalone install.

There's no invite flow and no roles — anyone who can complete the consent screen for an accepted
domain gets an account.

## Generating `WALKER_SESSION_SECRET`

This signs the session cookie; the shipped default (`dev-insecure-secret-change-me`) is only safe
for local development. Generate a real one per deployment:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Keep it out of anything you share (a Portainer **stack environment variable** rather than pasted
directly into the compose text, if others can view the stack) — anyone with this value can forge a
valid session for any user ID.

## Apple and Microsoft

Both follow the same overall shape as Google — register an app with the provider, get a client
ID/secret pair, set the matching `WALKER_APPLE_CLIENT_ID`/`WALKER_APPLE_CLIENT_SECRET` or
`WALKER_MICROSOFT_CLIENT_ID`/`WALKER_MICROSOFT_CLIENT_SECRET` pair, and register the same redirect
URI shape (`https://<your-domain>/api/auth/callback/apple` or `.../callback/microsoft`) with that
provider. You only need to configure the providers you actually want to offer; leave the others
blank.
