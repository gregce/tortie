# Research 106 — what a durable baseline costs, and when a stored one is still credible

Phase 243's MEASURE STEP. It answers with numbers and one decision. Nothing was built.

The two questions the Phase 243 entry hands this round: **does the price research 83 A3.3 recorded
still hold on this machine today**, and **what makes a stored baseline still credible when it is
offered again**. Two more it asks in passing and which turn out to have real answers: **which door
carries the write**, and **what ceiling the store gets**.

Everything below was measured read-only over the operator's own prose and his own repository. No
Electron was launched, no agent was spawned, no token was spent, nothing was written outside a
scratch directory removed in a `finally`, and nothing under `~/Library/Application Support/Tortie`
was opened for writing.

---

## 0. THE ANSWER

**A. THE PRICE REPRODUCES, AND IT IS NOT A PRICE PER BYTE — BUT IT IS THE PRICE OF HALF THE WRITE,
AND SECTION 1.4 IS THE OTHER HALF.** 9.1 ms at 8 KB against research 83's
9.0, **9.9 ms at 152 KB against its 10.0**, and **15.0 ms at 3.04 MB against its 15.1**. Two of the
three files have grown since that measurement (CLAUDE.md 126 KB → 152 KB, BACKLOG.md 2.66 MB → 3.04
MB) and the times did not move, which is the finding rather than the confirmation: **the cost is two
`F_FULLFSYNC` calls and nothing else.** Timed step by step by a hand-written copy of the sequence,
the file flush is 4.5–5.6 ms and the directory flush 3.8–5.0 ms at every size, while open, write,
`fstat`, close and rename together stay under 1 ms up to 184 KB. The payload appears exactly once,
at 3 MB, where the read-back verification adds 2.8–3.2 ms. **A baseline write costs the same whether
it is a note or the backlog.**

**AND THE ACCEPT A PERSON MAKES COSTS TWICE THAT, because it is two of them.** Every number above
is ONE `writeDurable`. `createBaselineStore(...).store()` does a record read, a body write, a
`listGenerations`, a record write and a prune — **two** `writeDurable` calls and **four**
`F_FULLFSYNC`s. Phase 243's fix round timed the shipping `store()` end to end
(`build/p243/store-cost.mts`, section 1.4): **20 to 25 ms for ordinary prose and 48 to 50 ms at
3 MB**, about 2.3x and 3.3x what this section publishes. The write is `void`-ed and off the draw
path, so nothing waits on it, but a number this phase rests on should say what it measures.

**B. A STORED BASELINE IS CREDIBLE WHEN THE FILE'S OWN COMMITTED VERSION HAS NOT MOVED — the file's,
not the repository's, and the difference is measured at 2.2x.** Over his 1,363 commits, a stored
record keyed on the HEAD COMMIT would be refused in **46.2%** of one-hour gaps and **99.8%** of
one-day gaps, so it would deliver almost nothing across the overnight case the phase exists for. The
same record keyed on the file's HEAD BLOB is refused in **21.1%** of one-hour gaps and **64.7%** of
one-day gaps activity-weighted, **0.5%** and **5.5%** unweighted. It is also strictly safer, because
a commit that did not touch the file cannot have moved anything the baseline is compared against.

**And the credibility rule is not new policy: it is `nextBaseline` replayed at load.** The stored
record must carry `headSeen`, and the loader must feed the current `git show HEAD:<rel>` answer
through the shipping `nextBaseline` as a `head` event before the baseline is offered. Two things
follow, and the first is a defect a builder will otherwise ship. **A record that does not store
`headSeen` is destroyed by the first watcher tick**: restored with `headSeen: null`, the next `head`
event carries contents that are not `null`, `nextBaseline`'s last clause fires, and the restored
baseline is re-seeded to HEAD before the person has looked at it. **With `headSeen` stored, a moved
HEAD re-seeds on exactly the same line and no narrowing across a commit can survive** — the rule
that does it is already in the tree and is already ablated by `conformance:redline`.

Four things the record needs beyond that, each for a measured reason, in §2.4.

**C. NO EXISTING DOOR CARRIES THE WRITE. The inventory moves, 226 → 228, and the baseline is
regenerated in the same commit.** `fs:writeGuarded` refuses any path outside an open project root
(`refused/outside`, `src/main/fs/guarded-write.ts:283`), so it cannot reach `<userData>`.
`fs:writeFile` can reach it — it resolves whatever the renderer sends and has no containment of any
kind — but it is `await writeFile(abs, contents, 'utf8')` (`src/main/fs/ipc.ts:238`), which is the
hand-rolled write the charter's third settled point forbids. `drop:persist` is the only channel that
already puts renderer bytes into `<userData>/gmux/`, and it uses plain `writeFile` too
(`src/main/drop/store.ts:173`) with a content hash for a name. **Two new channels, `baselines:load`
and `baselines:store`.**

**D. THE CEILING IS TWO BOUNDS AND ONE OF THEM IS NOT THE RING.** The generations ring bounds a KEY;
nothing in the mechanism bounds the NUMBER of keys, and the number of keys is where the disk goes.
Every prose file in his eleven local projects is **2,098 files and 165.8 MB** capped at
`READ_CAP_BYTES`; excluding `.specstory/history`, which is agent transcript output nobody redlines
but which is `.md` and is therefore redline-eligible today, it is **1,823 files and 27.5 MB**. The
recommendation is the shape this product already ships next door in `src/main/drop/store.ts`, being
an age bound and a directory ceiling with the oldest evicted first:

| | value | why that number |
| --- | --- | --- |
| `BASELINE_GENERATIONS` | **2**, not 3 | the ladder is never walked here (§3.2); `BACKUP_GENERATIONS`'s own floor is `Math.max(2, …)` |
| max age | **7 days** | the drop store's number; and at 7 days 77.7% of active files have had their committed version move anyway, so age only ever binds the untracked file, which has no HEAD check at all |
| directory ceiling | **32 MB** | smaller than his `snapshots/` (33.8 MB) today; it holds about **230 accepted** files or about **690 opened** ones (section 3.4, measured — this row first said 1,050 and was 4.5x out), against a real seven-day working set of **67 files, 15.9 MB at the measured cost** |
| prune cadence | **24 h**, plus after every record commit | the drop store's, unchanged |

**And one refusal the ceiling needs**: a baseline seeded from a TRUNCATED read must not be stored.
`loadContents` seeds the baseline from `result.contents` and records `result.truncated` beside it
without letting the second fact reach the first (`src/renderer/editor/tab-io.ts:171`), so opening one
of the seven files he owns that are over `READ_CAP_BYTES` — the largest is a 23.0 MB `.specstory`
transcript — stores 5 MB per key for bytes the guarded write already refuses to act on (E.7a).

**E. WHAT A RESTORED ORIGIN ADDS, IN ONE LINE.** Nothing to `BaselineOrigin` — a restored baseline
keeps the origin it was stored with and the face keeps saying the true thing — but it makes two
things the face says today false: `for as long as this tab is open`, which is the whole point of the
phase, and `at 14:02`, which has no date and a restored baseline is by definition from an earlier
day.

---

## 1. THE PRICE, RE-DERIVED

`build/p243/durable-cost.mts`, re-runnable as
`npx tsx build/p243/durable-cost.mts /Users/gdc/gmux 30`. It reads the operator's prose, writes into
a scratch directory under `$TMPDIR` and removes it in a `finally`. It is not research 83's harness:
that one (`.p222/m1-durable-cost.ts`, since deleted with the rest of `.p222/`) timed ten calls and
printed a median. This one takes 30 runs and reports p95, times a **hand-written copy of the same
syscall sequence step by step with its own stopwatch**, and prices the whole corpus and the
ten-tab set, which is what the ceiling question needs.

`/private/tmp`, `$TMPDIR` and `~/Library` are all `/dev/disk3s5`, the one APFS data volume, so the
scratch directory is the same filesystem `<userData>` is on. That is checked rather than assumed.

### 1.1 The shipping `writeDurable`, 30 runs, two independent runs of the whole harness

| file | bytes | min | **p50** | p95 | max | research 83 p50 |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/ZEN-OF-TORTIE.md` | 7,998 | 7.9 | **9.1** / 10.0 | 14.0 | 19.1 | 9.0 (7,998 B) |
| `CLAUDE.md` | 152,086 | 7.9 | **9.9** / 10.0 | 10.1 | 10.1 | 10.0 (125,874 B) |
| `docs/BACKLOG.md` | 3,040,067 | 11.9 | **15.0** / 13.0 | 17.1 | 17.8 | 15.1 (2,658,585 B) |
| `docs/research/41-…` (p50) | 27,268 | 8.0 | 10.0 | 12.4 | 15.2 | — |
| `docs/research/57-…` (p90) | 71,627 | 7.8 | 9.0 / 10.0 | 11.9 | 12.0 | — |
| `docs/research/83-…` (p99) | 183,952 | 8.0 | 9.0 / 10.0 | 12.1 | 12.9 | — |

**The three numbers the phase rests on reproduce.** The two files that grew did not get slower.

### 1.2 Where the milliseconds are, which research 83 did not ask

The hand sequence's median per step, same files, same 30 runs:

```
ZEN     8 KB    open 0.1  write 0.1  fstat 0.0  fsync 4.6  close 0.0  verify 0.1  rename 0.1  dirsync 4.8
CLAUDE  152 KB  open 0.1  write 0.0  fstat 0.0  fsync 4.7  close 0.0  verify 0.3  rename 0.1  dirsync 4.7
BACKLOG 3.0 MB  open 0.1  write 0.2  fstat 0.0  fsync 4.5  close 0.0  verify 2.8  rename 0.1  dirsync 4.8
```

The hand total lands within 0.5 ms of the shipping call at every size, which is what makes the
attribution trustworthy. **Two `F_FULLFSYNC` calls are 9 of the 10 ms and neither depends on the
payload.** The one payload-dependent step is the read-back the `'hash'` verification does, and it
is 0.1–0.5 ms until 3 MB.

Two consequences a builder should have:

1. **Both flushes run on libuv's threadpool, not on main's event loop.** The 10 ms is latency to
   the receipt, not a stall. **THIS SECTION ALSO SAID "A BASELINE WRITE COSTS NO FRAME IN ANY
   WINDOW" AND THAT IS TRUE OF THE FLUSHES AND NOT OF THE WRITE**, which section 1.4 measures: the
   JSON document, its encoding and its two sha256 passes are synchronous and are on main. At
   ordinary prose sizes they are under 1.2 ms and the claim holds; at `docs/BACKLOG.md`'s 3.04 MB
   they are 23.5 ms, which is more than a 60 Hz frame, once per baseline move.
2. **A quit-time flush of ten tabs is one `writeDurableBatch`, never ten `writeDurable` calls.**
   Measured over ten files at the corpus p90, 599 KB in all: **ten sequential calls 100.0 ms, one
   batch 32.1 ms**, a 3.1x difference, because a batch flushes each directory once. This is the
   180 ms against 370 ms measurement `write.ts`'s own header records, reproduced on this workload.

### 1.3 The corpus, and one generation of all of it

His gmux prose corpus today, `.git` and untracked excluded, by the redline's own extension
allowlist (`md markdown mdown mkd mdx txt text`, `src/renderer/editor/redline.ts:120`):

```
n=234  total=11,062,437 bytes (10.55 MB)  p50=27,268  p90=71,627  p99=183,952  max=3,040,067
```

Research 83 A3.1 read n=219 and 9.33 MB thirty days ago. Writing one generation of every one of
them took **2,400 ms, 10.3 ms a file**, and left **11,300 KB** on disk.

### 1.4 What an ACCEPT costs, end to end — Phase 243's fix round

Section 1.1 times ONE `writeDurable`. A person's accept is a `store()`, which is a record read, a
body write, a `listGenerations`, a record write and a prune: **two** `writeDurable` calls and
**four** `F_FULLFSYNC`s. `build/p243/store-cost.mts` drives the SHIPPING
`createBaselineStore(...).store()` over the operator's own prose, 30 runs a file, and holds a 1 ms
heartbeat across every call so the worst gap between two ticks is main's worst stall.

| file | bytes | `writeDurable` p50 (§1.1) | **`store()` p50** | p95 | **worst event-loop gap** |
| --- | --- | --- | --- | --- | --- |
| `docs/ZEN-OF-TORTIE.md` | 7,998 | 9.1 | **19.8 / 23.2** | 20.7 / 29.1 | 2.1 / 2.2 |
| `CLAUDE.md` | 155,264 | 9.9 | **22.0 / 22.5** | 26.9 / 26.3 | 4.1 / 2.3 |
| `docs/research/83-…` | 183,952 | 9.0 | **24.9 / 22.1** | 27.9 / 25.2 | 4.9 / 2.3 |
| `docs/BACKLOG.md` | 3,042,819 | 15.0 | **48.1 / 49.6** | 50.9 / 59.0 | 30.9 / 23.5 |

Two runs of the whole harness, both printed. **An accept is 20 to 25 ms for ordinary prose and
about 50 ms at 3 MB**, roughly 2.3x and 3.3x the published number.

**And the gap at 3 MB is accounted for exactly, by the synchronous work rather than by the
flushes.** The same helper times the three steps `store()` does on main before anything reaches the
threadpool:

```
                       bytes   stringify  encode  sha256 x2   sum    worst gap seen
ZEN-OF-TORTIE.md        7,998        0.0     0.0        0.0    0.0              2.2
CLAUDE.md             155,264        0.8     0.2        0.2    1.2              2.3
83-shadow-baseline    183,952        0.9     0.2        0.2    1.3              2.3
BACKLOG.md          3,042,819       15.5     4.0        4.0   23.5             23.5
```

`JSON.stringify` of the body is the whole of it, and it is on main because the body IS a JSON
document. **The consequence is bounded and is not a defect**: the write is `void`-ed, nothing on the
draw path waits for it, and it happens once per baseline MOVE — an open, an agent's write, an
accept — rather than per keystroke. `docs/BACKLOG.md` is precisely the file it bites, and a person
who accepts a change in it pays one frame's worth of stall in main.

---

## 2. WHEN A STORED BASELINE IS STILL CREDIBLE

### 2.1 The model, and why it is computed rather than sampled

A baseline is stored at time `s` and offered again at `s + G`. It is not credible if a qualifying
change landed inside `(s, s+G]`. Over a span `[T0, T1]` the set of start points that cross an event
at `c` is exactly `[c-G, c)`, so the probability is the measure of the union of those intervals over
the span. `build/p243/credibility.mts` computes it exactly, both ways, and prints the reflog beside
it. It runs `git log` and writes nothing.

### 2.2 The two ways, over his own history

His repository holds **1,363 commits over 30.4 days, 44.8 a day**, touching **241 prose files** with
**1,366 prose file-touches**. The busiest are `docs/BACKLOG.md` (666), `CLAUDE.md` (96),
`docs/audits/contract-baseline.txt` (76), `CHANGELOG.md` (40) and `DESIGN.md` (34).

| gap between one opening and the next | keyed on the HEAD COMMIT | keyed on the file's HEAD BLOB (activity-weighted) | unweighted mean |
| --- | --- | --- | --- |
| 1 hour | **46.2%** | **21.1%** | 0.5% |
| 4 hours | 75.9% | 40.8% | 1.5% |
| **1 day** | **99.8%** | **64.7%** | 5.5% |
| 3 days | 100.0% | 71.6% | 11.6% |
| 7 days | 100.0% | 77.7% | 21.0% |
| 30 days | 100.0% | 97.6% | 89.2% |

Read the first column as what a record carrying the HEAD commit sha would refuse. **It refuses
practically every reopen after a night's sleep**, which is the case the operator asked for, so a
phase built on it would ship a store that almost never returns anything.

Read the second as the file's own committed version moving. The weighted column is the one to plan
against, because a file that is committed often is also a file that is open often, and it is
dominated by `BACKLOG.md`, which is 666 of the 1,366 touches. The unweighted column is what an
ordinary document looks like: **a baseline on a typical prose file survives a day 94.5% of the
time.**

**Two limits of this measurement, stated rather than smoothed over.** The repository's history is
30.4 days old because it was rewritten on 2026-09-08, so "whole history" and "last 30 days" are the
same window and nothing longer can be asked of it. And his reflog holds **four entries** for the same
reason, so **the rate at which HEAD moves without a commit — a checkout, a rebase, a pull — is not
measurable here**. It does not change the ruling, because a branch switch moves the file's HEAD blob
too and is caught by the same check; it means the first column is a floor rather than an estimate.

### 2.3 What the credibility check actually is, and it is one line of existing code

**Store `headSeen` in the record. At load, offer the stored baseline and immediately replay the
current `git show HEAD:<rel>` answer through the shipping `nextBaseline` as a `head` event.**

- HEAD unchanged for this file: `event.contents === current.headSeen`, `nextBaseline` returns the
  same object, the baseline stands.
- HEAD moved: the last clause fires, `from: 'commit'`, the generation moves, the narrowing across the
  commit is gone before it was ever drawn. This is research 83 A4.2 ruling 2 and its "a HEAD version
  Tortie has not seen before wins outright, whatever its date", already shipped, already ablated.
- No HEAD version (untracked): `event.contents === ''` and the empty answer never seeds, so the
  stored baseline stands. **This is the one path with no credibility check in it at all**, and it is
  what the age bound in §3 is for.

**Without `headSeen` in the record the store is worse than not shipping it.** A restored state with
`headSeen: null` meets a non-empty `head` event, `''` !== `null`, and the restored baseline is
overwritten by HEAD on the first tick — silently, before the person has looked. The ablation writes
itself: drop `headSeen` from the record and the app-run arm that reopens after a quit must go red.

### 2.4 The four other things the record needs

1. **The key, stored inside the record as well as encoded in the name.** `(repo_path, rel_path)` is
   the shape `symbol_file` (`src/main/symbols/persist.ts:75`) and `arch_tree_file`
   (`src/main/arch/db.ts:386`) both use, and both are SQLite primary keys. Here the key has to become
   a filename, so it should be a digest — `<16 hex of sha256(repoPath)>/<16 hex of sha256(relPath)>`
   — and the record should carry the two plain strings so a name that resolves to the wrong pair is
   dropped whole with the reason, which is this codebase's standing rule for a bad row. Digest naming
   also means **no byte of a person's path ever becomes a path inside their data directory**: no
   traversal, no case collision, no length limit, and nothing to plant.
2. **The origin, the generation, `takenAt` and `acceptedAt`**, because the face draws all four and
   because Phase 227's press guard is bound to the generation. A restored baseline arriving with its
   generation is what makes a rewind drawn against the old one refuse exactly as it does now.
3. **`bytes` and `sha256`**, which `readVerified` needs and which are what a `DurableReceipt` already
   hands the caller.
4. **A refusal of remote tabs, and it is not theoretical.** `repo_path` is a path, and his Mac Pro's
   home is also `/Users/gdc` — `recents.json` holds `/Users/gdc/dev` with
   `machineId: greg-s-mac-pro` right now. Two files at the same spelling on two machines would share
   one key. The charter refuses a cross-machine baseline, `redlineWithoutHead` already refuses
   `tab.remote !== undefined`, and the store door must refuse it too rather than inherit the refusal
   from a caller.

---

## 3. THE CEILING

### 3.1 The number of keys is the axis, not the ring

The generations ring bounds one key. Nothing bounds how many keys accumulate, and a key is created
every time a prose file is opened.

| corpus | files | bytes (capped at `READ_CAP_BYTES`) |
| --- | --- | --- |
| gmux alone | 234 | 10.55 MB |
| his 11 local projects, all prose | **2,098** | **165.8 MB** |
| the same, excluding `.specstory/history` | 1,823 | 27.5 MB |
| his gmux prose touched in the last 7 days | 67 | 5.19 MB |
| his gmux prose touched in the last 30 days | 226 | 10.14 MB |

`.specstory/history` is 275 files and 138 MB of it. Those are agent transcripts, they are `.md`, and
`isRedlinePath` says yes to every one of them, so they are inside the store's reach whether or not
anybody would ever redline one. Seven of his prose files are over `READ_CAP_BYTES`; the largest is
23.0 MB.

For scale, `<userData>/gmux/` on his machine is **98.6 MB** today (`du -sk`): `symbols.db` 34.6 MB,
`snapshots/` 33.8 MB, `backups/` 11.4 MB, `arch.db` 4.3 MB, `manifest.db` 2.3 MB.

### 3.2 The ring: 2, and the reason is that the ladder is never walked

`SNAPSHOT_GENERATIONS = 3`'s own comment says what the third rung is for: *"the newest body fails
its hash, the one before it was written by the same crashing run, and the reader still has somewhere
to go."* For a snapshot the body is the only copy of a scrollback. **For a baseline the body is a
previous state of a file whose current state is on disk, so the fallback is not to older bytes, it is
to today's behaviour** — the redline against HEAD, which is what shipped before any of this and
costs nothing.

Walking the ladder is worse than not walking it. Generation `g-1` of a baseline is a baseline the
rule has already moved past, usually because the person accepted; offering it re-marks text they
accepted. It is not wrong — it is wider and it is truthfully named, since each record carries its own
origin and time — but it is not worth a third of the store either. **So: keep 2, and hand
`readVerified` ONE record, the newest, rather than the ladder.** Two is the product's own floor for a
ring already: `writeManifestBackup` clamps with `Math.max(2, options.keep ?? BACKUP_GENERATIONS)`
(`src/main/manifest/recovery.ts:602`).

With the record written after the body's directory flush and the prune run only after the record
commits, a crash cannot leave a key with nothing: a crash before the record leaves the previous
generation named and intact, and the orphan is swept by the next prune, which is exactly the ordering
`generations.ts` documents.

Ring 2 against ring 3, over the sets above, PRICED AT 1x A GENERATION: his seven-day gmux working
set is **10.4 MB against 15.6 MB**, his whole no-`.specstory` corpus **55 MB against 82.5 MB**.
**Section 3.4 is why those are the floor rather than the answer**: a generation written by an ACCEPT
holds the text AND the HEAD version it was accepted over, so the same seven-day set measures
**15.9 MB at ring 2** and the ratio between the two rings is unchanged.

### 3.3 The two bounds, copied from the store next door

`src/main/drop/store.ts` already solves this exact problem in `<userData>/gmux/dropped-images`, a
sibling of `snapshots/`: `MAX_AGE_MS = 7 days`, `MAX_DIR_BYTES = 200 MB`, `PRUNE_INTERVAL_MS = 24 h`,
oldest first. **The recommendation is that shape with two of its numbers changed.**

- **Max age 7 days.** Read against §2.2: by seven days the file's committed version has moved for
  77.7% of active files, so the age bound almost never binds a tracked file. It binds the untracked
  file, which has no HEAD check at all (§2.3), and that is the case it exists for.
- **Directory ceiling 32 MB, least recently recorded evicted first** — the order is the record's own
  `storedAt`, which this bullet first called `takenAt`. It is smaller than his `snapshots/` is
  today and it is twice what his real seven-day working set costs at the MEASURED ring-2 price
  (67 files, 15.9 MB). **It holds about 230 accepted files or about 690 opened ones, not the 1,050
  this bullet first claimed** — section 3.4 is the measurement and section 3.5 is the limit that
  follows from it. If the number is ever raised, raise it in the same commit as the measurement that
  justified it.
- **Refuse a truncated read.** `loadContents` seeds a baseline from a truncated read today
  (`tab-io.ts:171`), and `result.truncated` sits in the same patch without reaching it. Storing one
  would put 5 MB in the store for bytes the guarded write already refuses to act on (research 83
  E.7a) and for a tab Monaco holds read-only. One condition at the store door.

Steady state under all four, on his machine: **67 keys and 15.9 MB at the measured price**
(section 3.4), with the ceiling twice above it.

### 3.4 What a key really costs — Phase 243's fix round, measured through the shipping store

Everything above prices a key by multiplying a corpus mean by the ring. That is the open-only case
and it is not what a person's store holds. `BaselineBody` collapses `headSeen` into `text` only when
the two are **equal**; at an open they are (the baseline IS the committed version, so the record
stores one string), and after an **accept** they are not, so the accepted generation stores both.

`build/p243/store-cost.mts` drives the SHIPPING `createBaselineStore` over the 235 tracked prose
files of this repository, one open then one accept each, the way a person would, and reads the bytes
back off the disk rather than multiplying anything:

```
open only          235 keys  corpus 10.58 MB  on disk 10.83 MB in 470 files   47.2 KB a key  1.02x the mean file
open then accept   235 keys  corpus 10.58 MB  on disk 32.37 MB in 705 files  141.1 KB a key  3.06x the mean file
```

**3.06x, not 2x.** So the 32 MB ceiling holds **232 accepted files** or **694 opened ones**, against
the **1,050** section 0 D and section 3.3 first published — 4.5x out, because that number came from
2x a 15.1 KB mean over his whole eleven-project corpus rather than from a drive.

### 3.5 The limit that follows, stated rather than raised

**One project already fills the ceiling.** This repository's own prose, opened and accepted once
each, is 32.37 MB against a 32 MB ceiling. Past it, `sweep` drops whole keys least-recently-recorded
first, so a person working across eleven projects and 1,823 prose files loses their earliest
narrowings **silently, well inside the seven day age bound**.

**The ceiling is not raised, and this is the reason rather than an omission.** What an evicted key
loses is the NARROWING and nothing on disk (research 83 A3.4): the file's current state is on disk
and its committed state is in git, and the redline widens back to "since the last commit", which is
what shipped before any of this. 32 MB is still twice his real seven-day working set at the measured
price. A person's data directory is not grown for a case only a sweep of a whole corpus reaches, and
the number that would need raising is the one somebody should measure again the day a person
complains that a marking from last week is gone.

---

## 4. THE DOOR

`node build/contract-inventory.mjs` reads **226 invoke channels** at `ec6fe137`. None of them will
carry this write, and the evidence is in three files rather than in a search:

| candidate | reaches `<userData>`? | durable? | verdict |
| --- | --- | --- | --- |
| `fs:writeGuarded` | **no** — `resolveOpenProjectRoot` answers `refused/outside` for anything outside an open project root (`guarded-write.ts:283`) | n/a | refused by its own containment |
| `fs:writeFile` | yes — `resolvePath(path)` with no containment of any kind (`fs/ipc.ts:238`) | **no** — `await writeFile(abs, contents, 'utf8')`, no fsync, no rename, no verify | refused by the charter's third settled point |
| `drop:persist` | yes — `<userData>/gmux/dropped-images` | **no** — `writeFile(path, bytes, {mode: 0o600})` (`drop/store.ts:173`) | wrong key shape (content hash), wrong store, and it is not `writeDurable` |
| `settings:set`, `context:skillPinRecord` | yes | no | small JSON documents, not a keyed content store |

**So two new channels, `baselines:load` and `baselines:store`, and `gate:contract` goes to 228.**
The baseline at `docs/audits/contract-baseline.txt` is regenerated in the same commit with
`node build/contract-inventory.mjs --out docs/audits/contract-baseline.txt` and the commit body says
which two lines moved and why, which is what that gate is for. A `baselines:forget` is NOT needed:
nothing a person does forgets a baseline, and eviction is main's prune.

One shape note for whoever writes them. The renderer holds the text, so `baselines:store` carries up
to `READ_CAP_BYTES` across the bridge per accept. That is a structured clone of at most 5 MB, and
with the truncation refusal of §3.3 it is at most 5 MB minus one byte. The read is the same size and
happens once per tab open — **and it must not be on the draw path**, which the charter already
settles: the in-memory copy stays the read path and the restore is an event into it.

---

## 5. THE FACE, AS IT STANDS TODAY

`src/renderer/editor/baseline.ts` is the whole set. Quoted so the builder adds to a known set:

`baselineName` answers one of four:

```
the last commit
you opened this file
you accepted
you accepted at 14:02
```

`baselineSentence` composes one of these, plus one clause when the tab is dirty:

```
Marked since the last commit, for as long as this tab is open.
Marked since you opened this file, for as long as this tab is open.
Marked since you accepted at 14:02, for as long as this tab is open.
Nothing has changed since the last commit.
Nothing has changed since you opened this file at 14:02.
Nothing has changed since you accepted at 14:02.
… Not refreshed from disk while there are unsaved edits.
```

`baselineDetail`, which is hover and disclosure only, adds six more, each ending
`The marking lasts for as long as this tab is open.`

### 5.1 What a restored origin adds — one short line

**It adds no fourth `BaselineOrigin`.** A restored baseline keeps the origin it was stored with, and
the face keeps saying the true thing, which is research 83 A4.2 ruling 1: the view names the
BASELINE, not where the bytes were kept. What it does add is that **two things the face says today
become false and must change in the same phase**:

- `for as long as this tab is open` — the sentence the phase exists to falsify. It appears in
  `baselineSentence` once and in `baselineDetail` six times.
- `at 14:02` — `clockTime` is `HH:MM` with no date (its comment says why: one clock, pinnable, no
  locale). A restored baseline is by definition from an earlier session, so the shortest honest form
  needs a day on it when `takenAt` is not today.

The suggested replacement lifetime clause is the credibility rule said once, in the same register as
the sentences above and no longer than them: **`until this file's last commit moves`**. It is
accurate for the tracked case, it is the thing that will actually end the marking, and it says
nothing about bytes being kept anywhere — which is A3.4's ruling and the one place in this feature
where a copy decision is a correctness decision.

**It must not read as a backup.** Nothing in the store's surface may say "saved", "kept", "restored"
or "recovered" about the person's text. The baseline is a previous state of a file whose current
state is on disk and whose committed state is in git.

---

## 6. WHAT WAS NOT MEASURED

- **The write inside Electron.** Everything in §1 ran under plain node on the same volume. Research
  34's own numbers were taken inside Electron 43 and agree with these within the noise, but this
  round launched none.
- **The rate at which HEAD moves without a commit.** His reflog holds four entries after the
  2026-09-08 history rewrite (§2.2).
- **How often a person actually reopens a prose file, and after how long.** Nothing in the manifest
  records a file open. Every number in §2.2 is a probability per gap length, not a rate of loss, and
  the gap distribution is the operator's to name.
- **The mid-write kill.** That is the phase's own attack and it belongs to the build round.
- **Anything on another machine.** No ssh was started.

## 7. HOW TO RE-RUN

```
npx tsx build/p243/durable-cost.mts  /Users/gdc/gmux 30
npx tsx build/p243/credibility.mts   /Users/gdc/gmux
```

Both are read-only over the repository, both write nothing outside a scratch directory removed in a
`finally`, and neither launches an Electron, starts a tmux server, spawns an agent or opens a
keychain.
