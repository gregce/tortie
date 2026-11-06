# Phase 357 — "im on 0.114 and am getting these errors" — a session list that goes bad while Tortie runs asks for one restart — SPEC

Written by the spec step on 2026-11-05 in `/private/var/tmp/tortie-wt/wt-p357`, a detached worktree at origin/main
`0547383e` ("docs(backlog): queue 357 and 358, a session list that goes bad mid-run"). **`git diff 0547383e` in the
worktree must be exactly Phase 357's delta**, this file included. origin/main moves while the phase runs (Phases 353
and 356 run beside it); nobody here rebases, pulls or merges. The charter is `docs/BACKLOG.md` "## Phase 357"
(`:44616`), bound as written except where §0.1 says the tree or a measurement wins, and "## Phase 358" (`:44659`) is
what is NOT ours: the cause of the damage. His standing rulings bind: no regression against today; just enough words;
no tmux vocabulary on any surface; nothing released, tagged, version-bumped, archived or uploaded; his session count is
allowed (2026-11-02), being `build/electron-run.mjs`'s read-only `list-sessions` of `-L gmux` and nothing else.

| | |
| --- | --- |
| Subject | `fix(manifest): hold a session list that goes bad mid-run instead of a dialog per refresh` (the entry's) |
| First body line | `Phase 357: a session list that goes bad while Tortie runs asks for one restart` |
| Semver | Patch, unreleased, Mac only, released on his word (0.114.1 needs his word) |
| Lane | Build: Spec → Build (FOUR builders, disjoint files) → Integrate → Verify (two lenses) → [Fix once → Reverify] → Commit |
| Tier | **3**: it touches the manifest and the quit, which can lose or corrupt a person's work, and he reported it. Two independent methods at least, one an attack (§10) |
| Menus | **No change.** No menu row is added, renamed or removed. The Restart action lives on the notice, not in a menu (D21) |
| Contract | **Moves on purpose** (§6): one invoke channel `app:relaunch` (249 → 250) and one env name `GMUX_HARNESS_MANIFEST_FAULT` (118 → 119). Nothing else: no schema, migration, pragma, smoke mode or `gmux.*` key |
| `HELPER_USER_FLOOR` | **180 → 181** (`build/assert-electron-teardown.mjs:573`): `build/p357/probe-p357.mjs` reaches the helper (obligation 1) |
| CHANGELOG | One item under `## Unreleased`, `### Fixed` (§5) |

## 0. The hard rules, stated once (every builder, the integrator, every verifier, the fixer and the reverifier)

- NEVER commit, stage or stash. `/Users/gdc/gmux` is read only. Never touch `/private/var/tmp/tortie-wt/wt-p353*`,
  `wt-p356*` or `wt-docs`. Scratch lives under `/private/var/tmp/tortie-wt/scratch/p357/<role>/`, never under
  `/private/tmp`, which macOS cleans; a probe's `TMPDIR` points there too.
- **The built parent is kept for you**: `/private/var/tmp/tortie-wt/wt-p357-parent` is `0547383e` with `node_modules`
  and `build/vendor` copied and `out/` built by the spec step (71 s, exit 0). Use it as `P357_PARENT_CHECKOUT`. Do not
  edit it; delete nothing in it.
- **`-L gmux` is named only by `build/electron-run.mjs`'s census, and only with `list-sessions`.** Name `tmuxSocket` on
  a launch whose census you want; a run's own tmux commands aim only at its scratch socket, and use the CHECKOUT'S
  vendored tmux (`build/vendor/tmux/bin/tmux`, 3.7b), which is what the development app runs (`/opt/homebrew/bin/tmux`
  is 3.6a and talks a different protocol to a 3.7b server). A census finding naming a session your run did not make is
  his own activity: note it and run once more.
- **No real agent runs, not even for a version.** Every launch hides every probed registry row first
  (`writeHiddenAgents(profile, prefix, hiddenAgentsBesides([]))`) and reads `agents:list` back
  (`standInsOnlyVerdict(list, { standIns: [] })`); a run whose answer is not ok is UNREADABLE. No stand-in agent is
  needed: every arm here runs shells.
- Never read his keychain, credentials, `~/.ssh`, `~/Keys`, `~/.claude`, `~/.codex`, any agent's or conversation store,
  his shell history's contents, or his live Tortie profile. The one exception is the two `app.log` files he named in his
  own request, which the spec step read; nothing of them is copied into this tree beyond the facts in §0.1. Real data
  means his recorded shape through `build/p3167/seed-sessions.mts --shape his` (counts only, §2.2).
- His shell history is never written by us: every command that does not launch an Electron runs under
  `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb`. `/bin/ps` will not start under it, so the four
  native tests that start `/bin/ps` fail inside it by design (name each as it fails; never run them outside it), and the
  one Electron count at the end runs outside it. Record only `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before
  and after every run that starts a shell or the app. A move across an unblocked run: start nothing for 3 minutes and
  stat again; moved again is his, still moved means STOP and report.
- Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids you started, after confirming their
  command line; every process you start ends in a `finally`. Never signal a probe while its own teardown runs. Every
  Electron goes through `build/electron-run.mjs` inside `build/harness-socket.mjs` with a scratch profile, `HOME` and
  socket. No Simulator; nothing under `ios/` moves. No real Tailscale, DNS, APNs or ssh; never `smoke:remote` or
  `smoke:machines`. Never import a `build/` script to inspect it; importing `electron-run.mjs`, `hidden-agents.mjs`,
  `cdp-client.mjs`, `cdp-target.mjs` and the door stand-ins to USE them is how a probe launches.
- **A probe that holds main's inspector (`--inspect=0`) must close that websocket before it asks the app to quit.**
  Measured (§2.3, run 1): with the session left open the parent did not exit in 45 s and the helper's teardown ended
  it, while runs 2 and 3 without the inspector exited 0 in 2,783 ms and 591 ms. Node waits for an attached debugger at
  exit; that is the likely cause, stated, not measured.
- **Never run `app.relaunch()` in a harness launch.** M4 (§2.4) measured that a relaunch outlives the process that asked
  for it, whatever ends it, and the relaunched app reparents to launchd, outside the helper's tree. **It also escapes the
  helper's profile sweep**: within about a second its main process renames itself to `Tortie` with no arguments, so a
  search for the profile path no longer finds it. M4's three relaunched apps were left running that way for about 17
  minutes, found with CLAUDE.md's Electron count, confirmed by their start times and their children's paths, and ended
  by pid (SIGTERM, then their scratch tmux server with `kill-server`). The product's handler refuses to relaunch in a
  harness launch (D14); a probe that wants the next launch makes it itself.
- The lock has three slots shared with Phases 353 and 356: `zsh /private/tmp/tortie-ops/lock.sh try p357 <role>` prints
  the slot or exits 1 (retry every 60 s in a NEW command); release with `zsh /private/tmp/tortie-ops/lock.sh release
  <slot>` from a `trap`. Every probe and app run holds one. `df -h /` before any build; under 8 GB free, wait and report.
- **Faults are made in scratch only**: a damaged manifest is a scratch profile's (or a scratch test's) file, written
  over by page; the seam (§4.6) is reachable only in a harness launch and the gate proves it (§7.1, rule S8).

## 0.1 What the entry got wrong or left open at this tree (the tree and the measurements win; each item binds)

1. **Mechanism 4 as written does not stop the crash; it moves it.** "Dispose skips `this.manifest.close()`" is not
   enough: better-sqlite3 13.0.3 registers an environment cleanup hook that closes EVERY open connection at teardown
   (`node_modules/better-sqlite3/src/better_sqlite3.cpp:56`, `env.AddCleanupHook(Addon::Cleanup, addon)`;
   `src/addon.cpp:7-8`, `for (Database* db : addon->dbs) db->CloseHandles();`, which calls `sqlite3_close`), and its
   destructor closes a collected one (`src/objects/database.cpp:32`). M3 (§2.4) measured it in the parent app: a
   connection the app never closed had its `-wal` and `-shm` deleted (SQLite's last close ran) on `app.quit()`,
   `app.exit(0)` and `process.exit(0)`, and kept them (12,392 and 32,768 bytes, nothing closed it) only on
   `process.reallyExit(0)`. His crash stack starts at `Database::JS_close` because dispose called it first; without
   that call the same `sqlite3_close` → `pcache1Destroy` runs at environment teardown. So a latched connection whose
   file is fine is never closed by anyone (D10, D11): the store skips `close()`, keeps the object out of the collector,
   and the quit ends the process with the disposer's existing hard exit (`src/main/capabilities.ts:1046-1048`,
   `clearLogRunSentinel(); process.kill(process.pid, 'SIGKILL')`, Phase 36's measured-safe line) instead of
   `app.quit()`, after every other step of the ordered disposer has run.
2. **A relaunch survives that exit.** M4 measured `app.relaunch()` then SIGKILL to self: a new main process naming the
   same profile appeared 81 ms after the kill (and 44 ms after `app.quit()`, 58 ms after `process.reallyExit(0)`), so the
   Restart action works through the hard exit with no helper of ours (D13).
3. **The parent does not storm from status ticks.** The activity poll reads the list first (`activitySessions`,
   `src/main/sessions/core.ts:1423-1438`, from `runTick` in `src/main/activity/monitor.ts:591`) and its own catch
   swallows the throw (`core.ts:2632`, `.catch(() => undefined)`), so a list that fails on every read makes no status
   flip and schedules no broadcast: 0 uncaught exceptions in 60 s of ticks, in both damage shapes (§2.3). What reaches
   Electron's dialog is a broadcast or point read reached from an EVENT outside an IPC handler: measured, 2 of 2
   external renames → 2 uncaught `SqliteError SQLITE_CORRUPT` with his exact stack (`SessionsRepository.listSessions <
   ManifestStore.listSessions < GmuxCore.listSessions < GmuxCore.broadcastSessions`), from `handleExternalRename`
   (`core.ts:1824-1833`) inside the control client's `data` loop (`src/main/tmux/control-client.ts:334`, no catch). His
   "dialog per refresh" needs a source that broadcasts while the list read fails, e.g. the remote poll's
   `onRemoteSessionsChanged` (`core.ts:1390-1404`; his app.log shows a sign-in retry to an unreachable machine every
   300 s through the window) or an intermittent failure; which one is not knowable from his log, and it does not
   matter to the design, because the latch makes every later read answer without SQLite.
4. **An unhandled rejection never reaches the dialog in Electron 43's main process.** The counter's control rejection
   did not reach `uncaughtException` in any of four launches; Electron printed `UnhandledPromiseRejectionWarning` to
   stderr and nothing reached app.log. So "today's behaviour" for a rejection is a stderr line and nothing visible
   (D17).
5. **Electron's own handler is one line, read out of the shipped framework.** `process.on("uncaughtException",
   function(e){process.listenerCount("uncaughtException")>1||…showErrorBox("A JavaScript error occurred in the main
   process","Uncaught Exception:\n"+(e.stack?e.stack:`${e.name}: ${e.message}`))})` (Electron Framework 43.3.0, read with
   a byte search). Any second listener silences it, so the new handler must draw that same dialog itself, once per
   distinct error (D16).
6. **`insertSession` hides the code.** `src/main/manifest/sessions-repository.ts:299-305` wraps EVERY error as
   `INVALID_INPUT` "Could not record session "<name>" in the manifest" with the SQLite message in `detail`, so a
   classifier reading `err.code` never sees a broken connection on a create (M1 K3, K5, K8; the parent's total-damage
   create answered exactly that). It is the ONLY `catch` in the six repository files (§3); it rethrows a broken
   connection first (D5).
7. **The phone's own words for a refused list are wrong today.** The door turns any throwing fact into its one refusal,
   a 404 with no body (`src/main/pocket/bind.ts:241`, `:460-466`), and the phone reads a 404 on the LIST as a door that
   no longer knows it and goes to Pairing with "not paired" (`ios/Tortie/Screens/DoorWords.swift:423-424`). The phone
   cannot change in this phase, and it never draws the Sessions answer's `ageNote` (`SessionsScreen.swift:176`); it does
   draw the Needs input answer's `emptyLine` (`ListScreen.swift:130-158`), and a refused Sessions read falls back to
   that list (`SessionsScreen.swift:440-466`, `.olderMac`, which draws `ListScreen` in the Sessions tab's place,
   `:693`). So the words travel in `emptyLine` and the other reads answer 404 (D8, D9).
8. **The second boot during the quit.** At the parent, in the total-damage run, the quitting process (pid 26793) booted
   a SECOND core 1 s after its quit generation (a second `macOS login session` line at 20:36:53.402) and that boot's
   gate quarantined the damaged file 54 ms later. Something asks `getGmuxCore()` after `shutdownGmuxCore()` empties the
   slot (`core.ts:4498-4502`); the window's blur handler (`src/main/index.ts:694-705`) is a candidate, not proved. It is
   older than this phase and not this phase's (§13 owes it an entry); the probe counts boots per pid during each quit
   so HEAD is held to the parent on it.
9. **Citations moved or added**: `listSessions` on the core is `core.ts:3205-3309`; `broadcastSessions` `:2797-2801`;
   `scheduleSessionsBroadcast` `:1471-1478`; dispose's close `:4319-4323`; the store's `close()`
   `src/main/manifest/store.ts:341-343`; the facade's 48 public members `:341-702`; `looksUnreadable`
   `src/main/db/integrity.ts:134`, `checkDatabaseIntegrity` `:158`; `postDurabilityNotice`
   `src/main/notice/index.ts:78`; `startCrashCapture` `src/main/log/crash.ts:34`, called at `src/main/index.ts:134`.

## 1. The answer first

| # | What | One line |
| --- | --- | --- |
| 1 | The classifier | `isBrokenConnectionError(err)` beside `looksUnreadable`: a better-sqlite3 `SqliteError` (by class) whose `code` is `SQLITE_CORRUPT`, starts `SQLITE_CORRUPT_`, or is `SQLITE_NOTADB`. Never the message. **`SQLITE_IOERR_*` is out** (D2) |
| 2 | The latch | Every public member of `ManifestStore` is ONE call through `this.through(<own name>, …)` (or `this.quiet` for the three that answer instead of throwing), `close` and the latch's own read `stoppedReading` the two named exceptions. The first broken connection latches once: one app.log line, one read-only file check, one notice; from then on every member refuses before SQLite with a typed `MANIFEST_STOPPED` error. A conformance gate with in-memory ablations pins the shape (§7.1) |
| 3 | No error escapes | `GmuxCore.listSessions()` answers the last list that read cleanly once the store has stopped, so the window keeps it and `broadcastSessions` cannot throw; the three event paths that read or write a single row catch the refusal; the phone's Needs input list says the sentence and its other reads answer 404, which the phone routes back to that list; ONE notice with a Restart action |
| 4 | The quit | A stopped store never calls `close()`. When its file check said the file is FINE (his case: the damage is in memory), the connection is held off the collector and the ordered disposer ends with the existing hard exit, so nothing closes it; when the file is DAMAGED or unreadable, today's close runs (M2 measured it clean), so that case quits exactly as the parent does |
| 5 | The crash log | Two handlers in `src/main/log/crash.ts`: each distinct error (name, code, frames) logged once at scope `crash` with no message text but SQLite's own; an uncaught exception still draws Electron's own dialog, once per distinct error and never in a harness launch; a rejection draws nothing, as today; the store's own refusal draws no dialog (its notice spoke) |
| 6 | The proof | Vitest over a REAL damaged scratch manifest under a live connection (M1's method) and over the seam; one app run per build (`probe:p357`, parent first) on his recorded shape with real page damage AND, at HEAD, the harness-only seam for the memory-shaped case; the attack lens tries every entry point in §3 live |

### 1.1 The decisions, each with its reason

| Id | Decision | Reason (where it comes from) |
| --- | --- | --- |
| D1 | `export function isBrokenConnectionError(err: unknown): boolean` in `src/main/db/integrity.ts`, directly below `looksUnreadable`: `err instanceof Database.SqliteError && typeof err.code === 'string' && (err.code === 'SQLITE_CORRUPT' \|\| err.code.startsWith('SQLITE_CORRUPT_') \|\| err.code === 'SQLITE_NOTADB')` | Entry mechanism 1. M1 (§2.1): every page, overflow, past-the-end and index damage surfaced as plain `SQLITE_CORRUPT`, every header damage as `SQLITE_NOTADB`; `SQLITE_CORRUPT_VTAB`, `_SEQUENCE` and `_INDEX` exist in better-sqlite3's own table (`src/util/constants.cpp:111-113`) and the prefix keeps them. `instanceof` because a typed error of Tortie's could carry any `code` string, and `Database.SqliteError` is the class better-sqlite3 throws (`lib/sqlite-error.js`) |
| D2 | **`SQLITE_IOERR_*` is NOT in the classifier** | New, measured. No damage of a page produced it (11 kinds). A volume vanishing under the connection (K11, `hdiutil detach -force`) produced no error at all: the process died with SIGBUS in `walIndexTryHdr` (the `-shm` is memory mapped), twice. An I/O error says the OS refused one call, not that the connection's memory is wrong, and latching on one would refuse every write for the rest of a run that today recovers on the next call, which is a regression. An IOERR keeps today's path; the crash handler logs it once and draws today's dialog once (D16) |
| D3 | The latch is a private field `stopped: ManifestStop \| null` on the store; `ManifestStop = { operation, code, at, file: 'fine' \| 'damaged' \| 'unreadable', check: IntegrityCheckKind, checkMs }` | Entry mechanism 2: once, and the file verdict travels with it |
| D4 | Every public member of `ManifestStore` (48 at this head, `store.ts:341-702`, the constructor aside) is exactly one statement, `return this.through('<own name>', () => …)` (or the same without `return` for a `void` member), EXCEPT three that answer instead of throwing, each `return this.quiet('<own name>', <fallback>, () => …)`: `contentFingerprint` (fallback `null`, which the ring already reads as "take one", `ring-schedule.ts:411-413`; SUPERSEDED by the fix round's F1, "### Fix round (2026-11-05)": the fallback is the last fingerprint answered or `STOPPED_FINGERPRINT`, because `null` made the ring take a copy at every poll), `schemaState` and `describeSchema` (fallbacks `STOPPED_SCHEMA_STATE` and `'session list: stopped reading'`, so diagnostics still copy). `close()` (D10) and the new `stoppedReading()` (a read of the latch itself, §4.2) are the two members that are neither. `ManifestOperation` is the closed union of the members' names, exported with a frozen `MANIFEST_OPERATIONS` list the gate compares to the class | Entry: "how EVERY public method passes through the latch and the check that pins it, so a method added later cannot walk past it". One statement per member is the shape an AST rule can hold whole, and a member added without it fails the gate by name (§7.1 S1). `reconcile` stays `reconcileManifest(this.db, this, live, options)` inside `through`, so its inner facade calls nest; an inner latch throws the typed refusal and the outer `through` rethrows it unchanged |
| D5 | `insertSession`'s catch (`sessions-repository.ts:299`) begins `if (isBrokenConnectionError(err)) throw err;` and is otherwise unchanged | §0.1 item 6. It is the only catch in `sessions-repository.ts`, `projects-repository.ts`, `restore-journal.ts`, `remote-executions.ts`, `remote-folder-pins.ts` and `closed-remote-folders.ts` (counted, §3); the gate holds that count and that first statement (§7.1 S3) |
| D6 | `through(operation, run)`: if `stopped` → throw `manifestStoppedError(operation)` before anything else; else `manifestFaultHook?.(operation)` then `run()` inside one `try`; a caught error that `isBrokenConnectionError` → `latch(operation, err)` then throw `manifestStoppedError(operation)`; any other error is rethrown unchanged. `quiet(operation, fallback, run)` is the same with `return fallback` in place of both throws | Entry mechanism 2. The fault hook is inside the `try` so the seam's error is classified by exactly the code real damage is (§4.6) |
| D7 | `manifestStoppedError(operation)` = `Object.assign(new Error(JSON.stringify({ code: 'MANIFEST_STOPPED', message: MANIFEST_STOPPED_REFUSAL, detail: operation })), { code: 'MANIFEST_STOPPED' })`; `'MANIFEST_STOPPED'` is appended to `GmuxErrorPayload['code']` (`src/shared/types.ts:1191`) | The house convention: the JSON message crosses IPC and the renderer's `errorText` (`src/renderer/state/errors.ts:23`) shows `message` in the toast, so a refused create says the sentence. The `code` property is what the crash handler reads (D18), never the message |
| D8 | `latch(operation, err)` runs ONCE: (1) `checkDatabaseIntegrity(dbPath)` synchronously (a fresh read-only connection with its own cache, `integrity.ts:158`); (2) one `getLog('manifest').error('the session list stopped reading correctly', { event: 'manifest.stopped', operation, code, file, check, checkMs, detail })`, `detail` the verdict's text clipped to 160 characters (integrity text names pages and trees, never row values); (3) when `file === 'fine'` the `Database` object is pushed onto a module-level `held` array; (4) `postDurabilityNotice({ kind: 'manifest-stopped', fileFine })` (`fileFine` true, false, or null for unreadable). The store keeps its path in a private field for (1) | Entry mechanism 2 ("one app.log line naming the operation and the code, with no row data, and one read-only `checkDatabaseIntegrity`"). Synchronous, because M1 measured the check at 0 to 2 ms on a 278,528-byte file and the gate already runs the same check on his 5,054,464-byte file at every launch; a check inside reconcile's open transaction reads the last commit, which WAL allows |
| D9 | The words travel: `MANIFEST_STOPPED_NOTICE`, `MANIFEST_STOPPED_RESTART`, `MANIFEST_STOPPED_REFUSAL`, `MANIFEST_STOPPED_PHONE_LINE` in ONE new file `src/shared/manifest-stopped-copy.ts` (§5) | Just enough words, said once each; the shared folder's existing copy files (`lifecycle-words.ts`, `reply-copy.ts`, `screen-copy.ts`, `push-copy.ts`) are the precedent |
| D10 | `close()`: when `stopped === null`, today's `this.db.close()`; when stopped and `file !== 'fine'`, today's `this.db.close()` (D11); when stopped and the file is fine, it closes NOTHING and logs once `the session list connection is left open so nothing closes a damaged cache` (scope `manifest`, info). `export function manifestConnectionsLeftOpen(): number` answers `held.length` | §0.1 item 1 |
| D11 | **Close at quit only when the file check found the file damaged or unreadable**; hold and hard-exit only when it found the file fine | No regression against today, measured: with the FILE damaged the parent's close returned and the quit exited 0 (M2 runs 2 and 3, 2,783 ms and 591 ms), so that case keeps today's quit byte for byte. With the file fine, the damage is in the connection's memory (his case: the gate's full `integrity_check` passed at his relaunch), and its close is what crashed, and the last close also checkpoints the WAL into the main file through that same memory, which is how damage in memory becomes damage in the file. Q2 offers him "always hold" |
| D12 | The quit: `disposeMainCapabilities` (`capabilities.ts`) gains, immediately before its final `return 'proceed'` (`:1060`), `if (manifestConnectionsLeftOpen() > 0) { logQuit('[gmux] quit: the session list connection stopped reading correctly and is left open; ending the process without closing it'); clearLogRunSentinel(); process.kill(process.pid, 'SIGKILL'); return 'killed'; }`. The app.log record of it is the latch's line (D8), written at latch time, because "the file transport buffers, the signal does not wait" (`:1000-1001`) | §0.1 item 1. The SAME line as Phase 36's escape (`:1046-1048`), after the core's dispose, the quit generation, every watcher drain, the worker joins and the tray: Phase 36 proved nothing durable is pending there, so clearing the sentinel is truthful and the next launch posts no `unclean-exit` notice. `before-quit` already returns on `'killed'` (`src/main/index.ts:796-797`) |
| D13 | Restart: a new invoke channel `app:relaunch` (`{ req: []; res: void }`, a new appended `RelaunchInvokeChannelMap` in `src/shared/ipc/app.ts` folded into the facade's map in `src/shared/ipc/index.ts:272`), the preload member `relaunch: () => invoke('app:relaunch')` beside `quit` (`src/preload/index.ts:189`), and its handler in `src/main/capabilities.ts` beside `app:quit` (`:629-631`): refuse (log, do nothing) unless `hasSaidNotice('manifest-stopped')`; in a harness launch (`isHarnessLaunch(process.env)`) log `restart asked: a harness launch is not relaunched` and `app.quit()`; otherwise `app.relaunch(); app.quit();` | Entry mechanism 3 ("a Restart action that relaunches the app") and its refusal ("No automatic relaunch: the person presses Restart"): the channel does nothing unless this run posted the notice, so no other surface can turn into a restart. M4: the relaunch survives D12's hard exit |
| D14 | The relaunch is never called in a harness launch | §0. The probe makes the next launch itself and reads the gate there |
| D15 | The notice: `ManifestStoppedNotice { kind: 'manifest-stopped'; fileFine: boolean \| null }` appended to `src/shared/notice.ts` (the union at `:361`, `DURABILITY_NOTICE_KINDS` at `:385`), latched per kind (`notice/index.ts` unchanged). The renderer arm in `showDegraded` (`src/renderer/state/subscriptions.ts:329`, before the `never` at `:644`): `toast('error', MANIFEST_STOPPED_NOTICE, { sticky: true, action: { label: MANIFEST_STOPPED_RESTART, run: () => void gmux.relaunch() } })` when the bridge has `relaunch`, else the same toast with no action. One sentence for both file verdicts | Entry mechanism 3: ONE notice through `postDurabilityNotice`, plain words, a Restart action. A sticky toast is allowed six lines (`src/renderer/app/Toasts.tsx` header); the sentence is 108 characters, about five lines beside the button. After a restart a damaged file is quarantined and rebuilt by the gate with its own notice, so "Restart Tortie to load it again" is true of both |
| D16 | `src/main/log/crash.ts` gains `installCrashHandlers(deps)` (called by `startCrashCapture`, so `index.ts:134` stays the one call before `whenReady`): `process.on('uncaughtException')` and `process.on('unhandledRejection')`. Each computes a record (`name`, `code` when a string, `frames`: the stack's `at` lines after the message is cut off the front, at most 12, each at most 300 characters; `message`: ONLY for a `SqliteError`, clipped to 120 characters; otherwise `messageChars`, the length) and a key (`name`, `code`, `frames`). First time a key is seen: one `logEvent('crash', 'error', 'crash.uncaught' \| 'crash.rejection', …)`; for an uncaught exception, outside a harness launch and when D18 does not apply, `dialog.showErrorBox('A JavaScript error occurred in the main process', 'Uncaught Exception:\n' + (e.stack ? e.stack : \`${e.name}: ${e.message}\`))`, Electron's own text (§0.1 item 5). A repeat key draws nothing and logs nothing but bumps a count; the counts are logged once at quit (`crash.repeats`, keys hashed with sha256 and counts only) from `disposeMainCapabilities`' first synchronous lines | Entry mechanism 5 ("never its message past a clip the spec sets", "the same error is not shown twice in one run", "keeps today's behaviour apart from the repetition"). The clip: SQLite's text is its own fixed vocabulary; any other message can hold payload (V8's `JSON.parse` error quotes its input), so it is counted, never written. Every string in a record passes the log's home redaction (`src/main/log/redact.ts:18`) |
| D17 | A rejection draws nothing and prints one stderr line, `[gmux-crash] unhandled rejection: <name> <code>` | §0.1 item 4: today a rejection is a stderr warning and nothing visible; a listener silences Node's own warning, so the line keeps the terminal story |
| D18 | An error whose `code === 'MANIFEST_STOPPED'` is logged (once per key) and draws no dialog | The backstop for a path §3 missed: the person already has the notice, and a dialog per refresh is the defect. Every other error, a broken connection from one of the other three databases included, keeps today's dialog |
| D19 | `GmuxCore.listSessions()` keeps `lastCleanList: Session[] \| null`, set at the end of every compose that returned; when the store refuses with `MANIFEST_STOPPED` it answers `lastCleanList ?? []` and does not throw. `broadcastSessions` therefore never throws a refusal, and broadcasts that same list | Entry mechanism 3 ("The window keeps the last list that read cleanly"). Answering it from the source holds every reader at once: `sessions:list`, the tray's feed, Catch Me Up, the door's facts, the phone's writes' lookups. `listSessionRecords` and `listRemovedSessions` throw the refusal (harness cleanups and the Past Sessions panel, which shows its own error state) |
| D20 | The event paths that read or write one row catch the store's refusal and stop: `handleExternalRename` (`core.ts:1824`), `applyDetectedStatus` (`:1450`), `reapDeadSession` (`:2678`), `handleUnexpectedAttachExit` (`:1835`), and the `server-exit` snapshot chain (`:1815`). Each `catch` names `isManifestStopped(err)` (exported from `store.ts`) and rethrows anything else | §0.1 item 3: `handleExternalRename` runs inside the control client's line loop, so a throw there also drops the rest of that chunk's lines; the other four are an uncaught throw or an unhandled rejection with nothing to show for it. The crash handler (D18) is the backstop, not the design |
| D21 | No menu row moves; the Restart is the notice's action alone | Entry: one notice with a Restart action. CLAUDE.md's menu rule binds a surface added or removed; a toast's action is neither |
| D22 | The door, when the session list has stopped: `PocketFacts` (`src/main/pocket/routes.ts`) gains one optional read, `listStopped?(): boolean`; `createPocketFacts` (`facts.ts:300`) implements it from a new `PocketFactsCore.manifestStopped(): boolean`. `blocked()` answers `{ rows: [], others: [], othersOmitted: 0, at, emptyLine: MANIFEST_STOPPED_PHONE_LINE, ageNote: POCKET_AGE_HONESTY }`; `sessions()`, `session()`, `turns()`, `screen()` and `scrollback()` answer null (404) | §0.1 item 7. The phone draws `emptyLine` on Needs input, routes a refused one-session read back to that list (`backToList`), and draws that list in place of a refused Sessions tab (`.olderMac`), so every phone surface shows the one sentence with no phone change. Writes keep their verbs' own `failed` sentences: each verb reaches the store, which refuses before tmux is touched (§3 table, rows W1 to W6) |
| D23 | The seam: `src/main/harness/manifest-fault.ts`, `installManifestFault()` called from `src/main/index.ts` beside `installPushSeam()` (`:503`); `manifestFaultPath(env, userDataDir)` answers the path only when `isIsolatedLaunch(env) \|\| env.GMUX_PROBES === '1'`, `GMUX_HARNESS_DIR` is set and the profile is inside it (`machine-seam.ts:63-75`'s three refusals, copied by shape); the file `{ "seq": n, "fail": { "operation": <a MANIFEST_OPERATIONS name>, "code": "SQLITE_CORRUPT" \| "SQLITE_NOTADB" } }`, read every 100 ms, dropped whole with its reason printed when not that shape; each new `seq` arms ONE throw of `new Database.SqliteError('database disk image is malformed' \| 'file is not a database', code)` at the next call of that operation, through `setManifestFaultHook` (exported by `store.ts`, called by this module alone) and prints `[gmux-harness] manifest fault armed: seq=<n> <operation> <code>` | Entry: "a seam that exists only in a harness launch", and the brief's check that it cannot be armed otherwise (§7.1 S8, driven). It throws the REAL class so the classifier is the one real damage meets. It leaves the file fine, which is his case and the one real page damage cannot make |
| D24 | `probe:p357` is one committed probe (§8), parent first, one Electron at a time | Tier 3 and the entry's proof |
| D25 | A new gate, `conformance:stoppedlist` (`build/conformance-stopped-list.mjs`), pure, spawns nothing, reads with the TypeScript parser, and asks each rule again over in-memory copies with it broken (§7.1) | The entry's "the check that pins it". The rules span four builders' files, so one gate reads them all; `conformance:choices`' in-memory ablations are the precedent |

## 2. What the spec step measured, how, and the numbers

Everything ran under the history block except the app runs (history unchanged across all of them: `742243 1793907771`
and `23166 1790702242` before and after every run). Scripts, reports and logs are under
`/private/var/tmp/tortie-wt/scratch/p357/spec/` (`m1/`, `m2/`, `m3/`, `logs/`). They are scratch and stay there for the
verifier.

### 2.1 M1: the shipping store over a real damaged file, by kind (vitest, the parent's source)

`m1/damage.m1.test.ts` under `m1/vitest.config.mjs` (the worktree's own aliases, its electron stub, `test.dir` in
scratch), run with `node node_modules/vitest/vitest.mjs run --config …` from the worktree: 12 cases in 28 to 36 s. Each
builds a SHIPPING `ManifestStore` over a scratch file with 400 sessions (three with a 14,000-byte argv for overflow
pages) and one project, reads the list once (every page in the connection's cache), checkpoints from a second
connection (`wal_checkpoint(TRUNCATE)`), finds the pages with `dbstat`, writes over them in the MAIN file, proves the
bytes changed, then makes the live connection read again (`PRAGMA shrink_memory` on it, or a write from the second
connection so its next read sees a new WAL header and drops its cache; both give the same answers, K1). Results in
`m1/results.json`.

| Kind | `listSessions` (twice) | `getSession(live)` | `setStatus(live)` | `insertSession` | fresh `checkDatabaseIntegrity` | `close()` |
| --- | --- | --- | --- | --- | --- | --- |
| K1 a sessions leaf's type byte (both triggers) | `SQLITE_CORRUPT` ×2 | ok | **ok** | **ok** | damaged, no throw ("Tree 5 page 36: btreeInitPage() returns error code 11") | ok |
| K2 a leaf's cell pointers | `SQLITE_CORRUPT` ×2 | ok | ok | ok | damaged, no throw | ok |
| K3 the interior page's right child past the end | `SQLITE_CORRUPT` ×2 | `SQLITE_CORRUPT` | `SQLITE_CORRUPT` | **`INVALID_INPUT`** (wrapped) | damaged, threw | ok |
| K4a an overflow page's next pointer past the end | `SQLITE_CORRUPT` ×2 | ok | ok | ok | damaged, no throw | ok |
| K4b an overflow page zeroed | `SQLITE_CORRUPT` ×2 | ok | ok | ok | damaged, no throw | ok |
| K5 the file cut before a sessions page | `SQLITE_CORRUPT` ×2 | `SQLITE_CORRUPT` | `SQLITE_CORRUPT` | `INVALID_INPUT` (wrapped) | damaged, threw | ok |
| K6 the header's 16-byte magic | `SQLITE_NOTADB` ×2 | `SQLITE_NOTADB` | `SQLITE_NOTADB` | `SQLITE_NOTADB` | damaged, threw "file is not a database" | ok |
| K7 the header's page size | `SQLITE_NOTADB` ×2 | `SQLITE_NOTADB` | `SQLITE_NOTADB` | `SQLITE_NOTADB` | damaged, threw | ok |
| K8 the primary key index's leaf | ok | `SQLITE_CORRUPT` | `SQLITE_CORRUPT` | `INVALID_INPUT` (wrapped) | damaged, threw | ok |
| K9 a sessions leaf zeroed | `SQLITE_CORRUPT` ×2 | ok | ok | ok | damaged, threw | ok |
| K10 a WAL frame's bytes, no checkpoint | ok (no error) | ok | ok | ok | ok | ok |
| K11 the volume detached under the connection | **the worker died: SIGBUS (KERN_MEMORY_ERROR) in `walIndexTryHdr`**, twice | | | | | |

Read: every message was "database disk image is malformed" or "file is not a database", every `err.code` a plain
`SQLITE_CORRUPT` or `SQLITE_NOTADB` (none extended), `looksUnreadable` false on all of them. **Writes went on through a
connection whose list read failed** (K1, K2, K4a, K4b, K9), which is the latch's premise measured. `contentFingerprint`
answered a hash, not null, under every page damage (the digest folds a table it cannot read into its text) and null
under header damage. The fresh connection's check told a damaged file apart in every case and took 0 to 2 ms. K10's
damaged frame did not reach any read at that offset: inconclusive, and not a claim. K11 left two crash reports of the
scratch test's own node process, `~/Library/Logs/DiagnosticReports/node-2026-11-05-151642.ips` and `-151739.ips`
(left in place; nothing under his home is removed by us).

### 2.2 M2: the parent app, real damage mid-run (three runs; runs 2 and 3 are the readings)

`m2/parent-run.mjs` inside `harness-socket.mjs gmux-p357m2`, from the parent checkout, `TMPDIR` under scratch. One
Electron (`withElectron`, `GMUX_PROBES=1`, `GMUX_LOG_FILE=1`, scratch `HOME`/`ZDOTDIR`, `HISTFILE=/dev/null`, every
probed agent hidden, `agents:list` read back: nothing resolved). The counter is `m2/counter.cjs`, loaded into MAIN with
`NODE_OPTIONS=--require=…`: it PREPENDS one `uncaughtException` listener (so Electron's own handler sees two listeners
and draws no dialog on his screen), writes one JSON line per event, and proves itself with a control exception from a
timer 2 s after load (heard in every launch). Run 1 used main's inspector instead; its listener never attached
(`process.listenerCount` answered undefined in the inspector's context) and its quit hung (§0), so it is discarded.

Run 3 (`m2/report-parent-his.json`), the realistic one: before the launch, `build/p3167/seed-sessions.mts --shape his`
wrote his recorded shape into the scratch manifest through the shipping `insertSession` (354 rows: 252 removed, 102
listed, 23 folders, 7 agents; counts only). Three shells were created from the window. Then one sessions leaf (page 27
of 34 leaves, the first in tree order, holding none of the shells) had its type byte written over after a checkpoint,
and a second connection's write made the app's connection read again. A fresh read-only connection still read each
shell's row; the app's `sessions:list` over the bridge rejected ("SqliteError: database disk image is malformed").

| t after the damage | What happened | Reached `uncaughtException` (cumulative) |
| --- | --- | --- |
| 0 to 15 s | status ticks only | **0** |
| 15 s | a create from the window | 0, and the IPC rejected with the raw `SqliteError` **while `p357-after` was created and running in tmux** (`$4 p357-after`): the person is told it failed |
| 21 s | `rename-session -t =p357-b p357-b2` from outside | **1** |
| 24 s | a second rename from outside | **2** |
| 29 s | `exit` typed into `p357-c` (its pane ends) | 2 |
| 60 s | | **2**, both `SqliteError SQLITE_CORRUPT "database disk image is malformed"` at `SessionsRepository.listSessions < ManifestStore.listSessions < GmuxCore.listSessions < GmuxCore.broadcastSessions`, his screenshot's stack |

App.log in that minute: one `refresh failed: database disk image is malformed` (warn), nothing for either uncaught
exception, no crash scope at all. **The quit** (`window.gmux.quit()`): exit 0 in 591 ms; its quit generation failed
("manifest generation (quit) failed: database disk image is malformed") and posted `backup-failing` into a closing
window. **The relaunch** on the same profile and server: the gate quarantined the damaged file and rebuilt from the
launch generation, so the list read back 102 rows, all restorable, and the four sessions made after that generation
(`p357-a`, `p357-after`, `p357-b3`, `p357-c`) were still running in tmux and absent from it ("live tmux sessions with
no manifest row (ignored)"). That is Phases 19 and 20 working as built on a damaged FILE; in his case the file was fine.

Run 2 (`m2/report-parent-2.json`), total damage: three shells and nothing else, so the sessions table was one leaf
(page 5) and it was damaged. 0 uncaught exceptions in the minute (the rename there aimed at `$0`, the control
session, and is not a reading); the create answered `INVALID_INPUT` "Could not record session "p357-after" in the
manifest" and spawned nothing; the quit exited 0 in 2,783 ms; inside that quit a second core booted and quarantined the
file (§0.1 item 8).

**Unhandled rejections**: the counter's control rejection never reached `uncaughtException` (runs 2 and 3, and both
relaunches); Electron printed `(node:<pid>) UnhandledPromiseRejectionWarning: Error: p357-control-rejection`.

**The phone's door at the parent is NOT measured here** (the pairing machinery is the probe's, §8). Read from code: a
throwing `facts.sessions()` reaches `bind.ts:460-466`'s catch, which answers its one refusal, a 404 with no body, and
the phone sends a refused list read to Pairing (§0.1 item 7). The probe's parent arm reads the door's bytes.

### 2.3 M3: what closes a connection the app never closed (the parent app, four ways out)

`m3/exit-paths.mjs` inside `harness-socket.mjs gmux-p357m3`, four launches, each with `m3/hold.cjs` loaded into main:
it opens one better-sqlite3 connection to a scratch database in WAL mode, writes a row (its `-wal` 12,392 bytes, `-shm`
32,768), keeps it in a global, never closes it, and ends the process the way a mode file says. A WAL database's last
close checkpoints and deletes the `-wal` and `-shm`, so their presence after the process is gone says nothing closed it.

| Way out | Exit | Held `-wal` after | Manifest `-wal` after | Run sentinel after |
| --- | --- | --- | --- | --- |
| `app.quit()` | 0 in 867 ms | **gone** (closed) | gone | cleared |
| `app.exit(0)` | 0 in 809 ms | **gone** (closed) | gone | left |
| `process.exit(0)` | 0 in 1,450 ms | **gone** (closed) | gone | left |
| `process.reallyExit(0)` | 0 in 636 ms | **12,392 bytes, kept** | 436,752 bytes, kept | left |

### 2.4 M4: does a relaunch survive a hard exit (the parent app)

`m3/relaunch.mjs` inside `harness-socket.mjs gmux-p357m4`: `app.relaunch()` then `app.quit()`, SIGKILL to self, or
`process.reallyExit(0)`. After the first process was gone the process table was read for 12 s for a process naming the
same `--user-data-dir`; each found was ended by pid after its command line was read again, and the helper's profile
sweep ended the rest.

| Way out after `app.relaunch()` | A new main process naming the profile | After |
| --- | --- | --- |
| `app.quit()` | yes, ppid 1, 44 ms after the exit | it booted (its hold module opened its database) |
| `process.kill(process.pid, 'SIGKILL')` | **yes, ppid 1, 81 ms after** | it booted |
| `process.reallyExit(0)` | yes, ppid 1, 58 ms after | it booted |

The relaunched apps were NOT ended by this script or by the helper's sweep (§0): their main processes had renamed
themselves to `Tortie` by the time the sweep looked. The spec step's Electron count at the end found them and ended them
by pid; nothing of this run is left.

## 3. The tree at this head: every path to the manifest, re-read

**The store.** `src/main/manifest/store.ts`: `class ManifestStore` `:255`, the private `db` `:256` handed to five
repositories in the constructor (`:314-318`), the constructor's open through `openGmuxDatabase` `:294-299`, and 48 public
members `:341-702`: `close`, `contentFingerprint`, `schemaState`, `describeSchema`, 24 session members
(`insertSession` … `recordRestoreOutcome`, `:388-555`), six journal members (`:561-587`), four remote execution members
(`:597-618`), `reconcile` (`:625-634`), seven project members (`:640-672`), two pin members (`:687-702`). The
repositories' only `catch` is `sessions-repository.ts:299`; `projects-repository.ts`, `restore-journal.ts`,
`remote-executions.ts`, `remote-folder-pins.ts` and `closed-remote-folders.ts` have none (counted with grep at this
head). `reconciliation.ts` has none and runs its writes through the facade inside `db.transaction`.

**Writes into `manifest.db` that do not go through `ManifestStore`** (each read at this head):

| Writer | Where | When | Through the latch? |
| --- | --- | --- | --- |
| The integrity gate, quarantine and recovery | `src/main/db/sqlite.ts` `openGmuxDatabase`, `integrity.ts:224` `quarantineDatabase`, `src/main/db/recover.ts` | Inside the store's constructor, before the connection exists | No, and none is needed: it runs before a connection exists (unchanged, entry refusal) |
| The boot restore of a ring generation | `src/main/manifest/boot.ts` `prepareManifestForBoot` (`core.ts:1503`) | Before `new ManifestStore` | No, same reason |
| Migrations and the compatibility stamp | `store.ts:310-313` (`runMigrations`, `stampSchemaVersion`) | The constructor | No, same reason |
| The ring's copy | `src/main/manifest/recovery.ts:246-258` `snapshotDatabase`: a NEW read-only connection, `VACUUM INTO` a file elsewhere | Launch, every 60 s with a 5 min floor, sleep, quit | Writes nothing into manifest.db; reads the FILE through its own cache, so a latched store's damaged memory never reaches a generation. Its change test is `contentFingerprint`, which is `quiet` (D4) |
| The rebuild a person asks for | `src/main/manifest/reconstruct.ts:662` `applyReconstruction` (menu, `src/main/menu.ts:677-680`) | A person's two dialogs | Writes a NEW file in its own folder and opens the live one read only for a count (`:348`, `:378`); never the live file |
| The pre-schema copy, the refusal probe, the migrate smoke | `src/main/manifest/refusal.ts`, `src/main/db/schema-version.ts`, `src/main/migrate/**` | Boot, harness | Read only, or harness profiles |
| Second `ManifestStore` instances | `reconstruct.ts:977,1018`, `refusal-smoke.ts:66,209`, `migrate/smoke.ts`, `machines/remote-smoke.ts:428,2032,2086` | Harness modes and the rebuild's own new file | Their own connections; none is the live core's |
| A second CORE booting during the quit | §0.1 item 8 | After `shutdownGmuxCore()` empties the slot | Opens a fresh connection through the gate; not the latched one. Owed an entry (§13) |

**Every path from a timer, an event, an IPC handler or the door to a store member** (the design column is D-numbers):

| # | Entry | Path to the store | Parent outcome | HEAD |
| --- | --- | --- | --- | --- |
| T1 | `scheduleSessionsBroadcast`'s timer `core.ts:1473` | `broadcastSessions` `:2797` → `GmuxCore.listSessions` `:3226` | uncaught when the list fails (his stack) | D19: answers the last clean list |
| T2 | `applyDetectedStatus` `:1450` (from the monitor's `onStatus`, inside the tick) | `getSession`, `setStatus` | caught by the tick's own `.catch` `:2632` | D20 catches the refusal; no flip is written |
| T3 | `onDead` `:1299-1303` → `reapDeadSession` `:2678` | `getSession`, `updateSession` | an unhandled rejection (a stderr warning) | D20 |
| T4 | `onRemoteSessionsChanged` `:1390-1404` | `rehomeRemoteSessions` (its own try `:1394-1402`) then T1 | T1's | T1's |
| T5 | the control client's `session-renamed` `:1806` → `handleExternalRename` `:1824` | `getSession`, `renameSession`, `broadcastSessions` | **uncaught, measured 2 of 2**; also drops the rest of the control client's chunk | D20 |
| T6 | `sessions-changed`/`connected` → `scheduleRefresh` `:2250` → `refresh` `:2321` | `listSessions`, `reconcile`, `listUnfinishedRestoreAttempts` | caught, one warn line | unchanged; the refusal is caught the same way |
| T7 | `server-exit` `:1809-1818` → `snapshotAllSessions` → `src/main/sessions/quit-generation.ts:94` | `listSessions` | an unhandled rejection through `.finally` | D20 |
| T8 | the attach host's `onExit` `:1175` → `handleUnexpectedAttachExit` `:1835` | `getSession` | an unhandled rejection | D20 |
| T9 | the attach host's `onData` pi warm `:1163-1172` | `listSessions` | its own try | unchanged |
| T10 | `activitySessions` `:1423` (every tick) | `listSessions` | swallowed by the tick | unchanged; refused before SQLite |
| T11 | the ring `ring-schedule.ts:364` → `maybeTake` `:411` | `contentFingerprint` | never throws | `quiet` → null |
| T12 | the boot chains `core.ts:1541`, `:1588`, `:1599-1609`, `:1614-1616` | `listProjects`, `listSessions`, pi pass, `getSession` | each caught | unchanged |
| T13 | id-capture watches `src/main/sessions/id-harvest.ts:209,259,304,371,405,449,495,535,701` and `harvestDeps.broadcastSessions` `core.ts:1134` | point reads and writes, T1 | per call site (a builder reads each) | refused before SQLite; T1 holds; the crash handler is the backstop (D18) |
| T14 | the remote layer through `setRemoteManifest` `core.ts:1142` (`src/main/machines/remote-record.ts:353-704`, `remote-rehome.ts:246-447`, `execution-ledger.ts:638-646`, `remote-restore.ts:637`) | point reads and writes from passes and creates | per call site | refused before SQLite; a pass that throws ends that pass; the backstop logs it once |
| T15 | resume in place `src/main/sessions/resume-in-place.ts:731,810,978`, the fold `fold-wiring.ts:84`, Catch Me Up `src/main/overview/activity.ts:160`, Context `src/main/context/session-ipc.ts:66` | `getSession` | per call site | refused; IPC rejects; timers backstopped |
| I1 | every renderer IPC through `getGmuxCore()` (56 production call sites) | any member | the invoke rejects; Electron prints "Error occurred in handler" | the same, with the refusal's sentence as the message; `sessions:list` answers the last clean list (D19) |
| D1 | the door's reads (`routes.ts:1757`, `:1803`, `:1873`, `:1928`, screen, scrollback) | `facts.sessions()` → `GmuxCore.listSessions` | `bind.ts` catch → 404 → the phone goes to Pairing | D22 |
| W1 | the phone's End `src/main/sessions/pocket-writes.ts` → `killSession` | `endRefusal(this.manifest.getSession(…))` FIRST (`core.ts:3448`) | throws before tmux, `failed` | refused before tmux, `failed` |
| W2 | the phone's start (Phase 346) → create | `insertSession` before the spawn (`create-local.ts:658`) | total damage: refused before the spawn; partial damage: **spawned, then the broadcast threw** | refused before the spawn when stopped; when the create itself is what stops it, T1 no longer throws, so the create answers its session |
| W3 | rename (Mac and phone) `renameSessionAdmitted` `:3366` | `mustGetSession` first | throws before tmux | refused before tmux |
| W4 | Remove `:3672-3747` | `getSession` first | throws | refused |
| W5 | restore `:1931` | `beginRestoreAttempt` first (`:2019`) | throws | refused before any spawn |
| W6 | choose, say, keys, paste (`src/main/reply/writer.ts`, `src/main/screen/keys.ts`, `paste.ts`) | read the session through the core | per verb | the door reads answer 404 first (D22), so no phone reaches a verb on a stopped list |
| Q1 | the quit `shutdownGmuxCore` `core.ts:4446` | snapshots (raced, caught), the quit generation (caught), `dispose` → `close()` | his crash | D10 to D12 |

## 4. The design, item by item (real paths; the builder named on each)

### 4.1 The classifier (builder `store`)

`src/main/db/integrity.ts`, below `looksUnreadable` (`:141`), exactly D1, with a header paragraph that cites M1's table
and K11 and says why `SQLITE_IOERR_*` is out (D2). Nothing else in the file moves: `checkDatabaseIntegrity`,
`quarantineDatabase` and the gate are unchanged (entry refusal).

### 4.2 The latch (builder `store`)

`src/main/manifest/store.ts`:
- `export const MANIFEST_OPERATIONS = Object.freeze([...] as const)` naming the 48 members (close included) and
  `export type ManifestOperation = (typeof MANIFEST_OPERATIONS)[number]`.
- The private fields `dbPath` and `stopped` (D3); private `through`, `quiet`, `latch` (D6, D8); the members rewritten
  one statement each (D4), every existing doc comment kept above its member.
- `export function isManifestStopped(err: unknown): boolean` (`code === 'MANIFEST_STOPPED'` on the error object), for the
  core (D20) and the crash handler (D18).
- `export function manifestConnectionsLeftOpen(): number` and the module-level `held` array (D10).
- `export function setManifestFaultHook(hook: ((operation: ManifestOperation) => void) \| null): void` (D23). The hook is
  module-level, `null` in every launch that does not arm the seam, and asked once per call inside `through`'s `try`.
- `stoppedReading(): boolean { return this.stopped !== null; }`, a read of the latch itself that touches no SQLite: the
  gate's SECOND named exception beside `close` (§7.1 S1), because a read of the latch that went through the latch would
  throw exactly when it is asked. The core's `manifestStopped()` is this read, so it is true whichever path latched (a
  remote pass, the ring's fingerprint, an IPC call), not only the core's own catches.

`src/main/manifest/sessions-repository.ts:299`: D5's one line.

### 4.3 The core (builder `core`)

`src/main/sessions/core.ts`:
- `private lastCleanList: Session[] | null = null`; `listSessions()` (`:3205`) composes as today inside a `try`; on
  success it stores and returns the list; a caught `isManifestStopped(err)` returns `this.lastCleanList ?? []`; any
  other error is rethrown (D19). `broadcastSessions` is unchanged.
- `manifestStopped(): boolean`, a read for the door: `return this.manifest.stoppedReading();`.
- D20's five catches.
- `dispose()` unchanged: it calls `this.manifest.close()` and the store decides (D10).

`src/main/pocket/routes.ts` and `facts.ts`: D22. `PocketFactsCore` (`facts.ts:108`) gains `manifestStopped(): boolean`;
the core already satisfies the type, so `capabilities.ts`' composition is unchanged. The new routes branches come first
in each composer, before any other read.

`src/main/capabilities.ts`: D12 (the quit) and D13 (the relaunch handler), and the quit's one `crash.repeats` call
(D16's `flushCrashRepeats()`, exported by `crash.ts`) on the disposer's first synchronous lines, beside
`beginCredentialShutdown()`.

`src/renderer/state/subscriptions.ts`: D15's arm. `src/preload/index.ts`: D13's member.
`src/shared/ipc/app.ts` and `src/shared/ipc/index.ts`: D13's channel and the bridge type (`relaunch(): Promise<void>`
on a new appended `GmuxRelaunchExtras`, folded into the API type).

### 4.4 The crash log (builder `crash`)

`src/main/log/crash.ts`: D16 and D17 as three pure exports for the tests (`crashRecordOf(err, origin)`,
`crashKeyOf(record)`, `crashMessageOf(err)`), `installCrashHandlers({ log, showErrorBox, harness, isStopped })` (the
electron and log bindings injected, so the unit tests run in plain node as the header promises), and
`flushCrashRepeats()`. `startCrashCapture()` keeps its `crashReporter.start` exactly and then installs the handlers with
`isHarnessLaunch(process.env)` and `dialog.showErrorBox`. `isStopped` is `isManifestStopped`, handed in by
`src/main/index.ts` so `crash.ts` imports nothing from the manifest.

`src/main/index.ts`: the call at `:134` gains its deps argument; `installManifestFault()` is added after
`installPushSeam()` (`:503`) with a comment in the house style naming its three refusals.

### 4.5 The words and the notice (builder `store`)

`src/shared/manifest-stopped-copy.ts` (new, §5), `src/shared/notice.ts` (D15's interface, union member and kind),
`src/shared/types.ts` (D7's code).

### 4.6 The seam and the probe (builder `probe`)

`src/main/harness/manifest-fault.ts`: D23, in `machine-seam.ts`'s shape (a header saying what it is for, its refusals
and what it does NOT do: it writes nothing, opens nothing but its file, starts nothing). `build/p357/**`: §8. The gate:
§7.1.

## 5. Words

| Constant | Where it is read | Text |
| --- | --- | --- |
| `MANIFEST_STOPPED_NOTICE` | the Mac's sticky toast | `Tortie's session list stopped reading correctly. Your sessions are still running. Restart Tortie to load it again.` |
| `MANIFEST_STOPPED_RESTART` | its action | `Restart` |
| `MANIFEST_STOPPED_REFUSAL` | the typed refusal's message, a create's or a rename's toast | `Tortie's session list stopped reading correctly. Restart Tortie, then try again.` |
| `MANIFEST_STOPPED_PHONE_LINE` | the phone's Needs input `emptyLine` | `Tortie's session list stopped reading correctly on your Mac. Restart Tortie there.` |

No tmux vocabulary; no word for the file's verdict on any surface (it is in the log line). CHANGELOG.md, under
`## Unreleased`, `### Fixed`, the entry's own item in his style, with the commit link added by the follow-up docs
commit: `- If Tortie's session list stops reading correctly while it runs, Tortie says so once and offers a restart,
instead of an error every few seconds and a crash when you quit; your sessions keep running either way.`

## 6. What moves on purpose (each named in the integrator's report)

- `docs/audits/contract-baseline.txt`: `[ipc.invoke.channels] count=249` → `count=250`, one line `app:relaunch` between
  `app:quit` and `app:setLoginItem`; `[env.names] count=118` → `count=119`, one line `GMUX_HARNESS_MANIFEST_FAULT`.
  Regenerated with `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt`, then `--check`. No other
  line may move; one that does is a finding.
- `build/assert-electron-teardown.mjs:573` `HELPER_USER_FLOOR` 180 → 181 (obligation 1).
- `src/renderer/state/__tests__/notice.test.ts` and any test that enumerates `DURABILITY_NOTICE_KINDS` gain the kind.

## 7. The gates that move

### 7.1 The new gate: `conformance:stoppedlist` (`build/conformance-stopped-list.mjs`, builder `probe`)

Pure node over the TypeScript parser (the pinned `typescript` in `node_modules`), spawns nothing, about a second. Each
rule is then asked again over an in-memory copy with that rule broken, and every broken copy must read red on that
rule and only that rule (the ablations); a control copy changed elsewhere must stay green.

| Rule | Holds | Its ablation |
| --- | --- | --- |
| S1 | Every member of `class ManifestStore` but the constructor, `close`, `stoppedReading` and the private helpers is one statement calling `this.through` or `this.quiet` whose first argument is the member's own name as a string literal; the set of member names equals `MANIFEST_OPERATIONS` minus `close`; `stoppedReading` is one statement reading `this.stopped` and nothing else; since the fix round, `contentFingerprint`'s fallback is `this.<field> ?? <a const holding one string>` and never `null` ("### Fix round (2026-11-05)", F1) | a member that reads `this.sessions` directly; a member naming another member's name; a new member absent from the list |
| S2 | Inside the class, `this.db` appears only in the constructor, `close`, and the arrows handed to `through`/`quiet`; no repository is reached outside such an arrow | `this.db.prepare` in a new method body |
| S3 | The six repository files hold exactly one `catch` clause, in `insertSession`, whose first statement is `if (isBrokenConnectionError(err)) throw err;` | a second catch; the line moved below the wrap |
| S4 | `isBrokenConnectionError` reads `.code` and `instanceof`, never `.message`; its code set is exactly D1's | a `message.includes('malformed')` |
| S5 | `close` closes the connection on every path except stopped-with-the-file-fine, where it closes nothing; the latch pushes the `Database` onto `held` exactly when the file is fine; `manifestConnectionsLeftOpen` reads `held` | `close` calling `this.db.close()` unconditionally; the push made for every verdict |
| S6 | `disposeMainCapabilities` asks `manifestConnectionsLeftOpen()` once, immediately before its last `return 'proceed'`, and that branch is `clearLogRunSentinel(); process.kill(process.pid, 'SIGKILL'); return 'killed';` in that order | the branch above `shutdownGmuxCore()`; the sentinel line removed |
| S7 | `app.relaunch(` occurs once under `src/main`, in the `app:relaunch` handler, after `hasSaidNotice('manifest-stopped')` and after the `isHarnessLaunch(process.env)` return; `relaunch(` is called once under `src/renderer`, in the `manifest-stopped` arm's action | a second caller; the notice check removed; the harness return removed |
| S8 | `setManifestFaultHook(` has one production caller, `src/main/harness/manifest-fault.ts`, after `manifestFaultPath(...) !== null`; AND the gate DRIVES `manifestFaultPath` (through the pinned tsx, as `conformance:harnessprobes` drives its hold) over every environment shape: no harness term, `GMUX_PROBES=0`, no `GMUX_HARNESS_DIR`, a profile outside it, a `/var` and `/private/var` spelling, and all three present, null in all but the last | the probe term widened to any value; the profile check removed |
| S9 | `src/main/log/crash.ts` is the one file under `src/main` naming `process.on('uncaughtException'` or `'unhandledRejection'` (tests excepted); no log call in it names `.message` but through `crashMessageOf`; the dialog call sits behind the harness test and `isStopped` | a log field `message: err.message` |
| S10 | `GmuxCore.listSessions` catches only through `isManifestStopped` and rethrows anything else; D20's five catches each name `isManifestStopped` and rethrow anything else | a bare `catch {}` swallowing every error |

Classified `pure('conformance:stoppedlist', …)` in `build/verification-checks.mjs`; `package.json` gains
`"conformance:stoppedlist": "node build/conformance-stopped-list.mjs"`. CLAUDE.md's path-triggered table gains one row
(integrator): touching `src/main/manifest/store.ts`, the six repository files, `src/main/db/integrity.ts`'s classifier,
`src/main/harness/manifest-fault.ts`, `src/main/log/crash.ts`, the core's `listSessions` and D20's five functions, the
`app:relaunch` handler and the disposer's last branch → `conformance:stoppedlist`, about a second, spawns only the
pinned tsx, with what it proves in one sentence.

### 7.2 The path-triggered gates the changed files trigger (CLAUDE.md's table, read at this head)

| Changed | Gate |
| --- | --- |
| `src/main/pocket/routes.ts`, `facts.ts` | `conformance:pocket`, `conformance:pocket:hostile` (and `ablation:p313` if a `R`/`O` rule reads the composers the branch now precedes) |
| `src/shared/ipc/**`, a `GMUX_*` name | `gate:contract` (inside `npm run build`), regenerated on purpose (§6) |
| `src/main/sessions/core.ts` | **none of its rows by default**: `conformance:endtree` (`killSessionAdmitted`, `readEndTree`, `endAfterHangup`), `conformance:farattach` (`attachSessionAdmitted`, `attachFarUnbound`, `attachListedRemote`, `detachSession`, `beginShutdown`), `conformance:machines` (`addRemoteProjectAdmitted`), `conformance:remoteclose` (the remove path) and `conformance:samefolder` (`addProject`) name functions this phase does not edit. The integrator reads `git diff -U0 0547383e -- src/main/sessions/core.ts` hunk by hunk and runs each gate whose function a hunk touches |
| `src/main/manifest/store.ts`, `sessions-repository.ts` | none listed (`conformance:resume:capture` names `manifest/agents.ts` and `manifest/harvest/**`, not these); `conformance:stoppedlist` is the new row |
| `src/renderer/state/subscriptions.ts` | none listed |
| A script reaching `build/electron-run.mjs` | `gate:electron` (inside `npm run build`), the floor raised |
| `package.json`'s check scripts | `gate:checks` (inside `npm run build`) |

## 8. The app run: `probe:p357` (`build/p357/probe-p357.mjs`, builder `probe`)

`"probe:p357": "node build/harness-socket.mjs --fresh gmux-p357 'node build/p357/probe-p357.mjs'"`, classified as a
probe (not in the battery). One Electron at a time through `withElectron`, the PARENT first (`P357_PARENT_CHECKOUT`,
required: a built checkout, else exit 2), each launch naming its socket on its last leg so the helper's census reads his
session names around it. Scratch profile, `HOME`, `ZDOTDIR`, `HISTFILE=/dev/null`, `TMPDIR` under the harness folder;
every probed agent hidden and `agents:list` read back. The uncaught counter is `build/p357/counter.cjs`, M2's counter
committed, loaded with `NODE_OPTIONS=--require` into MAIN at both builds so one instrument counts both, its control
exception heard or the run is UNREADABLE. The phone is `build/p316/node-phone.mjs` through the Tailscale stand-in
(`build/p330/tailscale-standin.mjs`, preflighted by sha256, the process table sampled every second, a real Tailscale
failing the run) and the DNS stand-in in the probe's process (`build/p332/dns-standin.mjs`), paired as `probe:p349`
pairs (its launch composition `build/p349/probe-p349.mjs:1903-1932` and pairing sequence are the reference; copy the
shape, import the stand-ins). The world: `build/p3167/seed-sessions.mts --shape his` into the first profile, a scratch
project, three shells from the window.

| Arm | Build | What it drives | Graded on |
| --- | --- | --- | --- |
| PA | parent | §2.2 run 3's script: one sessions leaf damaged on disk after a checkpoint, a second connection's write, 60 s of ticks with a create, two renames from outside by `=name` and a pane ending; the phone's Needs input and Sessions reads | the counter (expect 2, his stack); the create's IPC answer and `list-sessions` of the scratch server (expect the spawned `p357-after`); the door's bytes (expect 404 and 404); the quit's exit and time; app.log's crash scope (expect none) |
| HA | HEAD | PA's script exactly | counter **0** (control heard); app.log: one `manifest.stopped` (operation, `SQLITE_CORRUPT`, `file: damaged`), one `notice.shown manifest-stopped`; `sessions:list` answers the ids it answered before the damage; the create refused with `MANIFEST_STOPPED_REFUSAL` and NO new tmux session; each rename landed in tmux and not in the list, no throw; the door: Needs input `emptyLine` = the phone line with no rows, Sessions 404, one session 404; the quit exits 0 (the file is damaged, so it closes, D11) within twice the parent's time; the relaunch's gate quarantines exactly as PA's did |
| HB | HEAD | a fresh profile, the same world, then the seam: `{ "seq": 1, "fail": { "operation": "listSessions", "code": "SQLITE_CORRUPT" } }` (its armed line read on stdout) | counter 0; one `manifest.stopped` with `file: fine`; one notice; the window's toast found in the DOM with the sentence and a `Restart` button; the create refused and nothing spawned; the door's words; then the toast's `Restart` CLICKED in the DOM: stdout `restart asked: a harness launch is not relaunched`, the quit's `[gmux] quit: … left open; ending the process without closing it` line, the app gone by signal, no `.ips` named Tortie or Electron newer than the press (names and times only), the run sentinel gone, the manifest's `-wal` still on disk with its size; then the probe's OWN relaunch on that profile: no quarantine, no `unclean-exit` notice, the gate's verdict ok, and every session row of a read-only COPY of the manifest taken after the first process ended equal to the same row of a copy taken just before the seam was armed on its identity columns (`id`, `name`, `tmux_name`, `project_path`, `cwd`, `agent`, `argv`, `created_at`), with `status` and `last_seen`, which an ordinary write may move between the copy and the latch, PRINTED and not graded (that nothing at all is written after the latch is the store test's, a spy counting zero `prepare` calls), and every such row's id listed by the relaunched app |
| HC | HEAD | the crash handler: the counter's control exception and a second identical one, and the control rejection | one `crash.uncaught` line for the two (name `Error`, code `P357_CONTROL`, frames, no message text), one `crash.rejection`, `crash.repeats` at quit with a count of 2 under one hashed key; no dialog (a harness launch) |
| RUN | both | the preflights, the hidden agents, the census, boots per pid during each quit (`tmux server` and `macOS login session` lines in app.log), every pid ended, the scratch server gone | all held, else UNREADABLE (exit 2) |

`--grader-self-test` grades recorded fixtures (`build/p357/fixtures/`) and starts nothing. `P357_ARMS` narrows the arms,
`P357_KEEP=1` keeps the run folder for the verifier's re-derivation. The probe never runs `app.relaunch()` and never
holds main's inspector across a quit (§0). `build/p357/CHECKLIST.md` (the operator's seat, plain language): on his own
Mac, after he installs the release, nothing to do unless the notice ever appears; then press Restart and check the
window comes back with his sessions.

## 9. Builders, disjoint files, and the seams

### 9.1 The table (every file in exactly one list; a builder that must edit a file not in its list stops and names it)

| Builder | Files it owns (and their tests) |
| --- | --- |
| `store` | `src/main/db/integrity.ts`, `src/main/manifest/store.ts`, `src/main/manifest/sessions-repository.ts`, `src/shared/manifest-stopped-copy.ts` (new), `src/shared/notice.ts`, `src/shared/types.ts`; tests `src/main/db/__tests__/p357-broken-connection.test.ts`, `src/main/manifest/__tests__/p357-store-latch.test.ts` (new) |
| `core` | `src/main/sessions/core.ts`, `src/main/pocket/facts.ts`, `src/main/pocket/routes.ts`, `src/main/capabilities.ts`, `src/renderer/state/subscriptions.ts`, `src/preload/index.ts`, `src/shared/ipc/app.ts`, `src/shared/ipc/index.ts`; tests `src/main/sessions/__tests__/p357-stopped-list.test.ts`, `src/main/pocket/__tests__/p357-door-words.test.ts`, `src/main/__tests__/p357-relaunch-and-quit.test.ts`, `src/renderer/state/__tests__/p357-notice.test.ts` (new); the existing tests that enumerate notice kinds or channels |
| `crash` | `src/main/log/crash.ts`, `src/main/index.ts`; test `src/main/log/__tests__/p357-crash-handlers.test.ts` (new) |
| `probe` | `src/main/harness/manifest-fault.ts` (new), `build/conformance-stopped-list.mjs` (new), `build/p357/**` (new: `probe-p357.mjs`, `counter.cjs`, `fixtures/`, `CHECKLIST.md`); test `src/main/harness/__tests__/p357-manifest-fault.test.ts` (new) |
| integrator | `CLAUDE.md`, `CHANGELOG.md`, `package.json`, `build/verification-checks.mjs`, `docs/audits/contract-baseline.txt`, `build/assert-electron-teardown.mjs` (the floor), and any file two builders both need |

### 9.2 The seams, stated exactly so the four build at once (in one worktree: write your shared piece first)

- `store` exports from `src/main/db/integrity.ts`: `isBrokenConnectionError`. From `src/main/manifest/store.ts`:
  `MANIFEST_OPERATIONS`, `ManifestOperation`, `isManifestStopped`, `manifestConnectionsLeftOpen`, `setManifestFaultHook`,
  and the member `ManifestStore.prototype.stoppedReading(): boolean`.
  From `src/shared/manifest-stopped-copy.ts`: the four §5 constants. In `src/shared/notice.ts`:
  `ManifestStoppedNotice`, the kind `'manifest-stopped'`. In `src/shared/types.ts`: `'MANIFEST_STOPPED'`.
- `core` exports from `src/main/sessions/core.ts`: `GmuxCore.prototype.manifestStopped(): boolean`. The bridge member
  `window.gmux.relaunch(): Promise<void>`.
- `crash` exports from `src/main/log/crash.ts`: `crashRecordOf`, `crashKeyOf`, `crashMessageOf`,
  `installCrashHandlers`, `flushCrashRepeats` (`core` calls the last from `capabilities.ts`).
- `probe` exports from `src/main/harness/manifest-fault.ts`: `installManifestFault(): void`, `manifestFaultPath(env,
  userDataDir): string | null`, `parseManifestFaultFile(text)` (`crash` adds the install call in `index.ts`).

### 9.3 The builders' briefs (the workflow hands each its own, with §0, §0.1 and §1.1)

- **`store`**: §4.1, §4.2, §4.5. The latch test uses M1's method over a REAL damaged scratch file (the kinds K1, K3, K6
  at least, each proving its bytes changed before asserting anything noticed): the first broken read latches once (one
  log record, one notice through a mocked `broadcastEvent`, `file: 'damaged'`), every member then refuses with
  `MANIFEST_STOPPED` before SQLite (a spy on `Database.prototype.prepare` counts zero calls after the latch), the three
  `quiet` members answer their fallbacks, `insertSession` latches through its catch, and `close()` closes. The
  memory-shaped case through `setManifestFaultHook`: `file: 'fine'`, `close()` closes nothing (the scratch `-wal` and
  `-shm` still on disk after close), `manifestConnectionsLeftOpen()` 1. A table test of the classifier over M1's codes,
  `SQLITE_IOERR_READ`, `SQLITE_BUSY`, a plain `Error` with code `SQLITE_CORRUPT` (not the class: false), and the
  typed refusal.
- **`core`**: §4.3. Tests: `listSessions` over a fake store that refuses answers the last clean list and does not throw,
  and rethrows anything else; `broadcastSessions` after the latch broadcasts that list; each D20 catch holds the refusal
  and rethrows another error; the door's five branches and that writes are unchanged; the relaunch handler's three
  branches with electron mocked; the disposer's last branch with `process.kill` stubbed; the renderer arm draws the
  sentence and its action calls `relaunch`.
- **`crash`**: §4.4. Tests over the pure exports: frames cut after the message, the 12-frame and 300-character caps, a
  `SqliteError`'s message clipped to 120, a `JSON.parse` error's message never present (its `messageChars` is), the home
  redacted, one log per key, the dialog once per key and never in a harness launch or for `MANIFEST_STOPPED`, the
  rejection's stderr line, the repeat counts.
- **`probe`**: §4.6, §7.1, §8. Its own `npm test` covers `manifestFaultPath` and `parseManifestFaultFile`; it runs the
  gate and the probe's `--grader-self-test`, and does NOT run the app (the verifiers do).

Every builder runs `npm run typecheck` and `npm test` (under the history block; name the four `/bin/ps` tests as they
fail) before it returns, and returns every file it changed with its line counts.

## 10. The proof, run rather than read (Tier 3)

### 10.1 Lens A: the behaviour (Method 1: measure the parent; Method 2: run over real damage)

The gates once (§11's list, reusing the integrator's PASS lines only as a start). Then `probe:p357` whole, parent
first, under a lock slot, `P357_KEEP=1`. Re-derive, by the verifier's own code: the counter files, the two manifest
copies compared column by column, the door's bytes, the boots per pid. Then the independent step: with
`/private/var/tmp/tortie-wt/scratch/p357/spec/m2/parent-run.mjs` copied and pointed at HEAD (its own counter, its own
damage of a DIFFERENT page, e.g. an overflow page of a seeded row or the header), HEAD must read 0 uncaught where the
parent read its number.

### 10.2 Lens B: the attack (Method 3)

Read §3 and try every entry point live at HEAD after a latch (seam and real damage): rename, End, Remove and Restore
from the window; a rename, an End, a start, a reply and keys from the phone; a pane ending; a tmux rename and a session
made outside the app on the scratch server; a window reload (the list must come back as the last clean list); sleep is
not drivable, so `takeManifestGenerationOnSuspend` is driven through its own deps in vitest; the quit three ways (⌘Q
through `window.gmux.quit()`, the last window closed, `updates:restartNow` with nothing staged); a second quit while the
first runs. For each: no `uncaughtException` reaches the counter, at most one log line per distinct error, no tmux
session made or ended by a refused verb. Then write a hostile seam file of its own (every malformed shape, a code not
in the set, an operation not in `MANIFEST_OPERATIONS`, a `seq` replayed) and prove each is dropped whole with its
reason. Then try to arm the seam in a launch without a harness term, and from a profile outside `GMUX_HARNESS_DIR`.

### 10.3 At the end, once

The Electron count with CLAUDE.md's command, outside the history block; every `p357` socket under
`/private/tmp/tmux-501/` gone; the history stats.

## 11. The integrator's commands (in order; each with its exit code and PASS line in the report)

1. `npm run typecheck`
2. `node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt`, then `node build/contract-inventory.mjs --check`; name the two moved sections (§6)
3. `npm test` (the full suite under the history block; the four `/bin/ps` native tests named as the expected failures)
4. `npm run build` (gate:electron at floor 181, gate:background, gate:checks, gate:contract and the rest inside it)
5. `npm run conformance:stoppedlist`
6. `npm run conformance:pocket` and `npm run conformance:pocket:hostile`; `npm run ablation:p313` if either reads a changed composer
7. The core.ts hunk check (§7.2) and each gate it names
8. `npm run smoke:t1`
9. `npm run smoke:fault` (it launches through `build/electron-run.mjs`; it kills the app at 16 points, the two quit points among them, and relaunches)
10. `node build/p357/probe-p357.mjs --grader-self-test`
11. The Electron count, the socket check, the history stats

`smoke`, `smoke:t3` and `smoke:quit` are NOT run: their npm scripts start `electron .` from `harness-socket.mjs`'s
shell line, not through `build/electron-run.mjs`, which this phase's rule forbids (Phase 352's D24). The main session
decides at landing (§13).

## 12. What is NOT in this phase

- Not the cause of the damage (Phase 358). No native module, Electron, gate, ring, recovery, schema, migration or pragma
  change.
- No `SQLITE_IOERR_*` latch (D2), and no latch for the other three databases.
- No automatic relaunch, and no relaunch in a harness launch. The person presses Restart.
- No new menu row, no new notice besides `manifest-stopped`, no phone change, no new phone route or field.
- No fix for the second boot during the quit (§13) and no fix for the parent's partial create (W2 is fixed only in the
  sense that the broadcast no longer throws).
- No release.

## 13. For the main session at landing

1. `smoke`, `smoke:t3` and `smoke:quit` were not run by any role (§11); `smoke:quit` exercises the quit this phase
   changes, so the main session runs it if it allows an Electron outside the helper.
2. Owed entries (found, not this phase's): (a) a second core boots during the quit after `shutdownGmuxCore()` empties
   the slot, measured at the parent with a damaged file (§0.1 item 8); (b) at the parent a create whose broadcast throws
   answers an error for a session it made and started (§2.2 run 3), which HEAD's D19 removes for the manifest but which
   any other throw after the spawn would repeat; (c) `contentFingerprint` answers a hash over a damaged table (§2.1), so
   the ring's change test cannot tell "changed" from "unreadable".
3. Cleanup after the follow-up commit: the worktree, `/private/var/tmp/tortie-wt/wt-p357-parent`, and
   `/private/var/tmp/tortie-wt/scratch/p357/` (64 MB after the spec step).
4. Phase 358 inherits §2.1 (K11: a vanished volume is a SIGBUS, not an error), §2.3 and §2.4.

## 14. Questions for him (the main session asks; the build proceeds on the defaults)

1. **The phone's other tab.** While the list is stopped, the phone's Sessions tab shows the Needs input list with the
   sentence (the fallback a Mac without that route gets). Default: that. The other choice is to keep showing the last
   list there, stale, with no sentence.
2. **When the file itself is damaged**, the quit closes the connection as today (D11). Default: close, because it is
   today's measured-clean quit. The other choice is "never close a stopped connection", which ends that quit with the
   hard exit too and skips Chromium's last flush of the window's own settings.
3. **The words** (§5). Default: the entry's sentence verbatim on the Mac.

## 15. The spec step's commands, exit codes and numbers

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `git clone --local --no-checkout /Users/gdc/gmux wt-p357-parent`, `checkout --detach 0547383e`, `cp -Rc` of `node_modules` and `build/vendor`, `specstory --version` | 0 | about 1 min | 2.10.0; the binary's own update check printed "Latest version: 2.16.1" (it reached its server; stated) |
| `npm run build` in the parent | 0 | 71 s | `contract-inventory: OK`; `conformance:harnessprobes` PASS over 688 files |
| M1 vitest (twice; the second verbose) | 0 | 28 s, 36 s | 12 of 14 cases ran; the worker died at K11 both times (SIGBUS, §2.1) |
| M2 run 1 | 0 | 219 s | discarded (§2.2) |
| M2 run 2 | 0 | 170 s | 0 uncaught; quit 2,783 ms |
| M2 run 3 (`--shape his`) | 0 | 172 s | 2 uncaught; quit 591 ms |
| M3 | 0 | 79 s | four exits, §2.3 |
| M4 | 0 | 92 s | three relaunches, §2.4; the three relaunched apps leaked (§0) and were ended by pid at the final count |
| The final count (`ps -Ao pid,ppid,rss,comm \| grep -E "[E]lectron\|Tortie$\|chrome_crashpad"`, outside the history block) | 0 | | after the M4 cleanup: none of this run's; his own Tortie (pid 67660) and other phases' launches (`p358`, `wt-p353`) untouched; no `p357` socket under `/private/tmp/tmux-501/` |

Lock slots: taken and released five times (`electron.lock`, once `electron.lock2`). History before and after every run:
`742243 1793907771` and `23166 1790702242`, unchanged. Disk: 39 GB free before the first build, 43 GB after.

## §As built (the integrator, 2026-11-05)

The four builders' files as they returned them, plus the integrator's. `git diff 0547383e` is this phase alone: 24
tracked files changed and 16 new, nothing staged, committed or stashed. Scratch, logs and the scripts below are under
`/private/var/tmp/tortie-wt/scratch/p357/integrator/`.

### What the integrator changed, and why

| File | Change | Where it comes from |
| --- | --- | --- |
| `src/main/errors.ts` | +3: `'MANIFEST_STOPPED'` in `KNOWN_ERROR_CODES`, before `'UNKNOWN'` | A seam. D7 appended the code to `GmuxErrorPayload['code']`, the list's `never` check then failed `npm run typecheck` at `errors.ts(73,7)`, and no builder owned the file (§9.1, read as "a file the builders' work needs"). The refusal carries no `.payload`, so `gmuxErrorPayloadOf` reads it exactly as before; no runtime classification moves |
| `src/main/sessions/__tests__/p125-core-split.test.ts` | +5/−1: `'manifestStopped'` appended to `PUBLIC_METHODS` | A seam. The core builder's new public read (D22) failed the test that pins the core's public surface |
| `package.json` | +2: `conformance:stoppedlist` and `probe:p357`, the strings of §7.1 and §8 exactly | §7.1, §8 |
| `build/verification-checks.mjs` | +34: `pure('conformance:stoppedlist')` beside `conformance:endtree`, `electron('probe:p357')` after `probe:p350`, each with its paragraph | §7.1, §8; `gate:checks` |
| `build/assert-electron-teardown.mjs` | +12/−1: `HELPER_USER_FLOOR` 180 → 181, with its paragraph | §6, obligation 1 |
| `docs/audits/contract-baseline.txt` | +4/−2, regenerated: `[ipc.invoke.channels] count=249` → `250` with `app:relaunch` between `app:quit` and `app:setLoginItem`; `[env.names] count=118` → `119` with `GMUX_HARNESS_MANIFEST_FAULT` between `GMUX_HARNESS_KEYCHAIN` and `GMUX_HARNESS_PUSH`. No other line moved | §6, obligation 3 |
| `CHANGELOG.md` | +6: a new `## Unreleased`, `### Fixed`, §5's item with no full stop (the house shape puts the commit link straight after the last word) and no link (the follow-up adds it) | §5 |
| `CLAUDE.md` | +2: one row in the path-triggered gates table (`conformance:stoppedlist`, after `conformance:farattach`) and one in the probes table (`probe:p357`, after `probe:p350`) | §7.1, the brief |

### Decisions the integrator made

1. **`smoke:t1` was not run.** §11 item 8 lists it, and the workflow's closing instruction says "Do NOT run smoke:t1,
   smoke, smoke:t3, smoke:remote or smoke:machines". The refusal wins; it joins §13 item 1 for the main session.
   (`smoke:t1` itself reaches the helper through `build/smoke-standalone.mjs` and makes a shell session only.)
2. **`smoke:fault` ran as its two halves.** Its `npm run build` is the build above, under the history block, on a tree
   nothing changed since; its `node build/fault-harness.mjs` launches Electron, so it ran outside the block, under lock
   slot `electron.lock3` (released by a trap), through `run-fault.sh`: scratch `HOME` and `ZDOTDIR`,
   `HISTFILE=/dev/null`, `TMPDIR` and `--root` in scratch, `TERM_SESSION_ID` and `TERM_PROGRAM` unset, and the
   checkout's vendored tmux first on `PATH`, so the harness's own `kill-server` speaks to the 3.7b server the app
   starts. Its sockets are `gmux-fault-<pid>-<n>` and it refuses `gmux`; it names no `tmuxSocket`, so no census ran.
3. **`ablation:p313` ran on the arms this phase can move, not on all 818.** The brief's condition held: `O1`, `O2*`,
   `O3`, `T2` and the `Z` rules read the composers the new `listStopped()` branches now precede. The whole table
   measured 20 arms in 373 s at a load near 35, about four hours in all, so it was stopped: its loop is synchronous
   and never hears SIGTERM, so pid 29283 got SIGKILL after its command line was read again, its one orphaned read-only
   gate finished on its own, and its clone was removed. Instead every arm whose file is one this phase changed in the
   pocket set (64 on `routes.ts`, 13 on `capabilities.ts`, 4 on `facts.ts`, 2 on `core.ts`: the 83 the core builder
   counted) plus the four the stopped run had read as "newly red nothing" (`L3`, `L4`, `L4b`, `R1`). 101 distinct
   arms ran in one form or the other; the other 717 aim at files this phase did not change.
4. **Five FSEvents tests fail inside the history block at the parent too**, measured here rather than taken from the
   crash builder's log: the parent's source in a scratch copy (with the worktree's `node_modules`, nothing of the
   parent's checkout linked) fails the same five of five that HEAD does.

### Commands, exit codes and numbers (every one but the two that launch Electron under the history block, with `HOME` in scratch)

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `df -h /` | 0 | | 42 GB free before the first build, 41 GB at it, 40 GB after |
| `npm run typecheck` | 0 | 6 s | import boundaries 0 violations (1,437 files, 8,212 imports); 0 runtime cycles (1,434 files, 5,020 edges); shared types OK |
| `node build/contract-inventory.mjs --out …`, then `--check` | 0, 0 | | the four lines of §6 and no other ("matches byte for byte") |
| `npm test` (before the build) | 1 | 81 s | 1,183 files; 22,333 tests: 22,310 passed, 9 failed, 14 skipped |
| `npm run build` | 0 | 62 s | `gate:electron` 181 reach the helper against a floor of 181 (576 files); `gate:background` 578 files, 3 long-lived starts each ended in a `finally`, 32 of 32 fixtures; `gate:simulator`, `gate:docker`, `gate:knownhosts` PASS; `gate:checks` PASS, 279 check scripts classified, 55 `tsxCli()` callers against 54; `conformance:ios` PASS, 55 rules; `gate:onlyadd` PASS; `conformance:harnessprobes` PASS, 6 clauses, 16 ablations, 689 files; `contract-inventory` OK |
| `npm test` (after the build, the battery's order) | 1 | 139 s | the same 22,310 passed, 9 failed, 14 skipped |
| the nine failures, both runs | | | the four `/bin/ps` tests, as expected inside the block (`ps.native` ×2, `process-table.native` ×1, `p269-env-names` "leaving no survivor", `spawnSync /bin/ps EPERM`); five FSEvents tests (`store-watch.native` ×1, `repo-watcher.native` ×4), which fail five of five at the parent under the block too (decision 4) |
| `npm run conformance:stoppedlist` | 0 | 2.7 s | ten rules over 1,434 files; 38 of 38 ablations red on exactly their own rules; the control green; S8 drove `manifestFaultPath` over 19 environment shapes, 3 source variants and the shipped export |
| `npm run conformance:pocket` | 0 | 26.2 s | 192 rules, 25,725 checks |
| `npm run conformance:pocket:hostile` | 0 | 20.1 s | 363 arms |
| `ablation:p313`, the whole table (stopped) | 137 | 373 s | base green; 20 arms, 16 red on their own rule, 4 with no rule named (`L3`, `L4`, `L4b`, `R1`) |
| `ablation:p313`, the 87 arms of decision 3 (`P313_ONLY`, `P313_SCRATCH` in scratch) | 1 | 2,085 s | base green; 73 red on their own rule, `L3`, `L4`, `L4b` and `R1` among them; 14 with no rule named, each gate's output cut off part way through its list of rules |
| `ablation:p313`, those 14 again | 1 | 298 s | base green; 13 red on their own rule (`R3b`, `R5`, `O2a`, `O2db`, `O2i`, `O2l` with `unit`, `R3h`, `Z11a`, `Z25b`, `NS7c`, `L5s`, `PS6e`, `Z32a`); `O3a` again with no rule named |
| `O3a` by hand (`o3a-probe.sh`): its exact plant, in a scratch clone at HEAD and at the parent, the gate's output to a FILE | 1, 1 | 15.0 s, 13.8 s | both `[p313 O3]` alone, "FAIL: 1 of 192 rules red", 91,383 bytes of output at both builds; the controls exit 0. **Every one of the 87 arms is red on its own rule** |
| the core.ts hunk check (§7.2) | | | the hunks touch the class fields, `manifestStopped` (new), `applyDetectedStatus`, `wireControlEvents` (the `server-exit` chain), `handleExternalRename`, `handleUnexpectedAttachExit`, `reapDeadSession`, `listSessions` and `listProjects`; no hunk is inside a function §7.2 names, but each of the five gates reads a touched name (`endtree` `reapDeadSession`; `farattach` `handleUnexpectedAttachExit` and `listSessions`; `machines` and `samefolder` `listProjects`), so all five ran |
| `npm run conformance:endtree` | 0 | 4.4 s | 16 rules, 84 self-tests |
| `npm run conformance:farattach` | 0 | 0.45 s | 11 rules |
| `npm run conformance:remoteclose` | 0 | 3.4 s | 11 tests |
| `npm run conformance:samefolder` | 0 | 12.7 s | both kinds of volume, 9 of 9 ablations |
| `npm run conformance:machines` | 0 | 45.6 s | PASS |
| `npm run conformance:credentials` (CLAUDE.md: `capabilities.ts`' ordered disposer) | 0 | 87.3 s | OK, 22 of 22 scanner fixtures, 9 vendor call sites |
| `npm run conformance:manager` (CLAUDE.md: the `sessions` member of `routes.ts`) | 0 | 3.2 s | 64 rules, 2,832 checks |
| `npm run conformance:handback` (CLAUDE.md: `src/shared/ipc/app.ts`; `MenuActionId` untouched) | 0 | 1.2 s | PASS |
| `smoke:fault` (decision 2) | 0 | 108 s | "PASS — 20 cases, every invariant held": clean, 16 named points (`quit.before-snapshots` among them) and 3 random moments, every work launch SIGKILLed but the control, every survey exit 0. It left 8 tmux processes on its own scratch sockets (finding 4) |
| the fault battery's four backup points, twice at each build, alternated (`run-fault-backup.sh`, then `run-fault-diag.sh` with `--keep` and `GMUX_LOG_FILE=1`), each pair under one lock slot | 0 ×4 | 25, 15, 19, 22 s | "PASS — 5 cases" all four times; left behind, cases of 4: HEAD 2 then parent 0, then parent 2 then HEAD 1 (finding 4); survey launches 0.6 to 1.1 s at both builds in the second pair (the first pair's HEAD surveys of 1.0 to 2.6 s were load); every kept scratch `app.log` at both builds holds no `crash` scope, no `manifest.stopped` and no error line |
| `node build/p357/probe-p357.mjs --grader-self-test` | 0 | 0.13 s | 5 graders, 40 clauses, each shown red alone |
| `smoke:t1`, `smoke`, `smoke:t3`, `smoke:quit` | not run | | decision 1 and §11 |

His shell history read `742243 1793907771` and `23166 1790702242` before and after every run, unmoved. Lock slots
were taken three times (`electron.lock3` for the battery at the first try, `electron.lock2` for each backup pair after
10 and 6 failed tries a minute apart while Phases 353 and 358 held all three) and released each time by a trap. The
Electron count at the end, once, outside the block, found none of this phase's: his own Tortie (pid 67660), Phase 353's
and Phase 358's apps (the bare `Tortie` pid 80788 is a child of `wt-p353`'s shim) and other applications' crash
handlers. No `p357` or `gmux-fault` socket is left under `/private/tmp/tmux-501/` and no `gmux-fault` tmux process is
running.

### Found here, not this phase's

1. **`ablation:p313` can read a red rule as "nothing" under load, and it is the gate's own exit, not the arm.**
   `build/conformance-pocket.mjs` writes its whole verdict to stdout, 91,383 bytes when one rule is red, and then calls
   `process.exit(1)`. On macOS a pipe write is asynchronous in Node, so when the harness's `spawnSync` pipe is not
   drained fast enough the writes still queued are dropped, and those are the last ones: the `[p313 <rule>]` lines and
   the summary. Measured above: 14 of 87 arms at a load near 40, 1 of 14 at a load near 27, and none of them when the
   same gate wrote to a file, at HEAD and at the parent alike. It is older than this phase (the same bytes at the
   parent); the cure is the gate's (`process.exitCode` and a return) or the harness's (a file for stdout). Owed an entry.
2. **The history block's profile covers `~/.zsh_history` and `~/.bash_history` only.** An interactive zsh started with
   `TERM_SESSION_ID` set also writes `$HOME/.zsh_sessions/<id>.history`; every run here had a scratch `HOME`, and the
   scratch copy is where those files landed (`home/.zsh_sessions/`). Stated for the next brief, not acted on.
3. **`GmuxCore.listSessions` hands its caller the very array it keeps as `lastCleanList`** (a clean compose returns
   the stored array; only the stopped path answers a copy). A caller that sorted or spliced its answer in place would
   change what a stopped list answers later. Every production reader under `src/main` was read: each sorts or slices
   only a `.filter`, a spread or a `.slice` (`routes.ts`, `tray/attention.ts`, the facts, the writes), so nothing does
   today. Not changed (the core builder's file); for the verifiers to attack.
4. **The fault battery leaves its killed work launch's tmux server and control client running on some backup points,
   at the parent too.** The full battery at HEAD left all four backup cases' pairs (8 processes, sockets
   `gmux-fault-47502-13` to `-16`); two alternated readings of those four points left 2 of 4 at HEAD and 0 at the
   parent, then 2 of 4 at the parent and 1 at HEAD. Each leftover pair is the work launch's own: the server
   (`start-server`, ppid 1) and its first control client (`-C new-session -A -s gmux-control`, ppid 1, started in the
   same second), whose standard input, output and error all read `unix ->(none)` in `lsof`, so the app's end of them is
   closed; the harness's `killServer` had already unlinked the socket (`list-clients` answers "No such file or
   directory"), and the server ignored SIGTERM until its control client was ended. Every one was ended here by pid after
   its command line was read again, the client first. Not this phase's (the same at `0547383e`); the harness reports
   PASS over it, and `gate:background` cannot see it because the processes belong to the app's tree, not the script's.
   Owed an entry.

### Fix round (2026-11-05)

The phase's one fix round. Both lenses had approved; the main session then found F1 in the attack lens's own evidence.
The fixer changed nine of the phase's files (this one included) and added one, and launched no Electron: the reverify
runs the app. Scratch, logs, the
pre-fix copy and the parent copy are under `/private/var/tmp/tortie-wt/scratch/p357/fix-round/`.

#### What changed

| Problem | File | Change |
| --- | --- | --- |
| F1 | `src/main/manifest/store.ts` | A stopped store's `contentFingerprint` answers the fingerprint it last answered, or `STOPPED_FINGERPRINT` (`'stopped'`, exported) when it never answered one. It never answers null. The fallback is `this.lastFingerprint ?? STOPPED_FINGERPRINT`, the work is `() => (this.lastFingerprint = fingerprintOrNull(this.db))`, and that private field is written by the work alone. A store that has not stopped answers what it answered before. This replaces D4's `null` for this one member; `schemaState`, `describeSchema` and every refusal of §4.2 are unchanged |
| F1 | `build/conformance-stopped-list.mjs` | S1 gains a clause: the fallback is `this.<field> ?? <a const holding one string>`, the work is that exact assignment, and the field is private and written once. Four ablations, each red on S1 alone: the fallback answering `null` again; the fallback answering only the remembered value, which is null before the first; the work no longer remembering; the field cleared in `latch` |
| F1 | `src/main/manifest/__tests__/p357-store-latch.test.ts` | Its four pins of the null fallback now pin the new answer: `STOPPED_FINGERPRINT` when nothing was answered before the stop, the last answer otherwise. One new case answers twice, writes, stops through the seam, and reads the LAST answer back with zero SQLite calls |
| F1 | `src/main/pocket/__tests__/p357-door-words.test.ts` | Its one pin of the null fallback reads `STOPPED_FINGERPRINT` |
| F1 | `src/main/manifest/__tests__/p357-ring-after-latch.test.ts` (new) | The measurement below, seven cases. `P357_RING_READINGS=<file>` writes its readings there; unset, it writes nothing |
| F2 | `build/p357/probe-p357.mjs` | `isQuietStoppedRejection`, and two fields in `readAppLog`: `crashStopped` (printed) and `crashUnexpected` (graded). HA's crash clause is one shared `CRASH_CLAUSE`: "app.log holds no crash record but the counter's own controls and the stopped list's own refusals as rejections with no message text, and no control message text". A `crash.rejection` with code `MANIFEST_STOPPED`, no `message` field and none of the words `session list stopped reading` is expected. Any uncaught record, a `MANIFEST_STOPPED` one included, any rejection with another code or none, and a stopped refusal carrying text still fail it. `crashOther` is kept and printed |
| F2 | `build/p357/fixtures/graders.json` | The five mentions of the old clause renamed. The honest HA and HB readings carry the two fields. The planted record sets `crashUnexpected`. The D18 fixture, an UNCAUGHT refusal, still fails, and its name says so. Eight raw fixtures added, six for HA and two for HB, through the run's own readers. Readings 109 → 117 |
| F3 | `src/main/sessions/core.ts` | `listSessions` keeps `[...list]`, so the clean answer and the kept list are never the same array. `listProjects` had the same line and keeps `[...projects]` |
| F3 | `src/main/sessions/__tests__/p357-stopped-list.test.ts` | Two cases. A caller sorts, splices and pushes into its clean session list, or reverses and splices its project list, before the stop. The stopped answer is the list as composed |

Two choices go past the letter of the brief:

1. **HB's crash clause is narrowed too.** It is the same clause word for word, over the same `--shape his` seed, and
   the same rescue watches run in its launch. It passed in the attack lens's run because its stop came after the
   watches' 20 s timeout had settled (`DEAD_ROW_RESCUE_TIMEOUT_MS`, `src/main/sessions/id-harvest.ts:76`), which is
   timing, not design. Two HB raw fixtures cover it.
2. **`listProjects` gets the same line as `listSessions`.** It had the same aliasing.

#### Why it answers the last fingerprint, not one fixed text

One fixed text for every stopped store would let the ring take one generation after the stop. With five slots full,
that take moves the oldest generation from before the stop out, and the brief asks that every one stays. The last
answer is the fingerprint the ring's last successful take recorded (`ring-schedule.ts:471`), so its own equality test
(`:413`) reads "unchanged" from the first poll after the stop, and nothing is taken.

Two cases remain where one take follows a stop. The test names each and holds it to one:

- **The take just before the stop failed.** The last answer is then one no generation holds, so the ring takes it once
  (the content the failed take missed) and never again. With five slots full, the oldest moves out.
- **The store stopped before its run's first take.** The launch take is the one take. It answers
  `STOPPED_FINGERPRINT`, and nothing follows.

The parent takes one in both. Only the ring knows what it last recorded, so closing them is a ring change, which this
round leaves out.

**A difference a person can see, stated.** After a stop over a damaged file, HEAD no longer tries a copy every five
minutes. So it no longer logs `manifest generation (…) failed` each time, and it never posts `backup-failing`. The
stop's own notice is the one the person sees. The parent and the pre-fix build each tried and failed 14 times in the
hour, below.

#### The proof, run

**1. F1, measured.** The SHIPPING `ManifestStore`, `ManifestRingSchedule` and take (`ringFromRecovery` over
`captureManifestBackup`, into a scratch ring folder) on a fake clock. The world is 120 sessions and one project. The
launch take and five more each follow a real change, so the five slots hold generations 2 to 6. An hour of polls with
nothing changed takes nothing (the control). Three writes the ring has not seen. Then the stop, then an hour of the
real cadence (60 polls a minute apart), the sleep's ring test and the quit's, through `takeManifestGenerationOnSuspend`
and `takeManifestGenerationOnQuit` (`src/main/sessions/quit-generation.ts`), the functions the core calls. Real damage is
M1's method: a second connection checkpoints (`wal_checkpoint(TRUNCATE)`, busy 0), the bytes are written over and
proved changed, then that connection writes (`UPDATE projects`, one change) so the store's own connection reads the
file again. No connection can write past K6's header, so there the store's connection reads again by M1's other trigger,
`PRAGMA shrink_memory`. The pre-fix copy is `cp -Rc` of this worktree's `src` taken before any edit, run with the same
committed test file. The parent copy is `cp -Rc` of `wt-p357-parent/src`, run with a variant that drops what the parent
lacks (the latch, the seam, `STOPPED_FINGERPRINT`) and keeps the world, the damage and the polls.

| Stop | Build | Takes tried after it | Generations taken | Of the 5 from before, kept |
| --- | --- | --- | --- | --- |
| K1, every sessions leaf, met by the list | HEAD | 0 | 0 | 5 |
| | pre-fix | 14, all failed | 0 | 5 |
| | parent | 14, all failed: `database disk image is malformed` | 0 | 5 |
| K8, the primary key index, met by `getSession` | HEAD | 0 | 0 | 5 |
| | pre-fix | 14, all failed | 0 | 5 |
| | parent | 14, all failed | 0 | 5 |
| K6, the header, met by the ring's own change test | HEAD | 0 | 0 | 5 |
| | pre-fix | 14, all failed | 0 | 5 |
| | parent | 15, all failed: `file is not a database` | 0 | 5 |
| The seam, the file fine (the attack lens's case) | HEAD | 0 | 0 | 5 |
| | pre-fix | 14 | **14** (generations 7 to 20) | **0** |
| | parent | no seam: simulated by a connection whose reads of the sessions table throw SQLite's own error, which is not real damage | 1 | 4 |
| Named: the take before the stop failed | HEAD | 1 | 1 (generation 7) | 4 |
| | pre-fix | 14 | 14 | 0 |
| Named: stopped before the run's first take | HEAD | the launch take, then 0 | 1, the launch's | 4 |

"Kept" means the generation is still recorded and its body file (`manifest.db.000002` to `manifest.db.000006`) has the
same sha256 after the quit's ring test as before the stop; every case's names and hashes are in
`fix-round/logs/ring-head-final.json`, `ring-prefix.json` and `ring-parent.json`. The seam case at HEAD, by sha256
prefix: `000006 99f354ec325747d0`, `000005 9d282d1b3e7a29a7`, `000004 00d37a7bd02ac2e8`, `000003 0320223e0c70c145`,
`000002 e1476a2158b2f493`, each equal before and after. The pre-fix seam case's last five generations (16 to 20) are one
body, sha256 `9320dc9c98da…`, five copies of a file nothing could change. HEAD asked the change test 62 times in each
of its four stops, and every answer was "unchanged", read from memory with no SQLite; the parent asked 14 or 15
times, because each failed take restarts its five minute floor. **HEAD took no more than the parent in every stop
measured at both.**

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `npx vitest run src/main/manifest/__tests__/p357-ring-after-latch.test.ts` at HEAD | 0 | 7.2 s | 7 of 7 |
| the same file over the pre-fix copy (`node node_modules/vitest/vitest.mjs run --config fix-round/prefix/vitest.config.mjs`) | 1 | 7.6 s | 6 of 7 failed, the control passed: the test catches the defect |
| the parent variant over the parent copy (the same config, `P357F_ROOT` the copy) | 0 | | 4 of 4 |

**2. F2.** `node build/p357/probe-p357.mjs --grader-self-test`: exit 0, "7 graders, 43 clauses each shown red alone, 21
needs each shown unreadable alone, 122 fields that answer UNREADABLE when missing, 45 raw fixtures through the run's own
readers" (37 raw before). The new HA readings: two `MANIFEST_STOPPED` rejections in the shape HA's live run logged pass;
beside them, a rejection of another code, one with no code, and the same refusal uncaught each fail; a stopped refusal
with a `message` field (its payload's first 40 characters, short of the sentence) fails; one with the refusal's words
in its frames fails. HB: one pass, one fail. Re-derived by the fixer's own copy of the predicate over the attack lens's
live records (`out/p357/probe-p357.json`): HA's old count 2, its new count 0; HB 0 and 0.

**3. F3.** The two cases pass at HEAD. Over the pre-fix copy both fail: `expected [ 's2', 's1', 's2' ] to deeply equal
[ 's1', 's2', 's3' ]` and `expected [ '/a' ] to deeply equal [ '/a', '/b' ]`, 17 of 19 passing.

**4. The battery, in order, each under the history block with `HOME` and `TMPDIR` in scratch.**

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `npm run typecheck` | 0 | 6 s | import boundaries 0 violations (1,437 files, 8,212 imports); 0 runtime cycles (1,434 files, 5,020 edges); shared types OK |
| `npx vitest run` over the seven other p357 test files and `src/main/manifest/__tests__` (ring-schedule's own tests, the store latch's and the new ring test among them) | 1 | 20 s | 42 files, 652 tests: 651 passed. The one failure is `process-table.native.test.ts`, "sees this process under its true parent": `/bin/ps` does not start under the history block (§0), so it read 0 rows |
| `node node_modules/vitest/vitest.mjs run src/main/sessions/__tests__ src/main/pocket/__tests__/p357-door-words.test.ts` (beyond the brief: `core.ts` moved) | 0 | 5 s | 49 files, 885 passed |
| `npm run conformance:stoppedlist` | 0 | 0.86 s | ten rules over 1,434 files; 51 of 51 ablations (47 before) red on exactly their own rules; the control green; S8 drove 19 environment shapes, 3 source variants and the shipped export |
| `node build/conformance-stopped-list.mjs --root fix-round/prefix` (the pre-fix copy) | 1 | | S1 red at its base on exactly the new finding, the fallback `null`. S8 is red there too, because the copy has no tsconfig for the pinned tsx to drive the seam with: the copy's, not a finding |
| `npm run build` | 0 | 45 s | `contract-inventory: OK, the inventory matches docs/audits/contract-baseline.txt byte for byte`; gate:electron 181 against a floor of 181; gate:background 579 files, 32 of 32 fixtures; gate:checks 280 scripts, 1,184 test files; conformance:ios 55 rules; gate:onlyadd PASS; conformance:harnessprobes 6 clauses, 16 ablations |

His shell history read `742957 1793929704` and `23166 1790702242` before the first command; the closing reading is in
the fix round's report. No contract line moved. No tmux server, socket or Electron was started by this round.

#### What this round did not do

- **No app run.** `probe:p357` was not run live; the reverify runs it. HA's narrowed clause is proved over fixtures and
  over the attack lens's recorded records, not over a fresh launch.
- **The two named one-take cases stay**, held to one, as above.
- **Nothing else from research 143 or Phase 357.1**: no close skipped at every quit, no latch on a table the digest reads
  as unreadable. The ring, the recovery and the boot wiring are unchanged.
- **The earlier sections are not rewritten.** §3 T11 and §4.2 still describe the first build's `null`, and at landing
  §1.1 D4 and §7.1 S1 gained a pointer here; this section replaces all four for `contentFingerprint` alone.
- **CLAUDE.md's `conformance:stoppedlist` row does not name the new clause.** The main session may add it at landing.
