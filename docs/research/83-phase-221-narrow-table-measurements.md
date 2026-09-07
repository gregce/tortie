# 83 — the diagnostics sessions table in a narrow pane, measured

Phase 221's measure step, 2026-09-07, at `d607dde`. Four Electron runs on scratch profiles and
scratch tmux sockets, every one through `build/electron-run.mjs`. No agent spawned, no token spent,
no keychain opened, no clipboard touched, socket `gmux` never addressed.

Run 1 is `npm run probe:p219` as committed. Runs 2 to 4 are throwaway scripts written for this step
and not kept, because everything they found is either in this file or belongs in a gate.

## 1. The committed probe reproduces the entry exactly, and the verifier's +7px is one cell

`npm run probe:p219` at this parent read **1255 / 563 / 455 / 282**, which is the entry's table to
the pixel. The Phase 219 verifier read 1262 / 570 / 461 / 282.

**Both are right, and neither is a constant.** The difference is entirely the CPU column, and it is
the CPU cell's own text. `cpuLabel` (`src/renderer/diagnostics/format.ts:34`) answers `0%` for an
idle session, `3.2%` below ten percent and `12%` above it. Driven in the running window over the
same row:

| the CPU cell reads | the CPU column | the whole table floor |
| --- | --- | --- |
| `0%` | 39px | 563px |
| `3.2%` | 46px | 570px |
| `100%` | 50px | — |

39px is the header `CPU` plus its sort chevron; the header binds while the cell says `0%` and the
content binds the moment it does not. So the four numbers in the entry and in the
`.diag-session-name` comment move by 11px with nothing but the machine's load, and the residual
single pixel between 462 and the verifier's 461 is subpixel rounding on a cell held at `max-width: 0`.

**Nothing may pin these as constants.** The rule a gate can hold is the ORDERING — that the table's
floor exceeds the card at `EDITOR_MIN` — never the four numbers.

## 2. The entry's worst case was not the worst case: it is 674px, not 563px

The p219 fixture names its project directory `project`, seven characters, so the Project column
measured 56px. `.diag-project` is capped at 22ch but 22ch is a **maximum**; the column's floor is
its own content up to that cap. Re-run with a 44 character directory name, the shape of a real
repository:

| column | floor | what binds it |
| --- | --- | --- |
| Session | 166px | content, at the 22ch cap |
| Project | **166px** | content, at the 22ch cap |
| Agent | 48px | the header |
| Processes | 71px | the header |
| CPU | 39px | the header (`0%`) |
| Memory | 60px | the header |
| Started | 56px | the header |
| Last seen | 67px | the header |
| **sum** | **673px** | `table.scrollWidth` 674 |

So the table's true floor is **674px against a 282px card, and the gap is 392px** rather than the
173px the entry carries or the 179px the verifier read. Two of the eight columns are person-typed
strings that each reach 166px; the other six are at their **header** minimums and their content
never binds. There is no slack anywhere in the row, and there is twice as little as anyone thought.

22ch resolves to **166.29px** in the table's own font, measured in the cell.

## 3. What a person actually sees today

At `EDITOR_MIN` with a project name that reaches its cap, driven and read off the DOM:

| column | width | on screen |
| --- | --- | --- |
| Session | 166px | 166px, 100% |
| Project | 166px | 116px, 70% |
| Agent, Processes, CPU, Memory, Started, Last seen | 48–71px each | **0px, 0%** |

The finding is not "a horizontal scrollbar is drawn". It is that the two columns which merely
IDENTIFY a row fill the card, and **every column that says anything about the session is entirely
off screen**. That is the thing to weigh the three answers against.

## 4. The independent method, and the trap it sprang on me

The re-derivation is a detached clone of the table at `width: min-content`, hosted off screen, its
columns summed and required to agree with the live `th` rects and with `table.scrollWidth`.

**The first version of it disagreed by 17px and the bug was mine**, which is the useful half. The
clone was hosted on `document.body`, so `22ch` resolved against the body font (13px system,
180.14px) instead of the table's (166.29px), and it over-read exactly the two `ch`-capped columns
and no others — Session by 14px and Project by 3px. Hosted inside `.diag-group-sessions` the two
methods agree column for column, 673 against 673.

The other trap, the one the Phase 219 verifier caught once already, sprang again the moment a
subset was measured: three candidate column sets read `282px` against a `282px` card, which is the
table FILLING the card and not its floor. Every subset floor below is read at an 82px card, far
under any of them.

## 5. The three answers, priced

### Answer 1 — let the table reflow. Refuted by measurement.

Every `th` and `td` set to `white-space: normal`, driven at the worst case:

- the floor falls from 674px to **464px, which is still 182px wider than the card**, so the
  scrollbar is still there;
- the body row grows from **27px to 387px**, because a 137 character hyphenated session name wraps
  into a paragraph.

It does not close the gap and it costs fourteen times the row height to not close it. Wrapping the
headers alone buys 26px, all of it from `Last seen` going to two lines. Answer 1 is dead.

### Answer 2 — drop columns by container query. Refuted as written.

Every subset driven at an 82px card, so each number is a floor and never a fill:

| kept | floor | against the 282px card |
| --- | --- | --- |
| all eight | 674px | over by 392 |
| drop Started, Last seen | 550px | over by 268 |
| drop those and Agent | 503px | over by 221 |
| drop those and Processes | 432px | over by 150 |
| **Session, Project, Memory** | **392px** | **over by 110** |
| Session, Project, CPU | 372px | over by 90 |
| Session, Project, Processes | 404px | over by 122 |
| **Session, Project** | **333px** | **over by 51** |
| Session, Memory | 226px | fits, 56px spare |
| Session alone | 166px | fits |

**Session and Project alone are 333px and do not fit**, so the entry's preferred keep-set — Session,
Project and one number — cannot be made to fit at `EDITOR_MIN` whichever number is chosen. Only two
of the ten fit, and both of them are a two column list rather than a table.

The number worth keeping, had one fitted, is **Memory**: the sessions card's own total already reads
`N processes, X MB`, of those two the process count is near uniform across sessions while memory is
not, and "which of my sessions is holding the machine" is the question Phase 167's whole scale probe
exists to answer. It does not change the verdict — 392px, 372px and 404px are all over.

Answer 2 also costs more than a container query. The entry's premise is that dropped values stay on
the row's hover the way the name already does. Read off the DOM, **only four of the eight cells carry
a `title` today** — Session, Project, Started and Last seen. Agent, Processes, CPU and Memory carry
none, deliberately, because their HEADER carries the hover. So answer 2 needs four new per-cell
hovers on columns that were designed without them, and the values a person came for become eight
hovers instead of one glance. That is more interaction at the width where there is least room for it.

### Answer 3 — accept the scrollbar. The right ruling, and incomplete on its own.

`.diag-scroll` is `overflow-x: auto` deliberately and predates Phase 188: the CARD scrolls and the
TAB never does. That property holds at every reading above. An eight column table of real
information cannot be drawn in 282px — six of the eight columns are at their own header minimums and
the two that are not are person-typed strings already capped. This is a property of a 282px pane,
not a defect in this table, and it is the same shape of ruling Phase 194 got.

But accepting it as written leaves section 3 standing: scrolled right, a person loses which row they
are reading, because the only two columns that name the row are the two that scroll away first.

## 6. The fourth answer the entry did not price, measured: a sticky first column

Keep all eight columns, keep the scrollbar, and pin the Session column to the card's left edge so
the numbers scroll under a name that stays. Driven at `EDITOR_MIN` with `scrollLeft` at its maximum
of 392:

- the head and the cell both stay at **0px from the card's left edge**; it sticks;
- computed `position: sticky`, `z-index: 1`, an opaque background, so nothing shows through — and
  **that z-index is the one thing this section got wrong**, which section 8 measures and fixes;
- **the collapsed border survives**: `.diag-table` is `border-collapse: collapse`, which historically
  broke sticky cells, and the head's `border-bottom` still measures 1px;
- at the far end of the scroll `Started` sits beside the pinned name at 158px, so every column is
  reachable with the row still identified.

Two details measured rather than assumed, both of which a build step would otherwise get wrong:

1. **The background token is `--bg-raised`, not `--bg-canvas`.** The card is `.diag-group`, which is
   `background: var(--bg-raised)` (`diagnostics.css:103`). The probe used `--bg-canvas`, it resolved
   to `rgb(19, 20, 23)`, and it would have painted a seam against the card it sits in.
2. **The sticky cell's own background paints over the row hover.** `.diag-table tbody tr:hover` sets
   the fill on the `tr`, and an opaque `td` above it wins, so the first column would be the one cell
   that does not highlight with its row. It needs its own hover rule.

Both tokens follow the base, so this is correct on paper as well as dark with no second rule.

## 7. The verdict

**Answer 3, with the sticky first column from section 6.** Answers 1 and 2 are refuted by
measurement rather than by preference: neither closes the 392px gap, and answer 2 cannot close it
even after dropping six of the eight columns. What is left is to say so where the CSS is, correct
the four numbers the comment carries as constants, and spend four lines of CSS making the accepted
scrollbar usable instead of leaving a person scrolled into a row they can no longer name.

The rule to implement:

```css
/* The card scrolls; the name stays. */
.diag-group-sessions .diag-table th:first-child,
.diag-group-sessions .diag-table td:first-child {
  position: sticky;
  left: 0;
  z-index: 1;
  background: var(--bg-raised);   /* the card's own fill; NOT --bg-canvas */
}
.diag-group-sessions .diag-table tbody tr:hover td:first-child {
  background: var(--bg-active);   /* or the row hover stops at this cell */
}
```

Scoped to `.diag-group-sessions` so the Tortie process table, which the entry excludes, is untouched.

**What would overturn this.** A measurement showing the pane's floor is not really 282px — it is,
and `EDITOR_MIN` is 320 in `src/renderer/state/chrome-geometry.ts:97`, clamped on the drag by
`clamp(raw, min, max)` in `src/renderer/controls/resizer.ts:190` and reachable in one keystroke by
the Home path at line 312, and clamped again on the stored width by `sanitizeEditorWidths`
(`src/renderer/editor/panel-width.ts:47`), so it survives a restart. Or a decision that this tab
should not be openable in a narrow pane at all, which is a different phase. Nothing about column
widths can overturn it, because section 2 shows six of the eight columns have no give at all.

**What the gate must pin, and what it must not.** Not the four numbers — section 1 shows they move
with one cell's text. The rule that can fail is the sticky one: the first column's computed
`position` is `sticky`, its `left` is 0, its background is the card's own token and not the canvas,
and the row-hover rule exists; with an ablation of each that goes red. The floor itself is pinned as
an ORDERING — the table's floor exceeds the card at `EDITOR_MIN` — which is the true statement and
is the one a person can act on.

## 8. The fix round: what section 6 did not measure, and it was a regression

Section 6 read the pin's `z-index` as `1` and recorded it as proof the pin stacks above the cells
that scroll under it. It does, and that was the wrong question to stop at. **`.diag-head` has been
`position: sticky; z-index: 1` since Phase 163** (`diagnostics.css:34`), and the pin arrived at the
same number.

**Nothing between them makes a stacking context.** Walked in the running window, from the pinned
`th` up to `.diag`: `.diag-group` is `overflow: hidden` and `.diag-scroll` is `overflow-x: auto`,
and neither of those makes one; the only stacking context the walk finds is the pinned cell itself.
So the report's head and the pinned column are **siblings in one stacking context at one z-index**,
and tree order decides. The table is later in the document.

Measured, one window, four arms taken through the CSSOM so the build never changes, at a point three
pixels inside the head's bottom edge with a session row scrolled under it. The tab is at
`EDITOR_MIN` here only because that is where the round's other readings are taken; the width is not
what decides it, and the paragraph after the table is the proof:

| arm | head z | pin | `elementFromPoint` at (1039, 236) |
| --- | --- | --- | --- |
| as shipped at `de84278` | 1 | `sticky`, z 1 | `TH` — the table's own **Session** header |
| pin ablated to `static` | 1 | `static` | `HEADER.diag-head` — the report head |
| head lifted to 2, pin intact | 2 | `sticky`, z 1 | `HEADER.diag-head` — the report head |
| as shipped again | 1 | `sticky`, z 1 | `TH` — **Session** again |

The photograph at that point reads `#212329`, the pin's `--bg-raised`, and not the head's
`--bg-surface` `rgb(25, 27, 32)`. It takes the **hit test** as well as the paint, so a click aimed
at `Capture again` or `Heap snapshot` lands on the table's sort button instead.

**It is not a narrow-pane case and it does not need the card scrolled.** `position: sticky` makes a
stacking context whether or not its scroller is scrolled, so this happened at every pane width, any
time a session row scrolled vertically under the head. Reading 9 in the shipped probe is deliberately
taken with the pane width **removed** and `scrollLeft` back at **0** — the pin at its resting place,
where a person has done nothing sideways at all — and with `.diag-head` ablated back to `z-index: 1`
it still answers `TH "Session"` at (1039, 178) on a 461px card.

**The remedy is `.diag-head { z-index: 2 }` and nothing else.** The page's own head outranks a
column inside one of its cards. `.diag-ladder-dot` further down is `position: relative; z-index: 1`
and was sitting on the head for exactly the same reason, so the same one line fixes that too, and
`p221-sticky-name.test.tsx` now asserts the head against **every** other z-index in the file rather
than against the pin alone.

`probe:p219` reading 9 is what holds it against a real pixel: it walks the ancestors to prove the
context claim rather than assert it, scrolls the tab until a row straddles the head's bottom edge,
and asks `elementFromPoint`. With the head put back to 1 it goes red naming both clauses and reports
`TH "Session"`.

### Reading 8 could not fail, and now it can

Reading 8 samples the photograph at the header's hairline under the pin and beside it. It wanted
`pinned.d > 0` and an asymmetry, `pinned.d >= beside.d * 0.5`. Neither can fail:

- With `border-bottom` removed from every `.diag-table th`, **no hairline is painted anywhere**, both
  samples drop from 16 to a distance of **1** from the card's fill — antialiased text — and `1 > 0`
  and `1 >= 0.5` both hold. Green over a border that is not there.
- Recolouring the collapsed border from the CSSOM moves the computed style and **no pixel at all**,
  because Chromium's collapsed-border conflict resolution keeps `--border`.

So the question is asked against the **resolved `--border`** now: the strongest pixel in the band
must be closer to the border colour than to the card's fill. Shipped it reads `#26282e`, 1 from
`--border` `rgb(37, 40, 46)` and 16 from the fill. With the border removed it reads `#212329`, 14
from the border and 1 from the fill, and the reading goes red.

**And a sample must land inside the card.** Under the `static` ablation the pinned head sits at
-281px, entirely off the card, and both samples read `#131417` — the canvas behind the tab. A pixel
*was* read, so the old `d >= 0` guard held and reading 8 went green over a sample taken nowhere near
the thing it names. That is the same class as the correction section 6's probe already carried for a
band entirely off the image. The card's own rectangle is read in the same window and the sample
point must be inside it.

The three ablations, each red on its own clause, rebuilt and driven one at a time:

| ablation | what went red |
| --- | --- |
| `.diag-head` back to `z-index: 1` | reading 9, both clauses, hit `TH "Session"` |
| `border-bottom` off `.diag-table th` | reading 8's hairline, `#212329`, 14 from `--border` |
| the pin made `position: static` | reading 7's two clauses **and** reading 8's outside-the-card guard **and** its hairline |

The third one is the point: at `de84278` that ablation reddened reading 7 alone and reading 8
reported a hairline it had sampled on the canvas.
