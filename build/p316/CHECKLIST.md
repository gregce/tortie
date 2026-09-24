# Phase 316.4 — the first TestFlight build: your checklist

This is how you put Tortie on your iPhone and check that it reads your sessions over your tailnet. It is
written for you to follow at the Mac with the phone beside you. Each row says what to open, what to press
and what you should see. Completion is yours to declare from this list: `probe:p316` passing is the floor,
not the finish.

It is copied into the closing section of the Phase 316 entry in `docs/BACKLOG.md`. The table at the end
says where each button and sentence was checked against the tree, and is for the agents rather than for you.

## Already done

- Your iPhone runs iOS 18.1 or later (you said 18.x).
- `com.itavero.tortie.phone` is registered with Push Notifications, the App Store Connect record exists,
  you are an internal tester, and Xcode is signed in to your team, Gregory Ceccarelli (`4GRQMF5T5U`).
- Your Mac runs the Tailscale app and is on your tailnet.

## The checklist

1. **Get this build running on your Mac.** Quit Tortie (⌘Q, or Control-C where you ran `npm run dev`).
   Your sessions keep running, because tmux holds them. Then, in Terminal:

   ```
   cd ~/gmux
   git pull --rebase --autostash origin main
   npm run dev
   ```

   The pull puts your two `docs(design)` commits back on top and keeps your uncommitted changes.
   **You should see** `git log --oneline -5` list your two design commits first, with
   `build(ios): the first TestFlight build and its checklist` a line or two below them, and Tortie open
   with your sessions.

2. **Turn the door on.** In the menu bar, open the app's own menu, the bold one beside the Apple menu (a dev
   build may name it Electron rather than Tortie), and choose **Pair a Phone…**, directly under
   **Settings…**. Settings opens on **Phone**. Switch on **Let my phone reach this Mac**. Read the lines
   that appear. They start with "Answers on this Mac's tailnet address: 100.…" and end with "Allows no
   phone yet". Then press **Allow**. If you turned it on and allowed it before, it goes straight to
   listening. If macOS asks whether Electron may accept incoming connections, choose Allow.
   **You should see** "Listening on 100.x.y.z:8823" under the switch, where 100.x.y.z is your Mac's
   tailnet address.

3. **Keep the phone to this door.** You only do this once. At the bottom of Settings → Phone, open
   **Keep the phone to this door** and press the copy icon beside the grant (it says **Copy the grant**
   when you hover over it). The grant reads:

   ```
   "tagOwners": {
     "tag:tortie-phone": ["autogroup:admin"]
   },
   "grants": [
     { "src": ["tag:tortie-phone"], "dst": ["<your Mac's 100.x address>"], "ip": ["tcp:8823"] }
   ]
   ```

   Open the Tailscale admin console at login.tailscale.com/admin/acls (**Access controls**) and use the JSON
   editor. Paste the grant inside the outer `{ }`, with a comma after its last `]` if another section
   follows it. If your policy already has a `"tagOwners"` or a `"grants"` section, put these lines inside
   it rather than adding a second one. Then, in your default rule, change `"src": ["*"]` to
   `"src": ["autogroup:member"]`. Before you save, open the rule preview and check that nothing you use is
   cut off. A tagged device is not a member, so any tagged server of yours loses
   what the default rule gave it. Then save.
   **You should see** the policy save with no error. The grant only adds a rule. It is the narrowing that
   keeps the phone to this door.

4. **Check that network flow logs are off.** Do this before the phone first joins. In the admin console, open
   **Logs** (login.tailscale.com/admin/logs), then **Network flow logs**.
   **You should see** that network flow logs are not turned on, or that your plan does not include them.
   Tortie turns off the phone's own Tailscale logging, as you ruled ("Turn them off"). If your tailnet
   requires flow logs, Tailscale takes the phone's key, the phone's connection then switches itself off,
   and the phone says "Your tailnet requires network flow logs, which Tortie turns off. Nothing was
   paired." The key is spent by then. So if they are on and you want to keep them, stop here.

5. **Archive the app.** Open a **new Terminal tab** (⌘T), because `npm run dev` from row 1 is holding the first one; pressing Control-C there would quit Tortie and close the door. In the new tab, in `~/gmux`, run `npm run vendor:tailscalekit`. The first time, it
   takes about a minute and needs the internet and Go. **You should see** a last line starting with
   `• TailscaleKit 59d4bb827449 built →`. After that, it says "already built". Then run
   `open ios/Tortie.xcodeproj`. In Xcode's toolbar, choose the scheme **Tortie** and the destination
   **Any iOS Device (arm64)**, then choose **Product → Archive**. Xcode signs with your team, so if macOS
   asks for your login password to let codesign use your key, type it and choose **Always Allow**, or it asks again for each part of the app.
   **You should see** the Organizer open on **Archives** with Tortie 1.0.0 (1) at the top.
   If Xcode stops, saying your team has no device to make a provisioning profile for, plug the iPhone in
   and choose it as the destination once. The error in Xcode's Signing & Capabilities tab then offers a
   **Register Device** button; press it. Then choose
   **Any iOS Device (arm64)** again and archive again.

6. **Read the archive before you upload it.** In the Organizer, right-click the new archive and choose
   **Show in Finder**. In the same new Terminal tab, in `~/gmux`, type `node build/p316/test-ios.mjs --read-app ` with a space
   at the end. Drag the selected `.xcarchive` from Finder onto the Terminal window, then press Return.
   **You should see** one line ending "none links NetworkExtension, none carries code coverage, and
   _tailscale_no_logs_no_support is exported by TailscaleKit and called by the app". That means the app
   carries no VPN framework, no test instrumentation, and the switch that keeps Tailscale's logs off. If it
   prints anything else, do not upload.

7. **Upload it.** In the Organizer, with the archive selected, press **Distribute App** on the right. Choose
   **TestFlight Internal Only**, then **Distribute**.
   **You should see** the upload finish with a success message. Apple then takes a few minutes to process the
   build and emails you when it is done. A build sent this way can only go to internal testers. Xcode may
   warn that it could not upload symbols for TailscaleKit, because the Tailscale library is built without
   them. That warning is expected and the upload still counts.

8. **Answer Apple.** At appstoreconnect.apple.com, open **Apps**, then your Tortie record, then
   **TestFlight**. If build 1.0.0 (1) says **Missing Compliance**, press **Manage** and answer the
   questions. Tortie's `Info.plist` deliberately has no answer (your decision 7). The app uses TLS to your
   Mac and WireGuard inside Tailscale. If the build is not in your internal testing group, add it there.

9. **Install.** On the iPhone, open TestFlight (install it from the App Store if you need to), find Tortie
    and press **Install**.
    **You should see** Tortie on your Home Screen: the cat on a light square, named Tortie.

10. **Make one key, now, just before pairing.** In the admin console, open **Settings → Keys** (login.tailscale.com/admin/settings/keys)
   and press **Generate auth key…**. Turn **Reusable** off and **Ephemeral** off. Turn **Pre-approved** on,
   if you see it. Turn **Tags** on and choose `tag:tortie-phone`. Generate the key and copy it. It starts with
   `tskey-auth-`. Do not save it anywhere: you paste it once, in the next row, and it works once.

11. **Pair.** On the Mac, in Settings → Phone under **Pair a phone**, paste the key into **Tailnet key** and
    press **Pair**. The field empties as you press.
    **You should see** a QR code, "Scan it with Tortie on your iPhone. The phone must join and pair before
    this code shuts." and "Shuts in 3:00" counting down. You have three minutes.
    On the phone, open Tortie. It says "Pair with your Mac". Allow the camera when iOS asks, then point the
    camera at the code.
    **You should see** "Check this matches your Mac" with six groups of four characters, and a spinner while
    the phone joins your tailnet. That can take up to about 40 seconds. If iOS asks to find devices on your
    local network, choose Allow. Then the Mac's card shows your phone's name (probably just "iPhone"),
    "MATCH THIS ON YOUR IPHONE" (the group labels on that page are drawn in capitals), the same six groups and the lines to read. Compare all six groups, then
    press **Allow**.
    **You should see** "Paired with iPhone." on the Mac, the phone listed under **Phones** with its 100.x
    address and the same six groups, and the phone open on its list of sessions.
    If the phone says one of these instead:
    - "This code carries no Tailnet key. Nothing was paired." You pressed Pair with the field empty.
    - "Tailscale refused the Tailnet key. Nothing was paired." The key was used, expired or is for another
      tailnet. Make another one (row 10).
    - "Your tailnet requires network flow logs, which Tortie turns off. Nothing was paired." Turn flow
      logs off (row 4), delete the stopped `tortie-phone` on the Machines page, and make another key
      (row 10), because this one is spent.
    - "Tortie could not reach Tailscale. Nothing was paired." Tailscale did not answer within about 40
      seconds. Check the phone has internet and try again.
    - "The code expired. Nothing was paired." Press Pair on the Mac again.
    For each of these, press **Pair again** on the phone before you scan again.

12. **Read.** **You should see** "Sessions". "Needs your input (n)" comes first when any session is waiting
    on you, then "Everything else (n)". Each row has its dot, its name and an age such as 2m. Under the name,
    a waiting row shows its project and the question, and any other row shows its status and project. A
    session on another machine carries that machine's name. At the foot you see "read" with the time and
    "Waits first seen after your Mac wakes or Tortie restarts are timed from then."
    Tap a working session. **You should see** its status, the agent and project, the Catch Me Up line, the
    **Messages** and **Last message** counts, and the agent's last answer. A waiting session also shows the
    agent's choices with "Answer this in the session." You can read them but not press them.
    Tap **Conversation**. **You should see** "The terminal’s own output stays on your Mac." and the newest
    turns at the bottom. Your words are under "you" as you typed them, and the agent's are under
    "the agent", formatted. Scroll up to load older turns, all the way to the first one.
    This screen had no approved design (your decision 3), so say what you would change.

13. **Watch progress.** On the Mac, ask that session something. On the phone, pull down on the session's
    screen or on the list.
    **You should see** the new turn and the session's new status. Leaving the app and coming back to it also
    refreshes.

14. **Leave the house.** Turn Wi-Fi off on the phone and pull down on the list.
    **You should see** the list again, reached over cellular.

15. **Check Tailscale.** In the admin console, open **Machines**.
    **You should see** `tortie-phone`, tagged `tag:tortie-phone`, with key expiry disabled, which is
    Tailscale's default for a tagged device. Check this rather than trusting it.

16. **Remove it.** On the Mac, under **Phones**, press **Remove**.
    **You should see** "Read what it answers, then allow it." under the switch, with the lines again. The door
    stops answering every phone until you agree to the new list. A pull on the phone now says "Tortie could
    not reach your Mac." Press **Allow** on the Mac, then pull on the phone again.
    **You should see** the phone go back to "Pair with your Mac" and say "This iPhone is not paired with a
    Mac."
    The **Pair a phone** card may still say "Paired with iPhone." after Remove. Ignore it; that stale line is
    fixed in 316.5.

## Not covered yet

- **No alerts.** They arrive in 316.5. Until then, leave **Alert my phone when a session waits** off,
  because it sends nothing.
- **Nothing on the phone can change a session.** There is no End (Phase 317), and no answering or typing
  (Phase 318).
- **Nothing answers while the Mac is asleep or Tortie is not running.**
- **A Mac without the Tailscale app is not supported.**
- **The terminal's own output is not on the phone, by design.** The conversation is.
- **A session on another machine never shows as waiting on you**, on the phone or on the Mac.
- **Reinstalling the app, or moving to a new phone, forgets the pairing.** Make a new key and pair again.
- **Removing the phone in Tortie leaves `tortie-phone` on your tailnet, and its key never expires.** Delete it
  on the Machines page when you are done with it. After that, the first scan says "This iPhone is not paired
  with a Mac." and the second, with a new key, joins.
- **Tailscale's support cannot see the phone's logs**, because Tortie turns them off. For the same
  reason, if you ever turn network flow logs on, the phone stops reaching your Mac and says "Tortie could
  not reach your Mac."
- **A join that Tailscale never answers takes about 40 seconds to say so.**
- **The app handles one Mac per phone, and has dark mode and portrait only.**
- **Only you can install it.** It is on internal TestFlight and not in the App Store, and a TestFlight build
  expires after 90 days.

## When you are done

Keep the dev build running, or quit it and reopen 0.110.0. Nothing in the manifest or the database has
changed since 0.109.0 (`git log v0.109.0..HEAD -- src/main/manifest src/main/db` is empty), so the release
opens your sessions as before. The door's files stay behind, unread.

---

## Where each row was checked against the tree (for the agents)

Line numbers are at this phase's head. "His side" means text in Tailscale's console, App Store Connect or
TestFlight. No agent may sign in to those, so those words were not checked here. The Xcode words were read
out of Xcode 26.3's own binaries where Xcode carries them as text.

| Row | What it tells him to find | Where it is |
| --- | --- | --- |
| 1 | `npm run dev`; his checkout | `package.json:14`. His checkout, read only: two local `docs(design)` commits over merge base `0a7391ea`; nothing upstream since then touches `package-lock.json`, and `package.json` changed only in its scripts, so no install is needed |
| 2 | The app menu's **Pair a Phone…** under **Settings…** | `src/main/menu.ts:592` and `:615` (`openSettingsWindow('phone')`); the rail's **Phone**, `src/renderer/settings/SettingsApp.tsx:123`. The menu bar names the app menu from the running bundle, which in `npm run dev` is `node_modules/electron/dist/Electron.app` (`CFBundleName` Electron, read from his checkout) |
| 2 | **Let my phone reach this Mac**, **Allow** | `src/renderer/settings/PhoneSection.tsx:62`, `:66` |
| 2 | The lines "Answers on this Mac's tailnet address: …" to "Allows no phone yet" | `describePocketDoor`, `src/main/pocket/pairing.ts:359` to `:387`; the two sentences under them, `src/shared/ipc/pocket.ts:518` and `:529` |
| 2 | "Listening on 100.x.y.z:8823" | `doorListening`, `PhoneSection.tsx:113`; port `POCKET_DEFAULT_PORT`, `src/main/pocket/ipc.ts:152` |
| 3 | **Keep the phone to this door**, the copy icon titled **Copy the grant**, the narrowing | `PhoneSection.tsx:94` to `:100`; the icon and its title, `src/renderer/settings/CopyButton.tsx:24` to `:25` |
| 3 | The grant's text | `POCKET_TAILNET_GRANT_TEMPLATE`, `src/shared/ipc/pocket.ts:602`, composed with the door's address and port by `pocketGrantText` (`:612`) in `ipc.ts:479` |
| 3, 4, 10, 15 | Access controls, Logs, Network flow logs, Keys, Generate auth key…, Machines | His side. Why row 4 exists: tailscale.com v1.94.1 `ipn/ipnlocal/local.go:1771-1785` (SPEC, "Owed to S4") |
| 4, 11 | What the phone says when his tailnet requires flow logs | `Copy.tailnetFlowLogs`, `ios/Tortie/Style/Copy.swift:236`. The backend's words it is told apart by, `TailnetRules.flowLogsRefusal`, `ios/Tortie/Tailnet/Node.swift:153`, which `local.go:1772` sends as its `ErrMessage`, `tsnet/tsnet.go:396-397` returns from `Up` and libtailscale hands over as `TailscaleError.internalError`; `LiveTailnetRunning.up()` turns that into `TailnetFlowLogsRequired`, and `join` maps it before a refused key. Held by `conformance:ios` rule q (every built slice holds the words) and `TailnetNodeTests`. Not driven against a real tailnet: no agent may run a control that accepts a key |
| 10 | A key starting `tskey-auth-` | `TAILNET_AUTH_KEY_PREFIX`, `src/main/pocket/pairing.ts:919`, and the refusal at `:958` |
| 5 | `npm run vendor:tailscalekit` and its last line | `package.json:261`; `build/build-tailscalekit.mjs:1053` ("built →") and `:963` ("already built") |
| 5 | Archive opens the Organizer, in Release | `ios/Tortie.xcodeproj/xcshareddata/xcschemes/Tortie.xcscheme:79` to `:81` (`buildConfiguration = "Release"`, `revealArchiveInOrganizer = "YES"`) |
| 5 | **Any iOS Device (arm64)**, **Register Device** | Xcode 26.3: `Any %@ Device` in `IDEiOSSupportCore`, `Register Device` in `DVTDeviceProvisioning` |
| 6 | `--read-app` on an `.xcarchive`, and its line | `build/p316/test-ios.mjs` (`appAt`, `builtAppProblems`, `PASS_WORDS`). It was run on an unsigned device archive of this tree and passed. It went red on two ablated archives: `-framework NetworkExtension` in `OTHER_LDFLAGS`, and `CLANG_COVERAGE_MAPPING=YES` (9 coverage sections) |
| 7 | **Distribute App**, **TestFlight Internal Only** | Xcode 26.3: `TestFlight Internal Only` in `IDEDistribution`. `Distribute App` is drawn from a nib, and no plain text in Xcode names it |
| 7 | The symbols warning | The archive's `dSYMs` holds `Tortie.app.dSYM` only; TailscaleKit (UUID `4A61126D-EFCA-3521-9D0D-1F306B1801DB` in the integrator's unsigned archive) has none. The warning's wording is Apple's and was not read here |
| 8, 9 | Missing Compliance, Manage, TestFlight, Install | His side. The missing key: no `ITSAppUsesNonExemptEncryption` in `ios/Tortie/Info.plist` (decision 7) |
| 9 | The icon and the name | `CFBundleDisplayName` Tortie, `ios/Tortie/Info.plist:7`; the icon, `ios/Tortie/Assets.xcassets/AppIcon.appiconset/` (builder A, this phase) |
| 11 | **Pair a phone**, **Tailnet key**, **Pair** | `PhoneSection.tsx:69`, `:71`, `:73` |
| 11 | The scan line, "Shuts in 2:59", three minutes | `SCAN_LINE`, `PhoneSection.tsx:80`; `shutsIn`, `:123`; `POCKET_PAIRING_WINDOW_MS`, `src/main/pocket/pairing.ts:909` |
| 11 | "Match this on your iPhone", "Paired with iPhone." | `MATCH_LABEL`, `PhoneSection.tsx:82`; `pairedWith`, `:118`; the name is `UIDevice.current.name`, `ios/Tortie/App/TortieApp.swift:105` |
| 11 | Six groups of four, both screens | `pairFingerprint`, `src/main/pocket/pairing.ts:886` to `:891`, and `ios/Tortie/Door/Signing.swift:211` to `:216` |
| 11 | The phone's words: "Pair with your Mac", "Check this matches your Mac", the five failures, "Pair again" | `ios/Tortie/Style/Copy.swift:167`, `:182`, `:193`, `:225`, `:230`, `:236`, `:240`, `:247`; their mapping, `ios/Tortie/Screens/DoorWords.swift` `pairingSentence` |
| 11 | The camera and local network prompts | `NSCameraUsageDescription` and `NSLocalNetworkUsageDescription`, `ios/Tortie/Info.plist:36` to `:39` |
| 12 | "Sessions", both headers (drawn only when not empty), "read", the age sentence | `Copy.swift:58`, `:61`, `:66`, `:73`; `ios/Tortie/Screens/ListScreen.swift:87` to `:100`; `POCKET_AGE_HONESTY`, `src/shared/ipc/pocket.ts:592` |
| 12 | **Messages**, **Last message**, "Answer this in the session.", **Conversation**, the terminal line, "you", "the agent" | `Copy.swift:87`, `:90`, `:132`, `:136`, `:158`, `:141`, `:144` |
| 13 | Pull down refreshes, and so does coming back | `.refreshable` in `ListScreen.swift:216`, `SessionScreen.swift:146`, `ConversationScreen.swift:273`; the foreground refresh, `TortieApp.swift:214` |
| 15 | `tortie-phone`, never ephemeral | `ios/Tortie/Tailnet/Node.swift:127` and its header's (c) |
| 16 | **Remove**, the door asking again | `PhoneSection.tsx:87`; `removePhone`, `src/main/pocket/ipc.ts:868` (a listening door closes until you confirm again); `DOOR_WAITING`, `PhoneSection.tsx:64` |
| 16 | "Tortie could not reach your Mac.", then "This iPhone is not paired with a Mac." | `Copy.swift:252`, `:220`; `DoorWords.swift` (a closed door is `unreachable`, which is drawn; a refused list is `pairAgain`) |
| Not covered | Flow logs turned on later: "Tortie could not reach your Mac." | Predicted from the code, not driven: a read starts the node from its state, `up()` fails with the same refusal, and `route(to:)`'s last catch (`ios/Tortie/Tailnet/Node.swift`) answers `DoorFailure.unreachable`, drawn as `Copy.cannotReachMac` |
| Not covered | Leave the alert switch off | `PUSH_LABEL`, `PhoneSection.tsx:91`; SPEC S5, files row 1 (the engine is composed only in 316.5) |
| When done | No schema change since 0.109.0 | `git log v0.109.0..HEAD -- src/main/manifest src/main/db`, empty at this head |
