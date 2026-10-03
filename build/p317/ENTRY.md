## Phase 317 — "317 End, behind Face ID" — End from the phone, behind Face ID, through one gate (operator, 2026-09-30; research 127 §11.1)

**Subject.** `feat(pocket): end a session from the phone, behind Face ID, through one gate`

**First body line.** `Phase 317: End from the phone, behind Face ID, through one gate`

**Semver.** Minor on the Mac: one write route on the phone's door, so the door asks him again once. The iPhone app
1.0.0, its build number one above main's at the replay (5, or 6 if 316.7 lands first). Unreleased under his rule that
nothing from Phase 311 on ships until the phone works end to end; it rides the one TestFlight build after 318.

What a person notices:

- **A session can be ended from the phone.** `End session…` sits in a bar above the tab bar on any session the Mac
  would let him end. The confirmation is the Mac's own, word for word, and only Face ID, Touch ID or the phone's
  passcode sends it.
- **Several can be ended at once.** Sessions, Select, `End selected sessions…`: one confirmation in the Mac sheet's
  words and order (its heading, its body, the names, what stays unchanged), one Face ID, then each is ended in turn
  with the Mac sheet's words for what happened to it.
- **After the update the Mac asks him to allow the phone door once more**, and the sheet says in words that a phone
  can now end a session.
- **Unpair on the phone is exactly today's.** Pairing at once, and the Mac lists the iPhone until he presses Remove.

**Unchanged on purpose:** the Mac's menus, `killSession` and every lifecycle verb, the Mac sheet's End and batch (they
read the moved gate and words byte for byte), every status rule, the manifest, the tmux layer, the IPC contract and its
baseline, the signature and the QR, Funnel, the push, `removePhone`, and the phone's Unpair (`AppModel.unpair` and
`LiveDoor.unpair` byte for byte the parent's). Restore, Remove, Restart, Rename and Resume stay off the phone.

**Tier 3**, on four of the table's questions:

- **It can lose the person's work.** End stops a running agent, and a gate is all that stands between a pocket and that.
- **It is a write on a door that faces the public internet** through Funnel (research 132).
- **It acts with his credential.** Every write is signed by the phone's Secure Enclave key, and only the owner check on
  the phone lets it be signed.
- **It claims to work across machines**: a session here and a session on another machine, so the evidence is a per-row
  matrix over real tmux on two machines.

**The independent methods**, five, one of them an attack, and the parent measurement is mandatory:

1. **Re-derive the End partition with the disagreement asserted as a disagreement**: the verifier's own reader, at the
   parent and at HEAD, holds `endRefusal` and `canEnd` equal on `running`, `idle`, `needs_input` and `discarded`, and
   apart on exactly `exited`, `restorable` and `unknown`. A reader that asserted equality would pass by reading nothing.
2. **Re-derive the confirmation**: the verifier composes each session's End sentence from the row's facts by its own
   reading, against what the door carries, what the phone draws and what the Mac sheet draws.
3. **The attack on the press**, live, each arm asserted on the reason it was refused.
4. **Real rows**: local shells, an agent stand-in with a process tree, a shell on a loopback machine, single and batch.
5. **The parent**: the write route refused with nothing forwarded, and the parent's phone with no End.

**Charter.**

- **His words.** On 2026-09-30 he put "317 End, behind Face ID" into the release beside "316.5 Alerts" and "318 Reply",
  which answers research 127 §11.1 ("Should my phone be able to end a session, or only tell me one is waiting?"), and
  ruled Face ID "Only for End": nothing else asks, and there is no switch. On 2026-10-02, after the reverify: "Fix the
  tests, prove 18.3 live, land."
- **Research 127** §5 (End and End these, screen 3; Restore and Remove stay off the phone; "works on a Mac Pro row too",
  ruling R11) and §11.1.
- **Research 135 §4**, the write door this phase builds once and 318 only adds to, and **Phase 318's "Depends on"**
  item 2, every amendment of which this phase carries.
- **Phase 316.6's "What this sends to 317"**: End sits above the tab bar; no Face ID switch. Its Unpair Mac half was
  built and then REMOVED in this phase's fix round, because it made Unpair slower than today (below).
- **Research 136** §13 and §14 (`NSFaceIDUsageDescription`, a Touch ID and passcode path, no "Face ID" on a phone that
  has none) and **research 137** §5 (Paseo #3464: a write as the app leaves the foreground).
- **CLAUDE.md** refusals 5 and 8 and the status rule: no route sets a status, and End is the person's own press,
  confirmed.
- **`build/p317/SPEC.md`**, written at `4a363727` over 316.6's worktree, revised at `551312f7` after the adversary's
  23 findings (its §14), and read through its three "§As built" sections (the integrator's, the fix round's and the
  tests round's), binds; where it and this entry disagree, the SPEC wins and says why.

**Depends on.** Phase 316.6 lands first; this phase is built on `551312f7`, a local snapshot commit of 316.6's fixed
tree, and its delta (`git diff 551312f7`) is replayed onto main after 316.6 lands (SPEC §4). It does not wait for 316.7
or 318. The expected order is 316.6, 317, 316.7, 318; 316.7's entry still reads "Before 317 and 318" and is edited in
place when it is queued. If 316.7 lands first anyway, SPEC §4.2 item 4 is the replay: the gate moves into 316.7's
`src/shared/session-gates.ts` beside `lifecycleOf`, and Select attaches to `SessionsScreen.swift` by its one line.
Whichever of the two lands second re-derives the route pin and takes the next build number.

### What was measured before this entry was written, so no round re-derives it

All of it at `4a363727`, and at 316.6's snapshot for the phone (SPEC §2 has every line).

**Main's gate refuses one status, by design, and the renderer's is narrower on three.** `endRefusal`
(`src/main/sessions/lifecycle-gate.ts:76-81`) refuses only `discarded`, passes a missing record (a feed-only remote row)
and passes a remote record (ruling R11, `:43-48`). `sessionActionGates`' `canEnd` is `live` (`src/renderer/state/resume.ts:949`,
`:911-912` at the parent), so it refuses `exited`, `restorable` and `unknown`, and `unknown` is the one that matters:
"AN `unknown` ROW GAINS NOTHING THAT ACTS, EVER" (`:899-901`). A phone that asked only main would end a session Tortie
cannot see. So both are asked, by id, at the press.

**The gate can move to `src/shared/` and so can the End words.** `resume.ts`'s one renderer import is `agentShortLabel`,
used only in the copy function `resumeReason`; `src/shared` may import only `src/shared`, no builtin
(`build/assert-import-boundaries.mjs:28`, `:35`). The End sentence `endSessionConfirm` calls only `resumeReadiness`,
which is pure, so it moves too, because the phone must draw main's own sentence and main cannot import the renderer.

**The door had no write route in four layers** (research 135 §4.1): the table was four reads
(`src/main/pocket/door/table.ts`), the wire's signed routes were `GET`, the listener forwarded `GET`, and
`conformance:pocket` R2 required reads with R4 pinning membership at `ad9ce821…`.

**404 meant nothing happened only for reads.** The listener answered 404 when main was late, and `bind.ts` replaced a
composed answer with 404 when the door began stopping or the answer did not validate. Every refusal was 404 with no
body, so no sentence could reach the phone.

**A nonce is not exactly once.** The verifier remembers 512 nonces a phone (`src/main/pocket/pairing.ts`) inside a 60 s
clock window; research 135 measured a replay after 512 reads verify `ok`.

**Removing a phone cuts the socket that asked.** `removePhone` (`src/main/pocket/ipc.ts`) writes the store, posts the
new pins and withdraws the agreement before its first await, and the door process destroys every socket whose key is
no longer pinned at once (`door/listener.ts` `applyPins`). A write answering on such a socket must finish first.

**The Mac batch's narrowing is a machine with no row, not a machine that is not answering.** `batchEligibility`
(`src/renderer/session-manager/batch-end.ts`) skips a remote row whose machine Tortie holds no row for, because such a
row reads its RECORDED status and a single End of it writes `exited` and kills nothing. A machine that stops answering
needs no narrowing: its rows read `unknown` (`src/main/machines/status-truth.ts`), which both gates refuse. Main spells
the predicate `machineRow(id) !== null` (`src/main/machines/store.ts`).

**A write the app leaves can otherwise be sent on return.** The phone's exchange sent from its `.ready` handler, its
timer ran on uptime, and only Task cancellation stopped it. So a handshake iOS suspended mid-way would carry the write
when the app came back.

**The route list is hashed.** `pocketExecutionHash` sorts the route ids into the confirmation, and
`describePocketDoor` prints them. A new route moves the hash, and the door asks him again; the sheet's
`POCKET_READ_ONLY_HONESTY` ("This door only answers questions…") became false.

**The phone had no LocalAuthentication** and its plist only the camera's purpose string; its client key is a Secure
Enclave key with `.privateKeyUsage` only, so Face ID is a check the phone makes before it signs, and the Mac cannot
verify it (research 135 §4.9). **Rule (l) refuses every background task in the app**, and it stands.

**Measured by this phase's own rounds, and why the Mac half of Unpair is not in it.** The build shipped a second write,
`POST /v1/unpair`, which the phone awaited, bounded at 5 s, before it forgot the Mac. The rederive verifier drew
Pairing 6,198 ms after the press with the Mac not answering, against about 0.8 s at the parent (`probe:p316` E9 against
EP). Under his rule that nothing lands worse than today, the fix round removed that half whole, on both sides: the row,
its cap, its route id, its body, its sentence, the 5 s bound, `PocketHost.dropPhone` and `DoorAnswer.after`. The
reverify byte-compared `AppModel.unpair`, `LiveDoor.unpair` and `removePhone` with `551312f7`: equal.

### The mechanism

**1. The gate and the End words move, and nothing about them changes.** NEW `src/shared/session-gates.ts` takes
`sessionActionGates`, its two types, `hasRestoreMaterial`, `offersBareRecovery`, `showsResumeVerb`,
`holdsResumableConversation` and the handback types, every expression moved and not rewritten (16 declarations
compared token for token), every importer re-pointed, nothing re-exported from `resume.ts`, and one new constant,
`DOOR_GATE_ENV`. NEW `src/shared/lifecycle-words.ts` takes `resumeReadiness`, `endSessionConfirm`,
`removeSessionConfirm`, `LifecycleConfirm`, `LIFECYCLE_SESSION_CHANGED` and `END_UNREACHABLE_TITLE`, and adds
`SESSION_NOT_FOUND` (held equal to main's literals by a test) and `END_FAILED`; the renderer's words modules re-export
them. `src/shared/__tests__/p317-session-gates.test.ts` holds the moved answers equal to the parent's over every status,
machine and environment.

**2. One write row on the one closed table.** `POST /v1/end` in `src/main/pocket/door/table.ts`, `reads: false`,
`signed: true`, `windowOnly: false`, no query, its body capped at 512 bytes (`POCKET_WRITE_BODY_CAPS` in
`src/shared/ipc/pocket.ts`, computed from the worst legal body). `POCKET_WRITE_ROUTE_IDS` is `['end']`. R4's pin moves
on purpose, from the parent's `ad9ce8210eeed186d5c2458c3d3e06176171004e9b4fc75a36da5d793f94d080` (four lines) to
`d1fefb71a8d09c1f0159c9be181e4cfb6f527cb0f61306624ee34b420be734b6` (five), and the commit names both. The door process
(`door/wire.ts`, `door/listener.ts`) checks the size and forwards the bytes; it never parses a write body. When main's
answer to a write is late, it cuts the connection (`writesCut`); it never answers 404 after forwarding a write. A
socket whose key is no longer pinned finishes the write answer it is writing and takes nothing more; one answering
only reads is cut at once, as today.

**3. Main's order, as code, in NEW `src/main/pocket/writes.ts`** (research 135 §4.11): `server.ts` refuses a quitting
app, a stopping door and every signature failure (404, no body); then a strict parse (exactly `session`, `write`,
`batch`; `write` is 32 lowercase hex), a ledger keyed on the phone and the write id and kept for twice the 60 s clock
window (512 a phone, 4,096 in all, a live entry never evicted), one write in flight per phone and per session, then the
last check (still paired, this door instance not stopping) with nothing awaited between it and the act (404 if it
fails); then the act, the outcome recorded, and ONE log line, `the phone's end: <outcome>` with the session id as its
one field. Everything from the parse on answers 200 `{ verb, write, outcome, reason, sentence }`, the owner's sentence
word for word, a malformed body included (`refused`, `malformed`). Every answer from the act on is marked `acted`, and
`bind.ts` never replaces an acted answer.

**4. End asks both gates by id at the press.** `PocketWrites` is declared in `src/main/pocket/routes.ts` beside
`PocketFacts`, with one member, `end`, and implemented once in NEW `src/main/sessions/pocket-writes.ts`, so R3's ban on
`killSession` in the door stands whole. It re-reads the row from `core.listSessions()`, asks main's `endRefusal` on the
record and the moved `canEnd` with `DOOR_GATE_ENV`, and calls `killSession(id)` as its first await; a thrown error maps
by its code alone, so no error's message is read. The same verdict puts an `end` offer on every row the door reads
(`offered` with whether a batch may include it, `unreachable` with `END_UNREACHABLE_TITLE`, or `none`), and
`/v1/session` carries the Mac's own `endConfirm`. End works on a session on another machine where the Mac's End does
(R11); a batch skips a remote row on a machine Tortie holds no row for (`machineRow`), the Mac batch's own case, and a
machine that is not answering needs no rule of its own because its rows read `unknown`.

**5. The sheet says it.** `describePocketDoor` (`src/main/pocket/pairing.ts`) adds `Lets an allowed phone end a
session`, derived from the route list through a compiled map, and `POCKET_READ_ONLY_HONESTY` becomes
`POCKET_DOOR_HONESTY`: "A phone you allow can end a session. Nothing on it can type into a session or change anything
else on this Mac.", drawn in Settings then Phone's confirm block (`src/renderer/settings/PhoneSection.tsx`). It does not
mention Face ID: the Mac cannot verify it, so the Mac's own sheet does not claim it.

**6. The phone.** One signed `POST` path in `ios/Tortie/Door/DoorClient.swift` (`signedPost`, called by `end` alone), a
fresh 128-bit write id per press (`WriteId.fresh`), nothing retried, a cut after the bytes were handed read as "no
answer" and followed by a re-read (and when that re-read fails, its own line instead). A write whose bytes were not yet
handed when the app goes to the background is withheld and never sent: `AppModel.wentAway()` stops every registered
runner, and the exchange refuses to send once withheld. NEW `ios/Tortie/App/OwnerCheck.swift` is the one file naming
LocalAuthentication: one `evaluatePolicy(.deviceOwnerAuthentication…)` with a fresh `LAContext` per press, so Face ID
off, Touch ID and the passcode all work; `kind()` asks the biometrics-only policy only as a question, before it reads
`biometryType`, so a phone with no face enrolled shows the lock; no passcode at all draws End off with `Set a passcode
on this iPhone to end a session from it.`; a cancel or a failure sends nothing and draws `Not confirmed. Nothing was
changed.` NEW `ios/Tortie/Screens/EndBar.swift` puts `End session…` beside the device's mark (an image, no words) above
the tab bar, the press a plain `Button` that is `.disabled(row == .off)` so an End drawn off reads off, and draws the
door's confirmation; `EndRunner` holds the targets as a `let`. NEW `ios/Tortie/Screens/EndBatch.swift` adds Select,
`End selected sessions…`, the Mac sheet's confirmation with its body, a list fixed at the confirm in drawn order (a row
skipped there is counted, not ended), one write at a time, the Mac sheet's outcome words (a removed row reads `No
longer here`), and a stop when the app leaves the foreground. Nothing keeps the app running to finish a write and
nothing is queued for later. `ios/Tortie/Info.plist` gains `NSFaceIDUsageDescription`. The mocks redraw End with the
Mac's sentence and drop the invented "The agent stops. Its saved output stays."; the `…` button goes.

**7. The gates widen rather than multiply.** `conformance:pocket` R2 (a closed write list), R4 (re-pinned), N1, G1, A4
(an acted answer is never replaced), and X1 to X12 (the order, the parse, the ledger, one in flight, `PocketWrites`,
the answer, never 404 after the act, the door never parsing a write, a phone removed by Remove alone, the revoked
socket, one log line, the lines); `conformance:pocket:hostile` gains the write arms, `WE13` and `WE13b` holding that a
signed `POST /v1/unpair` is refused `route` and never forwarded; `conformance:manager` reads the moved files and gains
G2, T24 and T25; `conformance:handback` follows the type; `conformance:ios` gains (ab) the write, (ac) the owner check
and the End press that says off when drawn off, and (ad) the list that only shrinks, and widens (t) and (v);
`conformance:phonecopy` owns `Select`; the vectors carry the one write request and a tampered body; `gate:simulator`
lets only the helper drive Face ID; `gate:contract` does not move. Each clause has an ablation arm in
`ablation:p313`, `ablation:p293` or `ablation:p316`.

### The proof, run rather than read

- **The battery**: `typecheck`, `build`, `test`, `smoke:t1`, `smoke`, `smoke:t3`, `package`, the gates above, and
  `test:ios` in Debug and Release on iOS 26.3 and 18.3 (the reverify: 364 and 361 tests on each, 0 failures, and three
  End writes through the shipping `DoorClient` verified and answered by a Node door).
- **`probe:p317`** (`build/p317/probe-p317.mjs`), ONE Electron on a scratch profile, `HOME` and socket
  `gmux-p317-<pid>`, through `build/with-scratch-machine.mjs`, the stand-in Tailscale and the DNS stand-in, two node
  phones: W1 the door asks again, the honesty sentence and both lines read in the sheet's confirm block before Allow;
  W2 every row's offer and confirmation; W3 to W5 End a local shell, an agent stand-in with its tree, and a shell on the
  loopback machine; W6a the batch narrowing on a machine with no row; W6b a machine that stops answering, its sshd
  found with `ps -ww` under either of its names; W7 the attack (removed, ended, an id nothing holds, a replay, a write
  id reused, two phones on one session, a Removed phone, a fourth key, a query) and the door switched off during an End
  twice, once main has logged the act (200 `done`, one act, never replaced) and at the send (graded on the order the
  tree keeps: `unpublish()` stops the Funnel child first, so a cut with the act done once is honest); W8 a signed
  `/v1/unpair` refused 404 with nothing forwarded; W9 no write id or nonce in any file, and one log line per write that
  acted, a cut write read by its session on tmux; W10 the menus and the Mac sheet's words; WP the parent, a second
  Electron after the first.
- **`probe:p316`'s `end` arms** on Simulators made one at a time, Face ID enrolled and answered from the host through
  `build/simulator-run.mjs`: E1 End with a match; E2 a failed match, then Cancel or iOS ending its own prompt; E3 Face
  ID unenrolled; E4 End these; E5 and E6 the home button and a kill straight after a match (Paseo #3464: at most once,
  the truth on return, nothing sent later), E5's write held at the relay before its handshake; E7 a batch interrupted
  by the home button, its rows waited on and graded in the order the phone draws them and checked against the order
  its confirmation names; E10 End on the iOS 18.3 floor (proved live on iOS 18.3.1, 3 of 3 (the tests round's independent check) when this entry was written: in the
  tests round's run iOS's first-use question stayed up after Allow and the app's main thread was busy for 30 s, SPEC
  "§As built, the tests round"); EH the hostile door's nine write arms; EP the parent's app.
  iOS's first-use Face ID question is found by its own label, accepted, and waited on until THAT alert leaves before
  the UI test says the prompt is up. An unmet premise is UNREADABLE, never a FAIL. A batch interrupted by the home
  button is graded like the single End: each row's word matches tmux, and nothing is sent after the return.
- **No photograph.** Every visual claim is a frame or a label.
- **No regression against today**: SPEC §7.7 and the reverify's 14 rows, every one no worse. Unpair is today's code in
  both scenarios; the door's start, switch and quit time the same at both commits.
- **The landing cleans up after itself** (his rule of 2026-10-01): once the follow-up docs commit is pushed, the
  worktree, its parents and clones, its scratch folder with every DerivedData, and its stale socket files go, and the
  landing report says the space freed (SPEC §4.2 item 5).

### CHANGELOG items

Under `## Unreleased`, Added; the follow-up docs commit adds the link.

- `- From the iPhone app you can end a session, or select several and end them together, after Face ID, Touch ID or your passcode, with the same confirmation your Mac shows; Restore and Remove stay on your Mac, an iPhone with no passcode cannot end a session, and your Mac asks you to allow the phone door again once after this update`

Phase 316's item said "It only reads, so you still answer and end sessions on the Mac", which this phase makes false;
it now reads "It only reads and ends, so you still answer sessions on the Mac", his sentence with "and end" moved, and
the wording is his to change. 316.6's item keeps "your Mac still lists the iPhone until you press Remove in Settings
then Phone", which stays true.

### His checklist (NEW `build/p317/CHECKLIST.md`), for the one TestFlight build after 318

1. Run Tortie from main after 318 and open Settings then Phone. **You should see** the door ask again, naming `end`
   and saying `Lets an allowed phone end a session`. Allow.
2. On the iPhone, open a scratch session. **You should see** `End session…` above the tab bar with the Face ID mark.
   Press it, then `End session`; look away and Cancel. **You should see** `Not confirmed. Nothing was changed.`, and the
   session still running on the Mac.
3. Press again and confirm with Face ID. **You should see** Ended on the phone and on the Mac.
4. Sessions, Select, two scratch sessions, `End selected sessions…`, `End 2 sessions`, Face ID. **You should see**
   `2 of 2 sessions ended`.
5. Settings, Unpair this iPhone. **You should see** Pairing at once; the Mac still lists the iPhone until you press
   Remove, as before this phase.

**Not covered yet**: a Touch ID iPhone and an iPad (333.4), an iPhone with no passcode (the Simulator proves it), Reply
(318).

### What this sends to 318, 316.7, 333, and a new entry

**318**: every amendment in its "Depends on" item 2 is carried; a body that does not parse answers 200 `refused
malformed`, and 318's rows do the same; it adds two rows, two caps, two `PocketWrites` members, two clauses to the
sheet's line and its words to `POCKET_DOOR_HONESTY`; it must fold the verb into the ledger's key when it adds them
(`writes.ts` `keyOf` keys on the phone and the write id alone, safe while `end` is the only write); its strip docks
above the End bar; Face ID stays on End alone; its measured pin is void. **316.7**: `Select` and the batch bar move
into `SessionsScreen.swift`, `/v1/sessions`' rows carry `end`, and `lifecycleOf` goes into the existing
`src/shared/session-gates.ts`. **333.1 and 333.3** take rule letters after (ad); 333.3's sample offers no End.
**333.4** drives End on an iPad, a Touch ID device and the newest iOS.

**A new entry for the main session to queue: the phone's Unpair asking the Mac to forget it.** It may land only when no
person ever waits on a Mac that does not answer, measured against today's Pairing-at-once (the rederive verifier's two
repairs: forget first with the Mac half running after, or a bound no slower than a refused handshake), and with the
three places that can drop the last bytes of an answer when a door closes right after it measured first:
`door/listener.ts` `stop()` destroying a socket whose response just closed, and the `client.destroy()` on upstream
close in `build/p330/tailscale-standin.mjs`'s forwarder and `build/p316/probe-p316.mjs`'s relay.

**The menus do not change.** No Mac surface is added, renamed or removed; `src/main/menu.ts` is asserted unchanged.

### What is NOT in this phase

- **No Unpair Mac half.** No `POST /v1/unpair`, no second write row, no phone removed by anything but Remove on the
  Mac, no 5 s bound and nothing the phone waits on before it forgets the Mac. It was built and removed (above).
- **No Restore, Remove, Restart, Rename, Resume or Create from the phone.** Research 127 §5's "Writes not in v1" row
  stands whole: Restore relaunches an agent with its safeguards off, and Remove deletes saved output.
- **No reply, no numbered choice press, no typed text and no Interrupt.** Reply is 318; Interrupt is uncosted.
- **No status write of any kind and no "seen it"** (refusal 5).
- **No Face ID anywhere but the End press**, no switch, no third key, and nothing that tells the Mac Face ID happened.
- **No background task, no queue of writes, nothing re-sent.** Rule (l) stands.
- **No web page, ever** (his ruling of 2026-09-22, H1).
- **No second live-status set and no exhaustive switch added to the moved gate**: its `===` comparisons are Phase 303's
  named gap, moved as they are.
- **No change to `killSession`, `removePhone`, the Mac sheet, the manifest, the menus or the IPC contract.**
- **No release.**
