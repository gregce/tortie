# Research 114 — Phase 249's design step: the mock, three directions, and the spec

**Phase 249 is research only and builds nothing.** This document is the second and third of the
phase's three products, being the mock and the written spec, on top of the measurement in
`docs/research/113-phase-249-the-room-the-redline-is-in.md`. **No file under `src/` was touched by
this step and none may be touched until the operator has chosen.** Everything below lives in
`build/p249/`.

He asked for impeccable. **Impeccable is his judgement and not this document's**, so §4 offers three
directions with the trade of each in one clause and makes a recommendation rather than presenting one
design as inevitable.

**This is the revision round's version, and six things in the first one were wrong.** They are named
where they sit rather than collected in a footnote, because each is a design change and not a change
of wording: the headline space number came from changing the definition of dead space between the
measure step and the design step (§2); the recommended page put **more** blank canvas to the right of
his text at rest than today does (§2.1); the two colours the whole picture is drawn in were never
walked over the frames the Appearance sliders offer, and one of them fails (§3); a blank line added or
removed drew as **nothing at all** (§6.5); the mock did not contain the shape fault 2 is about (§0);
and at the panel's floor the current change was marked by nothing (§1.3). Four smaller corrections are
in §2 and §7.

---

## 0. What the mock is, and how to look at it

`build/p249/mock-p249.html` is a **real page**, not a picture of an opinion. It draws a marked-up
document with wrapped runs, a markdown table, the chip and the rail, on **both bases**, at the
**three pane widths** research 113 measured, and it has a **Today / Proposed** switch so the two can
be compared over the same bytes.

| file | what it is |
| --- | --- |
| `build/p249/fixture-a.md`, `fixture-b.md` | the two versions. **This phase's own note, never his** — no path of his, no content of his, no screenshot of his |
| `build/p249/make-mock.mjs` | composes the runs with **the product's own engine** and writes `mock-runs.js`. Launches nothing |
| `build/p249/mock-p249.html` + `mock-p249.js` | the mock. It `<link>`s **`src/renderer/styles/tokens.css` itself**, not a copy |
| `build/p249/measure-mock.mjs` | ONE Electron through `build/electron-run.mjs`, on a scratch profile outside the repository and outside his home, ended in a `finally`. It runs **none of Tortie's own main**: the entry is its own five-line window inside the scratch directory. `--self-test` proves 24 graders and launches nothing |
| `build/p249/walk-marks.mts` | the colour walk of §3. One plain node under the pinned `tsx`, importing the **shipping** `deriveOverrides` and the **shipping** region tables. Launches nothing |
| `build/p249/out-mock.json` | the 24 cells it read, the four current-mark passes, and the 18 ratios it computed |
| `build/p249/out-marks-walk.txt` | what the colour walk of §3 printed |

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

### 0.1 The fixture now contains the shape fault 2 is about, and the first version did not

Research 113 §2 established that the only shape in which one marked run spans many wrapped lines is
**the block the caps refused** — one `<del>` of the whole old paragraph followed by one `<ins>` of the
whole new one — and called it "the shape of his screenshot". The first version of this mock's fixture
never reached that fallback: its widest change drew **7** fragments, so §1.3's headline was
demonstrated at a fifth of the case it is about.

The fixture's long paragraph now has **two sides that share almost no vocabulary and are long enough
that the word-level edit distance passes `REDLINE_MAX_EDIT_LENGTH`**, so `wordRuns` returns
`undefined` and `redline-document`'s whole-block fallback fires. Measured on the live page, dark base:
the widest mark draws **18 fragments at 1349px and 34 at the floor** in the today column, and the
current change's ring draws **23 outlined boxes at 1349px and 43 at the floor**. That is the picture
§1.3 is about, and it is now in the page.

It also carries a **blank line removed** — one paragraph joined to the next — which is what found the
defect in §6.5, and a table row whose **first cell is what changed**, which is what found the defect
in §6.3.

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
so there is a **6.45px band of unpainted canvas between every pair of stacked fragments**. Eighteen
15px bars separated by seventeen 6.45px gaps is a stack of tiles.

### 1.2 The demonstration, and what the seam does and does not do

Inline padding does not change line height. So padding a mark vertically until its painted height
**is the line pitch** makes the fragments of one run meet exactly, and the run becomes one continuous
shape: flush left, ragged right, no gaps. That is the shape of a paragraph, and it is one
declaration.

The mock's **WASH** switch draws all three so they compare, and `measure-mock.mjs` reads the painted
height and every vertically adjacent painted pair off the live page:

| wash | painted | line pitch | between two fragments of ONE run | between two DIFFERENT marks | reads as |
| --- | --- | --- | --- | --- | --- |
| **Tiles** (what ships) | 15.00px | 21.45px | **6.45px** (15 pairs) | 6.45–7.80px (8 pairs) | a stack of ragged tiles |
| **Seam** | 19.44px | 21.45px | **2.01px** | 2.01–3.36px | one passage with a hairline in it |
| **Ribbon** | 21.44px | 21.45px | **0.01px** | 0.01–1.36px | one solid passage |

**THE FIRST VERSION RECOMMENDED SEAM ON A CLAIM THAT DOES NOT SURVIVE ITS OWN MEASUREMENT.** It said
"at Ribbon the two inserted table rows merge into a single green block, and at Seam a hairline keeps
them two rows", which asks one number to be invisible between fragments of one run and visible
between two different marks. Inline padding is uniform, so it cannot be: read over every vertically
adjacent painted pair at 1349px on graphite, **the minimum gap is identical for both populations** at
every setting — 2.01px in seam, 6.45px in tiles, 0.01px in ribbon. There is no mechanism separating
the two cases, and CSS has none to offer, because the two fragments are on different lines and a
selector cannot see that.

And the hairline it leans on is **canvas between two washes that this same document measures at
1.152:1 and 1.223:1 against that canvas**, which is below every floor in the product. §2 refuses to
let the wash carry meaning for exactly that reason, and a hairline made of it cannot carry meaning
either.

**So the choice between Seam and Ribbon is taste, and it is stated as taste.** Both close the band
that draws the tiles; Ribbon closes it completely and Seam leaves 2.01px, which is a visible texture
at a wide pane and nothing at all at reading distance. The mock draws both and the switch is on its
face. **Seam is still what this document would pick**, because a 2px band leaves a marked passage
looking like marked prose rather than like a filled box, and because the failure mode of being two
pixels short is today's defect in miniature rather than two washes overlapping — but that is a
judgement and there is no measurement behind it.

### 1.3 What cannot be done, and what turned out not to need doing

**A wrapped mark cannot be given ONE rounded outline that follows its own ragged silhouette.** An
inline box that breaks paints one background box per fragment, and `box-decoration-break: clone`
gives *every* fragment all four corners, which is more tiles rather than fewer. A silhouette needs
either one absolutely positioned box per fragment or an SVG path recomputed from `getClientRects()`
on every reflow, and research 113 §7.1's numbers refuse both.

**But the thing that needed a shape did not need a silhouette.** Driven over **every** change at both
widths rather than over whichever one happened to be current:

| | today 1349 | today 319 | proposed 1349 | proposed 319 |
| --- | --- | --- | --- | --- |
| worst outlined boxes on any one change | **23** | **43** | **0** | **0** |
| changes drawing a rail bar | 0 of 16 | 0 of 16 | **13 of 13** | **13 of 13** |

The current change is named by **one absolutely positioned bar in the rail**, spanning from its first
client rect's top to its last one's bottom: **one element, at rest zero**, no ring and no boxes.

**THE RAIL NEVER COLLAPSES, AND THE FIRST VERSION LET IT.** It set the rail to zero at the panel's
floor and scoped the outline that would otherwise replace it to the *today* look, so at 319px the
current change was marked by **nothing at all** — dropping Phase 239's shape 4, that the current
change is marked and the mark persists, at the one width where the outline is worst. The rail narrows
to a bar's own **3px** with a 4px gutter instead. It costs the column seven pixels at the floor,
measured at 271.00px of text column against 264.00px, and it keeps one mechanism at every width.

### 1.4 The wash arithmetic rests on a font metric, and that is a stated limit

`--rl-fontbox` is `calc(var(--text-base) * 1.1539)`. Measured on the live page two ways — an unpadded
inline's own client rect and a one-character Range — the real font box is **15.00px** against the
declared **15.0007px**. The constant is right for `-apple-system` at 13px on this machine and it is
**derivable from no CSS expression**: `em`, `ex`, `cap` and `ch` are all glyph measures and CSS
exposes no unit for a line box's content area.

The two failure modes are not symmetric. Too small and the band comes back, which is today's defect
in miniature; the mock guards that side with `max(0px, …)`. Too large and the washes of vertically
adjacent lines **overlap**, which is the tiles defect inverted into ink over the neighbouring line,
and no arithmetic guards it. So the long side is guarded by a reading rather than by a declaration,
which is §7's arm 6: the app run reads the painted height against the pitch on the real face and
fails outside a band.

---

## 2. WHAT THE MOCK MEASURED, today against proposed

Read off the live page by `build/p249/measure-mock.mjs`, dark base, seam wash (paper is identical on
every geometric row and is in `out-mock.json`).

**DEAD SPACE MEANS THE SCROLLER LESS THE DOCUMENT BOX, everywhere in this document.** That is research
113 §1's own definition and the first version of this table used a different one — the scroller less
the **page**, counting a rail and a margin that hold nothing at rest as occupied — which moved the
headline from 45% to 23% by arithmetic rather than by design. The tracks reading is printed beside it
so the two can never be confused again.

| | **today** 1349 | **proposed** 1349 | today 699 | proposed 699 | today 319 | proposed 319 |
| --- | --- | --- | --- | --- | --- | --- |
| document box | 556.81 | **735.83** | 556.81 | 667.00 | 319.00 | 312.00 |
| **dead space (document)** | **58.72%** | **45.45%** | 20.34% | **4.58%** | 0.00% | 2.19% |
| dead space (the page's tracks) | 58.72% | 43.08% | 20.34% | 0.00% | 0.00% | 0.00% |
| **free canvas left / right of the text** | **396.1 / 396.1** | **322.6 / 290.6** | 71.1 / 71.1 | 32.0 / 0.0 | 0.0 / 0.0 | 7.0 / 0.0 |
| text column | 508.81 | **687.83** | 508.81 | 619.00 | 271.00 | 264.00 |
| characters | 62.1 | **84.0** | 62.1 | 75.6 | 33.1 | 32.2 |
| document height | 1033.04 | **885.38** | 1033.04 | 1015.46 | 1676.40 | 1676.40 |
| drawn line boxes | 45 | 38 | 45 | 44 | 75 | 75 |
| marks | 27 | 33 | 27 | 33 | 27 | 33 |
| **marks carrying a wash** | 27 of 27 | **21 of 33** | 27/27 | 21/33 | 27/27 | 21/33 |
| mark fragments | 50 | 46 | 50 | 51 | 72 | 76 |
| widest mark, in fragments | **18** | 13 | 18 | 15 | **34** | 35 |
| **painted / pitch** | 15.00 / 21.45 | **19.44 / 21.45** | same | same | same | same |
| fragments past the column's content edge | 0 | 0 | 0 | **3** | **7** | 4 |
| fragments past the table's own closing pipe | 3 | **0** | 3 | 2 | 5 | 2 |
| spread of the rows' closing pipes | 427.9px | **593.4px** | 427.9 | 550.1 | 156.5 | 163.7 |
| **rows of prose the chip covers** | 1 | **0** | 1 | 1 | 2 | 2 |
| **`Accept all` past the column's right edge** | **414.1px** | **0.0px** | 89.1px | 0.0px | 18.0px | 0.0px |
| **what marks the current change** | 23 outlined boxes | **one rail bar** | 23 boxes | one bar | **43 boxes** | one bar |
| changes | 16 | **13** | 16 | 13 | 16 | 13 |
| **changes inside the table** | 9 | **6** | 9 | 6 | 9 | 6 |
| text nodes in the document | 52 | 55 | — | — | — | — |
| elements in the document | 44 | 47 | — | — | — | — |

**Three rows are worse and they are named rather than buried.**

- **The spread of the rows' closing pipes goes the wrong way, 427.9px → 593.4px**, and the first
  version published it going to 130.0px. The number is honest and so is the reversal: at 62 characters
  a five-column table row *wraps*, so every drawn line's rightmost pipe lands near the column's edge
  and the spread is small because the rows are being clipped by the wrap. At 84 characters the rows do
  not wrap, so a four-column deleted row and a five-column inserted row are drawn at their true
  lengths and the difference between them is visible. **A redlined table cannot be made to line up**
  (§6.3), and a wider column makes that more visible rather than less. It is the strongest argument in
  this document for someone preferring Direction A's narrower measure.
- **Three fragments pass the column's content edge at 699px where today none do**, because the
  row-aligned composition draws whole table ROWS as marks and a row wraps inside its own cell padding.
  At the floor the same change goes the other way, 7 to 4.
- **The document is 7px narrower at the floor**, which is the rail refusing to collapse (§1.3).

**And one row is credited to the wrong thing if it is read alone.** "Fragments past the table's own
closing pipe: 3 → 0" is a property of the WASH and not of the row-aligned composition. The same
proposed page read with the **tiles** wash still crosses 3 times at 1349 and 4 times at the floor;
what removes the crossing is dropping the trailing inline pixel, which §6.2 does. The counter also
skips an unwashed mark by construction, so taking a wash away improves it without moving a pixel —
which is why §2 publishes the crossings against the **column's content edge** beside it, where the
proposal is 0 at his pane and worse than today at 699.

**The ratios the design depends on, computed by the ruler from the colours the live page resolved, on
the ground each really sits on** — nothing quoted, and no floor lowered:

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

All eighteen clear their floor on both bases **at the shipped frame**, which is the only frame this
table is taken at. §3 is what happens at the other thirty-four.

**The design leans on no new colour and promotes nothing.** Research 113 §7.4's warning is respected
verbatim: the wash reads **1.152:1** and **1.223:1** against the canvas, so **colour and the
strikethrough remain what carry the meaning** and the wash stays decoration — it is only *taller*.

### 2.1 The resting bands, which is what he was actually looking at

The fault he described is text stopping with empty canvas to its right. **The first version of this
design made that band bigger.** It centred the *page* — a 20px rail, the column and a 264px margin as
one box — so the reading column sat 122px left of the pane's centre, and the free canvas to the right
of his text went from **396.09px to 428.59px** at 1349, while the margin holding it was empty until a
change was current. Nothing in the first version measured that row.

The page is now **the rail and the column and nothing else**, and the chip lives out of flow in the
free canvas beside it rather than in a reserved track. Both bands shrink together:

| | today | proposed |
| --- | --- | --- |
| free canvas left of the text, 1349px | 396.1px | **322.6px** |
| free canvas right of the text, 1349px | 396.1px | **290.6px** |

The column sits **16px right of the pane's centre**, which is half the rail's width plus its gutter,
and it errs towards *less* canvas on the right, which is the side he was looking at.

---

## 3. THE TWO COLOURS THE PICTURE IS DRAWN IN, WALKED — and one of them fails

Research 113 §7.4 found that `--error` and `--success` are in `CONTRAST_CHROMA` but in **no chromatic
pin**, so no floor is asserted on a deletion or an insertion against any ground, at any hue, contrast
level or frame. The first version of this document deferred the walk to the build phase and published
4.837 as clearing. **The walk is ninety seconds of node and it belongs here**, because it is what says
whether a pin is affordable.

`build/p249/walk-marks.mts` imports the **shipping** `deriveOverrides` and the **shipping**
`FRAME_REGION` / `FRAME_REGION_LIGHT`, reads `tokens.css` the way `build/hue-conformance-probe.mts`
reads it, and computes every ratio with culori's full entry. It walks **every offered cell of both
bases × all three contrast levels × every whole degree at the shipped scheme and every fifteenth at
the other three**, asking each of `--error` and `--success` against the plain canvas and against its
own wash composited over that canvas. **202,176 readings.**

**7,676 of them are under 4.5:1, and every one of them is `--error` on its own wash on the dark base.**

| contrast level | readings under 4.5 | offered cells with at least one failing hue | worst |
| --- | --- | --- | --- |
| Normal | 1,440 | **4 of 35** (shade 2, depths −3…0) | **4.217** at hue 73 |
| Raised | 2,084 | **8 of 35** (shades 1 and 2, depths −3…0) | **4.186** at hue 73 |
| High | 2,880 | **8 of 35** | **4.135** at hue 73 |

The binding frame is **shade 2, depth −3, hue 73**, whose canvas is `#1f211d`: a lighter canvas makes
the wash-over-canvas ground lighter, and `--error` does not move with it. `--success` never fails —
its worst is 6.009 dark and 5.027 light. The light base clears everywhere, worst **4.833**.

**This is a pre-existing defect and not one this design creates.** The wash exists today, the glyph
sits on it today, and the ratio is unchanged by making the wash taller. What the design changes is how
much of the deleted word's area sits on the failing ground rather than on the canvas, which makes it
more visible rather than more wrong.

**What a pin would cost, since §7's own instruction was to measure that before proposing one.** A
4.5:1 pin on `--error` against its own wash refuses exactly the eight cells above: **the dark region
goes 35 → 27 and the light region does not move**, and **the shipped default (shade 0, depth 0)
survives**. That is a very different answer from Phase 218's, where a pin at a shipped hex collapsed
the region from 35 to 16 *with the default outside it*.

**This document does not propose the pin, and says why.** Eight of the thirty-five frames a person can
choose today would stop being offered, and the cheaper fix is on the other side of the pair: the wash
is a fixed `rgba` over a canvas the frame moves, so deriving it from the canvas the way the neutrals
are derived would hold the ground steady and cost no cell at all. Both are palette decisions, this
phase changes no product code, and **the reading is recorded so the next palette change is told about
it.** It is the strongest candidate for the build phase's first `conformance:hue` arm.

---

## 4. THREE DIRECTIONS

Each answers all five faults. The work for faults 2, 3 and 5 is the same in all three; what differs
is where the room goes and what it is for. **The letters here are not research 113 §9's letters** —
that section was written before the mock existed and its own header now says so.

### 4.1 Direction A — **The column**

One box, no new structure. The measure becomes the **text's** measure rather than the box's, at 84
characters; the bar takes the column's own box so both of its ends land on the text; the wash gets its
pitch; the table is composed row against row; the leaf rules of §6.5 land. The chip stays exactly
where Phase 236 put it and the current change keeps its outline.

*Trade in one clause:* it delivers **all** of the space — the same 45.45% and the same 322.6/290.6
bands as B, because space is what the measure buys and not what the tracks buy — and it leaves the
chip on his prose and the current change drawn as 23 outlined boxes at his pane and 43 at the floor.

### 4.2 Direction B — **The column with margins** ← recommended

A, plus a **20px rail** carrying the current change's bar, and the chip placed in the free canvas
beside the column whenever that canvas holds it. Dead space is **the same as A**; what changes is that
the chip covers **0 rows** of prose at his pane instead of 1, and the current change is **one bar**
instead of 23 or 43 outlined boxes.

*Trade in one clause:* it buys **no additional space at all** over A, it is two chip placements that
must both be kept true, and the band arm is only reachable at wide panes — measured at 291.6px of free
canvas against a 223.1px chip at 1349, so the mock's own chip needs a pane of about **1246px** and the
product's 258.28px chip needs about **1316px**.

### 4.3 Direction C — **The review pane**

The room becomes a persistent list of the changes docked beside the document — one row per change with
its phrase, its number, and its two verbs — and the document keeps the 68ch measure it has.

*Trade in one clause:* it answers navigation best and it is a second reading of the same document, so
it doubles the mounted DOM research 113 §7.1 says is already unbounded, and it is IDE furniture that
the scope guardrail asks us to justify rather than build.

### 4.4 The recommendation, and it is a recommendation

**Direction B**, with fault 3 built first inside it — and the reasons have changed since the first
version, which claimed B was "the only one whose arithmetic answers the sentence he actually wrote".
That was an artefact of the definition change in §2 and it is not true.

**The honest split is this.** The *column* work is what he will see as space: 62.1 characters to 84.0,
15% less document to scroll, and the blank band right of his text down from 396.1px to 290.6px. **All
of that is in A.** The *page* work is affordance and nothing else: the chip stops covering his prose
at his pane, and the current change stops being a stack of outlined boxes at every pane. **That is
what B adds, and it adds no space.**

B is recommended because the second half is not cosmetic — 23 outlined boxes on one change at the pane
he works in, and 43 at the floor, is fault 2 as he described it, and A cannot fix it without a rail to
put the bar in. But **if what he wants is one change that lands this week, A is honest and cheap and
forecloses nothing**, because every piece of it is a piece of B and it carries the whole of the space
answer. And **if what irritates him most is the table rather than the room**, fault 3 alone is the
largest correctness win in this document — 9 table changes to 6, `Sessions` word-diffed against
`Ledger` in its own row rather than against a different row's cell — and it is composer work that
needs no layout at all.

---

## 5. What is refused, and why

1. **One rounded outline following a wrapped mark's silhouette** (§1.3), and `box-decoration-break:
   clone`, which makes it worse.
2. **A seam that separates two different marks from two fragments of one run** (§1.2). Inline padding
   is uniform and a selector cannot see that two boxes are on different lines. The choice between Seam
   and Ribbon is taste and is stated as taste.
3. **The columns of a redlined table lining up** (§6.3). A drawn line carries both versions'
   characters and therefore neither version's grid.
4. **Rendering the table as a table.** `RedlineDocument` draws the file's source by an explicit
   decision the operator confirmed, and this phase does not re-open it.
5. **Dropping `pre-wrap`.** It is the one rule the projections depend on.
6. **Letting the document fill the pane.** Research 113 measured a 52.1% mean row fill and a
   158-character prose line; that is not a reading measure.
7. **A margin as the *only* home for the controls.** Research 96 §4.1 and research 113 both measured
   0.00px of free canvas at the panel's floor, so the overlay arm is required and is not a fallback
   anybody may delete.
8. **A pin on `--error`** in this phase (§3). It is affordable — 35 cells to 27 with the default
   surviving — and it is a palette decision, and this phase changes no product code.

---

## 6. THE SPEC the build phase implements

For each fault: what changes, what stays, what it costs, what is refused.

### 6.1 Fault 1 — the measure

**What changes.** `.ed-redline-doc` gets a measure of its own, **stated in characters of TEXT rather
than of box**: `--redline-measure: 84ch` applied so the 48px of inline padding is *outside* it. The
shipped `max-width: 68ch` with the padding inside delivers **62.1** characters, so the number in the
stylesheet has never meant what it says. The document sits in a two-track page — `[rail] [column]` —
with `width: fit-content; margin-inline: auto`.

**What stays.** The column is still centred to within half the rail's width, still `pre-wrap`, still
`overflow-wrap: anywhere`, still `--text-base` at 1.65. The preview's `markdown.css:35` is **not
touched** — Phase 248 owns it.

**What it costs.** 84 characters is nine over the comfortable prose measure, and research 113 §1.1
measured that trade directly: 84ch drew 6 wrapped marks against 68ch's 10, and 15% less document to
scroll. §2 records the cost on the other side: the rows of a redlined table stop wrapping, so their
true lengths become visible and the spread of their closing pipes grows. At the floor the column is
32.2 characters and the tracks collapse to a 3px rail.

**Refused.** Letting the document fill the pane (§5.6).

### 6.2 Fault 2 — the wrapped run

**What changes.** The wash paints the **line pitch minus a 2px seam** (§1.2), so a wrapped run is one
continuous shape. The trailing inline pixel goes and the leading one stays — the shipped `padding: 0
1px` puts the wash **1.00px past the last glyph**, and dropping both puts `starts` and `asks for`
glyph against glyph. The current change stops being an outline on the inline wrapper and becomes
**one absolutely positioned 2px `--accent` bar in the rail**, from its first client rect's top to its
last one's bottom.

**What stays.** `box-decoration-break` is left alone; it already computes `slice` and it is not the
fault. `.ed-redline-change`, its identity attributes and `tabindex="-1"` are untouched, so Phase 227's
press, Phase 238's accept and Phase 239's persistence read exactly what they read today.

**What it costs.** One positioned element while a change is current, **zero at rest**. Two marks of
the *same* colour on vertically adjacent lines now touch across a 2px seam rather than a 6.45px band,
and §1.2 says plainly that nothing distinguishes that seam from the one inside a single run. The wash
height is a font metric (§1.4) and the long side of it is guarded by a reading rather than by
arithmetic.

**Refused.** §5.1 and §5.2.

### 6.3 Fault 3 — the table

**What changes, and this is the largest item.** A change block whose every line is a table line is
**diffed row against row**: the rows are aligned first, then each PAIR is word-diffed on its own and
an unpaired row is a whole deletion or a whole insertion. A separator row pairs only with a separator
row, is never word-diffed, and when both sides are plain dashes — no `:` alignment marker on either —
the deleted copy is **not drawn**, so the reader sees the separator once, the way the file has it. The
block gets one wrapper carrying `--font-mono` at `--text-sm`, at any width but the pane's own floor.

**HOW THE ROWS ARE ALIGNED, AND THE FIRST VERSION GOT IT WRONG.** It keyed on the row's **first
cell**, which means a row whose first cell is what changed cannot pair at all: a renamed label column —
the commonest table edit there is — degrades **every** row from word level to a whole-row deletion
beside a whole-row insertion, which is a *worse* picture than the flat stream it replaces. The
fixture already carried the case and the first version drew it wrong: `| Sessions | the tab order | …`
against `| Ledger | the tab order | …` is one row with one word changed and it was drawn as two whole
rows.

The key is **resemblance over the whole row** — an order-preserving longest common subsequence in
which two rows are "the same row" when they share at least **0.5** of their word tokens, which is
research 110 §6's own measure and its own threshold reused rather than invented. Measured on the
fixture, the pair now composes to `del "Sessions"` beside `ins "Ledger"` and nothing else.

**THE CAP IS THE BLOCK'S AND NOT THE ROW'S**, and the first version got that wrong too.
`REDLINE_MAX_EDIT_LENGTH` is 200 and was tuned for **one** `diffWords` per change block; a per-row
call with the same 200 lets a 4,000-character table block spend on the order of two hundred capped
Myers passes where the cap promised one, which is ruling 4's own promise. The budget is shared: each
pair is given what is left, and a pair that cannot be word-diffed inside it is a whole-row
replacement, which is the same fallback the block-level cap already has.

**WHICH SIDE OF `REDLINE_MAX_BLOCK_CHARS` THIS SITS ON, AND `tableRuns` GETS A REFUSAL OF ITS OWN.**
The paragraph above settles the *word* cap and the first two versions of this document settled nothing
about the other two, which is the larger question, because `wordRuns` returns `null` when its cap
refuses and **`tableRuns` returns a value on every input there is**. It sits **after** the block cap,
inside it: a change block over 4,000 characters is skipped exactly as it is today, `redlineSkipNote`
says `N too long`, and Pierre's own two rows still show it. **So fault 3 is NOT fixed for a table over
the char cap**, and that is a stated limit rather than an omission — **46 of the 1,951 markdown tables
in this repository exceed it**, including one in `DESIGN.md` at 8,231 bytes and one in
`docs/BACKLOG.md` at 22,283 bytes.

**And the char cap alone does not bound what this path mounts.** Driven over this document's own
composer at sizes the mock never reaches, with both sides *inside* the cap: at **666 rows and 3,330
bytes** — the shortest legal rows, which is the worst case 4,000 characters admits — the flat path
emits **2 runs** and the row path emits **1,332**, in 112 ms. Research 113 §7.1 is explicit that the
Redline mounts the whole document with no virtualizer, so 1,332 runs is 1,332 mounted elements out of
one block where today's caps guarantee two, and *"a design whose cost is unbounded mounted DOM is
refused"* is ruling 4's own sentence. `pairRows` is an O(n·m) dynamic program with a token-bag
`resemble` at every cell besides: past the cap, doubling 600 rows to 1,200 costs **755 ms → 3,005 ms**,
which is the shape rather than the constant.

**The bound is a row count and it is derived rather than picked.** `tableRuns` takes
`REDLINE_MAX_TABLE_ROWS = 60` per side and returns `null` above it, so the block takes the whole-block
refusal every other cap already takes. 60 is nearly twice the widest table this repository holds under
the char cap, which is **32 rows** in `docs/research/26`, against a median of 7 and a p99 of 22 over
1,905 such tables; at the bound the pass costs **2.7 ms and 120 runs**. It refuses nothing a person
has, and it is what stops a generated or pasted table of narrow rows mounting a thousand boxes.

**THE CHANGE UNIT MOVES WITH THE COMPOSER, and that is unpriced either way.** `changesOf(runs)` is
what ⌥↓, ⌥⌫, ⌥↩ and the `N of M changes` counter all read, so for a table whose flat edit cap collapses
the block, one change becomes up to one per paired row: measured at **1 → 101** on a 200-row table.
The 400-pair fuzz says this is not the general case — rows never exceeded flat there — it is specific
to the shape fault 3 exists for. Finer granularity is arguably the gain rather than the cost, and §2
publishes the count going *down* on the fixture; it is named here because a build phase must decide it
on purpose rather than inherit it.

**What stays.** The view draws the file's **source** and renders no markdown.

**What it costs.** On this fixture, 52 text nodes and 44 elements become **55 and 47**, a 5.8% and
6.8% rise against research 113 §7.1's budget. The mono face at a 699px pane wraps a 95-character row,
which is why the block falls back to the document's own face at the floor. And §2's pipe-spread row is
the honest cost of the wider measure it sits inside.

**Refused.** §5.3 and §5.4. Measured: the spread of the rows' closing pipes goes **427.9px →
593.4px** and not to zero. A horizontal scroller for a wide block is Phase 248's ruling and is not
taken here.

### 6.4 Fault 4 — the controls

**What changes.** The chip is placed in the **free canvas beside the column** whenever that canvas
holds it, anchored at the current change's first client rect. `Accept all` and a `N of M changes`
counter sit in a bar whose inner box is **the page's own grid**, so both ends land on the column:
measured at **414.1px past the column's right content edge today and 0.0px in the proposal** at
1349px, and the fault was never the button's placement.

**ONE DECISION, ONE NUMBER, MEASURED.** The first version gated the margin on a `data-room` ladder at
1060px while the placement itself asked whether a 264px track was at least 200px wide — one decision
taken with two numbers, neither derived, and a 264px cliff on one pixel of drag. The question is now
asked once, of the chip's **own drawn width**: does the free canvas beside the page hold it? A
re-labelled button moves the answer by itself.

**What stays.** Every one of Phase 236's four rulings. The anchor is `getClientRects()[0]` and never
the bounding box. A control in the flow is still refused. A chip that takes focus is still refused.
Where the canvas does not hold it, the chip falls back to exactly today's overlay.

**What it costs.** `.ed-redline-view` stops being the only positioned box in the view: the page
becomes the containing block, which is a fact stated in `redline-chip.tsx`, `RedlineDocument.tsx` and
`redline.css` and all three must move together. **The chip is a child of the page in BOTH arms**, so
it scrolls with the document either way and its `scroll` listener really can go — the first version
claimed that saving while appending its overlay arm to the pane, where the listener is still required.

**Refused.** §5.7.

### 6.5 Fault 5 — the highlight and the rule

**What changes.** Four leaf-level rules, none of which moves a byte:

1. **No wash on a mark with no letter and no digit** that is not whitespace, being the `|` and the
   `---` of a table. It keeps its colour and its strikethrough.
2. **No wash on a whitespace mark that is not a spacing change.** `exactRuns` makes a real spacing
   change as a `del "   "` beside an `ins " "`; a whitespace mark with no opposite-kind whitespace
   next to it is a deleted line's own trailing newline riding along, and washing that paints a bar
   past the last glyph on the row.
3. **A change must carry ink**, and this rule is the revision round's, because rules 1 and 2 together
   drew one of the commonest prose edits there is as **nothing at all**. A blank line added or removed
   composes to exactly one run, `del "\n"` or `ins "\n"`, with no other mark beside it: rule 2 takes
   its wash, the blank rule takes its strikethrough, and whitespace has no glyph for the colour to
   land on — so the reader is shown a coloured nothing while the counter, the chip and ⌥↓ all still
   treat it as a change and offer Rewind and Accept on it. The reverse, a blank line inserted so one
   paragraph becomes two, is the same shape. **That is markdown structure, exactly the class ruling 5
   was written for, and the document path has no `whitespaceOnly` tag to say it with** — that flag
   lives in the Pierre row path, which research 113 §5.1 measured at zero rows. So a whitespace mark
   whose *change* holds nothing a reader can read is drawn: as a **2px bar in its own colour**, not as
   a wash, because §2's own arithmetic refuses to let a 1.15:1 wash be the only thing that says a
   change happened. It is a **pseudo-element**, so it adds no node, no text node and no leaf, and
   research 113 §8.5's four readers of the document see exactly what they see today. Measured on the
   live page: one lone mark in the fixture, drawing a 2px box at every width on both bases.
4. **A deletion and an insertion of the same bytes are replaced by one unchanged run.** That is
   exactly equivalent on both projections and it removes the doubled line break a changed line's own
   newline draws.

**What stays. Ruling 5 stands, exactly and no wider.** A whitespace mark that IS a spacing change
keeps its wash, because in a standalone document nothing else can say that a spacing change happened.
It loses only the strikethrough, which had no glyph to draw on.

**What it costs.** The ends split adds leaves: **10 on this fixture**, taking the row-aligned
composition from 45 runs to 55.

**Refused.** §5.5, and the complete removal of the overhang, which needs one leaf per word: at the
pane he works in the crossings go **3 → 0** against the table's rule and stay 0 against the column
edge, and at the 699px pane three fragments cross the column edge where today none do, because a whole
table row wraps inside its own cell padding.

### 6.6 The files it would touch

| file | what for |
| --- | --- |
| `src/renderer/editor/redline.css` | the page grid, the measure, the wash pitch, the rail, the bar's grid, the table face, the furniture rules, the lone mark |
| `src/renderer/editor/RedlineDocument.tsx` | the page and rail elements, the `data-room` attribute from the view's own resize observer, the counter, the rail bar |
| `src/renderer/editor/redline-chip.tsx` | the measured band arm in `chipPlace`; `chipAnchorRect` untouched |
| `src/renderer/editor/redline-document.ts` | the table block, the resemblance row alignment, the shared block budget, the separator pair, the cancel pass, the ends split, the run flags including `lone` |
| `src/renderer/editor/redline.ts` | `REDLINE_MAX_TABLE_ROWS`, beside the three caps ruling 4 already names, and a line in ruling 4 saying `tableRuns` refuses like `wordRuns` |
| `src/renderer/editor/RedlineRow.tsx` | the leaf attributes the four fault-5 rules key on |
| `src/renderer/editor/redline-sentences.ts` | the counter's string, if it is not composed in place |
| `build/conformance-redline.mjs` | the arms in §7 |
| `DESIGN.md` / `docs/DESIGN-SPEC.md` | **the Redline view appears in neither today.** A phase that changes a surface writes its section |

**No native menu changes.** No surface is added, renamed or removed; the counter is not a menu item
and accept-all still has no chord, which is Phase 238's own ruling.

---

## 7. The gate arms it would need

Added to `npm run conformance:redline`, whose rules 8 and 9 already bind this family:

1. **Both projections, over the row-aligned composer**, on the committed corpus and the seeded fuzz —
   the property is unchanged and must stay unchanged.
2. **No word-level pairing across table rows**: over a fixture whose rows are reordered, every `del`
   and the `ins` it is adjacent to come from rows the alignment paired.
3. **The row alignment survives a renamed first column**: over a fixture whose every row's first cell
   changed, the rows still pair and the marks are word level. Ablate the resemblance threshold back to
   a first-cell key and it goes red.
4. **THE THREE CAPS, ASKED AS THREE QUESTIONS.** (a) *The word budget is the block's*: over a table
   block at the character cap, the total edit length spent across all its rows does not exceed
   `REDLINE_MAX_EDIT_LENGTH`, and the rows past the budget are whole-row replacements. (b) *The table
   path is inside the character cap*: a block one byte over `REDLINE_MAX_BLOCK_CHARS` reaches no
   differ at all, gets no row, and is counted `tooBig` in the note — which is what makes §6.3's stated
   limit checkable rather than asserted. (c) *`tableRuns` has a refusal of its own*: at 666 rows and
   3,330 bytes, both sides inside the character cap, it returns `null` and the block draws by the
   whole-block fallback, and at 60 rows it does not. Ablate `REDLINE_MAX_TABLE_ROWS` and the run count
   goes from the bound's 120 to 1,332, which is the reading that goes red.
5. **The cancel pass is an identity on both projections**, as a property over the fuzz.
6. **The wash arithmetic, read off the RUNNING APP and not off the stylesheet**: the painted height of
   a mark is inside a band below the line pitch — never above it, which is the overlap §1.4 names —
   and no mark carries trailing inline padding. A stylesheet reading cannot see a face substitution
   and this is the only guard on the long side.
7. **The dropped separator**: its text node is present, only the stylesheet hides it, and a `:` on
   either side draws both copies. Ablate the plain-dashes test and it goes red.
8. **No change is ever entirely undrawn**, and the property is INK rather than presence: every change
   carries at least one leaf that paints something a person can see, which for a whitespace-only
   change is §6.5's bar. Ablate the bar and it goes red — the first version's arm asked only that a
   leaf was not `display: none`, which the lone blank passed while drawing nothing.
9. **Ruling 5 both ways**: a spacing-change mark is washed and a structural whitespace mark is not.
   Two ablations, one each.
10. **Rule 9's derived file set** gains whatever files this adds, and **the floor rises in the same
    commit**.
11. **The measure means characters of text**: the document's box equals the measure plus its padding,
    read off the running app.
12. **The bar's inner grid template equals the page's**, read by matching braces so a later round
    cannot drift one from the other.
13. **The chip takes the band arm only when the band holds its own drawn width**, and the overlay arm
    is still reachable and still anchored on `getClientRects()[0]`. One number, read from the chip.
14. **The rail never has zero width** at any `data-room`, and the current change is marked at every
    width. Ablate the floor's rail and it goes red.
15. **Colour and decoration, not the wash, carry the meaning**: `del` and `ins` differ in both `color`
    and `text-decoration`, so a design that leaned on a 1.15:1 wash would fail.

**One instruction for `conformance:hue`, and §3 has already carried it out.** `--error` on its own
wash fails 4.5:1 at 8 of the 35 offered dark cells, worst **4.135**, and a pin costs those eight cells
while leaving the default and the whole light region alone. The build phase inherits the reading and
the choice; it does not need to re-derive it.

---

## 8. The app run it would need

`npm run probe:p249` — ONE Electron on a scratch profile with a scratch `HOME` and its own tmux socket,
ended and unlinked in a `finally`, spawning no agent, spending no token, opening no keychain. It
drives the real Redline view over a fixture of its own at 1349, 699 and 319px on **both bases**, and
reads the same rows §2 reads: the document box against the scroller, the free canvas either side of
the text, the painted height against the pitch, the fragments past the column edge and past the
table's rule, the rows of prose the chip covers, `Accept all`'s distance from the column edge, and the
number of positioned boxes the current change draws **over every change rather than over whichever one
is current**. **Measured at the parent commit and at HEAD**, because that is the only honest proof a
defect is fixed.

---

## 9. What this document did NOT verify

- **The mock is not the product.** It draws the runs the product's engine composes and it uses the
  product's tokens, but it is 300 lines of scaffolding, not `RedlineDocument`. Nothing here proves the
  design survives contact with `contenteditable`, with `redline-caret`'s offsets, with the copy
  handler's clone, or with a recompose under an agent's write. Those are the app run's job.
- **No `.ed-redline-doc` was measured.** Every number in §2 comes off the mock's own `.rl-doc`. The
  only numbers taken off the running app are research 113's.
- **The chip's own width is the mock's and not the product's.** The mock draws a 223.1px chip; the
  running app's is 258.28px. The band threshold in §4.2 is given for both and neither is derived from
  a range of chip contents.
- **The 84-character measure is a judgement, not a solved optimum.** Research 113 swept 68, 76, 84, 92,
  100 and 120 and no cap; 84 is the row with the fewest wrapped marks. Whether he reads a
  78-character marked-up line better than a 62-character one is his eye and not a number.
- **Seam against Ribbon is taste** (§1.2), and this document says so rather than dressing it as a
  measurement, which the first version did.
- **The wash height rests on a font metric** (§1.4). A face substitution moves it and only §7's arm 6
  would catch it.
- **The row alignment was driven over ONE table**, five columns from four with three rows reordered
  and one first cell renamed. A table with duplicate rows, with no header, or with cells that changed
  AND moved is not measured.
- **The shared word budget was reasoned and not stressed.** No fixture in the mock reaches
  `REDLINE_MAX_EDIT_LENGTH` inside a table block, so §7's arm 4(a) is the first thing that would
  exercise it. §6.3's scale readings drive the *row count* and say nothing about the budget.
- **`REDLINE_MAX_TABLE_ROWS = 60` is a derived bound, not a solved optimum.** It comes from the
  widest table this repository holds under the character cap (32 rows) doubled, and from nothing else.
  What a person can read in one mounted block, and whether 60 rows of table is already past it, is
  his eye and not a number.
- **THE MOCK MODELS NEITHER BLOCK CAP.** Its `compose` applies no `REDLINE_MAX_BLOCK_CHARS` and no
  `REDLINE_MAX_BLOCKS`, and its refusal fallback draws the block WHOLE where the product gives it no
  row at all and counts it in the skip note. On a 2,168-byte fixture that is immaterial, and it is a
  second mock/product difference beside the one §0 names; §6.3's readings were taken through the same
  composer, so they measure the path's own cost and not the product's caps.
- **A separator-only change draws as furniture.** When the only edit in a block is a plain separator
  row's dash count, the surviving row is `--text-muted` and what says a change happened is the
  inserted newline's 2px bar, plus the rail bar while the change is current. §7's arm 8 catches it
  (0 inkless changes at all 8 cells) and it may well be the right answer; whether it reads as a change
  at a glance is his eye, and §6.5's separator ruling does not say.
- **The mounted-DOM cost was counted in DOM nodes on a 2,168-byte fixture.** 52 to 55 text nodes says
  nothing about the 60-block worst case research 113 §7.1 derives arithmetically.
- **§3's walk is arithmetic and not a photograph.** It computes what the shipping derivation produces;
  no frame was drawn and read back.
- **One machine, one build, two Electron launches**, at `dpr` 2 with reduced motion emulated, both on
  scratch profiles removed in a `finally`. His `-L gmux` sessions were counted at 32 before and 32
  after, no file of his was opened, and no product file was changed.
