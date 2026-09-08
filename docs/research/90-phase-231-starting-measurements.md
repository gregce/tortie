# 90. Phase 231, starting measurements

The measure step for Phase 231, the liveness gate answering per verb. Taken on 2026-09-08 at the
parent commit `41405d7`, in the worktree `/private/tmp/wt-p231`, against the operator's Mac Pro
under Phase 224's bounds exactly plus the two later committers added, being that a scratch tmux
socket on EITHER machine is unlinked in the `finally` that kills its server. Nothing here builds
anything. It confirms what the charter cites, draws the data flow, names what the verifier can
re-run, takes the parent reading the phase must move, records the gates green at the parent, and
names the files the builder touches and where a rebase may conflict.

The probe that took the reading is `.p231/probe-p231-parent.mjs` with its far-side fixture
`.p231/far-fixture.mjs`, and the reading is `.p231/report-parent.json` beside them. Every ssh went
through `build/ssh-run.mjs` by way of `build/real-machine.mjs`, every Electron through
`build/electron-run.mjs` on a scratch profile and a scratch socket, `gmux-p231-78176` for the first run and `gmux-p231-84123` for the second, no agent was
started and no token spent, and section 6 counts what was left on both sides.

## 1. What the charter cites, read again at the parent

The entry names seven places. Five still say what the entry says, one line number has drifted, and one is narrower on the face than the entry says.

| The entry says | What the tree says at `41405d7` | Drift |
|---|---|---|
| `machineIsConnected` at `src/main/machines/remote-run.ts:130` asks a set of two link states | `const ANSWERING = new Set(['connected', 'polling'])` at line 127, the function at 130 to 132, reading `machineLinkFacts(machineId).link` | none |
| `runRemoteScript` asserts it before composing a byte | step 4 of the eight, `assertMachineIsConnected(ctx.machineId, scriptId)` at line 299, before the command is composed at step 6 | none |
| eleven more modules ask it at the top of their handler | eleven do: `tree-list.ts:149`, `remote-files.ts:225`, `remote-agent-context.ts:467`, `remote-history.ts:365`, `remote-lines.ts:213`, `remote-clone.ts:231`, `remote-commit.ts:401`, `remote-branch.ts:375`, `remote-search.ts:397`, `remote-runs.ts:338`, `machine-agents.ts:456`. Two more ask it inside a loop rather than at the top, `remote-store-sync.ts:348,366` and `remote-harvest.ts:343,369`, and one harness file, `harness/p118-remote-children.ts:430`. Thirteen production modules in all besides `remote-run.ts` | none, and the two loop callers are named here so the classification covers them |
| the poll runs one `tmux list-sessions` over ssh with a 10,000 ms cap at `src/main/machines/exec-plane.ts:246` | the cap is `REMOTE_POLL_TIMEOUT_MS = 10_000` at `src/main/machines/remote-sessions.ts:403`, handed to `execOn` at `remote-sessions.ts:2308`. `exec-plane.ts:246` is the middle of `REMOTE_VERB_LEDGER`; the plane's own default of `10_000` is at `exec-plane.ts:603` and `:749` and is what a caller that names no timeout gets | **the line drifted**: the number the poll uses lives in `remote-sessions.ts:403`, not `exec-plane.ts:246` |
| anything but success or tmux's own no-server sentence marks the machine quiet | `remote-sessions.ts:2311-2328`: `serverProbeVerdict(err) === 'no-server'` is read as zero sessions and every other failure calls `markMachineQuiet(machineId, classOfListFailure(err))` | none |
| waking the Mac marks every machine quiet and then polls | `remoteMachinesWoke` at `remote-sessions.ts:2953-2961`: for every machine `applyMachineEvent({kind: 'woke'})` then `noteMachineQuiet(machineId, 'has not answered since this Mac woke up')`, then `pollEveryRemoteMachine()` | none |
| the not-connected refusal at `remote-run.ts:275` onward composes no label | `assertMachineIsConnected` at lines 357 to 367 throws `MACHINE_NOT_CONNECTED` with a detail naming the machine ID and the link word; the sentence itself is `remote-copy.ts:402-404`, *"Tortie is not connected to that machine right now, so it did not ask it for anything…"*, and neither has a label. `runRemoteScript` begins at 265, so "275 onward" reaches it | none |
| Explorer, Search and Quick Open draw their own sentence naming the machine, Source control draws main's | Explorer `renderer/machines/explorer.ts:49`, Search `search.ts:60`, Quick Open `quick-open.ts:69`, Context `context.ts:83`, History `history.ts:80`, Branch `branch.ts:53`, read lines `read-lines.ts:145` and the tab `project-tab.ts:114` all take a label. Source control's READ draws its own too, `remoteChangesUnreachable(label)` at `renderer/machines/scm.ts:140`, because `reviewFiles` throws out of the runner and the store records `failed: true` (`remote-changes.ts:447`). What draws main's sentence is a WRITE: `remote-stage.ts`, `remote-entry.ts`, `remote-file.ts` and `remote-review.ts` never ask the boolean, so their refusal is the thrown `MACHINE_NOT_CONNECTED`, which `remote-changes.ts:506` keeps as `writeRefusal` and `ScmSection.tsx:1212` draws verbatim | **narrower than the entry**: on the Source control face it is the Stage, Unstage and Commit press, not the read, that says "that machine". Section 3 reads it off the DOM |

Two things the entry does not say and the builder needs.

**The wake path cannot be driven by a harness launch at the parent.** `installPowerHandlers` in
`src/main/index.ts:663` runs only after `dispatchHarness` returns false at line 481, so a
`GMUX_SHOT` launch never registers a resume listener, and `fireMachineWake` in
`src/main/power/index.ts:182` is called from that listener alone. The charter's "harness's wake
knob" does not exist yet; mechanism 2 needs one, and it is one env name, so `gate:contract` will
move one line and the commit regenerates the baseline.

**The 21 far-side channels, derived from the 37 in `docs/audits/contract-baseline.txt`.**
Configuration only, ten: `acceptVersion`, `add`, `allowWrites`, `confirm`, `forget`, `reload`,
`remove`, `rows`, `state`, `writeSheet`. Spawn under a person's own press, six: `installKey`,
`prepare`, `tailscaleNames`, `test`, `testCancel`, `testInput`. Reach the far side, twenty-one:
`agents`, `cloneProject`, `commit`, `findProject`, `listDir`, `listFiles`, `listTree`, `makeDir`,
`putFile`, `putImage`, `readBranch`, `readContext`, `readHistory`, `readRuns`, `readSessionLines`,
`renameEntry`, `reviewFile`, `reviewFiles`, `searchContent`, `stage`, `unstage`. Every one of the
twenty-one reaches `assertMachineIsConnected` through `runRemoteRead` or `runRemoteWrite`, or asks
`machineIsConnected` first, or both.

## 2. The data flow, in ten lines

1. `pollRemoteMachine` (`remote-sessions.ts:2298`) runs `execOn(ctx, ['list-sessions', …], {timeoutMs: 10_000})` over ssh, through the row's `remoteTmuxPath` on the far side.
2. Success or tmux's "no server running" → `applyMachineEvent({kind: 'listed' | 'no-server'})` → `noteMachineAnswered` (`control-plane.ts:275`) → `setLink('connected' | 'polling')`.
3. Any other failure, a 10 s kill included → `markMachineQuiet` (`remote-sessions.ts:2702`) → `applyMachineEvent({kind: 'transport-lost'})` AND `noteMachineQuiet` → `setLink('quiet', reason)`.
4. A wake → `remoteMachinesWoke` → every machine `setLink('quiet', 'has not answered since this Mac woke up')` BEFORE the poll is issued.
5. `control-plane.ts` holds ONE record per machine, `{link, everAnswered, lastAnsweredAt, reason}`; there is no second fact anywhere.
6. `machineIsConnected` (`remote-run.ts:130`) reads that one record's `link ∈ {connected, polling}`.
7. Every far-side channel asks it: thirteen modules at their top or in their loop, and `runRemoteScript` step 4 for all of them again.
8. A refused read answers a mode word, `notConnected` or `offline`, and the renderer composes a labelled sentence from `src/renderer/machines/*.ts`; a refused WRITE throws `MACHINE_NOT_CONNECTED` and the renderer draws main's unlabelled sentence.
9. `machine-state.ts` folds the same record with the confirm gate into `MachineStateView.link`, pushed to the renderer, where `machineAnswering` (`state/machines-slice.ts:147`) gates the one retry Explorer and Source control buy per sign-in.
10. So one slow `list-sessions` moves step 3, step 6 reads false, step 7 refuses all twenty-one, and step 9 tells every view the machine is quiet, in the same tick.

## 3. The parent reading

Taken 2026-09-08 03:36 to 03:41 local, run directory `scratchpad/p231/run2`, the report copied to
`.p231/report-parent.json`. The row on the scratch profile names the stand-in as its tmux and was
confirmed through the real Settings buttons with the sheet reading *"Runs this program on that
machine: /Users/gdc/tortie-p231-scratch-84123/tmux"*; `prepare` answered `prepared` in 1,825 ms
with the version gate reading the real 3.7c through it; saving was turned on for the scratch root
so the drive could place each flag through Tortie's own `putFile`, which answered `wrote` every
time. The link read `connected` 2 ms after the tab was selected.

A first run of the same probe, kept as `.p231/report-parent-first-run.json`, read the bridge and
not the face, because a project added through the bridge lands under Recent in the launch that
adds it rather than as a tab, which `.p229`'s first parent probe had also read as `no-tab`. The
probe adds in one launch and reads in the next, and its bridge numbers agree with the run below.

### 3.1 Everything lit, the reading the phase must keep

With the link `connected`, off the DOM: Explorer 9 tree rows and *"Read at 03:38"*, Search
*"13 results in 13 files"* with 8 file rows drawn, Source control 4 Stage buttons over `M helper1.ts`,
`M core1.ts`, `U NOTES-untracked.md`, `U untracked.tsx`, Context *"SKILLS Bundled 11"* read from the
Mac Pro's own home. Off the bridge, seventeen channels driven with inputs that change nothing:

| channel | answer while connected | ms |
|---|---|---|
| `listTree` | `ok`, 20 entries | 72 |
| `listFiles` | `repo`, 26 paths | 72 |
| `listDir` | 5 entries | 139 |
| `searchContent` | `repo`, 13 files | 76 |
| `readContext` | `context` | 508 |
| `reviewFiles` | 2 changed, 2 untracked | 62 |
| `readBranch` | `ok` | 81 |
| `readHistory` | `ok` | 69 |
| `readRuns` | `notGitHub` | 62 |
| `agents` | 12 names asked, 3 found | 37 |
| `findProject` | answered | 1 |
| `reviewFile` | both sides of `README.md` | 152 |
| `stage([])`, `unstage([])` | `nothingToDo` | 1 |
| `makeDir(existing)` | `exists` | 35 |
| `renameEntry(absent)` | `gone` | 31 |
| `putFile(wrong expect)` | `stale` | 62 |

`cloneProject`, `commit`, `putImage` and `readSessionLines` were not driven because each starts
something or needs a session; they sit behind the same `runRemoteWrite` or `machineIsConnected` as
the seventeen and the source says so (`remote-clone.ts:231`, `remote-commit.ts:401`,
`remote-image.ts` through `runRemoteWrite`, `remote-lines.ts:213`).

### 3.2 THE NUMBER: one slow session poll, and the far side otherwise answering

The flag `slow-list` holding `1` was written through Tortie's own door at T0. 38 ms later
`listDir` still answered 5 entries, which is ssh and the folder verb answering on the same link.
The link was polled every 250 ms.

| reading | value |
|---|---|
| link left `connected` at | **T0 + 14,691 ms**, straight to `quiet`, detail *"Greg’s Mac Pro did not answer the last time Tortie asked."* |
| what took it there | ONE `list-sessions`, the status list beside the live connection, which slept 12 s on the far side and was killed by `REMOTE_POLL_TIMEOUT_MS` at 10 s; main's log carries one line, *"greg-s-mac-pro did not answer. Its sessions are untouched and Tortie cannot see them."* |
| the matrix taken 4 ms after the link fell | **14 of 17 refused, every one in 0 ms, nothing sent**: `listTree` `notConnected`, `listFiles` `notConnected`, `listDir` `unreachable`, `searchContent` `notConnected`, `readContext` `notConnected`, `readBranch` `notConnected`, `readHistory` `notConnected`, `readRuns` `notConnected`, `reviewFiles` THREW main's sentence, `agents` THREW main's sentence, `reviewFile` THREW main's sentence, `makeDir` THREW, `renameEntry` THREW, `putFile` THREW. `stage([])` and `unstage([])` answered `nothingToDo` before asking anything, and `findProject` answered from its held walk |
| the link back to `connected` | **5,316 ms** later, when the next status list at the 5 s focused cadence answered; nothing was pressed |
| so one slow poll costs | the whole remote surface for **about 15 s of waiting plus 5 s dark** at the focused cadence, and the same wait plus up to 30 s at `REMOTE_POLL_IDLE_MS` when no Tortie window has focus |

The face could not be read inside a 5 s window, so the same flag was written holding `3`: three
consecutive slow polls, ssh and every other verb still answering (`listDir` 5 entries in 53 ms
with the flag in force). The link fell at T0 + 11,635 ms and stayed `quiet` for **35,143 ms**. The
matrix read the same 14 of 17 refusals in 3 ms. The four views, each re-read while dark:

| view | while the link was `quiet` and ssh answered | the moment before |
|---|---|---|
| Explorer, Refresh files pressed | 0 rows, *"Tortie is not connected to Greg’s Mac Pro, so it cannot read that folder."* | 9 rows |
| Search, `needle-alpha` typed | 0 rows, *"No results"*, *"Tortie is not connected to Greg’s Mac Pro, so it searched nothing."* | 13 results in 13 files |
| Source control, Refresh changes pressed | 0 Stage buttons, *"Greg’s Mac Pro did not answer, so Tortie could not read what changed."* under the CHANGES 4 header, with the *"Read at 03:38"* clock still drawn | 4 Stage buttons |
| Context, re-opened | unchanged, *"SKILLS Bundled 11"*; the view keeps its last answer and did not re-read on being re-opened, while `readContext` on the bridge answered `notConnected` | same |

After the third slow poll answered, with no press, Explorer read 9 rows again, Search 13 results,
Source control 4 rows and a Stage press moved a row to Staged in 307 ms. So the surface comes back
by itself; what it cannot do is stay up.

### 3.3 The same reading when every verb is slow, for the side by side

`slow-all` holding an epoch forty seconds out made EVERY call through the stand-in sleep 12 s,
which is the shape of a link that never answers, a child killed at 10 s with no stderr. The link
fell at T0 + 12,133 ms and stayed `quiet` 30,319 ms; the matrix read the same 14 of 17 in 4 ms; the
four views read byte for byte what section 3.2's table shows. **At the parent the two failures are
indistinguishable on every surface**, which is the finding, and the verifier's side by side at HEAD
is that 3.2's face stays lit while 3.3's goes dark.

### 3.4 The sentences, and which ones name the machine

Read off the bridge while dark, the three shapes a refusal takes:

1. The mode word, composed into a labelled sentence by the renderer: Explorer, Search, Quick Open, History, Branch, Runs, Context, the disconnected tab. Every one says *"Greg’s Mac Pro"*.
2. Main's own `MACHINE_NOT_CONNECTED`, thrown by `assertMachineIsConnected` and drawn verbatim where a view keeps main's word: *"Tortie is not connected to that machine right now, so it did not ask it for anything. What Tortie already knows about that machine is as old as the last time it answered. Nothing was sent."* Thrown by `reviewFiles`, `reviewFile`, `agents`, `stage` and `unstage` with paths, and `commit`'s runner. Its detail names the machine by ID and the link word, *"refused \"dir-new\" for machine greg-s-mac-pro: its link reads quiet"*. This is the charter's item 19.
3. A wrapping sentence that names the machine by its ID rather than its label, composed in `remote-entry.ts:238` and `:336` and `remote-file.ts:309`: *"greg-s-mac-pro did not answer while that folder was being made, so it may have been made there. Press Refresh to read that folder again."*, the same for a rename and a save. Each wraps shape 2 as its detail. The entry does not name these three, and the phase that gives the runner a label should give them the same one, because they reach the face through `writeRefusal` exactly as shape 2 does.

On the Source control FACE the read path draws shape 1 (`remoteChangesUnreachable`), so the
unlabelled sentence is met by a person only on a press, being Stage, Unstage or Commit over rows
that were read before the link fell. This drive pressed Refresh changes first, which took the rows
and the buttons away, so the shape 2 sentence is in `report-parent.json` under
`matrixDark` and not under `viewsDark`; the verifier that wants it on the DOM presses Stage without
refreshing.

### 3.5 What the wake does, read from the code because no harness can fire it

`remoteMachinesWoke` at `remote-sessions.ts:2953` marks every machine `quiet` with *"has not
answered since this Mac woke up"* and only then issues the polls, so from the resume event until
each machine's `list-sessions` answers, which is the 10 s cap when it does not, every one of the
twenty-one channels above refuses in 0 ms exactly as in 3.2. `installPowerHandlers` is never
installed on a harness launch, so this reading stays a code reading until the builder adds the
knob the charter names; the verifier's timing "from wake to first row" is then taken through it,
and at the parent it would read the same shape as 3.2 with the 14,691 ms replaced by however long
the first poll takes.

## 4. The gates at the parent, run to logs

All green at `41405d7`, the first five before the probe ran and the smoke after it. Logs under the session scratchpad
`scratchpad/p231/`; the lines that matter are quoted.

| Gate | Result |
|---|---|
| `npm run typecheck` | rc 0; import boundaries OK over 1190 production files, no runtime cycles, shared types OK |
| `npm run build` | rc 0; 95 electron harness, 2 tmux harness, 25 remote machine probe scripts classified; `contract-inventory: OK, the inventory matches docs/audits/contract-baseline.txt byte for byte` |
| `npm run conformance:machines` | rc 0; `PASS. A machine confirmation is bound to the six fields that decide what runs, to the prefixed id, and to nothing else.` |
| `npm run conformance:remoteclose` | rc 0; 1 file, 11 tests passed |
| `npm run gate:knownhosts` | rc 0; 279 files under build/ read, 19 scripts reach `build/ssh-run.mjs`, 36 fixtures of which 32 must fail and every one did |
| `npm run smoke:t1` | rc 0; `6/6 PASS (verify) — T1 restart acceptance test complete`, its scratch server on `gmux-smoke-t1-wt-p231-4678` ended by the harness; run after the probe so no more than one Electron of this phase was up at once |

## 5. What the verifier can re-run, and the files the builder touches

### 5.1 The Phase 224 probes, and which parts take a parent reading of THIS phase

None of the six `.p224` probes drives the link going quiet while ssh answers; they measured the
surfaces around it. What each contributes:

- `.p224/blackhole.mjs` is the ssh-fails shape (192.0.2.1, 10,011 ms, *"Operation timed out"*) and is what a second machine row that never answers looks like. It stays useful for mechanism 4, but at the parent a row that never connected cannot OPEN a tab (`projects.addRemote` answers `notConnected` in 1 ms, research 85 section 4.4), so the "every view goes dark with a label" arm has to be taken on the Mac Pro's own tab by making its link fail, which is what `.p231`'s `slow-all` flag does.
- `.p224/probe-p224b.mjs` with `driver2.mjs`'s `detailDriver` reads the Explorer, Source control controls and Quick Open off the DOM on a connected tab; its selectors are what `.p231` reuses.
- `.p224/driver.mjs`'s `mainDriver` reads all five views with `driveView` and times first row; its `stalledSearch` arm is the closest thing 224 had to a refused read.
- `.p224/far-fixture.mjs` is the far-side scratch repository; `.p231/far-fixture.mjs` is the same file with one addition, a pass-through stand-in for tmux under the scratch root that the scratch row names as its `remoteTmuxPath`, with two flag files: `slow-list` makes the NEXT `list-sessions` sleep 12 s and removes itself first, so exactly one session poll is slow while every other verb and ssh answer at once; `slow-all` holds an epoch and makes every call sleep 12 s until then. The stand-in passes `-V` and `display-message -p #{version}` through, so the version gate reads 3.7c through it and the confirm hash binds its path like any other.
- `.p224/far-final.mjs` and `far-sockets-remove.mjs` are the closing count and the socket sweep; `.p231/probe-p231-parent.mjs`'s `finally` does both for its own socket on both machines.

**What the verifier re-runs.** `GMUX_REAL_MACHINE_HOST=… GMUX_REAL_MACHINE_CONFIRM=… node
.p231/probe-p231-parent.mjs` at the parent and at HEAD, one launch each after the settings launch,
and reads `matrix1` against `matrix0` and `views1` against `views0`. At the parent `matrix1` is
seventeen refusals; at HEAD it must be seventeen answers with `slowPoll.linkWhenLost` reading a FEED
fact and the link fact untouched, and `matrix3` must still be seventeen refusals with the sentence
carrying the label on `views3.scm.afterStagePress`. The attack the charter asks for, the two facts
made to disagree in every combination, needs the harness seam the builder adds; the unit seam that
exists today is `src/main/machines/__tests__/remote-run.test.ts:50`, which mocks
`machineLinkFacts` to one `link` string, and it is what the verifier's matrix over
`{connected, polling, connecting, quiet, refused} × {feed up, feed unknown, feed down}` extends.

### 5.2 The smallest set of files

| File | Why |
|---|---|
| `src/main/machines/control-plane.ts` | the one `LinkRecord` gains the second fact, or the feed fact is recorded beside it; `noteMachineAnswered`, `noteMachineQuiet` and `machineLinkFacts` are the writers and reader |
| `src/main/machines/machine-state.ts` | folds the facts into `MachineStateView`; the charter names it as where the two facts are recorded |
| `src/main/machines/remote-run.ts` | `machineIsConnected` asks the link fact; `assertMachineIsConnected` takes a label; step 4 of `runRemoteScript` |
| `src/main/machines/remote-copy.ts` | `MACHINE_NOT_CONNECTED` becomes a composer that takes the label, the way `commitOffline(label)` at 981 already does |
| `src/main/machines/remote-sessions.ts` | `markMachineQuiet` marks the FEED; `remoteMachinesWoke` marks the feed unknown and leaves the link; a real transport class marks the link |
| `src/shared/ipc/machines/presence.ts` | `MachineStateView` if a feed word is pushed to the renderer; if it is, `gate:contract` may move, and the commit regenerates the baseline |
| `src/renderer/state/machines-slice.ts` | `machineAnswering` keeps asking the link, and the session list asks the feed |
| the thirteen callers named in section 1 | each asks the fact its verb needs, and the write modules that never ask pass the label to the refusal |
| `build/conformance-machines.mjs` | the classification per call site the charter's method two prints, if it is made a gate rule |
| `docs/audits/contract-baseline.txt` | regenerated if any channel or env name moves; the commit body names the line |

### 5.3 Where a rebase may conflict

- **Phase 230**, `/private/tmp/wt-p230`, at `41405d7` and clean when this was written, is queued to touch `src/renderer/tree/FilesSection.tsx`, `src/renderer/scm/ScmSection.tsx`, `RemoteHistorySection.tsx`, `RemoteBranchSection.tsx`, `RemoteRunsSection.tsx`, `src/renderer/search/store.ts`, the Context view's remote read, `src/renderer/app/Sidebar.tsx`, `src/renderer/scm/remote-changes.ts`, and to extract the `machineAnswering` retry into one hook under `src/renderer/machines/`. Every renderer consumer of the link fact this phase might touch is on that list, and `state/machines-slice.ts:147` is what both read. **A Phase 230 probe was running against his Mac Pro while this reading was taken**, on the far socket `gmux-p230-49518`, which section 6 counts.
- **Phase 227**, `/private/tmp/wt-p227`, has uncommitted work in `build/conformance-redline.mjs`, `build/redline-rewind-probe.mts`, `src/renderer/editor/RedlineDocument.tsx`, `redline-journal.ts` and a new `redline-press.ts`. No overlap with this phase's files; the only shared surface is `build/` for `gate:knownhosts` and `gate:electron`, and `HELPER_USER_FLOOR` if both add a probe.
- **Phase 225** landed at `6b8b1c1` and **Phase 229** at `2202fae`; **Phase 228** landed at `b53e665`. Their `.p22x/` directories and `docs/BACKLOG.md`'s running log are where the committer's line lands beside theirs, in date order.
- `src/main/machines/remote-sessions.ts` was last moved by Phase 187 (`87e5533`) and carries the `conformance:remoteclose` rule; `remote-run.ts` by Phase 104 (`e03af86`); `control-plane.ts` by Phase 217 (`069ef77`); `machine-state.ts` by Phase 101 (`1bff045`). Nothing in flight names them.

## 6. What was left on both sides

Counted read only by `.p224/far-final.mjs` after the second run, and by the probe's own `finally`
after each.

**Far side, his Mac Pro.** Sessions on `-L gmux`: ONE before and ONE after, `gmux-control` created
1787879931 (27 August), attached, both times; never listed on any other verb. Processes carrying
`tmux`: his server pid 1041 and his own control client pid 93072, before and after; the one
`/bin/sh …/tmux … list-sessions` sleeper the first run's `finally` caught mid-sleep ended by itself
inside its 12 s and is gone. Sockets under `/private/tmp/tmux-501`: `gmux` alone after both runs,
the scratch sockets `gmux-p231-78176` and `gmux-p231-84123` each reported `SOCKET-GONE` by the
`finally` that killed their servers; **Phase 230's own probes were on that machine at the same time**,
their sockets `gmux-p230-49518` and `gmux-p230-88805` seen in the before and after counts of the
first run and gone by the second, and nothing of theirs was touched. Scratch directories: `NONE`.
`~/.ssh`: `authorized_keys` alone at 88 bytes from 18 August, no `known_hosts`. `~/.gitconfig`: 140
bytes from May 2024, no global `user.name`, never written.

**This Mac.** `-L gmux` sessions: 13 before and 13 after, only ever listed. Sockets under
`/private/tmp/tmux-501`: `gmux` alone after the second run, the local `gmux-p231-84123` killed and
unlinked after `lsof` read no holder (electron-run.mjs kills that server and leaves the file, which
is the bound the entry names). Tortie's own `known-machines` 113 bytes and `~/.ssh/known_hosts`
2,215 bytes, unmoved by digest. ssh agent: no identities. His real machine row and his
`~/Library/Application Support/Tortie` were never opened for writing; the scratch profiles live
under the session scratchpad. Electrons left after the second run: 11 processes, every one of them
another phase's (Phase 227's `gmux-p167rv` and Phase 230's runs were up throughout), and 16 before
this phase started; the probe's own launches were three per run, one at a time, each ended by
`withElectron`. No agent was started, no token spent, nothing installed anywhere.
