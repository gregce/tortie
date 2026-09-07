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
- computed `position: sticky`, `z-index: 1`, an opaque background, so nothing shows through;
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
