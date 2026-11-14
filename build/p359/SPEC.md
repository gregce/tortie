# Phase 359 — "a second session core boots while Tortie quits" — SPEC

Written by the spec step on 2026-11-09 in `/private/var/tmp/tortie-wt/wt-p359`, a detached worktree at origin/main
`7bd05d4e` ("docs(backlog): 362 landed on the default; link its changelog"; Phase 357.1 landed at `5895b12b`, Phase 362
at `d84bed31`, 353 and 361.1 landed). **`git diff 7bd05d4e` in the worktree must be exactly Phase 359's delta**, this
file included. origin/main moves while the phase runs; nobody here rebases, pulls or merges; the main session moves the
tree at landing. The charter is `docs/BACKLOG.md` "## Phase 359" (`:44716`), bound as written except where §0.1 says
the tree or a measurement wins. Phases 77 and 116 bind it (the slot's lifecycle, `src/main/sessions/core.ts:4497-4662`),
and Phase 144 stage 1's one-way quit flag (`src/main/lifecycle.ts:27-62`) is the precedent it extends. His standing
rulings bind: **no regression against today** (a scenario worse than the parent is a defect: fix it or drop the part,
and name which); Tortie never ends a session on its own (a quit ends the app, never a session); just enough words; no
tmux vocabulary on any surface; nothing released, tagged, version-bumped, archived or uploaded; his session count is
allowed (build/electron-run.mjs's read-only census).

| | |
| --- | --- |
| Subject | `fix(sessions): boot no session core once the quit has begun` (the entry's) |
| First body line | `Phase 359: no second core boots during the quit` |
| Semver | Patch, unreleased, Mac only, released on his word. One CHANGELOG item under `## Unreleased`, `### Fixed` (§5), because the build measures something a person sees move (§2.1, D2 against D2n) |
| Lane | Build: Spec → Build (THREE builders, disjoint files) → Integrate → Verify (two lenses) → [Fix once → Reverify] → Commit |
| Tier | **3**: it decides when the session core may start, and a core that starts inside a quit quarantines and restores the manifest, spends a backup generation and writes rows after the quit generation (all three measured at the parent, §2.1), so it can lose or corrupt a person's work (CLAUDE.md:268). He did not report it, so the parent measurement is Method 1 rather than a requirement, and it is run (§2). Two independent methods at least, one an attack (§10) |
| Menus | **No row added, renamed or removed.** Nothing a person presses moves |
| Contract | **Does not move.** No invoke channel, env name, schema, migration, smoke mode, `gmux.*` key or notice kind. The prototype's build read the inventory byte for byte (§2.4); a diff at HEAD is a finding |
| `HELPER_USER_FLOOR` | **186 → 187**: `build/p359/probe-p359.mjs` reaches `build/electron-run.mjs` (obligation 1) |
| CHANGELOG | One item (§5); the commit link is added by the follow-up docs commit |

## 0. The hard rules, stated once (every builder, the integrator, every verifier, the fixer, the reverifier)

- NEVER commit, stage or stash. `/Users/gdc/gmux` is read only. Never touch another phase's worktree or scratch
  (Phase 325.1 runs in `wt-p3251`; Phase 360's `wt-p360` waits on his answer). Scratch lives under
  `/private/var/tmp/tortie-wt/scratch/p359/<role>/`, never under `/private/tmp`; a probe's `TMPDIR` points there too.
- **The built parent is kept for you**: `/private/var/tmp/tortie-wt/scratch/p359/spec/parent` is `7bd05d4e`, a
  `git clone --shared` of the worktree with `node_modules` and `build/vendor` cloned by `cp -Rc` from it (specstory
  2.10.0; `addon-webgl.mjs` sha256 `e4ab05d2ee9d7a27…`) and `out/` built by the spec step (52 s, exit 0, the helper
  floor 186 of 186). Use it as `P359_PARENT_CHECKOUT`. Do not edit it, build in it or delete anything in it. Its
  `build/p359spec/measure.mjs` and `src/main/power/__tests__/p359spec-power.test.ts` are the spec step's scratch
  instruments (never committed); read them, do not import them. Beside it, `proto/` is the design's two hunks on the
  parent (§2.3), built, kept as the reference for what HEAD must read; it is not HEAD and proves nothing about the
  builders' code. The spec step's raw readings are in `/private/var/tmp/tortie-wt/scratch/p359/spec/fixtures-raw/`
  (`parent-<arm>/` and `proto-<arm>/`: each launch's witness events, app.log, the backup index and the gmux folder's
  listing; `report-<batch>.json`), and its logs in `…/spec/logs/`.
- `-L gmux` is named only by `build/electron-run.mjs`'s census, and only with `list-sessions`. Every launch's tmux
  work aims at its own scratch socket with the checkout's vendored tmux (3.7b).
- **No real agent runs, not even for a version.** Every launch hides every probed registry row
  (`writeHiddenAgents(profile, prefix, hiddenAgentsBesides([]))`) and reads `agents:list` back
  (`standInsOnlyVerdict(list, { standIns: [] })`); every arm runs shells. `conformance:resume:capture` starts real agents
  and is NOT run; the harness cycles are proved by `smoke:fault`, `smoke:t1` and `probe:p359`'s HC arm (§8).
- Never read his keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex`, any agent's or conversation store,
  his shell history's contents or his live Tortie profile. Real data is his recorded shape through
  `build/p3167/seed-sessions.mts --shape his` (counts only). Damage is made in SCRATCH profiles only, by 357's method
  (one `sessions` leaf's type byte after a checkpoint, a second connection's write). His crash reports are counted by
  NAME and mtime only (34 names before and after every batch of the spec step).
- His shell history is never written by us: every command that does not launch an Electron or need `/bin/ps` runs under
  `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb`; the four `/bin/ps` native tests fail inside it by
  design (`process-table.native` ×1, `ps.native` ×2, `p269-env-names` ×1; name each as it fails, never run them outside
  it). What needs Electron, `/bin/ps` or `lsof` runs outside it with `HOME` and `ZDOTDIR` in scratch,
  `HISTFILE=/dev/null`, `SHELL=/bin/sh`, `TERM_SESSION_ID` and `TERM_PROGRAM` unset (run the wrapper as `zsh -f`, and
  give it absolute paths for his history and his reports folder, because `~` is the scratch HOME there). Record only
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before and after every run (the spec step read `743319 1794200266`
  and `23166 1790702242`, unmoved across every run). A move across an unblocked run: start nothing for 3 minutes and
  stat again; moved again is his; still moved means STOP and report.
- Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids you started, each read again by
  `ps -p <pid> -o command=` right before its signal; every process you start ends in a `finally`. Never signal a probe
  while its own teardown runs. **His Tortie has the same bundle id as every build you run**: never an Apple Event,
  `osascript` or `open`; a quit is pressed through the native row in main (`item.click()`), the bridge, `app.emit`, or
  the harness; focus, blur, sleep and wake only through the app's own listeners (`app.emit('browser-window-blur', …)`,
  `powerMonitor.emit(…)` from a scratch preload in main), because a harness app is never active (Phase 362 §0.1 item 4)
  and focusing a window for real would take his focus.
- Every Electron goes through `build/electron-run.mjs` inside `build/harness-socket.mjs` (the two quit smokes through
  `build/quit-smoke.mjs`), with a scratch profile, `HOME` and socket. `npm run smoke` and `npm run smoke:t3` start
  Electron outside the helper and are not run (§11). No Simulator. No real Tailscale, DNS, APNs or ssh to a real host;
  another machine is ONLY the loopback machine of `build/scratch-machine.mjs` with its quiet shell and a scratch far
  home, as `probe:p340` builds it (never `build/with-scratch-machine.mjs`'s `isolated()`); never `smoke:remote` or
  `smoke:machines`. Never import a `build/` script to inspect it; read it as text.
- The lock has three slots shared with the other phases: `zsh /private/tmp/tortie-ops/lock.sh try p359-<role>` prints
  the slot or exits 1 (retry every 60 s in a NEW command); release with `zsh /private/tmp/tortie-ops/lock.sh release
  <slot>` from a `trap`. Every probe or app run holds one. `df -h /` before any build or clone; under 8 GB free, wait
  and report (91 GiB free at the end of the spec step).
- **Doors are driven in scratch only.** No seam enters the shipped app: the witness preload is a scratch file the probe
  writes and loads by `NODE_OPTIONS` into a harness launch.

## 0.1 What the entry and the parent reading give, measured (the tree and the measurements win; each binds)

Everything here is run, not read, at the parent `7bd05d4e` under `/private/var/tmp/tortie-wt/scratch/p359/spec/`
(driver `parent/build/p359spec/measure.mjs`, runner `lockrun.sh`), and §2 holds the numbers.

1. **Every door the entry names still boots a second core at the parent, after 357.1 and 362.** 357.1's `will-quit`
   hard exit and 362's quit that runs its disposer to its end did not close the door; they shortened the second
   core's life to what is left of the quit after the slot empties: the will-quit wait (about 150 ms), or the late
   drain's 3 to 15 s. Inside 150 ms the second core passed its manifest gate, opened the session list, started a
   control client, reconciled and wrote the sessions table, and took a `launch` backup generation (B1, twice; L1; P1),
   all in the quitting process. A launch's witness stack names each door (§2.1).
2. **Door 3 is wider than the entry read.** No remote join is needed. The disposer's own `stopLiveSampling()`
   (`src/main/capabilities.ts:1005-1007`, after `shutdownGmuxCore()` at `:904-908`) closes Live Diagnostics' streaming
   top, whose `close()` resolves every pending sample with null (`src/main/diagnostics/top-stream.ts:241-256`), so a
   tick whose finish was waiting for its sample (`src/main/diagnostics/report.ts:359`) goes straight on to
   `readSessionFacts()` (`:392`, which asks `getGmuxCore()` at `:239`) after the slot emptied: in L1 the boot came 2 ms
   after the core's dispose. With the real top it needs a tick in flight at the stop, which one natural run (L0) did
   not have. So the entry's arm "a quit whose remote join waits on a child held open on the loopback machine" is
   replaced by a top that answers late (a stand-in that prints nothing), and the loopback machine is not needed for it.
3. **Door 1 fires at the window's close and at the late drain's hide.** A focused window's close and the late drain's
   `w.hide()` (`src/main/capabilities.ts:1104`) each blur it; the blur handler's `setTimeout` asks `getGmuxCore()`
   (`src/main/index.ts:738-749`). B1 boots at the close (the will-quit wait left); H1 boots at the hide and its core runs
   for 3 s before the quit ends (the late drain held by a backed-up pool, Phase 36's measured state). Because a harness
   app is never active, both emit the app's own `browser-window-blur` event at those two moments; that a real focused
   window blurs there is read from Electron (a key window resigns key when it closes or is ordered out) and from 357's
   own run, where a second core booted in a harness quit with no event emitted.
4. **Door 4 is measured.** A quit pressed before startup asks for the core (S1) ran its whole disposer in 10 ms
   (`shutdownGmuxCore()` returned at `core.ts:4604`, no boot asked), and startup then asked at `index.ts:621` 20 ms after
   the press and booted. The process ended through Node's teardown (exit 0) before that core reached the manifest. The
   same startup also opened its window into the quit (59 ms, closed at 106 ms), at the parent and at the prototype (§14
   Q1).
5. **Door 2 is measured twice.** In vitest over the shipping `installPowerHandlers` with the drivable monitor and the
   shipping core and lifecycle (the deps copied from `index.ts:770-799` as text): a suspend after the quit's shutdown
   booted a second core, captured on it and took a suspend generation on it; the resume joined it; the slot was left
   `ready` with a core nobody will dispose. Live (P1): `powerMonitor.emit('suspend')` from a scratch preload at the
   window's close booted one (stack `captureAll ← suspendWork ← onSuspend`) and it took a `launch` generation.
6. **What the second boot does, measured or not** (`GmuxCore.boot()`, `core.ts:1530-1663`):
   - **The restore is silent: MEASURED.** 357's §2.2 run 2 at the parent (D2: three shells, the one sessions leaf
     damaged while it ran): the quitting process's second core quarantined the file
     (`manifest.db.damaged-20261109T065138Z` left after the quit, `notice.shown manifest-quarantined` logged by the
     QUITTING pid 139 ms into the quit), and the relaunch showed no toast. With no door (D2n), nothing was quarantined at
     the quit and the relaunch quarantined the file and showed "Session list damaged. It was rebuilt." with "Show the
     file", read in the DOM. Both relaunches listed 0 rows, because the launch generation predates the three shells: the
     same data, told or not told.
   - **It spends a backup generation: MEASURED.** The ring after B1, L1, P1 and H1 holds a `launch` generation captured
     187 ms to 6,062 ms AFTER the quit generation, by the quitting process; C0 holds launch and quit only. In D2 the
     dying core's take is a copy of the generation it had just put back.
   - **It writes after the quit generation: MEASURED.** That `launch` generation's `sessions` digest differs from the
     quit generation's in every one of those runs (the same three rows, rewritten by the second core before its copy;
     its reconcile runs first, `core.ts:1591`).
   - **It starts a control client: MEASURED; it outlives the quit: REFUTED here.** A `tmux -C new-session -A -s
     gmux-control` was spawned 154 to 263 ms in (3.2 s in H1); after the process ended, the scratch server listed no
     client in any run, because the will-quit SIGKILL closes its pipes.
   - **It can re-arm native watches, it can mark a machine's sessions unknown: NOT MEASURED** (no id harvest and no
     confirmed machine in the arms). Read from code: the reconcile re-arms harvests (`core.ts:2467`), and the sign-in
     (`core.ts:1661`, `:1687-1761`) is refused once the remote ledger closed (`src/main/machines/execution-ledger.ts:
     350-361`, closed at `capabilities.ts:949`) and that refusal marks the machine quiet (`core.ts:1739-1747`,
     `src/main/machines/remote-sessions.ts:3391-3406`), which writes its rows `unknown` into the manifest (`:801-829`).
     D1 closes both with the boot. §10.1 measures the second on the loopback machine as the verifier's independent step.
7. **More callers than the four, by the spec step's search** (a grep of every `getGmuxCore` outside `src/main/harness/`
   and tests, with the call graph read): handlers admitted BEFORE `markAppQuitting()` that ask after an await, which
   the typed invoke refusal (`src/main/typed-ipc.ts:53-59`) does not reach because it refuses only new invokes:
   `projects:create` (git init, then `addProject`, `src/main/projects/index.ts:70-75`), a clone that exited before the
   disposer's cancel (`src/main/projects/clone.ts:420-427`, `:803`; `dispose()` joins only runs still in its map,
   `:603-611`), the file verbs' project roots (`src/main/fs/project-roots.ts:59-61`), the context and overview manifest
   getters (`capabilities.ts:285-288`, `:300-303`), the credentials' live sessions probe (`:342-352`) and the door's
   overview getter (`:490`). The tray asks once at install (`src/main/tray/index.ts:214-223`), which only a startup the
   quit overtook reaches. Each needs its handler still waiting when the slot empties; none was driven, because D1 closes
   all of them at the one call they share.
8. **probe:p357's boot count reads the wrong thing.** Its reader counts one `macOS login session` line per boot
   (`build/p357/probe-p357.mjs:379-384`), but a boot logs TWO: its own `ensureServer()` (`core.ts:1531`) and its control
   client's first connect, whose precheck calls `ensureServer()` again (`src/main/tmux/control-client.ts:187-198`), and
   a reconnect logs one more. Every app.log of this step and every one in `build/p362/fixtures/raw/*/app.log` holds two
   per launch. So it is graded by time, not by count (D7).
9. **Citations at this head.** `getGmuxCore()` `core.ts:4570-4588` (the Phase 116 refusal `:4571-4573`, the boot branch
   `:4574-4586`, the one production `GmuxCore.boot()` `:4576`), its comment `:4552-4569`; `shutdownGmuxCore()`
   `:4602-4662` (no boot asked `:4604`, `shuttingDown` `:4611`, the slot emptied and `empty` set in its `finally`
   `:4646-4659`); `SHUTDOWN_REFUSAL` `:4505`, `shutdownRefusal()` `:4515-4517`, `CoreLifecycleState` `:4525-4536`.
   `appLifecycleState()` `src/main/lifecycle.ts:51-53`, `markAppQuitting()` `:60-62`. `before-quit` `index.ts:825-855`
   (`markAppQuitting()` `:834`); `will-quit` `:902-919`; startup's three asks `:621-632`, `:646-655`, `:686-692`;
   `createWindow()` at startup `:715`; the cadence handler `:738-749`; `installPowerHandlers({…})` `:770-799`, its
   return value dropped. The disposer `capabilities.ts:720-1145` (first lines `:726-794`, the core's shutdown
   `:904-908`, the remote ledger `:949-964`, the wedge race with `stopLiveSampling()` `:970-1015`, the late drain's hide
   `:1104`, `return 'proceed'` `:1144`); `coreReady` `:404-407`. `installPowerHandlers` `src/main/power/index.ts:212-321`
   (`suspendWork` `:237`, `onSuspend` `:267`, `onResume` `:297`, its disposer `:317-320`). Live Diagnostics: `runTick`
   `src/main/diagnostics/live.ts:76-127` (nothing sent after a stop, `:111`), `stopLiveSampling()` `:172-183` (the
   instrument's close `:179`), the live start's top stream `src/main/diagnostics/ipc.ts:87-94`. The gate's quarantine
   notice `src/main/manifest/boot.ts:474-478`; notices said once per run `src/main/notice/index.ts:78-104`. The import
   wall: `src/main` may import `src/main` (`build/assert-import-boundaries.mjs:30`); `lifecycle.ts` imports nothing.

## 1. The answer first

| # | What | One line |
| --- | --- | --- |
| 1 | The check (item 1) | `getGmuxCore()` refuses to boot once the app is quitting: in its boot branch only, `if (appLifecycleState() === 'quitting') return Promise.reject(shutdownRefusal('getGmuxCore'));`, so a core in the slot is still handed back while the quit runs, and an empty slot is never filled again in a quitting process. Harness cycles never mark the app quitting, so their second boot is unchanged |
| 2 | The doors (item 2) | All named (§0.1 items 1 to 7). None is removed or stopped earlier: each already catches, and each answers the refusal quietly through that catch. Weighed in D3 |
| 3 | The startup line (item 3) | A startup the quit refused logs `the session core was not started, because Tortie is quitting` (scope `boot`, info) and not `core boot failed` |
| 4 | The checks (item 4) | vitest over the shipping core and lifecycle (the four doors' shapes, the harness cycle, a suspend and a resume over the drivable monitor) with an ablated copy of `core.ts` that reads red; `conformance:stoppedlist` gains S16 with in-memory ablations; `probe:p357` grades "no boot after the quit began" per pid by time |
| 5 | The proof | `probe:p359` (new): each door driven at both builds, parent first, the boots per pid read from a witness's stacks and from app.log; 357's §2.2 run 2 with the notice read in the DOM; the shutdown-refusal harness's real second boot; his recorded shape's quit beside the parent's |

### 1.1 The decisions, each with its reason

| Id | Decision | Reason (where it comes from) |
| --- | --- | --- |
| D1 | **The check lives in `getGmuxCore()`'s boot branch and reads the app's quit flag.** In `src/main/sessions/core.ts`, `import { appLifecycleState } from '../lifecycle';` and, as the FIRST statement inside `if (corePromise === null) {` (`:4574`), before `lifecycle = 'booting'`: `if (appLifecycleState() === 'quitting') { return Promise.reject(shutdownRefusal('getGmuxCore')); }`. Nothing else in the function moves: the Phase 116 refusal stays its first statement, the boot callbacks stay as they are, and a refusal touches neither `corePromise` nor `lifecycle` | Entry item 1. `core.ts:4576` is the one production `GmuxCore.boot()` (searched: no other file under `src/main` names it outside tests), so one check closes every door, found or not. The flag is one way and set synchronously in `before-quit`'s first pass (`lifecycle.ts:27-30`, `index.ts:834`), and only `index.ts` sets it, so a harness that boots, shuts down and boots again never sees it (the shutdown-refusal harness asserts its second boot, `src/main/harness/shutdown-refusal.ts:215-235`). Reading the core's own lifecycle instead would fail twice: a quit before startup asked never enters `shutdownGmuxCore()`'s body (`:4604`), and the harness needs `empty` after a shutdown (`:217-221`). The import adds no cycle (`assert-no-runtime-cycles` read 0 strongly connected components at the prototype) and no export moves (`quit-admission.test.ts` pins `lifecycle.ts`'s surface) |
| D2 | **The running core is still handed back while the quit runs.** Only the boot branch refuses; a core that is `ready` or `booting` when the quit begins is returned, joined and then disposed by the one `shutdownGmuxCore()` | Entry item 1 ("disposer steps before `shutdownGmuxCore()` may ask for it"): the door's facts, the alerts' rows, the credentials' probe and a clone's add all ask between the press and the core's shutdown, and each must keep today's answer. A boot in flight at the press is joined, not doubled (D1 sets nothing while booting) |
| D3 | **No door stops asking; each answers the refusal through the catch it has.** The cadence handler `.catch(() => undefined)` (`index.ts:739-741`); the power handlers: a refused capture and a refused take are each one warn line and the suspend's info line (`power/index.ts:237-265`, today's lines for a refused core), a refused resume nothing (`index.ts:795-797`); Live Diagnostics: the session read answers `[]` (`report.ts:269-271`) and a stopped subscription sends nothing (`live.ts:111`); startup: D4's line, the two other asks `.catch(() => undefined)`; the door's open: its catch (`src/main/pocket/ipc.ts:1460-1470`); the alerts: their step's catch (`src/main/alerts/index.ts:232-240`); the tray: its catch (`tray/index.ts:220-223`). **Weighed and refused:** (a) calling the power handlers' disposer on the disposer's first lines would drop a sleep capture that today runs through the running core during the disposer's early joins (up to about 5 s for the phone alerts', `capabilities.ts:880-888`), a regression for a lid closed right after ⌘Q, to save three log lines after the slot empties; (b) stopping Live Diagnostics above the core's shutdown would move a step of the disposer (S6 reads its first lines; the entry refuses a change to the quit's order) to change nothing a person sees, since every tick during the shutdown already reads the same refusal today and a tick after the stop sends nothing; (c) removing the focus and blur listeners at the quit would add two kept references and two removals to `before-quit` for no change a person sees | Entry item 2 ("each weighed against today's quit"). Measured at the prototype (§2.3): every door answered quietly, no `crash` record in any app.log, and P1's three power lines carry the refusal |
| D4 | **A startup the quit refused says so.** `index.ts`'s startup catch (`:621-632`) gains, after the schema refusal's branch and before the error line: `if (isGmuxError(err, 'SHUTTING_DOWN')) { bootLog.info('the session core was not started, because Tortie is quitting'); return; }`, with `isGmuxError` imported from `./errors` (`src/main/errors.ts:163-167`). Every other error still logs `core boot failed: …` | Entry item 3. At the prototype S1 wrote exactly that line once and no `core boot failed` (§2.3) |
| D5 | **The refusal is the one Phase 116 already gives** (`code` `SHUTTING_DOWN`, the sentence `Tortie is quitting, so this action was not started.`, detail `getGmuxCore`) | To a person the two are one event (`lifecycle.ts:35-41` says so of its own copy), every caller's catch already reads that code, and no new sentence is drawn anywhere |
| D6 | **The pin.** vitest `src/main/sessions/__tests__/p359-no-boot-at-quit.test.ts` drives the shipping `getGmuxCore()`/`shutdownGmuxCore()` over the real `lifecycle.ts`, fresh per case, with `GmuxCore.boot` spied (§4.1 lists the cases, the power door among them) and an ablated copy of `core.ts` imported from scratch that reads red; `conformance:stoppedlist` S16 reads the check's shape and the startup line's (§7.1), each with in-memory ablations | Entry item 4. Phase 362's D6 is the precedent: a behavioural test with a copy ablation, and a structural rule with in-memory ablations |
| D7 | **probe:p357 grades the boot by time.** Its reader keeps the login-session lines per pid (printed, its comment corrected to two per boot and one per reconnect) and gains one graded clause on every HEAD quit arm: no login-session line of the quitting pid at or after the press (printed at the parent) | Entry item 4 ("357's probe also grades its boot count per pid instead of printing it"), with §0.1 item 8's correction: a count of lines would fail every launch |
| D8 | **probe:p359 (new) drives the doors; it does not extend probe:p357** | probe:p357 is 2,284 lines about the damaged list and the phone; the doors need a witness preload, a stand-in top, a pool hold and a powerMonitor emit that none of its arms use. probe:p362 is the quit's own probe and stays as it is |
| D9 | **No new words a person reads.** One app.log line (D4) and one CHANGELOG item (§5) | Just enough words |

## 2. What the spec step measured, how, and the numbers

Every Electron ran through `build/electron-run.mjs` inside `build/harness-socket.mjs --fresh gmux-p359s` from the parent
clone (or the prototype), by `zsh -f lockrun.sh <batch> <arms>`: a lock slot taken (electron.lock2 each time) and released
by a trap, `HOME`/`ZDOTDIR` in scratch, `HISTFILE=/dev/null`, `SHELL=/bin/sh`, `TERM_SESSION_ID` and `TERM_PROGRAM`
unset, `TMPDIR` in scratch. His history read `743319 1794200266` and `23166 1790702242` before and after every batch;
his reports folder held 34 names before and after every batch, no arm adding one.

**The world** (one arm = one profile, one Electron at a time): three shells created through the window
(`sessions.create`, agent `shell`), the Tailscale and DNS stand-ins as probe:p362 uses them, every probed registry row
hidden and `agents:list` read back (nothing resolved in any arm). **The witness**, a scratch preload loaded with
`NODE_OPTIONS=--require` into main: it records every `before-quit` pass, `will-quit`, `quit`, the process's `exit`,
every window's creation and close, the core's dispose (`http.Server#closeIdleConnections`, the hook server's stop); it
wraps `fs.writeFileSync` (from `setImmediate`, after Electron's own init) to record every tmux `login session` line
with its SYNCHRONOUS stack, which names the caller of `getGmuxCore()` because the line is written inside
`GmuxCore.boot()`'s synchronous prefix (`src/main/tmux/supervisor.ts:490-503`); it wraps `better-sqlite3` through
`Module._load` to record every open of the profile's `manifest.db`; and it wraps `child_process.spawn` to record every
tmux spawn. The quit is the bridge's (`window.gmux.quit()`). Times are milliseconds after `before-quit`'s first pass.
Doors: B1 emits `app.emit('browser-window-blur', …)` at the main window's `close`; L1 starts Live Diagnostics
(`diagnostics.liveStart(true)`) with the streaming top spawned as `/bin/sleep 90` (a sample that never comes; every
such pid ended by the driver after its command line was read); P1 emits `powerMonitor.emit('suspend')` at the window's
`close` and `resume` 40 ms later; S1 calls `app.quit()` from a `whenReady` callback the preload registers after the
app's own; H1 opens four FIFOs nobody writes on the uv pool's four threads at the core's dispose, so the watcher
unsubscribes that follow queue behind them (Phase 36's backed-up pool), emits the blur at the late drain's first
`hide()`, and writes the FIFOs 3 s later; D2 and D2n damage the one sessions leaf after a checkpoint and a second
connection's write, 357's way, and relaunch the profile to read the DOM's toasts.

### 2.1 The parent (`7bd05d4e`)

| Arm (batch, load) | Door | Dispose | Door fired | Boot started after the quit began (its caller, from the stack) | Session list opens after the quit generation's | Control client | `will-quit` | Ring after the quit | Ended |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C0 (b1, 2.4) | none | 100 | — | **none** | none (the quit generation's own read at 75) | — | 207 | launch, quit | will-quit SIGKILL, storage 157 ms |
| C0 (b4, 2.8) | none | 96 | — | **none** | none | — | 203 | launch, quit | the same, 151 ms |
| B1 (b1, 2.4) | blur at close | 107 | 109 | **213: `syncPollCadence ← Timeout._onTimeout`** | 4 read-only 233-234, the store at 235, one more read-only at 275 | 250 | 215 | launch, quit, **launch 196 ms after the quit's** (sessions `8cf15b48…` against the quit's `78e12bf8…`) | will-quit SIGKILL |
| B1 (b3, 13.1) | blur at close | 91 | 93 | **195: the same** | 231-232 (store 232), 311 | 263 | 198 | launch, quit, **launch 250 ms after the quit's** (`fd250a76…` / `7fa44cd5…`) | will-quit SIGKILL |
| L1 (b2, 2.6) | Live on, top late | 105 | the stop | **107: `readSessionFacts ← finishCapture ← async runTick`** | 225-226 (store 226), 263 | 240 | 213 | launch, quit, **launch 187 ms after the quit's** (`0cf7dc90…` / `d9a5c7d6…`) | will-quit SIGKILL |
| L0 (b3, 13.7) | Live on, real top | 99 | — | none (no tick in flight at the stop) | none | — | 206 | launch, quit | will-quit SIGKILL |
| P1 (b4, 2.9) | suspend at close | 90 | 93 (the window's close at 92) | **93: `captureAll ← suspendWork ← onSuspend`** | 222-223 (store 223), 256 | 235 | 198 | launch, quit, **launch 189 ms after the quit's** (`9cfc2278…` / `52e6b89b…`) | will-quit SIGKILL |
| H1 (b3, 6.3) | blur at the late drain's hide | 112 (pool held) | 3,117 | **3,126: `syncPollCadence ← Timeout._onTimeout`** | 3,168-3,170 (store 3,170), 6,127 | 3,207 | 6,123 (after `quit.late_settled`) | launch, quit, **launch 6,062 ms after the quit's** (`e29ab5ac…` / `64c8f622…`) | will-quit SIGKILL |
| S1 (b2, 3.0) | quit at ready | — (nothing to shut) | — | **20: startup, `index.js:118683` = `index.ts:621`** | none (the process ended first) | — | 10 | none taken | **exit 0, Node's teardown**; a window created at 59 ms and closed at 106 ms |
| D2 (b2, 3.0) | blur at close, file damaged | 1 | 5 | **106: `syncPollCadence`** | 124-140 (store 140), 182 | 154 | 108 | launch, **launch** (the dying core's, after it put the first back) | will-quit SIGKILL; **`manifest.db.damaged-…` left by the quitting pid, its `manifest-quarantined` notice at 139 ms** |
| D2n (b2, 3.0) | none, file damaged | 2 | — | none | none | — | 113 | launch only (no quit generation of the damaged file) | will-quit SIGKILL; nothing quarantined |

The relaunches (each on its arm's profile, the scratch server kept alive): **D2's showed no toast** (the DOM's `.toast`
list empty) and its app.log held no notice; **D2n's showed "Session list damaged. It was rebuilt." with "Show the
file"**, and its own pid logged `notice.shown manifest-quarantined`. Both listed 0 rows (the launch generation predates
the three shells). The list read after the damage answered three rows in both runs, 357's last clean list, and the
`manifest-stopped` notice was said about 1.1 s before each quit.

**Boots per pid at the parent** (a boot start is a witness line whose stack holds `getGmuxCore`; app.log holds two
login-session lines per boot): C0, L0, D2n: 1, none during the quit. B1 (×2), L1, P1, H1, D2: **2, the second started
by the door during the quit**. S1: **1, and it is the door's**, started 20 ms after the quit began.

**Door 2 in vitest at the parent** (`parent/src/main/power/__tests__/p359spec-power.test.ts`, exit 0): `afterSuspend 2,
afterResume 2`, the order `boot 1, core1:begin-shutdown, core1:snapshot:app-quit, core1:dispose, — the slot is empty —,
boot 2, core2:snapshot:system-sleep, core2:suspend-generation, core2:refresh`, and the lifecycle read `ready` after: a
core in the slot that no `shutdownGmuxCore()` will dispose.

### 2.2 What it costs a person today (for §5 and §14)

On his Mac Tortie's window is in front when he presses ⌘Q, and it closes at the quit's end, so door 1 fires on the
everyday quit (B1). At the parent each such quit starts a second session engine in the last fraction of a second of
the quit: it rewrites the session list after the quit's own backup and spends one of the five backups on a copy of
that, so the backups reach back one quit less far. When the session list is damaged at that moment, the dying engine
puts back a backup and nobody is told; the next launch opens the rebuilt list as if nothing happened (D2). Sleeping
the Mac or Live Diagnostics during a quit, a quit that waits on a stuck file watch, and a quit right after launch do
the same.

### 2.3 The prototype (the design's two hunks on the parent, never committed)

`proto/` is the parent with D1 and D4 applied exactly as §4.1 states them (`git diff`: `src/main/sessions/core.ts` +4,
`src/main/index.ts` +5). Built (49.9 s, exit 0, the inventory byte for byte) and run over every arm (batch h1, load 4.7
to 6.2, 65 s):

| Arm | Boot started during the quit | Session list opens during the quit | Ring after the quit | Other |
| --- | --- | --- | --- | --- |
| C0, B1, L1, P1 | none | the quit generation's read only | launch, quit | P1's app.log: the suspend's two warn lines carrying the refusal and its info line |
| H1 | none | the same | launch, quit | the late drain held, settled and ended by the will-quit SIGKILL (`quit.late_settled`, storage 153 ms) |
| S1 | none | none | none | app.log: `the session core was not started, because Tortie is quitting`, once; no `core boot failed`; the window still created at about 59 ms and closed |
| D2 | none | none | launch | nothing quarantined at the quit; **the relaunch showed "Session list damaged. It was rebuilt." with "Show the file"**, its own pid's notice, exactly as D2n |
| D2n | none | none | launch | the same toast |

Every launch at the prototype but S1's logged two login-session lines (its own boot; S1's none), and none wrote a
`crash` record (nor did any at the parent). `npm run typecheck` exit 0 (19 s; `assert-no-runtime-cycles`: 1,437 files, 0 strongly connected components); vitest over
`core-singleton`, `quit-admission`, `p362-quit-fallback`, `p3571-quit-hardexit`, `quit-dispose-order` and `power`:
80 of 80; `conformance:stoppedlist` (15 rules, 178 ablations), `conformance:endtree` (16 rules, 84 self-tests),
`conformance:farattach` (11 rules), `conformance:remoteclose` and `conformance:samefolder` (9 of 9 ablations): each
exit 0 over the prototype.

### 2.4 The spec step's commands, exit codes and numbers

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `git clone --shared --no-checkout` the worktree, `checkout --detach 7bd05d4e`, `cp -Rc node_modules build/vendor` (history block) | 0 | < 1 min | specstory 2.10.0; `addon-webgl.mjs` sha256 `e4ab05d2ee9d7a27…` |
| `npm run build` in the parent (history block) | 0 | 52.4 s | `gate:electron` 186 of 585 against a floor of 186; `contract-inventory` OK |
| `lockrun.sh b1 C0,B1` | 0 | 12 s | §2.1 |
| `lockrun.sh b2 L1,S1,D2,D2n` | 0 | 39 s | §2.1 |
| `lockrun.sh b3 H1,L0,B1` | 0 | 29 s | §2.1 (H1's late drain and release seen in app.log) |
| vitest `p359spec-power.test.ts` in the parent (history block) | 0 | about 5 s | §2.1 |
| `lockrun.sh b4 P1,C0` | 0 | 10 s | §2.1 |
| `cp -Rc parent proto`, the two hunks, `npm run build` (history block) | 0 | 49.9 s | the check in the bundle (`appLifecycleState() === "quitting"` 6 times in `out/main/index.js` against the parent's 5); inventory OK |
| `P359S_CHECKOUT=proto lockrun.sh h1 C0,B1,L1,S1,P1,H1,D2,D2n` | 0 | 65 s | §2.3 |
| `npm run typecheck` in proto; six neighbour vitest files; five `conformance:*` (history block) | 0 each | 19 s; about 15 s; 0 to 4 s each | §2.3 |
| the final Electron count (CLAUDE.md's command, outside the block, once) | 0 | | none of this step's: his Tortie (692) and its crash handler (2727), Slack's, Chrome's, Granola's and Cursor's crash handlers, and Phase 325.1's run (lock slot 1, `wt-p3251`); no `p359` socket under `/private/tmp/tmux-501/`; no `sleep 90` left; lock slots 2 and 3 free |

Each batch printed `[electron-run] <arm>-app: ended 1 process the teardown found still running.` after every hard exit,
the helper's own teardown ending a child the SIGKILLed main left behind, as for 357.1's and 362's runs. Scratch at the
end: 2.7 GB (`du`), most blocks cloned and shared.

## 3. The tree at this head: the paths each item touches

**Items 1 and 2 (the check, the doors).** `src/main/sessions/core.ts`: the import block (from `:19`; `../lifecycle` is new
there), `getGmuxCore()` `:4570-4588` and its comment `:4552-4569`, and the Phase 77/116 comment in `shutdownGmuxCore()`'s
`finally` (`:4646-4658`, "a later boot in the same process … starts from `empty`"), which gains the quitting exception.
Read and unchanged: `src/main/lifecycle.ts`, `src/main/power/index.ts`, `src/main/diagnostics/{live,report,ipc,
top-stream}.ts`, `src/main/capabilities.ts`, `src/main/tray/index.ts`, `src/main/pocket/ipc.ts`,
`src/main/alerts/index.ts`, `src/main/projects/{index,clone}.ts`, `src/main/fs/project-roots.ts`. (The fix round
changed `src/main/projects/{index,clone,create}.ts`: §As built, "### The fix round".)

**Item 3 (the startup line).** `src/main/index.ts` `:621-632` and its import block (`:98-101`).

**Item 4 (the pins).** `build/conformance-stopped-list.mjs` (`RULES` `:346`, `FILES` `:314-344`, `RULE_FNS` `:3053`,
`ABLATIONS` `:3198`, its header); `build/p357/probe-p357.mjs` (`readAppLog` `:369-420`, the printed counts `:1668`,
`:1780`, `:1834`, the quit times `:1601-1604`, `:1745`, `:2043-2049`) and `build/p357/fixtures/graders.json`.

**The probe.** `build/p359/` (new), `package.json`'s scripts.

**Words that name the owed entry today and become untrue when it lands**: `build/p357/probe-p357.mjs:379-382`
("PRINTED, not graded: it is older than this phase (§12, §13 owe it an entry)"). Its owner is the `probe` builder.

## 4. The design, item by item (real paths; the builder named on each)

### 4.1 The check, the startup line and the pin (builder `core`)

`src/main/sessions/core.ts`: below `import { join, resolve as resolvePath } from 'node:path';` add
`import { appLifecycleState } from '../lifecycle';`. In `getGmuxCore()`, the boot branch becomes:

```ts
  if (corePromise === null) {
    if (appLifecycleState() === 'quitting') {
      return Promise.reject(shutdownRefusal('getGmuxCore'));
    }
    lifecycle = 'booting';
    corePromise = GmuxCore.boot();
```

The function's comment gains one paragraph (Phase 359): once the quit has begun nothing boots a core; a core already in
the slot is still handed back because the disposer's steps before `shutdownGmuxCore()` ask for it; the check reads the
app's one-way quit flag rather than this module's lifecycle, because a quit before startup asked never enters the
shutdown and because a harness that boots twice in one process never marks the app quitting; it cites
`build/p359/SPEC.md` §0.1 for what a second core did inside a quit. The `finally`'s "a later boot in the same process
… starts from `empty`" gains "unless the app is quitting (Phase 359)". Nothing else in the file moves.

`src/main/index.ts`: `import { isGmuxError } from './errors';` beside `isSchemaRefusal`'s import, and in the startup
catch, after the `isSchemaRefusal` branch and before `bootLog.error(…)`:

```ts
    // PHASE 359. A quit pressed before startup asked for the core: getGmuxCore()
    // refuses to boot one in a quitting app, which is the quit, not a failure.
    if (isGmuxError(err, 'SHUTTING_DOWN')) {
      bootLog.info('the session core was not started, because Tortie is quitting');
      return;
    }
```

The comment above that catch (`:619-620`) is unchanged. No other line of `index.ts` moves; the `will-quit` and
`before-quit` handlers stay byte for byte.

`src/main/sessions/__tests__/p359-no-boot-at-quit.test.ts` (new). Each case `vi.resetModules()` and imports fresh
`../core` and `../../lifecycle` (the transition is one way), spies `GmuxCore.boot` with recording stand-ins (copy
`core-singleton.test.ts`'s `fakeCore` shape, do not import that file, and give it a `joinHookShutdown`: the shutdown
awaits it, and without it the shutdown's own catch is what ends every teardown), and restores in `afterEach` after an awaited
`shutdownGmuxCore()`. Unhandled rejections fail the file (vitest's default), which is how "quietly" is read.

1. **The defect closed.** Boot; `markAppQuitting()`; `await shutdownGmuxCore()`; `getGmuxCore()` rejects with a
   `GmuxError` whose payload is `SHUTTING_DOWN`, the one sentence and detail `getGmuxCore`; `coreLifecycleState()` reads
   `empty`; a second call refuses the same way; `GmuxCore.boot` was called ONCE.
2. **The running core is handed back.** Boot; `markAppQuitting()`; `getGmuxCore()` resolves the same instance; boot once.
3. **A boot in flight at the press is joined.** `getGmuxCore()` with the boot held; `markAppQuitting()`; a second
   `getGmuxCore()` returns the same promise; resolve it; `shutdownGmuxCore()` disposes it (its order is the whole
   Phase 116 sentence); a call after refuses; boot once.
4. **A quit before startup asked.** `markAppQuitting()`; `await shutdownGmuxCore()` (returns at once); `getGmuxCore()`
   refuses; boot ZERO times.
5. **A boot that failed is not retried in a quit.** The boot rejects (`tmux is missing`); `markAppQuitting()`;
   `getGmuxCore()` refuses; boot once.
6. **The harness cycle.** No `markAppQuitting()`: boot, shutdown, boot, shutdown; boot twice, each teardown the whole
   sentence (the Phase 116 cycle, asked again here so this file fails if D1 reads the wrong flag).
7. **The power door, over the drivable monitor.** `installPowerHandlers` (shipping) with `drivableMonitor()` and the
   three deps as `src/main/index.ts:770-799` writes them (copied as text, `broadcastEvent` left out; the comment names
   the lines): (a) after `markAppQuitting()` and the shutdown, `fire('suspend')` then `fire('resume')`: boot once, the
   power log's two warn lines carry `SHUTTING_DOWN` and its info line says no generation was taken; (b) the
   no-regression half: after `markAppQuitting()` and BEFORE the shutdown, `fire('suspend')` captures `system-sleep` on
   the RUNNING core and asks it for a suspend generation, boot once (today's behaviour, kept by D3).
8. **The ablation.** A copy of `src/main/sessions/core.ts` with D1's check and its import taken out (each edit must find
   its text exactly once), its relative imports made absolute and imported from a scratch folder (p362-quit-fallback.test.ts's
   `importCopy`, copied): case 1's drive over the copy boots TWICE and resolves a second core (the defect), and case 6
   over the copy still boots twice. Each copy is removed in `afterAll`.

### 4.2 The gate (builder `gate`)

`build/conformance-stopped-list.mjs` gains S16 (§7.1): `RULES` and `RULE_FNS` gain it, `FILES` keeps `core` and `index`
(already listed), the header documents it beside S14 and S15, and its ablations are added to `ABLATIONS`. The existing
178 stay red on exactly their own rules; the control stays green on all sixteen.

### 4.3 The probes (builder `probe`)

`build/p359/probe-p359.mjs`, `build/p359/fixtures/**` and `build/p359/CHECKLIST.md`, §8. And D7 in
`build/p357/probe-p357.mjs`: `readAppLog` keeps `bootPids` (login-session lines per pid, either spelling: `macOS login
session` and `no macOS login session number`), its comment saying two lines per boot and one per reconnect, and gains
`bootLines: [{ pid, at }]` (each line's `ts` as milliseconds); a pure `bootsAfter(al, pid, fromMs)` counts that pid's
lines at or after `fromMs`; every HEAD arm that quits (HA, HB, HC, CS-head) gains the clause "no session core began to
boot after the quit was pressed" over its quit's press time (`quitAt`, `:1601`, `:1745`, `:2043`) and the quitting
pid, and the parent arms print the same number. Its fixtures gain one honest and one broken reading for the clause and
a raw app.log whose third login-session line comes after the press. The builder does not run the app (the verifiers
do); it runs both probes' `--grader-self-test` and `--preflight`.

## 5. Words

No new string a person reads. One app.log line (D4). One CHANGELOG item under `## Unreleased`, `### Fixed`, below 362's,
in his style, the commit link added by the follow-up docs commit:

`- If Tortie's session list is damaged when you quit, the next launch now says it was rebuilt from a backup, instead of Tortie rebuilding it silently on its way out`

(§14 Q2 offers leaving it out.)

## 6. What moves on purpose

Nothing in the contract: `docs/audits/contract-baseline.txt` must read byte for byte, and a diff is a finding.
`HELPER_USER_FLOOR` in `build/assert-electron-teardown.mjs` rises from 186 to 187 for `build/p359/probe-p359.mjs`.
`conformance:stoppedlist` moves from 15 rules and 178 ablations to 16 rules and the added ablations of §7.1 (the
builder reports the count). `probe:p357` gains one graded clause per HEAD quit arm and keeps every other reading.

## 7. The gates

### 7.1 `conformance:stoppedlist` S16 (`build/conformance-stopped-list.mjs`, builder `gate`), new

Pure node over the TypeScript parser, as the other fifteen.

| Clause | Holds | Its ablations (each red on S16 alone) |
| --- | --- | --- |
| (a) the one boot | `GmuxCore.boot(` is called exactly once in `src/main/sessions/core.ts`, as the right side of `corePromise = GmuxCore.boot()` inside `getGmuxCore`'s `if (corePromise === null)` block, and no other non-test file under `src/main` names `GmuxCore.boot` or reaches `boot` on `GmuxCore` by key | a second `corePromise = GmuxCore.boot()` in the rejection handler (a retry); `void GmuxCore.boot()` planted in `src/main/capabilities.ts` |
| (b) the check | that block's FIRST statement is an `if` with no `else` whose test is exactly `appLifecycleState() === 'quitting'` (one call, no argument, no `!`, `\|\|` or `&&`) and whose consequent is exactly one `return Promise.reject(shutdownRefusal(<string literal>))` (bare or alone in a block) | the check removed; `!==`; `\|\| corePromise !== null` added; the check moved after `lifecycle = 'booting'`; the check moved after `GmuxCore.boot()`; the consequent `return corePromise` or a resolve; the test reading `coreLifecycleState()` or `lifecycle` |
| (c) the flag | `appLifecycleState` is imported by name from `'../lifecycle'`, nothing in `core.ts` declares, assigns or binds that name, and `getGmuxCore` names it in that one test only | a local `const appLifecycleState = () => 'running'`; the import from `'./lifecycle-stand-in'` |
| (d) the running core | `getGmuxCore`'s first statement is still the Phase 116 `if (lifecycle === 'shuttingDown')` refusal, and no statement before the boot branch reads the quit flag | the quit check moved to the function's first line (refusing the running core during the quit) |
| (e) the startup line | in `src/main/index.ts`, the catch handed to the first `getGmuxCore()` call inside `app.whenReady().then(…)` holds an `if (isGmuxError(<its parameter>, 'SHUTTING_DOWN'))` after the `isSchemaRefusal` branch and before the `core boot failed` line, whose block is a `bootLog.info(…)` naming `quitting` and a `return`; `isGmuxError` is imported from `'./errors'` | the branch removed; `bootLog.error(` in it; the branch after the error line; no `return` in it |

CLAUDE.md's `conformance:stoppedlist` row gains the clause and the paths (the integrator's).

### 7.2 The path-triggered gates the changed files trigger (CLAUDE.md, read at this head)

| Changed | Gate |
| --- | --- |
| `src/main/sessions/core.ts` (`getGmuxCore`, the import block) | `conformance:stoppedlist` (S10 reads the core's list and catches; S16); and, because each reads `core.ts` by its functions and an import line could shift them, `conformance:endtree`, `conformance:farattach`, `conformance:remoteclose`, `conformance:samefolder` (all green over the prototype, §2.3). No row names `getGmuxCore` |
| `src/main/index.ts` (the startup catch, an import) | `conformance:stoppedlist` (S12, S14, S16 read `index.ts`) |
| `src/main/capabilities.ts` | **not touched** (D3), so `conformance:credentials`, `conformance:pocket`, `conformance:pocket:hostile` and `conformance:push` are not triggered; the integrator confirms with `git diff --stat 7bd05d4e -- src/main/capabilities.ts` (empty) and runs them if it is not |
| `src/shared/**`, a `GMUX_*` name, a smoke mode | **not touched**; `gate:contract` must still match |
| `build/p359/probe-p359.mjs`, `build/p357/probe-p357.mjs` | `gate:electron` (the floor), `gate:background`, `gate:checks` (the new script's classification), all inside `npm run build` |

## 8. The app run: `probe:p359` (builder `probe`)

`package.json`: `"probe:p359": "node build/harness-socket.mjs --fresh gmux-p359 'node build/p359/probe-p359.mjs'"`.
ONE Electron at a time, the PARENT first in every pair (`P359_PARENT_CHECKOUT`, a built `7bd05d4e`, or exit 2), each
arm on its own scratch profile, HOME and ZDOTDIR with `HISTFILE=/dev/null` and `SHELL=/bin/sh`, the socket the harness
hands it, the Tailscale and DNS stand-ins as `probe:p362` uses them, every probed registry row hidden and `agents:list`
read back. Port the spec step's driver (`/private/var/tmp/tortie-wt/scratch/p359/spec/parent/build/p359spec/measure.mjs`;
read it, do not import it): its witness preload, its arms, its readers. Three verdicts as `probe:p357` and
`probe:p362`: each arm names `reads`, `needs` and `clauses`; an absent field or an unmet need is UNREADABLE (exit 2),
only a clause is FAIL; every reading from raw text (the witness's lines, app.log, the backup index, the gmux folder's
names, the DOM's toasts, the shim's line) is derived by ONE pure function that `--grader-self-test` drives over recorded
raw fixtures (seed them from `/private/var/tmp/tortie-wt/scratch/p359/spec/fixtures-raw/`: `parent-*` and `proto-*`
hold every arm's witness events, app.log, backup index and gmux listing) as well as over recorded readings, every
clause shown red alone and every need shown unreadable alone. `--grader-self-test` and `--preflight` start nothing.

**A boot start** is a witness `ensure-server` line whose stack holds a `getGmuxCore` frame; **late** when it came after
`before-quit`'s first pass; its **caller** is the frames after `getGmuxCore`. Each is cross-read against app.log: a late
boot start has a login-session line of the same pid at or after the quit's start. **A door's NEED at HEAD** is that the
same drive at the parent started a late boot whose caller names that door, so HEAD's zero is never read off a drive
that did nothing. Lessons the driver already carries, each a reading that was wrong once elsewhere: a `--require`
preload cannot `require('electron')` on its first turn, so the app hooks and the `fs.writeFileSync` witness go in from
`setImmediate` (the `spawn` wrap and the `Module._load` wrap go in at once, before the bundle binds them); a harness
window is never focused, so a blur is the app's own event, emitted, never a `focus()`; `/bin/sleep 90` stand-ins and
the FIFOs are the probe's to end and remove in its `finally`; his reports folder is read through `userInfo().homedir`.

| Arm | Builds | What it drives | PASS at the parent (printed unless named) | PASS at HEAD |
| --- | --- | --- | --- | --- |
| C0 | both | three shells, the bridge quit | no late boot; the ring launch and quit | no late boot; the ring launch and quit; the will-quit SIGKILL with its storage line |
| B1 | both | C0 plus the app's `browser-window-blur` at the main window's `close` | a late boot whose caller names `syncPollCadence`; a `launch` generation after the quit's, its `sessions` digest unlike the quit's | the blur emitted (need); no late boot; no session list open after the quit generation's; no tmux spawn during the quit; the ring launch and quit |
| L1 | both | Live Diagnostics on (`diagnostics.liveStart(true)`), its top answered by `/bin/sleep 90`, 5.5 s, then the quit | a late boot whose caller names `readSessionFacts` | the stand-in top spawned (need); no late boot |
| P1 | both | `powerMonitor.emit('suspend')` at the window's `close`, `resume` 40 ms later | a late boot whose caller names `captureAll` or `suspendWork` | both emitted (need); no late boot; app.log's suspend lines carry `SHUTTING_DOWN` |
| S1 | both | `app.quit()` from a `whenReady` callback registered after the app's own | a boot started after the quit began, its caller the startup | no boot at all; app.log holds `the session core was not started, because Tortie is quitting` once and no `core boot failed`; the window created during the quit printed at both builds (§14 Q1) |
| H1 | both | four FIFOs held on the uv pool from the core's dispose, the blur at the late drain's first `hide()`, the FIFOs written 3 s later (and at 12 s regardless) | `quit.late_drain`; a late boot at the hide | the pool held and released (need: `quit.late_drain` and `quit.late_settled` in app.log); no late boot; the quit ended by the will-quit SIGKILL |
| D2 | both | three shells, the one sessions leaf damaged, `sessions.list()` read, then B1's quit; a relaunch of the profile reads the DOM's toasts after 4 s | the quitting pid's `notice.shown manifest-quarantined`, a `manifest.db.damaged-*` after the quit; the relaunch's DOM holds no "Session list damaged." toast | the damage changed a byte and the list stopped (needs); no late boot; no `manifest.db.damaged-*` after the quit; the relaunch's DOM holds "Session list damaged. It was rebuilt." with a "Show the file" button, and its own pid logged the notice |
| D2n | both | D2 with no door | the relaunch shows the toast | the same (the control) |
| HC | both | `GMUX_SMOKE=shutdown-refusal` through `withElectron` (a harness launch, no window) | its `7/8 clean re-boot` and `8/8 PASS` lines, exit 0 | the same: a harness still boots its REAL second core in one process |
| NR | both | his recorded shape plus 16 live shells of 4,000 coloured lines each, the first-quit flag written beforehand (his everyday quit), the native Quit row clicked in main | printed: press to window closed, the pass line, the quit generation, the end | the pass wrote 16, a quit generation, the will-quit SIGKILL, the relaunch keeps every row and id and every shell live; the window closed within max(150 ms, 10 %) of the parent's, the load at the press printed beside each |
| RUN | — | the preflights, the hidden agents, the census, every pid ended (stand-in tops, the app's tree), every FIFO removed, the scratch server gone and the `.run` marker not counted, his history unmoved, no macOS report since the run began, no Electron of the run's left | | |

Defaults: `P359_ARMS=C0,B1,L1,P1,S1,H1,D2,D2n,HC,NR`; `P359_KEEP=1` keeps every run folder; `P359_OUT_DIR` (default
`out/p359`). Wall time: the spec step's arms took 4 to 15 s each at a load of 2 to 14, so about 4 to 6 minutes for the
default set at both builds, NR and HC not yet measured.

`build/p359/CHECKLIST.md`: two plain lines for the operator's seat: quit with Tortie's window in front, reopen it, and
your sessions are as you left them; if your session list was damaged when you quit, the reopened Tortie says it was
rebuilt.

## 9. Builders, disjoint files

### 9.1 The table (every file in exactly one list; a builder that must edit a file not in its list stops and names it)

| Builder | Files it owns (and their tests) |
| --- | --- |
| `core` | `src/main/sessions/core.ts`, `src/main/index.ts`; test `src/main/sessions/__tests__/p359-no-boot-at-quit.test.ts` (new) |
| `gate` | `build/conformance-stopped-list.mjs` (its own run is its test) |
| `probe` | `build/p359/probe-p359.mjs`, `build/p359/fixtures/**`, `build/p359/CHECKLIST.md` (new); `build/p357/probe-p357.mjs` (D7 and the comment at `:379-382`), `build/p357/fixtures/graders.json` |
| integrator | `CLAUDE.md` (the `conformance:stoppedlist` row `:324`, the `probe:p357` row `:398`, a new `probe:p359` row), `CHANGELOG.md`, `package.json` (`probe:p359`), `build/verification-checks.mjs` (classify `probe:p359` beside `probe:p362`), `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 186 → 187), `docs/audits/contract-baseline.txt` (only if a contract line moves, which none should), this file's §As built, and any file two builders both need |

### 9.2 The seams, stated exactly so the three build at once

- `core` changes no export. `getGmuxCore()` keeps its signature; its new refusal is `shutdownRefusal('getGmuxCore')`.
  The startup line's words are exactly `the session core was not started, because Tortie is quitting` (scope `boot`,
  level info).
- `gate` reads the names `getGmuxCore`, `GmuxCore`, `boot`, `corePromise`, `lifecycle`, `appLifecycleState`,
  `shutdownRefusal`, `'../lifecycle'`, `isGmuxError`, `'SHUTTING_DOWN'`, `bootLog`, `isSchemaRefusal`, `'./errors'`. It
  builds against §4.1 as written; where `core`'s shape differs, the integrator reconciles.
- `probe` reads the shipped behaviour and the startup line's words only.
- `src/shared/*` is untouched.

### 9.3 The builders' briefs

- **`core`**: §4.1. Run the new file, `core-singleton.test.ts`, `quit-admission.test.ts`, `p362-quit-fallback.test.ts`,
  `p3571-quit-hardexit.test.ts`, `quit-dispose-order.test.ts` and `power.test.ts` by name, then the whole suite.
- **`gate`**: §7.1. Run the gate and report the rule and ablation counts; each new ablation red on S16 alone, the
  existing ones unmoved.
- **`probe`**: §4.3 and §8. The witness and every stand-in are scratch files the probe writes, never files under
  `src/`. Run both probes' `--grader-self-test` and `--preflight` under a lock slot and return their numbers.

Every builder runs `npm run typecheck` and `npm test` (under the history block; the four `/bin/ps` tests named as they
fail) before it returns, and returns every file it changed with its line counts.

## 10. The proof, run rather than read (Tier 3)

### 10.1 Lens A: the behaviour (Method 1 parent, real data)

The gates once (§11). Then `probe:p359` whole, parent first, under a lock slot, `P359_KEEP=1`. Re-derive, by the
verifier's own code over the kept run folders: the boot starts per pid and their callers from the witness lines, the
login-session lines per pid and their times from app.log, the session list opens during the quit, the ring's
generations (reason, `capturedAt`, the `sessions` digest beside the quit generation's), the `manifest.db.damaged-*`
names, the relaunch's toasts, at both builds. **The independent step**, at a shape the spec step did not use: (a) D2
over his recorded shape with EVERY sessions leaf damaged, at both builds, the notice read in the DOM; and (b) H1 with a
confirmed loopback machine (`build/scratch-machine.mjs`, its quiet shell and a scratch far home, as `probe:p340` builds
it) in the profile, reading after the quit whether that machine's rows were written `unknown` by the quitting process at
the parent (§0.1 item 6's unmeasured candidate) and not at HEAD.

### 10.2 Lens B: the attack (Method 2)

Find, by a method of your own (for example a scratch build of HEAD and of the parent with a harness-only stack line at
`GmuxCore.boot`, or a witness of your own on another write), every caller of `getGmuxCore()` that can run after
`markAppQuitting()`, and drive each one you find at HEAD, the §0.1 item 7 handlers among them (a `projects:create` whose
git init is held, a clone that exits as the quit begins). Then try to make HEAD boot during a quit or refuse wrongly: a
quit pressed while startup's boot is in flight (the core must be joined and disposed, once); a boot that fails during a
quit (no retry); the door switched on and confirmed in the scratch profile with the quit pressed before the first
window (its `beforeOpen` must answer the refusal quietly); a sleep in the first second of a quit, before the core's
shutdown (the running core must capture, as today); blur, sleep and a Live tick together in the late drain. Then try to
break the harness cycles: HC at HEAD, `smoke:fault` (the fault battery) and `smoke:t1`. **The independent step**: a
hostile copy of the gate's inputs, at least six shapes of your own through `--root` (a check in a helper the boot
branch calls, a check on a different quit reader, a second boot path through a renamed alias, a check that refuses the
running core, a startup catch that logs the quit line at error, a boot moved into a module `core.ts` imports), each red.

### 10.3 What is driven in vitest only, and why

A real sleep (a launch cannot sleep his Mac): §4.1 case 7, and P1 drives the shipping deps with an emitted event. The
update-staged quit (`initUpdater()` returns in an unpackaged build, `src/main/updates/updater.ts:415`):
`p3571-quit-hardexit.test.ts`'s staged case stays green; D1 does not touch that path.

### 10.4 No regression (both builds)

| Row | What | Parent (7bd05d4e) | HEAD must read |
| --- | --- | --- | --- |
| R1 | his everyday quit (NR) | the pass, the quit generation, the will-quit SIGKILL | the same, the window closed within max(150 ms, 10 %) |
| R2 | the bridge quit (C0) | the will-quit SIGKILL, storage about 150 ms | the same, within 100 ms |
| R3 | a door during the quit (B1, L1, P1, H1) | a second core, a spent backup, rows written after the quit generation | none of the three; the quit ends the same way |
| R4 | a damaged list at the quit (D2) | rebuilt in the quitting process, not said | rebuilt at the relaunch and said |
| R5 | a startup a quit overtook (S1) | a core booted and a window opened into the quit | no core; the window as at the parent (Q1) |
| R6 | the harness cycles (HC, `smoke:fault`, `smoke:t1`) | a real second boot; the battery passes | the same |
| R7 | `smoke:quit`, `smoke:quitdoors` | pass | pass, their verdicts unchanged |
| R8 | a sleep before the core's shutdown (§4.1 case 7b) | captured on the running core | the same |
| R9 | quit-and-install | vitest's staged case | the same |
| R10 | a project made or cloned around the quit (the attack lens's XP; added by the fix round) | the add lands after the core's shutdown and a second core writes its row, or, when it lands after the process has ended, no row | the add lands on the running core before its shutdown in every drive, with no second core and no wait beyond the add itself |
| R11 | a clone that failed for sign-in, the quit pressed while its `gh auth status` runs (the reverify's V6; added by his ruled round) | the quit does not wait for `gh` | the same |

A row worse than the parent is a defect: fixed, or the part dropped and named.

### 10.5 At the end, once

The Electron count with CLAUDE.md's command, outside the history block; every `gmux-p359` socket under
`/private/tmp/tmux-501/` gone or with no server answering; no `sleep 90` and no FIFO left; the history stats; the macOS
report count by name and time.

## 11. The integrator's commands (in order; each with its exit code and PASS line in the report)

1. `npm run typecheck`
2. `node build/contract-inventory.mjs --check` (must match byte for byte; a diff is a finding)
3. `npm test` (under the history block; the four `/bin/ps` tests named as the expected failures)
4. `npm run build` (`gate:electron` reads 187 against a floor of 187; `gate:background`; `gate:checks` with
   `probe:p359` classified)
5. `npm run conformance:stoppedlist` (16 rules, every ablation red on exactly its own rule, the control green)
6. the phase's vitest file and its neighbours by name: `p359-no-boot-at-quit`, `core-singleton`, `quit-admission`,
   `quit-dispose-order`, `p362-quit-fallback`, `p3571-quit-hardexit`, `power`
7. `npm run conformance:endtree`, `conformance:farattach`, `conformance:remoteclose`, `conformance:samefolder`
8. `git diff --stat 7bd05d4e -- src/main/capabilities.ts src/shared` (empty; if not, `conformance:credentials`,
   `conformance:pocket`, `conformance:pocket:hostile` and `conformance:push`)
9. `node build/p359/probe-p359.mjs --grader-self-test` and `--preflight`; `node build/p357/probe-p357.mjs
   --grader-self-test`
10. `npm run smoke:quit` and `npm run smoke:quitdoors`, each under a lock slot (through `build/quit-smoke.mjs` and the
    helper): the held leg the will-quit SIGKILL with no sentinel left, the teardown leg exit 0 with the sentinel marked
11. `node build/fault-harness.mjs` (after step 4's build) and `npm run smoke:t1`, each under a lock slot: the battery's
    PASS lines and the verify step's, copied from the output
12. The Electron count, the socket check, the history stats

Not run, with the reason: `npm run smoke` and `npm run smoke:t3` start Electron outside `build/electron-run.mjs`;
`conformance:resume:capture` starts real agents; `package` moves nothing this phase touches (the bundle gates run in
step 4). HC in `probe:p359` is the in-process second boot those would otherwise cover.

## 12. What is NOT in this phase

- No change to what a boot does, the manifest gate, the backup ring, recovery or the quarantine.
- No change to the quit's order, its bounds or its hard exits (357, 357.1, 362): `src/main/capabilities.ts` is not
  touched, and `before-quit` and `will-quit` stay byte for byte. (The fix round changes what the quit's project step,
  `disposeProjectCloneIpc()`, joins, and nothing of its place or its three second bound.)
- No door removed or stopped earlier (D3): the focus and blur listeners, the power handlers, Live Diagnostics' stop and
  startup's three asks stay where they are.
- No change to the harness cycles: a harness still boots a second core in one process (HC).
- No change to a startup a quit overtakes beyond its log line: it still opens its window, its menu-bar item and its
  power handlers into the quit, as at the parent (§14 Q1).
- No change to the orphaned-client reap or the hook server.
- No new words on any surface; no menu row.
- Nothing reads his live profile. Every run uses a scratch profile, HOME and socket.
- No release by itself.

## 13. For the main session at landing

1. An owed entry, if he answers §14 Q1 the other way or wants it queued: a startup a quit overtakes still opens its
   window, installs its menu-bar item, its power handlers and its updater into the quitting app (S1: the window at
   59 ms, closed at 106 ms, at the parent and at the prototype). `src/main/index.ts:184-186` already says why `app.quit`
   at that point lets startup run on. The behaviour lens added one more thing that entry would own, identical at both
   builds: in S1 a login-shell PATH capture is logged starting about 4 ms AFTER the disposer's `reaped 1 in-flight
   probe(s)` line and runs about 85 ms, so a startup the quit overtook can start a login shell no reap covers.
2. `probe:p357`'s boot count was read as one line per boot since Phase 357 (§0.1 item 8); any other reader of that count
   would be wrong the same way (the spec step found none: `grep -rln "macOS login session" build/` names
   `probe-p357.mjs` and `probe-p133-login-session.mjs`, whose one match is its own refusal sentence, line 134).
3. Found, not this phase's: the harness dispatcher's comment names `npm run smoke:shutdown`
   (`src/main/harness/index.ts:421`), which `package.json` no longer has; `probe:p359`'s HC arm runs that mode through
   the helper instead.
4. The candidates §0.1 item 6 did not measure (a native watch re-armed by the dying core; a machine's rows written
   `unknown`) close with D1 whatever they would have read; §10.1 (b) measures the second.
5. Cleanup after the follow-up commit: the worktree and `/private/var/tmp/tortie-wt/scratch/p359/` (2.7 GB by `du` at
   the end of the spec step: the parent, the prototype and the run folders, most blocks cloned and shared).

## 14. Questions for him (the main session asks; the build proceeds on the defaults)

1. **When a quit lands while Tortie is still starting up, should Tortie stop starting?** Default: not in this phase.
   Today, and after this phase, a ⌘Q in the first moment after launch still opens Tortie's window for a fraction of a
   second before it closes; this phase only stops it starting the session engine there. The other choice queues a
   phase in which startup stops as soon as a quit has begun, so no window flashes.
2. **The changelog line.** Default: one item, "If Tortie's session list is damaged when you quit, the next launch now
   says it was rebuilt from a backup, instead of Tortie rebuilding it silently on its way out". The other choice leaves
   it out, because nothing else a person sees changes.

## §As built (the integrator, 2026-11-09)

The three builders' files as they returned them, plus the integrator's. `git diff 7bd05d4e` is this phase alone: 11
tracked files changed (1,260 insertions, 36 deletions) and two new paths, `build/p359/` (129 files: this file,
`CHECKLIST.md`, `probe-p359.mjs` 2,082 lines, `fixtures/graders.json` 6,123 lines and `fixtures/raw/` 125 files in 23
folders, 708 KB) and `src/main/sessions/__tests__/p359-no-boot-at-quit.test.ts` (1,048 lines, 19 cases). Nothing
staged, committed or stashed. The integrator's runners and logs are under
`/private/var/tmp/tortie-wt/scratch/p359/integrator/` (`blk.sh` for one command in or out of the history block, `slot.sh`
for a lock slot around it, `endcount.sh`, `dup-scan.mjs`, `delta.patch`, `logs/`). His shell history read `743319
1794200266` and `23166 1790702242` at the start (02:58), before and after every run, and at the end. His reports folder
held 34 names, the same names and mtimes before and after every run.

### The seams

- `core` ↔ `gate`: S16 reads green over the core builder's two hunks as they stand (the gate builder read S16 alone red
  at the parent, 5 findings).
- `core` ↔ `probe`: the probe's `STARTUP_REFUSAL_LINE` is the core's line word for word; `--preflight` read it in HEAD's
  built bundle and not in the parent's. No export moved (§9.2).
- `probe` ↔ the contract and the commit: two seams no builder could see, both fixed by the integrator (decisions 1 and 2).

### What the integrator changed, and why

| File | Change | Where it comes from |
| --- | --- | --- |
| `package.json` | +1: `"probe:p359": "node build/harness-socket.mjs --fresh gmux-p359 'node build/p359/probe-p359.mjs'"` after `probe:p362` | §8 |
| `build/assert-electron-teardown.mjs` | +13 −1: `HELPER_USER_FLOOR` 186 → 187 with its paragraph | §6, obligation 1 |
| `build/verification-checks.mjs` | +23: `electron('probe:p359')` with its paragraph, after `probe:p362` | §8, §9.1 |
| `CLAUDE.md` | +3 −2: the `conformance:stoppedlist` row gains Phase 359's paths, S16's clause and its timing; the `probe:p357` row gains D7; a new `probe:p359` row after `probe:p362` | §7.1, §9.1 |
| `CHANGELOG.md` | +1 under `## Unreleased`, `### Fixed`, below 362's: §5's item word for word, no full stop and no link | §5, §14 Q2's default |
| `.gitignore` | +2: `!build/p359/fixtures/raw/*/app.log` with a comment | NEW (decision 2), Phase 362's precedent |
| `build/p359/probe-p359.mjs` (the probe builder's file) | +4 −2 against the builder's file: the need `GMUX_READ_NEED` renamed `FOLDER_READ_NEED`, with a two-line comment | NEW (decision 1) |
| `docs/audits/contract-baseline.txt` | none: `--check` byte for byte | §6 |

### Decisions the integrator made

1. **A need named like an environment name (new).** `build/contract-inventory.mjs` sweeps `build/` for
   `\bGMUX_[A-Z0-9_]+\b` and records every match as an environment name. The probe builder's need constant
   `GMUX_READ_NEED` matched, so the first `--check` read `[env.names] count=120` against the baseline's 119, with
   `GMUX_READ_NEED` inserted, exit 1, and `npm run build`, which ends in that check, would have failed. The contract
   does not move (§6) and a need is not an environment name, so the baseline was not regenerated: the constant is
   `FOLDER_READ_NEED` (two uses), and the self-test reads needs by their words, so no fixture moved. `--check` then read
   byte for byte, alone, inside both builds and over the committed-tree copy.
2. **The `.gitignore` line (new, the Phase 362 integrator's finding again).** `*.log` (`.gitignore:6`) hid the probe's
   23 raw `app.log` fixtures, so a plain `git add` would have committed 106 of the folder's 129 files. Measured, not
   read: a scratch tree holding exactly what git would commit (a `git clone --shared` at `7bd05d4e`, `git diff 7bd05d4e
   --binary` applied, every untracked file git sees copied, `node_modules` linked) read both probes' self-tests PASS,
   `contract-inventory --check` OK and `conformance:stoppedlist` PASS; with the 23 `app.log` files set aside, p359's
   self-test read `FAIL`, exit 1. With the line, 129 of 129 files are visible and none ignored. `git add -f` at the
   commit would do too, and is easy to forget.
3. **More gates than §7.2 named (new).** Nine gate scripts read `core.ts` as text (`conformance-agents`,
   `-containment`, `-endtree`, `-farattach`, `-machines`, `-pocket`, `-stopped-list`, `p274/conformance-samefolder`,
   `p293/conformance-manager`), and CLAUDE.md's rows name `core.ts` for machines, pocket and pocket:hostile too. The
   four §7.2 named ran, and so did pocket, pocket:hostile, agents, containment, manager and machines, all green.
4. **The duplicate scan (CLAUDE.md's growth guardrail), named and not extracted.** `dup-scan.mjs` (windows of ten
   trimmed non-blank lines, six of them carrying twelve or more characters, that hold a line this phase added and
   appear elsewhere under `src/` or `build/`) found 25 runs. 22 are in `probe-p359.mjs`, 10 to 40 lines each and about
   400 in all, shared with `probe-p362.mjs` and `probe-p357.mjs` (one also with p348, p349 and p350): the probe
   scaffolding §8 told the builder to port rather than import (the helper imports, the self-test's sweeps, the RUN
   grader's clauses, the scratch tmux reader, the run's end). Two are within the test file (cases 3 and 3b's held boot)
   and one is the window stand-in it shares with `p362-quit-fallback.test.ts` (copied, as §4.1 asks). Extracting would
   rewrite landed, verified probes at integration for no behaviour; a later consolidation can make one probe kit.
5. **The scratch HOME skips seven tests the builders ran (a finding for the main session).** Every command ran with
   `HOME` and `ZDOTDIR` in scratch, `HISTFILE=/dev/null`, `SHELL=/bin/sh`, `TERM_SESSION_ID` and `TERM_PROGRAM` unset,
   npm's update notice off, and `TMPDIR` spelled `/var/tmp/…` (preview's protocol test needs its folder behind a link).
   `npm test` reads 23 skipped in 4 files where each builder reported 16 in 3. The seven are
   `src/main/context/__tests__/scan.integration.test.ts`, "the reader against the real machine", which runs only when
   `~/.agents/skills` exists under `HOME` and then scans every agent's context location there, `~/.claude.json` among
   them. So the builders' `npm test` ran with his real `HOME`, and that test read his agents' context folders, which
   §0 forbids. Nothing here can undo it; a brief that asks for `npm test` should say "under a scratch HOME", as the
   integrator's did.
6. **`smoke:t1` was not run.** The integrator's brief says "Do NOT run smoke:t1" where §11 step 11 lists it; the
   prohibition was followed. §10.2 has the attack verifier run it beside HC and the fault battery, which ran here.

### Commands, exit codes and numbers

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `df -h /` | 0 | | 89 GiB free at the start, 87 at the end |
| `npm run typecheck` | 0 | 3.3 s | import boundaries 1,440 production files, 8,232 imports, 0 violations; runtime cycles 1,437 files, 5,037 edges, 0 strongly connected components; shared types OK |
| `node build/contract-inventory.mjs --check` | 1, then 0 | 1.2 s, 0.6 s | decision 1, then byte for byte |
| `npm test` | 1 | 73.2 s | 1,200 files (1,193 passed, 3 failed, 4 skipped); 22,894 tests (22,867 passed, 4 failed, 23 skipped). The four are the `/bin/ps` tests inside the history block: `process-table.native` ×1 and `ps.native` ×2 ("expected 0 to be greater than 0", an empty table), `p269-env-names` ×1 ("spawnSync /bin/ps EPERM"); not run outside it |
| `npm run build` | 0 | 49.4 s | `gate:electron` 187 of 586 files reach the helper against a floor of 187, 32 of 32 ablations; `gate:background` 588 files, 4 long-lived starts each ended in a `finally`, 32 of 32 fixtures; `gate:checks` PASS, 286 check scripts classified (285 before `probe:p359`), 55 `tsxCli()` importers against a floor of 54, 1,200 test files reach no home past `HOME`; `conformance:ios` 55 rules; `gate:onlyadd`, `conformance:harnessprobes` (6 clauses, 16 ablations) and `contract-inventory` OK. The bundle names `appLifecycleState() === "quitting"` 6 times against the parent's 5, and the startup line once |
| `npm run conformance:stoppedlist` | 0 | 4.1 s through npm, load 6.4 | 16 rules over 1,437 files; 239 of 239 ablations (178, and 61 for S16) red on exactly their own rules; the control green; S8 19 environment shapes, 3 source variants and the shipped export |
| vitest, §11 step 6's seven files | 0 | 4.2 s | 99 of 99: `p359-no-boot-at-quit` 19, `core-singleton` 9, `quit-admission` 8, `p362-quit-fallback` 22, `p3571-quit-hardexit` 15, `quit-dispose-order` 11, `power` 15 |
| `conformance:endtree`, `:farattach`, `:remoteclose`, `:samefolder` | 0 each | 1.8, 0.2, 0.9, 3.5 s | 16 rules and 84 self-tests; 11 rules; 11 tests; 9 of 9 ablations on both kinds of volume, its image detached |
| `conformance:pocket`, `:pocket:hostile`, `:agents`, `:containment`, `:manager`, `:machines` (decision 3) | 0 each | 12.8, 17.1, 4.2, 1.6, 2.0, 25.1 s | 192 rules and 25,744 checks; 363 arms; PASS; 52 readings and 10 of 10 ablations; 72 rules and 2,919 checks; PASS |
| `git diff --stat 7bd05d4e -- src/main/capabilities.ts src/shared` | 0 | | empty, nothing untracked there: `conformance:credentials` and `conformance:push` are not triggered |
| `node build/p359/probe-p359.mjs --grader-self-test`, lock slot `electron.lock2` | 0 | < 1 s | 21 graders, 76 clauses each shown red alone, 145 needs each shown unreadable alone, 390 fields, 7 variants, 34 raw fixtures graded and 18 read through the one reader |
| `P359_PARENT_CHECKOUT=…/scratch/p359/spec/parent node build/p359/probe-p359.mjs --preflight`, same slot | 0 | < 1 s | PASS, 20 checks (the parent built and without the startup line, HEAD built after every source file and with it, both dispatching `shutdown-refusal`) |
| `node build/p357/probe-p357.mjs --grader-self-test`, same slot | 0 | < 1 s | 9 graders, 56 clauses, 47 needs, 172 fields, 99 raw fixtures |
| the committed-tree copy (decision 2): both self-tests, `contract-inventory --check`, `conformance:stoppedlist`; slot `electron.lock2` | 0 each | 5 s | the same numbers; with the 23 `app.log` set aside, p359's self-test exit 1, `FAIL` |
| `npm run smoke:quit`, outside the block, slot `electron.lock2` | 0 | 73.0 s, its own build included | held: SIGKILL after 3,739 ms, the held line, the sentinel armed and cleared (left false, marked false), the session list made, 0 dumps, 0 macOS reports, "on disk after 157 ms"; teardown: exit 0 after 1,742 ms, the sentinel left and marked, 0 dumps; its self-test 38 of 38 fixtures and 5 of 5 sentinel texts. Load 14.5 before |
| `npm run smoke:quitdoors`, outside the block, slot `electron.lock2` | 0 | 56.6 s | 9 of 9 (step 7 refused `fs:writeFile`, `git:init`, `machines:add` and `machines:cloneProject` with `SHUTTING_DOWN`), SIGKILL after 1,909 ms, the held line, the sentinel cleared, the session list made, 0 dumps, 0 reports, "on disk after 151 ms" |
| `node build/fault-harness.mjs`, outside the block, slot `electron.lock2` | 0 | 57.9 s | `[fault] PASS — 20 cases, every invariant held`: clean, 16 named points (create ×4, snapshot ×2, restore ×5, backup ×4, quit ×1) and 3 random (258, 1 and 212 ms); its teardown ok |
| `dup-scan.mjs` (decision 4) | 0 | | 25 runs |
| the battery on the final tree, `npm run typecheck && npm run build && npm test` | 1 | 123.7 s | typecheck and build exit 0 with the numbers above; `npm test` the same 22,867, 4 and 23, the same four `/bin/ps` failures |
| `gate:electron`, `gate:background`, `gate:knownhosts`, `gate:checks`, `gate:contract`, after this section was written | 0 each | 11.9 s in all | each reads `build/`, where this file lives |
| the end count (CLAUDE.md's command, outside the block, once) | 0 | | none of this phase's: his Tortie (692) and its crash handler (2727), and Slack's, Chrome's, Granola's and Cursor's crash handlers, all under launchd; no `p359`, `smoke-quit`, `p144-doors` or `gmux-fault` name under `/private/tmp/tmux-501/`; no `sleep 90` and no process naming those sockets; 0 FIFOs; lock slot 1 held by `p3251-reverify`, 2 and 3 free |

Each smoke printed `[electron-run] … ended 1 process the teardown found still running.` once, and the fault battery once
per case (20), the helper's own teardown ending a child the SIGKILLed main left, as in 357.1's and 362's runs.

**Not run, and why.** `npm run smoke` and `npm run smoke:t3` start Electron outside `build/electron-run.mjs`; `smoke:t1`
(decision 6); `smoke:remote` and `smoke:machines` (forbidden); `conformance:resume:capture` starts real agents;
`package` (nothing in the packaged path moves; the bundle gates ran in both builds); `probe:p359`'s and `probe:p357`'s
app runs (the verifiers'); `conformance:credentials` and `conformance:push` (not triggered); `conformance:runtime` (the
runtime table in `build/verification-checks.mjs` did not move; the edit is one classification).

### The fix round (the fixer, 2026-11-09)

The verify answered with two lenses. Lens 1 (the behaviour) approved with two nits. Lens 2 (the attack) answered
needs_work with one major, one minor and two nits. The fix ran once. Its runners and logs are under
`/private/var/tmp/tortie-wt/scratch/p359/fixer/` (`blk.sh`, `slot.sh`, `logs/`, the live driver `bin/xp-drive.mjs` and
its preload `bin/xp-preload.cjs`, the hostile copies `bin/hostile-f.mjs`, the run folders `runs/`). Nothing staged,
committed or stashed. His shell history read `743319 1794200266` and `23166 1790702242` at the start, before and after
every run, and at the end; his reports folder held 34 names, the same names and mtimes, before and after every run.

#### The major: a project made or cloned around the quit (lens 2, arm XP). Fixed, not dropped

**The finding, as measured.** A `projects:create` admitted just before ⌘Q adds its project through the session core
after its folder and `git init`; a clone whose git exited just before it adds its project after its rename and its HEAD
read. The quit's project step, `disposeProjectCloneIpc()` (awaited by the ordered disposer on the line before
`shutdownGmuxCore()`, `src/main/capabilities.ts:899-903`), joined neither: no create was tracked, and
`CloneEngine.finish()` takes a run out of `runs` on its first line. So each add asked `getGmuxCore()` for the first time
after the core's shutdown: the parent booted a second core that wrote both rows, and HEAD refused, leaving the folders
on disk and no project row. Worse than the parent.

**What changed** (`git diff 7bd05d4e`; the three files were untouched before this round):

| File | Change |
| --- | --- |
| `src/main/projects/clone.ts` | +92 −7. `finishing`: a run is held there from `finish()`'s first line to its last frame, so `dispose()` joins a clone whose git exited (its rename, HEAD read and add) inside its existing bound. `closed`, resolved on `dispose()`'s first line: `succeed()` races the HEAD read against it, so a clone already renamed into place adds its project at once once the quit has begun (the branch is one line of copy for a closing window). `closing`: a `start()` admitted but still preparing when the quit began spawns no git, removes its empty temporary folder and says cancelled, exactly as Cancel would; the check is the last line before the spawn, with nothing awaited between them. The race's timer is cleared |
| `src/main/projects/create.ts` | +26 −4. `createProjectCreator(deps, quitBegun?)`: once `quitBegun` resolves, a create still in `git init` stops waiting for git and adds its project (`isRepo: false`), the way a failed `git init` already opens the folder as a project; git finishes its own `init`. Without `quitBegun` a create waits for git as it always has; a `gitInit` that throws synchronously is still read as a failed init |
| `src/main/projects/index.ts` | +75 −4. `creates`: every admitted create, tracked as its outcome with its rejection answered, so the set holds nothing that can reject; admission is already closed by the typed invoke wrapper at the press, so it only shrinks. `quitBegun`, resolved on `disposeProjectCloneIpc()`'s first line and handed to the creator. `disposeProjectCloneIpc(timeoutMs = PROJECT_QUIT_JOIN_MS)` joins the creates and the engine's own `dispose` inside ONE bound, the clone step's three seconds (`PROJECT_QUIT_JOIN_MS = 3_000`), so the step is never longer than it was; with nothing in flight it waits for nothing |
| `src/main/projects/__tests__/p359-project-adds-at-quit.test.ts` | new, 863 lines, 13 cases, hermetic (every child_process call a stand-in or a throw, git's runner a stand-in, no login shell): the engine (1a to 1e), `projects:create` through its registered handler (2a to 2e), and end to end over the SHIPPING core and lifecycle with the real `defaultDeps()` and `GmuxCore.boot` spied (3a the attack lens's XP with its holds let go only after the shutdown, 3b the stated residual, 3c the ablation: copies of the three files with this round taken out lose 3a's projects, and the same copies unedited keep them) |

**Where it comes from.** Lens 2's own suggestion (keep a clone run until its add settles, join the creates the same
way), extended by a measurement (new). The join alone was built first and driven live (run `x1` below): it kept both
projects when the holds were let go at 150 ms and at 1,000 ms after the press, but it made those quits wait for the
release (`will-quit` at 321 ms and 1,177 ms against the parent's 143 ms and 136 ms), and in lens 2's own drive, whose
holds can only end after the core's shutdown, it waited out its whole bound and still lost both (`will-quit` at
3,132 ms, one project listed at the relaunch). Two rows worse than the parent. So the step also TELLS what it joins that
the quit has begun (`quitBegun`, `closed`): a create stops waiting for git and a clone for its branch, and each adds at
once on the core that is still running. Measured again (run `x2`): every drive keeps both projects with no wait.

**The stated residual (not fixed, and why).** An add that cannot be made inside the bound, because the disk has not
made the create's folder or not finished the clone's rename within three seconds, reaches the core after its shutdown
and is refused: what is on disk stays there and is opened again with ⌘O. At the parent such an add, let go in the quit's
last fraction of a second, was answered by the second core itself, the defect this phase removes; anything later was
lost at the parent too. Answering it would need a core in a quitting process or a new durable record read at the next
launch, a change to what a boot does (§12). Case 3b pins the residual.

**The live drive** (`bin/xp-drive.mjs`, one Electron at a time through `build/electron-run.mjs` inside
`build/harness-socket.mjs --fresh gmux-p359f`, each arm on its own scratch profile, HOME and ZDOTDIR, `HISTFILE=/dev/null`,
`SHELL=/bin/sh`, the Tailscale and DNS stand-ins, every probed agent row hidden and `agents:list` read back, git a
`/bin/sh` stand-in that holds `init` and answers `clone` with an empty repository; the parent is the spec step's built
`7bd05d4e`). A create (`gitInit: true`) held in `git init` and a clone held in its HEAD read, both admitted before the
bridge's quit; the holds let go 150 ms after the press (R150), 1,000 ms after it (R1000), or 5 ms after the core's
dispose (RD, lens 2's own drive); then a relaunch of the profile reading `projects.list()` in the window. `x1` ran the
parent and the join-only build (183.7 s, exit 0); `x2` the final build (149.4 s, exit 0):

| Arm | Parent (`x1`) | Join only (`x1`) | This round (`x2`) |
| --- | --- | --- | --- |
| R150 | a second core (login lines at +155 and +172 ms), a launch generation spent at +226 ms; both rows; `will-quit` 143 ms | no second core; both rows; `will-quit` 321 ms | no second core, no generation spent, the quit generation at +18 ms; both rows; `will-quit` 136 ms |
| R1000 | the process ended first: no row for either, the relaunch lists the base project alone; `will-quit` 136 ms | no second core; both rows; `will-quit` 1,177 ms | no second core; both rows; `will-quit` 181 ms |
| RD | a second core (+140, +155 ms), a launch generation at +200 ms; both rows; `will-quit` 134 ms | no second core; both LOST; `will-quit` 3,132 ms | no second core, no generation spent; both rows; `will-quit` 134 ms |

Every launch ended by the will-quit SIGKILL; no app.log held a crash record; at HEAD the window got the create's
answer, the made folder, before it closed, and at the parent it got none. In R1000, where nothing let the holds go, the
stand-in git's held `init` outlived its app for up to its own 60 s loop, at both builds (as a real `git init` the app
started does), and was gone at the end count. That the answer reads `isRepo: false` when the quit stopped the wait is
pinned by case 3a.

#### The minor: no gate pinned D3, every door answering the refusal through its own catch (lens 2, hostile copy T12). Fixed

`build/conformance-stopped-list.mjs` S16 gains clause (f), THE DOORS ANSWER THE REFUSAL (+306 −6 lines against the file
as integrated): every `getGmuxCore()` under `src/main` outside a test, `src/main/harness/` and the five harness modes
`ASK_HARNESS_MODES` names (`power/smoke.ts`, `manifest/reconstruct-smoke.ts`, `machines/remote-smoke.ts`,
`fault/harness.ts`, `conformance/resume.ts`, each run only in a harness launch) answers its rejection on every path: its
chain's last link, `.finally(…)` aside, is `.catch(h)` or `.then(a, b)`; or it is awaited inside the try block of a
`try` with a catch in its own function; or it is awaited or returned into an IPC handler (the last argument of
`handle(…)` beside a string channel), a callback of a chain that ends in a catch after it, or one of the ten
`ASK_SEAMS` rows, each naming where the function is handed (`seamOf`) and who answers it (the power deps'
`captureAll` and `takeManifestGeneration`, the context and overview getters, the live sessions probe, `coreReady`, the
door's overview getter, the clone engine's and the create's `addProject`, `localProjectRoots`). The name read other
than by a call (handed on, or imported, exported or destructured under another name) is red, and a seam row or a
harness mode that no longer asks is red, so neither list rots. Where it comes from: lens 2's fix line ("every
getGmuxCore() call outside an IPC handler is caught on every path"); the seam list and the harness exclusion are new,
because the catch for a getter handed to a registrar lives in the module it is handed to, which a rule over one file
cannot read, and a listed seam is a reviewed claim a new door must make. 16 ablations, each red on S16 alone (lens 2's
T12 first, then an async listener with no try, a chain caught in the middle then given a `then`, a held promise, a try
with only a finally, an await in a catch block, a timer callback inside an outer try, a callback of an uncaught chain, a
handler-shaped call with no channel, a top-level await, the name handed on, imported and destructured under another
name, the power deps' key renamed, a seam that no longer asks, a harness mode that no longer asks); the control gains
`DOOR_MODULE` with five doors that answer (a terminal catch, `.then(a, b).finally`, a try with a catch, a callback of a
caught chain, an IPC handler), green (ten files to eleven). CLAUDE.md's `conformance:stoppedlist` row gains the paths,
the timing and the clause.

**The gate file's encoding (an accident of this round, repaired and checked).** A `perl -0pi` edit of the header wrote
one curly quote, which made perl re-encode the whole file and double-encoded every non-ASCII character in it. It was
repaired by reversing that one encoding (`iconv -f UTF-8 -t LATIN1`), and the repaired file was compared with the file
as integrated, rebuilt from the attack lens's `delta.patch` over `7bd05d4e`: the only differing lines are this round's
own (6 replaced, 306 added), and its non-ASCII characters are the parent's own kinds (’ … — § ⌘).

#### The nits

- Lens 1, the Live Diagnostics arm's wording in the backlog entry: no code change; the entry is the main session's (§0.1
  item 2 already replaces the arm). If it is reused it should say the remote join waits at most `CANCEL_GRACE_MS`
  (250 ms) of the execution ledger.
- Lens 1, S1's login-shell PATH capture starting after the disposer's reap: identical at both builds, not this phase's;
  added to §13 item 1, the owed entry it belongs to.
- Lens 2, the door's `beforeOpen` catch (`src/main/pocket/ipc.ts`) logging "the sessions were not ready" when the quit
  refused it: not fixed. A log line's cause, in the phone door's domain, whose gates (`conformance:pocket` and
  `:pocket:hostile`) read its log calls; D3 keeps every door's catch as it is.
- Lens 2, S16 (a) not seeing a boot through a namespace import with a key built at run time (T6): not fixed, optional
  by its own words; the behaviour stands on D1's one check whatever path reaches the boot.

#### Commands, exit codes and numbers (the fixer's)

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| vitest `p359-project-adds-at-quit` and `create`, history block | 0 | 2.8 s | 27 of 27 (13 and 14) |
| `npm run typecheck`, twice | 0, 0 | 5.9 s, 5.8 s | import boundaries 1,440 files, 8,232 imports, 0 violations; runtime cycles 1,437 files, 5,037 edges, 0 strongly connected components |
| `node build/contract-inventory.mjs --check` | 0 | 1.0 s | byte for byte, and inside both builds |
| `npm run build`, twice (after the join, after the races) | 0, 0 | 51.8 s, 51.7 s | `gate:electron` 187 of 586 against a floor of 187; `gate:checks` 286 scripts, 1,201 test files reach no home past HOME; the bundle names `quitBegun` or `markClosed` on 7 lines |
| `npm run conformance:stoppedlist` (and `node build/conformance-stopped-list.mjs` three times, `--verbose` once) | 0 each | 4.5 to 4.6 s at loads 8.6 to 20 | 16 rules over 1,437 files; 258 of 258 ablations (242, and 16 for (f)) red on exactly their own rules; the control green |
| T12, the attack lens's own shape, by `--root` over a `cp -Rc` of `src/` with `node_modules` linked | 1 (as it must) | 4.5 s | S16 red alone: `src/main/index.ts:753 drops what getGmuxCore() answers`; 258 of 258 ablations, the control green. Without `node_modules` S8 also read red (its driven half needs tsx), as in the attack lens's own runs |
| `bin/hostile-f.mjs`: twelve hostile copies of my own by `--root` | 0 | 93.3 s | 12 of 12 as expected: the cadence's, the resume's and the tray's catch taken away, a microtask door, an `ipcMain.on` listener, an anonymous default export, `readSessionFacts`' try given only a finally, a `Promise.all` with no catch and an async IIFE each red on S16 alone; a `.then(a, b)`, an IIFE with a try and an `ipcMain.handle` with a string channel green |
| `npm test`, history block | 1 | 94.5 s | 1,201 files (1,193 passed, 4 failed, 4 skipped); 22,907 tests (22,879 passed, 5 failed, 23 skipped): the four `/bin/ps` tests (`process-table.native` ×1, `ps.native` ×2, `p269-env-names` ×1) and `p347-open-files.native` N8, a timing test (14.3 s) at a load of 8.6, 15.9 and 17.2 |
| that file alone, history block | 0 | 23.9 s | 11 of 11, N8 among them, at a load of 24 |
| vitest, §11 step 6's seven files with `p359-project-adds-at-quit`, `create` and `pocket/disposer` | 0 | 2.9 s | 139 of 139 in 10 files |
| `conformance:endtree`, `:farattach`, `:remoteclose`, `:samefolder` | 0 each | 1.7, 0.2, 0.8, 3.4 s | 16 rules and 84 self-tests; 11 rules; the vitest; 9 of 9 ablations on both kinds of volume |
| `git diff --stat 7bd05d4e -- src/main/capabilities.ts src/shared` | 0 | | empty, nothing untracked there |
| `probe-p359.mjs --grader-self-test`, `--preflight` (`P359_PARENT_CHECKOUT` the spec step's parent); `probe-p357.mjs --grader-self-test`; one slot | 0, 0, 0 | < 1 s | 21 graders, 76 clauses, 146 needs, 392 fields, 8 variants, 77 raw fixtures and 25 through the one reader; preflight 20 checks; p357 9 graders, 56 clauses, 47 needs, 172 fields, 107 raw fixtures |
| `smoke:quit` (its second half, after the build above), outside the block, one slot | 0 | 3.8 s | held: SIGKILL after 2,041 ms, the held line, the sentinel armed and cleared, the list made, 0 dumps, 0 reports; teardown: exit 0 after 1,679 ms, the sentinel left and marked; 2 of 2 |
| `smoke:quitdoors` (the same) | 0 | 1.5 s | 9 of 9 (step 7 refused `fs:writeFile`, `git:init`, `machines:add`, `machines:cloneProject` with `SHUTTING_DOWN`), SIGKILL after 1,465 ms |
| `node build/fault-harness.mjs`, outside the block, one slot | 0 | 56.3 s | `[fault] PASS — 20 cases, every invariant held` |
| `smoke:t1` (its second half), outside the block, one slot | 0 | 2.8 s | create 5 of 5, verify 6 of 6; a harness launch, so detection resolved agents' paths and ran none (Phase 335's hold) |
| `probe:p359` whole, parent first, `P359_KEEP=1`, outside the block, one slot | 0 | 221.7 s | 21 of 21 PASS. C0: `will-quit` 196 ms at the parent, 186 at HEAD, storage 151 and 155 ms. NR (his recorded shape, 16 live shells, the native Quit row): the window closed 588 ms and 487 ms after the press, the pass wrote 16 of 370 at both, storage 155 and 150 ms. B1, L1, P1, H1, D2: a second core and a spent generation at the parent, none at HEAD; S1: one boot into the quit at the parent, none and the startup line once at HEAD; HC: two real boots at both |
| `bin/xp-drive.mjs` `x1` (both builds) and `x2` (HEAD), outside the block, one slot each | 0, 0 | 183.7 s, 149.4 s | the table above; 12 and 6 launches, every one ended (`appsLeft` empty), the harness server gone |
| the end count (CLAUDE.md's command, outside the block, once) | 0 | | none of this round's: his Tortie (692) and its crash handler (2727), and Slack's, Chrome's, Granola's and Cursor's crash handlers; `/private/tmp/tmux-501/` holds `gmux` alone; no `sleep 90`, no process naming this round's scratch; the three lock slots free |

Each smoke and the probe printed `[electron-run] … ended 1 process the teardown found still running.` after every hard
exit, as in the integrator's runs.

**Not run, and why.** `conformance:resume:capture` starts real agents; `npm run smoke` and `npm run smoke:t3` start
Electron outside the helper; `smoke:remote` and `smoke:machines` are forbidden; the loopback-machine arm (a confirmed
machine's rows marked unknown) is not reached by this round; the integrator's decision-3 gates (`conformance:pocket`,
`:pocket:hostile`, `:agents`, `:containment`, `:manager`, `:machines`) read `core.ts`, `capabilities.ts` or the door, none
of which this round touched, and no gate but `conformance:stoppedlist` reads `src/main/projects/`; `probe:p357`'s app
run (its self-test ran; this round's one change on every quit's path, the project step with nothing in flight, is
driven by all 21 verdicts of `probe:p359`); the new test file at the parent tree (3c's ablation and the live parent
measurement stand for it); the four `/bin/ps` tests outside the history block. The duplicate scan's finding: the new
test file copies `writeCopy`, the stand-in core and `TEARDOWN` from `p359-no-boot-at-quit.test.ts` on purpose (§4.1:
copy, do not import a test).

### His ruled round (2026-11-14)

The reverify answered needs_work after the fix round's one fix, so the verdict went to him. On 2026-11-14 he ruled
"359 a": "One more short round. Take the one-line fix with a test and close the gaps in the check. A fresh independent
check then re-runs the failed-sign-in quit in the app at both builds, then it lands." This is the builder's half. The
main session had rebased the phase that morning onto origin/main `8645875e` (Phases 362, 365, 366 and 361.1's guard), so
the parent is `/private/var/tmp/tortie-wt/wt-p359-parent` at `8645875e`, built once here (60.7 s, exit 0), and every
number below was measured today on these two trees. Runners and logs: `/private/var/tmp/tortie-wt/scratch/p359/ruled-builder/`
(`run.sh`, `slot.sh`, `bin/`, `logs/`, `runs/`). The lock script the brief names, `/private/tmp/tortie-ops/lock.sh`, was not
there; the same script at `/private/var/tmp/tortie-ops/lock.sh` keeps the same three slots under `/private/tmp/tortie-ops/`,
and every app run here held one. Nothing staged, committed or stashed.

#### The major: a clone that failed for sign-in held the quit (the reverify's V6). Fixed by the one line

`src/main/projects/clone.ts` (+7 −3 against the file at the start of this round): `finish()` adds the run to `finishing`
only when it was not cancelled and git exited 0 with no spawn error, so `CloneEngine.dispose()` joins only a clone that
will add a project. Where it comes from: the ruling, the reverify's fix word for word. A cancelled run is still joined,
because `dispose()` collects it from `runs` before it cancels; a failed one was never joined before the fix round, which
is the parent's behaviour.

The test, `src/main/projects/__tests__/p359-project-adds-at-quit.test.ts` section 4 (+108 −5): 4a, a clone failing for
sign-in through the registered `projects:clone` handler, its stand-in `gh auth status` taking 2.5 s, the quit pressed
while it runs: the quit's project step, `disposeProjectCloneIpc()` at its own 3 s bound, ends before `gh` does and under
1 s, and the failure's last frame still comes, with `gh`'s hint (2,562 ms, the case waiting for that frame). 4b, the
ablation: copies with the line as the fix round had it hold the step until `gh` ends; the same copies unedited do not
(5,113 ms). Two seams in the file make it possible: `seams.child` is handed the spawn's arguments, and `resolveBinary('gh')`
answers the case's stand-in or none, so no case looks for `gh` on this Mac. 42 of 42 with the fix round's 40 (this file's
13, `create` 14, `pocket/disposer` 13), 61 of 61 with `p359-no-boot-at-quit`. With the line reverted in a scratch copy of
the tree, 4a and 4b read red and the 40 green.

Live: the reverify's own drive (`rv-drive.mjs` and its preload, copied as `bin/rb-drive.mjs` with today's parent and the
socket `gmux-p359rb`), one Electron at a time through `build/electron-run.mjs` inside `build/harness-socket.mjs`, the
parent first, git and `gh` stand-ins (git fails the clone with `unable to get password from user`, `gh` sleeps 2.5 s), the
quit pressed while `gh` runs. Milliseconds after the press, dispose then will-quit:

| Run | Load | Parent | HEAD | `gh` at HEAD |
| --- | --- | --- | --- | --- |
| drive 1, V6 | 34 to 41 | 293, 404 | 545, 659 | still running at the end, ended at +2,135 |
| series 1, V6 ×3, alternating with V0 | 20 to 33 | 92, 202 · 135, 244 · 123, 233 | 109, 219 · 82, 192 · 104, 215 | still running each time (ended at +1,938 and +1,980, one not seen) |
| series 1, V0 ×3 (the same quit, no clone) | 20 to 33 | 94, 205 · 93, 203 · 86, 197 | 61, 172 · 69, 188 · 101, 215 | — |

At the fix round's code the reverify read HEAD at 2,320, 2,427 and 2,323, 2,430 against the parent's 60, 167 and 55, 162.
Today HEAD's will-quit is 192 to 219 ms in the series against the parent's 202 to 244, and the no-clone control's 172 to
215 against 197 to 205: no difference beyond the load's own. Drive 1's single pair, at load 34 to 41, read HEAD 255 ms
later; the series was run to settle that. The two drives ran before a comment-only edit of `clone.ts` and its rebuild;
the S1 series, the smokes and the last test and gate runs after it. Also driven: V1 (lens 2's XP) and V5 (a create, a clone and the quit in one
renderer turn), which reach the changed line. HEAD kept both projects in V1 and the new one in V5, with no login line
after the press. Today's parent, at load 29 to 117, booted its second core in V1 (login lines at +498 and +539 ms), kept
neither project in V1 nor the new one in V5, and left a `.tortie-clone-*` folder in V5.

#### The minor: S16 (f)'s gaps (the reverify's R2 to R6 and R9). Closed

`build/conformance-stopped-list.mjs`, +558 −72 against the file at the start of this round. From the ruling unless marked
new:

1. A rejection handler answers only when it is a function written there, an arrow or a `function` expression, whose body
   holds no `throw` and no `Promise.reject(…)` outside its own nested functions; a nested function called where it is
   written counts as the body's, and a function the handler only hands back does not throw. `.catch(h)` and `.then(a, h)`
   need such an `h` (R2, R3, R4). A `try` answers only when its catch and its finally throw nothing (R5; the finally is
   new). A `.finally(f)` after the catch may not throw (new).
2. Each `ASK_SEAMS` row is `{ file, seam, answers, reach, callers }`. The reach says where the seam's function is called:
   a file, or every file (f) reads that names it, the function the callers sit in, and the name or member path they call
   it by, with a key for a container. Every caller there is read exactly as the ask is read. One that hands the refusal
   on again must be listed among the row's callers with who answers it, and a listed caller may carry a reach of its own,
   read in turn. A listed caller that is gone, and a reach that finds nothing, are red (R6, R9). Read the same way (new):
   a named seam imported or exported under another name, a destructure of a reach's member path, a container on the path
   handed on whole, `?.`, and a string key (`deps['captureAll']`, `ns['localProjectRoots']`).
3. `Promise.race`, `.all` and `.any` are read through, and `.allSettled` answers (R10, accepted). The real tree needs it:
   the door's `beforeOpen` is raced inside its try in `src/main/pocket/ipc.ts`.
4. New, each needed by the real tree: a conditional's branch is followed (the stored live sessions probe is called in
   one); a test of whether a seam is set (`=== null`, `!== undefined`, `typeof`, `!`, an `if` test) is not a use; and
   `seamOf` and `objectSeam` name a `new` construction's argument and a `const`'s object (`new PocketHost(#0).beforeOpen`,
   `const deps.manifest`).
5. New: S16's inputs include every file the reaches read, so the judge's cache cannot answer a changed receiver from an
   old reading.

The real tree as read: ten rows and 14 reaches. The power deps' two rows and the clone engine's add read to an answer with
no caller listed. 13 caller entries in all: 4 carry a reach of their own (the launch snapshot's getter and the door's
`beforeOpen` read through to an answer), and 9 are reviewed claims the reading stops at (the overview's `const deps.manifest`, `const liveSessionsSeam`, the
alerts' `const ready`, the facts' `sessionActivity(#0)`, the creator's `const create`, and `localProjectRoots`' four
`listProjectRoots` hand-offs).

Self-tests: 258 ablations became 283, each red on S16 alone. They are the reverify's six plants verbatim, where it planted
them (R2 to R6 after `index.ts`'s focus listener, R9 before `capabilities.ts`'s `coreReady`), and 19 more: a handler that
returns `Promise.reject`, a named handler, a handler calling a throwing nested function where it is written, a `.finally`
that throws, a try whose finally throws, a new uncaught caller in a receiver (plain, through `?.` and by a string key), a
seam imported under another name, a seam called through its module by a string key, a receiver's container destructured
and handed on whole, a seam handed on to an unlisted place, a listed caller that is gone, a reach that finds nothing (its
parameter renamed, its function called by another name, its function renamed), a caller two hands from its seam, and a
container's member called. The
control gains one function of eleven shapes that answer, R10's among them, and stays green.

Each new clause is load-bearing (`bin/meta-ablate.mjs`): 24 removals, each on a scratch copy of the gate run over this
tree by `--root --json`, each exit 1 with the problem the clause owns; the unedited copy passes. One more removal showed
the "is not there" wording was the same check as "names it nowhere", so the two became one finding.

Attacks: the reverify's own 13 hostile copies (`hostile-rv.mjs`, copied) read 6 of 13 as wanted on this tree before this
round and 13 of 13 after. Eighteen of my own through real files (`bin/hostile-rb.mjs`) read 17 of 18 at first. The
eighteenth was a false red, a handler that only returns a throwing function, now fixed: the shape is in the control and a
removal arm takes the fix out. They now read 18 of 18.

#### The nit: probe:p359's wall time. Done

CLAUDE.md's `probe:p359` row states 221.7 s and 224 s (the last round's) and 374 s today, and the `conformance:stoppedlist`
row names the reaches' files, the new clauses and today's 5.0 to 6.6 s.

#### What probe:p359 reads on the rebased tree (new, for the main session)

The whole default run at both builds (`bin/p359-all.sh`, the parent first, `P359_KEEP=1`): self-test PASS (21 graders, 76
clauses, 146 needs, 392 fields, 8 variants, 77 raw fixtures), preflight PASS (20 checks), then 16 PASS, 2 FAIL and 3
UNREADABLE in 374.0 s at loads of 20 to 60. None of the five involves a clone.

- S1-parent FAIL, S1-head UNREADABLE: on `8645875e` a quit at `whenReady` often ends the process before startup's first
  ask, at both builds, so the parent's door appears only in some launches (62 of 77) and HEAD's need is unmet in the rest.
- H1 UNREADABLE at both builds: its four FIFOs hold main's uv pool, but Phase 365 moved the watch unsubscribes the late
  drain waits for into a process of their own, so the drain no longer holds and the arm cannot make its need.
- D2-parent FAIL: the parent's second core still boots (B1-parent at +235 ms), but in this run the will-quit kill ended
  it before the gate, so the quitting process quarantined nothing. HEAD's D2 passed.
- 130 s of the 374 was one S1 launch at HEAD that did not end on its own, below.

#### S1's hang and crash: measured at the parent too, not this phase's

A quit at `whenReady` sometimes leaves the app running about 130 s after its main process emits `exit` with code 0, until
the helper ends it, and sometimes writes an `Electron-*.ips` report. In a hang, the main process (the bare-word command)
stays alive with the GPU helper, the network service and crashpad, and, seen live, node-pty's `spawn-helper` running
`/bin/sh -c exit 0`: the PTY that `proveNativeModules()` spawns before startup's first ask
(`src/main/diagnostics/native-proof.ts`). Counted over the probe's S1 arm repeated:

| Build in the second slot | Pairs | Second-slot hangs | Parent hangs (first slot) | Reports right after a second-slot launch |
| --- | --- | --- | --- | --- |
| HEAD | 77 | 3 | 0 | 5 (0.1 to 4.1 s after its end) |
| HEAD with D1 removed (a scratch copy, D1's check taken out, rebuilt) | 40 | 1 | 1 (the same pair) | 1 (0.7 s after) |

No report landed near a first-slot launch. With D1 removed, the copy boots like the parent at the ask and still hangs and
crashes in the second slot, and the parent itself hung once, so this is a race already in the parent, between a quit at
launch and startup's native-module PTY. It meets the probe's second launch of a pair more often. It belongs to §13 item
1's owed entry: a startup the quit overtook.

#### Commands, exit codes and numbers (this round's)

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `df -h /` | 0 | | 85 GiB free at the start, 76 GiB at the end |
| `npm run build` in the parent, history block | 0 | 60.7 s | `gate:electron` 187 of 586 (the parent's own floor), contract byte for byte |
| vitest, the fix round's 40 and the new two, history block | 0 | 11.4 s | 42 of 42; with the ruled line reverted in a scratch copy, 2 red and 40 green |
| `conformance:stoppedlist` before this round | 0 | 4.9 s | 16 rules, 1,442 files, 258 ablations, control green |
| the reverify's 13 shapes, before and after | 0, 0 | 92 to 176 s | 6 of 13, then 13 of 13 |
| `npm run -s conformance:stoppedlist`, final | 0 | 6.6 s | 16 rules over 1,442 files, 283 ablations, control green |
| `bin/meta-ablate.mjs`, final | 0 | 151.6 s | 24 of 24 removals red on their own problem, the unedited copy green |
| `bin/hostile-rb.mjs`, final | 0 | 123.3 s | 18 of 18 |
| `npm run typecheck`, history block | 0 | 11.5 s | 1,445 files, 8,247 imports, 0 violations; 1,442 files, 5,046 edges, 0 strongly connected components |
| `npm run build` at HEAD, twice, history block | 0, 0 | 111.4 s, 56.0 s | `gate:electron` 188 of 587 against a floor of 188; `gate:checks` 287 scripts, 1,205 test files reach no home past HOME; contract byte for byte |
| `npm test`, history block, beside the live drive | 1 | 179.2 s | 1,205 files (7 failed); 22,979 tests: 22,944 passed, 12 failed, 23 skipped. The four `/bin/ps` tests (`process-table.native` ×1, `ps.native` ×2, `p269-env-names` ×1) and eight in files this round does not touch: `store-watch.native` ×1, `p33122-walk` ×1 (timed out at 62 s), `p365-process.native` ×2, `repo-watcher.native` ×4 |
| those four files alone at HEAD; the two watcher files at the parent | 1, 1 | 43.0 s, 52.3 s | 9 of 11 (store-watch 1 and repo-watcher 1 failed); at the parent 4 of 5 (repo-watcher 1 failed, another case): FSEvents gave nothing to the scratch temp folder at both builds |
| vitest, the final four files | 0 | 9.8 s | 61 of 61 |
| `bin/rb-drive.mjs` V6, V1, V5, slot 3 | 0 | 214.2 s | the tables above; 12 launches, none left |
| `bin/rb-drive.mjs` V0, V6 ×3, no relaunch | 0 | 208.0 s | the table above; 12 launches, none left |
| `bin/p359-all.sh` (probe:p359 whole) | 1 | 374.0 s | 16 PASS, 2 FAIL, 3 UNREADABLE, above |
| probe:p359 `P359_ARMS=S1`, 4 + 8 + 24 + 40 times at HEAD, 40 at the D1-removed copy | 0 each | 6 s a pair, 130 s a hang | above |
| `smoke:quit` and `smoke:quitdoors` (their second halves after the build), one slot | 0, 0 | 6.4 s | held: SIGKILL after 2,394 ms, settings on disk after 849 ms; teardown: exit 0 after 1,950 ms; 2 of 2. Doors: 9 of 9 (step 7 refused `fs:writeFile`, `git:init`, `machines:add`, `machines:cloneProject` with `SHUTTING_DOWN`), SIGKILL after 1,880 ms |
| the end count (CLAUDE.md's command, outside the block, once) | 0 | | none of this round's: his Tortie (94808) and its crash handler (94828), and Slack's, Granola's, Cursor's, Claude's and Chrome's crash handlers; `/private/tmp/tmux-501/` holds `gmux` alone; no stand-in or sampler left; the three lock slots free |

His history read `746290 1794669389` and `23166 1790702242` at the start (10:32). It moved once, to `746321
1794670684`, at 10:38:04, while no run of mine was going; the tool shells are non-interactive, with no `HISTFILE` and
`SAVEHIST` 0, so that line was his own. It read the same before and after every run after that, and at the end. His
reports folder listed 26 names at the first run and 32 at the end. The six new names, none opened, are
`Electron-2026-11-14-115655.ips`, `-120131`, `-120218`, `-120325`, `-121130` and `-122521`, each with its name's time as
its mtime, and each within 0.1 to 4.1 s of one of this round's second-slot S1 launches (above).

**Not run, and why.** `npm run smoke`, `smoke:t1` and `smoke:t3` start Electron outside the helper, so only the main
session runs them. `smoke:remote`, `smoke:machines` and `conformance:resume:capture` are refused (real agents, real
hosts). The fault battery and HC's harness cycles are not reached by the changed line, and HC passed in the whole run.
`package` moved nothing. The four `/bin/ps` tests outside the history block cannot pass inside it. No real `gh`, git
network or Simulator was used.
