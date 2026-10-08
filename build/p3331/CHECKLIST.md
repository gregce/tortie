# Phase 333.1 — a stranger's first run: your checklist

This is how you check, at your own Mac and on your own iPhone, the parts of the three-step setup that no agent
run can reach. Every agent run drove a stand-in in place of Tailscale (`build/p330/tailscale-standin.mjs`) and
pressed no link, so it never opened your Tailscale, your browser or Safari. Each row below says what to open,
what to press and what you should see. Rows C1 and C3 open your real Tailscale and your browser, which is why
they are yours. Row C2 is a measurement: write down what you see, because the next round reads it.

The table at the end says where each button and sentence was found in the tree, and is for the agents rather
than for you.

## Before you start

Run this phase's build on your Mac: quit Tortie (⌘Q, or Control-C where you ran `npm run dev`), then in
Terminal run `cd ~/gmux`, `git pull --rebase --autostash origin main` and `npm run dev`. Your sessions keep
running, because tmux holds them. Then choose **Pair a Phone…** in the app's own menu, directly under
**Settings…**. Settings opens on **Phone**, with three steps under **Let my phone reach this Mac**: **Tailscale
on this Mac**, **Publish this Mac** and **Pair your phone**.

**You should see** every step already done on your Mac, which is already set up: step 1 with your account and
your tailnet, step 2 **Published**, step 3 **Paired** with **Pair**. Tortie asked you to allow nothing.

## The checklist

- **C1. Tailscale stopped, then started from Tortie.** With the door on, quit Tailscale from its menu bar icon.
  **You should see** step 1 say **Not running** with "Turn it on." and an **Open Tailscale** button, and step 2
  say "Tailscale stopped publishing the door. Tortie is trying again." Press **Open Tailscale**. Tailscale
  opens. Connect it. **You should see**, by itself and within about a minute, step 1 done with your account and
  your tailnet beside the check, and step 2 back to **Published** without asking you to allow anything, with no
  press of **Try again**. While Tortie is trying again it is Tortie's own retry that publishes the door, not
  your coming back to the window, which is why step 1 does not say "then come back" here.

- **C2. Back from Tailscale's menu bar icon, without clicking Tortie** (a measurement). With the Settings window
  open on **Phone** and in front, disconnect from Tailscale's menu bar icon, wait until step 1 says **Not
  running**, then reconnect from the same menu bar icon. Do not click on Tortie.
  **Write down** whether step 1 moved to done by itself, and how long it took, or whether it stayed **Not
  running** until you clicked on the window or pressed **Try again**. A menu bar click may never take the
  focus from Tortie, in which case nothing tells Tortie you came back; that is why the quiet **Try again** stays
  beside the step's button. If step 1 moves by itself, a later round may take **Try again** away.

- **C3. Get Tailscale** (on a Mac with no Tailscale, or after moving it aside, your choice). If you move
  `/Applications/Tailscale.app` aside, your tailnet is off until you move it back. Open Settings then
  **Phone**.
  **You should see** step 1 say **Not installed** with a **Get Tailscale** button. Press it.
  **You should see** your browser open Tailscale's download page, `https://tailscale.com/download`, which
  offers both the Standalone and the App Store versions. Nothing else opens, and Tortie installs nothing.
  Put Tailscale back if you moved it.

- **C4. The iPhone's first screen, on build 8** (once phase 333.5's three pages answer, and build 8 is on your
  iPhone). Delete Tortie from the phone and install build 8 fresh, so it opens as a stranger's phone does.
  **You should see** "Pair with your Mac" and three numbered steps, **Get Tortie for Mac** with "Free at
  tortie.sh · Apple silicon · 0.111 or later" under it, **Open Settings then Phone** and **Scan the code**,
  then a **Scan code** button, "Nothing else to install on this phone.", "This iPhone is not paired with a
  Mac." and **Privacy · Support** at the foot. No camera is open yet, and iOS has asked you nothing.
  Press **Get Tortie for Mac**. **You should see** Safari open `tortie.sh`. Come back, press **Privacy**, then
  **Support**. **You should see** Safari open `tortie.sh/privacy`, then `tortie.sh/support`.
  Press **Scan code**. **You should see** iOS ask for the camera only now, and the camera open once you allow
  it. Scan the code on your Mac and pair as you always do.
  Then open **Settings** on the phone and scroll to **About**. **You should see** **Tortie for Mac** with
  `tortie.sh` on the right, **Privacy** and **Support** under the version, `1.0.0 (8)`, and each opens its page
  in Safari.

- **C5. The phone when the door is off.** With the phone paired, switch **Let my phone reach this Mac** off on
  the Mac, then pull to refresh the phone's **Sessions** list.
  **You should see** "Tortie could not reach your Mac." with "If Tortie on your Mac just updated, press Allow
  in its Settings then Phone." under it. Switch the door back on; the phone's list comes back on its next pull.

## Not covered yet

- **Tailscale's real approval page, and a non-admin's link.** Your tailnet is already approved, so neither
  shows on your Mac, and no agent may ask Tailscale for either (research 132 §3.3). A person who is not their
  tailnet's admin reads "Ask your Tailscale admin to approve Funnel." with **Copy link**; the page that link
  opens is unmeasured.
- **The App Store version of Tailscale.** Get Tailscale opens the page that offers it beside the Standalone
  one, and whether Funnel works on it is not settled (research 132 §3.1).
- **The menu bar case**, until C2 is written down.
- **Safari and the three pages themselves**, until phase 333.5 puts them up. Until then each link in C4 opens a
  page that answers "not found".

---

## Where each row was checked against the tree (for the agents)

Read on 2026-10-07 in the builders' tree at `cb8d52a6` plus this phase's delta; the integrator re-reads every
line number once the last builder is done. "His side" means Tailscale's, Safari's or iOS's own text, which no
agent may open.

| Row | What it tells him to find | Where it is |
| --- | --- | --- |
| Before | **Pair a Phone…** under **Settings…**; the window's title and **Phone** | `src/main/menu.ts:643`; `title: 'Settings'`, `src/main/settings/window.ts:65`; `PHONE_TITLE`, `src/renderer/settings/PhoneSection.tsx:111` |
| Before | **Let my phone reach this Mac**; the three step titles | `DOOR_LABEL`, `PhoneSection.tsx:112`; `STEP_TAILSCALE`, `STEP_PUBLISH`, `STEP_PAIR`, `src/renderer/settings/phone/steps.ts:45` on |
| Before, C1 | The account and the tailnet beside step 1's check | `tailscaleLine`, `steps.ts:87`; the account from the read's self user (`parseTailnetStatus`, `src/main/pocket/funnel.ts`), which Standalone 1.102.2 sends (build/p3331/SPEC.md D4) |
| C1 | **Not running**, "Turn it on.", **Open Tailscale**; "Tailscale stopped publishing the door. Tortie is trying again." | `STATE_NOT_RUNNING`, `steps.ts:51`; `POCKET_TURN_ON`, `src/shared/ipc/pocket.ts:1160`, drawn while main's `rechecks` is false (`returnChecks`, `steps.ts:275`; "Turn it on, then come back.", `POCKET_TURN_ON_LINE`, `pocket.ts:1148`, only while a return would check); `POCKET_FUNNEL_RESTARTING`, `pocket.ts:1182`; the door back by Tortie's own retry (`armRestart`, `src/main/pocket/ipc.ts`, 10 s measured by the 333.1 verifier, up to 60 s by its back-off); `BTN_OPEN_TAILSCALE_APP`, `steps.ts:68`, drawn only when main lists `open-tailscale` (`setupActionsNow`, `src/main/pocket/ipc.ts:995`): the app at its pinned place, never under a development override |
| C1 | **Open Tailscale** opens the app | `setupAction`, `ipc.ts:2246`, opening `TAILSCALE_APP_BUNDLE`, `src/main/machines/tailscale.ts:76`; refused under any harness launch, so no agent run opens it |
| C1, C2 | Coming back to the window checks again by itself | the one `onWindowLooked` subscription, `PhoneSection.tsx:1165`; `pocket:recheck`, `recheck()`, `ipc.ts:1098`, reading only while `rechecks()` holds |
| C2 | The quiet **Try again** beside the step's button | `BTN_TRY_AGAIN` drawn as `set-inline-btn` for a `try-again-quiet` piece, `PhoneSection.tsx` (`stepAction`); his ruling 3 |
| C3 | **Not installed**, **Get Tailscale**, the download page | `STATE_NOT_INSTALLED`, `steps.ts:50`; `BTN_GET_TAILSCALE`, `steps.ts:66`; `TAILSCALE_DOWNLOAD_PAGE`, `funnel.ts:137`; the page's offer of both versions is his side |
| C4 | "Pair with your Mac", the three steps, the line under the first, **Scan code**, the foot | `Copy.pairTitle`, `ios/Tortie/Style/Copy.swift:244`; `setupGetMac` `:251`, `freeAtSite` `:255`, `appleSilicon` `:259`, `macVersion` `:263`, `setupOpenPhone` `:268`, `setupScan` `:271`, `scanCode` `:274`, `pairNothingElse` `:289`, `notPaired` `:333`, `privacy` `:293`, `support` `:297` |
| C4 | The camera, and iOS's question, only after **Scan code** | `PairingModel.startScanning()`, `ios/Tortie/Screens/PairingScreen.swift:133`; the scanner built only `if model.scanning`, `:215`; the one ask, `AVCaptureDevice.requestAccess`, `:522`. Driven without a camera by `probe:p316` SE2; the question itself is his side |
| C4 | Get Tortie for Mac, Privacy and Support open `tortie.sh`, `/privacy`, `/support` in Safari | `SiteLink`, `ios/Tortie/Markdown/Links.swift:195`; `SiteOpener.open`, `:217`, asking `LinkPolicy.opens` before its one `UIApplication.shared.open`. The presses are `SiteLinkTests`' alone; `node build/p316/test-ios.mjs --read-app` reads the three addresses in the archive's bytes. The pages are phase 333.5's |
| C4 | About's **Tortie for Mac** with `tortie.sh`, **Privacy**, **Support**, `1.0.0 (8)` | `Copy.macOnSite` `:429`, `siteName` `:432`; `SettingsScreen.swift`'s About card; `CURRENT_PROJECT_VERSION = 8`, `ios/Tortie.xcodeproj/project.pbxproj`. Driven by `probe:p316` SE4 |
| C5 | "Tortie could not reach your Mac." and the Allow line under it | `Copy.cannotReachMac` `:723`, `reachAllowAgain` `:730`; `DoorWords.reachNote(for:)`, `ios/Tortie/Screens/DoorWords.swift:310`; drawn by `FailureView`, `ios/Tortie/Screens/Pieces.swift:340`. Driven by `probe:p316` SE5, and its absence under a time-out by SE6 |
| Not covered | "Ask your Tailscale admin to approve Funnel.", **Copy link** | `POCKET_ASK_ADMIN`, `pocket.ts:1168`; `BTN_COPY_LINK`, `steps.ts:69`; driven against the stand-in's made-up page by `probe:p3331` R6, never pressed |
