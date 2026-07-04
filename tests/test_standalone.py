"""Tests for the standalone (.exe) launcher's path resolution and environment setup.

Only the pure, testable seams are covered here: where the database and bundle directory
resolve to, and that the right ``WALKER_*`` env vars get set. Migration execution and
serving are exercised manually (see CHR-009) since they need a real Alembic run and a
live server — not a good fit for the unit-test seam.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from walker import standalone


def test_app_data_dir_uses_appdata_env_var(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """The Walker folder is created under %APPDATA%, not next to the binary."""
    fake_appdata = tmp_path / "AppData" / "Roaming"
    fake_appdata.mkdir(parents=True)
    monkeypatch.setenv("APPDATA", str(fake_appdata))

    walker_dir = standalone._app_data_dir()

    assert walker_dir == fake_appdata / "Walker"
    assert walker_dir.is_dir()


def test_app_data_dir_falls_back_without_appdata(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Without %APPDATA% (e.g. off Windows), a sane home-relative fallback is used."""
    monkeypatch.delenv("APPDATA", raising=False)
    monkeypatch.setattr(Path, "home", lambda: tmp_path)

    walker_dir = standalone._app_data_dir()

    assert walker_dir == tmp_path / ".walker-appdata" / "Walker"
    assert walker_dir.is_dir()


def test_bundle_root_is_repo_root_when_not_frozen() -> None:
    """Outside a frozen PyInstaller build, the bundle root is the repo checkout root."""
    root = standalone._bundle_root()

    assert (root / "alembic.ini").is_file()
    assert (root / "alembic").is_dir()


def test_bundle_root_uses_meipass_when_frozen(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Under a frozen PyInstaller build, the bundle root is sys._MEIPASS."""
    monkeypatch.setattr(standalone.sys, "_MEIPASS", str(tmp_path), raising=False)

    root = standalone._bundle_root()

    assert root == tmp_path


def test_configure_environment_points_database_url_at_appdata(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """The database URL is derived from the resolved %APPDATA%\\Walker path."""
    fake_appdata = tmp_path / "AppData" / "Roaming"
    fake_appdata.mkdir(parents=True)
    monkeypatch.setenv("APPDATA", str(fake_appdata))
    monkeypatch.delenv("WALKER_DATABASE_URL", raising=False)
    monkeypatch.delenv("WALKER_FRONTEND_DIST", raising=False)

    db_path = standalone._configure_environment()

    assert db_path == fake_appdata / "Walker" / "walker.db"
    assert standalone.os.environ["WALKER_DATABASE_URL"] == f"sqlite:///{db_path.as_posix()}"


def test_configure_environment_sets_frontend_dist_when_present(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """WALKER_FRONTEND_DIST is set when the bundle root has a built frontend/dist."""
    fake_appdata = tmp_path / "AppData" / "Roaming"
    fake_appdata.mkdir(parents=True)
    monkeypatch.setenv("APPDATA", str(fake_appdata))

    fake_bundle = tmp_path / "bundle"
    fake_dist = fake_bundle / "frontend" / "dist"
    fake_dist.mkdir(parents=True)
    monkeypatch.setattr(standalone.sys, "_MEIPASS", str(fake_bundle), raising=False)
    monkeypatch.delenv("WALKER_FRONTEND_DIST", raising=False)

    standalone._configure_environment()

    assert standalone.os.environ["WALKER_FRONTEND_DIST"] == str(fake_dist)


def test_configure_environment_skips_frontend_dist_when_absent(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """WALKER_FRONTEND_DIST is left untouched when no built frontend is bundled."""
    fake_appdata = tmp_path / "AppData" / "Roaming"
    fake_appdata.mkdir(parents=True)
    monkeypatch.setenv("APPDATA", str(fake_appdata))

    fake_bundle = tmp_path / "empty-bundle"
    fake_bundle.mkdir()
    monkeypatch.setattr(standalone.sys, "_MEIPASS", str(fake_bundle), raising=False)
    monkeypatch.delenv("WALKER_FRONTEND_DIST", raising=False)

    standalone._configure_environment()

    assert "WALKER_FRONTEND_DIST" not in standalone.os.environ
