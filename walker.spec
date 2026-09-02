# PyInstaller spec for the standalone Walker build (CHR-009, TEC-021).
#
# Bundles the FastAPI backend, the Alembic migration chain (alembic.ini + alembic/), and
# the built frontend (frontend/dist, built separately with `npm run build` before running
# this spec — see scripts/build-exe.ps1) into a console-mode Windows program.
#
# Two packagings are produced from this one spec, selected by the WALKER_BUILD_MODE environment
# variable (default "onefile"), because they must stay byte-for-byte the same application:
#
#   onefile  ->  dist/walker.exe      one file, nothing to unpack
#   onedir   ->  dist/walker/         walker.exe next to its dependencies, shipped as a .zip
#
# Both are published (TEC-021). A onefile executable unpacks its own appended archive and executes
# code from it at startup, which is indistinguishable from a packer to an antivirus heuristic:
# Defender quarantined the v1.14.0 walker.exe as Behavior:Win32/DefenseEvasion.A!ml, killing the
# running process mid-request. The onedir build does no such self-extraction, so it gives the user
# something else to try. Neither is claimed to be immune.
#
# Build: pyinstaller walker.spec --noconfirm                      (onefile)
#        $env:WALKER_BUILD_MODE='onedir'; pyinstaller walker.spec --noconfirm
#        or just: .\scripts\build-exe.ps1                          (both)
#
# Console mode is intentional (no --windowed/--noconsole): a visible window that stays
# open while the server runs, closing it stops the server — same mental model as today's
# start-walker.bat (see the ticket's acceptance criteria).
#
# The executable carries the app's own ranger star (CHR-015), so it is recognisable in Explorer,
# the taskbar and a pinned shortcut rather than wearing PyInstaller's generic icon. The .ico is a
# committed source asset — regenerate it with scripts/make-icon.py when the favicon changes.

from __future__ import annotations

import os
from pathlib import Path

from PyInstaller.utils.hooks import collect_submodules

repo_root = Path(SPECPATH).resolve()

build_mode = os.environ.get("WALKER_BUILD_MODE", "onefile").strip().lower()
if build_mode not in {"onefile", "onedir"}:
    raise SystemExit(f"WALKER_BUILD_MODE must be 'onefile' or 'onedir', got {build_mode!r}")

datas = [
    (str(repo_root / "alembic.ini"), "."),
    (str(repo_root / "alembic"), "alembic"),
]

frontend_dist = repo_root / "frontend" / "dist"
if frontend_dist.is_dir():
    datas.append((str(frontend_dist), "frontend/dist"))

icon = repo_root / "assets" / "walker.ico"

a = Analysis(
    [str(repo_root / "src" / "walker" / "standalone.py")],
    pathex=[str(repo_root / "src")],
    binaries=[],
    datas=datas,
    hiddenimports=[
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "walker.models",
        "pydantic_settings",
        "pydantic_settings.sources",
    ]
    # Alembic loads command/config/ddl submodules dynamically at runtime (standalone._run_migrations
    # does `from alembic.command import upgrade`); collect the whole package so the frozen exe can
    # migrate on startup (a bare "alembic" hidden-import misses alembic.command → ModuleNotFoundError).
    + collect_submodules("alembic")
    + collect_submodules("pydantic_settings")
    + collect_submodules("walker"),
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
pyz = PYZ(a.pure)

# Shared between both packagings, so the two artifacts can never drift apart in behavior.
_exe_kwargs = dict(
    name="walker",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    console=True,
    icon=str(icon),
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

if build_mode == "onefile":
    exe = EXE(pyz, a.scripts, a.binaries, a.datas, [], runtime_tmpdir=None, **_exe_kwargs)
else:
    # exclude_binaries hands the binaries and data files to COLLECT instead of appending them to
    # the executable — that missing self-extraction step is the whole point of this variant.
    exe = EXE(pyz, a.scripts, [], exclude_binaries=True, **_exe_kwargs)
    coll = COLLECT(exe, a.binaries, a.datas, strip=False, upx=False, upx_exclude=[], name="walker")
