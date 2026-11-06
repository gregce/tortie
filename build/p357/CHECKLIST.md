# Phase 357 — the operator's seat

What changed, in one line: if Tortie's session list ever stops reading correctly while Tortie is
running, Tortie now says so once and offers a Restart, instead of an error dialog every few seconds
and a crash when you quit. Your sessions keep running either way.

On your own Mac, after you install the release, **there is nothing to do** unless the notice ever
appears. Everything below is only for the day it does.

## If the notice appears

You will see one sticky message at the bottom of the window:

> Tortie's session list stopped reading correctly. Your sessions are still running. Restart Tortie
> to load it again.

with a **Restart** button beside it.

1. Your sessions are still running. Nothing you had open was ended, and nothing is being lost while
   the message is up — Tortie has stopped writing to the session list on purpose, so a problem in
   memory cannot reach the file on disk.
2. Press **Restart**. Tortie quits and comes straight back.
3. When the window comes back, check that your sessions are there, in the projects they were in. They
   should all be present; this is the same list Tortie loads at every launch.

That is the whole fix. You do not need to find or delete anything, and you never need to quit by hand
first.

## What you should NOT see

- No repeated error dialogs. (Before this phase, one appeared every few seconds.)
- No crash when you quit. (Before this phase, quitting crashed.)
- After the restart, no "Tortie did not shut down cleanly" message, and no message that your session
  list was damaged and rebuilt — unless the file on disk really was damaged, which is a different
  case the app already handled and still does.

## If pressing Restart does nothing, or the window comes back empty

That would be a defect worth reporting. Open **Settings → Diagnostics → Copy diagnostics** and send
that text. The one line that matters is in the log under the word `manifest.stopped`; it names which
read stopped and whether the file itself was fine, and it carries none of your session names.
