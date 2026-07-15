# PyInstaller spec for the standalone Walker .exe (CHR-009).
#
# Bundles the FastAPI backend, the Alembic migration chain (alembic.ini + alembic/), and
# the built frontend (frontend/dist, built separately with `npm run build` before running
# this spec — see scripts/build-exe.ps1) into one console-mode Windows executable.
#
# Build: pyinstaller walker.spec --noconfirm
# Output: dist/walker.exe
#
# Console mode is intentional (no --windowed/--noconsole): a visible window that stays
# open while the server runs, closing it stops the server — same mental model as today's
# start-walker.bat (see the ticket's acceptance criteria).

from __future__ import annotations

from pathlib import Path

from PyInstaller.utils.hooks import collect_submodules

repo_root = Path(SPECPATH).resolve()

datas = [
    (str(repo_root / "alembic.ini"), "."),
    (str(repo_root / "alembic"), "alembic"),
]

frontend_dist = repo_root / "frontend" / "dist"
if frontend_dist.is_dir():
    datas.append((str(frontend_dist), "frontend/dist"))

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

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="walker",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
