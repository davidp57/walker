# Self-hosting: Standalone `.exe` (Windows)

For Windows users who don't want to install Docker, Python, or Node, Walker is also published as a
self-contained program, in two packagings.

!!! warning "Two downloads, because antivirus software sometimes objects"

    `walker.exe` is a single file that unpacks itself in memory when you start it. That is very
    convenient — and, to an antivirus heuristic, indistinguishable from the trick real malware uses
    to hide. Microsoft Defender has quarantined it before. It says nothing about the file being
    unsafe, but there is no way for us to prove that to your antivirus.

    So there is a second download, `walker-<version>-windows.zip`: the same program, with its
    dependencies in a folder next to it instead of hidden inside it. Nothing unpacks itself at
    startup, which is much less likely to alarm anything. It costs you one unzip.

    **Start with `walker.exe`. If it disappears, gets blocked, or refuses to start, take the
    `.zip`.** Both keep your data in the same place, so you can switch at any time without losing
    anything.

!!! note
    The standalone build is produced by its own release pipeline. If you don't see one on the
    Releases page yet, use the [Docker option](docker.md) instead in the meantime.

## Download and run

1. Go to the project's [Releases page](https://github.com/davidp57/Walker/releases) on GitHub.
2. Download one of the two assets attached to the latest release:
    - `walker.exe` — one file, nothing to unpack.
    - `walker-<version>-windows.zip` — unzip it anywhere, then open the `walker` folder.
3. Double-click `walker.exe`.

That's it — no installer, no admin rights, no separate database setup. On first launch Walker starts
its own local web server and automatically opens your default browser pointed at the running app
(`http://localhost:8000`). A console window stays open in the background while Walker is running;
closing it stops the app.

!!! tip "If your antivirus removes it"

    A quarantined download is almost always the single-file `walker.exe` being judged on *how* it
    starts rather than on what it does. In order of least effort:

    - **Use the `.zip` instead.** It doesn't behave the way that triggers the alarm.
    - **Report it as a false positive** to Microsoft at
      [WDSI file submission](https://www.microsoft.com/en-us/wdsi/filesubmission). That usually
      clears the specific file within a day or two — but each new Walker release is a brand-new
      file, with no reputation of its own, so it starts over.
    - **Restore it from quarantine.** On a personal machine this is your call. On a computer managed
      by an employer, it is your IT department's — and doing it yourself may raise an alert.


## Starting it without opening a browser

Opening a browser is what you want from a double-click, and rarely what you want anywhere else — from
a shell, from a scheduled task, or when you restart Walker while it is already open in a tab. Pass
`--no-browser` (or `-B`) to skip it:

```
walker.exe --no-browser
```

Walker still prints the address it is serving on, so you can open it yourself whenever you like.

## Where your data lives

The standalone build keeps its SQLite database in your Windows user profile
(`%APPDATA%\Walker\walker.db`), not next to the executable itself. That means:

- You can move, rename, or delete the `.exe` file without losing your data.
- Downloading a newer `.exe` and running it picks up your existing data automatically — any schema
  changes are applied in the background on startup, so upgrading never means starting over.
- **Both downloads share that database.** Switching from `walker.exe` to the `.zip` (or back)
  changes nothing about your codes, your entries, or your history.

## When to prefer this over Docker

The standalone `.exe` is the fastest way to try Walker or to run it permanently on a personal Windows
machine with nothing else installed. If you want to run Walker on a server, share it with others, or
you're not on Windows, use the [Docker option](docker.md) instead.
