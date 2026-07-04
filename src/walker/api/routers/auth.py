"""SSO login for the hosted deployment (``auth_mode=sso``; see ADR-0010, BIZ-029).

Only mounted by ``create_app`` when ``settings.auth_mode == "sso"``; the standalone Docker/``.exe``
deployment (``auth_mode="none"``, the default) never sees these routes at all.

OAuth2/OIDC token exchange and ID-token verification are delegated to ``authlib``; this module owns
only the provider registry, the callback -> find-or-create-user wiring, and the signed session
cookie (``walker.services.auth_session``).
"""

from __future__ import annotations

from typing import Any

from authlib.integrations.starlette_client import OAuth
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session
from starlette.responses import RedirectResponse

from walker.api.schemas import CurrentUserRead
from walker.config import settings
from walker.db import get_session
from walker.models import User
from walker.services.auth import find_or_create_user_for_email
from walker.services.auth_session import create_session_token, read_session_token

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_COOKIE_NAME = "walker_session"

_PROVIDER_METADATA_URLS = {
    "google": "https://accounts.google.com/.well-known/openid-configuration",
    "microsoft": "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration",
    # Apple does not publish a metadata discovery document; endpoints are wired explicitly.
    "apple": None,
}

oauth = OAuth()
oauth.register(
    name="google",
    server_metadata_url=_PROVIDER_METADATA_URLS["google"],
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    client_kwargs={"scope": "openid email profile"},
)
oauth.register(
    name="microsoft",
    server_metadata_url=_PROVIDER_METADATA_URLS["microsoft"],
    client_id=settings.microsoft_client_id,
    client_secret=settings.microsoft_client_secret,
    client_kwargs={"scope": "openid email profile"},
)
oauth.register(
    name="apple",
    authorize_url="https://appleid.apple.com/auth/authorize",
    access_token_url="https://appleid.apple.com/auth/token",
    client_id=settings.apple_client_id,
    client_secret=settings.apple_client_secret,
    client_kwargs={"scope": "openid email name", "response_mode": "form_post"},
)

_PROVIDERS = frozenset(_PROVIDER_METADATA_URLS)


def _get_provider_client(provider: str) -> Any:
    """Return the registered ``authlib`` client for ``provider``, or 404 if unknown."""
    if provider not in _PROVIDERS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Unknown provider '{provider}'.")
    # authlib's stub leaves `create_client` untyped.
    return oauth.create_client(provider)  # type: ignore[no-untyped-call]


def _extract_verified_email(userinfo: dict[str, Any]) -> str:
    """Return the email from a provider's userinfo/ID-token claims, rejecting unverified addresses.

    Google and Apple always include ``email_verified``; Microsoft's v2.0 endpoint does not, so its
    absence is treated as "not applicable" rather than "unverified" — only an explicit ``False``
    is rejected.
    """
    email = userinfo.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Provider did not return an email.")
    if userinfo.get("email_verified") is False:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email address is not verified.")
    return str(email)


@router.get("/login/{provider}")
async def login(provider: str, request: Request) -> Any:
    """Redirect to ``provider``'s consent screen."""
    client = _get_provider_client(provider)
    redirect_uri = str(request.url_for("callback", provider=provider))
    return await client.authorize_redirect(request, redirect_uri)


@router.api_route("/callback/{provider}", methods=["GET", "POST"], name="callback")
async def callback(provider: str, request: Request, session: Session = Depends(get_session)) -> Response:
    """Handle the provider's redirect back: log the user in and set the session cookie.

    Registered via ``@router.api_route`` rather than ``@router.get``/``@router.post`` because
    Apple's OIDC flow uses ``response_mode=form_post`` (a POST callback) while Google and
    Microsoft use the standard GET redirect.
    """
    client = _get_provider_client(provider)
    token = await client.authorize_access_token(request)
    userinfo = token.get("userinfo")
    if userinfo is None:
        userinfo = await client.userinfo(token=token)
    email = _extract_verified_email(userinfo)

    user = find_or_create_user_for_email(session, email)
    session_token = create_session_token(user.id, settings.session_secret, settings.session_max_age_seconds)

    response = RedirectResponse(url="/")
    response.set_cookie(
        SESSION_COOKIE_NAME,
        session_token,
        max_age=settings.session_max_age_seconds,
        httponly=True,
        secure=True,
        samesite="lax",
    )
    return response


@router.post("/logout")
def logout(response: Response) -> dict[str, bool]:
    """Clear the session cookie."""
    response.delete_cookie(SESSION_COOKIE_NAME)
    return {"ok": True}


def get_current_sso_user(request: Request, session: Session = Depends(get_session)) -> User:
    """Resolve the signed-in ``User`` from the session cookie, or 401 if missing/invalid."""
    token = request.cookies.get(SESSION_COOKIE_NAME)
    user_id = read_session_token(token or "", settings.session_secret)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in.")
    user = session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not signed in.")
    return user


@router.get("/me", response_model=CurrentUserRead)
def me(user: User = Depends(get_current_sso_user)) -> User:
    """Return the signed-in user's identity."""
    return user
