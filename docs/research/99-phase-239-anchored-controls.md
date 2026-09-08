# Research 99 — Phase 239's starting measurements: where the controls go, and what the face says when nothing is marked

**Date.** 2026-09-08. **Phase.** 239, *the controls, anchored*. **Step.** The measure step. Nothing
is built here.

**What this document is for.** The operator said two things on 2026-09-08 with a photograph of
Cursor beside the first: *"i also want the controls to work more like cursor ide.. today the they
sort of just hover, did / does and sort of show near the line they are for the actual actions you
can take"*, and *"Also there should be clarity in the redline view about what it is showing you if
you open a new file (since the last time it was loaded)."* This document prices the four control
shapes the Phase 239 entry names, each with a layout number taken on Phase 236's own committed
ruler; quotes the three opening faces character for character off the real app; and drives Phase
236's recorded finding about the chip's Undo so the operator can rule on it.

**What was run.** Six Electrons, one at a time and never two at once, each on a scratch profile with
a scratch `HOME` and its own tmux socket, launched through `build/electron-run.mjs`'s `withElectron`
and ended in its `finally`; `build/harness-socket.mjs` owned each socket and unlinked it in its own
teardown. No agent was spawned, no token spent, no keychain opened, no request made, and nothing
under the person's home was read or written. The "agent" that writes a file from outside is a plain
`/bin/sh` running `cat`. The operator's own `-L gmux` session count was **19 before and 19 after
every one of the six runs**. The scripts are `.p239/measure.mjs` through `.p239/measure6.mjs`, their
readings are `.p239/readings*.json` and their logs are `.p239/run*.log`. The window is 1680 × 1040
at `devicePixelRatio` 2 with `prefers-reduced-motion: reduce` emulated, and the editor pane width is
set by a **real divider drag**, landing on 900, 700, 520 and 380 px exactly.

---

## 0. The answer, before any detail

**The recommendation is shape 1 plus shape 4: the controls become PERSISTENT state rather than a
pointer's guest, and the change they belong to is MARKED in the document. Its layout number is
0.00px** — document height, every change's `getClientRects()[0]` and every one of the document's 34
line boxes' left and right edges identical at all four pane widths — **while the same ruler in the
same run moved the document by up to 249.05px sideways and +130.22px of height on the planted
in-flow control it refuses.**

**Shape 2, the ending line's right-hand space, is refused as the primary home and the numbers are
the reason.** Prose wraps to a full measure, so the space at the end of a change's ending line is
nearly zero for an ordinary change: measured inside the text column it is **0.56px, 7.77px, 8.99px,
6.87px and 10.10px** for five of the nine changes at a 900px pane. Counting the right margin as
well, the three-button chip (171.60px) has room on **9 of 9** ending lines at 900px, **2 of 9** at
700px, **2 of 9** at 520px and **3 of 9** at 380px; the four-button chip (260.80px, which is what is
drawn whenever there is a rewind to undo) has room on **3, 2, 2 and 1 of 9**. An anchor that only
exists at one pane width is not an anchor.

**Shape 3, a block affordance, has a statable rule and should still be dropped.** The rule is *a
change is a block when either side carries a newline*, and it selected exactly the right one change
of ten in the fixture. But a block bar in the flow cost **+24.00px of document height, one extra
line box, and pushed the block change down 24.00px**, and out of the flow it cost 0.00px — at which
point it is the same overlay the chip already is, placed at the block's own first rect, which
Phase 236's rule already does.

**The three opening faces say this today, character for character:**

| | the whole face, one line | mode control | changes drawn |
| --- | --- | --- | --- |
| **A** a file with a HEAD version, opened cold and unchanged | `Marked since the last commit, for as long as this tab is open.` | Diff, Redline, File | 0 |
| **B** a file with no HEAD version, opened cold | `Marked since you opened this file, for as long as this tab is open.` | Redline, File | 0 |
| **C** a file an agent created and finished before it was ever opened | `Marked since you opened this file, for as long as this tab is open.` | Redline, File | 0 |

**B and C are the same string.** Not similar — identical, byte for byte, and the only difference
anywhere on the two faces is the file's own name inside the scroller's `aria-label`. All three draw
a document with no marks in it and **say nothing at all about being empty, about when the marking
started, or about what would have to happen for a mark to appear.**

**Phase 236's finding is confirmed and it is worse than "can be drawn next to a phrase it will not
act on".** Driven: `keeps` → `holds` was rewound with ⌥⌫; the chip was then opened on a different
change eight paragraphs away, `changes` → `changed`; its Undo was clicked; **the file came back to
the agent's version byte for byte — `holds` restored, `changed` untouched.** The button a person
pressed beside one phrase acted on another. Its visible label is `Undo`, its accessible name is
`Undo⌥⇧⌫`, and the only place the truth is written is its `title`, `Undo the last rewind`.
**The recommendation is to take it off the change chip**, because the sentence that already tells
the truth is already on the face, under the document: `Undo the last rewind with ⌥⇧⌫. It lasts for
this session.` Relabelling it in place is priced below and costs the chip its home.

---

## 1. The ruler, and one thing it can no longer see on its own

### 1.1 The instrument

Phase 236's verifier built the layout ruler and `build/probe-p236-chip.mjs` carries it: the
document's height and **every change's `getClientRects()[0]`**, taken with the controls and without,
which must be identical to the pixel, plus **its own ablation** — a real in-flow copy of the chip
spliced in after every change, which must move them. This run uses that code verbatim rather than a
new instrument.

At all four widths, with nine changes drawn:

| pane | chip drawn: findings | ablation: chips planted | ablation findings | worst sideways | worst downward | height |
| --- | --- | --- | --- | --- | --- | --- |
| 900px | **0** | 9 | 18 | **249.05px** | 84.77px | **+87.33px** |
| 700px | **0** | 9 | 18 | **249.05px** | 84.77px | **+87.33px** |
| 520px | **0** | 9 | 19 | **249.05px** | 84.77px | **+108.77px** |
| 380px | **0** | 9 | 14 | **161.60px** | 106.22px | **+130.22px** |

The ablation was removed after each reading and the document came back **identical to the pixel** at
every width. So the ruler works in this phase's own run, and the shape research 83 D.2 refused and
Phase 236's verifier re-measured is still visible to it.

### 1.2 The false positive Phase 237 introduced, which a Phase 239 verifier will otherwise report as a defect

**When the redline document takes focus, a change's client rects MERGE, with no glyph moving.**
Measured, DOM unchanged (`outerHTML` length 5632 on both sides, the wrapper still carrying a stamp
attribute put on it before the press, the baseline generation still 2):

| change | rects at rest | rects with the document focused |
| --- | --- | --- |
| 0 `keeps`→`holds` | two, 37.95px and 35.03px | **one, 72.98px** |
| 1 the eight-word phrase | 347.82px first | **481.63px first** |
| 2 `calm`→`serene` | 30.74px first | **73.72px first** |

Every one of the document's 34 line boxes had **the same left edge and the same right edge** in both
readings, so **no text moved at all**. Phase 236's ruler nonetheless reports three findings, because
it reads the change wrappers and a wrapper's inline box is fragmented around its `<del>` at rest and
unfragmented once the editing host holds focus. The ruler was written when the document was
read-only; Phase 237 made it `contenteditable="plaintext-only"` and a caret now lives in it.

**Two rules follow for the build phase and its verifier.** Take the before and after readings **in
the same focus state**, and **pair the change-rect ruler with a line-edge reading**, being every
line box's own left and right edge, because that is the reading that says whether a glyph moved.
The line-edge reading is also what catches the one decoration below that the change ruler
under-reports.

---

## 2. Shape 1 — persistent rather than summoned

### 2.1 What today actually does, in seven readings

| what was done | is a chip drawn? | what holds it |
| --- | --- | --- |
| the resting face, nothing focused, pointer at (4, 4) | **no** | — |
| hover a change | yes, on that change | the pointer |
| move the pointer off the change, nowhere near the chip | **no** | — |
| ⌥↓ (after the first press, see below) | yes, on change 0 | focus |
| move the pointer away while a change has focus | **yes, unmoved** | focus |
| ⌥↓ again | yes, moved to change 1 | focus |
| click a change, then move the pointer away | **yes, unmoved** | focus |

**So half of what he asked for is already true and the other half is the half he meets.** A change
that has taken focus keeps its controls while the pointer goes anywhere; a change that was only
hovered loses them the moment the pointer leaves, which is the "sort of just hover" he described.
Stepping with the chord costs **0 findings** on the ruler and **0 line edges moved**.

### 2.2 The first ⌥↓ of a view is swallowed, and this is a defect rather than a shape

With the scroller focused and the chord pressed:

| press | `document.activeElement` | chip |
| --- | --- | --- |
| first, in a fresh view | **`ed-redline ed-redline-doc`** — the editing host, with a caret at current-side offset 20 | **none** |
| second | `ed-redline-change`, offset 20 | drawn |
| third | `ed-redline-change`, offset 80 | drawn |
| every press in rounds 2 and 3 | `ed-redline-change` from the first press | drawn |

Reproduced in two independent runs. `moveFocus` calls `items[0].focus()` on a wrapper that lives
inside a `contenteditable` host, and the focus arrives at the host instead the first time. **The
press a person makes when they first try the chord they have just been told about does nothing
visible at all**, which is precisely the discoverability Phase 236 existed to fix.

### 2.3 The persistence hole that matters most: an outside write takes your place away

A change was stepped to with the chord, then a plain `/bin/sh` wrote to the file:

| | before the write | after the write |
| --- | --- | --- |
| changes drawn | 9 | 10 |
| chip | drawn at (971.09, 120.45), 171.60 × 30 | **none** |
| `activeElement` | the change wrapper, offset 80 | **the document** |
| the change the person was on | `quick brown foxes…` → `swift crimson hounds…`, offset 80 | **still drawn, same identity, same offset 80, same generation 2** |

**The change survived the recompose and the person's place in it did not.** The wrapper element is
replaced by React, focus goes with it, and the chip goes with the focus. Nothing about this is a
layout problem: the identity the current change is addressed by — offset, deleted text, inserted
text, generation — is still there to be found. **This is the whole of shape 1's work: hold the
current change as state keyed on that identity rather than on `document.activeElement`, and re-find
it after each recompose.** It costs nothing on the ruler because it draws nothing new.

---

## 3. Shape 2 — anchored to the change's own line box

### 3.1 The geometry, re-measured on the real view

| | 900px | 700px | 520px | 380px |
| --- | --- | --- | --- | --- |
| `.ed-panel` width | 900.00 | 700.00 | 520.00 | 380.00 |
| text column (content box) | 508.81 | 508.81 | 461.00 | 321.00 |
| room right of the column, to the view's edge | **200.09** | **100.09** | **34.00** | **34.00** |
| room left of the column | 190.09 | 90.09 | 24.00 | 24.00 |
| line boxes in the document | 34 | 34 | 36 | 49 |
| changes whose rects span more than one line box | 5 of 9 | 5 of 9 | 5 of 9 | 6 of 9 |
| worst `union.left − first.left` | **−418.02** | −418.02 | −418.02 | −211.54 |

**Research 83 D.3's margin numbers are confirmed, and the row above is measured from a different
edge, so the two must not be read as disagreeing.** D.3 measured the space beside the centred column
at *147.59px at 900px, 47.59px at 700px and 0.00px at 520px*. The same quantity here, being the room
outside the document ELEMENT, is **176.09px, 76.09px, 10.00px and 10.00px** on the right (the ten is
the scroller's gutter) and **166.09px, 66.09px, 0.00px and 0.00px** on the left. So D.3's 0.00px at
520px is confirmed. The row above adds the document's own 24px right padding, because a chip may sit
in it, and **34.00px is still not room for a 171.60px control**, so the margin refusal stands. The
mandatory `getClientRects()[0]` rule is confirmed independently: at the WIDE pane a wrapped change's
bounding box sits **418.02px to the left of where the change starts**, which is research 96's
435.73px finding reproduced on a different fixture.

### 3.2 The room at the end of the line the change ends on

For every change, the room between the last glyph on its ending line and the column's own right edge
(`col`), and to the view's right edge (`view`), in CSS pixels:

| change | 900 col / view | 700 col / view | 520 col / view | 380 col / view |
| --- | --- | --- | --- | --- |
| 0 `keeps`→`holds` | **0.56** / 200.66 | 0.56 / 100.66 | 1.99 / 35.99 | 10.27 / 44.27 |
| 1 eight-word phrase | 7.77 / 207.86 | 7.77 / 107.86 | 33.95 / 67.95 | 3.80 / 37.80 |
| 2 `calm`→`serene` *(paragraph-final)* | 172.45 / 372.54 | 172.45 / 272.54 | 23.80 / 57.80 | 220.77 / 254.77 |
| 3 `Wholly replaced paragraph`→… | 8.99 / 209.09 | 8.99 / 109.09 | 3.55 / 37.55 | 10.59 / 44.59 |
| 4 `Eager purple herons…` | 6.87 / 206.96 | 6.87 / 106.96 | 3.39 / 37.39 | 30.04 / 64.04 |
| 5 `noisy yellow beetles…` | 72.32 / 272.41 | 72.32 / 172.41 | 37.44 / 71.44 | 27.03 / 61.03 |
| 6 `patient silver otters…` | 54.34 / 254.44 | 54.34 / 154.44 | 248.59 / 282.59 | 181.87 / 215.87 |
| 7 `guards`→`shields` | 10.10 / 210.20 | 10.10 / 110.20 | 22.43 / 56.43 | 40.67 / 74.67 |
| 8 the inserted paragraph *(block)* | 508.81 / 708.91 | 508.81 / 608.91 | 461.00 / 495.00 | 321.00 / 355.00 |

Fits, counting the 4px gap the chip already uses:

| | 900 | 700 | 520 | 380 |
| --- | --- | --- | --- | --- |
| room inside the column for the 171.60px chip | 1 of 9 | 1 of 9 | 2 of 9 | 3 of 9 |
| room to the view's edge for the 171.60px chip | **9 of 9** | **2 of 9** | 2 of 9 | 3 of 9 |
| room to the view's edge for the 260.80px chip | 3 of 9 | 2 of 9 | 2 of 9 | **1 of 9** |

**The reading is plain.** The only changes with real room at the end of their line are the ones that
end a paragraph — change 2 and the block, and change 6 where a paragraph happens to break early.
Everything else ends inside a full measure, where prose leaves between half a pixel and ten. At
900px the right MARGIN rescues it, which is why 9 of 9 fit there; at 700px the margin is 100.09 and
the rescue is gone. **So an ending-line anchor is an anchor at one pane width, for one of the two
chips the view draws, and a right-edge clamp everywhere else** — and a control clamped to the right
edge no longer points at the change, which is the thing he asked for.

**What is worth keeping from shape 2** is smaller and free: the chip may PREFER the end of the
change's ending line when the measured room is at least its own width plus the gap, and fall back to
where Phase 236 puts it otherwise. Both places cost 0.00px. That is a preference, not an anchor, and
the build phase should weigh it against a control that moves between two places for reasons a person
cannot see.

**One collision number this fixture cannot supply.** No two of its nine changes end on the same line
box, at any of the four widths, so it says nothing about two changes wanting the same home. Research
83 D.3's own measurement stands as the evidence there: 12 changes on 6 lines, four of those lines
holding more than one, **five on one line at 520px**.

---

## 4. Shape 3 — a block affordance, and the rule for it

### 4.1 The rule can be stated, and it is one line

**A change is a block when either side carries a newline.** Over the fixture's ten changes:

| change | newlines in the deletion | newlines in the insertion | line boxes | drawn height |
| --- | --- | --- | --- | --- |
| 8, the paragraph the agent added | 0 | **2** | 6 | **122.23px** |
| every other change (nine of them) | 0 | 0 | 1 to 3 | 15.00 to 57.89px |

It selects exactly the change a person would call a block and nothing else, it needs no second
grain, and it is one predicate over data the wrapper already carries. **The rule is not the problem.**

### 4.2 What a block affordance costs

Measured at a pinned scroll, a bar inserted in the flow immediately above the block change:

| | at rest | with the bar |
| --- | --- | --- |
| document height | 797.14px | **821.14px** |
| `scrollHeight` | 797 | **821** |
| line boxes | 34 | **35** |
| the block change's first rect top | 690.58px | **714.58px** |
| any line's left or right edge | — | **unmoved** |

So a block bar in the flow is honest about one thing: it displaces nothing sideways, which is the
half of research 83 D.3's objection that a block change really does weaken. It still adds **24.00px
of height to the document and moves the change itself down by the same 24.00px**, and it is the
first thing in this view that would grow with the number of changes.

The same bar placed OUT of the flow, absolutely positioned in the view beside the block's own box:
**0 findings on the ruler and 0 line edges moved.**

**Verdict: drop it.** The affordable version of shape 3 is the overlay the view already has, placed
at the block's first client rect, which is exactly what `chipAnchorRect` already returns. A separate
block shape buys a different appearance for one change in ten and costs a second placement rule.

*(An earlier reading in the first run put the in-flow bar at +45.45px of height with a 65.83px
sideways move. It was taken at an unpinned scroll offset and is superseded by the pinned reading
above. It is recorded here rather than deleted, because a number that was published once should be
withdrawn in the open.)*

---

## 5. Shape 4 — marking the current change in the document

Six decorations, each applied to a real change wrapper and priced on both rulers. Tokens only, per
`npm run conformance:redline` rule 8.

| decoration | change-rect findings | line-edge findings | verdict |
| --- | --- | --- | --- |
| outline `1px var(--accent)` + inset `var(--border-strong)` hairline — what focus draws today | **0** | **0** | free |
| background tint `var(--bg-active)` | **0** | **0** | free |
| underline rule, `var(--accent)`, 3px offset | **0** | **0** | free |
| left rail as `box-shadow: -6px 0 0 var(--accent)` | **0** | **0** | free |
| **left rail as `border-left: 2px`** | 1: the change's own first rect **72.98 → 74.98** | 1: that line's right edge **1479.34 → 1481.34** | **+2.00px of real reflow** |
| a rail in the margin, absolutely positioned in the view | **0** | **0** | free |

Every free decoration was removed afterwards and the document came back identical to the pixel.

**Marking the current change is free four ways over, and the one form that is not free is the one a
person would reach for first.** A `border-left` rail is inside the inline box, so it widens the
change and pushes the rest of that line, and it is exactly the case §1.2 says the change-rect ruler
alone under-reports: it moved no other change's rect, and only the line-edge reading names it. A
rail is still available and it is `box-shadow`, which paints outside the box and costs nothing.

---

## 6. Part two — the three opening faces, quoted

### 6.1 What was opened

Three files in one project, all `.txt` so the mode control is Diff / Redline / File with no markdown
rows in it. **A** `tracked.txt`, committed and untouched. **B** `loose.txt`, written before the app
launched and never added to git. **C** `made.txt`, written by a plain `/bin/sh` **after the app was
running and before anybody opened it**, which is research 83 A1.2 property 2's case: `loadContents`
runs when the person opens the file, so its final bytes are its baseline.

### 6.2 Cold, at HEAD — every word on the face

**A. `tracked.txt`, a file with a HEAD version, opened cold and unchanged.**

> `Marked since the last commit, for as long as this tab is open.`

Scroller's accessible name: `Redline since the last commit, tracked.txt`. Mode control: `Diff`
(*Changes vs HEAD (read-only)*), `Redline` (*The document with its changes marked in place, and you
can type in it*), `File` (*Edit the file*). **0 changes, 0 `<del>`, 0 `<ins>`, 145 characters of
document.** No chip, correctly.

**B. `loose.txt`, a file with no HEAD version, opened cold.**

> `Marked since you opened this file, for as long as this tab is open.`

Scroller's accessible name: `Redline since you opened this file, loose.txt`. Mode control:
`Redline`, `File` — **no Diff row at all.** 0 changes, 0 `<del>`, 0 `<ins>`, 130 characters.

**C. `made.txt`, a file an agent created and finished before it was ever opened.**

> `Marked since you opened this file, for as long as this tab is open.`

Scroller's accessible name: `Redline since you opened this file, made.txt`. Mode control: `Redline`,
`File`. 0 changes, 0 `<del>`, 0 `<ins>`, 151 characters.

### 6.3 Then a shell writes to each

| | the face after the write | changes | `<del>` | `<ins>` |
| --- | --- | --- | --- | --- |
| **A** | `Marked since the last commit, for as long as this tab is open.` + `Hover a change to see its controls, or step through them with ⌥↓.` | 2 | 2 | 2 |
| **B** | `Marked since you opened this file, for as long as this tab is open.` + the same hint line | 2 | 1 | 2 |
| **C** | `Marked since you opened this file, for as long as this tab is open.` + the same hint line | 1 | 0 | 1 |

The second line is Phase 236's first-run hint, which is drawn once per session and only for a
redline that has a change in it. **So the empty faces in §6.2 have exactly one sentence on them and
the written ones have two, and the sentence that is on both is the same sentence.** Nothing on the
face changed to say that the picture went from empty to not empty.

### 6.4 What a person cannot tell from the face today, in numbers

1. **Whether the empty document means "nothing has changed" or "nothing is being compared."** The
   face carries **one sentence, 12 words, 61 characters** for A and **12 words, 67 characters** for
   B and C, and **none of those words is about the document being empty.** The picture is the file's
   own text with no marks, which is also what a file with no changes looks like and also what a file
   whose baseline was just re-seeded looks like.
2. **When the marking started.** `baselineName` has exactly two answers and **neither carries a
   time**: `the last commit` and `you opened this file`. A tab opened this morning and a tab opened a
   minute ago produce the same string. There is no timestamp anywhere in `BaselineState`, whose four
   fields are `text`, `from`, `generation` and `headSeen`.
3. **Whether an agent made this file or whether it was open when the agent wrote.** B and C are the
   **same 67-character string**, and the only difference on either face is the filename inside an
   `aria-label`. Research 83 A1.2 property 2 says they are mechanically different — C can only ever
   draw an empty redline until something writes to it again, which is what §6.3 shows: C drew 1
   change only after the shell wrote to it — and **the face is unable to say so, because the
   baseline module holds no fact that separates them.** Both answer `from: 'read'`.

### 6.5 What the build phase can say, and the one fact it does not have

Three sentences, one per shape, in *just enough words*. These are candidates rather than a ruling;
the words are the operator's to choose.

- **A, empty:** `Nothing has changed since the last commit.` (7 words, 42 characters.)
- **B and C, empty:** `Nothing has changed since you opened this at 14:02.` (9 words, 51 characters.)
- **anything with a mark in it:** what it says today, which is already right.

The **when** costs one field: a `takenAt` on `BaselineState`, set in the same place `generation` is,
named by the same pure module, reaching no bridge and writing nothing.

**Telling C from B costs a fact Tortie does not hold**, and this document will not pretend
otherwise. Both files are untracked, both seed `from: 'read'`, and nothing in the tab records
whether the bytes arrived before or after the project was opened. The file's own mtime against the
moment the tab opened is the cheap candidate and it is a heuristic: a file the person edited in
another editor a minute earlier reads exactly the same. **The honest answer for both is the same
sentence**, because what a person can act on is identical — there is no commit to compare against,
so the marks start from the bytes that were on disk when the tab opened — and the extra claim about
who wrote it is the one claim research 83 A4.2 ruling 1 already says this view must never make.

---

## 7. Part three — the chip's Undo, driven

### 7.1 What was driven, and what the file said

1. Change 0, `keeps` → `holds`, was focused and rewound with ⌥⌫. **The file changed on disk:
   `holds` gone, `keeps` back.** The note under the document appeared: `Undo the last rewind with
   ⌥⇧⌫. It lasts for this session.`
2. The pointer was then moved to a different change eight paragraphs away, change 8,
   `changes` → `changed`. The chip drew four buttons beside it: `⌥↑`, `⌥↓`, `Rewind⌥⌫`, `Undo⌥⇧⌫`.
3. **Its Undo was clicked.** The file changed again: **`holds` restored, `changed` untouched, and
   the file byte for byte back to the agent's version.**

The button pressed beside `changes` → `changed` acted on `keeps` → `holds`. That is Phase 236's
recorded finding, driven rather than reasoned.

### 7.2 What the button says about itself

| | value |
| --- | --- |
| visible label | `Undo` |
| accessible name | `Undo⌥⇧⌫` — the button carries **no `aria-label`** |
| `title` | `Undo the last rewind` |
| width | 87.20px, in a chip 260.80px wide |

So the truth is written in exactly one place, the tooltip, which is the place a pointer user reaches
last and a keyboard user never.

### 7.3 The three answers, priced

| answer | what it costs |
| --- | --- |
| **label it for what it does** | The chip grows. Measured by relabelling the shipping button: `Undo rewind` → **299.07px**, `Undo last rewind` → **321.04px**, `Undo the last rewind` → **341.15px**, against 260.80 today. The right margin holds 200.09px at a 900px pane and 100.09px at 700px, so a chip that says what it does **cannot sit beside the column at any pane width**, and at 380px, where the view is 379px wide, a 341.15px chip covers the text it is meant to point at. |
| **draw it only on the change the journal's top entry belongs to** | Impossible, and Phase 236 already wrote down why: a rewind writes the baseline's bytes back, so the change disappears from the recomposed picture. Confirmed here — the fixture went from ten changes to nine when change 0 was rewound, and the entry the journal holds names a place that no longer has a wrapper. |
| **move it off the chip** | Nothing new is drawn: the sentence `Undo the last rewind with ⌥⇧⌫. It lasts for this session.` is **already on the face**, in the note row, and appears exactly when there is a rewind to undo. Making that row's words a control gives the button a label that is already true, and it keeps the chip at **171.60px**, which is the only width that fits the right margin at the pane the operator works in. |

**The recommendation is the third**, and it is also the one that makes the chip mean one thing: the
chip is the CHANGE's toolbar, and undo of a rewind is the TAB's.

---

## 8. What was NOT verified, so a builder does not pretend otherwise

1. **No screenshot was taken.** `npm run shot` is forbidden to this run, and whether a shape *reads*
   as anchored is not settled by any number in this document. The build phase's own run keeps
   pictures at the four widths, which its charter already asks for.
2. **Two changes ending on the same line box** never occurred in this fixture at any width, so §3.2
   measures room and not collision. Research 83 D.3's five-on-one-line is the standing number.
3. **The note row's own wrapping** was not measured. A longer sentence than today's 61 characters
   may take a second line at 380px, where the column is 321px wide. The build phase should read the
   note's box before choosing its words.
4. **The mtime heuristic in §6.5 was not driven**, only reasoned about, and it is named as a
   heuristic for that reason.
5. **Why the inline boxes merge under focus** is not explained here, only measured. The DOM, the
   generation and every line edge were identical on both sides; the cause inside Chromium's inline
   layout was not chased, because the two rules in §1.2 do not depend on it.
6. **The swallowed first chord** was reproduced twice and its cause is not proved. The candidate
   read from the tree is that `moveFocus` focuses a wrapper inside a `contenteditable` host and the
   host takes it, possibly with the caret restore in `src/renderer/editor/redline-edits.ts`
   competing for it; a builder should confirm before fixing.
7. **Nothing here was measured on a remote machine, and no machine was touched.**

---

## 9. What a builder should carry out of this document

1. Build **shape 1 and shape 4**. Hold the current change as an identity — offset, deleted text,
   inserted text, generation — rather than as `document.activeElement`, so it survives the recompose
   an agent's write causes; mark it in the document with any of the four free decorations; keep the
   chip an out-of-flow overlay on `getClientRects()[0]`. The number to prove is **0.00px on both
   rulers at all four widths**.
2. **Fix the swallowed first ⌥↓.** It is the first press a person makes after reading the hint line.
3. **Refuse shape 2 as an anchor** with §3.2's table, and treat the ending line as an optional
   preference at most.
4. **Drop shape 3** with §4.2's numbers, and place a block change's chip at its own first rect like
   every other change.
5. **Take Undo off the change chip** and put the verb where the sentence about it already is.
6. **Give the empty face a sentence and a time**, one field on `BaselineState`, one sentence per
   shape, and say the same sentence for B and C because the fact that separates them does not exist.
7. **Take both rulers in the same focus state**, and never trust the change-rect ruler alone since
   Phase 237.
