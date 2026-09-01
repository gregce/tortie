# Research 74 — the redline in the diff view, being what Phase 185 did not give him

Extends and corrects `docs/research/73-prose-redline.md`. Research 73 answered the question in the
abstract and rendered nothing, and its own section 8 says so. This document ran the shipped build,
read the markup it draws over his own repository, attacked the one explanation everybody assumes,
found a seam in Pierre that research 73 never examined, and re-derived the word diff independently in
node against the copy of jsdiff that is installed right now.

## 1. What he asked for, and the exact gap

Phase 185 shipped a control at the head of the diff surface reading `Inline` then `Off`, `Words`,
`Phrases`, `Characters`, plus a paint toggle, and the diff has split and stacked layouts. He clicked
through all of it over his own test file, and what he saw was two separate line rows: a deletion row
reading `The quick brown fox` with `brown` washed, and beneath it an addition row reading
`The quick fox`.

What he wants is a redline. The deleted words struck through in red, immediately followed by the
inserted words in green, on one line, in flowing text, the way a person marks up a document.

The gap is exact and it is structural rather than cosmetic. Phase 185 chose **how much of each row is
washed**. It never touched **how the two rows relate**, and it could not have, because the two rows
are two block elements. The phase's own backlog entry says this in its NOT TRUE section, and
`src/renderer/pierre/diff-view-prefs.ts:68` to `:75` says it in the code. Nobody was misled. He just
wanted the other thing.

### 1.1 His fixture, established rather than assumed

The brief said `test.txt` at the root of `/Users/gdc/test-diff` and said `git show HEAD~1:test.txt`
came back empty. It does not come back empty. It fails, with `fatal: path 'test.txt' does not exist
in 'HEAD~1'`. The file is `test/test.txt`. The real pair, read with `git show` and `xxd`:

- `0a9799c` ("test"): `The quick brown fox\nJumped over the fence`, 41 bytes, no trailing newline
- `7c58e06` ("this"): `The quick fox\nJumped over the fence`, 35 bytes, no trailing newline

That commit also added `IMG_5310.jpg`. His repository is clean and untouched by this work.

**His edit is a pure word deletion. Nothing is inserted.** That single fact explains most of what
follows, and it is the reason the control looked broken to him.

## 2. What the shipped build really draws, measured

Driven through the real buttons in the running app, four inline modes by two layouts, over his own
pair.

### 2.1 Stacked, which is Pierre's `diffStyle: 'unified'`

```
pre[data-diff][data-indicators=bars][data-background][data-diff-type=single]
  code[data-code][data-unified]
    div[data-gutter]   -> the line numbers, a separate subtree
    div[data-content]
      div[data-line=1][data-line-type=change-deletion][data-line-index=0,0]
        span "The quick " | span[data-diff-span] > span "brown " | span "fox"
      div[data-line=1][data-line-type=change-addition][data-line-index=1,0]
        span "The quick fox"
      div[data-line=2][data-line-type=context] span "Jumped over the fence"
```

Two block `div` rows, adjacent siblings inside one `div[data-content]`, deletion first, addition
second, both carrying `data-line="1"`. Measured rectangles at an editor width of 1200: deletion at
x 600 y 148, addition at x 600 y 168, both 840 wide and 20 tall. Same column, 20 pixels apart. That is
his screenshot.

### 2.2 Split, which is `diffStyle: 'split'`

The `pre` becomes a grid of two 435.5 pixel columns holding **two separate `code` elements**, being
`code[data-code][data-deletions]` and `code[data-code][data-additions]`, each with its own gutter and
its own content container. Deletion at x 600 y 148, addition at x 1036 y 148. Their lowest common
ancestor is the `pre` itself.

### 2.3 Does any single element ever contain both sides

No. In stacked the nearest shared ancestor is `div[data-content]`, whose children are separate block
rows. In split it is the `pre`, across two different `code` elements. Rows are `white-space: pre`, so
nothing reflows. `text-decoration-line` computes to `none` on both rows and on every
`[data-diff-span]`.

### 2.4 The finding nobody had measured: on his file the control has two outcomes, not four

Counting `data-diff-span` elements and taking an md5 of the drawn markup, per cell:

| cell | spans on deletion | spans on addition | markup bytes | md5 |
| --- | --- | --- | --- | --- |
| stacked / Off | 0 | 0 | 1570 | c0d382fd |
| stacked / Words | 1, being `brown ` | 0 | 1627 | c11388b3 |
| stacked / Phrases | 1, being `brown ` | 0 | 1627 | c11388b3 |
| stacked / Characters | 1, being `brown ` | 0 | 1627 | c11388b3 |
| split / Off | 0 | 0 | 1988 | b46d68dd |
| split / Words | 1, being `brown ` | 0 | 2045 | 7c5465f9 |
| split / Phrases | 1, being `brown ` | 0 | 2045 | 7c5465f9 |
| split / Characters | 1, being `brown ` | 0 | 2045 | 7c5465f9 |

Words, Phrases and Characters draw markup that is byte identical, in both layouts. Every click was
honoured, `aria-pressed` going true each time, so the control works. His data has two outcomes in it
and no more.

**Re-derived independently, without the app.** Running the installed jsdiff in plain node over his two
strings, all three of the functions Pierre can reach return the same three parts:

```
diffWords          [" The quick ", "-brown ", " fox"]
diffWordsWithSpace [" The quick ", "-brown ", " fox"]
diffChars          [" The quick ", "-brown ", " fox"]
```

So the cause is upstream of Pierre and upstream of Tortie. A whole token removal with nothing inserted
gives character level nothing extra to find, and `word-alt` has one span to join with nothing, so its
join is a no operation. He turned on a new control, clicked every setting, and correctly saw nothing
change. That is a real finding about the control and it deserves its own backlog line, separately from
the redline.

For the record the three modes do diverge on dense real changes. Phase 185 measured 188, 45 and 311
spans over a real commit to `PierreDiff.tsx`. They collapse together whenever each changed word stands
alone between unchanged neighbours, which is what a small prose edit looks like. A control fixture
with four scattered word replacements gave Words 4 spans a side, Phrases identical to Words, and
Characters 7 spans a side of confetti such as `b`, `own`, `jump`, so even a real replacement
distinguishes only three of the four settings.

## 3. Question one: is there Pierre functionality that enables this

**No, and the reason is stronger than the one research 73 gave.**

Research 73 said `renderTwoFiles` highlights the two sides as independent documents, so a Shiki
decoration can never span both. That is true and it stands. Underneath it is something harder.
`node_modules/@pierre/diffs/dist/style.js` contains:

```css
[data-content] {
  grid-template-rows: subgrid;
  grid-template-columns: subgrid;
  background-color: var(--diffs-bg);
  grid-column: 2;
  min-width: 0;
  display: grid;
}
```

and the running app agrees, `getComputedStyle` on that container returning `display: "grid"` and
`grid-template-rows: "subgrid [] [] [] [] []"`. Every diff line row is therefore a **grid item of a
subgrid**, and by CSS Display 3 a grid item's specified `display` is blockified. An `inline` on those
rows computes to `block`, whatever anybody writes.

This was attacked rather than assumed. A stylesheet was appended into Pierre's own shadow root forcing
`display: inline !important` and `white-space: normal !important` on both rows, together with a red
strikethrough. The colour took, reading `rgb(229, 101, 94)`, and the strikethrough took, reading
`line-through`. The display stayed `block` on both rows, and the rectangles did not move from y 148
and y 168. The same stylesheet in split mode left the deletion at x 600 and the addition at x 1036 in
two different `code` elements. Pierre's entire stylesheet contains **zero `!important` declarations**,
measured on the exported string, so this is not a cascade anybody can out rank. It is the
blockification rule, and no stylesheet can undo it, `unsafeCSS` and its `@layer unsafe` included.

The rest of the surface confirms it. The whole package offers exactly one layout switch, being
`diffStyle?: 'unified' | 'split'` at `dist/types.d.ts:354`. `LineDiffTypes` at `:335` is the four modes
Tortie already exposes and nothing more. `overflow?: 'scroll' | 'wrap'` at `:340` soft wraps one
logical line inside its own monospace row and does not merge two rows. `CodeViewLayout` at `:701` is
padding and gap. The exported stylesheet is 39,124 characters and contains `line-through` **zero
times**, which confirms research 73's claim against the copy on disk today.

### 3.1 But research 73 was too absolute, and this is the correction that matters

Pierre has a first class, exported, supported extension point that research 73 never examined:
`lineAnnotations` and `renderAnnotation` on the React `FileDiff`, declared at
`node_modules/@pierre/diffs/dist/react/types.d.ts:16` and `:18`, over the annotation type at
`dist/types.d.ts:414`, being `{ side: AnnotationSide; lineNumber: number }`.

Three facts make it the seam:

1. **The content stays in the light DOM.** `dist/react/utils/renderDiffChildren.js` emits
   `<div slot={getLineAnnotationName(annotation)}>{renderAnnotation(annotation)}</div>` as a child of
   the container, and the vanilla path's `dist/utils/createAnnotationWrapperNode.js` builds a light DOM
   div with the slot name and `style.whiteSpace = "normal"` already set. Slotted content is not inside
   the shadow tree, so `src/renderer/styles/tokens.css` reaches it, and it is Tortie's own React
   subtree, so no third party code is involved in what it draws.
2. **The shadow side is a full width row.** `dist/utils/createAnnotationElement.js` builds
   `div[data-line-annotation] > div[data-annotation-content] > slot[name]`, sitting under the changed
   line rather than inside it.
3. **In stacked mode Pierre merges both sides into one annotation row.**
   `dist/renderers/DiffHunksRenderer.js` around line 964 pushes the addition side's annotation names
   onto the deletion span when the type is `unified`, and returns only that span. In split it returns
   a deletion span and an addition span separately.

So the honest answer to his first question is two sentences. Pierre cannot draw a redline, and no
option, class or stylesheet will make it. Pierre can **hold** one, in a light DOM row it hands to
Tortie, and only in stacked mode.

What is not reachable, so nobody spends a round on it: `getUnifiedInjectedRowsForLine` and
`getSplitInjectedRowsForLine` are `protected` on `DiffHunksRenderer`
(`dist/renderers/DiffHunksRenderer.d.ts:144` and `:145`), and
`dist/react/utils/useFileDiffInstance.js:21` and `:27` hard code `new VirtualizedFileDiff` and
`new FileDiff` with no factory prop, so injected rows would mean abandoning the React component.

One more measured caution. Anything written directly into Pierre's shadow content is transient. A
prototype row injected there measured correctly and then vanished, because showing the window fires
Pierre's own resize and visibility observers and it rebuilds that subtree. The light DOM slot is the
only durable seam.

## 4. Question two: could we complement it with another library

**No, and none is needed.**

`diff` version 9.0.0, BSD-3-Clause, is already installed at `node_modules/diff`, is a production
dependency in `package-lock.json:3840` with no `"dev": true`, and has exactly one dependent, being
`@pierre/diffs`. It is the only diff library in `node_modules`. There is no `fast-diff` and no
`diff-match-patch`. So "another library" means a new package, and the Phase 23 refusals in `CLAUDE.md`
bite there.

Its bytes are already executing in the shipped renderer. `diffWordsWithSpace` and `diffChars` both
appear in `out/renderer/assets/EditorPanel-DJLnPa_b.js` and
`out/renderer/assets/highlight-pool-impl-CIKt3FlI.js`. The bare name `diffWords` appears zero times, so
the function research 73 recommends is genuinely not in the bundle today.

The two alternatives research 73 weighed are unchanged and both still lose. Monaco's differ is an
unsupported deep import under `node_modules/monaco-editor/esm/vs/editor/common/diff/`, absent from its
public `editor.api.d.ts`. `git diff --word-diff=porcelain` through `runGit` is a subprocess per diff at
about 12 milliseconds a spawn, which makes it an excellent independent method for a verifier and a bad
shipping path.

## 5. Question three: could we augment it ourselves

**Yes, and it was drawn in the running app rather than asserted.**

Inside Tortie's renderer, over Pierre's own two rows, a word level diff was computed with a hand
written LCS, deliberately not jsdiff so the derivation is independent, and one `div` of `span`, `del`
and `ins` was built from it. Over the replacement fixture it produced thirteen children in the order
`span, del, ins, span, del, ins, span, del, ins, span, del, ins, span`, being four deletions
`[brown, jumped, lazy, near]` and four insertions `[red, leapt, sleepy, beside]`, **one element holding
both sides**, with the first deletion at x 680 y 151 and the first insertion at x 716 y 151. Same line,
insertion immediately after the deletion. That is the redline he described.

Everything research 73 could not prove about it is now measured:

- **The colours come from tokens and no new token is needed.** Read live off the document:
  `--error #e5655e` on the `del` with `line-through`, `--success #6bc46d` on the `ins` with no
  decoration, and the washes `--error-wash` and `--success-wash` behind them. They sit at
  `src/renderer/styles/tokens.css:103`, `:105`, `:107` and `:109`.
- **It reflows.** The row measured 20 pixels tall at 840 wide and 60 pixels tall at 240 wide, being
  three line boxes. Research 73 section 8's first admission, that nothing was rendered, is answered.
- **On his own file a redline and a plain strikethrough are the same picture.** The parts are
  `[same "The quick ", removed "brown ", same "fox"]`, one `del` and zero `ins`. The two colour effect
  he is imagining needs a replacement, and his test edit is a deletion. Any demonstration of this work
  to him must use a pair that replaces words, or he will look at it and see a strikethrough.
- **Selection interleaves, and it is now measured rather than feared.** Selecting the prototype row and
  reading `toString()` gave
  `The quick brownred fox jumpedleapt over the lazysleepy dog nearbeside the river bank.` Research 73
  section 5.6 listed this as a decision the phase must make. It is not optional. Either
  `user-select: none` on the deleted runs or a copy handler that emits one side.

## 6. The hard parts that actually bite

1. **The annotation slot is the one unproven claim in this whole answer.** Sections 3.1's three facts
   are read from Pierre's shipped source and were never rendered. A phase proves that first, in one app
   run, before anything else is written.
2. **Stacked only.** In split the two sides live in different `code` elements, and an annotation
   belongs to one side. A redline row under a split diff would sit under one column and read as noise.
   Tortie's own `showDiffSplit` at `src/renderer/editor/EditorPanel.tsx:691` is one app wide preference
   at `gmux.diffSideBySide` (`src/renderer/editor/store.ts:113`) defaulting on, so most people are in
   split most of the time and a stacked only feature is invisible to them unless the surface says so.
3. **Duplication.** An annotation row under a changed line does not remove the two rows above it. The
   person would read the same change three times. Either the redline replaces the pair visually, which
   means hiding two rows Pierre owns, or the surface is honest that it is an extra reading aid.
4. **Whitespace is not lossless.** `diffWords` does not round trip the original text, measured in
   research 73 section 5.1 at 120 characters recovered against 121. Keep the original strings and never
   reconstruct them from the parts.
5. **Newlines ride inside a word change.** `diffWords` is not line structured, so a change can carry a
   `\n` inside it and a strikethrough then covers an invisible character. A line oriented surface
   should diff one line against one line, which is exactly what an annotation row per changed line
   gives.
6. **Cost, and the guard.** Research 73 measured `diffWords` at 373 milliseconds on a fully rewritten
   2,000 word pair and `diffChars` at 4,614. Myers is O(ND) in the edit distance. `maxEditLength` and
   `timeout` both return `undefined` rather than hanging, and one of them must be set with a fallback
   to showing the pair unchanged.
7. **Unicode.** `diffWords` splits a zero width joiner emoji cluster, which renders as garbage under a
   strikethrough, and a whitespace tokenizer sees one enormous token in Japanese. The `intlSegmenter`
   option exists in the installed copy and fixes both. It was exercised in node and not in Electron.
8. **The bundle cost, now measured.** Research 73 section 8 left this open. Rollup, which is what vite
   uses, then minified and gzipped, adding `diffWords` on top of the `diffWordsWithSpace` and
   `diffChars` that already ship costs **+3,389 raw bytes and +1,056 gzipped**. It lands in the lazy
   `EditorPanel` chunk rather than the eager set, so the containment budget that shaped
   `diff-view-prefs.ts` is not in play.

## 7. Is this a mode of the diff view, or a different surface

Research 73 said the natural home is a Redline mode on the markdown tab, over plain text, away from
Pierre entirely. This work does not overturn that and it does add a second option that did not exist
when 73 was written.

- **A Redline mode on the markdown tab** is what research 73 recommends, at
  `EditorPanel.tsx:699` to `:720` beside Source and Preview. It owns its whole rendering, it reflows
  properly, and it never fights Pierre. It is also a different place from where he was looking when he
  complained, because he was in the code diff.
- **A redline annotation row inside the stacked diff** is the new option. It puts the effect exactly
  where he saw the problem, it reuses the diff he already opened, and it costs the split mode caveat
  and the duplication question in section 6.

They are not exclusive and they share the same diff module and the same `del` and `ins` component. The
cheap order is to prove the annotation slot first, because it is one app run and it decides whether the
second option exists at all.

## 8. What a phase costs, and what it must refuse

**Tier 2.** A rendered surface with no new durable state, spawning nothing, holding no credentials,
sending nothing anywhere. It becomes Tier 3 the moment it touches `gmuxMarkdownSchema` at
`src/renderer/editor/markdown/pipeline.ts:54`, which is a security wall Phase 137.1 narrowed on
purpose, and the recommendation below is written to avoid needing to.

The independent methods it earns, and the verifier names which it used:

- **run over real data**, being his own `test/test.txt` pair AND a pair that replaces words, because
  section 2.4 proves his own fixture cannot distinguish the modes
- **re-derive independently**, by running `git diff --word-diff=porcelain` over the same pair through
  `src/main/git/exec.ts` and comparing its runs against what the component drew
- **write a hostile fixture**, being a zero width joiner emoji, combining marks, a right to left run, a
  1,200 character single line, and two entirely unrelated documents

The work, honestly sized:

- a diff module, being the `diffWords` call, the `Intl.Segmenter`, the whitespace normalisation and the
  `maxEditLength` guard, at roughly sixty lines
- the `del` and `ins` component with its colocated CSS, at roughly a hundred and twenty lines
- either the `renderAnnotation` wiring in `src/renderer/editor/PierreDiff.tsx`, or the mode arm in
  `EditorPanel.tsx` plus a native menu entry, because a new user facing surface always updates the
  menus in the same commit
- one line in `package.json` dependencies declaring `"diff": "9.0.0"`, being the version already
  installed, adding zero new bytes and zero new licences
- a BSD-3-Clause section in `NOTICE`, which is owed today regardless, see section 9

What it must refuse:

- no new package, and no third party code executing that does not already execute
- no relaxation of `gmuxMarkdownSchema`, so the redline renders React elements over plain text rather
  than going through the markdown pipeline
- no attempt to make Pierre's own rows inline, whether by `lineDiffType`, by `unsafeCSS`, or by any
  stylesheet, because section 3 closes all three
- no redline in split mode
- no block matching across a rewritten document, which is research 73 section 5.4 and is a second phase
- no new colour token

## 9. Where this corrects research 73

- **Section 2, "cannot be made to", was right about the outcome and incomplete about the mechanism.**
  The independent documents argument is true. The stronger and simpler reason is that every diff line
  is a grid item of a subgrid and its display is blockified by the specification, proved by forcing
  `display: inline !important` into Pierre's own shadow root in the running app and watching it stay
  `block` while the colour and the strikethrough in the same rule both took.
- **Section 2 was too absolute about Pierre's API.** It never examined `lineAnnotations` and
  `renderAnnotation`, which are exported, supported, hand Tortie a light DOM row with
  `white-space: normal` already set, and merge both sides into one row in unified mode. Pierre cannot
  draw a redline. It can hold one. That changes where the work can live.
- **Section 8, "nothing was rendered", is answered.** The `del` and `ins` flow was built and measured in
  Tortie's own renderer. It holds both sides in one element, it reflows from 20 to 60 pixels tall when
  squeezed, and it draws in `--error` and `--success` with no new token.
- **Section 8, "the bundle cost of importing `diffWords` was not measured", is answered.** It is +3,389
  raw and +1,056 gzipped, in the lazy chunk.
- **Section 5.6, the selection worry, is measured rather than speculated.** Selecting the prototype row
  returns the two sides interleaved, verbatim, so a copy handler or `user-select: none` is required
  rather than optional.
- **Section 2's `line-through` count and section 3.1's dependency facts are confirmed** against the copy
  on disk at 0.97.0, being 39,124 characters of stylesheet with zero occurrences, and `diff` at 9.0.0
  BSD-3-Clause as a production dependency with `@pierre/diffs` as its only dependent.
- **Section 3.4's owed debt is still owed at 0.97.0.** `NOTICE` lists bundled dependencies under an
  Apache section and an MIT section at lines 110 to 133 and has no BSD-3-Clause section for jsdiff at
  all. The three clause BSD text further down at line 295 is libevent's, which is a different
  dependency. BSD-3-Clause code from `diff` is in `out/renderer/assets/*.js` right now.
- **One small correction to a claim made during this work rather than by research 73.** A grep for
  `Segmenter` over the built renderer chunks is not zero. It is zero in the two chunks that carry the
  diff path, and it hits five Monaco chunks, being `monaco-impl` and four language workers. The
  conclusion is unchanged, that jsdiff's `Intl.Segmenter` tokenizer is tree shaken out today, but the
  grep must be scoped to the diff chunks or it reads as a contradiction.

## 10. What was NOT verified, and a builder may not pretend otherwise

- **No `renderAnnotation` was ever rendered.** All of section 3.1 is read from
  `dist/react/utils/renderDiffChildren.js`, `dist/utils/createAnnotationElement.js`,
  `dist/utils/createAnnotationWrapperNode.js` and `dist/renderers/DiffHunksRenderer.js`. It is the
  single claim here that comes from source rather than from a running app, and it is the first thing a
  phase proves.
- **The prototype was DOM injection, not a React component**, and it did not survive to a photograph,
  because showing the window rebuilds Pierre's shadow subtree. There is no photograph of a redline. The
  photographs that exist show the app driven and the real two row diff.
- **The word diff in the prototype was a hand written LCS, not jsdiff `diffWords`.** Token boundaries
  around punctuation may differ from what a built component would draw.
- **Nothing touched the markdown pipeline**, so research 73 section 5.5's sanitize wall remains
  untested. `className` is still absent from rehype-sanitize's default allowlist and
  `gmuxMarkdownSchema` at `src/renderer/editor/markdown/pipeline.ts:54` still adds only `details`,
  `summary` and a few attributes.
- **`Intl.Segmenter` was exercised in node, not in Electron.** Its option exists in the installed
  `node_modules/diff/libesm/diff/word.js`, confirmed by grep, and it was not run inside the app.
- **The bundle delta was measured on a scratch clone**, by rollup then esbuild minify then gzip, not by
  a full `npm run build` of this tree at 0.97.0.
- **The chunk names quoted in section 4 come from the `out/` directory in the operator's checkout**,
  which is a build artifact of whatever was last built there rather than a guaranteed build of the
  0.97.0 tip.
- **One machine, one build, four app launches.** The app runs were on a scratch clone of the 0.96.0 tip
  at `d60b182`, cloned before the 0.97.0 bump landed. That bump touched `CHANGELOG.md`,
  `docs/BACKLOG.md` and `package.json` only, and no diff surface file, so the measurements stand.
- **The block level story is untouched.** No block matching was implemented, and research 73 section
  5.4 is still a sketch.
- **Nothing in this document was verified against a diff of more than a few lines in the redline
  prototype.** The performance guard in section 6 is research 73's node measurement, not a measurement
  of a real redline over a real file.

## 11. Recommendation

**Do three things, in this order, and stop after the first if it says no.**

1. **Prove the annotation slot, in one app run, before writing anything.** Pass one
   `DiffLineAnnotation` and a `renderAnnotation` that returns a marked div into the existing
   `FileDiff` in `src/renderer/editor/PierreDiff.tsx`, in stacked mode, and read whether the content
   lands in the light DOM, whether `src/renderer/styles/tokens.css` reaches it, whether it reflows, and
   whether it survives a window show. That is the whole risk of the good option, and it is cheap.

2. **Build the redline as Tortie's own React `del` and `ins` over jsdiff `diffWords`**, coloured from
   `--error` and `--success`, with an `Intl.Segmenter`, a `maxEditLength` guard, and a copy handler that
   emits one side. It is roughly a hundred and eighty lines of Tortie's own code, no new package, no
   third party code executing that does not already execute, and no new token. If step 1 said yes, mount
   it as an annotation row under each changed line in **stacked mode only**. If step 1 said no, mount it
   as a Redline mode on the markdown tab exactly as research 73 recommends, and leave Pierre alone.

3. **Queue the control finding separately.** On his own test file the four way Inline control has two
   outcomes, proved twice, once by md5 of the drawn markup in the app and once by running the installed
   jsdiff in node where all three functions return identical parts. Nothing is broken. But a person
   clicking a four way control and seeing two pictures will conclude the product is broken, and the
   hint text on those buttons promises a difference his data cannot show. Whether that is a copy fix, a
   disabled state, or nothing at all is his call, and it is not part of the redline.

**And say the awkward thing out loud when the redline is demonstrated to him.** His own edit deletes a
word and inserts nothing. A redline over `The quick brown fox` becoming `The quick fox` is a
strikethrough and nothing else, in any implementation, including Word's. The demonstration needs a pair
that replaces words or he will look at the finished feature and say it did not work again.
