# Research 58, investigator 3. When Tortie looks for agents on a machine, and where the answer lives

Written 2026-08-19 against the working tree at `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/wt-r58`.
Every claim about this tree was checked this session and carries a file path and a symbol name.
Nothing was written to the operator's machine, his manifest, his userData or his tmux server.

---

## The answer, first

**Scan when the machine connects, keep the answer in memory against the connection generation, and let a
person press rescan. Do not write it to disk. Do not put it on a timer. Do not run it when the Cmd+T
sheet opens.**

**A false absent is worse than a false present, and it is not close.** A false present lands on a refusal
that already exists, is already worded, and already happens before anything starts on the far side. A
false absent has no landing at all, because it removes the choice from the screen before the person can
reach the code that would tell them what Tortie looked for. So the scan's answer is a LABEL and never a
LOCK, and the three-state rule below follows from that.

**Is `src/main/machines/project-counterpart.ts` the precedent?** Yes for the storage shape and no for the
trigger. Its `walks` map is exactly the right container. Its trigger, which is a lazy read the person
waits on inside the sheet, is exactly the wrong one for a board that has to be drawn the moment the sheet
opens.

**The stronger precedent is one the charter did not name.** `src/main/agents/detection.ts` already answers
the identical question for this Mac. It scans once, warmed off the boot path, keeps the result in a
module variable, is invalidated only by `rescanAgents`, has no timer, and writes nothing to disk. The
remote policy should be that policy with "the machine connecting" in place of "the app launching". That
is one mechanism extended rather than a second mechanism invented.

**This answer must not survive a quit, and the reason is mechanical rather than a preference.** The set of
machines the answer can change a decision for is exactly the set for which `readyRemoteContext` in
`src/main/machines/remote-sessions.ts` succeeds. That function requires a registered context AND a
captured program search list for the CURRENT generation. Both live in module `Map`s in
`src/main/machines/context.ts` (`remoteContexts` and `generations`) and neither survives the process. A
machine with no run-time context cannot hold a session at all, so a persisted answer about it cannot be
acted on. Persisting buys one sentence about a machine nobody can use right now, and costs a new file
format, a new invalidation surface and a permanent risk that a later phase reads it on the create path.

---

## 1. The four facts this ruling rests on

Each one was read in the tree this session.

### 1.1 The scan's input is the program search list, and that list is captured once per Prepare

`findRemoteProgram` in `src/main/machines/remote-argv.ts` reads
`machineGeneration(ctx.machineId).remotePath ?? ''` and sends it as the second argument of the
`program-find` script. That value is written by `setMachineRemotePath`, called from `captureRemotePath` in
`src/main/machines/remote-path.ts`, which `ensureRemoteServer` in `src/main/machines/remote-server.ts`
calls on every Prepare and not only on a server birth.

So a scan is a derived value. Its freshness cannot exceed the freshness of the list it was taken against.
A scan held longer than the capture would be a claim about a search list Tortie no longer holds. Binding
the two to the same lifetime is not a convenience, it is the only honest lifetime available.

### 1.2 The generation is the existing invalidation key, and four caches already use it

| Module | Symbol | What it holds per generation |
| --- | --- | --- |
| `src/main/machines/context.ts` | `generations` | the program search list |
| `src/main/machines/remote-image.ts` | `homes` | that machine's own home directory |
| `src/main/machines/project-counterpart.ts` | `walks` | every git folder under that machine's home |
| `src/main/machines/remote-harvest.ts` | `facts` | that machine's home and two environment names |
| `src/main/machines/pane-env-rescue.ts` | `foreignMemo` | the `$-id`s already proven not to be Tortie's |

That is five in-memory caches keyed by machine and generation. It is zero on-disk caches of anything a
machine answered about itself. The one thing Tortie does write to disk from a machine is in
`src/main/machines/remote-store-sync.ts`, and its own header states the promise it keeps for doing so.
It never says a conversation is current. It says when it last copied it, and the person judges.

`bumpMachineGeneration` in `src/main/machines/context.ts` is called from exactly two production places,
being `registerRemoteMachineContext` in the same file, which `prepareMachine` calls, and
`ensureRemoteServer` in `src/main/machines/remote-server.ts` on a server birth.

### 1.3 This Mac already answers the same question, and its policy is the one to copy

`src/main/agents/detection.ts` holds `scanPromise` and `lastScan` as module variables.
`listDetectedAgents` scans on first call and reuses after that. `rescanAgents` is the only thing that
drops the answer and it is the Settings re-scan button. `peekDetectedAgents` never starts a scan and never
waits on one, and it answers null before the first scan resolves. The warm call is
`void listDetectedAgents().catch(() => undefined)` in `src/main/sessions/core.ts`, deliberately off the
boot path.

There is no timer, no scan on the create sheet opening, and no file.

### 1.4 A create already refuses safely for an agent that is not there

`remoteCreate` in `src/main/machines/remote-sessions.ts` lists its own order in its header. Step 5 is
`remoteBinFor`, which calls `findRemoteProgram`. Step 7 is the manifest row and step 8 is `new-session`.
So the program search happens BEFORE the row is written and BEFORE anything starts on the far side. The
refusal a person reads is `noRemoteProgramRefusal` in `src/main/machines/remote-copy.ts`, and it names the
program, the machine, the folder count and the two things a person can do about it.

---

## 2. When to scan

Rejected rows carry their deciding reason exactly as the taken rows do.

| Trigger | Verdict | The deciding reason |
| --- | --- | --- |
| On the machine connecting, in `prepareMachine`'s success arm, after `ensureRemoteServer` | **TAKE** | The program search list the scan needs is captured by that same call and by no other. Any later trigger would read a list somebody else captured and would have to check the generation anyway. It also costs least, because Prepare already sends 25 to 28 commands over a connection that is open (see section 6). |
| A rescan a person presses, per machine, in Settings then Agents | **TAKE** | It is the ONLY route that fixes the one invalidation Tortie cannot observe, being an agent installed on that machine after the connection was made. `agents:rescan` in `src/main/agents/index.ts` is the same control one machine closer, so the shape already exists. |
| Folding the create path's own answer back into the held map, with no call of its own | **TAKE** | `remoteBinFor` learns ground truth on every remote create, being an absolute path on success and a completed failed walk on refusal. Writing that back costs zero round trips and is strictly better evidence than a scan, because it is what actually happened. Without it a board can keep saying an agent is present a second after a create proved it is not. |
| When the Cmd+T sheet opens | **REJECT** | The sheet's own rule today is that opening it reads memory and spawns nothing. `CreateSessionModal.tsx` calls `api.rows()` on open and its comment says `machines:rows` reads memory in main and spawns no process. A scan on open would also have to run for EVERY machine in the list rather than one, because the board is drawn before a machine is chosen. Cmd+T is a keystroke and a keystroke must not open a network read. |
| When the machine choice changes inside the sheet | **REJECT as the trigger** | This is what `startCounterpartLookup` in `CreateSessionModal.tsx` does for the project folder, and its comment says it runs on the machine choice changing and on nothing else. It fits a field that may fill in late. It does not fit the agent board, which is drawn before a machine is chosen and must be correct at first paint. A board that rearranged itself after a round trip is also the moving surface the Zen rules forbid. |
| On the Mac waking | **REJECT** | `remoteMachinesWoke` in `src/main/machines/remote-sessions.ts` marks every machine quiet and polls. It does NOT bump the generation and it does NOT re-capture the program search list. A scan there would be taken against the list from before the sleep, so it would add a round trip and learn nothing new. If a later phase makes wake re-Prepare, the connect trigger picks it up for free. |
| On a timer | **REJECT** | Nothing changes on the far side without a person doing something over there, so a timer spends round trips at a fixed rate for an answer that changes when somebody runs an installer. A connected machine already carries four recurring feeds, being the session list at 5,000 ms focused and 30,000 ms idle, the harvest at 60,000 ms and 300,000 ms, the capture capsule at 120,000 ms and the store copy at 300,000 ms. A fifth with no event behind it is cost with no reader. It also breaks the Zen rule the charter names, because a count that changed on its own is exactly a surface rising by itself. |
| On demand only, with no connect scan | **REJECT** | The first Cmd+T after every launch would show nothing, and the person would have to know to visit Settings first. `signInToConfirmedMachines` in `src/main/sessions/core.ts` already prepares every confirmed machine at launch, so the connect scan makes the answer present within seconds of launch at no gesture cost. On demand is the second half of the pair, not the whole of it. |

**The rule, in one line.** Scan when the connection is made, learn from every create, and let a person ask
again. Three triggers, two of which are free.

---

## 3. Where the answer lives

| Store | Verdict | The deciding reason |
| --- | --- | --- |
| Memory, `Map<machineId, {generation, ...}>`, checked against `machineGeneration(machineId).generation` | **TAKE** | It is the lifetime of the value the answer is derived from (section 1.1), it is the shape five caches in this layer already use (section 1.2), and the generation check invalidates it for free on every reconnect and every server birth. It also costs no schema, no migration and no file. |
| `machines.json`, through `src/main/machines/store.ts` | **REJECT** | Three separate reasons and each alone is enough. It is the person's own file and its header says Tortie writes it only when a person adds or removes a machine. `MACHINE_ROW_KEYS` in `src/shared/machines.ts` drops a row WHOLE when it carries a key not on that list, so a cache field would need a schema change and would break every hand-edited file written against the old shape. And `writeMachines` in `store.ts` rewrites the whole file and reloads it, so a scan would rewrite a person's configuration file as a side effect of connecting. |
| Tortie's own record directory, `<userData>/gmux/machines/`, via `machineRecordDir` | **REJECT, but it is the only defensible disk option** | It is Tortie's own bookkeeping and its header says nobody should hand edit it, so the objections above do not apply. The objection that does apply is invalidation. A record keyed by machine id alone survives `forgetMachine`, and machine ids are chosen by the person, so a machine removed as `macpro` and re-added as `macpro` pointing at a different host would read the previous machine's agent list. The generation check catches exactly that case and a file keyed by id cannot. If a later phase must persist, it persists the generation-checked answer together with the host, the user, the port and the instant, and it is read only by a surface that prints a date. |
| The manifest | **REJECT** | CLAUDE.md makes the manifest the source of truth for restore. An agent install list is not durability state, it is a fact about a machine's current disk. It would cost a migration, it would move `MANIFEST_SCHEMA_VERSION` past 16, and `src/main/machines/remote-record.ts` exists precisely so that "what can a remote path do to the manifest" is one small module. Widening that boundary for a cache is the wrong trade. The manifest already persists paths on other machines in `remote_projects`, and every one of those is a folder a PERSON chose, not a machine's answer about itself. |

### The shape

```
// src/main/machines/remote-agents.ts, beside remote-argv.ts
interface MachineAgentScan {
  readonly generation: number;   // the connection this answer belongs to
  readonly at: number;           // epoch ms, for the sentence a person reads
  readonly loginPath: string;    // the list it was taken against
  readonly present: ReadonlyMap<string, string>;  // agent id -> absolute path over there
  readonly absent: ReadonlySet<string>;           // ids a COMPLETED walk did not find
  readonly searched: number;     // distinct folders in the walk
  readonly skipped: number;      // entries not sent, being globs and variables
}
const scans = new Map<string, MachineAgentScan>();
```

**Three states per machine and agent, and the third one is the whole safety design.**

| State | What it means | What a surface may do with it |
| --- | --- | --- |
| present | a completed walk found an executable file, and the path is held | draw the agent normally |
| absent | a completed walk tested every folder and found no file | label the agent, never remove it, and name the rescan |
| unknown | no scan for this generation, the machine is not connected, the scan failed, or the scan timed out | draw the agent normally and let the create path answer |

`unknown` is the default. It must never disable anything. Everything in section 5 follows from that one
rule.

---

## 4. Invalidation, one case at a time

### 4.1 An agent installed over there later

Not observable from this Mac, and nothing in this design pretends otherwise. The held answer says absent
and stays wrong until one of three things happens.

| What fixes it | How long it takes | Cost |
| --- | --- | --- |
| The person presses rescan for that machine | one round trip | one batched call |
| The person presses Prepare for that machine | one Prepare | 25 to 28 calls that were going to happen anyway |
| Tortie is quit and launched again | one launch | `signInToConfirmedMachines` prepares every confirmed machine |

The copy on the absent state has to name the first of these, or a person is stuck reading a label with no
route out. That is the whole reason the operator asked for a rescan control, and it is why the control is
not optional decoration.

**A timer is still rejected here.** An install on another machine is a thing a person did with their own
hands. The event that should refresh the answer is the person coming back to Tortie and pressing
something, not a clock.

### 4.2 A program search list that changes

Already handled, and by construction rather than by a new mechanism. The scan's search list IS
`machineGeneration().remotePath`. A list that changes on the far side is picked up by the next
`captureRemotePath`, which runs inside `ensureRemoteServer` on every Prepare, and that same Prepare is the
scan's trigger. The two are re-read together or not at all.

The failure this closes is worth naming, because a persisted scan would reopen it. A scan taken against a
ten folder list, kept across a quit, and read after the person edited their login files over there would
report absent for an agent now on a folder Tortie never tested and never recorded.

### 4.3 A machine that is forgotten

**Today, forgetting a machine drops none of the five per-generation caches, and that is a defect the phase
should fix while it is in this file.** `forgetMachineSessions` in `src/main/machines/tombstone.ts` calls
five functions, being `forgetMachineRows`, `stopCapturingMachine`, `stopHarvestingMachine`,
`stopSyncingMachine` and `closeControlPlane`. None of them clears `walks`, `homes`, `facts` or
`foreignMemo`, and `machines:remove` in `src/main/machines/ipc.ts` does not clear `remoteContexts` or
`generations` either. `forgetRemoteProjectWalk` exists and has exactly one caller, being
`src/main/machines/remote-clone.ts`. `resetRemoteMachineHomesForTests` has no production caller at all.

Nothing has gone wrong yet because `forgetMachine` drops the confirmation record, so a re-added machine
must be confirmed again, and confirming leads to a Prepare which bumps the generation and invalidates
everything keyed by it. That is luck resting on one link. The scan map should be dropped explicitly in
`forgetMachineSessions`, and the phase should drop the other three there in the same commit, because a
cache for a machine nobody has agreed to is a cache with no owner.

---

## 5. Pricing both errors

### 5.1 A false absent, being Tortie saying the agent is not there when it is

**What it costs.** The person cannot start an agent that is running on that machine, and Tortie is telling
them something false about their own computer.

**This is not hypothetical, it is a defect this product already shipped and already fixed once.** The
header of `src/main/machines/remote-argv.ts` records it. Until Phase 84 the question was one
`command -v` through the login shell, that answered nothing on the operator's Mac Pro, and Tortie refused
to create a claude session on a machine where claude sat at `~/.local/bin/claude` and two of Tortie's own
claude sessions had been running for days. The header's own sentence is that there was no pane, no row and
no way forward from inside the app.

**Why it has no landing.** If an absent answer disables the tile, the person cannot press it, so they
cannot reach `remoteCreate` step 5, so they never see `noRemoteProgramRefusal` and never learn how many
folders were tested or which ones. The information that would fix their belief is behind the door the
wrong answer just locked.

### 5.2 A false present, being Tortie saying the agent is there when it is not

**What it costs.** One create gesture. The person picks the agent, types a name, presses Create, and
`remoteCreate` refuses at step 5.

**What is NOT lost, checked in `remoteCreate`'s own ordering.** Step 5 runs before step 7 and step 8, so
no manifest row is written, no `new-session` line is sent, no pane opens and nothing starts on the far
side. The sentence they read is `noRemoteProgramRefusal`, which since Phase 84 carries the folder count
for exactly this reason, so a person can tell "Tortie looked in 17 folders" from "Tortie asked one
question and gave up".

### 5.3 The verdict, and the design that follows

**The false absent is worse.** The false present already has a correct, safe, informative landing that was
built and worded in an earlier phase. The false absent has none, and it removes the route to the
explanation.

**So the design is that the scan LABELS and never LOCKS, and the create path stays the authority.** Stated
as rules a builder can check.

1. `unknown` never disables anything. Not scanned yet, machine not connected, scan failed, and scan timed
   out are all `unknown`.
2. Only a walk that COMPLETED and found no file may produce `absent`.
3. An `absent` tile stays reachable, stays clickable, and says why. This is not a new pattern. It is what
   `AgentGrid.tsx` already does on this Mac for a not-installed agent, where `unusable` sets
   `aria-disabled` and drops `ENTER_SUBMITS_ATTR` while the tile keeps its `onClick`, keeps its Tab stop,
   and shows "not installed" in its right-hand slot. The comment there says `aria-disabled` describes a
   tile rather than removing it.
4. The create path never reads the scan map to decide whether to proceed. It calls `findRemoteProgram` as
   it does today and it writes the result back. If the map and the machine disagree, the machine wins and
   the map is corrected.

Rule 4 is what makes the whole feature safe to get wrong. The scan can be stale in either direction and
the worst outcome is a label that is briefly out of date, because no code path ever acts on it.

---

## 6. What it costs in round trips

Counted from the tree this session, not estimated.

`ensureRemoteServer` in `src/main/machines/remote-server.ts` sends, per Prepare, one `list-sessions`
verdict, one boot pair only when the server is born, one login shell read for the program search list, one
`set-environment`, then one `set-option` and one `show-options` for each row of `remoteBootOptions()`.
`SERVER_OPTIONS` in `src/main/tmux/server-options.ts` has 11 rows. `prepareMachine` reads the version
before that with one call, and a second when the first finds no server.

| Sequence | Calls |
| --- | --- |
| Version read in `prepareMachine` | 1 to 2 |
| `remoteServerVerdict` | 1 |
| Boot, only on a server birth | 1 |
| `captureRemotePath` | 1 |
| `set-environment -g PATH` | 1 |
| `set-option`, one per row | 11 |
| `show-options`, one per row | 11 |
| **Prepare total** | **25 to 28** |

Research 55 measured a warm multiplexed call on the operator's tailnet at 35.9 ms at the median
(`docs/research/55-remote-project-folder.md`, table at line 143). At that rate a Prepare is roughly 0.90 s
to 1.00 s of round trips.

| Scan shape | Added calls | Added time at 35.9 ms | Share of a Prepare |
| --- | --- | --- | --- |
| One batched call for every agent | 1 | about 36 ms, and 42.3 ms was measured for the comparable batched `repo-find` | 3 % to 4 % |
| One `program-find` per agent, 11 agents | 11 | about 395 ms | 39 % to 44 % |

The batched shape is the right one and investigator 2 owns proving it. The number that matters for THIS
question is the first row. A scan folded into Prepare is a rounding error on a gesture that already costs
about a second, which is what makes the connect trigger affordable and the timer unnecessary.

### How much work the far side does

`AGENT_REGISTRY` in `src/main/agents/registry.ts` holds 13 entries. 11 carry `launchable: true` and 2 do
not, being `cursoride` and `copilotide`, which are IDEs that never become a tmux pane. Each launchable
entry has exactly one `launch.argv[0]`, so the scan tests 11 names, being claude, cursor-agent, codex,
gemini, droid, codewhale, agy, muse, qwen, pi and grok. Configured agents from `agents.json` add to that
list through the same merged table `agentTable()` reads for local detection.

The folders are the union of two lists per `remoteSearchDirs` in `src/main/machines/remote-argv.ts`. The
install side is `extraBinDirsFor` in `src/main/tmux/resolve.ts`, which is 8 folders, plus the plain
`extraProbeDirs` entries the 11 agents name. Counted from the registry, those are `~/.claude/local`,
`~/.cursor/bin`, `~/.npm-global/bin`, `~/.local/bin` and `~/.grok/bin`, and 4 of the 5 are already in the
8, so the install side is 9 distinct folders. Two entries are never sent, being codex's `$NVM_BIN` and
`~/.nvm/versions/node/*/bin`, because `NOT_A_PLAIN_FOLDER` refuses a value or a glob another computer
would expand.

The Mac Pro's login shell list was 10 folders when the `remote-argv.ts` header table was written on
2026-08-18, and the measured claude count of 17 is consistent with one folder overlapping between the two
lists. On that arithmetic a batched scan walks at most 19 distinct folders and at most 209 folder and name
pairs. I did not re-measure the login list this session and I say so again in section 8.

### One correction worth carrying into the phase

`searched` on `RemoteProgramAnswer` is computed by `remoteSearchCount` BEFORE the call, so it is the size
of the search space rather than a count of tests the far side ran. `PROGRAM_FIND` in
`src/main/machines/remote-scripts.ts` breaks out of both loops on the first hit. On the refusal path the
two numbers agree, because nothing was found and every folder was tested, so the sentence a person reads
is correct. On the success path the log line in `remoteBinFor` says "after 17 folder(s) were tested" for a
program that may have been found in the first folder. A batched scan should report the space it covered
and should not describe it as work performed.

---

## 7. Is `project-counterpart.ts` the precedent?

| Property of `findProjectOnMachine` | Follow it? | Why |
| --- | --- | --- |
| The answer is a `Map` keyed by machine, holding the generation it was read under, checked before reuse | **Yes** | It is the container this design needs and it is already the layer's habit, shared with `homes`, `facts` and `foreignMemo`. |
| Nothing is written to disk and nothing survives a quit | **Yes** | Section 1.1 and the opening give the mechanical reason, being that the value it derives from does not survive either. |
| One call carrying every answer, rather than one call per item | **Yes** | Its own header records 9 folders as 9 calls at 409.7 ms against the same 9 in one call at 42.3 ms. The cost is the round trip and not the work. |
| An explicit forget function called by the one thing that changes the answer, being `forgetRemoteProjectWalk` called from `remote-clone.ts` | **Yes, and go further** | The equivalent here is folding the create path's own result back, which is better evidence than a rescan and costs nothing. |
| The read runs lazily, on the machine choice changing, with the person waiting inside the sheet | **No** | The agent board is drawn before a machine is chosen and must be right at first paint. |
| A doubtful answer produces NO action, being two or more matches filling nothing | **Yes, mirrored** | It refuses to act when it is not sure. The agent scan refuses to REMOVE a choice when it is not sure. Same rule, opposite direction, because here the action is subtraction. |

So the precedent holds for storage and breaks for triggering, and where it breaks,
`src/main/agents/detection.ts` supplies the missing half.

---

## 8. What I did not measure

| Not measured | What would measure it |
| --- | --- |
| The wall clock, answer bytes and folder count of a batched probe against the Mac Pro | Investigator 2 owns this. One read-only call through `runRemoteRead` with a timer around it, compared against 11 separate `program-find` calls, checked against `REMOTE_SCRIPT_MAX_BYTES` of 131,072 and the 15,000 ms `REMOTE_RUN_TIMEOUT_MS`. |
| The Mac Pro's login shell program search list today | One `captureRemotePath` and a count of the colon separated entries. The figure of 10 comes from the `remote-argv.ts` header dated 2026-08-18 and I did not refresh it. |
| How many machines are configured | `machines.json` lives under his userData and the charter forbids opening it. The count changes the Prepare cost linearly because `signInToConfirmedMachines` is sequential. |
| How often Cmd+T is opened per run, and how often an agent is installed on a machine | Nothing in the tree counts either today. The ratio decides whether the rescan control is pressed monthly or hourly, and it is the only input that could argue for a timer. Adding a counter to `machines:rows` would answer the first. |
| What a folder with no read or execute permission does to the answer | `[ -x "$d/$n" ]` returns false for it, so it reads as absent, and a batched script should report the folder count it could not enter rather than folding it into "not found". This needs a real machine with such a folder, and I created none. |
| Whether an agent's own children can find the program the scan located | Out of scope here and already recorded as untrue on `remoteCreate`, whose header says a pane's children get the four directory PATH. |

---

## 9. What should NOT be built

Named plainly, because the charter asks for it.

1. **No timer, at any cadence.** Section 2 gives the reason and section 4.1 gives the alternative.
2. **No disk file for the scan.** Section 3 rules it out and the opening gives the mechanical reason.
3. **No manifest table, and no migration past version 16 for this.**
4. **No scan on the Cmd+T sheet opening.** A keystroke does not open a network read.
5. **No install route from the scan.** CLAUDE.md refusal 3 binds. The Settings view is a read and the
   absent state names the rescan, never an install command that Tortie would run over there. This is the
   one place the local pattern must NOT be copied, because the local not-installed tile does offer an
   install command and running one on somebody else's machine is a different act entirely.
6. **No badge, no count and nothing that rises on its own.** The absent state is a label on a tile that is
   already there.

---

## 10. The lines a builder can check

1. New module `src/main/machines/remote-agents.ts`, holding `scans` as a `Map<string, MachineAgentScan>`,
   with a generation check that reads `machineGeneration(machineId).generation` and nothing else.
2. The scan runs in `prepareMachine`'s success arm in `src/main/machines/prepare.ts`, after
   `ensureRemoteServer` and beside `startMachineFeed`. A scan that fails does not fail the Prepare, which
   is the rule `MACHINE_FEED_NOT_STARTED` already sets for the feed.
3. The scan goes through `runRemoteRead` in `src/main/machines/remote-run.ts` and through no other door,
   so it inherits the connected-only check, the generation check on the answer and the byte cap.
4. `remoteBinFor` in `src/main/machines/remote-sessions.ts` writes its answer back on both arms, being the
   absolute path on success and the agent id into `absent` on the refusal.
5. `forgetMachineSessions` in `src/main/machines/tombstone.ts` drops the scan for that machine, and drops
   `walks`, `homes` and `facts` in the same commit.
6. No surface disables an agent for `unknown`. A conformance assertion should read the three-state
   function directly, so the rule is executable rather than documented.
7. `npm run conformance:machines` gains one condition, being that no module outside
   `remote-agents.ts` writes to `scans` and that the create path reads `findRemoteProgram` rather than the
   map.
