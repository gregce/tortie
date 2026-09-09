# 101 — The editor's right-click menu: which rows are real, and which reshapes earn one

**Phase 241, the measure step.** 2026-09-08. Everything here was RUN. The app run is
`build/probe-p241-actions.mjs`, the three pure helpers are under `build/p241/`, and each one's
output is banked beside it as `build/p241/out-*.txt` so a later round can diff rather than re-argue.

The phase exists because of [issue 17](https://github.com/gregce/tortie/issues/17) and the
operator's two rulings of the same day, the second of them beside a photograph of Cursor's editor
menu: *"we should probably have a right click menu in general, that allows you to use the
capabilities monaco already supports and the dynamic stuff like in issue 17 that is queued… **We
should just support what we already do if possible.**"*

This document answers five questions and nothing else. It builds nothing.

---

## The answers, in one place

| Question | The answer |
| --- | --- |
| Which Group B actions exist? | **All eleven work.** Six of them are INVISIBLE to `getSupportedActions()`, which is the method the entry named, so that method alone would have dropped six live rows |
| Which Group C rows are reachable with nothing built? | **History, Copy Path, Copy Relative Path and Save.** **Reveal in Explorer does not exist anywhere in the product and is dropped** |
| Which reshapes earn a row? | **Format the markdown table, Pretty-print JSON, Minify JSON.** Refused: YAML, sort, unique, trim, change case, reflow |
| What does the menu do over the redline? | **It does not appear.** Confirmed, structurally rather than by a condition |
| How big is the table corpus? | **1,759 GFM tables in 175 of 185 tracked markdown files** |

---

## 1. Group B — what the live editor really answers to

### 1.1 The finding, and it changes the entry's method

The entry says the round re-derives which Monaco actions exist *"by asking `editor.getSupportedActions()`
at runtime rather than by reading a docs page"*. **That method is not enough, and following it would
have deleted six rows that work.**

`getSupportedActions()` returns only what `registerEditorAction` registered. Monaco's Cut, Copy and
Paste are not editor actions at all: they are `MultiCommand`s registered straight into the command
registry (`node_modules/monaco-editor/esm/vs/editor/contrib/clipboard/browser/clipboard.js` lines
31, 66 and 103), and Undo, Redo and Select All are core editor commands. `CodeEditorWidget.trigger`
misses on `getAction`, then falls through to the editor-command registry and then to the command
service (`codeEditorWidget.js` 816-827), so all six run perfectly while the action list has never
heard of them.

So the honest question is not *is the id in the list*, it is **does pressing it do anything**, and
that is what the probe measures. It presses each row through the shipping call,
`editor.trigger('p241-menu', id, null)`, and reads the effect off the model, the selection, the
gutter or the widget.

### 1.2 The two readings, side by side

Read on a real JSON tab in the real editor, one Electron on a scratch profile.
`getSupportedActions()` answers **131 actions** on a JSON tab and **128** on a markdown tab.

| Row | id | in `getSupportedActions()` | what pressing it did |
| --- | --- | --- | --- |
| Cut | `editor.action.clipboardCutAction` | **no** | **WORKS** — reached `document.execCommand('copy')` twice, which is the edit-context branch that copies then runs `Handler.Cut` |
| Copy | `editor.action.clipboardCopyAction` | **no** | **WORKS** — reached `document.execCommand('copy')` |
| Paste | `editor.action.clipboardPasteAction` | **no** | **WORKS** — reached `navigator.clipboard.readText()`, never `execCommand` |
| Select All | `editor.action.selectAll` | **no** | **WORKS** — selected the whole model |
| Undo | `undo` | **no** | **WORKS** — the model went back to the seed |
| Redo | `redo` | **no** | **WORKS** — the model came forward again |
| Find | `actions.find` | yes | **WORKS** — the find widget became visible |
| Change All Occurrences | `editor.action.changeAll` | yes | **WORKS** — 1 cursor became 3 |
| Go to Line | `editor.action.gotoLine` | yes, labelled *Go to Line/Column…* | **WORKS** — the quick input widget opened |
| Fold | `editor.fold` | yes | **WORKS** — 0 collapsed chevrons and 8 drawn lines before, 1 and 6 after |
| Unfold | `editor.unfold` | yes | **WORKS** — 6 drawn lines after the fold, 8 after the unfold |

**No row is dropped.** All eleven ship.

### 1.3 The condition the builder must honour: PASTE NEEDS TEXT FOCUS

This is the finding a docs page could not have produced either, and it was found by the probe
failing first. On the run where Monaco's `hasTextFocus()` read **false**:

- Cut and Copy still ran, but through the **generic-dom** implementation, which is
  `getActiveDocument().execCommand(cmd)` — that is, against whatever the browser thinks is focused,
  not against the editor.
- **Paste did nothing at all.** Its `generic-dom` implementation is
  `clipboardService.triggerPaste(...)`, which is `undefined` in standalone Monaco, so it returns
  `false`, no implementation handles the command, and it resolves silently having changed nothing
  (`clipboard.js` 307-312).

With a real mouse click into a line first, `hasTextFocus()` read **true** and all three took the
`code-editor` branch and worked.

`Menu.popup` takes focus away from the web contents. **So the menu must put text focus back on the
editor before it triggers a row**, and the app run must assert that a Paste pressed from the menu
actually pastes, because a Paste that silently does nothing is exactly the defect this phase is
supposed to make impossible.

### 1.4 One free reading the phase should know about

`editor.action.formatDocument`, `editor.action.formatSelection` and `editor.action.quickOutline`
exist on the **JSON tab and not on the markdown tab** — they are the three the bundled JSON language
worker contributes. So Monaco already carries a JSON formatter, compiled in, no language server.
That does not replace the JSON reshape below (it cannot reach a JSON fragment inside a markdown
fence, and it formats the whole document, which the entry refuses by name), but a later round should
know it is there before it writes a second one.

Also present and free: `sortLinesAscending`, `sortLinesDescending`, `removeDuplicateLines`,
`trimTrailingWhitespace`, and seven `transformTo*` case actions. **They cost nothing to add and they
are refused in §3 anyway**, and the fact that they are free is exactly why the refusal has to be
written down.

### 1.5 A markdown file opens in Preview

Measured: opening `notes.md` gives a mode control reading
`["Redline","Preview","Source","Split"]` with **Preview** checked and no `.ed-mount` on the page. So
there is no Monaco, and therefore no editor menu, on a markdown tab until the person picks Source or
Split. **The table reshape lives in Source mode**, and the menu's whole existence on a `.md` file is
conditional on that. Worth one sentence in the phase brief.

---

## 2. Group C — what an editor tab can already call

Every row here was traced to a call site that exists today. The rule from the entry is that a row
needing anything built is dropped.

| Row | Reachable? | The verb, and where it already lives |
| --- | --- | --- |
| **History** | **YES** | `use-tree-menu.ts:232-236` is `openRel(path, true)` then `useApp.getState().showSidebarView('scm')` then `useGitDepth.getState().revealFileHistory()`. From an editor tab the file is already open, so the row is the last two lines and nothing else. Both are global zustand stores reachable from anywhere; `menu-actions.ts:291` already calls the same thing from the native menu |
| **Copy Path** | **YES** | `pathsForClipboard` is **exported** from `tree-menu.ts:345` and takes `(rootPath, canonicals, relative, machineLabel)`. The tab carries `repoPath`, `relPath` and `remote.machineLabel` (`tab-types.ts:41-51,174`, `open-file.ts:67-76`), which is every argument. The clipboard write and the toast are `navigator.clipboard.writeText` and `useApp.getState().toast`, and `copiedMessage` is exported beside it |
| **Copy Relative Path** | **YES** | The same call with `relative = true`. `result-menu.ts:111-113` already composes the pair from a second surface, so this would be the third caller of one helper rather than a new one |
| **Save** | **YES** | `menu-actions.ts:178-182`, the File menu's `save-file`, is `useEditor.getState().save()` guarded by `panelOpen` and an active tab. One store call |
| **Reveal in Explorer** | **NO — DROP THE ROW** | There is no such verb. `grep -ri "reveal.*explorer\|revealInTree\|selectInTree"` over `src/` returns **nothing**. What exists is **Reveal in Finder** (`tree-menu.ts:283-289`), which hands the file to Finder and is a different thing. The nearest in-tree verb is `ctx.model.focusPath(canonical)` (`tree-ops.ts:372,515,715`), and that `model` is the Pierre tree model held by the TreeView component instance, not a store — reaching it from the editor is new wiring. **Per the entry's own rule the row is dropped rather than built.** Whether to draw *Reveal in Finder* instead is a judgement for the phase brief; it is one existing call and the tab has the absolute path |

---

## 3. The reshapes, priced against the Zen's test

The test is *does this serve the agentic-coding workflow, or does it exist because IDEs have it?*

### 3.1 RECOMMENDED — Format the markdown table under the cursor

His ask. Built regardless. **The corpus and the price are in §4.**

### 3.2 RECOMMENDED — Pretty-print JSON, with a guard

Passes on his own words and on the workflow: an agent writes a wall of one-line JSON constantly.
`JSON.parse` and `JSON.stringify(x, null, 2)`, no dependency.

**But it is not a whitespace change, and here is what it does to bytes.** Measured through
`build/p241/json-reshape.mjs`:

| Shape | Without a guard, the reshape would write |
| --- | --- |
| `{"10":"a","2":"b","k":"c"}` | `{ "2": "b", "10": "a", "k": "c" }` — **integer-like keys reorder** |
| `{"a":1,"a":2}` | `{ "a": 2 }` — a duplicate key is **silently dropped** |
| `{"id":12345678901234567890}` | `{ "id": 12345678901234567000 }` — **an id is rewritten** |
| `{"x":0.1234567890123456789}` | `{ "x": 0.12345678901234568 }` |
| `{"x":-0}` | `{ "x": 0 }` |
| `{"x":1e400}` | `{ "x": null }` — **a value becomes null** |

**THE GUARD IS THE OTHER ROW.** Strip the insignificant whitespace from the source and from the
output with one string-aware lexer and require the two to be identical; if they differ, refuse and
say what would have changed. That lexer **is** the Minify JSON row, so the second row pays for the
first row's honesty. String tokens are compared by VALUE and not by bytes, so `é` and `é` pass —
that is a re-encoding of the same string and refusing it would refuse the commonest shape an agent
writes — while number literals are compared as TEXT, which is what catches all six rows above.

**So the row is not byte-preserving and the claim must not be written as if it were.** The price of
comparing a string by value is that the escape form is not kept: `{"s":"\u00e9"}` formats to
`{"s": "é"}`, the same string and different bytes. Whitespace and string escape form are the two
things this row rewrites; everything else is refused.

With the guard in front, the four ordinary shapes format and every one of the six losses becomes a
refusal naming the offset. That is the recommendation: **build the guard, or do not build the row.**

**Do NOT promote `json5`.** It is present (2.2.3, MIT) as a transitive dependency and the entry
offers it for a tolerant read, but a tolerant read here is a lossy rewrite wearing a tidy's clothes.
Measured: `{ // the port \n port: 8080, host: 'localhost', mask: 0xff, list: [1, 2, 3,], }` comes back
as `{"port": 8080, "host": "localhost", "mask": 255, "list": [1,2,3]}` — the comment is gone, `0xff`
became `255`, the quoting changed and the trailing comma went. A file that is not JSON gets a
refusal naming the position instead, which is one fewer promotion and one fewer silent loss.

### 3.3 RECOMMENDED — Minify JSON

Not merely "free once pretty-print exists": it is the guard above, so it is written either way.
Its own use is real and agentic — a pretty JSON body has to become one line to go on a `curl`
command or into a shell argument. Four lines of caller.

### 3.4 REFUSED — Pretty-print YAML

`js-yaml` 4.3.1 is already a direct dependency, so it is free to reach, and it should still be
refused. Measured on a ten-line GitHub Actions workflow:

- **3 comments in, 0 comments out.** js-yaml has no comment support at all; `dump` cannot emit one.
- `on:` came back as `'on':`, because YAML 1.1 reads a bare `on` as a boolean.
- `branches: [main]` came back as a block sequence over two lines.

An agent's YAML is a workflow, a compose file or a config, and all three are comment-heavy. A row
that deletes every comment in the file and requotes a key is not a tidy, it is a rewrite, and it
cannot be undone by reading the result. **Refused.**

### 3.5 REFUSED — Sort lines, unique lines, trim trailing whitespace, change case

These are the guardrail's own example list of IDE furniture. They are also, as §1.4 records, already
compiled into the bundle and would cost a line each — which is the reason to write the refusal down
rather than leave it to taste. None of them serves the agentic workflow specifically: an agent does
not produce unsorted lines that a person then sorts, and trailing whitespace is a linter's job and
not a menu's. **Refused, and named in the phase's "What is NOT in this phase" so a later round does
not add ten free rows because they were free.**

### 3.6 REFUSED — Reflow a paragraph to the column width

No Monaco action exists for it, so unlike §3.5 it is new code rather than a free row. That is the
smaller reason. **The larger one is the redline.** A reflow rewrites every byte of the paragraph,
including bytes nobody meant to change. Since Phase 194 the redline draws a prose file as the whole
document with every change marked against a baseline; a reflow turns "the agent changed one clause"
into "one whole paragraph is different", and the person's own tidying becomes indistinguishable from
the agent's edits in the one view built to tell them apart. It also puts a many-hundred-byte change
into the Phase 227 journal as a single rewind unit. **Refused.**

---

## 4. The markdown table corpus, and what the reshape gets wrong

### 4.1 The census

`build/p241/table-census.mjs`, over the markdown tracked in this repository, parsed with the same
`mdast-util-from-markdown` + `mdast-util-gfm-table` the markdown preview already ships:

- **185 markdown files tracked, 175 of them hold at least one GFM table.**
- **1,759 GFM tables.**
- Widest: 12 columns, `docs/research/05-terminal-components.md:132`. Tallest: 69 rows,
  `docs/research/84-transfer-and-delegation.md:1715`.

| Trait | Tables | First witness |
| --- | --- | --- |
| pipe inside a code span | **732** | `BUILD-STATUS.md:115` |
| escaped pipe in a cell | 53 | `DESIGN.md:297` |
| CJK-width cell | 5 | `DESIGN.md:297` |
| combining mark | 40 | `docs/designs/design-a-electron.md:83` |
| right-to-left run | **0** | — |
| emoji / astral | 311 | `DESIGN.md:297` |
| empty cell | 130 | `docs/BACKLOG.md:14` |
| ragged row | 10 | `docs/BACKLOG.md:2363` |
| inline markup in a cell | 1,543 | `BUILD-STATUS.md:115` |
| a cell over 80 characters | 1,096 | `BUILD-STATUS.md:115` |
| no alignment markers | 1,631 | `BUILD-STATUS.md:115` |
| some column aligned | 128 | `docs/BACKLOG.md:14` |
| indented (all inside a list item) | 3 | `docs/BACKLOG.md:8690` |
| inside a blockquote | 0 | — |

### 4.2 The round-trip property, run over all 1,759

`build/p241/table-roundtrip.mjs` runs the reshape the phase would build — parse, take each cell as
its **raw source slice** so inline markup, escaped pipes and code spans survive byte for byte,
re-serialise with `markdown-table` keeping the alignment — and asks three things of every table:
`format(format(t)) === format(t)`, the cells are the same, the alignments are the same.

**1,759 tested. 11 findings, and they are two bugs and nothing else.**

> **THE FIX ROUND RE-RAN THIS OVER THE SHIPPING MODULE AND THE COUNT MOVED TO 1,770.** The measure
> step's own copy read 1,759 and the shipping scan read 1,760, and both were short for the same
> reason: the block was taken to be the run of non-blank lines around the caret, so a table with a
> heading written directly above it was invisible. There are 10 such tables here — 9 under an ATX
> heading and 1 under a paragraph — and the same wrong block destroyed whatever was glued directly
> UNDER a table, measured at seven block-level structures out of eight, the eighth being a paragraph
> line, which GFM really does absorb as a row. `tableAt` asks the parser for the table's own bounds
> now. Re-run: **1,770 found, 1,761 formatted, 9 refused, 0 not idempotent, 0 whose cells moved, 0
> whose block held more than the table**, banked in `build/p241/out-shipping-table-corpus.txt`.

| Finding | Count | What it is |
| --- | --- | --- |
| the header GREW | 8 tables | A body row has **more** cells than the header. `markdown-table` pads every row to the longest, so the header gains columns and the table means something new |
| the slice did not reparse | 1 table | An **indented** table inside a list item. Slicing from the first `|` keeps the four-space indent on every line after the first, so the slice is no longer a table |
| the alignment array grew | 8 tables | The same 8 as the first row, restated |

**A cell's raw slice needs both pipes stripped.** In `mdast-util-gfm-table` a `tableCell`'s position
starts at the LEADING pipe and the last cell of a row ends at the trailing one. Getting that wrong
produced 1,758 findings on the first run, which is how the number was found. The trailing pipe is
stripped only when it is the row terminator and not an escaped `\|` inside the cell.

### 4.3 Why a header that grows is a real defect and not a nit

The cause is almost always an **unescaped `|` inside a code span**, which GFM splits on. The witness
is `docs/research/18-agent-activity.md:463`, whose `pi` row contains
`` `ctx.on('turn_start'|'turn_end'|'agent_settled')` `` — a 3-column table with a 5-cell row. 732 of
this repository's tables have a pipe inside a code span, so the shape is everywhere; 8 of them
actually go over the header width.

**The rule the builder should take:**

1. **Pad a SHORT row to the header width.** Safe — GFM already renders the missing cells as empty.
2. **NEVER grow the header.** When any row has more cells than the header, **refuse** and say which
   row, because the cause is a bug in the person's table and reflowing it hides the bug instead of
   showing it. 8 of 1,759 tables here, 0.45%.
3. **Preserve the block's own indent.** Slice the table by whole LINES, strip the common leading
   whitespace, format, put it back. Three tables in this repository need it and all three are inside
   list items.

### 4.4 The hostile set

Thirteen shapes, run through the same reshape. **Ten round-trip exactly**, including every one this
phase was told to worry about.

| Shape | Result |
| --- | --- |
| plain | kept |
| every alignment (`:--`, `:-:`, `--:`) | kept |
| escaped pipe `\|` | kept |
| CJK-width cell | kept |
| combining marks | kept |
| right-to-left run | kept |
| emoji with a zero-width joiner | kept |
| empty cells | kept |
| indented inside a list item | cells kept, **but the indent is lost** — §4.3 rule 3 |
| not a table at all | correctly refused |
| **pipe inside a code span** | **2/3 columns became 3/3** — §4.3 rule 2 |
| **a row shorter than the header** | 3/1 became 3/3 — safe, §4.3 rule 1 |
| **a row longer than the header** | **2/3 became 3/3** — §4.3 rule 2 |

CJK width is worth one note: the cells round-trip byte for byte, but `markdown-table` pads by string
LENGTH, so a `日本語` cell is padded as three characters and the table does not look square in a
monospaced editor. That is a cosmetic limit of the library, it affects 5 tables here, and it is a
stated limit rather than a defect to fix.

### 4.5 The dependencies, all already installed

| Package | Version | Licence | How it is here today |
| --- | --- | --- | --- |
| `markdown-table` | 3.0.4 | MIT | transitive, via `mdast-util-gfm-table` → `remark-gfm` |
| `mdast-util-from-markdown` | 2.0.3 | MIT | transitive, the preview's parser |
| `mdast-util-gfm-table` | 2.0.0 | MIT | transitive, via `remark-gfm` |
| `micromark-extension-gfm-table` | 2.1.1 | MIT | transitive, the tokenizer half |
| `js-yaml` | 4.3.1 | MIT | already a DIRECT dependency — and refused in §3.4 |
| `json5` | 2.2.3 | MIT | transitive — and refused in §3.2 |

`markdown-table` is promoted to a direct dependency by adding one line to `package.json`; the
lockfile already carries the exact resolution and integrity and does not move. **The measure step
did not make that change** — the builder does, in the commit that uses it.

---

## 5. The redline: the menu does NOT appear there

**Confirmed, and the reason is stronger than the entry's.** Four reasons, any one of them enough.

1. **There is nothing to reshape.** Group A applies its answer to a Monaco model through
   `pushEditOperations`. The redline has no Monaco model — since Phase 194 it is a DOM document
   composed from the baseline and the file, and since Phase 237 a `contenteditable` whose `<del>`
   runs are `contenteditable="false"` atoms (`RedlineRow.tsx:66-73`).
2. **Group B cannot be reached.** Every one of the eleven rows is `editor.trigger(...)` on an
   `IStandaloneCodeEditor`. There is not one on the page in redline mode.
3. **A second write door would turn a gate red.** `src/renderer/editor/redline-write.ts` is the
   redline's ONE write call site and `npm run conformance:redline` rule 9 asserts exactly that,
   reading the guard and the re-read out of the function's own braces. A reshape writing into the
   redline would be a second door and the gate would refuse it — correctly.
4. **The one-⌘Z promise cannot be kept.** Group A's rule is that a reshape undoes in one press. The
   redline has no Monaco undo stack; it has the Phase 227 journal, and **a rewind is not an undo** —
   it is the entry's own phrase and it is the whole reason the journal exists.

**How to make the refusal structural rather than a condition.** Put the `onContextMenu` handler on
`MonacoHost`'s own container, `.ed-mount` (`MonacoHost.tsx:462`), and not on `EditorPanel`. In
redline mode that element does not exist, so the menu cannot be raised there and no future round can
forget the check. `contextmenu: false` at `MonacoHost.tsx:105` does not move, per DESIGN §3.

The four Group C rows — History, Copy Path, Copy Relative Path, Save — would all work over a redline
tab, since they are tab verbs rather than editor verbs. Drawing them alone would be a **different**
menu, and this phase should not draw it. If the operator later wants one, that is its own entry.

---

## 6. One thing found on the way, and it is a gate hole

`build/assert-electron-teardown.mjs`'s `buildFiles()` is a **flat** `readdirSync(buildDir)`. A script
in a phase subdirectory beside it — `build/p214/`, `build/p218/`, `build/p241/` — is read by neither
rule 1 nor rule 2, so one of those that started an Electron would be exactly the 2026-08-22 shape
with nothing watching it. This measure step's own app run was written under `build/p241/` first and
the gate could not see it.

Today no subdirectory script starts an Electron. The answer taken here was to move the one that does
up to `build/` and raise `HELPER_USER_FLOOR` from 95 to 96 in the same commit, rather than to widen
the walk, because widening it would sweep in the fixture trees the rules were never written for. The
comment in that file now says so, and **a round that puts an Electron in a subdirectory has to make
the walk recursive first.**

---

## 7. How to re-run every number here

| Command | What it takes | What it answers |
| --- | --- | --- |
| `node build/probe-p241-actions.mjs` | about 90 s after the build, ONE Electron on a scratch profile, a scratch HOME and its own `gmux-p241-*` socket, no agent, no token, no keychain, **no byte of the pasteboard** | §1 — both readings of the eleven rows |
| `node build/p241/table-census.mjs` | about 3 s, one `git ls-files`, writes nothing | §4.1 |
| `node build/p241/table-roundtrip.mjs [--hostile]` | about 5 s, writes nothing | §4.2, §4.4 |
| `node build/p241/json-reshape.mjs` | instant, spawns nothing | §3.2, §3.3 |

**The pasteboard was never touched.** Monaco's clipboard rows end at `document.execCommand`, at
`navigator.clipboard.writeText` on the Electron-bug fallback and at `navigator.clipboard.readText`
for a read. All three are replaced by recorders for the length of the clipboard arm and put back in
a `finally`, and capture-phase `cut`/`copy`/`paste` listeners cancel anything that gets past them.
What the rows reached is the record, not the system pasteboard, and the run's own counters read
`{"cut":0,"copy":4,"paste":0,"writeText":0,"readText":2}`. The operator's `-L gmux` sessions were
counted at **19 before and 19 after** on every run.
