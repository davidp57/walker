"""Signed session-cookie token for the hosted SSO deployment (ADR-0010, BIZ-029).

Web-independent (no imports from ``walker.api``). A tiny, explicit JWT (HS256) carrying just the
``User`` id and an expiry — deliberately not a refresh-token/JWT scheme: sessions are re-established
by signing in again once the cookie expires.
"""

from __future__ import annotations

import time

from joserfc import jwt
from joserfc.errors import JoseError
from joserfc.jwk import OctKey

_ALGORITHM = "HS256"


def create_session_token(user_id: int, secret: str, max_age_seconds: int) -> str:
    """Sign a session token identifying ``user_id``, valid for ``max_age_seconds`` from now."""
    key = OctKey.import_key(secret)
    header = {"alg": _ALGORITHM}
    claims = {"sub": str(user_id), "exp": int(time.time()) + max_age_seconds}
    return jwt.encode(header, claims, key)


def read_session_token(token: str, secret: str) -> int | None:
    """Return the ``user_id`` carried by ``token``, or ``None`` if it is missing/invalid/expired."""
    if not token:
        return None
    try:
        key = OctKey.import_key(secret)
        decoded = jwt.decode(token, key, algorithms=[_ALGORITHM])
        jwt.JWTClaimsRegistry(exp={"essential": True}).validate(decoded.claims)
        return int(decoded.claims["sub"])
    except (JoseError, ValueError, KeyError):
        return None
