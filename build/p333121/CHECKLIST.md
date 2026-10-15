# Phase 333.12.1 — the phone's Allow in a few lines: your checklist

Two rows, at your own Mac (build/p333121/SPEC.md §7.5). `probe:p333121` already read every word and rectangle of
this screen against stand-ins, beside the build before it; these rows are the one thing it cannot be, your own eyes
on your own door. No phone build is needed: no phone code moved.

You need: this phase's build running on your Mac (`npm run dev` in your checkout, or the package), your iPhone
paired, and alerts on.

## The rows

1. **The four lines.** In **Settings then Phone**, turn alerts **off** (no Allow is asked for), then back **on**.
   **You should see** step 2 say **Changed since you allowed it**, and under it four short lines:
   - **Reachable at** your Mac's public name and port, by **Tailscale** (or the program's whole path, when yours is
     not the app in Applications);
   - **Your phone can** see your sessions, type into them, answer questions, send a message, end a session;
   - **Phones** your iPhone's name;
   - **Alerts** through Apple, never what an agent asks;

   then **Allow** on the right, and **Details** shut under it. Nothing else, no paragraph.
   Open **Details** (click it, or Tab from Allow and press Return).
   **You should see** the lines you allowed before, word for word, with only the alerts line changed, and the two
   warnings under them. Press **Allow**. **You should see** step 2 go back to **Published**, and the iPhone read
   again (a changed door answers nothing until it is allowed, as today).

2. **One new feature, one line** (after the update that lets your phone start a session, Phase 346). Install that
   build and open Tortie, pressing nothing.
   **You should see** step 2 still **Published**, the iPhone still reading, and one line:
   **New: start a session from your phone**, with **Allow** on the same line and one sentence under it, then
   **Details**. Open **Details**: the line listing what the door answers names the new route. Press **Allow**.
   **You should see** the line go, and the iPhone able to start a session.

If either face shows a long block of lines at rest, or Details is open before you open it, tell the main session
what it shows; pressing **Allow** is still safe, because it records exactly the lines in Details.

## Not covered here, and where it is

- **A first setup on a Mac with no phone.** The same four lines read **Read, then allow**, with **Phones** none
  yet and **Alerts** off. `probe:p333121` N1 to N5 reads it in the real app at three widths.
- **A route with no title of its own.** It is drawn by its id (`New: probe`) rather than left off;
  `probe:p333121` W1 plants one and reads it.
