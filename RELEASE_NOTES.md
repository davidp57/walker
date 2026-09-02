# Walker 1.15.0 — no more charging to a code that died months ago

Walker stops letting you book time against charge lines that no longer exist. Import your complete
catalog and it now tells you which of *your own* codes the file didn't contain — including the one
you cannot see, the hidden code another of yours quietly charges through — and offers to retire it or
point it somewhere else.

And if your antivirus confiscates the executable, there is now a second download to fall back on.

## Your catalog stops hiding dead codes

Importing a complete catalog removes reference codes the file omits, but it has always left the codes
in your own list alone — the time booked to them is real, and deleting them would be worse. The
consequence was quiet and permanent: a charge line closed in your timesheet system stayed live in
Walker, offered in every picker, with nothing on screen saying it was dead.

The worst version was invisible. When one of your codes charges *through* another one, Walker keeps
that underlying code hidden — so your code looks perfectly healthy while what it actually charges to
has been locked for months. There was no way to notice.

After a complete-catalog import, Walker now names the codes the file didn't contain, names the codes
of yours that depend on each of them, and offers the two things worth doing:

- **Retire it** — right when the charge line really has closed. The time already booked stays exactly
  as it is; the code simply stops being offered.
- **Repoint it** — when other codes of yours charge through it. Choose the replacement once and all
  of them follow, in a single step.

The note then stays on the code in the **Code catalog**, so a decision you postpone doesn't quietly
disappear along with the message.

**Nothing is changed for you.** A code can be missing simply because your export covered part of the
catalog rather than all of it — that is a real case, not a hypothetical — and retiring a code you
still book to would be far worse than saying nothing.

## A second download, when the first one gets blocked

`walker.exe` is a single file that unpacks itself in memory when it starts. Convenient, and — to an
antivirus heuristic — indistinguishable from how real malware hides. Microsoft Defender quarantined
the 1.14.0 executable minutes after it was published.

**This is the first release to carry both downloads.** Alongside `walker.exe` there is now
`walker-1.15.0-windows.zip`: the same program, with its dependencies in a folder beside it instead of
hidden inside it, so nothing self-extracts at startup and there is far less for an antivirus to
object to.

Start with `walker.exe`. If it is blocked or disappears, take the zip. Both keep your data in the
same place, so switching costs you nothing.

The download page now walks through the zip properly: unblocking the archive *before* extracting it
(so the internet mark isn't copied onto every file inside), where to put it, why `walker.exe` and its
`_internal` folder are one unit that must stay together, and how to upgrade a folder rather than a
file.

## Before you upgrade

**There is a migration this time.** A new column records when a complete-catalog import last found a
code missing. The standalone build and the Docker image apply it themselves on startup — you only run
`alembic upgrade head` by hand in the raw development flow.

**Nothing is flagged retroactively.** Upgrading does not make a list of dead codes appear: the column
starts empty, and it is your **next complete-catalog import** that makes the comparison. If you have
been charging to a closed code for months, run that import to find out.

**No breaking changes.** The API gained two fields, both optional with defaults.
