# Phase 333.12 — an update keeps every paired phone working: his checklist

One row, on his own Mac and his own iPhone, after this phase lands and before the release that carries it
(build/p33312/SPEC.md §9.4). `probe:p33312` already drove every arm of this phase against stand-ins; this row is the one
thing a stand-in cannot be, his real Funnel and a Tortie opened the way he opens it. No phone build is needed: no phone
code moved.

You need: your iPhone paired with the Mac you use every day, running Tortie 0.111.1 or 0.111.2 (both answer the same
eleven routes), with alerts on and a working door on your real Funnel; and the build of this phase, packaged.

## The row

1. **Update with no press.** Quit Tortie. Install the 333.12 build over it. Open Tortie **from the Dock**, not from a
   shell: a shell gives the Tailscale child a variable a Dock launch does not, which is 0.111.1's lesson.
   **You should see**, pressing nothing:
   - the iPhone keeps reading: **Needs input** and **Sessions** load, and a session's **Terminal** draws;
   - **Settings then Phone** shows **Published** in step 2 and **no Allow** anywhere on it;
   - an alert on the iPhone when a session starts waiting on you.

   **Turn alerts off** (the switch in Settings then Phone).
   **You should see** no Allow asked for, and the iPhone still reading.

   **Turn alerts back on.**
   **You should see** one Allow, whose lines are the lines you allowed before with only the alerts line changed. Press
   **Allow**; the iPhone keeps reading and alerts come back.

If Settings then Phone asks for Allow after the update with nothing else changed, or the iPhone stops reading, that is
the defect this phase removes: tell the main session what the lines say, then press Allow, which puts you back where
0.111.1 left you.

## Not covered here, and where it is

- **A new route waiting for Allow.** No route is added until Phase 346, so there is nothing to wait yet on your Mac.
  `probe:p33312` plants one (`probe`) and reads it waiting, refused with `404`, untouched by a pairing or by alerts off,
  and answered after the Allow whose lines name it.
- **Removing one of two phones.** It keeps the other reading with no Allow (his answer 9); `probe:p33312` H8 drives it
  with three node phones. Removing your only phone still asks for Allow again, as today.
- **Going back to 0.111.1.** While nothing beyond the eleven routes was ever allowed, going back changes nothing. After a
  later build's route was allowed, 0.111.1 reads the agreement as changed and asks for Allow, and the newer build asks
  again when you return. Never wider than what you allowed (`probe:p33312` DG1, DG2).
