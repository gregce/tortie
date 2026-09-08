# 91. Phase 232, starting measurements

The measure step for Phase 232, the boot and the bulkhead. Taken on 2026-09-08 at the parent
commit `8e5694c3`, in the worktree `/private/tmp/wt-p232`, against the operator's Mac Pro under
Phase 224's bounds exactly, plus the two the later committers added, being that a scratch tmux
socket on EITHER machine is unlinked in the `finally` that kills its server, after `lsof` says
nothing holds it. Nothing here builds anything. It confirms what the charter cites, draws the data
flow, names what the verifier can re-run, takes the parent reading the phase must move, records the
gates green at the parent, and names the files the builder touches and where a rebase may conflict.

The probe that took the reading is `.p232/probe-p232-parent.mjs` with its renderer drive
`.p232/driver.mjs` and its far-side fixture `.p232/far-fixture.mjs`, and the reading is
`.p232/report-parent.json` beside them. Every ssh went through `build/ssh-run.mjs` by way of
`build/real-machine.mjs`, every Electron through `build/electron-run.mjs` on a scratch profile
under the session scratchpad and the scratch socket `gmux-p232-31902` on both sides, no agent was
started, no token was spent, and section 7 counts what was left on both sides, including the one
thing this step got wrong and corrected.

## 1. What the charter cites, read again at the parent

The entry names six places and one document. Four still say what the entry says, two line numbers
have drifted, and one names the wrong component.

| The entry says | What the tree says at `8e5694c3` | Drift |
|---|---|---|
| `signInToConfirmedMachines` at `src/main/sessions/core.ts:1063` walks the rows one at a time, and its own comment says a fleet would otherwise open every connection at once | `private async signInToConfirmedMachines()` is at line 1063; the `for (const row of currentMachines().rows)` loop `await`s each `prepareMachine` in turn; the comment at 1058 reads "Sequential rather than parallel. A person with a fleet would otherwise open every connection at once at launch"; it is called unawaited from `boot()` at 1047 | none |
| each `prepareMachine` holds two version reads at `REMOTE_VERSION_TIMEOUT_MS = 10_000` (`src/main/machines/prepare.ts:89`) | line 89 exactly; `readRemoteTmuxVersion` at 173 to 205 runs `display-message -p '#{version}'` through `execOn` and then `<program> -V` through `execRemoteShell`, each with `timeoutMs: REMOTE_VERSION_TIMEOUT_MS`, the second one in a `catch` that classifies the failure | none |
| a sign-in that fails once at launch (`core.ts:1077`, `markMachineQuiet`) is never retried | the two `markMachineQuiet(row.id)` calls are at 1081 (a result whose class is not `prepared`) and 1095 (a thrown error); nothing in `core.ts`, `prepare.ts`, `remote-sessions.ts` or `control-plane.ts` re-runs `prepareMachine` on a timer or on a link event; `grep -rn prepareMachine src/main` finds the boot call, the `machines:prepare` handler at `ipc.ts:965`, and nothing else | **the line drifted** by four, and there are two sites rather than one |
| `UnreachableBar` at `src/renderer/app/TerminalRegion.tsx:233` onward draws on EVERY tab | 233 is the section comment; `UnreachableBar` is at 256 and draws only when a VISIBLE ROW reads `unknown` (`machineUnreachable(sessions)` at 397, from `status.ts:369`). The bar the photograph carries and section 4 reads, *"Tortie could not reach Unreachable. Sessions you started there are not shown here, and Tortie did not end any of them."*, is `machineSilentText` (`renderer/machines/session-badge.ts:125`) drawn by `MachineSilentBar` at 328, which `RegionBars` at 378 returns at 405 whenever `silent.length > 0`. Both bars take the same `silent` set, computed at 396 as `silentMachines(machineStates)`, which is `link === 'quiet'` over every machine in the file (`state/machines-slice.ts:79`) and nothing about the tab | **the wrong component is named**: the scope has to go on the `silent` set at 396, which feeds `MachineSilentBar` AND `UnreachableBar`'s badges, and the Phase 67 sentence `UNREACHABLE_BAR_TEXT` at 240 stays as it is either way |
| nothing filters by the active tab's machine (research 85, `TerminalRegion.tsx:396`) | `RegionBars` is given `sessions` alone (`<RegionBars sessions={projectSessions} />` at 609) and never sees the project; the active project is in scope four lines above it as `project`, whose `machineId` is the `Project` field at `src/shared/types.ts:522` | none, and the project is already there to hand over |
| the only control that reconnects is Prepare in Settings, and on a project tab there is none | `MachineRow.tsx:653-667`: `data-machines-action="prepare"`, label `BTN_PREPARE` = *"Prepare this machine"* (`settings/machines-copy.ts:211`), disabled when `!row.usable`; the handler at `ipc.ts:956` calls `allowControlPlaneAgain(row.id)` then `prepareMachine` with the label and the key. Section 4 read every `<button>` on three project tabs and found zero matching `/prepare/i`; Settings drew two, both enabled | none |
| research 85 section 4.2's numbers, 19,789 ms and 19,777 ms against 510 ms and 1,280 ms | they are `.p224/results/p224d-run-70334.json`, arms `twoMachinesUnreachableFirst` and `macProAlone`, NOT `probe-p224c.mjs` as section 11 of that document implies: p224c's alone arm rewrote `machines.json` without the write root, which moved the confirm hash, so its two alone launches read `state: "changed", usable: false` and `rowsAfterMs: null` at 90 s. p224d kept the root and is the run the numbers came from | **a probe attribution**, not a tree drift; section 3 says which to copy |

Four things the entry does not say and the builder needs.

**The blackhole does not fail as `unreached` at the parent; it fails as `version-unmeasured`.** This is
research 85 section 4.5's deadline race, and the entry defers it to the nits round, but it decides
what the retry keys on. The A1 launch's log holds exactly these lines for the unreachable row, in
this order: `command on p232-unreachable ended failed` twice, `p232-unreachable reports tmux nothing
at all and this release has measured 3.6a, 3.7b, 3.7c, so nothing was started`, and `[gmux-sessions]
p232-unreachable answered version-unmeasured at launch: The program at /usr/local/bin/tmux on this
machine would not report its version. Tortie will not use a program it cannot identify.` A retry
keyed to `UNREACHED_CLASSES` (`prepare.ts:150-161`) retries nothing at the parent's sentence; a retry
keyed to "the class was not `prepared`" also retries, every backoff step, a machine that genuinely
runs an unmeasured version and answers in 200 ms, which costs two ssh reads a step and starts
nothing. The builder chooses and states which, and the verifier counts retries from the log line the
builder adds, because the only line at the parent is the one above, once per launch.

**`machines.json` has a file watcher, and the retry must not hear it.** `src/main/machines/store.ts`
reads the file at boot, on `machines:reload`, and on a `@parcel/watcher` event after a 300 ms
debounce (its header, lines 1 to 9; `watchStop` at 84). A reload fires `onMachinesChanged`, which
`machine-state.ts:246` folds into the same `onMachineStateChanged` push the renderer subscribes to.
So a retry armed off `onMachineStateChanged`, or off `onMachinesChanged`, or off
`onMachineConfirmationsChanged`, is a retry a file edit can fire, which is refusal 8's line. The
retry subscribes to time and to the link answering, being `noteMachineAnswered` at
`control-plane.ts:276` or `onMachineLinkChanged` at 213, and to nothing that a file moves. The
confirmation, on the other hand, is ALREADY re-read from disk on every ask: `isMachineConfirmed`
(`confirm.ts:640`) calls `machineRowStatus`, which calls `readState()` at 515, which is
`readConfirmRecords` over the record file. The row's six fields come from memory
(`currentMachines()` at `store.ts:154`, "never reads the disk"), refreshed by the watcher. So "re-read
from disk" costs the builder nothing new for the seal, and the attack the charter names, an
execution-bearing field rewritten on disk while the retry is armed, is answered by the existing
check as long as the retry asks `isMachineConfirmed` immediately before each attempt and never caches
its answer.

**The greeting-miss set is not the retry's to clear.** `noControlThisRun` (`control-plane.ts:186`)
is cleared by Prepare through `allowControlPlaneAgain`, which the `machines:prepare` HANDLER calls
and `prepareMachine` itself does not. A retry that re-runs `prepareMachine` directly leaves the set
alone, which is the right shape: Phase 83's one miss per machine per run stays a person's decision,
and the entry says the greeting miss is not touched.

**The p109 source-shape test reads the sign-in's body.** `src/main/sessions/__tests__/
p109-boot-signin-label.test.ts` slices `core.ts` from `private async signInToConfirmedMachines()` to
the first `\n  }` after it and expects `prepareMachine({` … `label: machineLabelOf(row)` inside that
slice. A concurrency helper that moves the call out of that body turns the test red, so the test
follows the call in the same commit.

## 2. The data flow, in ten lines

1. `GmuxCore.boot()` (`core.ts`) calls `void core.signInToConfirmedMachines()` at 1047, unawaited, after the manifest and the local server are up.
2. The loop at 1063 takes `currentMachines().rows` IN FILE ORDER, asks `isMachineConfirmed(row.id, fields)` (which reads the confirm record file), and `await`s `prepareMachine({machineId, fields, tortieHostKeys, label})` for each row before starting the next.
3. `prepareMachine` (`prepare.ts:217`) builds the context, then `readRemoteTmuxVersion` runs `display-message -p '#{version}'` and then `<program> -V` over ssh, 10,000 ms each; at 192.0.2.1 both are killed at the deadline before ssh's own "Operation timed out" lands, so the class is `version-unmeasured`, not `timed-out`.
4. A class other than `prepared` → `sessionsLog.warn(… answered … at launch)` and `markMachineQuiet(row.id)` (`remote-sessions.ts:2702`) → `applyMachineEvent({kind: 'transport-lost'})` and `noteMachineQuiet(id, 'did not answer the last time Tortie asked')` (`control-plane.ts:286`) → `setLink('quiet')` → `announceLink()`.
5. `prepared` → `ensureRemoteServer` starts the far server on the scratch socket, `startMachineFeed` (`remote-sessions.ts:2789`) notes `connecting`, opens the control plane, arms the timer, and `pollRemoteMachine` → `noteMachineAnswered` → `setLink('connected' | 'polling')`.
6. Only then does the loop move to the next row, so with the blackhole first the Mac Pro's link still reads *"has not been signed in to in this run"* at 1.6 s (section 4, `statesAtStart`), and reads `connected` at 20 s.
7. `machine-state.ts` folds each row's confirm status and link facts into `MachineStateView` and pushes the whole list on any of THREE events: link change, machines file change, confirmation change.
8. The renderer's `applyMachineStates` (`state/subscriptions.ts:795`) stores it; `silentMachines` (`machines-slice.ts:79`) is the `link === 'quiet'` filter.
9. `TerminalRegion` renders `<RegionBars sessions={projectSessions} />` at 609 for the active project and `<MachineStatement />` with no project (533) and on the first-run board (`App.tsx:322`); `RegionBars` computes `silent` at 396 from the store with no project in hand and returns `MachineSilentBar` at 405, so every tab draws the same bar.
10. Each remote sidebar composes its own sentence for a quiet machine from `renderer/machines/*.ts` (`remoteTreeNotConnected` at `explorer.ts:49`, `remoteChangesUnreachable` at `scm.ts:140`, and the History, Branch, Runs, Search, Context siblings); none of them, and nothing else on a project tab, offers `machines.prepare`, which the bridge already carries and Settings alone calls.

## 3. What the verifier can re-run from `.p224`, and what not to

- **`.p224/probe-p224d.mjs`, arms A and B, with `bootReadingDriver` from `.p224/driver2.mjs`**, is the reading research 85 section 4.2 published, and `.p232/probe-p232-parent.mjs` is that probe with three additions: a row for the unreachable machine planted into the scratch profile's `manifest.db` between launches (because `projects:addRemote` refuses a machine that is not connected, read again here at 1 ms), the bar read off three tabs and the blackhole tab's two sidebars and Prepare actions read through `.p232/driver.mjs`, and a 75 s hold on the first two-machine launch so a retry could show in the states and the log. Run it at HEAD unchanged for the after reading; `P232_HOLD_MS` sets the hold and `P232_SCRATCH` the run directory.
- **Do not copy `.p224/probe-p224c.mjs`'s arm D** for the alone reading: it rewrites the file without the write root and reads `changed`. **Do not copy `.p224/probe-p224b.mjs`'s arms C1 and C2** for the boot reading: its `bootDriver` read `rowsAtMs: null` at 122 s in both arms of the recorded run, so it measured nothing.
- **`.p224/blackhole.mjs`** takes the raw ssh reading against 192.0.2.1 through `build/ssh-run.mjs` (10,011 ms, "Operation timed out" in the recorded run) and is the one place the 11 ms race in section 4.5 can be re-measured; the nits round's, not this phase's.
- **`.p224/far-final.mjs`** is the closing count and `.p232/far-sockets-check.mjs` is the socket unlink with the correct `lsof -a -U` form (section 7 says why it exists).
- **The attack on the retry's bounds has no `.p224` ancestor.** It is new: an execution-bearing field of the unreachable row rewritten on disk while the retry is armed (the watcher will reload the row in 300 ms, which is the trigger the retry must ignore and the hash the next attempt must refuse); a `machines.json` edit with nothing else changing; and the backoff driven past its cap. With a cap of five minutes and no knob, driving past the cap is a launch held longer than the cap plus every step below it; a harness knob that scales the backoff is one `GMUX_*` env name and moves `gate:contract` by one line.
- **`src/renderer/app/remote-boot-drive.ts`** injects a fake machine and a fake tab into the running renderer (`window.__gmuxRemoteBootProbe`) and can read the bar's scoping WITHOUT a second machine, by moving one injected machine's link through `quiet` and `connected` and reading `.unreachable-strip` on the injected tab, the real remote tab and the local tab; it is the cheap arm, and the real-machine drive above is the proof.

## 4. The parent reading

`.p232/report-parent.json`, taken at `8e5694c3`, one profile, six launches one at a time. The
scratch profile carried two rows in `machines.json`, `p232-unreachable` at 192.0.2.1 FIRST and
`greg-s-mac-pro` second, both confirmed through the real Settings buttons (2 confirm presses), the
Mac Pro given the scratch repository as its write root exactly as p224d did, both prepared once
from the add launch (`class: prepared`, "Tortie started the program at /usr/local/bin/tmux on this
machine"), and three project tabs: the local fixture, the Mac Pro's `tortie-p232-scratch-31902`,
and `p232-nowhere` on the unreachable machine, the last one planted as a `remote_projects` row
because `projects:addRemote` answered `{ok:false, reason:"notConnected"}` in 1 ms.

### 4.1 The number the phase must move

| `machines.json` | Source control's first row on the Mac Pro tab, renderer clock from the drive's start | research 85 |
|---|---|---|
| the unreachable machine first, then the Mac Pro, launch 1 | **20,043 ms** (6 rows) | 19,789 ms |
| the unreachable machine first, then the Mac Pro, launch 2 | **20,051 ms** (6 rows) | 19,777 ms |
| the Mac Pro alone, launch 1 | **108 ms** (6 rows; the link read `connecting` when the drive started) | 510 ms |
| the Mac Pro alone, launch 2 | **205 ms** (6 rows) | 1,280 ms |

Both two-machine readings are two version reads at the 10,000 ms cap, and the machine states say
where the time went: at 1.6 s after the drive started, BOTH rows read `quiet` with *"has not been
signed in to in this run"*, which is the Mac Pro's sign-in not yet started; at the moment the rows
landed the blackhole read `quiet` with *"did not answer the last time Tortie asked"* and the Mac Pro
read `connected`. `listFiles` on the Mac Pro answered `repo`, 26 paths, in the same launch, so the
machine itself was never slow. The wall time of the launch that held for 75 s was 106 s; the second
two-machine launch, with no hold, 34 s; the alone launches 7.4 s and 7.6 s.

### 4.2 The bar, on three tabs

Read as `.unreachable-strip` innerText after selecting each tab, identical on both two-machine
launches:

| Tab | The bar |
|---|---|
| the Mac Pro's tab, connected | *"Tortie could not reach Unreachable. Sessions you started there are not shown here, and Tortie did not end any of them."* plus the `Unreachable` badge |
| the local tab | the same sentence and badge |
| the unreachable machine's own tab | the same sentence and badge |
| the Mac Pro alone, both tabs | no bar at all |

So the parent draws one machine's failure on every tab including this Mac's, exactly as research
85 section 4.3 photographed, and the `MachineSilentBar` path is the one that does it (section 1).

### 4.3 The unreachable machine's own tab, and what it offers

Source control: *"p232-nowhere / CHANGES / Unreachable did not answer, so Tortie could not read what
changed. / HISTORY / BRANCH / RUNS"*. Explorer: *"Tortie is not connected to Unreachable, so it
cannot read that folder."* Buttons whose label or text matches `/prepare/i`: **0** on the
unreachable tab, **0** on the Mac Pro's tab, and `document.body` does not contain *"Prepare this
machine"* on either. The Settings window on the same profile drew **2** *"Prepare this machine"*
buttons, both enabled. Behind the face, main's own refusal for the Source control read on that tab
went to the log as `machines:reviewFiles` → `INVALID_INPUT` *"Tortie has not signed in to that
machine yet, so it cannot start a session there. Open Settings and then Machines, and prepare it.
Nothing was started."*, which is a sentence that names the door and a sentence nobody sees; the
face's sentence names no door, and mechanism 4 is what puts the action there.

### 4.4 The retry that does not exist

The first two-machine launch was held 75,004 ms after the rows landed. The blackhole's state before
and after the hold is byte identical: `link: quiet, everAnswered: false, lastAnsweredAt: null,
detail: "Unreachable did not answer the last time Tortie asked."`. The launch's log carries the
unreachable row's sign-in lines exactly ONCE, being the two `command on p232-unreachable ended
failed`, the `reports tmux nothing at all … so nothing was started`, and the one `[gmux-sessions]
p232-unreachable answered version-unmeasured at launch` line, and no second attempt in the 95 s the
app was open after the first. The Mac Pro's `lastAnsweredAt` moved from 1788853697207 to
1788853777238 across the hold, so the feed was polling and the log was live; the blackhole simply
had nothing scheduled. **This is the count the phase must move from 0, and the class it must
decide about is `version-unmeasured`, not `timed-out`.**

### 4.5 One thing read on the way that is not this phase's

The Mac Pro's Explorer on the two-machine launches read *"EXPLORER / Read at 03:48. Press Refresh
to read it again."* with an EMPTY tree under the header, while `listFiles` on the same folder
answered 26 paths in the same second. That is the Phase 90.3 race research 85 section 4.1 and
Phase 230's measure step (research 89) already own, being a tree read issued before the link was
up; it is recorded here because a verifier reading the Mac Pro's face at HEAD will see it and must
not book it to this phase.

## 5. The gates at the parent, run to logs

All under `.p232/logs/`, run one after another at `8e5694c3` before the probe so the timings were
not shared with an Electron; `gates-index.txt` has the start and end of each.

| Gate | Log | Result |
|---|---|---|
| `npm run typecheck` | `typecheck.log` | green, 11 s: 1196 production files, 6707 imports, 0 boundary violations |
| `npm run build` | `build.log` | green, 22 s: every build assertion OK, `contract-inventory` byte identical to `docs/audits/contract-baseline.txt` |
| `npm run conformance:machines` | `conformance-machines.log` | green, 1 s: *"PASS. A machine confirmation is bound to the six fields that decide what runs, to the prefixed id, and to nothing else. Nothing was started by this gate."* |
| `npm run conformance:remoteclose` | `conformance-remoteclose.log` | green, 1 s: 11 tests, 1 file |
| `npm run gate:knownhosts` | `gate-knownhosts.log` | green, under a second |
| `npm run smoke:t1` | `smoke-t1.log` | green, 27 s: 5/5 create, 6/6 verify |
| `npm run probe:controldeadline` | `probe-controldeadline.log` | green, 36 s: PASS, greeting timeouts 0 on the healthy arm, every registration read back, the forced-failure child exited with nothing left behind |

The baseline holds 37 `machines:` channels at the parent (`docs/audits/contract-baseline.txt:118`
onward), and `HELPER_USER_FLOOR` in `build/assert-electron-teardown.mjs:156` is 89.

## 6. The smallest set of files the builder must touch

### 6.1 The files

| File | Why |
|---|---|
| `src/main/sessions/core.ts` | `signInToConfirmedMachines` at 1063: the loop becomes a bounded pool of four over the confirmed rows, keeping the per-row `isMachineConfirmed` ask, the label, and the two `markMachineQuiet` sites; the boot call at 1047 stays unawaited; the comment at 1058 is rewritten because it will be false |
| a new module under `src/main/machines/`, the retry (name is the builder's) | the backoff capped at five minutes, armed by time and by `onMachineLinkChanged` / `noteMachineAnswered` in `control-plane.ts`, never by `onMachinesChanged` or `onMachineConfirmationsChanged` (section 1); asks `isMachineConfirmed` from `confirm.ts:640` immediately before each attempt; calls `prepareMachine` with the same four inputs the boot call passes and without `allowControlPlaneAgain`; owned by the ordered disposer in `src/main/capabilities.ts` so a quit cancels the timer; one log line per attempt naming the machine, the attempt number and the delay, which is what the verifier counts |
| a test beside it under `src/main/machines/__tests__/` | pins the three refusals, being a row whose confirmation does not hold, a file event as a trigger, and the cap, and goes red on each |
| `src/main/sessions/__tests__/p109-boot-signin-label.test.ts` | follows the `prepareMachine({` call if the pool moves it out of the method body |
| `src/renderer/app/TerminalRegion.tsx` | `RegionBars` at 378 takes the active project's `machineId` (in scope as `project` at 530); the `silent` set at 396 is filtered to that machine on a project tab and to none on a local tab; `MachineStatement` at 373 and the first-run mount in `App.tsx:322` stay global because there is no tab to scope to; `UNREACHABLE_BAR_TEXT` at 240 and `machineSilentText` do not move |
| `src/renderer/app/__tests__/unreachable-presentation.test.tsx` | the four `RegionBars … silent={[QUIET_STUDIO]}` cases at 280 to 330 pin the global bar and gain a project machine each; `machine-badge.test.tsx` reads the badge alone and should not move |
| the seven sentence composers in `src/renderer/machines/` (`explorer.ts:49`, `scm.ts:140`, `history.ts`, `branch.ts`, `runs.ts`, `search.ts`, `context.ts`) and the sidebars that draw them (`tree/FilesSection.tsx:333`, `scm/ScmSection.tsx`, `scm/RemoteHistorySection.tsx`, `RemoteBranchSection.tsx`, `RemoteRunsSection.tsx`, `search/`, `context/`) | mechanism 4: the disabled-machine sentence carries ONE action, a button labelled `BTN_PREPARE` from `settings/machines-copy.ts:211` that calls `window.gmux.machines.prepare(project.machineId)`, the channel Settings already uses; the smallest shape is one component drawn by every sidebar's refusal branch rather than seven buttons, and the operator's rule bounds it to the label and nothing else |
| `build/probe-p232-*.mjs` if the app run is promoted under `build/` | `HELPER_USER_FLOOR` 89 → 90 in the same commit; `gate:knownhosts` and `gate:background` scan it; a backoff knob for the verifier, if one is added, is one `GMUX_*` name and the commit regenerates `docs/audits/contract-baseline.txt` and names the line |

No channel: `machines.prepare` and `machines.state` are on the bridge already, and the 37 stay 37
unless the knob above is added. `REMOTE_VERSION_TIMEOUT_MS` at `prepare.ts:89` is not touched. Nothing
under `src/main/machines/prepare.ts`, `remote-server.ts`, `exec-plane.ts` or the tmux layer moves.

### 6.2 Where a rebase may conflict

- **Phase 230** (`/private/tmp/wt-p230`, at `7e2236dc` with its measure doc committed and a clean
  tree when this was written) is queued to touch `src/renderer/tree/FilesSection.tsx`,
  `src/renderer/scm/ScmSection.tsx`, `RemoteHistorySection.tsx`, `RemoteBranchSection.tsx`,
  `RemoteRunsSection.tsx`, `src/renderer/search/store.ts`, the Context read, and EVERY "did not
  answer" sentence in `src/renderer/machines/history.ts`, `branch.ts`, `runs.ts`, `scm.ts`,
  `search.ts`, `context.ts` and `explorer.ts`, which it rewrites to say what is on screen and when
  it was read. **Those are exactly the seven places mechanism 4 puts its action.** Whichever lands
  second rebases the refusal branches; the safe order is the sentence first (230) and the action
  beside it (232), and if 232 lands first its action must be one component the 230 rewrite can keep.
- **Phase 231** (`/private/tmp/wt-p231`, at `41405d73`, its measure doc `docs/research/90` untracked,
  clean tree) is queued to touch `src/main/machines/control-plane.ts` (the `LinkRecord` gains a
  second fact), `machine-state.ts`, `remote-run.ts`, `remote-copy.ts` and `remote-sessions.ts`'s
  `markMachineQuiet`. The retry hooks `control-plane.ts`'s `noteMachineAnswered` /
  `onMachineLinkChanged` and reads `markMachineQuiet`'s outcome, so if 231 splits the link fact from
  the feed fact first, the retry arms off the LINK fact and not the feed; if 232 lands first, 231's
  split keeps the link event the retry listens to. Say so in the commit body whichever lands second.
  Neither phase touches `core.ts` or `TerminalRegion.tsx`.
- **Phase 235, the nits round** (queued, no worktree) rewrites research 85 section 4.5's sentence,
  after which the blackhole's launch class becomes `timed-out` rather than `version-unmeasured`. A
  retry keyed to the class sees a different class after 235; a retry keyed to "not prepared" does
  not. Section 1 asks the builder to state which.
- **Phase 227** landed at `8e5694c3`, which is this parent; **228** at `b53e665`, **229** at
  `2202fae`; no worktree among them carries uncommitted work. **233** and **234** touch
  `remote-scripts.ts`, `use-tree-model.ts`, `RemoteHistorySection.tsx` and `src/main/arch/`; only
  `RemoteHistorySection.tsx` is shared, at its refusal branch.
- Last movers: `core.ts` by `e85b647a`, `prepare.ts` and `machine-state.ts` and `machines-slice.ts`
  by `1bff0451` (Phase 101), `TerminalRegion.tsx` by `6efbf860`, `control-plane.ts` by `069ef77c`
  (Phase 217), `remote-sessions.ts` by `87e55331` (Phase 187, which carries the
  `conformance:remoteclose` rule), `FilesSection.tsx` by `77a94409` (Phase 228).

## 7. What this step did on his machines, counted before and after

**Far side, his Mac Pro.** Sessions on `-L gmux`: ONE before and ONE after, `gmux-control created
1787879931 attached 1` (27 August), listed and never named on any other verb. Processes carrying
`tmux`: the bundled server pid 1041, up 11 days, and his own `/usr/local/bin/tmux -L gmux -C
new-session -A -s gmux-control` client pid 93072, before and after, and no process of this step.
Every write went into `/Users/gdc/tortie-p232-scratch-31902`, made by `.p232/far-fixture.mjs` with
its identity set by `GIT_AUTHOR_*` environment inside the script and never `--global`, and removed
in the `finally` (`GONE`); `ls -d /Users/gdc/tortie-p232-scratch-* /Users/gdc/tortie*
/Users/gdc/p232*` answers `NONE`. `~/.ssh` there holds `authorized_keys` alone, 88 bytes from 18
August, no `known_hosts`; `~/.gitconfig` 140 bytes from May 2024; neither written. The scratch
server on `gmux-p232-31902` was killed in the `finally` (`gone`).

**The one thing this step got wrong, and the correction.** The probe's `finally` asked `lsof -U -Fp
<socket>` before unlinking each scratch socket. `lsof` ORs its selections unless `-a` is given, so
that command listed every process on the machine holding ANY unix socket, the probe read `HELD` on
both sides, and it left `/private/tmp/tmux-501/gmux-p232-31902` behind on the Mac Pro and on this
Mac, which is exactly the leaving the bound was written to stop. `.p232/far-sockets-check.mjs` asked
the question properly (`lsof -a -U -Fp`), read no holder on either side, and unlinked exactly that
one name on each, refusing any other; its log at `.p232/logs/far-sockets-check.log` reads the far
socket directory as `gmux gmux-p232-31902` before and `gmux` after, the local one the same, and
`gmux-control` listed before and after. The probe carries the corrected form now, so the verifier's
run does not repeat it.

**This Mac.** `-L gmux`: 13 sessions before and 13 after, only ever listed. `/private/tmp/tmux-501`
holds `gmux` alone at the end. Tortie's own `known-machines` 113 bytes and `~/.ssh/known_hosts`
2,215 bytes, `identityFilesUnmoved: true`. ssh agent: no identities before and after. His real
machine row and `~/Library/Application Support/Tortie` were never opened; the scratch profile lives
under the session scratchpad at `…/scratchpad/p232-run-31902/profile` with its own `machines.json`,
confirmations, `known-machines` and `manifest.db`. Electrons counted once at the end with the
command CLAUDE.md gives: **11 before and 11 after**, being his own running Tortie from
`/Users/gdc/gmux/node_modules/electron` (the bare `Tortie` main pid 83249 and its three helpers) and
the crashpads of Chrome (two), Screen Studio, Tortie.app, Granola and Slack; none on a p232 profile;
the six launches were ended one at a time by `withElectron`. No agent was started, no token spent,
nothing installed on either machine, nothing under `/Users/gdc/gmux` read for writing, staged, reset
or committed.

## 8. What was not measured

- **`UnreachableBar` proper**, the Phase 67 bar for a VISIBLE row reading `unknown`. It needs a
  remote session row on a machine that then goes quiet, and this step created no session anywhere.
  The scoping fix touches the `silent` set both bars share, so the verifier reads that bar through
  `remote-boot-drive.ts` or a manifest row rather than a real session.
- **The wake path.** A `GMUX_SHOT` launch registers no resume listener (research 90 section 1), so
  `remoteMachinesWoke` marking every machine quiet, which is a moment the retry would meet, cannot
  be driven at the parent.
- **A fleet of more than four**, which the cap exists for. Two rows were driven.
- **The time from launch to the first row on a wall clock.** The reading is the renderer's own
  clock from the drive's start, which began about 1.6 s after `performance.now()` zero in every
  launch; the wall times of the launches are in the report beside it.
- **Anything on a Linux far side.** One arm64 Mac over Tailscale, 26 files, six commits.

## 9. The builder's reading at HEAD, taken with the same probe unchanged

Taken on 2026-09-08 at `376cfd69`, the fourth of the phase's commits, with
`.p232/probe-p232-parent.mjs` run exactly as section 4 ran it and the report
kept as `.p232/report-head-builder.json`. It is the builder's own check and
not the verifier's proof, which the entry asks for at the parent and at HEAD
in one window each.

| `machines.json` | Source control's first row on the Mac Pro tab | section 4.1 |
|---|---|---|
| the unreachable machine first, then the Mac Pro, launch 1 | **0 ms** (6 rows; the link read `connected` when the drive started) | 20,043 ms |
| the unreachable machine first, then the Mac Pro, launch 2 | **109 ms** (6 rows) | 20,051 ms |
| the Mac Pro alone, launch 1 | **111 ms** (6 rows) | 108 ms |
| the Mac Pro alone, launch 2 | **153 ms** (6 rows) | 205 ms |

At the moment the rows landed the blackhole still read `quiet` with *"has not
been signed in to in this run"*, being its sign-in still inside the first
version read, and the Mac Pro read `connected`, which is the pool: the two
rows are no longer one behind the other.

The bar, read as `.unreachable-strip` on both two-machine launches: on the
blackhole's own tab, *"Tortie could not reach Unreachable. Sessions you
started there are not shown here, and Tortie did not end any of them."* plus
the badge, exactly as at the parent; on the Mac Pro's tab **none**; on the
local tab **none**. Section 4.2 read the same sentence on all three.

Controls matching `/prepare/i` on the blackhole tab: **one**, `Prepare this
machine`, drawn under the Explorer's sentence and under the Source control
Changes group's sentence, one per view; on the Mac Pro's tab **none**; Settings
still draws its two. The first run read the sentence and the label run
together in `innerText`, because `.btn` is inline-flex, and `27a14d59` put the
button on its own line.

The retry, from the first launch's log, held 75,001 ms after the rows: `did not
prepare at launch; sign-in retry 1 in 30 s`, then `sign-in retry 1 (time,
after 30 s)`, two failed commands, and `answered version-unmeasured: … ;
sign-in retry 2 in 60 s`. One attempt inside the hold, as the ladder predicts,
against zero at the parent. The blackhole's class is still
`version-unmeasured`, which is why the retry keys on "not prepared".

Far side: `gmux-control` one before and one after, created 1787879931,
attached; the scratch repository `GONE`; the scratch server on
`gmux-p232-63423` killed and its socket `SOCKET-GONE`; tmux processes, the
bundled server pid 1041 before and after; leftover directories `NONE`; `~/.ssh`
and `~/.gitconfig` unwritten. The far socket directory read `gmux
gmux-p231-96938` afterwards, which is Phase 231's worktree running its own
probe at the same time and not this run's. This Mac: 14 sessions on `-L gmux`
before and after, the local scratch socket unlinked, identity files unmoved,
no agent started, no token spent. Electrons at the end: 16, being his own
Tortie and its three helpers, Phase 231's head-run profile and its three
helpers, and eight crashpads; none on a p232 profile.
