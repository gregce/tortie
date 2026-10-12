# 141. Several Macs on one iPhone, and starting a session from it

Research 141. Written 12 October 2026 against the tree at `da71a9a4` ("docs(backlog): launch day, the iPhone public
beta is live"), the day Tortie for Mac 0.111.0 and the iPhone's public TestFlight beta went live. This is documents
only. Nothing was built, installed, signed into or started: no app, Simulator, Electron, tmux server, ssh or agent. No
keychain, `~/.ssh`, conversation store or live Tortie profile was read. The worktree has no `node_modules`, so no gate
or test ran. The processes that did run are disclosed here. Investigator D made three shallow `git clone`s of public
repositories into the scratchpad and read them; nothing in them was built or run. The writer ran `git` (log, tag, diff,
show and merge-base, to read history) and one `node -e` that read the committed frozen set
`ios/TortieTests/Fixtures/frozen/launch.wire.json` as JSON. All of it was read only.

Every claim about Tortie is a `file:line` in the tree at `da71a9a4`. Every claim about another product cites a public
page read on 12 October 2026, or a line in a shallow clone under the session scratchpad's `r141/investigator-d/src/`
(slopus/happy at `99f415fa`, K9i-0/ccpocket at `d929b44d`, getpaseo/paseo at `6f62125e`). Section 9 lists them.
Nothing of theirs was installed, run or signed into. A weakness is described by its class, never as a recipe.

The round. Four investigators each owned a lens. A read what one pairing assumes, on the phone and the Mac. B read how
a session is started on the Mac and what the phone's writes already prove. C read the door, and what adding a route
does today. D read how other products pair with several computers and start sessions. Three adversaries then attacked
the four reports: one on security, one on the product, and one on whether it can be built in the order proposed. A
judge ruled on every disagreement and re-read every line that was disputed. That ruling is this document's spine. The
writer re-read the citations this document leans on against the tree.

It answers two questions he asked on 12 October 2026, in his words:

1. "am I able to have my phone paired to more than one mac at a time?" The answer was no. The phone keeps one pairing
   (`ios/Tortie/Door/Keys.swift:502`, "Keep this pairing, replacing any other"). He then said "Yes, I do" want it.
2. "I also want you to add an entry for the phone being able to start new sessions, as I believe that is the major
   missing piece."

He then asked for it to be run as a research phase that queues the build phases. This document is that research. It is
also the research lane that research 140 asked for before 333.12 ("333.12 is a research lane first",
`docs/research/140-the-public-beta-beside-the-release.md:298-312`).

## 1. The answer first

Yes to both. It takes three build phases, in this order.

1. **333.12, on the Mac: an update keeps the door open, and only a new route waits for Allow.** Today a Mac update that
   adds any door route switches off every paired phone, and its alerts, until the person presses Allow in Settings then
   Phone. Starting a session needs a new route, so it cannot ship until this is fixed. The fix keeps the route list in
   the confirmed hash, but makes it mean the routes a person allowed rather than the routes this build has. A 0.111.x
   Mac's record hashes byte for byte as it did, so the update that brings the fix switches nobody off.
2. **345, on the phone: one iPhone, several Macs.** It needs no door route, no hashed field, no QR change and no Mac
   change. So it does not wait for 333.12, and the two can be built side by side. Needs input shows every Mac, in a
   section per Mac. Sessions shows one Mac at a time, chosen from a menu. Settings has a row per Mac, each with its own
   Unpair. With one Mac paired, every screen draws exactly as today, apart from one "Pair another Mac" row in Settings.
3. **346, on both: start a session from the iPhone.** It comes after 333.12 and 345. A "+" on the Sessions title row
   opens a sheet with Project (the projects open on that Mac, local and remote) and Agent, then Create, behind Face ID.
   Main builds the session the way the Mac's one-press create does. The phone never sends a folder, a flag, a name, a
   command or a login. When the session has started, its terminal opens.

The findings that change what gets built:

- **A route added today takes alerts down with the door.** `pushDestinations` and `alertsCanSend` answer nothing unless
  the door reads confirmed (`src/main/pocket/ipc.ts:2318-2323`, `:2351-2355`). So after an update that adds Start, the
  only way to get reads and alerts back would be to allow Start as well. That makes 333.12 a security prerequisite, not
  only a fix that keeps phones working.
- **The one-pairing assumption lives in the phone alone, and part of it is a hazard.** A record that does not read back
  calls a `forget()` that deletes every client key the app holds (`ios/Tortie/Door/Keys.swift:492-500`, `:518-524`).
  With several Macs, one unreadable record would cut off all of them.
- **No stranger ever gets an alert.** Only a Mac that holds the push key can send (`src/main/pocket/ipc.ts:2338-2355`,
  "ALERTS ARE HIS ALONE"). The phone offers its alert address only to a Mac that said it can send
  (`ios/Tortie/Door/Pairing.swift:467-482`), and keeps that answer as `macSends` (`:531`). So the alert faults that
  several Macs would cause (a shared badge, a shared count alert, an alert that names no Mac) reach only him, and only if
  a second Mac holds the key. They move to 345.1, which is mentioned and not queued.
- **A session his MacBook started on his Mac Pro will not show through the Mac Pro's own Tortie.** That Tortie adopts
  only ids its own manifest knows (`src/main/sessions/core.ts:2216-2236`; `src/main/sessions/reconcile-plan.ts:302-324`).
  That is the identity invariant, and it stays. He should hear it before 345 is built (question 1).
- **A paired phone can already run commands on the Mac.** It can type any key into any live session, and a message that
  starts with `!` reaches Claude Code as typed (`src/main/screen/keys.ts:108-113`; `src/main/reply/text-rules.ts:18-19`).
  Starting a session adds one case that is worse than today. A lost, unlocked phone paired with a Mac where every
  session has ended can run nothing today, and could after Start. Face ID on every Start closes that case.
- **A local create can take longer than the door waits.** The PATH capture alone may take up to 10 s, a shell-variable
  probe can follow it, and the door gives main 15 s (`src/main/sessions/create-local.ts:303`, `:646-669`;
  `src/main/tmux/resolve.ts:128`; `src/main/pocket/door/limits.ts:35`). The phone's Try again therefore sends the same
  write id, and the Mac answers from its ledger rather than starting a second session.
- **The door caps connections, not requests** (`src/main/pocket/door/limits.ts:21-23`), and Face ID runs on the phone. So
  a start needs limits of its own, on the Mac.

His three rules hold throughout. No scenario is worse than today: each phase below names what it compares against and
how that is measured. Tortie never ends a session by itself: nothing here ends one, and a start whose answer was lost
points him at Sessions rather than cleaning up. Just enough words: with one Mac, the phone gains one row; Start is one
"+" and a two-field sheet.

Nothing here cuts a release. One TestFlight build follows 345 and 346.

## 2. What was measured

### 2.1 Facts outside this tree, and the phase numbers

- **origin/main is ahead of `da71a9a4`.** Tortie 0.111.1 is tagged at `b97d3b85`, after `3cece73e` "fix(pocket): tell
  Tailscale's app to answer as its command line" (Phase 330.1). `c3710e45`, `b9bb3f1c`, `a3e6f8c0` and `24ea9232` follow.
  `v0.111.1` is not an ancestor of `da71a9a4`.
- **0.111.1 moved no route and no hashed field.** Between `v0.111.0` and `v0.111.1` the only door change is in
  `src/main/pocket/funnel.ts` and its test: the Funnel child and two Tailscale reads now get
  `env: tailscaleCliEnv(process.env)`. So the launch list of eleven routes is still the only route list a stranger has
  confirmed, on 0.111.0 and on 0.111.1.
- **The door is new in 0.111.0.** `v0.110.0` has no file under `src/main/pocket`. `v0.111.0` is the first public Mac
  with a door.
- **The frozen launch set is mislabelled.** `launch.wire.json` reads `phoneBuild "7"` and `macVersion "0.110.0"`, yet
  0.110.0 had no door. It is worth noting and is not this research's to fix.
- **0.111.1's lesson binds the Tailscale proofs below.** The running-log line for 0.111.1 on origin/main records that a
  probe of the Tailscale path must also run the real program once with no shell between Tortie and it, because every
  development build and stand-in had a shell variable that a Tortie opened from the Dock does not.
- **The numbers.** The highest phase section is 344 (`docs/BACKLOG.md:41620`). 333.12 has only mentions
  (`docs/BACKLOG.md:37639`, `:41526`, `:41615`, `:42860`, `:42862`). So the new phases are 345 (several Macs) and 346
  (start a session), and 333.12 gets its full section now.

### 2.2 What one pairing assumes, on the phone

The Mac already sees every pairing as a separate phone. Each pairing makes new signing, exchange and client keys
(`ios/Tortie/Door/Pairing.swift:382-385`). The Mac derives the phone's id from its signing key and its pin from its
client key (`src/main/pocket/pairing.ts:1115-1130`), and allows up to 64 phones (`src/main/pocket/pairing.ts:1590-1600`;
`src/main/pocket/door/wire.ts:57`). The QR v:3 already carries everything the phone needs per Mac
(`src/main/pocket/pairing.ts:1370-1381`). Every signature is bound to a secret that "never crosses the wire"
(`src/main/pocket/pairing.ts:1736-1760`), and the client key is a new Secure Enclave key per pairing
(`ios/Tortie/Door/Keys.swift:176-207`). So nothing on the Mac changes, and one untrusted Mac cannot replay anything
against another. What one untrusted Mac can cause is confusion, which the design below handles.

Everything that assumes one pairing is in the phone:

| Where | What it does today | What several Macs needs |
| --- | --- | --- |
| `Keys.swift:471`, `:502-505` | One Keychain account, `pairing-v2`, under service `com.itavero.tortie.phone.door` (`:417`). `save` replaces it | One item per Mac |
| `Keys.swift:448-455` | A Keychain write removes, then adds | One item per Mac also limits a failed save to that Mac |
| `Keys.swift:492-500` | A record that does not read back calls `forget()` | Remove only that record and its key |
| `Keys.swift:518-524` | `forget()` removes the record, then every client key tag | Forget one record and one tag; sweep orphans, sparing a pairing in progress |
| `Pairing.swift:531-538` | The record is saved only after Allow and a first read | Keep that order; remove an older record for the same Mac only after it |
| `TortieApp.swift:192`, `:242` | One reader, from `door.pairedReader()` | One reader per Mac |
| `TortieApp.swift:143-155`, `:778` | A route names a session and never a Mac; `destination` uses the one reader | Routes carry their Mac |
| `DoorWords.swift:265-275`; `TortieApp.swift:324-338` | A refused list read leads to `.pairAgain`, and `lostPairing()` clears every model and goes to Pairing | Blank only that Mac; go to Pairing only when no Mac is kept |
| `TortieApp.swift:419-423` | Coming back to the app swaps Pairing for the lists once a pairing reads back | "Pair another Mac" opens as a sheet over the lists |
| `TortieApp.swift:225-249` | The DEBUG launch code is read only when no pairing is kept | A two-Mac probe needs a new seam |
| `TortieApp.swift:560-570` | Unpair calls `forgetAddress()`, which unregisters every alert | Unregister only when no kept Mac sends |
| `TortieApp.swift:593-596` | The badge is one list's waiting count | A sum, named under rule (k) |
| `TortieApp.swift:134-135` | Three tabs; "A fourth would be search, Past Sessions or machines, and Phase 316 refuses each on the phone" | The Mac choice is a menu, never a tab |
| `DoorWords.swift:220-226` | A Mac's name is its public name up to the first dot | The full public name when two kept Macs share a first label |
| `Copy.swift:371-375` | `thisMac` is pinned as the card "for the one Mac this iPhone is paired with" | Its note moves on purpose |

Tailscale keeps machine names unique only inside one tailnet: "We enforce unique machine names across a Tailscale
network" (https://tailscale.com/kb/1098/machine-names). So two strangers' Macs on two tailnets can both be
`macbook-pro`. His own Macs share one tailnet, so their first labels already differ.

The gates and tests that pin one pairing, each to be moved on purpose in 345:

- conformance:ios rule (n), `forget()` with four callers and the record first, and rule (x), `forgetAddress()` once, in
  Unpair (`build/conformance-ios.mjs:245-256`); rule (d), the five DEBUG seams (`:1102`); rule (k), every arithmetic
  operator named (`:1588`); rule (aa), no sort or filter on the Sessions screen and exactly three stored words
  (`:365-370`); rule az5 and `APP_SHARED_STATE`, "the Keychain's one pairing store" (`:13378-13385`); and rule (s),
  `PHONE_BUILD` at `'10'` (`:3077`).
- `DoorKeychainTests.testThePairingStoreKeepsOnePairing`, `UnpairKeychainTests.testUnpairLeavesNothingInTheKeychain` and
  `UnpairTests`.
- probe:p316's R1 ("Remove on the Mac … the app draws its unpaired line") and U1 ("Unpair draws Pairing") arms
  (`build/p316/probe-p316.mjs:79`, `:210`).
- gate:onlyadd reads seven files, not three: `Contract.swift`, `DoorClient.swift`, `Pairing.swift`,
  `SessionsChoices.swift`, `SessionsScreen.swift`, `vectors.json` and `door/table.ts` (`launch.wire.json`, `read`). So a
  Sessions screen that 345 reshapes must still parse under its reader.

The alerts, which matter only if a second Mac holds the key:

- An alert carries `tortie: { v: 1, session }` and the count alert `{ v: 1 }` (`src/main/push/alert.ts:96-123`). Count
  alerts share the thread and collapse id `tortie-waiting` (`src/main/push/alert.ts:38`).
- Each Mac sends its own badge, and a badge-only correction when its count falls (`src/main/push/engine.ts:282-296`).
  Apple's `badge` key is "The number to display in a badge on your app's icon. Specify 0 to remove the current badge"
  (https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification). So with two sending
  Macs, one Mac's correction to 0 would clear the icon while the other still has sessions waiting.
- `unregisterForRemoteNotifications` "Unregisters for all remote notifications"
  (https://developer.apple.com/documentation/uikit/uiapplication/unregisterforremotenotifications()).
- An existing defect, found but not asked about: a token Apple rejected stays dead on that Mac even after a new pairing
  presents it again. `dropPushToken` writes the dead list and nothing removes from it
  (`src/main/pocket/ipc.ts:2364-2375`), and the destinations skip every phone holding a dead token (`:2323-2328`). It
  affects only him, and it goes with 345.1.

### 2.3 What a Mac update that adds a route does today

1. **The route list is a hashed field, and it is always this build's table.** `fields().routes` is `pocketRouteIds()`
   (`src/main/pocket/ipc.ts:815`), sorted (`src/main/pocket/pairing.ts:296`) and hashed under `sha256-pocket-exec-v3`
   (`src/main/pocket/pairing.ts:324`). The Allow lines name it (`:445`), with one clause per write (`:410-415`).
2. **A moved hash shuts the whole door.** The status reads `changed` (`src/main/pocket/pairing.ts:549-551`), with "Tortie
   will not publish this door, because this door changed after you confirmed it" (`:506-512`). At launch `mayOpen`
   refuses and writes one log line (`src/main/pocket/ipc.ts:1500-1512`). The launch's result is thrown away
   (`src/main/capabilities.ts:464`), and "A MOVED FIELD NEVER RESTARTS" (`src/main/pocket/ipc.ts:1434`). So the Funnel
   child and the door process never start.
3. **Alerts stop at the same moment** (`src/main/pocket/ipc.ts:2318-2323`, `:2351-2355`).
4. **Pairing a new phone stops too.** The pairing Allow needs a listening door to sign the phone's key ("The door is not
   listening…", `src/main/pocket/pairing.ts:1618-1625`).
5. **The phone shows** "Tortie could not reach your Mac." and under it "If Tortie on your Mac just updated, press Allow in
   its Settings then Phone." (`ios/Tortie/Style/Copy.swift:752`; `ios/Tortie/Screens/DoorWords.swift:311-316`). Nothing
   tells the person at the Mac outside that sheet.
6. **One route list has ever been confirmed by a stranger:** the eleven, whose membership hash `ea5930e0…` equals R4's
   pin (`build/conformance-pocket.mjs:951`) and the frozen set's `routeMembership`.
7. **Today's gates hold the outage in place.** SU5 refuses any route list but the eleven, "318.1 waits for 333.12"
   (`build/conformance-pocket.mjs:10588`, `:11420`). gate:onlyadd allows adding a route and says nothing about the hash
   (`build/assert-door-only-adds.mjs:14-19`; R1 at `:1220`). Two earlier probes grade the outage as a pass
   (`build/p337/probe-p337.mjs:511`; `build/p317/probe-p317.mjs:314`).
8. **Removing one phone shuts the door for every other phone until Allow.** `removePhone` calls `forgetPocketDoor()`
   (`src/main/pocket/ipc.ts:2203-2216`, `:2212`). With several Macs, revoking a lost phone would mean pressing Allow on
   every Mac.
9. **Two other paths confirm the whole field set today.** The alerts-off press confirms in the same press when exactly
   one line moved (`src/renderer/settings/PhoneSection.tsx:1399-1415`, calling `confirmDoor` at
   `src/main/pocket/ipc.ts:2157`). The pairing Allow confirms the fields with the new phone
   (`src/main/pocket/pairing.ts:1626`). Either could allow a waiting route by accident once routes can wait.

### 2.4 How the Mac starts a session today

1. **One guarded entry.** `GmuxCore.createSession` runs inside `ledger.admit('createSession', …)`
   (`src/main/sessions/core.ts:3290-3293`), and the quit waits up to 10 s for a create already running
   (`src/main/sessions/mutation-ledger.ts:20-25`).
2. **Main already builds a create from a row.** Restart composes a `CreateSessionInput` in main
   (`src/main/restart/restart.ts:157-182`). It refuses a remote session as "a remote restart, which is a different verb
   and is not built here" (`:152-157`). Create itself takes `projectMachineId` (`src/shared/types.ts:537`).
3. **The local create can be slow.** It waits for the PATH capture (`src/main/sessions/create-local.ts:303`), whose
   deadline is 10 s (`src/main/tmux/resolve.ts:128`). When shell variable names are set, a login-shell probe follows
   (`create-local.ts:646-669`); for 52 names it measured a median of 1,110 ms on his shell (`:650-652`).
4. **The remote create** makes several ssh round trips after a readiness check
   (`src/main/machines/remote-sessions.ts:1742-1749` and on).
5. **Three guards live only in the renderer.** The usable-machine refusal (`src/renderer/state/sessions-slice.ts:1124-1160`),
   the name dedupe (`:1162-1172`) and `nextOrdinal` (`:464-472`). The create path warns about exactly this: "A guard
   living in four of them is a guard the fifth misses" (`src/main/sessions/create-local.ts:195-200`). A phone start
   would be the fifth composer.
6. **The one-press create needs no confirmation, on purpose.** `quickCreate` names the session `<agent>-<n>`, applies
   Settings then Launch defaults and the per-agent capture default, and asks nothing
   (`src/renderer/state/sessions-slice.ts:1265-1303`).
7. **A safeguard-off default is sealed.** `defaultLaunchArgs` keeps only verified presets the person turned on
   (`src/shared/settings.ts:1380-1397`). A danger preset carries a seal only the Settings window can make, and an
   unsealed one is dropped when settings are read (`src/main/settings/store.ts:17-41`). `src/main/agents/flags.ts` holds
   28 `danger: true` presets, for example "Skip all permissions" (`:135`).
8. **No warning label does not mean safe.** pi "tools run unprompted" (`src/main/agents/flags.ts:496`). qwen's default
   Auto mode "ran every command without asking" (`src/main/agents/registry.ts:1445-1447`).
9. **Offering agents must start nothing.** `resolveBinary` waits on `getUserPath()`, whose first call starts a login
   shell (`src/main/tmux/resolve.ts:774-780`, `:1270-1276`). `listDetectedAgents()` starts the version scan
   (`src/main/agents/detection.ts:678-681`). `peekDetectedAgents()` starts nothing (`:719-728`).
   `resolveBinaryAgainst` is synchronous over a PATH string (`src/main/tmux/resolve.ts:1204-1220`). No synchronous
   accessor returns the captured PATH string today: `userPathSource()` only says whether a capture settled
   (`:761-763`). For another machine, `src/main/machines/machine-agents.ts:1-30` holds an in-memory answer in which only
   `absent` may grey an agent out.
10. **The new session can be shown at once.** A local row is written `running` before tmux exists
    (`src/main/sessions/launch-plan.ts:443`, inserted by `create-local.ts:624`), and `screenLive` offers a terminal for
    it (`src/main/pocket/routes.ts:892`). A remote create returns after the machine's list
    (`src/main/machines/remote-sessions.ts:2069`, `:2086`).
11. **Projects are open tabs.** `listProjects()` returns local rows alphabetically, then remote ones
    (`src/main/manifest/projects-repository.ts:153-159`). Closing a tab deletes its row.

### 2.5 What a paired phone can already do

This is the baseline a start is compared with.

1. **Keys.** The keys write refuses only `unknown`, `exited`, `restorable` and `discarded`, with no filter by agent
   (`src/main/screen/keys.ts:108-113`). So a live shell session takes any key, Enter included.
2. **A message.** `/` and `!` pass, by his ruling 3: "slash commands and shell escapes reach the agent as typed"
   (`src/main/reply/text-rules.ts:18-19`). Claude Code's `!` shell mode runs a command without asking Claude
   (https://code.claude.com/docs/en/interactive-mode).
3. **The Allow line understates this.** It reads "send a session one message" (`src/main/pocket/pairing.ts:413`). It is
   stated here and not changed here.
4. **Face ID asks only for End.** "HIS RULING OF 2026-09-30: 'Only for End'" (`ios/Tortie/App/OwnerCheck.swift:1-6`). The
   Mac cannot verify it: "nothing in the write claims it happened" (`:28-34`). End passes the Mac's `confirmLabel` as the
   text under iOS's prompt (`ios/Tortie/Screens/EndBar.swift:254`).

### 2.6 What the phone's write path gives a start, and what it lacks

1. **The ledger.** Every write goes through seven steps (`src/main/pocket/writes.ts:1-60`). The ledger is keyed on the
   phone, the verb and the write id (`:23-28`), and remembers an id for 120 s (`:101`, twice the 60 s clock skew at
   `src/main/pocket/pairing.ts:1705`). A known id answers what it answered before; one still in flight answers `busy`
   marked `acted` (`:548-562`). The ledger lives only in memory: "the ledger is memory" (`:62-63`).
2. **One in flight, per phone and per session** (`src/main/pocket/writes.ts:569-575`). A session id may be any 1 to 128
   of `[A-Za-z0-9._:-]` (`:124-125`), so `start:<uuid>` is a legal session id. A start needs a set of its own.
3. **The door waits 15 s for main** (`src/main/pocket/door/limits.ts:35`), then cuts the connection on a forwarded write
   rather than answering 404 (`src/main/pocket/door/listener.ts:543-556`). So "no answer" can mean the act happened.
4. **Connections are capped, requests are not:** 32 in all and 4 per source (`src/main/pocket/door/limits.ts:21-23`).
5. **The write answer is frozen.** `PocketWriteAnswer.verb` is typed by `POCKET_WRITE_ROUTE_IDS`
   (`src/shared/ipc/pocket.ts:139`, `:707-708`). The frozen phone holds `PocketWriteAnswer.Verb` to exactly `choose`,
   `end`, `keys` and `say`, and `PocketWriteAnswer.Reason` to twelve words (`launch.wire.json`, `types`). gate:onlyadd
   reports any word the frozen phone refuses (`build/assert-door-only-adds.mjs:938-944`), and reads every write route as
   `PocketWriteAnswer` (`:1029-1030`). So a start needs its own answer type.
6. **The gates refuse a create from the door, and say why.** R3's list names `createSession` as "a write verb, and
   refusal 8: nothing may start a process" (`build/conformance-pocket.mjs:1279`). R3 reads only `src/main/pocket/**`
   (`:1326-1343`). X5 holds each verb of `createPocketWrites` to one pass-through call and forbids `createSession` there
   (`:6166-6186`). Research 127 listed Create under "Writes not in v1" (`docs/research/127-the-phone.md:790`).
7. **An unknown route is a 404 before anything else** (`src/main/pocket/door/listener.ts:488-491`;
   `src/main/pocket/server.ts:179`). But the phone already tells an older Mac from a lost pairing on the Sessions read
   (`ios/Tortie/Screens/SessionsScreen.swift:411-435`).

## 3. How others do it

All pages were read on 12 October 2026. Clone lines are under the scratchpad's `r141/investigator-d/src/`.

### 3.1 One phone, several computers

| Product | The shape | Source |
| --- | --- | --- |
| Claude app (Anthropic) | Every machine running `claude remote-control` is "a device card at the top of the Code tab". Default session names start with the hostname | https://code.claude.com/docs/en/whats-new/2026-w34 ; https://code.claude.com/docs/en/remote-control |
| ChatGPT with Codex (OpenAI) | "Pair every phone or supported desktop app device with every host you want it to control." The phone can "Switch between connected hosts and chats" | https://learn.chatgpt.com/docs/remote-connections |
| Paseo | One sidebar of all hosts by default; host labels "only earn their space once the visible sidebar spans more than one host" | `packages/app/src/stores/sidebar-view-store.ts:51`; `hooks/sidebar-workspaces-view-model.ts:471-475` |
| Happy | One list with a machine header above each machine's projects | `happy-app/sources/components/SessionsList.tsx:32`, `:411` |
| CC Pocket | Saved machines, one connected at a time; the machine name shows only when two or more are saved | `apps/mobile/lib/services/bridge_service.dart:665-697`; `session_list_screen.dart:1685-1705` |
| Orca | "Mobile lists worktrees from every host you're connected to … in a single view"; a "display name on this phone only" | https://www.onorca.dev/docs/mobile |
| cmux (official iOS beta) | "All Computers" at the top switches the selected Mac; pairing is turned on "in each cmux Mac app" | https://cmux.com/docs/ios.md |
| Remote Codetrol | "Pair an unlimited number of Mac/Linux machines with a single phone or tablet." | https://apps.apple.com/lc/app/remote-codetrol/id6755246569 |
| Tailscale | "A Tailscale client device lets only one active account log in at a time", a limit from networking | https://tailscale.com/kb/1225/fast-user-switching |

The pattern. There are two shapes: one list labelled by host (Claude, Happy, Paseo, Orca), or a switcher with one live
host (CC Pocket, cmux). Paseo and CC Pocket name the host only when there is more than one, which is Tortie's "just
enough words". Tortie has no account, so its twins are the products that pair per host: OpenAI, Orca, Paseo and CC
Pocket. OpenAI says it plainly: pair every phone with every host.

### 3.2 Starting a session from the phone

| Product | What the phone may choose | Guards | Source |
| --- | --- | --- | --- |
| Claude Remote Control, server mode | A directory, from a device card ("Tap it to pick a directory and start a session there"). The folder and mode are set at the desk (`--spawn same-dir`, `worktree` or `session`); `--capacity` is "Maximum number of concurrent sessions. Default is 32" | "You can't select Bypass permissions from the app in either case"; a one-time y/n at the desk; Trusted Devices asks for a biometric only when the sign-in is over 18 hours old | https://code.claude.com/docs/en/remote-control ; https://code.claude.com/docs/en/mobile ; https://code.claude.com/docs/en/whats-new/2026-w34 |
| Claude project threads | A folder the desk connected; "Allow once" on the phone | Runs in auto mode; not while Require trusted devices is on | https://code.claude.com/docs/en/claude-projects |
| ChatGPT with Codex | "Start new chats in projects on the host" | "The sandboxing settings, security controls, and action approvals still apply" | https://learn.chatgpt.com/docs/remote-connections ; https://learn.chatgpt.com/docs/mobile |
| Happy | Machine, a typed or recent path, worktree, agent, model, effort, permission mode | No biometric is called. The computer creates a missing folder by default; the phone's environment variables reach the agent; sessions go into the person's own default tmux server. Its own notes record a retry that "spawned a SECOND session in the same directory" | `app/(app)/new/index.tsx:140`, `:656`, `:684`; `happy-cli/src/daemon/run.ts:281`, `:352`, `:413-434`; `sync/spawnRequestId.ts:1-20` |
| CC Pocket | A folder browser inside allowed roots, `$HOME` by default; Codex or Claude; a bypass mode | Listens on `0.0.0.0` with no key by default | `packages/bridge/README.md:43-45`; `packages/bridge/src/websocket.ts:1052-1057` |
| Paseo | A host, then search for a directory from the home folder, clone, or a new directory | Plugins can start programs (`spawnProcess()`, 0.11.0), which Tortie's refusal 1 rules out | `packages/app/src/add-project-flow/options.ts:41`, `:53`, `:59`; `CHANGELOG.md` 0.11.0 |
| Orca | "Start an agent on a workspace from the phone; its tab appears on the desktop right away" | Not stated | https://www.onorca.dev/docs/mobile |

What this shows:

- **No product found asks for a biometric on every start.** Where biometrics exist, they are a step-up (Claude, once per
  18 hours) or a lock on saved keys (Moshi, Termius, Prompt). Phase 317's Face ID on End already makes Tortie stricter
  than all of these. So the Face ID decision rests on Tortie's own no-regression rule (section 4.3), not on precedent.
- **The two companies that make the agents both fix the folders at the computer.** The others search from the home
  folder (Paseo) or take any typed path (Happy).
- **Every product offers a fixed list of agents.** None lets the phone send a free command line, apart from terminal
  apps. That matches refusal 8 and Tortie's registry.
- **Consent is given once, at the computer.** No product found asks again when an update adds the ability to start
  sessions. Tortie's route list is part of what Allow confirms, which is why 333.12 comes first.
- **App Review.** The guidelines still read "Last Updated: June 8, 2026"
  (https://developer.apple.com/app-store/review/guidelines/). Apps that start agents on a person's computer are approved
  (Happy, CC Pocket, Paseo, Superset, Control, Termius; store lookups in section 9). Starting sessions, on top of Phase
  337's terminal, moves Tortie toward guideline 4.2.7's wording "a mirror of specific software or services". No public
  4.2.7 rejection of this kind of app was found. This changes the review notes, not the design.

## 4. The designs, and why

### 4.1 333.12: an update keeps the door open, and only a new route waits for Allow

**The design (design A).** The hash keeps `routes`, and keeps `sha256-pocket-exec-v3`. What changes is what `routes`
holds: the routes a person allowed, not the routes this build has.

1. **Where it lives.** `allowedRoutes` is a new field in the sealed `pocket.json` store, rebuilt field by field on read
   like `nameConfirmed` and `deadPushTokens` (`src/main/pocket/pairing.ts:704-739`, `:805-858`). It stays inside the
   seal, so an agent that writes the file cannot add a route.
2. **Reading it.** When a confirm record exists, the allowed set is the stored list, or the frozen eleven when the field
   is absent or does not read back whole. It is never this build's table. So a 0.111.x store hashes byte for byte as
   before: R4's pin `ea5930e0…` equals the frozen `routeMembership`. No migration is needed, and no 0.111.x phone goes
   dark on the update that brings this.
3. **A door set up for the first time allows every route.** With no confirm record, the lines a person reads name the
   build's whole table, and that first Allow records all of them. Otherwise a new user would need a second Allow just
   for Start.
4. **What is served.** The routes both allowed and in this build. The door process (handed the set beside its pins,
   `src/main/pocket/door/wire.ts:89-96`) and main (`src/main/pocket/server.ts:179`) each refuse a route outside it with
   the same 404 `route` an older Mac gives, before reading the body. Main's last check before an act asks "is this route
   still allowed?", not only "is this phone still paired?" (the last check in `src/main/pocket/writes.ts:584-589`).
5. **What waits.** A route in this build but not allowed. Settings then Phone shows its lines inside today's confirm
   block, with Allow, while the door stays published and alerts keep flowing. When nothing waits, the block is exactly
   today's, which keeps his ruling "Keep today's block" (conformance:pocket SU6, `build/conformance-pocket.mjs:312`).
6. **Only the Allow whose lines named a waiting route can allow it.** The alerts-off press and the pairing Allow record
   over the current allowed set and never over the proposal (section 2.3, item 9). Each of the three confirm paths is
   named and held by a rule.
7. **The words follow the allowed set.** The honesty sentence (`POCKET_DOOR_HONESTY`, `src/shared/ipc/pocket.ts:1107`,
   fixed text today) and the write clauses (`src/main/pocket/pairing.ts:410-415`) are composed from the allowed set, so
   the sheet never claims a route before it is allowed.
8. **An allowed route id never changes meaning,** even between internal builds that never reached a stranger. A committed
   route ledger (id, method, path, signed, window only, body cap, Allow clause) is held add-only by a gate on every
   build. gate:onlyadd's R1 covers only routes in a public build.
9. **Remove keeps the other phones working (question 9).** When Remove is pressed on a confirmed door and the only change
   is that phone leaving, the door records the narrower fields itself. A subtraction needs no second press; the tree
   already says so of dead push tokens ("a subtraction needs no human", `src/main/pocket/pairing.ts:724`).
10. **A removed route needs no prompt.** The served set simply shrinks. gate:onlyadd already forbids removing a frozen
    route.
11. **Going back to an older Mac stays safe.** An older Mac drops `allowedRoutes` on its next write
    (`src/main/pocket/pairing.ts:830-858`). Updating again reads the eleven, finds the record covers more, and reads
    `changed`. The door goes dark and never wider. Today's downgrade behaves the same.

What still shuts the door, unchanged: a new public name, tailnet, program, port, push switch or `bindAtLaunch`.

**Why this keeps refusal 8.** No route answers until a person, at the Mac, has confirmed lines that name it, and the
hash is still over what decides what runs. The only change is that agreeing to eleven routes keeps meaning eleven routes
after an update adds a twelfth.

**Design B, rejected.** One confirm row per route and a v4 hash. It would read every 0.111.x record as `changed` unless a
read-time rule mapped each v3 record to its v4 rows without a single mistake. One mistake would switch off every public
phone. Design A has no such step.

**Also rejected.** Taking routes out of the hash (refusal 8; research 140 §7.3). Confirming new routes silently on update
(refusal 8). Holding the whole update back, as Firefox does when new permissions are declined ("the previous version
remains installed", https://extensionworkshop.com/documentation/develop/request-the-right-permissions/), which keeps a
person on old code without its fixes.

**Precedents.** GitHub Apps is design A: "If you do not approve the additional permissions, the GitHub App will still
retain its current permissions"
(https://docs.github.com/en/apps/using-github-apps/approving-updated-permissions-for-a-github-app). Google's incremental
authorization asks for scopes "as they are needed"
(https://developers.google.com/identity/protocols/oauth2/web-server#incrementalAuth). Chrome is today's Tortie: "the
extension will be disabled until the user accepts the new permission"
(https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings).

**Its first slice** is all of the above. It adds no route, no key telling the phone which routes are offered, no v4
hash, no per-route off switch and no last-seen time per phone. It changes no phone code.

### 4.2 345: one iPhone, several Macs

**Storage.** One Keychain item per Mac. `pairing-v2` stays the first Mac's account, so an older build still reads it;
further account names are made by the phone, never taken from a Mac. A new record is saved after Allow and a first read,
as today (`ios/Tortie/Door/Pairing.swift:531-538`). Only then are an older record for the same Mac (the same `dk`, or the
same full public name) and its client key removed. Removal is per record and per tag. A record that does not decode
removes only itself. Orphaned client keys are swept, sparing any pairing in progress. An older TestFlight build that
meets several records reads the first and, on its own `forget()`, removes the others' keys; their records are then
dropped whole on the next load, which is the safe direction.

**Screens.**

- **Needs input** has one section per Mac, in pairing order, each drawn as its answer arrives. Reads run side by side,
  because each may take up to 15 s (`ios/Tortie/Door/DoorClient.swift:180`). A Mac with nothing waiting draws nothing. A
  Mac that fails draws one line naming it and counts 0 toward the badge. The badge is a sum, named under rule (k). Mac
  names and headers appear only with two or more Macs.
- **Sessions** shows one Mac at a time, chosen from a menu on the title row (`ios/Tortie/Screens/SessionsScreen.swift:683-699`),
  shown only with two or more Macs. The choice lives in memory for the app's life and opens on the first Mac paired; it
  is never a fourth stored word, which rule (aa) forbids. Each Mac's filters and composition stay its own.
- **Routes carry their Mac.** Every read and write goes to the reader that drew the row, never resolved by session id
  across Macs.
- **A refusal blanks only that Mac.** The app goes to Pairing only when no Mac is kept.
- **Settings** has one row per Mac (its name and when it was paired), opening that Mac's card with its own Unpair, and a
  "Pair another Mac" row. That pairing opens as a sheet over the lists (`TortieApp.swift:419-423`).

**Names.** The first label of the public name, or the full public name when two kept Macs share a first label.

**Alerts.** Unregister only when no kept pairing has `macSends`. With the key on one Mac, Unpair of that Mac behaves
exactly as today (`TortieApp.swift:560-570`). An alert tap is routed with no Mac change. Ask only the kept pairings whose
`macSends` is true. If exactly one has it, open the session there. If several do, open it where exactly one answers for
that session id. Otherwise open the list, and never guess. Only `macSends` pairings are asked because any Mac can claim
it sends and can answer yes to any id, but no Mac can push without the key.

**A cap.** Four Macs per phone by default (question 4). Each refresh makes one mutual-TLS read per Mac, and Settings grows
with every Mac.

**One Mac kept means no change.** Every screen draws exactly as today, apart from the "Pair another Mac" row. probe:p316's
R1 and U1 arms, run unchanged, are the no-regression proof.

**Why this shape.** A picker alone hides a session waiting on the Mac not picked, which defeats the reason to pair
several. One merged Sessions list cannot be sorted honestly: rule (aa) bans sorting on that screen
(`build/conformance-ios.mjs:365-370`), and ages arrive as text written by each Mac's own clock. So Needs input merges and
Sessions scopes, which is investigator A's candidate C, kept by the product adversary.

**What he should know first (question 1).** A session the laptop started on the Mac Pro shows only through the laptop,
because the Mac Pro's Tortie adopts only ids its own manifest knows (`src/main/sessions/core.ts:2216-2236`). When both
are awake, no session is listed twice; the Mac Pro then also appears as a machine badge under the laptop. Changing that
would break the identity invariant.

**A new seam.** A two-Mac probe needs a way to hand a second pairing code while one is kept, because the launch code is
read only when no pairing is kept (`TortieApp.swift:225-249`) and pairing is camera only. Rule (d)'s list and
`test-ios.mjs --read-app` move with it.

### 4.3 346: start a session from the iPhone

**Routes.** Two signed routes, both waiting for Allow under 333.12. A read, the offer. A write, the start, alive outside
any pairing window, with a body cap of about 512 bytes. Its Allow clause names its reach, for example "start a session in
a project open on this Mac or one of its machines" (the spec settles the words).

**The body** is exactly `{agent, project, write}`, read one character at a time as End's is.

**What can be started.**

- **Projects:** open on the Mac, by id, re-read when the write arrives, local and remote (question 8).
- **Agents:** compiled launchable rows only (`LAUNCHABLE_AGENT_IDS`, `src/main/agents/registry.ts:2028`), offered from
  answers that start nothing (section 2.4, item 9). No row that exists only in `agents.json`, and no Shell (question 7).
  The default is `settings.defaultAgent` (`src/shared/settings.ts:29`).
- **Flags and capture:** exactly `quickCreate`'s (`src/renderer/state/sessions-slice.ts:1265-1303`), built in main from
  `defaultLaunchArgs` and `captureDefaultFor` (`src/shared/settings.ts:1380-1397`, `:872-880`). A safeguard-off default
  applies only if Settings sealed it, and then the sheet shows that preset's own label. The sheet never implies an agent
  is safe because no label shows (section 2.4, item 8).
- **Name:** `<agent>-<n>`, from the shared ordinal and dedupe, moved to `src/shared/` so the Mac and the phone use one
  rule.
- **Never accepted from the phone:** a path, a working folder, arguments, environment variables, a name, a login,
  `signIn`, `startAnyway`, a first prompt, a machine id, folder creation or a worktree.

**The act.** One module outside `src/main/pocket/`, reached by a pass-through `start` in `createPocketWrites`, as
`main/reply/` and `main/screen/` are. It builds the `CreateSessionInput` the way Restart does
(`src/main/restart/restart.ts:157-182`), tells errors apart by code only, and sets no status. R3 gains an entry
forbidding that module by name inside the door, X5 gains the pass-through, and a new rule family holds the module. R3's
reason for `createSession` cites refusal 8, which is about configuration; it is reworded, and his request of
12 October is recorded in the phase.

**Limits.** One start in flight per Mac, across all phones. A per-phone rate limit declared once. Starts in a set of their
own, never inside `sessionsInFlight`. No ceiling on live sessions, because that would refuse his own starts.

**The answer** is a new `PocketStartAnswer` carrying the new session's id and name. `PocketWriteAnswer.verb` is narrowed to
the frozen four, so the frozen word sets do not widen.

**The phone.**

- "+" appears only when the Mac says starting is offered, through an optional key on the `/v1/sessions` answer, which
  gate:onlyadd allows (`build/assert-door-only-adds.mjs:14-19`). Under 333.12 a route that waits for Allow also answers
  404, so the phone cannot guess. While starting waits, the phone draws nothing, and the Mac's Phone section shows the
  waiting line.
- "+" sits on the Sessions title row, beside the menu and Select (`ios/Tortie/Screens/SessionsScreen.swift:683-699`).
  A "+" on each project header would fail the main case: Show opens on Active, so a project with nothing running has no
  header.
- The sheet: Project, Agent, the one line for a sealed default when there is one, and Create.
- Face ID with a fixed string the phone owns and a fresh context each time. A `StartRunner` modelled on End's runner
  (`ios/Tortie/Screens/EndBar.swift`): made at the press, registered with the app, stopped when the app goes away, never
  retried by itself. The write id is kept 60 s for Try again.
- When it is done, the terminal opens. A refusal keeps the sheet open with the Mac's sentence. When no answer comes, it
  says "Your Mac did not answer. If it started the session, it is in Sessions." and reads Sessions again.
- Nothing else reaches Start: no URL scheme, App Intent, widget or notification action. None exists today.

**Why Face ID on every Start (question 5).** The product adversary argued against it: the Mac's own board and hotkeys
start a session with no confirmation, keys need none, and no product asks. Those points hold for a live session, and
that exposure exists today and does not change. The case that decides it is the quiet Mac: a lost, unlocked phone whose
Mac has every session ended can run nothing today, and with Start it could start an agent and then type into it. That
one case is worse than today unless Start asks for the phone's owner. Face ID does not cover a live session, and the
phase says so.

**Why the phone chooses no flag.** Claude Remote Control's permission mode is set at the computer and the app "can't
select Bypass permissions". A phone start uses exactly what the Mac's one-press create would use.

**Why remote projects are in (question 8).** His rule is that remote feels identical to local, and create already takes
`projectMachineId`. The feasibility adversary wanted them out because a remote create over ssh against 15 s is unmeasured.
The same-write-id mechanism covers a slow create on either side, and the spec measures local and remote create times
before it fixes the wording and the limits.

**Why no Shell (question 7).** Shell is not a security boundary: a message starting with `!` to Claude Code already
reaches a shell. It is left out for scope and for App Review, and is easy to add later.

**The release obligations.** The Mac release that carries 346 also carries 333.12, or ships after it, and goes out beside
the phone build that calls Start. At that release a second frozen set is taken and `FROZEN_SETS_FLOOR` is raised
(`build/assert-door-only-adds.mjs:141`).

**Draft CHANGELOG item:** "Start a session from the iPhone in any project open on your Mac, with your Mac's launch
defaults; its terminal opens at once."

### 4.4 345.1: alerts from more than one Mac (mentioned, not queued)

Only if a second Mac holds the push key (question 3): a collapse id per Mac, a Mac tag derived from the pairing binding
under `tortie` `v: 1` (never a digest of `dk`, which is printed in every QR code), the badge's limit stated, and the
dead-token fix from section 2.2. It moves conformance:push's byte-for-byte alert shapes (`build/conformance-push.mjs:73`)
and probe:p314, which spends real model turns.

## 5. Order

1. **333.11.1** (gates, Tier 2) beside **333.4** (devices). Both are already queued, and the App Store build comes from
   333.4's commit.
2. **333.12** (Mac) once 333.11.1 has landed, beside **345** (phone) once 333.4 has landed. Their files do not overlap.
3. **346** once both have landed, as one workflow with a Mac builder group and a phone builder group on separate files.
4. **318.1** re-read once 333.12 has landed. Its section sends through `/v1/say` and adds no route as written
   (`docs/BACKLOG.md:40423`, mechanism item 1), and Phase 337 and 337.3 since gave the phone a terminal to type into and
   End in the top right. His ruling that it waits for 333.12 stands.
5. **345.1** only on his word.

Why this order. 333.11.1 edits gate:onlyadd's replay, which 333.12 edits too, and its record of the phone's requests must
be read from the public phone's code, before 345 or 346 edit `DoorClient.swift` or the frozen read set. 346's Mac half
shares `src/shared/ipc/pocket.ts`, `src/main/pocket/pairing.ts`, `src/main/pocket/ipc.ts` and
`build/conformance-pocket.mjs` with 333.12, so it cannot be built beside it. Its phone half shares `TortieApp.swift`,
`Copy.swift`, the Sessions screen and `build/conformance-ios.mjs` with 345.

None of these runs beside 337.2 or 337.4, which share `build/p316/probe-p316.mjs` and
`ios/TortieUITests/P316DriveUITests.swift` (`docs/BACKLOG.md:38256`, `:41427`). These phases cut no release.

## 6. What was refuted

| Claim before the attack | What killed or changed it | Where it went |
| --- | --- | --- |
| The alert payload, a collapse id per Mac and the badge are part of 345's first slice | Strangers never get alerts (`ipc.ts:2338-2355`; `Pairing.swift:467-482`) | Moved to 345.1, not queued |
| A digest of the Mac's `dk` can tag an alert with its Mac | `dk` is printed in every QR code (`pairing.ts:1370-1381`), so it proves nothing | Fine for spotting a repeat pairing; a tag, if ever built, comes from the pairing binding |
| gate:onlyadd reads three phone files | The frozen set's `read` names seven, the two Sessions files among them | 345 edits files the gate must still parse |
| A Mac picker is enough | It hides a session waiting on the Mac not picked | Needs input merges; Sessions scopes |
| A start needs "an exception in R3 and X5" | R3 reads only `src/main/pocket/**` (`conformance-pocket.mjs:1326-1343`); X5 already forbids `createSession` and holds verbs to a pass-through (`:6166-6186`) | The act lives outside the door, as reply and screen do |
| One write in flight per phone, plus Face ID, bounds a flood | The door caps connections, not requests (`limits.ts:21-23`), and Face ID runs on the phone | Mac-side limits, declared once |
| A local create takes about a second | PATH capture up to 10 s plus a probe, against 15 s | Same write id on Try again; the spec measures |
| The contract baseline must be regenerated | It holds no types (`docs/audits/contract-baseline.txt:5`, `:255`, `:260`, `:282`, `:379`, `:421`, `:540`, `:580`) | It moves only if a channel is added |
| The phone has no clean signal for an older Mac | `.olderMac` already does it on the Sessions read (`SessionsScreen.swift:411-435`) | But a waiting route also answers 404, so "+" waits for the Mac's own key |
| Face ID on Start closes no gap | The quiet-Mac case: nothing can run today, and something could after Start | Face ID on every Start |
| Store each allowed id with a digest of its row | It would move the hash of the eleven | A committed add-only route ledger instead |
| 318.1 adds a read and a write (research 140 §7.3) | Its section sends through `/v1/say` (`docs/BACKLOG.md:40423`) | Re-read after 333.12 lands |
| Restart's refusal of remote sessions sets the precedent for Start | Restart's remote is a different verb; create takes `projectMachineId` | Remote in by default (question 8) |
| Remember which Mac Sessions shows | A fourth stored word, which rule (aa) forbids | In memory for the app's life |
| A removed route still asks | The served set is allowed and in the build; gate:onlyadd forbids removing a frozen route | No prompt for a removal |

Held under attack: several Macs needs no route, hashed field, QR or `/pair` change; one Keychain item per Mac; the hazard
in `load()`; the identity invariant; Needs input merged and Sessions scoped; 346 waits for 333.12; design A over B; the
three confirm paths; the downgrade fails closed; a start's own answer type; the offer starts nothing; the phone chooses
no flag; the new session's terminal opens at once.

## 7. What is not settled

- How long a real create takes, cold and warm, with and without shell variable names, and on another machine. It sets
  the wording of the no-answer case and the numbers of the start limits.
- What the phone sees through Funnel while a door is shut or a Mac is asleep: "could not reach" or "did not answer in
  time". Under design A this matters less, but it decides 345's line for an asleep Mac.
- Whether iOS returns the same alert address after unregistering. It decides how much the dead-token defect bites.
- Whether the Secure Enclave limits how many client keys one app can hold.
- Whether iOS's Stolen Device Protection removes the passcode fallback for a third-party `.deviceOwnerAuthentication`
  check. Apple's page (https://support.apple.com/en-us/120340) does not say.
- Whether gate:onlyadd's Swift reader can read the shape 345 gives `SessionsScreen.swift`.
- Whether an App Store review and a TestFlight review of version 1.0.0 block each other.
- Whether 318.1 is still wanted, after Phase 337's terminal and 337.3's End.
- Whether any agent Tortie can launch runs code controlled by the folder before its first trust question.

## 8. Questions for him

1. Is the second Mac a second desk running its own Tortie? Sessions the laptop started on the Mac Pro would then show
   only through the laptop, because each Tortie shows only what it started.
   Recommended: build for two desks, and say that limit plainly.
2. Should Needs input show every Mac, with Sessions showing one Mac at a time through a menu that appears only with two or
   more Macs?
   Recommended: yes.
3. Will a second Mac also hold the alert key? If so, 345.1 is needed for alerts that name their Mac and a badge that does
   not jump.
   Recommended: not now; alerts stay with one Mac.
4. How many Macs may one phone hold?
   Recommended: 4.
5. Face ID on every Start?
   Recommended: yes. Without it, a lost unlocked phone whose Mac has every session ended can start an agent and type into
   it, which it cannot do today.
6. Should a Start from the phone use the Mac's sealed safeguard-off launch defaults, as the one-press create does?
   Recommended: yes, shown as one line with the preset's own label; the phone chooses no flag.
7. Should Start offer Shell?
   Recommended: no, for now.
8. Remote projects in the first build of Start?
   Recommended: yes.
9. Should Remove on the Mac keep the other phones working, with no Allow needed?
   Recommended: yes, inside 333.12.
10. Can a pairing Allow also allow a waiting route?
    Recommended: never; only the Allow whose lines name it.
11. Should See a sample show New session, so App Review sees it?
    Recommended: yes, with Create saying nothing ran.

## 9. Evidence

### 9.1 The tree at `da71a9a4`

`ios/Tortie/Door/Keys.swift:176-207, 417, 448-455, 471, 492-500, 502-505, 518-524`;
`ios/Tortie/Door/Pairing.swift:382-385, 440, 467-482, 531-538`; `ios/Tortie/Door/DoorClient.swift:180`;
`ios/Tortie/App/TortieApp.swift:134-135, 143-155, 192, 225-249, 242, 324-338, 419-423, 462-482, 560-570, 593-596, 778`;
`ios/Tortie/App/OwnerCheck.swift:1-6, 28-34`; `ios/Tortie/Screens/DoorWords.swift:220-226, 265-275, 311-316`;
`ios/Tortie/Screens/EndBar.swift:254`; `ios/Tortie/Screens/SessionsScreen.swift:14-32, 411-435, 683-699`;
`ios/Tortie/Style/Copy.swift:371-375, 752`; `ios/TortieTests/Fixtures/frozen/launch.wire.json` (`read`, `routes`,
`routeMembership`, `types`, `phoneBuild`, `macVersion`).

`src/main/pocket/pairing.ts:233-271, 288-296, 324, 336-360, 410-415, 445, 506-512, 549-551, 601, 654, 704-739, 724,
805-858, 1032, 1115-1130, 1370-1381, 1590-1600, 1618-1640, 1736-1760`;
`src/main/pocket/ipc.ts:806-819, 1434, 1500-1512, 2157-2190, 2203-2216, 2318-2328, 2338-2355, 2364-2375`;
`src/main/pocket/writes.ts:1-60, 62-63, 101, 124-125, 548-562, 569-575, 584-589`;
`src/main/pocket/door/limits.ts:21-23, 35, 77`; `src/main/pocket/door/wire.ts:57, 89-96`;
`src/main/pocket/door/listener.ts:488-491, 543-556`; `src/main/pocket/server.ts:176-181`;
`src/main/pocket/routes.ts:892`; `src/main/capabilities.ts:464`; `src/shared/ipc/pocket.ts:139, 707-708, 1107`;
`src/main/push/alert.ts:38, 96-123`; `src/main/push/engine.ts:282-296`.

`src/main/sessions/core.ts:2216-2236, 3290-3293`; `src/main/sessions/reconcile-plan.ts:302-324`;
`src/main/sessions/mutation-ledger.ts:20-25`; `src/main/sessions/create-local.ts:195-200, 303, 624, 646-669`;
`src/main/sessions/launch-plan.ts:443`; `src/main/restart/restart.ts:152-182`;
`src/main/machines/remote-sessions.ts:1742-1749, 2069, 2086`; `src/main/machines/machine-agents.ts:1-30`;
`src/main/tmux/resolve.ts:128, 761-763, 774-780, 1204-1220, 1270-1276`; `src/main/agents/detection.ts:678-681, 719-728`;
`src/main/agents/registry.ts:1445-1447, 2028`; `src/main/agents/flags.ts:135, 496`;
`src/main/settings/store.ts:17-41`; `src/main/screen/keys.ts:108-113`; `src/main/reply/text-rules.ts:18-19`;
`src/main/manifest/projects-repository.ts:153-159`; `src/shared/types.ts:537`;
`src/shared/settings.ts:29, 872-880, 1380-1397`; `src/renderer/state/sessions-slice.ts:464-472, 1124-1172, 1265-1303`;
`src/renderer/settings/launch-agent.ts:52`; `src/renderer/app/CreateSessionModal.tsx:738, 820`;
`src/renderer/settings/PhoneSection.tsx:849, 1399-1415`.

`build/conformance-pocket.mjs:312, 951, 1279, 1326-1343, 6166-6186, 10588, 11420`;
`build/assert-door-only-adds.mjs:14-19, 141, 938-944, 1029-1030, 1220`;
`build/conformance-ios.mjs:245-256, 365-370, 1102, 1588, 3077, 13378-13385`; `build/conformance-push.mjs:73`;
`build/p316/probe-p316.mjs:79, 210`; `build/p316/SPEC.md:748`; `build/p337/probe-p337.mjs:511`;
`build/p317/probe-p317.mjs:314`; `docs/audits/contract-baseline.txt:5, 255, 260, 282, 379, 421, 540, 580`;
`docs/research/127-the-phone.md:790`; `docs/research/140-the-public-beta-beside-the-release.md:298-312`;
`docs/BACKLOG.md:37639, 38256, 40423, 41427, 41526, 41615, 41620, 42860, 42862`.

Commits measured with `git show --shortstat`, for sizing: Phase 333.11 `85f90247` (35 files, +9,922), Phase 316.6
`b7cf94f3` (60 files, +13,637), Phase 316.7 `851b3c4c` (72 files, +15,182), Phase 317 `467b4e4a` (116 files, +18,798),
Phase 318 `42becaeb` (145 files, +23,611). History read with `git`: `v0.110.0`, `v0.111.0`, `v0.111.1` (`b97d3b85`),
`3cece73e`, `c3710e45`, `b9bb3f1c`, `a3e6f8c0`, `24ea9232`.

### 9.2 Pages read on 12 October 2026

| Source | What it shows |
| --- | --- |
| https://tailscale.com/kb/1098/machine-names | Unique machine names within one tailnet |
| https://tailscale.com/kb/1225/fast-user-switching | One active account at a time |
| https://developer.apple.com/documentation/usernotifications/generating-a-remote-notification | The `badge` key |
| https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns | The collapse id |
| https://developer.apple.com/documentation/usernotifications/handling-notification-responses-from-apns | 410 `Unregistered` |
| https://developer.apple.com/documentation/uikit/uiapplication/unregisterforremotenotifications() | Unregisters for all remote notifications |
| https://developer.apple.com/app-store/review/guidelines/ | "Last Updated: June 8, 2026"; 2.5.2, 4.2.7, 4.7, 5.1.1, 5.1.2 |
| https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers | One build of each version in review at a time |
| https://support.apple.com/en-us/120340 | Stolen Device Protection |
| https://support.apple.com/guide/iphone/lock-or-hide-an-app-iph00f208d05/ios | iOS's own lock on an app |
| https://code.claude.com/docs/en/remote-control | Server mode, `--spawn`, `--capacity` |
| https://code.claude.com/docs/en/mobile | "You can't select Bypass permissions from the app" |
| https://code.claude.com/docs/en/whats-new/2026-w34 | Device cards |
| https://code.claude.com/docs/en/claude-projects | Project threads, "Allow once" |
| https://code.claude.com/docs/en/interactive-mode | `!` shell mode |
| https://support.claude.com/en/articles/13947068 | Dispatch |
| https://learn.chatgpt.com/docs/remote-connections | Pair every phone with every host |
| https://learn.chatgpt.com/docs/mobile | Start a task on a connected computer |
| https://www.onorca.dev/docs/mobile | Orca's combined list and phone starts |
| https://cmux.com/docs/ios.md | "All Computers" |
| https://getmoshi.app/docs/moshi-cli , https://getmoshi.app/docs/security-sync | Moshi's launcher and Face ID |
| https://github.com/getpaseo/paseo/blob/main/README.md | Paseo's hosts |
| https://docs.github.com/en/apps/using-github-apps/approving-updated-permissions-for-a-github-app | GitHub Apps keep current permissions |
| https://developer.chrome.com/docs/extensions/develop/concepts/permission-warnings | Chrome disables until accepted |
| https://extensionworkshop.com/documentation/develop/request-the-right-permissions/ | Firefox keeps the previous version |
| https://developers.google.com/identity/protocols/oauth2/web-server#incrementalAuth | Incremental authorization |
| App Store pages: Happy https://apps.apple.com/us/app/happy-codex-claude-code-app/id6748571505 , CC Pocket https://apps.apple.com/us/app/cc-pocket-code-anywhere/id6759188790 , Superset https://apps.apple.com/us/app/id6788926383 , Control https://apps.apple.com/us/app/control-ai-agent-remote/id6758480324 , Remote Codetrol https://apps.apple.com/lc/app/remote-codetrol/id6755246569 , Termius https://apps.apple.com/us/app/termius-modern-ssh-client/id549039908 | Approved apps that start agents on a person's computer |

### 9.3 The clones

Shallow clones under the scratchpad's `r141/investigator-d/src/`, read only. slopus/happy at `99f415fa`:
`happy-app/sources/components/SessionsList.tsx:32, 411`; `app/(app)/new/index.tsx:140, 656, 684, 784, 1708-1713`;
`sync/machineChoices.ts:36`; `sync/settings.ts:63`; `sync/spawnRequestId.ts:1-20`;
`happy-cli/src/api/apiMachine.ts:185-193`; `happy-cli/src/daemon/run.ts:281, 352, 378, 413-434, 439, 512`;
`utils/tmux.ts:939-954`. K9i-0/ccpocket at `d929b44d`: `apps/mobile/lib/services/bridge_service.dart:665-697`;
`features/session_list/session_list_screen.dart:1685-1705`; `packages/bridge/README.md:28, 43-45`;
`packages/bridge/src/websocket.ts:1052-1057, 1345`. getpaseo/paseo at `6f62125e`:
`packages/app/src/stores/sidebar-view-store.ts:51`; `components/hosts/host-picker.tsx:126, 216`;
`hooks/sidebar-workspaces-view-model.ts:471-475`; `hosts/appearance.ts:7, 48`;
`packages/server/src/server/session-admission-auth.ts:19, 24`; `packages/app/src/add-project-flow/options.ts:41, 53, 59`;
`packages/server/src/server/session.ts:5128-5131`; `CHANGELOG.md` 0.11.0.
