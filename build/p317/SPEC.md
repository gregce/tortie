# Phase 317 — End from the phone, behind Face ID, through one gate — SPEC

Written by the spec step on 2026-10-01 in `/private/tmp/wt-p317` at `4a363727` (origin/main: 316.5, 323, 324, 326,
330, 331, 332, 332.1, 333.2 and 306 landed), reading Phase 316.6's UNCOMMITTED work in `/private/tmp/wt-p3166` (based at
`28d89295`, its fix round running) as the base this phase builds on. Every `file:line` below was re-read at those two
trees on this date. A line in a 316.6 file is cited "at the snapshot" because that file is still moving.

**Revised the same day, after the adversary answered `revise` with 23 findings**, against `/private/tmp/wt-p317` at
`551312f7`: a LOCAL snapshot commit (never pushed) of 316.6's FIXED tree applied onto `4a363727`, 59 files, recorded in
`…/scratchpad/p317/base/MANIFEST.sha256`. Every 316.6 line cited "at the snapshot" was re-read there and holds. Every
finding was confirmed on that tree and applied where it lands; §14 "§Revision" lists all 23 with the sections they
changed, the three places this revision goes further than the correction asked, and why.

Read with it, whole: `docs/BACKLOG.md` "## Phase 317" (the old entry, 2026-09-21; its measurements of the gates are the
core and bind where the tree agrees, and §3 says row by row where it does not), `build/p317/ENTRY.md` (the amended entry
that replaces it), `docs/research/135-the-reply-door.md` §4 (the write door), `docs/BACKLOG.md` "## Phase 318" under
"Depends on" (the amendments this phase carries), `build/p3166/SPEC.md` and its "§As built" (the phone this builds on),
`docs/research/136-the-phone-in-peoples-hands.md` §13 and §14 (Face ID's purpose string, Touch ID and the passcode),
`docs/research/137-paseo-and-the-phone.md` §5 (the background write), `build/p330/SPEC.md` and its three "§As built"
sections (the door on the internet).

**Where this file and the old entry disagree, this file wins and §3 says why. Where this file and research 135 §4
disagree, §3 says why.**

---

## 0. The hard rules, stated once

- Builders and the integrator launch no Electron and boot no Simulator. Verifiers take THE LOCK (phone phases first, his
  rule of 2026-09-30). No network beyond loopback, ever.
- `/Users/gdc/gmux` and `/Users/gdc/tortiedotsh` are read only. `/private/tmp/wt-p3166` is read only. Nothing is
  committed, staged or stashed by anyone but the committer; the snapshot commit `551312f7` is the main session's, and
  `git diff 551312f7` in this worktree is exactly 317's delta. Install nothing.
- Never `-L gmux`, never the default tmux server, never `pkill`, `killall` or a pattern: a process is ended by the pid
  its starter holds.
- The door on a probe is published only through the stand-in Tailscale (`build/p330/tailscale-standin.mjs`, preflighted
  by sha256, a real Tailscale in any process sample failing the run) and names only the DNS stand-in
  (`build/p332/dns-standin.mjs`, through `GMUX_POCKET_NAME_SERVERS`). Gemini, Qwen, Antigravity, Grok and Droid are
  renamed away by a scratch `agents.json` before every launch and read back through `agents:list`. No model turn: 0.
- Simulators only through `build/simulator-run.mjs`, never Simulator.app, never a screenshot or recording. Every
  `xcodebuild` has its own `-derivedDataPath` under the scratchpad, ad hoc, no team.
- His keychain, credentials, conversation stores and APNs key are never read.
- No raw control byte, bidi, zero-width or BOM character in any committed file.

---

## 1. The answer first

**What a person can do after this phase.**

1. On the iPhone, a session he can end on the Mac shows **End session…** in a bar above the tab bar, with the mark of
   what the phone has (Face ID, Touch ID, or a lock for the passcode). Pressing it shows the Mac's own confirmation,
   word for word (`End '<name>'?`, the body the Mac would show for that session, `End session`). Confirming asks iOS
   for Face ID, Touch ID or the passcode, and only a match sends anything.
2. On the Sessions tab, **Select** picks several sessions, **End selected sessions…** confirms them once, behind one
   Face ID, and each is ended one at a time with its own outcome word, the Mac sheet's words. The list is fixed at the
   confirm and can only shrink.
3. **Unpair this iPhone** in the phone's Settings now asks the Mac to forget this iPhone before the phone forgets the
   Mac, so the Mac's Phones list drops it. Like Remove on the Mac, that withdraws the door's agreement, and the Mac asks
   him to allow the door again.
4. The Mac asks him to allow the door again once after this update, because its route list (a hashed field) gained
   two routes. The sheet names them in words.

**Nothing else about the phone changes**, and no Mac surface is added, renamed or removed: `src/main/menu.ts` does not
move, and the gate asserts it.

### 1.1 The decisions, each with its reason (§5 gives the mechanism)

| # | Decision | Reason |
| --- | --- | --- |
| D1 | **The write door is two `POST` rows on the one closed table, `/v1/end` and `/v1/unpair`**, each `reads: false`, `signed: true`, `windowOnly: false`, no query string, its own body cap. 318 adds `choose` and `say` as two more rows and no second gate | research 135 §1 item 1 and §4.1; 318's "Depends on" item 2 |
| D2 | **The body is signed JSON, parsed strictly in main**: end `{ session, write, batch }`, unpair `{ write }`. `write` is 32 lowercase hex (128 bits). An unknown or missing key refuses the body whole. The door process never parses a write body | research 135 §4.3, §4.11; the door process holds no credential and should hold no session vocabulary |
| D3 | **Main's order is research 135 §4.11, held as code**: quitting or door stopping → signature → strict parse → ledger → one in flight per phone and per session → still paired and this door instance not stopping, with nothing awaited between that check and the act → the row re-read by id and both gates → act → outcome → one log line | research 135 §4.11 and the security adversary's gap (a request forwarded before a Remove still ran) |
| D4 | **404 with no body only for the door's own refusals, all before the act**: quitting or stopping at entry, every signature reason, and the last check before the act. **Everything the verb decides is 200** `{ verb, write, outcome, reason, sentence }`, a malformed body included (`refused`, `malformed`). **After the act nothing replaces the answer**: `bind.ts` skips its post-handle replace for an answer marked `acted`, which is every answer from the act on, a ledger hit for a write that acted (its recorded `acted`), and the `busy` a duplicate of a write still in flight under the same id gets; and the door process cuts the connection, never answers 404, when main's answer to a write is late | research 135 §4.2 and §4.5; 318's amendment "every outcome after a valid signature is 200", with §4.11's own 404 at step 6 kept; §14 finding 9 |
| D5 | **The ledger**: in main, in memory, keyed on (phone id, write id), each entry kept `2 × POCKET_CLOCK_SKEW_MS` (120 s, the constant imported, never re-spelled), at most 512 entries a phone and 4,096 in all; a repeated id answers its recorded body and never acts again; a repeat of an id still in flight answers `busy`; a full ledger answers `busy` and never evicts a live entry | research 135 §4.4 (a nonce is not exactly once; 512 reads later a replay verified `ok`) |
| D6 | **At most once, and the phone never re-sends on its own.** A write cut after its bytes left reads "no answer" on the phone, which re-reads the session; a new press is a new write id and a new Face ID. **Nothing keeps the app running to finish a write**: `conformance:ios` (l) refuses every background task, and it stands. A write the app leaves mid-flight lands at most once on the Mac, and on return the phone says what is true of it. **A write whose bytes were not yet handed to the connection when the app went to the background is withheld and never sent** (`AppModel.wentAway()` stops every live write; the exchange refuses to send once withheld), so a handshake that resumes on return cannot carry it. A write whose bytes left lands within the Mac's 60 s signature clock or not at all | research 135 §4.4; research 137's Paseo #3464; rule (l) (`build/conformance-ios.mjs:1787-1800` at the snapshot); §14 finding 2 |
| D7 | **End asks BOTH gates by id at the press, in main**: the row re-read from `core.listSessions()`, main's `endRefusal` on the manifest record, and the moved shared gate's `canEnd`. Neither alone is enough: main's catches a removed row, the shared one catches `exited`, `restorable` and above all `unknown` | the old entry's central measurement, re-read and still true (§2) |
| D8 | **The shared gate moves to `src/shared/session-gates.ts`, every expression moved and not rewritten, every importer re-pointed, nothing re-exported from `resume.ts`** | the old entry's mechanism 1; 316.7's entry plans `lifecycleOf` beside it in the same file |
| D9 | **The End words move too, to `src/shared/lifecycle-words.ts`**: `resumeReadiness`, `endSessionConfirm`, `removeSessionConfirm`, `LifecycleConfirm`, `LIFECYCLE_SESSION_CHANGED`, `END_UNREACHABLE_TITLE`. The renderer's two words modules (`resume.ts`, `session-manager/copy.ts`) re-export them, so their importers do not move | AMENDS the old entry's "the gate half moves and the copy half stays": the phone must draw main's own sentence for the session, and main cannot import the renderer. One definition each; the renderer's words modules stay the doors their domains read |
| D10 | **The phone's confirm is the Mac's, word for word**: the door composes `endConfirm` with the moved `endSessionConfirm` over main's own row. The approved mock's "The agent stops. Its saved output stays." and "End with Face ID" are dropped, and End.html is redrawn | the old entry's mechanism 3 ("the confirm is drawn first with its shipped sentence"); `conformance:phonecopy`: the mock may not invent a word Tortie does not say |
| D11 | **End sits in a bar above the tab bar** on a session the door offers End for (316.6's "End sits above the tab bar"); the mocks' `…` actions button goes; 318's strip docks above this bar | 316.6's "What this sends to 317"; a kill switch is one press away; the bottom edge is shared with 318 by stacking, not by a second menu |
| D12 | **Face ID, Touch ID or the passcode, on the End press only**: `LAPolicy.deviceOwnerAuthentication`, a fresh `LAContext` per press, never the biometrics-only policy, no switch, nothing on reading, Unpair or anything else. Cancelled or failed: nothing is sent and one line, `Not confirmed. Nothing was changed.` | his ruling of 2026-09-30, "Only for End"; research 136 §14 (a Touch ID phone and a phone with Face ID off must still work, and the words must never say "Face ID" on a Touch ID phone) |
| D13 | **The Mac cannot verify Face ID, and nothing pretends it can**: no field in the write body claims it, no third key | research 135 §4.9 |
| D14 | **End works on a session on another machine**, exactly where the Mac's End works (ruling R11), through the same `killSession` remote branch. The phone's BATCH is narrower in the Mac batch's one named case and in its words: **a remote row on a machine Tortie holds no row for** (`machineRow(id) === null`, `src/main/machines/store.ts:159`) is skipped `unreachable`, because such a row draws its RECORDED status and a single End of it writes `exited` and kills nothing. A machine that stops answering needs no narrowing: its rows read `unknown` (`status-truth.ts:192-205`, `remote-sessions.ts:1162`), and `unknown` is refused single and batch alike | research 127 §5 ("works on a Mac Pro row too"); his rule that a remote session feels identical to a local one; a batch must never report Ended for a process it did not touch (`batch-end.ts:60-80`, `machineKnown`); §14 finding 1 |
| D15 | **End these is one `end` write per session, sequential, from a list frozen at the confirm**; the batch flag on the body selects D14's narrowing; the runner is made at the confirm's press, before the owner check, so a background that comes during Face ID stops it too; the loop stops when the app goes to the background, after a 404, after a write with no answer, and after a write that was not sent | the old entry's mechanism 5; research 137 (Paseo #3464); the Mac sheet's own loop (`runBatchEnd`, `batch-end.ts:146-169`) |
| D16 | **`unpair` removes the SIGNING phone's own row and nothing else**: the phone id is the one the signature verified, never a body field. It is exactly `removePhone`'s body (one private method both call), so it also withdraws the agreement and closes the door until he allows it again, as Remove does today | 316.6's "What this sends to 317"; refusal 8: the hash covers every phone, and a narrowing is still a change a person confirms |
| D17 | **The unpair answer leaves before the cut and the close**: the store write is synchronous and before the answer; posting the new pins and closing the door run in the answer's `after` (`() => Promise<void>`), which `bind.ts` starts right after it posts, whether or not the post reached a live child, and never awaits inside the job `stop()` joins; the door process lets a revoked socket that is answering a WRITE finish that answer and takes no further request on it, and cuts a revoked socket answering only reads at once, as today | measured on the tree: `removePhone` posts the pins at once (`ipc.ts:1805`), `applyPins` destroys the socket carrying the request (`listener.ts:554-562`), and a door stop from inside the handler would join that handler and replace its answer (`bind.ts:434`) |
| D18 | **The phone asks the Mac first and forgets itself second**, because forgetting deletes the keys that sign. The Mac half is bounded at 5 s; past that, or on any failure, the phone still forgets and says the Mac may still list it | 316.6 §5.4's order (the record first) is kept; the Mac half needs the keys |
| D19 | **The confirm lines gain one line in words**, derived from the route list (`Lets an allowed phone end a session and unpair itself`), and `POCKET_READ_ONLY_HONESTY` is renamed `POCKET_DOOR_HONESTY` with a sentence that is true and claims nothing the Mac cannot check (no Face ID clause: D13) | research 135 §4.6 and §4.9; a constant named read only that is drawn under a door that ends sessions is false in code and on screen; §14 finding 12 |
| D20 | **No IPC channel, no `GMUX_*` name, no manifest column**: `gate:contract` stays byte for byte | the door is not IPC; Face ID in the Simulator is driven from the host, not by a seam in the app |
| D21 | **No DEBUG seam bypasses the owner check.** The Simulator arms enrol and answer Face ID from the host through `build/simulator-run.mjs`; the unit tests inject a fake through a protocol whose one production conformer is `LAContext` | a seam that skips authentication is the one seam that must never exist |
| D22 | **The build is replayed onto main after 316.6 lands**: this worktree starts from a recorded snapshot of 316.6's files (§4), and the main session replays 317's delta against that snapshot | the user's go-ahead: "assuming it will be possible to rebase and incorporate, go for it" |

**Subject.** `feat(pocket): end a session from the phone, behind Face ID, through one gate`

**First body line.** `Phase 317: End from the phone, behind Face ID, through one gate`

**Semver.** Minor on the Mac (two routes on the phone's door; the door asks again). The iPhone app 1.0.0, the build
number one above main's at the replay (5 if 316.7 has not landed, 6 if it has, §4.3). Unreleased under his rule: no
bump, no tag, no promote until the phone works end to end.

**Tier 3**, on four of CLAUDE.md's questions: it can lose the person's work (session lifecycle: End stops a running
agent); it is a write on a door that faces the public internet; it holds his credential on the phone (Unpair deletes
it, and now also changes the Mac's agreement); it claims to work across machines (a session here and a session on
another machine). Two independent methods at least, one an attack; §7.6 names five, and the parent measurement is
mandatory.

**Charter.** His rulings of 2026-09-30: 317 is in this release ("all three" phone interaction phases), End is in,
behind Face ID, and Face ID is "Only for End". Research 127 §5 and §11.1 (End and End these, screen 3; Restore and
Remove stay off the phone), research 135 §4 (the write door), 318's "Depends on" list, 316.6's "What this sends to
317", research 136 §13 and §14, research 137 §5, CLAUDE.md refusals 5 and 8 and the status rule.

**Menus.** No change. No Mac surface is added, renamed or removed; Settings then Phone draws one changed sentence and
two new confirm lines, which are words on an existing surface. `src/main/menu.ts` is asserted unchanged.

---

## 2. The tree at this head, re-read

| The old entry or research cites | At `4a363727` (Mac) or the 316.6 snapshot (phone) | Note |
| --- | --- | --- |
| `endRefusal` `lifecycle-gate.ts:76-81`, comments `:69-75`, R11 `:42-49` | unchanged: `:76-81`, `:68-75`, `:43-48`; `END_REFUSED_REMOVED` `:59-60` | holds |
| `canEnd` doc `resume.ts:878`, `canEnd: live` `:949`, `live` `:911-912` | unchanged | holds |
| `sessionActionGates` `:903-953` | `:903-953` | holds |
| `hasRestoreMaterial` `:227`, `offersBareRecovery` `:383`, `showsResumeVerb` `:599-607` | unchanged; `holdsResumableConversation` `:549-556`; `HandbackState` `:505`, `SessionHandback` `:508-516`; `SessionGateEnv` `:830-839`; `SessionActionGates` `:852-883` | `showsResumeVerb` needs `holdsResumableConversation` AND the `SessionHandback` type, so both move (§5.1) |
| `agentShortLabel` the one renderer import `resume.ts:30`, used `:106` in `resumeReason` `:102` | unchanged | holds: the move is possible |
| `./agents` imports react `:45` and the bridge `:52` | `src/renderer/state/agents.ts:45` (`react`), `:52` (`gmuxBridge`) | holds |
| shared may import only shared `assert-import-boundaries.mjs:26`, no builtin `:33` | `:28`, `:35` | moved two lines |
| `endSessionConfirm` `resume.ts:994-1007`, three bodies | `:994-1007`, unchanged words | holds; it calls `resumeReadiness` (`:54-75`), which is pure |
| `END_UNREACHABLE_TITLE` `copy.ts:230`, `SESSION_CHANGED` `:641` | `src/renderer/session-manager/copy.ts:231`, `:635`; `LIFECYCLE_SESSION_CHANGED` the same sentence at `resume.ts:1048-1049` | two spellings of one sentence already; this phase holds them equal by a test and merges nothing (§5.2) |
| `killSession` `core.ts:2802` (research 135: `:2839`) | `src/main/sessions/core.ts:2915`, admitted body `:2924`, `endRefusal` asked `:2939`, Phase 323's tree read `:3014` and end `:3063` | moved twice since |
| `Session not found.` "the verb's own" | `core.ts:3794` (`mustGetSession`), also `src/main/tmux/errors.ts:58`, `src/main/tmux/sessions.ts:441` | holds |
| `actions.ts:7-32`, the rule of the press, `freshRow`, `:24-26` | `src/renderer/session-manager/actions.ts:7-26` | holds |
| the old entry's "six product importers and nine test files" of `sessionActionGates` | product: `session-actions.tsx`, `actions.ts`, `open.ts`, `projection.ts`, `sessions-slice.ts`, `p293-session-manager-drive.ts` (a dynamic `import('../state/resume')` at `:546`), plus `batch-end.ts` and `ManagedGrid.tsx` (types and `hasRestoreMaterial`), `SplitSurface.tsx` and `TerminalRegion.tsx` (`hasRestoreMaterial`, `offersBareRecovery`), and `src/renderer/state/subscriptions.ts:46` (`import type { HandbackState, SessionHandback } from './resume'`); `view.ts` in a comment. Tests: `p119-bare-recovery`, `p141-handback-surface`, `resume.test.ts`, `p293-batch-end`, `p293-integrated-parity` (dynamic import at `:64`), `p293-open` (a `vi.mock('../../state/resume')` at `:152` that supplies `sessionActionGates`), `p293-view`, `p303-lifecycle-partition`, `p293-session-gates`, and `src/renderer/state/__tests__/p141-handback-copy.test.ts:53` (`SessionHandback`) (and comments in four more) | **eleven product files, ten tests** (revision: the adversary found `subscriptions.ts` and `p141-handback-copy.test.ts`, which a plain grep for `from '…/resume'` with the gate's name misses) |
| `build/p303/rederive.mjs` | reads `sessionActionGates` out of `src/renderer/state/resume.ts` (`:87`, `:165`), with an `existsSync` fallback already used for `status-words.ts` (`:88-92`) | not in `package.json`; a verifier's tool. It follows the move the same way (§6.2) |
| the Mac batch's narrowing | `batchEligibility` (`src/renderer/session-manager/batch-end.ts:60-84`) skips a remote row `!machineKnown(id)`, `machineKnown` being the ids in `machineStates` (`actions.ts:955-963`); main's equal is `machineRow(id) !== null` (`src/main/machines/store.ts:159`), already spelled `machineKnown: machineRow(machineId) !== null` at `remote-sessions.ts:2327`; a remote record with no machine row reads its RECORDED status (`remote-sessions.ts:1257`); `answering` is `true` when no state is held (`:1116`); a machine that stops answering makes its rows `unknown` (`status-truth.ts:192-205`, `remote-sessions.ts:1162`) | the reason D14 names the machine row and not `answering` |
| the Mac batch confirm | `BatchPanel.tsx:166-206`: `batchHeading(n)`, `batchBody(anyRemote)` (`copy.ts:702-707`), the target list, `batchSkippedLine`; targets are the rows eligible at the confirm (`view.still`) and a row skipped there appears only in the skipped line; the running phase lists `batch.targets` alone (`:232-270`) | the phone's confirm and run follow it (§5.8.4) |
| `conformance:manager` reads the press rules | `build/p293/conformance-manager.mjs` (23 text rules), its probe `manager-conformance-probe.mts:238` loads `renderer/state/resume.ts`, `ablation:p293` arms 11 and 12 edit `resume.ts`'s `canEnd: live,` (`build/p293/ablation.mjs:91`, `:217-233`) | re-pointed in this phase |
| `conformance:handback` | `build/handback-conformance-probe.mts:228` reads `HandbackState` out of `src/renderer/state/resume.ts` | it must follow the type to `src/shared/session-gates.ts`, its own comment says so (`:72-74`) |
| the door's table `door/table.ts:56-61`, four rows | unchanged | |
| `DoorSignedRoute` `wire.ts:95`; method `'GET'` `:102`, `:272`; read cap `:27`, `:267`; `SIGNED_ROUTES` `:250`; a 404 carries no body `:326` | unchanged | |
| the listener forwards `'GET'` `listener.ts:455`; late answer → 404 `:466-471` | unchanged; refusal 3 `:426-430`, body cap `:436-437`, `catch → 404` `:500-502`, `applyPins` destroys at once `:554-562` | |
| `bind.ts:434` post-handle replace, `:377` validation replace | `:434`, `:375-378`; the dispatch `:418-440` | |
| `server.ts:159-167` refusal 7 after the answer | `src/main/pocket/server.ts:167-176`; every refusal 404 no body `:127-133` | |
| R3's ban `conformance-pocket.mjs:974-1000` | `FORBIDDEN` `build/conformance-pocket.mjs:999-1036`, `forbiddenRules` `:1038` | |
| R4's pin `:659` | `ROUTE_PIN` `:682` = `ad9ce821…`; `PHASE_313_ROUTE_PIN` `:1613` (N1) | |
| G1's words `:1391-1392`, scope `:259` | `LOGGABLE_POISON` `:1423-1424`; `domainFiles` `:282` (src/main/pocket alone) | |
| the confirm hash's route list `pairing.ts:294`, `describePocketDoor` `:399` | `:294`, `:399-445`, the route line `:414`; `POCKET_CLOCK_SKEW_MS` `:1668`; `POCKET_NONCE_MEMORY` `:1671`; `canonicalRequestText` `:1701` | |
| `PocketFacts` `routes.ts:128-209`, `rowOf` `:239-286` | `:136-209`, `:239-284`; `pocketTableIsReadOnly` `:119-122` | |
| `removePhone` | `src/main/pocket/ipc.ts:1799-1811`: writes the store before its first await, posts the pins, forgets the nonces, `forgetPocketDoor()`, then `await this.closeUnlessConfirmed()` | the reason for D16 and D17 |
| `POCKET_READ_ONLY_HONESTY` | `src/shared/ipc/pocket.ts:646-648`, drawn at `src/renderer/settings/PhoneSection.tsx:778` | false after this phase |
| `Face ID` on the phone | no `LocalAuthentication` in `ios/`; `Info.plist` holds `NSCameraUsageDescription` alone; the client key is Secure Enclave with `.privateKeyUsage` only (`ios/Tortie/Door/Keys.swift`) | research 135 §4.9, research 136 §14: still true at the snapshot |
| the phone's write path | `DoorClient.swift` sends `GET` reads and the unsigned `POST /pair` (`exchange`, `:295-330` at the snapshot; `DoorExchange` `:633`, its `send` `:710`); `RequestSigner.headers` already takes a body (`Signing.swift:267-277`) | no crypto change |
| the vectors | `build/p316/vectors.mjs:250` puts `POCKET_ROUTE_IDS` in the door's fields, `:280-292` the request shapes | the vectors move with the route list (§6.3) |
| 316.6 at the snapshot | `PhoneDoor.unpair() -> UnpairOutcome` (`DoorWords.swift:79`), `LiveDoor.unpair` (`TortieApp.swift:656-663`), `AppModel.unpair()` (`:353-364`), `Copy.unpairNote` (`Copy.swift:308`), `CopyTests` refuses `Select` and `End with Face ID` (`CopyTests.swift:172-174`), `wentAway` on `.background` only (`TortieApp.swift:446-456`) | the phone this builds on |
| the copy ledger at the snapshot | `build/p311/copy-drift.mjs`: owed to 317 `Select` (`:750`), `End with Face ID` (`:790`), `The agent stops. Its saved output stays.` (`:795`), the refusals card (`:800-814`); `Actions for .+` as data (`:741`); `End '…'?` owned by `resume.ts` (`:456`) | |
| floors | `HELPER_USER_FLOOR = 161` (`build/assert-electron-teardown.mjs:382`); `SIMULATOR_USER_FLOOR = 2` (`build/assert-simulator-teardown.mjs:95`) | |

---

## 3. Where the old entry is wrong, stale or reconciled

| # | The old entry says | What is true now | This spec |
| --- | --- | --- | --- |
| 1 | "That ruling is OPEN and this phase does not start until he answers it" | Answered 2026-09-30: End is in, behind Face ID, "Only for End" | The charter cites the ruling |
| 2 | "The door's End route takes a session id and nothing else" | A signed JSON body `{ session, write }` (318's amendment 1, research 135 §4.4) | D2, with `batch` added for D14 |
| 3 | "The End route is the ONLY write route and the count is asserted" | 316.6 sends `unpair`; 318 adds `choose`, `say` | A closed write list, `end` and `unpair`, asserted exactly; 318 widens it to four (D1) |
| 4 | "Every write route names a core verb" | R3 bans `killSession` by text in the domain, so a core verb inside the door is a contradiction (research 135 §4.7) | One narrow `PocketWrites` interface in `routes.ts`, implemented once in `src/main/sessions/pocket-writes.ts` (§5.4) |
| 5 | Refusals "drawn verbatim" from four layers | Every refusal is a 404 with no body today (`server.ts:127-133`, `wire.ts:326`), so no sentence could reach the phone | D4: the verb's outcomes are 200 with the owner's sentence |
| 6 | "On failure or cancel the alert stays open and one line appears above the buttons" | A SwiftUI confirmation dialog closes on any press | The line appears in the End bar (§5.8.4) |
| 7 | "No End from the browser, ever. The fallback page stays read-only" | The page was removed (his ruling of 2026-09-22, H1) | Dropped. No page, no fallback |
| 8 | "`gate:contract`'s baseline is regenerated for the new channel" | The door is not IPC; there is no channel | `gate:contract` stays byte for byte (D20) |
| 9 | "the door forced to loopback, a scripted phone" | Since Phase 330 the door is always loopback, published through Funnel | `probe:p317` runs through the stand-in Tailscale and the DNS stand-in (§7.4) |
| 10 | "one test holds the moved functions' answers equal to the parent's" | Holds; and the End words must move too, because the phone draws main's sentence | D9 amends "the copy half stays" |
| 11 | `END_UNREACHABLE_TITLE` "sits beside a disabled End the way the sheet does it" | The sheet draws it as a disabled button's title (`projection.ts:296`) | The door carries it on the row's offer (`unreachable`) and the phone draws it under a disabled End (§5.8.3) |
| 12 | "THE SUCCESSOR, NAMED AND NOT QUEUED. Phase 318 … `send-keys -l`" | 318 is queued (research 135), on this door, and `send-keys -l` was refuted (§3.1) | The successor paragraph goes; "What this sends to 318" replaces it |
| 13 | Research 135 §4.11: a body that does not parse — not said whether 404 or 200 | 318 says every outcome after a valid signature is 200 | `refused` with reason `malformed` and the door's sentence (D4) |
| 14 | Research 135 §4.11 step 6 answers 404 | Kept: the last check before the act is the door's refusal and nothing was done | D4 |
| 15 | (not said) An unpair cuts its own socket | `removePhone` posts the pins before its first await and the door process destroys the requesting socket at once | D17 |
| 16 | (not said) Face ID on Touch ID phones and phones with no passcode | Research 136 §14 | D12; a phone with no passcode draws End off with one line |
| 17 | (not said) A write as the app leaves the foreground | Research 137, Paseo #3464; rule (l) refuses a background task | D6 and D15: no background task, at most once, a write not yet handed to the connection withheld, the truth drawn on return; probe arms E5 to E7 (§7.5) |
| 18 | Research 135 §4.11 step 8 records the write as pending AFTER the gates (step 7), just before the act | Two requests carrying the same write id can be in flight at once (a replay with a fresh nonce); with pending recorded only at step 8, both pass the ledger at step 4 | Pending is recorded at the in-flight claim (§5.3.4 step 3), so a concurrent duplicate of the same id answers `busy` (marked `acted`, never replaced, D4) and never reaches the act; a pending entry that never acts is dropped in that step's `finally`, so a refusal at the gate leaves no entry behind |
| 19 | 316.7's entry: "**Order.** … Before 317 and 318", and its S2 creates `src/shared/session-gates.ts` with `lifecycleOf` | 317 started first on his word (the running log, 2026-10-01: "yes assuming it will be possible to rebase and incorporate, go for it"); 316.7 has not started | §4.2 replays either way: 317 first is the expected order, and a 316.7-first branch is written out. §11 says what 316.7's entry reads when 317 lands first |

---

## 4. The base, and the replay

### 4.1 The base, already made

**Done by the main session, and no builder repeats it.** `/private/tmp/wt-p317`'s `HEAD` is `551312f7`, a LOCAL
snapshot commit (never pushed) of 316.6's FIXED tree (the tab bar, Settings with Unpair, the rendered markdown) applied
onto origin/main `4a363727`: 59 files, each with its sha256 in `…/scratchpad/p317/base/MANIFEST.sha256`, the patches
beside it, and the commit id in `…/scratchpad/p317/SNAPSHOT_COMMIT`. `node_modules` and `build/vendor` are copied in.

317's work goes on top, UNCOMMITTED, so `git diff 551312f7` (plus the untracked files `git status --short` lists) is
exactly 317's delta. The integrator's first act is to check that and nothing more: `git -C /private/tmp/wt-p317
rev-parse HEAD` reads `551312f7…`, nothing is staged, and `git diff --stat 551312f7` names only files §10 assigns.
**If 316.6's last check moves a file after the snapshot, the build does not chase it**; the replay does (§4.2).

### 4.2 The replay (the main session's, after 316.6 lands)

1. For every file in §10's "touches 316.6" list, the 317 delta is `git diff 551312f7 -- <file>`, applied with a
   three-way merge onto main's file (316.6 as landed; the merge base is the file at `551312f7`). A file 316.6's last
   check did not move applies cleanly.
2. Every other 317 file is new or untouched by 316.6 and is copied.
3. The gates then run on the replayed tree: the full battery, `conformance:ios`, `ablation:p316`,
   `conformance:phonecopy`, `test:ios` (Debug and Release, 26.3 and 18.3). A conflict or a red gate stops the replay
   and goes to the operator; nobody resolves a conflict by dropping a clause.
4. **If 316.7 has landed first** (§3 row 19; expected order is 316.6, 317, 316.7, 318), the replay is NOT mechanical
   and is a builder round under this spec, verified like the rest:
   - `src/shared/session-gates.ts` already exists, holding `lifecycleOf`. 317's moved block (§5.1) goes INTO that file
     beside it, and the `sessionActionGates` that moves is the one on main then, which reads its three from
     `lifecycleOf`: "every expression moved and not rewritten" applies to that version. `DOOR_GATE_ENV` joins it.
   - G2 and T24 still hold the partition and the absence of re-exports, read through `lifecycleOf`; `ablation:p293`
     arms 11 and 12 still anchor on `canEnd: live,`, which 316.7 does not touch; `build/p303/rederive.mjs` reads
     whichever spelling of `live`, `unknown` and `ended` the moved function has, and fails by name if it finds none.
   - `Select` and the batch bar attach to `SessionsScreen.swift` instead of `ListScreen(kind: .sessions)`. §5.8.4
     builds them as one attachable piece for that reason, so the move is the attachment point and nothing else.
   - The build number is 6, `PHONE_BUILD = '6'` and its "not uploaded" fixtures 7; the route pin is re-derived with
     `/v1/sessions` in it, and `/v1/sessions`' rows carry `end` from the same `endOffer` (§5.4).
5. **The landing cleans up after itself** (his rule of 2026-10-01, CLAUDE.md, written after the cleanup that freed
   26 GB). Once the follow-up docs commit is pushed, and only after checking that no running process names the path
   (`ps -Ao command | grep <path>`): `git -C /Users/gdc/gmux worktree remove --force /private/tmp/wt-p317` and
   `worktree prune`; every parent or clone the verifiers made (`/private/tmp/wt-p317-parent*`, `/private/tmp/p317-*`);
   `…/scratchpad/p317*`, every `dd-*` DerivedData and archive under it included; and the stale socket files
   `gmux-p317-*` under `/private/tmp/tmux-501/` whose server is gone. Never a path 318 or another phase in flight uses,
   nothing under `/Users/gdc`, and no Simulator (`withSimulator` deletes its own). **The landing
   report says the space freed**, measured with `du -sk` before and `df -k /private/tmp` before and after. At this
   revision the worktree held 1.2 GB (`du -sh`, node_modules and build/vendor copied in) and the scratch folder 1.3 MB;
   the DerivedData and the probes' parents are what grow it.

### 4.3 What moves with the queue

- **The build number.** 316.6 sets 4; 316.7 plans 5. This phase writes `CURRENT_PROJECT_VERSION = 5` and `PHONE_BUILD =
  '5'` on the 316.6 base and moves `conformance:ios` (s)'s "a build this round does not upload" fixtures from 5 to 6.
  If 316.7 lands first, the replay makes them 6 and 7. App Store Connect refuses a build number it has seen, and two
  binaries must never share one.
- **Rule letters.** 316.7 claims `conformance:ios` (aa). This phase takes **(ab), (ac), (ad)** so either order works.
- **The route pin.** 316.7 adds `GET /v1/sessions`. The pin is re-derived by whichever lands second
  (`--write-route-pin`), and the commit body names it.
- **`HELPER_USER_FLOOR`** is one above main's at the replay (162 if nothing else adds a probe first).

---

## 5. The design

### 5.1 The shared-gate move — NEW `src/shared/session-gates.ts`

Moved from `src/renderer/state/resume.ts`, **every expression moved and not rewritten**:

- `HandbackState` (`:505`), `SessionHandback` (`:508-516`);
- `hasRestoreMaterial` (`:227-232`), `offersBareRecovery` (`:383-389`);
- `holdsResumableConversation` (`:549-556`), exported now because `resumeNote` (`resume.ts:163-200`) still reads it;
- `showsResumeVerb` (`:599-607`);
- `SessionGateEnv` (`:830-839`), `SessionActionGates` (`:852-883`), `sessionActionGates` (`:903-953`), with their doc
  comments.

The file imports only `@shared/types` and `@shared/workspace-target`. `resume.ts` imports back what its copy functions
read and **re-exports none of the moved names**. Every importer in §2's row is re-pointed to `@shared/session-gates`,
type and value alike: the eleven product files (`subscriptions.ts` among them) and the ten tests
(`p141-handback-copy.test.ts` among them), the dynamic imports at `p293-session-manager-drive.ts:546` and
`p293-integrated-parity.test.ts:64` included, and `p293-open.test.ts`'s `vi.mock('../../state/resume', …)` (`:152`),
which supplied `sessionActionGates` and now mocks a module `open.ts` no longer reads for it, is re-pointed to
`@shared/session-gates` or dropped with a line saying the real gate is used. `session-actions.tsx` keeps its own
`export { showsResumeVerb }` (`:1208`), re-exporting from the shared file; T24 is about `resume.ts` alone. Since nothing
is re-exported from `resume.ts`, a missed importer is a typecheck failure, never a silent second path.

One new export, beside the gate:

```ts
/**
 * The environment the phone's door asks the gate with (Phase 317). The door asks
 * `canEnd` and nothing else, and `canEnd` reads none of these: a test holds that
 * over every status and every environment.
 */
export const DOOR_GATE_ENV: SessionGateEnv = Object.freeze({
  canRestore: false,
  canDiscard: false,
  shellPathReady: false,
  handback: undefined
});
```

`build/handback-conformance-probe.mts:228` reads `HandbackState` from the new file (its `rendererStates` line; the
seam comment at `:72-74` names the move).

### 5.2 The End words move — NEW `src/shared/lifecycle-words.ts`

Moved byte for byte: `ResumeReadiness`, `resumeReadiness` (`resume.ts:47`, `:54-75`), `LifecycleConfirm` (`:956-960`),
`endSessionConfirm` (`:994-1007`), `removeSessionConfirm` (`:1016-1022`), `LIFECYCLE_SESSION_CHANGED` (`:1048-1049`),
and `END_UNREACHABLE_TITLE` from `src/renderer/session-manager/copy.ts:231-232`. New:

```ts
/** The verb's own words for an id nothing holds (`core.ts:3794`), spelled once more here for the door. */
export const SESSION_NOT_FOUND = 'Session not found.';
/** The End that was asked for and threw something that is not one of the sentences above. */
export const END_FAILED = 'Tortie could not end this session.';
```

`resume.ts` re-exports the six moved names it exported; `session-manager/copy.ts` re-exports `END_UNREACHABLE_TITLE`.
`copy.ts`'s own `SESSION_CHANGED` (`:635`) stays as it is: it was a second spelling of `LIFECYCLE_SESSION_CHANGED` before
this phase, `ablation:p293`'s T10 arm anchors on its literal (`build/p293/ablation.mjs:478`), and merging them is a
tidy-up this phase does not need. A vitest holds the two equal, and holds `SESSION_NOT_FOUND` equal to the three
literals main throws (`core.ts:3794`, `tmux/errors.ts:58`, `tmux/sessions.ts:441`), read as text, so none can drift.

`build/p311/copy-drift.mjs`'s owned rule for `End '…'?` (`:456` at the snapshot) moves its module to
`src/shared/lifecycle-words.ts`, needle unchanged.

### 5.3 The write door

#### 5.3.1 The table, the contract and the wire

`src/main/pocket/door/table.ts` gains two rows, frozen with the rest:

```ts
{ id: 'end', method: 'POST', path: '/v1/end', reads: false, windowOnly: false, signed: true },
{ id: 'unpair', method: 'POST', path: '/v1/unpair', reads: false, windowOnly: false, signed: true }
```

Its header comment ("IT IS TRUE OF EVERY ROUTE IN THIS PHASE") is rewritten: a `reads: false` row is a write, the set
of writes is closed, and `conformance:pocket` R2 and X1 read it. `routes.ts`'s `pocketTableIsReadOnly()` (`:119-122`),
which would now answer false and has three readers, being `src/main/pocket/__tests__/routes.test.ts` (`:32`, `:175`,
`expect(pocketTableIsReadOnly()).toBe(true)`) and two `ablation:p313` anchors (`build/ablation-p313.mjs:248`, `:610`,
which use its first line only as a place to plant text), is replaced by `pocketWriteRouteIds()`, the write rows' ids
read from the table. `routes.test.ts` asserts it answers exactly `['end', 'unpair']`, and the two arms re-anchor on its
first line. **R4's membership pin moves on purpose** from
`ad9ce8210eeed186…` to **`e1f86589effb1488c70aed2d7fa0ad2b55288476226c4b3537e5e6aed7a2124d`** (sha256 of the six sorted
lines `GET /v1/blocked`, `GET /v1/session`, `GET /v1/turns`, `POST /pair`, `POST /v1/end`, `POST /v1/unpair`, computed
by this step and equal to `--write-route-pin`'s method), and the commit body names both values.

`src/main/pocket/door/limits.ts` gains the caps, each computed from the worst legal body (§5.3.3):

```ts
/** A write's body, per route. The door process checks the size; main parses. */
export const POCKET_WRITE_BODY_CAPS = Object.freeze({ end: 512, unpair: 128 } as const);
```

`src/shared/ipc/pocket.ts`:

- `POCKET_ROUTE_IDS` gains `'end'` and `'unpair'`; NEW `POCKET_WRITE_ROUTE_IDS = ['end', 'unpair'] as const` and
  `PocketWriteRouteId`. The header's "No write route. No verb." paragraph is rewritten to say exactly what the two can do.
- `PocketBlockedRow` gains `end: PocketEndOffer`; `PocketSessionDetail` gains `endConfirm: PocketEndConfirm | null`
  (non-null exactly when `end.state === 'offered'`):

  ```ts
  export type PocketEndOffer =
    | { state: 'offered'; batch: boolean }        // both gates say yes now; batch per D14
    | { state: 'unreachable'; title: string }     // `unknown`: END_UNREACHABLE_TITLE, drawn under a disabled End
    | { state: 'none' };                          // ended, or a row End is not offered on
  export interface PocketEndConfirm { title: string; body: string; confirmLabel: string }
  ```

- The write answer, composed field by field:

  ```ts
  export type PocketWriteOutcome = 'done' | 'refused' | 'failed' | 'busy';
  export type PocketWriteReason = 'removed' | 'unreachable' | 'ended' | 'gone' | 'malformed';
  export interface PocketWriteAnswer {
    verb: PocketWriteRouteId;
    write: string;                       // the request's write id, echoed
    outcome: PocketWriteOutcome;
    reason: PocketWriteReason | null;    // non-null exactly when refused
    sentence: string | null;             // the owner's words; null exactly when done
  }
  export const POCKET_WRITE_SENTENCES = {
    busy: 'Tortie is still doing the last thing you asked from this phone. Nothing was done.',
    unreadable: 'Your Mac could not read that request. Nothing was done.',
    unpairFailed: 'Your Mac could not forget this iPhone. Nothing was changed.'
  } as const;
  ```

- `POCKET_READ_ONLY_HONESTY` is renamed **`POCKET_DOOR_HONESTY`**: `'A phone you allow can end a session and unpair
  itself. Nothing on it can type into a session or change anything else on this Mac.'` It names no Face ID, Touch ID or
  passcode: the Mac cannot verify any of them (D13), and any holder of the phone's keys can sign an End without one, so
  the Mac's own sheet does not say it. The phone app says it where it is true, on the phone. `PhoneSection.tsx:48`,
  `:778` and `p316-phone-section.test.tsx` follow the name. (318 rewrites it again.)

`src/main/pocket/door/wire.ts`: `DoorWriteRoute = Extract<PocketRouteId, 'end' | 'unpair'>`; `DoorRequest` gains

```ts
| { readonly route: DoorWriteRoute; readonly method: 'POST'; readonly target: string;
    readonly headers: DoorSignatureHeaders; readonly body: Uint8Array; readonly channel: string }
```

and `doorRequestOf` validates it: the method is `'POST'` exactly for a write route and `'GET'` exactly for a read; a
write's `target` equals its route's path, byte for byte, with no `?`; its body is at most its route's cap. Nothing in
`door/**` parses a write body.

#### 5.3.2 The door process — `src/main/pocket/door/listener.ts`

- **Refusal 3**, after `matchPocketRoute`: a write row whose `url.search` is not empty, or whose raw target holds `?`,
  is refused `route`.
- **Refusal 5**: the body cap is `route.reads ? (route.signed ? POCKET_READ_BODY_CAP_BYTES : POCKET_PAIR_BODY_CAP_BYTES)
  : POCKET_WRITE_BODY_CAPS[route.id]`.
- **Step 6** forwards `method: route.reads ? 'GET' : 'POST'` and `target` (for a write, the path alone).
- **The late answer** (`:466-471`): for a write, `pending.delete(id)` and `tlsSocket.destroy()`, counted in a new stat
  `writesCut`; never `sendPocket(res, 404, null)`. A read keeps its 404.
- **A revoked socket finishes a WRITE's answer, and only that** (`applyPins`, `:554-562`): `Admitted` gains
  `revoked: boolean` and `writes: number` (its requests in flight whose route is a write). A socket whose key is no
  longer pinned, or names another phone, is marked revoked; it is destroyed at once when `writes === 0`, exactly as
  today, and when its last write's response finishes (`res` `'finish'` or `'close'`) otherwise; `handleRequest`
  destroys a revoked socket before it reads anything. **So a Remove cuts every socket that is idle or answering only
  reads at once, as the parent does** (a removed phone's in-flight read is cut with no byte, never answered 404), and
  only the answer to a write already forwarded to main (the unpair's own, or an End's, whichever main decided) is let
  out before the cut.

#### 5.3.3 The body caps, computed

The worst legal `end` body is `{"session":"<128 chars>","write":"<32 hex>","batch":false}` in any key order: 39 bytes
of structure, 128, 32 = **199 bytes** (198 with `batch: true`), measured with `JSON.stringify` at this revision; the cap
is 512. `unpair`'s is `{"write":"<32 hex>"}`, **44 bytes**; the cap is 128. (The first draft said 230 and 43; the caps
held either way.) Real session ids are `randomUUID()`, 36 characters (`create-local.ts:438`, `remote-sessions.ts:1537`). The
session id alphabet (§5.3.4) has no character JSON escapes, so Swift's `JSONEncoder` (which escapes `/` by default)
and `JSON.stringify` write the same length. A vitest and an XCTest each encode the worst body their way and assert it
is at most the cap.

#### 5.3.4 Main's write path — NEW `src/main/pocket/writes.ts`

`server.ts`'s handler keeps steps 1 and 2 for every signed route: refusal 1 (`closing()`, `:137-138`) and refusal 6
(`deps.verify`, `:156-163`, with `method: request.method`, so a write's signature covers `POST` and its body). Then a
read goes on to `deps.answer` exactly as today, and a write goes to the one write path:

```ts
export interface PocketWriteDeps {
  shuttingDown(): boolean;
  stillPaired(phoneId: string): boolean;
  /** Absent: every write is refused 404 `route` before anything (the push seam, tests). */
  writes?: PocketWrites;
  /** The signing phone's own unpair (§5.5). `after` is the ONE type every layer uses. */
  unpairSigningPhone(phoneId: string): { ok: true; after: () => Promise<void> } | { ok: false };
  now?(): number;
}
export function createPocketWriteHandler(deps: PocketWriteDeps): (
  route: PocketRoute, body: Buffer, verifiedPhone: string, door: DoorAdmission
) => Promise<DoorAnswer>;
```

Its order, every step named in the code by number:

1. **Strict parse** (`parseEndBody`, `parseUnpairBody`, the one place a write body is read): one `JSON.parse` in a
   `try`; an object whose `Object.keys(...).sort()` is exactly `batch,session,write` (end) or `write` (unpair);
   `write` matches 32 lowercase hex by a character loop; `session` is 1 to 128 characters of `[A-Za-z0-9._:-]`, read
   one character at a time; `batch` is a boolean. Anything else: 200 `refused`, reason `malformed`,
   `POCKET_WRITE_SENTENCES.unreadable`. **The answer echoes the write id whenever the body yields a well-formed one**
   (a JSON object whose `write` is 32 lowercase hex, whatever else is wrong with it), and `""` only when it does not;
   the ledger records nothing for a malformed body either way. The phone accepts exactly that shape (§5.8.1).
2. **The ledger** (D5): a recorded entry for (phone, write) answers its recorded body, 200, acts on nothing, and
   carries the entry's recorded `acted`, so a recorded answer to a write that acted is never replaced (D4); a pending
   entry for the same (phone, write) answers `busy` marked `acted: true`, because the write it duplicates may be acting
   now and a 404 would say it was not; a full ledger answers `busy`, not marked.
3. **One in flight** per phone and per session (end) or per phone (unpair): a second answers `busy` (not marked: that
   request's write never acted). The claim and a `pending` ledger entry are made here, AT THE CLAIM and not after the
   gates as research 135 §4.11 step 8 has it (§3 row 18); the claim is released in a `finally`, and a pending entry
   that never acted is dropped there too.
4. **The last check, then the act, with nothing between**: `if (deps.shuttingDown() || door.stopping() ||
   !deps.stillPaired(verifiedPhone)) return 404;` and the very next statement starts the act (`deps.writes.end(...)`
   or `deps.unpairSigningPhone(...)`). No await, and no other statement, sits between the check and the act.
5. **The act** is wrapped so it cannot throw past this point: a rejected `end` is the outcome `failed` with
   `END_FAILED`. From here every return is 200 with `acted: true`.
6. **The outcome** is recorded in the ledger (body, `acted: true` and time) and answered.
7. **One log line**: `pocketLog.info(\`the phone's ${verb}: ${outcome}\`, { session })` (the session id for end,
   nothing for unpair). Never the body, the write id, a header or a sentence.

`DoorAnswer` (`bind.ts`) gains two main-side fields that never cross to the door process: `acted?: true` (this answer
speaks for a write that acted, or that may be acting now under the same id; it is never replaced) and
`after?: () => Promise<void>` (the same type as `dropPhone`'s and `unpairSigningPhone`'s, one type everywhere).
`bind.ts`'s dispatch becomes: `if (admission.stopping() && answer.acted !== true) answer = REFUSED;`, post, and then,
**unconditionally and outside the job `stop()` joins**, `if (answer.after) void Promise.resolve().then(answer.after)
.catch(() => log.warn('a phone write could not finish what follows its answer'))` (a literal: G1). Unconditionally because `post()`
returns early when the child has exited (`bind.ts:372`), and an `after` that never ran would leave the agreement
withdrawn while the door still held the old pins. Outside the job because `after` reaches `closeNow` → `bind.stop()`,
which joins `inFlight` for up to `DOOR_STOP_JOIN_MS` (1,000 ms, `limits.ts:37`, `bind.ts:484`): a job that awaited its
own `after` would wait on itself for that second. An acted answer that fails `toDoorOf` is not replaced by 404:
nothing is posted, `after` still runs, and the door process's write timer cuts the connection (D4).

### 5.4 End — `PocketWrites`, the verdict, and the offer

`src/main/pocket/routes.ts` declares, beside `PocketFacts`, a hand-written interface with ONE member (318 adds two):

```ts
/**
 * The phone's writes, implemented once OUTSIDE this domain (src/main/sessions/pocket-writes.ts)
 * and handed in. Nothing here can name the verb it reaches (R3).
 */
export interface PocketWrites {
  /**
   * End one session, after asking both gates over the row re-read by id. Nothing is awaited
   * before the verb is called. It answers an outcome and never throws.
   */
  end(input: { sessionId: string; batch: boolean }): Promise<PocketEndOutcome>;
}
export type PocketEndOutcome =
  | { outcome: 'done' }
  | { outcome: 'refused'; reason: 'removed' | 'unreachable' | 'ended' | 'gone'; sentence: string }
  | { outcome: 'failed'; sentence: string };
```

and `PocketFacts` gains one OPTIONAL read member, `endOffer?(session: Session): PocketEndOffer`, which `rowOf` puts on
every row; **absent reads `{ state: 'none' }`**, which is what an absent dep already meant. Optional because
`PocketFacts` literals are built outside the door builder's files (`src/main/harness/push-seam.ts:787-801`, a
`conformance:push` path, and `src/main/pocket/__tests__/switch-queue.test.ts:267`), and a required member would stop
both compiling for a field neither needs. `session()` adds `endConfirm: base.end.state === 'offered' ?
endSessionConfirm(session) : null`, the moved shared function over main's own row, so the phone reads the Mac's
sentence for that session.

NEW `src/main/sessions/pocket-writes.ts`, the one implementation:

```ts
/** Pure: both gates over the row as it is NOW, and the batch's one narrowing. */
export function endVerdict(
  session: Session | undefined,
  record: Pick<ManifestSessionRecord, 'status'> | undefined,
  batch: boolean,
  /** Whether Tortie holds a row for this machine: the Mac batch's `machineKnown`, main's spelling. */
  machineKnown: (machineId: string) => boolean
):
  | { ok: true }
  | { ok: false; reason: 'removed' | 'unreachable' | 'ended' | 'gone'; sentence: string };

export function endOfferOf(session: Session, record: … | undefined, machineKnown: …): PocketEndOffer; // pure
export function createPocketWrites(deps: {
  core: () => PocketWritesCore | null;
  /** Production: `(id) => machineRow(id) !== null`, from src/main/machines/store.ts. Tests inject. */
  machineKnown?: (machineId: string) => boolean;
}): PocketWrites & { endOffer(session: Session): PocketEndOffer };
```

`endVerdict`, in this order, and each arm says which gate owns it:

| Arm | Reason, sentence | Owner |
| --- | --- | --- |
| `endRefusal(record)` is not null | `removed`, its own sentence (`END_REFUSED_REMOVED`, `lifecycle-gate.ts:59-60`) | main's gate |
| no listed row, no record | `gone`, `SESSION_NOT_FOUND` | the verb's |
| no listed row, a record | `gone`, `LIFECYCLE_SESSION_CHANGED` | the press rule's |
| status `unknown` | `unreachable`, `END_UNREACHABLE_TITLE` | the shared gate (`canEnd` false) |
| `canEnd` false (exited, restorable) | `ended`, `LIFECYCLE_SESSION_CHANGED` | the shared gate |
| `batch`, `session.machine !== undefined` and `!machineKnown(session.machine.id)` | `unreachable`, `END_UNREACHABLE_TITLE` | the batch's narrowing, the Mac batch's own predicate (D14, `batch-end.ts:78`) |
| otherwise | ok | both |

Nothing in `pocket-writes.ts` reads `machine.answering`: a machine that is not answering already reads `unknown`
(D14), and an arm on `answering` never fires. `canEnd` is `sessionActionGates(session, session.status,
DOOR_GATE_ENV).canEnd`. `end(input)` reads `core.listSessions()` and `core.manifest.getSession(id)`, asks `endVerdict`,
and on ok calls `core.killSession(id)` as the first await in the function. **A thrown error maps BY CODE ONLY**
(`isGmuxError`, `src/main/errors.ts:160`), and no `.message` is read: `SESSION_NOT_FOUND` (`core.ts:3794`) reads
`gone` with `SESSION_NOT_FOUND`; `INVALID_INPUT` (the race where a row was removed after the verdict, `core.ts:2939-2942`)
asks `endRefusal(core.manifest.getSession(id))` AGAIN and reads `removed` with the sentence it returns, or, when it
returns null, `failed` with `END_FAILED`; anything else is `failed` with `END_FAILED`. **No error's message ever
reaches the phone or a log**: a failed tmux command's message holds its argv (research 135 §4.8), and X6 stands as
written.

`endOffer` uses the same `endVerdict` with `batch: false` for `state`, and `batch` is `endVerdict(…, true, …).ok`.
`createPocketFacts` (`facts.ts:200`) takes `endOffer` as an injected dep; `src/main/capabilities.ts:368-399` builds
`createPocketWrites({ core: () => pocketCore })` once (its `machineKnown` defaulting to the store's `machineRow`) and
hands `writes` to `PocketHost` and `endOffer` to the facts. Absent (the push seam's `PocketFacts` at `push-seam.ts:787`
and its host at `:807`, `switch-queue.test.ts`, and other tests), every row reads `{ state: 'none' }` and every write
route answers 404 before anything. Neither of those two files is edited by this phase.

**What End does on the Mac is the desk's End**: `killSession`'s order is untouched (capture, Phase 323's tree read,
hang-up, `exited`, the broadcast, the tree's end). Every window draws the session ended exactly as if he had pressed
End there. No status is set by the door: `killSession` is the verb, and `pocket-writes.ts` names no `noteHookEvent`,
`noteUserInput`, `applyDetectedStatus` or `setStatus`.

### 5.5 Unpair — the signing phone's own row

`PocketHost` (`ipc.ts`) gets ONE private method both callers use, so the two cannot drift:

```ts
/** Drop one phone from the store. Synchronous; the cut and the close are returned, not run. */
private dropPhone(phoneId: string): { ok: true; after: () => Promise<void> } | { ok: false };
```

It is `removePhone`'s body up to its first await (`ipc.ts:1800-1808`: read the store, write it without the phone,
forget the nonces and `addedAt`, `forgetPocketDoor()`), and its `after` is the rest (`postPins()`,
`closeUnlessConfirmed()`, `changed()`), typed `() => Promise<void>` here, on `unpairSigningPhone`, and on
`DoorAnswer.after` alike. `removePhone` calls `dropPhone` and awaits `after()` at once, exactly as today.
`unpairSigningPhone(phoneId)` calls `dropPhone` and hands `after` to the write path, which puts it on the answer;
`bind.ts` starts it after the post, unconditionally and unawaited by the dispatch job (§5.3.4). Those are the only two
places an `after` is run.

- The phone id is `verdict.phoneId` from the signature, never a field of the body (the body is `{ write }`).
- A phone the store does not hold cannot reach here (the signature refuses `unpaired`).
- A store that will not write answers `failed`, `POCKET_WRITE_SENTENCES.unpairFailed`, and nothing changed.
- **The consequence is Remove's**: the agreement is withdrawn, the door closes, and the Mac's Phones list and confirm
  lines no longer name the phone. A second paired phone reads nothing until he presses Allow. That is refusal 8 holding
  for a narrowing too, and it is stated, not fixed (§12).

### 5.6 The confirm lines and the sheet

`describePocketDoor` (`pairing.ts:399-445`) adds, after the route line (`:414`), when any write route is in
`fields.routes`:

```ts
const WRITE_CLAUSES: Readonly<Record<PocketWriteRouteId, string>> = { end: 'end a session', unpair: 'unpair itself' };
lines.push(`Lets an allowed phone ${clauses.join(' and ')}`);   // 318: a comma list
```

The line is derived from the hashed route list, so "the lines are exactly the hashed facts" holds. The hash
algorithm (`sha256-pocket-exec-v3`) does not change; the route list moving moves the hash, which is the point. After
this update the Mac reads `changed` and asks him to Allow once; the line he reads is `Answers these and nothing else:
blocked, end, pair, session, turns, unpair` and then `Lets an allowed phone end a session and unpair itself`.

### 5.7 Every refusal, by layer

| What the person reads | Where it is spelled | Who decides it | When |
| --- | --- | --- | --- |
| `This session was removed, so there is nothing to end. Nothing was changed.` | `lifecycle-gate.ts:59-60` (main) | main's gate, `endRefusal` | at the press |
| `Tortie cannot see whether this session is running, so it cannot end it.` | `lifecycle-words.ts` (moved from `copy.ts:231`) | the shared gate (`unknown`); the batch narrowing | on the row (End drawn off) and at the press |
| `This session changed. Nothing was done.` | `lifecycle-words.ts` (moved from `resume.ts:1048`; `copy.ts:635` held equal by a test) | the shared gate (`exited`, `restorable`); the press rule (no listed row) | at the press |
| `Session not found.` | `lifecycle-words.ts`, held equal to `core.ts:3794` | the verb (an id nothing holds) | at the press |
| `Tortie could not end this session.` | `lifecycle-words.ts` | the verb threw something else | after the act |
| `Tortie is still doing the last thing you asked from this phone. Nothing was done.` | `POCKET_WRITE_SENTENCES.busy` | the door (ledger or one in flight) | before the act |
| `Your Mac could not read that request. Nothing was done.` | `POCKET_WRITE_SENTENCES.unreadable` | the door (strict parse) | before the act |
| `Your Mac could not forget this iPhone. Nothing was changed.` | `POCKET_WRITE_SENTENCES.unpairFailed` | the host (store write) | at the act |
| (404, no body) | nowhere: a word in main's log | the door: quitting, stopping, every signature reason, the last check | before the act |
| `Your Mac did not end it. Nothing was changed.` | `Copy.swift` (phone) | the phone, for a 404, and for a write it withheld because the app left before its bytes were handed (D6) | then re-reading |
| `Your Mac did not answer. This is the session as it reads now.` | `Copy.swift` | the phone, for a failure after its bytes were handed, **and only when the re-read that follows succeeded** | after re-reading; a re-read that fails draws the read's own consequence instead (its sentence, or back to the list, or Pairing), because "as it reads now" would be false |
| `Not confirmed. Nothing was changed.` | `Copy.swift` | the phone, Face ID cancelled or failed | before anything is sent |
| `Set a passcode on this iPhone to end a session from it.` | `Copy.swift` | the phone, `LAError.passcodeNotSet` | on the bar, before a press |

The door supplies no sentence of its own for any refusal a gate owns.

### 5.8 The phone

Builds on the 316.6 snapshot. Every drawn word is `Copy.swift`'s or the door's. No `print(`, no log, no new colour.

#### 5.8.1 The client — `ios/Tortie/Door/DoorClient.swift`, `Door/Contract.swift`

- `DoorClient` gains `end(_ sessionId: String, batch: Bool, door: PairedDoor) async throws -> WriteResult` and
  `unpair(door: PairedDoor, timeout: TimeInterval) async throws -> WriteResult`, both through ONE private
  `signedPost(route:body:door:limits:)`, which makes a fresh write id per call (`WriteId.fresh()`: 16 bytes from
  `SecRandomCopyBytes`, 32 lowercase hex), encodes the body with `JSONEncoder` and `.sortedKeys`, signs `POST`, the
  path and the body (`RequestSigner.headers(method:target:body:…)`), and presents the client identity.
- `WriteResult`: `.answered(PocketWriteAnswer)` (200, and the echoed `write` equals the id sent, OR the echo is `""`
  with outcome `refused` and reason `malformed`, the one answer the Mac makes when it could not read an id, §5.3.4 step
  1; any other echo is `.noAnswer`); `.notTaken` (404); `.noAnswer` (any failure AFTER the request's bytes were handed
  to the connection); `.notSent(DoorFailure)` (any failure before, a withheld write included).
- **`handed`, not `written`** (revision, §14 finding 2): a write's `DoorExchange` sets `handed = true` on its own queue
  in `send()`, as the statement immediately before `connection.send`, and classifies by it. The first draft's
  `written` flag, set in the send's completion, left a gap: a failure between `connection.send` and its completion read
  `.notSent` while the bytes may have left, and `.notSent` must mean they did not.
- **A write is withheld when the app leaves before its bytes are handed.** A write exchange's cancellation, run on its
  queue, does exactly one thing: if `handed` is false it sets `withheld = true` and finishes `.notSent`; if `handed` is
  true it does nothing, and the exchange ends by its answer, its failure or its timer, as today. `send()` checks
  `withheld` (and `result == nil`) before `handed = true` and `connection.send`, so a handshake that completes after
  the cancel, including one iOS resumes on the way back, sends nothing. `AppModel.wentAway()` cancels every live write
  (§5.8.4, §5.8.5). Reads do not change: their cancellation still finishes them at once.
- `Contract.swift` decodes `end` (absent on an older Mac: `.none`, so no End is drawn), `endConfirm`, and
  `PocketWriteAnswer` with closed outcome and reason words; an unknown word is `.noAnswer`.
- Nothing retries. No write call sits inside a loop that repeats it.

#### 5.8.2 The owner check — NEW `ios/Tortie/App/OwnerCheck.swift`, the one file that imports `LocalAuthentication`

```swift
enum OwnerKind: Equatable, Sendable { case faceID, touchID, passcode, none }
enum OwnerAnswer: Equatable, Sendable { case confirmed, notConfirmed, needsPasscode }
protocol OwnerCheck: Sendable {
    func kind() -> OwnerKind                          // canEvaluatePolicy(.deviceOwnerAuthentication), then biometryType
    func confirm(reason: String) async -> OwnerAnswer // a NEW LAContext per call
}
struct DeviceOwnerCheck: OwnerCheck { … }             // the one production conformer
```

`.deviceOwnerAuthentication` and never `.deviceOwnerAuthenticationWithBiometrics`, so Face ID off, a Touch ID phone and
a phone that falls back to its passcode all work. `kind()` answers `.none` and `confirm` answers `.needsPasscode` for
`LAError.passcodeNotSet`; every other failure is `.notConfirmed`. `touchIDAuthenticationAllowableReuseDuration` is never
set. The reason string is the confirm's own label (`End session`, or the batch's `End 2 sessions`). The glyph on the End
bar is `faceid`, `touchid` or `lock` by `kind()`, an image with no words, so a Touch ID phone never reads "Face ID".
`Info.plist` gains `NSFaceIDUsageDescription` = `Tortie asks for Face ID before it ends a session on your Mac.`
(research 136 §13: required for any app that uses Face ID). `AppModel` takes `ownerCheck: any OwnerCheck =
DeviceOwnerCheck()`.

#### 5.8.3 The End bar — NEW `ios/Tortie/Screens/EndBar.swift`, on `SessionScreen`

`EndModel` (one per session screen, built by `SessionRoute` in `TortieApp.swift` from the reader's writer) and
`EndBar`, drawn by `SessionScreen` in `.safeAreaInset(edge: .bottom)`, which sits above the tab bar:

- **`offered`**: one 50-tall row on `bgSurface` with a top hairline, the glyph and `Copy.endSessionMenu` (`End session…`)
  in `Tokens.error`, left aligned. When `kind() == .none`, the row is drawn off (`textMuted`) with
  `Copy.endNeedsPasscode` under it.
- **`unreachable`**: the row drawn off, the door's `title` under it.
- **`none`**: no bar at all.
- **The press**: `.confirmationDialog(endConfirm.title, titleVisibility: .visible)` with
  `Button(endConfirm.confirmLabel, role: .destructive)` and `Button(Copy.cancel, role: .cancel)`, message
  `Text(verbatim: endConfirm.body)`. The destructive press asks `ownerCheck.confirm(reason: endConfirm.confirmLabel)`;
  only `.confirmed` reaches `EndRunner.run([id], batch: false)`. While the check runs the bar draws `end-confirming`;
  while the write runs the row is off and reads `Copy.ending`.
- **After**: `done` draws nothing and re-reads the session (it then reads Ended, and the bar goes); `refused`, `failed`
  or `busy` draws the door's sentence in `end-line` under the row; `.notTaken`, and a `.notSent` that was withheld,
  draw `Copy.endNotTaken` (both are true: the Mac did not end it) and re-read; `.noAnswer` re-reads and draws
  `Copy.endNoAnswer` **only if that re-read succeeded**, and otherwise the re-read's own consequence (its sentence,
  back to the list, or Pairing: a door another phone's unpair or a Remove closed reads that way, §14 finding 21); any
  other `.notSent` draws `DoorWords.sentence(for:)`.
- The single End is a one-row `EndRunner`, made at the destructive press before the owner check (its `run` still
  called only in `case .confirmed`, (ac)) and registered with `AppModel`, so leaving the app while the Face ID prompt
  is up stops it before it sends (D15). The prompt itself takes the scene to `.inactive`, never `.background`, and
  `wentAway()` runs on `.background` alone (`TortieApp.swift:446-456`), so the prompt does not stop it.
- A second press while one is confirming or writing does nothing.

`SessionScreen.swift`'s header comment says End is here and pressing an option is still 318's.

#### 5.8.4 End these — NEW `ios/Tortie/Screens/EndBatch.swift`, on the Sessions tab

On `ListScreen(kind: .sessions)` (316.6's; 316.7 moves it, §11). **Built as ONE attachable piece**: the selection
state, the bar, the confirm and the run live in `EndBatch.swift` behind one view modifier (or one wrapper view) that
`ListScreen` applies in one place, so 316.7's `SessionsScreen.swift` adopts it by moving that one line (§4.2 item 4).

- **`Select`** (`Copy.select`) at the title's trailing edge, drawn only when at least one row's offer is `offered`.
  Selecting draws a circle on every row (`circle` / `checkmark.circle.fill`, selected trait, no words), a row tap
  toggles instead of opening, and the title row reads `Copy.cancel`.
- **The bar above the tab bar**: `N selected` (`Copy.selectedCount`) and `End selected sessions…` (`Copy.endSelected`),
  on when at least one selected row's offer is `offered` with `batch: true`.
- **The confirm is the Mac sheet's, in the Mac sheet's order** (`BatchPanel.tsx:166-206`): title `End N running
  sessions?` (`Copy.batchHeading`); message `Copy.batchBody(anyRemote)` FIRST (the Mac's `batchBody`, `copy.ts:702-707`,
  `anyRemote` true when any TARGET row's `machine` is non-null), then the names of the N one per line, then, when any
  were skipped, `Copy.batchSkippedLine` (`1 selected session stays unchanged: 1 already ended`); the press `End N
  sessions` (`Copy.batchConfirmLabel`) and Cancel. One owner check, with the press's words as its reason. The targets
  are the selected rows eligible at the confirm (offered with `batch: true`); **a row skipped there is counted in the
  skipped line only and is not a target**, as on the Mac, so it gets no outcome word.
- **The run** (`EndRunner`, made at the destructive press before the owner check, registered with `AppModel`):
  `targets` is a `let`, the N ids in drawn order, fixed at the confirm and never grown; one `end` write at a time with
  `batch: true`; before each, the first included, `stopRequested` is read and, once true, stays true; each row draws
  its outcome word (`Ending…`, `Ended`, `Already ended`, `Unreachable`, `No longer here`, `Not ended. <sentence>`,
  `No answer`, `Not run`); the title reads `Ending N sessions…`, then `E of N sessions ended`; `Stop` while running,
  `Done` after, which re-reads the list.
- **The door's reason becomes the Mac's outcome word** exactly as the Mac batch maps its skip reasons
  (`batch-end.ts:74-84`, `copy.ts:745-765`): `ended` → `Already ended`; `unreachable` → `Unreachable`; `gone` → `No
  longer here`; **`removed` → `No longer here`**, because the Mac batch reads a discarded row as `gone`; `failed` and
  `busy` → `Not ended. <the door's sentence>`; `.noAnswer` → `No answer`; `.notTaken` → `Not ended. <Copy.endNotTaken>`;
  a withheld `.notSent` → `Not run` (it was never sent); any other `.notSent` → `Not ended. <DoorWords.sentence(for:)>`.
- **It stops** on `Stop`, when `AppModel.wentAway()` runs (the app went to the background: it sets `stopRequested` on
  every live runner and cancels its task, which withholds a write not yet handed, §5.8.1), after a `.notTaken`, after a
  `.noAnswer`, and after any `.notSent`; every row it did not reach reads `Not run`.

The single End is `EndRunner.run([id], batch: false)`, so the app has exactly one call of the writer's `end`.

#### 5.8.5 A write as the app leaves the foreground — no background task

`conformance:ios` (l) refuses every way to keep the app running after it leaves the screen (`beginBackgroundTask`,
`BGTaskScheduler`, `performExpiringActivity` and the rest, `build/conformance-ios.mjs:1787-1800` at the snapshot), a
clause carried since Phase 316.3, and this phase does not amend it. So:

- A write whose bytes reached the Mac before iOS suspended the app is acted on once by the Mac, whatever the phone does
  next: the Mac does not wait for the phone, and the ledger refuses a second act.
- **A write whose bytes were not handed to the connection when the app went to the background is withheld at that
  moment** (`wentAway()` cancels every live runner's task; the exchange's cancellation sets `withheld` and finishes
  `.notSent`, and `send()` refuses once withheld, §5.8.1). Without this, the exchange's `.ready` handler
  (`DoorClient.swift:690-695`) would send the bytes when a handshake suspended mid-way resumed on return, because its
  timer runs on uptime (`:683-685`) and only Task cancellation could stop it (`:666-673`), and 316.6's `wentAway()`
  only cleared a notice (`TortieApp.swift:271-273`). Nothing is ever sent after return.
- **What remains, stated**: a write whose bytes were handed lands on the Mac within its 60 s signature clock
  (`POCKET_CLOCK_SKEW_MS`, `pairing.ts:1668`, checked at `:1835-1837`) or is refused there before the act; it is never
  acted on later than that.
- On return (`cameToForeground`, `foregroundTick`), the session screen re-reads, so what it draws is the Mac's truth,
  and the End line says `done` only when the answer arrived; otherwise it says the no-answer or not-taken line over the
  re-read state.
- The batch stops at `wentAway()`; every row it did not reach, and the row whose write was withheld, reads `Not run`.
- The Mac half of Unpair is a write too: `wentAway()` withholds it when its bytes were not handed, the Mac half reads
  `.notReached`, and the local forget still runs, so the phone lands on Pairing with `unpairMacMayList`, which is true.

This is Paseo #3464's lesson taken the other way round: Tortie never queues a write for later, so a write is never
"waiting until the app is reopened"; it either happened once or did not, and the phone says which after it reads.

#### 5.8.6 Unpair, both halves — `TortieApp.swift`, `SettingsScreen.swift`, `DoorWords.swift`

`AppModel.unpair()` starts `unpairing = Task { await unpairNow() }` and draws `Copy.unpairing` under the Unpair row:

1. `let mac = await reader.writer?.unpairOnMac() ?? .notReached` (5 s bound, `DoorLimits.unpairTimeout`);
2. `door.unpair()`, 316.6's local forget, unchanged and in its order;
3. `.kept` with `mac == .removed`: `Copy.unpairHalfDone` (`Your Mac no longer lists this iPhone, but this iPhone could
   not forget your Mac.`); `.kept` otherwise: 316.6's `Copy.unpairFailed`, which is true because the Mac did nothing;
4. `.forgotten`: 316.5's `forgetAddress()`, then `lostPairing()`; the Pairing screen draws the not-paired line, and,
   when `mac != .removed`, `Copy.unpairMacMayList` under it (`If your Mac still lists this iPhone, press Remove in
   Settings then Phone.`).

`Copy.unpairNote` becomes `It forgets this Mac and its keys, and asks your Mac to forget this iPhone.` The three
`/// Names:` pins move to `unpairMacMayList`. `MacUnpair` is `.removed` exactly when the Mac answered 200 `done`.

`DoorWords.swift` declares `protocol DoorWriting: Sendable { func end(_:batch:) async -> WriteResult; func
unpairOnMac() async -> MacUnpair }`, adds **`var writer: (any DoorWriting)? { get }` to `DoorReading`'s REQUIREMENTS**
(beside `alerts`, `facts`, `blocked`, `session`, `turns`, `DoorWords.swift:34-46`), and keeps the default in an
extension: `extension DoorReading { var writer: (any DoorWriting)? { nil } }`. `PairedReader` answers itself. A member
that existed only in the extension would be dispatched statically on `any DoorReading`, which is what `AppModel.reader`
(`TortieApp.swift:111`) and the tabs (`:463`) hold, so the shipping app would read nil and draw no End bar, no Select
and no Mac half of Unpair while concretely typed fakes passed. An XCTest asserts `(PairedReader(…) as any
DoorReading).writer != nil`. A reader with no writer draws no End and no Select, so 316.6's test fakes do not move.

#### 5.8.7 The words — `ios/Tortie/Style/Copy.swift`

Every batch and outcome word is composed from pieces each pinned `/// Mac:` to the composer in
`src/renderer/session-manager/copy.ts` that says it (`END_SESSION` `:202`, `END_SELECTED` `:137`, `selectedCount`
`:139-141`, `batchHeading` `:688-690`, `batchConfirmLabel` `:692-694`, **`batchBody` `:702-707`** (its local sentence
and its remote tail, two pieces), `batchSkippedLine` `:715-734`, `batchRunningHeading` `:736-738`, `batchDoneHeading`
`:740-743`, `batchOutcomeWord` `:745-765`, `BATCH_STOP`, `BATCH_DONE` `:681-682`).
`ios/TortieTests/Fixtures/batch-words.json` holds every composed string for n = 1, 2 and 12, and `batchBody` for
`anyRemote` false and true;
an XCTest asserts the phone's composers produce it, and a vitest asserts the Mac's produce the same file, so the two
cannot drift. The phone's own (`/// Phone:`, each with its reason): `Select`, `Not confirmed. Nothing was changed.`,
`Set a passcode on this iPhone to end a session from it.`, `Your Mac did not end it. Nothing was changed.`, `Your Mac did
not answer. This is the session as it reads now.`, `No answer`, `Unpairing…`, the new `unpairNote`,
`unpairMacMayList`, `unpairHalfDone`. `CopyTests.swift:172-174` drops `Select` from its refused list and keeps `End with
Face ID`.

#### 5.8.8 Identifiers, the plist, the build

`Identifiers.swift` gains `session-end-bar`, `session-end`, `session-end-line`, `end-confirming`, `list-select`,
`list-selected-count`, `list-end-selected`, `row-select-<id>`, `row-outcome-<id>`, `batch-heading`, `batch-stop`,
`batch-done`, `settings-unpairing`, `pairing-mac-line`. `Info.plist` gains the one key. `project.pbxproj`:
`CURRENT_PROJECT_VERSION = 5` in all six configurations (§4.3).

### 5.9 What does not change

`killSession` and every lifecycle verb; the manifest and its schema; the tmux layer; every status rule; `menu.ts`; the
IPC contract and the baseline; the read routes' answers except the added fields; the signature, the nonce memory and
the clock window; the QR; Funnel; the door process's import wall (W2); the push and the alerts; Restore, Remove,
Restart, Rename and Resume from the phone (none); the Mac sheet's End and batch (they read the moved gate and words,
byte for byte).

---

## 6. The gates, clause by clause

Every new or widened clause has an ablation arm that turns it red on its own, against a green base, restored by sha256
in a `finally`; an arm whose anchor text is absent FAILS by name.

### 6.1 `conformance:pocket` (`build/conformance-pocket.mjs`) and `ablation:p313`

- **R2 widened**: a row is a read (`reads: true`, `GET` or the pairing row) or a write (`reads: false`, `POST`,
  `signed: true`, `windowOnly: false`); the write ids are EXACTLY `end` and `unpair`, and each has a cap in
  `POCKET_WRITE_BODY_CAPS`.
- **R4**: `ROUTE_PIN` regenerated with `--write-route-pin` to `e1f86589…` (§5.3.1).
- **N1**: "no route names the push". Its word test stays; `PHASE_313_ROUTE_PIN` and both of its comparisons go (318's
  amendment, which 316.7 also plans).
- **R3**: `FORBIDDEN` stays whole. **G1**: `LOGGABLE_POISON` gains `text`, `message`, `words`, `label`, `typed` and
  `reply`; its scope gains `src/main/sessions/pocket-writes.ts`. **Three log calls that ship today match the widened
  words** (the adversary's run of the gate's own matching, re-run at this revision over `src/main/pocket`, three hits and
  no more): `bind.ts:405` (`${message.word}`), `ipc.ts:1281` and `pairing.ts:546` (`err.message`). The door builder
  rewrites all three in this round, so G1 is green against the same tree it widens on: `bind.ts` logs a local `word`
  read before the call (`const word = message.word;`), and the other two log `err instanceof Error ? err.name : typeof
  err`, a word and never a message. No exception list.
- **A4 amended**: (b) reads that the post-handle replace is guarded by `answer.acted !== true`, and that `after` is
  started after the post, unconditionally, by `void Promise.resolve().then(…)` and not awaited by the dispatch job; (a)
  still reads the read handler; (d), the premise that a Remove writes the store before its first await, reads
  `dropPhone`'s store write and that `removePhone` calls `dropPhone` before its first `await`.
- **X1, the write order**: in `writes.ts` the parse, the ledger, the in-flight claim, the last check, the act and the
  outcome appear in that order; between the last check's `stillPaired(` and the act's call there is no `await` and no
  other statement; every `status: 404` return precedes the act; after it every return carries `acted: true`; before
  it, the only returns that carry `acted` are the ledger's (a recorded hit's own `acted`, and the `busy` for a pending
  entry of the same write id).
- **X2, the strict parse**: one `JSON.parse` in the domain's write path, inside a `try`, in the parse functions alone;
  the key sets compared exactly; `write` and `session` read by a character loop (R1 refuses a pattern in this domain).
- **X3, the ledger**: keyed on phone and write id; each entry stores its `acted`; its lifetime is
  `2 * POCKET_CLOCK_SKEW_MS` imported from `./pairing`; caps 512 and 4,096; no eviction of an entry younger than its
  lifetime; the pending entry is created at the in-flight claim (§3 row 18); `writes.ts` imports no `node:fs`.
- **X4, one in flight**: per phone and per session, claimed before the act and released in a `finally`.
- **X5, `PocketWrites`**: declared once, in `routes.ts`, with exactly the member `end`; implemented once, in
  `src/main/sessions/pocket-writes.ts`; handed to `PocketHost` by `src/main/capabilities.ts` and tests alone. In that
  file `end` calls `endRefusal(` and reads `.canEnd` of `sessionActionGates(` with `DOOR_GATE_ENV` before its first
  `await`, which is `killSession(`; the batch arm reads the injected `machineKnown(` and nothing in the file reads
  `.answering`; the production `machineKnown` is `machineRow(` from `src/main/machines/store.ts`; it names no other
  lifecycle verb and no status setter. `PocketFacts.endOffer` is optional (`?:`).
- **X6, the answer**: `PocketWriteAnswer` has exactly its five fields; every `sentence` the write path or
  `pocket-writes.ts` sets is a named constant from `lifecycle-words.ts`, `lifecycle-gate.ts`'s `endRefusal`, or
  `POCKET_WRITE_SENTENCES`; no `.message` of a caught value is read in either file; a caught error is told apart by
  `isGmuxError(`, by code, and nothing else.
- **X7, never 404 after the act**: `bind.ts` as in A4; the listener's late-answer branch reads `route.reads` and
  destroys for a write; nothing in `door/**` answers a write 404 after it was forwarded.
- **X8, the door never parses a write**: no `JSON.parse` in `door/**` reaches a write body; a write's target is its
  path exactly; the cap is read from `POCKET_WRITE_BODY_CAPS`.
- **X9, unpair is the signing phone's**: `unpairSigningPhone` is called once, with the verified phone id; `dropPhone` is
  the one store write that removes a phone and is called by `removePhone` and `unpairSigningPhone` alone; `after` is
  typed `() => Promise<void>` in all three places, and is run only by `removePhone`'s own `await` or by `bind.ts` after
  the post.
- **X10, the revoked socket**: `applyPins` destroys a revoked socket at once unless it is answering a write
  (`writes > 0`), and that one when its last write's response finishes; `handleRequest` refuses a revoked socket
  first.
- **X11, one log line per write**: exactly one log call in `writes.ts`'s answer path, interpolating the verb and the
  outcome word, with the session id as its one field.
- **X12, the lines say it**: `describePocketDoor` derives the write line from `fields.routes` through a compiled map
  keyed by `PocketWriteRouteId`; `POCKET_DOOR_HONESTY` exists and `POCKET_READ_ONLY_HONESTY` does not.

`ablation:p313` gains one arm per new or widened clause (about 20), each red on the rule that owns it; the two arms that
anchored on `pocketTableIsReadOnly()`'s first line (`:248`, `:610`) re-anchor on `pocketWriteRouteIds()`'s.

`conformance:pocket:hostile` (`build/p313/hostile-client.mts`, in-process, the shipping write path over a recording fake
`PocketWrites`) gains, each asserted on its reason or outcome and on the recorder's count: an honest `end` (done, one
act); the same bytes again (404 `replay`); the same write id with a fresh nonce (the recorded body, still one act); two
in flight for one session from two phones (`busy`); a body with a fourth key (`refused malformed`); a query on
`/v1/end` (404 `route`, not forwarded); a `GET` signature on a `POST` (404 `signature`); a body over the cap (404
`oversized`, not forwarded); over another phone's connection (404 `channel`); a phone removed before the act (404, no
act) and after it (200, the act counted once); the door stopping after the act (200, not 404); main's answer later than
the bound (the connection cut, no 404, `writesCut` 1); `unpair` over its own connection (the answer read whole, then the
next handshake refused `unknown-key`); a request pipelined on a revoked socket (destroyed, not forwarded); a READ in
flight when its phone is removed (cut at once with no byte of an answer, as at the parent, never a 404); a duplicate of
an in-flight write id while the door stops (`busy`, 200, not replaced); a recorded hit for a write that acted while the
door stops (its recorded body, 200, not replaced); and a body malformed but for a well-formed `write` (`refused
malformed`, that id echoed).

### 6.2 `conformance:manager`, `ablation:p293`, `conformance:handback`

- The probe loads `shared/session-gates.ts` and `shared/lifecycle-words.ts` where it loaded `resume.ts`; every driven
  rule reads what it read at the parent.
- **NEW G2, the End partition, driven**: over every member of `SESSION_STATUSES`, `endRefusal({ status })` and
  `sessionActionGates(…).canEnd` agree on `running`, `idle`, `needs_input` (both yes) and `discarded` (both no), and
  disagree on exactly `exited`, `restorable` and `unknown` (main passes, the gate refuses). Red if either side is
  tidied toward the other.
- **NEW T24**: `resume.ts` declares and re-exports none of §5.1's moved names, and nothing under `src/` declares a
  second `sessionActionGates`.
- **NEW T25, the phone asks both**: `src/main/sessions/pocket-writes.ts` imports `sessionActionGates` from
  `@shared/session-gates` and `endRefusal` from `./lifecycle-gate`, and `endVerdict` reads both; its batch arm is the
  Mac batch's predicate (`session.machine !== undefined && !machineKnown(session.machine.id)`, `batch-end.ts:78`), read
  as text in both files, and neither reads `.answering`.
- **T23**'s note names `lifecycle-gate.ts`, `session-gates.ts` and `login-switch.ts` as the three spellings of "live".
- **T10** (no tmux word in what the sheet draws) reads `src/shared/lifecycle-words.ts` as well as `copy.ts`, because the
  sheet draws `END_UNREACHABLE_TITLE` and the End sentences from there now.
- `ablation:p293` arms 11 and 12 re-point to `src/shared/session-gates.ts`; new arms for G2 (both directions), T24 and
  T25.
- `conformance:handback` reads `HandbackState` from `src/shared/session-gates.ts`; `ablation:p296` stays green.
- `build/p303/rederive.mjs` (a verifier's tool, in no `package.json` script) reads `sessionActionGates` from
  `src/shared/session-gates.ts` when that file exists and from `src/renderer/state/resume.ts` otherwise, the same
  `existsSync` fallback it already uses for `status-words.ts` (`:88-92`), so it still reads a parent checkout; its
  `readGates` fails by name, as today, when it finds no `live`, `unknown` or `ended`. It is the reader §7.6 method 1's
  verifier may start from, so it must read both commits.

### 6.3 `conformance:ios`, `ablation:p316`, `conformance:phonecopy`, `test:ios`, the vectors

- **(ab) THE WRITE.** `"POST"` in `Door/DoorClient.swift` only on `/pair` and in `signedPost`; `signedPost` called by
  `end` and `unpair` alone; `WriteId.fresh` the one source of a write id, `SecRandomCopyBytes` of 16; the body encoded in
  `signedPost` alone with exactly its keys; a write id is never stored or reused; `end(` of the writer called once in
  the app, in `EndRunner.run`; no `while`, `repeat` or retry around a write call; `handed` set only in `send()`, as the
  statement immediately before `connection.send`, and after a check of `withheld`; a write exchange's cancellation sets
  `withheld` only while `handed` is false; the result is classified by `handed` (§5.8.1). The answer is accepted only
  with the sent id echoed, or `""` with `refused` and `malformed`.
- **(ac) THE OWNER CHECK.** `import LocalAuthentication` and `LAContext` in `App/OwnerCheck.swift` alone; one
  `evaluatePolicy(` with `.deviceOwnerAuthentication`; `deviceOwnerAuthenticationWithBiometrics` and
  `touchIDAuthenticationAllowableReuseDuration` nowhere; a new `LAContext(` inside `confirm`; `DeviceOwnerCheck` the one
  conformer in the app; every call of `EndRunner.run` inside a `case .confirmed` of `confirm(` in the same function;
  nothing in `SettingsScreen.swift`, the unpair path or a read names `OwnerCheck`; no stored key whose name holds
  `faceID`, `biometr` or `ownerCheck`; `Info.plist`'s `NSFaceIDUsageDescription` is pinned to its words (rule (e)'s
  `PINNED_PLIST_KEYS` gains it).
- **(ad) THE LIST THAT ONLY SHRINKS, AND NOTHING SENT AFTER THE APP LEFT.** `EndRunner.targets` a `let`; no `append(`,
  `insert(` or `+=` on it; one awaited write per iteration; `stopRequested` read before each, the first included, and
  never set false after true; every `EndRunner` made at the destructive press, before `confirm(`, and registered with
  `AppModel`; `AppModel.wentAway()` sets `stopRequested` on every live runner AND cancels its task, and cancels the
  unpair's Mac half; the exchange's `withheld` checked in `send()` before `connection.send` (with (ab)); nothing
  persists a write or a target (no `UserDefaults`, file or Keychain write in `EndBatch.swift`, `EndBar.swift` or
  `DoorClient.swift`'s write path), so nothing can be sent again after a relaunch. `P317WriteTransportTests` drives it
  through the SHIPPING `DoorClient` against `test-ios.mjs`'s Node door: a door that holds the raw socket for 2 s before
  the TLS handshake, with the task cancelled at 0.5 s, counts ZERO requests and the result is `.notSent`; a door that
  holds its ANSWER for 2 s, with the task cancelled after the request arrived, answers and the result is `.answered`.
  **(l) stands unchanged**: its background-task clause is the reason a write is never finished behind the person's
  back.
- **(t) widened**: every SIGNED request presents the local identity, the write path included; `POST /pair` stays the one
  exchange with none; the eight HTTP arms stand and EH's write arms (§7.5) join them, each ending in a line `Copy.swift`
  holds.
- **(v) widened**: `DoorWords.endSentence(for:)` answers a non-optional, non-empty `String` for every `WriteResult` but a
  `done` answer, and `EndModel`'s line is never assigned an empty string.
- **(c)** stands: the write path is in `Door/DoorClient.swift`, and only it sends.
- **(k)** names the batch's count operators. **(s)** build 5 (§4.3). **(b)** `VISIBLE_CALLS` unchanged; every new word
  is `Copy`'s or the door's. **(l)** stands whole (§5.8.5). No new colour, so (a) does not move.
- `ablation:p316` gains one arm per clause (about 22).
- **`conformance:phonecopy`** (`build/p311/copy-drift.mjs`): the owed 317 rows (`Select`, `End with Face ID`, `The agent
  stops. Its saved output stays.`, the four refusal-card rows) leave; `Select` is owned by `Copy.swift`; the `Actions for
  .+` data rule leaves with the `…` button; End.html's title, body and `End session` are owned by
  `src/shared/lifecycle-words.ts`; every new `Copy.swift` word is judged; `OWNED_RULE_FLOOR`, `PHONE_MAC_FLOOR` and
  `PHONE_NAMES_FLOOR` rise to the counts the run matches, said in the report. Two self-test mutations: End.html's body
  with one word changed must go red, and `END_SELECTED` renamed must turn `Copy.endSelected` red.
- **The mocks** (`docs/design/phone/`): `End.html` redrawn (the Mac's title, the local-with-conversation body, `End
  session`, Cancel; no refusals card; the End bar under the dim); `Session.html` and `Choice.html` lose the `…` button
  and gain the End bar above the tab bar, 318's strip above it on Session; NEW `EndThese.html` (Select on, three rows
  ticked, the bar, and the confirm in the Mac sheet's order: heading, `batchBody`'s local sentence, the names, the
  skipped line, `End N sessions`, Cancel); `Unpair.html`'s note; `index.html` names the new screen and corrects
  caption 7. `conformance:phonecopy` owns `EndThese.html`'s body by `src/renderer/session-manager/copy.ts`'s `batchBody`.
- **`test:ios`** (`build/p316/test-ios.mjs`): its loopback Node door gains `POST /v1/end` and `POST /v1/unpair`, each
  verifying the signature over method, path and body with `node-phone.mjs`'s `verifySigned` and answering a fixed write
  answer echoing the id, plus two hold modes for (ad) (the raw socket held before the handshake; the answer held after
  the request), each counting the requests it read; NEW `P317WriteTransportTests` drives the SHIPPING `DoorClient`
  against it. The run's rows gain the new test classes. `PASS_WORDS` do not change.
- **The vectors** (`build/p316/vectors.mjs`, `ios/TortieTests/Fixtures/vectors.json`): regenerated for the route list,
  plus two request vectors (`POST /v1/end` with a fixed body and `POST /v1/unpair`), each accepted by the shipping
  verifier over the phone's channel, and one with a body byte changed refused `signature`. `DoorVectorTests` checks
  the Swift signer reproduces both signatures byte for byte.

### 6.4 The other gates

- **`gate:simulator`**: `build/simulator-run.mjs`'s handle gains `biometry(step)` with a closed set of steps (`enrol`,
  `unenrol`, `match`, `nomatch`), each one `xcrun simctl spawn <the udid this call created> notifyutil …` with the
  matching `com.apple.BiometricKit…` name, run as one of the handle's owned children. `assert-simulator-teardown.mjs`
  adds `notifyutil` and `spawn` to the verbs only the helper may name, with a fixture and a helper ablation.
  `SIMULATOR_USER_FLOOR` stays 2 (no new script reaches the helper).
- **`gate:electron`**: `HELPER_USER_FLOOR` +1 for `build/p317/probe-p317.mjs` (§4.3), in the same commit.
- **`gate:background`**, **`gate:checks`**: `probe:p317` classified; every long-lived child in it killed in a
  `finally` that names it.
- **`gate:contract`**: unchanged, byte for byte (`node build/contract-inventory.mjs --check`).
- **`conformance:push`** stays green: the push seam's `PocketHost` has no writes and answers both write routes 404.
- **CLAUDE.md** (the integrator): the pocket row names X1 to X12, the write rows and `src/main/sessions/pocket-writes.ts`;
  the manager row names `src/shared/session-gates.ts`, `src/shared/lifecycle-words.ts`, G2, T24, T25; the handback row
  names the moved type; the ios row names (ab), (ac), (ad) and build 5; the simulator row names `biometry`; a
  `probe:p317` row and `probe:p316`'s `end` arm group, one line each in the house style.

---

## 7. The proof, run rather than read

### 7.1 The battery

`typecheck`, `build` (with `conformance:ios`, `gate:contract`, `gate:simulator`, `gate:electron`, `gate:background`,
`gate:checks`, `gate:knownhosts`), `test`, `smoke:t1`, `smoke`, `smoke:t3`, `CSC_IDENTITY_AUTO_DISCOVERY=false npm run
package`; `conformance:pocket`, `conformance:pocket:hostile`, `ablation:p313`, `conformance:manager`, `ablation:p293`,
`conformance:handback`, `ablation:p296`, `conformance:phonecopy`, `conformance:push`, `ablation:p316`,
`node build/p316/vectors.mjs --check`; `test:ios` in Debug and Release on iOS 26.3 and 18.3 (verifiers, under the lock).
`git diff -- src/main/menu.ts docs/audits/contract-baseline.txt` is empty.

### 7.2 Vitest (the builders')

- `src/shared/__tests__/p317-session-gates.test.ts`: the moved gate's answers equal a frozen table of the parent's
  answers over `SESSION_STATUSES` × local and remote × every `SessionGateEnv` corner; `canEnd` does not depend on env.
- `src/shared/__tests__/p317-lifecycle-words.test.ts`: `endSessionConfirm`'s three bodies byte for byte as the parent's;
  `SESSION_NOT_FOUND` equals the three literals in main.
- `src/main/sessions/__tests__/p317-pocket-writes.test.ts`: `endVerdict` row by row (§5.4's table), the batch arm on a
  remote row whose machine `machineKnown` denies (refused `unreachable` for a batch, offered single) and on one whose
  machine is known but not answering (no narrowing: the row's own status decides); `end` over a fake core: one
  `killSession` on ok, none on every refusal, errors mapped by CODE (`SESSION_NOT_FOUND` → `gone`; `INVALID_INPUT` with
  `endRefusal` now non-null → `removed` with its sentence, null → `failed`), a thrown error whose `.message` is a
  canary string never returned and never logged.
- `src/main/pocket/__tests__/writes.test.ts`: the order, every refusal, the ledger's lifetime on a fake clock, the caps,
  `busy`, `acted` (on the act's answer, on a recorded hit, on the same-id pending `busy`, and absent on an other-id
  `busy`), the echo of a well-formed id in a malformed body, the log line. `bind.test.ts`: an `after` started after the
  post, also when the child has exited, and a `stop()` from inside it that does not wait the 1,000 ms join on its own
  job (measured under 100 ms on a fake child).
- `door-wire.test.ts`, `door-listener.test.ts`: the write request shape, the query refusal, the per-route cap, the cut,
  the revoked socket finishing a write's answer, and a revoked socket answering only a read cut at once.
- `routes.test.ts`, `pairing.test.ts`, `ipc.test.ts`, `server.test.ts`, `bind.test.ts`: the offer on rows, `endConfirm`,
  the new line, `dropPhone` shared by both callers, unpair's order.
- `src/renderer/session-manager/__tests__/p317-batch-words.test.ts`: the Mac's composers produce
  `ios/TortieTests/Fixtures/batch-words.json`, `batchBody(false)` and `batchBody(true)` included.
- `src/main/pocket/__tests__/routes.test.ts`: `pocketWriteRouteIds()` answers exactly `['end', 'unpair']` (it replaces
  the `pocketTableIsReadOnly()` assertion at `:175`), and a `PocketFacts` with no `endOffer` draws `{ state: 'none' }`.

### 7.3 XCTest (the phone's)

`EndTests`, `EndBatchTests` (the confirm's message is `batchBody` then the names then the skipped line; a row skipped at
the confirm is no target; `removed` reads `No longer here`; a runner whose `stopRequested` was set before its first write
sends nothing), `OwnerCheckTests` (every `LAError` code mapped; `kind()` per biometry type; a fresh context per call
through an injected context factory), `WriteClientTests` (body bytes, the write id's shape and uniqueness over 10,000
calls, no retry, `handed` → `.noAnswer`, an echo mismatch → `.noAnswer`, `""` with `refused malformed` → `.answered`),
`WriterTests` (`(PairedReader(…) as any DoorReading).writer != nil`, and a fake reader typed `any DoorReading` with no
writer reads nil), `P317WriteTransportTests` (with (ad)'s two hold modes),
`EndWordsTests` (the fixture), and 316.6's `UnpairTests`, `SettingsTests` and `CopyTests` updated (§5.8.6, §5.8.7),
`InfoPlistTests` (the key and its words), `DoorVectorTests` (the write vectors). Fakes in NEW `EndFakes.swift`.

### 7.4 `probe:p317` — the Mac side, ONE Electron (`build/p317/probe-p317.mjs`)

`node build/harness-socket.mjs --fresh gmux-p317 '… node build/with-scratch-machine.mjs -- node build/p317/probe-p317.mjs'`.
One Electron through `withElectron`, a scratch profile and `HOME`, the stand-in Tailscale behind its preflight and
sampler, the DNS stand-in in the probe's own process, the `agents.json` renames, every child ended by pid in a
`finally`. Two node phones (A and B, `build/p316/node-phone.mjs`, which gains `signedPost`). Sessions: three local
shells, one `claude` whose binary is a `/bin/sh` printing the committed Phase 312 dialog (a `needs_input` row with a
process tree), and one shell on the loopback scratch machine. No vendor process, no token.

| Arm | Holds |
| --- | --- |
| W1 | The door reads `changed`; its lines hold `Answers these and nothing else: blocked, end, pair, session, turns, unpair` and `Lets an allowed phone end a session and unpair itself`; the sheet draws `POCKET_DOOR_HONESTY`; Allow |
| W2 | `/v1/blocked`: every row's `end` is the expected offer for its status and machine; `/v1/session`'s `endConfirm` equals the probe's own composition from the row's facts (§7.6 method 2) |
| W3 | End a local shell from A: 200 `done`; the tmux session gone (read on the scratch socket); the manifest row `exited`; one `the phone's end: done` line in `app.log` |
| W4 | End the `needs_input` stand-in: `done`; its pid and its children gone within Phase 323's bound |
| W5 | End the remote shell: `done`; the far tmux session gone (read on the machine's own socket) |
| W6a | The batch narrowing, the Mac batch's case: the scratch machine's entry removed from the scratch machines file and the app's own `machines:reload` invoked; the probe reads back that no machine row holds that id and that the remote row is still listed with its `machine` set. That row's `end` reads `{ state: 'offered', batch: false }`; a `batch: true` end is refused `unreachable`, with no `killSession` (no write line beyond the refusal's). The single End is offered and NOT pressed (pressing it writes `exited` and kills nothing, which is the Mac's own single End, unchanged). If the row is no longer listed after the reload, the arm is UNREADABLE and says so, never a pass; the vitest carries the predicate either way |
| W6b | A machine that stops answering: the scratch machine's sshd and its per-connection children paused (`SIGSTOP` by the pids the probe recorded, `SIGCONT` in a `finally`) until a check marks it not answering; the row reads `unknown`; its `end` is `{ state: 'unreachable', title: END_UNREACHABLE_TITLE }`; a single and a batch `end` are both refused `unreachable`; nothing is killed |
| W7 | The attack, each on its reason: removed between read and press (`removed`, main's sentence); exited (`ended`); an id nothing holds (`gone`, `Session not found.`); the same bytes again (404); the same write id fresh-signed (the recorded body, one act by the log); A and B on one session at once (`busy`); End from a phone Removed on the Mac (refused before HTTP); the door switched off just after the act (200); a fourth body key (`malformed`); `?x=1` on `/v1/end` (404) |
| W8 | B unpairs: 200 `done` read whole; B's next handshake refused; the Phones list and lines no longer name B; the door `changed`; A refused until Allow, then reads |
| W9 | `app.log` and every file under the profile and `HOME` hold no write id, no body, no signature; one log line per write |
| W10 | `src/main/menu.ts` unchanged; Pair a Phone… still under Settings… (MENU1); the Mac sheet's End confirm for W3's twin session reads the moved words, byte for byte as the parent's (CDP read of the inline panel) |
| WP | With `P317_PARENT_CHECKOUT`, a second Electron after the first, never at once: `POST /v1/end` and `/v1/unpair` refused `route` with nothing forwarded (main logs no write); the session still running; the lines name neither route |

### 7.5 `probe:p316`, arm group `end` — the phone (`P316_ARMS=end`)

Its existing machinery (one Electron, the stand-in, the relay, Simulators made one at a time by `withSimulator`), and
`ios/TortieUITests/P316DriveUITests.swift` gains the steps `end`, `end-cancel`, `end-off`, `select`, `end-these`,
`end-home`, `end-kill`, `end-these-home`, `unpair-mac`, `unpair-mac-down`. The UI test prints `end-auth-up` when it sees
`end-confirming`, and the probe answers with `handle.biometry('match' | 'nomatch')`. A step whose Face ID prompt never
appears is UNREADABLE, never a pass.

| Arm | Simulator | Holds |
| --- | --- | --- |
| E1 | 26.3 | `biometry('enrol')`; a running shell's End bar: its frame between the content and the tab bar's top; the `faceid` glyph; the dialog's title, body and press equal W2's `endConfirm`; the press; **the first use raises iOS's permission alert ("Do you want to allow Tortie to use Face ID?"): the UI test accepts it through Springboard (`XCUIApplication(bundleIdentifier: "com.apple.springboard")`, its alert's allowing button, read by label, waited for up to 5 s) and prints `end-auth-up` only after that alert is gone**, never while it is up; match: one `done` line on the Mac, the tmux session gone, the screen re-reads `Ended` and the bar goes. A permission alert that is up when `match` would be sent makes the arm UNREADABLE, never a pass |
| E2 | 26.3 | `nomatch`, then Cancel on the system prompt: `Not confirmed. Nothing was changed.`; no write line; the session still running |
| E3 | 26.3 | `unenrol`: what `kind()` answered is printed; for `passcodeNotSet` the bar is off with `Set a passcode on this iPhone to end a session from it.`; no prompt |
| E4 | 26.3 | Select three (two running, one ended): the confirm reads `End 2 running sessions?`, then `batchBody(false)`'s sentence, the two names, then `1 selected session stays unchanged: 1 already ended`; match: the two targets read `Ended`, `Ended`, and the ended row is no target and draws no outcome word (it was counted in the skipped line, as on the Mac); `2 of 2 sessions ended`; two `done` lines |
| E5 (Paseo #3464) | 26.3 | match, then the home button at once; 10 s; activate: at most one `done` line; the screen re-reads, and its state equals tmux's; the line says `done` only if a `done` line exists, else the no-answer line (bytes handed, re-read succeeded) or the not-taken line (a 404, or the write withheld before its bytes were handed); no write line, and no request at the relay, in 20 s more. Which of the three happened is printed, and each passes only when honest |
| E6 | 26.3 | match, then terminate at once; relaunch: at most one `done` line, and the session's state on screen equals tmux's; nothing sent after relaunch |
| E7 | 26.3 | a batch of three, home after the first `Ended`. Graded like E5, because the loop starts row two as soon as row one reads Ended and a press made after seeing it usually finds row two in flight: on return row two reads `Ended`, `No answer` or `Not run`, and whichever it reads matches tmux (Ended only if its session is gone, Not run only if no request for it reached the relay); row three reads `Not run` and its session still runs; at most one act per session; nothing is sent after the return. Which row-two case happened is printed |
| E8 | 26.3 | Unpair: Pairing with the not-paired line and no Mac line; `pocket:status` no longer lists the phone and reads `changed`; the relay sees no connection after; a new code pairs again |
| E9 | 26.3 | Unpair with the relay paused: Pairing within 5.5 s with `If your Mac still lists this iPhone, press Remove in Settings then Phone.`; the Mac still lists it |
| E10 | 18.3, the floor | E1 and E8 |
| EH | 26.3, hostile | `build/p316/hostile-door.mjs` gains write arms: a 200 with another write id (`No answer`'s path), a 200 `refused malformed` with an empty echo (the door's `unreadable` sentence drawn), an unknown outcome word, a cut after the request, a late answer past 15 s, a 404, a malformed answer, a cut after the request with the re-read also refused (the read's own consequence drawn, never `endNoAnswer`), an `unreachable` offer on a row: each ends in its drawn line; the hostile door counts exactly one `POST` per press |
| EP | 26.3, with `P316_PARENT_IOS` | the parent's app: no End bar, no Select; its Unpair leaves the Mac's row |

### 7.6 The independent methods (at least two, one an attack) and the parent

1. **Re-derive, with the disagreement asserted as a disagreement.** The verifier writes its own reader (its own lexer,
   importing neither module) for `endRefusal`'s partition and the gate's `canEnd`, run at the parent (reading
   `resume.ts`) and at HEAD (reading `session-gates.ts`): equal on `running`, `idle`, `needs_input`, `discarded`;
   main passing and the gate refusing on `exited`, `restorable`, `unknown`; and the same at both commits. A reader that
   asserted equality would pass by reading nothing.
2. **Re-derive the confirm.** The verifier composes each session's End body from the row's facts by its own reading of
   the three rules, and compares it with W2's `endConfirm`, E1's dialog and the Mac sheet's panel.
3. **The attack**, live: W7, the hostile client's write arms, EH, and the verifier's own (a write with a 33-hex id, a
   session id with a `/`, an unpair signed for the other phone, and hand-made `end` writes added to a batch's run).
   Each refused one is asserted on the REASON it was refused. **The added writes are not a refusal case**: the Mac sees
   only independent signed `end` writes (§5.4: `{ session, write, batch }`, no list), so a hand-made extra write is a
   valid single End, and each one is asserted to have been asked BOTH gates and refused only by them (an `unknown` row
   `unreachable`, an ended row `ended`, a running row ended once). "The list only shrinks" is a property of the phone
   app, proved by (ad) and `EndBatchTests`, and nothing here claims the Mac enforces it.
4. **Real rows**: a per-row matrix over real tmux on two machines (§7.4's five sessions) × single and batch.
5. **The parent**: WP and EP, and the parent's confirm hash against HEAD's (they differ by the route list only).

### 7.7 No regression against today

| Scenario | Today (the parent) | At HEAD | Verdict |
| --- | --- | --- | --- |
| A person who never pairs a phone | — | every Mac surface reads the same; menus unchanged; the sheet's End and batch read the moved gate and words byte for byte | same, measured by W10 and the vitest |
| A paired phone after the update | reads | the door asks Allow once (the route list is hashed) | the cost every route-adding phase pays; stated in CHANGELOG |
| `/v1/blocked`'s size | n rows | each row about 30 bytes larger (`end`) | measured over 200 rows; far under the phone's 2 MiB cap |
| A session screen | no bar | a 50-tall End bar above the tab bar when End is offered | the content still ends above it (E1's frames) |
| Unpair on the phone, the Mac answering | the Mac keeps the row until Remove | the Mac drops it; the door asks Allow, as Remove does | better |
| Unpair, the Mac not answering | Pairing at once | Pairing within 5 s, with the Mac line | **slower by at most 5 s, only then**; E9 measures it; if a side by side reads it worse, the bound drops to the time a refused handshake takes and the CHANGELOG says so |
| Remove on the Mac during the removed phone's read | the socket cut at once (`listener.ts:554-562`), no byte | the socket cut at once, no byte: only a socket answering a WRITE finishes first (§5.3.2) | **same by construction** (the first draft's "the read refused 404" was not measured and would have sent the removed phone to Pairing one read sooner by another path; the revision keeps the parent's cut instead). Measured by the hostile client's read-removal arm at HEAD and in the parent clone, where the arm, which touches only read paths, runs unchanged |
| Remove on the Mac during ANOTHER phone's read | the door stops; the read replaced by 404 (`bind.ts:434`) | the same | same |
| End on the Mac | as today | as today | same |

---

## 8. The CHANGELOG items

Under `## Unreleased`, `### Added`; the follow-up docs commit adds the links.

- `- From the iPhone app you can end a session, or select several and end them together, after Face ID, Touch ID or your passcode, with the same confirmation your Mac shows; Restore and Remove stay on your Mac, an iPhone with no passcode cannot end a session, and your Mac asks you to allow the phone door again once after this update`
- `- Unpairing the iPhone in its Settings now removes it from your Mac too, and your Mac then asks you to allow the phone door again, as Remove does`

And 316.6's item under Added loses its last clause, `; your Mac still lists the iPhone until you press Remove in
Settings then Phone`, which this phase makes false.

---

## 9. His checklist — NEW `build/p317/CHECKLIST.md` (the proof builder's)

For the ONE TestFlight build after 318, in his words, each row saying what to open, press and see, then "Not covered
yet" and a table of where every word it names was found.

1. **The Mac.** Run Tortie from main after 318 has landed. Open Settings then Phone. **You should see** the door asking
   again, with the lines `Answers these and nothing else: blocked, end, pair, session, turns, unpair` (318 adds `choose`
   and `say`) and `Lets an allowed phone end a session and unpair itself`. Press Allow.
2. **The build.** The archive and upload row is the combined checklist's; this build carries 317.
3. **One End.** Start a scratch shell session on the Mac. On the iPhone, open it. **You should see** `End session…` above
   the tab bar with the Face ID mark. Press it: the sheet reads `End '<name>'?` and the sentence your Mac shows. Press
   `End session`. The first time, iOS asks to let Tortie use Face ID. **Look away, then Cancel**: `Not confirmed.
   Nothing was changed.`, and the session still runs on the Mac.
4. Press it again and confirm with Face ID. **You should see** Ended on the phone, and in Manage Sessions on the Mac.
5. **End these.** Start two scratch shells. Sessions, Select, tick both, `End selected sessions…`, `End 2 sessions`,
   Face ID. **You should see** `Ended` twice and `2 of 2 sessions ended`.
6. **Unpair.** Settings, Unpair this iPhone, Unpair. **You should see** Pairing. On the Mac, Settings then Phone no
   longer lists this iPhone and asks you to Allow. Allow, then Pair and scan again.
7. 316.6's row 6 no longer needs Remove on the Mac.

**Not covered yet**: a Touch ID iPhone and an iPad (333.4's devices), an iPhone with no passcode (the Simulator's E3),
Reply (318), a session on another machine from his own phone.

---

## 10. Builders, disjoint files, and who owns what is shared

Four builders in `/private/tmp/wt-p317` at once, on the snapshot `551312f7` (§4.1). No file is in two lists. A
builder that needs another's interface codes against §5's pinned names and the integrator reconciles. Builders run
`npm run -s typecheck` and the vitest files they own (or `xcodebuild build-for-testing` with their own derived data);
they launch no Electron, boot no Simulator, run no probe and no whole `npm test`; they never commit, stage or stash.

| Builder | Owns |
| --- | --- |
| **door** (the Mac door and the verbs) | `src/main/pocket/door/table.ts`, `door/wire.ts`, `door/listener.ts`, `door/limits.ts`; `src/main/pocket/server.ts`, NEW `src/main/pocket/writes.ts`, `bind.ts` (and its G1 log line), `routes.ts`, `facts.ts`, `ipc.ts` (and its G1 log line), `pairing.ts` (and its G1 log line); NEW `src/main/sessions/pocket-writes.ts`; `src/main/capabilities.ts` (the pocket wiring only); `src/shared/ipc/pocket.ts`; `src/renderer/settings/PhoneSection.tsx` (the renamed import only); tests `src/main/pocket/__tests__/{writes (NEW),door-wire,door-listener,routes,pairing,ipc,server,bind,facts}.test.ts`, NEW `src/main/sessions/__tests__/p317-pocket-writes.test.ts`, `src/renderer/settings/__tests__/p316-phone-section.test.tsx`; `build/p313/hostile-client.mts` and its runner `hostile-client.mjs` (the PASS line); `build/p316/node-phone.mjs` (`signedPost`) |
| **gates** (the shared-gate move and the Mac conformance) | NEW `src/shared/session-gates.ts`, NEW `src/shared/lifecycle-words.ts`; `src/renderer/state/resume.ts`, `src/renderer/session-manager/copy.ts`; the re-pointed importers `src/renderer/app/session-actions.tsx`, `src/renderer/app/split/SplitSurface.tsx`, `src/renderer/app/TerminalRegion.tsx`, `src/renderer/app/p293-session-manager-drive.ts`, `src/renderer/session-manager/{actions,batch-end,open,projection,view}.ts`, `src/renderer/session-manager/ManagedGrid.tsx`, `src/renderer/state/sessions-slice.ts`, `src/renderer/state/subscriptions.ts`; the re-pointed tests (§2's ten: `src/renderer/app/__tests__/{p119-bare-recovery.test.ts,p141-handback-surface.test.tsx,resume.test.ts}`, `src/renderer/session-manager/__tests__/{p293-batch-end,p293-integrated-parity,p293-open,p293-view,p303-lifecycle-partition}.test.ts`, `src/renderer/state/__tests__/{p293-session-gates,p141-handback-copy}.test.ts`) and NEW `src/shared/__tests__/p317-session-gates.test.ts`, `p317-lifecycle-words.test.ts`, `src/renderer/session-manager/__tests__/p317-batch-words.test.ts`; `build/p293/conformance-manager.mjs`, `manager-conformance-probe.mts`, `ablation.mjs`; `build/handback-conformance-probe.mts`; `build/p303/rederive.mjs`; `build/conformance-pocket.mjs`, `build/ablation-p313.mjs` |
| **phone** (the Swift app) | `ios/Tortie/Door/DoorClient.swift`, `Door/Contract.swift`; NEW `ios/Tortie/App/OwnerCheck.swift`; `App/TortieApp.swift`; NEW `ios/Tortie/Screens/EndBar.swift`, `Screens/EndBatch.swift`; `Screens/SessionScreen.swift`, `ListScreen.swift`, `SettingsScreen.swift`, `DoorWords.swift`, `Identifiers.swift`, `PairingScreen.swift` (the Mac line under the not-paired line only); `ios/Tortie/Style/Copy.swift`; `ios/Tortie/Info.plist`; `ios/Tortie.xcodeproj/project.pbxproj` (the build number only); tests NEW `ios/TortieTests/{EndTests,EndBatchTests,OwnerCheckTests,WriteClientTests,WriterTests,P317WriteTransportTests,EndWordsTests,EndFakes}.swift`, NEW `ios/TortieTests/Fixtures/batch-words.json`, and `CopyTests.swift`, `UnpairTests.swift`, `SettingsTests.swift`, `InfoPlistTests.swift`, `DoorVectorTests.swift` |
| **proof** (the phone's gates, the probes, the words) | `build/conformance-ios.mjs`, `build/p316/ablation-ios.mjs`, `build/p311/copy-drift.mjs`, `build/p316/test-ios.mjs`, `build/p316/hostile-door.mjs`, `build/p316/probe-p316.mjs`, `build/p316/vectors.mjs`, `ios/TortieTests/Fixtures/vectors.json`, `ios/TortieUITests/P316DriveUITests.swift`; NEW `build/p317/probe-p317.mjs`, NEW `build/p317/CHECKLIST.md`; `build/simulator-run.mjs` (`biometry`), `build/assert-simulator-teardown.mjs`, `build/assert-electron-teardown.mjs` (the floor), `build/background-fixtures.mjs` if a new shape appears; `docs/design/phone/{End,Session,Choice,Unpair,index}.html` and NEW `EndThese.html`; `package.json` (`probe:p317`), `build/verification-checks.mjs`, `CHANGELOG.md` |

**Shared files and their one owner.** `src/shared/ipc/pocket.ts` is **door**'s; `src/shared/session-gates.ts` and
`lifecycle-words.ts` are **gates**'; `Copy.swift` and `project.pbxproj` are **phone**'s; `package.json`,
`build/verification-checks.mjs` and `CHANGELOG.md` are **proof**'s; **`CLAUDE.md` is the integrator's**, written from
every builder's report after reconciling; `docs/audits/contract-baseline.txt` is the integrator's and must not move;
`build/p317/SPEC.md` is this file, and the integrator appends "§As built"; `docs/BACKLOG.md` belongs to the main
session.

**The integrator** checks the base first (§4.1: `HEAD` is `551312f7`, nothing staged, the delta only in assigned
files); then reconciles the pinned names across the four; runs §7.1 whole
except what needs the lock; `xcodebuild build-for-testing` Debug and Release for the Simulator SDK and an unsigned
Release device archive with `--read-app`; scans for control, bidi, zero-width and BOM characters and for duplicated
blocks of ten lines or more; writes CLAUDE.md's rows; appends "§As built — 317" with the base manifest's path.

**Touches 316.6** (the replay's three-way merges, §4.2), **re-checked at this revision** as the intersection of §10's
four lists and the integrator's `CLAUDE.md` with the 59 files `551312f7` changes (`git show --stat 551312f7`), 26
files and no others: `CHANGELOG.md`, `CLAUDE.md`, `build/conformance-ios.mjs`,
`build/p311/copy-drift.mjs`, `build/p316/ablation-ios.mjs`, `build/p316/hostile-door.mjs`, `build/p316/probe-p316.mjs`,
`build/p316/test-ios.mjs`, `build/verification-checks.mjs`, `docs/design/phone/Choice.html`, `End.html`,
`Session.html`, `Unpair.html`, `index.html`, `ios/Tortie.xcodeproj/project.pbxproj`, `ios/Tortie/App/TortieApp.swift`,
`ios/Tortie/Screens/DoorWords.swift`, `Identifiers.swift`, `ListScreen.swift`, `SessionScreen.swift`,
`SettingsScreen.swift`, `ios/Tortie/Style/Copy.swift`, `ios/TortieTests/CopyTests.swift`, `SettingsTests.swift`,
`UnpairTests.swift`, `ios/TortieUITests/P316DriveUITests.swift`. The revision's added files (`subscriptions.ts`,
`p141-handback-copy.test.ts`, `build/p303/rederive.mjs`, `WriterTests.swift`) are not among the 59, so the list does
not move. 316.6 files this phase deliberately leaves alone: `ScreensFixtures.swift` (the `writer` default keeps its
fakes compiling), `TabsTests.swift`, `UnpairKeychainTests.swift` (the local forget is unchanged), `Keys.swift`, every
`Markdown/` file.

---

## 11. What this sends to 318, 316.7, 333.1, 333.3 and 333.4

- **318.** Every amendment in its "Depends on" item 2 is carried here (§1.1 D1 to D5, D19; N1 and G1 in §6.1), with one
  named difference: a body that does not parse answers 200 `refused malformed`, and 318's rows use the same. 318 adds
  `choose` and `say` as rows, caps in `POCKET_WRITE_BODY_CAPS`, members of `PocketWrites`, clauses in `WRITE_CLAUSES`
  and words in `POCKET_DOOR_HONESTY`; its strip docks above the End bar; Face ID stays on End alone (his ruling), so
  318's "Every write asks for Face ID first" default is answered no. Its measured pin `0e8c9f46…` is void; the gate
  re-derives it. Rule letters after (ad).
- **316.7.** `Select` and the batch bar move into `SessionsScreen.swift` by their one attachment line (§5.8.4);
  `/v1/sessions`' rows carry `end` from the same optional `endOffer`; `lifecycleOf` goes into
  `src/shared/session-gates.ts`, which exists, and `sessionActionGates` there reads its three from it; the route pin and
  the build number are whichever lands second's (§4.3); its (aa) stays free. **Its entry's "Order" ("Before 317 and
  318") and S2 item 1 ("317 moves the rest of the gate into the same file") were written before 317 started first on
  his word**; when 317 lands first they read the other way round, and the main session edits them in place when 316.7
  is queued (that entry's own rule). If 316.7 lands first instead, §4.2 item 4 is the replay.
- **333.1, 333.3.** Rule letters after (ad). The sample (333.3) answers `end` with `{ state: 'none' }` on every row.
- **333.4.** Drive the Release app's End on an iPad, a Touch ID device and the newest iOS: the prompt, the glyph, and
  that no word says Face ID where there is none.

---

## 12. What is NOT in this phase

- **No Restore, Remove, Restart, Rename, Resume or Create from the phone.** Research 127 §5's "Writes not in v1" row
  stands whole.
- **No reply, no numbered choice press, no typed text, no Interrupt.** That is 318, and Interrupt is uncosted.
- **No status write of any kind**, no "seen it", and nothing in the door names a status setter (refusal 5).
- **No Face ID anywhere but the End press**: none on reading, Unpair or Settings, and no switch.
- **No third key and no claim to the Mac that Face ID happened.**
- **No narrowing exception to refusal 8**: an unpaired phone withdraws the agreement exactly as Remove does.
- **No queue of writes**, nothing persisted for later, nothing re-sent on return.
- **No web page, ever** (H1).
- **No change to the Mac's menus, to `killSession`, to the sheet's End or batch, or to the manifest.**
- **No release.**

## 13. Open concerns handed to the verifiers

1. **Face ID in the Simulator.** `notifyutil`'s BiometricKit names are believed to enrol and answer on 18.x and are
   unmeasured on 26.3. A runtime that ignores them makes E1, E2, E4 to E7 and E10 UNREADABLE on it, never a pass; E3
   and the unit tests still grade.
2. **Whether the Simulator reports `passcodeNotSet`** with biometry unenrolled. E3 prints what `LAContext` answered and
   grades by that.
3. **Whether a write sent just before the home press reaches the Mac before iOS suspends the app** is unmeasured. E5 and E6 record which happened and grade honesty (at most one act, the truth drawn on return, nothing sent later), never which. Rule (l) is not a thing to loosen for a better number.
4. **The 5 s unpair bound** against Funnel's real ingress with the Mac asleep is unmeasurable here; E9 measures the
   relay paused, and his checklist is the real one.
5. **A remote End longer than the door's 15 s answer bound** is cut and reads "no answer" on the phone; W5 times it on
   loopback.
6. **The replay**: 316.6's last check may move some of §10's 26 "touches 316.6" files after `551312f7`; a conflict is the
   operator's, not a builder's.
7. **W6a's reload.** Whether a remote row stays listed after its machine's entry leaves the machines file and the app
   reloads it is read, not assumed: `remote-sessions.ts:1257` says a record with no machine row reads its recorded
   status, but whether the feed keeps the row across `machines:reload` is unmeasured. If it does not, W6a is UNREADABLE
   and the vitest is the evidence for the predicate.
8. **The Face ID permission alert's button label** on 26.3 and 18.3 is read by the UI test, not assumed; a label it does
   not find makes E1 and E10 UNREADABLE.

---

## 14. §Revision — the adversary's 23 findings, each re-read on this tree

The adversary answered `revise` (`…/scratchpad/p317/attack.txt`). Each finding's cited lines were re-read in
`/private/tmp/wt-p317` at `551312f7`; **all 23 are confirmed and none is refuted.** Three corrections are applied in a
form that goes further than the one proposed, and each says why. The adversary's "held" list (the partition over all
7 statuses and 32 env corners, R4's new pin `e1f86589…`, every other cited line, the order, unpair's phone, replays,
D17's ordering, no status write, `gate:contract` unmoved) is not re-litigated.

| # | Finding | Confirmed by | Applied in |
| --- | --- | --- | --- |
| 1 | The batch narrowing read `machine.answering`, which never fires (an unanswering machine's rows are `unknown`) and misses the Mac batch's case (a machine with no row) | `batch-end.ts:60-84`, `actions.ts:955-963`, `remote-sessions.ts:1116`, `:1162`, `:1257`, `:2327`, `status-truth.ts:192-205`, `store.ts:159` | D14, §2, §5.4 (signature, table, `machineKnown` dep), X5, T25, W6a/W6b, §7.2, ENTRY mechanism 4 |
| 2 | A write not yet sent when the app left could be sent on return | `DoorClient.swift:666-673`, `:683-685`, `:690-695`, `:710-719`; `TortieApp.swift:271-273`, `:446-456` | D6, D15, §5.8.1, §5.8.3, §5.8.4, §5.8.5, (ab), (ad), §7.3, E5, ENTRY. **Further than proposed**: the flag that decides `.notSent` is `handed` (set immediately before `connection.send`), not `written` (set in the send's completion), because a cancel between the two would otherwise read `.notSent` for bytes that may have left; and the runner is made at the destructive press, before the owner check, so a background during the Face ID prompt stops a write that has no exchange yet |
| 3 | `writer` only in a protocol extension is statically dispatched to nil on `any DoorReading` | `DoorWords.swift:34-46`, `TortieApp.swift:111`, `:463` | §5.8.6, §7.3 (`WriterTests`) |
| 4 | The phone's batch confirm left out the Mac sheet's body | `BatchPanel.tsx:166-206`, `copy.ts:702-707` | §2, §5.8.4, §5.8.7, the mock, §7.2, §7.3, E4 |
| 5 | Widening G1 by `message` turns three shipping log calls red | `bind.ts:405`, `ipc.ts:1281`, `pairing.ts:546`; the adversary's script re-run at this revision: three hits in `src/main/pocket`, no more | §6.1 G1 (the three rewrites, door builder, same round) |
| 6 | "Maps by code and exact message" contradicts X6 | `core.ts:2939-2942`, `:3794`; `errors.ts:160` (`isGmuxError`) | §5.4 (by code only; `INVALID_INPUT` re-asks `endRefusal`), X6, §7.2 |
| 7 | Two importers of moved names were missing | `subscriptions.ts:46`, `p141-handback-copy.test.ts:53`; also found: `p293-open.test.ts:152`'s mock | §2, §5.1, §10 (gates) |
| 8 | A required `PocketFacts.endOffer` breaks two literals outside the door builder's files | `push-seam.ts:787-801`, `switch-queue.test.ts:267` | §5.4 (optional), X5, §7.2 |
| 9 | A recorded hit for a write that acted, answered while the door stops, was replaced by 404 | `bind.ts:434`; D4 | D4, §5.3.4 steps 2, 3 and 6, X1, X3, the hostile arms, §7.2 |
| 10 | Three types for `after`; an awaited `after` stalls `stop()` for 1,000 ms on its own job; a skipped post skipped `after` | `bind.ts:372`, `:426-438`, `:484`; `limits.ts:37` | D17, §5.3.4, §5.5, A4, X9, §7.2 |
| 11 | 316.7's entry says it lands first and creates the same file | 316.7's S2 and "Order" (`docs/BACKLOG.md` at `4a363727`); the running log's 2026-10-01 line | §3 row 19, §4.2 item 4, §5.8.4 (one attachable piece), §11, ENTRY "Depends on" |
| 12 | `POCKET_DOOR_HONESTY` claimed Face ID on the Mac's sheet | D13; research 135 §4.9 | D19, §5.3.1, ENTRY mechanism 6. **Of the two corrections offered, the shorter**: the Face ID clause is dropped from the Mac sentence rather than reworded as the app's behaviour, because the Mac's sheet says what the door lets a phone do, and "just enough words" |
| 13 | E7's expectation was not reliable | §5.8.4; `TortieApp.swift:446-456` | E7 (graded like E5) |
| 14 | An empty echo for a malformed body could never be drawn | §5.3.4 step 1 against §5.8.1 | §5.3.4 step 1 (echo a well-formed id), §5.8.1 (accept `""` with `refused malformed`), (ab), §7.2, §7.3 |
| 15 | "A batch list grown by a hand-made request" cannot be refused by the Mac | §5.4 (no list in the body) | §7.6 method 3 |
| 16 | The pending ledger entry is made at the claim, not at research 135's step 8, and §3 did not say so | research 135 §4.11 | §3 row 18, §5.3.4 step 3, X3 |
| 17 | The body-size numbers were wrong | `JSON.stringify` at this revision: 199, 198, 44 | §5.3.3 |
| 18 | `pocketTableIsReadOnly` has a third reader | `routes.test.ts:32`, `:175` | §5.3.1, §6.1, §7.2 |
| 19 | `removed` had no outcome word; a row skipped at the confirm was treated as a target | `batch-end.ts:74-84`, `copy.ts:745-765`, `BatchPanel.tsx` | §5.8.4, E4 |
| 20 | iOS's first-use Face ID alert could make E1 unreadable | §9's own checklist row 3 | E1 (and E10 through it), §13 item 8 |
| 21 | "This is the session as it reads now" was false when the re-read failed | `listener.ts:596-599` (a stop cuts in-flight writes) | §5.7, §5.8.3 |
| 22 | §7.7's "same" for a Remove during a read was not measured; under X10 a removed phone's read got 404 | `listener.ts:554-562`; `DoorClient.swift:364` | §5.3.2, D17, X10, §7.2, the hostile arm, §7.7. **Further than proposed**: instead of measuring and stating a change, the change is removed: only a revoked socket answering a WRITE finishes first, and one answering only reads is cut at once as at the parent, so the row is "same" by construction and the hostile arm measures it at HEAD and at the parent |
| 23 | `build/p303/rederive.mjs` reads the gate out of `resume.ts` | `rederive.mjs:87`, `:165` | §6.2, §10 (gates) |

**The base and the touches list, re-checked.** The base step of the first draft (copy 316.6's files and write a
manifest) is done: `551312f7` is that copy as a commit, and §4.1 now only checks it. §10's "touches 316.6" list was
recomputed as the intersection of this phase's files with the 59 files `551312f7` changes: 26, the same 26.

**Space.** This revision wrote two files and removed nothing, so it reclaimed no space. What the landing will
reclaim is §4.2 item 5's, reported then; at this revision the worktree held 1.2 GB and the scratch folder 1.3 MB.

---

## §As built — 317 (the integrator, 2026-10-01)

Written in `/private/tmp/wt-p317` after the four builders reported. The base is unmoved: `HEAD` is
`551312f7e0614a9f7d1d8c6b46ed579d4f2b9ab9`, nothing is staged, and the delta is 119 paths, 93 modified and 26 new
(`git diff 551312f7 --shortstat`: 9,705 insertions, 1,036 deletions), every one in a §10 list or the integrator's two
(`CLAUDE.md`, this file). The base manifest is `…/scratchpad/p317/base/MANIFEST.sha256` and the commit id
`…/scratchpad/p317/SNAPSHOT_COMMIT`. `src/main/menu.ts` and `docs/audits/contract-baseline.txt` have no diff. The
one stash in the shared repository (`WIP on (no branch): a31999fc`) predates this phase and was left alone.

### Reconciled, seam by seam

- **The door's two rows to the act.** `door/table.ts` (two frozen `POST` rows) → `door/wire.ts` (`GET` exactly for a
  read, `POST` exactly for a write, the target its path, the cap per route) → `door/listener.ts` (a query refused
  `route`, the cap from `POCKET_WRITE_BODY_CAPS`, a late write CUT and counted `writesCut`, a revoked socket finishing
  only a write's answer) → `bind.ts` (`acted` never replaced, `after` started after the post and never awaited) →
  `server.ts` (refusals 1 and 6, then the one write path, refusal 7 not re-asked of a write) → `writes.ts` (§5.3.4's
  seven steps) → `PocketWrites.end` in `src/main/sessions/pocket-writes.ts` → `core.killSession`; and the unpair →
  `PocketHost.dropPhone`, the one store write that removes a phone, which `removePhone` also calls. The Mac's answer
  satisfies every invariant the phone's decoder enforces (a reason exactly when `refused`, a non-empty sentence exactly
  when not `done`, the id echoed or `""` with `refused` `malformed`).
- **The shared move.** All 16 moved declarations compared token for token against the parent with the TypeScript
  scanner (comments and whitespace dropped, an added `export` allowed): 16 equal, none still declared where it came
  from. `resume.ts` re-exports the four End words and two types and none of the gate's names; `copy.ts` re-exports
  `END_UNREACHABLE_TITLE` and keeps its own `SESSION_CHANGED`. The shared gate file imports `./types` alone (the spec
  allowed `@shared/workspace-target` too; nothing in it needs it).
- **The phone.** `EndBody`'s sorted keys are the Mac's `batch,session,write`; the targets are the paths with no query;
  the worst body is under its cap; `PairedReader` answers `writer` through `DoorReading`'s requirement; the single End
  and End these both go through `EndRunner.run`, made at the destructive press and registered with `AppModel`, whose
  `wentAway()` stops and cancels every runner and the unpair's Mac half; `.notSent(.cancelled)` is the withheld write.
- **Deviations from the pinned names, each accepted, each with its reason.** `PocketBlockedRow.end` is OPTIONAL in the
  contract (`end?:`): three hand-built row literals in test files no builder owns (`src/main/push/__tests__/alert.test.ts`,
  `engine.test.ts`, `src/main/alerts/__tests__/alerts.test.ts`) would stop compiling, the reasoning of §14 finding 8;
  `rowOf` always sets it and absent reads `none` on both sides. `PocketHandlerDeps.write` is optional and `server.ts`
  words a write's 404 for the log itself, so `writes.ts` keeps exactly one log call. The phone's `end` and `unpair`
  return a `WriteResult` with every case rather than throwing (§5.8.1 said `async throws`); (ab) reads that shape.
  Identifiers beyond §5.8.8: `batch-line`, `settings-unpairing`, `session-end-glyph-<faceid|touchid|lock>`. The hostile
  client's door answers within 3,000 ms rather than 15 s so its late-answer arm is quick; production timings are
  unchanged. `ablation:p313`'s new arms are named `X1a`… because `X1` and `X2` already name hostile-client arms.

### Re-derived with readers of the integrator's own (`…/scratchpad/p317/integrator/`)

| What | How | Reading |
| --- | --- | --- |
| Both gates asked by id at the press; End acts only on what the door offered; nothing but two reads and the verb touched | `rederive-317.mts`: an oracle built from the PARENT's text by regex (`SESSION_STATUSES`, `live`, `unknown`, `endRefusal`, the three sentences, read at `551312f7`), driving the shipping `createPocketWrites` over 7 statuses × local, remote-known, remote-unknown × listed or not × no record, same, discarded × single and batch (252 cells) with a recording `Proxy` core; plus three stale offers (offered while running, then exited, unknown, restorable before the press) and a row removed under a listed running row; plus a thrown verb whose message is a canary | 0 of 1,889 checks failed; every act was on an `offered` row (and `batch: true` on a batch); the core was touched only through `listSessions`, `manifest.getSession` and `killSession`; no canary reached an answer. **Shown able to fail**: widening the oracle's live set by one status reads 36 failures, dropping its batch narrowing reads 24 |
| No route sets a status | `nostatus.mjs`: the TypeScript parser over the 19 production files of `src/main/pocket/**` and `pocket-writes.ts`, setters DISCOVERED from `src/main` (`applyDetectedStatus`, `noteHookEvent`, `noteUserInput`, `setStatus`) | 0 assignments to `.status`, 0 setter calls, no value import of a setter's owner |
| A write acts at most once; one in flight per phone and per session | the same script, 4,000 requests from three phones over 40 write ids and four sessions, random interleavings, acts of random length, the door stopping and phones removed at random, a fake clock inside the ledger's life | every request answered; 117 (phone, write id) pairs acted, none twice; 0 overlapping acts on a session or a phone; 1,053 `busy`, 664 404 |
| Unpair is the signing phone's | the same script: the honest body hands exactly the verified phone; `{write, phone}`, `{write, phoneId}` and `{write, session}` are `malformed` and act on nothing; and read: `dropPhone(` is called at `ipc.ts:488` (the write path's dep) and `:1839` (`removePhone`) and nowhere else, `unpairSigningPhone(` once with `verifiedPhone`, which `server.ts:183` takes from `verdict.phoneId` | holds |
| The order of research 135 §4.11 | the same script, observed at runtime: the last check asks `shuttingDown`, then `stopping`, then `stillPaired`, and `end` is called in the SAME synchronous turn as `stillPaired` (a microtask flag queued there had not run); a ledger hit and a malformed body ask nothing of the last check; each of the three refusing reads 404 with no act; a stop during the act still answers 200 `acted`; a 33-hex id, a `/` in a session, upper-case hex and a string `batch` are each `malformed`, echoing the id only when it is well formed | holds |
| R4's pins | `printf` of the six sorted lines through `shasum -a 256`, and of the parent's four | `e1f86589effb1488c70aed2d7fa0ad2b55288476226c4b3537e5e6aed7a2124d` and `ad9ce8210eeed186d5c2458c3d3e06176171004e9b4fc75a36da5d793f94d080`, the commit body names both |

### The commands

| Command | Exit | Reading |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 0 import violations over 1,388 files, 0 cycles |
| `tsc -b --force` (every project, the tests' included) | 0 | 19 s |
| `vitest run` (the whole suite) | 0 | 1,036 files passed, 1 skipped; 18,228 tests passed, 7 skipped; 56 s |
| `conformance:pocket` | 0 | 65 rules, 13,610 checks; again after the build with `U5` reading `out/main/pocket-door.js`: 13,617 |
| `conformance:pocket:hostile` | 0 | 119 arms, 4 s |
| `conformance:manager` | 0 | 61 rules, 2,442 checks |
| `conformance:handback` | 0 | pass |
| `conformance:ios` | 0 | 27 rules, 33 app files, 35 test files |
| `conformance:phonecopy` (`copy-drift --self-test`) | 0 | OK |
| `conformance:push` | 0 | 26 rules, 2,336 checks |
| `ablation:p313` | 0 | 217 of 217 red on their own rule in ONE pass, 809 s |
| `ablation:p316` | 0 | 227 of 227, every rule (a) to (z), (ab), (ac), (ad), 283 s |
| `ablation:p293` | 0 | 85 of 85, 121 s |
| `ablation:p296` | 0 | 11 arms, 10 s |
| `gate:simulator` | 0 | 13 of 13 bad fixtures, 11 controls, 28 of 28 helper ablations; 2 users against a floor of 2 |
| `gate:electron` | 0 | 162 users against `HELPER_USER_FLOOR` 162 (161 on main, +1 for `build/p317/probe-p317.mjs`) |
| `gate:background`, `gate:checks`, `gate:knownhosts`, `gate:contract` | 0 | `gate:contract` byte for byte |
| `vectors.mjs --check` | 0 | 7 signed requests, 2 of them writes, 1 tampered write body |
| `hostile-door --self-test`, `test-ios --self-test`, `probe-p316 --grader-self-test`, `probe-p317 --grader-self-test`, `p303/rederive.mjs` and its `--self-test` | 0 | 34 arms; 21 checks; 81 End cases; 13 graders, 59 clauses; pass at HEAD; 5 fixtures |
| `xcodebuild build-for-testing`, Debug, Simulator SDK, ad hoc | 0 | TEST BUILD SUCCEEDED, 22 s, no compiler warning |
| the same, Release, `ENABLE_TESTABILITY=YES` | 0 | TEST BUILD SUCCEEDED, 32 s |
| `xcodebuild archive`, Release, `generic/platform=iOS`, `CODE_SIGNING_ALLOWED=NO` | 0 | ARCHIVE SUCCEEDED, 14 s; build 5, 1.0.0, `NSFaceIDUsageDescription` present, `LocalAuthentication` linked, no NetworkExtension or Tailscale, not signed |
| `test-ios.mjs --read-app` on that archive | 0 | 1 Mach-O file; no NetworkExtension or TailscaleKit, no coverage, no DEBUG seam |
| `npm run -s build` | 0 | 37 s; `out/` 55,848 KB, left for the verifiers' runs |
| control, bidi, zero-width and BOM scan over the 118 delta files | — | 0 findings |

### Duplicated blocks of ten lines or more

A scan of every ten-line window holding a line this phase added, against every source file of its language under
`src/`, `build/` and `ios/`, found seven groups and extracted none, each for its reason. `ablate`/`restore` in
`build/ablation-p313.mjs` and `build/p293/ablation.mjs`: both harnesses have carried their own copies since their
phases (six harnesses hold a `function ablate(rel, from, to)`), and this phase added the same RegExp branch to each;
one shared module would be a file no list assigns. `probe-p316.mjs`'s End self-test runner: the base file already held
three copies of that loop, one per self-test, and folding them would edit 316.6's lines in a file the replay merges.
`probe-p317.mjs`'s preflight and sampler blocks: the copies in `probe-p330`, `probe-p332`, `probe-p3321` and
`probe-p3332` already repeat each other, the house pattern of a self-contained probe. The test session factory shared by
`p293-session-gates.test.ts` and `p317-lifecycle-words.test.ts` is a frozen fixture. A later tidy-up may extract the
ablation helpers; it is not this phase's.

### What the integrator changed

`CLAUDE.md` alone, besides this section: the manager row names the two shared files, `pocket-writes.ts`, `G2`, `T24`,
`T25` and 85 ablations; the handback row names `HandbackState`'s new home; the pocket row names the write rows, `X1` to
`X12`, the widened `R2`, `R4`, `N1`, `G1` and `A4`, and the hostile client's write arms; the simulator row names
`biometry` and the gate's counts; the ios row names (ab), (ac), (ad), the widened (t) and (v), build 5 and 227 arms;
`probe:p316` gains one sentence for its `end` arm group; and a `probe:p317` row is added. No builder's file was edited.

### Open concerns for the verifiers

1. Nothing here launched an Electron, booted a Simulator or ran a probe. `smoke:t1`, `smoke`, `smoke:t3` and
   `package` start or package Electron and are the verifiers'; `probe:p317`, `probe:p316` with `P316_ARMS=end`, and
   `test:ios` on 26.3 and 18.3 in Debug and Release run under the lock.
2. §13's eight stand: Face ID through `notifyutil` on 26.3, `passcodeNotSet` with biometry unenrolled, a write just
   before the home press, the 5 s unpair bound, a remote End past 15 s, the replay, W6a's reload, and the permission
   alert's button label. Add the proof builder's unmeasured assumptions: that the failed-match prompt has a Cancel, that
   each app.log write line carries the session id (E7 counts acts that way; `writes.ts` logs `{ session }` for `end` and
   nothing for `unpair`), and that `machines:rows().path` is the file W6a edits.
3. The phone builder's End row is a `Button` marked `.accessibilityElement(children: .contain)` so its glyph is its own
   element; whether XCUITest still reads `isEnabled` false on a disabled row is unmeasured (E3).
4. The one `send()` withheld check the phone builder could not turn red from outside (its ablation 3) is a second line
   of defence behind the cancellation's own; `P317WriteTransportTests` is the live measure of the first.
5. **A CHANGELOG sentence this phase makes false and does not touch.** 316's first item under Added still says "It
   only reads, so you still answer and end sessions on the Mac"; after this phase the phone ends sessions. §8 named only
   316.6's clause. It is the operator's sentence, so the wording is his; the main session should raise it before the
   replay's commit.
6. The ledger forgets an id after 120 s, so the same write id can act again only beyond that, where the 60 s signature
   clock already refuses it `stale`; the fuzz above stayed inside the ledger's life by construction.

### Space

This round added `…/scratchpad/p317/dd-integrator` (732,348 KB: the two Simulator builds and the device build) and a
device archive (8,388 KB), read both, and deleted them with the package caches: `df -k /private/tmp` read
24,155,384 KB free before the delete and 24,890,816 KB after, 735,432 KB (about 718 MB) freed. What remains of this
role is `…/scratchpad/p317/integrator/` at 1,372 KB (the readers above and their logs, kept for the verifiers) and
`out/` in the worktree at 55,848 KB, which the landing removes with the worktree (§4.2 item 5). The volume read
27,198,064 KB free when this round began and 24,890,816 KB at its end; the difference beyond `out/` is other phases'
Simulators and builds running at the same time, not this round's.

---

## §Fix round — 317 (the fixer, 2026-10-01)

Written in `/private/tmp/wt-p317` after two verify verdicts, both `needs_work`, and run ONCE, as the method says. The
base is unmoved: `HEAD` is `551312f7`, nothing is staged, committed or stashed, and the delta is 116 paths (90
modified, 26 new; `git diff 551312f7 --shortstat` reads 9,189 insertions and 978 deletions). `src/main/menu.ts` and
`docs/audits/contract-baseline.txt` still have no diff. The fixer launched no Electron and booted no Simulator, so
every live reading below is the reverify's to make.

### What was removed, and why: Unpair's Mac half, whole

The rederive verifier measured the one scenario this phase made worse than today: **Unpair on the phone with the
Mac not answering drew Pairing 6,198 ms after the press at HEAD, against about 0.8 s at the parent** (`probe:p316`
E9 against EP, the same Mac, the UI test's own timestamps). The phone awaited `POST /v1/unpair`, bounded at 5 s,
before it forgot itself. The operator's rule, as the orchestrator put it to this round: anything that makes a
scenario worse than today is REMOVED, not repaired. The part that regresses is the phone asking the Mac to forget it,
so it is gone on both sides, and nothing of it is left as a route nobody calls on a door that answers the internet:

- **The Mac.** The `unpair` row of `door/table.ts`, its cap in `POCKET_WRITE_BODY_CAPS`, `DoorWriteRoute`'s member
  and `WRITE_ROUTES` in `door/wire.ts`, `POCKET_WRITE_ROUTE_IDS` and `POCKET_ROUTE_IDS` in `src/shared/ipc/pocket.ts`,
  `POCKET_WRITE_SENTENCES.unpairFailed`, `WRITE_CLAUSES.unpair` in `pairing.ts`, `parseUnpairBody`,
  `unpairSettled` and the `unpairSigningPhone` dep in `writes.ts`, `DoorAnswer.after` and the start of it in
  `bind.ts`, and `PocketHost.dropPhone` in `ipc.ts`, whose `removePhone` is the parent's body again, byte for byte
  (the build had also moved its `postPins()` after the nonce and `addedAt` forgets; that reorder is gone with it).
  `POCKET_DOOR_HONESTY` reads `A phone you allow can end a session. Nothing on it can type into a session or change
  anything else on this Mac.` The confirm lines read `Answers these and nothing else: blocked, end, pair, session,
  turns` and `Lets an allowed phone end a session`.
- **The phone.** `DoorClient.unpair`, `UnpairBody`, `WriteRoute.unpair`, `DoorLimits.unpairTimeout`,
  `DoorWriting.unpairOnMac`, `MacUnpair`, `PocketWriteAnswer.Verb.unpair` (an answer naming it now refuses whole and
  reads no answer), `AppModel`'s two-half `unpair` and `unpairingNow`, `Copy.unpairing`, `unpairHalfDone` and
  `unpairMacMayList`, and the `settings-unpairing` and `pairing-mac-line` identifiers. `Screens/PairingScreen.swift`,
  `Screens/SettingsScreen.swift`, `TortieTests/UnpairTests.swift` and `docs/design/phone/Unpair.html` are the base's
  bytes again; `Copy.unpairNote` is 316.6's sentence with its three `/// Names:` pins, and `AppModel.unpair` is
  316.6's body. Unpair asks no owner check (a new `EndTests` clause holds it, and (ac) still reads it).
- **What it changes for a person.** Unpair on the phone is today's in both scenarios: Pairing at once, and the Mac
  lists the iPhone until Remove. The rederive verifier's second major (the `done` answer lost in 1 of 3 live
  unpairs) has no path left to happen on: no write closes the door from inside its own handler. The revoked socket
  that finishes a WRITE's answer (X10) stays, for an End during a Remove.
- **Superseded in this file** (left as written, read through this section): D16, D17's `after`, D18, D19's `and
  unpair itself`, §1 item 3 and the "two routes" of item 4, §5.3.1's second row, §5.5, §5.7's `unpairFailed` row,
  §5.8.1's `unpair`, §5.8.6's Mac half, §6.1's `X9` (rewritten below), §7.4 W8 (rewritten below), §7.5 E8, E9 and
  E10's E8 half, §7.7's two Unpair rows (now "same"), §8's second item, §9 rows 6 and 7, and R4's pin.
- **R4's pin moved again, on purpose**: the parent's `ad9ce8210eeed186d5c2458c3d3e06176171004e9b4fc75a36da5d793f94d080`
  (four lines) to `d1fefb71a8d09c1f0159c9be181e4cfb6f527cb0f61306624ee34b420be734b6` (five lines, `POST /v1/end`
  added), both re-derived by `printf | shasum -a 256` beside the gate's own `--write-route-pin` reading. The build's
  `e1f86589…` is void. The commit body names the parent's value and this one.
- **For the main session to queue separately**, under its own entry: the phone's Unpair asking the Mac to forget it,
  which may land only when no person ever waits on a Mac that does not answer (the verifier's two repairs: forget
  first with the Mac half running after, or a bound no slower than a refused handshake, measured against EP), and the
  three places the verifier found that can drop the last bytes of an answer when a door closes right after it,
  unmeasured which: `door/listener.ts` `stop()` destroying a socket whose response just closed, and the
  `client.destroy()` on upstream close in `build/p330/tailscale-standin.mjs`'s forwarder and `probe-p316.mjs`'s
  relay. `build/p317/ENTRY.md` still describes the unpair; it is the main session's to amend when it writes the
  backlog entry.

### Each verdict item, and what was done

| Verdict item | Disposition |
| --- | --- |
| Lens 1 major: the write-door attack was not run | Not a fixer's to run: the reverify takes it whole (live attack through the stand-in, the parent side by side, its own ablations). It now meets ONE write, and `conformance:pocket:hostile` `WE13` asserts a signed `POST /v1/unpair` is refused `route`, never forwarded, with the phone still paired, and `WE13b` that the phone still reads |
| Lens 1 nit: the ledger key leaves out the verb | Moot while `end` is the only write. The phone already refuses an answer whose verb is not its route's (`WriteResult.of` compares `answer.verb == verb`; `WriteClientTests` holds it). Phase 318 must fold the verb into `keyOf` when it adds `choose` and `say` |
| Lens 1 nit: duplicate JSON keys and whitespace padding pass the strict parse | Left: both bodies must be signed by the phone's key, and nothing acts twice. Recorded for 318 |
| Lens 2 major: Unpair, the Mac not answering, 6.2 s against 0.8 s | REMOVED, above |
| Lens 2 major: the unpair's `done` answer lost in 1 of 3 | Moot by the removal; the probe infrastructure is left as it is, because no scenario now closes a door right after its own answer |
| Lens 2 major: E3, Face ID's mark on a phone with no face enrolled | `OwnerCheck.kind()` now asks `canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics)` in a guard answering `.passcode` BEFORE it reads `biometryType`, which names the hardware whatever is enrolled; the one evaluation is still `.deviceOwnerAuthentication`, in `confirm`. Rule (ac) now allows the biometrics-only policy only as `canEvaluatePolicy`'s first argument inside `kind()`, and gained the clause that `kind()` asks it in that guard before `biometryType` (two self-test arms each way, `ablation:p316` `ac10` and `ac11`). `OwnerCheckTests` covers not enrolled, not allowed and locked out on Face ID and Touch ID phones, and that `kind()` evaluates nothing. The UI test prints the glyph and the `kind` it drew (`faceID`, `touchID`, `passcode` for the lock on a row that can be pressed, `none` for the lock drawn off) |
| Lens 2 major: `probe:p316` defects (a) to (h) | (a) the hostile group's loop leaves every write arm out, named or not; (b) U1 is 316.6's arm and reads true again by the removal (its grader is the base's); (c) E4 reads the message as ONE text, its whitespace folded, so newlines handed back as spaces read the same (three new self-test cases); (d) E7 is UNREADABLE when all three acted before Home, failing only on a double act or a write after the return; (e) and (f) E8, E9 and E10's unpair half are gone with the unpair (the verifier's correction stands: a Remove reads `never`, not `changed`); (g) `write-cut-reread-refused` ends on Pairing (`ends: 'pairing'`, `at: 'screen-pairing'`), which (t) now accepts and `gradeEh` reads from `screen-pairing`; (h) EP reads `P317_PARENT_IOS` (551312f7's `ios/`) and never `P316_PARENT_IOS`, which PR reads at 28d89295, and `gradeEp` is UNREADABLE unless the parent's Unpair question was read and Pairing drawn |
| Lens 2 minor: `probe:p313` C0 required no write route | C0 now requires the write rows to be exactly one, a signed `POST /v1/end` alive outside any window, read from the table's own literals (`build/probe-p313.mjs`, which no builder's list named) |
| Lens 2 minor: an End row drawn off read enabled | The press is now a plain `Button` holding its words alone, `.disabled` when off; the glyph and the progress sit beside it as elements of their own (`EndBar.swift` `row`). The UI test reads the glyph off the bar. Tapping the glyph itself no longer presses; the words and the rest of the row do |
| Lens 2 minor: the withheld path was never exercised live | E5 and E7 now HOLD their writes at the relay: before Face ID is answered the relay lets 0 (E5) or 1 (E7, row one's) connection through and holds every one after, taken and never dialled onward, so the handshake never completes and the bytes are never handed; three seconds after the UI test says Home was pressed the relay forwards again. `gradeAfterLeaving` then requires the not-taken line, no act and the session alive, and `gradeE7` requires row two `Not run` with no act; either is UNREADABLE when the relay held nothing (`relay.held()`, a new counter) |
| Lens 2 minor: 316's CHANGELOG item said "It only reads" | Changed to "You still answer sessions on the Mac", the smallest true edit, and **his to rewrite**; 316.6's item regains "your Mac still lists the iPhone until you press Remove in Settings then Phone", true again; 317's Unpair item is gone |
| Lens 2 nit: Simulator `p316-70422-1` booted since 13:48 | Not this round's; left alone |

### No regression against today, as this round leaves it (read, not measured: the reverify measures)

| Scenario | Today (the parent) | At HEAD after this round |
| --- | --- | --- |
| Unpair on the phone, the Mac answering | the Mac keeps the row until Remove | the same code, byte for byte: U1 grades it, EP reads the parent |
| Unpair on the phone, the Mac not answering | Pairing at once | the same code: Pairing at once |
| Remove on the Mac | the parent's `removePhone` | the parent's `removePhone`, byte for byte |
| The door's lines and the confirm | four routes | five; the door asks Allow once after the update (the route list is hashed), the cost the CHANGELOG item names |
| Every other row of §7.7 | as the integrator and the rederive verifier read them | unchanged by this round |

### The commands

| Command | Exit | Reading |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 0 import violations over 1,388 files, 0 cycles |
| `tsc -b --force` | 0 | every project, the tests' included |
| `vitest run` (whole) | 1, then 0 | 1,035 files and 18,218 tests passed, 7 skipped; the one failure was `src/main/search/__tests__/ttfr.integration.test.ts` timing at 61 ms against 60 under the load of this round's builds, which this phase does not touch, and it passed alone (3 of 3) |
| `vitest run src/main/pocket …/p317-pocket-writes.test.ts …/p316-phone-section.test.tsx` | 0 | 17 files, 785 tests |
| `conformance:pocket` | 0 | 65 rules, 13,354 checks (after the build, `U5` reading `out/main/pocket-door.js`) |
| `conformance:pocket:hostile` | 0 | 119 arms, `WE13` and `WE13b` the removed unpair |
| `conformance:manager`, `conformance:handback`, `conformance:push` | 0 | 61 rules and 2,442 checks; pass; 26 rules and 2,336 checks |
| `conformance:ios` | 0 | 27 rules over 33 app files and 35 test files |
| `conformance:phonecopy` | 0 | OK |
| `vectors.mjs` then `--check` | 0 | regenerated: 6 signed requests, 1 a write; only the `unpair` request left the file |
| `hostile-door --self-test`, `test-ios --self-test`, `probe-p316 --grader-self-test`, `probe-p317 --grader-self-test`, `p303/rederive.mjs` and `--self-test` | 0 | 34 arms; 21 checks; 83 End cases; 13 graders and 59 clauses; pass; 5 fixtures |
| `ablation:p316` | 0 | 228 of 228, 432 s (`ad11` gone with the unpair, `ac10` and `ac11` new) |
| `ablation:p313` | 1, then 0 | the first pass, 998 s, failed two arms by name, their anchors moved by the removal (`X1c`, `X4a`); re-anchored, `P313_ONLY=X1c,X4a` 2 of 2 red in 23 s; the whole pass again: 214 of 214 red on their own rule in 857 s (217 at the integrator's, less `A4k`, `A4l` and `A4m`, which read the `after` and `dropPhone` the removal took out; `R2c`, `R2e`, `X1c`, `X4a`, `X11c`, `X12a` re-anchored and `X9a` to `X9e` rewritten for the new X9) |
| `ablation:p293`, `ablation:p296` | 0 | 85 of 85 in 135 s; 11 arms in 14 s |
| `npm run -s build` | 0 | 46 s; `gate:electron` 162 users against `HELPER_USER_FLOOR` 162 (unchanged: no script was added); `gate:simulator`, `gate:background`, `gate:checks`, `gate:knownhosts`; `gate:contract` byte for byte; `out/` 55,944 KB |
| `xcodebuild build-for-testing`, Debug and Release (`ENABLE_TESTABILITY=YES`), Simulator SDK, through `simulator-run.mjs`'s `xcodebuildRun`, ad hoc | 0 | TEST BUILD SUCCEEDED, 39 s and 45 s, no compiler warning |
| `xcodebuild archive`, Release, `generic/platform=iOS`, `CODE_SIGNING_ALLOWED=NO` | 0 | ARCHIVE SUCCEEDED, 17 s; build 5, 1.0.0, `NSFaceIDUsageDescription` present; `strings` finds no `/v1/unpair` in the binary |
| `test-ios.mjs --read-app` on that archive | 0 | 1 Mach-O file, no NetworkExtension or TailscaleKit, no coverage, no DEBUG seam |
| control, bidi, zero-width and BOM scan over the 116 delta files | — | 0 findings |
| ten-line duplicate scan over the files this round touched | — | no block this round added; the groups found are the house's own (ablation harnesses, self-contained probes, test fixtures), as the integrator recorded |

### What the fixer could not do, and what the reverify must

- Nothing here launched an Electron or booted a Simulator. Live and owed: `test:ios` on 26.3 and 18.3 in Debug and
  Release (the new `OwnerCheckTests` cases, `WriterTests`, `P317WriteTransportTests`' row 2, now an End through the
  shipping reader as the app holds it); `probe:p316` with `P316_ARMS=end` and `P317_PARENT_IOS` (E3's lock, E4 as
  one text, E5's and E7's held writes, EH's `write-unreachable-offer` reading `enabled: false` and
  `write-cut-reread-refused` on Pairing, EP seen to unpair) and its `order` group for U1 at HEAD; `probe:p313` (C0);
  `probe:p317` (W8 rewritten; NO VERIFIER HAS EVER RUN THIS PROBE); `smoke:t1`, `smoke`, `smoke:t3` and `package`.
- Lens 1's own attack on the write door, which no round has run yet.
- Whether the Simulator answers `passcodeNotSet` or the passcode with biometry unenrolled is still not known; either
  now draws a true glyph, and the UI test prints which.

### Space

This round's `df -k /private/tmp` read 19,689,424 KB free when it began (other phases' work moved it all round).
It added three derived-data directories under `…/scratchpad/p317/` (`dd-fixer` 339,260 KB, `dd-fixer-release`
308,676 KB, `dd-fixer-device` 84,128 KB) and the device archive (8,312 KB), and deleted all four once `--read-app`
had read the archive: `df -k /private/tmp` read 44,112,772 KB free before the delete and 44,848,064 KB after,
735,292 KB (about 718 MB) reclaimed. What remains of this round is `…/scratchpad/p317/fixer/`, its logs and its one
build script (about 1 MB), kept for the reverify, and `out/` in the worktree (55,944 KB), which the landing removes
with the worktree. The volume's own free space rose from 19.7 GB to 44.8 GB over the round because other sessions
removed their own work at the same time; that is not this round's.

---

## §As built, the tests round — 317 (the fixer, 2026-10-02)

His ruling of 2026-10-02, after the reverify (`needs_work`, every one of its 14 no-regression rows no worse than
today, its own hostile phone 31 attacks with 0 failures, `test:ios` green on 26.3.1 and 18.3.1): "Fix the tests, prove
18.3 live, land." TOOLS ONLY: nothing under `src/` or `ios/Tortie/` moved in this round. The base is unmoved (`HEAD`
`551312f7`, nothing staged, committed or stashed). The files this round edited, and no other: `build/p317/probe-p317.mjs`,
`build/p316/probe-p316.mjs`, `ios/TortieUITests/P316DriveUITests.swift`, `build/conformance-ios.mjs`,
`build/p316/ablation-ios.mjs`, `build/p317/ENTRY.md`, `CHANGELOG.md`, and this section.

### Each item, what was done, and how it is proved both ways

1. **`probe:p317` can pass at HEAD.** W1 reads Settings then Phone's `[data-phone-confirm]` block WHILE IT IS DRAWN,
   before Allow, and requires `POCKET_DOOR_HONESTY` and both lines in it (a new clause); the reverify's reading, the
   section read after Allow with no block, is a refused fixture. W6b reads the table with `ps -ww` and finds the
   listener with `isScratchSshd`, which takes `/usr/sbin/sshd -D -f <conf>` and macOS's `sshd: <that line> [listener]
   …`, and refuses a sibling path that begins with ours, the person's own sshd, a cut-short line and a per-connection
   child (six self-test checks). W7 switches the door off during an End TWICE, on its own fresh session each: once main
   has LOGGED the act (polled every 5 ms, by the session id the line carries), which must read 200 `done`, the id
   echoed and one act, never a 404 (D4; a cut there, the stop beating the answer across the forwarder, is said
   UNREADABLE), and at the SEND, graded on the order the tree keeps (`offAtSendCase`): 200 `done` with one act, a cut
   with one act and the session gone, a cut with no act and the session alive, or a 404 with no act; never a 404 after
   an act, a second act, a `done` with no act, or a log tmux contradicts (seven self-test checks, five refused
   fixtures). W9 counts log lines against writes that ACTED the way main logs them (`actedOf`: one line per write that
   reached the act, whatever it answered), a cut write counted by its session on tmux and never by the log it is
   checked against (four self-test checks; the reverify's run, 13 lines for 12 answered acts and the act W7 cut, is the
   honest fixture). `--grader-self-test`: 13 graders, 61 clauses, 112 checks, exit 0.
2. **`probe:p316` E7 in the drawn order.** `drawnOrderOf` reads `/v1/blocked`'s waiting rows then `others` before the
   drive; Home waits on the first drawn row (`end-these-home:<E7[0]>`), the rows are graded in that order, and
   `confirmOrderOf` reads the order the confirmation names (the batch's own, EndBatch.swift's `BatchConfirm`), whole
   words only, so `p317-e1` is never read inside `p317-e10`. If the two differ, or either is unread, E7 is UNREADABLE.
   An unmet E7 premise now fails only on what is wrong whenever Home came: a second act, a write after the return, or a
   row word tmux and the log contradict (the reverify's 00:22 run is a fixture that reads UNREADABLE).
3. **E10 and E2.** The UI test finds iOS's first-use question BY ITS OWN LABEL (it asks to allow Face ID), holds THAT
   alert as a label-matched query, presses its allowing press by label, and waits for that alert to leave; it never
   re-resolves `alerts.firstMatch`. E2's Cancel is pressed by its label, held as that query, and waited on until it
   leaves; what iOS drew after the failed match is printed (`faceid-after-nomatch`), and iOS ending its own prompt is
   noticed (the End line drawn). `gradeE1` reads what follows a match only when the owner check was up and answered
   and the question gone; unmet, only what is wrong whatever iOS did fails (the bar, its mark, the Mac's confirmation,
   and a session that ended when no match was sent). `gradeE2` likewise: a write, a session that stopped running, or an
   End line that is not the not-confirmed one fail whatever happened; no Cancel and no line is UNREADABLE; Cancel
   pressed, or iOS ending its own prompt, with the line, nothing sent and the session running, passes and says which.
   The End self-test: 108 cases (83 before).
4. **A static check for the End press.** `conformance:ios` (ac) gains `ruleEndPressOff`: the ONE element identified
   `ID.sessionEnd` is a `Button` in `Screens/EndBar.swift` whose own modifier chain holds `.disabled(row == .off)` (or
   its three equal spellings), over the function's `EndBarDrawing.Row` parameter, whose cases must be exactly `on` and
   `off`. Eleven scanner fixtures (three spellings and `Button(action:)` pass; the modifier gone, turned round,
   `false`, moved onto the glyph, moved onto the row around the press, a second element with the id, the id on a
   non-Button, and a third Row case each go red). `ablation:p316` gains `ac12` (the reverify's B4, the modifier taken
   out) and `ac13` (`.disabled(row == .on)`), each red on (ac).
5. **`build/p317/ENTRY.md`** is rewritten as built: End and End these behind the owner check; ONE write route
   (`POST /v1/end`, 512 bytes; R4 `ad9ce821…` to `d1fefb71…`); no Unpair Mac half, no second write row, no 5 s bound,
   and the phone's Unpair today's; the Mac half queued as its own entry for the main session, with the conditions the
   rederive verifier set; the menus unchanged; the proof as the probes now read it.
6. **CHANGELOG.md.** Phase 316's item reads "It only reads and ends, so you still answer sessions on the Mac": his
   sentence with "and end" moved after "reads" (four words touched, against the fix round's six removed). It is true:
   the phone reads and ends, and answering stays on the Mac. If he wants it plainer, "It only reads and ends sessions,
   so you still answer them on the Mac" touches seven. 316.6's "your Mac still lists the iPhone until you press Remove
   in Settings then Phone" stays, and is true.

**Superseded in this file** (left as written, read through this section): §7.4 W1's "the sheet draws" (it is the
confirm block, before Allow), W6b's process reading, W7's "the door switched off just after the act (200)" (it is the
two presses above: 200 once the act is logged, and the measured order at the send), W9's "one log line per write"
(per write that acted, a cut one by tmux), and §7.5 E2's "Cancel on the system prompt" (or iOS ending its own) and E7's
row order (the drawn order, newest output first).

### The one live run (lock slot `electron.lock2`, taken 12:50:36, released 13:10:30 by its exit trap)

| Run | Exit | Reading |
| --- | --- | --- |
| `P317_PARENT_CHECKOUT=/private/tmp/wt-p317-parent npm run -s probe:p317` | 0 | 64 s, 13 of 13 PASS, 0 UNREADABLE: WP; W1 (`changed`, the 778-character confirm block holding the sentence and both lines); W2 to W5; W6a; W6b (4 pids paused and resumed, `unknown`, single and batch refused `unreachable`); W7 (once logged: 200 `done`, echoed, one act; at the send: `socket hang up`, one act, the session gone, "cut after the act"); W8; W9 (117 files, 0 hits, 14 lines for 14 writes that acted); W10; RUN |
| `P316_ARMS=end P316_KEEP=1 node build/p316/probe-p316.mjs` | 1 | 1,128 s. PASS B1, D1, D2, D2+, N1, N2, N9, E1, **E2**, E3, E4, E5, E6, **E7**, all nine EH write arms, RUN, Q1, N10, MD3, K2, no Electron left. **UNREADABLE E10** (never a FAIL now). The ONE FAIL is "no p316- Simulator is left": another phase's booted `p316-87335-1`, there before this run began (the count read 1 before and 1 after); every device this run made reads "shut down true, deleted true" |

What the drive printed, read from its kept lines:

- **E2, iOS 26.3.1**: after the failed match SpringBoard drew `Face Not Recognized` with `Try Face ID Again` and
  `Cancel`; Cancel was pressed by its label and left; the line read `Not confirmed. Nothing was changed.`, nothing was
  sent, the session ran. E2's first live pass. (26.3.1 never asks the first-use question: `seen: false` on every End.)
- **E7, iOS 26.3.1**: the confirmation named `p317-e7c p317-e7b p317-e7a`, the door's drawn order; Home after
  `p317-e7c` read Ended; `1 of 3 sessions ended`, the other two `Not run`.
- **E10, iOS 18.3.1, THE REVERIFY'S CAUSE IS DISPROVED.** The question `Do you want to allow “Tortie” to use Face ID?`
  (`Don’t Allow`, `Allow`) was found at 31.05 s and `Allow` tapped at 31.23 s; the SAME question, found again by its
  own label, was still up 5.7 s later; SpringBoard still held a two-button alert; and the next query of the APP failed
  with `Unable to perform work on main run loop, process main thread busy for 30.0s`, which ended the drive at 67.6 s.
  So it was never `firstMatch` re-resolving onto the next prompt: the question stayed, and Tortie's main thread was
  busy. Two causes are open and neither is proved. (a) The press landed during the alert's presentation and was
  dropped: the tap came 0.2 to 0.4 s after the question was first seen. (b) The app blocks its main thread while the
  owner check is pending: `SessionRoute.init` (`ios/Tortie/App/TortieApp.swift`) builds `EndModel` inside
  `State(initialValue:)`, whose argument Swift evaluates on every call of that init, and `EndModel.init` calls
  `DeviceOwnerCheck.kind()`, two synchronous `canEvaluatePolicy` calls on the main actor; whether SwiftUI re-runs that
  init during the press, and whether such a call waits on a pending `evaluatePolicy`, is not measured. (b) would be a
  product defect on the iOS 18.3 floor, and `ios/Tortie/` is out of this round's bounds.
- **After the run, compiled and NOT run live** (the once-each rule): the UI test now waits for the question's press to
  be hittable and 0.5 s more before pressing, presses again while that question stays (at most three, each printed with
  SpringBoard's alerts and the app's state), and reads only SpringBoard's alerts, because asking the app for its alerts
  needs its main thread, and that query ended the floor drive. A run that still sees the question stay after three
  settled presses points at (b); `sample` of the Simulator's Tortie pid, taken by the probe that started it, while the
  question is up would say where its main thread waits.

### The commands (this round, all from `/private/tmp/wt-p317`)

| Command | Exit | Reading |
| --- | --- | --- |
| `node build/p317/probe-p317.mjs --grader-self-test` | 0 | 13 graders, 61 clauses, 112 checks |
| `node build/p316/probe-p316.mjs --grader-self-test` | 0 | 17 dumps; alerts 188 cases; tabs and markdown 97; End 108 |
| `npm run -s typecheck` | 0 | 0 import violations over 1,388 files, 0 cycles |
| `npm run -s conformance:ios` | 0 | 27 rules over 33 app files, 35 test files and 79 files under `ios/`; (ac) names the press's chain `buttonStyle, disabled, accessibilityIdentifier` |
| `npm run -s ablation:p316` | 0 | 230 of 230 arms red on their own rule (228 before, `ac12` and `ac13` new), every rule (a) to (z), (ab), (ac) and (ad), 338 s; `P316_ONLY=ac10,ac12,ac13` 3 of 3 first |
| `npm run -s conformance:pocket` | 0 | 65 rules, 13,354 checks |
| `npm run -s conformance:phonecopy` | 0 | OK |
| `npm run -s gate:simulator` | 0 | 508 scripts, 2 reach the helper against a floor of 2 |
| `npm run -s gate:contract` | 0 | byte for byte |
| `npm run -s build` | 0 | 45 s; `gate:electron` 162 against `HELPER_USER_FLOOR` 162; `gate:background`, `gate:checks`, `gate:knownhosts`, `gate:simulator`, `conformance:ios` and `gate:contract` inside it; `out/` 55,992 KB |
| `xcodebuild build-for-testing`, Debug, Simulator SDK, ad hoc, through `xcodebuildRun`, `-derivedDataPath …/p317t/dd-fixer` | 0 | TEST BUILD SUCCEEDED, 21 s, and again after the refinement, 7 s; no warning |

### What this round could not do, and what the reverify must

- **E10 is not proved live.** Its premise was unmet in the one run, and the grade says so. The reverify runs the floor
  with the refined UI test; if the question still stays after three settled presses, cause (b) is the lead, and the fix
  is the app's (`ios/Tortie/`), which needs his word to reopen.
- The refined UI test (the settled press, the re-press, SpringBoard-only labels) is compiled, not run.
- `CLAUDE.md`'s rows still name the counts before this round (`ablation:p316`'s arms); it is not this round's file.
- The FAIL on "no p316- Simulator is left" belongs to the other slot's device; this round started none of it and left
  it alone.

### Space

`df -k /private/tmp` read 38,299,808 KB free before the lock was taken and 32,013,344 KB when it was released (other phases' runs move it too). This
round's DerivedData (`…/scratchpad/p317t/dd-fixer`, the compile and the probe's builds) and the kept probe world
(`/private/tmp/p316-probe-25063`, its UI test lines and the floor's xcodebuild log copied to `…/p317t/fixer/kept/` first) were
deleted, 796,368 KB freed (33,054,376 KB free before, 33,850,744 after); what remains is `…/scratchpad/p317t/fixer/` (its
scripts and logs) and `out/` in the worktree.
