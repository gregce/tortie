# Phase 365 — "Tortie's file watches subscribe one at a time, and never to a folder that may not exist" — SPEC

Written by the spec step on 2026-11-09 in `/private/var/tmp/tortie-wt/wt-p365`, a detached worktree at origin/main
`ce4c77f6` ("docs(backlog): his ruling on 362's trade"; Phase 357.1 landed at `5895b12b`, Phase 362 at `d84bed31`).
**`git diff ce4c77f6` in the worktree must be exactly Phase 365's delta**, this file included. origin/main moves while
the phase runs; nobody here rebases, pulls or merges; the main session moves the tree at landing. The charter is
`docs/BACKLOG.md` "## Phase 365" (`:45170`) and research 143 §2.5, §3 row (e), §5 and §7, bound as written except where
§0.1 says the tree or a measurement wins. The entry's item 3 is the clause this spec exercises: "until then the spec
measures whether running the watcher outside the main process (a `utilityProcess` owned by main) is the smaller cure,
and chooses with the numbers", and his word on it: "If the damage comes back with the watcher outside the main process,
the watcher is cleared." His standing rulings bind: **no regression against today** (a scenario worse than the parent
is a defect: fix it or drop the part, and name which); Tortie never ends a session on its own; just enough words; no tmux
vocabulary on any surface; nothing released, tagged, version-bumped, archived or uploaded; refusal 1 (no code Tortie did
not choose: `@parcel/watcher` is already a dependency, so running it in a `utilityProcess` Tortie owns is allowed by the
entry); his session count is allowed (`build/electron-run.mjs`'s read-only census).

| | |
| --- | --- |
| Subject | `fix(watcher): subscribe one at a time, and never to a folder that may not exist` (the entry's) |
| First body line | `Phase 365: Tortie's file watches no longer race each other` (the entry's) |
| Semver | Patch, unreleased, Mac only, released on his word. One CHANGELOG item under `## Unreleased`, `### Fixed` (§5), because the build measures something a person sees move: under the storm the parent's Tortie crashes and HEAD's does not (§2, §10) |
| Lane | Build: Spec → Build (FOUR builders, disjoint files) → Integrate → Verify (two lenses) → [Fix once → Reverify] → Commit |
| Tier | **3**: the watches are native code in the main process today, the harvest's rescue watches recover the resume ids sessions are restored with (`src/main/manifest/harvest/watch.ts`), the quit drains their closes, and the spec step measured them corrupting main's heap (§2), so a defect here can lose a person's work or crash the app (CLAUDE.md:268). Parent measured (§2); two independent methods at least, one an attack (§10) |
| The cure | **The watcher in its own `utilityProcess`, with the entry's one queue and its existence check inside it** (D1). Measured: the queue and the existence check alone left main faulting at the storm's rate (§2.2) |
| Menus | **No row added, renamed or removed.** Nothing a person presses moves |
| Contract | **Does not move.** No invoke channel, `GMUX_*` env name, schema, migration, smoke mode, `gmux.*` key or notice kind. The process's one variable is `TORTIE_WATCHER`, which the inventory does not sweep; `gate:contract` must read byte for byte, and a diff there is a finding |
| `HELPER_USER_FLOOR` | **186 → 187**: `build/p365/probe-p365.mjs` reaches `build/electron-run.mjs` (obligation 1). Phase 359 also raises 186 → 187 in its own tree; the second to land makes it 188 (§13) |
| CHANGELOG | One item (§5); the commit link is added by the follow-up docs commit |

## 0. The hard rules, stated once (every builder, the integrator, every verifier, the fixer, the reverifier)

- NEVER commit, stage or stash. `/Users/gdc/gmux` is read only. Never touch another phase's worktree or scratch (Phase
  359 runs in `wt-p359` and changes `src/main/sessions/core.ts`, `src/main/index.ts` and, in its rounds, the disposer's
  first lines in `src/main/capabilities.ts`; Phase 360's `wt-p360*` and Phase 325.1's `wt-p3251*` wait on his answers).
  Scratch lives under `/private/var/tmp/tortie-wt/scratch/p365/<role>/`, never under `/private/tmp`; a probe's `TMPDIR`
  points there too.
- **The spec step's instruments are kept for you, read them, do not import them**:
  `/private/var/tmp/tortie-wt/scratch/p365/spec/storm/` holds the storm app (`app/main.js`, `app/watcher-child.js`), the
  product-sites entry bundled from the parent's own `src/main` (`product-entry.ts` → `app/product.js`), the driver
  (`driver.mjs`), the minidump reader (`minidump.mjs`) and the lock runner (`lockrun.sh`); every run's report is
  `…/spec/runs/<run>/report.json` beside its `stdout.txt`; logs are `…/spec/logs/`. Electron 43.3.0's public breakpad
  FUNC records (122 MB download, UUID `4C4C44D6-5555-3144-A142-D5594664B24B` matching the worktree's framework) are
  `…/spec/symbols/x/ef-funcs.txt`, read as data by the reader. No built parent clone was needed: every parent measurement
  drove the worktree's own `src/main` at `ce4c77f6` (bundled) and its shipped `watcher.node`.
- `-L gmux` is named only by `build/electron-run.mjs`'s census, and only with `list-sessions`. The storm app starts no
  tmux at all; a launch of the real app aims at its own scratch socket with the checkout's vendored tmux (3.7b).
- **No real agent runs, not even for a version.** Every real-app launch hides every probed registry row
  (`writeHiddenAgents(profile, prefix, hiddenAgentsBesides(['codex']))` when the codex stand-in arm runs, else `[]`) and
  reads `agents:list` back (`standInsOnlyVerdict`). `conformance:resume:capture` starts real agents and is NOT run; the
  harvest's rescue watch is proved by its vitest files, `conformance:derived` and probe arm RH's stand-in (§8).
- Never read his keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex`, any agent's or conversation store,
  his shell history's contents or his live Tortie profile. Every watched folder is a scratch folder you made; a harvest
  root is a scratch `CODEX_HOME`.
- **His crash reports.** A deliberate crash in scratch can write a report into `~/Library/Logs/DiagnosticReports`: count
  that folder by NAME and mtime only, before and after every run that can crash, name what your run added, and never
  open a report. The storm app calls `crashReporter.start({ uploadToServer: false, ignoreSystemCrashHandler: true })`
  after `app.setPath('crashDumps', <profile>/Crashpad)`, and in the spec step none of its 16 crashes (9 of main, 7 of the
  watcher process) reached his folder (34 names, 105 files, the same names and times before and after). Grade a crash by
  the process's own exit signal and by the dumps Crashpad wrote under YOUR scratch profile.
- **A dump holds the process's whole environment** (research 42:164). The spec step's runs inherited this tool shell's
  environment, a messaging token and his tmux socket among it, into their scratch dumps; all 16 dumps were read and then
  deleted, and the runner now unsets `CLAUDE_CODE_*`, `SSH_AUTH_SOCK`, `TMUX`, `TMUX_PANE`, `GMUX_SESSION_ID`,
  `GMUX_MANAGED` and `SECURITYSESSIONID` first. Every launch that may crash strips them (and every `CSC_*`, `APPLE_*`,
  `GH_TOKEN`, `GITHUB_TOKEN`); no `.dmp` is ever committed, kept past its reading, or copied out of scratch; fixtures hold
  the reader's JSON only.
- A storm app (a scratch app folder launched through `withElectron` with `cwd` set to it and `program: 'app'`, so the
  exit signal is the app's own) opens no window and calls `app.dock.hide()` before anything else.
- His shell history is never written by us: every command that does not launch an Electron or need `/bin/ps` or `lsof`
  runs under `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb`; the four `/bin/ps` native tests fail
  inside it by design (`process-table.native` ×1, `ps.native` ×2, `p269-env-names` ×1; name each as it fails, never run
  them outside it). What needs Electron, `/bin/ps` or `lsof` runs outside it with `HOME` and `ZDOTDIR` in scratch,
  `HISTFILE=/dev/null`, `SHELL=/bin/sh`, `TERM_SESSION_ID` and `TERM_PROGRAM` unset (run the wrapper as `zsh -f`, and
  give it absolute paths for his history and his reports folder, because `~` is the scratch HOME there). `npm test`
  runs under a scratch `HOME` too (Phase 359's integrator, decision 5: with his real `HOME`, one test reads his agents'
  context folders). Record only `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before and after every run (the spec
  step read `743319 1794200266` and `23166 1790702242`, unmoved across every run). A move across an unblocked run:
  start nothing for 3 minutes and stat again; moved again is his; still moved means STOP and report.
- Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids you started, each read again by
  `ps -p <pid> -o command=` right before its signal; every process you start ends in a `finally`. The watcher process a
  probe signals (arm SK) is its own launch's, found as the child of the main pid it launched and read again before each
  signal. Never signal a probe while its own teardown runs. His Tortie has the same bundle id as every build you run:
  never an Apple Event, `osascript` or `open`; a quit is pressed through the native row in main (`item.click()`),
  `app.emit`, or the harness.
- Every Electron goes through `build/electron-run.mjs` inside `build/harness-socket.mjs` (the two quit smokes through
  `build/quit-smoke.mjs`), with a scratch profile, `HOME` and socket. No Simulator. No real Tailscale, DNS, APNs or ssh;
  never `smoke:remote` or `smoke:machines`. Never import a `build/` script to inspect it; read it as text.
- The lock has three slots shared with the other phases: `zsh /private/tmp/tortie-ops/lock.sh try p365-<role>` prints
  the slot or exits 1 (retry every 60 s in a NEW command); release with `zsh /private/tmp/tortie-ops/lock.sh release
  <slot>` from a `trap`. Every storm, probe or app run holds one (Phase 359's verifier held one beside this step's two).
  `df -h /` before any build or clone; under 8 GB free, wait and report (87 GiB free at the spec step).
- **No dependency moves.** Never `npm install` or `npm ci`; `@parcel/watcher` stays 2.6.0 (`watcher.node` UUID
  `8AE534B6-95FB-3F57-AC49-06DDC162BB74`, sha256 `bdc5c395…`), Electron stays 43.3.0. A newer watcher is §14 Q3.

## 0.1 What the entry and the parent reading give, measured (the tree and the measurements win; each binds)

Everything here is read at `ce4c77f6` and run at it, under `/private/var/tmp/tortie-wt/scratch/p365/spec/`; §2 holds
the numbers.

1. **Five subscribe sites, as the entry says, and nothing else.** Four production files import `@parcel/watcher`:
   `src/main/watcher/repo-watcher.ts:66` (the worktree subscribe `:345-351`, the dotgit subscribe `:541-555`),
   `src/main/config/store.ts:34` (`:396`), `src/main/machines/store.ts:32` (`:434`) and
   `src/main/manifest/harvest/watch.ts:41` (`:933`, reached from `watchForSessionId` `:465`, which
   `startIdCapture` (`src/main/sessions/id-harvest.ts:187`) calls at a create and `resumeIdHarvests` (`:328-471`)
   calls at boot and at every reconcile (`src/main/sessions/core.ts:2467`)). No `getEventsSince` or `writeSnapshot`
   anywhere under `src/`. The unsubscribes: `repo-watcher.ts:397`, `:559`; `config/store.ts:419`;
   `machines/store.ts:456`; `harvest/watch.ts:561`, `:937`; each tracked by `trackWatcherClose`
   (`src/main/watcher/teardown.ts:44-55`). **The two configuration watches are one native watcher**: same folder
   (`configDir()`), same empty ignore set, so `Watcher::getShared` hands both the same object and adds a second callback.
2. **Which can subscribe to a folder that may not exist, and what each does when a subscribe throws.** The worktree:
   `normalizeRepoPath` checks the folder (`src/main/git/ipc.ts:82-95`), then `RepoWatcher.watch` awaits a git child
   (`readIgnoredRoots`, `repo-watcher.ts:332`, about 20 ms) before it subscribes, so a folder removed in that window is a
   failed native subscribe; the throw rejects `watch()` and `ensureWatcher` logs `could not watch <path>: <message>`
   and caches null, so that project is not watched until its tab opens again (`git/ipc.ts:123-135`). The dotgit watch
   stats `.git` (`:572-590`) and subscribes a turn later; a throw is one `onError` warn and a retry on the next flush
   (`:563-565`, `:516`). The configuration watches subscribe a folder `ensureConfigDir()` made a moment before; a throw
   is one warn and `false` ("Tortie will still re-read … when you ask it to", `config/store.ts:421-427`,
   `machines/store.ts:458-464`). The harvest already asks `existsSync` one tick before (`harvest/watch.ts:932`) and
   swallows a throw (the poll covers). **What a failed subscribe does inside 2.6.0**, read from the shipped source:
   `SubscribeRunner`'s constructor calls `Watcher::getShared` on main (`src/binding.cc:165-191`); its `execute` runs on
   a libuv worker, and on a throw calls `watcher->destroy()` (`:187`) → `clearCallbacks()` (`src/Watcher.cc:208-216`),
   which unrefs and deletes the callback's napi reference ON THE WORKER (`:211`, `:214`) and calls `removeShared` there
   (`:35-47`, an unlocked `unordered_set`) while main may be inside `getShared` (`:24-33`); `Backend::watch`'s catch does
   the same to the backend registry (`src/Backend.cc:145-157`, `:168`). That is research 143's 17 ThreadSanitizer races.
3. **Ordinary use is bursts, counted through the parent's own sites** (run `ord1`, §2.3): a boot with 20 projects, the
   two configuration watches and 5 rescue watches asks the native module for 52 subscribes in 57 ms with up to 17 in
   flight at once; 20 s of edits ask for none; closing 10 projects at once asks for 20 unsubscribes with 10 in flight;
   switching a branch in 5 repositories asks for none (the dotgit watch sees it); settling the 5 rescues asks for 10;
   the quit's own closes (22) drain in 10 ms. Between bursts there is nothing. The storm is about 17 a second of each,
   for minutes.
4. **The quit's drains, as 357.1 and 362 left them** (the entry's `:948` and `:1079-1087` were read at `d94f898d`; at
   `ce4c77f6`): the disposer `src/main/capabilities.ts:720-1145`; `shutdownGmuxCore()` `:904-908`, whose
   `dispose()` cancels every harvest watch (`src/main/sessions/core.ts:4434-4435`); the 3 s wedge guard `:970-1015`
   (`afterMs(3_000)` `:970`, `Promise.allSettled([disposeGitIpc(), …, stopAgentOverlayWatch(), stopMachinesWatch()])`
   `:972-1011`, `.then(() => drainWatcherCloses(2_000))` `:1012`); the late drain `:1093-1134`
   (`pendingWatcherCloseCount()` `:1093`, every window hidden `:1104`, `drainWatcherCloses(15_000)` `:1109`, the sentinel
   cleared and SIGKILL to self `:1121-1123`, `'killed'`); `return 'proceed'` `:1144`. Then `before-quit`'s body
   (`src/main/index.ts:825-855`, 362's D2) and 357.1's `will-quit` hard exit (`:902-919`). Harness drains:
   `src/main/harness/shot.ts:67-75`, `p163-capture.ts:346`, `src/main/conformance/resume.ts:961`.
5. **Every storm fault the spec step measured needs a watched folder removed as its watch is dropped** (the quit's
   fault, item 6, is the other kind). Over the shipped
   `watcher.node` in Electron 43.3.0 at about 17 subscribes and 17 unsubscribes a second (§2.1): the full storm faulted
   main in 5, 8 and 59 s; with no failed subscribe and the folders still removed it faulted in 60 s (`abB1`); with
   failed subscribes (503) and no folder removed it ran 300 s clean (`abA1`), as did neither (`abC1`). The path is #271
   (`FSEventsCallback` stops and releases the stream for a deleted root with no lock, `src/macos/FSEventsBackend.cc:189-
   191`, while the worker's `unsubscribe` stops it again, `:331-337`).
6. **The faults, named from the dumps** (a reader of its own, Electron 43.3.0's public symbols): PartitionAlloc's
   freelist check (`FreelistCorruptionDetected`, SIGTRAP) on the FSEvents thread during a free inside
   `Watcher::isIgnored` (inlined from `FSEventsCallback`), or at a thread's exit while main sat in `Backend::~Backend`;
   #271's own CoreFoundation trap inside `stopStream`, from `FSEventsCallback` on the FSEvents thread or from
   `FSEventsBackend::unsubscribe` on a libuv worker; and `napi_fatal_error` (SIGABRT) on main at a quit with closes still
   queued. Research 143's `DirTree::remove` fault and its null call on the FSEvents thread were not seen by name; they
   are the same family (the FSEvents thread working on a stream or state another thread has released). Six of main's
   eight storm faults were detected at 59 to 60 s, inside PartitionAlloc's thread cache purge, which is where it checks
   its freelists, so the damage is older than the fault. **This is damage to main's PartitionAlloc heap, the allocator
   SQLite's page cache lives in (research 143 §2.2).**
7. **The entry's items 1 and 2 alone do not remove the faults** (§2.2): the one queue and the existence check in main
   faulted in 59 s (`q1`, 0 failed subscribes left, 119 answered "nothing to watch"). Adding a NEW rule, a drop whose
   folder is already gone waits 2 s before it joins the queue, ran 600 s clean when the folder went first (`qg1`) and
   faulted in 60 s when the drop was already on its way as the folder went (`qg2`), which is #271's exact shape and the
   one no check in main can see coming.
8. **The watcher in a `utilityProcess` removes them from main** (§2.4): with the parent's own overlapping calls inside
   the process, main never faulted (`u1` 300 s, `u3` 120 s) while the process crashed 6 times and was replaced each time
   in 59 to 157 ms with every live watch re-bound in 1 to 4 ms; with the queue, the existence check and the grace inside
   it, the process did not crash in 300 s when the folder went first (`u2`) and crashed once in 300 s when it went during
   the drop (`u4`), main untouched both times. Its cost: one process of 59 to 69 MB resident, 59 to 157 ms from fork to
   ready, and no event latency (P50 67 ms, P90 96, P99 174 against 67, 99, 173 in main).
9. **The parent's own five sites fault under the storm** (`p1`, `p2`, §2.3): 2 of 2 runs, both at 60 s, both
   PartitionAlloc's freelist check on the FSEvents thread; about 326 project watches started, 300 closed, 170 rescues
   armed a minute.
10. **Upstream** (read 2026-11-09): #271 is open, opened 10 October 2026, no comment, no linked pull request; its
    reporter proposes a static mutex shared by the callback and `unsubscribe()` (0 of 20 crashed with it against 6 to 7
    of 20 without) and says it is untested by the project. `@parcel/watcher`'s newest release is still v2.6.0 (20 July,
    "Latest"; npm `latest` 2.6.0). #271 cites #259, a data race on the shared backend registry; its issue and pull pages
    answered 404.
11. **The watcher process ends with main.** After main's SIGKILL (357.1's hard exit in miniature) the process was gone
    3 ms later (`u3`); at a normal quit it exited 0 with main (`u1`, `u2`). So the quit needs no new step in
    `src/main/capabilities.ts` (D8).
12. **A crash dump of a launch carries that launch's environment** (§0, research 42:164). The probe strips it before it
    launches anything that may crash.

## 1. The answer first

| # | What | One line |
| --- | --- | --- |
| 1 | The cure (item 3, chosen with numbers) | `@parcel/watcher` runs only in a `utilityProcess` main forks (`out/main/watcher-process.js`); main never loads `watcher.node`; every site asks main's host, `watchFolder()`, which forwards to the process |
| 2 | One at a time (item 1) | Inside the process, ONE queue runs every subscribe and unsubscribe, FIFO, one native call in flight; a turn that waited past 2 s writes one line; main bounds every request (10 s to start a watch, 2 s to close one) and replaces a process that does not answer |
| 3 | Never a folder that may not exist (item 2) | The queue asks whether the folder is a directory at the op's turn, as the statement right before the native subscribe; a folder that is not there is "nothing to watch" (`null`), with no native call |
| 4 | A drop as the folder goes (new, measured) | A close whose folder is already gone waits 2 s before it joins the queue, never holding it, so the FSEvents thread's own stop runs first |
| 5 | A crash there | Main logs one line, starts a new process after a backoff, re-binds every live watch through the queue and tells each one, by an error `isRescanRequired` matches, that events were lost, so each consumer re-reads; after 5 exits in 10 minutes it stops trying, says so once, and the sites take their "not watching" paths |
| 6 | The quit | Once the app is quitting, a new watch is refused and a close settles in main at once; the process dies with main. `capabilities.ts` and `index.ts` do not move; the 3 s guard and the late drain keep their meaning |
| 7 | The gate (item 4) | `conformance:watcher` gains W365-1 to W365-10: one importer of the native module, main never loading it, the one queue, the check, the grace, the bounds, the fork's shape, the restart, the quit, the five sites; each with plants that read red alone; its budget rules follow the sites to `watchFolder(` |
| 8 | The proof | `probe:p365` (new): the storm through each build's own five sites (the parent faults main, HEAD does not, over research 143's run lengths), the storm with the drop already on its way, a quit mid-storm, the process killed and stopped, ordinary use counted, the real app with 20 projects and its quit, and the harvest's rescue with a stand-in |

### 1.1 The decisions, each with its reason

| Id | Decision | Reason (where it comes from) |
| --- | --- | --- |
| D1 | **The watcher runs in a `utilityProcess`; the queue and the existence check run inside it.** Item 3's "smaller cure" is the one that removes the faults at the storm's rate, and only this one does | The entry's item 3 ("chooses with the numbers") and §0.1 items 7 and 8. The queue and the check alone faulted main in 59 s (`q1`); with the new grace they faulted main in 60 s when the drop was already on its way (`qg2`). In the process, main never faulted in any shape (`u1` to `u4`). The in-main option (queue, check and grace, no process) is smaller and goes to him as §14 Q1 with its numbers. His word decides what follows: if the damage comes back with the watcher outside main, the watcher is cleared |
| D2 | **ONE queue, in the process, where the native calls are.** Every site reaches it through `watchFolder()`; no other code calls the native module | Entry item 1 ("one queue every site goes through"). The overlap it removes is real in ordinary use (17 in flight at a boot, `ord1`). In the process it closes the registry races of §0.1 item 2 (`getShared` on main against `removeShared` on a worker), because no main-thread `getShared` runs while a worker's `execute` can fail |
| D3 | **The existence check is in the queue, at the op's turn, synchronously right before the native subscribe** (`statSync(dir).isDirectory()`, no `await` between); `false` answers `null`, "nothing to watch", with no native call. Each site treats `null` as nothing to watch (D11) | Entry item 2. One check beside the native call is stronger than five a turn earlier (the worktree's is a git child earlier). Measured: 0 failed native subscribes in every queued run (1,164 answered `null` in `qg1`; the 7 refused in `u4` were requests in flight when its process crashed) against 10% at the parent. The remaining window (a folder removed by another process between the check and the worker's own `stat`) is microseconds; with the queue, no main-thread `getShared` can race the worker's `removeShared` there |
| D4 | **A close whose folder is already gone waits `WATCH_GONE_GRACE_MS` (2,000) before it is queued, and the wait never holds the queue.** Not at quit (D8) | NEW, measured: `q1` (no grace) faulted in 59 s; `qg1` (the grace) ran 600 s clean with 2,587 folders removed; `u2` (the grace in the process) ran 300 s with no process crash. The FSEvents thread stops a deleted root's stream itself (`FSEventsBackend.cc:189-191`) within its 1 ms latency plus delivery, so a worker's stop issued 2 s later finds `state` already null (`:332-337`). Holding the queue for it would back up every other op (the spec step's first child prototype did, and was rewritten) |
| D5 | **Bounded waits, each with one log line.** (a) The queue notes a turn that waited past `WATCH_TURN_NOTE_MS` (2,000), at most once a minute per kind; main writes it at scope `watcher`. (b) Main bounds every request: `WATCH_START_REPLY_MS` (10,000) for a watch, `WATCH_CLOSE_REPLY_MS` (2,000) for a close; past either, one line, the process is replaced (ended, and started again unless quitting), and every request it held settles (a watch → `null`, a close → done) | Entry item 1 ("a bounded wait and a log line on a timeout"). The close bound sits under the disposer's 3 s wedge guard (`capabilities.ts:970`), so a wedged process can never hold the quit's drains: its closes settle inside the guard, and the late drain (`:1093`) finds none pending. A wedged FSEvents in main today takes the late drain and SIGKILL (Phase 36); after this phase it costs at most 2 s and replaces the process |
| D6 | **Restart.** An unexpected exit is one line (its code); a new process after a backoff (250 ms, 1 s, 5 s, 30 s, by consecutive exits); every live watch re-bound through the queue (so the check runs again); each live callback handed ONE `new Error(WATCHER_RESTART_ERROR)`, whose text ends "File system must be re-scanned." so `isRescanRequired` (`repo-watcher.ts:166-168`) matches it. After 5 exits within 10 minutes: no more restarts, one line, every later `watchFolder()` answers `null` and live watches stay quiet (the sites' "not watching" paths). No restart once the app is quitting | Measured in `u1`/`u3`: 6 crashes, each replaced (59 to 157 ms to ready) with every watch re-bound in 1 to 4 ms. A consumer must re-read because events between the crash and the re-bind are lost; the drop notice is the signal every consumer already answers (RepoWatcher's Phase 151 re-read; D10 for the two configuration watches; the harvest's poll). Giving up keeps a crash loop from spinning a process forever; at the measured ordinary rates it is never reached |
| D7 | **The fork's shape.** `utilityProcess.fork(join(__dirname, 'watcher-process.js'), [], { env: { TORTIE_WATCHER: '1' }, stdio: 'ignore', serviceName: 'Tortie Watcher' })`, forked lazily at the first `watchFolder()`. In plain node (vitest, the tsx probes), where `process.versions.electron` is undefined, the host runs the SAME queue in-process through a dynamic `import('./process/in-process')`, so main's built bundle never requires `@parcel/watcher` at load | `stdio` a string, never an array: Electron PR #53278 (in 43.5.0, not 43.3.0) fixes an out-of-bounds index for a short stdio array (research 143 §2.5). `env` one named variable, never `{}`: Electron 43 reads `{}` as unset and hands the child main's whole environment (Phase 330's measurement, `src/main/pocket/bind.ts:181-202`, the house shape). Lazy, because a launch that never watches pays nothing. The in-process path keeps every existing vitest and native test running over the same queue without a test seam in production |
| D8 | **The quit moves nothing in `capabilities.ts` or `index.ts`.** Once `appLifecycleState() === 'quitting'` (`src/main/lifecycle.ts`), `watchFolder()` answers `null`, `FolderWatch.close()` settles in main at once and posts the close without waiting, no grace applies, and the process is never restarted; the process dies with main | §0.1 item 11: gone 3 ms after main's SIGKILL, exit 0 with a normal quit. Main holds no native watcher state, so nothing queued in main can meet `node::FreeEnvironment` (the Phase 36 abort, measured again at the parent: `mq1`, `napi_fatal_error`). The 3 s guard still bounds the `allSettled` it guards and the late drain still waits for any tracked close; a watcher now leaves none, so the late drain's SIGKILL is never reached for a watcher. Not touching `capabilities.ts` also keeps this phase off Phase 359's hunks there |
| D9 | **Events while a watch waits its turn.** A stream that starts later sees nothing before it starts. `FolderWatch.startedAfterMs` is main's measure from the ask to the stream's start; a RepoWatcher whose worktree watch took longer than its debounce window (`DEFAULT_DEBOUNCE_MS`, 300) schedules one flush; the two configuration watches reload once when theirs took longer than their `WATCH_DEBOUNCE_MS` (300, `config/store.ts:85`, `machines/store.ts:79`); the harvest's poll already covers its roots | No regression: at the parent the window between a site's read and its stream's start is the native call's few milliseconds; behind a queue at a boot burst it can be longer. One re-read is what a person needs to see an edit made in that window |
| D10 | **The configuration watches answer a re-scan.** Their callbacks return on any error today (`config/store.ts:397`, `machines/store.ts:435`); each now schedules its debounced reload when `isRescanRequired(err)`, and returns otherwise | D6's restart notice must reach them, and an FSEvents drop in the configuration folder, ignored there today, is the same "events were lost". RepoWatcher has answered drops this way since Phase 151 |
| D11 | **The five sites, and their `null`.** The worktree: `null` rejects `RepoWatcher.watch` with `"<path> is not there"`, which `ensureWatcher` logs as today. The dotgit watch: `null` is "no `.git` (yet)", retried on the next flush as today. The configuration watches: `null` is today's warn and `false`. The harvest: `null` is "the poll covers it"; its `existsSync` stays. Every close goes through `FolderWatch.close()`, which the host tracks (`trackWatcherClose`), so a site does not track it again | Entry item 2's "treats a vanished folder as nothing to watch", at each site, with today's words and outcomes. "No change to what Tortie watches": the same folders, the same ignore arrays (the planner still runs in main, `planWorktreeIgnore`; RegExps travel as flagless sources and are rebuilt in the process, `wrapper.js` refusing any flag) |
| D12 | **The gate.** `conformance:watcher` gains W365-1 to W365-10 (§7.1), each with in-memory plants red on it alone, and its rules 1 and 2 (the eight-path budget) follow the sites from `watcher.subscribe(` to `watchFolder(`, so the budget is still counted where the ignore arrays are written | Entry item 4. Phase 347's W347 rules are the house shape (rules over comment-blanked source, plants that must read red). The behaviour of the queue is DRIVEN by `build/watcher-conformance-probe.mts` over a fake native module, because "one at a time" is a property of runs, not of text |
| D13 | **The import wall.** `build/assert-import-boundaries.mjs` gains an allow-only wall: `main/watcher/watcher-process.ts` and `main/watcher/process/` may import `node:fs` and `node:path`, `main/watcher/process/` itself, and (W365-1 reads it) no package but `@parcel/watcher`; no electron, no logger, no other main module | Phase 330's door wall is the precedent. The process holds no credential, no manifest and no session; what it needs arrives as a message (`process/wire.ts`) |
| D14 | **Packaging.** `build/assert-main-requires.cjs`'s `BUNDLES` gains `out/main/watcher-process.js`, so the packed app proves `@parcel/watcher` is inside it for the process; the packaged launch (§10.1) proves the helper loads `watcher.node` under the hardened runtime with no new entitlement (`lsof` on the packaged process) | Refusal 6 holds: no native code enters the bundle that is not there today; the same `watcher.node` is loaded by another process of the same signed app. The helpers inherit `build/entitlements.mac.inherit.plist` (no `disable-library-validation`), and `watcher.node` is unpacked (`asarUnpack: "**/*.node"`) and signed with the app's identity, so library validation should pass; only a packaged launch proves it |
| D15 | **No new words a person reads.** The process's lines are app.log only, scope `watcher`; `serviceName` `Tortie Watcher` is what `app.getAppMetrics()` names | Just enough words |

## 2. What the spec step measured, how, and the numbers

Every Electron ran through `build/electron-run.mjs`'s `withElectron` (`program: 'app'`, `cwd` the storm app, `tmuxSocket:
null` with `GMUX_TMUX_SOCKET` blanked, so no tmux and no census) inside `build/harness-socket.mjs --fresh gmux-p365s`,
by `zsh -f lockrun.sh <run> …` (a lock slot taken and released by a trap; `HOME`/`ZDOTDIR`/`TMPDIR` in scratch,
`HISTFILE=/dev/null`, `SHELL=/bin/sh`, the terminal variables unset; the tokens and sockets of §0 were inherited by these
runs, which is why every dump was deleted after its reading and the runner now unsets them). Every other command ran
under the history block. His history read `743319 1794200266` and `23166 1790702242`
before and after every run. His reports folder held 34 names (105 files with its subfolders) before the first run and
after the last; every run's `reportsAdded` was 0.

**The storm** (`app/main.js`): 12 slot folders under the run's scratch root; every 60 ms one subscribe (to a slot, made
if absent; `P365_FAIL_PCT` of them to a folder that was never made, the failed subscribe) and one unsubscribe (of a live
watch; `P365_DEL_PCT` of them with its slot folder removed by `rmSync`, `before` the drop or `after` it in the same turn);
every 10 ms a file written, a folder made or a folder removed inside a slot; with `P365_KEEP=1` one watch held for the
whole run, as Tortie holds its configuration folder's, so the shared backend and its FSEvents thread live throughout.
That is 16.7 subscribes and 16.7 unsubscribes a second, research 143's rate. The product storm (`product-entry.ts`,
bundled by the worktree's esbuild from `src/main` at `ce4c77f6`) drives the parent's OWN five sites every 180 ms: a
project watch started (`RepoWatcher.watch`, two native subscribes; 10% with the folder removed while it reads its
ignored roots), one closed (`dispose()`; 30% with its folder removed first), and a codex rescue watch armed
(`watchForSessionId('codex', …)` over a scratch `CODEX_HOME`, two roots) or cancelled, beside the two configuration
watches (`initAgentOverlay()`, `initMachines()`) held for the run; about 17 native subscribes and 17 unsubscribes a
second. A fault is graded by the app's own exit signal and by the dump Crashpad wrote in the run's scratch profile, read
by `minidump.mjs` (exception, the crashing thread's frame-pointer walk, every other thread that was inside
`watcher.node`, names from `nm` of the shipped `watcher.node` and Electron's breakpad FUNC records).

### 2.1 The library, the parent's call pattern (the shipped `watcher.node` in a scratch Electron 43.3.0 main)

| Run | Shape (FAIL %, DEL %, order, held watch) | Ended | After | Subscribes (failed) | Folders removed | The fault, from the dump |
| --- | --- | --- | --- | --- | --- | --- |
| pilot1 | 10, 30, before, no | SIGTRAP | 5 s | 82 (13) | 14 | `FreelistCorruptionDetected` ← `ThreadCache::~ThreadCache` at a thread's exit, main in `Backend::~Backend` ← `PromiseRunner::onWorkComplete` (the backend torn down when no watch was left) |
| rawk1 | 10, 30, before, yes | SIGTRAP | 8 s | 131 (14) | 37 | CoreFoundation trap ← FSEvents ← `FSEventsCallback+0xb60` on the FSEvents thread (#271's stop) |
| rawk2 | 10, 30, before, yes | SIGTRAP | 59 s | 969 (100) | 274 | `FreelistCorruptionDetected` ← `ThreadCache::PurgeInternal` ← a free in `Watcher::isIgnored` (FSEvents thread) |
| abA1 | 10, 0, —, yes | exit 0 | 300 s | 4,912 (503) | 0 | none |
| abB1 | 0, 30, before, yes | SIGTRAP | 60 s | 968 (0) | 268 | `FreelistCorruptionDetected` ← `PurgeInternal` ← `Watcher::isIgnored` |
| abC1 | 0, 0, —, yes | exit 0 | 300 s | 4,911 (0) | 0 | none |
| mq1 | 0, 0, —, yes; quit mid-storm, 8 `pbkdf2` jobs holding the pool | SIGABRT | at the quit (21 s) | 310 (0) | 0 | `napi_fatal_error` ← `watcher.node` on CrBrowserMain (research 143's third fault, Phase 36's) |

### 2.2 The entry's items 1 and 2 in main (the spec step's prototype: one FIFO queue, the check at the turn)

| Run | Shape | Ended | After | Subscribes (`null`, failed) | Folders removed | The fault |
| --- | --- | --- | --- | --- | --- | --- |
| q1 | queue + check; 10, 30, before | SIGTRAP | 59 s | 968 (119, 0) | 253 | `FreelistCorruptionDetected` ← `PurgeInternal` ← `Watcher::isIgnored` |
| qg1 | queue + check + 2 s grace; 10, 30, before | exit 0 | 600 s | 9,843 (1,164, 0) | 2,587 (each drop graced) | none; the queue's longest turn 45 ms, never more than 3 waiting |
| qg2 | queue + check + 2 s grace; 10, 30, **after** | SIGTRAP | 60 s | 984 (105, 0) | 266 | `FreelistCorruptionDetected` ← `PurgeInternal` ← `Watcher::isIgnored` |

### 2.3 The parent's own five sites (`src/main` at `ce4c77f6`, bundled), the storm and ordinary use

| Run | Shape | Ended | After | Project watches started (failed) / closed | Rescues armed / cancelled | Folders removed | The fault |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p1 | the product storm, 10, 30, before | SIGTRAP | 60 s | 326 (32) / 293 | 174 / 152 | 113 | `FreelistCorruptionDetected` ← `PurgeInternal` ← `Watcher::isIgnored` (FSEvents thread) |
| p2 | the same, another seed | SIGTRAP | 60 s | 326 (24) / 301 | 165 / 161 | 106 | the same |

Ordinary use (`ord1`, the same sites, the native module counted by a `Module._load` wrapper in main, exit 0):

| Phase | Native subscribes | Unsubscribes | Most in flight at once | Time |
| --- | --- | --- | --- | --- |
| boot: 20 projects, the two configuration watches, 5 rescues | 52 | 0 | 17 | 57 ms |
| 20 s, one edit a second | 0 | 0 | 0 | 20 changes seen |
| 10 projects closed at once | 0 | 20 | 10 | 2 ms |
| a branch switched in 5 repositories | 0 | 0 | 0 | 5 changes seen |
| 5 rescues settled | 0 | 10 | — | — |
| the quit's closes (10 projects, the two configuration watches) and the drain | 0 | 22 | — | 10 ms, 0 left |

### 2.4 The watcher in a `utilityProcess` (the spec step's prototype: `app/watcher-child.js`, main re-binding on a restart)

| Run | Inside the process | Order | Main | Process crashes (when, after its fork) | Ready after fork | Re-bound | Latency P50 / P90 / P99 / max | Resident (main, process) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| u1 | the parent's overlapping calls | before | exit 0, 300 s | 5 (60, 76, 47, 49, 60 s): 3 freelist checks ← `Watcher::isIgnored`/`FSEventsCallback`, 1 CoreFoundation trap ← `FSEventsBackend::unsubscribe` on `libuv-worker`, 1 ← `FSEventsCallback` | 59 to 157 ms (first 70) | 2 to 4 watches in 1 to 4 ms | — | — |
| u3 | the parent's overlapping calls; main ended by SIGKILL at 120 s | after | SIGKILL (by design) | 1 (60 s): freelist check | 60 / 73 ms | 2 in 1 ms | 68 / 107 / 190 / 319 ms (1,170) | 102–105 MB, 59–65 MB; the process gone 3 ms after main |
| u2 | queue + check + 2 s grace | before | exit 0, 300 s | **0** | 62 ms | — | **67 / 96 / 174 / 277 ms (2,967)** | 102–108 MB, 60–69 MB |
| u4 | queue + check + 2 s grace | after | exit 0, 300 s | 1 (26 s): freelist check ← a free from FSEvents | 57 / 64 ms | 2 in 1 ms | 70 / 105 / 191 / 304 ms (2,953) | 102–109 MB, 59–69 MB |
| rl1 | (the baseline: the watcher in main, no faulting shape) | — | exit 0, 120 s | — | load 3 ms | — | **67 / 99 / 173 / 255 ms (1,176)** | 103–108 MB, — |

The latency is a file written every 100 ms into the held folder, timed from its name to its event in main; the watcher's
own debounce (50 to 500 ms, `src/Debounce.hh:9-10`) is most of it, and the process adds nothing measurable.

### 2.5 The trade, as costs a person meets (for §14 Q1)

| | A storm of folders created and removed while watched | A watched folder removed as Tortie stops watching it | Ordinary use | Cost |
| --- | --- | --- | --- | --- |
| Today (the parent) | main's heap damaged within 5 to 60 s, then Tortie crashes | the same | bursts of up to 17 overlapping native calls at a boot | — |
| In main: queue + check (the entry's items 1, 2) | Tortie crashes within 59 s | the same | no overlap | small |
| In main: queue + check + grace (Q1's other choice) | clean for 10 minutes | Tortie crashes within 60 s | no overlap | small |
| **The watcher in its own process, with the three inside (D1, the default)** | Tortie never crashed; the watcher process did not crash in 5 minutes | Tortie never crashed; the watcher process crashed and was replaced, its watches re-read (u4) | no overlap; events as fast | one more process, about 60 to 70 MB, about 70 ms at the first watch |

### 2.6 The spec step's commands, exit codes and numbers

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `stat -f '%z %m' ~/.zsh_history ~/.bash_history` (start, and in every lockrun before and after) | 0 | | `743319 1794200266`, `23166 1790702242` every time |
| `df -h /` | 0 | | 87 GiB free |
| `git log`, `git status`, `git rev-parse HEAD` in the worktree (history block) | 0 | | `ce4c77f6…`, clean |
| reads of the five sites, the drains, the watcher's 2.6.0 source, the gates (history block) | 0 | | §0.1 |
| WebFetch: issue #271, the releases page, npm's `@parcel/watcher`, Electron v43.3.0's assets; #259 as issue and as pull | 0; #259 404 twice | | §0.1 item 10 |
| `curl` Electron 43.3.0's darwin-arm64 symbols (history block), `unzip` of the framework's file, `grep` FUNC/PUBLIC | 0 | ~1 min | 127,601,353 bytes; 692,190 records; the 731 MB `.sym` deleted after the grep |
| `esbuild product-entry.ts --bundle` (the worktree's own esbuild, history block), twice | 0, 0 | < 1 s | 311 and 315 KB, `@parcel/watcher`, `better-sqlite3`, `electron`, `node-pty` external |
| `zsh -f lockrun.sh` × 18 runs (pilot1, rawk1, rawk2, abA1, abB1, abC1, q1, qg1, qg2, u1, u2, u3, u4, rl1, p1, p2, mq1, ord1), and one more attempt that found no free slot (exit 75, nothing ran) | 0 for every run (the harness's own exit), the app's exit as §2.1 to §2.4 | 8 s to 10 min | §2.1 to §2.4; lock slots `electron.lock`, `.lock2`, `.lock3`, each released by its trap |
| `kill -TERM` two idle drivers of this step (`rawk1`, `rawk2`, their command lines read first; their Electrons already ended) | 0 | | a driver bug (an uncleared ceiling timer) held two slots; fixed in the driver |
| `node minidump.mjs` over every dump, then `rm` of each dump (history block) | 0 | | 16 dumps read (9 of main, 7 of the watcher process), 16 removed after their readings were in `report.json`; 0 left |
| the Electron count (CLAUDE.md's command, outside the block, once, at the end) | 0 | | none of this phase's: his Tortie (pid 692) and its crash handler (2727), and Slack's, Chrome's, Granola's and Cursor's crash handlers; no `p365` socket under `/private/tmp/tmux-501/`; all three lock slots free; his reports folder 34 names and 105 files, identical by name and time; the scratch 353 MB by `du` (the symbols download and its extract most of it) |

## 3. The tree at this head: the paths each item touches

**The process and its host (items 1 to 3, D2 to D8).** New: `src/main/watcher/process/wire.ts`,
`src/main/watcher/process/queue.ts`, `src/main/watcher/process/in-process.ts`, `src/main/watcher/watcher-process.ts`,
`src/main/watcher/host.ts`. Edited: `src/main/watcher/index.ts` (exports), `electron.vite.config.ts` (`rollupOptions.input`
gains `'watcher-process'`, beside `'pocket-door'`, `:65-104`), `build/assert-main-requires.cjs` (`BUNDLES`). Read and
unchanged: `src/main/watcher/teardown.ts` (`trackWatcherClose` is what the host wraps every close in),
`src/main/lifecycle.ts` (`appLifecycleState`), `src/main/pocket/bind.ts:181-202` (the fork's house shape).

**The five sites (D9 to D11).** `src/main/watcher/repo-watcher.ts` (`:66-67` imports, `:266-267` the two subscription
fields, `:345-355` the worktree watch, `:371-400` `dispose`, `:536-566` the dotgit watch);
`src/main/config/store.ts` (`:34` import, `:392-428` `startAgentOverlayWatch`); `src/main/machines/store.ts` (`:32`
import, `:430-465` `startMachinesWatch`); `src/main/manifest/harvest/watch.ts` (`:41` import, `:524` the subscription
list, `:553-564` `cleanup`, `:930-945` `subscribeTo`). Unchanged and read: `src/main/git/ipc.ts`, `src/main/sessions/
id-harvest.ts`, `src/main/sessions/core.ts`, `src/main/capabilities.ts`, `src/main/index.ts`.

**The gate (item 4).** `build/conformance-watcher.mjs` (its scanner `scanSource` `:203`, rules 1 and 2 from `:332`, the
probe call `:382`, the W347 block from `:486` with its plants `:677-747`, the tables from `:750`),
`build/watcher-conformance-probe.mts`, `build/assert-import-boundaries.mjs` (`ALLOW_ONLY_WALLS` `:368-383` and its
fixtures `:784+`).

**The probe.** `build/p365/` (new), `package.json`'s scripts.

**Gates that read these files as text** (each must still read green): `conformance:derived` reads `harvest/watch.ts`'s
prose and the shapes of `consider()` and `scan()` (`build/conformance-derived.mjs:511-523`, `:662-672`); keep them.
`conformance:samefolder` names `repo-watcher.ts` and `harvest/watch.ts` among the canonical-path callers and holds
`isRescanRequired` as a named case-insensitive exception in `repo-watcher.ts` (`build/p274/conformance-samefolder.mjs:
783-791`, `:1216-1220`), and its rule 23 reads every new file under `src/main/watcher/`: nothing new may fold case or
normalise a path. `conformance:pocket` U5 reads the built chunks `out/main/pocket-door.js` requires, and
`electron.vite.config.ts` is in its trigger list: the new entry must share no chunk with the door.

**No sentence anywhere names Phase 365 today** (`grep -rn "Phase 365"` outside the backlog: none).

## 4. The design, item by item (real paths; the builder named on each)

### 4.1 The wire, the queue, the process and the host (builder `process`)

`src/main/watcher/process/wire.ts` — the messages both sides speak, and one parser each way that drops a malformed
message whole and counts it (the house shape: `src/main/pocket/door/wire.ts`). To the process:
`{ kind: 'watch', req: number, dir: string, ignorePaths: string[], ignorePatterns: string[] }` (patterns are flagless
RegExp sources) and `{ kind: 'close', req: number, sub: number }`. From it: `{ kind: 'ready' }`;
`{ kind: 'watching', req, sub: number | null, waitedMs: number }` (`null`: nothing to watch);
`{ kind: 'refused', req, error: string }` (the native subscribe threw); `{ kind: 'closed', req }`;
`{ kind: 'events', sub, error: string | null, events: { type: 'create' | 'update' | 'delete', path: string }[] }`;
`{ kind: 'note', what: 'turn-wait', op: 'watch' | 'close', waitedMs: number, behind: number }`. No other field, no
other kind; a path is passed as written and never case-folded or normalised.

`src/main/watcher/process/queue.ts` — `createWatchQueue(deps)` with `deps = { native, exists, now, setTimeout, note }`,
pure and electron-free (the gate and vitest drive it over fakes). Exports `WATCH_GONE_GRACE_MS = 2_000` and
`WATCH_TURN_NOTE_MS = 2_000`. `watch(dir, ignore, onEvents)` and `close(sub)` each return a promise; ONE chain (FIFO),
ONE native call in flight. At a watch's turn, the FIRST statement of the turn asks `deps.exists(dir)` and, when false,
returns `{ sub: null, waitedMs }` without calling `deps.native.subscribe`; when true, the next statement is the native
subscribe, with no `await` between them. A `close(sub)` whose watch's folder is not there (asked when the close is
made) is put on the chain only after `WATCH_GONE_GRACE_MS`, by a timer, so the wait holds nothing else. A turn that
waited longer than `WATCH_TURN_NOTE_MS` calls `deps.note(...)` (at most once a minute per kind). A native subscribe
that throws answers `refused` with its message; the queue keeps no other state about it.

`src/main/watcher/watcher-process.ts` — the entry, emitted as `out/main/watcher-process.js`. It reads
`process.parentPort` (typed locally, as `door-process.ts` does), loads `@parcel/watcher` (a namespace import, so every
test's mock shape works) and builds the queue with `exists = (d) => { try { return statSync(d).isDirectory(); } catch {
return false; } }`, the real clock and timers, and `note` posting a `note` message. A `watch` message becomes
`native.subscribe(dir, cb, { ignore: [...ignorePaths, ...ignorePatterns.map((s) => new RegExp(s))] })`; every batch of
events is posted with its subscription id. It imports only `node:fs`, `node:path`, `@parcel/watcher` and
`./process/*` (D13), reads nothing from its environment, writes no file and starts nothing. If `parentPort` is absent it
exits 1, as the door does.

`src/main/watcher/process/in-process.ts` — the same queue over `await import('@parcel/watcher')`, answering the host's
messages through an in-memory port. It is reached ONLY by `host.ts`'s dynamic `import()` when
`process.versions.electron === undefined` (D7).

`src/main/watcher/host.ts` — main's side, the one module the five sites call:

```ts
export interface FolderEvent { type: 'create' | 'update' | 'delete'; path: string }
export type FolderEvents = (err: Error | null, events: FolderEvent[]) => void;
export interface FolderWatch { readonly dir: string; readonly startedAfterMs: number; close(): Promise<void> }
export async function watchFolder(
  dir: string,
  options: { ignore?: readonly (string | RegExp)[] },
  onEvents: FolderEvents
): Promise<FolderWatch | null>;
export const WATCH_START_REPLY_MS = 10_000;
export const WATCH_CLOSE_REPLY_MS = 2_000;
export const WATCHER_RESTART_BACKOFF_MS: readonly number[] = [250, 1_000, 5_000, 30_000];
export const WATCHER_GIVE_UP_EXITS = 5;
export const WATCHER_GIVE_UP_WINDOW_MS = 600_000;
export const WATCHER_RESTART_ERROR = 'The file watcher restarted. File system must be re-scanned.';
export function watcherProcessObservation(): { pid: number | null; restarts: number; gaveUp: boolean; live: number };
```

It forks lazily (D7), keeps every live watch by its own handle (dir, ignore, callback, the process's id for it), maps
events to callbacks by the CURRENT process's id, re-binds on a restart (D6), bounds every request (D5), refuses and
settles at quit (D8), splits each ignore entry into a plain path or a flagless RegExp source (a RegExp with a flag is
refused before it leaves main, as `wrapper.js` would), and wraps every `close()` in `trackWatcherClose` itself. Its log
lines (scope `watcher`, `getLog`): the process exited (code), restarted (generation, watches re-bound), gave up, a turn
note, a reply bound passed. Its lines name no watched path, only counts, codes and generations (the sites' own lines,
which name their folders today, are unchanged).
`watcherProcessObservation()` is read by nobody new in this phase (the diagnostics report's `pendingWatcherCloses` is
unchanged); it is there for the probe and the tests.

`electron.vite.config.ts`: `'watcher-process': resolve(__dirname, 'src/main/watcher/watcher-process.ts')` in
`main.build.rollupOptions.input`, with a comment like `pocket-door`'s. `build/assert-main-requires.cjs`: `BUNDLES` gains
`'out/main/watcher-process.js'`.

### 4.2 The five sites (builder `sites`)

`repo-watcher.ts`: `watchFolder(rw.watchRoot, { ignore: plan.ignore }, (err, events) => rw.handleWorktreeEvents(err,
events))`; `null` → `throw new Error(\`${repoPath} is not there\`)`; when `startedAfterMs > rw.debounceMs`, one
`scheduleFlush()` after the dotgit attach. The dotgit watch: `watchFolder(gitDir, { ignore: [the five joins] }, …)`;
`null` → return (retried on the next flush, as today). The two fields become `FolderWatch | null`; `dispose()` awaits
`close()` for each (no second `trackWatcherClose`); the "disposed during subscribe" close stays, through `close()`.
The ignore literal of five plain paths stays a literal in the call (rule 1 counts it).

`config/store.ts` and `machines/store.ts`: `watchFolder(dir, {}, cb)`; `null` → today's warn and `false`; the callback
schedules its debounced reload when `isRescanRequired(err)` (imported from `../watcher`), returns on any other error,
and is otherwise unchanged; when `startedAfterMs > WATCH_DEBOUNCE_MS`, one reload is scheduled as the watch starts;
`watchStop = () => sub.close()`.

`harvest/watch.ts`: `watchFolder(dir, {}, onEvents)` in `subscribeTo`; `null` → return; the `existsSync` at `:932`
stays; `subscriptions` becomes `FolderWatch[]`; `cleanup` and the settled-during-start branch call `void sub.close()`.
Nothing else in the file moves: the poll, the claims, the prose `conformance:derived` reads.

### 4.3 The gate (builder `gate`)

`build/conformance-watcher.mjs` gains W365-1 to W365-10 (§7.1) in the shape of the W347 block (rules over
comment-blanked source, a plant list, each plant red on its own rule, a stale anchor a failure). Its scanner follows the
sites: rule 1 counts the plain entries of every `watchFolder(` call's `ignore` literal, rule 2 requires a computed
`ignore` to come from `planWorktreeIgnore` in the same file, and the "a gate that finds nothing must fail" floor stays
(five `watchFolder(` call sites; four files). `build/watcher-conformance-probe.mts` gains a drive of
`process/queue.ts` over fakes and prints its facts as JSON for the gate. `build/assert-import-boundaries.mjs` gains
D13's wall and fixtures that prove it refuses (an `electron` import, a `../log` import, a `node:child_process` import, a
second package) and allows (`node:fs`, `./process/queue`).

### 4.4 The probe (builder `probe`)

`build/p365/probe-p365.mjs`, `build/p365/fixtures/**`, `build/p365/CHECKLIST.md`, §8. The builder does not run the long
arms (the verifiers do); it runs `--grader-self-test`, `--preflight` and one short arm of each kind under a lock slot.

## 5. Words

No new string a person reads. One CHANGELOG item under `## Unreleased`, `### Fixed`, below the items already there, in
his style, the commit link added by the follow-up docs commit:

`- Watching folders for changes now runs in its own process, so a fault there no longer crashes Tortie`

(If he prefers no item, §14 Q4.)

## 6. What moves on purpose

Nothing in the contract: `docs/audits/contract-baseline.txt` must read byte for byte (`node build/contract-inventory.mjs
--check`), and a diff is a finding (the probe's constants are not named `GMUX_*`: Phase 359's integrator, decision 1).
`HELPER_USER_FLOOR` rises 186 → 187 (obligation 1). `conformance:watcher` moves from its rules and 24 W347 plants to
those plus W365-1 to W365-10 and their plants (the builder reports the count). Tortie runs one more process,
`Tortie Watcher`, whenever anything is watched; main no longer loads `watcher.node`.

## 7. The gates

### 7.1 `conformance:watcher` (`build/conformance-watcher.mjs`, builder `gate`), widened

| Rule | Holds | Its plants (each red on this rule alone) |
| --- | --- | --- |
| W365-1 | Under `src/`, `@parcel/watcher` is imported at run time by `src/main/watcher/watcher-process.ts` (static) and `src/main/watcher/process/in-process.ts` (a dynamic `import()` only) and by nothing else; a type-only import is allowed anywhere; the process's package imports are exactly that one | a static import planted in `repo-watcher.ts`; a `require('@parcel/watcher')` in `host.ts`; `in-process.ts`'s import made static; `import watcher from '@parcel/watcher'` in `config/store.ts` |
| W365-2 | Main never loads it: `host.ts` reaches `./process/in-process` only through `await import(` inside `if (process.versions.electron === undefined)`; when `out/` exists, `out/main/index.js` and every chunk it requires at load name no `@parcel/watcher` (else `skipped: no build`) | the condition inverted (`!== undefined`); the import made static; the branch removed (in-process always) |
| W365-3 | ONE queue: in `process/queue.ts`, `native.subscribe(` and `.unsubscribe(` each appear once, inside the turn; DRIVEN: 400 mixed ops over a fake native that records overlap read `maxInFlight` 1 and FIFO order | the chain replaced by a direct call; `Promise.all` over a batch; a second call site of `native.subscribe(` outside the turn |
| W365-4 | The existence check: `deps.exists(` is the first statement of the watch turn and the native subscribe the next, no `await` between (read with the TypeScript parser); DRIVEN: a false `exists` returns `null` and the fake native is never called | the check removed; an `await` inserted between the check and the subscribe; the check moved before the turn (asked when the watch is made) |
| W365-5 | The grace: `WATCH_GONE_GRACE_MS` is a top-level numeric literal ≥ 1,000; DRIVEN: a close whose folder is gone is not on the chain before the grace, and a watch made during the grace completes before it | the grace awaited inside the turn; the grace removed; `WATCH_GONE_GRACE_MS = 0` |
| W365-6 | The bounds: `WATCH_TURN_NOTE_MS` ≥ 1,000; `WATCH_CLOSE_REPLY_MS` < the disposer's wedge guard, read as the literal in `capabilities.ts`'s `afterMs(` before `disposeGitIpc()`; `WATCH_START_REPLY_MS` ≤ 30,000; each bound's expiry in `host.ts` writes one log line and replaces the process (DRIVEN over a fake process that never answers) | the close bound raised to 3,000; the log line removed; the replacement removed (the late request settles nothing) |
| W365-7 | The fork: `utilityProcess.fork(` once, in `host.ts`, its options an object literal with `stdio: 'ignore'`, `env` an object literal of exactly one property `TORTIE_WATCHER`, a `serviceName`, and the path `join(__dirname, 'watcher-process.js')` | `env: {}`; `env: { ...process.env }`; `stdio: ['ignore', 'pipe', 'pipe']`; a second `utilityProcess.fork(` |
| W365-8 | Restart (DRIVEN over a fake process): an unexpected exit re-binds every live watch and hands each callback exactly one `Error` whose message is `WATCHER_RESTART_ERROR`, which `isRescanRequired` matches; the backoff is the table's; after `WATCHER_GIVE_UP_EXITS` within the window no fork follows; no fork once quitting | the notice removed; the re-bind removed; the quitting check removed; the give-up removed |
| W365-9 | The quit (DRIVEN, with the real `lifecycle.ts`): once quitting, `watchFolder()` answers `null` with no message sent, and `close()` settles before the process answers | the close awaited while quitting; a watch forwarded while quitting |
| W365-10 | The five sites: exactly the five known call sites call `watchFolder(` (file and enclosing function: `RepoWatcher.watch`, `startDotgitWatcher`, `startAgentOverlayWatch`, `startMachinesWatch`, `subscribeTo`), each tests its result against `null` before use, and no site wraps a `close()` in `trackWatcherClose` again | a site's `null` test removed; a sixth call site planted in `src/main/arch/watch.ts`; `trackWatcherClose(sub.close())` at a site |

Rules 1 and 2 keep their meaning over `watchFolder(` (the budget is still eight plain paths; the dotgit literal holds
five; the worktree's computed `ignore` still needs `planWorktreeIgnore`). The control copy reads green on every rule.

### 7.2 The path-triggered gates the changed files trigger (CLAUDE.md, read at this head)

| Changed | Gate |
| --- | --- |
| `src/main/watcher/**` | `conformance:watcher`; `conformance:watcher:cap` once (it measures the FSEvents cap, which no line here moves, and is the cap's no-regression) |
| `src/main/manifest/harvest/watch.ts` | `conformance:derived`; `conformance:resume:capture` is triggered and NOT run (it starts real agents, §0); probe arm RH and the harvest vitest files stand in for it |
| `src/main/config/store.ts` | `conformance:agents` |
| `src/main/machines/store.ts` | `conformance:machines` (no real ssh: its fake ssh and scratch folders) |
| `src/main/watcher/repo-watcher.ts`, `harvest/watch.ts`, every new file under `src/main/watcher/` | `conformance:samefolder` (rule 11's callers, rule 23 over the derived file set; it mounts a case-sensitive APFS image with `hdiutil`, detached in a `finally`) |
| `electron.vite.config.ts` | `conformance:pocket` (U5, the door's chunks) |
| `build/assert-import-boundaries.mjs`, `build/assert-main-requires.cjs` | `npm run typecheck` (the boundaries), `npm run package` (the requires gate runs at afterPack) |
| `build/p365/probe-p365.mjs` | `gate:electron` (the floor), `gate:background`, `gate:checks` (its classification), all inside `npm run build` |
| `src/main/capabilities.ts`, `src/main/index.ts`, `src/main/sessions/core.ts`, `src/shared/**` | **not touched**: the integrator confirms with `git diff --stat ce4c77f6 -- src/main/capabilities.ts src/main/index.ts src/main/sessions/core.ts src/shared` (empty) |

## 8. The app run: `probe:p365` (builder `probe`)

`package.json`: `"probe:p365": "node build/harness-socket.mjs --fresh gmux-p365 'node build/p365/probe-p365.mjs'"`. ONE
Electron at a time, the PARENT first in every pair (`P365_PARENT_CHECKOUT`, a `git clone --shared` checkout of `ce4c77f6`
with `node_modules` and `build/vendor` cloned by `cp -Rc` and `out/` built, or exit 2), each run on its own scratch profile, HOME and ZDOTDIR with
`HISTFILE=/dev/null` and `SHELL=/bin/sh`, the §0 variables unset before any launch. The storm arms launch a storm app the
probe WRITES into its run folder (never a file under `src/`), port the spec step's `app/main.js`, `driver.mjs` and
`minidump.mjs` (read them; do not import them), and bundle each build's own sites with that build's esbuild:
`product-entry.ts`'s imports pointed at the build's `src/main`, and at HEAD also `src/main/watcher/watcher-process.ts`
→ `<app>/watcher-process.js` beside the bundle, so `host.ts`'s `join(__dirname, 'watcher-process.js')` finds it. The
storm app sets `crashDumps` into its profile and starts Crashpad with `ignoreSystemCrashHandler: true` before anything
else, hides its Dock icon and opens no window. Three verdicts as `probe:p362`: each arm names `reads`, `needs` and
`clauses`; an absent field or an unmet need is UNREADABLE (exit 2), only a clause is FAIL; every reading from raw text
(the storm's `P365` lines, the dump reader's JSON, `lsof`, app.log, the fault trace) is derived by ONE pure function
that `--grader-self-test` drives over recorded raw fixtures (seed them from the spec step's
`…/spec/runs/*/report.json` and `stdout.txt`, which hold the readings and none of the dumps) as well as over recorded
readings, every clause shown red alone and every need shown unreadable alone. `--grader-self-test` and `--preflight`
start nothing. Every arm records `os.loadavg()` at its start, and his reports folder is read through
`userInfo().homedir`, never `homedir()`.

| Arm | Builds | What it drives | PASS at the parent | PASS at HEAD |
| --- | --- | --- | --- | --- |
| SP | both | the product storm (§2) through the build's own five sites, `P365_RUNS` runs (default 2) of `P365_STORM_MIN` minutes (default 20 at HEAD; the parent's runs stop at their first fault, at most 5 minutes each) | main ends by a signal in at least one run, the fault named from its dump (printed: which, after how long, in how many runs) | main exits 0 in every run; no dump of main; every process crash printed with its dump's top frames, each followed by a re-bind of every live watch within the backoff plus 1 s; no report in his folder |
| SA | both | SP with the folder removed as its watch is already being dropped (`after`), 2 runs | as SP | as SP (the process may crash; main may not) |
| SQ | both | the product storm for 20 s, then a quit with every watch dropped and 8 `pbkdf2` jobs holding main's pool (§2.1 `mq1`'s shape); the storm app first calls the build's own `markAppQuitting()` from the bundle, as Tortie's `before-quit` does | SIGABRT, `napi_fatal_error` on main named from the dump | exit 0; `lsof -p <main>` read during the storm never lists `watcher.node`, and the process's does |
| SK | HEAD | the product storm; at 30 s the probe sends SIGKILL to the watcher process (its own child, read by `ps` first); at 90 s SIGSTOP, and SIGCONT after 15 s | — | main never faults; one restart line, every live watch re-bound, each live callback handed one re-scan error; after SIGSTOP, the replacement within `WATCH_START_REPLY_MS` or `WATCH_CLOSE_REPLY_MS` of the first unanswered request, with one line; the stopped process ended by the host (read by `ps`) |
| SO | both | ordinary use (§2.3's `ord1`) through the build's own sites, the native module counted in main by a `Module._load` wrapper | 52 subscribes, up to 17 in flight in main (printed) | 0 native calls in main; every watch started; boot within 2× the parent's time plus the fork; the quit's closes settled within 2 s |
| RA | both | the real app (`out/`), a scratch profile, 20 scratch git repositories opened as projects through the window (the drive probe:p167 uses), one edit in each timed to its `EVT_GIT_CHANGED`, 10 tabs closed, a branch switched in 5, the menu's Quit row pressed in main (the preload of `probe:p362`) | printed: each latency, the quit's wall time, and that main holds `watcher.node` (`lsof`) | each latency within 100 ms of the parent's median; the quit's wall time within 250 ms of the parent's; `watcher.node` in the watcher process and NOT in main (`lsof`); the process gone after the quit; no dump; the census clean |
| RH | both | the real app with a stand-in `codex` on the scratch PATH (a `/bin/sh` script the probe writes, which writes one rollout record the codex descriptor accepts into `$CODEX_HOME/sessions/<Y>/<M>/<D>/` and sleeps), a session created, its id armed; quit; relaunch with the record written before the launch and the row unarmed (the boot rescue) | the id armed both times (printed) | the same ids as the parent's run, both times |
| RUN | — | the preflights, the hidden agents, the census, every pid ended, his history unmoved, no report in his folder since the run began, no Electron or watcher process of the run left, every dump deleted after its reading | | |

Defaults: `P365_ARMS=SP,SA,SQ,SK,SO,RA,RH`; `P365_KEEP=1` keeps every run folder (dumps deleted, readings kept);
`P365_EF_SYMBOLS` names a breakpad FUNC file for Electron Framework names (optional: without it a frame inside the
framework reads as an offset, and every clause grades on the `watcher.node` frames and the exit signal). Wall time: about
50 minutes at HEAD with the defaults (SP and SA dominate) and 15 at the parent.

`build/p365/CHECKLIST.md`: two plain lines for the operator's seat: while Tortie runs there is one more Tortie Helper
process (the builder reads which name Activity Monitor shows for it and writes that name), and none after Tortie quits;
editing a file in an open project still updates its Source Control list within a moment.

## 9. Builders, disjoint files

### 9.1 The table (every file in exactly one list; a builder that must edit a file not in its list stops and names it)

| Builder | Files it owns (and their tests) |
| --- | --- |
| `process` | NEW `src/main/watcher/process/wire.ts`, `src/main/watcher/process/queue.ts`, `src/main/watcher/process/in-process.ts`, `src/main/watcher/watcher-process.ts`, `src/main/watcher/host.ts`; EDIT `src/main/watcher/index.ts`, `electron.vite.config.ts`, `build/assert-main-requires.cjs`; tests NEW `src/main/watcher/__tests__/p365-queue.test.ts`, `p365-host.test.ts`, `p365-process.native.test.ts` |
| `sites` | EDIT `src/main/watcher/repo-watcher.ts`, `src/main/config/store.ts`, `src/main/machines/store.ts`, `src/main/manifest/harvest/watch.ts`; tests NEW `src/main/watcher/__tests__/p365-sites.test.ts`; EDIT, only where one breaks and with the reason named: `repo-watcher-contract.test.ts`, `repo-watcher-observation.test.ts`, `p347-excludes.test.ts` (in `src/main/watcher/__tests__/`), `src/main/config/__tests__/store.test.ts`, `src/main/manifest/__tests__/harvest-ownership.test.ts`, `harvest-claim-race.test.ts` |
| `gate` | EDIT `build/conformance-watcher.mjs`, `build/watcher-conformance-probe.mts`, `build/assert-import-boundaries.mjs` (its own run is its test) |
| `probe` | NEW `build/p365/probe-p365.mjs`, `build/p365/fixtures/**`, `build/p365/CHECKLIST.md` |
| integrator | `CLAUDE.md` (the `conformance:watcher` row `:330`, a new `probe:p365` row after `probe:p362`'s), `CHANGELOG.md`, `package.json` (`probe:p365`), `build/verification-checks.mjs` (classify `probe:p365`; the `conformance:watcher` paragraph), `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 186 → 187), `build/background-fixtures.mjs` (only if a new shape needs it), `.gitignore` (only if the probe's raw fixtures hold a `*.log`, Phase 362's finding), `docs/audits/contract-baseline.txt` (only if a contract line moves, which none should), this file's §As built, and any file two builders both need |

### 9.2 The seams, stated exactly so the four build at once

- `process` exports from `src/main/watcher/host.ts` exactly the block in §4.1 (`watchFolder`, `FolderWatch`,
  `FolderEvents`, `FolderEvent`, the five constants, `WATCHER_RESTART_ERROR`, `watcherProcessObservation`), and from
  `src/main/watcher/process/queue.ts` `createWatchQueue`, `WATCH_GONE_GRACE_MS`, `WATCH_TURN_NOTE_MS` and the `deps`
  type `WatchQueueDeps`; `src/main/watcher/index.ts` re-exports the host's names.
- `sites` imports `watchFolder`, `FolderWatch`, `FolderEvents` and `isRescanRequired` from `../watcher` (or
  `./host` inside `src/main/watcher/`), and builds against §4.1 as written; in its tests it may inject nothing into the
  host: the in-process path runs under vitest because `process.versions.electron` is undefined there.
- `gate` reads the names above, `planWorktreeIgnore`, `trackWatcherClose`, `utilityProcess`, `TORTIE_WATCHER`,
  `appLifecycleState`, `afterMs` and `disposeGitIpc` (in `capabilities.ts`, read only), and the five site functions of
  W365-10; it builds against §4 as written; where a builder's shape differs, the integrator reconciles.
- `probe` reads shipped behaviour only, and the host's log lines' words as `process` writes them (it reads them from
  `host.ts` at its preflight, never a copy).
- `src/shared/*`, `src/main/capabilities.ts`, `src/main/index.ts` and `src/main/sessions/core.ts` are untouched.

### 9.3 The builders' briefs

- **`process`**: §4.1. The queue's tests over fakes (FIFO, one in flight across 400 mixed ops, the check's two answers
  and that a false one calls nothing, the grace not holding the chain, the note at the bound and its rate, a throwing
  native subscribe answering `refused`); the host's tests over a fake process (the fork's options, lazy fork, re-bind and
  the one notice per live watch after an exit, the backoff and the give-up, each reply bound's line and replacement, the
  quit's `null` and immediate close, a malformed message dropped and counted, no line naming a path); the native test
  through the in-process path over the real `@parcel/watcher` in scratch folders (a watch, an event, a close; a missing
  folder answered `null` with a spy showing no native call; a watch whose folder is removed and closed at once). Run
  `npm run build` once to see `out/main/watcher-process.js` emitted and requiring `@parcel/watcher`, and
  `out/main/index.js` not requiring it at load.
- **`sites`**: §4.2. `p365-sites.test.ts` drives each site through the in-process host over scratch folders: `null` at
  each (the worktree's rejection words, the dotgit retry, the configuration watches' `false`, the harvest's poll), a
  restart notice delivered through the host (RepoWatcher's flush and its observation's drop count; each configuration
  watch's one reload), a long start (RepoWatcher's one flush, each configuration watch's one reload), and that no site
  wraps `close()` again. Then `conformance:derived` and `conformance:samefolder` (history block).
- **`gate`**: §4.3 and §7.1. It runs the gate and reports the rule and plant counts, each new plant red on its own rule
  and the old ones unmoved, and `npm run typecheck` for the wall.
- **`probe`**: §8. It runs `--grader-self-test` and `--preflight`, and SO at HEAD once, under a lock slot, and returns
  their numbers.

Every builder runs `npm run typecheck` and `npm test` (under the history block and a scratch `HOME`; the four `/bin/ps`
tests named as they fail) before it returns, and returns every file it changed with its line counts.

## 10. The proof, run rather than read (Tier 3)

### 10.1 Lens A: the behaviour (Method 1 parent, real data)

The gates once (§11). Then `probe:p365` whole, parent first, under a lock slot, `P365_KEEP=1`. Re-derive, by the
verifier's own code over the kept run folders: each run's exit signal and its fault from the dump readings, each
restart and its re-bind from the `P365` lines and app.log, the latencies and the quit times from the raw readings, at
both builds. **The independent steps**: (1) a storm of the verifier's own design through HEAD's sites at a rate the spec
step did not use (34 a second each, or 48 slots with 5 ms churn) for at least 20 minutes, and the same at the parent
until it faults; (2) the packaged app (`npm run package`, then a launch of `release/mac-arm64/Tortie.app` through the
helper, `program: 'packaged'`) watching a scratch project: `lsof` shows `watcher.node` opened by a `Tortie Helper`
process and not by main, under the hardened runtime and the shipped entitlements (D14).

### 10.2 Lens B: the attack (Method 2)

Read §3, then try at HEAD to make main fault, the quit hang, or a watch go quiet without a re-read: folders created and
removed while their watches start (`FAIL` at 50%); 40 repositories opened and closed at once, three times; a session
restored while its rescue watch is armed (RH's relaunch with the record written during the boot); a quit while 30
watches are starting; `smoke:quit`'s teardown leg and `smoke:quitdoors`; the watcher process SIGKILLed six times in
ten minutes (the give-up: one line, `null` from then on, the sites' "not watching" words, no fork); a stopped process
during a quit (the closes settle within 2 s and the quit ends by its ordinary path, never the late drain); a folder that
is a file, a symlink to a folder, a folder whose name holds a newline, and a folder on a case-sensitive APFS image
(`hdiutil`, detached in a `finally`). For each: main's exit, the process's crashes, the re-reads, the quit's wall time.
**The independent step**: a hostile copy of the gate's inputs (at least six shapes of your own through the gate's
`--root` or a scratch copy: the check asked one turn early, a grace awaited inside the turn, a fork with `env:
process.env`, a dynamic import of `@parcel/watcher` in `host.ts` outside the plain-node branch, a site that drops its
`null` test, a close bound read from a variable), each red.

### 10.3 What is driven in vitest only, and why

The give-up's ten-minute window (driven over a fake clock); a malformed message from the process (no process sends
one); the in-process path's equivalence to the process (the same `createWatchQueue` serves both, and the gate holds the
one module).

### 10.4 No regression (both builds)

| Row | What | Parent | HEAD must read |
| --- | --- | --- | --- |
| N1 | `conformance:watcher` | its rules and 24 plants | the same plus W365's, every plant red, the control green |
| N2 | `conformance:watcher:cap` | the cap of 8 | the same table |
| N3 | `conformance:derived` | PASS | PASS |
| N4 | project open and close, 20 projects (RA) | latencies, quit time printed | within RA's bounds |
| N5 | `smoke:quit` (held leg: will-quit SIGKILL, the sentinel cleared; teardown leg: exit 0, the sentinel left marked) | PASS | PASS, the same legs |
| N6 | `smoke:quitdoors` | 9 of 9 | 9 of 9 |
| N7 | the quit's wall time with 20 projects watched (RA) | printed | within 250 ms of the parent's |
| N8 | a boot's first watches (SO) | 52 in 57 ms | every watch started, within 2× plus the fork |
| N9 | the harvest's rescue (RH) | ids armed | the same ids |
| N10 | event latency (the storm app's held folder) | 67 / 99 / 173 ms | within 10 ms at P50 and 25 ms at P99 |
| N11 | `npm test`, `npm run build`, `npm run typecheck` | the counts at `ce4c77f6` | the same plus this phase's files, the same four `/bin/ps` failures |

A row worse than the parent is a defect: fixed, or the part dropped and named.

### 10.5 At the end, once

The Electron count with CLAUDE.md's command, outside the history block (a `Tortie Helper` of a run's own is a leak);
every `gmux-p365` socket under `/private/tmp/tmux-501/` gone or with no server answering; the history stats; his reports
folder by name and time; no `.dmp` left under the run folders.

## 11. The integrator's commands (in order; each with its exit code and PASS line in the report)

1. `npm run typecheck`
2. `node build/contract-inventory.mjs --check` (byte for byte; a diff is a finding)
3. `npm test` (history block, scratch `HOME`; the four `/bin/ps` tests named as the expected failures)
4. `npm run build` (`gate:electron` 187 against a floor of 187; `gate:background`; `gate:checks` with `probe:p365`
   classified; `out/main/watcher-process.js` emitted; `out/main/index.js` names no `@parcel/watcher` at load)
5. `npm run conformance:watcher` (every rule, every plant red on exactly its own rule, the control green)
6. `npm run conformance:watcher:cap`, `npm run conformance:derived`, `npm run conformance:agents`,
   `npm run conformance:samefolder`, `npm run conformance:pocket`, `npm run conformance:machines`
7. the phase's vitest files and the watcher neighbours by name: `p365-queue`, `p365-host`, `p365-process.native`,
   `p365-sites`, `repo-watcher-contract`, `repo-watcher-observation`, `repo-watcher.native`, `p347-excludes`,
   `p347-open-files`, `p347-open-files.native`, `teardown`, `bus`, `ignored-roots`, `store` and `store-watch.native` (config),
   `harvest-ownership`, `harvest-claim-race`, `p161-shot-exit-drain`
8. `git diff --stat ce4c77f6 -- src/main/capabilities.ts src/main/index.ts src/main/sessions/core.ts src/shared`
   (empty)
9. `node build/p365/probe-p365.mjs --grader-self-test` and `--preflight`, under a lock slot
10. `npm run smoke:quit` and `npm run smoke:quitdoors`, each under a lock slot
11. `npm run package` (assert-main-requires reads `out/main/watcher-process.js` in the asar), then ONE packaged launch
    through the helper watching one scratch project, `lsof` on main and on the watcher process, under a lock slot
12. The Electron count, the socket check, the history stats, the reports folder

## 12. What is NOT in this phase

- No change to what Tortie watches, to the ignore arrays, to `planWorktreeIgnore`, or to the FSEvents cap of 8.
- No change to the harvest's rules, its claims, its poll or the resume ids.
- No other native module, no version of any dependency, no patched `watcher.node`, no build of it from source.
- No change to `src/main/capabilities.ts`, `src/main/index.ts`, `src/main/sessions/core.ts` or the quit's order, bounds
  or hard exits.
- No new word a person reads, no new menu row, no new setting, no Live Diagnostics row for the watcher process.
- No harness smoke mode, no seam in the shipped app: the probe's instruments are scratch files it writes.
- No other watch moved into the process (`fs.watch` users: `open-files.ts`, `env/watch.ts`, the credentials watcher).
- No release by itself.

## 13. For the main session at landing

1. `HELPER_USER_FLOOR`: this phase and Phase 359 each raise 186 → 187; whichever lands second makes it 188 and names
   both scripts.
2. CLAUDE.md: Phase 359 edits the `conformance:stoppedlist` and `probe:p357` rows and adds `probe:p359`; this phase
   edits the `conformance:watcher` row and adds `probe:p365`; both add a probe row after `probe:p362`'s, so the second
   to land orders them.
3. §14 Q1 goes to him with §2.5's numbers. The build is D1; if he chooses the in-main option, that is a round of its
   own (it is smaller: the host's queue in main, no process), not a landing-time edit.
4. When upstream fixes #271 in a release, moving `@parcel/watcher` is a dependency phase of its own (§14 Q3); the
   process stays either way unless he chooses otherwise, because his word clears or convicts the watcher from outside
   main.
5. Phase 364 (the diagnostic Tortie) gains a cleaner reading: with the watcher out of main, damage to the session list's
   page cache that comes back cannot be the watcher's.
6. Cleanup after the follow-up commit: the worktree and `/private/var/tmp/tortie-wt/scratch/p365/` (the spec step's
   storm runs and readings, 353 MB by `du` with the 122 MB symbols download and its 189 MB extract).

## 14. Questions for him (the main session asks; the build proceeds on the defaults)

1. **Where should Tortie watch folders?** Default: in a process of its own.
   - **In a process of its own (the default).** Measured under a storm of folders created and removed while watched:
     Tortie never crashed, in any shape. The watcher process itself crashed when a folder vanished just as Tortie
     stopped watching it, and was replaced in about a tenth of a second with every watch re-read. It costs one more
     process of about 60 to 70 MB, about 70 ms the first time anything is watched, and nothing in how fast changes
     show up.
   - **In Tortie itself, one call at a time, never a missing folder, and a pause before stopping a watch on a folder
     that just vanished.** Smaller, no new process. Under the same storm it ran 10 minutes clean when the folder
     vanished before Tortie stopped watching it, and crashed Tortie within a minute when it vanished at the same moment.
   - Today, for comparison: under the same storm Tortie crashes within 5 to 60 seconds, and the crash is damage to the
     memory the session list also lives in.
2. **If the watcher process keeps crashing**, default: Tortie stops restarting it after 5 crashes in 10 minutes and
   stops updating the Source Control list on its own until the next launch. The other choice keeps restarting it
   forever, slower each time.
3. **Upstream's fix.** Default: when `@parcel/watcher` ships a fix for the crash Tortie measured (its issue 271, open
   and unanswered today), move to it in a dependency phase of its own and keep the watcher in its process. The other
   choice moves it back into Tortie then.
4. **The changelog line.** Default: one item saying folder watching now runs in its own process so a fault there no
   longer crashes Tortie. The other choice leaves it out, since nobody sees it at ordinary use.

## §As built (the integrator, 2026-11-09, in `/private/var/tmp/tortie-wt/wt-p365` at `ce4c77f6` plus this phase's delta)

### What the integrator changed, and why

| File | Change | From |
| --- | --- | --- |
| `package.json` | `"probe:p365": "node build/harness-socket.mjs --fresh gmux-p365 'node build/p365/probe-p365.mjs'"`, after `probe:p362` | §8 |
| `build/verification-checks.mjs` | `electron('probe:p365')` with its paragraph after `probe:p362`'s; a paragraph above `pure('conformance:watcher')` (classification unchanged: it spawns only the pinned tsx) | §9.1, the gate builder |
| `build/assert-electron-teardown.mjs` | `HELPER_USER_FLOOR` 186 → 187, with the paragraph naming `build/p365/probe-p365.mjs` and Phase 359's own 186 → 187 | §6, obligation 1, §13 item 1 |
| `CLAUDE.md` | the `conformance:watcher` row: its triggers widened to the three sites outside `src/main/watcher/`, `src/main/lifecycle.ts`, the `watcher-process` entry and the disposer's `afterMs(` W365-6 reads; its cost (~3 s, the pinned tsx); one sentence for W365-1 to W365-10 and the 41 plants. A new `probe:p365` row after `probe:p362`'s (its "when" adds "after an `@parcel/watcher` upgrade", the integrator's) | §9.1, the gate builder's notes |
| `CHANGELOG.md` | `- Watching folders for changes now runs in its own process, so a fault there no longer crashes Tortie`, last under `## Unreleased`, `### Fixed`, no link (the follow-up adds it) | §5, verbatim, because §14 Q4 quotes it |
| this file | this section | |

Not changed, each checked: `.gitignore` (`git check-ignore` exits 1 for every file under `build/p365/`: nothing there is ignored);
`build/background-fixtures.mjs` (no shape walked past `gate:background`; the gate builder's `FORK` constant spelled in
parts answers a false positive, which needs no fixture); `docs/audits/contract-baseline.txt` (byte for byte).
No builder file was edited: the seams met as written (below).

### The seams, reconciled

- **The host and the sites.** `host.ts` exports exactly §4.1's block plus `createWatcherHost`, `WATCHER_LINES`,
  `WATCHER_STEADY_MS` and the `WatcherChild` seam; the sites import `watchFolder`, `FolderWatch`, `FolderEvents` and
  `isRescanRequired` from `../watcher` (or `./host`), as §9.2 says. `conformance:watcher` reads both green.
- **The probe's predicted red at SK, resolved by reading Electron itself.** The probe builder expected SK's last clause
  ("the stopped process ended by the host") to fail because `child.kill()` sends SIGTERM, which a stopped process
  holds. Electron 43.3.0's `UtilityProcessWrapper::Kill()` (FUNC `0x28bb5d8` in the public symbols, disassembled from
  the worktree's own framework with `/usr/bin/objdump`) calls `base::Process::Terminate(0, false)` and then
  `base::EnsureProcessTerminated` DIRECTLY (`bl 0x53b8af4`), which tail-calls `base::WaitForChildToDie`: a kqueue wait of
  up to 2 s, then `kill(pid, 9)` (`mov w1, #0x9`) and a blocking reap. So the host's kill ends a stopped process about
  2 s after its bound, long before the probe's SIGCONT at +15 s, and SK's clause should read green. The cost the
  verifiers should time in SK: main's thread is blocked inside `kill()` for up to 2 s when the child does not exit on
  SIGTERM. Nothing was changed for it.
- **The sites builder's gap, named and left as D5 wrote it.** A watch whose FIRST bind is still in flight when the host
  replaces its process answers `null` (`retire()`), so that project is not watched until its tab opens again, and a
  configuration watch stays off until the next launch. At the parent the same moment crashed the app, so it is not a
  regression; a remedy, if a verifier finds it reached in practice, is to re-bind pending first binds on the
  replacement (the process builder's file).
- **A harness that ends by `app.exit()` (measured).** It skips `before-quit`, so the host never reads `quitting`: the
  packaged shot runs below each wrote one `the watcher process exited (code 0)` warn line at the exit, and the host armed
  its 250 ms restart timer while main exited. Measured twice: no second process was forked, the watcher process was
  gone after main, and the only process left under the profile was `chrome_crashpad_handler` (ppid 1), which is the
  one the helper's teardown ended. The two production `app.exit()` paths (`src/main/index.ts:251`, the lock refusal,
  and `src/main/notice/refusal-screen.ts:86`) run before any watch starts. Left as is (app.log only, harness only).
- **For the main session, outside this phase.** The process builder found `src/main/pocket/bind.ts`'s fork has no
  `'error'` listener, which in Electron 43.3.0 throws `ERR_UNHANDLED_ERROR` in main on a V8 fatal error in the child.

### The commands, in §11's order (each exit code, wall time and numbers)

Every non-Electron command ran under the history block from the worktree with `HOME`, `ZDOTDIR` and `TMPDIR` in
`/private/var/tmp/tortie-wt/scratch/p365/integrator/` (`TMPDIR` spelled through `/var`, the builders' finding: with
`/private/var/…` `preview/__tests__/protocol.test.ts` fails, because it needs `tmpdir()` behind a symlink). The two
smokes, the package and the packaged launches ran under lock slot `electron.lock`, taken and released by a trap.

| # | Command | Exit | Wall | Numbers |
| --- | --- | --- | --- | --- |
| 1 | `npm run typecheck` | 0 | 3 s | import boundaries: 107 fixtures, 1,445 files, 8,245 imports, 0 violations, 2 allow-only walls; no runtime cycles over 1,442 files and 5,044 edges |
| 2 | `node build/contract-inventory.mjs --check` | 0 | <1 s | byte for byte |
| 3 | `npm test` | 1 | 77 s | 22,912 passed, 4 failed, 23 skipped of 22,939; files 1,196 passed, 3 failed, 4 skipped of 1,203. The four failures are exactly the `/bin/ps` tests inside the block: `process-table.native` ×1, `ps.native` ×2, `p269-env-names` ×1 |
| 4 | `npm run build` | 0 | 52 s | `gate:electron`: 586 files read, 187 reach the helper against a floor of 187; `gate:background`: 588 read, 4 start a process they do not wait for, each ended in a `finally`, 32 of 32 fixtures; `gate:checks`: 286 check scripts classified, `probe:p365` among them; `gate:contract` byte for byte. `out/main/watcher-process.js` (1.25 kB) requires `node:fs`, `@parcel/watcher` and the `queue` and `wire` chunks. `out/main/index.js` names `@parcel/watcher` once, in a comment (line 2399); of every chunk only `chunks/in-process-*.js` names it, as a dynamic `import()`, and `index.js` reaches that chunk only inside `Promise.resolve().then(() => require(…))`, the plain-node branch |
| 5 | `npm run conformance:watcher` | 0 | 3 s | 5 sites; 11 scanner and 4 built-bundle fixtures; 9 plans; 8 hostile names; W347's 24 plants red; W365-1 to W365-10 green over 42 variants (the shipping tree and 41 plants), each plant red on exactly the rules it owns (one, `require('@parcel/watcher')` in `host.ts`, owns W365-1 and W365-2); the built halves read 6 files from `out/main/index.js` and 3 from `watcher-process.js` |
| 6 | `conformance:watcher:cap`, `:derived`, `:agents`, `:samefolder`, `:pocket`, `:machines` | 0 each | 21, 3, 4, 10, 13, 31 s | the cap's table unchanged (0 paths false 24/24 delivered; 4, 7, 8 true; 9, 12, 20 false 24/24); derived 14 of 14 ablations red; samefolder rule 23 over 119 files (0 bare `realpathSync(`, 0 case folds, 0 `.normalize(`), 9 of 9 ablations, both volume kinds; pocket 192 rules, 25,741 checks; machines PASS |
| 7 | the named vitest files (§11 step 7, and `machines/__tests__/store.test.ts` beside `config`'s) | 0 | 24 s | 19 files, 226 tests; `p365-queue` 24, `p365-host` 22, `p365-process.native` 5, `p365-sites` 13 |
| 8 | `git diff --stat ce4c77f6 -- src/main/capabilities.ts src/main/index.ts src/main/sessions/core.ts src/shared` | 0 | | empty |
| 9 | `probe-p365.mjs --grader-self-test`; `--preflight` (lock slot) | 0; 2, 2, 0 | <1 s each | self-test: 14 graders, 49 clauses each red alone, 77 needs each unreadable alone, 203 fields, 9 variants, 22 raw fixtures graded and 13 read through the one reader, 3 host sources, the dump reader over a minidump built in memory. Preflight with the default arms and no parent: REFUSED 1 of 36 (`P365_PARENT_CHECKOUT` not set). With the probe builder's parent clone (`scratch/p365/probe/parent`, no `out/`, no `build/vendor`): REFUSED 2 of 48 (RA and RH launch `out/`). With `P365_ARMS=SP,SA,SQ,SK,SO` and that parent: PASS, 42 checks. **The verifiers need a built parent with `build/vendor` for RA and RH** |
| 10 | `npm run smoke:quit`; `npm run smoke:quitdoors` (lock slot each) | 0; 0 | 56 s; 53 s | quit: 38 of 38 fixtures and 5 of 5 sentinel texts; held leg SIGKILL after 2,228 ms, held line, sentinel armed, session list made, 0 dumps, 0 macOS reports, PASS; teardown leg exit 0 after 1,779 ms, the sentinel left marked, 0 dumps, 0 reports, PASS. quitdoors: 9 of 9 doors, SIGKILL after 1,927 ms, 0 dumps, 0 reports, PASS. Each SIGKILLed leg printed the helper's `ended 1 process the teardown found still running`, as Phase 362 recorded at the parent |
| 11 | `npm run package` (lock slot), then the packaged launch twice (lock slot each) | 0; 0, 0 | 52 s; 32 s, 27 s | below |
| 12 | the Electron count, the sockets, the history, the reports folder | | | below |

**Step 11, the package.** Unsigned on purpose: `CSC_IDENTITY_AUTO_DISCOVERY=false` with every `CSC_*`, `APPLE_*`,
`GH_TOKEN` and `GITHUB_TOKEN` unset, so no keychain was searched (`build/sign-nested-binaries.cjs` returns before its
`security find-identity` when discovery is off) and nothing was notarized. The scratch `HOME` was seeded with an APFS
clone of the cached Electron 43.3.0 zip (122,102,881 bytes, sha256 `ee939d15…`; its mtime `1786298401` unchanged
after, so it was not fetched again) and `ELECTRON_BUILDER_CACHE` named a clone of the DMG toolset. After-pack: 27 Mach-O
files, every one arm64; `7 externalized main/preload requires all present in the packed app` (D14's `BUNDLES` with
`watcher-process.js`); `@electron/rebuild` rebuilt nothing (`watcher.node` kept its 14 September mtime, `pty.node` its
17 September one). DMG 164,894,107 bytes, ZIP 164,547,184. The packed `watcher.node`
(`app.asar.unpacked/node_modules/@parcel/watcher-darwin-arm64/`) is sha256 `bdc5c395…`, the shipped one.

**Step 11, the packaged launch** (`/private/var/tmp/tortie-wt/scratch/p365/integrator/pkg-launch.mjs`, inside
`build/harness-socket.mjs --fresh gmux-p365pk`, through `withElectron` with `program: 'packaged'` and the run's socket as
its `tmuxSocket`; `GMUX_SHOT` with a 25 s delay, so an isolated harness launch: the mock keychain, no agent version
probe, no updater, and its own exit; one scratch git repository as its launch argument, which main logged as `opening
folder from launch`). Run 1: main pid 11819 (`Contents/MacOS/Tortie`); its children a GPU process, the network service,
ONE `node.mojom.NodeService` utility process (pid 11877, `Contents/Frameworks/Tortie Helper.app/Contents/MacOS/Tortie
Helper`, seen 1.18 s after the launch), a renderer and the bundled tmux. `lsof`: main, 125 names, holds no
`watcher.node` (it holds `node-pty`'s `pty.node` and `better-sqlite3`'s `darwin-arm64.node`); the watcher process holds
`Contents/Resources/app.asar.unpacked/node_modules/@parcel/watcher-darwin-arm64/watcher.node` and no other `.node`. The
app exited 0 at 31.5 s by its own shot, the watcher process was gone after it, no dump in the profile, no report in
his folder, no `could not watch` line; app.log's one watcher line is the `app.exit()` one above. Run 2 repeated it and
read what was left under the profile once main had gone: main 65133, watcher 65728, the same readings, exit 0 at
26.0 s, and only `chrome_crashpad_handler` left (ppid 1). **What this does not prove**: an unsigned app carries no
hardened runtime and no entitlements, so D14's library validation under his Developer ID is unproven; that needs his
signing identity, which lives in his keychain, which the hard rules keep out of reach. Decide at landing (or the
release lane's `build/verify-signed.mjs`) whether a signed launch is wanted. `release/` (784 MB) was removed after.

**His environment, said plainly.** The commands of steps 1 to 10 inherited this tool shell's tokens and sockets
(`CLAUDE_CODE_*`, `SSH_AUTH_SOCK`, `TMUX`, `TMUX_PANE`, `GMUX_SESSION_ID`, `GMUX_MANAGED`, `SECURITYSESSIONID`); the two
smokes wrote 0 dumps, so nothing holds them. From step 11 on every runner unset them, and the closing battery below ran
with them unset.

**The closing battery** (after every shared file and this section were written, under the block, the variables
unset): `npm run typecheck` exit 0 (2 s); `npm run build` exit 0 (51 s; `gate:electron` 187 against 187,
`gate:background` 32 of 32, `gate:checks` 286 classified, the contract byte for byte); `npm test` exit 1 (91 s): 22,911
passed, 5 failed, 23 skipped of 22,939, being the four `/bin/ps` tests and, once,
`src/main/proc/__tests__/guarded.test.ts` "kills the child the deadline had not reached yet" (`no pid in …/slow.pid`:
its fixture's pid file was not written within its 2 s wait while the load average sat near 16). That file is not this
phase's and passed 10 of 10 tests in each of five runs alone, exit 0 each.

**Step 12.** The Electron count (CLAUDE.md's command, outside the block, once): his Tortie (692) and its crash handler
(2727), and Slack's, Chrome's, Granola's and Cursor's crash handlers; no process naming this worktree, `p365pk`,
`gmux-p365` or this scratch. No `p365`, `smoke-quit` or `p144-doors` socket under `/private/tmp/tmux-501/`. All three
lock slots free. His history read `743319 1794200266` and `23166 1790702242` at the start, before and after every run
and at the end. His reports folder: 34 names and 105 files, identical by name and mtime from before the first smoke to
after the last launch; no run added a report and no deliberate crash was made. 86 GiB free at the end.

**Not run, and why.** `conformance:resume:capture` (it starts real agents; the harvest's rescue is held by its vitest
files, `conformance:derived` and probe arm RH); `probe:p365`'s long arms SP, SA, SQ, SK, RA and RH (the verifiers', and
RA and RH need a built parent with `build/vendor`); a signed package (his keychain); `smoke:t1`, `smoke`, `smoke:t3`,
`smoke:remote` and `smoke:machines` (not this step's).

### The fix round (the fixer, 2026-11-09, once)

Lens 1 (the behaviour) answered approved with two minors and two nits; lens 2 (the attack) answered needs_work with one
major, three minors and a nit. Every major and minor is fixed; nothing was dropped. Scratch:
`/private/var/tmp/tortie-wt/scratch/p365/fixer/` (`atk/` is lens 2's harness copied and re-pointed at that folder, its
parent lens 2's clone `wt-p365-parent-attack` of `ce4c77f6`, read only).

| # | Finding | The fix | From |
| --- | --- | --- | --- |
| F1 | (lens 2 major, lens 1 minor) The quit left the watcher process alive into a teardown: a close still in its queue met `node::FreeEnvironment` there and aborted it (16 of 45 graceful quits at HEAD, 0 of 17 at the parent; lens 1: 5 of 5 in its storm app). Its dump would read as an unclean exit at the next launch | **D8 amended.** Once quitting, the first watch or close the host sees ENDS the process (`endForQuit` in `host.ts`); nothing more is posted; every close settles at once; a watch still starting answers null; no restart. A process ended by a signal runs no teardown and holds nothing durable | Lens 2's first remedy, with F2's end |
| F2 | (lens 2 minor) A process that stopped answering was ended by Electron's `kill()`, which held main's thread 1,997 and 2,009 ms; every first watch in flight answered null, which `ensureWatcher` caches, so that project stayed unwatched until its tab reopened | **New rule 7 of `host.ts`:** the process is ended by a SIGKILL to its pid, sent only when Electron's own process list (`app.getAppMetrics()`) names that pid as `Tortie Watcher` right now, then Electron's `kill()`, which finds it dead and only reaps it (`endWatcherChild`; an end asked before the pid exists waits for `spawn`). **D5 amended:** a first watch a replaced or crashed process held stays pending and is asked of the next process (`adopt` binds it), answered there; null only once it has been asked of `WATCHER_FIRST_WATCH_ASKS` (2) processes, or at the give-up or the quit. The cap is the fixer's own: without it, one folder whose watch stops or crashes every process (a hung network volume, a deterministic library crash) would be asked of process after process and spend the give-up's five exits, ending every other watch, where the integrator's build lost that one watch | Lens 2's remedy for the drop; the non-blocking end and the cap are new, the end chosen by M1 below |
| F3 | (lens 2 minor) The first watch waits about 60 ms for the fork (2 to 4 ms at the parent), so an `agents.json` edit 25 ms after the boot read was lost until the next edit (D9 asked only past 300 ms), and a codex record written 32 ms after a cold rescue arm was found by the poll at 1,003 ms (48 at the parent) | **D9 amended.** The two configuration stores keep `configFileStamp` (new in `src/main/config/paths.ts`: dev, ino, size, mtime, ctime, or why there is none) of each load and, once the stream is live, read once when the file's stamp moved, however short the wait, and never when it did not. The harvest's `subscribeTo` runs one listing (`runScan`) once a root's stream is live | Lens 2's remedy ("reload once ... or always once at start"), narrowed to a moved file so an unchanged one is not read and its problems not logged twice |
| F4 | (lens 1 minor) The give-up was silent: research 143's storm reached it (6 helper exits in 862 s), then a held folder heard nothing for 338 s and no site had been told | **D6 amended.** At the give-up every live watch is handed ONE `new Error(WATCHER_GAVE_UP_ERROR)`, the library's fatal kind (`isRescanRequired` does not match it). RepoWatcher logs it through its `onError`; **D10 widened:** each configuration watch says once, in the words a watch that cannot start uses, that it is not watching; the harvest's poll goes on. Restarting forever stays §14 Q2's other choice, unchosen | Lens 1's first remedy |
| F5 | (lens 2 minor) `conformance:watcher` stayed green with the fork's `error` listener removed (W365-7) and with the same-folder grace order removed (W365-5) | Both plants added, and the rules they need: W365-7 reads the `error` listener and the end route statically and drives it; W365-5 drives a re-watch of a folder during its own graced close | Lens 2 |
| F6 | (nits) CLAUDE.md's plant count; RA unreadable on a busy machine; SQ counted no watcher dump | CLAUDE.md's `conformance:watcher` row (55 plants, the new clauses) and `probe:p365` row; the probe's header says RA needs a quiet machine; SQ-head gains "no dump of the watcher process from the quit", told from the storm's by the minidump header's second (`quitDumpsOf`) | Lens 2, lens 1 |

**M1, measured before choosing the end** (`fixer/m1/`, a scratch app's own utility child, Electron 43.3.0, 9 trials):

| End | Child | The call held main | Exit after | Exit code | `child-process-gone` |
| --- | --- | --- | --- | --- | --- |
| Electron `kill()` | running | 2.3, 2.4 ms | 3, 5 ms | 0 | none |
| SIGKILL to the pid | running | 0 ms (×3) | 2 to 4 ms | 9 | `killed`, every time |
| Electron `kill()` | stopped | 2,004.6, 2,006.5 ms | 2,005, 2,006 ms | 0 | none |
| SIGKILL to the pid | stopped | 0 ms | 3 ms | 9 | `killed` |
| **SIGKILL, then `kill()`** | running | 2.5, 2.7 ms | 2, 3 ms | 0 | none |
| **SIGKILL, then `kill()`** | stopped | 2.7, 2.8 ms | 3 ms | 0 | none |

`app.getAppMetrics()` named every child `{ type: 'Utility', name: 'Tortie Watcher', serviceName:
'node.mojom.NodeService' }`; `ps` listed none 500 ms after its end (reaped, no zombie). A SIGKILL alone was not chosen
because it writes a `process.gone` record into app.log at every quit.

**What else moved.** `host.ts` exports `WATCHER_GAVE_UP_ERROR`, `WATCHER_SERVICE_NAME` and `WATCHER_FIRST_WATCH_ASKS`
beside §4.1's block. `build/watcher-conformance-probe.mts` hands every loaded module a `process` whose `kill` only
RECORDS (the fake children's pids may name real processes) and a fake `app.getAppMetrics()`, and drives a POISON folder
no process ever answers. `conformance:watcher`: W365-5 to W365-9 widened as CLAUDE.md's row says; 10 plants added (the
same-folder order; a first watch answered null at the first end; no cap; the cap of 1; the `error` listener; the child
ended by `kill()` alone; the SIGKILL unguarded; the give-up's word removed; the word made a re-scan; the process left
running at the quit), two W365-9 plants re-anchored, and "the quitting check removed" now declares W365-9 too (its
pending watch is no longer dropped by `retire`, so the quit's drive forks): 55 W365 plants, each red on exactly its
rules. Files changed by this round:
`src/main/watcher/host.ts`, `src/main/config/paths.ts` (new to the delta), `src/main/config/store.ts`,
`src/main/machines/store.ts`, `src/main/manifest/harvest/watch.ts`, `src/main/watcher/__tests__/p365-host.test.ts`,
`p365-sites.test.ts`, `build/conformance-watcher.mjs`, `build/watcher-conformance-probe.mts`, `build/p365/probe-p365.mjs`,
`build/p365/fixtures/graders.json`, `CLAUDE.md`, this file. `capabilities.ts`, `index.ts`, `core.ts` and `src/shared/` are
still untouched.

**The re-runs, each finding live** (every Electron through `withElectron` inside `build/harness-socket.mjs`, under a
lock slot, one at a time, with `HOME`/`ZDOTDIR`/`TMPDIR` in scratch, `HISTFILE=/dev/null`, `SHELL=/bin/sh`, and every
token unset; lens 2's scenarios through its own harness copied into `fixer/atk/`):

| Finding | Run | Before the fix (the lenses) | After the fix | Parent |
| --- | --- | --- | --- | --- |
| F1 | 36 quits of the storm app in Tortie's order (`quitab` with 0, 10, 20, 40 and 80 projects and 0 to 150 ms after the closes; `noclose`; `app.exit`; `quit30` at 0, 40 and 80 ms; `quitstop` with the process stopped) | 16 of 45 left a watcher-process abort dump | **0 of 36** dumps of either process; every exit 0; no report | 0 of 17 |
| F1 | probe SQ ×4 (20 s of storm, the quit with main's pool held) | lens 1: main exit 0 in 4 of 4, the helper aborted in 2 | **4 of 4 PASS**: exit 0, no dump of main or of the watcher process from the quit | 4 of 4 SIGABRT, `napi_fatal_error` on main |
| F1 | `quitstop` (the process SIGSTOPped, six watches pending, then the quit) | the 3,000 ms guard won | settled in **5 and 7 ms**, main's longest stall 0 ms, the stopped process gone | — |
| F2 | `stopclose` ×2 (SIGSTOP, a close and a first watch asked of it) | main stalled 1,997 ms; the watch answered null at 4,009 ms | close settled at **2,017 / 2,019 ms** (its bound); the watch answered on the replacement at **2,330 / 2,338 ms**; main's longest stall **10 / 12 ms**; the stopped process gone; 4 of 4 live projects re-read | — |
| F2 | `stopclose` watch-only ×2 | main stalled 2,009 ms; null at 12,022 ms | answered at **10,360 / 10,341 ms** (the 10 s bound, then the replacement); stall **8 / 9 ms** | — |
| F2 | probe SK (SIGKILL at 30 s, SIGSTOP at 90 s) | — | **PASS**: 18 watches re-bound 354 ms after the kill; the stopped process replaced at its close bound (+2,003 ms), exit code 0 (the reap after the SIGKILL), the next fork 252 ms later | — |
| F3 | `coldconfig` (the first watch of the launch, `agents.json` edited T ms after the boot read) | T = 25: lost | **reloaded at T = 10, 25 (×3), 50 and 90**; the control (no edit) read once; the first watch took **55 to 58 ms** | reloaded at 10 and 25; first watch 2 to 3 ms |
| F3 | `rescue` ×2 (a codex record written about 35 ms after a COLD arm, then 8 warm arms) | cold: found at 1,003 ms (the poll) | cold: written at 38 / 33 ms, found **48 / 37 ms after it** (86 / 70 ms from the arm); warm: 3 to 78 ms after the write | cold: 15 / 18 ms after it (48 / 53 from the arm); warm 15 to 76 ms |
| F4 | `kill6` (the process SIGKILLed until the give-up) | the live watches went quiet with nothing said | kills 1 to 4: restarts after 258, 1,017, 5,017 and 30,018 ms, 10 of 10 projects told and re-read each time; kill 5: the give-up, **10 of 10 projects handed the ended word** (20 words: worktree and `.git`), no fork, a later watch null | — |
| — | `scale` (64 projects, one SIGKILL) | lens 2: boot 166 ms, re-read in 639 ms | boot **150 ms**; 64 of 64 told in 359 ms and re-read in **666 ms**; main's longest stall 8 ms | boot 219 ms (lens 2) |
| — | probe SO and RH (both builds) | | **PASS** both: SO boot 113 ms with the fork's 59 ms (parent 56 ms, 52 native subscribes in main, 18 in flight); RH the same ids at both builds (first armed at 2,519 against 2,515 ms) | |

| — | probe SP (research 143's storm through each build's own five sites, `P365_RUNS=1`, `P365_STORM_MIN=10`) | lens 1: 0 main faults in 73.7 HEAD storm-minutes | **PASS**: 10 min at 16 asks a second (15.5 native subscribes a second), 9,324 watches answered and 326 "nothing to watch", 0 refused, main exit 0, no dump, no native call in main, 0 process crashes this run; the bundle carried the final `host.ts` (08:59:01 against its 08:56:05) | ran its 5 minutes clean this time (16 asks a second, 4,855 native subscribes, 119 in flight): SP-parent FAIL on its own clause, one run (lens 1: 3 of 4 parent runs faulted, at 60, 183 and 360 s) |
| — | probe RA ×8 pairs (the real app, 20 projects, the menu's Quit) | | below | |
| — | `smoke:quit`, `smoke:quitdoors` | the integrator: held 2,228 ms, teardown 1,779 ms; doors 1,927 ms | **PASS**: held leg SIGKILL after 1,879 ms, teardown leg exit 0 after 1,767 ms, 0 dumps, 0 reports; doors 9 of 9, SIGKILL after 1,570 ms, 0 dumps | |
| — | `npm run package` (unsigned, discovery off) and one packaged launch | | package exit 0 in 46 s, 27 Mach-O files arm64, 7 externalized requires present, the Electron zip not fetched again (`122102881 1786298401`); launch: main holds no `watcher.node` (it holds `pty.node` and `better-sqlite3`), the `node.mojom.NodeService` helper holds `watcher.node` alone, exit 0 at 25.6 s, the helper gone after, only `chrome_crashpad_handler` left; `release/` (783 MB) removed | |

**What is still worse than the parent, with numbers** (none of it is this round's doing, and none was dropped):

1. **The last edits of a real-app run, untraced.** Over the 8 RA pairs, 160 edits a build: P50 316 ms both, P90 329
   against 322, P99 667 against 525, max 794 against 591. The first 17 edits of every run are identical (P50 316, max
   319 against 318); the slow ones are the last 1 to 3 of each run's 20, at both builds: of those 24 values, 9 are over
   400 ms at HEAD and 6 at the parent, 4 over 600 ms at HEAD and none at the parent. RA-head's clause "each edit heard
   within 100 ms of the parent's median" FAILED in 7 of 8 pairs (the parent's own last edits reached 427 to 591 ms in 5
   of 8 runs, past that same bound). Not traced: nothing this round changed is on that path (no exit, quit or give-up
   happens during RA's edits; the stores and the harvest are not asked), main and the watcher process run at the same
   scheduling priority (46 and 47 by `ps`, M2), and RA was never run on the integrator's tree, so whether it predates
   this round is not measured. Branch switches (P50 329 against 333 ms, max 348 against 351) and the quit (313 to 328
   against 303 to 348 ms) are as the parent's.
2. **The first watch of a launch** waits for the fork: 55 to 58 ms against 2 to 3 ms (`coldconfig`); SO's boot of 52
   watches 113 ms, 59 of it the fork, against 56 ms. Nothing written in that window is lost any more (F3).
3. **A cold rescue arm**: a record written about 35 ms after it is found 37 to 48 ms after its write (by the listing at
   the stream's start) against 15 to 18 ms; warm arms as fast or faster (3 to 78 against 15 to 76 ms).
4. **A process that stops answering holds every watch asked of it until its bound**: a first watch answered at 2,330 and
   2,338 ms (a close's bound) or 10,341 and 10,360 ms (its own), where at the parent a stalled native call held only
   itself. A folder no process ever answers costs two bounds (about 20 s for the watches behind it) and is then
   answered null: driven in the gate and the unit tests, not run live.
5. **The watcher process itself still crashes under research 143's storm** (lens 1: 12 times in 73.7 HEAD
   storm-minutes; none in this round's 10 minutes), each costing a re-read; after 5 exits in 10 minutes Tortie stops
   watching until it starts again, now saying so to every watch (§14 Q2). The parent crashes Tortie in that storm.
6. **One more process**, 60 to 71 MB resident (lens 1).
7. **App.log lines**: at the give-up every project writes two (its worktree and `.git` watches; 20 in `kill6`'s 10
   projects); a quit with watches still starting writes "the file watcher did not watch <path>" for each (30 in
   `quit30` at 0 ms).

**The commands** (every non-Electron command under the history block with `HOME`, `ZDOTDIR` and `TMPDIR` in scratch):

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `npm run typecheck` (after each change, last at the final tree) | 0 | 3 s | 107 boundary fixtures, 1,445 files, 8,245 imports, 0 violations; 0 runtime cycles over 1,442 files and 5,044 edges |
| `node build/contract-inventory.mjs --check` (and inside every build) | 0 | <1 s | byte for byte |
| `npm test` (final tree) | 1 | 75 s | 22,918 passed, 4 failed, 23 skipped of 22,945 (the integrator's 22,939 and this round's 6); the four are the `/bin/ps` tests inside the block: `process-table.native` ×1, `ps.native` ×2, `p269-env-names` ×1 |
| `npm run build` ×3 (the last at 09:10, before RA) | 0 | 45, 44 s | `gate:electron` 187 against 187; `gate:checks` 286 classified; the contract byte for byte |
| `npm run conformance:watcher` (final tree) | 0 | 4 s | 10 W365 rules over 56 variants: the shipping tree and 55 plants, each red on exactly its rules; W347's 24 plants red |
| `conformance:watcher:cap`, `:derived`, `:agents`, `:samefolder` (again on the final tree), `:pocket` (again after the last build), `:machines` | 0 each | 22, 2, 4, 3, 13, 23 s | the cap's table unchanged (0 false 24/24; 4, 7, 8 true; 9, 12, 20 false 24/24); derived 14 of 14 ablations red; samefolder rule 23 over 119 files, 9 of 9 ablations; pocket PASS; machines PASS |
| the phase's and the watcher's vitest files; the harvest and session files | 0 | 24, 15 s | 18 files, 227 tests; 56 files, 1,069 tests; on the final tree the four `p365-*` files 3 times in a row, 70 of 70 each (`p365-queue` 24, `p365-host` 26, `p365-process.native` 5, `p365-sites` 15) |
| own ablations of this round's fixes in vitest (each restored, `grep ABLATED` empty after) | — | | the stamp check and the harvest's listing: 2 tests red; the ask cap: 2 tests red |
| `node build/p365/probe-p365.mjs --grader-self-test` (final) | 0 | <1 s | 14 graders, 50 clauses each red alone, 85 needs each unreadable alone, 221 fields, 10 variants, 55 raw fixtures graded and 27 read |
| `git diff --stat ce4c77f6 -- src/main/capabilities.ts src/main/index.ts src/main/sessions/core.ts src/shared` | 0 | | empty |
| Electron runs under `fixer/lockrun.sh` (M1, M1b, `qm1`, `qc1`, `qs1`, probe SQ/SK/SO/RH, SQ ×3, SP, RA, RA ×3, RA ×4, M2) and `lockrun-plain.sh` (the two smokes, the package, then the launch under `lockrun.sh`) | 0 each, but the probe's SP (1: SP-parent did not fault) and RA ×7 (1: the edit clause above) | 7 s to 904 s | above; every slot released |

**Not run, and why.** `conformance:resume:capture` (it starts real agents; RH and the harvest's tests stand in); SA and
the 20-minute SP (one 10-minute SP run instead); a signed package (his keychain); `smoke:t1`, `smoke`, `smoke:t3`,
`smoke:remote`, `smoke:machines` (not this step's); RA on the integrator's tree (no built copy of it).

**His world.** His history read `743319 1794200266` and `23166 1790702242` at the start, before and after every run and
at the end. His reports folder: 34 names and 105 files at 08:03; 32 names and 103 files when `probe1` began at 08:44
(nothing of this round ran in between), and one `proactive_event_tracker-com_apple_Trial-com_apple_triald_2026-11-09-084520`
diagnostic appeared at 08:45:20 during it (a macOS daemon's, not a crash report of any run); from 08:49:48 to 09:22:54
identical by name and mtime. Deliberate crashes: 4, all the parent's main (SQ-parent ×4, `napi_fatal_error`), every
dump read and deleted by the probe; no HEAD run wrote a dump; no `.dmp` left. The Electron count at the end (CLAUDE.md's
command, once): his Tortie (692) and its crash handler (2727), and Slack's, Chrome's, Granola's and Cursor's crash
handlers; none of this round's. No `p365fx` socket under `/private/tmp/tmux-501/`. All three slots free. Slips: one
`python3` edit of an M1 scratch file, one `node -e` read of the fixtures and several read-only `ls`, `grep`, `sed` and
`cat` calls ran outside the history block; the stats never moved.
