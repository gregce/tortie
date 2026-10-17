# Phase 346 — "the phone being able to start new sessions, as I believe that is the major missing piece" — start a session from the iPhone — SPEC

Written by the spec step on 2026-10-16 in `/private/tmp/wt-p346`, a detached worktree at origin/main `0b87d0af`
("docs(backlog): 345 landed, his research 142 answers, 337.5 queued, three phases started"). `0b87d0af` is docs only over
`80daa9fd` (Phase 345, one iPhone with several Macs), so the parent measured is `0b87d0af` and its `ios/` is build 11's.

**What binds this spec, in order of authority.** His answers of 2026-10-14 to research 141's eleven questions (running
log, `docs/BACKLOG.md`, the line "HE ANSWERED RESEARCH 141's ELEVEN QUESTIONS"), which OVERRIDE the entry where they
differ; his rulings of 2026-10-16 in the entry ("The build number does not move", "It builds on Phase 345 as landed");
the entry `docs/BACKLOG.md` "## Phase 346"; research 141 §4.3 (`docs/research/141-several-macs-and-starting-sessions-from-the-phone.md:457-533`);
333.12's design as landed (`build/p33312/SPEC.md` §1, §4) and 333.12.1's face (`build/p333121/SPEC.md` D7).

**His answers, as this phase reads them.** (5) "no face id to start a session": Start asks for no owner check (the entry's
"Face ID on every Start" is overridden). (6) the Mac's sealed launch defaults apply, said as one line, and "you should
see the installed available icons for the provider harnesses but ONLY the ones that are installed to save space". (7) no
Shell. (8) remote projects in the first Start, "just like if you were starting it from the connected mac". (9) Remove of
one phone keeps the others working with no Allow (landed in 333.12, nothing to do here). (10) only the Allow whose lines
name a route allows it: Start's route waits for exactly that Allow. (11) See a sample shows New session, and Create there
says nothing ran. (2) and his 2026-10-16 ruling: starting belongs to the Mac on screen (its own space) and starts on that
Mac only. (1), (3), (4) need nothing here.

**The spec step MEASURED before it wrote** (§12 holds every command, exit code and number): it re-read every `file:line`
the entry cites at `0b87d0af` and corrected those 345, 333.12 and 333.12.1 moved (§2); read the parent's compiled agent
table, flag presets and default settings through the pinned tsx (M1); timed the start-nothing install read over a 30-folder
scratch PATH (M2); drove 333.12's own allowed-route functions over a planted twelfth route to prove Start waits exactly as
that design says (M4); and computed the route membership pins (M3). It started no Electron, no Simulator, no agent and no
model turn, took no lock slot, read nothing under `~/.ssh`, `~/.claude`, `~/.codex`, `~/Keys`, his keychain or his live
Tortie profile, and ran both tsx measurements under a scratch HOME and ZDOTDIR with `HISTFILE=/dev/null` and
`TERM_SESSION_ID` unset. History: `~/.zsh_history 737736 1792023873`, `~/.bash_history 23166 1790702242` at the start;
neither moved ACROSS any command of this step; `~/.zsh_history` moved ONCE BETWEEN two of this step's commands, to
`737941 1792173359` (205 bytes, about 80 s before it was noticed), written by a shell that is not this step's (a plain
tool command bracketed by two stats moves nothing). Disk: 115 GiB free.

---

## 0. The hard rules, stated once

Every builder, the integrator and every verifier holds these. A rule broken is a stop, not a note.

1. **NEVER commit, stage or stash.** `/Users/gdc/gmux` is READ ONLY. `git diff 0b87d0af` in the worktree is exactly this
   phase's delta.
2. **NEVER `-L gmux`.** Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids you started, in a `finally`.
3. **Never read** his keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex`, any conversation store or his
   live Tortie profile (a Simulator's own keychain is fine). Real data means committed fixtures.
4. **His shell history.** Before and after every command that starts a shell, the app or a Simulator, record ONLY
   `stat -f '%z %m' ~/.zsh_history ~/.bash_history`. A move ACROSS one of your commands is the stop. Scratch HOME and
   ZDOTDIR, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset.
5. **NO MODEL TURN.** Every agent the app starts is a stand-in: `build/p318/stand-in.mjs` behind scratch `claude` and
   `codex` wrappers, and this phase's `build/p346/argv-stand-in.mjs` behind the other non-hidden bare names (§6.1);
   `build/hidden-agents.mjs` before EVERY launch. Never start `gemini`, `qwen`, `agy` or `grok`, not even for a version.
6. **NO REAL TAILSCALE, DNS OR APNs**: the stand-ins `probe:p313` and `probe:p316` use. No ssh to a real host: another
   machine is `build/with-scratch-machine.mjs`'s loopback machine with the quiet shell. Never `smoke:remote` or
   `smoke:machines`. Never import a `build/` script to inspect it; read it as text.
7. **Simulators only through `build/simulator-run.mjs`** (`withSimulator`; `P316_DEVICE` and `P316_RUNTIME` for
   `test:ios`), never Simulator.app, never a screenshot: a visual claim is a frame or a label XCUITest read.
8. **Every Electron through `build/electron-run.mjs` inside `build/harness-socket.mjs`**, killed in a `finally`. A new
   script reaching it raises `HELPER_USER_FLOOR` (176 on main, 177 after this phase). No new script reaches
   `withSimulator` (the phone's arms are a group of `probe:p316`, which already does), so `SIMULATOR_USER_FLOOR` stays 4
   and `build/assert-simulator-teardown.mjs` (Phase 333.4.1's file) is not touched.
9. **Every process you start, end in a `finally`.** Xcode derived data only under
   `/private/tmp/claude-501/-Users-gdc-gmux/69469eba-62a7-4552-8d1e-1ba54287a99f/scratchpad/p346/<role>/dd*`.
10. **The lock has three slots**: `zsh /private/tmp/tortie-ops/lock.sh try p346` prints the slot or exits 1 (retry every
    60 s in a NEW command); release with `zsh /private/tmp/tortie-ops/lock.sh release <slot>` on the same line. Every
    `test:ios`, probe, Simulator or Electron run holds one. Builders and the integrator launch no Electron except a
    probe's own `--grader-self-test`, which launches none.
11. **Disk**: `df -h /` before any build; under 8 GB free, wait and report. **Install nothing.**
12. **THE BUILD NUMBER DOES NOT MOVE**: `CURRENT_PROJECT_VERSION` stays 11; `conformance:ios` rule (s) reads 11.
13. **Two phases run beside this one and may land first.** 333.4.1 owns `ios/Tortie/Screens/Screen.swift`,
    `ScreenScroller.swift`, `ScreenKeyField.swift`, `ios/Tortie/Sample/SampleBar.swift`, `build/p3334/**` and
    `build/assert-simulator-teardown.mjs`; 337.5 owns `ScreenSelection.swift`, `ScreenScroller.swift`,
    `ScreenRows.swift` and `conformance:ios` rules (al) and (aq). This phase edits NONE of their Swift files. It shares
    `build/conformance-ios.mjs` and `build/p316/ablation-ios.mjs` with 337.5 (different rules: this phase adds (bb) and
    widens (ab), (s)-unchanged, (t), (v), (az), (ba)), and possibly `build/p316/test-ios.mjs` and
    `ios/TortieUITests/P316DriveUITests.swift`: the integrator merges onto whichever landed first.

---

## 1. The answer first

A phone that pairs with a Mac running this build can start a session there. On the Sessions tab of the Mac on screen a
"+" sits at the trailing end of the title row. It opens **New session**: the projects open in Tortie on that Mac (its own
and those on its machines), and a row of the marks of ONLY the agents installed where the chosen project lives. The
Mac's default agent is chosen when it is installed there; a sealed safeguard-off launch default that would apply is said
in one line under the marks. **Create** sends three things, the project's id, the agent's id and a write id, and nothing
else. The Mac re-reads all of it, builds exactly the `CreateSessionInput` its own one-press create (`quickCreate`) builds,
starts it through its one guarded create, and answers the new session's id and name; the phone closes the sheet and opens
that session's Terminal. No Face ID is asked (his answer 5). Nothing on the phone chooses a path, a flag, a name, a login
or a machine.

The Mac side is ONE new signed write route, `start` (`POST /v1/start`), through the one write path and its one ledger,
and ONE optional key, `start`, on the `/v1/sessions` answer the Sessions tab already reads, which carries the offer
(and says `waiting` while Start waits for its Allow). Under 333.12 the route WAITS on every updated Mac that already holds
an agreement: the door answers it `404 route` before the body, the sessions answer says `waiting`, the phone draws no "+",
and Settings then Phone shows `New: start sessions from your phone` above Allow until he presses the Allow whose lines
name it. A first setup allows it with everything else (333.12 J39).

### 1.1 The decisions, each with its reason

| # | Decision | From |
| --- | --- | --- |
| D1 | **ONE new route, `start`: `{ id: 'start', method: 'POST', path: '/v1/start', reads: false, windowOnly: false, signed: true }`, and the offer rides `GET /v1/sessions` as an optional key `start`.** This departs from the entry's mechanism 1 and research §4.3 ("two signed routes: a read, the offer, and a write"). Why: (a) the phone needs a key on the sessions answer anyway, because a route that waits answers 404 and a 404 on a signed read routes the phone to Pairing (`ios/Tortie/Screens/SessionsScreen.swift:411-435`); with the offer IN that key, the "+" and the sheet can never disagree; (b) one Allow line, one `New:` line and one honesty clause, where two routes draw two `New:` lines for one feature (333.12.1's composer draws one per waiting route, M4); (c) less surface: no second ledger row, no second gate family, no extra round trip when the sheet opens. The offer starts nothing and costs about 2 ms a read (M2). The offer is gated by the SAME served set: it is composed only while `start` is served | entry mechanism 1, 2, 4, 10; research §4.3; M2, M4 |
| D2 | **Start waits for an Allow exactly as 333.12 designs it**, with no new mechanism: `start` is not in `LEGACY_ALLOWED_ROUTES` (that list never grows), so a store that never allowed it reads the eleven, hashes as before, serves the eleven and lists `start` in `routesWaiting` while an agreement is on record (M4: served 11, waiting `['start']`); a first setup (`never`) proposes the whole table and its Allow allows `start` (M4: proposal 12); only the Allow whose lines name it allows it (his answer 10); the pairing Allow does not (333.12 D10). A downgrade to the parent reads a store naming `start` as not whole (M4: `allowedRoutesOf` → null), so the eleven, and the door is never wider | 333.12 D1 to D6, D14; his answer 10; M4 |
| D3 | **Its words, each in its one owner.** `WRITE_CLAUSES.start` and the ledger row's `clause` (Details' `Lets an allowed phone … and start a session in a project open in Tortie, on this Mac or another machine`): `'start a session in a project open in Tortie, on this Mac or another machine'`. `POCKET_HONESTY_ADDED.start`: the same words. `POCKET_FACE_CLAUSES.start` (the face's `Your phone can` row): `'start sessions'`. `POCKET_NEW_ROUTE_WORDS.start`: `{ title: 'start sessions from your phone', sentence: 'An agent installed where the project is, with your launch defaults.' }`. 333.12.1 D7 had drafted `Your phone could start Claude Code or Codex in a project here.`; his answers 6 and 8 make that false (any installed agent, remote projects too), so the sentence is rewritten. No word names Face ID (317 D13: the Mac cannot verify it) | his answers 6, 8; 333.12 D13; 333.12.1 D5, D7; CLAUDE.md "Just enough words" |
| D4 | **The contract.** `POCKET_ROUTE_IDS` gains `'start'` (last). `POCKET_WRITE_ROUTE_IDS` becomes `['end', 'choose', 'say', 'keys', 'start']` (R2 ties the table's write rows to it, and `describePocketDoor` names the clauses in this order, so start's clause is last). A new `POCKET_SESSION_WRITE_IDS = ['end', 'choose', 'say', 'keys'] as const satisfies readonly PocketWriteRouteId[]` and `PocketSessionWriteId`: the four writes that act on one named session, which are exactly the frozen phone's `PocketWriteAnswer.Verb`. `PocketWriteAnswer.verb` is narrowed to `PocketSessionWriteId`, so `gate:onlyadd` A3 (`build/assert-door-only-adds.mjs:1066`, `:1215`) never sees a word the frozen phone refuses | entry mechanism 2; research 141 §2.6 item 5 |
| D5 | **Start's own answer, `PocketStartAnswer`**, composed field by field in main and these six fields are all of it: `verb: 'start'`, `write` (the echoed id, `""` only on the one `refused` `malformed` answer that could read none), `outcome: 'done' \| 'refused' \| 'failed' \| 'busy'`, `reason: PocketStartReason \| null` (non-null exactly when `refused`), `sentence: string \| null` (null exactly when `done`), `session: { id: string; name: string } \| null` (non-null exactly when `done`). `PocketStartReason = 'malformed' \| 'project' \| 'agent' \| 'machine' \| 'interpreter' \| 'often' \| 'stopped'`. **The phone reads `reason` as an OPEN word** and draws the sentence: a later Mac may add a reason without a frozen phone refusing the whole answer (the lesson of `PocketWriteAnswer.Reason`'s closed twelve) | entry mechanism 2; research 141 §2.6 item 5 |
| D6 | **The body is exactly `{agent, project, write}`**, sorted keys, read as End's is: ONE `JSON.parse` inside the write path's `objectOf`, `Object.keys(value).sort().join(',') === 'agent,project,write'`; `write` 32 lowercase hex; `project` 1 to 64 of `[A-Za-z0-9-]` read one character at a time (every project id is a `randomUUID()`, `src/main/manifest/projects-repository.ts:100`, `:112`; `src/main/sessions/core.ts:3983`); `agent` compared with `===` against each of `LAUNCHABLE_AGENT_IDS` (`src/main/agents/registry.ts:2027-2029`, the thirteen compiled launchable ids, M1) and nothing else, so `shell`, an id only `agents.json` holds, a cased or padded id are `malformed` before the ledger (his answer 7). Body cap 512 in `POCKET_WRITE_BODY_CAPS` (`src/main/pocket/door/limits.ts:77`): the worst legal body is about 140 bytes | entry mechanism 3; his answer 7 |
| D7 | **The offer** (`PocketStartOffer`, §3.2): the projects open in Tortie on that Mac in `listProjects()`'s order (`src/main/manifest/projects-repository.ts:153-159`: this Mac's alphabetically, then each machine's), at most `POCKET_START_PROJECTS_MAX = 200`; one `place` per place a listed project names (`local`, then each machine id in first-appearance order) with whether it is `ready`, whether its agents were `read`, and the ids of the agents INSTALLED there; one `agents` row per agent any place names, in registry order, with its drawn name, its mark key (`iconKey`) and `danger`, the labels of its sealed safeguard-off launch defaults joined `, ` or null; `chosen` (D10); `defaultAgent` (D11). Every drawn string clipped by `clipSessionText` (200 characters, `src/main/pocket/routes.ts:808`) | entry mechanism 4; his answers 6, 8 |
| D8 | **"Installed", read without starting anything** (his answer 6; research §2.4 item 9). This Mac: the last RESOLVED detection scan when one exists (`peekDetectedAgents()`, `src/main/agents/detection.ts:719-728`: `installed === true`, launchable, a compiled id); else, for each compiled launchable id, the MERGED row the create path itself reads (`currentAgentTable()`, `src/main/config/store.ts:115-117`, so an `agents.json` patch that renames a binary, `build/hidden-agents.mjs`'s among them, is honoured and a real binary of a hidden row is never offered), its candidates by `binaryCandidatesOf(id, merged)` (`src/main/sessions/launch-plan.ts:159-166`) resolved by `resolveBinaryAgainst` (`src/main/tmux/resolve.ts:1204-1220`) against `userPathNow()`, a NEW synchronous accessor in `src/main/tmux/resolve.ts` answering the captured login-shell PATH once a capture settled and `null` before (boot starts the capture in `ensureServer`, `src/main/tmux/supervisor.ts:459-463`), with the merged row's `extraProbeDirs` then `extraBinDirs()`, exactly as `detectOne` walks (`detection.ts:520-538`); else `read: false` and no agent. Another machine: `machineAgentsView(id)` (`src/main/machines/machine-agents.ts:372-407`), `present` ONLY ("only the ones that are installed"); every agent `unknown` reads `read: false`. The offer names no `listDetectedAgents`, `rescanAgents`, `getUserPath`, `installUserPath`, `resolveBinary(`, `scanMachineAgents`, `spawn`, `exec`, `fork` and no `await` | his answer 6; entry mechanism 4; M2 |
| D9 | **What the phone draws on a Mac that has not allowed Start yet: NOTHING** (research §4.3: "While starting waits, the phone draws nothing, and the Mac's Phone section shows the waiting line"). The sessions answer still carries `{ state: 'waiting' }` there (absent on a Mac older than this phase, and on a facts with no `start`, being the push seam and the tests), so the probe can read the state and a later round can draw a hint without a Mac change. §13 Q1 asks him whether a dimmed "+" with one line should show instead; this build draws nothing | research §4.3; §13 Q1 |
| D10 | **The project preselected**: the open project holding the session with the latest `createdAt` (ties by the larger id) among sessions on an open project (matched by `sameTarget(targetOfSession(s), targetOfProject(p))`, the renderer's own rule, `src/renderer/state/sessions-slice.ts:1729-1736`); with none, the first listed project; with no project, null. "Where you last started something" is where you are working; it reads one list and orders nothing the Sessions tab orders (§13 Q2) | entry mechanism 10 ("the spec's measured rule"); §13 Q2 |
| D11 | **The agent preselected**: `defaultAgent` is `settings.defaultAgent` (`src/shared/settings.ts:29`; `'claude'` out of the box, M1) when it is a compiled launchable id, else null; the phone chooses it when the chosen project's place lists it, else that place's first agent; when the person picks another project, the agent stays when that place lists it, else the same rule | research §4.3 "The default is settings.defaultAgent" |
| D12 | **The act lives outside the door**, in the new `src/main/sessions/pocket-start.ts`, reached by a pass-through `start` in `createPocketWrites` (`src/main/sessions/pocket-writes.ts:167-225`), as `src/main/reply/` and `src/main/screen/` are. In this order, with NOTHING awaited from the first read to the create: the project re-read by id from `core.listProjects()` (gone: `refused` `project`); its place (`'local'` or `project.machineId`); for another machine, readiness (D7's `ready`; not: `refused` `machine`); the agent among the place's installed agents, read by the offer's own function (not: `refused` `agent`); `composeStartInput` (D13) over `core.listSessions()`, `getSettings()` and `getFlagCatalogViews()`; `still()` asked once more (false: `refused` `stopped`, POCKET_WRITE_SENTENCES.stopped); then `core.createSession(input)`, the one guarded create (`src/main/sessions/core.ts:3290-3294`). A throw is told apart by `isGmuxError` code ONLY, never by its text: `PROJECT_NOT_FOUND` → `refused` `project` with START_FOLDER_GONE; `AGENT_NOT_FOUND` and `AGENT_NOT_ON_MACHINE` → `refused` `agent`; `AGENT_INTERPRETER_MISSING` → `refused` `interpreter` (Start it anyway stays on the Mac, entry mechanism 5); anything else → `failed` START_FAILED. It sets no status, logs nothing and moves no focus on the Mac (no `setActiveSession`: a phone start must not take the Mac's window) | entry mechanism 5; research §2.4 items 1, 2; CLAUDE.md refusal 5 |
| D13 | **The `CreateSessionInput` is exactly `quickCreate`'s** (`src/renderer/state/sessions-slice.ts:1265-1303` and the `createSession` it calls, `:1092-1200`): `name` `<agent>-<n>` from the SHARED `nextOrdinal` over the project's sessions, then the SHARED dedupe; `projectPath: project.path`; for a project on a machine `projectMachineId` and `machineId` both that machine (the tab rule, `:1118-1124`); `agent`; `extraArgs` = `defaultLaunchArgs(agent, settings, catalogs)` (`src/shared/settings.ts:1380-1397`) only when non-empty; `capture: true` only when `captureDefaultFor(settings, agent)` (`:872-880`); and NO `cwd`, `startAnyway`, `login` or `signIn`. Method 1 re-derives it against the renderer's own store, byte for byte, per agent, local and remote (§8.3) | entry mechanism 5, 6; research §4.3 |
| D14 | **One rule for names.** `nextOrdinal` (`src/renderer/state/sessions-slice.ts:464-472`) moves BYTE FOR BYTE to the new `src/shared/session-names.ts`, beside `dedupedName(name, existing)` (the loop at `:1163-1172`); `sessions-slice.ts` re-exports `nextOrdinal` (so `store.ts`, `CreateSessionModal.tsx:121`, `:738`, `:820` and `launch-agent.ts:19`, `:52` keep their imports and calls) and calls `dedupedName`; `pocket-start.ts` calls both. One definition each | entry mechanism 6 |
| D15 | **Never taken from the phone**: a path, a working folder, arguments, environment variables, a name, a login, `signIn`, `startAnyway`, a first prompt, a machine id, folder creation, a clone or a worktree. The body has no key that could carry one (D6), and `NS4` reads `composeStartInput`'s every property's source (§5.1) | entry mechanism 5; research §4.3 |
| D16 | **Limits on the Mac, each declared once in `src/main/pocket/writes.ts`.** ONE start in flight per Mac across every phone (`startInFlight`, never a key inside `sessionsInFlight`, `writes.ts:579`); one write in flight per phone across every verb, start included (the shared `phonesInFlight`); `START_RATE_MAX = 6` starts per phone per `START_RATE_WINDOW_MS = 60_000`, counted at the claim. Why 6 a minute: a person at the sheet takes several seconds per start (pick, Create, the Terminal opens), so six is above any human pace, and a stolen key is held to six agent processes a minute. No ceiling on live sessions: it would refuse his own starts (research §4.3). The probe's timing arm (S5) measures real creates against these numbers before the verifier passes them | entry mechanism 7; research §2.6 items 2, 4 |
| D17 | **A lost answer.** The ledger (`writes.ts:102`, 120 s, memory only) keys a start on (phone, `start`, write id). Asked again with the same id while it runs: `busy` marked `acted`, sentence START_STILL; after: the recorded answer, carrying its session. The phone keeps the id 60 s (`KeptStart`: the Mac, the project, the agent, the id, when) and shows `Try again` in Create's place; it re-reads Sessions FIRST, then a press of `Try again` with the same project and agent inside 60 s sends the SAME id, once per press; any other choice, 60 s, or the app leaving forgets it. STATED LIMIT: the ledger is memory, so a Mac that relaunches between a cut answer and Try again can start a second session, which Tortie never ends (his rule: ending is the person's) | entry mechanism 8; research §2.6 item 1; memory "Tortie never auto-ends a session" |
| D18 | **Busy, told apart in words.** Another start in flight on this Mac (from any phone): `busy`, START_BUSY. This phone's other write in flight (any verb): `busy`, `POCKET_WRITE_SENTENCES.busy` (true as it stands: "still doing the last thing you asked from this phone"). A full ledger: `busy`, `POCKET_WRITE_SENTENCES.busy`. None of these is recorded | D16, D17 |
| D19 | **Too many starts**: `refused` `often`, START_OFTEN, answered BEFORE the claim's pending entry and NOT recorded, so the same id can act once the window allows | D16 |
| D20 | **No Face ID on Start (his answer 5).** No owner check, `LAContext` or `evaluatePolicy` in any Start file. THE RISK HE ACCEPTED, stated in the phase and the commit body: a lost, unlocked phone whose Mac has every session ended can start an agent and then type into it, which it cannot do at the parent (research §4.3) | his answer 5 |
| D21 | **The phone's "+"** sits at the TRAILING end of the Sessions title row of the Mac on screen (`ios/Tortie/Screens/SessionsScreen.swift:684-700`, after the menu and Select), an SF Symbol `plus` labelled `New session`, drawn ONLY while the space's latest sessions answer carries an offered `start`, and `.disabled(` while End these takes taps (rule (aa) clause 6's pattern). Not on each project header: Show opens on Active, so a project with nothing running has no header (research §4.3) | entry mechanism 10; research §4.3 |
| D22 | **The sheet, New session**, laid out as his answers say: `Project` (a menu of the offer's projects, the chosen one first selected; a project on a machine shows its machine label; a project whose place is not `ready` is listed, dimmed, `Not connected`, and cannot be chosen); `Agent`, a row of the MARKS of the agents installed at that project's place and nothing else (44 × 44 pt buttons, the chosen one marked, each labelled for VoiceOver by its name), the chosen agent's name once under the row; the sealed-default line `Starts with <labels>` when the chosen agent has one; one line for the state (a refusal, no answer, no project, no agent); and `Create` (`Creating…` while it runs, `Try again` while a kept id matches). Just enough words: no paragraph | his answers 6, 8; CLAUDE.md UI rules |
| D23 | **The marks are the Mac's own**: the thirteen compiled launchable rows' `iconKey`s (M1), generated from `src/renderer/assets/agents/<icon>.svg` by the new `build/p346/agent-marks.mjs` into `ios/Tortie/AgentMarks.xcassets/agent-<icon>.imageset/` as TEMPLATE vector images (`preserves-vector-representation`, `template-rendering-intent: template`), every `currentColor` written black and width and height set to the view box; droid's black plate is dropped and its glyph kept, as omp's favicon plate was dropped on the Mac (`src/renderer/icons/AgentIcon.tsx:24-30`), so every mark is one ink tinted by a token. A mark key the phone does not carry draws SF Symbol `terminal`. `Assets.xcassets` keeps the app icon alone (rule (r) unchanged). `agent-marks.mjs --check` is run by `conformance:ios` (bb8), so the phone's marks cannot drift from the Mac's | his answer 6 ("icons"); rule (r) |
| D24 | **Done**: the sheet closes, the space's Sessions list reads again, and `.session(mac: <the Mac that started it>, id:, name:)` is pushed on the Sessions tab (rule (ba) ba1), whose route opens the Terminal at its first answer (a local row is `running` before tmux exists, `src/main/sessions/launch-plan.ts:443`; `screenLive`, `src/main/pocket/routes.ts:892`; a remote create returns after the machine's list) | entry mechanism 10; research §2.4 item 10 |
| D25 | **Not done**: a refusal or a failure keeps the sheet with the Mac's own sentence and reads Sessions again (the offer refreshes); no answer says `Your Mac did not answer. If it started the session, it is in Sessions.`, reads Sessions again and offers `Try again` (D17); not taken (404) says `Your Mac did not take it. Nothing was started.`; withheld (the app left before the bytes were handed) says DoorWords' withheld sentence | entry mechanism 10; research §4.3 |
| D26 | **The phone decodes `start` LENIENTLY**: `try?` around `decodeIfPresent` of the sessions answer's `start`, so a malformed, unknown-state or over-cap offer reads as absent and NEVER fails the sessions answer. An offer with more than 200 projects, 64 agents or 201 places reads as absent (the phone's bounds equal the Mac's constants) | his no-regression rule; gate:onlyadd P1, P2 |
| D27 | **Per Mac space** (his answer 2 and ruling of 2026-10-16; Phase 345 D1): the offer is that space's sessions answer's, the write goes through that space's reader, the kept id lives on that `MacSpace` in memory (switching Macs never sends one Mac's id to another), Done pushes that space's route | 345 D1, D13 |
| D28 | **See a sample** (his answer 11): the sample's sessions answers carry an offer composed by the SHIPPING `composeStartOffer` over the made-up world (`build/p3333/sample.mjs`, rule (az7)); "+" opens the same sheet; Create says `This is a sample, so nothing ran.` and NOTHING leaves the phone: the sample's `start` answers not taken and is never asked over a network (rule (az)) | his answer 11; 333.3 |
| D29 | **Nothing else reaches Start**: no URL scheme, App Intent, Shortcut, widget, notification action or Siri phrase; none exists today and (bb7) keeps it so | entry mechanism 10 |
| D30 | **The Mac's surfaces**: no new Mac surface, so the native menus do NOT change (entry mechanism 12; the brief says so); Settings then Phone draws the waiting route through 333.12.1's composer with NO renderer edit (the words row of D3 is the only change). The renderer changes only `sessions-slice.ts` (D14) | entry mechanism 12; CLAUDE.md UI rules |
| D31 | **`src/main/harness/push-seam.ts` confirms the PROPOSAL**: `confirmNow` (`:643-649`) and `openDoorForPairing` (`:711-716`) hand `confirmDoor` `host.status().confirmLines`/`confirmHash` instead of `pocketConfirmStatus(host.fields())`'s, because from this phase a first setup's proposal (twelve routes) is not `fields()` (eleven), and `confirmPocketDoor` throws on a hash that is not the proposal's (`src/main/pocket/pairing.ts:625-632`). 333.12 D16 named this obligation for 346. `conformance:push` re-runs; `probe:p314` is OWED and is not run by this phase (it spends real model turns and starts Gemini, both refused here) | 333.12 D16; CLAUDE.md trigger table |
| D32 | **One log line per start**: `the phone's start: <outcome>` with `{ session }` (the new id, or `''`), never the project id or path, the agent, an argument, the write id or a sentence | writes.ts step 7 |
| D33 | **Tier 3**: a process started from a door on the public internet under his login, and session lifecycle; it claims every compiled agent and other machines. Two independent methods, one an attack, the parent measured, the app run with a per-row matrix (§8) | CLAUDE.md tiers; the entry |
| D34 | **New gate ids**: `conformance:pocket` NS1 to NS12 (§5.1); `conformance:ios` (bb), bb1 to bb10 (§5.3); `conformance:pocket:hostile` arms NSH1 to NSH14 (§5.2); `hostile-door.mjs` group `start` (§5.4); `probe:p346` arms S0 to S12 and RUN (§6.1); `probe:p316` group `start`, NP1 to NP11 (§6.2) | the house shape |
| D35 | **No CHANGELOG line is written by a builder** (two phases run beside this one and may edit it); the draft item goes to the main session (§10) | 333.12 D24 |

---

## 2. The tree at this head, re-read (the entry's citations, corrected)

Every citation the entry makes was read at `0b87d0af`. Moved or wrong ones, corrected:

| Entry says | At `0b87d0af` |
| --- | --- |
| `core.ts:3290-3293` createSession | `src/main/sessions/core.ts:3290-3294` (unchanged) |
| `create-local.ts:303`, `:646-669` | `:303` `installUserPath`; the probe is `:669` `loginShellEnvFor` (the comment block is `:629-668`) |
| `door/listener.ts:543-556` the write cut | `:556-569` (`counts.writesCut += 1` at `:567`); 333.12 added the served check at `:507` |
| `sessions-slice.ts:1124-1160`, `:1162-1172`, `:464-472`, `:1265-1303` | usable refusal `:1118-1161`; dedupe `:1163-1172`; `nextOrdinal` `:464-472`; `quickCreate` `:1265-1303` |
| `remote-sessions.ts:1746-1749` readiness | `readyContextToStart` at `:1657-1665`, called at `:1749`; it reads `readyRemoteContext` (`src/main/machines/ready-context.ts:35-61`, synchronous, starts nothing) |
| "28 `danger: true` presets (`flags.ts`)" | 28 is the file's whole count, `NON_REGISTRY_FLAG_PRESETS` included; `AGENT_FLAG_PRESETS` (the registry's agents) holds **22**, of which **17** are `VERIFIED` and so can ever apply (M1) |
| `registry.ts:1445-1447` qwen | `:1446-1447` |
| `writes.ts:101` ledger life; `:62-63`; `:569-575`; `:124-125`; `:548-562` | `:102`; "the ledger is memory" `:67`; one in flight `:579`; session id `:128-129` (`SESSION_ID_MAX`); recorded/busy `:559-574` |
| `pocket.ts:707-708` `PocketWriteAnswer.verb` | `src/shared/ipc/pocket.ts:736-737` |
| `conformance-pocket.mjs:1279`, `:1326-1343`, `:6166-6186` | R3's `createSession` entry `:1379`; `forbiddenRules` `:1416-1433`; X5 `:6795-6920` |
| `assert-door-only-adds.mjs:938-944`, `:1029-1030`, `:141` | A3 `:1066` on, the write answer type `:1215`; `FROZEN_SETS_FLOOR = 1` at `:252` |
| `SessionsScreen.swift:683-699` | the title `:684-700` |
| `registry.ts:2028` | `LAUNCHABLE_AGENT_IDS` `:2027-2029` |
| (not cited) | 333.12's `LEGACY_ALLOWED_ROUTES` `src/shared/ipc/pocket.ts:156-170`; `POCKET_HONESTY_ADDED` `:1173` (empty); `pocketDoorHonesty` `:1189`; `POCKET_FACE_CLAUSES` `:1304`; `POCKET_NEW_ROUTE_WORDS` `:1325` (empty, "Phase 346 adds Start's row"); `route-ledger.ts` eleven rows; `allowed-routes.ts`; `PocketHost.routeServed` private at `src/main/pocket/ipc.ts:892`; the read switch `:695-746` |

Everything else the entry cites holds as written.

---

## 3. The design, whole

### 3.1 The flows a person meets

- **His Mac updated, his phone updated, an agreement on record (the common case).** The door stays published and serves
  the eleven; `start` waits. The phone draws no "+" (D9). Settings then Phone shows, above Allow, the face's
  `New: start sessions from your phone` and its sentence, Details naming `start` and the start clause. He presses Allow:
  the record covers twelve, the store's allowed set gains `start`, the door process is handed the served set with no
  restart (333.12 D9), and the next Sessions read carries the offer: "+" appears.
- **First setup on this build.** The first Allow allows every route, `start` included (333.12 J39).
- **A Mac older than this phase.** No `start` key: no "+". The phone never asks `/v1/start`.
- **An older phone and this Mac.** It ignores the key and never asks the route (gate:onlyadd: an optional key and a new
  route only add).
- **Start, local.** "+" → New session (the chosen project and agent preselected) → Create → `Creating…` → the sheet
  closes and the new session's Terminal opens. The Mac's own window does not move; the session appears in its list.
- **Start, on a machine.** The same; the project's machine label shows in the menu; its marks are the machine's present
  agents; the create runs over ssh; a machine that is not ready is listed dimmed and refused if raced (`machine`).
- **Refusals.** The project was closed on the Mac (`project`), the agent was uninstalled or is not present there
  (`agent`), the machine stopped answering (`machine`), the agent's interpreter is missing (`interpreter`), six starts this
  minute (`often`), the door stopped while it read (`stopped`): the sheet stays with the Mac's sentence.
- **No answer** (the door's 15 s cut, a dropped connection): the line, Sessions re-read, `Try again` with the same id.
- **See a sample.** The same "+" and sheet over the sample's made-up projects; Create says nothing ran.

### 3.2 The wire

```ts
// src/shared/ipc/pocket.ts (Phase 346)
export type PocketStartReason = 'malformed' | 'project' | 'agent' | 'machine' | 'interpreter' | 'often' | 'stopped';
export interface PocketStartSession { id: string; name: string; }
export interface PocketStartAnswer {
  verb: 'start';
  write: string;
  outcome: PocketWriteOutcome;              // 'done' | 'refused' | 'failed' | 'busy'
  reason: PocketStartReason | null;          // non-null exactly when refused
  sentence: string | null;                   // null exactly when done
  session: PocketStartSession | null;        // non-null exactly when done
}
export const POCKET_START_PROJECTS_MAX = 200;
export const POCKET_START_AGENTS_MAX = 64;
export interface PocketStartProject {
  id: string;                                // the project's id, sent back verbatim
  label: string;                             // the open tab's name, clipped
  machine: PocketMachineLabel;               // clipped; null on this Mac
  folder: string | null;                     // home-relative, clipped, ONLY when another listed project shares label and machine
  place: string;                             // 'local' or the machine id, an index into places by id
}
export interface PocketStartPlace {
  id: string;                                // 'local' or a machine id
  ready: boolean;                            // 'local' always; a machine: its row confirmed AND readyRemoteContext answers
  read: boolean;                             // false: Tortie has not read which agents are there yet
  agents: string[];                          // compiled launchable ids installed there, registry order
}
export interface PocketStartAgent {
  id: string; name: string; icon: string;    // registry id, displayName, iconKey
  danger: string | null;                     // its sealed safeguard-off launch defaults' labels, ', '-joined, clipped; else null
}
export interface PocketStartOffer {
  state: 'offered';
  projects: PocketStartProject[];
  places: PocketStartPlace[];
  agents: PocketStartAgent[];                // every agent any place lists, once, registry order
  chosen: string | null;                     // D10
  defaultAgent: string | null;               // D11
}
export type PocketSessionsStart = { state: 'waiting' } | PocketStartOffer;
// PocketSessionsAnswer gains:  start?: PocketSessionsStart;   (optional; absent on a host with no start)
```

`POST /v1/start` body: `{"agent":"claude","project":"<uuid>","write":"<32 hex>"}`, keys sorted, Swift's `JSONEncoder`
with `.sortedKeys` (it escapes `/`, which no field can hold).

### 3.3 The order of the write path for `start` (`src/main/pocket/writes.ts`)

The seven steps hold for `start` as for every verb, in a branch of its own that shares the ledger map, the per-phone count
and `phonesInFlight`:

1. **Parse** `parseStartBody(body)`: D6; malformed answers `refused` `malformed`, `POCKET_WRITE_SENTENCES.unreadable`,
   echoing a well-formed write id, recording nothing.
2. **Ledger** keyed `${phone}\nstart\n${write}`: recorded → its body, `acted` carried; pending → `busy` `acted`
   START_STILL; full → `busy` `POCKET_WRITE_SENTENCES.busy`.
3. **Claims**, in this order and never under a branch that skips one: this phone's write in flight (`busy`,
   `POCKET_WRITE_SENTENCES.busy`); `startInFlight` on this Mac (`busy`, START_BUSY); the rate (`refused` `often`,
   START_OFTEN). Then the claim: `phonesInFlight.add`, `startInFlight = true`, the rate stamp pushed, the pending entry.
4. **The last check, then the act, with nothing between**: `shuttingDown`, `door.stopping()`, `stillPaired`,
   `routeServed('start')`; false → 404, nothing done. `still` is the same four, handed to the verb.
5. **The act**, `startSettled(() => writes.start({ project, agent }, still))`, which cannot throw past it (a rejection is
   `failed` START_FAILED).
6. **The outcome**, recorded, answered with `startAnswer(…)`, the six fields composed one by one.
7. **One log line** (D32). The `finally` releases `phonesInFlight` and `startInFlight` and drops a pending entry that
   never acted.

---

## 4. The mechanism, file by file (builder **mac** unless named)

### 4.1 `src/shared/ipc/pocket.ts` (append-only in spirit; every existing export keeps its value but the two named)

1. `POCKET_ROUTE_IDS` gains, last, `'start'` with the doc `POST /v1/start — start one session in a project open on this
   Mac or one of its machines, with an agent installed there (Phase 346)`.
2. `POCKET_WRITE_ROUTE_IDS = ['end', 'choose', 'say', 'keys', 'start']`; its doc says five and why start is not a
   session write. The module header's "FOUR WRITE ROUTES" paragraph becomes five, with `start` described ("asks main to
   start ONE session through the Mac's own one-press create, naming a project main offered and an installed agent; it
   carries no path, flag, name or login").
3. `POCKET_SESSION_WRITE_IDS` and `PocketSessionWriteId` (D4); `PocketWriteAnswer.verb: PocketSessionWriteId`; its doc
   names `POST /v1/start` as answered by `PocketStartAnswer` instead.
4. §3.2's types and the two caps, after `PocketWriteAnswer`.
5. `PocketSessionsAnswer` gains `start?: PocketSessionsStart` with a doc saying when it is absent, `waiting` and
   offered, and that the offer is composed starting nothing.
6. `POCKET_HONESTY_ADDED = Object.freeze({ start: '<D3 clause>' })` (its type already forces the key);
   `POCKET_FACE_CLAUSES.start = 'start sessions'` (last key); `POCKET_NEW_ROUTE_WORDS = Object.freeze({ start: { title:
   'start sessions from your phone', sentence: 'An agent installed where the project is, with your launch defaults.' } })`.
7. Nothing else moves: not `LEGACY_ALLOWED_ROUTES`, not `POCKET_DOOR_HONESTY`, not the face composer.

### 4.2 `src/shared/start-copy.ts` (new): the Mac's start sentences, each a named constant

```ts
export const START_PROJECT_GONE = 'That project is not open on your Mac any more. Nothing was started.';
export const START_FOLDER_GONE = 'That project’s folder is not there. Nothing was started.';
export const START_AGENT_GONE = 'That agent is not installed there. Nothing was started.';
export const START_MACHINE_AWAY = 'Tortie is not connected to that project’s machine. Nothing was started.';
export const START_INTERPRETER = 'That agent needs a program your Mac cannot find. Start it on your Mac to see why. Nothing was started.';
export const START_OFTEN = 'Your phone started several sessions just now. Wait a minute, then try again. Nothing was started.';
export const START_BUSY = 'Your Mac is starting another session. Nothing was started.';
export const START_STILL = 'Your Mac is still starting this session.';
export const START_FAILED = 'Your Mac could not start that session. If anything started, it is in Sessions.';
```

`START_FAILED` is the honest one for both sides: a local create that throws deleted its row (`create-local.ts`), and a
remote one may have started over there (`create-local.ts`'s Phase 306 note). Imports nothing.

### 4.3 `src/shared/session-names.ts` (new)

`export function nextOrdinal(sessions: readonly Pick<Session, 'name'>[], base: string): number` moved byte for byte from
`sessions-slice.ts:464-472` (its doc and its `RegExp` escape kept); `export function dedupedName(name: string, existing:
ReadonlySet<string>): string` (the loop `for (let n = 2; existing.has(finalName); n++) finalName = \`${name}-${n}\``);
`export function ordinalName(base: string, sessions: readonly Pick<Session, 'name'>[]): string` →
`dedupedName(\`${base}-${nextOrdinal(sessions, base)}\`, new Set(sessions.map((s) => s.name)))`. Pure.

### 4.4 `src/renderer/state/sessions-slice.ts`

`nextOrdinal`'s body is deleted and `export { nextOrdinal } from '@shared/session-names';` stands in its place (every
importer keeps its import); `createSession`'s dedupe loop becomes `const finalName = dedupedName(name, existing);`.
Nothing else in the file moves (it is on `conformance:machines` condition 54's list and `conformance:manager`'s).

### 4.5 `src/main/tmux/resolve.ts`

`let settledUserPath: string | null = null;`, set when the capture `getUserPath()` started resolves (inside the same
generation, so a `resetUserPathCache()` clears it), and
`export function userPathNow(): string | null { return settledUserPath; }` with a doc: synchronous, starts nothing,
answers the captured PATH once a capture settled and null before; read by the phone's offer alone. `getUserPath`'s
answers do not change. (`conformance:shellenv` re-runs: it reads this file's Phase 276 cache.)

### 4.6 `src/main/sessions/pocket-start.ts` (new): the offer and the act

```ts
/** PURE: exactly quickCreate's input (D13). */
export function composeStartInput(input: {
  project: Project; agent: LaunchableAgentId; sessions: readonly Session[];
  settings: Pick<GmuxSettings, 'launchDefaults' | 'captureDefaults'>; catalogs: AgentFlagCatalogs;
}): CreateSessionInput;
/** PURE: the agent's sealed safeguard-off launch defaults' labels (verified, danger, enabled), ', '-joined, or null. */
export function startDangerOf(agent: string, settings: Pick<GmuxSettings, 'launchDefaults'>, catalogs: AgentFlagCatalogs): string | null;
/** PURE: the offer (D7, D10, D11). `build/p3333/sample.mjs` calls it over the made-up world. */
export function composeStartOffer(input: {
  projects: readonly Project[]; sessions: readonly Session[];
  places: ReadonlyMap<string, { ready: boolean; read: boolean; agents: readonly string[] }>;
  machineLabel: (machineId: string) => string | null;
  agentRows: readonly { id: string; name: string; icon: string }[];   // compiled launchable, registry order
  settings: Pick<GmuxSettings, 'defaultAgent' | 'launchDefaults'>; catalogs: AgentFlagCatalogs; home: string;
}): PocketStartOffer;
/** Reads, starting nothing (D8): this Mac's installed compiled launchable ids (merged rows, create's own candidates), or null when not read yet. */
export function localInstalledAgents(): readonly LaunchableAgentId[] | null;
export interface PocketStartCore {
  listProjects(): readonly Project[]; listSessions(): readonly Session[];
  createSession(input: CreateSessionInput): Promise<Session>;
}
export function createPocketStart(deps: {
  core: () => PocketStartCore | null;
  /** Production: getSettings, getFlagCatalogViews, machineAgentsView, the ready read, machineLabelOf. Tests inject. */
  settings?: () => GmuxSettings; catalogs?: () => AgentFlagCatalogs;
  localAgents?: () => readonly LaunchableAgentId[] | null;
  machineAgents?: (machineId: string) => readonly string[] | null;   // present ids, or null when nothing was read
  machineReady?: (machineId: string) => boolean;
  machineLabel?: (machineId: string) => string | null;
}): {
  /** The sessions answer's key: `{ state: 'waiting' }` when not served, else the offer. A READ. */
  sessionsKey(served: boolean): PocketSessionsStart;
  /** The act (D12). Never throws. */
  start(input: { project: string; agent: string }, still: PocketStillAllowed): Promise<PocketStartOutcome>;
};
```

`machineReady` in production: the machine's row is confirmed (the same `usable` the ⌘T sheet reads,
`src/main/machines/ipc.ts:416`; the builder reads it through the same status function the rows view uses, or the store
equivalent, never through ipc.ts's electron handlers) AND `readyRemoteContext(id)` does not throw. `folder` for a
project: `displayPath` (`src/shared/display-path.ts`) of its path against `home`, only when another listed project
shares its label and machine label. The act's place for a project is `project.machineId` when it is set and not
`'local'`, else `'local'`. The module logs nothing, sets no status, reads no error's text, and names no
`listDetectedAgents`, `rescanAgents`, `getUserPath`, `installUserPath`, `resolveBinary(`, `scanMachineAgents`, child
process or `setActiveSession`.

### 4.7 `src/main/sessions/pocket-writes.ts`

`createPocketWrites`'s deps gain `start: Pick<PocketWrites, 'start'>`; the returned object gains
`start: (input, still): Promise<PocketStartOutcome> => deps.start.start(input, still)` and nothing else. The header gains
one paragraph (Phase 346). X5 reads it as a pass-through.

### 4.8 `src/main/pocket/routes.ts`

- `export type PocketStartOutcome = { outcome: 'done'; session: PocketStartSession } | { outcome: 'refused'; reason:
  Exclude<PocketStartReason, 'malformed' | 'often'>; sentence: string } | { outcome: 'failed'; sentence: string };`
- `PocketWrites` gains `start(input: { project: string; agent: string }, still: PocketStillAllowed): Promise<PocketStartOutcome>;`
- `PocketFacts` gains `start?(): PocketSessionsStart | undefined;` (a READ; absent: no key).
- `export function pocketStartOf(value: unknown): PocketSessionsStart | undefined`: re-composes the key field by field
  (`waiting`, or an offer whose every string is clipped, every list capped at its constant, every `place` and `chosen`
  naming a listed id, `defaultAgent` a listed agent or null); anything else answers undefined. Pure.
- `sessions(query)`: after `facts.sessions()` etc., `const start = pocketStartOf(facts.start?.());` read ONCE; the
  return gains `...(start !== undefined ? { start } : {})` as its last key. The O2 rules otherwise hold.
- `pocketWriteRouteIds()` now answers five; its doc says so.

### 4.9 `src/main/pocket/writes.ts`

§3.3, plus: `START_KEYS = 'agent,project,write'`; `PROJECT_ID_MAX = 64`; `START_RATE_MAX`, `START_RATE_WINDOW_MS`
(exported, declared once); `PocketStartBody` and `parseStartBody` (exported for the hostile client, the vectors and the
tests); `startAnswer(write, outcome, reason, sentence, session): string`; `startActOf` and `startSettled`. The header
gains the start verb in its seven steps and its "never does" (it names no `createSession`: that name is R3's).

### 4.10 `src/main/pocket/facts.ts`

`PocketFactsDeps` gains `start?: () => PocketSessionsStart | undefined`; the facts gain
`...(deps.start !== undefined ? { start: () => deps.start!() } : {})` (or the module's existing pass-through shape). The
header lists it beside `screen` and `scrollback`: handed in, never imported.

### 4.11 `src/main/pocket/ipc.ts`

- The read switch's write arm gains `case 'start':` (returns null; a write never reaches the reads).
- `PocketHost` gains ONE public read, `startAllowed(): boolean { return this.routeServed('start'); }`, with a doc: what
  the sessions answer's key asks, never a write's check (the write path asks `routeServed` itself).
- Nothing else.

### 4.12 The door: `door/table.ts`, `door/wire.ts`, `door/limits.ts`, `route-ledger.ts`, `pairing.ts`

- `table.ts`: the row of D1, last, and its paragraph in the table's doc.
- `wire.ts`: `DoorWriteRoute` gains `'start'`; `WRITE_ROUTES` gains `'start'`; `writePathOf('start') = '/v1/start'`.
- `limits.ts`: `POCKET_WRITE_BODY_CAPS` gains `start: 512` with its worst legal body in the doc.
- `route-ledger.ts`: `{ id: 'start', method: 'POST', path: '/v1/start', reads: false, signed: true, windowOnly: false,
  bodyCap: 512, clause: '<D3 clause>' }`, appended.
- `pairing.ts`: `WRITE_CLAUSES.start = '<D3 clause>'`. `describePocketDoor` is unchanged (it already filters by the
  allowed routes, `:461`), so a store that never allowed `start` hashes and reads byte for byte as at the parent.

### 4.13 `src/main/capabilities.ts`

After `pocketCore` and before `createPocketWrites`: `const pocketStart = createPocketStart({ core: () => pocketCore });`.
`createPocketWrites({ …, start: { start: (input, still) => pocketStart.start(input, still) } })`.
`createPocketFacts({ …, start: () => pocketStart.sessionsKey(pocketHost?.startAllowed() === true) })` (the host is
assigned before the door can answer anything). Nothing else.

### 4.14 `src/main/harness/push-seam.ts` (D31)

`confirmNow(host)`: `const status = host.status(); if (status.confirmState !== 'confirmed') void
host.confirmDoor({ linesRead: status.confirmLines, hashRead: status.confirmHash }).catch(() => undefined);` and the same
in `openDoorForPairing`, awaited. Its vitest proves a first setup confirms twelve routes and a door with `start` waiting
publishes and pairs.

### 4.15 The phone (builder **phone**)

- **`Door/Contract.swift`**: §3.2's types as Swift (`PocketStartOffer`, `PocketStartProject`, `PocketStartPlace`,
  `PocketStartAgent`, `PocketSessionsStart` with `.waiting` and `.offered`, `PocketStartAnswer`, `PocketStartSession`),
  bounds `PocketStartBounds.projects = 200`, `.agents = 64`, `.places = 201`; `PocketSessionsAnswer` gains
  `let start: PocketSessionsStart?` decoded `(try? c.decodeIfPresent(PocketSessionsStart.self, forKey: .start)) ?? nil`
  (D26); `PocketStartAnswer`'s decoder holds D5's three exactly-when rules, `verb == "start"`, a session id of 1 to 128
  of the Mac's session-id characters and a non-empty name, and reads `reason` as a `String` (D5).
- **`Door/DoorClient.swift`**: `static let startTarget = "/v1/start"`; `WriteRoute.start(project:agent:)` (target, and
  a verb the start classifier ignores); `struct StartBody: Encodable { let agent, project, write: String }`;
  `func start(project: String, agent: String, write: String?, door: PairedDoor) async -> SentStart` through
  `signedPost` (one id: a well-formed kept id, else `WriteId.fresh()`); `enum StartResult { case answered(PocketStartAnswer),
  notTaken, noAnswer, notSent(DoorFailure) }` with `StartResult.of(_ end:, sent:)` classifying by `handed` exactly as
  `WriteResult.of` does, an answer accepted only with `verb == "start"` and the sent id echoed (or `""` with `refused`
  `malformed`); `struct SentStart { let result: StartResult; let write: String? }`. `signedPost` keeps ONE call site per
  verb.
- **`Screens/DoorWords.swift`**: `protocol DoorStarting: Sendable { func start(project: String, agent: String, write:
  String?) async -> SentStart }` (ONE caller, `StartRunner.run`); `DoorReading` gains `var starter: (any DoorStarting)?
  { get }` with a default `nil` in its extension (so no test fake changes); `DoorWords.startSentence(for: StartResult,
  sample: Bool) -> String`, non-optional, never `""`.
- **`Screens/Start.swift`** (new): `protocol StartRunnerRegistry: AnyObject { func registerStart(_:); func
  releaseStart(_:) }`; `final class StartRunner` (made at the press, registered before its task starts, its project,
  agent and kept id fixed at init, `stop()` sets `stopRequested` and cancels; `run()` the app's ONE call of
  `starter.start(`, never repeated); `struct KeptStart { let project, agent, write: String; let at: Date }` with
  `static let window: TimeInterval = 60`; `@Observable final class StartModel` (the chosen project and agent, the
  phase `.idle`/`.starting`, the line, `create(reread:opened:)`) following D11, D17, D22 to D25; `struct StartDrawing`
  (pure: the offer → the menu's rows, each place's marks, the default choices, the danger line).
- **`Screens/StartSheet.swift`** (new): `StartTitleControl` (the "+", D21) and `StartSheet` (D22), every word from
  `Copy`, every colour a `Tokens` name, every element identified (§4.16).
- **`Screens/AgentMark.swift`** (new): `struct AgentMark: View` drawing `Image("agent-<icon>")` as a template tinted by a
  token, or `Image(systemName: "terminal")` for a key the phone does not carry; the asset-name table is the ONE place a
  mark is named.
- **`Screens/SessionsScreen.swift`**: the title row gains `StartTitleControl` after `EndBatchTitleControl()`, drawn
  only when the loaded drawing carries an offered start and the tab was handed a start setup; `SessionsDrawing` carries
  the decoded `start`; `SessionsTab` gains `starts: StartSetup?` and presents `StartSheet` with `.sheet(item:)`.
- **`App/TortieApp.swift`**: `PairedReader: DoorStarting` (`start` through `client.start`) and `var starter` → self;
  `MacSpace.keptStart: KeptStart?` (memory); `AppModel: StartRunnerRegistry` with `liveStarts`, stopped in
  `wentAway()`; `startSetup(_ reader:) -> StartSetup?`; `openStarted(mac:id:name:)` pushing `.session(mac:id:name:)` on
  `.sessions` and choosing that tab; the Sessions `Tab` hands `starts:`.
- **`Style/Copy.swift`** (each with its owner comment): `newSession = "New session"` (/// Mac:
  `src/renderer/app/CreateSessionModal.tsx` ⟦<h2 className="modal-title">New session</h2>⟧); `startProject = "Project"`
  (/// Mac: `src/main/menu.ts` ⟦label: 'Project',⟧); `startAgent = "Agent"` (/// Mac: CreateSessionModal.tsx ⟦Agent⟧);
  `create = "Create"` and `creating = "Creating…"` (/// Mac: CreateSessionModal.tsx ⟦{creating ? 'Creating…' :
  'Create'}⟧); `startsWith = "Starts with"`, `startNoAnswer = "Your Mac did not answer. If it started the session, it is
  in Sessions."`, `startNotTaken = "Your Mac did not take it. Nothing was started."`, `startSample = "This is a sample, so
  nothing ran."`, `startNoProject = "Open a project in Tortie on your Mac first."`, `startNoAgent = "No agent is installed
  there."`, `startNotRead = "Your Mac has not looked for agents there yet."`, `startNotConnected = "Not connected"` (each
  /// Phone with its reason). `tryAgain`, `cancel` exist and are reused.
- **`Sample/SampleReader.swift`**: `SampleReader: DoorStarting`, `start` answers `SentStart(result: .notTaken, write:
  nil)` and the sheet draws `Copy.startSample` (D28); `starter` → self. **`SampleWorld.swift`/`SampleBook.swift`**: the
  book's `constants.start` (the composed offer) attached to every sessions answer the sample assembles.
- **`ios/Tortie/AgentMarks.xcassets/**`** (new, generated by `build/p346/agent-marks.mjs`, D23).

### 4.16 The phone's identifiers (`Screens/Identifiers.swift`)

`startOpen = "start-open"` (the "+"), `startSheet = "start-sheet"`, `startProject = "start-project"` (the menu),
`startProjectChoice(id) = "start-project-" + id`, `startAgent(id) = "start-agent-" + id`, `startAgentName =
"start-agent-name"`, `startDanger = "start-danger"`, `startCreate = "start-create"`, `startLine = "start-line"`,
`startClose = "start-close"`. `P316DriveUITests.swift` spells them again in `Seen`.

### 4.17 The sample, the vectors and the marks (builder **phone**)

- `build/p3333/world.mjs`: nothing new in the world (its two projects, `lighthouse` and `orchard`, and agents `claude`
  and `codex` give the offer); `build/p3333/sample.mjs`: composes `constants.start` with the SHIPPING
  `composeStartOffer` (places: `local`, ready, read, agents the world's), proves every assembled sessions answer equal to
  the shipping composer's with `start`, and `--check` stays the authority (az7). `ios/Tortie/Sample/sample.json` is
  regenerated by running it (the integrator re-runs it after the merge).
- `build/p316/vectors.mjs` gains `writes.start` (a body written as Swift writes it, its signature under the vector phone)
  and answers `start-done`, `start-refused-project`, `start-busy`, `start-malformed` from the SHIPPING `startAnswer`;
  `ios/TortieTests/Fixtures/vectors.json` regenerated; `DoorVectorTests` read them. (`gate:onlyadd` A2 skips answers of a
  route no frozen set holds, `build/assert-door-only-adds.mjs:3345-3346`.)
- `build/p346/agent-marks.mjs` (new): reads the thirteen compiled launchable rows' `iconKey`s from `src/main/agents/registry.ts` through the pinned tsx (as
  `vectors.mjs` imports the Mac's TypeScript; it imports no `build/` script), normalises each SVG (D23),
  writes the catalog; `--check` regenerates in memory and compares byte for byte; `--self-test` proves the check red on a
  changed byte, a missing set, an extra set, a colour left in, droid's plate kept. Starts only the pinned tsx, through `tsxCli()` (`gate:checks`); `conformance:ios`'s header gains it beside `vectors.mjs`
  and `sample.mjs` as the third tsx it starts.

---

## 5. The gates that move, on purpose (builder **gates**)

Each new rule is a row of its gate's table owned by `build/p346/SPEC.md D…`, read with the TypeScript parser (or the
Swift lexer) as its siblings are, comments blanked, counting what it checked (a zero where something must be is red), and
proved by at least one ablation arm.

### 5.1 `conformance:pocket` (`build/conformance-pocket.mjs`)

**New, NS1 to NS12:**

| Rule | Holds |
| --- | --- |
| NS1 | THE ROUTE (D1, D2): exactly one `start` row, `POST /v1/start`, signed, `reads: false`, not window-only; `start` in `POCKET_ROUTE_IDS` and `POCKET_WRITE_ROUTE_IDS`, NOT in `LEGACY_ALLOWED_ROUTES`; `WRITE_ROUTES` in `door/wire.ts` gains exactly it; its ledger row's clause is `WRITE_CLAUSES.start`; `POCKET_HONESTY_ADDED`, `POCKET_FACE_CLAUSES` and `POCKET_NEW_ROUTE_WORDS` each hold a `start` entry of D3's exact words |
| NS2 | THE ANSWERS (D4, D5): `PocketWriteAnswer.verb` is `PocketSessionWriteId`, which is exactly the four; `PocketStartAnswer` is exactly `verb, write, outcome, reason, sentence, session`; `startAnswer` composes those six one by one; every sentence it sets is a named constant of `src/shared/start-copy.ts` or `POCKET_WRITE_SENTENCES` (X6's rule widened to the start files) |
| NS3 | THE BODY (D6): `parseStartBody` keys compared exactly against `'agent,project,write'`; one `JSON.parse` (`objectOf`); `agent` compared by `===` against `LAUNCHABLE_AGENT_IDS` (imported, never re-spelled) and no other list; `project` read one character at a time (R1: no pattern); and DRIVEN over a hostile corpus of at least 30 bodies (missing key, extra key, `shell`, `SHELL`, ` claude`, `claude\u0000`, an id only an overlay could hold, a 65-character project, a project holding `/`, `.` or `%`, a 31- and 33-hex write, an array, a string, `null`, nested objects, duplicate keys, a 600-byte body), every one `malformed` |
| NS4 | NOTHING FROM THE PHONE BUT TWO IDS (D13, D15): in `pocket-start.ts`, `input.project` is read only as the right side of an `===` against a listed project's `id`, and `input.agent` only in an `===`/`includes` against installed ids and as `composeStartInput`'s `agent`; `composeStartInput`'s returned object holds exactly the keys `name, projectPath, agent` and, conditionally, `projectMachineId, machineId, extraArgs, capture`, each from the project row, `ordinalName`, `defaultLaunchArgs(` or `captureDefaultFor(`; no `cwd`, `startAnyway`, `login`, `signIn` key anywhere in the module |
| NS5 | THE OFFER STARTS NOTHING (D8): `pocket-start.ts` names no `listDetectedAgents`, `rescanAgents`, `getUserPath`, `installUserPath`, `resolveBinary(` (the async one), `scanMachineAgents`, `spawn`, `exec`, `fork`, `child_process` or `setActiveSession`; `sessionsKey`, `composeStartOffer`, `localInstalledAgents` and every function they reach hold no `await` and are not `async`; `userPathNow` is declared once, in `resolve.ts`, synchronous, and assigns nothing but its own slot |
| NS6 | THE ACT (D12): `start` re-reads the project by id, asks readiness for a machine, asks the installed agents, composes, asks `still(` and only then calls `createSession(`, with no `await` before that call; `createSession(` is called once in the module and nowhere else outside `core.ts`'s own callers and the renderer's bridge; errors told apart by `isGmuxError(` and code ONLY (no `.message`, no `String(err)`); no status setter (X5's `NOT_THE_DOORS` list) and no log call in the module |
| NS7 | THE LIMITS, DECLARED ONCE (D16, D18, D19): `START_RATE_MAX = 6` and `START_RATE_WINDOW_MS = 60_000` declared once, in `writes.ts`, read once each; `startInFlight` a separate claim, never a key inside `sessionsInFlight`; `POCKET_WRITE_BODY_CAPS.start === 512`; `POCKET_START_PROJECTS_MAX` and `POCKET_START_AGENTS_MAX` declared once, in the contract, read by `pocketStartOf` |
| NS8 | THE START BRANCH'S ORDER (X1 widened): parse, ledger, phone claim, start claim, rate, pending entry, last check, act, outcome, log, in that order; nothing between the last check and the `startSettled(` that starts the act; every claim released in the `finally` |
| NS9 | THE KEY (D9, D26): `sessions` reads `facts.start?.()` once, through `pocketStartOf(`, and spreads it last; `pocketStartOf` answers undefined for anything that is not `{state:'waiting'}` or a whole offer, DRIVEN over 15 hostile values (an unknown state, a project naming an unlisted place, 201 projects, a 300-character label, a `chosen` not listed, a `defaultAgent` not listed, a number where a string is) |
| NS10 | THE WAITING STATE (D2, D9): `capabilities.ts` hands the facts `start` as `pocketStart.sessionsKey(pocketHost?.startAllowed() === true)`; `startAllowed` is declared once, in `ipc.ts`, and its body is `this.routeServed('start')` alone |
| NS11 | THE PASS-THROUGH (X5 widened): `PocketWrites` holds exactly `end, choose, say, keys, start`; `createPocketWrites`'s `start` passes to `deps.start.start(` and does nothing else; `capabilities.ts` alone builds `createPocketStart(` |
| NS12 | THE SEAM CONFIRMS THE PROPOSAL (D31): `push-seam.ts` hands `confirmDoor` `status().confirmLines` and `status().confirmHash`, and names no `pocketConfirmStatus(host.fields())` |

**Widened on purpose, each naming D-numbers:** R2 (writes exactly five, start's own cap); R3 (FORBIDDEN gains
`pocket-start`, `../sessions/pocket-start` and `createPocketStart`, each "the phone's start, the one module outside the
door that starts a process (Phase 346)"; `createSession`'s reason is reworded to "a write verb the door never names: the
phone's start reaches it only through PocketWrites.start, implemented outside the door (Phase 346, his request of
2026-10-12; refusal 8 is about configuration, and a start is his press)"); R4 (the TABLE's pin moves to
`1b92ce21d601f9202eee2f196f32a1d8a3f275c1dd46c558779516ed77fcf57f`, twelve lines, M3, and AR3 keeps the eleven's
`ea5930e0…` under a constant of its own, `LEGACY_ROUTE_PIN`, because AR3 hashes the legacy ledger rows,
`conformance-pocket.mjs:12963`); X1, X3, X4, X5, X6, X12 (five writes, start's clause, its ledger key, its claims);
AR9 (the ledger's start row); Z1 (WRITE_ROUTES gains `start`); O2a (the sessions member still synchronous with the key);
SU5 (`POCKET_ROUTE_IDS` "the eleven routes it was" retires on purpose: twelve, naming this phase); AF2 if its eleven-route
drive reads the new face clause (it does not: it passes the eleven). Every other rule that goes red is a defect of the
build, not a widening.

### 5.2 `conformance:pocket:hostile` (`build/p313/hostile-client.mts`)

New arms over the door's own in-process listener and the SHIPPING write path, with a recording `PocketWrites.start`:
NSH1 an honest start acts once with its exact `{project, agent}` and answers `done` with the recorder's session; NSH2 the
same bytes again (404 `replay`, nothing forwarded); NSH3 the same write id fresh-signed while the recorder holds the act
(`busy`, `acted`, START_STILL) and after (the recorded answer, ONE act); NSH4 a second phone's start while one runs
(`busy`, START_BUSY, no second act); NSH5 seven starts from one phone inside a minute on a scripted clock (six act, the
seventh `refused` `often`, unrecorded, and acts after the window); NSH6 a body over 512 bytes (dropped at the door,
`oversized`, main never asked); NSH7 a query on `/v1/start` (404 `route`); NSH8 the hostile corpus of NS3 answered
`malformed`, nothing acted; NSH9 a `GET` signature on the `POST` (refused); NSH10 another phone's connection
(`channel`); NSH11 a phone removed before the act (404, nothing acted) and after it (200 or a cut, never 404); NSH12 the
door stopping while the act runs (the answer, or a cut; never 404); NSH13 a door whose served set lacks `start` (404
`route` before the body, the parser counter at zero, nothing forwarded); NSH14 one log line per start with no project,
agent or write id in it.

### 5.3 `conformance:ios` (`build/conformance-ios.mjs`): (bb) is new, seven widen

| Clause | Holds |
| --- | --- |
| bb1 | THE START WRITE: the starter's `start(` called once in the app, in `StartRunner.run`, never inside `while`/`repeat`/`for`; `StartBody` exactly `agent, project, write`, built in `signedPost` alone with `.sortedKeys`; `StartResult.of` classifies by `handed`; an answer accepted only with `verb == "start"` and the sent id echoed, or `""` with `refused` `malformed` |
| bb2 | NO OWNER CHECK ON START (D20): `Start.swift`, `StartSheet.swift` and `AgentMark.swift` are in `OWNER_CHECK_ABSENT` and name no `OwnerCheck`, `LAContext` or `evaluatePolicy` |
| bb3 | SENT ONCE OR NOT AT ALL (D17): every `StartRunner(` bound and registered before its task starts; `AppModel.wentAway()` stops every start runner; the ONE kept id is `KeptStart.write`, set only from a start's own `noAnswer` or a `busy` on a kept id, compared by the Mac, the project and the agent, bounded by ONE 60 s constant; nothing persists a start, a kept id or an offer (no `UserDefaults`, Keychain or file write in the Start files) |
| bb4 | TWO IDS AND A WRITE ID LEAVE THE PHONE (D15): `DoorClient.start` takes exactly `project`, `agent`, `write`, `door`; no Start file names a path, a folder, an argument, a name field or a `TextField`/`TextEditor` |
| bb5 | THE KEY NEVER FAILS SESSIONS (D26): `PocketSessionsAnswer`'s `start` is decoded inside `try?` and with `decodeIfPresent`, and no other decode of the answer reads it |
| bb6 | THE "+" (D21): `StartTitleControl` drawn once, in `SessionsScreen`'s title, behind a test of an offered start, its chain holding `.disabled(` that reads End these' `takesTaps`, identified `ID.startOpen` |
| bb7 | NOTHING ELSE REACHES START (D29): no `CFBundleURLTypes`, no `import AppIntents`, no `AppShortcutsProvider`, no `WidgetKit`, no `UNNotificationAction`/`UNNotificationCategory`, no `NSUserActivity` naming a start |
| bb8 | THE MARKS (D23): `ios/Tortie/AgentMarks.xcassets` holds `Contents.json` and exactly one `agent-<icon>.imageset` per compiled launchable `iconKey` (thirteen), each its `Contents.json` and one `.svg` with `preserves-vector-representation` and `template-rendering-intent: template`, no colour set and no other appearance; `build/p346/agent-marks.mjs --check` exits 0 (run as (j) runs `vectors.mjs`); `Image("agent-` appears only in `AgentMark.swift` |
| bb9 | DONE OPENS THE TERMINAL ON THE MAC THAT STARTED IT (D24, D27): `openStarted(mac:` pushes `.session(mac:` (ba1) on `.sessions` and nothing else; `StartModel` calls it only from the `done` arm |
| bb10 | THE SAMPLE STARTS NOTHING (D28): `SampleReader.start` answers `.notTaken` and names no `DoorClient`, `PairedReader` or network type (az2 and az3 keep holding over the new members) |

**Widened**: (ab) `signedPost` called by `end`, `choose`, `say`, `keys` and `start` alone, once each; (t)
`hostile-door.mjs` names the `start` group's arms (§5.4); (v) `DoorWords.startSentence(for:sample:)` a non-optional
`String` for every `StartResult` case and `StartModel`'s line nil or a sentence, never `""`; (az) `SAMPLE_MAY_NAME`,
`SAMPLE_MAY_CALL` and `SAMPLE_REACH` gain exactly the start types the sample needs, and az7 reads the offer in the book;
(ba) ba1 covers `openStarted`; (b) `AgentMark.swift`'s asset-name table is allowed by name if (b) would read it as a
sentence; (k) the Start files hold no arithmetic operator but the 60 s comparison through `timeIntervalSince` (named if
(k) asks). (s) is NOT moved: it reads 11.

### 5.4 `build/p316/hostile-door.mjs` (builder **probe**), group `start`

Arms, each `write: true` where it is a write, `posts:` counted, ending in a sentence or no "+": `start-key-malformed`
(sessions answer with a broken `start`: Sessions draws, no "+"), `start-key-unknown-state`, `start-key-huge` (10,000
projects: no "+"), `start-answer-wrong-verb`, `start-answer-no-echo`, `start-answer-done-no-session`,
`start-answer-refused-no-reason`, `start-answer-unknown-reason` (drawn, its sentence), `start-answer-2mib`,
`start-answer-chunked`, `start-404` (Copy.startNotTaken), `start-hold` (no answer, then `Try again` sends the SAME
write id, the door's own record of both bodies compared byte for byte).

---

## 6. The app runs (builder **probe**)

### 6.1 `probe:p346` (new: `build/p346/probe-p346.mjs`), the Mac side

`"probe:p346": "node build/harness-socket.mjs --fresh gmux-p346 'export GMUX_CONFIG_ROOT=\"$GMUX_HARNESS_DIR\"; node build/with-scratch-machine.mjs -- node build/p346/probe-p346.mjs'"`,
built from `probe:p318`'s pieces. ONE Electron at HEAD through `withElectron` on a scratch profile and HOME under the
harness directory, the socket `gmux-p346-…`, inside the loopback machine with `SCRATCH_MACHINE_QUIET_SHELL=1`; with
`P346_PARENT_CHECKOUT` (a BUILT `0b87d0af`) the parent's Electron FIRST on the same profile, never at once, so HEAD
starts on a store whose agreement covers the eleven. The door through the Tailscale stand-in (preflighted by sha256,
sampled every second; a real Tailscale fails the run), the DNS stand-in in the probe's process, two
`build/p316/node-phone.mjs` phones (`startSession` and `startAnswerOf` added there, §7). `build/hidden-agents.mjs` before
EVERY launch and `agents:list` read back. The scratch login shell resolves `claude` and `codex` to `exec -a` wrappers of
`build/p318/stand-in.mjs`, and `cursor-agent`, `codewhale`, `muse`, `pi`, `omp` and `opencode` to `exec -a` wrappers of
the new `build/p346/argv-stand-in.mjs` (it answers each row's own version probe with the identity text the probe reads
from the registry through the pinned tsx before the launch, logs its argv, its cwd and the NAMES of its environment, never
a value, draws one prompt line and sleeps); the probe REFUSES (exit 2) unless every one resolves there and none of the
hidden five resolves at all. On the loopback machine the far home's search folder holds `claude` and `codex` stand-in
wrappers. No vendor process runs and no token is spent.

| Arm | Reads |
| --- | --- |
| S0 | (with the parent) the parent's `/v1/start` answers 404 `route` with nothing forwarded and its `/v1/sessions` has no `start`; at HEAD the door reads `confirmed`, `routesWaiting` is `['start']`, the sessions answer carries `{ state: 'waiting' }`, `/v1/start` answers 404 `route` before its body (the door's parser counter), the confirm face shows `New: start sessions from your phone` with D3's sentence above Allow; Allow through the sheet; the next read carries the offer and the door answers start |
| S1 | THE OFFER equals the probe's own reading of main: projects (`listProjects` through the renderer bridge) in order with labels, machine labels and folders; places with `ready` and `read`; agents exactly the installed ones (the eight stand-in names, never a hidden one), registry order, names, icons; `chosen` per D10 (re-derived by the probe from main's session list); `defaultAgent` `claude`; `danger` null, then (after the probe writes a VERIFIED danger launch default through the Settings window's own bridge, sealed by the store) that preset's label, and an unsealed one written to the file directly does not appear (when the Settings window's bridge cannot be driven from the probe, this half reads UNREADABLE, never a pass, and method 1 covers the composition) |
| S2 | THE MATRIX, local: one start per installed agent (eight) in a scratch project: 200 `done`, the new id and name `<agent>-<n>`; main lists it with that agent; the manifest row's argv equals what the stand-in logged; its cwd is the project folder; `/v1/screen` answers its terminal; the Mac's active project and session did not move |
| S3 | THE MATRIX, another machine: claude and codex in a project on the loopback machine: `done`; the far tmux lists the session; main's row is remote; a machine whose sshd is paused (by its recorded pid, resumed in the `finally`) answers `refused` `machine` and starts nothing |
| S4 | THE REFUSALS: the project closed on the Mac between offer and start (`project`, nothing started); a hidden agent's id (`agent`); `shell` and an overlay-only id (`malformed`); the agent's binary removed after the offer (`agent`, from the create's own code) |
| S5 | TIMING (D16, D17): create-to-answer for the first start after launch (cold), 20 warm starts, 5 with a sealed shell-variable name set (the Phase 275 probe), and 5 on the machine; printed p50/p95/max; graded every answer under the door's 15 s, warm local p95 under 3 s, remote p95 under 10 s; a breach is printed for the main session, never retried away |
| S6 | THE LEDGER AND THE LIMITS: the same bytes again (404, one session); the same write id fresh-signed while running (`busy`, START_STILL) and after (the recorded `done` with the same session id; the session count unchanged); a relay this file holds that CUTS the answer once main logged the act, then the same id (the recorded `done`, ONE session); two phones at once (one `done`, one `busy` START_BUSY, one session); seven starts from one phone inside a minute (six `done`, the seventh `refused` `often`) |
| S7 | THE LOGS: `app.log` holds one `the phone's start:` line per start, and no project id, path, agent argument or write id anywhere in the profile, HOME or the harness directory |
| S8 | THE MAC'S SURFACES: the native menus as main built them (`Menu.prototype.popup` recorded, nothing opened, as probe:p320 R5 does) equal at the parent and HEAD; Settings then Phone after Allow draws the honesty sentence with D3's added clause |
| S9 | NO STATUS FROM THE PHONE: no new session reads `needs_input` from the start itself (the stand-ins draw no question) |
| S10 | THE ENDS: every session this run started is ended by Remove at the end (main's own verb), and every stand-in pid by pid in the `finally` |
| RUN | the process census at the end: no real agent, no real Tailscale, no Electron, no stand-in left; his shell history unmoved across the run |

`--grader-self-test` grades recorded fixtures, every clause shown red on its own break, and starts nothing; `P346_ARMS`,
`P346_KEEP` (keeps every answer for the verifier's re-derivation) and `P346_PARENT_CHECKOUT`. Run directly as
`node build/p346/probe-p346.mjs --grader-self-test`, never through `npm run` (`probe:p336`'s lesson).

### 6.2 `probe:p316`, the `start` group (`P316_ARMS=start`), the phone side

The Mac half as probe:p316's `reply` group runs it (the stand-ins, two scratch projects, one on the loopback machine),
the door allowing `start`; the drive steps in `ios/TortieUITests/P316DriveUITests.swift`: `start-open`,
`start-pick:<project id>`, `start-agent:<id>`, `start-create`, `start-read`, `start-close`, `start-home`, and
`start-ready` (printed before Create so the probe holds or cuts the relay at that moment). On iOS 26.3 and, the floor,
18.3 (NP1, NP3, NP5):

| Arm | Reads (labels and frames only) |
| --- | --- |
| NP1 | "+" at the trailing end of the title, labelled `New session`; the sheet's projects equal the offer's, the chosen one selected; the marks equal the chosen place's agents (labels the names) and nothing else |
| NP2 | the default agent selected; another project whose place lacks it moves the choice by D11 |
| NP3 | Create on a local project: `Creating…`, then the sheet gone, the Terminal of the session main created (its id read from main) on top of the Sessions tab, and NO Face ID or passcode prompt at any moment (SpringBoard read) |
| NP4 | Create on the machine's project: the same, the far session |
| NP5 | the project closed on the Mac while the sheet is open, then Create: the sheet stays with START_PROJECT_GONE, Sessions re-read |
| NP6 | NO ANSWER: the relay cuts after main logged the act: `Copy.startNoAnswer`, `Try again`; its press sends the SAME write id (the relay's record) and opens the ONE session |
| NP7 | WITHHELD: Home pressed with the relay holding the handshake: no session on the Mac, the line on return |
| NP8 | WAITING: a Mac with `start` not allowed (D9): no "+" |
| NP9 | See a sample: "+" and the sheet over the sample's projects; Create says `Copy.startSample`; the relay counts zero connections |
| NP10 | TWO MACS (345): the "+" of the Mac on screen starts on that Mac only (the second door, as probe:p345's twin, records no start) |
| NP11 | the PARENT app (`P346_PARENT_IOS`, a checkout of `0b87d0af`'s `ios/`): no "+" anywhere |

### 6.3 `test:ios` (builder **probe** wires it; builder **phone** writes the tests)

`P346_SUITES = ['StartTests', 'StartClientTests', 'StartContractTests', 'AgentMarkTests', 'P346StartTransportTests',
'DoorVectorTests', 'SampleReaderTests']`, each required in xcodebuild's own suite lines. `test-ios.mjs`'s in-process Node
door answers `POST /v1/start` (`TEST_RUNNER_P346_START_PORT`): an honest answer, a hold mode (no answer), and a record of
every body, which `P346StartTransportTests` reads: the SHIPPING `DoorClient.start` sends the vector body byte for byte;
after a held answer a second call with the kept id sends the SAME bytes but the signature; a withheld write reaches no
request. `AgentMarkTests` loads each of the thirteen marks by name (non-nil, template) and renders it into a bitmap
context to count opaque pixels (not a screenshot), red on an empty mark.

---

## 7. Builders, disjoint files, and the seams

| Builder | Files (every file in exactly one list) |
| --- | --- |
| **mac** | `src/shared/ipc/pocket.ts`; `src/shared/start-copy.ts` (new); `src/shared/session-names.ts` (new); `src/main/pocket/door/table.ts`; `src/main/pocket/door/wire.ts`; `src/main/pocket/door/limits.ts`; `src/main/pocket/route-ledger.ts`; `src/main/pocket/pairing.ts`; `src/main/pocket/writes.ts`; `src/main/pocket/routes.ts`; `src/main/pocket/facts.ts`; `src/main/pocket/ipc.ts`; `src/main/sessions/pocket-start.ts` (new); `src/main/sessions/pocket-writes.ts`; `src/main/tmux/resolve.ts`; `src/main/capabilities.ts`; `src/main/harness/push-seam.ts`; `src/renderer/state/sessions-slice.ts`; new tests `src/main/pocket/__tests__/p346-start-write.test.ts`, `src/main/pocket/__tests__/p346-start-key.test.ts`, `src/main/sessions/__tests__/p346-pocket-start.test.ts`, `src/main/sessions/__tests__/p346-start-input.test.ts`, `src/shared/__tests__/p346-session-names.test.ts`, `src/main/tmux/__tests__/p346-user-path-now.test.ts`; and EVERY existing test under `src/**/__tests__/` that this phase's intended moves turn red (four writes, eleven routes, the face's clause list, the push seam), each named in its report |
| **phone** | `ios/Tortie/Door/Contract.swift`; `ios/Tortie/Door/DoorClient.swift`; `ios/Tortie/Screens/DoorWords.swift`; `ios/Tortie/Screens/SessionsScreen.swift`; `ios/Tortie/Screens/Identifiers.swift`; `ios/Tortie/Screens/Start.swift` (new); `ios/Tortie/Screens/StartSheet.swift` (new); `ios/Tortie/Screens/AgentMark.swift` (new); `ios/Tortie/App/TortieApp.swift`; `ios/Tortie/Style/Copy.swift`; `ios/Tortie/Sample/SampleReader.swift`; `ios/Tortie/Sample/SampleWorld.swift`; `ios/Tortie/Sample/SampleBook.swift`; `ios/Tortie/Sample/sample.json`; `ios/Tortie/AgentMarks.xcassets/**` (new); `build/p346/agent-marks.mjs` (new); `build/p3333/sample.mjs`; `build/p3333/world.mjs`; `build/p316/vectors.mjs`; `ios/TortieTests/Fixtures/vectors.json`; new tests `ios/TortieTests/StartTests.swift`, `StartClientTests.swift`, `StartContractTests.swift`, `AgentMarkTests.swift`, `P346StartTransportTests.swift`; and existing `ios/TortieTests/*.swift` this phase's moves turn red (`SampleReaderTests`, `SampleBookTests`, `DoorVectorTests`, `DoorContractTests`, `CopyTests`), each named |
| **gates** | `build/conformance-pocket.mjs`; `build/ablation-p313.mjs`; `build/p313/hostile-client.mts`; `build/conformance-ios.mjs`; `build/p316/ablation-ios.mjs`; `build/assert-door-only-adds.mjs`, `build/p33311/swift-wire.mjs` and `build/p33311/ablation.mjs` ONLY if a clause misreads the narrowed `verb` alias or the phone's lenient `start` decode (expected: untouched; the phone builder runs `gate:onlyadd` and hands any red line here); `build/conformance-phonecopy.mjs` ONLY if a floor must move (expected: untouched) |
| **probe** | `build/p346/probe-p346.mjs` (new); `build/p346/argv-stand-in.mjs` (new); `build/p346/CHECKLIST.md` (new); `build/p316/node-phone.mjs`; `build/p316/probe-p316.mjs`; `build/p316/hostile-door.mjs`; `build/p316/test-ios.mjs`; `ios/TortieUITests/P316DriveUITests.swift`; `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 176 → 177); `package.json` (`probe:p346`); `build/verification-checks.mjs` (its classification) |

**The seams, stated exactly so the four build at once:**

- mac ↔ phone: §3.2's wire, `parseStartBody` and `startAnswer` (exported by `writes.ts`), `composeStartOffer`'s
  signature (§4.6, called by `sample.mjs`), D3's words.
- mac ↔ gates: every name in §4 and §5.1 (`pocketStartOf`, `startAllowed`, `START_RATE_MAX`, `START_RATE_WINDOW_MS`,
  `startInFlight`, `userPathNow`, `createPocketStart`, `composeStartInput`, `ordinalName`, `dedupedName`), the R4 pin
  `1b92ce21…`, and AR3's `LEGACY_ROUTE_PIN` `ea5930e0…`.
- phone ↔ gates: §4.15's names (`StartRunner`, `KeptStart`, `StartModel`, `StartTitleControl`, `StartSheet`,
  `AgentMark`, `DoorStarting`, `starter`, `StartResult`, `SentStart`, `StartBody`, `startSentence(for:sample:)`,
  `openStarted(mac:`, `liveStarts`, `registerStart`), the catalog path, `agent-marks.mjs --check`.
- phone ↔ probe: §4.16's identifiers, `TEST_RUNNER_P346_START_PORT`, the suite names.
- gates ↔ probe: the `start` group's arm names in `hostile-door.mjs` (§5.4), read by (t).
- probe ↔ mac: `node-phone.mjs`'s `startSession(phone, door, { project, agent, write })` posts §3.2's body to
  `/v1/start`; `startAnswerOf(answer, sentWrite)` checks D5's six fields.

---

## 8. The proof, run rather than read

### 8.1 What each builder runs before it returns

Every builder: `npm run typecheck` and the vitest files it owns (scratch HOME). **mac** also: the full `npm test` under a
scratch HOME, `conformance:pocket` (expect only the rules §5.1 widens to be red until gates lands), `conformance:manager`,
`conformance:machines`, `conformance:shellenv`, `conformance:push`. **phone**: `node build/p346/agent-marks.mjs --check`
and `--self-test`, `node build/p3333/sample.mjs --check` (after the mac module exists in its tree), `node
build/p316/vectors.mjs --check`, `npm run conformance:ios` (its own clauses), `npm run gate:onlyadd` (its Swift reader reads `Contract.swift` and the
Sessions files: P0 to P3 must stay green with the optional `start`), and `xcodebuild build-for-testing` under its
own derived data only if a lock slot is free (else stated). **gates**: `conformance:pocket`, `conformance:pocket:hostile`,
`conformance:ios`, and its NEW ablation arms (`P313_ONLY=NS1a,… node build/ablation-p313.mjs`, `P316_ONLY=bb1a,… node
build/p316/ablation-ios.mjs`), each red on the rule that owns it. **probe**: `node build/p346/probe-p346.mjs
--grader-self-test`, `node build/p316/probe-p316.mjs --grader-self-test` (if it has one), `npm run gate:electron`,
`gate:background`, `gate:checks`.

### 8.2 What the builders' tests must show (driven, not read)

- **mac**: `composeStartInput` over every compiled agent × {local, machine} × settings fixtures {nothing, a verified
  non-danger default, a sealed danger default, capture on}, equal to the object the renderer's `quickCreate` hands
  `gmux.sessions.create` (driven through the real store with a recording bridge) — this is the builder's own parity; the
  verifier re-derives it independently (§8.3); `ordinalName` against the renderer's old loop over 50 name lists;
  `composeStartOffer`'s D7 to D11 over fixtures (two machines, a not-ready machine, an unread machine, 250 projects, an
  agent in two places, a `defaultAgent` of `shell`); `localInstalledAgents` with a scan, with no scan and a PATH, with
  neither, starting no process (a spy on `child_process`); the act's every refusal and its no-await order with a fake
  core; the write path's NSH arms over the shipping handler; `pocketStartOf` over the hostile values; the push seam over
  a door with `start` waiting.
- **phone**: `StartModel` over a scripted starter: done → `openStarted` with the space's Mac; refused → the sentence
  stays; no answer → kept id, Sessions re-read before `Try again` is offered, the same id on the next press, a fresh id
  after 60 s or another choice; withheld; busy on a kept id keeps it; sample → `Copy.startSample`; `StartDrawing` over
  offers; the lenient decode over ten malformed keys with the rest of the sessions answer intact; the vectors.

### 8.3 The verifier: Tier 3, two independent methods (one an attack), the parent, the app run

Run as two lenses (two verifiers), each returning a typed verdict, each naming what it did that no builder did:

- **Lens A, the attack (method 2) and the re-derivation (method 1).** (1) A HOSTILE PHONE of the verifier's own (not
  `node-phone.mjs`'s `startSession`), against the running app at HEAD through the stand-in: malformed bodies of its own
  invention beyond NS3's corpus, extra keys, an `agents.json`-only id, `shell`, a project id from another Mac (a fresh
  uuid), replays, a cut answer sent again, a flood against every limit, a tab closed under it, a machine made not ready,
  a race of two phones and of the Mac's own ⌘T create; every refusal on its reason word, every session counted from
  main and from tmux on the harness socket. (2) RE-DERIVE: its own harness composing `quickCreate`'s payload through the
  renderer's real store and main's `composeStartInput`, per compiled agent, local and remote, over settings it writes
  (sealed and unsealed danger defaults, capture, shell variable names), compared by deep equality AND by the JSON of a
  canonical key order; and the name rule over the renderer's live list. (3) CLONE ABLATION: in a `cp -Rc` clone, one
  plant per new NS rule and bb clause, each red on its owner (the builders' arms re-run, plus three of its own). (4) THE
  PARENT: `0b87d0af` built, `/v1/start` 404 `route`, nothing forwarded, no `start` key.
- **Lens B, the app run.** `probe:p346` at HEAD with `P346_PARENT_CHECKOUT` (every arm, the matrix printed per agent and
  per place), `probe:p316` with `P316_ARMS=start` on iOS 26.3 AND 18.3 (with `P346_PARENT_IOS`), `P316_ARMS=sessions` on
  26.3 (the Sessions tab whose title row moved, its regression), `test:ios` on 26.3 and `P316_RUNTIME=18.3`, and
  `probe:p313` unchanged as the door's regression. Its independent step: it re-derives the offer from main's own lists
  for every read the probe kept (`P346_KEEP=1`) and reads the Mac's window state before and after each start.
- Both lenses: his shell history stat around every command that starts a shell, the app or a Simulator; the Electron
  count once at the end with `ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v defunct`;
  `xcrun simctl list devices | grep -c p316-` reads 0.

### 8.4 One checklist row for him (`build/p346/CHECKLIST.md`, builder **probe**)

On his phone with this Mac: open Settings then Phone on the Mac, read `New: start sessions from your phone`, press Allow;
on the phone pull Sessions, press "+", see only the agents installed on that Mac, Create in a local project and in a
project on his Mac Pro; the Terminal opens each time; no Face ID was asked. Then on the Mac: the two sessions are in its
list, and its own window did not move.

---

## 9. The integrator's commands (in order; each with its exit code and PASS line in the report)

`df -h /` first. Then `npm run typecheck`; `npm run build`; the whole vitest under a scratch HOME; the gates of §8; the
lock-held runs last. The `integratorCommands` field of this step's output lists them exactly.

---

## 10. What is NOT in this phase

- **No Shell** (his answer 7) and no free command line.
- **No Face ID, Touch ID or passcode on Start** (his answer 5), and no change to End's.
- **No typed folder, recent folders, folder creation, clone or worktree; no first prompt, no flag, no login and no name
  chosen on the phone.**
- **No Mac switch inside the sheet**: the Mac on screen decides (345).
- **No "New session here" in the Terminal's ⋯**, no start from Needs input, no start from a project header.
- **No ceiling on live sessions, and nothing ends a session.** A start that ran twice is ended by him, never by Tortie.
- **No change to End, choose, say, keys, the Screen, Catch Me Up or the alerts.**
- **No URL scheme, App Intent, Shortcut, widget or notification action.**
- **No second read route for the offer** (D1), and no new IPC channel: `gate:contract`'s baseline does not move.
- **No build number move** (11), no archive, no release, no CHANGELOG edit by a builder.
- **No edit to 333.4.1's or 337.5's Swift files**, and none to `build/assert-simulator-teardown.mjs`.
- **No hint on a waiting Mac** (D9) until he answers §13 Q1.

## 11. For the main session at landing

- **CHANGELOG draft** (under `## Unreleased`, `### Added`): "Start a session from the iPhone: tap + on Sessions, pick a
  project open on that Mac or one of its machines and one of the agents installed there, and its terminal opens; it uses
  your Mac's launch defaults and asks for no Face ID. Your Mac asks you to allow it once, in Settings then Phone." (the
  commit link added by the follow-up).
- **Release obligations** (entry mechanism 11): the Mac release carrying 346 ships with or after 333.12 (landed) and
  beside the phone build that calls Start; at that release a second frozen set is taken and `FROZEN_SETS_FLOOR` raised
  (`build/assert-door-only-adds.mjs:252`); the review notes say what Start does (guideline 2.3.1(a)) and name the agent
  marks as identifying the agents a person already installed.
- **Owed, not run here**: `probe:p314` (the push seam moved, D31; it spends real model turns and starts Gemini, refused
  under this phase's rules); his ruling decides when.
- **Stale probe literals at HEAD, stated and not changed**: a FRESH profile's first Allow now allows twelve routes, so
  `ROUTE_LINE`/`WRITE_LINE` in `build/p317/probe-p317.mjs:174-175`, `build/p318/probe-p318.mjs:211-212`,
  `build/p337/probe-p337.mjs:189-190` and `build/p3167/probe-p3167.mjs:166` read eleven and will be red at HEAD the next
  time those probes run; a one-line follow-up each.
- **The risk he accepted** (D20) goes in the commit body in his words.
- **History**: `~/.zsh_history` moved once between two of the spec step's commands (not across one), §12.

## 12. What the spec step measured, how, and the numbers

| # | What | Command (scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`, `TERM_SESSION_ID` unset; pinned tsx `node_modules/tsx/dist/cli.mjs --tsconfig tsconfig.node.json`) | Exit | Numbers |
| --- | --- | --- | --- | --- |
| M0 | his history and the disk | `stat -f '%z %m' ~/.zsh_history ~/.bash_history`; `df -h /` | 0 | `737736 1792023873`, `23166 1790702242` at the start; after M1 unchanged; before M5 `~/.zsh_history 737941 1792173359` (moved BETWEEN commands, by a shell not this step's), unchanged across M5 and after; 115 GiB free |
| M1 | the parent's compiled agent table, flags and defaults | `…/scratchpad/p346/spec/m1.mts` importing `registry.ts`, `flags.ts`, `settings.ts`, `resolve.ts` | 0 | 13 launchable compiled ids: claude, cursor, codex, gemini, droid, deepseek, antigravity, muse, qwen, pi, omp, grok, opencode, `iconKey` equal to the id each, bins `claude, cursor-agent, codex, gemini, droid, codewhale, agy, muse, qwen, pi, omp, grok, opencode`; `AGENT_FLAG_PRESETS` 22 danger presets, 17 VERIFIED (claude 2, cursor 1, codex 3, gemini 2, antigravity 1, muse 4, omp 2, grok 1, opencode 1); the file's whole `danger: true` count 28; `defaultAgent` `claude`; `launchDefaults` and `captureDefaults` empty out of the box |
| M2 | the start-nothing install read | same script: 13 rows' `launch.argv[0]` through `resolveBinaryAgainst` over a 30-folder scratch PATH (two holding stand-in `claude` and `codex`), 200 runs | 0 | median 1.67 ms, p95 1.86 ms, max 2.86 ms for all thirteen; found exactly `claude`, `codex`; `extraBinDirs()` 8 folders |
| M3 | the route pins | node `createHash('sha256')` over the sorted `METHOD path` lines | 0 | eleven `ea5930e0f87bba2da4912971431d254526f39480b1bb8c326045938391b39a14` (the parent's R4 and AR3 pin); twelve with `POST /v1/start` `1b92ce21d601f9202eee2f196f32a1d8a3f275c1dd46c558779516ed77fcf57f` |
| M4 | 333.12's sets over a planted twelfth route | `…/scratchpad/p346/spec/m5.mts` driving `allowed-routes.ts`, `pocketConfirmFace`, `pocketDoorHonesty`, `matchPocketRoute` | 0 | parent: 11 routes, `matchPocketRoute('POST','/v1/start')` null, the ledger lacks `start`; an absent store allows the eleven; a store naming `start` read at the parent is NOT whole (null, so the eleven); planted: served on record 11, waiting on record `['start']`, waiting with no record `[]`, the proposal with no record 12, with a record it includes `start`; the honesty over the eleven is `POCKET_DOOR_HONESTY` byte for byte; the face draws `New: start` with a null sentence until `POCKET_NEW_ROUTE_WORDS` has the row |
| M5 | the entry's citations | read at `0b87d0af` | — | §2 |

## 13. Questions for him

1. **On a Mac that has not allowed Start yet, what does the phone draw?** Research 141 §4.3 says nothing, and the Mac's
   Settings then Phone shows `New: start sessions from your phone` with Allow. The other choice is a dimmed "+" whose
   tap says one line, `Allow it on your Mac first: Settings, then Phone.` The Mac already tells the phone which (D9), so
   either is a phone-only change. **Recommended, and built: nothing.**
2. **Which project does New session preselect?** **Recommended, and built: the project where a session was started most
   recently** (D10). The other choice is the project at the top of the Sessions list (Recent, waiting first), which moves
   whenever a session waits.

---

## §As built (the integrator, 2026-10-16)

Integrated in `/private/tmp/wt-p346` over `0b87d0af`. Neither 333.4.1 nor 337.5 had landed (`git ls-remote origin
refs/heads/main` read `0b87d0af`), so the delta is this phase's alone: 61 tracked files changed (7,937 insertions, 339
deletions) and 49 new files, among them the 27 files of `ios/Tortie/AgentMarks.xcassets`. Nothing was committed, staged or
stashed. No Electron and no agent was started, and no model turn was spent. His shell history read
`~/.zsh_history 738630 1792177511` and `~/.bash_history 23166 1790702242` before and after every command of this step,
and neither moved across any of them. Disk was 91 to 95 GiB free.

### What the integrator changed, and why

1. **Eight `ablation:p313` arms re-anchored on the shipping text.** The mac builder moved three shapes those arms plant
   into: the caps line gained `start: 512`, `PocketWrites` now ends on `start`, and the one log line moved into
   `logWrite`. It named four of the arms (X11b, X11c, Z22a, NS8c). An anchor scan found the other four (R2e, Y1b, X5a,
   AR7c); the scan read `build/ablation-p313.mjs` as text with the TypeScript parser and checked every entry's `from`
   against the worktree, 618 entries in all. After the fix, 0 were missing. Each re-anchored arm is red on its owner.
2. **`gate:onlyadd` can now freeze a set that holds `start`** (`build/p33311/swift-wire.mjs`,
   `build/assert-door-only-adds.mjs`, `build/p33311/ablation.mjs`). The full `ablation:p33311` was RED at HEAD and green
   at the parent, apart from P0d, which also misses at the parent. A freeze of today's tree failed its own clauses on
   three counts, so §11's second frozen set could not have been taken at the release:
   - **R2 failed** because the replay had no fake `start` verb and only served the launch door's eleven routes.
   - **A2 failed** because the Swift reader typed every `WriteRoute` case's answer as `WriteResult.of`'s
     `PocketWriteAnswer`.
   - **R7 failed** because M3 to M10 froze a `launch` label from a twelve-route tree.

   The fixes:
   - The reader types a write by its own `<Verb>Result.of` when one exists, so `/v1/start` answers `PocketStartAnswer`.
   - The gate's Mac side names `PocketStartAnswer` for `start`.
   - R2 replays a LATER set (any label but `launch`) that calls a route the launch door does not serve through the door
     a store allowing every route it calls sets up. The launch set keeps the launch door, which is why R7a stays red.
   - The fake `start` and its expected input are added.
   - M3 to M10 freeze a `mode` set beside a copy of the committed launch set, which is the freeze a release takes. M1
     and M2 still ask about `launch`.
   - C2's anchor moved to the route list's new last id.

   Each of the four code fixes was reverted alone in a scratch clone, and a `second` set was frozen beside launch each
   time. The control froze (12 routes, 37 types, 529 arms). The reader revert failed R2, A2 and A3. The Mac-type revert
   failed A3. The served revert failed R2 (404, no verb). The expected-input revert failed R2. M3 is the standing proof
   of all four.
3. **az7 was not given a new clause.** `build/p3333/sample.mjs --check` already holds the offer in the book: its proof (2)
   and three self-test breaks fail when the offer is moved, removed, or names an agent the world does not run.
4. **CHANGELOG.md**: one item under `## Unreleased` / `### Added`, with no full stop, so the follow-up can add the link.
   **CLAUDE.md**: the `conformance:pocket`, `conformance:ios`, `gate:onlyadd`, `test:ios` and `probe:p316` rows were
   widened, and a `probe:p346` row was added after `measure:p318`.

### The commands, each with its exit code and numbers

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run typecheck` (twice, before and after the gate fixes) | 0, 0 | 1,432 production files, 0 import violations; 1,429 files, 0 runtime cycles |
| `node build/p3333/sample.mjs` then `--check` | 0, 0 | 5 sessions, 36 states, 1,980 list answers, 332,645 bytes; regenerated byte for byte (sha256 `5a4b90ec…`); `constants.start` holds the offer (2 projects, `local` with claude and codex, chosen `sample-project-lighthouse`, default `claude`) |
| `node build/p316/vectors.mjs` then `--check` | 0, 0 | 47 signed requests (39 writes), 24 answers to 11 routes; regenerated byte for byte (`6fb77a08…`); against the parent only request 46 (`start`) was appended |
| `node build/p346/agent-marks.mjs --check`, `--self-test` | 0, 0 | 13 marks byte for byte |
| `npm run build` (twice) | 0, 0 | 46 s, 42 s; `gate:onlyadd` PASS (1 frozen set, 11 routes served, 158 requests replayed); contract inventory byte for byte |
| full `npm test` (scratch HOME and ZDOTDIR, `HISTFILE=/dev/null`) | 0 | 1,147 files passed, 2 skipped; 21,522 tests passed, 14 skipped; 65 s |
| `npm run conformance:pocket` | 0 | 165 rules, 22,310 checks, 8.8 s |
| `npm run conformance:pocket:hostile` | 0 | 297 arms, 17.8 s; NSH1 to NSH14 (and NSH1b, NSH5b, NSH11a/b, NSH12b) ok, NSH8 over 37 bodies |
| `P313_ONLY=<56 arms> node build/ablation-p313.mjs` | 1 → re-run | all 56 arms red on the rule that owns them: the 49 new or widened arms (NS1a to NS12a, R2j, R3i, R4s, X1j, X3q, X4q, X5q, X6q, X12h, AR9s, Z1s, O2n, SU5b, L5s) and the 7 re-anchored (R2e, Y1b, X5a, X11b, X11c, Z22a, AR7c). The first run had 46 red and 10 with nothing numbered, while load averages read 300 to 936; the harness's 120 s check timeout cut them. Re-run: 9 of those 10 red (165 s), and X3q red alone (93 s). NS2c and X3q were also planted by hand in a scratch clone, each red on its owner in 10 to 16 s |
| `npm run gate:onlyadd` (three times) | 0, 0, 0 | PASS; P4 (printed, never red) DIFFERS from launch at 44, then 70 paths once the reader typed `/v1/start`; request 10, which leads the list, is identical to the parent's, so the drift is not this phase's |
| `node build/p33311/ablation.mjs --only P0e,R8c` | 0 | P0e red on P0, R8c green |
| `node build/p33311/ablation.mjs` (full), HEAD before the fix | 1 | 109 of 110 red, 14 of 15 controls (C2 missing its anchor), M3 to M10 MISS |
| the same at the PARENT (`git archive 0b87d0af` into scratch) | 1 | 108 of 109 red, 15 of 15 controls, M1 to M10 held, P0d MISS: P0d is the parent's own |
| the same at HEAD after the fix | 1 | 109 of 110 red, 15 of 15 controls, M1 to M10 held, P0d MISS as at the parent, so no worse than the parent |
| `npm run gate:contract` | 0 | inventory byte for byte; no channel, `GMUX_` name, storage key or schema moved |
| `npm run conformance:ios` (twice) | 0, 0 | 52 rules over 56 app files, 78 test files, 162 files under `ios/` |
| `P316_ONLY=<33 arms> node build/p316/ablation-ios.mjs` | 0 | 33 of 33 red on their owners (bb1a to bb10a, ab30, ab31, v43, t42, az34, az35, ba11, ac40), 345 s |
| `npm run conformance:phonecopy` | 0 | OK |
| `npm run conformance:manager` | 0 | 64 rules, 2,688 checks |
| `npm run conformance:machines` | 0 | PASS, 46 s |
| `npm run conformance:shellenv` | 0 | PASS |
| `npm run conformance:push` | 0 | 26 rules, 2,401 checks |
| `npm run gate:simulator`, `gate:checks`, `gate:electron`, `gate:background` (twice each) | 0 | simulator: 4 users, floor 4; electron: 177 users, floor 177 |
| `node build/p346/probe-p346.mjs --grader-self-test` | 0 | 14 graders, 64 clauses, each red on its own break |
| `node build/p316/probe-p316.mjs --grader-self-test` | 0 | every suite PASS; start 73 cases (NP1 to NP11 and NPH) |
| `node build/p316/test-ios.mjs --self-test` (after the reader fix) | 0 | PASS |
| `npm run test:ios`, iOS 26.3 (lock slot `electron.lock2`, released on the same line) | 0 | 406 s; Debug 950 tests, 0 failures, 0 skipped; Release 947, 0, 0; every P346 suite named; the start door read 4 starts, 4 verified, 2 held, 2 answered; `P346_TRANSPORT` vector `done,same`, kept `same`, withheld `notSent(cancelled)`, reader `done`; device archive unsigned, no DEBUG seam |
| `P316_RUNTIME=18.3 npm run test:ios` (lock slot `electron.lock2`) | 0 | 356 s; iOS 18.3.1, Debug 950 tests, 0 failures, 0 skipped; Release 947, 0, 0; the same start door counts and `P346_TRANSPORT` rows as 26.3 |
| `xcrun simctl list devices \| grep -c p316-` (at the end) | — | 0 |
| the Electron count, once, at the end | — | none of this run's; the lines are his own Tortie (ppid 1), Chrome, Slack, Granola and Cursor |

`test:ios` ran before the reader fix. The fix changes only whether today's phone reads exactly a frozen set, and it did
not before or after, so the refuse arms print `skipped` either way. The test's own self-test passed after the fix.

### The builders' decisions the spec did not name (accepted as built)

- **mac**: the start branch is its own function after the handler; one `logWrite` serves every verb; `parseStartBody`
  also refuses a body over 512 bytes, a key given twice and an escaped value; `pocketStartOf` refuses an over-cap list
  but clips a long string; `defaultAgent` is null unless the offer lists it; `composeStartOffer` takes no `home`; a `done`
  with an unreadable session is `failed` START_FAILED; `PocketStartInput` is named; readiness reads `machineRowStatus`
  and `readyRemoteContext` directly.
- **phone**: no `Copy.startProject` or `Copy.startAgent` (reuses `groupProject`, `agent`, `cancel`); `KeptStart` keeps
  `mac`; `signedPost` returns `PostEnd`; `PocketSessionsAnswer.start` is a `var`; the offer decoder checks that the offer
  holds together; a done start says `Copy.newSession`; the first choosable project is opened when main's choice is not
  connected; the session is pushed in the sheet's `onDismiss`; SVG path data is respaced for CoreSVG, and `--check`
  refuses unspaced data.
- **gates**: Y1, Z2, AF2, X2, L5, NS9, (t), (ab) and (az) were widened as the gates builder reported; L5's exemption
  covers exactly `pocketStart.start(` built by `createPocketStart(`.
- **probe**: three `SCRATCH_MACHINE_*` settings were added to `probe:p346`'s script, and it refuses without them; S0 and
  S1 are split (S0P, S1D); S7 is narrowed to the log lines and to write ids; NP4 reads UNREADABLE by design.

### Owed, and for the main session

- **Lens A and Lens B (§8.3) have not run**: `probe:p346`, `probe:p316` `start` and `sessions`, `probe:p313`, and the
  hostile phone. The `smoke`, `smoke:t1`, `smoke:t3` and `package` gates belong to the landing battery. `probe:p314` is
  owed (D31).
- **A real `omp` (`/opt/homebrew/bin/omp`) is on this Mac.** Tortie's own detection scan runs `--version` on any copy in
  its install folders, so `probe:p346`'s launches version-probe it. That is not a model turn, but the verifier should
  know before it runs.
- **Merging with the two phases beside this one** (dry three-way merges against their worktrees):
  - 333.4.1 conflicts in `CLAUDE.md` (2 hunks) and `ios/TortieUITests/P316DriveUITests.swift` (1).
  - 337.5 conflicts in `build/conformance-ios.mjs` (2) and `build/p316/ablation-ios.mjs` (3).
  - Every conflict is two appends at the same place, and keeping both resolves it.
  - `CHANGELOG.md`, `TortieApp.swift`, `Identifiers.swift`, `package.json` and `build/verification-checks.mjs` merge
    cleanly.
- The stale probe literals in §11 (`probe:p317`, `p318`, `p337`, `p3167`) are unchanged.

### The fix round (2026-10-16, after Lens 1 and Lens 2 answered needs_work)

The fix ran once, in `/private/tmp/wt-p346`, over the integrator's tree. Nothing was committed, staged or stashed. No
Electron, no Simulator and no agent was started, no lock slot was taken and no model turn was spent. His shell history
read `~/.zsh_history 738871 1792183350` and `~/.bash_history 23166 1790702242` before and after every command of the
round, and neither moved. Disk was 70 to 74 GiB free. No Swift file, no `ios/**` file, no vector and no contract line
moved, so the build number stays 11 and `gate:contract` reads byte for byte.

**What each finding came to.**

| Finding | Lens | What changed | Where |
| --- | --- | --- | --- |
| The install-read test was red under his real HOME (pi, grok and opencode found in his own install folders) | 1, major | The test expands the rows' own folders against a scratch home and an empty environment, through the real `expandDirs`. A new case plants pi in the scratch home's `~/.npm-global/bin` and proves the row's folders are still walked. Under `HOME=/Users/gdc` the file passes 26 of 26. With the mock taken out it fails 2 of 26, adding `pi`, `grok` and `opencode`, as Lens 1 saw | `src/main/sessions/__tests__/p346-pocket-start.test.ts` |
| A machine whose ssh stalled stayed `ready` | 2, major | Production readiness now also asks `machineFeedAnswering`: the link answers AND the last session list completed. This is the rule `src/main/machines/liveness.ts` already gives every session verb. A machine that stopped answering is `Not connected` in the offer and `refused` `machine` at the act. The next list that completes makes it ready again. `NS6` now requires the production readiness to call `machineRowStatus`, `readyRemoteContext` and `machineFeedAnswering`. Arm `NS6e` proves it: `return true` in its place reads `NS6` red | `src/main/sessions/pocket-start.ts` (`machineReadyNow`); new `src/main/sessions/__tests__/p346-start-machine-ready.test.ts` (6 cases; 3 red with the feed check removed); `build/conformance-pocket.mjs` NS6; `build/ablation-p313.mjs` NS6e |
| `probe:p346` S4 started his real DeepSeek CLI | 1 and 2, major | THE APP'S OWN PATH is now the scratch bin, ONE `node` link (for the Electron shim) and the system folders. It used to inherit whoever ran the probe, and Tortie merges the app's PATH into every create's search. The variables the rows' folders name (`$NVM_BIN`) are unset for the app and the login-shell precondition. THE INSTALLS FENCE runs before the first launch. It reads every candidate name of every launchable row through the checkout's own overlay merge, `expandDirs` and `resolveBinaryAllAgainst`, along the create's walk. The run is refused unless every copy is inside the run, or is the launched name's copy in `/opt/homebrew/bin` or `/usr/local/bin` behind its stand-in, which is printed as a shadow and only ever version-probed. Every `start()` asks that walk again before it sends, and a start on the machine names Claude Code or Codex only. S4 removes the CodeWhale stand-in only after the walk, with the stand-in treated as gone, finds nothing. S10 ends every session any `done` answer made, not only the ones an arm expected. RUN gains two clauses: the fence, and every manifest row's `argv[0]` inside the run or the far HOME. The header's stated exception is corrected | `build/p346/probe-p346.mjs`; `build/p346/fixtures/reviewer/{honest,broken}.json` |
| NS3's duplicate-key bodies could not reach `onlyItsOwnBytes` | 1, minor | Five bodies that one `JSON.parse` reads as the honest object: a duplicate agent, project or write id with the bad value FIRST, and an agent and a project written with a `\u` escape. `NSH8` gained the first four (41 bodies). Arm `NS3d` takes `onlyItsOwnBytes` out and reads `NS3` red | `build/conformance-pocket.mjs`; `build/p313/hostile-client.mts`; `build/ablation-p313.mjs` |
| NS4 stayed green with `machineId` dropped | 1, minor | `NS4` requires `projectMachineId` and `machineId` each once, in a spread that falls back to `{}`, under ONE condition that reads the row's machine. Arms `NS4d` (machineId dropped), `NS4e` (projectMachineId dropped) and `NS4f` (machineId under the capture condition) each read `NS4` red | `build/conformance-pocket.mjs`; `build/ablation-p313.mjs` |
| S1 read `machines:agents` as a view; it answers `[view]` | 2, minor | `machineAgentsViewOf` reads the array, both in S1 and in the 60 s scan wait. The expected machine `ready` now mirrors main's: the row `usable` and `ready`, the link `connected` or `polling`, and the feed `listed`, read through `window.gmux.machines.state()`. S1 is UNREADABLE when that state is not read. The far place's `omp` is the real `/opt/homebrew/bin/omp`, because the loopback machine is this Mac and `/opt/homebrew/bin` is a compiled install folder. The start guard refuses any far start but Claude Code and Codex | `build/p346/probe-p346.mjs` |
| S6's relay did not count a cut when the door closed its side while the answer was held | 2, minor | The cut is counted once per connection, by the probe's timer or by the door's close. The act's log line is looked for until 3 s after it. The reading keeps `how` (which way, held bytes, held status). The clause also requires `cuts >= 1`, and a refused fixture shows it red | `build/p346/probe-p346.mjs` |
| NP1 sorted the marks by x alone | 2, minor | `startMarks` orders by row (tops within 22 pt), then along the row. A wrapped 7 + 1 reading passes, and one with two marks swapped across the rows is red | `build/p316/probe-p316.mjs` |
| NP3 never caught `Creating…`; NP4 had no phone drive | 2, minor | NP3 forwards the start's connection 2.5 s late (`relay.delayNextBy`, as P3 and P9 hold `Sending…`), on 26.3 and the 18.3 floor. NP4 is now the phone half of a start on another machine, over a new hostile arm, `start-remote`. The machine's project is picked and its one agent pressed. ONE verified POST must name exactly that project and that agent. The door's event carries the ids it offered and the place it put the project in. The Terminal must open, with no owner check. The door's own self-test drives the arm with the node phone (112 ok, 0 FAIL). `probe:p316` still runs no machine, so the Mac half of that start is `probe:p346`'s S3 | `build/p316/probe-p316.mjs` (`gradeNp4`, 10 self-test cases); `build/p316/hostile-door.mjs`; `build/p346/fixtures/reviewer/p316-start.json` (5 cases) |
| His history moved while other lenses' probes ran | 1 and 2 | Not traced to a run of ours. Lens 2 found no `.zsh_history` in either scratch HOME and moves with no verifier command running. The file did not move across any command of this round. The one hardening found: `probe:p316` handed its Electron neither `ZDOTDIR` nor `HISTFILE`, and passed `TERM_SESSION_ID` through. It now gives `ZDOTDIR` the scratch HOME, `HISTFILE=/dev/null` and no `TERM_SESSION_ID`, as `probe:p346` already did | `build/p316/probe-p316.mjs` |
| The "+" is an 18 × 16 pt target | 2, nit | Left. It matches its siblings on the title row (the menu 20 × 19, Select 48 × 24), and D21 sets no size | none |

**Decisions this round made, and why.**

- **Readiness is the session verbs' liveness rule, not ⌘T parity.** §3.1 promises `machine` for a machine that stopped
  answering, and S3 grades it. ⌘T's `ready` (`machineCanHoldSession`) never reads liveness, so parity could not keep
  that promise. Without the change, a start would hold the Mac's one start in flight until the create's own reads gave
  up. **STATED LIMITS:**
  - Right after launch or a wake, the feed reads `unknown` until a list completes. For those seconds the phone dims the
    machine's projects, where ⌘T would let the create read the list itself.
  - A stall that begins after the last completed list, and before the next poll misses, is still started into. That
    window is bounded by the create's own reads and was not measured.
  - Today there is no phone start, so neither limit is a regression against today.
- **The installs fence allows one kind of real copy**, the launched name's copy in a compiled system install folder
  behind its stand-in. Tortie's detection scan, and the loopback machine's agent scan, ask that copy for its version,
  as every `GMUX_PROBES` launch on this Mac does. No scratch HOME can move those two folders. A dry run of the fence's
  own tsx text found exactly that kind of copy and nothing else on this Mac:
  - The scratch run folder with stand-in names planted, `HOME` scratch, and the app's PATH, exit 0.
  - Every launchable row resolves inside the run, except `/opt/homebrew/bin/omp` behind its stand-in.
  - `codew` and `deepseek` resolve nowhere.
  - `/usr/local/bin/gemini` exists, but the hidden overlay renames gemini's row, so nothing reaches it.
- **NP4 is graded in two halves.** `probe:p316` has no machine, and wiring the loopback machine into it is a
  probe-sized change this round could not run. The hostile door proves the phone's half: what it sends for a project
  on a machine, and what it opens. S3 proves the Mac's half: the far server holds the session, and the process starts
  as main recorded it.

**The commands, each under a scratch HOME and ZDOTDIR with `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset, unless
named.**

| Command | Exit | Numbers |
| --- | --- | --- |
| `vitest` p346-pocket-start (scratch HOME), then `HOME=/Users/gdc` | 0, 0 | 26 of 26 both ways |
| the same with the `expandDirs` mock taken out, `HOME=/Users/gdc` (restored by sha256 `aa62e073…`) | 1 | 2 failed of 26, received adds `pi`, `grok`, `opencode` |
| `vitest` p346-start-machine-ready; then with `return true` for the feed (restored by sha256 `58958443…`) | 0, 1 | 6 of 6; then 3 of 6 failed |
| the seven p346 test files, `HOME=/Users/gdc` | 0 | 7 files, 99 tests |
| `npm run typecheck` | 0 | 1,432 production files, 8,155 imports, 0 violations; 1,429 files, 4,976 runtime edges, 0 cycles |
| `node build/p3333/sample.mjs --check`; `node build/p316/vectors.mjs --check`; `agent-marks.mjs --check`, `--self-test` | 0, 0, 0, 0 | sample byte for byte; 47 signed requests; 13 marks |
| `npm run build` | 0 | 85 s; `conformance:ios` PASS (52 rules); `gate:onlyadd` PASS (P4 70 paths, printed, as the integrator's); contract inventory byte for byte; `gate:simulator` 4 of floor 4; `gate:electron` 177 of floor 177 |
| full `npm test` | 0 | 1,148 files passed, 2 skipped; 21,529 tests passed, 14 skipped; 80 s |
| `npm run conformance:pocket` | 0 | 165 rules, 22,328 checks, 10.8 s |
| `npm run conformance:pocket:hostile` | 0 | 297 arms, 19.9 s; NSH8 over 41 bodies |
| `P313_ONLY=NS3a…NS3d,NS4a…NS4f,NS6a…NS6e node build/ablation-p313.mjs` | 0 | 15 of 15 red on their owner (NS3a also X2, NS6c also X6), 226 s; 623 entries in all (569 at the parent, 49 the build's, 5 this round's) |
| `node build/p346/probe-p346.mjs --grader-self-test` | 0 | 14 graders, 66 clauses, each red on its own break; the fence, `createPick`, `startRefusal` and `machineAgentsViewOf` each on planted readings; the review's 47 broken readings |
| `node build/p316/probe-p316.mjs --grader-self-test` | 0 | start 123 cases (NP4's 10 and the review's 5 among them); 0 FAIL in any suite |
| `node build/p316/hostile-door.mjs --self-test` | 0 | 112 ok, 0 FAIL; `start-remote` names that project, `codex` and `p346far` |
| `P316_ONLY=t42 node build/p316/ablation-ios.mjs` | 0 | t42 red on (t) over the edited hostile door |
| `npm run conformance:phonecopy`, `conformance:manager`, `conformance:shellenv`, `conformance:push`, `conformance:machines` | 0 each | OK; 64 rules; PASS; 26 rules; PASS (47 s) |
| `npm run gate:simulator`, `gate:checks`, `gate:electron`, `gate:background`, `gate:contract`; `node build/p316/test-ios.mjs --self-test` | 0 each | as in the build; 10 checks |

**Not run this round, and why.**

- `probe:p346` and `probe:p316 P316_ARMS=start`: an Electron and Simulators. They are the reverify's, and they are
  what must now read S1, S3, S4, S6, S10, RUN, NP1, NP3 and NP4 live.
- `test:ios` on 26.3 and 18.3: nothing it reads moved this round. No `ios/**` file, no `build/p316/test-ios.mjs`, no
  vector, and no `pairing.ts` or `tls.ts` changed.
- `ablation:p33311` in full: no contract and no Swift moved.
- The full `ablation-p313` and `ablation-ios`: only the arms on the rules this round touched were re-run.

**One slip.** This round once ran `node -e "import('…/build/conformance-pocket.mjs')"` meaning only to check its
syntax. That ran the gate, outside the history-stat wrapper. The gate reads the tree and nothing under a home, and the
history read `738871 1792183350 | 23166 1790702242` straight after, unmoved.

### The ruled round (2026-10-16 and 17, after the reverify answered needs_work a second time)

The reverify found no defect in the Mac app, and the operator ruled: "Fix all, re-check once, land". One agent made
every fix and ran the one re-check. Nothing was committed, staged or stashed. No file under `src/` changed in this
round: the Mac app is the fix round's.

**What changed, and why.**

| Item | What changed | Where |
| --- | --- | --- |
| 1. Create pressed during the dismissal | `StartModel.Phase` gains `.done`. A `done` answer with its session sets it before `opened(`, and the start's task returns the phase to `.idle` only from `.starting`, so from the done answer until the sheet is gone Create reads `Creating…`, cannot be pressed, and no choice moves. The model goes with the sheet (`.sheet(item:)` makes a fresh one per "+"), so `.done` is never left. Before it, the phase went back to `.idle` while the sheet animated closed and a press there would have sent a FRESH write id and started a second session. A refusal, no answer, not taken and not sent all still return to `.idle` | `ios/Tortie/Screens/Start.swift`; `ios/TortieTests/StartTests.swift` (`testDoneKeepsCreateOffUntilTheSheetIsGone` presses at `opened`, inside the read of Sessions and after the task ends and requires `.done` each time, one runner and one start; `testARefusalGoesBackToIdle`; the done test now reads `.done`) |
| 2. The "+" was an 18 × 16 pt target | `StartTitleControl` is ONE Button whose label is the glyph padded out by `StartFrame.plusReach` (17 up, 14 each side, 13 down: 46 × 46 pt) with that whole rectangle as its content shape, and OUTSIDE the Button the same lengths are given back (`plusGiveBack`), so the row lays out exactly as before. It reaches up rather than down because the Show control's capsule starts 13 pt under the glyph, and its 14 to the left stops 2 pt short of Select's end. It is one real Button, so `.disabled(` sets its own not-enabled trait and VoiceOver reads it New session; its element's frame is now the press, 46 × 46 pt around the same glyph. Both insets are literals, as rule (k) asks. THREE SHAPES FAILED FIRST, each measured by NP12 or NP1 in a probe run: the padding given back INSIDE the label pressed nothing past the glyph (a Button's shape is its label's frame; iOS's touch radius alone reached 17.5 pt along each axis and no corner); the square as the Button's background, and the square and the Button as two overlays of a hidden glyph, each made the call site's identifier name a container with no label (NP1 read the "+" named "" and, on 18.3, a press of it opened nothing) | `ios/Tortie/Screens/StartSheet.swift`; the measurement is NP12 below |
| 3. A stall on a live connection holds the Mac's one start | Stated, not changed. See the limit below | this section |
| 4. probe:p313 started his real Claude Code | The Electron gets `ZDOTDIR` its scratch HOME, `HISTFILE=/dev/null`, no `TERM_SESSION_ID` and no `$NVM_BIN`, and a PATH of the stand-in, one `node` link and the system folders; its `.zprofile` names that PATH and inherits nothing. Before anything starts the login shell the app will ask, with that environment, must resolve `claude` to the stand-in, or it REFUSES (exit 2). Every launchable row but `claude` is renamed in `agents.json` before each launch (the ids read from the registry through the pinned tsx) and read back absent. RUN gains an agents clause over every manifest row (a copy beside its WAL), UNREADABLE when unread, with seven self-test cases. C0's write routes are the table's five: its literal had stayed at 318's three and read FAIL at HEAD and at the parent alike | `build/probe-p313.mjs`; `build/scratch-login.mjs` (new: `scratchShellEnv`, `plantedResolve`, `manifestSessions`, `launchableAgentIds`, `within`) |
| 4. The audit | Every probe built from the same pieces, below | the probes named there |
| 5. NP3 read FAIL over a correct app | The UI test's start-created loop no longer stops when the label leaves `Creating…`: with no new line it reads on until the sheet is gone (3 s at most), and `sheetGone` is read at the FINAL read, beside `goneInLoop`. NP3 also refuses a label after `Creating…` that can be pressed while the sheet is up, which is item 1's live proof | `ios/TortieUITests/P316DriveUITests.swift`; `build/p316/probe-p316.mjs` (`gradeNp3`, two self-test cases) |
| 6. RUN's manifest clause could never read | `manifestArgvOutside` reads a COPY of the manifest with its `-wal` and `-shm` (the app's own file is WAL-mode with no `-shm` after a quit, and `sqlite3 -readonly` answered "unable to open database file (14)"). A manifest not read makes RUN UNREADABLE (`UNREADABLE_WHEN.RUN`), never FAIL | `build/p346/probe-p346.mjs`; `build/p346/fixtures/reviewer/broken.json` (the unread case now expects UNREADABLE, one case added) |
| 7. RUN's history clause tested nothing | `historyStat` stats `os.userInfo().homedir`'s two files, never `$HOME`'s, which read `none|none` under the scratch HOME. Either file missing makes RUN UNREADABLE | `build/p346/probe-p346.mjs` (four `verdictOf('RUN', …)` self-test lines) |
| 8. NS6 named the feed and never held its value | NS6 requires every return of the production readiness to be `false` but its last, which is exactly `return machineFeedAnswering(<its parameter>)`, and the offer's place `ready: <place> === LOCAL_MACHINE_ID ? true : machineReady(<place>)`, once. `ablation:p313` gains NS6f (`|| true`), NS6g (the feed called, its answer dropped) and NS6h (the offer skipping readiness): 626 arms | `build/conformance-pocket.mjs`; `build/ablation-p313.mjs` |
| 9. The fix round's items | Re-confirmed, below | |
| `gate:checks`'s floor | `build/scratch-login.mjs` is the 54th top-level script that calls `tsxCli()`, so `RUNNER_CALLER_FLOOR` is raised from 53 to 54 in `build/assert-hermetic-checks.mjs`, with its sentence, as the floor rule asks | `build/assert-hermetic-checks.mjs` |
| Found on the way: probes whose self-tests this phase reddened | Phase 346 added `start` and left four sibling probes' route lines at 337.1's. `probe:p317`, `probe:p318`, `probe:p337` and `probe:p3167` read their route line red against the tree's `POCKET_ROUTE_IDS`, and `probe:p317`, `probe:p318` and `probe:p337` held a write line a run at HEAD would read red. Their `ROUTE_LINE`, `WRITE_LINE` (and p337's `ROUTE_IDS` and its parent clause) name `start` now, and every one's self-test passes. `probe:p316` had no stand-in precondition; it has one now (`claude` and `codex`, UNREADABLE and exit 2 otherwise) | the four probes; `build/p316/probe-p316.mjs` |

**The stated limit (item 3).** A machine whose ssh stalls while its connection stays up keeps the Mac's ONE start in
flight for about 25 s. The reverify's arm RV1 measured it on 2026-10-16: the loopback machine's sshd and its children
paused by pid, a far Claude Code start sent at once, and a local start every 3 s from a second phone. The offer still
said the machine was ready at 1.5, 4.6 and 7.6 s and said not ready from 10.7 s (main logged "did not answer the last
list"). The start in flight was held about 25 s, until the create failed on its own bound, and every local start
from the other phone answered `busy`, "Your Mac is starting another session. Nothing was started.", from 1.5 s to
23.0 s; the first `done` came at 26.1 s. The far phone got no answer (the door cut it at 15.0 s), no session appeared
on the far server during the pause or in the 60 s after it, and the same write id sent again read the recorded
`failed`. So nothing is started twice and nothing is left half-made; what a person sees is up to about 25 s in which
every other phone's start is refused `busy`. A stall that starts after the feed's last completed list is the window:
once a list is missed (about 10 s here) the offer dims the machine and a start is refused `machine` in 13 ms.

**The audit (item 4): the probes built from the same pieces.**

| Probe | Plants | `ZDOTDIR`, `HISTFILE`, `TERM_SESSION_ID` before | Refused when a planted name is not its stand-in, before | Now |
| --- | --- | --- | --- | --- |
| `probe:p313` | `claude` | none | no | CHANGED: the three, a closed PATH, the precondition, every other row renamed, the manifest clause |
| `probe:p314` | real `claude` and `gemini` through its own wrappers, by the operator's ruling | none | no | CHANGED: the three, and the precondition over every wrapper it wrote |
| `probe:p316` | `claude`, `codex` | held (its fix round) | no | CHANGED: the precondition (`claude`, `codex`) |
| `probe:p317` | `claude` | none | no | CHANGED: the three, the precondition; and `start` in its route and write lines |
| `probe:p318` | `claude`, `codex` | held | held | held; `start` in its route and write lines |
| `probe:p3167` | `claude` | none | no | CHANGED: the three, the precondition; and `start` in its route line |
| `probe:p330` | `claude` | none | no | CHANGED: the three, the precondition |
| `probe:p332` | nothing, and it starts no session | none | not applicable | CHANGED: the three |
| `probe:p337` | `claude`, `codex` (Gemini's and Qwen's screens are drawn by shells) | held | held | held; `start` in its route and write lines and `ROUTE_IDS` |
| `probe:p346` | the eight | held | held, with the installs fence | held; items 6 and 7 |

Not changed and named for the main session: `probe:p33312` and `probe:p333121`'s self-tests are red at HEAD (2 of 150
and 2 of 185 checks). Their plant adds a twelfth route over a tree of eleven, and its anchors (`'scrollback'\n] as
const;` and the eleven face clauses) are this tree's no longer, because Phase 346 added the real twelfth. They measure
Phase 333.12's design over 0b87d0af's tree and older, and moving their anchors is a decision about that tooling, not a
literal; this round left them.

**Item 9, the fix round's items, each confirmed by something the fix round did not do.**

- Lens 1's machine-dependent `p346-pocket-start` test: run under a HOSTILE scratch home with a decoy agent in every
  install folder Tortie walks (`~/.local/bin/pi`, `~/.npm-global/bin/opencode`, `~/.grok/bin/grok`,
  `~/.claude/local/claude`, `~/.cursor/bin/cursor-agent` and five more), never his own home: the seven p346 files
  pass, 99 of 99. With the test's `expandDirs` mock taken out in a clone, the same file fails 2 of 26 under the
  hostile home (the decoys counted) and 1 of 26 under a plain scratch home, so the home is what it now ignores.
- NS3 and NS4: all 43 Phase 346 arms of `ablation:p313` (NS3d and NS4d to NS4f among them) red on the rule that owns
  each, 399 s.
- S1's array read and S6's relay cut count: `probe:p346` S1 and S6 PASS live (re-check c).
- NP1's (y, x) sort: NP1 PASS on 26.3, on the 18.3 floor and over the hostile door's honest offer (re-check a), eight
  marks wrapped 7 + 1.

**The commands, each under a scratch HOME and ZDOTDIR (the same folder) with `HISTFILE=/dev/null` and
`TERM_SESSION_ID` unset, TMPDIR the system's.**

| Command | Exit | Numbers |
| --- | --- | --- |
| `npm run typecheck` | 0 | 1,432 production files, 8,155 imports, 0 violations; 4,976 runtime edges, 0 cycles |
| `npm run build` | 0 | 46 s; `conformance:ios` PASS (52 rules), `gate:onlyadd` PASS, the contract inventory byte for byte, `gate:electron` 177 of floor 177, `gate:background` 3 of 3 in a `finally`, `gate:simulator` 4 of floor 4 |
| the whole vitest (`node_modules/.bin/vitest run`), three times, and once at the parent | 1, 1, 1; the parent 1 | At HEAD, under load averages of 80, 160 and 7: 1,146, 1,145 and 1,146 of 1,150 files passed, and every failure was in `store-watch.native` or `repo-watcher.native` (FSEvents, with `fseventsd` near 100 % of a core), plus once the p33122 walk's 62 s timeout. AT THE PARENT, run a minute after the third and the same way: the SAME 5 tests in the same 2 files fail, 1,139 of 1,143 files pass. Those three files alone at HEAD: 0, 6 of 6 tests. No file this phase or this round touches; 21,524 tests pass at HEAD |
| the seven p346 test files under the hostile home | 0 | 99 of 99 |
| `npm run conformance:pocket` | 0 | 165 rules, 22,340 checks, NS6 162 checks |
| `npm run conformance:pocket:hostile` | 0 | 297 arms, 17 s |
| `gate:onlyadd`, `gate:contract`, `conformance:ios`, `conformance:phonecopy`, `gate:simulator`, `gate:checks`, `gate:electron`, `gate:background` | 0 each | `conformance:ios` re-run after every change to the "+", last 52 rules over 56 app files |
| `P313_ONLY=` the 43 NS arms `node build/ablation-p313.mjs` | 0 | 43 of 43 red on their owner; 626 arms in the file. A first run of the eight NS6 arms read NS6b red elsewhere once at a load average near 80; alone, and in the 43, it is red on NS6 |
| `P316_ONLY=bb1a…bb10a node build/p316/ablation-ios.mjs` | 0 | 25 of 25 red on (bb), 198 s, over the final "+" |
| `--grader-self-test` of `probe:p346`, `probe:p316`, `probe:p313` | 0 each | p346: 211 ok, the RUN UNREADABLE cases among them; p316: NP3's two and NP12's 14 cases among them; p313: N1 and the seven agents' RUN cases |
| the same of `probe:p317`, `probe:p318`, `probe:p337`, `probe:p3167`, `probe:p330`, `probe:p332`, `probe:p314` | 0 each | p317 13 graders and 61 clauses, p318 25 and 80, p337 24 and 99, p3167 9 and 33 (each red on ROUTE_LINE before this round) |
| `node build/p316/hostile-door.mjs --self-test`; `node build/p316/test-ios.mjs --self-test` | 0, 0 | 112 arms; 10 checks |
| `npm run test:ios` (26.3), then `P316_RUNTIME=18.3`, each twice: before the final "+" and on it | 0, 0, 0, 0 | On the final app: 26.3 Debug 952 tests and Release 949, 0 failures, 315 s; 18.3 Debug 952 and Release 949, 0 failures, 305 s (the new StartTests among them); every Mach-O read, no p316- device left |

**The re-check, one at a time under a lock slot, every agent a stand-in.**

| Arm | Verdict | Time | What it read |
| --- | --- | --- | --- |
| (d) `probe:p313`, kept | PASS, every arm, exit 0 | 28 s | The precondition: `claude` resolves to the run's stand-in. C0 (the five writes), B1, S1 and every other arm PASS; RUN's agents clause: 4 rows, both `claude` rows `/private/tmp/p313-probe-51461/home/.local/bin/claude`, 2 shells `/bin/zsh`. My own read of the kept manifest (`file:…?immutable=1`) agrees, and the scratch HOME holds no `.claude.json`, which a real Claude Code writes on its first start (the reverify found one) |
| (c) `probe:p346` with the parent (a `git archive 0b87d0af` copy, built), kept | 14 of 14 PASS, RUN included, exit 0 | 355 s | The installs fence held at HEAD and the parent (the one shadow `/opt/homebrew/bin/omp`, version-probed only). RUN read the manifest, 51 rows, 0 outside the run, and his history `738915 1792205954 | 23166 1790702242` before and after, unmoved. My own immutable read: 42 rows under the run's `home/.local/bin`, 9 under the far HOME's, 0 elsewhere. S5: cold 42 ms, warm 20 starts 25 to 62 ms, remote 5 starts 114 to 124 ms |
| (a) `probe:p316 P316_ARMS=start`, kept | every arm PASS on the final "+", exit 0 | 1,492 s | NP1 on 26.3, the 18.3 floor and the hostile door's offer; NP12: all 23 taps opened New session (the reach 17.5 up, 12.5 down, 13.5 left, 14.5 right past the glyph, at least 46 × 46 pt, the four corners of the 44 pt square), every frame on the row equal to the build before's before and after the taps, the "+" element the press `[354,58,46,46]` around the glyph `[368,75,18,16]`; NP3 on 26.3 and 18.3 with the labels `[Create, Creating…]` and the sheet gone in the loop (Create never drawn again while it closed), one session, no Face ID; NP4, NP2, NP5 to NP10 and all 16 NPH arms; no XCTAutomationSupport crash on the floor. Every manifest row: 6 `claude` and 1 `codex` at the run's stand-ins, 1 `/bin/zsh` |
| (a), the three runs before it | Run 1: every arm PASS but NP12 (FAIL). Runs 2 and 3: NP1 FAIL on 26.3, the floor and the hostile door's offer, NP12 FAIL and then UNREADABLE, and on the floor NP5 and NP3 UNREADABLE | 1,456 s, 1,436 s, 1,540 s (and one 8 s run whose UI test did not compile: a local named `element` hid the drive's `element(_:)`) | They are the three failed shapes of item 2: run 1 read iOS's touch radius reaching 17.5 pt along each axis and no corner; runs 2 and 3 read the "+" named "" and, on the floor, a press of it opening nothing, and their NP12 taps were placed around the element's grown frame and pressed Select and the Show control's Ended (a tooling slip: since then the probe hands the UI test where the build before drew the glyph, `start-reach:368_75_18_16`, underscores because the steps are joined by commas). Every other arm passed in each, and every session in each was a stand-in |
| (b) `probe:p316 P316_ARMS=sessions` on the final app, with `P316_PARENT_IOS` naming `git archive 0b87d0af ios` as briefed; then the PARENT CHECKOUT's own `probe:p316 P316_ARMS=sessions` (its app, its UI test, its Mac build) | HEAD: 3 FAIL (SL6 on 26.3 and 18.3, PR), 1 UNREADABLE (SL8 on 26.3), every other arm PASS. The parent: 2 FAIL (SL6 on 26.3 and 18.3), SL8 on 26.3 UNREADABLE, every other arm PASS. NO ARM IS WORSE AT HEAD | 2,587 s; the parent 2,280 s | SL1 to SL5 and SL7 PASS at both, SL8 PASS on 18.3 at both and UNREADABLE on 26.3 at both (iOS 26's bar gives XCUITest no badge number, by design). SL6 reads the same sentence at both on both runtimes, "the turns drawn [24,25,26,27,28]… are not the 44 the door holds; the conversation was not paged to its first turn; 20 turn(s) drawn, the door's turnCount 44", and the UI test's own `turns` reading is turns 24 to 43 with the same asks at both: a pre-existing failure, measured at the parent, not this phase's, for the main session to queue. PR is not a Sessions arm: `P316_PARENT_IOS` names Phase 316.6's parent, 316.5, and its one finding, "the parent drew a Needs input tab, which 316.5 did not have", says only that 0b87d0af is not 316.5. Every session the Mac ran was a stand-in at both (HEAD 4 `claude` rows at the run's stand-in and the shells; the parent 4 and its shells); the 80 rows at `/usr/local/bin/claude` and `codex` are `seed-sessions.mts`' records, a path with no file on this Mac |

**What this round left, said plainly.**

- The parent checkout's run: its Electron was given a PATH of one `node` link and the system folders, and a `ZDOTDIR`
  whose `.zprofile` puts `$HOME/.local/bin` first, because 0b87d0af's `probe:p316` sets no `ZDOTDIR` and plants no
  precondition (the same hole as probe:p313's). That kept his agents off it (every session the stand-in), but with no
  `tmux` on that PATH, `build/electron-run.mjs`'s teardown, which runs `tmux -L <socket> kill-server` by its bare name,
  could not end the run's scratch tmux server (`-L gmux-p316-4746`); it outlived the probe until the coordinator ended
  it with `kill-server` on that socket. A later parent run should put a `tmux` on that PATH.
- History: one move, 738871 1792183350 to 738915 1792205954 at 22:59:14, 7 s into `ablation-p313` (a clone, the
  base checks and nothing interactive); every process of mine had `HISTFILE=/dev/null` and a scratch HOME and ZDOTDIR,
  and the shells recorded at the move were his own terminals'. Unmoved across every command after it, the
  re-check included.
- Not mine and left: `/private/tmp/p316-ablation-wwkWtv` (2026-10-16 18:30, before this round) and the socket files
  of earlier runs under `/private/tmp/tmux-501/`.
- Open for the main session: SL6 (above); `probe:p33312` and `probe:p333121`'s self-tests (above); the two native
  watcher test files, red at the parent too.

