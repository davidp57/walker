"""Run the Walker API server: ``python -m walker`` or the ``walker`` console script."""

from __future__ import annotations

import uvicorn


def main() -> None:
    """Start the ASGI server serving the API (and the SPA if built)."""
    uvicorn.run("walker.api.app:app", host="0.0.0.0", port=8000)


if __name__ == "__main__":
    main()
