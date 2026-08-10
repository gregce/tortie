# Phase 14 · Dimension 2 — fuzzy file-path search (the ⌘P quick open)

Research date: **2026-08-10**. Every version, licence and publish date below was
checked live against the npm registry and GitHub on that date — nothing here is
from memory. Every latency and memory number was measured on this machine
against real repositories; the harness is reproducible (see §8).

Bench host: Apple M4 Pro, 48 GB, macOS 15.7.9, Node v22.23.1 / V8 12.4.
gmux ships Electron 43.3.0, which carries Node 24.18.1 and a newer V8 — treat
every timing here as a conservative floor.

**Companion**: dimension 1 (`19-search-d1-content-engine.md`) covers the ⌘⇧F
content engine and independently lands on `@vscode/ripgrep@1.18.0`. The two
documents agree; §5.1 and §7.1 below note the three places they interact.

---

## 0. The recommendation in one paragraph

Enumerate with **`rg --files` from `@vscode/ripgrep`** (fastest measured, and the
only option that gets `.gitignore` right for free). Rank with a **two-stage
gate-and-rerank**: **`fuzzysort@4` over a `snapshot()` of the full path list**
narrows 50k–270k paths to the best 512 in 0.1–10 ms, then **`fzf@0.5.2`
(fzf-for-js) with the `byLengthAsc` tiebreaker** re-ranks just those 512. That
composition scores **MRR 0.918 / 23-of-26 top-1** on a labelled path-query set —
statistically identical to running fzf over the whole list (0.919 / 23-of-26) —
while being **10–20× faster** (0.9–13.6 ms p95 vs 19–137 ms on a 95k-file repo).
Run the whole thing in a `worker_threads` Worker owned by the main process, keep
the index fresh by re-running `rg --files` on the **existing** `RepoWatcher`'s
debounced `onChange` (no second FSEvents subscription), and show at most 50 rows.

This is the same architecture VS Code uses — cheap gate, then expensive
path-aware scorer over ≤512 survivors — with a strictly better gate (see §3.4).

**One licence caveat**: fzf-for-js is **BSD-3-Clause**, not MIT/Apache. The
backlog says MIT/Apache. BSD-3-Clause is permissive and distribution-compatible,
but it is a third term. If that is unacceptable, §3.6 gives the all-MIT fallback
(a 275-line vendored port of VS Code's own scorer) which scores MRR 0.876 and is
actually *better* on "never lose the file" (26-of-26 in the top 5).

---

## 1. The candidate field, verified

All rows verified 2026-08-10 against `registry.npmjs.org` and the GitHub API.

| package | version | published | licence | weekly dl | repo state |
|---|---|---|---|---|---|
| **fuzzysort** | **4.0.1** | **2026-08-10** | MIT | 8.57 M | 4,319★, pushed 2026-08-10, 0 deps |
| **fzf** (fzf-for-js) | 0.5.2 | 2023-04-25 | **BSD-3-Clause** | 2.82 M | 954★, last *functional* commit 2023-04-25; 2024–25 commits are dependabot only |
| @leeoniya/ufuzzy | 1.0.19 | 2025-08-22 | MIT | 358 k | 3,016★, pushed 2025-10-31, 0 deps |
| fast-fuzzy | 1.12.0 | 2022-11-05 | ISC | 1.42 M | 388★, pushed 2023-01-06 |
| command-score | 0.1.2 | 2016-06-10 | MIT | 212 k | 139★, **archived** 2023-01-25 |
| @nozbe/microfuzz | 1.0.0 | 2023-07-18 | MIT | 431 k | single release |
| fuzzaldrin-plus | 0.6.0 | 2017-11-20 | MIT | 92.7 k | Atom-era, dead |
| fzy.js | 0.4.1 | 2020-04-07 | MIT | 13.2 k | dead |
| vscode-fuzzy-scorer | 0.0.4 | 2020-05-27 | MIT | — | stale 2020 rip of VS Code's scorer; do not use |
| match-sorter | 8.3.0 | 2026-04-15 | MIT | 3.47 M | alive, but pulls `@babel/runtime`; not a path scorer |
| fuse.js | 7.5.0 | 2026-07-13 | Apache-2.0 | 12.4 M | Bitap/token search — wrong tool for paths |
| **microsoft/vscode `fuzzyScorer.ts`** | main | — | **MIT** | — | 928 lines + a ~13-file import closure; extractable to **275 lines** (see §3.6) |
| **@ff-labs/fff-node** | **0.10.3** | **2026-08-07** | MIT | 46 k | 9,934★, pushed 2026-08-10, Rust core over FFI |
| @vscode/ripgrep | 1.18.0 | 2026-05-07 | MIT | 651 k | ships rg 15.0.0; per-platform optional deps, **no postinstall download** |

Things that do **not** exist, checked so nobody re-checks them: there is no npm
binding for `nucleo` (Helix's matcher) and none for `frizbee` — the Rust
SIMD matchers only reach JS through `fff` (§4). `flashfuzzy` (Rust/WASM,
2026-06-16) is a 3-release, 3.5k-download project with no path-search story;
not worth the risk.

### 1.1 What changed in fuzzysort v4 (shipped yesterday)

`4.0.0` landed 2026-08-09 and `4.0.1` on 2026-08-10, per the repo's own
changelog:

- ESM instead of UMD
- **`fuzzysort.snapshot()`** — an immutable pre-prepared target set, "for the
  best search performance". This is the single most important addition for
  quick open and it is why v4 beats everything else in §3.
- **`fuzzysort.score()` and `fuzzysort.highlight()` for Web Worker support** —
  results survive a structured clone, so a worker can post raw results and the
  renderer can compute highlights. Directly enables the §5 architecture.
- `remap()` for custom normalisation; automatic lookalike-character remapping
- default `threshold` (0.5) and `limit` (10); `options.all` removed

**Risk**: v4 is two days old. v3.1.0 (2024-10-14) has no `snapshot()`, and
without it warm queries at 272k paths cost **52 ms instead of 10 ms** and heap
climbs to 430 MB instead of 280 MB. Recommend pinning `4.0.1` exactly and
re-testing on upgrade; the fallback if v4 proves unstable is §3.6 (all-MIT, no
fuzzysort at all).

---

## 2. Corpora

Ranking quality is meaningless on synthetic paths, so every measurement uses a
real file list.

| corpus | paths | avg length | source |
|---|---|---|---|
| `vscode` | 17,645 | 68 ch | `microsoft/vscode` git tree @ main |
| `k50` | 50,000 | 42 ch | first 50k of `linux-full` — the backlog's stated target size |
| `dt` | 63,143 | 37 ch | `DefinitelyTyped` git tree |
| `linux-full` | 94,848 | 39 ch | `torvalds/linux` git tree (assembled from 21 subtree fetches; the single recursive call truncates at `drivers/zorro`) |
| `stoa-271k` | 271,791 | 62 ch | `/Users/gdc/stoa`, `rg --files` honouring `.gitignore` — a real local worst case, 268k of them `.specstory` history |

Local repos measured for enumeration: `/Users/gdc/gmux` (310 files),
`/Users/gdc/olcp` (11,885), `/Users/gdc/stoa` (271,791). `getspecstory` and
`specstory-sync` are only 653 and 1,251 files once `.gitignore` is honoured, so
they are too small to stress anything.

For the fff comparison (§4) the `vscode` and `linux-full` trees were
materialised as empty files in the scratchpad so a native indexer could see
exactly the same path set as the JS scorers.

---

## 3. Scorer comparison

### 3.1 Ranking quality

26 labelled cases across five families, each one "a developer typed this,
meaning that file". Metric is the rank of the intended file; MRR is the mean
reciprocal rank over all 26.

| scorer | top-1 | top-5 | never found | MRR |
|---|---|---|---|---|
| **fzf + `byLengthAsc`** (whole list) | **23** | 25 | 0 | **0.919** |
| **gate 512 → fzf + `byLengthAsc`** | **23** | 25 | 0 | **0.918** |
| gate 512 → fzf, then VS Code tier tiebreak | 22 | 25 | 0 | 0.899 |
| **gate 512 → VS Code scorer** | 21 | **26** | 0 | 0.876 |
| command-score | 21 | 24 | 0 | 0.857 |
| fuzzysort alone (full path) | 21 | 24 | 0 | 0.855 |
| VS Code scorer alone (whole list) | 20 | 25 | 0 | 0.849 |
| gate 512 → fzf on basename-or-path | 21 | 23 | 3 | 0.837 |
| fuzzysort with `keys: [basename, path]` | 20 | 22 | 2 | 0.790 |
| fzf, no tiebreaker | 14 | 21 | 2 | 0.651 |
| uFuzzy | 15 | 18 | **8** | 0.619 |

Findings that matter more than the ordering:

- **fzf without a tiebreaker is bad at paths.** Plain `fzf` scored `Makefile`
  and `Kconfig` *outside its own top 200* on the kernel tree, because nothing in
  its scoring prefers the shallow, short candidate. Adding `byLengthAsc` — one
  line — takes it from 14 to 23 top-1 hits. fzf-for-js is frozen at fzf's
  pre-0.31 default scheme and has **no `--scheme=path`** option (verified: the
  `BaseOptions` interface has `limit`, `selector`, `casing`, `normalize`,
  `fuzzy`, `sort`, `tiebreakers`, and nothing else). `byLengthAsc` is the
  substitute and it works.

- **uFuzzy cannot do quick open.** It missed 8 of 26 — every camelCase-acronym
  query (`fzsc`, `anyqa`, `termserv`, `mdrend`, `e1000main`, `reacttsconfig`).
  It is a term-and-regex matcher, so arbitrary intra-word gaps are outside its
  model. Re-tuning to `{intraMode: 0, intraIns: Infinity, interIns: Infinity}`
  did not fix it (still 0 hits for `e1000main`). Excellent library, wrong job.
  It stays interesting only as a zero-memory prefilter (§3.5).

- **command-score is competitive on quality and hopeless on scale.** MRR 0.857,
  but its cost grows with query length: 451 ms for a 14-character query over
  17k paths. Archived since 2023. Not viable.

- **fuzzysort's `keys` mode is a trap.** Searching `[basename, path]` via
  `keys` *lost* `package.json` (rank 144) and `Makefile` (not found) because the
  combined-key score does not respect "shortest wins". Give it the plain path
  string.

- **The gate is lossless for ranking.** `gate 512 → fzf` matched whole-list fzf
  to three decimals. A stricter audit (top-10 set overlap against whole-list fzf
  over 26 broad queries) shows 93.2 % at 95k and 97.9 % at 272k — and inspection
  of the disagreements shows they are **pure tie-group shuffling**: e.g. for
  `readme` both return the same six files, all with fzf score 152, in a
  different order among equals. No real result is lost.

### 3.2 Latency

Median-of-runs per keystroke, whole-list scoring, top-50 returned.

**17,645 paths (`vscode`)**

| query | fuzzysort | fuzzysort + snapshot | fzf | uFuzzy | fast-fuzzy | command-score | VS Code scorer |
|---|---|---|---|---|---|---|---|
| `e` | 1.5 | 1.9 | 17.8 | 4.1 | 19.5 | 6.7 | 18.5 |
| `edit` | 3.1 | 1.7 | 59.5 | 3.0 | 15.5 | 63.2 | 57.7 |
| `editor` | 2.1 | **0.7** | 39.2 | 2.6 | 17.9 | 82.5 | 84.6 |
| `src/main/index` | 0.6 | **0.0** | 7.1 | 1.4 | 19.2 | 158.2 | 145.7 |
| `net/core/dev.c` | 1.0 | **0.0** | 7.2 | 0.7 | 21.1 | 451.0 | 150.4 |

**94,848 paths (`linux-full`)** — p95, gate-and-rerank vs the alternatives

| query | gate512→fzf | gate512→VS Code | fzf whole list | fuzzysort alone |
|---|---|---|---|---|
| `e` | 6.3 | 3.1 | 134.6 | 2.6 |
| `ed` | 8.6 | 8.0 | 137.4 | 5.9 |
| `edi` | **13.6** | 10.1 | 136.8 | 8.1 |
| `edit` | 7.0 | 6.6 | 107.1 | 4.1 |
| `sched` | 3.3 | 2.2 | 43.3 | 1.3 |
| `net/core/dev.c` | 0.9 | 1.0 | 19.6 | 0.1 |

**271,791 paths (`stoa-271k`)**

| query | fuzzysort + snapshot | fzf | uFuzzy | VS Code scorer alone |
|---|---|---|---|---|
| `e` | 6.4 | 846.6 | 15.3 | 648.3 |
| `ed` | 26.5 | 2465.7 | 18.9 | 1249.4 |
| `edit` | 0.4 | 173.5 | 10.0 | 1393.8 |
| `src/main` | 0.0 | 124.1 | 5.2 | 1738.3 |

The shape of the whole problem is in these tables: **VS Code's scorer is far too
expensive to run over a whole file list** (648 ms–8.3 s at 272k), and **fzf is
too expensive above ~20k**. Both are excellent *rerankers*. fuzzysort with a
snapshot is the only thing fast enough to be the gate.

### 3.3 Memory

Isolated processes, `--expose-gc`, measured after a forced GC.

| corpus | paths | path strings | basename+dirname+Map | fuzzysort index | **total heap** | rss | prewarm |
|---|---|---|---|---|---|---|---|
| vscode | 17,645 | 3.0 MB | 2.2 MB | 19.2 MB | **28.2 MB** | 103 MB | 28 ms |
| **k50** | **50,000** | 4.0 MB | 1.8 MB | **35.4 MB** | **45.0 MB** | 131 MB | **50 ms** |
| dt | 63,143 | 4.8 MB | 1.8 MB | 40.5 MB | 50.8 MB | 141 MB | 60 ms |
| linux-full | 94,848 | 7.4 MB | 3.5 MB | 64.3 MB | 79.0 MB | 181 MB | 87 ms |
| stoa-271k | 271,791 | 27.6 MB | 14.0 MB | 234.4 MB | 279.8 MB | 433 MB | 297 ms |

**fuzzysort's index costs ~0.7 KB per path.** At the backlog's 50k target that
is 35 MB — completely fine. At 272k it is 234 MB, which is not.

Four operational facts about that index, each measured:

1. **The cost is lazy and lands on the first query, not on `snapshot()`.**
   `snapshot()` itself returns in 0.2 ms; the first `go()` at 272k took **322 ms**.
   Prewarm with a throwaway query immediately after enumeration or the user's
   first keystroke eats a third of a second.
2. **Indexing basenames instead of paths halves it** (272k: 234 MB → 100 MB,
   prewarm 297 ms → 73 ms) but then `src/main` returns zero results. Not a
   usable trade on its own.
3. **Memory is released when you drop the reference.** Indexing a second project
   then dropping the first went 43.1 MB → 65.2 MB → 26.0 MB. Do *not* call
   `fuzzysort.cleanup()` while a project is live: it clears the shared prepared
   cache and the next query pays 12 ms instead of 4 ms.
4. **Rebuilding a snapshot does not leak but is not cheap either.** Six
   successive rebuilds over the same 50k strings held flat at 43.2 MB — the
   prepared-target cache is keyed by string and reused — but each rebuild still
   costs a full prewarm (56 ms at 50k, 339 ms at 272k). This drives the
   freshness design in §6.

### 3.4 Why this is VS Code's architecture, only with a better gate

Read from `microsoft/vscode` @ main on 2026-08-10:

- `src/vs/workbench/contrib/search/browser/anythingQuickAccess.ts:107` —
  `private static readonly MAX_RESULTS = 512;`
- `src/vs/workbench/services/search/node/fileSearch.ts` walks with ripgrep and
  gates every candidate through `isFilePatternMatch(...)`, stopping once
  `resultCount > maxResults`.
- `src/vs/workbench/services/search/common/search.ts:643` —
  `isFilePatternMatch` is `fuzzyContains(pathToMatch, filePatternToUse)`, a
  plain **ordered-subsequence containment test**.
- Only those ≤512 survivors reach `scoreItemFuzzy` / `compareItemsByFuzzyScore`
  in `fuzzyScorer.ts`.

So VS Code already does gate → 512 → expensive scorer. The weakness is that its
gate keeps **the first 512 in directory-walk order** — unranked. On a big repo a
two-character query hands the scorer 512 essentially arbitrary files and sets
`limitHit`. Our gate hands over **the top 512 by fuzzysort score**. Same budget,
strictly better recall. That is the one place this design beats the exemplar.

For reference, VS Code's own char scoring (which the §3.6 fallback reproduces
exactly): +1 per char, +6 per consecutive char up to a run of 3 then +3, +1 same
case, **+8 start of string**, **+5 after `/`**, **+4 after `_ - . space ' " :`**,
**+2 for an interior uppercase (camelCase) when not already in a run**. Filename
matches get a `1<<16` base; filename *prefix* matches get `1<<17` plus a
`round(query.length / label.length * 100)` boost — that last term is what makes
`window.ts` beat `windowActions.ts`.

### 3.5 The zero-memory alternative, for the record

If 35 MB per project is ever unacceptable, a hand-rolled packed-buffer gate
works: lowercase every path into one contiguous `Uint8Array` with an
`Int32Array` of offsets, then scan for ordered subsequence. Measured at 272k
paths: **17.2 MB total, built in 50 ms**, full scan in 2.4–11.7 ms. That is
1/14th of fuzzysort's memory at comparable speed. The catch is that it produces
a boolean, not a ranking, so for a two-character query it hands 270k survivors
to the reranker and the pipeline takes 595 ms. Making it competitive means
writing an inline cheap score plus a top-K heap — i.e. reimplementing fuzzysort.
Not worth it at 50k. Worth revisiting only if gmux must support 250k+ projects.

### 3.6 The all-MIT fallback

If BSD-3-Clause is a hard no, drop fzf and rerank with VS Code's own scorer.
`fuzzyScorer.ts` is MIT but its import closure is real — `filters.ts`,
`comparers.ts`, `strings.ts`, `path.ts`, `platform.ts`, `hash.ts`, `charCode.ts`
and transitively `map.ts`, `cache.ts`, `lazy.ts`, `uint.ts`, `date.ts`,
`buffer.ts`, `naturalLanguage/korean.ts`, `normalization.ts` — roughly 9,000
lines. Vendoring all of that violates the growth guardrails.

The extraction is small, though. A faithful POSIX-only port of `scoreFuzzy`,
`doScoreItemFuzzySingle`, `prepareQuery` and `compareItemsByFuzzyScore` with
`sep='/'`, `isWindows=isLinux=false` and three inlined string helpers is
**275 lines, 3.3 KB gzipped**, zero dependencies. It was written and benchmarked
for this report and lives at
`/private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad/bench/vsc-scorer.mjs`.

Quality: MRR 0.876, top-1 21/26, and the only configuration measured that put
**all 26 intended files in the top 5**. Latency at 95k: 1.0–10.1 ms p95 — a
touch *faster* than the fzf rerank. The trade is 2 fewer top-1 hits in exchange
for MIT-only licensing, no third-party ranking dependency, and never making the
user scroll.

The extraction is preserved at
**`docs/research/assets/phase14/vscode-fuzzy-scorer-extract.mjs`** — copy it into
`src/` and add types when Phase 14 builds, rather than re-deriving it.

Honestly: this is the more conservative choice and it is defensible. Pick fzf if
you want the best first-guess; pick this if you want the best guarantee.

---

## 4. `fff` — the 2026 wildcard, and why it does not ship

`dmtrKovalenko/fff` (9,934★, MIT, Rust, pushed 2026-08-10, created 2025-07-31)
is the most interesting thing in this space and it deserves a straight answer
rather than a mention. It is a resident file-search *library*: SIMD fuzzy path
matching derived from `frizbee`, content grep, frecency, git status, and a
background watcher, exposed to Node as `@ff-labs/fff-node@0.10.3` over a
`libfff_c.dylib` loaded via `ffi-rs`. It powers file search in opencode and
nushell. On paper it covers all three Phase 14 dimensions at once.

It was installed and benchmarked, not just read about.

**What is genuinely excellent:**

| metric | fff @ 17.6k (vscode tree) | fff @ 94.8k (linux tree) |
|---|---|---|
| create + full scan | 205 ms (11.9k local repo) | **156 ms** |
| query p95 | 2.4–6.0 ms | 3.1–7.9 ms |
| V8 heap | ~5 MB (index is native) | ~5 MB |
| rss after scan | 64 MB | 94 MB |
| rss after 30 queries | 130 MB | 263 MB |

Scanning 95k files in 156 ms is roughly twice as fast as `rg --files` + snapshot
+ prewarm (220 + 91 ms), and it keeps the JS heap empty. Ranking on the
identical 16-case vscode subset: top-1 12, top-5 15, **MRR 0.825** — comparable
to fuzzysort (0.820) and behind the recommended pipeline (0.880). It won
`mdrend` outright, which nothing else got to rank 1.

**Three blockers, in order of severity:**

1. **It does not index hidden paths.** The vscode tree has 563 dot-prefixed
   paths; fff indexed 17,081 of 17,645. `glob('.vscode/**')` returns `[]`;
   `fileSearch('launch.json')` never surfaces `.vscode/launch.json`. `InitOptions`
   in 0.10.3 has no `hidden`/`includeHidden` flag (full surface: `basePath`,
   `frecencyDbPath`, `historyDbPath`, `disableMmapCache`,
   `disableContentIndexing`, `disableWatch`, `aiMode`, `logFilePath`, `logLevel`,
   `cacheBudgetMax*`, `enableFsRootScanning`, `enableHomeDirScanning`,
   `followSymlinks`). For an *agentic coding shell*, `.claude/`, `.specstory/`,
   `.github/workflows/` and `.vscode/` being invisible in ⌘P is disqualifying.

2. **Typo-resistance has no floor, so "no match" never happens.** On a repo with
   no file resembling "editor", `fileSearch('editor')` reported
   `matched=11824` — nearly the whole repo — with `bench/.DS_Store` at rank 1
   (`total=54`, `matchType=fuzzy_filename`). At 95k, `editor` matched 55,102 and
   ranked `Documentation/filesystems/ext4/directory.rst` first, and `schedcore`
   put `tools/.../sch_red_core.sh` above `kernel/sched/core.c`. Scores are
   returned per item, so the app could threshold client-side, but that means
   inventing the cutoff fff deliberately omits.

3. **Native FFI inside a signed, notarised Electron app.** It is a plain
   `.dylib` (4.3 MB arm64, 9.2 MB package) loaded through `ffi-rs`, itself a
   native N-API addon. That means another `electron-rebuild` target beyond
   `node-pty` and `better-sqlite3`, a non-`.node` binary that electron-builder
   will not sign by default, hardened-runtime entitlements, and a
   `main`-process-only constraint. gmux has exactly two native deps today; this
   would be a third with the worst packaging story of the three.

**Verdict**: do not ship it in Phase 14. Blocker 1 alone settles it. Revisit
when hidden-path indexing lands — the performance is real, the licence is MIT,
the author ships daily, and if it ever gets a relevance floor and a `hidden`
flag it could replace both dimension 2 and dimension 3 with one dependency.
Worth opening an upstream issue for the hidden-path flag now, since the answer
changes the calculus.

---

## 5. Getting the file list

Median of 3 runs, warm FS cache, streaming into a JS array. TTFB is time to the
first path arriving on stdout — the number that decides whether you can render
progressively.

**`/Users/gdc/olcp` — 11,885 tracked files**

| method | total | TTFB | files returned |
|---|---|---|---|
| **`rg --files` (bundled)** | **16 ms** | **4 ms** | 11,885 |
| `rg --files -j 8` | 14 ms | 4 ms | 11,885 |
| `fd -t f --hidden -E .git` | 16 ms | 6 ms | 11,885 |
| `git ls-files -co --exclude-standard` | 28 ms | 26 ms | 11,885 |
| `fast-glob **/*` | 163 ms | — | **120,506** ❌ |
| `tinyglobby **/*` | 125 ms | — | **120,506** ❌ |
| `fs.readdir` recursive | 261 ms | — | **120,518** ❌ |

**`/Users/gdc/stoa` — 271,791 tracked files**

| method | total | TTFB | files returned |
|---|---|---|---|
| **`rg --files` (bundled)** | **157 ms** | **4 ms** | 271,791 |
| `rg --files -j 8` | 146 ms | 4 ms | 271,791 |
| `fd -t f --hidden -E .git` | 160 ms | 8 ms | 271,791 |
| `git ls-files -co --exclude-standard` | 343 ms | 299 ms | 271,800 |
| `fast-glob **/*` | 339 ms | — | 303,447 ❌ |
| `tinyglobby **/*` | 199 ms | — | 303,447 ❌ |
| `fs.readdir` recursive | 417 ms | — | 303,452 ❌ |

**`rg --files` wins on every axis simultaneously**, which almost never happens:
fastest wall-clock, 4 ms TTFB regardless of repo size (so you can stream), and
it is the only one that honours nested `.gitignore` files. The glob libraries
returned 10× too many files on `olcp` because they enumerated `node_modules`;
matching ripgrep's ignore semantics in JS means composing every nested
`.gitignore` yourself, and the `ignore@7.0.6` package (MIT, 302 M weekly)
handles one file's rules, not the hierarchy. Reimplementing that is a bug farm.

`git ls-files` is 2× slower, blocks for 299 ms before emitting anything, and
requires a git repo. Not worth it.

### 5.1 Shipping ripgrep

Use **`@vscode/ripgrep@1.18.0`** (MIT). It changed materially in 2026 and the
new shape is exactly what an Electron app wants:

- `type: "module"`, `lib/index.js` exports `rgPath`
- **no postinstall download script** — the binary comes from a per-platform
  optional dependency (`@ff-labs`-style), so offline and CI installs are
  deterministic
- `@vscode/ripgrep-darwin-arm64` is 4.3 MB and contains `bin/rg`, ripgrep
  **15.0.0** with PCRE2 10.45 and JIT

Do not depend on a system `rg`. Note for packaging: `electron-builder` must be
told to unpack it (`asarUnpack`) and macOS notarisation needs the binary signed.
It is the same binary VS Code ships, so the path is well-trodden.

**Same dependency as dimension 1** — D1 reaches the identical conclusion from the
content-search side, including the warning against `@vscode/ripgrep-universal`
(58 MB of all-platform binaries vs the 4.3 MB we need) and the verification that
its ESM-only shape is fine under Electron 43's Node 24. Add the dependency once;
`rgPath` serves both features.

Ignore rules on top of `.gitignore`: pass explicit globs to keep the list honest
without inventing a config surface —
`--files --hidden --glob '!.git' --glob '!node_modules' --glob '!.DS_Store'`.
`--hidden` is required or dotted paths vanish (the exact failure mode that rules
out fff, §4) — and D1's finding that **`--hidden` makes ripgrep walk `.git/`**
is precisely why `--glob '!.git'` is not optional here; every timing in §5 was
measured with it. Add `--no-messages` so permission errors do not pollute
stderr, and leave `--follow` off (the default) to avoid symlink cycles.

### 5.2 First-open cost, end to end

Measured as a single script: spawn rg, stream, snapshot, then six keystrokes.

**`/Users/gdc/olcp` (11,885 paths)**

```
     5.0ms  (+5ms)    rg first bytes
    17.2ms  (+22ms)   rg done
     0.1ms  (+22ms)   fuzzysort.snapshot()
    26.2ms  (+48ms)   keystroke "e"        <- lazy prepare lands here
    10.2ms  (+59ms)   keystroke "ed"
     7.3ms  (+66ms)   keystroke "edi"
     4.4ms  (+70ms)   keystroke "edit"
     3.5ms  (+74ms)   keystroke "edito"
     0.3ms  (+74ms)   keystroke "editor"
heapUsed 21.9MB
```

**`/Users/gdc/stoa` (271,791 paths)**

```
     4.7ms  (+5ms)    rg first bytes
   158.8ms  (+163ms)  rg done
     0.3ms  (+164ms)  fuzzysort.snapshot()
   384.3ms  (+548ms)  keystroke "e"        <- unacceptable; must be prewarmed
    39.6ms  (+588ms)  keystroke "ed"
     5.8ms  (+593ms)  keystroke "edi"
     ...
heapUsed 404.8MB
```

The lesson is blunt: **prewarm off the critical path.** Enumerate and prewarm
when the project opens (or on first idle after open), not when the user presses
⌘P. Do that and the 50k case is 13 ms of index build plus 50 ms of prewarm, both
invisible.

---

## 6. Keeping it fresh while agents create and delete files

### 6.1 What the watcher can actually tell us

Measured against `@parcel/watcher@2.6.0` — the version gmux already ships and
already runs per repo via `src/main/watcher/repo-watcher.ts`:

- create → event delivered in **14–78 ms** (p50 68 ms). That is FSEvents'
  inherent coalescing latency, not overhead we added.
- a burst of **500 simultaneous creates delivered all 500 events** within a
  1.66 s window. Nothing is dropped.

### 6.2 The trap: `@parcel/watcher` knows nothing about `.gitignore`

Its `Options` are `{ ignore?: (FilePath | GlobPattern | RegExp)[], backend? }`
and that is all. A watcher-reported `create` might be `target/debug/build/...`
inside a `.gitignore`d tree. Trusting watcher paths directly means
reimplementing hierarchical gitignore matching — the same bug farm as §5.

Do not. Use the watcher as an **invalidation signal** and let ripgrep stay the
source of truth.

### 6.3 Measured cost of a full re-enumerate

Re-run `rg --files`, diff against the previous `Set`, rebuild the snapshot only
if the diff is non-empty:

| repo | paths | rg | diff | rebuild (if changed) | total unchanged / changed |
|---|---|---|---|---|---|
| olcp | 11,885 | 14 ms | 3 ms | ~15 ms | **17 ms** / ~32 ms |
| k50 | 50,000 | ~40 ms | ~12 ms | ~50 ms | ~52 ms / **~100 ms** |
| linux-full | 94,848 | 73 ms | 22 ms | 91 ms | **95 ms** / ~186 ms |
| stoa | 271,791 | 141 ms | 83 ms | 316 ms | 224 ms / ~540 ms |

At the 50k target a full refresh is ~100 ms of background worker CPU. Coalesced
to at most once every 2 s during sustained agent churn, that is ~5 % of one
core. Acceptable. At 272k it is not, which is another reason to cap (§7.4).

### 6.4 The optimistic delta

A full refresh is 100 ms behind reality, plus up to 78 ms of FSEvents latency.
For a file an agent just wrote, that is a visible lag. Cover it with a small
side index:

- keep a `delta: string[]` of paths seen by the watcher since the last authoritative refresh
- give it its own `fuzzysort.snapshot()` and search both, merging by score
- **measured overhead of a 1,000-entry delta snapshot: 0.08–0.48 ms per query** —
  1–4 % of the base query at 50k, ≤1 % at 272k. Free.
- `delete` events remove from the base list immediately (no gitignore question
  to answer — a path that no longer exists cannot be opened)
- mark delta entries provisional in the model; the next authoritative refresh
  either confirms them or silently drops the ones ripgrep would have ignored

### 6.5 Reuse the watcher gmux already has

`src/main/git/ipc.ts:43` keeps `const watchers = new Map<string, Promise<RepoWatcher | null>>()`,
one `RepoWatcher` per repo, started lazily on the first `git:*` call and torn
down at quit. `RepoWatcher` already runs the VS Code recipe — a worktree
subscription with `.git` excluded plus a filtered dotgit subscription — and
coalesces everything into a single `onChange(repoPath)` on a **300 ms
non-resetting debounce**.

**Do not start a second FSEvents subscription for quick open.** Double-watching
a 95k-file tree is exactly the battery burn the backlog forbids. Add a second
consumer to the existing per-repo watcher.

One consequence to design around: `onChange` deliberately drops the event paths.
Two options, in preference order:

1. **Path-free**: subscribe to `onChange(repoPath)`, coalesce further to at most
   one refresh per 2 s, run the §6.3 refresh in the worker. Simple, correct,
   zero new watcher surface, no gitignore logic. Costs up to 2.4 s of staleness.
2. **Path-aware**: extend `RepoWatcher` with an *optional* second callback that
   forwards raw create/delete paths, feeding §6.4's delta for sub-100 ms
   visibility. `src/shared/*` is append-only during parallel builds, and this is
   a main-process module rather than shared, but it is still a change to a file
   another workflow may hold. Land it as an additive optional option, never a
   signature change.

Ship (1) first. Add (2) only if the 2 s lag is felt in practice — with agents
writing files constantly in gmux, it probably will be.

---

## 7. The interaction contract

### 7.1 Where the code lives

```
main process
 └── QuickOpenService
      ├── owns one Worker; adds/removes project roots
      ├── forwards the existing RepoWatcher's onChange(repoPath)
      ├── feeds frecency from the open-file bus, persists it to the manifest
      └── typed IPC: quickopen:query / quickopen:state
           │
           └── worker_threads Worker  (one per window, not per project)
                ├── spawn(rgPath, ['--files','--hidden','--glob','!.git', ...])
                │     -> the 4–160 ms path list never crosses a thread boundary
                ├── fuzzysort.snapshot(paths)  + prewarm, per root
                ├── delta snapshot (provisional adds since last refresh)
                ├── rerank: fzf + byLengthAsc  (or vendored VS Code scorer)
                └── frecency map: path -> 0..1
renderer
 └── QuickOpenPalette  -> requestOpenFile({ repoPath, relPath, path, mode:'file', preview:true })
```

The index must not live in the renderer: 35 MB at 50k and a 50 ms prewarm on the
UI thread are both avoidable. It should not live directly on the main thread
either, because a 2-character query at 272k blocks for 80 ms and main also
services every other IPC. A `worker_threads` Worker owned by main is the right
home — and fuzzysort v4 added `score()`/`highlight()` specifically so results
can cross that boundary as structured clones.

**This differs from dimension 1 deliberately, and the difference is real.** D1
measured that parsing ripgrep's NDJSON on the main thread costs ≤5.7 ms of lag
under a 20,000-submatch cap and correctly concludes *no worker* for content
search: that workload is IO-bound, streaming, and naturally chunked. Quick open
is the opposite — a resident 35 MB index and a synchronous 5–30 ms CPU burst on
**every keystroke**, plus a ~100 ms refresh whenever an agent writes a file.
Those bursts are not chunkable and land while the user is typing. One worker,
owned by main, holding only the path index; ripgrep's content stream stays on
main exactly as D1 specifies. The worker spawns the `rg --files` child itself so
the path list never crosses a thread boundary.

Measured worker round trip (query in, top-50 out, including structured clone):

| corpus | boot + index + prewarm | keystroke p50 | keystroke p95 |
|---|---|---|---|
| k50 (50,000) | **250 ms** | 4–13 ms | 5–29 ms |
| stoa (271,791) | 1,256 ms | 2–199 ms | 3–298 ms |

At 50k the worker adds ~3–8 ms over in-process and the UI thread never blocks.

### 7.2 Result limit and ordering

- **Gate `K = 512`.** Same number VS Code uses, and the measured sweet spot:
  `K=128` costs 5 points of top-10 fidelity, `K=2048` buys nothing and doubles
  the p95 (22.5 ms vs 11.6 ms at 95k).
- **Render 50.** Rerank produces up to 512; virtualising beyond 50 is
  engineering for an interaction nobody performs. Show a "512+ matches, keep
  typing" affordance when the gate saturates, the way VS Code's `limitHit` does.
- **Ordering** = rerank score, then `byLengthAsc`, then full-path length, then
  lexicographic. Deterministic — same query, same list, same order, every time.
  Never sort on anything time-varying (mtime, git status) or the list reshuffles
  under the user's cursor.
- **Empty query** shows recently-opened files from the frecency store, not the
  first 50 paths in walk order.
- **Highlight ranges** come back with the results (both fzf `positions` and the
  VS Code scorer's `labelMatch`/`descriptionMatch` give offsets), split across
  the filename and the dimmed directory, exactly like the VS Code picker.

### 7.3 What happens as you type

- **No timer debounce.** At 50k, p95 is 29 ms through the worker; typing is
  ~80–120 ms per keystroke. A debounce would only add lag.
- **Sequence numbers, latest wins.** Every query carries a monotonic id; the
  renderer drops any response older than the newest request, and the worker
  skips a query if a newer one is already queued. This is what actually protects
  the 272k case, where `src` costs 300 ms — the intermediate results are simply
  never rendered.
- **Never clear the list on a new keystroke.** Keep the previous results
  visible, dimmed, until the new set lands. Clearing produces the flicker that
  makes fast pickers feel slow.
- **Selection is sticky by path.** If the highlighted row still exists in the
  new result set, keep it highlighted; otherwise fall back to row 0. Prevents
  the classic "typed one more character and hit Enter on the wrong file".
- **First keystroke is never the prewarm.** Enumerate and prewarm on project
  open / first idle. If ⌘P is pressed before the index is ready, show a
  determinate progress row rather than an empty list — enumeration streams, so
  the count is known within 4 ms.
- **Quotes force a contiguous match** and `*` is stripped, if the VS Code
  reranker is chosen — `prepareQuery` gives that behaviour for free and VS Code
  users expect it. With the fzf reranker, fzf's own extended syntax (`'exact`,
  `^prefix`, `suffix$`, `!negate`) is available via `extendedMatch`; enabling it
  is a separate decision, not a default.
- **Multi-project** (the backlog's "optionally all open projects") is one worker
  holding one snapshot per root. Query each, merge by score, prefix rows with
  the project name. Cost is additive and each root is independently 0.1–13 ms;
  drop a root's snapshot when the project closes and the memory returns (§3.3).

### 7.4 Guardrails

- **Cap the index at 200,000 paths per project.** Above that, keep the first
  200k by `rg` order, surface a one-line "indexing the first 200k of N files"
  note, and let content search (dimension 3) cover the rest. Justification is in
  §3.3 and §6.3: 272k costs 234 MB, a 297 ms prewarm and a 540 ms refresh, and
  the only local repo that hits it is 268k `.specstory` history files — a case
  better solved by excluding history from quick open than by paying for it.
- **Drop the snapshot and the path array when a project closes.** Measured to
  return the memory. Do not call `fuzzysort.cleanup()` with a live project.
- **Exclude by default**: `.git`, `node_modules`, `.DS_Store`. Include hidden
  paths — `.github/`, `.claude/`, `.specstory/`, `.vscode/` are first-class in
  an agentic shell.

### 7.5 Frecency

Not in any library — fzf-for-js has no frecency, and fuzzysort has none. It is
~40 lines and it is the single biggest perceived-quality win, because the file
you want is usually one you touched recently.

- Store `path -> {count, lastAccess}` in the existing SQLite manifest, keyed by
  project root. Score `frecency = log1p(count) * decay(now - lastAccess)` with a
  half-life of a few days, normalised to 0..1.
- Apply it as a **tier bonus, not a multiplier**: with the VS Code reranker, add
  `round(frecency * (1<<16) * 0.5)` so a frecent file can beat other
  filename-tier matches but can never outrank a better *kind* of match. A raw
  multiplicative boost makes an unrelated recent file jump above an exact
  filename hit, which reads as broken.
- Seed it from files opened through the existing `requestOpenFile` bus
  (`src/renderer/state/open-file.ts`) so the tree, the SCM sidebar and quick open
  all feed one signal.
- Measured cost of the frecency lookup and bonus inside the rerank loop: below
  the noise floor (≤0.1 ms over 512 candidates).

---

## 8. Reproducing the numbers

Harness in
`/private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad/bench/`
(scratchpad — copy anything worth keeping into the repo before it is reaped):

| file | what it measures |
|---|---|
| `vsc-scorer.mjs` | the 275-line MIT extraction of VS Code's fuzzyScorer — **already copied into `docs/research/assets/phase14/vscode-fuzzy-scorer-extract.mjs`** |
| `bench.mjs` | all seven scorers, whole-list latency, per corpus |
| `quality.mjs` / `quality16.mjs` | the 26-case and 16-case labelled ranking evals |
| `hybrid2.mjs`, `combo.mjs` | gate-and-rerank variants, quality + latency |
| `gate.mjs` | gate size K vs top-10 fidelity against whole-list fzf |
| `mem3.mjs`, `leak.mjs`, `switch.mjs` | isolated memory, rebuild leak check, project-switch release |
| `list-bench.mjs` | rg vs fd vs git ls-files vs fast-glob vs tinyglobby vs readdir |
| `e2e.mjs`, `refresh.mjs` | cold ⌘P cost; re-enumerate + diff + rebuild cost |
| `worker-bench.mjs` | `worker_threads` round trip |
| `fff-bench.mjs`, `fff-quality.mjs`, `fff-scale.mjs`, `fff-dot.mjs` | the fff evaluation in §4 |
| `corpora/*.txt` | the five path lists |

Reproduce the corpora with
`gh api "repos/<owner>/<repo>/git/trees/<branch>?recursive=1" --jq '.tree[] | select(.type=="blob") | .path'`
— note that a single recursive call **truncates** (`.truncated == true`), which
is why `linux-full` is assembled from 21 per-subtree fetches.

---

## 9. Decision summary

| decision | choice | why |
|---|---|---|
| enumerate | `rg --files --hidden` via `@vscode/ripgrep@1.18.0` | fastest measured on every repo size, 4 ms TTFB, correct `.gitignore`, MIT, no postinstall |
| gate | `fuzzysort@4.0.1` over `snapshot()`, `limit: 512, threshold: 0` | only scorer fast enough to touch the whole list; 0.7 KB/path; ranked gate beats VS Code's unranked one |
| rerank | `fzf@0.5.2` + `byLengthAsc` over the 512 | best measured ranking (MRR 0.918) at 0.9–13.6 ms p95 on 95k |
| rerank (all-MIT fallback) | 275-line vendored VS Code `fuzzyScorer` | MRR 0.876, 26/26 in top-5, no BSD-3-Clause, no extra dependency |
| where it runs | `worker_threads` Worker owned by main | 35 MB + 50 ms prewarm off the UI thread; v4's `score()`/`highlight()` are built for it |
| freshness | existing `RepoWatcher.onChange` → coalesced `rg --files` refresh + optimistic delta | no second FSEvents subscription; no reimplemented gitignore; delta costs ≤0.5 ms/query |
| result limit | gate 512, render 50 | matches `AnythingQuickAccessProvider.MAX_RESULTS`; K=128 loses fidelity, K=2048 buys nothing |
| as-you-type | no debounce, sequence numbers, keep stale results visible | p95 29 ms at 50k is below typing cadence; latest-wins protects the 272k tail |
| frecency | ~40 lines over the SQLite manifest, applied as a tier bonus | no library has it; biggest perceived-quality win; multiplicative boosts read as broken |
| cap | 200k paths per project | 272k costs 234 MB / 297 ms prewarm / 540 ms refresh |
| rejected | uFuzzy, fast-fuzzy, command-score, fuse.js, match-sorter, fuzzaldrin, fzy.js, `vscode-fuzzy-scorer` | wrong model for acronym path queries, unmaintained, archived, or both |
| deferred | `@ff-labs/fff-node` | genuinely fast and MIT, but skips hidden paths, has no relevance floor, and adds a signed `.dylib` + FFI to the bundle |

### Budget at the backlog's stated target (50,000 files)

| | measured |
|---|---|
| enumerate | ~40 ms, first path at 4 ms |
| index build + prewarm | 13 ms + 50 ms, both before the user presses ⌘P |
| memory | 45 MB total heap (35 MB index, 4 MB strings, 2 MB basename/dirname/Map) |
| keystroke, in worker | p50 4–13 ms, p95 5–29 ms |
| worst single keystroke observed | 29 ms (`"ed"`) |
| refresh after an agent writes a file | ~100 ms background, or ≤0.5 ms via the optimistic delta |

Comfortably inside "feels instant".

---

## Sources

- [fuzzysort on npm](https://www.npmjs.com/package/fuzzysort) · [farzher/fuzzysort](https://github.com/farzher/fuzzysort)
- [fzf on npm](https://www.npmjs.com/package/fzf) · [ajitid/fzf-for-js](https://github.com/ajitid/fzf-for-js) · [junegunn/fzf](https://github.com/junegunn/fzf)
- [@leeoniya/ufuzzy](https://github.com/leeoniya/uFuzzy) · [EthanRutherford/fast-fuzzy](https://github.com/EthanRutherford/fast-fuzzy) · [superhuman/command-score](https://github.com/superhuman/command-score) (archived) · [Nozbe/microfuzz](https://github.com/Nozbe/microfuzz)
- VS Code, MIT: [`src/vs/base/common/fuzzyScorer.ts`](https://github.com/microsoft/vscode/blob/main/src/vs/base/common/fuzzyScorer.ts), [`anythingQuickAccess.ts`](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/search/browser/anythingQuickAccess.ts), [`services/search/node/fileSearch.ts`](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/search/node/fileSearch.ts), [`services/search/common/search.ts`](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/services/search/common/search.ts)
- [@vscode/ripgrep](https://www.npmjs.com/package/@vscode/ripgrep) · [microsoft/vscode-ripgrep](https://github.com/microsoft/vscode-ripgrep)
- [dmtrKovalenko/fff](https://github.com/dmtrKovalenko/fff) · [@ff-labs/fff-node](https://www.npmjs.com/package/@ff-labs/fff-node)
- [@parcel/watcher](https://www.npmjs.com/package/@parcel/watcher) · [ignore](https://www.npmjs.com/package/ignore) · [fast-glob](https://www.npmjs.com/package/fast-glob) · [tinyglobby](https://www.npmjs.com/package/tinyglobby)
