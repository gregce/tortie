# Phase 333.3 — "See a sample": the app works before a Mac is paired — SPEC

Written by the spec step on 2026-10-10 in `/private/tmp/wt-p3333`, a detached worktree at origin/main `e1e17899`
("docs(backlog): queue Phase 344, a closed remote tab stays closed"), with Phase 337.3 (`20453f2e`), Phase 333.1 (`700f54ed`)
and Phase 333.11 (`85f90247`) under it. The phone at this base is TestFlight build 9, the build he submitted to Beta App Review
on 2026-10-09 (`docs/BACKLOG.md:42914`); it is the parent every comparison below names. Every `file:line` here was read at
`e1e17899` on this date.

**The spec step MEASURED before it wrote** (§15 holds every command, exit code and number). It started no Electron, no Simulator,
no `xcodebuild`, no agent and no model turn, and read nothing under `~/.ssh`, `~/.claude`, `~/.codex`, `~/Keys`, his keychain or
his live Tortie profile. It ran the SHIPPING route composer (`src/main/pocket/routes.ts` `createPocketRoutes`) under the pinned
tsx over a made-up world of five sessions in every state the sample can reach, and measured what precomposing the sample's lists
costs (M1); it checked that every shipping module the sample's writer needs imports with no Electron (M2). `stat -f '%z %m'
~/.zsh_history ~/.bash_history` read `736064 1791579183` and `23166 1790702242` before the first command and after the last.

Read with it, whole: `docs/BACKLOG.md` "## Phase 333.3" (`:38414-38494`); research 140 (`docs/research/140-the-public-beta-
beside-the-release.md`) §2, §5 row 3 and row 7, §8 row 4 and §10 with its `[333.3]` brackets; `build/p3373/SPEC.md`,
`build/p3371/SPEC.md` and `build/p3331/SPEC.md` (the house shape, and what each sends to 333.3); `build/p317/SPEC.md` §11,
`build/p318/SPEC.md` §11 and `build/p337/SPEC.md` §11 (what each sends to 333.3); `build/p333/CHECKLIST.md` and
`build/p333/STORE-CHECKLIST.md`; CLAUDE.md's UI rules.

**His ruling of 10 October**, which REPLACES research 140's "naming no agent maker": the sample's sessions show REAL agents with
their real names and icons as the app draws any agent (Claude Code and Codex at least, the two the phone answers by tap), with
made-up session names, projects, conversations and terminal output. Never a real session, a real path from his machines, a real
person's name, a model name or a billing line.

**The order of authority.** His ruling of 10 October, then research 140 §8 row 4 and §10's `[333.3]` brackets, then the backlog
entry, then the earlier specs' "what this sends to 333.3". Where they differ, §3 says so row by row. The tree at `e1e17899`
overrides any spec's picture of it.

---

## 0. The hard rules, stated once

- Builders and the integrator launch no Electron and boot no Simulator. Verifiers take THE LOCK, phone slot first:
  `mkdir -p /private/tmp/tortie-ops/electron.phone-wait && echo p3333 > /private/tmp/tortie-ops/electron.phone-wait/p3333-<role>`,
  then `zsh /private/tmp/tortie-ops/lock.sh try p3333 phone` (prints the slot or exits 1; retry every 60 s in a NEW command),
  remove the wait file once a slot is held, and release with `zsh /private/tmp/tortie-ops/lock.sh release <dir>` on the same
  command line.
- `/Users/gdc/gmux` is read only: every shell command begins `cd /private/tmp/wt-p3333 &&` (or the role's scratch,
  `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p3333/<role>/`), and every heredoc
  delimiter is quoted (`<<'EOF'`). Nobody but the committer commits, stages or stashes. `git diff e1e17899` in this worktree is
  exactly 333.3's delta. Install nothing.
- **Phase 344 is landing beside this one** (`src/main/manifest/**`, `src/main/sessions/**`, `src/main/machines/**`, `build/p306/**`):
  never touch its files. This phase reads `src/main/sessions/pocket-writes.ts` and never writes it.
- **No Mac change**: nothing under `src/` moves (`git diff e1e17899 -- src/` is empty at the end), no door route, no contract
  line (`docs/audits/contract-baseline.txt` unmoved), no Mac menu.
- **Phone build 10**: `CURRENT_PROJECT_VERSION` 9 to 10 in all six configurations, and every rule and checklist that pins it (§5.8).
  **No release**: no tag, no upload, no archive for the store; the upload is his.
- No real Tailscale, DNS or APNs: the stand-ins. Never `-L gmux` and never the default tmux server. Never `pkill`, `killall`, a
  `pgrep` pattern or a negative pid: a process is ended by the pid its starter holds, in a `finally`.
- His keychain, credentials, APNs key (`~/Keys`), `~/.ssh`, conversation stores (`~/.claude`, `~/.codex`) and live Tortie profile
  are never read. **No model turn**; Gemini, Qwen, Antigravity and Grok are never started.
- **His shell history**: before and after every command that starts a shell, a Simulator or the app, record ONLY
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history`; if either moves, stop and report. Any shell a test starts runs with a scratch
  `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset.
- Simulators only through `build/simulator-run.mjs`; Simulator.app is never started. Every `xcodebuild` uses
  `-derivedDataPath /private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p3333/dd-<role>`,
  deleted before the role returns. Every Electron through `build/electron-run.mjs`, killed in a `finally`. No screenshot and no
  screen recording: a visual claim is a frame or a label XCUITest read.
- DISK: read `df -h /` before any parent build, `xcodebuild` or Simulator (it read 70 GB free on 2026-10-10); under 8 GB free,
  wait and report.
- Under load a failing timing test is re-run alone before it is called a failure. **No scenario may be worse than today** (§7.8).
  User-visible words follow CLAUDE.md's UI rules (just enough words), live in `ios/Tortie/Style/Copy.swift` with their owners,
  and `conformance:phonecopy` holds them.

---

## 1. The answer first

**What a person can do after this phase.**

1. **On the phone's first screen, under Scan code, "See a sample".** It opens made-up sessions inside the app: no Mac, no
   pairing, no network. The same row is in Settings for a phone that is paired, so he can open the sample on his own phone (his
   store screenshots, `build/p333/STORE-CHECKLIST.md:22`, need made-up data).
2. **Every page of the sample says so**: one strip at the top, `Sample`, with `Leave sample` beside it, on every page and
   sideways too. Leave sample returns to where See a sample was pressed: the pairing screen as it was, or the paired Mac's lists
   with the pairing untouched.
3. **The sample works the way the app works.** Needs input lists two sessions waiting on a numbered question, one Claude Code
   and one Codex CLI; Sessions groups five sessions under two projects, with Show, Group by, Sort by and the agent filter; a
   session opens on its Terminal, drawn from the Mac's own composer, with one page of earlier output to scroll back through;
   keys and Ctrl appear on the sample's own prompt, and Return draws one line saying nothing ran; the question's buttons answer
   it; the ⋯ holds Catch Me Up and End session…; End and End these ask for Face ID, Touch ID or the passcode exactly as they do
   for a Mac and end only the sample's copy, and on an iPhone with no passcode the sample ends it without asking and says so.

**Nothing else changes** on the phone or on the Mac. The door, its routes, its words and the contract do not move; no Mac menu
moves. The phone is build 10.

**Can it run beside the work in flight?** Yes. It touches nothing under `src/`, so Phase 344 (Mac only) and this phase share no
file; the one coupling is that the sample is REGENERATED from the shipping composer, so a later Mac change to what the door
composes turns `conformance:ios` red until `node build/p3333/sample.mjs` is re-run in that change's commit (D29). It does not
wait on Beta App Review: research 140 §8 row 4 makes it "off the link's critical path", insurance in the next build.

### 1.1 The decisions, each with its reason

| # | Decision | Reason |
| --- | --- | --- |
| D1 | **The sample is a second `DoorReading`**, `SampleReader` (`ios/Tortie/Sample/SampleReader.swift`), which is also its own `DoorWriting`, over an in-memory copy, `SampleWorld` (an `actor`). No screen changes to draw it. | The entry's mechanism 1; the seam is `protocol DoorReading` (`ios/Tortie/Screens/DoorWords.swift:72-93`), and the app holds `any DoorReading` (`ios/Tortie/App/TortieApp.swift:175`) |
| D2 | **Every answer the sample serves was composed by the Mac's shipping code.** `build/p3333/sample.mjs` runs, under the pinned tsx, `createPocketRoutes` (`src/main/pocket/routes.ts`), `composeScreen` and `composePage` (`src/main/screen/compose.ts`), `readingRevisionOf` (`src/main/screen/watch.ts`), `endOfferOf` (`src/main/sessions/pocket-writes.ts`), `buildProjectLine` (`src/shared/overview-line.ts`), `readPocketTurns` (`src/main/pocket/facts.ts`), `statusVisual` (`src/shared/status-words.ts`) and the registry's `getRegistryEntry(id).displayName` over a made-up world, exactly as `build/p316/vectors.mjs:1062-1227` does for the vectors, and writes `ios/Tortie/Sample/sample.json`. The phone decodes every answer through `Door/Contract.swift`. | Research 140 §8 row 4: "a fictional Terminal made by the shipping composer"; the entry: "decoded through `Contract.swift`, so it cannot drift from what the door sends" |
| D3 | **Every state the sample can reach is precomposed, and the phone composes nothing.** A state is each session's variant (D5); there are 36. For each state the writer composes `/v1/blocked` and all 54 `/v1/sessions` questions (3 Show × 2 Group by × 3 Sort by × 3 agent filters) with the shipping routes, and stores them as SKELETONS over shared PIECES (§5.1.3). The Swift assembles a skeleton by index into one JSON object and decodes it through `Contract.swift`; it orders, filters, counts and words nothing. | build/p316/SPEC.md §4.0 ("no arithmetic on status, age or order"); measured (§15 M1): 1,980 answers are 1,933,954 bytes whole, but 11 blocked-row, 40 sessions-row and 12 group pieces (13,536 bytes) and about 162 KB of skeletons hold them all |
| D4 | **`at` is the one field the sample sets itself**: on every answer it serves it is the phone's own clock, in epoch ms, at that answer. Every age is the composer's, at its fixed clock (2026-10-10T00:00:00Z). | `read <time>` (`ios/Tortie/Screens/ListScreen.swift:142`, `SessionsScreen.swift:226`) must say when the phone read it, not a time that never happened on this phone |
| D5 | **The world: five made-up sessions** (§5.1.1): two waiting on a numbered question, one Claude Code and one Codex CLI; one working (Claude Code); one idle (Codex CLI); one ended (Claude Code). Two made-up projects, `lighthouse` and `orchard`, on this Mac. A waiting session's variants are `waiting`, `answered`, `ended`; the working and idle ones' `live`, `ended`; the ended one's `ended`. | His ruling of 10 October; the entry's "working, idle, needs input with a numbered choice, and ended"; the task's "the numbered question for Claude Code and for Codex" |
| D6 | **The Terminal**: every live session opens on a made-up Terminal, 80 columns by 30 rows, with 60 lines of made-up earlier output (`depth` 60, one page: the phone's page is 100 rows, `ScreenScrollback.swift:232`); the ended session opens on Catch Me Up. A waiting session's `answered` variant draws a second capture, the agent carrying on, at the same depth and `space`. | Research 140 row 4: "one page of fictional history"; 337.1 D16, a session with no terminal opens on Catch Me Up |
| D7 | **Keys echo on the sample's own prompt** (§5.2.4): each printable ASCII character one cell, each Ctrl key as `^` and its letter, Backspace removes the last of those, Return clears the prompt and draws `Copy.sampleNothingRan` on the screen's note row, and Escape, Tab, Shift-Tab and the arrows draw nothing. Every keys write moves the screen's question id and revision, as every keystroke at the Mac moves the question id. A waiting session's screen has no prompt: keys there draw nothing, and the question is answered by its buttons. Nothing typed outlives the Terminal it was typed on. | Research 140 row 4 ("Keys and Ctrl echo on the sample's own prompt; Return draws one fixed line saying nothing ran, never a shell's answer", guideline 2.5.2); `ScreenKeySender`'s lock reads the question id (`ScreenKeys.swift:17-27`) |
| D8 | **The poll is held, as the door holds it**: a screen read whose `since` is the revision now waits until that session's picture changes or 10 s pass, then answers the new picture or `unchanged`; the read's own task's cancellation ends it at once. | `ScreenModel.run()` asks again at once on `unchanged` (`Screen.swift:132-173`), so an unheld answer would spin |
| D9 | **Scrollback** answers a page by slicing the precomposed one-page history (rows `[from, from + count)`, the history's whole style table, the ask's own `from`, `depth` and `wrap`, the picture's `space`); an ask whose `depth` or `wrap` is not the picture's answers main's `moved` absence, and an ended session main's `ended` absence, both precomposed. | `PocketScrollbackAnswer`'s strict decoder (`Contract.swift:1382-1437`, `holdsTogether` `:1412`); the phone joins a page only in its space, width and depth (rule as) |
| D10 | **The press**: `choose` on a `waiting` session with a pressable marker moves it to `answered` and answers `done`; anything else answers `notTaken`. **No message**: every sample offer says `canSay: false`, and `say` answers `notTaken` with no write id. | Research 140 row 4 ("the question buttons ... work"); 318's message box stays Catch Me Up's and 318.1's |
| D11 | **End and End these act on the sample's copy, behind the REAL owner check.** `end` moves any variant to `ended` and answers `done`. The owner check for a sample reader is `SampleOwnerCheck(inner: DeviceOwnerCheck())`, which asks iOS exactly as today; it is made only by `AppModel.endCheck(for:)`, and only for a reader that `is SampleReader`. | Research 140 row 4 ("End behind the real check, acting on the sample's copy"); rule (ac)'s "only a match sends anything" (`build/conformance-ios.mjs:5092-5194`) stays true of every paired reader |
| D12 | **With no passcode set, End shows what it would have done.** `SampleOwnerCheck.kind()` answers a new `OwnerKind.unasked` where the device answers `.none`, and its `confirm` answers `.confirmed` without asking iOS anything (there is nothing iOS can ask). End is drawn on, with SF Symbols' `lock.open`, and its line says `Copy.sampleEndUnasked`; the session then reads Ended. | Research 140 row 4: "with no passcode set it shows what End would have done, because the real path says 'Set a passcode on this iPhone ...'" (`Copy.swift:552`, `App/OwnerCheck.swift:89-93`, `:108-121`) |
| D13 | **The entry**: `See a sample` (`pairing-see-sample`) on the pairing screen, under Scan code at rest and under the camera's line after Scan code, drawn whenever no pairing is under way; and, for a paired phone, a row of its own in Settings below Unpair this iPhone (`settings-see-sample`). | The entry's item 2 ("for everyone"); 333.1 §12 ("below Scan code"); a person who pressed Scan code first must still find it; a paired phone needs a way in (the entry's second attack arm, and his store screenshots) |
| D14 | **The Sample bar**: ONE strip at the top of the sample's root, above the three tabs, on every page upright and sideways: `Sample` on the left, `Leave sample` (a button) on the right, at least 44 points tall. | The entry's item 3 ("so no 'Needs your input' reads as the person's own Mac"); research 140 "'Sample' on every page"; one strip on the root holds on every page by construction |
| D15 | **Leave sample returns to where See a sample was pressed.** From Pairing: back to Pairing with its model untouched, and NO door or Keychain call. From the paired lists: `door.pairedReader()` once, then the Needs input tab, which reads on appear; a pairing that no longer reads back goes to Pairing with the not-paired line, as `lostPairing()` does. | The task: "returns to its pairing unchanged"; the reviewer's route touches no Keychain at all |
| D16 | **The paired reads stop while the sample is open**: opening it drops the paired list, the Sessions model and the reader (nothing of the pairing is forgotten); a return to the foreground in the sample reads no pairing; a tap on an alert leaves the sample first and then routes as today; a refusal inside the sample (which it never makes) leaves the sample. | The entry's proof ("the paired reads stop while it is open"); `cameToForeground`, `openFromAlert`, `lostPairing` (`TortieApp.swift:388`, `:423`, `:307`) |
| D17 | **The sample keeps nothing**: Show, Group by and Sort by live in an in-memory store made fresh each time the sample opens (`SampleChoices`), so nothing reaches `UserDefaults` and the paired tab's three words are untouched; no file is written; no Keychain item is read or written by anything under `Sample/`. | The entry ("no keychain"); rule (aa) keeps `UserDefaults` in `SessionsChoices.swift` alone |
| D18 | **Settings in the sample** draws its title and About only: no paired-Mac card, no Alerts card, no Unpair this iPhone, no See a sample row. | Leave sample is on every page (D14); Unpair inside the sample would forget a real pairing |
| D19 | **The Needs input tab's count badge draws the sample's own waiting count.** The sample sends no alert, asks iOS nothing about alerts (`alerts` is `AlertsKept.nothing`) and writes no icon badge (rule x already refuses any). | The entry's item 4 ("raises no alert and no badge") read beside 316.6's "the badge and the list never disagree" (`TortieApp.swift:502-509`): a sample Needs input tab whose badge disagreed with its rows would be the one place they do |
| D20 | **No network, no keychain, enforced and attacked**: a new `conformance:ios` rule (az) (§6.1), one `ablation:p316` arm per clause (§6.2), and the probe counting zero connections (§7.4). | The entry's Tier: "its whole promise is that it never reaches the network or the keychain, so that promise is attacked rather than read" |
| D21 | **Five words**, each `/// Phone:`-owned in `Copy.swift` (§5.6): `See a sample`, `Sample`, `Leave sample`, `Nothing ran: this is a sample.`, `No passcode is set, so the sample ends without asking.` | The entry's mechanism 5; CLAUDE.md "just enough words" |
| D22 | **Five identifiers** (§5.6): `pairing-see-sample`, `settings-see-sample`, `sample-bar`, `sample-label`, `sample-leave`. | Every claim is read by XCUITest |
| D23 | **Build 10**, and every pin of it (§5.8). | The task; build 9 is in Beta App Review |
| D24 | **No Mac change, no route, no contract line, no Mac menu.** | The task; the entry's "No sample on the Mac" |
| D25 | **Tier 2 plus an attack**, with the parent measurement (§7.6). | The entry; CLAUDE.md "Verification" |
| D26 | **The mocks**: `Pairing.html` gains See a sample under Scan code; a NEW `Sample.html` draws the Needs input tab inside the sample, under the Sample bar; `index.html` frames it. `conformance:phonecopy`'s owned floor 103 → 106, and the sample's session names are data with that reason. | 333.1 §12 ("adds 'See a sample' to the resting face ... and to `Pairing.html`"); the entry's mechanism 5 |
| D27 | **Earlier phases' sends to 333.3 are superseded** where research 140 or his ruling differ (§3 rows 4 to 7). | Research 140 is binding |
| D28 | **The deny list**: `sample.json` holds no absolute path, no URL, no e-mail address, no name of his or of his machines, no model name, no usage, cost or billing line, no "beta" or "TestFlight" (§5.1.5); the writer refuses to write one. | His ruling; research 140 row 4 |
| D29 | **The writer runs inside the gates**: `conformance:ios` (az7) spawns `node build/p3333/sample.mjs --check`, and `test:ios` refuses a stale sample before it boots anything and reads the built app's `sample.json` against the committed bytes. | The `(j)` precedent (`build/conformance-ios.mjs:13103-13113`); an archive he uploads must carry the composed sample |
| D30 | **The order**: after 333.1 and 337.3 (both landed), beside 344, before 333.4 (whose pass 2 runs over this sample) and before his store submission. | Research 140 §8; `build/p333/STORE-CHECKLIST.md:10` |

**Subject.** `feat(ios): See a sample, the app before a Mac is paired`

**First body line.** `Phase 333.3: See a sample`

**Semver.** The iPhone app only, 1.0.0 (10). No Mac change, so no Mac version moves.

**Tier 2, plus an attack**, on CLAUDE.md's questions: it holds no credential, spawns nothing and sends nothing (Tier 2 as a
rendered surface with new in-memory state); it does not touch tmux, the manifest or a session; but its whole promise is that it
never reaches the network or the Keychain, so that promise is attacked (§7.6). **The proof**: the battery; one app run over the
sample on iOS 26.3 and the 18.3 floor, fresh and paired; the attack, counted at the relay; and the parent measurement.

**Menus.** No Mac menu moves (`src/main/menu.ts` unchanged). The phone gains one button on Pairing, one row in Settings and the
Sample bar.

---

## 2. The tree at this head, re-read

| What | At `e1e17899` | Note |
| --- | --- | --- |
| The seam | `ios/Tortie/Screens/DoorWords.swift:72-93` (`DoorReading`: `alerts`, `facts`, `writer`, `blocked()`, `session(_:)`, `turns(_:to:)`, `sessions(_:)`, `screenDoor(_:)`); `:95-107` its defaults; `:112-124` (`DoorWriting`: `end`, `choose`, `say`); `:131-149` (`ScreenDoor`: `read(since:)`, `keys`, `scrollback`, `session()`, `writes`, `close()`); `:52-56` names "See a Sample until Phase 333.3 answers one" | D1; every member the sample answers |
| Every door call a screen makes | `ListScreen.swift:235` `blocked`; `SessionsScreen.swift:385` `sessions`; `SessionScreen.swift:183` and `TortieApp.swift:905` `session`; `ConversationScreen.swift:131`, `:212` `turns`; `TortieApp.swift:755` `screenDoor`; `Screen.swift:136` `read`, `:115` and `ScreenKeys.swift:150` `close`; `ScreenKeys.swift:209` `keys`; `ScreenScrollback.swift:1073` `scrollback`; `TortieApp.swift:904` `writes`; `EndBar.swift:100` `end`; `Reply.swift:93` `choose`, `:96` `say`; `SettingsScreen.swift:130` `facts`; `TortieApp.swift:444`, `:461`, `DoorWords.swift:224` `alerts` | the census, by grep, §15 M4 |
| The paired reader | `TortieApp.swift:973-1028` (`PairedReader`), `:1040-1099` (`PairedScreenDoor`), `:1133-1188` (`LiveDoor`) | the sample's peer, never named under `Sample/` |
| The app model | `TortieApp.swift:151-155` (`Root`), `:175` `reader`, `:205` `ownerCheck`, `:207` `choices`, `:213` init, `:240` `launch()`, `:292` `paired`, `:307` `lostPairing`, `:318` `startOver`, `:371` `wentAway`, `:388` `cameToForeground`, `:396` `readKeptPairing`, `:406` `makeLists`, `:423` `openFromAlert`, `:442` `checkAlertAddress`, `:460` `readAlertPermission`, `:473` `unpair`, `:502-509` `waitingBadge`, `:528` `endBatchSetup` | D15, D16 |
| The root | `TortieApp.swift:579-707` (`RootView`: `case .pairing` `:588`, `case .reading`; `tabs` `:628`, three `Tab(`, `.badge(app.waitingBadge)` `:638`; `destination` `:681`, `ownerCheck: app.ownerCheck` thrice), `:769-876` (`SessionRoute`) | D14 |
| Pairing | `Screens/PairingScreen.swift:200-450` (`PairingScreen`; the scanning face `:215-226`; `scanButton` `:320`; `foot` `:397`; `sitePages` `:430`); `PairingModel.busy` `:72`, `scanning` `:76` | D13 |
| Settings | `Screens/SettingsScreen.swift:36-87` (`SettingsDrawing`), `:127-136` `drawing` (`facts: app.reader?.facts` `:130`), `:139` body (`unpairRow` `:150`; `aboutCard` `:157`), `:278` `unpairRow` | D13, D18 |
| The owner check | `App/OwnerCheck.swift:38-46` (`OwnerKind`), `:59-64` (`OwnerCheck`), `:78-122` (`DeviceOwnerCheck`, `kind()` `:86-106`, `confirm` `:108-115`, `isPasscodeNotSet` `:118`) | D11, D12 |
| End | `Screens/EndBar.swift:66-114` (`EndRunner`), `:120-188` (`EndBarDrawing`; `let on = kind != .none` `:165`; the passcode line `:168`; `glyph` `:181`), `:194-293` (`EndModel`, `kind` `:226`, `press` `:240`); `Screens/EndBatch.swift:162` (`EndBatchModel.press`) | D11, D12 |
| The decoders | `Door/Contract.swift:12-17` (missing field refuses), `:148-199` blocked row, `:215-271` end offer, `:299-353` write answer, `:377-464` reply offer, `:553-632` session detail, `:640-677` turn, `:682-703` blocked answer, `:722-898` sessions, `:900-951` session and turns answers, `:1163-1279` screen (`holdsTogether` `:1259`), `:1289-1327` screen answer, `:1361-1437` scrollback (`holdsTogether` `:1412`), `:1446-1543` keys | D2, D3, D9 |
| Writes' results | `Door/DoorClient.swift:92-122` (`DoorFailure`), `:775-829` (`WriteResult`), `:832-835` (`SentWrite`) | the three DoorClient.swift names the sample may use (az2) |
| Words | `Style/Copy.swift:218` `catchMeUp`, `:274` `scanCode`, `:398` `unpairThisIPhone`, `:448` `endSessionMenu`, `:552` `endNeedsPasscode`, `:703` `more` | D21 |
| Identifiers | `Screens/Identifiers.swift:347` `pairingScanCode`, `:383` `settingsUnpair`, `:422-446` the Terminal's | D22 |
| The project | `ios/Tortie.xcodeproj/project.pbxproj:417,449,479,501,522,543` (`CURRENT_PROJECT_VERSION = 9`); synchronized folders (`:44-63`), so a file under `ios/Tortie/` is in the app target, a `.json` copied to the bundle's root | D23; no file reference to add |
| The vectors' composer | `build/p316/vectors.mjs:1062-1227` (the facts and `createPocketRoutes`), `:1294-1330` (screen and scrollback routes), `:171-189` (runs itself under the pinned tsx) | D2: the writer's pattern |
| The canned screen | `build/fixtures/screen/sample-claude-2.1.287.json`, written by `src/main/screen/__tests__/sample.test.ts` | NOT the sample's: research 140 row 4 ("shows a `/private/tmp` path and three 'Interrupted' lines and looks broken") |
| Phone gates | `build/conformance-ios.mjs` (13,609 lines): `NETWORK_TOKENS` `:945`, `URL_LOADING` `:966`, `ruleNetworkOnlyInClient` `:969`, `ruleKeychain` `:2058`, `PHONE_BUILD` `:2993`, `ruleSigning` self-tests `:7349-7395`, `ruleOwnerCheck` `:5092-5194`, `writerEndCalls` `:4925-4940`, `writerReplyCalls` `:5514-5530`, `RULE_IDS` `:12927`, `(j)` `:13103-13113`, (aw) to (ay) `:13563-13579`, `RULE_IDS.push` `:13580` | §6.1 |
| Ablations | `build/p316/ablation-ios.mjs:434` (`ARMS`), `s8` `:1328-1334`, `s11` `:1673-1679`, `s12` `:3540-3546`; the clone holds `ios/`, `src/` and all of `build/` but `vendor/` (`:198-212`) | §6.2 |
| Phone copy | `build/p311/copy-drift.mjs`: owned rules from `:302`, the data rules `:1042-1100`, `OWNED_RULE_FLOOR = 103` `:1284` | §6.3 |
| The drive and the probe | `ios/TortieUITests/P316DriveUITests.swift` (4,010 lines; `setupInventory` `:3432`); `build/p316/probe-p316.mjs` (12,260 lines; `ARMS` `:922`, runtimes `:932`, `PHONE_VERSION` `:2406`, `SETUP_NEVER = /sample/i` `:7625`, `gradeSe1` `:7635`, its self-test `:7885-7894`, the setup group `:11681`) | §7.4 |
| `test:ios` | `build/p316/test-ios.mjs:372` (`PASS_WORDS`), `:419` (`builtAppProblems`), `:2052-2063` (`--read-app`), `:2095-2112` (the preflight: the screen sample, then `vectors.mjs --check`) | §7.5 |
| The checklists | `build/p333/CHECKLIST.md:157-210` (texts A, B and C; `:160` "None says ... 'sample'"; `:221-222` and `:253` See a sample); `build/p333/STORE-CHECKLIST.md:10`, `:22`, `:141-163` (text 4) | §10 |

---

## 3. Where the entry, research 140, his ruling and the earlier specs are reconciled

| # | The entry or an earlier spec says | What binds now | This spec |
| --- | --- | --- | --- |
| 1 | Entry: `DoorReading` "has three reads" (`DoorWords.swift:34-38`) | it has five reads, a writer and a screen door now (`DoorWords.swift:72-93`), and every screen opens on a Terminal (337.1) | the sample answers every member (§5.2.1) |
| 2 | Entry: "End and Reply"; research 140: "keys and Ctrl", "Catch Me Up", "the Sessions tab's groups", "the Needs input tab" | research 140 is binding | all of them (D7 to D12, D3) |
| 3 | Research 140 row 4: "naming no agent maker, banner, model, billing line or test path" | his ruling of 10 October replaces the first clause | real agents (Claude Code, Codex CLI), no banner, no model, no billing line, no path (D5, D28) |
| 4 | 317 §11: "The sample (333.3) answers `end` with `{ state: 'none' }` on every row" | research 140 row 4: "End behind the real check, acting on the sample's copy" | End offered on every live sample row, composed by the shipping `endOfferOf` (D11) |
| 5 | 318 §11: "333.3's sample answers `reply` as the empty offer" | research 140: "The question buttons ... work" | the waiting sessions' offers press; every offer `canSay: false` (D10) |
| 6 | 337 §11: the sample's Screen "decodes `build/fixtures/screen/sample-claude-2.1.287.json`" and its `keys` "acts on nothing and answers `done`" | research 140 row 4: that screen "looks broken"; keys "echo on the sample's own prompt" | made-up captures composed by the shipping composer (D6); keys echo (D7) |
| 7 | 337.1 §11 and 337.3 §11: "`scrollback` with `moved` (a sample has no history)" | research 140 row 4: "one page of fictional history" | 60 lines of history, sliced by page (D9); `moved` only for an ask the picture did not make |
| 8 | 316.6's note (`docs/BACKLOG.md:39817`): "'Leave sample' in Unpair's place" | the entry's item 3: "a persistent sample line on every sample screen, ... and 'Leave sample'" | Leave sample in the bar on every page; Settings in the sample draws no Unpair (D14, D18) |
| 9 | Entry: "a new `conformance:ios` rule (x)" | (x) is 316.5's; the next free letter after 337.3's (ay) is (az) (`build/conformance-ios.mjs:13580`) | rule (az) (§6.1) |
| 10 | Entry: "The sample raises no alert and no badge" | 316.6 drew a count badge on the Needs input tab after the entry was written | no alert, no icon badge, no iOS ask; the tab's badge is its own list's count (D19) |
| 11 | Entry, Semver: "a new build number at 333.6" | 333.6 landed; build 9 is in review | build 10 here (D23) |
| 12 | `probe:p316` SE1 (333.1): "no label anywhere on the screen holding 'sample'" (`probe-p316.mjs:7625`) | this phase draws See a sample there | SE1 widened: exactly ONE label holds "sample", `pairing-see-sample`'s, under Scan code (§7.4) |
| 13 | `build/p333/CHECKLIST.md:160`: "None says ... 'sample'" | text C now tells the reviewer to tap See a sample | the clause becomes "none says ... except text A's and text C's See a sample" (§10) |

---

## 4. The base, the order and what moves under it

- **The base** is `e1e17899`. `git log 20453f2e..e1e17899 -- ios/` holds only `85f90247` (333.11's frozen tests); the phone app
  is build 9 as submitted.
- **Beside it**: Phase 344 (Mac only). No shared file. If 344 lands first and moves what `createPocketRoutes`,
  `endOfferOf` or `statusVisual` compose for a local session (it is not expected to: it is the remote tab write), this phase's
  integrator re-runs `node build/p3333/sample.mjs` and commits the regenerated `sample.json`; `--check` says so by name.
- **Before it lands**, nothing else under `ios/` may land; if one does (337.2, 333.11.1), the integrator replays this phase's
  `probe-p316.mjs`, `P316DriveUITests.swift`, `Copy.swift`, `Identifiers.swift`, `conformance-ios.mjs` and `ablation-ios.mjs`
  edits onto it, which are additive by design (new functions and blocks at the ends of their lists, an existing line changed only
  where §5 and §6 name it).

---

## 5. The design

### 5.1 The world and its writer — `build/p3333/**`, `ios/Tortie/Sample/sample.json` (builder **world**)

#### 5.1.1 The made-up world (`build/p3333/world.mjs`)

One module, pure, exporting the facts the writer composes over. The fixed clock `T = 1_791_590_400_000`
(2026-10-10T00:00:00Z). Projects `{ path: '/sample/lighthouse', name: 'lighthouse' }` and `{ path: '/sample/orchard', name:
'orchard' }` (the paths are never drawn: two projects with distinct labels draw no `folder`, and the deny list's `/Users/` and
`/private/` never match them). Every session is on this Mac (no `machine`).

| id | name | agent | project | start | variants | created | last output | waiting since |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `sample-1` | `fix-login-redirect` | `claude` | lighthouse | `needs_input` | waiting, answered (`running`), ended (`exited`, code 0) | T − 3 h | T − 4 min | T − 4 min |
| `sample-2` | `migrate-orders` | `codex` | orchard | `needs_input` | waiting, answered (`running`), ended | T − 2 h | T − 9 min | T − 9 min |
| `sample-3` | `add-rate-limits` | `claude` | lighthouse | `running` | live, ended | T − 50 min | T − 5 s | — |
| `sample-4` | `tidy-readme` | `codex` | orchard | `idle` | live, ended | T − 1 d | T − 40 min | — |
| `sample-5` | `bump-dependencies` | `claude` | lighthouse | `exited` (code 0) | ended | T − 3 d | T − 2 d | — |

- **The two questions** (the activity's `question` and `choice.options`, the agent's own words, made up in each agent's own
  shape): `sample-1`, Claude Code asking to make an edit to a made-up relative file, three options `1` to `3` (yes; yes for the
  session; no and say what to do instead); `sample-2`, Codex CLI asking to run a made-up command, three options `1` to `3`. Each
  offer (`facts.replyOffer`): `question` = the screen's `turn` (§5.1.2), `mark` = the screen's `dialog`, `pressable` `['1', '2',
  '3']`, `command` `null` for Claude Code and the made-up command for Codex CLI (318's `$` line), `canSay: false`. Every other
  session and variant: the empty offer.
- **The turns**: 3 to 6 made-up turns per session, at most 20 (one page, `TurnPages.pageSize`, `Contract.swift:1569`), plain
  prose (markdown is off, his ruling of 2026-10-02), the newest turn of a waiting or working session open. `refresh` answers
  `coverage: 'complete'` with counts that agree with the turns; `catchUp` is the shipping `buildProjectLine` over a view of the
  session's newest turn, as `facts.ts:299-333` builds it; `lastTurn` as `facts.ts:335-349`; `turns` as `facts.ts:351-355`.
- **Labels**: `agentLabel` is `getRegistryEntry(id).displayName` (measured: "Claude Code", "Codex CLI"); `statusWord` is
  `statusVisual`; `emptyLine` is `NOTHING_NEEDS_YOU`; `endOffer` is the shipping `endOfferOf(session, { status }, () => true)`.
- **The screens**: SGR-styled text in tmux's `capture-pane -p -e` form, built by `world.mjs` from small deterministic helpers, 80
  columns by 30 rows, drawing each agent's own shapes (Claude Code's input box and permission dialog, Codex CLI's approval and
  prompt) and made-up output: no welcome banner, no model name, no usage, cost or context line, no absolute path. One live
  capture per live session and one `answered` capture per waiting session (the agent carrying on, with its prompt). The display:
  pane `%301` to `%304` (one per session), cursor where the agent leaves it, `visible` as the agent draws it, not alternate,
  `history 60`, read steady.
- **The history**: 60 lines of made-up earlier output per live session, styled the same way, the screen's own `cols`.
- **The echo's rows**, per screen that has a prompt: `prompt: { row, column, style }` (the row the agent's input sits on, the
  column after its prefix, the style a typed character takes) and `note: { row, style }` (an empty row above the input where
  Return's line is drawn). Waiting screens have neither.

The words in the world are the world builder's, under §5.1.5. A reader reads them as fiction: real agents doing ordinary,
made-up work.

#### 5.1.2 The writer (`build/p3333/sample.mjs [--check]`)

Shaped as `build/p316/vectors.mjs` is: an outer run that re-runs the same file under the pinned tsx (`tsxCli()`,
`--tsconfig tsconfig.node.json`, waited for, 120 s), and an inner run that imports the shipping modules. It opens no socket,
starts nothing else, reads nothing under the person's home and prints no conversation line.

For each state (the product of the variant lists in session order, 36 of them) it builds the facts (the variant's status; a
`needs_input` session's stamp in `blockedSince`; the activity's question only on a `waiting` variant), and composes with
`createPocketRoutes(facts)`:

- `blocked()`; `sessions(query)` for every Show (`all`, `active`, `ended`) × Group by (`project`, `none`) × Sort by (`recent`,
  `name`, `oldest`) × agent (none, `claude`, `codex`), the query spelled as `DoorClient.sessionsTarget` spells it. A `null`
  answer fails the writer by name.
- per session and variant: `session(id)`; `turns(id)` with `limit=20`;
- per live variant: the screen, `composeScreen(reading, { turn, status, typable: true })` with `readingRevisionOf`, through
  `routes.screen` with a `facts.screen` that answers it (vectors' `historyRoutes`, `vectors.mjs:1294-1330`); for an `ended`
  variant `routes.screen`'s absence for an exited session (main's `SCREEN_ENDED`);
- per live session: the history, `composePage(styled, 0, 80, { from: 0, count: 60, keep: 'bottom' })` through
  `routes.scrollback` over the ask `from=0&count=60&depth=60&wrap=80&keep=bottom`; and the two absences, `ended` and `moved`,
  through `routes.scrollback` with a `facts.scrollback` answering each word (main fills each sentence).

Each session's question id is `sha256('tortie-p3333 sample ' + id)`'s first 16 hex, `-1`; it is the waiting screen's `turn`
and the offer's `question`. An `answered` capture's `turn` is the same prefix, `-2` (the press moved it, as the Mac's does).

#### 5.1.3 `sample.json`, the contract between the writer and the reader

ASCII only (every character past U+007F written `\uXXXX`), deterministic, one newline at the end; members in this order:

```text
{
  "format": 1,
  "clock": 1791590400000,
  "ids":      ["sample-1", …, "sample-5"],            state-key order
  "variants": [["waiting","answered","ended"], …, ["ended"]],
  "agents":   ["claude","codex"],                     the agent filter's ids, in the answers' order
  "constants": { "blockedAgeNote": …, "sessionsAgeNote": …, "emptyLine": … },
  "pieces": {
    "blockedRows":  [ <PocketBlockedRow>, … ],        each composed row, once
    "sessionsRows": [ <PocketSessionsRow>, … ],       each composed row with its `group` index, once
    "groups":       [ <PocketSessionsGroup>, … ],
    "choices":      [ <PocketSessionsChoice>, … ]
  },
  "lists": {
    "<state>": {                                      "<variant>.<variant>.….<variant>", in `ids` order
      "blocked":  { "rows": [i…], "others": [i…], "othersOmitted": n },
      "sessions": { "<show>.<group>.<sort>.<agent or *>": { "rows": [i…], "groups": [i…], "agents": [i…], "machines": [i…], "total": n, "omitted": n } }
    }
  },
  "session":  { "<id>": { "<variant>": <PocketSessionAnswer> } },
  "turns":    { "<id>": { "<variant>": <PocketTurnsAnswer> } },
  "screen":   { "<id>": { "<variant>": { "answer": <PocketScreenAnswer>, "prompt": {row,column,style} | null, "note": {row,style} | null } } },
  "history":  { "<id>": <PocketScrollbackAnswer, rows [0, depth)> },
  "pageEnded": { "<id>": <PocketScrollbackAnswer, why ended> },
  "pageMoved": { "<id>": <PocketScrollbackAnswer, why moved> }
}
```

An answer's `at` is the composer's clock in the file; the reader replaces it (D4). A skeleton holds no `at`, no `asked` (the
reader writes the query it answers, which the writer proved equal), no `emptyLine` and no `ageNote` (the constants, which the
writer proved every answer carries).

#### 5.1.4 `--check`, and what it proves

1. Regenerated in memory, the file equals the committed bytes (or, without `--check`, the file is written).
2. **Every skeleton re-assembled by JavaScript's own dereference equals the shipping composer's answer**, field for field, every
   state and every query (1,980), with `at` set aside and `asked` equal to the query: the reader's assembly can only be
   dereference, and this proves the table it dereferences.
3. Every one of the 36 states and all 54 queries per state is present; every piece index is in range; every piece is used.
4. The screens: each prompt row's runs cover exactly `column` cells and hold nothing after them; each note row is empty; both
   rows inside the screen and distinct; each style an index of the screen's table; every live and `answered` screen at `depth`
   60 with one `space`, equal to its history's; every history 60 rows at `wrap` 80.
5. The deny list (§5.1.5), over the file's text with `\uXXXX` read back.
6. It prints `[p3333 sample] PASS: ios/Tortie/Sample/sample.json is what the shipping composer makes of the made-up world: 5
   sessions, 36 states, 1,980 list answers from <n> pieces, 11 sessions, 6 screens, 4 histories.` with its own numbers, and
   exits 0; any failure names its clause and exits 1.

#### 5.1.5 The deny list

Refused anywhere in the file, as regular expressions with word boundaries where a word: `/Users/`, `/home/`, `/private/`,
`/tmp`, `/var/`, `/Volumes/`, `~/`; `https?://`, `www\.`; an e-mail shape (`\w@\w+\.\w`); `gdc`, `gregce`, `Greg`,
`Ceccarelli`, `Ita Vero`, `itavero`, `Mac Pro`; `Opus`, `Sonnet`, `Haiku`, `GPT`, `gpt-`, `\bo[34](-mini)?\b`, `Gemini`,
`claude-[0-9a-z]`; `\$\d`, `\btokens?\b`, `\bcost\b`, `\bbilling\b`, `\busage\b`, `context left`; `\bbeta\b`,
`TestFlight`. The scan reads the whole file, main's own composed words included (the status titles, the End confirmation, the
absences' sentences, the age note, the empty line, Catch Me Up's outcome). A word the world builder needs and the list refuses
is changed in the world, never removed from the list; a hit inside a word MAIN composed is reported to the main session and
never worked around.

### 5.2 The reader — `ios/Tortie/Sample/*.swift` (builder **reader**)

Five files, Swift only; none names a Door/ type but those `Contract.swift` declares, `DoorFailure`, `WriteResult` and
`SentWrite` (az2).

#### 5.2.1 `SampleBook.swift` — the bundled file, decoded

`struct SampleBook` holds the file's parsed object (`[String: Any]`, read once, never mutated); it compiles under the project's `SWIFT_STRICT_CONCURRENCY = complete` with no new warning (an immutable parse may be `@unchecked Sendable` with that reason written beside it, or the world may keep the file's `Data` and parse it inside its own isolation; either is the reader builder's). `static func bundled() ->
SampleBook?` reads `Bundle.main.path(forResource: "sample", ofType: "json")` and `FileManager.default.contents(atPath:)` (never
`contentsOf:`, which rule z refuses) and `JSONSerialization.jsonObject(with:)`; nil when any of the three fails. Its readers
each ASSEMBLE one JSON object and decode it with `JSONDecoder` into the `Contract.swift` type, throwing `DoorFailure.malformed`
when the decoder refuses:

| Reader | Assembles | Decodes |
| --- | --- | --- |
| `blocked(state:at:)` | `{ rows: pieces.blockedRows[i…], others: …, othersOmitted, at, emptyLine, ageNote }` | `PocketBlockedAnswer` |
| `sessions(state:query:at:)` | `{ asked: the query's five words (`NSNull()` for no agent and for no machine), rows, groups, agents, machines, total, omitted, at, ageNote }`; a key the book does not hold throws `DoorFailure.refused` | `PocketSessionsAnswer` |
| `session(id:variant:at:)`, `turns(id:variant:at:)` | the answer with `at` replaced | `PocketSessionAnswer`, `PocketTurnsAnswer` |
| `screen(id:variant:at:)` | the answer with `at` replaced, and its `prompt` and `note` | `PocketScreenAnswer`, and `SampleEcho.Rows?` |
| `history(id:)`, `pageEnded(id:at:)`, `pageMoved(id:at:)` | the answer with `at` replaced | `PocketScrollbackAnswer` |

#### 5.2.2 `SampleWorld.swift` — the in-memory copy

`actor SampleWorld`, made from a `SampleBook` when the sample opens and dropped when it leaves. It holds each session's
variant (starting at the book's first), and per session the echo (§5.2.4) and a change counter that every change of that
session moves (a variant, an echo, a question id). Its members, named so that no rule's writer-call scanner reads them as the
writer's (rule ab counts `.end(… batch: …)`, rule ae `.choose(… question: …)` and `.say(… text: …)`):

- `blocked()`, `sessions(_:)`, `session(_:)`, `turns(_:to:)`: the book's, for the current state (`to` not nil answers an empty
  page, `PocketTurnsAnswer(sessionId:, turns: [], more: false, at:, note: nil)`: no sample conversation has an older page).
  An unknown id throws `DoorFailure.refused`.
- `endSession(_:)`: the variant becomes `ended` (an ended one stays ended); answers `done`.
- `pressOption(_:marker:)`: a `waiting` session whose offer lists the marker becomes `answered`, answering `done`; anything else
  answers `notTaken`.
- `picture(_:since:)`: the held read (D8).
- `typeKeys(_:_:)`: the echo (D7).
- `page(_:from:count:depth:wrap:)`: D9.

A `done` is `.answered(PocketWriteAnswer(verb:, write: <the session's id>, outcome: .done, reason: nil, sentence: nil))`, made
with the struct's memberwise initializer: the sample's writes carry no write id and nothing after `WriteResult.of` reads one.

#### 5.2.3 `SampleReader.swift`

- `struct SampleReader: DoorReading, DoorWriting` over one `SampleWorld`: `alerts` is `AlertsKept.nothing`; `facts` is
  `PairedFacts(name: "", address: "", fingerprint: "", pairedAt: 0, macSends: false)`, which nothing draws (Settings asks
  `inSample` first, D18); `writer` is `self`; the five reads go to the world; `end(_:batch:)` to `endSession`; `choose(…)` to
  `pressOption`; `say(…)` answers `SentWrite(result: .notTaken, write: nil)`; `screenDoor(_:)` answers a `SampleScreenDoor` for
  every sample id and nil for any other. `static func bundled() -> SampleReader?` is `SampleBook.bundled().map { … }`.
- `final class SampleScreenDoor: ScreenDoor` (`let world`, `let sessionId`): `read(since:)` is `picture`; `keys` is `typeKeys`;
  `scrollback` is `page`; `session()` is the world's `session`; `writes` is `true`; `close()` does nothing (the sample holds no
  connection; a held read ends by its task's cancellation, D8).
- `final class SampleChoices: SessionsChoicesStore` (D17): `SessionsWords.standard` at first, kept in memory.

#### 5.2.4 The echo (`SampleEcho`, in `SampleWorld.swift`)

Per session with prompt rows: the units typed (`[String]`, each one printable ASCII character or a two-character `^X`), whether
Return's line is drawn, the question id's count (from the book's `-1`) and a revision counter. `typeKeys(id, items)`:

- `.text(t)`: each scalar of `t` in U+0020 to U+007E becomes one unit, while the prompt row has cells left (`cols − column`
  less the units' cells); any other scalar is not echoed.
- `.key(name)`: `C-a` to `C-z` append `^` and the letter in capitals, as one two-cell unit; `BSpace` removes the last unit;
  `Enter` empties the units and draws Return's line; every other name draws nothing.
- Every write (any items, a waiting screen's included) moves the question id to `<prefix>-<n+1>` and the revision, and answers
  `done`.

The picture: the book's screen for the current variant, its prompt row the book's runs then ONE run of the units' text in
`prompt.style`, the cursor at `(column + cells, prompt.row)`; while Return's line is drawn, the note row ONE run of
`Copy.sampleNothingRan` in `note.style`, cut to the screen's width; the `turn` the current id; the revision 12 lowercase hex of
the counter (the book's own revision while nothing was typed). It is built with the memberwise initializers of `PocketScreen` and
`PocketScreenRun` and handed out ONLY when `PocketScreen.holdsTogether(...)` (`Contract.swift:1259`) holds; otherwise the
book's picture is. Every sum and difference on a cell count goes through `DoorNumber.sum` and `DoorNumber.difference` (rule k).
A `waiting` screen (no prompt) draws no unit. A change of variant (a press, an End) clears the echo, and the picture is the
new variant's book picture, under its book revision, until something is typed on it. An `ended` variant answers the book's
`ended` absence.

`picture(id, since:)`: answers now when `since` is nil or not the current revision; else waits, in 100 ms sleeps, until the
session's change counter moves (then answers the new picture or absence) or 10 s pass (then answers `unchanged`, the current
revision, no screen, no absence). A cancelled task throws `CancellationError` at once.

`page(id, from:, count:, depth:, wrap:)`: an `ended` variant answers `pageEnded`; a `depth` other than the history's, a `wrap`
other than its width, `count < 1` or `from + count > depth` answers `pageMoved`; else the history's rows `[from, from + count)`
under its whole style table, with the ask's `from`, `depth` and `wrap` and the history's `space`, handed out only when
`PocketScrollbackAnswer.holdsTogether(...)` (`Contract.swift:1412`) holds, else `pageMoved`.

#### 5.2.5 `SampleOwnerCheck.swift` (D11, D12)

`struct SampleOwnerCheck: OwnerCheck { let inner: any OwnerCheck }`: `kind()` answers `.unasked` when `inner.kind()` is
`.none`, else `inner.kind()`; `confirm(reason:)` answers `.confirmed` when `inner.kind()` is `.none` (asking nothing), else
`await inner.confirm(reason:)`. It imports no LocalAuthentication and names no `LAContext` or `evaluatePolicy` (rule ac).

#### 5.2.6 `SampleBar.swift` (D14)

`struct SampleBar: View { let leave: () -> Void }`: one row, at least 44 points tall, on `Tokens.bgSidebar` with a hairline
under it: `Words(Copy.sample, .small, Tokens.textSecondary)` identified `sample-label` at the gutter, then a `Button` of
`Words(Copy.leaveSample, .small, Tokens.accent)` identified `sample-leave` at the trailing gutter, its hit area at least 44
points. The container is `sample-bar` (`.accessibilityElement(children: .contain)`).

### 5.3 The app — `ios/Tortie/App/TortieApp.swift` (builder **app**)

- `enum Root` gains `case sample`; `var inSample: Bool { root == .sample }`; `private var sampleFrom: Root?`.
- `makeLists(_ reader:, store: any SessionsChoicesStore)`; every existing call passes `choices`.
- `func openSample()`: does nothing when `root == .sample` or when `SampleReader.bundled()` answers nil (the button stays, and
  `SampleBookTests` proves the shipped book loads); else `sampleFrom = root`; `wentAway()`; `startOver()`; `reader =` the
  sample; `makeLists(sample, store: SampleChoices())`; `root = .sample`. It calls nothing of `door`. A camera that was
  scanning is ended by its view going (`QRScanner.dismantleUIView`, `PairingScreen.swift`).
- `func leaveSample()`: does nothing unless `root == .sample`; `wentAway()`; `startOver()`; `list = nil`, `sessions = nil`, `reader =
  nil`; when `sampleFrom == .reading` and `door.pairedReader()` answers a reader: `reader = it`, `makeLists(it, store: choices)`,
  `root = .reading`; when `sampleFrom == .reading` and it answers nil: `pairing.pairAgain()`, `root = .pairing`; else `root =
  .pairing` with nothing called. `sampleFrom = nil`. It names `door` exactly once, in that `pairedReader()`.
- `func endCheck(for reader: any DoorReading) -> any OwnerCheck`: `reader is SampleReader ? SampleOwnerCheck(inner:
  ownerCheck) : ownerCheck`. `destination(...)` hands `ownerCheck: app.endCheck(for: reader)` in all three routes;
  `endBatchSetup(_:)` builds its setup with `endCheck(for: reader)`.
- `lostPairing()`: `if root == .sample { leaveSample(); return }` first.
- `openFromAlert(_:)`: `if root == .sample { leaveSample() }` first; the rest as today.
- `cameToForeground`, `checkAlertAddress`, `readAlertPermission`, `unpair`: unchanged (each already guards on `.pairing` or
  `.reading`).
- `RootView`: `case .sample:` draws `VStack(spacing: 0) { SampleBar(leave: app.leaveSample); tabs(list:sessions:reader:) }`,
  the ONE `SampleBar(` in the app; `case .pairing:` hands `PairingScreen` `seeSample: { app.openSample() }`.
- The header comment gains one paragraph, "AND SINCE PHASE 333.3, SEE A SAMPLE", saying the four facts: made-up sessions from a
  file in the app, every page says Sample, nothing leaves the phone, Leave sample returns to where it was pressed.

### 5.4 Pairing and Settings — `Screens/PairingScreen.swift`, `Screens/SettingsScreen.swift` (builder **app**)

- `PairingScreen.init(model:site:seeSample:)`, `seeSample: @escaping () -> Void = {}`; a `seeSampleButton` (`Words(Copy.seeSample,
  .body, Tokens.accent)`, full width, centred, 44 points tall, `buttonStyle(.plain)`, `pairing-see-sample`), drawn when
  `!model.busy`: at rest directly under `scanButton` (8 points between), and after Scan code directly under the camera's line
  (`pairing-point`). The resting face is otherwise 333.1's. The header comment names it.
- `SettingsScreen`: `SettingsDrawing(facts: app.inSample ? nil : app.reader?.facts, …)`; `unpairRow` drawn only when
  `!app.inSample`; a `seeSampleRow` (a card row like Unpair's, `Words(Copy.seeSample, .body, Tokens.textPrimary)` and the
  chevron, `settings-see-sample`, its action `app.openSample()`) drawn only when `app.root == .reading`, directly under
  Unpair's row and its line. About is unchanged in both.

### 5.5 End with no passcode — `App/OwnerCheck.swift`, `Screens/EndBar.swift` (builder **app**)

- `OwnerKind` gains `/// No passcode is set, and the writer is the sample's: nothing is asked, the sample's copy ends, and End's
  line says so. Only SampleOwnerCheck answers it.` `case unasked`. `DeviceOwnerCheck` is unchanged and never answers it.
- `EndBarDrawing.glyph`: `.unasked` is `"lock.open"`; the others as today. Its line: `said ?? (kind == .none ?
  Copy.endNeedsPasscode : kind == .unasked ? Copy.sampleEndUnasked : nil)`. `let on = kind != .none && phase == .idle` is
  unchanged, so `.unasked` draws End on.
- `EndModel`, `EndRunner` and `EndBatchModel` do not change: every run stays in the `.confirmed` case of a switch on `confirm(`.

### 5.6 Words, identifiers, the project (builder **app**)

**`Style/Copy.swift`**, a new `// MARK: - See a sample (Phase 333.3)` block, each word one line `static let` with its owner:

| Name | Value | Owner line |
| --- | --- | --- |
| `seeSample` | `See a sample` | `/// Phone: made-up sessions inside the app, before or without a Mac (research 136 §8; research 140 §8 row 4). No Mac surface has a sample.` |
| `sample` | `Sample` | `/// Phone: said at the top of every page while the sample is open, so nothing in it reads as the person's own Mac.` |
| `leaveSample` | `Leave sample` | `/// Phone: back to where See a sample was pressed, Pairing or the paired Mac's lists.` |
| `sampleNothingRan` | `Nothing ran: this is a sample.` | `/// Phone: what Return draws on a sample's terminal in place of any answer, because nothing runs on the phone (guideline 2.5.2).` |
| `sampleEndUnasked` | `No passcode is set, so the sample ends without asking.` | `/// Phone: End's line in the sample on an iPhone with no passcode, where a paired Mac's End is off.` |

Every value passes av6 (no beta, TestFlight, remote desktop, mirror, stream or SSH). `sampleNothingRan` is ASCII (it is drawn
as one terminal run of one cell per character).

**`Screens/Identifiers.swift`**: `pairingSeeSample = "pairing-see-sample"`, `settingsSeeSample = "settings-see-sample"`,
`sampleBar = "sample-bar"`, `sampleLabel = "sample-label"`, `sampleLeave = "sample-leave"`, each beside its kin, and the header's
table names them.

**`Screens/DoorWords.swift:52-56`**: the comment's "See a Sample until Phase 333.3 answers one" becomes "since Phase 333.3 See a
sample answers one, over its own made-up screens".

### 5.7 The mocks — `docs/design/phone/` (builder **gates**)

- `Pairing.html`: under Scan code, `margin: 8px 16px 0`, a 44-pixel row of `See a sample` in the accent, centred, no fill; the
  comment says Phase 333.3.
- NEW `Sample.html`: the Needs input tab inside the sample: the Sample bar at the top (`Sample`, `Leave sample`), then
  `NeedsInput.html`'s title, rows and tab bar with the sample's two waiting sessions, their status title and ages as
  `sample.json`'s blocked answer for the start state draws them.
- `index.html`: a figure framing `Sample.html` ("11 · See a sample": made-up sessions, every page marked Sample, nothing leaves
  the phone, Leave sample returns), and "Twenty-one screens" becomes "Twenty-two".

### 5.8 Build 10, and every pin of it

| File | Today | At HEAD | Builder |
| --- | --- | --- | --- |
| `ios/Tortie.xcodeproj/project.pbxproj` | six `CURRENT_PROJECT_VERSION = 9;` | six `= 10;` | app |
| `ios/TortieTests/SettingsTests.swift:174-185` | `1.0.0 (9)` and its comment | `1.0.0 (10)`, the comment naming 333.3 | app |
| `build/conformance-ios.mjs:2993` and its comment | `PHONE_BUILD = '9'`; the "not uploaded" fixtures `10` (`:7391-7393`); the (s) header lines | `'10'`; fixtures `11`; a header line "(s) the build is 10 since Phase 333.3" | gates |
| `build/p316/ablation-ios.mjs` `s8`, `s11`, `s12` (`:1328`, `:1673`, `:3540`) and the header | 9 → 10, 9 → 8 | 10 → 11, 10 → 9 (s11: "Release left at build 9, 337.3's"), 10 → 9 (s12) | gates |
| `build/p316/probe-p316.mjs:760` (SE4's comment) | `1.0.0 (9)` | `1.0.0 (10)` (`PHONE_VERSION` reads the project) | probes |
| `build/p333/CHECKLIST.md`, `build/p333/STORE-CHECKLIST.md` | build 8 and 9 | §10 | integrator |

---

## 6. The gates, clause by clause

### 6.1 `conformance:ios` (`build/conformance-ios.mjs`, builder **gates**)

**NEW (az) SEE A SAMPLE NEVER REACHES THE NETWORK OR THE KEYCHAIN** (`ruleSample(files)`, pure over the app's Swift files, and
the writer's check), recorded beside (aw) to (ay) and pushed onto `RULE_IDS` the same way (`:13580`):

- **az1** `ios/Tortie/Sample/` exists and holds `sample.json` and Swift files; every Swift file there is read by every clause
  below (derived, with a floor of 5).
- **az2** No Swift file under `Sample/` names a type Door/ declares (derived from `Door/*.swift`'s top-level declarations) other
  than those `Door/Contract.swift` declares and `DoorFailure`, `WriteResult` and `SentWrite`; nor `PairedReader`,
  `PairedScreenDoor`, `LiveDoor` or `PhoneDoor`. So `DoorClient`, `DoorLine`, `DoorTransport`, `PairingStore`, `PairedDoor`,
  `KeychainSecretStore`, `KeychainClientKeys`, `InstallMark`, `PhoneKeys`, `ClientKeys`, `PairingOffer`, `PairingFlow`,
  `PendingPairing`, `RequestSigner` and `WriteId` are each refused by name.
- **az3** No Swift file under `Sample/` names a network type (`NETWORK_TOKENS`, `URL_LOADING`, `import Network`), a Keychain or
  Security call (`\bSecItem\w*`, `\bSecKey\w*`, `\bkSec\w*`, `SecRandomCopyBytes`, `SecTrust\w*`, `SecCertificate\w*`,
  `SecIdentity\w*`, `import Security`, `import CryptoKit`), `LocalAuthentication` or `LAContext`, `UserDefaults`,
  `NSUbiquitousKeyValueStore`, `UNUserNotificationCenter`, a badge (`applicationIconBadgeNumber`, `setBadgeCount`), a way out
  (`openURL`, `UIApplication.shared.open`, `Link(`, `URL(string:`), or a file write (`write(to:`, `createFile(`,
  `createDirectory(`, `removeItem(`).
- **az4** The one file read: `Bundle.main.path(forResource: "sample", ofType: "json")` once and `FileManager.default.contents(atPath:`
  once, both in `SampleBook.bundled()`; no `contentsOf:` and no other `forResource:` under `Sample/`.
- **az5** `SampleReader(` and `SampleReader.bundled(` are called, in the app outside `Sample/` (tests are not read), only in `AppModel.openSample()`; `SampleBar(` once
  in the app, inside `RootView`'s `case .sample`; `openSample()` names no `door`; `leaveSample()` names `door` exactly once, in
  `door.pairedReader()`, inside a branch on `sampleFrom == .reading`; neither names `forget(` or `unpair(`.
- **az6** `lostPairing()` and `openFromAlert(` each call `leaveSample()` under a test of `root == .sample` before anything else.
- **az7** `build/p3333/sample.mjs --check` exits 0 over the ROOT's own sources (spawned as (j) spawns `vectors.mjs`, 120 s).
- Each clause proves its scanner on texts it holds first, red and green, as every rule here does.

**WIDENED (ac)** (`ruleOwnerCheck`, `:5092`): the conformers are exactly `DeviceOwnerCheck` and `SampleOwnerCheck`, the second
declared in `Sample/SampleOwnerCheck.swift` and constructed once, in `AppModel.endCheck(for:)`, under `is SampleReader`; its
`confirm` answers `.confirmed` only inside a test of `inner.kind() == .none` and otherwise returns `await inner.confirm(reason:`;
`OwnerKind`'s `unasked` is answered by `SampleOwnerCheck` alone (`DeviceOwnerCheck.kind()` names no `.unasked`); and no file
names `ownerCheck:` as `app.ownerCheck` where a route is made (`TortieApp.swift` hands `endCheck(for:`).

**WIDENED (s)**: `PHONE_BUILD` 10, its "not uploaded" fixtures 11.

**Unchanged, and each must stay green on the new files**: (ab) and (ae) keep their counts of one writer `end(`, `choose(` and
`say(` (the world's members are `endSession`, `pressOption`); (b) (the bar draws Copy words; nothing hides the tab bar); (c)
(the sample names no network type); (k) (every arithmetic in `Sample/` through `DoorNumber`, no new `ARITHMETIC_NAMED` entry);
(aa) (`UserDefaults` in `SessionsChoices.swift` alone); (at) (the Terminal exactly when `screen` and a door); (o) (the sample
names no required-reason API); (z) (no `contentsOf:`).

### 6.2 `ablation:p316` (`build/p316/ablation-ios.mjs`, builder **gates**)

Appended at the end of `ARMS`, each `{ id, rule, what, file, edit }`, each red on the rule that owns it at the clone and green at
the base:

| id | rule | The plant |
| --- | --- | --- |
| az1 | az | `let _ = DoorClient.self` appended to `Sample/SampleReader.swift` |
| az2 | az, c | `import Network` and `let _ = NWConnection.self` in `Sample/SampleWorld.swift` |
| az3 | az | `_ = SecItemCopyMatching([:] as CFDictionary, nil)` in `Sample/SampleBook.swift` |
| az4 | az | `let _ = PairingStore.self` (a Keys type) in `Sample/SampleReader.swift` |
| az5 | az | `let _ = try? PairingOffer.parse("")` in `Sample/SampleReader.swift` |
| az6 | az | `UserDefaults.standard.set(1, forKey: "x")` in `SampleChoices.save` |
| az7 | az | `_ = try? Data(contentsOf: URL(fileURLWithPath: "/"))` in `SampleBook.bundled()` |
| az8 | az | `SampleReader.bundled()` called from `LiveDoor.pairedReader()` |
| az9 | az | `door.forget()` added to `openSample()` |
| az10 | az | `leaveSample()`'s `pairedReader()` branch made unconditional |
| az11 | az | the `leaveSample()` call taken out of `openFromAlert(` |
| az12 | az | one byte of `sample.json` changed (a session name's letter): `--check` red |
| az13 | az | a second `SampleBar(` drawn in `case .reading` |
| az14 | ac | `SampleOwnerCheck.confirm` answering `.confirmed` with the `.none` test taken out |
| az15 | ac | `endCheck(for:)` answering `SampleOwnerCheck` for every reader |
| az16 | ac | `DeviceOwnerCheck.kind()` answering `.unasked` for `passcodeNotSet` |

`s8`, `s11` and `s12` move to build 10 (§5.8): Release a build ahead (11), Release left at 9 (337.3's), Debug left at 9. The header gains one paragraph for Phase 333.3. The count printed moves by 16.

### 6.3 `conformance:phonecopy` (`build/p311/copy-drift.mjs`, builder **gates**)

- Three owned rules, `module: PHONE_COPY`: `See a sample` (`static let seeSample = "See a sample"`, drawn by `Pairing.html`),
  `Sample` and `Leave sample` (drawn by `Sample.html`).
- One data rule, declared before the name rule, whose `is` list is read from `ios/Tortie/Sample/sample.json`'s session names and
  project labels: "a made-up session of See a sample, ios/Tortie/Sample/sample.json, data as any session's name is".
- `OWNED_RULE_FLOOR` 103 → **106**, its comment naming the three.
- Two `--self-test` mutations, each red: `Leave sample` renamed in `Sample.html`; `seeSample`'s value changed by one letter in
  `Copy.swift`.
- `sampleNothingRan` and `sampleEndUnasked` are the phone's own words with a reason and no mock draws them; the phone-words
  reader counts them (`PHONE_MAC_FLOOR` 80 and `PHONE_NAMES_FLOOR` 9 do not move).

### 6.4 What does not move

`conformance:pocket` and its hostile client, `gate:contract` (no contract line), `vectors.mjs --check`, the frozen set
(`build/assert-door-only-adds.mjs`), `HELPER_USER_FLOOR` and `SIMULATOR_USER_FLOOR` (no new script reaches either helper), and
every Mac gate. `git diff e1e17899 -- src/ docs/audits/contract-baseline.txt` is empty.

---

## 7. The proof, run rather than read

### 7.1 The battery (the integrator, then the committer)

The integrator runs everything that starts no Electron and boots no Simulator: `npm run typecheck`, `npm run build` (which
runs `conformance:ios`, (az7) included), `npm test`, `node build/p3333/sample.mjs --check`, `npm run -s ablation:p316` (every
arm, the 16 new ones red on their rules), `npm run -s conformance:phonecopy`, `npm run -s gate:contract`, `node
build/p316/probe-p316.mjs --grader-self-test` and `node build/p316/test-ios.mjs --self-test`. The verifier, under the lock,
runs `npm run smoke:t1` (the commit minimum, which starts Electron), `smoke`, `smoke:t3` and `package` once, `test:ios` in
Debug and Release on 26.3 and 18.3, and the probe group; the committer re-runs `typecheck`, `build` and `smoke:t1` before the
commit.

### 7.2 XCTest (builders **reader** and **app**; run by the verifier through `test:ios`)

- `SampleBookTests` (reader): the bundled book loads; for every one of the 36 states, `blocked` decodes and `ListDrawing` accepts
  it, and all 54 `sessions` decode, their `asked` answers the query and `SessionsDrawing` accepts them (`SessionsScreen.swift`'s
  own checks); every session, turns, screen, history and absence decodes; the screens' prompt and note rows are where the book
  says.
- `SampleReaderTests` (reader): the state machine (a press on each waiting session; End on every variant; End these over three);
  a press on a session that is not waiting answers `notTaken`; `say` answers `notTaken` with no write id; the echo (text, a
  character outside printable ASCII not echoed, Ctrl-C as `^C`, Backspace over `^C` and over a letter, Return's line, a full
  prompt row dropping further text, every write moving the question id and the revision, a waiting screen drawing nothing);
  every echoed picture passes `PocketScreen.holdsTogether`; the held read (answers at once for a stale `since`, wakes on a change
  within 200 ms, answers `unchanged` after its hold with the clock injected, ends on cancellation within 100 ms); a page sliced
  for `[0, 60)`, `[20, 60)` and `[59, 60)`, `moved` for another depth or width, `ended` after End; `at` is the injected clock.
- `SampleOwnerCheckTests` (reader): with a fake inner check, `.none` answers `.unasked` and confirms with the inner `confirm`
  called 0 times; `.faceID`, `.touchID` and `.passcode` pass through, and `confirm` calls the inner once.
- `SampleAppTests` (app), over a recording fake `PhoneDoor` whose reader records every member it is asked: from Pairing,
  `openSample()` and `leaveSample()` call nothing of the door (0 `pairedReader`, `begin`, `pair`, `forget`, `unpair`) and leave
  `PairingModel`'s line and state as they were; from the paired lists, the fake reader records 0 calls between `openSample()` and
  `leaveSample()` while the sample's list, Sessions, a session, its turns, its screen, a keys write, a press and an End are
  driven through the app's own reader, and `leaveSample()` calls `pairedReader()` once and lands on `.reading` with that reader;
  `cameToForeground()` in the sample calls nothing of the door; `openFromAlert(.session(id))` in the sample leaves it and routes
  as today; `lostPairing()` in the sample leaves it; `endCheck(for:)` answers `SampleOwnerCheck` for the sample's reader alone;
  the Sessions model in the sample saves into `SampleChoices` and the app's `choices` records 0 saves; `SettingsDrawing` in the
  sample has no facts.
- `EndWordsTests`/`EndTests` (app), where `.unasked` moves them: End on with `lock.open` and `Copy.sampleEndUnasked`.
- `SettingsTests` (app): `1.0.0 (10)`; in the sample, no Unpair and no See a sample row; paired, the See a sample row under
  Unpair.
- `CopyTests` (app), where it enumerates the words: the five new ones.

### 7.3 The stand-ins

No new stand-in. The probe's relay (`relay.count()`, `probe-p316.mjs:8784-8786`) counts every connection the app opens toward the
door; the Mac's door is published through `build/p330/tailscale-standin.mjs`, DNS is `build/p332/dns-standin.mjs` in the probe's
own process, and Apple's is Phase 314's, all as today.

### 7.4 `probe:p316`, arm group `sample` (builder **probes**; driven by the verifier)

**The drive** (`P316DriveUITests.swift`) gains, at the end of its step list, `sample-see` (press `pairing-see-sample`, wait for
`sample-bar`, print `{"step":"sample-open"}` and a dump `sample-open`), `sample-see-settings` (the Settings tab, then
`settings-see-sample`, the same), `sample-leave` (press `sample-leave`, wait for `screen-pairing` or `screen-needs-input`, print
`{"step":"sample-left"}` and a dump `sample-left`), and `sample-inventory:<tag>` (every element's id, label and frame on screen,
as `setupInventory` does). Every other reading reuses today's steps (`open:`, `screen-open`, `screen-type:`, `screen-key:`,
`screen-ctrl:`, `screen-rotate`, `reply-press:`, `toCatchUp(for:)`, `end`, `select:`, `end-these`, `batch-done`, `show:`,
`menu:`, `sessions-dump`, `idle:`); each dump taken between `sample-open` and `sample-left` also prints whether `sample-label`
is in it. The drive asserts nothing.

**The probe** reads the committed `ios/Tortie/Sample/sample.json` for every expected word (each row's text is its runs' text
joined; a session's name, options, first turn, history row 0 and End confirmation from the book) and `Copy.swift` for the
phone's; it never spells a sample word itself. `sample` joins the default `ARMS` list (`:922`) and the floor's condition (`:932`).
The arms:

| Arm | Runtime | What is read, and graded |
| --- | --- | --- |
| SA1 | 26.3, fresh | No code, `-TortieDebugForgetPairing`: `pairing-see-sample` reads `Copy.seeSample`, is a button at least 44 points tall, directly below `pairing-scan-code`; after Scan code, below `pairing-point` |
| SA2 | 26.3 | `sample-see`: `sample-bar` at the top, `sample-label` `Sample`, `sample-leave` `Leave sample` at least 44 points; the Needs input tab's rows are the start state's waiting sessions, by name, in the book's order |
| SA3 | 26.3 | `sample-label` in EVERY dump between `sample-open` and `sample-left`: Needs input, Sessions, Settings, a Terminal upright and sideways, Catch Me Up; its frame above every other element's and overlapping none; sideways, the grid's top at or below the bar's bottom |
| SA4 | 26.3 | Claude Code's waiting session opens on its Terminal: each `screen-row-<n>` label equals the book's live row; the tray's `session-choice-press-<n>` labels are its options; `reply-press:0`: the tray goes, the status line reads the `answered` variant's status title, and Needs input no longer lists it |
| SA5 | 26.3 | Codex CLI's waiting session: the same, its command line drawn under the question |
| SA6 | 26.3 | The idle Codex session: `screen-type:` `ls -la` puts `ls -la` on the prompt row; `screen-key:return` empties it and the note row reads `Copy.sampleNothingRan`; `screen-ctrl:c` puts `^C` on the prompt; no `end-auth-up` at any key |
| SA7 | 26.3 | Scrolled to the top: `screen-history-0` reads the book's history row 0, and no `screen-scrollback-line` |
| SA8 | 26.3 | ⋯ then Catch Me Up: the conversation paged to its first turn, every turn's ask equal to the book's |
| SA9 | 26.3 | End on the working session: the dialog is the book's `endConfirm` word for word; `end-auth-up`, the probe's `handle.biometry('match')`; the status line reads the ended variant's title and `screen-failure` main's ended sentence |
| SA10 | 26.3 | Sessions: two project headers, the book's labels; Show All, Active and Ended, Group by None and Sort by Name each drawn in the book's order for the state now; the agent filter narrows to one agent |
| SA11 | 26.3 | Select every row End these offers (the three still live after SA4, SA5 and SA9), `End selected sessions…`, `End 3 sessions`, Face ID match: the done heading counts three of three, and Show Ended lists all five |
| SA12 | 26.3 | Settings in the sample: no `settings-mac`, no `settings-unpair`, no `settings-see-sample`; `settings-about` present |
| SA13 | 26.3 | `sample-leave`: `screen-pairing`, its `pairing-line` the line it drew before `sample-see` |
| SAX | 26.3 | THE ATTACK: the relay's count is 0 from the launch to the end of SA1 to SA13, with the door published and listening the whole time |
| SB | 18.3, fresh | The floor: SA1, SA2, SA4, SA6, SA9 and SA13, and SAX over them |
| SC1 | 26.3, paired | Paired with the real Mac through the relay: the list draws the Mac's sessions; `sample-see-settings`; no dump inside the sample holds any of the Mac's session names |
| SC2 | 26.3 | A Terminal on one of the Mac's sessions is left open on the Needs input tab, so its poll is live, and then Settings, See a sample: the relay's count does not move from `sample-open` to `sample-left`, across `idle:20`, Home and back (the foreground return), a Terminal opened in the sample and a keys write there |
| SC3 | 26.3 | `sample-leave`: `screen-needs-input` with the Mac's sessions; the relay's count moves within 15 s; Settings' fingerprint and address read as before the sample |
| SD | 26.3 | `handle.biometry('unenrol')` first; what iOS answers is printed; when it is `passcodeNotSet`, the sample's ⋯ End reads on with `lock.open` and its line `Copy.sampleEndUnasked`, and its press ends the session with no `end-auth-up`; when iOS answers the passcode instead, the arm is UNREADABLE (an unmet premise, never a pass), and `SampleOwnerCheckTests` carries the logic |
| SP | 26.3 | With `P3333_PARENT_IOS` (`git archive e1e17899 ios \| tar -x` into scratch), the parent's own app and drive: its pairing screen has no label holding "sample", and the relay counts 0 over `idle:20` |
| SE1 | 26.3 | 333.1's arm, widened: exactly one label holds "sample", `pairing-see-sample`'s, below Scan code (`SETUP_NEVER` becomes "any OTHER label holding sample") |

`--grader-self-test` proves every grader on fixtures written beside it: each passing reading, and each clause red on its own
break (a missing bar on one page, a row that is not the book's, a relay that counted one, a sample dump holding a paired
session's name, Leave sample landing on the wrong root, End with `end-auth-up` on SD, the parent drawing "sample"). Budget: not
measured; estimate 20 to 30 minutes for the group on two runtimes beside the setup group's Electron. Verifiers only, under the
lock.

### 7.5 `test:ios` (`build/p316/test-ios.mjs`, builder **probes**)

Its preflight runs `node build/p3333/sample.mjs --check` after the vectors' and refuses, exit 1, before anything boots, on a
stale sample. `builtAppProblems(app)` adds one read: the app's `sample.json` is present and its sha256 equals the committed
file's, a problem line naming the difference otherwise. `PASS_WORDS` do not change (his checklist quotes them).

### 7.6 The independent methods, and the parent

- **The attack (method: attack, do not confirm).** SAX and SC2 count the relay; `SampleAppTests` drives the sample through a
  door that records; the 16 arms plant each refused name. The verifier ALSO plants one shape no arm names and reads whether
  (az) or the counts catch it: for example a `SampleReader` that captures the paired reader through a closure handed from
  `AppModel`, or a Swift file under `Sample/` that reaches the Keychain through a type alias.
- **Re-derive.** The verifier composes one state's `/v1/sessions` answer (for example `waiting.answered.ended.live.ended`,
  `all.project.recent.*`) by hand from the made-up world and main's rules, compares it with the book's assembled answer and the
  drawn rows, and names any difference.
- **The parent (mandatory, the entry's own).** SP: build 9's pairing screen draws no sample and opens no connection.

### 7.7 What the verifier must produce

A typed verdict (`verdict`, `evidence`, `problems`) naming its independent step; every arm's reading; the battery's exit codes;
the device and Electron counts at the end; the history stats before and after.

### 7.8 No regression against today

| Scenario | Today (build 9) | At HEAD | Worse? |
| --- | --- | --- | --- |
| A stranger at the first screen | title, three steps, Scan code, the foot | the same, and See a sample under Scan code | no: one more press, the foot below it in the same scroll view |
| A paired phone | lists, Terminal, Catch Me Up, End, Settings | the same; Settings gains one row under Unpair | no |
| End on a paired Mac's session | `DeviceOwnerCheck` | `endCheck(for:)` answers `DeviceOwnerCheck` for every reader that is not the sample's | no (az15 and az16 are the attack) |
| An iPhone with no passcode, paired | End off with its line | the same | no |
| An alert tapped | opens the session | the same; from inside the sample, the sample is left first | no |
| The Sessions tab's three words | kept in `UserDefaults` | the same; the sample never writes them | no |
| The app's size | build 9 | about 0.4 MB more (the book) | no person-visible cost |

---

## 8. The CHANGELOG item (the integrator)

There is no `## Unreleased` section at this base (`CHANGELOG.md:7` is `## 0.111.0`, drafted and not published). The integrator
adds `## Unreleased` above it with `### Added`, or appends under one if Phase 344's integrator made it first:

`- Tortie for iPhone now has See a sample, on its first screen and in Settings: made-up Claude Code and Codex sessions you can open, scroll back, type into, answer and end before you pair a Mac, with every page marked Sample and nothing leaving the phone. What you type there only appears on the sample's own prompt, and Leave sample takes you back`

No commit link in the phase commit (a commit cannot name its own hash); the follow-up docs commit adds it.

---

## 9. CLAUDE.md (the integrator)

Two sentences, nothing more:

- In the gates table's `ios/**` row (`conformance:ios`), after its Phase 337.1 sentences: "**Phase 333.3's (az)**: nothing under
  `ios/Tortie/Sample/` names a Door/ type beyond the contract's decoders and the write results, a network or Keychain call, a
  way out or a file write, the sample is opened and left only by `AppModel` with the paired reads stopped, and
  `build/p3333/sample.mjs --check` holds the bundled `sample.json` to the shipping composer, so a change to what the door composes
  regenerates the sample in the same commit." Add `build/p3333/**` to that row's paths.
- In the probes table's `probe:p316` row: "Since Phase 333.3 `P316_ARMS=sample` drives See a sample fresh on 26.3 and the 18.3
  floor and from a paired phone, every page's Sample bar, the echo, a press, End with and without a passcode, and Leave sample,
  with the relay counting zero connections inside the sample, and `P3333_PARENT_IOS` reads build 9's pairing screen."

---

## 10. The checklists and the reviewer route (the integrator)

**The route a reviewer takes**, in the labels the app draws (quoted for the review notes): **See a sample** (the first screen,
under Scan code) → the **Needs input** tab → a waiting session (`fix-login-redirect`) → its terminal: pinch, scroll up, turn the
phone sideways, tap the terminal to type, **Return** → an option under the question (**1**) → **More** (the ⋯ at the top right)
→ **Catch Me Up** → back → **More** → **End session…** → **End session** → Face ID, Touch ID or the passcode → **Sessions** →
**Select** → rows → **End selected sessions…** → **End n sessions** → **Leave sample** (at the top).

**`build/p333/CHECKLIST.md`**:

- Text C, HOW TO REVIEW IT, after the two videos, this paragraph (ASCII; about 560 characters, so the notes stay under 4,000 when
  filled; the integrator recounts and writes the counts in the heading):

  `Without a Mac, tap See a sample on the first screen. Made-up sessions load from a file inside the app; every page says Sample at the top, and nothing leaves the phone. Tap a session under Needs input; it opens on its terminal. Pinch, scroll up, turn the phone sideways, and tap the terminal to type: keys appear on the sample's prompt, and Return shows that nothing ran. Tap an option under a waiting session, then the More button at the top right for Catch Me Up and End session, which asks for Face ID, Touch ID or the passcode and ends only the sample's copy. Tap Leave sample to return.`
- Text A gains, at its end, research 140's bracket: `Before you pair, open See a sample to look around.`
- A text B for build 10, its first sentence `Before you pair, tap See a sample to look around.`, then build 8's text.
- `:160`'s "None says ... 'sample'" becomes "none says 'beta', 'TestFlight', 'remote desktop', 'mirror', 'stream' or 'SSH', and
  only texts A, B and C name See a sample".
- `:221-222` ("Build 9 brings See a sample") and `:253` ("Not covered yet: See a sample") say build 10 carries it.

**`build/p333/STORE-CHECKLIST.md`**: item 2 of "Submit only when these are true" says build 10 carries See a sample; text 4
gains the same paragraph after its videos sentence, its heading's byte count recounted; the screenshots step (`:22`) says take
them in See a sample, now in build 10.

---

## 11. Builders, disjoint files, and who owns what is shared

Five builders in `/private/tmp/wt-p3333` at once, on `e1e17899`, each coding against the names §5 pins. No file is in two lists.
Builders run `node build/conformance-ios.mjs` (gates), `node build/p3333/sample.mjs --check` (world), and `xcodebuild
build-for-testing` with `-derivedDataPath /private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p3333/dd-<role>`
(deleted before returning) where Swift moves; they launch no Electron, boot no Simulator, run no probe and no whole `npm test`.

| Builder | Owns |
| --- | --- |
| **world** | NEW `build/p3333/sample.mjs`, NEW `build/p3333/world.mjs`, NEW `ios/Tortie/Sample/sample.json` |
| **reader** | NEW `ios/Tortie/Sample/{SampleBook,SampleWorld,SampleReader,SampleOwnerCheck,SampleBar}.swift`; NEW `ios/TortieTests/{SampleBookTests,SampleReaderTests,SampleOwnerCheckTests}.swift` |
| **app** | `ios/Tortie/App/TortieApp.swift`, `ios/Tortie/App/OwnerCheck.swift`, `ios/Tortie/Screens/{EndBar,PairingScreen,SettingsScreen,Identifiers,DoorWords}.swift`, `ios/Tortie/Style/Copy.swift`, `ios/Tortie.xcodeproj/project.pbxproj`; NEW `ios/TortieTests/SampleAppTests.swift`; `ios/TortieTests/{SettingsTests,EndWordsTests,EndTests,CopyTests}.swift` where §7.2 moves them |
| **gates** | `build/conformance-ios.mjs`, `build/p316/ablation-ios.mjs`, `build/p311/copy-drift.mjs`; `docs/design/phone/{Pairing,index}.html`, NEW `docs/design/phone/Sample.html` |
| **probes** | `ios/TortieUITests/P316DriveUITests.swift`, `build/p316/probe-p316.mjs`, `build/p316/test-ios.mjs` |

**Shared names and their one owner.** `sample.json`'s shape (§5.1.3) is **world**'s, and **reader** decodes it; until it exists,
**reader** codes against §5.1.3 and a fixture its own tests write. `SampleReader`, `SampleReader.bundled()`, `SampleChoices`,
`SampleOwnerCheck(inner:)`, `SampleBar(leave:)` and `OwnerKind.unasked`'s meaning are **reader**'s, and **app** codes against
them; `OwnerKind.unasked` itself is declared by **app** in `OwnerCheck.swift`. `Copy.seeSample`, `.sample`, `.leaveSample`,
`.sampleNothingRan`, `.sampleEndUnasked` and the five `ID.` names are **app**'s, who adds them first. The drive's four step names
(§7.4) are **probes**'; the mocks' words (§5.7) are pinned here, so **gates** draws them.

**The integrator** checks the base; reconciles the pinned names; runs §7.1 whole except what needs the lock or launches the app;
scans the delta for control, bidi, zero-width and BOM characters (the book is ASCII by construction) and for duplicated blocks
of ten lines or more; writes §8, §9 and §10; leaves `package.json` and `docs/audits/contract-baseline.txt` unmoved (no script
is added: the writer is run as `node build/p3333/sample.mjs`, as `vectors.mjs` is); appends "§As built — 333.3". **`docs/BACKLOG.md`
belongs to the main session.**

**The verifier** (one, under the lock, phone slot first): §7.4 to §7.7, typed, naming its independent step.

---

## 12. What this sends to other phases and the main session

- **333.4** (the devices App Review uses): pass 2 runs over this sample on an iPad in compatibility mode, iOS 27 and a Touch ID
  device; the Sample bar and the echo are new surfaces for its keyboard and VoiceOver rows.
- **333.8 and 333.9** (store frames, the listing): screenshots are taken in See a sample, from Settings on his own paired phone;
  the review notes' paragraph is §10's.
- **333.6's texts**: build 10's What to Test and text C's paragraph, §10.
- **318.1** (the message box under the terminal): the sample offers no message; when 318.1 lands, the sample's idle sessions may
  offer one, regenerated by the writer.
- **Any phase that moves what the door composes for a local session**: `node build/p3333/sample.mjs` in the same commit.
- **The TestFlight build**: build 10, his upload, at his word.

---

## 13. What is NOT in this phase

- **No hosted demo door**, no server and no network in the sample.
- **No hidden switch, no reviewer-only gesture and no DEBUG seam** for the sample: it is reached by the button anyone sees.
- **No real sessions in the sample, ever**: no real session, path from his machines, person's name, model name or billing line.
- **No sample on the Mac**, and no Mac change of any kind: no route, no contract line, no word, no menu.
- **No release**, no upload and no archive.
- **No message in the sample**: no session offers one.
- **No alert from the sample**, no question to iOS about alerts, no icon badge.
- **Nothing the sample does is kept**: no `UserDefaults`, no file, no Keychain item; Show, Group by and Sort by start fresh each
  time it opens.
- **No more agents than Claude Code and Codex CLI**, and no other agent's question pressed.
- **No markdown**: answers are drawn as written, as today (his ruling of 2026-10-02).
- **No new probe and no new stand-in**: the sample is driven inside `probe:p316`.

---

## 14. Open concerns handed to the verifier

1. **The bar above the tabs.** `VStack { SampleBar; TabView }` is not measured on iOS 26.3's glass tab bar or with 337.3's
   landscape `toolbarVisibility` and `statusBarHidden`. SA3 reads every frame; if the bar is cut or overlaps, the fallback is
   `.safeAreaInset(edge: .top)` on each tab's `NavigationStack`, a change in `TortieApp.swift` alone, with az5's one `SampleBar(`
   becoming one per tab and its ablation az13 moved with it.
2. **`passcodeNotSet` on a Simulator.** Phase 317 never learned whether a Simulator with Face ID unenrolled answers it
   (`build/p317/SPEC.md:1564`). SD is UNREADABLE when it does not; `SampleOwnerCheckTests` carries the logic either way.
3. **The probe's budget** is not measured; the group adds two fresh drives, a paired drive and a parent build.
4. **The book's size** (about 0.4 MB) and its decode on an iPhone 16 Pro: `SampleBook.bundled()` parses once at the press; if
   SA2 reads the bar later than a second after the press, the parse moves off the main actor.
5. **Phase 344**, if it lands first, may move a composed answer (§4); `--check` names it.
6. **An alert tapped inside the sample** is held by `SampleAppTests` and (az6), not driven: the paired drive's Simulator pairs
   with a Mac whose alerts are off, so iOS is never asked and no banner can show. A verifier who wants it live runs it from the
   `order` group's second drive, where the phone was asked.

---

## 15. What the spec step measured, how, and the numbers

| # | What | Command | Exit | Number |
| --- | --- | --- | --- | --- |
| M0 | His history, before the first command and after the last | `stat -f '%z %m' ~/.zsh_history ~/.bash_history` | 0 | `736064 1791579183`, `23166 1790702242`, unmoved |
| M1 | What precomposing the sample's lists costs, by the SHIPPING composer | a scratch `measure.mts` under the pinned tsx (`node node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.node.json …`): `createPocketRoutes` over five made-up sessions, every one of 36 states, `blocked()` and 54 `sessions()` each, `endOfferOf` on every row | 0 | 1,980 answers, 0 refused; 1,933,954 bytes whole; distinct pieces: 11 blocked rows (3,696 bytes), 40 sessions rows (8,290), 12 groups (1,550); skeletons about 162 KB; 0.38 s wall |
| M2 | The writer's modules import with no Electron | a scratch `imports.mts` under the pinned tsx | 0 | `getRegistryEntry('claude').displayName` "Claude Code", `('codex')` "Codex CLI"; `composeScreen`, `composePage`, `parseScreenDisplay`, `readingRevisionOf` are functions; `SCREEN_ENDED` "This session is not running, so it has no terminal.", `SCROLLBACK_MOVED` read; `buildProjectLine` is in `src/shared/overview-line.ts` |
| M3 | The `(j)` precedent's cost | `time node build/p316/vectors.mjs --check` | 0 | PASS, 0.48 s |
| M4 | Every door call a screen makes | `grep -rnoE "(door\|reader\|writer)\??\.(blocked\|session\|…)" ios/Tortie/Screens ios/Tortie/App` | 0 | the census of §2 row 2, 26 sites |
| M5 | Disk | `df -h /` | 0 | 70 GB free |

Nothing else ran: no `xcodebuild`, no Simulator, no Electron, no agent. The scratch scripts are under the role's scratch and are
not part of the delta.

---

## 16. Questions for him

None blocks the build. Two defaults, each stated: the sample's agents are Claude Code and Codex CLI only (his "at least" leaves
room for more in a later build); and the Needs input tab's badge counts the sample's own waiting sessions (D19), where reading
the entry's "no badge" as the tab's would make the sample's tab disagree with its own rows.

---

## §As built — 333.3

The integrator appended this section on 2026-10-10. It says what the five builders and the integrator did beyond §5 to §10's
letter, and what each command answered. Nothing was committed, staged or stashed; no Electron was launched; the three `test:ios`
runs below are the integrator's, each under a phone lock slot taken and released on the same command line.

**The base and the delta.** Built on `e1e17899`. While it was built, Phase 344 landed on origin/main (`f7d576bf`, then
`8f041ba3`): Mac only, under `src/main/manifest`, `src/main/sessions`, `src/main/machines`, `src/shared/types.ts` and
`build/p306`, none of them this phase's. **It moves nothing the sample composes**: `node build/p3333/sample.mjs --check` over a
scratch export of `8f041ba3` with this phase's `build/p3333/` and `sample.json` laid on it answered the same PASS line, so the
committed book stands after a rebase. 344 also touched one line of `CHANGELOG.md` under 0.111.0 and the `probe:p306` row of
`CLAUDE.md`; this phase's hunks there are the new `## Unreleased` above 0.111.0 and the `ios/**` and `probe:p316` rows, so the
two do not overlap. `git diff e1e17899 -- src/ docs/audits/contract-baseline.txt package.json` is empty (0 lines); all six
`CURRENT_PROJECT_VERSION` read 10 and none 9.

**world** (`build/p3333/world.mjs`, 874 lines; `build/p3333/sample.mjs`, 1,202 lines; `ios/Tortie/Sample/sample.json`, 332,121
bytes in 2,301 lines, ASCII, sha256 `a12e6fea…200b`), beyond §5.1's letter:
1. The space after Claude Code's `❯` and Codex CLI's `›` carries SGR 53 (overline). The shipping composer drops trailing blanks,
   so without it a prompt row would cover one cell where its `column` is 2; the composer keeps an overlined blank, and the
   phone's style has no overline, so it draws a plain space. Clause 4 fails by name if a prompt row covers anything but its
   column.
2. Each question and its options are exactly what the shipping `detectDialogRows` reads off the waiting screen (clause 4 checks
   it). The Codex command is `npm run migrate -- --plan`.
3. Turns: 4, 4, 4, 6 and 3, so each 60-line history is whole content, its row 0 the first ask.
4. A waiting session's `answered` screen sits under the same history and pane (one `space`); Codex's redraws its "Running" row
   as "Ran".
5. The offer's `mark` is the waiting screen's `dialog`, as §5.1.1 says, not main's `replyMarkOf`.
6. No resume fields on any session, so End's confirmation body is main's "scrollback is saved" sentence.
7. `history`, `pageEnded` and `pageMoved` exist for `sample-1` to `sample-4` only; `sample-5` answers `screen: false`, so it
   opens on Catch Me Up.
8. The deny list is §5.1.5's 33 patterns, the count pinned; its six lowercase words are matched case-insensitively.
9. Checks beyond §5.1.4: each per-session answer is identical in all 36 states; each reads back the reply, End, screen flag and
   turn count the world chose; the constants equal `POCKET_AGE_HONESTY` and `NOTHING_NEEDS_YOU`; no screen or history row
   draws an absolute path; nothing is cut at a screen's edge; the cursor sits at the prompt; only waiting screens read as a
   question. Every check is proved red on a copy it breaks (74 breaks, run by `--check` itself), and taking any check out of the
   run turns `--check` red (13 arms in the builder's scratch harness).

**reader** (`ios/Tortie/Sample/{SampleBook,SampleWorld,SampleReader,SampleOwnerCheck,SampleBar}.swift`, three test files):
no bare arithmetic (sums and differences through `DoorNumber`, the hold's deadline by `Double.advanced(by:)`); a typed
revision is the session's write counter as 12 lowercase hex, never reset, so a revision the phone held is never handed out
again; an echoed picture that would not hold together hands out the book's picture under the current revision, so a held read
cannot spin; two guards (`count >= 1` in `page`, the ended check in `typeKeys`) were left out because the contract's own
checks already refuse those cases, said in a comment. 53 of 53 tests passed on the builder's macOS harness before the
integrator's Simulator runs below; 54 one-clause mutations, all but those two guards red.

**app**: one addition beyond §5.3, `leaveSample()` starting `checkAlertAddress()` when it lands on the paired lists, because the
new list would otherwise lose its "Pair again to get alerts." line until the next launch (it asks iOS, never the door, so the
door is still named once there); `SampleBar(leave: { app.leaveSample() })` rather than a method reference, for the main actor;
`SettingsRows`, `pressSeeSample()` and an internal `drawing` so the unit tests reach the behaviour.

**gates**: az2's refused set is DERIVED from `Door/*.swift`'s top level (50 names, the SPEC's 15 among them, each named if it
goes), plus the paired reader's four, plus `AppModel`, `KeptSessionsWords` and `SystemPushAddressing`, plus any typealias in
the app that stands for a refused type (57 in all at HEAD, 0 aliases); az3 also refuses every `NW*` name, Core Foundation
sockets, any `URL(`, `UNNotification*`, `OpenURLAction`, `FileHandle`, `moveItem`/`copyItem` and any string literal holding
`://`; az4 refuses any bundle but `Bundle.main` and any `FileManager` use but `contents(atPath:`; az5 allows a sample reader made
outside `Sample/` only as `SampleReader.bundled()` with no argument. phonecopy gained a second data rule for the waiting rows'
questions and `checkSampleFace`, which holds `Sample.html` to the book's start-state rows in order with its badge their count.
`index.html`'s "11 · The buzz" became "12" beside "11 · See a sample". `ablation:p316` arms gained an optional `also` (az2 is red
on (c) too). In the (az) code `.exec(` became `.match(`, because `gate:background` read a self-test's `exec(` as a process start.

**probes**: an extra `sample-leaving` mark the probe acknowledges before Leave sample is pressed (and `sample-open` waits for
one), because a paired phone reads its Mac at once on leaving and SC2 counted at `sample-left` would fail an honest app;
inside the sample `screen-type` also reads the Terminal between the words and Return (`typedBeforeReturn`), unchanged outside
it; SE1's "exactly one label" is one distinct text holding "sample" plus no other identified element saying it, because a
button's words reach XCUITest twice; SC2 opens the Mac's Terminal from the Sessions tab, the drive having no step that opens one
from Needs input; SD reads "nothing asked" as `confirming:false` with no Face ID question seen, UNREADABLE when iOS answers with
a passcode or Face ID.

**The integrator's reconciliation.**
1. **One duplicated block, extracted.** A scan of every added line for repeated 10-line windows (normalised, blank and
   brace-only lines dropped) found nothing repeated inside the delta and, outside the mocks (each mock draws its own tab bar by
   design), one: the self-test case runner, which the probes builder had copied a third time into `sampleSelfTest`, identical
   to `replySelfTest`'s and `setupSelfTest`'s. All three now call one `runSelfTestCases(cases)` in `probe-p316.mjs`; the
   grader self-test reads 1,355 ok and 0 FAIL after it, as before.
2. **A must-run list the phase had not added.** `test:ios` asks xcodebuild's own suite lines for every class 317, 318, 337,
   337.1, 337.3 and 333.11 added, because 337.3's verifier found a class can drop out of the bundle and read as a pass; this
   phase had added none. `P3333_SUITES` (`SampleBookTests`, `SampleReaderTests`, `SampleOwnerCheckTests`, `SampleAppTests`)
   joins the list, with two self-test checks (a run naming none of them reads all four not run, and one naming all four reads
   none), and the third `test:ios` run below is the one that proves all four ran in Debug and Release.
3. **An arm whose anchor the app moved.** The first full `ablation:p316` read 515 of 516 arms red: `av5` (333.1's camera built
   outside Scan code's branch) matched nothing, because See a sample is now drawn inside the very `else` branch its anchor
   closed on. The gates builder had run the 16 new arms and the three moved build arms, not the whole table. Its anchor now ends
   at `scanButton` rather than at the branch's brace, with a comment saying why, and `av5`, `av5b`, `av5c`, `av1`, `av4` and
   `av9` re-run alone read 6 of 6 red; every other arm is the full run's.
4. **The reader's two warnings are gone.** The app builder's last whole build had warned twice in `SampleBookTests.swift`; the
   reader had since made both statics computed, and the integrator's `build-for-testing` showed no Swift warning.
5. **Identifiers and words agree** across the app, the drive and the probe: the five `ID`s, the drive's `Seen` copies, End's
   `lock.open` read as `unasked` in both glyph readers, and the five `Copy` words.
6. **The hidden-character scan** of the whole delta, new files included (bidi, zero-width, BOM and C0 controls): 0 hits.

**The texts** (§8 to §10). The CHANGELOG item is §8's, under a new `## Unreleased` / `### Added`, with no link (the follow-up adds
it). CLAUDE.md gains §9's two sentences, `build/p3333/**` in the `ios/**` row's paths, "(ac) widened" and "(s) build 10" beside
(az), and the arm count. `build/p333/CHECKLIST.md`: text A gains its sentence (681 → 732 characters, with a line saying its last
sentence waits for build 10); a text B for build 10 (507 characters) above build 8's; text C gains §10's paragraph, 590
characters, as its own paragraph after HOW TO REVIEW IT (2,325 → 2,917 as written, 3,098 → 3,690 filled in, under 4,000), with
a line saying it is for build 10 and later; the "None says ... sample" clause, the 2.1 reply and the "Not covered yet" item say
build 10 carries it. `build/p333/STORE-CHECKLIST.md`: item 2, the screenshots step, the notes step and text 4 (2,527 → 3,119
bytes, about 3,700 filled in) say build 10 carries it, and text 4 holds the same paragraph after its videos sentence.

**The battery**, run by the integrator in `/private/tmp/wt-p3333` (every command with `TERM_SESSION_ID` unset and
`HISTFILE=/dev/null`; the vitest under a scratch `HOME` and `ZDOTDIR`):

| Command | Exit | What it answered |
| --- | --- | --- |
| `node build/p3333/sample.mjs --check` | 0 | PASS: 5 sessions, 36 states, 1,980 list answers from 66 pieces, 11 sessions, 6 screens, 4 histories; 0.9 s |
| The same over `8f041ba3` (Phase 344 landed) | 0 | the same PASS line |
| `npm run typecheck` | 0 | about 2 s |
| `npm run build` (twice, before and after the integrator's edits) | 0, 0 | 35.6 s and 37.1 s; (az), (ac) and (s) ok, conformance:ios 50 rules over 52 app files, 70 test files and 136 files under `ios/`; the contract inventory byte for byte |
| `node build/conformance-ios.mjs` | 0 | 50 rules, 3.6 s; (az): 5 Swift files and the book, 57 refused types (50 derived, 4 paired, 3 more, 0 aliases), 1 bundle read, 1 `SampleReader` made outside the folder, 1 `SampleBar` |
| `npm test` (scratch HOME) | 0 | 1,123 files passed and 2 skipped; 20,967 tests passed and 14 skipped; 65.8 s |
| `npm run -s ablation:p316` | 1, then 0 | 515 of 516 arms red on their own rule in 36 min (every az arm, s8, s11, s12 among them; az2 also red on (c), az6 on (aa), az7 on (z), az9 on (n)); `av5`'s anchor gone (reconciliation 3), then 6 of 6 re-run alone after its re-anchor |
| `npm run -s conformance:phonecopy` | 0 | phonecopy OK |
| `npm run -s gate:contract` | 0 | byte for byte |
| `node build/p316/vectors.mjs --check` | 0 | PASS |
| `node build/p316/probe-p316.mjs --grader-self-test` | 0 | 1,355 ok, 0 FAIL, before and after the runner's extraction |
| `node build/p316/test-ios.mjs --self-test` | 0 | doors 76 (74 before `P3333_SUITES`), frozen 26, sample book 12 |
| `gate:checks`, `gate:simulator`, `gate:electron`, `gate:background`, `gate:knownhosts`, `conformance:push`, `build/assert-door-only-adds.mjs` | 0 each | `gate:electron` 172 against a floor of 172; `gate:simulator` 2 against 2 |
| `xcodebuild build-for-testing` Debug, generic Simulator, `CODE_SIGNING_ALLOWED=NO` | 0 | 17.5 s, no Swift warning (three `appintentsmetadataprocessor` notices, as at the base); the built app's `sample.json` has the committed sha256 |
| `test:ios`, iOS 26.3.1 | 0 | Debug 826 tests and Release 823, 0 failures; every build and the unsigned device archive read with the PASS words (so each holds the committed `sample.json`); 4 min 43 s |
| `test:ios`, iOS 18.3.1 (`P316_RUNTIME=18.3`) | 0 | Debug 826 and Release 823, 0 failures |
| `test:ios`, iOS 26.3.1 again, with `P3333_SUITES` required | 0 | Debug 826 and Release 823, 0 failures, no suite named as not run |
| The hidden-character scan of the delta, new files included | 0 hits | bidi, zero-width, BOM and C0 controls; `sample.json` holds no byte past U+007F |
| `grep -c 'CURRENT_PROJECT_VERSION = 10;'` | 6 | and 0 at 9 |
| `git diff e1e17899 -- src/ docs/audits/contract-baseline.txt package.json \| wc -l` | 0 | |

Every `test:ios` run held a phone lock slot, taken with the phone-wait file and released on the same command line; each ended
with 0 devices named `p316-` and none booted, and every derived data folder was deleted. No Electron was launched. His
history read `736064 1791579183` and `23166 1790702242` before the first command and after the last, unmoved.

**Left to the verifier** (§7.1, §7.4 to §7.7): `smoke:t1`, `smoke`, `smoke:t3` and `package` once, the `sample` arm group of
`probe:p316` (SA1 to SA13, SAX, SB, SC1 to SC3, SD, SP and SE1) under the lock, its own attack on (az) with a shape no arm
names, and the re-derivation of one state's `/v1/sessions` answer by hand. §14's six concerns stand as written.

### §As built — the fix round

The fixer appended this on 2026-10-10, after two verify lenses answered needs_work. Both found the shipping app honest
(SAX, SB and SC2 counted 0 connections; lsof saw 0 sockets; no keychain item moved) and the GATES short of the promise:
lens 1 planted fifteen shapes of its own and eight passed `conformance:ios`, the build and 105 tests (a static hook on
the reader, an extension of it outside its folder, an alert tap, `openURL:` and an `NSURLSession` reached through the
Objective-C runtime, Safari through `.init(string:)` and `open(` on a variable); its widened paired drive then counted 6
connections at the relay over one of them (S5b) where the shipping drive counted 0; lens 2 left a paired reader in a
`nonisolated(unsafe)` static beside `DoorReading`, set from `paired(_:first:)`, and only the live relay saw it; and both
read SA3 failing an honest app on Catch Me Up. Every major and minor is fixed below; nothing in the app moved. The fix
ran once; nothing was committed, staged or stashed.

**(az) is now a CLOSED boundary, not only a list of refusals** (`build/conformance-ios.mjs`):
1. **az2, the other half**: of what the app declares at the top level outside `Sample/` (types and top-level values,
   derived), the sample names only the contract's decoders and `SAMPLE_MAY_NAME` (20 names, each with why), and never
   the module as a qualifier (`Tortie.`); of the members the app's EXTENSIONS declare outside `Sample/`, it calls only
   `SAMPLE_MAY_CALL` (`lineBox`, `writer`, `screenDoor`, `sessions`, `holdsTogether`, `indexSpaceHolds`), none declared
   more often than pinned (a second `lineBox` is an overload the bar would reach). Both lists rot-check in the real run.
2. **Interpolations are code**: the lexer's `bare` blanks a string literal whole, holes included, so
   `"\(AlertInbox.shared.post(.list))"` named nothing to any rule; az2, az3, az8, az9, az10 and az11 now read
   `bareWithHoles`, each hole lexed again.
3. **az3 widened** (lens 1's list): any `URL` and `NSURL*`; the Objective-C runtime and every name lookup
   (`NSClass*`, `NSSelector*`, `NSStringFrom…`, `Selector(`, `#selector`, `perform…(`, KVC, `objc_*`, the C runtime
   functions, `@objc`, `AnyObject` outside an inheritance list, `unsafeBitCast`, `@_silgen_name`, `@_cdecl`, `dlopen`,
   `dlsym`); `UIApplication*`, `open(` on any receiver, the notification center and the pasteboard; and the
   `ObjectiveC`, `Darwin`, `JavaScriptCore`, `CloudKit`, `MultipeerConnectivity`, `CoreBluetooth`, `ExternalAccessory`
   and `MessageUI` imports.
4. **az8 NEW, the sample keeps nothing past itself**: no stored `static var` (assigned, observed or with no getter),
   no `nonisolated(unsafe)`, no `@TaskLocal`, no file-scope declaration, and every `static let` a literal or a closure.
5. **az9 NEW, nothing outside the sample reaches into it**: a name `Sample/` declares appears outside it only at the
   five sites (`SampleReader.bundled()` and `SampleChoices()` in `openSample()`, `is SampleReader` and
   `SampleOwnerCheck(inner:` in `endCheck(for:)`, `SampleBar(` in `RootView`), each once; an `extension` of a sample
   type is named as one.
6. **az10 NEW, the whole app's shared places are pinned**: a stored static var, a `nonisolated(unsafe)` declaration, a
   top-level var and a static (or top-level) let holding an instance of one of the app's classes or actors appear only
   at `APP_SHARED_STATE`'s six (`OrientationGate.screenOnTop`, `ScreenRows.probe`, the three `shared` singletons and
   `PairingStore.keychain`), each with its reason; a `let` made `nil` (an `EnvironmentKey`'s default) holds nothing.
7. **az11 NEW, the reach is closed**: the types the sample may name are followed through every name their
   declarations, their extensions anywhere outside `Sample/` and `SAMPLE_MAY_CALL`'s bodies use, to a fixpoint. It adds
   exactly `SAMPLE_REACH`'s twelve (the Sessions words, `Base64URL`, `Hex`, `ExchangeEnd`, `DoorReply`, `PushAddress`,
   `PushEnvironment`, `BatchSkip`, `Token`, `Face`), 67 types in all at this head, with ONE edge named and never
   followed (`PairedFacts` names `PairedDoor` once, in the `init` Settings uses), and az3's refusals hold over every
   reached body. So a member added to an allowed type that reads the Keychain (`PairedFacts.kept`) or posts an alert
   (`Copy.ping()`), the next shape after the seal attack's, is red. This one was not asked for: it closes the one gap the
   lists above leave (a member written inside an allowed type's own body), which the fixer judged the reverify's
   likeliest next plant.
8. **(g) widened app-wide**: `NSClassFromString`, `NSSelectorFromString`, `NSProtocolFromString`, `objc_msgSend` and its
   kin, `@_silgen_name` and `@_cdecl` are refused in every app file (none uses one; `#selector`, which UIKit's targets
   need, stays allowed), because a name looked up at run time escapes every rule that reads names ((c), (n), (az)).

Each new clause proves its scanner on fixtures first (58 new `expect`s, 54 for (az) and 4 for (g): the scanners' own
readings, every plant shape, a control beside each, and the rot checks in pinned mode). **Every plant of both lenses was re-run against the final
gate** in a `cp -Rc` clone of the worktree, `node build/conformance-ios.mjs` exit codes: S1, S2, S3, S4, S5, S5b, S5c,
S8, S9, S9b, S10, S11, S12, lens 2's LastReader (set in `paired(_:first:)` alone), an extension of `DoorReading` that
reads the Keychain, a name hidden in an interpolation, a class box on `Copy`, a Keychain read added inside
`PairedFacts`' own body and an alert tap added inside `enum Copy`: 19 of 19 exit 1 on (az). S6 and S7 (logic in
`AppModel`, no name) are the Swift tests', below. The tree at this head passes.

**`ablation:p316`** gains seventeen arms, `az17` to `az33`, the seal attack's own shapes, each red on the rule that owns
it (`az22` and `az24` also on (g), `az31` on (g) alone): an alert tap and an outside shared place read from the sample,
an extension member and a second `lineBox`, a name in an interpolation, S12, S11, S9b, S5's static hook, a static
instance of `SampleChoices`, S5b's hook set where lists are made, S4's extension, the second lens's `LastReader`, a class
box on `Copy`, (g) anywhere in the app, and the two az11 members. 533 arms in all.

**`SampleAppTests`** (lens 1's major, lens 2's minor): the recording paired reader now answers a recording WRITER and
a recording Terminal, made when asked, so a write, press, key, page or read the sample sends to the paired Mac is
counted (it answered `writer` nil and `screenDoor` nil, which is how S5b passed); `drive(_:)` now also sends a Return,
pages back, reads the status line's session, walks every Show, Ends these and sends a message; and a new test,
`testFromAFreshPairingTheMacIsNotReadInsideTheSample`, pairs through the pairing screen's own success path
(`PairingModel.read` to `paired(_:first:)`, `RecordingPhone` now pairing on request through `StandInPhone`'s pending
pairing) and asks that Mac nothing from See a sample to Leave sample. Run on ONE iOS 26.3.1 Simulator under a phone
slot: HEAD 69 tests, 0 failures over the four sample classes; and SampleAppTests over the plants, each built in its own
clone: S5b 8 failures (the paired writer recorded `writer.choose`, `writer.end`, `writer.endBatch` twice and
`writer.say`; it was 0 before this round), S5c 2, S6 6, S7 7, lens 2's plant B 1 (`blocked` asked five times; it was 0
before). 0 devices left.

**`probe:p316`** (both lenses' SA3 major, lens 1's SC major and nit):
- **SA3 judges by what the scroll views show.** The drive's `sample-inventory` gives each element inside a scroll
  container (every `.scrollView`, `.table` and `.collectionView`, and by name `screen-grid` and `screen-catch-up`) a
  `clip`, the intersection of its containers' frames, and says whether iOS can hit the bar's two words at their centres
  (`barHittable`). `sampleBarProblems` clips each element by its `clip` (the grid rule kept for a drive without one), so
  Catch Me Up's turns scrolled above it no longer read as over the bar; a container itself is still judged whole; a
  page where iOS cannot hit Leave sample is red whatever the frames say; and iOS's own menu leftover
  `AdditionalDimmingOverlay` (reported at [-120, -8, 642, 228] on Catch Me Up after the ⋯ menu closed, in both lenses'
  dumps) is excused ONLY on a page where Leave sample was hit. Self-tests: a scrolled turn passes by its clip and fails
  without it; an element inside the bar its clip does not cut, a container under the bar, the leftover with Leave sample
  not hit and with the hit unread, and a page where Leave sample is not hit each fail; and the recorded fresh drive's
  Catch Me Up now reports its turns as the real page does (the first from 40 pt above the window, each with its clip),
  with two broken variants (the clips removed, a turn inside the bar) failing SA3 alone.
- **SC2 counts every surface.** The paired drive (`samplePlan(…).pairedSteps`) is lens 1's widened one, step for step:
  Settings, Sessions with Show all, both questions pressed, keys, Ctrl and Return, Home and back, eight drags of history,
  Catch Me Up, End, End these over three and Show Ended; and the paired Simulator enrols Face ID, so End and End these
  are answered and their writes made. SC2 reads thirteen surfaces from the drive's own events (`sc2Inside`) and is
  UNREADABLE when any did not happen, so a drive that pressed nothing can never pass it again; its name says "every
  surface of the sample". `--grader-self-test` 1,494 ok and 0 FAIL (1,355 before).
- **SD stays UNREADABLE on a Simulator** (lens 2's nit, §14 concern 2, measured by both lenses): with Face ID unenrolled
  iOS 26.3.1 still answers the passcode, so D12, the no-passcode End, is proved by `SampleOwnerCheckTests` alone on this
  harness. `build/p333/CHECKLIST.md` "Not covered yet" gains the device check: on a spare iPhone with no passcode, open
  See a sample on build 10 and end a session.

**Texts**: CLAUDE.md's `ios/**` row says the boundary is closed and names the four lists, (g)'s widening and 533 arms;
its `probe:p316` row says the paired drive covers every surface and how SA3 now reads. No word moved in the app.

**The commands the fix ran** (every one with `TERM_SESSION_ID` unset and `HISTFILE=/dev/null`; `npm test` under a scratch
`HOME` and `ZDOTDIR`; every Simulator and Electron under a phone slot taken and released on the same command line):

| Command | Exit | What it answered |
| --- | --- | --- |
| `node build/conformance-ios.mjs` over the tree | 0 | 50 rules; (az): 57 refused types, 55 names the sample may name, 6 extension members, 5 outside sites, a reach of 67 types, 6 shared places; every scanner proved first |
| The same over a clone with each plant | 1 each | 19 of 19 plants red on (az) (S1, S2, S3, S4, S5, S5b, S5c, S8, S9, S9b, S10, S11, S12, LastReader, a `DoorReading` extension, an interpolation, a box on `Copy`, a member inside `PairedFacts`, a member inside `Copy`); S9, S9b, S12 also on (g), S1 on (c) and (d) |
| `npm run -s ablation:p316` | 0 | 533 of 533 arms red on the rule that owns them, every rule (a) to (az) able to fail; about 52 min at load averages of 100 to 660 |
| `npm run typecheck` | 0 | |
| `npm run build` | 0 | conformance:ios PASS inside it; the contract inventory byte for byte |
| `npm test` (scratch HOME) | 0 | 1,123 files and 20,967 tests passed, 2 and 14 skipped, as before; 147 s under load |
| `node build/p3333/sample.mjs --check` | 0 | the same PASS line: 5 sessions, 36 states, 1,980 list answers from 66 pieces |
| `npm run -s conformance:phonecopy` | 0 | phonecopy OK; no word moved |
| `npm run -s gate:contract` | 0 | byte for byte |
| `node build/p316/vectors.mjs --check` | 0 | PASS |
| `node build/p316/test-ios.mjs --self-test` | 0 | sample book 12 checks, as before |
| `node build/p316/probe-p316.mjs --grader-self-test` | 0 | 1,494 ok, 0 FAIL (sample 190, recorded drives 113) |
| `gate:checks`, `gate:simulator`, `gate:electron`, `gate:background`, `gate:knownhosts` | 0 each | `gate:electron` 172 against 172; `gate:simulator` 2 against 2 |
| `xcodebuild build-for-testing` Debug, generic Simulator, `CODE_SIGNING_ALLOWED=NO` | 0 | no Swift warning |
| SampleAppTests and the sample classes on one iOS 26.3.1 Simulator, HEAD and five plants | 0 at HEAD | HEAD 69 tests, 0 failures; S5b 8, S5c 2, S6 6, S7 7, plant B 1 failure(s) |
| `test:ios`, iOS 26.3.1 | 0 | Debug 827 and Release 824 tests (one more each, the fresh-pairing test), 0 failures; every build and the unsigned device archive read with the PASS words |
| `test:ios`, iOS 18.3.1 | 0 | Debug 827 and Release 824, 0 failures |
| `probe:p316`, `P316_ARMS=sample`, run 1 | 1 | SA1 to SA13 and SAX PASS on 26.3.1 (SA3 now PASS, every inventory reading Leave sample hit and Catch Me Up's leftover excused by it); SC1, SC2 (0 connections and 0 requests across all thirteen surfaces, End and End these answered by Face ID, "3 of 3 sessions ended") and SC3 PASS; RUN, Q1, N10, MD3, K2 PASS; SD UNREADABLE as stated; SB SA9 FAIL with SA13 and SAX UNREADABLE on 18.3.1: the drive printed `end-auth-up` with `confirming: false` and then read an empty tree, while another project's load generator held the load average at 660 (twelve `/bin/sh` loops, not this run's, left alone) |
| `probe:p316`, `P316_ARMS=sample`, run 2, alone at a load of 70 | 2 | every arm PASS, SB's seven on 18.3.1 among them (SA9 "Face ID asked and matched, then Ended"), and only SD UNREADABLE, the stated premise; so run 1's SB was the load, as the rule for a timing failure under load says to check |

His history read `736064 1791579183` and `23166 1790702242` before the first command and after every Simulator, probe and
build, and at the end; it never moved. At the end: 0 devices named `p316-` and none booted; 0 Electron of this round;
all three lock slots free and the phone-wait folder empty; `git diff e1e17899 -- src docs/audits/contract-baseline.txt
package.json` 0 lines; no Phase 344 file touched; the plant clones, the stopped first ablation's clone and every
`dd-fixer*` derived data folder removed.

**What is still not true.** The reach is closed by NAMES: a type the sample may name is followed through the names its
code uses, so a member reached through a value's type that is inferred and never written (a closure returned by an
allowed function, for one) is outside what a text rule reads; the Swift tests and the probe's relay are the layers
behind it. SD stays UNREADABLE on every Simulator, so the no-passcode End rests on `SampleOwnerCheckTests` and on the
device check now in his checklist. The screen group's pre-existing reds are 337.4's, as the second lens found.
