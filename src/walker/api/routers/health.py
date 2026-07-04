"""Health / liveness endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from walker import __version__
from walker.api.schemas import HealthResponse
from walker.config import settings

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Return service liveness, version, and the SSO providers actually configured.

    ``sso_providers`` only lists a provider once both its client id and secret are set, so the
    SPA's sign-in screen never offers a provider that would fail immediately on click. Read from
    ``settings`` fresh on every request (not cached at import time), matching the rest of the app.
    """
    provider_credentials = {
        "google": (settings.google_client_id, settings.google_client_secret),
        "apple": (settings.apple_client_id, settings.apple_client_secret),
        "microsoft": (settings.microsoft_client_id, settings.microsoft_client_secret),
    }
    providers = (
        [name for name, (client_id, client_secret) in provider_credentials.items() if client_id and client_secret]
        if settings.auth_mode == "sso"
        else []
    )
    return HealthResponse(status="ok", version=__version__, auth_mode=settings.auth_mode, sso_providers=providers)
