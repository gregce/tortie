# Research 110 — Phase 246's measure step: the block that gave up

Written 2026-09-09, before a line of product code changed, at `20e74e89`. This is the MEASURE step
of Phase 246. It repairs nothing. It reproduces both of the operator's pictures over his own bytes,
names the cause with numbers, answers the entry's question 3 off the running app, re-derives ruling
4's timing rather than quoting it, and prices one mechanism without building it.

**The headline, and the entry's hypothesis is refuted.** It is not `REDLINE_MAX_EDIT_LENGTH`, it is
not `REDLINE_MAX_BLOCK_CHARS`, and it is not the patch grouping in `../pierre/diff-metadata`. Every
cap in this feature passed with room to spare, `diffWords` answered, `exactRuns` did not refuse, and
the surface said nothing because by its own accounting nothing was skipped. **The line partition
paired two different paragraphs with each other**, and it did so because jsdiff's `diffLines` had a
choice between two shortest edit scripts of exactly the same length and took the one that reads as a
rewrite. Over a synthetic corpus it takes that half of the tie **8 times out of 8** when a paragraph
is inserted ABOVE an edited one, and **0 times out of 8** when the same paragraph is inserted below
it, which is exactly the difference between his good picture and his bad one.

## 0. What he measured, and the two pictures

On 2026-09-09, in one session on one file, `~/agent-browser/test2.md`:

- **The good picture.** Deleting `micro` from `micro-decisions` drew an inline word-level
  strikethrough over `micro` and nothing else.
- **The bad picture.** He then inserted a NEW PARAGRAPH ABOVE it, and the paragraph below was drawn
  as a whole-paragraph deletion in red followed by the whole paragraph again in green. A reader
  cannot see which word moved.

## 1. The fixture is his own bytes, and where they came from

`test2.md` is no longer in `~/agent-browser`. His Tortie baseline record still holds two whole
copies of it, and they were read READ ONLY and never written:

```
~/Library/Application Support/Tortie/gmux/baselines/fc93ae1a92713efe-61415855ea6df82e.json
  repoPath /Users/gdc/agent-browser  relPath test2.md
  generation 11  1,444 bytes  origin accept  acceptedAt 1788976532785
  generation 12  1,616 bytes  origin accept  acceptedAt 1788976533906
```

Generation 11 against generation 12 is a **pure two-line insertion** and nothing else: the paragraph
beginning *"What context do agents need?"* with the blank line under it, at line 6, 1.1 seconds apart
on his clock. That is his inserted paragraph, byte for byte, and it is what the fixture uses.

Four fixture files under `build/fixtures/redline-p246/`, and every byte in them is his except the
two single words this phase deletes to make his edits:

| file | what it is |
| --- | --- |
| `old.md` | generation 11 with `-decisions` restored to `micro-decisions`, being the side before his edit |
| `new-good.md` | generation 11 exactly, being `micro` deleted — HIS GOOD PICTURE |
| `new-bad.md` | `new-good.md` with his own inserted paragraph placed above the paragraph below it, and one word (`simple`) deleted from that paragraph — HIS BAD PICTURE |
| `new-insert-only.md` | generation 12 exactly, being his two recorded baselines as a pair |

**What could not be reconstructed, stated rather than smoothed over.** His sentence names the changed
word as `a simple phrase` becoming `a  phrase`, and that string lives INSIDE the paragraph generation
12 records as inserted whole, so no baseline generation this machine still holds carries it on the
left. Generations 1 to 10 are gone. So the fixture reproduces the SHAPE he described — a paragraph
inserted above a paragraph changed by exactly one word — with his own paragraphs and his own
sentences, and the one-word deletion is `simple` out of *"It's a simple, disciplined flow"*, which
leaves the same doubled space his own text carries in two other places. Everything below is measured
on that, and section 6 shows the shape is what matters rather than the particular words.

## 2. The numbers, taken from the shipping modules

`build/p246/measure-block.mts` imports `src/renderer/editor/redline.ts` and
`src/renderer/editor/redline-document.ts` rather than a copy, and prints the whole reading to
`build/p246/out-measure.txt`. It launches no Electron and spawns nothing. **Edit distance is not
counted by hand**: it is the smallest `maxEditLength` at which jsdiff still answers, found by binary
search through the shipping tokenizer, which is the distance by definition.

The caps in play: `REDLINE_MAX_EDIT_LENGTH` 200, `REDLINE_MAX_BLOCK_CHARS` 4,000,
`REDLINE_MAX_BLOCKS` 60, `REDLINE_DOC_MAX_LINE_EDITS` 1,000.

### 2.1 The good picture

| | |
| --- | --- |
| line edit distance | 2, against a cap of 1,000 |
| change blocks | 1 |
| old side | 235 characters |
| new side | 230 characters |
| word edit distance | **1**, against a cap of 200 |
| `diffWords` | answered, 3 runs |
| `exactRuns` | 3 runs, no refusal |
| marked runs | one, `del "micro"` |
| `redlineDocumentNote` | `null` |

### 2.2 The bad picture

| | |
| --- | --- |
| line edit distance | 6, against a cap of 1,000 |
| change blocks | 3 |
| block 0 | the `micro` deletion, distance 1, drawn correctly |
| block 1 old side | 312 characters — *"After thousands of hours working this way…"* |
| block 1 new side | 165 characters — *"What context do agents need?…"* |
| block 1 word edit distance | **93**, against a cap of 200 |
| block 1 `diffWords` | **answered**, 19 runs |
| block 1 `exactRuns` | 19 runs, **no refusal** |
| block 2 | old side empty, new side 307 characters — the paragraph below, inserted whole |
| `whole` counters | `{"tooBig":0,"tooDifferent":0,"overCap":0,"unaligned":0}` |
| `approximate` | `false` |
| `redlineDocumentNote` | **`null`** |

The Pierre path in `redlineBlocks` makes the SAME choice: `hunkContent` gives a `change` with 1
deletion and 1 addition pairing those two paragraphs, distance 93, `diffWords` answering with 19
runs, `redlineSkipNote` `null`; and then a separate `type=change` with 0 deletions and 2 additions.
So this is not a difference between the diff view's parser and the document's; both engines slide the
same way.

## 3. So which is it: (a), (b) or (c)

**None of the three. It is a fourth thing, and the deciding numbers are these.**

- **Not (a), `REDLINE_MAX_EDIT_LENGTH`.** The block's real edit distance is **93** against a cap of
  **200**. It passes with **107 to spare**, and `diffWords` returned 19 runs rather than `undefined`.
  Had the cause been the cap, `whole.tooDifferent` would read 1 and the note would say
  *"1 change drawn whole rather than word by word (1 rewritten)"*. It reads 0 and the note is `null`.
- **Not (b), `REDLINE_MAX_BLOCK_CHARS`.** The two sides are **312** and **165** characters against a
  budget of **4,000**. The largest block anywhere in the file is 312.
- **Not (c), the grouping in `../pierre/diff-metadata`.** That module's coarse patch path is reached
  only past `INLINE_PARSE_LINE_LIMIT`, which is 1,200 lines; his file is 17. And the surface he was
  looking at is the Redline DOCUMENT, `composeRedlineDocument`, which never touches Pierre's hunks at
  all — its own header refuses them by name. Both engines were driven anyway, and both mis-slide, so
  the finding is not about either parser.
- **It is the LINE PARTITION's choice of which removed line to pair with which added line.**
  `diffLines` returned this, printed part by part:

  ```
  same  2 lines
  del   1 line   "The bottleneck has moved. …"
  add   1 line   "The bottleneck has moved. …"      (the micro deletion, correct)
  same  2 lines  "\n\n"
  del   1 line   "After thousands of hours working this way, …"
  add   1 line   "What context do agents need? …"    ← the two sides are different paragraphs
  same  1 line   "\n"
  add   2 lines  "After thousands of hours working this way, … \n\n"   ← the real partner
  same  7 lines
  ```

  The removed paragraph's real partner is in the NEXT block, on the far side of a blank line the
  partition matched as unchanged. Measured through the same probe: the two sides of block 1 resemble
  each other by **0.09**, and the removed line resembles the first line of the insertion **one byte
  later** by **0.98**, at a word edit distance of **1** — `del "simple"`, which is the picture he
  wanted.

**And jsdiff is not choosing a longer script.** Both alignments move the same number of lines:
1 deletion + 1 addition + 2 additions = **4 line operations** for the one it took, and 2 additions +
1 deletion + 1 addition = **4** for the one a reader wants. It is a **tie**, and a line diff has no
reason to break it either way.

**Cross-checked against a different implementation, and this is where the obvious repair dies.** The
first draft of this paragraph said git would have got it right through `--indent-heuristic`. It does
not. Run over the same two fixture files, **git 2.50.1 makes exactly the same choice**, and so does
every alternative it offers:

```
$ git diff --no-index --unified=1 old.md new-bad.md
-After thousands of hours working this way, …
+What context do agents need? …
+
+After thousands of hours working this way, … It’s a , disciplined flow …
```

Identical with `diff.indentHeuristic=false`, and identical under `--diff-algorithm=patience`,
`=histogram` and `=minimal`. So this is not jsdiff being worse than git and **swapping the line
differ for a better one fixes nothing**. It is a property of line-level diffing: at the line level
both alignments are equally good, and only something that looks at what is INSIDE the lines can tell
them apart. That is what section 8 prices.

## 4. What a person actually sees, off the running app

`build/p246/probe-p246-note.mjs`, one Electron on a scratch profile with a scratch `HOME` and the
`gmux-p246-<pid>` socket, no agent, no token, no keychain, no request; his own `-L gmux` counted 21
before and 21 after. `--self-test` proves its grader on six fixtures and launches nothing. The full
capture is `build/p246/out-probe-p246-note.txt`.

- **A. The good picture**, opened from HEAD: **1** marked change, `del ["micro"]`, no caps note.
- **B. The bad picture**, the same tab and the same baseline after a `/bin/sh` wrote the file:
  **9** marked changes. The deletions read
  `["micro", "After thousands of hours working this way", "we've adopted a pattern in what worked",
  "It's a simple", "disciplined flow: Plan first.  the plan into clear tasks for", "AI",
  "Execute. Then, update", "living document that acts as the project's memory. We call i…"]`
  and the insertions end with the **whole paragraph again**, 300-odd characters in one `<ins>`. So
  the paragraph below is struck through in pieces interleaved with words from a paragraph it has
  nothing to do with, and then repeated whole in green. That is his picture.
- **The face said nothing.** The only banners present were
  *"Marked since the last commit, until this file's last commit moves."* and
  *"Hover a change to see its controls, or step through them with ⌥↓."* There was no caps note.

## 5. Question 3 answered: does a give-up say so, and where

Ruling 4 ends *"Anything skipped is SAID, through the surface's existing `ed-note` banner, rather
than silently missing."* His screenshot shows no note. The entry allows two explanations, that the
note is per-file and off screen, or that this fallback is not counted as a skip at all.

**It is the second, and there is a third thing worth saying with it.**

- **The note path works and it is on screen.** The probe's control drives a block past
  `REDLINE_MAX_BLOCK_CHARS` on purpose, and the face drew
  *"1 change drawn whole rather than word by word (1 too long)."* Its rectangle: top 812, bottom 848,
  height 36, width 851, in a window 884 tall, `insideDoc: false` — it is a sibling under the
  scroller, pinned at the foot of the pane, not scrolled away with the document. So a note is not
  hiding; there is no note to hide.
- **Nothing was skipped, so there is nothing to say.** `whole` reads all zeros and `approximate` is
  false. Every guard in the feature passed. **The mis-aligned pairing is not a give-up at all** — it
  is `diffWords` succeeding, at distance 93, on a pair of paragraphs that should never have been
  handed to it.
- **And there is a path that draws a block whole and is counted by nothing.** In
  `composeRedlineDocument`, a block with one empty side takes `drawWhole` before any cap is asked and
  increments no counter, which is correct for an ordinary insertion — a paragraph added is one green
  run and there is nothing else to draw. In the bad picture that same path is what emits the second,
  whole-green copy of the paragraph. It is not a defect on its own and it should not grow a note; it
  is named here because a later round reading `whole` as "everything drawn whole" would be wrong.

So ruling 4's promise is intact as written and is not the promise this picture needed. **The
accounting says a picture is fine whenever the arithmetic finished, and the arithmetic finishing is
not the same as the picture being readable.** That is a finding of its own and it is the one a
repair should carry.

## 6. How general it is, measured rather than assumed

The operator saw this once, on one file. A synthetic document of eight paragraphs separated by blank
lines, one word changed in paragraph *k*, and a paragraph inserted either above it or below it,
driven through the shipping partition for every *k*:

| where the paragraph is inserted | mis-aligned blocks |
| --- | --- |
| **above** the edited paragraph | **8 of 8** |
| **below** the edited paragraph | **0 of 8** |

A block counts as mis-aligned when its two sides resemble each other by less than half. The asymmetry
is the mechanism: an insertion above ends with a blank line, the old side has a blank line after its
paragraph, the two blank lines match, and the boundary slides by one paragraph. Inserting below
leaves nothing to slide across. It is not his prose, it is not his file, and it is not rare — **it is
every time**.

## 7. Ruling 4's timing, re-derived on this machine today

Ruling 4 says *"At 400 a pathological 60-block file cost 594 ms; at 200 it costs 199 ms and a
realistic 40-word edit inside an 830-word block is untouched at 1.9 ms."* Re-derived from scratch on
this machine, over the same shape the conformance gate builds (60 blocks, 833 words a side, 3,968
characters a side, the deterministic filler), three runs each, median reported:

| | ruling 4 | measured 2026-09-09 |
| --- | --- | --- |
| pathological 60 blocks at `maxEditLength` 400 | 594 ms | **454.0 ms** (444 / 453 / 454) |
| pathological 60 blocks at `maxEditLength` 200 | 199 ms | **154.7 ms** (154 / 155 / 155) |
| 40-word edit inside an 830-word block at 200 | 1.9 ms | **1.39 ms**, distance 80 |

All 60 blocks give up at both caps, as ruling 4 intends. **The numbers have drifted downward by about
a fifth to a quarter and the RATIO has not moved**: 594/199 = 2.98 then, 454.0/154.7 = 2.94 now. The
shape of the argument that chose 200 is unchanged and the drift is a faster machine, or a faster
jsdiff, or both. **Nothing here argues for moving 200**, and this phase's cause is not the cap, so
question 2 of the entry answers itself: 200 does not move, and the gate's pin does not move with it.

## 8. The mechanism, priced, and NOT built

**The proposal in one paragraph.** After `linePartition` and before any word diff, run a
re-alignment pass over the change blocks: when a change block's two sides resemble each other below a
threshold, and a pure-insertion block reachable across only whitespace-only unchanged text holds a
line that resembles a removed line above it, slide the boundary so the removed line is paired with
that line and the lines that have no counterpart are emitted as their own pure insertion. Every
alignment it produces has the same line-edit cost as the one it replaces — section 3 measures the tie
— so it is a tie-breaker rather than a different diff, it computes no new edit script, and it cannot
reorder anything: the runs inside each block are still jsdiff's own in jsdiff's own order, so ruling
6 stands untouched. It reintroduces nothing ruling 1 exists to stop, because
`composeRedlineDocument` does not normalise newlines away in the first place — that normalisation
lives in `redline.ts`'s block path, which is not the surface here. **What it costs**: one similarity
pass over the change blocks, which is a word-set intersection per line pair and is O(lines) at his
file's scale; a threshold that is a new tuned constant and therefore a new thing to pin in
`conformance:redline`; a possible second word diff per re-aligned block, which is bounded by the caps
that already exist and by nothing else; and the risk that a document of genuinely rewritten
paragraphs re-aligns to something a reader likes less, which is why the threshold must be low and
why the phase's proof needs a corpus and not one file. **A cheaper alternative worth pricing beside
it**: reject the pairing rather than repair it, so a change block whose two sides resemble each other
below the threshold is drawn whole as one deletion and one insertion, counted in `whole`, and named
in the note. That is strictly less work and strictly more honest than what ships today — it would
have turned his bad picture into a red paragraph, a green paragraph and a sentence saying so — but it
gives him no more information than he has now, and the paragraph below would still be drawn twice.
**A third option is already ruled out by measurement**: changing the line differ. Section 3 drove
git's four algorithms over the same two files and every one of them slid the same way, so there is no
better line diff to swap in. **Neither of the two is built here.** The entry's question 1, "should a
block split at a run that is pure insertion", is answered by section 3: the pure insertion is not
inside the block, it is the block next door, so a split cannot reach it and a slide can.

## 9. What was NOT measured

- **His actual session.** Generations 1 to 10 of his baseline are gone, so the exact pair on his
  screen at the moment of the bad picture cannot be reconstructed. Section 1 says what was
  substituted and section 6 is why the substitution does not carry the argument.
- **No product file was changed and nothing was repaired.** The gates were not re-run beyond the
  build, because nothing under `src/` moved.
- **The threshold in section 8 has no measured value.** Section 3's two readings, 0.09 and 0.98, are
  one file's, and a corpus is what would set it.
- **Nothing was measured about the diff view's own redline row**, beyond establishing that
  `redlineBlocks` mis-slides identically. Ruling 7 of the conformance gate means the redline has one
  home and it is not the diff.
- **The rendering cost of the repair is unmeasured.** So is whether a re-aligned document changes the
  change COUNT a person walks with ⌥↓, which it plainly does and which touches Phases 227, 238 and
  243 at their edges.
- **No machine, no ssh, no agent, no token.** His checkout was never written and his live profile was
  opened read only.
