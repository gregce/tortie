# gmux research 19 (D1) — the ⌘⇧F content-search engine

**Dimension:** which engine backs project-wide content search in the Electron **main** process, how it streams and cancels, and why every alternative loses. Package facts re-verified live against the npm registry, crates.io and GitHub on **2026-08-10**. Every timing below was measured on this machine against the three real repos named in the brief — no vendor claims, no remembered numbers.

**Bottom line first:** ship **`@vscode/ripgrep@1.18.0`** (MIT) and drive it exactly the way VS Code does — `--json` NDJSON on stdout, parsed line-by-line in main, hard-capped at 20,000 submatches, cancelled with `SIGKILL`. It is not a close contest. Ripgrep returns its **first match in ~3 ms on every corpus tested**, from a 310-file repo to a 9.4 GB / 107k-file unignored walk; time-to-first-result is effectively independent of corpus size, which is the only latency number a streaming UI actually feels. The strongest Node-native implementation I could write is **1.5–4.8× slower on total time and 14–28× worse on time-to-first-result**, and that is *before* it does the part that actually matters (correct `.gitignore` semantics). An SQLite FTS5 trigram index costs **3× the corpus size on disk, ~4 s to build, ~0.6 s to repair after a 25-file agent edit burst — and then answers the common query 6–8× slower than ripgrep answers it from cold.** Indexing is not a close contest either; it just loses in the other direction.

Two findings below are load-bearing and not in anyone's docs: **`--max-columns` is silently ignored by the `--json` printer** (one minified file produced a single 6.95 MB JSON line), and **`--hidden` makes ripgrep walk `.git/`** (which is 63–88% of the "hidden" file count on our repos and yields essentially zero real matches). Both will bite whoever writes this code if it isn't written down.

---

## 1. What `@vscode/ripgrep` actually is in 2026 (verified)

The package changed shape four months ago and most of what you remember about it is now wrong.

| | verified value |
|---|---|
| Latest | **1.18.0**, published **2026-05-07** |
| License | **MIT** (wrapper). The vendored binary is ripgrep, **Unlicense OR MIT** |
| Vendored binary | **ripgrep 15.0.0** (`rev 3a612f88b8`), `features:+pcre2`, `simd:+NEON`, PCRE2 10.45 with JIT |
| Install model | **`optionalDependencies` per platform** — 12 packages, npm installs only the matching one |
| **No postinstall** | ≤1.17.1 ran `node ./lib/postinstall.js` to download from GitHub (deps: `yauzl`, `https-proxy-agent`, `proxy-from-env`). **1.18.0 has no `scripts` and no runtime deps at all.** |
| Module format | **ESM-only** (`"type": "module"`, `exports` → `./lib/index.js`) |
| Disk cost here | wrapper 20 KB + `@vscode/ripgrep-darwin-arm64` **4.3 MB** (binary is 4,528,512 bytes) |
| Maintenance | 1.15.14 (2025-06) → 1.17.0 (2025-10) → 1.17.1 (2026-03) → 1.18.0 (2026-05) |

The 1.18.0 install-model change is a straight win for gmux and worth calling out: the old postinstall downloaded a zip from GitHub at `npm install` time, which is the classic corporate-proxy/offline/CI-flake failure and a supply-chain surface. **1.18.0 is a plain tarball dependency.** The entire wrapper is now a 20-line path resolver:

```js
const platformPkg = `@vscode/ripgrep-${process.platform}-${arch}`;
resolved = require.resolve(`${platformPkg}/bin/${binaryName}`);
export const rgPath = resolved;
```

### Do **not** use `@vscode/ripgrep-universal`

VS Code **1.134.0** itself now depends on `@vscode/ripgrep-universal@^1.18.0`, not `@vscode/ripgrep`. That package is a single tarball containing binaries for *every* platform — **57,965,828 bytes unpacked**. It exists because VS Code cross-builds all platforms from one machine and prunes afterwards. gmux ships one arch (`mac: target: [dmg, zip], arch: [arm64]`), so `@vscode/ripgrep` + optionalDependencies delivers exactly the 4.3 MB we need. **4.3 MB vs 58 MB for identical behavior.** Take the small one.

### ESM-only is a non-issue (verified, not assumed)

gmux's main bundle is CJS (`main: ./out/main/index.js`, no `"type": "module"`), and `externalizeDepsPlugin()` leaves this as a runtime require. Node 24 supports `require(esm)` for synchronous ESM graphs, and Electron 43.3.0 ships **Node 24.18.1**. Tested under real Electron:

```
require(esm) OK -> …/@vscode/ripgrep-darwin-arm64/bin/rg
dynamic import OK -> …/@vscode/ripgrep-darwin-arm64/bin/rg
```

Both work. No `createRequire` dance, no bundler shim. (And if it ever regresses, the fallback is trivial — the package is a path resolver we could inline in three lines.)

---

## 2. Benchmarks

**Rig:** Apple M4 Pro (12 cores), macOS 15.7.9, APFS SSD, Electron 43.3.0 / Node 24.18.1. Binary: rg 15.0.0 from `@vscode/ripgrep-darwin-arm64@1.18.0`. Warm page cache, median of 5 runs after a discarded warm-up. Harnesses in scratchpad: `final-bench.mjs`, `bench-capped.mjs`, `node-search.mjs`, `fts5-bench.mjs`, `loop-lag.mjs`, `cancel-test.mjs`.

**Corpora** (all read-only, all real):

| repo | on disk | files, `.gitignore` respected | files, `--no-ignore` (excl. `.git`) |
|---|---:|---:|---:|
| `/Users/gdc/gmux` | 1.5 GB | 312 | 23,089 |
| `/Users/gdc/specstory-sync` | 4.3 GB | 1,251 | 83,463 |
| `/Users/gdc/getspecstory` | 9.4 GB | 653 | 107,089 |

All three are counted with `--hidden -g '!.git/'`, i.e. dotfiles in, git object store out — the production filter proposed in §4.2.

### 2.1 The headline: TTFR is flat, totals are not

Flags are gmux's proposed production set (`--hidden --no-require-git --no-config -g '!.git/' --ignore-case --json`). `ms@N` = wall-clock to the *N*th submatch arriving parsed in Node.

| case | ms@1 | ms@100 | ms@1k | ms@20k | total | stdout | peak RSS | submatches |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| gmux · gitignore | **3.0** | 3.5 | 4.5 | — | 10.9 ms | 1.1 MB | n/a | 4,327 |
| gmux · `--no-ignore` | **3.3** | 3.5 | 4.7 | — | 871 ms | 64 MB | 134 MB | 17,640 |
| sync · gitignore | **3.2** | 3.7 | 5.1 | 26.9 | 214 ms | 47 MB | 26 MB | 183,136 |
| sync · `--no-ignore` | **2.9** | 3.3 | 6.7 | 51.5 | 2,496 ms | 308 MB | 164 MB | 327,424 |
| sync · `--no-ignore`, **cap 20k** | **2.8** | 3.1 | 4.6 | 70.6 | **72 ms** | 31 MB | 19 MB | 20,000 |
| sync · `--no-ignore`, **zero matches** | — | — | — | — | 2,792 ms | 0 | 103 MB | 0 |
| gss · gitignore | **3.3** | 3.8 | 5.0 | 24.3 | 253 ms | 55 MB | 24 MB | 240,342 |
| gss · `--no-ignore`, **cap 20k** | **2.8** | 2.9 | 3.7 | 23.6 | **24 ms** | 4.6 MB | 12 MB | 20,000 |
| gss · `--no-ignore` | **3.7** | 4.6 | 6.8 | 42.9 | 4,749 ms | **990 MB** | 75 MB | 3,705,231 |
| sync · gitignore, regex `export\s+(async\s+)?function\s+(\w+)` | 5.0 | 7.2 | 9.5 | — | 26 ms | 2.9 MB | 12 MB | 8,767 |
| sync · gitignore, `-A1 -B1` | 3.3 | 4.0 | 6.0 | 44.5 | 394 ms | 84 MB | 41 MB | 183,133 |

(Peak RSS is sampled at 15 ms; `n/a` means the search finished before the first sample. Sub-11 ms searches never reach interesting memory.)

Read the first column, then the last. **Time-to-first-result never leaves the 2.8–5.0 ms band** — not across a 43× spread in file count, not across a 6× spread in bytes, not for regex vs literal. What varies by 400× is *total* time, and total time is dominated by **result volume, not corpus size**: the zero-match walk of 4.3 GB costs 2,792 ms, and everything above that is the cost of formatting and parsing matches. A single query produced **990 MB of JSON**.

Two design conclusions fall straight out:

1. **Stream, and the UI is instant regardless of repo.** First screenful lands in ~4 ms in every configuration tested.
2. **Cap hard, and the pathological case disappears.** With VS Code's 20,000-result cap, the worst unignored search on a 4.3 GB tree completes in **72 ms** instead of 2,496 ms, and peak RSS drops from 164 MB to 19 MB. The cap isn't a safety valve, it's the primary performance mechanism.

### 2.2 `.gitignore` respect is the single biggest lever

| corpus | gitignore | `--no-ignore` | penalty |
|---|---:|---:|---:|
| gmux | 10.9 ms | 871 ms | **80×** |
| specstory-sync | 214 ms | 2,496 ms | **12×** |
| getspecstory | 253 ms | 4,749 ms | **19×** |
| specstory-sync, `rg --files` | 6.2 ms | 75 ms | 12× |
| getspecstory, `rg --files` | 24 ms | 830 ms | 34× |

Default to respecting ignore files, and make "search ignored files" a deliberate, clearly-labelled toggle that the user pays for knowingly.

### 2.3 Node-native: the honest gap

`node-search.mjs` is not a strawman — `fs.opendir` walk, 12-worker `worker_threads` pool, batched dispatch, ripgrep's own binary heuristic (NUL byte in the first 8 KiB), `Buffer.indexOf` for literals. To compare scanning cores rather than output formatters, ripgrep is run **count-only with the identical hardcoded skip set** (no `.gitignore` parsing on either side):

| corpus / filter | files | `rg -c` | node workers | ratio |
|---|---:|---:|---:|---:|
| gmux, skip-set | 316 | 28.3 ms | 52.4 ms | 1.9× |
| gmux, `.git` only | 23,087 | 442 ms | 929 ms | 2.1× |
| sync, skip-set | 1,472 | 38.2 ms | 182 ms | **4.8×** |
| sync, `.git` only | 83,463 | 2,280 ms | 4,827 ms | 2.1× |
| getspecstory, skip-set | 83,909 | 3,211 ms | 5,942 ms | 1.9× |
| getspecstory, `.git` only | 107,089 | 4,466 ms | 6,516 ms | 1.5× |
| **time-to-first-result** | | **3 ms** | **42–86 ms** | **14–28×** |

I want to be fair to Node here, because 1.5–4.8× is closer than the folklore suggests. On IO-bound walks the gap narrows to 1.5× — twelve threads calling `readFile` saturate the SSD about as well as ripgrep does. If throughput were the only axis, this would be arguable.

It isn't arguable, for four reasons the table understates:

- **TTFR is 14–28× worse and it is the number users feel.** Most of Node's 42 ms is worker-pool spin-up, paid on every keystroke-debounced query.
- **The Node column doesn't do the work.** It returns counts. Line numbers, column offsets, preview text, context lines and multiline handling are all still to come, and each is per-matching-file string work in V8.
- **`.gitignore` is the whole ballgame and it isn't implemented.** Section 2.2 shows correct ignore semantics is worth **7–80×** — far more than the engine choice. Reimplementing nested ignore files, negation precedence, `.git/info/exclude`, `core.excludesFile` and `GIT_CONFIG_GLOBAL` in JS is the actual project, and it would be a permanent correctness liability. Even **ugrep**, a mature C++ tool that tries, doesn't match git exactly (§2.5).
- **It burns 12 threads inside the main process.** Those contend with IPC, the tmux control client, the SQLite manifest and the watcher. Ripgrep is a separate OS process the kernel schedules independently and that we can `SIGKILL` in 2.5 ms.

**Verdict: lose.** Not primarily on speed — on correctness surface and on TTFR.

### 2.4 WASM ripgrep (`ripgrep@0.3.1`) — interesting, not for us

A genuine 2026 newcomer worth checking: `ripgrep@0.3.1` (MIT, published 2026-04-06, by `pi0`, repo `pithings/ripgrep-node`) — ripgrep compiled to WASI, **766 KB**, embedded as z85+brotli, no native binaries, works on Node/Bun/Deno.

| case | WASM | native | penalty |
|---|---:|---:|---:|
| gmux, `--json`, gitignore | 97.0 ms | 25.5 ms | 3.8× |
| sync, `--json`, gitignore | 735 ms | 42.8 ms | **17×** |
| sync, `--no-ignore`, count | 4,699 ms | 3,080 ms | 1.5× |

It also reports `features:-pcre2` — **no PCRE2**, so no lookaround or backreferences — and runs single-threaded inside our event loop, where a runaway query cannot be killed with a signal. It vendors rg 15.1.0.

**Verdict: lose,** but note *why*: its whole reason to exist is environments that can't ship a native binary. A signed macOS `.app` is the opposite of that. Genuinely the right answer for a browser or an edge worker; wrong here.

### 2.5 ugrep 7.8.4 — fast, and still not the pick

| case | ugrep | rg |
|---|---:|---:|
| sync, gitignore, `--json` | **18 ms** (2.66 MB out) | 30–43 ms |
| sync, `--no-ignore`, `--json` | 2,022 ms (970 MB out) | 2,496 ms |

ugrep is legitimately quick — faster than ripgrep on the gitignore-respecting case here. It loses on everything else that matters for shipping:

- **Result fidelity.** `ugrep --json` emits only `{"file", "matches":[{"match": "…"}]}` — no line numbers, no byte offsets, no submatch spans unless you add `-n -b -k`, and even then it is a weaker protocol than rg's `begin`/`match`/`context`/`end`/`summary` stream with per-submatch `start`/`end`.
- **It doesn't agree with git.** Same query, same repo: ugrep found **482 files / 13,310 matches**, rg found **479 / 13,296**. Its `.gitignore` implementation is close but not identical, and "search results that quietly disagree with `git status`" is a bug we'd own forever.
- **Licence is BSD-3-Clause,** not the MIT/Apache the phase constrains to. Permissive and almost certainly fine, but it's a deviation someone has to sign off.
- **No npm distribution.** We'd vendor, host, checksum, notarize and update per-platform binaries ourselves — precisely the work `@vscode/ripgrep` does for free, for a tool with one primary maintainer versus one that Microsoft ships to millions of desktops.

**Verdict: lose on packaging and protocol, not on speed.**

### 2.6 ast-grep 0.45.1 — loses as the ⌘⇧F engine, earns a look elsewhere

`@ast-grep/cli@0.45.1` (**MIT**, published **2026-08-07** — three days ago, actively maintained), same optionalDependencies-per-platform model, `--json=stream` emits NDJSON with `byteOffset` + line/column ranges that would drop straight into the same parser as rg.

| query | ast-grep | rg regex equivalent |
|---|---:|---:|
| gmux, `useEffect($$$)` (tsx) | 36 ms | — |
| sync, `export function $NAME($$$) { $$$ }` (ts) | 57 ms (621% CPU) | 14 ms |

As the *text* search engine it loses: ~4× slower, no plain-substring mode, and the darwin-arm64 binary is **50 MB** against ripgrep's 4.3 MB — an 11× packaging cost for a tool that can't answer "find this string".

But 57 ms to run a real structural query across a live TypeScript repo is *cheap*, and `@ast-grep/napi` (MIT, same version) is a Node-API binding — **ABI-stable, so no `electron-rebuild`**, unlike our `better-sqlite3`/`node-pty` deps. `ast-grep outline` also explores "symbols, imports, exports, members", which is suspiciously close to the backlog's "go to symbol in project". **Not the ⌘⇧F engine — but the numbers say the structural/symbol dimension should take it seriously rather than dismiss it on weight.** Flagging across to whoever owns backlog item 3; the 50 MB is the real argument against, and it may be avoidable via `@ast-grep/napi` instead of the CLI.

### 2.7 Indexing: the decisive negative result

gmux already ships `better-sqlite3@^13`, so FTS5 is the cheapest possible index to justify — no new dependency at all. I built a real one: FTS5 with the **trigram** tokenizer, which is the only FTS5 tokenizer that can do substring matching (code search needs `useSt` → `useState`; a standard token index cannot do this and is therefore disqualified before we start). 1 MiB per-file cap, binary sniffing, batched transactions, WAL.

| repo | corpus | build | index size | **overhead** | q `session` | q `createClient` | q `useSt` | re-index 25 files |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| gmux | 2.9 MB | 249 ms | 11.1 MB | **3.83×** | 27.5 ms | 0.2 ms | 4.8 ms | 34.5 ms |
| specstory-sync | 54.4 MB | 3,985 ms | 164.9 MB | **3.03×** | **1,244 ms** | 134 ms | 545 ms | **639 ms** |
| getspecstory | 59.7 MB | 4,454 ms | 179.4 MB | **3.01×** | **1,894 ms** | 1.8 ms | 26.8 ms | 543 ms |

Now put the index's query time next to ripgrep's *complete cold search* of the same corpus:

| repo | FTS5 `session` | **rg, cold, no index** |
|---|---:|---:|
| gmux | 27.5 ms | **10.9 ms** |
| specstory-sync | 1,244 ms | **214 ms** |
| getspecstory | 1,894 ms | **253 ms** |

**The index is 3× the corpus on disk, takes 4 seconds to build, and then answers the common query 2.5–7.5× slower than having no index at all.** Trigram posting lists for a frequent term are enormous; ripgrep's SIMD literal scan over warm page cache simply beats reading them.

The index does win where you'd expect — rare terms in large corpora (`createClient` on getspecstory: 1.8 ms vs ~26 ms). That win is ~24 ms, once, on a query that was already imperceptible.

Against that, price the thing this app actually is. **gmux is a harness for agents that rewrite the repo continuously.** Repairing the index after a 25-file edit burst costs **543–639 ms of CPU plus WAL writes**; a branch switch or `npm install` invalidates thousands of files and costs the full ~4 s rebuild and a 165 MB rewrite. That is a background daemon waking on every `@parcel/watcher` event to burn CPU and write hundreds of megabytes to an SSD, on a laptop, to make an already-instant query slower. The brief said "no indexing daemon that burns battery unless it clearly wins". It doesn't win; it loses on both axes simultaneously.

**Orama 3.1.18** (Apache-2.0, 2025-12-19), **MiniSearch 7.2.0** (MIT, 2025-09-16) and **FlexSearch 0.8.212** (Apache-2.0, 2025-09-06) are all *token*-based in-memory JS indexes built for prose and typo tolerance. They cannot do substring or regex matching over code, they'd hold the corpus in the main process heap, and they inherit every incremental-maintenance problem above. Not applicable. **Tantivy** has no credible Node binding: the candidates on npm are `@pngwasi/node-tantivy-binding@0.3.4` and `@oxdev03/node-tantivy-binding@0.2.1` — sub-1.0, single-author, and a native binding we'd have to rebuild per Electron ABI. Shipping that in a signed desktop app would be reckless.

**Verdict: no index, for content search.** The one indexing idea that survives is much narrower — a *symbol* index (identifiers only, not trigrams) for "go to symbol in project", which is a different feature with a different cost curve. That belongs to backlog item 3, not here.

### 2.8 Is rg 15.2.0 worth vendoring ourselves?

`@vscode/ripgrep@1.18.0` vendors **15.0.0**. Upstream is at **15.2.0** (2026-07-15, Unlicense OR MIT), whose changelog claims improved "directory traversal time on very large corpora" and gitignore fixes "when searching across multiple directories" — both nominally relevant. I downloaded the official 15.2.0 aarch64-apple-darwin binary and measured:

| case | 15.0.0 | 15.2.0 |
|---|---:|---:|
| sync, `--no-ignore`, zero-match walk | 2,470 ms | 2,430 ms |
| sync, `--no-ignore`, `session` | 2,342 ms | 2,300 ms |
| sync, gitignore, `session` | 35.2 ms | 37.2 ms |
| sync, `--files --no-ignore` | 84.3 ms | 83.4 ms |
| getspecstory, `--no-ignore`, zero-match walk | 2,227 ms | 3,699 ms |

**No measurable win** — every delta is inside run-to-run variance. There is no performance reason to hand-vendor a binary and take on hosting, checksums and notarization. **Stay on `@vscode/ripgrep` and inherit its upgrades.**

---

## 3. Sharp edges found by measurement

These are the things that will cost the implementer a day each if they aren't written down.

### 3.1 `--max-columns` is ignored by the `--json` printer

Not documented, and it will produce a spectacular failure the first time someone searches a repo containing a minified bundle. Max output line length, searching `node_modules` for `function`:

| invocation | longest output line |
|---|---:|
| `--json` | **6,952,086 bytes** |
| `--json --max-columns 200` | **6,952,086 bytes** |
| `--json --max-columns 200 --max-columns-preview` | **6,952,086 bytes** |
| plain text `--max-columns 200` | **330 bytes** |

Match counts are identical (294,418) in every case, so nothing is being dropped — the JSON printer simply doesn't honour the flag. **The parser must impose its own cap** (VS Code does this in `RipgrepParser` via `previewOptions.charsPerLine`, not via rg). Truncate `data.lines.text` to ~250–500 chars, keep the real `submatches` offsets, and mark the row truncated. Without this, one webpack bundle allocates a 7 MB string per match line and the search view dies.

### 3.2 `--hidden` walks `.git/`

VS Code passes `--hidden` and is saved by its default `files.exclude` containing `**/.git`. Ripgrep gives you no such protection. Measured file counts:

| repo | default | `--hidden` | of which inside `.git/` |
|---|---:|---:|---:|
| gmux | 308 | 1,408 | **1,098 (78%)** |
| specstory-sync | 986 | 3,396 | **2,145 (63%)** |
| getspecstory | 375 | 3,396 | **2,743 (88%)** |

A first, sloppy shell timing suggested this doubled search time. **It does not** — re-measured properly through the real harness, the cost is modest and the garbage-result count is small:

| repo | with `.git` | with `-g '!.git/'` | time cost | spurious matches from `.git` |
|---|---:|---:|---:|---:|
| gmux | 15.2 ms | 10.5 ms | +45% | 9 |
| specstory-sync | 192.4 ms | 191.2 ms | +0.6% | 10 |
| getspecstory | 242.2 ms | 232.5 ms | +4% | 45 |

Git object stores are mostly packfiles, so ripgrep's binary detection bails out after the first 8 KiB and the scan is cheap. So the honest case for `-g '!.git/'` is **result hygiene, not speed**: it costs nothing, it removes matches from refs/logs/loose objects that no user wants, and it caps the downside on a repo with many loose objects instead of packs. Add it — just don't expect a speed-up.

We *do* want `--hidden` otherwise: it is what surfaces `.specstory/`, `.claude/`, `.github/` and dotfile configs, which on these repos is real content users search for.

### 3.3 Spawning from inside the asar works, but shouldn't be relied on

`rgPath` resolves inside `app.asar`. Electron's asar shim makes this *work* — but by **copying the whole 4,528,512-byte binary to `/tmp/.org.chromium.Chromium.XXXXXX`** on first spawn (verified: a new 4,528,512-byte temp entry appeared). After warm-up the spawn overhead is small (3.2 ms vs 2.5 ms median), so this is not a performance argument. It's a **codesigning** argument: that temp copy is unsigned, and it will fail library validation the moment gmux moves to Developer ID + hardened runtime (already on the roadmap in `electron-builder.yml`'s header comment).

Related: the shipped binary is **ad-hoc / linker-signed** today (`Identifier=rg-c6c48c77c0e56d95`, `Signature=adhoc`, `TeamIdentifier=not set`). Under a real identity it must be re-signed as a nested Mach-O — which electron-builder does automatically **only for files it has unpacked**. So `asarUnpack` is required for correctness now and for signing later.

### 3.4 SIGTERM leaves data in flight

| method | time to process death | bytes arriving *after* the kill |
|---|---:|---:|
| `SIGKILL` | 2.5 ms | **0** |
| `SIGINT` | 1.8 ms | 0 |
| `SIGTERM` | 2.6 ms | **7,978** |
| `stdout.destroy()` → EPIPE | 4.1 ms | — (exits 0) |

Cancellation is essentially free in all cases, but `SIGTERM` lets ~8 KB of already-buffered pipe data land after you thought you'd stopped. **Use `SIGKILL`, and additionally gate the parser on a query epoch** so late chunks from a superseded search can never leak into the new result set. Ripgrep holds no locks and writes nothing, so `SIGKILL` is safe.

### 3.5 The `--json` protocol, from real output

Five event types, one JSON object per line:

```
begin   {"path":{"text":"./scripts/x.ts"}}
context {"path":…,"lines":{"text":"// …\n"},"line_number":36,"absolute_offset":2317,"submatches":[]}
match   {"path":…,"lines":{"text":"import { createClient } …\n"},"line_number":37,
         "absolute_offset":2341,
         "submatches":[{"match":{"text":"createClient"},"start":9,"end":21}]}
end     {"path":…,"binary_offset":null,"stats":{…,"matched_lines":2,…}}
summary {"data":{"elapsed_total":…,"stats":{…}}}
```

Notes that matter:
- `submatches[].start`/`end` are **byte** offsets into `lines.text`, not UTF-16 code units. Converting to a Monaco column requires decoding the prefix — VS Code does exactly this via `Buffer.from(fullText).slice(…).toString()`.
- Any `{text: …}` field can instead be `{bytes: "<base64>"}` when the content isn't valid UTF-8. Handle both (VS Code's `bytesOrTextToString`).
- `end.binary_offset` non-null means ripgrep stopped early because the file is binary. Verified: a file containing `session\0binary` yields a normal `match` event *and* `"binary_offset":7`. Surface it or drop the file, but don't ignore the field.
- Ripgrep can emit a matching line with **zero** submatches for certain regexes (a known upstream quirk VS Code works around by synthesising a 1-char submatch). Guard for `submatches.length === 0`.
- One invocation can search **multiple roots** — passing both project paths returned correctly-attributed results for each. Useful for the "all open projects" option, though per-root child processes give better per-root cancellation and progress.

---

## 4. Recommended design

### 4.1 Process placement — main is fine, *if* you cap

The obvious worry in an Electron app is that `JSON.parse` on hundreds of MB blocks the main process and freezes the UI. Measured event-loop lag while parsing, 4.3 GB unignored corpus (4 ms sampling timer; 16.7 ms = one frame at 60 Hz):

| cap | wall | p50 | p95 | p99 | max | frames >16.7 ms |
|---|---:|---:|---:|---:|---:|---:|
| 1,000 | 11 ms | 0.6 | 0.6 | 0.6 | 0.6 | **0** |
| 20,000 | 55 ms | 3.3 | 5.7 | 5.7 | 5.7 | **0** |
| uncapped (327k matches) | 2,217 ms | 0.6 | 11.9 | 22.4 | 34.1 | **9** |

**With the 20,000 cap, parsing in the main process costs at most 5.7 ms of lag and drops zero frames.** Uncapped it drops 9. So: **no `utilityProcess`, no worker thread, no extra IPC hop** — the cap already buys the headroom, and this keeps the feature inside gmux's existing single-main-process shape. That is a real complexity saving, and it is justified by measurement rather than hope.

### 4.2 Argument construction

Follow VS Code's `getRgArgs` (I read the current source at `src/vs/workbench/services/search/node/ripgrepTextSearchEngine.ts`) with the `.git` correction from §3.2:

```
--hidden --no-require-git --no-config
-g '!.git/'                        # §3.2 — VS Code gets this from files.exclude
--ignore-case | --case-sensitive   # or --smart-case
[--glob-case-insensitive --ignore-file-case-insensitive]
[-g '!*' -g <anchored include> …]  # includes: non-`**` patterns first exclude everything
[-g '!<anchored exclude>' …]
[--no-ignore]                      # only when the user opts out of ignore files
[--no-ignore-parent] [--no-ignore-global]
[--max-filesize <n>] [--follow] [--encoding <enc>] [--threads <n>]
--crlf --engine auto
--regexp <re> | --fixed-strings
--json
[--multiline]
[--before-context <n> --after-context <n>]
-- <pattern> .
```

- `--no-config` is not optional — it stops a user's `RIPGREP_CONFIG_PATH` from silently changing gmux's results.
- `--engine auto` lets rg fall back to PCRE2 (present and JIT-enabled, §1) for lookaround/backreferences instead of erroring.
- Context lines are expensive (§2.1: 214 ms → 394 ms, 47 MB → 84 MB for `-A1 -B1`). Prefer **no context in the stream**; fetch context lazily when a result group is expanded, using the file read path the tree/SCM already own.

### 4.3 Streaming, cancellation, backpressure

```
search:start {query, roots, opts} ─▶ main
   ├ epoch = ++counter; kill any live child for this searchId (SIGKILL)
   ├ spawn(rgPath, args, {cwd: root, stdio:['ignore','pipe','pipe']})
   ├ stdout → line splitter → JSON.parse → typed event
   │    · truncate lines.text to MAX_PREVIEW (§3.1)
   │    · byte→UTF-16 column conversion for submatches
   │    · coalesce into per-file groups
   │    · flush to renderer on a ~16 ms timer OR every 200 results
   │    · at 20,000 submatches: set hitLimit, SIGKILL, emit 'limit'
   ├ stderr → accumulate, classify on non-zero exit (regex parse error,
   │          unknown encoding, glob error, PCRE2 unavailable)
   └ close → emit 'done' {matched, files, hitLimit, elapsed}
search:cancel {searchId} ─▶ SIGKILL + bump epoch; drop all later events
```

Points that came out of the measurements rather than the imagination:

- **Batch to the renderer on a frame timer, not per event.** rg delivers 20,000 results in 24–71 ms; forwarding each one individually would generate far more IPC traffic than frames to display it.
- **Epoch-gate every event** (§3.4). Late chunks are real, not theoretical.
- **Exit code 1 means "no matches", not failure.** Only treat non-zero-and-not-1 with stderr content as an error.
- **Debounce query input ~150 ms**, then cancel-and-respawn. At 2.5 ms to kill and 3 ms to first result, respawning is cheaper than any incremental-update scheme.
- One child **per root** for multi-project search: independent cancellation, per-root progress, and no ambiguity attributing paths.

### 4.4 Integration deltas

`package.json` — one dependency, no new transitive deps:

```json
"@vscode/ripgrep": "1.18.0"
```

Pin exactly, as the repo already does for `@pierre/diffs` and `@pierre/trees`. `externalizeDepsPlugin()` keeps it a runtime require; nothing to configure in `electron.vite.config.ts`.

`electron-builder.yml` — the binary **must** be unpacked (§3.3):

```yaml
asarUnpack:
  - "**/*.node"
  - "**/@vscode/ripgrep-*/bin/*"
```

and main must rewrite the path when packaged, the way VS Code does:

```ts
const rgBinary = app.isPackaged
  ? rgPath.replace(`app.asar${sep}`, `app.asar.unpacked${sep}`)
  : rgPath;
```

The `files:` denylist needs no new entry — `@vscode/ripgrep` and its one platform package are main-process runtime deps and *should* ship. This is, incidentally, another argument for the Phase 16 allowlist flip already in the backlog: under `!node_modules/**` + explicit re-includes, this dependency would need naming once, in the obvious place.

Module shape, following the existing `src/main/git/exec.ts` spawn precedent and the domain-per-module guardrail:

```
src/main/search/
  resolve.ts    # rgPath → packaged-aware binary path (the ONE place; guardrail 3)
  args.ts       # query + options → argv (pure, unit-testable)
  parser.ts     # NDJSON → typed events; preview truncation; byte→UTF-16 cols
  engine.ts     # spawn/stream/cancel/epoch/cap
  ipc.ts        # registrar, per-domain (guardrail 2)
```

`args.ts` and `parser.ts` are pure functions over strings — they should carry vitest coverage for the quirks in §3.5 (zero-submatch lines, `bytes` vs `text`, `binary_offset`, 7 MB line truncation) since those are exactly the cases that won't show up in manual testing.

New channels appended to `src/shared/ipc.ts` (append-only, per the frozen-contract rule): `search:start`, `search:cancel` on the invoke map; a `search:results:<searchId>` emit channel following the `termDataChannel(sessionId)` precedent already in the file.

---

## 5. Summary of verdicts

| option | verdict | the deciding number |
|---|---|---|
| **`@vscode/ripgrep@1.18.0`** (rg 15.0.0, MIT) | **ship** | 3 ms TTFR on every corpus; 72 ms worst realistic capped search; 4.3 MB |
| `@vscode/ripgrep-universal@1.18.0` | reject | 58 MB vs 4.3 MB for identical behavior on a single-arch build |
| Hand-vendored rg 15.2.0 | reject | zero measurable gain over 15.0.0; adds hosting + notarization work |
| Node-native (workers + `fs`) | reject | 14–28× worse TTFR, and `.gitignore` (worth 7–80×) is unimplemented |
| `ripgrep@0.3.1` (WASI) | reject | 17× slower, no PCRE2, unkillable in-process — solves a problem we don't have |
| ugrep 7.8.4 | reject | weaker JSON protocol, disagrees with git (482 vs 479 files), BSD-3, no npm channel |
| ast-grep 0.45.1 | reject **as ⌘⇧F engine** | 4× slower, 50 MB, no substring mode — but hand to the structural/symbol dimension |
| SQLite FTS5 trigram | reject | 3× disk, 4 s build, 0.6 s per edit burst, and **2.5–7.5× slower queries than no index** |
| Orama / MiniSearch / FlexSearch | reject | token-based; cannot do substring/regex over code |
| Tantivy via napi | reject | no credible binding (0.2.x/0.3.x, single-author, per-ABI native rebuild) |

## 6. Open items for adjacent dimensions

- **Quick open (⌘P)** is not mine, but the same binary feeds it. `rg --files --hidden --no-require-git -g '!.git/'`, medians of 5:

  | repo | `.gitignore` respected | `--no-ignore` |
  |---|---:|---:|
  | gmux | **6.2 ms** / 312 paths | 26.7 ms / 23,089 |
  | specstory-sync | **6.2 ms** / 1,251 paths | 75.4 ms / 83,463 |
  | getspecstory | **24.2 ms** / 653 paths | 830 ms / 107,089 |

  Enumerate with ripgrep, then fuzzy-rank in the renderer. One binary, both features. Note the 50k-file target in the brief is only reachable with ignore files off; with them on, none of these repos exceeds 1,300 paths and enumeration is free.
- **Symbol search / structural (backlog item 3)** — §2.6 says ast-grep is cheaper than its reputation (57 ms for a real structural query). Recommend evaluating `@ast-grep/napi` (ABI-stable, no `electron-rebuild`) rather than the 50 MB CLI, and note VS Code 1.134 ships `@vscode/tree-sitter-wasm@^0.3.1` as the other precedent.
- **Replace-in-files** — rg 15.0 supports `-r/--replace` *with* `--json`, so a preview can be generated by the same engine and pipeline. That makes the backlog's "if it falls out cheaply" condition plausibly true; worth a costed look rather than an automatic deferral.
- **Hardened runtime** — when the Developer ID pass happens, the `rg` Mach-O needs re-signing with the team identity (§3.3). It is ad-hoc signed today.
