# Phase 326 SPEC — the first session in a remote tab draws its screen

Written by the spec step on 2026-09-30 in `/private/tmp/wt-p326` at `ca92d282` (origin/main). The entry is
`## Phase 326` in `docs/BACKLOG.md` (line 35418 at this head), written at `e371324b`. His ruling of 2026-09-30,
"Build 326 first, then fix and land 324", is why this phase runs now: once Phase 324 gives tmux 3.6 and 3.6b
machines the live connection, a new session's first open failed 1 of 4 times with "This session no longer exists".

- **Subject.** `fix(machines): the first session in a remote tab draws its screen`
- **First body line.** `Phase 326: an attach to a session on another machine waits for its create and never asks this Mac`
- **Semver.** Patch. No release: phases 311 onward stay unreleased until the phone works end to end.
- **Lane.** Build: Spec -> Build (3 builders, disjoint files) -> Integrate -> Verify -> [Fix -> Reverify] -> Commit.
- **Tier 3.** It changes session lifecycle (create and attach), the defect makes a person's new session unreachable,
  it changes when Phase 117's rescue may bind a session on another machine, and it spawns the attach client after a
  wait that did not exist before. **Independent methods, named now:** (1) measure the parent commit, every arm, on
  both far tmux versions, one build after the other; (2) attack, with a hostile far tmux wrapper (window widened, held
  past the bound, a stranger under the create's own name, a switch away and a quit during the wait, two creates back
  to back); (3) re-derive, where the verifier builds its own table from the far side's own command log, never from
  Tortie's log, predicts which parent creates refuse, and counts attach clients with its own far `list-clients`.
  Plus a fix round if any verdict is needs_work, and an independent live reverify of that fix, once.

---

## 1. What moved since the entry was written (`e371324b` -> `ca92d282`)

31 commits landed. Only four touch a file this phase reads, and none touches the attach path:

| Commit | Phase | What it moved that this spec reads |
| --- | --- | --- |
| `2751062d` | 331 | `src/main/machines/remote-record.ts`: +4 lines at the import block and +4 in `writeRemoteHarvest`. `build/assert-electron-teardown.mjs` floor 154 -> 155. `package.json`, `build/verification-checks.mjs`. |
| `a8e06fe7` | 330 | `build/assert-electron-teardown.mjs`, `build/verification-checks.mjs`, `package.json`. |
| `9d1a3001`, `eaef6ee4` | 316.4, 316.3 | `build/verification-checks.mjs`, `package.json`. |

Every other cited file is byte-identical to `e371324b`: `src/main/machines/remote-sessions.ts` (unchanged since
`b34122fa`), `src/main/sessions/core.ts`, `src/main/machines/pane-env-rescue.ts`, `control-plane.ts`,
`exec-plane.ts`, `src/main/attach/attach-host.ts`, `src/renderer/terminal/TerminalPane.tsx`,
`src/renderer/state/sessions-slice.ts`, `src/main/sessions/create-local.ts`, `mutation-ledger.ts`,
`src/renderer/terminal/p95-scroll-drive.ts`, `build/with-scratch-machine.mjs`, `build/scratch-machine.mjs`.

Every file:line the entry cites was re-read at `ca92d282`. They hold, except:

| Entry says | At `ca92d282` |
| --- | --- |
| `remote-record.ts:214` `remoteRecordOf`, `:235` `isRemoteRecord`, `:364` status `running` | `:218`, `:239`, `:368` (Phase 331's +4) |
| `HELPER_USER_FLOOR` 153 at `build/assert-electron-teardown.mjs:326` | **155** at `:342` |
| `probe:p320` at `package.json:97` | `:98` |
| sink report at `control-plane.ts:613-614` | `client.on('sessions-changed', …)` at `:614-616` |
| 320.1's approval at `docs/BACKLOG.md:35444`, "has not started" | Recorded in the Phase 320 heading at `:33792`; 320.1 **is being rebuilt now** in `/private/tmp/wt-p3201` (§5) |
| four feed-only call sites in `core.ts` | Five today: the four named **plus `attachSessionAdmitted` itself** (`remoteSessionRow` at `:3111`). After this phase, four. |

Pinned lines this spec builds on (all at `ca92d282`):
`remote-sessions.ts` — `REMOTE_POLL_TIMEOUT_MS` `:424`; `remoteSessionRow` `:1068-1076`; `projectRemoteRecord`
`:1190-1215`; `remoteRecordStatus` `:1240-1261` (issued arm `:1254`); `remoteCreate` `:1499` (list `:1524`,
`noteIssuedRemoteId` `:1607`, `writeRemoteRow` `:1643`, new-session `execOn` `:1671`, answer `:1683`, confirmation
bind `:1736`, `$` check `:1742-1749`, stamp loop `:1762-1775`, clear `:1777`, `startMachineFeed` `:1781`, row read
`:1782`); `pollRemoteMachine` `:2415`; `onePass` `:2434` (snapshot `:2458`, list `:2461-2463`, parse `:2502-2536`,
unstamped block `:2510-2518`, Phase 187 guard `:2553-2562`, `rescuePending` `:2595`, drop `:2602`, `state.rows = seen`
`:2614`, `state.snapshotAt` `:2617`, `writeBackCompletedPass(` call `:2619-2633`, count log `:2637-2641`, announce
`:2643`, rescue `:2644`); `writeBackCompletedPass` `:2687` (Phase 117 skip `:2730`); `seedUnconfirmedCreates`
`:2743`; `dropProvenAbsentCreates` `:2777`; `rescueUnclaimed` `:2806`; sink `sessionsChanged` `:2960-2962`;
`startMachineFeed` `:3003`. `core.ts` — `shuttingDown` getter `:858`; remote subscription `:1123-1137`;
`scheduleSessionsBroadcast` `:1204-1211`; `handleUnexpectedAttachExit` `:1524` (feed test `:1533`);
`restoreSessionAdmitted` `:1620` (record test `:1633-1636`); `renameSessionAdmitted` `:2781` (`:2790`);
`killSessionAdmitted` `:2848` (`:2884`); `removeSession` `:3004` (`:3027-3029`); `attachSession` `:3095`;
`attachSessionAdmitted` `:3101-3160`; `detachSession` `:3166`; `beginShutdown` `:3428`; `resumeSessionInPlace`
`:3458` (`:3459`). `pane-env-rescue.ts` — memo `:218-228`, `rescueRemoteRow` `:291-340`, memo add `:325`.
`TerminalPane.tsx` — `paneRefusesInput` `:102`, SESSION_NOT_FOUND overlay with no action `:144-148`,
TMUX_UNREACHABLE with Try again `:149-155`, retry `:218-221`, `restorable` `:223`, attach `:586`, effect deps `:635`.
`sessions-slice.ts` — `setActiveSession` `:1025-1034` (sets the ACTIVE project's selection only), create's select
`:1291`, `activeSession()` fallback to the last session `:1856-1866`. `attach-host.ts` — `attach` kills the old
client `:221`, sender-destroyed detach `:319`, `detach` no-op without a client `:420-423`. `mutation-ledger.ts:25`
`MUTATION_JOIN_DEADLINE_MS` = 10,000. `exec-plane.ts:584` `execOn`, default timeout `:618`.
`docs/research/51-remote-machines.md:193` (the `@gmux-id` stamp "remains a second command") and `:322` (snapshotAt
before the exec). Phase 117 heading `docs/BACKLOG.md:6753`.

---

## 2. What the entry got wrong, or left open, and what this spec does instead

1. **Mechanism item 2, as written, regresses the durable row.** Taking the in-flight row out of `unclaimed` turns
   `rescuePending` false in a pass that is rescue-pending at the parent. `writeBackCompletedPass` then reaches
   `noteRemoteRowSeen(record.id, pass.absentStatus, …)` for the create's own row, because the Phase 117 skip at
   `:2730` only applies while a rescue is pending, and writes `restorable` into the status column of a create that is
   still running. The spec adds a flight-owned skip to the write-back and to `dropProvenAbsentCreates` (D3).
2. **The residual the entry "stated rather than closed" is closed** (D2). A pass whose list answers before the
   create's own `new-session` answer is parsed cannot know the `$-id`; it now DEFERS every never-probed unstamped row
   on that machine for that pass (not counted, not handed to the rescue, counted as rescue-pending), and a list issued
   before a create ENDED does not speak for that create's session (Phase 187's list-age rule, applied to a create).
   The rescue in `pane-env-rescue.ts` is then left byte-identical, which is what the entry's "No change to Phase 117's
   rescue" asked for.
3. **Step 0 cannot run "before any builder starts".** `probe:p326` does not exist until builder C writes it, and the
   spec writer, the builders and the integrator launch no Electron. Step 0 becomes the **verifier's first act**, at
   the parent, before any HEAD run, with the entry's stop rule unchanged (§9.1). The builders build on the mechanism
   as read, which is consistent with all 16 of 16 refusals in Phase 320's logs.
4. **`REMOTE_ATTACH_BIND_WAIT_MS` cannot be set from Step 0** for the same reason. It is chosen now, 7,000 ms, with
   its reasons (D5), and Step 0 checks it.
5. **Arm E(a)'s grading is wrong about `show-environment`.** The Phase 71/117 rescue reads every never-probed unstamped
   session's pane environment once per server life (read only, memoised), a stranger included. The correct grading
   is: no `set-option`, `attach-session` or `kill-session` naming the stranger's `$-id`, and at most one
   `show-environment -t <that $-id>`.
6. **Arm E(e) (a lost create answer) is not a probe arm.** The only real way to lose the answer is `smoke:p117`'s fault,
   which ends the loopback sign-in server and so every later arm in that launch. It is proved by `smoke:p117` (the
   Phase 117 promise) and by unit tests of the attach over a lost answer. The entry's expectation was also too narrow:
   at HEAD such an attach may DRAW, because its own list lets the rescue bind the session, or answer the retryable
   sentence; never SESSION_NOT_FOUND and never the local branch.
7. **"His `-L gmux` sessions are counted before and after"** would make the probe name `-L gmux`, which this run's
   hard rules forbid. `withElectron`'s own Phase 261 census (`liveSessionNames`, `censusFinding`,
   `build/electron-run.mjs:539`, `:568`) is the count; the probe reads its verdict and names no real socket.
8. **Arm F's "passes that counted an in-flight create's own `$-id` after its answer arrived"** is not observable from
   outside the app. The probe grades what is observable (the "did not create" count never rising above the arm's
   baseline; the rescue's "could not account for" sentence 0 times) and the unit test proves the rule itself.
9. **Arm D's delay** drops from 3,000 to 2,500 ms so a relaunch (sign-in plus the held first list) sits well inside
   the 7,000 ms bound; the arm stays valid only when the attach is asked before the first list lands (checked).
10. **The 3.6 and 3.6b builds are not needed here** (D10).
11. **"Select another session" in E(b) cannot leave a session that is alone in its tab**: `setActiveSession` sets the
    active project's selection only (`sessions-slice.ts:1025-1034`). The switch is `openLocal(<an open local
    folder>)`, which focuses that tab ("Idempotent open: adding an already-open project focuses its tab",
    `src/renderer/state/projects-slice.ts`), so the waiting pane unmounts and its detach arrives.
12. **The count pinned at 4** is pinned by METHOD NAME, not by line, so a rebase cannot turn it red by moving lines.

---

## 3. Decisions (the seams), each with its reason

**D1 — An attach to a session whose record names another machine never reaches the local branch.** In
`attachSessionAdmitted`, after the existing `remoteSessionRow` branch and before `this.mustGetSession`, a record that
`isRemoteRecord` answers true for goes to a new `attachFarUnbound`. It waits (D4) and then either attaches through the
existing remote branch, now extracted once as `attachListedRemote`, or refuses with the remote side's own words. It
never calls `tmux.listSessions()`, which lists THIS Mac's server. Why: 16 of 16 refusals in Phase 320's logs carry the
local sentence "This session is no longer running." (`core.ts:3147-3149`), which exists only in the local branch; the
two helpers are the ones Remove already uses (`core.ts:3027-3028`). A local record takes the local branch exactly as
today.

**D2 — A session this Mac just created is never counted as "not created by Tortie" by any pass.** A new leaf,
`src/main/machines/create-inflight.ts`, holds one FLIGHT per remote create running in this process: registered on the
line before `noteIssuedRemoteId` (so before the durable row exists and before `new-session` is sent), given the
`$-id` and the connection generation the moment the machine answers, and ended in a `finally` that covers every exit.
An ended flight is remembered for `FLIGHT_MEMORY_MS` = 20,000 ms with its end instant. `onePass`, after its list has
answered and before it parses (so it sees answers that arrived while the list was out), asks for the flights on its
machine that were live at any instant since the list was issued (`endedAt === null || endedAt >= snapshotAt`):
- an unstamped row whose `$-id` is a flight's answered `$-id` in the current generation is **being bound**: skipped
  entirely (not counted, not rescued, never added to `seen`), decided by `$-id` alone and never by name;
- while any such flight has no answer yet (sent and unanswered, or its answer lost), an unstamped row that
  `rescueNeeded` would hand to the rescue (never probed in this server's life) is **deferred**: not counted, not handed
  to the rescue, and the pass counts as rescue-pending;
- every other unstamped row, including a memoised stranger and a stranger that carries the create's own NAME, is
  handled exactly as today.

Why this closes it: a list that holds the new session was answered after `new-session` executed, which is after the
flight was registered; so at parse time the flight is either answered (skip by `$-id`) or not (defer), or it ended
after the list was issued (the remembered flight still counts). A list issued after the flight ended sees the session
stamped, or, if the `@gmux-id` stamp failed, sees an issued id that the rescue binds exactly as Phase 117 does. Why
20,000 ms: it is `REMOVAL_MEMORY_MS`'s bound (`remote-sessions.ts:439`) for the same reason: a list is spawned right
after its `snapshotAt` and is killed at `REMOTE_POLL_TIMEOUT_MS`, so after two timeouts no list issued before the end
can still be outstanding. Why deferral is safe: it is bounded by the create's own exec timeouts; a genuinely foreign
never-probed session is counted and probed one pass later; a memoised session (Tortie's own `gmux-control` after its
first probe) is never deferred, so the count does not flap.

**D3 — No pass writes over, or forgets, a create that is running.** `writeBackCompletedPass` skips a manifest row the
pass's flights own before it writes `pass.absentStatus`; `dropProvenAbsentCreates` skips a flight-owned id before
`clearIssuedRemoteId`; `remoteRecordStatus` answers `unknown` for a LIVE flight beside the issued-id arm (`:1254`).
Why: item 1 of §2; and at the parent, between the id leaving the issued set (`:1777`) and the create's own list
(`:1781`), a broadcast projected the running session as `restorable` (the absent arm `:1256-1259`), which offered
Restore for a session being created and, at HEAD, would unmount a waiting pane for no reason. These three are strict
narrowings: each only declines to act on a create that is still running or whose list is older than its end.

**D4 — How the far attach waits.** `awaitFarBinding` in a new `src/main/sessions/far-attach.ts` (pure plus injected
dependencies, the Phase 323 `session-tree` shape), one loop bounded by `REMOTE_ATTACH_BIND_WAIT_MS` from the moment
the attach was asked, liveness checked at the top of every turn and after every await:
1. a feed row -> `row` (attach through `attachListedRemote`, unchanged);
2. a live flight for the id -> await its settle within what is left of the budget, then loop;
3. no record any more (the create took its row back, Phase 72) -> `absent`;
4. the attach's OWN list has been issued -> if a list issued at or after it completed (`remoteListCompletedSince`) and
   the record now projects `restorable` or `exited` -> `absent`; otherwise -> `unanswered`;
5. budget spent -> `unanswered`;
6. the machine's context is ready -> issue ONE `pollRemoteMachine(machineId)` (the remote twin of the local branch's
   direct read at `core.ts:3142`), raced against what is left and the shutdown signal, then loop;
7. otherwise (a relaunch whose sign-in has not finished) -> wait for the next remote announce, at most 500 ms at a
   time, then loop.
Before the loop, a machine this run does not know (`machineRow` null) -> `machine-unknown`. `absent` answers
SESSION_NOT_FOUND with the remote branch's own sentence, "This session is not running right now." `unanswered`
answers TMUX_UNREACHABLE with the one new sentence (D6), which the pane already draws with Try again
(`TerminalPane.tsx:149-155`). `machine-unknown` answers INVALID_INPUT with the existing `MACHINE_NOT_READY`.
Why a list of its own rather than trusting the create's: the create's own list can be overwritten by an older one
(`:2614`, not this phase's), and absence may only be concluded from a list issued after the attach asked.

**D5 — `REMOTE_ATTACH_BIND_WAIT_MS` = 7,000, chosen, not measured.** It is never more than
`MUTATION_JOIN_DEADLINE_MS` (10,000, the entry's rule). It leaves arm C room between it and the stamp exec's own
10,000 ms (C holds the stamp 8,500 ms: 1,500 ms each side). It covers a create's remaining work over a slow link by an
order of magnitude (the answer, four stamps and one list, about six round trips; 320.1's reverify read 6 to 97 ms per
round trip to his Mac Pro over Tailscale). It covers arm D (sign-in plus a first list held 2,500 ms). Step 0's
slowest measured settle must be at most one third of it (2,333 ms); a larger reading is a finding. Shutdown ends the
wait at once, so the bound never lengthens a quit.

**D6 — One new sentence**, `ATTACH_NOT_HEARD` in `src/main/machines/remote-copy.ts` beside `TARGET_UNBOUND` (`:203`)
and `CREATE_ANSWER_LOST` (`:818`), pinned as `machine.attach-not-heard` in `build/assert-bundle-refusals.mjs`. Exact
text: **"That machine has not told Tortie about this session yet. It may still be starting there."** No tmux words.
The pane shows it under "Can't connect to this session" with Try again. The detail (logs only) is
`<machineId> <tmuxName>: <why>`.

**D7 — A waited attach spawns nothing for a pane that has gone.** A per-session ticket (`AttachTickets` in
`far-attach.ts`) is taken as the FIRST statement of `attachSessionAdmitted`, before any await, for every attach.
`detachSession`, and every newer attach for the same id, move it; `beginShutdown` aborts one signal every wait
listens to. After the last await and with no await between the check and the spawn, `attachFarUnbound` requires: the
ticket still held, `sender.isDestroyed()` false, not shutting down, not disposed. Otherwise it resolves quietly and
spawns nothing. The immediate remote branch and the local branch read no ticket (the local branch's own
milliseconds-wide gap at `:3142` is unchanged and stated). The ticket holder and the deps are LAZY getters over
`…Slot` fields, exactly the `ledgerSlot` shape (`core.ts:830-849`), because several seam tests run real methods off
`GmuxCore.prototype` on `Object.create` objects where no field initializer runs; a plain field would throw in
`beginShutdown` there.

**D8 — The remote branch exists once.** Today's statements at `core.ts:3112-3126` move, unchanged in order and in
text, into `private attachListedRemote(sessionId, remote, sender): void`; the immediate branch calls it and returns,
and `attachFarUnbound` calls it after its liveness check. No second copy of the attach composition.

**D9 — The renderer is unchanged.** The pane already mounts for `unknown`, already refuses input while `unknown`
(`TerminalPane.tsx:102`), and its attach promise now resolves later. The overlay table, the missing Try again on
SESSION_NOT_FOUND, the effect dependencies and `activeSession()`'s fallback are not touched. After this phase
SESSION_NOT_FOUND is said about a far session only when a fresh list proved it absent or its create took its row back.

**D10 — The 3.6 and 3.6b far builds are not used by this phase.** They are not pinned in this tree's
`build/tmux-probe-versions.json` (only `3.7c`; Phase 324 adds them), and at this head a 3.6-family machine is refused by
the version gate and, once accepted, runs on the timer feed with no live connection, which is a different feed from
the one that provokes the race. The fix is version-independent (no argv, parse or stamp change). Arms B and C force the
window open on any version. `probe:p326` accepts any `P326_FAR_TMUX` and labels the run with its version, so **Phase
324's reverify, after it rebases onto this phase, runs `probe:p326` arms A and B over its own 3.6 and 3.6b** — that is
where its "1 of 4" reading is answered.

**D11 — `pane-env-rescue.ts` is byte-identical at HEAD**, and so are `seedUnconfirmedCreates`, the foreign memo, the
create argv, its four stamps, the durable-row-first order, the renderer, the local create and the local attach.

**D12 — Remote restore is out of scope, stated.** `restoreRemoteSession` also stamps after `new-session`, but its pane
does not mount until the status leaves `restorable`, which happens only after its own list (`remote-restore.ts` step
8), so no attach can precede its stamps. A pass inside its window may memoise its `$-id` as foreign, which is harmless
once the stamp lands. Read from the code, not measured.

---

## 4. The mechanism, per file

### 4.1 `src/main/machines/create-inflight.ts` (NEW, builder A) — a leaf with no runtime imports

```ts
/** How long an ended flight still speaks for its session to a list issued before the end. */
export const FLIGHT_MEMORY_MS = 20_000;
export interface RemoteCreateFlight {
  /** The `$-id` the machine answered and the connection generation it was answered in. Once. */
  answered(tmuxId: string, generation: number): void;
  /** Idempotent. Settles every waiter. */
  end(): void;
}
export function beginRemoteCreate(sessionId: string, machineId: string, now?: number): RemoteCreateFlight;
/** True while a create for this id is running in this process (not merely remembered). */
export function remoteCreateInFlight(sessionId: string): boolean;
export interface RemoteCreateFlights {
  /** Answered `$-id`s, current generation, of flights live at any instant since `issuedAt`. */
  readonly beingBound: ReadonlySet<string>;
  /** True when one of those flights has no answered `$-id`. */
  readonly awaitingAnswer: boolean;
  /** True for the session id of any of those flights. */
  owns(sessionId: string): boolean;
}
export function remoteCreateFlightsFor(machineId: string, issuedAt: number, generation: number, now?: number): RemoteCreateFlights;
export type CreateSettle = 'settled' | 'none' | 'timeout' | 'aborted';
export function awaitRemoteCreateSettled(sessionId: string, deadlineMs: number, signal?: AbortSignal): Promise<CreateSettle>;
export function resetRemoteCreateFlightsForTests(): void;
```
Rules: a second `beginRemoteCreate` for a live id ends the first (its waiters settle) and replaces it; `end()` and
`answered()` after `end()` are no-ops; ended flights older than `FLIGHT_MEMORY_MS` are pruned on every `begin` and
every `remoteCreateFlightsFor`; `awaitRemoteCreateSettled` answers `none` at once for no live flight, clears its timer
and its abort listener on every outcome, and `unref`s its timer. It imports nothing at runtime (type imports only), so
it closes no cycle (`build/assert-no-runtime-cycles.mjs`).

### 4.2 `src/main/machines/remote-sessions.ts` (builder A)

- **Imports.** One new statement after the `./pane-env-rescue` block (`:262-272`): `beginRemoteCreate`,
  `remoteCreateFlightsFor`, `remoteCreateInFlight`, type `RemoteCreateFlights`, from `./create-inflight`.
- **`remoteCreate`.** On the line directly before `noteIssuedRemoteId({` (`:1607`):
  `const flight = beginRemoteCreate(sessionId, input.machineId);` then `try {` around everything from
  `noteIssuedRemoteId` through the final `return projectRow(row, …)`, and `} finally { flight.end(); }`. Re-indent;
  change no statement inside. Directly after the `if (!tmuxId.startsWith('$')) { … }` block and before the stamp loop:
  `flight.answered(tmuxId, machineGeneration(input.machineId).generation);` (covers the plain answer `:1683` and the
  confirmation bind `:1736`).
- **`remoteRecordStatus`** (`:1240`): beside `if (issuedRemoteIdHeld(sessionId)) return 'unknown';` add
  `if (remoteCreateInFlight(sessionId)) return 'unknown';` with a PHASE 326 comment.
- **New export `remoteListCompletedSince(machineId: string, at: number): boolean`**, placed directly after
  `remoteRecordStatus` and before the "The four verbs" banner: true when that machine's state exists,
  `everAnswered` is true and `state.snapshotAt >= at` (written only on a completed pass, `:2617`).
- **`onePass`.** Directly before `const seen = new Map…` (`:2502`), i.e. after the list's `await execOn(…)`:
  `const flights = remoteCreateFlightsFor(machineId, snapshotAt, machineGeneration(machineId).generation);` and
  `let deferred = 0;`. The unstamped block becomes:

  ```ts
  if (parsed.gmuxId.length === 0) {
    // PHASE 326. A create running in this process is binding this row: its own `$-id`, answered in this
    // generation. Skipped by `$-id` alone, never by name; never counted, never rescued, never shown.
    if (flights.beingBound.has(parsed.tmuxId)) continue;
    const memo = foreignRemoteIds(machineId);
    // PHASE 326. A create on this machine has not had its answer yet, so a row nobody has probed may be
    // it. Decided by the next pass; counted as rescue-pending so nothing is written over it meanwhile.
    if (flights.awaitingAnswer && rescueNeeded(parsed, memo)) { deferred += 1; continue; }
    foreign += 1;                                        // unchanged from here
    if (rescueNeeded(parsed, memo)) unclaimed.push(parsed.tmuxId);
    continue;
  }
  ```
  `const rescuePending = unclaimed.length > 0 || deferred > 0;` (`:2595`);
  `if (!rescuePending) dropProvenAbsentCreates(machineId, seen, flights);` (`:2602`); the `writeBackCompletedPass(`
  call gains `flights` (`:2619-2633`). **Do not touch** the `seeded` block, `snapshotAt`, the Phase 187 loop,
  `state.rows = seen` / `state.snapshotAt` (`:2614-2617`, 320.1 inserts a line between them) or the count log.
- **`writeBackCompletedPass`**: its `pass` parameter gains `readonly flights: RemoteCreateFlights`; in the second loop,
  before the Phase 117 skip (`:2730`): `if (pass.flights.owns(record.id)) continue;`.
- **`dropProvenAbsentCreates(machineId, seen, flights)`**: `if (flights.owns(one.id)) continue;` before the status test.
- **No change** to `seedUnconfirmedCreates`, `rescueUnclaimed`, `pane-env-rescue.ts`, `remoteCreateArgs`, the stamps,
  `remoteMachineFacts`, `MachineSessions`, `stateOf`, the sink, or the barrel `src/main/machines/index.ts` (nothing
  reads the new export through it).

### 4.3 `src/main/machines/remote-copy.ts` (builder A)

`export const ATTACH_NOT_HEARD = 'That machine has not told Tortie about this session yet. It may still be starting there.';`
with a doc comment in the file's shape ("PINNED as `machine.attach-not-heard`", why it exists, who says it).

### 4.4 `src/main/sessions/far-attach.ts` (NEW, builder B)

```ts
export const REMOTE_ATTACH_BIND_WAIT_MS = 7_000;
/** How long one quiet turn of the wait lasts before it asks again. */
export const ANNOUNCE_RECHECK_MS = 500;
export class AttachTickets {           // one counter; take/invalidate move it; holds compares
  take(sessionId: string): number;
  invalidate(sessionId: string): void;
  holds(sessionId: string, ticket: number): boolean;
  shutdown(): void;                    // aborts `signal`, idempotent
  readonly signal: AbortSignal;
}
export type FarBinding =
  | { readonly kind: 'row'; readonly row: RemoteSessionRow }
  | { readonly kind: 'absent'; readonly why: string }
  | { readonly kind: 'unanswered'; readonly why: string }
  | { readonly kind: 'machine-unknown' }
  | { readonly kind: 'stale' };
export interface FarAttachDeps {
  row(sessionId: string): RemoteSessionRow | null;              // remoteSessionRow
  recordExists(sessionId: string): boolean;                     // remoteRecordOf(id) !== null
  projectedStatus(sessionId: string): SessionStatus | null;     // projectRemoteRecord(record).status
  machineKnown(machineId: string): boolean;                     // machineRow(id) !== null
  inFlight(sessionId: string): boolean;                         // remoteCreateInFlight
  settled(sessionId: string, ms: number, signal: AbortSignal): Promise<CreateSettle>;
  contextReady(machineId: string): boolean;                     // readyRemoteContext does not throw
  poll(machineId: string): Promise<void>;                       // pollRemoteMachine
  listCompletedSince(machineId: string, at: number): boolean;   // remoteListCompletedSince
  nextAnnounce(ms: number, signal: AbortSignal): Promise<void>;  // onRemoteSessionsChanged, once, unsubscribed
  now(): number;
}
export function defaultFarAttachDeps(): FarAttachDeps;
export function awaitFarBinding(deps: FarAttachDeps, input: {
  sessionId: string; machineId: string; budgetMs: number; live(): boolean; signal: AbortSignal;
}): Promise<FarBinding>;               // the loop in D4, in that order
export function farBindingRefusal(verdict: Exclude<FarBinding, { kind: 'row' } | { kind: 'stale' }>,
  who: { machineId: string; tmuxName: string }): GmuxError;
export type { RemoteSessionRow } from '../machines/remote-sessions';
```
It imports from `../machines/remote-sessions`, `../machines/remote-record`, `../machines/store`,
`../machines/create-inflight`, `../machines/remote-copy` and `../errors`, and **nothing from `../tmux`**. Every timer
it makes is cleared and `unref`'d; every listener it adds is removed on every outcome.

### 4.5 `src/main/sessions/core.ts` (builder B) — five small edits, all away from 320.1's and 323's hunks

1. **Import**, one statement placed after the `./resume-in-place` import (`:504-511`), before `./launch-plan`:
   `AttachTickets`, `awaitFarBinding`, `defaultFarAttachDeps`, `farBindingRefusal`, `REMOTE_ATTACH_BIND_WAIT_MS`,
   types `FarAttachDeps`, `RemoteSessionRow`, from `./far-attach`. Do not edit the `../machines/remote-sessions`
   import block (`:173-192`; 320.1 edits it).
2. **Lazy holders**, directly after the `shuttingDown` getter (`:858-860`): `private attachTicketsSlot: AttachTickets |
   null = null;`, `private get attachTickets(): AttachTickets`, `private farAttachDepsSlot: FarAttachDeps | null =
   null;`, `private get farAttachDeps(): FarAttachDeps`, each with the `ledgerSlot` comment's reason.
3. **`attachSessionAdmitted`**: first statement `const ticket = this.attachTickets.take(sessionId);`; the immediate
   remote branch becomes `this.attachListedRemote(sessionId, remote, sender); return;`; then
   ```ts
   // PHASE 326. A session on another machine is never looked for on this Mac's server.
   const far = remoteRecordOf(sessionId);
   if (far !== null && isRemoteRecord(far)) {
     await this.attachFarUnbound(sessionId, far, sender, ticket);
     return;
   }
   ```
   then the local branch, byte-identical from `const rec = this.mustGetSession(sessionId);` to the end.
4. **New private methods** after `attachSessionAdmitted`, before `detachSession`: `attachListedRemote` (D8),
   `attachFarUnbound` (await `awaitFarBinding(this.farAttachDeps, { … budgetMs: REMOTE_ATTACH_BIND_WAIT_MS, live: () =>
   this.attachStillWanted(sessionId, ticket, sender), signal: this.attachTickets.signal })`; `stale` returns;
   non-row throws `farBindingRefusal(verdict, { machineId, tmuxName: far.tmuxName })`; a row re-checks
   `attachStillWanted` and then calls `attachListedRemote` with no await between), and `attachStillWanted`
   (ticket held, sender not destroyed, not `shuttingDown`, `disposed !== true`).
5. **`detachSession`**: first line `this.attachTickets.invalidate(sessionId);`. **`beginShutdown`**: after
   `this.ledger.beginShutdown();` add `this.attachTickets.shutdown();`.

Nothing else in `core.ts` changes. In particular not `scrollTarget` (`:2529`, 320.1's), not `killSessionAdmitted`
(`:2848`, 323's, whose `conformance:endtree` reads it by braces), not the four feed-only tests.

---

## 5. The phases running beside this one, and the hunks to stay out of

| Phase | Worktree | Touches, in a file this phase edits | This phase's rule |
| --- | --- | --- | --- |
| 320.1 remote scrolling | `/private/tmp/wt-p3201` | `remote-sessions.ts`: `MachineSessions` (`:533-633`), `stateOf` (`:697-723`), a block after `remoteSessionRow` (`:1077`), `onePass`'s first lines (`:2434-2440`), a line between `state.rows = seen` and `state.names` (`:2614`), sink `connected` (`:2945-2950`), `remoteMachineFacts` (`:3222-3265`). `core.ts`: imports `:187-195`, `:218-229`; constants `:571-650`; `scrollTarget` `:2521-2790`. `package.json`, `build/verification-checks.mjs`, `CLAUDE.md`, `CHANGELOG.md`, `p95-scroll-drive.ts`, `probe-p320.mjs`. | Edit none of those regions. New code goes where §4 places it. |
| 323 End ends the tree | `/private/tmp/wt-p323` | `core.ts`: imports `:465-472`, fields `:694-712`, `killSessionAdmitted` `:2848-3100`. `package.json`, `build/verification-checks.mjs`, `build/assert-electron-teardown.mjs`, `CLAUDE.md`, `CHANGELOG.md`. | Edit none of those regions. |
| 324 tmux 3.6/3.6b | `/private/tmp/wt-p324` | `control-plane.ts :44-65`, `src/main/tmux/version.ts`, `build/tmux-probe-versions.json`, `CLAUDE.md`, `CHANGELOG.md`, `package.json`. | Not touched here. 324 rebases onto this phase and re-runs `probe:p326` A and B on 3.6 and 3.6b. |

The second phase to land rebases. Shared tables (`package.json`, `build/verification-checks.mjs`, CLAUDE.md's tables,
CHANGELOG's Unreleased list, `HELPER_USER_FLOOR`) conflict textually and are reconciled at rebase by adding both
sides; `HELPER_USER_FLOOR` becomes whatever the other landing left plus one. If 320.1 lands first and its `scrollTarget`
calls `remoteSessionRow(` without a record test, `conformance:farattach` rule FA8 names it; the rebase then adds it to
the allowed set with its reason, or 320.1's code already asks the record.

---

## 6. Tests (vitest; `gate:checks` runs because test files are added)

**`src/main/machines/__tests__/p326-inflight-create.test.ts`** (builder A), following `remote-sessions.test.ts`'s
mocked exec plane:
- the registry: settle on `end()`; `none`/`timeout`/`aborted`; no timer or listener left after each; replace-on-begin;
  memory prune at `FLIGHT_MEMORY_MS`; `remoteCreateFlightsFor` by `issuedAt` (ended before -> not considered; ended
  after -> considered) and by generation;
- every exit of `remoteCreate` ends its flight: the return; SPAWN_FAILED on a non-`$` answer (row dropped); the
  confirmation's `dropRow` throw; the kept-`unknown` throw; `startMachineFeed` throwing; the "did not list it back"
  throw; and a stamp failure (the create still returns);
- a seeded id from an earlier run has no flight;
- an unstamped row with the answered `$-id`: not counted, not rescued, not in `seen`; the same `$-id` under another
  generation: handled as today;
- an unstamped row with any other `$-id`, including one whose NAME equals the create's name: counted and rescued as
  today when no flight is awaiting its answer;
- while a flight awaits its answer: a never-probed unstamped row is deferred (count unchanged, no `show-environment`),
  a memoised one is still counted, and the pass is rescue-pending (no absence write over an issued row, no drop);
- a list issued before a flight ended and parsed after it: the row is still skipped or deferred; a list issued after
  the memory window: as today;
- the write-back never writes `restorable` over a live flight's row, and the drop never clears a flight-owned id
  (each with a control showing the parent's write when the flight is absent);
- `remoteRecordStatus` answers `unknown` for a live flight and `restorable` after it ends and a completed list lacks it;
- a create whose `@gmux-id` stamp failed is rescued by the first pass after its flight ends;
- `remoteListCompletedSince` over issued-before, issued-after and a failed list.

**`src/main/sessions/__tests__/p326-far-attach.test.ts`** (builder B): `awaitFarBinding` over fake deps and a fake
clock, one case per turn of D4 (row at once; flight -> settled -> row; flight -> timeout -> unanswered; record gone ->
absent; own list proves `restorable` -> absent; own list completes and the record is still `unknown` (issued) ->
unanswered; own list fails -> unanswered; context not ready -> announce -> row; announce never -> unanswered at the
budget; `live()` false after each await -> stale; abort -> stale; machine unknown); `AttachTickets`; and
`farBindingRefusal`'s three codes and sentences.

**`src/main/sessions/__tests__/p326-attach-far-unbound.test.ts`** (builder B), in `remote-lifecycle.test.ts`'s shape
(real method off the prototype, `vi.mock` of `../../tmux` with a spy on `listSessions`): a far record never calls
`tmux.listSessions`; a waited attach attaches with the `$-id` the feed reports; `detachSession` during the wait -> no
`attachHost.attach`; a newer attach during the wait -> the older spawns nothing; `beginShutdown` during the wait ->
no attach and the promise resolves at once; `absent` -> SESSION_NOT_FOUND "This session is not running right now.";
`unanswered` -> TMUX_UNREACHABLE with `ATTACH_NOT_HEARD`; a destroyed sender -> nothing spawned; the immediate remote
branch unchanged (the `exited` refusal, `readyRemoteContext`, the attach arguments); a local record byte for byte as
before (`mustGetSession`, `liveIds`, `tmux.listSessions`, the local sentence, `attach` with `cwd`).

---

## 7. `conformance:farattach` and `ablation:p326` (builder C)

`build/conformance-farattach.mjs`, about 1 s, spawns nothing, reads source with `build/scan-source.mjs`
(`stripComments`, `blockAt`, `functionBodyOf`), comments blanked first. Rules:

- **FA1** In `attachSessionAdmitted`, an `if` testing `remoteRecordOf(` and `isRemoteRecord(` whose block returns
  precedes `this.mustGetSession(` and `tmux.listSessions(`. `far-attach.ts` imports nothing from `../tmux` and names
  no `listSessions(`.
- **FA2** `this.attachTickets.take(` is the first statement of `attachSessionAdmitted` (before any `await` and before
  `remoteSessionRow(`); `detachSession` calls `this.attachTickets.invalidate(`; `beginShutdown` calls
  `this.attachTickets.shutdown(`; both holders are lazy getters over `…Slot` fields.
- **FA3** In `attachFarUnbound`, after its last `await`, an `attachStillWanted(` check precedes
  `this.attachListedRemote(` with no `await` between them; `attachStillWanted` reads `holds(`, `isDestroyed()`,
  `shuttingDown` and `disposed`.
- **FA4** `this.attachHost.attach({` carrying `machine` appears exactly once in `core.ts`, inside `attachListedRemote`;
  the immediate branch of `attachSessionAdmitted` calls `attachListedRemote(`.
- **FA5** In `remoteCreate`, `beginRemoteCreate(` precedes `noteIssuedRemoteId(` and `writeRemoteRow(`; one `try`
  block contains `writeRemoteRow(`, the new-session `execOn(`, `for (const option of REMOTE_STAMPS)` and
  `startMachineFeed(`, and its `finally` calls `.end()` on that flight; `.answered(` sits after the `startsWith('$')`
  test and before the stamp loop.
- **FA6** In `onePass`, `remoteCreateFlightsFor(` is called with `snapshotAt` after the list's `await execOn(` and
  before the parse loop; inside the `parsed.gmuxId.length === 0` block the `beingBound` test reads `parsed.tmuxId`,
  names neither `tmuxName` nor `.name`, and it and the deferral arm each end in `continue` before `foreign += 1`; no
  `seen.set(` occurs inside that block; `rescuePending` reads both `unclaimed.length` and the deferred count.
- **FA7** `remoteRecordStatus` answers `'unknown'` on `remoteCreateInFlight(`; `writeBackCompletedPass` tests
  `flights.owns(` before `noteRemoteRowSeen(record.id, pass.absentStatus`; `dropProvenAbsentCreates` tests `.owns(`
  before `clearIssuedRemoteId(`.
- **FA8** The set of `core.ts` methods that call `isRemoteSessionId(` or `remoteSessionRow(` and call none of
  `remoteRecordOf(`, `isRemoteRecord(` or a `machineId !==` test is a subset of `{handleUnexpectedAttachExit,
  renameSessionAdmitted, killSessionAdmitted, resumeSessionInPlace}`, and `attachSessionAdmitted` is not in it. It can
  shrink; it cannot grow.
- **FA9** `REMOTE_ATTACH_BIND_WAIT_MS` <= `MUTATION_JOIN_DEADLINE_MS` and >= 3,000; `FLIGHT_MEMORY_MS` >= 2 ×
  `REMOTE_POLL_TIMEOUT_MS` (all three read from their own files by value).
- **FA10** `ATTACH_NOT_HEARD` is exported from `remote-copy.ts`, used exactly once under `src/main` (in `far-attach.ts`)
  as the message of a `'TMUX_UNREACHABLE'` error, contains none of `pane`, `window`, `prefix`, `tmux`, `server`, and
  `build/assert-bundle-refusals.mjs` has an entry `machine.attach-not-heard` naming its fragments.
- **FA11** `create-inflight.ts` has no runtime import; `pane-env-rescue.ts` names no flight function.

`build/p326/ablation.mjs` (`ablation:p326`) breaks the SHIPPING source one clause at a time, runs the gate, requires
the owning rule red and the others as they were, and restores every file by sha256 in a `finally` and on SIGINT,
SIGTERM and SIGHUP. An unedited control run first, green. At least these arms: the flight registered after
`writeRemoteRow`; the `finally` removed; `.answered(` removed; the skip testing `parsed.tmuxName`; the skip adding to
`seen`; the deferral arm removed; `rescuePending` reading `unclaimed` alone; the write-back skip removed; the drop skip
removed; the status arm removed; the far branch removed from `attachSessionAdmitted`; the ticket taken after the first
await; the liveness check removed before `attachListedRemote`; `invalidate` removed from `detachSession`; `shutdown`
removed from `beginShutdown`; a second copy of the remote attach; a new feed-only method; the bound set to 12,000; the
sentence thrown as SESSION_NOT_FOUND. For three arms (the skip, the deferral, the liveness check) it also runs the
owning p326 vitest file and requires it red, so the behaviour tests are proved able to fail.

---

## 8. `probe:p326` (builder C writes it; verifiers run it under the lock)

**Script.** `"probe:p326": "node build/harness-socket.mjs --fresh gmux-p326 'export GMUX_CONFIG_ROOT=\"$GMUX_HARNESS_DIR\"; node build/with-scratch-machine.mjs -- node build/p326/probe-p326.mjs'"`,
in `probe:p320`'s shape, no `npm run build &&` (a run against another checkout must not rebuild this one). It refuses
(exit 2, one sentence): no `GMUX_TMUX_SOCKET`, the names `gmux` and `default`, a socket not starting `gmux-p326`, no
`GMUX_HARNESS_DIR`, no carriage, a carriage `tmuxTmp` outside `/tmp/`, a stale or missing `out/` in the checkout it
measures (sources: `core.ts`, `remote-sessions.ts`, `remote-copy.ts`, `TerminalPane.tsx`, `sessions-slice.ts`, and
`far-attach.ts`/`create-inflight.ts` when present), a `P326_FAR_TMUX` that is not an executable file, a path that holds
a quote or a space. It launches through `withElectron` only, one Electron at a time.

**Environment.** `P326_CHECKOUT` (a BUILT worktree to measure instead of this one), `P326_FAR_TMUX` (default the
carriage's `which tmux`, 3.6a here; `build/vendor/tmux/bin/tmux` is 3.7b), `P326_ARMS` (subset of
`A,B,C,D,Ea,Eb,Ec,Ed,G`; all by default), `P326_OUT_DIR` (default `out/p326`; remove before a package), `P326_KEEP=1`
(keep the far log and every reading for the verifier's re-derivation). `--self-test` runs every grader over fixtures
and launches nothing.

**The far wrapper, `build/p326/far-tmux.sh`.** `#!/bin/zsh -f`. The probe copies it into the run's scratch folder
beside a generated `far-tmux.env` (shell-quoted `REAL`, `LOG`, `RULES`, `FARHOME`), because an environment variable
does not cross ssh, and names the copy as the machine's `remoteTmuxPath` in `machines.json` (as `probe-p320.mjs`
does). Per invocation it: appends `<epoch ms> <pid> <argv, each word quoted>` to `LOG` using `zmodload zsh/datetime`
and `$EPOCHREALTIME` (no child process, so it adds no measurable latency to the race it measures); reads `RULES`
(rewritten atomically by the probe between arms, one rule per line); applies at most these: `stamp-delay-ms N`
(before any `set-option … @gmux-id …`), `first-list-delay-ms N` (before the first `list-sessions` after the rule is
written, consumed through an atomic `mkdir` marker), `stranger-on-name NAME` (on `new-session … -s NAME`, first runs
`$REAL <the same leading global options> new-session -d -s NAME`, unstamped, so the create fails as a duplicate);
exports `HOME=$FARHOME ZDOTDIR=$FARHOME` (a scratch folder holding `.zshrc` with `PS1='p326 %# '` and `unset
HISTFILE`, and `.hushlogin`); then `exec`s `$REAL "$@"`. The HOME export is new against `probe:p320`: 320.1's
reverify found that every real-row run moved the modified time of his `~/.zsh_history`, and a far `shell` session on
the loopback machine is otherwise his own login shell with his own home.

**Before each launch.** Write `<profile>/gmux/config/machines.json` and `known-machines` (as p320), and
`<profile>/gmux/config/agents.json` renaming the binaries and launch argv of gemini, qwen, antigravity, grok and droid
to `p326-never-<id>` (Phase 331's overlay shape, from a new shared `build/hidden-agents.mjs` that p326 uses; p331
keeps its own copy, named as a follow-up extraction). After the window is up, read `window.gmux.agentsList()` back:
any of the five with a `binPath`, a `version` or `installed` true -> exit 2 before any arm. Stat his `~/.zsh_history`
(mtime and size only, never its content) before the first launch and after the last, and report both.

**The page kit.** One expression installs `window.__p326`: `findTerm` through the React fiber of
`.gmux-terminal-mount` (as `probe-p320.mjs` does, attributed), `drawn(name)` (a non-blank xterm row holding `p326`),
and a recorder that every 50 ms reads `window.__gmuxP95.state()` plus `.gmux-terminal-overlay-title`, its detail and
its action, and keeps, per watched session name: the first time the renderer held the row, every status change, every
overlay title/detail/action change, the mount time, and the first drawn time.

**The arms.** One launch per (build, far version) runs, in this order: G, A, B, Ed, C, Eb, Ea, then Ec, whose quit
ends the launch; launch 2 on the same profile is D. Every create is `shell`, via the drive's own `create`, and "alone"
means the probe verified (drive state) that the freshly opened tab held no session and that the session on screen
during the create was the new one; a create that was not alone is UNREADABLE, not a pass.

| Arm | Per launch | What it does | HEAD must read | Parent (recorded) |
| --- | --- | --- | --- | --- |
| **G** local control | 20 | `openLocal(<fresh folder>)`, create alone | 0 refusals, 0 stalls (drawn within 30 s) | the same, or a finding with its own entry |
| **A** natural rate | 20 | `openRemote(p326far, <fresh far folder>)`, create alone, no rule | 0 refusals of any code, 0 stalls | refusals and stalls, counted |
| **B** widened window | 8 | as A with `stamp-delay-ms 1500` | every one drawn within 2,000 ms of first reading bound; 0 refusals | every alone create predicted to refuse |
| **Ed** back to back | 2 pairs | one fresh far tab, `stamp-delay-ms 1500`, the second create started 200 ms into the first (neither awaited) | both drawn (the first after selecting it once both settle) | recorded |
| **C** past the bound | 2 | as A with `stamp-delay-ms 8500` | "Can't connect to this session" with `ATTACH_NOT_HEARD` and Try again, shown 6,000 to 9,000 ms after mount, never "This session no longer exists"; after the row reads bound, pressing Try again (a real click on the overlay action) draws within 5,000 ms | recorded |
| **Eb** switch away | 2 | as B; once the pane is mounted and not drawn, `openLocal(<G's first folder>)` | 2,000 ms after the create settles: the verifier-style far `list-clients -F '#{client_session}'` shows no client on it and `ps` shows no local ssh attach naming its `$-id`; `openRemote` back to its tab draws it | recorded |
| **Ea** stranger | 2 | `stranger-on-name <the create's name>` | the attach ends SESSION_NOT_FOUND "This session is not running right now." or the pane unmounts as the row is dropped, within 7,000 ms; never "This session is no longer running."; the id leaves the drive's session list; far log: no `set-option`, `attach-session` or `kill-session` naming the stranger's `$-id`, at most one `show-environment` of it; the stranger still exists at the end | recorded |
| **Ec** quit in the wait | 1 | as B; once mounted and waiting, `window.gmux.quit()` | the app exits on its own (the helper's teardown signals nothing), its time from quit to exit is no more than the parent's in the same arm plus 1,000 ms (the waiting attach must not hold the quit; the create itself is joined, bounded by `MUTATION_JOIN_DEADLINE_MS`, at both builds, because remote execs are refused only after `shutdownGmuxCore`, `src/main/capabilities.ts:706`); after exit, far `list-clients` shows no client and `ps` shows no local ssh attach | quit time recorded |
| **D** relaunch | 1 | same profile, `first-list-delay-ms 2500`; the far session on screen at the quit (Ec's, alone in its tab) is focused (`openRemote` to its folder if the restored window shows another tab) | drawn within 30 s, never "no longer exists"; valid only when the far log shows the first `list-sessions` starting after the pane mounted, else UNREADABLE | predicted: the local branch's refusal |

**Focusing a tab again.** Eb and D rely on `openRemote(p326far, <an already-open far folder>)` focusing that tab, as `openLocal` does for a local folder. Builder C reads `addRemoteProject` (`src/renderer/state/projects-slice.ts:256`) and main's `addRemoteProject` and states in the probe header whether it does; if it refuses instead, those two steps click the tab's own element in the tab spine by DOM, and the header says so.

**F, derived from every launch, no creates of its own.** Per arm: the "`p326far holds N session(s) Tortie did not
create`" lines in the app output. At HEAD, in A, B, C, Eb, Ec and Ed (no stranger exists), N never exceeds the value
read before the arm's first create (1 before Ea: Tortie's own `gmux-control`, which the probe also confirms with its
own far `list-sessions -F '#{session_id} #{session_name} #{@gmux-id}'` before the first create). The rescue's "could
not account for" sentence: 0 at HEAD across A to Ed. Both reported at the parent.

**Per create, in the readings:** arm, name, id, `$-id`, far version, build; call time; first held, mounted, bound and
drawn times; the status sequence; every overlay; the refusal (code, message, detail) from app lines holding
`Error occurred in handler for 'sessions:attach'` attributed by name or id; from the far log: `new-session` time, every
`list-sessions` start inside [`new-session`, `@gmux-id` stamp], the stamp time, the window length; alone; valid.
Readings, the far log (with `P326_KEEP=1`) and each launch's app output go to `P326_OUT_DIR` named by tag and far
version. Exit 0 with no finding, 1 with findings (at the parent the expected refusals are findings, named as expected),
2 on a refusal or an UNREADABLE run.

**Safety.** Every tmux command the probe itself runs names the harness socket and the carriage's `TMUX_TMPDIR`, runs
the REAL far binary (never the wrapper, so it never enters the far log), and is `spawnSync`. It never names `-L gmux`
or the default server, never runs `pkill` or `kill-server`, and its `finally` (plus an `exit` handler) ends the far
tmux server by the pid it reports, as `probe-p320.mjs` does; `with-scratch-machine.mjs` ends the sshd, agent and
recorded pids. It types nothing into any session and sends no control bytes. `HELPER_USER_FLOOR` 155 -> 156.

---

## 9. The proof, run rather than read

### 9.1 Step 0 — the verifier's first act, at the parent, before any HEAD run

Build a parent worktree at `ca92d282` (`git worktree add --detach`, `cp -Rc node_modules` and `build/vendor`,
`npm run build`). Under the lock, run `P326_CHECKOUT=<parent> P326_ARMS=A,B npm run -s probe:p326` twice, once with
the default far tmux (3.6a) and once with `P326_FAR_TMUX=$PWD/build/vendor/tmux/bin/tmux` (3.7b). Write the table in
§13 below into this file. **If A and B both read 0 refusals at the parent on both far versions, the mechanism is
refuted: the verdict is needs_work, "mechanism refuted", and the phase goes back to diagnosis.** If Step 0's slowest
settle exceeds 2,333 ms, that is a finding against D5.

### 9.2 Gates

Builders: `npm run typecheck`, their own vitest files, then `npm test` once. Integrator (no Electron):
`npm run typecheck && npm run build` (which runs `gate:electron` at the raised floor, `gate:background`,
`gate:checks`, `gate:contract` — which must not move: no channel, code, key, environment name or schema changes —
and `assert-bundle-refusals` with the new pin), `npm test`, `npm run package`, `conformance:farattach`,
`ablation:p326`, `conformance:machines`, `conformance:remoteclose`, and `node build/p326/probe-p326.mjs --self-test`.
Verifier, under the lock: `npm run smoke:t1`, `smoke`, `smoke:t3`; once each `smoke:p117` (a create whose answer is
lost is still rescued, and binds the same id), `smoke:remote`, `smoke:matrix`, `smoke:partition`; once each
`probe:p167` and `probe:p95` (the phase changes how a session attaches).

### 9.3 Where it was found

`P320_ARMS=R1 npm run -s probe:p320` eight times at HEAD (after `npm run build`). Phase 320's removal round read 2 of 8
stalls at its HEAD and 3 of 8 at its parent. Target: 0 of 8 stalls and 0 refusal lines in the app output.

### 9.4 `probe:p326` at the parent and at HEAD

Four invocations, one Electron at a time: parent 3.6a, parent 3.7b, HEAD 3.6a, HEAD 3.7b, each all arms (launch 1 and
launch 2). That gives per build 40 far creates in A, 16 in B, 40 local in G. 0 of 40 bounds A's HEAD rate below about
7.5 percent at 95 percent confidence; arm B is what proves the window closed.

### 9.5 The verifier's independent methods

- **Re-derive from the far log alone.** For each parent create, mark whether it was alone and whether its pane
  MOUNTED BEFORE THE CREATE'S OWN LIST LANDED (the attach found no feed row when it started); that is the refusal
  condition, and it predicted 1,817 of 1,817 parent refusals in the attack verifier's harness. Live, the only thing
  that mounts the pane that early is the announce of a pass that READ the new session unstamped, which leaves the
  rescue's `show-environment -t <the new $-id>` in the far log; that mark predicted 31 of 31 parent refusals in arms
  A and B with no false positive. **A `list-sessions` inside [`new-session`, `@gmux-id` stamp] is NOT the
  predictor** (corrected in the fix round, §14 "The fix round"): live it is necessary and not sufficient (38 of 40
  windows held one, 15 refused), and in the harness it is sufficient and not necessary (72 of the parent's 166
  on-announce refusals had no list in the window). Phase 324's reverify of `probe:p326` A and B grades on the mount
  mark, not on the window. Count attach clients with the verifier's own far `list-clients`, never the probe's.
- **Attack.** Arms Ea to Ed as graded above, plus one the verifier writes itself (for example, a Remove of the waiting
  session during the wait, which must spawn nothing).
- **Measure the parent.** §9.1 and §9.4.

### 9.6 Side by side (his rule: no scenario worse than today; the part that regresses is removed)

For every create that drew at BOTH builds without a refusal, compare time from call to drawn: HEAD's median may not
exceed the parent's by more than 250 ms, and no HEAD create may be slower than the parent's slowest by more than
1,000 ms. G identical within the same tolerances. `probe:p167` and `probe:p95` read as at the parent. A scenario the
probe does not measure is named, not assumed: a far session that ENDED while Tortie was quit and is on screen at the
relaunch (predicted: at the parent the pane shows "This session no longer exists" at once and then Restore once the
first list lands; at HEAD it stays blank until the same first list and then shows the same Restore; the end state
arrives at the same moment).

### 9.7 What cannot be proven here

The window's width over a real link is not measured and no row runs on his machines. The bound is chosen from reasons
and checked against loopback settle times, so a machine slower than it gets Try again rather than a blank screen; that
is the promise, not a guarantee that the screen draws by itself. A list older than the newest overwriting it
(`:2614`) is not fixed; the probe's readings show it only if it happens.

---

## 10. Builders, the integrator and the verifier

Every role: edit ONLY your own files; `/Users/gdc/gmux`, `/Users/gdc/tortiedotsh` and `/Users/gdc/superset` are read
only; NEVER commit, stage or stash; builders and the integrator launch no Electron and run no probe; install nothing.
Scratch: `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p326/<role>/`.

- **Builder A, machines.** Owns `src/main/machines/create-inflight.ts` (new), `src/main/machines/remote-sessions.ts`,
  `src/main/machines/remote-copy.ts`, `build/assert-bundle-refusals.mjs`,
  `src/main/machines/__tests__/p326-inflight-create.test.ts` (new). Builds §4.1 to §4.3 exactly, with the names and
  signatures in §4.1 (builder B and C code against them), and the first test file in §6.
- **Builder B, sessions.** Owns `src/main/sessions/far-attach.ts` (new), `src/main/sessions/core.ts`,
  `src/main/sessions/__tests__/p326-far-attach.test.ts` (new),
  `src/main/sessions/__tests__/p326-attach-far-unbound.test.ts` (new). Builds §4.4 and §4.5, importing A's names as
  §4.1 and §4.2 give them (the integrator reconciles if A's land differently), and the second and third test files.
- **Builder C, gates, probe and the shared files.** Owns `build/conformance-farattach.mjs` (new),
  `build/p326/ablation.mjs` (new), `build/p326/probe-p326.mjs` (new), `build/p326/far-tmux.sh` (new),
  `build/hidden-agents.mjs` (new), and the shared files: `package.json` (`conformance:farattach`, `ablation:p326`,
  `probe:p326`), `build/verification-checks.mjs` (`pure('conformance:farattach')`, `pure('ablation:p326', …vitest)`,
  `remote('probe:p326')`), `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 155 -> 156, the commit body names
  `build/p326/probe-p326.mjs`), `CLAUDE.md` (§11), `CHANGELOG.md` (§11), and `docs/audits/contract-baseline.txt`
  (owned so nobody else touches it; it must NOT change, and C reports `gate:contract` rather than regenerating).
  Builds §7 and §8 against the names in §4.
- **Integrator.** Reconciles names across A, B and C; runs §9.2's integrator list; scans for duplicated 10+ line
  blocks; reports every command with its exit code.
- **Verifier(s), under the lock** (`mkdir …/scratchpad/electron.lock && echo p326 > …/owner`; retry every 60 s in a
  new command for up to 180 minutes; release with `rm -rf …/electron.lock` on the same command line). §9.1 first, then
  §9.2's verifier list, §9.3, §9.4, §9.5, §9.6. Returns `{verdict, evidence, problems}` naming its independent step.
  Counts Electrons once, at the end, with `ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" |
  grep -v defunct`.

---

## 11. The words that ride along

**CHANGELOG.md, under `## Unreleased` -> `### Fixed`, last item, no link (the follow-up docs commit adds it):**

- The first session you start in a tab on another machine now shows its screen as soon as it has started, where it could open on "This session no longer exists" and stay blank while it was running; if that machine is slow to answer, the session offers Try again instead

**CLAUDE.md, gate table row** (after `conformance:remoteclose`):
`| \`src/main/machines/create-inflight.ts\`, \`src/main/sessions/far-attach.ts\`, \`remoteCreate\`, \`onePass\`, \`writeBackCompletedPass\`, \`dropProvenAbsentCreates\` and \`remoteRecordStatus\` in \`src/main/machines/remote-sessions.ts\`, \`src/main/machines/pane-env-rescue.ts\`, \`attachSessionAdmitted\`, \`attachFarUnbound\`, \`attachListedRemote\`, \`detachSession\` and \`beginShutdown\` in \`src/main/sessions/core.ts\`, \`ATTACH_NOT_HEARD\` in \`remote-copy.ts\` | \`conformance:farattach\` | ~1 s, spawns nothing | An attach to a session on another machine never lists this Mac's server; it waits for its create or one fresh list of that machine, bounded, and spawns nothing for a pane that has gone. A pass never counts, rescues or writes over a session a create in this process is binding, decided by \`$-id\` and by the list's age, never by name. \`ablation:p326\` is the attack beside it |`
**CLAUDE.md, probe table row**: `| \`probe:p326\` | the same paths | about 15 to 25 min per invocation, four invocations per phase (parent and HEAD on 3.6a and 3.7b); two Electrons one after the other on one scratch profile, the loopback machine with its tmux behind \`build/p326/far-tmux.sh\`, which logs every far command and can hold the \`@gmux-id\` stamp or the first list; \`P326_CHECKOUT\` points it at a parent build, \`P326_FAR_TMUX\` at another far tmux, \`P326_KEEP=1\` keeps the far log for the verifier's re-derivation |`

No menu, surface or status changes; the native menus are untouched.

---

## 12. What is NOT in this phase

- No change to when the durable row is written or listed (Phase 72); it still reads `unknown` while its create runs.
- No single-command stamp: `set-option @gmux-id` in the same tmux command list as `new-session` would change the create
  argv Phases 72, 117 and 270 pinned and is unmeasured; it needs its own research entry.
- No renderer change (overlay table, the missing Try again on SESSION_NOT_FOUND, the effect dependencies,
  `activeSession()`'s fallback, an automatic retry after TMUX_UNREACHABLE).
- No change to the four other feed-only tests (the exit handler, rename, End, resume in place); FA8 pins them so the set
  can only shrink. End is Phase 323's file, and 323 does not reach remote sessions.
- No fix for an older list overwriting the newest (`:2614`, `:2617`); `state.rows`, `gone` and Phase 187's loop are
  untouched.
- `gmux-control` is not filtered out of the far "did not create" count.
- No change to `pane-env-rescue.ts`, the foreign memo, `seedUnconfirmedCreates`, Phase 117's confirmation, or remote
  restore (D12).
- No change to the local create, the local attach, or the local branch's milliseconds-wide detach gap.
- No new status, surface or menu; no contract change; no release; nothing runs on his machines and nothing names
  `-L gmux`.
- The 3.6 and 3.6b far builds (D10); p331's hidden-agents copy is not refactored (follow-up).

---

## 13. As measured (the verifier fills this in; nothing below is claimed until it is)

### Step 0 — the parent `ca92d282`, arms A and B

| far tmux | arm | creates | alone and valid | refused (code, sentence) | stalled 30 s | windows holding a list | window ms median / max | settle ms median / max | status sequences seen |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3.6a | A | 20 | 20 of 20 | 7, each `SESSION_NOT_FOUND` "This session is no longer running." (the local branch) | 7 | 19 of 20 by the wrapper's clock (20 of 20 counting lists logged up to 15 ms after the stamp); 7 of 20 READ UNSTAMPED by a pass (the rescue's `show-environment -t <that $-id>` in the far log), the same 7 that refused | 16 / 46 | 162 / 325 | `idle` ×13, `unknown → idle` ×7 |
| 3.6a | B | 8 | 8 of 8 | 8, the same sentence | 8 | 8 of 8; 8 read unstamped | 1,521 / 1,531 | 1,654 / 1,699 | `unknown → idle` ×8 |
| 3.7b | A | 20 | 20 of 20 | 8, the same sentence | 8 | 18 of 20 (20 of 20 with the 15 ms margin); 8 read unstamped, the same 8 that refused | 22 / 1,002 | 231 / 7,858 | `idle` ×8, `unknown → idle` ×8, `idle → running → idle` ×4 |
| 3.7b | B | 8 | 8 of 8 | 8, the same sentence | 8 | 8 of 8; 8 read unstamped | 1,522 / 1,579 | 1,673 / 2,067 | `unknown → idle` ×8 |

Measured by the parent-lens verifier on 2026-09-30 (`probe:p326` with `P326_CHECKOUT` at a built `ca92d282`, every arm, then
HEAD, one Electron at a time under the lock), re-derived from the far log and the verifier's own far sampler
(`list-clients` and `list-sessions` through the real far binary every ~300 ms, `ps` every second), never from Tortie's log.

Stop rule result: **not refuted.** The parent refuses in A 7 of 20 (3.6a) and 8 of 20 (3.7b), and in B 8 of 8 on both. A list
logged inside the window is necessary and not sufficient (19 and 18 of 20 windows held one); a pass that READ the new session
unstamped predicts the refusal exactly, 15 of 15 in A and 16 of 16 in B, with no refusal outside it and none of those drawn.
Slowest settle against 2,333 ms: 3.6a 325 ms (A; B's 1,699 holds the stamp 1,500 ms on purpose). **3.7b 7,858 ms, over the
line** (`p326-a-04`): every far exec in that create took about 1 s during a machine-wide slowdown (load averages 42 to 49 from
other programs), and its pane mounted after the feed listed it (first status `idle`), so it took the immediate branch at the
parent and would at HEAD; the next slowest 3.7b A settle is 690 ms. A finding against D5 as §9.1 defines it, not a defect.

### Parent against HEAD, every arm

| far tmux | arm | parent refused / stalled / drawn | HEAD refused / stalled / drawn | HEAD graded |
| --- | --- | --- | --- | --- |
| 3.6a | G | 0 / 0 / 20 | 0 / 0 / 20 | PASS; call to drawn median 88 -> 92 ms, max 147 -> 120 |
| 3.6a | A | 7 / 7 / 13 | 0 / 0 / 20 | PASS; clean creates median 173 -> 232 ms, max 209 -> 339; 0 creates read unstamped by any pass |
| 3.6a | B | 8 / 8 / 0 | 0 / 0 / 8 | PASS; drawn 1,714 to 1,915 ms after the call |
| 3.6a | Ed | 2 / 0 / 4 | 0 / 0 / 4 | PASS (2 of 4 valid at both builds: the second of a pair is not alone by design) |
| 3.6a | C | 2 / 2 / 0, the local sentence | 2 `TMUX_UNREACHABLE` `ATTACH_NOT_HEARD` with Try again / 0 / 2 after Try again | PASS |
| 3.6a | Eb | 2 / 0 / 2 | 0 / 0 / 2 | UNREADABLE at both builds (the away tab's local session counts as on screen); the verifier's sampler read 0 far clients and 0 ssh attaches on its `$-id` during the switch at both |
| 3.6a | Ea | 2 "Session not found." | 2 "Session not found." | FAIL at both builds on the grader's own numbers: the pane unmounts 3.8 to 7.7 s after the mount at both, and each stranger is read once per LAUNCH (twice per run) at both; no `set-option`, `attach-session` or `kill-session` on it at either |
| 3.6a | Ec | 1 / - / 0, quit 1,776 ms | 0 / - / 0, quit 1,759 ms | PASS |
| 3.6a | D | 1 / 1 / 0 | 0 / 0 / 1, drawn 3,122 ms after the mount | PASS |
| 3.7b | G | 0 / 0 / 20 | 0 / 0 / 20 | PASS; median 99 -> 84 ms |
| 3.7b | A | 8 / 8 / 12 | 0 / 0 / 20 | PASS; clean creates median 227 -> 192 ms, max 5,800 -> 319 |
| 3.7b | B | 8 / 8 / 0 | 0 / 0 / 8 | PASS |
| 3.7b | Ed | 2 / 0 / 4 | 0 / 0 / 4 | PASS (2 of 4 valid, as above) |
| 3.7b | C | 2 / 2 / 0 | 2 `TMUX_UNREACHABLE` with Try again / 0 / 2 after Try again | PASS |
| 3.7b | Eb | 2 / 0 / 2 | 0 / 0 / 2 | UNREADABLE at both, as above; sampler 0 and 0 at both |
| 3.7b | Ea | 2 "Session not found." | 2 "Session not found." | FAIL at both, as above (unmount 7.5 to 7.7 s at both) |
| 3.7b | Ec | 1 / - / 0, quit 2,029 ms | 0 / - / 0, quit 1,767 ms | PASS |
| 3.7b | D | 1 / 1 / 0 | 0 / 0 / 1, drawn 3,101 ms after the mount | PASS |

---

## 14. As built (the integrator, 2026-09-30, at `ca92d282` plus the working tree; no Electron launched, no probe run)

### Files

| Role | Files |
| --- | --- |
| Builder A | `src/main/machines/create-inflight.ts` (new), `src/main/machines/remote-sessions.ts`, `src/main/machines/remote-copy.ts`, `build/assert-bundle-refusals.mjs` (`machine.attach-not-heard`, `MACHINE_REFUSALS` 52 -> 53), `src/main/machines/__tests__/p326-inflight-create.test.ts` (new, 49 tests) |
| Builder B | `src/main/sessions/far-attach.ts` (new), `src/main/sessions/core.ts` (the five edits of §4.5), `src/main/sessions/__tests__/p326-far-attach.test.ts` (new), `src/main/sessions/__tests__/p326-attach-far-unbound.test.ts` (new) |
| Builder C | `build/conformance-farattach.mjs` (new), `build/p326/ablation.mjs` (new), `build/p326/probe-p326.mjs` (new), `build/p326/far-tmux.sh` (new, 755), `build/hidden-agents.mjs` (new), `package.json`, `build/verification-checks.mjs`, `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 155 -> 156), `CLAUDE.md`, `CHANGELOG.md` |
| Integrator | `build/scan-source.mjs` (one statement reader), `build/conformance-farattach.mjs` (imports it), `docs/audits/contract-baseline.txt` (line 562), `CLAUDE.md` (the probe row's second cell), this section |

`pane-env-rescue.ts`, `seedUnconfirmedCreates`, `rescueUnclaimed`, the create argv, its stamps, the Phase 187 loop, `state.rows`/`state.snapshotAt`, `scrollTarget`, `killSessionAdmitted`, the renderer and the barrel are byte-identical to `ca92d282` (D11).

### Where it differs from §1 to §11, and why

1. **`RemoteCreateFlight.leftToRescue()`** (A; not in §4.1). `remoteCreate` calls it when the `@gmux-id` stamp did not land, directly after the `if (idStampLanded) clearIssuedRemoteId(...)` line. It takes the `$-id` out of `beingBound` at once; the flight stays live, owned and awaited until the `finally`. Without it §4.2 regresses a case against the parent: the create's own list (`startMachineFeed`) runs inside the flight, skipped its own unstamped session as being bound, the rescue never ran, and the create threw "could not find a session" for a running session, where the parent's own list rescued it and the create returned. §6's two stamp-failure expectations contradicted each other under §4.2; both are now tested.
2. **`resetRemoteSessionsForTests()` also calls `resetRemoteCreateFlightsForTests()`** (A), outside every 320.1 region, because a remembered flight (20 s, tie to the flight) otherwise leaks into the next test's pass.
3. **D4 step 2 waits on a create only while budget remains** (B). With nothing left `awaitRemoteCreateSettled` answers `timeout` at once and the loop would spin without yielding to a timer.
4. **`gate:contract` moves one line, and §9.2 was wrong to say it would not.** `build/contract-inventory.mjs` counts the ids in `MACHINE_REFUSALS`, so D6's pin moves `docs/audits/contract-baseline.txt:562` from `machines=52` to `machines=53`. Regenerated with `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt`; the diff is that one line. No channel, code, key, environment name or schema moved. The commit body must name the line and the pin (CLAUDE.md obligation 3; Phase 144's `1508c6cd` is the precedent for a refusal pin moving this count).
5. **One statement reader** (integrator, the duplicated-block scan). `conformance-farattach.mjs` carried a 22-line copy of `scan-source.mjs`'s private `statementFrom` loop. It now lives once in `scan-source.mjs` as `statementStop`, with `statementEnd` (exported, the gate's index answer) and `statementFrom` (unchanged text answer) over it. Proved by a differential run of the original files against the new ones over 2,918 files under `src/` and `build/`: `namedFunctions` 2,918 of 2,918 equal, `functionBodyOf` 13,585 of 13,585, `statementEnd` 387,437 of 387,437 offsets.
6. **CLAUDE.md's probe row said "the same paths"**, which in the probe table reads as `probe:p321`'s. It now says "the paths `conformance:farattach` names".
7. **The probe's own decisions** (C), each stated in its header: `machines.json` written once before launch 1 (rewriting it drops an accepted far version); arm D clicks the tab first and uses `openRemote` only as the fallback (`openRemote` waits for sign-in, so the pane would mount after the first list and D would be unreadable by construction); arm C's 6 to 9 s window is timed on the refusal's log line, because while the row reads `unknown` the pane's "Machine unreachable" branch outranks the attach-error overlay (`TerminalPane.tsx:824-838`), and the overlay and the Try again click are graded separately; Ea is exempt from the "no longer exists" title check because its session really does not exist.

### Duplicated blocks left, with the reason

The scan (10 normalised lines, comments and blank lines dropped, every new and changed file against all of `src/` and `build/`) found three more families. None was extracted: the `vi.mock` factories in `p326-inflight-create.test.ts` repeat `remote-sessions.test.ts`'s exec-plane and control-client fakes, which are hoisted and file-local by vitest's design and already repeated in five sibling files; a 16-line `feedRow` fixture in the two new sessions test files, with different constants; and the probe's DevTools lookup and fiber walk, the house pattern ~14 probes copy, attributed to `probe-p320.mjs` as §8 asks.

### Commands (all in `/private/tmp/wt-p326`, after the last source edit unless marked)

| Command | Exit | Reading |
| --- | --- | --- |
| `npm run -s typecheck` | 0 | 0 import-boundary violations over 1,379 files; 0 runtime cycles over 1,376 files and 4,740 edges |
| `vitest run` the three p326 files plus `remote-sessions`, `remote-close`, `remote-lifecycle`, `pane-env-rescue` | 0 | 7 files, 254 tests |
| `vitest run src/main/machines src/main/sessions src/main/attach` | 0 | 114 files, 2,613 tests |
| `npm run -s conformance:farattach` | 0 | 11 rules green in 63 ms |
| `npm run -s ablation:p326` (after the import change) | 0 | 24 of 24 arms red on their owner only; the three behaviour arms red in vitest; 7.7 s |
| `node build/p326/probe-p326.mjs --self-test` | 0 | 52 fixtures |
| `npm run -s conformance:machines` / `conformance:remoteclose` / `conformance:manager` / `conformance:handback` | 0 / 0 / 0 / 0 | PASS; 11 of 11; 58 rules, 2,310 checks; PASS |
| `npm run -s gate:knownhosts` / `gate:checks` / `gate:electron` / `gate:background` / `gate:simulator` | 0 each | 156 helper users against a floor of 156 |
| `node build/contract-inventory.mjs --check` before the re-baseline | 1 | `- 562: machines=52` `+ 562: machines=53`, nothing else |
| `npm run -s gate:contract` after it | 0 | byte for byte |
| `npm run -s build` | 0 | 33 s; `[refusals] 53 machine confirm-gate refusals are in out/main/index.js`; the sentence is in the bundle |
| `npm test` | 0 | 1,020 files passed, 1 skipped; 17,625 tests passed, 7 skipped |
| scan-source consumers: `conformance:save`, `shellenv`, `semantic`, `evidence`, `containment`, `logins` | 0 each | unchanged |
| `npm run -s conformance:pathdoors` | 1 | rule 5, `src/main/pocket/ipc.ts names shell.open*`. **Red at `ca92d282` too** (the same gate over a `git archive ca92d282` tree: exit 1, the same finding). Phase 330's file; not this phase's |

**Not run.** `npm run package`: `electron-builder --mac` looks up a signing identity in his keychain, which this run's rules forbid; the bundle's refusal pin, the part of it this phase moves, already ran inside `npm run build`. No Electron, no smoke and no probe: the verifier's, under the lock.

### Open concerns for the verifiers

1. **`leftToRescue` has no live arm.** `far-tmux.sh` can hold the `@gmux-id` stamp but not fail it. A hostile rule that exits non-zero on `set-option … @gmux-id` should show the create returning and the session drawing at both builds, with the rescue's `show-environment` once.
2. **An older list can still overwrite the newest (`:2614`, §9.7).** A list issued inside the window and answered after the create's own list moves the new row to `gone` as `restorable`; the being-bound skip stops the count and the rescue, not that. The attach still reaches the right `$-id` through the immediate branch, but the pane may read "Ready to restore" until the next pass, at both builds. Look for a new create whose status sequence reads `restorable` after `running`.
3. **Deferral delays Phase 117's rescue of another id on the same machine** while a create's `new-session` is unanswered, bounded by that exec's timeout. `smoke:p117` is the check.
4. **Remove during the wait** (§9.5's own attack): the record is tombstoned, not deleted, so `recordExists` stays true; the wait asks one list and answers `absent` unless the pane's detach moved the ticket first. Either way nothing may spawn.
5. **The 7,000 ms bound is chosen, not measured**; Step 0's slowest settle checks it against 2,333 ms.
6. **Rebase.** 320.1 (`/private/tmp/wt-p3201`, read only) edits `core.ts` and `remote-sessions.ts` in hunks that do not overlap this phase's, and its `scrollTarget` asks `remoteRecordOf`/`isRemoteRecord`, so FA8 should stay green after it. 323 edits `core.ts`'s imports at `:469`, fields at `:696` and `killSessionAdmitted`; no overlap. `HELPER_USER_FLOOR` and the shared tables reconcile by adding both sides.

### The fix round (2026-09-30, after the attack lens's needs_work and the parent lens's approval; no Electron launched)

The fix ran once. The attack lens answered needs_work with one major, three minors and two nits; the parent lens
answered approved with two minors and three nits. Every major and minor is below with what was done. **The part that
made a scenario worse than today was REMOVED, not repaired**, on his rule.

#### What was removed: the deferral (D2's second bullet)

The attack lens measured one scenario worse than the parent. While any create on a machine waited for its
`new-session` answer, `onePass` deferred every never-probed unstamped row there, and that included another session
of this run whose own create had lost its answer. Its rescue waited for the other create's answer. The parent bound
it in 213 to 504 ms whatever the hold, and HEAD took 1,757 to 2,003 ms behind a 1.5 s hold and 4,259 to 4,441 ms
behind a 4 s hold. The same arm caused the tie (the attack lens's second minor). A waiting attach's own list, issued
in the millisecond an unanswered create ended, deferred the very session that attach was waiting for, and it
answered Try again for a running session in 9 of 10 trials.

Removed, in these places:

- `src/main/machines/create-inflight.ts`: `RemoteCreateFlights.awaitingAnswer` is gone. `remoteCreateFlightsFor`
  answers `beingBound` and `owns` only. The header has a section on what a flight does NOT do before the machine
  answers.
- `src/main/machines/remote-sessions.ts` `onePass`: the deferral arm and its `deferred` count are gone. The unstamped
  block is the parent's text plus the one `beingBound` skip, and `rescuePending` is `unclaimed.length > 0`, as at the
  parent. So a row read before any create here had its answer is counted and handed to Phase 117's rescue exactly as
  today. The rescue binds a create's own session by the id its pane environment carries, which the create issued
  before `new-session` was sent.
- **What stays**:
  - the `$-id` skip after the answer (D2's first bullet);
  - `leftToRescue`;
  - the three D3 narrowings (write-back, drop, status);
  - the far attach (D1, D4 to D8).

  None of these measured worse at either lens.
- **The cost, stated.** A list that runs over there after `new-session` and is parsed BEFORE the create's own answer
  is parsed counts the new session as not created by Tortie, and the rescue re-stamps it mid-create, as at the
  parent. The attach is unaffected: it is far, it waits, and the rescue's own re-list gives it the row. On loopback
  this sub-window is predicted to be rare but it is not measured, because the build's deferral hid it. `probe:p326`'s
  header states it under F.

#### Each problem, and what was done

| Lens, severity | Problem | Done |
| --- | --- | --- |
| attack, major | The deferral held back another lost-answer session's rescue behind a waiting create | **Removed** (above). New vitest `THE REGRESSION THE FIX ROUND REMOVED: another lost-answer session of this run is rescued while a create waits on its answer`: bound in the same pass, `show-environment` of `$8` once. The old deferral tests were rewritten to the parent's handling: `while a create waits on its answer, counts and probes…`, `a pass holding an unprobed row… stays rescue-pending`, `handles the row as the parent does for a list issued before an unanswered create ended…`, `before the answer: the new session is counted and rescued as at the parent…`. |
| attack, minor | The tie: an ended unanswered flight still counted as awaiting, so the attach's own list deferred its own session | Gone with the deferral: no pass reads `awaitingAnswer`, and nothing may again (FA6). New behaviour test, `LENS 1, THE TIE`: a real `remoteCreate` loses its answer AND its confirmation while a pane's `awaitFarBinding` (the shipping `defaultFarAttachDeps`) waits on it, with the clock frozen so the end and the attach's list share a millisecond. The verdict is `row` with `$4`, bound by one `show-environment -t $4`. |
| attack, minor | With the flights judged by the parse instant (their X5), every vitest row stayed green | New vitest `LENS 1 X5`: the list is issued at t, the create ends at t+300, the parse is at t+600. It asserts foreign 0, no `show-environment`, no `noteRemoteRowSeen` for the create's row, and the status column still `running`. New ablation arm **A25** (`remoteCreateFlightsFor(machineId, Date.now(), …)`) turns FA6 red and 1 of 53 inflight rows red. |
| attack, minor | The entry and §9.5 took "a list inside the window" as the mechanism | §9.5 corrected in place: grade on the pane mounting before the create's own list (live, the rescue's `show-environment` of the new `$-id`). The entry's sentence is in "What the entry got wrong" below. `docs/BACKLOG.md` is not a file this round may edit, so the committer's docs pass carries it. |
| parent, minor | `probe:p326` could not exit 0 at HEAD on a full run, for four reasons | (1) **Eb**: the page kit's new `freeze(name)` stops the aloneness record at the switch, because the away tab's session comes on screen BECAUSE of the switch. (2) **Ea**: the 7,000 ms unmount grade is gone. The constant is now `EA_WAIT_MS`, a wait and not a grade. Ea grades: never drawn (the stranger's prompt says `p326`), any refusal SESSION_NOT_FOUND and never the local sentence, the id leaves the list, no `set-option`, `attach-session` or `kill-session` on the stranger, at most one `show-environment` of it PER LAUNCH (`strangerReadsPerLaunch`, split at launch 2's start), and the stranger still there at the end. (3) **F**: an arm's baseline is the larger of the last logged count and the far server's unstamped sessions before the first far create plus every stranger planted before the arm began, so Ea's strangers are not a rise in Ec. A stranger planted inside an arm raises nothing. (4) **Ed**: `aloneVerdict`'s before-list excludes the pair, so the second of a pair is readable. Nine new self-test fixtures (52 at the integrator, 59 now), each rule proved both ways. |
| parent, minor | `probe:p320` R1 and `probe:p95` were not run at HEAD (the lock was held past 180 minutes) | Not done here: the fixer launches no Electron. It stays on the reverify's list. `scratchpad/p326/verifier-parent/run-p320-p95.sh` is ready, but its clone's `out/` is now older than this round's sources, so it must be rebuilt first. |
| attack, nit | §14 concern 4 said a Remove during the wait "asks one list and then refuses with absent" | Wrong. The wait's own list is issued after the Remove, so Phase 187's guard does not drop it. It lists the still-running session, and without the pane's detach the waiting attach SPAWNS (4 of 5 at HEAD). With the detach the renderer sends, nothing spawns (5 of 5). The UI cannot reach it, because `sessionActionGates` offers Remove only for an ended row. Not changed: `removeSession` sits inside 323's `killSessionAdmitted` range (§5). Named for a later round: Remove should invalidate the attach ticket if a Remove of an `unknown` row ever becomes reachable. |
| attack, nit | 7,000 ms is reached on a slow link | No change, as the lens asked. One stamp-fail create took about 11 s at load average about 34, and its waiting attach answered Try again at 7,002 ms, where the parent refused in 6 ms with no Try again. |
| parent, nit | "Machine unreachable" shows for about 92 ms on 23 of 40 HEAD creates while the row reads `unknown` | No change (D9). A later renderer round. |
| parent, nit | The slowest parent settle was 7,858 ms | No change. §13 records it. That create took the immediate branch at both builds. |
| parent, nit | The entry's and §8's Ea grading | Corrected in the probe (above) and below. |

§14's open concern 3 ("deferral delays Phase 117's rescue of another id") is closed by the removal.

#### Gate and test changes

- **`build/conformance-farattach.mjs` FA6.**
  - The `beingBound` skip must be the ONLY way out of the unstamped block before `foreign += 1`. Any other `if` ending
    in `continue` there is named as a deferral, and so is a `continue` in no `if`.
  - Nothing in `remote-sessions.ts` or `create-inflight.ts` may name `awaitingAnswer`.
  - `rescuePending` must be exactly `unclaimed.length > 0`, as at the parent.
  - The header's FA6 text says so.
- **`build/p326/ablation.mjs`.**
  - **A6** now PUTS THE DEFERRAL BACK. It inserts, before `foreign += 1` in `onePass`, a skip of a never-probed row
    while an issued id of the machine is owned by a flight and none is bound. FA6 goes red, and 5 of 53 inflight rows
    go red: the regression, the tie, "before the answer", and both stamp-failure rescues. This was read in a scratch
    clone with the arm applied.
  - **A7** gives `rescuePending` a second term. FA6 goes red.
  - **A25** is new (above).
  - The PASS line counts the behaviour arms rather than saying "three".
- **`src/main/machines/__tests__/p326-inflight-create.test.ts`**, 53 tests.
  - The tests listed above.
  - Two expectations the paused first attempt at this round had left wrong were corrected. "Before the answer" reads
    the count at the rescue's probe (1), because the rescue runs inside the pass and re-lists once it has re-bound a
    row, so the facts read 0 when the pass returns. The tie separates the confirmation's read by exact name
    (`=work`) from the rescue's read by `$-id`.

#### Commands (in `/private/tmp/wt-p326`, after the last source edit)

| Command | Exit | Reading |
| --- | --- | --- |
| `vitest run` the p326 inflight file, as the paused first attempt left it | 1 | 2 of 53 failed, the two expectations above |
| `vitest run` the three p326 files plus `remote-sessions`, `remote-close`, `remote-lifecycle`, `pane-env-rescue` | 0 | 7 files, 258 tests |
| arm A6 applied in a scratch clone, then `vitest run` the inflight file | 1 (as intended) | 5 of 53 red, named above |
| `npm run -s typecheck` | 0 | 0 import-boundary violations over 1,379 files; 0 runtime cycles over 1,376 files and 4,740 edges |
| `npm run -s build` | 0 | 32 s. 53 machine refusals are in the bundle, 156 helper users against a floor of 156, and the contract matches byte for byte |
| `npm test` | 0 | 47 s. Files: 1,020 passed, 1 skipped. Tests: 17,629 passed, 7 skipped |
| `npm run -s conformance:farattach` | 0 | 11 rules green, 68 ms |
| `npm run -s ablation:p326` | 0 | 25 of 25 arms red on their owner only, and 4 behaviour arms red in vitest. 8.1 s |
| `node build/p326/probe-p326.mjs --self-test` | 0 | 59 fixtures |
| `conformance:machines`, `remoteclose`, `manager`, `handback` | 0 each | PASS. remoteclose: 11 of 11. manager: 58 rules, 2,310 checks |
| `gate:knownhosts`, `checks`, `electron`, `background`, `simulator`, `contract` | 0 each | contract: byte for byte |
| `conformance:save`, `shellenv`, `semantic`, `evidence`, `containment`, `logins` (the scan-source consumers) | 0 each | unchanged |

**Not run.**

- `npm run package`, for the integrator's reason (a signing identity lookup in his keychain).
- Every Electron, smoke and probe. They are the reverify's, under the lock.

The reverify re-runs these LIVE:

- the attack lens's lost family (answer lost, and answer plus confirmation lost, with the pane waiting);
- its deferral family, which should now bind during the wait, 213 to 504 ms as at the parent;
- its tie probe;
- a full `probe:p326` at HEAD, which should now be able to exit 0: the Eb, Ea, F-Ec and Ed causes are graded
  differently, and F may name the sub-window stated above;
- `probe:p320` R1 and `probe:p95`, still owed.

#### What the entry got wrong, for the committer's docs pass (the Phase 326 entry in `docs/BACKLOG.md`)

1. **"The verifier's own re-derivation … A refusal outside a window that held a list refutes the mechanism"** is
   wrong in both directions, as §9.5 now says. The refusal condition is the pane mounting before the create's own
   list landed. Live, its mark is a pass reading the new session unstamped, shown by the rescue's `show-environment`
   of the new `$-id`.
2. **E(a) "no `show-environment` … naming the stranger's `$-id`"** is wrong. It is at most one per LAUNCH, because
   the rescue's foreign memo lives for one process. **"within the bound"** is the renderer's own pace: the pane
   unmounted 3.8 to 7.7 s after the mount at both builds. The refusal at both builds is `mustGetSession`'s "Session
   not found.", because the create had taken its row back before the attach began. It throws before any list of this
   Mac's server, so D1 holds.
3. **Mechanism item 2's residual, "measured, not closed"**, was closed by the build and re-opened by this round, on
   his rule. It stays as the parent has it.
