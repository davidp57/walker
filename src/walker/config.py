"""Application configuration, loaded from the environment (prefix ``WALKER_``)."""

from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# The SQLite file lives next to the repo root so the DB is the same regardless of the working
# directory the server is launched from (a CWD-relative path would create a fresh, empty file).
_DEFAULT_DB = Path(__file__).resolve().parents[2] / "walker.db"


class Settings(BaseSettings):
    """Runtime settings. Override via ``WALKER_*`` env vars or a ``.env`` file.

    Attributes:
        database_url: SQLAlchemy URL. POC default is embedded SQLite anchored to the repo root;
            switch to an external DBMS later without code changes (see ADR-0004).
        default_user: The implicit single user for the POC (see ADR-0007).
        frontend_dist: Path to the built SPA to serve. Empty → the app computes the
            development default (``<repo>/frontend/dist``).
        auth_mode: Deployment-mode switch (ADR-0010). ``"none"`` (default) is the standalone
            Docker/``.exe`` behavior: no login, implicit default user — unchanged by BIZ-029.
            ``"sso"`` is the hosted deployment: OAuth2/OIDC login against Google, Apple, or
            Microsoft, required on every request.
        session_secret: Symmetric key signing the session cookie in ``sso`` mode. Must be
            overridden per hosted deployment; the default is only safe for local/dev use.
        session_max_age_seconds: How long a session cookie stays valid, in ``sso`` mode.
        google_client_id: OAuth client ID registered with Google, for ``sso`` mode.
        google_client_secret: OAuth client secret registered with Google, for ``sso`` mode.
        apple_client_id: OAuth client ID registered with Apple, for ``sso`` mode.
        apple_client_secret: OAuth client secret registered with Apple, for ``sso`` mode.
        microsoft_client_id: OAuth client ID registered with Microsoft, for ``sso`` mode.
        microsoft_client_secret: OAuth client secret registered with Microsoft, for ``sso`` mode.
    """

    model_config = SettingsConfigDict(env_prefix="WALKER_", env_file=".env", extra="ignore")

    database_url: str = f"sqlite:///{_DEFAULT_DB.as_posix()}"
    default_user: str = "me"
    frontend_dist: str = ""

    auth_mode: str = "none"
    session_secret: str = "dev-insecure-secret-change-me"
    session_max_age_seconds: int = 60 * 60 * 24 * 14

    google_client_id: str = ""
    google_client_secret: str = ""
    apple_client_id: str = ""
    apple_client_secret: str = ""
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""


settings = Settings()
