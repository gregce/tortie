# Phase 357.1 — "can we diagnose and figure out a fix" — the two gaps research 143 found in 357 — SPEC

Written by the spec step on 2026-11-06 in `/private/var/tmp/tortie-wt/wt-p3571`, a detached worktree at origin/main
`32180e60` ("docs(backlog): say exactly what changed under ios since build 13"; 357 landed at `5a6097ac`, and the
commits above it are docs and the 0.114.1 release). **`git diff 32180e60` in the worktree must be exactly Phase 357.1's
delta**, this file included. origin/main does not move under you; the main session moves the tree at landing. Nobody
here rebases, pulls or merges. The charter is `docs/BACKLOG.md` "## Phase 357.1" (`:44685`), bound as written except
where §0.1 says the tree or a measurement wins, and research 143 (`docs/research/143-what-damaged-the-session-lists-page-cache.md`)
§2.3, §5 and §6. His standing rulings bind: **no regression against today** (a scenario worse than the parent is a
defect: fix it or drop the part); Tortie never ends a session on its own; just enough words; no tmux vocabulary on any
surface; nothing released, tagged, version-bumped, archived or uploaded; his session count is allowed (2026-11-02,
`build/electron-run.mjs`'s read-only `list-sessions` of `-L gmux` and nothing else).

| | |
| --- | --- |
| Subject | `fix(manifest): quit without closing a damaged cache, and let the backup check stop the list` (the entry's) |
| First body line | `Phase 357.1: the two gaps research 143 found in 357` |
| Semver | Patch, unreleased, Mac only, released on his word. One CHANGELOG item under `## Unreleased`, `### Fixed` (§5) |
| Lane | Build: Spec → Build (THREE builders, disjoint files) → Integrate → Verify (two lenses) → [Fix once → Reverify] → Commit |
| Tier | **3**: it changes the quit and the manifest's last close, which can lose or corrupt a person's work, and it follows his report. The parent measurement is mandatory (done, §2), two independent methods at least, one an attack (§10) |
| Menus | **No change.** No menu row is added, renamed or removed |
| Contract | **Does not move.** No new invoke channel, env name, schema, migration, pragma, smoke mode, `gmux.*` key or notice kind. `gate:contract` must still read byte for byte, and a diff there is a finding |
| `HELPER_USER_FLOOR` | **No change by default.** Gap 1's crash arm and Gap 3 extend `probe:p357`, which already reaches the helper; a NEW `build/` script reaching `build/electron-run.mjs` raises the floor in the same commit (obligation 1) |
| CHANGELOG | One item under `## Unreleased`, `### Fixed` (§5), the commit link added by the follow-up docs commit |

## 0. The hard rules, stated once (every builder, the integrator, every verifier, the fixer, the reverifier)

- NEVER commit, stage or stash. `/Users/gdc/gmux` is read only. Never touch `/private/var/tmp/tortie-wt/wt-p353*`
  (paused) or any other phase's worktree. Scratch lives under `/private/var/tmp/tortie-wt/scratch/p3571/<role>/`, never
  under `/private/tmp`, which macOS cleans; a probe's `TMPDIR` points there too.
- **The built parent is kept for you**: `/private/var/tmp/tortie-wt/wt-p3571-parent` is `32180e60` (357 as landed) with
  `node_modules` and `build/vendor` copied and `out/` built by the spec step (44 s, exit 0). Use it as
  `P357_PARENT_CHECKOUT` / `P3571_PARENT_CHECKOUT`. Do not edit it; delete nothing in it.
- **The checking better-sqlite3 is built for you**: `/private/var/tmp/tortie-wt/scratch/p3571/crash/bs3` is a scratch
  copy of the checkout's better-sqlite3 13.0.3 with research 143's page-cache checker appended to its amalgamation and
  two breadcrumb calls patched into `src/objects/{statement-iterator,database}.cpp` (§2.1). It reproduces the crash's
  exact fault from the planted state. **It is loaded ONLY by explicit path through `hook-bs3.cjs`, never installed, and
  never copied into any checkout's `node_modules`.** A native build a role makes itself goes under
  `/private/var/tmp/tortie-wt/scratch/p3571/<role>/`, with every cache (npm, node-gyp devdir, Electron headers) under
  that scratch, nothing installed globally.
- **`-L gmux` is named only by `build/electron-run.mjs`'s census, and only with `list-sessions`.** Name `tmuxSocket` on
  a launch whose census you want; a run's own tmux commands aim only at its scratch socket, and use the CHECKOUT's
  vendored tmux (`build/vendor/tmux/bin/tmux`, 3.7b).
- **No real agent runs, not even for a version.** Every launch hides every probed registry row first
  (`writeHiddenAgents(profile, prefix, hiddenAgentsBesides([]))`) and reads `agents:list` back
  (`standInsOnlyVerdict(list, { standIns: [] })`); a run whose answer is not ok is UNREADABLE. Every arm here runs
  shells; no stand-in agent is needed.
- Never read his keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex`, any agent's or conversation store,
  his shell history's contents, or his live Tortie profile. Real data is his recorded shape through
  `build/p3167/seed-sessions.mts --shape his` (counts only). Never open his crash reports: a deliberate crash you cause
  must exit without a macOS report (the checking build's own SEGV handler does, exiting 139; Crashpad never catches a
  SIGKILL); if macOS writes one anyway, count by NAME and mtime only.
- His shell history is never written by us: every command that does not launch an Electron runs under
  `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb`. `/bin/ps` will not start under it, so the four
  native tests that start `/bin/ps` fail inside it by design (name each as it fails; never run them outside it), and the
  one Electron count at the end runs outside it. Record only `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before and
  after every run that starts a shell or the app; the spec step's readings were `743166 1793987027` and
  `23166 1790702242`, unmoved across every run. A move across an unblocked run: start nothing for 3 minutes and stat
  again; moved again is his, still moved means STOP and report.
- Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids you started, after confirming their
  command line; every process you start ends in a `finally`. Never signal a probe while its own teardown runs. Every
  Electron goes through `build/electron-run.mjs` inside `build/harness-socket.mjs` with a scratch profile, `HOME` and
  socket. No Simulator; nothing under `ios/` moves. No real Tailscale, DNS, APNs or ssh; never `smoke:remote` or
  `smoke:machines`. Never import a `build/` script to inspect it; read it as text.
- The lock has three slots: `zsh /private/tmp/tortie-ops/lock.sh try p3571-<role>` prints the slot or exits 1 (retry
  every 60 s in a NEW command); release with `zsh /private/tmp/tortie-ops/lock.sh release <slot>` from a `trap`. Every
  probe and app run holds one. `df -h /` before any build; under 8 GB free, wait and report (75 GB free at the spec
  step).
- **Faults are made in scratch only.** The crash state is planted only by the scratch checking build loaded through the
  hook in a harness launch; no fault seam enters the shipped app. 357's `src/main/harness/manifest-fault.ts` stays as it
  is (a `SQLITE_CORRUPT` throw, the latching case); this phase adds no new in-app fault.

## 0.1 What the entry and the parent reading give, measured (the tree and the measurements win; each binds)

Everything here is `run, not read`, at the parent `32180e60` (357 as landed), in
`/private/var/tmp/tortie-wt/scratch/p3571/` (`crash/`, `spec/quit/`, `spec/digest/`). The numbers are §2's.

1. **Gap 1 reproduces at the parent, and 357's latch cannot see it.** With the crash's own header state planted (the
   LRU-tail page leaves the hash and its `pCache` reads 0; research 143 §2.3 shape 3/4 and the judge's zero-filled 4 KB
   owner), **no read fails**: `listSessions`, `getSession` and the digest's `iterate` all answered, and a fresh
   read-only `integrity_check` read `ok`. So `through`/`quiet` never catch a `isBrokenConnectionError`, the store never
   latches, `manifestConnectionsLeftOpen()` stays 0, and 357's `close()` (D10) takes its `this.stopped === null` arm and
   calls `this.db.close()` → SIGSEGV at `0x34`, `pcache1EnforceMaxPage+0x68`, exit 139 — **his report's frame**, plain
   node and in a parent Electron (§2.1, §2.2).
2. **Skipping `close()` alone does not help.** With the crash state planted, falling off the end of the process (never
   calling `close()`) still crashed at `pcache1EnforceMaxPage+0x68`: better-sqlite3 13.0.3 closes every open connection
   at Node's environment teardown (357's M3, `better_sqlite3.cpp:56` `env.AddCleanupHook(Addon::Cleanup)` →
   `addon.cpp:7-8` → `CloseHandles()` → `sqlite3_close`). Only a hard exit that never reaches teardown avoids it:
   `process.kill(process.pid, 'SIGKILL')` after the state was planted left no crash (§2.3). This is the whole of Gap 1's
   design: the manifest must not be closed at quit, AND the process must not reach environment teardown.
3. **A hard exit at quit costs a person only Chromium's own caches, not their state, and only if it waits for the
   windows to close and flushes DOM storage first.** Eight quit routes measured (§2.4): a clean quit writes the GPU
   shader caches, DIPS, `Local State`, `Network Persistent State`, `Preferences` and the DOM/Session storage besides
   Tortie's own manifest, backup ring, snapshots and `settings.json`; a hard exit writes Tortie's own files (the
   disposer's) and, when it flushes first, the DOM/Session storage, and **skips only the Chromium caches and internal
   metrics**, none of which is a person's data. The one thing a bare hard exit loses is a `localStorage` write made in
   the last ≈2 s (zoom, a remembered tab) and, if it fires before the windows close, the Settings window's remembered
   bounds. **A `session.defaultSession.flushStorageData()` at `will-quit` (after the windows have closed and saved
   their bounds) keeps both, provided the exit waits for the commit it starts**: every `gmux.*` key and the moved
   Settings bounds survived, byte for byte, in the `willquit-flush` runs. The call returns at once and only STARTS
   Chromium's commit; on an idle Mac the commit beat the SIGKILL sent microseconds later, and on a busy one it lost 2
   quits in 22 (the drop round's reverify, each a torn LevelDB record). So since round A the quit flushes as it begins
   (the disposer's first lines) and again at `will-quit`, and the SIGKILL waits, at most 1 s, until the storage log
   on disk stands whole and still ("### Round A" below: about 150 ms after `will-quit`, and under 24 busy loops this
   build lost a write in 0 quits of 36, as the parent did). Every hard-exit run relaunched clean: the run sentinel was
   cleared, no `boot.unclean_exit`, no crash dump, and all three seeded sessions read back.
4. **The backup ring's digest hides the error (Gap 2), measured at the parent.** Over a connection whose `sessions`
   pages are damaged in memory while the file is fine, `contentFingerprint()` answers a sha256 (not null), the store
   does not latch, and only a later `listSessions` (which throws) latches it. Over a connection whose `migrations`
   table is the damaged one — the table the ring's digest reads but no list read touches — `contentFingerprint()`
   answers a sha256 for the whole hour, the store **never** latches, the notice never shows, and `listSessions` reads
   `ok` throughout (§2.5). `digestOneTable`'s catch (`src/main/db/digest.ts:146-148`) turns the `SQLITE_CORRUPT` into
   the text `unreadable: <message>`, which `databaseFingerprint` folds into the hash.
5. **Quit-and-install still installs under a hard exit, read from the vendored updater.** Tortie's one install path is
   the staged dialog's Update Now button → `installStagedUpdateNow()` (`src/main/updates/updater.ts:628`) →
   `autoUpdater.quitAndInstall()`, which on macOS is `MacUpdater.quitAndInstall` → `handleUpdateDownloaded` →
   `nativeUpdater.quitAndInstall()` (`node_modules/electron-updater/out/MacUpdater.js:233,240`). Squirrel.Mac submits
   the ShipIt launchd job synchronously there, **before** `before-quit` and the disposer run, and ShipIt's wait gate
   waits for the app's termination before installing (research 42.shipit §2). A SIGKILL is a termination, so the install
   proceeds. A real signed install cannot be driven in scratch (no feed, no signed build, the rules forbid a real
   update), so this is read-plus-reasoning; §13 owes the main session a `smoke`-level check at landing, and §14 carries
   the belt-and-suspenders carve-out for him.
6. **Citations at this head**: `GmuxCore.dispose()`'s close is `src/main/sessions/core.ts:4433`
   (`this.manifest.close()` inside the `try` at `:4432`), reached from `shutdownGmuxCore` (`:4559`) AFTER the quit's
   manifest generation is taken (`takeManifestGenerationOnQuit`, `:1525`), so the durable generation is on disk before
   any close. `ManifestStore.close()` `src/main/manifest/store.ts:575-588`, `held`/`manifestConnectionsLeftOpen`
   `:308-317`, `through`/`quiet`/`latch` `:1066-1187`. The disposer's two hard-exit branches are
   `src/main/capabilities.ts:1099-1101` (Phase 36's wedged-watcher escape) and `:1126-1132` (357's manifest-held
   escape). The sentinel clear at `will-quit` is `src/main/log/index.ts:360`. `isBrokenConnectionError`
   `src/main/db/integrity.ts:181`, imported by nothing today (so `digest.ts` may import it with no cycle; integrity
   imports nothing). `fingerprintOrNull` (`store.ts:365`) already rethrows a broken-connection error (357's fix round),
   so Gap 2 needs only the digest to stop swallowing it.

## 1. The answer first

| # | What | One line |
| --- | --- | --- |
| 1 | Gap 1, the quit | At quit the manifest connection is **never closed** (`close()` holds it, always, not only when latched), and the process ends with the hard exit (SIGKILL to self) at `will-quit`, after the windows have closed and after the windows' storage is flushed (since round A: as the quit begins and again at `will-quit`, then a wait of at most 1 s for the storage log on disk), so no close — neither `dispose`'s nor Node's environment teardown's — ever walks a damaged cache, and nothing a person keeps is lost (§2.3, §2.4). An update staged for install is the one carve-out (D6, §14 Q2) |
| 2 | Gap 2, the digest | `digestOneTable`'s catch rethrows a broken-connection error (`isBrokenConnectionError`) and keeps its `unreadable: <message>` text for every other error, so the ring's change test latches the store once with the notice instead of folding `SQLITE_CORRUPT` into a fingerprint (§2.5) |
| 3 | Gap 3, the probe | `probe:p357`'s RUN socket count ignores the harness's own `<socket>.run` marker; HD turns the door on before HB pairs (as `probe:p349` does); `isQuietStoppedRejection` reads the actual `src/shared/manifest-stopped-copy.ts` constants, not one hardcoded phrase. Plus a crash-state arm proving Gap 1 at both builds |
| 4 | The proof | The parent measured (§2), run; vitest over the SHIPPING digest and the quit hold; `conformance:stoppedlist` widened with ablations; `probe:p357` extended with a crash-state Electron arm (the scratch checking build) at the parent and HEAD, parent first; the no-regression quit table (§2.4) re-run at HEAD |

### 1.1 The decisions, each with its reason

| Id | Decision | Reason (where it comes from) |
| --- | --- | --- |
| D1 | **The manifest is held open at every quit.** `ManifestStore.close()` holds the connection (pushes it onto `held`, logs its one line once, never `this.db.close()`) whenever a module-level `holdAllCloses` flag is set OR the store is stopped with the file fine (357's D10, kept). `export function holdManifestClosesAtQuit(): void { holdAllCloses = true; }` is called once by the quit path, synchronously, before `shutdownGmuxCore()` runs `dispose()`. A non-quit `close()` (the rebuild's second store, the smokes) is unchanged, because the flag is only ever set on the real quit | Gap 1. §2.1–§2.3: the crash state is undetectable by a read, so the only prevention is to not run the close; §2.2: skipping `dispose`'s `close()` is not enough, so the connection must also be held off the collector past environment teardown, which the hard exit (D3) guarantees. Holding only on a flag the quit sets keeps every other `close()` exactly as today |
| D2 | **The hard exit moves to a `will-quit` handler.** A new one-shot `app.on('will-quit')` in `src/main/index.ts`, registered beside the existing lifecycle wiring: when `manifestConnectionsLeftOpen() > 0` and no update is staged (D6), it calls `event.preventDefault()` at once (so the default quit, and Node's teardown with it, never runs), then, in one async function, flushes (`session.defaultSession.flushStorageData()`), awaits `storageWritten(<the session's storage path>, STORAGE_WRITE_WAIT_MS)` (1 s at most; `src/main/quit/storage-landing.ts`), and in its `finally` runs `clearLogRunSentinel(); process.kill(process.pid, 'SIGKILL')`. The disposer also flushes on its first lines (round A, W1). 357's manifest-held branch at `capabilities.ts:1126-1132` is removed; the Phase 36 wedged-watcher branch at `:1099-1101` stays (a wedged FSEvents means the windows may never close, so it cannot wait for `will-quit`) | §2.4: a hard exit at the disposer's end (357's D12 location, during `before-quit`) is before the windows close, so the Settings window's bounds are not yet saved (lost in the `disposer` run); a hard exit at `will-quit` is after they close (saved in the `willquit` runs). The flush keeps `localStorage` (all three keys kept in `willquit-flush`, the last one lost without it), but it only STARTS Chromium's commit: a SIGKILL right after it lost the last write in 2 quits of 22 on a busy Mac, so round A waits for the storage log ("### Round A"). This also fixes 357's own incidental bounds loss in the latched case |
| D3 | **`dispose()` does not close the manifest at quit.** `GmuxCore.dispose()` still calls `this.manifest.close()` (`core.ts:4433`); with D1 that call holds instead of closing, so no code path change in `core.ts` is strictly required beyond the hold. The spec names `core.ts` on the `quit` builder so the hold's reach is reviewed with the dispose | §2.2: `dispose`'s `close()` runs inside `shutdownGmuxCore`, during `before-quit`, long before `will-quit`; if it closed a crash-state connection it would crash there. D1's hold is what makes it safe |
| D4 | **The digest lets a broken connection through.** `digestOneTable` (`src/main/db/digest.ts:124-149`) begins its `catch` with `if (isBrokenConnectionError(err)) throw err;` and otherwise returns `unreadable: ${(err as Error).message}` exactly as today. `digest.ts` imports `isBrokenConnectionError` from `../db/integrity` (no cycle: integrity imports nothing) | Gap 2 and the entry. §2.5: the swallow is what hides the ring's `SQLITE_CORRUPT` from the latch. `databaseFingerprint` → `tableDigests` → `digestOneTable` then throws; `fingerprintOrNull` (store.ts:365) already rethrows a broken-connection error; `quiet('contentFingerprint', …)` catches it and latches. `readDatabaseEvidence` and `snapshotDatabase` (recovery.ts) catch all errors and open their own fresh read-only connections, so a rethrow there is a genuinely damaged file and aborting the copy is correct |
| D5 | **Gap 3, three fixes to `build/p357/probe-p357.mjs`, tooling only.** (a) the RUN socket count filters out names ending `.run` (the harness's own `<socket>.run` marker, `build/harness-socket.mjs`); (b) HD turns the door on (`pocket(win, 'setDoor', { on: true })`) before `pairPhone`, the shape `probe:p349` uses (`build/p349/probe-p349.mjs:2122`); (c) `isQuietStoppedRejection` tests the rejection's JSON against the four exported constants of `src/shared/manifest-stopped-copy.ts` (imported), not the single hardcoded `STOPPED_WORDS` substring | Gap 3, the entry and 357's owed items (the running log, `357.1 QUEUED`). Each is read against the lines the entry names (`:1582-1586`, HD's launch, `isQuietStoppedRejection` at `:214-223`) |
| D6 | **The update carve-out.** The `will-quit` hard exit does not fire when an update is staged: it reads a staged signal from `src/main/updates/updater.ts` (a new exported predicate, e.g. `isUpdateStaged(): boolean` over `stagedVersion`), and when true it clears the sentinel and lets the quit proceed cleanly so Squirrel.Mac's own install-on-termination path runs unchanged | §0.1 item 5. The install submits ShipIt before the disposer, so a SIGKILL would still install, but the carve-out removes all doubt and costs nothing: a staged-update quit is rare and is not the crash-state case. It is a REQUIREMENT, not an option; §14 Q2 lets him drop it |
| D7 | **The crash state is reproduced only in scratch, through the checking build.** The probe's crash arm builds (or reuses the spec step's) checking better-sqlite3 under its own scratch, loads it into the app's main process by `NODE_OPTIONS=--require=<hook-bs3.cjs>` with `P358ADV_BS3` pointing at the scratch build, and arms `P358ADV_PLANT=crash-state`. It never replaces any checkout's `node_modules` and the shipped app carries no checker | §0 and the entry's "faults are made in scratch only". §2.1 is the spec step's own reproduction by exactly this method |
| D8 | **No new words, no new notice, no contract move.** The latch's existing `manifest-stopped` notice and `src/shared/manifest-stopped-copy.ts` are reused for Gap 2's latch (the ring now reaches the same latch). Gap 1 draws nothing new: the person sees the same notice when the list stops, and a quit is a quit | Just enough words; the entry's refusals; `gate:contract` must not move |

## 2. What the spec step measured, how, and the numbers

Everything ran under the history block except the app runs (history `743166 1793987027` / `23166 1790702242` before and
after every run, unmoved). Scripts, builds and logs are under `/private/var/tmp/tortie-wt/scratch/p3571/` (`crash/`,
`spec/quit/`, `spec/digest/`), kept for the verifier.

### 2.1 The checking build, and Gap 1 in plain node (the crash's own state)

A scratch copy of the parent's better-sqlite3 13.0.3 at `/private/var/tmp/tortie-wt/scratch/p3571/crash/bs3`, with
research 143's `adv-churn/tools/pcache-check-append.c` appended to `deps/sqlite3/sqlite3.c` and one
`p358adv_on_entry(...)` breadcrumb added at the top of `StatementIterator::Next` (`src/objects/statement-iterator.cpp`)
and before `sqlite3_close` in `Database::CloseHandles` (`src/objects/database.cpp`). Built with the checkout's own
node-gyp (`node-gyp rebuild --release -- -Dforce_build=1`), caches under scratch, 17 s, exit 0,
`build/Release/better_sqlite3.node` 1,998,256 bytes. `crash-state-node.cjs` drives a manifest-shaped WAL db (354 rows
of 12,000–17,000-byte payloads, `page_count` 1,085) the way `listSessions` and the ring's digest do, through the hook
(`hook-bs3.cjs`), in a forked child so a SIGSEGV is a reading and not a throw.

| Arm | Planted | Reads after the plant | Fresh `integrity_check` | `close()` | Child exit |
| --- | --- | --- | --- | --- | --- |
| control (no plant) | — | all ok | ok | returned | 0 |
| `crash-state` | the LRU tail left the hash, `pCache` 0, at check 500, `iKey` 1084 | **all ok** (`listSessions`, `getSession`, digest `iterate` × 1,416,000 rows) | **ok** | **SIGSEGV `0x34`, `pcache1EnforceMaxPage+0x68`** | 139 |

So no read failed and the file read fine, which is exactly why 357's latch never trips, and the close crashed at his
frame. The checker reported `C3 hash holds 1084 pages, nPage says 1085` from the plant and `C1`/`C2` would read the
crash's state on the live LRU, as research 143 §2.3 measured.

### 2.2 Gap 1 in a parent Electron (the real environment)

`crash/electron-arm.mjs` inside `build/harness-socket.mjs`, one parent Electron on a scratch profile/HOME/socket, every
probed agent hidden, with `hook-bs3.cjs` and `electron-preload.cjs` loaded into main by `NODE_OPTIONS`. The preload,
12 s after boot, opens a manifest-shaped db with the checking build, drives the digest `iterate` until the checker
plants the crash state, proves no read fails, holds the connection in a global so GC cannot close it early, and calls
`app.quit()`. Result (`crash/electron-arm.json`): `armed readsOk: true`, then on quit **SIGSEGV `0x34`,
`pcache1EnforceMaxPage+0x68`, exit 139**, `pcache1EnforceMaxPage` in the app's text, and **no macOS crash report was
written** (the checker's SEGV handler exits 139 first; names and mtimes read, none opened). The crash is the
environment teardown's own close of the held connection — no `db.close()` of the app's was needed — which is Gap 1 in
the real main process.

### 2.3 Gap 1, which exit avoids it (the fix's basis)

`crash/exit-modes.cjs`, the crash state planted, then the process ended four ways. The decisive pair is `return`
(never call `close()`, fall off the end) against `kill` (`process.kill(process.pid,'SIGKILL')`).

| Exit after the plant | Reads ok first | Result |
| --- | --- | --- |
| `close` — `db.close()` (the parent's quit) | yes | **SIGSEGV `0x34` `pcache1EnforceMaxPage+0x68`, 139** |
| `return` — skip `close()`, fall off the end | yes | **SIGSEGV `0x34` `pcache1EnforceMaxPage+0x68`, 139** (Node's environment teardown closed it) |
| `exit` — `process.exit(0)` | yes | no crash, 0 (a plain-node artifact: `process.exit` skips Node's env cleanup; in Electron's main process `app.exit`/`process.exit` DO run it, 357's M3, so this row is not a fix) |
| `kill` — `process.kill(process.pid,'SIGKILL')` | yes | **no crash**, signal SIGKILL |

So skipping `close()` alone does not help (Node's environment teardown closes every open better-sqlite3 connection); the
only exit that avoids the crash is the hard SIGKILL, which is D1 (hold, never close) plus D2 (SIGKILL before teardown).

### 2.4 Gap 1's cost: eight quit routes (the no-regression basis)

`spec/quit/quit-cost.mjs` inside `build/harness-socket.mjs`, one Electron at a time on the parent, each route on its own
scratch profile with three shells created, the Settings window opened and moved, and three `gmux.*` localStorage keys
written 6 s, 2 s and 0 s before the quit; then a relaunch on that profile reads back what survived. A witness
better-sqlite3 WAL connection is held open and never closed, so its `-wal` after the process (12,392 bytes) means no
SQLite close ran.

| Route | How it ended | localStorage kept | Settings bounds | witness `-wal` (close ran?) | Relaunch |
| --- | --- | --- | --- | --- | --- |
| `clean` (⌘Q bridge) | exit 0, Chromium shutdown | 3 of 3 | saved | gone (closed) | clean, 3 sessions, no unclean, sentinel clear |
| `clean-menu` (menu Quit) | exit 0 | 3 of 3 | saved | gone | clean |
| `clean-close` (last window closed) | exit 0 | 3 of 3 | saved | gone | clean |
| `disposer` (SIGKILL at `before-quit`) | signal | 2 of 3 (last lost) | **null (not yet saved)** | 12,392 (skipped) | clean, 3 sessions, no unclean, sentinel clear |
| `willquit` (SIGKILL at `will-quit`, no flush) | signal | 2 of 3 (last lost) | saved | 12,392 | clean |
| `quit` / `exit` (SIGKILL at `quit`/`exit`) | signal | 2 of 3 | saved | 12,392 | clean |
| `willquit-flush` ×4 (flush then SIGKILL at `will-quit`) | signal | **3 of 3** | **saved** | 12,392 | clean, 3 sessions, no unclean, sentinel clear, no crash dump |

The files each route wrote from the quit press on (`touchedByQuit`): a clean quit writes the GPU shader caches
(`DawnGraphiteCache`, `DawnWebGPUCache`, `GPUCache`), `DIPS`, `Local State`, `Network Persistent State`, `Preferences`
and the DOM/Session storage besides Tortie's own `manifest.db`, backup ring generation, snapshots and `settings.json`; a
`willquit-flush` quit writes Tortie's own files and the DOM/Session storage and **skips only** the GPU caches, `DIPS`,
`Local State` (a Chromium `uninstall_metrics.installation_date2`), `Network Persistent State` (an http/network-quality
cache) and `Preferences` (`spellcheck.dictionaries: ["en-US"]`, the default) — none of which is a person's data, and all
of which Chromium rebuilds. Tortie uses no IndexedDB and no user cookies (grepped). So `willquit-flush` is the route the
fix takes, and it loses nothing today's quit keeps.

### 2.5 Gap 2: what the ring's digest does with the damage (the parent)

`spec/digest/hidden.mb.test.ts` over the parent's SHIPPING `ManifestStore`, `ManifestRingSchedule` and `databaseFingerprint`:
a table's page is damaged on disk, the store's own connection is made to read it (so the damage lives in that
connection's cache), and the file is repaired, so a fresh `integrity_check` reads `ok` while the store's connection
answers `SQLITE_CORRUPT`.

- **The `sessions` table, met by `contentFingerprint` first**: the fingerprint answers a sha256 (not null), the store
  does **not** latch and posts no notice; a later `listSessions` throws and latches it (one `manifest.stopped` record,
  `file: fine`, `integrity_check` 0.5 ms). So the ring hides the error until a list read happens to meet it.
- **The `migrations` table, met by the ring's digest and by no list read**: the fingerprint answers a sha256 for the
  whole hour of polls, the store **never** latches, the notice never shows, and `listSessions` reads `ok` throughout.
  The ring took one generation at minute 31 — from an unrelated `setStatus` at minute 30 moving a different table's
  digest, never from the damage — proving the damaged table's `unreadable:` text is folded into the fingerprint and
  never seen. This is the hidden-error gap exactly.

### 2.6 The spec step's commands, exit codes and numbers

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `git clone --local` the parent, `checkout --detach 32180e60`, `cp -Rc node_modules build/vendor` | 0 | ~1 min | at `32180e60` |
| `npm run build` in the parent | 0 | 44 s | `contract-inventory: OK`, `conformance:harnessprobes` PASS |
| `node-gyp rebuild` the checking better-sqlite3 in scratch | 0 | 17 s | `better_sqlite3.node` 1,998,256 bytes |
| `crash-state-node.cjs` control, then `crash-state` | 0, 0 | ~10 s each | control clean; crash-state child 139, SIGSEGV `0x34 pcache1EnforceMaxPage+0x68`, reads ok |
| `exit-modes.cjs` (crash state) | 0 | ~20 s | close 139, return 139, exit 0, kill SIGKILL (§2.3) |
| `electron-arm.mjs` (one parent Electron) | 0 | 90 s | planted, readsOk, SIGSEGV `0x34 pcache1EnforceMaxPage+0x68` 139, no crash report |
| `quit-cost.mjs` run 1 (8 routes) | 0 | 355 s | §2.4; `clean-close` re-run in run 2 (a transient attach miss) |
| `quit-cost.mjs` run 2 (`clean-close`, `clean`, `disposer`, `willquit-flush` ×4, `-nowait`, `-menu`, `-close`) | 0 | 264 s | §2.4; `willquit-flush` kept 3 of 3 and the bounds |
| `hidden.mb.test.ts` over the parent (vitest) | 0 | 3 s | §2.5, 2 of 2 |
| the final Electron count (outside the block) | 0 | | none of this phase's; his own Tortie (pid 692) and other apps' crash handlers only; no `p3571` socket |

Lock slots taken and released by a `trap` on every app run. Disk 77→75 GB free across the runs.

## 3. The tree at this head: the paths Gap 1 and Gap 2 touch

**Gap 1 (the quit).** `src/main/sessions/core.ts`: `dispose()` `:4379-4436` (its `this.manifest.close()` at `:4433`),
`shutdownGmuxCore` `:4559` (calls `dispose()` after `takeManifestGenerationOnQuit` at `:1525`). `src/main/manifest/store.ts`:
`close()` `:575-588`, `held`/`manifestConnectionsLeftOpen` `:308-317`, the latch `:1066-1187`. `src/main/capabilities.ts`:
`disposeMainCapabilities` `:719-1134`, the wedged-watcher hard exit `:1099-1101` (kept), the manifest-held hard exit
`:1126-1132` (moved to `will-quit`). `src/main/index.ts`: the `before-quit` handler `:815-836` (calls
`disposeCapabilities`, then `app.quit()` on `'proceed'`), the new `will-quit` handler beside the composition root's
lifecycle wiring. `src/main/log/index.ts:360`: the existing `will-quit` sentinel clear (the new handler's clear
supersedes it on the hard-exit path). `src/main/updates/updater.ts`: the staged signal for D6.

**Gap 2 (the digest).** `src/main/db/digest.ts:124-149` (`digestOneTable`), `src/main/db/integrity.ts:181`
(`isBrokenConnectionError`, imported). Its callers, each unchanged in behaviour: `databaseFingerprint` (`digest.ts:115`),
`ManifestStore.contentFingerprint` → `fingerprintOrNull` (`store.ts:365`, already rethrows), `snapshotDatabase` and
`readDatabaseEvidence` (`src/main/manifest/recovery.ts:164,262`), `reconstruct.ts:1047` (fresh connection).

**Gap 3 (tooling).** `build/p357/probe-p357.mjs` (`:214-223`, `:1582-1586`, HD's launch), `build/p357/fixtures/`,
`build/conformance-stopped-list.mjs` (S6 and a new rule for D1/D2).

## 4. The design, item by item (real paths; the builder named on each)

### 4.1 The hold and the hard exit (builder `quit`)

`src/main/manifest/store.ts`: a module-level `let holdAllCloses = false` and `export function holdManifestClosesAtQuit(): void`.
`close()` holds (the `held.push(this.db)` + the one `leftOpenSaid` log line, no `this.db.close()`) when
`holdAllCloses || (this.stopped !== null && this.stopped.file === 'fine')`, and closes otherwise, exactly as 357's D10
on the non-held arms. The gate (§7) pins that `holdManifestClosesAtQuit` has exactly one production caller and that
`close()`'s hold condition is those two clauses.

`src/main/capabilities.ts`: `disposeMainCapabilities` calls `holdManifestClosesAtQuit()` once, on its first synchronous
lines, beside `beginCredentialShutdown()` (so the hold is set before `shutdownGmuxCore()` runs `dispose()`). Its
`:1126-1132` manifest-held branch is removed; the function's last line is `return 'proceed'` (the wedged-watcher branch
at `:1099-1101` still returns `'killed'`). `conformance:credentials` must stay green (the ordered disposer is read by
it).

`src/main/index.ts`: a `will-quit` handler. When `manifestConnectionsLeftOpen() > 0` and `!isUpdateStaged()` (D6): read
nothing, `session.defaultSession.flushStorageData()`, `clearLogRunSentinel()`, `event.preventDefault()`,
`process.kill(process.pid, 'SIGKILL')`. It imports `manifestConnectionsLeftOpen` from the manifest store, `session` from
electron, `clearLogRunSentinel` from the log, and the staged predicate from the updater. The existing
`before-quit` flow is unchanged: the disposer returns `'proceed'`, `app.quit()` closes the windows (Settings bounds
saved), then this handler fires.

`src/main/sessions/core.ts`: `dispose()` is unchanged in code; `this.manifest.close()` now holds because of D1. The
builder reads the dispose with the hold so the reach is reviewed.

`src/main/updates/updater.ts`: `export function isUpdateStaged(): boolean` over `stagedVersion` (the module's existing
field), one line, no behaviour change to the updater.

### 4.2 The digest (builder `digest`)

`src/main/db/digest.ts`: `import { isBrokenConnectionError } from './integrity';` and `digestOneTable`'s `catch`
becomes `catch (err) { if (isBrokenConnectionError(err)) throw err; return \`unreadable: ${(err as Error).message}\`; }`.
Nothing else in the file moves. A header paragraph cites §2.5 and names the one behaviour change: the ring's change test
now latches the store on a broken connection instead of folding its `SQLITE_CORRUPT` into the fingerprint.

### 4.3 The probe and the gate (builder `probe`)

`build/p357/probe-p357.mjs`: D5's three fixes, plus a crash-state arm group (D7): build or reuse the scratch checking
better-sqlite3, load it through `hook-bs3.cjs` with `P358ADV_PLANT=crash-state`, and drive the plant in a parent
Electron and a HEAD Electron (parent first). The parent arm expects the SIGSEGV at `pcache1EnforceMaxPage+0x68` on quit;
the HEAD arm expects **no crash** (the connection held, the process SIGKILLed at `will-quit`), the run sentinel cleared,
no `boot.unclean_exit` at the relaunch, and all three seeded sessions read back. A `--grader-self-test` grades recorded
fixtures and starts nothing. `build/conformance-stopped-list.mjs`: S6 rewritten for D2 (the manifest-held hard exit is
the `will-quit` handler, not `capabilities.ts`'s last branch), a new rule for D1 (`close()`'s hold condition and the one
`holdManifestClosesAtQuit` caller), and ablations each red on its own rule.

## 5. Words

No new user-visible string. The only CHANGELOG item, under `## Unreleased`, `### Fixed`, in his style, the commit link
added by the follow-up docs commit:

`- Quitting Tortie no longer crashes when its session list went bad without showing an error, and Tortie now notices
that trouble through its backup check too.`

(One item; if he would rather the quit change ride silently as part of 357's fix, §14 Q3.)

## 6. What moves on purpose

Nothing in the contract. No invoke channel, env name, schema, migration, pragma, smoke mode, `gmux.*` key or notice
kind. `docs/audits/contract-baseline.txt` must read byte for byte; a diff is a finding. `gate:contract` runs inside
`npm run build`.

## 7. The gates

### 7.1 `conformance:stoppedlist` (`build/conformance-stopped-list.mjs`, builder `probe`), widened

Pure node over the TypeScript parser, spawns nothing. The rules this phase adds or changes, each asked again over an
in-memory copy with it broken:

| Rule | Holds | Its ablation |
| --- | --- | --- |
| S6 (rewritten) | `disposeMainCapabilities` no longer hard-exits for the manifest at its end: its only `process.kill(... 'SIGKILL')` is the wedged-watcher branch (Phase 36), and it calls `holdManifestClosesAtQuit()` once on its first synchronous lines | the `:1126` branch left in; `holdManifestClosesAtQuit` not called |
| S11 (new) | `ManifestStore.close()` holds exactly when `holdAllCloses || (stopped && file 'fine')`; `holdAllCloses` is set only by `holdManifestClosesAtQuit`, which has exactly one production caller (`capabilities.ts`); `held`/`manifestConnectionsLeftOpen` unchanged | `close()` holding unconditionally (would leak every rebuild/smoke close); a second caller of `holdManifestClosesAtQuit` |
| S12 (new) | `src/main/index.ts` has one `will-quit` handler that hard-exits only when `manifestConnectionsLeftOpen() > 0 && !isUpdateStaged()`, after a `flushStorageData()` and a `clearLogRunSentinel()`; `flushStorageData(` appears once under `src/main` (round A rewrote it: a synchronous `preventDefault()`, then one bounded wait whose `finally` clears and kills; see "### Round A") | the notice/flush/sentinel order broken; the staged carve-out removed; a second `will-quit` SIGKILL |
| S13 (new) | `digestOneTable`'s `catch` first statement is `if (isBrokenConnectionError(err)) throw err;` and it otherwise returns the `unreadable:` text; `digest.ts` imports `isBrokenConnectionError` from `./integrity` | the rethrow removed; a `message.includes` |

CLAUDE.md's `conformance:stoppedlist` row gains the clause naming D1/D2's files. The 357 rows for S1–S10 stay.

### 7.2 The path-triggered gates the changed files trigger (CLAUDE.md, read at this head)

| Changed | Gate |
| --- | --- |
| `src/main/manifest/store.ts`, `src/main/db/integrity.ts`'s classifier (read only here), `src/main/log/*`, the disposer's last branch | `conformance:stoppedlist` |
| `src/main/capabilities.ts` (the ordered disposer) | `conformance:credentials` |
| `src/main/sessions/core.ts` | the integrator reads `git diff -U0 32180e60 -- src/main/sessions/core.ts` hunk by hunk; `dispose()` is in none of the named functions (`killSessionAdmitted`, `readEndTree`, `endAfterHangup`, `attach*`, `addRemoteProjectAdmitted`, the remove path, `addProject`), so **none of `conformance:endtree`/`farattach`/`machines`/`remoteclose`/`samefolder` is triggered**; run any whose function a hunk does touch |
| `src/main/db/digest.ts` | no path-triggered gate names it; the battery's `npm test` covers it, and `conformance:credentials`/`conformance:stoppedlist` do not read it. The ring-schedule and recovery unit tests must pass |
| `src/main/index.ts`, `src/main/updates/updater.ts` | none; the battery |
| `src/shared/ipc/**` or a `GMUX_*` name | **not touched**; `gate:contract` must still match |

## 8. The app run: `probe:p357` extended (builder `probe`)

One Electron at a time, the PARENT first (`P357_PARENT_CHECKOUT`), scratch profile/HOME/socket, every probed agent
hidden and `agents:list` read back. The existing arms (PA, HA, HB, HD, HC, RUN) stay and their fixes (D5) are proved by
`--grader-self-test`. The new crash-state arm group (D7): load the scratch checking better-sqlite3 through
`hook-bs3.cjs`, arm `P358ADV_PLANT=crash-state`, drive the plant to its check count over a manifest-shaped read, and

| Arm | Build | Expect |
| --- | --- | --- |
| CS-parent | parent | the plant fires, no read failed, and the quit SIGSEGVs at `pcache1EnforceMaxPage+0x68` (names and mtimes of any macOS report only; none opened) |
| CS-head | HEAD | the plant fires, no read failed, and the quit does **not** crash: the process ends by the `will-quit` SIGKILL, the sentinel is cleared, the relaunch has no `boot.unclean_exit`, and every seeded session reads back; `localStorage` and the Settings bounds survive (the §2.4 no-regression check at HEAD) |
| RUN | both | the preflights, the hidden agents, the census, every pid ended, the scratch server gone, and the `.run` marker not counted as a leftover socket (D5a) |

`build/p357/CHECKLIST.md` gains one plain line for the operator's seat: after he installs the release, a quit is a quit;
if the session list ever stopped, Restart as before.

## 9. Builders, disjoint files

### 9.1 The table (every file in exactly one list; a builder that must edit a file not in its list stops and names it)

| Builder | Files it owns (and their tests) |
| --- | --- |
| `quit` | `src/main/manifest/store.ts`, `src/main/sessions/core.ts`, `src/main/capabilities.ts`, `src/main/index.ts`, `src/main/updates/updater.ts`; tests `src/main/manifest/__tests__/p3571-hold-at-quit.test.ts`, `src/main/__tests__/p3571-quit-hardexit.test.ts` (new) and the existing `src/main/__tests__/p357-relaunch-and-quit.test.ts`, `src/main/updates/__tests__/*` that enumerate the updater's surface |
| `digest` | `src/main/db/digest.ts`; tests `src/main/db/__tests__/digest.test.ts` (extend), `src/main/manifest/__tests__/p3571-digest-latch.test.ts` (new, the §2.5 behaviour over the SHIPPING store) |
| `probe` | `build/p357/probe-p357.mjs`, `build/p357/fixtures/**`, `build/p357/CHECKLIST.md`, `build/conformance-stopped-list.mjs`; its own `npm test` covers the gate; it does NOT run the app (the verifiers do) |
| integrator | `CLAUDE.md`, `CHANGELOG.md`, `package.json` (only if a script changes — none expected), `build/verification-checks.mjs` (only if a check's paragraph changes), `build/assert-electron-teardown.mjs` (only if a new helper-reaching script is added), and any file two builders both need |

### 9.2 The seams, stated exactly so the three build at once

- `quit` exports from `src/main/manifest/store.ts`: `holdManifestClosesAtQuit(): void` (the one new export); `held`,
  `manifestConnectionsLeftOpen`, `MANIFEST_OPERATIONS`, `isManifestStopped`, `setManifestFaultHook` are 357's, unchanged.
  From `src/main/updates/updater.ts`: `isUpdateStaged(): boolean`.
- `digest` changes only `digestOneTable`'s `catch` and adds the one import; no export moves, so no other builder waits on
  it.
- `probe` reads the shipped exports; it adds nothing other builders import.
- `src/shared/*` is untouched, so the append-only rule is not exercised.

### 9.3 The builders' briefs

- **`quit`**: §4.1. The hold test uses the scratch checking build (or a stubbed `close` spy): with `holdAllCloses` set,
  `close()` pushes to `held` and calls no `this.db.close()`; without it, `close()` closes; a stopped-fine store holds as
  357 does; `manifestConnectionsLeftOpen()` reads `held.length`. The quit test, with electron mocked: the `will-quit`
  handler flushes, clears the sentinel and SIGKILLs only when a connection is held and no update is staged; the staged
  carve-out lets the quit proceed; the disposer no longer SIGKILLs for the manifest.
- **`digest`**: §4.2. The test drives the SHIPPING store over a damaged `sessions` and a damaged `migrations` table (the
  §2.5 method): with the digest rethrowing, the ring's `contentFingerprint` latches the store once with the notice and
  then answers its remembered fingerprint (357's fix round) and takes no copy; every non-broken error still returns the
  `unreadable:` text; `snapshotDatabase` over a genuinely damaged fresh file still aborts the copy.
- **`probe`**: §4.3, §7.1, §8. It runs the gate and `--grader-self-test`; it builds the checking better-sqlite3 in its
  own scratch and never touches `node_modules`.

Every builder runs `npm run typecheck` and `npm test` (under the history block; name the four `/bin/ps` tests as they
fail) before it returns, and returns every file it changed with its line counts.

## 10. The proof, run rather than read (Tier 3)

### 10.1 Lens A: the behaviour (Method 1 parent, Method 2 real data)

The gates once (§11). Then `probe:p357` whole, parent first, under a lock slot, `P357_KEEP=1`. Re-derive, by the
verifier's own code: the crash-state arm's SIGSEGV frame at the parent and its absence at HEAD; the no-regression quit
table at HEAD (localStorage and Settings bounds kept, sentinel cleared, no unclean boot); the digest latch over the
SHIPPING store on real damage of a `migrations`-shaped table (HEAD latches once, the parent never does). The independent
step: the verifier builds its OWN checking better-sqlite3 from research 143's kept sources (not the spec step's copy)
and plants the crash state by a different page than the spec step did.

### 10.2 Lens B: the attack (Method 3)

Read §3 and try, at HEAD, every quit route of §2.4 under a latch AND under the crash state (seam and checking build):
⌘Q, the menu, the last window closed, a quit while an update is staged (D6, with the updater's staged signal forced), a
quit with the Settings window open and moved, a sleep (`takeManifestGenerationOnSuspend` driven through its deps), and a
second quit while the first runs. For each: no SIGSEGV, the manifest generation on disk before the hard exit, the
relaunch clean, and nothing a person keeps lost against the parent. Then the digest: a hostile table set (a table the
ring reads but no list read touches, damaged; a table both read; the file genuinely damaged) and prove the latch fires
exactly on a broken connection and the `unreadable:` text stays for everything else. Then confirm `gate:contract` did
not move.

### 10.3 At the end, once

The Electron count with CLAUDE.md's command, outside the history block; every `p357`/`p3571` socket under
`/private/tmp/tmux-501/` gone; the history stats; every scratch native build removed or left only under
`/private/var/tmp/tortie-wt/scratch/p3571/`.

## 11. The integrator's commands (in order; each with its exit code and PASS line in the report)

1. `npm run typecheck`
2. `node build/contract-inventory.mjs --check` — it must match byte for byte (§6); a diff is a finding
3. `npm test` (the full suite under the history block; the four `/bin/ps` native tests named as the expected failures)
4. `npm run build` (gate:electron, gate:background, gate:checks, gate:contract, conformance:ios, conformance:harnessprobes and the rest inside it)
5. `npm run conformance:stoppedlist`
6. `npm run conformance:credentials` (CLAUDE.md: `capabilities.ts`' ordered disposer)
7. the core.ts hunk check (§7.2) and each gate it names (expected: none of endtree/farattach/machines/remoteclose/samefolder, because `dispose()` is in none of their functions — the integrator confirms per hunk)
8. the manifest/ring/recovery unit files (`src/main/manifest/__tests__`, `src/main/db/__tests__`) explicitly, because `digest.ts` moved and no path-triggered gate names it
9. `node build/p357/probe-p357.mjs --grader-self-test`
10. The Electron count, the socket check, the history stats

`smoke`, `smoke:t1`, `smoke:t3`, `smoke:quit`, `smoke:remote`, `smoke:machines` are NOT run by any role (their npm
scripts start `electron .` outside `build/electron-run.mjs`, which this phase's rule forbids). `smoke:quit` is the one
the main session should weigh at landing (§13), because this phase changes the quit it exercises.

## 12. What is NOT in this phase

- Not the cause of the damage (research 143 found none). No native module, Electron, watcher, allocator, gate-of-launch,
  ring-policy, schema, migration or pragma change. The checking better-sqlite3 is a scratch probe instrument only and
  never ships.
- No latch for the other five better-sqlite3 connections in main (the Codex state reader, the ring's and the gate's
  fresh connections, the overview store, `arch.db`, the symbol index). Each is in the same allocator class and could be
  damaged the same way; this phase holds only the session-list connection at quit, which is the one his crash was on.
- No new in-app fault seam; 357's `manifest-fault.ts` is unchanged.
- No diagnostic build shipped, no read of his crash dump; both wait for his word (research 143 §8 Q6, Q7).
- No release by itself.

## 13. For the main session at landing

1. `smoke:quit` exercises the quit this phase changes and was not run by any role (§11). It now ends the app by the
   `will-quit` SIGKILL rather than exit 0, so its verdict (exit 0 vs 134) no longer discriminates: the FreeEnvironment
   abort it guards is unreachable by construction (the SIGKILL skips environment teardown). Run it if an Electron
   outside the helper is allowed, and read it as "the clean SIGKILL, sentinel cleared, no crash report," not "exit 0".
   Consider whether `smoke:quit` should be rewritten to assert that.
2. Quit-and-install is proved only by reading the vendored updater (§0.1 item 5): ShipIt is submitted before the
   disposer, so the hard exit still installs, and D6's carve-out makes a staged-update quit proceed cleanly anyway. A
   real signed install was not driven. Weigh an update rehearsal before the release.
3. Owed, found here, not this phase's: the other five main-process SQLite connections have no hold at quit (§12); a
   future round may widen the hold or move the watcher out of main (research 143 §7).
4. Cleanup after the follow-up commit: the worktree, `/private/var/tmp/tortie-wt/wt-p3571-parent`, and
   `/private/var/tmp/tortie-wt/scratch/p3571/` (the checking build included).

## 14. Questions for him (the main session asks; the build proceeds on the defaults)

1. **The quit's rule** (Gap 1), as it lands after round A. Default: every quit that reaches the core's dispose,
   which holds the session list's connection open, ends by the hard exit (SIGKILL to self) at `will-quit`, after the
   remembered settings are flushed as the quit begins and again at `will-quit` and the exit has waited, at most 1 s,
   for the storage log on disk to stand whole and still (his ruling of 2026-11-08, "1. a"; round A), and keeps
   everything a person keeps: every session, the window positions, zoom and the other remembered settings, the session
   list, and no "quit unexpectedly" message at the next launch; only Chromium's own caches and internal metrics are
   skipped, and it rebuilds them (measured, §2.4, and the landing reverify's R1, R1b, R2 and R4 to R7: the menu's Quit
   with and without its first-quit toast, the bridge quit, the last window closed, Restart on the stopped notice, a
   quit with nothing ever opened, and the menu's 3 s fallback when it came after the dispose; and round A's busy-Mac
   measurement, 0 of 48 quits losing a write at each build, 36 of them under 24 busy loops, the toast's flag and a
   closing window's own write among them). His one field crash went through that dispose (research 143 §9.3), so it
   is closed. The trade against today: such a quit ends by a signal rather than code 0 (the two quit smokes read the
   signal since the landing round's F2), and its process outlives its windows by the wait, ending about 170 ms after
   `will-quit` where the parent's orderly shutdown ended a median of 40 ms after it on an idle Mac and 744 ms under 24
   busy loops, with a tail to 36 s ("### Round A").
   One quit ends exactly as today, the crash state included: a menu quit long enough, at his live-session count with
   their scrollback, for its own 3 s fallback to quit before the core's dispose. Nothing is held yet, so it ends
   through Node's teardown as the parent's does. It is queued as Phase 362 with the landing round's F1 as its patch and
   F1's trade to choose: F1 ended that quit by the hard exit too, but then never keeps the quit-time scrollback copies
   in flight, which the parent's teardown sometimes lets land. The narrower alternative, the hard exit only after a
   fault (357's rule), keeps today's clean quit everywhere but leaves the crash-state quit through dispose, his field
   crash's path, still crashing. The build takes the default.
2. **The update carve-out** (D6). Default: the hard exit does not fire when an update is staged, so quit-and-install is
   byte-for-byte today. It costs nothing; drop it only if he wants the hard exit on every quit without exception.
3. **The CHANGELOG line** (§5). Default: the one `### Fixed` item above. The other choice is to let the quit change ride
   silently inside 357's 0.114.1 note (357 already shipped), in which case 357.1 adds no CHANGELOG item.

## §As built (the integrator, 2026-11-06)

The three builders' files as they returned them, plus the integrator's. `git diff 32180e60` is this phase alone: 15
tracked files changed (1,527 insertions, 250 deletions) and 4 new (this file, 512 lines before this section, and the
three test files: `p3571-quit-hardexit.test.ts` 537, `p3571-hold-at-quit.test.ts` 489, `p3571-digest-latch.test.ts`
697), nothing staged, committed or stashed. Scratch, logs and the runner are under
`/private/var/tmp/tortie-wt/scratch/p3571/integrator/` (`run.sh`, `logs/`, `hc-seam/`).

### What the integrator changed, and why

| File | Change | Where it comes from |
| --- | --- | --- |
| `src/main/__tests__/p357-relaunch-and-quit.test.ts` | +24/−25: the quit builder's own patch, applied as handed off (`git apply --check` then `git apply`; the result equals the builder's copy byte for byte). Its D12 case now expects the disposer to answer `proceed` with no signal, no sentinel clear and no quit line, the connection still held | A seam. §9.1 lists the file in `quit`'s set, the builder's task list did not, so the builder stopped, named it and handed a patch it had run 12 of 12 in a scratch clone. Without it `npm test` held one failure beside the four `/bin/ps` tests (`expected 'proceed' to be 'killed'`) |
| `build/p357/probe-p357.mjs` | +8/−2 of its 429/−36 (`hc-seam/probe.diff`): HC's `reads` name `quit.signal` for `quit.code`; HC's last clause reads `quit.signal === 'SIGKILL'` ("…and the quit reached the will-quit SIGKILL (Phase 357.1 D1/D2)"); `crashArm` reads the shim's line with `quitTextReading`, exactly as `realDamageArm` does for HA | A seam between D1/D2 and the probe. The `probe` builder moved HA, HQ, HB and CS-head to the will-quit SIGKILL and left HC at `quit.code === 0`. HC launches HEAD and quits through `window.gmux.quit()`, so the store is held, the process ends by the SIGKILL, the shim prints `exited with signal SIGKILL` and exits 1, and `build/electron-run.mjs` resolves `exited` with that 1: HC would have read FAIL at HEAD on every live run |
| `build/p357/fixtures/graders.json` | +50/−4 of its 322/−22 (`hc-seam/graders.diff`): HC's honest quit `{ code: 1, signal: 'SIGKILL' }`; the one mustFail naming the old clause renamed; two broken fixtures (no signal; SIGSEGV) and two raw fixtures through the live reader (the shim's SIGKILL line passes, no line fails); `readings` 135 → 139 | The same seam; the shapes are HA's |
| `CHANGELOG.md` | +6: `## Unreleased`, `### Fixed`, §5's item with no full stop and no link (the follow-up adds the link) | §5 |
| `CLAUDE.md` | +2/−2: `conformance:stoppedlist`'s row names `digestOneTable`, the disposer's first lines, the `will-quit` handler and `isUpdateStaged`, the 0.98 s reading, S6 and S11 to S13 and what a quit through `app.quit()` now ends with; `probe:p357`'s row names the quit hold and the `will-quit` handler, the CS arms and the two parents PA and CS-parent need | §7.1 ("the row gains the clause naming D1/D2's files"), the brief |
| `build/verification-checks.mjs` | +28/−14, comments only: `conformance:stoppedlist`'s paragraph says thirteen rules and the quit hold; `probe:p357`'s says the CS arms and the checking build. No classification moved (`gate:checks` 280 scripts, as before) | §9.1 ("only if a check's paragraph changes"); both paragraphs had become untrue |

Not changed, each checked: `package.json` (no script moved), `build/assert-electron-teardown.mjs` (no new script reaches
the helper: 181 against a floor of 181), `docs/audits/contract-baseline.txt` (`--check` matches byte for byte).

### Decisions the integrator made

1. **The two seams above, and nothing else in a builder's file.** PA (F1 below) is not a seam between builders but a
   question of what PA measures at this phase's parent, so it is named, not edited.
2. **Every command but the Electron count ran under the history block**, through `run.sh`: `HOME` and `ZDOTDIR` in
   scratch, `HISTFILE=/dev/null`, no `TERM_SESSION_ID` or `TERM_PROGRAM`, and `TMPDIR` spelled
   `/var/tmp/tortie-wt/scratch/p3571/integrator/tmp`, because `preview/protocol.test.ts` needs a temporary folder reached
   through a link (both builders measured the `/private/var` spelling failing it). After the first command npm printed
   its "new major version" notice, which means it asked the registry once; every later command ran with
   `npm_config_update_notifier=false`.
3. **No `smoke`, `smoke:t1`, `smoke:t3`, `smoke:quit`, `smoke:remote` or `smoke:machines`** (§11, the brief). No package.
4. **The battery ran twice**: the integrator's commands in §11's order (test before the build), then `typecheck && build
   && test` once on the final tree after the shared files and the HC seam were written.
5. **The gates the disposer change triggers beyond §11**: `conformance:pocket` and `:pocket:hostile` (CLAUDE.md names
   "the quit in `src/main/capabilities.ts`"), and `conformance:push`, whose P2 reads the disposer's order.

### Commands, exit codes and numbers

His shell history read `743166 1793987027` and `23166 1790702242` before and after every run, unmoved.

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `df -h /` | 0 | | 74 GiB free before the first build, 73 GiB at the battery's, 74 GiB at the end |
| `npm run typecheck` | 0 | 5 s | import boundaries 0 violations (1,437 files, 8,213 imports); 0 runtime cycles (1,434 files, 5,021 edges); shared types OK |
| `node build/contract-inventory.mjs --check` | 0 | 1 s | "matches docs/audits/contract-baseline.txt byte for byte" |
| `npm test` (before the build) | 1 | 67 s | 1,187 files (1,182 passed, 3 failed, 2 skipped); 22,384 tests: 22,366 passed, 4 failed, 14 skipped |
| the four failures, both runs | | | the `/bin/ps` tests, expected inside the block: `process-table.native` "sees this process under its true parent and walks the chain to it", `ps.native` "sees this process under its true parent" and "finds a child this test spawned among the descendants of this pid", `p269-env-names` "kills a shell that never exits, on the deadline, leaving no survivor" (`spawnSync /bin/ps EPERM`). No FSEvents test failed this time (357's integrator saw five) |
| `npm run build` | 0 | 47 s | `gate:electron` 181 reach the helper against a floor of 181 (577 files); `gate:background` 579 files, 3 long-lived starts each ended in a `finally`, 32 of 32 fixtures; `gate:simulator` 5 against 5; `gate:docker` 2 against 2; `gate:knownhosts` 607 files; `gate:checks` 280 check scripts, 55 `tsxCli()` callers against 54, 1,187 test files; `conformance:ios` 55 rules; `gate:onlyadd` PASS (4 frozen sets, 52 routes, 646 requests); `conformance:harnessprobes` 6 clauses, 16 ablations, 689 files; `gate:stapler` 31 answers, 18 sequences, 28 ablations; `contract-inventory` OK |
| `npm run conformance:stoppedlist` | 0 | 0.98 s (timed through npm) | 13 rules over 1,434 files; 60 of 60 ablations red on exactly their own rules; the control green; S8 drove 19 environment shapes, 3 source variants and the shipped export |
| `npm run conformance:credentials` | 0 | 44 s | 9 of 9 disposer fixtures, 78 of 78 ablations red, 22 of 22 scanner fixtures, 9 vendor call sites |
| the `core.ts` hunk check (`git diff -U0 32180e60 -- src/main/sessions/core.ts`) | | | ONE hunk, `@@ -4431,0 +4432,5 @@`: five comment lines inside `dispose()` (`:4379`–`:4442`), above its unchanged `this.manifest.close()`. No function a path-triggered gate names (`killSessionAdmitted`, `readEndTree`, `endAfterHangup`, `attach*`, `detachSession`, `beginShutdown`, `addRemoteProjectAdmitted`, the remove path, `addProject`, `listSessions` and the five catches): none of `conformance:endtree`, `:farattach`, `:machines`, `:remoteclose`, `:samefolder` was triggered or run |
| `npx vitest run src/main/manifest/__tests__ src/main/db/__tests__` | 1 | 23 s | 44 files; 648 tests: 647 passed, 1 failed, `process-table.native` (`/bin/ps`) |
| `node build/p357/probe-p357.mjs --grader-self-test` (the builders' tree), lock slot `electron.lock` | 0 | < 1 s | 9 graders, 50 clauses each shown red alone, 28 needs each shown unreadable alone, 138 fields, 47 raw fixtures |
| the same after the HC seam, lock slot `electron.lock` | 0 | < 1 s | 9 graders, 50 clauses, 28 needs, 138 fields, 49 raw fixtures; HC's new clause red alone, its four new fixtures each answering as they say |
| `npm run conformance:pocket` | 0 | 11 s | 192 rules, 25,727 checks |
| `npm run conformance:pocket:hostile` | 0 | 18 s | 363 arms |
| `npm run conformance:push` | 0 | 6 s | 26 rules, 2,408 checks |
| the battery on the final tree: `npm run typecheck`, `npm run build`, `npm test` | 0, 0, 1 | 2 s, 44 s, 62 s | the same numbers as above; the same four `/bin/ps` failures and nothing else |
| the Electron count (`ps -Ao pid,ppid,rss,comm \| grep -E "[E]lectron\|Tortie$\|chrome_crashpad"`, outside the block, once) | 0 | | none of this phase's: his own Tortie (pid 692) and its crash handler (2727), and other applications' crash handlers (Slack, Chrome, Granola, Cursor) |
| the socket check | | | no `p357` or `p3571` name under `/private/tmp/tmux-501/` |

The integrator started no Electron, no tmux server and no long-lived process. Lock slots were taken twice for the
grader self-test (`electron.lock`) and released by a trap; all three slots read free at the end.

### Found here, for the verifiers and the main session

1. **PA cannot pass at this phase's parent, by construction.** Its title and clauses describe 357's own parent
   `0547383e` (an uncaught exception per external rename with his stack, a raw `SqliteError` for a create it spawned,
   no `crash` scope in app.log), and 357 as landed, `32180e60`, fixed every one of them. The default `P357_ARMS` is
   `PA,HA,HB,HC,CS`, `SNAPSHOT` reads `32180e60`, and `--preflight` says PA needs that build. So a whole run against
   `wt-p3571-parent` reads PA FAIL; leaving PA out makes HQ (armed whenever HA runs) UNREADABLE. CS-parent, by the
   entry, needs 357 as landed. One `P357_PARENT_CHECKOUT` cannot serve both: run `P357_ARMS=PA,HA` against a built
   `0547383e` (no such build is kept; `wt-p357-parent` was removed at 357's cleanup) and `P357_ARMS=HB,HC,CS` against
   `wt-p3571-parent`, or the fixer re-scopes PA to 357 as landed (the latch, the notice, a quit that exits 0 because
   the file is damaged, which is what HQ times).
2. **`smoke:quit` and `smoke:quitdoors` now exit 1, by construction.** Both end with the real `app.quit()` and take the
   process's exit as their verdict (`src/main/harness/quit.ts`, `quit-doors.ts`). Both boot the core, so the disposer
   holds the manifest and `will-quit` ends the process by SIGKILL; `node_modules/electron/cli.js` prints `exited with
   signal SIGKILL` and exits 1, and `build/harness-socket.mjs` exits with its child's code. §13 names `smoke:quit`;
   `smoke:quitdoors` (Phase 144's gate) is not named anywhere. Every other harness mode ends with `app.exit()`, never
   reaches the disposer, and is unchanged, and no CI lane runs either quit smoke (`compat`, `durability`, `release`
   and `gates` run create/verify, t3, migrate, identity, procid, basic and the fault battery). 357's landing ran
   `smoke:quit`; this one will read red unless the smoke is rewritten to read the SIGKILL, the cleared sentinel and no
   crash report.
3. **A second quit while the first runs is routine, not rare.** `requestQuit` (`src/main/menu.ts:240-250`, ⌘Q and the
   menu's and the status item's Quit) arms `setTimeout(() => app.quit(), 3_000)` and never clears it, while the
   renderer asks `app:quit` at once (1.5 s on the first quit with a live session). So any quit whose disposer runs past
   3 s gets a second `app.quit()`; the `before-quit` handler lets it through, the windows close and `will-quit` runs
   mid-disposer. At the parent that ends the process through Node's environment teardown mid-disposer; at HEAD, once
   `dispose()` has held the connection, it ends by the SIGKILL there, skipping the disposer's later steps (the watcher
   drains, the door and alert joins, the tray). Not new in kind; §10.2's "a second quit while the first runs" should be
   driven through this timer.
4. **`build/conformance-stopped-list.mjs`'s header for S5** still says the latch's push is the one push onto `held`
   ("one push, in `latch`"); since D1 `close()` pushes too, and the rule's code allows it. A comment only.
5. **Carried from the builders, not acted on.** `src/main/harness/p118-remote-children.ts` says the manifest was
   "closed by the teardown above" after its direct disposer call; it is now held, and its read-only read still works
   under WAL (`smoke:p118` needs a scratch machine and was not run). The rebuild's warning dialog in
   `reconstruct-operator.ts` would count a digest failure as "1 rows did not read back" (wording). A store the quit has
   held still answers a late caller, which now writes where the parent threw; the quit builder found no such caller.
   Whether macOS offers to reopen windows after a self-SIGKILLed quit of a signed, installed app was not measurable.

### The landing round (the fixer, 2026-11-06)

The round that finishes what landing needs, run once, on the approved verdicts' problems as the main session summarised
them (F1 to F5). It is not a redesign: the timer, the renderer's toast, `before-quit`'s second pass and when the windows
close are untouched, and §14's defaults stand (every quit ends by the hard exit; D6 kept; one CHANGELOG item, whose words
are left to the main session). Scratch, logs and the runners are under `/private/var/tmp/tortie-wt/scratch/p3571/fixer/`
(`run.sh`, `lockrun.sh`, `measure/`, `logs/`, `out/`, the two ablation copies `abl-nowillquit/` and `abl-heldonly/`).
His shell history read `743166 1793987027` and `23166 1790702242` before and after every run, unmoved. Every Electron
went through `build/electron-run.mjs` inside `build/harness-socket.mjs` (the measurement script, the probe, and since F2
the two smokes too), each under a lock slot released by a trap, with HOME and ZDOTDIR in scratch, HISTFILE=/dev/null and
TERM_SESSION_ID, CSC_*, APPLE_*, GH_TOKEN and GITHUB_TOKEN unset; every other command ran under the history block.

#### F1 measured first: the menu's own Quit, at the parent and at the first build

`measure/menu-quit.mjs` with `measure/menu-quit-preload.cjs`, one Electron at a time, his recorded shape seeded through
`build/p3167/seed-sessions.mts --shape his`, the press being the native menu's own "Quit Tortie" row clicked in main
(`item.click()`, which is how the row reaches `requestQuit()`, so the 3 s timer is armed), never osascript and never
`window.gmux.quit()`. Times are milliseconds after the press, on main's own clock, recorded with `appendFileSync`; the
core's `dispose()` is read by `http.Server#closeIdleConnections`, whose one caller in main is the hook server's stop
inside it, and the quit's two named points by `GMUX_FAULT_TRACE`. A quiet machine (load 6 to 11 on 12 cores).

| Build | World | Renderer's quit (after the toast) | Snapshots begin, end | `dispose()` | Disposer's end | Timer's `app.quit()` | `will-quit` | End |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| parent `32180e60` | his rows + 3 shells | 1,510 | 1,514, 1,582 | 1,614 (the session list closed there) | 1,618 | never (gone) | 1,724 | exit 0 |
| first build (357.1 approved) | his rows + 3 shells | 1,516 | 1,521, 1,592 | 1,629 (held) | 1,633 | never | 1,742 | SIGKILL at will-quit |
| parent | his rows + 64 shells, 11,964 to 23,982 lines each | 1,511 | 1,516, never | **never** | never | 3,001 | **3,116** | exit 0 through Node's teardown at 3,126 |
| first build | the same | 1,508 | 1,511, never | **never** | never | 3,001 | **3,116** | **exit 0 through Node's teardown at 3,130**, the live connection closed there |
| parent, again | the same | 1,517 | 1,520, never | never | never | 3,003 | 3,145 | exit 0 at 3,166 |
| this round | the same | 1,510 | 1,513, never | never | never | 3,000 | 3,117 | **SIGKILL at will-quit** |

So on the probe's shape the timer never fires (the process is gone at 2.4 s), and on his live-session count with the
scrollback a quit saves, the disposer is still in the snapshot pass when the timer fires: its quit closes the window and
reaches `will-quit` at +3.1 s, before the core's dispose, at the parent AND at the first build, which held nothing yet
and so let Node's teardown close the live session list connection, exactly the close research 143 crashed.

A trade, measured and not taken away: the snapshot pass is cut by that timer at both builds (64 writes in flight, the
renames after them not done). At the parent, Node's teardown drained some of them by luck: 63 of 64 renames landed after
`will-quit` in one run, 0 in the second, and 0 at the first build. With the hard exit at `will-quit` none lands. The
earlier quit-time snapshot of each session stays, and nothing is corrupted (each is a temporary file and a rename), but
in that one scenario a quit-time scrollback the parent sometimes kept is not kept. Closing it means holding the quit open
past the timer, which is the trade §14 left out; it is named for the main session in "For the landing" below.

#### F1 closed in the hard exit (`src/main/manifest/store.ts`, `src/main/index.ts`)

- The store owns the answer: `export function manifestOpenAtQuit(): boolean` is `held` first
  (`manifestConnectionsLeftOpen() > 0`), then `if (!holdAllCloses) return false;`, then
  `opened.some((ref) => ref.deref()?.open === true)`. `opened` is a module-level array of `WeakRef`s written only by
  `noteOpened`, which the constructor calls on `this.db` as the statement right after `openGmuxDatabase(…)`; a WEAK list,
  so it keeps no connection from the collector and changes nothing about when one is closed (a collected connection was
  closed by better-sqlite3's own destructor, and one `close()` closed reads `open` false, so neither is counted). With no
  connection ever opened, or every one closed before the quit began, it answers false and the quit proceeds as before.
- `index.ts`'s one `will-quit` handler asks `manifestOpenAtQuit() && !isUpdateStaged()` and no longer imports
  `manifestConnectionsLeftOpen`.

#### F3, the flush cannot stop the exit

`try { session.defaultSession.flushStorageData(); } finally { clearLogRunSentinel(); event.preventDefault();
process.kill(process.pid, 'SIGKILL'); }`, inside the guard: whatever the flush does, the sentinel is cleared first, then
the default quit prevented, then the signal (`clearLogRunSentinel` already never throws).

#### F1(c), proved live with the crash-state plant on the menu path (`probe:p357`'s new CM arms)

`P357_ARMS=CM` against `wt-p3571-parent`, his shape, 64 shells each given 12,000 lines of coloured scrollback on the
run's scratch server (the fewest read back before the quit: 10,679 at CM-parent, 10,661 at CM-head), the spec step's checking better-sqlite3 through
`hook-bs3.cjs`, the three `gmux.*` keys and Settings opened and moved, then closed through its own window close, then the
menu's own Quit row (`build/p357/probe-p357.mjs`, `MENU_PRELOAD`). 62 s for both builds, exit 0:

| Arm | Renderer's quit | Timer's quit | `will-quit` | `dispose()` | Plant | End | Relaunch |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CM-parent PASS | 1,509 | 3,002 | 3,106 | never | the session list's own connection | **SIGSEGV at 0x34 in `pcache1EnforceMaxPage+0x68`, exit 139**, no macOS report | |
| CM-head PASS | 1,511 | 3,003 | 3,107 | never | the session list's own connection | **SIGKILL**, no crash, no report | 166 sessions, the same ids, all 64 shells, no unclean-exit notice, `localStorage` 3 of 3, the Settings bounds kept, 2 boots in app.log |

The F1 ablation, a scratch copy of this tree with only the first build's guard put back
(`manifestConnectionsLeftOpen() > 0 && !isUpdateStaged()`, `abl-heldonly/`, built, 44 s): CM-parent PASS again (3,000 and
3,104) and **CM-head FAIL, SIGSEGV at 0x34 in `pcache1EnforceMaxPage`, exit 139**, so the predicate is what closes it.

Two earlier CM runs read UNREADABLE, by design, and changed the arm: a harness app is never the active app, so no window
is focused and `requestQuit()` sends its event to the NEWEST window (measured: `getAllWindows()` answered Settings first,
`getFocusedWindow()` null, and `focus()`, `show()`, `blur()` and `setFocusable(false)` moved none of it), whose page asks
no quit; only the fallback quit came, as a first pass, and the dispose came first. So the arm closes Settings through its
own close before the press (its bounds are saved there), and a run whose event still went elsewhere, or whose dispose came
before `will-quit`, is UNREADABLE (`CM_SETTINGS_NEED`, `CM_PRESS_NEED`, `CM_RACE_NEED`). The Settings bounds at a quit
with the window open stay CS-head's, which still reads them.

`P357_ARMS=CS` at this build, to show nothing it proved moved: CS-parent PASS (SIGSEGV 0x34,
`pcache1EnforceMaxPage+0x68`, exit 139), CS-head PASS (SIGKILL, 105 sessions the same ids, no unclean exit, 3 of 3, the
bounds, 2 boots), 54 s, exit 0.

#### F2, the two quit smokes read the new quit (`build/quit-smoke.mjs`, `src/main/harness/quit.ts`)

Both npm scripts now run `node build/quit-smoke.mjs quit|quit-doors` inside `build/harness-socket.mjs` (after
`npm run build`, as before). It launches each leg itself through `withElectron` with the Electron binary, so the signal is
the app's own, on a fresh profile and scratch HOME inside the run folder, GMUX_LOG_FILE=1 so the sentinel is armed, and
grades it with pure verdicts that first grade their own 33 fixtures on every run (`--self-test` alone starts nothing).
`smoke:quit` has two legs: `held` (GMUX_SMOKE=quit, the core booted; PASS is SIGKILL, the store's "left open at quit"
line, the sentinel armed then cleared, no Crashpad dump, no macOS report by name and time; an abort, a segfault, an exit
0 with a session list open and Phase 36's own SIGKILL each FAIL with its reason) and `teardown`, PHASE 36'S GUARD WHERE
IT STILL APPLIES: the new GMUX_SMOKE=quit-teardown, the same watcher race and eight pbkdf2 jobs with the core never
booted, so no session list connection exists and the REAL `app.quit()` runs Node's teardown, the product's own quit with
nothing held (a quit before the session list opened, or after it could not). Exit 0 is its pass and 134 its failure, as
before, and a SIGKILL there fails too. `smoke:quitdoors` keeps its nine door verdicts (its own `9/9 PASS` line) and only
its end is read, as `held`'s. No seam: the new mode only declines to boot the core.

| Run | Exit | Reading |
| --- | --- | --- |
| `npm run smoke:quit`, this build (twice, the second on the final tree) | 0, 0 | held PASS (SIGKILL after 2,050 and 2,040 ms, the held line, the sentinel cleared, no dump, no report); teardown PASS (exit 0 after 1,711 and 1,676 ms, nothing held, no session list made) |
| `npm run smoke:quitdoors`, this build (twice) | 0, 0 | doors PASS: 9 of 9, SIGKILL after 1,639 and 1,461 ms, the held line, the sentinel cleared, no dump, no report |
| the rewritten smokes against the parent (`QUIT_SMOKE_CHECKOUT=wt-p3571-parent`) | 1, 1 | the expected FAIL, the point of the rewrite: held "exited 0 with a session list open" (1,836 ms); teardown "this build has no GMUX_SMOKE=quit-teardown"; doors 9 of 9 but exit 0 (1,391 ms) |
| both against `abl-nowillquit/`, this tree with the `will-quit` hard exit removed, built (45 s) | 1, 1 | held FAIL "exited 0 with a session list open" (2,035 ms, the held line said); teardown PASS (exit 0); doors FAIL, 9 of 9 but exit 0 (1,415 ms) |

The contract moved, on purpose and by two lines: `[harness.smoke.modes] count=38` became `count=39`, and `quit-teardown`
was added between `quit-doors` and `reconstruct` (`node build/contract-inventory.mjs --out
docs/audits/contract-baseline.txt`, then `--check` byte for byte). No invoke channel, env name, schema or key moved.
`HELPER_USER_FLOOR` rose from 181 to 182 for `build/quit-smoke.mjs` (obligation 1), and `build/verification-checks.mjs`
says what both smokes now read (their classification, `electron`, unchanged).

#### F4, the words

CLAUDE.md's `probe:p357` row and `build/verification-checks.mjs`'s paragraph name one parent, 357 as landed
(`32180e60`), for every parent arm; `build/p357/CHECKLIST.md` quotes the app's own words, "Tortie quit unexpectedly last
time." (`src/renderer/state/subscriptions.ts`), at both places it quoted words the app never shows. CHANGELOG.md is left
to the main session. CLAUDE.md's `conformance:stoppedlist` row says what the hard exit asks, the `finally`, and what the
two smokes now prove.

#### F5, the gate and the probe

`conformance:stoppedlist`: S11 gains the predicate, the weak list and the constructor's note (seven new ablations: the
held answer dropped, the quit-hold gate dropped, every connection ever opened counted, the connection kept strongly, the
note removed, the note moved after the migrations, `opened` emptied elsewhere); S12's guard is the store's one answer
with `manifestConnectionsLeftOpen()` asked nowhere in index.ts and `manifestOpenAtQuit(` called once under src, and its
F3 shape is the flush alone in a `try` whose `finally` is exactly the clear, the prevent and the kill, with no catch,
inside the guard's own block (eight new ablations, the two old `||` and negation ablations rewritten for the predicate,
and the probe review's five kept). 82 of 82 ablations red on exactly their own rules, the control green, 13 rules over
1,434 files. `probe:p357`: CM-parent and CM-head, `menuQuitReading`, 11 graders, 59 clauses each shown red alone, 66 needs
each shown unreadable alone, 201 fields, 100 raw fixtures, 249 readings.

#### Commands, exit codes and numbers

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `npm run typecheck` | 0 | 2 s | 1,437 files, 8,213 imports, 0 violations; 1,434 files, 5,021 edges, 0 cycles |
| `node build/contract-inventory.mjs --check` | 0 | < 1 s | byte for byte, after the two-line regeneration above |
| `npm test` | 1 | 61 s | 1,187 files (1,182 passed, 3 failed, 2 skipped); 22,393 tests: 22,375 passed, 4 failed, 14 skipped. The four are the `/bin/ps` tests inside the history block (`spawnSync /bin/ps EPERM`): `process-table.native` "sees this process under its true parent and walks the chain to it", `ps.native` "sees this process under its true parent" and "finds a child this test spawned among the descendants of this pid", `p269-env-names` "kills a shell that never exits, on the deadline, leaving no survivor" |
| `npm run build` (the final tree) | 0 | 44 s | `gate:electron` 182 of 578 files against a floor of 182; `gate:background` 580 files, 3 long-lived starts in a `finally`, 32 of 32 fixtures; `gate:checks` 280 scripts; `conformance:harnessprobes` 6 clauses, 16 ablations, 689 files; `contract-inventory` OK |
| `npm run conformance:stoppedlist` | 0 | 1.1 s | 13 rules, 82 of 82 ablations, the control green |
| `npm run conformance:credentials` | 0 | 42 s | 9 of 9 disposer fixtures, 78 of 78 ablations |
| the five phase files and `quit-admission.test.ts` (vitest) | 0 | 7 s | 6 files, 80 of 80 |
| `node build/p357/probe-p357.mjs --grader-self-test` | 0 | < 1 s | as F5 |
| `node build/quit-smoke.mjs --self-test` | 0 | < 1 s | 33 of 33 fixtures |
| the Electron count, once, at the end, outside the block | 0 | | none of this round's: his Tortie (pid 692) and its crash handler (2727), and Slack's, Chrome's, Granola's and Cursor's crash handlers |
| the socket check | | | no `p357`, `p3571`, `smoke-quit` or `p144-doors` name under `/private/tmp/tmux-501/` |

#### For the landing

1. The snapshot trade above: on a menu quit long enough for the timer, both builds cut the snapshot pass, and the parent
   sometimes kept the in-flight renames that the hard exit now does not. Keeping them means not letting the timer quit
   while the disposer runs (clearing it once the renderer's quit arrives, which keeps the window up for a long quit), the
   trade this round was told not to take.
2. `smoke:quit` and `smoke:quitdoors` are ready to run as the main session runs them; they read PASS here twice each.
3. Found, not this phase's: after the parent's (and the first build's) teardown crash the relaunch posts no unclean-exit
   notice, because the log's own `will-quit` cleared the run sentinel before teardown ran; a crash in teardown is invisible
   to the next launch's notice.
4. Cleanup after the follow-up commit adds `/private/var/tmp/tortie-wt/scratch/p3571/fixer/` (the two ablation copies are
   about 1.3 GB each, clones of this tree with `.git` removed) to §13 item 4.

### The drop round (the fixer, 2026-11-06)

The landing round's reverify approved F2 to F5 and found ONE no-regression row worse than today, in F1: on a menu quit
long enough for `requestQuit`'s 3 s fallback (`src/main/menu.ts`, never cleared) to quit before the core's `dispose()`,
which at his live-session count (64 shells, 11,964 to 23,982 lines of scrollback each) is the menu's ordinary quit, F1's
predicate ended the process by the hard exit at `will-quit`, where the parent's Node teardown sometimes let the quit-time
scrollback snapshots still in flight land. His standing rule drops the part that is worse than today and queues it; the
rest lands. So this round removes F1 and nothing else, keeps F1 whole as a proven patch for a queued Phase 362 (the 3 s
fallback on a long quit, where he chooses its trade), and fixes the three small things the landing reverify named. It is
not a redesign: the timer, the renderer's toast, `before-quit`'s second pass, when the windows close, F2, F3, D1 to D8
and every word F4 corrected that does not describe F1 are untouched. Scratch, logs and runners are under
`/private/var/tmp/tortie-wt/scratch/p3571/drop/` (`run.sh`, `lockrun.sh`, `logs/`, `measure/`, `out/`, `nit-proof.mjs`,
`make-patch.mjs`, `snap-tail.mjs`, `firstbuild/`); the patch and its proof are under
`/private/var/tmp/tortie-wt/scratch/owed-p362/`, outside this phase's scratch on purpose, because this phase's scratch is
removed at landing and that folder is not. His shell history read `743166 1793987027` and `23166 1790702242` before and
after every run, unmoved. Every non-Electron command ran under the history block; the two smokes, the probe and the
measurement ran outside it, each under a lock slot released by a trap, with HOME and ZDOTDIR in scratch,
HISTFILE=/dev/null, TERM_SESSION_ID unset, CSC_IDENTITY_AUTO_DISCOVERY=false and every CSC_*, APPLE_*, GH_TOKEN and
GITHUB_TOKEN unset.

What the dropped part leaves, in his terms: every quit that reaches the core's dispose (which holds the connection) ends
by the hard exit and keeps everything a person keeps, which is every quit route the phase measured but one; his one
field crash went through that dispose (research 143 §9.3: nine JavaScript frames on thread 0 under the close, so the
close came from JavaScript, dispose's own), so the hold and the `will-quit` hard exit close it without F1. The one route
left is a menu quit long enough for the 3 s fallback to quit first: nothing is held yet, so it ends through Node's
teardown exactly as today, a damaged cache's crash included, and is Phase 362's.

#### D1, F1 saved first

| What | Where | Numbers |
| --- | --- | --- |
| The 11 files this round touches, copied BEFORE any edit, as the landing round left them | `owed-p362/pre-drop/<path>`, `owed-p362/pre-drop.sha256` | `store.ts`, `index.ts`, the two F1 test files, `conformance-stopped-list.mjs`, `probe-p357.mjs`, `graders.json`, `CLAUDE.md`, `verification-checks.mjs` (D2's nine) and `build/p357/CHECKLIST.md`, this file (D3's two) |
| The same 11 right after the drop (D2) and before the words (D3) | `owed-p362/post-drop/<path>`, `owed-p362/post-drop.sha256` | the nine D2 changed; the two D3 files still equal pre-drop |
| The patch that takes post-drop back to pre-drop for exactly those files | `owed-p362/f1-timer-path.patch` | git-apply format, `a/` and `b/` tree-relative paths, 9 files with hunks (the two D3 files had none at that point), +1,732 −320 lines, 187,767 bytes, sha256 `b869f1d8af6759acde0568bdd41a77724aa8a3663cf3a24ff294392e1f9be85b` |
| Its proof | `make-patch.mjs prove` | `git -C wt-p3571 apply --check` of the patch exit 0, nothing written; in `owed-p362/proof/`, a fresh `git init` with nothing committed or staged, the post-drop copies plus `git apply` give 11 of 11 files equal to `pre-drop.sha256` byte for byte |
| Its proof at the end | `make-patch.mjs final` | `apply --check` onto the final worktree exit 0, and each of the 9 files the patch covers is byte for byte its `post-drop/` copy there, so `proof/` is a proof over the final tree's files; the two D3 files have no hunk and changed after the patch |
| Its README | `owed-p362/README.md` | what F1 is, that it applies onto Phase 357.1 as landed, the numbers for and against it, the trade's two alternatives, and what applying it also takes back |

The patch was made three times, `post-drop/`, the patch and `proof/` removed first each time, and the third is the one
kept (`make-patch-3`, `prove-3` and `final-check-2` in `drop/logs/`): the first came before D2's own timing line in
`CLAUDE.md` (the gate's 1.0 s with 78 ablations) was measured, the second before a one-line correction to the headline
of `index.ts`'s comment, below, made after the live runs. Each time `post-drop/` took the two D3 files from
`pre-drop/`, because after D2 and before D3 they were still exactly that. Applying the patch brings F1 back whole: its code, its tests, its
gate pins and ablations, the CM arms, their graders and fixtures, and its words. Because those files are the same files,
it also takes back this round's own S12 clauses below and the post-drop words; the README says how Phase 362 keeps them.

#### D2, F1 removed, exactly

| File | Change | Where it comes from |
| --- | --- | --- |
| `src/main/manifest/store.ts` | −44: `manifestOpenAtQuit`, the `opened` `WeakRef` list, `noteOpened`, its call in the constructor and their comments. `holdAllCloses` and `holdManifestClosesAtQuit` stay (D1). The file is now byte for byte the first build's (blob `5bf6c71e`, the integrator's `src.diff`) | the brief; spec D1 |
| `src/main/index.ts` | +15 −21: the guard is the first build's `manifestConnectionsLeftOpen() > 0 && !isUpdateStaged()` with its import back, F3's `try { flushStorageData() } finally { clear; prevent; kill }` kept inside it, and the comment says what the guard covers (every quit whose disposer reached the core's dispose, which holds the connection, and a store stopped with its file fine) and that a quit the 3 s fallback ends before that dispose is today's, queued as Phase 362. Its headline, the first build's "NO CLOSE EVER WALKS THE SESSION LIST'S PAGE CACHE", which that quit makes untrue, now reads "NO CLOSE WALKS THE HELD SESSION LIST'S PAGE CACHE" (comment only, after the live runs; the typecheck, the gate, the quit tests and `npm run build` were run again). Against the first build it differs only by F3 and that comment | the brief |
| `src/main/__tests__/p3571-quit-hardexit.test.ts` | +28 −63: the three F1 cases and the stopped-store case's F1 line out; the stand-in is the store's count again (`h.held`); the first build's "any connection held is enough: two held is the same exit" case is back, with the first build's names for the held and the nothing-held cases (the latter now also names the timer's quit, in a comment); F3's throwing-flush case kept. 11 cases | "keep F3's throwing-flush case and every case the first build had"; the first build's names from the quit builder's own run, `quit/logs/vitest-own-2.log` |
| `src/main/manifest/__tests__/p3571-hold-at-quit.test.ts` | −79: header item 4 and the F1 group (six cases) out. Back to the first build's 489 lines and 12 cases | the brief |
| `build/conformance-stopped-list.mjs` | +75 −190. S11's F1 findings (`openAtQuitFindings`, `returnsLiteral`, `flatText`) and their seven ablations out; S11's code and ablations are the first build's again. S12: the guard is the first build's (`LEFT_OPEN_TESTS`), F3's try/finally shape and its six ablations stay, the probe review's two guard ablations read their first-build words again, and F1's three pins (`manifestOpenAtQuit(` called once under src, its import, `manifestConnectionsLeftOpen()` asked nowhere in index.ts) and two ablations are out. ADDED, the landing reverify's nit: the guarded `if` must be the handler body's FIRST statement and the kill must sit in no function nested inside the handler, and the count must be the store's (imported from `./manifest/store`, shadowed by no local binding), with five ablations: the guard deferred to `setImmediate`, to `queueMicrotask`, to a promise's `then`, put after an `await` in an async handler, and a count of index.ts's own. `askStatements` out, `quitGuard` in, S12's read set loses `manifestOpenAtQuit` | the brief; the nit: "a deferred guard stayed green before and the held smoke cannot tell" |
| `build/p357/probe-p357.mjs`, `build/p357/fixtures/graders.json` | −393 +17 and −926 +170: the first build's files again (the CM arms, `menuQuitReading`, `MENU_PRELOAD`, the CM needs and their graders and fixtures, `CM_SHELLS`, `CM_FILL`, `CM_HISTORY_FLOOR`, the `menu` launch option, the `renameSync` import; the default arms `PA,HA,HB,HC,CS`), plus F4's "that one parent serves every parent arm" and a header paragraph that the timer path is today's and Phase 362's. The graders are byte for byte the landing fixer's own `fixer/edit/graders-without-cm.json` | the brief; the first build reconstructed from `probe-review/builder/` and its `review-*.diff` |
| `CLAUDE.md` | +2 −2: the `conformance:stoppedlist` row (the held count alone, the first-statement clause, the timer path Phase 362's, 1.0 s after the drop round with 78; a quit "whose disposer reached the core's dispose" ends by a signal) and the `probe:p357` row (`manifestOpenAtQuit` and `requestQuit` out of its triggers, the CM timing and sentence out, one sentence that the timer path is Phase 362's) | the brief |
| `build/verification-checks.mjs` | +15 −16, comments only: the stoppedlist, quit-smoke and `probe:p357` paragraphs say what is true after the drop. No classification moved (`gate:checks` 280 scripts) | the brief |

Not moved, each checked: `package.json`, `docs/audits/contract-baseline.txt` (`--check` byte for byte with no
regeneration) and `build/assert-electron-teardown.mjs` (182 reach the helper against a floor of 182).

The gate's counts: 82 ablations, minus S11's seven and S12's two F1 ablations, plus the nit's five, is 78, and all 78
read red on exactly their own rules with the control green, 13 rules over 1,434 files. The nit's clauses are what make
its five red: `nit-proof.mjs` ran a copy of the gate with those clauses taken out (1,938 characters) over the same tree
by `--root`, and that copy read exactly the five green on S12 (73 of 78) and moved no other ablation.

#### D3, the words

`build/p357/CHECKLIST.md`, "The quit, after Phase 357.1": "Everything you had open is saved first" is gone; it names
what is saved (the window positions, zoom and other remembered settings, and the session list) and promises no
quit-time scrollback copy, and it says the second quit that is unchanged on purpose: a quit so long that Tortie's own
3 second fallback ends it first ends exactly as today, queued as Phase 362. §14 Q1 says what the hard exit covers after
the drop. CHANGELOG.md is the main session's and was not touched.

#### Commands, exit codes and numbers

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `df -h /` | 0 | | 69 GiB free at the start, 65 GiB at the build |
| `save-predrop.sh` (D1) | 0 | < 1 s | 11 files copied and listed, each compared after the copy |
| `npm run typecheck` | 0 | 6 s | 1,437 files, 8,213 imports, 0 violations; 1,434 files, 5,021 edges, 0 cycles |
| `node build/conformance-stopped-list.mjs` | 0 | 2 s | 13 rules over 1,434 files; 78 of 78 ablations red on exactly their own rules; the control green; S8 19 shapes, 3 variants and the shipped export |
| `nit-proof.mjs` | 0 | 2 s | the copy without the drop round's S12 clauses: 73 of 78, the five new ablations green on S12, no other line moved |
| `npm run conformance:stoppedlist`, three times | 0, 0, 0 | 1.04, 1.02, 1.05 s | as above |
| the phase vitest files (the three `p3571-*`, the ten `p357-*`, `quit-admission`, `db/__tests__/digest`) | 0 | 16 s | 14 files, 240 of 240 |
| `node build/p357/probe-p357.mjs --grader-self-test`, under a lock slot | 0 | < 1 s | 9 graders, 52 clauses each shown red alone, 43 needs each shown unreadable alone, 160 fields, 93 raw fixtures (the landing round: 11, 59, 66, 201, 100) |
| `make-patch.mjs write`, then `prove` | 0, 0 | < 1 s | as D1 |
| `node build/contract-inventory.mjs --check` | 0 | < 1 s | byte for byte, no regeneration |
| `node build/quit-smoke.mjs --self-test` | 0 | < 1 s | 33 of 33 fixtures |
| `npm test` | 1 | 59 s | 1,187 files (1,182 passed, 3 failed, 2 skipped); 22,385 tests: 22,367 passed, 4 failed, 14 skipped (the landing round's 22,393 less F1's nine cases plus the first build's one). The four are the `/bin/ps` tests inside the history block: `process-table.native` "sees this process under its true parent and walks the chain to it", `ps.native` "sees this process under its true parent" and "finds a child this test spawned among the descendants of this pid", `p269-env-names` "kills a shell that never exits, on the deadline, leaving no survivor" (`spawnSync /bin/ps EPERM`) |
| `npm run build` | 0 | 46 s | `gate:electron` 182 of 578 against a floor of 182; `gate:background` 580 files, 3 long-lived starts in a `finally`, 32 of 32 fixtures; `gate:simulator` 5 of 5; `gate:docker` 2 of 2; `gate:checks` 280 scripts, 55 `tsxCli()` callers against 54, 1,187 test files; `conformance:ios` 55 rules; `gate:onlyadd` PASS; `conformance:harnessprobes` 6 clauses, 16 ablations, 689 files; `gate:stapler` 31, 18, 28; `contract-inventory` OK |
| `npm run conformance:credentials` | 0 | 45 s | 9 of 9 disposer fixtures, 78 of 78 ablations, 22 of 22 scanner fixtures, 9 vendor call sites |
| `npm run smoke:quit`, this build, lock slot | 0 | 55 s | held PASS: SIGKILL after 2,083 ms, the held line, the sentinel armed then cleared, the session list made, 0 dumps, 0 macOS reports; teardown PASS: exit 0 after 1,679 ms, nothing held, no session list made |
| `npm run smoke:quitdoors`, this build, lock slot | 0 | 46 s | 9 of 9, SIGKILL after 1,534 ms, the held line, the sentinel cleared, 0 dumps, 0 reports |
| `P357_ARMS=CS npm run probe:p357` against `wt-p3571-parent`, three times, lock slots | 1, 0, 0 | 58, 58, 59 s | CS-parent PASS all three (SIGSEGV in `pcache1EnforceMaxPage`, exit 139, no macOS report, the session list's own connection planted); CS-head PASS in runs 2 and 3 (SIGKILL, no SEGV, 105 sessions the same ids, `localStorage` 3 of 3, the Settings bounds, no unclean exit, 2 boots) and FAIL in run 1 on one clause, below; RUN PASS all three |
| `drop/measure/menu-quit.mjs` (the landing round's own, its two scratch guards pointed here, its preload byte for byte), this build, his rows plus 64 shells, healthy cache, lock slot | 0 | 122 s | the table below |
| after the comment correction: `npm run typecheck`, `npm run conformance:stoppedlist`, the three quit test files, `npm run build` | 0, 0, 0, 0 | 4 s, 1 s, 2 s, 54 s | the same numbers as above; 31 of 31 tests; `gate:electron` 182 against 182; `contract-inventory` OK |
| at the end: `make-patch.mjs final`, `npm run typecheck`, `--check`, `npm run conformance:stoppedlist`, the 14 phase files, the grader self-test (lock slot), `quit-smoke.mjs --self-test` | all 0 | | as above: `apply --check` exit 0 and the 9 files byte for byte `post-drop/`; 78 of 78; 240 of 240; 9, 52, 43, 160, 93; 33 of 33 |
| the Electron count (CLAUDE.md's command, outside the block, once) | 0 | | none of this round's: his Tortie (pid 692) and its crash handler (2727), and Slack's, Chrome's, Granola's and Cursor's crash handlers |
| the socket and process check | | | no `p3571`, `p357`, `smoke-quit` or `p144-doors` name under `/private/tmp/tmux-501/`, no tmux server of this round's running, all three lock slots free |

The macOS report folder held 30 names before and after every Electron run here, none new (names and times only, none
opened).

#### The timer path at this build, beside the landing round's rows

The landing round's `measure/menu-quit.mjs`, one run, his recorded shape plus 64 shells each given 12,000 lines (11,964
to 23,982 read back), no plant. Milliseconds after the press of the native menu's own Quit row, on main's clock. The
capsule records are the quit-time scrollback copies on disk afterwards (by name and time; `snap-tail.mjs`), re-derived
for the landing round's rows from its own run folders under `fixer/tmp/`.

| Build | Renderer's quit | Snapshots begin, end | `dispose()` | Timer's `app.quit()` | `will-quit` | End | Capsule records |
| --- | --- | --- | --- | --- | --- | --- | --- |
| parent `32180e60` (landing) | 1,511 | 1,516, never | never | 3,001 | 3,116 | exit 0 through Node's teardown at 3,126 | 64 of 64 |
| first build (landing) | 1,508 | 1,511, never | never | 3,001 | 3,116 | exit 0 through Node's teardown at 3,130 | 24 of 64, 40 `.part` |
| parent, again (landing) | 1,517 | 1,520, never | never | 3,003 | 3,145 | exit 0 at 3,166 | 12 of 64, 52 `.part` |
| the landing round, F1 | 1,510 | 1,513, never | never | 3,000 | 3,117 | SIGKILL at `will-quit` | 11 of 64, 53 `.part` |
| **this round, after the drop** | 1,507 | 1,510, never | never | 3,007 | 3,133 | **exit 0 through Node's teardown at 3,145** (the `quit` event with code 0, then the process's own `exit`) | 22 of 64, 42 `.part` |

So the drop restored today's path: the timer's quit reaches `will-quit` before the core's dispose, nothing is held,
and the process ends exactly as the parent's does. A damaged cache on that path crashes as it does today (the landing
round's CM-parent and the landing reverify's R3 and its held-only ablation a5, at `pcache1EnforceMaxPage`), which is
Phase 362's. The capsule records vary at every build (64, 24, 12, 11, 22 of 64); none of these runs is a person's loss
beyond today's, because each run's earlier quit-time copies stay and each copy is a temporary file and a rename.

#### The CS-head reading that moved once

In the first of the three CS runs, CS-head read `localStorage` 2 of 3: the key written 0 s before the quit was null at
the relaunch, while every other clause held (SIGKILL at `will-quit`, no SEGV, every session, the bounds, no unclean
exit). Runs 2 and 3 read 3 of 3. The drop changes nothing on that path: CS quits through the bridge, the core's dispose
holds the connection, and the guard reads true before and after the drop, with F3's try/finally untouched. Every earlier
reading of this path kept that key (§2.4's four `willquit-flush` runs, the landing round's CS-head and CM-head, and the
landing reverify's R1, R1b, R2 and R4 to R7). So a `localStorage` write made in the same instant as the quit can, now
and then, miss the `will-quit` flush, in the approved build as in this one; a write a second or more before the quit
was kept in every run. It is named for the main session below.

#### For the landing

1. Phase 362 is queued with `owed-p362/`: the patch, its proof and its README. Applying it brings F1 back whole and also
   takes back this round's S12 first-statement, nested-function and store's-count clauses and their five ablations;
   they hold for F1's guard unchanged, so Phase 362 re-adds them by hand after the apply.
2. The CS-head reading above: one run in three lost the `localStorage` write made 0 s before a hard-exit quit. It is
   not this round's (the path is the same before and after the drop), and whether the parent's orderly quit ever loses
   such a write was not measured; a targeted run of that instant at both builds would settle whether it is worse than
   today.
3. Cleanup after the follow-up commit adds `/private/var/tmp/tortie-wt/scratch/p3571/drop/` to §13 item 4. Keep
   `/private/var/tmp/tortie-wt/scratch/owed-p362/` until Phase 362 has taken it.

### Round A (the fixer, 2026-11-08)

His ruling of 2026-11-08 ("1. a"): one more round, which saves the remembered settings as the quit begins and again at
the end, then waits, with a cap, for the write before ending the app, and lands only if a busy Mac loses nothing
against today's build. The drop round's reverify had measured the gap: `flushStorageData()` only STARTS Chromium's
commit of DOM storage, and the SIGKILL microseconds later can land first; under 24 busy loops the drop round's build
lost a `localStorage` write made in the quit's own turn or just before the press in 2 quits of 22 (each a torn LevelDB
record, its header on disk and none of its payload, one also the first-quit toast's flag), the parent 0 of 22.

This round changes when the storage write is made and how long the hard exit waits for it (W1, W2), that nothing opens
a window while it waits (W3), the gate and two nits (W4) and the words (W5), and nothing else: the timer, the toast,
`before-quit`'s second pass, when the windows close, the hold, the digest, D6 and F2's smokes are as the drop round left
them. Scratch, tools, logs and run files are under `/private/var/tmp/tortie-wt/scratch/p3571/fixa/` (`w0-*` for W0,
`dm-*` for the decisive measurement and W3, `ds-*` for the will-quit scan, `lockrun.sh`, `logs/`, `runs/`, and `ldb.mjs`,
a byte-identical copy of the drop reverifier's CRC-checked reader). His shell history read `743166 1793987027` and
`23166 1790702242` before and after every run, unmoved. Every non-Electron command ran under the history block; every
Electron went through `build/electron-run.mjs` inside `build/harness-socket.mjs` (the two smokes through their npm
scripts), each run under a lock slot released by a trap, with HOME and ZDOTDIR in scratch, `HISTFILE=/dev/null`,
`TERM_SESSION_ID` unset, `CSC_IDENTITY_AUTO_DISCOVERY=false` and every `CSC_*`, `APPLE_*`, `GH_TOKEN` and `GITHUB_TOKEN`
unset. Phase 361's and Phase 353's workflows ran throughout and loaded the machine (load averages from about 12 to 180
on 12 cores), so every comparison here alternates the parent and this build run by run, and whatever load they added
fell on both builds alike.

#### W0, measured first

`w0-driver.mjs` with `w0-main.cjs`, a main-process preload loaded by `NODE_OPTIONS`, scratch only. Each launch makes 10
writes at rest, each followed by a flush and a blocking poll of the profile's `Local Storage/leveldb` log until that
write's bytes sit in a CRC-checked record (the main thread blocks; Chromium's storage threads do not), and then quits in
one of six shapes: the write in the quit's own renderer turn and the bridge quit (L1), or just before the menu's Quit
with the first-quit toast (L2), each with no extra flush, with a flush made by the preload on the before-quit first pass
(where W1 now flushes), or with one made at `will-quit` before the app's own handler, after which the preload held main
and polled. A worker thread of the DRIVER polls the same log every 0.5 ms, so a landing during the parent's Chromium
shutdown, after Node is gone, is timed too (an upper bound when that thread is starved). 72 launches: 6 shapes x both
builds x no loops and 24 x 3, the parent and this build (the drop round's, before any of round A) alternated. Machine
load averages 20 to 180 throughout, so even the runs with no loops of the probe's own were loaded.

| What (milliseconds) | Parent `32180e60` | This build before round A |
| --- | --- | --- |
| a flush at rest, the write on disk after the call (360 per build) | median 0.17 (idle) and 0.16 (24 loops); 99th 4.4 and 2.9; worst 4.5 and 15.4 | median 0.17 and 0.16; 99th 5.9 and 5.3; worst 9.3 and 27.2 |
| a flush at `will-quit`, the process held open (12 per build) | 0.10 to 0.50 | 0.11 to 0.70 |
| a flush on the before-quit first pass (12 per build; the driver's watcher, within 0.5) | medians 1.2 and 1.4, worst 1.6 | medians 1.1 and 1.0, worst 4.3 |
| no extra flush: the last write on disk after `will-quit` (6 + 6) | 4 to 16 (its orderly shutdown) | 1 to 2 (its will-quit flush, racing the SIGKILL) |
| the process's end after `will-quit` (18 + 18) | median 48 idle (90th 1,610, worst 3,812); median 26,023 under 24 loops (worst 29,589) | median 13.7 idle (worst 25.7); 12.3 under 24 loops (worst 20.0) |
| writes lost, torn records | 0 of 36, none torn | 0 of 36, none torn |

So the commit lands a fraction of a millisecond after the flush is called, 27 ms at the worst of 720, and the drop round's
build races its SIGKILL against it; the reverify's 2 of 22 are the races it lost (this sample of 36 lost none). The
commit of a flush made on the before-quit first pass lands within about 4 ms, while the disposer runs on for 70 ms to
seconds before `will-quit`.

THE CHOICE, from those numbers, a signal over a guess. (iv) No API reports the flush's completion in this Electron:
`node_modules/electron/electron.d.ts` (43.3.0) declares `flushStorageData(): void` ("Writes any unwritten DOMStorage data
to disk"), and only the cookie store's `flushStore(): Promise<void>` answers a promise; nothing else that answers can be
asked without writing. (iii) A marker needs a live renderer on the disposer's first lines, which a quit after the last
window closed does not have; main having a renderer write would need `executeJavaScript` from production main (which
`src/main/menu.ts` refuses in words) or a new event channel and a new `gmux.*` key (a contract move); and a marker
written as the quit begins says nothing of what the closing windows write after it (`src/renderer/state/layout.ts`
writes in `pagehide`). (i) A fixed wait cannot tell a commit being written from one done, so a slow one is cut mid-record
whatever the number. (ii) Reading the log can: LevelDB appends each commit to its newest `NNNNNN.log` as records of a
7-byte header and a payload with a CRC-32C, in 32 KiB blocks, from one writer, in order, so a commit under way shows as a
log that moves or a last block that is not whole. The round takes (ii), with a quiet window sized from W0 for a commit
that has not begun to show: (ii) and a floor.

#### W1, a flush as the quit begins (`src/main/capabilities.ts`)

On the disposer's first synchronous lines, right after `holdManifestClosesAtQuit()`, before any await:
`try { session.defaultSession.flushStorageData(); } catch { /* no session yet */ }`. Every write made before the press
(the first-quit toast's flag among them, and the write in the quit's own renderer turn, whose `Put` reaches the storage
sequence before the quit's IPC does) is committing while the disposer runs, and W0 measured it on disk within about 4
ms. The catch is there because `session.defaultSession` throws before the app is ready, and a quit that arrives then must
still quit; the will-quit flush is the second chance. `session` joins the file's `electron` import.

#### W2, the wait at `will-quit` (`src/main/index.ts`, `src/main/quit/storage-landing.ts`)

The handler keeps its guard as its first statement and its block is now exactly `event.preventDefault();`, taken
synchronously so the default quit, and Node's environment teardown with it, never runs, then ONE bounded wait,
`void (async () => { try { … } finally { … } })();`. The `try` flushes again (what the closing windows wrote), awaits
`storageWritten(session.defaultSession.getStoragePath(), STORAGE_WRITE_WAIT_MS)` and writes one `quit` line to app.log
(`the remembered settings were on disk after N ms; ending the quit`, with `landing`, `waitedMs` and `moved`; electron-log
writes synchronously, so the line lands before the signal); the `finally` is `clearLogRunSentinel();` and the SIGKILL, so
the bound, a throw from the flush and a failed read all end the process, the sentinel cleared first. The bound is ONE
named constant, `STORAGE_WRITE_WAIT_MS = 1_000`.

`src/main/quit/storage-landing.ts` (new, pure node, no electron import) answers by the bound whatever the files do and
never throws or rejects: a timer races its reads, which are asynchronous, so a slow file system can delay a read but
never the bound. It reads the newest `NNNNNN.log` (by number) under `<storage path>/Local Storage/leveldb` every 5 ms
(`POLL_MS`) and ends the wait, `settled`, only when at once QUIET_MS (150) have passed since the call, the log's name and
size have not moved for SETTLE_MS (25), and the log's last block is whole: every record in it parses to its end with its
checksum holding, the last one is FULL or a LAST fragment (a FIRST or MIDDLE last is a split record still coming), and
the file does not end in a block's zero pad (written just before the next record's header). QUIET_MS is more than five
times W0's worst landing (27 ms) and thirty times its 99th percentile, so a flush that found anything to write has shown
it; SETTLE_MS catches a second commit following the first. A missing folder, a missing log, a log rotated or compacted
away mid-read, or a checksum it cannot match is not a signal, so the wait runs on to the bound: it can cost up to a
second, never a write. It writes nothing. The module's tests drive it over real files written in LevelDB's format by a
writer of the test's own (a bitwise CRC where the module uses a table, and LevelDB's own fragmenting and padding rules).
What it cannot see is a commit the storage thread has not begun 150 ms after the will-quit flush while the first-lines
commit also has not landed, which W0 never came near (27 ms at the worst of 720). Nor does it hold past its 1 s bound a
commit still being written when the bound comes: under 192 busy loops and four fsync writers, a 2 MB closing-window commit
ran from 42 to about 921 ms after `will-quit` and settled 79 ms inside the bound (the attack lens's XL1#51). Tortie's own
values are a few KB.

#### W3, nothing reopens during the wait (`src/main/index.ts`)

Read and driven at both builds before the change was judged (`dm-driver.mjs` routes R3D and R3W): the preload asks the
app's OWN listeners, through `app.emit` (never an Apple Event, never `open`), for what a Dock click (`activate`), a
refused second launch (`second-instance`) and a Finder open (`open-file`, a scratch folder) would ask, and counts the
windows. At the parent, asked while the disposer ran after the last window closed, the three opened a new main window
into the quitting app (0 windows before, 1 after, created 9 ms later and still up 120 ms on, until the disposer's own
`app.quit()` closed it); asked 20 ms after `will-quit` they never ran, because the parent's quit had gone on. So today's
`second-instance` already refuses while quitting (`appLifecycleState() === 'quitting'`), but `activate` and `open-file`
reach `showAppWindow()`, which made a window whenever none was up. The fix is one line in `showAppWindow()`: with no live
main window and the lifecycle quitting, it returns; a window that is still up is shown as before. At this build both
routes read 0 windows before, after and 120 ms later, during the disposer and during the wait, and the quit ended by the
will-quit SIGKILL with the settings on disk. It makes the wait no worse and the disposer better than today. Not covered:
a click on a menu row that opens a window (Settings…) in the ~150 ms after the windows close, as during today's disposer.

#### W4, the gate and the two nits

`build/conformance-stopped-list.mjs`, 13 rules, 94 ablations (the drop round's 78, less one F3 ablation whose shape is
gone, plus 17), each red on exactly its own rule, the control green:

- S12 now admits exactly the one bounded, prevented wait: the guard still the handler's FIRST statement; its block
  exactly `<event>.preventDefault();` (synchronous, in will-quit itself) then `void (async () => { … })();`; that
  function its `try` alone; the `try` beginning with the windows' flush and holding exactly one await, `storageWritten(…,
  B)` imported from `./quit/storage-landing` and shadowed by nothing, as a statement of its own, B one top-level const of
  `index.ts` holding a whole number of milliseconds from 1 to `WAIT_CEILING_MS` (10,000); no catch; the `finally` exactly
  `clearLogRunSentinel();` and the kill; no other will-quit handler preventing the quit; `flushStorageData(` once in
  `index.ts` and nowhere else under `src/main` but the disposer. New ablations, each red on S12 alone: preventDefault
  removed, deferred into the wait after the await, and handed to `setImmediate`; the bound removed, made `Infinity`, its
  const raised to an hour and made `Number.POSITIVE_INFINITY`; the wait no longer awaited; a second unbounded await
  beside it; the wait stood in by a local of `index.ts`; the kill moved after the try, out of the finally; a second
  will-quit handler that prevents the quit; a flush in a third file (13). The landing round's kill moved into the try
  (now "before the wait") and its try taken off the flush (now off the wait) stay, reworded, as do the guard's four
  deferral ablations (`setImmediate`, `queueMicrotask`, a promise's `then`, after an await); the drop round's "the
  prevented quit dropped from the finally" is gone with that shape.
- S6 pins W1: one `try { session.defaultSession.flushStorageData(); } catch …` statement of the disposer's own body
  before its first await, and no other flush in `capabilities.ts`; three ablations (removed, moved to just after the
  first await, the try taken off it), each red on S6 alone.
- S11, the drop reverify's nit: `GmuxCore.dispose()` closes the session list by `this.manifest.close()` once, reads
  nothing else off `this.manifest` and calls no other `.close()`; the ablation where dispose closes the database itself
  (`(this.manifest as unknown as …).db.close()`) reads red on S11 alone. S11 now reads `core.ts`.
- `build/quit-smoke.mjs`, the other nit: the held verdict's exit-0 reason is worded by whether the held line was said
  ("exited 0 with the session list held open: the will-quit hard exit never came, so Node's environment teardown closed
  that connection", or "exited 0 and the store never said it held the session list: the quit closed that connection
  itself"), with a fixture for each and the doors leg's twin: 35 fixtures, every one answering as it says.

#### W5, the words

`build/p357/CHECKLIST.md` says the remembered settings are saved as the quit begins and again as the windows close and
that Tortie waits for them to reach the disk (a fraction of a second, never more than one). This file's §0.1 item 3,
§1's first row, §1.1 D2, §7.1's S12 row and §14 Q1 say the flush only starts the commit and the exit waits for it.
`src/main/index.ts`'s comment replaces "flushed first, synchronously" with what the round does. CLAUDE.md's
`conformance:stoppedlist` row and `build/verification-checks.mjs`'s paragraph (comments only, no classification moved)
were written to the old shape and now say the new one; both files are the integrator's by §9.1, and are edited here
because the round's own gate is what they describe. CHANGELOG.md is the main session's and was not touched.

#### The decisive measurement

`dm-driver.mjs` with `dm-main.cjs` (copies of the drop reverifier's `dr-driver.mjs` and `dr-main.cjs`, extended), run by
`dm-batch.sh`: the parent and this build alternated run by run, each run its own harness socket under one lock slot, one
shell, every probed registry row hidden and `agents:list` read back. Every run writes three `gmux.*` keys 6 s, 2 s and 0 s
before the quit and one more in the window's own `pagehide` (what a closing window writes), and quits one of three ways:
L1, the last write and the bridge quit in one renderer turn; L2, the last write in the turn before the menu's Quit with
the first-quit toast, whose own flag (`gmux.tipShown.quit-hold`) is written at the press; LC, the last write and then the
last window closed by its own close. 24 busy loops of the run's own (each ending itself after 15 s and ended by pid in a
`finally`; 0 left after any run) start a second before the press. Each run is read twice: by the CRC-checked reader
(`ldb.mjs`, which replays the log's WriteBatches in order) right after the process ends, and by a relaunch on the same
profile reading `localStorage` through the window. 96 runs, 27 minutes of wall time with the relaunches, load averages 10.8
to 136.6 for the loaded half and 3.4 to 27.0 for the other.

| Build | Loops | Runs (L1, L2, LC) | Unreadable | A key lost on disk | A key lost at relaunch | Torn records | Toast's flag lost | Sentinel left, unclean notice | Same ids, live shells | End | Process's end after `will-quit` (ms) | The wait (ms) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| parent | 24 | 36 (12, 12, 12) | 0 | 0 | 0 | 0 | 0 of 12 | 0, 0 | 36, 36 | exit 0 | median 744, 90th 13,919, worst 36,346 | none |
| this build | 24 | 36 (12, 12, 12) | 0 | **0** | **0** | **0** | **0 of 12** | 0, 0 | 36, 36 | SIGKILL, the held line said | median 166, 90th 170, worst 180 | `settled` 36 of 36, median 154, worst 156 |
| parent | none | 12 (4, 4, 4) | 0 | 0 | 0 | 0 | 0 of 4 | 0, 0 | 12, 12 | exit 0 | median 40, 90th 219, worst 1,242 | none |
| this build | none | 12 (4, 4, 4) | 0 | **0** | **0** | **0** | **0 of 4** | 0, 0 | 12, 12 | SIGKILL | median 168, 90th 175, worst 183 | `settled` 12 of 12, median 154, worst 158 |

So a busy Mac loses nothing at this build where the parent loses nothing: 0 of 48 at each, every key (the one written 6 s
before the quit, 2 s before, in the quit's own turn or just before the press, and in the closing window's own
`pagehide`) and every first-quit flag on disk and back at the relaunch, no Crashpad dump, no macOS report from either
build's runs (one parent run's window counted five `Electron Helper` reports named 17:56:29, three seconds before its
press, while it was still setting up; that run ended normally, and by name and time they are not attributable to it;
the other two workflows were running Electron work then), and every session back with its id and its live shell. The
drop round's build, measured by its reverify on the same driver and load shape, lost 2 of 22.

How much longer the process lives: at this build the wait settles about 150 ms after the flush (QUIET_MS and one poll),
so the process ends a median 166 ms after `will-quit` (worst 183), against the drop round's 12 to 14 ms (W0) and the
parent's orderly shutdown, a median 40 ms idle (W0: 48) but 744 ms under 24 loops, with a 90th percentile of 14 s and a
worst of 36 s (W0: a median of 26 s). The windows have closed by then, so nothing a person sees changes; the app's menu
stays live for those 150 ms, as it does through today's disposer.

THE WILL-QUIT SCAN, the mechanism shown (`ds-driver.mjs`, `ds-main.cjs`, `ds-batch.sh`, `DR_WQ_SCAN=1`, diagnostic and
never counted, because the scan reads the log inside `will-quit` before the app's own handler): 2 runs each of L1 and L2
per build under 24 loops, alternated. At the parent, at `will-quit`, neither the last write nor the `pagehide` write was
on disk in 4 of 4 (the log 205 bytes), and its orderly shutdown landed both afterwards. At this build the last write was
already on disk at `will-quit` in 4 of 4 (W1's commit, made on the disposer's first lines) and the `pagehide` write was
not, in 4 of 4, because the window wrote it as it closed, after W1; the will-quit flush and the wait landed it, on disk
and back at the relaunch every time. Both halves of the ruling are doing their work.

W3's two routes (`R3D`, `R3W`), one run each per build, are under W3 above.

#### Commands, exit codes and numbers

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `df -h /` | 0 | | 48 GiB free at the start, 42 GiB at the build, 43 GiB at the smokes |
| W0: `w0-batch.sh W0 3 …` (72 launches, each `lockrun.sh node build/harness-socket.mjs gmux-p3571fa "node w0-driver.mjs …"`) and one trial | 0 each | 12 min | the W0 table; 0 of 72 lost, 0 torn; load averages 23.6 to 182.3 |
| `node build/conformance-stopped-list.mjs`, first run on the new gate | 0 | 2 s | 13 rules over 1,435 files, 94 of 94 ablations red on exactly their own rules, the control green, S8 19 shapes, 3 variants and the shipped export |
| `node build/quit-smoke.mjs --self-test` | 0 | < 1 s | 35 of 35 fixtures |
| `npm run typecheck` | failed, then 0 | 5 s | the first run refused one `Buffer` index in the new test (`Object is possibly 'undefined'`), fixed; then 1,438 production files, 8,216 imports, 0 violations; 1,435 files, 5,022 edges, 0 cycles |
| the phase vitest files, first run | 1 | 26 s | one case of the new module's test appended its commit after the quiet window had already ended the wait (the test's own mistake), fixed to append inside it, and a case for a second commit added |
| the same two files again | 0 | 26 s | 31 of 31 |
| `npm run build` (the first, before every live run) | 0 | 45 s | `gate:electron` 182 of 578 against a floor of 182; `gate:background` 580 files, 3 long-lived starts in a `finally`, 32 of 32 fixtures; `gate:simulator` 5 of 5; `gate:docker` 2 of 2; `gate:checks` 280 scripts, 55 `tsxCli()` callers against 54, 1,188 test files; `conformance:ios` 55 rules; `gate:onlyadd` PASS; `conformance:harnessprobes` 6 clauses, 16 ablations, 690 files; `contract-inventory` OK |
| the trial and W3 runs (`dm-driver.mjs head L1,LC`; `parent` and `head R3D,R3W`) | 0, 0, 0 | 1 to 2 min each | as W3 and the decisive table |
| `npm test` | 1 | 62 s | 1,188 files (1,183 passed, 3 failed, 2 skipped); 22,405 tests: 22,387 passed, 4 failed, 14 skipped. The four are the `/bin/ps` tests inside the history block (`spawnSync /bin/ps EPERM`): `process-table.native` "sees this process under its true parent and walks the chain to it", `ps.native` "sees this process under its true parent" and "finds a child this test spawned among the descendants of this pid", `p269-env-names` "kills a shell that never exits, on the deadline, leaving no survivor" |
| `npm run conformance:stoppedlist` | 0 | 1 s | as above |
| `npm run conformance:credentials` | 0 | 61 s | 9 of 9 disposer fixtures, 78 of 78 ablations, 22 of 22 scanner fixtures, 9 vendor call sites |
| `npm run conformance:pocket` | 0 | 15 s | 192 rules, 25,736 checks |
| `npm run conformance:push` | 0 | 7 s | 26 rules, 2,409 checks |
| `node build/p357/probe-p357.mjs --grader-self-test`, lock slot | 0 | < 1 s | 9 graders, 52 clauses each shown red alone, 43 needs each shown unreadable alone, 160 fields, 93 raw fixtures (unchanged; the probe did not move) |
| `P357_ARMS=CS P357_PARENT_CHECKOUT=…/wt-p3571-parent P357_KEEP=1 npm run probe:p357`, lock slot | 0 | 59 s | CS-parent PASS (SIGSEGV in `pcache1EnforceMaxPage`, exit 139, no macOS report); CS-head PASS (no read fails, the held connection never closed, the will-quit SIGKILL, every session, the three keys and the bounds back; its own app.log: "the remembered settings were on disk after 156 ms", for the quit and for its relaunch's quit); RUN PASS |
| `node build/contract-inventory.mjs --check` | 0 | < 1 s | byte for byte, no regeneration: the contract did not move |
| the phase vitest files (15: the new module's, the three `p3571-*`, the ten `p357-*`, `quit-admission`, `db/__tests__/digest`) | 0 | 26 s | 260 of 260 |
| the decisive measurement: `dm-batch.sh DML 12 24 L1 L2 LC`, then `dm-batch.sh DMU 4 0 L1 L2 LC` | 0 (96 runs, each 0) | 21 and 6 min | the decisive table |
| `npm run smoke:quit`, this build, lock slot | 0 | 49 s | held PASS: SIGKILL after 1,963 ms, the held line, the sentinel armed then cleared, the session list made, 0 dumps, 0 macOS reports, and the app's own "the remembered settings were on disk after 154 ms"; teardown PASS: exit 0 after 1,672 ms, nothing held, no session list made |
| `npm run smoke:quitdoors`, this build, lock slot | 0 | 47 s | 9 of 9, SIGKILL after 1,789 ms, the held line, the sentinel cleared, 0 dumps, 0 reports, "on disk after 154 ms" |
| the will-quit scan: `ds-batch.sh 2 L1,L2` | 0 (4 runs of two quits, each 0) | about 5 min | as above |
| after the last source edit (a comment in `index.ts`): `npm run typecheck`, `npm run conformance:stoppedlist`; the smokes' own `npm run build` | 0, 0, 0 | 5 s, 1 s, 45 s | as above; the final `out/` is newer than every source file |
| the Electron count (CLAUDE.md's command, outside the block, once, at the end) | 0 | | none of this round's: his Tortie (pid 692) and its crash handler (2727), Slack's, Chrome's, Granola's and Cursor's crash handlers, and Phase 353's own app run from `wt-p353b` (pid 95531, its helpers and its crash handler), whose fixer held a lock slot |
| the socket and process check | | | no `p3571`, `p357`, `smoke-quit` or `p144-doors` name under `/private/tmp/tmux-501/`; no driver, batch or busy loop of this round's running; this round's lock slots all released |

The macOS report folder: the only names like the app today are the five `Electron Helper` reports of 17:56:29 (read by
name and time only, none opened). The two smokes' and the CS probe's own report checks read 0.

#### What could not be run, and why

- A control arm of this tree with round A taken back out, driven by the same driver: the permission system refused the
  scratch clone (a copy of the whole tree with its `.git` removed), so the drop round's reverify, 2 of 22 lost on the
  same driver and load shape, stands as the control, beside the will-quit scan, which shows the mechanism at both builds.
- A second-launch proper: a harness launch takes no single-instance lock, so W3 asks the app's own `second-instance`
  listener through `app.emit` (the same handler a refused launch reaches), never a second app.
- The four `/bin/ps` native tests, inside the history block by design; never run outside it.
- `build/fault-harness.mjs` and `smoke:fault` (the brief forbids them this round, while Phase 361 runs), and every other
  smoke.

#### For the landing

1. The round lands by the measure he set: a busy Mac loses nothing at this build against today's (0 of 48 at each,
   36 of them under 24 busy loops, on disk and at the relaunch). One CHANGELOG item stands as the main session words it;
   nothing in the round adds a word a person sees.
2. A quit that holds the session list now ends a median of 166 ms after its windows close (`will-quit`), where the drop
   round's build ended 12 to 14 ms after (W0); the parent's orderly quit ends 40 ms after them on an idle Mac and a
   median of 744 ms (a tail to 36 s) under 24 busy loops. The bound, 1 s, is spent only when the storage log cannot be
   read.
3. What the wait cannot see, named: a commit that Chromium's storage thread has not begun 150 ms after the will-quit
   flush while the first-lines commit has not landed either (W0's worst landing was 27 ms of 720); and a write the
   storage thread takes in only after the will-quit flush, which Chromium would hold for its own 5 s commit timer; and a
   commit still being written when the 1 s bound comes (a 2 MB one under 192 busy loops settled at about 921 ms). A
   closing window sends its last writes before it is gone, so they queue ahead of that flush, and the scan saw the
   `pagehide` write committed by it every time.
4. W3 also changes the disposer, for the better: a Dock click, a refused second launch or a Finder open while a quit
   runs after the last window closed no longer opens a window into the quitting app. No gate pins `showAppWindow`'s
   line; the live drive is its proof.
5. Cleanup after the follow-up commit adds `/private/var/tmp/tortie-wt/scratch/p3571/fixa/` to §13 item 4.

### The landing (the main session, 2026-11-08)

- **Round A met his bar.** Both lenses approved: HEAD lost no write where the parent lost none, under 24 busy loops
  (36 quits each), with no loops (12 each), and under the attack lens's 96 and 192 busy loops with fsync writers; 18 and
  12 no-regression rows, none worse.
- **Fixed here, words only:** the comment that ends `disposeMainCapabilities` now says the storage is flushed on the
  first lines and again at `will-quit` and waited for, capped; "what the wait cannot see" names a commit still being
  written when the 1 s bound comes (the attack lens's 921 ms reading, twice); `CLAUDE.md`'s `conformance:stoppedlist`
  row lists `src/main/quit/storage-landing.ts` among its paths.
- **Carried to Phase 362, which changes the end of the same quit:** both lenses' minor, that nothing pins the wait's
  timing constants (`QUIET_MS` and `SETTLE_MS` cut to 0 leave every quit test and the gate green): literal floors in
  the module's test and an S12 clause that reads `storage-landing.ts`; S12 pinning `storageWritten`'s first argument to
  `session.defaultSession.getStoragePath()` and refusing `app.exit` or `process.exit` in a `will-quit` handler or a timer
  the disposer arms; W3's refusal for the Settings… row during the wait, with a case for both; the quit line's `moved`
  reading false when the log first appears during the wait.
