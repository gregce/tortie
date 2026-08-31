# Research 73 — the inline prose redline, being Word track changes in a reading surface

## 1. The ask, and the answer in one paragraph

He wants what the Wordie screenshot shows: a paragraph of flowing wrapped prose where each
correction reads as the deleted words struck through in red, immediately followed by the inserted
words in green, inline, in the middle of the sentence, with the paragraph still wrapping and
reflowing like ordinary text. Not two panes. Not two rows. Not a unified diff with plus and minus
gutters. **Tortie can do this, and the piece people assume is hard is already installed and already
running inside the renderer.** The word level diff is jsdiff, `diff@9.0.0`, which sits at
`/Users/gdc/gmux/node_modules/diff` and is already compiled into the shipped renderer chunks because
`@pierre/diffs` calls it. Its `diffWords` function returns exactly the sequence the screenshot draws,
being kept text, removed text, added text, in reading order. What has to be written is the rendering,
which is a Tortie owned React component of roughly a hundred lines emitting `<span>`, `<del>` and
`<ins>` into one flowing paragraph, coloured from `src/renderer/styles/tokens.css`. No new package is
needed and no third party code executes that does not already execute. The Phase 23 refusals are not
touched anywhere in this.

The thing that is NOT possible is doing it through Pierre. That is section 2, and the reason is
structural rather than cosmetic.

## 2. Pierre cannot do it, and cannot be made to

`@pierre/diffs` has a `lineDiffType` option with values `none`, `char`, `word` and `word-alt`, and it
is tempting to read those as the Wordie effect. They are not. They are a background wash on the
changed words, applied separately to a deletion row and to an addition row that are different DOM
elements in different rows of a CSS grid.

I did not reason about this from the types. I ran Pierre's own server side renderer, `preloadDiffHTML`
from `/Users/gdc/gmux/node_modules/@pierre/diffs/dist/ssr/index.js`, over a real prose pair in plain
node, in four option combinations, and read the bytes it emitted. The old string was "The quick brown
fox jumped over the lazy dog near the river bank." and the new string was "The quick red fox leapt
over the sleepy dog beside the river bank.". Every one of `word/unified`, `word-alt/unified`,
`char/unified` and `word/split` produced this shape:

```
<div data-content="" style="grid-row: span 2">
  <div data-line="1" data-line-type="change-deletion" data-line-index="0,0">
    <span>The quick </span><span data-diff-span=""><span>brown</span></span><span> fox </span>…
  </div>
  <div data-line="1" data-line-type="change-addition" data-line-index="1,0">
    <span>The quick </span><span data-diff-span=""><span>red</span></span><span> fox </span>…
  </div>
</div>
```

"brown" and "red" are in different `<div>` elements. Nothing in Pierre's public or protected API can
put them next to each other in one inline flow.

The separation happens before any DOM exists.
`/Users/gdc/gmux/node_modules/@pierre/diffs/dist/utils/renderDiffWithHighlighter.js:139` is the whole
story:

```js
const lineDiff = lineDiffType === "char" ? diffChars(deletionLine, additionLine) : diffWordsWithSpace(deletionLine, additionLine);
```

That runs inside `computeLineDiffDecorations`, which then pushes each change into either
`deletionDecorations` or `additionDecorations`. Further down, `renderTwoFiles` builds two synthetic
files, being all the deletion lines concatenated and all the addition lines concatenated, and
highlights each with its own `highlighter.codeToHast()` call. A Shiki decoration addresses one
position in ONE document, and by this point there are two documents. The interleaving the screenshot
shows has been thrown away.

Three smaller facts finish the case.

**Styling is reachable, and it buys nothing.** Pierre renders into a shadow root and its `unsafeCSS`
option injects an arbitrary stylesheet at `@layer unsafe`, wrapped by
`dist/utils/cssWrappers.js:14`. So a rule putting red strikethrough on the deleted spans is one line
away. It would still be a row above the green one. There is no CSS that moves a block level `<div>`
out of one grid row and into the inline flow of another.

**Pierre never draws a strikethrough today.** Its entire stylesheet is one 39,124 character string
behind the default export of `dist/style.js`, and it contains the word `line-through` zero times. The
complete set of rules for an intra line span is three declarations:

```css
[data-diff-span] { box-decoration-break: clone; border-radius: 3px; }
[data-line-type="change-addition"] [data-diff-span] { background-color: var(--diffs-bg-addition-emphasis); }
[data-line-type="change-deletion"] [data-diff-span] { background-color: var(--diffs-bg-deletion-emphasis); }
```

**The word diff is not exported.** `computeLineDiffDecorations` is module local, and the only export
statement in that file is `export { renderDiffWithHighlighter }`. Its neighbour
`dist/utils/parseDiffDecorations.js` exports only `createDiffSpanDecoration` and `pushOrJoinSpan`,
and neither computes a diff. There is no exported function anywhere in the package that takes two
strings and hands back word level changes.

Pierre also does not reflow prose. Its `overflow: 'wrap'` sets `white-space: pre-wrap` on a line, so
one logical line soft wraps inside its own monospace grid row. That is not paragraph reflow. And
`maxLineDiffLength` defaults to 1000 characters, so a paragraph held on one long line simply gets no
intra line diff at all.

Pierre stays where it is, being the code diff, and it is not involved in this.

## 3. What already exists, and what would have to be written

### 3.1 jsdiff is here, it is licensed, and it is already executing

`/Users/gdc/gmux/node_modules/diff/package.json` reads version `9.0.0` and license
`BSD-3-Clause`, and `node_modules/diff/LICENSE` carries the full text, copyright Kevin Decker. The
`package-lock.json` entry for `node_modules/diff` carries no `"dev": true`, so it is a production
dependency. It has exactly one dependent, being `@pierre/diffs`, which declares `"diff": "9.0.0"` at
`package-lock.json:1606`.

Its code is already in the shipped bundle. `grep -rl "diffWordsWithSpace" out/renderer/assets/*.js`
hits `EditorPanel-DJLnPa_b.js` and `highlight-pool-impl-CIKt3FlI.js`, which is Pierre's word diff
path being reached because `/Users/gdc/gmux/src/renderer/pierre/diff-render-options.ts:24` sets
`lineDiffType: 'word'`.

Tortie's own source has never called it. A grep of `src/` for `from 'diff'`, `diffWords`, `diffChars`
and `diffLines` returns nothing.

### 3.2 `diffWords` is the right function, and it is not the one Pierre uses

Pierre calls `diffWordsWithSpace` because Pierre diffs code, where every space matters. For prose the
right call is `diffWords`, which treats whitespace as insignificant for equality. Measured on one
realistic sentence pair, with `[-…-]` marking a deletion and `{+…+}` an insertion:

| function | output | parts |
| --- | --- | --- |
| `diffWords` | `The session is private{+, +}so [-nothing else-]{+no other program+} can read it, and the conversation [-is resumed from-]{+resumes exactly+} where it stopped after a reboot.` | 9 |
| `diffWordsWithSpace` | `…private{+,+} so [-nothing-]{+no+} [-else-]{+other+} {+program +}can read it, and the conversation [-is-]{+resumes+} [-resumed-]{+exactly+} [-from -]where…` | 19 |
| `diffChars` | `…so no{+ o+}th[-ing -]e[-lse-]{+r+} {+program +}can read it…` | 20 |

`diffWords` gives whole phrase replacements, which is the shape of the screenshot. The other two give
confetti. That is the single most important choice in this whole document.

`diffWords` is also not line structured, so it survives a paragraph whose line breaks moved. Given
"The quick brown fox\njumped over the lazy dog\nnear the river bank." against "The quick red fox
leapt over\nthe sleepy dog beside the river bank." it returns:

```
The quick [-brown-]{+red+} fox[-\njumped-]{+ leapt+} over\nthe [-lazy-]{+sleepy+} dog[-\nnear-]{+ beside+} the river bank.
```

The word level answer is correct across the moved breaks. Note the newline riding along inside a
word change, which section 5.1 comes back to.

### 3.3 What Tortie would have to write

The renderer, and only the renderer. Walk the array `diffWords` returns and emit one element per
part, being a bare `<span>` for a kept part, a `<del>` for a removed part and an `<ins>` for an added
part, all inside one `<p>` in a proportional font with normal wrapping. Colour the `<del>` with
`--error` and the `<ins>` with `--success`, both of which already exist at
`src/renderer/styles/tokens.css:103` and `:105`, with `--error-wash` and `--success-wash` at `:107`
and `:109` if a background tint is wanted. No new token is needed.

Around that sit four small decisions that are the actual work, and they are section 5.

### 3.4 The declaration chore, and a debt that is already owed

`diff` is a transitive dependency, so importing it directly from `src/renderer` leans on npm
hoisting. The clean move is one line in `package.json` dependencies, `"diff": "9.0.0"`, being the
same version already installed, adding zero new bytes and zero new licences. Whether that counts as
"a new package" under the constraint is his call, and the honest statement is that the bytes already
ship and already run.

`build/assert-import-boundaries.mjs` does not object. Its own header at line 67 says that other
package imports are out of scope, with one exception, being that only `src/main/log/` may import
`electron-log`. `build/contract-inventory.mjs` reads `package.json` only for `GMUX_*` environment
names, so `gate:contract` does not see a dependency change either.

Separately, and true today whatever is decided: **`NOTICE` does not list jsdiff.** Its bundled
dependency list at lines 111 to 133 has an Apache section and an MIT section and no BSD section at
all, while BSD-3-Clause code from `diff` is in `out/renderer/assets/*.js` right now. Clause 2 of that
licence asks for the notice in binary redistributions. That entry is owed already.

### 3.5 The two alternatives, and why neither wins

**Monaco.** It ships `myersDiffAlgorithm.js` and `dynamicProgrammingDiffing.js` under
`node_modules/monaco-editor/esm/vs/editor/common/diff/defaultLinesDiffComputer/algorithms/`, and they
are generic over a sequence interface. But `grep` for those names in
`node_modules/monaco-editor/esm/vs/editor/editor.api.d.ts` returns nothing, so they are not public.
Reaching them means a deep import of an unsupported internal path that moves between monaco releases,
where `src/renderer/editor/monaco-impl.ts:14` imports only `'monaco-editor'` and five worker entries.
Its own sequence type is character oriented and anchored to ranges over an array of lines, and its
public diff API is a two pane line based editor. It costs an unsupported import and saves nothing.

**git itself.** `src/main/git/exec.ts:52` exposes `runGit(repoPath, args)` taking arbitrary argv, and
`git diff --word-diff=porcelain` emits precisely the redline structure, being a leading space for a
context run, `-` for a removed run, `+` for an added run and `~` for a newline. Run over the same
sentence pair it produced the same three replacements jsdiff found. Its default word rule is coarser
on punctuation, giving `-private` then `+private,` where jsdiff isolates the comma; the flag
`--word-diff-regex='[[:alnum:]_]+|[^[:space:][:alnum:]_]'` fixes that and yields a clean `+,` on its
own. Cost measured at **12.3 ms per spawn**, averaged over twenty runs on this machine. It diffs
files, so two in memory strings need `--no-index` and two temporary files, it lives in main so the
result crosses IPC, and it is one subprocess per diff. **It is not the shipping path, and it is an
excellent independent method for a verifier**, because it is a completely different implementation
already on the machine.

## 4. What the shape actually is

The component is small enough to state fully. The parts array from `diffWords` is already in reading
order, so the render is a single map with no reordering and no pairing logic:

- a part with neither `added` nor `removed` becomes a plain text run
- a part with `removed` becomes `<del>`, red, struck through
- a part with `added` becomes `<ins>`, green, no underline

Use the real `<del>` and `<ins>` elements rather than styled spans. They are the semantically correct
elements, assistive technology announces them, and the browser's default rendering is already close
enough that a failure to load the stylesheet still reads correctly.

One refinement is worth copying rather than inventing, and it is Pierre's, not jsdiff's.
`pushOrJoinSpan` in `dist/utils/parseDiffDecorations.js` implements what `word-alt` means, being a
heuristic that merges a lone changed character into its neighbouring span so a word diff does not
turn into confetti. `@pierre/diffs` is Apache-2.0, which permits a vendored extract with attribution
and a note of modification, and every file under its `dist/` ships its original TypeScript inside the
`sourcesContent` of its source map, so the algorithm can be read rather than executed. It is about
thirty lines. Tortie already has this precedent twice in `NOTICE`, being the VS Code fuzzy scorer and
two D3 transcriptions.

## 5. The rendering problems that actually bite

### 5.1 Whitespace ownership, and one measured surprise

`diffWords` does NOT round trip the original text. Reassembling the old side from its own change list
on the sample pair produced 120 characters against the original's 121, and the first divergence is at
offset 22, where `private so` came back as `privateso`. The space was assigned to the insertion,
because the rendered run reads `private{+, +}so` and the space belongs to the added comma. Inline
this is invisible and correct. As a data structure it means **the change list is not a lossless
record of the original**, so keep the original string and never reconstruct it from the parts.
`diffWordsWithSpace` and `diffChars` both round trip exactly, and both are worse to read.

The related trap is the one visible in section 3.2, being a newline riding inside a word change as
`[-\njumped-]{+ leapt+}`. A prose surface should normalise line breaks inside a paragraph before
diffing, or it will strike through invisible characters.

### 5.2 Unicode, and the half emoji

`diffChars` and the default `diffWords` both split a zero width joiner family emoji. Diffing
"家族の写真 👨‍👩‍👧‍👦 を見た" against "家族の絵 👨‍👩‍👧 を見た" both returned
`家族の[-写真-]{+絵+} 👨‍👩‍👧[-‍👦-] を見た`, which deletes a joiner and one person out of the
cluster. Struck through, that renders as garbage. The Japanese also has no spaces, so a whitespace
tokenizer sees one enormous token.

`diffWords` accepts an `intlSegmenter` option, and passing `new Intl.Segmenter('ja', {granularity:
'word'})` fixed both at once, returning `家族の[-写真 👨‍👩‍👧‍👦-]{+絵 👨‍👩‍👧+} を見た`, which keeps the
cluster whole and segments the CJK by dictionary. `Intl.Segmenter` is standard in V8 and costs
nothing to construct. Tortie uses it nowhere today.

### 5.3 Cost, and the guard

Measured in node on this machine, with pseudo random three percent word edits:

| case | `diffWords` | `diffChars` |
| --- | --- | --- |
| 500 words | 1.6 ms | 4.8 ms |
| 2,000 words | 1.8 ms | 20.7 ms |
| 8,000 words | 16.4 ms | 390.8 ms |
| 2,000 words, fully rewritten | 373 ms | 4,614 ms |

The last row is the point. Myers is O(ND) in the edit distance, so a character diff over two
dissimilar documents heads for seconds, and it is the same class of problem the tree already records
at `src/renderer/editor/PierreDiff.tsx:35`, where a 10k line file whose every line changed measured
7.1 s. Word level shrinks the token count about fivefold and the edit distance with it.

`diffWords` takes `maxEditLength` and `timeout`, and both return `undefined` rather than hanging,
verified: `diffWords(a, b, {maxEditLength: 20})` on a fully rewritten pair returned `undefined`. A
build should set one, and fall back to a whole paragraph replace when it fires. If a document is
large enough to matter, the off main thread pattern already exists at
`src/renderer/pierre/diff-parse.worker.ts`, which spawns one worker per request, posts, reads one
reply and terminates so cancellation is a hard guarantee.

### 5.4 The structural limit, which is the honest one

An inline redline in one flow can only express changes WITHIN a run of prose. If a paragraph is split
in two, a heading appears, a list item is added or a block moves, there is no inline rendering of
that, and Word itself does not attempt one; it shows those as change bars in a margin. The Wordie
screenshot is one paragraph, which is exactly the case that works.

Tortie's prose is markdown, and markdown has block structure. So a redline over a real document has
to answer what happens at the block boundary, and the honest first answer is to diff block against
matched block, render each matched pair inline, and render an added or removed block whole. Anything
cleverer is a second phase.

### 5.5 The sanitize wall, if the redline ever goes through the markdown pipeline

Rendering the redline as React elements directly, over plain text, never touches this. Rendering it
through the markdown chain does, and the wall is real. `del`, `ins`, `s` and `strike` ARE in
rehype-sanitize's default `tagNames`, so the elements survive. **`className` is NOT in the default
allowlist for `*`**, so a class on them is stripped, and the redline renders as the browser's default
strikethrough and underline with no colour at all and no error anywhere.

`src/renderer/editor/markdown/pipeline.ts` builds `gmuxMarkdownSchema` from `defaultSchema` and adds
exactly `details`, `summary` and a handful of attributes, deliberately not `style`. The answer chain,
`answerRehypePlugins` at line 123 of that file, is the same schema with `rehype-raw` removed, and its
comment says the Phase 137.1 backlog entry forbids `rehype-raw` in the overview's chain forever.
Widening that schema is a change to a wall somebody built on purpose, and it needs its own argument
rather than a line in a diff phase.

### 5.6 Selection and copy

A `<del>` sitting in the flow means selecting the paragraph and copying it yields the old words and
the new words interleaved, which is not what anybody wants on the clipboard. Word solves this with a
view mode. The options are `user-select: none` on the deleted runs, a copy handler that emits the new
text only, or accepting it and saying so. This has not been prototyped and is listed here as a
decision the phase must make rather than discover.

## 6. Where it should live, and where it should not

**Not in Pierre's surface.** Section 2 settles that, and Pierre should stay the code diff.

**Not in Catch Me Up.** `src/renderer/overview/AnswerBody.tsx` renders a single `text` prop, being
one agent answer. There is no before and no after there, so there is nothing to redline.

**The natural home is the markdown tab.** `src/renderer/editor/EditorPanel.tsx:699` to `:720`
already carries the mode switch that decides between Monaco as Source and a rendered form as
Preview, choosing `MarkdownPreview` for a `.md` tab. A Redline mode is a third arm of that same
switch, mounted for a markdown tab that has two versions. That is the place where the operator
actually meets rewritten prose, being a document an agent just rewrote in his repository, and today
it opens as a code diff and reads like code.

Two consequences follow from the house rules. A phase adding that surface updates the native menus in
the same commit, because a new user facing surface always does. And it says nothing about panes,
because the mode is called Redline and not anything tmux shaped.

## 7. What it costs as a phase

**Tier 2.** It is a rendered surface with no new durable state, it spawns nothing, it holds no
credentials and it sends nothing anywhere, which is the Tier 2 row exactly. It is Tier 3 the moment
it touches `gmuxMarkdownSchema`, because that is a security wall, and the recommendation in section 9
is written to avoid needing to.

The independent methods this earns, and a verifier should name which it used: **re-derive
independently**, by running `git diff --word-diff=porcelain` over the same pair and comparing the
runs against what the component drew, which is a genuinely different implementation already on the
machine and costs 12.3 ms; and **write a hostile fixture**, being a paragraph carrying a zero width
joiner emoji, combining marks, a right to left run, a 1,200 character single line, and two entirely
unrelated documents, because every one of those has a named failure above.

The work, honestly sized:

- a diff module, being the `diffWords` call, the `Intl.Segmenter`, the whitespace normalisation and
  the `maxEditLength` guard, at roughly sixty lines
- the component and its colocated CSS, at roughly a hundred and twenty lines
- the mode wiring in `EditorPanel.tsx` and the native menu entry
- one line in `package.json` dependencies, and a BSD-3-Clause section in `NOTICE`
- no new token in `tokens.css`

## 8. What was NOT verified, and a builder may not pretend otherwise

- **Nothing was rendered.** No Electron was launched and no browser drew anything. Every claim about
  how `<del>` and `<ins>` reflow, how the colours read against Tortie's background, how the selection
  behaves and how a screen reader announces the pair is from the specification and from experience,
  not measured in Tortie's renderer. The whole visual result is unproven.
- **`Intl.Segmenter` was exercised in node 22, not in Electron.** `package.json` names
  `electron ^43.3.0`. The API is long standing in V8 and its absence would be surprising, but it was
  not run inside the app.
- **The bundle cost of importing `diffWords` was not measured.** Only `diffWordsWithSpace` and
  `diffChars` are in the shipped chunks today, so `diffWords` and its whitespace helpers would come
  back in. Nobody built the tree to find out what that adds.
- **Which build vite would resolve was not confirmed.** The `exports` map in
  `node_modules/diff/package.json` sends an `import` to `./libesm/index.js`, so that is what should be
  taken, but no build was run to prove it.
- **No redline was run over a real before and after pair from his own repository**, only over
  hand written sentences and generated word sequences.
- **The block level story of section 5.4 is a sketch.** No block matching was implemented or measured,
  and the cost of matching paragraphs across a rewritten document is unknown.
- **The copy and selection behaviour of section 5.6 was not prototyped at all.**
- **Pierre's `unsafeCSS` was read, not exercised.** The claim that a stylesheet injected through it
  reaches the shadow root comes from `dist/utils/cssWrappers.js:14` and not from a running page. It
  does not matter to the recommendation, because that path is rejected anyway.
- The performance table in section 5.3 is one machine, one run each, node rather than Electron, and a
  pseudo random edit pattern rather than a person's editing.

## 9. Recommendation

**Build the narrow version.**

Build a Redline mode for a markdown tab that has an old and a new version, over `diffWords` with an
`Intl.Segmenter`, rendered as Tortie's own React `<del>` and `<ins>` in a proportional font over
PLAIN TEXT, with block structure changes shown as a whole paragraph replaced rather than pretended
inline. Colour it from `--error` and `--success`, which already exist. Declare `diff` in
`package.json` and add the BSD section to `NOTICE`, which is owed today regardless.

The reason to build it is that the hard half is already installed, already licensed, already
executing in the renderer, and already producing the exact output shape on the first attempt. What
remains is a hundred lines of Tortie's own rendering, which is the kind of code the project is
supposed to own. It also serves the actual workflow rather than IDE parity: an agent rewrites a
document, and the operator currently reviews that prose in a code diff.

The reason to keep it narrow is sections 5.4 and 5.5. Redlining RENDERED markdown means answering the
block structure question and widening a sanitize schema that Phase 137.1 deliberately narrowed, and
each of those deserves its own argument rather than riding along. Plain text first proves the effect
he asked for at Tier 2. If the plain text version reads well, the rendered markdown version is the
next phase and it starts from a working component instead of a screenshot.

**Do not** put this anywhere near Pierre, and do not spend a round trying to make `lineDiffType`
produce it.
