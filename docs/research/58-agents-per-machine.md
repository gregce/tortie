# Research 58. Which agents exist on which machine

Author's note. Every claim about this tree was checked in the worktree at HEAD `a497521` on 2026-08-19, by reading the file named beside it. Where an investigator and an adversary disagreed, I read the file and the ruling below says which of them was right. Nothing here is quoted from an older document without being re-read. I contacted no machine, ran no gate and launched no app, and section 9 lists every consequence of that.

---

## 0. The answer

Build it, and build it smaller than the earlier draft proposed, because the defect the operator is actually living with is the opposite of the one that draft described. On a tab whose files are on a machine, `AgentTile` in `src/renderer/app/AgentGrid.tsx` computes `unusable` as `!option.installed || blocked !== null`, and `option.installed` is set by `buildAgentOptions` in `src/renderer/state/agents.ts` from THIS Mac's detection scan, which has never heard of a machine. So an agent that is installed on the machine and not on this Mac is already greyed out and already unselectable, with no way for the person to overrule it, and an agent installed here and absent there is offered and then refused at create time. The first of those two is a capability the product silently removes and it needs no network to fix. So the phase is three things in one order. First, on a tab whose files are on a machine, this Mac's `installed` bit stops deciding the tile, which costs zero round trips and removes a live false absent. Second, Tortie asks each machine once per connection, in ONE batched read, which of the 11 launchable agents it has, holds the answer in memory against `machineGeneration(machineId).generation`, writes it to no disk, and lets only a POSITIVE absent grey a tile. Third, a person can read the same answer in Settings then Agents, as one block per machine under the local card, with one Rescan button per machine and no install affordance of any kind. The batched read is a THIRTEENTH script called `agents-find` rather than a rewrite of `program-find`, because `program-find` is on the remote restore path as well as the create path and a rewrite puts durability at risk for no gain. The create path and the restore path keep asking for one program at create time and at restore time exactly as they do now, so the scan can never decide what goes into a manifest row. Two phases, 109 then 110, and no decision in either of them needs the operator's word before the queue moves.

---

## 1. What runs today

### 1.1 The three reads that exist

| Read | Symbol | File | When | Timeout |
| --- | --- | --- | --- | --- |
| The machine's login PATH | `captureRemotePath` | `src/main/machines/remote-path.ts` | Inside `ensureRemoteServer`, once per Prepare | `REMOTE_PATH_TIMEOUT_MS` 10,000 ms |
| The machine's home | `remoteMachineHome` | `src/main/machines/remote-image.ts` | Once per generation, held in the `homes` map | `REMOTE_FACTS_TIMEOUT_MS` 10,000 ms |
| Where ONE program is | `findRemoteProgram` | `src/main/machines/remote-argv.ts` | Once per remote create, once per remote restore | `REMOTE_ARGV_TIMEOUT_MS` 10,000 ms |

`findRemoteProgram` has exactly two production call sites, being `remoteBinFor` at `src/main/machines/remote-sessions.ts:1251` and `src/main/machines/remote-restore.ts:339`. Both were read this session. Nothing else asks a machine about a program, and nothing asks before a person has chosen.

### 1.2 The defect, stated as a fact about two symbols

`buildAgentOptions(scan, avail)` takes two parameters and no machine. It sets `installed: a.installed` from the scan row, and `AgentPickerOption.installed` carries the comment "False only when detection POSITIVELY reported the CLI missing." `AgentTile` then sets `canSelect` to `mode === 'select' && option.installed && agentBlockedReason(option) === null`. There are three production callers of `buildAgentOptions`, being `src/renderer/app/CreateSessionModal.tsx`, `src/renderer/app/EmptyStates.tsx` and `src/renderer/app/new-session-menu.ts`.

Two errors follow and they are not symmetric.

| Error | Where it lands today | Can the person overrule it | Cost |
| --- | --- | --- | --- |
| Absent here, present on the machine | The tile is greyed and the sublabel says "not installed" | No. There is no control that says "ask the machine" | The capability is gone from that tab |
| Present here, absent on the machine | Step 5 of `remoteCreate`, before the manifest row at step 7 and the `new-session` at step 8 | Yes, they read a sentence and pick something else | One refusal, one wasted sheet |

The earlier draft entry said that on a machine tab "every tile reads as installed, ⌘T offers all 11, and the answer arrives as a refusal". That is false, and the adversary was right to call it the load-bearing error. The first row of the table above is the one that removes something, and it is fixed with no network at all.

### 1.3 How the far-side refusal is drawn today

`noRemoteProgramRefusal` in `src/main/machines/remote-copy.ts` composes a good sentence. `findRemoteProgram` throws it with code `INVALID_INPUT`. In `submit` in `src/renderer/app/CreateSessionModal.tsx`, the `INVALID_INPUT` arm fires only when `payload.message.toLowerCase().includes('working directory')`, so this falls through to `setGenericError(errorText(err))` and draws as one `.modal-error` line. The `AGENT_NOT_FOUND` arm beside it draws a full `launch-block` with a heading, the body sentence, the install lines and a `Try again` button. So the local absent gets five pieces and the machine absent gets one line.

Two further facts about that sentence, both read this session.

1. `noRemoteProgramRefusal(bare, label, searched)` names its second parameter `label`, and both call sites pass `ctx.machineId`. `RemoteMachineContext` in `src/main/machines/context.ts` has no label field. So the sentence a person reads names the id from `machines.json`, not the label they typed.
2. `tryAgain` in `CreateSessionModal.tsx` calls `resetAgentAvailabilityCache()` and `void rescanAgents()`, both of which scan this Mac. Reusing that button for a machine absent would rescan the wrong computer.

### 1.4 What `program-find` actually tests

```
'  if [ -x "$d/$n" ]; then f="$d/$n"; s=path; break; fi',
```

There is no `[ -f ]`. A DIRECTORY carrying the execute bit passes this test, `parseProgramFind` accepts the path because it begins with `/`, and step 6 of `remoteCreate` puts it into `launchArgv[0]` and then into the manifest row. The catalogue's own `reason` string for this script says "It tests whether one name is an executable file", which the text does not do. Investigator 2 reproduced this against a real machine and got back a path ending `/dirbin/claude` for a directory. The manifest is the source of truth for restore and CLAUDE.md requires absolute binary paths in `argv` and `resume_argv`, so this is a durability defect and the fix is two words.

### 1.5 The folder lists, counted

| Thing | Count | Source |
| --- | --- | --- |
| Registry entries | 13 | `AGENT_REGISTRY` in `src/main/agents/registry.ts` |
| `launchable: true` | 11 | same file. `cursoride` and `copilotide` are `launchable: false` |
| Distinct launch names | 11 | claude, cursor-agent, codex, gemini, droid, codewhale, agy, muse, qwen, pi, grok |
| Baseline install folders | 8 | `extraBinDirsFor` in `src/main/tmux/resolve.ts` |
| Entries with a non-empty `extraProbeDirs` | 5 | claude, cursor, codex, pi, grok |
| Values in those five lists | 7 | 1, 1, 2, 2, 1 |
| Of those, already inside the 8 | 4 | `~/.claude/local`, `~/.cursor/bin`, `~/.npm-global/bin`, `~/.local/bin` |
| Outside the 8 | 1 | grok's `~/.grok/bin` |
| Dropped by `NOT_A_PLAIN_FOLDER` | 2 | codex's `$NVM_BIN` and its `~/.nvm` glob |
| Union sent for a batched scan of all 11 | 9 | the 8 plus `~/.grok/bin` |

`NOT_A_PLAIN_FOLDER` is a character class of dollar, star, question mark and open bracket, and it is tested at the TOP of `rebaseRemoteDir`, so both codex entries are dropped by that regex. The earlier draft said one was dropped for not being absolute. It never reaches that branch.

### 1.6 Where a false absent can come from today, with no bug in the scan at all

`remoteMachineHome` swallows every failure and returns the empty string from its `catch`. With an empty home, `remoteSearchDirs` falls back to `extraBinDirsFor(NO_HOME)` filtered down to the entries that do not start with `NO_HOME`, which leaves exactly two folders, being `/opt/homebrew/bin` and `/usr/local/bin`. Investigator 2 measured that on the operator's Mac Pro both installed agents live in `/Users/gdc/.local/bin` and that `command -v` in his login shell finds none of the 13 names. So one failed `machine-facts` read makes a batched scan report claude and cursor-agent absent on the machine they are installed on, silently, for the rest of that connection. Any phase that lets a positive absent grey a tile has to fix this first, and the fix is to make "could not ask" a third answer rather than an empty string.

### 1.7 Sign in, and the race

`signInToConfirmedMachines` in `src/main/sessions/core.ts` loops over `currentMachines().rows` and calls `prepareMachine` for every confirmed row, sequentially, and its own comment gives the reason. `getGmuxCore` fires it with `void`, so it is not awaited. `bumpMachineGeneration` has exactly two production callers, being `src/main/machines/context.ts:416` inside `registerRemoteMachineContext` and `src/main/machines/remote-server.ts:155` in the `born` arm of `ensureRemoteServer`. An ssh link that drops and re-establishes under the ControlMaster while the far tmux server keeps running does NOT bump the generation. So the honest rule is that the answer is held until Prepare runs again or a tmux server is born, and not "on every reconnect".

---

## 2. The batched read

### 2.1 It works, and the numbers are investigator 2's

Measured by investigator 2 on 2026-08-19 against the operator's Mac Pro over his tailnet, twelve interleaved rounds on one warm shared connection. I did not re-run any of it, and section 9 says so.

| Shape | Median | Min | p90 | Max | Answer bytes |
| --- | --- | --- | --- | --- | --- |
| One batched call, 11 agents | 52 ms | 50 ms | 132 ms | 138 ms | 270 |
| 11 separate `program-find`, in series | 480 ms | 389 ms | 489 ms | 495 ms | 478 |
| 11 separate `program-find`, all at once | 298 ms | 204 ms | 310 ms | 466 ms | 478 |

The script and its answers are banked at `docs/research/assets/58/agents-find-hard.sh` and `docs/research/assets/58/answer.hard`, and I read both. The script takes three values, uses `[ -f ]` together with `[ -x ]`, splits records on newlines and folders on colons, and names unreadable folders in a second payload section. Its answer for that machine is 11 record lines of which 2 name a path.

### 2.2 Adopt it as a thirteenth script, not as a rewrite of `program-find`

Investigator 2 chose a new script and gave a reason that does not hold. It said widening `program-find` would break condition 46 of `build/conformance-machines.mjs`, "which asserts that script's exact shape". I read condition 46 and the probe that feeds it. The gate asserts `mode === 'read'`, `params === 3`, zero bare-positional loops, zero redirections, and that the assignment literals for the two lists appear before the two loops that walk them. A widened script keeping those four literals passes. The prose about "the name, the machine's own list and the install folders" lives inside a `fail()` message and is never evaluated. The adversary was right about the gate.

The right reason to add rather than rewrite is a different one, and it is stronger.

| Reason | Evidence |
| --- | --- |
| `program-find` is on the RESTORE path | `src/main/machines/remote-restore.ts:339` calls `findRemoteProgram`. Restore is durability and Tier 3 by CLAUDE.md's own rule, and a rewrite makes every remote restore depend on new shell text |
| The reuse arguments are worth zero | `runRemoteRead` just forwards to `runRemoteScript` with the mode word, and `remoteScript(id)` is an `Array.find`. There are no cases to add. `remoteWriteScripts()` filters on `mode === 'write'` and stays at two either way |
| The "twelve scripts" number is per release, not an invariant | The header above `REMOTE_SCRIPTS` reads "Twelve scripts, and this release holds no others", and `src/main/machines/__tests__/remote-scripts.test.ts:96` asserts `toHaveLength(12)` under a title that repeats that sentence. Phases update it. Phase 90.3 added `tree-list` and the file's own comment records it |
| The measured text is the additive one | `docs/research/assets/58/agents-find-hard.sh` was run on three shells and against a real machine. Nobody has run a widened `program-find` with a new parameter encoding on any shell |

So `agents-find` joins the catalogue as row 13, `mode: 'read'`, `params: 3`, and `program-find` keeps its parameters and gains only the file test.

### 2.3 The one thing about the executable test that both scripts must share

If `agents-find` tests for a regular file and `program-find` does not, they disagree about a directory with the execute bit, and the scan would say absent while the create would happily put a directory in the manifest. Fix `program-find` in the same commit. That is a durability correction worth making on its own.

### 2.4 The composed command has a real ceiling and the compiled agents are nowhere near it

| Case | Composed bytes | Against `REMOTE_SCRIPT_MAX_BYTES` 131,072 |
| --- | --- | --- |
| 11 compiled agents | 1,703, measured by investigator 2, and `docs/research/assets/58/cmd.hard` is 1,703 bytes on disk | 1.3 % |
| 13 names | 1,718, file `docs/research/assets/58/cmd.hard13` | 1.3 % |
| Worst case with a full overlay | Bounded by `OVERLAY_LIMITS.maxFileBytes` of 262,144 | Can exceed the cap |

The worst case is real and neither investigator priced it. `OVERLAY_LIMITS` in `src/shared/agent-overlay.ts` holds `maxRows: 32`, `maxDirs: 16`, `maxDirLength: 512` and `maxFileBytes: 262_144`, and `pathTemplateArray` in `src/main/config/overlay.ts` enforces the first three. A person with a large `agents.json` can compose a command longer than 131,072 bytes, and step 6 of `runRemoteScript` would refuse the whole scan. The composer must therefore split the names into chunks against a byte budget and send more than one read when it has to. That is a loop, not a design problem, and it must be in the phase or the scan is refusable by configuration.

### 2.5 One encoding rule, because a colon corrupts the search TODAY

`pathTemplate` in `src/main/config/overlay.ts` refuses only the control-character class `CONTROL_RE` and the segment `..`, and it requires a leading slash, tilde-slash or dollar. It PERMITS a colon. `findRemoteProgram` already sends the folders joined with colons. So an overlay `extraProbeDirs` entry holding a colon splits into two wrong folders before this phase exists. `rebaseRemoteDir` must refuse a folder holding a colon, and the same rule makes the batched per-agent list safe. Newlines need no new rule, because `CONTROL_RE` already refuses them, which is exactly why the record separator is a newline and not a pipe.

### 2.6 The far side has a limit at 11 and nobody counted Tortie's own channels

Investigator 2 measured the operator's `sshd` carrying a commented `MaxSessions 10`, so the OpenSSH default of 10 applies, and measured 10 calls at once costing 48 to 60 ms against 11 calls at once costing 304 to 381 ms. That is a good argument for one call rather than eleven at once. It is not a complete one, because Tortie already holds one control socket per machine and, by investigator 3's count, four recurring feeds per connected machine, and nobody counted how many channels are already open on that socket. The batched shape is right on the serial number alone, which is 52 ms against 480 ms, so the phase does not need the `MaxSessions` argument to stand.

### 2.7 Which name the scan asks about

Ask about `launch.argv[0]`, being one name per launchable agent, and not about the whole `binaries` list. The reason is mechanical. `launchArgvFor` in `src/main/agents/registry.ts` composes the launch from `entry.launch.argv[0]`, and the registry's own comment at the deepseek row says "argv[0] mirrors binaries[0] by invariant (registry.test.ts pins it)". So the only name that can start a session is `argv[0]`, and a machine holding `codew` but not `codewhale` cannot start deepseek whatever a detection-style answer says. The asymmetry the adversary found is real and it points this way, not the other. This Mac's own detection walks all three names in `src/main/agents/detection.ts`, which means the LOCAL board can call deepseek installed on a Mac that cannot launch it. That is a separate pre-existing defect and it is not in this phase.

---

## 3. Freshness and storage

### 3.1 The ruling

Scan when a machine becomes ready. Hold the answer in main memory against the connection generation. Let a person press Rescan. No disk, no timer, no scan when the create sheet opens.

### 3.2 Why memory and not disk, in one mechanical sentence

`readyRemoteContext` in `src/main/machines/remote-sessions.ts` requires a registered context AND a captured `remotePath` for the current generation, and both live in module Maps in `src/main/machines/context.ts` that do not survive the process. A machine with no run-time context cannot hold a session, so a persisted answer about it could never be acted on before a fresh Prepare had already produced a fresh one.

### 3.3 The precedents in this tree

| Container | File | Keyed by | Has invalidation |
| --- | --- | --- | --- |
| `homes` | `src/main/machines/remote-image.ts` | machine id plus generation | No production caller. `resetRemoteMachineHomesForTests` is defined and never called by anything |
| `walks` | `src/main/machines/project-counterpart.ts` | machine id | Yes, `forgetRemoteProjectWalk`, called from `src/main/machines/remote-clone.ts:250` |
| `scanPromise` and `lastScan` | `src/main/agents/detection.ts` | this Mac | Yes, `rescanAgents` |

The earlier draft said "a forgotten machine takes its answer with it and no invalidation code is needed". That is wrong, and the precedent it cited is the one that has invalidation. `forgetMachineSessions` in `src/main/machines/tombstone.ts` calls `forgetMachineRows`, `stopCapturingMachine`, `stopHarvestingMachine`, `stopSyncingMachine` and `closeControlPlane`, and clears no per-generation map at all. The new map must be cleared there, and while the phase is in that file it should clear the others too.

### 3.4 The free third trigger

`remoteBinFor` and the restore path already learn the true answer for one agent on one machine, and they learn it by having actually run the test. Fold that result back into the map on both arms, on success and on the refusal. It costs zero round trips and it is stronger evidence than the scan, because it is what happened rather than what was tested.

### 3.5 The create path does not read the map

The map decides what a TILE looks like. It never decides what goes into a manifest row. `remoteBinFor` keeps calling `findRemoteProgram` at create time and `remote-restore.ts` keeps calling it at restore time, and the comment in `remote-restore.ts` gives the reason already: "It is asked again rather than read off the row, because the row records where the program was on the day the session was created and a machine can move or lose it in between." A scan answer is older than a create, so the create asks again. This costs the person nothing, because the create already pays that round trip today.

---

## 4. Surfaces and copy

### 4.1 What changes and what must not

Four surfaces change. `AgentGrid.tsx` is shared by the create sheet and the empty state, `new-session-menu.ts` builds the native quick-create popup, `EmptyStates.tsx` draws the install command, and `createSession` in `src/renderer/state/sessions-slice.ts` is the one funnel every create surface already reaches. That funnel is where the refusal is written once, and its own Phase 94 comment says why: "Every create surface reaches this one function, being the ⌘T sheet, the agent board, the per-agent hotkeys, the terminal menu's new session verb and the empty state, so the rule is written here once."

Everything in the Settings window stays about this Mac, because the Settings window has no active project and cannot know which tab is in front.

### 4.2 The tile keeps saying "not installed"

`src/renderer/app/agent-grid.css` records the string `Antigravity · not installed` measuring 192 px against a track floor of `clamp(140px, 45%, 190px)`, and states the failure mode as "Below it the NAME is what gives". `MACHINE_LIMITS.maxLabel` in `src/shared/machines.ts` is 40, so `not on <label>` runs to 47 characters against the 13 of `not installed`. The meta slot cannot hold it. So the tile keeps the short phrase and the machine is named ONCE under the board, which is the shape `MACHINE_NOT_SIGNED_IN_HINT` already uses in `src/renderer/app/CreateSessionModal.tsx`. The `aria-label` is not width bound and may carry the longer sentence.

### 4.3 The copy table

| Surface | On this Mac | On a tab whose files are on a machine |
| --- | --- | --- |
| `AgentGrid` tile meta | `not installed` | `not installed`, unchanged |
| `AgentGrid`, once under the board | nothing | one sentence naming the machine and saying Tortie asked it |
| `AgentGrid` tile `aria-label` | `<Agent>, not installed` | `<Agent>, not on <machine label>` |
| `new-session-menu` sublabel | `not installed` | `not installed` |
| `EmptyStates` | the install command block | one sentence, and NO install command |
| Create-time refusal | the `launch-block` for `AGENT_NOT_FOUND` | a `launch-block` for a new `AGENT_NOT_ON_MACHINE`, with an "Ask <label> again" action and no install command |

### 4.4 Unknown draws on

A machine Tortie has not asked, or could not ask, gives every agent the answer `unknown`, and `unknown` never greys a tile. Only a positive absent does. That is the deliberate choice between the two errors in section 1.2, and it is also what protects the product from the `remoteMachineHome` failure in section 1.6 if that fix ever regresses.

### 4.5 Three surfaces must join the vocabulary audit

`FILES` in `src/renderer/app/__tests__/machine-vocabulary.test.ts` holds 22 paths and none of them is `AgentGrid.tsx`, `EmptyStates.tsx` or `new-session-menu.ts`. The file's own comments record that Phase 84 added `RemoteDirPicker.tsx`, Phase 90.2 added `CounterpartBlock.tsx`, Phase 90.3 added `RemoteProjectModal.tsx` and Phase 92 added `HomeScreen.tsx`, each for the same reason. This phase writes machine sentences into all three, so all three go on the list.

---

## 5. Settings

### 5.1 One block per machine, and not a matrix

| Deciding fact | Measured this session | Consequence |
| --- | --- | --- |
| Content column is capped | `.set-content > section` and its siblings at `max-width: 560px` in `src/renderer/settings/settings.css`, nav rail at `flex: 0 0 200px`, window opened at 760 wide with `minWidth: 640` in `openSettingsWindow` | The grid never gets more than 560 px |
| Both axes are unbounded | `MACHINE_LIMITS.maxRows` 32 and `OVERLAY_LIMITS.maxRows` 32, so the worst case is 43 agents by 32 machines | 17.5 px per machine column |
| A cell cannot hold the answer | The local `AgentRow` draws the icon, the name, the path through `truncateMiddle`, the version chip and up to three notes | The path is the field a person wants when two copies exist, and a tick cannot carry it |
| Freshness is per machine | The answer is bound to one connection through `machineGeneration` | A matrix has one header and nowhere to say "read 4m ago" for one machine |
| Settings holds no table today | `grep -rn "<table" src/renderer` returns 3 hits in 2 files, both outside Settings | A matrix is all new CSS, against "assemble, never reimplement" |

The block per machine reuses `AgentRow` under a machine heading and costs no new row component and no new CSS primitive. It is the third sub-block of the Agents tab, after the local card and `ConfiguredAgents`, and it follows `ConfiguredAgents`'s own rule of returning `null` when there is nothing to draw, so a person with no machines sees the tab exactly as it is today.

### 5.2 It goes in the Agents tab

The Machines tab is the confirm gate's surface and every affordance there is about agreement and signing in. An agent list there mixes two questions.

### 5.3 Rescan

One button per machine, one read, refused in main when the machine is not answering. `assertMachineIsConnected` at step 4 of `runRemoteScript` throws `MACHINE_NOT_CONNECTED` unless the link is `connected` or `polling`, so the button being drawn off is a courtesy and the gate is in main. Gate the BUTTON on `MachineRowView.ready`, not on the link, because `ready` is documented in `src/shared/ipc/machines.ts` as "exactly the condition `readyRemoteContext` tests", which includes the captured PATH the scan needs.

One piece of plumbing is required and it is not free. `useMachinesStore.init` in `src/renderer/settings/machines-store.ts` subscribes to `b.onTestEvent` and to nothing else. `EVT_MACHINE_STATE` is broadcast by `registerMachinesIpc` and `broadcastEvent` in `src/main/typed-events.ts` iterates `BrowserWindow.getAllWindows()`, and `src/preload/machines.ts` already exposes `onStateChanged`, so the channel reaches the Settings window. Nobody has ever observed it arriving there, because no subscriber exists. Phase 110 subscribes.

### 5.4 What this view must never offer

| Refusal | Reason |
| --- | --- |
| No install action of any kind | CLAUDE.md refusal 3 |
| No install command text and no copy button on a machine row | The local row draws `install.command` beside a `CopyButton`, and those strings include the piped `curl` one-liner for claude, read this session in `src/main/agents/registry.ts`. The same string beside a machine Tortie holds an ssh connection to is one button from being sent |
| No provider page link on a machine row | A page about installing on a computer that is not this one is where browse-and-install starts |
| No count, no badge, no dot | Nothing may change without a person pressing something |
| No automatic rescan on opening the pane and none on a timer | A rescan is one button one person pressed |
| No "Rescan every machine" button | One press would open up to 32 connections |
| No editing | This view reads and never writes |

---

## 6. What the scan costs him in ordinary use

Answer first. Zero round trips and zero milliseconds on every gesture he makes, and one extra read per machine each time Tortie signs in to it, which is 52 ms on top of a Prepare that already costs 28 to 30 round trips.

### 6.1 Round trips in a Prepare, counted from the code

| Step | Round trips | Symbol |
| --- | --- | --- |
| tmux version read | 1 | `execOn` at `src/main/machines/prepare.ts:166`, or the `execRemoteShell` fallback at line 181 |
| Server verdict | 1 | `remoteServerVerdict` |
| Boot a new server | 0 or 1 | the `born` arm of `ensureRemoteServer` |
| Capture the login PATH | 1 | `captureRemotePath` |
| Set the server PATH | 1 | `set-environment -g PATH` |
| Write the options | 12 | one `execOn` per row of `SERVER_OPTIONS` |
| Read the options back | 12 | one `readOption` per row |
| **Total** | **28 to 30** | |

`SERVER_OPTIONS` in `src/main/tmux/server-options.ts` holds 12 rows, counted this session at lines 66, 68, 70, 72, 74, 76, 79, 84, 85, 87, 93 and 102, and `remoteBootOptions()` returns the whole list. Investigator 3 used 11 and derived "25 to 28 round trips" and "3 % to 4 %" from it. The count is 12 and the loop runs twice.

### 6.2 Per gesture

| Gesture | Extra round trips | Extra milliseconds |
| --- | --- | --- |
| Tortie launches, per confirmed machine | 1 | 52 |
| The Mac wakes, per machine | 1 | 52 |
| He presses Prepare | 1 | 52 |
| A tmux server is born on a machine | 1 | 52 |
| He presses the create-session hotkey | 0 | 0 |
| He picks an agent tile | 0 | 0 |
| He presses Create | 0 | 0, the create's own `program-find` is unchanged |
| He presses Rescan in Settings | 1 | 52 |
| A minute passes with nothing pressed | 0 | 0 |

The 52 ms is investigator 2's median for the batched call against that Mac Pro. As a share of the Prepare it sits on, at the 35.9 ms warm round trip recorded in research 55, a 29 round trip Prepare is about 1.04 s and the scan makes it about 1.09 s, which is 4.8 %. That is arithmetic from two measured numbers, not a measurement of the sum, and section 9 repeats that.

### 6.3 The race, said plainly

The scan is not awaited by anything a person is waiting on, and `signInToConfirmedMachines` is sequential. So a create sheet opened within a few tens of milliseconds of a machine becoming ready reads `unknown` and draws every tile on. That is the correct fallback, and its worst cost is one refusal that names the machine and the program. It is not free and the phase should not pretend it is.

---

## 7. The options, with the deciding reason on every row

| # | Option | Verdict | Deciding reason |
| --- | --- | --- | --- |
| 1 | Build nothing, keep the create-time refusal | REJECTED | It does not touch the false absent in section 1.2, which is the error that removes a capability with no way to overrule it |
| 2 | Fix only the local `installed` bit on machine tabs, no scan | Partly right, insufficient alone | It removes the false absent for zero round trips and it must ship. On its own it turns every machine tab into 12 tiles that all lead to a possible refusal |
| 3 | Ask per agent when the sheet opens, 11 calls | REJECTED | 480 ms in series and 298 ms at once, against a 10,000 ms timeout sitting in front of a keystroke. The far side's `MaxSessions` default of 10 also puts 11 at once one over a limit Tortie does not control |
| 4 | Widen `program-find` to take a name list | REJECTED | It is on the remote restore path at `remote-restore.ts:339`, so a rewrite makes durability depend on new shell text. Every argument for reuse is worth zero, because `runRemoteRead` has no cases and `remoteWriteScripts` filters on mode |
| 5 | Add `agents-find` as a thirteenth read script, one batched call | **CHOSEN** | 52 ms median, 270 answer bytes, 1,703 composed bytes at 1.3 % of the cap, measured. `program-find` and both paths that use it are untouched |
| 6 | Hold the answer on disk, in `machines.json` or the manifest | REJECTED | A machine with no run-time context cannot hold a session, so a persisted answer could never be acted on before a fresh Prepare replaced it |
| 7 | Hold it in memory against the connection generation | **CHOSEN** | Two precedents in this layer already do it, being `homes` and `walks`, and a bumped generation is the one event after which the old answer could be wrong |
| 8 | Refresh on a timer | REJECTED | Nothing may start a scan on the clock alone. This is a house rule about surprise, not about CLAUDE.md refusal 8, which is about configuration causing a process to start. There are already 5 `setInterval` sites under `src/main/machines/`, so a phase brief must not claim the product has no clocks |
| 9 | Let a positive absent grey a tile, unknown draws on | **CHOSEN** | The two errors are not symmetric. A false present costs one refusal that names the machine. A false absent removes a capability a person cannot argue with |
| 10 | Let the scan decide the create's `argv[0]` | REJECTED | The scan answer is older than the create. `remote-restore.ts` already carries the reason in its own comment |
| 11 | Settings matrix of agents by machine | REJECTED | 560 px content column, both axes bounded only at 32, and a tick cannot carry the path |
| 12 | Settings block per machine, reusing `AgentRow` | **CHOSEN** | No new row component, no new CSS primitive, and room for the path and the age line |
| 13 | One phase | REJECTED | The scan half is Tier 3 by rule and edits the create path. A blocked verdict on a read-only panel would hold the create-path corrections hostage |
| 14 | Two phases, 109 then 110 | **CHOSEN** | Different tiers, and with the channel owned by 109 the file sets are genuinely disjoint |

---

## 8. Defects found on the way

| # | Defect | Symbol and file | In a phase |
| --- | --- | --- | --- |
| 1 | This Mac's `installed` bit greys a tile on a machine tab | `buildAgentOptions`, `src/renderer/state/agents.ts`; `AgentTile`, `src/renderer/app/AgentGrid.tsx` | 109 |
| 2 | `program-find` accepts a directory with the execute bit as the program, and that path reaches the manifest | `PROGRAM_FIND`, `src/main/machines/remote-scripts.ts` | 109 |
| 3 | A failed `machine-facts` read silently narrows the search to two folders and reports absent | `remoteMachineHome`, `src/main/machines/remote-image.ts` | 109 |
| 4 | An overlay `extraProbeDirs` entry holding a colon splits into two wrong folders | `pathTemplate`, `src/main/config/overlay.ts`; `findRemoteProgram`, `src/main/machines/remote-argv.ts` | 109 |
| 5 | The far-side refusal names the machine id, not the label the person typed | `noRemoteProgramRefusal`, `src/main/machines/remote-copy.ts`; `RemoteMachineContext`, `src/main/machines/context.ts` | 109 |
| 6 | That refusal draws as one line, because `INVALID_INPUT` only routes to a block on the words "working directory" | `submit`, `src/renderer/app/CreateSessionModal.tsx` | 109 |
| 7 | `forgetMachineSessions` clears no per-generation cache, and `machines:remove` clears neither `remoteContexts` nor `generations` | `src/main/machines/tombstone.ts`, `src/main/machines/ipc.ts` | 109 |
| 8 | The success log line says the program was found "after 17 folder(s) were tested" for a program that may have been found in folder 1, because `searched` is computed before the call and the script breaks on first hit | `remoteBinFor`, `src/main/machines/remote-sessions.ts` | 109, one line |
| 9 | `resetRemoteMachineHomesForTests` has no caller of any kind, including no test | `src/main/machines/remote-image.ts` | 109, delete it or call it |
| 10 | Local detection walks all of `binaries` while the launch uses `argv[0]`, so deepseek can read installed on a Mac that cannot launch it | `src/main/agents/detection.ts`, `launchArgvFor` in `src/main/agents/registry.ts` | NOT in a phase. Recorded here, and it is about this Mac, not about a machine |

---

## 9. What is not true and what nobody checked

- **I contacted no machine.** Every timing number in section 2.1 and section 6.2 is investigator 2's, measured on 2026-08-19 against one Mac Pro over one tailnet. I read the probe scripts and the answer files investigator 2 left behind, which are banked at `docs/research/assets/58/`, and I did not re-run them.
- **No gate was run, by anybody.** This worktree has no `node_modules`. `conformance:machines`, `conformance:agents`, `conformance:installs` and the full battery are unexecuted against every proposal in this document, including my own reading of condition 46.
- **The Prepare total of 28 to 30 round trips is counted from the code and not observed.** I did not watch a Prepare and count commands.
- **The 4.8 % share in section 6.2 is arithmetic across two separately measured numbers.** Nobody measured a Prepare with the scan in it.
- **No Linux machine was contacted by anyone.** The batched script was run under three shells by investigator 2, on this Mac, with byte identical output.
- **The remote restore path was exercised by nobody.** That is the strongest argument for the additive script and it is also the thing that most needs proving in the phase.
- **The overlay path was measured by nobody**, on the composed size cap or on the colon corruption. Both are read from the limits and the regexes, not from a run.
- **The `MaxSessions` cliff was measured on one machine**, and nobody counted how many channels Tortie already holds open on its own control socket for that machine.
- **The 192 px and 67 px tile figures are quoted from the comment in `src/renderer/app/agent-grid.css`.** I did not re-measure them in a browser.
- **The operator's `machines.json` was not read.** I do not know how many machines he has. Every shape here has to hold from 0 to 32.
- **I did not count the pinned fragments in `build/assert-bundle-refusals.mjs` string by string.** I counted 86 `fragments: [` arrays and confirmed by grep that neither "It looked in" nor "programs are usually kept" appears in that file, so `noRemoteProgramRefusal` is not pinned there. Investigator 4's figure of 301 fragments is not a number I could reproduce.
- **I did not drive the app or take a screenshot.** Every statement about what a person sees is read from the component and its CSS.
- **Whether the Settings window in fact receives `EVT_MACHINE_STATE` has never been observed**, because no subscriber exists there today.

---

## 10. Decisions that need the operator's word

**None. Nothing here blocks the queue and both phases can start without him.**

Two choices were made on his behalf and he may overrule either one later at small cost. They are recorded so he does not have to go looking for them.

| Choice | What was chosen | What it would cost to change |
| --- | --- | --- |
| The tile's words | The tile keeps `not installed` and the machine is named once under the board, because `MACHINE_LIMITS.maxLabel` is 40 and the meta slot was measured at 67 px | One string and one CSS rule, if the track floor moves |
| Whether the create trusts the scan | It does not. The create still asks the machine at create time, so a create costs the same round trip it costs today | One branch in `remoteBinFor`, and it would save about 52 ms per remote create at the price of a stale path reaching a manifest row |

---

## 11. The phase entries, ready to paste

```markdown
## Phase 109 — which agents the machine you are creating on actually has (research 58 row, queued 2026-08-19) QUEUED

**Subject:** `feat(machines): Tortie asks each machine which agents it has`
**First body line:** `Phase 109: which agents the machine you are creating on actually has`
**Semver:** minor. It adds a capability and it corrects two defects. The committer says which in the body.
**Tier 3.** Size Medium.
**Charter:** this entry plus `docs/research/58-agents-per-machine.md`. That document measured or counted every number here and its rulings bind this phase.

**Why Tier 3, and it is not a default.** CLAUDE.md makes anything claimed to work universally
across agents Tier 3, and this phase claims exactly that, being one answer for all 11 launchable
registry entries on every confirmed machine. It also corrects `program-find`, which is on the remote
RESTORE path at `src/main/machines/remote-restore.ts:339`, and restore is durability. A wrong answer
here costs work in two shapes. A false absent takes an agent off the board that is really installed
over there and gives you no way to overrule it. A false present sends you through the whole create
sheet to a refusal. Reading the code proves neither. Only a per agent matrix, driven against a real
machine and checked against that machine's own answer, can.

**Depends on.** Nothing. It must land before any later phase adds a fifth surface that lists agents.

### The defect this phase actually fixes, because the obvious one is backwards

`AgentTile` in `src/renderer/app/AgentGrid.tsx` computes `unusable` as
`!option.installed || blocked !== null`, and `option.installed` comes from `buildAgentOptions` in
`src/renderer/state/agents.ts`, which takes `(scan, avail)` and no machine. Both inputs describe
THIS Mac. So on a tab whose files are on a machine, an agent that is installed over there and absent
here is ALREADY greyed out and ALREADY unselectable, and no control in the product overrules it.
That is the error that removes a capability, and it needs no network to fix. The opposite error,
being an agent present here and absent there, is caught at step 5 of `remoteCreate` by
`remoteBinFor`, which runs before `noteIssuedRemoteId`, before the manifest row at step 7 and before
the `new-session` at step 8, so nothing starts and no pane opens. That part is mechanically correct
and only its DRAWING changes here.

### The mechanism, in five parts

**Part 1. The local bit stops deciding a machine tab, and it costs zero round trips.**
`buildAgentOptions` gains a third input, being the answer Tortie holds for the tab's machine, and
`installed` on a machine tab is decided by that answer alone. Three surfaces read it, being
`src/renderer/app/CreateSessionModal.tsx`, `src/renderer/app/EmptyStates.tsx` and
`src/renderer/app/new-session-menu.ts`. A fourth surface, `launchAgent` in
`src/renderer/settings/integration.ts`, reads no `installed` and goes straight to `createSession`,
which is where the refusal is written once, because the Phase 94 comment in
`src/renderer/state/sessions-slice.ts` says every create surface reaches that one function.

**Part 2. A THIRTEENTH read script, and `program-find` is not rewritten.** `agents-find` joins
`REMOTE_SCRIPTS` in `src/main/machines/remote-scripts.ts` with `mode: 'read'` and `params: 3`, being
the machine's login list, the shared install folders, and one record per agent holding the name and
then that agent's own folders, with records separated by NEWLINES. The measured text is banked at
`docs/research/assets/58/agents-find-hard.sh`. Newline is the record separator because `CONTROL_RE`
in `src/main/config/overlay.ts` already refuses a newline in a configured path and permits a colon.
`program-find` keeps its three parameters and both of its callers untouched, because one of them is
the restore path. `src/main/machines/__tests__/remote-scripts.test.ts` moves from 12 to 13 and its
title moves with it. That number is a per release count the catalogue header itself describes as
"this release holds no others", exactly as Phase 90.3 moved it when it added `tree-list`.

**Part 3. Four corrections, and two of them are durability.**

| Fix | File and symbol | Why |
| --- | --- | --- |
| Test for a regular file before testing the execute bit | `PROGRAM_FIND`, `remote-scripts.ts` | A directory with the execute bit passes today, `parseProgramFind` accepts it and it reaches `launchArgv[0]` and the manifest row. Reproduced against a real machine by research 58 |
| A failed facts read is not an empty home | `remoteMachineHome`, `remote-image.ts` | Its `catch` returns the empty string, which makes `remoteSearchDirs` fall back to two folders and report absent on a machine where the agents are installed |
| Refuse a folder holding a colon | `rebaseRemoteDir`, `remote-argv.ts` | `findRemoteProgram` already joins the folders with colons and `pathTemplate` permits a colon, so an overlay entry corrupts the search today |
| The refusal names the label | `noRemoteProgramRefusal`, `remote-copy.ts` | Its second parameter is named `label` and both call sites pass `ctx.machineId`. `RemoteMachineContext` has no label field, so one is threaded in |

**Part 4. Where the answer lives.** A new `src/main/machines/machine-agents.ts` holds one answer per
machine in memory, stamped with `machineGeneration(machineId).generation` from
`src/main/machines/context.ts`. Nothing is written to disk. The two precedents in this layer are
`homes` in `remote-image.ts` and `walks` in `project-counterpart.ts`, and the second one carries
`forgetRemoteProjectWalk` because a held answer went stale. This map is cleared the same way, from
`forgetMachineSessions` in `src/main/machines/tombstone.ts`, which today clears no per-generation
cache at all. Per agent the renderer sees `present`, `absent` or `unknown`, and ONLY `absent` greys
a tile.

**Part 5. Three triggers, and none of them is a clock.** The scan runs once when a machine becomes
ready, started with `void` so nothing a person is waiting on awaits it. A person can ask again from
Settings, which is Phase 110. And `remoteBinFor` and the restore path fold their own single-agent
result back into the map on BOTH arms, which costs zero round trips and is stronger evidence than
the scan because it is what actually ran. It does NOT run when the create sheet opens, and there is
no timer for it.

**The composer must chunk.** `OVERLAY_LIMITS` in `src/shared/agent-overlay.ts` allows 32 rows with
16 directories of up to 512 characters, inside a file capped at 262,144 bytes, so a composed command
can exceed `REMOTE_SCRIPT_MAX_BYTES` of 131,072 and step 6 of `runRemoteScript` would refuse the
whole scan. Split the names into chunks against a byte budget and send more than one read when the
budget needs it. With the 11 compiled agents the composed command measured 1,703 bytes, being 1.3 %
of the cap, so this loop never runs for a person with no `agents.json`.

**The scan never decides a manifest row.** `remoteBinFor` and `remote-restore.ts` keep calling
`findRemoteProgram` at create time and at restore time. The reason is already written in
`remote-restore.ts`, being that the row records where the program was on the day the session was
created and a machine can move or lose it in between. A scan answer is older than a create.

**Transport, and it belongs to THIS phase.** One request channel and one event in
`src/shared/ipc/machines.ts`, `src/main/machines/ipc.ts` and `src/preload/machines.ts`, plus a
renderer store slice. Phase 110 draws the answer and adds no channel of its own.

**Which name is asked about.** `launch.argv[0]`, one per launchable agent, being 11 names. The
registry's own comment at the deepseek row says "argv[0] mirrors binaries[0] by invariant", and
`launchArgvFor` composes the launch from `argv[0]`, so that is the only name that can start a
session. Configured agents from `agents.json` are asked about on the same terms, and a configured
agent whose binary is an absolute path is skipped rather than asked, because
`OVERLAY_BARE_BINARY_PATTERN` constrains only the bare form.

### The copy

| Surface | On this Mac | On a tab whose files are on a machine |
| --- | --- | --- |
| `AgentGrid` tile meta | `not installed` | `not installed`, UNCHANGED |
| `AgentGrid`, once under the board | nothing | one sentence naming the machine, guarded the way `MACHINE_NOT_SIGNED_IN_HINT` is |
| `AgentGrid` tile `aria-label` | `<Agent>, not installed` | `<Agent>, not on <machine label>` |
| `new-session-menu` sublabel | `not installed` | `not installed` |
| `EmptyStates` | the install command block | one sentence, and NO install command |
| Create-time refusal | the `launch-block` for `AGENT_NOT_FOUND` | a `launch-block` for a NEW `AGENT_NOT_ON_MACHINE` code on the union in `src/shared/types.ts`, with an "Ask <label> again" action |

The tile keeps the short words for a measured reason. `src/renderer/app/agent-grid.css` records
`Antigravity · not installed` at 192 px against a track floor of `clamp(140px, 45%, 190px)` and says
"Below it the NAME is what gives", and `MACHINE_LIMITS.maxLabel` is 40, so `not on <label>` runs to
47 characters against 13.

The action must NOT be `Try again`. `tryAgain` in `CreateSessionModal.tsx` calls
`resetAgentAvailabilityCache()` and `void rescanAgents()`, both of which scan this Mac. The
precedent for a new code is Phase 48's `AGENT_INTERPRETER_MISSING`.

**Menus.** `quickCreateMenuItems` in `src/renderer/app/new-session-menu.ts` builds `MenuItemSpec[]`
for a native popup, and its sublabels change on a machine tab. No item is added, renamed or removed,
and `rebuildAppMenu` is untouched. The commit body says exactly that.

**The vocabulary audit.** `AgentGrid.tsx`, `EmptyStates.tsx` and `new-session-menu.ts` join `FILES`
in `src/renderer/app/__tests__/machine-vocabulary.test.ts`, which holds 22 paths today and none of
those three.

### What is NOT in this phase

- **No install surface aimed at a machine, ever.** `EmptyStates.tsx` draws an install command on
  this Mac and must draw none for a machine. CLAUDE.md refusal 3 forbids a browse and install place,
  and the `install` map carries the promise that nothing in it can run, which
  `npm run conformance:installs` asserts.
- **No badge, no dot, no count, and nothing that animates.**
- **No timer and no background sweep for this answer.**
- **No disk cache and no manifest column.**
- **No probe of a machine that is not connected.** `assertMachineIsConnected` already refuses it.
- **No write of any kind.** `agents-find` is a read and the catalogue keeps exactly two writes.
- **The Settings view is Phase 110** and must not be built here.

### The evidence

Drive the real app and drive a real machine. A verifier who only read the code has not verified
this phase.

1. **The per agent matrix.** For one real machine, print one row for each of the 11 launchable
   entries, being claude, cursor-agent, codex, gemini, droid, codewhale, agy, muse, qwen, pi and
   grok. Each row carries Tortie's batched answer and, beside it, what the verifier got running the
   same file and execute test by hand over the same connection. Report the count that agreed out of
   11 rather than the word "all".
2. **The false absent, three ways.** Prove a tile for an agent installed on the machine and NOT on
   this Mac is now selectable on a machine tab, which is the defect that exists today. Then make a
   `machine-facts` read fail and prove the scan reports `unknown` rather than marking two installed
   agents absent. Then prove that with no answer held, all 12 tiles draw on.
3. **The false present.** Prove a tile for an agent genuinely absent over there is greyed BEFORE the
   person presses anything, and that forcing the create still fires `noRemoteProgramRefusal`, writes
   no manifest row and leaves no pane on that machine. Photograph the new `launch-block` and confirm
   it names the machine's LABEL and offers no install command.
4. **The restore path, because `program-find` changed.** Restore a real remote session end to end
   after the file-test fix, and separately prove a directory carrying the execute bit at a name on
   the search list is now reported as not found rather than landing in `argv[0]`.
5. **The numbers, measured rather than estimated.** Report seconds and answer bytes for the one
   batched call, and beside them 11 separate `program-find` calls in series AND 11 issued at once on
   the same connection in the same minute, naming the far side's `MaxSessions` value. Report the
   composed command size in bytes, printed by the code, against `REMOTE_SCRIPT_MAX_BYTES` of
   131,072, for the compiled 11 and for a synthetic 32 row overlay with 16 directories each. Report
   what the answer looks like when one folder in the list is unreadable.
6. **The generation rule.** Take the answer, drop the connection, force a Prepare, and prove the
   bumped generation caused a second ask rather than a reuse. Prove a second create sheet inside one
   connection asks nothing. Prove `machines:remove` leaves no answer behind.
7. **The gates CLAUDE.md names for these files.** `npm run conformance:machines`,
   `npm run conformance:agents`, `npm run conformance:installs` and
   `npm run conformance:resume:capture`, all four, on the exact committed tree, plus the full
   battery including `smoke:t3`.
8. **Count the operator's sessions with `tmux -L gmux list-sessions` before and after and report
   both numbers.** `activeTmuxSocket` in `src/main/tmux/resolve.ts` honours `GMUX_TMUX_SOCKET` only
   when one of `GMUX_SMOKE`, `GMUX_SHOT` or `GMUX_UPDATE_REHEARSAL` is set, so a launch without one
   of those three silently uses his real server.

## Phase 110 — what exists where, in Settings (research 58 row, queued 2026-08-19) QUEUED

**Subject:** `feat(settings): see which agents each machine has`
**First body line:** `Phase 110: what exists where, in Settings`
**Semver:** minor. It adds a read-only view.
**Tier 2.** Size Small.
**Charter:** this entry plus `docs/research/58-agents-per-machine.md`, section 5.

**Why Tier 2.** It starts no new kind of work. It draws an answer Phase 109 already holds and its
Rescan button calls the same function Phase 109 already proved across 11 agents against a real
machine. Its own risk is one panel and one button. It is not Tier 1, because the button does send a
read to another computer.

**Depends on.** Phase 109, for the answer, for the channel and for the preload method. It adds none
of the three.

### The mechanism

One block per machine, drawn as a third sub-block of the Agents tab under the local card and
`ConfiguredAgents`, and NOT a matrix of agents by machine. `src/renderer/settings/settings.css` caps
the content column at 560 px, the nav rail is `flex: 0 0 200px`, and `openSettingsWindow` opens at
760 wide with `minWidth: 640`. `MACHINE_LIMITS.maxRows` and `OVERLAY_LIMITS.maxRows` are both 32, so
a matrix is 43 agents by 32 machines inside 560 px, which is 17.5 px per column, and a tick cannot
carry the path, which is the one field a person wants when two copies exist. `grep -rn "<table"
src/renderer` returns 3 hits in 2 files and neither is in Settings, so a matrix is also all new CSS.

The block reuses `AgentRow` from `src/renderer/settings/AgentsSection.tsx` under a machine head built
from `.mach-dot`, the label, `.mach-host` and `.set-config-id`, all of which
`src/renderer/settings/MachineRow.tsx` already draws. It copies `ConfiguredAgents`'s empty rule and
returns `null` when there are no machines, so a person with none sees the tab exactly as today. Each
row shows the agent name, whether it was found, and the absolute path ON THAT MACHINE through
`truncateMiddle`. One age line reuses `.set-scan-age` with `formatAge` and `useNow` from
`src/renderer/format.ts`.

Rescan is one button per machine, `.btn.btn-secondary.set-rescan`, and it costs one round trip. While
it runs, that button alone becomes disabled and shows `.set-spinner` beside the word Scanning, and
that class already carries a `prefers-reduced-motion` rule. The previous answer stays on screen with
its age, which is `machines-store.refresh`'s existing rule. On failure, one sentence FROM MAIN under
the machine head, and no row flips to absent, because a failed read is not evidence of absence.

The button is gated on `MachineRowView.ready` and not on the link, because
`src/shared/ipc/machines.ts` documents `ready` as exactly the condition `readyRemoteContext` tests,
which includes the captured PATH the scan needs. A machine that is not ready keeps its rows and its
age, greys the button and says it is not signed in, reusing `machineNotSignedInOption` from
`src/renderer/machines/presentation.ts`.

**One line of plumbing.** `useMachinesStore.init` in `src/renderer/settings/machines-store.ts`
subscribes to `b.onTestEvent` and to nothing else, so the Settings window learns nothing about a
machine's link state today. `src/preload/machines.ts` already exposes `onStateChanged` and
`broadcastEvent` in `src/main/typed-events.ts` iterates every window, so the channel reaches
Settings. Subscribe in `init`, or the button's enabled state is frozen at the moment Settings opened.

**Menus.** No native menu changes. This phase adds a sub-block inside a Settings tab that the app
menu already reaches, and it adds, renames and removes nothing a menu names. The commit body says
exactly that.

**Files.** `src/renderer/settings/**` only, plus one new component beside `AgentsSection.tsx`. It
touches nothing under `src/main/machines/**`, so `npm run conformance:machines` is not required for
this commit, and the brief says so deliberately rather than by omission.

### What is NOT in this phase

It is a READ and it never becomes an install surface. No install command, no copy button, no
provider link, no "Install on <machine>" anywhere in this panel, whatever the `install` map holds.
The local `AgentRow` draws `install.command` inside `<code className="set-agent-cmd">` beside a
`CopyButton`, and those strings are piped shell one-liners. Such a string next to a machine Tortie
holds an ssh connection to is one button from being sent. No count on any nav item, no badge, no dot
beyond the colour the person chose. No rescan on opening the pane, none on a timer, none on a
re-render. No "Rescan every machine" button, because one press would open up to 32 connections. No
sorting, filtering or browsing. No editing of any kind.

### The evidence

Open Settings then Agents in the real app with at least one confirmed machine and photograph the
panel in four states, being connected with an answer, connected mid rescan, not signed in with a
previous answer, and a machine whose rescan failed. Press Rescan and prove from the log that exactly
one round trip left this Mac and that it was a read. Prove the rows agree with Phase 109's matrix for
the same machine in the same connection, reporting the count that agreed out of 11. Prove no install
command string reaches the panel, by grepping the built renderer bundle for one command from the
install map. Prove the button is drawn off for a machine whose `ready` is not true and that pressing
it in that state sends nothing. Count the operator's sessions with `tmux -L gmux list-sessions`
before and after and report both numbers. `activeTmuxSocket` honours `GMUX_TMUX_SOCKET` only under
`GMUX_SMOKE`, `GMUX_SHOT` or `GMUX_UPDATE_REHEARSAL`.
```
