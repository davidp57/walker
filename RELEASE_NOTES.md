# Walker 1.11.0 — a code catalog you can keep

A catalog only ever grew. A project ended, a charge line was replaced by its successor — and the dead
code stayed, sitting in every picker, as easy to click as the live one. You could not delete it either:
the time already booked to it is real, so Walker refused, with a greyed-out ✕ and nothing to act on.

This release makes the catalog something you can maintain. You can **retire** a code that is over,
**find out exactly what blocks** a deletion and clear it, and **ask how much time you have spent** on
any code over any span. One theme, three answers.

Upgrading is drop-in: replace the image (or the `.exe`) and your data carries over.

## Highlights

- **Retire a code instead of deleting it.** It leaves the catalog and every picker; everything already
  booked to it goes on reading exactly as before.
- **A blocked deletion now explains itself** — how many entries, over what dates, for how long — and
  offers the two ways out.
- **"How much time did I spend on this?"** answered at last, over any range, from the catalog.

## New

- **A code can be retired.** A closed project or a superseded charge line is neither live nor deletable,
  and Walker had no word for that. Retiring one takes it out of the catalog — behind a `Retired (N)`
  toggle, so nothing ever silently vanishes — and out of **every** picker, including the "Likely at this
  time" band. That last one matters: the band ranks your past entries, so without it a retired code would
  keep being proposed precisely because you used to work on it a lot.

  Everything the code already carries reads exactly as before: past entries, the period grid and the
  checklist still show its number, label and colour. Retiring is not deleting, and it must never make old
  work unreadable. You can bring a code back at any time, and a retired code is still deletable through
  the normal path if you really want it gone.

  When you retire a code you can optionally **move the current period's entries** onto a replacement code
  and activity, in one step. Earlier periods are deliberately left alone — see the note below.

- **Time spent on a code, over any range.** From the catalog: the total, the split per activity, how many
  entries and how many distinct days. Presets for all time (the default, since the question usually needs
  no dates at all), the current period, this month and this year, plus a custom range.

  Every other total in Walker is bound to a Timesheet period, because that is what the Timesheet system
  wants. This one is not, which is the whole point — a range may span several periods, or none completely.
  A virtual code reports **its own** time; a real code also shows a roll-up including its virtual codes,
  the two side by side and never merged, because "time on this project" legitimately means both.

- **A blocked code deletion tells you what is in the way.** It used to refuse with a bare "referenced by
  entries", and the ✕ was greyed out so you could not even reach the refusal. You now see how many entries
  hold the code, over what date range, for how many minutes — and you can either reassign them to another
  code and activity, or delete them behind a deliberate second step that says what will be lost. Once
  nothing blocks, the code deletion finishes on its own rather than making you click again.

- **The number of likely codes in the picker is yours to set.** A Settings control, 0 to 10. `0` hides
  the band entirely, so there is no second toggle to find. The default stays 5 — chosen after living with
  it, which is why this was held back a release.

## Fixed

- **The Delete button no longer disappears from the code editors for the wrong reason.** Whether a code
  was "in use" was decided from the entries Walker happened to have loaded — roughly a fortnight. So a
  code you used last month looked free, while one you used last week quietly lost its Delete button with
  nothing saying why. The server decides now. The one block that remains client-side — virtual codes
  pointing at this one — says so instead of just removing the control.

## Notes worth keeping

- **The sweep covers the open period only, and that is deliberate.** Earlier periods have already been
  keyed into the Timesheet system. Rewriting their entries would leave Walker permanently out of step with
  what you actually declared, and Walker's entire contract is to mirror that, not to rewrite it. The open
  period is the only one still being edited, so it is the only one where moving entries is a correction
  rather than a falsification. Entries older than that keep pointing at the retired code — which is
  exactly why a retired code stays fully readable instead of being deleted.

- **Two of this release's changes came from the same blind spot.** Walker decided whether a code was "in
  use" from the entries currently loaded in the browser — never the whole history. It was wrong in both
  directions, and it was wrong quietly. The catalog and the code editors now both defer to the server,
  and the guess has been removed from the codebase so it cannot come back through a third caller.

- **Retiring a shared code affects everyone.** Real codes belong to your Organization, not to you, so
  retiring one hides it for every member. The dialog says so before you confirm — and says nothing of the
  sort for a virtual code, which is yours alone.

## Upgrading

Drop-in. Replace the image (or the `.exe`) and your existing data carries over unchanged. No
configuration change, and no existing endpoint or field changes shape.
