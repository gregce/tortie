# Phase 362 — "a long ⌘Q ends before the quit has saved: the 3 s fallback cuts the quit's own saving" — SPEC

Written by the spec step on 2026-11-08 in `/private/var/tmp/tortie-wt/wt-p362`, a detached worktree at origin/main
`795f5a14` ("docs(backlog): 357.1 landed with round A; link its changelog"; Phase 357.1 landed at `5895b12b`).
**`git diff 795f5a14` in the worktree must be exactly Phase 362's delta**, this file included. origin/main moves while
the phase runs; nobody here rebases, pulls or merges; the main session moves the tree at landing. The charter is
`docs/BACKLOG.md` "## Phase 362" (`:44978`), bound as written except where §0.1 says the tree or a measurement wins,
and `build/p3571/SPEC.md` ("### The landing round", "### The drop round", "### Round A", "### The landing"). F1, the
hard exit on the cut path, is kept at `/private/var/tmp/tortie-wt/scratch/owed-p362/`; this phase reads it as a
reference and does not apply it (D5). His standing rulings bind: **no regression against today** (a scenario worse
than the parent is a defect: fix it or drop the part, and name which); Tortie never ends a session on its own (a quit
ends the app, never a session); just enough words; no tmux vocabulary on any surface; nothing released, tagged,
version-bumped, archived or uploaded; his session count is allowed (build/electron-run.mjs's read-only census).

| | |
| --- | --- |
| Subject | `fix(quit): let a long quit finish saving before it ends` (the entry's) |
| First body line | `Phase 362: a long quit saves what it set out to save` |
| Semver | Patch, unreleased, Mac only, released on his word. One CHANGELOG item under `## Unreleased`, `### Fixed` (§5) |
| Lane | Build: Spec → Build (FOUR builders, disjoint files) → Integrate → Verify (two lenses) → [Fix once → Reverify] → Commit |
| Tier | **3**: it decides whether the quit's own saving runs (the snapshot pass, the quit generation, the core's dispose), which can lose a person's work (CLAUDE.md:268), and it moves the crash notice. Parent measured (§2); two independent methods at least, one an attack (§10) |
| Menus | **No row added, renamed or removed.** The Quit row's event (and the status item's Quit's) now goes to the main window whichever window has focus (D3), and Settings… opens no window into a quitting app (D9) |
| Contract | **Does not move.** No invoke channel, env name, schema, migration, pragma, smoke mode, `gmux.*` key or notice kind. The run sentinel (`<userData>/logs/run.json`) gains one optional field; it is not in the inventory. `gate:contract` must still read byte for byte, and a diff there is a finding |
| `HELPER_USER_FLOOR` | **185 → 186**: `build/p362/probe-p362.mjs` reaches `build/electron-run.mjs` (obligation 1) |
| CHANGELOG | One item (§5); the commit link is added by the follow-up docs commit |

## 0. The hard rules, stated once (every builder, the integrator, every verifier, the fixer, the reverifier)

- NEVER commit, stage or stash. `/Users/gdc/gmux` is read only. Never touch another phase's worktree or scratch
  (Phase 361.1 `wt-p3611`, Phase 360 `wt-p360`, Phase 325.1 `wt-p3251` run at the same time). Scratch lives under
  `/private/var/tmp/tortie-wt/scratch/p362/<role>/`, never under `/private/tmp`; a probe's `TMPDIR` points there too.
- **The built parent is kept for you**: `/private/var/tmp/tortie-wt/scratch/p362/spec/parent` is `795f5a14` (357.1 as
  landed), a `git clone --shared` of the worktree with `node_modules` and `build/vendor` cloned by `cp -Rc` from it
  (specstory 2.10.0; `addon-webgl.mjs` sha256 `e4ab05d2…`) and `out/` built by the spec step (89 s, exit 0, the helper
  floor 185). Use it as `P362_PARENT_CHECKOUT`. Do not edit it, build in it or delete anything in it. Its
  `build/p362spec/` is the spec step's own measurement driver (scratch, never committed); read it, do not import it.
  The spec step's prototypes `proto-a`, `proto-b`, `proto-c` beside it are scratch too, kept for the verifiers.
- `-L gmux` is named only by `build/electron-run.mjs`'s census, and only with `list-sessions`. Every launch's tmux
  work aims at its own scratch socket with the checkout's vendored tmux (3.7b).
- **No real agent runs, not even for a version.** Every launch hides every probed registry row
  (`writeHiddenAgents(profile, prefix, hiddenAgentsBesides([]))`) and reads `agents:list` back
  (`standInsOnlyVerdict(list, { standIns: [] })`); every arm runs shells.
- Never read his keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex`, any agent's or conversation store,
  his shell history's contents or his live Tortie profile. Real data is his recorded shape through
  `build/p3167/seed-sessions.mts --shape his` (counts only). His crash reports are counted by NAME and mtime only.
  A deliberate crash in this phase is an `exit 139` with a stand-in dump written into the scratch profile (§8, QD),
  never a signal macOS reports, because a `--require` preload cannot reach `crashReporter.start` before the app calls
  it (`require('electron')` throws there, measured) and so cannot set `ignoreSystemCrashHandler`.
- His shell history is never written by us: every command that does not launch an Electron or need `/bin/ps` runs
  under `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb`; the four `/bin/ps` native tests fail inside
  it by design (`process-table.native` ×1, `ps.native` ×2, `p269-env-names` ×1; name each as it fails, never run them
  outside it). What needs Electron or `/bin/ps` runs outside it with `HOME` and `ZDOTDIR` in scratch,
  `HISTFILE=/dev/null`, `SHELL=/bin/sh`, `TERM_SESSION_ID` and `TERM_PROGRAM` unset (run the wrapper as `zsh -f`, and
  give it absolute paths for his history and his reports folder, because `~` is the scratch HOME there). Record only
  `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before and after every run (the spec step read `743166 1793987027`
  and `23166 1790702242`, unmoved across every run). A move across an unblocked run: start nothing for 3 minutes and
  stat again; moved again is his; still moved means STOP and report.
- Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids you started, each read again by
  `ps -p <pid> -o command=` right before its signal; every process you start ends in a `finally`. Never signal a probe
  while its own teardown runs. His Tortie has the same bundle id as every build you run: never an Apple Event,
  `osascript` or `open`; a quit is pressed through the native row in main (`item.click()`), `app.emit`, or the harness.
- Every Electron goes through `build/electron-run.mjs` inside `build/harness-socket.mjs` (the two quit smokes through
  `build/quit-smoke.mjs`), with a scratch profile, `HOME` and socket. No Simulator. No real Tailscale, DNS, APNs or ssh;
  never `smoke:remote` or `smoke:machines`. Never import a `build/` script to inspect it; read it as text.
- The lock has three slots shared with the other phases: `zsh /private/tmp/tortie-ops/lock.sh try p362-<role>` prints
  the slot or exits 1 (retry every 60 s in a NEW command); release with `zsh /private/tmp/tortie-ops/lock.sh release
  <slot>` from a `trap`. Every probe or app run holds one. `df -h /` before any build or clone; under 8 GB free, wait
  and report (52 GiB free at the spec step).
- **Faults are made in scratch only.** No fault seam enters the shipped app; the probe's preloads are scratch files
  loaded by `NODE_OPTIONS` into a harness launch, and the update-staged path is driven only in vitest (§10.3).

## 0.1 What the entry and the parent reading give, measured (the tree and the measurements win; each binds)

Everything here is run, not read, at the parent `795f5a14`, under `/private/var/tmp/tortie-wt/scratch/p362/spec/`
(driver `parent/build/p362spec/measure.mjs`, runner `lockrun.sh`, logs and reports in `logs/`, raw event, trace and
log files kept for the probe builder in `fixtures-raw/`). The numbers are §2's.

1. **The cut is real at his scale, and it is not one quit but a class.** His recorded shape plus 64 live shells, each
   holding 23,980 lines of coloured scrollback (12,000 printed lines wrapped at the detached width; the quit saves the
   last 10,000 of each), quit by the native menu's own Quit row in main. The fallback (`setTimeout(() => app.quit(),
   3_000)`, `src/main/menu.ts:249`) quits before the snapshot pass ends whenever that pass is still running 3 s after
   the press: on a quiet Mac the **first** quit (the one-time 1.5 s toast delays the renderer's quit to 1,507 ms) was
   cut at 3,000 ms while his everyday quit (no toast, the renderer's quit at 4 ms) finished its pass at 2,000 ms and
   1,730 ms and was not; under 24 busy loops of the arm's own **every** quit was cut, the everyday one included (load
   73, cut at 3,003 ms); and the first quit with 48 shells was cut both times it ran while the other phases loaded the
   machine (3,000 and 3,001 ms). The entry's "with 48 shells … nothing was cut" holds only on a quiet Mac.
2. **What the cut costs, counted.** The fallback's `app.quit()` is `before-quit`'s second pass; the windows close and
   `will-quit` runs 100 to 240 ms later, before the core's dispose, so nothing is held, the default quit proceeds and
   Node's teardown ends the process with the session list connection open (the crash's close). Usable quit-time copies
   (a body AND its completion record) kept: **15 of 64** (quiet, 49 records left as `.part`), **3 of 64** (61 `.part`),
   **0 of 48** twice (27 and 24 `.part`; in the second, 44 bodies written and not one record), **0 of 64** twice (busy:
   the capture had not finished, nothing was written). No quit generation in any cut run (the newest backup is the
   launch's), no dispose. The relaunch lost nothing else: every row and id, every shell live, three of three
   `localStorage` keys and the first-quit flag, the Settings bounds, no unclean-exit notice.
3. **NEW: under load the parent's process outlives its window by 17.6 s and 40.4 s.** The window closed at 3,108 and 3,106 ms,
   the process's own `exit` event came 1 ms after the `quit` event, and the process was gone at **20,663 ms** (load 73)
   and **43,494 ms** (load 120): a Tortie with no window, its JavaScript already gone, saving nothing. A Dock click or a
   second launch in those seconds reaches a process whose listeners can no longer run (read from the code: `activate`
   and `second-instance` are JavaScript listeners, and `exit` has fired), so it is answered by nothing until the process
   ends. (A) ends that process 0.2 s after its window (§2.2).
4. **⌘Q with Settings in front never reaches the renderer.** A harness app is never active, so `requestQuit()` sends to
   the newest window, which stands in exactly for Settings having focus. No renderer quit, no toast, the first-quit flag
   never written; the fallback's `app.quit()` at **3,006 ms** is the quit's FIRST pass, so the disposer then runs whole
   (8 of 8 copies, the generation, the dispose, the will-quit SIGKILL) and the window closes at **3,508 ms** (the landing
   reverify's R7: 3,433 ms). Until 3 s the app is fully live and nothing says a quit was asked for.
5. **A teardown crash is invisible to the next launch.** The long first quit at the parent, a preload ending the process
   with `exit 139` at the `quit` event (after `will-quit`, before Node's teardown) and writing a stand-in dump into the
   profile's `Crashpad/pending/`: the run sentinel existed at `will-quit` (read first, by a prepended listener), was gone
   1 ms later at `quit` (the log's own `will-quit`, `src/main/log/index.ts:360`, had cleared it), and the relaunch wrote
   no `boot.unclean_exit` and posted no notice although the dump sat in the inventory. That is item 4 measured.
6. **The renderer refuses everything while a quit runs, at both builds.** An invoke made 2 s after the press
   (`sessions.list`) answered `SHUTTING_DOWN` ("Tortie is quitting, so this action was not started.") in every run
   whose quit had begun. So under (A) the window that stays up is one whose actions are refused; under the parent the
   same window is up for the same span until the fallback closes it.
7. **The instrument F1's CM arms need is gone.** The checking better-sqlite3 (`scratch/p3571/crash/bs3`) and research
   143's kept sources (`scratch/p3571/r143-keep/`, `hook-bs3.cjs`, `pcache-check-append.c`) were removed with 357.1's
   and 358's scratch; no copy exists under `/private/var/tmp` or `/private/tmp` (searched 2026-11-08). F1's probe hunks
   still apply to `build/p357/probe-p357.mjs` at `795f5a14` (`git apply --check --include='build/p357/*'` exit 0), but
   CM-parent and CM-head cannot run without a checking build. This phase reads the same fact one step earlier with a
   JavaScript tracker of the session list connection (D11, §8 TX), and carries CM as an opt-in arm that is UNREADABLE
   without a checking build (§13 item 2, §14 Q4). Phase 364's entry names the same removed path (§13 item 3).
8. **(A), (B) and (C) measured as prototypes** (scratch clones of the parent, never committed: `proto-a` guards the
   fallback, `proto-b` adds every window hidden on `before-quit`'s first pass, `proto-c` ports F1's predicate onto
   round A's `will-quit`). §2.2 is the trade in numbers; §14 Q1 is the question to him in his terms.
9. **Citations at this head.** `requestQuit()` `src/main/menu.ts:240-250` (the window `:241-243`, the event `:248`, the
   timer `:249`); the Quit row `:697-701`; `menuActionTarget()` `:173-178` and `canReceiveMenuAction()` `:157-164`; the
   status item's Quit `src/main/tray/index.ts:166-170`; `useQuitRequests` `src/renderer/app/quit.ts:31-57`,
   `QUIT_TOAST_MS` `:29`; `app:quit` `src/main/capabilities.ts:639-641`; the disposer `:720-1145` (its first lines
   `:726-775`, `shutdownGmuxCore()` `:904-908`, the 3 s wedge guard `:970-1015`, the 2 s worker guard `:1030-1035`, the
   late drain that hides windows `:1093-1134` with its hide at `:1104`, `return 'proceed'` `:1144`);
   `shutdownGmuxCore()` `src/main/sessions/core.ts:4602-4660` (the 10 s mutation join `:4621`, the 8 s snapshot race
   `:4623-4626`, the 4 s sync idle `:4628-4631` with `SYNC_QUIT_TIMEOUT_MS` `src/main/specstory/sync.ts:43`, the quit
   generation `:4636`, `dispose()` `:4637`, the hook join `:4643`); `dispose()`'s close `:4475-4479`; `before-quit`
   `src/main/index.ts:825-844`; `STORAGE_WRITE_WAIT_MS` `:852`; `will-quit` `:888-905`; `window-all-closed`
   `:909-911`; `requestSingleInstanceLock` `:237`; `second-instance` `:264-270` (its quitting return `:265`);
   `open-file` `:318-355`; `showAppWindow()` `:454-467` (round A's W3 at `:461`); `activate` `:808-810`;
   `appLifecycleState()`/`markAppQuitting()` `src/main/lifecycle.ts:51-62`; the typed invoke refusal
   `src/main/typed-ipc.ts:53`; the log's `will-quit` clear `src/main/log/index.ts:360`, `clearLogRunSentinel()`
   `:264-270`, the boot's sentinel read `:316-341` and write `:352-357`; `RunSentinel` `src/main/log/sentinel.ts:28-37`;
   `scanCrashDumps` and `DUMP_DIRS` `src/main/log/crash.ts:121-150`; `openSettingsWindow()`
   `src/main/settings/window.ts:47-102`; `QUIET_MS`, `SETTLE_MS`, `POLL_MS` `src/main/quit/storage-landing.ts:59-63`,
   the watch `:185-206`, its `moved` `:200`, `:205`, the bound's answer `:224-228`; the smoke's teardown verdict
   `build/quit-smoke.mjs:139-155`.

## 1. The answer first

| # | What | One line |
| --- | --- | --- |
| 1 | The fallback (item 1) | `requestQuit()`'s 3 s timer quits only when no quit has begun (`appLifecycleState() !== 'quitting'`), so a renderer that never answers still quits at 3 s, and a quit the renderer started runs its own bounded disposer to its end: the snapshot pass, the generation, the dispose, then 357.1's hard exit at `will-quit` |
| 2 | The quit always ends (new, for no regression) | `before-quit`'s async body calls `app.quit()` whether the disposer resolved or threw (only `'killed'` returns), because the fallback was the one thing that ended a menu quit whose disposer threw |
| 3 | ⌘Q from Settings (item 3) | `requestQuit()` sends to `menuActionTarget()`, the main window whatever has focus; with no main window it quits at once |
| 4 | A teardown crash is noticed (item 4) | The log's `will-quit` writes the run sentinel again, marked with the quit's time and the dump inventory of that moment, instead of clearing it; the hard exit's `finally` and Phase 36's escape still clear it right before their SIGKILL; the next boot reads a marked sentinel as a clean quit unless a dump appeared after the mark, which is the existing unclean exit (record and notice) |
| 5 | The trade (item 2) | Built on (A). (B) not built; (C) not built and not a backstop (D5). His choice is §14 Q1 |
| 6 | The checks (item 5, c1 to c4) | vitest over the shipping modules; `conformance:stoppedlist` gains S14 (the fallback, the target, the quit's end, no window into a quit) and S15 (the sentinel at teardown) and widens S12 (c1, c2); each clause with ablations |
| 7 | The proof | `probe:p362` (new): his long quit at both builds, parent first, with the session list connection traced, the Settings press, a renderer that never answers, ⌘Q twice, the status item, a teardown crash and its control, no window into a quit, and 357.1's quit table R1 to R7 with the window's close time beside the parent's |

### 1.1 The decisions, each with its reason

| Id | Decision | Reason (where it comes from) |
| --- | --- | --- |
| D1 | **The fallback acts only when no quit has begun.** In `requestQuit()` the timer becomes `setTimeout(() => { if (appLifecycleState() !== 'quitting') app.quit(); }, 3_000);` with `appLifecycleState` imported from `./lifecycle`. Nothing else about the timer moves: still armed on every press, still 3 s, never cleared | Entry item 1. §2.1: when the renderer has answered, `markAppQuitting()` ran synchronously in `before-quit`'s first pass, so at 3 s the guard reads `quitting` and the disposer runs to its end (64 of 64 copies, the generation, the dispose, the hard exit, every arm). A renderer that did not answer leaves the state `running`, so the timer's `app.quit()` is the first pass, exactly as the parent's Settings press measured (§2.1 PS) |
| D2 | **A begun quit always ends on its own.** `before-quit`'s async body becomes `let outcome: MainDisposeOutcome = 'proceed'; try { outcome = await disposeCapabilities(); } catch { /* one quit-scope warn line, the error's name only */ } if (outcome === 'killed') return; app.quit();`. `markAppQuitting()` and `event.preventDefault()` stay first and synchronous (quit-admission.test.ts pins them) | No regression, new. At the parent the fallback was the only thing that ended a MENU quit whose disposer threw (any quit by the Dock's Quit or the last window never had it). Under D1 the fallback no longer fires once the quit began, so without D2 such a quit would leave the app quitting forever with its window up. No await in the disposer is written to reject (the joins race `Promise.allSettled` against a timer, `joinFunnel` and `joinPocketDoor` say they never throw, and the clone and core steps sit in their own `try`), but nothing pins that for every join (`joinCredentialShutdown` aborts its children synchronously before it returns a promise), so D2 makes the quit's end not depend on it; it costs nothing on any measured path |
| D3 | **⌘Q from Settings reaches the main window.** `requestQuit()`'s window is `menuActionTarget()` (`src/main/menu.ts:173`, the focused window when it is not Settings, else the visible main window, else the first eligible), and with none it calls `app.quit()` at once, as today's no-window branch does | Entry item 3. §2.1 PS: the Settings page does not listen, so only the fallback quit, at 3,006 ms with no toast and the flag never written. The helper already exists for exactly this rule ("Grep for an existing helper"); every menu action uses it. With only Settings open (the main window closed) the quit is now immediate instead of 3 s late |
| D4 | **A teardown crash is noticed, by writing the sentinel again before teardown.** `src/main/log/sentinel.ts`: `RunSentinel` gains `quitAt?: string` (ISO time); `readRunSentinel` keeps it when it is a string; a pure `markRunSentinelAtQuit(dir, dumpNames, nowIso)` rewrites an existing sentinel with `quitAt` and the given inventory and does nothing when there is none. `src/main/log/index.ts:360` becomes `app.on('will-quit', () => markLogRunSentinelAtQuit())`, which reads `scanCrashDumps(crashpadDir)` at that moment. The boot (`:316-341`): a previous sentinel with `quitAt` and **no dump new since its inventory** writes no record and posts no notice; with one, it is today's `boot.unclean_exit` (its `prev` now carrying `quitAt`) and today's `unclean-exit` notice. `clearLogRunSentinel()` keeps exactly its two callers, the hard exit's `finally` (`src/main/index.ts:900`) and Phase 36's escape (`src/main/capabilities.ts:1121`), each the statement before its SIGKILL | Entry item 4 ("or a quit that reaches teardown writes it again first"). §0.1 item 5. The order holds by construction: index.ts's `will-quit` handler is registered at module scope, so it runs first, takes `preventDefault()` and reaches its first `await` before the log's listener (registered in `whenReady`) marks; its `finally` clears afterwards. A clean teardown quit (an update staged, D6 of 357.1; a quit with nothing held) leaves a marked sentinel that the next boot reads as clean because no dump appeared, so no false notice. Crashpad writes a main-process crash's dump to `pending/` (research 144 §5 and its `:271`), and his field crash wrote one, so the dump is the evidence the notice needs; an exit that leaves no dump is not called a crash, which is the sentinel module's own rule ("a claim of 'your app crashed' must come from evidence"). Stated limits: an exit with no dump after `will-quit` (as the 357.1 checker's own `_exit(139)` did) reads clean; a helper that crashes while the windows close on a teardown quit reads as a crash (none did in any run here; on the held quit, every quit that reached dispose, the `finally` clears the sentinel first, so neither applies) |
| D5 | **The trade: (A) is built. (B) is not built. (C) is not built and does not ride as a backstop.** | The entry: the build proceeds on (A); (C) rides only if it costs nothing the parent keeps. Under D1 and D2 the cut path is gone: every quit that begins runs its disposer to the dispose, which holds the connection, and the hard exit takes it. F1's predicate differs from the held count only on a quit that reaches `will-quit` with a connection open and nothing held, which under (A) is a disposer that threw before the core's dispose; none is written to (D2's reason), and on that path no saving has begun (the snapshot pass is inside `shutdownGmuxCore()`, whose own `try` holds it), so (C) would change only whether Chromium's caches are written and whether that one close runs. It would add the weak list, the predicate and S11's pins for a path no shipped code reaches. (C) as the default (F1 alone) costs the parent's copies: 0 of 64 where the parent kept 15 (§2.2). §14 Q1 and Q2 put both to him |
| D6 | **The fallback's guard is pinned.** vitest drives `requestQuit()` with fake timers: with the quit begun, zero `app.quit()` calls from the fallback; with none begun, exactly one at 3,000 ms; the bare timer restored reads red. `conformance:stoppedlist` S14 reads the guard's shape, the target, D2's end and D9's two refusals, each with ablations | Entry item 5 |
| D7 | **c1: the wait's timing constants have literal floors.** `src/main/quit/__tests__/storage-landing.test.ts` asserts `QUIET_MS >= 100`, `POLL_MS >= 1` and `SETTLE_MS > POLL_MS` with literal numbers, and S12 reads the three as top-level numeric consts of `storage-landing.ts` with the same floors, each used once in the watch's settled test | Carried from 357.1's landing. Round A's W0 put the worst landing at 27 ms of 720, so 100 is more than three times it (QUIET_MS stays 150); today all three cut to 0 leave every test and the gate green |
| D8 | **c2: S12 pins `storageWritten`'s first argument to exactly `session.defaultSession.getStoragePath()`, and refuses `app.exit(` and `process.exit(` in any `will-quit` handler under `src/main` and in any function handed to `setTimeout`/`setInterval` inside `disposeMainCapabilities` or `afterMs`** | Carried from 357.1's landing. Both exits run Node's environment teardown in Electron's main process (357's M3), so either would put the crash's close back on the quit |
| D9 | **c3: nothing opens a window into a quitting app, Settings included.** `openSettingsWindow()` returns before constructing a window when none is live and `appLifecycleState() === 'quitting'`; a live Settings window is restored and focused as before. `showAppWindow()` keeps round A's line | Carried from 357.1's landing, and (A) makes it matter: the window stays up through the saving (up to 7.5 s measured on a busy Mac), and at the parent the Settings… row in that span opens a Settings window the quit then closes (§2.1 QW) |
| D10 | **c4: the quit line's `moved` reads true when the storage log first appears during the wait.** The watch remembers whether its first read found no log; `moved` is true when a log appears later or changes; the bound's own answer carries what the watch saw instead of `moved: false` | Carried from 357.1's landing. Today a log absent at the first read and present at the end reads `moved: false` on both answers (`:200`, `:205`), and the timer's answer is always `false` (`:226`) |
| D11 | **The attack's instrument is a JavaScript tracker; CM is opt-in.** The probe loads a scratch preload that wraps `better-sqlite3`'s `Database` through `Module._load` (the way research 143's `hook-bs3.cjs` redirected it), records every connection opened on `<profile>/gmux/manifest.db`, every `close()` with a short stack, and whether each is open at `will-quit`, at `quit` and at the process's `exit`. F1's CM arms are ported into `probe:p362` behind `P362_ARMS=CM` and a `P3571_BS3` checking build; without one they read UNREADABLE with the reason, and they are not in the default arms | §0.1 item 7. The tracker reads the fact the crash needs one step before the crash: a session list connection open, unheld, when Node's teardown begins (the parent's cut), against one held by dispose and a process that never reaches `quit` (HEAD). 357.1's CM-parent and CS-parent already proved that close crashes at `pcache1EnforceMaxPage` and CM-head that the SIGKILL path does not |
| D12 | **The update-staged quit (357.1's D6) is untouched and driven only in vitest.** | `initUpdater()` returns early in an unpackaged build (`src/main/updates/updater.ts:415`), so `isUpdateStaged()` cannot become true in any harness launch without a new seam, which this phase does not add. D1 does not touch that path (`quitAndInstall` never calls `requestQuit`); D4 marks its sentinel at `will-quit` and the next boot reads it clean |
| D13 | **No new words a person reads.** The notice D4 posts is today's ("Tortie quit unexpectedly last time.", `src/renderer/state/subscriptions.ts:516`); D2's line is in app.log only | Just enough words; the entry's refusal of any change to the toast or its words |

## 2. What the spec step measured, how, and the numbers

Every Electron ran through `build/electron-run.mjs` inside `build/harness-socket.mjs` from the parent clone (`zsh -f
lockrun.sh <tag> <arms>`: a lock slot taken and released by a trap, `HOME`/`ZDOTDIR` in scratch, `HISTFILE=/dev/null`,
`SHELL=/bin/sh`, `TERM_SESSION_ID`, `TERM_PROGRAM`, every `CSC_*`, `APPLE_*`, `GH_TOKEN` and `GITHUB_TOKEN` unset,
`TMPDIR` in scratch); every other command under the history block. His history read `743166 1793987027` and `23166
1790702242` before and after every run; his reports folder held 33 names before and after every batch.

**The world** (one arm = one profile, one Electron at a time): his recorded shape seeded by
`build/p3167/seed-sessions.mts --shape his` (102 rows), N live shells created through the window
(`sessions.create`, agent `shell`), each given 12,000 lines of coloured output on the run's scratch server (read back:
23,980 lines of history in every pane of every run), three `gmux.*` keys written 6, 2 and 0 s before the press,
Settings opened, moved to 802×611 at 233,141 and closed through its own close (so the press goes to the main window;
mode `settings` leaves it open), and the menu's own "Quit Tortie" row clicked in main by a scratch preload
(`--require`), which also records every `app.quit()` by its stack, `before-quit` (with each window's visibility),
`will-quit` (with whether the run sentinel exists), `quit`, the process's `exit`, every window's close, and the core's
dispose (`http.Server#closeIdleConnections`, whose one caller in main is the hook server's stop inside it).
`GMUX_FAULT_TRACE` times the snapshot pass (`quit.before-snapshots`, every body's `snapshot.after-write`, every
completion record's `snapshot.after-rename`, `quit.after-snapshots`) and the generation (`backup.before-copy` …
`backup.after-record`). After the process ends, the snapshot folder is read before any relaunch (capsule records with
reason `app-quit` captured after the press; `.part` files), the backup index's newest generation, and the sentinel;
then a relaunch of the same build on the same profile with the scratch server kept alive reads every row and id, the
live shells, the three keys and the first-quit flag, the Settings bounds, `boot.unclean_exit` and the dumps. Times are
milliseconds after the press, on main's clock. A busy arm starts 24 loops of its own a second before the press (each
ends itself after 15 s, and is ended by pid in the arm's `finally` after its command line is read).

### 2.1 The parent (`795f5a14`, 357.1 as landed) and (A)

| Arm | Build | Load | Toast | Renderer's quit | Fallback's quit | Pass ends | Generation | Dispose | `will-quit` | Window closed | Process gone | How it ended | Copies kept (of N) | `.part` left | Quit generation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P64 | parent | quiet (9 to 15) | yes | 1,507 | **3,000** | — | — | — | 3,114 | 3,106 | 3,191 | exit 0, Node's teardown | **15 of 64** | 49 | **none** |
| A64 | (A) | quiet | yes | 1,507 | — | 3,377 | 3,406 | 3,407 | 3,514 | **3,514** | 3,681 | will-quit SIGKILL (wait 152 ms) | **64 of 64** | 0 | quit |
| P64n | parent | quiet | no | 4 | — | 2,000 | 2,033 | 2,034 | 2,141 | 2,140 | 2,318 | will-quit SIGKILL | 64 of 64 | 0 | quit |
| A64n | (A) | quiet | no | 4 | — | 2,147 | 2,183 | 2,184 | 2,291 | 2,291 | 2,468 | will-quit SIGKILL | 64 of 64 | 0 | quit |
| P48 | parent | the other phases' (about 95) | yes | 1,508 | **3,000** | — | — | — | 3,103 | 3,103 | 3,874 | exit 0, Node's teardown | **0 of 48** | 27 | **none** |
| P64nL | parent | 24 loops, 73 | no | 4 | **3,003** | — | — | — | 3,109 | 3,108 | **20,663** | exit 0, Node's teardown (its `exit` event at 3,109) | **0 of 64** | 0 | **none** |
| A64nL | (A) | 24 loops, 94 | no | 4 | — | 4,310 | 4,345 | 4,346 | 4,453 | **4,453** | **4,631** | will-quit SIGKILL (155 ms) | **64 of 64** | 0 | quit |
| P64L | parent | 24 loops, 120 | yes | 1,505 | **3,002** | — | — | — | 3,109 | 3,106 | **43,494** | exit 0, Node's teardown (its `exit` event at 3,109) | **0 of 64** | 0 | **none** |
| A64L | (A) | 24 loops, 174 | yes | 1,507 | — | 7,356 | 7,389 | 7,390 | 7,496 | **7,495** | **7,704** | will-quit SIGKILL (157 ms) | **64 of 64** | 0 | quit |
| PS | parent | about 95 | (Settings in front) | **none** | 3,006 (the FIRST pass) | 3,262 | 3,293 | 3,294 | 3,509 | **3,508** | 3,678 | will-quit SIGKILL | 8 of 8 | 0 | quit |
| PX | parent | about 95 | yes, crash armed | 1,507 | 3,003 | — | — | — | 3,108 | 3,108 | 3,130 | **exit 139 at `quit`** | 0 of 64 | 0 | none |

Every relaunch kept every row with its id (166, 150 or 110 rows), every shell live on the scratch server, three of three
`localStorage` keys, the Settings bounds, and posted no unclean-exit notice; the first-quit flag was written in every
toast run and **not** in PS (the press never reached the renderer). In PX the sentinel existed at `will-quit` and was
gone 1 ms later at `quit`; the relaunch found `pending/p362s-planted.dmp` in the inventory and still wrote no
`boot.unclean_exit`. The cut runs' copies: at the cut in P64 every body had been written and renamed by 2,947 ms but only
15 completion records landed before the process ended, so 49 sessions keep the copy from before (a body without its
record is never read by `resolveSnapshot`); in P48 all 48 writes had begun, 21 bodies landed during Node's teardown
with no record and 27 were left as `.part`; in P64nL and P64L the capture had not finished, so no write began.
The first-quit toast is one-time per profile: his own quits have no toast, so P64n, P64nL and A64n(L) are his everyday
quit, and P64, P64L, A64 and A64L his first one.

The third batch (b3) ran while the other phases held the machine at a load average of 169 at its start and much less
by its end, so its rows are read beside each other and not beside b1's:

| Arm | Build | Toast | Renderer's quit | Fallback's quit | Pass ends | Generation | Dispose | `will-quit` | Window closed | Process gone | How it ended | Copies kept | `.part` left | Quit generation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P48b | parent | yes | 1,506 | **3,001** | — | — | — | 3,227 | 3,227 | 3,406 | exit 0, Node's teardown | **0 of 48** (44 bodies, no record) | 24 | **none** |
| A48 | (A) | yes | 1,506 | — | 5,189 | 5,227 | 5,228 | 5,334 | **5,334** | 5,514 | will-quit SIGKILL | **48 of 48** | 0 | quit |
| QWp | parent | yes, Settings… clicked 300 ms after the renderer's quit | 1,507 | **3,001** | — | — | — | 3,242 | 3,236 | 3,325 | exit 0, Node's teardown | **3 of 64** | 61 | **none** |
| P64n2 | parent | no | 4 | — | 1,730 | 1,765 | 1,766 | 1,872 | 1,872 | 2,040 | will-quit SIGKILL | 64 of 64 | 0 | quit |
| A64n2 | (A) | no | 4 | — | 1,650 | 1,683 | 1,684 | 1,790 | 1,789 | 1,958 | will-quit SIGKILL | 64 of 64 | 0 | quit |

**QW at the parent:** the Settings… row clicked during the saving opened a Settings window into the quitting app
(windows 1 → 2, Settings 0 → 1, 400 ms after the click), which the fallback's quit then closed with the rest; the
`activate` emitted beside it opened nothing (the main window was still up). That is D9's defect, measured.

### 2.2 The trade, as costs a person meets (for §14 Q1)

| | Window up after ⌘Q (quiet, first / everyday) | Window up (busy, first / everyday) | Tortie still running after its window closed | What is saved on a long quit | A relaunch while it quits |
| --- | --- | --- | --- | --- | --- |
| Today (the parent) | 3.1 s / 1.9 to 2.1 s | 3.1 to 3.2 s / 3.1 s | 0.1 to 0.2 s quiet; **17.6 s and 40.4 s busy** | first quit, quiet: 15 of 64 copies, no backup of the session list; busy: 0 of 64 (and 0 of 48, 3 of 64), no backup; everyday quit, quiet: everything | during the busy linger nothing answers, its JavaScript gone |
| (A), the default | 3.5 s / 1.8 to 2.3 s | **5.3 s (48 shells) and 7.5 s / 4.5 s** | 0.2 s, every run | 64 of 64 (48 of 48) and the backup, every run | the window is up and refuses what is clicked; a second launch is dropped, as during any quit today |
| (B), hidden at once | **0.03 s** after the renderer's quit (on the first quit after its 1.5 s message) | the same | **2.1 s and 3.6 s** | 64 of 64 and the backup | **a Dock click shows nothing; opening a file or folder with Tortie brings the closing window back**, which then closes; a second launch is dropped |
| (C), F1 alone | 3.1 s / as today | 3.1 s / 3.1 s | 0.3 s | **0 of 64 on the quiet first quit** (the parent kept 15), no backup | as today, without the busy linger |

Read with the load beside each number: the busy rows ran at load averages from 73 to 174, made by the other phases'
workflows and the arm's own loops together, so a pair is not run at one load; the ranges are every run of that kind.
(B)'s and (C)'s rows are §2.3's.

### 2.3 (B) and (C)

| Arm | Build | Toast | Renderer's quit | Windows hidden (read 30 to 50 ms after the first pass) | Pass ends | Generation | Dispose | `will-quit` | Process gone | With no window | A Dock click 300 ms into it (`activate`) | Opening a folder with Tortie 600 ms into it (`open-file`) | Copies kept | Quit generation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B64n | (B) | no | 4 | **33** | 1,808 | 1,844 | 1,845 | 1,952 | 2,121 | **2.09 s** | **0 of 1 windows visible before and after: nothing shown** | **the closing window shown again (1 of 1 visible)** | 64 of 64 | quit |
| B64 | (B) | yes | 1,512 | **1,562** | 4,750 | 4,885 | 4,893 | 5,010 | 5,192 | **3.63 s** | nothing shown | the closing window shown again | 64 of 64 | quit |

Both ran in b3, under the other phases' load. b2's two (B) runs saved 64 of 64 too (process gone at 2,484 and 3,878
ms) but read the hide by the window's `hide` event, which never fires for a harness window, so their hidden seconds
are not counted. In both b3 runs the `second-instance` listener was registered (a probe launch is not an isolated one),
and its quitting return (`src/main/index.ts:265`) drops a second launch while any quit runs, at every build. (B) as
prototyped also needs `showAppWindow()` to refuse a hidden window while quitting, or an `open-file` brings back a
window that refuses everything and closes a moment later; a (B) round would add that, and its answer to a relaunch.

| Arm | Build | Load | Toast | Renderer's quit | Fallback's quit | Pass ends | `will-quit` | Process gone | How it ended | Copies kept | `.part` | Quit generation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C64 | (C) | quiet | yes | 1,507 | 3,001 | — (cut; the bodies began at 3,148, after `will-quit`) | 3,110 | 3,417 | will-quit SIGKILL (wait 276 ms) | **0 of 64** | 64 | **none** |

So (C) closes the window exactly when the parent does and ends the process without Node's teardown, but every copy in
flight dies with it: on the first quit at his scale it kept none where the parent kept 15 (the drop round measured the
parent at 64, 12 and 22 of 64 and F1 at 11 of 64 on the same quit, so the tail is noisy at both and worse under F1).

### 2.4 The spec step's commands, exit codes and numbers

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `git clone --shared --no-checkout` the worktree, `checkout --detach 795f5a14`, `cp -Rc node_modules build/vendor` | 0 | < 1 min | `build/vendor/specstory/bin/specstory --version` 2.10.0; `addon-webgl.mjs` sha256 `e4ab05d2ee9d7a27…` |
| `npm run build` in the parent (history block) | 0 | 89 s | `gate:electron` 185 of 584 against a floor of 185; `contract-inventory` OK |
| `cp -Rc parent proto-{a,b,c}`, the prototype edits, `npm run build` in each (in parallel, history block) | 0, 0, 0 | 63 s each | each bundle carries its change (the guard twice in (A) and (B)'s `out/main/index.js`; (B)'s second `w.hide();`; (C)'s predicate) |
| `git apply --check --include='build/p357/*'` F1's patch at `795f5a14` | 0 | | the CM hunks apply; `git apply --check` of the whole patch fails on `src/main/index.ts`, the quit test, the gate, `CLAUDE.md` and `build/verification-checks.mjs` |
| `lockrun.sh v1 T4` (the driver's own check, 4 shells) | 0 | 144 s | the driver read every field |
| `lockrun.sh b1` (P64, A64, P64n, A64n, C64) | 0 | 261 s | §2.1, §2.3 |
| `lockrun.sh b2` (B64n, B64, P48, PS, PX, P64nL, A64nL, P64L, A64L) | 0 | 472 s | §2.1; its (B) rows used a preload that read the hide by an event that never fires in a harness window, so (B) was run again in b3 with the visibility read |
| `lockrun.sh b3` (B64n, B64, P48b, A48, QWp, P64n2, A64n2) | 0 | 226 s | §2.1, §2.3 |
| the final Electron count (CLAUDE.md's command, outside the block, once) | 0 | | none of this phase's: his Tortie (pid 692) and its crash handler (2727), and Slack's, Chrome's, Granola's and Cursor's crash handlers; no `p362` socket under `/private/tmp/tmux-501/`; no driver, loop or server of this step's running; all three lock slots free; his reports folder 33 names, as before every batch |

Each batch printed `[electron-run] <arm>-app: ended 1 process the teardown found still running.` after every hard
exit and every teardown exit at both builds: the helper's own teardown ending a child the SIGKILLed or exiting main
left behind, as it does for 357.1's runs. Lock slots were taken four times (v1, b1, b2, b3) and released by the trap;
disk 52 GiB free throughout.

## 3. The tree at this head: the paths each item touches

**Items 1 to 3 (the fallback, the quit's end, the target).** `src/main/menu.ts` `requestQuit()` `:240-250` and its
imports (`:92-97`; `./lifecycle` is new there). `src/main/index.ts` `before-quit` `:825-844`. Unchanged and read:
`src/main/tray/index.ts:166-170` (calls `requestQuit()`), `src/renderer/app/quit.ts` (the toast, untouched),
`src/main/lifecycle.ts` (its export surface is pinned by `src/main/__tests__/quit-admission.test.ts`), the disposer.

**Item 4 (the sentinel).** `src/main/log/sentinel.ts` (`RunSentinel`, `readRunSentinel`, a new pure marker),
`src/main/log/index.ts` (`:360`'s listener and the boot's `:316-341`), `build/quit-smoke.mjs` (the teardown leg's
sentinel verdict `:153` and its fixtures `:167`, `:204`).

**c1, c4.** `src/main/quit/storage-landing.ts` (`:59-63`, `:185-233`) and its test.

**c3.** `src/main/settings/window.ts` `openSettingsWindow()` `:47-102`.

**The gate.** `build/conformance-stopped-list.mjs` (`RULES` `:246`, `FILES`, `ruleS12` `:2007-2148`, `RULE_FNS`
`:2183`, the ablations below it).

**The probe.** `build/p362/` (new), `package.json`'s scripts.

**Words that queue this phase today and become untrue when it lands** (`grep -rn "Phase 362"` outside the backlog and
the specs): `src/main/index.ts:887`, `src/main/__tests__/p3571-quit-hardexit.test.ts:598`,
`build/conformance-stopped-list.mjs:166`, `build/p357/probe-p357.mjs:63`, `build/p357/CHECKLIST.md:39`,
`build/verification-checks.mjs:1088` and `:1675`, `CLAUDE.md:324`. Each has an owner in §9.1.

## 4. The design, item by item (real paths; the builder named on each)

### 4.1 The fallback, the target and the quit's end (builder `quit`)

`src/main/menu.ts`: import `appLifecycleState` from `./lifecycle`. `requestQuit()` becomes, in this order: `const win =
menuActionTarget();` (D3); `if (win === null) { app.quit(); return; }`; `sendEvent(win.webContents,
EVT_QUIT_REQUESTED);`; `setTimeout(() => { if (appLifecycleState() !== 'quitting') app.quit(); }, 3_000);` (D1). Its
comment says what the guard keeps (a renderer that never answers still quits at 3 s) and what it gives up (a second ⌘Q
no longer cuts a quit that is saving), and cites this file.

`src/main/index.ts`: `before-quit`'s async body as D2 (`MainDisposeOutcome` is already imported). The warn line is
`getLog('quit').warn('the ordered teardown threw before it finished; quitting anyway', { name })` with the error's
`name` only (no message, no stack: the crash handler's rule). The `will-quit` handler, `showAppWindow()` and every
other line in the file stay byte for byte; the comment block above `will-quit` loses the sentence that queues this
phase ("…which ends as today, through Node's teardown, and is queued as Phase 362") and says instead that the fallback
no longer reaches `will-quit` once a quit has begun.

`src/main/settings/window.ts`: D9. `import { appLifecycleState } from '../lifecycle';` and, after the live-window
branch, `if (appLifecycleState() === 'quitting') return;` before `getSettingsWindowBounds()`.

`src/main/quit/storage-landing.ts`: D10 only. QUIET_MS, SETTLE_MS and POLL_MS keep their values; the module's header
gains one sentence on `moved`.

### 4.2 The sentinel (builder `sentinel`)

`src/main/log/sentinel.ts`: D4's field, its parse, and `markRunSentinelAtQuit(dir, dumpNames, nowIso): boolean`
(reads the current sentinel; none or unreadable → false and writes nothing; else rewrites it with `quitAt: nowIso`
and `dumpNames` replaced, and answers true). Pure, no electron import, as the file's header requires. Its header
gains the paragraph that says what a marked sentinel means.

`src/main/log/index.ts`: `markLogRunSentinelAtQuit()` (never throws, like `clearLogRunSentinel`) reads
`scanCrashDumps(app.getPath('crashDumps'))` and calls the marker; `:360` registers it in place of the clear. The boot:
after `fresh` is computed, `const teardownClean = prev.quitAt !== undefined && fresh.length === 0;` and the record and
notice run only when `!teardownClean`; the record's `prev` gains `quitAt` when present. `clearLogRunSentinel()`'s
comment names its two callers and says why the log's own listener no longer calls it.

`build/quit-smoke.mjs`: the teardown verdict's sentinel clause (`:153`) reads the file's contents after the run, not
only its presence: a sentinel left with `quitAt` (and so with an inventory) is the pass, an unmarked one left behind is
a failure ("the run sentinel was left unmarked, so the next launch would say Tortie quit unexpectedly"), and the held
verdict still requires none left. The facts gain `sentinelMarked`; the fixtures gain the marked pass, the unmarked
failure and the held leg's "marked but left" failure. Its `--self-test` count moves from 35 to 38.

### 4.3 The gate (builder `gate`)

`build/conformance-stopped-list.mjs`: `RULES` gains S14 and S15; S12 widens; `FILES` gains `menu`, `settingsWindow`,
`logIndex`, `logSentinel` and `storageLanding` (it already names `index`, `capabilities`, `updater`); its header
documents each new clause beside the old ones. Every clause has at least one ablation red on it alone, and the
existing 94 stay red on exactly their own rules.

| Rule | Holds | Its ablations (each red on this rule alone) |
| --- | --- | --- |
| S12 (widened, c1) | `storage-landing.ts` declares `QUIET_MS`, `SETTLE_MS` and `POLL_MS` as top-level `export const` numeric literals with `QUIET_MS >= 100`, `POLL_MS >= 1`, `SETTLE_MS > POLL_MS`; the watch's settled test names `QUIET_MS` and `SETTLE_MS` each once, joined by `&&` with the whole-tail read; nothing shadows them | `QUIET_MS = 0`; `SETTLE_MS = 0`; `SETTLE_MS = POLL_MS`; `POLL_MS = 0`; the `QUIET_MS` clause dropped from the settled test; a local `const QUIET_MS = 0` inside `watch` |
| S12 (widened, c2) | `storageWritten(`'s first argument is exactly `session.defaultSession.getStoragePath()`; no `app.exit(`, `process.exit(`, `exit` destructured from `app` or `process`, or `process.reallyExit(` inside any `will-quit` handler under `src/main`, nor inside a function handed to `setTimeout`/`setInterval` in `disposeMainCapabilities` or `afterMs` | the first argument `null`; `app.getPath('userData')`; `process.exit(0)` before the kill in the finally; `app.exit(0)` in the wedge guard's timer; `const { exit } = process; exit(0)` in the log's `will-quit` listener |
| S14 (new, items 1, 3, 5, D2, D9) | `requestQuit()` in `src/main/menu.ts`: its window is `menuActionTarget()` (no `getFocusedWindow`/`getAllWindows` in its body), the null branch is `app.quit(); return;`, it holds exactly one `setTimeout`, whose function's body is exactly one `if` with no `else`, test `appLifecycleState() !== 'quitting'` and consequent `app.quit();`, delay `3_000`; `appLifecycleState` is imported from `./lifecycle` and shadowed by nothing; no other function handed to `setTimeout` in `menu.ts` calls `app.quit`. `before-quit` in `src/main/index.ts`: its async body awaits `disposeCapabilities()` inside a `try` whose `catch` neither returns nor throws, and `app.quit();` is a statement after that `try`, preceded only by the `'killed'` return. `showAppWindow()` and `openSettingsWindow()` each return before `new BrowserWindow(`/`createWindow(` when no live window exists and `appLifecycleState() === 'quitting'` | the bare timer restored (`() => app.quit()`); the test inverted (`=== 'quitting'`); a third conjunct or an `||`; the delay raised; `getFocusedWindow() ??` put back as the target; a local `appLifecycleState` that answers `'running'`; a second fallback timer calling `app.quit` elsewhere in `menu.ts`; the `try` around the disposer removed; `app.quit()` moved into the `try`; the catch returning; Settings' quitting return removed; `showAppWindow()`'s quitting return removed |
| S15 (new, item 4) | `src/main/log/index.ts`'s one `will-quit` listener calls the marker and not `clearLogRunSentinel`; `clearLogRunSentinel(` has exactly two production callers outside `src/main/log/`, the `will-quit` hard exit's `finally` in `src/main/index.ts` and Phase 36's branch in `src/main/capabilities.ts`, each the statement right before its `process.kill(process.pid, 'SIGKILL')`; the marker passes a dump inventory read by `scanCrashDumps(` in the same function; the boot skips the record and the notice exactly when the previous sentinel's `quitAt` is set AND no dump is new (both conjuncts, read as one condition); `markRunSentinelAtQuit` writes nothing when no sentinel exists | the listener clears again; a third `clearLogRunSentinel()` caller (in `will-quit`'s try, before the wait); the marker handed the boot's inventory (a constant); the skip on `quitAt` alone (a teardown crash unnoticed); the skip on no new dump alone (an unmarked sentinel with no dump, a run that died mid-session, would go quiet where today's notice speaks); the marker creating a sentinel where none was |

CLAUDE.md's `conformance:stoppedlist` row gains the clauses and files (the integrator's).

### 4.4 The probe (builder `probe`)

`build/p362/probe-p362.mjs`, `build/p362/fixtures/**` and `build/p362/CHECKLIST.md`, §8. The builder does not run
the app (the verifiers do); it runs `--grader-self-test` and `--preflight`.

## 5. Words

No new string a person reads. One CHANGELOG item under `## Unreleased`, `### Fixed`, below 357.1's, in his style, the
commit link added by the follow-up docs commit:

`- Quitting Tortie with many busy sessions now finishes saving each session's history before it closes, instead of
stopping after three seconds, and if Tortie ever crashes while it quits, the next launch says so`

(If he prefers the crash notice unmentioned, §14 Q5.) 357.1's item stays as it is: with 362 landed, its claim ("no
longer crashes when its session list went bad") holds on the long quit too, which the entry says a release cut before
362 would have to qualify.

## 6. What moves on purpose

Nothing in the contract: `docs/audits/contract-baseline.txt` must read byte for byte (`node build/contract-inventory.mjs
--check`), and a diff is a finding. `HELPER_USER_FLOOR` in `build/assert-electron-teardown.mjs` rises from 185 to 186 for
`build/p362/probe-p362.mjs` (obligation 1). `build/quit-smoke.mjs`'s self-test count moves from 35 to 38 (§4.2).
`conformance:stoppedlist` moves from 13 rules and 94 ablations to 15 rules and the added ablations of §4.3 (the
builder reports the count). The run sentinel gains its optional `quitAt`; a sentinel written by 357.1 reads exactly as
before (no `quitAt`, the unclean branch as today).

## 7. The gates

### 7.1 `conformance:stoppedlist` (`build/conformance-stopped-list.mjs`, builder `gate`), widened

§4.3. Pure node over the TypeScript parser, spawns only the pinned tsx it already spawns for S8. The control copy stays
green on every rule.

### 7.2 The path-triggered gates the changed files trigger (CLAUDE.md, read at this head)

| Changed | Gate |
| --- | --- |
| `src/main/index.ts`'s `before-quit`, `src/main/quit/storage-landing.ts` | `conformance:stoppedlist` (S12, S14) |
| `src/main/log/sentinel.ts`, `src/main/log/index.ts` | `conformance:stoppedlist` (S15); the log's own vitest files |
| `src/main/menu.ts` | `conformance:stoppedlist` (S14); the menu glyph and accelerator gates run inside `npm run build` (no row moves, so both must read as before) |
| `src/main/settings/window.ts` | none named; the battery |
| `build/quit-smoke.mjs` | `node build/quit-smoke.mjs --self-test`, then `smoke:quit` and `smoke:quitdoors` under a lock (§11) |
| `src/main/capabilities.ts` | **not touched**, so `conformance:credentials`, `conformance:pocket`, `conformance:pocket:hostile` and `conformance:push` are not triggered; the integrator confirms with `git diff --stat 795f5a14 -- src/main/capabilities.ts` (empty) and runs them anyway if it is not |
| `src/main/sessions/core.ts` | **not touched**; none of `conformance:endtree`/`farattach`/`machines`/`remoteclose`/`samefolder` is triggered |
| `src/shared/**`, a `GMUX_*` name, a smoke mode | **not touched**; `gate:contract` must still match |
| `build/p362/probe-p362.mjs` | `gate:electron` (the floor), `gate:background`, `gate:checks` (its classification), all inside `npm run build` |

## 8. The app run: `probe:p362` (builder `probe`)

`package.json`: `"probe:p362": "node build/harness-socket.mjs --fresh gmux-p362 'node build/p362/probe-p362.mjs'"`.
ONE Electron at a time, the PARENT first in every pair (`P362_PARENT_CHECKOUT`, a built `795f5a14`, or exit 2), each arm
on its own scratch profile, HOME and ZDOTDIR with `HISTFILE=/dev/null` and `SHELL=/bin/sh`, the socket the harness hands
it (`gmux-p362…`), the Tailscale and DNS stand-ins as `probe:p357` uses them, every probed registry row hidden and
`agents:list` read back. The app launch of an arm passes `tmuxSocket: null` so its scratch server survives the quit for
the relaunch, and the relaunch names the socket, so its teardown ends that server and the census reads around it; the
probe's own `finally` ends the server too. It never calls `app.relaunch()`, never holds main's inspector across a quit,
and never presses anything through macOS. The world, the recorder, the trace and the reads are §2's (the spec step's
driver is the reference, at `/private/var/tmp/tortie-wt/scratch/p362/spec/parent/build/p362spec/measure.mjs`; port it,
do not import it), plus the tracker (D11). Three verdicts as `probe:p357`: each arm names `reads`, `needs` and
`clauses`; an absent field or an unmet need is UNREADABLE (exit 2), only a clause is FAIL; every reading from raw text
(events, the fault trace, app.log, the tracker's lines, the snapshot folder's names, the shim's line) is derived by ONE
pure function that `--grader-self-test` drives over recorded raw fixtures (seed them from
`/private/var/tmp/tortie-wt/scratch/p362/spec/fixtures-raw/`, which holds the spec step's P64, A64, C64, P64n, PS, PX,
P64L and A64L events, traces and logs) as well as over recorded readings, every clause shown red alone and every need
shown unreadable alone. `--grader-self-test` and `--preflight` start nothing. Three lessons from the spec step's
driver, each a reading that was wrong once: every arm records `os.loadavg()` at its press, because the other phases
moved the load from 9 to 174 within minutes and a reading without its load cannot be compared; the windows' visibility
is read (`isVisible()` on `before-quit`'s first pass and on the next turn), never heard, because a harness window's
`hide` event never fired; and his reports folder is read through `userInfo().homedir`, never `homedir()`, because the
probe runs with a scratch `HOME`. A `--require` preload cannot `require('electron')` on its first turn (it throws:
"Cannot find module 'electron'"), so everything that needs the app's own objects is installed from `setImmediate`, as
`probe:p357`'s menu preload does; the `better-sqlite3` tracker is installed at once, through `Module._load`, before the
app's bundle first requires it. QY's tray wrap that does not take reads UNREADABLE, never PASS.

| Arm | Builds | What it drives | PASS at the parent | PASS at HEAD |
| --- | --- | --- | --- | --- |
| M64 | both | his shape + 64 shells × 12,000 lines, the first quit (toast), the menu's Quit row; the tracker on | the fallback's quit before the dispose (`timerFirst`), fewer than 64 copies or no quit generation (the cut, counted), the tracker shows the session list open and never held at `quit` | no fallback quit; the pass's line (64 written) before `backup.after-record` before the dispose before `will-quit`; 64 of 64 copies, 0 `.part`, a generation with reason `quit`; ended by the will-quit SIGKILL with its storage line; the tracker shows no `quit` event and no `close()` of the session list; the relaunch keeps every row and id, every shell live, 3 of 3 keys, the flag and the bounds, with no notice. The window's close time printed beside the parent's |
| M64n | both | the same, no toast (his everyday quit) | printed (cut or not, with its copies) | as M64 |
| M64L | both | the same with 24 loops of its own, first quit | printed, with the process's linger after its window | as M64, within its own bounds; the linger (process gone − window closed) under 1 s |
| M48 | both | his shape + 48 shells, first quit | printed | as M64 for 48 |
| QS | both | M64's world at 8 shells, Settings left open (the newest window, so it stands in for Settings in front) | no renderer quit, the fallback's quit at 3,000 ± 100 is the first pass, the flag not written | the renderer's quit at the main window (the flag written, the toast's 1.5 s), no fallback quit, the quit's end as M64 |
| QR | both | 8 shells; the main renderer paused through CDP `Debugger.pause` before the press and resumed 4 s after | the fallback's quit at 3,000 ± 100 is the FIRST pass and the quit ends | the same: a renderer that never answers still quits at 3 s |
| QT | both | M64's world; the Quit row pressed at 0 and again at +1,000 ms | the first fallback cuts at 3,000 ± 100 | no fallback quit at all, one disposer, the quit's end as M64 |
| QY | both | 8 shells; the status item's Quit, pressed in main through its context menu (the preload wraps `Tray.prototype.setContextMenu` to keep the menu) | as the menu's Quit | as the menu's Quit |
| QW | both | M64's world; 300 ms after the renderer's quit the preload clicks the Settings… row and emits `activate` and `open-file` (a scratch folder) | printed: whether a Settings window opened into the quitting app | no new window of either kind while the quit runs; the main window's count unchanged |
| QD | both | `GMUX_SMOKE=quit-teardown` (nothing held, so Node's teardown runs), `GMUX_LOG_FILE=1`, the preload ending the process with `exit 139` at `quit` after writing a stand-in dump into `Crashpad/pending/`; then a probe relaunch on that profile | the relaunch writes no `boot.unclean_exit` and posts no notice although the dump is new (the defect, as §0.1 item 5) | the relaunch writes one `boot.unclean_exit` naming one new dump and `quitAt`, and posts the `unclean-exit` notice once |
| QD0 | both | QD without the crash (a clean teardown) | no record, no notice | no record, no notice (the marked sentinel with no new dump reads clean); the file was left marked |
| TX | both | the tracker's reading inside M64, M64L and QT (no launch of its own) | the session list connection open at `quit` and at the process's `exit`, never closed by Tortie | the connection held by dispose (no `close()` reached `better-sqlite3`), open at `will-quit`, and no `quit` or `exit` event before the SIGKILL |
| R2, R4, R5, R6 | both | 357.1's quit table at 3 shells: the bridge quit, the last window closed, Restart on the stopped notice (the harness-only manifest fault seam), a quit with nothing opened | as 357.1 measured: the will-quit SIGKILL with the storage line | the same, the window's close time within 100 ms of the parent's; nothing a person keeps lost |
| CM (opt-in) | both | F1's CM-parent and CM-head, ported (`menuQuitReading`, the menu preload, the needs and graders), with `P3571_BS3` naming a checking build | SIGSEGV in `pcache1EnforceMaxPage`, exit 139 | no crash: the dispose before `will-quit` (CM_RACE_NEED inverted for HEAD: the race must NOT happen), the will-quit SIGKILL, the relaunch keeps everything; without `P3571_BS3` both arms are UNREADABLE, and CM is not in the default `P362_ARMS` |
| RUN | — | the preflights, the hidden agents, the census, every pid ended, the scratch server gone and the `.run` marker not counted, his history unmoved, no macOS report since the run began, no Electron of the run's left | | |

Defaults: `P362_ARMS=M64,M64n,M64L,M48,QS,QR,QT,QY,QW,QD,QD0,R2,R4,R5,R6` (TX rides in M64, M64L and QT); `P362_KEEP=1`
keeps every run folder; `P362_LOOPS` (default 24) sizes M64L's loops, each ending itself after 15 s and ended by pid in
a `finally` (`gate:background`). The relaunch arms that need the scratch server alive read `tmuxSocket: null` on the
app launch only (above). Wall time: not measured as a whole; the spec step's arms took 25 to 75 s each (M64L's parent
the longest, its linger), so about 25 to 35 minutes for the default set at both builds.

`build/p362/CHECKLIST.md`: two plain lines for the operator's seat: quit with many busy sessions and the window stays
until Tortie has saved them, then closes; if Tortie ever crashes while it quits, the next launch says so once.

## 9. Builders, disjoint files

### 9.1 The table (every file in exactly one list; a builder that must edit a file not in its list stops and names it)

| Builder | Files it owns (and their tests) |
| --- | --- |
| `quit` | `src/main/menu.ts`, `src/main/index.ts` (with its `:887` sentence that queues this phase), `src/main/settings/window.ts`, `src/main/quit/storage-landing.ts`; tests `src/main/__tests__/p362-quit-fallback.test.ts` (new: D1, D2, D3 and `showAppWindow()`'s refusal through `open-file` and `second-instance`, with electron mocked in the way `p3571-quit-hardexit.test.ts` mocks it), `src/main/settings/__tests__/p362-settings-quitting.test.ts` (new: D9), `src/main/quit/__tests__/storage-landing.test.ts` (extend: D7's literal floors and D10's three `moved` cases), and `src/main/__tests__/p3571-quit-hardexit.test.ts` (its `:598` comment, which says the long quit "ends as today (Phase 362)", and any case D2 makes untrue, named) |
| `sentinel` | `src/main/log/sentinel.ts`, `src/main/log/index.ts`, `build/quit-smoke.mjs`; tests `src/main/log/__tests__/sentinel.test.ts` (extend), `src/main/log/__tests__/p362-teardown-sentinel.test.ts` (new: the boot's three answers over planted sentinels and dumps, the listener's mark over a real scratch directory) |
| `gate` | `build/conformance-stopped-list.mjs` (its own run is its test; its S12 header's "queued as Phase 362" at `:166` rewritten with the rest) |
| `probe` | `build/p362/probe-p362.mjs`, `build/p362/fixtures/**`, `build/p362/CHECKLIST.md`; and two words-only edits in files no other builder touches: `build/p357/probe-p357.mjs`'s header paragraph `:58-65` ("THE MENU'S 3 S FALLBACK QUIT IS TODAY'S … That path is Phase 362's") and `build/p357/CHECKLIST.md:39`, each saying what is true after this phase (the fallback no longer cuts a quit that has begun; the long-quit and crash-state menu arms live in `probe:p362`) |
| integrator | `CLAUDE.md` (the `conformance:stoppedlist` row `:324`, the `probe:p357` row `:398`, a new `probe:p362` row), `CHANGELOG.md`, `package.json` (the `probe:p362` script), `build/verification-checks.mjs` (classify `probe:p362`; the stoppedlist, quit-smoke and `probe:p357` paragraphs, whose `:1088` and `:1675` say the long quit is Phase 362's), `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 185 → 186), `docs/audits/contract-baseline.txt` (only if a contract line moves, which none should), this file's §As built, and any file two builders both need |

### 9.2 The seams, stated exactly so the four build at once

- `quit` changes no export. `requestQuit()` keeps its name and signature; `MainDisposeOutcome` is unchanged.
- `sentinel` exports from `src/main/log/sentinel.ts`: `markRunSentinelAtQuit(dir: string, dumpNames: string[],
  nowIso: string): boolean` and `RunSentinel.quitAt?: string`; from `src/main/log/index.ts`: nothing new beside the
  private `markLogRunSentinelAtQuit()` (the gate reads it by name: `markLogRunSentinelAtQuit`).
- `gate` reads the names above: `requestQuit`, `menuActionTarget`, `appLifecycleState`, `disposeCapabilities`,
  `showAppWindow`, `openSettingsWindow`, `markLogRunSentinelAtQuit`, `markRunSentinelAtQuit`, `clearLogRunSentinel`,
  `scanCrashDumps`, `quitAt`, `QUIET_MS`, `SETTLE_MS`, `POLL_MS`, `storageWritten`. It builds against §4.1 and §4.2 as
  written; where a builder's shape differs, the integrator reconciles.
- `probe` reads the shipped behaviour only, and the `sentinel` builder's `quitAt` field and the log's
  `boot.unclean_exit` record as D4 states them.
- `src/shared/*` is untouched.

### 9.3 The builders' briefs

- **`quit`**: §4.1. The fallback test uses vitest's fake timers and the real `src/main/lifecycle.ts`, fresh per case
  (the transition is one way): the quit begun → advance 3,000 ms → zero fallback `app.quit()` calls; not begun → one;
  2,999 ms → none yet; the target is the main window when Settings is focused, when nothing is focused, and when the
  main window is hidden; with only Settings open, `app.quit()` at once and no timer; and a copy of the module with the
  bare timer put back (read the source, replace the arrow, import the copy) reads red. D2's case drives `before-quit`
  through the mocked `app` with a disposer that rejects: `app.quit()` once; with `'killed'`: none. D9's case
  constructs nothing while quitting with no live window and focuses a live one. D10's cases run over real files as the
  module's test already does: a log absent at the first read and written mid-wait answers `moved: true` on `settled`
  and on `bound`, and the bound's own answer carries what the watch saw.
- **`sentinel`**: §4.2. Every boot case runs `runLogBootSequence` with electron mocked over a scratch logs and crash
  folder: a marked sentinel and no new dump → no record, no notice, a fresh sentinel written; marked and one new dump
  → one record (with `quitAt` and `newCount: 1`) and one notice; unmarked and no new dump → today's record and notice
  (the old behaviour kept); the listener marks an existing sentinel with the inventory of that moment and creates none.
  The smoke's self-test covers §4.2's fixtures.
- **`gate`**: §4.3 and §7.1. It runs the gate and reports the rule and ablation counts.
- **`probe`**: §8. It writes the tracker and the recorder as scratch preloads the probe generates, never files under
  `src/`; the stand-in dump is 4,096 zero bytes named `p362-standin.dmp`; the busy loops follow §2's shape. It runs
  `--grader-self-test` and `--preflight` under a lock slot and returns their numbers.

Every builder runs `npm run typecheck` and `npm test` (under the history block; the four `/bin/ps` tests named as they
fail) before it returns, and returns every file it changed with its line counts.

## 10. The proof, run rather than read (Tier 3)

### 10.1 Lens A: the behaviour (Method 1 parent, real data)

The gates once (§11). Then `probe:p362` whole, parent first, under a lock slot, `P362_KEEP=1`. Re-derive, by the
verifier's own code over the kept run folders: the copies kept and the `.part` files from the snapshot folder's names,
the quit generation from the backup index, the order of the pass, the generation, the dispose and `will-quit` from the
fault trace and the events, and the tracker's verdict, at both builds. **The independent step**: the verifier runs
the long quit at a scale the spec step did not (his shape with 80 shells, or 64 shells under 48 loops) at both builds
and shows HEAD saving everything within the disposer's own bounds while the parent cuts; and reads `before-quit`'s
first pass at HEAD with a disposer made to throw by a scratch preload (D2), which must still quit.

### 10.2 Lens B: the attack (Method 2)

Read §3, then try at HEAD to make a begun quit end before its saving, or a quit hang: ⌘Q three times inside the
saving; the status item's Quit and the menu's in one second; Settings in front with the main window minimized and with
it hidden; the main window closed (only Settings open: an immediate quit is the pass); a renderer paused for 10 s; a
disposer held past its 8 s snapshot bound by 96 loops (the pass's race ends at 8 s and the quit still ends by the
hard exit, so the bound, not the fallback, ends the saving); `activate`, `open-file` and Settings… during the saving
and during the will-quit wait; a teardown crash in each of the two teardown quits the probe can reach (nothing held;
and the parent's cut, to show the parent stays silent); a clean teardown (no false notice); and a crash dump of a
renderer from earlier in the run followed by a clean teardown quit (no false notice: the mark's inventory is the one
at `will-quit`). For each: how it ended, the copies, the generation, the window's close time, the relaunch, the notice.
**The independent step**: a hostile copy of the gate's inputs (at least six shapes of your own through `--root`: a
fallback guard in a helper the timer calls, a guard on a different lifecycle reader, a second `setTimeout` in
`requestQuit` that quits unguarded, a `before-quit` whose catch returns, a log listener that marks then clears, a boot
that ignores `quitAt`), each red, and the CM arms if the verifier builds its own checking better-sqlite3 from research
143 §2.3's description (the plant: the LRU tail page out of the hash with its `pCache` zeroed), which is the strongest
method available and the one the spec step could not run.

### 10.3 What is driven in vitest only, and why

The update-staged quit (D12: `initUpdater()` returns in an unpackaged build): `p3571-quit-hardexit.test.ts`'s staged
case stays green, and the sentinel builder's test adds the staged quit's mark read clean at the next boot. A disk that
hangs inside the quit generation: not driven (no seam; the parent's teardown would hang on the same disk).

### 10.4 No regression (both builds, the window's close time beside the parent's)

| Row | What | Parent (357.1 as landed) | HEAD must read |
| --- | --- | --- | --- |
| R1 | the menu's Quit, first quit (toast) | M64's world cut at 3 s; small world the will-quit SIGKILL | small world: the same end, close time within 100 ms; M64: everything saved, close time printed |
| R1b | the menu's Quit, no toast | the will-quit SIGKILL | the same, within 100 ms |
| R2 | the bridge quit | the will-quit SIGKILL | the same |
| R3 | the long menu quit (M64, M64L) | the cut (§2.1) | everything saved, no cut, the process gone within 1 s of its window |
| R4 | the last window closed | the will-quit SIGKILL | the same |
| R5 | Restart on the stopped notice | the hard exit, the harness launch not relaunched | the same |
| R6 | a quit with nothing opened | the will-quit SIGKILL | the same |
| R7 | ⌘Q with Settings in front (QS) | 3,508 ms, no toast, the flag never written | the toast at the main window, the flag written, closed at the disposer's end |

A row worse than the parent is a defect: fixed, or the part dropped and named.

### 10.5 At the end, once

The Electron count with CLAUDE.md's command, outside the history block; every `gmux-p362` socket under
`/private/tmp/tmux-501/` gone or with no server answering; the history stats; the macOS report count by name and time.

## 11. The integrator's commands (in order; each with its exit code and PASS line in the report)

1. `npm run typecheck`
2. `node build/contract-inventory.mjs --check` (must match byte for byte; a diff is a finding)
3. `npm test` (under the history block; the four `/bin/ps` tests named as the expected failures)
4. `npm run build` (`gate:electron` reads 186 against a floor of 186; `gate:background`, `gate:checks` with `probe:p362`
   classified; the menu glyph and accelerator gates unchanged)
5. `npm run conformance:stoppedlist` (15 rules, every ablation red on exactly its own rule, the control green)
6. `node build/quit-smoke.mjs --self-test` (38 of 38)
7. the four phase vitest files and the quit neighbours explicitly: `p362-quit-fallback`, `p362-settings-quitting`,
   `storage-landing`, `p362-teardown-sentinel`, `sentinel`, `p3571-quit-hardexit`, `p357-relaunch-and-quit`,
   `quit-admission`, `quit-dispose-order`
8. `git diff --stat 795f5a14 -- src/main/capabilities.ts src/main/sessions/core.ts src/shared` (empty; if not, run
   `conformance:credentials`, `conformance:pocket`, `conformance:pocket:hostile` and `conformance:push`, and the core
   gates its hunks name)
9. `node build/p362/probe-p362.mjs --grader-self-test` and `--preflight`, under a lock slot
10. `npm run smoke:quit` and `npm run smoke:quitdoors`, each under a lock slot (they run through
    `build/quit-smoke.mjs` and the helper, which this phase allows): held leg the will-quit SIGKILL with no sentinel
    left; teardown leg exit 0 with the sentinel left marked
11. The Electron count, the socket check, the history stats

## 12. What is NOT in this phase

- No change to the snapshot pass, its 8 s bound, its format or its speed; no change to the quit generation or the
  dispose.
- No change to the order of the ordered disposer, its joins or its bounds, or to the hard exits 357 and 357.1 added:
  `src/main/capabilities.ts` and `src/main/sessions/core.ts` are not touched. The `will-quit` handler stays byte for
  byte but its comment.
- No change to the first-quit toast, its 1.5 s or its words, and no new words on any surface.
- No (B) and no (C) unless he chooses them (§14 Q1, Q2): no hidden windows, no F1 predicate.
- No hold for the other five main-process SQLite connections (357.1 §13 item 3).
- No new in-app seam: the update-staged quit and a throwing disposer are driven in vitest or by a scratch preload.
- Nothing reads his live profile. Every run uses a scratch profile, HOME and socket.
- No release by itself.

## 13. For the main session at landing

1. The trade goes to him with §2.2's numbers (§14 Q1). The build is (A); if he chooses (B) or (C), that is a round of
   its own with its own measurement, not a landing-time edit.
2. F1's CM arms are opt-in and UNREADABLE without a checking better-sqlite3, which no longer exists anywhere (§0.1 item
   7). The tracker carries the fact; whether to rebuild a checker is §14 Q4.
3. Phase 364's entry ("a diagnostic Tortie he runs as his everyday app") names research 143's checking build "kept at
   `/private/var/tmp/tortie-wt/scratch/p3571/r143-keep/adv-churn`", which was removed with 357.1's scratch; it has to be
   rebuilt before 364 can start.
4. `smoke:quit`'s teardown leg now leaves a marked sentinel by design (D4); the smoke reads it (§4.2). A probe or tool
   elsewhere that treats any `run.json` after a clean quit as a crash would now be wrong for the two teardown quits;
   the spec step found no such reader (`grep run.json` over `build/` and `src/`: `probe-p357.mjs` reads its path, the
   smoke reads it, the log module owns it).
5. Cleanup after the follow-up commit: the worktree and `/private/var/tmp/tortie-wt/scratch/p362/` (6.5 GB by `du` at
   the end of the spec step: the parent clone, the three prototypes and the kept run folders, most blocks cloned and
   shared), and
   `/private/var/tmp/tortie-wt/scratch/owed-p362/` once he has answered §14 Q1 and Q2 (it is F1's only copy).

## 14. Questions for him (the main session asks; the build proceeds on the defaults)

1. **When you quit with many busy sessions, which do you want?** Default (A).
   - **(A) The window stays until Tortie has saved.** On a quiet Mac it closes 0.4 s later than today on your first
     quit (3.5 s instead of 3.1 s) and about when it does today on every later one (2.3 s); on a busy Mac 4.5 to 7.5 s as the spec step measured, and 8.6 to 9.4 s in the fix round's and the reverify's runs under 24 busy loops (the pass at 7.7 s of its 8 s bound)
     after ⌘Q instead of 3.1 s. Everything is saved every time: each session's history and the backup of the session
     list. Tortie is gone 0.2 s after its window. While the window is up it refuses what you click, as it does during
     any quit today.
   - **(B) The window disappears at once, and Tortie saves behind it.** It vanishes as you press ⌘Q (after the
     first-quit message on the first one), and Tortie keeps running with no window for 2 to 4 seconds. Everything is
     saved. But in those seconds clicking Tortie in the Dock shows nothing, and opening a file or folder with Tortie
     brings the closing window back for a moment.
   - **(C) The window closes at 3 s as today, and the saving stops there.** Never a crash on a damaged session list,
     but on your first quit with 64 busy sessions none of their newest history was kept where today keeps some (0 of 64
     against 15), and no backup of the session list is taken for that quit.
   - Today, for comparison: the window closes at 3.1 s, but on a busy Mac Tortie keeps running with no window for 17 to
     40 seconds afterwards, saves nothing of that quit, and can no longer answer a Dock click in that time.
2. **(C) as a safety net beside (A)?** Default no: under (A) it would only act if one of Tortie's quit steps failed
   before the saving began, which none is written to do, and then it would only spare one close of the session list.
   The other choice adds it for that case.
3. **A second ⌘Q while Tortie is saving.** Default: it does nothing, and the saving finishes within the quit's own
   limits (the history's is 8 s). Today a second ⌘Q cuts the saving 3 s later. The other choice is a second ⌘Q that
   ends at once, keeping only what was saved by then.
4. **Rebuild the crash checker?** Default no for this phase: a JavaScript trace shows the session list is never closed
   on the long quit, which is the step before the crash. The other choice is a scratch rebuild of research 143's
   checker so the probe can show the crash itself at the parent and its absence at the new build; Phase 364 needs one
   anyway.
5. **The changelog line.** Default: one item that also says the next launch now tells you if Tortie crashed while
   quitting. The other choice leaves that half unsaid.

## §As built (the integrator, 2026-11-08)

The four builders' files as they returned them, plus the integrator's. `git diff 795f5a14` is this phase alone: 19
tracked files changed (2,077 insertions, 160 deletions) and 4 new paths (this file and the probe's folder, 42 files under
`build/p362/`, and the three test files: `p362-quit-fallback.test.ts` 757 lines, `p362-teardown-sentinel.test.ts` 565,
`p362-settings-quitting.test.ts` 179). Nothing staged, committed or stashed. Scratch, runners and logs are under
`/private/var/tmp/tortie-wt/scratch/p362/integrator/` (`run.sh` for the history block, `lockrun.sh` for the two smokes,
`probe-checks.sh`, `dup-scan.mjs`, `logs/`). His shell history read `743166 1793987027` and `23166 1790702242` at the
start, before and after each of the two Electron runs, and at the end. His reports folder held 33 names at its top
level (104 files with its subfolders, by name and time only) before and after each Electron run, none new.

### What the integrator changed, and why

| File | Change | Where it comes from |
| --- | --- | --- |
| `package.json` | +1: `"probe:p362": "node build/harness-socket.mjs --fresh gmux-p362 'node build/p362/probe-p362.mjs'"` after `probe:p357` | §8 |
| `build/assert-electron-teardown.mjs` | +12 −1: `HELPER_USER_FLOOR` 185 → 186 with its paragraph | §6, obligation 1 |
| `build/verification-checks.mjs` | +60 −23, comments and one classification: `electron('probe:p362')` with its paragraph; the stoppedlist paragraph says fifteen rules and what S12, S14 and S15 now hold; the quit-smoke paragraph's "passes on exit 0 alone" now names the marked sentinel; the `probe:p357` paragraph says the long menu quit and the crash-state arms are `probe:p362`'s | §9.1; the three paragraphs had become untrue |
| `CLAUDE.md` | +3 −2: the `conformance:stoppedlist` row gains Phase 362's paths, its timing (1.7 s with fifteen rules and 173) and three sentences replacing the one that queued this phase (S14, S12's c1 and c2, S15), and `smoke:quit`'s second leg names the marked sentinel; the `probe:p357` row's queuing sentence now says the long quit is `probe:p362`'s; a new `probe:p362` row | §9.1 |
| `CHANGELOG.md` | +1 under `## Unreleased`, `### Fixed`, below 357.1's: §5's item, word for word, no full stop and no link | §5, §14 Q5's default |
| `.gitignore` | +5: `!build/p362/fixtures/raw/*/app.log` with a comment | NEW, below (a landing hazard) |
| `docs/audits/contract-baseline.txt` | none: `--check` byte for byte, before and after every edit | §6 |

### Decisions the integrator made

1. **The `.gitignore` line (new).** The repository's `*.log` (`.gitignore:6`) hides the probe's ten raw `app.log`
   fixtures (`build/p362/fixtures/raw/{A64,A64L,C64,HQD,HQD0,P64,P64L,P64n,PS,PX}/app.log`): `git status --ignored`
   listed all ten as `!!`, and only 32 of the folder's 42 files were visible to a plain `git add`. Measured, not read:
   the files a plain `git add` would commit (`git ls-files -co --exclude-standard -- build package.json`, copied into
   scratch with `node_modules` linked) ran the probe's `--grader-self-test` to **FAIL: 28**, every one `ENOENT … app.log`
   from `rawOf`. With the negation, 0 ignored, 42 of 42 visible, and the same copy reads PASS with the numbers below. It
   changes no builder's file and no verdict; it touches a file no list names, which is why it is named here. The other
   choice, `git add -f` at the commit, works too and is easy to forget, and no verifier running in this worktree could
   see the difference.
2. **The duplicated mock table, named and not extracted.** `dup-scan.mjs` (runs of ten identical lines between a phase
   file and its folder) found 44 shared windows, all one block: `INDEX_IMPORTS`, the ~50 stand-ins for
   `src/main/index.ts`'s imports, in `p362-quit-fallback.test.ts:423` and `p3571-quit-hardexit.test.ts:322`. The quit
   builder was told to mock `index.ts` the way the 357.1 test does (§9.1). The two tables differ in eight entries that
   close over each file's own hoisted state (the disposer, the log's clear and logger, the store's count, the storage
   wait, the nudge, the arrival, the updater), and `src/main/__tests__/` holds no shared helper module to put one in.
   Extracting it would rewrite two test files at integration for no behaviour; a later consolidation can make one
   `indexImports(h, overrides)`.
3. **Two stale sentences outside every list, named and not edited.** `src/main/harness/quit.ts:34-39` says
   `GMUX_SMOKE=quit-teardown`'s pass is exit 0 (the smoke now also needs the sentinel left marked, which the mode does
   not grade; `build/quit-smoke.mjs` does), and `docs/research/42-logging.md:188` and `:289` say the sentinel is
   "deleted at will-quit" (a research record of Phase 35's design). Editing the first would also trigger
   `conformance:harnessprobes` for a comment.
4. **`gate:background`'s blind spot, named and not fixed.** The probe builder found that `assignedValues`
   (`build/scan-source.mjs:563-582`) reads a binding's value only up to its first `;` or newline (its pattern
   `([^;\n]*)`, read here), so a busy loop's shell source held in a constant walked past the gate with its `finally`
   kill taken out. The probe now writes the loop inline in the `spawn` call, which the gate counts (4 long-lived starts
   with the probe, 3 without, red without `endLoops`, the builder's measurement). Neither file is this phase's, so
   obligation 2's fixture belongs with the gate's own fix, for the main session to queue.
5. **Every command but the two smokes and the Electron count ran under the history block** through `run.sh`: `HOME`
   and `ZDOTDIR` in scratch, `HISTFILE=/dev/null`, no `TERM_SESSION_ID` or `TERM_PROGRAM`,
   `npm_config_update_notifier=false`, and `TMPDIR` spelled `/var/tmp/…` (preview's protocol test needs its temporary
   folder behind a link; the quit builder measured the `/private/var` spelling failing it). The scratch `HOME` skips one
   file by design, `src/main/context/__tests__/scan.integration.test.ts`, whose seven cases run only when
   `~/.agents/skills` exists, which is why `npm test` reads 23 skipped where the builders read 16.
6. **No `smoke`, `smoke:t1`, `smoke:t3`, `smoke:remote` or `smoke:machines`**, no package, no probe app run (the
   verifiers').

### Commands, exit codes and numbers

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `df -h /` | 0 | | 48 GiB free at the start and at both builds |
| `npm run typecheck` | 0 | 2 s | import boundaries 1,440 production files, 8,230 imports, 0 violations; 1,437 files, 5,035 runtime edges, 0 cycles; shared types OK |
| `node build/contract-inventory.mjs --check` | 0, 0 | < 1 s | byte for byte, before the battery and after the `.gitignore` line |
| `npm test` | 1 | 62 s | 1,199 files (1,192 passed, 3 failed, 4 skipped); 22,875 tests: 22,848 passed, 4 failed, 23 skipped (load 10). The four are the `/bin/ps` tests inside the history block: `process-table.native` "sees this process under its true parent and walks the chain to it", `ps.native` "sees this process under its true parent" and "finds a child this test spawned among the descendants of this pid", `p269-env-names` "kills a shell that never exits, on the deadline, leaving no survivor" |
| `npm run build` | 0 | 45 s | `gate:electron` 186 of 585 files against a floor of 186; `gate:background` 587 files, 4 long-lived starts each ended in a `finally`, 32 of 32 fixtures; `gate:simulator` 5 of 5; `gate:docker` 2 of 2; `gate:knownhosts` 615 files, 19 reach the ssh helper; `gate:checks` 285 check scripts (284 + `probe:p362`), 55 `tsxCli()` callers against 54, 1,199 test files; menu glyphs 60 (746 names), menu accelerators 36 sites in 8 files, 21 fixtures, both unchanged; `conformance:ios` 55 rules; `gate:onlyadd` PASS (4 frozen sets, 52 routes, 646 requests); `conformance:harnessprobes` 6 clauses, 16 ablations, 692 files; stapler 31, 18, 28; `contract-inventory` OK |
| `npm run conformance:stoppedlist` | 0 | 1.68 s through npm | 15 rules over 1,437 files; 173 of 173 ablations red on exactly their own rules; the control green; S8 19 environment shapes, 3 source variants and the shipped export |
| `node build/quit-smoke.mjs --self-test` | 0 | < 1 s | 38 of 38 fixtures, 5 of 5 sentinel texts |
| the nine files of §11 step 7 (vitest) | 0 | 6 s | 9 files, 144 of 144 |
| `git diff --stat 795f5a14 -- src/main/capabilities.ts src/main/sessions/core.ts src/shared` | 0 | | empty, and nothing untracked there: `conformance:credentials`, `:pocket`, `:pocket:hostile`, `:push` and the core gates are not triggered |
| `node build/p362/probe-p362.mjs --grader-self-test`, lock slot `electron.lock` | 0 | < 1 s | 35 graders, 115 clauses each shown red alone, 272 needs each shown unreadable alone, 803 fields that answer UNREADABLE when missing, 7 variants that still pass, 19 raw fixtures graded and 9 read through the one reader; 875 `ok`, 0 `FAIL` |
| `P362_PARENT_CHECKOUT=…/scratch/p362/spec/parent node build/p362/probe-p362.mjs --preflight`, same slot | 0 | < 1 s | PASS, 12 checks (the parent built, dispatching `quit-teardown`, carrying its tmux; HEAD built, `out/main/index.js` newer than every source, dispatching `quit-teardown`; the six helpers present) |
| `node build/p357/probe-p357.mjs --grader-self-test`, same slot (its header changed) | 0 | 1 s | 9 graders, 52 clauses, 43 needs, 160 fields, 93 raw fixtures, as 357.1 left them |
| the three above, first attempt | 71, 71, 71 | | the integrator's own wrapper error: `sandbox-exec` inside `sandbox-exec` ("sandbox_apply: Operation not permitted"); the slot was taken and released by the trap, nothing ran |
| `npm run smoke:quit`, outside the block, lock slot `electron.lock` | 0 | 50 s (its own build included) | held PASS: SIGKILL after 3,528 ms, the held line, the sentinel armed and left cleared (left false, marked false), the session list made, 0 dumps, 0 macOS reports, the app's own "the remembered settings were on disk after 154 ms" (`settled`, `moved: false`); teardown PASS: exit 0 after 1,668 ms, the sentinel armed and **left marked** (left true, marked true), nothing held, no session list made, 0 dumps, 0 reports. Load 2.8 before, 8.1 after |
| `npm run smoke:quitdoors`, outside the block, lock slot `electron.lock` | 0 | 46 s | 9 of 9, SIGKILL after 1,846 ms, the held line, the sentinel cleared, the session list made, 0 dumps, 0 reports, "on disk after 152 ms". Load 5.9 before, 4.3 after |
| the battery on the final tree: `npm run typecheck && npm run build && npm test` | 1 | 113 s | typecheck and build as above, `npm test` the same 22,848, 4 and 23 and the same four `/bin/ps` failures |
| `npm run conformance:handback` (`src/main/menu.ts`) | 0 | 1 s | PASS |
| `npm run conformance:phonecopy` (`src/main/settings/window.ts`) | 0 | 3 s | OK: 26 screens, 878 segments, 113 owned rules (floor 113); `Copy.swift` 215 words, 95 judged (floor 95), 9 controls (floor 9); 11 activity modules, 2 log calls (floor 2) |
| the committed-tree copy's `--grader-self-test`, before and after the `.gitignore` line | 1, 0 | < 1 s | FAIL 28 (`ENOENT … app.log`), then PASS with the numbers above |
| the Electron count (CLAUDE.md's command, outside the block, once, at the end) | 0 | | none of this phase's: his Tortie (pid 692) and its crash handler (2727), and Slack's, Chrome's, Granola's and Cursor's crash handlers |
| the socket and lock check | | | no `p362`, `smoke-quit` or `p144-doors` name under `/private/tmp/tmux-501/`; all three lock slots free |

`conformance:machines` names `openFolderOnMachine` in `src/main/menu.ts`; this phase's hunks there are the import and
`requestQuit` (`git diff -U0`: `+93,3`, `+242,14` in `requestQuit`'s comment, `+258,2`, `+264,3`), so it was not
triggered and not run. Each smoke printed `[electron-run] … ended 1 process the teardown found still running.` after
its SIGKILLed leg, the helper ending a child the SIGKILLed main left behind, as in 357.1's runs.

### The builders' numbers, reconciled

The quit builder's 144 of 144, the sentinel builder's 38 of 38 and both smokes' verdicts, the gate builder's 15 rules
and 173 ablations, and the probe builder's 875 `ok` and 186 helper users all read the same here. The quit builder's
"152 of 152" was the gate mid-edit; 173 is the final count (S12 32 → 51, S14 35, S15 25).

### Found here, for the verifiers and the main session

1. **The `.gitignore` line above is part of the delta on purpose.** Without it (or `git add -f`), the landed probe's
   self-test fails.
2. **The held smoke leg ran 3,528 ms** (the whole leg, Electron's boot and the eight `pbkdf2` jobs included; round A
   measured 1,963 and the sentinel builder 4,064 on its clone). Its quit itself settled the storage wait in 154 ms; the
   number is printed, not graded, and is load-dependent.
3. **The probe builder's four judgment calls are the verifiers' to confirm**: an R arm's close time is graded "no later
   than the parent's plus 100 ms" (an earlier close is printed); HEAD's long arms need the snapshot pass to end inside
   its 8 s bound; RUN fails on any new report named Electron or Tortie since the run began, which another phase's
   Electron could also write; and QT-parent may not show the cut on a quiet Mac (its second press finds the first-quit
   flag already written, so the parent's pass may end before 3 s).
4. **CM stays UNREADABLE by design**: no checking better-sqlite3 exists (§0.1 item 7); `--preflight` prints it as a
   NOTE only when `P362_ARMS` names CM.
5. **Carried, unchanged**: §13's items 1 to 5. `scratch/owed-p362/` (F1) is untouched and still the only copy.

### The fix round (the fixer, 2026-11-09)

Lens 1 (the behaviour and its scale step) answered `needs_work` on one minor and one nit, both in the probe's reader.
Lens 2 (the attack) answered `approved` with one minor and four nits. No major. Neither lens found a scenario worse
than the parent (lens 1's eleven no-regression rows and lens 2's seven are each `worse: false`), so nothing is dropped,
and no product behaviour moves in this round. The tree was read again before the first edit: `git diff 795f5a14`
sha256 `f6867b7a…`, the tree both lenses verified. Scratch, runners and logs are under
`/private/var/tmp/tortie-wt/scratch/p362/fixer/` (`run.sh` and `lockrun.sh` are the integrator's with this role's
scratch; `make-fixtures.mjs`, `ablate-probe.mjs`, `recheck.mjs`; `logs/`; `pre/` holds each file as the lenses read it).

| Finding | Severity | What changed | From |
| --- | --- | --- | --- |
| M64L-parent read UNREADABLE in every run: on the busy parent's cut no snapshot write begins, so the app never makes `gmux/snapshots`, `snapshotListing` returned `null` and `READ_NEED` failed, and `npm run probe:p362` exited 2 for that alone | minor | `snapshotListing` hands a folder that does not read to the one reader as data, `{ error, gmuxDir }`. `copiesOf` reads ENOENT with the gmux folder there as 0 of N (`folder: 'never made'`); any other error, or no gmux folder (a wrong path), stays unread. `READ_NEED` is unchanged and still needs the backup index read, which is what proves the app kept its files in that gmux folder. The app makes the folder at its first write (`ensureDir` in `src/main/durable/write.ts`). Fixtures: `V-M64L-nofolder` (lens 1's run a64, M64L-parent: its 64 live ids, its menu press time and its backup index, less paths and hashes), `V-M64L-unreadfolder` (EACCES) and `V-M64L-nogmux`; five grades (M64L-parent and M64-parent pass, M64L-head FAILS on exactly the copies clause, M64L-parent UNREADABLE on exactly `READ_NEED`, twice) and three reads through the one reader | lens 1, as written |
| A copy counted as kept by its body's name alone | nit | `snapshotListing` also reads each live body's size and sha256, and `copiesOf` counts a copy only when both are its record's `bytes` and `sha256`, the test `resolveSnapshot` makes before it reads one (`bodyVerifies`, `src/main/restore/snapshots.ts`). A listing recorded before this round carries neither and reads by name, as before (`copies.checked` says which), so every recorded fixture reads the numbers it did. Fixtures: `V-copies-checked` (eight shells, one record a byte short and one body with other bytes of the same size: 6 of 8), `V-copies-ok` (8 of 8) and `V-copies-byname` (the same folder without the two maps: 8 of 8 by name); three grades on QS-head and three reads | lens 1 |
| RUN FAILED on his history: it moved 122 bytes during lens 2's run, and the 180 s re-read saw no further move | minor | **His rule is not changed.** Reading a settled move as his would pass the one check that catches a probe that writes his history, so a held move still FAILS RUN ("still moved means STOP and report"). What changed: the probe reads the history's size and time once a second for the whole run (never a byte of it) and reports each move with its time and the arm it came in (`history.moves`, one line per move), so that report says when. RUN was run again here (below) and passed, unmoved | lens 2's second option; its first refused, for the reason above |
| `CLAUDE.md:324` said 173 ablations | nit | 178, with this round's time beside the integrator's (1.7 to 2.8 s) | lens 2 |
| `src/main/harness/quit.ts:34-39` said `quit-teardown` passes on exit 0 | nit | One sentence more: since Phase 362 its pass also needs the run sentinel left marked, so the next launch reads that quit as clean (`build/quit-smoke.mjs` grades it). A comment only; `conformance:harnessprobes` passed inside `npm run build` | lens 2 (the integrator's decision 3 had left it) |
| The integrator's counts above (173 ablations, 875 `ok`) | nit | Left as written, the record of that step. Now: 178 ablations; 1,066 `ok` (the lenses' 1,052, plus this round's 14 readings) | lens 2 |
| S14 does not ask whether a `before-quit` catch ends; S12 misses `(process as any)['ex'+'it'](0)` | nit | Not built. Lens 2 calls neither required: the first is pinned by `p362-quit-fallback.test.ts` (its A13 reads red), the second needs deliberate obfuscation | lens 2 |

Files this round changed: `build/p362/probe-p362.mjs` (+98 −14), `build/p362/fixtures/graders.json` (646 → 660 readings:
+8 raw grades, +6 raw reads), six new folders under `build/p362/fixtures/raw/` (one `bundle.json` each, 3 to 4 KB, none
ignored by git), `CLAUDE.md` (+1 −1), `src/main/harness/quit.ts` (+4 −1, a comment) and this section.

**The independent step: the reader's ablations.** `ablate-probe.mjs` copies the probe and its eight static helpers into
scratch with the new fixtures, takes one clause of the fix out at a time and runs `--grader-self-test` (the worktree is
read, never written; history block; exit 0):

| Variant | `ok` | FAIL | Red on |
| --- | --- | --- | --- |
| control (the probe as it stands) | 1,066 | 0 | |
| the pre-fix probe over the new fixtures | 1,056 | 10 | all six new reads, and four of the eight new grades (the three never-made ones and `V-copies-checked`'s); the two unread grades read UNREADABLE under the old reader too, and `V-copies-ok` and `V-copies-byname` pass under both |
| a folder that did not read is always unread | 1,062 | 4 | the three never-made grades and their read |
| ENOENT without asking for the gmux folder | 1,064 | 2 | `V-M64L-nogmux`'s grade and read |
| any error read as never made | 1,064 | 2 | `V-M64L-unreadfolder`'s grade and read |
| the size check out | 1,065 | 1 | `V-copies-checked`'s read (7 of 8) |
| the sha256 check out | 1,065 | 1 | `V-copies-checked`'s read (7 of 8) |

**The app run: `probe:p362` with `P362_ARMS=M64L,M64`**, both builds, the parent first (the spec step's parent),
`P362_KEEP=1`, lock slot `electron.lock2`, outside the history block through `lockrun.sh`: exit 0 in 121 s, **9 verdicts
passed, 0 failed, 0 could not be read**. Times are ms after the press.

| Arm | Build | Load at press | Fallback | Pass ends | Dispose | `will-quit` | Window closed | Gone | Ended | Copies | Quit generation | Relaunch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M64L | parent | 6.6 (24 loops) | 3,003 | — | — | 3,107 | 3,107 | 4,184 | exit 0, Node's teardown | **0 of 64, the folder never made** (was UNREADABLE) | none | every row and id, 64 live, 3 of 3 keys, the flag, the bounds, no notice |
| M64L | HEAD | 27.4 (24 loops and the other phases) | none | 8,436 (from 1,505, inside its 8 s bound) | 8,470 | 8,575 | 8,575 | 9,265 (linger 690) | will-quit SIGKILL, storage settled in 154 ms | **64 of 64, bytes and sha256 checked** | quit | the same |
| M64 | parent | 39.9 (the other phases) | 3,001 | — | — | 3,106 | 3,106 | 3,538 | exit 0, Node's teardown | **0 of 64, the folder never made** | none | the same |
| M64 | HEAD | 34.3 | none | 5,987 | 6,021 | 6,129 | 6,128 | 6,300 | will-quit SIGKILL, storage settled in 153 ms | **64 of 64, bytes and sha256 checked** | quit | the same |

TX passed in both pairs (the parent: the session list open at `quit` and at `exit`, no `close()`; HEAD: held, no `quit`
event). A `sessions.list` asked 2 s into each quit answered `SHUTTING_DOWN` at both builds. RUN passed: his history
`743319 1794200266 | 23166 1790702242` before and after with no move in the once-a-second record, 0 Electrons and 0 loops
left, the scratch server gone and no server on the socket, no new report, 8 of 8 launches holding the agents and the
Tailscale preflight, no real Tailscale.

**Re-derived by another method** (`recheck.mjs` over the kept run): for both parent arms the listing was
`{ error: 'ENOENT', gmuxDir: true }` and the fault trace holds 0 body writes and 0 renames between the press and the
end, so no write began; for both HEAD arms each quit record's body, hashed again from the folder as it stands after the
relaunch (the ring keeps three generations), has its record's size and sha256 for 64 of 64, the probe's own count.

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `df -h /` | 0 | | 88 to 90 GiB free throughout |
| `npm run typecheck` | 0 | 7 s | import boundaries 1,440 production files, 8,230 imports, 0 violations; 1,437 files, 5,035 runtime edges, 0 cycles |
| `node build/contract-inventory.mjs --check` | 0 | < 1 s | byte for byte |
| `npm run build` | 0 | 48 s | `gate:electron` 186 of 585 against 186; `gate:background` 587 files, 4 long-lived starts, 32 of 32 fixtures; `gate:simulator` 5 of 5; `gate:docker` 2 of 2; `gate:knownhosts` 615 files; `gate:checks` 285 check scripts, 55 `tsxCli()` callers against 54, 1,199 test files; menu glyphs 60 (746 names), accelerators 36 sites in 8 files; `conformance:ios` 55 rules; `gate:onlyadd` PASS; `conformance:harnessprobes` 6 clauses, 16 ablations, 692 files; `contract-inventory` OK |
| `npm test` (history block) | 1 | 74 s | 1,199 files (1,192 passed, 3 failed, 4 skipped); 22,875 tests: 22,848 passed, 4 failed, 23 skipped. The four are the `/bin/ps` tests the block stops by design: `process-table.native` ×1, `ps.native` ×2, `p269-env-names` ×1 |
| `npm run conformance:stoppedlist` | 0, 0 | 2 s; 2.82 s timed at a load of 12.8 | 15 rules over 1,437 files; 178 of 178 ablations red on exactly their own rules; the control green |
| `node build/quit-smoke.mjs --self-test` | 0 | 1 s | 38 of 38 fixtures, 5 of 5 sentinel texts |
| the nine files of §11 step 7 (vitest) | 0 | 6 s | 9 files, 144 of 144 |
| `git diff --stat 795f5a14 -- src/main/capabilities.ts src/main/sessions/core.ts src/shared` | 0 | | empty, nothing untracked there |
| `--grader-self-test`, `--preflight` (parent: the spec step's) and `probe-p357.mjs --grader-self-test`, lock slot `electron.lock2` | 0, 0, 0 | < 1 s each | 35 graders, 115 clauses, 288 needs, 826 fields, 7 variants, 149 raw fixtures graded and 26 read through the one reader, 1,066 `ok`, 0 `FAIL`; preflight PASS, 12 checks; p357 as 357.1 left it (9 graders, 52 clauses, 43 needs, 160 fields, 93 raw fixtures) |
| `ablate-probe.mjs` (history block) | 0 | < 10 s | the table above |
| `npm run smoke:quit`, lock slot `electron.lock2` | 0 | 56 s | held PASS: SIGKILL after 2,252 ms, the held line, the sentinel armed and cleared (left false, marked false), the session list made, 0 dumps, 0 reports, "on disk after 152 ms" (`settled`, `moved: false`); teardown PASS: exit 0 after 2,045 ms, the sentinel armed and left marked, nothing held, 0 dumps, 0 reports. Load 10.6 before, 8.1 after |
| `npm run smoke:quitdoors`, lock slot `electron.lock2` | 0 | 52 s | 9 of 9, SIGKILL after 1,926 ms, the held line, the sentinel cleared, the session list made, 0 dumps, 0 reports, "on disk after 155 ms". Load 8.7 before, 5.9 after |
| `probe:p362` `M64L,M64`, lock slot `electron.lock2` | 0 | 121 s | above |
| `recheck.mjs` (history block) | 0 | < 5 s | above |
| the Electron count (CLAUDE.md's command, outside the block, once, at the end) | 0 | | none of this round's: his Tortie (pid 692) and its crash handler (2727), and Slack's, Chrome's, Granola's and Cursor's crash handlers |
| the socket and lock check | | | no `p362`, `smoke-quit` or `p144-doors` name under `/private/tmp/tmux-501/`; all three lock slots free |

His shell history read `743319 1794200266` and `23166 1790702242` at the start of this round (it had moved twice during
the lenses' runs, the last at 23:57:46, which both lenses read as his), before and after every Electron run, and at the
end: unmoved. His reports
folder held 33 names at its top level (104 files with its subfolders, by name and time only) before and after every
Electron run, none new.

Not run, and why: the other default arms (M64n, M48, QS, QR, QT, QY, QW, QD, QD0, R2, R4 to R6), because this round
moves only the probe's copies reading and its history record, and those are driven over every shape in the self-test
and live in M64L and M64 at both builds (the reverify reruns M64L at the parent, lens 1's ask); CM (no checking
better-sqlite3, §0.1 item 7); the four `/bin/ps` tests outside the block (not allowed); `smoke`, `smoke:t1`,
`smoke:t3`, `smoke:remote`, `smoke:machines` and the package (forbidden, or not this role).

### The landing (the main session, 2026-11-09)

- **Landed on (A), the default the phase was built and verified on.** The reverify approved after the fix round, 11
  no-regression rows, none worse; lens B approved, lens A's one minor (the probe reading a never-made snapshot folder as
  UNREADABLE) was fixed and re-derived. Q1 goes to him after landing, with the reverify's numbers: under 24 busy loops
  the window stays up 8.6 to 9.4 s where today's closes at 3.1 s and saves none of 64; (B) and (C) are a later phase if
  he chooses either. Q2 to Q5 stand on their defaults.
- **Fixed here, words only:** §14 Q1's busy-Mac figure now carries the fix round's and the reverify's 8.6 to 9.4 s.
