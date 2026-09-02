# TEC-021 — Ship the standalone build as both onefile and onedir, and document the Defender risk

ID: TEC-021
Status: 🧑 waiting-human
Type: operability
Priority: P2

## Parent

Lot TECH — `.backlog/TECH/PRD.md`. Touches the standalone `.exe` pipeline built in **CHR-009** and
refined in **CHR-015**.

## Problem

On 2026-09-02, minutes after the v1.14.0 release, Microsoft Defender quarantined `walker.exe` on the
maintainer's machine: `Behavior:Win32/DefenseEvasion.A!ml`, ThreatID 2147738096, severity *Severe*.
It acted on three resources at once — the executable, its taskbar shortcut, and **the two running
processes**. The running server therefore lost its own file mid-request and every route started
returning 500 with `OSError: [Errno 22] Invalid argument: '...\walker.exe'`, which reads like a
Walker bug and is not one.

**Nothing in our build changed.** Verified by diffing the tags: `walker.spec`,
`scripts/build-exe.ps1` and `.github/workflows/cd-exe.yml` are identical between `v1.13.0` and
`v1.14.0`, and `pyproject.toml` differs by the version string alone. What changed is outside the
repo:

- Defender's signature set refreshed on 2026-09-01 at 18:05, between the two releases. The `!ml`
  suffix marks a machine-learning verdict, not a fixed signature — the same bytes can be judged
  differently from one day to the next.
- More fundamentally, **every release produces a brand-new hash with zero prevalence**. Defender's
  cloud judges an unsigned binary that nobody in the world has ever run far more harshly than one
  that has been in circulation for a fortnight. v1.13.0 was not safer; it had accumulated
  reputation.

So this is a coin flip, and it will be re-tossed at **every** release.

What puts Walker on the table at all is a deliberate packaging choice: `walker.spec` produces a
**onefile** binary (a single `EXE(...)`, no `COLLECT`). Its bootloader unpacks its own appended
archive and executes code from it at startup — the textbook shape of a packer, hence a
`DefenseEvasion` verdict, hence a `Behavior:` detection that fires at *runtime* rather than on
download.

The maintainer's machine is centrally managed: Tamper Protection is on and exclusions are not even
readable without administrator rights, so "just add an exclusion" is not available to the user, and
restoring a *Severe* detection from quarantine raises a SOC signal.

## Decision

Do **not** silently swap onefile for onedir. Ship **both**, and let whoever downloads decide:

- `walker.exe` — one file, double-click, nothing to unpack. Most convenient, most likely to be
  flagged.
- `walker-<version>-windows.zip` — an onedir build (executable plus its dependencies in a folder).
  No self-extraction at startup, so it presents far less like a packer. Costs one unzip step.

Neither is presented as *the* safe option: onedir is expected to be flagged much less often, not
never. The point is to give the user a second thing to try when the first is quarantined, instead of
leaving them with a broken download and no recourse.

## Work

1. **Build both.** `walker.spec` currently ends at `EXE(...)`. Add a onedir variant (a second spec,
   or one spec producing `EXE` + `COLLECT`) and zip the collected folder. Both must keep the console
   window (CHR-009), the icon (CHR-015), `--no-browser` (CHR-015), and the bundled Alembic chain.
2. **Attach both** in `.github/workflows/cd-exe.yml` — `softprops/action-gh-release` takes several
   `files:`. Keep uploading both as workflow artifacts on `develop` pushes too, so either can be
   smoke-tested before a release.
3. **Document the choice where people download**, not buried:
   - `docs-site/self-hosting/standalone-exe.md` and its `.fr.md` sibling — a `!!!` admonition at the
     **top of the page**, in the same place and the same shape as the existing note about the build
     pipeline, explaining the two artifacts, why an antivirus may quarantine the single-file one,
     and that this says nothing about the file being unsafe.
   - The `README.md` standalone section, briefly, pointing at that page.
   - Note that `RELEASE_NOTES.md` is **not** the place: it is rewritten every release, so a
     permanent caveat cannot live there.
4. **Say what to do when it happens**, on the same page: try the zip; report the false positive to
   Microsoft ([WDSI file submission](https://www.microsoft.com/en-us/wdsi/filesubmission)), which
   usually clears that specific hash within a day or two but does nothing for the next release; and,
   on a managed machine, that the decision to restore from quarantine belongs to whoever administers
   it.

## Outcome

Built. `walker.spec` now produces either packaging from one Analysis, selected by
`WALKER_BUILD_MODE` (`onefile` by default, `onedir` otherwise) — one spec rather than two, so the
two artifacts cannot drift apart in hidden imports or bundled data. `scripts/build-exe.ps1` gained
`-Mode onefile|onedir|both` (default `both`) and `-SkipFrontend`, and zips `dist/walker` itself so
the archive carries a single top-level folder. `cd-exe.yml` runs both builds, zips, and attaches
both to the Release; `develop` pushes upload both as workflow artifacts.

Verified locally: both binaries start, run the Alembic chain, serve the SPA, honour `--no-browser`,
and resolve their database through `standalone.py` (smoke-tested against a throwaway `APPDATA` so
the real one was never touched). The zip holds one `walker/` root, 324 entries, 30.3 MB.

Neither locally built binary was flagged by Defender — which proves **nothing** and was not counted
as evidence. A locally produced file carries no Mark-of-the-Web and no cloud reputation lookup of a
freshly downloaded artifact. The claim in this ticket can only be tested on a binary **downloaded
from a GitHub Release**, which is what the remaining unticked box is for.

## Open questions

- Which one does the docs page **recommend** by default? — Settled: `walker.exe` first, the zip as
  the fallback when it is blocked. Convenience wins until it doesn't, and the page says exactly
  when to switch rather than making the reader choose blind.
- Naming and layout of the zip's contents — Settled: `walker-<version>-windows.zip`, one `walker/`
  folder inside.
- Both builds resolve their database to `%APPDATA%\Walker\walker.db` via `standalone.py`, so a user
  can switch between artifacts without touching their data — stated on both docs pages, in both
  languages.
- Is code signing reachable at all? **Still open.** It is the only real fix; everything above is
  mitigation. Record the answer here even if it is "no", so it stops being re-litigated.

## Acceptance

- [x] A version tag publishes both `walker.exe` and the onedir zip to the GitHub Release.
- [x] The onedir build starts, migrates, serves the SPA, and honours `--no-browser`, reading the
      **same** `%APPDATA%\Walker\walker.db` as the onefile build.
- [ ] The onedir build has been **downloaded from a Release** onto the maintainer's managed machine
      and observed not to be quarantined — the claim is verified, not assumed. If it is flagged too,
      that outcome is recorded here and the ticket's premise revisited. *This is what the ticket is
      waiting on.*
- [x] Both docs-site pages carry the top-of-page admonition, in English and French.
