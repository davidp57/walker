# CHR-015 — The standalone `.exe` wears the app's own icon, and can be told not to open a browser

ID: CHR-015
Status: ✅ done
Type: chore
Priority: P3

## Parent

Lot POLISH — `.backlog/POLISH/PRD.md`. Two small corrections to the standalone distribution shipped
in CHR-009.

## Problem

Two rough edges on the `.exe`, both noticed in daily use:

1. **It always opens a browser.** Right for a double-click — the reference way to run it — and wrong
   everywhere else: launched from a shell, from a scheduled task, or restarted while the app is
   already open in a tab, it hijacks the foreground and adds a duplicate tab each time. There was no
   way to say no: `standalone.py` parsed no arguments at all.
2. **It wears PyInstaller's generic icon.** In Explorer, on the taskbar, and above all as a pinned
   shortcut, Walker is indistinguishable from any other unbranded single-file executable — while the
   app itself has had a ranger star as its mark since the start (sidebar badge, browser tab).

## Solution

- **`--no-browser` (short `-B`)** on the standalone entry point, via `argparse`. Opening the browser
  stays the default, so double-clicking is unchanged. The startup banner already prints the URL, so
  suppressing the browser leaves the user with something to click.
- **The executable carries the app's ranger star.** Not a new icon: the *same* mark as
  `frontend/public/favicon.svg` — same rounded plate, same halo, same star coordinates — so the
  `.exe`, the browser tab and the sidebar badge read as one identity instead of three lookalikes.

## Implementation notes

The `.ico` is a **committed source asset** (`assets/walker.ico`, seven sizes from 16 to 256 so
Windows picks the right one per context), rendered at authoring time by `scripts/make-icon.py`. That
keeps Pillow out of the project's dependencies entirely: neither CI nor a contributor needs an SVG
rasterizer to build the `.exe`. `assets/walker.png` sits beside it so a future change to the icon is
reviewable in a GitHub diff, which renders PNGs but not `.ico` files.

## Acceptance criteria

- [x] `walker.exe --no-browser` (and `-B`) serves the app without opening a browser; with no flag,
      the browser opens exactly as before.
- [x] An unknown flag is rejected rather than silently ignored.
- [x] The built `.exe` carries the ranger star, at every size Windows asks for.
- [x] Regenerating the icon is documented and reproducible from the favicon.
- [x] The docs site's standalone-`.exe` page mentions the flag (EN + FR, per CHR-010).
- [x] Quality gate clean.

## Blocked by

None.

## Delivery

Shipped in [PR #158](https://github.com/davidp57/walker/pull/158) -> `develop`, with the review
follow-up in [PR #159](https://github.com/davidp57/walker/pull/159) (the CLI tests stubbed the server
out without ever asserting it started, so they could not have caught `main` dropping `uvicorn.run`).

Reaches a user only through the next tagged release, since the `.exe` is built by `cd-exe.yml` on a
version tag.
