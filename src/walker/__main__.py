"""Run the Walker API server: ``python -m walker`` or the ``walker`` console script."""

from __future__ import annotations

import uvicorn


def main() -> None:
    """Start the ASGI server serving the API (and the SPA if built).

    ``forwarded_allow_ips="*"`` trusts ``X-Forwarded-Proto``/``X-Forwarded-Host`` from whatever
    reverse proxy sits in front of a hosted deployment (ADR-0010) — without it, uvicorn only
    trusts those headers from ``127.0.0.1``, so behind e.g. a Synology reverse proxy the app sees
    a plain-``http`` request even though the client connected over TLS. That mismatch breaks SSO's
    OAuth ``redirect_uri`` (built from the request's scheme/host) and its ``Secure`` session
    cookie. Safe here: Walker is meant to sit behind exactly one trusted proxy, not exposed
    directly to arbitrary clients.
    """
    uvicorn.run("walker.api.app:app", host="0.0.0.0", port=8000, forwarded_allow_ips="*")


if __name__ == "__main__":
    main()
