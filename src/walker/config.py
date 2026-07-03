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
    """

    model_config = SettingsConfigDict(env_prefix="WALKER_", env_file=".env", extra="ignore")

    database_url: str = f"sqlite:///{_DEFAULT_DB.as_posix()}"
    default_user: str = "me"
    frontend_dist: str = ""


settings = Settings()
