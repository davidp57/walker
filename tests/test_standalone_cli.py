"""The standalone build's command line (CHR-015).

The ``.exe`` opens a browser on startup, which is right for a double-click but wrong when Walker is
launched from a shell, a scheduled task, or a shortcut in a session that already has it open. Hence
``--no-browser``.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from walker import standalone


def test_the_browser_opens_by_default() -> None:
    """Double-clicking the .exe stays the reference behaviour — no flag, browser opens."""
    assert standalone.parse_args([]).open_browser is True


@pytest.mark.parametrize("argv", [["--no-browser"], ["-B"]])
def test_no_browser_suppresses_it(argv: list[str]) -> None:
    assert standalone.parse_args(argv).open_browser is False


def test_an_unknown_flag_is_rejected_rather_than_ignored() -> None:
    with pytest.raises(SystemExit):
        standalone.parse_args(["--nope"])


def _stub_startup(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> list[str]:
    """Neutralize everything ``main`` does besides deciding about the browser."""
    monkeypatch.setattr(standalone, "_configure_environment", lambda: tmp_path / "walker.db")
    monkeypatch.setattr(standalone, "_run_migrations", lambda: None)
    opened: list[str] = []
    monkeypatch.setattr(standalone, "_open_browser", opened.append)

    def _fake_run(*_args: Any, **_kwargs: Any) -> None:
        return None

    monkeypatch.setitem(__import__("sys").modules, "uvicorn", type("_M", (), {"run": staticmethod(_fake_run)}))
    return opened


def test_main_schedules_the_browser_by_default(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    opened = _stub_startup(monkeypatch, tmp_path)
    scheduled: list[tuple[float, object]] = []

    class _Timer:
        def __init__(self, delay: float, fn: object, args: tuple[str, ...] = ()) -> None:
            scheduled.append((delay, fn))
            self._fn, self._args = fn, args

        def start(self) -> None:
            self._fn(*self._args)  # type: ignore[operator]

    monkeypatch.setattr(standalone.threading, "Timer", _Timer)

    standalone.main([])

    assert opened == ["http://localhost:8000"]


def test_main_never_touches_the_browser_with_no_browser(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Not merely "the timer fires into a no-op" — no timer is armed at all."""
    opened = _stub_startup(monkeypatch, tmp_path)

    def _forbidden(*_args: Any, **_kwargs: Any) -> None:
        raise AssertionError("a browser timer was armed despite --no-browser")

    monkeypatch.setattr(standalone.threading, "Timer", _forbidden)

    standalone.main(["--no-browser"])

    assert opened == []
