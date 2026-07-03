"""Health / liveness endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from walker import __version__
from walker.api.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Return service liveness and version."""
    return HealthResponse(status="ok", version=__version__)
