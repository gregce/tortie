# 143. What damaged the session list's page cache

Research 143. Written 5 November 2026 against the tag `v0.114.0` (`65a4eab5`, "chore(release): 0.114.0"), which is
the code that crashed. The backlog was read at origin/main `63f584cf`. This is research only. No product code changed,
and nothing under `src/`, `build/` or `ios/` was edited.

What ran, all of it in scratch under `/private/var/tmp/tortie-wt/scratch/p358/`:

- **Electron runs.** Electron 43.3.0 main processes, about 4.5 hours in all. Each was launched through
  `build/electron-run.mjs` inside `build/harness-socket.mjs`, with a scratch profile, HOME and socket, under the
  shared three-slot lock, after `build/hidden-agents.mjs`. Some loaded a small C probe that allocates, frees and reads
  only its own blocks. Others ran 0.114.0 itself over a manifest seeded by `build/p3167/seed-sessions.mts` in his
  recorded shape, with live shells, stand-in agents, a churned folder, and the phone door through
  `build/p330/tailscale-standin.mjs` and `build/p332/dns-standin.mjs`.
- **Scratch native builds.** better-sqlite3 13.0.3 with SQLite's debug checks; a checking build that walks every
  page cache on every call into SQLite; AddressSanitizer builds; and @parcel/watcher 2.6.0 under ThreadSanitizer.
  Every build cache pointed into scratch. Nothing was installed globally.
- **Plain node runs.** About 3.5 hours under AddressSanitizer, the checking build, Guard Malloc and ThreadSanitizer.
- **The writer** launched no Electron. It re-derived the crash registers with a reader of its own, checked the
  native modules' UUIDs, read the page cache, the close, the backup ring and the crash capture in source, re-ran one
  bucket-size program, and fetched five upstream pages.

No role read his live profile, his DiagnosticReports folder (only the copy in `evidence/`), his keychain, `~/.ssh`,
`~/Keys`, `~/.claude`, `~/.codex` or any conversation store. `-L gmux` was named only by `build/electron-run.mjs`'s
census. No real agent, Tailscale, APNs, ssh host or Simulator was used, and the phone door reached only the stand-ins.
On his word, the main session read his app.log, copied the crash report, and read the manifest's sizes and times
without opening it (`evidence/README.md`).

**His shell history.** `stat -f '%z %m' ~/.zsh_history ~/.bash_history` read `742243 1793907771` and
`23166 1790702242` before and after every run, by every role that recorded it. When this writer started, the zsh
history read `742957 1793929704`: it had been written at 20:48:24 local, five minutes after the first writer was
stopped at 20:43. Nothing this phase ran is known to have written it, and this document cannot say what did. It did
not move during this writer's session, and the bash history never moved.

**Strays, disclosed.** Some of the writer's commands ran a `cd`, `mkdir`, `wc`, `head`, `grep` or `awk` step in its
tool shell beside `sandbox-exec` rather than under it, and `/bin/ps` ran outside it because it is setuid. None of them
writes history. At the end no Electron of this phase was running (section 9.4).

Every claim about Tortie is a `file:line` in the tree at `65a4eab5`. Every claim about SQLite is a line of the
amalgamation better-sqlite3 13.0.3 bundles, `node_modules/better-sqlite3/deps/sqlite3/sqlite3.c`. Every claim about
another project cites a public page (section 9.6) or a scratch measurement. The scratch folders are not kept.

**The round.** Four investigators each used a different method. The crash reader read the report against the
shipped binary. The lifecycle reader read every native-module lifecycle in Tortie and the four projects' trackers.
The malloc reproducer ran the app under macOS malloc debugging. The assertion builder ran it with SQLite's own debug
checks. Thirteen adversaries then attacked the candidates, by planting damage, by measuring the allocator and by
stressing each suspect. A judge ruled on every disagreement and measured the one question the attacks left open.
That ruling is this document's spine. A first writer was stopped at 20:43 before it finished. This document was
written afresh from the ruling, and section 4 names where it parts from that draft. The writer re-read the citations,
re-derived the numbers it could, and read the backup ring and the crash capture for what they say about timing.

**The question.** On 5 November 2026 his Tortie 0.114.0 main process (pid 52311) started at 14:24:12 local, after
the in-app update. About 21 minutes in, he saw a dialog: a read of the session list threw
`database disk image is malformed`. He quit at 14:46:58, and the quit crashed with SIGSEGV at 0x34 inside
better-sqlite3's bundled SQLite, in `pcache1EnforceMaxPage` during `Database.close`. The relaunch found the file
intact. SQLite does not damage its own page cache because a file is bad, so something else in the process overwrote
or freed that memory. What was it?

## 1. The answer first

The code that damaged the cache was not found. No measurement names it.

**What is proven.** Code outside SQLite changed memory that the page cache was still using, in at least two separate
places, before the quit began. The close then walked into that damage.

**The most likely mechanism, which is not the culprit.** Another part of the main process freed memory that SQLite
was still using, and ordinary allocations then took that memory over. The judge measured the commonest such
allocation, a zero-filled 4,096-byte buffer, landing in a freed SQLite slot. It left exactly the page header the
crash shows, in 4,096 rounds of 4,096.

What to do, in order:

1. **Ship Phase 357 as 0.114.1 once it lands and he agrees.** It does not depend on the cause. Put no native-module
   change in it.
2. **Give Phase 357's spec two inputs** (section 6). Weigh skipping the manifest's close at every quit. Let the latch
   see the error that the backup ring's change test turns into text.
3. **With his agreement, two checks that cost nothing** (section 5). The main session reads his app.log for the run,
   including the relaunch's line that says whether a crash dump of it exists.
4. **With his agreement, a diagnostic Tortie run as his everyday app** (section 5). It is the only measurement left
   that can name the code.
5. **A separate build phase for Tortie's use of @parcel/watcher**, justified by its measured races, not by this crash.
6. **Electron to the newest 43.x in a normal dependency phase.** Leave better-sqlite3 as it is and report its one
   latent bug upstream. Give node-pty's two latent defects a small phase of their own.

The findings that change what gets built:

- **Phase 357's latch cannot see the crash's own state.** A page header zeroed by a new owner makes no read fail,
  because SQLite can no longer find that page and reads it from the file instead. A planted copy of the crash's state
  raised no error and then crashed at close (section 2.3). His run did raise errors, so 357 would have skipped this
  close. A run with only that damage would still crash at quit, in `manifest.close()`
  (`src/main/sessions/core.ts:4320`).
- **The backup ring's change test hides the error.** It reads every table through the same connection and turns
  `SQLITE_CORRUPT` into fixed text (`src/main/db/digest.ts:146-148`), so nothing above it ever sees the error.
- **macOS malloc debugging cannot see SQLite's memory in Electron.** SQLite's page lines come from PartitionAlloc,
  Chromium's allocator, not from libmalloc (744 of 744). So the 66-minute malloc run says nothing about them. A
  future reproducer must check SQLite's own allocations, as adv-churn's checking build does.
- **@parcel/watcher has real memory-safety races on Tortie's own paths.** ThreadSanitizer reported 23. That earns a
  phase whatever this crash was.

Nothing here ends a session, and nothing here changes what 0.114.0 does before Phase 357 lands.

## 2. What was measured, by method

### 2.1 Reading the crash against the shipped binary

The crash reader's reading, re-derived by the writer from the report with a reader of its own
(`writer/ips_read.py`, exit 0).

- **The binary is the one that crashed.** The worktree's `node_modules/better-sqlite3/prebuilds/darwin-arm64.node`
  has UUID `C87A9325-F748-3E31-91DC-18CFB1217A68`, the report's `darwin-arm64.node`. Its `watcher.node` matches too
  (`8AE534B6-95FB-3F57-AC49-06DDC162BB74`). Its `pty.node` is a local build with another UUID; no thread in the
  report had a node-pty frame. The prebuild bundles SQLite 3.53.4 (`sqlite3.c:471`), built with
  `SQLITE_THREADSAFE=2` and `SQLITE_DEFAULT_CACHE_SIZE=-16000` (`deps/defines.gypi:38`, `:13`).
- **The faulting load.** `ldr w10,[x9,#0x34]` at `+0x10beb0`, which is `pcache1EnforceMaxPage+104`
  (`crash-reader/fn_pcache1EnforceMaxPage.txt`). It is `pPage->pCache->nRecyclable--` from `pcache1PinPage`,
  inlined (`sqlite3.c:58262-58277`). The page's owner pointer, pCache, loaded one instruction earlier, was null.
  Offset 0x34 is nRecyclable, the count of recyclable pages (`crash-reader/layout2.txt`).
- **Where in the close.** The close first truncates the cache from page 1. `pager_reset` (`:61419-61423`) clears it
  through `sqlite3PcacheTruncate(…, 0)` (`:57483-57485`, `:57441-57469`), which calls `pcache1Truncate(…, 1)`
  (`:58840-58848`). That frees every page it can reach through the cache's index whose page number is 1 or more
  (`:58330-58373`), then sets the cache's highest page number to 0 (`:58845`). `pcache1Destroy` truncates again from
  page 0, but with the highest page number at 0 it looks only in bucket 0 (`:58339-58346`, `:58860`). Then
  `pcache1EnforceMaxPage` takes the oldest unpinned page left, the list anchor's pLruPrev (`:58305-58321`, called at
  `:58866`).

| Register | Value | What it holds |
| --- | --- | --- |
| x8 | `0x13403b56200` | p, the failing page's header. Its line starts 0x1000 lower |
| x9 | `0x0` | p's owner pointer |
| x10 | `0x13403b57400` | p's link to the next-younger page, reloaded at `+0x10bea0`. It is p + 0x1200 |
| x19 | `0x13402fedf70` | the cache (PCache1) |
| x20 | `0x13402fedfc8` | its group, x19 + 0x58 |
| anchor | `0x13402fedfe0` | x20 + 0x18, the list's anchor. x10 is not it |
| FAR, ESR | `0x34`, `0x92000006` | a data abort on a read, translation fault |

Launched 14:24:11.96 and captured 14:46:58.40 local time (UTC-5), on macOS 15.7.9 (24G830).

- **The two pages were separate allocations, one slot apart.** p's neighbour sits 0x1200 (4,608) bytes away. Lines
  that SQLite carves from its own bulk block sit 0x1110 (4,368) apart (`zBulk += pCache->szAlloc`, `:58011`). So
  both lines came one by one from the allocator, in its 4,608-byte slot class.
- **SQLite cannot have made this state.** In all of pcache1 (`:57684-58966`), a page's number is written only by the
  fetch, with the number asked for (`:58612`), and by the rekey, with a new number (`:58823`). Its owner pointer is
  written only by the fetch, with the cache itself (`:58614`). The pager refuses page 0 before it asks for one
  (`:65233`). The crash reader showed this from source and disassembly, the writer's search found the same three
  stores, and both attacks agree. So the failing page either had page number 0 or could not be reached through the
  index, and its owner pointer was null.
- **At least two places were damaged.** With one damaged header, the truncate frees and unlinks every other page
  first, so p's link would point at the anchor. adv-shape measured this over the bundled amalgamation, in a cache of
  930 pages in 1,024 buckets with one page per chain (`adv-shape/run/full-2.log`, `full-3.log`):

| Shape planted | p's link at the fault |
| --- | --- |
| 1: page number and owner pointer zeroed | the anchor |
| 2: bytes 0x10 to 0x27 of the header zeroed | the anchor |
| 3: shape 1 on p and on its younger neighbour, one slot away | a page, as in the report |
| 4: the whole 56-byte header zeroed | the anchor. The neighbours' own unlinking writes p's links back, and it still faults at 0x34 |

So a second page line, the one in the next 4,608-byte slot, also escaped the truncate, or the cache's index was
damaged as well.

### 2.2 Measuring the allocator inside Electron's main process

Small C probes in Electron 43.3.0 main processes, each allocating, freeing and reading only its own blocks.

- **PartitionAlloc serves SQLite.** 744 of 744 of SQLite's own page lines belonged to PartitionAlloc, beside 20 from
  SQLite's bulk block (`adv-foreign/run/electron-scribble.log`). In plain node, 742 of 742 belonged to libmalloc
  (`adv-foreign/run/baseline-node.log`).
- **One slot class.** Requests of 4,096, 4,104 and 4,368 bytes all got a 4,608-byte slot with 4,600 usable bytes
  (`crash-reader/zone/run1.log`; `attack-electron/run1.log` to `run4.log`). Consecutive 4,368-byte requests came
  0x1200 apart (`crash-reader/zone/run1.log`).
- **SQLite's lines sit among other 4 KB blocks.** Sixteen SQLite-shaped lines and sixteen 4,096-byte blocks,
  allocated in turn, gave 28 adjacent pairs 0x1200 apart (adv-foreign, `interleave`).
- **macOS malloc debugging cannot see it.** MallocScribble wrote its 0x55 pattern over 64 of 64 checked bytes of a
  freed libmalloc block, and over 0 of a freed SQLite line (adv-foreign, `scribble`).
- **It is outside the V8 sandbox.** Malloc blocks of 168, 4,104 and 4,368 bytes fell outside the sandbox, and
  JavaScript ArrayBuffers inside it (`attack-electron/run1.log` to `run4.log`). So an out-of-bounds write through a
  JavaScript buffer cannot reach SQLite's lines. Native code can.
- **A free writes only the first 16 bytes**, an encoded free-list pointer and its inverse. The owner pointer at
  line + 0x1020 survived the free in 4,096 of 4,096 rounds (`attack2/run1.log`). A free and a same-size malloc left
  the header intact in 2,048 of 2,048 (`crash-reader/zone/run1.log`). No free zeroed anything as it ran: 0 of 4,096
  in attack2, and 0 of 512 for each of five sizes in adversary-heap's first phase (`adversary-heap/zone/run1.log`).
- **A new SQLite line gets a valid owner pointer** (`sqlite3.c:58614`), so reuse by SQLite itself cannot produce the
  crash.
- **An owner that writes all 4,368 bytes destroys the header**, 4,096 of 4,096 (`attack2/run1.log`). That was the
  only reuser attack2 measured, and on it attack2 refuted the free-and-reuse candidate.
- **An owner that asks for 4,096 bytes never writes past 0x1000, and the header starts at 0x1000.** The judge
  measured what each kind of next owner leaves (`judge/run2.log`: one Electron 43.3.0 main process, pid 903, 4,096
  rounds per mode). Each round frees a SQLite-shaped 4,368-byte line holding a planted header, takes the next
  allocation, and has the new owner write every byte it asked for:

| Next allocation | Same slot back | The old header, bytes 0x1000 to 0x1037 |
| --- | --- | --- |
| `calloc(1, 4096)` | 4,096 of 4,096 | All zero, 4,096 of 4,096: page number 0, owner pointer null, list links zero. The extra region after it is zero too |
| `malloc_zone_calloc(default, 1, 4096)` | 4,096 of 4,096 | All zero, 4,096 of 4,096 |
| `malloc(4096)` | 4,096 of 4,096 | Unchanged, 4,096 of 4,096, while the new owner overwrites the page bytes |
| `calloc(1, 4200)` or `calloc(1, 4368)` | 4,096 of 4,096 | Overwritten with the new owner's bytes |

PartitionAlloc's calloc cleared the slot well past the 4,096 bytes asked for, through the header and the extra region
at least. A 4,096-byte owner then never writes past 0x1000, so the zeros stay. The probe never planted the bytes past
the line, so it cannot say whether calloc clears those too.

- **Another thread can take a just-freed slot of this class and zero it.** In adversary-heap's 4,096 row, one freed
  block in 512 read intact and then, moments later, read zero across 0x1000 to 0x1037. Two of the 512 did not come
  back to their thread (`adversary-heap/zone/run1.log`; the order of the two reads is `zone/freecheck.c:56-96`). The
  likely reading is that another thread took the slot and zero-filled it within microseconds.
- **The main thread's last zeroing before the fault covered about one slot of this class.** Between 64 bytes and
  32 KB, `_platform_memset` returns with x3 at the end minus 0x40, and x4 at the start plus 0x40 rounded down to 64
  bytes, plus 0x40 (`crash-reader/libsystem_platform_dis.txt:2601-2645`). The report's x3 and x4 put the end at
  `0x13400150e00` and the start between `0x1340014fc00` and `0x1340014fc3f` (judge). x7 holds `0x1340014fc00`,
  exactly 4,608 bytes below the end (writer). A calloc fill of 4,600 bytes from that slot's first byte would have
  ended 8 bytes earlier, so this was not one. It is at another address from the failing page, and who did it is
  unknown. It also rests on reading x3 and x4 as memset's leftovers, which nothing proves.

### 2.3 Planting damage in a checked SQLite

adv-churn's checking build drives the shipping `ManifestStore` of 0.114.0 over a manifest seeded in his shape, in
plain node and in Electron. It plants damage, then keeps reading and writing (`adv-churn/logs/`).

- **Damaged page content with the header intact gives the reported symptom.** `plant-relchk-page-zero.log`: 10
  `SQLITE_CORRUPT` errors on reads shaped like the ring's digest and 2 on writes, a fresh connection's
  `integrity_check` said "ok", and the close was clean.
- **In the shape of his manifest**, page 61 zeroed gave 1,476 `SQLITE_CORRUPT` errors in 63 seconds. A
  `quick_check` through the live connection named the page, "Tree 6 page 61: btreeInitPage() returns error code 11",
  while the file stayed "ok" and the ring went on copying it through fresh connections (`P-pagezero-relchk.log`).
- **The crash's own header state reproduces the crash exactly.** In Electron: SIGSEGV at 0x34 in
  `pcache1EnforceMaxPage+0x68`, which is +104, after 234 checker violations (`electron-results.json`, E0). In plain
  node the same plant raised no read error at all, a fresh connection said "ok", and the close crashed at 0x34
  (`plant-relchk-crash-state.log`).

So one defect explains both symptoms:

- A line taken by a plain 4 KB block keeps its header, so SQLite still finds it, while its page bytes belong to
  someone else. A line still free has its first 16 bytes replaced. Either way reads raise `SQLITE_CORRUPT` while the
  file is fine.
- A line taken by a zero-filled 4 KB block has exactly the crash's header. SQLite cannot find it, so it reads that
  page from the file and no read fails. Its neighbours' own unlinking writes its list links back to valid values
  (shape 4), so it sits unseen at the old end of the list until the close.
- Two adjacent lines freed together give the x10 value (shape 3).

The other routes, from adversary-index (`adversary-index/discriminator.c`):

- **A lowered highest page number, plus a null owner pointer, fits the real close order, x10 included.** The
  truncate then scans too few buckets, many pages survive it, and the walk meets p among them.
- **A zeroed page count is an artifact.** The harness's `destroy_like_sqlite` (`discriminator.c:38-55`) runs
  pcache1Destroy's body without the close's own `xTruncate(1)` first, which in the real close frees every page it can
  reach whatever the count says.

**The cache's size.** His file is 5,054,464 bytes, 1,234 pages of 4,096 (`evidence/README.md`). adv-churn's
manifests started at his size, 4.85 MB, grew to 6.9 to 7.6 MB under the churn, and their caches reached 1,673 to
1,849 pages (`A-asan-his.log` 1,673, `C-relchk-his.log` 1,767, E2 1,849). The index doubles whenever it holds as many
pages as buckets (`sqlite3.c:58580`, `:58228-58231`), so those caches had 2,048 buckets and one page per chain. The
only one-header shape that fits the registers needs chains of two or more pages (`adv-shape/run/shape7.log`, a sparse
cache of 140 pages with chains of up to 3). How many pages his own connection held was not measured. If it never held
1,024 at once, its index had at most 1,024 buckets, and pages 1,025 to 1,234 shared buckets with lower pages: up to
210 two-page chains at 1,024 buckets. That variant would also need the cut-off page to sit in the very next slot
(writer's arithmetic).

### 2.4 Trying to reproduce it in a running Tortie

None of these reproduced the damage.

| Run | Where | Length | Result |
| --- | --- | --- | --- |
| Malloc reproducer: 0.114.0 under MallocScribble and guards (`malloc/logs/long1.log`) | Electron | 66 min (3,982 s) | No error. It cannot see SQLite's memory (2.2) |
| Assertion build: SQLite's debug checks and a guard walker (`assertions/run/long/summary.json`) | Electron | 83.4 min | 0 fatal, 0 corruption |
| Checking build, E2 (`adv-churn/logs/electron-results.json`) | Electron | 25 min (1,500,535 ms) | 5,426,302 checks, 0 violations, 0 SQLite errors |
| Shipped build, E3 (same file) | Electron | 20 min (1,200,708 ms) | 0 SQLite errors |
| Node arms A and B under AddressSanitizer, C the checking build, D Guard Malloc (`adv-churn/logs/`) | node | 20 to 30 min each | 0 SQLite errors; 0 checker violations in A to C |
| better-sqlite3 under forced garbage collection, with dropped connections and statements (`adv-bs3/stress/out/result.json`) | Electron | 35 min (2,100,000 ms) | Clean, 0 bad live checks |
| Watcher drops, four arms (`attack-watcher-drops/runs/long2/summary.json`) | node | 25 min each (1,504 s) | 39,685 drop batches, 574 of them real ones in the arm that injected none; 0 SQLite errors; 0 bad quick checks in 800 |
| The app with injected watcher drops (`attack-watcher-drops/runs-app/inj1`) | Electron | 30.5 min (1,832 s) | 31,554 drops, 0 errors, 0 uncaught |
| Protocol requests beside a checked connection (`attack-electron/run3.log`) | Electron | 2.3 min (138.5 s) | 118,088 requests, 48,496 of them aborted; 0 SQLite errors; integrity "ok" |

The malloc and assertion runs both paused for 12.5 minutes at the same moment. The malloc run's samples jump from
21:50:49 to 22:03:20 UTC (`malloc/logs/long1.log`). The assertion run's slowest session-list call took 739,936 ms.
After it, that run's app stopped answering, and its last quit was still running after 120 s
(`assertions/run/long/summary.json`, `harness.log`), while its SQLite counters showed no damage. It looks like the
machine pausing. It is not this bug, and nobody followed it up.

### 2.5 Reading the lifecycles and the trackers, and stressing the suspects

- **Tortie's own better-sqlite3 lifecycle holds.** A second close does nothing, a call on a closed handle is refused,
  and a live iterator blocks close ("This database connection is busy executing a query") (lifecycle reader,
  `lifecycle/bs3-lifecycle.cjs`; `adv-doubleclose/out/electron-run1.log`, E1). 35 minutes of Tortie-shaped use under
  forced garbage collection, with 99 dropped connections and 1,188 dropped statements a cycle, were clean
  (`adv-bs3/stress/out/result.json`).
- **One latent better-sqlite3 bug.** `unsafeMode()` on a closed Database reads freed memory. Under Guard Malloc it
  faults in `sqlite3_db_config` (`adv-doubleclose/out/bs3-gmalloc-final.txt`, case P1). Tortie never calls
  `unsafeMode` (no match under `src/`).
- **Nothing native changed between 0.113.0 and 0.114.0.** The four modules are the same versions. 82 files under
  `src/main` changed, and the only added `new Database(` and `close()` are in a test,
  `src/main/sessions/__tests__/p350-pi-pass.test.ts` (writer's `git diff`).
- **@parcel/watcher's races.** ThreadSanitizer reported 23 over three runs. 17 are in
  `attack-watcher-race/tsan/logs/missing.39244`: the shared-watcher registry, `removeShared` on a worker thread
  against `getShared` on main. 2 are in `attack-watcher-drops/runs/tsan-smoke/tsan.47060` and 4 in
  `runs/long2/T/tsan.95871`: `FSEventsCallback` against `startStream`, `subscribe` and `unsubscribe`, and the directory
  tree's entries map. The heap blocks it named were 32 to 416 bytes. Upstream issue #271, open since 10 October 2026,
  is the same family: "macOS: crash when unsubscribe() runs as the watched directory itself is deleted (FSEvents
  stream stopped and released twice)". Its crash reports include "BUG IN CLIENT OF LIBMALLOC: memory corruption of
  free block", and no fix is linked.
- **The watcher under a storm.** About 17 subscribes and 17 unsubscribes a second in Electron 43.3.0 crashed
  watcher.node three ways (adv-teardown): a fault in `DirTree::remove` after 29 s (`runs/long`), a call through a null
  pointer on the FSEvents thread after 19 minutes (`runs/long2`), and `napi_fatal_error` at quit (`runs/pilot2`).
- **The watcher's bucket arrays skip the 4.6 KB class**: 3,176 bytes, then 6,376
  (`attack-watcher-race/tests/buckets`, re-run by the writer, exit 0). Its event vectors do reach the class at 128
  events, 4,096 bytes (attack-watcher-race).
- **Electron's stream loader.** PR #53276, released in 43.5.0 on 31 August 2026, fixes a use-after-free:
  "NodeStreamLoader calls the stream's on(), removeListener() and destroy() methods, which are user JS", and a
  synchronous end or error "ran NotifyComplete() and deleted the loader while Start() was still subscribing the
  remaining events". Electron's own `protocol.handle` hands every response body to that loader as
  `Readable.fromWeb(body)` (its embedded JavaScript, `crash-reader/electron_strings.txt`), and Tortie registers two
  handlers (`src/main/assets/protocol.ts:117`, `src/main/preview/protocol.ts:641`). An emulation of the loader's
  order fired listeners after the delete in 31 of 120 orderings (`attack-electron/run4.log`). The 118,088 live
  requests of 2.4 ran beside a checked connection with no error. PR #53278 in the same release fixes an out-of-bounds
  index in `utilityProcess.fork()` for a short stdio array. Tortie's one fork passes `stdio: 'ignore'`
  (`src/main/pocket/bind.ts:198-202`), so that one is not reached.
- **node-pty.** It leaks one kqueue descriptor per spawn ("This leaks one kqueue file descriptor per `pty.spawn()`
  for the lifetime of the host process", upstream PR #931, merged 22 June 2026). It also writes to a descriptor number
  after that descriptor has closed (lifecycle reader). Neither writes into the heap.
- **The threads at the fault.** Only thread 0 had SQLite frames. The watcher's two threads were waiting, thread 32 in
  `Debounce::loop` and thread 33 in `FSEventsBackend::start`'s run loop. No thread had a node-pty frame, and all four
  libuv workers were idle (`crash-reader/threads.txt`, re-read by the writer).
- **Which connection closed.** A probe captured three closes in Electron (`adv-doubleclose/out/electron-run1.log`,
  E4). The manifest's showed the crash's nine interpreted JavaScript frames, with the same interpreter frame three
  times in a row. The Codex reader's showed that frame four times. Which code the JIT had compiled varies, so this is
  a hint, not proof.

## 3. The candidates, and why

The mechanism:

| Candidate | Verdict | Why |
| --- | --- | --- |
| (a) Code outside SQLite overwrote cache memory before the quit | **Proven** | 2.1. It survived every attack |
| (b) A free of live SQLite memory, then ordinary reuse | **The leading mechanism, not proven** | Every symptom follows from one defect (2.2, 2.3): a double free, or a free through a stale pointer, into the 4.6 KB class. PartitionAlloc cannot catch such a free, because the slot really is allocated, to SQLite. Nobody has seen a bad free of a SQLite line |
| (c) Damage to the cache's index, plus a null owner pointer | **Fits, but needs two defects** | Its lowered-page-number form fits the real close order, x10 included (2.3). Its two defects sit in allocations 11.4 MiB apart (x8 − x19). It cannot be told apart from (b) without the heap |
| (d) One 24-byte run of zeros in one header | **Refuted as stated** | It leaves x10 at the anchor (2.1). Its one variant that fits needs a two-page hash chain, with the cut-off page in the very next slot (2.3) |

Why (b) ranks above the others: a stray writer would need three separate aimed writes, the same 24 bytes in two
adjacent headers plus damage to page content elsewhere, and (c) needs two defects 11 MiB apart. (b) needs one.

The code that might have done it. None is tied to this crash.

| Suspect | Standing | For | Against |
| --- | --- | --- | --- |
| (e) @parcel/watcher 2.6.0 | First among suspects | The only one with measured memory-safety races on Tortie's own paths: 23 from ThreadSanitizer. Issue #271 is open, with heap-corruption reports. Three crash kinds under a storm (2.5) | The blocks ThreadSanitizer named were 32 to 416 bytes, and its bucket arrays skip the 4.6 KB class, though its event vectors reach it at 128 events. The four 25-minute node arms and the 30-minute app run were clean (2.4). His Mac ran 0.113.0 for days with the same drops logged, and that process quit cleanly (`evidence/README.md`) |
| (f) Electron 43.3.0 | Possible | #53276 fixes a use-after-free on a path Tortie uses. Its emulation fired listeners after the delete in 31 of 120 orderings (2.5) | 118,088 live requests, 48,496 aborted, beside a checked connection with no error. The unnamed Chromium and V8 backports in later 43.x releases cannot be assessed |
| (g) better-sqlite3 13.0.3 | Weakened, not excluded | One latent bug: `unsafeMode()` on a closed handle (2.5) | Tortie never calls it. Its guards hold, and 35 minutes of Tortie-shaped use under forced garbage collection were clean |
| node-pty 1.1.0 | Not the heap writer | Two latent descriptor defects (2.5) | Neither writes into the heap |

The closing connection was most likely the manifest's. The malformed reads were on it, and the probe's capture of its
close has the crash's frame count (2.5).

## 4. What was ruled out, and how

| Claim | What killed it | Where it went |
| --- | --- | --- |
| SQLite's own page cache did this | No path writes 0 to a page number or an owner pointer (2.1) | Ruled out |
| A line freed and left free | A free writes only the first 16 bytes, and the owner pointer survives, in 2,048 and 4,096 rounds (2.2) | Ruled out |
| A line freed and reused as another SQLite line | It gets a valid owner pointer (2.2) | Ruled out |
| Two threads in this cache, or another thread inside SQLite, the watcher or node-pty at the fault | Only thread 0 had SQLite frames; the watcher's threads were waiting; no node-pty frame (2.5) | Ruled out |
| A bad file | The relaunch's full `integrity_check` passed, because 5,054,464 bytes is under the 50 MB `STRONG_CHECK_MAX_BYTES` (`src/main/db/integrity.ts:70`) | Ruled out |
| Damage to the manifest's -shm file | It makes a fresh connection's reads malformed at once, and the live connection's after a write, and the ring's next copy then fails with a logged "manifest generation (…) failed: database disk image is malformed" line. But the live connection closes without a crash and the file reopens "ok" (`attack-shm/runs/e1-hash-garbage.out`, `e1-hash-zero-1k.out`). It cannot produce the cache state. His 14:30:13 copy, taken through a fresh connection, succeeded, and his app.log, as the main session read it, holds no such line | Ruled out |
| Tortie's own better-sqlite3 lifecycle: a second close, or a statement alive across a close | Lifecycle reader; adv-doubleclose; adv-bs3 (2.5) | Ruled out |
| node-pty as the heap writer | Its defects touch descriptors, not the heap (2.5) | Ruled out. Its two latent defects remain |
| Something changed between 0.113.0 and 0.114.0 | Same native versions; the only new open and close are in a test (2.5) | Ruled out |
| attack2: "a foreign free then reuse cannot leave a cache-resident damaged page" | It measured only a reuser that writes all 4,368 bytes. A 4,096-byte owner never writes past 0x1000 (2.2) | Overturned at its premise. (b) leads |
| adversary-index: "the page count was zeroed" | Its harness skips the close's own `xTruncate(1)` (2.3) | An artifact |
| One 24-byte run of zeros in one header | x10 would be the anchor (2.1) | Refuted as stated |
| The reads began failing about 21 minutes in (Phase 357's account) | 21 minutes is when the dialog was on screen. Main registers no uncaught exception handler, so nothing recorded the first failed read | Not settled (section 5) |
| The first writer's draft: the damage began within six minutes of launch, read from the ring's file times | The ring's silence after 14:30:13 fits a manifest that did not change just as well (section 5) | Not settled |
| ThreadSanitizer's blocks were "40- and 64-byte" (the judge) | The three logs name blocks of 32, 40, 64, 88, 160 and 416 bytes | Corrected in 2.5. The conclusion stands |

Held under attack: the fault and its registers; two damaged places; SQLite's memory in PartitionAlloc's 4,608-byte
class among other 4 KB blocks; malloc debugging blind to it; a zero-filled 4 KB owner leaving the crash's header; the
crash's state reproducing the crash exactly; the file intact.

## 5. What is not settled, and the next measurement

Not settled:

- **Which code did it, and whether by a bad free or a stray write.** Nobody has seen a bad free of a SQLite line. A
  macOS crash report holds no heap, so (b) and (c) cannot be told apart from the report alone.
- **When it began.** 21 minutes is when he saw the dialog. The ring took no copy after 14:30:13. Once five minutes
  have passed since a copy, it asks every minute unless a create or a restore is running
  (`src/main/manifest/ring-schedule.ts:230`, `:243`, `:400-416`), so it asked at each poll from about 14:35 to 14:46
  and again at the quit (`:424-427`, called at `src/main/sessions/core.ts:4480`), and each ask reads every table
  through the damaged connection. None of them copied. Two readings fit. Either no row changed for 17 minutes, which
  is ordinary while agents sit idle, because the status poll writes only on a change (`core.ts:1450-1464`) and a
  machine that cannot sign in reports no rows to write (`src/main/machines/remote-record.ts:464-479`). Or the session
  list was already unreadable through that connection by the 14:30:13 copy, and the digest's fixed text hid every
  later change (`src/main/db/digest.ts:146-148`). Nothing measured tells them apart. He may remember when the first
  dialog appeared.
- **Memory pressure.** His Mac logged a JetsamEvent at 14:22:16 listing Tortie's processes, two minutes before 0.114.0
  started (`evidence/README.md`). Under pressure PartitionAlloc discards free pages, which is a third way a wrongly
  freed line could come back as zeros. No scratch run reproduced that pressure.
- **Two allocator details.** Whether calloc also clears a slot's last 8 bytes, and whether PartitionAlloc ever zeroes
  a freed slot on its own. No measured free did (2.2).
- **His own cache's size**, which decides whether the chain variant of (d) is open (2.3).
- **The 12.5-minute pause** in two scratch runs (2.4).

**Two checks that cost nothing, if he agrees.** Both are for the main session, because no research agent may read his
profile.

1. **His app.log from 19:24:12Z to 19:46:58Z.** Look for harvest settles, "could not watch" lines, tab closes and any
   "manifest generation (…) failed" line. Each marks an event that touches a suspect or the ring.
2. **The relaunch's line at 19:47:00Z, "previous run did not exit cleanly".** It counts the crash dumps that are new
   since the crashed run started (`src/main/log/index.ts:313-336`). It tells whether the cheaper look below is
   possible.

**The one next measurement** has to run where the damage happened: a diagnostic Tortie, built and signed for him and
run as his everyday app with his agreement. Its better-sqlite3 is adv-churn's checking build (`adv-churn/bs3-relchk`),
which already reproduces the crash's exact fault from the planted state (2.3).

1. **A 16-byte guard in front of every SQLite allocation.** It still comes from the default allocator, and 4,384
   bytes still fits the 4,600 usable, so SQLite's lines stay in the same 4.6 KB class.
2. **One app.log line on the first failed check.** It gives the line's address, its guard, its header, its first 64
   page bytes, the page number, the database and the time, and the watcher, terminal and door events the build also
   logs.

How to read the result:

- A free-list entry in the guard proves a foreign free.
- Zeros in both the guard and the header mean the slot was freed and then taken by a zero-filled block.
- Anything else is a stray write, and the pointers in it can be traced to their library.

**A cheaper first look, if a dump exists.** This is the writer's addition, and it was not attacked. Tortie starts
Crashpad with uploads off (`src/main/log/crash.ts:36`) and keeps the newest five dumps for 30 days (`:25`, `:27`),
in his profile's Crashpad folder. Research 42 measured that such a dump holds every thread's stack and the process's
whole environment, a live token included, and not the full heap (`docs/research/42-logging.md:164`). Whether an
Electron 43.3.0 dump also keeps memory near the registers was not measured. If it does, the bytes at x8, x10 and x19
would tell (b) from (c) at once. So measure that first in scratch: crash a scratch main process on purpose with a
known pointer in a register, with `ignoreSystemCrashHandler` so nothing reaches his reports folder
(`docs/research/42-logging.md:166`), and read the dump's memory list. Only if the range is there, ask him to let the
main session read those bytes from his dump, and nothing else in it.

## 6. What it means for Phase 357

What its containment covers, whatever the culprit, once a manifest call raises `SQLITE_CORRUPT`:

- It stops writes that would flush damaged pages into the file.
- It shows one notice instead of a dialog per refresh, and keeps the last clean session list.
- It skips the manifest's close at quit, which is the close that crashed.
- It logs uncaught errors.
- A restart is the right remedy for every surviving cause, because the damage is in the process's memory and the
  file was fine.

What it does not cover:

- **Damage that raises no error first.** A line taken by a zero-filled block, the crash's own state, makes no read
  fail. If that is the only damage, the store never latches and the quit still crashes in `manifest.close()`. 357's
  spec could weigh skipping the manifest's close at every quit. WAL needs no clean close, the next open replays the
  log, and the integrity gate checks the file, which is 357's own argument for the latched case.
- **An error the ring's change test catches.** `contentFingerprint()` is a store method
  (`src/main/manifest/store.ts:357-363`), but the digest under it catches the error and returns
  `unreadable: <message>` (`digest.ts:146-148`). It reads every table through the live connection, every minute once
  five minutes have passed since the last copy. A latch that watches only errors reaching the store's callers misses
  it.
- **A page with unsaved changes that is overwritten before its commit.** SQLite would write the foreign bytes into
  the WAL and raise nothing. The launch gate and the backup ring are the only backstop.
- **The other five better-sqlite3 connections in main**, all in the same allocator class: the Codex state reader
  (`src/main/manifest/harvest/codex-state.ts:133`, whose close runs before the manifest's), the ring's and the
  integrity check's fresh connections (`src/main/manifest/recovery.ts:257`, `src/main/db/integrity.ts:158`), the
  overview store, `arch.db` and the symbol index (each through `src/main/db/sqlite.ts:115`).
- **The culprit itself, and the watcher's own crashes.** None of suspects (e) to (g) is stopped at its source.

## 7. What it means for a release and the native modules

- **Release.** Ship Phase 357 as 0.114.1 once it lands and he agrees. It does not depend on the cause.
- **No native-module change in the hotfix.** No culprit is proven. Changing the allocator, the watcher or Electron
  there would trade an unmeasured risk for an unproven fix.
- **A separate build phase for Tortie's use of @parcel/watcher**, justified by its measured races rather than by this
  crash:
  - allow one subscribe or unsubscribe at a time across the whole process;
  - never subscribe to a folder that may not exist, because a failed subscribe is the path that triggers the registry
    race;
  - carry upstream's fix for #271 when it lands, or run the watcher outside the main process.

  If the damage comes back with the watcher outside the main process, the watcher is cleared.
- **Electron.** Move to the newest 43.x in a normal dependency phase, not in this hotfix. 43.5.0 carries #53276.
- **better-sqlite3.** No change. Report the `unsafeMode`-after-close bug upstream.
- **node-pty.** Its two latent defects can get a small phase of their own. They do not explain this crash.

## 8. Questions for him

1. Ship Phase 357 as 0.114.1 once it lands?
   Recommended: yes. It does not depend on the cause.
2. Should 357 skip the manifest's close at every quit, not only after its latch trips?
   Recommended: let 357's spec weigh it, because the crash's own state never trips the latch.
3. Should 357's latch also trip when the ring's change test reads a table as unreadable?
   Recommended: yes. That test reads every table through the live connection, and today it hides the error.
4. May the main session read his app.log for 19:24:12Z to 19:47:00Z, for the lines in section 5?
   Recommended: yes. It costs nothing.
5. Does he remember when the first error dialog appeared?
   It would date the damage, which nothing on disk does.
6. Run a diagnostic Tortie as his everyday app after 0.114.1?
   Recommended: yes. It is the only measurement left that can name the code.
7. If his Crashpad folder holds a dump of this crash, and a scratch run shows that such dumps keep memory near the
   registers, may the main session read those bytes and nothing else?
   Recommended: yes, after the scratch run. The rest of the dump holds his environment, tokens included.
8. Queue a build phase for Tortie's use of @parcel/watcher?
   Recommended: yes, on its measured races.
9. Move Electron to the newest 43.x in a normal dependency phase, and report the better-sqlite3 bug upstream?
   Recommended: yes to both.

## 9. Evidence

### 9.1 Tortie at `v0.114.0`

`src/main/sessions/core.ts:1386-1404` (a machine's poll schedules a list broadcast without writing the manifest),
`:1450-1464` (a status change written to the manifest), `:1471` (`scheduleSessionsBroadcast`), `:2797`
(`broadcastSessions`), `:4320` (`this.manifest.close()`), `:4480-4481` (the quit's ring test, then dispose);
`src/main/manifest/sessions-repository.ts:497-499` (a status write also writes `last_seen`);
`src/main/manifest/store.ts:357-363` (`contentFingerprint`); `src/main/db/digest.ts:91-97`, `:115-122`, `:124-149`;
`src/main/manifest/ring-schedule.ts:230`, `:243`, `:362-371`, `:400-416`, `:424-427`, `:429-455`, `:472-475`,
`:485-488`; `src/main/manifest/boot.ts:495-515`; `src/main/manifest/recovery.ts:246-258`, `:589-593`, `:771-779`;
`src/main/db/integrity.ts:70`, `:158`; `src/main/db/sqlite.ts:115-125`; `src/main/manifest/harvest/codex-state.ts:133`;
`src/main/log/crash.ts:25`, `:27`, `:36`, `:93`; `src/main/log/index.ts:313-336`;
`src/main/machines/remote-record.ts:464-479`; `src/main/pocket/bind.ts:198-202`;
`src/main/assets/protocol.ts:117`; `src/main/preview/protocol.ts:641`. No `uncaughtException` or
`unhandledRejection` handler anywhere under `src/main`. `node_modules/better-sqlite3/package.json` 13.0.3,
`deps/defines.gypi:13`, `:38`; `node_modules/@parcel/watcher` 2.6.0; `node_modules/node-pty` 1.1.0;
`node_modules/electron` 43.3.0. `docs/research/42-logging.md:160-166`.

### 9.2 SQLite 3.53.4 as bundled

`node_modules/better-sqlite3/deps/sqlite3/sqlite3.c`: `:471` (version); `:57148-57177` (`sqlite3PcacheFetch`);
`:57441-57469` (`sqlite3PcacheTruncate`); `:57474-57478` (`sqlite3PcacheClose`); `:57483-57485`
(`sqlite3PcacheClear`); `:57684-58966` (pcache1.c); `:57981-58013` (`pcache1InitBulk`); `:58141-58147` (a new line's
header); `:58156-58168` (`pcache1FreePage`); `:58221-58239` (`pcache1ResizeHash`); `:58262-58277`
(`pcache1PinPage`); `:58287-58299` (`pcache1RemoveFromHash`); `:58305-58321` (`pcache1EnforceMaxPage`);
`:58330-58373` (`pcache1TruncateUnsafe`); `:58448-58470` (`pcache1Create`, the group beside the cache);
`:58580`, `:58609-58619` (`pcache1FetchStage2`); `:58797-58831` (`pcache1Rekey`); `:58840-58848`
(`pcache1Truncate`); `:58855-58871` (`pcache1Destroy`); `:61419-61423` (`pager_reset`); `:65233` (the pager refuses
page 0).

### 9.3 The crash report

`evidence/Tortie-2026-11-05-144710.ips`: Tortie 0.114.0, pid 52311, model Mac16,8, macOS 15.7.9 (24G830);
`procLaunch` 2026-11-05 14:24:11.9625 -0500, `captureTime` 14:46:58.4006 -0500; EXC_BAD_ACCESS, SIGSEGV,
KERN_INVALID_ADDRESS at 0x34; faulting thread 0, CrBrowserMain; `darwin-arm64.node`
`c87a9325-f748-3e31-91dc-18cfb1217a68` at `0x120000000`, `watcher.node` `8ae534b6-95fb-3f57-ac49-06ddc162bb74`,
`pty.node` `82ee9a3a-c3be-3bd3-a716-28170cb56cb6`; 59 threads. The register values are in section 2.1. Beside them:
x3 `0x13400150dc0`, x4 `0x1340014fc80`, x7 `0x1340014fc00`, x21 `0x134037e1588`. Frames 8 to 16 of thread 0 are the
nine unsymbolicated JavaScript frames.

### 9.4 Commands the writer ran, with their exit codes

Each ran under `sandbox-exec -f /private/var/tmp/tortie-wt/scratch/no-history.sb` unless noted.

- `df -h /`, exit 0: 77 GiB available.
- `stat -f '%z %m' ~/.zsh_history ~/.bash_history`, outside the sandbox, at the start and at the end:
  `742957 1793929704` and `23166 1790702242` both times.
- `python3 -I writer/ips_read.py evidence/Tortie-2026-11-05-144710.ips`, exit 0. The registers and differences in
  2.1: x10 − x8 = 0x1200, x20 − x19 = 0x58, x10 is not the anchor, x8 − x19 = 11,960,976 bytes. The memset bounds in
  2.2: end `0x13400150e00`, start `0x1340014fc00` to `0x1340014fc3f`, end − x7 = 4,608.
- `awk` over `sqlite3.c` lines 57600 to 58980 for every store to a page header's number, owner pointer or links,
  exit 0: the number and the owner pointer at `:58612`, `:58614` and `:58823` only.
- `xcrun dwarfdump --uuid` on the three native modules, exit 0: the prebuild `C87A9325-…` and `watcher.node`
  `8AE534B6-…` match the report; `pty.node` `5C456E8C-A1FA-3DC2-9CB8-BC7EFDAAB523` does not, being a local build.
  `shasum -a 256` of the prebuild: `98e0e8acd01c632fe5615243e1296af0372826f8783b18fc31c506f73c47459c`.
- `git -C wt-p358 diff --stat v0.113.0 v0.114.0 -- src/main`, exit 0: 82 files, 9,603 insertions, 368 deletions. The
  added `new Database(` and `close()` lines are all in `src/main/sessions/__tests__/p350-pi-pass.test.ts`.
- `grep -rn unsafeMode src`, exit 1: no match.
- `attack-watcher-race/tests/buckets`, exit 0: bucket arrays of 3,176 bytes, then 6,376, and 0 in the 4,089 to 4,600
  byte range.
- `python3 -I` readers of the scratch JSON (adv-foreign, attack-electron, attack-watcher-drops, attack-shm), exit 0
  each: the counts in 2.2, 2.4, 2.5 and section 4.
- The Electron count, CLAUDE.md's command with `/bin/ps` run outside the sandbox, exit 0: none of this phase's. Present
  were his own Tortie (pid 692) with its crash handler (2727), Phase 353's run (80115 and its helpers, under
  `wt-p353`), and other apps' crash handlers.

### 9.5 The scratch folders

Under `/private/var/tmp/tortie-wt/scratch/p358/`, not kept:

- **Investigators**: `crash-reader/` (disassembly, layouts, the zone probe), `lifecycle/`, `malloc/`, `assertions/`.
- **Adversaries**: `adv-shape/`, `adversary-index/`, `adversary-heap/`, `attack2/`, `adv-foreign/`, `adv-churn/`,
  `attack-shm/`, `attack-electron/`, `attack-watcher-race/`, `attack-watcher-drops/`, `adv-teardown/`, `adv-bs3/` and
  `adv-doubleclose/`. `attack-foreign-write/` is empty.
- **The judge**: `judge/callocprobe.c`, `run.mjs`, `run2.log`.
- **The writers**: `writer/ips_read.py`; the first writer's stopped draft and scripts, `*.stopped-2043*`.
- **The evidence from his Mac**: `evidence/README.md` and the report.

### 9.6 Pages read

Fetched by the writer on 5 November 2026:

| Source | What it shows |
| --- | --- |
| https://github.com/electron/electron/pull/53276 | "fix: use-after-free when event handlers re-enter chooser, protocol stream and webauthn code", merged into `43-x-y` on 28 August 2026. Its commit message: "NodeStreamLoader calls the stream's on(), removeListener() and destroy() methods, which are user JS" |
| https://github.com/electron/electron/releases/tag/v43.5.0 | Released 31 August. Lists #53276, "Fixed crashes when certain app event handlers call back into Electron synchronously", and #53278 |
| https://github.com/electron/electron/pull/53278 | Merged into `43-x-y` on 28 August 2026. `utilityProcess.fork()` "would index past the end of the vector" for a stdio array that "yields fewer elements" when re-read |
| https://github.com/parcel-bundler/watcher/issues/271 | Open since 10 October 2026: the FSEvents stream "stopped and released twice"; "BUG IN CLIENT OF LIBMALLOC: memory corruption of free block"; no linked fix |
| https://github.com/microsoft/node-pty/pull/931 | "fix: close kqueue fd in SetupExitCallback on macOS", merged 22 June 2026: "This leaks one kqueue file descriptor per `pty.spawn()` for the lifetime of the host process" |
