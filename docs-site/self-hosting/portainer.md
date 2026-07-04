# Self-hosting: Portainer

Walker's published Docker image (`ghcr.io/davidp57/walker`) can be deployed as a
[Portainer](https://www.portainer.io/) stack with no repository checkout and no build step —
Portainer just pulls the pre-built image.

## Prerequisite: image visibility

GitHub Container Registry packages are **private by default**, even when the source repository is
public. Before deploying, make sure `ghcr.io/davidp57/walker` is reachable from your Portainer host:

- **Public image (simplest)**: on GitHub, go to the package page
  (`https://github.com/davidp57?tab=packages`, package `walker`) → **Package settings** →
  **Danger Zone** → **Change visibility** → **Public**.
- **Private image**: add a registry in Portainer instead (**Registries** → **Add registry** →
  **Custom registry**, URL `ghcr.io`, authenticating with a GitHub username and a
  [personal access token](https://github.com/settings/tokens) that has `read:packages` scope).

## Deploy as a stack

In Portainer: **Stacks** → **Add stack** → give it a name (e.g. `walker`) → **Web editor**, and
paste:

```yaml
services:
  walker:
    image: ghcr.io/davidp57/walker:latest
    ports:
      - "8000:8000"
    volumes:
      - walker-data:/data
    environment:
      WALKER_DATABASE_URL: sqlite:////data/walker.db
    restart: unless-stopped

volumes:
  walker-data:
```

Click **Deploy the stack**. Portainer pulls the image, starts the container, and Walker is
reachable on `http://<host>:8000`. The `walker-data` volume keeps the SQLite database across
container recreations and image upgrades.

Pin a specific version instead of always tracking `latest` by using a release tag, e.g.
`ghcr.io/davidp57/walker:1.0.0` — see the
[releases page](https://github.com/davidp57/walker/releases) for available tags.

## Optional: SSO for a shared/hosted instance

By default (`WALKER_AUTH_MODE=none`), there's no login — fine for a single person self-hosting for
themselves. If you're hosting Walker for a team and want each person to sign in with their own
account (Google, Apple, or Microsoft), add these to the stack's `environment` section:

```yaml
    environment:
      WALKER_DATABASE_URL: sqlite:////data/walker.db
      WALKER_AUTH_MODE: sso
      WALKER_SESSION_SECRET: "<generate one>"
      WALKER_GOOGLE_CLIENT_ID: "<from Google Cloud Console>"
      WALKER_GOOGLE_CLIENT_SECRET: "<from Google Cloud Console>"
      # ...and/or WALKER_APPLE_CLIENT_ID/SECRET, WALKER_MICROSOFT_CLIENT_ID/SECRET
```

See the [SSO configuration guide](sso.md) for the full per-provider setup (including Google's
Cloud Console steps), why HTTPS is mandatory for this to work at all, and how teammates end up
sharing — or not sharing — a code catalog based on their email domain.

## Upgrading

**Stacks** → your stack → **Pull and redeploy** (or re-select the image tag if you pinned one and
want to move to a newer release). The database schema is brought up to date automatically on
startup — no manual migration step.
