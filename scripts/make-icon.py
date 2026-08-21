"""Regenerate ``assets/walker.ico`` — the icon PyInstaller stamps onto ``walker.exe`` (CHR-015).

The icon is the app's own ranger star, drawn from the exact primitives of
``frontend/public/favicon.svg`` (same rounded plate, same halo, same star coordinates) so the
executable, the browser tab and the sidebar badge are one mark rather than three lookalikes.

Rendering happens here, at authoring time, rather than in the build: the committed ``.ico`` is a
source asset, so neither CI nor a contributor needs an SVG rasterizer to build the ``.exe``. Pillow
is therefore **not** a project dependency — install it ad hoc to run this:

    pip install pillow
    python scripts/make-icon.py

Re-run it only when the favicon changes, and commit the result.
"""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

# One SVG user unit == one unit here; everything scales from SUPERSAMPLE / 48.
VIEWBOX = 48
SUPERSAMPLE = 1024  # draw large, reduce with LANCZOS per size — the 16x16 entry has to survive
SCALE = SUPERSAMPLE / VIEWBOX

PLATE = (0x15, 0x17, 0x1D, 0xFF)  # #15171d
STAR = (0x5B, 0x9C, 0xF6, 0xFF)  # #5b9cf6
HALO_FILL = (0x5B, 0x9C, 0xF6, 36)  # rgba(91,156,246,0.14)
HALO_LINE = (0x5B, 0x9C, 0xF6, 107)  # rgba(91,156,246,0.42)

PLATE_RADIUS = 11  # the favicon's rx
HALO_CENTER = 24
HALO_RADIUS = 15

# The favicon's star path, resolved from its relative segments to absolute points.
STAR_POINTS = [
    (24.0, 10.5),
    (27.9, 19.0),
    (37.2, 20.0),
    (30.3, 26.3),
    (32.2, 35.5),
    (24.0, 30.3),
    (15.9, 34.5),
    (17.8, 25.3),
    (10.9, 19.0),
    (20.2, 18.0),
]

# Windows picks the closest entry per context (16 = tray/title bar, 256 = Explorer's largest tile).
ICO_SIZES = [16, 24, 32, 48, 64, 128, 256]


def _scaled(value: float) -> float:
    return value * SCALE


def render() -> Image.Image:
    """Draw the ranger star at ``SUPERSAMPLE`` resolution, on its rounded plate."""
    canvas = Image.new("RGBA", (SUPERSAMPLE, SUPERSAMPLE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle([(0, 0), (SUPERSAMPLE - 1, SUPERSAMPLE - 1)], radius=_scaled(PLATE_RADIUS), fill=PLATE)

    # The halo is translucent, so it goes on its own layer and gets composited over the plate.
    halo = Image.new("RGBA", (SUPERSAMPLE, SUPERSAMPLE), (0, 0, 0, 0))
    halo_draw = ImageDraw.Draw(halo)
    box = [
        (_scaled(HALO_CENTER - HALO_RADIUS), _scaled(HALO_CENTER - HALO_RADIUS)),
        (_scaled(HALO_CENTER + HALO_RADIUS), _scaled(HALO_CENTER + HALO_RADIUS)),
    ]
    halo_draw.ellipse(box, fill=HALO_FILL, outline=HALO_LINE, width=max(1, round(_scaled(1))))
    canvas = Image.alpha_composite(canvas, halo)

    ImageDraw.Draw(canvas).polygon([(_scaled(x), _scaled(y)) for x, y in STAR_POINTS], fill=STAR)
    return canvas


def main() -> None:
    """Render the star and write every ICO size into ``assets/walker.ico``."""
    repo_root = Path(__file__).resolve().parents[1]
    target = repo_root / "assets" / "walker.ico"
    target.parent.mkdir(parents=True, exist_ok=True)

    master = render()
    # Every size is reduced straight from the 1024px master. Passing them as ``append_images`` is what
    # makes Pillow *use* them: for a requested size it looks for an exactly-matching provided image and
    # only falls back to resampling one itself (from the 256px entry, not the master) when it finds
    # none. Without this the smaller entries would be reductions of a reduction.
    frames = [master.resize((size, size), Image.LANCZOS) for size in ICO_SIZES]
    frames[-1].save(
        target,
        format="ICO",
        sizes=[(size, size) for size in ICO_SIZES],
        append_images=frames[:-1],
    )

    # A PNG next to it makes the result reviewable at a glance without an icon viewer.
    master.resize((256, 256), Image.LANCZOS).save(target.with_suffix(".png"))
    print(f"wrote {target} ({target.stat().st_size} bytes) and {target.with_suffix('.png').name}")


if __name__ == "__main__":
    main()
