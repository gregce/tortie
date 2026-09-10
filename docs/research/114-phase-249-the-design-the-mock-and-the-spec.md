# Research 114 — Phase 249's design step: the mock, three directions, and the spec

**Phase 249 is research only and builds nothing.** This document is the second and third of the
phase's three products, being the mock and the written spec, on top of the measurement in
`docs/research/113-phase-249-the-room-the-redline-is-in.md`. **No file under `src/` was touched by
this step and none may be touched until the operator has chosen.** Everything below lives in
`build/p249/`.

He asked for impeccable. **Impeccable is his judgement and not this document's**, so §3 offers three
directions with the trade of each in one clause and makes a recommendation rather than presenting one
design as inevitable.

---

## 0. What the mock is, and how to look at it

`build/p249/mock-p249.html` is a **real page**, not a picture of an opinion. It draws a marked-up
document with wrapped runs, a markdown table, the chip and the gutter, on **both bases**, at the
**three pane widths** research 113 measured, and it has a **Today / Proposed** switch so the two can
be compared over the same bytes.

| file | what it is |
| --- | --- |
| `build/p249/fixture-a.md`, `fixture-b.md` | the two versions. **This phase's own note, never his** — no path of his, no content of his, no screenshot of his |
| `build/p249/make-mock.mjs` | composes the runs with **the product's own engine** and writes `mock-runs.js`. Launches nothing |
| `build/p249/mock-p249.html` + `mock-p249.js` | the mock. It `<link>`s **`src/renderer/styles/tokens.css` itself**, not a copy |
| `build/p249/measure-mock.mjs` | ONE Electron through `build/electron-run.mjs`, on a scratch profile outside the repository and outside his home, ended in a `finally`. It runs **none of Tortie's own main**: the entry is its own five-line window inside the scratch directory. `--self-test` proves 19 graders and launches nothing |
| `build/p249/out-mock.json` | the 24 cells it read, and the 18 ratios it computed |

**No colour literal appears anywhere in the mock.** The stylesheet is the product's own file, so a
token that moves moves here too, and `conformance:hue` rule 26's rule is honoured rather than
asserted. Both bases are drawn from `:root` and `:root[data-scheme='light']`.

**The runs are the product's runs.** `make-mock.mjs` runs `diffLines` for the line partition and
`diffWords` with an `Intl.Segmenter` inside each block, which is `redline-document.ts`'s two levels
and `redline.ts`'s `redlineRuns`, and it re-implements `exactRuns`'s repair. **Both projections are
asserted** before a byte is written: the runs with every `ins` dropped equal version A byte for byte,
and with every `del` dropped, version B. A mock whose picture failed those would be proposing a
design over a lie.

**One difference from the product, written down rather than hidden.** Where `diffWords` has dropped
spacing, the shipping `exactRuns` refuses and draws the block whole; the mock's copy reconstructs the
original bytes instead. The result satisfies both projections either way, and the difference is that
the mock takes the whole-block fallback slightly less often than the product would.

**One instrument note.** The `ch` unit resolves to **8.465px** in this page, against the **8.1885px**
`probe-p249-room.mjs` measured inside the running app. So the mock computes every width from the
**app's** number, published as `--rl-ch`, and prints both character counts on its face. Every width
below is therefore directly comparable with research 113's table.

---

## 1. THE CENTRAL VISUAL QUESTION, ANSWERED WITH A WORKING DEMONSTRATION

> *Whether a marked run can be drawn as ONE continuous shape across wrapped lines rather than a box
> per line.*

**Yes, in CSS, with no extra element and no measurement — and research 113 §8.1 was too pessimistic
about it.** What cannot be done is the *other* half of the question, and the two must be separated.

### 1.1 What actually draws the tiles

Research 113 §2.1 measured it exactly and its finding is confirmed here: the fragments are **not**
ragged on the left, `box-decoration-break` already computes `slice`, and the corners are not the
fault. The fault is that a mark paints its **font box**, **15.00px**, on a line pitch of **21.45px**,
so there is a **6.45px band of unpainted canvas between every pair of stacked fragments**. Nineteen
15px bars separated by nineteen 6.45px gaps is a stack of tiles.

### 1.2 The demonstration

Inline padding does not change line height. So padding a mark vertically until its painted height
**is the line pitch** makes the fragments of one run meet exactly, and the run becomes one continuous
shape: flush left, ragged right, no gaps. That is the shape of a paragraph, and it is one
declaration.

The mock's **WASH** switch draws all three so they compare, and `measure-mock.mjs` reads the painted
height and the band off the live page:

| wash | painted | line pitch | **band between fragments** | reads as |
| --- | --- | --- | --- | --- |
| **Tiles** (what ships) | 15.00px | 21.45px | **6.45px** | a stack of ragged tiles |
| **Seam** (recommended) | 19.44px | 21.45px | **2.01px** | one passage, with a hairline where two *different* marks meet |
| **Ribbon** | 21.44px | 21.45px | **0.01px** | one solid passage |

Ribbon's fragments are contiguous by the mock's own `continuous()` grader at a 0.5px tolerance, over
all three pane widths and both bases. **Seam is the recommendation and Ribbon is the alternative**,
for one measured reason: at Ribbon the two inserted table rows in the fixture merge into a single
green block, and at Seam a hairline keeps them two rows. A run reads continuous either way — 2.01px
is a hairline, 6.45px is a gap.

### 1.3 What cannot be done, and it is not the same question

**A wrapped mark cannot be given ONE rounded outline that follows its own ragged silhouette.** An
inline box that breaks paints one background box per fragment, and `box-decoration-break: clone`
gives *every* fragment all four corners, which is more tiles rather than fewer. A silhouette needs
either one absolutely positioned box per fragment or an SVG path recomputed from `getClientRects()`
on every reflow, and research 113 §7.1's numbers refuse both.

**But the thing that needed a shape did not need a silhouette.** The 37 outlined boxes at the wide
pane and 74 at the floor are the CURRENT change's ring, and only one change is ever current. So the
current change is named by **one absolutely positioned bar in the left margin**, spanning from its
first client rect's top to its last one's bottom: **one element, at rest zero**, no ring, no boxes.
That is fault 2's second half answered exactly, and it is what makes the left margin earn its place.

---

## 2. WHAT THE MOCK MEASURED, today against proposed

Read off the live page by `build/p249/measure-mock.mjs`, dark base (paper is identical on every
geometric row and is in `out-mock.json`):

| | **today** 1349 | **proposed** 1349 | today 699 | proposed 699 | today 319 | proposed 319 |
| --- | --- | --- | --- | --- | --- | --- |
| page width | 580.81 | **1043.83** | 580.81 | 699.00 | 319.00 | 319.00 |
| **dead space** | **56.94%** | **22.62%** | 16.91% | **0.00%** | 0.00% | 0.00% |
| text column | 508.81 | **687.83** | 508.81 | 607.00 | 247.00 | 247.00 |
| characters | 62.1 | **84.0** | 62.1 | 74.1 | 30.2 | 30.2 |
| document height | 754.25 | **713.82** | 754.25 | 844.25 | 1376.16 | 1419.05 |
| drawn line boxes | 32 | 30 | 32 | 36 | 61 | 63 |
| marks | 33 | 36 | 33 | 36 | 33 | 36 |
| **marks carrying a wash** | 33 of 33 | **25 of 36** | 33/33 | 25/36 | 33/33 | 25/36 |
| mark fragments | 46 | 43 | 46 | 47 | 64 | 66 |
| **painted / pitch** | 15.00 / 21.45 | **19.44 / 21.45** | same | same | same | same |
| **fragments past the column edge** | 0 | **0** | 0 | 0 | 3 | 5 |
| **fragments past the table's rule** | 3 | **0** | 3 | 2 | 5 | 4 |
| spread of the rows' closing pipes | 427.9px | **130.0px** | 427.9 | 506.7 | 156.5 | 202.8 |
| **rows of prose the chip covers** | 1 | **0** | 1 | 1 | 2 | 2 |
| changes | 19 | **14** | 19 | 14 | 19 | 14 |
| **changes inside the table** | 9 | **4** | 9 | 4 | 9 | 4 |
| leaves in the document | 62 | 64 | — | — | — | — |

**Two rows are worse and they are named rather than buried.** At the 319px floor the proposed
composition draws whole table ROWS as marks, so five fragments pass the column's content edge against
three today; the overhangs are the table's own cell padding wrapping mid-cell, measured at 23.95 to
**31.44px** in the proposal and at 24.38 to **26.58px** today, so it is the same defect on a
different unit rather than a new one. And the document is 42.89px **taller** at the floor, because
the row-aligned table draws a whole row where the flat stream drew fragments.

**The ratios the design depends on, computed by the ruler from the colours the live page resolved,
on the ground each really sits on** — nothing quoted, and no floor lowered:

| | on its own wash | on the plain canvas |
| --- | --- | --- |
| the deleted words, graphite | **4.837** | 5.574 |
| the deleted words, paper | **4.840** | 5.869 |
| the inserted words, graphite | **6.987** | 8.545 |
| the inserted words, paper | **5.106** | 6.054 |
| the separator row as furniture (`--text-muted`) | — | 5.248 graphite / 5.272 paper |
| the change count in the bar (`--text-secondary`) | — | 7.104 / 7.182 |
| the rail bar (`--accent`, non-text, 3:1) | — | 6.406 / 4.504 |
| the chip label on the chip | — | 6.645 / 7.523 |

All eighteen clear their floor on both bases. **The design leans on no new colour and promotes
nothing.** Research 113 §7.4's warning is respected verbatim: the wash reads **1.152:1** and
**1.223:1** against the canvas, which is below every floor in the product, so **colour and the
strikethrough remain what carry the meaning** and the wash stays decoration — it is only *taller*.

---

## 3. THREE DIRECTIONS

Each answers all five faults. The work for faults 2, 3 and 5 is the same in all three; what differs
is where the room goes and what it is for.

### Direction A — **The column**

One box, no new structure. The measure becomes the **text's** measure rather than the box's, at 84
characters; the bar takes the column's own box so both of its ends land on the text; the wash gets
its pitch; the current change's ring becomes one out-of-flow bracket instead of 37 outlines; the
table is composed row against row; a wordless mark loses its wash.

*Trade in one clause:* it is the cheapest of the three and it still leaves about **45%** of his 1349px
pane empty with the chip still drawn over his prose.

### Direction B — **The page with margins** ← recommended

The room becomes what a marked-up document actually has: a **change bar in the left margin** and the
**controls in the right one**. Three tracks — rail, column, margin — centred as one page. The chip
moves into the margin and covers **0 rows** of prose; `Accept all` and a `3 of 14 changes` counter sit
on the column's own two edges; the current change is one accent bar in the rail. Dead space
**56.94% → 22.62%**.

*Trade in one clause:* it is two layouts, because below about 1060px of pane the margin has nowhere to
be and the chip falls back to Phase 236's overlay, and both must be kept true.

### Direction C — **The review pane**

The room becomes a persistent list of the changes docked beside the document — one row per change with
its phrase, its number, and its two verbs — and the document keeps the 68ch measure it has.

*Trade in one clause:* it answers navigation best and it is a second reading of the same document, so
it doubles the mounted DOM research 113 §7.1 says is already unbounded, and it is IDE furniture that
the scope guardrail asks us to justify rather than build.

### The recommendation, and it is a recommendation

**Direction B**, with fault 3 built first inside it.

The reasons are the measurements. He said "more space" first and B is the only one whose arithmetic
answers that sentence at the pane he works in — A moves 56.94% to about 45%, which he will not see, and
C moves it by filling it with a second copy of what he is already reading. He said "affordance"
second, and B is the only one where the controls stop being drawn on top of the thing they act on.
And B is the only one in which the left margin does real work rather than being decoration: the
current change's bar lives there, which is what removes the 37 outlined boxes.

**But it is his judgement.** If what he wants is one small change this week, **A is honest and cheap
and forecloses nothing** — every piece of it is a piece of B. If what irritates him most is the table
rather than the room, fault 3 alone is the largest measured win in this document (**9 table changes to
4**, and `Sessions` no longer word-diffed against `Ledger`) and it is composer work that needs no
layout at all.

---

## 4. THE SPEC the build phase implements

For each fault: what changes, what stays, what it costs, what is refused.

### 4.1 Fault 1 — the measure

**What changes.** `.ed-redline-doc` gets a measure of its own, **stated in characters of TEXT rather
than of box**: `--redline-measure: 84ch` applied so the 48px of inline padding is *outside* it. The
shipped `max-width: 68ch` with the padding inside delivers **62.1** characters, so the number in the
stylesheet has never meant what it says. The document sits in a three-track page — `[rail]
[column] [margin]` — with `width: fit-content; margin-inline: auto`, so the page's own box IS its
tracks and the dead space is what is left over.

**What stays.** The column is still centred, still `pre-wrap`, still `overflow-wrap: anywhere`, still
`--text-base` at 1.65. The preview's `markdown.css:35` is **not touched** — Phase 248 owns it.

**What it costs.** 84 characters is nine over the comfortable prose measure, and research 113 §1.1
measured that trade directly: 84ch drew 6 wrapped marks against 68ch's 10, and 15% less document to
scroll. At the floor the column is 30.2 characters and the tracks collapse.

**Refused.** Letting the document fill the pane. Research 113 measured a 52.1% mean row fill and a
158-character prose line; that is not a reading measure.

### 4.2 Fault 2 — the wrapped run

**What changes.** The wash paints the **line pitch minus a 2px seam** (§1.2), so a wrapped run is one
continuous shape. The trailing inline pixel goes and the leading one stays — the shipped `padding: 0
1px` puts the wash **1.00px past the last glyph**, measured on all four of the fixture's whole-row
marks, and dropping both puts `starts` and `asks for` glyph against glyph. The current change stops
being an outline on the inline wrapper and becomes **one absolutely positioned 2px `--accent` bar in
the rail**, from its first client rect's top to its last one's bottom.

**What stays.** `box-decoration-break` is left alone; it already computes `slice` and it is not the
fault. `.ed-redline-change`, its identity attributes and `tabindex="-1"` are untouched, so Phase 227's
press, Phase 238's accept and Phase 239's persistence read exactly what they read today.

**What it costs.** One positioned element while a change is current, **zero at rest**. Two marks of
the *same* colour on vertically adjacent lines now touch across a 2px seam rather than a 6.45px band.

**Refused.** One rounded outline following a wrapped mark's silhouette (§1.3), and
`box-decoration-break: clone`, which makes it worse.

### 4.3 Fault 3 — the table

**What changes, and this is the largest item.** A change block whose every line is a table line is
**diffed row against row**: the rows are aligned first by their own first cell through `diffArrays`,
then each PAIR is word-diffed on its own and an unpaired row is a whole deletion or a whole insertion.
That is what stops `Sessions` being word-diffed against `Ledger` from a different row. **A separator
row is never word-diffed**: the pair is a whole-row replacement, and when both sides are plain dashes
— no `:` alignment marker on either — the deleted copy is **not drawn**, so the reader sees the
separator once, the way the file has it. The block gets one wrapper carrying `--font-mono` at
`--text-sm`, at any width but the pane's own floor, so what alignment the author wrote is visible.

**What stays.** The view draws the file's **source** and renders no markdown. `RedlineDocument`'s own
header decided that and this phase does not re-open it.

**What it costs.** On this fixture, 62 leaves become 64, a 3.2% rise against research 113 §7.1's
budget. The mono face at a 699px pane wraps a 95-character row, which is why the block falls back to
the document's face at the floor.

**Refused, with the reason.** **The columns of a redlined table cannot be made to line up.** A drawn
line carries both versions' characters and therefore neither version's grid; only an unchanged row
keeps the author's alignment. Measured: the spread of the rows' closing pipes goes **427.9px →
130.0px** and not to zero. Rendering the table as a table is refused by the view's own decision. A
horizontal scroller for a wide block is Phase 248's ruling and is not taken here.

### 4.4 Fault 4 — the controls

**What changes.** The chip moves into the **margin track**, anchored at the current change's first
client rect. `Accept all` and a `N of M changes` counter sit in a bar whose inner box is **the page's
own grid**, so both ends land on the column: research 113 measured the shipped button **355.32px**
from the column's content edge because the bar is justified against the panel while the column is
centred in it, and the fault was never the button's placement.

**What stays.** Every one of Phase 236's four rulings. The anchor is `getClientRects()[0]` and never
the bounding box. A control in the flow is still refused. A chip that takes focus is still refused.
Below about 1060px of pane the margin is zero and the chip falls back to exactly today's overlay.

**What it costs.** `.ed-redline-view` stops being the only positioned box in the view: the page
becomes the containing block, which is a fact stated in `redline-chip.tsx`, `RedlineDocument.tsx` and
`redline.css` and all three must move together. In exchange the chip **scrolls with the document**, so
its `scroll` listener can go — one fewer thing to keep in step.

**Refused.** A margin gutter as the *only* home for the controls: research 96 §4.1 measured 0.00px of
free space at the panel's floor and research 113 re-measured exactly 0.00px, so the overlay arm is
required and is not a fallback anybody may delete.

### 4.5 Fault 5 — the highlight and the rule

**What changes.** Three leaf-level rules, none of which moves a byte:

1. **No wash on a mark with no letter and no digit** that is not whitespace, being the `|` and the
   `---` of a table. It keeps its colour and its strikethrough.
2. **No wash on a whitespace mark that is not a spacing change.** `exactRuns` makes a real spacing
   change as a `del "   "` beside an `ins " "`; a whitespace mark with no opposite-kind whitespace
   next to it is a deleted line's own trailing newline riding along, and washing that paints a bar
   past the last glyph on the row.
3. **A deletion and an insertion of the same bytes are replaced by one unchanged run.** That is
   exactly equivalent on both projections and it removes the doubled line break a changed line's own
   newline draws.

**What stays. Ruling 5 stands, exactly and no wider.** A whitespace mark that IS a spacing change
keeps its wash, because in a standalone document nothing else can say that a spacing change happened
— there are no Pierre rows above it. It loses only the strikethrough, which had no glyph to draw on.

**What it costs.** The ends split adds leaves; measured at 12 on this fixture.

**Refused.** Dropping `pre-wrap`. It is the one rule the projections depend on. And the complete
removal of the overhang, which needs one leaf per word: at the pane he works in the crossings go **3
→ 0** against the table's rule and stay 0 against the column edge, and at the 319px floor a table row
wrapping inside its own cell padding still hangs 23.95 to 31.44px, which is the same shape today
hangs 24.38 to 26.58px.

### 4.6 The files it would touch

| file | what for |
| --- | --- |
| `src/renderer/editor/redline.css` | the page grid, the measure, the wash pitch, the rail, the margin, the bar's grid, the table face, the furniture rules |
| `src/renderer/editor/RedlineDocument.tsx` | the page/rail/margin elements, the `data-room` attribute from the view's own resize observer, the counter, the rail bar |
| `src/renderer/editor/redline-chip.tsx` | one margin arm in `chipPlace`; `chipAnchorRect` untouched |
| `src/renderer/editor/redline-document.ts` | the table block, the row alignment, the separator pair, the cancel pass, the ends split, the run flags |
| `src/renderer/editor/RedlineRow.tsx` | the leaf attributes the three fault-5 rules key on |
| `src/renderer/editor/redline-sentences.ts` | the counter's string, if it is not composed in place |
| `build/conformance-redline.mjs` | the arms in §4.7 |
| `DESIGN.md` / `docs/DESIGN-SPEC.md` | **the Redline view appears in neither today.** A phase that changes a surface writes its section |

**No native menu changes.** No surface is added, renamed or removed; the counter is not a menu item
and accept-all still has no chord, which is Phase 238's own ruling.

### 4.7 The gate arms it would need

Added to `npm run conformance:redline`, whose rules 8 and 9 already bind this family:

1. **Both projections, over the row-aligned composer**, on the committed corpus and the seeded fuzz —
   the property is unchanged and must stay unchanged.
2. **No word-level pairing across table rows**: over a fixture whose rows are reordered, every `del`
   and the `ins` it is adjacent to come from rows the alignment paired.
3. **The cancel pass is an identity on both projections**, as a property over the fuzz.
4. **The dropped separator**: its text node is present, only the stylesheet hides it, and a `:` on
   either side draws both copies. Ablate the plain-dashes test and it goes red.
5. **No change is ever entirely undrawn**: every change carries at least one leaf that is not dropped.
6. **The wash arithmetic**, read from the stylesheet: painted height equals the pitch less the seam,
   and no mark carries trailing inline padding.
7. **Ruling 5 both ways**: a spacing-change mark is washed and a structural whitespace mark is not.
   Two ablations, one each.
8. **Rule 9's derived file set** gains whatever files this adds, and **the floor rises in the same
   commit**.
9. **The measure means characters of text**: the document's box equals the measure plus its padding,
   read off the running app.
10. **The bar's inner grid template equals the page's**, read by matching braces so a later round
    cannot drift one from the other.
11. **The chip takes the margin arm only when the margin can hold it**, and the overlay arm is still
    reachable and still anchored on `getClientRects()[0]`.
12. **Colour and decoration, not the wash, carry the meaning**: `del` and `ins` differ in both
    `color` and `text-decoration`, so a design that leaned on a 1.15:1 wash would fail.

**One instruction for `conformance:hue`, and it is measure-first.** Research 113 §7.4 found that
`--error` and `--success` are in `CONTRAST_CHROMA` but in no chromatic pin, so no floor is asserted on
a deletion or an insertion at any hue, contrast level or frame. This design does not change their
ratios — it only makes the wash taller — so it does not *need* a pin. But the build phase should
**walk them** and report whether a 4.5:1 pin on both, on the canvas and on their own washes, keeps all
35 dark cells and all 4 light ones. Phase 218 measured a pin added with a shipped hex collapsing the
region from 35 cells to 16 with the default outside it. **If the walk says the pin costs cells, it is
recorded and not shipped**, and the next palette change is told about it.

### 4.8 The app run it would need

`npm run probe:p249` — ONE Electron on a scratch profile with a scratch `HOME` and its own tmux socket,
ended and unlinked in a `finally`, spawning no agent, spending no token, opening no keychain. It
drives the real Redline view over a fixture of its own at 1349, 699 and 319px on **both bases**, and
reads the same rows §2 reads: the page against the scroller, the painted height against the pitch, the
fragments past the column edge and past the table's rule, the rows of prose the chip covers, and the
number of positioned boxes the current change draws. **Measured at the parent commit and at HEAD**,
because that is the only honest proof a defect is fixed.

---

## 5. What this document did NOT verify

- **The mock is not the product.** It draws the runs the product's engine composes and it uses the
  product's tokens, but it is 300 lines of scaffolding, not `RedlineDocument`. Nothing here proves the
  design survives contact with `contenteditable`, with `redline-caret`'s offsets, with the copy
  handler's clone, or with a recompose under an agent's write. Those are the app run's job.
- **No `.ed-redline-doc` was measured.** Every number in §2 comes off the mock's own `.rl-doc`. The
  only numbers taken off the running app are research 113's, and where the two overlap they agree:
  the shipped page is 580.81px here against 556.82px there, the difference being the mock's own `ch`.
- **The `data-room` ladder is a mock's constant.** 1060px is the width at which the margin can hold a
  258px chip plus its gutter on this fixture; it was not derived from a range of chip contents, and a
  re-labelled button would move it.
- **The 84-character measure is a judgement, not a solved optimum.** Research 113 swept 68, 76, 84, 92,
  100 and 120 and no cap; 84 is the row with the fewest wrapped marks. Whether he reads a 78-character
  marked-up line better than a 62-character one is his eye and not a number.
- **The table's row alignment was driven over ONE table**, five columns from four with three rows
  reordered. A table with duplicate first cells, with no header, or with cells that changed AND moved
  is not measured, and the first-cell key is the obvious place that breaks.
- **The mounted-DOM cost was counted in leaves and not in React elements.** 62 to 64 on a 1,544-byte
  fixture says nothing about the 60-block worst case research 113 §7.1 derives arithmetically.
- **Nothing was measured under a hue, a contrast level or a frame.** The eighteen ratios are at the
  shipped frame on both bases. `conformance:hue` walks 61,446 derivations and this document walks two.
- **One machine, one build, two Electron launches**, at `dpr` 2 with reduced motion emulated, both on
  scratch profiles removed in a `finally`. His `-L gmux` sessions were not touched, no file of his was
  opened, and no product file was changed.
