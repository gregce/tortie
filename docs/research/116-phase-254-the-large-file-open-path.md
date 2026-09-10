# Research 116 — the large-file open path, profiled (Phase 254 measure step)

Parent commit **89e96c93** (`docs(backlog): a large file should open like a small one`),
built and driven on the operator's 48 GB Mac. This is the MEASURE step of Phase 254: it
changes nothing under `src/`. Its two deliverables are the profile of the parent and the
reading of VS Code, and its one output is this document.

The operator, 2026-09-10: opening his 2,559,758-byte specstory history file "loads very
slowly", as does `docs/BACKLOG.md` at 3,257,257 bytes. "Opening files should be blazingly
fast. Please do a deep job of understanding how vscode does it and what might be preventing
us from opening super fast and fix."

**His two files were copied to scratch, measured for size and line shape ONLY, and deleted
in a `finally`. No byte of their content appears here.** Every fixture below is a
SYNTHESIZED twin built from the shape numbers alone.

## 0. The headline, so a later reader does not have to derive it

- **The dominant stage is the markdown preview render, and nothing else is close.** A
  2.56 MB prose `.md` opened as rendered markdown is interactive at **~5.5 s**, all of it
  main-thread, and **first paint does not happen until the whole document has rendered** —
  there is no window and no first paint before the end. CPU self-time: react-markdown's
  element walk **~4.2 s** plus micromark's tokenizer **~3.9 s** plus the remark/micromark
  helpers **~1 s**.
- **The IPC read is not the problem.** `fs.readFile` of the 3.26 MB file is **~6 ms** and
  the one-string transfer is inside that. Streaming the read — VS Code's headline
  mechanism — would buy this open **nothing**, because the bottleneck is CPU render, not IO.
- **The diff is not the problem either.** The 3.26 MB tracked-and-modified file opened as a
  Pierre diff is interactive at **~250 ms** typical, and **~635 ms** even against a HEAD that
  differs by **10,734 lines**, with a single long task of ≤ 85 ms. Pierre virtualizes and
  diffs off the main thread.
- **Monaco is already fast.** The same bytes shown in the editor (Source) open at **53 ms**
  (3.26 MB) and **136 ms** (2.56 MB). Monaco is VS Code's own editor and already inherits
  its large-file levers; these files are far below VS Code's "large" thresholds.
- **So "blazingly fast" is one stage away, and it is Tortie's own prose default, not the
  read and not the diff.** The specstory file opens as a rendered markdown preview because it
  is untracked `.md`; `docs/BACKLOG.md` opens as a diff (fast) when git status has loaded, and
  **as a markdown preview (~5 s) when it has not** — see §3.3.

## 1. Method

The two measure-step probes (`probe-p254-open.mjs` and `probe-p254-diff.mjs`, kept out of the
tree — the build phase writes the committed `probe:p254`) each launch ONE Electron through `build/electron-run.mjs` on a scratch
profile, a scratch `HOME` and a `gmux-p254-<pid>` tmux socket, ended in a `finally` with the
socket unlinked. No agent, no token, no keychain, no request; the project is built from
synthesized twins inside the scratch dir; the "agent write" is a `/bin/sh`. The operator's
`-L gmux` sessions were counted before and after each run: **39 → 39**, unmoved.

Milestones are read by a `requestAnimationFrame` recorder in the page (user-perceived paint),
long tasks by `PerformanceObserver({entryTypes:['longtask']})`, per-stage bridge cost by three
direct `window.gmux.*` calls, and trial 1 of each shape carries a CDP sampling CPU profile
(`Profiler`, 500 µs) whose top self-time rows are printed. "Interactive" = the later of the
surface paint and the last long task's end. Three trials per shape.

The twins (a synthesizer built from the shape numbers below — no operator content):

| twin | bytes | lines | mean len | blank | headings | fence lines | list items | table rows | >1 000 ch | >10 000 ch |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A (specstory, untracked) | 2 559 758 | 46 105 | 55.4 | 9 329 | 1 644 | 2 392 | 2 783 | 884 | 142 | 2 (max 13 001) |
| B (BACKLOG, tracked+mod) | 3 262 893 | 26 750 | 121.8 | 5 245 | 1 468 | 40 | 3 367 | 1 554 | 300 | 0 (max 7 924) |

The synthesizer reproduces each shape to the exact byte and within ~1 % on every structural
count. These are the operator's real files' shapes; their words are not.

## 2. The parent profile — milliseconds per stage per shape

### 2.1 Isolated bridge stages (three trials, direct calls)

| stage | twin | t1 | t2 | t3 |
| --- | --- | --- | --- | --- |
| `fs.readFile` (read + one-string transfer) | A 2.56 MB | 5.7 | 5.5 | 6.3 |
| `fs.readFile` | B 3.26 MB | 6.4 | 6.1 | 5.3 |
| `git.showHead` (HEAD blob for the diff base) | B | 46.3 | 25.1 | 23.5 |
| `baselines.load` (Phase 243 durable read) | A | 11.8 | 9.0 | 11.4 |
| `baselines.load` | B | 18.0 | 13.6 | 21.9 |

None of these is a slow stage. The read is ~6 ms; the diff base is ~25–46 ms; the durable
baseline read is ~9–22 ms. The Phase 243 durable STORE happens off the critical path
(`void persistBaseline`) and its own header measures it at 20–50 ms; the store wrote a
3 216 306 B body for B and a 2 605 891 B body for A to the scratch profile, with ~550 B JSON
records and a two-generation ring, exactly as Phase 243 specifies.

### 2.2 Shape A — untracked 2.56 MB `.md` → rendered markdown preview (THE slow path)

| reading | t1 (cold, profiled) | t2 (warm) | t3 |
| --- | --- | --- | --- |
| click → first paint (surface) | 5 675 ms | 5 663 ms | 5 237 ms |
| click → interactive | 10 880 ms* | 5 666 ms | 5 474 ms |
| long-task total | 10 873 ms | 5 651 ms | 5 458 ms |

\*t1 is inflated by the CPU profiler and the cold durable-store; the honest wall figure is the
warm **~5.5 s**. First paint and interactive are within a few ms of each other because the
render is one synchronous pass — **nothing paints until the entire document is rendered.**

CPU self-time, cold t1 (top rows):

| ms | function | what it is |
| --- | --- | --- |
| 4 172.9 | `next @ markdown-impl` | react-markdown's mdast→hast→React element walk over the whole document |
| 3 857.2 | `resolveAllText @ syntax` | micromark's tokenizer (remark-parse) over the whole 2.56 MB source |
| ~1 000 | `prepareList` / `go` / `check` / `consume` / `subtokenize` / `main2` / `atBreak` / `compile` @ syntax | the rest of the micromark state machine |
| 61.4 | `RegExp (?<=…)@(…)` | remark-gfm's autolink-email scan |

**THE stage that dominates shape A: the markdown pipeline** — `react-markdown` +
`remark-parse` (micromark) + `remark-gfm` + `rehype-raw` + `rehype-sanitize` + Shiki, run
synchronously and unwindowed over the whole source. There is no size or line guard anywhere on
this path (`src/renderer/editor/markdown/markdown-impl.tsx` renders `<Markdown>{source}</Markdown>`
in one pass; `MarkdownPreview.tsx` mounts it whole).

### 2.3 Shape B — tracked+modified 3.26 MB `.md` → Pierre diff (already fast)

| reading | t1 (cold) | t2 | t3 |
| --- | --- | --- | --- |
| click → first paint | 169.6 ms | 122.8 ms | 148.6 ms |
| click → interactive | 264.3 ms | 122.8 ms | 148.6 ms |
| long-task total | 65 ms | 0 ms | 0 ms |

**No stage dominates.** The read is ~6 ms, `git.showHead` ~25–46 ms, and Pierre paints an
approximate diff and virtualizes the rest. `PierreDiff.tsx` drives the virtualizer itself and
runs the jsdiff Myers comparison and the highlighting in `@pierre/diffs`' worker pool
(`src/renderer/pierre/highlight-pool.ts`), so the main thread stays free.

Diff cost against increasing deltas (fixed 3.26 MB file):

| HEAD differs by | first paint | interactive | longest task |
| --- | --- | --- | --- |
| ~230 lines | 141–201 ms | 140–288 ms | ≤ 62 ms |
| ~3 083 lines | 647–660 ms | 647–660 ms | ≤ 84 ms |
| ~10 734 lines | 621–635 ms | 621–635 ms | ≤ 85 ms |

Even a 10 k-line delta is interactive under 700 ms with a single sub-100 ms task. **The diff is
not the reported slowness.**

### 2.4 The same 3.26 MB bytes forced to markdown preview, and the mode toggles

| surface | click → interactive | long-task total |
| --- | --- | --- |
| B as markdown preview (3.26 MB) | 4 979 ms | 4 967 ms |
| A → Source (Monaco, 2.56 MB) | 136 ms | 123 ms |
| B → Source (Monaco, 3.26 MB) | 53 ms | 0 ms |
| B → Redline (3.26 MB) | 292 ms | 278 ms |

The markdown pipeline costs ~5 s for EITHER prose file — it is the pipeline, not one file.
Monaco and the redline are fast at both sizes.

## 3. What each shape's slowness actually is

### 3.1 The specstory file (untracked prose) — markdown preview, ~5.5 s

Untracked `.md` → `openModeFor` returns `plain` → the store opens it markdown, and a markdown
tab's default mode is `preview` (`readMarkdownMode()` in `src/renderer/editor/store.ts`). So the
open renders the whole document through the markdown pipeline: **~5.5 s, all main-thread, no
first paint until done.** This is the operator's "loads very slowly," reproduced exactly.

### 3.2 `docs/BACKLOG.md` (tracked+modified) — a diff when git status is loaded

Tracked+modified `.md` → `openModeFor` returns `diff` → the store opens it as a Pierre diff,
which is **~250 ms**. When git status is loaded at click time, BACKLOG opens fast.

### 3.3 …and a markdown preview when git status is NOT loaded — the likely real cause

`FileTree.openRel` reads `gitState.byPath.get(rel)`. On a cold project open, git status has not
resolved yet, so that is `undefined`, `pierreGitStatus(undefined)` is `null`
(`src/renderer/tree/decorations.ts:43`), `openModeFor` returns `plain`, and the store opens
BACKLOG as **markdown preview — the ~5 s path.** A person who opens the project and clicks
BACKLOG before the sidebar's git status lands gets the 5 s render, not the 250 ms diff. This is
the reproducible slow path for BACKLOG's own bytes, and it unifies both of his complaints under
one stage: **the markdown preview render.** (The build phase should confirm which path he hits
by asking; the measured slow stage is the same either way.)

## 4. VS Code, read from source

Sparse, shallow, read-only clone of `microsoft/vscode` at commit
**61b8b2709536acfebdb7ce1dc5b94ac55ace83a0** (2026-09-10), removed in a `finally`. Installed
`/Applications/Visual Studio Code.app` is **1.135.0**; note `/usr/local/bin/code` on this
machine is a symlink to **Cursor**, so a bare `code` is not VS Code — see §5 on the anchor.

### 4.1 The piece-tree text buffer, built from ~64 KB chunks

`src/vs/editor/common/model/pieceTreeTextBuffer/pieceTreeBase.ts:14` —
`const AverageBufferSize = 65535;`. `createNewPieces` (line 1165) and the builder's
`acceptChunk` (`pieceTreeTextBufferBuilder.ts:67`, `_acceptChunk1`) split text into ~64 KB
`StringBuffer` chunks, keeping a trailing `\r` or high surrogate back. **A file is never one JS
string**; it is a red-black tree of pieces over many small buffers, so `substring`/`charCodeAt`
stay cheap on a large document.

### 4.2 The streamed read behind it

`src/vs/platform/files/common/fileService.ts:33` — `private readonly BUFFER_SIZE = 256 * 1024;`;
the read stream (line 694) delivers 256 KB buffers.
`createTextBufferFactoryFromStream` (`editor/common/model/textModel.ts:72`) feeds each chunk to
`builder.acceptChunk` as it arrives (lines 80–83), so the piece tree is built incrementally from
the stream and the whole file is never held twice.

### 4.3 `editor.largeFileOptimizations` — the thresholds and what turns off

`EDITOR_MODEL_DEFAULTS.largeFileOptimizations = true`
(`editor/common/core/misc/textModelDefaults.ts`). The decision is made once in the `TextModel`
constructor and **permanently respected** (`textModel.ts:337-347`):

- `LARGE_FILE_SIZE_THRESHOLD = 20 * 1024 * 1024` (20 MB) — `textModel.ts:189`
- `LARGE_FILE_LINE_COUNT_THRESHOLD = 300 * 1000` (300 K lines) — `:190`
- `LARGE_FILE_HEAP_OPERATION_THRESHOLD = 256 * 1024 * 1024` (256 M chars) — `:191`
- `_MODEL_SYNC_LIMIT = 50 * 1024 * 1024` (50 MB) for worker sync — `:188`

`_isTooLargeForTokenization` is set when text length > 20 MB OR line count > 300 K. When true,
`LargeFileOptimizationsWarner` (`workbench/contrib/codeEditor/browser/largeFileOptimizations.ts`)
shows: *"tokenization, wrapping, folding, codelens, word highlighting and sticky scroll have been
turned off for this large file…"* and `viewModelImpl.ts:94` switches to an identity-lines
collection. **Both of his files are far under 20 MB and 300 K lines, so VS Code does NOT consider
them large** — it tokenizes them, viewport-first and in the background.

### 4.4 The per-line caps that always apply

- `editor.maxTokenizationLineLength` default **20 000** (`editorConfigurationSchema.ts:94-97`):
  a line longer than 20 K chars is not tokenized. Twin A's longest line is ~13 K, under the cap,
  so it is tokenized; anything above renders as plain text with no error.
- `editor.stopRenderingLineAfter` default **10 000** (`editorOptions.ts:6743`): the view renders
  only the first 10 000 columns of any single line.
- Folding: `MAX_FOLDING_REGIONS = 0xFFFF` (`contrib/folding/browser/foldingRanges.ts:33`).

### 4.5 The refusal / confirmation threshold

`getLargeFileConfirmationLimit` (`platform/files/common/files.ts:1632`): **local 1024 MB**,
remote 10 MB. A 3 MB local file never prompts. VS Code has no read cap comparable to Tortie's
16 MB guarded-read cap; it streams instead.

### 4.6 Markdown, specifically

VS Code opens a `.md` in the EDITOR (Monaco) by default. The rendered preview is a separate
command (⌘K V) that renders in a **webview with markdown-it**, not in the editor and not on open.
So **VS Code never does what Tortie does on open** — render a whole markdown document into the
DOM synchronously as the default view of the file. Its default open of a `.md` is the fast piece-
tree editor.

## 5. The on-machine target over the same bytes

Because `/usr/local/bin/code` is Cursor and a cold VS Code app-launch time is noisy, the faithful
on-machine anchor is **Tortie's own embedded Monaco (`monaco-editor` 0.56.0, VS Code's editor
component) rendering these exact bytes on this machine**: **53 ms at 3.26 MB and 136 ms at
2.56 MB** (§2.4). That is the "editor opens the same bytes" figure, measured, same engine, same
machine. VS Code's source (§4.3–4.4) confirms these files are not "large" to that engine, so its
default `.md` open is in the same tens-of-ms class. The gap between that and Tortie's ~5.5 s is
**entirely the markdown-preview-on-open**, which VS Code does not do.

## 6. Recommendations, ranked by measured milliseconds

Each names its stage, its mechanism, the promise it must keep, and where its cap is stated. **A
promise may be deferred, never silently dropped.**

### R1 — the markdown preview render (~5 000–5 600 ms; the whole of it)

**Stage:** `MarkdownPreview` / `markdown-impl` rendering the whole source synchronously.
**Mechanism (preferred):** for a prose file above a stated size/line threshold, **open it in the
fast surface Monaco already gives** — Source for an untracked `.md`, the diff for a tracked one —
and **defer the rendered preview until the person asks for it** on the mode chip. This is VS
Code's own answer: the editor is the default, the preview is a command. It costs the ~5 s only
when a person deliberately chooses Preview on a large file.
**Alternative if preview must stay the default:** cap the pipeline the way VS Code caps
tokenization — above a threshold, render a plain/fast form (no Shiki, no `rehype-raw`, or a
windowed render across frames) with a one-line note and a "render fully" affordance. Chunking the
render across `requestIdleCallback`/frames also gives a first paint before the end, which today
never happens.
**Promise kept:** the rendered preview is never removed — it is one click away on the chip
(deferred), and a capped render says so. The redline and diff are untouched.
**Cap stated where a person meets it:** on the mode chip / a one-line note on the surface, in
*just enough words*.
**What it must NOT do:** guess. The measured slow stage is this one; do not spend the budget on
the read or the diff.

### R2 — leave the read, the diff and Monaco alone

**Stages:** `fs.readFile` (~6 ms), `git.showHead` (~25–46 ms), Pierre diff (~250 ms, ~635 ms at a
10 k-line delta), Monaco Source (53–136 ms), redline (~292 ms). **All already fast.** In
particular, **do not stream the read** — it is 6 ms; streaming would add complexity for no
measured gain, because the bottleneck is CPU render, not IO. The 16 MB guarded-read cap and its
refusals do not move (Phase 254 "What is NOT in this phase").

### R3 — the durable baseline store, off the critical path (~20–50 ms)

**Stage:** Phase 243 `baselines:store`, already `void`-scheduled off the open (`persistBaseline`).
It writes a 3.2 MB body plus two sha256 passes on main per prose open. **Not the reported
slowness**; leave it unless a specific jank frame is being chased, in which case idle-schedule the
`store()` — but its own header already accounts for it and Phase 243 chose the current shape
deliberately. Its promise (durability of an accepted narrowing) must not be dropped.

### R4 — the git-status race that makes BACKLOG render as markdown (§3.3)

**Stage:** not a render cost but a routing one: a tracked file clicked before git status loads
opens as the ~5 s preview instead of the ~250 ms diff. If R1 opens large prose in the fast surface
regardless, this race stops mattering for size; independently, the open mode could wait for or
re-evaluate git status so a tracked file lands on the diff. This is a correctness note for the
build phase, measured here, not a required fix.

## 7. What is NOT in this document

- No byte of the operator's two files. Sizes and line shapes only; every fixture synthesized.
- No fix. This is the measure step; `src/` is unchanged. The build phase reads this and R1 first.
- No VS Code code vendored. Thresholds and mechanisms are read and cited with file and line.
- No claim that streaming the read helps: it was measured at 6 ms and explicitly does not.
