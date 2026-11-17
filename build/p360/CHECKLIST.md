# Phase 360 — the operator's seat

What changed, in one line: when you start a session and it does start, Tortie now closes the New
session sheet on that session, even if something Tortie does just after the start goes wrong (one rare
case stays as it is today, below). It used to show an error for a session that was already running, so
pressing Create again made a second one.

On your own Mac, after you install the release, **there is nothing to do.** You will only ever notice
this on the rare day something goes wrong right after a session starts, and then the right thing just
happens.

## What you should see now

- You press ⌘T, type a name, press **Create**, and the sheet closes on the new session. That is
  unchanged on a normal day.
- On a bad day (the session list is busy, a window cannot be told, or another machine is slow to list
  the new session), the sheet **still closes on the session**. You do not need to press Create again,
  and doing so is never how you get your session.
- On another machine, if the machine's own list has not shown the new session yet, its row may read
  **unreachable** for a few seconds, then its normal status once the machine answers.
- The one exception is unchanged from today: if Tortie's session list stops reading correctly while
  you create a session (the message with **Restart**), the sheet says so, as it always has, and the
  window stays on the session you were in, which still takes what you type. The new session did start
  and keeps running; restart Tortie and it is there. Pressing Create again before then starts nothing.
  That holds on this Mac, and on another machine when the list stops before that machine has
  finished starting the session, unless the session already showed up in a list by then: the sheet
  then closes on it, as it does today.
- On another machine, if the list stops only after that machine finished starting it, the sheet closes
  on the new session, as it does today. From that machine's own tab the window then shows the new
  session, which may read **Machine unreachable** and not take what you type until you restart Tortie,
  also as today. Tortie will not start another session there until the restart.

## What you should NOT see

- An error in the sheet, or a sticky error toast from quick create or an agent hotkey, for a session
  that is in fact running, other than the stopped-list message above.
- Two sessions where you asked for one.
- "Nothing was changed." about a session that did start on another machine. That sentence now appears
  only when nothing started.
- Any line from another machine's login files (for example a "Last login" banner) inside an error
  message.

## The one new message

If you start a session on another machine and that machine answers without starting it, you will
read:

> That machine did not start a session called *name*. Nothing was changed.

That is true when you see it: the machine was asked by the session's own id and holds no such
session, so pressing Create again is the right thing to do.

## If you ever see an error for a session that is running

That would be a defect worth reporting. Open **Settings → Diagnostics → Copy diagnostics** and send
that text. Lines starting "the session started, and …" say which step after the start could not be
done; they carry the session's id and a short code, and never your session's name or what a program
printed.
