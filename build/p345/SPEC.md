# Phase 345 — one iPhone, several Macs — SPEC

Written by the spec step on 2026-10-15 in `/private/tmp/wt-p345`, a detached worktree at origin/main `24097f39`
("docs(backlog): 333.4 landed, 333.4.1 queued"). The phone at this base is build 10, the public TestFlight and App Store
build: `git diff --stat 5f5efba2 24097f39 -- ios/` touches three test and fixture files and no line of `ios/Tortie/`, so
**the parent app in every row below is build 10's app**. Every `file:line` here was read at `24097f39`. origin/main has
since moved to `6d485575` with backlog lines only (`3cfde2e4` "345 started", `6d485575` 347.1's ruling); nothing this
phase touches.

**The spec step MEASURED before it wrote** (§12 holds every command, exit code and number). It built the app at this head
(Debug, for testing) into scratch derived data and, under the lock (slot `electron.lock`, taken as `p345`, released),
drove the shipping `P316DriveUITests/testDrive` against `build/p316/hostile-door.mjs`'s `honest` arm on one iPhone 16 Pro
on iOS 26.3.1 and one on iOS 18.3.1, each made and deleted by `build/simulator-run.mjs`'s `withSimulator`. On each it
paired, installed an app OVER the paired one with `simctl install`, and relaunched with no forget seam and no code: the
pairing read back (the lists drawn, the door's next signed `/v1/blocked` verified and carrying the SAME client key pin).
The control arm, `simctl uninstall` then `install`, drew Pairing and made no read. So the upgrade mechanism the verifier
needs works on both runtimes, and it discriminates. It started no Electron, no agent and no model turn, used no real
Tailscale, DNS or APNs, installed nothing, took no photograph, and read nothing under `~/.ssh`, `~/Keys`, `~/.claude`,
`~/.codex`, his keychain or his live Tortie profile. `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read
`737736 1792023873` and `23166 1790702242` before the first command and after the last; `xcrun simctl list devices | grep
-c p316-` read 0 at the end. Its scratch script and logs are kept at
`/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p345/spec/` (`upgrade-measure.mjs`,
`upgrade-m1.log`, `upgrade-m1-183.log`); the script is the shape of the probe's U0 arm and is not to be copied into
`build/` as it is.

Read with it, whole: `docs/BACKLOG.md` "## Phase 345" (the entry); `docs/research/141-several-macs-and-starting-sessions-
from-the-phone.md` §2.2 and §4.2; **the running log's line of 2026-10-14, "HE ANSWERED RESEARCH 141's ELEVEN QUESTIONS",
which OVERRIDES the entry where they differ** (below); `build/p316/SPEC.md` §4 (the phone's refusals); `build/p3166/SPEC.md`
§5 (the tabs, Settings, Unpair); `build/p3165/SPEC.md` §5.6 (the alert tap); `build/p3333/SPEC.md` D13 to D18 (See a
sample); CLAUDE.md's verification and machine-discipline sections.

**His answers, which this SPEC builds.**
- (2) "you should be able to switch through via the bottom nav bar like they are completely separate". **Each paired Mac is
  its own space.** Needs input, Sessions and the Settings card show ONE Mac at a time, and the bottom bar is where he
  switches. This REPLACES the entry's mechanism step 3 (one Needs input section per Mac) and step 4 (a Sessions menu on
  the title row). The entry's "no fourth tab" yields only as far as the switcher needs (D3).
- (1) Two desks: each Tortie shows only what it started; the identity invariant stays. (3) Alerts stay with one Mac;
  345.1 is not built. (4) At most four Macs.
- His standing rules: no scenario worse than today, so **with ONE Mac kept every screen draws as today and no switcher
  appears**; just enough words.

**The order of authority.** His answers above, then the entry and its "What is NOT in this phase", then this file. The
tree at `24097f39` overrides anything this file says about it.

---

## 0. The hard rules, stated once

- **This is a build.** Builders write code and run their own gates; verifiers verify code that exists. Questions the
  operator asks the main session are not anybody's task here.
- **No Mac code changes.** `git diff 24097f39 -- src/` is empty at landing. No route, no hashed field, no QR, no `/pair`,
  no alert payload. (333.12 is changing `src/main/pocket/**` on main meanwhile; 347.1 the terminal path files.)
- Builders and the integrator boot no Simulator and launch no Electron, except the integrator's two `test:ios` runs
  (§8). Every `test:ios`, probe or Simulator run holds ONE lock slot: `zsh /private/tmp/tortie-ops/lock.sh try p345` prints a
  slot or exits 1 (retry every 60 s in a NEW command); `zsh /private/tmp/tortie-ops/lock.sh release <slot>` on the same
  command line. `probe:p345` holds one slot for its two Electrons and its Simulators.
- `/Users/gdc/gmux` is read only. Every command runs in `/private/tmp/wt-p345` or the role's scratch
  `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p345/<role>/`; Xcode derived
  data only under `<role>/dd*`. Every heredoc delimiter quoted. Nobody but the committer commits, stages or stashes.
  `git diff 24097f39` is exactly 345's delta.
- Never `-L gmux`, never the default tmux server. Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only
  pids you started.
- His keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex` and live Tortie profile are never read (the
  Simulator's own keychain is fine). No model turn. No real Tailscale, DNS or APNs: the stand-ins `probe:p316` uses.
- **Simulators only through `build/simulator-run.mjs`** (`withSimulator`; `P316_DEVICE` and `P316_RUNTIME` for
  `test:ios`). Never Simulator.app, never a screenshot: a visual claim is a frame or a label XCUITest read. At the end
  `xcrun simctl list devices | grep -c p316-` reads 0.
- Every Electron through `build/electron-run.mjs` (`withElectron`) inside `build/harness-socket.mjs`, killed in a `finally`.
- **His shell history**: before and after every command that starts a shell, the app or a Simulator, record ONLY
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history`. His own Tortie sessions may move it, so a move ACROSS one of your
  commands is the stop: stop and report.
- `df -h /` before any build; under 8 GB free, wait and report. **Install nothing.**

---

## 1. The answer first

**What he can do after this phase.** Pair his iPhone with a second Mac (up to four) from Settings, "Pair another Mac",
without unpairing the first. With two or more Macs kept, a **fourth item appears at the right of the bottom bar, named
after the Mac he is looking at** (its symbol a desktop computer). Tapping it opens **Macs**: one row per Mac, the one he is
on ticked, each saying `Needs your input (n)` when a session there waits on him. One tap on a row switches the whole app to
that Mac: Needs input, Sessions and Settings are then that Mac's, as if it were the only one, and each Mac keeps where he
was in it. The Macs item carries a badge counting what waits on the Macs he is NOT looking at, so nothing waiting is ever
hidden without a mark. Unpair in Settings forgets only the Mac on screen. An alert from the Mac that sends them opens its
session on that Mac.

**With one Mac kept, nothing moves but one row**: the bar has its three tabs, every screen draws as build 10 draws it, and
Settings gains "Pair another Mac" between the Mac's cards and Unpair this iPhone. A phone upgraded from build 10 keeps its
pairing (measured, §12).

**What is still not true, stated:**
- **A session one Tortie started on another machine shows only through that Tortie** (his answer 1, the identity
  invariant): a session his MacBook started on the Mac Pro is listed under the MacBook.
- **Alerts come from one Mac** (his answer 3). If a SECOND paired Mac also says it can send (his key on two Macs, or a
  stranger's Mac claiming it), a tap on an alert opens Needs input on the Mac on screen rather than the session, because the
  phone cannot tell which Mac sent it (D24). The badge on the app's icon is whatever the sending Mac last set.
- **The order of the Macs** is the first Mac paired, then the rest by when each was last paired; re-pairing a Mac that is
  not the first moves it to the end (D9).
- **An older build** (build 10) installed over this one reads only the first Mac, and its Unpair or a broken record forgets
  every Mac's client key; this build then drops those other records whole (D11). That is the safe direction.
- Show, Group by and Sort by stay one choice for every Mac; the Agent and Machine filters and opened projects are each
  Mac's own (D17, a question for him).

### 1.1 The decisions, each with its reason

| # | Decision | Reason |
| --- | --- | --- |
| D1 | **Each kept Mac is a SPACE** (`MacSpace`): its reader, its `ListModel`, its `SessionsModel`, its two navigation paths (Needs input's and Sessions'), its Settings line. One space is CHOSEN; every tab draws the chosen space only | his answer (2), "like they are completely separate" |
| D2 | **A space is keyed by the Mac's whole public name** (`<label>.<tailnet>.ts.net`, lowercase ASCII by `DoorEndpoint.isPublicName`, `ios/Tortie/Door/DoorClient.swift:147-166`). Two kept records never share one (D8) | the name is what the phone dials, and a pairing only completes when the first signed read through THAT name meets the pin in the code (`Door/Pairing.swift:534-541`, the read at `:537`, the save at `:539`); `dk` is printed in every QR (`src/main/pocket/pairing.ts:1370-1381`) and proves nothing (research 141 §6) |
| D3 | **The switcher is a fourth TAB, `AppTab.macs`, at the right of the bar, drawn only when two or more Macs are kept.** Its label is the chosen Mac's drawn name (D21), its symbol `desktopcomputer`; its content is the Macs screen (D14). Selecting a row switches; the tab is never an action button | his answer (2); Apple's HIG keeps a tab bar for navigation, not actions, so a tab whose tap opens a sheet without being selected is avoided; a real tab needs no selection interception, which nothing here measured on iOS 26's bar; the three tabs keep their places and meaning; `TabContentBuilder.buildIf` is available from iOS 18.0 in the SDK (§12 M4) |
| D4 | **Choosing a Mac lands on its Needs input** (`tab = .needsInput`), its own paths kept from the last visit | the app opens on Needs input every launch (`App/TortieApp.swift:175`); "completely separate" spaces each keep their place |
| D5 | **The app opens on the first Mac** in order (D9) every launch; the choice is held in memory and never stored | rule (aa) holds the phone to three stored words (`build/conformance-ios.mjs:365-398`); a question for him (Q3) |
| D6 | **The Needs input badge is the CHOSEN Mac's waiting count**, exactly today's `waitingBadge` over the chosen space's list (`App/TortieApp.swift:593-596`). **The Macs tab's badge is the sum of the OTHER kept Macs' loaded waiting counts**, folded through `DoorNumber.sum` (`ios/Tortie/Door/Contract.swift:111-116`), no operator, 0 when a sum is nil; `.badge(0)` draws none | a sum on Needs input would disagree with the list under it, which today's code promises never happens ("the badge and the list never disagree"); a mark on the Macs item keeps a session waiting on another Mac from being hidden without one, the rule Sessions already keeps for a closed project (`Screens/SessionsScreen.swift:15-23`) |
| D7 | **The Macs that are not chosen are READ for that badge**: one `/v1/blocked` each, side by side, each bounded by the client's 15 s (`Door/DoorClient.swift:180`), when the app opens, on every return to the foreground, when the Macs tab appears and on its pull. With one Mac kept there is no extra read | D6; a question for him (Q2), default yes |
| D8 | **Storage: one Keychain item per Mac** under the same service `com.itavero.tortie.phone.door` (`Door/Keys.swift:417`). The FIRST Mac's account stays `pairing-v2` (`:471`), so build 10 still reads it; any other is `pairing-v2-` and 16 lowercase hex the PHONE makes (as `ClientKeys.newTag`, `:124-127`), never a Mac's field. The record's bytes are UNCHANGED (`Record`, `:540-566`, `v: 2`), so build 10 and this build read each other's records | the entry's mechanism 1; build 10 must keep reading the first Mac |
| D9 | **Order**: `pairing-v2`'s record first, then the rest by `pairedAt` ascending, then by account | stable: the first Mac's re-pair writes in place (D10) |
| D10 | **A re-pair of a kept Mac (same public name) replaces that Mac's record IN ITS OWN ACCOUNT**, through `write` (remove then add, `:448-455`), exactly as today's one-record `save` replaces `pairing-v2` (`:503-505`); then the replaced record's client key tag is deleted when it differs from the new one. **A new Mac takes `pairing-v2` if it is free, else a fresh account.** A fifth new Mac is refused by the store as well as at the code (D12) | with one Mac this is today's save byte for byte, plus deleting the tag today leaves orphaned; the crash window is today's, no worse |
| D11 | **A record that does not decode removes ONLY ITSELF** (never `forget()`, never a tag). Two records with one public name keep the later `pairedAt` and remove the other record. More than four decoded records keep the first four in order and remove the rest. **Client keys are swept ONCE, at launch, before anything can start a pairing** (`AppModel.launch`, after `forgetOnFreshInstall`): a tag no kept record names is deleted, and **the sweep deletes nothing unless every account was listed and read without an error** | the hazard: today `load()` calls the global `forget()` on any record that does not decode (`Door/Keys.swift:492-500`), which deletes every client key (`:518-524`); a keychain read error must never read as "no record" and wipe every identity |
| D12 | **The cap is four Macs, refused when the code is read**: `LiveDoor.begin` parses the code, then `PairingStore.admits(name)` (true when that name is kept, or fewer than four are), else `PairingFailure.macLimit`, whose sentence is `Copy.macLimit`. Nothing is minted or presented. Re-pairing a kept Mac at four is allowed | his answer (4); the entry's "refused at the pairing screen with one sentence" |
| D13 | **Routes carry their Mac**: `Route.session(mac:id:name:)`, `.catchUp(mac:id:honestLine:)`, `.alerted(mac:id:)`. A route lives only in its own space's path; `destination` resolves its reader from `route.mac` through ONE lookup, and draws nothing (and pops) when that Mac is no longer kept. Every NavigationStack in the tabs carries `.id(` of the chosen space, so a switch never reuses a view built over another Mac's reader | the entry's "every read and write goes to the reader that drew the row, never resolved by session id across Macs"; the attack (§5.4 H) lists another Mac's session ids under its own name |
| D14 | **The Macs screen** (`ios/Tortie/Screens/MacsScreen.swift`, new): the title `Macs` as the other tab roots draw theirs (`Screens/SettingsScreen.swift:193-200`), then one card of rows, one per Mac in order, each at least 44 tall: a `checkmark` in the accent on the chosen row (blank space of the same width on the others), the drawn name, and under it the Mac's line: its list's failure sentence when its last read failed, else `Needs your input (n)` (`Copy.needsYourInput`) with the attention dot when n > 0, else nothing. A tap chooses (D4). Pull reads every Mac (D7) | just enough words; no new word but the title |
| D15 | **Settings shows the chosen Mac**: its This Mac card, its Alerts card when IT said it could send, then a new row **Pair another Mac** (See a sample's shape and chevron, `Screens/SettingsScreen.swift:319-337`), then Unpair this iPhone (which forgets the chosen Mac only), See a sample and About. Unpair's words do not change: the card names the Mac and its note already says "It forgets this Mac and its keys." (`Style/Copy.swift:409`) | his answer (2), "the Mac's Settings card show ONE Mac at a time"; just enough words |
| D16 | **Pair another Mac opens the pairing screen as a SHEET over the lists**, with a fresh `PairingModel` (`keepsOthers: true`), a Cancel in its top bar, and no See a sample. Its resting line and its "not paired" endings say `Copy.notPairedHere` instead of `Copy.notPaired`, which would be false with another Mac kept. Cancel, or a swipe down, CANCELS the attempt (its client key is deleted by `PairingFlow.run`'s failed ending, `Door/Pairing.swift:407-417`). Paired, the sheet closes and the new Mac is chosen, on its Needs input | research 141 §4.2 "opens as a sheet over the lists"; rule (v): the line is never empty |
| D17 | **Show, Group by and Sort by stay the phone's three stored words, one for every Mac**; the Agent and Machine filters and opened projects stay each space's own model state. When a space is chosen and its model's words differ from the stored ones, the app makes that space a new `SessionsModel` | rule (aa)'s three words; this needs NO edit to `Screens/SessionsScreen.swift` or `Screens/SessionsChoices.swift`, both read by `gate:onlyadd` (`launch.wire.json` `read`); a question for him (Q4) |
| D18 | **A refusal blanks only that Mac.** With ONE Mac kept a refused list is today's `lostPairing()` exactly (`App/TortieApp.swift:324-337`). With two or more, the refused Mac's paths empty and its list draws `Copy.notPairedHere` with Try again (`ListModel.drawRefused`); no other space, no chosen Mac and no tab moves; the app never goes to Pairing while a Mac is kept. Nothing is forgotten on a refusal, as today | the entry's mechanism 2; a 404 is every refusal the door makes, including a Mac that is quitting |
| D18a | **A pairing made on the ROOT Pairing screen while a record is kept replaces that kept record, as build 10's did** (the fix round; it amends D18). The root Pairing screen is reached with a record kept only after the ONE kept Mac refused (D18's one-Mac arm, `lostPairing()`): `refused(mac:)` keeps that Mac's name (`refusedOnPairing`), and `paired(_:first:)`, that screen's own ending, calls `replaceRefused(with:)` before `adopt`, which forgets that Mac through Unpair's own door, `door.unpair(name:)`, when the new pairing is a DIFFERENT Mac. Nothing is forgotten when the same Mac is paired again (its record was replaced in place, D10), from the Pair another Mac sheet, on Pairing after Unpair of the last Mac, or after a return that finds the Mac kept with no pairing under way; a pairing that fails forgets nothing; Apple is told nothing. Two costs, stated: build 10 installed back over this build reads no pairing (the new Mac keeps its `pairing-v2-` account and build 10 reads `pairing-v2` alone), and a Mac that answers 404 because it is QUITTING, followed by another pairing on that Pairing screen, forgets the first Mac, as build 10 did | keeping the refused Mac beside the new one drew a Macs tab over a Mac that refused the phone and opened every launch on it (D5, D9), which build 10 never did (lens 1's major); keeping both and opening on the newer Mac changes D5, which he was asked about |
| D19 | **The DEBUG code with a pairing kept opens the Pair another Mac sheet and reads it** (`AppModel` keeps the launch code in both cases; today it drops it when paired, `App/TortieApp.swift:242-248`). No new seam argument: rule (d)'s five stay (`build/conformance-ios.mjs:1102`), and `DebugLaunchSeam.carried` still never carries a code (`App/DebugLaunch.swift:24-28`) | the entry's mechanism 9 asks for a seam; widening the existing one moves no `--read-app` list and adds no Release string |
| D20 | **The cap's literal, 4, is declared once** (`PairingStore.macLimit`) | rule (ba) |
| D21 | **A Mac's drawn name** is its public name up to the first dot (today's `PairedFacts.name`, `Screens/DoorWords.swift:221`), or its WHOLE public name when another kept Mac has the same first label. Drawn the same way on the Macs tab, the Macs screen and Settings' card. With one Mac it is today's | the entry's mechanism 6; Tailscale keeps names unique within one tailnet only |
| D22 | **Alerts, asked**: a pairing asks iOS only when the Mac being paired says it can send, as today, per pairing (`Door/Pairing.swift:467-482`) | his answer (3) builds nothing new here |
| D23 | **Alerts, Unpair**: `forgetAddress()` (`App/TortieApp.swift:567`) runs when NO Mac remains (today) OR when the Mac unpaired holds this phone's address (its `alerts.presented` is not nil). Still exactly one call site, in `AppModel.unpair`'s `.forgotten` arm | the entry's rule ("only when no kept pairing has `macSends`") lets a stranger's Mac that CLAIMS it sends keep the real Mac's alerts arriving after he unpairs the real one, and then answer for them; this rule cannot be held open by another Mac's claim. Cost, stated: unpairing one of two Macs that BOTH hold the address stops the other's alerts until the app registers again at its next launch (Release registers on every launch, `Alerts/SystemAlerts.swift`), or says `Pair again to get alerts.` there if iOS hands out a new address; with his answer 3 that needs his key on two Macs, which is 345.1 |
| D24 | **Alerts, a tap**: with ONE Mac kept, exactly today (`App/TortieApp.swift:505-520`). With two or more: when EXACTLY ONE kept Mac says it can send, that Mac is chosen and the tap opens the session it names (or its list); otherwise the chosen Mac's Needs input list, nothing pushed and nothing read for the named id | the entry's "never a guess"; its "open where exactly one answers for that session id" is DROPPED: the attack answers yes to every id (§5.4 H), so asking resolves nothing it does not defeat, and it costs reads at the moment of a tap |
| D25 | **`Pair again to get alerts.` and Settings' Alerts card stay per Mac**: `checkAlertAddress` runs over every space and sets each space's own `list.alertsLine`; `readAlertPermission` reads for the chosen Mac only | each Mac's own section |
| D26 | **See a sample** drops every space, as today it drops the one; Leave sample from the paired lists reads `door.pairedReaders()` once and chooses again the Mac chosen before, if it is still kept, else the first | rule az5 (`build/conformance-ios.mjs:13636-13690`) moves from `door.pairedReader()` to `door.pairedReaders()` |
| D27 | **The build moves to main's next number at landing**: 11 now (`CURRENT_PROJECT_VERSION` in all five configurations, `ios/Tortie.xcodeproj/project.pbxproj:417-522`; `PHONE_BUILD`, `build/conformance-ios.mjs:3077`, with its "not uploaded" fixtures 12). If 333.4.1 lands first and takes 11, the committer re-reads origin/main's number and moves all of it to 12 | the task; App Store Connect refuses a duplicate build |
| D28 | **Tier 3**, two independent methods, one an attack: the parent measured (build 10's app upgraded in place, and one-Mac parity element by element), the attack (a hostile second door), and a per-row matrix over two REAL doors (§5.4) | the entry; CLAUDE.md "Can it lose or corrupt the person's work… Tier 3" (his phone's credentials) |

**Subject.** `feat(ios): pair one iPhone with several Macs`

**First body line.** `Phase 345: one iPhone, several Macs`

**Semver.** Minor, unreleased, phone only. No release: one TestFlight build follows 345 and 346.

**Menus.** No Mac menu moves; nothing under `src/` changes. On the phone a surface is ADDED: the Macs tab and its screen
(drawn with two or more Macs) and the Settings row Pair another Mac; nothing is renamed or removed.

---

## 2. The tree at this head, re-read (the entry's citations, corrected)

The entry was written before 333.3 (See a sample) and 333.4 landed. Re-read at `24097f39`:

| The entry cites | At `24097f39` |
| --- | --- |
| `Pairing.swift:382-385` keys made | unchanged (`begin`, mint at `:385`) |
| `Pairing.swift:531-538` saved after Allow and a first read | the door is built `:519-532`, saved `:539` inside the first read's success |
| `Pairing.swift:467-482`, `:531` alerts | unchanged |
| `Keys.swift:417`, `:448-455`, `:471`, `:492-500`, `:502-505`, `:518-524`, `:176-207` | unchanged (`save` is `:503-505`; `mint` `:174-216`) |
| `TortieApp.swift:192`, `:242`, `:324-338`, `:419-423`, `:560-570`, `:567`, `:593-596`, `:778` | unchanged |
| `TortieApp.swift:143-155` Route | `:143-158` |
| `TortieApp.swift:134-135` three tabs | the comment `:134-135`, the enum `:136-140` |
| `TortieApp.swift:225-249` the DEBUG code | `init` `:226-252` (dropped when paired at `:242-248`); `launch()` reads the seam `:257-277` |
| `TortieApp.swift:462-482` `leaveSample` | `:462-497` |
| `DoorWords.swift:220-226`, `:265-275` | unchanged (`PairedFacts` `:199-235`, the name `:221`) |
| `DoorClient.swift:180` | unchanged (`static let timeout: TimeInterval = 15`) |
| `SessionsScreen.swift:683-699` title row | `:685-700` (NOT edited, D17) |
| `SessionsScreen.swift:411-435` `.olderMac` | `failed(_:listRead:)` `:416-438` |
| `SettingsScreen.swift:205-297` | the Mac card `:205-252`, Unpair `:293-310`, See a sample `:319-337` |
| `Copy.swift:371-375` `thisMac` | unchanged |
| conformance (n), (x) `:245-256`; (d) `:1102`; (k) `:1588`; (s) `:3077`; `APP_SHARED_STATE` `:13378-13385` | unchanged; (aa) is `:365-398`; az5 `:13636-13690`; (b) `ruleTabs` `:4145-4226`, `TABS` `:4030-4034`, `NAV_BAR_ROOTS` `:4053`; (n) `ruleDeleters` `:4228-4320`; (p) `KEY_NAMED` `:2372-2448` |
| `probe-p316.mjs:79` (R1), `:210` (U1) | unchanged |
| Mac: `pairing.ts:1115-1130`, `:1370-1381`, `:1590-1600`, `:1736-1760`; `ipc.ts:2323-2328`, `:2338-2355`, `:2364-2375`; `core.ts:2216-2236`; `reconcile-plan.ts:302-324` | unchanged (`alertsCanSend` `ipc.ts:2351`) |

Also read, and relied on below:
- `DoorClient` holds ONE request per connection except a Terminal's three kept lines (`Door/DoorClient.swift:35-53`), each
  owned by one `PairedScreenDoor` (`App/TortieApp.swift:1137-1218`). **Nothing pools connections across doors**, which
  matters because the DEBUG endpoint seam dials every door on one loopback port (`Door/Transport.swift:60-93`). Keep it so.
- The project uses file-system synchronized groups (`project.pbxproj:44-63`): a new Swift or test file needs no project
  edit; the only project edit is the build number.
- `SessionsWords` is `Equatable` (`Screens/SessionsChoices.swift:68`), which D17 compares.
- The public name is lowercase ASCII `[a-z0-9-]` labels ending `.ts.net` (`Door/DoorClient.swift:147-166`): no homoglyph,
  no bidi text can be a Mac's name.
- Floors on origin/main `6d485575`: **`HELPER_USER_FLOOR` is 173, not 174** (`build/assert-electron-teardown.mjs:496`),
  `SIMULATOR_USER_FLOOR` 3 (`build/assert-simulator-teardown.mjs:168`). This phase raises each by one (§4.9).

---

## 3. The design

### 3.1 Storage, `ios/Tortie/Door/Keys.swift` (builder **keys**)

`SecretStore` gains ONE requirement, no default:

```swift
/// Every account under this store's service. Throws on any status but success and not-found.
func accounts() throws -> [String]
```

`KeychainSecretStore.accounts()`: `SecItemCopyMatching` over `kSecClassGenericPassword`, the service,
`kSecAttrSynchronizable: false`, `kSecUseDataProtectionKeychain`, `kSecMatchLimitAll`, `kSecReturnAttributes`;
`errSecItemNotFound` is `[]`.

`PairingStore` (the API every other builder codes against, fixed here):

```swift
static let account = "pairing-v2"          // the first Mac's; build 10 reads it
static let accountPrefix = "pairing-v2-"   // + 16 lowercase hex the phone makes
static let formerAccount = "pairing-v1"    // removed on sight, as today
static let macLimit = 4

func loadAll() -> [PairedDoor]             // D9's order, at most four, D11's rules
func load() -> PairedDoor?                 // loadAll().first (existing callers compile)
func admits(_ name: String) -> Bool        // D12
@discardableResult func save(_ door: PairedDoor) throws -> String   // D10; answers the account
func forget(name: String) throws           // Unpair of one Mac
func forget() throws                       // every record, then every tag (fresh install, the DEBUG seam)
func holdsRecord(name: String) -> Bool     // true when it reads back OR the read throws, as today's
var holdsRecord: Bool                      // any record kept, the same rule
func sweepOrphans()                        // D11, at launch only
func forgetOnFreshInstall(_ mark: InstallMark) -> Bool   // unchanged, calls forget()
```

The rules, each a test in `PairingStoreTests` (§5.3):
1. **Accounts read**: `pairing-v2` and `pairing-v2-` + exactly 16 lowercase hex. Any other account under the service is
   never read and never removed, except `pairing-v1`, removed on sight as today.
2. **`loadAll`**: a record that does not decode is removed by its own account (`secrets.remove(account)`) and nothing else
   is touched; duplicates by name keep the later `pairedAt`; past four, the rest are removed; order D9.
3. **`save`**: a kept record with the same name (ASCII compared, the name is already lowercase) is replaced in ITS account;
   else `pairing-v2` if free; else a fresh `pairing-v2-<16 hex>` not already present. A fifth name throws (the flow then
   ends `.couldNotSave`). After the write, the replaced record's tag is deleted when it is not the new record's tag and no
   other kept record names it.
4. **`forget(name:)`**: THE RECORD FIRST, `try secrets.remove(<its account>)`; only then its tag, and only when no other
   kept record names that tag. A name no record holds is a no-op.
5. **`forget()`**: every kept account's `try secrets.remove` FIRST (each with `try`), `pairing-v1` with `try?`, then every
   client tag `clientKeys.tags()` lists. With one record this is today's `forget()` exactly.
6. **`sweepOrphans()`**: lists the accounts and reads every one; on ANY thrown error it deletes nothing. Otherwise every tag
   in `clientKeys.tags()` that no decodable record names is deleted. Called ONCE, from `AppModel.launch()`, right after
   `forgetOnFreshInstall` and before `LiveDoor` or `AppModel` exist.
7. The record's bytes and `Record` struct do not change (D8). `decode` does not change.

`PairingFlow` does not change: it still calls `try store.save(door)` after the first signed read (`Door/Pairing.swift:539`).

### 3.2 `ios/Tortie/Door/Pairing.swift` (builder **keys**): one line

`PairingFailure` gains `case macLimit` ("This iPhone already keeps four Macs and this code is not one of them"). Nothing
else in this file moves; `gate:onlyadd` reads it (P0 must still parse it whole).

### 3.3 The seam, `ios/Tortie/Screens/DoorWords.swift` (builder **app**)

- `PhoneDoor` gains a REQUIREMENT `func pairedReaders() -> [any DoorReading]` with an extension default
  `pairedReader().map { [$0] } ?? []` (a requirement, so `any PhoneDoor` dispatches to the app's own, the same reason as
  `writer`, `:28-37`). `unpair()` becomes `func unpair(name: String) -> UnpairOutcome`. `pairedReader()`, `begin`, `pair`
  and `forget()` stay.
- `PairedFacts` gains `publicName` (the whole public name, no port). Public facts only, as today.
- `DoorWords.pairingSentence(for:keepsOthers:)`, `keepsOthers` defaulting false: `.macLimit` is `Copy.macLimit`;
  `.couldNotSave`, `.notAvailable`, `.cancelled` are `Copy.notPairedHere` when `keepsOthers`, else today's `Copy.notPaired`.
  Never empty (rule v).

`LiveDoor` (`App/TortieApp.swift:1230-1285`, builder **app**):
- `pairedReaders()`: `store.loadAll()` mapped to `PairedReader`.
- `begin`: `let offer = try PairingOffer.parse(payload)` (the line rule (p) names, unchanged), then
  `guard store.admits(offer.door.name) else { throw PairingFailure.macLimit }`, then `flow.begin`.
- `unpair(name:)`: `do { try store.forget(name: name) } catch { return .kept }`, then
  `store.holdsRecord(name: name) ? .kept : .forgotten`.
- `forget()` (the DEBUG seam): `try? store.forget()`, every Mac.

### 3.4 The app, `ios/Tortie/App/TortieApp.swift` (builder **app**)

```swift
enum AppTab { case needsInput, sessions, settings, macs }
enum Route: Hashable {
    case session(mac: String, id: String, name: String)
    case catchUp(mac: String, id: String, honestLine: String?)
    case alerted(mac: String, id: String)
}
@MainActor @Observable final class MacSpace: Identifiable {
    let id: String                 // the whole public name (D2)
    let reader: any DoorReading
    let list: ListModel
    var sessions: SessionsModel    // replaced only by D17
    var waitingPath: [Route]
    var sessionsPath: [Route]
    var settingsLine: String?      // Unpair's "Nothing was changed."
}
```

`AppModel` holds `spaces: [MacSpace]` in D9's order and `chosenId`. **The members screens use today stay** and read the
chosen space (`list`, `sessions`, `reader`, `waitingPath`, `sessionsPath`, `settingsLine`, `waitingBadge`), so
`SettingsScreen`, `ListScreen` and `SessionsScreen` call sites do not change. New: `chosen`, `showsMacs` (root `.reading`
and `spaces.count >= 2`), `choose(_ id:)`, `drawnName(_:)`, `otherMacsWaiting`, `readOtherMacs()`, `readAllMacs()`,
`pairAnotherMac()`, `endPairAnother()`, `anotherPairing: PairingModel?`, `refused(mac:)`.

- **Launch**: `forgetOnFreshInstall`, then `PairingStore.keychain.sweepOrphans()`, then `LiveDoor`. `init` builds a space per
  `door.pairedReaders()`; root `.reading` when any, chosen the first; keeps the launch code either way (D19).
- **`paired(_:first:)`** (from Pairing, root `.pairing`): today's, building the one space.
- **The sheet**: `pairAnotherMac()` makes a fresh `PairingModel(door:label:alerts:keepsOthers: true, paired:)` whose
  `paired` calls `pairedAnother(_:first:)`: the space with that public name is replaced (new reader, list adopting `first`,
  a new `SessionsModel`, empty paths) or a new one added; the order re-read from `door.pairedReaders()`'s names; chosen =
  it; `tab = .needsInput`; the sheet closes; `checkAlertAddress` asked again. `endPairAnother()` calls the model's
  `cancel()` and drops it. RootView's `.reading` case presents it with `.sheet` (onDismiss → `endPairAnother()`), the
  content a `NavigationStack` holding `PairingScreen(model:seeSample: nil)` with a `.cancellationAction` `Copy.cancel`,
  identifiers `pair-another-sheet` and `pair-another-cancel`. The DEBUG code in the `.reading` root's `.task`:
  `if let code = app.takeLaunchCode() { app.pairAnotherMac(); await app.anotherPairing?.read(code) }`; that last line
  spelled EXACTLY so (rule p names it).
- **`choose(_ id:)`**: chosen = id; `tab = .needsInput`; `alertPermission = nil`; the D17 check (a new `SessionsModel` when
  `space.sessions.words != choices.load()`).
- **`refused(mac:)`** (every `ReadRouting.pairAgain` built for a space calls it): D18.
- **`backToList(in:)`**, **`backToList(saying:)`**, `open`, `openCatchUp`, `isTop`, `listIsTop`, `push`, `path`: as today,
  on the chosen space, every Route built with `mac:` = the chosen space's id.
- **Taps**: `openFromAlert` (D24) through ONE function `alertTarget() -> MacSpace?`: one space → it; else the spaces whose
  `reader.alerts.macSends` is true, the one when exactly one, else nil. A target is chosen, `tab = .needsInput`, and its
  `waitingPath` set as today; nil leaves the chosen Mac, `tab = .needsInput`, its `waitingPath = []`.
- **`checkAlertAddress`**: for EVERY space, today's body over that space's reader and list (D25).
- **`readAlertPermission`**: today's guard, over the chosen space.
- **`unpair()`**: on the chosen space; `door.unpair(name: chosen.id)`; `.kept` → that space's `settingsLine`; `.forgotten` →
  D23's guard around the ONE `forgetting = Task { await alerts.forgetAddress() }`, then: no space left → today's
  `lostPairing()` (Pairing); else the space removed, chosen = the first left, `tab = .needsInput`.
- **`cameToForeground`**: today's, plus `readOtherMacs()` when `showsMacs`. **RootView's launch `.task`**: today's
  `checkAlertAddress()`, plus `readOtherMacs()` when `showsMacs`.
- **`openSample` / `leaveSample`**: D26.
- **`tabs(...)`**: the three tabs exactly as today (labels, symbols, order), their stacks bound to the chosen space's paths
  and each carrying `.id(chosen.id)`; then `if app.showsMacs { Tab(value: AppTab.macs) { NavigationStack { MacsScreen(app:
  app) } } label: { Label(app.drawnName(chosen), systemImage: "desktopcomputer") } .badge(app.otherMacsWaiting) }`. When
  `showsMacs` turns false while `tab == .macs`, `tab = .needsInput`.
- **`destination(_:tab:)`**: the reader is `app.space(route.mac)?.reader` and nothing else; nil draws nothing.

`ListModel` (`Screens/ListScreen.swift`, builder **app**) gains `func drawRefused(_ sentence: String)` (state
`.failed(sentence)`, nothing else). `SessionsModel` is not edited: its refusal path reads the list's `.failed` state
(`Screens/SessionsScreen.swift:416-438`) and draws the same sentence.

### 3.5 What each tab shows for the chosen Mac

| Tab | One Mac kept | Two or more |
| --- | --- | --- |
| Needs input | today | the chosen Mac's `/v1/blocked` waiting rows, title `Needs input`, badge its count (D6) |
| Sessions | today | the chosen Mac's `/v1/sessions` (or today's list for an older Mac), its own filters, the three stored words |
| Settings | today + the Pair another Mac row | the chosen Mac's card (D21's name), its Alerts card if it sends, Pair another Mac, Unpair (this Mac), See a sample, About |
| Macs | not drawn | every Mac, the chosen ticked, each one's line (D14); badge: the others' waiting sum |
| a pushed session | today | the session on the Mac whose row was tapped; the tab bar stays, so the Macs item still names the Mac |

### 3.6 Settings and the sheet (builder **app**)

`SettingsRows` gains `pairAnother` (root `.reading`; never in the sample). The row sits after the Alerts card (or the Mac
card when there is no Alerts card) and before Unpair, identifier `settings-pair-another`, press `app.pairAnotherMac()`.
The Mac card draws `app.drawnName` for the name line; everything else as today. `PairingModel` gains
`keepsOthers` (default false; its resting line and `pairAgain()` line are `Copy.notPairedHere` when true, else
`Copy.notPaired`), passes it to `DoorWords.pairingSentence`, and gains `cancel()`, which cancels the attempt it holds (it
keeps the pairing's `Task`). `PairingScreen(model:site:seeSample:)` takes `seeSample: (() -> Void)?`; nil draws no See a
sample.

### 3.7 Words, identifiers, the mock

New `Copy` words, each one `static let` with its `/// Phone:` ledger line (`Style/Copy.swift:1-34`), builder **app**:

| Name | Words | Why no Mac surface says it |
| --- | --- | --- |
| `macs` | `Macs` | the phone's switcher; the Mac lists machines, not Macs |
| `pairAnotherMac` | `Pair another Mac` | the phone's own row |
| `macLimit` | `This iPhone is paired with four Macs. Unpair one to pair another.` | the phone's cap (D12) |
| `notPairedHere` | `This iPhone is not paired with this Mac.` | a kept Mac's refused list, and the sheet's resting and not-paired lines (D16, D18) |

`Copy.thisMac`'s note (`:371-374`) moves on purpose: "the Settings card for the Mac on screen". No other word changes.
`Copy.needsYourInput` is reused on the Macs screen.

New identifiers (`Screens/Identifiers.swift`, with its table): `screen-macs`, `macs-title`, `macs-row-<i>`,
`macs-row-name-<i>`, `macs-row-line-<i>`, `macs-row-chosen-<i>` (i from 0 in D9's order), `settings-pair-another`,
`pair-another-sheet`, `pair-another-cancel`. A tab button has no identifier (`Identifiers.swift:19-21`); the Macs tab is
found by its label, the chosen Mac's drawn name.

The mock (builder **gates**): `docs/design/phone/Macs.html` (two Macs: the bar's four items with both badges, the Macs
screen with the chosen row ticked and the other saying `Needs your input (2)`, and Settings with Pair another Mac),
`docs/design/phone/Settings.html` gains the row, `index.html` lists Macs.html. `conformance:phonecopy` then owns every word
it draws: the Copy words above, and the Mac names as DATA with their reason.

### 3.8 One Mac kept: byte for byte

With one Mac kept: three tabs, the same labels, symbols, identifiers and frames on every screen; no Macs tab; no extra read;
Pairing (when no Mac is kept) exactly as today, See a sample included; every refusal, alert tap and Unpair exactly as today.
The ONE difference is Settings' row, and every element under it moves down by exactly
`Frame.linkRowHeight + Frame.cardGap` = 54 + 12 = **66 points** (`Screens/Pieces.swift:47`, `:56`). The probe's P1 holds
this element by element against build 10 (§5.4).

### 3.9 What does not move

`src/**`; `Door/Contract.swift`, `Door/DoorClient.swift`, `Door/Signing.swift`, `Door/Transport.swift`; `Screens/SessionsScreen.swift`
and `Screens/SessionsChoices.swift`; the record's bytes; `vectors.json`; the frozen sets and `launch.wire.json`; the alert
payload and `AlertTap.parse`; `Alerts/SystemAlerts.swift`; `DebugLaunchSeam.carried`; rule (d)'s list and `test-ios.mjs`'s
`DEBUG_SEAM_ARGUMENTS`; the Terminal, Catch Me Up, End, the reply and the keys.

---

## 4. The gates, clause by clause (builder **gates**, unless named)

Every clause below that moves gets at least one arm in `ablation:p316` that turns it red, beside a control that stays green.

1. **(b) the tab bar** (`ruleTabs`, `:4145-4226`): the three `Copy`-labelled tabs in order as today, then AT MOST one more
   `Tab(`, the Macs tab: inside an `if` reading `showsMacs`, labelled by no literal and no `Copy` word (the drawn name),
   symbol `desktopcomputer`. A fifth, a Macs tab outside that `if`, or a literal label is red. `NAV_BAR_ROOTS` (`:4053`)
   gains `Screens/MacsScreen.swift`.
2. **(n) the deleters** (`ruleDeleters`): `.delete(tag:` outside `KeychainClientKeys` only in `PairingStore.forget()`,
   `forget(name:)`, `save`, `sweepOrphans` and `PairingFlow.run`'s failed ending; `secrets.remove(` only in `PairingStore`;
   `forget()` called only by `forgetOnFreshInstall` and `LiveDoor.forget`, `forget(name:)` only by `LiveDoor.unpair`;
   `loadAll` and `load` call neither and delete no tag; in `forget(name:)` and `forget()` every record's `try
   secrets.remove(` comes before any `delete(tag:`; `LiveDoor.unpair` calls `try store.forget(name:` in a `do` whose
   `catch` answers `.kept`, then asks `store.holdsRecord(name:`. `sweepOrphans` deletes only after a read that threw
   nothing (its loop behind no `try?` of `accounts()` or `read(`).
3. **(x)**: `forgetAddress()` still once, in `AppModel.unpair`'s `.forgotten` arm, inside D23's condition (a test of no
   space left, or of the unpaired space's `alerts.presented`); `readAlertPermission` behind the chosen space's `macSends`.
4. **(p)** `KEY_NAMED` (`:2372-2448`) gains `await app.anotherPairing?.read(code)` in `App/TortieApp.swift`, uses 1, its why.
5. **(v)**: `pairingSentence(for:keepsOthers:)` answers a `String` for every case, `.macLimit` included; the model's line is
   never cleared.
6. **az5**: `leaveSample` names the door once, as `door.pairedReaders()`, behind `sampleFrom == .reading`.
7. **`APP_SHARED_STATE`**: `PairingStore.keychain`'s why becomes "the Keychain's pairing store, one record per Mac (Phase 345)".
8. **(s)**: `PHONE_BUILD` `'11'` (D27), the "not uploaded" fixtures `12`, the five configurations 11.
9. **(t)**: `hostile-door.mjs` names the `twin` arm (§5.4), with `--name` and `--alerts`.
10. **NEW (ba) EACH MAC IS ITS OWN SPACE**: ba1 every `Route` case carries `mac:` and every construction in the app names
    it; ba2 `destination` reads its reader from the route's `mac` through one lookup and from nothing else, and no read or
    write anywhere is resolved by matching a session id across spaces; ba3 every `NavigationStack` in `tabs` carries
    `.id(`; ba4 `pairedReader()` is called only by `PhoneDoor`'s extension default (the app uses `pairedReaders()`); ba5
    `macSends` is read only in `alertTarget`, `checkAlertAddress`, `readAlertPermission` and Settings' drawing; ba6 the
    Macs tab's badge is folded through `DoorNumber.sum` (no `+`, so rule (k) gains no entry); ba7 `macLimit`'s literal 4 is
    declared once; ba8 every account the store writes is `account` or `accountPrefix` plus 16 hex the phone made, and no
    record field flows into an account string; ba9 `sweepOrphans()` is called once, in `AppModel.launch`, before `LiveDoor(`.
11. **`test:ios`** (`build/p316/test-ios.mjs`): `P345_SUITES = ['PairingStoreTests', 'MultiMacKeychainTests', 'MacsTests',
    'DoorKeychainTests', 'UnpairKeychainTests', 'UnpairTests', 'TabsTests', 'SettingsTests', 'AlertsTests',
    'SampleAppTests']`, each required in xcodebuild's own suite lines, with its `suitesNotRun` self-test. The DEBUG seam list
    does not move (D19).
12. **`conformance:phonecopy`** (`build/p311/copy-drift.mjs`): the four new words owned; Macs.html's Mac names as data;
    the owned-rule floor raised by what is added.
13. **`gate:onlyadd`**: P0 parses `Pairing.swift` (one enum case added) and the two untouched Sessions files; P4 prints
    whether today's wire equals the frozen set, and it must (no wire moves).
14. **Floors** (builder **probe**): `HELPER_USER_FLOOR` 174 (173 on main), `SIMULATOR_USER_FLOOR` 4 (3 on main), each
    naming `build/p345/probe-p345.mjs`; `build/verification-checks.mjs` classifies `probe:p345` both ways (`gate:checks`).

---

## 5. The proof, run rather than read

### 5.1 The battery (the integrator, §8)

`typecheck`, `build` (with `conformance:ios`, `gate:simulator`, `gate:checks`, `gate:electron`, `gate:background` inside),
the whole vitest under a scratch HOME, `conformance:ios`, `ablation:p316`, `conformance:phonecopy`, `gate:onlyadd`, the four
gates again by name, `hostile-door.mjs --self-test`, `probe:p345 --grader-self-test`, and `test:ios` on iOS 26.3 and on
`P316_RUNTIME=18.3`, Debug and Release each as `test:ios` runs them, with `--read-app` finding no DEBUG seam in Release.

### 5.2 XCTest (builders **keys** and **app**)

- **`PairingStoreTests`** (new, in memory): every rule of §3.1, one test each, including: one record behaves exactly as
  today's one-record store (save, load, forget, holdsRecord); a second Mac goes to a fresh account and `pairing-v2` is
  untouched; a re-pair replaces in place and deletes the old tag; a corrupt record removes only itself and no tag; a
  duplicate name keeps the later; a fifth name refused by `admits` and by `save`; `forget(name:)` removes the record
  before its tag, and a failing remove touches nothing; a tag two records name survives one's forget; the sweep deletes an
  orphan and deletes nothing when any read throws; account names are the two shapes and none is a record field; build
  10's `encode` (today's, unchanged) reads back.
- **`MultiMacKeychainTests`** (new, the Simulator's own keychain under a TEST service, never the app's): three records
  written, one overwritten with bytes that do not decode, `loadAll` answers the other two in order, the corrupt account is
  gone, both other tags still answer their identities; `accounts()` lists exactly what was written; everything removed in
  `tearDown`. **This is the matrix's "one corrupt record" row**, on both runtimes.
- **`DoorKeychainTests`**: `testThePairingStoreKeepsOnePairing` rewritten to the per-Mac promise; **`UnpairKeychainTests`**:
  Unpair of one of two leaves the other's record and identity; Unpair of the last leaves nothing; **`DoorInstallTests`**: a
  fresh install forgets every record and every tag; **`UnpairTests`**: `LiveDoor.unpair(name:)` over the refusing and
  sticky stores; **`DoorPairingTests`**: the stores implement `accounts()`, the flow saves through the multi store.
- **`MacsTests`** (new, builder **app**): spaces built in order; `showsMacs` false with one Mac, true with two; choosing
  moves `tab` to Needs input and keeps each space's paths; the two badges (D6) over loaded, failed and loading lists,
  including a nil sum drawing none; D17's new model only when the words differ; D18 with one Mac (Pairing, record kept)
  and with two (only that space blanked); D21's names; D24 every row (one Mac any `macSends`; two with one sender; two with
  none; two with two); D23 every row with a recording `PushAddressing` (no Mac left; unpaired holds the address; unpaired
  holds none while another sends; exactly one `forgetAddress` per Unpair); a route of a Mac no longer kept draws nothing;
  the launch code with a pairing kept opens the sheet; Cancel cancels and deletes the attempt's key; the cap sentence.
- **`TabsTests`, `SettingsTests`, `AlertsTests`, `SampleAppTests`, `ScreensModelTests`, `TerminalRouteTests`,
  `DoorWordsTests`, `CopyTests`, `ScreensFixtures`**: moved to the Route's `mac:`, the new `PhoneDoor` members, Settings'
  row, See a sample's restore of the chosen Mac, and the four words.

### 5.3 `probe:p345`, THE TWO-DOOR MATRIX AND THE ATTACK (builder **probe** writes it; the verifier drives it)

`build/p345/probe-p345.mjs`, run as `npm run probe:p345` through `build/harness-socket.mjs --fresh gmux-p345`. Verifiers
only, under ONE lock slot. Exit 0 every arm passed, 1 an arm failed, 2 it could not run or an arm could not be READ.
`--grader-self-test` grades recorded fixtures (each grader shown red on a broken one) and starts nothing.

**What is real.**
- **Two Macs, two Electrons at once**, each through `withElectron`, each on its own scratch profile and HOME and its own
  scratch tmux socket (`gmux-p345a-<pid>` and `gmux-p345b-<pid>`, refusing `gmux` and `default`, each ended by the
  teardown), the quiet `agents.json` before each launch and `agents:list` read back. **Mac A, "studio"**:
  `p345-studio.tail00000.ts.net`, its door published through its OWN stand-in Tailscale (`build/p330/tailscale-standin.mjs`
  behind a scratch wrapper named by `GMUX_TAILSCALE_BIN`, preflighted by sha256), its name answered by its own
  `build/p332/dns-standin.mjs` (named by `GMUX_POCKET_NAME_SERVERS`), and its ALERTS ARMED as probe:p316's N arms arm them:
  Phase 314's APNs stand-in in this process, a scratch P-256 key under `GMUX_HARNESS_ALERTS`, chosen through the bridge and
  deleted in the `finally`, the alerts switch on before the window opens. Sessions: one shell `a-shell` and one `claude`
  stand-in `a-ask` printing the committed Phase 312 dialog (1 waiting). **Mac B, "laptop"**:
  `p345-laptop.tail00000.ts.net`, its own stand-in and DNS stand-in, no alerts key; `b-shell` and two `claude` stand-ins
  (2 waiting), so every badge is told apart.
- **Node doors** (`build/p316/hostile-door.mjs`, each its own process, ended in the `finally`): `twin`
  (`--arm twin --name p345-studio.tail99999.ts.net --alerts`), `C` (`--arm honest --name p345-cmac.tail00002.ts.net`), `D`
  (`--arm honest --name p345-dmac.tail00003.ts.net`).
- **The SNI relay** (`build/p345/sni-relay.mjs`, in this process): ONE loopback port the app dials through
  `-TortieDebugDoorEndpoint 127.0.0.1:<port>`; it reads each connection's TLS ClientHello server name and forwards the bytes
  whole to that door's CURRENT backend (a Mac's stand-in forwarder, re-read per connection, or a node door's port). Per
  name it counts connections and request records (`tlsRecordTally`, `build/p316/probe-p316.mjs:1503`) and can be set to
  `pass`, `close` (accept, then close) or `hold` (accept, never answer). **The relay's per-name counts are each Electron
  door's "log of who asked"**; a node door logs every request with its route, the session id it names, its SNI and the
  client pin. A name the relay does not know is closed and counted as `unknown`.
- **The phone**: HEAD's DEBUG app and, with `P345_PARENT_CHECKOUT` (a built checkout of build 10's code: `24097f39` or
  `5f5efba2`), the parent's, each built by `xcodebuildRun` into the probe's scratch; driven by each build's own
  `P316DriveUITests/testDrive`; Simulators through `withSimulator`, one at a time: the ORDER device on iOS 26.3, the FLOOR
  device on iOS 18.3 (badges are read there: iOS 26's glass bar does not give XCUITest the number).
- **NO** real Tailscale (a per-second process sample fails the run on one), no real DNS (main's UDP sampled), no Apple, no
  vendor agent, no model turn, no photograph.

**New UI drive steps** (appended to `ios/TortieUITests/P316DriveUITests.swift`; every existing step unchanged):
`pair-another:<b64url code>` (terminate; launch with the carried seams and the code, NO forget; the sheet's fingerprint
printed; iOS's alert question answered as `pair` answers it; wait for the sheet to close onto a list, or for its line;
dump `pair-another-end`), `pair-another-press` (Settings, Pair another Mac, the sheet dumped, Cancel, Settings dumped),
`macs:<b64url label>` (the Macs tab by its label, the screen dumped), `choose-mac:<i>` (`macs-row-<i>` pressed, Needs
input waited for, dumped), `macs-pull`, `unpair-one` (as `unpair`, landing on `screen-needs-input`, not Pairing).

**The arms.** Every arm reads the phone's drawn screens (labels and frames) AND the doors' own counts or logs. A step whose
screen never came is UNREADABLE, never a pass.

| Arm | Device | What is driven | Graded on |
| --- | --- | --- | --- |
| **U0** upgrade | 26.3, 18.3 | the PARENT app pairs A; the parent's drive dumps Needs input, Sessions, `a-shell`'s Terminal, Catch Me Up and Settings; at `sessions-mark:upgrade` HEAD's app is installed OVER it; `relaunch-keep`; the same dumps | lists drawn with no Pairing; A's next requests on the relay carry on, and A's door still lists one phone (no second phone appeared); the measurement of §12 M1 and M2, now parent to HEAD |
| **P1** one-Mac parity | 26.3, 18.3 | U0's dumps before and after | every element's id, label and frame equal on Needs input, Sessions, the Terminal and Catch Me Up; Settings equal above the Pair another Mac row and moved exactly 66 pt below it; three tab buttons; no `screen-macs`; 0 requests on any other name |
| **AL1** one Mac's alert | 26.3 | `a-ask2` blocks on A; the APNs stand-in's recorded body delivered by `handle.push`; tapped | the session opens, as probe:p316's N4 |
| **T1** a second Mac | 26.3, 18.3 | `pair-another:<B's code>`; the probe presses Allow on B through the bridge after comparing fingerprints | the sheet's fingerprint is B's sheet's; the sheet closes onto B's Needs input (B's two rows); four tab buttons, the fourth labelled `p345-laptop`; on 18.3 the Needs input badge 2 and the Macs badge 1 |
| **T2** switching | 26.3, 18.3 | `macs` then `choose-mac:0` (A), open `a-shell`, one key; back to Macs, `choose-mac:1` (B), Sessions; `choose-mac:0` again | the Macs rows in order with A's `Needs your input (1)`, B's `(2)`, the tick moving; each Needs input and Sessions answer is that Mac's (graded on the node reader's own reads of each door); the key reaches A's pane only; between the marks the relay counts requests on A's name only while A is chosen, except D7's reads of B; returning to A draws A's place |
| **T3** Settings per Mac | 26.3 | `settings` with A chosen, then B | A: its name, address, fingerprint (the Mac's row), the Alerts card; B: its own, no Alerts card; Pair another Mac on both |
| **AL2** an alert from the Mac not on screen | 26.3 | B chosen; `a-ask3` blocks on A; delivered; tapped | A chosen, its session opened; B's paths unchanged |
| **S1** asleep, door off | 26.3 | `pocket.setDoor(false)` on B; pull B's Needs input; Macs; door on; pull | B draws `Tortie could not reach your Mac.` with its note; A's lists and requests unaffected; B's Macs row says the sentence; B draws again after |
| **S2** asleep, no answer | 26.3 | the relay holds B; return to the foreground with A chosen | A's Needs input drawn within 5 s; after 15 s B's Macs row says `Your Mac did not answer in time.`; nothing waited on B |
| **CAP** four Macs | 26.3 | pair C, then twin (four); `pair-another:<D's code>`; then a NEW code from C | D: the sheet says `Copy.macLimit` and D logs 0 `POST /pair`; C's new code pairs at four and the Macs rows stay four |
| **H** the attack | 26.3 | twin: claims alerts, shares A's first label; `twin-mirror` lists A's session ids; open twin's `a-ask` row, then A's; a key in A's Terminal; `a-ask4` blocks on A and its alert is tapped; `twin-refuse` | full public names drawn for A and twin on the Macs tab and screen; twin's open logged by twin alone, A's by A alone (relay count on A's name unmoved by twin's open); the key on A's pane, no `/v1/keys` at twin; the tap lands on the chosen Mac's Needs input with nothing pushed and twin logs no `/v1/session` for that id; refused, twin's space draws `This iPhone is not paired with this Mac.`, A unaffected, never Pairing. STATED, not failed: twin was handed the phone's DEBUG alert address, as one hostile Mac is today |
| **HN** a forged name | 26.3 | a code naming A's WHOLE name with twin's pin, through the sheet | the sheet says `Copy.keyMismatch`; A's next requests unaffected; the Macs rows unchanged |
| **DG** downgrade | 26.3 | with A and B kept, the PARENT app installed over; `relaunch-keep`; then HEAD again | the parent draws A alone, as in P1's parent dumps; HEAD again draws both Macs |
| **RM** Remove on one | 26.3 | Remove the phone on B's Electron | B's lists `This iPhone is not paired with this Mac.`; A unaffected; never Pairing |
| **RP** re-pair | 26.3 | a new window on B; `pair-another:<B's new code>` | B draws again; still four rows; B now LAST in the order (D9, stated) |
| **UP** Unpair one | 26.3, 18.3 | B chosen; `unpair-one`; `idle:20`; `relaunch-keep`; then Unpair twin and C, down to A | lands on A's Needs input; 0 connections on B's name in the 20 s; after the relaunch no B row; B's Electron still lists the phone; at one Mac: three tab buttons and Settings as P1's HEAD dump |
| **R1, U1** | as probe:p316 | `npm run probe:p316` with `P316_ARMS=order,floor` (the verifier) | unchanged, one Mac |
| **RUN** | — | — | no real Tailscale, nothing forbidden at either stand-in, every stand-in, door and relay ended, both Electrons ended, `p316-` devices 0, history unmoved |

The "one corrupt record" row is `MultiMacKeychainTests` on both runtimes (§5.2): the probe has no way into the keychain and
adds no seam for one.

### 5.4 What the verifier must produce (Tier 3)

- The battery once, red items named.
- `probe:p345` at HEAD with `P345_PARENT_CHECKOUT` (U0, P1, DG need it; without it they read UNREADABLE and the run exits 2).
- **Independent method 1, the parent measured**: U0, P1 and DG, which hold build 10's own drive and dumps beside HEAD's.
- **Independent method 2, the attack**: H and HN, plus at least two plants of the verifier's OWN against the app in a
  scratch clone (for example a `destination` that resolves the reader by session id, a refusal that calls `lostPairing()`
  with two Macs, a sweep that runs after a failed read, a `forgetAddress` behind the entry's rule), each turned red by a
  named test or rule.
- **The matrix over real data**: every row of §5.3 on two REAL Electron doors.
- `test:ios` on 26.3 and 18.3 (MultiMacKeychainTests among the suites).
- `git diff 24097f39 -- src/` empty; history unmoved across every command; `p316-` devices 0; Electron count 0.

### 5.5 No regression against today

The verifier's side by side: P1 and DG (every screen with one Mac equals build 10's but for the one row), R1 and U1
unchanged, and AL1 equal to probe:p316's N4. Any scenario worse than build 10 with one Mac is a needs_work.

### 5.6 His checklist row (`build/p345/CHECKLIST.md`, builder **probe**)

His phone, on the public build, upgraded from TestFlight to this build: still paired, every screen as before, Settings
showing Pair another Mac. Then pair his second Mac from it: the Macs item appears named after the Mac on screen, each Mac
switches with one tap, and an alert from his sending Mac opens its session.

---

## 6. The CHANGELOG item (builder **gates**, under `## Unreleased`, `### Added`)

- Your iPhone can pair with up to four Macs: Pair another Mac is in Settings, each Mac keeps its own Needs input, Sessions
  and Settings, and a Macs tab at the bottom switches between them and marks one with a session waiting. Alerts still come
  from the one Mac that sends them.

(The commit link is added by the follow-up docs commit, CLAUDE.md "Release notes".)

---

## 7. Builders, disjoint files

| Builder | Owns | Task |
| --- | --- | --- |
| **keys** | `ios/Tortie/Door/Keys.swift`, `ios/Tortie/Door/Pairing.swift`, `ios/TortieTests/DoorKeychainTests.swift`, `ios/TortieTests/UnpairKeychainTests.swift`, `ios/TortieTests/DoorInstallTests.swift`, `ios/TortieTests/DoorPairingTests.swift`, `ios/TortieTests/UnpairTests.swift`, `ios/TortieTests/DoorTestKeys.swift`, `ios/TortieTests/PairingStoreTests.swift` (new), `ios/TortieTests/MultiMacKeychainTests.swift` (new) | §3.1, §3.2, the store's tests in §5.2 |
| **app** | `ios/Tortie/App/TortieApp.swift`, `ios/Tortie/Screens/DoorWords.swift`, `ios/Tortie/Screens/SettingsScreen.swift`, `ios/Tortie/Screens/MacsScreen.swift` (new), `ios/Tortie/Screens/PairingScreen.swift`, `ios/Tortie/Screens/ListScreen.swift`, `ios/Tortie/Screens/Identifiers.swift`, `ios/Tortie/Style/Copy.swift`, `ios/TortieTests/TabsTests.swift`, `ios/TortieTests/SettingsTests.swift`, `ios/TortieTests/AlertsTests.swift`, `ios/TortieTests/SampleAppTests.swift`, `ios/TortieTests/ScreensFixtures.swift`, `ios/TortieTests/ScreensModelTests.swift`, `ios/TortieTests/TerminalRouteTests.swift`, `ios/TortieTests/DoorWordsTests.swift`, `ios/TortieTests/CopyTests.swift`, `ios/TortieTests/MacsTests.swift` (new) | §3.3 to §3.8, the app's tests in §5.2 |
| **gates** | `build/conformance-ios.mjs`, `build/p316/ablation-ios.mjs`, `build/p316/test-ios.mjs`, `build/p311/copy-drift.mjs`, `docs/design/phone/Macs.html` (new), `docs/design/phone/Settings.html`, `docs/design/phone/index.html`, `ios/Tortie.xcodeproj/project.pbxproj`, `CHANGELOG.md` | §4 items 1 to 13, the mock, D27, §6 |
| **probe** | `build/p345/probe-p345.mjs` (new), `build/p345/sni-relay.mjs` (new), `build/p345/CHECKLIST.md` (new), `build/p316/hostile-door.mjs`, `ios/TortieUITests/P316DriveUITests.swift`, `package.json`, `build/verification-checks.mjs`, `build/assert-electron-teardown.mjs`, `build/assert-simulator-teardown.mjs` | §5.3, §5.6, §4 item 14; `hostile-door.mjs`'s `--name`, `--alerts` and the `twin` arm (stdin `twin-mirror <b64url ids>` and `twin-refuse`), its self-test extended |

**The seams the integrator reconciles**: the `PairingStore` API (§3.1) between keys and app; `LiveDoor.unpair(name:)`
between app (implements) and keys (`UnpairTests`); the identifiers and the four words between app, gates (rules, mock)
and probe (UI steps); the exact `await app.anotherPairing?.read(code)` line between app and gates (rule p); `twin` and
its flags between probe and gates (rule t). Nobody edits another builder's file; a builder that needs one names the change
in its report.

---

## 8. The integrator's commands

Run in `/private/tmp/wt-p345`, history stat before and after each, `df -h /` first. `S` is the integrator's scratch.
`npm run typecheck`; `npm run build`; `mkdir -p $S/home && HOME=$S/home npm test`; `npm run conformance:ios`;
`npm run ablation:p316`; `npm run conformance:phonecopy`; `npm run gate:onlyadd`; `npm run gate:simulator`;
`npm run gate:checks`; `npm run gate:electron`; `npm run gate:background`; `node build/p316/hostile-door.mjs --self-test`;
`node build/p345/probe-p345.mjs --grader-self-test`; then under the lock, one at a time, `test:ios` with
`P316_SCRATCH=$S/ios-263 P316_DERIVED_DATA=$S/dd-263` and with `P316_RUNTIME=18.3 P316_SCRATCH=$S/ios-183
P316_DERIVED_DATA=$S/dd-183`; then `git diff --stat 24097f39` (exactly §7's files), `git diff 24097f39 -- src/` (empty),
`xcrun simctl list devices | grep -c p316-` (0). It writes "§As built" at the end of this file.

---

## 9. What this sends to him, and to other phases

**Questions** (the main session asks; build with the default meanwhile):
1. The switcher: a fourth tab named after the Mac on screen, which lists the Macs and switches with one tap on a row
   (default), or a tab that steps to the next Mac on each tap with no list?
2. May the phone read the Macs he is not looking at (one short read each, at most three, when the app opens or comes back
   and on the Macs tab) so the Macs tab can mark one with a session waiting? Default: yes.
3. Which Mac does the app open on: the first Mac paired, every launch (default, nothing stored), or the last one he looked
   at (a fourth word kept on the phone)?
4. Show, Group by and Sort by: one choice for every Mac (default), or each Mac its own?

**Other phases.** 333.4.1 (queued, phone): if it lands first it takes build 11 and this phase takes 12 (D27); they share
`P316DriveUITests.swift` and `test-ios.mjs`, so they are not built at once. 333.12 (Mac, running): no shared file. 347.1:
no shared file. 346 (Start) follows 345 and 333.12 and builds its "+" on the chosen Mac's Sessions tab. 337.2 and 337.4
share `probe-p316.mjs` and `P316DriveUITests.swift` and are not built beside this.

---

## 10. What is NOT in this phase

- No Mac change, no route, no hashed field, no QR or `/pair` change, no alert payload; a collapse id, a Mac tag and a badge
  per Mac are 345.1, mentioned and not queued (his answer 3).
- No sessions another Tortie started (his answer 1).
- No merged Sessions list, no Needs input over every Mac (his answer 2 replaced it), no Mac menu on the Sessions title.
- No stored choice of Mac and no per-Mac stored words (Q3, Q4 defaults).
- No Start (346). No release; no TestFlight build of its own.
- No change to the record's bytes, the Terminal, End, the reply, the keys, the markdown or See a sample's content.

---

## 11. Open concerns handed to the verifier

1. **iOS 26's bar with four items and a long label**: a whole public name (D21) truncates in the tab label; the Macs screen
   draws it whole. Read the label's frame on both runtimes.
2. **The `.id(` rebuild on a switch** closes a pushed Terminal's kept lines through its `onDisappear`; the relay should count
   no request on the old Mac's name after the switch beyond D7's list read. A count that keeps rising is a leak.
3. **`sweepOrphans` at launch and an alert's cold launch**: the sweep runs before anything can pair; prove an in-progress
   pairing in the sheet is never swept (it cannot be: the sheet exists only after launch), and that a read error deletes
   nothing (`PairingStoreTests`).
4. **D23's cost** (two Macs that both hold the address) is unmeasured on a device: Release only, and Apple's token after an
   unregister is unknown (research 141 §7). It is stated, not driven.
5. **Two Electrons at once** under load: if either launch times out, re-run once alone before calling it.

---

## 12. What the spec step measured, how, and the numbers

All under `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p345/spec/`, the lock
slot `/private/tmp/tortie-ops/electron.lock` taken as `p345` and released; `df -h /` read 65 to 66 GiB free.

- **M0** `git diff --stat 5f5efba2 24097f39 -- ios/`: `launch.wire.json`, `ScreenScrollerTests.swift`,
  `P316DriveUITests.swift` only; `ios/Tortie/` unchanged since build 10's commit.
- **M1, iOS 26.3.1** (`node upgrade-measure.mjs m1`, exit 0): `build-for-testing` Debug exit 0 in 18,089 ms; device
  `p316-p345u-37429` (`FDBE48AC-…`, iPhone 16 Pro, Face ID) booted in 20,642 ms. **Upgrade arm**: drive exit 0 in 54,762
  ms; paired (`screen-needs-input` in `pair-end`); 1 signed `/v1/blocked` before the mark, verified; `simctl install` over
  it exit 0; `relaunch-keep` drew `screen-needs-input`; 1 signed `/v1/blocked` after, verified, the same client pin.
  **Fresh control**: 41,558 ms; `uninstall` exit 0, `install` exit 0; `relaunch-keep` drew `screen-pairing`; 0 reads after.
  Device shut down and deleted, not listed after.
- **M2, iOS 18.3.1** (the same, `P345_RUNTIME=18.3 … --app <M1's build>`, exit 0; a first attempt wrapped in `timeout`
  exited 127 because macOS has no `timeout`, before anything started): device `p316-p345u-55551` (`46AB3079-…`) booted in
  18,777 ms. Upgrade 53,047 ms: needs-input, 1 verified read after with the same pin. Fresh 40,956 ms: pairing, 0 reads.
  Deleted.
- **M3** origin/main `6d485575` (read only, `git -C /Users/gdc/gmux show`): `HELPER_USER_FLOOR = 173`,
  `SIMULATOR_USER_FLOOR = 3`, `CURRENT_PROJECT_VERSION = 10`.
- **M4** the SDK this Mac builds with: `iPhoneSimulator26.2.sdk`; SwiftUI's `TabContentBuilder.buildIf` is
  `@available(iOS 18.0)` and `Tab(value:content:label:)` exists; the project's `IPHONEOS_DEPLOYMENT_TARGET` is 18.1. So a
  conditional fourth tab builds for the 18.x floor.
- History: `737736 1792023873` and `23166 1790702242` before the first command and after every one. `xcrun simctl list
  devices | grep -c p316-`: 0 at the end. No Electron started.

---

## §As built (the integrator, 2026-10-15)

Integrated in `/private/tmp/wt-p345`, still at base `24097f39`. Nothing was committed, staged or stashed. All logs are in
`/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p345/integrator/logs/`.

**The tree.** `git diff --stat 24097f39` reads 39 tracked files, 4,275 insertions and 654 deletions. The untracked files are
`build/p345/{SPEC.md,probe-p345.mjs,sni-relay.mjs,CHECKLIST.md}`, `docs/design/phone/Macs.html`,
`ios/Tortie/Screens/MacsScreen.swift` and `ios/TortieTests/{MacsTests,MultiMacKeychainTests,PairingStoreTests}.swift`.
These are §7's files, plus two others: `CLAUDE.md` (the integrator's, below) and this SPEC. `git diff 24097f39 -- src/` is
0 lines.

### The seams, reconciled

No builder edited another builder's file, and no seam needed a code change.

- **The `PairingStore` API (keys and app).** The app calls `loadAll`, `admits`, `forget(name:)`, `holdsRecord(name:)` and
  `sweepOrphans` exactly as §3.1 spells them.
- **`LiveDoor.unpair(name:)` (app writes it, keys' `UnpairTests` drives it).** It is §3.3's `do`/`catch` then
  `holdsRecord(name:)`.
- **The identifiers.** The nine new ones (`settings-pair-another`, `screen-macs`, `macs-title`, `macs-row[-name|-line|-chosen]-<i>`,
  `pair-another-sheet`, `pair-another-cancel`) are spelled the same in `Identifiers.swift` and in the UI test's own `Seen`
  copy (`P316DriveUITests.swift:4351-4363`).
- **Rule (p).** `await app.anotherPairing?.read(code)` appears once in `TortieApp.swift`.
- **Rule (t).** `hostile-door.mjs` names `twin`, `--name` and `--alerts`.
- **The four words.** They are in `Copy.swift`, in `conformance:phonecopy` (`MACS_PHONE_WORDS`) and in the mock.

The builders went past the SPEC's text in a few places. Each is accepted as built:

- **keys: the last Mac forgotten.** Forgetting the last Mac deletes every client key and `pairing-v1`, so a one-Mac Unpair is
  build 10's exactly.
- **keys: the sweep.** It spares a tag that a record's raw bytes name even when that record does not decode. A transient
  identity-lookup miss must never sweep a good Mac's key.
- **keys: matching by name.** `forget(name:)` and `holdsRecord(name:)` match on the name in a record's raw bytes.
- **keys: a failed account list.** `loadAll` then reads `pairing-v2` alone, as build 10 does.
- **app: `PairedFacts.publicName`.** It defaults to `""` for the sample's reader.
- **app: refusals and alert taps.** A refusal from a Mac no longer kept moves nothing while other Macs are kept. A tap with
  no target clears the notice on the Mac on screen.
- **gates: (ba3) and the build number.** (ba3) requires `.id(` on all four stacks. The project has SIX `CURRENT_PROJECT_VERSION`
  settings, not five, and all six read 11.
- **probe: the twin's table.** `twin` lives in its own `SECOND_MAC_ARMS` table, so probe:p316's hostile loop never drives
  it.
- **probe: the npm script.** `npm run probe:p345` runs `--preflight` first, so the grader self-test is run through node,
  never through npm.

### What the integrator wrote

- **`CHANGELOG.md`.** The gates builder wrote §6's item verbatim, and the integrator rewrote it in the house style to match
  his ruling: each Mac its own space, switched from a tab at the right of the bottom bar, and Unpair forgetting only the Mac
  on screen. It has no full stop, because the follow-up docs commit adds the commit link.
- **`CLAUDE.md`.** Three rows are widened and one is added:
  - `conformance:ios`: Phase 345's (b), (n), (x), the new (ba) and (s) build 11, with `ablation:p316` at 568 arms.
  - `test:ios`: `P345_SUITES`, `MultiMacKeychainTests` among them.
  - `probe:p316`: one Mac as before, and `SECOND_MAC_ARMS`.
  - `probe:p345` (new): placed after `probe:p3334`, away from the rows main has since edited.

### The battery

Every command below ran in `/private/tmp/wt-p345` and exited 0.

| Command | Seconds | Numbers |
| --- | --- | --- |
| `npm run typecheck` | 2.96 | |
| `npm run build` | 42.98 | `gate:simulator` 4 of floor 4; `gate:checks` 270 scripts classified; `conformance:ios` PASS; `gate:onlyadd` P4 equals launch; `gate:electron` 174 of 174; contract inventory byte for byte |
| `HOME=<scratch>/home npm test` | 70 | 1,132 files passed and 2 skipped of 1,134; 21,125 tests passed and 14 skipped; vitest's own duration 64.66 s |
| `npm run conformance:ios` | 5.50 | 51 rules over 53 app files, 73 test files and 140 files under ios/ |
| `npm run ablation:p316` | 2,945 | **568 of 568** arms red on the rule that owns them; every rule (a) to (z) and (aa) to (ba) able to fail; clone removed; working tree unmoved |
| `npm run conformance:phonecopy` | 2 | 23 screens, 740 segments, 109 owned rules (floor 109), 64 drawn strings not yet owned |
| `npm run gate:onlyadd` | 2 | 1 frozen set; 11 routes served; 158 requests replayed; the phone's wire today equals launch |
| `npm run gate:simulator` | 0 | 560 scripts read; 4 reach the helper, against a floor of 4 |
| `npm run gate:checks` | 1 | 270 check scripts classified; 1,134 test files reach no home past HOME |
| `npm run gate:electron` | 1 | 560 files read; 174 reach `electron-run.mjs`, against a floor of 174 |
| `npm run gate:background` | 2 | 562 files read; 3 start a process and end it in a `finally`; 19 of 19 fixtures behaved |
| `node build/p316/hostile-door.mjs --self-test` | 25 | 96 arms; every listener closed |
| `node build/p345/probe-p345.mjs --grader-self-test` | 0 | 95 cases, each grader red on its broken reading |

**`test:ios` on iOS 26.3.** The run held lock slot `electron.lock`, taken as `p345` and released on the same line. It
exited 0 in 309 s.

| Step | Result |
| --- | --- |
| Builds | Debug built in 21,094 ms, Release in 73,532 ms, and the unsigned device archive in 23,638 ms |
| Debug | `p316-18429-1` booted on 26.3.1 in 25,467 ms. 888 tests ran in 86,616 ms, with 0 failures and 0 skipped |
| Release | 885 tests ran in 70,911 ms, with 0 failures |
| Frozen set | 617 of 617 rows as sealed in both configurations |
| Seams | Release and the archive hold no DEBUG seam; Debug holds all 5, which is the control |
| Suites | No suite was named "not run", so every `P345_SUITES` class ran. That includes `MultiMacKeychainTests`, the corrupt-record row |
| Device | Deleted |

**`test:ios` on `P316_RUNTIME=18.3`.** The same slot was taken and released. It exited 0 in 291 s.

| Step | Result |
| --- | --- |
| Builds | Debug built in 20,678 ms, Release in 71,176 ms |
| Debug | `p316-55449-1` booted on 18.3.1 in 16,429 ms. 888 tests ran in 82,271 ms, with 0 failures |
| Release | 885 tests ran in 72,342 ms, with 0 failures |
| Frozen set | 617 of 617 |
| Device | Deleted |

**At the end:**
- `xcrun simctl list devices | grep -c p316-` read 0.
- The integrator launched no Electron. The machine's count, 5, was the same before its first command and after its last.
  Those processes are not this run's.
- History was `737736 1792023873` and `23166 1790702242` before the first command and after every one. It never moved.
- Disk was 79 GiB free at the start, 73 GiB after the builds and 77 GiB after the scratch derived data was removed.
- The lock was free at the end, with no ablation clone left.

### For the committer: main moved while this ran

origin/main is now `0fffd80c` (333.12, 333.12.1, 347.1 and 333.11.2 landed; 333.12.2 started). None of it touches a file
under `ios/`, `build/p316/` (except `vectors.mjs`, which this phase does not touch), `build/p311/`, `build/conformance-ios.mjs`
or `docs/design/phone/`. A `git merge-file` of every file both sides touched, with base `24097f39`, ours the worktree and
theirs `origin/main`:

| File | Merges |
| --- | --- |
| `CLAUDE.md` | cleanly |
| `CHANGELOG.md` | cleanly, our item staying under `## Unreleased` / `### Added` |
| `package.json` | cleanly |
| `build/verification-checks.mjs` | cleanly |
| `build/assert-electron-teardown.mjs` | **conflicts on one line** |

**The one conflict is `HELPER_USER_FLOOR`.** Main raised it twice, to **175** (`786ee1c6`, Phase 333.12, and `2aff4e4a`, Phase 333.12.1), so this phase's
raise makes it **176**. Keep both sides' comments. `SIMULATOR_USER_FLOOR` on main is still 3, so this phase's 4 stands.
`CURRENT_PROJECT_VERSION` on main is still **10**, so **build 11** stands. If 333.4.1 lands first and takes 11, move all six
configurations, `PHONE_BUILD` and its fixtures, and `SettingsTests`' `1.0.0 (11)` to 12. After the rebase, re-run
`gate:electron` and `conformance:ios`.

### The fix round (the fixer, 2026-10-15)

Run once, in `/private/tmp/wt-p345`, still at base `24097f39`. Nothing was committed, staged or stashed. Logs are in
`/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p345/fix/`. The two verify
lenses each answered needs_work; every major and minor below is fixed, and each nit is fixed or stated.

#### D18a, the one-Mac phone's Pairing screen (lens 1, major)

**What was worse than build 10.** With one Mac kept, a refusal (he pressed Remove on that Mac) goes to Pairing, as build
10's did. Build 10 then REPLACED that Mac with the next Mac he paired there. This build kept the Mac that refused beside
the new one: a Macs tab appeared, and every launch opened on the Mac that refused (D5, D9: `pairing-v2` is first), which
said `This iPhone is not paired with this Mac.` until he switched or unpaired it.

**D18a, which amends D18.** A pairing made on the Pairing screen that ONE kept Mac's refusal led to takes that Mac's place,
as build 10's did. In `App/TortieApp.swift`:
- `refused(mac:)`'s one-Mac arm keeps the Mac's name (`refusedOnPairing`) before it calls `lostPairing()`. Nothing is
  forgotten on the refusal, as before.
- `paired(_:first:)`, the Pairing screen's own model's ending (the sheet's is `pairedAnother`), calls
  `replaceRefused(with:)` before `adopt`. When a Mac is named and the new pairing's public name is a DIFFERENT Mac, that
  Mac is forgotten through `door.unpair(name:)`, Unpair's own door: its record first, then its client key when no other
  record names it. The new pairing was already kept (`PairingFlow` saves before it answers `.paired`), so a pairing that
  fails forgets nothing, as build 10's failed pairing kept its Mac.
- Nothing is forgotten when the same Mac is paired again (its record was replaced in place, D10), when no refusal led to
  Pairing (a first pairing, or Unpair of the last Mac, which drops the name), or from the Pair another Mac sheet. A return
  to the foreground that finds the Mac kept, with no pairing under way on that screen (`pairing.busy` false), drops the
  name. A pairing already under way there when the return comes still replaces it, as build 10's would have.
- Apple is told nothing (no `forgetAddress()`), as build 10 told it nothing when one pairing replaced another; rule (x)'s
  one call stays in `AppModel.unpair`. A record that will not go (`.kept`) leaves both Macs kept, which is what this build
  drew before the fix.

**Why not keep both and open on the newer Mac** (the lens's option 2): it changes D5, a default he was asked about (Q3), and
it still draws a fourth tab over a Mac that refused the phone, which build 10 never drew.

**Why this is not one Mac touching another's pairing.** No door's answer chooses which Mac is forgotten: the name is set
only by that Mac's OWN refusal, and only when it is the one Mac kept; it is read only by the pairing HE makes on the
Pairing screen that refusal put him on. With two or more Macs a refusal never reaches Pairing (D18), so this never fires.
Rule (ba)'s new clause ba10 holds the callers (below).

**Stated cost.** The new Mac keeps the account it was saved under, `pairing-v2-` and its hex, so `pairing-v2` is free
afterwards. Build 10 installed over that phone reads no pairing and draws Pairing; before the fix it read the Mac that
refused, which drew the same Pairing screen. The next NEW Mac paired takes `pairing-v2` and is drawn first (D9), as after
Unpair of the first Mac.

**Not driven live.** The DEBUG code seam hands a launch code to the Pair another Mac sheet whenever a record is kept
(D19), so `probe:p345` cannot reach the root Pairing screen with a record kept; D18a is held by `MacsTests` over the model
(below), with the parent of the fix measured.

#### A replaced pairing's late answers (lens 1, minor)

**What was wrong.** A refusal from a pairing that had since been REPLACED (re-paired through the sheet while one of its
reads was under way) found the NEW space by the Mac's name and blanked it, or, with one Mac, sent the phone to Pairing.

**The fix.** Every routing is bound to the space kept under its Mac's name when it was made: `MadeFor`, a weak holder,
set for a space's list in `makeSpace`, and taken from `space(mac)` by `routing(_:mac:)` and `alertedRouting(mac:)`.
`speaks(for:_:)` answers no when a different space is now kept under that name, and then the refusal and the pop
(`backToList(in:` and `backToList(saying:`) move nothing. A Mac no longer kept at all goes where the routings' own rules
already sent it. This is the lens's validated candidate, widened to the two other routings as it asked.

#### probe:p345 (lens 2, two majors, one minor, one nit)

- **RM.** At `24097f39` a Remove moves the door's confirmation (every phone's client key is in its hash), so the door stops
  answering until it is allowed again. After `removePhone` the arm now calls `doorBack(MAC_B)`: the door on if it is off,
  `confirmListening`, then listening, confirmed and a live forwarder. A door already listening and confirmed is left
  alone, so a base where a Remove keeps the door answering (333.12, now on main) is driven as before. `gradeRM` reads an
  arm whose door never answered again as UNREADABLE, never a pass or a fail.
- **Each device starts with both doors answering** (`doorBack` on A and B), so the floor device no longer inherits a door
  the order device left stopped.
- **T2.** `screen-key:hide` puts the Terminal's keyboard away before the bar's Macs tab is pressed, and `drive()`
  acknowledges `screen-key-ready` as it does `screen-type-ready`. This is exactly the change lens 2's matrix drive passed
  with on both runtimes.
- **P1.** The 66 pt shift applies to Settings' own content (`settings-` ids) alone, through one `settingsShift(row)`;
  the tab bar's buttons and the system's overlay are fixed to the window. **Re-derived over lens 2's run 1 dumps** with
  the shipping `screenDiff` and `settingsShift` sliced out of the probe (`fix/p1-rederive.mjs`): 0 differences on iOS
  26.3.1 (7 fixed elements below the row: `AdditionalDimmingOverlay`, `bell`, `bell.fill`, `list.bullet` twice,
  `gearshape`, `gearshape.fill`) and 0 on iOS 18.3.1 (4 fixed), against 7 and 4 differences before.
- **RP's count** is the kept list's (`expectCount: kept.length`), so RP reads right after CAP (4) or without it (2). The
  three recorded RP fixtures in `build/p345/fixtures/graders.json` carry `expectCount: 4`, the order device's.
- The self-test gained seven cases: the bar and the overlay unmoved, the bar moved with the content red, Settings' own
  content left unmoved red, RP with two Macs, RP with a Mac lost, RM with the door back, RM with the door never back.

#### Gates

**Rule (ba), clause ba10** (`build/conformance-ios.mjs`, `ruleSpaces`): `door.unpair(name:` only in `AppModel.unpair` and
`AppModel.replaceRefused`; `replaceRefused(` called once, by `AppModel.paired`; `refusedOnPairing` given a Mac only in
`AppModel.refused`; every `refused(mac:)` reached only through `routing`, `listRouting` or `alertedRouting`, and every
refusal and pop those hand back behind a `speaks(` test in its own closure. Proved first on eleven fixtures of its own
(a refusal that forgets, an unpair through another receiver, the sheet replacing, the Pairing screen replacing nothing, the
name set by an alert's tap, `= nil` left alone, a list's refusal, a session's pop and an alerted pop with no `speaks(`, a
`speaks(` in the other closure, `refused(mac:)` called outside a routing). **`ablation:p316`** gains five arms, each red on
(ba) alone: ba10 (a one-Mac refusal that forgets the Mac), ba10b (the sheet replacing), ba10c (the name set by a tap in
the Macs tab), ba10d (a list's refusal with no `speaks(`), ba10e (an alerted pop with no `speaks(`).

#### The tests

`ios/TortieTests/MacsTests.swift` gains three tests and a held reader of its own (`GatedReader`):
- `testAPairingOnThePairingScreenARefusalLedToTakesThatMacsPlace`: one Mac refuses, Pairing, nothing forgotten; a pairing
  with another Mac there forgets that Mac alone (`unpaired == [studio]`, no `forget()`), three tabs, Apple told nothing
  (with the refused Mac holding the address), and the next launch opens on the new Mac alone; the same Mac paired again
  there forgets nothing.
- `testOnlyThePairingScreenARefusalLedToReplacesAndOnlyThatMac`: Pairing after Unpair of the last Mac forgets nothing more;
  the sheet forgets nothing, a refused Mac among two included; a return that finds the Mac kept drops it; a pairing under
  way there when the return comes still replaces it.
- `testAReplacedPairingsLateAnswersMoveNothing`, with two Macs and with one: the replaced pairing's held list read refused
  after the re-pair, and a session's and an alerted session's routing made before it, blank, pop, read and go to Pairing
  nothing; a routing made for the new space still does.

**The parent of the fix measured.** A `cp -Rc` clone of the worktree with `.git` removed, `App/TortieApp.swift` put back
to the builders' file (the lens's own copy, `attack/orig-TortieApp.swift`, which differs from the worktree's by this
round's edits alone) and the new tests kept: `node build/p316/test-ios.mjs` on iOS 26.3.1 exited 1, Debug 891 executed
with 14 failures and Release 888 with 14, every one in the three new tests and none elsewhere. At HEAD both read 0.

#### The battery

Every command ran in `/private/tmp/wt-p345`. History read `737736 1792023873` and `23166 1790702242` before and after
every one and never moved.

| Command | Exit | Seconds | Numbers |
| --- | --- | --- | --- |
| `npm run typecheck` | 0 | 2 | |
| `npm run build` | 0 | 39 | `gate:electron` 174 of floor 174; `gate:simulator` 4 of 4; 270 check scripts classified; `conformance:ios` PASS; `gate:onlyadd` P4 equals launch; contract inventory byte for byte |
| `HOME=<scratch>/home npm test` | 0 | 55 | 1,132 files passed and 2 skipped of 1,134; 21,125 tests passed and 14 skipped |
| `npm run conformance:ios` | 0 | 6 | 51 rules over 53 app files, 73 test files and 140 files under ios/; ba10: `door.unpair(name:)` 2 times, 5 refusals and pops behind `speaks(` |
| `npm run ablation:p316` (run by the reverify) | 0 | 3,267 | **573 of 573** arms red on the rule that owns them, ba10 to ba10e among them; every rule (a) to (z) and (aa) to (ba) able to fail; clone removed; working tree unmoved |
| `npm run conformance:phonecopy` | 0 | 2 | 23 screens, 740 segments, 109 owned rules (floor 109), 64 drawn strings not yet owned |
| `npm run gate:onlyadd` | 0 | 1 | 11 routes served; 158 requests replayed; the phone's wire equals launch |
| `npm run gate:simulator`, `gate:checks`, `gate:electron`, `gate:background` | 0 each | 0 to 2 | 4 of 4; 270 classified; 174 of 174; 3 starts, 19 of 19 fixtures |
| `node build/p316/hostile-door.mjs --self-test` | 0 | 25 | 96 arms; every listener closed |
| `node build/p345/probe-p345.mjs --grader-self-test` | 0 | 0 | 203 cases now (186 at this round; the ruled round added 17), each grader red on its broken reading |
| `npm run test:ios` (iOS 26.3.1, lock slot `electron.lock`) | 0 | not timed | Debug built in 17,599 ms, Release in 71,111 ms; Debug 891 tests and Release 888, 0 failures; 617 of 617 frozen rows; no DEBUG seam in Release or the archive; `p316-25981-1` deleted |
| `P316_RUNTIME=18.3 npm run test:ios` (the same slot, taken again) | 0 | 292 | Debug built in 23,278 ms, Release in 70,455 ms; `p316-70339-1` booted in 15,940 ms; Debug 891 and Release 888, 0 failures; 617 of 617; deleted |

`git diff 24097f39 -- src/` is 0 lines. `xcrun simctl list devices | grep -c p316-` read 0 at the end. No Electron was
started. The lock was released on the same line every time.

#### What the reverify should run live

`probe:p345` with `P345_PARENT_CHECKOUT` on both runtimes: RM, RP and UP after RM, T2, and P1 are the arms the first live
run read wrong; U0, AL1, T1, T3, AL2, S1, S2, CAP, H, HN and DG passed there and nothing in this round touched them.

#### Stated, not changed

- **D23 and a door that skips `pending`** (lens 1, nit). The phone records the address it presented only when the Mac
  answered `pending` saying it sends (`Door/Pairing.swift`'s `held`). A door that answers `allowed` to the presentation
  carrying the address gets the token while the phone records none, so unpairing it calls no `forgetAddress()`. A token
  without the team's APNs key is inert. `probe:p345`'s H arm does not exercise D23's forget path with node doors, which
  allow the second presentation at once.
- **The sweep and an empty account list, as a phone launched while locked could read one** (lens 1, nit, unmeasured). A launch whose list answers no account deletes every
  client key; the builders' tests (`UnpairKeychainTests`, `DoorPairingTests`, `AlertsTests`, `PairingStoreTests`) hold that
  a launch with no record sweeps an orphan key, so a guard on an empty list would undo them. The app has no background
  mode, and iOS opens it only unlocked. Left as built; a device that is locked during a launch is the measurement.
- **The Macs tab's label with a shared first label** (lens 2, nit). D21 draws the whole public name; on iOS 26.3 it takes
  174.8 pt and narrows the other three tabs to 90, 74 and 72 pt. Only two kept Macs that share a first label reach it. Left
  as D21. The long label has not yet been read on iOS 18.3: `probe:p345` draws it on the 26.3 device alone (CAP, H), and
  the floor device keeps two Macs with different first labels.
- **D18a's two costs.** Build 10 installed back over this build reads no pairing: the new Mac keeps its `pairing-v2-`
  account and build 10 reads `pairing-v2` alone, so it draws Pairing. And a Mac that answers 404 because it is QUITTING
  (D18: a 404 is every refusal the door makes) sends a one-Mac phone to Pairing; another pairing made there then forgets
  the first Mac, as build 10 did.

#### Files this round changed

`ios/Tortie/App/TortieApp.swift` (D18a, `MadeFor`, `speaks`), `ios/TortieTests/MacsTests.swift` (three tests and
`GatedReader`), `build/conformance-ios.mjs` (ba10 and its fixtures), `build/p316/ablation-ios.mjs` (arms ba10 to ba10e),
`build/p345/probe-p345.mjs` (`doorBack`, RM, T2, `settingsShift`, RP's count, the self-test),
`build/p345/fixtures/graders.json` (RP's count), `build/p345/CHECKLIST.md` (D18a stated), `CLAUDE.md` (the
`conformance:ios` and `probe:p345` rows) and this section. No file was added and none under `src/` moved.

#### For the committer

Build 11 stands: origin/main `0fffd80c` still reads `CURRENT_PROJECT_VERSION = 10` in all six settings. This round adds no
script under `build/` that reaches a helper, so the floors are as the integrator left them: `HELPER_USER_FLOOR` 176 after
the rebase (main's 175 plus this phase's one), `SIMULATOR_USER_FLOOR` 4. `CLAUDE.md` still merges cleanly with origin/main
(`git merge-file`, exit 0).

### The ruled round (2026-10-15)

The reverify answered needs_work a second time, but it found the APP correct: what was left was the probe and the
documents. The operator ruled "Fix script, re-check, land". This round ran once, in `/private/tmp/wt-p345`, still at
base `24097f39`, with nothing committed, staged or stashed. Logs are in
`/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p345/ruled/`.

#### What changed

- **probe: CAP's race** (major). The twin is a node door that allows at once, so it can pair and close its sheet between
  two of the UI test's polls. The drive then stops at `pair-another-missing` right after C's closed line, with the twin
  kept. Both reverify runs that failed CAP read exactly this, and every arm after CAP then read the wrong Macs.
  `capFirstDrive` reads the first drive. When C's sheet closed, the next sheet was missed and the twin's own log holds a
  `POST /pair` answered 200, the twin is counted as kept from that log, and D's and C2's steps run on a drive of their
  own, `cap-rest`. This is the reverify's working copy (`probe-p345.clone-resume.mjs`), with the gate on the missed
  sheet and the 200 made exact. `capLines` joins the two drives' lines. The Macs at four, read on `cap-macs`, still have
  to name the twin, so a twin that logged 200 and was not kept fails there.
- **probe: a stuck CAP reads UNREADABLE.** `stuckOf` names a drive's `<step>-missing` dumps, and `drive()`'s report
  uses it too. `gradeCap` returns UNREADABLE before any other reading when the CAP drives stopped short with nothing
  to resume from. That is the probe's own rule: a step whose screen never came is never a pass, and never a FAIL by what
  it never reached. Run 1's reading was "the second C saw no POST /pair" and "no Macs tab is named p345-studio".
  Both came from the stop, and both now read UNREADABLE.
- **probe: P1's age frame** (minor). `RIGHT_EDGE_FRAME` (`(^|-)age(-|$)`) holds that `screenDiff` compares a row's age
  by its right edge (x + width), y and height, never by x and width. An age is drawn against the row's right edge,
  and its width moves with the clock: run 2 read `now` at x 361 w 25 and `1m` at x 366.3 w 19.7, the same edge at 386.
  Every other id is still compared whole.
- **The grader self-test: 203 cases** (186 before), each grader red on its broken reading:
  - the missed sheet resumed, then passing
  - resumed and D paired as a fifth (FAIL)
  - resumed with `cap-rest` stuck, or never run (UNREADABLE)
  - run 1's own stuck reading (UNREADABLE)
  - a twin `POST /pair` that was not 200, C's own sheet missed, and C refused and then a sheet missed (none resumes)
  - a whole first drive read as it came
  - the age with its edge held, its edge moved, the age drawn lower, a name still compared by x and width, and P1
    passing over `now` then `1m`

  Five ablations of the new rules in a scratch copy of the probe each read red: the edge rule, the stuck rule, the
  resume, the 200 and the missed-sheet gate.
- **`ios/TortieTests/MacsTests.swift`** (minor) gains `testALateAnswerWhoseSpaceWasFreedMovesNothing`, modelled on the
  reverify's test of the same name. It runs with two Macs kept and with one. It keeps only the OLD LIST across the
  re-pair, never its space, and it asserts that the replaced `MacSpace` was freed, so the weak `MadeFor` is nil. The
  late refusal and every old routing then move nothing in the new space: the root, the badge, the list's state, the
  pushed path, `noticeRead`, the space under the name, no Unpair and no `forget()`. The fix round's
  `testAReplacedPairingsLateAnswersMoveNothing` holds the old space, so it never reached this state.
- **This SPEC.** It adds D18a to §1.1, appends the fix round above with its ablation row filled from the reverify, and
  states D18a's two costs, lens 1's D23 nit, the sweep nit and the long label not yet read on iOS 18.3.
- **`CLAUDE.md`'s `probe:p345` row.** It now gives the measured times, says the relay counts requests as well as
  connections, and names CAP's resume and its UNREADABLE stop, plus P1's age rule.

#### The plant (the new test can fail)

The plant ran in a `cp -Rc` clone of `ios/` with no `.git`, never in the worktree. `speaks` was planted as
`return owner.space == nil || kept === owner.space`, so a routing whose space was freed speaks for the new one. The
clone was built and `MacsTests` run on one iOS 26.3.1 device (`p316-p345rp-81799`, deleted).

- **Planted.** 25 executed and 8 failures, every one in `testALateAnswerWhoseSpaceWasFreedMovesNothing`. With two
  Macs, the badge was 0, the list was refused, the path was popped and `noticeRead` was set. With one Mac, the phone went
  to Pairing, the badge was 0, the path was popped and the space was replaced. `testAReplacedPairingsLateAnswersMoveNothing`
  PASSED under the plant, which is the gap this test closes.
- **Control.** The file was put back (sha256 `679df1b995b3`, the worktree's), and 25 executed with 0 failures.

#### The battery

Each command ran under a scratch `HOME` and `ZDOTDIR`, with `HISTFILE=/dev/null` and no `TERM_SESSION_ID`. His history
read `737736 1792023873` and `23166 1790702242` before and after every one, and never moved.

| Command | Exit | Seconds | Numbers |
| --- | --- | --- | --- |
| `npm run typecheck` | 0 | 3 | |
| `node build/p345/probe-p345.mjs --grader-self-test` | 0 | 0 | 203 cases |
| `node build/p345/sni-relay.mjs --self-test` | 0 | 4 | 22 cases, every listener closed |
| `npm run conformance:ios` | 0 | 5 | 51 rules over 53 app files, 73 test files and 140 files under ios/ |
| `npm run conformance:phonecopy` | 0 | 2 | 23 screens, 740 segments, 109 owned rules (floor 109) |
| `npm run gate:simulator` | 0 | 1 | 560 scripts read, 4 reach the helper against a floor of 4 |
| `npm run gate:electron` | 0 | 1 | 560 files read, 174 reach `electron-run.mjs` against a floor of 174 |
| `npm run gate:checks` | 0 | 0 | 270 check scripts classified; 1,134 test files reach no home past HOME |
| `node build/p316/test-ios.mjs` (iOS 26.3.1, lock slot `electron.lock`) | 0 | 305 | Debug built in 20,521 ms and Release in 71,349 ms; Debug ran 892 tests and Release 889, one more each than the fix round, with 0 failures; 617 of 617 frozen rows; no DEBUG seam in Release or the archive; `p316-15705-1` deleted |
| the plant (above, lock slot `electron.lock`) | 0 | 92 | planted: 8 failures, all in the new test; control: 0 |

#### The re-check: `probe:p345` once, on the iOS 26.3 device alone

The run used `P345_DEVICES=order`. `P345_PARENT_CHECKOUT` was build 10's `ios/`, taken with
`git archive 24097f39 ios` into scratch. The run held lock slot `electron.lock`, taken as `p345r` and released on the
same line.

- **Result.** Exit 0 in **1,202 s**, with every arm PASS: U0, P1, AL1, T1, T2, T3, AL2, S1, S2, CAP, H, HN, DG, RM, RP
  and UP on iOS 26.3.1, and RUN.
- **The race happened again, live.** The twin's sheet was missed at the same step (`pair-another-missing` after C's
  closed line), and the twin logged two `POST /pair` answered 200. CAP resumed on `cap-rest` (D's code drew the cap
  with Pair again, C2 re-paired at four), and the Macs at four read `p345-studio.tail00000.ts.net`, `p345-laptop`,
  `p345-studio.tail99999.ts.net` and `p345-cmac`, with A and the twin drawn whole.
- **Downstream arms.** H, HN, DG, RM, RP and UP then read the four Macs the app kept.
- **What was left.** The simulator was shut down and deleted. Electron's teardown ended 3 and 2 leftover processes of
  its own. The machine's Electron count was 5 before and after, all of them his own apps.
- **One caveat about RUN.** The probe's RUN arm reads "his history" through `homedir()`, which followed the scratch
  `HOME`. The wrapper read his two real files before and after the run.

#### For the committer

- **Files this round changed:** `build/p345/probe-p345.mjs`, `ios/TortieTests/MacsTests.swift`, `build/p345/SPEC.md`
  and `CLAUDE.md`.
- **What did not move:** no app source, no gate and no floor. `git diff 24097f39 -- src/` is still 0 lines.
- **What is still owed elsewhere:** the 18.3 floor device was not run this round. The fix round and the reverify drove
  it, and nothing in this round touches the app.
