# Walker 1.13.0 — the standalone `.exe` grows up

A small release, entirely about the standalone Windows build. Two things that had been quietly
annoying: the executable looked like nothing in particular, and it always took over your screen.

If you run Walker under Docker or hosted, this release changes nothing for you — skip it without
regret.

## Fixed

- **It no longer insists on opening a browser.** Doing so is exactly right for a double-click, and a
  nuisance everywhere else: started from a terminal, from a scheduled task, or restarted while Walker
  is already open in a tab, it grabbed the foreground and left you with a duplicate tab to close.
  Pass `--no-browser` (or `-B`) and it just serves:

  ```
  walker.exe --no-browser
  ```

  The address it is serving on is still printed on startup, so there is something to click when you
  do want it. Double-clicking is unchanged — the browser still opens, because that is the whole point
  of a double-click.

- **It carries Walker's own icon.** In Explorer, on the taskbar, and above all as a pinned shortcut,
  the executable used to be indistinguishable from any other unbranded single-file `.exe`. It now
  wears the ranger star — the *same* mark as the browser tab and the sidebar badge, not a second one
  drawn for the occasion — at every size Windows asks for, from the 16-pixel title bar to Explorer's
  largest tile.

## Notes worth keeping

- **Windows may show you the old icon for a while.** It caches icons aggressively, so a shortcut you
  pinned before upgrading can keep displaying the generic one. Unpinning and re-pinning it settles the
  matter; nothing is wrong with the executable.

- **Nothing to migrate.** No schema change, no API change, no configuration change. Replace the
  `.exe` and carry on — your database in `%APPDATA%\Walker` is untouched.

## Upgrading

Download the new `walker.exe` from the release and run it. If you are still on 1.11.x, note that
**1.12.0** carried a real data fix — a Timer left running overnight used to destroy the day it had
been tracking — so it is worth reading that release's notes as you pass through.
