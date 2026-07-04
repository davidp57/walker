# Self-hosting: Docker

Walker ships as a single Docker image containing both the backend and the built web app — there's
nothing else to install.

## Quick start with Docker Compose

The repository includes a ready-to-use `docker-compose.yml`. From a checkout of the repository:

```bash
docker compose up --build
```

This builds the image, starts the container, and publishes the app on
[http://localhost:8000](http://localhost:8000). Your data is kept in a named Docker volume
(`walker-data`), so it survives container restarts and rebuilds.

## Running the image directly

If you'd rather run the image without checking out the repository (once a published image is
available), the equivalent `docker run` looks like this:

```bash
docker run -d \
  --name walker \
  -p 8000:8000 \
  -v walker-data:/data \
  walker:latest
```

- `-p 8000:8000` publishes the web app on port 8000 — change the first number if you want a
  different port on the host (e.g. `-p 9000:8000`).
- `-v walker-data:/data` is where the SQLite database file lives; without it, your data is lost when
  the container is removed.

## Configuration

Walker reads its configuration from environment variables. The two you're most likely to touch:

| Variable | Purpose | Default |
| --- | --- | --- |
| `WALKER_DATABASE_URL` | Where the database lives | `sqlite:////data/walker.db` inside the container |
| `WALKER_FRONTEND_DIST` | Path to the built web app (already set correctly in the image) | `/app/frontend/dist` |

You shouldn't normally need to change either — they're pre-configured for the container image. See
the repository's `Dockerfile` and `docker-compose.yml` for the exact defaults baked into the image.

## Upgrading

Pull or rebuild the newer image and recreate the container; the database schema is brought up to
date automatically on startup, so there's no manual migration step.

```bash
docker compose pull
docker compose up -d
```
