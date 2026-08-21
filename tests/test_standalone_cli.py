"""The standalone build's command line (CHR-015).

The ``.exe`` opens a browser on startup, which is right for a double-click but wrong when Walker is
launched from a shell, a scheduled task, or a shortcut in a session that already has it open. Hence
``--no-browser``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, ClassVar

import pytest
import uvicorn

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


@dataclass
class _Startup:
    """What ``main`` did, once everything with a side effect is stubbed out."""

    opened: list[str] = field(default_factory=list)
    served: list[tuple[tuple[Any, ...], dict[str, Any]]] = field(default_factory=list)
    migrated: list[None] = field(default_factory=list)


def _stub_startup(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> _Startup:
    """Neutralize the side effects of ``main`` while recording that each step happened.

    Every stub is a spy: a test asserting only about the browser would otherwise still pass if
    ``main`` stopped migrating or stopped serving altogether.
    """
    calls = _Startup()
    monkeypatch.setattr(standalone, "_configure_environment", lambda: tmp_path / "walker.db")
    monkeypatch.setattr(standalone, "_run_migrations", lambda: calls.migrated.append(None))
    monkeypatch.setattr(standalone, "_open_browser", calls.opened.append)
    monkeypatch.setattr(uvicorn, "run", lambda *args, **kwargs: calls.served.append((args, kwargs)))
    return calls


class _ImmediateTimer:
    """A ``threading.Timer`` that runs its callback on ``start()`` instead of after the delay."""

    armed: ClassVar[list[tuple[float, object]]] = []

    def __init__(self, delay: float, fn: Any, args: tuple[Any, ...] = ()) -> None:
        _ImmediateTimer.armed.append((delay, fn))
        self._fn, self._args = fn, args

    def start(self) -> None:
        self._fn(*self._args)


def test_main_serves_the_app_and_opens_the_browser_by_default(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    calls = _stub_startup(monkeypatch, tmp_path)
    _ImmediateTimer.armed = []
    monkeypatch.setattr(standalone.threading, "Timer", _ImmediateTimer)

    standalone.main([])

    assert calls.migrated == [None]  # migrations run before the server comes up
    assert calls.served == [(("walker.api.app:app",), {"host": standalone.HOST, "port": standalone.PORT})]
    assert calls.opened == [f"http://localhost:{standalone.PORT}"]
    # The delay is part of the contract: the browser must not race the server into listening.
    assert _ImmediateTimer.armed == [(1.5, standalone._open_browser)]


def test_main_never_touches_the_browser_with_no_browser(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    """Not merely "the timer fires into a no-op" — no timer is armed at all, and the app still serves."""
    calls = _stub_startup(monkeypatch, tmp_path)

    def _forbidden(*_args: Any, **_kwargs: Any) -> None:
        raise AssertionError("a browser timer was armed despite --no-browser")

    monkeypatch.setattr(standalone.threading, "Timer", _forbidden)

    standalone.main(["--no-browser"])

    assert calls.opened == []
    assert calls.migrated == [None]
    assert calls.served == [(("walker.api.app:app",), {"host": standalone.HOST, "port": standalone.PORT})]
