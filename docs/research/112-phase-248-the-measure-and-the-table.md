# Research 112 — Phase 248's measure step: the table that ran out of room

Written 2026-09-09, before a line of product code changed, at `56919837`. This is the MEASURE step
of Phase 248. **It repairs nothing.** It reproduces the operator's picture off the running app at
three pane widths, confirms the cause the entry already names rather than hunting for a new one,
and answers the entry's five questions with numbers: the ceiling, whether a code block travels with
the table, whether the scroller is discoverable, and what breaks first when a full bleed is done
wrong.

**The headline.** `.md-table-scroll` is **509 px wide at every pane width there is** — 620, 1,000
and 1,381 — because it is a child of a 68ch column. His table wants **759.1 px** to seat its
narrowest legible layout, so **two of its five columns are drawn at 0 % on screen** while the pane
around it has **443.2 px of empty canvas**, 221.6 px a side. The shortfall is 250.1 px and the room
is already there. It is not one table: **557 of the 1,900 GFM tables in this repository (29.3 %)
have at least one column cut off in the preview today**, and that is 60 % of every five-column
table and 100 % of every table with eight columns or more.

## 0. What he saw, and what this run reproduced

He opened a `.md` file in Preview with a five-column table. The table was cut off at the fourth
column, several hundred pixels of empty canvas sat either side, the last column could not be read
and nothing on the face said it was there.

The fixture is an `AS-BUILT-ARCHITECTURE.md` of that shape — five columns, `Component` /
`Language / runtime` / `Entry point` / `Documented before?` / `Ships via`, cells carrying paths and
code spans, prose above and below it, a code fence under that. Paths and code spans are what make a
table's min-content width exceed a prose measure: they do not break.

The reading is his picture, and the grader says so rather than the prose saying so. `A6` asserts
five things at once — the pane has room to spare, the table's box is inside the measure, the table
wants more than the box has, at least one column cannot be read, and the document itself does not
scroll sideways — and it is proved on six fixtures under `--self-test`, of which five must fail.

## 1. How it was measured

Two halves, both re-runnable.

**`build/p248/corpus.mjs`** walks every tracked `.md` file (`git ls-files`, so nothing under
`node_modules`, `out/` or `build/vendor` is counted), pulls out every GFM table and every fenced
code block, and can emit the tables back as documents the preview can be pointed at. It launches
nothing and spawns only `git ls-files`. **208 tracked `.md` files, 1,901 GFM tables, 812 fenced
code blocks, 7,579 lines of fenced code.**

**`build/p248/probe-p248-table.mjs`** is the app run: ONE Electron through `build/electron-run.mjs`
on a scratch profile with a scratch `HOME` and its own tmux socket `gmux-p248-<pid>`, ended and
unlinked in a `finally`; `gmux` and `default` refused by name; the operator's own `-L gmux` sessions
counted before and after (**30 → 30**). No agent, no token, no keychain, no request, no ssh, no
machine, no session created, nothing written outside `GMUX_HARNESS_DIR` except the readings and the
log under `build/p248/`. Every reading is taken off the live DOM.

**The pane is set by dragging the editor's own divider, and the window is set once at 1,900 px and
never touched again.** The first version of this probe resized the window instead and was not
reproducible: the sidebar and the project rail collapse and return with the window, so the chrome to
the left of the pane is not a constant, and a run that walks through a narrow window on its way to a
wide one leaves Fill behind for good — `EditorPanel.tsx` says so in as many words, *"Fill mode
cannot outlive the thing it was filling with"*. Three runs landed the same three targets at three
different panes. The divider is the control a person actually uses, it is absolute rather than
relative, and a drag never changes the chrome around it. The widest pane the divider reaches in a
1,900 px window is **1,381 px**, which is why the third width is 1,381 and not 1,400.

**Two measurements mutate the page and put it back.** The natural widths are taken by setting
`width: max-content` and then `width: min-content` on the table and restoring the value that was
there, which is how the layout engine is asked the question rather than the stylesheet being read;
and section 6's three full-bleed spellings are injected as `<style>` elements removed in a `finally`
of their own. **No product file is touched by this phase.**

## 2. Question 1 — the reproduction, at three pane widths

One ch of the prose column, measured rather than assumed: **8.188 px**, so 68ch draws at **556.8 px**
and, `box-sizing: border-box` being global, the text inside it is **509 px** after the
`var(--space-8)` padding either side. One ch of the code fence is **7.225 px** (Menlo at
`--text-sm`).

| | pane 620 | pane 1,000 | pane 1,381 |
| --- | --- | --- | --- |
| `.md-content` drawn width | 556.8 | 556.8 | 556.8 |
| text inside it | 509 | 509 | 509 |
| `.md-table-scroll` client width | **509** | **509** | **509** |
| its `scrollWidth` | 759 | 759 | 759 |
| the table as drawn | 759.1 | 759.1 | 759.1 |
| empty canvas | 63.2 px (10.2 %) | **443.2 px (44.3 %)** | 824.2 px (59.7 %) |
| columns fully readable | 2 of 5 | 2 of 5 | 2 of 5 |
| does the document scroll sideways | no | no | no |

**The table's box does not move.** 509 px at 620, at 1,000 and at 1,381, because `max-width: 68ch`
on `.md-content` is the parent of the scroller and `overflow-x: auto` on the child can only ever
divide up what the parent gave it. Every pixel the pane gains goes to the canvas either side.

**What the five columns actually show**, read off each header cell's rectangle against the box's:

| column | shown |
| --- | --- |
| Component | 100 % |
| Language / runtime | 100 % |
| Entry point | 98 % |
| Documented before? | **0 %** |
| Ships via | **0 %** |

Three columns are cut and **two are not on the screen at all** at every one of the three widths. The
table's own intrinsic widths say why: it needs **759.1 px** for its min-content layout — the width
below which a column has to be cut, because the cells are already wrapping — and **1,041.1 px** to
draw with nothing wrapped. It has 509. **The shortfall is 250.1 px and there are 443.2 px of dead
canvas at his width**, 221.6 a side, so the room the table needs is already on the screen, twice
over, unreachable.

**Is a scrollbar visible at all? Yes, and that is the honest answer.** `.md-table-scroll` reserves
**10 px of layout height** for a horizontal bar (`offsetHeight − clientHeight`), because
`globals.css` styles `::-webkit-scrollbar` and a styled scrollbar in Chromium is a classic one that
takes space rather than an overlay one that does not. Section 5 is about what that bar is actually
worth.

## 3. Question 2 — the ceiling, decided on this repository's own tables

A table may be wider than the measure and it may not be unbounded. The number comes from the
corpus: every one of the repository's real tables rendered by the real pipeline, with each one's
**min-content** width — the width below which a column is cut — read off the layout engine.

**1,900 of the 1,901 tables the scanner found rendered as tables** and were measured; one did not
render as a table and is excluded rather than guessed at.

| percentile of min-content width | px |
| --- | --- |
| p50 | 407 |
| p75 | 535 |
| p90 | 682 |
| p95 | 791 |
| p99 | 1,045 |
| p100 | 1,751 |

**What today's 509 px box costs, over real tables:**

| box width | tables that cut no column | share |
| --- | --- | --- |
| **509 (today)** | **1,343 of 1,900** | **70.7 %** |
| 600 | 1,583 | 83.3 % |
| 720 | 1,755 | 92.4 % |
| 840 | 1,837 | 96.7 % |
| 960 | 1,871 | 98.5 % |
| **1,114** | **1,884** | **99.2 %** |
| 1,200 | 1,892 | 99.6 % |
| 1,751 | 1,900 | 100 % |

**So 557 of 1,900 tables — 29.3 % — are cut today**, and it is not spread evenly:

| columns | tables | cut today | |
| --- | --- | --- | --- |
| 2 | 444 | 17 | 4 % |
| 3 | 769 | 153 | 20 % |
| 4 | 392 | 173 | 44 % |
| 5 | 152 | 91 | **60 %** |
| 6 | 70 | 55 | 79 % |
| 7 | 39 | 34 | 87 % |
| 8 | 16 | 16 | **100 %** |
| 9 | 10 | 10 | 100 % |
| 10 | 5 | 5 | 100 % |
| 12 | 3 | 3 | 100 % |

He opened a five-column table and lost a column because three fifths of the five-column tables in
this repository lose one.

### The cap: 136ch, being 1,113.6 px at the shipped face

**Twice the measure, spelled in the measure's own unit.** Three reasons, and the third is the one
that decides between it and a plain pixel constant:

1. **It clears 99.2 % of the repository's real tables** — 1,884 of 1,900 cut no column. Going on to
   1,200 px buys 8 more tables (0.4 %) and going to 1,751 px, where the last one clears, buys 16
   (0.8 %) at the price of a table three times the width of the prose around it.
2. **The sixteen it does not clear are the ones a cap is for.** Their min-content widths are 1,116,
   1,117, 1,118, 1,142, 1,148, 1,161, 1,184, 1,184, 1,251, 1,273, 1,329, 1,366, 1,501, 1,558, 1,609
   and 1,751 px, and they are 6-, 7-, 8-, 10- and 12-column tables. A twelve-column table drawn
   across a 2,000 px pane is the different unreadable the entry names. They keep the scroller they
   have today, in a box more than twice as wide.
3. **`ch` tracks the measure under a font change; a pixel constant drifts away from it.** The
   measure is 68ch and this is 136ch, so the relationship "a wide block gets twice the prose column"
   survives `--font-ui` moving, which a `1114px` literal would not. The house already spells a cap
   this way: `src/renderer/context/context.css:366` is `max-width: min(44ch, 100cqi - 64px)`, with
   the reason written beside it.

### The pane width at which a table stops growing: 1,152 px

Measured by sweeping the pane under the capped spelling and reading the box at each step:

| pane | 1,040 | 1,060 | 1,080 | 1,100 | 1,120 | 1,140 | **1,160** | 1,180 | 1,200 | 1,220 | 1,240 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| box | 1,002 | 1,022 | 1,042 | 1,062 | 1,082 | 1,102 | **1,114** | 1,114 | 1,114 | 1,114 | 1,114 |

The box is **pane − 38** until it reaches the cap, so growth stops at a pane of **1,152 px** and the
sweep's 20 px step brackets it between 1,140 and 1,160. Below that the table gets the whole pane
minus its gutters; at and above it the table stops and the canvas takes the rest, which is the
behaviour the ceiling exists for. **At his own 1,000 px pane the box is 962 px** — under the cap,
so the cap is not what he meets; the pane is.

## 4. Question 3 — the code block travels with it, and the reason is the corpus

`markdown.css:192` gives `pre` the same `overflow-x: auto` in the same trap, and the answer is not
symmetry. Measured:

- **Today's fence box is 507 px client** (509 less its 1 px borders), and after
  `padding: var(--space-5)` it seats **66 whole monospace characters** at 7.225 px a character.
- **38.8 % of this repository's 7,579 fenced code lines are longer than 66 characters**, and
  **74.5 % of its 812 fenced blocks contain at least one line that is.** The median line is 56
  characters, p90 is 89 and p99 is 158.
- **At the cap the fence seats 150 characters** and only **1.1 % of lines and 3.3 % of blocks**
  exceed it.

Three quarters of the code blocks in this repository are cut today. That is the answer, and it is
about content rather than tidiness.

**The one real difference between the two, recorded rather than smoothed over.** A code block cut
at 66 characters still shows the beginning of every line, which is where the indentation and the
name are; a table cut at column 4 hides a whole column and gives no sign that it existed. The code
block's loss is milder. It is not nil — an argument list, a `curl`, a path and a shell pipeline all
carry their meaning at the end — and it affects three blocks in four.

**And one spelling trap the measure found.** A cap spelled in `ch` resolves against the element's
OWN font, and `pre` is on `--font-editor` at `--text-sm`. Measured in the same run: with
`136ch` set on both, the table's box came out at **1,114 px** and the fence's at **981 px**, because
136 monospace ch is 982.6 px against 1,113.6 px of prose ch. That is a real decision rather than a
bug — 132 code characters is a defensible cap, and it costs 1.3 % of lines against 1.1 % — but it
must be made deliberately. If the two are meant to be the same width, the cap belongs in a custom
property set on `.md-content`, where it resolves once against the prose font.

## 5. Question 4 — the scroller is discoverable in principle and not in fact

A box that scrolls with no visible affordance is how he lost a column, and the first thing to say is
that the affordance is not missing:

- `.md-table-scroll` **reserves 10 px of layout height** for the horizontal bar, because
  `globals.css:72` styles `::-webkit-scrollbar` and a styled bar in Chromium takes layout space.
- The thumb is **341 px long** on a 509 px track — `clientWidth² / scrollWidth`, two thirds of the
  width, which is a big target.

And then what it is drawn in:

- `::-webkit-scrollbar-thumb` is `background: var(--border-strong)` with `border: 3px solid
  transparent` and `background-clip: padding-box`, so the painted thumb is **4 px tall** in
  **`#353943`** on **`#131417`**, which is **1.594:1**. WCAG 1.4.11 asks 3:1 of a non-text mark that
  carries meaning. DESIGN.md §1.3 pins the status dots at that floor over every offered frame; this
  mark is under half of it.
- The cut itself gives no sign. In the reading taken before the divider was moved, the box's right
  edge sits at x 1,454 and the table's at 1,704 — **250 px of table past the edge**, the shortfall
  again — and the last cell the reader can see is column 3's, clipped at 1,457, with a 1 px
  `--border` right edge like every other cell. A table that ends flush against a column of prose,
  with a 4 px hairline under it at 1.594:1, reads as a table that ended.

**What the measure recommends, and it is two things rather than one.**

1. **The break-out is most of the discoverability fix, and it should be judged that way.** It takes
   the tables that scroll at all from 557 of 1,900 to 16 of 1,900. An affordance matters for 0.8 %
   of tables rather than 29.3 % of them.
2. **For those, the house already has the idiom and it is not words.** `.ptab-list` scrolls with its
   scrollbar hidden and draws `.ptab-overflow`, a chevron, *"only while the row has more than it
   can show"* (`app.css:307`). The same shape here — an end-of-box indication drawn only while the
   box can still scroll in that direction, in tokens, no text — obeys "just enough words" because it
   has none, and it is a second definition of an existing pattern rather than a new one.

**A label is refused.** A word under a table on the resting face is the thing CLAUDE.md's UI rules
name — *"TONS of words, bad"* — and it would be drawn on the 0.8 % of tables that need it and read
by everyone.

## 6. Question 5 — what breaks first, measured on three spellings

Three full-bleed spellings, injected one at a time and removed in a `finally`, read at four panes.
**The promise under test is `markdown.css:207`'s own: *"wide ones scroll in their own box; the
document never does"*.**

### The viewport recipe — breaks at every width, including the developer's

`width: 100vw; margin-left: calc(50% - 50vw)` is the most-copied full-bleed on the internet and it
is wrong here for one reason: **`vw` is the WINDOW and the pane is not the window.**

| pane | table box it drew | document scrolls sideways |
| --- | --- | --- |
| 580 | 1,900 | **yes**, 1,240 against 580 |
| 620 | 1,900 | **yes**, 1,260 against 620 |
| 1,000 | 1,900 | **yes**, 1,450 against 1,000 |
| 1,381 | 1,900 | **yes**, 1,641 against 1,381 |

The box is the window's own 1,900 px at every pane, because the editor panel is a fraction of the
window and `100vw` cannot see it. **This is what breaks first**, it breaks in the promise's own
words, and in a product whose editor is a resizable split beside a terminal it breaks at every
width rather than only at the awkward ones.

### The flat negative margin — passes on a wide pane and breaks on a narrow one

`margin-inline: calc(-1 * var(--space-10))` is the quiet version, and it fails in the more dangerous
direction: it is fine where the person writing it is looking and wrong where somebody else is.

| pane | table box | columns still cut | document scrolls sideways |
| --- | --- | --- | --- |
| **580** | 605 | 2 | **yes**, 592 against 580 |
| 620 | 605 | 2 | no |
| 1,000 | 605 | 2 | no |
| 1,381 | 605 | 2 | no |

Two things at once. It **buys 96 px and still cuts two columns at every width**, so it does not fix
the defect; and the block is 605 px wide however narrow the pane gets, so **below a pane of 605 px
the document scrolls sideways** — a split with the terminal beside it, which is this product's
default posture. A fixed negative margin is a promise that the pane is at least a certain width, and
nothing here makes that promise.

### The pane-relative capped spelling — holds at all four

```css
.md-scroll { container-type: inline-size; }
.md-content .md-table-scroll,
.md-content pre {
  --md-wide: min(136ch, 100cqi - 2 * var(--space-8));
  width: max(100%, var(--md-wide));
  margin-inline: calc((100% - max(100%, var(--md-wide))) / 2);
}
```

| pane | table box | columns cut | prose column | document scrolls sideways |
| --- | --- | --- | --- | --- |
| 580 | 542 | 2 | 556.8 | no |
| 620 | 582 | 2 | 556.8 | no |
| 1,000 | **962** | **0** | 556.8 | no |
| 1,381 | **1,114** | **0** | 556.8 | no |

`100cqi` is the PANE, which is the whole difference from `100vw`; the `min()` is the ceiling; the
`max(100%, …)` keeps the block from ever being narrower than the measure; and the negative margin is
computed from the same expression, so the block stays centred on the prose column. **The prose
column is 556.8 px at every one of the four readings**, which is the other thing a full bleed done
wrong breaks — widening `.md-content` instead of its children would have taken the measure with it,
and this spelling cannot, because `.md-content` is not what it names.

**This is a measured candidate, not a shipping decision.** Two things the build phase owns: whether
`container-type: inline-size` on `.md-scroll` disturbs the heading ruler, which measures against
`contentRef` and is re-measured on resize (nothing in this run touched it); and the `ch` resolution
trap in section 4.

## 7. What the build phase gets from this, and what it must not do

**Decided here, with the numbers above:**

- The break-out is on **`.md-table-scroll` and `pre`**, the two children that already carry
  `overflow-x: auto`, and on nothing else.
- The ceiling is **136ch**, twice the measure, in the measure's own unit.
- **The code block travels with the table**, because 74.5 % of this repository's fenced blocks are
  cut today and 3.3 % would be at the cap.
- The width term is **pane-relative (`100cqi`), never `100vw`**, and the block is centred by a
  margin computed from the same expression.
- The affordance question is answered by the break-out for 99.2 % of tables; for the rest, the house
  idiom is `.ptab-overflow`'s — drawn only while it is needed, no words.

**Refusals this phase inherits and this document does not reopen:**

- **The 68ch prose measure does not change.** `markdown.css:35` carries its own measurement and it
  was confirmed here rather than questioned: the column drew at 556.8 px in every one of the
  readings above.
- **Nothing may make the document scroll horizontally.** Section 6 is the test for it and the
  viewport spelling is the thing it refuses.
- **No line of `src/renderer/editor/redline.css` is touched.** `redline.css:114` carries the same
  `max-width: 68ch; margin-inline: auto` pair and it is Phase 249's subject; every measurement here
  is on `markdown.css` and the two phases do not meet.
- **No markdown feature.** No new element, no plugin, no sanitiser change. The fixture is rendered
  by the shipping pipeline exactly as it is.

## 8. Stated limits of this measurement

- **The corpus is this repository.** 1,901 tables and 812 fenced blocks out of 208 tracked `.md`
  files is a large sample of what Tortie's own operator reads in this preview, and it is not a
  sample of what everybody reads. The min-content distribution is what the cap is chosen from, and a
  different corpus would move it.
- **1,900 of 1,901.** One table the scanner found did not render as a table in the pipeline and is
  excluded from every percentage above.
- **The fixture is his shape rather than his file.** His own `AS-BUILT-ARCHITECTURE` is not in this
  repository; the fixture is a five-column table of that shape with paths and code spans in its
  cells, and its columns are cut at 4 and 5 where his screenshot is cut at 4. Section 3's corpus is
  the half of this document that is real files rather than a shape.
- **One machine, one face.** Every px above is CSS px at `devicePixelRatio` 2, on this Mac, with the
  shipped `--font-ui` and `--font-editor` resolving to the system face and Menlo. A different face
  moves 8.188 and 7.225 and everything derived from them, which is the argument for `ch`.
- **The three widths are pane widths, not window widths.** The window was 1,900 px throughout and
  the pane was set with the divider. A pane of 1,000 CSS px is 2,000 device px at this scale, which
  is the pane the entry describes.

## 9. How to re-run it

```
node build/p248/corpus.mjs                           # the offline half, ~2 s, spawns only git ls-files
node build/p248/probe-p248-table.mjs --self-test     # the grader on six fixtures, launches nothing
node build/p248/probe-p248-table.mjs                 # the app run, ~10 min with the corpus arm
P248_CORPUS=0 node build/p248/probe-p248-table.mjs   # ~4 min, the fixture and the spellings only
P248_PANES=narrow:620,his:1000,wider:1381 node …     # the three pane widths, if they should move
node build/p248/caps.mjs 509 962 1114 1200           # section 3 again, from the saved readings
```

`build/p248/out-probe-p248-table.txt` is this run's own output,
`build/p248/out-corpus.txt` is the offline half's, `build/p248/out-caps.txt` is the ceiling
arithmetic, and `build/p248/out-readings.json` is every rectangle behind all three. The corpus
documents themselves are written into the scratch project at run time and are not committed:
`corpus.mjs --emit <dir>` rebuilds them from the tree in about two seconds.

## 10. The fix round (2026-09-09) — the two boxes the break-out could still walk out of

The build landed the section 7 decisions and an independent verifier attacked them in the running
app. Three of its findings are here with what the fix round re-derived before changing a line, and
one of its numbers is corrected. Every reading below is from `build/p248/probe-p248-wide.mjs`, whose
fixture now nests a five-column table under a bullet at three depths and whose readings are of
**every** `.md-table-scroll` and **every** `pre` in the document rather than of the first of each.

### 10.1 A block under a bullet is centred on the bullet's box

`width: max(100%, …)` and `margin-inline: calc((100% - max(100%, …)) / 2)` are both resolved against
the block's **containing block**. For a block under a list item that is the item, which
`.md-content ul` insets by `--space-7` (20px) a level, so the centre moves **10px right per level**
while the whole gutter is 19px. The arithmetic says the block is past the pane from two levels down,
and the app agrees at the parent commit:

| pane | depth 1 | depth 2 | depth 3 | the document |
| --- | --- | --- | --- | --- |
| 580 | 0 | +1 | +11 | scrolls sideways, 591 vs 580 |
| 620 | 0 | +1 | +11 | scrolls sideways, 631 vs 620 |
| 1,000 | 0 | +1 | +11 | scrolls sideways, 1,011 vs 1,000 |
| 1,381 | 0 | 0 | 0 | still, because the 136ch cap leaves 133.7px of slack |

That last row is why the shipped probe never saw it: a fixture driven only at a pane wide enough for
the cap has the slack to absorb three levels of it.

**The fix is the child combinator**, `.md-content > .md-table-scroll, .md-content > pre`, which is
the only spelling that says what the arithmetic assumes: the containing block IS the prose column.
A nested block keeps the scroller it had before Phase 248, in its list item's own width. **The price
is 3 of this repository's 1,913 tables and 14 of its 817 fences** (0.2% and 1.7%), which is the
whole population that is not a direct child of the document.

**BOTH OF THOSE NUMBERS WERE FIRST PUBLISHED WRONG AND THE CORRECTION IS THE INTERESTING HALF.**
The phase read `1,910` off `corpus.mjs`'s indent histogram, where it is the count of tables at
indent 0 rather than the population, and `11` off an indent test that is blind to a BLOCKQUOTE: a
fence written as `> ` sits at indent 0 while its `pre` is `.md-content > blockquote > pre`, which
the child combinator excludes exactly as it excludes a list item's. The three in
`docs/research/47-agent-installs.md` are the whole of that difference, and there are no quoted
tables at all. `corpus.mjs` asks the two questions separately now and prints the quoted count on a
line of its own.

### 10.2 Two presses of ⌘+ do the same thing to an ordinary top-level table

`zoom.css:90` scales `.md-content` with CSS `zoom`, which multiplies every used length in the
subtree. `100cqi` is the **only** term in `--md-wide` measured outside that subtree — it is the
scroller's own box, and the scroller is not zoomed — so it was already the pane's full width and was
then multiplied a second time. At his own 1,381px pane, with no nesting anywhere in the file:

| zoom | block drawn | past the right edge | the document |
| --- | --- | --- | --- |
| 100% | 1,113.6 | 0 | 1,381 / 1,381 |
| 125% | 1,392.0 | 5.5 | scrolls sideways, 1,387 vs 1,381 |
| 200% | 2,227.3 | 423.1 | scrolls sideways, 1,804 vs 1,381 |

**The fix converts the foreign term into the subtree's own space and leaves every other term
alone**: `min(136ch, 100cqi / var(--zoom-editor, 1) - 2 * var(--space-8))`. `ch` and `--space-8` are
computed inside the zoomed subtree already, so the block's own gutter grows with the text the way
the prose column's padding does. Driven on the real chord (a `KeyboardEvent` the shipped capture
listener in `zoom/keys.ts` reads) at the same 1,381px pane, the block draws 1,113.6, 1,225, 1,331,
1,319 and 1,295px at 100/110/125/150/200% and the document is still at every one; the undivided term
injected back at 200% reproduces 2,227.3px and 423.1px past the edge, which is what makes that arm
able to fail. The gutter under zoom is `48 × zoom - the bar`, 13px at the ladder's floor of 75%, so
it cannot go negative on any stop the chord reaches either.

**`@property` is what makes the division safe to write**, and the run says so rather than assuming
it: a `--p248-candidate` registered as a `<length>` and given the same expression computed to the
same value as the shipped one at all five levels, so the browser really does divide by a
var-substituted number rather than dropping the declaration to its 0px initial value.

### 10.3 The narrow table, and the number this document corrects

The verifier reported that "every block that did not need the room is pulled off the prose column"
and put the population at **1,343 of 1,900 (70.7%)**, being every table that was not cut. That
number is wrong and the substance is right. Re-derived from this phase's own per-table min-content
and max-content readings (`out-readings.json`, the 1,900 real tables measured in the shipping
pipeline):

| what the old 509px box did to it | tables | share |
| --- | --- | --- |
| cut a column (min-content > 509) | 557 | 29.3% |
| filled the box and wrapped (min ≤ 509 < max) | 1,117 | 58.8% |
| drawn at its natural width already (max ≤ 509) | **226** | **11.9%** |

The 1,117 are not "no gain": they were as wide as the box either way and the room is exactly what
they gain. **226 is the population that gains nothing**, and for those the box's left edge alone put
the table 227px left of the prose column at his own 1,000px pane and 302px at the cap.

**CSS cannot ask how wide a table wants to be before giving it the room** — `fit-content` never
exceeds the containing block, `max-content` cannot be named inside a `min()`, and auto margins are
treated as zero the moment an element overflows its containing block (CSS 2.1 §10.3.3), which is why
the negative margin is computed rather than left to `auto` in the first place. So the break-out
stays unconditional and **the table inside it is centred**:
`.md-content > .md-table-scroll > table { margin-inline: auto; }`. A narrow table then sits on the
same axis as the prose column, which is itself centred in the pane; a table wider than its box is
untouched, because its auto margins are the zero above and it still scrolls from its left edge. The
app run reads a 105.2px table centred in the 962px box it was given, and 227px into the corner with
the one declaration ablated.

**The fence is deliberately not shrink-wrapped.** Its box IS its background, it has always painted
the full width of its column, and 74.5% of this repository's fences hold a line too long for the old
one; a one-line fence painting a wider slab is a change of degree in a decision this phase already
made rather than a new one.

### 10.4 What the gate gained

`npm run conformance:wideblocks` was ten rules and twelve ablations; it is thirteen rules and
sixteen ablations. Rule 11 is the child combinator, read structurally and judged over the nested
readings at four panes and three depths, with the descendant-scoped rule injected into the running
app as the proof it can fail. Rule 12 is the zoom division and its fallback, judged over five levels
driven on the real chord, with the undivided term injected as the same kind of proof. Rule 13 is the
narrow table's axis, with the centring ablated in the browser. Rule 8's comment claimed that a
gutter which cannot go negative is why the document never scrolls sideways; that was true of a block
whose containing block is `.md-content` itself and whose subtree is not zoomed, which is exactly the
two assumptions these findings broke, and it says so now.

### 10.5 One arm of the app run cannot be taken in an occluded window, and now says so

The build's arm E4 turns the heading ruler on and reads its ticks, because the ruler is the one
thing `container-type: inline-size` could have disturbed. It read 4 ticks and a 697px thumb in the
build's run and 0 ticks in every run of the fix round, over a ruler nothing had touched. The cause
is not the ruler: `HeadingRuler` measures inside a `requestAnimationFrame`, and **a window nobody is
looking at produces no frames** — `main/harness/shot.ts` turns background throttling off for the
screenshot path and this probe does not take that path, which is the same hazard Phase 190 measured
as 200ms waits arriving at 1,000ms with a terminal in front of the window. React is unharmed,
because its scheduler is a `MessageChannel`, so every other reading in the run is honest while this
one cannot be taken at all. A screencast, `Page.setWebLifecycleState` and focus emulation were each
tried and rAF stayed dead; the run now **reads** whether a frame fires, asks the drawn ticks when
one does, and otherwise asks what is still checkable — that the ruler mounted and that the outline
it measures is in the DOM under containment — and says the ticks were unread rather than reporting
a pass it did not earn.
