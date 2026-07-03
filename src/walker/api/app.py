"""FastAPI application factory.

Exposes the JSON API under ``/api`` and serves the built React SPA (when present) as
static files (see ADR-0003). In development the SPA runs on the Vite dev server and this
static mount is simply absent.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from walker import __version__
from walker.api.routers import codes, entries, fortnight, health, reference, tasks
from walker.api.routers import settings as settings_router
from walker.config import settings
from walker.logging_config import configure_logging


@asynccontextmanager
async def _lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """On graceful shutdown, stop any running timer — as if the user had pressed Stop."""
    yield
    from datetime import datetime

    from walker.db import SessionFactory
    from walker.services.entries import stop_all_running

    now = datetime.now()
    session = SessionFactory()
    try:
        stop_all_running(session, now.hour * 60 + now.minute)
    finally:
        session.close()


def _frontend_dist() -> Path:
    """Resolve the directory holding the built SPA."""
    if settings.frontend_dist:
        return Path(settings.frontend_dist)
    # Dev default: <repo>/frontend/dist (this file is src/walker/api/app.py).
    return Path(__file__).resolve().parents[3] / "frontend" / "dist"


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    configure_logging()
    app = FastAPI(title="Walker", version=__version__, lifespan=_lifespan)
    app.include_router(health.router, prefix="/api")
    app.include_router(codes.router, prefix="/api")
    app.include_router(entries.router, prefix="/api")
    app.include_router(fortnight.router, prefix="/api")
    app.include_router(reference.router, prefix="/api")
    app.include_router(settings_router.router, prefix="/api")
    app.include_router(tasks.router, prefix="/api")

    dist = _frontend_dist()
    if dist.is_dir():
        app.mount("/", StaticFiles(directory=dist, html=True), name="spa")

    return app


app = create_app()
