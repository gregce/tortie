# Phase 353 — the same words of 2026-11-02 — sessions and the terminal: eight queued entries in one phase, reviewed together — SPEC

Written by the spec step on 2026-11-05 in `/private/var/tmp/tortie-wt/wt-p353`, a detached worktree at origin/main
`b1a557b8` ("test(ios): freeze phone build 13's wire beside build 12, 11 and launch"), which carries Phase 350
(`01f8e2fb`) and 0.114.0. **`git diff b1a557b8` in the worktree must be exactly Phase 353's delta**, this file
included. origin/main may move while the phase runs; nobody here rebases, pulls or merges. The charter is
`docs/BACKLOG.md` "## Phase 353" (`:44359`) and the eight entries it names, each binding as written with its mechanism,
its proof and its refusals, the tree winning where it disagrees (§0.1): **294** (`:30806`), **295** (`:31072`), **301**
(`:31941`), **302** (`:31997`), **305** (`:32373`), **325** (`:35573`), **328** (`:35991`) and **354** (`:44430`, with
its "Widened 2026-11-04" paragraph). His standing rulings bind: no regression against today; just enough words; Tortie
never ends a session on its own; "needs input" only from the session's behaviour, never from his own input to it (325
is that rule); nothing released, tagged, version-bumped, archived or uploaded; his session count is allowed
(2026-11-02), being `build/electron-run.mjs`'s read-only `list-sessions` of `-L gmux` and nothing else.

| | |
| --- | --- |
| Subject | `fix(sessions): keep records, read status truly, scroll, copy and start where asked` (the section's, widened for 354 as its entry allows) |
| First body line | `Phase 353: sessions and the terminal` |
| Semver | Patch, unreleased, Mac only, released on his word |
| Lane | Build: Spec → Build (FOUR builders, disjoint files) → Integrate → probe review → Verify (three lenses, reviewed together) → [Fix once → Reverify] → Commit |
| Items built | **all eight**: 294, 295, 301, 302, 305, 325, 328, 354. Every one reproduced at this head (§2); none is closed |
| Tier, per item | **3, every item** (each entry sets it; CLAUDE.md's questions answer yes for each) |
| Menus | **No change.** No user-facing surface is added, renamed or removed. `src/main/menu.ts` is edited by nobody; its sha256 at this head is read by the integrator at the start and must read the same at the end |
| Contract | **No change.** No channel, schema, `gmux.*` key, `GMUX_*` name or smoke mode. `RestartOutcome` does not cross the bridge (`sessions:restart` returns `outcome.session`, `src/main/restart/ipc.ts:17-21`); the recovery contract's new field rides a JSON column the codec passes through (`src/main/manifest/contract.ts:16-28`); `#{history_limit}` stays on main's side (D294-2). `docs/audits/contract-baseline.txt` does not move |
| `HELPER_USER_FLOOR` | **180 → 183**: three new probes reach `build/electron-run.mjs` (D-P1). `OPERATOR_ARGV_CEILING` **98 → 94**: four committed probes lose their own `-L gmux` count (D-P2) |
| CHANGELOG | Seven items under `## Unreleased`, `### Fixed` (§5): 294, 295, 302, 305, 325, 328, 354. None for 301 (its entry: nothing a person sees moves) |

## 0. The hard rules, stated once (every builder, the integrator, every verifier, the fixer and the reverifier)

- NEVER commit, stage or stash. `/Users/gdc/gmux` is read only. Never touch another phase's worktree.
- Scratch lives under `/private/var/tmp/tortie-wt/scratch/p353/<role>/`, never under `/private/tmp`, which macOS cleans.
  A probe's `TMPDIR` points there too (the harness run folder is `${TMPDIR}/<socket>`), and so does every scratch
  tmux server's `TMUX_TMPDIR` (so its socket file is under the scratch, not `/private/tmp/tmux-501/`).
- **`-L gmux` is named only by `build/electron-run.mjs`'s census, and only with `list-sessions`.** No command, script or
  verb of yours aims at it, ever. **Four committed probes this phase runs count `-L gmux` THEMSELVES at this head**:
  `build/probe-p167-scale.mjs` (`:794-799`, `:2372-2378`), `build/probe-p209-selection.mjs`, `build/probe-p95-scroll.mjs`
  and `build/p284/probe-p284.mjs`. Run them only once this phase has converted them (D-P2). A parent measurement of one
  runs a scratch copy made by the recipe of `/private/var/tmp/tortie-wt/scratch/p353/spec/m301/make-p167-copy.mjs` (its
  own count removed, `tmuxSocket` named, every probed agent hidden and `agents:list` read back, each edit asserted). A
  census finding naming a session your run did not make is his own activity: note it and run that probe once more. A
  session of your run's making on `-L gmux` is a major problem: stop and report.
- **No real agent runs, not even for a version.** Every app run hides every probed registry row but its stand-ins
  (`writeHiddenAgents(profile, prefix, hiddenAgentsBesides(standIns))` from `build/hidden-agents.mjs`) and reads the
  app's own `agents:list` back (`AGENTS_LIST_EXPR`, `standInsOnlyVerdict(list, { standIns })`), a run whose answer is
  not ok being UNREADABLE. **No committed probe this phase runs hides an agent at this head** (`probe:p292`,
  `probe:p167`, `probe:p209`, `probe:p95`, `probe:p284`, `probe:p321`: 0 of 6, measured): each is converted before it
  runs (D-P2). `conformance:resume:capture`, which starts real agents to their first screen, is the main session's at
  landing; run its self-tests only.
- Never read his keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.claude.json`, `~/.codex`, any agent's or
  conversation store, his shell history's contents, or his live Tortie profile (manifest included). **This refuses two
  entries' real-data arms** (302's and 305's `SELECT … FROM sessions` over a copy of his manifest, §0.1). Real data means
  committed fixtures and recordings: `build/fixtures/questions/` (18 recordings, 1,238 screens, and `labels.json`), research 63's
  `docs/research/assets/63-fixtures/`.
- His shell history is never written by us: every command that does not launch an Electron or sshd runs under
  `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb` with a scratch `HOME` and `ZDOTDIR`,
  `HISTFILE=/dev/null` and `TERM_SESSION_ID` unset (the spec step's wrapper is
  `/private/var/tmp/tortie-wt/scratch/p353/spec/sb.sh`; copy it for your role). `/bin/ps` will not start under it, so the
  four native tests that start `/bin/ps` fail inside it by design: name each, never run them outside it. Record only
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before and after every run that starts a shell, the app, an agent or
  sshd. A move across a blocked command is his; a move across an unblocked run means start nothing for 3 minutes and stat
  again; moved again is his, still means STOP and report.
- Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids you started, after confirming them. Every
  process you start ends in a `finally`, a load generator above all (bounded by a hard deadline, killed by pid in a
  `finally`, counted at the end). Never signal a probe while its own teardown runs. Every Electron goes through
  `build/electron-run.mjs` inside `build/harness-socket.mjs` with a scratch profile, `HOME` and socket. No Simulator;
  nothing under `ios/` moves. No real Tailscale, DNS, APNs or ssh to a real host: another machine is the loopback machine
  of `build/with-scratch-machine.mjs` with `SCRATCH_MACHINE_QUIET_SHELL=1`, its far tmux 3.6a or 3.7b; never
  `smoke:remote` or `smoke:machines`.
- Never import a `build/` script to inspect it; read it as text. Importing `build/electron-run.mjs` and
  `build/hidden-agents.mjs` to USE them is how a probe launches.
- The lock has three slots: `zsh /private/tmp/tortie-ops/lock.sh try p353 <role>` prints the slot or exits 1 (retry every
  60 s in a NEW command); release with `zsh /private/tmp/tortie-ops/lock.sh release <slot>` from a `trap`. Every probe,
  app run, package build and timing measurement holds one. `df -h /` before any build; under 8 GB free, wait and report.
  npm runs with `npm_config_update_notifier=false`.

## 0.1 What the entries got wrong at this tree (the tree wins; each correction is binding on the builders)

**294** (the lines printed while you read are skipped on the way back down)
1. **It reproduces exactly** (§2.1, M294): parked 100 back at 20 lines a second and left 4 s, the way down on 3.7b put
   **72 of 120 lines printed since the park never on screen** (423 to 494) in 34 notches and 1.9 s; 3.6a **79 of 128**
   (423 to 501). The entry's option A, modelled on 3.7b with the entry's own decision clauses, put **0** off screen, in
   99 notches and 8 re-freezes over 6.5 s.
2. **"Remote sessions have no scrollback today and gain none" is no longer true of the tree.** Since Phases 320 and
   320.1 a session on another machine scrolls through the same `scrollPaneBy` over an ORDERED runner
   (`src/main/tmux/scroll.ts:691-716`, pipelined), read with `REMOTE_STATE_FORMAT` (`:217`), whose commands
   `conformance:machines` admits from a CLOSED table (`src/main/machines/scroll-shapes.ts`). The refusal now reads:
   nothing moves for a runner that is `ordered` or names a `server`; `refresh-from-pane` is never sent over a machine's
   control connection and is not added to the closed table; `REMOTE_STATE_FORMAT` is byte for byte.
3. **`#{history_limit}` cannot be appended to `STATE_FIELDS`** (`:164-175`): that array is shared by `STATE_FORMAT`
   (`:185`) and `REMOTE_STATE_FORMAT`, and the remote reader refuses any answer that is not exactly eight fields
   (`parseRemoteState`, `:288`). It is appended to the LOCAL format only (D294-2).
4. Citations moved: the serial toward-live branch is `scroll.ts:721-737`; `scrollFrom` `:637-664` with its early return
   at `:644`; `parseState` `:232-236`; `cursorToTopRow` `:579-586`; `exitPaneScroll` `:839-852`; the header's item 3
   `:25-32`; `isDiscarding` is still `src/main/scrollback/watch.ts:86-89`; `noteEntry` is `surface.ts:1271`;
   `positionAt` is `TerminalScrollbar.tsx:98-118`; `distanceFromLive` `live-distance.ts:101`, `positionForDistance`
   `:122`.
5. The entry's real-data row (a real `claude` and `codex` asked for a long answer) is refused by this phase's rule that
   no real agent runs; it is replaced by an agent-shaped fixture on a scratch server (a prompt area redrawn at the
   bottom of the normal screen), and the limit is stated.
6. `probe:p292` hides no agent at this head; it is converted before arm h runs (D-P2).

**295** (a history copy on a busy pane can come out one line off)
1. **It reproduces exactly** (§2.2, M295): the two-call pair was off **8 of 300, 58 of 300 and 200 of 200** at 10, 80
   and 700 lines a second on 3.7b (by up to 4) and **9, 106 and 200 of 200** on 3.6a (by up to 6); one invocation with
   tmux computing the offsets was off **0** in every cell, at a median 2.1 to 3.3 ms against 4.3 to 7.2 ms.
2. **The clamp is no longer inline.** Phase 320.1 extracted it as `clampHistoryRange` (`src/main/tmux/scroll.ts:873-885`),
   shared with a machine's copy; it stays byte for byte, and the local path applies it AFTER the call to the extent the
   same invocation printed (D295-3).
3. **A copy from a session on another machine now exists** (`readRemoteHistoryRange`,
   `src/main/machines/remote-pane-history.ts:178-214`) and it has the same two-call shape over two far round trips. The
   entry refuses sessions on another machine; it is found, not this phase's, and owed an entry (§13).
4. The new function is not placed in `src/main/tmux/sessions.ts`, which 354 edits: it is `src/main/tmux/history-lines.ts`
   (new), and the deletion of `readPaneExtent` and `capturePane`'s `range` arm in `sessions.ts` and the barrel is the
   INTEGRATOR's seam (§9.2 S3).
5. "The ruling is his, and the build does not start before it": his word of 2026-11-02 put 295 into this phase as
   written, and the entry recommends option 1; option 1 is built, and Q3 says so to him.

**301** (the app keeps the drawing surfaces of sessions that have ended)
1. The dependency is where the entry read it (xterm 6.0.0, `@xterm/addon-webgl` 0.19.0, monaco-editor 0.56.0): the
   bundle `node_modules/@xterm/addon-webgl/lib/addon-webgl.mjs` still holds `_doWarmUp(){let e=new wn;for(let
   t=33;t<126;t++)e.enqueue(…)` with the queue a local, `dispose(){this._tmpCanvas.remove();for(let e of
   this.pages)e.canvas.remove();this._onAddTextureAtlasCanvas.dispose()}` touching no queue, and the idle queue's
   `_requestCallback(e){return requestIdleCallback(e)}` with no timeout. Read, at this head.
2. **It reproduces only when the renderer gets no idle time, exactly as the entry's mechanism says** (§2.3, M301).
   Profile d alone at this head read **0, 0, 0** detached elements at full speed (load 5 to 9), at 1/8 CPU, and with the
   renderer starved from the end of each block's cycles through its census; it read **`canvas x34`** after a block whose
   WHOLE life was starved (two overlapping chains of 40 ms tasks), with the renderer's footprint up from 83.6 to
   113.6 MB, the 30 MB of the entry's arithmetic; starved for whole blocks with MESSAGE tasks it read **`canvas x36`
   after block 1 and `canvas x72` after block 2** (36 a block of 12 ended sessions, three canvases each), the renderer at
   110.1 then 133.6 MB, and the arm that ran after the starve's deadline read 0 detached: the atlases go the moment the
   renderer is idle again, which is the entry's account of the intermittency. A starve made of `setTimeout(…, 0)` alone
   leaves the browser's 4 ms timer clamp between tasks, which is idle time enough for the 93-task warm-up to drain; the
   starving arm (D301-4) therefore uses message tasks (`MessageChannel`), which have no clamp, for the block's whole life.
3. Citations moved: `TerminalPane.tsx`'s teardown is `:608-639`, the WebGL dispose `:628`, `term.dispose()` `:632`;
   `shippedRendererFixes()` is `build/probe-p167-scale.mjs:1321-1344`. The parent for this phase is `b1a557b8` (entry:
   `50bd2561`).
4. `probe:p167` counts `-L gmux` itself (`:794-799`, `:2372-2378`), passes `tmuxSocket: null` on its main launch
   (`:1842`) and hides no agent; it is converted (D-P2) before any arm of this phase runs.

**302** (a session ended and then removed can lose its tombstone)
1. **It reproduces at the code** (§2.4, M302): over a real store read back through a second handle, BOTH writers the
   entry names wrote `exited` over a tombstone with `removed_at` kept, so the row left Past for the managed list:
   `killSessionAdmitted` for an `exited` or `restorable` row with a live binding when the Remove landed inside its
   awaits (4 of 5 intervals each); `reapDeadSession` for a `restorable` row with a live binding (4 of 5), and for a reap
   entered on a row ALREADY tombstoned, with no binding and no await at all. No cell produced `restorable` over a
   tombstone, which keeps the entry's census right; every Remove of a `running`, `idle`, `needs_input` or `unknown` row
   was refused, which keeps its account of `removeRefusal` right.
2. **The reap needs no await to do it.** The monitor reads its sessions before its awaits and reports a dead pane after
   them (`pairWithPanes`, `src/main/activity/monitor.ts:1102-1112`, which calls `onDead` then `forget`), so a Remove that
   lands during a tick reaches `reapDeadSession` with the row already tombstoned, and the reap's only guard,
   `rec.status === 'exited'` (`core.ts:2684`), lets it through.
3. Citations moved: `reapDeadSession` `src/main/sessions/core.ts:2678-2753` (guard `:2684`, awaits `:2694`, `:2704`,
   write `:2718`, broadcast `:2752`); `killSessionAdmitted` `:3433-3575` (gate `:3448`, capture `:3534-3551`, tree
   `:3555`, kill `:3556`, write `:3560`); `removeSession` `:3687-3749` (gate `:3736`, tombstone `:3747`); `listSessions`
   `:3205`; `listRemovedSessions` `:3325`; `updateSession` `src/main/manifest/sessions-repository.ts:326-456`
   (`clearRemovedAt` `:408-410`, the UPDATE `:412-454`); `markSessionRemoved` `:651`; `pruneDiscardedSessions`
   `:1032-1042`; `setRestoreResult` `:1082-1101`; `DISCARDED_RETENTION_MS` `:51`.
4. **The census's numbers moved**: under `src/main` outside tests there are **10** `UPDATE sessions` statements, nine in
   `sessions-repository.ts` (`:414`, `:570`, `:655`, `:689`, `:704`, `:739`, `:812`, `:880`, `:937`) and the migration at
   `schema.ts:385` (entry: 8); **20** call sites of `updateSession` or `updateSessionDurably` beneath **4** declarations
   (`sessions-repository.ts:172`, `:326`, `reconciliation.ts:133`, `store.ts:400`), which matches.
5. **The real-data arm is refused** (a copy of his live manifest). Whether this has ever happened to him is not known,
   so no one-off heal is built (D302-6, Q5).

**305** (a Restart can hard-delete the record of a session the person removed)
1. **It reproduces exactly** (§2.4, M305): with the real `restartSession` over a fake host whose create waits 120 ms,
   a Remove (the real body, a real tombstone) landing 0, 1, 5, 25 or 100 ms into the create was accepted for `exited` and
   `restorable` rows and the row ended GONE, **10 of 10**; for `running` and `unknown` the Remove was refused, as the
   entry says.
2. `restart.ts` is unchanged (222 lines; read `:121`, refusal `:137`, create `:182`, liveness `:188`, kill `:191`,
   swallow `:193-200`, delete `:204`, broadcast `:205`). `RestartOutcome` stays inside main (`src/main/restart/ipc.ts`
   returns `outcome.session`), so a new field moves no contract line.
3. The real-data arm is refused. `HELPER_USER_FLOOR` is 180 at this head (entry: 153).
4. The entry's `probe:p305` is folded into ONE records probe with 302's arm (D-P1).

**325** (Tortie reads his own words as the agent's question)
1. **It reproduces** (§2.5, M325): through the SHIPPING verdict and the registry's own profiles, `1. to cancel` and
   `2. x` typed into antigravity's `>` row and gemini's `>` row read `needs_input` in **10 of 10** tick phases at 1 s and
   at 2 s, 4 s and 6 s after his keys. Cursor's `→ Add a follow-up` row did not (0 of 10): `→` is not in `OPT1`'s
   prefix set (`src/main/activity/screen.ts:74`), so his words there need a line of their own to form one.
2. **The tap already exists.** Phase 318 added `onInput?: (sessionId: string) => void` (`src/main/attach/attach-host.ts:190`),
   called once, after `client.pty.write(data)` (`:328`), for a local client and never for a pane report (`:331-333`),
   wired in `core.ts:1189-1190` to `replyTurns.bump(sessionId, 'desk')` and pinned by `conformance:pocket` Y17 and Y13.
   Its own comment (`:186-188`) says 325 shares it, filter included. 325's tap is that call carrying COUNTS (D325-2).
3. **The banked corpus is gone.** No `antigravity.bytes.jsonl` exists under `/private/tmp` or `/private/var/tmp`
   (searched to depth 7); `build/p321/corpus.mjs` refuses without `P321_CORPUS`. So the replay arms run over the
   committed windows (`build/fixtures/questions/`, with `labels.json`'s question times), the live confirmation on
   installed agents is refused by this phase's rules, and the real gaps of mechanism item (d) (key to next question, key
   to echo) cannot be computed: the same-instant delays are the entry's own list (0.1, 0.5, 1, 2, 3 and 5 s).
4. **Item 7 is EARNED** (§2.5, M325-7): a restored gemini session whose replayed snapshot ends on its committed trust
   gate (`a-gemini-0002`) with a shell prompt and the armed resume under it reads `needs_input` in **10 of 10** phases at
   1 s and 2 s, 4 to 5 s after the replay; cursor's and qwen's committed questions did not. So Tortie's own replay is
   attributed (D325-8). Phase 141's resume in place types a command line, which cannot satisfy `OPT1` and `OPT2`
   (each needs a row that starts with `1.` and `2.`), so it is not attributed and the proof says so.
5. **The hash constraint is settled by hashing what the verdict already holds**: `hashScreen(screen)`, which
   `inferredVerdict` computes at `state-machine.ts:360` for the screen memory. No second reader of the matched rows is
   added and `conformance:choices` does not move (D325-5).
6. Citations moved: `inferredVerdict` `state-machine.ts:327-420` (numbered `:366`, shaped `:367-370`, dialog `:371`,
   strong evidence `:376-385`, dialog arm `:393-400`, screen hash `:405-408`, idle `:415-418`); `SessionState` `:76`,
   `freshState` `:208`; `noteAgentLeft` `:1124`; `noteReturn` `:1175`; `noteUserInput` `monitor.ts:535-541`,
   `noteGeometryChange` `:552-556`, `ensureState` `:481`, `forget` `:455`; the renderer's gate is
   `src/renderer/state/sessions-slice.ts:1715`; `typeIntoPane` `src/main/restore/restore.ts:310-319`, its callers
   `:1162` (the replay, Enter), `:1219` (the drift notice, Enter), `:1230` (the armed resume, no Enter) and
   `src/main/sessions/resume-in-place.ts:1215`.
7. The entry's `probe:p325` is folded into ONE status probe with 328's arms (D-P1). `HELPER_USER_FLOOR` is 180.

**328** (antigravity reads "running" at rest)
1. **It reproduces exactly** (§2.5, M328): antigravity's committed resting screen, unchanged, tmux's whole-second stamp
   moved by a write every 2.015 s, no CPU and no child, through the SHIPPING verdict: **325 of 325 ticks `running` at 1 s
   in all 10 phases**, 0 turn boundaries; at 2 s **98 to 163 of 162-163** by phase with 0 to 2 spurious boundaries (the
   entry: 324-325 of 324-325; 76 to 156 of 162-163).
2. **The corpus is gone** (as 325 item 3), so `build/p328/timeline.mjs --make` cannot read the recording. The committed
   timeline is REBUILT (D328-1) from the numbers the entry itself recorded (the 2.015 s period from +270 s, the stamp
   steps of 2 and 3 s, the trust answer +40.07, the prompt +65.38, the two answers +88.55 and +241.99, the tool's `Ss+`
   samples +89.16 to +178.28, the CPU quantiles) and `labels.json`'s committed antigravity question times (drawn 7.74,
   72.42 and 180.53 s; answered 39.32, 87.81 and 241.24 s), every field labelled as rebuilt. The screens are the
   committed `a-antigravity.jsonl` ids. Q6.
3. Citations moved: antigravity's row `src/main/agents/registry.ts:1310`, its `activity` `:1386` (entry `:1034`,
   `:1110`); `AgentActivityProfile` `:327-365` (`animatesWhenIdle` `:339`, `dialogs` `:364`); `SHELL_ACTIVITY` `:2485`;
   `DEFAULT_ACTIVITY` `:2492`; `activityProfileFor` `:2504`; `worthProbing` `state-machine.ts:245-255`; `commitVerdict`
   `:796-811` (`lastWorkingAt` `:801`); `hasToolChild` `src/main/activity/process.ts:135`, `descendants` `:109`,
   `CPU_BUSY_PERCENT` `:37`. `p321-masking.test.ts`'s copies: `worthProbing` `:203`, the output predicate `:215`, the
   filter `:675`; `p321-shapes.test.ts`'s allowed set `:607`; `build/conformance-agents.mjs`'s `P321_FIELDS` `:1916`,
   driven refusals `:2074-2080`, floor rows `:2238`.
4. The entry's `probe:p328` is folded into the status probe (D-P1).

**354** (a session whose folder holds a `#`, or ends in `\;`, starts somewhere else)
1. **His example is not one.** `~/code/C#/app` starts in its folder at the parent on both versions and both
   configurations: tmux reads a `#` only before `{ ( # , }`, before one of `D F H I P S T W h`, or last (3.7b only).
   The folders that start elsewhere are those, and those ending in `;` or `\;` (§2.6, M354: 30 of 45 names).
2. **"`#` doubled" is not exact.** tmux copies a run of `#` that is followed by `[` VERBATIM, as a style
   (`format.c:5711-5731` in the vendored 3.7b source, `build/vendor/tmux/cache/tmux-3.7b.tar.gz`), so doubling every
   `#` turned `x#[y`, `x#[y]z`, `x##[y`, `x###[y` and `a#[b#Sc]d` from starting in their folder into starting in HOME:
   **20 of 180 cells**. The exact rule is every `#` doubled EXCEPT a run of `#` immediately followed by `[`, then the
   final `;` escaped: **0 of 180** (D354-1). A `#` in an `-e` value or an argv element is not read at all (measured), so
   those get the final-`;` escape alone.
3. **A folder ending in `;` cannot be created at all**, at the parent, on every configuration (`unknown command: -e`);
   one ending in `\;` or `\\;`, and a link whose own name ends in `\;`, start in HOME. `-e NAME=val;` fails the create
   too, and a launch flag `flag;` followed by `display-message -p P353-INJECTED` RAN that command on the server on both
   versions, the pane receiving only `flag` (M354e).
4. **A folder can run a command.** `j#(echo p353job >> p353-jobs.log)` started a tmux JOB that wrote its line on both
   versions when the asking client stayed alive for 2 s (M354c). With an `execFile` client that exits at once, which is
   how `spawnTmux` asks, the job wrote nothing in 8 creates: the client's jobs are freed with it. That is a race and not a
   guarantee, and the escape removes the job. Phase 350's reverify read the second case only.
5. **Two of nine versions here.** `TESTED_REMOTE_TMUX_VERSIONS` holds 3.2a, 3.3a, 3.4, 3.5a, 3.6, 3.6a, 3.6b, 3.7b
   and 3.7c (`src/main/tmux/version.ts:214`). This Mac holds Homebrew's 3.6a and the vendored 3.7b only; the other
   builds need a network fetch (`build/build-tmux-version.mjs`), which this phase's rules do not allow. Phase 349's M1
   measured the same format expander and the same argument reader on all nine for NAMES (`build/p349/SPEC.md` §2.1):
   every version reads the same `#` set, only 3.7b and 3.7c drop a final `#`, and the final-`;` escape kept every value
   on every version, 3.2a included. That is the evidence for the seven; Q7.
6. **Phase 349's rule to reuse** is `remoteStampArgs` (`src/main/machines/remote-stamps.ts:55-63`): a value's final `;`
   sent as a backslash then `;`. It moves into the one helper both points use (D354-2).
7. **No conversation is lost needs a marker.** Nothing on a row says whether its pane really started in its folder, and a
   restore that moves a pi row recorded before the fix into the folder its conversation was not filed under opens an
   EMPTY session that looks resumed (the registry's own measured note for pi, `registry.ts:1652`). The recovery
   contract, which every local and remote row carries and older builds pass through, gains one field (D354-4).
8. The remote create's far env slot (`REMOTE_ENV_SLOT`, `remote-sessions.ts:940`) is replaced by `-e NAME=value` pairs
   the FAR login shell composes from far values (`src/main/machines/remote-env-carriage.ts`); a far value ending in `;`
   would end that create. It is not one of the two points the entry names; found, owed an entry (§13).
9. Citations: `createSession` `src/main/tmux/sessions.ts:152-197` (`-c` `:175`, `-e` `:176-178`, argv `:179-184`);
   `remoteCreateArgs` `src/main/machines/remote-sessions.ts:878-946` (`-c` `:910-912`, `-e` `:941-943`, argv `:944`),
   called by `remoteCreate` (`:1868-1874`) and the far restore (`remote-restore.ts:541-553`, `cwd: record.cwd`); the
   local restore's create `src/main/restore/restore.ts:1083-1094`; `bareNameSpawnFile`'s guard
   `src/main/agents/detection.ts:684` (doc `:652-681`); `buildRecoveryContract` `src/main/manifest/agents.ts:556`,
   `AgentRecoveryContract` `:465`; the remote contract `src/main/machines/remote-record.ts:408-433`.

## 1. The answer first

| Item | Verdict | One line |
| --- | --- | --- |
| **302** | **build** (Tier 3, builder `records`) | One clause in `updateSession` keeps a removed row's status whatever a patch says (the rest of the patch is written, one log line), and the two writers that wrote `exited` over a tombstone in the sweep re-read the row immediately before their writes. Reproduced (§2.4) |
| **305** | **build** (Tier 3, `records`) | Restart reads its row again after the create and never deletes a row that carries a removal date; the replacement stands. A kill that failed and a row already gone are not deleted either. Reproduced 10 of 10 (§2.4) |
| **325** | **build** (Tier 3, `status`) | The attach host's existing input tap carries COUNTS of what he typed; a dialog first read while his words are arriving is his and stays grey until the screen changes; a snapshot Tortie replays at a restore is attributed the same way. The numbered verdict's line, the shapes and every constant stay. Reproduced (§2.5) |
| **328** | **build** (Tier 3, `status`) | Two compiled fields on antigravity's row alone: its output stops reading as work while keeping every other job it has, and a tool on a terminal of its own reads as work. Reproduced (§2.5) |
| **294** | **build** (Tier 3, `terminal`) | Option A on this Mac's runner only: before a wheel notch, ⇧PageDown or edge scroll that reaches the frozen frame's bottom, a guarded `refresh-from-pane` re-freezes the view in place on 3.7b, so the way down passes through what printed. Reproduced: 72 and 79 lines never on screen (§2.1) |
| **295** | **build** (Tier 3, `terminal`) | One tmux invocation reads the extent and captures the range with tmux computing the offsets; the clamp that needs the extent reads the same invocation's answer. Reproduced: up to 200 of 200 off (§2.2) |
| **301** | **build** (Tier 3, `terminal`) | The WebGL atlas's warm-up queue becomes a field its `dispose` clears (a third hunk in the existing patch), and the pane blurs before it is disposed. Reproduced only as the entry's mechanism says: quiet, throttled and census-starved runs read 0, a block starved for its whole life read `canvas x34`, and with message tasks `canvas x36` then `x72`, 36 a block, the renderer up 43 then 67 MB (§2.3); the deterministic clause and the starving arm carry the proof |
| **354** | **build** (Tier 3, `starts`) | One helper holds back what tmux reads in each argument a create hands it, at both points (this Mac and the remote create): every `#` doubled but a run before `[` in the folder, and a final `;` escaped in the folder, each `-e` pair and every argv element. A row created before the fix restores exactly as today. Phase 350's two terms go. 0 of 180 cells wrong (§2.6) |

### 1.1 The decisions, each with its reason

| Id | Item | Decision | Reason (where it comes from) |
| --- | --- | --- | --- |
| D-P1 | all | ONE app-run probe per builder that needs one: `build/p353/probe-records.mjs` (302's arm 2 and 305's arm, `probe:p353:records`), `build/p353/probe-status.mjs` (325's arms a-e and 328's arms a-e, `probe:p353:status`), `build/p353/probe-starts.mjs` (354's matrix, `probe:p353:starts`). 294 and 295 ride `probe:p292`'s arm h; 301 rides `probe:p167`. `HELPER_USER_FLOOR` 180 → 183 | New. CLAUDE.md's rule 1 ("one app run per phase, not one per claim"); the entries' `probe:p302`, `probe:p305`, `probe:p325` and `probe:p328` become arm groups of their builder's probe, each arm keeping its entry's name and grading |
| D-P2 | all | The committed probes this phase runs are converted by p352's D18 recipe before they run: `build/p292/probe-p292.mjs` (hides every probed agent, reads `agents:list` back; it names a socket already); `build/probe-p167-scale.mjs`, `build/probe-p209-selection.mjs`, `build/probe-p95-scroll.mjs`, `build/p284/probe-p284.mjs` (each loses its own `-L gmux` count and the finding it raises, names `tmuxSocket: socket` on its launch unless it reads its scratch server after `withElectron` returns, hides every probed agent and reads `agents:list` back). `OPERATOR_ARGV_CEILING` 98 → 94 | §0 (the census is the only reader of `-L gmux`; no real agent runs), measured: 4 of the 6 count `-L gmux`, 0 of 6 hide an agent. The recipe is `/private/var/tmp/tortie-wt/scratch/p353/spec/m301/make-p167-copy.mjs`, proved by M301 (`agents ok: nothing resolved`) |
| D294-1 | 294 | Option A, on THIS MAC's runner only (`run.ordered !== true && run.server === undefined`); every ordered or server-naming sequence byte for byte | Entry (A recommended); §0.1 294 item 2 (remote gains nothing) |
| D294-2 | 294 | `#{history_limit}` appended LAST to the local format only: `STATE_FORMAT = [...STATE_FIELDS, '#{history_limit}'].join('\t')`; `REMOTE_STATE_FORMAT` and `STATE_FIELDS` byte for byte. The ninth field is read by the local parser into a value the decision alone reads; `PaneScrollState` and the IPC answer do not change | Entry ("appended LAST … stays on the main side"); §0.1 294 item 3 |
| D294-3 | 294 | One pure decision `refreezeWanted(state, historyLimit, n)` beside `parseState`, true only when ALL of: in copy mode; `frameHistory !== null`; `!innerAlt`; `history > frameHistory`; `!isDiscarding(history, historyLimit)`; the notch reaches the frame's bottom (`position <= Math.abs(n)`). `isDiscarding` is imported from `src/main/scrollback/watch.ts`, moved to a leaf only if `assert-import-boundaries` or `assert-no-runtime-cycles` refuses the import | Entry mechanism 1 |
| D294-4 | 294 | The serial toward-live branch (`scroll.ts:721-737`) reads first; when the decision says so it sends `send-keys -t T -X refresh-from-pane`, then today's `scroll-down`, then `top-line`; otherwise today's bytes exactly. `-e` stays | Entry mechanism 2 |
| D294-5 | 294 | The drag's band: `scrollFrom` re-freezes under the same decision before its early return (`:644`) when the drag asks position 1 while the frame lags, then seeks to the asked position plus the frame's own growth across the re-freeze (`frameHistory` after minus before); `positionAt` (`TerminalScrollbar.tsx:98-118`) re-sends the held pointer once when a mid-drag answer carries a different `frameHistory`. No contract field (the answer already carries `frameHistory`); if one turns out to be needed the drag leaves as its own entry and the wheel lands alone | Entry mechanism 3 |
| D294-6 | 294 | 3.6a keeps today's jump (its `frameHistory` is null, so the decision is false). The wheel to live now takes as many extra lines as printed. Both are his rulings, built on the entry's defaults | Entry ("The operator's two rulings"); Q1, Q2 |
| D294-7 | 294 | The header's item 3 says which bottom `-e` leaves at (the frozen frame's); `scrollPaneTo`'s account says the re-freeze is the reader's own gesture, guarded, quoting row 0 going from line 923 to line 101 | Entry mechanism 5 |
| D295-1 | 295 | Option 1: one invocation, tmux computing the offsets | Entry (recommended; measured exact); §0.1 295 item 5, Q3 |
| D295-2 | 295 | `captureHistoryLines(target, start, end, join, run = execTmux)` in a NEW `src/main/tmux/history-lines.ts`: refuses a `start` or `end` that is not `Number.isSafeInteger` before composing; ONE call `display-message -p -t T -F '#{history_size}\t#{pane_height}' ';' capture-pane -p -e [-J] -t T -S '#{e\|-:<start>,#{history_size}}' -E '#{e\|-:<end>,#{history_size}}'`; answers `{ history, rows, ansi }`, split at the first newline. The runner takes the `TmuxScrollRunner` shape so the integration test drives the shipped argv | Entry mechanism 1; §0.1 295 item 4 (file placement) |
| D295-3 | 295 | `captureHistoryRange` (`service.ts:176-189`): before the call, the two clamps that need no extent (start floored at 0; an end below the start answers nothing with no call); after it, `clampHistoryRange(range, <the printed extent>)` decides, and a `paneRange` of null answers `''`, discarding what tmux printed (the last row, or the live screen past 32,767); `firstLine` keeps its meaning | Entry mechanism 2; §0.1 295 item 2 |
| D295-4 | 295 | `readPaneExtent`, `PaneExtent`, `capturePane`'s `range` option and arm, and their barrel exports are deleted (`sessions.ts:278-286`, `:313-317`, `:333-361`; `index.ts:220`, `:226`) by the INTEGRATOR after both builders return (§9.2 S3); the last-N arm byte for byte | Entry mechanism 1; §0.1 295 item 4 |
| D295-5 | 295 | Comments that describe two calls are corrected: `drag-select.ts:91-98`, `service.ts:165-175`, the header of `history-range.test.ts` (`sessions.ts`'s goes with the deletion) | Entry mechanism 3 |
| D301-1 | 301 | A third hunk in `patches/@xterm+addon-webgl+0.19.0.patch`: in `_doWarmUp` the queue becomes `this._warmUpQueue` (a second warm-up, if the source shows one can run, clears the first before replacing it), and `dispose()` clears it before removing the canvases. The two existing hunks byte for byte; applied by `node build/apply-patches.mjs` in the same shape | Entry ("The one line that has to change"); refusal: no version move, no timeout |
| D301-2 | 301 | `term.blur()` immediately before `term.dispose()` (`TerminalPane.tsx:632`) | Entry (the bounded second holder); its keyboard check is in the proof |
| D301-3 | 301 | `shippedRendererFixes()` gains a third owner: the cleared queue as a literal of `out/renderer/assets/*.js`, red when the hunk is reverted and the renderer rebuilt | Entry proof (1) |
| D301-4 | 301 | A `probe:p167` arm that STARVES the renderer's idle time for each block's WHOLE life, from before its first cycle through its census, with back-to-back MESSAGE tasks (`MessageChannel`, no timer clamp), bounded by a deadline on the page, and asserts the census returns to its floor; red at the parent (`canvas x36` then `canvas x72` measured with message tasks, §2.3) | Entry proof (2); §0.1 301 item 2; M301 (a `setTimeout` starve or a census-only starve reads green at the parent) |
| D301-5 | 301 | Before writing the hunk, the research step confirms on a starved parent run that `removeTerminalFromCache` ran for the held atlases (the snapshot's chain runs through `_tasks`, not `ownedBy`); if it did not, the builder STOPS and reports, because the owner then moves | Entry ("The bound on the fix") |
| D302-1 | 302 | ONE clause in `updateSession` (`sessions-repository.ts:326-456`), after the merge and after `clearRemovedAt` (`:408-410`): when `merged.removedAt !== undefined` and `patch.status !== undefined` and `patch.status !== 'discarded'`, `merged.status` stays the row's own; the rest of the patch is written; one log line names the id and the refused status. It never throws. `setRestoreResult` is unaffected because its `clearRemovedAt` runs first | Entry (the repository refusal, "drop the status half … the one this entry argues for") |
| D302-2 | 302 | `reapDeadSession` re-reads the row IMMEDIATELY before its write (`core.ts:2718`); a `discarded` row gets no status write and no `EVT_STATUS_CHANGED` `exited`, and one log line; detach, the husk's kill, the id maps, `activity.forget`, the hook revoke stand | Entry proof 3 ("asked immediately before the write … not only at :2336") |
| D302-3 | 302 | `killSessionAdmitted` re-asks the tombstone on a fresh read immediately before `setStatus(sessionId, 'exited')` (`:3560`); a tombstone gets no status write and no `exited` broadcast; the End resolves (the session was ended; the person removed the row meanwhile) | Entry ("the two writers whose placement is wrong"); M302 |
| D302-4 | 302 | No new gate script: the rules and the interval sweep join `src/main/sessions/__tests__/p293-lifecycle-gate.test.ts` (or a sibling `p302-tombstone.test.ts`) inside `npm test`, and `ablation:p293` gains one entry per clause | Entry (the third place, "the same rules added to the existing p293-lifecycle-gate.test.ts file and driven by ablation:p293") |
| D302-5 | 302 | `removeRefusal`, `endRefusal`, `asStatus`, the two list filters and `releaseSessionResources` do not move | Entry refusals |
| D302-6 | 302 | No one-off heal of rows already showing `exited` with a removal date | The deciding count reads his manifest, which is refused; Q5 |
| D305-1 | 305 | `restart.ts` reads the row a second time through `host.manifest.getSession(sessionId)` after the create and before anything else; every later decision reads the fresh row; step 1's read keeps its job | Entry mechanism 1 |
| D305-2 | 305 | `restartKeepsRow(record)` in `src/main/sessions/lifecycle-gate.ts` beside `removeRefusal`: true when the row carries a `removedAt`. Its sentence: a row carrying `removed_at` belongs to the person, and only a Restore from Past or the 90 day prune may change that (302's clause cites it) | Entry mechanisms 2, 7 |
| D305-3 | 305 | Liveness from the fresh status, naming the three terminal words (`exited`, `restorable`, `discarded`); `unknown` stays live | Entry mechanism 3 |
| D305-4 | 305 | A fresh tombstone skips step 4 and keeps the replacement; `RestartOutcome` gains `keptRemovedRow: boolean`, and the restart log says in one sentence that the replacement exists and the removed session is still in Past Sessions | Entry mechanism 4 |
| D305-5 | 305 | A kill that was attempted and failed does not delete; a row gone at the second read deletes nothing and throws nothing; `RestartOutcome` gains `oldRow: 'deleted' \| 'kept-removed' \| 'kept-kill-failed' \| 'already-gone'` beside it | Entry mechanisms 5, 6 |
| D305-6 | 305 | `conformance:manager`'s read half gains the rules (`build/p293/conformance-manager.mjs`), `ablation:p293` one entry per clause, and CLAUDE.md's row gains `src/main/restart/restart.ts` | Entry mechanism 8 |
| D325-1 | 325 | `src/main/attach/input-facts.ts` (new, pure): `inputFacts(data, inPaste) → { chars, submitted, inPaste }`, `chars` counting the characters that are neither control characters nor inside an escape sequence (CSI, OSC to BEL or ST, SS3, DCS, the three raw bytes after `ESC [ M`), a paste counting its content, `submitted` true for a carriage return outside a bracketed paste. Numbers and a boolean only; no string; no log call. The attach host keeps `inPaste` per client, so a paste split over two messages is read whole | Entry mechanism 2 (and its attack's split paste) |
| D325-2 | 325 | The tap is Phase 318's `onInput`, widened to `onInput?: (sessionId: string, facts: InputFacts) => void`: the SAME one call, after the write, under the same `req.machine === undefined && !isPaneReport(data)` guard (`attach-host.ts:331-333`), so Y17 still reads one call there; core's handler (`core.ts:1189-1190`) keeps `replyTurns.bump(sessionId, 'desk')` and adds `this.activity.noteOwnText(sessionId, facts)` (the INTEGRATOR's seam S1) | §0.1 325 item 2; entry mechanisms 3, 4 |
| D325-3 | 325 | `noteOwnText` HOLDS a burst for a session with no state yet (through `ensureState`), unlike `noteGeometryChange`, because D325-8's restore note can precede the first tick | Entry ("the spec step decides whether the burst is held or dropped") |
| D325-4 | 325 | `OWN_TEXT_MIN = 4`: the fewest characters that can finish a dialog beside rows the agent drew (`2. x`: `OPT2` needs `2`, `.` or `)`, a blank and one more character), and above every one-key answer the record holds | Entry ("the spec step fixes it from the regexes"); `screen.ts:74-75` |
| D325-5 | 325 | The mark is `hashScreen(screen)`, the hash `inferredVerdict` already computes at `:360`; no second reader of the matched rows; `conformance:choices` does not move | Entry ("or hashes something the verdict already holds, and says which"); §0.1 325 item 5 |
| D325-6 | 325 | The rule, beside the dialog line and never in it (`state-machine.ts:371-400`): a dialog READ on a capture is HIS when (a) the screen's hash equals the mark, or (b) his burst is open (at least `OWN_TEXT_MIN` characters since the pane last rested, `pane.currentCommand` the one at the burst's opening, no submit) and the capture before the burst opened read no dialog; on (b) the mark is set. His dialog is not counted: the tick reads as if no dialog were drawn. The burst closes on a submit, when tmux's whole-second activity stamp moves past the second after his last key (the agent writing on its own), and at the first capture after `QUIET_MS` of quiet (after (b) is asked). The mark is dropped on a capture that reads no dialog, a changed `pane.currentCommand`, `noteAgentLeft`, `noteReturn` and `forget`. It never raises, never makes a session working, never adds a screen change | Entry mechanism 6, made exact |
| D325-7 | 325 | The numbered verdict's line (`:366`), the shapes (`:367-370`), strong evidence, the release, `noteUserInput`, `activity:noteInput`, the renderer's gate (`sessions-slice.ts:1715`) and every constant do not move | Entry refusals |
| D325-8 | 325 | Item 7, earned (M325-7): after a restore whose snapshot was replayed, core notes Tortie's own text for that session, `{ chars: OWN_TEXT_MIN, submitted: false }`, so the replayed question is attributed as his words are (the INTEGRATOR's seam S2, reading the outcome's `kind === 'transcript'` or a `replayed` flag the `starts` builder adds to restore's outcome, §9.2 S5). Phase 141's resume in place is not attributed: its text cannot form a dialog | Entry mechanism 7; §0.1 325 item 4 |
| D325-9 | 325 | `build/conformance-ownwords.mjs` (`conformance:ownwords`, spawns nothing) with the entry's clauses as this tree has them, each asked again over an in-memory copy with its rule broken; `build/p325/ablation.mjs` (`ablation:p325`); `conformance:phonecopy`'s log rule (`build/p311/copy-drift.mjs`) gains `src/main/attach/input-facts.ts`; CLAUDE.md gains the row | Entry mechanism 9 |
| D325-10 | 325 | His first question is built on its default: a real question that reaches the screen inside the same window as his words is taken for his and stays grey until the screen changes | Entry ("Its first question goes to him, with a default"); Q4 |
| D328-1 | 328 | `build/p328/timeline.mjs --make` writes `build/fixtures/questions/a-antigravity-timeline.json` REBUILT from the entry's recorded numbers and `labels.json` (§0.1 328 item 2), numbers only, every block naming its source; `--check` refuses a string but screen ids and STAT letters and a screen id `a-antigravity.jsonl` does not hold | §0.1 328 item 2; entry mechanism 1; Q6 |
| D328-2 | 328 | `AgentActivityProfile` gains `writesWithoutDrawing?: true` and `terminalTools?: true`, each with a comment naming what was measured, on which version and when; antigravity's `activity` (`registry.ts:1386`) gains both, `animatesWhenIdle` stays `false` and `verified` `'partial'`; the comment above it and the `animatesWhenIdle` doc are corrected; `SHELL_ACTIVITY` and `DEFAULT_ACTIVITY` carry neither | Entry mechanism 2 |
| D328-3 | 328 | Clause A in `inferredVerdict`: for a profile with `writesWithoutDrawing`, on a tick where the parent's own predicate says output counts, the output is not strong evidence (no `working`, no `quietTicks = 0`), but it still zeroes `dialogTicks` and skips the dialog arm, still releases a blocked session through `releaseNeedsInput`, and (unless blocked) stamps a new `SessionState.lastOutputAt` that `worthProbing` reads beside `lastWorkingAt` | Entry mechanism 3 |
| D328-4 | 328 | Clause B: a sibling of `hasToolChild` in `process.ts` over the same snapshot and `descendants`, true when any process under the pane's program is a session leader with or without `+`; for a `terminalTools` profile it is WEAK evidence beside `screenChanged` (`:405`), never above the dialog arm | Entry mechanism 4 |
| D328-5 | 328 | The invariant (entry item 5) is asked over inputs that carry no own-text facts, so 325's rule does not enter it; 325's rows are asked on their own (both land in one commit) | New, because both land together |
| D328-6 | 328 | The tests, the shared helper module extracted from `p321-masking.test.ts` (its copy at `:73-296`, `restingWindow`, `typedInto`), the two named amendments (`p321-masking.test.ts:675`'s filter, `p321-shapes.test.ts:607`'s allowed set), `build/p328/ablation.mjs` (`ablation:p328`) | Entry mechanisms 6, 7 |
| D328-7 | 328 | His ruling, on its default: antigravity's unread questions go from `running` to `idle` and each is a turn boundary | Entry; Q8 |
| D354-1 | 354 | THE RULE, measured exact (0 of 180): in the folder, every `#` is doubled EXCEPT the `#`s of a run immediately followed by `[`, then a final `;` gets a backslash before it; in each `-e` pair and each argv element after `--`, a final `;` gets a backslash before it and nothing else moves. Nothing is normalised, case-folded or resolved | Entry mechanism 1 ("escapes exactly those and nothing else"); §0.1 354 item 2; M354 |
| D354-2 | 354 | ONE pure leaf `src/main/tmux/argument.ts` exporting `tmuxArgument(value)` (Phase 349's final-`;` rule, moved out of `remoteStampArgs`, which then calls it) and `tmuxFolderArgument(path)` (the `#` rule, then `tmuxArgument`) | §0.1 354 item 6; CLAUDE.md ("Grep for an existing helper") |
| D354-3 | 354 | `createSession` and `remoteCreateArgs` compose `-c` through `tmuxFolderArgument` and every `-e` pair and argv element through `tmuxArgument`; each takes `folderAsRecorded?: true`, which hands the folder EXACTLY as the row recorded it, with no escape at all, which is today's `-c` byte for byte (D354-4; a pre-fix row in `semi\;` ran in HOME or its `;` twin, so even the final-`;` escape would move it). The `-e` pairs and argv elements are escaped either way | Entry mechanism 1 |
| D354-4 | 354 | NO CONVERSATION LOST: `AgentRecoveryContract` gains `folderHeld?: true`, written by `buildRecoveryContract` (`manifest/agents.ts:556`) and the remote row's contract (`remote-record.ts:408`) on every row the fixed build creates. A restore (local `restore.ts:1083`, remote `remote-restore.ts:541`) asks `folderAsRecorded` only for a row whose contract lacks it, whose folder `tmuxFolderArgument` changes, whose agent is not `shell` and which has a resume to arm; every other create and restore holds the folder | Entry mechanism 2; §2.6 M354b; Q9 |
| D354-5 | 354 | Phase 350's two terms go from `bareNameSpawnFile` (`detection.ts:684`) and its doc (`:652-681`); the planted `#` and `\;` rows (`p350-pi-bare-name.test.ts` N60, N61, N63-N68 and the agents gate's driven rows) flip to holding the token; `ablation:p331`'s P42 and P44 go, and their owner rows with them; `conformance:agents` 11.11 now REQUIRES the guard to name neither term | Entry mechanism 3 |
| D354-6 | 354 | Phase 349's tmux NAME rule (`holdBackTmuxSyntax`) and the far name stamp do not move; the far env slot's far-composed pairs are a stated limit | Entry ("no escape of any character the measurement does not show tmux reading"); §0.1 354 item 8 |

## 2. What the spec step measured, how, and the numbers

Everything ran under the history block except the two app runs, which launch an Electron. Scripts, logs and results are
under `/private/var/tmp/tortie-wt/scratch/p353/spec/` (`m294/`, `m295/`, `m301/`, `m302/`, `m354/`, `src/tmux-3.7b/`
unpacked from the vendored `build/vendor/tmux/cache/tmux-3.7b.tar.gz` for reading, `build.log`). Every scratch tmux server
ran on a `p353m…` socket under a scratch `TMUX_TMPDIR`, with a scratch `HOME` and `SHELL=/bin/sh`, and was ended by
`kill-server` with its socket file removed in a `finally`; `-L gmux` was named by nothing. The build at this head:
`npm run build`, exit 0, 53 s, every gate in it green (`[electron-teardown] 573 files … 180 … floor of 180`;
`[background-teardown] 575 files … 3 start … 32 of 32`; `[known-hosts] 603 files`; `assert-hermetic-checks: PASS. 277
check scripts … 1175 test files`; `conformance:harnessprobes` 6 clauses, 16 ablations; contract inventory OK).

### 2.1 M294: the way back down (item 294)

`m294/m294.mjs`: a 120 × 40 pane prints `line N` (400 at once, then one every 50 ms) under a copy of
`resources/gmux-tmux.conf`; parked 100 back exactly as the serial branch of `scrollPaneBy` parks (`copy-mode -e`,
`scroll-up -N 100`, `top-line`), left 4 s, then 3-line notches toward live 40 ms apart, each the serial branch at this
head (`scroll-down -N 3`, then `top-line` while still in a mode). The ruler is tmux's own copy cursor on the top row
(`#{copy_cursor_line}`; the view is that line and the 39 after it), then `capture-pane` rows once live; a line is "never
on screen" when it was printed after the park and no sample showed it. `refreeze` is entry 294's option A with its own
clauses (in a mode, `#{copy_position_limit}` set, alternate off, the history deeper than the frame, the notch reaching the
frame's bottom).

| tmux | Mode | Parked top | Printed since the park | Notches to live | Seconds | Never on screen |
| --- | --- | --- | --- | --- | --- | --- |
| 3.7b | today | line 284 (position 100, frame 383) | 120 | 34 | 1.9 | **72** (423 to 494) |
| 3.7b | option A (8 re-freezes) | line 284 | 207 | 99 | 6.5 | **0** |
| 3.6a | today | line 284 (frame not named) | 128 | 34 | 2.3 | **79** (423 to 501) |

### 2.2 M295: one instant or two (item 295)

`m295/m295.mjs`, the entry's own rig rebuilt: a server per build with `history-limit 500000` and `exit-empty off`, one
200 × 40 pane running perl (`L<n>`, 2,000 at once, then one per interval), every call through Node's `execFile` as
`spawnTmux` makes it, each trial asking for exactly one line 200 above the last reading, graded by the text it got. Line
0 read `L0` at the end of every run (nothing trimmed).

| tmux | Rate | Trials | Today's pair: off (by up to) | median ms | One invocation: off | median ms |
| --- | --- | --- | --- | --- | --- | --- |
| 3.7b | 10/s | 300 | 8 (1) | 4.61 | **0** | 2.65 |
| 3.7b | 80/s | 300 | 58 (2) | 4.44 | **0** | 2.13 |
| 3.7b | 700/s | 200 | 200 (4) | 4.26 | **0** | 2.08 |
| 3.6a | 10/s | 300 | 9 (1) | 5.81 | **0** | 3.30 |
| 3.6a | 80/s | 300 | 106 (2) | 7.23 | **0** | 2.83 |
| 3.6a | 700/s | 200 | 200 (6) | 5.80 | **0** | 2.79 |

### 2.3 M301: the census at this head (item 301)

`m301/make-p167-copy.mjs` made a scratch copy of `build/probe-p167-scale.mjs` from its text, six edits asserted and
diffed (imports and `REPO` absolute; its own `-L gmux` count removed; `tmuxSocket: socket` on the main launch; every probed
agent hidden before the launch; `agents:list` read back; the import). Run through `build/harness-socket.mjs --fresh
gmux-p353s` from the worktree with `P167_PROFILES=d`, a scratch `TMPDIR`, `HOME`, one lock slot, history unchanged
across it.

| Run | Blocks × cycles | Census after each block (detached elements) | Renderer footprint | Past Sessions | Exit |
| --- | --- | --- | --- | --- | --- |
| full speed, load 5 to 9 | 3 × 6 | **0, 0, 0** (before: 0) | 65.8 → 82.4, 81.7, 86.1 MB | 24, 48, 72 | 0, 597 s |
| 1/8 CPU (`P167_CPU_PROFILES=d P167_CPU=8`) | 3 × 4 | **0, 0, 0** | 67.1 → 81.2, 86.4, 82.6 MB | 16, 32, 48 | 0, 440 s |
| starved from each block's last cycle through its census (`setTimeout` chain of 40 ms tasks, 25 s) | 3 × 4 | **0, 0, 0** | 67.7 → 84.7, 82.0, 84.9 MB | 16, 32, 48 | 0, 423 s |
| starved for each WHOLE block (`setTimeout` chains, 200 s each, the second overlapping the first) | 2 × 3 | **0, then `canvas x34`** | 67.6 → 83.6, **113.6** MB | 12, 24 | 0, 259 s |
| starved for each whole block with MESSAGE tasks (`MessageChannel`, 150 s each) | 2 × 3 | **`canvas x36`, then `canvas x72`** | 66.7 → **110.1, 133.6** MB | 12, 24 | 0, 261 s |

In every run the planted control was armed (1,032 planted, 1,032 seen, one finding, 0 held after release), both of Phase
265's owners were in the shipped bundle (`owner 1 also in shipped bundle: true`, `_cursorBlinkStateManager` registered in
463 files), `agents ok: nothing resolved`, and the renderer could make a WebGL2 context (`webgl2 in this renderer: true`,
read in the last two). The whole-block run's verdict still read "plateaued" because 34 is under the 50 budget, which is
the entry's point about the budget: the census line is the quantity, the verdict is a threshold. A `setTimeout` chain
leaves the browser's 4 ms timer clamp between tasks, and one chain was idle time enough for the 93-task warm-up to drain;
two overlapping chains were not. `electron-run` ended one process each teardown found still running; the count at the end
held no Electron of this step.

### 2.4 M302 and M305: the interval sweeps (items 302 and 305)

`m302/m302-sweep.test.ts` under a scratch vitest config (the worktree's aliases, `include` pointed at the scratch
folder), 161 cases, exit 0, 17.5 s: the REAL `reapDeadSession`, `killSessionAdmitted`, `removeSession` and
`mustGetSession` bodies off `GmuxCore.prototype`, as `p293-lifecycle-gate.test.ts` borrows them, over a REAL
`ManifestStore` read back through a SECOND handle, with `captureSessionSnapshot` and `tmux.killSession` waiting 30 ms
each and the Remove fired from a timer at 0, 1, 5, 20 and 100 ms; and the real `restartSession` over a fake host whose
create waits 120 ms. Every cell is in `m302/m302-cells.txt`.

| Writer | Starting status | Live binding | Remove | The row afterwards |
| --- | --- | --- | --- | --- |
| reap | `running`, `idle`, `needs_input`, `unknown` | yes | refused at every interval | `exited`, no removal date, managed list (correct) |
| reap | `exited` | either | accepted | `discarded`, Past (the reap returns at once) |
| reap | `restorable` | yes | accepted at 0, 1, 5, 20 ms | **`exited` WITH `removed_at`, managed list** (the defect) |
| reap | `restorable` | no | accepted | `discarded`, Past |
| reap | entered on a row ALREADY removed | no | — | **`exited` WITH `removed_at`, managed list**, with no await at all |
| kill | the four live statuses | yes | refused | `exited`, managed list (correct) |
| kill | `exited`, `restorable` | yes | accepted at 0, 1, 5, 20 ms | **`exited` WITH `removed_at`, managed list** |
| kill | `exited`, `restorable` | no | accepted | `discarded`, Past |
| restart | `exited`, `restorable` | no | accepted at 0, 1, 5, 25, 100 ms into the create | **GONE, 10 of 10** |
| restart | `running`, `unknown` | no | refused | GONE (ordinary restart, by design) |
| restart | any, no Remove (control) | no | — | GONE (by design: an ordinary restart hard-deletes the old row) |

No cell wrote `restorable` over a tombstone.

### 2.5 M325, M325-7 and M328: the status verdict (items 325 and 328)

`m302/m325-m328.test.ts`, the SHIPPING `inferredVerdict` and `commitVerdict` with the SHIPPING registry profiles
(`activityProfileFor`), a virtual clock, committed screens from `build/fixtures/questions/`, 10 tick phases a cadence;
14 cases, exit 0.

| Case | Cadence | `needs_input` in | First, after the event |
| --- | --- | --- | --- |
| M325: `1. to cancel` / `2. x` typed into antigravity's `>` row (`a-antigravity-0032`) | 1 s / 2 s | **10 / 10** each | 4 s / 6 s after his keys |
| the same into gemini's `>` row (`a-gemini-0010`) | 1 s / 2 s | **10 / 10** each | 4 s / 6 s |
| the same after cursor's `→` (`a-cursor-0107`) | 1 s / 2 s | 0 / 0 | (`→` is outside `OPT1`'s prefix set) |
| M325-7: a restored gemini session, its replayed snapshot ending on `a-gemini-0002` (its trust gate) with a shell prompt and the armed resume under it | 1 s / 2 s | **10 / 10** each | 4 s / 5 s after the replay |
| the same with cursor's (`a-cursor-0002`) and qwen's (`a-qwen-0114`) committed questions | 1 s / 2 s | 0 / 0 | (not numbered-verdict shapes; qwen's shape needs qwen to hold the terminal) |
| M328: antigravity at rest (`a-antigravity-0032`), stamp moved by a write every 2.015 s, no CPU, no child | 1 s | **325 of 325 `running`** in every phase | 0 turn boundaries |
| the same | 2 s | **98 to 163 of 162-163 `running`** by phase | 0 to 2 spurious boundaries |

### 2.6 M354: what tmux reads in each argument a create hands it (item 354)

**M354a**, `m354/m354.mjs` (results `m354-results.json`): 45 names (44 folders, each in its own parent folder so no twin
exists by accident, and a link whose own name ends in `\;` pointing to an ordinary folder), on the vendored 3.7b and
Homebrew's 3.6a, each under `-f /dev/null` and under a copy of `resources/gmux-tmux.conf` (180 cells a rule), every create
composed exactly as `createSession` composes it (`new-session -d -P -F <CREATE_FORMAT> -s <name> -c <folder> -e
GMUX_MANAGED=1 -e P353_OUT=<file> -- /bin/sh -c 'pwd -P > …'`) through `execFile`, graded by the pane's own `pwd -P`,
`$PWD`, `#{pane_current_path}` and `#{session_path}`:

| Rule handed to `-c` | Cells not the folder (of 180) | Names wrong |
| --- | --- | --- |
| today (the folder as recorded) | **118** | 30: every `#` before `{ ( # , }`, before `D F H I P S T W h`, a final `#` (3.7b only), `C##Tools`, `F##`, an unclosed `#{` or `#(`, `#{?…}`, `#{E:…}`, and every name ending in `;` (create FAILS, `unknown command: -e`), `\;` or `\\;` (HOME), the link |
| the final-`;` escape alone | 94 | the `#` names |
| every `#` doubled, then the final `;` escaped (the entry's words) | **20** | `x#[y`, `x#[y]z`, `x##[y`, `x###[y`, `a#[b#Sc]d` |
| every `#` doubled except a run followed by `[`, then the final `;` escaped (D354-1) | **0** | none |

Kept as typed at the parent on every configuration (15 names): `plain`, `C#/app`, `x#[y`, `x#[y]z`, `x##[y`, `x###[y`,
`a#[b#Sc]d`, `a#xb`, `a#Ab`, `100%`, `%Y`, `~x`, `a;b`, `a\b`, `a\`. Only `F#` differs by version; no name differs by
configuration.

**M354b**, the registry's resume rows (`m354/resume-table.mts` through the pinned tsx, reading compiled data only):

| Agent | Id capture | Store keyed by the folder | Resume finds it from another folder (the registry's recorded note) | A row from before the fix |
| --- | --- | --- | --- | --- |
| claude | pre-assigned `--session-id` | yes (`dashEncode(realpath(cwd))`) | yes, "id lookup is global" | has an id; filed under HOME |
| pi | pre-assigned `--session-id` | yes | **no**, `requiresOriginalCwd: true`, "a drifted cwd silently starts an EMPTY session under the same id" | has an id; filed under HOME |
| gemini | pre-assigned `--session-id` | yes (project dir from the cwd's basename) | not recorded | has an id; filed under HOME's |
| cursor | pre-assigned by `create-chat`, run in the row's folder | yes (`md5(cwd)`) | not recorded | the chat made in the folder, the TUI run in HOME |
| grok | pre-assigned `--session-id` | yes | yes, measured from a different cwd | has an id |
| omp | harvested (`cwd-newest`, the folder's own store directory) | yes | yes, "CWD-PROOF", measured | never harvested: the harvest watches the folder's directory, its file is under HOME's |
| qwen | harvested (`pid`, the folder's own project directory) | yes | **no**, `requiresOriginalCwd: true` | never harvested, for the same reason |
| codex, opencode, deepseek | harvested (`cwd-newest`, matched by the folder) | codex no, opencode by a column, deepseek no | codex and deepseek global | never harvested (the recorded folder does not match) |
| antigravity, muse | harvested by process (`fd-owner`, `tmux-pane`) | no | yes (muse adopts the launch folder as its workspace) | has an id |
| droid | `unverified` (captures nothing) | yes | — | nothing to resume |

**M354c**, `m354/m354-job.mjs`: `j#(echo p353job >> p353-jobs.log)` as the folder, on both versions: with the asking
client exiting at once, no job wrote (2 of 2 builds, and 8 creates in M354a); with the client kept alive 2 s by a chained
`run-shell 'sleep 2'`, **the job ran and wrote its line on 3.7b and 3.6a**.

**M354d**, `m354/m354-quote.mts`: the far create's argv quoted by the SHIPPING `shellQuoteArgv` and read back by
`/bin/sh`, `/bin/bash`, `/bin/zsh -f` and `/bin/dash` `-c`: every candidate element (`C##Tools`, `x#[y`, `semi\;`,
`semi\\\;`, `link\\;`, `P353_V=val\;`, `flag\;`, a `##(` job, a quote, `$HOME`, a backtick, a newline) arrived byte for
byte in 4 of 4 shells, so the far tmux is handed what this Mac's is.

**M354e**, `m354/m354-argv.mjs`: argv `/bin/sh -c '…' sh flag; display-message -p P353-INJECTED`: today the create's
own stdout carried `P353-INJECTED` on 3.7b and 3.6a (the command RAN on the server) and the pane received `flag`; with the
final `;` escaped the pane received `flag;`, `display-message`, `-p`, `P353-INJECTED` and nothing ran. `-e P353_V=val;`
today fails the create (`unknown command: -e`); escaped, the pane read `val;`. `-e P353_H=a#Sb#{session_name}` and the
argv element `x#Sy` arrived literal on both versions.

**Source** (`src/tmux-3.7b/`): `cmd-new-session.c:177-178` expands `-c` with `format_single` for the session and
`:301` hands the RAW `-c` to `spawn.c:229-230`, which expands it once more for the pane, independently; `spawn.c:381-387`
falls back to HOME, then `/`, when `chdir` fails; `cmd-parse.y:1097-1103` strips an argument's final `;` and ends the
command unless the character before it is a backslash, which then becomes the `;`; `format.c:5658-5772` is the expander
(`#(` runs `format_job_get` unless jobs are off, `#[` and a run of `#` before `[` are copied verbatim as a style, a
final `#` is dropped).

## 3. The tree at this head, re-read (what each builder starts from)

| What | Where, at `b1a557b8` |
| --- | --- |
| 302: the two writers, the Remove, the lists | `src/main/sessions/core.ts`: `reapDeadSession` `:2678-2753` (entered from the monitor's `onDead`, `:1299-1303`); `killSessionAdmitted` `:3433-3575`; `discardSession` `:3661-3676`; `removeSession` `:3687-3749`; `releaseSessionResources` `:3758-3772`; `listSessions` `:3205`; `listRemovedSessions` `:3325`; the monitor's dead branch `src/main/activity/monitor.ts:1102-1112` |
| 302: the merge and the tombstone | `src/main/manifest/sessions-repository.ts`: `updateSessionDurably` `:172-180`; `updateSession` `:326-456`; `setStatus` `:497-499`; `markSessionRemoved` `:651`; `pruneDiscardedSessions` `:1032-1042`; `setRestoreResult` `:1082-1101` |
| 302: the rig | `src/main/sessions/__tests__/p293-lifecycle-gate.test.ts` (478 lines: `host()`, `row()`, `onDisk()` read back through a second handle); `build/p293/ablation.mjs`; `build/p293/conformance-manager.mjs` |
| 305 | `src/main/restart/restart.ts` (222 lines); `src/main/restart/ipc.ts:17-21`; `src/main/sessions/lifecycle-gate.ts` (117 lines; `removeRefusal` `:95-117`); `src/main/restart/__tests__/restart.test.ts` |
| 325: the tap | `src/main/attach/attach-host.ts`: `onInput` option `:157-190`, the listener `:313-336` (the write `:328`, the call `:331-333`), `AttachClient` `:215-239`; core's wiring `src/main/sessions/core.ts:1189-1190`; `conformance:pocket` Y17 (`build/conformance-pocket.mjs:429`, `:8792-8806`) and Y13 (`:8634`, `:8658`); `conformance:machines` condition 110 reads the same listener (`build/conformance-machines.mjs:12678`) |
| 325: the rule | `src/main/activity/state-machine.ts`: `SessionState` `:76-205`, `freshState` `:208-233`, `isMidDialog` `:236`, `inferredVerdict` `:327-420`, `releaseNeedsInput` `:427-437`, `commitVerdict` `:796-811`, `noteAgentLeft` `:1124`, `noteReturn` `:1175`; `src/main/activity/monitor.ts`: `forget` `:455`, `ensureState` `:481`, `noteUserInput` `:535-541`, `noteGeometryChange` `:552-556`, the tick's verdict loop `:640-660`; `src/main/activity/screen.ts`: `OPT1` `:74`, `OPT2` `:75`, `HINT` `:76-77`, `QUEST` `:78`, `DIALOG_ROWS` `:81`, `hashScreen` `:48`, `detectDialog` `:106-108`, `detectDialogRows` `:291-310` |
| 325: item 7 | `src/main/restore/restore.ts`: `typeIntoPane` `:310-319`, the replay `:1145-1163` (sets `replayed`), the outcome's arms `:130-175`, `:1247-1268` (`transcript` when replayed); `restoreSessionInTmux`'s caller `core.ts:2021` |
| 325: the gates beside it | `build/conformance-choices.mjs` (clauses 1, 2, 3, 21 at `:983-1003`, `:1396`); `build/p311/copy-drift.mjs` (`conformance:phonecopy`'s log rule); `build/p312/ablation.mjs`; `build/p321/ablation.mjs` |
| 328 | `src/main/agents/registry.ts`: `AgentActivityProfile` `:327-365`, antigravity's row `:1310`, its `activity` `:1386`, `SHELL_ACTIVITY` `:2485`, `DEFAULT_ACTIVITY` `:2492`, `activityProfileFor` `:2504`; `src/main/activity/process.ts`: `CPU_BUSY_PERCENT` `:37`, `CPU_BUSY_TICKS` `:39`, `descendants` `:109`, `hasToolChild` `:135`; `state-machine.ts`: `worthProbing` `:245-255`, `outputEvidence` `:348`; `src/main/activity/__tests__/p321-masking.test.ts` (the parent copy `:73-296`, `restingWindow` `:314`, `typedInto` `:340`, the filter `:675`); `p321-shapes.test.ts:603-611`; `build/conformance-agents.mjs` `P321_FIELDS` `:1916`, refusals `:2074-2080`, floor rows `:2238`; `build/p321/stand-in.mjs`; `build/fixtures/questions/a-antigravity.jsonl` (32 screens), `labels.json` |
| 294 | `src/main/tmux/scroll.ts` (885 lines): header item 3 `:25-32`, `TmuxScrollRunner` `:99-103`, `PaneScrollState` `:105-161`, `STATE_FIELDS` `:164-175`, `STATE_FORMAT` `:185`, `REMOTE_STATE_FORMAT` `:217`, `parseState` `:232-236`, `parseRemoteState` `:288`, `readPaneScroll` `:387`, `cursorToTopRow` `:579-586`, `seekPaneTo` `:595-626`, `scrollFrom` `:637-664`, `scrollPaneBy` `:680-739`, the account `:741-827`, `scrollPaneTo` `:828-836`, `exitPaneScroll` `:839-852`, `clampHistoryRange` `:873-885`; `src/main/scrollback/watch.ts:86-89`; `src/renderer/terminal/scroll/surface.ts` (`noteEntry` `:1271`), `TerminalScrollbar.tsx:98-118`, `live-distance.ts:101-154`, `drag-select.ts`; tests `src/main/tmux/__tests__/scroll.test.ts`, `scroll.integration.test.ts`, `p3201-scroll-pipeline.test.ts`, `src/renderer/terminal/scroll/__tests__/p292-honest-thumb.test.ts`; `build/p292/probe-p292.mjs` (2,118 lines; arms a-g, `P292_ARMS` `:234`, `ALL_ARMS` `:339`, `tmuxSocket: socket`, hides no agent) |
| 295 | `src/main/capture/service.ts:150-189` (`captureHistoryRange` `:176`); `src/main/tmux/sessions.ts` `CapturePaneOptions` `:270-287`, `capturePane` `:308-331`, `PaneExtent`/`readPaneExtent` `:333-361`; the barrel `src/main/tmux/index.ts:218-226`; `src/renderer/terminal/capture/history-copy.ts` (one caller with a range); `src/renderer/terminal/scroll/drag-select.ts:91-98`; `src/main/capture/__tests__/history-range.test.ts`; `src/main/machines/remote-pane-history.ts:178-214` (NOT touched); `build/probe-p209-selection.mjs` (arms D and E; counts `-L gmux` itself) |
| 301 | `src/renderer/terminal/TerminalPane.tsx:608-639`; `patches/@xterm+addon-webgl+0.19.0.patch` (582,249 bytes, two hunks over the minified bundle); `build/apply-patches.mjs`; `node_modules/@xterm/addon-webgl/lib/addon-webgl.mjs` (`_doWarmUp`, `dispose`, the idle queue classes); `build/probe-p167-scale.mjs` (2,400 lines; `shippedRendererFixes` `:1321-1344`, the block loop `:1930-2010`, the settle `:1973`, `liveGmuxSessionCount` `:794-799`, `:2372-2378`, the launches `:956-960` (remote, `GMUX_REAL_MACHINE_HOST` only) and `:1838-1842`) |
| 354 | `src/main/tmux/sessions.ts:152-197`; `src/main/tmux/names.ts` (`holdBackTmuxSyntax` `:81-94`, untouched); `src/main/machines/remote-stamps.ts:55-63`; `src/main/machines/remote-sessions.ts:878-946`, `:1744-1960`; `src/main/machines/remote-restore.ts:541-553`; `src/main/restore/restore.ts:913-1100`; `src/main/manifest/agents.ts:228` (`SESSION_CONTRACT_VERSION = 1`), `:465-555` (`AgentRecoveryContract`), `:556` (`buildRecoveryContract`), called from `src/main/sessions/launch-plan.ts:472`; `src/main/manifest/contract.ts` (passes unknown fields through, `:16-28`); `src/main/machines/remote-record.ts:408-433`; `src/main/agents/detection.ts:625-731`; `src/main/agents/__tests__/p350-pi-bare-name.test.ts` (planted rows `:229-265`, the ruling describes `:392-…`); `build/conformance-agents.mjs` 11.11 (`:3441-3590`, the two terms `:3545-3562`); `build/agents-conformance-probe.mts` (`:1993-2100`, the N rows); `build/p331/ablation.mjs` (P42 `:548-550`, P44 `:555-557`, N60-N68 `:300-309`); `src/main/machines/__tests__/p349-far-names.test.ts:152-158` (the stamp's rule, pinned); `src/main/machines/__tests__/remote-sessions.test.ts:226` and `remote-restore.test.ts:238-401` (read `remoteCreateArgs`); `build/conformance-machines.mjs`, `build/machines-conformance-probe.mts`, `build/probe-remote-env.mjs`, `build/p324/drive-p324.mts` (name `remoteCreateArgs`) |
| Integrator | `CHANGELOG.md` (`## Unreleased`); `CLAUDE.md` (the path-triggered rows of §11 step 4, the probe rows); `package.json`; `build/verification-checks.mjs`; `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` `:573`, `OPERATOR_ARGV_CEILING` `:627`) |

## 4. The design, item by item (real paths; the builder named on each)

### 4.1 302 — a removed row keeps its tombstone (builder `records`)

1. `sessions-repository.ts`, `updateSession`: after the merge and after `if (opts.clearRemovedAt === true) delete
   merged.removedAt;` (`:408-410`) and before the UPDATE (`:412`), the clause of D302-1:
   `if (merged.removedAt !== undefined && patch.status !== undefined && patch.status !== 'discarded' && merged.status
   !== existing.status) { merged.status = existing.status; <one log line> }`. The log names the id and the refused
   status and nothing of the row. A comment above it cites D305-2's sentence (a row carrying `removed_at` belongs to the
   person; only a Restore from Past or the 90 day prune may change that). `markSessionRemoved`'s own UPDATE (`:655`) and
   `setRestoreResult` (`clearRemovedAt` first) are untouched, so the two legitimate moves still work.
2. `core.ts`, `reapDeadSession`: immediately before `this.manifest.updateSession(sessionId, {…})` (`:2718`), `const
   fresh = this.manifest.getSession(sessionId);` and when `fresh?.status === 'discarded'`: no status write, no
   `EVT_STATUS_CHANGED`, one `sessionsLog.info` line; every other step of the reap (detach, the husk's kill, the id maps,
   `queueCaptureSync` stays as the parent orders it, `activity.forget`, `resumeInPlace.forget`, `hookServer.revoke`)
   stands. The early guard at `:2684` stays.
3. `core.ts`, `killSessionAdmitted`: immediately before `this.manifest.setStatus(sessionId, 'exited')` (`:3560`), ask
   `endRefusal(this.manifest.getSession(sessionId))`; when it refuses, no status write, no `EVT_STATUS_CHANGED`
   `exited`, `broadcastSessions()` still runs, the tree ending still runs, and the End resolves. The gate at `:3448`
   stays where it is.
4. Tests, in `p293-lifecycle-gate.test.ts` or a sibling `src/main/sessions/__tests__/p302-tombstone.test.ts` (the rig is
   M302's, committed form): the interval grid (0, 1, 2, 5, 10, 20, 50, 100, 200, 500 ms; the six starting statuses with and
   without a live binding; both orders; both writers, the reap entered through the borrowed body and through a dead pane
   reported after a Remove), each cell's `(status, removed_at)` and its LIST, against a table derived by hand from §2.4
   and committed beside it; the clause's own rows in `src/main/manifest/__tests__/p302-status-over-tombstone.test.ts`
   (new): every status over a tombstone keeps `discarded`, `discarded` over a tombstone is written, `clearRemovedAt`
   still clears, a patch's other fields still land.
5. `ablation:p293` (`build/p293/ablation.mjs`) gains: the clause removed; the clause asked after the UPDATE; the reap's
   re-read removed; the reap's re-read asked before the awaits only; the kill's re-read removed. Each reddens its own
   rule by the delta rule; every file is restored by sha256.
6. Unchanged and said so in the report: `conformance:remoteclose` (it never opens a manifest) and `conformance:manager`
   (its store is the renderer's) run green, each with that sentence.

### 4.2 305 — a restart never deletes a row the person removed (builder `records`)

1. `lifecycle-gate.ts`: `export function restartKeepsRow(record: Pick<ManifestSessionRecord, 'removedAt'>): boolean`
   beside `removeRefusal`, true when `removedAt !== undefined`, with D305-2's sentence as its doc.
2. `restart.ts`, after `const session = await host.createSession(input);` (`:182`): `const fresh =
   host.manifest.getSession(sessionId);`. `fresh === undefined` → `oldRow: 'already-gone'`, nothing deleted, no throw.
   `restartKeepsRow(fresh)` → no kill, no delete, `keptRemovedRow: true`, `oldRow: 'kept-removed'`, and one log line
   ("the replacement exists and the removed session is still in Past Sessions"). Otherwise liveness reads `fresh.status`
   with the three terminal words (`exited`, `restorable`, `discarded`); a kill that throws keeps the row
   (`oldRow: 'kept-kill-failed'`, the warning kept) and does not reach `discardSession`; a kill that succeeds or no kill
   needed deletes (`oldRow: 'deleted'`). `host.broadcastSessions()` runs on every arm. Step 1's read keeps its job.
3. `RestartOutcome` gains `keptRemovedRow: boolean` and `oldRow`; the module's header gains one paragraph naming Phase
   305 and the second read.
4. Tests, `src/main/restart/__tests__/restart.test.ts` (the 33 cases unchanged) plus the grid of the entry's proof 1:
   delays on the fake host's create and kill, a hook mutating the row mid-flight (tombstoned, deleted outright, left
   alone); the Remove at 0, 1, 5, 25 and 100 ms into the create and into the kill; `exited`, `restorable`, `running`,
   `unknown`; each cell printing interval, status, kill attempted, row survived, `(status, removedAt)` after; the expected
   table derived by hand and committed beside it.
5. `conformance:manager`'s read half (`build/p293/conformance-manager.mjs`) gains the rules: `restart.ts` asks
   `getSession` a second time after `createSession` and before `killSession` and `discardSession`; the delete is decided
   from that read; `restartKeepsRow` is declared once, in `lifecycle-gate.ts`, and asked on the delete's path;
   `discardSession` and `deleteSession` hold no refusal (the sweeps must collect tombstones). `ablation:p293` gains the
   entry's five arms (the second read removed; present but the delete decided from `rec`; `restartKeepsRow` inverted;
   the kept-row arm deleted; the failed-kill arm deleted), each reddening its own rule.

### 4.3 325 — his words are never the agent's question (builder `status`; the core seams are the integrator's)

1. `src/main/attach/input-facts.ts` (new): `export interface InputFacts { readonly chars: number; readonly submitted:
   boolean; readonly inPaste: boolean }` and `export function inputFacts(data: string, inPaste: boolean): InputFacts`
   per D325-1. Pure: no import beyond types, no log call, no string in its answer.
2. `attach-host.ts`: `AttachClient` gains `inPaste: boolean` (false at attach); the listener computes `const facts =
   inputFacts(data, client.inPaste); client.inPaste = facts.inPaste;` and the existing call becomes
   `this.opts.onInput?.(req.sessionId, facts)`, in the same place under the same guard; `onInput`'s type and its doc
   (`:169-190`) say what the facts are and that nothing reads the bytes.
3. `monitor.ts`: `noteOwnText(sessionId: string, facts: InputFacts): void`, beside `noteUserInput` and
   `noteGeometryChange`: `const st = this.ensureState(sessionId);` then the state machine's `noteOwnTextOn(st, facts,
   this.now(), this.lastPane.get(sessionId)?.currentCommand ?? null)`. It commits nothing, captures nothing, reads no
   `ps`, raises and releases nothing. `noteUserInput` does not move.
4. `state-machine.ts`: `SessionState` gains `ownText: { chars: number; at: number; command: string | null; dialogBefore:
   boolean } | null` and `ownMark: string | null`, both null in `freshState`. `export const OWN_TEXT_MIN = 4;`.
   `noteOwnTextOn(st, facts, now, command)`: a submit closes the burst and drops the mark; otherwise characters are added
   to the open burst, or a burst opens with `dialogBefore = st.dialogTicks > 0 || st.state === 'needs_input'` and the
   command. In `inferredVerdict`, after `const dialog = numbered || shaped;` (`:371`, which does not move) and using the
   screen hash already computed at `:360` (hoisted into a const the verdict line does not name), `const own = dialog &&
   ownDialog(st, pane, screenHash, ctx.now)` per D325-6, and the dialog arm reads `if (dialog && !own)`. The burst's
   close on the stamp and on quiet, and the mark's drops, are applied in one helper called once per capture.
   `noteAgentLeft` (`:1124`) and `noteReturn` (`:1175`) drop both. The constants and both cadences do not move.
5. Item 7, D325-8: nothing in `restore.ts` or `resume-in-place.ts` is written by this builder; the core seam S2 calls
   `noteOwnText(rec.id, { chars: OWN_TEXT_MIN, submitted: false, inPaste: false })` after a restore that replayed.
6. Tests: `src/main/attach/__tests__/input-facts.test.ts` (the entry's list: every report kind 0 — focus in and out,
   colour, device, SGR and X10 mouse, arrows, Esc, empty bracketed-paste markers; a paste counts its content; a CR inside a
   paste is not a submit; a paste split over two messages; wide and combining characters). `src/main/activity/__tests__/p325-own-words.test.ts`,
    the shipping class on a virtual clock: his words typed and pasted over every committed idle
   window whose bottom rows are an input row (`build/fixtures/questions/*.jsonl`) never reach `needs_input` at 1 s or 2 s;
   one row per clause; each answering key (a digit, `y`, `a`, Enter, an arrow, Esc) followed by the next question at 30,
   150, 400 and 1,000 ms reaching `needs_input` exactly as at the parent; a new program's gate after his Enter; a
   restored gemini `a-gemini-0002` replay held by S2's note and released when the screen changes. **Every existing row in
   `signals.test.ts`, `p312-choices.test.ts`, the `p321-*` files, `monitor.test.ts`, `reflow.test.ts`,
   `turn-boundary.test.ts`, `p318-monitor.test.ts` and the Phase 141 tests stays green unchanged**; a row that must
   change is a finding for the verifier, not an edit.
7. Gates: `build/conformance-ownwords.mjs` (`conformance:ownwords`, spawns nothing, the TypeScript parser over the
   source): `attach-host.ts` holds one `pty.write` in the `term:input` listener and calls `onInput` once there, after it;
   `InputFacts` names numbers and booleans only; `input-facts.ts` returns no string and imports nothing that runs; no file
   under `src/main/activity/` imports `input-facts.ts`'s function or receives the listener's `data`; neither file names a
   log call; the rule sits in `inferredVerdict` before the dialog count and after the verdict line; the renderer's gate at
   `sessions-slice.ts:1715` is unchanged; each clause asked again over an in-memory copy with its rule broken, every copy
   red. `build/p311/copy-drift.mjs` (`conformance:phonecopy`) adds `src/main/attach/input-facts.ts` to the files its log
   rule reads, with a self-test plant. `build/p325/ablation.mjs` (`ablation:p325`): each clause of D325-6 removed from
   the SHIPPING source one at a time, the owning row red, every file restored by sha256 in a `finally`, an unedited
   control green.

### 4.4 328 — antigravity reads idle at its prompt (builder `status`)

1. `build/p328/timeline.mjs`: `--make` writes `build/fixtures/questions/a-antigravity-timeline.json` per D328-1 (the
   rebuilt stamps, process samples with STAT letters, CPU-seconds and the five key times; each block's `source` names
   the entry's sentence or the `labels.json` instance it came from); `--check` per D328-1. No corpus is read.
2. `registry.ts` per D328-2.
3. `state-machine.ts`: `SessionState.lastOutputAt` (0 in `freshState`); clause A in `inferredVerdict` per D328-3, on the
   profile's `writesWithoutDrawing` alone; `worthProbing` reads `lastOutputAt` beside `lastWorkingAt` for such a
   profile; clause B per D328-4, read beside `screenChanged` at `:405`.
4. `process.ts`: `hasTerminalTool(snap, root)` over `descendants(snap, root)`, a session leader with or without `+`.
5. Tests: `src/main/activity/__tests__/p328-writes-without-drawing.test.ts` over the rebuilt timeline at 1 s and 2 s
   across 10 phases: the rest reads `idle`; the invariant (D328-5) tick for tick; the turn boundaries are the five the
   entry names; his numbered words typed and pasted into the resting screen under the writes read `needs_input` on
   exactly the parent's ticks; the tool stretch with agy's CPU at 0 reads `running` through clause B and `idle` with it
   taken away; a terminal child left alive at rest reads `running`; every other registry row, the shell and the floor
   equal the parent. The parent's rule is the copy `p321-masking.test.ts` already holds, moved into one shared module
   under `__tests__/` with `restingWindow` and `typedInto` (no assertion of that file changes by the move); the two named
   amendments of D328-6.
6. `build/p328/ablation.mjs` (`ablation:p328`): the entry's eight arms (output counted as work again; the masked tick
   not resetting the dialog count; the dialog arm run on a masked tick; `lastOutputAt` out of `worthProbing`; clause B
   removed; clause B above the dialog arm; the fields off antigravity's row; a field on `DEFAULT_ACTIVITY`), each red on
   its own row, an unedited control green, sha256 restore.
7. `conformance:agents` gains both names in its refusals (the `starts` builder writes it, §9.2 S4).

### 4.5 294 — the way down passes through what printed (builder `terminal`)

1. `scroll.ts` per D294-1 to D294-4 and D294-7; the decision exported for the test as `refreezeWanted`; the limit parsed
   by a local reader the remote branch never calls.
2. `scrollFrom` and `TerminalScrollbar.tsx` per D294-5.
3. The renderer needs nothing new on 3.7b, pinned: `p292-honest-thumb.test.ts` gains a re-freeze answer sequence (the
   thumb continuous; a held selection's rows unchanged).
4. Tests: the decision's table in `src/main/tmux/__tests__/scroll.test.ts` with one ablation per clause (the trim band,
   the alternate screen, the frame's depth, the growth, the bottom), each red; `REMOTE_STATE_FORMAT` and every ordered
   sequence pinned byte for byte (`p3201-scroll-pipeline.test.ts` unchanged); `scroll.integration.test.ts`
   (`GMUX_SCROLL_IT=1`) gains the attached-client arm (every line drawn on 3.7b).
5. `build/p292/probe-p292.mjs`: converted (D-P2) and arm h added, selectable by `P292_ARMS=h`, in the entry's shape
   (park as arm a does, 8 s of printing, real wheel notches toward live one at a time, every row of the pane's xterm
   buffer read after each until tmux says the pane left copy mode and once 500 ms later; graded: every `line N` from the
   park's top row to the newest line drawn on some row of some sample, no notch moving row 0 by more than its lines plus
   what printed between samples, the thumb never falling further; printed, not graded: notches and seconds to live;
   variants ⇧PageDown, the drag's band, a quiet pane (equal to the parent notch for notch), a history at its limit (equal
   to the parent), an alternate screen opened while parked (equal to the parent); on 3.7b and on 3.6a through
   `GMUX_TMUX_BIN`, the parent through `P292_CHECKOUT`). It is also where 295's app arm lives (§4.6 step 5).

### 4.6 295 — the copy is the lines selected (builder `terminal`; the deletion is the integrator's)

1. `src/main/tmux/history-lines.ts` (new) per D295-2.
2. `capture/service.ts`'s `captureHistoryRange` per D295-3, importing `captureHistoryLines` directly (no barrel edit by
   this builder).
3. Comments per D295-5 (`drag-select.ts:91-98`, `service.ts:165-175`).
4. Tests: `src/main/capture/__tests__/history-range.test.ts` rewritten around a fake server whose grid gains k lines on
   every spawn (red at the parent, exact at HEAD; today's clamp cases; a start past the last row answering nothing when
   tmux printed the last row; NaN, ±Infinity and 1.5 refused with no spawn); `src/main/tmux/__tests__/history-lines.
   integration.test.ts` (new, `GMUX_CAPTURE_IT=1`, a scratch socket under a scratch `TMUX_TMPDIR`, its server ended in a
   `finally`): 300, 300 and 200 copies at about 10, 80 and 700 lines a second on 3.7b (`GMUX_TMUX_BIN`) and 3.6a, zero
   off, and a control arm issuing today's pair that must read off at about 80 lines a second.
5. The app arm (in `probe:p292`'s arm h family, `P292_ARMS=h2`, the same launch): 200 calls of
   `window.gmux.capture.pane({ tmuxName, historyLines: 0, range, join: true })` on a stream at about 80 lines a second,
   and a real drag that scrolls and parks then ⌘C twenty times while the pane prints, each pasteboard compared line for
   line with the highlighted rows read off the screen, the pasteboard saved and restored in a `finally`; the parent's
   wrong count recorded, HEAD 0.
6. `build/probe-p209-selection.mjs` is converted (D-P2) before its arms D and E run as the regression check.

### 4.7 301 — a closed session's atlas is released with it (builder `terminal`)

1. D301-5 first (a starved parent run, the snapshot's chain read with `build/heap-retainers.mjs` in a child process).
2. The hunk (D301-1), written into `patches/@xterm+addon-webgl+0.19.0.patch` in the shape the two existing hunks use,
   the pristine bytes recovered by reverse-applying the existing patch to a scratch copy (never by a download), and
   applied to the worktree's `node_modules` by `node build/apply-patches.mjs`; the patch applies cleanly to a pristine
   copy and is idempotent on a patched one (said in the report).
3. `TerminalPane.tsx` per D301-2.
4. `build/probe-p167-scale.mjs`: converted (D-P2: the recipe of `m301/make-p167-copy.mjs`), the third owner (D301-3),
   and the starving arm (D301-4, `P167_STARVE=1` or a named arm: back-to-back MESSAGE tasks on the page, from before a
   block's first cycle through its census, bounded by a deadline the page itself checks, so no idle callback can run;
   graded: the census returns to its floor at HEAD, the `canvas` count read per block, and the parent red; the spec
   step's scratch form is the `P353_STARVE=whole` edit of `m301/make-p167-copy.mjs`). The planted control, the workload floor,
   the descriptor check, Past Sessions, `P167_DETACHED`, the census and the snapshot machinery are not weakened.

### 4.8 354 — every session starts where it was asked to (builder `starts`)

1. `src/main/tmux/argument.ts` (new) per D354-2, with a header carrying §2.6's table in one paragraph (which characters
   tmux reads in `-c`, which argument endings it reads, measured on 3.7b and 3.6a, `-f /dev/null` and `gmux-tmux.conf`,
   and Phase 349's nine-version evidence for the others) and the source lines of §2.6.
2. `remote-stamps.ts`: `remoteStampArgs` sends `tmuxArgument(value)`; `p349-far-names.test.ts:152-158` stays green
   unchanged.
3. `sessions.ts` `createSession` and `remote-sessions.ts` `remoteCreateArgs` per D354-3. The far env slot stays one
   element (D354-6).
4. The marker (D354-4): `AgentRecoveryContract.folderHeld?: true` in `manifest/agents.ts`, set by `buildRecoveryContract`
   for every agent including `shell`; the remote contract in `remote-record.ts` sets it. `restore.ts` decides at `:1083`
   with one pure exported function, `folderAsRecordedFor(rec): boolean` (the four clauses of D354-4), and hands
   `folderAsRecorded: true` to `createSession` when it answers true; `remote-restore.ts` asks the same function and hands
   it to `remoteCreateArgs`. Phase 13.5.1's gone-folder refusal and its fallback to `projectPath` are untouched.
5. S5 for 325: the transcript outcome of `restoreSessionInTmux` gains `replayed: true` when `replayed` is set
   (`restore.ts:1145-1163`), unless the existing `kind: 'transcript'` already says exactly that, which the builder states.
6. `detection.ts` per D354-5 (the guard reads `if (name.length === 0 || name.includes('/') || !folder.startsWith('/'))
   return null;` and the doc drops its two clauses, saying the pane now starts in the folder because the create holds
   back what tmux reads, Phase 353).
7. Tests: `src/main/tmux/__tests__/p354-argument.test.ts` (the 45-name corpus of §2.6 with each name's expected
   argument under D354-1, idempotence NOT claimed, a `-e` pair and an argv element ending in `;`, `\;`, `\\;` and `;`
   alone, `#` left alone outside `-c`); `src/main/tmux/__tests__/p354-create.integration.test.ts` (new, opt-in
   `GMUX_ARG_IT=1`, M354's rig in committed form: every name created through the SHIPPING `createSession` composition on
   a scratch socket under a scratch `TMUX_TMPDIR`, on 3.7b and 3.6a, `-f /dev/null` and `gmux-tmux.conf`, graded by
   `#{pane_current_path}` and the pane's own `pwd -P`, 0 of 180 wrong, plus today's composition as the control that must
   read 118; the `j#(…)` name with a harmless echo into the scratch, its job never run at HEAD; the launch-flag injection
   with a harmless `display-message`, never run at HEAD); the restore's decision table (`folderAsRecordedFor` over a
   pre-fix pi row in `C#Tools`, a post-fix one, a shell row, a row with no resume, a row in `C#/app`, one in `semi\;`);
   the contract carrying `folderHeld` through a round trip and through an older codec's pass-through.
8. Phase 350's rows per D354-5: `p350-pi-bare-name.test.ts`'s `#` and `\;` describes flip to holding the token (the pane
   starts in the folder, which holds no pi, so the global pi the scan read is the file that runs); the link row stays as
   it reads; `build/agents-conformance-probe.mts`'s N60, N61, N65 and N66 bare rows read `holds`; `build/p331/ablation.mjs`
    loses P42 and P44 and drops N60, N61, N63 to N68 from the owners lists that named them; `build/conformance-agents.mjs`
    11.11 asserts the guard names neither `folder.includes('#')` nor `folder.endsWith(';')`, and
   its two sentences say why.
9. `build/p353/probe-starts.mjs` (§8).

## 5. Words

No user-visible word moves but the CHANGELOG's (the restart log line and the repository's log line are app.log lines, not
surfaces; no copy, no surface, no menu). The integrator writes, ABOVE `## 0.114.0` (which has no `## Unreleased` above
it at this head), a `## Unreleased` heading with a `### Fixed` list of seven items in the house style, with NO commit link
(the follow-up docs commit that writes the running-log line adds it):

```
- Scroll back to read while an agent keeps printing, then scroll back down, and you now pass through everything it printed while you read instead of jumping past it to the bottom; getting back to the bottom takes as many lines as were printed, and typing still takes you there at once
- Copying lines from a busy session's history, after dragging a selection past its edge, now puts exactly the highlighted lines on the clipboard
- A session you ended and then removed stays in Past Sessions, and no longer comes back to your sessions list with nothing behind it
- Restarting a session while you remove it no longer deletes it for good: the new session starts and the removed one stays in Past Sessions
- What you type or paste into a session no longer turns it amber or reaches your iPhone as the agent's question, even when it looks like one; a question the agent asks while your words are still arriving shows once the agent draws again
- An Antigravity session no longer shows as running while it waits at its prompt; its questions still do not turn amber, and they now read as idle
- A session in a folder whose name holds a # or ends in ; now starts in that folder, on this Mac and on another machine; a session started before this update and restored keeps the folder it ran in, so its conversation is found
```

## 6. What moves on purpose (each red ON PURPOSE in the same commit, and named in its report)

| What | Builder | Why |
| --- | --- | --- |
| `p293-lifecycle-gate.test.ts` gains the sweep; no existing row changes | records | D302-4 |
| `restart.test.ts`'s 33 cases unchanged; the grid added | records | D305 |
| `conformance:manager` gains rules; `ablation:p293` gains seven arms (two for 302's re-reads, one for the clause, one for the clause asked late, and the five of 305 minus overlap, as built) | records | D302-4, D305-6 |
| `attach-host.ts`'s `onInput` type widens; `conformance:pocket` Y17 still reads one call after the write under the same guard (it reads the call, not its arguments, `build/conformance-pocket.mjs:8792-8806`) | status | D325-2 |
| `p321-masking.test.ts:675`'s filter excludes a row carrying either new field; `p321-shapes.test.ts:607`'s allowed set gains the two names and a row asserting only antigravity carries them; the parent copy moves into one shared module | status | D328-6, the entry's two named amendments |
| `conformance:phonecopy`'s log rule reads `input-facts.ts` | status | D325-9 |
| `scroll.ts`'s local format gains a ninth field; `scroll.test.ts`'s format pin moves for the local format only | terminal | D294-2 |
| `history-range.test.ts` rewritten; its header corrected | terminal | D295 |
| the WebGL patch gains a hunk; `probe:p167` gains a third owner and the starving arm | terminal | D301 |
| `probe:p292`, `probe:p167`, `probe:p209`, `probe:p95`, `probe:p284` lose their own `-L gmux` counts (four of them) and hide every probed agent | terminal | D-P2 |
| `createSession`'s and `remoteCreateArgs`'s argv for a folder, `-e` value or argv element that tmux reads; every gate or test pinning that argv for such a value | starts | D354-3 |
| `p350-pi-bare-name.test.ts`'s `#` and `\;` rows, `agents-conformance-probe.mts`'s N60, N61, N65, N66, `conformance:agents` 11.11, `ablation:p331`'s P42 and P44 | starts | D354-5 |
| `conformance:agents` refuses `writesWithoutDrawing` and `terminalTools` on the overlay | starts (for status) | D328-7, S4 |
| `HELPER_USER_FLOOR` 180 → 183; `OPERATOR_ARGV_CEILING` 98 → 94 | integrator | D-P1, D-P2 |

## 7. The gates that move

- `conformance:agents` (`build/conformance-agents.mjs`, `starts`): 11.11 per D354-5; the two 328 names in the overlay
  refusal lists, its driven refusals (a new agent carrying them, antigravity patched with them) and the floor rows
  (neither on `SHELL_ACTIVITY` or `DEFAULT_ACTIVITY`), as `:1916`, `:2074-2080` and `:2238` do for Phase 321's names.
- `ablation:p331` (`build/p331/ablation.mjs`, `starts`): P42 and P44 removed; every other arm red on its owners.
- `conformance:manager` and `ablation:p293` (`records`): §4.1 step 5, §4.2 step 5.
- `conformance:ownwords` (new, `status`), `ablation:p325` (new), `ablation:p328` (new), `conformance:phonecopy`
  (amended).
- `conformance:choices`, `conformance:handback`, `ablation:p312`, `ablation:p321`, `conformance:push`: UNCHANGED, run
  green (the verdict's line, the shapes and their gate do not move).
- `conformance:machines`: unchanged unless one of its conditions pins `remoteCreateArgs`' argv for a value D354-1
  escapes (`build/machines-conformance-probe.mts` names it); then that row moves on purpose and its builder (`starts`)
  names it. Condition 110 reads the attach host's listener, which 325 edits on the LOCAL branch after the write; it must
  stay green unchanged.
- `conformance:farattach` (`remoteCreate`), `conformance:remoteclose`, `conformance:endtree` (`killSessionAdmitted`):
  unchanged, run green.
- `conformance:pocket`, `conformance:pocket:hostile` (the `onInput` seam): unchanged, run green.
- `gate:electron` (the integrator's numbers), `gate:background`, `gate:knownhosts`, `gate:checks` (test files added),
  `gate:contract` (byte for byte), `conformance:harnessprobes` (`detection.ts`; inside `npm run build`).

## 8. The app runs

- **`probe:p353:records`** (new, `build/p353/probe-records.mjs`, `records`): one Electron through the helper, a scratch
  profile, `HOME` and socket, every probed agent hidden (shell sessions only). Arm R302 (302's arm 2): one real local
  shell session per trial, ended and removed through the shipping bridge at each interval of the grid, the row read back
  through `sessions:list` and `sessions:listRemoved` and the scratch manifest read with `/usr/bin/sqlite3` after the run;
  the reap path driven by ending the pane's process from outside the app (the pane dies, the monitor reports it) with the
  Remove fired inside the next tick. Arm R305: End a shell session, press Restart through the bridge, fire Remove through
  the bridge inside the create's await, read both lists and the manifest. Each arm at HEAD and at a built parent
  (`P353_PARENT_CHECKOUT`, one Electron after the other, never at once). `--grader-self-test` grades recorded fixtures and
  starts nothing.
- **`probe:p353:status`** (new, `build/p353/probe-status.mjs`, `status`), in `probe:p321`'s shape: stand-ins from
  `build/p321/stand-in.mjs` resolved under their bare names (UNREADABLE, exit 2, unless the scratch login shell resolves
  each to the stand-in), every probed agent row but the stand-ins hidden, no Tortie window focused so the poll runs at 2 s
  (driven and measured as `probe:p321` does it). 325's arms a to e (his words through the renderer's own path, xterm over
  the DevTools protocol, never `send-keys`; a real question after an answering key; Phase 141's resume in place then the
  stand-in's gate; the same instant at the delays of D325-10; the window losing focus while a real question is drawn),
  and a restore whose replayed snapshot ends on gemini's committed trust gate (D325-8). 328's arms a to e on the real
  `antigravity` row launched by its bare name `agy`, which must resolve to the stand-in (the stand-in gains the 15-byte
  writes every 2.0 s and an `Ss+` tool under `/usr/bin/script`, both ended by pid in its `finally` and the probe's). Each
  arm at HEAD and at the parent, one after the other.
- **`probe:p353:starts`** (new, `build/p353/probe-starts.mjs`, `starts`): one Electron at HEAD and one at the parent, one
  after the other, on this Mac and over the loopback machine (`build/with-scratch-machine.mjs`,
  `SCRATCH_MACHINE_QUIET_SHELL=1`, far tmux 3.6a and 3.7b by its own variable): a shell session created and restored in
  each name of §2.6's corpus (the `#(` name with a harmless echo into the scratch), graded by the far or local
  `#{pane_current_path}` read on the run's own scratch socket; a launch flag ending in `;` reaching a stand-in as typed
  (through a confirmed scratch `agents.json` row or the launch-defaults field, whichever the tree offers without his
  credentials); and mechanism 2's matrix: a stand-in pi row recorded by the PARENT build in `C#Tools` (its stand-in
  writes a conversation file where pi would, under the scratch `HOME`'s key for the folder the pane really ran in),
  restored by HEAD, which must start it where its file is, beside a row HEAD itself created, which must restore in the
  folder.
- **`probe:p292`** arm h and h2 (`terminal`), converted; on 3.7b and 3.6a; the parent through `P292_CHECKOUT`.
- **`probe:p167`** profile d and the starving arm (`terminal`), converted; parent and HEAD.
- **`probe:p209`** arms D and E (`terminal`), converted, as 295's regression check only.
- `probe:p95` and `probe:p284` (294's entry lists them), converted, once each at HEAD.
- Every run: one lock slot; the history stats before and after; the Electron count once at the end.

## 9. Builders, disjoint files, and the seams

### 9.1 The table (every file in exactly one list; a builder that must edit a file not in its list stops and names it)

| Builder | Files |
| --- | --- |
| **records** (302, 305) | `src/main/manifest/sessions-repository.ts`; `src/main/sessions/core.ts` (302's two re-reads ONLY; S1 and S2 are the integrator's); `src/main/restart/restart.ts`; `src/main/sessions/lifecycle-gate.ts`; `src/main/sessions/__tests__/p293-lifecycle-gate.test.ts`; `src/main/sessions/__tests__/p302-tombstone.test.ts` (new); `src/main/manifest/__tests__/p302-status-over-tombstone.test.ts` (new); `src/main/restart/__tests__/restart.test.ts`; `build/p293/conformance-manager.mjs`; `build/p293/manager-conformance-probe.mts` (only if the read half lives there); `build/p293/ablation.mjs`; `build/p353/probe-records.mjs` (new) |
| **status** (325, 328) | `src/main/attach/input-facts.ts` (new); `src/main/attach/attach-host.ts`; `src/main/activity/index.ts` (the barrel: `OWN_TEXT_MIN` for S2); `src/main/activity/monitor.ts`; `src/main/activity/state-machine.ts`; `src/main/activity/process.ts`; `src/main/agents/registry.ts`; `src/main/attach/__tests__/input-facts.test.ts` (new); `src/main/activity/__tests__/p325-own-words.test.ts` (new); `src/main/activity/__tests__/p328-writes-without-drawing.test.ts` (new); `src/main/activity/__tests__/p321-parent-rule.ts` (new, the shared parent copy; not a `.test.ts`); `src/main/activity/__tests__/p321-masking.test.ts`; `src/main/activity/__tests__/p321-shapes.test.ts`; `build/conformance-ownwords.mjs` (new); `build/p325/ablation.mjs` (new); `build/p328/ablation.mjs` (new); `build/p328/timeline.mjs` (new); `build/fixtures/questions/a-antigravity-timeline.json` (new); `build/p321/stand-in.mjs`; `build/p311/copy-drift.mjs`; `build/p353/probe-status.mjs` (new) |
| **terminal** (294, 295, 301) | `src/main/tmux/scroll.ts`; `src/main/scrollback/watch.ts` (only if `isDiscarding` must move); `src/main/tmux/history-lines.ts` (new); `src/main/capture/service.ts`; `src/renderer/terminal/scroll/TerminalScrollbar.tsx`; `src/renderer/terminal/scroll/drag-select.ts` (its comment); `src/renderer/terminal/scroll/surface.ts` (only if a test shows the renderer needs something on 3.7b, which the entry says it does not; say so if touched); `src/renderer/terminal/TerminalPane.tsx`; `patches/@xterm+addon-webgl+0.19.0.patch`; `src/main/tmux/__tests__/scroll.test.ts`; `src/main/tmux/__tests__/scroll.integration.test.ts`; `src/main/tmux/__tests__/history-lines.integration.test.ts` (new); `src/main/capture/__tests__/history-range.test.ts`; `src/renderer/terminal/scroll/__tests__/p292-honest-thumb.test.ts`; `build/p292/probe-p292.mjs`; `build/probe-p167-scale.mjs`; `build/probe-p209-selection.mjs`; `build/probe-p95-scroll.mjs`; `build/p284/probe-p284.mjs` |
| **starts** (354, Phase 350's terms) | `src/main/tmux/argument.ts` (new); `src/main/tmux/sessions.ts` (`createSession` only; S3 is the integrator's); `src/main/machines/remote-stamps.ts`; `src/main/machines/remote-sessions.ts` (`remoteCreateArgs` only); `src/main/machines/remote-restore.ts`; `src/main/restore/restore.ts`; `src/main/manifest/agents.ts`; `src/main/machines/remote-record.ts`; `src/main/agents/detection.ts`; `src/main/tmux/__tests__/p354-argument.test.ts` (new); `src/main/tmux/__tests__/p354-create.integration.test.ts` (new); `src/main/restore/__tests__/p354-folder-as-recorded.test.ts` (new); `src/main/manifest/__tests__/p354-contract-marker.test.ts` (new); `src/main/agents/__tests__/p350-pi-bare-name.test.ts`; `src/main/machines/__tests__/remote-sessions.test.ts` and `remote-restore.test.ts` (only if a pin moves); `build/conformance-agents.mjs` (with S4); `build/agents-conformance-probe.mts`; `build/p331/ablation.mjs`; `build/conformance-machines.mjs` and `build/machines-conformance-probe.mts` (only if a pin moves); `build/p353/probe-starts.mjs` (new) |
| **INTEGRATOR** | `CLAUDE.md`; `CHANGELOG.md`; `build/verification-checks.mjs`; `package.json`; `build/assert-electron-teardown.mjs`; `src/main/tmux/index.ts` (S3); and, AFTER their builders return, the seams S1 and S2 in `src/main/sessions/core.ts` and S3 in `src/main/tmux/sessions.ts` |

### 9.2 The seams, stated exactly so the four build at once

- **S1 (integrator, `core.ts:1189-1190`, after `records` and `status` return).** The attach host's options become
  `onInput: (sessionId, facts) => { replyTurns.bump(sessionId, 'desk'); this.activity.noteOwnText(sessionId, facts); }`.
  `conformance:pocket` Y13 still reads one `'desk'` bump in `onInput`; Y17 still reads one call in the host.
- **S2 (integrator, `core.ts`, the restore wrapper that awaits `restoreSessionInTmux` at `:2021`).** After a restore
  whose outcome says the snapshot was replayed (`kind === 'transcript'`, or the `replayed` flag of S5), and before the
  restore's success is broadcast: `this.activity.noteOwnText(rec.id, { chars: OWN_TEXT_MIN, submitted: false, inPaste:
  false })`, `OWN_TEXT_MIN` imported from the activity barrel.
- **S3 (integrator, after `terminal` and `starts` return).** Delete `PaneExtent` and `readPaneExtent`
  (`sessions.ts:333-361`), `CapturePaneOptions.range` and its arm (`:278-286`, `:313-317`, the comment above
  `capturePane` that names a range), and their exports (`src/main/tmux/index.ts:220`, `:226`); the last-N arm byte for
  byte. `npm run typecheck` must then pass with nothing else touched; a remaining caller is a finding.
- **S4 (`starts` writes it for `status`).** `build/conformance-agents.mjs`: `writesWithoutDrawing` and `terminalTools`
  join `P321_FIELDS`' sibling list of names the overlay may never carry (`:1916`), its driven refusals (`:2074-2080`: a new
  agent carrying them; antigravity patched with them, each `refused` with the field `activity`), and its floor rows
  (`:2238`: neither on `SHELL_ACTIVITY` or `DEFAULT_ACTIVITY`). Each new clause asked again over an in-memory copy with
  its rule broken.
- **S5 (`starts` writes it for `status`).** If `restoreSessionInTmux`'s outcome cannot already say that the snapshot was
  replayed, its replaying arms gain `replayed: true` (`restore.ts:1145-1163`, `:1247-1268`); the builder states which.
- **S6 (integrator).** `HELPER_USER_FLOOR` 180 → 183 and `OPERATOR_ARGV_CEILING` 98 → 94
  (`build/assert-electron-teardown.mjs:573`, `:627`); the commit body names the three new probes and the four converted.
- **S7 (integrator).** `package.json`: `"probe:p353:records": "npm run build && node build/harness-socket.mjs --fresh
  gmux-p353r 'node build/p353/probe-records.mjs'"`, `"probe:p353:status": "npm run build && node
  build/harness-socket.mjs --fresh gmux-p353s 'node build/p353/probe-status.mjs'"`, `"probe:p353:starts": "npm run build
  && node build/harness-socket.mjs --fresh gmux-p353t 'SCRATCH_MACHINE_QUIET_SHELL=1 node build/with-scratch-machine.mjs
  -- node build/p353/probe-starts.mjs'"` (the shapes each builder reports it needs win over these), `"conformance:ownwords":
  "node build/conformance-ownwords.mjs"`, `"ablation:p325": "node build/p325/ablation.mjs"`, `"ablation:p328": "node
  build/p328/ablation.mjs"`; each classified in `build/verification-checks.mjs` (`pure` for the gate and the two
  ablations, the probes as probes) so `gate:checks` reads both ways.
- **S8.** Every builder runs `npm test` under the history block with a scratch `HOME`; the four `/bin/ps` native tests
  fail there by design and are named, not counted. Builders run in one worktree at once: a typecheck error in a file of
  another builder's list is that builder's seam, named in the report, never fixed.

### 9.3 The builders' briefs (the workflow hands each its own)

**records**:

> THIS IS A BUILD. Build Phases 302 and 305 exactly as build/p353/SPEC.md §0.1 (302, 305), §1.1 D302-1 to D302-6 and
> D305-1 to D305-6, §2.4 and §4.1-§4.2 say, in the files of §9.1's records row only. 302: (1) in
> src/main/manifest/sessions-repository.ts `updateSession`, after the `clearRemovedAt` block (:408-410) and before the
> UPDATE, a patch carrying a status other than 'discarded' on a row whose merged `removedAt` is set keeps the row's own
> status, the rest of the patch is written, one log line names the id and the refused status, nothing throws; a comment
> cites D305-2's sentence. (2) src/main/sessions/core.ts `reapDeadSession`: immediately before its `updateSession`
> (:2718) re-read the row; a 'discarded' row gets no status write and no EVT_STATUS_CHANGED 'exited', one log line, and
> every other step stands; the guard at :2684 stays. (3) `killSessionAdmitted`: immediately before `setStatus(sessionId,
> 'exited')` (:3560) ask `endRefusal(this.manifest.getSession(sessionId))`; a refusal there means no status write and no
> 'exited' broadcast, the End resolves, `broadcastSessions()` and the tree ending still run; the gate at :3448 stays. Do
> NOT touch core.ts's onInput wiring (:1189) or its restore wrapper (:2021): those are the integrator's seams S1 and S2.
> (4) Tests: the interval sweep of §4.1 step 4 committed (the rig of §2.4's M302, whose scratch form is
> /private/var/tmp/tortie-wt/scratch/p353/spec/m302/m302-sweep.test.ts; read it as text), its expected table derived by
> hand and committed beside it; the clause's rows in src/main/manifest/__tests__/p302-status-over-tombstone.test.ts. 305:
> (5) `restartKeepsRow(record)` in src/main/sessions/lifecycle-gate.ts beside removeRefusal; (6) src/main/restart/restart.ts
>  reads the row again after the create and decides everything after it from that read (D305-1 to D305-5):
> a tombstone keeps the row and the replacement (`keptRemovedRow: true`, `oldRow: 'kept-removed'`, one log sentence), a
> failed kill keeps the row (`'kept-kill-failed'`), a vanished row deletes nothing and throws nothing (`'already-gone'`),
> liveness from the fresh status with 'discarded' terminal and 'unknown' live; (7) restart.test.ts keeps its 33 cases and
> gains the entry's grid with its hand-derived table; (8) build/p293/conformance-manager.mjs gains §4.2 step 5's rules and
> build/p293/ablation.mjs §4.1 step 5's and §4.2 step 5's arms, each red on its own rule, every file restored by sha256.
> (9) build/p353/probe-records.mjs per §8 (one Electron through build/electron-run.mjs inside harness-socket, a scratch
> profile, HOME and socket, `tmuxSocket` named, every probed agent hidden and agents:list read back, `--grader-self-test`
> that starts nothing, `P353_PARENT_CHECKOUT` for the parent, one Electron at a time). Refusals: no change to
> removeRefusal, endRefusal, asStatus, the two list filters, releaseSessionResources, discardSession, deleteSession, the
> schema or the IPC contract; nothing in src/main/machines/. Run, with exit codes: npm run typecheck; your vitest files
> and the full vitest under the history block with a scratch HOME (name the four /bin/ps native failures); npm run
> conformance:manager; npm run ablation:p293; npm run conformance:remoteclose; npm run conformance:endtree; node
> build/p353/probe-records.mjs --grader-self-test. Do NOT launch an Electron. package.json and
> build/verification-checks.mjs are the integrator's: report the lines you need. Report every file changed, every command
> with its exit code, and the history stats. Hard rules: SPEC §0.

**status**:

> THIS IS A BUILD. Build Phases 325 and 328 exactly as build/p353/SPEC.md §0.1 (325, 328), §1.1 D325-1 to D325-10 and
> D328-1 to D328-7, §2.5 and §4.3-§4.4 say, in the files of §9.1's status row only. 325: (1) src/main/attach/input-facts.ts,
>  pure, numbers and booleans only (D325-1); (2) attach-host.ts keeps `inPaste` per client and the ONE
> existing `onInput` call (after `client.pty.write(data)`, under `req.machine === undefined && !isPaneReport(data)`)
> carries the facts; (3) monitor.ts `noteOwnText(sessionId, facts)` through `ensureState`, committing nothing; (4)
> state-machine.ts: `ownText`, `ownMark`, `OWN_TEXT_MIN = 4`, `noteOwnTextOn`, and the rule of D325-6 beside the dialog
> line (`const dialog = numbered || shaped;` at :371 and the numbered line at :366 do not move; the mark is the screen
> hash the verdict already computes at :360), the dialog arm reading `dialog && !own`; `OWN_TEXT_MIN` exported from
> src/main/activity/index.ts for the integrator's S2. Do NOT edit src/main/sessions/core.ts:
>  wiring `noteOwnText` into core (S1) and noting a replayed restore (S2) are the integrator's. (5) The tests of
> §4.3 step 6; every existing activity test stays green unchanged. (6) build/conformance-ownwords.mjs, build/p325/ablation.mjs,
>  and build/p311/copy-drift.mjs's log rule reading input-facts.ts (§4.3 step 7). 328: (7) build/p328/timeline.mjs
>  and the REBUILT build/fixtures/questions/a-antigravity-timeline.json (D328-1: the corpus is gone; every
> number from the entry's own text or labels.json, each block naming its source; `--check` as D328-1 says); (8)
> registry.ts's two fields on antigravity's row only, comments corrected (D328-2); (9) clause A and clause B (D328-3,
> D328-4) in state-machine.ts and process.ts; (10) the tests and the two named amendments (§4.4 step 5, D328-6); (11)
> build/p328/ablation.mjs with the entry's eight arms. conformance:agents is the starts builder's file: it writes your two
> names there (S4); if restore's outcome cannot say a snapshot was replayed, the starts builder adds `replayed` (S5).
> (12) build/p353/probe-status.mjs per §8, stand-ins from build/p321/stand-in.mjs (which gains the 15-byte writes every
> 2.0 s and an Ss+ tool under /usr/bin/script, both ended by pid in finally blocks), refusing to run (exit 2) unless every
> stand-in's bare name resolves to the stand-in, every probed agent row but the stand-ins hidden, `--grader-self-test`
> starting nothing. Refusals: the entries' "What is NOT" lists whole; no constant, no status, no copy, no renderer change,
> no channel, no log of his bytes; agy is never launched. Run, with exit codes: npm run typecheck; your vitest files and
> the full vitest under the history block with a scratch HOME (name the four /bin/ps native failures); npm run
> conformance:choices; npm run conformance:handback; npm run conformance:phonecopy; npm run conformance:push; node
> build/conformance-ownwords.mjs; node build/p325/ablation.mjs; node build/p328/ablation.mjs; node build/p328/timeline.mjs
> --check; npm run ablation:p312; npm run ablation:p321; npm run conformance:pocket; npm run conformance:installs; node
> build/p353/probe-status.mjs --grader-self-test. Do NOT launch an Electron or any agent. package.json and
> build/verification-checks.mjs are the integrator's: report the lines you need. Report every file changed, every command
> with its exit code, and the history stats. Hard rules: SPEC §0.

**terminal**:

> THIS IS A BUILD. Build Phases 294, 295 and 301 exactly as build/p353/SPEC.md §0.1 (294, 295, 301), §1.1 D294-1 to
> D294-7, D295-1 to D295-5, D301-1 to D301-5 and D-P2, §2.1-§2.3 and §4.5-§4.7 say, in the files of §9.1's terminal row
> only. 294: the pure `refreezeWanted` beside parseState; `#{history_limit}` appended to the LOCAL format only
> (`REMOTE_STATE_FORMAT`, `STATE_FIELDS`, `PaneScrollState` and every ordered sequence byte for byte); the serial
> toward-live branch reading first and sending `send-keys -X refresh-from-pane` before the scroll only when the decision
> says so; scrollFrom's band and TerminalScrollbar's one re-send (D294-5; if a contract field is needed, stop that part
> and say so); the two comments; the tests of §4.5 step 4. 295: src/main/tmux/history-lines.ts (D295-2), service.ts per
> D295-3 importing it directly; do NOT touch src/main/tmux/sessions.ts or src/main/tmux/index.ts (the deletion of
> readPaneExtent and the range arm is the integrator's S3, and the starts builder owns sessions.ts); the comments; the
> tests of §4.6 step 4 including the opt-in integration test on 3.7b and 3.6a under a scratch TMUX_TMPDIR. 301: D301-5
> first, on a starved parent run (it needs an Electron: hold a lock slot; it is the one app run this brief allows, and
> the scratch copy recipe is /private/var/tmp/tortie-wt/scratch/p353/spec/m301/make-p167-copy.mjs with its P353_STARVE
> edit); then the hunk (D301-1, pristine bytes by reverse-applying the existing patch to a scratch copy, applied with node
> build/apply-patches.mjs), `term.blur()` before `term.dispose()`, the third owner and the starving arm in
> build/probe-p167-scale.mjs. D-P2: convert build/p292/probe-p292.mjs (hide every probed agent, read agents:list back;
> add arms h and h2 per §4.5 step 5 and §4.6 step 5), build/probe-p167-scale.mjs, build/probe-p209-selection.mjs,
> build/probe-p95-scroll.mjs and build/p284/probe-p284.mjs (each: its own -L gmux count and the finding it raises
> deleted, `tmuxSocket: socket` named on its launch unless it reads its scratch server after withElectron returns,
> every probed agent hidden with writeHiddenAgents and agents:list read back with standInsOnlyVerdict, a not-ok answer a
> finding); after the four lose their count, gate:electron's ceiling must read 94 (the integrator sets the constant: say
> what you count). Refusals: the entries' "What is NOT" lists whole (nothing moves a reader who is not scrolling; no
> re-freeze on a poll, a resize, a return or a timer; no version move of xterm or the addon; no timeout added to the idle
> queue; no Monaco service touched; no budget moved). Run, with exit codes: npm run typecheck; your vitest files and the
> full vitest under the history block with a scratch HOME (name the four /bin/ps native failures); GMUX_SCROLL_IT=1 and
> GMUX_CAPTURE_IT=1 integration tests on both tmux builds; npm run build (it carries gate:electron, gate:background,
> gate:knownhosts, gate:checks, gate:contract); the converted probes' own self-tests where they have them. The only
> Electron you launch is D301-5's, under a lock slot. Report every file changed, every command with its exit code, and the
> history stats. Hard rules: SPEC §0.

**starts**:

> THIS IS A BUILD. Build Phase 354 and the removal of Phase 350's two terms exactly as build/p353/SPEC.md §0.1 (354),
> §1.1 D354-1 to D354-6, §2.6 and §4.8 say, in the files of §9.1's starts row only. (1) src/main/tmux/argument.ts:
> `tmuxArgument(value)` (a final `;` sent as a backslash then `;`, Phase 349's rule moved from remoteStampArgs, which then
> calls it) and `tmuxFolderArgument(path)` (every `#` doubled except the `#`s of a run immediately followed by `[`, then
> `tmuxArgument`); nothing normalised, folded or resolved. (2) createSession (src/main/tmux/sessions.ts:174-184) and
> remoteCreateArgs (remote-sessions.ts:895-945): `-c` through tmuxFolderArgument, every `-e` pair and every argv element
> through tmuxArgument, and an optional `folderAsRecorded: true` that hands the folder exactly as recorded with no escape;
> the far env slot stays one element. Touch nothing else in sessions.ts: the deletion of readPaneExtent and capturePane's
> range arm is the integrator's S3 (a typecheck error in src/main/capture/service.ts naming readPaneExtent belongs to the
> terminal builder; name it, do not fix it). (3) The marker: `AgentRecoveryContract.folderHeld?: true` set by
> buildRecoveryContract (src/main/manifest/agents.ts:556) for every row and by the remote contract
> (src/main/machines/remote-record.ts:408); `folderAsRecordedFor(rec)` exported from restore.ts, true only for a row
> whose contract lacks the marker, whose folder tmuxFolderArgument changes, whose agent is not 'shell' and which has a
> resume to arm; restore.ts (:1083) and remote-restore.ts (:541) hand `folderAsRecorded` when it is true. (4) S5: if
> restoreSessionInTmux's outcome cannot already say a snapshot was replayed, add `replayed: true` to its replaying arms
> and say which. (5) src/main/agents/detection.ts: the guard at :684 loses `folder.includes('#')` and
> `folder.endsWith(';')`, its doc says why (§4.8 step 6). (6) Tests per §4.8 steps 7 and 8, the integration test opt-in
> (GMUX_ARG_IT=1) on scratch sockets under a scratch TMUX_TMPDIR, 3.7b and 3.6a, -f /dev/null and a copy of
> resources/gmux-tmux.conf, today's composition as the control that must read 118 of 180; the `j#(…)` name with a
> harmless echo into the scratch only. (7) build/conformance-agents.mjs 11.11 flipped (D354-5) AND S4 (the status
> builder's two names); build/agents-conformance-probe.mts's N60, N61, N65, N66 rows read `holds`; build/p331/ablation.mjs
> without P42 and P44. (8) build/p353/probe-starts.mjs per §8 (the loopback machine through
> build/with-scratch-machine.mjs with the quiet shell; never smoke:remote or smoke:machines; its own scratch pi stand-in
> written at run time; `--grader-self-test` that starts nothing). Refusals: no change to how a folder is chosen, typed or
> stored (the cwd column untouched); no escape of any character the measurement does not show tmux reading; Phase 349's
> name rule untouched; nothing under ios/. Run, with exit codes: npm run typecheck; your vitest files and the full vitest
> under the history block with a scratch HOME (name the four /bin/ps native failures); GMUX_ARG_IT=1 on both builds; npm
> run conformance:agents; npm run ablation:p331; npm run conformance:machines; npm run conformance:farattach; npm run
> conformance:shellenv (restore.ts is its call site); npm run conformance:installs; the self-tests of conformance:resume, being its vitest files under
> src/main/conformance/__tests__/ (inside npm test; never conformance:resume:capture itself, which starts real agents:
> the main session's at landing); node
> build/p353/probe-starts.mjs --grader-self-test. Do NOT launch an Electron or sshd. package.json and
> build/verification-checks.mjs are the integrator's: report the lines you need. Report every file changed, every command
> with its exit code, and the history stats. Hard rules: SPEC §0.

## 10. The proof, run rather than read

Every item is Tier 3: the gates, real data or a per-row matrix, TWO independent methods one of which is an attack, the
parent measured, a fix round if any verdict is needs_work and an independent reverify of that fix. Three lenses review
together (the phase section's lane); each names, in its verdict, the step it took that the builder did not.

### 10.1 What each builder runs before it returns

The commands in its brief (§9.3), each with its exit code and PASS line, and the history stats before and after.

### 10.2 Lens R: the records (302, 305) and where a session starts (354)

- **302, the parent measured**: the committed sweep (§4.1 step 4) at the parent's tree and at HEAD; the parent's cells
  read as §2.4 does (both writers `exited` over a tombstone), HEAD's as `discarded`, Past, in every cell. Arm R302 of
  `probe:p353:records` at both builds.
- **302, re-derive** (method 1): the verifier's OWN census of every path that can write `sessions.status`, from the tree
  with the TypeScript parser and not from this spec (every `UPDATE sessions` statement, every call of `updateSession`,
  `updateSessionDurably`, `setStatus`, `setRestoreResult`, `insertSession`, every `'restorable'` literal under
  `src/main`), against §0.1 302 item 4's numbers; a writer this spec missed is the finding.
- **302 and 305, the attack** (method 2): the manifest attack of the phase section, every interleaving of End, Remove,
  Restart and the boot pass (`core.refresh()`'s reconcile) over planted rows in a real store, plus 305's list (a Remove
  during the create's await and during the kill's, from a second window, from the session manager while the rail's menu
  holds the restart, a row deleted between the two reads, a `restorable` row, and the smoke and conformance sweeps that
  must still collect tombstoned scratch rows, by `npm run smoke:t1` and the conformance sweep's own scratch run); no row
  lost and none in the wrong list, at HEAD as at the parent.
- **305**: the entry's no-regression table at the parent and at HEAD through arm R305 (an ended row's restart deletes
  it; a saved row comes back armed; the Remove inside the create keeps the Past entry; Restore from Past; the 90 day
  prune; the sweeps).
- **354, the parent measured**: `probe:p353:starts` at both builds: every corpus name created and restored on this Mac
  and on the loopback machine with 3.6a and 3.7b far, graded by `#{pane_current_path}`; the parent's readings equal
  §2.6's raw row, HEAD's 0 wrong.
- **354, the attack**: the hostile fixture of the entry (every format sequence tmux knows: `#{`, `#[`, `#(`, `##`,
  `#T`, `#S`, `#H`, a trailing `#`; every ending: `;`, `\;`, `\\;`; the link whose own name ends in `\;`; names that must
  stay literal), plus the verifier's own names (a run of `#` before `[` at the start and the end, `#[` inside a `#{…}`,
  `\` before `#`, a 255-byte name, a name whose expansion EXISTS as a twin folder at the parent); a launch flag ending in
  `;` reaching the agent as typed; the `#(` job never started at HEAD with a client that stays alive.
- **354, re-derive**: the verifier's own reading of 3.7b's `format.c` and `cmd-parse.y` (the source is in
  `build/vendor/tmux/cache/tmux-3.7b.tar.gz`) against D354-1, and its own composer compared with the shipped one over a
  seeded random corpus run through real tmux on both versions.
- **354, mechanism 2's matrix**: per agent with a resume, a row the PARENT created in an affected folder and a row HEAD
  created, each restored by HEAD; the pre-fix row starts where its stand-in conversation is, the post-fix row in the
  folder; no conversation lost. Q9's alternative is not built.
- Gates: `conformance:manager`, `ablation:p293`, `conformance:remoteclose`, `conformance:endtree`,
  `conformance:farattach`, `conformance:agents`, `ablation:p331`, `conformance:machines`, `conformance:shellenv`,
  `conformance:installs`, `gate:contract`.

### 10.3 Lens S: status (325, 328)

- **325, the parent measured, through the path his keys take**: the verifier's own harness drives the shipping monitor
  and the attach host's tap at the parent and at HEAD over scratch panes on its own socket, his text written to the pane
  AND handed to the tap as the app hands it (a harness that only runs `send-keys` tests nothing here), over the committed
  idle windows of every screen-read row and a plain bash prompt, typed key by key and pasted, at 1 s and 2 s over at
  least 10 tick phases; the parent reproduces §2.5, HEAD raises `needs_input` on none, per row, every rate with its
  denominator; grok and antigravity reported as the masks they are.
- **325, the floor over committed recordings** (method 1, run over real data): the verifier's own replay of every
  committed question window with `labels.json`'s times, every question the parent raises raised by HEAD no later than the
  parent's median plus one tick, 0 `needs_input` ticks at HEAD the parent did not read; the rows the rule could make
  worse (the entry's (a) to (e)) measured and never hidden, (c) at D325-10's delays, every cell the parent raises and
  HEAD does not reported with its delay.
- **325, the attack** (method 2): every byte shape that is not text through the real listener into a blocked and an
  unblocked session (focus leaving and returning while a real question is drawn, colour and device reports, SGR and X10
  mouse, empty paste markers, an IME composition, a paste split over two messages, text queued while scrolled back); his
  words finishing rows the agent drew; typed ahead while the agent works; left in the input row while the agent draws a
  real question (must raise); a seventh session while six are blocked; his words never kept (a planted log call on the
  listener's data, on the counter's input and on a string handed into `src/main/activity/`, each turning
  `conformance:ownwords` or `conformance:phonecopy` red, beside a control log call that stays green).
- **328, re-derive** (method 1): from the rebuilt timeline and the process table alone, by a method of the verifier's
  own, why the parent read each antigravity tick `working`, and that HEAD differs on exactly the ticks where the reason
  was output alone.
- **328, over every committed recording** (method 2, a replay harness the verifier writes itself): every agent but
  antigravity equal to the parent transition for transition; antigravity `idle` on every rest tick; every `needs_input`
  tick, capture and `ps` equal; the five named boundaries and none at rest.
- **328, the attack**: his words under the writes (equal `needs_input` to the parent in every cell, 325's rule asked
  apart); the silent tool at 4, 1 and 0 percent CPU (clause B carrying it, red with it ablated); a terminal child left
  alive at rest; Tortie's own hand (a resize, copy mode, a restart under a resting agy); a turn outside the probe window
  at 2 s; a version that draws at rest (a stated limit).
- `probe:p353:status` at both builds (§8).
- Gates: `conformance:choices`, `conformance:handback`, `conformance:phonecopy`, `conformance:push`,
  `conformance:ownwords`, `conformance:agents` (S4), `conformance:installs`, `conformance:pocket`,
  `conformance:pocket:hostile`, `conformance:machines` (condition 110), `ablation:p312`, `ablation:p321`,
  `ablation:p325`, `ablation:p328`.

### 10.4 Lens T: the terminal (294, 295, 301), live beside the parent

- **294**: `probe:p292` arm h at the parent and HEAD on 3.7b and 3.6a (red at the parent, green at HEAD on 3.7b; 3.6a
  equal to the parent); every row of `3f0f0f54`'s side-by-side and the new rows (the way down while printing,
  ⇧PageDown, the drag's band, a quiet pane, a history at its limit, an alternate screen, the server's worst stall and
  notches to live); a row worse at HEAD is dropped, notches to live excepted (Q1). The server's cost by Phase 13.7's
  method (the worst round trip a second client sees at 20 Hz while a reader comes back over 100,000 lines). The attack:
  a history at the band's edge and one each side; ⌘K while parked then printing past the frame; a taller window after a
  trim; an agent-shaped fixture redrawing a prompt area; a selection held across a re-freeze and one edge-scrolling
  across it; a trackpad fling; a split with two parked panes; a session switch halfway down; a session on the loopback
  machine (byte for byte the parent's).
- **295**: the integration test at both builds (the parent's pair off at about 80 lines a second, HEAD 0); arm h2 at both
  builds; the no-regression table of the entry; the attack (a start more than 32,767 rows below the top, a Clear between
  selecting and copying, the alternate screen, a pane parked in copy mode, a pane that dies between parse and run, a trim
  between selection and copy); the re-derivation with the verifier's own counter and a ruler of its own.
- **301**: the deterministic clause (the third owner present in the built bundle at HEAD, absent at the parent, and red
  when the hunk is reverted and the renderer rebuilt: the independent-revert proof of Phase 265); the starving arm at the
  parent (red: §2.3 measured `canvas x36` then `canvas x72` with message tasks, 36 a block of 12 ended sessions, and the renderer up 43 then 67 MB) and at HEAD (the census at its floor); profile
  d at both builds with the per-block `canvas xN` line compared block by block, not the verdict; the planted control
  intact and unweakened on both; the attack aimed at the entry's conclusion (idle time given back between blocks at the
  parent, where the census must return by itself, which is the entry's account of the intermittency; and
  `P167_PROFILES=d` alone, which never opens the editor, so the Monaco holder is absent there); the no-regression
  side-by-side of the entry (a pane opened, focused, typed into, split, scrolled, right-clicked, closed while holding the
  keyboard and closed while not: the keyboard lands where it lands at the parent, and no pane loses its glyphs to a
  cleared warm-up).
- Gates: `npm run build` (gate:electron's new floor and ceiling, gate:contract byte for byte), `gate:checks`,
  `probe:p95` and `probe:p284` once each at HEAD.

### 10.5 At the end, once

The Electron count of CLAUDE.md (`ps -Ao pid,ppid,rss,comm | grep -E "[E]lectron|Tortie$|chrome_crashpad" | grep -v
defunct`; his `/Applications/Tortie.app` and other apps' crashpads are not ours), no `p353` socket left under a scratch
`TMUX_TMPDIR` or `/private/tmp/tmux-501/`, no loopback sshd of ours, every lock slot released, the history stats.

## 11. The integrator's commands (in order; each with its exit code and PASS line in the report)

1. `df -h /` (8 GB or more free); `stat -f '%z %m' ~/.zsh_history ~/.bash_history`; `shasum -a 256 src/main/menu.ts`
   (recorded; it must read the same at step 30).
2. Reconcile §9.2: apply S1 and S2 in `src/main/sessions/core.ts` and S3 in `src/main/tmux/sessions.ts` and
   `src/main/tmux/index.ts`; confirm S4 and S5 landed as the `starts` builder reports; S6 in
   `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR = 183`, `OPERATOR_ARGV_CEILING = 94`, each with the comment
   naming the scripts); S7 in `package.json` and `build/verification-checks.mjs`.
3. `CHANGELOG.md`: §5's `## Unreleased` and its seven items, above `## 0.114.0`.
4. `CLAUDE.md`, the rows only (no history): `conformance:manager`'s row gains `src/main/restart/restart.ts` and one
   clause (a removed row keeps its status and a restart never deletes it); `conformance:agents`'s row gains the two 328
   names among those the overlay may never carry, and says 11.11 now requires the bare-name guard to name no `#` and no
   `;` term because the create holds back what tmux reads (Phase 353); `conformance:phonecopy`'s row gains
   `src/main/attach/input-facts.ts`; a NEW row for `conformance:ownwords` (its paths: `src/main/attach/input-facts.ts`,
   the `onInput` call in `src/main/attach/attach-host.ts`, `noteOwnText` in `src/main/activity/monitor.ts`, the own-text
   rule in `state-machine.ts`; `ablation:p325` the attack beside it); the reply row's `onInput` sentence says it carries
   counts for the activity monitor and never a byte; `conformance:choices`' row says `ablation:p328` beside the rule's
   output clause; the probe table gains `probe:p353:records`, `probe:p353:status` and `probe:p353:starts`, and the
   `probe:p292` and `probe:p167` rows their new arms and that each now hides every probed agent and counts nothing
   itself. Nothing else.
5. `npm run typecheck`
6. `npm run build` (carries `gate:electron` 183 and 94, `gate:background`, `gate:knownhosts`, `gate:checks`,
   `gate:simulator`, `conformance:harnessprobes`, `gate:contract` byte for byte)
7. `npm test`, under the history block with a scratch `HOME` (the four `/bin/ps` native failures named, nothing else
   red; the conformance resume's own vitest files, `src/main/conformance/__tests__/*`, are inside it)
8. `npm run conformance:manager`
9. `npm run ablation:p293`
10. `npm run conformance:remoteclose`
11. `npm run conformance:endtree`, then `npm run ablation:p323` (the attack beside it; `killSessionAdmitted` moved)
12. `npm run conformance:farattach`
13. `npm run conformance:choices`
14. `npm run conformance:handback`
15. `npm run conformance:phonecopy`
16. `npm run conformance:push`
17. `npm run conformance:ownwords`
18. `npm run ablation:p312`, `npm run ablation:p321`, `npm run ablation:p325`, `npm run ablation:p328`
19. `npm run conformance:agents`, `npm run conformance:installs`
20. `npm run ablation:p331` (P42 and P44 gone, every remaining arm red on its owners)
21. `npm run conformance:machines`, then `npm run ablation:p320` (condition 110's attack; the listener it reads moved),
    under a lock slot if the script asks for one
22. `npm run conformance:shellenv`
23. `npm run conformance:pocket`, `npm run conformance:pocket:hostile`, then `npm run ablation:p313` (Y17's attack)
24. The opt-in integration tests, under the history block, `TMUX_TMPDIR` under the scratch, on the vendored 3.7b and
    Homebrew's 3.6a (`GMUX_TMUX_BIN`): `GMUX_SCROLL_IT=1`, `GMUX_CAPTURE_IT=1`, `GMUX_ARG_IT=1`
25. The three new probes' `--grader-self-test` (they start nothing)
26. `npm run smoke:t1`, under a lock slot
27. `npm run package:dir -- -c.mac.identity=null`, UNSIGNED, with `build/p351/SPEC.md` §9.1's `env -u` line and a
    scratch `HOME`, under a lock slot
28. NOT run here, the main session's at landing: `npm run conformance:resume:capture` (it starts real agents to their
    first screen), and the `smoke`/`smoke:t3` pair (they start `electron .` outside `build/electron-run.mjs`)
29. `git -C /private/var/tmp/tortie-wt/wt-p353 diff --stat b1a557b8` (only §9.1's files and this SPEC)
30. `shasum -a 256 src/main/menu.ts` (the same as step 1); the end-of-run count (§10.5); `stat` again.

## 12. What is NOT in this phase

- Nothing an entry refuses; each entry's "What is NOT in this phase" carries whole: 294 (a keystroke still goes to live
  at once; nothing moves a reader who is not scrolling, no re-freeze on a poll, a resize, a return or a timer; a history
  at its limit keeps today's jump; no words, badge or marker; no scrollbar look; remote unchanged); 295 (Phase 292's
  other limit, the press-time pin, a selection held across a full history, the emoji pad cell, in-screen selections and
  every last-N caller, the local verb guard, remote copies, no channel); 301 (no xterm or addon version move, no timeout,
  no repair of the profile-c owners, no budget move, no Monaco service touched, no third-party module); 302 (no change
  to `removeRefusal`'s pass set, `endRefusal`'s declined case, `asStatus`, the list filters or `releaseSessionResources`;
  no schema change, migration, column or CHECK constraint; nothing in `src/main/machines/`); 305 (no reaper, timer, idle
  limit or close hook; no refusal in `core.discardSession` or `manifest.deleteSession`; an ordinary ended row's restart
  still deletes it; no remote restart); 325 (no change to the numbered verdict, the shapes or the foreground gate, the
  release, what his typing does to running and idle; no copy of his words anywhere; no renderer change, channel or
  preload change; no constant moved; no phone write route; nothing for text Tortie cannot see; no live agent); 328 (no
  `animatesWhenIdle: true`; no `needs_input` reading moved; no question turned amber; no reading of bytes, no period
  constant; no other agent; no list of process names; no constant moved; no fold change; no launch of agy; no
  configuration route); 354 (no change to how a folder is chosen, typed or stored; no escape of a character the
  measurement does not show tmux reading; nothing under `ios/`).
- No release, tag, version bump, archive or upload. Nothing under `ios/`. 327, 319 and 318.1 are not in this phase.
- No widening: the far copy's two calls (295), the far env slot's pairs (354) and the far `send-keys -l` text a resume
  types are found, not built (§13).
- An item whose reverify still answers needs_work is dropped from the commit and taken back to him; the rest lands.

## 13. For the main session at landing

- **Found, not this phase's, owed an entry**: (1) a copy from a session on another machine has 295's two-call shape over
  two far round trips (`readRemoteHistoryRange`, `src/main/machines/remote-pane-history.ts:178-214`); (2) the far env
  slot's pairs are composed by the far login shell from far values, so a far value ending in `;` would end that create
  (`src/main/machines/remote-env-carriage.ts`); (3) a folder named with `#(…)` started a tmux job on the parent whenever
  the asking client lived long enough (M354c): 354 closes it for every create Tortie composes; whether any other path
  hands tmux a person's text as a format is unread, and an audit of every `-F`, `-c` and `display-message` composed from a
  person's text is owed.
- **Found by the verify lenses, not built, owed or stated (the fix round, 2026-11-05)**: (4) **the ssh control socket's
  bound** (`CONTROL_PATH_MAX_BYTES = 100`, `src/main/machines/ssh.ts`) accepts a path OpenSSH cannot bind, because it binds
  the path plus a 17-byte temporary suffix and a socket path holds 104 bytes; under a long `TMPDIR` every command to another
  machine fails (`unix_listener: … too long for Unix domain socket`, rc 255) and Prepare says the far tmux "would not report
  its version". The same at the parent; a person with macOS's own `TMPDIR` (about 74 bytes with the suffix) is unlikely to
  meet it. Owed its own entry: leave room for the suffix, so a long `TMPDIR` falls through to `/tmp/tortie-<uid>`.
  `probe:p353:starts` now hands the app a short `TMPDIR` of its own. (5) **325's typed-ahead words, and words on a screen the
  agent keeps redrawing**: the mark is the WHOLE screen's hash (D325-5), so his dialog-shaped words read as the agent's
  question once that screen changes after his burst closed, as at the parent: typed ahead while the agent works (680 of 720
  cells at both builds, the status lens) and an agent that repaints at rest (a clock every 5 s, 300 of 300 at both). The
  entry's mechanism 6 meant the MATCHED ROWS' hash; the fix round did not move to it, because the same mark would also keep a
  real question drawn within about 2 s of his last key grey until he answers it, even when the agent redraws (D325-10's
  trade made larger: Gemini's trust gate, raised at 13.3 s, and qwen's first permission, at 5.3 s, would not be raised at
  all). Q10 asks him; owed its own entry whichever he chooses. (6) **A pause of more than `QUIET_MS` right before the
  character that completes his dialog** leaves that character in a burst of fewer than four, so his words read as a
  question: 0 of 100 cells at a 1.5 s pause, 30 of 100 at 2.5 s, 95 of 100 at 4 s (the parent 100 of 100). A stated limit.
  (7) **A replay the shell prints 2 s or more after S2's note** closes the note's burst on the stamp, and a replayed
  question is raised as at the parent (20 of 30 cells per delay at 2.0 and 3.0 s, 0 up to 1.2 s); his own shell's startup
  time decides it and is not ours to read. A stated limit. (8) **Phase 318's reply writer hands no count**, named in
  `conformance:ownwords` clause 11's `COUNT_EXEMPT`: its say always submits his message with Return, and its press types the
  agent's own one digit, below `OWN_TEXT_MIN`, so neither can leave his words unsubmitted in an input row. (9) **On tmux
  3.6a a held selection's ⌘C is the renderer's own estimate of the frame**, which 3.6a does not name, so it is off by the
  lines printed between the park and the renderer's read of the history: one line and twenty-three lines in two runs at
  HEAD, every press the same range, and nineteen lines with two ranges at the parent (`probe:p292` h2 with
  `GMUX_TMUX_BIN` at Homebrew's 3.6a); on 3.7b, which Tortie ships and which names the frame, it is exact (0 of 20).
  Development builds only, not this phase's (Phase 292's and 209's renderer), and owed nothing unless a packaged Tortie
  ever runs a tmux that does not name the frame. (10) **A paste from the phone into a program that did not ask for
  bracketed paste** submits its lines there (tmux sends each line feed as a carriage return), and the count says no submit;
  every agent Tortie reads, and both shells, ask for bracketed paste, so a person is unlikely to meet it. A stated limit.
- `conformance:resume:capture` at landing, as CLAUDE.md's table names for `restore/**` and `agents/registry.ts`, with
  the real agents to their first screen and no turn.
- The commit body names: the three new probes (`HELPER_USER_FLOOR` 183), the four converted probes
  (`OPERATOR_ARGV_CEILING` 94), and every red-on-purpose row of §6.
- Scratch to remove after landing: `/private/var/tmp/tortie-wt/scratch/p353/` (the spec step's holds the four app runs'
  harness folders under `m301/tmp*`, the scratch tmux sources, and `home/`).

## 14. Questions for him (the main session asks; the build proceeds on the defaults)

- **Q1 (294).** Scrolling back down now passes through everything the agent printed while you read, so reaching the
  bottom by the wheel takes as many lines as were printed (34 notches became 99 in the measurement; in the app, 10 notches
  became 30 by the wheel and 3 became 7 by ⇧PageDown); typing, or the scrollbar's foot, still takes you to the bottom at
  once. Is that fine (the default), or should the wheel jump once you have passed what you read? **The cost the terminal
  lens measured, for the same ruling (option A's one clone per catch-up):** each re-freeze copies the history as a park
  does (25.3 ms against 23.6 ms an operation at 100,000 lines on 3.7b; 38.4 against 26.5 on 3.6a), a way down over 100,000
  lines makes 3 to 4 of them where the parent makes none, and the worst round trip a second session's client saw during
  that way down rose from a median of about 7.5 ms to about 27 ms over 10 runs; the largest single stall is the same size
  (73 ms against 67 ms at most). Accepted with option A (the default), or should the re-freeze be rarer?
- **Q2 (294).** On tmux 3.6a, which only a development build runs, the way down keeps today's jump (the default), or
  should it use the second method the entry describes, which can land a line off on a busy pane?
- **Q3 (295).** The copy is built as one tmux call in which tmux works out the lines itself, the entry's recommendation,
  measured exact at every rate. Agreed (the default)?
- **Q4 (325).** When your typed words and an agent's real question reach the screen at the same moment, the question is
  taken for your words and stays grey until the agent draws again (the default), or would you rather a false amber there?
  **THE PHASE DOES NOT LAND UNTIL HE RULES** (the entry's proof (c): "if any such cell exists, the row goes to him with the
  default above"). The status lens's numbers, both builds' shipped monitors on one clock: a real question drawn 1.0 s or
  less after his last key (any text of 4 characters or more, an ordinary prompt included) is never raised while it stays on
  the screen (200 of 200, 240 of 240 and 320 of 320 cells); lost at 1.2, 1.4, 1.6, 1.8 and 2.0 s, 80, 60, 40, 20 and 0
  percent. Per recorded question with its own redraws, drawn 0.5 s after an ordinary prompt: Claude Code 2.1.280's trust
  gate (its registry file missing), Codex's update prompt and qwen's second permission were never raised before his
  recorded answer (35.9, 36.3 and 62.5 s later), where the parent raised each at a median of 3.3 to 4.3 s; Gemini's trust
  gate was raised at 13.3 s against 3.3 s, qwen's first permission at 5.3 s against 4.8 s. The CHANGELOG item says so on the
  default ("a question the agent asks within about two seconds of your last key may not show until it draws again"). Since
  the fix round the same holds for what he types or pastes from his iPhone, whose keys and paste now hand the same count.
- **Q5 (302).** Rows your Mac may already hold that read ended with a removal date stay as they are (the default; we may
  not read your manifest to count them), or should Tortie move any it finds back to Past Sessions once?
- **Q6 (328).** The only Antigravity recording was in a folder macOS has since cleaned, so its tests run on a timeline
  rebuilt from the numbers measured when it was made (the default), or wait for a new recording, which needs Antigravity
  to run (it updates itself when it runs)?
- **Q7 (354).** The fix is measured on tmux 3.6a and 3.7b, the two on this Mac; the other seven versions Tortie accepts on
  another machine rest on Phase 349's measurement of the same rules for session names. Fine (the default), or should we
  download and build the other seven to measure them too?
- **Q8 (328).** Antigravity's own questions, which Tortie cannot read as questions, now show as idle rather than running
  (the default, as the entry proposed), or keep them reading running?
- **Q9 (354).** A session started before this update in a folder with a # in its name ran in your home folder, so its
  agent saved the conversation there; when restored it starts there again so the conversation is found (the default).
  Claude Code, Grok and omp were measured finding a conversation from another folder, so their sessions could move to
  the right folder instead: should they (default: no, every agent restores where it ran)?
- **Q10 (325, the fix round).** Words you typed while the agent was still working, or that sit on a screen the agent keeps
  redrawing, still turn the session amber once the screen changes, as today (680 of 720 and 300 of 300 cells at both
  builds). Keeping them yours means remembering the rows your words drew rather than the whole screen, and then a real
  question the agent draws within about two seconds of your last key stays grey until you answer it, even when the agent
  redraws (today's default keeps it grey only until the screen changes). Keep the default (today's reading for typed-ahead
  words, the smaller trade), or remember the rows (typed-ahead words stay yours, the larger trade)?

## 15. The spec step's commands, exit codes and numbers

| # | Command (scratch `/private/var/tmp/tortie-wt/scratch/p353/spec/`) | Exit | Numbers |
| --- | --- | --- | --- |
| 1 | `npm run build` (history block) | 0 | 53 s; `[electron-teardown] 573 files … 180 … floor of 180`; `[background-teardown] 575 files … 3 start … 32 of 32`; `[known-hosts] 603 files`; `assert-hermetic-checks: PASS. 277 check scripts`; `conformance:harnessprobes` 6 and 16; contract inventory OK |
| 2 | `m354/m354.mjs` (history block; 8 scratch servers ended in a `finally`) | 0 | 45 names × 4 configurations × 4 rules; not the folder: today 118 of 180, final `;` alone 94, every `#` doubled 20, D354-1 **0** |
| 3 | `m354/m354-job.mjs` | 0 | client exits at once: no job (2 of 2); client kept 2 s: the job ran (2 of 2) |
| 4 | `m354/m354-argv.mjs` | 0 | today: `P353-INJECTED` printed by the server on 3.7b and 3.6a, the pane got `flag`; escaped: four arguments, nothing ran |
| 5 | `m354/m354-quote.mts` (pinned tsx) | 0 | 4 of 4 shells byte for byte |
| 6 | `m354/resume-table.mts`, `m354/idcapture.mts` (pinned tsx; compiled data only) | 0 | 15 registry rows |
| 7 | `m295/m295.mjs` | 0 | §2.2 |
| 8 | `m294/m294.mjs` | 0 | §2.1 |
| 9 | vitest `m302/m302-sweep.test.ts` (scratch config) | 0 | 161 cases, 17.5 s; `m302/m302-cells.txt` |
| 10 | vitest `m302/m325-m328.test.ts` (scratch config) | 0 | 14 cases; `m302/m325-m328.txt` |
| 11 | `m301/make-p167-copy.mjs` (four outputs) | 0 | 6, then 7, 8 and 9 edits, each asserted; the plain copy diffed against the committed probe: exactly the six intended changes |
| 12 | the copy, full speed (`P167_PROFILES=d`, slot `electron.lock`) | 0 | 597 s; census 0, 0, 0; Past 24, 48, 72; control armed |
| 13 | the copy at 1/8 CPU (`P167_CPU_PROFILES=d P167_CPU=8`, 3 × 4) | 0 | 440 s; census 0, 0, 0; Past 16, 32, 48 |
| 14 | the copy starved from the end of each block's cycles through its census (`P353_STARVE=1`, 3 × 4) | 0 | 423 s; census 0, 0, 0 |
| 15 | the copy starved for whole blocks with `setTimeout` chains (`P353_STARVE=whole`, 2 × 3) | 0, 259 s | census 0, then **`canvas x34`**; renderer 83.6 → 113.6 MB; webgl2 true |
| 16 | the copy starved for whole blocks with message tasks (`P353_STARVE=whole`, `MessageChannel`, 2 × 3) | 0, 261 s | census **36, then 72** (`canvas`); renderer 66.7 → 110.1 → 133.6 MB; the arm after the starve's deadline read 0 detached; the slot released after |

**History**: `~/.zsh_history` read `742199 1793890717` and `~/.bash_history` `23166 1790702242` at the start, before and
after every shell, tmux and app run, and at the end: never moved. **Left behind**: no Electron of this step (the only
`Tortie` in the count is his own app, parent pid 1, with its `/Applications/Tortie.app` crashpad), no `p353` socket
(every scratch server ran under the scratch `TMUX_TMPDIR` and was ended), every lock slot released. **Not run, and why**:
the seven other tmux versions (they need a network fetch, §0.1 354 item 5); any real agent, the banked corpus (gone),
his manifest (refused); the loopback machine (the far create's argv was proved byte for byte through four shells
instead, M354d, and its tmux is the same two builds); 325's and 328's app arms, 294's and 295's app arms and 354's app
matrix (the verifiers', against built code that does not exist yet).

## §As built — the integrator (2026-11-05, at `b1a557b8` plus the uncommitted phase)

Four builders reported, then the integrator reconciled the seams, wrote the shared files and ran §11 until the history
rule stopped it. Scratch, scripts and every log: `/private/var/tmp/tortie-wt/scratch/p353/integrator/` (`sb.sh`,
`run-gates.sh`, `run-chain.sh`, `run-it.sh`, `run-package.sh`, `dup/`, `needles/`, `logs/`). Nothing was committed,
staged or stashed; `/Users/gdc/gmux` was not written.

### THE STOP (read this first)

**`~/.zsh_history` moved during the integration, and the rule's answer was STOP.** It read `742199 1793890717` from the
first command (14:13) through 14:42 (the last reading before the move was the package run's, at 14:41:5x). At 14:43:28 it
read `742243 1793907771`: 44 bytes appended, with a modification time of 14:42:51, ONE SECOND after the integrator started
a `Monitor` watch, a shell loop of `cat`, `grep` and `sleep` over its own chain files and the one kind of unblocked command
it had not used before; every test, gate, ablation and build of the run was inside the history block. `~/.bash_history`
never moved (`23166 1790702242`). The rule's step was taken: the watch was stopped, nothing was started for three minutes
(one sandboxed `sleep 180`, 14:44:50 to 14:47:50), and the files read again `742243 1793907771`: still, so STOP and report.
The contents were never read, so whether the line is his (a terminal of his own, one command of about 30 characters) or
the watch's cannot be told from here. The main session should ask him.

What the STOP did: nothing new was started after 14:47:50. The two ablations in flight, `ablation:p313` and
`ablation:p320` (each inside the history block, and each a synchronous loop that only reads its `SIGTERM` handler when it
finishes, so a `SIGTERM` at 14:50:02 changed nothing), were frozen with `SIGSTOP` at 14:53:41 so they could start no further
child, `ablation:p313`'s current child (`conformance-pocket.mjs`, which spawns nothing) was ended with `SIGKILL`,
`ablation:p320`'s current child (`conformance-machines.mjs`) was left to finish on its own and did, and the two frozen
parents were ended with `SIGKILL` at 14:55:24 (exit 137 in each chain). Every pid was confirmed by its command line and
its process group (the integrator's two chain shells) before it was signalled; no group, pattern or negative pid. Their two
clones (`/private/tmp/p320-ablation-78296-6nbUaT`, `…/integrator/abl/p313-ablation-51716-aNsF8X`) were removed once no
process named them. Neither ablation ever writes the worktree.

**So these did not finish, and the reverify or the main session owes them:** `ablation:p312` (deferred out of the
parallel chains because it edits the working tree in place, and the STOP came before it could run alone), `ablation:p313`
(stopped after its base and 35 arms, every one red on its owner; Y17's arm, the reason §11 step 23 names it, was not
reached), `ablation:p320` (stopped after its three bases, machines green, main 373 cases and vitest 160 cases, and 8 arms
`m1` to `m7b`, each red on its owner; condition 110's arm was not reached), and a whole `npm test`, `npm run typecheck` and
`npm run build` over the four test files edited after the first run (the five files were re-run alone, 131 of 131).

### Files

`git diff --stat b1a557b8`: **54 tracked files, 4,542 insertions and 880 deletions**, and **23 new files** (19
`git status` entries, three of them the new folders `build/p325/`, `build/p328/` and `build/p353/`), this SPEC among them.
Every one is in §9.1 or is this SPEC, except the four test files named below.

| Owner | Files |
| --- | --- |
| records (302, 305) | `src/main/manifest/sessions-repository.ts`; `src/main/sessions/core.ts` (the two re-reads); `src/main/restart/restart.ts`; `src/main/sessions/lifecycle-gate.ts`; `p293-lifecycle-gate.test.ts`; `p302-tombstone.test.ts` (new, 59 tests over 480 grid cells and 9 monitor cells); `p302-status-over-tombstone.test.ts` (new, 20); `restart.test.ts` (126 cases added); `build/p293/conformance-manager.mjs` (T27 to T29, RS1 to RS5); `build/p293/ablation.mjs` (K1 to K5, S1 to S10, `P293_SCRATCH`); `build/p353/probe-records.mjs` (new) |
| status (325, 328) | `src/main/attach/input-facts.ts` (new), `attach-host.ts`; `src/main/activity/{index,monitor,state-machine,process}.ts`; `src/main/agents/registry.ts`; `input-facts.test.ts`, `p325-own-words.test.ts`, `p328-writes-without-drawing.test.ts`, `p321-parent-rule.ts` (new); `p321-masking.test.ts`, `p321-shapes.test.ts`; `build/conformance-ownwords.mjs`, `build/p325/ablation.mjs`, `build/p328/{ablation,timeline}.mjs`, `build/fixtures/questions/a-antigravity-timeline.json` (new); `build/p321/stand-in.mjs`, `build/p311/copy-drift.mjs`; `build/p353/probe-status.mjs` (new) |
| terminal (294, 295, 301) | `src/main/tmux/scroll.ts`, `history-lines.ts` (new); `src/main/capture/service.ts`; `src/renderer/terminal/scroll/{TerminalScrollbar.tsx,drag-select.ts}`, `TerminalPane.tsx`; `patches/@xterm+addon-webgl+0.19.0.patch` (+9 lines, a third hunk); `scroll.test.ts`, `scroll.integration.test.ts`, `history-lines.integration.test.ts` (new), `history-range.test.ts`, `p292-honest-thumb.test.ts`; the five converted probes (`build/p292/probe-p292.mjs`, `build/probe-p167-scale.mjs`, `build/probe-p209-selection.mjs`, `build/probe-p95-scroll.mjs`, `build/p284/probe-p284.mjs`). `src/main/scrollback/watch.ts` and `src/renderer/terminal/scroll/surface.ts` untouched |
| starts (354, 350's terms) | `src/main/tmux/argument.ts` (new); `createSession` in `src/main/tmux/sessions.ts`; `src/main/machines/{remote-stamps,remote-sessions,remote-restore,remote-record}.ts`; `src/main/restore/restore.ts`; `src/main/manifest/agents.ts`; `src/main/agents/detection.ts`; `p354-argument.test.ts`, `p354-create.integration.test.ts`, `p354-folder-as-recorded.test.ts`, `p354-contract-marker.test.ts` (new); `p350-pi-bare-name.test.ts`; `build/conformance-agents.mjs` (11.11 flipped, S4), `build/agents-conformance-probe.mts`, `build/p331/ablation.mjs` (P42 and P44 out, P45 to P47 in); `build/p353/probe-starts.mjs` (new) |
| integrator | `src/main/sessions/core.ts` (S1, S2, S-T); `src/main/tmux/sessions.ts` and `src/main/tmux/index.ts` (S3); `build/assert-electron-teardown.mjs` (S6); `package.json` and `build/verification-checks.mjs` (S7); `CHANGELOG.md`; `CLAUDE.md` (rows only); and, OUTSIDE §9.1, the four test files below |

**Four test files outside §9.1, each moved by a seam or a rig race, named so a lens can read each one:**

1. `src/main/reply/__tests__/core-wiring.test.ts` (Phase 318's). It LIFTS the `onInput` arrow out of `core.ts` and runs it
   over a `this` of `{}`; after S1 the arrow also calls `this.activity.noteOwnText(sessionId, facts)`, and the row threw
   `Cannot read properties of undefined (reading 'noteOwnText')`. It now hands the lifted arrow an `activity` stub and
   facts, and asserts the bump and then the note (`[['bump','s1','desk'], ['own','s1',facts]]`): the desk bump is still
   asserted, once and first, so removing it still reddens the row.
2. `src/main/machines/__tests__/p3201-remote-history.test.ts` (Phase 320.1's). It pinned that this Mac's extent format
   (`'#{history_size}\t#{pane_height}'`) is the far one with a tab by reading `src/main/tmux/sessions.ts`; S3 deleted
   `readPaneExtent`, and this Mac reads that format in `src/main/tmux/history-lines.ts` (`EXTENT_FORMAT`, D295-2). The
   row reads that file now; its assertion is unchanged.
3. `src/main/tmux/__tests__/capture-pane.test.ts`. Its `capturePane over an exact range (Phase 209)` block, three rows (the
   range's argv twice, and `readPaneExtent`), tested the arm and the function S3 deleted; a comment naming where the range
   is read and pinned now stands in its place. The last-N rows are byte for byte.
4. `src/main/tmux/__tests__/p354-create.integration.test.ts` (the starts builder's). On the loaded machine one 3.6a cell
   read `HEAD 3.6a/gmux "#S": elsewhere: pwd -P "", pane "…/dirs/17/#S"`: the pane WAS in its folder, and the rig read the
   `pwd -P` file in the instant between the shell's `>` creating it and `pwd` writing its line. The rig now waits for the
   line itself (a newline in the file, up to 5 s, where it waited 2 s for the file to exist). Nothing it grades moved.

`src/main/menu.ts` sha256 `fe62e1dd05637c8764bbbe1777bd30ac8d4cfdc7be0c98aa5e6202f09e222ca3` at the start and at the end.
`docs/audits/contract-baseline.txt` did not move (`gate:contract` byte for byte).

### The seams, as built

- **S1** (`core.ts`, the attach host's options): `onInput: (sessionId, facts) => { replyTurns.bump(sessionId, 'desk');
  this.activity.noteOwnText(sessionId, facts); }`, its comment saying no byte of what he typed reaches the line.
  `conformance:pocket` Y13 (one `'desk'` bump in `onInput`, 8 checks) and Y17 (one call in the host, 7) read green.
- **S2** (`core.ts`, the restore wrapper, immediately after `const { info } = outcome;`): `if ((outcome.kind === 'armed' ||
  outcome.kind === 'transcript') && outcome.replayed === true) this.activity.noteOwnText(rec.id, { chars: OWN_TEXT_MIN,
  submitted: false, inPaste: false });`, `OWN_TEXT_MIN` from the activity barrel. The kind test is there for the type
  (`shell_only` carries no `replayed`); the guard names `replayed`, as `conformance:ownwords` clause 10 requires. It sits
  before every write and the broadcast, and before `liveIds` holds the new pane, which `activitySessions()` requires, so
  before any tick can read the pane. The wrapper is the one production caller of `restoreSessionInTmux`.
- **S3**: `PaneExtent`, `readPaneExtent`, `CapturePaneOptions.range` and its arm deleted from `sessions.ts` and their two
  exports from `index.ts`; `capturePane`'s argv for the last N is the parent's byte for byte (`'-S', '-<N>'`, no `-E`),
  and its doc names where an exact range is read now. `npm run typecheck` passed with nothing else touched in production
  code; the three test consequences are files 1 to 3 above. Two COMMENTS in `src/main/machines/remote-pane-history.ts`
  (`:49`, `:125`) still say "this Mac's `readPaneExtent`"; §3 keeps that file untouched, so they are left and named.
- **S4** confirmed: `P328_FIELDS = ['writesWithoutDrawing', 'terminalTools']` joined to `P321_FIELDS` as
  `OVERLAY_NEVER_FIELDS` (`build/conformance-agents.mjs:1927-1929`), with 10.4's five driven cases.
- **S5** confirmed: `replayed?: true` on the `transcript` arm (always set there) and on the `armed` arm (set when the
  snapshot was replayed too); not stored, `restoreRecordOf` mapping fields by name.
- **S6**: `HELPER_USER_FLOOR` 180 → 183, its comment naming the three new probes, and `OPERATOR_ARGV_CEILING` 98 → 94,
  naming the four converted probes; `gate:electron` reads 183 against 183 and 94 under 94.
- **S7**: `package.json` gains `probe:p353:records`, `probe:p353:status` (each `npm run build && node
  build/harness-socket.mjs --fresh gmux-p353r|s '…'`) and `probe:p353:starts` (with `--preflight` and the loopback
  machine's four switches, as `probe:p350`), in the shapes the builders reported, and `ablation:p325`, `ablation:p328` and
  `conformance:ownwords`; `build/verification-checks.mjs` classifies the gate `pure`, the two ablations `pure(…,
  NEEDS.vitest)` (each runs vitest in a clone), the records and status probes `electron` and the starts probe `remote`,
  each with its comment. `gate:checks` reads 281 check scripts (277 at the parent, plus the three probes and the gate;
  `ablation:` is outside its family).
- **S-T (new, named by the terminal builder)**: `runScrollCommand` in `core.ts` states `{ refreezes: true as const }`
  through `Object.assign`, its body byte for byte. The re-freeze is OPT-IN (a `refreezes` fact on the runner) because the
  structural rule alone turned three rows of `p3201-scroll-pipeline.test.ts` red, a file §4.5 keeps unchanged; without
  S-T 294 ships inert and `scroll.test.ts`'s pin reads red. The runner is this Mac's alone (a session on another machine
  scrolls through `remoteScrollRunner`), and the activity monitor and the scrollback service, which share it, call no
  function that reads the fact.

### Decisions the builders took that move from this spec, each kept

**records (302, 305).**
- D305-1 gains ONE more read: after a kill that succeeded, `restart.ts` reads the row again
  (`const now = killedOld ? host.manifest.getSession(sessionId) : fresh;`) and keeps a row a Remove tombstoned during the
  kill's await, or deletes nothing when the row is gone. The entry's own attack names "a Remove landing during the kill's
  await", and it is reachable: the session ends by itself, the reap writes `exited`, the person removes it, and 302's
  re-read stops the End's write; without the read the restart then deleted the tombstone. One SQLite read.
- `restart.test.ts` held 27 cases, not §4.2's 33. One expectation changes ON PURPOSE (D305-5 contradicts "unchanged"
  there): "still finishes the restart when the kill fails" reads `['create','kill','broadcast']` with
  `oldRow: 'kept-kill-failed'`. The other 26 are untouched; 126 cases are added (the 120-cell grid of the entry's proof 1,
  its hand-derived table in the file, and six more).
- The sweep's hand table lives in `p302-tombstone.test.ts` itself, as the row's list held no file for it.
  `conformance:manager` at the parent tree reads 7 of 72 rules red (RS1 to RS5, T27, T28) and T29 green, as a
  no-regression rule must. The parent, measured by the builder (`git archive b1a557b8`, the new tests copied in): 59 of
  480 grid cells and 3 of 9 monitor cells read `exited` with a removal date in the managed list, exactly the cells the
  hand table predicts; 0 at HEAD.
- `build/p293/ablation.mjs` gains `P293_SCRATCH` (the clone's parent, default `/private/tmp` as before) and copies
  `vitest.config.ts` into the clone.

**status (325, 328).**
- `dialogBefore` reads a new `SessionState.dialogSeen` ("the last capture read a dialog that was not his") or a blocked
  state, not §4.3's `dialogTicks > 0`, which every output tick zeroes, so a question a capture had already seen would
  have become his (D325-6's own sentence; arm A6 owns it).
- The mark is `{ hash, command }`, so it drops when the program changes; the rule is never asked while the session is
  blocked (his words cannot release a question a hook raised, arm A15); a burst closes on quiet only when the pane is
  quiet AND his last key is older than `QUIET_MS`; a burst opened before any tick takes the first capture's program (the
  restore note); characters are code points, and ESC with any one character after it (Alt+Enter among them) counts 0
  and is no submit.
- Clause A is a `weakVerdict` tail, so it falls through to the screen arm and every ablation arm bites.
- `conformance:phonecopy`'s log rule reads `input-facts.ts` as a leaf that may name no log call at all (two self-test
  plants).
- The timeline names its sources by number (a `SOURCES` table in `timeline.mjs`), because `--check` refuses strings; the
  entry says "five key times" and names four, and four are kept. One 2.015 s cadence anchored on the last write
  reproduces the entry: 162 writes at rest, 9 between +45 and +63, 293 in all, 159 two-second and 2 three-second steps.
- The status probe hides gemini (a real `gemini` sits in `/usr/local/bin`, which the scan searches), so its restore arm
  replays Claude Code's committed numbered gate instead, and the probe refuses if any stand-in name sits in a scanned
  folder; 328's arm (c) types with `send-keys`, because D328-5 asks the invariant over inputs carrying no own-text facts.
- Stated limits (the builder's): the mark is the whole screen's hash, so once his burst has closed, words typed ahead or
  dialog-shaped words left on a screen that then changes read as the parent reads them; a replay the shell prints more
  than about a second after the S2 note closes the burst on the stamp and reads as the parent; an escape sequence split
  across two messages has its tail counted as characters; whether agy under SpecStory capture is a session leader is
  unmeasured (if it is, clause B holds it running, today's reading).
- The builder broke four hard rules without the history moving: one `/bin/ps` experiment and one `node --check` outside
  the history block, one `import()` of `build/p321/stand-in.mjs` to check it loads, and `ablation:p321`'s clone under
  `/private/tmp` (hard-coded in that committed script, removed in its `finally`).

**terminal (294, 295, 301).**
- D294-2: `STATE_FORMAT` is unchanged. `p3201-scroll-shapes.test.ts:214`, `p3201-remote-read.test.ts:72,89` and
  `conformance:machines` condition 103 hold it equal to `REMOTE_STATE_FORMAT`'s eight fields, so a separate
  `REFREEZE_READ_FORMAT` (the eight plus `#{history_limit}`) is asked only by the way down and the drag, on this Mac's
  runner; the poll reads what it read before, and §6's "format pin moves" row does not move.
- D294-1 is OPT-IN (`refreezes === true`, not ordered, no server), for the reason S-T gives.
- The trim-band clause also requires a known limit above 0 (`isDiscarding(x, 0)` answers false); a failed read before a
  notch decides nothing and sends today's notch.
- D294-5 needs no contract field: the scrollbar re-sends the held pointer once, against `view.historyAtEntry`, re-armed
  only by a pointer event, so a pointer held still sends once.
- 295: the service itself refuses NaN, ±Infinity and fractions before any spawn, and `captureHistoryLines` refuses them
  as well.
- D301-1: the hunk is in `lib/addon-webgl.mjs` only (the `.js` build is one line the existing hunk 2 rewrites); a second
  warm-up can run (`clearTexture()` resets `_didWarmUp`), so `_doWarmUp` clears the previous queue before replacing it.
  The patch applies to a pristine copy, `apply-patches` reports "already applied" on a second run, and an existing
  `node_modules` holding only the two old hunks is refused as "mixed" until `@xterm/addon-webgl` is reinstalled
  (`npm ci`); a fresh install is fine. The integrator found the cleared queue in the built renderer
  (`out/renderer/assets/index-R0Asdbl3.js`) and in the patched `addon-webgl.mjs`.
- D301-2: the blur sits after `dataSub.dispose()`, so xterm's focus-out report reaches nobody; React runs that cleanup
  after it removed the pane's DOM, so the blur takes effect only when the effect re-runs on a dependency change.
- D301-5, measured on one starved parent Electron (slot `electron.lock`, 277 s): `canvas x36` then `x72`, renderer 66.8 →
  101.8 → 130.3 MB; in both heap snapshots 18 then 36 texture atlases were held only by the warm-up closures, none by a
  char-atlas cache entry (the cache was empty, so `removeTerminalFromCache` had run). The owner is confirmed.
- D-P2's exceptions: `probe:p95` names no `tmuxSocket` (it reads its scratch server after the launch returns);
  `probe:p167`'s remote confirm launch (`GMUX_REAL_MACHINE_HOST` only) is unchanged; `probe:p284`'s own identity census of
  `-L gmux` is removed with its 5 self-test rows; `probe:p292`'s arm h2 presses ⌘C, so it runs only when named and is
  refused on another machine, and the probe's ceiling is raised so arms h and h2 are not killed partway.
- Stated limits: the guard is read one round trip before the re-freeze, so a flood that crosses tmux's trim band inside
  that round trip slips the reader by one trim (never to the top); ⌘K followed by printing past the frame is not guarded,
  because tmux exposes nothing that says a clear happened.

**starts (354, Phase 350's terms).**
- D354-2, built inside out: the final-`;` rule is a new exported `tmuxArgument` IN `remote-stamps.ts`, which
  `remoteStampArgs` calls, and `argument.ts` re-exports it beside `tmuxFolderArgument`, because `p123-leaves.test.ts`
  (about `:56`) and `p349-far-names.test.ts:167-171` require `remote-stamps.ts` to import nothing. One spelling of the
  rule; `p354-argument.test.ts` checks the two exports are one function.
- `folderAsRecordedFor(rec)`: a row with no contract at all counts as unmarked; the local restore applies the decision to
  whichever folder it hands tmux (the recorded one, or the project's when that is gone), so an unmarked row comes back
  exactly as today, the fallback included.
- 11.11 fails if the resolver reads `folder` for a `#` or `;` anywhere and requires `createSession` to hand `-c` through
  `tmuxFolderArgument(input.cwd)` (19 self-tests, all red); a driven row (`twin;`) pins its own pi read unread
  (`p350-pi-bare-name.test.ts` 49 tests, was 48); the probe's `hash`, `hash-parent` and `semi` shapes read
  `['g/bin/pi', true]`.
- `ablation:p331`: P42, P44 and the owners N60, N61, N63 to N68 out; NEW arms P45 (the `#` term put back), P46 (the `;`
  term put back) and P47 (`createSession` handing `-c` raw), owned by 11.11 and the flipped rows N69 to N76: 71 arms.
- `contractFromMerged` in `agents-conformance-probe.mts` gains `folderHeld: true`, or section 1's key-set check fails a
  configured agent's contract against claude's.
- `remote-sessions.test.ts`, `remote-restore.test.ts`, `conformance-machines.mjs` and `machines-conformance-probe.mts` are
  unchanged: no pin in them uses a `#` or a final `;`.
- The builder's own checks, kept in its scratch: a 23-arm ablation of every rule it added (23 red, control green before
  and after; its first run found the shell clause had no owning test, and the row was added), and a seeded random
  differential through real tmux, 300 names × 4 configurations × two seeds, 0 of 1,200 wrong each time against 218 wrong
  composed as today.

### §11, in order, at the integrated tree

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| 1 | `df -h /`; `stat` the history; `shasum -a 256 src/main/menu.ts` | — | 40 GiB free; `742199 1793890717` and `23166 1790702242`; `fe62e1dd05637c8764bbbe1777bd30ac8d4cfdc7be0c98aa5e6202f09e222ca3` |
| 2 | S1, S2, S3 and S-T applied; S4 and S5 confirmed; S6; S7 | — | above |
| 3 | `CHANGELOG.md` | — | `## Unreleased`, `### Fixed`, §5's seven items verbatim above `## 0.114.0`, one line each, no link |
| 4 | `CLAUDE.md`, rows only | — | `conformance:agents` (its paths gain `createSession`; the two 328 names; 11.11's flip; P45 to P47), `conformance:manager` (paths gain `restart.ts`; T27 to T29, RS1 to RS5; 106 ablations, K1 to K5 and S1 to S10), `conformance:choices` (the output clause's one exception and `ablation:p328`), a NEW `conformance:ownwords` row (`ablation:p325`, 20 arms), `conformance:phonecopy` (`input-facts.ts`), the reply row's `onInput` sentence, `probe:p167` and `probe:p292` (their new arms; each hides every probed agent and counts nothing itself), and three new probe rows |
| 5 | `npm run typecheck` | 0 | 10 s, after the seams and before test files 1, 2 and 4 moved: import boundaries 87 fixtures, 1,438 production files, 8,203 imports, 0 violations; no runtime cycles over 1,435 files and 5,015 edges; shared types OK. Not run again (the STOP) |
| 6 | `npm run build` | 0 | 56 s, at the same point: `gate:electron` 580 files, 183 reach the helper against a floor of 183, 94 aim an argv at `-L gmux` under a ceiling of 94 (which refused 1 of the 2 counts shown), 32 by shell under 32, 32 of 32 ablations; `gate:background` 582 files, 3 start, 32 of 32 fixtures; `gate:knownhosts` 610 files; `gate:checks` PASS, 281 check scripts, 54 `tsxCli()` importers against 54, 1,185 test files; `gate:simulator` PASS, 580 scripts, 5 against 5; `gate:docker` PASS; `conformance:ios` PASS, 55 rules; `gate:onlyadd` PASS; `conformance:harnessprobes` 6 clauses and 16 ablations in 264 ms; the contract inventory byte for byte. Not run again (the STOP) |
| 7 | `npm test` (history block, scratch `HOME`, default `TMPDIR`) | 1, then 0 on the five files | 82 s: 1,185 files (7 failed, 1,174 passed, 4 skipped), 22,633 tests (11 failed, 22,599 passed, 23 skipped). The 11: the four `/bin/ps` natives and the five FSEvents natives (below), and the two rows the seams moved (files 1 and 2 above), adapted and re-run with `scroll.test.ts` (its S-T pin), `capture-pane.test.ts` and `history-range.test.ts`: 5 files, 131 of 131. The whole suite was not run again (the STOP) |
| 8 | `npm run conformance:manager` | 0 | PASS: 72 rules, 2,917 checks, 2.69 s |
| 9 | `npm run ablation:p293` | 0 | PASS in 360.6 s: 106 ablations (91, and 302's K1 to K5 and 305's S1 to S10), each reddening the rule that owns it as a delta; every clone file restored by sha256, the worktree never written; the clone under the integrator scratch (`P293_SCRATCH`) |
| 10 | `npm run conformance:remoteclose` | 0 | 11 tests; it opens no manifest, so 302 cannot reach it |
| 11 | `npm run conformance:endtree`, then `npm run ablation:p323` | 0, 0 | 16 rules and 84 self-tests; PASS in 319.2 s, 43 of 43 arms (`P323_SCRATCH`) |
| 12 | `npm run conformance:farattach` | 0 | 11 rules in 75 ms |
| 13 | `npm run conformance:choices` | 0 | 27 clauses; clauses 18 to 24 proved red 33 times |
| 14 | `npm run conformance:handback` | 0 | PASS |
| 15 | `npm run conformance:phonecopy` | 0 | `phonecopy OK` |
| 16 | `npm run conformance:push` | 0 | 26 rules, 2,408 checks, 6.30 s |
| 17 | `npm run conformance:ownwords` | 0 | 10 clauses and 33 self-tests; clause 10's control "the live core carries them" (S1 and S2) |
| 18 | `npm run ablation:p312`, `ablation:p321`, `ablation:p325`, `ablation:p328` | —, 0, 0, 0 | p312 NOT RUN (the STOP, above); p321 PASS in 143.9 s, 33 of 33 arms; p325 PASS in 429.5 s, 20 of 20, every one red on the row that owns it; p328 PASS in 166.0 s, 10 of 10 (`P325_SCRATCH`, `P328_SCRATCH`) |
| 19 | `npm run conformance:agents`, `npm run conformance:installs` | 0, 0 | PASS; PASS |
| 20 | `npm run ablation:p331` | 0 | PASS in 415.6 s, 71 of 71 arms, each red on the row that owns it, the unedited control green first and last |
| 21 | `npm run conformance:machines`, then `npm run ablation:p320` | 0, 137 | 29 s, condition 110 among the green; p320 STOPPED (above) after 7 min: bases green, 8 of its arms red on their owners, the rest not run. Neither asks for a lock slot or launches an Electron |
| 22 | `npm run conformance:shellenv` | 0 | PASS |
| 23 | `npm run conformance:pocket`, `conformance:pocket:hostile`, then `ablation:p313` | 0, 0, 137 | 192 rules, 25,695 checks, 13.99 s (Y13 and Y17 green); 363 arms in 17.50 s; p313 STOPPED (above) after 11 min: its base (13 checks) green and 35 arms red on their owners, Y17's arm not reached (`P313_SCRATCH`) |
| 24 | `GMUX_SCROLL_IT=1 GMUX_CAPTURE_IT=1 GMUX_ARG_IT=1`, history block, `TMUX_TMPDIR` and `TMPDIR` under the scratch, one lock slot, each build by `GMUX_TMUX_BIN` | 0, 0 (the second run) | **3.7b**, 16 of 16, 52 s: [294] parked at line 310, 0 lines never on screen in 109 notches to live, where today's bytes on the same rig left 82 never on screen in 33; [295] one invocation off 0 of 300, 300 and 200 at about 10, 80 and 700 lines a second, the two-call pair off 72 of 300 by up to 1; [354] 90 cells, HEAD 0 anywhere but the folder and today 60; the `#(` job never at HEAD and run today; a launch flag ending in `;` and `-e NAME=val;` reach the pane as typed. **3.6a**, 16 of 16, 46 s: [294] the frame is not named, so today's jump (D294-6), 86 never on screen in 33 notches (today's bytes 89); [295] 0 off in every cell, the pair 116 of 300 by up to 2; [354] 90 cells, HEAD 0 and today 58 (60 + 58 is §2.6's 118 of 180); the job never at HEAD. The FIRST run read 15 of 16 on 3.6a, the rig race of file 4 above with the pane in its folder; it was fixed and both builds run again. No socket left under the scratch `TMUX_TMPDIR` |
| 25 | the three new probes' `--grader-self-test` | 0, 0, 0 | records 19 of 19 cases; status 34 cases; starts 40 fixtures and 3 table checks, 0 wrong; each started nothing |
| 26 | `npm run smoke:t1` | — | NOT RUN: the integrator's brief lists it and then refuses it by name |
| 27 | `npm run package:dir -- -c.mac.identity=null`, UNSIGNED, `build/p351/SPEC.md` §9.1's `env -u` line, scratch `HOME`, `ELECTRON_BUILDER_CACHE` under the scratch, one lock slot | 0 | 53 s; `after-pack: 27 Mach-O files, every one holds arm64 code` before the first `after-pack: CFBundleName` line, then `skipped macOS code signing  reason=identity explicitly is set to null`; the Electron 43.3.0 zip seeded by clone copy from the p356 spec step's cache read `122102881 1786298401` before and after, so it was not fetched again (`downloaded label=electron progress=100%` is the SHASUMS check §9.1 describes); `release/mac-arm64/Tortie.app` (ignored by git) |
| 28 | `conformance:resume:capture`, `smoke`, `smoke:t3` | — | NOT RUN: the main session's at landing |
| 29 | `git diff --stat b1a557b8` | — | 54 files changed, 4,542 insertions, 880 deletions, and the 23 new files |
| 30 | `shasum -a 256 src/main/menu.ts`; the Electron count; `stat` | — | the sha256 as at step 1; the history as THE STOP reads; the count below |

### Integrator checks of its own

- **Needles that quote a removed line.** `needles/needles.mjs` read every production line this phase removed or changed
  under `src/`, `patches/` and `resources/` (57 lines of 24 characters or more) against 582 scripts under `build/` and
  1,249 test files: 2 hits, both deliberate (`p321-parent-rule.ts`, the parent's frozen copy of the verdict, and
  `conformance-ownwords.mjs`'s `seamed()`, which plants S1 only over a core that lacks it and is inert at this tree).
- **Ten-line duplicates.** `dup/dupscan.mjs` read the 70 added or changed files against 3,234 files under `src/` and
  `build/`: the clone and run harness `build/p325/ablation.mjs` and `build/p328/ablation.mjs` share (about 140 lines, the
  shape `p321`, `p323`, `p326` and `p331` already share, each ablation self-contained by the house's choice); probe
  boilerplate the p288 to p350 probes share; `p321-parent-rule.ts`'s parent copies of `screen.ts` and `process.ts`, which
  are that file's point; and two ten-line helpers `p325-own-words.test.ts` and `p328-writes-without-drawing.test.ts`
  share. No production logic block is duplicated; nothing was extracted.
- **`ablation:p312` edits the working tree in place** (its header says so), so it was held out of the two parallel
  ablation chains by a marker in the integrator's wrapper (`defer-p312`), to run alone afterwards; the STOP came first.

### Not run, and why

- `npm run smoke:t1` (§11 step 26): the integrator's brief lists it among its commands and then, in its last paragraph,
  refuses it by name ("Do NOT run smoke:t1, smoke, smoke:t3, smoke:remote, smoke:machines or
  conformance:resume:capture"); the refusal was followed. It belongs with `smoke` and `smoke:t3` at landing.
- `conformance:resume:capture`, `smoke`, `smoke:t3`: the main session's at landing.
- Every app run (`probe:p353:records`, `probe:p353:status`, `probe:p353:starts`, `probe:p292` arms h and h2,
  `probe:p167`'s starving arm, `probe:p209`, `probe:p95`, `probe:p284`): the verifiers'.
- The full `npm run package` (DMG and ZIP): `package:dir` only, as §11 step 27 says.
- After the STOP: `ablation:p312`, the rest of `ablation:p313` and `ablation:p320`, and a whole `npm test`, `typecheck` and
  `build` over the four test files edited after the first run.
- The four `/bin/ps` native tests (`process-table.native` 1, `ps.native` 2, `p269-env-names` "kills a shell that never
  exits" 1) cannot pass inside the history block, which refuses `/bin/ps` (`spawnSync /bin/ps EPERM`); they were not run
  outside it. The five FSEvents native tests (`store-watch.native` 1, `repo-watcher.native` 4) get no delivery under
  `sandbox-exec`; every builder measured them failing the same way at `b1a557b8`'s own source under the same block, and
  nothing under `src/main/watcher/` or `src/main/config/` moved.

### At the end (14:56)

- His shell history: `742243 1793907771` and `23166 1790702242`, as THE STOP says (no move after 14:42:51).
- Electrons: none of this run. The count's lines are his own `Tortie` (pid 67660, parent 1) with its
  `/Applications/Tortie.app` crashpad, and the crashpads of Chrome, Granola, Cursor (two) and Slack.
- No process of the run left (both chain process groups empty), no socket under the integrator's scratch and no `p353`
  or `p354` socket under `/private/tmp/tmux-501/`, no ablation clone left under `/private/tmp` or the scratch, every lock
  slot free, 39 GiB free.

### The fix round (2026-11-05, from 18:12, the fixer, once)

Three lenses reviewed the integrated tree together and each answered **needs_work**: the records lens on 302 (305 and 354
approved), the status lens on 325 (328 approved) and the terminal lens on 294 and 295 (301 approved). The fix ran once, in
this worktree; its scratch, scripts and every log are `/private/var/tmp/tortie-wt/scratch/p353/fixer/` (`sb.sh` the history
block, `chain.sh`, `run-probe.sh`, `hist.sh` and `history.txt`, `logs/`, `explorer/`, `wtcopy/`). **No item was dropped.**
Nothing was committed, staged or stashed; `/Users/gdc/gmux` was not written; `-L gmux` was named by nothing of the fix round
but `build/electron-run.mjs`'s census.

#### Every problem, and what was done

**The records lens (302, 305, 354).**

1. *Major, 302: the clause refused a legitimate write.* The remote Restore from Past writes `running` over a `discarded` row
   with no `clearRemovedAt`, so at HEAD the restored far session was drawn in the managed list AND in Past, its row stayed
   `discarded` with the old removal date and the 90 day prune would delete it. **Fixed**: step 8 of `restoreRemoteSession`
   (`src/main/machines/remote-restore.ts`) hands its one row write `{ clearRemovedAt: true }`, the remote twin of
   `setRestoreResult`'s clear: the session came back, so the date goes in the same write. A row never removed has no date,
   so the option changes nothing for an ordinary restore. 302's "nothing in `src/main/machines/` is touched" was written on
   the census's premise that every remote writer guards at its write; this one is not a guard but a Restore from Past, which
   the entry's own no-regression list requires to clear the date. Held by R302d in
   `src/main/machines/__tests__/p342-far-names.test.ts` (its fake manifest now records the options; the row drives the real
   restore and reads `{ clearRemovedAt: true }`), by two rows in `p302-status-over-tombstone.test.ts` (the same patch through
   a real store, with the option `running,-`, without it the tombstone kept and the clause's one line), and by
   `ablation:p293` K7 (the option removed reddens R302d).
2. *Major, 302: the clause froze rows an earlier build left.* A row reading `running` or `exited` beside its removal date
   (the parent's own remote Past restore leaves one) took no status patch at HEAD, so a remote session restored from Past
   before this build read `running` for good after its far session ended. **Fixed**: the clause asks
   `existing.status === 'discarded'` too, a TOMBSTONE, so such a row moves exactly as at the parent; 302's case, a status
   patch over a `discarded` row, is still refused, and the two writers still re-read. No heal (D302-6, Q5). Held by six
   rows (one per non-discarded status) and `ablation:p293` K6.
3. *Major, tooling: `probe:p353:records` could not launch.* Its app PATH held no `node` for the Electron shim's
   `#!/usr/bin/env node`. **Fixed**: a `nodebin` link to the probe's own runtime first on the app's PATH, as `probe-starts`
   and `probe-status` do.
4. *Major, tooling: `probe:p353:starts` could not reach the loopback machine under a long scratch `TMPDIR`.* **Fixed in the
   probe**: the app is handed a short `TMPDIR` of its own (`/private/var/tmp/p353t-XXXXXX`, refused at start if the control
   socket would not fit, removed at the end), and Prepare's answer and every open's answer go into `report.steps`, with 20
   tries rather than 6. The product's bound is §13 item 4, owed its own entry (the same at the parent).
5. *Minor, 305: a row in 302's damaged shape survived Restart.* **Fixed**: `restartKeepsRow` keeps a tombstone alone
   (`removedAt !== undefined && status === 'discarded'`), so such a row is replaced as at the parent and the log's "still in
   Past Sessions" is said only of a row that is. `conformance:manager` RS4 gains the two damaged rows and RS5 the new table;
   `p293-lifecycle-gate.test.ts` and `restart.test.ts` gain the rows; `ablation:p293` S11 widens it back (RS4 red) and S3's
   needle follows the new body.
6. *Minor, tooling: R305 read UNREADABLE on a quiet Mac.* **Fixed**: the grid is graded on the cells whose Remove landed
   inside the create, at least `R305_MIN_LANDED` (3, or every cell of a smaller grid); a cell that missed is a note. Two
   self-test cases (three of five clean; two of five UNREADABLE).
7. *Minor, tooling: the app's ssh read his ssh configuration.* **Fixed**: `GMUX_SSH_BIN` names a wrapper,
   `exec /usr/bin/ssh -F none -o IdentitiesOnly=yes -o 'IdentityFile=<the yard's own key>' "$@"`, checked to be an
   executable file before each launch (`resolveSsh` falls back to `/usr/bin/ssh` otherwise).
8. *Nit, CLAUDE.md*: the records probe's row now says each build has its own scratch profile.

**The status lens (325, 328).**

1. *Major, 325: words typed ahead while the agent works still read as its question.* **Not moved to the matched rows**, and
   said so: the mark is the whole screen's hash (D325-5, kept). Remembering the rows his words drew would also keep a real
   question the agent draws within about 2 s of his last key grey until he ANSWERS it, even when the agent redraws (D325-10's
   trade made larger: Gemini's trust gate, raised at 13.3 s at HEAD, and qwen's first permission, at 5.3 s, would not be
   raised at all), which is a scenario worse than today. The CHANGELOG item no longer claims typed-ahead words or a screen
   the agent keeps redrawing; §13 item 5 owes the entry and Q10 takes the choice to him.
2. *Major, 325: the phone's keys and paste handed no count.* **Fixed**, by the entry's own line ("Phase 318's message box,
   when it comes, writes through the same listener or hands the same count, and `conformance:ownwords` makes a second
   writer visible"): `createScreenKeys` and `createScreenPaste` take an optional `noteOwnText` and, when the act typed, hand
   the monitor the desk's own count of it, after their funnel and in a try of their own: the keys verb by `keysFacts`
   (`inputFacts` over its text items, a submit for `Enter` or `C-m` alone, any other named key no character), the paste by
   `inputFacts(input.text, true)` (a bracketed paste's content, no submit); `src/main/capabilities.ts` wires both to
   `pocketCore?.activity.noteOwnText`. `conformance:ownwords` gains clause 11 (the two verbs, their wiring, and every file
   under `src/main/screen/` and `src/main/reply/` that calls `noteUserInput(` handing a count or named in `COUNT_EXEMPT`,
   being 318's writer, whose say always submits and whose press is one digit; 9 self-tests), and `conformance:pocket` Z7,
   which held a paste's text to `pasteRefusal(` and `loadWords(`, lets the counter read it ONCE (`ablation:p313` Z7v plants
   a second read). Rows in `keys.test.ts` (five writes' counts in order after the funnel; refused and rejected writes none;
   `keysFacts`' table) and `p348-paste.test.ts` (a paste's count after the funnel; a refused or failed paste none).
3. *Major, 325: the D325-10 trade is a regression he has not ruled on.* **Taken to him**: Q4 carries the lens's numbers and
   says the phase does not land until he rules (the entry's own words); the CHANGELOG item says the limit on the default.
4. *Minor, 325: an agent that writes at rest closed his burst before any capture.* **Fixed**: for a profile with
   `writesWithoutDrawing` or `animatesWhenIdle`, tmux's stamp closes his burst only once a capture taken after his last key
   has asked the rule (`OwnText.asked`, false at each of his characters, set by each capture after (b) is asked). Three rows
   in `p325-own-words.test.ts` (antigravity, deepseek and muse writing every second and every 2.015 s, typed and pasted, both
   cadences, never his question; the same while captures rotate one tick in three at 1 s, the driver now rotating as
   `captureScreens` does, a session mid-dialog captured every tick; and the stamp still closing the burst once a capture has
   asked, a question 4.8 s later raised as at the parent); `ablation:p325` A21 to A23, and A9's needle follows the guarded
   line. The trade for such an agent is now until the first capture after his last key when that is later than the stamp.
5. *Minor, 325: a pause of more than `QUIET_MS` before the completing character.* **Stated** (§13 item 6).
6. *Minor, 325: a replay printed 2 s or more after S2's note.* **Stated** (§13 item 7).
7. *Minor, tooling: G-b's grader.* **Fixed**: HEAD's antigravity turn is graded from its first `running` poll, which must
   come within `HEAD_TURN_GRACE_POLLS` (5) polls of the graded window's start, the entry's own "no later than one tick after
   the parent"; four self-test cases.
8. *Nit, 325: two rows are load-sensitive* (the 4,744-cell sweep and the shape-cost ratio). None failed in this round's runs.

**The terminal lens (294, 295, 301).**

1. *Major, tooling: arm h's notch and its alternate screen.* **Fixed**: every wheel variant's notch is the lines its own
   park measured a notch to move (`notchOfTrail`, the median step of the park's positions; 10 lines a notch of 90 px in the
   lens's run), a notch never measured is a finding, and the alternate screen's variant, whose end shows that screen with no
   `line N`, is graded on its re-freezes alone (`wayDownFindings` asks the newest line only of a grade that reads lines).
2. *Major, tooling: h limit's global limit reached h2 on 3.7b, and h2 graded the visible highlight.* **Fixed**: the
   1,000-line limit is the second session's own (the global set only while it is made, which 3.6a needs, the session given
   its own 1000, the global put back at once and read back), and each ⌘C is graded as the HELD RANGE (`pasteVerdict`: one
   unbroken run of lines beginning with every highlighted row, the range's visible part) with every ⌘C of one parked
   selection the same range.
3. *Minor, 294 and 4. Minor, 295: the CHANGELOG over-claimed for another machine.* **Fixed**: "an agent on this Mac" and "a
   busy session on this Mac".
5. *Minor, 294: the re-freeze's cost.* **Taken to him** with Q1, with the lens's numbers; nothing changed.
6. *Nit, 301: the blur on the unmount path.* **Stated**: when a session ends React has already removed the pane, so the
   `term.blur()` before `term.dispose()` does nothing there and the Monaco focus tracker holder is not released on that path;
   the keyboard lands at the body at both builds (7 of 7, the lens's reading).

#### Files the fix round changed

`src/main/manifest/sessions-repository.ts`, `src/main/machines/remote-restore.ts`, `src/main/sessions/lifecycle-gate.ts`,
`src/main/activity/state-machine.ts`, and NEW TO THIS PHASE'S DELTA `src/main/screen/keys.ts`, `src/main/screen/paste.ts`
and `src/main/capabilities.ts`; tests `p302-status-over-tombstone.test.ts`, `p293-lifecycle-gate.test.ts`,
`restart.test.ts`, `p325-own-words.test.ts`, and NEW TO THE DELTA `src/main/machines/__tests__/p342-far-names.test.ts`,
`src/main/screen/__tests__/keys.test.ts` and `src/main/screen/__tests__/p348-paste.test.ts`; gates and ablations
`build/p293/conformance-manager.mjs`, `build/p293/ablation.mjs` (109 arms), `build/conformance-ownwords.mjs` (11 clauses),
`build/p325/ablation.mjs` (23 arms), and NEW TO THE DELTA `build/conformance-pocket.mjs` (Z7) and `build/ablation-p313.mjs`
(Z7v); probes `build/p353/probe-records.mjs`, `build/p353/probe-starts.mjs`, `build/p353/probe-status.mjs`,
`build/p292/probe-p292.mjs`; `CHANGELOG.md` (three items narrowed); `CLAUDE.md` (the ownwords, manager, p292,
p353:records, p353:status and p353:starts rows); and this SPEC (§13, §14 Q1, Q4, Q10, and this section).

#### Decisions that move from this spec

- **D302-1, narrowed**: the clause is a tombstone's alone (`existing.status === 'discarded'`), and the remote Restore from
  Past clears the date in its write.
- **D305-2, narrowed**: `restartKeepsRow` keeps a tombstone alone.
- **D325-5, kept**, with its cost named (§13 item 5, Q10).
- **325's phone writers, built**, reading the entry's "No phone write route" line as it is written (the spec had read it as
  "no phone writer exists"; three do, 318's, 337's and 348's).
- **D325-6, widened by one clause**: the stamp's close waits for one capture after his last key for an agent that writes at
  rest.
- **`conformance:pocket` Z7 amended**, on purpose and in the same round as the counter it lets read a paste's text.

#### The fix round's commands, in order (each under the history block unless it starts an Electron or sshd)

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| 1 | `stat` the history; `df -h /` | — | `742243 1793907771` and `23166 1790702242` at 18:11, as THE STOP left them; 39 then 67 GiB free |
| 2 | vitest `p325-own-words.test.ts` | 0 | 39 of 39 (27 s): the sweep 4,744 cells, HEAD 0 and the parent 3,660; the trade printed as before |
| 3 | `ablation:p325` arms A9, A21 to A23, twice | 1, then 0 | the first run read A21 "nothing moved": the rotation row's driver reset the dialog count on every tick out of turn, which the monitor does not do for a session mid-dialog; with the driver rotating as `captureScreens` does, A21 reddened both its rows |
| 4 | `conformance:ownwords` | 0 | 11 clauses, 44 self-tests (35 and 9 new), every copy red |
| 5 | `npm run typecheck` | 0 | 12 s: 87 fixtures, 1,438 production files, 8,205 imports, 0 violations; no runtime cycles over 1,435 files and 5,017 edges |
| 6 | vitest over the 13 changed and neighbouring files | 1, then 0 | 611 of 613: the two new restart rows read an earlier row's lines through the same console spy; cleared, `restart.test.ts` 155 of 155 |
| 7 | `conformance:manager` | 0 | 72 rules, 2,919 checks (2,917 and RS4's two damaged rows) |
| 8 | `npm run build` | 0 | 65 s: `gate:electron` 580 files, 183 against a floor of 183, 94 under a ceiling of 94, 32 of 32 ablations; `gate:background` 32 of 32; `gate:knownhosts` 610 files; `gate:checks` 281 scripts, 1,185 test files; `gate:simulator` 5 of 5; `conformance:ios` 55 rules; `gate:onlyadd` PASS; `conformance:harnessprobes` HP1 to HP6; the contract inventory byte for byte |
| 9 | `ablation:p293` | 0 | PASS in 251 s: 109 ablations, K6, K7 and S11 among them, each red on its owner (K6 R302a, K7 R302d, S11 RS4 and RS5) |
| 10 | the records lens's interleaving explorer, copied into the fixer scratch and run at HEAD | 0 | 22 scenarios, 541 schedules, 0 failing; the one change from the lens's HEAD report is the damaged row's Restart, now `GONE` with its replacement, as at the parent |
| 11 | `ablation:p312` and `ablation:p321`, in a clonefile copy of the worktree (p312 edits the tree in place; p321's clone root moved from `/private/tmp` to the scratch) | 0, 0 | OK 23 of 23 (66 s); PASS 33 of 33 (148 s) |
| 12 | `npm test` (history block, scratch `HOME`) | 1 | 78 s: 1,185 files, 22,652 tests: 22,625 passed, 23 skipped, and 4 failed, being exactly the four `/bin/ps` natives the block refuses (`process-table.native` 1, `ps.native` 2, `p269-env-names` "kills a shell that never exits" 1); the FSEvents natives passed this time |
| 13 | `ablation:p325` | 0 | PASS in 434 s: 23 of 23, every one red on the row that owns it |
| 14 | `ablation:p328` | 0 | PASS in 151 s: 10 of 10 |
| 15 | `conformance:choices`, `handback`, `phonecopy`, `push` | 0, 0, 0, 0 | 27 clauses and 33 self-tests; PASS; `phonecopy OK`; 26 rules |
| 16 | `conformance:pocket` | 1, then 0 | Z7 red: the paste's count read `input.text`, which Z7 holds to `pasteRefusal(` and `loadWords(`; Z7 amended (the counter may read it once), then 192 rules, 25,714 checks |
| 17 | `conformance:pocket:hostile`, `machines`, `remoteclose`, `endtree`, `farattach`, `agents`, `installs`, `shellenv` | 0 each | 363 arms (17 s); conformance:machines 25 s; the rest green |
| 18 | `ablation:p313`, first on a red base | 137 | started before Z7's amendment, read "base ALREADY RED on Z7", so its readings meant nothing; ended by its confirmed pid, its orphaned gate child let finish, its clone removed |
| 19 | `ablation:p313`, `P313_ONLY` = every arm on `src/main/screen/{keys,paste}.ts` and `src/main/capabilities.ts`, Z7's four and Z7v | 0 | PASS in 735 s: 54 ablations, each red on its owner, Z7v on Z7 |
| 20 | `probe:p353:records` (`P353_PARENT_CHECKOUT`, the records lens's built parent) | 0 | PASS in 269 s. Parent: deleted the removed row in 3 of 5 R305 cells (0, 1 and 5 ms; 25 and 100 ms came after its create), lost a tombstone in 0 of 20 R302 trials. HEAD: 0 findings, 0 unreadable; the removed row in Past at 0, 1 and 5 ms; 25 and 100 ms notes (the create had finished, about 22 to 30 ms); the log: the reap's guard 1, the restart's keep 3, the clause 0 |
| 21 | `probe:p353:starts` --preflight | 0 | the parent built and `out/` current |
| 22 | `probe:p353:starts`, tmux 3.7b both sides, the committed probe | 0 | PASS 7 of 7 in 185 s with the fixer's scratch `TMPDIR`: Prepare "This machine is ready.", the far project opened on attempt 1 at both launches; HEAD 0 of 45 here and 0 of 45 far outside their folder, created and restored; the parent 30 of 45 here and far (§2.6's row); F `flag;` and four more as typed with nothing injected; FP `flag` and the option ran; M and RUN; the census no change; the app's `TMPDIR` removed |
| 23 | `probe:p353:starts`, tmux 3.6a both sides | 0 | PASS 7 of 7 in 193 s: HEAD 0 of 45 here and far; the parent 29 of 45 (§2.6's); the rest as 22 |
| 24 | `probe:p292` h, h2, HEAD, 3.7b, three runs | 1, 1, 0 | the first stopped at h limit (`set-option -t =p292-limit` answers "no such session": a target pane needs the colon, measured on a scratch server, fixed to `=name:`); the second read h2 20 of 20 against the first held-range grader, which wrongly required whole first and last lines of the committed drag's six rows (an empty first row, a cut `L`), fixed; the third PASS in 117 s: wheel 0 never on screen in 29 notches, 2 re-freezes; ⇧PageDown 0 in 6; the drag 0, past the frame; quiet 10 notches of 10 lines, no re-freeze; the alternate screen no re-freeze; the history at its limit 58 never on screen, no re-freeze, the global put back to 25000 and the session 1000 of its own; h2 0 of 200 copies off at 55.6 lines a second and 0 of 20 ⌘C wrong, one range |
| 25 | `probe:p292` h, h2, the parent (`P292_CHECKOUT`, the terminal lens's built parent), 3.7b | 1 | FAIL 8, its defects read: wheel 129 never on screen and a 173-line jump; ⇧PageDown 125 and 169; the drag stopped at the frame's bottom (771 against 772); h2 36 of 200 copies off by up to 1, and 2 of 20 ⌘C wrong, two ranges |
| 26 | `measure:p337` K, in the copy | 2 | not readable: its drive refuses a `TMUX_TMPDIR` outside `/tmp`, so it cannot run under this phase's rules (below) |
| 27 | `smoke:t1`, without its build prefix (built at 8), under a lock slot | 0 | create 5 of 5, verify 6 of 6 |
| 28 | `probe:p292` h, h2, HEAD, 3.6a, twice | 1, then 0 | the first read h2's ⌘C 20 of 20 one line newer than the highlight, one range (`L959` against `L958`); the PARENT on 3.6a (row 29) read 20 of 20 nineteen lines off and two ranges, so this is the renderer's own estimate of the frame on a tmux that does not name it, which the parent shares, and h2's ⌘C half is now graded only where tmux names the frame and printed on 3.6a (arm h's D294-6, the same rule); the second PASS in 117 s: h by its re-freezes (wheel 0, ⇧PageDown 0, the drag 0, quiet 10 notches, the alternate screen 0, the limit 0 re-freezes, the global put back), h2 0 of 200 copies off at about 56 lines a second, and the ⌘C printed, 20 of 20 twenty-three lines off, ONE range |
| 29 | `probe:p292` h, h2, the parent, 3.6a | 1 | FAIL 3: h2 43 of 200 copies off by up to 1; 20 of 20 ⌘C nineteen lines off (`L998` against `L979`) and two ranges (15 and 5 presses); h by its re-freezes, none, its jumps printed (wheel 127 never on screen, ⇧PageDown 121), today's 3.6a path at both builds |
| 30 | `probe:p353:status` (`P353_PARENT_CHECKOUT`, the status lens's built parent), every arm | 2 | 2,000 s. HEAD 11 of 11 PASS: S-a 32 cells, 27 the parent's verdict reads as a question, none amber and no ⌘J row; S-b raised 5,000 ms after it was drawn; S-c the replayed gate grey and his own gate raised; S-d every question 2 s or more after his words raised, grey at 0.1, 0.5 and 1 s (the trade, Q4); S-e raised; G-a 80 polls at rest, every one idle, 20 of 20 ticks seeing the writes; **G-b, the fix round's grader, running through the turn and the silent tool, then idle with one boundary**; G-c, G-d never `needs_input`, as the parent's rule reads that launch's ticks; G-e. The parent 9 PASS (S-a 24 of 27 amber, G-a 80 of 80 running, the faults reproduced) and 2 UNREADABLE: S-d's monitor ticked 0.67 times a second and G-d's tick log held two reads under 1.5 s apart, while the fix round's own `probe:p292` launches came and went beside it; both were run again alone in row 31, and read. RUN: no Electron, stand-in or tool of the run left, the history unmoved |
| 31 | `probe:p353:status` S-d and G-d alone, both builds, with no other run of the fix round's beside it | 0 | 698 s: the parent S-d raised at 0.1, 0.5, 1, 2, 3 and 5 s, G-d never `needs_input` as its rule reads that launch's ticks; HEAD S-d every question 2 s or more after his words raised and grey at 0.1, 0.5 and 1 s (the trade), G-d `needs_input` as the parent's rule reads HEAD's ticks (two quiet ticks with the dialog drawn, the second at +3,154 ms); RUN clean |
| 32 | `npm run typecheck`, again, over the final tree | 0 | 5 s: 0 violations, no runtime cycles |
| 33 | vitest over `src/main/screen`, `src/main/pocket` and `src/main/reply` | 0 | 57 files, 2,141 tests |
| 34 | `npm run build`, again, over the final tree | 0 | 47 s, the same gates as row 8 (183 against 183, 94 under 94, 32 of 32 fixtures, 281 check scripts, 5 of 5, 55 rules, HP1 to HP6) and the contract inventory byte for byte |
| 35 | `shasum -a 256 src/main/menu.ts`; the end-of-run count; `stat` | — | `fe62e1dd05637c8764bbbe1777bd30ac8d4cfdc7be0c98aa5e6202f09e222ca3`, as at the start of the phase; no Electron of the fix round (the count's lines are his own `Tortie`, pid 67660, parent 1, and the crashpads of his apps); no scratch socket of the round under `/private/tmp/tmux-501/`; no ablation clone left; every lock slot released; the history `742243 1793907771` and `23166 1790702242` at 18:11 and at every one of 53 recorded readings from 18:23 to 20:04, before and after every run that started a shell, the app, sshd or tmux |

#### Not run by the fix round, and why

- **`measure:p337 -- --check`, or its K arm alone** (the table's row for `src/main/screen/**`): its drive refuses a
  `TMUX_TMPDIR` outside `/tmp` (`build/p337/drive-screen.mts:77`), so it cannot run under this phase's rule that scratch
  stays out of `/private/tmp`; tried once in a copy with its scratch moved (row 26), refused by that line. The fix round's
  change to the keys verb is one call after the act's promise has settled, which changes no byte typed and not the act's
  timing; the order is held by `conformance:pocket` Z4 and Z8, driven in `keys.test.ts`, and attacked by row 19's 54 arms.
  Owed to the main session or the reverify if the table's row binds.
- **`conformance:resume:capture`, `smoke`, `smoke:t3`**: the main session's at landing (real agents; `electron .` outside
  the helper).
- **`probe:p95` and `probe:p292:remote`**: `build/with-scratch-machine.mjs`'s `isolated()` runs ssh with no `-F none`,
  reading the account's ssh configuration (the terminal lens's reason); neither is reached by the fix round.
- **`probe:p284`** (§8 asks it once at HEAD, and no role has run it this phase), **`probe:p167`** and **`probe:p209`**: not
  reached by the fix round, whose terminal changes are `probe-p292.mjs` alone.
- **The rest of `ablation:p313`** (about 410 arms) **and all of `ablation:p320`**: owed since the integrator's STOP; the fix
  round ran the 54 arms on the files it moved (row 19). `ablation:p320` attacks the attach host's listener and the
  machines' carriage, which the fix round did not touch.
- **`ablation:p323` and `ablation:p331`**: not reached (`core.ts`, `detection.ts` and the registry are untouched by the fix
  round); the integrator's 43 of 43 and the records lens's 71 of 71 stand.
- **`npm run package:dir`**: not reached; the integrator's unsigned package stands.
- **The four `/bin/ps` native tests**: refused by the history block by design, never run outside it.
- **Any real agent, his manifest, a real machine**: refused by the phase's rules.

### The move to main and the drop of 325

**Why.** The reverify (at `b1a557b8`) approved seven items live and answered needs_work on 325 alone: a real question
drawn within about a second of his last key was taken for his own words and stayed grey (its replay: 240 of 360 cells
raised by the parent at 100, 500 and 1,000 ms after his last key, 0 at HEAD; at 2,000 ms and later HEAD raised all 240),
and some real prompts (Claude Code's trust gate, Codex's update prompt, qwen's second permission) were never raised
before his answer (§14 Q4's numbers). His ruling of 2026-11-08 ("2. a"): ship the seven, and redo 325 so it checks
what he actually typed instead of guessing from timing, as Phase 325.1. So this round (the p353b fixer, once) moved the
seven onto today's main and took 325 out, keeping it whole for 325.1.

**Where.** `/private/var/tmp/tortie-wt/wt-p353b`: the main session snapshotted the whole build (`/private/var/tmp/tortie-wt/wt-p353`,
untouched, at `b1a557b8`) as `7af6c8e8` and cherry-picked it WITHOUT COMMIT onto main `d94f898d` (17 commits past
`b1a557b8`: Phase 357's stopped list `5a6097ac`, Phase 356's release lane, 0.114.1), the index reset, six files holding
conflict markers. Scratch, scripts and every log: `/private/var/tmp/tortie-wt/scratch/p353b/fixer/`. 325 is kept at
`/private/var/tmp/tortie-wt/scratch/owed-p3251/` (outside this phase's scratch on purpose). Nothing was committed,
staged, stashed, rebased, pulled or merged; `/Users/gdc/gmux` was read only (one `git clone --local` from it).

#### M1, the six conflicts, each with both sides standing

| File | Resolution, and why |
| --- | --- |
| `src/main/sessions/core.ts` (`reapDeadSession`) | Phase 357 put the whole reap inside a `try` whose `catch` swallows only `isManifestStopped`; Phase 302 re-reads the row immediately before the write. The merge is 302's re-read, its guarded write and its guarded `exited` broadcast INSIDE 357's `try`, the `catch` byte for byte. The re-read sits inside on purpose: a list that stopped during the awaits refuses there, before the write, and records nothing more, as it does at the write; one sentence of the 302 comment says so. `killSessionAdmitted`'s re-read merged cleanly (357 did not touch it) |
| `CHANGELOG.md` | `## Unreleased`, `### Fixed`, above `## 0.114.1`, with the six items of 294, 295, 302, 305, 328 and 354 as the fix round left them; 325's item went with 325 (it is in the patch); 0.114.1's entry did not move |
| `CLAUDE.md` | First block: Phase 357's new `conformance:stoppedlist` row, then 353's widened `conformance:manager` row (the script asserted main had left the manager row exactly as `b1a557b8` had it, so 353's row is a pure extension). Second block: the three `probe:p353:*` rows, then `probe:p357`, in phase order |
| `package.json` | The three `probe:p353:*` scripts, then `probe:p357` |
| `build/verification-checks.mjs` | 353's three probe classifications, then 357's |
| `build/assert-electron-teardown.mjs` | Both paragraphs kept, 357's first (it landed first), 353's renumbered "FROM 181 TO 184"; `HELPER_USER_FLOOR = 184`, which `gate:electron` counts on the final tree (184 scripts reach the helper; `node build/assert-electron-teardown.mjs --list` prints 184, `p353/probe-records.mjs`, `probe-starts.mjs` and `probe-status.mjs` among them; 181 at the parent). `OPERATOR_ARGV_CEILING` 98 → 94 merged cleanly: 94 aim an argv at `-L gmux` under 94 at HEAD, 98 under 98 at the parent |

The two files main and 353 both moved without a conflict were read: `src/main/manifest/sessions-repository.ts` holds
357's broken-connection rethrow and 302's tombstone clause, and `src/main/capabilities.ts` held only 325's wiring (gone in
M2). A grep for conflict markers over the tree (vendor left out) finds none.

**Two consequences of the move, each fixed and named.**
1. `build/p293/ablation.mjs` K4's needle (`const fresh = this.manifest.getSession(sessionId);\n    const removedSinceRead`)
   no longer matched: inside 357's `try` the reap's lines are indented six spaces, not four. The first full
   `ablation:p293` read "FAIL, 1 in 257.1 s: K4 … the shape to ablate is not in src/main/sessions/core.ts"; the needle
   now names the six-space lines (`const fresh = rec;` still compiles there, `rec` being the `try`'s first line), and
   K3 (a substring of the indented line) and K5 (in `killSessionAdmitted`, outside any `try`) did not move.
2. The worktree's `node_modules` held only main's two WebGL hunks (it was copied from a checkout without 301), so
   HEAD's build would have shipped without 301's fix. The patch file's first hunk (301's) was applied with
   `/usr/bin/patch -p1 -F0` after a dry run; the file's sha256 is `e4ab05d2…`, equal to the old worktree's patched copy,
   and `node build/apply-patches.mjs` reads "already applied" for all three patches. HEAD's built renderer
   (`out/renderer/assets/index-DZp5lPKG.js`) holds the cleared warm-up queue and the parent's bundle does not.
   `node_modules` is not tracked, so `git diff` does not move.

#### M2, 325 out, exactly, and kept

Every file the drop touched was copied first to `owed-p3251/pre-drop/` (30 files, `pre-drop.sha256`). Then:
- **Deleted (325's alone, 5):** `src/main/attach/input-facts.ts`, `src/main/attach/__tests__/input-facts.test.ts`,
  `src/main/activity/__tests__/p325-own-words.test.ts`, `build/conformance-ownwords.mjs`, `build/p325/ablation.mjs`.
- **Back to main byte for byte (325's alone, 12):** `src/main/attach/attach-host.ts` (the tap widening),
  `src/main/activity/monitor.ts` (`noteOwnText`), `src/main/activity/index.ts` (`OWN_TEXT_MIN`), and the fix round's
  phone writers: `src/main/screen/keys.ts`, `src/main/screen/paste.ts`, `src/main/capabilities.ts`, their rows in
  `keys.test.ts` and `p348-paste.test.ts`, S1's row in `src/main/reply/__tests__/core-wiring.test.ts`,
  `build/conformance-pocket.mjs` (Z7), `build/ablation-p313.mjs` (Z7v) and `build/p311/copy-drift.mjs` (the counter
  in the log rule).
- **325's lines out of a file another item keeps (13):** `src/main/activity/state-machine.ts` (`OWN_TEXT_MIN`, `ownText`,
  `ownMark`, `dialogSeen`, `OwnText`, `OwnMark`, `OwnTextFacts`, the hoisted `screenHash`, `own` and `dialog && !own`,
  `ownDialog`, `noteOwnTextOn`, and the drops in `noteAgentLeft` and `noteReturn`; 328's `lastOutputAt`, clauses A and B,
  `weakVerdict` and `worthProbing` stand, and the file's diff against main is 328's alone); `src/main/sessions/core.ts`
  (the `OWN_TEXT_MIN` import, S1's note and its comment back to 318's line, S2's block; 302's two re-reads and 294's
  S-T stand); `src/main/restore/restore.ts` and `src/main/restore/__tests__/p354-folder-as-recorded.test.ts` (S5: the
  outcome's `replayed` flag and its describe block, header sentence and scaffolding; the `starts` builder added S5 FOR
  D325-8, and its one production reader was S2, so it is 325's; `folderAsRecordedFor` and every 354 row stand);
  `build/p353/probe-status.mjs` (arms S-a to S-e, their five graders, their 24 self-test cases, `PAGE_KIT`, `select`,
  `words`, `key`, `panelHas`, `currentCommand`, `Q1`, `MIN`, the default arm list and the header; 328's G-a to G-e,
  `predictNeeds`, `alignModes` and the tick log stand); `build/p321/stand-in.mjs` (the `input` op's `bracketed`, which
  only S-a and S-d asked for; 328's `modes` and `terminal-tool` stand); `CHANGELOG.md`; `CLAUDE.md` (the
  `conformance:ownwords` row, `input-facts.ts` in the phonecopy row's paths and log clause, the reply row's `onInput`
  sentence, the status probe row's 325 paths and arms); `package.json` (`conformance:ownwords`, `ablation:p325`);
  `build/verification-checks.mjs` (their two classifications; the status probe's comment now names 328's arms, and the
  `ablation:p328` comment, which said "the same kind of clone" of 325's, names the clone itself);
  `build/assert-electron-teardown.mjs` (the status probe's clause); and two comments, in
  `p328-writes-without-drawing.test.ts` (it pointed at the deleted p325 file) and `p321-parent-rule.ts`.
- **The patch:** `owed-p3251/item-325.patch`, 30 files (5 new), 327,367 bytes, sha256 `007810fc…`, made with
  `git diff --no-index` between the post-drop and pre-drop copies with the paths rewritten. `git apply --check` exits 0
  in the worktree at the end of this round, and applied to a copy of the 25 post-drop files it gives back all 30
  pre-drop files byte for byte (the two sha256 lists compare equal). `owed-p3251/README.md` says what 325 built, the
  reverify's measured misses, and that 325.1 redoes it by what he typed rather than by time.
- **What did not move:** the other six items. A re-derivation from git's own objects (`check-delta.mjs`): the 53 files
  only 353 moved equal the snapshot `7af6c8e8`'s; the 44 files only main moved equal `d94f898d`'s; 17 of 325's 30 equal
  main and 13 hold another item's lines; nothing else differs from main. `git diff --stat d94f898d`: 50 files, 4,505
  insertions, 866 deletions, and 17 new files beside this SPEC. `src/main/menu.ts` sha256 `fe62e1dd…`, main's.
  `docs/audits/contract-baseline.txt` does not move.

#### M3, the commands, in order (under the history block unless it starts an Electron)

| # | Command | Exit | Numbers |
| --- | --- | --- | --- |
| 1 | `stat` the history; `df -h /` | — | `743166 1793987027` and `23166 1790702242` at 17:09 and at every one of 29 readings, the last at 18:33:56; 48 GiB free, then 43 to 44 |
| 2 | the parent: `git clone --local /Users/gdc/gmux wt-p353b-parent`, detached at `d94f898d`, `node_modules` and `build/vendor` by `cp -Rc` (before 301's hunk was applied here, so the parent's WebGL bundle is main's), then `npm run build` | 0 | 106 s; `gate:electron` 577 files, 181 against 181, 98 under 98; kept for the reverifier at `/private/var/tmp/tortie-wt/wt-p353b-parent` |
| 3 | `npm run typecheck` | 0 | 60 s: 87 fixtures, 1,439 production files, 8,224 imports, 0 violations; no runtime cycles over 1,436 files and 5,031 edges; shared types OK |
| 4 | `node build/contract-inventory.mjs --check` | 0 | byte for byte; removing 325 moved no contract line (325 had added none) |
| 5 | `npm test` (load average 85, from the two other workflows) | 1 | 135 s: 1,192 files (8 failed, 1,180 passed, 4 skipped), 22,748 tests (10 failed, 22,715 passed, 23 skipped): the four `/bin/ps` natives and six under load (`p336-far-prelude` and `p254-large-prose` timed out at 15 s, `specstory/login` twice, `p200-shutdown`, `p281-usage-read`); those five files alone read 79 of 79 at HEAD (10 s) and 79 of 79 at the parent (22 s) |
| 6 | `npm run build` | 0 | 55 s: `gate:electron` 582 files, 184 against a floor of 184, 94 under 94, 32 by shell under 32, 32 of 32 ablations; `gate:background` 584 files, 3 start, 32 of 32; `gate:simulator` 5 of 5; `gate:docker` 2 of 2; `gate:knownhosts` 612 files; `gate:checks` 283 check scripts (280 at the parent), 1,192 test files; `conformance:ios` 55 rules; `gate:onlyadd` PASS; `conformance:harnessprobes` 6 clauses, 16 ablations; stapler self-test 31, 18, 28; contract byte for byte |
| 7 | `conformance:manager`, `remoteclose`, `endtree`, `farattach`, `choices`, `handback`, `phonecopy`, `push`, `agents`, `installs`, `shellenv`, `stoppedlist`, `evidence` | 0 each | 72 rules and 2,919 checks; 11 tests; 16 rules and 84 self-tests; 11 rules; 27 clauses and 33 self-tests; PASS; `phonecopy OK` (back to main's rule); 26 rules and 2,410 checks; PASS; PASS; PASS; ten rules over 1,436 files and 51 ablations each red, the control green (357's catch in `core.ts` with 302 inside it); rule 11's floor reads 184 against 184 scripts |
| 8 | `conformance:pocket`, `pocket:hostile`, `machines`, `credentials` | 0 each | 192 rules and 25,725 checks (13 s, Z7 main's); 363 arms (18 s); PASS (27 s, condition 110 over main's attach host); OK (48 s) |
| 9 | vitest over 357's nine files, 302's two, `p293-lifecycle-gate`, `restart`, `p125-core-split`, `p354-folder-as-recorded`, `p328`, `p321-masking`, `p321-shapes`, `core-wiring`, `keys`, `p348-paste`, `p342-far-names` | 0 | 22 files, 793 tests, 22 s |
| 10 | `ablation:p293` (`P293_SCRATCH`), then K3, K4, K5, then the whole again | 1, 0, 0 | FAIL 1 in 257.1 s (K4 shape missing, consequence 1 above; every other arm red on its owner); after the needle, 3 of 3 in 35.8 s; then PASS in 246.1 s, 109 ablations, each red on its owner |
| 11 | `ablation:p328` (`P328_SCRATCH`) | 0 | PASS in 194.4 s, 10 of 10 over the state machine as it stands after the drop |
| 12 | `ablation:p321` and `ablation:p312`, in a clonefile copy of the worktree (p321's clone root moved from `/private/tmp` to this scratch in the copy; p312 edits its tree in place), the copy removed after | 0, 0 | PASS 33 of 33 in 135 s; OK 23 of 23 in 72 s |
| 13 | `GMUX_SCROLL_IT=1 GMUX_CAPTURE_IT=1 GMUX_ARG_IT=1`, scratch `TMUX_TMPDIR` and `TMPDIR`, one lock slot | 0, 0 | **3.7b** 16 of 16 (50 s): [295] one invocation off 0 of 300, 300 and 200, the two-call pair 82 of 300 by up to 1; [294] 0 never on screen in 100 notches, today's bytes 74 in 33; [354] 90 cells, HEAD 0 and today 60, the `#(` job never at HEAD and run today. **3.6a** 16 of 16 (46 s): [295] 0, 0, 0, the pair 48 of 300; [294] the frame not named, today's jump (D294-6), 80 never on screen; [354] HEAD 0 and today 58, no job at HEAD. No socket left |
| 14 | the three probes' `--grader-self-test` | 0, 0, 0 | records 28 of 28; status 37 cases (61 before the drop's 24); starts 44 fixtures and 3 table checks |
| 15 | `node build/p321/probe-p321.mjs --grader-self-test` (a MISTAKE, below) | 1 | the probe has no such flag and began its app run inside the history block, with no lock slot and its world under `/private/tmp/p321-probe-<pid>`; it threw after 90 s ("Runtime.evaluate timed out"), its teardown unlinked its scratch socket and removed its world, and `ps` outside the block read no Electron, stand-in or socket of it left; its report file `out/p321/probe-p321.json` (ignored) was removed |
| 16 | `probe:p353:records`, the parent then HEAD, one lock slot | 0 | PASS in 270 s. Parent: deleted the removed row in 3 of 5 R305 cells (0, 1, 5 ms; 25 and 100 ms came after its create), lost a tombstone in 0 of 20 R302 trials (the race). HEAD: 0 findings, 0 unreadable; the removed row in Past at 0, 1 and 5 ms; log `keptRestart 3`, `guardReap 0`, `guardEnd 0`, `clause 0` |
| 17 | the fixer's own death-path probe (`scratch/p353b/fixer/death-probe.mjs`, not committed), inside `build/harness-socket.mjs` (`gmux-p353d…`), through `withElectron`, the parent then HEAD, one lock slot | 1, regraded PASS | 171 s. **D1, a pane that dies**: both builds exited about 760 ms after `exit 3`, in the managed list, no removal date, the death line, the manifest `exited`; the same. **D2, a pane that dies after its row was removed**: the End started a measured lead before a monitor tick (the tick clock off a tmux wrapper, period 999 to 1,010 ms), a full 24,481-row history slowing its capture, the shell told to exit at once and a Remove every 2 ms: 9 cells a build ran (one had too few ticks to aim at); at the PARENT the 60 ms cell left the removed row back in the managed list WITH its removal date and the manifest `exited` beside `removed_at` (302's defect, live); at HEAD the same cell printed the reap's guard line, "a removed session's pane died … it stays in Past Sessions", and the row stayed `discarded` in Past, 0 torn. **D3, a pane that dies while the list is stopped** (357's fault seam on `listSessions`): both builds kept answering `list()`, `listRemoved()` refused `MANIFEST_STOPPED` (357's design), the app stayed alive, nothing about the death was recorded (no death line, the manifest row still `running`), and no unhandled rejection or uncaught exception was printed; the same. The run's own grader read D3 as two findings because it wrongly required `listRemoved` to answer on a stopped list; `death-regrade.mjs` re-reads the recorded readings with that rule corrected: PASS at both |
| 18 | `probe:p353:status`, the parent then HEAD, 328's arms G-a to G-e (325's gone), one lock slot | 0 | 610 s, the monitor at 0.47 ticks a second in each launch. Parent: G-a 80 of 80 polls at rest running (the fault, reproduced); G-b running through the turn and 44 of 44 through the silent tool; G-c never `needs_input` and G-d `needs_input` (+3,645 ms), each as the parent's rule reads that launch's ticks; G-e idle. HEAD: G-a 80 polls over 40 s, every one idle, 20 of 20 ticks seeing the writes as output; G-b running through the turn and the tool, then idle with one boundary; G-c never `needs_input`, G-d `needs_input` (+3,830 ms), each as the parent's rule reads HEAD's ticks; G-e idle. No Electron, stand-in or tool left; history unmoved |
| 19 | `npm test`, again, load average 5 to 11 | 1 | 65 s: 1,192 files (3 failed, 1,185 passed, 4 skipped), 22,748 tests (4 failed, 22,721 passed, 23 skipped): exactly the four `/bin/ps` natives (`process-table.native` 1, `ps.native` 2, `p269-env-names` "kills a shell that never exits" 1) |
| 20 | `git apply --check owed-p3251/item-325.patch`; the 25 post-drop files against the copies the patch was made from | 0 | 0 files moved since the patch was made |

#### Not run, and why
- **`ablation:p323`** (`killSessionAdmitted`'s attack): the merge left its text as the integrator's 43 of 43 read it, and
  `conformance:endtree` is green; **`ablation:p331`** (354's guard): no file it reads moved in the move or the drop;
  **`ablation:p320`** and **`ablation:p313`**: the attach host and every pocket and screen file are now main's byte for
  byte; **`measure:p337`**: refuses a `TMUX_TMPDIR` outside `/tmp`, and its files are main's.
- **`probe:p292`, `probe:p167`, `probe:p209`, `probe:p95`, `probe:p284`, `probe:p353:starts`**: the terminal items and 354
  moved in neither the merge nor the drop (the `check-delta` re-derivation above), and the reverify approved them live;
  the opt-in integration tests (row 13) re-read 294, 295 and 354 against real tmux on today's base.
- **`smoke:t1`, `smoke`, `smoke:t3`, `package:dir`, `conformance:resume:capture`**: refused by this round's rules (no
  smoke, no package; real agents), the main session's at landing.
- **The four `/bin/ps` native tests**: the history block refuses `/bin/ps`; never run outside it.

#### At the end
- His shell history: `743166 1793987027` and `23166 1790702242`, never moved (29 readings in `history.txt`).
- Electrons (CLAUDE.md's count, 18:33): none of this round; the lines are his own `Tortie` (pid 692, parent 1) and the
  crashpads of his Tortie, Slack, Chrome, Granola and Cursor.
- Every lock slot released; no `p353`/`p321` socket under `/private/tmp/tmux-501/`; no ablation clone under
  `/private/tmp` or the scratch; the worktree copy removed; the parent kept at `/private/var/tmp/tortie-wt/wt-p353b-parent`.
- For landing: `/private/var/tmp/tortie-wt/scratch/p353b/` goes with this phase's scratch (beside `p353/`, §13), and so
  does the parent once the reverify is done; `/private/var/tmp/tortie-wt/scratch/owed-p3251/` stays, for Phase 325.1.

### The landing (the main session, 2026-11-08)

- **The move's reverify approved**, with one minor and three nits. The three nits are words and were fixed here: the
  move section's count reads 17 new files beside this SPEC; `CLAUDE.md`'s `probe:p353:records` and `probe:p353:starts`
  rows, the `verification-checks.mjs` comment and the two probes' headers name the parent as the main commit before this
  phase rather than `b1a557b8` (`probe-starts.mjs`'s `SNAPSHOT`, read only by its refusal sentence, with them); the
  `probe:p353:status` row carries the fixer's 610 s.
- **The minor, 301's patch at install.** 301 adds a hunk to `patches/@xterm+addon-webgl+0.19.0.patch`. A clean install
  applies all three hunks (CI's `npm ci`, `.github/actions/setup/action.yml`), so a release carries 301. A `node_modules`
  that already holds main's two hunks, his checkout's and every worktree copied from it, reads the three-hunk patch as
  `mixed` and `postinstall` exits 1, and `npm run build` and `npm run package` run no install step, so a build from such a
  tree leaves 301 out without a word. At landing: this worktree's `node_modules` carries 301's hunk (sha256 `e4ab05d2…`,
  the fixer's), so the battery's package holds it; his checkout needs `@xterm/addon-webgl` reinstalled once (`rm -rf
  node_modules/@xterm/addon-webgl && npm install`, or `npm ci`), after which `node build/apply-patches.mjs` reads `already
  applied` for every patch; until then a new worktree copied from it gets 301's hunk by hand before anything is built there.
- **`conformance:resume:capture` was not run at landing.** §13 asks for it with the real agents. It starts each installed
  agent under his HOME, and Claude Code's folder question writes to his own agent settings; this session runs stand-ins
  only. The restore half of 354 is covered by `probe:p353:starts`'s matrix (a pi stand-in recorded by the parent and
  restored by HEAD), the 354 unit and integration tests, and `conformance:agents`.
