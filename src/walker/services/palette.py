"""Curated code-colour palette + least-used-first suggestion (BIZ-048).

Single source of truth for the 64-colour palette, mirrored on the frontend in
``frontend/src/lib/palette.ts``; a contract test on each side asserts both equal the shared fixture
``tests/fixtures/palette.json`` (same pattern as ``resolve_theme``/``resolveTheme`` and the
virtual-code resolution contract), so a change to one that isn't mirrored fails a test instead of
silently diverging.

Display order is by hue — an 8×8 grid reads as a spectrum. Ordering is presentational only; there
are no colour "families". Every colour sits at a mid lightness so it stays legible in both the light
and dark themes.
"""

from __future__ import annotations

import random
from collections import Counter
from collections.abc import Iterable

# The 64-colour palette, hue-ordered (see module docstring). Mirror of ``frontend/src/lib/palette.ts``.
PALETTE: list[str] = [
    "#d65151", "#dc756a", "#d66a51", "#dc8a6a", "#d68351", "#dca06a", "#d69c51", "#dcb56a",
    "#d0ab39", "#d6c251", "#d0c739", "#d2d651", "#bed039", "#b9d651", "#a1d039", "#a0d651",
    "#94d651", "#99dc6a", "#7bd651", "#83dc6a", "#62d651", "#6edc6a", "#51d65a", "#6adc7c",
    "#39d05f", "#51d67f", "#39d07b", "#51d698", "#39d098", "#51d6b1", "#39d0b4", "#51d6ca",
    "#51d6d6", "#6ad1dc", "#51bdd6", "#6abcdc", "#51a5d6", "#6aa7dc", "#518cd6", "#6a91dc",
    "#395fd0", "#5166d6", "#3942d0", "#5651d6", "#4c39d0", "#6f51d6", "#6839d0", "#8751d6",
    "#9451d6", "#ae6adc", "#ad51d6", "#c36adc", "#c651d6", "#d96adc", "#d651ce", "#dc6aca",
    "#d039ab", "#d651a9", "#d0398e", "#d65190", "#d03972", "#d65177", "#d03955", "#d6515e",
]  # fmt: skip

_PALETTE_SET = set(PALETTE)


def _normalize(color: str) -> str:
    """Lower-case a hex colour so palette membership is case-insensitive."""
    return color.strip().lower()


def least_used_colors(used: Iterable[str]) -> list[str]:
    """Return the palette colours with the minimal usage count across ``used``.

    Counting is **palette-only**: a colour in ``used`` that is not one of the 64 (a legacy hex or an
    arbitrary analog pick) is ignored and lights no swatch. While free colours remain the minimum is
    0 (avoid already-chosen); once every colour is used it degrades to 1, then 2, … — one rule that
    unifies avoidance and graceful saturation. Order follows :data:`PALETTE`.
    """
    counts = Counter(c for c in (_normalize(c) for c in used) if c in _PALETTE_SET)
    minimum = min(counts.get(c, 0) for c in PALETTE)
    return [c for c in PALETTE if counts.get(c, 0) == minimum]


def suggest_color(used: Iterable[str], *, rng: random.Random | None = None) -> str:
    """Pick a colour uniformly at random among the least-used palette colours (BIZ-048)."""
    candidates = least_used_colors(used)
    return (rng or random).choice(candidates)
