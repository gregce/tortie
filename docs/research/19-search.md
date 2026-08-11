# gmux research 19 — Phase 14 build spec: deep file + code search

**Status:** build spec. This is the document `docs/BACKLOG.md` Phase 14 points at.
**Synthesised:** 2026-08-10, from three independently-researched dimension docs, each of
which measured its own claims on this machine against the real repos on disk:

| doc | owns |
|---|---|
| [`19-search-d1-content-engine.md`](./19-search-d1-content-engine.md) | the ⌘⇧F engine — flags, caps, cancellation, process placement |
| [`19-search-d2-fuzzy-file-path.md`](./19-search-d2-fuzzy-file-path.md) | the ⌘P ranker — enumeration, scoring, freshness, memory |
| [`19-search-d3-code-aware-ux.md`](./19-search-d3-code-aware-ux.md) | symbols, structural search, replace, and the full UX contract |

Where they overlap, **this document is the tiebreaker** and §0.2 records every place it
overrides a dimension doc's first choice. Where they agree, this document is a summary and
the dimension doc holds the detail — it is not repeated here at full length.

Every package fact in §0 and §1 was **re-verified live against the npm registry on
2026-08-10** by the synthesiser, not inherited from the dimension docs.

---

## 0. Recommendation

### 0.1 The three picks

| dimension | ship | version | licence | why, in one line |
|---|---|---|---|---|
| **Content engine** | `@vscode/ripgrep` | **1.18.0** (vendors ripgrep 15.0.0) | **MIT** (binary: Unlicense OR MIT) | **~3 ms to first result on every corpus measured** — 312 files to 107k, 1.5 GB to 9.4 GB — and it is the only option that gets nested `.gitignore` right for free. |
| **Fuzzy scorer** | `fuzzysort` **gate** → vendored VS Code `fuzzyScorer` **rerank** | **fuzzysort 4.0.1** + a 275-line in-repo extract | **MIT** / **MIT** | fuzzysort's `snapshot()` is the only scorer fast enough to touch a whole 50k–270k path list (0.1–10 ms); the vendored VS Code scorer reranks the surviving 512 in 1–10 ms and is the only configuration measured that put **all 26 labelled targets in the top 5**. |
| **Symbol strategy** | `web-tree-sitter` + `@vscode/tree-sitter-wasm` + five gmux-owned `.scm` tags queries | **0.26.12** + **0.3.1** | **MIT** / **MIT** | Pure WASM — **zero native code, zero signing cost**, which is what killed every alternative — and 6 workers index 2,148 files/s, so a real repo's symbol index is built lazily in 300–800 ms. |

Supporting packages: none. No new native dependency, no new daemon, no index for content
search. `better-sqlite3@^13`, `@parcel/watcher@^2.6.0` and `@vscode/codicons@^0.0.46-24`
are already in `package.json` and are reused as-is.

`package.json` delta, complete:

```json
"@vscode/ripgrep": "1.18.0",
"@vscode/tree-sitter-wasm": "0.3.1",
"fuzzysort": "4.0.1",
"web-tree-sitter": "0.26.12"
```

All four pinned exactly, matching the repo's existing convention for `@pierre/diffs` and
`@pierre/trees`. §7.1 explains why the pin on `fuzzysort` in particular is not optional.

### 0.2 Where this document overrides a dimension doc

Five synthesis-level calls. Each changes what gets built, so each is called out rather than
buried.

**O1 — the reranker is the vendored VS Code scorer, not `fzf@0.5.2`.**
D2's headline recommends `fzf` (fzf-for-js) with the `byLengthAsc` tiebreaker and is right
that it wins on raw ranking (MRR 0.919 vs 0.876). It is overridden on three grounds, all of
them from D2's own measurements and verification:

- **Licence.** `fzf@0.5.2` is **BSD-3-Clause** (verified on the registry today). The
  backlog's Phase 14 constraint is "MIT/Apache licensing". BSD-3-Clause is permissive and
  distribution-compatible, but taking it means quietly widening a stated constraint for a
  ranking delta of **two positions out of twenty-six**.
- **Maintenance.** Its last functional commit was **2023-04-25** — over three years. Every
  commit since is dependabot. It is frozen at fzf's pre-0.31 default scheme and has **no
  `--scheme=path`**, which is precisely why it needs the `byLengthAsc` crutch to be good at
  paths at all.
- **The trade runs the right way.** The vendored scorer loses 2 top-1 hits (21 vs 23) and
  **gains** the one that matters for a picker: **26/26 in the top 5 versus 25/26**. It is
  also marginally *faster* as a reranker (1.0–10.1 ms p95 at 95k vs 0.9–13.6 ms). "Never
  make the user scroll" beats "guess right slightly more often".

The extract already exists, already benchmarked, at
`docs/research/assets/phase14/vscode-fuzzy-scorer-extract.mjs` — 275 lines, zero deps,
MIT, derived from `microsoft/vscode`'s `src/vs/base/common/fuzzyScorer.ts` with
`sep='/'`, `isWindows=isLinux=false`. Copy it into `src/main/search/quickopen/scorer.ts`,
add types, keep the attribution header. **Do not re-derive it.**

`fzf` stays documented as the upgrade path: if ranking complaints appear in daily use, it
is a one-module swap behind the same interface, and the licence question can be answered
then with evidence instead of speculation.

**O2 — one ripgrep resolver, one enumeration, one ignore truth.**
Three consumers want ripgrep (content search, quick open, the symbol index's file list).
Left alone that is three spawn sites and three copies of the argv, which fails standing
guardrail 3 ("no duplicated resolution/config logic"). §2.3 specifies one `resolve.ts` and
one `files-args.ts`, and — more importantly — **the symbol indexer does not enumerate.** It
consumes the quick-open worker's already-fresh path list. One walk, one `.gitignore`
implementation, in one place, forever.

**O3 — `RepoWatcher.onChange` needs a fan-out before search can reuse it.**
D2 correctly says "do not start a second FSEvents subscription; add a consumer to the
existing per-repo watcher". Reading the code shows that is not currently possible:
`src/main/git/ipc.ts:98-99` hard-wires the single callback to `broadcastGitChanged(p)`.
§2.5 specifies the ~15-line main-process fan-out that makes the reuse real, plus the
fallback for the case none of the three docs noticed — `watchers` is
`Map<string, Promise<RepoWatcher | null>>` and **the value is `null` when `RepoWatcher.watch`
fails**, so search must never assume a watcher exists.

**O4 — symbols are in Phase 14, but land last and behind a stated go/no-go.**
The backlog scopes item 3 conditionally ("recommend only if it justifies the weight").
D3 makes the case and the measurements support it, but symbols are the only part of this
phase that adds **5.2 MB of assets, a worker pool, a persisted index and five hand-authored
query files**. So they ship, sequenced after everything else, with the checkable gate in
§5.3. Content search and quick open must not be blocked on them.

**O5 — the worker budget is fixed at one resident worker plus at most six transient.**
D1 says main-thread parse for content (measured: ≤5.7 ms lag, zero dropped frames under the
cap). D2 says a worker for quick open. D3 says a six-worker pool for symbols. All three are
right for their workload, but nobody stated the total. §2.1 does, and it is a budget: no
third resident pool without deleting one.

### 0.3 Scope, in one table

| | v1 (Phase 14) | deferred |
|---|---|---|
| Quick open ⌘P | ✅ files, `:line`, recents, multi-project toggle | command palette (`>`) |
| Content search ⌘⇧F | ✅ streaming, case/word/regex, include+exclude, context on expand | indexed content search (measured *slower* than no index) |
| Replace ⌘⇧H | ✅ preview + replace single/file/all + one-shot undo | preserve-case, multi-project, live tree mutation |
| Symbols ⌘⇧O | ✅ six languages, `@` file / `#` project, lazy index | LSP (deliberately, permanently for this app) |
| Structural | ❌ | ast-grep escape hatch only (~30 lines, zero bundle) |
| Explorer type-to-filter | ✅ (~20 lines — the API is already in `@pierre/trees`) | — |

Reasons are in §5. The short version: **content search and quick open are the user's actual
ask and are nearly free; replace is free because the engine already emits the preview;
symbols cost real weight but are the only way to answer "go to symbol"; structural search
has an audience of power users who have a terminal one keystroke away — and this app *is*
the terminal.**

---

## 1. Verification ledger

Re-checked live by the synthesiser against `registry.npmjs.org` on **2026-08-10**.

| package | latest | licence | published | notes |
|---|---|---|---|---|
| `@vscode/ripgrep` | **1.18.0** | MIT | 2026-05-07 | **`scripts: []`** — the postinstall GitHub download is gone. 12 per-platform `optionalDependencies`. ESM-only. |
| `@vscode/ripgrep-darwin-arm64` | 1.18.0 | MIT | 2026-05-07 | **4,530,213 bytes unpacked.** The only platform package that installs here. |
| `fuzzysort` | **4.0.1** | MIT | **2026-08-10 18:21 UTC** | Zero dependencies. Published *today*; see §7.1. `4.0.0` was 2026-08-09; `3.1.0` (the fallback) 2024-10-14. |
| `web-tree-sitter` | **0.26.12** | MIT | 2026-08-08 | Zero dependencies. |
| `@vscode/tree-sitter-wasm` | **0.3.1** | MIT | 2026-04-07 | Zero dependencies. Prebuilt `.wasm` grammars. |
| `fzf` (fzf-for-js) | 0.5.2 | **BSD-3-Clause** | **2023-04-25** | Confirms O1: three years since the last release. |

Verified by the dimension docs, load-bearing, not re-run here (each was measured, not read):

- `@vscode/ripgrep@1.18.0` vendors **ripgrep 15.0.0**, `+pcre2`, `+NEON`, PCRE2 10.45 JIT.
- `require(esm)` of the ESM-only wrapper **works in real Electron 43.3.0 / Node 24.18.1** —
  tested, not assumed. gmux's CJS main needs no shim.
- `web-tree-sitter` loads in **Electron 43.3.0 via plain CJS require**; runtime + grammar +
  query compile + parse of a 584-line file = **37 ms cold**.
- **Shiki is not tree-sitter.** The brief's premise that tree-sitter is already in the tree
  via Shiki is wrong: Shiki 4.4.3 is `@shikijs/vscode-textmate` + oniguruma, and there is no
  tree-sitter anywhere in `node_modules`. Tree-sitter is priced here as a new dependency.
- **VS Code 1.134 ships `@vscode/ripgrep-universal`** (57,965,828 bytes, all platforms)
  because it cross-builds every platform from one machine. gmux ships `arm64` only. Take
  the 4.3 MB one.

Rejected after measurement, so nobody re-litigates: `@vscode/ripgrep-universal` (58 MB),
hand-vendored rg 15.2.0 (no measurable gain), Node-native workers, WASI `ripgrep@0.3.1`,
ugrep 7.8.4, SQLite FTS5 trigram, Orama/MiniSearch/FlexSearch, Tantivy bindings,
`@ff-labs/fff-node`, uFuzzy, fast-fuzzy, command-score, fuse.js, `vscode-fuzzy-scorer`,
universal-ctags, `@ast-grep/napi` *for symbols*, Comby, and LSP. Each rejection with its
deciding number is in the dimension doc that measured it.

---

## 2. Architecture

### 2.1 Where each piece runs — the process map and the worker budget

```
┌─ renderer ─────────────────────────────────────────────────────────────────┐
│  SearchView (sidebar)   QuickOpenPalette (⌘P/⌘⇧O)   MonacoHost             │
│  • pure view. Holds NO index and parses NO NDJSON.                         │
│  • virtualized result tree; per-character highlight from supplied offsets. │
│  • opens everything through the ONE open-file bus (§2.6).                  │
└───────────────▲──────────────────────────────┬─────────────────────────────┘
      results / hits (batched, 16 ms)          │  search:start / cancel
                │                              │  quickopen:query
┌───────────────┴──────────────────────────────▼─────────────────────────────┐
│ MAIN PROCESS — event loop                                                  │
│                                                                            │
│  ContentSearchEngine        spawn(rg, --json) → line split → JSON.parse    │
│    • NO worker, NO utilityProcess.  MEASURED: with the 20,000 cap the      │
│      whole parse costs p95 5.7 ms of loop lag and drops ZERO frames.       │
│      Uncapped it drops 9. The cap buys the headroom; a worker would only   │
│      add an IPC hop and a second copy of every 4 MB payload.               │
│    • epoch gate + SIGKILL cancellation (§2.4)                              │
│                                                                            │
│  SearchCoordinator          owns the two things below; brokers the file    │
│                             list between them (O2)                         │
│                                                                            │
│  ├─ worker_threads × 1  (RESIDENT, one per window)  ── QuickOpenWorker     │
│  │    • spawns its own `rg --files` so 50k–270k strings never cross a      │
│  │      thread boundary                                                    │
│  │    • fuzzysort snapshot (45 MB at 50k) + prewarm                        │
│  │    • optimistic delta snapshot (≤1,000 provisional paths)               │
│  │    • rerank with the vendored VS Code scorer; frecency tier bonus       │
│  │    • ALSO the authoritative path list for the symbol indexer            │
│  │                                                                          │
│  └─ worker_threads × ≤6 (TRANSIENT, lazily created, evicted at 30 min idle)│
│       SymbolPool — web-tree-sitter + 6 wasm grammars + 5 gmux queries      │
│       • 2,148 files/s at 6 workers; the knee is 6, 8 is slower             │
│       • columnar symbol table + better-sqlite3 persistence                 │
│                                                                            │
│  RepoWatcherBus (§2.5)   ONE FSEvents subscription per repo, fanned out    │
└────────────────────────────────────────────────────────────────────────────┘
```

**The worker budget is 1 resident + ≤6 transient (O5).** Content search parses on the main
thread deliberately: it is IO-bound, streaming and naturally chunked, and the cap already
bounds it. Quick open is the opposite — a resident 45 MB index and a synchronous CPU burst
on *every keystroke* — so it gets the resident worker. Symbol indexing is seconds of CPU in
one burst, so it gets a pool that does not exist most of the time. Anyone proposing a
fourth home for search work must first delete one of these.

### 2.2 Module layout

```
src/main/search/
  resolve.ts          rgPath, packaged-aware. THE only place the binary path is computed.
  args.ts             ContentSearchInput → argv. Pure, unit-tested.
  files-args.ts       repoPath → `rg --files` argv. Pure. Shared with the worker.
  parser.ts           NDJSON → typed events; preview clamp; byte→UTF-16 (§2.7). Pure.
  engine.ts           spawn / stream / cap / epoch / SIGKILL
  replace.ts          mtime-guarded back-to-front byte splice + one-shot undo
  ipc.ts              registerSearchIpc() — per-domain registrar (guardrail 2)
  quickopen/
    coordinator.ts    owns the resident worker; roots in/out; frecency; watcher hookup
    worker.ts         rg --files, fuzzysort snapshot, delta, rerank
    scorer.ts         the vendored MIT VS Code fuzzyScorer extract (O1)
  symbols/
    pool.ts           worker_threads pool, min(6, cpus-2)
    worker.ts         web-tree-sitter parse + query loop
    store.ts          columnar table (one string blob + Int32Array offsets)
    persist.ts        better-sqlite3 `symbol_index`, keyed by (repoPath, relPath, mtimeMs, size)
    queries/*.scm     javascript · typescript · go · python · rust  (gmux-authored)
src/main/watcher/
  bus.ts              NEW — the fan-out in §2.5
```

`args.ts`, `files-args.ts`, `parser.ts` and `scorer.ts` are pure functions over strings and
carry the vitest coverage. They are where the quirks live, and the quirks are exactly what
manual testing will not find.

### 2.3 One ripgrep, three consumers (O2)

`resolve.ts` is the single source of the binary path, including the packaged rewrite:

```ts
const rgBinary = app.isPackaged
  ? rgPath.replace(`app.asar${sep}`, `app.asar.unpacked${sep}`)
  : rgPath;
```

Three consumers, one enumeration:

| consumer | how it gets files |
|---|---|
| Content search (⌘⇧F) | spawns `rg` itself with the content argv — it never needs a path list |
| Quick open (⌘P) | the resident worker spawns `rg --files` and owns the authoritative list |
| Symbol index (⌘⇧O) | **asks the quick-open worker for its list**, filtered to indexable extensions. Falls back to its own `listFiles()` (same `files-args.ts`) only if the worker is not warm. |

50,000 strings cross the worker boundary once per index build (~4 MB structured clone,
10–20 ms) instead of costing a third `.gitignore`-correct walk. **There must not be a second
ignore implementation anywhere under `src/main/search/**`.** Ripgrep is the only thing in
gmux that knows what is ignored.

Production argv, from D1 §4.2 with the `.git` correction:

```
--hidden --no-require-git --no-config
-g '!.git/'
--ignore-case | --case-sensitive
[-g '!*' -g <anchored include> …]  [-g '!<anchored exclude>' …]
[--no-ignore] [--no-ignore-parent] [--no-ignore-global]
--max-filesize 10M --crlf --engine auto
--regexp <re> | --fixed-strings
--json  [-r <replacement>]  [--multiline]
-- <pattern> .
```

`--no-config` is not optional: without it a user's `RIPGREP_CONFIG_PATH` silently changes
gmux's results. `--engine auto` lets rg fall back to PCRE2 (present, JIT-enabled) for
lookaround instead of erroring. `--hidden` is required — `.claude/`, `.specstory/`,
`.github/` and dotfile configs are first-class content in an agentic shell — and `-g '!.git/'`
is what stops `--hidden` walking the object store. Note the honest framing D1 arrived at
after re-measuring: **`-g '!.git/'` is for result hygiene, not speed** (the time cost of
including `.git` is +0.6% to +45%, not the 2× a first sloppy measurement suggested).

For `rg --files`: `--files --hidden --no-require-git --no-messages -g '!.git' -g '!node_modules' -g '!.DS_Store'`.

### 2.4 The IPC contract

Append-only additions to `src/shared/ipc.ts` — new channels, no edits to existing
declarations (`src/shared/*` is append-only during parallel builds).

```ts
// ── content search ─────────────────────────────────────────────────────────
export interface ContentSearchInput {
  repoPath: string;
  query: string;
  isRegex: boolean;
  isCaseSensitive: boolean;
  matchWholeWord: boolean;
  /** Comma-separated globs, VS Code syntax; empty = everything. */
  includes: string;
  excludes: string;
  /** false → --no-ignore-vcs. */
  useIgnoreFiles: boolean;
  /** Context lines either side. 0 in the stream; context is fetched on expand. */
  contextLines: number;
  /** Set only to get a replace PREVIEW in the same stream (§5.2). */
  replace?: string;
  maxResults: number;    // default 20_000  — the primary perf mechanism, not a valve
  maxPerFile: number;    // default  1_000
  maxLineChars: number;  // default  2_000  — MANDATORY, see §2.7
}

export interface SearchMatch {
  line: number;                        // 1-based
  text: string;                        // whole line, newline stripped, ALREADY clamped
  trimmed: number;                     // TOTAL original-line UTF-16 units before text[0] —
                                       // indentation PLUS the window's own left edge when
                                       // truncated (corrected in Phase 14.1: shipping the
                                       // indentation alone selected column 1,875 for a match
                                       // at column 4,880 of a 5,006-char line)
  ranges: [number, number][];          // UTF-16, ALREADY converted in main
  replacements?: string[];             // one per range, only when `replace` was set
  byteOffset: number;                  // line start in the file; the replace path needs it
}

export interface SearchFileResult {
  relPath: string;
  matchCount: number;
  matches: SearchMatch[];
  clipped: boolean;                    // matchCount was cut by maxPerFile
}

export interface SearchProgress {
  searchId: string;
  files: SearchFileResult[];
  totalMatches: number;
  totalFiles: number;
  done: boolean;
  capped: boolean;                     // hit maxResults
  error?: string;                      // rg exited non-zero for a showable reason
}

// ── symbols ────────────────────────────────────────────────────────────────
export interface SymbolHit {
  name: string;
  kind: 'function' | 'method' | 'class' | 'interface' | 'struct' | 'type'
      | 'enum' | 'enum-member' | 'constant' | 'variable' | 'field'
      | 'module' | 'macro' | 'property';
  container: string | null;
  relPath: string;
  line: number;      // 1-based
  column: number;    // 0-based UTF-16
  endColumn: number;
}

// ── quick open ─────────────────────────────────────────────────────────────
export interface QuickOpenHit {
  repoPath: string;
  relPath: string;
  /** Matched character indices, for per-character highlighting. Required. */
  positions: number[];
  score: number;
  provisional: boolean;   // came from the optimistic delta, not the authoritative list
}

// InvokeChannelMap additions
'search:start':       { req: [input: ContentSearchInput]; res: { searchId: string } };
'search:cancel':      { req: [searchId: string]; res: void };
'search:context':     { req: [i: { repoPath: string; relPath: string; line: number; before: number; after: number }];
                        res: { lines: { line: number; text: string }[] } };
'search:symbols':     { req: [i: { repoPath: string; query: string; relPath?: string; limit: number }];
                        res: { hits: SymbolHit[]; indexing: boolean; indexed: number; total: number } };
'search:replace':     { req: [i: { repoPath: string; search: ContentSearchInput;
                                   scope: { relPath: string; lines: number[] }[] | 'all' }];
                        res: { token: string; filesChanged: number; matchesReplaced: number;
                               skipped: { relPath: string; reason: string }[] } };
'search:undoReplace': { req: [token: string]; res: { restored: number; refused: string[] } };
'quickopen:query':    { req: [i: { repoPath: string; allProjects: boolean; query: string; seq: number; limit: number }];
                        res: { seq: number; hits: QuickOpenHit[]; total: number; ready: boolean } };
'quickopen:warm':     { req: [repoPath: string]; res: void };

// Per-search result stream, following the termDataChannel(sessionId) precedent
// already in this file.
export const searchResultsChannel = (searchId: string): string =>
  `search:results:${searchId}`;
```

**Streaming and cancellation, exactly:**

```
search:start ─▶ main
   ├ epoch = ++counter; SIGKILL any live child for this searchId
   ├ spawn(rgBinary, args, { cwd: root, stdio: ['ignore','pipe','pipe'] })
   ├ stdout → line splitter → JSON.parse → typed event
   │    · clamp lines.text to maxLineChars, windowed around the first match,
   │      offsets shifted (MANDATORY — §2.7)
   │    · byte → UTF-16 conversion, single walk (§2.7)
   │    · coalesce into per-file groups
   │    · flush to the renderer every ~16 ms OR every 200 matches, whichever first
   │    · at maxResults: set capped, SIGKILL, emit the final frame
   ├ stderr → accumulate; classify only on exit code ∉ {0,1}
   └ close → final SearchProgress { done: true }
search:cancel ─▶ SIGKILL + bump epoch; every later event for that epoch is dropped
```

Five rules that came from measurement rather than taste:

1. **`SIGKILL`, never `SIGTERM`.** Measured: SIGTERM kills in 2.6 ms but lets **7,978 bytes**
   of already-buffered pipe data land afterwards; SIGKILL kills in 2.5 ms and lets **zero**.
   Ripgrep holds no locks and writes nothing, so SIGKILL is safe.
2. **Epoch-gate every event anyway.** Late chunks are real, not theoretical. A stale frame
   must never paint.
3. **Exit code 1 means "no matches", not failure.** Only `∉ {0,1}` with stderr content is an
   error.
4. **Debounce the query 150 ms, then cancel-and-respawn.** At 2.5 ms to kill and 3 ms to
   first result, respawning beats any incremental scheme. Require ≥2 characters unless regex
   mode is on (a 1-character regex is a legitimate query).
5. **Batch to the renderer on a frame timer.** rg delivers 20,000 results in 24–71 ms;
   forwarding each individually would generate more IPC traffic than there are frames.

Quick open is the opposite and deliberately so: **no debounce** (p95 is 29 ms at 50k, below
typing cadence), **sequence numbers, latest wins**, and **never clear the list on a new
keystroke** — keep the previous results visible and dimmed until the new set lands, or the
picker reads as slow when it is actually fast.

### 2.5 Reusing `@parcel/watcher` — the fan-out, and the null case (O3)

gmux already runs exactly one `RepoWatcher` per repo
(`src/main/git/ipc.ts:43`, `src/main/watcher/repo-watcher.ts`), already implements VS Code's
recipe (worktree subscription with `.git` excluded, plus a filtered dotgit subscription),
and already coalesces to a single `onChange(repoPath)` on a **300 ms non-resetting** debounce.
Measured: create → event in 14–78 ms (p50 68), and a burst of **500 simultaneous creates
delivered all 500 events**. Nothing is dropped.

**Do not start a second FSEvents subscription.** Double-watching a 95k-file tree is exactly
the battery burn the backlog forbids.

But the reuse is not free today, because the callback is hard-wired:

```ts
// src/main/git/ipc.ts:98-99 — today
const promise = RepoWatcher.watch(key, {
  onChange: (p) => broadcastGitChanged(p)
})
```

Add `src/main/watcher/bus.ts` (~15 lines): `onRepoChanged(cb): () => void` and
`emitRepoChanged(path)`. Change the line above to `onChange: emitRepoChanged`, and have the
git module subscribe with `onRepoChanged(broadcastGitChanged)`. One behaviour-preserving
change, and search becomes a peer consumer instead of a second watcher.

**The null case none of the dimension docs caught:** `watchers` is
`Map<string, Promise<RepoWatcher | null>>`, and `RepoWatcher.watch` resolves to **`null`**
when subscription fails (`git/ipc.ts:100-104`); `ensureWatcher` is only called from git IPC
paths, so a project that never took a `git:*` call has no watcher at all. Search must not
assume one exists. Fallback: stamp the path index with a build time and re-enumerate on
palette open if it is older than 30 s. Cheap, and it makes non-repo folders work.

Three consumers, three deliberately different policies:

| consumer | on `repoChanged` | measured cost |
|---|---|---|
| **Quick open** | coalesce to ≤1 refresh / 2 s → re-run `rg --files`, diff against the previous `Set`, rebuild the snapshot only if the diff is non-empty | ~100 ms of background worker CPU at 50k; ~5% of one core under sustained agent churn |
| **Symbols** | 300 ms debounce → re-parse only the drifted files (`mtimeMs`+`size` mismatch) | **1.25 ms per file.** A save is free. |
| **Content search** | **do not re-run.** Count changed files, show `⚠ N files changed · Refresh` | zero |

That last row is where gmux must depart from VS Code, and it is the single most important
UX consequence of "this is a harness for agents that rewrite the repo continuously". A
search that re-ran itself on every watcher event would thrash and would move rows out from
under the user's cursor. The symbol index, by contrast, updates itself silently — it has no
visible cursor to disturb.

**The optimistic delta.** A full refresh is up to 100 ms behind reality plus up to 78 ms of
FSEvents latency, so a file an agent just wrote is briefly missing from ⌘P. Cover it with a
`delta: string[]` of watcher-seen paths since the last authoritative refresh, given its own
`fuzzysort.snapshot()` and searched alongside the base. **Measured overhead of a 1,000-entry
delta: 0.08–0.48 ms per query** — 1–4% of the base query at 50k. Free. Delta entries are
marked provisional (`QuickOpenHit.provisional`); the next authoritative refresh either
confirms them or silently drops the ones ripgrep would have ignored. This is also why the
delta must never be trusted as truth: **`@parcel/watcher` knows nothing about `.gitignore`**
(its options are literal globs and regexes only), so a watcher path may well be inside a
`target/debug/` tree.

### 2.6 The open-file bus — the one required contract change

`src/renderer/state/open-file.ts` is the single canonical bus; the SCM and tree streams
re-export it. `OpenFileRequest` carries `repoPath`, `relPath`, `path`, `origPath`, `mode`,
`source`, `preview`, `commit` — and **no line, no column, no selection**. Every search
result, every symbol hit and every `foo.ts:412` pick needs one. Append (the file has already
grown twice this way, both times optional so existing emitters still compile):

```ts
/**
 * Where in the file to land (Phase 14). A request that carries one is a
 * NAVIGATION: reveal the range, select it, flash it once.
 * `line` is 1-based; columns are 0-based UTF-16 offsets, matching Monaco.
 */
export interface OpenFileSelection {
  line: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  highlight?: boolean;   // default true
}

export interface OpenFileRequest {
  // …existing fields unchanged…
  source: 'worktree' | 'index' | 'untracked' | 'merge' | 'history' | 'tree'
        | 'search' | 'symbol' | 'quickopen';
  selection?: OpenFileSelection;
}
```

Four rules, all of which must be implemented or the feature is subtly broken:

1. **A request with a `selection` never opens as a diff or a rendered preview.**
   `openFromRequest` (`src/renderer/editor/store.ts:324`) currently picks `diff` for changed
   files and `preview` for markdown — both line-less surfaces. When `selection` is present,
   force `mode: 'file'` and leave `canDiff` true so the mode chip still offers the diff.
2. **Re-opening an already-open tab must still apply the selection.** The early return at
   `store.ts:331-336` only activates and pins. Add `pendingSelection: OpenFileSelection | null`
   to `EditorTab`, set it on *both* paths, and have `MonacoHost` consume-and-clear it.
3. **Reveal *after* `restoreViewState`.** The mount effect restores saved view state at
   `MonacoHost.tsx:160`; a reveal issued before that is silently overwritten.
4. **Do not steal focus for search opens.** `MonacoHost.tsx:191` focuses the editor on open.
   That is wrong while scanning results — focus must stay in the list so ↑↓ keep working.
   Focus the editor only when the request is pinned (`preview === false`) or its `source` is
   not `'search'`.

```ts
const state = takeViewState(tab.id);
if (state !== null) ce.restoreViewState(state);

const sel = tab.pendingSelection;
if (sel) {
  const range = new m.Range(
    sel.line, (sel.column ?? 0) + 1,
    sel.endLine ?? sel.line, (sel.endColumn ?? sel.column ?? 0) + 1
  );
  ce.setSelection(range);
  ce.revealRangeInCenterIfOutsideViewport(range, m.editor.ScrollType.Immediate);
  if (sel.highlight !== false) flashRange(ce, range);   // one decoration, ~600 ms
  clearPendingSelection(tab.id);
}
```

`flashRange` adds one decoration (`background: var(--accent-wash)`, fading over
`--dur-panel`) and removes it on a timer. Under `prefers-reduced-motion` it holds the
decoration for 600 ms without the transition.

### 2.7 Two traps that will each cost a day

**`--max-columns` is silently ignored by the `--json` printer.** Measured max output line
length while searching `node_modules` for `function`:

| invocation | longest line |
|---|---:|
| `--json` | **6,952,086 bytes** |
| `--json --max-columns 200` | **6,952,086 bytes** |
| `--json --max-columns 200 --max-columns-preview` | **6,952,086 bytes** |
| plain text `--max-columns 200` | 330 bytes |

Match counts are identical in every case (294,418), so nothing is dropped — the JSON printer
simply does not honour the flag. **`parser.ts` must impose its own cap**, windowing the line
around the first match with a leading `…`, shifting the highlight offsets by the same amount,
and marking the row truncated. This is why `maxLineChars` is in the input contract and why
the clamp happens in main **before the row crosses IPC**. Without it, one webpack bundle
allocates a 7 MB string per match line and the search view dies.

**`submatches[].start/end` are byte offsets, and the obvious fix is 41× too slow.**

```
line contains 'café';  byteStart 6 byteEnd 11
  naive text.slice(6, 11)  →  'café '   ← wrong
  byte-correct             →  'café'
```

Over one real result set (23,144 rg events, 6,365 match lines, 9,705 submatches, 719 lines
non-ASCII), the per-submatch `Buffer.from(text).subarray(0, start).toString().length` fix
costs **184.8 ms**; the single-walk converter costs **4.5 ms** — byte-identical output, zero
mismatches. Gating `subarray` behind an ASCII check does **not** help (201.8 vs 204.2 ms
end-to-end), and the reason is worth knowing: in this corpus the 719 non-ASCII lines average
**2,447 characters** (longest 306,438) against 69 for the ASCII ones, so they hold 1.76 MB of
the 2.15 MB of match text and get re-decoded twice per submatch. Use the single walk from
D3 §4.4, in main, once, before IPC.

### 2.8 Packaging

`electron-builder.yml` currently has `asarUnpack: ["**/*.node"]` — **which covers none of
this phase's assets.** Three additions, and the packaged-app smoke is the only thing that
will catch a mistake because `out/` passes without them:

```yaml
asarUnpack:
  - "**/*.node"
  - "**/@vscode/ripgrep-*/bin/*"          # the rg Mach-O is not a .node file
extraResources:
  - from: resources/gmux-tmux.conf        # existing
    to: gmux-tmux.conf
  - from: node_modules/@vscode/tree-sitter-wasm/wasm   # six grammars only, 4.8 MB
    to: tree-sitter
    filter: ["tree-sitter-{typescript,tsx,javascript,go,python,rust}.wasm"]
  - from: node_modules/web-tree-sitter/web-tree-sitter.wasm
    to: tree-sitter/web-tree-sitter.wasm
```

Ship **only** those six grammars. `@vscode/tree-sitter-wasm` also carries cpp (5.1 MB),
c-sharp (4.9 MB), ruby (2.0 MB), bash, java, php, powershell, css, ini and regex — roughly
14 MB for languages nobody in these repos writes.

Two further packaging facts, both measured:

- **Spawning `rg` from inside the asar works, and should not be relied on.** Electron's asar
  shim makes it work by **copying the whole 4,528,512-byte binary to
  `/tmp/.org.chromium.Chromium.XXXXXX`** on first spawn. Warm spawn overhead is small
  (3.2 vs 2.5 ms), so this is not a performance argument — it is a codesigning one: that
  temp copy is unsigned and will fail library validation the moment gmux moves to
  Developer ID + hardened runtime.
- The shipped `rg` is **ad-hoc / linker-signed** today (`Signature=adhoc`,
  `TeamIdentifier=not set`). Under a real identity it must be re-signed as a nested Mach-O,
  which electron-builder does automatically **only for files it has unpacked**. So the
  `asarUnpack` entry is required for correctness now and for signing later.

The `.scm` query files should be **inlined as TypeScript string constants**, not shipped as
files — five small strings, no `extraResources` entry, no runtime path resolution, no
packaged-app failure mode. (D3 offers both; this is the synthesis call.)

---

## 3. Measured benchmarks

Rig: Apple M4 Pro (12 cores / 8 performance), 48 GB, macOS 15.7.9, APFS SSD.
Content and UX numbers under Electron 43.3.0 / Node 24.18.1; the scorer bench under Node
22.23.1 / V8 12.4 (so treat those as a conservative floor). Medians after a discarded warm-up.

Corpora — all real, all read-only, all on this machine:

| repo | on disk | files (`.gitignore` respected) | files (`--no-ignore`, excl. `.git`) |
|---|---:|---:|---:|
| `/Users/gdc/gmux` | 1.5 GB | 312 | 23,089 |
| `/Users/gdc/specstory-sync` | 4.3 GB | 1,251 | 83,463 |
| `/Users/gdc/getspecstory` | 9.4 GB | 653 | 107,089 |
| `/Users/gdc/stoa` | — | 271,791 | — |
| path lists: `vscode` 17,645 · `k50` 50,000 · `DefinitelyTyped` 63,143 · `linux` 94,848 | | | |

### 3.1 Content search — time-to-first-result is flat; totals are not

| case | **ms@1** | ms@100 | ms@1k | ms@20k | total | stdout | peak RSS |
|---|---:|---:|---:|---:|---:|---:|---:|
| gmux · gitignore | **3.0** | 3.5 | 4.5 | — | 10.9 ms | 1.1 MB | n/a |
| sync · gitignore | **3.2** | 3.7 | 5.1 | 26.9 | 214 ms | 47 MB | 26 MB |
| gss · gitignore | **3.3** | 3.8 | 5.0 | 24.3 | 253 ms | 55 MB | 24 MB |
| gmux · `--no-ignore` | **3.3** | 3.5 | 4.7 | — | 871 ms | 64 MB | 134 MB |
| sync · `--no-ignore` | **2.9** | 3.3 | 6.7 | 51.5 | 2,496 ms | 308 MB | 164 MB |
| sync · `--no-ignore`, **cap 20k** | **2.8** | 3.1 | 4.6 | 70.6 | **72 ms** | 31 MB | **19 MB** |
| gss · `--no-ignore` | **3.7** | 4.6 | 6.8 | 42.9 | 4,749 ms | **990 MB** | 75 MB |
| gss · `--no-ignore`, **cap 20k** | **2.8** | 2.9 | 3.7 | 23.6 | **24 ms** | 4.6 MB | 12 MB |
| sync · gitignore, regex `export\s+(async\s+)?function\s+(\w+)` | 5.0 | 7.2 | 9.5 | — | 26 ms | 2.9 MB | 12 MB |
| sync · gitignore, `-A1 -B1` | 3.3 | 4.0 | 6.0 | 44.5 | 394 ms | 84 MB | 41 MB |

Read the first column, then the last. **Time-to-first-result never leaves the 2.8–5.0 ms
band** across a 43× spread in file count, a 6× spread in bytes, and regex vs literal. Totals
vary **400×**, and they are driven by *result volume*, not corpus size — the zero-match walk
of 4.3 GB costs 2,792 ms, and everything above that is the cost of formatting and parsing
matches. One query emitted **990 MB of JSON**.

Three design conclusions fall straight out, and all three are already in §2:

1. **Stream, and the first screenful lands in ~4 ms on any repo.**
2. **Cap hard, and the pathological case disappears** — 2,496 ms → 72 ms, RSS 164 → 19 MB.
   The cap is the primary performance mechanism, not a safety valve.
3. **Don't stream context lines** — `-A1 -B1` costs 214 → 394 ms and 47 → 84 MB. Fetch it
   lazily on expand via `search:context`.

`.gitignore` respect is worth **12–80×** (gmux 10.9 ms → 871 ms; sync 214 → 2,496; gss
253 → 4,749). Default to respecting it; make "search ignored files" a labelled toggle the
user pays for knowingly.

**Main-thread safety, measured** (4 ms sampling; 16.7 ms = one frame at 60 Hz), parsing the
4.3 GB unignored corpus:

| cap | wall | p50 lag | p95 | p99 | max | frames > 16.7 ms |
|---|---:|---:|---:|---:|---:|---:|
| 1,000 | 11 ms | 0.6 | 0.6 | 0.6 | 0.6 | **0** |
| **20,000** | 55 ms | 3.3 | **5.7** | 5.7 | 5.7 | **0** |
| uncapped (327k) | 2,217 ms | 0.6 | 11.9 | 22.4 | 34.1 | **9** |

**Cancellation:** SIGKILL 2.5 ms / **0 bytes after**; SIGINT 1.8 ms / 0; SIGTERM 2.6 ms /
**7,978 bytes after**; `stdout.destroy()` 4.1 ms.

**Full pipeline end-to-end** (rg → split → `JSON.parse` → row construction → offset
conversion), on specstory-sync:

| query | rg wall | matches | files | JSON stream | parse+rows+offsets | rows to IPC |
|---|---:|---:|---:|---:|---:|---:|
| `session`, ctx 0 | 16.6 ms | 6,365 | 451 | 4.0 MB | 17.9 ms | 2.84 MB |
| `session`, ctx 2 | 19.8 ms | 6,365 | 451 | 7.3 MB | 28.8 ms | 2.84 MB |
| `import`, ctx 2 | 17.0 ms | 3,092 | 608 | 3.7 MB | 15.0 ms | 2.21 MB |
| `the`, ctx 2 | 35.4 ms | 22,312 | 682 | 22 MB | 81.5 ms | 3.96 MB |

A typical query is **~40 ms end to end**; the pathological one is **~117 ms**. Both are
inside the 150 ms debounce, which means the user never sees a search start.

**Rejected alternatives, with the deciding number:** Node-native workers — 1.5–4.8× slower
total and **14–28× worse TTFR (42–86 ms vs 3 ms)**, and it returns only counts with
`.gitignore` unimplemented. SQLite FTS5 trigram — 3× the corpus on disk, ~4 s build,
543–639 ms to repair after a 25-file edit burst, and then **2.5–7.5× slower queries than
having no index at all** (1,244 ms vs 214 ms on sync). WASI `ripgrep@0.3.1` — 17× slower, no
PCRE2, unkillable in-process. ugrep 7.8.4 — faster on one case, weaker JSON protocol, and it
**disagrees with git** (482 files vs rg's 479). ast-grep 0.45.1 — 4× slower, 50 MB, no
substring mode. rg 15.2.0 hand-vendored — every delta inside run-to-run variance.

### 3.2 Quick open

**Enumeration** (median of 3, warm cache; TTFB = first path on stdout):

| method | olcp (11,885) | TTFB | stoa (271,791) | TTFB | correct file set? |
|---|---:|---:|---:|---:|---|
| **`rg --files`** | **16 ms** | **4 ms** | **157 ms** | **4 ms** | ✅ |
| `fd -t f --hidden -E .git` | 16 ms | 6 ms | 160 ms | 8 ms | ✅ |
| `git ls-files -co` | 28 ms | 26 ms | 343 ms | **299 ms** | ✅ (needs a repo) |
| `fast-glob **/*` | 163 ms | — | 339 ms | — | ❌ 120,506 / 303,447 |
| `tinyglobby **/*` | 125 ms | — | 199 ms | — | ❌ |
| `fs.readdir` recursive | 261 ms | — | 417 ms | — | ❌ |

`rg --files` wins every axis simultaneously, which almost never happens: fastest wall clock,
4 ms TTFB regardless of size, and the only one that honours nested `.gitignore`. The glob
libraries returned 10× too many files because they walked `node_modules`.

**Ranking quality** — 26 labelled cases ("a developer typed this, meaning that file") across
the vscode, linux and DefinitelyTyped trees:

| scorer | top-1 | top-5 | never found | MRR |
|---|---:|---:|---:|---:|
| fzf + `byLengthAsc`, whole list | **23** | 25 | 0 | **0.919** |
| gate 512 → fzf + `byLengthAsc` | **23** | 25 | 0 | 0.918 |
| **gate 512 → vendored VS Code scorer  ← ship (O1)** | 21 | **26** | 0 | **0.876** |
| command-score | 21 | 24 | 0 | 0.857 |
| fuzzysort alone | 21 | 24 | 0 | 0.855 |
| fzf, no tiebreaker | 14 | 21 | 2 | 0.651 |
| uFuzzy | 15 | 18 | **8** | 0.619 |

The gate is **lossless**: `gate 512 → fzf` matched whole-list fzf to three decimals, and a
stricter top-10 overlap audit (93.2% at 95k, 97.9% at 272k) shows every disagreement is pure
tie-group shuffling among identically-scored files. It is also **10–20× faster**
(0.9–13.6 ms p95 vs 19–137 ms at 95k).

This is VS Code's own architecture with a better gate. `AnythingQuickAccessProvider.MAX_RESULTS = 512`;
`fileSearch.ts` gates through `isFilePatternMatch` → `fuzzyContains` (an ordered-subsequence
boolean) and keeps **the first 512 in walk order, unranked**. Ours keeps the top 512 *by
score*. Same budget, strictly better recall.

**Budget at the backlog's stated 50,000-file target:**

| | measured |
|---|---|
| enumerate | ~40 ms, first path at 4 ms |
| index build + prewarm | 13 ms + 50 ms — **both before ⌘P is pressed** |
| memory | 45 MB heap (35 MB fuzzysort index @ ~0.7 KB/path, 4 MB strings, 2 MB maps) |
| keystroke, through the worker | **p50 4–13 ms, p95 5–29 ms** |
| worst single keystroke observed | 29 ms |
| refresh after an agent writes a file | ~100 ms background, or ≤0.5 ms via the delta |

**Prewarm is mandatory, not an optimisation.** fuzzysort's cost is lazy and lands on the
first `go()`: at 272k paths that is **322–384 ms**, i.e. the first keystroke. Enumerate and
prewarm on project open or first idle.

**Cap at 200,000 paths per project.** At 272k the index costs 234 MB, a 297 ms prewarm and a
540 ms refresh. The only local repo that reaches it is 268k `.specstory` history files — a
case better solved by excluding history than by paying for it.

### 3.3 Symbols

**Cold index, single-threaded** (`web-tree-sitter` 0.26.12 + `@vscode/tree-sitter-wasm` 0.3.1,
gmux queries):

| repo | files | MB | wall | files/s | symbols | index as JSON |
|---|---:|---:|---:|---:|---:|---:|
| gmux (TS/TSX) | 213 | 1.59 | **351 ms** | 607 | 1,793 | 178 KB |
| getspecstory (Go) | 285 | 3.15 | **453 ms** | 654 | 4,814 | 596 KB |
| specstory-sync (TS/TSX) | 645 | 7.18 | **806 ms** | 801 | 16,518 | 2.0 MB |

**Worker-pool scaling** (specstory-sync; worker boot including grammar load and query compile
is 39–94 ms and is *included*):

| workers | 1 | 2 | 4 | **6** | 8 |
|---|---:|---:|---:|---:|---:|
| wall | 823 ms | 474 ms | 407 ms | **300 ms** | 313 ms |
| files/s | 784 | 1,360 | 1,586 | **2,148** | 2,061 |

Six is the knee. Extrapolating: **a 50,000-file repo costs ~23 s of six-core CPU, once,
lazily, in the background** — and 1.25 ms per file thereafter.

**Query latency** over a columnar table (all names in one string blob + an `Int32Array` of
offsets, so N symbols cost one allocation rather than N objects):

| symbols | build | blob | `"op"` | `"openf"` | `"sess"` |
|---:|---:|---:|---:|---:|---:|
| 20,000 | 3 ms | 0.7 MB | 5.2 ms | 2.3 ms | 1.8 ms |
| 100,000 | 21 ms | 3.6 MB | 6.5 ms | 4.0 ms | 7.9 ms |
| 1,000,000 | 245 ms | 37.6 MB | 79.2 ms | 52.5 ms | 84.2 ms |

A realistic repo (≤5k files → ~100k symbols) answers in **4–8 ms**. Do not reach for a trie.

**The no-index design was measured and rejected.** Narrowing with ripgrep and parsing only
the candidates costs **340–650 ms per keystroke on a 645-file repo** — 1/77th of the target
size — because the survivors include a handful of very large files and it scales linearly.
Three-letter fragments are exactly what people type first. Keep the definition-shaped regex
anyway: it is the right *fallback while the index builds* (§4.4).

**Upstream `tags.scm` is not fit for purpose**, measured against 17 real gmux symbols:

```
FOUND requestOpenFile   MISS useEditor      MISS EditorMode     MISS SidebarViewId
FOUND tabIdFor          MISS MAX_TABS       MISS MARKDOWN_MODES FOUND openFromRequest
```

Five misses out of seventeen, and they are not exotic: **every TS `type` alias, every `enum`,
and every top-level `const`** — including `const useEditor = create(...)`, which is how every
store in this codebase is declared. The five gmux queries (verbatim in D3 §2.7) score
**17/17** on that probe and 20/20 extended, and find 1,638 distinct names in gmux against
the stock queries' 1,303. One Go fix alone — anchoring `const`/`var` to `source_file` —
cut local-variable noise from **926 to 83** on a 285-file Go repo.

**Bundle cost, on disk:** runtime `web-tree-sitter.wasm` 196 KB + `web-tree-sitter.cjs`
162 KB, grammars typescript 1,381 KB · tsx 1,412 KB · rust 1,088 KB · python 447 KB ·
javascript 402 KB · go 212 KB = **4.8 MB for six, 5.2 MB all in.**

---

## 4. UX specification

Modelled on VS Code, fitted to gmux's existing chrome, tokens and buses. Full detail in
D3 §4; this is the contract an implementer builds from.

### 4.1 Keyboard map

Three VS Code chords are already taken in gmux and cannot be used. This is the complete
delta, reconciled against `src/renderer/app/App.tsx:95-267` and `src/main/menu.ts`:

| chord | action | note |
|---|---|---|
| `⌘P` | Quick open (files). Empty query → recently opened. | free |
| `⌘⇧F` | Show + focus **Search**. Seed from a non-empty single-line editor/terminal selection. Pressed again inside the box: select-all, does not toggle away. | free |
| `⌘⇧H` | Search with the Replace field open and focused. | free |
| `⌘⇧O` | Palette in symbol mode: `@` (current file) if a tab is active, `#` (project) otherwise. | free |
| `F4` / `⇧F4` | Next / previous result, from anywhere, into the preview tab. | free (`F2` is rename) |
| `Esc` | Palette → close. Search box → clear query, else focus the results list, else the terminal. Extends the existing Esc ladder at `App.tsx:114`. | |
| `⌥⌘C` / `⌥⌘W` / `⌥⌘R` | case / whole word / regex — **only while focus is inside the Search view** | |
| `↑ ↓` | move selection. **Does not open.** | |
| `↩` | open into the **preview** tab; focus stays in the list | |
| `⌘↩` / double-click | open **pinned**, focus moves to the editor | |
| ~~`⌘T`~~ | **taken — New session.** VS Code's "go to symbol in workspace" is unavailable; `#` in the palette and ⌘⇧O are the substitutes. | |
| ~~`⌘J`~~ | **taken — Attention overlay.** VS Code's "toggle search details" is unavailable; use a disclosure chevron in the view. | |
| ~~`⌘F`~~ | **taken — Monaco's find widget.** Must not be repurposed. | |
| ~~`⌘G` / `⌘⇧G`~~ | **reserved, do not take.** `⌃⇧G` is Source Control; a `⌘G` "find next" would read as its sibling. | |

Two mechanical rules from `App.tsx`, both load-bearing:

- The renderer's capture-phase `keydown` runs **first**, ~5 ms before the native menu
  accelerator, and calls `preventDefault()`. Every chord that also gets a menu item must
  perform its action **exactly once** — the same discipline the file already documents for
  `show-scm` / `show-explorer`.
- The `inEditable` guard at line 182 is why ⌘-chords don't fire in text fields. The search
  box *is* a text field, so ⌘⇧F must be registered **above** that guard, alongside ⌘⇧E.

Add a native **Find** menu between Edit and Session mirroring all of the above plus *Undo
Replace in Files*, and a new "Search" group in `ShortcutsOverlay.tsx` (⌘/).

### 4.2 The Search view

New `SidebarViewId: 'scm' | 'explorer' | 'search'` (`src/renderer/state/store.ts:112`), new
activity-bar item between Explorer and Source Control, icon `search`, badge = result-file
count while a search is live (accent, **never amber** — amber is attention-only,
`ActivityBar.tsx:167`). Click-the-active-icon-to-collapse comes for free.

```
┌ view-header (36px) ─────────────────────────────────────────────┐
│ SEARCH                      [⟳ refresh] [⌫ clear] [⇱ collapse]  │
├─ query block ───────────────────────────────────────────────────┤
│ ▸ ┌───────────────────────────────────┐  Aa  ab|  .*            │  ▸ = replace disclosure
│   │ query                             │                         │
│   └───────────────────────────────────┘                         │
│   ┌───────────────────────────────────┐  ⇄  ⇄⇄                  │  (when ▾ open)
│   │ replace                           │                         │
│   └───────────────────────────────────┘                         │
│                                              …  ← details toggle│
│   files to include  [ src/**, *.ts            ]                 │
│   files to exclude  [ **/dist/**              ]  [⊘] use ignore │
├─ summary row ───────────────────────────────────────────────────┤
│ 412 results in 37 files                     ⚠ 3 files changed   │
├─ results (virtualized) ─────────────────────────────────────────┤
│ ▾ ⟨icon⟩ store.ts   src/renderer/editor            12           │
│      118   const MAX_TABS = 10;                                 │
│      389   if (tabs.length > MAX_TABS) {                        │
└─────────────────────────────────────────────────────────────────┘
```

- **Icons**: real codicons, all verified present in the installed `@vscode/codicons@0.0.46-24`
  — `case-sensitive`, `whole-word`, `regex`, `replace`, `replace-all`, `preserve-case`,
  `search-stop`, `clear-all`, `collapse-all`, `exclude`, `filter`, `ellipsis`. 20×20 icon
  buttons with `aria-pressed`, `--bg-active` fill when on, tooltip carrying the chord.
- **Row height 22 px** for both row types (denser than the tree's 24 px because a match row
  is one line of code). `--text-sm`/`--font-mono` for match text,
  `--text-base`/`--font-ui` for file names.
- **File row**: `FileIcon`, basename `--text-primary`, dirname relative to the repo root
  `--text-muted`, right-aligned count badge in `--bg-raised`, chevron toggles the group.
  Sticky while scrolling inside a group, matching the tree's `stickyFolders`.
- **Match row**: tabular line number in `--text-muted`, then the line with leading whitespace
  trimmed (**remember how much and shift the highlight offsets by the same amount**), matched
  span in `<mark class="search-hit">` with `--accent-wash` / `--accent-text`.
- **Virtualization is mandatory** — 10,000 rows will be routine. Reuse the `Virtualizer`
  already exported by `@pierre/diffs` (already in the bundle) or write ~60 lines of
  fixed-height windowing.
- **Stale badge, never auto-rerun** (§2.5).

### 4.3 States

| state | treatment |
|---|---|
| Idle | "Search across `<project>`" plus the three toggle meanings, `--text-muted`. No spinner. |
| Searching | 2 px indeterminate accent line under the query block; summary reads "Searching…" with a live count; `search-stop` replaces `refresh`. |
| No results | "No results found." plus, when filters are set, "3 include and 1 exclude filter are active — clear filters" as a link. VS Code's most common support question. |
| Invalid regex | Red hairline on the input, `--error` message with rg's own text. Do not run the search. |
| Capped | Sticky footer: "Showing the first 20,000 results. Show more". |
| Stale | Summary chip `⚠ 3 files changed · Refresh`. |
| Not a git repo | Search still works; the "use ignore files" toggle is disabled with a tooltip. |
| Symbol index building | Palette line indicator + "indexing 1,240 / 4,900 files"; fallback results shown meanwhile. |
| Unsupported language | Silent. The file contributes no symbols. Never say "language not supported". |

Accessibility: results are `role="tree"` / `role="treeitem"` with `aria-expanded` on file
rows; the summary is `aria-live="polite"` and announces the **final** count once, not during
streaming; every icon button carries an `aria-label` including its chord; `<mark>` so the
highlight survives high-contrast mode.

### 4.4 Quick open and symbols

Chrome: the `AttentionOverlay` (⌘J) family — backdrop, floating panel under the titlebar,
`role="listbox"`/`role="option"`, ↑↓/↩/Esc, footer key hints, `--z-modal`. Not a new
invention.

| input | mode |
|---|---|
| `foo/bar` | fuzzy file path in the active project |
| *(empty)* | recently opened editors (from `useEditor` tab history), then recent files |
| `:412` | go to line in the **active editor** |
| `foo.ts:412` | open `foo.ts` at line 412 |
| `@` | symbols in the **active file** — sorted by position, grouped by container, with a "sort by name" toggle |
| `#` | symbols in the **project** — sorted by fuzzy score |
| `>` | reserved. Show "Commands are not available yet", do not silently search for `>`. |

Scope is the **active project** by default; `⌘P` twice (or a header chip) widens to all open
projects, with a dimmed project name right-aligned on each row. Persist the choice per window.
gmux is multi-project and this is the one place that difference shows.

Symbol kind → codicon, all verified present: `function`/`method` → `symbol-method`
(`symbol-function` does **not** exist in the font — `symbol-method` is what VS Code itself
uses), `class` → `symbol-class`, `interface`/`type` → `symbol-interface`, `struct` →
`symbol-structure`, `enum` → `symbol-enum`, `enum-member` → `symbol-enum-member`, `constant`
→ `symbol-constant`, `variable` → `symbol-variable`, `field` → `symbol-field`, `module` →
`symbol-namespace`, `macro` → `symbol-keyword`, anything else → `symbol-misc`.

**Before the symbol index is warm:** the palette opens instantly, shows a 2 px indeterminate
line, and answers from the definition-shaped ripgrep prefilter (340–500 ms, no `container`),
replaced wholesale when the index lands. **Never make the user wait on a progress bar to
type.**

### 4.5 Opening a result

| gesture | request | focus afterwards |
|---|---|---|
| single click / `↩` on a match | `preview: true, selection` | **stays in the results list** |
| double-click / `⌘↩` | `preview: false, selection` | moves to the editor |
| `F4` / `⇧F4` from anywhere | `preview: true, selection` | wherever it was |
| `↑ ↓` in the list | nothing opens | list |
| quick-open / symbol pick with `↩` | `preview: false` | editor |

Arrowing does **not** open. With 10,000 results, the difference between "arrow through 40
rows" and "load 40 files" is the difference between a usable list and a stuttering one.

The store already implements VS Code's preview semantics (`store.ts:113-127, 324-413`): one
preview tab reused until edited or pinned; a second open of the same tab within 500 ms pins
it. Search inherits it unchanged. The tree already uses `openRel(rel, keep)` with `keep` true
on double-click (`FileTree.tsx:358-364`) — **search must not invent a second convention.**

### 4.6 Context menus, and the free Explorer win

Native only, via the existing `ui:popupMenu` bridge (CLAUDE.md UI rules — no DOM-drawn menus).
Match row: Open, Open to the Side *(disabled v1)*, ─, Copy, Copy Path, Copy All Matches in
File, ─, Dismiss, ─, Replace *(when replace is open)*. File row: Open File, Reveal in
Explorer, Reveal in Finder, ─, Copy Path, Copy Relative Path, ─, Dismiss All Matches, Replace
All in File.

**"Reveal in Explorer" and Explorer type-to-filter are ~20 lines, not features.**
`@pierre/trees` already ships a search-session API that gmux currently disables —
`openSearch()`, `setSearch()`, `focusNextSearchMatch()`, `closeSearch()` and
`scrollToPath(path, { focus, offset })`
(`node_modules/@pierre/trees/dist/model/publicTypes.d.ts:120`,
`render/FileTree.d.ts:36-43`); `src/renderer/tree/FileTree.tsx:366` notes search and rename
are "disabled here". Turn search on and wire `scrollToPath` as the reveal primitive.

One limit to state plainly in the UI: gmux loads directories lazily through `fs:readDir`, so
the tree only knows the paths it has expanded. **Tree filter is a filter over what is on
screen. Deep file search is ⌘P's job over the full list.** Do not let one masquerade as the
other.

---

## 5. Scope: v1 versus deferred

### 5.1 Replace-in-files — **in**, scoped

The backlog says "if it falls out cheaply and safely". It does, because **the preview is free
from the engine already chosen**. `rg --json -r <replacement>` emits, per submatch, both the
original and the replacement, with `lines.text` still the original line:

```json
{"type":"match","data":{"lines":{"text":"const café = \"naïve\"; // café\n"},
  "line_number":1,"absolute_offset":0,
  "submatches":[{"match":{"text":"café"},"replacement":{"text":"coffee"},"start":6,"end":11},
                {"match":{"text":"café"},"replacement":{"text":"coffee"},"start":27,"end":32}]}}
```

So the same stream that paints the results paints the preview — original struck through in
`--git-deleted`, replacement inserted after it in `--git-added`. No second engine, no second
pass, no diffing. That is the whole argument for "in".

Apply, per file: `stat` and **skip if `mtimeMs`/`size` differ from what the search saw**
("changed on disk since the search") — agents write files in this app, so this check is not
optional; skip if an editor tab for that path is dirty ("unsaved changes in the editor");
read as a `Buffer`; compute absolute byte ranges from `absolute_offset + submatch.start/end`;
splice **back to front** so earlier offsets stay valid; keep the pre-image; write via
temp-file-plus-`rename` in the same directory, preserving mode.

Refuse the whole operation when the query is empty, **when the search was capped** (you would
silently replace only the first 20,000), or when any path escapes `repoPath`. Always confirm
through the existing three-answer `ConfirmDialog` (`useApp.setConfirm`): *"Replace 412
occurrences across 37 files?"* → **Replace All** / **Preview Changes** / Cancel.

Undo that is honest: pre-images in a `Map<string, Buffer>` under one token, capped at 64 MB
then spilling to `userData/replace-undo/<token>/`; **exactly one token retained**; restore
only if the file's `mtimeMs`/`size` still match what the replace wrote, otherwise **refuse by
name**; token dropped on quit. The real safety net is one panel to the left — Source Control
lights up with every changed file and `git checkout --` is a right-click away. Say so in the
confirm dialog body rather than pretending the in-app undo is a transaction log.

**Out of v1 replace:** live tree mutation after apply (re-run the search and repaint; it
costs 40 ms), preserve-case (ship the toggle disabled with a "not yet" tooltip or omit it —
do not fake it), and multi-project replace. Regex capture groups in the replacement are **in**
only to the extent ripgrep's `-r` already does them (`$1`, `${name}`), because that is free.

### 5.2 Structural search — **deferred**, with a 30-line escape hatch

**Comby: rejected outright.** Apache-2.0 and a genuinely nice matcher, but the last release
is **1.8.1 on 2022-06-28** — four years — and there is **no Node binding**: the `comby`
package on npm is an unrelated 2016 squat with one version, and `comby-js` / `@comby/comby`
404. Using it means bundling and signing an OCaml Mach-O.

**ast-grep: healthy, and still not worth bundling for this app.** 15,468 stars, 0.45.1 three
days ago, MIT, and the fastest thing measured. The costs are a native `.node`, a per-language
prebuilt `parser.so` loaded through a `@experimental`-marked `registerDynamicLanguage()`, and
`dlopen` of unsigned third-party Mach-O objects — which fails under the hardened runtime
unless every `.so` is re-signed with the app's Team ID or the app ships
`com.apple.security.cs.disable-library-validation`. `electron-builder.yml:1-9` already records
that signing is a deferred pass. That is a bad trade for a feature whose audience is power
users.

And the punchline that belongs in the UI: **gmux is a terminal multiplexer.** If `sg` or
`ast-grep` is found by the existing Phase 10 detection resolver
(`src/main/agents/detection.ts` — reuse it, do not write a second PATH probe), the Search
view's overflow menu gains **"Search structurally with ast-grep…"**, which opens a new gmux
session in the project root pre-typed with `sg run -p '' -l ts`, cursor inside the quotes.
Not detected → the item is simply absent. No nag, no installer, zero bundle cost.

Revisit only if ast-grep publishes wasm or statically-linked language support **and** the
escape hatch shows real use. Record the decision in `docs/BACKLOG.md` so it is not
re-litigated every phase.

### 5.3 Symbols — **in v1, last, with a go/no-go** (O4)

Why they earn their weight: they are the only way to answer "go to symbol in project"; the
measured index cost is affordable (300–800 ms on the real repos here, ~23 s worst case at
50k, lazily, never on project open, then 1.25 ms per changed file); query latency is 4–8 ms
at realistic scale; and the pure-WASM delivery costs **zero native code and zero signing
work**, which is the thing that killed every alternative.

Lifecycle, which is where the "no daemon that burns battery" constraint is honoured:

1. **Never on project open.** Building an index nobody asked for is exactly the burn the
   constraint forbids.
2. **First ⌘⇧O (or first `#` in ⌘P) for a project** triggers the build. The palette opens
   immediately and answers from the ripgrep fallback until the index lands.
3. **Persist** to the existing better-sqlite3 database (new `symbol_index` table; follow the
   house pattern in `src/main/manifest/store.ts`), keyed by `(repoPath, relPath, mtimeMs, size)`.
   On next launch, re-`stat` and re-parse only the drifted files. Do **not** persist the
   columnar blob — rebuild it from rows at load (245 ms for a million).
4. **Incremental** from the watcher bus, 300 ms debounce.
5. **Evict** the in-memory table when the last window for a project closes or after 30 minutes
   with no symbol query. The SQLite copy survives.

**The go/no-go, checked in the packaged build before symbols are called done:**

- the packaged app resolves the six `.wasm` grammars from `process.resourcesPath` and answers
  a `#` query — this is where a missing `extraResources` entry surfaces and `out/` will not
  catch it;
- cold index of `/Users/gdc/specstory-sync` completes in **< 1 s** (measured: 300 ms at six
  workers — this is a regression tripwire, not a stretch goal);
- the ⌘⇧O regression set passes: `useEditor`, `EditorMode`, `MAX_TABS`, `MARKDOWN_MODES`,
  `openFromRequest` all present with correct kinds. These are precisely the symbols upstream
  `tags.scm` misses.

If any fails and cannot be fixed inside the phase, ship content search + quick open + replace
and carry symbols to Phase 15. Nothing else depends on them.

### 5.4 Deferred with reasons, one line each

| deferred | reason |
|---|---|
| Indexed content search (FTS5 / Orama / Tantivy) | Measured **slower than no index** — 1,244 ms vs 214 ms — at 3× disk and 4 s to build. It loses on both axes at once. |
| LSP for symbols | A resident indexing daemon per language per project, on a laptop, next to running agents. `SymbolHit` is deliberately LSP-shaped so the door stays open. |
| `@ff-labs/fff-node` | Fast (95k files in 156 ms) and MIT, but it **silently skips hidden paths** — `.claude/`, `.specstory/`, `.github/` invisible in ⌘P — has no relevance floor (`editor` "matched" 55,102 files, ranking `.DS_Store` first), and adds a signed `.dylib` + `ffi-rs`. Worth an upstream issue for a `hidden` flag; revisit if it lands. |
| `fzf` reranking | O1. Revisit if ranking complaints appear in daily use. |
| Open to the Side | No split-editor model yet. Menu item present and disabled. |
| Command palette (`>`) | Not this phase. Reserve the prefix and say so. |
| Search history / saved searches | No evidence of need yet. |

---

## 6. Build order and acceptance

Each step independently shippable, in dependency order:

1. **Bus + reveal** — `OpenFileSelection`, `pendingSelection`, the `MonacoHost` reveal/flash,
   the focus gate. Unit test + one manual jump. *Nothing else can be verified without this.*
2. **Watcher fan-out** (`src/main/watcher/bus.ts`, O3) — behaviour-preserving, git keeps
   working identically.
3. **Search view shell** — activity-bar item, `SidebarViewId`, header band, query block,
   toggles, empty state. No engine.
4. **Content search** — `resolve.ts`/`args.ts`/`parser.ts`/`engine.ts`, the streaming
   protocol, caps, the `toUtf16` converter, the line clamp; virtualized results tree; open
   semantics; F4/⇧F4.
5. **Quick open** — resident worker, `rg --files`, fuzzysort snapshot + prewarm, the vendored
   scorer, delta, frecency, palette chrome, `:line`, recents, multi-project chip.
6. **Symbols** — worker pool, the five queries, columnar store, SQLite persistence, watcher
   invalidation, `@`/`#`, ⌘⇧O, the ripgrep fallback. Behind §5.3's gate.
7. **Replace** — disclosure, preview from `-r`, confirm, apply, one-shot undo.
8. **Explorer type-to-filter** — wire `@pierre/trees`' `openSearch()`. ~20 lines.

**Acceptance, phrased for the operator's seat:**

- ⌘P on `/Users/gdc/gmux`, type `openfil` — `state/open-file.ts` is the top hit in under
  100 ms; ↩ opens it pinned; the Explorer reveals it.
- ⌘⇧F, type `MAX_TABS` — results paint in one frame; the summary reads "N results in M
  files"; ↩ opens `store.ts` in an italic preview tab scrolled to line 118 with the match
  flashed; **focus is still in the results list**; ↓ then ↩ reuses the same preview tab.
- ⌘⇧F, type `e` then keep typing to `editor` — no frozen frame at any point, and no results
  from an abandoned query ever appear.
- ⌘⇧F with a regex containing a non-ASCII literal (`caf.`) against a UTF-8 file — the
  highlight lands exactly on the match, not one character to the left.
- ⌘⇧F in a repo containing a minified bundle — no row is longer than ~2,000 characters and
  the view stays responsive.
- ⌘⇧O in `store.ts` — `useEditor`, `EditorMode`, `MAX_TABS`, `MARKDOWN_MODES`,
  `openFromRequest` all present with correct kinds.
- ⌘⇧O with `#` on `/Users/gdc/getspecstory` — Go methods appear as
  `StatisticsCollector.AddSessionStats`, struct fields appear, function-local `var`s do **not**.
- Type in the Search box while an agent session writes files — results do not jump; the stale
  chip appears; clicking Refresh re-runs.
- Replace `MAX_TABS` → `TAB_LIMIT` in gmux — preview shows strike-through plus insertion;
  confirm reports the counts; Source Control shows the changed files; Undo restores them; a
  second Undo is unavailable.
- **`npm run package`, then repeat two of the above in the packaged app.** This is where a
  missing `asarUnpack` entry for `rg` or a missing `extraResources` entry for the `.wasm`
  grammars surfaces. `out/` will not catch either.

Unit tests worth writing (the cases manual testing will not find): `toUtf16` against a table
of UTF-8 fixtures; the line clamp with offset shifting; zero-submatch match lines (a known
upstream rg quirk VS Code works around by synthesising a 1-char submatch); `{bytes: base64}`
instead of `{text}` for invalid UTF-8; non-null `end.binary_offset`; glob translation for
include/exclude; the "most-specific-kind wins" symbol dedupe; `tabIdFor` unchanged with a
selection present; the replace splice applied back-to-front.

---

## 7. Risks, and what is not verified

### 7.1 `fuzzysort@4.0.1` is zero days old

Published **2026-08-10 18:21 UTC** — during this research. `4.0.0` was the day before. The
recommendation depends specifically on v4's **`snapshot()`**, which does not exist in v3.

- **Mitigation, pin:** `"fuzzysort": "4.0.1"` exactly. Re-test on any upgrade.
- **Mitigation, fallback:** `3.1.0` (2024-10-14, MIT, mature) is a drop-in for everything
  except `snapshot()`. Measured cost of dropping back: **5× the query latency and 1.5× the
  memory at 272k** (52 ms vs 10 ms, 430 MB vs 280 MB). At the backlog's 50k target that
  degradation still lands inside budget, which is what makes the risk survivable rather than
  blocking. If v4 misbehaves, drop to v3 and lose nothing the user can feel at 50k.
- **Mitigation, exit:** the gate is one module behind one interface. The all-JS packed-buffer
  subsequence gate (17.2 MB at 272k, built in 50 ms, scanned in 2.4–11.7 ms) is documented in
  D2 §3.5 as the zero-dependency escape, at the cost of handing an unranked survivor set to
  the reranker.

### 7.2 The rest, ranked

| risk | mitigation |
|---|---|
| **Packaging.** `asarUnpack` covers `**/*.node` only. Miss the `rg` entry or the `.wasm` grammars and the packaged app breaks while `out/` passes. | §2.8's three entries + the packaged-app acceptance check. Non-negotiable. |
| **Hardened runtime.** `rg` is ad-hoc signed today (`Signature=adhoc`, `TeamIdentifier=not set`) and spawning from inside the asar temp-copies an unsigned 4.5 MB Mach-O to `/tmp`. Both break under Developer ID + hardened runtime. | `asarUnpack` fixes the temp-copy today and makes electron-builder re-sign the nested binary when the signing pass lands. Flagged for whoever does that pass. |
| **`@vscode/ripgrep` is ESM-only.** gmux's main is CJS. | Verified working via `require(esm)` in real Electron 43.3.0 / Node 24.18.1. If it ever regresses, the whole wrapper is a 3-line path resolver we can inline. |
| **We now own 275 lines of vendored VS Code scorer** (O1) — no upstream updates, no dependabot. | It is a pure function with a labelled 26-case quality suite. Keep the suite as a vitest fixture; that is the maintenance contract. |
| **Symbol queries are five hand-authored `.scm` files** that must track grammar changes in `@vscode/tree-sitter-wasm`. | The 17-symbol probe becomes a unit test. A grammar bump that breaks a pattern fails CI, not the user. |
| **`@vscode/tree-sitter-wasm@0.3.1` is 4 months old** and grammar versions are Microsoft's choice. | All six needed grammars are present today. A grammar we ever need but they don't ship would mean building wasm ourselves — none of the five target languages is in that position. |
| **200k path cap** silently truncates ⌘P on a giant repo. | One-line "indexing the first 200,000 of N files" note, and content search still covers the rest. |
| **20k result cap** silently truncates ⌘⇧F. | Sticky footer + "Show more" that re-runs with a higher cap; replace **refuses** on a capped search. |
| **Watcher may be `null`** for a project that never took a `git:*` call (§2.5). | Time-based staleness fallback: re-enumerate on palette open if the index is older than 30 s. |
| **Three parallel workflows are editing `src/**`** right now; this spec proposes edits to `open-file.ts`, `store.ts`, `MonacoHost.tsx`, `App.tsx`, `menu.ts`, `git/ipc.ts`, `shared/ipc.ts`, `electron-builder.yml`. | Every one is additive (`src/shared/*` is append-only during parallel builds). The `git/ipc.ts` fan-out is the only behavioural touch and it is two lines. Integrator reconciles. |

### 7.3 Not verified — say so plainly

- **Nothing here was measured inside the real gmux UI under load.** The Electron checks were
  load/spawn tests, and the latency numbers came from Node harnesses. Time-to-first-*paint*
  in the actual renderer, with virtualization and React 19 reconciliation in the loop, is
  **unmeasured**. Everything upstream of the paint is fast enough that this is very likely
  fine, but it is an assumption, and step 4 of the build order is where it gets tested.
- **The 50,000-file target was never measured on a real 50k repo on this machine.** After
  `.gitignore`, the three named repos are 312 / 653 / 1,251 files. `k50` is the first 50,000
  paths of the linux tree, and `/Users/gdc/stoa` (271,791) is real but is 268k `.specstory`
  history files, not source. The 50k numbers are therefore *representative of path count*,
  not of a real 50k-file source repo's directory shape or file sizes.
- **~23 s to index 50k files for symbols is extrapolated**, not measured — from 2,148 files/s
  on a 645-file repo. Larger repos have larger files; treat it as a lower bound.
- **The frecency design is unimplemented and unmeasured** beyond "the lookup and tier bonus
  cost ≤0.1 ms over 512 candidates". Whether a half-life of a few days feels right is a
  judgement call that needs daily use.
- **Multi-project quick open** is specified as "one snapshot per root, query each, merge by
  score" and the per-root costs are measured, but the merged-ranking *quality* across roots
  was not evaluated.
- **The replace apply path was designed, not built.** The preview is verified from real rg
  output; the back-to-front splice, the mtime guard and the undo store are specification.
- Two environment notes for anyone re-running the harnesses: the research sandbox blocks
  **asynchronous** child processes from Node (`spawn` and `promisify(execFile)` hang;
  `execFileSync` works), which is why parts of the harness are synchronous — it is not a
  constraint on the app. And `@vscode/tree-sitter-wasm` bundles its own older
  `tree-sitter.wasm` runtime; let `Parser.init()` load the runtime from `web-tree-sitter`
  itself or you get `ENOENT: web-tree-sitter.wasm`.

---

## 8. Where the evidence lives

| | |
|---|---|
| Dimension docs | [`19-search-d1-content-engine.md`](./19-search-d1-content-engine.md) · [`19-search-d2-fuzzy-file-path.md`](./19-search-d2-fuzzy-file-path.md) · [`19-search-d3-code-aware-ux.md`](./19-search-d3-code-aware-ux.md) |
| Vendored scorer (copy this, don't re-derive) | `docs/research/assets/phase14/vscode-fuzzy-scorer-extract.mjs` |
| D1 + D2 harnesses | `…/scratchpad/` and `…/scratchpad/bench/` — `final-bench.mjs`, `bench-capped.mjs`, `node-search.mjs`, `fts5-bench.mjs`, `loop-lag.mjs`, `cancel-test.mjs`, `quality.mjs`, `hybrid2.mjs`, `gate.mjs`, `mem3.mjs`, `list-bench.mjs`, `e2e.mjs`, `refresh.mjs`, `worker-bench.mjs`, `fff-*.mjs`, `corpora/*.txt` |
| D3 harness | `…/scratchpad/p14/` — `probe.mjs`, `bench-symbols.mjs`, `bench-pool.mjs`, `bench-hybrid.mjs`, `bench-fuzzy.mjs`, `bench-rgparse.mjs`, `bench-conv.mjs`, `probe-lang.mjs`, `tags-gmux/`, `etest/` |

Scratchpad is
`/private/tmp/claude-501/-Users-gdc-gmux/ecc455c7-2dc3-4598-9927-35e8f3a31c15/scratchpad/`
and will be reaped. Copy anything worth keeping into `docs/research/assets/phase14/` before
Phase 14 starts — the scorer extract is already saved; the labelled 26-case quality set is
the other thing worth rescuing, because it is the regression suite for O1.
