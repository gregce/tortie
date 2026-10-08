# Phase 316.5 — the alert opens the session it names: your checklist

This is how you check that your iPhone is told when a session starts waiting on you, and that tapping the
alert opens that session. It is written for you to follow at the Mac with the phone beside you. Each row
says what to open, what to press and what you should see. **Rows 7 to 9 are the only proof of delivery
through Apple.** No agent may read your Apple push key or reach Apple, so every agent run sent its alerts
to a stand-in on the Mac and handed them to a Simulator itself, and `probe:p316` passing is the floor, not
the finish.

Rows 7, 8 and 9 are the SPEC's rows (a), (b) and (c) (`build/p3165/SPEC.md` §8). **One thing changed after
the SPEC was written** (research 136): alerts are yours alone, because only a Mac that holds the phone
app's Apple push key can send one. So the phone asks for alerts only when the Mac it is pairing with holds
that key AND has its alert switch on, and it never mentions alerts to any other Mac. That is why you choose
the key and turn alerts on (rows 4 and 5) BEFORE you pair again (row 6). Pair first and the phone will not
ask. The table at the end says where each button and sentence was checked against the tree, and is for the
agents rather than for you.

## Already done

- Tortie 1.0.0 (2) is archived in your Organizer and waiting for your upload. You may upload it or skip it:
  1.0.0 (3), this phase's app, supersedes it.
- Your Apple push key exists: key `6782V6SJJ7`, team `4GRQMF5T5U`, and you hold its file,
  `AuthKey_6782V6SJJ7.p8`. No agent has read it or ever will; you choose it yourself in row 4.

## Before you start (only if Xcode asks)

If Xcode says, when you archive in row 2, that the profile or the App ID has no Push Notifications, open
developer.apple.com → **Certificates, Identifiers & Profiles** → **Identifiers** →
`com.itavero.tortie.phone`, turn on **Push Notifications**, save, and archive again.

## The checklist

1. **Get this build running on your Mac.** Quit Tortie (⌘Q, or Control-C where you ran `npm run dev`).
   Your sessions keep running, because tmux holds them. Then, in Terminal:

   ```
   cd ~/gmux
   git pull --rebase --autostash origin main
   npm run dev
   ```

   **You should see** Tortie open with your sessions.

2. **Archive, check and upload Tortie 1.0.0 (3).** Leave `npm run dev` running and open a **new Terminal
   tab** (⌘T). In `~/gmux`, run `open ios/Tortie.xcodeproj`. In Xcode's toolbar, choose the scheme
   **Tortie** and the destination **Any iOS Device (arm64)**, then choose **Product → Archive**. If macOS
   asks for your login password to let codesign use your key, type it and choose **Always Allow**. If Xcode
   says Push Notifications is missing, do "Before you start" above and archive again.
   **You should see** the Organizer open on **Archives** with Tortie 1.0.0 (3) at the top.
   Right-click it and choose **Show in Finder**. In the new Terminal tab, in `~/gmux`, type
   `node build/p316/test-ios.mjs --read-app ` with a space at the end, drag the `.xcarchive` onto the
   window, and press Return.
   **You should see** one line ending "none links NetworkExtension or TailscaleKit, none carries code
   coverage, no DEBUG seam, and it asks Apple for its alert address". It means the app you upload carries no
   VPN framework, no Tailscale, no test instrumentation and none of the debug switches the agents' runs
   use, and that it is the build that can ask Apple where to send your alerts. If it prints anything else,
   do not upload.
   In the Organizer press **Distribute App**, choose **TestFlight Internal Only** as you did for build 2,
   then **Distribute**. At appstoreconnect.apple.com, if build 1.0.0 (3) says **Missing Compliance**, press
   **Manage** and answer as before: the app uses TLS to your Mac.
   **Superseded for any build that may go to the public:** choose **App Store Connect**, as `build/p333/CHECKLIST.md` says.

3. **Install 1.0.0 (3)** from TestFlight on the iPhone and open it.
   **You should see** your list of sessions as before, and no line about alerts. The pairing it keeps was
   made by a build that knew nothing of alerts, so the phone has no Mac that told it alerts can be sent,
   and it says nothing about them.

4. **Choose the key.** On the Mac, open Settings, then **Phone** (or **Pair a Phone…** in the app's own
   menu). Under **Alerts**, the row **Apple push key** says `Not chosen.` Press **Choose…**; a file panel
   titled "Choose the Apple push key for Tortie’s iPhone app" opens. Pick your `AuthKey_6782V6SJJ7.p8`.
   **You should see** `Key 6782V6SJJ7` in that row, a **Forget** button beside **Choose…**, and a new row
   under it: **Alert my phone when a session waits**, "Sent through Apple. Never what it asks." A Mac with
   no key shows no such switch, because it cannot send.

5. **Turn alerts on.** Switch on **Alert my phone when a session waits**.
   **You should see** the door's lines to read again, now including "Tells your phone through Apple when a
   session starts waiting on you, never what it asks, and nothing while this Mac sleeps", and "Read what it
   answers, then allow it." Read them and press **Allow**.

6. **Pair again.** On the Mac, under **Phones**, press **Remove** beside your iPhone, then, under the
   switch, where it says "Read what it answers, then allow it.", press **Allow**. On the phone, pull down on
   the list.
   **You should see** the phone go to "Pair with your Mac" and say "This iPhone is not paired with a Mac."
   On the Mac, under **Pair a phone**, press **Pair**. On the phone, scan the code.
   **You should see** "Check this matches your Mac" with six groups of four, then "Waiting for you to allow
   this iPhone on your Mac.", and then iOS asking "“Tortie” Would Like to Send You Notifications".
   **Press Allow on the phone first**, then turn to the Mac: its card shows your phone's name, "Match this
   on your iPhone", the same six groups, and lines that now include `Alerts for "<your iPhone>" go through
   Apple (production), device …` (eight letters and digits). Compare all six groups, then press **Allow**
   on the Mac.
   **You should see** "Checking with your Mac." on the phone, then its list with no line about alerts, and
   on the Mac your phone under **Phones** with `Alerts on` (drawn only while this Mac can send: a key kept
   and the switch on).
   If the `Alerts for` line is not there when you are about to press Allow, wait a few seconds: the phone
   sends its alert address the moment you answer iOS. If the Mac says "What this phone would be allowed
   changed after it was shown. Read it again and allow what it says now. Nothing was changed.", the phone
   sent its address just as you pressed: read the lines again and press **Allow** once more. If you pressed
   Allow on the Mac before answering iOS, the pairing still finishes, and the phone's list says
   `Pair again to get alerts.` straight away, because the Mac allowed the phone before it had its address:
   pair again as above. If iOS never asked, the Mac could not send when you scanned (check rows 4 and 5),
   or this phone already answered that question once; iOS asks only once per install.

7. **(a) One alert.** Lock the phone. On the Mac, make a session wait on you (a Claude Code permission
   question). **Write down** the Mac's clock when that session's dot turns amber, and the time the lock
   screen shows on the alert.
   **You should see** one alert, `<session> needs input` over `<project> · Claude Code`, and never what the
   session asks. This is an observation, not a rate: write down what you saw, and if nothing came within a
   minute, write that down and look under the switch on the Mac for a sentence such as "Apple refused
   Tortie’s push key, so it told your phone nothing."

8. **(b) Tap it.** Tap the alert and unlock.
   **You should see** Tortie open on that session, titled with its name.

9. **(c) Alerts off in iOS.** On the phone, **Settings → Notifications → Tortie**, turn **Allow
   Notifications** off. Open Tortie.
   **You should see** the list, a session and its conversation all work, and no line asking you to pair
   again. On the Mac, make another session wait: **nothing arrives** on the phone. Then turn **Allow
   Notifications** back on.

10. **Optional: the gone session.** With an alert still on the lock screen, end and remove that session on
    the Mac, then tap the alert.
    **You should see** the list with "Tortie no longer has a record of that session." at the top.

## Three things to know

- **The phone asks about alerts only when the Mac it pairs with can send them**: a key chosen AND the switch
  on. With either missing it pairs without asking, and it never tells you to pair again for alerts. That is
  research 136's rule, so that no phone paired to someone else's Mac is ever promised an alert.
- **If Apple gives the phone a new alert address** (after restoring the phone, say), the list says
  `Pair again to get alerts.` under its title. Pairing again is Remove on the Mac, a pull on the phone and
  a scan, as in row 6.
- **Forget** removes the key from this Mac. Nothing is sent without it, and the Mac says so under the switch
  the next time a session waits.

## Not covered yet

- **Nothing arrives while the Mac sleeps or Tortie is quit.** The Mac tells you about the waits it first
  sees after waking, in one alert.
- **The alert never says what the session asks.**
- **Turning the door off stops alerts**, because the tap reads the session through it.
- **Ending a session from the phone is Phase 317, and answering one is Phase 318.**
- **Alerts reach only a phone paired with a Mac that holds the app's key**, which is yours. Whether anyone
  else's Mac can ever alert a phone is still your call (research 127 §11.6).
- **One Mac per phone.** The phone keeps one pairing. If you pair it with a second Mac, the first Mac still
  holds its alert address and goes on alerting it, and tapping such an alert asks the second Mac for a
  session it never had, so the phone says "Tortie no longer has a record of that session." The alert does
  not say which Mac sent it. Remove the iPhone on the Mac you no longer pair it with.

## When you are done

Keep the dev build running. Nothing is released until you say the phone works end to end (your ruling of
2026-09-21), and this phase is in that release with 317 and 318. Phase 317 (End, behind Face ID) builds
after this one lands.

---

## Where each row was checked against the tree (for the agents)

Re-read by builder `proof` on 2026-09-30 against the worktree `/private/tmp/wt-p3165` while the other two
builders were still working, so **the integrator re-reads every line number below against the landed tree**
and corrects any that moved. "His side" means text in Xcode, iOS, App Store Connect, TestFlight or Apple's
developer site, which no agent may sign in to.

| Row | What it tells him to find | Where it is |
| --- | --- | --- |
| Intro | Research 136: the phone asks only when the Mac can send; the pairing answer says so | The phone reads `"alerts": true` in `pending`: `PairAnswer`, `ios/Tortie/Door/Contract.swift:450`, `:472`; asks once, `ios/Tortie/Door/Pairing.swift:435-448`. The Mac's rule is `PocketHost.alertsCanSend` (the switch on, the door confirmed, a key kept), `src/main/pocket/ipc.ts:1852`, asked by the host's `present` wrapper; the word is `alerts?: true` on `pending` alone in `PocketPairAnswer`, `src/main/pocket/pairing.ts:1229`, written as the literal by `pairBody`, `src/main/pocket/server.ts:108-112` (the integrator re-read these once the field landed). Driven by `probe:p316` N11 (never asked) and N0 (asked) |
| 1 | `npm run dev`; his checkout | `package.json:14` |
| 2 | Tortie 1.0.0 (3) | `CURRENT_PROJECT_VERSION = 3` and `MARKETING_VERSION = 1.0.0` in all six configurations of `ios/Tortie.xcodeproj/project.pbxproj` (`:417`, `:427`, `:449`, `:459`, `:479`, `:501`, `:522`, `:543`) |
| 2 | Push Notifications on the App ID | His side; the entitlement it serves is `aps-environment` in `ios/Tortie/Tortie.entitlements` (the only key, `development`; the App Store export re-signs it `production`, SPEC §5.6.1) |
| 2 | `--read-app` and its line | `build/p316/test-ios.mjs` `PASS_WORDS` (`:203`), SPEC §6.5's words byte for byte, pinned there because this checklist quotes them |
| 2 | **Any iOS Device (arm64)**, **Distribute App**, **TestFlight Internal Only**, Missing Compliance | His side, as in `build/p330/CHECKLIST.md` row 4. SPEC §8 wrote "App Store Connect"; build 2 went up as **TestFlight Internal Only**, and both sign for App Store distribution, which is what sets `production` |
| 3 | No line about alerts on a pairing made before this version | `AlertLine.shows` answers false unless the pairing's Mac said it can send, `ios/Tortie/Alerts/Alerts.swift:201-203`; a kept pairing with no `sends` reads `macSends: false`, `ios/Tortie/Door/Keys.swift:616` |
| 4 | **Pair a Phone…**; **Alerts**, **Apple push key**, `Not chosen.`, **Choose…**, **Forget**, `Key 6782V6SJJ7` | `src/main/menu.ts:615`; `ALERTS_GROUP`, `PUSH_KEY_LABEL`, `PUSH_KEY_NONE`, `BTN_CHOOSE_KEY`, `BTN_FORGET_KEY`, `pushKeyChosen`, `src/renderer/settings/PhoneSection.tsx:100`, `:111`, `:112`, `:113`, `:114`, `:118` |
| 4 | The key id read from the file's name `AuthKey_6782V6SJJ7.p8`; the panel's title | `KEY_FILE_NAME` and `KEY_PICK_MESSAGE`, `src/main/alerts/key-file.ts:56`, `:46`; team and topic compiled, `:37`, `:40` |
| 4 | The switch drawn only once a key is kept (or alerts are already on) | `pushSwitchShown`, `PhoneSection.tsx:274`; `PUSH_LABEL`, `PUSH_CAPTION`, `:101`, `:102` |
| 5 | "Tells your phone through Apple when a session starts waiting on you, never what it asks, and nothing while this Mac sleeps"; "Read what it answers, then allow it."; **Allow** | `describePocketDoor`, `src/main/pocket/pairing.ts:417`; `DOOR_WAITING`, `BTN_ALLOW`, `PhoneSection.tsx:68`, `:70` |
| 6 | **Phones**, **Remove**, the door asking again after it, **Pair a phone**, **Pair**, "Match this on your iPhone" | `PHONES_GROUP`, `BTN_REMOVE`, `DOOR_WAITING`, `PAIR_GROUP`, `BTN_PAIR`, `MATCH_LABEL`, `PhoneSection.tsx:94`, `:97`, `:68`, `:74`, `:76`, `:82`; a Remove moves the confirm hash (`build/p330/CHECKLIST.md` row 8) |
| 6 | The phone's words: "Pair with your Mac", "This iPhone is not paired with a Mac.", "Check this matches your Mac", "Waiting for you to allow this iPhone on your Mac.", "Checking with your Mac." | `ios/Tortie/Style/Copy.swift:167`, `:221`, `:182`, `:233`, `:236` |
| 6 | iOS's question after the phone's first answer from the Mac, and before Allow | The question: iOS's own words, his side. The order: `.pending` says `waitingForMac`, then asks once, then presents the address at once, `ios/Tortie/Door/Pairing.swift:435-448`; `requestAuthorization`, `ios/Tortie/Alerts/SystemAlerts.swift:52`. Driven by `probe:p316` N0, which presses Allow only after the phone says how iOS was answered |
| 6 | `Alerts for "<your iPhone>" go through Apple (production), device …` | `describePocketDoor`, `src/main/pocket/pairing.ts:430` (`pushTokenDigest`, first eight hex); `production` because the archive is a Release build, `PushEnvironment.current` in `ios/Tortie/Alerts/Alerts.swift` |
| 6 | `Alerts on` on the phone's row, only while this Mac can send | `ALERTS_ON_CHIP`, `PhoneSection.tsx:98`, drawn at `:628` when `alertsReachPhones` (`:285`) holds (the 316.5 fix round) |
| 6 | "What this phone would be allowed changed after it was shown. …" | `PocketPairing.allow`, `src/main/pocket/pairing.ts` (the 316.5 fix round), tested in `src/main/pocket/__tests__/pairing.test.ts` |
| 6 | `Pair again to get alerts.` straight away after an Allow pressed before iOS was answered | `AppModel.paired` starts the launch's check at once, `ios/Tortie/App/TortieApp.swift`; `AlertsTests.testAPairingThatHeldNoAddressSaysSoAtOnce` |
| 6 | iOS asks only once per install | iOS's rule; `PushAuthorization`, `ios/Tortie/Alerts/Alerts.swift` |
| 7 | `<session> needs input` over `<project> · Claude Code`, never the question | `singlePayload`, `src/main/push/alert.ts:93-109` (the title is the name and the status label, the body the project and the agent); `needs input`, `src/shared/status-words.ts:155`; `Claude Code`, `src/main/agents/registry.ts:626` |
| 7 | "Apple refused Tortie’s push key, so it told your phone nothing." under the switch | `PUSH_KEY_REFUSED`, `src/shared/push-copy.ts:27`; drawn as `data-phone-alert-sentence`, `PhoneSection.tsx:684` |
| 8 | The tap opens that session, titled with its name | `AlertTap.parse` reads `tortie.session`, `ios/Tortie/Alerts/Alerts.swift`; `AppModel.openFromAlert`, `ios/Tortie/App/TortieApp.swift`. Driven by `probe:p316` N4 (warm) and N5 (a cold launch), F1+ on iOS 18.3 |
| 9 | No line asking to pair again with alerts off in iOS | `AlertLine.shows`, `.denied` answers false, `ios/Tortie/Alerts/Alerts.swift:208-211`; driven by `probe:p316` ND on a phone that denied |
| 10 | "Tortie no longer has a record of that session." | `NO_SUCH_SESSION`, `src/renderer/app/reach-copy.ts:39`; the phone's copy, `Copy.noSuchSession`, `ios/Tortie/Style/Copy.swift:249`. Driven by `probe:p316` N6 (tapped from the list) and N6b (from another session's screen) since the 316.5 fix round |
| Not covered yet | One Mac per phone | The phone keeps one pairing (`PairingStore`, `ios/Tortie/Door/Keys.swift`); the alert carries `tortie: {v, session}` and no Mac, `src/main/push/alert.ts:94-111` |
| Three things | `Pair again to get alerts.` | `Copy.pairAgainForAlerts`, `ios/Tortie/Style/Copy.swift:255`; the rule, `AlertLine.shows`, `Alerts.swift:201-219`. Driven by `probe:p316` N8 (drawn for a changed address) and N11 (never drawn from a Mac that cannot send) |
| Three things | Nothing sent without a key, and said under the switch | Read, not driven by any arm of `probe:p316`: the engine reads the key only inside a flush (`providerKey`, `src/main/alerts/index.ts:194`), and `PUSH_NO_KEY`, `src/shared/push-copy.ts:24`, is its sentence, drawn as `data-phone-alert-sentence`, `PhoneSection.tsx:684` |
| Not covered yet | Nothing while the Mac sleeps; one alert after waking | `PUSH_WAKE_SEEN`, `src/shared/push-copy.ts:21`; Phase 314's wake rule |
