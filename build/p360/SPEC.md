# Phase 360 — a create whose later step fails reports a failure for the session it started — SPEC

Written by the spec step on 2026-11-08 in `/private/var/tmp/tortie-wt/wt-p360`, a detached worktree at origin/main
`de9ea8f2` ("docs(backlog): 353 landed, seven items; link its changelog"). **`git diff de9ea8f2` in the worktree must be
exactly Phase 360's delta**, this file included. origin/main moves while the phase runs (Phases 357.1, 361.1 and 325.1
run beside it); nobody here rebases, pulls or merges. The charter is `docs/BACKLOG.md` "## Phase 360" (`:44794-44869`),
bound as written except where §0.1 says the tree or a measurement wins. Its sources: `build/p357/SPEC.md` §2.2 run 3
(`:240`), §3 row W2 (`:344`), §12 (`:620-621`), §13 item 2(b) (`:629-631`) and D19 (`:170`). Phase 117 binds the remote
half: a create whose answer was lost keeps its row, says it does not know and starts nothing twice, and that stays.
His standing rulings bind: no regression against today; just enough words; no tmux vocabulary on any surface; nothing
released, tagged, version-bumped, archived or uploaded; his session count is allowed (`build/electron-run.mjs`'s
read-only `list-sessions` of `-L gmux`, and nothing else).

| | |
| --- | --- |
| Subject | `fix(sessions): answer the session a create started when a later step fails` (the entry's) |
| First body line | `Phase 360: a create that started a session answers that session` |
| Semver | Patch, unreleased, Mac only, one CHANGELOG item under `## Unreleased`, `### Fixed` (§5) |
| Lane | Build: Spec → Build (FOUR builders, disjoint files) → Integrate → Verify (two lenses) → [Fix once → Reverify] → Commit |
| Tier | **3**: the create path is session lifecycle on this Mac and on other machines (`CLAUDE.md:268`). Two independent methods at least, one an attack (§10) |
| Menus | **No change.** No surface is added, renamed or removed. The ⌘T sheet closes on the session where it used to show an error |
| Contract | **No change.** No channel, env name, schema, migration, `gmux.*` key or smoke mode. `node build/contract-inventory.mjs --check` must pass unchanged |
| `HELPER_USER_FLOOR` | **184 → 185** (`build/assert-electron-teardown.mjs:598`): `build/p360/probe-p360.mjs` reaches the helper (obligation 1) |
| Built parent | `/private/var/tmp/tortie-wt/wt-p360-parent`, `de9ea8f2`, `node_modules` and `build/vendor` copied with `cp -Rc` (addon-webgl sha256 `e4ab05d2…`), `out/` built by the spec step (52 s, exit 0). Use it as `P360_PARENT_CHECKOUT`. Do not edit it; delete nothing in it |

## 0. The hard rules, stated once (every builder, the integrator, every verifier, the fixer and the reverifier)

- NEVER commit, stage or stash. `/Users/gdc/gmux` is read only. Never touch `/private/var/tmp/tortie-wt/wt-p3571*`,
  `wt-p3611*`, `wt-p3251*` or their scratch. Scratch lives under `/private/var/tmp/tortie-wt/scratch/p360/<role>/`, never
  under `/private/tmp`, which macOS cleans; a probe's `TMPDIR` points there too. NEVER run `npm install` or `npm ci`.
- **`-L gmux` is named only by `build/electron-run.mjs`'s census, and only with `list-sessions`.** Name `tmuxSocket` on a
  launch whose census you want. A run's own tmux commands aim only at its scratch socket with the checkout's vendored
  tmux (`build/vendor/tmux/bin/tmux`, 3.7b).
- **No real agent runs, not even for a version.** Every launch hides every probed registry row first
  (`build/hidden-agents.mjs`) and reads `agents:list` back; a run whose answer is not ok is UNREADABLE. Every arm here
  runs shells; no stand-in agent is needed.
- Never read his keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex`, any agent's or conversation store,
  his shell history's contents, or his live Tortie profile. Real data means his recorded shape through
  `build/p3167/seed-sessions.mts --shape his` (counts only).
- **His shell history is never written by us.** Every command that does not launch an Electron or need `/bin/ps`, `lsof`
  or ssh runs under `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb`. The four native tests that start
  `/bin/ps` fail inside it by design (name each as it fails). What needs `/bin/ps`, `lsof`, ssh or Electron runs outside
  it with `HOME` and `ZDOTDIR` in your scratch, `HISTFILE=/dev/null`, `SHELL=/bin/sh`, `TERM_SESSION_ID` and
  `TERM_PROGRAM` unset, and you say so. Record only `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before and after
  every run (`743166 1793987027` and `23166 1790702242` through the whole spec step). A move across an unblocked run:
  start nothing for 3 minutes and stat again; moved again is his; still moved means STOP and report.
- Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids you started, each read again by
  `ps -p <pid> -o command=` right before its signal; every process you start ends in a `finally`. Never signal a probe
  while its own teardown runs. Every Electron goes through `build/electron-run.mjs` inside `build/harness-socket.mjs`
  with a scratch profile, `HOME` and socket. HIS TORTIE HAS THE SAME BUNDLE ID AS EVERY BUILD: never send an Apple
  Event, run `osascript` or `open` an app. No Simulator. No real Tailscale, DNS, APNs or ssh to a real host: another
  machine is ONLY the loopback machine of `build/scratch-machine.mjs` with its quiet shell and scratch far home, as
  `probe:p340` builds it (never `build/with-scratch-machine.mjs`'s `isolated()`, which reads `~/.ssh/config`); never
  `smoke:remote` or `smoke:machines`. Never import a `build/` script to inspect it; importing `electron-run.mjs`,
  `hidden-agents.mjs`, `cdp-client.mjs`, `cdp-target.mjs`, `scratch-machine.mjs` and the door stand-ins to USE them is
  how a probe launches.
- The lock has three slots shared with the other phases: `zsh /private/tmp/tortie-ops/lock.sh try p360-<role>` prints
  the slot or exits 1 (retry every 60 s in a NEW command); release with `zsh /private/tmp/tortie-ops/lock.sh release
  <slot>` from a `trap` or `finally`. Every probe and app run holds one. `df -h /` before any build or clone; under
  8 GB free, wait and report. Count `~/Library/Logs/DiagnosticReports` by NAME and mtime only, before and after every
  Electron run.
- **Faults are made in scratch only**: through 357's harness-only seams (`setManifestFaultHook` in vitest;
  `GMUX_HARNESS_MANIFEST_FAULT`, `src/main/harness/manifest-fault.ts`, in a harness launch), a real SQLite lock over a
  scratch profile's manifest, or a scratch far home's login file. **This phase adds no product seam** (D17).
- **No rollback.** Nothing in this phase ends a session a create started, in any path, at any build.

## 0.1 What the entry got wrong or left open at this tree (the tree and the measurements win; each item binds)

1. **Citations at `de9ea8f2`.** `create-local.ts` did not move (every entry line holds). Phase 353 moved the rest:
   `broadcastSessions` is `core.ts:2885-2889` (entry `:2867-2871`); D19's `listSessions` is `:3303-3429`, its catch
   `:3420-3428`, `lastCleanList` written at `:3418` (entry `:3389-3403`); the ledger's create is `:3469-3473` (entry
   `:3445-3449`); `listProjects` is `:4268-4278` (entry `:4229-4239`). `remoteCreate` is `remote-sessions.ts:1770-2158`
   (entry `:1744-2132`, +26 from 353's import and `remoteCreateArgs`): the row `:1950-1976`, the far `new-session`
   `:1980-1992`, Phase 117's read `:1993-2050`, item 5 `:2051-2058`, `flight.answered` `:2063`, the stamps
   `:2069-2086`, the feed `:2108-2115`, item 6 `:2116-2123`; "none as shipped" is `:1816-1831` (entry `:1790-1794`).
   `tmux.createSession` is `src/main/tmux/sessions.ts:164-217`.
2. **Item 5 is proved, and it is wider than the entry says** (§2.3). The far command runs past a login file that prints
   first, so the session exists and carries this create's id. It is NOT only the names path: arm B1, a zsh `.zshenv`
   that prints, puts its line first on the PLAIN path (no names, every create as shipped), because sshd's `zsh -c`
   reads `.zshenv`. And arm C1, a login file that runs `exit 0`, returns exit 0 with no session at all, so "the command
   returned" does not prove the session ran either: only an identity read can decide (D10).
3. **Item 5 also copies far text into the answer.** The parent puts the far answer's first line into the error's
   `detail` (§2.2, R5a, R5b), and that line is the far account's own text. `createFailure`'s missing-folder pattern
   (`remote-sessions.ts:2266-2273`, `/no such file or directory|can't find|not a directory/`) matches a common login
   file line such as `…/.profile:3: no such file or directory: /opt/x/env`, so a design that carries the far text into
   an error can draw the wrong sentence. HEAD carries none (D10, CA4).
4. **A remote step the entry does not name.** The create's own feed pass (`startMachineFeed`, `:2108-2115`) throws from
   its manifest writes straight into the create's answer after the session was made and stamped (§2.2, R6b). An
   existing test pins that failure as the answer (`src/main/machines/__tests__/p326-inflight-create.test.ts:571-584`).
   And a feed list that times out reaches item 6 (R6c), with the row's column then `unknown`.
5. **The entry's app run cannot show "a second press makes two sessions" with 357's seam.** The seam arms only
   `SQLITE_CORRUPT` and `SQLITE_NOTADB` (357 D23), both of which latch, and once the store has stopped the second press's
   `insertSession` refuses before any spawn (`create-local.ts:658`, `store.ts:1067`). A second session needs a
   non-latching error. The probe takes a real `SQLITE_BUSY` (a held write lock on the scratch manifest) for that arm, at
   both builds, with no seam (§8, L3).
6. **"357's seam armed on getSession" is not deterministic as written.** A status tick's own `getSession` (or
   `listSessions`) can take a seam armed before the press, and a latch before the create's `insertSession` is a true
   failure with nothing spawned. The probe holds the create at one tmux command inside a local wrapper (`GMUX_TMUX_BIN`,
   which a development build accepts for any executable file, `src/main/tmux/resolve.ts:1486-1521`) and arms the seam
   during the hold, so the latch always lands after the spawn (§8).
7. **The local spawn's own answer can be a failure for a session tmux made** (owed, §13; the entry keeps the spawn's own
   failure out). `createSession` throws `SPAWN_FAILED` "tmux created the session but returned an unparseable id" after
   `execTmux` returned (`sessions.ts:206-215`), and a `new-session` slower than the exec plane's 10 s default
   (`src/main/machines/exec-plane.ts:638`) times out after tmux may have made it. Both reach the spawn's catch, which
   deletes the row while the session runs (`create-local.ts:719-725`).
8. **conformance:machines condition 69 pins item 5's defect.** It requires exactly two callers of `dropRemoteRow`, "the
   arm where tmux itself answered … and the arm where the answer was not an identifier at all"
   (`build/conformance-machines.mjs:6932-6936`, `:6990-6999`). The second caller is the drop this phase removes; the
   count moves to one on purpose (D11, §6). Condition 70 (one caller of `markRemoteCreateUnconfirmed`, `:7024-7036`) and
   Phase 117's two text reads (`createArmMarks`, `createArmThrows`, `build/machines-conformance-probe.mts:6075-6081`)
   stay green.
9. **Restore, restart and the remote restore have the same shape and are out of scope** (§3.4 lists their steps). The
   remote restore says "Nothing was changed." after its far command ran (`remote-restore.ts:574-582`). Phase 340's spec
   already recorded item 6 as owed (`build/p340/SPEC.md:1557`).

## 1. The answer first

| # | What | One line |
| --- | --- | --- |
| 1 | The point of no return | On this Mac, the return of `tmux.createSession` (`create-local.ts:707-725`); on another machine, `flight.answered` (`remote-sessions.ts:2063`). After it, the create answers the session it started, and no step ends it |
| 2 | This Mac | Every step after the spawn runs through one guard, `afterSpawn` (or `afterSpawnRead` for the read-back), which logs once in that step's own words and never rethrows. The read-back's answer overlays the name tmux applied (D2 to D9) |
| 3 | Another machine, the answer | An answer that is not exactly one session id goes to Phase 117's identity read, the read a lost answer already gets; its text is never parsed further and never reaches an error or a log line (D10, D11) |
| 4 | Another machine, after the answer | A session no list has shown yet is answered from the create's own facts; the feed start, the projection and the notice cannot throw into the answer (D12, D13) |
| 5 | The window | ~~While the session list is stopped, a session a create started is added to the one list D19 answers, so the window draws it (D14)~~ HIS RULED ROUND (2026-11-14, "360 a"): a create during which the session list stopped answers the parent's own refusal, decided by main from the store's latch when the create ends, and the window and the list are the parent's (D24). HIS SECOND RULING (2026-11-16, "360 a"): for a create ON THIS MAC; a create on another machine that a list has shown answers its session, as the parent does (D25), and the one no list has shown answers the parent's refusal while the list is stopped, because main would not open it (D26, this round's measurement). HIS THIRD RULING (2026-11-17, "360 a then ship 115.0"): a create on another machine whose list stopped BEFORE that machine's create returned answers exactly as the parent, the stopped refusal its own feed met, let through (D27) |
| 6 | The check | `conformance:createanswer`, the TypeScript parser over the three functions, every guard ablated in memory and red on its own rule (D16) |
| 7 | The proof | The per-step matrix (§2.1, §2.2) committed as vitest at HEAD and run at the parent too; `probe:p360` per build, parent first, over his recorded shape; the attack lens (§10) |

### 1.1 The decisions, each with its reason

| Id | Decision | Reason (where it comes from) |
| --- | --- | --- |
| D1 | The point of no return is the return of `tmux.createSession` on this Mac and `flight.answered` on another machine. After it nothing throws into the create's answer, and nothing ends the session | Entry mechanism 1, and its refusal "No rollback" |
| D2 | `createLocalSession`'s file gains two module-private guards, each ONE `try` whose `catch` logs and does not rethrow: `afterSpawn(step: AfterSpawnStep, sessionId: string, run: () => void): void` and `afterSpawnRead<T>(step, sessionId, read: () => T, fallback: T): T`. The catch writes ONE `sessionsLog.warn` line: `AFTER_SPAWN_WORDS[step]`, the session id, and `failureCodeOf(err)` (a string `code` property, else the error's `name`, NEVER its message). `AFTER_SPAWN_WORDS` is a frozen exported table (§5) and `AfterSpawnStep` its key type | Entry mechanism 1 ("logs once and says in its own words what it could not do"). One shape a parser rule can hold whole (CA1). The message is left out because an error's text can carry payload (357 D16's discipline) |
| D3 | Item 1: `deps.manifest.updateSession(...)` (`:735-742`) runs through `afterSpawn('record', …)`. On failure the row keeps the predicted tmux name and no pane pid, which is the row the parent leaves (§2.1: every failing row read back `tmux_name` = the prediction, `pane_pid` null). No retry | A busy retry is another 5 s (`BUSY_TIMEOUT_MS`, `src/main/db/sqlite.ts:49`), and a stopped store refuses every write |
| D4 | Item 2: the create's `deps.broadcastSessions()` (`:850`) runs through `afterSpawn('broadcast', …)`. Nothing inside `broadcastSessions`, D19 or the tray feed moves | Entry refusal: no change to 357's latch, D19 or its words beyond what a create answers. A timer's broadcast keeps today's behaviour; when the store reads again, the control client's own `sessions-changed` refresh sends the list |
| D5 | Item 3: the read-back (`:851`) is `afterSpawnRead('read-back', id, () => deps.manifest.getSession(id), undefined)`, and the create answers `toSession({ ...(stored ?? record), tmuxName: info.tmuxName })` | §2.1 measured item 3 at the parent (`listSessions <- CORRUPT`: the broadcast went out on D19's list, then this read refused). Overlaying tmux's applied name is a no-op when the record write landed (it wrote that name) and the truth when it did not |
| D6 | Item 4a: the two notices (`:756-772`) and the capture notice (`:821-829`) each run through `afterSpawn` (`'login-notice'`, `'env-notice'`, `'capture-notice'`). The `if` conditions stay outside the guard (they read fields only) | §2.1: a window `send` that throws on the notice answered a failure at the parent. `broadcastEvent` has no guard around `webContents.send` (`src/main/typed-events.ts:50-60`) |
| D7 | Item 4b: `deps.startIdCapture(...)` (`:798-816`) runs through `afterSpawn('id-capture', …)` | §2.1. A watch that could not start is re-armed by `refresh()` and the boot rescue, as a timed-out watch already is (`id-harvest.ts:287-297`, `resumeIdHarvests` `:328`) |
| D8 | Outside every guard, by name and each with its reason: `faultPoint` (a no-op or a SIGKILL, never a throw), the three `Map` writes, `recordLaunchContext` (returns void over `void captureAndStore`, `src/main/context/snapshot.ts:159-164`), `toSession` (reads only guarded files: `snapshotMaterialExists` `src/main/restore/snapshots.ts:560-571` for an exited row, `readCapsules` `:443-465`). The mirror (`:777-792`) keeps its own `try` unchanged | The entry's two safe steps, re-read. CA1's allowlist is this list, the two guards and the log call |
| D9 | Item 7, the local create's remote branch: the capture notice (`:265-273`) and the broadcast (`:298`) each run through `afterSpawn`; `openTabsForRemoteCreate` already guards each write (`src/main/machines/remote-rehome.ts:358-377`) and stays as it is | Entry item 7 |
| D10 | Item 5: the far `new-session` answer is read by ONE strict reader, `export function createdTmuxIdOf(printed: string): string` in `src/main/machines/create-confirmation.ts` (pure, no import): with `\r` dropped, each line trimmed and blank lines removed, a `$`-id exactly when ONE line remains and it matches `^\$\d+$`; otherwise `''`. Beside it `export function answerLineCount(printed: string): number` (the non-blank lines, for a log line). An answer that is not one session id is never parsed further and its text never reaches an error, a detail or a log line: it is read by Phase 117's identity read (`confirmCreate`, `:2198-2247`) and its three arms | §2.3: the command runs past a printing login file (A1, B1, D1), and a login file can end the shell first (C1), so only identity decides. Phase 117's read scans every line for `GMUX_SESSION_ID=<this create's id>` (`create-confirmation.ts:84-93`) and the list parser needs a `$` id (`remote-sessions.ts:1037`), so noise cannot fool it. A noise line that looks like `$3` before tmux's `$5` would make the parent stamp `$3`, somebody else's session; identity reads `$5` |
| D11 | The shape: Phase 117's read and its three arms move, BYTE FOR BYTE for a lost answer, out of the catch into ONE private `async function settleUnansweredCreate(ctx, input, tmuxName, sessionId, cwd, why: { kind: 'lost'; err: unknown } \| { kind: 'unread'; lines: number }): Promise<string>`, which answers the bound `$`-id or throws. The catch calls it with `lost`; the `if (!tmuxId.startsWith('$'))` block after the try calls it with `unread`, and that block's old body (`dropRemoteRow` + `noRemoteRowFor`) goes. For `lost`: the same read, arms, log lines, sentences (`createFailure(err, cwd)`, `CREATE_ANSWER_LOST`) and details as today. For `unread`: present binds on the listed `$`-id; provenAbsent drops the row and throws `gmuxError('SPAWN_FAILED', remoteCreateNotStarted(input.name), '<machineId> answered <n> line(s) and none named a session')`; unreachable keeps the row unknown exactly as a lost answer does (`markRemoteCreateUnconfirmed(sessionId)`, `CREATE_ANSWER_LOST`). One `dropRemoteRow` call and one `markRemoteCreateUnconfirmed(sessionId)` call remain, both in `remote-sessions.ts` | Entry mechanism 2 ("item 5 … take[s] Phase 117's own path"). No duplicated arms (the growth guardrail), condition 70 and Phase 117's text reads hold, condition 69 moves from two to one on purpose (§0.1 item 8). Phase 117's lost-answer tests (`remote-sessions.test.ts:873-910` and the p326 file's) must stay green UNCHANGED, which is the proof the move is byte for byte |
| D12 | Item 6: when no list has shown the row by the time the create returns (`remoteSessionRow(sessionId) === null`), the create answers the session from its own facts: `{ id, name, tmuxName, projectPath, cwd, agent, status: 'unknown', createdAt, machine: remoteSessionMachine(input.machineId) }` (the machine-level badge, which reads no manifest: `remote-sessions.ts:1304-1331` with no session id). One log line says no list has shown it yet. The row stays exactly as the parent leaves it (kept; its column as the pass wrote it; the issued id as the stamp left it), so what a later list draws is the parent's reading, and Phase 117's rescue and the next completed list settle it. No sentence: the sheet closes on the session | Entry mechanism 1 (after `flight.answered` the create answers its session) and mechanism 2 ("Nothing was changed." stays only where nothing ran). `projectRemoteRecord` cannot be the answer here: for exactly this case it reads the manifest through `remoteRecordOf` (`remote-record.ts:218-220`, unguarded) and can throw. Q2 offers him Phase 117's unknown state for this row |
| D13 | After the answer in `remoteCreate`: `await startMachineFeed(...)` sits in its own `try` whose catch logs once and does not rethrow (§2.2, R6b), AMENDED BY HIS THIRD RULED ROUND (D27): except the stopped list's own refusal, which that catch lets through first; the env notice, its `envMissing` composition included (`:2142-2153`), sits in its own `try`; the answer is ONE private `function remoteCreateAnswer(facts, row: RemoteSessionRow \| null): Session` that never throws: `projectRow(row, stateOf(machineId))` when the row is listed, else (or when that throws) D12's composition, else the same facts without `machine` | Entry mechanism 1. `projectRow` reads memory only, but `remoteSessionMachine` is a function a later round can change; the fallback costs nothing |
| D14 | REMOVED BY HIS RULED ROUND (2026-11-14, D24): a create during which the list stopped now answers the parent's refusal, so there is no answered session to add, and `lastCleanList` is written by `listSessions` alone, as at the parent. As first built: the window (entry mechanism 3): `GmuxCore.createSession`'s admitted body becomes `async () => { const session = await createLocalSession(input, this.createDeps); this.keepCreatedSession(session); return session; }`. `private keepCreatedSession(session: Session): void` is ONE `try`: return unless `this.manifest.stoppedReading()`; when `lastCleanList` lacks the id, append the session and `this.broadcastSessions()` (D19 then answers that list); the catch logs once and does not rethrow | The slice adopts only what a `sessions:changed` broadcast holds (`src/renderer/state/sessions-slice.ts:1165`, `:1253`, `applySessions`), so a session D19's list lacks is never drawn: the entry's "the window does not draw it". D19 stays the ONE list every reader draws from; it grows by exactly the sessions a create started after the list stopped, whose rows were written before the stop (a relaunch over a fine file reads them). Every create entry point (the sheet, quick create, the hotkeys, the phone's start at `src/main/sessions/pocket-start.ts:501`) goes through this one method. Q1 offers him "leave the window as it is" |
| D15 | Nothing else moves: not the row-before-spawn order, the spawn's own failure, Phase 117's lost-answer behaviour, 357's latch, D19's compose or its words, `broadcastSessions`, the tray feed, `broadcastEvent`, the phone, the renderer, `pocket-start.ts`. AMENDED BY THE FIX ROUND: the renderer's landing moved (two files, D20), because with it unmoved the window was worse than the parent | The entry's "What is NOT in this phase". The phone's start answers `done` instead of `failed` through the core, with no edit. HIS RULED ROUND put the renderer back: `git diff 8645875e -- src/renderer` is empty again (D20 removed, D24), and a phone start during which the list stopped answers `failed`, as at the parent |
| D16 | A new gate, `conformance:createanswer` (`build/conformance-create-answer.mjs`): pure node over the pinned TypeScript parser, spawns only the pinned tsx (for CA4's driven table), about a second; six rules, in-memory ablations each red on its own rule, a control that stays green (§7.1) | Entry mechanism 4. The rules span three builders' files and no existing gate reads these functions with the parser. conformance:farattach's FA5 (`build/conformance-farattach.mjs:528-563`) stays green and unchanged |
| D17 | The app run: `probe:p360` (§8), parent first, two launches per build one after the other (a latch ends a run's store), and NO new product seam: 357's seam, `GMUX_TMUX_BIN` at a local wrapper in Phase 326's far-tmux shape, a held SQLite write lock, the loopback machine with `build/p326/far-tmux.sh` | §0.1 items 5 and 6 |
| D18 | Words: ONE new sentence a person reads, `remoteCreateNotStarted(name)` in `src/main/machines/remote-copy.ts`, pinned in `build/assert-bundle-refusals.mjs` as `machine.create-not-started` (a branch production reaches rarely, as `machine.create-answer-lost` is); log words in `AFTER_SPAWN_WORDS` and beside each remote call; one CHANGELOG item (§5) | Just enough words; `remote-copy.ts` holds every sentence main prints about a session on another machine |
| D20 | THE FIX ROUND. While the session list is stopped, a create that answered does not move the window. `sessionListStopped` (false until heard, never back) and `noteSessionListStopped()` in `src/renderer/state/sessions-slice.ts`; the `manifest-stopped` arm in `src/renderer/state/subscriptions.ts` notes it first; the slice's `createSession` reads `const land = !get().sessionListStopped` once after the create's answer, and `setActiveSession(` and the remote-tab landing (`setActiveProject(` and its sentence) run only when `land`. No channel, no field on the answer, no new words. CA7 pins it (D23) | The attack lens's arm W, measured live: HEAD landed on the new session, which main refuses to open while the list is stopped ("Can't connect to this session"), and the move closed the session in use, which could not be opened again either; the parent's create answered a failure and never moved. Fixed rather than dropped: dropping would put back the false failure the entry exists to remove. CORRECTED BY HIS RULED ROUND (2026-11-14), WITH THE MEASUREMENT THE FIX ROUND LACKED: main does post the notice synchronously at the latch, before the create's answer, but the two do NOT reach the window over one ordered channel. The notice is a `webContents.send` and the answer is the invoke's reply, and the fix round's reverify measured the reply overtaking sends already queued in a busy window: by the window's own clock the create's continuation ran before a `sessions:changed` main had sent before the reply in 7 of 7 trials, and under load before the `manifest-stopped` notice itself in 2 of 2 (9,005.4 against 9,006.4 ms; 8,733.4 against 8,734.9 ms). With the session in use printing and a 100 or 400 ms long task in the window as the create ended, `land` read true and the window moved in 7 of 7, every one ending on "Can't connect" with the session in use unable to reopen; the parent stayed in 3 of 3. The renderer test modelled only the order the fix round assumed. So D20 was REMOVED (D24): the decision moved to main, `sessions-slice.ts` and `subscriptions.ts` are the parent's bytes again, the comment above `land` went with `land`, and `p360-create-landing.test.ts` went with them |
| D21 | THE FIX ROUND. `createLocalSession` asks for the launch context (`recordLaunchContext`) only when its record write was made: `afterSpawn` answers whether its step ran to its end, `recorded = afterSpawn('record', …)`, and `if (recorded) recordLaunchContext(…)`. `src/main/context/snapshot.ts` is not touched. CA1 pins it | Lens A's minor: behind a write lock another process holds, the snapshot's synchronous write waited out the 5 s busy timeout on main's thread before the create answered (15.4 s against the parent's 10.4 s, measured by lens A and again here: 15,461 ms against 10,259 ms). With D21 the window's own clock reads 10,294 ms at HEAD against the parent's 10,278 ms ("The fix round", run 4). The store had just refused the record write, so its next write fails the same way (busy, stopped, a full disk); the parent never reached the snapshot when that write failed, so no session loses a snapshot it had. TRIED FIRST AND MEASURED NOT TO HELP: a macrotask between the resolver and the write (`setImmediate` in `captureAndStore`) let the answer leave first, but the write still held main's thread for 5 s, so the window could not attach and the probe, whose reads pass through main, saw the sheet settle at 15,461 ms all the same; it was reverted |
| D22 | THE FIX ROUND. No catch on the create's path can throw while it reads the error: `failureCodeOf` is one `try` answering `unreadable` for an error whose `code` or `name` getter throws; `keepCreatedSession`'s catch reads them inside a `try` of its own; the mirror's catch reads `(err as Error \| undefined)?.message` | The attack lens's nit (plants LT3, LT4): a rejection with no value, or a getter that throws, made the create reject while its pane ran, at both builds |
| D23 | THE FIX ROUND. `conformance:createanswer` gains CA7 (D20) and three clauses the attack lens's ablations had left green: CA1 the answer's `tmuxName: <spawn>.tmuxName` after every spread, and `failureCodeOf` as one try; CA4 every `dropRemoteRow(` in `settleUnansweredCreate` inside the `'dropRow'` arm; CA5 the keep's duplicate check by id before its write. Each with an ablation. HIS RULED ROUND removed CA7 and CA5's keep clauses with D20 and D14, and rewrote CA5 for D24 | The attack lens's X1 to X3 and arm W |
| D24 | HIS RULED ROUND (2026-11-14, "360 a": "Keep today's behaviour for that one case, and land the rest after a quick independent check. Nothing is lost: once the list is broken, a second Create is already refused before anything starts, and the session keeps running."). `GmuxCore.createSession`'s admitted body is exactly `const session = await createLocalSession(input, this.createDeps); if (this.manifest.stoppedReading()) throw manifestStoppedError('getSession'); return session;`. A create during which the session list stopped (latched) answers the stopped list's own refusal, `MANIFEST_STOPPED` with `MANIFEST_STOPPED_REFUSAL`, the parent's answer in that case, so the sheet stays open on the stopped sentence and the window stays on the session in use, connected. It is decided from main's own state when the create ends, the store's latch (`stoppedReading`, which touches no SQLite), never from the order in which a window hears the notice. The detail names `getSession`, the read-back the parent's create met in every stopped case but one: when the record write itself met the stop the parent named `updateSession` (L1); no surface draws a detail (the sheet and the toasts draw the sentence, the phone `START_FAILED`). D14 (`keepCreatedSession`) and D20 (the window's flag) are removed: `lastCleanList` is written by `listSessions` alone and the renderer is the parent's bytes. Nothing is ended: the session keeps running and its row, written before the stop, stays. Everything else the phase fixed stands: a create whose later step fails on a list that is NOT stopped answers its session (D2 to D13, D21, D22), one session not two on this Mac and on another machine, no false "Nothing was changed.". CA5 pins it (§7.1); `src/main/sessions/__tests__/p360-create-stopped.test.ts` drives it; probe:p360's L1 and L2 grade it in a busy window. NARROWED BY HIS SECOND RULING TO A CREATE ON THIS MAC (D25) | His ruling, on the reverify's major (the busy-window race, 7 of 7). Decided in main because the reverify measured that the window cannot learn the stop before the answer. In the core and not in `createLocalSession`, so CA1 and CA2 hold unchanged (nothing after the spawn throws there) and every entry point is covered by one statement. Measured in "His ruled round" below |
| D25 | HIS SECOND RULING (2026-11-16, "360 a": "Apply the rule only to sessions on this Mac, so sessions on another machine work as they do today. Add two tests for that case, check again, then land it."). D24's check is asked only of a create the create's own rule puts on this Mac: the admitted body is `const session = await createLocalSession(input, this.createDeps); if (createMachineIdFor(input) === undefined && this.manifest.stoppedReading()) throw manifestStoppedError('getSession'); return session;`, `createMachineIdFor` being ./launch-plan's (the machine decision `createLocalSession` makes as its first statement: `machineId` that is not `local`, else `projectMachineId` that is not `local`, else this Mac), imported by core.ts under its own name. A create on another machine that a list has shown is never refused, so it answers what `createLocalSession` answers, which for the stop the reverify measured (at the create's tab write, after that machine answered) is the parent's answer, the session. (As first built in this round the check did not ask a create on another machine at all; D26 asks it of the one no list has shown, and the admitted body's condition is D26's.) The two tests he asked for are the vitest cases from a tab on this Mac with the Machine field set (R7L) and from the machine's own tab (R7) in `p360-create-stopped.test.ts` (with the tab rule alone, a machine named `local`, a remote create that fails, and the phone's start beside them), and probe:p360's arms R7L and R7, graded at both builds by the parent's own clauses; RF and RN measure the two other remote stop shapes the phase changed. CA5 pins the machine test (five ablations) | The last reverify's major: with the list stopped at the create's tab write after the far create answered, the parent closed the sheet on the running session 7 of 7 (R7L 3, R7 4) and D24 made HEAD say "Restart Tortie, then try again" 7 of 7. The window's reason for D24 is this Mac's alone: main opens a session on another machine that a list has shown from memory while the list is stopped, and opens none on this Mac. One rule, so the check and the create cannot disagree about where a create runs (the hotkeys and the phone name the machine by `projectMachineId` and `machineId`). Measured in "His second ruled round" below |
| D26 | HIS SECOND RULED ROUND, NEW (the brief's item 3: a remote stop shape worse than the parent is fixed or dropped). On another machine the check is asked of ONE create: the one no list of that machine has shown. The condition is `this.manifest.stoppedReading() && (createMachineIdFor(input) === undefined \|\| remoteSessionRow(session.id) === null)`, `remoteSessionRow` being the machines layer's own (`../machines/remote-sessions`), the very row `attachSessionAdmitted` opens a session on another machine from while the list is stopped. So a create during which the list stopped answers the parent's refusal exactly when main would not open the session it started: on this Mac always, on another machine when no list has shown it. A create on another machine that a list has shown answers its session (the reverify's R7L and R7 shape). CORRECTED BY HIS THIRD RULED ROUND: as first written this said RF too, and RF (the list stopped before that machine's create returned) was worse than the parent there, measured with real keystrokes; since D27 it never reaches this check | Measured live in this round, D25 alone: RN (no list shows the session, the list stopped while the far create was out), HEAD closed the sheet and the window landed on the new session drawn "Machine unreachable", which main had not opened: typing reached it 0 of 2 times at once and 0 of 1 again when it was chosen a second time 17 s later; the parent answered a failure (the stopped sentence, the far list having timed out into the stopped store) and stayed on the session in use, connected, in every reading. That is the shape his first ruling chose today's answer over (the fix round's arm W: a window landing on a session main does not open). It is the narrowest fix: the parent's own answer, and only where the parent answers a failure, because the parent answers a session on another machine only when a list has shown it (item 6 throws otherwise). The rest of the phase on another machine stands: R6 (no list, the list reading) still answers its session, which the attach then waits for. Dropping D12 instead would have put back "Nothing was changed." for R6 |
| D27 | HIS THIRD RULED ROUND (2026-11-17, "360 a then ship 115.0": "the new build answers exactly as today, the test uses real keypresses, then it is checked again and landed"). A create on another machine whose session list stopped BEFORE that machine's create returned answers exactly as the parent. D13's catch around `await startMachineFeed(...)` in `remoteCreate` begins `if (isManifestStopped(err)) throw err;`, `isManifestStopped` being the store's own, re-exported by `remote-record.ts` (the machine layer's one door to the manifest, Phase 72's rule, held by `__tests__/remote-sessions.test.ts` as an import list) and imported from it under its own name, before it logs anything; every other error the feed meets is still logged once and the session answered (R6b). So the stopped refusal the create's own list meets (RF: the pass's write for the row it listed; RN: the machine's verdict write after its list timed out) goes through `remoteCreate`, the local create's remote branch (which releases the folders and rethrows, as at the parent) and the core untouched, as the parent's unguarded feed start let it: "Restart Tortie, then try again", the sheet open, the window on the session in use. One stop before the answer still closes the sheet, at both builds alike: with that machine's new-session answer held, Phase 117's rescue binds the session first, so the list has shown it (the reverify's RE). A stop after that machine's create returned (R7L, R7: the create's tab write) keeps its answer, the session, the parent's; D24, D25 and D26 in `createSession` are unchanged | The last reverify's two majors, his ruling's option (a). Measured live with real keystrokes: from the machine's own tab (RF) the parent answered the stopped sentence and kept the window on the session in use, which took real keystrokes (1 of 1), 3 of 3; his second ruled round's HEAD (D13 catching the stop, D26 letting a listed create through) closed the sheet and landed on the new session drawn "Machine unreachable", which took 0 of 4 real keystrokes, and the session in use then took 0 of 2, 3 of 3; from a tab on this Mac with the first of two shells in use (RFL) HEAD fell back to the tab's last shell, drawn "Can't connect", and the first shell was lost until a restart, 3 of 3. The narrowest fix is the parent's own mechanism: no new rule decides when the stop came, the store's refusal simply travels as it did. CA3 pins it (seven ablations); probe:p360 grades RF, RN and RFL at both builds by ONE grader, the parent's, typing with real keystrokes |

## 2. What the spec step measured, how, and the numbers

Everything ran under the history block (history unchanged across every run: `743166 1793987027` and
`23166 1790702242`). No Electron was launched, so no lock slot was taken and no crash report could appear. Scripts,
results and logs are under `/private/var/tmp/tortie-wt/scratch/p360/spec/` (`m1/`, `m2/`, `logs/`) and stay there for
the verifier. The tests ran from the worktree with a scratch config holding the worktree's own aliases and electron stub
(`m1/vitest.config.mjs`, a plain object so it imports nothing):
`node node_modules/vitest/vitest.mjs run --config /private/var/tmp/tortie-wt/scratch/p360/spec/m1/vitest.config.mjs <name>`.

### 2.1 M1 local: the SHIPPING `createLocalSession` at the parent, each step after the spawn made to throw

`m1/local.m1.test.ts`, 17 cases in 6.99 s, results in `m1/results-local.json`. The store is a REAL `ManifestStore`
over a scratch file; the core's own `listSessions`, `listProjects` and `broadcastSessions` are borrowed onto a host
holding it with the REAL tray feed installed (357's method, `src/main/sessions/__tests__/p357-stopped-list.test.ts`);
the REAL `broadcastEvent` runs over one fake window whose `send` can throw; tmux is faked (the spawn answers `$1` with a
deduped name `<name>-2` and pane pid 40001, and any kill is recorded). The fault is armed INSIDE the fake spawn, so it
always lands after `insertSession`: through `setManifestFaultHook`, a real `Database.SqliteError` of the named code at
the next call of the named operation; a REAL `SQLITE_BUSY` from a second connection holding `BEGIN IMMEDIATE`; a window
`send` that throws; a `startIdCapture` that throws (codex, a harvesting agent).

| Fault after the spawn | Parent answer | Store stopped | Killed | Row after (status, tmux name, pane pid) |
| --- | --- | --- | --- | --- |
| none (control) | **resolved** | no | 0 | running, `…-2`, 40001 |
| `updateSession` ← `SQLITE_CORRUPT` | rejected `MANIFEST_STOPPED` (the stopped sentence) | yes | 0 | running, the PREDICTED name, null |
| `updateSession` ← `SQLITE_IOERR_READ` | rejected `SqliteError SQLITE_IOERR_READ disk I/O error` | no | 0 | running, predicted, null |
| `updateSession` ← `SQLITE_BUSY` | rejected `SqliteError SQLITE_BUSY database is locked` | no | 0 | running, predicted, null |
| `updateSession` ← a REAL busy (held write lock) | rejected `SQLITE_BUSY` after **5,416 ms** | no | 0 | running, predicted, null |
| `listSessions` ← `SQLITE_CORRUPT` (**item 3**) | rejected `MANIFEST_STOPPED`, after the broadcast went out on D19's list (1 send) | yes | 0 | running, `…-2`, 40001 |
| `listSessions` ← `SQLITE_IOERR_READ` | rejected `SQLITE_IOERR_READ` (0 sends) | no | 0 | running, `…-2`, 40001 |
| `listSessions` ← `SQLITE_BUSY` | rejected `SQLITE_BUSY` | no | 0 | running, `…-2`, 40001 |
| `listProjects` ← `SQLITE_CORRUPT` (the tray feed's read) | rejected `MANIFEST_STOPPED` at the read-back | yes | 0 | running, `…-2`, 40001 |
| `listProjects` ← `SQLITE_IOERR_READ` | rejected `SQLITE_IOERR_READ`, thrown out of the feed's `pass` after the send | no | 0 | running, `…-2`, 40001 |
| `listProjects` ← `SQLITE_BUSY` | rejected `SQLITE_BUSY` | no | 0 | running, `…-2`, 40001 |
| `getSession` ← `SQLITE_CORRUPT` | rejected `MANIFEST_STOPPED` | yes | 0 | running, `…-2`, 40001 |
| `getSession` ← `SQLITE_IOERR_READ` | rejected `SQLITE_IOERR_READ` | no | 0 | running, `…-2`, 40001 |
| `getSession` ← `SQLITE_BUSY` | rejected `SQLITE_BUSY` | no | 0 | running, `…-2`, 40001 |
| the window `send` throws on `sessions:changed` | rejected "Render frame was disposed before WebFrameMain could be accessed" | no | 0 | running, `…-2`, 40001 |
| the window `send` throws on the env notice (`scrollback:notice`) | rejected, same text | no | 0 | running, `…-2`, 40001 |
| `startIdCapture` throws | rejected "the conversation watch could not start" | no | 0 | running, `…-2`, 40001 |

Read: **all 16 fault rows answer a failure after a spawn ran, and none ends a pane.** Item 3 is measured, not read: when
the broadcast's own read stops the store, D19 answers the last clean list and the next line answers the stopped
refusal for a running session. Item 2's tray half is measured: the feed reads `listProjects` outside its listener
guard (`src/main/tray/blocked-feed.ts:52-64`), and an IOERR there throws out of `broadcastSessions`.

### 2.2 M1 remote: the SHIPPING `remoteCreate` at the parent, on Phase 326's own fakes

`m1/remote.m1.test.ts`, 6 cases in 490 ms, results in `m1/results-remote.json`. The exec plane, context, control
client, machines file and manifest half are faked exactly as `p326-inflight-create.test.ts` fakes them (a recorder of
every argv, answers per verb).

| Row | The far side | Parent answer | Row | Stamps sent | Issued id held |
| --- | --- | --- | --- | --- | --- |
| R0 control | `$4`, listed back | **resolved** | kept | 4 | no |
| R5a item 5 | `Last login: …` then `$4` (the session exists) | rejected `SPAWN_FAILED` "Tortie could not find a session called work on that machine after it created one. Nothing was changed." **detail: `popos answered "Last login: Sun Nov  8 19:00:00 on ttys001"`** | **dropped** | 0 | yes |
| R5b item 5 | `/home/x/.profile:3: no such file or directory: /opt/x/env` then `$4` | rejected, the same sentence, detail carrying that line | dropped | 0 | yes |
| R6 item 6 | `$4`, the list never shows it | rejected `SPAWN_FAILED` "…Nothing was changed." detail `popos created $4 and did not list it back` | kept, `running` | 4 | no |
| R6b | `$4`, listed, and the create's own feed pass throws from its manifest write | rejected "the manifest refused the write" | kept | 4 | no |
| R6c | `$4`, the feed's list times out | rejected `SPAWN_FAILED` "…Nothing was changed." | kept, `unknown` | 4 | no |

Read: every row after the far command ran answers a failure. Item 5 drops the row and stamps nothing while the session
runs, and leaves the id in the issued set, so a later pass can only rescue it as a feed row with no manifest row.

### 2.3 M2: does the far command run when a login file prints first? (a scratch far shell)

`m1/compose.m1.test.ts` composed each arm's far string with the SHIPPING `remoteCreateArgs`, `remoteTmuxArgv` and
`tmuxCommand` (`src/main/machines/context.ts:267-305`), which is `composeEnvCreateCommand` with names
(`remote-env-carriage.ts:316-324`) and `shellQuoteArgv` without (`m2/composed.json`). `m2/far-shell.mjs` ran each string
the way sshd hands it to the far account, `<login shell> -c <string>`, with a scratch far home per arm (`HOME` and
`ZDOTDIR` there, `PATH=/usr/bin:/bin:/usr/sbin:/sbin`, `HISTFILE=/dev/null`), the far tmux being the vendored 3.7b on the
scratch socket `p360-spec-far-52119` with `-f /dev/null` as the product sends (`REMOTE_CONF_PATH`, `context.ts:213`).
Results in `m2/far-shell-results.json`; the server was ended with `kill-server` in a `finally` (a list after it exited
1) and its socket file removed.

| Arm | Far shell, path | Login file | Exit | stdout | Session exists, carrying this create's id |
| --- | --- | --- | --- | --- | --- |
| A1 | zsh, names | `.zprofile` echoes | 0 | `far login file: hello from .zprofile` / `$0` | **yes, yes** |
| A2 | zsh, names | none | 0 | `$1` | yes, yes |
| B1 | zsh, **no names (as shipped)** | `.zshenv` echoes | 0 | `far zshenv: hello` / `$2` | **yes, yes** |
| B2 | zsh, no names | `.zprofile` echoes (a non-login `-c` does not read it) | 0 | `$3` | yes, yes |
| C1 | zsh, names | `.zprofile` echoes, then `exit 0` | 0 | `far login file: leaving early` | **no** |
| D1 | bash, names | `.bash_profile` echoes | 0 | `far bash_profile: hello` / `$4` | yes, yes |

Read: the far command ran in A1, B1 and D1 although the first line is not a `$` id, so the parent's item 5 drops the
only record of a running session and says nothing changed. C1 shows the converse: exit 0 with no session. Only the
identity read can tell them apart (D10).

## 3. The tree at this head: every step after the spawn's answer, re-read

### 3.1 The create on this Mac (`createLocalSession`, `src/main/sessions/create-local.ts:175-853`)

| Line | Step | Can it throw into the answer | HEAD (builder `local`) |
| --- | --- | --- | --- |
| `:707-725` | the spawn and its catch (deletes the row, rethrows) | yes, BEFORE the answer: true, nothing ran (but §0.1 item 7) | unchanged |
| `:727`, `:744` | `faultPoint` | no (a no-op, or SIGKILL in a fault run) | unchanged |
| `:729-731` | `liveIds`, `byTmuxId`, `createsInFlight` | no | unchanged |
| `:735-742` | `updateSession` (name and pane pid) | **yes**, any SQLite write error or `MANIFEST_STOPPED` (§2.1) | `afterSpawn('record')` (D3) |
| `:756-763` | the login-fell-back notice | **yes**, through `broadcastEvent` | `afterSpawn('login-notice')` (D6) |
| `:764-772` | the env-unresolved notice | **yes** (§2.1) | `afterSpawn('env-notice')` (D6) |
| `:777-792` | the tmux option mirror | no, its own `try` | unchanged |
| `:798-816` | `startIdCapture` | **yes** (§2.1); its synchronous part is `watchForSessionId`'s setup (`src/main/manifest/harvest/watch.ts:465-512`) | `afterSpawn('id-capture')` (D7) |
| `:821-829` | the capture-declined notice | **yes**, through `broadcastEvent` | `afterSpawn('capture-notice')` (D6) |
| `:843-848` | `recordLaunchContext` | no (D8) | unchanged |
| `:850` | `broadcastSessions` → D19 `listSessions` (`core.ts:3303-3429`), the tray feed's `listProjects` (`blocked-feed.ts:54`, `core.ts:4268-4278`), `broadcastEvent` (`typed-events.ts:50-60`) | **yes**, any error but the stopped refusal (§2.1) | `afterSpawn('broadcast')` (D4) |
| `:851` | `getSession` | **yes**, the stopped refusal after any latch, any other SQLite error (§2.1) | `afterSpawnRead('read-back')` (D5) |
| `:852` | `toSession` | no (D8) | answers `toSession({ ...(stored ?? record), tmuxName: info.tmuxName })` (D5) |

### 3.2 The local create's remote branch (`create-local.ts:212-300`)

| Line | Step | HEAD (builder `local`) |
| --- | --- | --- |
| `:239-255` | `remoteCreate` and its catch (`releaseFoldersAfterFailedRemoteCreate`, rethrow) | unchanged; reached only when `remoteCreate` rejects, which at HEAD means nothing ran or the answer was lost |
| `:265-273` | the capture-declined notice | `afterSpawn('capture-notice')` (D9) |
| `:297` | `openTabsForRemoteCreate` (guards each write, `remote-rehome.ts:358-377`) | unchanged |
| `:298` | `broadcastSessions` | `afterSpawn('broadcast')` (D9) |

### 3.3 The create on another machine (`remoteCreate`, `src/main/machines/remote-sessions.ts:1770-2158`)

| Line | Step | Parent | HEAD (builder `remote`) |
| --- | --- | --- | --- |
| `:1912` | `const flight = beginRemoteCreate(sessionId, input.machineId);` | | unchanged (FA5, `ablation:p326` A1) |
| `:1950-1976` | the row, before the line | | unchanged |
| `:1980-1992` | the far `new-session`; `tmuxId = (printed.split('\n')[0] ?? '').trim()` | the first line, whatever it is | `tmuxId = createdTmuxIdOf(printed)`; the line count kept for the log (D10) |
| `:1993-2050` | the catch: Phase 117's read and three arms | | `tmuxId = await settleUnansweredCreate(…, { kind: 'lost', err })`, byte for byte (D11) |
| `:2051-2058` | `if (!tmuxId.startsWith('$'))` → `dropRemoteRow` + `SPAWN_FAILED noRemoteRowFor` | **item 5** (§2.2, §2.3) | the same test (FA5), body `tmuxId = await settleUnansweredCreate(…, { kind: 'unread', lines })` (D11) |
| `:2063` | `flight.answered(…)` | | unchanged, one line (FA5, `ablation:p326` A3) |
| `:2069-2086` | the four stamps, each in its own `try` | safe | unchanged |
| `:2091`, `:2097` | `clearIssuedRemoteId` (a set delete, `pane-env-rescue.ts:148-150`), `flight.leftToRescue()` | safe | unchanged |
| `:2108-2115` | `await startMachineFeed(...)` | **throws** from its pass's manifest writes (§2.2, R6b) | its own `try`, catch logs once (D13) |
| `:2116-2123` | `remoteSessionRow` null → `SPAWN_FAILED noRemoteRowFor` | **item 6** (§2.2, R6, R6c) | `remoteCreateAnswer(facts, null)` and one log line (D12) |
| `:2142-2153` | the env-unresolved notice | can throw through `broadcastEvent` | its own `try` (D13) |
| `:2154` | `projectRow(row, stateOf(...))` | reads memory | `remoteCreateAnswer(facts, row)` (D13) |
| `:2155-2157` | `} finally { flight.end(); }` | | unchanged (FA5, `ablation:p326` A2) |

### 3.4 Restore, restart and the phone's other verbs: their steps after a spawn (listed, NOT this phase's; §13)

- **Restore on this Mac** (`src/main/restore/restore.ts`): the spawn `:1110-1138`; after it, the journal write is guarded
  (`:1143-1149`), but the login and env notices (`:1156-1175`) and the repaired-snapshot notice (`:1194`) go through
  `postDurabilityNotice` → `broadcastEvent` unguarded; the core's restore tail writes after the spawn
  (`src/main/sessions/core.ts:2087` `noteRestoreTmuxId` inside `onCreated`, `:2102` `recordRestoreOutcome`, `:2104` and
  `:2178` `finishRestoreAttempt`, `:2155` `setRestoreResult`, then a broadcast).
- **Restore on another machine** (`src/main/machines/remote-restore.ts:574-582`): item 5's own shape: an answer whose
  first line is not a `$` id throws `SPAWN_FAILED noRemoteRowFor` ("…Nothing was changed.") after the far command ran.
- **Restart** (`src/main/restart/restart.ts`): `:228` the core's create (fixed by this phase through D14's method), then
  `:234` `host.manifest.getSession(sessionId)` and the old session's end and discard, unguarded.
- **Resume in place** types into a session that exists and spawns nothing. **The phone's other verbs** (End, choose,
  say, keys, rename) spawn nothing. **The phone's start** reaches the core's create (`pocket-start.ts:501`) and is fixed
  through it with no edit.

## 4. The design, item by item (real paths; the builder named on each)

### 4.1 The create on this Mac (builder `local`)

`src/main/sessions/create-local.ts`:
- Below `sessionsLog`/`broadcast` (`:123-126`): `export const AFTER_SPAWN_WORDS` (frozen, §5), `type AfterSpawnStep =
  keyof typeof AFTER_SPAWN_WORDS`, `function failureCodeOf(err: unknown): string`, `function afterSpawn(...)` and
  `function afterSpawnRead<T>(...)` (D2), with a header paragraph naming the point of no return (D1), the measurement
  (§2.1) and the refusal (no rollback).
- The tail from `:727` exactly as §3.1's HEAD column says, every step in today's ORDER, every `faultPoint` kept by name
  and position (`npm run smoke:fault` drives them by name; the file header's rule). The remote branch as §3.2 says.
- Nothing above the spawn moves. The two load-bearing positions (`createMachineIdFor`, `captureRefusedOnMachine`, read as
  text by `__tests__/p94-remote-create-folder.test.ts` and `capture-refusal-wiring.test.ts`) and the floor call
  (`conformance:agents`) stay byte for byte.

### 4.2 The create on another machine (builder `remote`)

- `src/main/machines/create-confirmation.ts`: `createdTmuxIdOf` and `answerLineCount` (D10), pure, no import, with a
  header paragraph citing §2.3.
- `src/main/machines/remote-sessions.ts`: `settleUnansweredCreate` (D11) directly below `remoteCreate`, beside
  `dropRemoteRow` and `confirmCreate`; `remoteCreateAnswer` (D12, D13); `remoteCreate` as §3.3's HEAD column says. KEEP
  these lines' text shapes, which `ablation:p326`'s arms A1 to A3 edit by pattern: `const flight =
  beginRemoteCreate(sessionId, input.machineId);` on its own line, the `writeRemoteRow({ … });` call closing at four
  spaces, `flight.answered(…)` on one line, and `} finally {\n    flight.end();\n  }`. KEEP one `try` block holding
  `writeRemoteRow(`, the new-session `execOn(ctx, args`, the stamp loop and `startMachineFeed(` (FA5). KEEP the strings
  `markRemoteCreateUnconfirmed(sessionId)` and `CREATE_ANSWER_LOST` in this file (Phase 117's text reads). Update the
  comment "This is the only caller of `dropRemoteRow` on the confirmation path" to say why there is one caller now.
- `src/main/machines/remote-copy.ts`: `remoteCreateNotStarted` (§5), under a short header paragraph; `noRemoteRowFor`
  stays (the remote restore's caller, `remote-restore.ts:580`) and its doc comment gains one sentence saying the create
  no longer says it.
- `build/conformance-machines.mjs`: condition 69's count 2 → 1, its message and its comment (`:6932-6936`,
  `:6990-6999`), naming Phase 360 and §2.3 as the reason. Nothing else in the file moves.
- `build/assert-bundle-refusals.mjs`: one pin, `machine.create-not-started`, with fragments of the new sentence.

### 4.3 The window (builder `core`)

`src/main/sessions/core.ts`: `createSession` (`:3469-3473`) and `private keepCreatedSession` (D14) beside it, with a
doc comment naming D19 and §2.1. `lastCleanList` is written in exactly two methods afterwards, `listSessions` and
`keepCreatedSession`. No public method is added (the p125 test pins the public surface,
`src/main/sessions/__tests__/p125-core-split.test.ts:73`).

### 4.4 The check and the app run (builder `checks`)

`build/conformance-create-answer.mjs` (§7.1) and `build/p360/**` (§8).

## 5. Words

| Constant | Where it is read | Text |
| --- | --- | --- |
| `remoteCreateNotStarted(name)` (`remote-copy.ts`) | the sheet's error, a toast, the phone's `failed` | `That machine did not start a session called ${name}. Nothing was changed.` |
| `AFTER_SPAWN_WORDS.record` (log only) | app.log, scope `sessions` | `the session started, and its tmux name and process id were not recorded` |
| `AFTER_SPAWN_WORDS['login-notice']` | app.log | `the session started, and the notice that it fell back to the default login was not sent` |
| `AFTER_SPAWN_WORDS['env-notice']` | app.log | `the session started, and the notice naming a shell variable it did not get was not sent` |
| `AFTER_SPAWN_WORDS['id-capture']` | app.log | `the session started, and its conversation id is not being watched for yet` |
| `AFTER_SPAWN_WORDS['capture-notice']` | app.log | `the session started, and the notice that capture was declined was not sent` |
| `AFTER_SPAWN_WORDS.broadcast` | app.log | `the session started, and the windows were not sent the new session list` |
| `AFTER_SPAWN_WORDS['read-back']` | app.log | `the session started, and its row could not be read back, so the create answers the row it wrote` |
| remote log lines (beside each call in `remote-sessions.ts`, scope `machines`) | app.log | `the create on <machine> answered <n> line(s), none of them a session, and its id was found there` (unread, bound); `…, and the machine holds no session with its id, so the row is removed` (unread, absent); `the session started on <machine>, and its list could not be started: <code>`; `the session started on <machine> as <$-id>, and no list has shown it yet, so the create answers it from what it sent`; `the session started on <machine>, and the notice naming a shell variable it did not get was not sent: <code>`; the unread unreachable arm logs Phase 117's own line |
| core log line (`core.ts`, scope `sessions`) | app.log | `a session started while the session list was stopped, and it could not be added to the list the windows show: <code>` |

No tmux vocabulary on any surface (the one new sentence names a session and a machine). No log line carries an error's
message or any far text. CHANGELOG.md, under `## Unreleased`, `### Fixed`, with the commit link added by the follow-up
docs commit: `- Starting a session no longer says it failed when the session did start, on this Mac or on another
machine, so pressing Create again no longer starts a second one.`

## 6. What moves on purpose (each named in its builder's and the integrator's report)

- `build/conformance-machines.mjs` condition 69: `dropRemoteRow` callers 2 → 1 (§0.1 item 8, D11). Builder `remote`.
- `src/main/machines/__tests__/p326-inflight-create.test.ts`: `:571-584` (the feed pass throws: now the create answers
  its session, the flight still ends), `:586-594` (not listed back: now answers its session, status `unknown`, the
  flight still ends), `:1040-1067` (stamp failed and own list failed: now answers its session; `issuedRemoteIdHeld` still
  true and the next pass still rescues `$4`). `:529-537` ("an answer that is not an identifier") STAYS GREEN unchanged:
  its confirmation read answers nothing of ours, so the row drops with `SPAWN_FAILED`. Builder `remote`.
- `src/main/machines/__tests__/p3401-create-overtaken.test.ts:176-198`: the retired-route create now answers its session
  from its own facts (status `unknown`) instead of `SPAWN_FAILED`; every other clause of the case stands. Builder
  `remote`.
- `build/assert-bundle-refusals.mjs`: one pin added. Builder `remote`.
- `build/assert-electron-teardown.mjs:598` `HELPER_USER_FLOOR` 184 → 185 (obligation 1). Integrator.
- Nothing in `docs/audits/contract-baseline.txt` moves; a line that moves is a finding.

## 7. The gates that move

### 7.1 The new gate: `conformance:createanswer` (`build/conformance-create-answer.mjs`, builder `checks`)

Pure node over the TypeScript parser (the pinned `typescript` in `node_modules`), about a second; the one child is the
pinned tsx for CA4's table (`build/ts-runner.mjs`'s `tsxCli()`, as `conformance:stoppedlist`'s S8 drives). Every run
also asks each rule again over in-memory copies with that rule broken; each copy must read red on that rule and ONLY
that rule, and a control copy changed elsewhere (a comment added to each file) must stay green. It prints one PASS line
with the counts.

**"Safe" (the definition CA1 to CA3 use).** A statement is safe when it is one of: an expression statement calling only
a callee on the rule's allowlist, whose arguments hold no other call except inside an arrow handed to `afterSpawn` or
`afterSpawnRead`; a `const`/`let` whose initializer holds no call but allowlisted ones (an `afterSpawnRead(…)` call
among them) and no `await`; an `if` whose condition holds no call but allowlisted ones and no `await`, and whose
branches are safe; a `try` whose `catch` exists and holds no `throw` outside a nested function; a `for … of
REMOTE_STAMPS` whose body is one such `try`; a `return` whose expression calls only allowlisted callees. Anything else,
a `throw` above all, is not safe. The allowlists name only calls that cannot throw: map and set writes, log calls, pure
string helpers, and the guards themselves. Today's unchanged lines after the point of no return were checked against
them by hand: `faultPoint`, the three map writes and the mirror's `try` (CA1); the stamp composition's `oneLine(` and
`String(`, the feed's `machineRouteEpoch(` condition and `remoteSessionRow(` (CA3).

| Rule | Holds | Its ablations |
| --- | --- | --- |
| CA1 | In `createLocalSession`, the spawn is the top-level `try` whose block calls `tmux.createSession(`; every later top-level statement is safe with the allowlist {`faultPoint`, `deps.liveIds.set`, `deps.byTmuxId.set`, `deps.createsInFlight.delete`, `afterSpawn`, `afterSpawnRead`, `recordLaunchContext`, `toSession`, `sessionsLog.warn`}. `afterSpawn` and `afterSpawnRead` are declared in the file, each body ONE `try` whose catch holds no `throw` and whose log call names `AFTER_SPAWN_WORDS[` and `failureCodeOf(` and never `.message` | the broadcast unguarded; the record write unguarded; the read-back as a bare `deps.manifest.getSession(id)`; `startIdCapture` unguarded; a notice unguarded; a `throw` in `afterSpawn`'s catch; the mirror's catch rethrowing |
| CA2 | In the `if (machineId !== undefined)` block of `createLocalSession`, every statement after the one holding `remoteCreate(` is safe with the allowlist {`afterSpawn`, `openTabsForRemoteCreate`}, the last being `return session;`; `openTabsForRemoteCreate`'s body (`remote-rehome.ts`) calls `manifest.` only inside a `try` whose catch holds no `throw` | the branch's broadcast unguarded; a rethrow in `openTabsForRemoteCreate` |
| CA3 | In `remoteCreate`, every statement after `<flight>.answered(` inside the one try block is safe with the allowlist {`clearIssuedRemoteId`, `<flight>.leftToRescue`, `machineRouteEpoch`, `machinesLog.warn`, `machinesLog.info`, `remoteSessionRow`, `remoteCreateAnswer`, `oneLine`, `String`}, `await startMachineFeed(` sitting inside a `try` with no `throw` in its catch but one: since his third ruled round (D27) that catch BEGINS `if (isManifestStopped(<e>)) throw <e>;` with its own binding and no else, before anything it logs, `isManifestStopped` taken from `./remote-record` under its own name and declared nowhere in the file, `remote-record.ts` re-exporting the store's own (`export { isManifestStopped } from '../manifest/store'`) and declaring none, and no other `try` after the answer may let anything through; the env notice with its `envMissing` composition (which calls `.sort(`) inside its own `try`; `remoteCreateAnswer`'s body is `try` statements whose catches hold no `throw` and its last statement returns a composition holding no call but `remoteSessionMachine(` inside a `try` | 15: the feed start outside its `try`; item 6's `throw gmuxError('SPAWN_FAILED', …)` put back; a stamp loop catch rethrowing; the env notice unguarded; `remoteSessionMachine(` out of its `try`; a throw in `remoteCreateAnswer`'s catch; `projectRow` answered directly again; the env notice in the create's `finally`; and D27's seven: the pass-through removed (the stopped refusal swallowed again), made unconditional (R6b answering a failure), asking another predicate, throwing another error, moved after the log line, an `isManifestStopped` of `remote-sessions.ts`'s own, and one of `remote-record.ts`'s own |
| CA4 | In `remoteCreate`, the new-session `execOn(ctx, args` result is read only by `createdTmuxIdOf(` and `answerLineCount(`, and `remoteCreate` holds no `.split(` of it; the `if` testing `startsWith('$')` calls `settleUnansweredCreate(` with `kind: 'unread'`; in `settleUnansweredCreate`, `confirmCreate(` comes before `dropRemoteRow(` and before `markRemoteCreateUnconfirmed(`, and no `gmuxError(` call in its `unread` path names the answer text; AND the gate DRIVES `createdTmuxIdOf` through the pinned tsx: `'$4\n'`→`$4`, `'$4'`→`$4`, `' $4 \r\n'`→`$4`, `'\n$4\n\n'`→`$4`, `'noise\n$4\n'`→`''`, `'$3\n$5\n'`→`''`, `''`→`''`, `'$'`→`''`, `'$4 extra'`→`''`, `'4'`→`''` | `printed.split('\n')[0]` put back; the unread error's detail naming `printed`; the reader taking the first line; `dropRemoteRow(` before `confirmCreate(` |
| CA5 | (his ruled round, D24; his second ruled round, D25, D26) In `GmuxCore`, `createSession`'s admitted body is exactly three statements: `const <s> = await createLocalSession(<input>, …)`, `<input>` being `createSession`'s own parameter; an `if` with no else whose condition is `this.manifest.stoppedReading() && (createMachineIdFor(<input>) === undefined \|\| remoteSessionRow(<s>.id) === null)` (either order of either operator, either side of each comparison) and whose branch is ONE `throw manifestStoppedError('<operation>')`; `return <s>;`. No `try` in the body; `createSession` itself is ONE `return` of the admit call, nothing chained on it and nothing around it (the probe review of his ruled round); `createMachineIdFor` is imported from `./launch-plan` and `remoteSessionRow` from `../machines/remote-sessions`, each under its own name, and core.ts declares neither; `this.lastCleanList` is written in exactly `listSessions`, read over every member of the class; no member of any kind is named `keepCreatedSession` (as first built: the admitted body called `this.keepCreatedSession(` with the create's answer, a one-`try` keep growing `lastCleanList` while stopped) | 24: the stopped check removed; the check asked before the create ran; the branch returning the session; the branch throwing another error; the check asking something other than the latch; the refusal swallowed by a `try`; a step between the create and the check; the fix round's keep put back; a `.catch(` chained on the admit; a `try` around the admit; the keep put back as an arrow property (the probe review's three); his second ruling's five: the machine test removed (the check asked of every create on another machine), turned around, read from `input.machineId` alone, handed another object than the create's input, and a `createMachineIdFor` of core.ts's own; and D26's four: the unlisted test removed, turned around, asked of the input rather than the session answered, and a `remoteSessionRow` of core.ts's own; and the probe review of his second ruled round's four (2026-11-16): the row read shadowed by a defaulted parameter of the admitted function, the machine rule by a defaulted second parameter of `createSession`, the row read by a destructured defaulted one, and `createSession`'s input by a defaulted parameter of the admitted function (`importedFrom` counts parameters and binding elements, and the admitted function takes none) |
| CA6 | `remoteCreate` and `settleUnansweredCreate` call no `noRemoteRowFor(`; `remoteCreateNotStarted` is exported from `remote-copy.ts` and called exactly once under `src/main`, in `settleUnansweredCreate`'s unread provenAbsent arm; no string literal after `<flight>.answered(` in `remoteCreate` holds `Nothing was changed`; the new sentence holds none of pane, window, prefix, tmux, server | `noRemoteRowFor(` put back after the answer; the sentence called twice |

Classified `pure('conformance:createanswer', …)` in `build/verification-checks.mjs` (integrator); `package.json` gains
`"conformance:createanswer": "node build/conformance-create-answer.mjs"` (integrator). CLAUDE.md's path-triggered table
gains one row (integrator): `createLocalSession` in `src/main/sessions/create-local.ts`, `remoteCreate`,
`settleUnansweredCreate` and `remoteCreateAnswer` in `src/main/machines/remote-sessions.ts`, `createdTmuxIdOf` in
`create-confirmation.ts`, `remoteCreateNotStarted` in `remote-copy.ts`, `createSession` and `keepCreatedSession` in
`src/main/sessions/core.ts` → `conformance:createanswer`, about a second, spawns only the pinned tsx, and what it proves
in one sentence: a create answers the session it started (after the spawn's answer no statement that can throw sits
outside a guard; an answer that is not one session id is read by its id and never by its text; a session started while
the list was stopped is in the list the windows draw); `probe:p360` is the app run.

### 7.2 The path-triggered gates the changed files trigger (CLAUDE.md's table, read at this head)

| Changed | Gate |
| --- | --- |
| `src/main/sessions/create-local.ts` | `conformance:agents` (names "the create's floor call in `sessions/create-local.ts`"; rule 34 reads the file with a regular expression) and `conformance:shellenv` (names `create-local.ts` as a call site of the shell-environment cache) |
| `remoteCreate` in `src/main/machines/remote-sessions.ts` | `conformance:farattach` (FA5) and `ablation:p326` (its A1 to A3 arms edit `remoteCreate` by pattern) |
| `src/main/machines/**` (`remote-sessions.ts`, `create-confirmation.ts`, `remote-copy.ts`) and `build/conformance-machines.mjs` | `conformance:machines` (~45 s; condition 69 at one, 70 and Phase 117's text reads green) |
| `src/main/sessions/core.ts` | none of its rows by default (`conformance:endtree`, `conformance:farattach`'s core clauses, `conformance:machines`' `addRemoteProjectAdmitted`, `conformance:remoteclose`, `conformance:samefolder` name functions this phase does not edit). The integrator reads `git diff -U0 de9ea8f2 -- src/main/sessions/core.ts` hunk by hunk and runs each gate whose function a hunk touches; and `conformance:stoppedlist` once, since D19's list gains a writer |
| the phone's start (behaviour only, `pocket-start.ts` unchanged) | `conformance:pocket` once |
| A script reaching `build/electron-run.mjs`; `package.json`'s check scripts; `build/assert-bundle-refusals.mjs` | `gate:electron` (floor 185), `gate:checks`, the bundle pins (all inside `npm run build`) |

## 8. The app run: `probe:p360` (`build/p360/probe-p360.mjs`, builder `checks`)

`"probe:p360": "node build/harness-socket.mjs --fresh gmux-p360 'node build/p360/probe-p360.mjs'"`, classified as a probe
(not in the battery). `build/p357/probe-p357.mjs` is the launch composition to copy (its scratch profile, `HOME`,
`ZDOTDIR`, `HISTFILE=/dev/null`, `TMPDIR` under the harness folder, the hidden agents and `agents:list` read back, the
census by `tmuxSocket` on each launch, `withElectron` and nothing else); `build/p340/probe-p340.mjs` is the loopback
machine's composition (`scratchYard`/`scratchMachine` with `SCRATCH_MACHINE_QUIET_SHELL=1` and
`SCRATCH_MACHINE_SCRATCH_HOME=1`, an ssh wrapper with `-F none`); `build/p326/probe-p326.mjs` is how the far wrapper is
copied beside its env and rules files.

**The world.** Before each launch, `build/p3167/seed-sessions.mts --shape his` writes his recorded shape into that
launch's scratch manifest (354 rows, counts only; it refuses a path outside a temporary folder, so `TMPDIR` points into
the harness folder), one scratch project, then three live shells created from the window. One remote tab on the loopback
machine for the R arms.

**The local wrapper.** `GMUX_TMUX_BIN` names a copy of `build/p360/local-tmux.sh`, a zsh script in
`build/p326/far-tmux.sh`'s shape: one log line per invocation (`$EPOCHREALTIME`, no child), an env file beside it (the
vendored tmux as `REAL`, `LOG`, `RULES`), and at most one rule at a time, the probe rewriting the rules file atomically
between arms: `hold-new-session-answer` (on `new-session … -P`, run the real command, hold its stdout until a release
file appears, then print it and exit with its status) and `hold-stamp @gmux-agent` (on `set-option … @gmux-agent`, wait
for the release file before exec). Every hold is capped at 4,000 ms, under the exec plane's 10 s deadline, and logs
`# held` and `# released` notes. Everything else is `exec $REAL "$@"` (the version probe, the control client, the
attach). It names no socket of its own and never runs `kill-server`.

| Arm | Launch | What it drives | Graded on |
| --- | --- | --- | --- |
| L3 not stopped, a real busy write (D3, the second press) | per build, launch 1, first | `hold-new-session-answer`; Create from the ⌘T sheet; during the hold start `/usr/bin/sqlite3 <scratch manifest>` holding `BEGIN IMMEDIATE` on its stdin (proved by a second `sqlite3 -cmd '.timeout 0'` meeting "database is locked"), then release; once the sheet settles, end the lock (`ROLLBACK`, stdin closed, the pid waited; SIGTERM by pid in the `finally`) | parent: the sheet shows the busy error, measured at 10.4 s (not "about 5 s": a status refresh's own write waits out the 5 s busy timeout first, then the record write does); a second press makes a SECOND session (the probe's own `list-sessions` of the scratch socket: two new). HEAD: the sheet closes on the session, the window draws it, ONE new session; measured at 15.4 s before the fix round (the create's own launch-context write waited out the lock a third time) and, by the window's own clock, at 10,294 ms after it against the parent's 10,278 ms (see "The fix round"; the probe's own read can come about 5 s later when another write holds main's thread after the answer); the row (a read-only copy) carries the predicted tmux name and no pane pid, printed, not graded |
| R6 another machine, not listed back (D12) | launch 1, second | far rules `stamp-delay-ms 1500`; during that hold, `first-list-delay-ms 12000` written with `$RULES.first-list` removed, so the create's own list outlives `REMOTE_POLL_TIMEOUT_MS` (10,000, `remote-sessions.ts:456`); Create from the remote tab | parent: the sheet shows "…could not find a session called … Nothing was changed."; a second press: the far server holds TWO (the probe's own far list over its ssh wrapper). HEAD: the sheet closes on the session; ONE on the far server; the window's row reads unreachable, then the session's own status once a list completes |
| R5 another machine, a login file prints first (D10) | launch 1, third | the yard's `zdot/.zshenv` = `echo "p360 far login file"`, written just before the press and removed once the sheet settles | parent: `SPAWN_FAILED` with the printed line in the rejection's detail (read through the bridge), the row gone, the far server holding the session; a second press makes two. HEAD: the sheet closes on the session (bound by its id), ONE on the far server, stamped `@gmux-id`; no byte of the printed line in any sentence, toast or app.log line |
| L1 stopped at the record (items 1, 2 through D19, 3) | launch 1, last (it latches) | `hold-new-session-answer`; Create; during the hold the seam file `{ "seq": 1, "fail": { "operation": "updateSession", "code": "SQLITE_CORRUPT" } }`, its armed line read on stdout, then release; then Create again if the sheet is still open | SINCE HIS RULED ROUND (D24) BOTH BUILDS: the sheet shows the stopped sentence; the second press shows it again and spawns NOTHING (§0.1 item 5); ONE new session on the server. Told apart by app.log: HEAD one `manifest.stopped` naming `updateSession` and one `sessions` warn each for `record` and `read-back`, the parent no line of a step after the spawn. `sessions:list` and the window's list are printed, not graded (as first built HEAD graded D14's list) |
| L2 stopped at the broadcast's read (item 3) | per build, launch 2 (fresh profile, the same world) | `hold-stamp @gmux-agent`; Create; during the hold, 1,200 ms in (his ruled round, so the refresh the new session's own notice starts has run), arm `listSessions` with `SQLITE_CORRUPT`; release | SINCE HIS RULED ROUND BOTH BUILDS: the stopped sentence, one new session. HEAD's app.log holds one `read-back` warn and no other step's, the parent's none. Whichever read takes the throw (the create's broadcast or a tick), the latch is after the spawn; the probe prints which, from app.log |
| L1 and L2, the window (the fix round, from the attack lens's arm W; IN A BUSY WINDOW since his ruled round) | as above | before the press the window is put on the world's first shell (`p360-a`) and waits until its terminal is drawn with nothing over it; then that shell runs a print loop with no pause (`PRINT_LOOP`, sent with the vendored tmux on the scratch socket), the page counts its output and the stopped notice by its own clock, and ONE synchronous 600 ms task runs in the page, sent 60 ms before the hold is released (never a timer: a window not in front has its timers throttled) | at BOTH builds: after the create the window is still on that shell and its terminal is still drawn with nothing over it. UNREADABLE unless the window was busy in all three ways: at least 10 chunks of that shell's output reached the window between the press and the settle, the task ran its length from before the release to at least 200 ms past it, and the stopped notice was heard between the task's start and 150 ms after its end, queued with the answer. Main opens no session on this Mac while the list is stopped, so a window that landed on the new session drew "Can't connect to this session" and had closed the one in use (HEAD before the fix round at an idle window, and the fix round's build in a busy one); the parent never moved |
| R7L another machine from a tab on this Mac, the list stopped at the tab write (D25) | per build, launch 3 | the window on the world's LAST shell (`activeSession()` falls back to a tab's last session, so with another in use both builds move to the last and draw "Can't connect", measured once each); far `stamp-delay-ms 1500`; ⌘T, the Machine field set to the loopback machine and the Directory field to a scratch folder over there, Shell, Create; inside the stamp hold 357's seam armed on `clearProjectTabClosed`, whose one call in a create is `openTabsForRemoteCreate`'s after `remoteCreate` returned | BOTH BUILDS, ONE GRADER (his second ruling): the sheet closes on the session; ONE over there carrying the row's `@gmux-id`; the window stays on the session in use, connected; a second Create from a fresh sheet starts nothing over there (refused with the stopped sentence: the machine is no longer offered, so it runs on this Mac). Needs: the Machine field set, the stamp held after the far answer with the seam armed inside it, one `manifest.stopped` naming `clearProjectTabClosed`, no D12 line (the probe review of his second ruled round). SINCE HIS THIRD RULED ROUND: real keystrokes typed into the session in use before the press must reach it (a need), the window must have heard no session list for 4 s before the press (a need: with the control keys typed just before the press both builds landed on the new session, 1 of 1 each), and once the create settled real keystrokes into the session in use must still reach it (a clause) |
| R7 the same from the machine's own tab (D25) | per build, launch 4 | the window on a far shell made from that tab; the same stop | BOTH BUILDS, ONE GRADER: the sheet closes; ONE over there stamped; going back to the session in use draws it connected; a second Create starts nothing over there (Create drawn off: "Tortie is not connected to …"). Since his third ruled round the control keys and the quiet window are needs here too. Printed, never graded: the window lands on the new session, drawn "Machine unreachable" or not, and whether REAL keystrokes reach it there (the parent's own behaviour run to run: 0 of 2 in one of the last reverify's runs and 2 of 2 in another, at both builds) |
| RF the list stopped while the far create was out, so its own list met the stopped store before that machine's create returned (D13, D27) | per build, launch 5 | from the machine's tab; inside the stamp hold the seam armed on `listSessions` and taken at once by the probe's own `sessions:list` read, standing in for a status tick | SINCE HIS THIRD RULED ROUND BOTH BUILDS, ONE GRADER, the parent's: the stopped sentence with the sheet open; ONE over there stamped; the window stays on the session in use, connected, and once the sheet is cancelled real keystrokes typed into it reach it; no line that the list could not be started (D27 lets the refusal through before D13 logs); a second Create starts nothing over there. Needs: the control keys reached the session in use before the press, the quiet window, the latch on `listSessions` inside the stamp hold, no D12 line. His second ruled round graded HEAD's session here and its window landed on the new session, drawn "Machine unreachable", which took 0 of 4 real keystrokes in the last reverify |
| RN RF with R6's list hold, so no list shows the session (D12, D26, D27) | per build, launch 6 | as RF, and once the stamp hold has RELEASED (read off the far log every 10 ms) `first-list-delay-ms 12000`, so the list held is the create's own | SINCE HIS THIRD RULED ROUND BOTH BUILDS, ONE GRADER, the parent's: the stopped sentence with the sheet open (the held list times out and the machine's verdict write meets the stopped store, which D27 lets through, so D12 and D26 are never reached); ONE over there stamped; the window stays and real keystrokes reach the session in use; no line of D12 or D13; a second Create starts nothing over there. Built first without D26, HEAD closed the sheet and the window landed on a session main did not open (typing 0 of 2, and 0 of 1 when chosen again); with D26 and before D27, HEAD answered the stopped sentence after D12's line |
| RFL RF's stop from a tab on this Mac holding two shells, the first in use, the far create made through the sheet's Machine field (D27, his third ruled round) | per build, launch 7 | a second scratch project opened as a tab on this Mac with two shells made from the window, the window on the FIRST; ⌘T with the Machine field and the Directory field set as R7L sets them; RF's stamp hold and seam | BOTH BUILDS, ONE GRADER, the parent's, RF's clauses with the first shell as the session in use. Needs: the Machine field set, the window on the first of the two shells and quiet, the control keys, the latch, no D12 line. His second ruled round's HEAD closed the sheet and the window fell back to the tab's last shell, drawn "Can't connect", the first shell lost until a restart (3 of 3 in the last reverify) |
| RUN | both | the two wrappers by sha256, `/usr/bin/sqlite3` present, the hidden agents, the census, every pid ended, every scratch server gone (local by its socket, far by pid as `probe:p326` ends it), history stats, crash reports by name and mtime | all held, else UNREADABLE (exit 2) |

The parent's launches run first (`P360_PARENT_CHECKOUT`, required: a built checkout, else exit 2), then HEAD's, two per
build as first built, six since his second ruled round and seven since his third (R7L, R7, RF, RN and RFL each latch, so
each has a launch of its own), never two Electrons at once.
SINCE HIS THIRD RULED ROUND (2026-11-17) EVERY TYPING READING IS REAL KEYSTROKES: a mouse press and release at the
centre of the session's terminal, Shift pressed and let go (it sends nothing; its key-up clears xterm's note of a key
still down, under which xterm 6.0.0's `_inputEvent` drops inserted text, the note left standing when ⌘T's key-up landed
on the sheet), the text through CDP's `Input.insertText` into what that click focused, and a real Enter key, read back by the probe's own `capture-pane` of that session's server (`typedReading`: the line
`<mark>-42`, the shell's answer to `echo <mark>-$((6*7))`). Never `window.gmux.term.sendInput` (`__gmuxP95.type`),
which skips the pane's input gate (`paneRefusesInput`, Phase 67): his second ruled round's probe read "typing
reached" through it for a pane that dropped every key a person typed. A sheet left open on an error is cancelled
first, as a person closes it; a click that does not focus the terminal types nothing and reads false. `--grader-self-test` grades recorded fixtures (`build/p360/fixtures/`, one parent-shaped and
one HEAD-shaped record per arm and a broken one per clause) and starts nothing. `P360_ARMS` narrows the arms,
`P360_KEEP=1` keeps the run folder (the wrapper logs, the far log, the manifest copies) for the verifier's
re-derivation. Cost not yet measured; budget 15 to 25 minutes per build. `build/p360/CHECKLIST.md` (the operator's seat,
plain language): nothing to do; if a session ever starts while Tortie says something went wrong, the sheet now closes on
that session and pressing Create again is not needed.

## 9. Builders, disjoint files, and the seams

### 9.1 The table (every file in exactly one list; a builder that must edit a file not in its list stops and names it)

| Builder | Files it owns (and their tests) |
| --- | --- |
| `local` | `src/main/sessions/create-local.ts`; test `src/main/sessions/__tests__/p360-create-after-spawn.test.ts` (new) |
| `remote` | `src/main/machines/remote-sessions.ts`, `src/main/machines/create-confirmation.ts`, `src/main/machines/remote-copy.ts`, `build/conformance-machines.mjs` (condition 69 only), `build/assert-bundle-refusals.mjs` (one pin); tests `src/main/machines/__tests__/p360-remote-create-answer.test.ts` (new), `src/main/machines/__tests__/create-confirmation.test.ts` (the reader's table), `src/main/machines/__tests__/p326-inflight-create.test.ts` and `src/main/machines/__tests__/p3401-create-overtaken.test.ts` (§6) |
| `core` | `src/main/sessions/core.ts`; test `src/main/sessions/__tests__/p360-keep-created.test.ts` (new) |
| `checks` | `build/conformance-create-answer.mjs` (new), `build/p360/**` (new: `probe-p360.mjs`, `local-tmux.sh`, `fixtures/`, `CHECKLIST.md`) |
| integrator | `CLAUDE.md`, `CHANGELOG.md`, `package.json`, `build/verification-checks.mjs`, `build/assert-electron-teardown.mjs` (the floor), `docs/audits/contract-baseline.txt` (verified, not expected to move), and any file two builders both need |

### 9.2 The seams, stated exactly so the four build at once

- `local` declares in `create-local.ts`: `export const AFTER_SPAWN_WORDS` (frozen; the seven keys of §5:
  `record`, `login-notice`, `env-notice`, `id-capture`, `capture-notice`, `broadcast`, `read-back`), and the private
  `afterSpawn`, `afterSpawnRead`, `failureCodeOf`. `CreateLocalDeps` does NOT change.
- `remote` exports from `create-confirmation.ts`: `createdTmuxIdOf(printed: string): string`,
  `answerLineCount(printed: string): number`. From `remote-copy.ts`: `remoteCreateNotStarted(name: string): string`.
  Declares (private) in `remote-sessions.ts`: `settleUnansweredCreate`, `remoteCreateAnswer`. `remoteCreate`'s signature
  and `RemoteCreateInput` do not change.
- `core` declares `private keepCreatedSession(session: Session): void` in `GmuxCore`; no public member.
- `checks` reads those names exactly (§7.1) and writes nothing in `src/`.

### 9.3 The builders' briefs (the workflow hands each its own, with §0, §0.1 and §1.1)

- **`local`**: §4.1. The test is §2.1's matrix committed at HEAD over the shipping `createLocalSession` (the scratch
  `m1/local.m1.test.ts` is the reference; copy its fakes, not its expectations): every fault row RESOLVES with the
  session the spawn made (its id, `tmuxName` equal to tmux's applied name), the spawn ran once, nothing was killed, the
  row is still in the file, and the log spy holds exactly one `sessions` warn per failing step naming
  `AFTER_SPAWN_WORDS[step]` and the code and no error message. Add the remote branch's two guards (a `remoteCreate`
  that resolves, then a broadcast and a capture notice that throw: the create answers the session). Keep the existing
  create-local tests green, the text-reading ones above all (`p94-remote-create-folder`, `capture-refusal-wiring`,
  `p306-held-closed`, `p350-pi-bare-name`).
- **`remote`**: §4.2. The test is §2.2's matrix at HEAD on Phase 326's fakes: R5a and R5b resolve (the confirmation
  read answers `GMUX_SESSION_ID=<id>` and the list names `$4`), the stamps go to `$4`, the row stays, and no byte of
  either noise line is in any log line (spy) or detail; an unread answer with a proven absence rejects
  `remoteCreateNotStarted('work')` with the row dropped and a detail holding only the line count; an unread answer with
  an unreadable confirmation rejects `CREATE_ANSWER_LOST` with the row `unknown`; R6, R6b and R6c resolve with
  `status: 'unknown'` and one log line each; every Phase 117 lost-answer case in `remote-sessions.test.ts` and the p326
  file passes UNCHANGED. `create-confirmation.test.ts` gains CA4's ten shapes. Run `npm run conformance:machines`,
  `npm run conformance:farattach` and `npm run ablation:p326` before returning.
- **`core`**: §4.3. Tests over the borrowed bodies on a host with a REAL store (357's method): a stopped store and a
  created session → `lastCleanList` gains it once and one `sessions:changed` carries it; a store that reads → nothing
  added; a second keep of the same id → no duplicate; a `broadcastSessions` that throws inside the keep → logged once,
  no throw; `createSession` still refuses during shutdown (the ledger).
- **`checks`**: §7.1 and §8. The gate runs green on the integrated tree and red on each ablation; the probe's
  `--grader-self-test` passes; it does NOT launch the app (the verifiers do).

Every builder runs `npm run typecheck` and `npm test` (under the history block; name the four `/bin/ps` tests as they
fail) before it returns, and returns every file it changed with its line counts.

## 10. The proof, run rather than read (Tier 3)

### 10.1 Lens A: the behaviour (Method 1: measure the parent; Method 2: run over real data)

The gates once (§11's list; the integrator's PASS lines are only a start). Then:
- **The parent, measured.** Run the committed p360 vitest files at HEAD (every row answers the session or Phase 117's
  unknown, nothing killed) AND against the parent with a scratch config rooted at
  `/private/var/tmp/tortie-wt/wt-p360-parent` (as §2 did; never write into the parent): every fault row there answers a
  failure, which re-derives §2.1 and §2.2 by the verifier's own run.
- **The app.** `probe:p360` whole, parent first, under a lock slot, `P360_KEEP=1`. Re-derive, by the verifier's own
  code: the session counts from the kept wrapper and far logs and its own `list-sessions`, the sheet states from its own
  DOM reads, app.log's lines.
- **The independent step.** The verifier's own far shell (§2.3's method, its own arms: a `.zshenv` printing three lines,
  one printing `$3`, one exiting early, CRLF output) against HEAD's composed strings, then HEAD's `createdTmuxIdOf` and
  `settleUnansweredCreate` over those answers in vitest: each binds the right `$`-id or proves absence, and no far text
  reaches an error or a log.

### 10.2 Lens B: the attack (Method 3)

- Walk `createLocalSession`, its remote branch and `remoteCreate` with the verifier's OWN parser walk (not the gate's)
  and list every call after the point of no return; compare to the gate's verdict. Plant a throw at every listed step
  in vitest over the shipping functions, including the two the gate allows by name (`recordLaunchContext`, `toSession`:
  try to make each throw and report whether it can), `remoteSessionMachine`, the manifest stopping mid remote create,
  and a window whose `send` throws on each channel. No plant may make a create answer a failure while a pane runs, and
  none may end a pane.
- The phone's start: `build/p316/node-phone.mjs` through the Tailscale and DNS stand-ins (`build/p330/tailscale-standin.mjs`,
  `build/p332/dns-standin.mjs`, composed as `probe:p317` and `probe:p3167` compose them), a start sent while the local
  wrapper holds the create and 357's seam is armed: parent `failed`, HEAD `done`, one session either way.
- The gate's ablations, and three of the verifier's own on the product in a `cp -Rc` clone (a guard removed each): its
  own matrix must turn red on each.
- Hunt: any entry point (the sheet, quick create and the hotkeys, the phone) where a create answers a failure while a
  pane runs; any session a create ends (none); any far text in a sentence or a log.

### 10.3 At the end, once

The Electron count with CLAUDE.md's command, outside the history block; every `p360` socket under
`/private/tmp/tmux-501/` gone; the history stats; the crash reports by name and mtime.

## 11. The integrator's commands (in order; each with its exit code and PASS line in the report)

1. `npm run typecheck`
2. `node build/contract-inventory.mjs --check` (must pass unchanged)
3. `npm test` (the full suite under the history block; the four `/bin/ps` native tests named as the expected failures)
4. `npm run build` (gate:electron at floor 185, gate:background, gate:checks, the bundle pins, gate:contract and the rest inside it)
5. `npm run conformance:createanswer`
6. `npm run conformance:farattach`
7. `npm run conformance:machines`
8. `npm run ablation:p326`
9. `npm run conformance:stoppedlist`
10. `npm run conformance:agents` and `npm run conformance:shellenv`
11. The core.ts hunk check (`git diff -U0 de9ea8f2 -- src/main/sessions/core.ts`) and each gate it names
12. `npm run conformance:pocket`
13. `npm run smoke:t1`
14. `npm run smoke:fault` (it launches through `build/electron-run.mjs`; its create points `create.after-spawn` and `create.after-launch-record` sit inside the code this phase guards)
15. `node build/p360/probe-p360.mjs --grader-self-test`
16. The Electron count, the socket check, the history stats

`smoke`, `smoke:t3` and `smoke:quit` are NOT run: their npm scripts start `electron .` from `harness-socket.mjs`'s
shell line, not through `build/electron-run.mjs` (357's §11). The main session decides at landing (§13).

## 12. What is NOT in this phase

- No rollback: a create never ends the session it started so that its error becomes true. Tortie never ends a session
  on its own.
- No change to the order in which a create writes and spawns, to the spawn's own failure (§0.1 item 7 is owed), or to
  Phase 117's lost-answer behaviour (D11 moves its code, byte for byte in behaviour).
- No change to 357's latch, D19's compose, the refusal's words, `broadcastSessions`, the tray feed or `broadcastEvent`.
- Not restore, resume in place, restart or the phone's other verbs (§3.4 lists their steps; each finding is owed).
- No dedupe of a second create by its name. No new surface, menu row, notice kind, channel or env name. No phone change.
- Nothing reads his live profile. No release.

## 13. For the main session at landing

1. `smoke`, `smoke:t3` and `smoke:quit` were not run by any role (§11).
2. Owed entries (found, not this phase's): (a) the local spawn's own failure for a session tmux made: an unparseable
   answer (`sessions.ts:206-215`) or a `new-session` past the exec plane's 10 s deadline, after which the spawn's catch
   deletes the row of a running session (§0.1 item 7); (b) the remote restore's item 5 (`remote-restore.ts:574-582`),
   which says "Nothing was changed." after its far command ran; (c) restore's notices after its spawn
   (`restore.ts:1156-1175`, `:1194`) and the core's restore tail (`core.ts:2087-2208`), and restart's read after its
   create (`restart.ts:234`), each able to answer a failure for a running session.
3. Cleanup after the follow-up commit: the worktree, `/private/var/tmp/tortie-wt/wt-p360-parent`, and
   `/private/var/tmp/tortie-wt/scratch/p360/`.

## 14. Questions for him (the main session asks; the build proceeds on the defaults)

1. **The window while the session list is stopped.** ANSWERED BY HIS RULING OF 2026-11-14 ("360 a"): keep today's
   behaviour for that one case. A create during which the list stopped answers the stopped sentence and the window
   stays on the session in use (D24); D14 and D20 are removed. As first written: Default: a session a create started
   is added to the list the window shows, so it is drawn (D14). It cannot be opened until the restart, like every session while the list is
   stopped (main refuses every attach then, Phase 357), so the window stays on the session in use rather than landing
   on it (the fix round; the first wording here said "and can be opened", which was false). The other choice: leave
   that list as it is; the sheet closes, the session runs, and it appears after the restart.
2. **A remote session no list has shown yet.** Default: the create answers it and leaves its row as today, so a later
   list settles it (in the rare case a completed list does not hold it, its row reads as it does today). The other
   choice: write that row's status as unknown and keep its id for the rescue, as a lost answer is kept, which adds a
   second writer of that status.
3. **The words.** Default: `That machine did not start a session called <name>. Nothing was changed.`

## 15. The spec step's commands, exit codes and numbers

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before and after every run below | 0 | | `743166 1793987027`, `23166 1790702242`, unchanged throughout |
| `df -h /` | 0 | | 49 GB free at the start, 48 GB before the clone |
| vitest `local.m1` (first try) | 1 | | the scratch config could not resolve `vitest` from outside the worktree; rewritten as a plain object |
| vitest `local.m1` | 0 | 6.99 s | 17 cases; §2.1 |
| vitest `remote.m1` | 0 | 490 ms | 6 cases; §2.2 |
| vitest `compose.m1` | 0 | 478 ms | `m2/composed.json` |
| `node m2/far-shell.mjs` | 0 | | six arms, §2.3; `kill-server` then a list exited 1; no `p360` socket left under `/private/tmp/tmux-501/` |
| `git clone --local --no-checkout /Users/gdc/gmux wt-p360-parent`, `checkout --detach de9ea8f2`, `cp -Rc` of `node_modules` and `build/vendor` | 0 | 6 s | addon-webgl sha256 `e4ab05d2…` |
| `npm run build` in the parent | 0 | 52 s | `out/` built |
| The Electron count (outside the history block, `HOME` and `ZDOTDIR` in scratch) | 0 | | none of this step's; it launched no Electron |

## §As built — the integrator (2026-11-08)

Integrated in `/private/var/tmp/tortie-wt/wt-p360` at `de9ea8f2`. Nothing was committed, staged or stashed. `git diff de9ea8f2`
is this phase's delta: 18 tracked files (857 insertions, 171 deletions) and 9 new files. His history read
`743166 1793987027` and `23166 1790702242` before and after every run below and never moved. One run launched
Electrons (`smoke:fault`), under lock slot `electron.lock`, which it took and released. The integrator's scripts and
logs are under `/private/var/tmp/tortie-wt/scratch/p360/integrator/` (`run.sh`, `electron-run.sh`, `dupscan.mjs`,
`logs/`).

### What the four builders built (from their reports, then read in the diff)

| Builder | Built | Its test |
| --- | --- | --- |
| `local` | `create-local.ts` +183 −49: `AFTER_SPAWN_WORDS` (frozen, §5's seven keys), and the private `afterSpawn`, `afterSpawnRead` and `failureCodeOf` (a string `code`, else `name`, each only as one short word, else `unknown`; never the message). Nine guarded steps: `record`, `login-notice`, `env-notice`, `id-capture`, `capture-notice` (twice), `broadcast` (twice) and `read-back`. The create answers `toSession({ ...(stored ?? record), tmuxName: info.tmuxName })` | `p360-create-after-spawn.test.ts`, 33 cases (27 red at the parent) |
| `remote` | `createdTmuxIdOf` and `answerLineCount` in `create-confirmation.ts`. In `remote-sessions.ts`: `settleUnansweredCreate`, which holds Phase 117's read and arms moved byte for byte, `remoteCreateAnswer`, `failureWordOf`, and the feed start and env notice each in its own `try`. `remoteCreateNotStarted` in `remote-copy.ts`. Condition 69 moves 2 → 1. The pin `machine.create-not-started` takes the machine refusals from 53 to 54 | `p360-remote-create-answer.test.ts`, 20 cases (16 red at the parent). CA4's shapes in `create-confirmation.test.ts`. §6's moved cases in the p326 and p3401 files |
| `core` | `core.ts` +76 −3: `createSession` hands the session it answered to the private `keepCreatedSession` (D14) | `p360-keep-created.test.ts`, 18 cases |
| `checks` | `conformance:createanswer` (CA1 to CA6, 46 ablations). `probe:p360` (L3, R6, R5, L1, L2 and RUN), `local-tmux.sh`, `fixtures/graders.json` (143 readings) and `CHECKLIST.md` | the gate's ablations and the probe's `--grader-self-test` |

### What the integrator changed, and why

| File | Change | From |
| --- | --- | --- |
| `package.json` | `conformance:createanswer` and `probe:p360`, as §7.1 and §8 spell them | §7.1, §8 |
| `build/verification-checks.mjs` | `pure('conformance:createanswer')` and `remote('probe:p360')`, each under a comment. The probe is `remote` because it builds its own loopback machine, as p340's does | §7.1, the checks builder |
| `build/assert-electron-teardown.mjs` | `HELPER_USER_FLOOR` 184 → 185, with a paragraph naming the probe | obligation 1 |
| `CLAUDE.md` | One path-triggered row for `conformance:createanswer`, under `conformance:stoppedlist`'s. It names `openTabsForRemoteCreate` too, because CA2 reads it. One probe row for `probe:p360`, under `probe:p357`'s | §7.1, Phase 357's precedent for the probe row |
| `CHANGELOG.md` | One item under `## Unreleased`, `### Fixed`: §5's sentence with no full stop and no commit link, which the follow-up commit adds | §5, the release-note rules |
| `docs/audits/contract-baseline.txt` | Line 588, `[bundle.refusals] machines=53` → `machines=54`. `build/contract-inventory.mjs` counts `MACHINE_REFUSALS`, and D18's pin is one of them, so §6's "nothing moves" could not hold beside D18. No channel, env name, schema, migration or key moved. **The commit body names this line** | obligation 3; the tree wins over §6 |
| `src/main/machines/__tests__/remote-sessions.test.ts:769-785` | "refuses to invent a row when the machine lists none back" becomes "invents no feed row …, and answers the session it started": the create answers `status: 'unknown'` and the feed still draws no row. D12 moves this case on purpose. §6 missed it and no builder owned the file. The remote builder's proposed text, applied as written | D12, all three product builders |
| `src/main/sessions/__tests__/capture-refusal-wiring.test.ts:51-58` | The slice's end anchor `deps.broadcastSessions();\n    return session;` is gone since D9. `indexOf` answered −1, and the slice ran to the end of the file (33,162 characters, past the LOCAL branch's capture notice), so the test could no longer fail. It now ends at `openTabsForRemoteCreate(deps.manifest` (3,636 characters, the bound `p306-held-closed` reads) and asserts both anchors. With the remote branch's notice removed in memory, the new slice lacks `EVT_CAPTURE_NOTICE` | the local builder |

### Decisions left as built

- **§14's three questions**: all three built on their defaults (D14, D12, `remoteCreateNotStarted`'s words).
- **The one-word failure rule is spelled three times**: `failureCodeOf` in `create-local.ts`, inline in
  `keepCreatedSession`'s catch, and `failureWordOf` in `remote-sessions.ts`, which also reads a structured error's code.
  They are left apart for three reasons. §9.2 keeps `failureCodeOf` private. `remote-sessions.ts` cannot import
  `create-local.ts` without a runtime cycle, because `create-local.ts` imports `remoteCreate`. And no block repeats for
  10 lines: the integrator's scan (`dupscan.mjs`) found 0 windows of 10 code lines added by this phase that occur twice
  under `src/main`. At 6 lines the same scanner finds 9, `remoteCreateAnswer`'s two property lists among them, which
  CA3 pins as written; that result proves the scanner can find a repeat.
- **Remote log lines are scope `config`**, not `machines` as §5 says. `config` is the file's one logger
  (`machinesLog = getLog('config')`).
- **R6b answers the session as the list showed it**: the create's own pass puts the row in memory before its manifest
  write fails, so D13's first arm applies.

### Commands, exit codes and numbers (§11's order)

Every command ran with `HOME` and `ZDOTDIR` under the integrator's scratch, `HISTFILE=/dev/null`, `SHELL=/bin/sh`,
`TERM_SESSION_ID`, `TERM_PROGRAM` and `SSH_AUTH_SOCK` unset, and `TMPDIR` under `/var/tmp/tortie-wt/scratch/p360/integrator/`.
Everything ran inside the history block except `smoke:fault`, the four `/bin/ps` tests' second run and the final count.

| # | Command | Exit | Wall | Numbers |
| --- | --- | --- | --- | --- |
| 1 | `npm run typecheck` | 0 | 4 s | import boundaries OK (1,439 production files, 8,224 imports, 0 violations); no runtime cycles (5,031 edges, 0 components); shared types OK |
| 2 | `node build/contract-inventory.mjs --check` | 1, then 0 | 1 s | first `- 588: machines=53` / `+ 588: machines=54`; re-baselined with `--out docs/audits/contract-baseline.txt` (exit 0, that one line); then "matches … byte for byte" |
| 3 | `npm test` | 1 | 112 s | 1,195 files (1,188 passed, 3 failed, 4 skipped); 22,824 tests (22,797 passed, 4 failed, 23 skipped). The 4 are the `/bin/ps` tests, EPERM inside the block: process-table.native "sees this process under its true parent and walks the chain to it", ps.native "sees this process under its true parent", ps.native "finds a child this test spawned among the descendants of this pid", p269-env-names "kills a shell that never exits, on the deadline, leaving no survivor". Outside the block, with the scratch home, those 3 files pass 10 of 10 (3 s). 23 skipped against the builders' 16, because `scan.integration.test.ts`'s 7 cases skip when the scratch home holds no `~/.agents/skills`, so they read nothing of his |
| 4 | `npm run build` | 0 | 62 s | 54 machine confirm-gate refusals in `out/main/index.js`. gate:electron: 185 helper users against the floor of 185, 32 of 32 ablations. gate:background: 587 files read, 3 start a process and each ends it in a `finally`. gate:knownhosts: 615 files. gate:checks: 286 check scripts classified, and 1,195 test files reach no home past HOME. gate:simulator, gate:docker, conformance:ios (55 rules), gate:onlyadd and conformance:harnessprobes PASS. gate:contract OK |
| 5 | `npm run conformance:createanswer` | 0 | 1 s | CA1 to CA6 PASS over 691 files; 46 of 46 ablations red on exactly their rule; control green; `createdTmuxIdOf` driven over 10 answers, 3 source variants and the shipped module; 589 ms |
| 6 | `npm run conformance:farattach` | 0 | 1 s | FA1 to FA11 ok (FA5 included), 168 ms |
| 7 | `npm run conformance:machines` | 0 | 29 s | PASS. Condition 69 holds at one `dropRemoteRow` caller; condition 70 and Phase 117's two text reads are green |
| 8 | `npm run ablation:p326` | 0 | 9 s | 25 of 25 arms red on their owner alone, and the 4 behaviour arms red in vitest; 8.8 s |
| 9 | `npm run conformance:stoppedlist` | 0 | 1 s | S1 to S10 PASS; 51 of 51 ablations red; control green; S8 over 19 environment shapes |
| 10 | `npm run conformance:agents`, then `npm run conformance:shellenv` | 0, 0 | 4 s, 1 s | both PASS |
| 11 | `git diff -U0 de9ea8f2 -- src/main/sessions/core.ts` | — | — | Two hunks: `@@ -3467,0 +3468,8` (createSession's doc comment) and `@@ -3470,3 +3478,68` (createSession's body and the new `keepCreatedSession`). The only rows naming those are `conformance:createanswer` (#5) and, for `lastCleanList`'s second writer, `conformance:stoppedlist` (#9). No hunk touches a function that endtree, farattach, machines, remoteclose, samefolder or pocket names |
| 12 | `npm run conformance:pocket` | 0 | 12 s | 192 rules, 25,725 checks, 11.78 s |
| 13 | `npm run smoke:t1` | — | — | **not run**: the integrator brief's last paragraph forbids it, and that wins over this list |
| 14 | `npm run smoke:fault` | 0 | 106 s, its build included | 20 cases PASS: clean, 16 chosen points (`create.after-spawn` and `create.after-launch-record` among them) and 3 random. No `gmux-fault` socket or process was left. Crash reports were unchanged (33 entries, by name and mtime). The Electron list was identical before and after: his Tortie (692) and five other apps' crashpad handlers |
| 15 | `node build/p360/probe-p360.mjs --grader-self-test` | 0 | under 1 s | 11 graders; 40 clauses each red alone; 36 needs each unreadable alone; 104 missing fields; 21 raw fixtures; 25 reader checks; nothing started |
| 16 | the end, outside the block | 0 | | his Tortie (692) and the crashpad handlers of Slack, Chrome, Tortie.app, Granola and Cursor, and nothing of this phase's; 0 `p360` sockets under `/private/tmp/tmux-501/`; all three lock slots free; history unchanged |

The battery's three legs are #1, #4 and #3, run on the final tree. No test reads `out/`, so their order does not matter,
and they were not run a second time the same way (CLAUDE.md, rule 2). The extra path-triggered gates and attacks run
over the changed files:

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `npm run conformance:remoteclose` (CLAUDE.md names `remote-sessions.ts`) | 0 | 1 s | 11 tests, 618 ms |
| the phase's own and moved test files, once, for the counts | 0 | 21 s | 8 files, 263 tests: p360-create-after-spawn 33, p360-keep-created 18, p360-remote-create-answer 20, create-confirmation 31, p326-inflight-create 53, p3401-create-overtaken 2, remote-sessions 102, capture-refusal-wiring 4 |
| `npm run ablation:p276` (edits `create-local.ts`) | 0 | 40 s | 32 ablations red on their owner |
| `npm run ablation:p306` (edits `create-local.ts`) | 0 | 38 s | 23 of 23 |
| `npm run ablation:p331` (edits `create-local.ts`) | 0 | 406 s | 71 of 71 |
| `npm run ablation:p275` (edits `create-local.ts`) | 1 | 137 s | 1 failure, arm R33 (below); every arm that edits `create-local.ts` red on its owner |
| `node build/p275/ablation.mjs` in a `cp -Rc` clone of the built parent | 1 | 121 s | the same single failure, R33, at the same line; all 31 arms read the same at HEAD and at the parent |

### Found, not this phase's (owed an entry)

- **`ablation:p275`'s arm R33, "the launchable id table emptied", fails at HEAD and identically at the parent
  `de9ea8f2`.** The arm empties `LAUNCHABLE_AGENT_IDS` in `src/main/agents/registry.ts`. conformance:agents then throws
  at `judgeRuleCases` (`build/conformance-agents.mjs:2177`) before section 9's R33 reads red. Neither file is one this
  phase touches.

### Not run, and why

- `smoke:t1`: the brief forbids it. `smoke`, `smoke:t3`, `smoke:quit`, `smoke:remote` and `smoke:machines`: not run
  (§11, §13).
- `probe:p360` live: it belongs to the verifiers, under a lock slot, with
  `P360_PARENT_CHECKOUT=/private/var/tmp/tortie-wt/wt-p360-parent` (15 to 25 minutes a build, not yet measured).
- `conformance:pocket:hostile`: no path it names moved (`remoteRename`, the reply and the screen are untouched).
- Left in the integrator's scratch for the landing's cleanup: `parent-clone/`, a `cp -Rc` copy of the built parent
  used only for `ablation:p275`.

### The fix round (2026-11-08)

Fixed once, in `/private/var/tmp/tortie-wt/wt-p360` at `de9ea8f2`. Nothing was committed, staged or stashed (`git diff
--cached` empty). After the round `git diff de9ea8f2` is 20 tracked files (948 insertions, 179 deletions) and 10 new
files (the integrator's 9 and `src/renderer/state/__tests__/p360-create-landing.test.ts`). Scratch, scripts and logs:
`/private/var/tmp/tortie-wt/scratch/p360/fixer/`. Both lenses answered needs_work. Every major and minor is fixed; the one
scenario worse than the parent (the attack lens's arm W) is FIXED, not dropped, because dropping would put back the
false failure the entry exists to remove.

| Finding | Severity | What it was | The fix | Decision |
| --- | --- | --- | --- | --- |
| Lens B, arm W: the window after a create while the list is stopped | major, worse than the parent | the create now answered, so the window landed on the new session; main refuses every attach while the list is stopped, so it drew "Can't connect to this session", and the move had closed the session in use, which could not be opened again until a restart. The parent's create failed and the window never moved | the window does not land while the list is stopped: `sessionListStopped` and `noteSessionListStopped` in the slice, noted first in the `manifest-stopped` arm, read once after the create's answer, guarding `setActiveSession(` and the remote-tab landing. §14 Q1's "and can be opened" corrected | D20 |
| Lens A: probe:p360's app.log slice | major (tooling) | the arm's start count included the empty string after app.log's last newline, so the slice dropped the first line written during each arm: a false FAIL on L1@head and UNREADABLE on L2 at both builds | one pure exported reader, `appLogLinesOf` (empty strings dropped) with `appLogSinceTexts`, used by the run and driven by the self-test: 4 reader fixtures and 4 raw fixtures in which the graded record (or the line an absence clause must see) is the first new line | probe |
| Lens A: HEAD 5 s slower than the parent's failure under a held lock | minor | the create reached `recordLaunchContext`, whose synchronous write waited out the busy timeout before the answer | the launch context is not asked for when the record write could not be made (`recorded = afterSpawn('record', …)`): by the window's own clock HEAD now closes the sheet at 10,294 ms against the parent's error at 10,278 ms (below) | D21 |
| Lens A: §8 L3 "about 5 s" | nit | the app shows 10.4 s at the parent | §8 corrected with the measured times | — |
| Lens B: the gate green on three behaviour ablations (X1 to X3) | nit | keep's duplicate check, the D5 overlay, the unread unreachable arm keeping its row | CA5, CA1 and CA4 widened, one ablation each | D23 |
| Lens B: a catch that can throw while it reads the error (LT3, LT4) | nit | a rejection with no value, or a getter that throws | `failureCodeOf` one `try` answering `unreadable`; the keep's catch reads inside its own `try`; the mirror reads `?.message` | D22 |

**D21 was tried another way first and measured not to help.** A macrotask between the resolver and the write in
`captureAndStore` (`src/main/context/snapshot.ts`) let the answer leave before the write (the vitest proved the order),
but the write still held main's thread 5 s, so the window could not attach and the probe, whose CDP reads pass through
main's thread, read the sheet settled at 15,461 ms against the parent's 10,259 ms. It was reverted to the parent's bytes
(`snapshot.ts` and its test are not in the delta) and replaced by not asking for the launch context at all after a
record write that failed: the store has just refused a write, so its next write fails the same way, and the parent never
reached that line in that case either, so no session loses a snapshot it had.

**With D21 the answer reaches the window at the parent's moment, measured by the window's own clock.** The create's own
extra write is gone: run 2's head-1 app.log holds no "context snapshot … was not stored" line for L3's session, where
run 1's did (52.970), and the vitest asks for no launch context under a real held lock. But the probe's reads pass
through main's thread (CDP is served by the browser process), so a write holding that thread delays the READ, and runs 2
and 3 still read the sheet settled at 15,344 and 15,371 ms. So the probe now arms a DOM observer in the window at the
press (`settledByWindow`, printed beside `settleMs`; a timer stamp first tried read null at the parent, because a window
that is not in front has its timers throttled to about one a second). Run 4, L3 at both builds: the window settled at
**10,278 ms at the parent (the busy error) and 10,294 ms at HEAD (closed on the session)**; the probe read them at
10,273 and 10,393 ms. Run 3's throttled stamp read 10,932 ms at HEAD while the probe read 15,371. What holds main's thread
after the answer in some runs is another subsystem's write meeting the same lock: in run 2 the wrapper log shows main
held from the create's last stamp (53.369) to 58.408 (the activity poll's `list-panes`, every 2 s, paused from 48.299 to
58.443), the window's attach of the new session running at 58.480; the likeliest writer is the activity monitor
committing the new session's first status (`applyDetectedStatus` → `setStatus`, `src/main/sessions/core.ts:1478-1499`),
which the parent meets too. It delays the new terminal's attach by up to the busy timeout, not the answer, and only
while another process holds the manifest's write lock for seconds, when every write in main waits 5 s.

**The order D20 relies on held live.** Main posts the `manifest-stopped` notice synchronously at the latch, inside the
create, before the create's answer, and both reach the window over one ordered channel; in L1 and L2 at HEAD the window
stayed on the session in use with its terminal drawn and nothing over it, at both builds, in both runs.

#### Files the fix round changed (lines against the pre-fix tree, the attack lens's `cp -Rc` copy)

| File | Lines | What |
| --- | --- | --- |
| `src/renderer/state/sessions-slice.ts` | +35 −1 | D20: the flag, `noteSessionListStopped`, the landing guard |
| `src/renderer/state/subscriptions.ts` | +5 | D20: noted first in the `manifest-stopped` arm |
| `src/main/sessions/create-local.ts` | +48 −15 | D21 (`afterSpawn` answers a boolean, `recorded`, `if (recorded)`), D22 (`failureCodeOf`, the mirror's catch) |
| `src/main/sessions/core.ts` | +21 −10 | D22: the keep's catch |
| `src/renderer/state/__tests__/p360-create-landing.test.ts` | new, 5 cases | D20 through the real subscription, the notice sent inside the create among them |
| `src/main/sessions/__tests__/p360-create-after-spawn.test.ts` | +68 −3 | D21 (3 cases, the launch context counted), D22 (the mirror rejecting with no value, a code getter that throws) |
| `src/main/sessions/__tests__/p360-keep-created.test.ts` | +47 | D22 (2 cases) |
| `build/conformance-create-answer.mjs` | +340 −12 | CA7, the CA1/CA4/CA5 clauses, D21's CA1 clause, 12 ablations (49 → 61), the control over 8 files |
| `build/p360/probe-p360.mjs` | +153 −32 | the reader, the window readings and clause for L1 and L2 at both builds, the settle stamp, the staleness list |
| `src/main/context/snapshot.ts`, its test | ±0 | changed for D21's first form, measured, reverted to the parent's bytes |
| `build/p360/fixtures/graders.json` | 205 → 222 readings | the window's honest, broken and unreadable readings, 4 raw, 4 readers |
| `build/p360/CHECKLIST.md` | +4 | one line for a stopped list |
| `build/p360/SPEC.md` | | D15 amended, D20 to D23, §8, §14 Q1, this section |
| `CLAUDE.md` | 2 rows | the createanswer row (the window's files and CA7) and the probe:p360 row (its measured time, the window clause at both builds, the settle stamp) |

#### Commands, exit codes and numbers

Inside the history block with `HOME`, `ZDOTDIR` and `TMPDIR` in the fixer's scratch (`TMPDIR` spelled through `/var`,
as the integrator's was: the preview protocol test needs a temporary folder behind a symlink), `HISTFILE=/dev/null`,
`SHELL=/bin/sh`, `TERM_SESSION_ID`, `TERM_PROGRAM` and `SSH_AUTH_SOCK` unset, except where marked "outside".

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `npm run typecheck` (twice, the second on the final tree) | 0, 0 | ~4 s | import boundaries 1,439 files, 8,224 imports, 0 violations; no runtime cycles |
| `node build/contract-inventory.mjs --check` | 0 | 1.1 s | matches the baseline byte for byte: no contract line moved |
| `npm test`, first battery | 1 | 75.5 s | 22,834 tests: 22,806 passed, 5 failed, 23 skipped. The 4 `/bin/ps` tests (EPERM in the block) and `protocol.test.ts` "sits behind a symlink", which needs `TMPDIR` behind a symlink: 36 of 36 with it spelled through `/var` |
| `npm test`, final tree | 1 | 73.2 s | 22,836 tests: 22,806 passed, 7 failed, 23 skipped. The 4 `/bin/ps` tests and 3 cases of `src/main/tmux/__tests__/resolve.test.ts`, whose shell did not write its pid file inside the 300 ms deadline at a load average of 13.7; the file alone, 40 of 40 |
| the 3 `/bin/ps` test files, outside, twice | 0, 0 | ~3 s | 10 of 10 |
| `npm run build`, twice | 0, 0 | 47.7 s, 48.7 s | gate:electron, gate:background, gate:checks, the bundle pins, gate:contract and the rest inside it |
| `npm run conformance:createanswer`, final | 0 | 1.0 s | CA1 to CA7 PASS over 693 files; 61 of 61 ablations red on exactly their rule; control green; 718 ms |
| `npm run conformance:farattach` | 0 | 0.2 s | FA1 to FA11 |
| `npm run conformance:machines` | 0 | 29.2 s | PASS (sessions-slice.ts is in condition 54's file list) |
| `npm run ablation:p326` | 0 | 34.2 s | 25 of 25 |
| `npm run conformance:stoppedlist` (subscriptions.ts's `manifest-stopped` arm) | 0 | 1.5 s | S1 to S10, 51 ablations, control green |
| `npm run conformance:agents`, `npm run conformance:shellenv`, final tree | 0, 0 | 4.4 s, 0.9 s | PASS, PASS |
| `git diff -U0 de9ea8f2 -- src/main/sessions/core.ts` | 0 | | the same two hunks (createSession, keepCreatedSession) |
| `npm run conformance:pocket` | 0 | 17.4 s | 192 rules, 25,725 checks |
| `npm run conformance:manager` (sessions-slice.ts) | 0 | 2.0 s | 72 rules, 2,919 checks |
| `npm run conformance:remoteclose` | 0 | 0.8 s | 11 tests |
| `npm run ablation:p276`, `ablation:p306`, final tree | 0, 0 | 33.6 s, 33.0 s | 32 of 32, 23 of 23 |
| `npm run ablation:p331`, first battery | 1 | 363.6 s | every arm red on its owner; failed only because the fixer edited the worktree's `create-local.ts` (D21) during the run |
| `npm run ablation:p331`, final tree | 0 | 383.5 s | 71 of 71 |
| `npm run ablation:p275` (on the final `create-local.ts`) | 1 | 127.9 s | R33 alone, the failure the integrator measured identically at HEAD and at the parent |
| `node build/p360/probe-p360.mjs --grader-self-test` | 0 | <1 s | 11 graders, 44 clauses each red alone, 42 needs each unreadable alone, 118 fields, 68 raw fixtures, 48 reader checks; nothing started |
| the fix round's own ablations, `cp -Rc` clone, `scripts/ablate.mjs` | 0 | ~1 min | 6 of 6 red on exactly the tests written for them: the window landing again (4 of 5 red), the notice not noted (4 of 5), the launch context after a failed record (2 of 38), `failureCodeOf` unguarded (1), the mirror's bare `.message` (1), the keep's catch unguarded (2 of 20) |
| `probe:p360` run 1, outside, lock slot 2, `P360_KEEP=1` (the D21 macrotask variant) | 0 | 150.9 s | 11 PASS, 0 FAIL, 0 UNREADABLE, RUN PASS. L3 parent 10,259 ms, HEAD 15,461 ms. L1 and L2: the window stayed and stayed connected at both builds |
| `probe:p360` run 2, outside, lock slot 3, final tree | 0 | 171.1 s | 11 PASS, 0 FAIL, 0 UNREADABLE, RUN PASS (census 4 of 4, 154 sampler reads, no pid left, both scratch servers gone). L3 parent 10,235 ms (the busy error, 2 sessions after a second press), HEAD 15,344 ms (closed, 1 session, one record warn SQLITE_BUSY, no stopped record). L1 parent: stopped sentence twice, 1 session, window on `p360-a`, connected; HEAD: closed in 396 ms, listed and drawn, 1 session, one `manifest.stopped` naming `updateSession`, warns record and read-back `MANIFEST_STOPPED`, window on `p360-a`, connected. L2 the same shape, the latch naming `listSessions`. R6 parent 2 far sessions, HEAD 1 (row unknown then idle); R5 parent 2, HEAD 1 in 304 ms |
| re-derived from run 2's kept logs (`scripts/rederive.py`, shlex, not the probe's reader) | 0 | | local wrapper: 267 invocations, every one on the scratch socket, no ending verb; `new-session -s`: L3 parent 2 (`p360-l3p`, `p360-l3p-2`), HEAD 1; L1 and L2 one per build. Far wrapper: 154 invocations, no ending verb; R5 and R6 parent 2 each, HEAD 1 each |
| `probe:p360` run 3, outside, lock slot 3, `P360_ARMS=L3`, the first settle stamp (a timer) | 0 | 52.5 s | 3 PASS. Read by the probe: parent 10,263 ms, HEAD 15,371 ms; by the window: parent null (its timer throttled), HEAD 10,932 ms |
| `probe:p360` run 4, outside, lock slot 2, `P360_ARMS=L3`, the stamp a DOM observer | 0 | 47.4 s | 3 PASS. Read by the probe: parent 10,273 ms, HEAD 10,393 ms; by the window: parent 10,278 ms, HEAD 10,294 ms; parent 2 sessions after its second press, HEAD 1 |
| `npm run smoke:fault`, outside, lock slot 1 | 0 | 112.2 s, its build included | PASS, 20 cases, every invariant held: clean, 16 chosen points (`create.after-spawn` and `create.after-launch-record` among them) and 3 random; no process names `gmux-fault-` afterwards |
| the end, outside, once | 0 | | the Electron count by CLAUDE.md's command: his Tortie (692) and the crashpad handlers of Slack, Chrome, Tortie.app, Granola and Cursor, as at the start, and Phase 362's own probe under its scratch; nothing of this phase's. No `p360` socket under `/private/tmp/tmux-501/`. This round's lock slots released. Crash reports 33 by name and mtime before and after every Electron run, unchanged. The ablation clone removed |
| his history, `stat -f '%z %m'` only | | | `743166 1793987027` / `23166 1790702242` through run 2. It read `743197 1794199949` after the fixer's unblocked run of the three `/bin/ps` test files, so the fixer started nothing for 3 minutes (its lock-retry loop was stopped before it could start a probe) and it moved again inside that quiet window, to `743319 1794200266`: his terminal. Unchanged across runs 3 and 4 and everything after. `.bash_history` never moved |

#### No regression, the rows the fix round reaches (parent beside this build)

| Scenario | Today (parent) | This build | Worse |
| --- | --- | --- | --- |
| ⌘T create, the list stops at the record write (L1, arm W) | the stopped sentence; the window stays on the session in use, connected | the sheet closes, the session is listed and drawn, ONE session; the window stays on the session in use, connected | no |
| ⌘T create, the list stops at the broadcast's read (L2) | the stopped sentence; the window stays, connected | closes, drawn, one session; the window stays, connected | no |
| a real held write lock (L3) | the raw busy error, 10,278 ms by the window's clock; a second press makes a second session | closes on the session at 10,294 ms by the window's clock, one session; the new terminal's attach can wait up to 5 s more behind another subsystem's write, as anything in main does while the lock is held | no |
| the create's tail meets a catch that cannot read its error | rejects while the pane runs (at both builds before the fix round) | answers the session; the line says `unreadable` | no |

#### Not run, and why

- `smoke`, `smoke:t1`, `smoke:t3`, `smoke:quit`, `smoke:remote`, `smoke:machines`: forbidden or outside this round (§11, §13).
- `conformance:pocket:hostile`: no path it names moved.
- A real `SQLITE_IOERR`: not producible in scratch; the hook throws better-sqlite3's own class, as the spec's matrix did.
- The attack lens's own live arms (its node-phone start and arm W) were not re-run with its scripts: arm W's scenario is
  probe:p360's L1 and L2 window clause, graded at both builds in runs 1 and 2, and the phone's start reaches the core's
  create, which the round did not change. Those arms are the reverify's.
- Quick create and the agent hotkeys were not driven live: both reach the slice's `createSession`, the one landing D20
  guards, and CA7 holds that every landing after the answer asks the flag.
- `git diff de9ea8f2 -- src/main/context/` is empty: D21's first form was measured and reverted.

### His ruled round (2026-11-14)

Built in `/private/var/tmp/tortie-wt/wt-p360`, rebased by the main session onto origin/main `8645875e` (Phases 362, 365,
366 and 361.1's guard). Nothing was committed, staged or stashed (`git diff --cached` empty). After the round `git diff
8645875e` is 18 tracked files (855 insertions, 181 deletions) and 9 new files: the window's two files left the delta,
`p360-keep-created.test.ts` and `p360-create-landing.test.ts` went, and `p360-create-stopped.test.ts` came. The builder's
scratch, scripts and logs are under `/private/var/tmp/tortie-wt/scratch/p360/ruled-builder/` (`logs/`, `scripts/`,
`m/`, `out/`, the fix round's clone `moving/` and the ablation copy `abl/`).

**The ruling, in the words he read.** "360 a": keep today's behaviour for that one case, and land the rest after a quick
independent check. Nothing is lost: once the list is broken, a second Create is already refused before anything starts,
and the session keeps running.

#### What was built, and where each decision comes from

| What | Decision | From |
| --- | --- | --- |
| `GmuxCore.createSession` (`src/main/sessions/core.ts`): `const session = await createLocalSession(…)`, then `if (this.manifest.stoppedReading()) throw manifestStoppedError('getSession')`, then `return session` | A create during which the session list stopped answers the stopped list's own refusal, the parent's answer, decided from main's own state (the store's latch) when the create ends and never from the order a window hears the notice | the ruling; the brief; D24 |
| `keepCreatedSession` removed; `lastCleanList` written by `listSessions` alone | D14 served only an answered session; the one case is back to today, the list included | the ruling (D14 is that case) |
| `src/renderer/state/sessions-slice.ts` and `subscriptions.ts` back to the parent's bytes (`git show 8645875e:<file>`); `p360-create-landing.test.ts` removed | D20 REMOVED, not kept: with main answering the refusal whenever the list stopped before the create ended, the window never gets a session to land on in that case, and every other create lands on a session main opens, so the rest of the phase does not need it. The comment above `land` went with `land` | the brief ("only as far as the rest still needs it"); measured below |
| D20 in this spec corrected with the reverify's measurement (the reply overtakes queued sends) | | the brief, item 2 |
| `build/conformance-create-answer.mjs`: CA5 rewritten for D24 (8 ablations), CA7 and its 6 ablations removed with the window's files, the keep's 7 ablations replaced; 6 rules, 56 ablations as the builder left it. CORRECTED BY HIS SECOND RULED ROUND (2026-11-16): the probe review of this round added CA5's sole-return clause (`createSession` is ONE `return` of the admit, nothing chained on it or around it) and read every class member for the writer and the keep, with 3 ablations, so the round ended at 59 (CA5 11); his second ruling's five took it to 64 (CA5 16) | | the rule this round changes |
| `build/p360/probe-p360.mjs`: L1 and L2 in a busy window at both builds; L1@head and L2@head grade the parent's answer and HEAD's app.log; the parent's L1 and L2 gain "no line of a step after the spawn"; `busyReading`; `SNAPSHOT` `8645875e`; `fixtures/graders.json` 222 → 255 readings | | the brief, item 3 |
| `src/main/sessions/__tests__/p360-create-stopped.test.ts` (new, 9 cases) | | the rule's test |
| `build/p360/CHECKLIST.md`, `CLAUDE.md` (the two rows) | | |
| Split Session after a quick create during which the list stops: not touched | the same at both builds (the reverify, 2 of 2 and 1 of 1) | the brief, item 4 |

#### Commands, exit codes and numbers (every number measured today on these trees)

Inside the history block (`sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb`) with `HOME`, `ZDOTDIR` and
`TMPDIR` in the builder's scratch, `HISTFILE=/dev/null`, `SHELL=/bin/sh`, terminal and identity variables unset, except
where marked "outside", where the same environment ran without the block. Every Electron ran through
`build/electron-run.mjs` under one slot of the shared lock (`/private/var/tmp/tortie-ops/lock.sh`, the script the brief
names under `/private/tmp/tortie-ops/` was not there, and this one holds the same three slots, which other rounds were
using).

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `npm run typecheck` | 0 | 43.2 s | import boundaries 1,445 files, 8,245 imports, 0 violations; no runtime cycles (5,044 edges) |
| vitest `p360-create-stopped.test.ts` | 0 | 1.5 s | 9 of 9 |
| the same file in a `cp -Rc` copy with D24's `if` taken out (`scripts/ablate-core.mjs`) | 1 | | 4 of 9 red, exactly the four creates during which the list stopped; the five others green |
| `npm run build`, HEAD | 0 | 82.4 s | gate:electron 188 helper users against the floor of 188; contract inventory byte for byte; 54 machine refusals |
| `npm run build`, the parent (its `out/` was missing) | 0 | 73.3 s | |
| `npm test` | 1 | 123.5 s | 23,017 tests: 22,988 passed, 6 failed, 23 skipped. The 4 `/bin/ps` tests (EPERM in the block), and 2 FSEvents tests of Phase 365's watcher, `p365-process.native` "survives the watcher ending…" and `repo-watcher.native` "stays sighted when an ignored root is named `!archive`", at a load average of 56.7 |
| the 2 watcher files alone, HEAD, then the parent | 1, 1 | | HEAD 3 of 9 failed, the parent 3 of 9 failed, different cases each time: the parent fails the same way, so it is not this round's |
| the 3 `/bin/ps` files and the 2 watcher files, outside | 1 | | the `/bin/ps` files pass whole; the watcher files 2 of 9 failed again, at a load average of 26 |
| `npm run conformance:createanswer` | 0 | 1.3 s | CA1 to CA6 over 697 files, 56 of 56 ablations red on exactly their rule, control green, 999 ms (59 of 59 after the probe review, 1.09 s; the reverify read 59 of 59, 1.3 s) |
| `npm run conformance:stoppedlist` | 0 | 3.9 s | 15 rules over 1,442 files, 178 ablations and a control |
| `npm run conformance:manager` (sessions-slice.ts) | 0 | 3.3 s | 72 rules, 2,919 checks |
| `npm run conformance:farattach` (core.ts) | 0 | 0.3 s | 11 rules |
| `npm run conformance:pocket` (the phone's start answer) | 0 | 18.4 s | 192 rules, 25,741 checks |
| `npm run conformance:machines` (sessions-slice.ts is in condition 54's list) | 0 | 42.5 s | PASS |
| `node build/p360/probe-p360.mjs --grader-self-test` | 0 | <1 s | 11 graders, 46 clauses each red alone, 54 needs each unreadable alone, 138 fields, 74 raw fixtures, 58 reader checks |
| `probe:p360` whole, outside, `P360_KEEP=1`, the parent first | 0 | 166.7 s | 11 PASS, 0 FAIL, 0 UNREADABLE, RUN PASS (below) |
| `probe:p360` L1,L2 from the fix round's clone (`moving/`, the pre-round delta on `8645875e`, built, with this round's probe), outside, the parent first | 1 | 80.9 s | the parent PASS twice; the fix round's build FAIL twice, each on the window clause (below) |
| the builder's own measurement (`m/template.r1.test.ts`, stamped per tree): the REAL core body and the REAL `createLocalSession` over a REAL store, at both builds | 0, 0 | | 11 cases each (below) |
| `npm run smoke:fault`, outside | 0 | 127.7 s, its build included | 20 cases PASS, every invariant held, `create.after-spawn` and `create.after-launch-record` among them |

**The probe, at both builds, in a busy window.** L1 (stopped at the record write): the parent and HEAD both drew the stopped
sentence (872 and 844 ms), the second press drew it again and spawned nothing, ONE new session, and the window stayed on
the session in use with its terminal drawn. The busy window held at both: the session in use's output reached the window
39 and 41 times between the press and the answer, the 600 ms task began 60 and 63 ms before the release and ran 540 and
537 ms past it, and the stopped notice was heard 3 and 2 ms after the task ended. HEAD's app.log: one `manifest.stopped`
naming `updateSession`, a `record` and a `read-back` warn naming `MANIFEST_STOPPED`; the parent's none. L2 (stopped at the
broadcast's read): both the stopped sentence (2,064 and 2,026 ms), ONE session, the window stayed; 187 and 179 output
chunks, the task 61 ms ahead of the release, the notice 4 and 3 ms after it ended; HEAD one `read-back` warn, the parent
none. L3 (a real held write lock, not stopped): the parent's busy error at 10,286 ms by the probe (10,510 by the window)
and two sessions after a second press; HEAD closed on the session at 10,527 ms (10,397 by the window), one session, one
`record` warn naming `SQLITE_BUSY`. R6 and R5: the parent two far sessions each after a second press, HEAD one each. In L1
and L2 at both builds `sessions:list` and the window's list held the new session (a status tick composed the list before
the latch), printed and not graded.

**The clause reads red at a build that moves the window.** At the fix round's build, in the same busy window, L1 and L2
each landed on the new session, which drew "Can't connect to this session" (2 of 2), with the busy window held (29 and
177 output chunks, the task 61 and 62 ms ahead of the release, the notice queued 21 and 23 ms after it ended), while the
parent stayed in both. The fix round's idle-window clause had passed at that build.

**The builder's measurement, the core's answer at both builds** (the REAL `GmuxCore.prototype.createSession` on a host,
the REAL `createLocalSession`, a REAL store, tmux, the far create and the window faked):

| Case | The parent | HEAD |
| --- | --- | --- |
| this Mac, the list stops at the record write (L1) | `MANIFEST_STOPPED`, the stopped sentence, detail `updateSession`; 1 spawn, 0 killed, the row kept; 0 lists sent | the same answer, detail `getSession`; 1 spawn, 0 killed, the row kept; 1 list sent (the create's own broadcast, D19's last clean list) |
| this Mac, the list stops at the create's own broadcast read (L2), the tray feed's read, or the read-back | `MANIFEST_STOPPED`, detail `getSession`, 0 killed, the row kept | the same, byte for byte |
| this Mac, NOT stopped: a busy record write, an I/O error at the read-back or at the tray feed's read, a window whose send throws | a failure for a running session (the raw error), 0 killed | the session, 0 killed |
| another machine, NOT stopped: a window whose send throws | a failure | the session |
| another machine, the list stops at the create's tab write after the far create answered | **the session** | `MANIFEST_STOPPED`, the stopped sentence |
| another machine, the list stopped by another read while the far create ran (`remoteCreate` stood in, its feed not modelled) | **the session** | `MANIFEST_STOPPED` |

#### Still worse than the parent, measured

CORRECTED BY HIS SECOND RULED ROUND (2026-11-16) with the reverify's live numbers, which replaced this paragraph's
mechanism (written from vitest and not driven live): the session in use was lost 0 of 7 times.

- **A create on another machine during which the list stops after that machine answered and before the create ends.**
  The parent answered the session there; this round's HEAD answered the stopped sentence ("Restart Tortie, then try
  again.") for a session running over there. The reverify's own arms, parent first in every pair, stopping the list at
  the create's tab write (`clearProjectTabClosed`, after `remoteCreate` returned): from a tab on this Mac with the
  sheet's Machine field set (R7L), the parent closed the sheet 3 of 3 and HEAD showed the stopped sentence 3 of 3, the
  window staying on the local session in use, connected and answering typing, at both builds; from the machine's own
  tab (R7), the parent closed the sheet 4 of 4 and landed on the new session (3 drawn "Machine unreachable", its status
  frozen at unknown while typing still reached it, 1 working), HEAD showed the stopped sentence 4 of 4 and stayed,
  connected; the session in use reconnected and answered typing at both builds. A second Create was refused at both
  builds with nothing started over there. FIXED BY HIS SECOND RULING (D25): see "His second ruled round".
- Nothing else measured is worse. The detail of L1's refusal names `getSession` where the parent's named `updateSession`,
  and HEAD's L1 sends one more `sessions:changed` (D19's last clean list); no surface draws either.

#### His history, the crash reports and the end

- His history, `stat -f '%z %m'` only: `746290 1794669389` and `23166 1790702242` at the builder's start (10:32). The zsh
  file read `746321 1794670684` at 10:50, modified at 10:38:04: one entry of 31 bytes, about 15 characters of command,
  shorter than any command of the builder's, written while the builder ran only read-only inspection commands (each a
  non-interactive shell outside the block; from then on everything but Electron ran inside it). The builder then started
  nothing for 3 minutes: no further move. It is read as his terminal on the evidence that the 25 or so unblocked commands
  the builder ran between 10:38 and 10:50 left the file unmoved, so they cannot be its writer; by the letter of the rule an
  unmoved file after the quiet window means stop and report, and it is reported here and to the main session. It read
  `746321 1794670684` and `23166 1790702242` before and after every run of this round, the Electron runs included.
- Crash reports, by name and mtime only: 26 before the first Electron run and 26 after the last, unchanged.
- The end, once: every lock slot this round took released; no `p360` or `gmux-fault` socket under
  `/private/tmp/tmux-501/`; no process of this round's; the Electrons by CLAUDE.md's command are his Tortie (94808) and
  its crashpad handler, other apps' crashpad handlers and the probes of Phases 359, 364 and round r145, none of this round's.
- Left for the landing's cleanup: `/private/var/tmp/tortie-wt/scratch/p360/ruled-builder/` (its `moving/` clone is BUILT,
  a build that moves the window, for the reverify) and `/private/var/tmp/tortie-wt/wt-p360-parent/out/`, built here.

#### Not run, and why

- `smoke`, `smoke:t1`, `smoke:t3`: the main session's. `smoke:quit` and `smoke:quitdoors`: the round's change is not on
  the quit path. `smoke:remote`, `smoke:machines`: forbidden.
- `conformance:resume:capture` and `conformance:resume`: they start real agents.
- `ablation:p326`, `ablation:p331`, `ablation:p276`, `ablation:p306`, `conformance:agents`, `conformance:shellenv`: this
  round changed nothing in `create-local.ts` or `remote-sessions.ts`, which those read.
- The remote case above, live: the probe has no arm that stops the list during a create on another machine.
- The phone's start live: it reaches `GmuxCore.createSession`, and `thrownStart` answers `failed` for the stopped refusal
  at both builds (read, `src/main/sessions/pocket-start.ts`).

### His second ruled round (2026-11-16)

Built in `/private/var/tmp/tortie-wt/wt-p360`, rebased by the main session onto origin/main `9a04292b` (Phases 359 and
368). Nothing was committed, staged or stashed (`git diff --cached` empty). After the round `git diff 9a04292b` is
19 tracked files (`build/conformance-farattach.mjs` joined them) and the same 5 untracked entries. The builder's
scratch, scripts and logs are under `/private/var/tmp/tortie-wt/scratch/p360/a-builder/` (`logs/`, `scripts/`, `m/`
for the both-builds measurement, `out/` for every probe report, `abl/` for the ablation copy).

**The ruling, in the words he read.** "360 a": apply the rule only to sessions on this Mac, so sessions on another
machine work as they do today. Add two tests for that case, check again, then land it.

#### What was built, and where each decision comes from

| What | Decision | From |
| --- | --- | --- |
| `p360-create-after-spawn.test.ts`'s fake deps gain Phase 368's `lastFittedSize: () => null` | the rebase's one typecheck failure | the brief |
| `GmuxCore.createSession`: the check is `this.manifest.stoppedReading() && (createMachineIdFor(input) === undefined \|\| remoteSessionRow(session.id) === null)`, `createMachineIdFor` imported from `./launch-plan` beside `snapshotRecipeOf` | D25: the check is a create on this Mac's, decided by the create's own machine rule (`machineId` that is not `local`, else `projectMachineId` that is not `local`), never by `input.machineId` alone, which a create through the tab rule does not carry | the ruling; the last reverify's major |
| the same condition's second half, `remoteSessionRow(session.id) === null` | D26, NEW: on another machine the check is asked of the create no list has shown, the one create main would not open while the list is stopped; every other create on another machine answers its session, as the parent does | the brief's item 3 (a remote stop shape worse than the parent is fixed or dropped), measured below |
| `p360-create-stopped.test.ts`: 10 cases (19 in all) | the two he asked for (R7L, a tab on this Mac with the Machine field set; R7, the machine's own tab), the tab rule alone, D26's unlisted create (the refusal) and the same with the store reading (its session, D12 stands), a machine named `local` (this Mac, the refusal), a remote create that fails (its error untouched), and the phone's start over the real `createPocketStart`: a listed remote project `done`, an unlisted one `failed`, this Mac `failed` | the ruling ("add two tests"), D26, item 4 |
| `conformance:createanswer` CA5: the condition above (either order of either operator, either side of each comparison), the test handed `createSession`'s own parameter, the create handed the same, `createMachineIdFor` from `./launch-plan` and `remoteSessionRow` from `../machines/remote-sessions` under their own names with neither declared in core.ts; nine ablations (68 in all, CA5 20) | | the rule this round changes |
| `conformance:farattach` FA8: a member that also calls the create's own machine rule `createMachineIdFor(` is not deciding remote-ness from the feed maps alone | D26's row read made FA8 read `createSession` as a feed-only member (FA8 red over the tree, 1 of 11); its machine is decided from what the create was asked, and the feed is read only for a session already known to be on another machine. `ablation:p326`'s A17 (a new feed-only method) still reads red on FA8 alone | new, D26 |
| probe:p360 arms R7L, R7, RF and RN, launches 3 to 6 per build | R7L and R7 are the last reverify's arms (the seam on `clearProjectTabClosed`), armed inside the far `@gmux-id` stamp hold, so after the far create answered; ONE grader per arm at both builds (his ruling: HEAD answers as the parent); RF and RN are the two other remote stop shapes the phase changed (the feed's write, a session no list has shown), graded parent and HEAD apart | the brief, items 2 and 3 |
| `fixtures/graders.json`: 291 → 425 readings | the honest readings of the eight new graders recorded from the round's last whole run (D26 built); a broken one per clause (his first ruling's stopped sentence for a session running over there, and RN at HEAD before D26, recorded, among them), an unreadable one per need, 10 raw far logs and app.log lines through the run's own readers, 7 reader checks; every earlier entry unchanged, compared as JSON | |
| `CHECKLIST.md`, `CHANGELOG.md`, `CLAUDE.md` (the two rows), this spec (§1 row 5, D24, D25, D26, §7.1 CA5, §8, "His ruled round"'s counts and its "Still worse" paragraph) | the words the last round left wrong | the brief, item 5 |

#### What the builds answer, measured

**Vitest, at both builds and at HEAD with the check asked of every create** (the first ruling's core, `ruled1`; the
template `m/template.m2.test.ts`, stamped per tree: the REAL `GmuxCore.prototype.createSession` on a host, the REAL
`createLocalSession`, the REAL `remoteCreate` with Phase 360's remote fakes, the REAL `remote-record` over a REAL
`ManifestStore` installed with `setRemoteManifest`, 357's fault hook latching the store, and the REAL
`createPocketStart`; 12 cases, 12 of 12 ran at each build):

| Case | The parent | HEAD | ruled1 |
| --- | --- | --- | --- |
| T1 R7L, the stop at the tab write after the far create returned | the session | the session | `MANIFEST_STOPPED` |
| T2 R7, the same | the session | the session | `MANIFEST_STOPPED` |
| T3 the tab rule alone, the same | the session | the session | `MANIFEST_STOPPED` |
| F the feed's write: stopped during the stamps, listed back | `MANIFEST_STOPPED` | the session (D13) | `MANIFEST_STOPPED` |
| N no list shows it, stopped during the stamps | `SPAWN_FAILED` "…Nothing was changed." | `MANIFEST_STOPPED` (D26) | `MANIFEST_STOPPED` |
| N0 no list shows it, the store fine (R6) | `SPAWN_FAILED` "…Nothing was changed." | the session, `unknown` (D12) | the session |
| C control, another machine, the store fine | the session | the session | the session |
| L1 this Mac, the stop at the record write | `MANIFEST_STOPPED` (`updateSession`) | `MANIFEST_STOPPED` (`getSession`) | the same |
| P1 the phone, a project over there, the stop at the tab write | `done` | `done` | `failed` |
| P2 the phone, the feed's write | `failed` | `done` | `failed` |
| P4 the phone, no list shows it, stopped during the stamps | `failed` | `failed` | `failed` |
| P3 the phone, a project on this Mac, the record write | `failed` | `failed` | `failed` |

In every case at every build: one far `new-session`, 4 stamps, no far ending verb, nothing killed, the row kept.

**Live, probe:p360 at both builds, the parent first** (each run outside the history block under one lock slot,
`P360_KEEP=1`; the readings below are every run in which the arm's needs held):

| Arm | The parent | HEAD |
| --- | --- | --- |
| R7L (the session in use the tab's last shell) | closed on the session, the window stayed, connected, 4 of 4; ONE over there, stamped; the second sheet no longer offers the machine, so its Create ran on this Mac and was refused with the stopped sentence, nothing started over there | the same, 4 of 4 |
| R7L with the tab's FIRST shell in use (the first try) | closed; the window moved to the tab's last shell, drawn "Can't connect to this session" (1) | the same (1) |
| R7 | closed, the window landed on the new session drawn "Machine unreachable", 4 of 4, typing reached it 2 of 2 THROUGH THE BRIDGE (corrected by his third ruled round: with real keystrokes the last reverify read 0 of 2 in one run and 2 of 2 in another at both builds, and this round's probe 0 of 1 at both, a click on a pane drawn "Machine unreachable" focusing nothing); the session in use opened again connected 4 of 4; the second sheet's Create drawn off ("Tortie is not connected to p360far.") | the same: 4 of 4, typing 2 of 2 through the bridge, 4 of 4 |
| RF | the stopped sentence, the window stayed, connected, 5 of 5 | closed, landed on the new session drawn "Machine unreachable" 5 of 5, typing reached it 3 of 3 THROUGH THE BRIDGE, the session in use opened again 5 of 5 (D13's line every time). CORRECTED BY HIS THIRD RULED ROUND: the bridge skips the pane's input gate; with real keystrokes the last reverify read the new session taking 0 of 4 and the reopened session in use 0 of 2, so this was WORSE than the parent, and D27 puts the parent's answer back |
| RN, HEAD with D25 alone | the stopped sentence (its held list timed out into the stopped store), stayed, 6 of 6 | closed, landed on the new session drawn "Machine unreachable" 4 of 4, typing reached it 0 of 2, and 0 of 1 again when it was chosen a second time 17 s later; the session in use opened again 4 of 4 |
| RN, D26 built | the stopped sentence, stayed (1) | the stopped sentence, stayed (1), D12's line written first |

Every arm at every build: ONE session over there, carrying the `@gmux-id` of the row its create wrote, and a second
Create starting nothing over there.

**D26 is why RN changed.** With D25 alone, RN at HEAD landed the window on a session main had not opened (no list had
shown it, and `remoteRecordOf` refuses while the list is stopped, so the attach could not wait for one), which is the
shape his first ruling chose today's answer over. The parent answers a session on another machine only when a list has
shown it (item 6 throws otherwise), so D26 can only ever give the parent's failure where the parent gives a failure.
RF's landing is the parent's own R7 landing: main opens that session, and typing reaches it. CORRECTED BY HIS THIRD RULED ROUND: that typing was the bridge's, which skips the pane's input gate; a person's keys did not reach that session (0 of 4) nor, afterwards, the session in use (0 of 2), so RF was worse than the parent, and since D27 it answers the parent's refusal.

#### Commands, exit codes and numbers (every number measured today on these trees)

Inside the history block (`sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb`) with `HOME`, `ZDOTDIR`
and `TMPDIR` in the builder's scratch, `HISTFILE=/dev/null`, `SHELL=/bin/sh`, terminal and identity variables unset,
except where marked "outside", which ran the same environment without the block under one slot of the shared lock
(`/private/var/tmp/tortie-ops/lock.sh`, owner `p360a-builder`). The load average read 6 to 100 during the round.

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `npm run typecheck`, after the fixture fix | 0 | 3.1 s | (the rebase's one error gone) |
| `npm run typecheck`, D26 built | 0 | 9 s | 1,456 production files, 8,302 imports, 0 violations; no runtime cycles (5,082 edges) |
| `npm run build`, the parent (its `out/` was missing) | 0 | 64 s | |
| `npm run build`, HEAD, D25 | 1 | 36 s | gate:background read a start at the probe's far log reader: a `const` of `stampHoldReading(parseWrapperLog(…))` followed by a `reading.far = { … }` in `deriveReading`; bisected in a scratch copy of the gate, rewritten as one spread (a false positive of the gate's value reader, not a process) |
| `npm run build`, HEAD, D25 | 0 | 62 s | gate:electron 191 helper users against the floor of 191; contract inventory byte for byte |
| `npm run build`, HEAD, D26 | 0 | 65 s | the same; the bundle holds the check once |
| `npm run build`, HEAD, final tree | 0 | 134 s | gate:electron 191 against the floor of 191; gate:background 602 files, 4 start a process and end it in a `finally`; contract inventory byte for byte; the bundle holds the check once |
| vitest `p360-create-stopped.test.ts` | 0 | 2.4 s | 19 of 19 |
| the same file in the `abl/` copy, D25 and D26 ablated one at a time (`scripts/ablate.py`) | | | the check asked of every create: 5 of 19 red (the three listed remote cases, D26's case, the phone's listed project); the machine read from `input.machineId` alone: 2 (the tab rule alone, `local`); the machine test turned around: 6; D26 removed: 5 (D26's case and the phone's unlisted project among them); D26 turned around: 6; `core.ts` restored byte for byte |
| `npm run conformance:createanswer`, final | 0 | 2 s | CA1 to CA6 over 699 files, 68 of 68 ablations red on exactly their rule, control green |
| `npm run conformance:stoppedlist` | 0 | 6 s | 16 rules over 1,453 files, 283 ablations and a control |
| `npm run conformance:farattach`, D26, before FA8 learned it | 1 | 0 s | FA8 red: `createSession` read as deciding remote-ness from the feed maps alone |
| `npm run conformance:farattach`, final | 0 | 0.2 s | FA1 to FA11 |
| `npm run ablation:p326` | 0 | 10 s | 25 of 25 arms red on their owner alone, A17 (a new feed-only method) on FA8 |
| `npm run conformance:endtree` | 0 | 2 s | 16 rules, 84 self-tests |
| `npm run conformance:pocket` (the phone's start answer) | 0 | 14 s | 192 rules, 25,845 checks |
| `npm run conformance:machines` | 0 | 32 s | PASS |
| `node build/p360/probe-p360.mjs --grader-self-test`, final | 0 | <1 s | 19 graders, 79 clauses each shown red alone, 99 needs each shown unreadable alone, 281 fields that answer UNREADABLE when missing, 99 raw fixtures, 79 reader checks; nothing started |
| `node build/assert-background-teardown.mjs`, final | 0 | | 602 files, 4 start a process and end it in a `finally`, 32 of 32 fixtures |
| vitest `m/template.m2.test.ts` at the parent, HEAD and ruled1 | 0, 0, 0 | ~2.5 s each | 12 of 12 each (the table above) |
| probe:p360 `P360_ARMS=R7L`, outside | 2 | 88.9 s | R7L UNREADABLE at both builds: the second sheet no longer offered the machine (since read: it runs on this Mac and is refused); with the tab's first shell in use both builds moved the window to its last shell ("Can't connect") |
| probe:p360 `R7L,R7`, outside | 2 | 120.0 s | R7L PASS at both; R7 UNREADABLE at both: the second sheet's Create was drawn off (since read as a refusal) |
| probe:p360 `R7,RF,RN`, outside | 1 | 220.6 s | R7, RF PASS at both; RN@parent FAIL on the first grader, which expected item 6's sentence where the parent answered the stopped sentence (corrected to either failure) |
| probe:p360 whole, outside | 2 | 438.1 s | 17 PASS, RN UNREADABLE at both builds: a list sent 1,181 ms into the stamp hold took the list hold |
| probe:p360 `RN`, outside, the hold rule after the latch | 2 | 75.2 s | RN@parent PASS; RN@head UNREADABLE, the same at 1,246 ms |
| probe:p360 `RN`, outside, the hold rule written at the stamp hold's release | 0 | 85.2 s | 3 PASS |
| probe:p360 whole, outside, D25 alone | 0 | 450.7 s | 19 PASS, 0 FAIL, 0 UNREADABLE, RUN PASS |
| probe:p360 `RF,RN`, outside, typing read again later | 0 | 192.4 s | 5 PASS; RF@head typing reached (through the bridge, which skips the pane's input gate: corrected by his third ruled round, a person's keys reached it 0 of 4 in the last reverify); RN@head 0 at once and 0 when chosen again |
| probe:p360 whole, outside, D26 built (the recorded fixtures) | 0 | 434.2 s | 19 PASS, 0 FAIL, 0 UNREADABLE, RUN PASS (census held at every launch, no ssh without `-F none`, no real Tailscale, every pid ended, both scratch servers gone) |
| `npm test` | 1 | 85 s | 23,370 tests: 23,334 passed, 12 failed, 24 skipped. The 4 `/bin/ps` tests (EPERM in the block: process-table.native, ps.native twice, p269-env-names), which pass outside it with the scratch HOME; and 8 FSEvents cases (store-watch.native 1, p365-process.native 3, repo-watcher.native 4), whose stream fired nothing for the scratch temporary folder ("the barrier write … produced no fire"); outside the block 8 of 10 failed at HEAD and 6 of 10 at the parent, run the same way, different cases; `src/main/watcher`, `config` and `fs` hold 0 lines of the delta |

#### The phone's start

Read: `src/main/sessions/pocket-start.ts:501` hands the window's quickCreate input (both machine fields for a project on
another machine) to `GmuxCore.createSession`, and `thrownStart` answers `failed` for anything thrown. Measured above
in vitest at both builds through the real `createPocketStart`: a listed project over there `done` at both (P1), this
Mac `failed` at both (P3), no list shown `failed` at both (P4), the feed's write `failed` at the parent and `done` at
HEAD (P2); since his third ruled round (D27) `failed` at both, measured again below. NOT DRIVEN LIVE: the door's own probe (`probe:p346`) builds its machine through
`build/with-scratch-machine.mjs`, whose `isolated()` reads `~/.ssh/config`, which this phase's rules forbid, and composing
the door, the Tailscale and DNS stand-ins and a paired node phone beside this phase's loopback machine is a probe of its
own; the start reaches the one method the sheet's create reaches, which the live arms drive.

#### Still worse than the parent, measured

- CORRECTED BY HIS THIRD RULED ROUND (2026-11-17): this round said nothing measured was worse, and RF was. As first
  written: "Two answers differ from the parent's, each where the parent answered a failure for a session that was
  running, and each with the window landing on a session main opens: RF at HEAD answers its session (D13) and lands on
  it drawn "Machine unreachable", as the parent itself lands in R7, typing reaching it 3 of 3; the phone's start answers
  `done` there (P2)." The typing was the bridge's. The last reverify typed as a person does and read RF at HEAD worse
  (the new session took 0 of 4 keys, the session in use then 0 of 2) and RFL worse (the window fell back to the tab's
  last shell, drawn "Can't connect", the first shell lost until a restart), 3 of 3 each; D27 answers both as the parent. N in vitest answers the stopped sentence where the parent said "…Nothing was
  changed." (both failures). The detail of L1's refusal names `getSession` where the parent's named `updateSession`;
  no surface draws it.

#### His history, the crash reports and the end

- His history, `stat -f '%z %m'` only: `746902 1794858458` and `23166 1790702242` at the builder's start (20:40) and
  before and after every run of this round, the Electron runs included, until the final build: the zsh file read
  `746933 1794884859` after it, one entry of 31 bytes written at 22:07:39, while the only process of the builder's that
  ran was that build, inside the history block, whose profile denies any write to that file. The builder then started
  nothing for 3 minutes: no further move (`746933 1794884859` at 22:12:52). It is read as his terminal, as the 31-byte
  entry of 2026-11-14 10:38 was; `.bash_history` never moved.
- Crash reports, by name and mtime only: 27 at the first Electron run and after every one, unchanged by name and mtime.
- The end, once, outside the block: the Electrons by CLAUDE.md's command are his Tortie (94808) and its crashpad
  handler, other apps' crashpad handlers, and Phase 325.1's probe under `wt-p3251`, none of this round's; no `p360`
  socket under `/private/tmp/tmux-501/`; every lock slot this round took released; 27 crash reports, unchanged.
- Left for the landing's cleanup: `/private/var/tmp/tortie-wt/scratch/p360/a-builder/` (its `abl/` clone, the kept
  probe run folders under `tmp/`, the reports under `out/`) and the parent's `out/`, built here.

### His third ruled round (2026-11-17)

Built in `/private/var/tmp/tortie-wt/wt-p360`, which the MAIN SESSION REBASED onto origin/main `89b2a3cb` before this round
(Phase 325.1, `2c9bd6f1`, and its two docs commits): the conflicts in `CHANGELOG.md` (325.1's linked item first, then
this phase's), `CLAUDE.md` (the `probe:p3251` and `probe:p360` rows, both kept) and `build/assert-electron-teardown.mjs`
(both phases' paragraphs kept) were resolved there, and the main session RAISED `HELPER_USER_FLOOR` 191 → 192, because
325.1's probe and this phase's each reach the helper; `build/verification-checks.mjs`, `package.json` and
`src/main/sessions/core.ts` auto-merged. Nothing was committed, staged or stashed (`git diff --cached` empty) and
`git diff 89b2a3cb` is the phase's delta. The builder's scratch, scripts and logs are under
`/private/var/tmp/tortie-wt/scratch/p360/b-builder/` (`logs/`, `out/`, `scripts/`, `m/` for the both-builds measurement,
`fx/` for the fixtures, `abl/` for the ablation clone).

**The ruling, in the words he read.** "360 a then ship 115.0": one more short round, in which a create on another
machine answers exactly as today when Tortie's session list stops working before that machine has finished starting the
session (today: "Restart Tortie, then try again", the window kept on the session in use, which still works), the test
uses real keypresses, and then it is checked again and landed.

#### What was built, and where each decision comes from

| What | Decision | From |
| --- | --- | --- |
| `remoteCreate` (`src/main/machines/remote-sessions.ts`): the catch around `await startMachineFeed(...)` begins `if (isManifestStopped(err)) throw err;` | D27: the stopped refusal the create's own feed meets goes through, as the parent's unguarded feed start let it; every other error is still logged once and answered with the session | the ruling; the reverify's suggestion |
| `isManifestStopped` reaches `remote-sessions.ts` through `remote-record.ts` (`export { isManifestStopped } from '../manifest/store'`, at its foot beside Phase 118's type re-exports) | Phase 72's rule, held by `__tests__/remote-sessions.test.ts` as an import list: the machine layer reaches the manifest through that one module. A first form imported the store directly and that test went red (1 of 274 in the phase's files) | new, the tree |
| `GmuxCore.createSession`: no code change (D24, D25, D26 stand); its comment corrected | a create whose list stopped before that machine's create returned never reaches the check | the ruling's item 4 |
| `p360-remote-create-answer.test.ts`: R6b's feed error is now `SQLITE_BUSY` (MANIFEST_STOPPED there is D27's case); three cases: RF's shape (the store's own refusal, the same object, through, the row kept, stamps sent, no line of D12 or D13), RN's shape (the list timed out and the machine's verdict write met the stopped store), another error still logged once (`SQLITE_IOERR_WRITE`) | D27 | new |
| `p360-create-stopped.test.ts`: every far fixture row's name and tmux name differ from its id; two cases: the core passes the feed's stopped refusal through untouched, asking the store nothing, and the phone's start answers `failed` there | the reverify's plant P2; D27 | the brief's item 3 |
| `conformance:createanswer` CA3 | the feed start's catch begins with the pass-through, `isManifestStopped` taken from `./remote-record`, which re-exports the store's own; seven ablations; the safe reader proved on ten new fixtures; the control now edits seven files | D27 |
| `probe:p360` | real keystrokes for every typing reading; RFL (launch 7); RF, RN and RFL graded at both builds by ONE grader, the parent's; a quiet window and a typing control before every remote stop arm's press; R7L's window graded as the parent's own race | the brief's item 2 |
| `fixtures/graders.json` 471 → 604 readings | the ten remote stop graders' honest readings RECORDED from the round's final whole run on the final tree (whole4); a broken reading per clause and an unreadable one per need; raw entries through `typedReading` and the run's own app.log readers over this run's recorded captures and app.log lines and the last reverify's recorded HEAD lines for RF and RFL; six `typedReading` checks; 40 earlier entries of the remote graders that the self-test named against their own arm removed (9 broken and 10 unreadable naming a clause or need this round renamed or removed, 21 raw readings recorded before typing was read, which lack `typed.*` and `window.onNew`, or graded by the second round's HEAD-only clauses); a local shell's prompt in the embedded captures cut to `$` (it named the account and the host) | the brief's item 2 |
| `CHECKLIST.md`, `CLAUDE.md` (the createanswer and probe rows), this spec (§1 row 5, D13, D26, D27, §7.1 CA3 and CA5, §8, "His second ruled round") | the words the reverify named, corrected to what is measured | the brief's item 4 |

**Why R7L's window is graded as the parent's race.** With real keys typed into the session in use before the press,
both builds sometimes moved the window to the new session in R7L (a stop at the create's tab write, after that
machine's create returned). The renderer's landing is the same code at both builds: the create answers its session, the
window reads its tabs (`projects.list()`, the last clean list once the store stopped), and it moves to the far tab exactly
when a list read after the far folder's tab was written got in before the stop. Measured this round: the parent stayed
4 of 6 (4 of 5 once the window was let go quiet first), HEAD 4 of 6 (4 of 5 likewise) (every earlier run, with no keys typed first, stayed: 6 of 6). The window was first let go
quiet for 4 s before the press (a need now), which did not settle it. So R7L's clause takes the two places the parent
goes and no third, and asks the keys only of a window that stayed; where it went is printed.

**Why the probe presses Shift before it inserts text.** The final run before this fix read RN at the parent with its
text lost and its Enter kept (the capture showed an empty prompt line). xterm 6.0.0's `_inputEvent` drops inserted text
while it believes a key is still down (`!e.composed || !this._keyDownSeen`), and that note stands when the last key-down
it saw had its key-up land elsewhere: ⌘T's, once the sheet took the focus. A keyboard's next key-down clears it, so the
probe presses and lets go Shift (it sends nothing) after its click and before the text.

#### What the builds answer, measured

**Vitest, at both builds** (the second ruled round's template, `m/template.m2.test.ts`, with two cases added: FL, the
feed's write from a tab on this Mac with the Machine field set, and NT, RN's live shape, the list timing out; stamped per
tree: the REAL `GmuxCore.prototype.createSession`, `createLocalSession`, `remoteCreate`, `remote-record` over a REAL
`ManifestStore`, 357's fault hook, and the REAL `createPocketStart`; 14 of 14 ran at each build):

| Case | The parent | HEAD |
| --- | --- | --- |
| T1 R7L, T2 R7, T3 the tab rule alone: the stop at the tab write after the far create returned | the session | the session |
| F the feed's write, stopped during the stamps, listed back (RF) | `MANIFEST_STOPPED` (`getSession`) | the same (his second ruled round: the session) |
| FL the same from a tab on this Mac (RFL) | `MANIFEST_STOPPED` (`getSession`) | the same |
| NT no list shows it, its list timed out, stopped during the stamps (RN live) | `MANIFEST_STOPPED` (`listSessions`) | the same |
| N no list shows it, its list answered EMPTY, stopped during the stamps (vitest only) | `SPAWN_FAILED`, "…Nothing was changed." (item 6) | `MANIFEST_STOPPED` (D26) |
| N0 no list shows it, the store fine (R6) | `SPAWN_FAILED`, "…Nothing was changed." | the session, `unknown` (D12) |
| C control | the session | the session |
| L1 this Mac, the record write | `MANIFEST_STOPPED` (`updateSession`) | `MANIFEST_STOPPED` (`getSession`) |
| P1 the phone, the tab write | `done` | `done` |
| P2 the phone, the feed's write | `failed` | `failed` (his second ruled round: `done`) |
| P4 the phone, no list shown, stopped during the stamps | `failed` | `failed` |
| P3 the phone, a project on this Mac | `failed` | `failed` |

In every case at every build: one far `new-session`, 4 stamps, no far ending verb, nothing killed, the row kept.

**Live, `probe:p360`, both builds, the parent first, every typing reading real keystrokes** (each run outside the history
block under one lock slot, `P360_KEEP=1`; the remote stop arms over six runs: dev1, before the quiet window; dev2, R7L
and R7 only; whole1 and whole2, before the Shift press; whole3, the final probe; whole4, the final tree, every arm PASS
at both builds):

| Arm | The parent | HEAD |
| --- | --- | --- |
| RF | the stopped sentence, the sheet open, 5 of 5; the window stayed on the session in use, connected, 5 of 5; real keys reached it once the create settled 5 of 5; ONE over there stamped 5 of 5; the second Create started nothing 5 of 5 (dev1 PASS, whole1 PASS, whole2 PASS, whole3 PASS, whole4 PASS) | the stopped sentence, the sheet open, 5 of 5; the window stayed on the session in use, connected, 5 of 5; real keys reached it once the create settled 5 of 5; ONE over there stamped 5 of 5; the second Create started nothing 5 of 5 (dev1 PASS, whole1 PASS, whole2 PASS, whole3 PASS, whole4 PASS) |
| RN | the stopped sentence, the sheet open, 5 of 5; the window stayed on the session in use, connected, 5 of 5; real keys reached it once the create settled 4 of 5; ONE over there stamped 5 of 5; the second Create started nothing 5 of 5 (dev1 PASS, whole1 PASS, whole2 FAIL, whole3 PASS, whole4 PASS) | the stopped sentence, the sheet open, 5 of 5; the window stayed on the session in use, connected, 5 of 5; real keys reached it once the create settled 5 of 5; ONE over there stamped 5 of 5; the second Create started nothing 5 of 5 (dev1 PASS, whole1 PASS, whole2 PASS, whole3 PASS, whole4 PASS) |
| RFL | the stopped sentence, the sheet open, 5 of 5; the window stayed on the session in use, connected, 5 of 5; real keys reached it once the create settled 5 of 5; ONE over there stamped 5 of 5; the second Create started nothing 5 of 5 (dev1 PASS, whole1 PASS, whole2 PASS, whole3 PASS, whole4 PASS) | the stopped sentence, the sheet open, 5 of 5; the window stayed on the session in use, connected, 5 of 5; real keys reached it once the create settled 5 of 5; ONE over there stamped 5 of 5; the second Create started nothing 5 of 5 (dev1 PASS, whole1 PASS, whole2 PASS, whole3 PASS, whole4 PASS) |
| R7L | the sheet closed on the session 6 of 6; the window stayed on the session in use, connected, 4 of 6, on the new session 2 of 6; real keys reached it once the create settled 4 of 4; ONE over there stamped 6 of 6; the second Create started nothing 6 of 6 (dev1 FAIL, dev2 PASS, whole1 FAIL, whole2 PASS, whole3 PASS, whole4 PASS) | the sheet closed on the session 6 of 6; the window stayed on the session in use, connected, 4 of 6, on the new session 2 of 6; real keys reached it once the create settled 4 of 4; ONE over there stamped 6 of 6; the second Create started nothing 6 of 6 (dev1 FAIL, dev2 PASS, whole1 PASS, whole2 PASS, whole3 PASS, whole4 PASS) |
| R7 | the sheet closed on the session 6 of 6; the window stayed on the session in use, connected, 0 of 6, on the new session 6 of 6; no stay to type into; ONE over there stamped 6 of 6; the second Create started nothing 6 of 6 (dev1 PASS, dev2 PASS, whole1 PASS, whole2 PASS, whole3 PASS, whole4 PASS) | the sheet closed on the session 6 of 6; the window stayed on the session in use, connected, 0 of 6, on the new session 6 of 6; no stay to type into; ONE over there stamped 6 of 6; the second Create started nothing 6 of 6 (dev1 PASS, dev2 PASS, whole1 PASS, whole2 PASS, whole3 PASS, whole4 PASS) |

Every remote stop arm at every build in every run: ONE session over there carrying its row's `@gmux-id`, a second Create
starting nothing over there, and no line of D12 or D13 at HEAD.

#### Commands, exit codes and numbers (every number measured today on these trees)

Inside the history block (`sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb`) with `HOME`, `ZDOTDIR`
and `TMPDIR` in the builder's scratch, `HISTFILE=/dev/null`, `SHELL=/bin/sh`, terminal and identity variables unset,
except where marked "outside", which ran the same environment without the block (every probe under one slot of the
shared lock, owner `p360b-builder`, through `lockrun.sh`). The load average read 6 to 325 during the round, his own work.

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `npm run build`, the parent (its `out/` was removed on purpose) | 0 | 72.9 s | its own floor 191 of 191; contract inventory byte for byte |
| `npm run typecheck`, D27's first form | 0 | 11.5 s | 1,457 production files, 8,306 imports, 0 violations; no runtime cycles (5,086 edges) |
| vitest `p360-create-stopped` and `p360-remote-create-answer` | 0 | 2.5 s | 44 of 44 (21 and 23) |
| `conformance:createanswer`, D27's first form | 0 | 3.8 s | 78 of 78 ablations red on exactly their rule (CA3 14), control green |
| `conformance:stoppedlist`, `conformance:farattach` | 0, 0 | 9.9 s, 0.4 s | 16 rules over 1,454 files and 283 ablations; 11 rules |
| `conformance:machines`, `ablation:p326` | 0, 0 | 49.8 s, 15.4 s | PASS; 25 of 25 |
| `npm run build`, HEAD | 0 | 88.4 s | `gate:electron` 192 against the floor of 192; `gate:background` 605 files, 4 start a process and end it in a `finally` |
| the both-builds vitest template, the parent and HEAD | 0, 0 | 2.8 s, 8.4 s | 14 of 14 each (the table above) |
| the builder's vitest ablations in a `cp -Rc` clone (`scripts/ablate-vitest.py`, every file restored by sha256) | | | control 0 of 44 red; D27 removed 2 of 44 red (the RF and RN shapes); D27 unconditional 2 (R6b, another error); D27 asking `err instanceof Error` 2; the row asked by `session.name` (the last reverify's plant P2) 5 (the three listed creates, D26's case, the phone's listed project) |
| `probe:p360` `R7L,R7,RF,RN,RFL`, outside (dev1) | 1 | 420.8 s | 9 PASS, R7L FAIL at BOTH builds: the window moved to the new session once the control keys had been typed just before the press |
| `npm run build`, HEAD | 0 | 89.9 s | 192 of 192 |
| `probe:p360` `R7L,R7`, outside, the window let go quiet first (dev2) | 0 | 221.9 s | 5 PASS |
| `probe:p360` whole, outside (whole1) | 1 | 675.6 s | 20 PASS; R7L@parent FAIL, its window on the new session (the race) |
| `probe:p360` whole, outside, R7L's clause taking both landings (whole2) | 1 | 638.2 s | 20 PASS; RN@parent FAIL on the typing clause, its capture holding an empty prompt line: the inserted text lost and the Enter kept (xterm's stale key-down note), the probe's own |
| `probe:p360` whole, outside, Shift pressed before the text (whole3) | 0 | 623.4 s | 21 PASS, 0 FAIL, 0 UNREADABLE, RUN PASS |
| the fixtures, two passes, and `--grader-self-test` in the clone (from whole3, then again from whole4) | 1, 0 | | first pass 40 FAIL lines each time (earlier entries the new graders cannot judge); final, from whole4, 21 graders, 102 clauses each shown red alone, 125 needs each shown unreadable alone, 353 fields, 151 raw fixtures, 92 reader checks; 604 readings |
| the phase's eight test files (`final-gates.sh`, first pass) | 1 | 12.8 s | `remote-sessions.test.ts` "reaches the manifest through one module and no other" red: D27's first form imported the store directly; the predicate now comes through `remote-record.ts` |
| `npm run typecheck`, final | 0 | 7.5 s | 0 violations; no runtime cycles (5,086 edges) |
| vitest, thirteen files (the phase's, `remote-record`'s and the four that mock `remote-record` with no original) | 0 | 13.7 s | 371 of 371 |
| the builder's vitest ablations again, the final files | | | the same five readings as above |
| the both-builds template again, HEAD | 0 | 2.2 s | 14 of 14, the table unchanged |
| `npm run build`, HEAD, final | 0 | 66.2 s | 192 of 192; 54 machine refusals; contract inventory byte for byte; the bundle holds the pass-through once (`out/main/index.js`) |
| `probe:p360` whole, outside, the final tree (whole4) | 0 | 774.0 s | 21 PASS, 0 FAIL, 0 UNREADABLE, RUN PASS (census held at every launch, no ssh without `-F none`, no real Tailscale, every pid ended, both scratch servers gone) |
| `npm test` | 1 | 107.6 s | 23,527 tests: 23,491 passed, 12 failed, 24 skipped. The 4 `/bin/ps` tests (EPERM in the block: process-table.native, ps.native twice, p269-env-names), which pass outside it with the scratch HOME (10 of 10); and the 8 FSEvents cases (store-watch.native 1, p365-process.native 3, repo-watcher.native 4), which fail alone at both builds (HEAD 9 of 10, the parent 8 of 10, at load 125 to 135); the delta holds no line under `src/main/watcher`, `config` or `fs` |
| `final-gates.sh`, the final tree | 0 each | | typecheck 4.0 s; createanswer 3.1 s (79 of 79, CA3 15, control green); stoppedlist 7.3 s (16 rules, 283 ablations); farattach 0.3 s (11 rules); remoteclose 1.1 s (11 tests); machines 48.6 s (PASS); ablation:p326 11.0 s (25 of 25); pocket 22.2 s (192 rules, 25,984 checks); the probe's self-test 0.1 s (again 0.13 s over the final fixtures, PASS, 151 raw); contract inventory 2.2 s; the phase's eight test files 14.5 s (274 of 274) |
| `assert-electron-teardown`, `assert-background-teardown`, `assert-hermetic-checks` over the final probe file | 0, 0, 0 | | 192 of 192; 605 files; 295 check scripts classified |
| `npm run build`, the final tree, once more after the last comment and fixture edits | 0 | 103.3 s | 192 of 192; contract inventory byte for byte |

#### Still worse than the parent, measured

- Nothing measured is worse. RF, RN and RFL answer as the parent run for run (the stopped sentence, the window kept on
  the session in use, real keys reaching it, ONE session over there, a second Create starting nothing), 5 of 5 at each
  build; R7L and R7 close on the session at both, 6 of 6.
- Two answers differ from the parent's in their words or detail, neither drawn worse: in vitest only, a list that
  answered EMPTY while the store stopped during the stamps (N) has the parent say "…could not find a session called …
  Nothing was changed." and HEAD say "Restart Tortie, then try again" (D26; both failures, the sheet open, the window
  kept; live, RN's list times out instead and both builds say the second); and L1's refusal names `getSession` where the
  parent's named `updateSession`, which no surface draws.
- R7L's window is the parent's own race, the same code at both builds: each stayed 4 of 6 this round and landed on the new
  session 2 of 6 (every earlier run, with no keys typed first, stayed 6 of 6). In R7 both builds land on the new session,
  drawn "Machine unreachable", whose terminal a click does not reach (0 at both), 6 of 6, as before.
- L3: the window settled at 10,335 ms at the parent (the busy error, a second press making a second session) and
  10,421 ms at HEAD (closed on the session, one session), at a load average near 100.

#### His history, the crash reports and the end

- His history, `stat -f '%z %m'` only: `747008 1794929869` and `23166 1790702242` at the builder's start (10:41) and
  before and after every run of this round, the Electron runs included, through the end. It never moved.
- Crash reports, by name and mtime only: 27 at the start and after every Electron run, unchanged by name and mtime.
- The end, once, outside the block: the Electrons by CLAUDE.md's command are his Tortie (94808) and its crashpad handler
  and other apps' crashpad handlers, none of this round's; no process names the builder's scratch or a `gmux-p360`
  socket; no `p360` socket under `/private/tmp/tmux-501/`; all three lock slots free.
- Left for the landing's cleanup: `/private/var/tmp/tortie-wt/scratch/p360/b-builder/` (its `abl/` clone, the kept probe
  run folders under `tmp/`, the reports under `out/`) and the parent's `out/`, built here.

### The probe review, the reverify and the landing (2026-11-17)

**The probe review** (`scratch/p360/b-probereview/`) fixed two defects this round added:
- `conformance:createanswer` CA3 (D27) read green with D27 undone four ways (the feed's statement wrapped in a try that
  swallows, twice; a catch added to the one try that holds the create; that try wrapped in a try that answers a
  session), while the phase's vitest read each red (2 or 9 of 44). The feed's try must now sit in `remoteCreate`'s own
  body with no enclosing try that has a catch; two more ablations: **81 in all, CA3 17** (the third round's 79 and 15
  above are the builder's).
- `probe:p360` read a capture that was never taken as the keys failing (and as a pass for R7L at HEAD).
  `TYPED_AFTER_READ_NEED` makes it UNREADABLE in the R7L, RF, RN and RFL graders at both builds; the fixtures hold
  **654 readings** (604 above).
- Found, not changed: R7L's `window.stayed` and `window.onNew` read the tab's selection, not the session the window
  draws. The "stayed 4 of 6, landed 2 of 6 at each build" above are selections; in what the window drew, the session in
  use stayed.

**The reverify** (`scratch/p360/b-reverify/`) answered **approved**, with three methods of its own: a store-call matrix
in vitest over the real `createSession`, `createLocalSession`, `remoteCreate`, the feed and `createPocketStart` at both
trees (the list made to stop at each store call after the far `new-session`, 55 points over 6 shapes, the phone's start
identical at all 8 latch points); its own live driver, rv4, typing real keys and reading the pane the window draws, over
three stop timings nobody had driven (RE, the far answer held; RL, the create's own list held; R7Y, R7L's race forced to
its landing); and plants outside `remoteCreate`. Every row equal to the parent or better: RF, RFL and RN the stopped
sentence, the sheet open and the session in use taking real keys, 3 of 3, 3 of 3 and 2 of 2 at each build; R7L, R7L1,
R7, RE and RL identical; L3, R5 and R6 one session where the parent makes two; 368's create size identical.

Its findings, and what the landing did:
- (minor) "whenever the list stops before that machine has finished starting the session" promised too much: in RE the
  list stopped while the far answer was held, Phase 117's rescue bound the session first, and both builds closed the
  sheet on it. **Landed**: CHECKLIST.md and D27 name that case.
- (nit) The counts (81, CA3 17, 654 readings): corrected in CLAUDE.md's createanswer row and here.
- (nit) R7L's counts are the tab's selection: stated above; R7Y forced the real landing, equal at both builds (2 of 2).
- (nit, owed, not this phase's) After a create on another machine from a tab on this Mac while the list is stopped,
  when the window leaves the local session in use (R7L1 falls back to the tab's last shell; R7Y lands on the far
  session), that session shows Can't connect until a restart, at the parent and HEAD alike.

