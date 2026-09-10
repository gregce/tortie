# Research 113 — Phase 249's measure step: the room the redline is in

**Phase 249 is research only and builds nothing.** This document is the first of its three
products, being the measurement. No file under `src/` was touched by this step, and none may be
touched by the next one either until the operator has chosen.

The operator asked on 2026-09-09:

> for our redline view, I feel like we could have more space and affordance in it and make it much
> more beautiful. Can we research and then build something with impeccable [taste] to improve it.

He then sent a screenshot, and the backlog entry reads five faults out of it. This document measures
all five off the running app, reads the constraints out of the tree rather than assuming them, names
what cannot be fixed and why, and ends with three directions and one recommendation. **Impeccable is
his judgement and not this document's**, so nothing below is presented as inevitable.

---

## 0. The instrument, and what it refuses to touch

`build/p249/probe-p249-room.mjs`. One Electron through `build/electron-run.mjs` on a scratch
profile with a scratch `HOME` and this run's own tmux socket, ended and unlinked in a `finally`. It
spawns no agent, spends no token, opens no keychain, makes no request and touches no machine. The
"agent" that writes the new version of the fixture from outside is a plain `/bin/sh`. The operator's
own `-L gmux` sessions were counted before and after: **30 and 30.** `--self-test` proves its
nineteen graders and launches nothing. Its readings are committed at `build/p249/out-room.json` and
`build/p249/analyse.mjs` prints the tables below from them.

**The fixture is this document's own, never his.** No path of his, no content of his and no
screenshot of his is reproduced anywhere here. It is a 3,202-byte markdown note with:

- two paragraphs edited word by word;
- a **markdown table** whose columns went from four to five and whose rows were reordered, which is
  fault 3's own condition, being that the whole table really did change;
- one paragraph whose two sides **share no word at all**, long enough that the word-level edit
  distance passes `REDLINE_MAX_EDIT_LENGTH`, so `redline-document` draws the block whole. That is
  the only shape in which one marked run spans many wrapped lines, and it is the shape of his
  screenshot.

The window is 1920 × 1200 with `innerWidth` 1920, `devicePixelRatio` 2, `prefers-reduced-motion:
reduce` emulated. Three pane widths, reached by dragging the real editor divider:

| asked | `.ed-panel` clientWidth | `.ed-redline-scroll` clientWidth |
| --- | --- | --- |
| 1350 | **1349px** | 1339px |
| 700 | **699px** | 689px |
| 320 | **319px** | 309px |

319px is the panel's own floor (`EDITOR_MIN` 320 less `.ed-panel`'s `border-left`), which is the
same floor research 96 §4.1 read, so the narrow column here is directly comparable to Phase 236's.

**One instrument note, recorded because it will bite the next probe.** Folding the pipe-glyph walk
into the main ruler made `Runtime.evaluate` come back with the number `0` rather than the object the
function returns, at every pane width, with the whole body inside a `try`/`catch` that never fired,
and with the identical code returning the right answer under plain node. As its own expression it
answers correctly. Whatever that is, it is the instrument and not the product, and the reading is
split in two.

---

## 1. FAULT 1 — the measure wastes the pane

`redline.css:114` is `max-width: 68ch; margin-inline: auto`, the same pair `markdown.css:35` uses.
Measured on the live element:

| | 1349px pane | 699px pane | 319px pane |
| --- | --- | --- | --- |
| computed `max-width` | **556.816px** | 556.816px | 556.816px |
| `.ed-redline-doc` box | 556.81px | 556.81px | 309.00px |
| padding inline (each side) | 24px | 24px | 24px |
| **text column** | **508.81px** | 508.81px | 261.00px |
| free space left / right | 391.09 / 401.09px | 66.09 / 76.09px | 0.00 / 10.00px |
| **dead space** | **782.19px = 58.42%** | 132.19px = 19.19% | **0.00px = 0.00%** |
| document height | 1847.96px | 1847.96px | 3220.46px |
| drawn line boxes | 83 | 83 | 147 |

**The 68ch box does not deliver 68 characters.** The `ch` unit computes at 8.1885px here
(556.816 ÷ 68) and the advance of a `0` measured inside the document is 8.1123px. The 48px of
padding is *inside* the max-width, so the text column is 508.81px, being **62.1 characters** by the
unit and 62.7 by the measured advance. That is inside the 45–75 range a prose measure is normally
held to, and it is one reason the measure is not simply wrong.

**What is wrong is the room.** At the pane he works in, 58.42% of the scroller is empty canvas, and
the free space is split 391.09px left and 401.09px right, so neither side is doing anything.

**And the column is not full either.** Averaged over every drawn text row, the mean row uses
**74.9%** of the column at 68ch. Short lines — the heading, every table row — are why.

### 1.1 What more measure would buy, read rather than argued

`max-width` was set inline on the live element one value at a time and the document re-measured at
each, then removed. The last row is the control: with the inline style removed the reading returns
**byte for byte** to the 68ch row, so the sweep is reversible and the instrument is sound.

| `max-width` | text column | line boxes | document height | mean row fill | wrapped marks | mark fragments |
| --- | --- | --- | --- | --- | --- | --- |
| **68ch (shipped)** | 508.81px | 83 | **1847.96px** | 74.9% | 10 | 138 |
| 76ch | 574.32px | 75 | 1676.40px | 73.4% | 7 | 131 |
| **84ch** | 639.83px | 70 | **1569.17px** | 70.6% | **6** | 127 |
| 92ch | 705.34px | 66 | 1483.39px | 67.9% | 7 | 125 |
| 100ch | 770.84px | 62 | 1397.61px | 66.2% | 9 | 125 |
| 120ch | 934.62px | 55 | 1247.49px | 61.5% | 5 | 116 |
| none (fills the pane) | 1291.00px | 47 | 1075.93px | **52.1%** | 5 | 111 |
| RESET | 508.81px | 83 | 1847.96px | 74.9% | 10 | 138 |

84ch costs 9 characters over the comfortable prose measure and buys **15% less document to scroll**
and **four fewer wrapped marks**. Letting the document fill the pane buys 42% less height and costs
a mean row fill of 52.1% and a prose line of up to 158 characters, which is not a reading measure at
all.

**No single measure removes the dead space at a 1349px pane.** Even 84ch leaves 651.17px, being
48.6% of the scroller, empty. That arithmetic is what decides between the directions in §9.

---

## 2. FAULT 2 — a wrapped change becomes a stack of tiles

Counting `.ed-redline-change` wrappers, `<del>` and `<ins>`, and the distinct line boxes each sits
on (client rects bucketed by their top to 0.5px):

| | 1349px | 699px | 319px |
| --- | --- | --- | --- |
| changes | 50 | 50 | 50 |
| changes that wrap | **18** | 18 | **23** |
| client rects over all changes | 138 | 121 | 146 |
| widest change, in line boxes | **37** | 37 | **74** |
| `<del>` that wrap / fragments | 5 / 68 | 5 / 68 | 7 / 89 |
| `<ins>` that wrap / fragments | 5 / 70 | 5 / 70 | 9 / 92 |
| widest `<del>`, in line boxes | **19** | 19 | **38** |
| widest `<ins>`, in line boxes | 19 | 19 | 37 |

The widest mark is the paragraph the caps refused: the note row says *"1 change drawn whole rather
than word by word (1 rewritten)."*, which is `redline-document`'s "a block the caps refuse draws
whole" path. **One `<del>` of 19 fragments followed by one `<ins>` of 19, at the pane he works in,
and 38 and 37 at the floor.**

### 2.1 What actually makes it read as damage

Three readings, and only the third is the culprit:

- **`box-decoration-break` computes `slice`**, not `clone`. So the 2px `--r-xs` radius is applied to
  the whole inline box and then sliced: the first fragment is rounded at its left, the last at its
  right, and the eighteen between are square. The corners are not the fault.
- **The fragments are not ragged on the left.** Over the 19 fragments of that `<del>` there is
  **one distinct left edge** and 19 distinct rights, with the rights spread over 262.68px. That is
  the shape of a paragraph — flush left, ragged right — and it is the correct shape.
- **The washes do not touch.** Each fragment paints **15.00px** tall while the line pitch is
  **21.45px** (`line-height: 1.65` on 13px). So there is a **6.45px unpainted band of canvas between
  every pair of stacked fragments**, at every width. Nineteen 15px bars separated by nineteen 6.45px
  gaps is exactly "a stack of ragged tiles", and it is the only thing in this reading that produces
  one.

**The chip's ring makes a second stack on top of it.** `.ed-redline-change[data-current]` carries
`outline: 1px solid var(--accent)` with `outline-offset: 1px` and an inset `box-shadow`, and
Chromium paints an outline once per inline fragment. On the widest change that is **37 outlined
boxes at the wide pane and 74 at the floor**, one per visual line. Phase 227's own comment calls
that "the right picture"; his screenshot is the same picture being called damage.

---

## 3. FAULT 3 — a markdown table is drawn as prose

The fixture's table is **6 of the file's 23 lines and 246 of its 3,202 bytes, being 7.7% of the
file.** What it costs, by baseline offset rather than by a text heuristic:

| | 1349px | 319px |
| --- | --- | --- |
| changes whose offset is inside the table | **26 of 50 = 52%** | 26 of 50 |
| mounted elements inside those changes | **76 of 195 = 39%** | 76 of 195 |
| client rects for those changes | 52 | 37 |
| vertical span of the table's marks | 250.90px of 1847.96px = 13.6% | 358.12px of 3220.46px |
| pipe glyphs drawn | 36 | 36 |
| marks carrying a newline | 10 | 10 |

**7.7% of the file produces 52% of the changes and 39% of the mounted elements.** Two of the marks
are pure punctuation with nothing in them a reader can use: `ins "\n|"` and `ins " --- "`. The
separator row really is drawn as a marked box of dashes, and it is drawn that way because the whole
table changed and there is nothing else the word tokeniser can say about `| --- | --- |` becoming
`| --- | --- | --- |`.

**Row identity is destroyed.** The composer diffs one flat character stream, so the tokeniser pairs
words across row boundaries: in the fixture, `Sessions` was matched against `Ledger` and `tmux`
against `SQLite`, which are different rows of a table whose rows were reordered. A reader is shown a
word-level edit between two cells that have nothing to do with each other. Nothing is broken; the
question the tokeniser was asked has no good answer.

**Phase 246 correctly does not help.** `slideBoundaries` is a tie-breaker for a change block whose
two sides do not resemble each other followed by a pure insertion, and the table is neither: both
sides really changed.

---

## 4. FAULT 4 — the controls sit on top of the text

Read with a change made current through the real ⌥↓ chord.

| | 1349px | 699px | 319px |
| --- | --- | --- | --- |
| `.ed-redline-chip` | 258.28 × 30.00 | same | same |
| chip as a share of the scroller | **19.29%** | 37.49% | **83.59%** |
| drawn text rows the chip covers | **1** | **2** | **2** |
| chip's gap above the change's first rect | 4.00px | 4.00px | 4.00px |
| chip's right edge vs the view's | 1282.59 vs 1920.00 | 1675.09 vs 1920.00 | **1920.28 vs 1920.00** |
| `.ed-redline-bar` | spans the **whole panel**, 1349px | 699px | 319px |
| `Accept all` button | 1850.23..1914.00 | 1850.23..1914.00 | 1850.23..1914.00 |
| `Accept all`'s left edge, relative to the column's own content edge | **+355.32px** | +30.32px | −35.77px |

Three things follow, each a number rather than an impression.

**The chip always occludes the person's text.** It is out of flow by design — research 83 D.3
accepted exactly that placement because it moves the document by 0.00px — but "does not move the
text" is not "does not cover the text". It covers one drawn row at the wide pane and two at the
other two, every time it is shown.

**`Accept all` is orphaned, and it gets worse as the pane grows.** The bar is
`justify-content: flex-end` against the **panel**, while the column is centred inside it, so the
button's distance from the column it acts on is exactly the right-hand dead space: 355.32px at
1349px, 30.32px at 699px, and at 319px it sits over the column because there is no dead space left.
The fault is not the button's placement; it is that the bar and the column are measured against
different boxes.

**At the floor the chip is nearly the whole pane.** 258.28px of a 309px scroller, with its right
edge 0.28px past the view.

---

## 5. FAULT 5 — the highlight crosses the gutter rule

### 5.1 There is no rule element, and that is measured

Every element inside `.ed-redline-view` was asked for a left or right border width. **At rest, with
no chip drawn, the answer is zero elements.** The only bordered thing in the view is
`.ed-redline-chip` itself, and only while it is drawn. The Redline view draws no gutter, no line
numbers and no vertical hairline anywhere: `RedlineDocument`'s own header says so and the DOM agrees.

**Nor is the redline in the diff view any more.** Driven into Diff mode at the wide pane: **0
annotation rows**, two Pierre gutters whose computed `border-right` is `0px none`. `PierreDiff.tsx`
records that Phase 191's annotation row was taken out at the operator's own word on 2026-09-01, and
`conformance:redline` rule 7 fails the build if any redline module is named from that file or from
`DiffControls`.

### 5.2 The rule he is looking at is the table's own closing `|`

Every `|` glyph in the document was measured one character at a time through a Range: **36 glyphs on
12 drawn rows** at the wide pane. In markdown source those closing pipes stack into a vertical line
down the right of the table, and it is the only vertical line the view draws near a mark.

**Of the 52 mark fragments that sit on a table row, 16 pass that row's own closing pipe and 36 stop
before it.** Nine of the sixteen are red and **seven are green**, which is his sentence exactly. The
overhangs, by what the mark holds:

| the mark | how far past the closing pipe |
| --- | --- |
| `del "\n"` | +5.29 to +5.30px |
| `del " "` | +8.87 to +8.88px |
| `ins "\n"` | +10.87 to +10.88px |
| `ins "\n\|"` | +4.29px |
| `ins " rebuilt on open \|"` | **+68.61px** and +4.30px |

And **6 of the 36 pipe glyphs are drawn inside an `<ins>`**, so at those six the green wash covers
the rule rather than crossing it.

### 5.3 The rule that decides, re-derived a second way

Independently of the pipes, every mark fragment's own last drawn character was read by walking a
Range one character at a time and bucketing by line, then compared with the column's content edge:

| | 1349px | 699px | 319px |
| --- | --- | --- | --- |
| fragments past the column's content edge | 2 of 138 | 2 of 138 | 13 of 181 |
| worst overhang | 2.47px | 2.47px | **3.45px** |
| **crossers whose last character is whitespace** | **2 of 2** | 2 of 2 | **13 of 13** |
| crossers whose last character is visible | **0** | 0 | **0** |
| non-crossers ending on whitespace | 70 | 70 | 102 |

**Fifteen crossings out of fifteen end on whitespace, and not one fragment ending on a visible
character crosses anything.** The mechanism is `white-space: pre-wrap`: a preserved space or newline
at a wrap point is painted and hangs past the last glyph, and the wash is painted with it. A run
whose last drawn character is a letter stops where the letter stops. That is the rule, and it holds
on both readings.

---

## 6. Which of the five is worst

**By his own words, and his order was space, then affordance, then beauty.**

1. **Fault 1 is worst.** He said "more space" first, and it is the largest number in the document:
   **58.42% of the pane he works in is empty canvas.** Every other fault is made worse by it — the
   bar's button is 355.32px from the column *because* of it, and the document is 1847.96px tall
   instead of 1569.17px *because* of it.
2. **Fault 4 is second**, because "affordance" was his second word and because the two readings are
   unambiguous: the chip covers one or two rows of his prose every time it appears, and the accept
   control's distance from the thing it accepts is the dead space itself.
3. **Fault 3 is third by his ordering and first by cost.** This document records the dissent rather
   than hiding it: 7.7% of the file produces 52% of the changes and 39% of the mounted elements, and
   a reader is shown word-level edits between cells from different rows. It is the fault that makes
   the view *wrong* rather than *ugly*. It is placed third only because he asked for space and
   affordance ahead of beauty, and the build phase may reasonably be told to invert this.
4. **Fault 2 is fourth.** The 6.45px unpainted band between stacked fragments is real, it is one
   number, and at 19 and 38 fragments it is very visible — but it is a wash geometry problem on one
   shape, the block the caps refused.
5. **Fault 5 is last.** It is real and now exactly explained, but the overhangs are 4.29 to 10.88px
   against a pipe and 2.47 to 3.45px against the column edge, and 36 of 52 fragments on a table row
   are already correct. It is also mostly a *consequence* of fault 3: it happens on table rows,
   where marks carry newlines and trailing spaces.

---

## 7. The constraints, read out of the tree

### 7.1 What ruling 4 costs — and it has moved

Ruling 4 of `redline.ts` says the caps are required rather than advisory because
`dist/react/utils/renderDiffChildren.js` maps over `lineAnnotations` unconditionally, so every
annotation's React subtree mounts whether or not its row is on screen. That is still true of the
library — the map is there, `lineAnnotations?.map((annotation, index) => …)` with no window — **but
nothing in `src/` passes `lineAnnotations` or `renderAnnotation` any more.** The three surviving
mentions are all prose in comments. Ruling 4's *reason* no longer describes the shipping surface.

**Its effect is worse than it was, not better.** The Redline view has no virtualizer of any kind:
`DocumentRuns` walks every run of the whole document and emits one element each, so the entire file
is mounted. Measured on a 5,236-character document: **195 elements and 145 text nodes inside
`.ed-redline-doc`, 205 in the view.** The only bound is arithmetic, not measured:
`REDLINE_MAX_BLOCKS` is 60 and `REDLINE_MAX_EDIT_LENGTH` is 200, so a worst-case file mounts on the
order of 60 × 2 × 200 elements before the unchanged runs between them are counted.

**The rule a direction must obey:** anything that adds DOM per change multiplies against a document
that is entirely mounted. An overlay per *fragment* is worse still, because the fixture's 50 changes
already carry 138 client rects at the wide pane and 146 at the floor.

### 7.2 What ruling 6 forbids

The order of the runs is jsdiff's own and is not always a pair. In this fixture, **10 of the 50
changes are not a replacement**: 8 are insertion-only and 2 are deletion-only. A design that draws
each change as "the old words, then the new words" side by side, or that pairs a deletion with an
insertion, is drawing a diff nobody computed, and it would have nothing to put in half of one column
ten times in fifty. This binds every direction below and none of them re-opens it.

### 7.3 What Phase 236 decided about where the chip belongs

Its four rulings stand and this document re-measured the one that constrains the room:

- A control per change **in the flow** is refused: 45.12px of sideways push at every change.
- A **margin gutter** is refused: research 96 §4.1 measured 0.00px of free space left of the column
  at the panel's floor, and **this run re-measured exactly 0.00px at 319px.** A margin control has
  nowhere to be at the floor.
- A hover-or-focus **out-of-flow overlay** is accepted, because it moves the document by 0.00px.
- The anchor is `getClientRects()[0]` and **never** `getBoundingClientRect()`, because a wrapped
  change's union rect sat 435.73px to the left of where the change starts at a wide pane.

Phase 239 moved what the chip is anchored *to* — `[data-current]`, which the render puts back — and
not where it sits. Phase 238 put `Accept` on the chip at ⌥↩ and deliberately gave accept-all **no
chord**, because asking once needs a dialog and rule 9 forbids the redline reaching an invoke
channel. **The chip's placement rule is not this phase's to re-open; the room around it is.**

### 7.4 What the gates will refuse

- **`conformance:redline` rule 8** fails the build on any colour literal in `RedlineRow.tsx`,
  `RedlineDocument.tsx`, `redline.css` or `redline-chip.tsx`. Tokens only, with no exception for a
  mock's sake.
- **`conformance:redline` rule 9** allows the redline exactly one guarded write at one call site,
  and derives its file set from every file under `src/renderer/editor` named `redline*`, `Redline*`,
  `rewind.ts` or `baseline.ts`, with a floor of 21. A new file in that family raises the floor in the
  same commit.
- **`conformance:hue` rule 26** forbids a colour literal outside the six theme constant places over
  1,236 files, and **rules 22 and 23** walk every rule on the light base as well as the dark one.
- **The redline's own two colours are pinned by nothing.** `--error` and `--success` are in
  `CONTRAST_CHROMA`, so the contrast level multiplies their chroma, and the canvas under them is on
  the ramp, so the hue and the two frame sliders move it — but neither appears in `CHROMATIC_PINS`
  or in either status list, so **no floor is asserted on a deletion or an insertion against any
  ground, at any hue, contrast level or frame.** Their resting ratios, computed with culori:

| | on its own wash | on the plain canvas | the wash against the canvas |
| --- | --- | --- | --- |
| `--error` on dark | **4.837** | 5.574 | **1.152** |
| `--success` on dark | 6.987 | 8.545 | **1.223** |
| `--error` on paper | 4.840 | 5.869 | 1.213 |
| `--success` on paper | 5.106 | 6.054 | 1.186 |

  Two things follow. **The wash is decoration and not the carrier of meaning** — 1.15:1 and 1.22:1
  are below every floor in the product, so a design that leans on the wash alone to tell a deletion
  from an insertion is leaning on a difference that is not there. And **adding a pin is not free**:
  Phase 218 measured a 3:1 pin added with a shipped hex collapsing the offered frame region from 35
  cells to 16 with the default outside it, so any direction that promotes the wash to a
  meaning-carrier owes a solve, not a declaration.
- **Phase 248 owns `markdown.css:35`.** Nothing here touches the preview's measure.

---

## 8. What cannot be fixed, and why

Each is a refusal with its reason, so a later round does not spend itself on one.

1. **A wrapped mark cannot be drawn as one continuous rounded shape by CSS.** An inline box that
   breaks paints one background box per fragment; `box-decoration-break: clone` would give **every**
   fragment all four rounded corners, which is more tiles rather than fewer. A shape that follows the
   run — flush left, ragged right, one outline — needs either one absolutely positioned box per
   fragment or an SVG path computed from `getClientRects()`, recomputed on every reflow, for every
   change. Against §7.1's numbers that is 138 to 146 extra positioned boxes on a 50-change fixture.
   **What is fixable is the 6.45px band**, by painting the wash over the line box rather than the
   font box; the cost is that adjacent marked lines touch, so the ends stop being readable as ends.
2. **A change is not always one place on the page.** Ruling 6 plus the 10-of-50 reading above means
   "one shape per change" is sometimes two shapes with unchanged words between them, and no drawing
   makes that untrue.
3. **The table cannot be shown as a table.** `RedlineDocument` draws a markdown file's redlined
   **source** by an explicit decision the operator confirmed, and its own header says rendering
   markdown with marks inside it is a different and much harder feature. Aligning the source's
   columns is reachable; rendering the table is not, and it is not this phase's to re-open.
4. **The overhang cannot be removed by dropping `pre-wrap`.** `redline.css` records that `pre-wrap`
   is "the one rule the projections depend on": the drawn runs with the insertions removed are the
   old file byte for byte. Collapsing whitespace would make the picture lie about spacing changes.
   **What is fixable is the paint**: the projection is read at the leaves from text content, so
   splitting a mark into its words and its trailing whitespace, or not painting a wash on a
   whitespace-only run, changes no projection. The cost is more leaves, against §7.1's bound.
5. **Nothing new may be put inside `.ed-redline-doc`.** Four readers walk that element — the copy
   handler's clone, the shot probe's `leavesOf`, and the two projection tests' parsers — and each
   would read an inserted label as a run. That is why the chip lives outside it, and any counter,
   index or rail this phase proposes lives outside it too.
6. **The dead space cannot be removed by a measure alone.** §1.1's arithmetic: even at 84ch, 48.6%
   of a 1349px pane is empty, and the measure that fills it gives a 158-character prose line and a
   mean row fill of 52.1%.

---

## 9. Three directions, and a recommendation

**The work for faults 2, 3 and 5 is the same in all three**, so the choice below is only about where
the room goes. That common work, priced against the readings above:

- **Fault 2** — paint the wash over the line box so the 6.45px band closes, and draw the current
  change's ring as one shape per *line run* rather than one per fragment.
- **Fault 3** — treat a run of table lines as a block of its own: align the source's columns, diff
  it row against row rather than as one flat stream so `Sessions` stops being paired with `Ledger`,
  and draw the separator row as unchanged furniture rather than as a mark. This is the item with the
  largest measured cost and the largest risk, and it is the one to cut first if the phase is
  over-scoped.
- **Fault 5** — do not paint a wash on a run that is only whitespace, and split a trailing space or
  newline out of the mark that carries it. Both are leaf-level and change no projection.

### Direction A — widen the column, leave the controls where they are

The Redline gets a measure of its own, wider than the preview's, and keeps everything else.

- 84ch is the measured sweet spot: **1569.17px instead of 1847.96px** to scroll, 70 line boxes
  instead of 83, 6 wrapped marks instead of 10.
- *Trade in one clause:* it is one line of CSS and it still leaves 48.6% of his pane empty, so it
  answers "space" arithmetically and not visibly.

### Direction B — keep the measure, put the room to work

68ch stays exactly as it is, and the left-hand dead space becomes a rail carrying the change index
and the accept-all, with the chip's verbs moving into it at panes wide enough to hold it.

- It answers fault 4 completely: the accept control stops being 355.32px from the column because it
  stops being measured against the panel, and the chip stops covering a row of prose.
- *Trade in one clause:* at the 319px floor there is 0.00px of free space, so a second layout exists
  for narrow panes and both must be kept true.

### Direction C — widen the column **and** put the room to work

84ch plus a rail: a 687.83px document box beside a rail of about 260px is roughly 948px of a 1349px
pane, taking the dead space from **58.42% to about 29%** while keeping a real reading measure.

- *Trade in one clause:* it is both pieces of work and both layouts, so it is the most expensive of
  the three and the one most likely to need a second round.

### The recommendation, and it is a recommendation

**Direction C**, with the common work, and with fault 3 built first inside it.

The reasons are the numbers rather than taste. He asked for space before anything else, and A alone
moves 58.42% to 48.6%, which he will not see. B alone answers affordance and leaves the space
complaint standing. C is the only one whose arithmetic answers the sentence he actually wrote, and
its extra cost is a rail that Phase 236 has already priced the alternatives to.

**But the judgement is his.** If he would rather have one small change that lands this week, A is
honest and cheap and nothing in it forecloses B later. If what irritates him most is the table
rather than the room, the ordering in §6 inverts and the phase should be re-cut around fault 3.

---

## 10. What this document did NOT verify

- **His own file was never opened, and no path or content of his appears here.** Every number is
  taken over this document's own fixture. A fault whose shape depends on his particular prose — a
  much longer table, an aligned table whose closing pipes really do form a straight rule, a file
  where the caps fire on several blocks at once — is not measured.
- **The screenshot was not reproduced.** Fault 5 is explained by two independent readings that agree
  on a mechanism, but the largest crossing measured here is 68.61px past a pipe and 3.45px past the
  column edge. If what he saw is larger than that, this document has found *a* cause and not
  necessarily *his*.
- **No mock was built.** This is the measure step. The mock and the written spec are the phase's
  second and third products and neither exists yet.
- **No colour was solved.** §7.4 states that the redline's two colours are pinned by nothing and
  gives their resting ratios; it does not walk them over the 61,446 derivations `conformance:hue`
  walks, and it does not propose a pin.
- **The directions were not costed in lines.** Each names its trade; none has been prototyped, and
  the rail's behaviour at panes between 319px and the width it needs is unmeasured.
- **One machine, one build, one app launch per reading**, at `dpr` 2, with reduced motion emulated.
  The 1349px pane is a 1920px window, which is not necessarily the window he had.
