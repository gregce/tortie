# Phase 345 — one iPhone, several Macs: his checklist

For the one TestFlight build after 345 and 346 land (build/p345/SPEC.md §5.6). Each row says what to open, what to press
and what you should see. The words in quotes are the words on the screen; the table at the foot says the file each one
was found in on the tree this was written against, so a word that moves is found again.

You need: your iPhone with **the public build** (build 10, from the App Store or TestFlight) installed and **paired with
your Mac Pro**, which holds your alert key and sends your alerts; your MacBook running Tortie from main after this phase
has landed, with its door on in **Settings then Phone**; and on each Mac at least one session, with one waiting on you on
the Mac Pro.

## The rows

1. **The upgrade keeps the pairing.** Before you install anything, open Tortie on the iPhone and look at **Needs input**,
   **Sessions** and **Settings**, so you know how they look. Then install this build from TestFlight **over** the public
   one. Do not delete the app first: deleting it forgets the pairing, which is what an uninstall has always done.
   Open Tortie.
   **You should see** no pairing screen: **Needs input** with your Mac Pro's sessions, as before.

2. **Every screen as before.** Open **Sessions**, open a session, open its `Catch Me Up`, then open **Settings**.
   **You should see** every screen exactly as it was on the public build, with ONE new row in Settings:
   `Pair another Mac`, between your Mac's cards and `Unpair this iPhone`. The bar at the bottom still has three tabs.

3. **Pair your second Mac.** On the MacBook open **Settings then Phone** and press **Pair a Phone…** so it shows a code.
   On the iPhone, in **Settings**, press `Pair another Mac` and scan the MacBook's code.
   **You should see** the code's six groups on both screens. Press **Allow** on the MacBook.
   **You should see** the sheet close onto the MacBook's **Needs input**, and a fourth item at the right of the bottom
   bar, named after the MacBook (its first word, for example `macbook`), with a computer for its picture.

4. **One tap switches.** Press that fourth item.
   **You should see** `Macs`, a row for each Mac with the MacBook ticked, and under the Mac Pro `Needs your input (1)`
   when a session there waits on you. Tap the Mac Pro's row.
   **You should see** the Mac Pro's **Needs input**; the fourth item is now named after the Mac Pro. **Sessions** and
   **Settings** are the Mac Pro's alone. Switch back: the MacBook's tabs are where you left them.

5. **An alert from the Mac that sends.** Stay on the MacBook. On the Mac Pro, start something that waits on you.
   **You should see** the alert arrive on the iPhone as before. Tap it.
   **You should see** the Mac Pro chosen and that session open.

6. **Unpair one Mac.** With the MacBook chosen, in **Settings**, press `Unpair this iPhone`, then `Unpair`.
   **You should see** the Mac Pro's **Needs input**, never the pairing screen, and the bar back to three tabs.
   **Settings** shows `Pair another Mac` again. The MacBook still lists the iPhone in its **Settings then Phone** until
   you press **Remove** there, as before.

## Words, and where they were found

| On screen | Found in |
| --- | --- |
| `Pair another Mac` | ios/Tortie/Style/Copy.swift, `pairAnotherMac` |
| `Macs` | ios/Tortie/Style/Copy.swift, `macs` |
| `Needs your input (1)` | ios/Tortie/Style/Copy.swift, `needsYourInputLead` and `countClose` |
| `Unpair this iPhone`, `Unpair` | ios/Tortie/Style/Copy.swift |
| `Settings then Phone`, `Pair a Phone…`, `Allow`, `Remove` | src/renderer/settings/PhoneSection.tsx, src/main/menu.ts |

## Not covered here

- A session one Tortie started on another machine shows only through that Tortie (his answer 1).
- Alerts come from one Mac (his answer 3). With your key on two Macs, a tap opens **Needs input** on the Mac on screen,
  because the phone cannot tell which Mac sent it (SPEC D24).
- With one Mac kept, **Remove** on that Mac sends the iPhone to the pairing screen, as the public build does, and a
  Mac paired from that screen takes its place rather than standing beside it, as on the public build (SPEC D18a).
- Installing the public build back over this one reads only the first Mac you paired; this build, installed again,
  reads every Mac it kept, unless the public build's Unpair ran in between, which forgets every Mac's key (SPEC D11).
