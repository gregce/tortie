# Phase 330 — the phone never joins the tailnet: your checklist

This is how you check that the iPhone reaches your Mac through Tailscale Funnel, with no key, no policy
edit and no Tailscale on the phone. It is written for you to follow at the Mac with the phone beside you.
Each row says what to open, what to press and what you should see. **It is the only proof of Funnel
itself.** No agent may run `tailscale funnel` on your tailnet, so every agent run drove a stand-in in its
place (`build/p330/tailscale-standin.mjs`), and `probe:p330` passing is the floor, not the finish.

Rows 2 to 10 are the build SPEC's rows 1 to 9 (`build/p330/SPEC.md` §7.5); row 1 is getting the build
running, and rows 11 and 12 are Phase 332's, which makes the first code wait for your Mac's name
(`build/p332/SPEC.md` §7.4). Where a row measures something the SPEC left open, it names it (O1 to O8, SPEC §2.2). Write down
what you see in those rows: they are measurements, and the next phase reads them. The table at the end says
where each button and sentence was checked against the tree, and is for the agents rather than for you.

## Already done

- On 2026-09-29 you approved Funnel for your tailnet with one click (SPEC §2.1 M1). Your Mac,
  `gregs-macbook-pro.tail2ddfe1.ts.net`, holds the `funnel` and `https` capabilities and
  `funnel-ports 443,8443,10000`, and they stay. So Tortie should not ask you to approve anything.
- Your Mac runs Standalone Tailscale 1.102.2 and is signed in.
- Tortie 1.0.0 (1) is on TestFlight. This phase's app is 1.0.0 (2).

## What the first pairing costs, counted (added by the fix round)

- **On your tailnet, which is already approved: about 9 actions.** On the Mac, **Pair a Phone…**, **Pair**
  and **Allow**. On the phone, open Tortie, allow the camera, scan and compare six groups. On the Mac,
  **Allow**.
- **On a tailnet nobody approved yet: about 12 to 18**, because **Open Tailscale** and Tailscale's own page
  come in between (one click on it in your measurement, more if it asks you to sign in).
- **The first code waits for your Mac's name, which can take several minutes** (Phase 332). In your
  measurement your Mac's public name took about 8 minutes to reach public DNS, and a phone that asks too
  early remembers the miss for up to 5 more (SPEC §2.2 O4). So Tortie now asks your name's own DNS servers
  first, and shows the code by itself only once they answer. Until then the **Pair a phone** card shows
  four small dots, one for each of your name's servers, filled as each one sees your Mac's name, beside
  "Publishing your Mac’s name · 2 of 4 see it", and under it how long it has been and when Tortie checks
  again. There is nothing to press, so the first scan should work: no extra actions.

## The checklist

1. **Get this build running on your Mac.** Quit Tortie (⌘Q, or Control-C where you ran `npm run dev`).
   Your sessions keep running, because tmux holds them. Then, in Terminal:

   ```
   cd ~/gmux
   git pull --rebase --autostash origin main
   npm run dev
   ```

   **You should see** Tortie open with your sessions.

2. **Turn the door on and allow it** (SPEC row 1; O5). In the app's own menu, the bold one beside the Apple
   menu (a dev build may name it Electron rather than Tortie), choose **Pair a Phone…**, directly under
   **Settings…**. Settings opens on **Phone**. Under **Pair a phone**, press **Pair**.
   **You should see** lines to read under **Let my phone reach this Mac**, starting "Answers on the internet
   at https://gregs-macbook-pro.tail2ddfe1.ts.net:8443, through Tailscale Funnel on" your tailnet's name,
   then "Publishes it with" the path of your Tailscale program, and ending "Allows no phone yet". No line
   about approving Funnel, because yours is approved. Press **Allow**.
   **You should see** "Starting Tailscale Funnel…" under the switch, then "Answering at
   https://gregs-macbook-pro.tail2ddfe1.ts.net:8443", then "Publishing your Mac’s name" with its dots
   under **Pair a phone**, the count moving as the name's servers see it, then the code on its own with
   "Scan it with Tortie on your iPhone, from tortie.sh/iphone." (that address opens nothing until launch day) and "Do not show this code on a shared screen." You pressed Allow
   once, and that was the last press on the Mac.
   **Write down** the counts you saw (for example 2, 1, 3, 2 of 4), whether anything on the card moved
   other than the dots, the count and the two times, and the last "N min" the card showed before the code
   appeared. That is how long your Mac's name took to reach the internet, measured by Tortie rather than by
   hand.
   **Write down** whether macOS or Tailscale asked you anything between Allow and the code (a password, a
   network prompt, a Tailscale window). Nothing should have. This is the first time Tortie, rather than
   Terminal, runs your Tailscale's funnel, and whether it can do so unprompted is O5.

3. **If a page opened** (SPEC row 2; O3). Your tailnet is already approved, so it should not. If Tortie drew
   "Tailscale needs your OK to publish this door." with **Open Tailscale**, press it, count the clicks on
   Tailscale's page until it says Funnel is on, and **write down the page's host** (the part after
   `https://` and before the next `/`). Tortie opens only `https://login.tailscale.com/…`, which is the host
   the stand-in guesses at and nobody has recorded. If no page opened, write "not seen again".

4. **Archive, check, upload and pair Tortie 1.0.0 (2)** (SPEC row 3; O8). Leave `npm run dev` running and
   open a **new Terminal tab** (⌘T). In `~/gmux`, run `open ios/Tortie.xcodeproj`. There is no vendoring step
   any more: the app carries no Tailscale. In Xcode's toolbar, choose the scheme **Tortie** and the
   destination **Any iOS Device (arm64)**, then choose **Product → Archive**. If macOS asks for your login
   password to let codesign use your key, type it and choose **Always Allow**.
   **You should see** the Organizer open on **Archives** with Tortie 1.0.0 (2) at the top.
   Right-click it and choose **Show in Finder**. In the new Terminal tab, in `~/gmux`, type
   `node build/p316/test-ios.mjs --read-app ` with a space at the end, drag the `.xcarchive` onto the
   window, and press Return.
   **You should see** one line ending "none links NetworkExtension or TailscaleKit, none carries code
   coverage, no DEBUG seam". It means the app you upload carries no VPN framework, no Tailscale, no test
   instrumentation and none of the debug switches the agents' runs use. If it prints anything else, do not
   upload.
   In the Organizer press **Distribute App**, choose **TestFlight Internal Only**, then **Distribute**.
   **Superseded for any build that may go to the public:** choose **App Store Connect**, as `build/p333/CHECKLIST.md` says.
   **You should see** the upload finish with a success message, and no warning about TailscaleKit's
   symbols any more. At appstoreconnect.apple.com, if build 1.0.0 (2) says **Missing Compliance**, press
   **Manage** and answer as you did for build 1: the app uses TLS to your Mac. When Apple has processed it,
   open TestFlight on the iPhone and install 1.0.0 (2) over 1.0.0 (1).
   On the Mac, if the code has shut, press **Pair** again. On the phone, open Tortie. It says "Pair with your
   Mac". Allow the camera, then point it at the code.
   **You should see** "Check this matches your Mac" with six groups of four characters, and under them
   "Reaching your Mac.", then "Waiting for you to allow this iPhone on your Mac." The Mac's card shows your
   phone's name, "Match this on your iPhone" and the same six groups. Compare all six, then press **Allow** on
   the Mac.
   **You should see** "Checking with your Mac." on the phone, then its list of sessions, and on the Mac
   "Paired with" your phone's name and the phone under **Phones** with the same six groups and no address.
   On an iPhone with a Secure Enclave (yours has one), the key the phone presents to your Mac was made inside
   it and cannot leave it (O8).
   The phone should not say "Your Mac’s name is not on the internet yet.", because the code waited for the
   name (see "What the first pairing costs" above). If it does, wait: it keeps trying inside the code's three
   minutes. If it then says "Your Mac’s name did not reach the internet before the code shut. Press Pair on
   your Mac again in a few minutes.", do exactly that, and **write down** that it happened and how many
   minutes passed between the code appearing and the first scan that got past "Reaching your Mac.".

5. **Read, away from home** (SPEC row 4). Turn Wi-Fi off on the phone. Pull down on the list, open a working
   session, and tap **Conversation**, scrolling back to the first turn.
   **You should see** the list, the session and the whole conversation, reached over cellular.

6. **Sleep and wake** (SPEC row 5; O6). Close the lid or choose Apple menu → **Sleep**, wait a minute, wake
   the Mac, and pull down on the phone.
   **You should see** the list again within a few seconds. If it says "Tortie could not reach your Mac.",
   **write down** how long until a pull works, and whether "Answering at …" was still under the switch
   on the Mac. If Tailscale updates itself while you do this checklist, note that too.

7. **Quit and reopen** (SPEC row 6; O2). Quit Tortie (Control-C in the first Terminal tab). Pull down on the
   phone.
   **You should see** "Tortie could not reach your Mac." Then run `npm run dev` again, and as soon as
   Tortie is open, pull on the phone and **time the first pull that works**. If the first few fail for
   minutes rather than seconds, the public name did not outlive the funnel, and every start pays the wait
   (O2).

8. **Remove, then pair again** (SPEC row 7). On the Mac, under **Phones**, press **Remove**.
   **You should see** the phone leave the list, no "Paired with" line left behind on the **Pair a phone**
   card (that stale line is fixed in this phase), and "Read what it answers, then allow it." under the
   switch: the door has stopped until you agree to the new list. Press **Allow**. Then pull on the phone.
   **You should see** the phone go back to "Pair with your Mac" and say "This iPhone is not paired with a
   Mac." Press **Pair** on the Mac and pair it again as in row 4.

9. **Time it, and stay on cellular** (SPEC row 8; O1, O7). Over cellular, make five pulls on the list, a
   few seconds apart. **Write down** each one's time and any that stalls for more than a couple of seconds.
   One of Tailscale's two public addresses for your Mac did not answer from the Mac itself (O1); the phone
   dials your Mac's name and races the addresses, so a stall here is worth writing down. The SPEC also asks
   for one pull timed on each build: build 1.0.0 (1) reaches only the door of the build before this one,
   over your tailnet, so time its pull **before row 1**, while your current Tortie is still running, and
   write both numbers down.

10. **Look your Mac's name up** (SPEC row 9; M4 again). Open https://crt.sh and search for
    `gregs-macbook-pro.tail2ddfe1.ts.net`.
    **You should see** no certificate for it. The door's certificate is Tortie's own and is never sent to a
    certificate authority, so your Mac's name is not in Certificate Transparency.

11. **The next morning** (Phase 332; O2 on the Mac). Quit Tortie for a night, with the door left on. In the
    morning, run `npm run dev` again and open Settings, then **Phone**.
    **You should see** **Pair** under **Pair a phone** at once. Tortie asks your name's servers once in the
    background, and if the name went away overnight the card changes to the dots and "Publishing your Mac’s
    name" within a couple of seconds.
    **Write down** whether **Pair** showed at once, and, if the dots came back, for how many minutes they
    stayed.

12. **Off, then on again** (Phase 332). With the door answering, turn the switch under **Let my phone reach
    this Mac** off, then on.
    **You should see** "Answering at https://…" again and **Pair** under **Pair a phone** at once, as before
    this phase. Turning the door on asks your name's servers once more in the background, and if the name has
    gone the card changes to the dots and "Publishing your Mac’s name" within a couple of seconds and Tortie
    keeps checking.
    **Write down** whether **Pair** showed at once, and, if the dots came instead, for how long.

## Three things to know

- **Your policy edits of 2026-09-29 are no longer used.** The `tag:tortie-phone` owner, the grant to the
  door and the narrowed default rule you pasted into your policy, and any `tortie-phone` on your Machines
  page, have nothing to do with this build: the phone never joins your tailnet. **Removing them is yours to
  do**, whenever you like, and Tortie never writes your policy. Put the default rule back to what it was if
  the narrowing cut anything off.
- **Build 1.0.0 (1) cannot pair with this door.** Scanning a new code with it says "That is not a Tortie
  pairing code." Build 1.0.0 (2) opening a pairing kept from build 1 drops it and says "This iPhone is not
  paired with a Mac."; pair again.
- **Turning the door off keeps what Tortie learned about your Mac's name** (Phase 332's fix round). The
  next time you turn it on, **Pair** shows at once while Tortie asks the name's servers once more, and if
  the name has gone the card goes back to the dots and "Publishing your Mac’s name" and the check starts
  again. On a network that
  blocks DNS, **Pair** appears after about two seconds with "Tortie could not confirm your Mac’s name, so a
  first scan may fail." above it; the same line and **Pair** appear if your name still does not answer
  after about fifteen minutes, so no network can keep pairing closed.

## Not covered yet

- **Nothing answers while the Mac is asleep or Tortie is not running.**
- **Approving Funnel lets any device signed in to your tailnet publish to the internet**, not only this Mac.
  That is the trade you accepted, and nothing Tortie does can take it back.
- **Funnel is a Tailscale beta.** Its limits on bandwidth are not published.
- **Nothing on the phone can change a session.** There is no End (Phase 317), and no answering or typing.
- **Reinstalling the app, or moving to a new phone, forgets the pairing.** Pair again.
- **Only you can install it.** It is on internal TestFlight, and a TestFlight build expires after 90 days.

## When you are done

Keep the dev build running, or quit it and reopen 0.110.0, which never had this door. Nothing is released
until you say the phone works (your ruling of 2026-09-21).

---

## Where each row was checked against the tree (for the agents)

The integrator re-read every line number below against the landed tree on 2026-09-29, after the last
builder finished, and corrected the one that had moved (`pairFingerprint`, 996 to 997). "His side" means text in
Tailscale, App Store Connect or TestFlight, which no agent may sign in to.

| Row | What it tells him to find | Where it is |
| --- | --- | --- |
| 1 | `npm run dev`; his checkout | `package.json:14` |
| 2 | **Pair a Phone…** under **Settings…**; the rail's **Phone** | `src/main/menu.ts:615` (`openSettingsWindow('phone')`); `src/renderer/settings/SettingsApp.tsx:123` |
| 2 | **Let my phone reach this Mac**, **Pair a phone**, **Pair**, **Allow** | `DOOR_LABEL`, `PAIR_GROUP`, `BTN_PAIR`, `BTN_ALLOW`, `src/renderer/settings/PhoneSection.tsx:59`, `:68`, `:70`, `:64` |
| 2 | The lines, "Answers on the internet at https://…, through Tailscale Funnel on …", "Publishes it with …", "Allows no phone yet" | `describePocketDoor`, `src/main/pocket/pairing.ts:403`, `:407`, `:435` |
| 2 | No approval line on an approved tailnet | `asksApproval` from the CapMap, `src/main/pocket/funnel.ts:432`; drawn only then, `PhoneSection.tsx:491` |
| 2 | "Starting Tailscale Funnel…", "Answering at https://…:8443" | `DOOR_OPENING`, `PhoneSection.tsx:61`; `doorListening`, `:103` |
| 2 | The code on its own after Allow; "Scan it with Tortie on your iPhone, from tortie.sh/iphone.", "Do not show this code on a shared screen." | `pairAfterAllow` in `PhoneSection.tsx`; `SCAN_LINE` `:88`, `CODE_PRIVATE` `:90`. Driven against the stand-in by `probe:p330` A3, and side by side with the parent by `probe:p3332` S |
| 2, 11, 12 | "Publishing your Mac’s name", "N of 4 see it", "Your Mac’s name is live", "Took N min", the dots, and no **Pair** while they show | `NAME_PUBLISHING`, `nameSeeing`, `NAME_LIVE`, `nameTook` in `src/renderer/settings/PhoneSection.tsx`; the dots `[data-phone-name-dots]`; the checking sentence, `POCKET_NAME_SENTENCES.checking` in `src/shared/ipc/pocket.ts`, now on the block's hover; the `naming` face of `pairingStage`, drawn while main's `pairable` is false (Phase 332.1). Driven against four loopback DNS stand-ins by `probe:p3321` H7 and H9, and by `probe:p332` H1 (the title), H3, H4 and H5 |
| 11 | **Pair** at once on a relaunch, one question in the background | the switch-on round, `beginNameCheck` in `src/main/pocket/ipc.ts`. Driven by `probe:p332` H4 |
| 12 | Off keeps the name; **Pair** at once, one question in the background | the off write keeps `nameConfirmed`, so the next counted start is the switch-on round (`beginNameCheck`, `src/main/pocket/ipc.ts`). Driven by `probe:p332` H2 |
| Three things | "Tortie could not confirm your Mac’s name, so a first scan may fail." after one unreadable round, or after a no that lasts about fifteen minutes | `POCKET_NAME_SENTENCES.unreadable`, `src/shared/ipc/pocket.ts`; `NAME_UNREADABLE_ROUNDS` (one) and `NAME_OPEN_AFTER_ROUNDS` (18), `public-name.ts`. Driven by `probe:p332` H6 |
| 3 | "Tailscale needs your OK to publish this door.", **Open Tailscale**, the host it opens | `POCKET_FUNNEL_APPROVAL`, `src/shared/ipc/pocket.ts:596`; `BTN_OPEN_TAILSCALE`, `PhoneSection.tsx:66`; the host check, `funnel.ts` (`approvalOpens`). The real page's host is his side and unrecorded (SPEC §2.2 O3); the stand-in prints a made-up one |
| 4 | No vendoring step | `vendor:tailscalekit` and `build/build-tailscalekit.mjs` removed in this phase |
| 4 | Tortie 1.0.0 (2) | `CURRENT_PROJECT_VERSION = 2` and `MARKETING_VERSION = 1.0.0` in every configuration of `ios/Tortie.xcodeproj/project.pbxproj` (`:417`, `:427`) |
| 4 | `--read-app` and its line | `build/p316/test-ios.mjs` `PASS_WORDS`; the words quoted are SPEC §4.12.7's, "none links NetworkExtension or TailscaleKit, none carries code coverage, no DEBUG seam", and the integrator confirms the landed text |
| 4 | **Any iOS Device (arm64)**, **Distribute App**, **TestFlight Internal Only**, Missing Compliance | Xcode 26.3 and his side, as in `build/p316/CHECKLIST.md` rows 5 to 8 |
| 4 | The phone's words: "Pair with your Mac", "Check this matches your Mac", "Reaching your Mac.", "Waiting for you to allow this iPhone on your Mac.", "Checking with your Mac.", the two name sentences | `ios/Tortie/Style/Copy.swift:167`, `:182`, `:224`, `:233`, `:236`, `:230`, `:241` |
| 4 | "Match this on your iPhone", "Paired with …", six groups over three keys | `MATCH_LABEL` `PhoneSection.tsx:76`; `pairedWith` `:108`; `pairFingerprint`, `src/main/pocket/pairing.ts:997` |
| 4 | The client key made in the Secure Enclave | SPEC §4.7.1, `ios/Tortie/Door/Keys.swift` (`kSecAttrTokenIDSecureEnclave` when available) |
| 5, 9 | Reached by name over cellular | SPEC §4.12.2: `NWConnection` to the name, never an address |
| 6 | The wake re-read | SPEC §4.3 "Wake": `serve status --json` re-read on resume while the door is on |
| 7 | "Tortie could not reach your Mac." | `Copy.cannotReachMac`, `Copy.swift:249` |
| 8 | **Remove**, no stale "Paired with", the door asking again, "This iPhone is not paired with a Mac." | `BTN_REMOVE` `PhoneSection.tsx:90`; the notice carries its phone id, `:825`; `DOOR_WAITING` `:62`; `Copy.notPaired` `Copy.swift:221`, drawn for a connection closed after the handshake (`DoorWords.swift:131`) |
| 10 | No certificate for the name | His measurement M4; raw TCP forwarding issues none (`ipn/ipnlocal/serve.go:680-696` at tailscale.com v1.94.1) |
| Three things | "That is not a Tortie pairing code." | `Copy.pairNotACode`, `Copy.swift:214` |
| Three things | The first window, still 3 minutes: the code waits for the name instead of living longer, which closes SPEC §4.9's owed change | `POCKET_PAIRING_WINDOW_MS`, `src/main/pocket/pairing.ts`; `build/p332/SPEC.md` §10 |
