# Phase 316.6 — the tab bar, Settings and the rendered conversation — SPEC

Written by the spec step (the entry's S0) on 2026-09-30 in `/private/tmp/wt-p3166` at `28d89295` (origin/main: Phase
316.5 "the alert opens the session it names" landed at `f90ff8cc`, and its running-log line at `28d89295`). **`28d89295`
is the parent build for every "before" measurement.** Every `file:line` below was re-read at this head.

Read with it, whole: `docs/BACKLOG.md` "## Phase 316.6" (the entry; every line binds); `build/p3165/SPEC.md` and its two
"§As built" sections (316.5 as built: the research-136 `sends` word, `Pair again to get alerts.`, the alert tap, rules
(w) and (x)); `build/p316/SPEC.md` §4.0 (every phone step's rules) and §6 decision 3 (the conversation had no mock).
**Where the entry and 316.5 as built disagree, 316.5 as built wins, and §3 says so row by row.** Where this file and the
entry disagree, this file wins and §3 says why.

**His approval.** "ok great" (2026-09-30) to this phase: the entry's S0 drafts are taken AS WRITTEN. The mock is still
made (§4), because `conformance:phonecopy` judges every word against it, but building does not wait on him.

**The hard rules for every step of this phase, stated once.** iOS only: no Mac change, no door change, no route, no IPC
channel, no env name. Never read his keychain, credentials, conversation stores or his APNs key (`~/Keys`, any `.p8`).
No request to Apple's real APNs hosts. No `tailscale funnel`, nothing that changes his tailnet: the Funnel child is
Phase 330's stand-in and DNS is Phase 332's. Never bind a real interface. Install nothing (no Swift package, no npm
package). Never `-L gmux`, never `pkill` or `killall` or a pattern: a process is ended only by the pid its starter holds.
`npm run shot` is forbidden, and no screenshot or screen recording of a Simulator is ever taken: a visual claim is a frame
or a label XCUITest read. Gemini, Qwen, Antigravity and Grok are never started (a scratch `agents.json` renames them
before every Electron launch, read back through `agents:list`). **No model turn: 0.** Simulators only through
`build/simulator-run.mjs`; every `xcodebuild` uses its own `-derivedDataPath` under the scratchpad, ad hoc, no team,
device builds unsigned. Builders and the integrator launch no Electron and boot no Simulator. Verifiers take THE LOCK
(phone phases first, his rule of 2026-09-30). No raw control bytes in any committed file, and (this phase's addition) no
bidi, zero-width or BOM character either: every such fixture is written as an escape (§7.2).

---

## 1. The answer first

**What gets built.**

1. **Three tabs**: Needs input (`bell`, with the Mac's amber count badge), Sessions (`list.bullet`) and Settings
   (`gearshape`), each its own `NavigationStack`, built with the iOS 18 `Tab` initialiser. The app opens on Needs input
   every launch and stores no tab. The bar stays on a pushed session. 316.5's alert tap selects Needs input and replaces
   its path. The badge's colour reaches UIKit's tab bar through `UITabBarAppearance` with a `UIColor` made in
   `Tokens.swift`, the one file that writes a colour.
2. **Settings** (NEW `Screens/SettingsScreen.swift`), house cards, no door read: **This Mac** (the public name's first
   label, `name:port`, `read 4:32 PM` from the list's last answer, the six-group fingerprint under "Check this matches
   your Mac", and `Paired · <date>`); **Alerts**, only for a pairing whose Mac said it can send (316.5's `sends`): what
   iOS allows, opening iOS Settings; **Unpair this iPhone**; **About** (`Version`, `1.0.0 (4)`).
3. **Unpair this iPhone** forgets the pairing on the phone: the record (which holds both private keys) first, then every
   client key and its certificate; reports whether the record went; in Release calls
   `unregisterForRemoteNotifications()` once; drops the models and returns to Pairing with its not-paired line. If the
   record stays: "This iPhone could not forget your Mac. Nothing was changed." The Mac's half is Phase 317's.
4. **The answer drawn as markdown** by Tortie's own Swift (NEW `ios/Tortie/Markdown/` and `Screens/MarkdownView.swift`):
   a line-based block parser in Foundation alone, Foundation's inline parser over each run, every cap in one enum, no
   web view, nothing fetched, and a link pressable only when it is `https` with a plain host and no user part, shown in
   full before iOS opens it.
5. **The build number moves 3 → 4** in all six configurations. `MARKETING_VERSION` stays 1.0.0.

**The seams, decided (§5 gives the reasons):**

| Seam | Decision |
| --- | --- |
| The tab type | `enum AppTab: Hashable { case needsInput, sessions, settings }` in `App/TortieApp.swift`; `AppModel.tab` starts `.needsInput` and is never stored |
| The tabs | `TabView(selection: $app.tab)` holding three `Tab(Copy.x, systemImage:, value:)` in that order: `bell`, `list.bullet`, `gearshape` |
| Per-tab paths | `AppModel.waitingPath: [Route]` and `AppModel.sessionsPath: [Route]`, one `NavigationStack(path:)` each; Settings has a `NavigationStack` and NO path, because nothing is pushed from it (§5.1.3) |
| The alert tap | `openFromAlert` sets `tab = .needsInput`, then `waitingPath = []` (`.list`) or `[.alerted(id:)]` (`.session`); `backToList(saying:)` empties `waitingPath` |
| One read for both list tabs | ONE `ListModel`; two `ListScreen`s over it (`kind: .needsInput` and `.sessions`); only the selected tab's screen reads on a return to the foreground |
| The badge's number | `AppModel.waitingBadge`: `drawing.waiting.count` of the list's last LOADED answer, else 0 (hidden). A count of an array the door sent; no arithmetic on status |
| The badge's colour | `TabBarLook.apply()` in `Style/Tokens.swift`, called once from `TortieApp.init()`: `UITabBarAppearance` with `badgeBackgroundColor` = `Token.statusAttentionBadgeBg.uiColor` and `badgeTextAttributes` = `Token.statusAttentionBadgeFg.uiColor`, for the stacked, inline and compact-inline item appearances, normal and selected |
| Settings' facts | `PairedFacts` (`Screens/DoorWords.swift`), public fields only, read from the reader the app ALREADY holds: `DoorReading` gains `var facts: PairedFacts { get }` beside 316.5's `alerts` (§3 row 6 says why not `PhoneDoor.pairedFacts()`) |
| What iOS allows | `AppModel.alertPermission: PushAuthorization?`, read by `readAlertPermission()` in `App/TortieApp.swift` behind a guard on `macSends` (rule (x)'s launch-read clause), on Settings' appear and on every return to the foreground |
| Unpair | `PhoneDoor.unpair() -> UnpairOutcome` (`.forgotten` / `.kept`); `LiveDoor.unpair()` = `try store.forget()` in a `do`, then `store.holdsRecord`; `AppModel.unpair()`; `PushAddressing.forgetAddress()` (Release: `unregisterForRemoteNotifications()`, in the `#else` of `#if DEBUG` in `Alerts/SystemAlerts.swift`) |
| The parser | `MarkdownBlocks.parse(_ answer: String) -> MarkdownDocument` in `Markdown/Blocks.swift`, Foundation alone (§5.5) |
| Inline | `Inline.render(_ source: String) -> InlineText` in `Markdown/Inline.swift`, the app's ONE `AttributedString(markdown:` |
| The caps | `enum MarkdownCaps` in `Markdown/Caps.swift`, twelve members, each read at exactly one site (§5.5.3) |
| Links | `LinkPolicy` and the ONE `OpenURLAction` in `Markdown/Links.swift`; the gate applied once, to the reading root, as `.linkGate()` |
| Where the parse runs | Once per answer and never in a `body`: `SessionDrawing.init` (the last answer) and `ConversationModel` as each page is accepted |
| Drawing | `MarkdownView` (`Screens/MarkdownView.swift`) behind `AnswerText(answer: RenderedAnswer, scope: String)` |

**What does not change:** the Mac (`src/**`), the door, the routes (R4's pin), the confirm hash, the contract baseline
(`docs/audits/contract-baseline.txt`, no line moves), the menus (`src/main/menu.ts` asserted unchanged), the manifest,
the tmux layer, every status, `Door/DoorClient.swift`, `Door/Pairing.swift`, `Door/Contract.swift`,
`App/AppDelegate.swift`, `Screens/PairingScreen.swift`, the entitlement, `Info.plist`, the privacy manifest and
`vectors.json`.

**Subject.** `feat(ios): a tab bar, Settings with Unpair, and markdown in the conversation`
**First body line.** `Phase 316.6: the tab bar, Settings and the rendered conversation`
**Semver.** The iOS app only: 1.0.0, build 4, after 316.5's 3. No Mac change. Unreleased under his rule.
**Tier 3.** Unpair deletes his credential on the phone; a link hands an address an agent wrote to the system, a new way
out of the app; and it draws bytes somebody else wrote, so a hostile fixture is mandatory. He asked for it, so the
parent is measured too. Two independent methods at least, one an attack (§7.6 names four).
**Charter.** The entry and its running-log line; `build/p316/SPEC.md` §4.0 and §6 decision 3; the 316.2 rule in
`ios/Tortie/Screens/AnswerText.swift:1-25` (the answer is markdown, the ask is not; its line "A LINK IS DRAWN AS ITS WORDS
AND NEVER OPENED" moves in writing to §5.5.5); research 128 (2.3.1(a), 4.2.7), research 136 §7, DESIGN.md §1.3,
CLAUDE.md's UI rules; his rulings of 2026-09-30 (Face ID only for End; alerts his alone).
**Menus.** No change. No Mac surface is added, renamed or removed.

---

## 2. The tree at this head, re-read

| The entry cites | At `28d89295` | Note |
| --- | --- | --- |
| `AnswerMarkdown.render` `AnswerText.swift:29-53` | `ios/Tortie/Screens/AnswerText.swift:29-53`; `AnswerText` `:56-69` | unchanged since 316.2 |
| the conversation draws it `ConversationScreen.swift:359-360` | `:359-366` (`TurnCard`, with `turn-answer-<i>` and the clipped line) | |
| the Session screen's last answer `SessionScreen.swift:266-275` | `:273-285` (`lastAnswer(_:)`, `session-answer`) | |
| `RootView` one `NavigationStack` `TortieApp.swift:183-245` | `App/TortieApp.swift:280-357` (`RootView`), `:297-307` the one stack | 316.5 grew the file |
| `ListScreen.swift:224-225` | `Screens/ListScreen.swift:220-269` (`ListScreen`), `:272-279` the title | |
| `PairedDoor` `Keys.swift:305-329` | `Door/Keys.swift:306-377`; `alerts: AlertsKept` at `:332` (316.5) | |
| `PhoneSection.tsx:574` (the phone row's fingerprint) | `src/renderer/settings/PhoneSection.tsx:619` | 316.5 grew the file |
| `PairingStore.forget` `Keys.swift:478-484` | `Door/Keys.swift:490-496` | record first (`try`), v1 (`try?`), every client key |
| `LiveDoor.forget` swallows its error `TortieApp.swift:352-354` | `App/TortieApp.swift:472-474` (`try? store.forget()`) | still swallows; Unpair does not use it (§5.4) |
| `PhoneDoor` `DoorWords.swift:48-62` | `Screens/DoorWords.swift:53-71`; `DoorReading` `:34-42` | |
| `status-words.ts:155` "needs input" | `src/shared/status-words.ts:155` | |
| `menu.ts:1196-1201` the bell | `src/main/menu.ts:1196-1201` | |
| `session-manager/copy.ts:46` "Sessions" | `:46` `SHEET_TITLE` | |
| `window.ts:65` "Settings" | `src/main/settings/window.ts:65` | |
| `tokens.css:105-106`, `:156` | `--status-attention-badge-bg: #f5b84a`, `-fg: #131417` at `:105-106`; `--error: #e5655e` at `:156` | dark base |
| `redact.ts:52` | `src/main/overview/redact.ts:52` (`[REDACTED:<name>]`) | the clip is `CLIP_CHARACTERS = 4_000`, `src/main/overview/turn-view.ts:27` |
| `DoorClient.swift:146` (2 MiB) | `Door/DoorClient.swift:146` `answerCap` | |
| `pipeline.ts:154` raw HTML dropped | unchanged | |
| react-markdown 10.1.0, remark-gfm 4.0.1 | present; so are `mdast-util-from-markdown` 2.0.3, `micromark-extension-gfm` 3.0.0, `mdast-util-gfm` 3.1.0, `mdast-util-to-string` 4.0.0 in `node_modules` | Method 2 needs nothing installed |
| the ask is `Text(verbatim:)` `ConversationScreen.swift:344` | `:344` | rule (h) |
| `conformance:ios` | 22 rules (`RULE_IDS`, `build/conformance-ios.mjs:4079`), PASS at this head, exit 0, 0.84 s, 23 app files, 18 test files, 50 files under `ios/` | measured by this step |
| `ablation:p316` | 154 arms (`build/p316/ablation-ios.mjs`) | |
| `conformance:phonecopy` | `OWNED_RULE_FLOOR = 34` (`build/p311/copy-drift.mjs:664`), `PHONE_MAC_FLOOR = 30`, `PHONE_NAMES_FLOOR = 3` (`:858-859`); `Copy.swift` holds 34 `/// Mac:` words and 4 named controls | |
| `HELPER_USER_FLOOR` | 157 (`build/assert-electron-teardown.mjs:357`) | this phase adds no script that reaches the helper |
| `PHONE_BUILD` | `'3'` (`build/conformance-ios.mjs:2645`); `CURRENT_PROJECT_VERSION = 3` at `project.pbxproj:417`, `:449`, `:479`, `:501`, `:522`, `:543` | |
| the project's file groups | `PBXFileSystemSynchronizedRootGroup` for `Tortie`, `TortieTests` and `TortieUITests` (`project.pbxproj:44-63`) | a NEW Swift file needs NO project edit; the project changes only for the build number |
| deployment target | `IPHONEOS_DEPLOYMENT_TARGET = 18.1`, Swift 5 with complete strict concurrency | `Tab` (iOS 18.0) and `onScrollVisibilityChange` (18.0) are inside the floor |
| Xcode and runtimes on this Mac | Xcode 26.3 (17C529); iOS 18.3 and 26.3 Simulator runtimes | |

---

## 3. Where the entry is wrong, stale or reconciled with 316.5 as built

| # | The entry says | What is true | This spec |
| --- | --- | --- | --- |
| 1 | The badge colour: "S0 measures whether iOS 26.3's glass bar honours these colours" | No agent can measure a colour: XCUITest reads labels and frames, and no screenshot is allowed | `conformance:ios` (a) holds that the colours asked for are the two tokens and are asked in `Tokens.swift` alone; a unit test reads the appearance back; whether the runtime DRAWS amber is his observation (checklist row 3). His iPhone runs iOS 18.x, whose tab bar honours `UITabBarAppearance`; iOS 26's glass bar is a named open concern (§12) |
| 2 | "`^[x](inflect: true)` stays text" with `allowsExtendedAttributes: false` | Measured by this step (macOS 15.6 host Foundation, `-O`): Foundation still consumes the `^[…](…)` syntax and keeps only its words: `^[x](inflect: true) %@ %n` draws `x %@ %n`. No attribute is applied. The parent (316.5) did exactly the same, so it is no regression | The fixture `format-specifiers` asserts `x %@ %n` and that no run carries an inflection or morphology attribute; Method 2 pins it as difference D4 (§7.5) |
| 3 | "a link shows its exact address before Safari opens it" | `UIApplication.shared.open` of an `https` address opens the app that claims it (a universal link) when one is installed, else Safari. Nothing but `SFSafariViewController`, which (z) refuses, forces Safari | The address he reads is still exactly what opens, and nothing opens without his press. The CHANGELOG item and the checklist say "opens it", not "Safari opens it"; the probe's MD2 opens `https://evil.example/x`, which no app claims, so Safari is what comes forward there |
| 4 | Unpair: "K1's device keychain read finds no `pairing-v2` item and no `tortie.client.` key" | K1 is a BYTE scan of `keychain-2.db`. SQLite keeps a deleted row's bytes in free pages until they are reused, and the Data Protection keychain encrypts most attributes, so a byte scan can neither prove an item gone nor find one present | U1's keychain proof is (a) `UnpairKeychainTests` on the REAL Simulator keychain through the shipping `LiveDoor.unpair()` (test:ios, Debug and Release, 26.3 and 18.3), and (b) the probe's relaunch with no forget seam drawing Pairing. The verifier may add a read-only `sqlite3` row count of a COPY of the device's keychain database as an independent method (§7.6) |
| 5 | Settings' row "says what iOS allows" | Rule (x) (316.5) allows `.authorization()` to be read only in `App/TortieApp.swift`, in a function that guards on the kept pairing's `macSends` first (`build/conformance-ios.mjs:3310-3319`) | `AppModel.readAlertPermission()` holds that guard; the screen draws `app.alertPermission` and never asks iOS itself |
| 6 | "`PhoneDoor` gains `pairedFacts()`" | `PhoneDoor` reads the Keychain (`LiveDoor.pairedReader()` calls `store.load()`, which also REMOVES a broken record); the reading app already holds the pairing in memory as `PairedReader.door` | `DoorReading` gains `var facts: PairedFacts { get }` beside 316.5's `alerts`. One Keychain read at launch, as today; Settings reads nothing |
| 7 | "Main.html gains the tab bar and loses its gear" | Main.html is the SESSIONS tab (today's list, both sections). The entry's Needs input tab is today's FIRST section alone, which no mock drew | Main.html is the Sessions tab; NEW `NeedsInput.html` is the first tab; `index.html` numbers twelve screens |
| 8 | NEW mocks: NeedsInput, Settings, Conversation | Two interruptions the phase adds have no frame: Unpair's question and the link's address | Two more NEW mocks, `Unpair.html` and `Link.html`, so every word of both sheets is judged (End.html is the precedent) |
| 9 | "Composer gains the tab bar" | With the keyboard up the bar is behind the keyboard and the strip rides above the keyboard | `Composer.html` draws no bar, with a comment saying why; `Session.html` and `Choice.html` draw the strip docked above it |
| 10 | Caps "64 KiB an answer" | Measured by this step: Foundation's inline parse of 64 KiB of realistic markdown took 40 ms best of three on this Mac (`-O`), 46 ms for 64 KiB of code spans, before any block parse. The honest maximum is main's 4,000 UTF-16 units, at most 12,000 UTF-8 bytes | `answerBytes = 32_768` (2.7× the honest maximum). Inline of 8 KiB measured 4 ms; the 8 KiB run cap stands |
| 11 | "a list number of at most nine digits" | CommonMark's own rule; a tenth digit makes the line a paragraph, which the fixture `list-overflow` holds | as written |
| 12 | (not said) A bare URL is autolinked by Foundation | Measured: `see https://apple.com`, `<https://apple.com>` and `www.apple.com` each come back as a link run (the last as `http://www.apple.com`) | `LinkPolicy` refuses a link whose words ARE its address (§5.5.5), which is what "a bare URL is never tappable" means in code |
| 13 | (not said) IDN and zero-width hosts | Measured: `https://аpple.com/` (a Cyrillic а, U+0430) comes back as `https://xn--pple-43d.com/`, ASCII letters, digits and hyphens; `https://app` + U+200B + `le.com/` comes back as `https://apple.com/`, the zero-width space dropped | `LinkPolicy` refuses any label beginning `xn--`; the zero-width case opens what the alert shows, which is the honest address; `MarkdownLinkTests` asserts it reads `https://apple.com/`, and the committed `bidi` fixture uses `p3166` + U+200B + `.example`, so no run's fixture names a real host |
| 14 | `test:ios` and 316.5's `--read-app` pass words | `PASS_WORDS` is quoted in his checklist | `--read-app` gains the unregister selector both ways (Release holds it, Debug does not) with its own problem line; the PASS words do NOT change, so his checklist's quote holds |
| 15 | (not said) The probe's `pair` step recognises "paired" by `screen-list` | After this phase pairing lands on Needs input | `screen-needs-input` is the paired screen; `list` selects the Sessions tab first; every 316.5 alert arm reads the Needs input tab's notice (§7.4) |
| 16 | (not said) `turn-answer-<i>` and `session-answer` labels are read by T1 and S1 | Each becomes a CONTAINER of block elements, whose own label is empty | The UI test composes an answer's text from its `md-<scope>-*` labels in order; T1 and S1 read that (§7.4) |
| 17 | (not said) Rule (k) names every integer operator in the app | A parser is index arithmetic, dozens of lines | (k) gains ONE named scope, the renderer, valid only while (y)'s door-type clause holds (§6.1) |

---

## 4. S0: the mocks, the words and where each is owned

### 4.1 The mocks (made by this step, in the house shape: a 390 × 844 frame, tokens' hexes only)

| File | What changed |
| --- | --- |
| `docs/design/phone/Main.html` | The Sessions tab. Loses its gear (the Settings button), keeps `Select` (owed to 317), gains the tab bar with Sessions selected and the badge `3` |
| `NeedsInput.html` (NEW) | The first tab: the title `Needs input`, a hairline, Main.html's three waiting rows frame for frame (no section header: the title and the badge say it), the foot, the tab bar with Needs input selected |
| `Settings.html` (NEW) | The title `Settings`; the This Mac card; the Alerts card with `Notifications` and `Allowed`; `Unpair this iPhone` (54 tall, `--error`); the About card with `Version` and `1.0.0 (4)`; the tab bar |
| `Unpair.html` (NEW) | Settings dimmed under an action sheet: `Unpair this iPhone?`, the note, `Unpair` in `--error`, `Cancel` |
| `Conversation.html` (NEW) | The conversation's first approved mock: one turn, the answer drawn as markdown (a heading, a paragraph with code and a link, a nested list with a done task, a code block, a quote, a table at its column cap with `2 more columns`, an image's placeholder) |
| `Link.html` (NEW) | The conversation dimmed under the link's alert: the address as the title, `Cancel`, `Open` |
| `Session.html`, `Choice.html` | The tab bar under the message strip (Sessions selected); 318's strip docks above it |
| `End.html` | The tab bar under the dim, covered by 317's sheet |
| `Composer.html` | No bar, with a comment: the keyboard covers it (§3 row 9) |
| `index.html` | Names twelve screens in order: Needs input, Sessions, Session, Composer, Choice, Conversation, Link, End, Settings, Unpair, Pairing, Lock; the stale "the tailnet key" caption corrected |

**The tab bar in the mocks** (every frame that draws it): 83 tall (49 and the home indicator's 34), `--bg-surface` with a
`--border` hairline on top; each item a 24 pt glyph over a 10/12 medium label; the selected item `--accent`, the others
`--text-muted`; the badge 18 tall, radius 9, 13/18 semibold tabular, `--status-attention-badge-bg` under
`--status-attention-badge-fg`. The app draws the SYSTEM bar (its material, its metrics) and sets only the badge's two
colours and the tint (`Tokens.accent`, already the root's); the mock is the intent, and iOS draws the bar.

**The colours, checked by this step:** the nine mocks the token test reads (`Main`, `NeedsInput`, `Session`, `Choice`,
`Pairing`, `Settings`, `Unpair`, `Conversation`, `Link`) spell exactly fifteen hexes, every one a dark-base token, and every
token `Tokens.swift` will hold is spelled: `#0e0f13 #131417 #191b20 #202329 #25282e #353943 #4d9de8 #565b66 #56c2c0
#838996 #8b93a1 #9ca1ab #c9cacd #e5655e #f5b84a` (a node read over the files, at this step).

### 4.2 Every new word, its owner and its Copy.swift line

Copy.swift is the TABS builder's file; the renderer's words are written by the tabs builder from this table (names
pinned). `/// Mac:` lines are judged byte for byte against the Mac module; `/// Phone:` lines carry their reason.

| Copy name | Literal | Owner line |
| --- | --- | --- |
| `needsInput` | `Needs input` | `/// Mac: src/renderer/session-manager/copy.ts ⟦label: 'Needs input'⟧` — the State filter's own word for exactly this list. Not `status-words.ts`'s `needs input`, because `macWordHolds` needs the literal itself and Copy.swift re-cases nothing |
| `settings` | `Settings` | `/// Mac: src/main/settings/window.ts ⟦title: 'Settings'⟧` |
| (existing) `sessions` | `Sessions` | unchanged |
| `thisMac` | `This Mac` | `/// Phone:` the card for the one Mac this iPhone is paired with. The Mac says This Mac of ITSELF (`src/renderer/machines/machine-choice.ts`), which is another machine's view, so the phone owns its own |
| `paired` | `Paired` | `/// Phone:` before the date this iPhone was paired; no Mac surface says when a phone paired |
| `alerts` | `Alerts` | `/// Mac: src/renderer/settings/PhoneSection.tsx ⟦ALERTS_GROUP = 'Alerts'⟧` |
| `notifications` | `Notifications` | `/// Phone:` the iOS setting the row opens, by iOS's own name for it |
| `notificationsAllowed` | `Allowed` | `/// Phone:` iOS allows Tortie's alerts. Never "On": the phone cannot see the Mac's switch |
| `notificationsOff` | `Off` | `/// Phone:` iOS does not allow them |
| `notificationsNotAsked` | `Not asked` | `/// Phone:` iOS has not asked |
| `unpairThisIPhone` | `Unpair this iPhone` | `/// Phone:` the press |
| `unpairQuestion` | `Unpair this iPhone?` | `/// Phone:` the sheet's title |
| `unpairNote` | `It forgets this Mac and its keys. Your Mac lists this iPhone until you press Remove in Settings then Phone.` | `/// Phone:` what Unpair does and does not do, until Phase 317's signed verb; with `/// Names: src/renderer/settings/PhoneSection.tsx ⟦BTN_REMOVE = 'Remove'⟧`, `/// Names: src/main/settings/window.ts ⟦title: 'Settings'⟧`, `/// Names: src/renderer/settings/PhoneSection.tsx ⟦PHONE_TITLE = 'Phone'⟧` |
| `unpair` | `Unpair` | `/// Phone:` the sheet's destructive press |
| `cancel` | `Cancel` | `/// Mac: src/renderer/settings/PhoneSection.tsx ⟦BTN_CANCEL = 'Cancel'⟧` |
| `unpairFailed` | `This iPhone could not forget your Mac. Nothing was changed.` | `/// Phone:` the record would not go, and nothing else was touched (§5.4) |
| `about` | `About` | `/// Phone:` the heading over the app's own facts (333.1's links land here) |
| `version` | `Version` | `/// Phone:` the app's version |
| `buildOpen` | ` (` | `/// Phone:` the build after the version, as Xcode and TestFlight write it, `1.0.0 (4)`; closed by `countClose` |
| `open` | `Open` | `/// Mac: src/renderer/arch/copy.ts ⟦ARCH_INSPECT_OPEN = 'Open'⟧` |
| `image` | `Image` | `/// Phone:` an image an answer names, which the phone never loads, when it has no words of its own |
| `bullet` | `•` | `/// Phone:` an unordered list item's mark, at every depth |
| `orderedMarkTail` | `.` | `/// Phone:` after an ordered item's number, as CommonMark draws it (a `)` delimiter is drawn `.` too) |
| `moreRowTail`, `moreRowsTail` | ` more row`, ` more rows` | `/// Phone:` a table cut at `MarkdownCaps.tableRows` or the cell cap; no Mac table is cut |
| `moreColumnTail`, `moreColumnsTail` | ` more column`, ` more columns` | `/// Phone:` a table cut at `MarkdownCaps.tableColumns` |
| `moreLineTail`, `moreLinesTail` | ` more line`, ` more lines` | `/// Phone:` a code block cut at `MarkdownCaps.fenceLines` |

Composed (no literal of their own): `versionLine(_ marketing: String, _ build: String)` → `1.0.0 (4)`;
`moreRows(_ n: Int)`, `moreColumns(_ n: Int)`, `moreLines(_ n: Int)` (the singular when `n == 1`);
`orderedMark(_ n: Int)` → `12.` (**ruled 2026-10-01**: `orderedMark(_ number: String)`, the digits the agent wrote, D17);
`cutShort(_ text: String)` → text + `pending` (the Mac's `PENDING = '…'`, which also
marks a line or a cell cut short). Reused: `restNotShown` (the byte cap), `dash` (a fact not read yet), `joined` (`Paired ·
Sep 30, 2026`), `noSuchSession`, `pairAgainForAlerts`, `notPaired`, `readAt`.

Counts after: 39 `/// Mac:` words (34 + 5), 7 named controls (4 + 3). Raise `PHONE_MAC_FLOOR` to 39 and
`PHONE_NAMES_FLOOR` to 7 in the same commit.

### 4.3 The mock's segments and their ledger rules (`build/p311/copy-drift.mjs`, the proof builder's)

This step ran `node build/p311/copy-drift.mjs --quiet` over the new mocks (exit 1, as it must before the ledger moves);
these are every segment no rule covers, and the rule each gets. Order matters: a specific rule goes before the general
`^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$` name rule.

OWNED (module `ios/Tortie/Style/Copy.swift` unless named; needle = the `static let` line):
`This Mac`; `Paired`; `Alerts` (module `src/renderer/settings/PhoneSection.tsx`, needle `ALERTS_GROUP = 'Alerts'`);
`Notifications`; `Allowed`; `Unpair this iPhone`; `Unpair this iPhone?`; the note; `Unpair`; `About`; `Version`;
`Conversation` (`static let conversation = "Conversation"`); `The terminal’s own output stays on your Mac.`;
`when: /^\d+ more columns?$/` (draws ` more column`); `Open` (module `src/renderer/arch/copy.ts`, needle
`ARCH_INSPECT_OPEN = 'Open'`); `•` (draws `•`). Existing rules already cover `Needs input`, `Sessions`, `Settings`
(its `why` is re-worded: "the Settings window's own title, the third tab's label and the Settings screen's title"),
`Cancel`, `read 4:32 PM`, `Check this matches your Mac`, `You`, `The agent`, the badge `3`.

DATA (each with its reason): `studio` (exact; "the Mac's name, the first label of its public name", placed before the
name rule); `when: /^[a-z0-9-]+\.tail[0-9a-f]+\.ts\.net:\d+$/` ("the Mac's public name and port, which Tailscale
composes and the code carries"); `when: /^[0-9a-f]{4}(?: [0-9a-f]{4}){5}$/` ("the pairing fingerprint, six groups of a
digest of three keys"); `when: /^[A-Z][a-z]{2} \d{1,2}, \d{4}$/` ("a date, in the phone's own format"); `when:
/^\d+\.\d+\.\d+ \(\d+\)$/` ("the app's own version and build, read from its bundle"); `when: /^\d{1,2}:\d{2} [AP]M$/`
("a turn's clock, in the phone's own format"); `when: /^https:\/\/[a-z0-9.-]+\/\S*$/` ("an address an answer links to,
drawn whole before it opens"); `make the session cookie httpOnly and show me what changed` ("the person's own ask");
and the agent's own answer, each exactly: `What changed`, `The cookie now sets httpOnly and sameSite. The pull request has
the diff.`, `src/auth/session.ts`, `sets both flags`, `reads the parsed cookie`, `test/session.test.ts`, `res.cookie('sid',
id, { httpOnly: true, sameSite: 'lax', secure: true });`, `The login handler is unchanged.`, the table's words (`File`,
`Added`, `Removed`, `Tests`, `Owner`, `Risk`, `Status`, `Merged`, `session.ts`, `session.test.ts`; `auth`, `low`, `done`,
`no` are matched by the name rule today and get their own exact rule with this reason before it), `the login screen before
the fix`. One rule per exact string, or one `when` that is an alternation of these exact strings — never a shape.

`OWNED_RULE_FLOOR` rises from 34 to the number of owned rules the run matches (16 new owned rules: `This Mac`, `Paired`,
`Alerts`, `Notifications`, `Allowed`, `Unpair this iPhone`, `Unpair this iPhone?`, the note, `Unpair`, `About`, `Version`,
`Conversation`, the terminal line, `n more columns`, `Open`, `•`; so 50, unless the builder's count differs, which its
report says). The self-test gains two mutations: a tab label re-cased in
`NeedsInput.html` (`>Needs input<` → `>Needs Input<`, the drawn text and not the document's `<title>`, which is exempt;
must name `Needs Input`), and the Mac's `BTN_REMOVE` renamed (a
`PHONE_MUTATIONS` row: `Copy.unpairNote` must go red).

---

## 5. The design, seam by seam

### 5.1 The tab bar — `App/TortieApp.swift`, `Screens/ListScreen.swift`

1. **Three tabs, no fourth** (a fourth would be search, Past Sessions or machines, and 316 refuses each). Pinned:

   ```swift
   enum AppTab: Hashable, Sendable { case needsInput, sessions, settings }

   TabView(selection: $app.tab) {
       Tab(Copy.needsInput, systemImage: "bell", value: AppTab.needsInput) {
           NavigationStack(path: $app.waitingPath) { ListScreen(kind: .needsInput, …).navigationDestination(for: Route.self) { … } }
       }
       .badge(app.waitingBadge)
       Tab(Copy.sessions, systemImage: "list.bullet", value: AppTab.sessions) {
           NavigationStack(path: $app.sessionsPath) { ListScreen(kind: .sessions, …).navigationDestination(for: Route.self) { … } }
       }
       Tab(Copy.settings, systemImage: "gearshape", value: AppTab.settings) {
           NavigationStack { SettingsScreen(app: app) }
       }
   }
   .linkGate()
   ```

   `.badge(0)` draws nothing, which is how "nothing waits" draws no badge. No `.toolbar(.hidden, for: .tabBar)` anywhere:
   the bar stays on a pushed session, as Apple's guidelines keep it. The Sessions stack's root keeps hiding its own
   navigation bar, as today.
2. **Words and marks**: §4.2. Every label is a `Copy` value, so `Tab`'s `StringProtocol` initialiser draws it verbatim.
3. **Per-tab paths.** `waitingPath` and `sessionsPath`; Settings pushes nothing (Unpair's question and the link's
   address are sheets), so its stack has no path: a path with no destination would be a second place the truth about
   what is pushed lives. `AppModel` API, pinned (the tests and the probe are written against these names):

   ```swift
   var tab: AppTab = .needsInput
   var waitingPath: [Route] = []
   var sessionsPath: [Route] = []
   var waitingBadge: Int { get }                       // §5.1.4
   func routing(_ tab: AppTab) -> ReadRouting         // backToList pops THAT tab; pairAgain = lostPairing
   var alertedRouting: ReadRouting { get }            // backToList(saying: Copy.noSuchSession) on the Needs input tab
   func open(_ row: RowDrawing, in tab: AppTab)
   func openConversation(_ sessionId: String, honestLine: String?, in tab: AppTab)
   func isTop(_ route: Route?, in tab: AppTab) -> Bool  // self.tab == tab && path(tab).last == route
   func listIsTop(_ tab: AppTab) -> Bool               // self.tab == tab && path(tab).isEmpty
   ```

   `paired(_:first:)` and `lostPairing()` empty both paths and select Needs input. `backToList()` (the plain one) is
   replaced by `routing(tab).backToList`, which empties that tab's path. `open(_:in:)` clears the list's notice, as today.
4. **The badge.** `waitingBadge` is `drawing.waiting.count` when `list?.state` is `.loaded(drawing)`, else 0 — the
   count of the rows the door answered as waiting (`/v1/blocked`'s `rows`), the same array the Needs input tab draws, so
   the badge and the list can never disagree. A failed read draws its sentence and no badge. ONE `ListModel` feeds both
   list tabs; each `ListScreen` reads on appear (today's rule), and on a return to the foreground only the screen that is
   on top of the SELECTED tab reads (`listIsTop`), so one return is one read.
5. **The alert tap (316.5 as built).** `openFromAlert(_:)` keeps its first two lines (`readKeptPairing()`, the guard),
   clears the notice, then sets `tab = .needsInput` and `waitingPath = []` (`.list`) or `[.alerted(id: id)]`
   (`.session`). `backToList(saying:)` sets `waitingPath = []` and keeps 316.5's `sayAfterRead` and `noticeRead`.
   `wentAway()` and `cameToForeground()` keep 316.5's fix-round behaviour; `cameToForeground()` also starts
   `readAlertPermission()`.
6. **The badge's colour.** §1's seam table. `Token.uiColor` (`UIColor(red:green:blue:alpha:)` from the same hex, sRGB,
   alpha 1) lives in `Tokens.swift` beside `color`. `TabBarLook` is `@MainActor enum TabBarLook { static func apply() }`,
   calling `configureWithDefaultBackground()` and setting the badge's colours on `stackedLayoutAppearance`,
   `inlineLayoutAppearance` and `compactInlineLayoutAppearance`, `.normal` and `.selected`, then
   `UITabBar.appearance().standardAppearance` and `.scrollEdgeAppearance`. Called once, in `TortieApp.init()`, before
   the first `TabView` exists.

### 5.2 The two list screens — `Screens/ListScreen.swift`

`ListScreen(model:kind:isTop:foregroundTick:open:)` with `enum ListKind { case needsInput, sessions }`.

- **`.sessions` is today's screen, unchanged**: title `Copy.sessions`, both sections, the foot, every identifier it has
  today (`screen-list`, `row-<id>`, `section-blocked`, …), so every L1 reading the probe makes holds.
- **`.needsInput`**: title `Copy.needsInput` (28/34 semibold, `padding: 0 16px 8px`, NeedsInput.html), then the two
  316.5 lines (`alertsLine`, `notice`) as today, then a `Hairline()`, then the waiting rows (`RowDrawing(waiting: true)`,
  `project · question`, no section header) or main's `emptyLine` when nothing waits, then the foot (`ageNote`, `read`).
  Its identifiers carry the prefix `needs-` (§5.6), so the two tabs never share an identifier.
- `.navigationTitle` is the screen's title word (the back button on a pushed screen reads it).

### 5.3 Settings — NEW `Screens/SettingsScreen.swift`

`SettingsScreen(app: AppModel)`, a `ScrollView` of house cards under its own title (`Copy.settings`, 28/34 semibold,
`settings-title`, the navigation bar hidden as the list hides its own) (`card()`, `Frame`, `RaisedLabel`, `Hairline`,
`Chevron`, `Words`; `Screens/Pieces.swift`), not a system `List`, so the frames are Settings.html's. It makes no door read.

1. **This Mac** (`settings-mac`, a card): `RaisedLabel(Copy.thisMac)`; `facts.name` in `Face.lead` 6 below;
   `facts.address` in the monospaced face at 15/20, `textSecondary`, one line, truncated in the middle; `read 4:32 PM`
   (`Face.age`, `textMuted`) when the list has a loaded answer, from `ListDrawing.readLine`; 16 below,
   `RaisedLabel(Copy.pairMatchLabel)` and `facts.fingerprint` drawn exactly as the Pairing screen draws it
   (`PairingScreen.swift:237-244`: `Text(verbatim:)`, monospaced at `Face.fingerprint`); 8 below,
   `Copy.joined([Copy.paired, date])` in `Face.small`, `textMuted`, where `date` is `pairedAt` formatted
   `.abbreviated` date, no time, by the device (one helper, `PairedClock.date(_ epochMs: Double) -> String`, whose one
   line `Date(timeIntervalSince1970: epochMs / 1000).formatted(date: .abbreviated, time: .omitted)` is NAMED in (k)).
2. **`PairedFacts`** (`Screens/DoorWords.swift`): `struct PairedFacts: Equatable, Sendable { let name: String; let
   address: String; let fingerprint: String; let pairedAt: Double; let macSends: Bool }` with `init(_ door: PairedDoor)`:
   `name` the public name up to its first `.`, `address` the WHOLE public name, `:` and the port,
   `fingerprint` `door.fingerprint`, `pairedAt` `door.pairedAt`, `macSends` `door.alerts.macSends`. NO key, pin, label,
   certificate, token or phone id. `PairedReader.facts` returns `PairedFacts(door)`; the test fakes return a fixed value.
3. **Alerts** (`settings-alerts`), drawn only when `facts.macSends`: `RaisedLabel(Copy.alerts)`; one 44-tall button row
   (`settings-notifications`): `Copy.notifications`, then the state (`settings-notifications-state`): `Allowed` for
   `.authorized`, `Off` for `.denied`, `Not asked` for `.notDetermined`, `Copy.dash` while not read, then a `Chevron`. A
   press opens `URL(string: UIApplication.openNotificationSettingsURLString)` with `UIApplication.shared.open` (never
   `openURL`, which is the link gate's). Under it, `Copy.pairAgainForAlerts` (`settings-alerts-line`) when the list's
   `alertsLine` holds it. The phone never says alerts are "on".
4. **Unpair this iPhone** (`settings-unpair`): a 54-tall card row, `Copy.unpairThisIPhone` in `Tokens.error`, left
   aligned like the conversation row. A press shows `.confirmationDialog(Copy.unpairQuestion, isPresented:,
   titleVisibility: .visible) { Button(Copy.unpair, role: .destructive) { app.unpair() }; Button(Copy.cancel, role:
   .cancel) {} } message: { Text(verbatim: Copy.unpairNote) }`. `app.settingsLine` (`settings-unpair-line`,
   `Face.secondary`, `textSecondary`) under it when set.
5. **About** (`settings-about`): `RaisedLabel(Copy.about)`, one row `Copy.version` … `Copy.versionLine(marketing, build)`
   (`settings-version`), read from `Bundle.main.infoDictionary`'s `CFBundleShortVersionString` and `CFBundleVersion`;
   `Copy.dash` for either that is absent. No open-source notices: no third-party code ships (rule (o)). Privacy, Support
   and "Tortie for Mac is free at tortie.sh" are 333.1's.
6. **No Face ID switch, here or in 317.** End always asks (his ruling), and a switch before End exists is "dormant"
   (2.3.1(a)).

### 5.4 Unpair — `Door/Keys.swift`, `Screens/DoorWords.swift`, `App/TortieApp.swift`, `Alerts/`

**The order of deletion, and why.** `PairingStore.forget()` keeps its order exactly (`Keys.swift:490-496`): the
`pairing-v2` record FIRST, with `try`; then `pairing-v1` with `try?`; then every client key and its certificate by tag.
The record holds both private halves (the Ed25519 signing seed and the X25519 exchange seed) and the client key's tag
and certificate, so once it is gone nothing on the phone can sign a read or present the identity, and a client key that
outlives it is useless. If the record's removal throws, nothing else has been touched, so "Nothing was changed." is TRUE.
Deleting the keys first would leave, on a failed record delete, a record whose identity is gone — half unpaired, and the
sentence false.

```swift
// Screens/DoorWords.swift
enum UnpairOutcome: Equatable, Sendable { case forgotten, kept }
protocol PhoneDoor { …; func unpair() -> UnpairOutcome }
protocol DoorReading { …; var facts: PairedFacts { get } }

// Door/Keys.swift (PairingStore)
var holdsRecord: Bool   // true when pairing-v2 reads back, OR the read throws (it cannot be proved gone)

// App/TortieApp.swift (LiveDoor)
func unpair() -> UnpairOutcome {
    do { try store.forget() } catch { return .kept }
    return store.holdsRecord ? .kept : .forgotten
}

// App/TortieApp.swift (AppModel)
private(set) var settingsLine: String?
func unpair() {
    guard root == .reading else { return }
    switch door.unpair() {
    case .kept:
        settingsLine = Copy.unpairFailed
    case .forgotten:
        settingsLine = nil
        forgetting = Task { await alerts.forgetAddress() }   // @ObservationIgnored, held so a test can wait
        lostPairing()
    }
}

// Alerts/Alerts.swift (PushAddressing) gains:
func forgetAddress() async
// Alerts/SystemAlerts.swift: #if DEBUG nothing #else UIApplication.shared.unregisterForRemoteNotifications() #endif
```

`lostPairing()` already empties the paths, drops the list and the reader, calls `pairing.pairAgain()` (its line is
`Copy.notPaired`, `PairingScreen.swift:119-125`) and sets `root = .pairing`. Unregistering runs only after the record
went, in Release only, once per Unpair, so Apple stops taking alerts for this install; a DEBUG build (every Simulator run)
never speaks to Apple in either direction. A later pairing with a Mac that can send registers again (316.5's path).
`LiveDoor.forget()` (the DEBUG forget seam) is unchanged. **Named limit:** a client key the Keychain refuses to delete
stays until the next Unpair or a fresh install; it cannot sign a read without the record's keys, which went first. The
probe's relay must see no connection from the app after Unpair (U1).

### 5.5 The renderer — NEW `ios/Tortie/Markdown/`, `Screens/MarkdownView.swift`

#### 5.5.1 Files and their surface (pinned)

| File | Imports | Holds |
| --- | --- | --- |
| `Markdown/Caps.swift` | Foundation | `enum MarkdownCaps` (§5.5.3) |
| `Markdown/Blocks.swift` | Foundation ONLY | `struct MarkdownDocument { let blocks: [MarkdownBlock]; let cut: Bool }`, `indirect enum MarkdownBlock`, `enum MarkdownBlocks { static func parse(_ answer: String) -> MarkdownDocument }` |
| `Markdown/Inline.swift` | Foundation ONLY | `struct InlineText: Equatable, Sendable { let segments: [InlineSegment]; var plain: String }`, `enum InlineSegment: Equatable, Sendable { case text(AttributedString); case image(alt: String) }`, `enum Inline { static func render(_ source: String) -> InlineText }` — the app's ONE `AttributedString(markdown:` |
| `Markdown/Rendered.swift` | Foundation ONLY | `struct RenderedAnswer: Equatable, Sendable { let blocks: [RenderedBlock]; let cut: Bool; init(_ answer: String) }` — `MarkdownBlocks.parse` then `Inline.render` over every text |
| `Markdown/Links.swift` | Foundation, SwiftUI, UIKit | `enum LinkPolicy { static func opens(_ url: URL) -> Bool; static func pressable(_ url: URL, words: String) -> Bool }` and `extension View { func linkGate() -> some View }` with the ONE `OpenURLAction` |
| `Screens/MarkdownView.swift` | SwiftUI | `struct MarkdownView: View { let answer: RenderedAnswer; let scope: String }` |
| `Screens/AnswerText.swift` | SwiftUI | rewritten: `struct AnswerText: View { let answer: RenderedAnswer; let scope: String }` drawing `MarkdownView`; `AnswerMarkdown` goes |

```swift
indirect enum MarkdownBlock: Equatable, Sendable {
    case heading(level: Int, text: String)                 // 1...6, ATX or setext
    case paragraph(String)                                  // lines joined with "\n"
    case code(lines: [String], fenced: Bool, moreLines: Int)
    case list(ordered: Bool, start: Int, items: [MarkdownItem])
    case quote([MarkdownBlock])
    case rule
    case table(MarkdownTable)
    case html(String)                                       // raw HTML block, its characters
    case plain(String)                                      // the rest past a cap, verbatim
}
struct MarkdownItem: Equatable, Sendable { let task: TaskMark?; let blocks: [MarkdownBlock] }
enum TaskMark: Equatable, Sendable { case open, done }
enum ColumnAlignment: Equatable, Sendable { case none, left, center, right }
struct MarkdownTable: Equatable, Sendable { let alignments: [ColumnAlignment]; let header: [String]; let rows: [[String]]; let moreRows: Int; let moreColumns: Int }
```

`RenderedBlock` mirrors `MarkdownBlock` with `InlineText` in place of the inline `String`s (heading, paragraph, cells).

**Where the parse runs.** `SessionDrawing` keeps `lastAnswer: String?` (a test reads it) and gains `lastAnswerRendered:
RenderedAnswer?`, built in its `init`. `ConversationModel` builds a `RenderedAnswer` for every turn of a page as the page
is accepted, before `pages` is assigned, into an `@ObservationIgnored private(set) var rendered: [Int: RenderedAnswer]`
keyed by turn index. Nothing parses inside a `body`.

#### 5.5.2 The block grammar (`Markdown/Blocks.swift`), CommonMark 0.31.2 and GFM 0.29 where named, line based

No regular expression, no `throws`, no force unwrap; every recursion takes `depth` (§6.2 (y)).

1. **The cut.** The longest prefix whose UTF-8 count is at most `MarkdownCaps.answerBytes`, ending on a `Character`
   boundary; `cut = true` when anything was left. (The honest maximum is about 12,000 bytes, so only a hostile door cuts.)
2. **Lines.** Split on `\r\n`, `\r` or `\n` (CommonMark §2.1). A tab counts to the next multiple of 4 columns for
   indentation only; content keeps its tabs.
3. **Blocks, in precedence order at a line that starts a block** (indentation ≤ 3 columns unless said):
   fenced code (≥ 3 backticks or tildes; a backtick fence's info has no backtick; closed by the same character, at least
   as long, ≤ 3 columns; content lines lose up to the opener's indentation; an unclosed fence runs to the end of its
   container); ATX heading (1–6 `#` then a space, a tab or the end; an optional closing run of `#` preceded by a space is
   dropped); thematic break (≥ 3 of one of `-*_`, only spaces or tabs between; wins over a list item; a `---` line under a
   paragraph is a setext h2 instead); HTML block (CommonMark's seven start conditions: 1 `<script`, `<pre`, `<style`,
   `<textarea` to the line holding the matching close; 2 `<!--` to `-->`; 3 `<?` to `?>`; 4 `<!` + an ASCII letter to
   `>`; 5 `<![CDATA[` to `]]>`; 6 `<` or `</` + one of CommonMark's block tag names (a static set of 62 names, compared
   lowercased) to a blank line; 7 a single complete open or closing tag, then only whitespace, to a blank line, and 7
   alone cannot interrupt a paragraph; tags are read character by character); block quote (`>` and one optional space,
   collected with lazy paragraph continuation lines, then parsed again at `depth + 1`); list item (a bullet `-`, `+` or `*`,
   or 1–9 digits then `.` or `)`, then ≥ 1 space or the end; content indentation is the marker plus 1–4 spaces, or the
   marker plus 1 when 5 or more follow; following lines indented at least that much belong to it, blank lines inside
   belong when an indented line follows, lazy paragraph continuation; parsed again at `depth + 1`; siblings share the
   bullet character or the ordered delimiter; an ordered list's `start` is its first number; an ordered list that
   interrupts a paragraph must start at 1, and an empty item cannot interrupt one; a GFM task box `[ ]`, `[x]` or `[X]`
   and a space at an item's start is its `TaskMark`); indented code (≥ 4 columns, never interrupting a paragraph,
   trailing blank lines dropped); GFM table (a delimiter row of cells `:?-+:?` split on unescaped `|`, with as many cells
   as the line directly ABOVE it, which is the header; the header line leaves the paragraph it ended; body rows continue
   to a blank line or a line that starts another block, with or WITHOUT a pipe; fewer cells are padded empty, more are
   dropped; `\|` is a `|` in the cell's text; leading and trailing pipes optional); paragraph (every other non-blank line;
   continuation lines lose their leading spaces; a setext underline of `=` or `-` closes it as an h1 or h2; a trailing
   run of two or more spaces is dropped, its line break kept).
4. **Depth.** At `depth == MarkdownCaps.depth` no container opens: a `>` or a list marker stays the paragraph's own
   characters.
5. **Not recognised, and drawn as their characters (each a pinned difference, §7.5):** link reference definitions and
   reference links, footnotes, front matter, math. Foundation's inline parser handles entities and backslash escapes.
6. **Every input yields blocks.** An empty or all-whitespace answer is one empty paragraph.

#### 5.5.3 The caps (`Markdown/Caps.swift`), each read at exactly one site

| Member | Value | Read in | What happens past it |
| --- | --- | --- | --- |
| `answerBytes` | 32_768 | `Blocks.swift` (the cut) | the answer ends with `Copy.restNotShown` (`md-<scope>-rest`) |
| `blocks` | 400 | `Blocks.swift` | the remaining source lines become ONE `.plain` block, verbatim |
| `depth` | 8 | `Blocks.swift` (the recursion's guard) | containers stop opening; the markers are text |
| `inlineBytes` | 8_192 | `Inline.swift` | the run is drawn verbatim, whole, never handed to Foundation |
| `tableRows` | 50 | `Blocks.swift` | body rows past it counted: `12 more rows` |
| `tableColumns` | 8 | `Blocks.swift` | columns past it counted: `3 more columns` |
| `cellCharacters` | 200 | `Blocks.swift` | the cell's source cut there, `Copy.cutShort` |
| `cells` | 1_000 | `Blocks.swift` | per answer, header cells included: the rows of the table it runs out in are counted; a table whose header cannot fit is a `.plain` block of its source |
| `fenceLines` | 400 | `Blocks.swift` | lines past it counted: `n more lines` |
| `lineCharacters` | 1_000 | `Blocks.swift` | a code line cut there, `Copy.cutShort` |
| `listNumberDigits` | 9 | `Blocks.swift` | a tenth digit: not a list item (CommonMark's own rule) |
| `linkBytes` | 2_048 | `Links.swift` | a longer address is not pressable |

A cap turns the rest into a counted note or one plain block, never nothing. Text Foundation refuses is drawn verbatim, as
today. The parse budget is not a cap: it is the tests' (§7.2), proposed 50 ms per fixture in the Release test host and
measured by the verifier on iOS 18.3. This step's own measurement (macOS 15.6 host, `-O`, best of three): Foundation's
inline parse of 8 KiB of realistic markdown 3.98 ms, of 64 KiB 40.39 ms, of a 64 KiB emphasis bomb 4.47 ms, of a 64 KiB
bracket bomb 6.29 ms, of 60 KB of code spans 45.97 ms — which is why `answerBytes` is 32 KiB and not 64.

#### 5.5.4 Inline (`Markdown/Inline.swift`)

`AttributedString(markdown: source, options: AttributedString.MarkdownParsingOptions(allowsExtendedAttributes: false,
interpretedSyntax: .inlineOnlyPreservingWhitespace, failurePolicy: .returnPartiallyParsedIfPossible))`, exactly once in
the app; a source over `MarkdownCaps.inlineBytes`, or one Foundation refuses, is `AttributedString(source)` whole. Then
the runs are walked once: a run with `imageURL` becomes `.image(alt:)` (its characters; the URL is dropped and never
kept); a run with `link` keeps it only when `LinkPolicy.pressable(url, words:)`, else the attribute is removed and the
words stay. Foundation draws emphasis, code, strikethrough and inline HTML (as characters) from its own intents. Measured
at this step: an image inside a link comes back as the link's words with no image run, which is drawn as those words.

#### 5.5.5 Links — `Markdown/Links.swift`, the one way out

- `LinkPolicy.opens(_ url: URL) -> Bool` is true only when: `url.scheme == "https"` (exactly, lower case); `url.user`
  and `url.password` are nil; `url.port` is nil; the host is two or more labels of ASCII letters, digits and hyphens,
  each 1–63 long, none starting or ending with a hyphen, none beginning `xn--`, and the last holding a letter (so no IP
  address and no single-label name); and `url.absoluteString` is printable ASCII (0x21–0x7E) of at most
  `MarkdownCaps.linkBytes` bytes.
- `LinkPolicy.pressable(_ url: URL, words: String) -> Bool` is `opens(url)` and the words are NOT the address: compared
  after dropping a leading `https://` or `http://` from both and one trailing `/` from both. So a bare URL, an autolink
  and `www.` are never pressable.
- **The gate.** `func linkGate() -> some View` installs `.environment(\.openURL, OpenURLAction { url in … })`: it asks
  `LinkPolicy.opens(url)` FIRST, answers `.discarded` when false, else stages the URL and answers `.handled`. The staged
  URL shows `.alert(Text(verbatim: url.absoluteString), isPresented:) { Button(Copy.cancel, role: .cancel) {};
  Button(Copy.open) { if LinkPolicy.opens(url) { UIApplication.shared.open(url) } } }` — the exact ASCII address as the
  title (an alert, not a sheet, so a 2,048-byte address wraps whole), and `Open` asks the policy again before the one
  `UIApplication.shared.open`. Applied once, to the reading root (§5.1.1).
- Every other link is plain words; a link's words never decide where it goes. **Named limit (§3 row 3):** an `https`
  address that an installed app claims opens that app.

#### 5.5.6 Images

`.image(alt:)` draws `Text(Image(systemName: "photo"))` in `textMuted`, a space, then the alt or `Copy.image` when it is
empty, in `textSecondary`. A paragraph holding an image sets its accessibility label to its plain text (the alt or
`Image` in the image's place); a paragraph with none keeps SwiftUI's own, so its links stay links to VoiceOver and
XCUITest. The URL is never fetched, shown or kept.

#### 5.5.7 The drawing — `Screens/MarkdownView.swift`

Every block and every cell is its own `Text`, so a bidi override cannot reorder a neighbour, and its own accessibility
element. The agent's words reach the screen only as `Text(verbatim:)` or `Text(attributed)` of an `AttributedString`
`Inline.swift` built; never a `LocalizedStringKey`, so `%@` draws as written.

| Block | Face and colour | Frame (Conversation.html) |
| --- | --- | --- |
| paragraph | `Face.body` 17/22, `textPrimary`; code runs monospaced at 15 on `bgRaised`; pressable links in the root's tint (`accent`) | blocks 8 apart |
| heading | h1 20/25 semibold, h2 17/22 semibold, h3–h6 15/20 semibold, `textPrimary` | 12 above when not first |
| list | marker column 12 wide, 8 to the content: `Copy.bullet`, `Copy.orderedMark(start + i)`, or a task's `square` / `checkmark.square` symbol, all `textSecondary`; nested 20 in. **Ruled 2026-10-01:** the bullet is the one the agent wrote (the fix round) and the number is the one the agent wrote, `Copy.orderedMark(item.number)`, never `start + i` (D17) | items 4 apart |
| code | monospaced 15/20, `textPrimary`, on `bgRaised`, radius 6, padding 12, in a horizontal `ScrollView`, unhighlighted; the info string is not drawn; `Copy.moreLines(n)` under it in `Face.small`, `textMuted` | |
| quote | a 1 pt `borderStrong` rule on the leading edge, 12 in, `textSecondary` (the Mac's own: `markdown.css` "one hairline rule, never a slab") | |
| rule | `Hairline()` | 12 above and below |
| table | a `Grid` in a horizontal `ScrollView`; cells 15/20 with `padding: 6px 12px` and a 1 pt `border`; the header row semibold on `bgSidebar`; each column aligned as its delimiter cell says; `Copy.moreRows(n)` / `Copy.moreColumns(n)` under it | |
| html | its characters, monospaced 15/20, `textSecondary` | |
| plain | its characters, `Face.body`, `textPrimary` | |
| the cut | `Copy.restNotShown`, `Face.small`, `textMuted` | |

**Identifiers** (`Screens/Identifiers.swift`, written by the tabs builder; names pinned): a block is `md-<scope>-<n>`,
`n` its PRE-ORDER ordinal from 0 over the rendered tree (a container before its children; items in order; a table counts
once and its cells do not); a cell `md-<scope>-<n>-r<i>c<j>` (row 0 is the header); an item's mark `md-<scope>-<n>-mark`;
a block's counted note `md-<scope>-<n>-more`; the cut `md-<scope>-rest`. `scope` is the turn's index in the conversation
and `last` on the Session screen. `turn-answer-<i>` and `session-answer` stay, as CONTAINERS
(`.accessibilityElement(children: .contain)`). A leaf's label is its drawn characters; a container's is empty.

### 5.6 Tokens and identifiers

**`Style/Tokens.swift`** gains `statusAttentionBadgeBg` (`#f5b84a`), `statusAttentionBadgeFg` (`#131417`) and `error`
(`#e5655e`), each a `Token` case with its hex on its own line, a `Tokens` static, `var uiColor: UIColor`, and
`TabBarLook` (§5.1.6). 19 names, 15 distinct hexes; the header's "THE FOURTEEN" becomes "THE FIFTEEN" with the three new
names said.

**`Screens/Identifiers.swift`** gains (and its header table says each): `screen-needs-input`, `needs-input-title`,
`needs-list-alerts-line`, `needs-list-notice`, `needs-list-loading`, `needs-list-failure`, `needs-list-empty`,
`needs-list-age-note`, `needs-list-read`, `needs-row-<id>` with `needs-row-dot-`, `-name-`, `-machine-`, `-age-` and
`-line-<id>`; `screen-settings`, `settings-title`, `settings-mac`, `settings-mac-name`, `settings-mac-address`,
`settings-mac-read`, `settings-match`, `settings-fingerprint`, `settings-paired`, `settings-alerts`,
`settings-notifications`, `settings-notifications-state`, `settings-alerts-line`, `settings-unpair`,
`settings-unpair-line`, `settings-about`, `settings-version`; and

```swift
static let mdLastScope = "last"
static func md(_ scope: String, _ n: Int) -> String { "md-" + scope + "-" + String(n) }
static func mdCell(_ scope: String, _ n: Int, row: Int, column: Int) -> String { md(scope, n) + "-r" + String(row) + "c" + String(column) }
static func mdMark(_ scope: String, _ n: Int) -> String { md(scope, n) + "-mark" }
static func mdMore(_ scope: String, _ n: Int) -> String { md(scope, n) + "-more" }
static func mdRest(_ scope: String) -> String { "md-" + scope + "-rest" }
```

Tab bar buttons are found by their labels (the three `Copy` words); SwiftUI gives a `Tab` no identifier of its own.

### 5.7 The build number

`CURRENT_PROJECT_VERSION = 4` in all six configurations of `ios/Tortie.xcodeproj/project.pbxproj`; nothing else in the
project moves.

---

## 6. The gates, clause by clause

Every new clause has an ablation arm that must turn it red on its own, as a delta against the base, and an arm whose
anchor text is absent FAILS by name. The renderer is `Markdown/**` and `Screens/MarkdownView.swift`.

### 6.1 Widened rules of `build/conformance-ios.mjs`

- **(a)** `ruleTokensTable` maps the three new names (kebab of `statusAttentionBadgeBg` is `--status-attention-badge-bg`).
  NEW clause: `UITabBar`, `UITabBarAppearance`, `UITabBarItemAppearance`, `badgeBackgroundColor`, `badgeTextAttributes`
  and `.appearance()` are named only in `Style/Tokens.swift`, and the two badge colours are set from
  `Token.statusAttentionBadgeBg` and `Token.statusAttentionBadgeFg` and nothing else. Arms **a4** (`UITabBar.appearance()`
  in `App/TortieApp.swift`), **a5** (the badge's ground set from `Token.statusAttention`).
- **(b)** `VISIBLE_CALLS` gains `Tab`. NEW clause, the tab bar: exactly three `Tab(` in `App/TortieApp.swift`, labelled
  `Copy.needsInput`, `Copy.sessions`, `Copy.settings` in that order with `bell`, `list.bullet`, `gearshape`; no
  `.toolbar(.hidden, for: .tabBar)` or `.toolbarVisibility(.hidden, for: .tabBar)` in the app; no `@AppStorage`,
  `@SceneStorage` or `UserDefaults` in `App/TortieApp.swift` (the tab is never stored). Arms **b3** (a literal
  `Tab("Needs input", …)`), **b4** (a fourth `Tab`), **b5** (the bar hidden on a pushed screen), **b6** (the tab kept in
  `@AppStorage`).
- **(k)** ONE named scope, `ARITHMETIC_SCOPES = [{ files: 'Markdown/** and Screens/MarkdownView.swift', why }]`: an
  operator there needs no line entry, because the renderer's only input is a `String` and every integer in it is a count
  or a position inside at most `answerBytes` bytes, so no sum approaches `Int.max`. It holds only while (y9) holds, the
  scope must still match at least one operator, and an operand naming a door number field is red there as everywhere.
  The tabs builder's lines outside the scope are NAMED as today: `PairedClock`'s division, any changed `ListScreen` line
  (`RowView(row: row, last: endsList && offset == rows.count - 1 …)` moves if its text moves). Arms **k6** (`turn.index +
  1` in `MarkdownView.swift`), **k7** (an unnamed integer operator in `Screens/SettingsScreen.swift`).
- **(n)** NEW clauses: `SecItemDelete(` only in `Door/Keys.swift`, inside `KeychainSecretStore.remove` and
  `KeychainClientKeys.delete`; `secrets.remove(` only inside `PairingStore`; `.delete(tag:` outside `KeychainClientKeys`
  only in `PairingStore.forget` and `PairingFlow.run`'s failed ending (`Door/Pairing.swift:382`); the store's `forget()` called only by
  `PairingStore.load`, `PairingStore.forgetOnFreshInstall`, `LiveDoor.forget` and `LiveDoor.unpair`, and `door.forget()`
  only inside `#if DEBUG` in `AppModel.launch` (the forget seam, `TortieApp.swift:125`); in `forget`, the
  record's `try secrets.remove(Self.account)` comes before any `delete(tag:`; and `LiveDoor.unpair` calls `try
  store.forget()` inside a `do` whose `catch` answers `.kept`, never `try?`. Arms **n11** (`SecItemDelete` in a screen),
  **n12** (the keys deleted before the record), **n13** (`unpair` through `try? store.forget()`).
- **(s)** `PHONE_BUILD = '4'`. Its self-test fixtures that use `4` as "a build this round does not upload"
  (`build/conformance-ios.mjs:3974-3978`) move to `5`. Arm **s11** (the app's Release left at 3); the existing arm that
  edits `CURRENT_PROJECT_VERSION = 3` (`build/p316/ablation-ios.mjs:1086`) moves its anchor to 4.
- **(x)** NEW clauses: `unregisterForRemoteNotifications` exactly once in the app, in `Alerts/SystemAlerts.swift`,
  inside the `#else` of `#if DEBUG`; `forgetAddress()` called exactly once, in `AppModel.unpair`'s `.forgotten` arm; no
  test names `unregisterForRemoteNotifications`. Arms **x10** (unregister outside the `#else`), **x11** (`forgetAddress()`
  before `door.unpair()`), **x12** (a test naming the unregister). The existing launch-read clause also covers
  `readAlertPermission` (its guard on `macSends`); arm x9's anchor in `checkAlertAddress` must still match.

### 6.2 NEW (y), THE RENDERER'S BOUNDS

| Clause | Holds | Arm |
| --- | --- | --- |
| y1 | `Markdown/Caps.swift`, `Blocks.swift`, `Inline.swift`, `Rendered.swift` import `Foundation` and nothing else; `Links.swift` at most Foundation, SwiftUI, UIKit | **y1** `import SwiftUI` in `Blocks.swift` |
| y2 | `enum MarkdownCaps` declared once, in `Markdown/Caps.swift`, of exactly the twelve pinned `static let` integer literals; each read exactly once in the app outside `Caps.swift` | **y2** a cap read twice |
| y3 | no `throws` or `rethrows` declaration, `try!`, `as!`, postfix `!`, `fatalError(`, `precondition(`, `preconditionFailure(`, `assert(`, `assertionFailure(` or `Unsafe` name in the renderer | **y3** a force unwrap in `Blocks.swift` |
| y4 | no regular expression in the renderer: `NSRegularExpression`, `Regex`, `#/`, `.regularExpression`, `wholeMatch(`, `firstMatch(of`, `matches(of`, `NSPredicate` | **y4** `try? Regex(` in `Blocks.swift` |
| y5 | every function in a call cycle inside a renderer file takes `depth:` and every call from inside the cycle passes `depth: depth + 1`; `Blocks.swift`'s cycle compares `depth` with `MarkdownCaps.depth`; every type in `MarkdownView.swift` that builds itself holds `depth` and passes `depth: depth + 1` | **y5** a recursive call passing `depth: depth` |
| y6 | `AttributedString(markdown:` exactly once in the app, in `Markdown/Inline.swift`, with exactly `allowsExtendedAttributes: false`, `interpretedSyntax: .inlineOnlyPreservingWhitespace`, `failurePolicy: .returnPartiallyParsedIfPossible`; no `NSAttributedString(markdown`, `.full` or bare `.inlineOnly` anywhere | **y6** a second parse in `AnswerText.swift` |
| y7 | no `LocalizedStringKey`, `LocalizedStringResource`, `Text(.init(`, `String(format:`, `String(localized:` or `NSLocalizedString` anywhere in the app | **y7** `Text(LocalizedStringKey(x))` in `MarkdownView.swift` |
| y8 | every `Text(` in `MarkdownView.swift` is `Text(verbatim:`, `Text(Image(systemName:` or `Text(attributed)` | **y8** `Text(cell.plain)` |
| y9 | the renderer names no `Pocket`, `Door`, `Codable`, `Decodable`, `JSONDecoder`, `URLSession` or `NWConnection` (the boundary (k)'s scope rests on) | **y9** `PocketTurn` named in `Rendered.swift` |

### 6.3 NEW (z), NOTHING FETCHED, AND ONE WAY OUT

| Clause | Holds | Arm |
| --- | --- | --- |
| z1 | no `AsyncImage`, `NSAttributedString`, `.html` document type, or `contentsOf:` initialiser of a type outside a `#if DEBUG` arm (`App/DebugLaunch.swift` is all DEBUG) anywhere in the app | **z1** `AsyncImage(url:` in `MarkdownView.swift` |
| z2 | no `SFSafariViewController`, `SafariServices`, `ASWebAuthenticationSession`, `AuthenticationServices`, `QLPreviewController`, `QuickLook`, `UIDocumentInteractionController`, `canOpenURL` or SwiftUI `Link(` in the app | **z2** `SFSafariViewController` in `Links.swift` |
| z3 | `OpenURLAction` and `openURL` only in `Markdown/Links.swift`; `UIApplication.shared.open(` only there and in `Screens/SettingsScreen.swift` | **z3** `@Environment(\.openURL)` in `SettingsScreen.swift` |
| z4 | in `Links.swift`, the `OpenURLAction` closure calls `LinkPolicy.opens(` before it stages, and the closure holding `UIApplication.shared.open(` calls `LinkPolicy.opens(` before it | **z4** the second ask removed |
| z5 | in `SettingsScreen.swift`, every `UIApplication.shared.open(` opens a URL made from `UIApplication.openNotificationSettingsURLString` in the same function | **z5** another URL opened there |
| z6 | `LinkPolicy.opens`' body names `"https"`, `.user`, `.password`, `.port`, `xn--` and `MarkdownCaps.linkBytes` | **z6** the port clause removed |

`RULE_IDS` gains `y` and `z`. `ablation:p316` grows from 154 arms by 30 (a4, a5, b3–b6, k6, k7, n11–n13, s11, x10–x12,
y1–y9, z1–z6) to 184; every arm red on its own rule, the base green. Phase 316.7's (aa) and 333.1/333.3's letters come
after (z).

### 6.4 `test:ios`, `conformance:phonecopy`, and what stays

- **`build/p316/test-ios.mjs`**: the Release Mach-O read holds `unregisterForRemoteNotifications` whole and the Debug read
  holds none (its own problem line; `PASS_WORDS` unchanged, §3 row 14). It forwards `P3166_OUTLINE_DIR` and
  `P3166_OUTLINE_INPUT` as test environment when set, refusing a path inside the repository or the home exactly as
  `refuseScratchReason` does. The rows it runs gain the Markdown, Tabs, Settings and Unpair tests (§7.2).
- **`conformance:phonecopy`**: §4.2 and §4.3.
- **Unmoved**: `gate:simulator` (floor 2), `gate:electron` (floor 157), `gate:checks` (no script added; the classified
  set is unchanged), `gate:contract` (no line moves), `gate:background`, `gate:knownhosts`, the pocket and push gates.
- **CLAUDE.md** (the proof builder): the `ios/**` row names (y) and (z), (a)'s badge clause, (b)'s tab clause, (k)'s
  scope, (n)'s deletion clauses, (x)'s unregister and (s)'s build 4; the `conformance:phonecopy` row's floors become 39
  and 7 and its paths gain `src/renderer/arch/copy.ts` and `src/renderer/settings/PhoneSection.tsx` where absent; the
  `test:ios` row names the unregister read and the outline; the `probe:p316` row names the tab, markdown, settings and
  unpair steps, the MD3 listener and the parent arm. One line each in the house style.
- **`build/verification-checks.mjs`** notes for `conformance:ios` (24 rules), `ablation:p316` (184 arms),
  `conformance:phonecopy`, `test:ios` and `probe:p316` carry the new counts.

---

## 7. The proof, run rather than read

### 7.1 The battery

`npm run -s typecheck`; `npm run -s build` (with `conformance:ios`, `gate:contract`, `gate:simulator`, `gate:electron`,
`gate:background`, `gate:checks`, `gate:knownhosts` inside it); `npm run -s test`; `conformance:phonecopy`;
`ablation:p316` whole; `node build/p316/vectors.mjs --check`; `node build/p316/probe-p316.mjs --grader-self-test`;
`node build/p316/hostile-door.mjs --self-test`; the macOS host compile of the renderer (§7.2 last row); and, verifiers
only under THE LOCK, `test:ios` in Debug and Release on iOS 26.3 and 18.3, `smoke:t1`, and `probe:p316`.

### 7.2 XCTest (`ios/TortieTests/`) and the committed fixtures

| File | Builder | Rows |
| --- | --- | --- |
| `TabsTests.swift` (NEW) | tabs | the app opens on Needs input; three tabs; the badge equals the loaded answer's waiting count and is 0 on a failure; each tab keeps its path across a switch; an alert tap selects Needs input and replaces only its path; a refusal about one session pops only that tab; a return to the foreground reads once, and only the selected tab's top list; `TabBarLook.apply()` leaves the appearance holding the two tokens' `UIColor`s |
| `SettingsTests.swift` (NEW) | tabs | `PairedFacts` from a `PairedDoor` holds only the five public fields; the Alerts card only for `macSends`; `Allowed`/`Off`/`Not asked`/`—`; `readAlertPermission()` asks iOS nothing for a Mac that cannot send; the version line from a bundle dictionary and `—` when absent |
| `UnpairTests.swift` (NEW) | tabs | with fakes: `.forgotten` returns to Pairing with `Copy.notPaired`, empties both paths and calls `forgetAddress()` once; `.kept` stays, draws `Copy.unpairFailed` and calls it zero times; a `SecretStore` whose remove throws leaves the client keys untouched (the order) |
| `UnpairKeychainTests.swift` (NEW, iOS only) | tabs | on the REAL Simulator keychain under a test service, the `DoorKeychainTests` shape: a saved pairing with a minted client key and its certificate, then the shipping `LiveDoor.unpair()`: `.forgotten`, `SecItemCopyMatching` finds no `pairing-v2` item, `tags()` is empty, and a `PairingStore` read back is nil |
| `MarkdownSpecTests.swift` (NEW) | renderer | at least 60 CommonMark 0.31.2 and GFM 0.29 examples, each cited by its number, covering every construct of §5.5.2, each asserting its outline (§7.5) written by hand from the spec's own HTML |
| `MarkdownHostileTests.swift` (NEW) | renderer | every fixture of `fixtures.json` and every built one (below): never traps; parses within the budget (best of three, `ContinuousClock`: 50 ms in Release, a 500 ms ceiling in Debug, each measured value printed); draws within every cap; and, for each fixture within the caps, loses no word (every letter-or-digit word of the source outside a link or image destination, a fence's info string and a task box appears in the outline) |
| `MarkdownLinkTests.swift` (NEW) | renderer | `LinkPolicy` over every refused shape and every accepted one; the lying link's URL is `https://evil.example/x`; a bare URL, an autolink and `www.` are never pressable; the zero-width host reads `https://apple.com/`; the IDN host is refused |
| `MarkdownOutline.swift`, `MarkdownOutlineTests.swift` (NEW) | renderer | the outline walker (test support only, never in the app); writes `<P3166_OUTLINE_DIR>/outline-<Debug|Release>.jsonl` over `P3166_OUTLINE_INPUT` (a JSON array of `{name, source}`) or `fixtures.json` when that is unset |
| `ScreensDrawingTests.swift` | renderer | `testTheAnswerIsInlineMarkdown`, `testWhitespaceIsKept`, `testLinksAndImagesAreWordsOnly` and `testHTMLIsText` (`:309-345`) are rewritten against `RenderedAnswer`; the third becomes "an image is never loaded, and a link is pressable only by the policy" |
| `TokensTests.swift`, `CopyTests.swift`, `StyleSource.swift`, `ScreensFixtures.swift`, `ScreensModelTests.swift`, `AlertsTests.swift` | tabs | the nine mocks and 15 colours; the new mock lines (`>This Mac<`, `>Unpair this iPhone<`, …); the fakes gain `unpair()`, `facts` and `forgetAddress()`; AppModel tests read the per-tab paths |
| the macOS host compile | renderer | `xcrun swiftc` of `Markdown/*.swift` with a scratch driver in the builder's scratch directory, run over `fixtures.json`: the builder's own exercise of the parser without a Simulator. Nothing it writes is committed |

**`ios/TortieTests/Fixtures/markdown/fixtures.json`** (the proof builder's; ASCII only, every other character a `\u`
escape, so no bidi, zero-width, BOM or control byte enters the tree): `{ "version": 1, "fixtures": [ { "name", "source",
"why", "probe": bool, "hostile": "md-hostile" | null } ] }`, `{{MD3}}` standing for `127.0.0.1:<port>` of the probe's
listener (a unit test reads it as `127.0.0.1:9`). The names, pinned: `answer-realistic` (Conversation.html's answer),
`nested-list-task`, `table-align` (`:--`, `:-:`, `--:`, `\|`, code in a cell), `table-at-caps` (51 body rows by 9
columns, under 4,000 characters), `quote-nested`, `fence-unclosed`, `clipped-in-fence` and `clipped-in-table` (4,200
characters, main's clip falling inside each), `lying-link` (`[https://apple.com](https://evil.example/x)`), `long-link`
(an `https://p3166.example/…` link of exactly 2,048 bytes), `link-over-cap` (2,049), `user-part`
(`https://apple.com@evil.example/`), `idn-host`, `refused-schemes` (`http:`, `javascript:`, `data:`, `file:`,
`shortcuts:`, `tel:`, `sms:`, `mailto:`, `facetime:`, `prefs:`, `app-settings:`, `itms-services:`, `itms-apps:`, `maps:`,
`tortie:`, `HTTPS://`, an IP host, `localhost`, a port, an underscore, an empty host; every one at `{{MD3}}` where it has
a host), `bare-urls`, `ten-kb-url`, `images` (an alt, an empty alt, an `<img>` tag, an image inside a link, all at
`{{MD3}}`), `script`, `list-overflow` (`9999999999.` and `999999999.`), `format-specifiers` (`%@ %n %d %s`,
`^[x](inflect: true)`, a morphology attribute), `redacted` (`[REDACTED:bearer]` in a link's words, its destination at
`{{MD3}}`, and a cell), `bidi` (U+202E, U+2066 to U+2069, U+200B, U+200D and U+FEFF in text, link words, a host — `p3166` +
U+200B + `.example`, never a real one — and a cell), `line-endings-cr`, `line-endings-crlf`, `empty`, `whitespace-only`, `setext-and-rules`, `indented-code`,
`html-kinds`, `footnotes-definitions`, `inline-mix`.

**Built in code**, by the same recipe in Swift and in node (written in the file's header so both build the same bytes):
`bomb-emphasis` (`"*a **a "` × 20,000, then `"["` × 20,000, `"a"`, `"]"` × 20,000), `nest-quotes` (`"> "` × 10,000 then
`deep`), `nest-lists` (`"- "` × 10,000 then `deep`), `table-10000-rows`, `table-200-columns`, `fence-5mb`, `line-5mb`,
`fence-long-line` (one 5,000-character line), `fence-500-lines`, `blocks-1000` (1,000 paragraphs), `cells-1500` (30
tables of 50 cells).

### 7.3 The hostile door (`build/p316/hostile-door.mjs`, the proof builder's)

Two arms, each `ends: 'drawn'` with the honest pairing and list: **`md-hostile`** serves every `fixtures.json` fixture
whose `hostile` names it, and the built ones that fit, one per turn of the newest page (under 1.5 MiB together);
**`md-huge`** serves `fence-5mb` and `line-5mb` cut to fit a 1.8 MiB answer. `{{MD3}}` is the port the probe hands it
(`--md3 127.0.0.1:<port>`). Each must end drawn: `screen-conversation` with at least one `md-` element per turn, no
`*-failure`, the app alive. `--self-test` reads both arms' answers through `node-phone.mjs`.

### 7.4 `probe:p316` and its UI test (the proof builder's)

**The planted transcript.** The stand-in `claude` gains a mode `md` that plants the committed research 63 transcript
for a session `p316-md` (its id in `P316_MD_SID`), and the probe appends one turn per `fixtures.json` fixture with
`probe: true`, in file order, the ask `p3166 md <name>`, `{{MD3}}` replaced; the Mac clips and redacts them as it does
any answer. A committed `.jsonl` cannot carry the listener's port, which is why the turns are appended at plant time.

**`P316DriveUITests.swift`.** `Seen` gains every §5.6 identifier and the three tab labels. `pair` ends paired at
`screen-needs-input` (or `screen-list`). NEW steps: `tab:<needs|sessions|settings>` (tap the bar's button by label, wait
for the screen, dump `tab-<name>`, and print `{"step":"badge","label":…,"value":…}` read from the Needs input button);
`list` selects Sessions first; `bar` (scroll the top screen to its end, print the tab bar's frame, dump `bar`);
`markdown` (on a conversation, scroll from the newest turn to the oldest read, collecting every `md-*` element's id, label
and frame and every link element's label and turn; print `{"step":"markdown",…}`); `link:<label>` (tap that link, print
the alert's title and buttons); `link-cancel`; `link-open` (press Open, wait up to 10 s for
`com.apple.mobilesafari` to run in the foreground, print its state, terminate it, activate Tortie); `settings` (the tab
and a dump); `unpair-cancel` and `unpair` (the sheet's title, message and buttons printed; Cancel or Unpair pressed;
dumped); `relaunch-keep` (terminate and relaunch with the carried seams and NO forget seam and no code). `first` composes
each turn's answer from its `md-<i>-*` labels joined with `\n` in pre-order, and the session dump does the same for
`md-last-*`, so T1 and S1 read the rendered text as before (§3 row 16). Every 316.5 alert step accepts
`screen-needs-input`, and N6/N6b read `needs-list-notice`.

**The arms**, graded from the dumps:

| Arm | Simulator | Holds |
| --- | --- | --- |
| T2a | 26.3 order, 18.3 floor | the first screen after pairing is `screen-needs-input` |
| T2b | both | the badge's integer equals `/v1/blocked`'s `rows.length`, read by the node reader before and after the app's read; no integer when that is 0 |
| T2c | both | a session opened in Sessions is still on top after Needs input and back |
| T2d | both | at the end of a pushed session, its last element's frame ends at or above the tab bar's top |
| MD1 | both | every planted turn draws ≥ 1 `md-` element; `table-at-caps` draws exactly 50 body rows of 8 cells, `1 more row` and `1 more column`; no label holds `**`; everything printed to `<run>/md1.json` |
| MD2 | 26.3 order | `lying-link`'s alert title is `https://evil.example/x`; Cancel leaves Tortie in the foreground; Open brings Safari forward (`.example` resolves nowhere: one DNS question leaves his Mac, and nothing is fetched); `long-link`'s title is its 2,048 bytes whole; `javascript:` and the IP-host link are not link elements |
| MD3 | the whole run | the probe's loopback listener (in process, ended in the `finally`) counts 0 connections |
| S6 | both, and deny | `settings-mac-name` is the code's name's first label; `settings-mac-address` is `name:port`; `settings-fingerprint` equals the Mac's Phones row for this phone and P1's drawn fingerprint; `settings-version` is `1.0.0 (4)`; the Alerts card reads `Allowed` (order), `Off` (deny), and is absent for N11's Mac that cannot send |
| U1 | 18.3 floor, after F1+ | Cancel changes no label; Unpair draws `screen-pairing` with `pairing-line` = `This iPhone is not paired with a Mac.`; the relay counts no new connection from the app in 20 s; `relaunch-keep` draws Pairing; `pocket:status` still lists the phone; a new code pairs again on a second drive, landing on Needs input |
| HM | 26.3 hostile | `md-hostile` and `md-huge` end drawn, alive, MD3 still 0 |
| PR | 26.3, with `P316_PARENT_IOS` | the parent's app (§7.6) over the same planted turns: no Needs input tab button, `table-at-caps`'s answer one label holding `|`, no link element; and every word the parent drew HEAD draws (§7.6) |

`P316_KEEP=1` also writes `<run>/rederive/md-answers.json`: the door's own answer text for every `p316-md` turn, read by
the node reader, which is Method 2's input. `--grader-self-test` gains fixtures for every new arm, each clause red on its
own break. Budget: unmeasured; 316.5's run took 21.5 minutes and this adds a fifth drive and the parent's build.

### 7.5 Method 2's formats (the verifier writes the reader, in scratch)

**The Swift outline** (`MarkdownOutline`, one JSON object per line, in the same pre-order as the identifiers):
`{"fixture":<name>,"n":<int>,"parent":<int|-1>,"kind":"heading|paragraph|code|list|item|quote|rule|table|row|cell|html|plain|note|rest|written","depth":<int>,"level":<1-6|null>,"ordered":<bool|null>,"start":<int|null>,"task":"open|done|null","align":"none|left|center|right|null","fenced":<bool|null>,"text":<string>}`.
`text` is the drawn characters for heading, paragraph and cell (an image as its alt, or `Image`); the lines joined with
`\n` for code; the characters for html and plain; the note's words; `""` for a container.

**The node reader** runs `mdast-util-from-markdown` with `micromark-extension-gfm` and `mdast-util-gfm` (what
`remark-gfm` wraps; all present, nothing installed) over the SAME source and emits the same shape: heading.depth →
level; code → fenced from the source; list.ordered and start; listItem.checked → task; blockquote → quote; thematicBreak
→ rule; table.align; tableRow (the first is the header) and tableCell, normalised as GFM says (cells past the header's
count dropped, fewer padded; measured at this step: mdast keeps the extra cells); html → html; text by
`mdast-util-to-string`. Comparison is by kind, depth, level, ordered, start, task, align and the text with every run of
whitespace made one space and trimmed. MD1's labels compare with the same text.

**The pinned differences**, each named, never silent: D1 raw HTML is drawn as characters (the Mac drops it; mdast and
the phone agree on kind); D2 link reference definitions and reference links are text; D3 footnotes are text; D4
Foundation consumes `^[…](…)` keeping its words (§3 row 2); D5 an empty image alt draws `Image`; D6 every cap (`note`,
`rest`, `plain`, a cut line or cell); D7 an ordered list's `)` drawn `.`. Any other difference is a defect or a new
pinned one, by name, in the verdict. **Ruled 2026-10-01** (the section "As built, the ruled round"): D17 an ordered item
is drawn with the number the agent WROTE, never CommonMark's count, a difference from CommonMark, from mdast's `start`
and from the Mac; and an answer past `MarkdownCaps.pieces` is ONE outline node of kind `written`, every character it
draws, against mdast's whole tree (D18).

### 7.6 The independent methods (Tier 3: at least two, one an attack) and the parent

1. **The attack**: the hostile fixtures through the parser (§7.2) and through the hostile door (§7.3); MD3; and the
   verifier's OWN hostile shapes, not the builders'.
2. **The re-derivation**: Method 2 (§7.5) over every fixture, the real corpus and MD1.
3. **Real data**: the assistant answers in `docs/research/assets/63-fixtures/` and this repository's markdown, each cut at
   4,000 characters with main's own clip, through `P3166_OUTLINE_INPUT` and Method 2.
4. **The parent**, `28d89295`: `git archive 28d89295 ios | tar -x` into the scratch directory (a read of the object
   store; nothing is written to his repository), named to the probe as `P316_PARENT_IOS=<the directory holding that ios/>` (a NEW variable; 316's
   `P316_PARENT_CHECKOUT`, which reads only whether `ios/` exists, keeps its meaning), built for testing into its own
   derived data, driven by ITS OWN UI test
   (`pair`, `list`, `open:<p316-md>`, `conversation`, `first`) against HEAD's Mac (this phase changes no Mac code). **No
   regression against today:** every letter-or-digit word in the parent's `turn-answer-<i>` label for each planted turn
   appears in HEAD's composed answer at least as often, except, each counted and printed: a fence's info string, a task
   box's `x`, and the words past a cap in `table-at-caps`. The same over `session-answer` and `md-last-*`.
5. **Optional, the verifier's**: a read-only `sqlite3` row count of a COPY of the 18.3 device's keychain database for the
   app's access group, before and after Unpair (§3 row 4).

---

## 8. His checklist — NEW `build/p3166/CHECKLIST.md` (the proof builder's)

In his words, each row saying what to open, press and see, then "Not covered yet" and a table of where every word it
names was found. Rows, in order:

1. **Get this build on the Mac**: nothing on the Mac changed in this phase; any build since 316.5 serves.
2. **Archive, check and upload 1.0.0 (4)**: `open ios/Tortie.xcodeproj`, scheme Tortie, Any iOS Device (arm64), Product →
   Archive; Show in Finder; `node build/p316/test-ios.mjs --read-app ` and drag the archive in. **You should see** the
   one line ending "none links NetworkExtension or TailscaleKit, none carries code coverage, no DEBUG seam, and it asks
   Apple for its alert address". Distribute App → TestFlight Internal Only, as before; install from TestFlight.
3. **Open Tortie.** **You should see** Needs input selected, its badge an amber circle with a dark number equal to ⌘J's
   count on the Mac (if nothing waits, no badge). Open a session in Sessions, switch to Needs input and back: it is still
   open, and the bar is under it.
4. **A table and a code block**: ask an agent (your own turn) for a short markdown table and a code block, then open the
   conversation. **You should see** columns, and both scroll sideways.
5. **A link**: tap one. **You should see** its whole address; Cancel; tap it again, Open: it opens (in Safari, or in the
   app that owns that address).
6. **Settings**: **You should see** your Mac's name, and a fingerprint equal to your iPhone's row in Settings then Phone on
   the Mac; Alerts says Allowed and opens iOS Settings for Tortie; Version 1.0.0 (4).
7. **Unpair**, and confirm. **You should see** Pairing. Make a session wait: no alert arrives (an observation). On the
   Mac press Remove, then Pair, scan, allow alerts if asked, match, Allow: Tortie is back on Needs input.

**Not covered yet:** the Mac learning of an Unpair and End (317), Reply (318), privacy and support (333.1), the sample
(333.3), the badge's colour on iOS 26's glass bar.

---

## 9. What HE does, in order (the `operatorSteps` of this step's answer)

Rows 2 to 7 of §8, in plain words; nothing on the Mac, no key to choose again, no Allow on the Mac's door.

---

## 10. Builders, disjoint files, and who owns what is shared

Three builders, in `/private/tmp/wt-p3166` at once. No file is in two lists. Builders launch no Electron, boot no
Simulator, run no smoke, probe or `npm test` whole; they never commit, stage or stash, never touch `/Users/gdc/gmux`, and
keep every command under 90 s except `xcodebuild`, which uses
`-derivedDataPath /private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p3166/dd-<builder>`,
ad hoc, no team, device builds unsigned. A builder that needs another's interface codes against §5's pinned names and
the integrator reconciles. No raw control byte, bidi, zero-width or BOM character in any file. Never name anything `ps`,
`secret`, `tk`, `authKey` or `tailnetKey` (rule (p)), and no `print(`, `dump(` or log call in the app (rule (x)). Rules (f)
and (p) read EVERY text file under `ios/`, tests and `fixtures.json` included: no `tskey-`, no `"tk":`, no `tailnetKey`,
no `NetworkExtension`, no VPN token (`build/conformance-ios.mjs:1085-1098`), which includes ANY word that is `NE`, a capital
and a letter, in code, a string or a JSON file (a fixture saying `NESTED` or `NEWS` fails (f)), and in a Swift string no
`vpn`. Run `conformance:ios` after writing any fixture.

| Builder | Owns |
| --- | --- |
| **tabs** | `ios/Tortie/App/TortieApp.swift`; `ios/Tortie/Screens/ListScreen.swift`; NEW `ios/Tortie/Screens/SettingsScreen.swift`; `ios/Tortie/Style/Tokens.swift`; `ios/Tortie/Style/Copy.swift`; `ios/Tortie/Screens/DoorWords.swift`; `ios/Tortie/Screens/Identifiers.swift`; `ios/Tortie/Door/Keys.swift` (the forget path and `holdsRecord` only); `ios/Tortie/Alerts/Alerts.swift` and `Alerts/SystemAlerts.swift` (`forgetAddress` only); `ios/Tortie.xcodeproj/project.pbxproj` (the build number only); tests `ScreensFixtures.swift`, `ScreensModelTests.swift`, `AlertsTests.swift`, `TokensTests.swift`, `CopyTests.swift`, `StyleSource.swift`, `DoorKeychainTests.swift`, NEW `TabsTests.swift`, `SettingsTests.swift`, `UnpairTests.swift`, `UnpairKeychainTests.swift` |
| **renderer** | NEW `ios/Tortie/Markdown/Caps.swift`, `Blocks.swift`, `Inline.swift`, `Rendered.swift`, `Links.swift`; NEW `ios/Tortie/Screens/MarkdownView.swift`; `ios/Tortie/Screens/AnswerText.swift`; `ios/Tortie/Screens/SessionScreen.swift`; `ios/Tortie/Screens/ConversationScreen.swift`; tests `ScreensDrawingTests.swift`, NEW `MarkdownSpecTests.swift`, `MarkdownHostileTests.swift`, `MarkdownLinkTests.swift`, `MarkdownOutline.swift`, `MarkdownOutlineTests.swift` |
| **proof** | `build/conformance-ios.mjs`; `build/p316/ablation-ios.mjs`; `build/p311/copy-drift.mjs`; `build/p316/test-ios.mjs`; `build/p316/probe-p316.mjs`; `build/p316/hostile-door.mjs`; `build/p316/node-phone.mjs` (only if a need appears); `ios/TortieUITests/P316DriveUITests.swift`; NEW `ios/TortieTests/Fixtures/markdown/fixtures.json`; NEW `build/p3166/CHECKLIST.md`; and the shared files below |

**Shared files, and their one owner.** `package.json` (no change expected), `build/verification-checks.mjs`,
`CLAUDE.md` and `CHANGELOG.md` are **proof**'s. `docs/audits/contract-baseline.txt` is **the integrator's** (no line is
expected to move; `node build/contract-inventory.mjs --check` must pass unchanged). `ios/Tortie.xcodeproj/project.pbxproj`
is **tabs**'s (the build number; new files need no project edit). `docs/design/phone/**` was made by this step and is
**proof**'s from here (it judges them); a mock moves only when a `Copy` word moves, and the integrator says so.
`ios/TortieTests/Fixtures/vectors.json` is nobody's (it does not move). `build/p3166/SPEC.md` is this file; the
integrator appends "§As built". `docs/BACKLOG.md` belongs to no builder.

### 10.1 The integrator

Reconciles the pinned names; runs §7.1 whole except what needs THE LOCK, including `ablation:p316` and
`CSC_IDENTITY_AUTO_DISCOVERY=false npm run -s package`; `xcodebuild build-for-testing` Debug and Release for the
Simulator SDK and an unsigned Release device archive, with `--read-app` on it and on the Debug app (the control);
`LC_ALL=C grep -nP "[\x00-\x08\x0b\x0c\x0e-\x1f]"` and a scan for U+200B–U+200F, U+202A–U+202E, U+2066–U+2069 and
U+FEFF over every touched file; a duplicated-block scan of ten or more lines; appends "§As built — 316.6".

### 10.2 The CHANGELOG items (under `## Unreleased`, `### Added`; the follow-up docs commit adds the links)

- `- The iPhone app has tabs for the sessions waiting on you, every session, and Settings, which shows the Mac it is paired with and lets you unpair it; your Mac still lists the iPhone until you press Remove in Settings then Phone`
- `- Conversations on the iPhone draw headings, lists, quotes, code and tables, and tapping a link shows its whole address and opens it only when you press Open; only plain https links can be opened, and images are never loaded`

---

## 11. What is NOT in this phase

- **No web view, JavaScript, in-app browser or syntax highlighting**, and nothing fetched for an image or a link preview.
- **No link opened without its whole address shown and a press, and none but `https` with a plain host.**
- **No markdown in the ask** (rule (h)), and no raw terminal, ever (4.2.7).
- **No fourth tab, search, Past Sessions, filters (316.7's) or Face ID switch.**
- **No door change, route, Mac change or IPC channel.** The Mac's half of Unpair is 317's.
- **No stored tab, text selection, copy menu, light mode or landscape.**
- **No release, no tag.** 316.5's builds stay unreleased under his rule.

## 12. Open concerns handed to the verifiers

1. **The tab bar in XCUITest** on iOS 26.3's glass bar: whether `app.tabBars.buttons[<label>]` finds the items, and what
   the Needs input button's `value` says for its badge. A badge that cannot be read is UNREADABLE, never a pass.
2. **The badge's colour** is unmeasurable by any agent (§3 row 1); his iOS 18 phone is the observation.
3. **A container label.** `.accessibilityElement(children: .contain)` on `turn-answer-<i>` is believed to keep every
   block an element; MD1 measures it.
4. **The parse budget** is proposed (50 ms Release, 500 ms Debug ceiling); the verifier pins it from iOS 18.3's numbers.
5. **Twenty turns of a hostile page** parse on the main actor as the page is accepted: at most about 20 × 25 ms. Measure
   it on `md-hostile`.
6. **MD2's Open** sends one DNS question for `evil.example` from the Simulator through his resolver (NXDOMAIN by RFC
   6761); nothing is fetched. It is the only address any run opens.
7. **Every cell is a view**: a page of hostile tables can hold 20,000 `Text`s (1,000 cells × 20 turns); the conversation
   is not lazy, by Phase 316.2's rule. Measure the page on `md-hostile`.
8. **Not run by anyone yet**: everything that needs a Simulator or an Electron.

## §As built — 316.6 (the integrator, 2026-10-01)

Built by three builders (`tabs`, `renderer`, `proof`) in `/private/tmp/wt-p3166` over `28d89295` and reconciled here.
No builder and not the integrator launched an Electron or booted a Simulator; no model turn was spent (0); nothing
reached Apple; his key, keychain and conversation stores were never read. Nothing is committed, staged or stashed.

### The seams, read from both sides

| Seam | Held by |
| --- | --- |
| The renderer behind `AnswerText`, in the conversation | `ConversationModel.parsed(_:fresh:held:)` fills `rendered` before `pages` is assigned, for the newest page and every older one (`ConversationScreen.swift`); `TurnCard` draws `AnswerText(answer:scope: String(turn.index))` inside the `turn-answer-<i>` container, and the answer's words verbatim only if a turn were ever missing from `rendered` |
| ... and the Session screen's last answer | `SessionDrawing.lastAnswerRendered`, built in its `init`; drawn with `scope: ID.mdLastScope` inside the `session-answer` container (`SessionScreen.swift`) |
| The alert tap into the Needs input tab | `AppModel.openFromAlert` keeps 316.5's first two lines, sets `tab = .needsInput`, then `waitingPath` = `[]` or `[.alerted(id:)]`; `backToList(saying:)` empties `waitingPath` alone; `.alerted` is only ever pushed there, and its conversation is pushed on the same tab |
| Unpair through `PhoneDoor` into `PairingStore.forget` | `SettingsScreen` → `AppModel.unpair()` → `door.unpair()` → `LiveDoor.unpair()`: `do { try store.forget() } catch { return .kept }`, then `store.holdsRecord`; `forget()` keeps its order (record with `try`, v1 with `try?`, then `for tag in clientKeys.tags()`); `.kept` sets `settingsLine = Copy.unpairFailed`, drawn as `settings-unpair-line`; `.forgotten` starts `forgetAddress()` and calls `lostPairing()` |
| One `ListModel` for both list tabs and the badge | `listRouting` (its `backToList` does nothing: the list's reading kind only ever answers `pairAgain`); `ListModel.load()` keeps the drawn answer while it reads, so the badge never blinks off on a re-read |

Every name §1, §5.1.3, §5.4, §5.5.1 and §5.6 pins exists with that spelling.

### Where the build differs from this spec, and why

- **The mocks' fingerprint.** `Settings.html` and `Unpair.html` drew `7k4d …`, which is not hex, so §4.3's own data
  rule could not match it; `proof` wrote `7c4d …`. **Confirmed by the integrator**: no `Copy` word moved, and the drawn
  value is a digest. (`ScreensFixtures.swift` still uses `7k4d …` as a fake fingerprint in tests; it is never judged
  against a mock.)
- **§7.2's count.** 31 fixtures in `fixtures.json` and 11 built in code, 42, not "36 pinned names". `fixtures.json`
  carries two more top-level keys, `about` and `recipes`; a recipe's `{index}` and `{each}` parts let node and Swift
  build the same bytes (11 of 11 byte-identical, checked by `proof` and by a Swift test).
- **A table cut both ways** has ONE `md-<scope>-<n>-more`, `1 more row · 1 more column` (§5.5.7 named one id; MD1
  splits the label at ` · `).
- **§5.5.4 missed that Foundation deletes words**: a link reference definition with a title at the START of an inline
  run (`[a]: /b "c"`) comes back empty. `Inline.definitionKept` escapes its first `[`, so the characters are drawn (D2).
- **An empty image alt** comes back from Foundation as U+FFFC; it is stripped and `Copy.image` drawn (D5).
- **Laziness.** §5.5.2's "an ordered list that interrupts a paragraph must start at 1, and an empty item cannot
  interrupt one" holds inside one container only; in a lazy line any list marker ends the quote or item (CommonMark
  examples 278, 281 to 283, 302 and 315).
- **§7.5's outline `n`** is the node's position in the outline, rows, cells and notes included; it follows the
  identifiers' order but not their numbers. `MarkdownOutline.swift`'s header says so.
- **Proposed named differences** for §7.5 (the verifier rules on each): **D8** Foundation turns an out-of-range numeric
  entity (`&#87654321;`) into U+FFFD where CommonMark keeps the characters; **D9** Foundation's emphasis rule is the older
  one (`*£*bravo.` loses its asterisks, CommonMark example 354); **D10** an empty or blank answer is one empty paragraph
  (§5.5.2 item 6), where mdast has no node; and under D6, a cell cut at `cellCharacters` before the inline parse can
  leave a stray `**` or backtick visible.
- **Method 2's reader**: `mdast-util-from-markdown` runs out of stack on `nest-quotes` (10,000 `>`); cut the input at
  32 KiB first, as the phone does, or skip that recipe.
- **`UnpairKeychainTests`** keeps the vectors' test identity (key and the Mac's certificate) plus one key minted on
  the Simulator as a leftover, not "a minted client key and its certificate": a key minted on the phone cannot carry
  the Mac's certificate without a Mac. It asserts no `pairing-v2`, no `pairing-v1`, `tags()` empty, no certificate, no
  identity, `load()` nil, `holdsRecord` false, and a second Unpair `.forgotten`.
- **`startOver()`** (paired and lost pairing) also clears `alertPermission` and `settingsLine`, so a new pairing never
  shows the last one's `Allowed` or its failure sentence (`tabs`' ablation A15d).
- **The notifications row** is a tappable container with the button trait (as `RowView` is), so
  `settings-notifications-state` stays its own element; the probe finds `settings-notifications` as any element, not
  through `app.buttons`. `settings-unpair` is a real `Button`. `settings-alerts-line` is inside the Alerts card.
- **Names added**, which nothing else needs: `AppModel.permissionRead`, `SettingsDrawing`, `AppVersion`,
  `SettingsFrame`, `ListNames`, `RowView.named(_:)`, the `ID.needs*` and `ID.settings*` constants (values exactly §5.6's).
- **Rule clauses beyond §6** (`proof`): y2 also requires each cap to be read in the file §5.5.3 names; (n) also
  requires `LiveDoor.unpair` to ask `store.holdsRecord`; (a) also requires `TabBarLook.apply()` once, from
  `App/TortieApp.swift`; the `.full` ban applies in files that parse markdown, so a `.full` date style stays legal
  elsewhere; z6 reads `opens` and every `LinkPolicy` helper it reaches.
- **UI test steps not in §7.4**: `idle:<s>` (U1's 20 seconds) and a `tab-before` line (T2b's door read before each
  tap). Because pairing lands on Needs input, a hostile list arm's sentence may appear as `needs-list-failure`; the
  probe accepts it as the same sentence. The PR word check excuses words past a table's caps in every planted answer
  (Conversation.html's own answer loses two columns by design), counted by kind and printed.
- **The integrator's edits**: (1) the duplicated block scan's one fixable group, `probe-p316.mjs`'s relay and MD3
  listener sharing 13 lines, is now `listenLoopback(server, sockets, count)`, exercised on its own (one connection
  counted, the handle closed) and with `gate:background`, `gate:electron` and `--grader-self-test` re-run; (2)
  `test-ios.mjs` makes `P3166_OUTLINE_DIR` after its refusals, because `testTheOutlineFile` writes into it and makes no
  directory (measured: a missing one threw); both refusals still exit 2 before anything is made; (3) the CHECKLIST's
  footer records this re-read (every line number held) and row 7 names `Copy.pairTitle`.
- **Left as it is, by the scan**: `P316DriveUITests.swift`'s `Seen` spells §5.6's identifier strings again, as it
  already spelled 316.2's, because a UI test cannot import the app module.

### Runs at the reconciled tree (the integrator)

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 21.7 s; boundaries 1,382 files, 7,828 imports, 0 violations; no runtime cycles |
| `node build/conformance-ios.mjs` | 0 | 24 rules, 30 app files, 27 test files, 67 files under `ios/`; (k) 259 operators, 147 under the renderer scope, 32 named in 29 entries; (y) 12 caps each read once, 2 call cycles and 1 view cycle; (z) 1 `OpenURLAction`, 2 `UIApplication.shared.open` |
| `ablation:p316` whole | 0 | 184 of 184 red on the rule that owns them, base green, the working tree unmoved, 188 s |
| `copy-drift.mjs --quiet`, `--self-test` (`conformance:phonecopy`) | 0, 0 | 12 screens, 339 segments, 50 owned rules matched (floor 50); `Copy.swift` 91 words, 39 judged against the Mac (floor 39), 7 named controls (floor 7); 17 self-test mutations each red, the honest log call green |
| `conformance:pocket`, `conformance:pocket:hostile`, `conformance:push` | 0, 0, 0 | 52 rules, 12,255 checks; 96 arms; 26 rules, 2,318 checks |
| `gate:simulator`, `gate:contract`, `gate:checks`, `gate:electron`, `gate:background`, `gate:knownhosts` | all 0 | floor 2; the inventory byte for byte (no contract line moved); 243 check scripts; 157 against a floor of 157; 3 starts, 19 of 19 fixtures; run before and after the integrator's edits |
| `node build/p316/vectors.mjs --check` | 0 | unchanged |
| `node build/p316/probe-p316.mjs --grader-self-test` | 0 | tabs and markdown 81 cases |
| `node build/p316/hostile-door.mjs --self-test` | 0 | 25 arms, every listener closed |
| `npm run -s test` | 0 | 1,024 files passed, 1 skipped; 17,827 tests; 42 s |
| `xcodebuild build-for-testing`, Debug, Simulator SDK, ad hoc, `dd-integrator` | 0 | 17 s; no Swift warning (three `appintentsmetadataprocessor` lines only) |
| the same, Release, `ENABLE_TESTABILITY=YES` | 0 | 27 s; no warning; the test bundle holds the new test classes (`nm`) |
| `xcodebuild archive` Release, `generic/platform=iOS`, `CODE_SIGNING_ALLOWED=NO`, `dd-integrator-device` | 0 | 12 s; "code object is not signed at all"; `CFBundleVersion` 4, `CFBundleShortVersionString` 1.0.0 |
| `test-ios.mjs --read-app` on that archive | 0 | 1 Mach-O file; the pinned PASS words; `strings` finds `registerForRemoteNotifications` and `unregisterForRemoteNotifications` once each |
| `--read-app` on the Debug Simulator app (the control) | 1 | 12 problems, as a control must: the five seams in the app and in the test bundle, and neither selector |
| `--read-app` on the Release Simulator app | 0 | 12 Mach-O files, the PASS words |
| `npm run -s build` | 0 | 30 s, with `conformance:ios` and `gate:contract` inside it |
| `CSC_IDENTITY_AUTO_DISCOVERY=false npm run -s package` | 0 | 47 s, unsigned |
| Control bytes over the 59 touched files; U+200B to U+200F, U+202A to U+202E, U+2066 to U+2069, U+FEFF; CR | — | 0, 0, 0; each detector shown red on a planted scratch file first; `fixtures.json` ASCII only |
| `git diff -- src docs/audits package.json package-lock.json` and §1's unchanged iOS files | — | empty |
| The renderer's own `MarkdownSpecTests` and `MarkdownHostileTests`/`MarkdownOutlineTests`, host-compiled by the integrator over the tree's files | 0, 0 | 126 checks and 368 checks, 0 failures; 726 outline rows over `fixtures.json` |
| Electrons and crashpads left by this step | — | none (the ones running belong to `/private/tmp/wt-p3321` and his own Tortie, and were not touched) |

### The integrator's own reader (a lexer written for this step, not `conformance-ios.mjs`)

- **Nothing fetched, one way out.** No WebKit, web view, `SFSafariViewController`, `AsyncImage`, `URLSession`,
  `URLRequest`, `NSAttributedString`, `UIImage`, QuickLook, `canOpenURL` or `Link` in the app; `contentsOf:` three
  times, all inside `#if DEBUG` in `App/DebugLaunch.swift`; `Bundle` once, the version line. The ways a URL can leave:
  `OpenURLAction` and `openURL` once (`Links.swift:98`) and `UIApplication.shared.open(` twice (`Links.swift:111`,
  `SettingsScreen.swift:314`); the app makes two `URL(`s, the fresh-install marker's file URL and iOS's notification
  settings constant.
- **Every cap read once.** 12 members with exactly §5.5.3's values; each `MarkdownCaps.<member>` read once, in the
  file §5.5.3 names; `MarkdownCaps` named no other way. The only literals equal to a cap value in the renderer are two
  layout gaps of 8 in `MarkdownView.swift`; `budget.cells` and `budget.blocks` are counters.
- **No localized path for the agent's words.** No `LocalizedStringKey`, `LocalizedStringResource`,
  `NSLocalizedString`, `String(format:`, `String(localized:` or `Text(.init(` anywhere; no string literal handed to a
  SwiftUI initialiser that would localise it; every `Text(` in the app is `Text(verbatim:`, `Text(Image(` or, once,
  `Text(attributed)` of an `AttributedString` (`MarkdownView.swift:221`); `Words` is `Text(verbatim:)`.
- **Unpair.** `forget()`'s tokens: the record with a bare `try` first, then v1, then every tag `clientKeys.tags()`
  answers; `LiveDoor.unpair` and `AppModel.unpair` exactly §5.4's shape; `holdsRecord` answers true on a throw;
  `SecItemDelete` three times, all in `Door/Keys.swift`; `door.forget(` only inside `#if DEBUG`.

### Found by the integrator's own hostile shapes (the shipping parser, host-compiled with `-O`)

40 shapes of its own plus the 31 fixtures: none traps, every ordinal pre-order, depth at most 8, no image URL kept,
every surviving link both `opens` and `pressable`. Two findings:

1. **MAJOR, an uncapped view count: an empty list item costs no block.** `Budget` counts blocks, and an item that
   holds none adds nothing, so `"-\n"` × 16,384 (32,768 bytes, inside `answerBytes`) is ONE list of **16,384 drawn
   items** (each an `HStack`, a mark and an empty `BlockList`), and `"1.\n"` × 10,922 is 10,922. A page of 20 such turns
   is about 330,000 items, against §12's own worst case of 20,000 `Text`s; an honest answer (main's 4,000 characters)
   can still hold 2,000. `MarkdownHostileTests`' cap reader counts no items, which is why nothing caught it. A one-line
   fix, NOT applied (the renderer's file), is written and tested in scratch:
   `…/scratchpad/p3166/integrator/fix/blocks-item-budget.patch` (`Budget.countItem()`, called once per item in the
   item loop). With it, both shapes draw 400 items and one plain block; `MarkdownSpecTests` (126 checks) and
   `MarkdownHostileTests` + `MarkdownOutlineTests` (368 checks) stay green and the outline over `fixtures.json` is byte
   identical. The fix round should also count items in the hostile tests' `Caps.read` and add an `empty-items` fixture.
2. **The 50 ms budget is per fixture, not per answer.** Four 8,190-byte runs of code spans (32,766 bytes) parse in
   58.7 ms best of three on this Mac in `-O`; 400 headings of code spans in 49.7 ms. A hostile page of 20 such turns is
   about 1.2 s on the main actor here, before layout (§12 concern 5 assumed 20 × 25 ms).

### Open concerns for the verifiers

1. **The empty-item finding above** is a major until a fix round lands it; drive it on the Simulator too (a planted
   turn of `-\n` × 2,000 under main's clip, and the hostile door's page) and count `md-*-mark` elements.
2. **The tab bar in XCUITest on iOS 26.3** (§12 concern 1): the bar's buttons by label, the badge's `value`, the tab
   bar's frame for T2d. A badge or a bar that cannot be read is UNREADABLE, never a pass.
3. **Identifiers on two tabs at once.** Only the list's identifiers are prefixed; a session pushed on BOTH tabs draws
   `screen-session`, `session-answer` and `md-last-*` twice in the app. Whether XCUITest sees the unselected tab's
   copy is unmeasured; T2c is the arm that would show it.
4. **Each tab switch reads the list** (`.task` runs again when a tab reappears), as "reads on appear" allows; one
   return to the foreground is one read. Count reads per switch if a verifier wants the door's load.
5. **`P3166_OUTLINE_DIR` is written from inside the Simulator's test host.** `test-ios.mjs` now makes it; whether a
   Simulator-hosted XCTest may write to a host path under `/private/tmp` is unmeasured. An absent outline file is
   UNREADABLE for Method 2, never a pass.
6. **Unpair's two honest limits**: a client key the Keychain refuses to delete stays (§5.4's named limit), and if the
   record's delete succeeds but the read-back THROWS (a locked device), Unpair says "Nothing was changed." after the
   keys went. Measure neither as a pass; name them.
7. **`readAlertPermission` runs on every return to the foreground** for a pairing whose Mac sends, as §5.1.5 says; it
   asks iOS and never Apple.
8. **Foundation drops characters from a link before the policy sees it**: U+202E in a path and U+200B in a host are
   gone, so `[go](https://apple.com/<U+202E>x)` opens `https://apple.com/x`, which is what the alert shows. Honest, and
   §3 row 13's shape; the verifier's own hostile links should include both.
9. Everything in §12 stands, and **nothing here has run on a Simulator or in an Electron**: `test:ios` (Debug and
   Release, 26.3 and 18.3), `smoke:t1`, `probe:p316` (budget unmeasured; 316.5's took 21.5 minutes), the parent's
   build (`P316_PARENT_IOS`), Method 2 and the iOS 18.3 parse budget.

## §As built — the fix round (the fixer, 2026-10-01)

Both verdicts answered needs_work (lens 1, the attack; lens 2, the re-derivation). The fix runs once, and its rule was
**anything that makes a scenario worse than today is REMOVED, not repaired**: where the first build drew fewer of the
agent's words than the parent `28d89295`, the thing that dropped them is gone, not tuned. Nothing was committed, staged
or stashed; no Electron was launched and no Simulator booted by the fixer; no model turn (0); `src/**`,
`docs/audits/**`, `package.json` and `package-lock.json` are unchanged (`git diff --stat` empty).

### Every major and minor, and what was done

| # | Verdict | The defect | What the fix round did | Where |
| --- | --- | --- | --- | --- |
| 1 | both, major | Caps an honest answer reaches (`cellCharacters` 200, `tableColumns` 8, `tableRows` 50, `fenceLines` 400, `lineCharacters` 1,000) cut words the parent drew: 533 of 1,167 letters of one JSON line; about 20,855 words of real cells | **Removed for every size main can send.** A cap is now one an honest answer cannot reach (`cellCharacters`, `lineCharacters` and `fenceLines` 4,096, past main's 4,000-character clip), or one whose overflow is still DRAWN as the agent wrote it: a table's rows past `tableRows` (50) or the cell budget are one plain block right under it, and a table wider than `tableColumns` (now 64) is one plain block of its source. No table note exists any more (`MarkdownTable.moreRows`/`moreColumns`, `RenderedTable.note`, `Copy.moreRow*`, `Copy.moreColumn*` and `Copy.moreRows`/`moreColumns` are gone); a code block past 4,096 lines still says `n more lines` | `Markdown/Caps.swift` (header rewritten: which caps an honest answer can reach and what is past them), `Markdown/Blocks.swift` `Table.pieces`, `Markdown/Rendered.swift`, `Screens/MarkdownView.swift` `TableView`, `Style/Copy.swift`, `build/conformance-ios.mjs` `MARKDOWN_CAPS` |
| 2 | lens 2, major | A body row's cells past its header's count were dropped (GFM's rule, and the Mac's): `five` in `table-align`, every `\|` inside a code span in a cell; the PR arm FAILED on it | **Kept** in the row's last cell with the pipes between them (`Table.cells(_:columns:)`), so `` `a||b` `` in the last column is the code span again and `\| one \| two \| three \| four \| five \|` draws `four \| five`. A new pinned difference, **D16** | `Markdown/Blocks.swift`; GFM example 204 in `MarkdownSpecTests` now asserts `baz \| boo` with the reason |
| 3 | lens 1, major | The no-progress loop: a lazy line of four or more columns with no paragraph open reached indented code, which refuses a lazy line, so the loop added an empty block per turn: 18 bytes, 402 blocks, everything after drawn as one raw block | **Every turn takes a line**: a lazy line with no paragraph open begins one. And the collector that decides laziness (`Openness`) now follows an HTML block (kinds 1 to 5 to their end, 6 and 7 to a blank line), so `> <!--` / `> -->` / `    x` is a quote holding the comment and then indented code, as mdast reads it. The nested case the collector cannot see (`> > <!--` …) now draws the line as words. Every loop shape of lens 1's (seven, named `loop`): 3 to 16 nodes, no empty code block, nothing raw, no word lost | `Markdown/Blocks.swift` (`blocks`, `Openness.html`); `testEveryTurnOfTheLoopTakesALine`; fixtures `loop-quote-comment` (probe), `loop-nested-fence`, `loop-item-comment` |
| 4 | integrator, both majors | An empty list item cost no block: 16,384 drawn items for 32 KiB, 2,000 for an honest 4,000 characters; a page of twenty ended the iOS 18.3 test host | **Counted**: `Budget.countItem()` once per item (the integrator's patch, applied). `MarkdownHostileTests.Caps.read` counts items too. Every shape now draws at most 400 items and the rest as one plain block | `Markdown/Blocks.swift`; recipes `empty-items-2000`, `empty-items-32k`, `empty-ordered-in-quote`; `testAnEmptyItemCountsAgainstTheBudget`, `testTheListStopsAtTheBudget` |
| 5 | lens 1, major | An unfenced diff's `- old` and `+ new` both drew `•`, so which line went and which came was lost | **The bullet the agent wrote is drawn** (`MarkdownItem.bullet`, `RenderedItem.bullet`, `ItemMark` draws `item.bullet`); `Copy.bullet` is gone. An ordered list still draws its counted number and `.` (D7) | `Markdown/Blocks.swift` (`ListMarker.written`), `Rendered.swift`, `Screens/MarkdownView.swift`; `docs/design/phone/Conversation.html` and `Link.html` draw `-`; `build/p311/copy-drift.mjs` drops the `•` and `n more columns` owned rules, adds `-` as the agent's data, `OWNED_RULE_FLOOR` 50 to 48 |
| 6 | lens 1, minor | A hex last label (`https://127.0.0.0x1/`, which WebKit reads as 127.0.0.1) and `.local`, `.internal`, `localhost.localdomain` were pressable | A last label that is `0x` and hex digits (the URL Standard's ends-in-a-number) opens nothing, nor one of `localdomain`, `local`, `internal`, `intranet`, `private`, `corp`, `home`, `lan`, `arpa` (RFC 6762 and its Appendix G, RFC 8375, ICANN). **Named limit**: the loopback name itself cannot be in the set, because rule (d) lets no Release file spell it (the first try was red on (d)); alone it is one label and refused, and a name under it is not. And no rule on the address can say where a NAME resolves (`127.0.0.1.nip.io`): the policy promises a plain address, shown whole, never a far one | `Markdown/Links.swift` `namesAPlace`; `testAHexLastLabelIsANumber`, `testANameKeptForOneNetworkOpensNothing` |
| 7 | lens 1, minor | "A bare URL is never pressable" failed when Foundation encoded the address (`café`) or ran a bare URL together with a link beside it | Pressable only when the words do NOT already say the address: both read with percent escapes decoded, compatibility forms folded (a full-width dot is a dot, U+3002 too), lower case, and every default-ignorable character taken out, and the words merely CONTAINING the address count. The lying link (words another address) is still pressable, and the alert still says where | `Markdown/Links.swift` `pressable`, `said`; `testWordsThatSayTheAddressAreNotPressable` |
| 8 | lens 1, minor | A cell holding U+2028, U+2029 or U+0085 drew only its first line (`lineLimit(1)`) | `lineLimit(1)` removed from the cell: the horizontal scroll proposes no width, so a cell still never wraps, and a separator now draws a second line | `Screens/MarkdownView.swift` `CellView` |
| 9 | lens 1, minor | `KeychainClientKeys.delete` took the key before the certificate, and `tags()` listed keys only, so a certificate whose key went first outlived every later Unpair | The certificate goes FIRST, so a stopped delete leaves a key, which `tags()` finds; and `tags()` also lists every client certificate by its label, so an orphan from before is found and forgotten | `Door/Keys.swift`; `UnpairKeychainTests.testAnOrphanedCertificateIsFoundAndForgotten` (the verifier's own plant, in the shipping store) |
| 10 | both, minor | Answers inside every cap parsed past the proposed 50 ms (114.31 ms on 18.3.1, 106.42 ms on 26.3.1), and a hostile page was 2.3 s on the main actor | The page's answers are parsed **off the main actor** (`ConversationModel.rendering`, a detached task) between the door's answer and the page's acceptance; `pages` is read again after it, and the generation checked, so a page accepted meanwhile is never lost. The test budget is pinned at **150 ms** in Release (500 ms Debug) per answer, over the measured worst, with a new recipe `code-spans-32k` (the rederive verifier's slowest shape; 91.8 ms on the host) | `Screens/ConversationScreen.swift`; `MarkdownHostileTests` header and `budget` |
| 11 | lens 1, minor | Seven clauses could break with every test green | Tests for **v13** (NUL), **v14** (an ordered list counts on from its start), **v18** and **v27** (a task box is exactly its shapes), **v20** (the list stops at the budget). **v6 and v16 are equivalent mutants**, and say so: no URL Foundation makes carries a byte outside printable ASCII (measured here, `URL(dataRepresentation:)` included, and pinned by `testTheClausesNoURLReachesAlone`, which now asks that initialiser too), and `para` is empty whenever the block budget is found full, because every branch that adds a block empties it first (said in a comment over the line) | `MarkdownHostileTests`, `MarkdownLinkTests`, `Markdown/Blocks.swift` |
| 12 | lens 2, minor | T2b FAILED on iOS 26.3 although UIKit drew the badge (XCUITest gives the button an empty value) | The UI test prints every label inside the button and the system's version; the grader takes a number from a number-only label inside, and with none on iOS 26 or later says UNREADABLE (§12 concern 1), never FAIL. On iOS 18 an empty value with rows waiting is still a FAIL | `ios/TortieUITests/P316DriveUITests.swift` `badge()`; `build/p316/probe-p316.mjs` `gradeT2b`, `badgeNumber`, `glassBar`; four new self-test cases |
| 13 | lens 2, minor | `link:` swiped blind (60 down, 60 up), missed a link the markdown step had read, called it "not a link element" and cut the drive | Swipes go TOWARD the link while XCUITest knows its frame; one it cannot reach is printed `reached: false`, and its Cancel and Open print `skipped` and press nothing: the drive goes on. MD2 grades a link the markdown step read but could not reach as UNREADABLE, and one it never read as not a link element | `P316DriveUITests.swift` `link`, `linkPress`, `linkOpen`; `gradeMd2`; two new self-test cases |
| 14 | lens 2, minor | md-hostile FAILED "20 of 32" because the drive's 60 s never reached the older page | HM: every turn from the oldest the drive reached to the newest must draw (a gap is a FAIL); older turns never reached are UNREADABLE | `gradeHm`; three self-test cases |
| 15 | nits | `.kept` after a record that went but whose read-back threw; D11 to D15 unnamed; the lock; the stray Simulator | Named below; no code | this section |

`MD1` now holds `table-at-caps` to 50 body rows of **9** cells, its 51st row as one element holding its words and no
counted note, and, when planted, `honest-wide` to its ten columns, its `-` and `+` marks, its 300-character cell and
its 1,500-character line whole, and `loop-quote-comment` to the heading, table and list after the loop. `PR` no longer
excuses words past a table's caps: only a fence's info string and a task box's `x` are excused.

### The caps, as built (this replaces §5.5.3's table)

| Member | Value | An honest answer reaches it? | Past it |
| --- | --- | --- | --- |
| `answerBytes` | 32,768 | no (at most about 12,000 bytes) | `Copy.restNotShown` |
| `blocks` | 400, a list item counted as one | yes | the rest as one plain block, every character |
| `depth` | 8 | yes | markers are the paragraph's own characters |
| `inlineBytes` | 8,192 | yes (a CJK paragraph) | the run drawn verbatim, whole |
| `tableRows` | 50 | yes | the rows after it as one plain block under the table |
| `tableColumns` | **64** | yes | the whole table as one plain block of its source |
| `cellCharacters` | **4,096** | no | cut, `…` |
| `cells` | 1,000 per answer | yes | the rows after it as one plain block; a header that cannot fit, the whole table |
| `fenceLines` | **4,096** | no (at most 3,993 lines) | `n more lines` |
| `lineCharacters` | **4,096** | no | cut, `…` |
| `listNumberDigits` | 9 | yes | a paragraph (CommonMark) |
| `linkBytes` | 2,048 | yes | not pressable; the words stay |

View bounds per answer after the fix: at most 400 blocks and items and 1,000 cells, so §12 concern 7's worst page is
20 × 1,400 views, not the 330,000 items the integrator found. **Superseded by the ruled round:** the reverify measured
what a page at those bounds COSTS (28 s and 4.6 GB on iOS 18.3, and an ended test host), so the page is now bounded by
`MarkdownCaps.pieces`, the thirteenth cap, and an answer past it is drawn as written (the section "As built, the ruled
round").

### Pinned differences (§7.5), extended

D1 to D7 stand (D6 now names only answer cuts, cut cells and lines, counted code lines and the plain blocks of
tables and the block budget). **Accepted as proposed:** D8 (an out-of-range numeric entity is U+FFFD), D9 (Foundation's
older emphasis rule, CommonMark example 354), D10 (an empty answer is one empty paragraph). **Pinned from lens 2's
classes:** D11 micromark starts no ordered list numbered other than 1 right after indented code (CommonMark,
markdown-it and the phone do); D12 Foundation drops the space beside a code span whose backticks pair across a line; D13
Foundation's single-tilde and underscore emphasis consumes `~` and `_` where micromark does not; D14 a backtick kept or
consumed; D15 `|\n|-|` read as an empty table where GFM reads a paragraph, no letter or digit either way. **New:** D16
a body row's cells past its header's count are kept in its last cell (GFM drops them), so no word is lost.

### Named limits, added

- **Unpair stopped part way** (a kill between deletes): the record goes first, so the phone is unpaired and nothing it
  keeps can sign a read; client keys left behind are swept by the next Unpair or a fresh install, and since this round
  a certificate left behind is too. **The `.kept` sentence after a record that went but whose read-back threw** says
  "Nothing was changed." although the record and keys are gone: `holdsRecord` cannot prove a record it cannot read is
  gone, and the sentence is not reworded in this phase (the integrator's limit 6, measured by lens 1).
- **Links**: a name under the loopback name, and any public name that resolves near (`127.0.0.1.nip.io`), are not
  refused; the address shown is the one that opens.
- **A code line or cell wider than the phone is one very wide line** in its horizontal scroll (up to 4,000 characters
  from an honest answer, where the parent wrapped it). Every character is drawn and labelled; whether iOS paints a
  single text that wide on every runtime was not measured by anyone (no screenshot is allowed); a frame XCUITest reads
  is the reverify's evidence.

### The fixer's own checks (independent of the builders')

- **Its own 20 ablations** of the fix round's clauses, each in a copy, host-compiled with the four Markdown test files:
  20 of 20 red on the test that owns them (lazy, Openness, item budget, extra cells, rows rest, column plain, bullet,
  hex label, local names, `said` decoding, `said` contains, v13, v14, v18, v20, v27, and the cell, line, column and
  fence caps put back to the first build's values). Script: scratchpad `p3166/fixer/ablate.mjs`.
- **Lens 2's no-regression corpus, re-run over the fixed renderer** (its own tools, its parent render, 4,779 inputs):
  every honest set loses nothing (fx 31, fxclip 31, real63 33, repo 295, mine 83 except two 32 KiB cut shapes, win
  4,292 of 4,293). The one window left (`build/p316/SPEC.md@188000`, 2 characters) is the PARENT decoding `&#77;` and
  `&#83;` inside a code span its whole-answer parse misread; HEAD draws the code span's characters as written
  (CommonMark 6.1). Before the fix: 50 repo answers and 418 windows lost words to the cell cap alone. Method 2 over the
  same inputs: 4,682 identical to mdast (4,196 before), the rest pinned (D16 is 12 of them).
- **Lens 1's 138 shapes** through the fixed parser: at most 400 items anywhere, no empty code block but the 400 empty
  fences one shape writes, the six loop shapes as mdast reads them.
- `URL(string:encodingInvalidCharacters: false)` refuses `é`, DEL and a space; `URL(dataRepresentation:)` and
  Foundation's markdown parser percent-encode all three (macOS 15.6): why v6 is equivalent.

### Runs at the fixed tree

| Command | Exit | Numbers |
| --- | --- | --- |
| host compile of the shipping renderer with `MarkdownSpecTests`, `MarkdownHostileTests`, `MarkdownOutlineTests`, `MarkdownLinkTests` (`-O`, Mac Catalyst SDK so `Links.swift` compiles whole) | 0 | 58 tests, 753 checks, 0 failures; 50 budget lines, worst `code-spans-32k` 91.8 ms |
| `node build/conformance-ios.mjs` | 0 | 24 rules, 30 app files, 27 test files, 67 files under `ios/` |
| `npm run -s ablation:p316` | 0 | 184 of 184 red on their rule, the working tree unmoved, 199 s |
| `copy-drift.mjs --quiet`, `--self-test` | 0, 0 | 12 screens, 337 segments, 48 owned rules (floor 48); `Copy.swift` 86 words, 39 Mac (floor 39), 7 named (floor 7) |
| `node build/p316/probe-p316.mjs --grader-self-test` | 0 | tabs and markdown 97 cases (81 before), alerts 188, dumps 17 |
| `node build/p316/hostile-door.mjs --self-test` | 0 | 25 arms; md-hostile 39 turns over 2 pages, 546,317 bytes |
| `npm run -s typecheck`; `npm run -s build` | 0; 0 | 7,828 imports, 0 violations; 32 s, with `conformance:ios`, `gate:contract` (byte for byte), `gate:electron` (157 of 157), `gate:simulator` (floor 2), `gate:background` (19 of 19), `gate:checks` (243), `gate:knownhosts` inside it |
| `npm run -s test` | 0 | 1,024 files passed, 1 skipped; 17,827 tests; 49 s |
| `conformance:pocket`, `conformance:pocket:hostile`, `conformance:push` | 0, 0, 0 | 52 rules, 12,262 checks; 96 arms; 26 rules, 2,318 checks |
| `CSC_IDENTITY_AUTO_DISCOVERY=false npm run -s package` | 0 | 54 s, unsigned |
| `node build/contract-inventory.mjs --check` | 0 | byte for byte |
| `xcodebuild build-for-testing` Debug and Release (`ENABLE_TESTABILITY=YES`), Simulator SDK, `dd-fixer` | 0, 0 | no Swift warning (the one a first build raised, an unused mock in `CopyTests`, was fixed) |
| `xcodebuild archive` Release, unsigned, `dd-fixer-device`; `--read-app` on it | 0; 0 | `CFBundleVersion` 4; the PASS words; `registerForRemoteNotifications` and `unregisterForRemoteNotifications` once each |
| `--read-app` on the Release Simulator app; on the Debug one (the control) | 0; 1 | 12 Mach-O files; 12 problems, as a control must |
| control bytes, U+200B to U+200F, U+202A to U+202E, U+2066 to U+2069, U+FEFF, CR over the 59 touched files | — | 0, 0, 0, each detector red on a planted file first; `fixtures.json` ASCII only |
| the integrator's duplicate scan | — | the one run it left (`Identifiers.swift` and the UI test's `Seen`), no new one |

### Not run by the fixer, for the reverify (under THE LOCK)

`test:ios` on iOS 26.3 and 18.3, Debug and Release (the new tests: `UnpairKeychainTests.testAnOrphanedCertificate…`
on the real keychain, the budget at 150 ms on the device, the conversation's off-main parse through
`testTheConversationParsesEachPageAsItIsAccepted`); `probe:p316` whole with `P316_PARENT_IOS` (MD1's new holds on
`table-at-caps`, `honest-wide` and `loop-quote-comment`; PR with no table excuse; T2b on 26.3; MD2's directed link
step; HM); `smoke:t1`; and, by the failed items, a page of twenty of the empty-item and loop answers on iOS 18.3
(the crash and the 18,400-point band), the cell with a separator measured by layout, the hex and local links
refused, and the parent against HEAD by drawn label for the honest scenarios lens 1 drove (the JSON line, the long
cell, nine columns, 51 rows, the unfenced diff).

### Process notes

- **The lock had no staleness rule.** Both verifiers found a killed run's `electron.lock` held with no live owner and
  released it by evidence (lens 2 also ended a scratch tmux server, a crashpad and a Simulator by pid and UDID). The
  owner file should carry the holder's pid; that is the workflow's, not this phase's.
- **A Simulator is left for the operator**: `p316-70422-1` (`6CDDC369-15BD-4FC3-89AC-AC97D163018E`), booted by lens
  1's killed round 3. `build/simulator-run.mjs` makes deleting a stray a person's decision; the fixer did not touch it.

### Where the entry and the spec were wrong (found in this round)

- **§5.5.3 and Caps.swift's header** said every cap was "far above what an honest answer can reach". Five were not; the
  table above is what holds.
- **§7.6 item 4 and the PR arm** excused "the words past a cap in `table-at-caps`". An excuse is how the regression got
  past the probe; it is gone.
- **§5.5.2's "more are dropped"** (GFM tables) and the Mac's own renderer agree with GFM; the phone now keeps the words
  (D16), because no regression against today outranks agreeing with the Mac.
- **§12 concern 5** assumed 20 × 25 ms on the main actor; measured 2.3 s, now off it. **§12 concern 7** ignored list
  items; now counted.
- **§5.4's named limit** covered only a refused key; an interrupted delete and an orphaned certificate are named and
  handled above.

## §As built — the ruled round (the fixer, 2026-10-01)

His ruling after the second needs_work, "One narrow fix round": the tabs, Settings and Unpair stay as they are; fix only
(1) the agent's own numbers, (2) the page cost and (3) the PR arm's regex; name (4) as limits. The fix runs once. Nothing
was committed, staged or stashed; no Electron was launched; every Simulator was made and ended by
`build/simulator-run.mjs` under THE LOCK, for the measurement and the unit run only (7 devices by their logs: 3 for the
measurement, `p316-32523-1`, `p316-66325-1`, `p316-55751-1`, and 4 for two unit runs, `p316-56565-1` and `-2`,
`p316-31313-1` and `-2`, each `deviceStillListed false`); no model turn (0); `src/**`, `docs/audits/**`,
`package.json` and `package-lock.json` are unchanged. The fixer's first session stopped at the weekly usage limit before
its unit run and this section's last row; a second session read every edit it had left against the reverify's tree,
kept each one, ran what was left and re-ran every gate (the table at the end).

### 1. The agent's own numbers (difference D17)

An ordered item is drawn with the number the agent WROTE, never a counted one. The parent drew the digits (its whole
answer was one inline text), so `8. CONTEXT` after a `6.` stays `8.`, and `exits code` / `0. Nobody waits` keeps its `0`
(the reverify's two real windows of `docs/BACKLOG.md`). This is a difference from CommonMark, from mdast's `start` and
from the Mac, all of which count on from a list's first number, and it is chosen because the build before this one drew
the digits. D7 stands: a `)` delimiter is drawn `.`.

| Where | What changed |
| --- | --- |
| `Markdown/Blocks.swift` | `ListMarker.number: String?`, the marker's digits decoded from the line's own bytes (`007` stays `007`); `MarkdownItem.number`, passed as `number: current.number`. `start` stays CommonMark's and decides only whether a list may interrupt a paragraph |
| `Markdown/Rendered.swift` | `RenderedItem.number: String?` is `item.number`; the `ordered ? start + offset : nil` count is gone |
| `Style/Copy.swift` | `Copy.orderedMark(_ number: String)`: the number as written, then `orderedMarkTail` |
| `Screens/MarkdownView.swift` | `ItemMark` draws `Copy.orderedMark(number)` from `item.number` (unchanged line, new type) |
| `fixtures.json` | NEW `ordered-as-written` (`probe` false, `hostile` null): `1. 2. 4.`, `7. 8.`, `3.` with a wrapped `0.` line, `5.`, `007.` and a `)` list; its marks are `1. 2. 4. 7. 8. 3. 0. 5. 007. 1. 3.` |
| Tests | `MarkdownHostileTests.testOrderedItemsDrawTheNumberTheAgentWrote` replaces v14's counted test; `CopyTests` reads `"12"` and `"007"`; `pinnedNames` gains the fixture |
| `conformance:ios` (y) | **y10** `RenderedItem.number` is `String?` and every `RenderedItem(` passes `number: item.number`; **y11** Blocks.swift keeps the digits from the marker's own bytes and every `MarkdownItem(` passes a marker's `.number`; **y12** `Copy.orderedMark(` draws `item.number`. Arms **y10** (the ordinal drawn), **y11** (`String(number)`, so `007` draws `7`), **y12** (the mark from the item's place) |

### 2. The page cost

**What drives it, measured** (iOS 18.3.1, Release, a fresh test host per page, the reverify's method: a page of twenty
answers in `ScrollView { VStack }` in a 393 × 852 window, `phys_footprint` read after layout and 0.4 s of run loop).
Pages of 40 and then 160 of one kind of piece per answer, the growth between them per piece:

| One piece | Page growth per piece | Drawing variants (100 per answer, 2,000 per page) |
| --- | --- | --- |
| paragraph, heading, rule, raw HTML, table cell | 47, 49, 38, 45, 49 KB | a cell as shipped 45 KB; without its stroked border 30 KB; `.border` instead 45 KB |
| list item, empty / with its paragraph | 59 / 154 KB | |
| quote with its paragraph | 146 KB | |
| one-line code block | 347 KB | as shipped 185 KB; without its rounded ground 155 KB; without its horizontal scroll 65 KB |

The parent's page grew 0 to 8 MB whatever it held: one `Text` per answer. **The unit is therefore what each piece costs
to draw**, `RenderedAnswer.pieces`: a block or a table cell 1, a list item or a quote `containerPieces` (2), a code block
or a table `scrollPieces` (8). The drawing itself is unchanged.

**The cap, `MarkdownCaps.pieces` = 26, the thirteenth cap**, read once in `Markdown/Rendered.swift`. It is the weight of
the densest REAL answer committed here: every string of 40 or more characters in the research 63 transcripts (210) and
EVERY committed terminal screen's rows joined (1,221, where the reverify's corpus took every third), 1,431 answers; their
twenty densest weigh 26, 25, 24, 24, 20, 20, 20 and thirteen of 19 (the densest is `a-antigravity.jsonl#a-antigravity-0013`).
So every real answer is drawn as blocks, and no answer heavier than the heaviest of them is.

**Past it, the answer is drawn EXACTLY as the parent drew it.** `RenderedAnswer.init` asks `Self.pieces(…) >
MarkdownCaps.pieces` once; past it `blocks` is empty and `written` is `Inline.asWritten` of the answer's kept text,
which is `28d89295`'s `AnswerMarkdown.render` statement for statement through the app's one `AttributedString(markdown:`
(Inline.swift now holds it in `parsed`, which `render` and `asWritten` both call): one inline parse, every space and line
break kept, every link and image address removed. `WrittenView` draws it with the parent's `AnswerText` modifiers exactly,
as ONE element `md-<scope>-0` whose label is every word. Two bounds of this phase still hold on that path: the answer cut
at `answerBytes` (with `Copy.restNotShown`), and NUL as U+FFFD; an honest answer reaches neither.

**How the cap was chosen.** With the first unit (every piece 1, a scrolling block 8) at 16, 24, 32, 48 and 64 pieces,
each of the five shapes at the limit, one page and three pages, against the parent over the same bytes (100 runs): time
never passed 2.9 times and stayed under 2 up to 32; MEMORY was the binding cost, three pages at the limit reading 2.55
(16), 3.24 (24), 4.20 (32), 6.54 (48) and 8.79 (64) times the parent at worst, always empty list items or items with a
paragraph. That is what put the item and quote weight at 2. The cap then follows from the real answers, not from a
target: 26.

**The result at the cap** (118 runs, iOS 18.3.1, Release; the five reverify shapes built AT the cap, `W26-*`, each
answer the shape's own unit repeated within 26 pieces and one-word paragraphs to 26, plus items with a paragraph, the
heaviest piece per unit; then the reverify's own pages and mine). "Screen" is the REAL conversation, each build's own
`ConversationScreen` over a scripted door holding one or three pages of twenty turns, the parent's from `git archive
28d89295 ios`; "page" is the reverify's method above.

| Page | Screen: parent → HEAD, one page | Three pages | Page method: one page | Three pages | Drawn as blocks |
| --- | --- | --- | --- | --- | --- |
| W26 fences-400 (3 code blocks) | 894 ms 30.2 MB → 907 ms 37.2 MB (×1.01, ×1.23) | ×1.09 time, ×1.66 memory | ×1.06, ×1.28 | ×1.18, ×1.84 | 20 of 20 |
| W26 empty-dash-2000 (12 empty items) | ×1.04, ×1.40 | ×1.15, ×2.03 | ×1.07, ×1.43 | ×1.22, ×2.25 | 20 of 20 |
| W26 loop-quote-fence | ×1.04, ×1.33 | ×1.16, ×1.92 | ×1.08, ×1.36 | ×1.24, ×2.13 | 20 of 20 |
| W26 code-dense-honest | ×1.03, ×1.34 | ×1.12, ×1.92 | ×1.07, ×1.34 | ×1.23, ×2.14 | 20 of 20 |
| W26 items with a paragraph (8 items) | ×1.05, ×1.45 | ×1.19, ×2.17 | ×1.10, ×1.47 | ×1.33, ×2.55 | 20 of 20 |
| my 20 densest real answers | 1,004 ms 31.5 MB → 969 ms 38.6 MB (×0.96, ×1.22) | ×1.05, ×1.61 | ×1.04, ×1.26 | ×1.07, ×1.83 | 20 of 20, 60 of 60 |
| real-sample20 (the reverify's) | ×1.18, ×1.17 | ×1.32, ×1.32 | ×0.96, ×1.12 | ×0.92, ×1.27 | 8 of 20 |
| real-top20 (the reverify's) | 1,830 ms 35.5 MB → 1,802 ms 35.4 MB (×0.98, ×1.00) | ×0.98, ×1.02 | ×1.00, ×0.99 | ×1.01, ×1.02 | 0 of 20 |
| code-dense-honest (the reverify's) | ×0.99, ×1.05 | ×0.99, ×1.05 | ×1.01, ×0.99 | ×1.00, ×1.03 | 0 of 20 |
| fences-400 | ×0.97, ×1.10 | ×1.00, ×1.08 | ×1.00, ×1.01 | ×1.01, ×1.02 | 0 of 20 |
| loop-quote-fence | ×0.99, ×1.03 | ×0.99, ×1.03 | ×1.01, ×1.01 | ×1.00, ×1.01 | 0 of 20 |
| empty-dash-2000 | ×1.01, ×1.04 | ×1.00, ×1.04 | ×0.98, ×1.02 | ×1.00, ×1.03 | 0 of 20 |

Before this round the same pages cost (the reverify's numbers, page method) fences-400 28.0 s and 4,646 MB, three pages
of loop-quote-fence 310 s and 20,020 MB, three of fences-400 more than 600 s. Now no page tried costs more than 1.33
times the parent's time, one page no more than 1.47 times its memory, and three pages at most 2.17 times on the real
screen and 2.55 times in the bare scroll view. **No run crashed**: 0 of 273 measurement runs (47 exploring, 108 at the
candidate caps, 118 final) printed a precondition failure, an exhausted data space, a restart or a failed test.

**The corpus.** 4,095 of the reverify's 11,564 inputs fall past the cap: 0 of its 210 transcript strings, 0 of its 414
screens, 3 of its 44 crafted answers, 2,563 of 8,781 sections and 1,529 of 2,115 windows of this repository's own
markdown. Every one of those is drawn exactly as today. Its "real-top20" (sections and windows weighing 160 to 522) all
fall past, which is why that page now costs what the parent's does. Re-derived a second way on 2026-10-02: the SHIPPING
`RenderedAnswer(_:)` host-compiled over the reverify's own `corpus.json`, counting `written != nil` rather than adding up
a census, gives the same 4,095 by the same sets, and each of the 4,095 drawn as written has exactly the characters the
parent's rendering of the same kept text has (0 differ).

**Fixtures now drawn as written**, each held to every word (`lostWords` on the drawn answer, and `MarkdownPiecesTests`
compares each to the parent's own rendering run for run): `answer-realistic` 60, `honest-wide` 74, `ordered-as-written`
35, `nested-list-task` 32, `table-align` 28, `refused-schemes` 64, `loop-quote-comment` 31, `clipped-in-table` 36 and
`table-at-caps` 469. Tests that hold a clause of the PARSE (the block, cell, row and column budgets, the depth cap, the
spec's examples, the walker's shape, the named fixtures' structure) now read `MarkdownOutline.asBlocks`, the parse
drawn as blocks whatever the cap says, so the parser's clauses stay proved and the page cap is proved on its own.
`probe:p316`'s MD1 now holds `table-at-caps`, `honest-wide` and `loop-quote-comment` each to ONE element `md-<turn>-0`
holding the words that matter (every cell of the 51 rows; the ten columns, the long cell, the long line and the `-` and
`+` lines; the heading, table and list after the loop). Checked on the host: the shipping `Inline.asWritten` keeps every
one of those strings.

**A lazy conversation, MEASURED AND NOT SHIPPED (his call).** The ruling allows a `LazyVStack` only if it changes no
identifier, order or scroll position the probe reads. The measurement says it is what bounds three pages: with
`ConversationScreen`'s stack lazy and the cap at 360 (in a scratch clone only), the real screen held `W360` pages at
×0.95 time and ×1.77 memory at worst, three pages at ×1.49, and the reverify's real-top20 drawn as blocks at ×1.29 and,
for three pages, ×1.03; 1 of 11,564 inputs would fall past. It is not shipped because a lazy stack holds only the turns
near the screen, and the probe's UI test reads turns by swiping and reading the tree between swipes (`first`,
`markdown`): a turn a swipe carries past whole would be missing from T1's count, MD1 and HM, which is what the
condition forbids, and this fixer may not run the probe to show otherwise. `ConversationScreen.turns` says the same in
its own words: "Not lazy: every turn read is in the accessibility tree, so a UI test counts what was drawn, not what is
on screen."

**Gates.** `conformance:ios` (y) gains **y13** (`if pieces(…) > MarkdownCaps.pieces {` and nothing more; `Inline.asWritten`
once, with `blocks: []`; blocks with `written: nil`), **y14** (pieces counts every block, every item and every quote at
`containerPieces`, every cell, and a code block and a table at `scrollPieces`), **y15** (`asWritten` removes every link and
image address, by the attribute or any typealias of it, through the one parse) and **y16** (`WrittenView` is exactly
`Text(attributed)` with the parent's five modifiers, drawn when `answer.written` is set); y2 holds thirteen caps. Arms
**y13** (the cap ×4), **y14** (header cells not counted), **y15** (a link kept), **y16** (another face).
`ablation:p316` is 191 arms. NEW `ios/TortieTests/MarkdownPiecesTests.swift`: what a piece is, the edge of the cap for
every kind of piece, as written equal to the parent's rendering (its own copy of `28d89295`'s function) for every
fixture and recipe past the cap, nothing pressable or fetchable as written, the cut, the fixtures each side of the cap,
and every committed real answer drawn as blocks with the densest AT the cap (it prints `P3166-REAL`, and reads the
transcripts and screens from the checkout beside it, as `fixtures.json` is read). `MarkdownOutlineTests` gains the
`written` node (D18).

### 3. The PR arm reads the parent's link rule

`probe-p316.mjs` reads the parent's `AnswerText.swift` through `readParentStripsLinks`, and `sourceStripsLinks` takes
both spellings of the removal: the property (`x.link = nil`) and the attribute's key, `[K.self] = nil`, where `K` is the
attribute or any typealias of it, which is how `28d89295` writes it. Nine grader cases: the parent's own lines (a
byte-for-byte slice of its file, checked against `git show 28d89295:…` when written), the property form, the bare key,
a parent keeping images, one keeping links, a key aliased to another attribute, a link only compared with nil, and the
read through a checkout directory the self-test makes and removes, plus a checkout with no file (UNREADABLE). Over the
real parent file the new reader says true and the old regex false.

### 4. Named limits, not fixed (his ruling)

- **A pipe in a code span splits a table row's cells, and joining them back (D16) can fuse words.** The extra cells are
  joined into the last cell; backtick pairing then shifts, and Foundation trims the spaces at the new code span's edges,
  so `draws four | five` can read `drawsfour | five`. Every letter is kept. Seen in 3 of 10,896 real windows by the
  reverify; an answer past the page cap is drawn as written and does not fuse.
- **An empty port, `https://evil.example:/`, is pressable.** `URL.port` is nil, so `opens` passes it; the alert shows the
  stray colon and iOS opens `evil.example` on 443, the same host the alert names.
- **For the main session, not this phase:** the stray Simulator `p316-70422-1` (still booted, left alone by every run
  here), a second one, `p316-81689-3` (`F2C1CE63-65C2-470C-AB68-6FB673EBF7A1`, booted 2026-10-02 04:22Z, named in the
  p317 reverify's own probe log, its maker's pid gone), and `smoke:t1` starting `agy --version`.

### The fixer's own checks (scratch, `p3166r/fixer/ablate.mjs`)

31 one-clause ablations and two controls, each in a copy of `ios/` (with the transcripts and screens beside it)
host-compiled with the five Markdown test files, or a copy of the probe run with `--grader-self-test`; the control of each
kind (`p0`, `q0`, the file unchanged) stays green. Run again at the final tree on 2026-10-02 (6 min 57 s, exit 0): 29 red,
`p0`, `q0` and `q5` green.
Red: **item 1** n1 the ordinal drawn, n2 the digits read back from an Int, n3 the number dropped, n4 `orderedMark`
renumbering; **item 2** p1 the cap never asked, p2 `>=` for `>`, p3 header cells, p4 items, p5 a quote's blocks, p6 row
cells, p7 a link kept, p8 an image kept, p9 the whole answer not the kept text, p10 written AND blocks, p11 the cut flag
dropped, p12 not the parent's parse, p13 a code block as one, p14 a table as one, p15 a quote as one, p16 the container
weight 1, p17 the scroll weight 1, p18 the cap at 400, p19 the cap at 20 (red only on the real-answer test); **item 3**
q1 no typealias, q2 no property form, q3 the old regex, q4 the call site reading the old way, q6 MD1's words, q7 MD1's one
element. Equivalent: q5 (MD1's cell check) is subsumed by q7, since any cell element is a second element.

### Runs at the ruled tree

Run again at the final tree on 2026-10-02, after the fixer's session was resumed.

| Command | Exit | Numbers |
| --- | --- | --- |
| host compile of the shipping renderer with the five Markdown test files (`-O`, Mac Catalyst SDK) | 0 | 69 tests, 2,423 checks, 0 failures; `P3166-REAL` 1,431 answers, densest 20 `[26, 25, 24, 24, 20, 20, 20, 19 × 13]` |
| `npm run -s typecheck` | 0 | 1,382 files, 7,828 imports, 0 violations |
| `npm run -s conformance:ios` | 0 | 24 rules, 30 app files, 28 test files, 68 files under `ios/` |
| `npm run -s ablation:p316` | 0 | 191 of 191 red on their rule (y10 to y16 among them), the working tree unmoved, 282 s |
| `copy-drift.mjs --quiet`; `npm run -s conformance:phonecopy` (`--self-test`) | 0; 0 | `phonecopy OK` |
| `npm run -s gate:simulator`, `gate:contract` | 0, 0 | 496 scripts, floor 2; the inventory byte for byte |
| `probe-p316.mjs --grader-self-test`; `hostile-door.mjs --self-test` | 0; 0 | tabs and markdown 109 cases (PR's 16 among them), alerts 188, dumps 17; 25 arms |
| `npm run -s test` | 0 | 1,024 files passed, 1 skipped; 17,827 tests passed, 7 skipped; 63 s |
| `xcodebuild build-for-testing` Debug, then Release (`ENABLE_TESTABILITY=YES`), Simulator SDK, a FRESH `dd-fixer-final` | 0, 0 | 20 s, 34 s; 0 warnings, 0 errors |
| `npm run -s build` | 0 | 56 s, `conformance:ios`, `gate:contract`, `gate:simulator`, `gate:checks` inside it |
| The renderer's, Copy's and the screens' XCTest classes (`MarkdownPiecesTests`, `MarkdownHostileTests`, `MarkdownSpecTests`, `MarkdownOutlineTests`, `MarkdownLinkTests`, `CopyTests`, `ScreensDrawingTests`, `ScreensModelTests`) on iOS 18.3.1 and 26.3.1, Release and Debug, in a `cp -Rc` clone of the checkout through `build/simulator-run.mjs`, under THE LOCK (scratch `p3166r/fixer/meas/unit2.mjs`) | 0, 0, 0, 0 | 136 tests each, 0 failures; `P3166-REAL` 1,431 answers, densest `[26, 25, 24, 24, …]` on iOS's own Foundation, as on the host; slowest parse `code-spans-32k` 74 to 81 ms; both devices `deviceStillListed false`. A first run had 9 failures in `CopyTests` on every runtime, all `no such file` for the Mac modules and mocks it reads, because that clone held `ios/` without `src/` and `docs/design/`; with them beside it, 0 |

### Where the ruling is met, and where it is not

- **Met:** the numbers as written; a page at the cap and three pages, on the real conversation screen, at most 1.19 times
  the parent's time and 2.17 times its memory, one page at most 1.45 times; no crash; the reverify's five shapes, real
  and hostile, at the parent's cost (×0.97 to ×1.10); every committed real answer, and so my 20 densest, drawn as blocks;
  4,095 of 11,564 corpus inputs past the cap; the PR arm reading the parent.
- **Stretched:** three pages at the cap in the reverify's bare scroll view reach 2.55 times the parent's memory (items with
  a paragraph) and 2.25 (empty items). "About twice" is read as the real screen's 2.17.
- **Not met, and his to rule:** the reverify's "real-top20" (this repository's densest documentation, not agent answers)
  is drawn as written, exactly as today, because drawn as blocks it costs 5.3 times the parent's memory on one page and
  10.5 times on three (measured, real screen), and no cap that keeps it can hold a page near twice. The measured way to
  keep it is the lazy conversation above, which the ruling's condition keeps out of this round.

## §As built — markdown off (the fixer, 2026-10-02)

His ruling after the reverify of 2026-10-02 answered needs_work a third time (the tabs, Settings and Unpair passed
again; the fallback past the cap is exactly the parent's drawing; but markdown under the cap still cost a page of real
prose dense in inline code 3.2 times the parent's memory, and pages of images 50 to 76 times): **"Ship tabs + Settings,
markdown off"**. Every answer is drawn through the proven fallback, exactly as `28d89295` drew it. Nothing about the
tabs, Settings, Unpair or the alert tap changed: `App/TortieApp.swift`, `Screens/SettingsScreen.swift`,
`Door/Keys.swift`, `Screens/DoorWords.swift`, `Screens/ListScreen.swift`, `Alerts/**`, `Style/Tokens.swift`,
`Style/Copy.swift` and `Screens/Identifiers.swift` are byte for byte what the reverify passed. Nothing was committed,
staged or stashed; no Electron was launched; no model turn (0); `src/**`, `docs/audits/**`, `package.json` and
`package-lock.json` are unchanged.

**What this supersedes.** §1 item 4 and its "Drawing" row (the answer is drawn as written, not as blocks); §5.5.5's
press (no link reaches the gate); §5.5.7's table (only `WrittenView` is reached); §7.4's MD1, MD2 and PR; §8 rows 4
and 5; §10.2's second CHANGELOG item, which is gone; and the ruled round's cap of 26.

### The change, one line of code

`MarkdownCaps.pieces` is **0** (`ios/Tortie/Markdown/Caps.swift`, its comment saying why and that a later phase which
draws the conversation lazily moves it). `RenderedAnswer.init` is unchanged: it still asks `if Self.pieces(…) >
MarkdownCaps.pieces {` (y13), and every parse holds at least one block (`MarkdownBlocks.parse` returns
`[.paragraph("")]` for an empty or blank answer), so every answer weighs at least 1 and takes `Inline.asWritten` and
`WrittenView`. **An empty answer** takes the same path and is drawn as the parent drew it: `Inline.asWritten("")`
equals `AnswerMarkdown.render("")`, and so do the six blank answers below. Every other Swift change in the app is a
comment (read by diff with comment lines removed: `Caps.swift`'s one line and nothing else). **The Markdown module
stays in the tree**, parsed, weighed and tested but unused for drawing (`Caps.swift`, `Rendered.swift`,
`Inline.swift`, `Links.swift`, `MarkdownView.swift` and `AnswerText.swift` say so), for the later phase that switches
it back on. The gate `Links.swift` installs on the reading root stays and is never reached.

### Proved, on the host and on both runtimes

| Check | Exit | Numbers |
| --- | --- | --- |
| The SHIPPING `RenderedAnswer(_:)` (the worktree's `Markdown/*.swift`, host-compiled `-O`, Mac Catalyst SDK) against `28d89295`'s `AnswerMarkdown.render`, lines 29 to 55 read with `git show` (scratch `p3166off/fixer/eq`) | 0 | **11,355 inputs**: the reverify's 10,944 (`p3166r/reverifier/run2/corpus.json`: 600 transcript strings, 1,238 screens, 9,086 windows of this repository's markdown at offsets 0 and 1,333, 20 crafted) and 411 of mine (the reverify's 51 hostile shapes, its 6 decomposition pages, crafted and digit pages; the 36 committed fixtures; the 15 built recipes; empty and blank answers; NUL; every ASCII character alone and doubled; bidi, zero-width, BOM, line and paragraph separators; answers either side of 32 KiB). **Every one drawn as written with no block. 11,344 have an AttributedString EQUAL to the parent's, characters and every attribute run.** The other 11 are past a bound and each equals the parent's rendering of the kept text: 4 holding NUL (equal to the parent's rendering of the whole answer too: Foundation already makes NUL U+FFFD) and 7 over 32,768 bytes (cut there, `Copy.restNotShown` under it) |
| The same run, time | — | shipping 5,721 ms, parent 5,240 ms over all 11,355 (+9%: the block parse that still weighs each answer, off the main actor for a conversation page); slowest honest-sized answer (at most 4,000 UTF-16 units) 9.96 ms; slowest of all `code-spans-32k` 93.97 ms |
| `MarkdownSpecTests`, `MarkdownHostileTests`, `MarkdownOutlineTests`, `MarkdownLinkTests`, `MarkdownPiecesTests`, host-compiled with the shipping renderer | 0 | 69 tests, 4,298 checks, 0 failures; `P3166-REAL` 1,431 answers, densest `[26, 25, 24, 24, …]`, every one drawn as written and equal to the parent's |
| Those five, `CopyTests`, `ScreensDrawingTests` and `ScreensModelTests` on iOS 18.3.1 and 26.3.1, Release and Debug, in a `cp -Rc` clone through `build/simulator-run.mjs`, under THE LOCK (scratch `p3166off/fixer/meas/unit.mjs`) | 0, 0, 0, 0 | 136 tests each, 0 failures; slowest parse `code-spans-32k` 85.7 (18.3 Release), 86.8 (18.3 Debug), 83.8 (26.3 Release) and 85.2 ms (26.3 Debug), under the 150 ms budget; devices `p316-95292-1` and `p316-95292-2`, each `deviceStillListed false` |

### What still differs from the parent, by design

1. **An answer over `MarkdownCaps.answerBytes` (32,768 UTF-8 bytes) is cut there**, with `Copy.restNotShown` under it;
   the parent drew any size, up to the door's 2 MiB. Main clips every answer to 4,000 characters, so only a door that
   breaks its promise reaches it (7 of 11,355, all built over 32 KiB, among them `md-huge`'s two).
2. **The accessibility tree.** `turn-answer-<i>` and `session-answer` are containers holding ONE element,
   `md-<scope>-0`, whose label is the drawn text; the parent's Text carried the turn's identifier itself. The text,
   its face, its frame and (the reverify's measurement) its content height and layer count are the parent's.
3. **The cost** of one block parse per answer, above.

### Everything that assumed markdown, made true again

- **`conformance:ios`** (`build/conformance-ios.mjs`): `MARKDOWN_CAPS.pieces` is `{ value: 0, … why }`, so y2 pins the
  0 and its finding names his ruling; the header's (y) paragraph and the PASS line say markdown is off; one self-test
  case more, "(y2) catches markdown switched back on", shown able to fail (with the `why` dropped from the finding, in a
  copy of the file removed straight after, the gate printed `SCANNER FIXTURE FAILED` for it and `FAIL`). Every other clause of (y) and (z) still holds over the same files and
  is unchanged: their subjects (the parser, the caps, the gate) stay in the tree.
- **`ablation:p316`** (`build/p316/ablation-ios.mjs`): **y13** restated, because a fourfold loosening of 0 moves nothing:
  it now adds the ruled round's 26 at the cap's one site; **y2b** new, the cap put back to 26 in `Caps.swift`. 192 arms.
- **Swift tests.** `ScreensDrawingTests`: 316.2's four clauses again (`testTheAnswerIsInlineMarkdown`,
  `testWhitespaceIsKept`, `testLinksAndImagesAreWordsOnly`, `testHTMLIsText`), read from `RenderedAnswer.written`;
  `testTheConversationParsesEachPageAsItIsAccepted` unchanged. `MarkdownPiecesTests`: the edge restated for 0
  (`testEveryAnswerIsPastTheCap`: no parse weighs 0 pieces, so every kind of piece, an empty and a blank answer
  included, and each padded to the old 26 and 27, is drawn as written); `testAsWrittenIsTheParentsRendering` now
  requires EVERY fixture and recipe, the empty and blank answers included, to be the parent's; every fixture drawn as
  written; `testEveryCommittedRealAnswerIsAsWritten` (1,431 real answers, each the parent's rendering; the weights
  still printed for the later phase); `testAPieceIsWhatItCostsToDraw` unchanged. `MarkdownHostileTests`: each clause
  about the PARSE reads `MarkdownOutline.asBlocks`, as the ruled round already did past its cap, and each about the
  SCREEN reads `RenderedAnswer` (the budget is timed on it; every fixture drawn equal to the parent's; the cut drawn as
  `written:` then the rest; no link and no image address in any drawn answer, the link readers now reading the
  written text too; D17's digits and the diff's marks drawn as the agent's characters). `MarkdownOutlineTests`: the
  notes, the cut and an image's words read the parse; one `written` node for a three-item list. `MarkdownSpecTests`
  and `MarkdownLinkTests` (parser and policy unit tests) unchanged. `CopyTests` and the UI test's header say why.
- **`probe:p316`** (`build/p316/probe-p316.mjs`): **MD1** holds every planted turn to ONE element `md-<turn>-0` and no
  block, cell, mark or note, the three named answers to their words, and no `**` pair (a `**` beside no other `*`, so
  `***`, a rule drawn as its characters, is not one: `setext-and-rules` holds one). **MD2** holds that no link can be
  pressed, as in the parent: no link element anywhere the markdown step read, none of refused-schemes' words a link,
  the lying and long links drawn as their words and `https://evil.example/x` drawn nowhere; the drive no longer taps a
  link (the steps stay in the UI test for the later phase). **PR** also holds each planted answer HEAD draws EQUAL to
  the parent's label, naming the first difference; its ruled-round honest case (blocks, every loss excused by design)
  is now a failure. **MD3** and **HM** unchanged. `--grader-self-test`: 113 tabs and markdown cases (109 before),
  alerts 188, dumps 17.
- **`conformance:phonecopy`** (`build/p311/copy-drift.mjs`): Conversation.html's answer drawn as markdown and Link.html's
  alert are OWED to the later phase (`MARKDOWN_LATER`), printed on every run: the 23 answer strings, the `-` mark, the
  link's address rule and `Open`, which was an owned rule, so the owned-rule floor is 47 (48 before; the rule named in
  a comment). No other screen draws any of them (every segment of the twelve screens read by the gate's own extractor
  in scratch). The ask, the title, the terminal line, the clock and the tab bar still ship and are judged as before.
- **The mocks**: `Conversation.html` and `Link.html` keep the markdown drawing for the later phase, each with a header
  saying it is owed and what ships today; `index.html`'s captions 5 and 6 say so.
- **`CHANGELOG.md`**: the markdown item is gone; the tabs and Settings item stays, in his wording. **`CLAUDE.md`**: the
  `conformance:phonecopy`, `ios/**`, `test:ios` and `probe:p316` rows. **`build/verification-checks.mjs`**: the
  same four notes and `ablation:p316`'s 192. **`build/p3166/CHECKLIST.md`**: rows 4 and 5 (an answer drawn as before; a
  link is its words) and "Not covered yet".

### Runs at this tree

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 1,379 production files, 0 strongly connected components |
| `npm run -s conformance:ios` | 0 | 24 rules, 30 app files, 28 test files, 68 files under `ios/`; (y) "MarkdownCaps.pieces is 0 (markdown off, his ruling of 2026-10-02)" |
| `npm run -s ablation:p316` | 0 | 192 of 192 red on the rule that owns them, the working tree unmoved, 203 s |
| `npm run -s conformance:phonecopy` (`--self-test`); `copy-drift.mjs --quiet` | 0; 0 | 12 screens, 337 segments, 47 owned rules (floor 47), 85 drawn strings owed; `Copy.swift` 86 words, 39 Mac (floor 39), 7 named (floor 7); 17 mutations red, the honest log call green |
| `npm run -s gate:simulator`, `gate:contract` | 0, 0 | 496 scripts, floor 2; the inventory byte for byte |
| `node build/p316/probe-p316.mjs --grader-self-test` | 0 | 113, 188, 17 |
| `xcodebuild build-for-testing` Debug, then Release with `ENABLE_TESTABILITY=YES`, Simulator SDK, ad hoc, scratch derived data | 0, 0 | 19 s, 27 s; no Swift warning (three `appintentsmetadataprocessor` lines each) |
| `npm run -s build` | 0 | 32 s, with `conformance:ios`, `gate:contract`, `gate:simulator`, `gate:electron` (157 of 157), `gate:background` (19 of 19), `gate:checks` (243) and `gate:knownhosts` inside it |

### Not run by the fixer, for the reverify (under THE LOCK)

`test:ios` whole on iOS 26.3 and 18.3 (only the eight renderer, Copy and screens classes ran here), `probe:p316` whole
with `P316_PARENT_IOS` (MD1, MD2 and PR as restated, the tabs, Settings and Unpair again), `smoke:t1`, and the
reverify's own page measurement of the real conversation screen, which should now read the parent's numbers for every
page, the code-span and image pages included.
