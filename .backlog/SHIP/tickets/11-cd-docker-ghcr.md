# CHR-008 — CD: publish the Docker image to GHCR on version tags

ID: CHR-008
Status: ⬜ ready
Type: chore
Priority: P2

## Parent

Lot SHIP — `.backlog/SHIP/PRD.md`.

## What to build

The existing multi-stage `Dockerfile` already self-migrates on boot (`alembic upgrade head && exec
walker`) — no change needed there. Add a GitHub Actions workflow, triggered on `v*` tags, that builds
that image and publishes it to GitHub Container Registry (`ghcr.io`), tagged with both the version and
`latest`.

## Acceptance criteria

- [ ] Pushing a `vX.Y.Z` tag builds the existing `Dockerfile` and publishes the resulting image to
      `ghcr.io` under this repo's namespace.
- [ ] The published image is tagged with both the exact version and `latest`.
- [ ] Pulling and running the published image behaves identically to building it locally (self-migrates
      on boot, serves the API + SPA on one port).

## Blocked by

None — can start immediately.
