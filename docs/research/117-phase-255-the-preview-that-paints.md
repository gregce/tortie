# Research 117 — the preview that paints (Phase 255 bake-off)

Parent commit **61ff42a4** (`docs(backlog): the large file opens fast`), measured on the
operator's 48 GB Mac. This is the RESEARCH half of Phase 255 and it is a bake-off with
prototypes: **every number below was produced on this machine in this session**, either in
the running app (one Electron per arm through `build/electron-run.mjs`, scratch profile,
scratch `HOME`, own `gmux-p255-*` socket, ended in the helper's `finally`; the operator's
`-L gmux` sessions read **39 before and 39 after every run**) or under node 22.23.1 over the
same bytes. **No byte of the operator's files was read**: both fixtures are the research 116
twins, re-synthesized to the exact byte from the shape table by the synthesizer Phase 254
committed in `build/p254/probe-p254-open.mjs` (seeds 11 and 22 — twin A 2,559,758 B /
46,105 lines, twin B 3,262,893 B / 26,750 lines).

## 0. The headline, so a later reader does not have to derive it

- **The recommendation is candidates 1+2 combined: block-windowed rendering over
  markdown-it, under the unchanged sanitize → Shiki → React-element tree.** Prototyped in
  the running app, the deliberate Preview click on the 2.56 MB twin goes from **first paint
  2,254 ms with an 1,845 ms long task** (HEAD baseline, this session) to **first paint
  74 ms, worst task 208 ms, stream complete ≈ 1.1 s** — with the final DOM equal to the
  baseline's by element count (6,710), heading count (1,644), heading ids, and scrollHeight
  (952,178 px), read off the live page in both runs.
- **micromark is the whole parse cost, and it has cliffs.** Stage-decomposed, the shipping
  pipeline spends its time in remark-parse (2,469 ms on twin A in node) and rehype-raw
  (1,085 ms); everything downstream — sanitize 55 ms, Shiki 69 ms, hast→elements 27 ms — is
  noise. And the cost is not linear: **a 1 MB GFM table with no blank lines parses in
  105,947 ms under the shipping stack and 108 ms under markdown-it** — a three-orders
  cliff a real transcript can hit. A 1 MB tight list: 3,698 vs 164 ms.
- **markdown-it under the same tree is GFM-parity to a countable remainder.** Over this
  repository's own 221 markdown files (11.5 MB), with three one-line shims the product
  would ship, **215 of 221 render canonically identical DOM**; the 6 that differ fall into
  three enumerated inline classes (§3.3), two of which are markdown-it being *right*.
- **Candidate 3 (worker) alone is rejected**: the worker parses in 3.7 s and main stays
  free, but first paint still waits 3.7 s — it moves the freeze, it does not shrink it.
  As an addition to 1+2 it buys at most the 208 ms worst slice for a 35–108 ms clone-in
  cost, priced in §5 and left optional.
- **Candidate 4 (cache) alone is rejected for the same reason a cache always flatters**:
  it fixes the second open, and the complaint is the first. The per-chunk `React.memo`
  that windowing needs anyway IS the useful cache (edits re-parse one chunk); a
  digest-keyed hast cache costs 6.2–6.5 MB per document for a reopen path the stream
  already covers in ~1 s of idle time.
- **Phase 254's 256 KiB deferral becomes a first-block guard, not a size guard** (§7):
  with first paint viewport-proportional, file size stops predicting the open cost; the
  one thing that still can is a document whose FIRST cuttable boundary is megabytes deep.

## 1. Method

**In-app arms.** A research probe modeled on the committed `build/p254/probe-p254-open.mjs`
(same recorder: rAF for first paint of `.md-content`, `PerformanceObserver` longtask, same
Explorer click and mode-chip drive) opens each twin (untracked, so Phase 254 defers to
Monaco), clicks Preview on the chip, and reads: click→first-paint, worst long task, last
task end, time until the DOM stops changing, and the correctness anchors — `.md-content`
childElementCount, heading count, first/last heading id, scrollHeight, and a scroll to the
bottom. Three builds were driven: HEAD unmodified (baseline), HEAD + a windowed prototype
over the existing remark pipeline (candidate 1 alone), and HEAD + the same windowing with a
markdown-it chunk renderer (candidates 1+2). The prototypes were src patches for
measurement only; `src/` is back to byte-parity with HEAD and the prototype files are
preserved outside the tree for the build phase. Every launch: one Electron,
`electron-run.mjs`, scratch profile/HOME/socket, ended in the `finally`.

**Node arms.** Stage decomposition, parser bake-off, corpus diffing, worker transfer and
digest costs ran under node 22.23.1 with `--expose-gc`, 3 trials, median reported. Node and
the Electron renderer do not run V8 at the same speed here — the whole shipping pipeline
takes 3,583 ms to elements in node and ≈ 2.0 s inside the app on the same twin — so node
numbers are used for **ratios and stage attribution**, and every headline claim is the
app's own reading.

**Correctness instrument.** Two independent DOM diffs: (a) in-app, the anchor set above,
prototype vs baseline; (b) in node, canonicalized-DOM comparison (parse5 → sorted
attributes → whitespace collapsed outside `pre`) of full renders across the corpus, and of
chunked-and-stitched renders vs whole renders.

## 2. The baseline, decomposed

### 2.1 In-app (this session, HEAD `61ff42a4`): the deliberate Preview click

| twin | first paint | worst task | task total | children |
| --- | --- | --- | --- | --- |
| A 2.56 MB | 2,254 ms | 1,845 ms | 2,217 ms (2 tasks) | 6,710 |
| B 3.26 MB | 1,831 ms | 1,618 ms | 1,827 ms (2 tasks) | 5,062 |

This is faster than research 116's ~5.5 s because Phase 254 moved the module load, the
file read and the highlighter attach off the click; what remains is the render itself —
one synchronous pass, **nothing paints until the whole document is elements**, and the
whole pass is one task the page cannot interrupt.

### 2.2 In node: where the milliseconds are (median of 3)

| stage | twin A | twin B |
| --- | --- | --- |
| remark-parse (micromark + gfm) | 2,469 ms | 1,756 ms |
| mdast → hast | 52 | 44 |
| rehype-raw (parse5 round trip) | 1,085 | 856 |
| rehype-sanitize (gmux schema) | 55 | 48 |
| Shiki over the fences | 69 | 54 |
| hast → React elements | 27 | 14 |
| renderToStaticMarkup | 20 | 16 |
| **whole pipeline to elements** | **3,583** | **2,711** |

Two stages are the cost: **micromark, and rehype-raw** (which reserializes the whole tree
through parse5 to stitch raw HTML). Sanitize, Shiki and the element walk — the parts the
charter says must stay — are ~150 ms combined. Nothing needs to leave; the parse needs to
change.

### 2.3 The cliffs (node, both parsers, same bytes)

| shape | shipping stack | markdown-it | ratio |
| --- | --- | --- | --- |
| 1 MB GFM table, no blank lines | **105,947 ms** | 108 ms | ~980x |
| 1 MB tight list (20,164 items) | 3,698 ms | 164 ms | 22x |
| 1 MB on one line (prose words) | 229 ms | 14 ms | 16x |
| 256 KB on one line | 66 ms | 4 ms | 16x |

micromark's cost is superlinear on blank-free constructs (the gfm-table extension worst of
all). Phase 254's derivation comment already recorded a single-line file AT the 256 KiB cap
rendering ~5.7 s in-app; the table row above is the same disease an order worse. **Any
recommendation that keeps micromark keeps these cliffs.**

## 3. Candidate 2 — markdown-it under the same tree

### 3.1 The mechanism

`markdown-it@14.1.0` (VS Code's own webview parser) renders CommonMark+GFM to an HTML
string; `parse5.parseFragment` + `hast-util-from-parse5` (both ALREADY in the tree as
rehype-raw's own dependencies) turn that string into hast; then **the identical
rehype-sanitize (same gmux schema), the identical Shiki step, the identical
`hast-util-to-jsx-runtime` walk and the identical components map** run unchanged. No
`dangerouslySetInnerHTML` — the HTML string exists only as parser IR, every byte still
crosses the same sanitizer before it can become an element, and the pipeline.ts order
promise (all raw HTML becomes nodes → sanitize → only then Shiki's styles) holds in the
same shape. rehype-raw drops out of this path entirely (parse5 already parsed the HTML),
which is the second-largest stage gone for free.

### 3.2 The numbers (node, median of 3)

| stage | twin A | twin B |
| --- | --- | --- |
| markdown-it → html | 49 ms | 69 ms |
| html → hast (parse5) | 144 | 146 |
| sanitize | 21 | 20 |
| Shiki | 43 | 32 |
| hast → elements | 24 | 13 |
| **whole path to elements** | **247** | **223** |

**14.5x / 12.2x against the shipping pipeline over the same bytes**, with the sanitize and
highlight walls intact. (`marked@14` was also timed — 65/70 ms, same class as markdown-it —
but it targets HTML-string output with no ecosystem toward hast, has a history of
sanitization-adjacent CVEs when misused, and is not what VS Code ships; markdown-it is the
candidate.)

### 3.3 GFM parity, measured not asserted

Corpus: this repository's own 221 `.md` files, 11.5 MB (BACKLOG, CHANGELOG, every research
doc, vendored READMEs). Both pipelines rendered every file to hast; DOMs canonicalized
(sorted attributes, whitespace collapsed outside `pre`) and compared byte-for-byte.

Config that gets there, all of it product-shippable and measured in the run: markdown-it
`{ html: true, linkify: true }` with `linkify.set({ fuzzyLink: false })` (GFM does not link
bare `CLAUDE.md`-style domains — with fuzzy links on, **98 files** differ; off, they
collapse to 6), a two-line `s`→`del` renderer rule (remark-gfm emits `<del>` for
`~~x~~`), and a table-alignment token rule mapping `style="text-align:*"` to `align="*"`
(the schema strips `style`, so without this shim every aligned table silently loses its
alignment — found by the corpus, not by reading). Plus `markdown-it-task-lists@2.1.1` and
`markdown-it-footnote@4.0.0` for the two GFM features the core lacks (the corpus uses
neither: 0 task items, 0 footnotes; both twins: none — but remark-gfm supports them today,
so parity requires the plugins).

**Result: 215 of 221 files canonically identical.** The 6 that differ, exhaustively:

| class | files | verdict |
| --- | --- | --- |
| GFM's over-eager email autolink: remark links `22.13.56@2x.png` and `typescript@6.x` as `mailto:`; markdown-it does not | docs/BACKLOG.md, docs/research/49-arch-pane.md | markdown-it is right; a filename is not an email |
| a soft-break's trailing space inside a list item's paragraph directly before a fence — one whitespace text-node | 3 research docs | invisible (HTML whitespace collapsing) |
| trailing `.` after a bare URL: GFM strips it, linkify keeps it in the href | 1 vendored LICENSE.md | one file; fixable with a linkify tlds tweak or accepted |

The strongest parity evidence is the in-app run itself: **the markdown-it windowed
prototype produced exactly the baseline's element count, heading count, heading ids and
scrollHeight on both twins** (§5).

### 3.4 The price

One new bundled dependency, pinned exactly: markdown-it 14.1.0 — 123.6 KB min, **44.3 KB
gzip** (measured), MIT, zero further runtime deps beyond what the tree has; plus the two
plugins (a few KB each). It lives in the same lazily-loaded markdown chunk, so nothing at
boot pays for it. The remark stack cannot be REMOVED in this phase — `AnswerMarkdown`
(Catch Me Up) renders agent answers through react-markdown with the no-rehype-raw chain,
and answers are small (milliseconds) — so the chunk carries both parsers until a later
round migrates the answer path deliberately. DOM differences: §3.3's six files, or zero if
the answer is "documents differ only where GFM itself is wrong".

## 4. Candidate 1 — block-windowed rendering

### 4.1 The scanner (no parse)

A three-pass line scan (prototype ~120 lines) finds blank lines where the document can be
cut without changing what any chunk means: fence state (``` and ~~~, close-marker length),
type-1 HTML blocks (`pre/script/style/textarea`) and comments span until their close;
**open raw-HTML container tags veto cuts** (a README hero `<table>` spans blank lines
because rehype-raw/parse5 stitches fragments across CommonMark block boundaries — found by
the corpus diff, one real file); **lists veto cuts end to end** — a marker line, a lazy
continuation (no blank since a listish line) or an indented continuation keeps the veto
alive, because cutting a blank-separated list splits one `<ul>` into two AND re-tightens a
loose list (both found on the twins, §4.3); indented code after a blank (≥ 4) vetoes.
Reference definitions are collected in the same scan and appended (after a blank) to every
chunk's parse input — a definition renders to nothing, so a link used before its definition
resolves and nothing else moves. Footnote syntax is detected (`^ {0,3}\[\^…\]:`) and such
documents fall back to the unwindowed path in the prototype — 0 of 221 corpus files, and a
def-collecting pass like the reference one is the eventual answer.

**Scan cost: 10.6 ms (twin A) / 6.9 ms (twin B)** — 0.2–0.4 % of the render it windows.
Chunks at a 60-line target: 324 / 336.

### 4.2 The correctness price, measured

- **Corpus: 221 of 221 files render identical canonical DOM chunked-and-stitched vs
  whole** (0 footnote fallbacks). The two scanner bugs the corpus missed, the twins caught:
  a loose list split at a blank between items, and a loose→tight flip at a cut — both are
  the same rule (never cut inside a list) and both fixed in the veto above; after the fix
  the twins are byte-identical after newline-normalization (the only residue is the `\n`
  text node between top-level blocks at a seam, which the DOM does not draw).
- **Cross-block constructs priced, not waved:** setext headings and lazy continuation
  never cross a blank line, so blank-only cutting is immune by construction; tables'
  alignment rows sit inside their blank-free run; reference definitions cost one appended
  string (twins: 0 bytes; the 2 corpus files that use them: identical output); footnotes
  are the one construct windowing genuinely reorders (each chunk would emit its own
  footnote section), hence the fallback, at measured 0 % incidence.
- **The residual price is chunk-size variance**: a blank-free run cannot be cut. The
  twins are adversarial here — their synthesized tails are 868 KB (A) and 993 KB (B)
  blank-free runs, and the list region of A merges to 690 KB — so ~34 % of twin A lives in
  two uncuttable chunks. This is exactly where candidate 2 matters (§5).

### 4.3 Candidate 1 ALONE, in the app (windowing, remark kept)

| twin | first paint | worst task | last task end | DOM anchors |
| --- | --- | --- | --- | --- |
| A | **77 ms** | 393 ms | 1,777 ms | children 6,710, headings 1,644, scrollHeight 952,178 — equal to baseline |
| B | **58 ms** | **1,674 ms** | 2,780 ms | children 5,062, headings 1,468, scrollHeight 1,045,206 — equal |

First paint is solved by windowing alone — 12 chunks render in one frame, the rest stream
through `requestIdleCallback` batches behind it, each drawn chunk held by `React.memo` so a
batch re-renders nothing already on the page. But **the worst task is whatever micromark
does to the biggest uncuttable run** — 1,674 ms on twin B's tail — and §2.3's table cliff
means a real transcript can make that arbitrarily bad. Windowing alone fixes the paint and
leaves the freeze reachable.

## 5. Candidates 1+2 combined, in the app — the recommendation, measured

Same windowing; each chunk renders through markdown-it → parse5 → the same sanitize → the
same shared Shiki highlighter (`GMUX_THEME_NAME`, the @pierre/diffs singleton) → the same
components map via `hast-util-to-jsx-runtime`.

| twin | first paint | worst task | tasks total | stream done | DOM anchors |
| --- | --- | --- | --- | --- | --- |
| A 2.56 MB | **74 ms** | **208 ms** | 344 ms (3) | ≈ 1.1 s | children 6,710, headings 1,644, first/last ids equal, scrollHeight 952,178 — **all equal to baseline** |
| B 3.26 MB | **45 ms** | **77 ms** | 77 ms (1) | ≈ 1.0 s | children 5,062, headings 1,468, ids equal, scrollHeight 1,045,206 — **all equal** |

The 208 ms task is twin A's 868 KB blank-free tail going through parse+commit as one
slice; every ordinary slice is single-digit milliseconds. Scrolling to the bottom lands on
the full document; anchors resolve to the same ids as the baseline.

**Candidate 3 priced against this.** A worker parsing off-main: full-document parse
3,676 ms off main (remark) with a 35–108 ms structured-clone back plus 15–21 ms toJsx on
main — alone, it un-freezes the page but first paint still waits for the whole parse, so
it loses to windowing outright. Combined with 1+2 it could take the 208 ms slice off main
for a per-chunk clone cost, at the price of a worker bundle, transferable messaging and a
second copy of the parser — **not needed to hit the target below; hold it as the known
next lever if a future shape (a 5 MB single table) ever needs it.** The html-string
variant (worker → string → parse5 on main: 186 ms on main) buys nothing over hast.

**Candidate 4 priced against this.** sha256 of the whole source: 1.3 ms; per-chunk
digests: 1.3 ms — cheap enough to key anything. But the reopen path the cache would serve
is already: scan 10 ms + first window ~60 ms, rest streamed idle; a hast cache
(6.2–6.5 MB per document as JSON-equivalent, 40–56 ms to clone in) or an HTML-string cache
(2.6–3.2 MB, plus a parse5 pass that costs 144 ms — more than it saves) buys back only
idle-time work. **The one cache that earns its memory is the one windowing needs anyway:**
per-chunk memoized elements while the tab lives, which makes a Split-mode keystroke
re-parse one chunk (~1–5 ms + a 7–11 ms rescan) instead of the document. Recommendation:
ship that, skip the digest store.

## 6. The target, stated from these numbers, and the proof shape

On the 2.56 MB twin, deliberate Preview click, reference machine:

1. **First paint under 250 ms** (measured 74 ms; the budget leaves headroom for a
   table-heavy first screenful, whose slice the twins price at ≤ 208 ms).
2. **No main-thread task over 250 ms while the rest streams** (measured worst 208 ms on an
   868 KB blank-free run; ordinary documents measured ≤ 77 ms). If the build phase splits
   oversized runs' *commit* (parse whole, mount in slices), 100 ms is reachable; 250 is
   what this prototype proves.
3. **Full-document correctness**: final DOM equal to the current renderer's over the
   corpus (215/221 identical + the three enumerated inline classes of §3.3, each visible
   only as a link GFM should not have made or whitespace the DOM does not draw), and the
   in-app anchor set (children, headings, ids, scrollHeight) equal on both twins — plus
   `conformance:wideblocks` untouched: chunks mount as fragments, so `.md-table-scroll`
   and `pre` remain DIRECT children of `.md-content` (verified in-app by the child-count
   equality; no wrapper element may ever be introduced around a chunk, and
   `display: contents` is not an escape hatch — the gate's child combinator matches DOM,
   not boxes).
4. **Everything the pipeline promises today stands**: same sanitize schema before Shiki,
   no `dangerouslySetInnerHTML`, images/links/task boxes through the same components map,
   heading slugs unchanged (same `headingSlug` over the same text).

## 7. What Phase 254's deferral becomes — re-derived

The 256 KiB threshold was derived from ~2 ms/KB of unwindowed render: the largest source
whose render still lands in about half a second. Under 1+2 that model is gone — first
paint measured 74 ms at 2.56 MB and 45 ms at 3.26 MB is **viewport-proportional, not
size-proportional** — so a size threshold no longer predicts anything a person feels on
the click, and for MODE ROUTING the deferral is **gone**: a large `.md` can open in
Preview again, which un-splits the two operator complaints research 116 unified (the
BACKLOG git-status race in §3.3 of research 116 stops routing anyone into a 2 s render).

What still predicts pain is the one thing windowing cannot cut: **a document whose first
cuttable boundary is megabytes deep** (one giant blank-free table from byte 0). The
replacement guard is therefore the scanner's own reading, available in ~10 ms at open: if
the first chunk exceeds a stated size, defer exactly as Phase 254 does today, chip clause
and all. The number, derived from the measured ~0.24 ms/KB in-app slice cost
(208 ms / 868 KB): **a 2 MB first block ≈ 500 ms first paint — the same half-second
boundary Phase 254 chose, now applied to the block that actually gates the paint instead
of the file that does not.** Both twins, every corpus file, and every ordinary prose file
pass it; `openedProseMode`'s clause and `PREVIEW_DEFER_TITLE` survive for the degenerate
shape only. If the build phase prefers zero routing logic, the honest alternative is
keeping deferral at 2 MB of *source* — but the first-block guard is the one this
research's numbers actually support.

## 8. Integration notes the build phase should not rediscover

- **HeadingRuler** computes from a `revision` that today changes once; under streaming it
  must re-read as chunks land (drawn-count in the revision) or it draws a partial ruler.
- **Split mode** re-renders per keystroke; the scan (7–11 ms) runs per change and chunk
  texts before the edit point are byte-identical, so `React.memo` on (text) keeps them.
  Debounce is available but the numbers do not demand it.
- **The stale-completion race**: any "fully drawn" flag must reset synchronously with the
  new source (render-time, not effect-time) — the probe caught passive-effect timing
  handing a previous document's completion to a reader between commit and effects.
- **AnswerMarkdown stays on react-markdown** (small inputs, no rehype-raw by design);
  the markdown chunk temporarily carries both parsers (§3.4).
- **Shiki languages** still attach up front via the existing `prepareHighlighter`; the
  windowed path reuses the shared singleton exactly as today (verified in-app — fences
  colour identically, `addLanguageClass` preserved).
- The three markdown-it shims (§3.3) are load-bearing for parity: `s→del`, the
  table-align attribute rule (the sanitizer strips `style` — without the shim alignment
  silently dies), `fuzzyLink: false`.
- The prototype sources (scanner, windowed impl, markdown-it chunk path, probe) are
  preserved uncommitted in the worktree's `.p255/` for the build phase to port; the
  committed twin synthesizer in `build/p254/probe-p254-open.mjs` is the fixture source.

## 9. What is NOT in this document

- **No byte of the operator's files.** Twins only, re-synthesized from research 116's
  shape table; the corpus is this repository's own committed markdown.
- **No fix.** `src/` is byte-identical to HEAD; the prototypes were measured and reverted.
- **No sanitization change measured or proposed.** Both prototyped paths run the same
  rehype-sanitize with the same gmux schema before Shiki; the markdown-it path was
  measured WITH sanitize in every number.
- **No WASM and no native parser** — the JS candidate reached the target with a 10x
  margin on first paint, so the research never opened that door.
- **No new runtime configuration.** markdown-it would be pinned exactly and bundled at
  build time into the existing lazy markdown chunk; nothing loads by configuration.
- **No claim that node milliseconds are app milliseconds.** Every headline number is the
  app's own; node numbers attribute stages and compare parsers on fixed hardware.
