# Phase 364 — "4. sounds good" — a diagnostic Tortie he runs as his everyday app — SPEC

Written by the spec step on 2026-11-09 in `/private/var/tmp/tortie-wt/wt-p364`, a detached worktree at origin/main
`3c0ac355` ("docs(backlog): Electron at the newest 43.x, landed"; Phase 366 landed at `f8366346`: Electron 43.8.7,
NODE_MODULE_VERSION 148). **`git diff 3c0ac355` in the worktree must be exactly Phase 364's delta**, this file included.
origin/main moves while the phase runs; nobody here rebases, pulls or merges; the main session moves the tree at
landing. The charter is `docs/BACKLOG.md` "## Phase 364" (`:45132`), research 143 (§2.2, §2.3, §5, §6, §9.2),
research 144 §6 ("The diagnostic build goes ahead unchanged"), `build/p3571/SPEC.md` D7 and its CS arms, and
`build/p357/probe-p357.mjs`'s crash arm (`buildCheckingBs3`, the hook, the `[p358adv-PLANT]`, `[p358adv-VIOLATION]` and
`[p358adv-SEGV]` lines), bound as written except where §0.1 says the tree or a measurement wins. His word, 2026-11-08
("4. sounds good"). His standing rulings bind: **no regression against today** (a scenario worse than the parent is a
defect: fix it or drop the part, and name which); Tortie never ends a session on its own; just enough words; no tmux
vocabulary in anything a person reads; nothing released, tagged, version-bumped, archived or uploaded; refusal 1 (the
checker is first-party C compiled into the SQLite Tortie already chose; nothing third-party is added); his session
count is allowed (`build/electron-run.mjs`'s read-only census).

**Research 143's checker sources are gone** (`build/p362/SPEC.md` §0.1 item 7: `adv-churn/tools/pcache-check-append.c`
and `hook-bs3.cjs` went with 357.1's scratch). The spec step REBUILT the checker from research 143's words and
probe-p357's interface, in scratch, and measured that it reproduces research 143 §2.3 inside Electron 43.8.7's main
process (§2). This phase commits that source to the tree (§4.1), so it cannot be lost again.

| | |
| --- | --- |
| Subject | `build(diagnostic): a Tortie that names what damaged the session list` (the entry's) |
| First body line | `Phase 364: a diagnostic Tortie that catches the session list's damage in the act` (the entry's) |
| Semver | **None.** The normal app does not change (measured, §2.5, D3); the diagnostic build is never published, never offered by the updater, never tagged |
| Lane | Build: Spec → Build (SIX builders, disjoint files) → Integrate → Verify (two lenses) → [Fix once → Reverify] → Commit |
| Tier | **3**: it runs on his Mac as his everyday app, over his real sessions and his real session list, with a changed native module, so it can lose or corrupt his work if it is wrong (CLAUDE.md:268). Parent measured (§2.6); two independent methods at least, one an attack (§10) |
| Menus | **No row added, renamed or removed** in either build. In the diagnostic build "Check for Updates…" answers one diagnostic sentence (§5) |
| Contract | **Does not move**: no invoke channel, no `GMUX_*` name, no schema, no smoke mode, no `gmux.*` key. The new names `TORTIE_DIAGNOSTIC`, `TORTIE_DIAGNOSTIC_NODE`, `TORTIE_CHECKER` and `P364_*` are not `GMUX_*`, so `gate:contract` must read byte for byte |
| `HELPER_USER_FLOOR` | **187 → 188**: `build/p364/probe-p364.mjs` reaches `build/electron-run.mjs` (obligation 1). Nothing else new reaches it |
| CLAUDE.md | Two rows: `conformance:diagnostic` (path-triggered) and `probe:p364` (the probes table) |
| CHANGELOG | **None**: the normal app does not change |

## 0. The hard rules, stated once (every builder, the integrator, every verifier, the fixer, the reverifier)

- NEVER commit, stage or stash. `/Users/gdc/gmux` is read only. Never touch another phase's worktree or scratch
  (`wt-p359*`, `wt-p360*` and `wt-p3251*` wait on his answers). Scratch lives under
  `/private/var/tmp/tortie-wt/scratch/p364/<role>/`, never under `/private/tmp`; a probe's `TMPDIR` points there too,
  and for `npm test` it is spelled through `/var/tmp/…` (Phase 365's finding: `preview/__tests__/protocol.test.ts`
  needs `tmpdir()` behind a symlink).
- **THE PARENT** is `/private/var/tmp/tortie-wt/wt-p364-parent` (`3c0ac355`, the same commit, the normal app), built
  once by the spec step (`out/` at 15:35, 509 files, byte-identical to this worktree's `out/` before any change, §2.5).
  Never install, edit or rebuild anything in it: run harness lines directly there, never an npm script that begins with
  `npm run build`, and package it as §2.6 did (the package script's read-only checks, then `electron-builder`, so `out/`
  is not rebuilt), removing its `release/` afterwards.
- **What may be built, and the one download.** The checking better-sqlite3 is compiled from better-sqlite3 13.0.3's own
  sources as the lockfile pins them, NEVER edited in place: `build/diagnostic/build-checker.mjs` (§4.1) `cp -Rc`s the
  package into its own `--out` folder first. node-gyp is the one in `node_modules`. The one download allowed is Electron
  43.8.7's own headers for node-gyp, into a HOME under your scratch; they are already fetched at
  `/private/var/tmp/tortie-wt/scratch/p364/install-home/.electron-gyp/43.8.7` (installVersion 11) and copied by the spec
  step to `…/scratch/p364/spec/home/.electron-gyp/43.8.7`: `cp -Rc` one of them into your own scratch HOME and nothing
  downloads. No `npm install`, no package added to `package.json`, nothing global, nothing in `/Users/gdc/gmux`,
  nothing in the parent. Anything more is a question for him: stop and say exactly what.
- **The spec step's instruments are kept; read them, do not import them.** `…/scratch/p364/spec/checker/` holds the
  rebuilt checker and its harness (§2.7); `…/spec/bs3-test`, `…/spec/bs3-diag`, `…/spec/bs3-plain` the three built
  variants; `…/spec/dce/` the dead-code prototype (a `cp -Rc` clone with its `.git` removed, holding the prototype JS
  and a packaged prototype diagnostic app under `release/mac-arm64`); `…/spec/logs/` every reading. A builder COPIES
  what it needs into the tree; nothing in scratch is the source of truth once §4's files exist.
- `-L gmux` is named only by `build/electron-run.mjs`'s census, and only with `list-sessions`.
- **No real agent runs, not even for a version.** Every app launch hides every probed registry row
  (`writeHiddenAgents(profile, prefix, hiddenAgentsBesides([]))`) and reads `agents:list` back
  (`standInsOnlyVerdict`); a run whose answer is not ok is UNREADABLE. Every arm here needs shells or nothing.
  `conformance:resume:capture` and the full `conformance:resume` start real agents and are NOT run.
- Never read his keychain (every launch passes `--use-mock-keychain`), credentials, `~/.ssh`, `~/Keys`, `~/.claude`,
  `~/.codex`, any agent's or conversation store, his shell history's contents, his live Tortie profile or his app.log.
  Real data is his recorded shape through `build/p3167/seed-sessions.mts --shape his` (counts only). A Codex state
  database the probe needs is a scratch fixture under the run's scratch HOME, never his.
- **His crash reports.** Count `~/Library/Logs/DiagnosticReports` (and its `Retired/`) by NAME and mtime only, before and
  after every run that can crash (the spec step's lister is `…/spec/checker/reports.sh`); name what your run added;
  never open a report. The TEST checker's own SIGSEGV handler (`P358ADV_SEGV_EXIT=1`) prints its line and exits 139
  before any macOS report or Crashpad dump is written (measured: 8 deliberate faults, 0 reports, 0 dumps, §2.7). A
  Crashpad dump under YOUR scratch profile is read for its existence and deleted (it holds the environment). Keep
  deliberate crashes to the few each measurement needs and say how many.
- **His shell history is never written by us.** Every command that does not launch an Electron or need `/bin/ps` or
  `lsof` runs under `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb`; the four `/bin/ps` native tests
  fail inside it by design (`process-table.native` ×1, `ps.native` ×2, `p269-env-names` ×1; name each as it fails).
  What needs Electron, `/bin/ps` or `lsof` runs outside it under `zsh -f` with `HOME` and `ZDOTDIR` in scratch,
  `HISTFILE=/dev/null`, `SHELL=/bin/sh`, `SHELL_SESSION_HISTORY=0`, and every `CLAUDE*`, `CSC_*`, `APPLE_*`, `GMUX_*`,
  `TMUX*`, `SSH_AUTH_SOCK`, `SECURITYSESSIONID`, `GH_TOKEN`, `GITHUB_TOKEN`, `TERM_SESSION_ID` and `TERM_PROGRAM*`
  variable unset (`…/spec/checker/lockrun.sh` is the shape). Record only `stat -f '%z %m' ~/.zsh_history
  ~/.bash_history` before and after every run (`743319 1794200266` and `23166 1790702242`, unmoved across every run of
  the spec step). A move across an unblocked run: start nothing for 3 minutes and stat again; moved again is his; still
  moved means STOP and report.
- Never `pkill`, `killall`, a `pgrep` pattern or a negative pid; end only pids you started, each read again by
  `ps -p <pid> -o command=` right before its signal; every process you start ends in a `finally`. Never signal a probe
  while its own teardown runs. **His Tortie (pid 692) has the same bundle id as every build you run, the diagnostic one
  included**: never an Apple Event, `osascript` or `open`; never copy, install or move any app into `/Applications` or
  `~/Applications`, never register one with LaunchServices by hand; a packaged app (normal or diagnostic) is launched
  only through `withElectron` with an absolute program path or `program: 'packaged'` and a scratch profile, and
  `release/` is removed after. A quit is pressed through the native Quit row in main (`item.click()`), `app.emit`, or
  the harness.
- Every Electron goes through `build/electron-run.mjs` inside `build/harness-socket.mjs`, with a scratch profile,
  `HOME` and socket. `smoke`, `smoke:t1` and `smoke:t3` start Electron outside the helper and are the MAIN SESSION's
  alone, at landing; `smoke:quit`, `smoke:quitdoors` and `smoke:fault` may be run, each under a lock slot. No Simulator.
  No real Tailscale, DNS, APNs or ssh; never `smoke:remote` or `smoke:machines`. Never import a `build/` script to
  inspect it; read it as text (importing a helper to USE it, as every probe does, is fine).
- **A NORMAL packaged app's updater checks GitHub 30 s after it starts** (`src/main/updates/updater.ts:125`, `:412`).
  So every normal packaged launch either ends inside 25 s or runs with `GMUX_UPDATE_REHEARSAL=1` and
  `TORTIE_UPDATE_FEED` naming a loopback URL the run holds (the sanctioned rehearsal gate, `updater.ts:58-73`, which
  needs the scratch socket and a `--user-data-dir`): no update check ever resolves a real host.
- **The lock has three slots, shared**: `zsh /private/tmp/tortie-ops/lock.sh try p364-<role>` prints the slot or exits
  1 (retry every 60 s in a NEW command); release it from a trap, ONCE, and only while the slot's `owner` file is still
  yours. Every probe, smoke, package or Electron run holds one. `df -h /` before any build, install or clone; under 8 GB
  free, wait and report (43 to 45 GiB free at the spec step).
- **PACKAGING IS UNSIGNED, ALWAYS**: `CSC_IDENTITY_AUTO_DISCOVERY=false`, every `CSC_*`, `APPLE_*`, `GH_TOKEN` and
  `GITHUB_TOKEN` unset, `-c.mac.identity=null` on every electron-builder run, the diagnostic one included; never
  `--publish`, never notarize or staple, never `build/verify-signed.mjs` against his identity. A package log naming
  `identityName=Developer ID` is a defect reported at once. **A package step runs with `HOME` in your scratch**, holding a
  `cp -c` of the 43.8.7 zip at `Library/Caches/electron/7f040e817a384b63b39fe629645d6ba50ce04dcd85c0fa3478bdbe8184077bd1/`
  (from `/private/var/tmp/tortie-wt/scratch/p364/electron-cache`), and `ELECTRON_BUILDER_CACHE` set to
  `/Users/gdc/Library/Caches/electron-builder` (read only, already filled), so nothing downloads into his home.
- **The release lane is written and checked, never run.** Its diagnostic path (§4.7) is checked by reading and by
  running its scripts locally with every sign, notarize, staple and upload step stubbed; never `gh`, never a push, never
  a `workflow_dispatch`, never a tag. His word at the signing step comes later, through the main session.
- **Reads off the machine**: `npm view`, SQLite's and better-sqlite3's own sources and docs, unauthenticated (`curl` or
  WebFetch, read only, post nothing); never `gh`.

## 0.1 What the entry and the parent reading give, measured (the tree and the measurements win; each binds)

1. **The checker is rebuilt and reproduces research 143 §2.3 in Electron 43.8.7's main process** (§2.1 to §2.3). With
   the crash's own header state planted in a line SQLite allocated on its own (the LRU's oldest such line leaves the hash
   and its owner reads 0, 357.1's plant), 40 of 40 reads and 2 of 2 writes answered, a fresh connection's
   `integrity_check` read `ok`, and the close faulted: `[p358adv-SEGV] signal 11 at address 0x34, pc … =
   pcache1EnforceMaxPage+0x68`, exit 139, which is his report's frame and offset (research 143 §2.1: `+104`). With the
   page bytes zeroed and the header intact, 10 of 40 reads raised `SQLITE_CORRUPT`, a fresh connection read `ok`, and the
   close was clean (exit 0). Both are research 143 §2.3's two findings, at the Electron he will keep.
2. **The guard keeps SQLite's lines in their slot class** (§2.1). In Electron 43.8.7's main process a guarded page line
   asks for 4,384 bytes (4,368 + 16) and is handed 4,600 usable bytes, as 4,368 is; requests of 4,096, 4,104, 4,368,
   4,384 and 4,600 all get 4,600 usable bytes, 4,601 and 4,608 get 5,112; consecutive lines sit 4,608 bytes (`0x1200`)
   apart; every line is in the default zone (`DefaultMallocZone`, PartitionAlloc's shim, research 143 §2.2's 744 of 744).
   So the 16 bytes move no line out of the class the foreign 4 KB blocks share, which is what the reading needs.
3. **Research 143 §5's reading works on PartitionAlloc, measured** (§2.3): a foreign free of a line's slot leaves
   `0000000000000000 ffffffffffffffff` in the guard (an encoded free-list pointer and its inverse) and the header
   intact; a foreign free then `calloc(1, 4096)` takes the same slot back and leaves zeros in both the guard and the
   header, and NO read fails; a `malloc(4096)` that writes its bytes takes the same slot and leaves its own bytes in the
   guard with the header intact, and reads raise `SQLITE_CORRUPT`; a stray write leaves its words, and the checker names
   `libsystem_malloc.dylib!malloc_zone_malloc` for the pointer in it. **In plain node the allocator is libmalloc and the
   readings differ** (its free writes `1f01000069652d67 0000000000000000` and a calloc of 4,096 does not take a 4,384
   slot back): the reading table is PartitionAlloc's, and every proof of it runs in Electron's main process.
4. **The checker never faults on damage and finds nothing on a healthy app** (§2.4). Every read through a pointer that
   came from memory asks the kernel for the VM region first (`mach_vm_region`, cached per walk). Over his recorded shape
   in the real app, through the checking build, 0 lines and 0 violations in 4 launches; in the packaged prototype, 0 in 3.
5. **Its cost is not measurable on his shape** (§2.4). A walk of a 1,295-line cache costs about 37 µs; one walk per
   thread per 25 ms (and always at a close) makes `get`, `digest` and `write` read the same as the prebuild in plain
   node and in Electron. Over his shape: launch to the drawn list 605 to 660 ms normal (9 runs) against 611 to 794 with
   the checker (3 runs, the 794 the first launch of its batch, as the normal batch's first was 660), refresh median 1.4 to
   1.8 ms against 1.4 to 1.7, main's RSS about 210 MB against about 211 MB, quit 282 to 296 ms against 283 to 288.
6. **The normal build can stay byte for byte** (§2.5). This worktree's `out/` and the parent's are identical (509
   files): the build is deterministic. A prototype of this design (one `DIAGNOSTIC_BUILD` const, `if (DIAGNOSTIC_BUILD)`
   statements, the About mark in the build stamp) built the normal `out/` byte-identical to today's with the stamp
   normalised, and the diagnostic `out/` differs only in `out/main/index.js`. A conditional EXPRESSION is not folded:
   `applicationVersion: false ? … : app.getVersion()` survived into the normal bundle and changed it. So D3's rule:
   the flag is read only as the whole test of an `if` statement.
7. **The packaged diagnostic works end to end, prototyped** (§2.5). `TORTIE_DIAGNOSTIC=1 electron-vite build`, then
   `electron-builder --mac --dir -c.mac.identity=null -c.afterPack=<swap, then the normal after-pack> -c.publish=null`:
   the swap landed (prebuild `98e0e8ac…` → checking build `2333f654…`), the normal after-pack's arm64 assertion ran over
   it (27 Mach-O files), there is NO `Contents/Resources/app-update.yml` and NO `latest-mac.yml`, the bundle id is
   `com.itavero.tortie`, and a launch on his shape wrote the checker's `diagnostic.armed` line into the app's own
   `app.log` through the real handshake. Its first build wrote nothing there: the handshake ran before `<userData>/logs`
   existed, so the C side's `open` failed and its line went to stderr. Hence D7: the handshake makes the folder first.
8. **probe:p357's crash arm runs on the rebuilt checker** (§2.6): `P357_ARMS=CS` with `P3571_BS3` and
   `P3571_HOOK_BS3` naming the spec step's build and hook: CS-head PASS (planted, no read failed, the quit by the
   will-quit SIGKILL, the relaunch keeps 105 sessions with the same ids, `localStorage` 3 of 3, the Settings bounds), RUN
   PASS. **CS-parent FAILs by construction at this parent**: it describes 357 as landed (`32180e60`), whose quit closed
   the session list; `3c0ac355` holds it (357.1, 362), so its quit ends by the SIGKILL too. The SIGSEGV in Electron is
   §0.1 item 1's own scratch arm, which closes explicitly.
9. **A damaged fresh connection crashes at ITS close, and only a synchronous line can record it** (§2.2). With the plant
   aimed at the read-only connection (`P358ADV_PLANT_READONLY=1`), it landed at that connection's own close walk and the
   close faulted at `pcache1EnforceMaxPage+0x68`. The ring's and the integrity check's fresh connections
   (`src/main/manifest/recovery.ts:163`, `:257`, `src/main/db/integrity.ts:211`) close within one call. So the C side
   writes the one line itself, synchronously, before the close it checks; a JavaScript poll would lose exactly this case.
10. **Going back must not meet a newer schema.** `git diff v0.114.1 3c0ac355 -- src/main/manifest/schema.ts
    src/main/db/schema-version.ts` is empty today. A diagnostic built later from a main with a new migration would move
    his session list to a schema the last release refuses (its refusal screen, `src/main/notice/refusal-screen.ts`). D14.
11. **The parent battery** (§2.6): `npm run build` exit 0 in 53 s (`gate:electron` 187 of 586 against 187);
    `npm test` 22,915 passed, 7 failed, 23 skipped of 22,945 in 88 s (the four `/bin/ps` tests, and three
    `resolve.test.ts` fork tests under a load average of 13 to 19 that pass 40 of 40 alone, twice); `smoke:quit` PASS
    (held: SIGKILL after 3,783 ms; teardown: exit 0 after 1,759 ms); `smoke:quitdoors` 9 of 9, SIGKILL after 1,816 ms;
    the unsigned package in 31.9 s with no Developer ID; the packaged launch on his shape, list 597 to 790 ms, quit 285 to
    289 ms.

## 1. The answer first

| # | What | One line |
| --- | --- | --- |
| 1 | The checker | `build/diagnostic/sqlite-checker.c`, appended to a COPY of the pinned amalgamation: a 16-byte guard on every SQLite allocation (`SQLITE_CONFIG_MALLOC` at load, the default allocator underneath), a walk of each thread's page caches at every JavaScript call into SQLite (at most one per 25 ms per thread, always at a close), and ONE line on the first failed check, written by the C side itself into `app.log` |
| 2 | Its build | `build/diagnostic/build-checker.mjs --variant diagnostic\|test --out <dir> --devdir <dir>`: refuses another better-sqlite3, another amalgamation (by sha256), a missing anchor, a missing devdir or a target that is not the installed Electron; the same command on this Mac and in the lane |
| 3 | The main-process half | `src/main/diagnostic-build/`: `DIAGNOSTIC_BUILD` (the one flag), the handshake that tells the C side where `app.log` is, and the watcher, terminal and door events; every use an `if (DIAGNOSTIC_BUILD)` statement, so the normal `out/` stays byte for byte |
| 4 | The package | `build/diagnostic/package.mjs`: `TORTIE_DIAGNOSTIC=1` build, then electron-builder with `build/diagnostic/after-pack.cjs` (swap the prebuild in the PACKED app, prove it by sha256, then run the normal after-pack), `-c.publish=null`, a `-diagnostic-` artifact name; same bundle id, same data folder, "Diagnostic" in About through the build stamp |
| 5 | The plant | In the TEST variant only (`#ifdef TCHK_PLANT`): research 143's states and the §5 shapes, driven by `P358ADV_*`. The diagnostic variant holds none of it, measured: 0 `P358ADV` strings, 0 `[p358adv-` lines, no `sigaction` import |
| 6 | The updater | Off in the diagnostic build by default: no check, no download, no feed file; "Check for Updates…" says so. His choice in §14 |
| 7 | The lane | A `diagnostic` job in `.github/workflows/release.yml`, on `workflow_dispatch` with `diagnostic: true` only: builds, signs, notarizes and staples the diagnostic DMG and uploads it as a workflow artifact; no release, no tag, no feed |
| 8 | The proof | `probe:p364` (§8), `conformance:diagnostic` (§7.1), the checker's self-test with compile-time ablations (§4.1), and the two lenses (§10) |

### 1.1 The decisions, each with its reason

| Id | Decision | Reason (where it comes from) |
| --- | --- | --- |
| D1 | **The checker is one C file appended to a COPY of the amalgamation**, plus four one-line breadcrumbs in the copy's C++: research 143's two (`StatementIterator::Next` before `db_state->busy = true;`, `Database::CloseHandles` before `sqlite3_close`) and two more (`STATEMENT_START`, which `run`, `get` and `all` share, and `Database::JS_exec`), each calling `p358adv_on_entry(op, db, stmt)` | It must read pcache1's private structures (`PgHdr1`, `PCache1`, `PGroup`, `sqlite3.c:57801-57890`), so it lives in SQLite's translation unit (research 143's method). The two extra breadcrumbs make every JavaScript call into SQLite an entry, so a `get` or an `all` on any connection, not only an `iterate`, is checked. The name `p358adv_on_entry` and the env and line formats stay research 143's, so probe-p357's CS arms run on it (§0.1 item 8) |
| D2 | **The guard**: 16 bytes, `tortie-guard-364`, in front of every SQLite allocation; installed by a constructor at load with `SQLITE_CONFIG_GETMALLOC` then `SQLITE_CONFIG_MALLOC` before any connection opens; `xMalloc(n)` asks the default allocator for `n + 16`; `xSize` answers the usable size less 16; `xFree` and `xRealloc` check the guard first. It never initialises SQLite itself | Research 143 §5 item 1; §0.1 item 2 (4,384 stays in the 4,600 class). The constructor does not call `sqlite3_initialize`, so better-sqlite3's own `ConfigureURI` (`addon.cpp:17-30`) still runs before init exactly as today |
| D3 | **The normal app does not change, measured, not assumed**: every diagnostic line of JavaScript is reached only through `if (DIAGNOSTIC_BUILD) { … }`, `DIAGNOSTIC_BUILD` is ONE exported const in `src/main/diagnostic-build/flag.ts` set from the define `__TORTIE_DIAGNOSTIC__`, never read inside an expression; the About mark rides in `__TORTIE_BUILD_COMMIT__` (`electron.vite.config.ts:58`), so `menu.ts` and `build-info.ts` do not move | §0.1 item 6: rollup drops a dead `if` and the module behind it, and keeps a dead ternary. The proof is `out/` and the unpacked package compared with the parent's (§10.1 A1) |
| D4 | **The walk**: per thread, the connections that thread has used (at most 64), each connection's every attached database's page cache: the LRU list oldest first (links point back, owner is this cache, count equals `nRecyclable`), every hash chain (owner, chain equals `iKey % nHash`, count equals `nPage`), and every line on either: the page pointer points back at its line, page number not 0, the guard (lines SQLite allocated on its own; a bulk-block line has none), and the pager's own record (`PgHdr.pPage`, `PgHdr.pgno`). Every read through a pointer from memory goes through `tchkReadable` | Research 143 §2.1 (the crash's header: owner null, page number 0 or off the index) and §2.3; §0.1 item 4 (no fault on damage). Oldest first because that is the line the close takes (`pcache1EnforceMaxPage`, `sqlite3.c:58305-58321`) |
| D5 | **The cadence**: at most one walk per thread per 25 ms (`TCHK_FLOOR_MS`), ALWAYS at a close; the test variant walks every `P358ADV_STEP_EVERY`-th entry with no floor | §2.4: a walk costs about 37 µs, and a walk per `iterate` row made the ring's digest 13 times slower (1.07 → 14.1 ms over 354 rows). With the floor nothing measures. The close is where the crash happens and where a fresh connection dies (§0.1 item 9) |
| D6 | **The one line**: on the FIRST failed check, the C side writes one NDJSON line in `app.log`'s own envelope (`ts`, `level` error, `scope` diagnostic, `pid`, `proctype` main, `event` `diagnostic.pcache`, `msg`) with `check`, `detail`, `reading`, `line`, `header`, `guardBytes`, `headerBytes`, `pageBytes` (64), `pageNumber`, `pagerPageNumber`, `bulk`, `words`, `database` (the home folder shortened to `~`), `schema`, `cache`, `entry`, `walks`, `lines`, `sinceLoadMs`, `checker`, `guard`; opened with `O_APPEND`, written in one `write`, closed. Then it stops walking. It never repairs, never writes the database, never changes what SQLite or the allocator do next | The entry's item 2 and mechanism 3; research 143 §5 item 2's fields. Synchronous because of §0.1 item 9. One `write` with `O_APPEND` because electron-log appends to the same file (`src/main/log/transport.ts`); the line cannot interleave |
| D7 | **The handshake**: `armChecker()` in `src/main/diagnostic-build/checker.ts`, called by `src/main/index.ts` right after `initLogging()` (`:159`): it makes `<userData>/logs`, sets `TORTIE_CHECKER="<app.log path>\t<home>"`, runs `SELECT 1` on a `:memory:` connection, reads whether the C side consumed the variable (it unsets it), deletes it either way, and logs ONE error line only when the checker did not answer. The C side writes the `diagnostic.armed` line itself | §0.1 item 7 (the folder). The variable lives for one synchronous statement at the top of main, before any child is spawned, so no session, shell or agent ever sees it. The C side looks for it at each entry until it finds it (the handshake's own `SELECT 1` is the first entry), then never again |
| D8 | **The reading** (research 143 §5) is computed by the C side and written beside the bytes: `g0 ^ g1 == ~0` → "a free-list entry in the guard: freed by code outside SQLite"; guard and header all zero → "zeros in the guard and the header: freed, then taken by a zero-filled block"; anything else → "something else wrote here: a stray write", with `words` naming every 8-byte word that resolves to a library (`dladdr`) or a heap zone (`malloc_zone_from_ptr`). A bulk-block line says it has no guard | §0.1 item 3, measured on PartitionAlloc. He reads the verdict without decoding hex; the hex stays for whoever traces it |
| D9 | **The events**: in the diagnostic build only, one `info` record per watcher request and watcher process start, exit and restart (`src/main/watcher/host.ts:395`, `:458`, `:490`, `:634`), per terminal spawn and exit (`src/main/attach/attach-host.ts:263`, `:394`), and per door process start, open and stop (`src/main/pocket/bind.ts:198`, `:367`, `:576`), through `diagnosticEvent(kind, what, fields)`: scope `diagnostic`, event `diagnostic.watcher\|terminal\|door`, fields a pid, a generation, an op, a request id, an exit code or signal; never an argv, a peer address, a query or a body | The entry's item 2. These are the native-adjacent work main does that research 143 §3 names as suspects (e) and node-pty, and the door's process lifecycle; their lines date the damage when the line comes. Paths in a watcher event pass `logEvent`'s redaction like every other line |
| D10 | **The plant is the test variant's alone, by construction**: every plant, the SIGSEGV handler, the class report, the violation lines and every `P358ADV_*` read sit inside `#ifdef TCHK_PLANT`; `build-checker.mjs --variant diagnostic` never defines it; `package.mjs` refuses a `.node` whose strings hold `P358ADV` or `[p358adv-` or that imports `sigaction`; `conformance:diagnostic` reads the C | The entry's mechanism 3 and the brief's (4). §0.1 item 1's measurement of the diagnostic variant (0, 0, none) is the proof the gate repeats on every built `.node` it is shown |
| D11 | **The updater is off in the diagnostic build** (his choice, §14 Q1): `initUpdater()` returns after one line, `checkForUpdatesNow()` answers `unsupported`, and the `unsupported` case in `src/main/updates/ui.ts:453` shows the diagnostic sentence instead of the development one (§5), each an `if (DIAGNOSTIC_BUILD)` statement; the package passes `-c.publish=null`, so no `app-update.yml` and no `latest-mac.yml` exist | An update would install the normal app over it at a quit (`autoInstallOnAppQuit = true`, `updater.ts:433`) and end the measurement without a word. Going back stays his act: installing the normal release (the checklist) |
| D12 | **The package swaps the native module in the PACKED app, never in `node_modules`**: `build/diagnostic/after-pack.cjs` replaces `Contents/Resources/app.asar.unpacked/node_modules/better-sqlite3/prebuilds/darwin-arm64.node` with `TORTIE_DIAGNOSTIC_NODE`, proves it by sha256, refuses when `TORTIE_DIAGNOSTIC` is not `1`, then calls `build/after-pack.cjs`'s `default`, so its arm64 assertion and nested signing cover the swapped file and, in the lane, @electron/osx-sign signs it with the bundle. `build/after-pack.cjs` and `electron-builder.yml` do not move | §0.1 item 7, prototyped. better-sqlite3's loader takes the prebuild first (`lib/binding.js:28`), so the swapped file IS the module the app maps |
| D13 | **The lane path is a second job in `release.yml`**, `diagnostic`, gated `if: github.event_name == 'workflow_dispatch' && inputs.diagnostic`; the `release` job gains `if: github.event_name == 'push'` and is otherwise byte for byte. The diagnostic job: the same fail-closed secret check, setup, typecheck, test and build, `build-checker.mjs --variant diagnostic --devdir "$HOME/.electron-gyp"`, `package.mjs` with notarization from the three `APPLE_*` secrets, the DMG's own ticket and staple, `verify-signed.mjs --expect-notarized` on the app and the DMG only, and `actions/upload-artifact` (14 days). No `gh release`, no tag, no `latest-mac.yml`, no provenance attestation | The entry's mechanism 1 ("signed and notarized only by the release lane … as an artifact that is not a release"). A dispatch runs only when he presses Run workflow: his word at the signing step |
| D14 | **Going back is checked before he installs**: `package.mjs` prints the diagnostic's manifest schema version and the latest release tag's; when they differ the package step says so in one line and the main session tells him before he installs | §0.1 item 10 |
| D15 | **No new smoke mode, invoke channel, `GMUX_*` name, migration, notice kind or `gmux.*` key**; no menu row moves | The contract stays still; everything new is reachable only in the diagnostic build or under `build/` |

## 2. What the spec step measured, how, and the numbers

Everything ran under the history block except the Electron runs (history `743319 1794200266` / `23166 1790702242`
before and after every run, unmoved). Scripts, builds and logs are under `/private/var/tmp/tortie-wt/scratch/p364/spec/`
(`checker/`, `logs/`, `bs3-*`, `dce/`), kept for the builders and the verifiers.

### 2.1 The checker, rebuilt, and the guard's class in Electron's main process

`checker/tortie-pcache-check.c` (the C, D1 to D8 and D10), `checker/build-checking.mjs` (copy, append, patch the four
anchors, node-gyp `rebuild --release --target=43.8.7 --arch=arm64 --dist-url=https://electronjs.org/headers
--devdir=<scratch HOME>/.electron-gyp -- -Dforce_build=1`), `checker/hook-bs3.cjs` (redirects `require('better-sqlite3')`
to a built copy's `lib/database.js` with its `build/Release/better_sqlite3.node`, never the copy's own `prebuilds/`,
which better-sqlite3's loader would prefer). The pristine amalgamation is sha256
`6a2805f8c1ef020a7086e62258519323cf98b219e9fe87a42065d916cfebaefc` (SQLite 3.53.4, `sqlite3.c:471`).

| Build | Size | sha256 | Build time |
| --- | --- | --- | --- |
| the shipped prebuild | 1,980,736 | `98e0e8ac…` (UUID `C87A9325-…`, his crash's) | |
| plain source build, no checker | 1,997,488 | `8e25e56a…` | 13.5 s |
| **diagnostic** variant | 2,015,648 | `2333f654ac2112e792987a044fab7d82b9a188c825865d97c044a60d8c93ed89`, the same in four builds | 12.5 to 13.8 s |
| test variant (final) | 2,016,240 | `2955d0b5…` | 13.0 s |

Release builds define `NDEBUG` (`build/better_sqlite3.target.mk`), so better-sqlite3's `assert`s compile out as in the
prebuild. The class, inside Electron 43.8.7's main (Node 24.22.1), from the test variant's class report over SQLite's own
lines (`logs/electron-arms-1.log`): `szAlloc=4368 request=4384 usable=4600 zone=DefaultMallocZone`, neighbours
`-4608` apart; direct requests 4,096 / 4,104 / 4,368 / 4,384 / 4,600 → 4,600 usable, 4,601 / 4,608 → 5,112.

### 2.2 Research 143 §2.3, reproduced (plain node, then Electron 43.8.7's main)

Each arm a forked child (`checker/run-node-arms.mjs`) or one scratch Electron (`checker/run-electron-arms.mjs` with the
no-window app `eapp/main.js`, through `withElectron`, `program: 'app'`, inside `build/harness-socket.mjs`), over a
manifest-shaped WAL database (354 rows of 12,000 to 17,000 bytes, 1,292 to 1,295 pages, `checker/arms-child.cjs`): warm
600 reads, the plant at walk 200, then 40 reads shaped like the ring's digest and `listSessions`, 2 writes, a FRESH
read-only `integrity_check`, then the end the arm names.

| Arm | Where | Reads after the plant | Fresh `integrity_check` | End | Result |
| --- | --- | --- | --- | --- | --- |
| control | node, Electron | 40 of 40 | ok | `db.close()` | exit 0; 0 violations |
| crash-state (his header state) | node ×2, Electron | 40 of 40; writes 2 of 2 | ok | `db.close()` | **SIGSEGV at `0x34`, `pcache1EnforceMaxPage+0x68`, exit 139** |
| zero-header (all 56 header bytes zeroed in place) | node | 40 of 40 | ok | `db.close()` | **the same fault** (research 143 §2.1 shape 4) |
| page-zero (page bytes zeroed, header intact) | node, Electron | **10 `SQLITE_CORRUPT`**, 30 ok | ok | `db.close()` | clean, exit 0 |
| crash-state aimed at the read-only connection | node | | (it is the one planted) | its own close | the fault at that connection's close (§0.1 item 9) |

### 2.3 Research 143 §5's readings, on PartitionAlloc (Electron 43.8.7's main, `logs/electron-arms-1.log`)

| Plant | Taken back | Guard | Header | Reads after | The line's reading |
| --- | --- | --- | --- | --- | --- |
| foreign free of the slot | | `0000000000000000ffffffffffffffff` | intact | 113 `SQLITE_CORRUPT` (the slot reused) | a free-list entry in the guard |
| foreign free, then `calloc(1, 4096)` | same slot (1) | zeros | zeros | 40 of 40 ok | zeros in the guard and the header |
| foreign free, then `malloc(4096)` writing its bytes | same slot (1) | `a5…` | intact | 113 `SQLITE_CORRUPT` | a stray write |
| two words written over the guard | | `bcac7695 01000000 59415254 53000000` | intact | 40 of 40 ok | a stray write; `words`: `libsystem_malloc.dylib!malloc_zone_malloc` |

### 2.4 The route, the false-positive check and the cost

- **The route.** Plain node (`logs/route-arm.jsonl`): the armed line and the one line appended to a file after an
  existing line, each parsing as JSON. The real app (the parent's `out/`, the checking build by the hook, `TORTIE_CHECKER`
  in the launch's env, `logs/route-app.log`): the armed line and, with the zero-header plant on the session list's own
  connection at walk 40, the one line with every field (page number 0, the pager's 12, guard whole, header zeros,
  database the manifest), the app still listing 102 rows, the quit by the 357.1 SIGKILL in 193 ms. The packaged
  prototype: the armed line through the real handshake (§0.1 item 7).
- **No false positive**: 0 lines and 0 violations over his shape in every launch with the checker loaded (dev app ×4,
  packaged ×3),
  each walking the session list, the integrity check's and the app's other connections.
- **Cost, plain node** (`logs/bench-node-2.jsonl`, median ms per operation, 3 runs each): prebuild list 1.67 to 1.74,
  plain build 1.64 to 1.77, diagnostic 2.17 to 2.22 (the guard on 354 rows of 12 to 17 KB under libmalloc); get, digest
  and write unchanged. Without the floor (`logs/bench-node.jsonl`) digest 13.9 to 14.4 against 1.07 to 1.10.
- **Cost, Electron 43.8.7 main** (`logs/electron-bench-3.log`): prebuild list 2.30 to 2.65 ms, diagnostic 2.41 to 2.54;
  get 3.9 to 4.2 µs against 4.0 to 4.3; digest 1.01 to 1.33 ms against 1.04 to 1.15; write 10.5 to 11.5 µs against 11.1
  to 13.0. Within noise.
- **Cost on his shape** (`checker/cost.mjs`: seed `--shape his`, launch, the list answered through the window's bridge
  and two animation frames, 20 refreshes, main's RSS, the window's quit; ABAB; `logs/cost-1.log`, `cost-2.log`,
  `parent-pkg-launch.log`, `dce-diag-pkg-launch*.log`):

| Build | Runs | Window | List drawn | Refresh median (p90) | Main RSS | Quit |
| --- | --- | --- | --- | --- | --- | --- |
| parent, dev app | 9 | 416–478 ms | 605–660 ms | 1.4–1.8 (2.1–3.8) ms | 209,264–210,560 KB | 282–296 ms |
| parent + checker (hook) | 3 | 433–649 | 611–794 | 1.4–1.7 (1.7–3.2) | 211,232–211,456 | 283–288 |
| parent, packaged | 2 | 443–529 | 606–810 | 1.3–1.8 (1.6–3.0) | 202,400–203,008 | 285–289 |
| prototype diagnostic, packaged | 3 | 410–487 (of 2) | 600–835 | 1.3–2.0 (1.4–3.6) | 202,776–203,152 | 281–292 |

Every quit ends by the 357.1 SIGKILL (the session list held). The slowest launch in each batch is its first.

### 2.5 The normal build stays what it is (`logs/out-diff.txt`, `logs/dce-*`)

- `diff -rq wt-p364/out wt-p364-parent/out`: exit 0, 509 files, before any change. The build is deterministic.
- The dead-code prototype (`dce/`, a clone with `.git` removed, so it stamps `dev`; `checker/dce-edit.cjs` then
  `dce-edit2.cjs`): the normal build against this worktree's `out/` with its stamp written as `dev`: **byte-identical**
  (exit 0). The diagnostic build differs in `out/main/index.js` alone: `armDiagnostic()` called unconditionally, the
  diagnostic module present, `BUILD_COMMIT = "dev Diagnostic"`. The first prototype's ternary in the About options was
  kept in the normal bundle as `false ? … : electron.app.getVersion()`.

### 2.6 The parent's battery, probes and package (one Electron at a time, each under a lock slot)

| Run | How | Exit | Wall | Numbers |
| --- | --- | --- | --- | --- |
| `npm run build` | history block | 0 | 53.3 s | `gate:electron` 586 files, 187 reach the helper against a floor of 187; `gate:background` 588 files, 4 starts in a `finally`; `known-hosts` 616; `assert-hermetic-checks` 286 check scripts, 1,203 test files; `contract-inventory` byte for byte |
| `npm test` | history block, scratch `HOME`, `TMPDIR` through `/var` | 1 | 88 s | 22,915 passed, 7 failed, 23 skipped of 22,945; files 1,195 passed, 4 failed, 4 skipped of 1,203. The four `/bin/ps` tests, and `resolve.test.ts` × 3 (fork tests, a load average of 13 to 19): that file alone, 40 of 40, twice |
| `smoke:quit` | `node build/harness-socket.mjs gmux-smoke-quit 'node build/quit-smoke.mjs quit'` | 0 | 5.6 s | 48 of 48 fixtures; held: SIGKILL after **3,783 ms** (the storage wait 833 ms), the held line, sentinel armed and cleared, 0 dumps, 0 reports; teardown: exit 0 after **1,759 ms** |
| `smoke:quitdoors` | `… gmux-p144-doors 'node build/quit-smoke.mjs quit-doors'` | 0 | 1.9 s | 9 of 9 doors, SIGKILL after **1,816 ms**, 0 dumps, 0 reports |
| `probe:p357`, `P357_ARMS=CS`, the rebuilt checker | from this worktree, `P357_PARENT_CHECKOUT` the parent | 1 | 56 s | CS-parent FAIL by construction (§0.1 item 8), CS-head PASS, RUN PASS; `--grader-self-test` PASS (9 graders, 52 clauses, 43 needs, 160 fields, 93 raw fixtures) |
| the package | the package script's read-only checks, then `electron-builder --mac --publish never -c.mac.identity=null`, scratch `HOME` holding the 43.8.7 zip | 0 | 31.9 s | "skipped macOS code signing reason=identity explicitly is set to null", no Developer ID; 27 Mach-O, all arm64; DMG 166,609,398 B, ZIP 166,269,805 B; `latest-mac.yml` and `Resources/app-update.yml` (github, `gregce/tortie`, draft); the packed `darwin-arm64.node` `98e0e8ac…`; the zip's mtime unchanged; `release/` removed after |
| the packaged launch | `checker/cost.mjs` with the absolute program path, ended inside 25 s | 0 | | §2.4's packaged row; no dump; app.log's one updater line "the updater state on disk reads unknown", no check |

### 2.7 The spec step's commands, exit codes and numbers

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `stat` of his two history files (start, every run, end) | 0 | | `743319 1794200266`, `23166 1790702242` every time |
| `df -h /` | 0 | | 43 to 45 GiB free |
| `node checker/build-checking.mjs <out> test\|diagnostic\|plain` × 12 (history block) | 0 each | 12.5–16.1 s | §2.1 |
| `node checker/run-node-arms.mjs …` × 4 (history block) | 0 | 1–5 s per arm | §2.2, §2.3 (the plain-node rows) |
| `lockrun.sh … run-electron-arms.mjs …` (7 arms) | 0 | | §2.1 to §2.3 |
| `lockrun.sh … run-electron-arms.mjs bench:…` × 3 | 0 | | §2.4 |
| `node checker/bench.cjs` × 18 (history block) | 0 | | §2.4 |
| `lockrun.sh … cost.mjs …` × 5 (12 + 2 + 2 + 2 + 1 launches) | 0 each | 157 s, 157 s, … | §2.4 |
| `npm run build` in this worktree and the parent; the `out/` diff | 0, 0, 0 | 59 s, 53 s | §2.5 |
| `electron-vite build` × 4 in `dce/` (normal and diagnostic, two prototypes) | 0 each | | §2.5 |
| `electron-builder --dir` in `dce/` × 2 with the prototype after-pack | 0, 0 | 6 s | §0.1 item 7 |
| `npm test`, `npx vitest run src/main/tmux/__tests__/resolve.test.ts` × 2 at the parent | 1, 0, 0 | 88 s | §2.6 |
| the two quit smokes, `probe:p357`, the package at the parent | §2.6 | | §2.6 |
| `reports.sh` before and after every run that could crash | 0 | | 98 entries at the start and at the end, identical by name and mtime: **no report added**. 8 deliberate faults (7 plain node, 1 Electron), each ended by the checker's own handler with exit 139; 0 Crashpad dumps |
| the Electron count, once, at the end (outside the block) | 0 | | none of this step's: his Tortie (692) and its crash handler (2727), and Slack's, Chrome's, Granola's and Cursor's crash handlers; no `p364` or `p357` socket under `/private/tmp/tmux-501/`; all three slots free |
| Strays, said plainly | | | One tool command (`mkdir`, `cat >`, `chmod` writing the scratch app and the lock runner) and the read-only `stat`, `ps`, `zsh -f lock.sh status` and `ls` of the socket folder ran outside the history block; `npx vitest` named the local binary. His history never moved |

## 3. The tree at this head: the paths the design touches

**The native side (new, under `build/diagnostic/`)**: `sqlite-checker.c`, `build-checker.mjs`, `hook-bs3.cjs`,
`checker-selftest.mjs`, `after-pack.cjs`, `package.mjs`. **Read, never edited**: `node_modules/better-sqlite3/`
(13.0.3: `deps/sqlite3/sqlite3.c`, `src/objects/statement-iterator.cpp:22-24`, `src/objects/database.cpp:36-45` and
`:216-222`, `src/util/query-macros.cpp:36-42`, `lib/binding.js:28`), `build/after-pack.cjs` (`exports.default`, `:60`),
`electron-builder.yml` (`asarUnpack: "**/*.node"`, `publish:`).

**The main process (edited)**: `src/main/index.ts:159` (`initLogging();`, the handshake after it);
`src/main/updates/updater.ts:412` (`initUpdater`), `:575` (`checkForUpdatesNow`); `src/main/updates/ui.ts:453` (the
`unsupported` case); `src/main/watcher/host.ts:395` (`send`), `:458` (`adopt`), `:490` (exit), `:634` (restarted);
`src/main/attach/attach-host.ts:263` (`nodePty.spawn`), `:394` (`onExit`); `src/main/pocket/bind.ts:198` (the door's
fork), `:367` (open), `:576` (stopped). **New**: `src/main/diagnostic-build/{flag.ts,checker.ts,events.ts}` (named
`diagnostic-build`, not `diagnostic`, because `src/main/diagnostics/` is Live Diagnostics).

**The build and the lane (edited)**: `electron.vite.config.ts:57-59` (the define and the stamp), `vitest.config.ts`
(the define as `false`), `.github/workflows/release.yml` (`on:` `:30`, `jobs:` `:42`), `package.json` scripts.

**The six connections the attack plants in** (research 143 §6 names six beside the session list): the session list
(`src/main/manifest/store.ts:553`), the Codex state reader (`src/main/manifest/harvest/codex-state.ts:133`), the ring's
fresh connections (`src/main/manifest/recovery.ts:163`, `:257`), the integrity check's (`src/main/db/integrity.ts:211`),
the overview store (`src/main/overview/store/store.ts:883`), `arch.db` (`src/main/arch/db.ts:1345`) and the symbol index
(`src/main/symbols/persist.ts:122`). The OpenCode reader (`src/main/manifest/harvest/opencode-store.ts:92`) is an
eighth the research did not list; the probe plants in it too when it opens.

## 4. The design, item by item (real paths; the builder named on each)

### 4.1 The checker's source, its build and its self-test (builder `checker`)

`build/diagnostic/sqlite-checker.c` is the spec step's `checker/tortie-pcache-check.c` taken into the tree, with its
header citing this spec. It must keep, exactly: D2's guard and its constructor; D4's walk with `tchkReadable` on every
read through a pointer from memory (`mach_vm_region`, a per-walk cache of 48 regions, a read that spans regions asked
region by region; 1,024 since the fix round, §As built); D5's cadence; D6's line and its envelope; D8's reading; the four entry ops; the test variant's
interface for probe-p357 (`P358ADV_PLANT` with `crash-state`, `zero-header`, `page-zero`, `foreign-free`,
`zero-take`, `take-write`, `stray-write`; `P358ADV_PLANT_AT`, `_FILE`, `_PAGE`, `_READONLY`, `P358ADV_STEP_EVERY`,
`P358ADV_FLOOR_MS`, `P358ADV_CLASS`, `P358ADV_SEGV_EXIT`; the lines `[p358adv-ARMED]`, `[p358adv-PLANT] <kind> at check
<n> op=<op> cache=0x… line=0x… page=<n> file=<path>`, `[p358adv-VIOLATION] <check>: <detail> op=<op> check=<n> n=<k>
line=0x… file=<path> cache=0x…` (the first 1,000 printed, then one in 1,000), `[p358adv-TAKE]`, `[p358adv-CLASS]`, and
`[p358adv-SEGV] signal <n> at address 0x…, pc 0x… = <frame>+0x<off> in <image>`, the frame from `dladdr` or the table
of pcache1's own functions, whichever is nearer below the pc). Every plant targets a line SQLite allocated on its own
(never the bulk block), the oldest on the LRU unless `P358ADV_PLANT_PAGE` names one.

`build/diagnostic/build-checker.mjs --variant diagnostic|test|plain --out <dir> --devdir <dir> [--define <NAME>]…
[--json <file>]` (`--define` is accepted with `--variant test` alone and prepends `#define <NAME> 1`; the self-test's
ablations use it):
refuses unless `node_modules/better-sqlite3` is 13.0.3, its `deps/sqlite3/sqlite3.c` hashes to `6a2805f8…`, each of the
four anchors occurs exactly once (the close anchor is `\t\tbackups.clear();\n\t\tint status = sqlite3_close(db_handle);`,
because `sqlite3_close(db_handle)` occurs three times in `database.cpp`), `--devdir` is given and holds
`<electron version>/include/node/node_api.h` (or, with `--fetch-headers`, which the lane alone passes, node-gyp may
fetch them from `https://electronjs.org/headers` into that devdir and nowhere else), and the target is
`node_modules/electron/package.json`'s version. It
`cp -Rc`s the package into `--out` (removing the copy's stale `build/`), appends the C (`#define TCHK_PLANT 1` first for
`test`; nothing appended for `plain`), patches the anchors, runs node-gyp with every cache under `--out`'s parent and
`HOME` pointing at a folder it makes there, and writes one JSON line (variant, versions, size, sha256, UUID, the
amalgamation's hash before and after). It never writes outside `--out` and the folder it names for node-gyp's caches.

`build/diagnostic/hook-bs3.cjs`: the spec step's hook. `build/diagnostic/checker-selftest.mjs --out <scratch>`: builds
the test variant, runs §2.2's plain-node arms (control, crash-state, zero-header, page-zero) and asserts each row; then,
for each rule, builds the test variant with one `-DTCHK_ABLATE_<RULE>` (owner, lru-link, hash-chain, count, guard,
page-number, close-walk, readable) and shows the arm that rule owns go from caught to missed (or, for `readable`, from a
line to a fault), naming the rule; then builds the diagnostic variant and asserts §0.1 item 1's 0, 0 and no `sigaction`
import by `strings` and `nm -u`. It runs under the history block and starts no Electron (about 2 to 3 minutes: one build
per ablation, 13 to 16 s each). The ablation hooks are `#ifdef`s in the C that compile out exactly one clause each.

### 4.2 The main-process half (builder `main`)

`src/main/diagnostic-build/flag.ts`: `declare const __TORTIE_DIAGNOSTIC__: boolean;` and
`export const DIAGNOSTIC_BUILD: boolean = __TORTIE_DIAGNOSTIC__;`, nothing else. `checker.ts`: `armChecker()` (D7),
taking its `Database`, logs folder, app.log path, home and log from injectable deps for its tests. `events.ts`:
`diagnosticEvent(kind: 'watcher' | 'terminal' | 'door', what: string, fields: Record<string, number | string>)` →
`logEvent('diagnostic', 'info', \`diagnostic.${kind}\`, \`${kind} ${what}\`, { what, ...fields })` (`src/main/log/index.ts:225`).

`src/main/index.ts`: `import { DIAGNOSTIC_BUILD } from './diagnostic-build/flag'` and `armChecker`, and after
`initLogging();` (`:159`) the statement `if (DIAGNOSTIC_BUILD) armChecker();`. `src/main/updates/updater.ts`:
`initUpdater()` gains, after `initialized = true;`, `if (DIAGNOSTIC_BUILD) { logInfo(<the off line>); return; }`;
`checkForUpdatesNow()` gains as its first statement `if (DIAGNOSTIC_BUILD) return { kind: 'unsupported' };`.
`src/main/updates/ui.ts`'s `unsupported` case gains, before its dialog, `if (DIAGNOSTIC_BUILD) { await
showOkDialog('info', <title>, <body>); return; }` (§5).

### 4.3 The events (builder `events`)

One `if (DIAGNOSTIC_BUILD) diagnosticEvent(…)` statement at each point D9 names, fields only from what the code already
has in scope: the watcher's `send` (op, request id, generation), `adopt` (pid, generation), the exit listener (code,
generation), the restart (generation, re-bound count); the attach host's spawn (session id, kind, pty pid after the
spawn) and its `onExit` (session id, exit code, signal, expected); the door's fork (pid), open (local port,
generation) and the unexpected stop (generation). Nothing a phone sent and nothing a terminal printed.

### 4.4 The package (builder `package`)

`electron.vite.config.ts`: `const DIAGNOSTIC = process.env.TORTIE_DIAGNOSTIC === '1';`, the stamp
`JSON.stringify(buildCommit() + (DIAGNOSTIC ? ' Diagnostic' : ''))` and `__TORTIE_DIAGNOSTIC__: JSON.stringify(DIAGNOSTIC)`,
in `main` only. About then reads "Version 0.114.1 (<sha> Diagnostic)" (`src/main/menu.ts:1468-1471`, unchanged).

`build/diagnostic/after-pack.cjs`: D12 (the spec step's `checker/after-pack-diagnostic.cjs`, plus the
`TORTIE_DIAGNOSTIC` refusal and a refusal when the file's strings hold `P358ADV` or `[p358adv-`). It runs only when
named on electron-builder's command line (`-c.afterPack=…`), so a normal package never reaches it.

`build/diagnostic/package.mjs [--dir] --checker <built .node> [--notarize]`: refuses a `.node` that fails D10's three
reads; runs `TORTIE_DIAGNOSTIC=1 electron-vite build` and the package script's read-only checks
(`check-tmux-pin.cjs`, `assert-bundle-refusals.mjs`, `assert-preview-containment.mjs`, `assert-css-order.mjs`); then
`electron-builder --mac <dmg | --dir> --publish never -c.afterPack=build/diagnostic/after-pack.cjs -c.publish=null
-c.artifactName='${productName}-${version}-diagnostic-${arch}.${ext}'`, with `-c.mac.identity=null` unless `--notarize`
(the lane alone passes it); then reads back the packed module's sha256, the absence of `app-update.yml` and
`latest-mac.yml`, the bundle id, and D14's two schema versions, and prints one JSON line. It builds `out/` in place, so
anywhere but the lane it runs in a `cp -Rc` clone of the checkout (the probe and the lenses do). It refuses a log that
names `identityName=Developer ID` when `--notarize` was not passed.

`.github/workflows/release.yml`: D13. `build/p364/CHECKLIST.md`: §4.8.

### 4.5 The plant (builder `checker`, gated by `gate`)

D10. The test variant is the only `.node` the probe and the lenses plant with; they load it into the DIAGNOSTIC build
(the packaged diagnostic app, or the diagnostic `out/` in a clone) through `hook-bs3.cjs` and `NODE_OPTIONS`, so the
plant runs under the diagnostic build's own handshake, events and quit. The packaged app honours `NODE_OPTIONS` (the
`EnableNodeOptionsEnvironmentVariable` fuse is on, `build/p366/SPEC.md` §2.4). The shipped diagnostic `.node` cannot
plant: the code is not in it. **Wrong for `--require`, found by both lenses**: a packaged app drops it from
`NODE_OPTIONS`; the probe now loads its files through main's inspector in a packaged launch (§As built, the fix round).

### 4.6 The updater (builder `main`)

D11. The default is off; §14 Q1 is his choice to keep it on, in which case `initUpdater` runs as in the normal build and
the package keeps the feed file, and the checklist says the next release ends the diagnostic run.

### 4.7 The release lane (builder `package`)

`on:` gains `workflow_dispatch: { inputs: { diagnostic: { type: boolean, default: false, description: 'Build the
diagnostic app (an artifact, not a release)' } } }`. The `release` job gains `if: github.event_name == 'push'`. The new
`diagnostic` job (`runs-on: macos-15`, `timeout-minutes: 60`, `permissions: contents: read`), its steps in order: the
fail-closed secret check (copied), `./.github/actions/setup`, `npm run typecheck`, `npm test`, `npm run build`, `node
build/diagnostic/build-checker.mjs --variant diagnostic --out "$RUNNER_TEMP/bs3" --devdir "$RUNNER_TEMP/electron-gyp"
--fetch-headers --json "$RUNNER_TEMP/bs3.json"`, the keychain import (copied), `node build/diagnostic/package.mjs --checker
"$RUNNER_TEMP/bs3/build/Release/better_sqlite3.node" --notarize` with the three notarization secrets, the DMG's own
ticket (`xcrun notarytool submit --wait`, `node build/stapler.mjs staple` and `validate`), the packaged app's basic
smoke exactly as the release job runs it (`GMUX_SMOKE=basic` on the diagnostic app), `node build/verify-signed.mjs
--expect-notarized` over the app and the DMG with the zero-WARN grep, and `actions/upload-artifact` of the DMG and
`bs3.json` (`retention-days: 14`, name `tortie-diagnostic-<sha>`). It never names `gh`, `--publish always`, a tag,
`latest-mac.yml`, a blockmap or `attest-build-provenance`. The local check (`gate`, §7.1 rule D7) reads it; the lens runs
its steps with every sign, notarize, staple and upload stubbed (§10.2 B6).

### 4.8 His checklist (`build/p364/CHECKLIST.md`, builder `package`)

Plain lines, his words: **Before**: quit Tortie; your sessions keep running. **Install**: open the DMG from the workflow
run, drag Tortie to Applications and replace; open it; Tortie → About Tortie says "Diagnostic" after the version.
**Look for**: nothing, normally. If Tortie says the session list stopped, or quits unexpectedly, or every few days,
run `grep diagnostic.pcache ~/Library/Application\ Support/Tortie/logs/app.log*`; one line means it caught something.
`grep diagnostic.armed` shows it is on. **Send**: read the line first; its `pageBytes` can hold 64 bytes of your session
list (a fragment of a name or a folder); send what you choose, by the route you choose; nothing is ever uploaded.
**Go back**: install the newest normal release the same way; the package step told the main session whether its
session list format matches (D14); updates are off in this build. **Do not**: install it while a normal update is staged.

### 4.9 The cost

Measured (§2.4): nothing a person can see; about 1.5 MB more in main. The lens re-measures it on the real diagnostic
package against the normal package, ABAB, his shape, and a regression a person could see is a defect (§10.1 A5).

## 5. Words

No new word in the normal build. In the diagnostic build only:

- The updater's off line (app.log, scope `updates`): `updates are off in this diagnostic build`.
- "Check for Updates…": title `Updates are off in this build`, body `This diagnostic build does not update itself.
  Install the normal release to go back.`
- `armChecker`'s line when the checker did not answer (scope `diagnostic`, error): `this diagnostic build has no
  page-cache checker`.
- The C side's two `msg`s: `The page-cache checker is on`; `A SQLite page line failed its check` (`A SQLite allocation
  failed its check` for the guard at a free); the three readings of D8.
- About: `<sha> Diagnostic` in the version line.

## 6. What moves on purpose

Nothing in the contract (`gate:contract` byte for byte). `HELPER_USER_FLOOR` 187 → 188 for `build/p364/probe-p364.mjs`.
`build/verification-checks.mjs` classifies four new scripts: `conformance:diagnostic` (pure), `check:checker`
(`node build/diagnostic/checker-selftest.mjs`, a native build; not in the battery), `package:diagnostic`
(`node build/diagnostic/package.mjs`, a package) and `probe:p364` (electron). CLAUDE.md gains two rows (§7.1, §8).
`vitest.config.ts` gains `define: { __TORTIE_DIAGNOSTIC__: 'false' }`. No `src/shared/*` file moves.

## 7. The gates

### 7.1 `conformance:diagnostic` (`build/conformance-diagnostic.mjs`, builder `gate`), new, path-triggered

Pure node over the TypeScript parser and a reading of the C, spawning nothing, each rule asked again over an in-memory copy
with it broken (one ablation per clause at least, every one red on its own rule, a control green):

| Rule | Holds |
| --- | --- |
| D1 | `__TORTIE_DIAGNOSTIC__` is named under `src/` only in `src/main/diagnostic-build/flag.ts`; the define in `electron.vite.config.ts` is `process.env.TORTIE_DIAGNOSTIC === '1'` and in `main` only; `vitest.config.ts` defines it `false` |
| D2 | `DIAGNOSTIC_BUILD` is read only as the WHOLE test of an `if` statement with no `else` (never in a conditional, a logical expression, an argument, a return or an assignment), and every export of `src/main/diagnostic-build/{checker,events}.ts` is called only inside such an `if`'s consequent |
| D3 | `src/main/menu.ts` and `src/main/build-info.ts` name neither; the stamp carries ` Diagnostic` only under the same define |
| D4 | The C: every `P358ADV_` read, `sigaction`, `_exit`, `calloc(`, `malloc(` of a plant, `tchkOrig.xFree(` outside `tchkFree`, and every `[p358adv-` string sits inside `#ifdef TCHK_PLANT`; outside it the only `getenv` is `TORTIE_CHECKER`, followed by its `unsetenv`; the only file the C side opens is the one that variable names, `O_APPEND`; `SQLITE_CONFIG_MALLOC` is called once, in the constructor, before any `sqlite3_initialize` |
| D5 | The walk dereferences a pointer read from memory only after `tchkReadable` (a lexical rule over the walk functions: every `->` on a `PgHdr1*`, `PCache1*`, `PGroup*`, `PgHdr*`, `Btree*`, `BtShared*`, `Pager*` or `PCache*` local follows a `tchkReadable` of that local in the same function) |
| D6 | `build/diagnostic/build-checker.mjs` pins 13.0.3, the amalgamation's sha256 and the four anchors, requires `--devdir`, never writes under `node_modules`; `after-pack.cjs` writes only the one packed path and calls the normal after-pack after it; `package.mjs` passes `-c.publish=null` and the `-diagnostic-` name and refuses an unsigned-run log naming a Developer ID |
| D7 | `release.yml`: the `release` job runs only on a tag push and is otherwise unchanged against a pinned hash of its steps; the `diagnostic` job runs only on `workflow_dispatch` with `inputs.diagnostic`, uploads only through `actions/upload-artifact`, and names no `gh`, no `--publish always`, no tag, no `latest-mac.yml`, no blockmap |
| D8 | Given `--node <file>` (the probe and the integrator pass the built ones): a diagnostic `.node` holds no `P358ADV`, no `[p358adv-` and imports no `sigaction`; a test `.node` holds all three (so the rule can fail) |

CLAUDE.md row: touching `build/diagnostic/**`, `src/main/diagnostic-build/**`, an `if (DIAGNOSTIC_BUILD)` statement's
file, `electron.vite.config.ts`'s `define`, `vitest.config.ts`'s `define` or `release.yml`'s `diagnostic` job →
`conformance:diagnostic`, about a second, spawns nothing.

### 7.2 The path-triggered gates the changed files trigger (CLAUDE.md, read at this head)

| Changed | Gate |
| --- | --- |
| `src/main/pocket/bind.ts` | `conformance:pocket` and `conformance:pocket:hostile` (no log call may carry a peer address or a body: `P1`, `X11`, `D5`) |
| `src/main/watcher/host.ts` | `conformance:watcher` |
| `src/main/attach/attach-host.ts` | the integrator reads the hunk: if it is outside `routeRemoteInput`, `conformance:machines` is not triggered; run it anyway (about 45 s) |
| `src/main/index.ts` | `conformance:stoppedlist` (S12 reads its `will-quit` handler) |
| `src/main/updates/*` | none names them; the battery, and `conformance:stoppedlist` for `isUpdateStaged` |
| `src/shared/ipc/**`, a `GMUX_*` name | **not touched**; `gate:contract` must still match |

## 8. The app run: `probe:p364` (`build/p364/probe-p364.mjs`, builder `probe`)

One Electron at a time through `withElectron` inside `build/harness-socket.mjs` (`gmux-p364…`), scratch profiles,
`HOME` and socket; every launch hides the probed agents and reads `agents:list` back; `--use-mock-keychain`; the
normal packaged app with `GMUX_UPDATE_REHEARSAL=1` and `TORTIE_UPDATE_FEED` naming a loopback listener the probe holds
and counts (§0). Inputs: `P364_DIAG_APP` (a packaged diagnostic app, `--dir`, unsigned, made by `package.mjs` in a
clone), `P364_NORMAL_APP` (this tree's normal `package:dir`), `P364_PARENT_APP` (the parent's), `P364_TEST_BS3` (a
built test variant), `P364_KEEP`, `P364_ARMS`. Three verdicts per arm, a missing reading UNREADABLE (exit 2), every
reading derived by one pure function, `--grader-self-test` over `build/p364/fixtures/` that starts nothing.

| Arm | What | PASS |
| --- | --- | --- |
| R | The reproduction: a scratch no-window app (the spec step's `eapp`) in Electron 43.8.7's main with the test variant: crash-state then `close()`; page-zero then `close()` | §2.2's two rows exactly: the fault's line with `pcache1EnforceMaxPage` and `0x34`, exit 139; 10 `SQLITE_CORRUPT`, fresh `ok`, exit 0 |
| M1 | Method 1: the diagnostic app with the test variant by the hook, his shape, the crash state planted in the session list's own connection, then the menu's Quit row | ONE `diagnostic.pcache` line in `app.log` with every D6 field and the reading "zeros…" or "something else…" as the plant dictates; no read failed; the quit by the 357.1 SIGKILL; the relaunch (the diagnostic app, no plant) lists every row with the same ids and no unclean-exit notice |
| M1n | The normal app beside it, the same world, no checker | no `diagnostic` line of any kind; the same quit |
| M2a | foreign-free, zero-take, stray-write in the session list's connection, one launch each | each line's reading as §2.3's row; `words` names `libsystem_malloc.dylib` for the stray write |
| M2b | crash-state in each connection of §3's list, one launch each, by `P358ADV_PLANT_FILE` and `_READONLY` | one line naming that connection's database; a fresh connection's line written before its close faults (the one fault this arm may cause, read by the handler's exit 139); a connection the run could not open is UNREADABLE, never PASS |
| M2c | Load: the diagnostic app with the DIAGNOSTIC `.node` (no plant), his shape, 20 minutes of churn (projects opened and closed, shells created and ended, the phone door paired over the stand-ins and read, a folder churned under a watch) | 0 lines, 0 faults; RSS within 5 % of the normal app's under the same churn |
| U | The update feed: the normal app and the diagnostic app, each 45 s past launch, then "Check for Updates…" by its menu row | the normal app asks the loopback feed (≥ 1 request, the instrument); the diagnostic app asks 0 times, shows §5's sentence, and holds no `app-update.yml` |
| P | The packaged diagnostic itself: its `.node` by sha256, D8's reads, About's version line read from main (`app.getVersion()` and the stamp), the `diagnostic.armed` line at every launch | as written |
| C | Cost: §2.4's harness, the normal package and the diagnostic package, ABAB, 5 each | no median worse by more than the normal build's own spread; quit by the SIGKILL in both |
| RUN | the census, every pid ended, the sockets, the crash reports by name, his history | as `probe:p357`'s RUN |

CLAUDE.md row: `probe:p364`, when `build/diagnostic/**` or `src/main/diagnostic-build/**` or a diagnostic call site
moves; minutes to about half an hour (M2c is 20 minutes); verifiers only, under the lock.

## 9. Builders, disjoint files

### 9.1 The table (every file in exactly one list; a builder that must edit a file not in its list stops and names it)

| Builder | Files it owns (and their tests) |
| --- | --- |
| `checker` | `build/diagnostic/sqlite-checker.c`, `build/diagnostic/build-checker.mjs`, `build/diagnostic/hook-bs3.cjs`, `build/diagnostic/checker-selftest.mjs` |
| `main` | `src/main/diagnostic-build/{flag.ts,checker.ts,events.ts}`, `src/main/index.ts`, `src/main/updates/updater.ts`, `src/main/updates/ui.ts`; tests `src/main/diagnostic-build/__tests__/p364-checker.test.ts`, `p364-events.test.ts`, `src/main/updates/__tests__/p364-updates-off.test.ts` |
| `events` | `src/main/watcher/host.ts`, `src/main/attach/attach-host.ts`, `src/main/pocket/bind.ts`; tests `src/main/watcher/__tests__/p364-events.test.ts`, `src/main/attach/__tests__/p364-events.test.ts`, `src/main/pocket/__tests__/p364-events.test.ts` |
| `package` | `electron.vite.config.ts`, `build/diagnostic/after-pack.cjs`, `build/diagnostic/package.mjs`, `.github/workflows/release.yml`, `build/p364/CHECKLIST.md` |
| `gate` | `build/conformance-diagnostic.mjs`, `build/diagnostic-fixtures/**` |
| `probe` | `build/p364/probe-p364.mjs`, `build/p364/fixtures/**` |
| integrator | `CLAUDE.md`, `CHANGELOG.md` (no item), `DEVELOPMENT.md` (one short paragraph beside the release lane: the diagnostic job, `package.mjs`, never a release), `package.json` (four scripts), `vitest.config.ts`, `build/verification-checks.mjs`, `build/assert-electron-teardown.mjs` (`HELPER_USER_FLOOR` 188), `docs/audits/contract-baseline.txt` (expected unchanged), this file's §As built, and any file two builders both need |

### 9.2 The seams, stated exactly so the six build at once

- `main` exports `DIAGNOSTIC_BUILD: boolean` from `src/main/diagnostic-build/flag.ts`, `armChecker(deps?)` from
  `checker.ts`, `diagnosticEvent(kind, what, fields)` from `events.ts`. Until the integrator adds the vitest define,
  each builder's tests run with `vi.stubGlobal('__TORTIE_DIAGNOSTIC__', …)` or import the modules directly.
- `checker` owns the C interface the probe and the gate read (the env names and line formats of §4.1, the reading
  strings of D8, the ablation names of §4.1) and `build-checker.mjs`'s flags and JSON line (§4.1), which `package`'s
  lane step and the probe call.
- `package` owns `package.mjs`'s flags and JSON line (§4.4), which the probe and the lenses call.
- `gate` reads every other builder's files; it adds nothing anyone imports.
- `src/shared/*` is untouched.

### 9.3 The builders' briefs

- **`checker`**: §4.1. Start from `…/scratch/p364/spec/checker/{tortie-pcache-check.c,build-checking.mjs,hook-bs3.cjs,
  arms-child.cjs,run-node-arms.mjs}`; build every variant into your own scratch with `--devdir` a `cp -Rc` of the
  spec step's headers. Return the four files, the self-test's output (every arm and every ablation), and the three
  `.node` hashes.
- **`main`**: §4.2, §4.6, §5. Tests over injected deps: the handshake sets and clears the variable within one call,
  makes the logs folder first, logs nothing when consumed and one error line when not; the updater makes no check and
  no download in a diagnostic build and is today's in a normal one (both through the stubbed define); the dialog's
  words. Then run the dead-code proof yourself: `npm run build` and the stamp-normalised `diff -rq` of `out/` against
  the parent's must be empty.
- **`events`**: §4.3. Each event's test drives the real function with the define on and asserts the record and its
  fields; with it off, no record. Run `conformance:watcher`, `conformance:pocket` and `:pocket:hostile`.
- **`package`**: §4.4, §4.7, §4.8. Build the diagnostic `--dir` package in a `cp -Rc` clone with a checker you build,
  read it back (module hash, no feed files, bundle id, About stamp), and launch it once through `withElectron` on a
  scratch profile inside 25 s (the `diagnostic.armed` line in its `app.log`). Check the workflow with a YAML parser and
  run its diagnostic job's `run:` steps locally with every sign, notarize, staple and upload stubbed (`xcrun` and
  `security` replaced by scripts that record their arguments, no `APPLE_*`), so only the build and the package run.
- **`gate`**: §7.1, its fixtures and ablations; `npm run conformance:diagnostic` before it returns.
- **`probe`**: §8 and `--grader-self-test`; it does not run the app (the verifiers do).

Every builder runs `npm run typecheck` and `npm test` (under the history block; name the four `/bin/ps` tests as they
fail) before it returns, and returns every file it changed with its line counts.

## 10. The proof, run rather than read (Tier 3)

### 10.1 Lens A: the behaviour (Method 1 the parent, real data, the normal app unchanged)

- **A1, the normal app does not change.** `npm run build` at HEAD; `out/` against the parent's, byte for byte with the
  stamp normalised. Both packaged unsigned (`--dir`, scratch `HOME`): every file of the two `.app` trees by sha256,
  `app.asar` extracted and compared with the stamp normalised, the asar integrity in `Info.plist` explained by that one
  string. Any other difference is a FAIL.
- **A2, Method 1** (`probe:p364` R and M1 and M1n), parent first where the arm has one.
- **A3, the independent step**: the lens builds its OWN checking build from the tree's `build/diagnostic/`, and writes
  its OWN reader of the one line (from the field list in D6, not from the C), and re-derives each reading of §2.3 from
  the bytes the line carries.
- **A4, real data**: his shape (counts only) in every launch; the packaged diagnostic on it, 20 minutes (M2c).
- **A5, cost** (`probe:p364` C) beside the parent's §2.4 numbers.

### 10.2 Lens B: the attack (Method 2)

- **B1** the six connections (M2b); **B2** the §5 shapes (M2a), each read back by the lens's own reader;
- **B3** hostile damage the plants do not make: a wild pointer written into a header's `pLruNext` and into
  `apHash[h]`, a guard written with a pointer into the checker's own image, the header written with text: the checker
  must log, never fault;
- **B4** a second thread: a `worker_threads` connection walked only by its own thread (no line, no fault, while main's
  connections are planted);
- **B5** the update feed (U), and a dispatch read of `release.yml` that tries to reach a release, a tag or a feed by
  every route the gate names, each refused by D7;
- **B6** the lane dry run: the diagnostic job's steps run locally, stubs recording every sign, notarize, staple and upload
  call: the artifact is a DMG named `-diagnostic-`, no `latest-mac.yml`, and nothing reached the network but the
  headers already on disk;
- **B7** going back: the diagnostic app on a profile, then the parent's normal package on the same profile: every row,
  no refusal, no unclean notice; and a profile the normal app wrote first, then the diagnostic (the install path).

### 10.3 Not run, and why

`conformance:resume:capture` and the full `conformance:resume` (real agents); `smoke`, `smoke:t1`, `smoke:t3` (the main
session's); a signed or notarized build and `verify-signed.mjs` against his identity (his word at the signing step);
library validation of the swapped `.node` under his Developer ID (proved only by the lane's signed build, as Phase 365
left `watcher.node`'s and 366 left 43.8.7's).

### 10.4 No regression (both builds)

The quit table at HEAD's normal build against the parent (`smoke:quit`, `smoke:quitdoors`, the menu's Quit on his shape):
the normal build is byte for byte, so any difference is the machine's. The diagnostic build against the normal one: §8
C and M1's quit and relaunch. A scenario worse than the parent is a defect: fix it or drop the part, and name which.

### 10.5 At the end, once

The Electron count with CLAUDE.md's command, outside the history block; every `p364` socket under
`/private/tmp/tmux-501/` gone; the crash reports by name and mtime against the start; every scratch `.dmp` deleted;
`release/` removed everywhere; the history stats.

## 11. The integrator's commands (in order; each with its exit code and PASS line in the report)

1. `npm run typecheck`
2. `node build/contract-inventory.mjs --check` (must match; a diff is a finding)
3. `npm test` (history block, `TMPDIR` through `/var`; the four `/bin/ps` tests named)
4. `npm run build` (`gate:electron` 188 against 188; every gate inside)
5. `npm run conformance:diagnostic`
6. `npm run check:checker -- --out <scratch>` (history block; every arm and every ablation)
7. `node build/conformance-diagnostic.mjs --node <scratch>/diag/build/Release/better_sqlite3.node --node <scratch>/test/build/Release/better_sqlite3.node`
8. `npm run conformance:watcher`, `conformance:pocket`, `conformance:pocket:hostile`, `conformance:machines`,
   `conformance:stoppedlist`
9. The normal `out/` against the parent's (`diff -rq` with the stamp normalised): empty
10. `node build/diagnostic/package.mjs --dir --checker <scratch>/diag/…` in a `cp -Rc` clone, under a lock slot,
    unsigned: its JSON line (module hash, no feed files, the schema pair)
11. `node build/p364/probe-p364.mjs --grader-self-test`
12. The Electron count, the sockets, the crash reports, the history stats

`smoke`, `smoke:t1` and `smoke:t3` are the main session's; `smoke:quit` and `smoke:quitdoors` may be run under a lock.

## 12. What is NOT in this phase

- No change to the normal app or its release: no CHANGELOG item, no version, no tag, no published artifact.
- Nothing published, tagged, attested or offered by the updater; no build without his word at the signing step; no
  `workflow_dispatch` by any agent.
- No upload of any log or dump: he reads the line and decides what to share.
- No repair, latch, notice or quit change: 357's and 357.1's paths run as they are; the checker only writes its line.
- No change to SQLite's own code paths beyond the guard, and no change to better-sqlite3's behaviour beyond the four
  breadcrumbs; no `sqlite3_initialize` at load.
- No checker in a utility process (the watcher and the door hold no SQLite connection).
- No register capture in Crashpad (research 144 §5: out of scope on purpose).

## 13. For the main session at landing

1. The full battery with `smoke`, `smoke:t1`, `smoke:t3` and the NORMAL unsigned package: the package must be the
   parent's byte for byte apart from the stamp (Lens A1's method).
2. The lane is untested in CI by design; its first real run is his dispatch. Read §4.7 with him before that.
3. When he says go: dispatch `release.yml` with `diagnostic: true` (he presses it), download the artifact, and before
   he installs read `bs3.json` and `package.mjs`'s schema pair (D14).
4. Cleanup after the follow-up commit: this worktree, `wt-p364-parent`, and `/private/var/tmp/tortie-wt/scratch/p364/`
   (the spec step's `dce/` clone is 1.2 GB).

## 14. Questions for him (the main session asks; the build proceeds on the defaults)

1. **The diagnostic app's updater.** Default: off. It never checks or downloads, "Check for Updates…" says the build
   does not update, and going back is installing the normal release yourself. The other choice: on, so the next
   normal release installs over it at a quit and the diagnostic run ends then.
2. **What the line carries.** Default: the charter's fields, the first 64 page bytes included, which can hold a
   fragment of a session's name or folder; you read the line before sending it. The other choice: those bytes as a
   hash, which keeps the reading but loses what the page was.
3. **How often it checks.** Default: at most every 25 ms per thread while Tortie uses its session list, and always when
   a connection closes; measured cost, nothing you can see. The other choice: every call, which a long list read
   would feel.
4. **The lane.** Default: a second job in `release.yml`, run only when you press Run workflow with `diagnostic`
   ticked; it signs and notarizes with the same secrets and uploads a DMG to the run, never to a release. The other
   choice: a workflow file of its own.
5. **When the line comes.** Default: keep using it; it writes one line and keeps going; send the line when you choose.
   The other choice: a notice in the window when it writes, which this build does not have (no new surface).

## §As built (the integrator, 2026-11-09, 22:29 to 22:55 UTC)

Six builders, then the integrator, in `/private/var/tmp/tortie-wt/wt-p364` at `3c0ac355`. Nothing committed, staged or
stashed. `git diff 3c0ac355` is 15 changed files (430 insertions, 10 deletions) and 24 new ones, all this phase's.
Every default of §14 holds (the build proceeded on them).

### What is in the tree

| Builder | File | Lines |
| --- | --- | --- |
| `checker` | `build/diagnostic/sqlite-checker.c` | 1,166 |
| | `build/diagnostic/build-checker.mjs` | 424 |
| | `build/diagnostic/hook-bs3.cjs` | 50 |
| | `build/diagnostic/checker-selftest.mjs` | 954 |
| `main` | `src/main/diagnostic-build/{flag,checker,events}.ts` | 30, 131, 37 |
| | `src/main/index.ts`, `src/main/updates/updater.ts`, `src/main/updates/ui.ts` | +13, +17 −1, +34 −1 |
| | tests `p364-checker.test.ts`, `p364-events.test.ts`, `p364-updates-off.test.ts` | 400, 104, 332 |
| `events` | `src/main/watcher/host.ts`, `src/main/attach/attach-host.ts`, `src/main/pocket/bind.ts` | +20 −1, +16, +18 |
| | three `p364-events.test.ts` (watcher, attach, pocket) | 298, 238, 283 |
| `package` | `electron.vite.config.ts`, `.github/workflows/release.yml` | +15 −1, +152 −1 |
| | `build/diagnostic/after-pack.cjs`, `build/diagnostic/package.mjs`, `build/p364/CHECKLIST.md` | 158, 1,039, 52 |
| `gate` | `build/conformance-diagnostic.mjs`, `build/diagnostic-fixtures/` (four files) | 4,308; 83, 185, 45, 41 |
| `probe` | `build/p364/probe-p364.mjs`, `build/p364/fixtures/graders.json` | 2,930; 5,195 |
| integrator | `vitest.config.ts`, `package.json`, `build/verification-checks.mjs`, `build/assert-electron-teardown.mjs`, `build/assert-bundle-refusals.mjs`, `CLAUDE.md`, `DEVELOPMENT.md`, this section | +9, +4, +66, +13 −1, +40 −4, +2, +11 |

### The seams the integrator reconciled

1. **`vitest.config.ts`** defines `__TORTIE_DIAGNOSTIC__` as `'false'` at the top level (D1.d). Vitest hands a define to
   a module as a global, so the builders' `vi.stubGlobal('__TORTIE_DIAGNOSTIC__', true)` still wins (the events
   builder measured it: 91 of 91 with the define in a clone).
2. **`package.json`**, four scripts: `probe:p364` (`node build/harness-socket.mjs --fresh gmux-p364 'node
   build/p364/probe-p364.mjs'`), `conformance:diagnostic`, `package:diagnostic` (`node build/diagnostic/package.mjs`;
   `npm run package:diagnostic -- --self-test` is its self-test, exit 0, and with no `--checker` it refuses, exit 2)
   and `check:checker` (`node build/diagnostic/checker-selftest.mjs`).
3. **`build/verification-checks.mjs`** classifies the four: `conformance:diagnostic` pure, `probe:p364` electron (its
   needs line names the packaged apps and the test variant), and `check:checker` and `package:diagnostic` as adapter
   entries, because the six types hold no "package" and no "native build". Neither of those two names is in the check
   family `build/assert-hermetic-checks.mjs` requires (`test|smoke|probe|conformance|gate|pin|assert|verify`), so
   they are classified because §6 asks, as `gen:menu-icons` is; the gate now reads 288 check scripts (286 at the parent).
4. **`HELPER_USER_FLOOR` 187 → 188** for `build/p364/probe-p364.mjs`, with its paragraph. Phase 359 raises it in its own
   tree too, so the second landing makes it 189.
5. **`build/assert-bundle-refusals.mjs`** (a file two builders needed, §9.1). Rule 7 removes the update check from the
   diagnostic bundle, and with it the sentences of two refusals, `updater.feed-override-refused` and
   `updater.no-second-staging`, so `package.mjs`'s read-only checks refused every diagnostic package (both the `main`
   and the `package` builder hit it). The rows gain `diagnosticAbsent` (`.setFeedURL(` and `.checkForUpdates(`, and
   `.checkForUpdates(`); in a bundle whose stamp ends ` Diagnostic` AND which holds rule 7's line, those rows hold by
   the guarded calls being ABSENT, and the run fails if either call survives. The `main` builder's form was taken over
   the `package` builder's, because it asks for the stronger fact (the calls gone, not only their sentences). The
   normal bundle is read exactly as before; no table changes size, so `contract-baseline.txt` does not move.
6. **`CLAUDE.md`**: a `conformance:diagnostic` row in the path-triggered table (above `gate:contract`) and a `probe:p364`
   row in the probes table (after `probe:p365`). **`DEVELOPMENT.md`**: one paragraph after the Scripts table, beside
   `npm run package`, because the file has no section of its own for the release lane. **`CHANGELOG.md`**: none.
7. **`out/p357/probe-p357.json` moved out of the worktree's `out/`** to
   `…/scratch/p364/integrator/kept/out-p357/probe-p357.json` (sha256 `25c79683…`, unchanged). It is the spec step's
   `probe:p357` report (§2.6), written at 15:45 by that probe's `OUT = join(ROOT, 'out', 'p357')`, not a build output;
   `electron-builder.yml` packs `out/**`, so it would have entered every package made from a copy of this worktree and
   turned A1's comparison red. It is in no `git diff` (`out/` is ignored).

### Where the builders' measurements overrode this spec (each recorded by its builder, kept here)

- `flag.ts` is `typeof __TORTIE_DIAGNOSTIC__ === 'boolean' && __TORTIE_DIAGNOSTIC__` (build-info.ts's own guard), not
  the bare define: `build/p3333/sample.mjs --check`, run under tsx inside `npm run build`, reaches `updater.ts` with no
  define and threw. `conformance:diagnostic` D1.b accepts both forms; the normal `out/` is still byte for byte.
- `ui.ts`'s diagnostic statement sits ABOVE the `try` of `runInteractiveUpdateCheck`: rollup 4.62.4 keeps every
  statement inside a `try` block, and inside the `unsupported` case it left `if (DIAGNOSTIC_BUILD) ;` and the flag's
  const in the normal bundle. No rule of the gate sees a `try`; the `out/` comparison below is that proof.
- `index.ts` calls `armChecker()` right after `startCrashCapture(...)`, not right after `initLogging()`, because Phase
  357's `p357-crash-handlers.test.ts` pins the capture as the statement after `initLogging()`; it is still above the
  first SQLite open.
- The events: in Electron 43.8.7 a forked process has no pid until its `spawn` event and none in its `exit` listener,
  so the watcher's start record is written at its first word (`ready`), its exit carries no pid, and the door's fork
  carries the generation (the pid rides on `open`).
- `package.mjs` hands electron-builder a one-off config file instead of `-c.publish=null`, which electron-builder reads as
  the STRING "null" (it turns "null" into null for `mac.identity` alone), and a DMG build then looks for a publisher
  named "null". A `--dir` build never asks for a publisher, so a `--dir` app holds no `app-update.yml` normal or
  diagnostic (measured below on three apps): only a DMG shows the feed difference. Off the runner it refuses a
  checkout holding `.git` (a copy of a worktree keeps a `.git` file naming the worktree's index).
- The lane builds headers into `"$RUNNER_TEMP/electron-gyp"` with `--fetch-headers` (§4.7), not `$HOME/.electron-gyp`
  (D13); D7.g reads it green.
- The checker is `364.2`: one `#ifndef TCHK_ABLATE_*` per rule and an `#error` that keeps an ablation out of a
  non-test build; absent values are JSON `null`; redaction as `src/main/log/redact.ts`; the guard is also checked at a
  free and a realloc (`A SQLite allocation failed its check`); the spec step's C read `c->szPage` after "the cache
  cannot be read" (the `gate` builder's D5 found it), and the tree's C carries the page size in `TchkFail`.
- `probe:p364`'s M2c runs the two DEVELOPMENT builds (a packaged Tortie ignores `GMUX_TAILSCALE_BIN`,
  `src/main/machines/tailscale.ts:158`, so a packaged app's door cannot be paired over the stand-in), it needs a new
  input `P364_DIAG_NODE`, and its whole run is about an hour by its builder's estimate, not half an hour.

### The integrator's commands (§11), in order

History block for everything but the Electron and `/bin/ps` runs, which ran through the integrator's `lockrun.sh`
(`zsh -f`, a lock slot released once from a trap, `HOME`/`ZDOTDIR` in scratch, `HISTFILE=/dev/null`, `SHELL=/bin/sh`,
every `CSC_*`, `APPLE_*`, `GMUX_*`, `CLAUDE*`, `TMUX*`, `P358ADV_*`, token and terminal variable unset). Load average 4.6
to 11.9.

| # | Command | Exit | Wall | Numbers |
| --- | --- | --- | --- | --- |
| 1 | `npm run typecheck` | 0 | 3 s | import boundaries 1,448 files, 8,262 imports, 0 violations; no runtime cycles, 5,057 edges; shared types OK |
| 2 | `node build/contract-inventory.mjs --check` | 0 | 1 s | byte for byte |
| 3 | `npm test` (scratch `HOME`, `TMPDIR` `/var/tmp/…`) | 1 | 66 s | 22,964 passed, 4 failed, 24 skipped of 22,992; files 1,202 passed, 3 failed, 4 skipped of 1,209. The four are the `/bin/ps` tests that cannot pass inside the block: `process-table.native` ×1, `ps.native` ×2, `p269-env-names` ×1 |
| 4 | `npm run build` | 0 | 49 s | `gate:electron` 593 files, **188 reach the helper against a floor of 188**; `gate:background` 595 files, 4 starts in a `finally`; `gate:simulator` 5 of 5; `gate:docker` 2 of 2; known-hosts 625 files; `assert-hermetic-checks` 288 check scripts, 55 `tsxCli` importers against 54, 1,209 test files; refusals as the parent's (8 updater in the shipped bundles); `conformance:ios` 55 rules; `gate:onlyadd`, `conformance:harnessprobes` (6 clauses, 16 ablations), stapler self-test; contract byte for byte |
| 5 | `npm run conformance:diagnostic` | 0 | 0.85 s | 34 clauses green, 157 attacks red, 43 controls green, 5 readers proved, 6 not applicable (D8 on the shipped prebuild alone) |
| 6 | `npm run check:checker -- --out …/integrator/selftest --devdir <cp -Rc of the installed headers>` | 0 | 155 s | 24 passed, 0 failed, 0 unreadable: §2.2's four rows (control 40 of 40, crash-state and zero-header SIGSEGV at `0x34` in `pcache1EnforceMaxPage+0x68` exit 139, page-zero 10 `SQLITE_CORRUPT`), the guard at a free, redaction, the abort, the `#error` fence, the hook, D10's read-back, all eight ablations caught then missed (`readable`'s a fault), the diagnostic variant silent, D10 by `strings` and `nm -u`, no `prebuilds/`, every refusal of `build-checker.mjs`, `node_modules` unmoved, 0 reports added |
| 7 | `node build/conformance-diagnostic.mjs --node …/diag/… --node …/test/…` | 0 | 0.88 s | 34 clauses, 160 attacks red, 43 controls, 3 not applicable; D8 read the first as diagnostic and the second as test, 7 attacks red, 1 control green |
| 8 | `conformance:watcher`, `:pocket`, `:pocket:hostile`, `:machines`, `:stoppedlist` | 0 each | 4, 13, 17, 27, 3 s | pocket 192 rules, 25,803 checks; hostile 363 arms; stoppedlist 15 rules over 1,445 files, 178 ablations and a control |
| 8b | `conformance:runtime`, `conformance:farattach` (they read `verification-checks.mjs` and `assert-bundle-refusals.mjs`); `package.mjs --self-test` | 0 each | 2 s, <1 s, <1 s | 4 runtimes, 3 loading each module once; 11 rules; 66 rules, 60 ablations |
| 9 | `diff -rq` of the parent's `out/` (copied, its stamp written `3c0ac355-dirty` as HEAD's) and HEAD's `out/` | 0 | | **empty: 509 files each, byte for byte** |
| 10 | `package.mjs --dir --checker …/diag/…` in a `cp -Rc` clone with `.git` removed, a lock slot, scratch `HOME` holding the 43.8.7 zip, `ELECTRON_BUILDER_CACHE` his (read only), `ELECTRON_MIRROR` a loopback mirror of the seeded zip | 0 | 33 s | `checker` and `packedModule` `2ed311ed…` (2,015,680 B, `sameAsChecker` true); `node_modules` prebuild `98e0e8ac…` unchanged; `appUpdateYml` false, `latestYml` []; bundle id `com.itavero.tortie`; stamp `dev Diagnostic`; `mainNamesChecker` true; schema 20/13 against `v0.114.1` 20/13, `goingBack: same`, `filesSame` true; "skipped macOS code signing reason=identity explicitly is set to null", no `identityName`; refusals "8 updater refusals hold in the diagnostic bundle: 6 by their words, and 2 by the check they guard being absent"; the mirror served 2 loopback requests and nothing left the Mac |
| 11 | `node build/p364/probe-p364.mjs --grader-self-test` | 0 | <1 s | PASS: 20 graders, 91 clauses each red alone, 82 needs each unreadable alone, 366 fields, 39 raw fixtures, 63 reader checks |
| 12 | the end counts | | | below |

The three modules hash exactly as the `checker` builder's: test `e2066656…` (2,016,384 B, UUID `218B0393`), diagnostic
`2ed311ed…` (2,015,680 B, UUID `94A7373C`), plain `8e25e56a…` (1,997,488 B, UUID `40DA5C26`), and every ablation
module too: the build is deterministic across folders. With `P364_CHECKER_BS3` naming each built variant, the phase's
six test files pass 47 of 47 against the real C side (the handshake removes the variable and the C writes its armed
line into the named app.log).

### The battery beyond §11 (one Electron at a time, each under a lock slot)

| Run | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| The NORMAL unsigned `--dir` package at HEAD and at the parent, each in a `cp -Rc` clone with `.git` removed, over its own built `out/` (the package script's read-only checks, then `electron-builder --mac --dir --publish never -c.mac.identity=null`) | 0, 0 | 8 s, 8 s | "skipped macOS code signing … null" both; no `identityName` |
| The parent's normal app against HEAD's, every file by sha256, `app.asar` entry by entry | | | **845 files each; only `Info.plist` and `app.asar` differ; `app.asar` 2,444 entries each and only `out/main/index.js` differs, by the stamp alone (`"3c0ac355"` against `"3c0ac355-dirty"`); `Info.plist` differs in `ElectronAsarIntegrity` alone, each app's value the sha256 of its own asar header** |
| HEAD's normal app against the diagnostic app | | | 845 files each; `Info.plist` (the integrity, explained), `app.asar` (`out/main/index.js` and the module's entry) and the unpacked `better-sqlite3/prebuilds/darwin-arm64.node` (`98e0e8ac…` → `2ed311ed…`, mode 644 both); the diagnostic app ad hoc, `TeamIdentifier=not set` |
| HEAD's diagnostic `out/` against its normal `out/` | | | `out/main/index.js` alone; the diagnostic bundle names `TORTIE_CHECKER`/`armChecker`/`diagnosticEvent` 13 times and `checkForUpdates(`/`setFeedURL(` 0 times; the normal 0 and 3 |
| The normal package launched once (`withElectron`, absolute program, scratch profile, `gmux-p364i…`, every probed agent hidden, ended inside 25 s) | 0 | 3.5 s | PASS: window 969 ms, ended 3,460 ms; `agents:list` stand-ins only; 0 `diagnostic` lines; one updater line ("the updater state on disk reads unknown. Nothing to repair."); 0 dumps |
| The diagnostic package launched once, the same way | 0 | 3.6 s | PASS: window 981 ms, ended 3,571 ms; `diagnostic.armed` `installed: true`, `variant` diagnostic, `guard` 16, `floorMs` 25, `pid` the app's; "updates are off in this diagnostic build"; 0 `diagnostic.pcache` lines; watcher `send` ×2, `start`, `exit` records; 0 dumps |
| `smoke:quit` (its harness line; `out/` was just built) | 0 | 4 s | PASS 2 of 2: held, SIGKILL after 2,496 ms, held line, sentinel armed, 0 dumps, 0 reports; teardown exit 0 after 1,771 ms; 48 of 48 fixtures |
| `smoke:quitdoors` | 0 | 1 s | PASS 9 of 9 doors, SIGKILL after 1,861 ms, 0 dumps, 0 reports |
| `smoke:fault` (`node build/fault-harness.mjs --json …`) | 0 | 57 s | PASS, 20 cases, every invariant held |

### For the verifiers (found while integrating; not the integrator's files, so not changed here)

1. **The watcher's `start` record names no pid in the packaged app**, 2 of 2 diagnostic launches (the `package`
   builder's at 22:19:23Z and the integrator's at 22:49:42Z): `{"generation":1,"what":"start"}`. The `events` builder
   measured the pid present at the first message in a scratch app; in the real app the watcher's `ready` arrives before
   Electron sets `pid` (in one launch after both `send` records, in the other before them). D9's start record therefore
   names no watcher pid; the generation still pairs each start with its exit.
2. **No text rule refuses an `if (DIAGNOSTIC_BUILD)` inside a `try`**, which rollup keeps in the normal bundle
   (measured by the `main` builder). Today none is (row 9 and the package comparison are the proof); a later round that
   adds one is caught only by an `out/` comparison.
3. **`app.log` keeps 2 MiB and one archive** (`src/main/log/transport.ts:22-25`), and the diagnostic build adds about
   200 to 260 bytes per watcher request and per attach. How long the one line survives under his use is unmeasured
   (the `events` and `package` builders' question; M2c can measure the growth).
4. A `--dir` package proves nothing about the feed file (row 10 and the three apps above all hold none). The unsigned
   diagnostic DMG was built only by the `package` builder's lane dry run (`dry-3`, every sign, notarize, staple and
   upload stubbed): one `-diagnostic-` DMG, no `latest*.yml`, no `app-update.yml`.

### His history, his reports, the end

- History: `.zsh_history` read `744066 1794263264` at the integrator's first stat (22:29:17Z) and `744094 1794263376`
  (22:29:36Z) from the next one on, while only file reads and history-blocked commands of the integrator ran, so the
  move is his; it never moved again across any run through the end (22:54:47Z). `.bash_history` `23166 1790702242`
  throughout. The builders recorded their own moves, each while only blocked commands of theirs ran.
- Crash reports: 98 entries at the start and at the end, identical by name and mtime (the self-test's own count, which
  counts files only and hidden names too, 105 before and after). Deliberate faults: 4, the self-test's (crash-state, zero-header,
  `readable` ablated, an abort), each ended by the test variant's own handler with exit 139. The fault battery's and the
  smokes' ends are SIGKILLs, which macOS does not report. No Crashpad dump anywhere under the integrator's scratch (0
  `.dmp`).
- The Electron count, once, outside the block: none of the integrator's; his Tortie (692) and its crash handler (2727),
  and Slack's, Chrome's, Granola's and Cursor's crash handlers. No process names a `p364` path. `/private/tmp/tmux-501/`
  holds `gmux` alone. All three lock slots free. `release/` removed from the three clones; none in the worktree or the
  parent. His `~/Library/Caches/electron` and `electron-builder`: nothing newer than the start. 24 GiB free.
- Outside the block, said plainly: the five Electron runs and the end's `ps` (through `lockrun.sh` or `env -i … zsh
  -f`), and the tool shell's own `I=…; cd …` in front of blocked commands. Nothing interactive.

### Not run, and why

`smoke`, `smoke:t1` and `smoke:t3` (the main session's, at landing); `conformance:resume` and
`conformance:resume:capture` (real agents); `probe:p364`'s live arms (the verifiers'); a DMG package (above, item 4);
signing, notarization, stapling and `verify-signed.mjs` (his word at the signing step); `build-checker.mjs
--fetch-headers` (the network; the lane's alone); `smoke:remote` and `smoke:machines` (never).

### The fix round (the fixer, 2026-11-14, once)

Both lenses answered `needs_work`. One fixer, once, five days after them (a usage limit stopped the first attempt).
**The tree was not exactly as the lenses left it**: the stopped attempt had already edited `sqlite-checker.c` (1,166 to
1,440 lines) and `checker-selftest.mjs` (954 to 1,018) and left builds and two measurements in its scratch
(`…/scratch/p364/fixer/`, with the lenses' copies of the files it meant to touch in `fixer/orig/`). This round read every
line of that work, kept what was right and finished it. Nothing committed, staged or stashed. `git diff 3c0ac355` is
still 15 changed files and the same new ones; against the lenses' copies this round moved `sqlite-checker.c` (+390
−79), `checker-selftest.mjs` (+91 −9), `conformance-diagnostic.mjs` (+125 −15), `probe-p364.mjs` (+159 −39),
`fixtures/graders.json` (284 to 297 entries), `package.mjs` (+24 −2), `assert-bundle-refusals.mjs` (+10 −4),
`CLAUDE.md` (two rows reworded), and this file (§4.1 and §4.5 point here). `/private/tmp/tortie-ops/lock.sh` was gone
(the `/tmp` cleaner): every slot here was taken through `/private/var/tmp/tortie-ops/lock.sh`, which takes the same
slot folders.

| Finding | What changed | Proof |
| --- | --- | --- |
| B major: the walk's cost explodes past 48 VM regions, and the floor counted from a walk's START | `TCHK_REGIONS` 1,024, kept in address order (binary search, the oldest replaced once full). The cadence: the next walk is due `max(25 ms, 20 × the last walk's cost)` after that walk's END (`TCHK_SHARE`), so walks take at most 1 part in 21 of a thread's time | The cost table below |
| A and B major: a foreign free read as a stray write, because `bulk` came from the damaged header | A line is from the bulk block by its ADDRESS (inside `pBulk`, its extent the allocator's size of it, asked only after the bulk block's own guard reads whole, which the walk now checks); the guard is always written for any other line; the header's claim is said in `detail` when it is not where the line is. Two readings for what Tortie's running main process leaves (both lenses measured it): `the allocator's fill for freed memory (0xcd) in the guard and the header: freed by code outside SQLite`, and `… in the header and other bytes in the guard: freed by code outside SQLite, then written over` | The reading table below |
| A and B major: a packaged app drops `--require` from `NODE_OPTIONS`, so six arms were UNREADABLE by construction (§4.5 was wrong) | A packaged launch starts with `--inspect-brk=0`; the probe loads the hook, the tracker and the recorder on main's first paused line through `createRequire`, resumes and disconnects. C loads nothing. A development build still takes `NODE_OPTIONS` | Every arm readable, below |
| B major (tooling): M2b's overview, symbol index and OpenCode arms never took the plant | Their caches hold twenty lines or fewer, all in the bulk block, so no line was allocated on its own. `P358ADV_PLANT_BULK=1` (test variant, crash-state, zero-header and page-zero only) takes the oldest bulk line then; M2b alone passes it | 9 of 9 M2b arms read |
| B minor: deleting the hash table's `tchkReadable` was caught by nothing | D5 now reads tables of walk-type pointers (`ap[h]`) and `Db` and `sqlite3` pointers (`aDb[i]`): 3 attacks (that exact deletion among them) and a control. The self-test's `readable-hash` arm: a wild table pointer caught with the rule, a fault without it | conformance and the self-test |
| B minor: the refusals knew a diagnostic bundle only by its stamp AND rule 7's line | Decided by the stamp alone; a stamped bundle must then say `updates are off in this diagnostic build`. New clause **D2.c**: `initUpdater`'s guard after only its latch, one log line, a bare `return`; `checkForUpdatesNow` answers `unsupported` first (8 attacks, 2 controls) | conformance; both bundles below |
| B nit: the LRU walk reported the garbage, not the holder | A failed back link asks whether the line is on a hash chain; if not, the line holding the link is reported | self-test `lru-garbage` |
| B nit: a DMG build left its `.blockmap` | `package.mjs` removes it after a DMG build and its read-back refuses one (`blockmapsRemoved` in the JSON line) | `package.mjs --self-test` 67 rules, 61 ablations |
| B nit: M2b-ring-evidence read no SEGV line on the dev build | Not traced on the dev build; on the packaged app, the arm the SPEC names, the handler's line is read and the arm passes | M2b below |
| A nit: stale text | CLAUDE.md's two rows (35 clauses, 176 attacks; the try sentence; the updater; U-feed-file; the inspector); M2c's title names no minutes and its PASS line prints the minutes it ran | |

**The reading table, re-derived in the running app** (the packaged diagnostic app, the test variant by the hook, his
shape, the plant in the session list at walk 3,000; `probe:p364` M2a and M1, `P364_KEEP` lines read):

| Plant | Guard | Header | Reading |
| --- | --- | --- | --- |
| foreign free | `cd` × 16 | `cd` × 56 (page numbers 3,452,816,845) | the allocator's fill: freed by code outside SQLite; `bulk` false, `detail` names the header's false claim |
| foreign free, then `calloc(1, 4096)` (the take waits for the allocator to let the slot go) | zeros | zeros | zeros: freed, then taken by a zero-filled block (TAKE same-slot=1) |
| two words over the guard | the words | whole | a stray write; `words` names `libsystem_malloc.dylib!malloc_zone_malloc` |
| the crash state | whole | owner 0 | a stray write (anything else, as §2.3) |

In plain node (the self-test, libmalloc fills nothing, so the plant lays PartitionAlloc's fill itself): `freed-fill`
reads the fill, `fill-written` (the fill, then `a5` over the first 4,096 bytes) reads freed, then written over, each
with `bulk` false by address.

**The walk's cost** (`fixer/tools/digest-child.cjs` in a no-window app in Electron 43.8.7's main, his-size manifest of
5,271,552 B beside K write-filled 17.6 MB databases; ABAB; `logs2/cost-1.log`):

| K | Build | 2,000 `SELECT 1` (total) | 354-row digest (ms, five) | 3 s of back-to-back `SELECT 1` |
| --- | --- | --- | --- | --- |
| 4 | prebuild ×3 | 1.34–1.64 ms | 0.89–1.49 (first 3.47) | 13.64–13.92 M calls; 0 % in calls over 250 µs; worst 0.12–0.14 ms |
| 4 | **diagnostic, fixed** ×3 | 1.35–1.48 ms | 0.90–2.13 (one run 2.50, 5.84) | 11.95–12.07 M; **4.71–4.76 %** in walks; worst **2.91–4.90 ms** |
| 4 | integrator's 364.2 (`2ed311ed`) ×1 | **120,299 ms**, worst 67.9 ms | **21,027–21,656** | 51 calls, 100 % |
| 1 | prebuild ×2 | 1.51–1.58 ms | 0.98–3.33 | 13.63–13.66 M; 0–0.01 % |
| 1 | diagnostic, fixed ×2 | 1.39–1.40 ms | 0.98–5.17 | 12.26–12.38 M; 3.2–3.3 %; worst 1.25–1.55 ms |
| 0 | prebuild / fixed | 1.37 / 1.42 ms | 0.98–1.46 / 0.94–1.45 | 13.38 M / 12.65 M; 0 / 0.04 % |

The stopped attempt's walk report (`fixer/logs/e1.log`, the same walk code): 36,603 lines in 526 regions walked in
1.29–1.49 ms, and 40,086 lines in 3.0–3.2 ms, where 48 regions would have meant a kernel call per read.

**The commands, in order** (history block unless said; HOME, ZDOTDIR and TMPDIR in `fixer/`):

| Command | Exit | Wall | Numbers |
| --- | --- | --- | --- |
| `build-checker.mjs --variant test` and `diagnostic` (final C) | 0, 0 | 15.1, 14.2 s | test `b9cece4d…` 2,033,056 B; diagnostic `38c741d0…` 2,015,696 B (unchanged by the test-only code after it); 0 compiler warnings |
| `npm run check:checker` (final C) | 0 | 248 s | **29 passed, 0 failed, 0 unreadable**: §2.2's four rows, the guard at a free, redaction, `freed-fill`, `fill-written`, `lru-garbage`, `bulk-guard`, the abort, the fence, the hook, D10's read-back, all nine ablations caught then missed (`readable` twice, a fault each), the diagnostic variant silent, D10 by `strings` and `nm -u`, the refusals, `node_modules` unmoved; 35 reports before and after, none added; 5 deliberate faults |
| `npm run conformance:diagnostic`, and with `--node` on both built modules | 0, 0 | 0.8 s | 35 clauses green; 170 attacks red (176 written, 6 not applicable), then 173 with `--node` (3); 47 controls green; D5 46 reads in 6 functions; D8 read the first as diagnostic, the second as test |
| `npm run typecheck` | 0 | 4 s | 1,448 files, 8,262 imports, 0 violations; 5,057 edges, no cycles |
| `npm run build` | 0 | 56 s | `gate:electron` 188 against 188; the refusals' normal branch, 8 updater refusals; contract byte for byte |
| `out/` against the parent's, stamp normalised | 0 | | **empty, 509 files each** |
| `npm test` | 1 | 100 s | 22,958 passed, 10 failed, 24 skipped of 22,992 at a load average of 36 to 42: the four `/bin/ps` tests, and six FSEvents tests (`store-watch.native` 1, `p365-process.native` 1, `repo-watcher.native` 4). Alone, 8 of 10 then pass; `repo-watcher.native` fails 2 of 4 at HEAD and 2 and 3 of 4 in a copy of the PARENT at the same load, so it is the machine's, not this phase's |
| `package.mjs --dir --checker <diagnostic>` in a clone, a slot, the loopback mirror | 0 | 33 s | packed module `38c741d0…`, `sameAsChecker`; no feed files, `blockmapsRemoved` []; bundle id `com.itavero.tortie`; stamp `dev Diagnostic`; schema 20/13 against v0.114.1, `same`; "skipped macOS code signing … null", no `identityName`; "8 updater refusals hold in the diagnostic bundle: 6 by their words, and 2 by the check they guard being absent" |
| The normal `--dir` package in a clone (the integrator's `normal-pkg.sh`) | 0 | 8 s | unsigned, no `identityName`; the refusals' normal branch |
| `package.mjs --self-test`; `probe-p364.mjs --grader-self-test` | 0, 0 | <1 s | 67 rules, 61 ablations; PASS: 21 graders, 92 clauses each red alone, 83 needs each unreadable alone, 381 fields, 84 raw fixtures, 84 reader checks |
| `probe:p364`, first runs (one arm group each) | 0 | 8–304 s | M2a-foreign-free; R, M1n, M1, M2a ×3; M2b (6 passed, 3 UNREADABLE before the bulk fallback, then 3 of 3); U, C, P: every one PASS |
| `probe:p364` M2c at 5 minutes per build, three times | 1, 0, 0 | 620, 614, 617 s | every time 0 lines, no fault, the quit by SIGKILL, 77–81 projects and shells, 154–162 phone reads, 3,080–3,240 file operations, 0 errors. **RSS ratio 1.216 (FAIL), then 0.968 and 1.002 (PASS)**: diagnostic 197,856, 189,968, 207,152 KB against normal 162,688, 196,256, 206,768 KB; the normal build alone moved 27 % between its own runs (lens A: 0.971) |
| `probe:p364` R, M1n, M1, M2a, M2b, U, C, P on the final builds | 1 | 282 s | 17 passed. **M2b-integrity UNREADABLE**: the bulk fallback, then given to every M2b target, planted in the schema probe's read-only connection on the session list, whose cache is all bulk lines too, and the app faulted at that close before the integrity check opened. Fixed: only the overview store, the symbol index and OpenCode's reader take it (`bulk` on their `M2B_TARGETS` rows). **RUN FAIL** on one report, below |
| `probe:p364` M2b, after that fix | 0 | 58 s | **9 of 9 PASS**, RUN PASS, no report added |

Every C arm (5 + 5, ABAB, packaged, nothing loaded into main): drawn median 718 normal against 840 diagnostic (the
normal's spread 413 ms), refresh 1.4 against 1.3 ms, RSS 195,552 against 197,008 KB, quit 291 against 288 ms; the
final run's C passed too. U: the normal app asked the loopback feed twice, the diagnostic app 0 times and answered §5's
title and body. P: `38c741d0…`, 0 `P358ADV`, no `sigaction`, About `0.114.1` / `dev Diagnostic`, every diagnostic
launch armed once. M1: one line (the crash state reads a stray write, its guard whole), 102 rows listed after the plant,
the Quit by SIGKILL in 293 ms, the relaunch 102 rows with the same ids, 0 lines, 0 unclean notices.

**One crash report appeared in his folder during the final run**, `Electron-2026-11-14-115655.ips` (mtime 11:56:55,
never opened), inside the window of `C-diagnostic-3`, a packaged Tortie that loaded nothing and quit by its SIGKILL with
all 102 rows. Its name is the DEVELOPMENT Electron's executable, which no launch of this run was running then (R's, the
run's only one, had ended at 11:52:47); Phase 359's builder started one at 11:56:51 (pid 18509), and Phase 325.1's held
a lock slot from 11:44:10. Most likely theirs; not provable without opening it, which no role may.

**What is still worse than the parent, as measured** (the diagnostic build only; the normal app is the parent's byte for
byte but its stamp):

- **Back-to-back SQLite calls in main** (3 s of `SELECT 1`, Electron 43.8.7, no window): beside four full 17.6 MB
  databases, 11.95 to 12.07 M calls against 13.64 to 13.92 M (12 to 14 % fewer), 4.71 to 4.76 % of the time in walks
  (the design holds it under 1 in 21), and the slowest call 2.91 to 4.90 ms against 0.12 to 0.14; beside one, 12.26 to
  12.38 M against 13.63 to 13.66 M (9 to 10 %), 3.2 to 3.3 %, 1.25 to 1.55 ms; with none, 12.65 M against 13.38 M
  (5.5 %, the per-call entry cost alone). One walk stalls main for its own cost: 1.3 to 3.2 ms at 36,603 to 40,086 lines.
- **The churn's RSS** (M2c, 5 minutes): once 21.6 % above the normal build's (197,856 against 162,688 KB), then 3.2 %
  below and 0.2 % above; the normal build moved 27 % between its own three runs, so 5 minutes cannot settle 5 %.
- **The drawn list** (C, 5 + 5): the diagnostic median 122 ms later than the normal's, inside the normal's own spread
  (lens A measured it 156 ms earlier on the same harness).
- No longer worse: the 354-row digest beside four full caches (0.90 to 2.13 ms against 0.89 to 1.49; the integrator's
  checker took 21.0 to 21.7 s), 2,000 single reads, a refresh and the quit.

**Not run, and why.** `smoke`, `smoke:t1`, `smoke:t3` (the main session's); `smoke:quit`, `smoke:quitdoors`,
`smoke:fault` (nothing under `src/` moved this round and `out/` reads byte for byte against the parent's; the lenses ran
them); `conformance:resume` and `:capture` (real agents); U-feed-file (it needs DMG-built apps and none was built: the
DMG path moved only by the blockmap step, which `package.mjs --self-test` reads); the lane dry run; signing,
notarising, stapling and `verify-signed.mjs` (his word); M2c at 20 minutes (three runs at 5); the parent's normal
package (`out/` compared instead); the D9 terminal events (no churn shell attaches a terminal, as lens A said).

**The end.** 24 deliberate faults this round, each ended by the test variant's own handler with exit 139: 5 in each of
two self-tests, R's crash state twice, and 12 fresh M2b closes; 0 Crashpad dumps under this scratch. His history read
`746017 1794669318`, `746290 1794669389` and `746321 1794670684`, each move at a moment no unblocked run of this round
was alive (his), then `746321 1794670684` and `23166 1790702242` before and after every run through the end. His
reports: 27 at the start, 28 at the end, the one named above. The Electron count, once: none of this round's; his Tortie
(94808) and its crash handler (94828), other apps' crash handlers, and Phase 325.1's builder's Electron.
`/private/tmp/tmux-501/` holds `gmux` alone; `release/` removed from both package clones; 79 GiB free.
