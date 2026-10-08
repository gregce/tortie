# Phase 316.6 — the tab bar, Settings and the rendered conversation: your checklist

This is how you check, on your iPhone, the three tabs at the bottom of the app, Settings with **Unpair this
iPhone**, and that answers are drawn exactly as the build before drew them, because markdown is off by your
ruling of 2026-10-02 ("Ship tabs + Settings, markdown off"). It is written for you to follow at
the Mac with the phone beside you. Each row says what to open, what to press and what you should see. Every
agent run drove the app in Simulators against a stand-in door and read only labels and frames, never a
picture, so **whether the badge is really amber on your phone (row 3) is yours alone to see**, and
`probe:p316` passing is the floor, not the finish. The table at the end says where each button and
sentence was checked against the tree, and is for the agents rather than for you.

## Already done

- Tortie 1.0.0 (3), Phase 316.5's alert build, is archived or uploaded. 1.0.0 (4), this phase's app,
  supersedes it.
- Nothing on the Mac changed in this phase: no door, no route, no menu, no setting.

## The checklist

1. **Get this build on the Mac.** Nothing on the Mac changed in this phase, so any build since 316.5
   serves. If yours is older, quit Tortie (⌘Q, or Control-C where you ran `npm run dev`); your sessions keep
   running, because tmux holds them. Then, in Terminal:

   ```
   cd ~/gmux
   git pull --rebase --autostash origin main
   npm run dev
   ```

   **You should see** Tortie open with your sessions.

2. **Archive, check and upload Tortie 1.0.0 (4).** Leave `npm run dev` running and open a **new Terminal
   tab** (⌘T). In `~/gmux`, run `open ios/Tortie.xcodeproj`. In Xcode's toolbar choose the scheme
   **Tortie** and the destination **Any iOS Device (arm64)**, then **Product → Archive**.
   **You should see** the Organizer open on **Archives** with Tortie 1.0.0 (4) at the top.
   Right-click it and choose **Show in Finder**. In the new Terminal tab, in `~/gmux`, type
   `node build/p316/test-ios.mjs --read-app ` with a space at the end, drag the `.xcarchive` onto the
   window, and press Return.
   **You should see** one line ending "none links NetworkExtension or TailscaleKit, none carries code
   coverage, no DEBUG seam, and it asks Apple for its alert address". It now also checks that the build
   can tell Apple to stop alerts when you unpair; if it prints anything else, do not upload.
   In the Organizer press **Distribute App**, choose **TestFlight Internal Only** as before, then
   **Distribute**. If App Store Connect says **Missing Compliance**, press **Manage** and answer as before.
   **Superseded for any build that may go to the public:** choose **App Store Connect**, as `build/p333/CHECKLIST.md` says.
   Install 1.0.0 (4) from TestFlight on the iPhone.

3. **Open Tortie.**
   **You should see** three tabs at the bottom, **Needs input**, **Sessions** and **Settings**, with
   **Needs input** selected, and on it an amber circle with a dark number: the same number as **Sessions
   That Need Input** (⌘J) on the Mac. If nothing waits, there is no badge. Write down the badge's colour:
   no agent can see it.
   Press **Sessions**, open a session, press **Needs input**, then **Sessions** again.
   **You should see** the session still open, with the tab bar under it.

4. **An answer, drawn as before.** On the Mac, in one of your agent sessions, ask (your own turn) for a
   short markdown table of two columns and two rows, a short list and one code block. On the phone, open
   that session, then its conversation.
   **You should see** the answer exactly as the build before drew every answer: bold and code still drawn,
   the heading, the list and the table as the characters the agent wrote, with their `#`, dashes and pipes,
   and no columns; the code block runs together on one line in the code face, as it did before. Markdown is
   off by your ruling; it comes back with a later phase that draws the conversation lazily.

5. **A link is its words.** In an answer that has one, tap a link's words.
   **You should see** nothing open and no alert: a link is drawn as its words and cannot be pressed, as in
   the build before.

6. **Settings.** Press **Settings**.
   **You should see** **This Mac** with your Mac's name, its address and port, `read` and a time,
   "Check this matches your Mac" over six groups of four that equal your iPhone's row under **Phones** in
   Settings then **Phone** on the Mac, and `Paired · ` with the day you paired. Under **Alerts**,
   **Notifications** says **Allowed** and opens iOS Settings for Tortie (it says **Off** if you turned
   alerts off in iOS, and the card is not there at all for a Mac that cannot send alerts). Under
   **About**, **Version** says **1.0.0 (4)**.

7. **Unpair.** Press **Unpair this iPhone**.
   **You should see** "Unpair this iPhone?" and "It forgets this Mac and its keys. Your Mac lists this
   iPhone until you press Remove in Settings then Phone.", with **Unpair** and **Cancel**. Press **Cancel**:
   nothing changes. Press **Unpair this iPhone** again, then **Unpair**.
   **You should see** "Pair with your Mac" and "This iPhone is not paired with a Mac." Make a session wait
   on you on the Mac: **no alert should arrive** (an observation; write down what you saw). Then on the Mac,
   in Settings then **Phone**, press **Remove** beside the iPhone, then **Pair**; scan the code, answer iOS
   if it asks, compare the six groups, and press **Allow**.
   **You should see** Tortie back on **Needs input**.
   If Unpair says "This iPhone could not forget your Mac. Nothing was changed.", nothing was changed: the
   pairing is still there and still works.

## Not covered yet

- **The Mac learning of an Unpair**, and **End**, are Phase 317. Until then the Mac lists the iPhone until
  you press **Remove**.
- **Reply** is Phase 318.
- **Privacy and support links**, and "Tortie for Mac is free at tortie.sh", are Phase 333.1.
- **The sample** is Phase 333.3.
- **The badge's colour on iOS 26's glass tab bar** has not been seen by anyone. Your phone runs iOS 18,
  whose tab bar honours it.
- **Markdown in the conversation**, headings, lists, code and tables drawn and a plain `https` link you can
  open after its whole address is shown, is built and kept in the app but switched off by your ruling of
  2026-10-02, until a later phase draws the conversation lazily. When it comes back, an address an
  installed app claims opens that app rather than Safari, and a name can still lead back to a machine near
  you.

## When you are done

Keep the dev build running. Nothing is released until you say the phone works end to end (your ruling of
2026-09-21).

---

## Where each row was checked against the tree (for the agents)

Re-read by builder `proof` on 2026-10-01 against the worktree `/private/tmp/wt-p3166` while the other two
builders were still working, then **re-read by the integrator against the landed tree the same day: every
line number below held**, and row 7's `Copy.pairTitle` was added. **The fix round (2026-10-01) moved four**:
`Links.swift` `:149` and `:162`, `Copy.versionLine` `:413`, and `Keys.swift` `:518` and `:530`, and rewrote row 4's.
**Markdown off (2026-10-02) rewrote rows 4 and 5** and the item under "Not covered yet"; no other row moved. "His side" means text in Xcode, iOS,
App Store Connect or TestFlight, which no agent may sign in to.

| Row | What it tells him to find | Where it is |
| --- | --- | --- |
| 1 | `npm run dev`; nothing on the Mac changed | `package.json`; `src/**` unchanged by this phase (`node build/contract-inventory.mjs --check` unchanged, `src/main/menu.ts` unchanged) |
| 2 | Tortie 1.0.0 (4) | `CURRENT_PROJECT_VERSION = 4` and `MARKETING_VERSION = 1.0.0` in all six configurations of `ios/Tortie.xcodeproj/project.pbxproj` (`:417`, `:427`, `:449`, `:459`, `:479`, `:482`, `:501`, `:504`, `:522`, `:525`, `:543`, `:546`); `PHONE_BUILD = '4'`, `build/conformance-ios.mjs` |
| 2 | `--read-app` and its line, unchanged | `PASS_WORDS`, `build/p316/test-ios.mjs:224`, pinned because this checklist and 316.5's quote it; the new Release read of `unregisterForRemoteNotifications` has its own problem line and does not change the PASS words (`UNREGISTER_SELECTOR`, same file) |
| 2 | **Any iOS Device (arm64)**, **Distribute App**, **TestFlight Internal Only**, Missing Compliance | His side, as in `build/p3165/CHECKLIST.md` row 2 |
| 3 | **Needs input**, **Sessions**, **Settings** at the bottom, Needs input selected every launch | `Tab(Copy.needsInput, systemImage: "bell"…)`, `Tab(Copy.sessions, systemImage: "list.bullet"…)`, `Tab(Copy.settings, systemImage: "gearshape"…)`, `ios/Tortie/App/TortieApp.swift:465`, `:474`, `:482`; the words, `ios/Tortie/Style/Copy.swift:61`, `:71`, `:66`; the Mac's own: `label: 'Needs input'`, `src/renderer/session-manager/copy.ts:112`; `SHEET_TITLE = 'Sessions'`, `:46`; `title: 'Settings'`, `src/main/settings/window.ts:65`. Held by `conformance:ios` (b) |
| 3 | The badge: an amber circle, a dark number, ⌘J's count | `.badge(app.waitingBadge)`, `TortieApp.swift:473`; `TabBarLook`, `ios/Tortie/Style/Tokens.swift:154`, from `--status-attention-badge-bg` `#f5b84a` and `-fg` `#131417`, `src/renderer/styles/tokens.css:105-106`; ⌘J is **Sessions That Need Input**, `src/main/menu.ts:1196-1201`. The number is driven by `probe:p316` T2b against the door's `/v1/blocked`; the colour is his observation (SPEC §3 row 1) |
| 3 | The session still open after switching tabs, the bar under it | One `NavigationStack(path:)` per tab, `TortieApp.swift`; no `.toolbar(.hidden, for: .tabBar)` anywhere (`conformance:ios` (b)). Driven by `probe:p316` T2c and T2d |
| 4 | The answer exactly as the build before drew it: bold and code drawn, a heading, list or table as its characters, a code block on one line in the code face | `MarkdownCaps.pieces = 0`, `ios/Tortie/Markdown/Caps.swift`, so `RenderedAnswer` takes `Inline.asWritten` for every answer (`ios/Tortie/Markdown/Rendered.swift`) and `WrittenView` draws it with the parent's five modifiers (`ios/Tortie/Screens/MarkdownView.swift`); held by `conformance:ios` y2 (the 0, with his ruling as its reason), y13, y15 and y16. Equal to `28d89295`'s `AnswerMarkdown.render`, attribute for attribute, over 11,355 inputs on the host (SPEC "As built, markdown off"); driven by `probe:p316` MD1 (every planted answer one element `md-<turn>-0`) and PR (each equal to the parent's), and `MarkdownPiecesTests` (every fixture and every committed real answer drawn as written, equal to the parent's) |
| 5 | A link is its words; nothing opens | `Inline.asWritten` removes every link and image address, `ios/Tortie/Markdown/Inline.swift` (`conformance:ios` y15); `ScreensDrawingTests.testLinksAndImagesAreWordsOnly`; driven by `probe:p316` MD2 (no link element in any planted answer). The gate `Links.swift` keeps for the later phase is still installed and is never reached |
| 6 | **This Mac**, the name, address and port, `read`, "Check this matches your Mac", the six groups, `Paired · <date>` | `ios/Tortie/Screens/SettingsScreen.swift`; `Copy.thisMac`, `Copy.paired`, `Copy.pairMatchLabel`, `Copy.swift:275`, `:279`, `:195`; the fingerprint the Mac draws on each Phones row, `PhoneSection.tsx:619`. Driven by `probe:p316` S6 |
| 6 | **Alerts**, **Notifications**, **Allowed** / **Off** / no card | `Copy.alerts` (the Mac's `ALERTS_GROUP = 'Alerts'`, `PhoneSection.tsx:100`), `Copy.notifications`, `Copy.notificationsAllowed`, `Copy.notificationsOff`, `Copy.swift:282`, `:285`, `:289`, `:292`; opened through `UIApplication.openNotificationSettingsURLString`, `SettingsScreen.swift:313-314`. Driven by `probe:p316` S6 (order: Allowed; deny: Off; N11: no card) |
| 6 | **About**, **Version**, **1.0.0 (4)** | `Copy.about`, `Copy.version`, `Copy.versionLine`, `Copy.swift:322`, `:325`, `:413`, read from the bundle's `CFBundleShortVersionString` and `CFBundleVersion` |
| 7 | **Unpair this iPhone**, "Unpair this iPhone?", the note, **Unpair**, **Cancel** | `Copy.unpairThisIPhone`, `Copy.unpairQuestion`, `Copy.unpairNote`, `Copy.unpair`, `Copy.swift:298`, `:301`, `:308`, `:311`; the note's three Mac words, `BTN_REMOVE = 'Remove'`, `PhoneSection.tsx:97`, `PHONE_TITLE = 'Phone'`, `:64`, `title: 'Settings'`, `window.ts:65`, pinned by `/// Names:` and `conformance:phonecopy` |
| 7 | "Pair with your Mac", "This iPhone is not paired with a Mac." | `Copy.pairTitle`, `Copy.swift:180`, and `Copy.notPaired`, `Copy.swift:234`; `AppModel.unpair`, `TortieApp.swift:353`, `LiveDoor.unpair`, `:656`; the record first, then every client key, `PairingStore.forget`, `ios/Tortie/Door/Keys.swift:518`, `holdsRecord`, `:530`. Driven by `probe:p316` U1 on iOS 18.3, and `UnpairKeychainTests` on the real Simulator keychain (`test:ios`) |
| 7 | No alert after Unpair | In Release, `unregisterForRemoteNotifications()`, `ios/Tortie/Alerts/SystemAlerts.swift:76`, in the `#else` of `#if DEBUG`, after the record went (`conformance:ios` (x)); read in the built archive by `--read-app`. His observation: no agent may reach Apple |
| 7 | **Remove**, **Pair**, back on **Needs input** | `BTN_REMOVE`, `PhoneSection.tsx:97`; pairing lands on Needs input, `AppModel.paired`, `TortieApp.swift`. Driven by `probe:p316` U1's second drive |
| 7 | "This iPhone could not forget your Mac. Nothing was changed." | `Copy.unpairFailed`, `Copy.swift:318`; `UnpairTests` (a store whose record will not go leaves the keys untouched) |
| Not covered yet | The badge on iOS 26's glass bar | SPEC §12 concern 2 |
