"""Entry point for the standalone Windows distribution (PyInstaller build).

Replaces the manual ``scripts/deploy-local.ps1`` + ``start-walker.bat`` flow (git clone,
venv, ``npm run build``, manual ``alembic upgrade head``) with one double-clickable
binary. See CHR-009 / ``.backlog/SHIP/tickets/12-cd-standalone-exe.md``.

On start this module:

1. Resolves the SQLite database to ``%APPDATA%\\Walker\\walker.db`` — independent of
   wherever the ``.exe`` happens to sit, so replacing the binary on upgrade doesn't
   strand (or reset) the user's data.
2. Points ``WALKER_DATABASE_URL`` (and, when frozen, ``WALKER_FRONTEND_DIST``) at that
   resolved location *before* importing anything from :mod:`walker` — ``walker.config``
   builds its module-level ``Settings()`` at import time, so the env vars must exist
   first.
3. Runs the Alembic migration chain programmatically (``alembic.command.upgrade``)
   against that database, using the bundled ``alembic.ini`` and ``alembic/`` directory
   (no ``alembic`` CLI is available inside a frozen PyInstaller bundle).
4. Starts the FastAPI app in-process via ``uvicorn.run(...)``.
5. Opens the default browser at the app's URL.

Run directly with plain Python during development (``python -m walker.standalone``)
against a real ``%APPDATA%\\Walker`` folder — no PyInstaller rebuild needed to iterate on
this logic. The frozen ``.exe`` calls the same :func:`main`.
"""

from __future__ import annotations

import os
import sys
import threading
import webbrowser
from pathlib import Path

HOST = "127.0.0.1"
PORT = 8000


def _app_data_dir() -> Path:
    """Return (creating if needed) the ``Walker`` folder under the user's ``%APPDATA%``.

    Falls back to a ``.walker`` folder under the user's home directory when ``APPDATA``
    isn't set (e.g. non-Windows), so the module stays importable off Windows for tests.
    """
    appdata = os.getenv("APPDATA")
    base = Path(appdata) if appdata else Path.home() / ".walker-appdata"
    walker_dir = base / "Walker"
    walker_dir.mkdir(parents=True, exist_ok=True)
    return walker_dir


def _bundle_root() -> Path:
    """Return the directory holding bundled data files (``alembic.ini``, ``alembic/``, ``frontend/dist``).

    Under PyInstaller, data files added via the ``.spec`` are extracted next to
    ``sys._MEIPASS`` at runtime. When run as plain Python (dev iteration), it's the repo
    root (three levels up from this file: ``src/walker/standalone.py``).
    """
    meipass = getattr(sys, "_MEIPASS", None)
    if meipass is not None:
        return Path(meipass)
    return Path(__file__).resolve().parents[2]


def _configure_environment() -> Path:
    """Set ``WALKER_*`` env vars for the standalone layout and return the database path.

    Must run before any ``walker.*`` module is imported, since :mod:`walker.config`
    builds its ``Settings()`` singleton at import time from the environment.
    """
    db_path = _app_data_dir() / "walker.db"
    os.environ["WALKER_DATABASE_URL"] = f"sqlite:///{db_path.as_posix()}"

    frontend_dist = _bundle_root() / "frontend" / "dist"
    if frontend_dist.is_dir():
        os.environ["WALKER_FRONTEND_DIST"] = str(frontend_dist)

    return db_path


def _run_migrations() -> None:
    """Run the Alembic migration chain up to ``head`` against the configured database.

    Uses Alembic's Python API (``alembic.command.upgrade``) rather than shelling out to
    the ``alembic`` CLI, which isn't available inside a frozen PyInstaller bundle. The
    ``Config`` is pointed at the bundled ``alembic.ini`` with ``script_location``
    overridden to the bundled ``alembic/`` directory (both made absolute, since Alembic
    resolves relative paths against the current working directory, not the ini file's
    location — the ini's checked-in relative paths assume a repo checkout run from the
    repo root, which doesn't hold once frozen). ``prepend_sys_path`` is cleared: the
    ``walker`` package used by ``alembic/env.py`` is already importable from the frozen
    bundle itself, not from an on-disk ``src/`` directory.
    """
    from alembic.command import upgrade
    from alembic.config import Config

    bundle_root = _bundle_root()
    alembic_ini = bundle_root / "alembic.ini"
    script_location = bundle_root / "alembic"

    config = Config(str(alembic_ini))
    config.set_main_option("script_location", str(script_location))
    config.set_main_option("prepend_sys_path", "")
    upgrade(config, "head")


def _open_browser(url: str) -> None:
    """Open the default browser at ``url`` shortly after the server starts listening."""
    webbrowser.open(url)


def main() -> None:
    """Migrate the standalone database, then serve the app and open a browser."""
    db_path = _configure_environment()

    # Import walker modules only after WALKER_* env vars are set (see _configure_environment).
    import uvicorn

    print(f"Walker database: {db_path}")
    print("Applying database migrations...")
    _run_migrations()

    url = f"http://localhost:{PORT}"
    print(f"Starting Walker on {url}")
    print("Close this window (or Ctrl-C) to stop it.")
    print()

    threading.Timer(1.5, _open_browser, args=(url,)).start()

    uvicorn.run("walker.api.app:app", host=HOST, port=PORT)


if __name__ == "__main__":
    main()
