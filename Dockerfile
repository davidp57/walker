# syntax=docker/dockerfile:1

# --- Stage 1: build the React SPA -------------------------------------------------
FROM node:22-alpine AS frontend
WORKDIR /app/frontend
# Install from the committed lockfile for a reproducible build.
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# The TEC-004 contract test imports a fixture shared with the backend test of the same contract,
# outside the frontend/ tree — needed here because `npm run build` type-checks test files too.
COPY tests/fixtures/ /app/tests/fixtures/
RUN npm run build

# --- Stage 2: Python runtime, serves API + built SPA ------------------------------
FROM python:3.13-slim AS runtime
WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    WALKER_FRONTEND_DIST=/app/frontend/dist \
    WALKER_DATABASE_URL=sqlite:////data/walker.db

COPY pyproject.toml README.md ./
COPY src/ ./src/
COPY alembic.ini ./
COPY alembic/ ./alembic/
RUN pip install .

COPY --from=frontend /app/frontend/dist ./frontend/dist

# SQLite file lives on a volume (see ADR-0004). Bring the schema up to head on startup
# (idempotent), then serve the API + SPA. `exec` keeps uvicorn as PID 1 so SIGTERM reaches
# it for a graceful shutdown (which stops any running timer — see the app lifespan).
VOLUME ["/data"]
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && exec walker"]
