# Phase 372 — "OK lets do each" — one Explorer refresh writes the tree once — SPEC

Written by the spec step on 2026-11-25 in `/private/var/tmp/tortie-wt/wt-p372`, a detached worktree at origin/main
`a28c2cf3` ("docs(backlog): 371 landed"; its code carries Phases 370, 371 and 374, so the parent is the tree AFTER the
ignore store's one call in flight and AFTER History's reads were moved off a saved file).
**`git diff a28c2cf3` in the worktree must be exactly Phase 372's delta**, this file included. origin/main may move while
the phase runs; nobody here rebases, pulls or merges; the main session moves the tree at landing. The charter is
`docs/BACKLOG.md` "## Phase 372" (`:45545`), bound as written except where §0.1 says the tree or a measurement wins. The
rules it keeps are Phase 155's (Refresh and a repository change re-read every cached folder, forced, and a forced read
is never answered by one that began before it was asked), Phase 343's D4 (a link main did not answer for in time keeps
its last kind), Phase 343's RULE 6 and Phase 47.1's (the ignore set is never emptied by a refresh), Phase 90.3's (a
machine's tree is one call) and Phase 370's (the ignore store is handed each listing, holds one call in flight and lands
the newest listing). His standing rulings bind: **no regression against today** (a scenario worse than the parent is a
defect: fix it or drop the part, and name which); Tortie never ends a session on its own; just enough words; no tmux
vocabulary in anything a person reads; nothing released, tagged, version-bumped, archived or uploaded; refusal 1; his
session count is allowed (`build/electron-run.mjs`'s read-only census around a launch that names `tmuxSocket`).

| | |
| --- | --- |
| Subject | `perf(tree): write one refresh to the tree once` (the entry's) |
| First body line | `Phase 372: a refresh of many open folders redraws the Explorer once` (the entry's) |
| Semver | Patch. One CHANGELOG item under `## Unreleased`, `### Fixed` (§5), ONLY IF the app run (§8) reads the gate of §1 D11 at both builds; the parent's numbers (§2) say a person notices it at 500 open folders (a fifth to half a second of the window's thread on every change, and a new file drawn up to about 0.2 s past the watcher's own delay). If the gate drops a part, the item says only what is left; if nothing is left there is no item. No release |
| Lane | Build: Spec → Build (TWO builders, disjoint files) → Integrate → Verify (one lens, Tier 2) → [Fix once → Reverify] → Commit |
| Tier | **2**: a rendered surface with no new state that starts nothing (CLAUDE.md, "Is it a rendered surface with no new state?"). The parent measurement is mandatory because the phase exists for a number (done, §2). The gates, ONE app run per build that drives every claim (`probe:p372`, §8, the parent and HEAD alternated in blocks), and one independent method: the seeded-interleaving oracle (§7.2), written by the builder who does NOT write the store, and the verifier's own re-derivation of the counts from the probe's raw readings |
| The cure | **A listing equal to the one held writes nothing; the listings one refresh asked for are written by one `set` when the last of them answers, or when the stream of answers has gone quiet for a few milliseconds, whichever is first; a listing never replaces one read after it; a forgotten folder is never brought back** (D1 to D8). Measured at the parent at 500 open folders: 502 store writes, 502 model passes and 502 ignore-store calls on EVERY change, even one that changes no listing; 170 to 183 ms of script on the window's thread when nothing changed, 143 to 198 ms when one file was added and 372 to 374 ms for a branch switch (medians of three launches; the whole thread, idle included, 206 to 504 ms); and the writes of one refresh spread over 0.41 to 0.79 s although its 502 reads all answer within 11 to 19 ms (§2) |
| Menus | **No row added, renamed or removed.** Nothing a person presses moves |
| Contract | **Does not move.** No invoke channel, type, `GMUX_*` name, schema, smoke mode, `gmux.*` key or notice kind; `fs:readDir` keeps its request and its answer. `gate:contract` must read byte for byte, and a diff there is a finding |
| `HELPER_USER_FLOOR` | **195 → 196**: `build/p372/probe-p372.mjs` reaches `build/electron-run.mjs` (obligation 1; `build/assert-electron-teardown.mjs:721`) |
| CHANGELOG | One item (§5) when §1 D11 holds; the commit link is added by the follow-up docs commit |

## 0. The hard rules, stated once (every builder, the integrator, every verifier, the fixer, the reverifier)

- NEVER commit, stage or stash in `wt-p372`, `wt-p372-parent` or any checkout of his (scratch repositories a probe
  makes are its own). `/Users/gdc/gmux` is read only. `wt-docs` is the main session's: never touch it. No other phase
  runs now. Scratch lives under `/private/var/tmp/tortie-wt/scratch/p372/<role>/`, never under `/private/tmp`; a probe's
  `TMPDIR` points there too.
- **The parent** is `/private/var/tmp/tortie-wt/wt-p372-parent`, a second detached worktree at `a28c2cf3`, built once by
  the main session (`/private/var/tmp/tortie-wt/scratch/p372/main/parent-build.log` ends `exit 0`; it did on
  2026-11-25). Nobody edits or installs anything in it.
- **His machine is busy with his own work, and timings are the point of this phase.** Read every timing against the
  parent in the same session, ALTERNATED (parent, HEAD, parent, HEAD), and say the load beside each. Before a timed cell
  read `sysctl -n vm.loadavg`: above 40, wait 2 minutes and read again (up to 20 minutes, then run it and say the load).
  During the spec step the 1 minute load went from 17 to 113 and back while nothing of ours ran but an idle app (the
  top consumers were his and the system's: `mediaanalysisd`, `mds` and six `mdworker_shared`, a `claude`, a
  `next-server`); the driver waited 14 minutes for it. `memory_pressure | grep percentage` under 20 percent free with
  swap growing means start nothing and report (it read 48 to 50 throughout).
- **Git.** Every repository a probe opens is a scratch repository it made; every git has `HOME` in scratch,
  `GIT_CONFIG_GLOBAL=/dev/null` and `GIT_CONFIG_NOSYSTEM=1`; the app's git is `/usr/bin/git` through the closed PATH a
  probe sets (`/usr/bin:/bin:/usr/sbin:/sbin`, written into the scratch HOME's `.profile`, `.zprofile`, `.zshenv`,
  `.zshrc` and `.bash_profile`, because main replaces its PATH with what its login shell answers). No network remote.
- `-L gmux` is named only by `build/electron-run.mjs`'s census, and only with `list-sessions`. Never `pkill`, `killall`,
  a `pgrep` pattern or a negative pid; end only pids you started, each read again by `ps -p <pid> -o command=` right
  before its signal; every writer and app you start ends in a `finally`, and the count of your leftovers at the end is
  0. Do not stop processes you did not start: his Tortie (a bare `Tortie` process, pid 50568 on 2026-11-25; read it
  again yourself), his tmux server, his other Claude sessions and his own tools above all. **His Tortie has the same
  bundle id as a packaged build**: never an Apple Event, `osascript` or `open` of an app; a quit is pressed through
  the harness. Never signal a probe while its own teardown runs.
- Never open, copy, read or stat-for-content his live Tortie profile, his keychain, credentials, `~/.ssh`, `~/Keys`,
  `~/.claude`, `~/.codex` or any agent's or conversation store; never open a crash report under
  `~/Library/Logs/DiagnosticReports`.
- **His shell history is never written by us.** Every command that does not launch an Electron or need `/bin/ps` runs
  under the history block: `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb <command>`, or
  `zsh /private/var/tmp/tortie-ops/sb.sh <dir> "<command>"`. The four `/bin/ps` native tests cannot pass inside it
  (`process-table.native` ×1, `ps.native` ×2, `p269-env-names` ×1): name each as it fails. What needs `/bin/ps`, `lsof`
  or Electron runs OUTSIDE it with `HOME` and `ZDOTDIR` in your scratch, `HISTFILE=/dev/null`, `SHELL=/bin/sh`,
  `TERM_SESSION_ID` and `TERM_PROGRAM` unset, and you say so. NEVER run Electron, a smoke or a probe under
  `sandbox-exec`. Record only `stat -f '%z %m' ~/.zsh_history ~/.bash_history` before and after every run (the spec
  step read `751928 1795563175` and `23166 1790702242` at its start and after every one of its runs). A move across an
  unblocked run: start nothing for 3 minutes and stat again; moved again while nothing of yours ran is his; still moved
  means STOP and report.
- **No real agent runs, not even for a version.** This phase needs no agent and no session: a probe hides every probed
  registry row (`writeHiddenAgents(profile, 'p372', hiddenAgentsBesides([]))`) and reads `agents:list` back
  (`standInsOnlyVerdict(list, { standIns: [] })`); the spec step's driver did both, and the scan resolved nothing.
  `conformance:resume:capture` and `conformance:resume` start real agents and are NOT run.
- `smoke`, `smoke:t1` and `smoke:t3` start Electron outside the helper: ONLY the main session runs them. No packaging
  in this phase's agents. Every other Electron goes through `build/electron-run.mjs` inside `build/harness-socket.mjs`
  with a scratch profile, `HOME` and socket. No Simulator, no network (no Tailscale, DNS or APNs, no ssh, never
  `smoke:remote` or `smoke:machines`, never `gh`). Never import a `build/` script to inspect it; read it as text (a
  probe imports the helpers it USES, as every probe does).
- The lock has three slots: `zsh /private/var/tmp/tortie-ops/lock.sh try p372-<role>` prints the slot or exits 1 (retry
  every 60 s in a NEW command); release with `zsh /private/var/tmp/tortie-ops/lock.sh release <slot>` in a trap or a
  `finally`. Every probe or Electron run holds one, no longer than the run. `df -h /` before any build or clone; under
  8 GB free, wait and report (15 GiB free at the spec step: watch it).
- **No dependency moves.** Never `npm install` or `npm ci`. `node_modules` and `build/vendor` are clones of his
  checkout's: Electron 45.3.4, node 22.23.1 at `/Users/gdc/.nvm/versions/node/v22.23.1/bin`.
- **The spec step's instruments are kept for you: read them, do not import them.** Under
  `/private/var/tmp/tortie-wt/scratch/p372/spec/`: `driver.mjs` (one launch of one build: the matrix, the counters, the
  raw read span and the held folder, §2.1), `run.sh` (a lock slot, a clean environment, `harness-socket.mjs`),
  `bench/eq.mjs` (the equality rule's cost, §2.4), and `out/<label>.json` and `.log` for every launch of §2.

## 0.1 What the entry and the parent reading give, measured (the tree and the measurements win; each binds)

Read at `a28c2cf3`, and run at it where it can be run; §2 holds the numbers.

1. **Every line the entry cites is where it says.** `refreshLoaded` is `src/renderer/tree/store.ts:559-611`, `readInto`
   `:258-285` (its one `set` a folder `:262-271`), `use-tree-model.ts:371-374` the tree input. The entry's charter
   figures are `build/p370/SPEC.md` §2.3 (502 store writes a change at 500 folders; the page's thread 215 to 227 ms a
   change before Phase 370) and §B6 (138 and 136 ms at `67be1895` against 198 and 195 at its parent). Those were read
   with p370's method, a 10 ms timer's lateness per change under a writer every 200 ms (2.5 changes a second, each
   overlapping the last); §2's are read with changes 3.5 to 4.5 s apart, one at a time, so the two are not one series.
   On p370's own measure (`blocked`) the parent here reads 163 to 179 ms a change at 500 folders for nothing changed or
   one file added: Phase 371's landing did not move this cost, and could not, because a saved file no longer starts
   History's reads but every one of the 502 listings still renders.
2. **Every change writes every cached folder, changed or not (measured).** "Nothing changed" (a line appended to a
   tracked file, which the watcher reports and which changes no listing) reads 12, 102 and 502 `fs:readDir` calls, 12,
   102 and 502 new `entriesByDir` objects, 12, 102 and 502 tree-input passes (`treeInputOf`), 12, 102 and 502 model
   passes (the listing diff effect) and 12 to 13, 102 to 103 and 502 to 503 ignore-store `sync` calls a change, for 10,
   100 and 500 open folders (the root and `w/` beside them). React does not fold them: 14 to 16, 104 to 106 and 504 to
   506 renders of the tree's model hook a change.
3. **The thread, not the disk, decides when the last folder lands (the entry does not say this).** At 500 folders the
   502 reads are all STARTED within 12 to 60 ms of the first and, read alone from the page with nothing rendering, all
   ANSWERED within 11 to 19 ms; but the parent's writes land over 412 to 652 ms (nothing changed, one file added) and
   637 to 760 ms (a branch switch), because each answer renders before the next one is taken. So a new file in the
   folder read LAST is drawn about 150 ms after one in the folder read first (680 against 530 ms, §2.3). The order is
   the cache's key order, which is the order the folders' first answers landed in when the tree restored them.
4. **Two more writes the entry does not name.** `refreshLoaded` writes `rootError: null` on every refresh
   (`store.ts:600`), which changes nothing any reader selects but runs every subscriber of the store; and a failed child
   read writes a new `entriesByDir` even when that folder was not in it (`:278-282`).
5. **The mount is not a refresh.** Showing a project restores up to 500 remembered folders (`use-tree-model.ts:730-735`
   and `:886-889`), one `loadDir` and one write each. The entry's item 2 is about one REFRESH; the restore keeps its
   writes (§12; §14 Q2).
6. **A gate reads the store's text.** `ablation:p343` arm `a-st5` (`build/p343/ablation.mjs:624-629`) anchors on
   `readInto`'s carry line, `            carryLinkTargets(result.entries, s.entriesByDir[dirPath])`, and arms `a-st1` to
   `a-st4` and `a-st6` on the remote half and on `sortEntries`. The store builder keeps every one of those other lines
   byte for byte; the integrator re-anchors `a-st5` to the carry's new line (D12) and runs the six.
7. **Two Refresh buttons.** The Explorer header's own (`src/renderer/app/Sidebar.tsx:276`) calls `refreshLoaded()`
   alone; `FilesSection`'s `refresh` (`src/renderer/tree/FilesSection.tsx:384-398`) calls it and then the model's
   `reconcile`. Neither changes here; both must keep re-reading (D7).
8. **Who reads `entriesByDir`, and which fields.** `useTreeModel` (`use-tree-model.ts:329`, `:372`, `:813`) through
   `treeInputOf` (`tree-paths.ts:487-511`: every key at or under the root, each entry's `path`, `kind` and `link`
   through `drawsAsFolder` and `isInertEntry`; `rootEmpty` reads the root's length); `sortEntries` and
   `carryLinkTargets` in the store (`name`, `kind`, `link`); the remote plan's `loadedLinkFolders` and
   `mergeRemoteGroups` (remote only); and three harness drives (`shot-probe.ts:153` and `:218`, `p154-probe.ts:83`,
   `target-shot-drive.ts:159-163`: `path` and the key count). Everything downstream reads the tree input, never the
   cache: the ignore store (`paths`, `links.folders`, `use-tree-model.ts:747-773`), the decorations (`links.folders`
   into `treeGitLane`, `:405-413`; `links.rows` into the row mark, `:426-430`), the menus (`use-tree-menu.ts:190-200`:
   `links`, `inert`), the open click (`FileTree.tsx:516-521`: `inert`, `links`), drag, drop and rename (`linksRef`,
   `:381`), reveal and the expansion watch (the model itself). So every reader is answered by an entry's `name`,
   `path`, `kind` and `link`, the order of a folder's entries, and the set of keys. Those are all four fields
   `FsDirEntry` has (`src/shared/types.ts:809-832`).
9. **Who writes it.** `readInto` (`store.ts:258-285`: a listing, the root's error, a vanished child), reached by
   `setRoot`'s root read (`:494-497`), `loadDir` (`:500-514`), `relist` (`:516-540`, which every local create, rename,
   move, trash and import ends with: `tree-ops.ts:329-330`, `:703`, `:797`, `:1044-1050`, `:1297`, `:1357-1361`) and
   `refreshLoaded` (`:594-610`); `setRoot`'s reset (`:470-487`); `forgetUnder` (`:542-557`); the remote walk
   `treeInto` (`:345-447`); `refreshLoaded`'s `rootError` and `bridgeMissing` (`:597`, `:600`); and the harness's own
   `setState` (`p154-probe.ts:761`, `:870`, `:937`).

## 1. The answer first

The cure is in the store alone, `src/renderer/tree/store.ts`. Nothing above it moves: the tree input, the model diff,
the ignore effect, `FilesSection` and the remote half keep every line. A refresh still re-reads every cached folder,
forced, exactly as Phase 155 made it; what changes is what it WRITES.

### 1.1 The decisions, each with its reason and the row that goes red without it

- **D1. A listing equal to the one held writes nothing (entry item 1).** Equal means: the same length, and at every
  index two entries with the same own keys holding the same values by `Object.is`, compared both ways. It is asked of
  the listing AFTER `prepare(carryLinkTargets(…))`, against the one the store holds for that folder, on every local
  landing (a refresh, a lazy load, a relist, the root). Equal keeps the HELD array, so its identity, the cache's
  identity and every memo above it do not move. Every own key, rather than a named list, because §0.1 item 8 finds
  every reader answered by the four fields `FsDirEntry` has today and a field added later is then compared without
  anyone remembering to: a list would rot the first time the type grows. Cost: 0.23 ms a pass at 502 folders of 3
  entries, 4.6 ms at 502 of 200, 0.9 ms for one folder of 20,000 (node 22, §2.4). Red without it: T1, T2.
- **D2. A vanished folder, an absent key and an unchanged error write nothing either.** A failed child read deletes its
  key only when the key is there; `refreshLoaded` writes `rootError: null` only when it was not null (§0.1 item 4).
  Red without it: T3.
- **D3. One refresh lands as one write (entry item 2).** The reads `refreshLoaded` starts are COLLECTED: an answer is
  staged, not written. The staged answers (listings and vanished folders together, and the root's error) are written by
  ONE `set` at the first of: (a) no collected read is still out; (b) `REFRESH_QUIET_MS` with no collected answer
  arriving while one is still out; (c) `REFRESH_CAP_MS` after the first staged answer. A collected read that answers
  after its flush stages again under the same three rules, so a slow folder alone is written the moment it lands ("what
  is late is written when it lands") and two late folders that land together are one write. Both constants are
  exported from `store.ts`, with the measurement in their comment (§2.3): **`REFRESH_QUIET_MS = 8`** and
  **`REFRESH_CAP_MS = 100`**. Why a quiet gap and not only a cap: with one folder held, a cap alone holds every other
  folder for the whole cap, which at 10 folders is the cap's length added to a new file's latency (parent: 469 to 478
  ms with a folder held 5 s, §2.3) and a regression; the quiet gap ends the wait about one gap after the other answers
  stop. Red without it: T4 (one write), T5 (a slow folder does not hold the rest), T6 (a late answer lands alone).
- **D4. A listing never replaces one read after it (entry item 3).** Every local read takes a stamp when it STARTS
  (one counter in the store). The store keeps, per folder, the stamp of what it holds; a landing (staged or at once,
  a listing or a vanished folder) for a folder holding a later stamp writes nothing. Without it the collection opens a
  window the parent never had: an answer staged and not yet written while a relist's newer read lands at once, then the
  flush writes the older one over it. Red without it: T7.
- **D5. A forgotten folder is never brought back (entry item 3).** `forgetUnder` records each path with the next stamp;
  a landing for a folder at or under a recorded path, from a read stamped before it, writes nothing, and the staged
  answers at or under it are dropped at once. The records are dropped when no local read is out and nothing is staged.
  The parent has the same hole, smaller (a read in flight across a rename can put the old key back until the next
  refresh fails it); D5 closes both. Red without it: T8.
- **D6. A project switch writes nothing of the old project.** `setRoot` drops what is staged, the stamps, the records
  and the timers, beside today's `rootSeq` rule, which a flush asks again. Red without it: T9.
- **D7. Phase 155 holds as written.** A forced read is never answered by one that began before it was asked: a read is
  "in flight" from its `readDir` call until its answer arrives, whether that answer is then staged or written, so a
  Refresh or a relist that arrives while an answer is only STAGED starts a read of its own, and one that arrives while
  the read is out waits for it and reads again, with every caller in that burst joining the one extra read. A caller of
  `refreshLoaded` resolves when every read it asked for has been written or dropped, so `FilesSection`'s `reconcile`
  after a press reads the truth. Refresh is never a no-op: it reads every folder again, and an equal answer is already
  what is drawn. Red without it: the seven rows of `p155-refresh-store.test.ts`, unedited, and T10.
- **D8. Everything a person does to one folder writes at once (entry item 3).** `loadDir` (an expand, and the
  restore's), `relist` (every create, rename, move, trash and import) and `setRoot`'s root read are never collected and
  never wait on D3's timers; they pass D1, D4 and D5 and write when they answer, as today. A relist that joins a read a
  refresh started (Phase 155's one extra read) makes that read write at once. Red without it: T11, T12.
- **D9. The ignore store and the decorations see every listing they need.** They read the tree input, which is rebuilt
  on every write and on no other: one write per refresh (zero when nothing changed) is one `sync`, carrying the NEWEST
  listing, which is Phase 370's rule. A `.gitignore` edit changes no listing, and the ignore effect still runs on the
  epoch `invalidate` bumps (`use-tree-model.ts:765-773`), so a rule change is still asked about. Nothing in
  `ignored.ts`, `use-tree-model.ts` or `decorations.ts` moves. Read in the app: §8 arm I.
- **D10. The tree on another machine is left as it is.** `treeInto`, the remote arms of `loadDir`, `relist` and
  `refreshLoaded`, `mergeRemoteGroups` and the extra-read count keep every line (and `a-st1` to `a-st4` keep reading
  them). D1 does not apply there: a far answer replaces what its walk covers through `mergeRemoteGroups`, and this phase
  does not open that. Red without it: the `p903-b-*` and `p343-remote-links` rows, unedited.
- **D11. It lands only if it is faster (entry item 4; THE GATE).** At 10, 100 and 500 open folders, for nothing
  changed, one file added (in the folder read first and in the folder read last) and a branch switch that changes half
  the folders, the window's thread a change is CDP `Performance.getMetrics` `TaskDuration` (enabled in the
  `threadTicks` domain, so it counts the renderer main thread's own CPU time) over the change's fixed window, less the
  same metric over the idle window of the same length that FOLLOWS it (one idle window per change; the spec step's one
  idle baseline per cell was overtaken by background work in launches B and C, §2.2, which is why the probe pairs them). The
  launches alternate, parent, HEAD, parent, HEAD, and each build's 16 changes a cell are pooled. Let `noise` be the
  difference between the parent's two block medians in that cell, at least 10 ms. HEAD must read **no higher than the
  parent in every cell** (HEAD's pooled median at most the parent's pooled median + `noise`) **and lower at 100 and
  500** (HEAD's pooled median at most the parent's pooled median − `noise`, and at 500 below the parent's in both block
  pairs). Thread time rather than wall time, because his load inflates a timer's lateness and does not inflate the
  work; the timer's lateness (p370's measure), the longest block, `ScriptDuration` and the raw window are printed beside
  it. If a cell fails, the part that does not help is dropped (D3's collection is the candidate; D1 alone cannot add
  thread time) and §As built and the commit body say so.
- **D12. The gates that read the store.** `a-st5` is re-anchored to D1's carry line by the integrator, in
  `build/p343/ablation.mjs` alone; nothing else in that file moves.

## 2. What the spec step measured, how, and the numbers

Every Electron ran through `build/electron-run.mjs`'s `withElectron` (`program: 'app'`, `cwd` the parent,
`tmuxSocket` the harness socket, so the census read his session names once before and once after each launch) inside
`build/harness-socket.mjs --fresh gmux-p372s`, by `zsh run.sh <label> …` (a lock slot taken and released by a trap;
`env -i` with `HOME`, `ZDOTDIR` and `TMPDIR` in scratch, `HISTFILE=/dev/null`, `SHELL=/bin/sh`), outside the history
block. Every other command ran under it. Electron 45.3.4, node 22.23.1, git 2.50.1, 12 cores, macOS 15.

### 2.1 How a cell is read (`driver.mjs`)

Three scratch repositories of 10, 100 and 500 folders `d0001…` (a tracked `a.txt` and an ignored `b.log` each), the
writer's folder `w/`, an ignored folder, `.gitignore` (`*.log`, `ignored/`), one uncommitted change, and a branch
`other` that adds `c.txt` to every second folder. Each is shown in the Explorer with its folders remembered (the
expansion set seeded through the shot drive's `localStorage`, `src/renderer/editor/shot-hook.ts:560`, as p370 did), so
N+2 folders are cached. Real git. The window is 1440 by 900; the launch carries
`--disable-backgrounding-occluded-windows --disable-renderer-backgrounding --disable-background-timer-throttling`.

- **The kinds.** `same`: a line appended to `w/seed.txt` (the watcher reports it; no listing differs). `add`: one new
  file `0new-NNNN.txt` in `d0001/`, the top row, so it is drawn on screen. `addEarly` (launch B on): the same in
  `d0002/`. `branch`: `git checkout` of `other` or `main` from outside the app (half the folders gain or lose a file).
  Every change produced exactly one `git:changed` in the page, counted in every row.
- **Phase T, no debugger.** Each change is read over a fixed window (3 s, 4 s at 500 folders), 8 changes a kind:
  `TaskDuration` over the window less the median of three idle windows of the same length; the lateness of a 10 ms timer
  (`blocked`, every lateness above 4 ms summed, and the `longest`); long tasks; and for `add` the time from the write
  (the driver's `Date.now()`) to the first painted frame whose shadow root holds the row (`requestAnimationFrame` in the
  page, same clock).
- **Phase C, the counters.** Debugger on, conditional breakpoints that never pause, each anchored by text in the built
  bundle and checked to resolve at its own statement: `readDir` in `fs-bridge.ts` (reads), zustand's `setState` where
  `entriesByDir` changed identity (store writes) or `ignored` did, `treeInputOf` (tree-input passes), the listing diff
  effect's first statement (model passes), `useTreeIgnored`'s `sync` (ignore calls), `useTreeModel`'s first statement
  (renders); three changes a kind, with the time of the first read and of the last write.
- **Phase R (launch B on), the reads alone.** Every cached folder read at once from the page through
  `window.gmux.fs.readDir`, nothing rendering, five times (ten in launch C): when the first and the last answer
  arrived, and (launch C) the gaps between answers. That stream is what HEAD stages, so it is what D3's two constants are set against.
- **Phase H, one folder held.** Through main's inspector (`--inspect=0`), `require('node:fs/promises').readdir` is
  wrapped so the read of `d0002` waits 5 s (main's `fs:readDir` calls `promises.readdir` at call time,
  `out/main/index.js:82732`); four new files in `d0001/`, 7 s apart, each read for its latency (at 10 and 500 folders in A and B, at 100 and 500
  in C).

### 2.2 The parent: the window's thread a change (launches A to C)

`TaskDuration` over the change's whole window (3 s; 4 s at 500 folders), ms, median (min to max) of 8 changes, then
`ScriptDuration`'s median and the 10 ms timer's `blocked` and `longest` medians; load the 1 minute load at the cell's
start. Launch C repeated the 100 and 500 cells. Launch A had no `addEarly`; in launch A `d0001` was read FIRST (§2.1's remembered order came in at launch B),
so A's "one file added" is B's `addEarly`. The idle level of the same window was 19 to 44 ms in A and in B's 10 folder
cell, 56 to 109 ms in B's 100 and 500 folder cells and 60 to 98 ms in launch C (100 and 500 folders only), whose idle
windows overlapped the background work a mount leaves (its trailing revalidation, its status read); that is why §1 D11 pairs every change with the idle window after
it rather than with one baseline. No long task was reported by the page's `PerformanceObserver` in any cell, so the
longest block is the timer's.

| Cell | Launch | nothing changed | one file added, read first | one file added, read last | branch switch | load |
| --- | --- | --- | --- | --- | --- | --- |
| 10 | A | 31 (25–40); 6, 0, 0 | 41.5 (36–54); 10.5, 0, 0 | — | 42.5 (34–129); 11.5, 8, 8 | 17 to 22 |
| 10 | B | 17 (14–44); 4, 0, 0 | 95 (52–105); 20.5, 0, 0 | 81 (29–111); 18.5, 0, 0 | 54.5 (34–109); 14.5, 7, 7 | 16 to 32 |
| 100 | A | 43.5 (32–57); 16.5, 5.5, 5.5 | 48 (44–62); 17.5, 8.5, 8.5 | — | 71.5 (67–86); 40.5, 41.5, 41.5 | 13 to 22 |
| 100 | B | 26.5 (22–35); 13, 0, 0 | 43.5 (31–73); 15.5, 6.5, 6.5 | 70 (40–77); 22, 8, 8 | 81.5 (72–101); 43, 37.5, 37.5 | 25 to 35 |
| 500 | A | **226 (212–253)**; 172.5, 178.5, 139 | **262.5 (213–277)**; 164, 163, 149.5 | — | **440 (426–476)**; 374, 405, 303.5 | 24, 33, 23 |
| 500 | B | **206.5 (204–215)**; 170, 183.5, 183.5 | **189 (180–206)**; 143.5, 160, 160 | **311 (290–322)**; 197.5, 189, 182.5 | **504 (484–517)**; 373.5, 387.5, 315.5 | 38, 25, 16, 20 |
| 100 | C | 105.5 (76–110); 35, 14.5, 14.5 | 117.5 (103–130); 38, 18, 18 | 126 (97–137); 40, 18.5, 15.5 | 138.5 (130–149); 61, 49, 49 | 28 to 37 |
| 500 | C | **281.5 (248–287)**; 182.5, 178, 152 | **271 (227–296)**; 167, 165, 143.5 | **292.5 (253–315)**; 191, 186.5, 178 | **462.5 (419–489)**; 372, 394.5, 293.5 | 12, 9, 6, 5 |

The 10 folder cells move by tens of milliseconds between launches with no change in what they do (A's 41.5 against
B's 95 for the same write): that is the noise D11's `noise` term is measured from, and why the gate pools two blocks a
build. At 500 folders the cost is the 502 renders, and it is plain in every reading: 143 to 197 ms of script a change
when nothing a person can see changed, 374 ms for a branch switch. A's branch cell waited 14 minutes for a load that
reached 113 (his and the system's, §0) and ran at 23.

### 2.3 The parent: what one refresh does (the counters, launches A to C), how long it takes, and D3's constants

| A change, three of each kind in each launch, every count identical | 10 | 100 | 500 |
| --- | --- | --- | --- |
| `fs:readDir` calls | 12 | 102 | 502 |
| store writes (a new `entriesByDir`) | 12 | 102 | 502 |
| tree-input passes / model passes | 12 / 12 | 102 / 102 | 502 / 502 |
| ignore-store `sync` calls | 12 to 13 | 102 to 103 | 502 to 503 |
| renders of the model hook: same, add, branch | 14–16, 15–16, 19–20 | 104–106, 104–106, 154–155 | 504–506, 505–506, 754–755 |
| the refresh's reads all started within (ms) | 0 to 1 | 2 to 11 | 12 to 60 |
| first read → last write (ms): same, add, branch | 5–9, 6–7, 15–19 | 36–61, 36–69, 77–103 | 420–514, 412–652, 637–791 |
| **the same reads with nothing rendering** (phase R, call → last answer; B five, C ten) | **1** | **2 to 9** | **11 to 19** |
| the largest gap between two answers of one such read (C) | — | 0.1 to 1.7 ms (99th percentile at most 1.0) | 0.5 to 4.8 ms (99th percentile at most 0.6) |

So at 500 folders the disk and main answer the whole refresh in 11 to 19 ms; the parent takes 0.41 to 0.79 s to write
it, because each of the 502 answers renders before the next is taken. A collected refresh is written when the last
answer arrives, which is the bottom row.

| A new file, from its write to its row (ms, median, min to max) | 10 | 100 | 500 |
| --- | --- | --- | --- |
| in the folder read FIRST (A's `add`, B's and C's `addEarly`) | 475 (462–482); 477.5 (467–493) | 483 (476–492); 482.5 (467–492); 494 (486–502) | **563 (498–587); 530.5 (481–568); 574.5 (508–583)** |
| in the folder read LAST (B's and C's `add`) | 476 (472–480) | 476 (470–490); 500 (491–507) | **680.5 (663–687); 668.5 (649–686)** |
| the first-read folder, `d0002` held 5 s in main (A) | 469, 472, 477, 477 | — | 477, 485, 514, 521 |
| the last-read folder, the first-read `d0002` held 5 s (B, C) | 470, 473, 478, 478 | 473, 484, 485, 544 | 682, 685, 693, 695; 656, 672, 673, 674 |

The floor is the watcher's 300 ms and the renderer's 150 ms. At 500 folders the parent draws a new file 55 to 100 ms
past that floor in the folder read first and 195 to 205 ms past it in the folder read last. Holding one folder changes
nothing at the parent, because each folder is written on its own.

**D3's two constants, set against these.** A refresh's answers arrive within 11 to 19 ms at 500 folders with nothing
rendering, so the "last read out" rule (a) writes every ordinary refresh in one `set` well inside a frame of its last
answer. `REFRESH_QUIET_MS = 8`: the largest gap between two answers of one refresh was 4.8 ms in fifteen whole refreshes of 502
folders (its 99th percentile at most 0.6 ms), so an ordinary refresh never meets the quiet rule, and with a folder held the
others are written about 8 ms after they stop, which at 10 folders puts a new file at most half a frame past the
parent's (469 to 478 ms) and at 500 folders well before it (a write at about 475 + 19 + 8 against the parent's 531 to 575 and 669 to
681). `REFRESH_CAP_MS = 100`: five times the slowest whole refresh measured (19 ms), so it bites only on a trickle of answers
none of which is ever 8 ms apart, and it is half the 195 to 205 ms the parent already adds for the folder read last.

### 2.4 The equality rule's cost (`bench/eq.mjs`, node 22, history block)

| Folders × entries | One pass over every folder |
| --- | --- |
| 502 × 3 (the 500 cell) | 0.23 ms |
| 502 × 30 | 0.75 ms |
| 502 × 200 | 4.58 ms |
| 1 × 20,000 | 0.90 ms |
| 5,000 × 3 | 0.85 ms |

Entries copied as IPC delivers them (fresh objects, equal values), every own key compared both ways. Beside the 502
renders of §2.2 it is nothing; it runs only where today a write runs.

### 2.5 The spec step's commands, exit codes and numbers

| Command | Exit | Numbers |
| --- | --- | --- |
| `stat -f '%z %m' ~/.zsh_history ~/.bash_history` (start, and before and after every launch inside `run.sh`) | 0 | `751928 1795563175`, `23166 1790702242` every time |
| `df -h /`; `sysctl -n vm.loadavg`; `memory_pressure` (before every launch) | 0 | 15 to 20 GiB free; loads 14 to 113 (§0); 48 to 50 percent free |
| reads of the entry, Phases 155, 343 and 370, `build/p370/SPEC.md`, `build/p365/SPEC.md`, the tree's files, the built bundles (history block) | 0 | §0.1, §3 |
| `zsh run.sh trial 10 2` (the driver's own trial, parent) | 0 | every counter resolved at its own statement; 12 reads, 12 writes a change |
| `zsh run.sh parentA 10,100,500 8` | 0 | §2.2, §2.3; slot `electron.lock`; 23 min, 14 of them the load gate |
| `zsh run.sh parentB 10,100,500 8` | 0 | §2.2, §2.3; slot `electron.lock`; 15 min |
| `RAW_REPS=10 zsh run.sh parentC 100,500 8` | 0 | §2.2, §2.3; slot `electron.lock2`; 8 min |
| `node bench/eq.mjs` (history block) | 0 | §2.4 |
| the Electron count (CLAUDE.md's command, outside the block, once, at the end) | 0 | none of this phase's: his Tortie (50568) and its crash handler, Cursor's, Slack's, Granola's and Chrome's crash handlers; no `p372` socket or run marker under `/private/tmp/tmux-501/`; all three lock slots free; no process naming the scratch |

Every launch's teardown reported "ended 1 process the teardown found still running" (the app itself, which
`withElectron` ends). Not run, and why: HEAD (there is none yet); the parent's build (the main session's,
`parent-build.log` ends `exit 0`); `probe:p343` (the verifier's, §7.3); the long-task observer gave no entry in any cell
(Electron 45's renderer answered none for `longtask`), so the longest block is the timer's.

## 3. The tree at this head: what each decision touches

Only `src/renderer/tree/store.ts` changes in `src/`, and inside it only the local half:

- `readInto` (`:258-285`) becomes the one landing: stamp, D1's equality, D4 and D5's checks, and either the write at
  once (D8) or the stage (D3).
- `listInto` (`:299-328`) keeps Phase 155's `inFlight` and `queued` maps and gains the mode the read was started in
  (collected or at once), which a joining relist can raise (D8); `inFlight` ends when `readDir` answers (D7).
- `refreshLoaded`'s local arm (`:594-610`) starts its reads collected and writes `rootError` only when it changes (D2).
- `forgetUnder` (`:542-557`) records its paths and drops what is staged under them (D5); `setRoot` (`:457-498`) drops
  the collection (D6).
- NEW, exported beside `REMOTE_EXTRA_READS`: `REFRESH_QUIET_MS`, `REFRESH_CAP_MS` (D3) and `sameListing(a, b)` (D1),
  so the rows and the oracle can name them.
- Byte for byte, and the integrator diffs them: `sortEntries`, `carryLinkTargets`, `prepare`, `RemoteTreeRead`,
  `REMOTE_IDLE`, the extra-read count, `treeInto`, the remote arms of `loadDir`, `relist` and `refreshLoaded`, and the
  module header's Phase 90.3 and 343 paragraphs (a Phase 372 paragraph is ADDED to the header, saying D1 to D8 and the
  measured reason in four short paragraphs).

## 4. The design, item by item (builder `store`)

### 4.1 The state the store adds (closure variables beside `inFlight` and `queued`, never in the zustand state)

```ts
let stampSeq = 0;                                   // D4: one counter, taken when a read starts
const heldStamp = new Map<string, number>();        // D4: the stamp of what the store holds, per folder
const forgets: Array<{ dir: string; stamp: number }> = [];   // D5
type Staged = { stamp: number; listing: FsDirEntry[] | null; error?: string }; // null: vanished
const staged = new Map<string, Staged>();           // D3: answered, not yet written
let collectedOut = 0;                               // D3: collected reads whose readDir has not answered
let quietTimer = null, capTimer = null;             // D3
let flushWaiters: Array<() => void> = [];           // D7: callers waiting for their answers to be written
```

### 4.2 One landing

For a folder `d`, an answer read with stamp `s` and the store's `rootSeq` `q`:

1. `q !== rootSeq` → nothing (today's rule).
2. A forget of `d` or an ancestor recorded after `s` → nothing (D5).
3. `heldStamp.get(d) > s` → nothing (D4).
4. A listing: `next = prepare(carryLinkTargets(entries, held))`, where `held` is what the store holds for `d` NOW (Phase
   343 D4 carries from the newest held listing, as today). `sameListing(held, next)` → record `heldStamp(d) = s`,
   write nothing (D1). Otherwise write `next` and record the stamp.
5. A failure: `d` is the root → `rootError` (written only if it changed); otherwise delete `d` only if present (D2),
   and record the stamp.

At once (D8) a landing is one `set` (or none). Collected (D3) it is staged under `d`, replacing a staged answer only
when its stamp is later; the flush runs steps 1 to 5 for every staged folder against ONE draft of `entriesByDir` and
calls `set` once if anything differs, and not at all otherwise.

### 4.3 The flush rule

When a collected read starts, `collectedOut += 1`; when its `readDir` settles, `collectedOut -= 1` and the answer is
staged. Then: `collectedOut === 0` → flush now, synchronously. Otherwise re-arm `quietTimer` (`REFRESH_QUIET_MS`) and, if
none is armed, arm `capTimer` (`REFRESH_CAP_MS`, from this first staged answer). Either timer flushes. A flush clears
both timers and settles `flushWaiters`. A caller's promise for a collected read resolves at the flush that wrote or
dropped its answer, which is what `refreshLoaded` awaits (D7). `setRoot` clears everything of §4.1 and settles every
waiter (D6). The timers are the store's only clocks, both bounded, neither rearmed by anything but an answer: a quiet
tree arms nothing.

### 4.4 Joining a read (D7, D8)

`listInto(d, seq, force, mode)`: a running read is joined exactly as today, and a caller in mode "at once" that joins
a collected read (running or queued) raises that read to "at once", so its answer is written when it lands and never
waits for the flush. A collected caller that joins an "at once" read gets that read's write.

## 5. Words

No surface, sentence or menu row. The ONE CHANGELOG item, for `## Unreleased`, `### Fixed`, only when §1 D11 holds:

> With many folders open in the Explorer, a file changing on disk no longer makes the whole tree redraw folder by folder, so Tortie stays responsive while agents write, and a new file shows up sooner in a large tree.

If §8 finds the latency clause does not hold at 500 folders, the item ends at "while agents write". If D11 fails at
every cell, there is no item.

## 6. What moves on purpose

- At HEAD a refresh over an unchanged disk writes NOTHING, so a subscriber of the tree store hears nothing on such a
  tick; nothing in `src/` subscribed for the tick itself (§0.1 item 8), and the three harness drives read the state.
- A new file in a folder read early in a refresh is drawn when the whole refresh lands rather than when its own folder
  does; a new file in a folder read late is drawn sooner. §8 arm L reads both ends at both builds.
- A read in flight across a `forgetUnder` no longer puts the forgotten key back (D5).

## 7. The rows

### 7.1 The store's rows (builder `store`): NEW `src/renderer/tree/__tests__/p372-one-write.test.ts`

Over a fake `window.gmux.fs.readDir` whose answers are released by hand (the shape of `p155-refresh-store.test.ts`),
`vi.useFakeTimers()` where a timer is the question, counting `useFileTree.subscribe` calls whose `entriesByDir`
changed. Each row is shown red by an ablation made in a scratch copy of `store.ts`, never in the worktree's file, and
recorded in §As built.

| Row | What | Ablation that turns it red |
| --- | --- | --- |
| T1 | a refresh of 3 cached folders over an unchanged disk: 3 reads, 0 writes, `entriesByDir` the same object | write without D1's question |
| T2 | one write when exactly one field changes, for each of: a name, a path, a kind, a `link` gained, a `link` lost, a `link` changed, the order, an entry added, one removed, and an extra own key on one entry | D1 comparing names only; comparing one direction only |
| T3 | a child read failing for a folder not cached, and a root read succeeding twice: 0 writes; `rootError` written once when it moves | D2's two guards removed |
| T4 | a refresh of 500 folders whose listings all change, answered in one burst: exactly ONE write, every folder new in it, a vanished folder gone in the same write | flush on every answer |
| T5 | one folder held: the others written at `REFRESH_QUIET_MS` after the last of them answered (fake timers), the held one alone when released; with answers trickling every 7 ms, one write at `REFRESH_CAP_MS` | the quiet timer removed (waits for the held one); the cap removed (trickle never flushes until done) |
| T6 | a late answer after its flush, with nothing else out: written at once, alone | a late answer staged until the next refresh |
| T7 | a collected answer staged, then a relist of the same folder answering first with a newer listing: the flush does not write the older one | D4 removed |
| T8 | `forgetUnder` of a folder while its collected read is out and while its answer is staged, and of its parent: the key never returns; a new `loadDir` after the forget lands | D5 removed (staged answer flushed); D5's record kept but staged entries not dropped |
| T9 | `setRoot` to another folder while a collection is staged and out: nothing of the old folder written, the new root's listing written | the flush not asking `rootSeq` |
| T10 | a Refresh pressed while an answer is only staged: a new read of that folder starts, its answer is what lands; ten presses in one burst while reads are out cost one extra read a folder | `inFlight` held until the flush (the press rides the staged answer) |
| T11 | a relist inside a collection held open by a slow folder: written before `REFRESH_QUIET_MS` elapses, and its promise resolves then | relist collected |
| T12 | a `loadDir` of an uncached folder while a collection is held open: written at once | loadDir collected |
| T13 | `refreshLoaded()` resolves only after every folder it read is written or dropped | resolving before the flush |
| T14 | the two constants are 8 and 100 | either changed |

And these must pass UNEDITED: `p155-refresh-store.test.ts`, `p155-refresh.test.ts`, `p155-import-baseline.test.ts`,
`tree-target.test.ts`, `p903-b-tree-store-remote.test.ts`, `p903-b-remote-plan.test.ts`, `p343-remote-links.test.ts`,
`p343-links.test.ts`, `p343-link-hooks.test.ts`, `p343-tree-ops-links.test.ts`, `p343-ignored-links.test.ts`,
`tree-ops-create.test.ts`, `p341-create-across-push.test.ts`, `p233-remote-move.test.ts`, `p102-remote-entry.test.ts`,
`p370-ignored-flight.test.ts`, `ignored-store.test.ts`, `ignored.test.ts`, `decorations.test.ts`. A row of those that
goes red is a defect in the build, never an edit to the row.

### 7.2 The independent oracle (builder `probe`, who does not write the store): NEW `src/renderer/tree/__tests__/p372-oracle.test.ts`

The store's public verbs only (`setRoot`, `loadDir`, `refreshLoaded`, `relist`, `forgetUnder`, the state and
`subscribe`), over a fake file system of its own: a tree of folders that a seeded random program mutates (add, remove,
rename a file or a folder, change a link's target), and a `readDir` that answers with the folder AS IT WAS WHEN THE READ
STARTED (a snapshot taken at the call), after a seeded delay, or fails (the folder gone, or a seeded failure). At least
3,000 seeds, each a program of 40 steps drawn from: mutate, refresh, a second refresh before the first lands, expand
(a `loadDir` of an uncached existing folder), collapse (nothing: a collapsed folder keeps its cache), relist, forget
(after a rename or remove, as tree-ops does), a project switch and back, a read held long, a read that fails, and
advancing fake time. Asked at every store notification (a "frame") and at the end:

1. **Never a row the disk never held**: every entry of every folder in the state was in that folder at some instant
   since the program began (the fake file system keeps each folder's history).
2. **Never older**: a folder's listing never changes to one whose read started before the read of the listing it
   replaces.
3. **Never brought back**: a key forgotten is never present again unless a read started after the forget answered it.
4. **Nothing of the other project**: after a switch, no key outside the new root.
5. **The end equals a fresh read**: after the program, every timer run and one more `refreshLoaded()` with no
   mutation, the state equals a fresh read of every cached folder that still exists, keys and listings.
6. **One write a quiet refresh**: in every program, a refresh with no mutation since the last landed and no read
   held or failed writes nothing.

The builder runs it against the parent's store too (a scratch copy of `a28c2cf3`'s `store.ts` under the test's own
alias, never the worktree's) and records which clauses the parent fails (expected: 6 every time; 3 when a read crosses a
forget) beside HEAD's 0. A seed that fails prints its program. Ablations for the oracle's own power: run it over three
scratch copies of HEAD's store with D3's flush writing every answer, D4 removed and D5 removed, and record that each
fails a clause.

### 7.3 The path-triggered gates the changed files trigger (CLAUDE.md, read at this head)

- `src/renderer/tree/store.ts` is named by `probe:p343` (its probes-table row) and read by `ablation:p343` (D12). A
  verifier runs `probe:p343` with `P343_ARMS=L1,L2,L5,L6,L3,R1,R4` beside the parent (`P343_PARENT_CHECKOUT` the
  parent, inside its own `with-scratch-machine` wrapper with `HOME` in scratch and `SCRATCH_MACHINE_NO_OWN_KEYS=1`):
  L1, L2 and L3 read every link row, kind, mark and menu the tree input carries (D1's fields); L5 the dimming after a
  revalidation (D9); L6 a write under a linked folder with no Refresh and one under `linkOut` after Refresh (D3, D7);
  R1 and R4 the remote tree across Refresh (D10). The integrator runs `ablation:p343`'s six store arms (D12).
- `probe:p370` names `src/renderer/tree/ignored.ts`, the sync effect and `FilesSection`, none of which moves; its arm D
  (the no-regression readings) is the verifier's second app reading for D9 if §8 arm I is UNREADABLE, never both.
- No conformance gate reads `store.ts` (`grep -rln "renderer/tree/store" build/` names only `build/p343/ablation.mjs`
  and `build/p370/probe-p370.mjs`, the second as text it prints). CLAUDE.md's path-triggered table gains no row: no
  gate here guards a rule a later round could break silently that `p372-one-write.test.ts` and the oracle do not, and
  both run in `npm test`. The probes table gains ONE row for `probe:p372` (the integrator, §11).

## 8. The app run: `probe:p372` (builder `probe`)

NEW `build/p372/probe-p372.mjs`, `build/p372/fixtures/**`; `package.json`'s
`"probe:p372": "node build/harness-socket.mjs --fresh gmux-p372 'node build/p372/probe-p372.mjs'"`. Its header in the
house shape (what it drives, what it refuses, its environment), and:

- `P372_PARENT_CHECKOUT` a BUILT `a28c2cf3` checkout, required for every arm that compares (absent: those arms read
  UNREADABLE and the run exits 2); `P372_ARMS`, `P372_KEEP`, `P372_REPORT` (outside the checkout); `P372_HEAD_ONLY=1`
  development, never exit 0.
- `node build/p372/probe-p372.mjs --grader-self-test` grades recorded raw fixtures (seeded from the spec step's
  `out/*.json`, copied into `build/p372/fixtures/`) and STARTS NOTHING; `--preflight` reads the builds and the anchors
  and starts nothing. Run the flags with `node`, never through `npm run`.
- THREE verdicts and a missing reading is never a pass: each grader names its `reads`, its `needs` and its `clauses`;
  an absent field or an unmet need is UNREADABLE (exit 2), a clause FAIL (exit 1). Every reading taken from raw text
  comes out of ONE pure `derive`, which the self-test drives.
- **The launches, one at a time, in blocks**: parent, HEAD, parent, HEAD, each launch on its own scratch profile, HOME
  and ZDOTDIR, the harness socket as `tmuxSocket`, `--remote-debugging-port=0`, `--inspect=0`,
  `--use-mock-keychain` and the three background flags; every probed registry row hidden and `agents:list` read back
  (a row that resolved refuses the run, exit 2); the closed PATH of §0 checked through the scratch login shell before
  each launch (`command -v git` must answer `/usr/bin/git`, else exit 2); load and memory gates of §0 before every
  timed cell, the load printed beside every cell.
- **The counters** are §2.1's six conditional breakpoints, located by text in each build's own
  `out/renderer/assets/*.js` (`function readDir(dirPath){`, zustand's `listeners.forEach(listener=>listener(state,previousState))`,
  `function treeInputOf(entriesByDir,rootPath){`, `const fed=fedRef.current;const next=treeInput.paths;`,
  `sync(target,paths,linkFolders){`, `function useTreeModel(`). Each anchor must be found exactly once in both builds
  and resolve at its own statement (the locations CDP answers printed); otherwise exit 2. None of those files moves in
  this phase, which is why they are the anchors. The counters run in their own phase of each launch, after the timed
  one, never during it.
- The world: §2.1's three repositories, with the remembered order of §2.1 (launch B on): `d0001` drawn first and read
  LAST, `d0002` read first.

| Arm | Builds | What | Clauses (HEAD unless said) |
| --- | --- | --- | --- |
| **M** the matrix | both, two blocks each | 10, 100, 500 folders × `same`, `add`, `addEarly`, `branch`, 8 changes a cell, §2.1's windows | **D11** as §1 states it, every cell (the integrator's reconciliation: §1 governs, with its `noise` term; this row first read "the parent's median + 5" and "below the parent's minimum", which the probe does not grade). Counts (three changes a kind): `same` 0 store writes, 0 model passes, at most 1 sync (the epoch `invalidate` bumps, D9), still exactly N+2 reads (Phase 155); `add` and `addEarly` 1 write, 1 model pass, at most 2 syncs; `branch` at most 2 writes and 2 model passes. Printed: the parent's N+2 of each beside them. Printed: blocked, longest, long tasks, renders |
| **L** a new file's latency | both | `add` (`d0001`, read last) and `addEarly` (`d0002`, read first) at 10 and 500, 8 each | each of the four: HEAD's median at most the parent's median + 17 ms (one frame, the reading's resolution) |
| **H** one folder held 5 s | both | §2.1's Phase H at 10 and 500, holding `d0003`, new files in `d0001` and in `d0002` | the new files' latency at most the parent's + 17 ms; the held folder's own new file drawn no later than the parent's own reading of it + 17 ms (the integrator's reading of "the parent's latency", §As built); the held folder is written alone (one write when it lands) |
| **E** an expand | both | a folder `x/` of 20 files, not remembered, expanded by a click on its row (ten times, collapsed between), on a quiet tree and while §H holds a folder | rows drawn no later than the parent + 17 ms, both ways |
| **O** the tree's own verbs | both | the shot drive's `treeOps` (`src/renderer/tree/shot-probe.ts:987`): new file, new folder, rename, move to trash, through the mounted tree's TreeOps and the real `fs:*` channels, once on a quiet tree and once inside a collection held open by §H | each row drawn (or gone) on the frame the parent draws it, + 17 ms; every step `ok` at both builds |
| **R** Refresh | both | a file written into `d0001` and the Explorer's Refresh pressed (the `aria-label="Refresh files"` button) inside the watcher's 450 ms; and pressed while §H holds a folder | the row drawn after the press no later than the parent + 17 ms; with a held folder, the held folder read again after its held read (main's `fs:readDir` count from the wrapped `readdir`) |
| **V** a vanished folder | both | `rm -rf d0005` from outside, five times on fresh folders | its rows gone no later than the parent + 17 ms; no key for it after (read through the counters' write log) |
| **S** a switch mid-collection | both | §H holding a folder in the 500 repository, a file added, the 10 repository shown, then the 500 again | no row of the 500 repository is ever drawn while the 10 is shown (every painted frame read); after the return, every new file drawn |
| **I** the ignore store | both | a new ignored file (`*.log`) dims; a rule added to `.gitignore` shows; taken away shows; Phase 47.1's frames under a writer for 20 s | each within the parent's median + 200 ms (p370's N2/N3 bound); 0 frames draw a must-dim row undimmed of at least 1,000 painted |
| **RUN** | — | the preflights, the hidden agents, the census, every pid ended, his history unmoved, no leftover naming the run, the load and memory beside every cell | |

The probe adds no drive hook and no file under `src/` but the oracle (§7.2). It reads the tree's shadow root
(`file-tree-container`, `[data-item-path]`, `data-item-git-status`), `window.gmux`, the shot drive, main's
`node:fs/promises.readdir` through its inspector, and the counters. Expected time: about 12 minutes a launch at
loads under 30, so about 50 minutes for the four, more when the load gate waits.

## 9. Builders, disjoint files

### 9.1 The table (every file in exactly one list; a builder that must edit a file not in its list stops and names it)

| Builder | Files it owns |
| --- | --- |
| `store` | EDIT `src/renderer/tree/store.ts` (§3, §4); NEW `src/renderer/tree/__tests__/p372-one-write.test.ts` (§7.1) |
| `probe` | NEW `build/p372/probe-p372.mjs`, `build/p372/fixtures/**`, `build/p372/CHECKLIST.md` (what a verifier presses and reads, in order); NEW `src/renderer/tree/__tests__/p372-oracle.test.ts` (§7.2) |
| integrator | `CLAUDE.md` (one probes-table row, §7.3), `CHANGELOG.md` (§5, only under D11), `package.json` (`probe:p372`, after `probe:p371`), `build/verification-checks.mjs` (`electron('probe:p372')` with its paragraph, after `probe:p371`'s), `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 195 → 196, naming the script in its comment), `build/p343/ablation.mjs` (`a-st5`'s `from` line only, D12), `build/background-fixtures.mjs` (only if a new shape needs it), `docs/audits/contract-baseline.txt` (no line is expected to move; a move is a finding), this file's §As built, and any file two builders both need |

### 9.2 The seams, stated exactly so the two build at once

- The oracle and the probe read the store through its public verbs, its state, `subscribe` and three exports:
  `sameListing(a: readonly FsDirEntry[] | undefined, b: readonly FsDirEntry[] | undefined): boolean`,
  `REFRESH_QUIET_MS` and `REFRESH_CAP_MS`. `store` exports exactly those three beside today's exports and returns
  their final text.
- `store` keeps `readDir` imported from `./fs-bridge` and called once a read (the probe's read counter and the oracle's
  fake both depend on it), and never touches `fs-bridge.ts`, `tree-paths.ts`, `use-tree-model.ts`, `ignored.ts` or
  zustand (the counters' anchors).
- `store` writes D1's carry line in the natural shape and returns its exact text; the integrator re-anchors `a-st5` to
  it.
- `probe` seeds `build/p372/fixtures/` from `/private/var/tmp/tortie-wt/scratch/p372/spec/out/*.json` (copies, the
  scratch paths in them replaced by `<run>`).

### 9.3 The builders' briefs

- **`store`** (THIS IS A BUILD): §1, §3, §4, §7.1. Run the new file and every unedited file of §7.1 by name, then
  `npm run typecheck` and `npm test` (history block, scratch `HOME`). Show each ablation of §7.1 in a scratch copy of
  `store.ts`, never in the worktree's, and return which row went red for each, and `git diff --stat a28c2cf3` (only
  your two files).
- **`probe`** (THIS IS A BUILD): §7.2 and §8. Run the oracle against HEAD's store as `store` lands it and against the
  parent's (§7.2), `--grader-self-test` and `--preflight`, and under a lock slot ONE launch at the parent with
  `P372_ARMS=M` at 10 folders, and return the numbers. The full run is the verifier's.

Every builder returns every file it changed with its line counts, every decision this file does not state, and what it
could not run and why.

## 10. The proof, run rather than read (Tier 2)

- **The gates**: §11.
- **ONE app run per build, every claim in it**: `probe:p372` whole, parent then HEAD, twice, alternated (§8). D11 is
  graded there and nowhere else.
- **The independent method**: the oracle (§7.2), by the builder who did not write the store, at HEAD and at the parent;
  and the verifier RE-DERIVES the counts and the medians of arm M from the probe's raw readings (`P372_KEEP=1`) with a
  reader of its own, and attacks D11 by reading one cell again with the order of the builds reversed (HEAD first).
- **No regression, each row beside the parent**: arms L, H, E, O, R, V, S, I; `probe:p343`'s seven arms (§7.3); the
  unedited rows of §7.1.

## 11. The integrator's commands (in order; each with its exit code and PASS line in the report)

1. `npm run typecheck`
2. `node build/contract-inventory.mjs --check` (byte for byte; a diff is a finding)
3. `npm test` (history block, scratch `HOME`; the four `/bin/ps` tests named as the expected failures)
4. the phase's vitest files and their neighbours by name: `p372-one-write`, `p372-oracle`, and every unedited file of
   §7.1
5. re-anchor `a-st5` (D12); `node build/p343/ablation.mjs --self-test`, then
   `P343_ONLY=a-st1,a-st2,a-st3,a-st4,a-st5,a-st6 node build/p343/ablation.mjs` (each arm red on its owner)
6. `git diff a28c2cf3 -- src/renderer/tree/store.ts` read against §3's byte-for-byte list, and
   `git diff --stat a28c2cf3 -- src/ build/ CLAUDE.md CHANGELOG.md package.json docs/` (only §9.1's files)
7. `npm run build` (`gate:electron` 196 against a floor of 196; `gate:background`; `gate:checks` with `probe:p372`
   classified)
8. `node build/p372/probe-p372.mjs --grader-self-test` and `--preflight`
9. under a lock slot, `P372_ARMS=M P372_PARENT_CHECKOUT=/private/var/tmp/tortie-wt/wt-p372-parent npm run probe:p372`
   at 10 and 100 folders only (one block a build), as the integrator's smoke of the probe; the whole run is the
   verifier's
10. the Electron count, the socket check, the history stats, the leftovers

`smoke`, `smoke:t1`, `smoke:t3` and the package are the main session's, at landing.

## 12. What is NOT in this phase

- No re-read of only the changed folders and no change to when a folder is re-read: every change still reads every
  cached folder, forced (Phase 155), 502 reads at 500 folders.
- No change to the mount's restore of up to 500 remembered folders, one write each (§0.1 item 5; §14 Q2).
- No change to a machine's tree (D10), to what is drawn, dimmed or badged, to a menu, to the ignore store, the tree
  input, the model diff, `FilesSection` or `fs:readDir`.
- No new setting, surface, sentence, menu row, log line, harness smoke mode or drive hook.
- No release.

## 13. For the main session at landing

1. `HELPER_USER_FLOOR` 195 → 196, naming `build/p372/probe-p372.mjs`.
2. CLAUDE.md gains ONE row, in the probes table, and none in the path-triggered table (§7.3).
3. The minimum gates that start Electron outside the helper are yours; this phase's agents ran none of them.
4. The CHANGELOG item goes under `## Unreleased`, `### Fixed` only if D11 held; the follow-up docs commit adds its link.
5. Cleanup after the follow-up commit: both worktrees and `/private/var/tmp/tortie-wt/scratch/p372/`.

## 14. Questions for him (the main session asks; the build proceeds on the defaults)

1. **Opening a project still draws its folders one by one.** When a project with 500 remembered open folders is shown,
   each folder still lands on its own, one write each (§0.1 item 5; not timed by the spec step). This
   phase changes what happens when a file changes, not the opening. Default: leave it, and queue it as its own phase if
   you want it. The other choice: fold it in here, which widens the change to the expand path this phase promises
   draws as soon as today.
2. **Every change still reads every open folder.** At 500 folders that is still 502 folder reads a change; after this
   phase they cost a few milliseconds of the window rather than a fifth of a second, and nothing is drawn when nothing
   changed. Default: leave it (the entry's NOT). The other choice: a later phase that reads only the folders the
   watcher names.
3. **The changelog line.** Default: one item (§5) if the app run shows the gain, none otherwise. The other choice: no
   item in any case, since nothing a person presses changes.

## §As built

Written by the integrator on 2026-11-25 in `wt-p372`, on top of `a28c2cf3`. Nothing staged, stashed or committed.

### The verdict first

**D11, the gate, reads FAIL at 100 folders and holds everywhere else.** HEAD is lower than the parent in 11 of 12
cells by its pooled median and no higher in the 12th (10 folders, one file added: 12.5 against 9 ms, inside `noise`).
At 500 folders it is lower in every cell and both block pairs, by a factor of 8 to 17. At 100 folders it is lower by
median in every kind, but in three of the four kinds not by the `noise` margin D11 asks for. The parent's two blocks
there disagreed by 15 to 21 ms, for example nothing changed read 16.5 and 0 ms. **Dropping a part would not help**:
D1 alone adds no thread time, and taking D3 away puts back the 102 writes a change at 100 folders. So the main session
or the operator has to rule on D11's `noise` term at 100 folders. The integrator did not drop anything. **The
CHANGELOG item is NOT written**, because §5 allows it only when D11 holds. Its text is ready in §5. **Two pre-existing
parent defects that HEAD no longer shows** were found along the way (arm V below, and arm I in the first full run).

### Files changed against `a28c2cf3` (`git diff --stat a28c2cf3` plus the untracked files)

| File | Who | Lines |
| --- | --- | --- |
| `src/renderer/tree/store.ts` | store | 949 (+383 −47) |
| `src/renderer/tree/__tests__/p372-one-write.test.ts` | store, NEW | 624, 32 tests (T1 to T14 and an extra T11 row) |
| `src/renderer/tree/__tests__/p372-oracle.test.ts` | probe, NEW | 819, 14 tests, 3,000 seeds of 40 steps |
| `build/p372/probe-p372.mjs` | probe, NEW; edited by the integrator (below) | 1,894 |
| `build/p372/CHECKLIST.md` | probe, NEW | 61 |
| `build/p372/fixtures/graders.json`, `fixtures/raw/parent{A,B,C}.json` | probe, NEW; `graders.json` edited by the integrator | 3,843, 1,613, 1,931, 1,327 |
| `build/p372/SPEC.md` | spec; §8's M and H rows and this section by the integrator | |
| `package.json` | integrator | +1: `probe:p372` after `probe:p371` |
| `build/verification-checks.mjs` | integrator | +17: `electron('probe:p372')` and its paragraph after `probe:p371`'s |
| `build/assert-electron-teardown.mjs` | integrator | `HELPER_USER_FLOOR` 195 → 196, with a paragraph naming `build/p372/probe-p372.mjs` |
| `build/p343/ablation.mjs` | integrator | `a-st5`'s `from` and `to` only (D12) |
| `CLAUDE.md` | integrator | +1 row in the probes table for `probe:p372`; no path-triggered row |

`CHANGELOG.md`, `docs/audits/contract-baseline.txt` and `build/background-fixtures.mjs` do not move.
`gate:contract` reads byte for byte. The parent worktree is clean at `a28c2cf3`.

### The seams as they met

- **The three exports**, from the store builder: `export const REFRESH_QUIET_MS = 8;`,
  `export const REFRESH_CAP_MS = 100;` and
  `export function sameListing(a: readonly FsDirEntry[] | undefined, b: readonly FsDirEntry[] | undefined): boolean`.
  The oracle imports all three. Under `npm test` it also requires the two constants to be 8 and 100.
- **D12, the carry line**, is now `      const next = prepare(carryLinkTargets(landing.entries, held));`. `a-st5` was
  re-anchored to it, with `to` set to `      const next = prepare(landing.entries);`. It still turns red its owner,
  p343-remote-links "keeps the kind its folder last had".
- **§3's byte-for-byte list holds.** Every line `git diff a28c2cf3 -- src/renderer/tree/store.ts` removes belongs to
  the local half: the `inFlight` and `queued` types, `readInto`'s body, `listInto`'s join and run, the three local
  `listInto` calls, `refreshLoaded`'s `rootError` write and its `Promise.all`. These do not move: `sortEntries`,
  `carryLinkTargets`, `prepare`, `RemoteTreeRead`, `REMOTE_IDLE`, `REMOTE_EXTRA_READS`, `treeInto`, the remote arms,
  and the header's Phase 90.3 and 343 paragraphs. The Phase 372 paragraphs are added after them. `fs-bridge.ts`,
  `tree-paths.ts`, `use-tree-model.ts`, `ignored.ts` and zustand do not move, so the probe's six anchors resolve at
  both builds.
- **Two texts of D11 disagreed.** §1 D11 sets the gate with its `noise` term. §8's M row said "the parent's median +
  5" and "below the parent's minimum". The probe grades §1. The integrator changed §8's row to point at §1, which is
  the governing text.

### The store builder's decisions this file did not state (reported by the builder and read by the integrator)

1. `sameEntry` compares in two loops with no shortcut on the key count, so a comparison that runs one way only can
   still turn T2 red.
2. A lazy `loadDir` does not ride a read that began before a `forgetUnder` of its folder. It waits for that read's
   answer and reads again (ablation a-T8c turns T8 red).
3. A read promised before a root switch is never started. The parent started it and then dropped its answer.
4. Each staged answer carries its own waiters, so a `forgetUnder` that drops it lets its caller go at once.
5. Stamps and forget records are cleared whenever no local read is out and nothing is staged (`pruneIdle`).
6. A person's read never re-arms the quiet timer. A person who joins a collected read stops it being counted.
7. The queued re-read now waits for the running read's ANSWER, not its landing (D7), and is removed from `queued`
   only while it is still the same entry.

### Ablations (store builder, in an APFS clone `scratch/p372/store/abl`, the worktree file never edited)

The control is 32 of 32 green. The parent's `store.ts` turns 24 of 32 red. Each arm turned these rows red:

| Arm | Rows turned red |
| --- | --- |
| a-T1 (no D1) | T1, T2's "link lost", T3's root row |
| a-T2n (names only) | 7 T2 rows |
| a-T2d (one direction) | T2's extra key, link gained, link lost, and sameListing |
| a-T3a / a-T3b | T1 and T3's root row / T3's child row |
| a-T4 (flush every answer) | T4, T5 ×2, T13 |
| a-T5q / a-T5c | T5's quiet row, T6, T13 / T5's trickle row |
| a-T6 | T6 and 8 others |
| a-T7 (no D4) | T7 |
| a-T8a / a-T8ab / a-T8c | T8 ×2 / T8 ×3 / T8's "loadDir after forget" |
| a-T9fs (both root-switch guards) | T9 |
| a-T10 (`inFlight` until the landing) | T10, T7, T11 |
| a-T11a / b / c | T11 ×3 / T11's extra read / T11's "takes it out of the collection" |
| a-T12 / a-T13 | T12, T13 / T13 |
| a-T14q / a-T14c | T14 |

Three arms stayed green, on purpose:
- **a-T8b**: the forget record alone already blocks a staged answer at the flush.
- **a-T9f and a-T9s**: either root-switch guard alone keeps the old project out.

So §7.1's "the flush not asking `rootSeq`" alone CANNOT turn T9 red. T9 goes red only when both guards are removed.

### The oracle (probe builder; re-run by the integrator)

- **HEAD**: 3,000 seeds of 40 steps, all six clauses held at every frame and at the end (9.0 s in the integrator's
  named run).
- **Parent `a28c2cf3`**: clause 6 failed in 3,000 of 3,000 seeds (for example, "a burst refresh of 2 changed folders
  wrote the cache 4 times"). Clause 3 failed in 1,139 (for example, "present from read 136 after forget … at 142").
- **Ablated stores**:
  - D3 writing every answer: clause 6 failed in 1,382 seeds.
  - D4 removed: clause 2 failed in 171.
  - D5 removed: clause 3 failed in 1,288, and clause 2 in 2.

### The integrator's commands (§11), in order

| # | Command | Exit | Reading |
| --- | --- | --- | --- |
| 1 | `npm run typecheck` (history block) | 0 | import boundaries, no cycles, shared types OK |
| 2 | `node build/contract-inventory.mjs --check` | 0 | byte for byte; again 0 after the probe edits and inside `npm run build` |
| 3 | `npm test` (history block, scratch HOME, 80 s, load 40 to 25) | 1 | 24,218 passed, 24 skipped, 5 failed of 24,247; 1,252 of 1,260 files. The four `/bin/ps` tests are the named expected failures: `process-table.native` ×1, `ps.native` ×2 and `p269-env-names` ×1. The fifth is `src/main/preview/__tests__/protocol.test.ts` "sits behind a symlink", which fails only because the sandbox's TMPDIR is already a real path. With `TMPDIR` through `/var/tmp` it passes 36 of 36 (exit 0). |
| 4 | `vitest run` by name: the 2 new files and the 19 unedited ones of §7.1 (filters also matched 3 neighbours) | 0 | 24 files, 451 tests, every unedited row unedited |
| 5 | `node build/p343/ablation.mjs --self-test` | 0 | 16 fixtures |
| 5 | `P343_ONLY=a-st1,…,a-st6 node build/p343/ablation.mjs` (load 53) | 0 | base green, 121 cases; all 6 arms red on their owners; the clone restored by sha256 and removed; 6.4 s |
| 6 | `git diff a28c2cf3 -- src/renderer/tree/store.ts`; `git diff --stat a28c2cf3 -- src/ build/ CLAUDE.md CHANGELOG.md package.json docs/` | 0 | only §9.1's files (above) |
| 7 | `npm run build` (history block, 52 s) | 0 | `gate:electron` 196 against a floor of 196; `gate:background` 4 starters, all ended in a `finally`; `gate:checks` 300 check scripts classified, `probe:p372` among them; `gate:contract` byte for byte. The three gates were re-run alone after the probe edits: each 0 |
| 8 | `node build/p372/probe-p372.mjs --grader-self-test` / `--preflight` | 0 / 0 | as built: 10 graders, 39 clauses, 28 needs, 56 fields, 18 raw inputs. After the integrator's edits: 40 clauses, 28 needs, 57 fields, 23 raw inputs (59 values). Preflight 36 checks |
| 9 | the smoke: `P372_ARMS=M P372_NS=10,100 P372_BLOCKS=1` (development), slot `electron.lock`, 05:03 to 05:27 | 2 (expected) | M UNREADABLE, needing two blocks; RUN PASS |
| — | **the whole probe**, every arm at both builds, `P372_KEEP=1`, slot `electron.lock`, 05:27 to 07:13 | 1 | 6,350 s, load averages 7 to 213 (his own `runstory` go tests and system indexing at the peak; ours was one idle Electron). M FAIL (D11 at 100); L, E, R and RUN PASS; H, V, O, S and I UNREADABLE (instrument defects, fixed below) |
| — | the re-run of the five arms after the probe fixes, `P372_ARMS=H,V,O,S,I`, slot `electron.lock`, 07:19 to 07:33 | 1 | 824 s, load 8 to 51. V, O, S, I and RUN PASS. H FAILED one clause by 3 ms; that clause was then fixed and re-graded by hand (below) |
| 10 | the Electron count (CLAUDE.md's command), the socket check, the history stats, the leftovers | 0 | only his processes: his Tortie 50568, its crash handler, and Chrome's, Cursor's, Slack's and Granola's crash handlers. No `p372` socket under `/private/tmp/tmux-501/`. No process names the integrator's scratch. All three lock slots free. No `p343-ablation-*` clone left. History `751928 1795563175`, `23166 1790702242` at the start, before and after every run, and at the end |

### Arm M, the matrix (the whole run: parent1, HEAD1, parent2, HEAD2; 16 changes a cell a build)

Each cell reads the window's thread a change: `TaskDuration` over the change's window less the idle window after it,
in ms. Each entry is the pooled median, then the two block medians in brackets. The load is the 1-minute load at the
cell's start. The integrator's own reader over `raw-<label>.json` gives the same pooled medians, block medians and
`noise` as `derive` in all 12 cells.

| Cell | parent | HEAD | noise | D11 | script (parent / HEAD) | timer lateness (p / H) | load (p / H) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 10 same | 2 [3, 2] | 0.5 [0.5, 4] | 10 | not higher | 1.5, 1 / 0.5, 1 | 0 / 0 | 17.9, 38.9 / 19.6, 15.8 |
| 10 addEarly | 13 [12.5, 15] | 12 [12.5, 10] | 10 | not higher | 4.5, 5 / 4, 4 | 0 / 0 | 24.9, 39.7 / 16.1, 11.4 |
| 10 add | 9 [10.5, 9] | 12.5 [15.5, 11.5] | 10 | not higher (+3.5) | 3.5, 4 / 7, 4 | 0 / 2, 0 | 14, 21.3 / 10.2, 10.2 |
| 10 branch | 12 [11.5, 13] | 4 [6, 1] | 10 | not higher | 5, 5 / 2, 1 | 0 / 0 | 10.4, 15 / 9.3, 23.9 |
| 100 same | 8.5 [16.5, 0] | 3 [3, 4] | 16.5 | **lower FAILS** | 11, 7.5 / 0.5, 1 | 4, 4.5 / 0 | 32.1, 8.1 / 34.7, 28.1 |
| 100 addEarly | 21.5 [16.5, 31.5] | 13 [12.5, 13] | 15 | **lower FAILS** | 11.5, 21.5 / 4, 5 | 8, 20 / 0 | 18.4, 7.5 / 33.2, 15.7 |
| 100 add | 23 [20.5, 41.5] | 14 [13.5, 16.5] | 21 | **lower FAILS** | 12, 24.5 / 3.5, 5.5 | 0, 15 / 0 | 25.5, 22.8 / 30.6, 20.9 |
| 100 branch | 51 [51.5, 47] | 11.5 [10, 19] | 10 | lower | 38, 46 / 3, 5 | 33.5, 48.5 / 0 | 33.6, 31.2 / 27.3, 11.7 |
| 500 same | 199 [202.5, 190.5] | 12.5 [15.5, 9] | 12 | lower, both pairs | 172, 163.5 / 3.5, 1.5 | 177, 178 / 0 | 38.4, 18.8 / 36, 18.5 |
| 500 addEarly | 171.5 [169.5, 172.5] | 22 [17.5, 24] | 10 | lower, both pairs | 138, 138 / 4.5, 7 | 152.5, 156.5 / 4, 2.5 | 23.4, 11.8 / 15.4, 15.8 |
| 500 add | 221.5 [222.5, 210.5] | 22 [17.5, 22] | 12 | lower, both pairs | 188.5, 174 / 4.5, 6 | 203, 186.5 / 0 | 26.9, 25.4 / 8.6, 14.8 |
| 500 branch | 408 [396, 426] | 23.5 [8.5, 23.5] | 30 | lower, both pairs | 349, 373.5 / 1.5, 6 | 383.5, 411.5 / 2, 2.5 | 25, 21.2 / 6.8, 17.3 |

On `ScriptDuration`, which is printed and not graded, HEAD reads 0.5 to 5.5 ms a change at 100 folders against the
parent's 7.5 to 46 (block medians). The longest block at 500 folders fell from 133 to 410 ms at the parent to 0 to
11 ms at HEAD.

**The counts** (three changes a kind, both blocks, six readings a cell; the smoke read the same):

| | 10 | 100 | 500 |
| --- | --- | --- | --- |
| reads, both builds, every kind | 12 | 102 | 502 |
| parent writes, model passes and tree-input passes, every kind | 12 | 102 | 502 |
| HEAD writes and model passes: nothing changed / one file added / branch | 0 / 1 / 1 | 0 / 1 / 1 | 0 / 1 / 1 |
| HEAD ignore-store syncs | 0 to 2 | 0 to 2 | 0 to 2 |
| HEAD renders of the model hook | 2 to 5 | 2 to 5 | 2 to 5 |
| parent renders: nothing changed, one file added, branch | 14 to 16, 15 to 16, 19 to 20 | 104 to 106, 105 to 106, 154 to 155 | 504 to 505, 505 to 506, 754 to 755 |

### The other arms, beside the parent

| Arm | Reading (parent → HEAD, median ms) | Verdict |
| --- | --- | --- |
| **L**, a new file from its write to its row | 10 folders: read last 475.5 → 473.5, read first 472 → 474. 500 folders: read last **686.5 → 488.5**, read first **532 → 488** | PASS |
| **E**, an expand of `0x/` | quiet 4 → 4.5; held 2.5 → 3.5 | PASS |
| **R**, Refresh pressed inside the watcher's delay | quiet **212.5 → 22**; held 217 → 27; Phase 155's second read of the held folder after its held read, every press | PASS |
| **H**, one folder held 5 s (re-run) | other folders at 10: 475 → 480.5 and 475 → 481.5. At 500: 674 → 495.5 and 528.5 → 494. The held folder's own file, at 10: 5,594 → 5,496; at 500: 5,495 → 5,509. One write when it lands, at both builds | FAIL as run, on the clause fixed below. Re-graded by hand with the fixed clause: PASS (5,496 ≤ 5,611, 5,509 ≤ 5,512) |
| **V**, a folder removed from outside (re-run) | **at the parent the removed folder's row is STILL DRAWN 17.5 s later, 5 of 5, though its cache key is gone. HEAD takes it away in 490 ms (486 to 497)**, with no key after it | PASS |
| **O**, the tree's verbs (re-run) | 23 of 23 steps ok at both builds, quiet and held. Every row the parent drew was drawn at HEAD within one frame (for example, the second mkdir 2,024 → 1,690 ms) | PASS |
| **S**, a switch mid-collection (re-run) | the 10 shown at both builds, 1,116 HEAD frames, 0 rows of the 500 drawn, both new files drawn after the return | PASS |
| **I**, the ignore store (re-run) | a new ignored file 502 → 508.5; a rule added 499 → 492 (the first add 2,312 and 2,338 at both); taken away 484 → 482; 0 bad frames of 2,400 | PASS |

**The parent's ghost row (arm V), for the main session.** At `a28c2cf3`, an open folder removed from outside at 500
open folders leaves its row in the Explorer. In the re-run every one of five rows was still drawn 17.5 s after its
`rm -rf`, although the folder's cache key was gone. HEAD draws them gone in under half a second. The integrator's
reading of the cause, which has not been proved: at the parent the root's listing and the folder's failed read land in
two writes, and the model's diff never takes away the folder row the first write left implied. HEAD lands both in one
write. This is a fix a person would notice, beyond what the entry claims. The verifier should confirm it before
anyone says so.

**The parent's rule that never showed (arm I, first full run only).** In the first full run, arm I ran at 100 folders
after that launch's M changes there. There, the parent never dimmed an untracked file whose `.gitignore` rule was added: 3 of 3
within 6 s; the undim after each read at once (3 to 7 ms), so it was never dimmed. HEAD dimmed it at 486 ms. In the re-run, with no M before it, both builds dimmed it. So
it is a parent behaviour that depends on its state. It is recorded and not explained.

### What the integrator changed in the probe builder's files, and why (each found by the first full run)

1. **O's need** asked that every event the parent drew was read at HEAD, but required EVERY event to be a number.
   The shot drive's own `<dir>/p37/` rows are not tracked, so they are null at both builds. The need and both clauses
   now range over the events the parent drew (`drawnBy`).
2. **S's marker** was `ten.txt`, which sorts below every row the tree draws, so "the 10 is shown" was never seen at
   either build. A folder `00ten/` is added to the 10 repository; it sorts first and is not remembered, so it is not
   cached and N+2 still holds. The marker is `00ten/`.
3. **H's own file** went into `d0003`, whose rows sit below what the tree draws once `d0001` and `d0002` hold the run's
   new files, so it read null at both builds. `d0001` and `d0002` are folded by a click before it (a fold keeps the
   cache) and opened again in the `finally` (`foldAbove`).
4. **H's own-file clause** was bounded by 5 s plus the parent's latency in ANOTHER folder. The parent failed that bound
   itself by 98 ms at 10 folders (5,594 against 5,493), so it was no regression test. It now reads "no later than the
   parent's own reading + one frame". §8's H row says so.
5. **V** waits 15 s rather than 6, and records whether the row is still drawn when the wait ends (`stillDrawn`). A row
   the parent still draws is a READING of the parent, counted as `never`. The need now asks for every row gone at
   HEAD, and at the parent for each row either gone or read as still drawn. The clause passes when HEAD takes the rows
   away and the parent never did. `parent.gone` is no longer a read field; `parent.missing` and `parent.never` are.
6. **I** waits 15 s for a rule add. On a timeout it reads whether the row is drawn undimmed (`ruleAddNever`). A parent
   rule that never showed is a reading, and the undim after it, which is instant because nothing was dimmed, is left
   out. Clause added: "at HEAD a rule added always shows". `parent.ruleAdd` and `parent.ruleRemove` are no longer read
   fields; `parent.missing` and `parent.ruleAddNever` are.
7. `graders.json`: the renamed needs and clauses, the H broken case moved to 5,708 against the parent's own 5,690, a
   broken case for the new I clause, and five raw cases for the new readings (V's parent never with HEAD gone, a
   parent row unread, HEAD never too; I's parent never, and an unread timeout). The self-test passes with every
   clause red alone and every need unreadable alone.

### Not run, and why

- `smoke`, `smoke:t1`, `smoke:t3` and the package: the main session's, at landing.
- `probe:p343`'s seven arms (§7.3): the verifier's.
- `conformance:resume*`: they start real agents.
- The attack with the builds reversed (`P372_HEAD_FIRST=1`): the verifier's (§10).
- The whole probe was not run a second time after the probe edits. Only the five edited arms were, and H's last
  clause fix was re-graded by hand, because importing the probe to grade a stored run is against the rules. The
  verifier's whole run is the first to grade every arm live with the probe as it now stands.
