# Self-hosting: Standalone `.exe` (Windows)

For Windows users who don't want to install Docker, Python, or Node, Walker is also published as a
single self-contained executable.

!!! note
    The standalone `.exe` build is produced by its own release pipeline. If you don't see one on the
    Releases page yet, use the [Docker option](docker.md) instead in the meantime.

## Download and run

1. Go to the project's [Releases page](https://github.com/davidp57/Walker/releases) on GitHub.
2. Download the `.exe` attached to the latest release.
3. Double-click it.

That's it — no installer, no admin rights, no separate database setup. On first launch Walker starts
its own local web server and automatically opens your default browser pointed at the running app
(`http://localhost:8000`). A console window stays open in the background while Walker is running;
closing it stops the app.

## Where your data lives

The standalone build keeps its SQLite database in your Windows user profile
(`%APPDATA%\Walker\walker.db`), not next to the executable itself. That means:

- You can move, rename, or delete the `.exe` file without losing your data.
- Downloading a newer `.exe` and running it picks up your existing data automatically — any schema
  changes are applied in the background on startup, so upgrading never means starting over.

## When to prefer this over Docker

The standalone `.exe` is the fastest way to try Walker or to run it permanently on a personal Windows
machine with nothing else installed. If you want to run Walker on a server, share it with others, or
you're not on Windows, use the [Docker option](docker.md) instead.
