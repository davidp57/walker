# Walker 1.16.0 — changing task no longer opens a dialog

The handful of projects you switch between all day now sit on the timer bar itself, one click away.
No Stop, no picker, no scrolling through two hundred charge codes to reach the one you were on an
hour ago.

You don't choose which ones. Walker works them out from your own past entries.

## Switch blocks

Next to the task chip there is now a short row of blocks — one per charge code, with its colour and
its name. Click one and the timer moves onto that code: the entry that was running is closed, a new
one opens, exactly as it would have if you had gone through the picker. Nothing in between.

If the code has several Activities, hovering the block offers them. Clicking without hovering takes
the one you usually work on at that hour, so the common case stays a single click and the rarer case
costs a hover rather than a dialog.

**The row is not a list you maintain.** Walker fills it from what you actually do: the codes you tend
to work on around this time of day, on this kind of day, topped up with whatever you worked on most
recently so the row is never half-empty. It follows the clock — the blocks you see first thing in the
morning are not necessarily the ones you see after lunch.

**But they never move under your cursor.** The blocks are sorted alphabetically, not by how likely
Walker thinks each one is. What is in the row changes with the hour; where each block sits does not.
That distinction is the whole point: you click a block by position, often without reading past the
colour, and a row that reshuffled itself at midday would book your afternoon to the wrong project
without either of you noticing until the end of the period.

**The code you're currently tracking never gets a block.** It is already on the bar, right beside
them, as the task chip. To change just the Activity on the code you're already on, use the chip.

The blocks show as long as there is room. On a narrow window the description field moves to its own
line to make space; narrower still and fewer blocks are shown. **Settings › Switch blocks** sets how
many you want — or `0` to remove the row entirely.

## Before you upgrade

**No migration, and nothing breaks.** The new preference lives alongside the others; the code picker,
including its "Likely at this time" band, behaves exactly as it did.

**The row appears on its own.** It is on by default — four blocks — so the first time you open Walker
after upgrading, your timer bar will have a row it didn't have before. That is deliberate: a feature
that ships switched off is a feature nobody finds. Set it to `0` in Settings if you would rather not
have it.

**A fresh install sees nothing at first.** The blocks are built from your past entries, so with no
history there is nothing to show and the row is simply absent. Track a few days and it fills in by
itself. This is not a setting you have missed.

**One rough edge, known and not yet fixed.** Starting the timer widens the clock-and-buttons area on
the right of the bar by a fair margin, which leaves less room for the blocks. On a mid-width window
that can push them off exactly when you want to switch. Widening the window brings them back; it is
on the list.
