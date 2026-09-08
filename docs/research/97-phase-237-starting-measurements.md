# Research 97 — typing in the redline, and the number that chose

Phase 237's measure step, 2026-09-08, at `710b47a6`. It builds no shipping code. It drives both of
research 83 D.4's options with real key events and writes the reading that decides between them.

## The decision, and the number that made it

**OPTION B IS BUILT: the redline document is `contenteditable`, and the view redraws itself under a
live caret.** Research 83 D.7 left exactly one thing unpriced, being a redraw of the document from a
re-composed run list while a caret and a selection are in it, and the charter's rule was that if the
redraw can restore both exactly, B is built.

**It restores both exactly, in 8 readings out of 8, with an offset error of 0 characters.** Four
outside-write shapes, each driven twice, once with a collapsed caret mid-word and once with a
selection that spans two deletion islands: `before the caret`, `after the caret`, `the very run the
caret is in`, and `that run removed entirely`. Every reading came back with an anchor error of 0 and
a focus error of 0 against a mapping re-derived independently by a character-level diff, with the
baseline projection and the current-side projection both exact after the redraw, the focus kept, and
the drawn selection text byte for byte what it was. **With nothing restored, the same rebuild leaves
the caret 227 to 474 characters away from where it belongs**, anchored on the document element
itself rather than in any text, which is what "nothing existing refreshes it under a selection"
actually costs.

Option A stays where research 83 left it. Its blocker re-derived at **26.7 percent exactly** (4 of 15
deleted runs over the same ten real pairs), and the per-line split that would fix it **draws the
deleted paragraph's line breaks nowhere**: the three pieces render as
`stands still.Yellow lorry moves fast.Green lorry ` on one line, which is a removed paragraph that no
longer reads as one.

---

## 1. How this was driven, and the trap that was not fallen into

One Electron per drive, through `build/electron-run.mjs` on a scratch profile under the system
temporary directory, removed in a `finally`. No tmux server was started by either drive, no agent was
spawned, no token was spent, nothing under the person's home was written and nothing outside
`/private/tmp/wt-p237/.p237/` was touched.

**Every key event went through CDP `Input.dispatchKeyEvent` or `Input.imeSetComposition`. There is no
`execCommand` anywhere in this step**, because research 83 records that scripted `execCommand` fires
no `beforeinput` in Chromium and that a pass which used it concluded the interception was impossible
before a later pass dispatched real keys and found it fires and is cancellable.

The harness is committed beside this document:

- `.p237/prepare.mts` — the node half. Runs the SHIPPING composer (`src/renderer/editor/redline-document.ts`)
  and the SHIPPING grouping (`src/renderer/editor/rewind.ts`'s `changesOf`) and writes the fixtures.
- `.p237/shipping-entry.ts` + `.p237/shipping.js` — the shipping composer, `changesOf` and
  `rebuildCopyText` bundled for the page, so the harness never re-implements what it is measuring.
- `.p237/page.html` — mounts the Phase 227 markup exactly, being one `span.ed-redline-change` per
  change carrying its identity, `del[data-redline-del]`, `ins[data-redline-ins]` and plain spans at
  the leaves, and links `src/renderer/styles/tokens.css` and `src/renderer/editor/redline.css`.
- `.p237/main-b.cjs` / `.p237/drive-b.mjs` — option B. Output at `.p237/out-b.json`.
- `.p237/main-a.cjs` / `.p237/drive-a.mjs` — option A, with a real Monaco 0.56.0 from
  `node_modules/monaco-editor/min/vs`. Output at `.p237/out-a.json`.

The fixture is research 83's own, `.p222/fixture.json`, being 719 baseline characters and 783 current
characters over four paragraphs of real prose, which the shipping composer draws as **21 runs, 8
changes, 5 deletions and 7 insertions**.

---

## 2. Option B: the redraw under a live caret, which is the whole decision

### 2.1 The coordinate, stated before the numbers

A caret in this view can only ever be in a `same` run or an `ins` run, because every `del` carries
`contenteditable="false"` and is an atomic island. So a caret is **an offset into the CURRENT side**,
being the concatenation of every run that is not a deletion, which is the file the person is typing
in. A selection is two such offsets. That is the coordinate every number below is in.

A redraw therefore has three steps: read the two offsets off the DOM, rebuild the document from the
re-composed run list, and put the offsets back through a transform of the old current side onto the
new one. The transform the harness used is the common prefix and the common suffix: an offset in text
both sides keep moves with that text, and **an offset inside what the write replaced lands where the
replacement begins**. The expected answers were re-derived independently by `diffChars` over the two
current sides, which is a different method from the harness's own arithmetic, and the two agreed at
every one of the 24 offsets asked.

### 2.2 The eight readings

Caret at current offset 464, mid-word inside `indentation`, in a long unchanged run in the third
paragraph. Selection from 227 to 279, spanning **two deletion islands** (`quick`→`fast` and
`does not ask`→`never asks`) and the text between them.

| shape | what the outside write did | kind | restored | expected | error | naive error | baseline exact | current exact | ms |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| before the caret | the heading, ~450 characters above | caret | 472 | 472 | **0** | 472 | yes | yes | 1.1 |
| before the caret | " | selection | 235→287 | 235→287 | **0** | 235 | yes | yes | 0.4 |
| after the caret | the last sentence of the file | caret | 464 | 464 | **0** | 464 | yes | yes | 0.3 |
| after the caret | " | selection | 227→279 | 227→279 | **0** | 227 | yes | yes | 0.3 |
| the very run the caret is in | four words replaced inside the same unchanged run | caret | 474 | 474 | **0** | 474 | yes | yes | 0.2 |
| the very run the caret is in | " | selection | 227→279 | 227→279 | **0** | 227 | yes | yes | 0.3 |
| that run removed entirely | the whole paragraph the caret was in, deleted | caret | 377 | 377 | **0** | 377 | yes | yes | 0.2 |
| that run removed entirely | " | selection | 227→279 | 227→279 | **0** | 227 | yes | yes | 0.2 |

Read alongside the numbers:

- **The caret is in the same word a person left it in.** The restored context reads
  `"ps its inden|tation, beca"` in the first three caret shapes, which is the same character position
  inside `indentation` in all three even though the run around it was rebuilt from a different run
  list each time. In the fourth the word is gone and the caret sits at `"oticed it.\n\n|Copying from"`,
  being the point where the deleted paragraph was, which is the transform's stated rule rather than a
  surprise.
- **A selection that spans deletions comes back whole.** `delsInSelection` read 2 on every selection
  arm, and the drawn selection text, `". It is quickfast, it is quiet, and it does not asknever asks to be w"`,
  was identical before and after in all four.
- **The caret's pixel box is unmoved where its text did not move.** `after the caret` restored to
  x 684.30, y 194.56 against x 684.30, y 194.56 before, byte for byte in both coordinates.
- **The redraw costs 0.2 to 1.1 ms** on this document, and the projections were exact after every one.

### 2.3 What the rebuild alone does, which is the reason any of this is needed

After `innerHTML` is replaced and before anything restores the selection, the reading in every arm is
`rangeCount: 1`, `anchorNode: DIV`, `anchorOffset: 0`, being **the document element itself at offset
zero rather than a position in any text**. That is 227 to 474 characters of error depending on where
the person was, and it is not a misplacement so much as a caret that no longer names a place in the
document. This is exactly what research 83 D.4 predicted for option B and could not price.

### 2.4 The arrow walk over a deletion, re-derived on the shipping markup

Research 83 D.2 measured 4 presses to cross a 4-character deletion, and 1 after
`contenteditable="false"`. Driven again here on the **Phase 227 markup with its change wrappers**, and
with real CDP arrow keys: one press moves the caret from drawn offset 75 to 79, being the whole of the
deletion `gone`, while the current-side offset does not move at all (75 → 75). The walk reads
`current: 75, 75, 76, 77` and `drawn: 75, 79, 80, 81`.

---

## 3. Option B: typing, which the same redraw turns out to be the mechanism for

Two policies were driven with the same real keystrokes (`K`, `i`, `t`, then Enter) at the same caret.

**Policy 1, research 83 D.2's own: cancel `beforeinput` and insert the view's own `<ins>`.** On this
markup it leaves the typed text OUTSIDE the composer's own model: 3 separate `<ins>` elements holding
`K`, `i` and `t`, **none of them inside any `.ed-redline-change` wrapper**, the caret ending one
character short of where it belongs, and Enter doing nothing at all (`currentDeltaChars` -1). The
baseline stayed exact, so nothing was corrupted, but the drawn document and the run list it was drawn
from no longer agree, and the next recompose from any watcher tick discards what was typed.

**Policy 2, cancel `beforeinput` and RECOMPOSE: fold the character into the current side, run the
shipping composer against the same baseline, redraw, restore the caret one character on.** Every
reading is exact:

| reading | policy 1 (own `<ins>`) | policy 2 (recompose) |
| --- | --- | --- |
| current side equals the file with `Kit\n` typed in | no, off by 1 | **yes** |
| baseline projection exact | yes | **yes**, delta 0 |
| the typed text is an insertion | 3 loose ones | **yes**, one `<ins>` |
| the typed text is inside a change wrapper | **no** | **yes** |
| caret | 467, expected 468 | **468, expected 468** |
| caret context | `"s its indenKit\|tation, be"` | `" its indenKit\n\|tation, be"` |
| `<div>` elements | 0 | 0 |
| `<br>` elements | 0 | 0 |
| cost per keystroke | n/a | compose 0.3–0.6 ms, redraw 0.4–0.5 ms |

So **the redraw is not only the answer to the outside-write question, it is the typing mechanism**: a
keystroke is an outside write the person made, and one path serves both. That is the shape Phase 237
should build.

**Enter is bytes, and it reports a different `inputType` than research 83 recorded.** Under
`contenteditable="plaintext-only"` a real Enter fires `beforeinput` with `inputType:
insertLineBreak`, cancelable, where D.2 measured `insertParagraph` under `contenteditable="true"`. A
phase that handles only `insertParagraph` will silently refuse Enter, which is what happened on this
harness's first run. Handled, it inserts one `\n` into the current side and nothing else: 0 divs, 0
brs, both projections exact.

### 3.1 IME, and the one thing that cannot be cancelled

`beforeinput` for a composition commit is `insertCompositionText` and **it is NOT cancelable**, read
three times out of three off the event itself. So the interception policy that closes every other
default behaviour cannot close this one, and a composition will always write into the DOM by itself.
Two arms were driven with a real three-step Japanese composition through `Input.imeSetComposition`,
with an outside write landing while the composition was open.

| arm | the write | composition | caret error | Japanese in an `<ins>` | inside a change | current side | baseline |
| --- | --- | --- | --- | --- | --- | --- | --- |
| naive: redraw during the composition | applied at once | **broken and restarted** (a second `compositionstart`) | 0 | **no** | no | exact | **BROKEN, +2 characters** |
| deferred: hold the write until `compositionend` | applied at the end | **one composition, uninterrupted** | 0 | **yes** | **yes** | exact | **exact** |

The naive arm is D.2's "typing inside unchanged text counts on both sides" trap arriving by the one
door no `preventDefault` can close: the committed `日本` landed in a plain span, so it counted on the
baseline side as well as the current one and the baseline projection gained two characters it never
had. **The fix is a rule rather than more code: while a composition is open the view holds the write,
and at `compositionend` it folds the committed text and the held write into ONE current side and
composes once.** With it, the composition is not even interrupted. So D.7's fifth case is not a stated
limit; it is a stated rule, and it is measured.

### 3.2 The scale of the typing loop, because it recomposes on every keystroke

Documents built from this repository's own `DESIGN.md`, sliced, with eight scattered word edits
standing in for an agent's pass. Five real keystrokes each, through the recompose policy.

| document | runs drawn | first compose | per keystroke, mean | per keystroke, worst | caret error | current side | baseline |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5,000 characters | 19 | 1.0 ms | 1.68 ms | 1.8 ms | 0 | exact | exact |
| 20,000 characters | 19 | 1.8 ms | 4.52 ms | 4.6 ms | 0 | exact | exact |
| 50,000 characters | 19 | 1.2 ms | 7.26 ms | 7.5 ms | 0 | exact | exact |

Composing the same pairs under plain node cost 3.00, 3.27 and 3.64 ms. The worst keystroke on a
50,000-character document is **7.5 ms, inside one 60 Hz frame**, and the drawn DOM is 19 top-level
nodes whatever the size, because the document is a flat list of runs and a long unchanged stretch is
one span. There is no measurement here that says a cap is needed; there is also no measurement above
50,000 characters, and the 5 MB truncation cap the charter already refuses typing on is far above it.

---

## 4. Option A: the blocker re-derived, and what the split costs

### 4.1 The count, and it is 26.7 percent exactly

The shipping composer over the same ten real pairs research 83 D.4 used, `.p237/prepare.mts`:

| pair | deleted runs | with a line break | worst breaks in one run |
| --- | --- | --- | --- |
| realistic agent edit | 5 | 0 | 0 |
| pure deletion | 1 | 1 | 2 |
| pure insertion | 0 | 0 | 0 |
| last word of a line | 1 | 0 | 0 |
| three lines into one | 1 | 1 | 2 |
| paragraph rewritten | 3 | 0 | 0 |
| sentence removed mid paragraph | 1 | 0 | 0 |
| blank line removed | 1 | 1 | 1 |
| list reordered | 1 | 1 | 1 |
| heading changed | 1 | 0 | 0 |
| **total** | **15** | **4** | **2** |

**4 of 15, 26.7 percent, confirmed rather than corrected.**

### 4.2 The split, driven in a real Monaco

The run split was `"stands still.\nYellow lorry moves fast.\nGreen lorry "`, 51 characters and 2 line
breaks, injected at line 3 column 28 of the model.

- **Whole, as research 83 read it:** drawn, `getValue()` unchanged, and **2 `␊` control glyphs** in the
  rendered text: `Red yellow and green lorry stands still.␊Yellow lorry moves fast.␊Green lorry waits here.`
- **Split per line into 3 injected decorations at the same position:** drawn, in order, `getValue()`
  unchanged, **0 control glyphs** — and **the line breaks are drawn nowhere**:
  `Red yellow and green lorry stands still.Yellow lorry moves fast.Green lorry waits here.` The three
  removed lines run together into one, with no break, no indent and not even a space between them.
- **Why there is no better placement.** The API's own words are at
  `node_modules/monaco-editor/esm/vs/editor/editor.api.d.ts:1832`, "Sets the text to inject. Must be a
  single line." Injected text attaches to a position in the MODEL, and the
  model is the file, in which the deleted lines do not exist. Every piece of a deleted paragraph must
  therefore attach at the single point where the paragraph was, and they render inline one after
  another on that one rendered line. A view zone would draw a block instead, and no view zone was
  driven here.
- **Caret:** 1 press crosses the whole 51-character injection, columns 27→28→29→30→31, which is the
  same atomic behaviour the contenteditable island has.
- **Wrap at 420px:** 6 rendered lines before the injection and 7 after, 0 lines overflowing, no
  horizontal scrollbar, widest line 291.66px against a 420px content width. Wrapping is not a problem.
- **Selection:** Select All over the model gives the file only and holds none of the deleted words,
  which is right for a copy and means the struck-through text cannot be selected at all. A
  programmatic DOM range over the rendered line does read the deleted words, run together with the
  file's own text and with no marks; Monaco's own copy path does not. That is a narrow reading and not
  a claim about what a person's drag does.

**So the split trades a visible control glyph for a removed paragraph that no longer reads as a
paragraph**, and the phase would be choosing which of those two a person sees. That, next to option
B's eight zero-error restorations, is the whole decision.

The 0.44px caret accuracy that made A the front-runner was not re-derived; research 83 D.4 measured it
and nothing here disputes it.

---

## 5. The reload path both options owe (research 83 B.6), driven rather than read

**Confirmed in the installed `monaco-editor` 0.56.0 in this worktree.**
`node_modules/monaco-editor/esm/vs/editor/common/model/textModel.js:342-343` reads:

```
        // Destroy my edit history and settings
        this._commandManager.clear();
```

and it is reached from `setValue`, which is what
`src/renderer/editor/monaco-loader.ts:135-140`'s `resetWorkingModel` calls:

```
export function resetWorkingModel(key: string, contents: string): void {
  const model = getWorkingModel(key);
  if (model !== null && model.getValue() !== contents) {
    model.setValue(contents);
  }
}
```

What that costs, and what `pushEditOperations` costs instead, measured in a real Monaco with a real
typed character, a real outside write above the caret and a real ⌘Z, all through CDP:

| how the reload was applied | caret before | caret after | value matches the write | one ⌘Z gave something back | the person's typing survived that undo |
| --- | --- | --- | --- | --- | --- |
| `model.setValue` | 5:7 | **1:1** | yes | **no** | (nothing to undo) |
| `model.pushEditOperations` | 5:7 | **5:7** | yes | yes | **no** |
| `model.pushStackElement()` then `model.pushEditOperations` | 5:7 | **5:7** | yes | yes | **yes** |

So the fix is `pushEditOperations`, and it is **`pushStackElement()` first**: without closing the
person's own undo element, the agent's write merges into the edit the person made and one ⌘Z reverts
both. The edit itself is the common prefix and common suffix of the old and new contents turned into
one range replacement, which is four lines. `editor.api.d.ts:2352` calls `pushEditOperations` "the
preferred way… the edit operations will land on the undo stack" and `:2367` warns that `applyEdits`
"can have dire consequences on the undo stack", so `applyEdits` is not the door.

**Two line numbers research 83 quotes have moved in this tree** and a builder should read these
instead: `refreshRepo` is at `src/renderer/editor/tab-io.ts:709` and its `if (!tab.dirty)` guard is at
**`tab-io.ts:752`**, not 614 or 616.

---

## 6. The parent readings, being what must not change

Taken over the shipping markup with the view read only and no `contenteditable` at all, with the
shipping `rebuildCopyText` answering the copy:

| reading | at the parent |
| --- | --- |
| `isContentEditable` | **false** |
| top-level nodes in `.ed-redline-doc` | 17 |
| `.ed-redline-change` wrappers | 8 |
| `<del>` / `<ins>` | 5 / 7 |
| `<div>` / `<br>` | 0 / 0 |
| baseline projection off the live DOM | **exact** |
| current-side projection off the live DOM | **exact** |
| copy of the whole document | **equals the current file byte for byte** |
| copy of a selection spanning two deletions | `". It is fast, it is quiet, and it never asks to be w"`, equal to the current-side slice |
| resting markup | 2,799 characters, first change drawn as `<span class="ed-redline-change" tabindex="-1" role="group" data-change="0" data-change-off="75" data-change-del="gone" …>` |

`npm run conformance:redline` is green at `710b47a6`, sixteen rules, in about 3 s. **One caution for
the builder: its rule 5 is a TIMING rule** (the worst case the caps allow, against a 400 ms ceiling)
and it read 438 ms while a build was running beside it and 165 ms on a quiet machine. Do not run it
next to `npm run build`.

---

## 7. What the builder inherits from this step

1. **Build option B.** `contenteditable="plaintext-only"` on `.ed-redline-doc`,
   `contenteditable="false"` on every `<del>`.
2. **One path for typing and for outside writes**, being: fold into the current side, compose with the
   shipping composer against the SAME baseline, rebuild, restore the two offsets through the
   prefix/suffix transform. It is 0 characters of error over the four shapes and under 8 ms at 50,000
   characters.
3. **Cancel every `beforeinput`** and handle `insertText`, `insertLineBreak` AND `insertParagraph`;
   `insertCompositionText` is not cancelable and must not be relied on.
4. **Hold a redraw while a composition is open** and apply it at `compositionend`, folding the
   committed data and the held write into one current side. Without that, the baseline projection
   breaks by the length of the composed text.
5. **Change `resetWorkingModel` to `pushStackElement()` then `pushEditOperations`**, which is owed
   whichever option won and which is now measured rather than argued.
6. **The caret coordinate is the current side**, and it is the only coordinate that survives a
   recompose. Do not anchor a caret to a run index, to a change identity or to the drawn text.

## 8. What this step did NOT verify, so nobody pretends otherwise

- **None of this ran inside the real `EditorPanel` tree.** The harness mounts the shipping markup and
  the shipping stylesheets and calls the shipping composer, copy and grouping, but it does not mount
  `RedlineDocument.tsx`, and React's own reconciliation may keep DOM nodes a wholesale rebuild
  replaces. The app run owes that reading.
- **No real IME and no real system pasteboard.** The composition was CDP-synthesised, as research 83's
  was, and rich paste was not driven at all here; `plaintext-only` flattening is research 83's
  measurement and stands unretested.
- **No file was written and no save path was driven.** Everything here is in the view.
- **No document over 50,000 characters**, and no document with hundreds of changes rather than the 8
  and 25 runs these fixtures hold. A document whose every paragraph changed is the untested shape.
- **A view zone for a multi-line deletion under option A was not driven**, so the claim that the split
  is A's only in-flow answer is a reading of the injected-text API rather than a measurement of the
  alternative.
- **The `own <ins>` policy's caret landing at 467 was observed, not explained.** It is reported as it
  read; no mechanism is claimed.
