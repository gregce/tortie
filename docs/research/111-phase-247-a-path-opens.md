# 111 — what the two lifted refusals cost, what may leave Tortie, and what refusal 8 is really buying

Phase 247, the MEASURE step, 2026-09-09, at `2bc14f02`, Tortie 0.101.0, tmux 3.6a,
`@xterm/xterm` 6.0.0, `@xterm/addon-web-links` 0.12.0, node 22.23.1.

**It builds nothing.** No product file was touched. One helper is kept because a later round would
really re-run it, `build/p247/offer-cost.mjs`, and it answers all four questions off ONE capture so
the four answers are about the same corpus rather than four captures minutes apart. No Electron was
launched. No agent was spawned, no token spent, no keychain opened, no machine touched, no ssh
started. **`shell.openPath` and `shell.openExternal` were never called, by anything, at any point.**
The operator's live sessions on `-L gmux` were LISTED and CAPTURED and nothing else — never attached,
never sent a key, never killed — and they were 21 before every run and 21 after. The manifest was
read from a COPY for the project roots, never opened in place. **The only filesystem calls anywhere
are `lstat`, `stat` and `realpath`, all metadata only: no path read out of a transcript was opened,
followed into, executed or written to.** Every number below is a count, a rate or a shape.

This document inherits research 107's eleven refusals except the two the Phase 247 entry lifts by
name, and it lifts nothing of its own.

---

## THE ANSWER IN SEVEN NUMBERS

| | |
| --- | --- |
| **What the root rule was removing**, re-derived | **326 of 1,581** offered spans, **20.6%** — research 107 read 282 of 1,293, **21.8%** |
| **What the widening is worth**, inside one capture | the clickable set goes from **128 spans over 33 distinct files** to **200 over 72** — **+56% of spans and +118% of files** |
| **The false-positive rate of the widened offer**, hand adjudicated exhaustively | **0 of 200 spans, 0 of 72 distinct paths.** research 107's own figure to set it beside is **4.2%**, and on this capture that same statistic reads **3.7%** — every one of them a wrap artefact refusal 8 already refuses |
| **What the hard refusal beneath the allowlist removes** | **110 of 310** spans carry an executable bit — **35.5%**, and **107 of them are outside every project root**, so the mode rule is doing the precision work the root rule used to do |
| **The kind allowlist the corpus supports** | **EMPTY.** Zero `.pdf`, zero `.docx`, zero `.zip`, zero `.csv`, zero `.mov`, zero `.command`, zero `.app` in 6,673 path-shaped tokens. Every one of the 200 spans that reaches a door is a kind Tortie draws itself |
| **What refusal 8 costs** | **78 of 388 file spans, 20.1%**, to prevent **7** clicks that would open the wrong thing |
| **Whether a rejoin can be written that never lies** | **No.** A blind glue produces a path that EXISTS 57 times and tmux confirms only 18 of them: **68.4% of the rejoins that look right because the file is really there are joins that never happened** |

**The seventh row is the answer to the third question and it is his to decide.** Refusal 8 is not
lifted here.

---

## 1. THE CORPUS, AND THE FOUR THINGS THIS MEASUREMENT DOES DIFFERENTLY

`tmux -L gmux list-sessions`, then per session `capture-pane -p -N -S -` and `capture-pane -p -J -S -`.
A session with no `@gmux-agent` option is not ours and is skipped, which is why 20 of the 21 are here.

| agent | panes | physical rows | path-shaped tokens |
| --- | --- | --- | --- |
| claude | 5 | 42,936 | 5,197 |
| codex | 11 | 8,353 | 1,343 |
| shell | 4 | 805 | 133 |
| **total** | **20** | **52,094** | **6,673** |

The detectors are research 107's own, imported from `build/p245/corpus-scan.mjs` rather than rewritten,
so the offer set is the same instrument. Four things are deliberately different, and each moves a
number:

1. **One capture answers everything.** research 107 has three captures and says so; every rate in it
   agrees to a few tenths of a percent across them, which is the stability reading it promised. This
   document holds to that: the corpus is LIVE, scrollback rolls between runs, and the counts below
   moved by a few units across five runs while no share moved by more than a point.
2. **Every question is asked of the REALPATH, leaf included** — refusal 10. So a symlink whose leaf is
   a regular file is counted as a **file** here, where research 107 counted symlinks as a third kind.
   That is why this capture reads 388 files and 68 symlinks where research 107 read 300 and 68.
3. **There is no `/dev/` refusal list.** research 107's `checkedLstat` refuses `/dev/`, `/proc`,
   `/Volumes/`, `/net/` and any `..` before it calls anything, and its section 7 warns that version one
   carries no such list. This one refuses only `/Volumes/` and `/net/`, because a stale automount can
   hang the process, and it counts the refusals — **0 in this capture**. `/dev/null` and its family are
   therefore inside these counts and are refused, as research 107 predicted, by not being a regular
   file.
4. **tmux's own `-J` capture is used as a WRAP ORACLE.** `capture-pane -J` joins the rows tmux believes
   were wrapped, so whether two rows really are one line is tmux's answer rather than a model of one.
   It is asked of the two ROWS rather than of the glued span, because the same path printed whole
   elsewhere in the pane answers a span-level substring test and means nothing. **The two captures do
   NOT align by index on a long pane** — 2 of the 5 claude panes align and every codex and shell pane
   does — so the oracle is a substring question and never a row walk.

**The shipped predicates are parsed out of the source, not restated.** `build/p245/root-cost.mjs`
restates `NEVER_PREVIEW` by hand and its restatement is already three extensions short of the shipped
`KEY_MATERIAL_EXTENSIONS`: it has no `.asc`, no `.gpg` and no `.ppk`. So this helper reads the sets out
of `src/shared/preview-types.ts` and `src/shared/image-types.ts` and its self test asserts the parsed
predicate refuses **every one of the 18 `examples` the shipped rules carry**, which is the check that
catches the next divergence too. `node build/p247/offer-cost.mjs --self-test` prints 27 readings and
every one behaved.

---

## 2. QUESTION 1 — THE WIDENED OFFER SET, AND ITS PRICE

### 2.1 The root rule, re-derived

| of the 1,581 spans the DETECTION rule offers | count | share |
| --- | --- | --- |
| inside an open local project root, by realpath | 1,255 | **79.4%** |
| outside every open project root — **what the widening admits** | 326 | **20.6%** |
| touching a row's right edge | 191 | 12.1% |
| — of which the next row continues with a path character | 59 | **3.7%** |
| starting at a row's head after a row that ends in a path character | 97 | 6.1% |

research 107 read **282 of 1,293, 21.8%** on its second capture and 272 of 1,290 on its third. **This
is the same rate**, and the small difference is the realpath rule of §1.2 pulling 68 symlinks into the
resolved set.

On the FILE half the two documents disagree and the reason is the same one. research 107 reports the
root rule removing **147 of 300 file spans**; here it removes **179 of 310**, because a symlink whose
leaf is a file is a file here. The share moved from 49% to 57.7% and no conclusion moves with it.

### 2.2 What version two really offers

Version two is research 107's version one with clause 3 widened and the Phase 247 entry's two new
rules under it: every question asked of the realpath, a directory is never a link, refusal 8 stands,
`looksLikeSecretPath` first, no executable bit, no bundle.

| | count | share |
| --- | --- | --- |
| spans version two keeps | **310** | 19.6% of the detection offer |
| — inside a root | 131 | 42.3% |
| — outside every root | 179 | 57.7% |
| carrying an EXECUTABLE BIT, refused | **110** | **35.5%** |
| matching the shipped `NEVER_PREVIEW` list | 0 | 0% |
| a symlink spelled inside a root whose leaf is outside every root | 0 | 0% |
| **spans that reach a door** | **200** | **12.6%** of the detection offer |
| distinct files behind those 200 | **72** | |

**The doors, and no row reaches LaunchServices.**

| door | in-root | out-of-root |
| --- | --- | --- |
| Tortie, an editor tab | 124 | 71 |
| Tortie, the image surface | 4 | 1 |
| the Mac, `shell.openPath` | **0** | **0** |
| refused for the executable bit | 3 | 107 |

**The widening is worth 56% more spans and 118% more files.** Inside this one capture, the offer with
the root rule ON is **128 spans over 33 distinct files**; with it OFF it is **200 over 72**. The
distinct-file number is the one that matters, because research 107 measured that the span count is
inflated by repetition — here 44 spans stand behind one script and 17 behind another.

**Composed with research 107's hand-marked detection recall of 37.5%, version two reaches about
4.7% of the real path references in a transcript, against about 3.0% for the same policy with the
root rule on.** That is a COMPOSITION of two measurements and not a measurement, exactly as research
107 section 7.6 says of its own 4.4%: it assumes the door-reaching share of the offer is the same on
the sampled real references as it is corpus-wide. Nobody has measured version two's recall directly
and this document did not either.

### 2.3 THE FALSE-POSITIVE RATE, WHICH IS THE PRICE HE ASKED FOR

**Every span that reaches a door was adjudicated by hand, exhaustively rather than by sample.** Two
readings twenty minutes apart: 203 spans in the first, and in the second the **72 distinct paths**
behind 200 spans, each with its left context and its resolved leaf. The classes are research 107's
own — a real reference, not a path, truncated, a path on another machine, ambiguous.

| | n = 200 spans / 72 distinct paths |
| --- | --- |
| a real reference — a file the text really names and a person could sensibly click | **200 / 72** |
| not a path | 0 |
| truncated | 0 |
| a path on another machine | 0 |
| ambiguous | 0 |
| | **false positive rate 0.0%** |

**Set that beside research 107's 4.2%, which is the number the entry asks for.** That figure is the
mechanical wrap rate over the spans the conservative policy offers BEFORE refusal 8 is applied; on
this capture the same statistic reads **59 of 1,581, 3.7%**. Version two refuses all of them, which is
what takes the adjudicated rate to zero.

**Zero of 200 is not zero.** The rule of three puts the 95% upper bound on the true rate at about
**1.5%** per span. And the classes above answer "is this a real file reference", not "would he click
it", which is research 107's own caveat and is not answerable by anyone but him.

**WHY IT IS ZERO, AND THE ANSWER IS NOT THE ROOT RULE.** Three things do the work, and the mode rule
is the biggest of them. The families the widening admits are, in order of size:

| family, outside every root | spans | what happens to it |
| --- | --- | --- |
| an executable — a shell binary, a Homebrew Cellar binary, a versioned agent binary under a dotfolder in the home | **107** | **refused by the executable bit** |
| a file under a scratch root (`/private/tmp`, `/tmp`, `/var`) an agent wrote minutes ago | 39 | an editor tab |
| a file under a dotfolder in the home — an agent's own config, a skill, a shell rc | 63 | an editor tab |
| a file in a repository that is not an open project | the rest | an editor tab |
| a path under a root this Mac does not have (`/root/`, `/home/`, `/workspace/`) | 0 in this capture | never offered, it is not there |

**Without the mode rule the widened offer would be 35.5% executables**, which is a false-positive rate
of the same size as the generous detector research 107 rejected. The root rule was hiding that family
by accident. The mode rule refuses it on purpose, and it refuses it inside a project too.

### 2.4 THE ONE THING THE WIDENING ADMITS THAT IS NOT A FALSE POSITIVE AND IS STILL A PROBLEM

**A credential file is a real reference.** Adjudication found **5 spans over 4 distinct files whose
name holds a credential and which the shipped `looksLikeSecretPath` does not refuse**:

| name | spans | distinct | where | admitted by |
| --- | --- | --- | --- | --- |
| `auth.json` | 2 | 1 | outside every root | **the widening** |
| `.npmrc` | 3 | 3 | inside a project root | **research 107's version one, already** |

research 107 section 8.1 states `auth.json` as a gap and says widening `NEVER_PREVIEW` is a change to
a shipped predicate that a later phase must argue on its own. **This measurement adds two facts to
that.** The gap is a FAMILY and not one name — `.npmrc` holds an auth token and is in the same corpus.
And **three of the five are inside a project root**, so this is not a cost of the widening at all: a
version one built exactly as research 107 recommends would already put `.npmrc` in an editor tab.

**It is the operator's call and this document does not make it.** What it can say is the shape: the
predicate is name-only by design, it is shared with `canPreviewPath`, and adding `auth.json`,
`credentials.json`, `.credentials.json` and `.npmrc` to `NEVER_PREVIEW` costs the corpus 5 spans of
201 and costs the preview surface nothing, because none of those names ends in `.html` and every one
of them is refused there today by the allowlist alone.

---

## 3. QUESTION 2 — THE KIND ALLOWLIST, DERIVED FROM THE CORPUS

### 3.1 What a transcript actually names

Over every path-shaped token, absolute and relative, whether or not it is there:

| extension | tokens | of the absolute ones, not there |
| --- | --- | --- |
| (none) | 4,446 | 935 |
| `.md` | 939 | 11 |
| `.js` | 260 | 7 |
| `.ts` | 177 | 0 |
| `.tsx` | 110 | 2 |
| `.mjs` | 107 | 9 |
| `.json` | 87 | 10 |
| `.go` | 76 | 1 |
| `.png` | 69 | 13 |
| `.txt` | 57 | 0 |
| `.log` | 44 | 0 |
| `.css` | 43 | 0 |
| `.yml` | 40 | 0 |
| `.mdx` | 32 | 0 |
| `.py` | 26 | 0 |
| `.sh` | 23 | 0 |

**And the kinds a handoff would exist for are simply absent.** Counted over the same corpus by a
scanner of its own: **`.pdf` 0. `.docx`, `.xlsx`, `.pptx` 0. `.zip`, `.tgz`, `.gz` 0. `.csv` 0.
`.mov`, `.mp4` 0. `.command` 0. `.app` 0.** The one dangerous extension family present at all is
`.sh`, 23 mentions, and not one of them reaches a door.

### 3.2 What reaches a door, which is the set the allowlist must be argued from

| extension | spans | can Tortie draw it? |
| --- | --- | --- |
| `.js` | 95 | yes, editor |
| `.md` | 52 | yes, editor, landing in `preview` |
| `.txt` | 9 | yes, editor |
| `.json` | 9 | yes, editor |
| `.toml` | 8 | yes, editor |
| (none) | 7 | yes, editor — a `LICENSE`, an `AGENTS.md`-shaped file with no suffix |
| `.log` | 6 | yes, editor |
| `.png` | 5 | yes, **the image surface** |
| `.yml`, `.html`, `.py` | 2 each | yes, editor |
| `.tsx`, `.mjs`, `.ts` | 1 each | yes, editor |
| **total** | **200** | **200** |

### 3.3 SO THE ALLOWLIST DERIVED FROM THE CORPUS IS EMPTY, AND THAT IS THE FINDING

**Not one of the 200 spans that reaches a door in a 52,094-row corpus needs macOS.** Every kind an
agent names and a person could click is a kind Tortie draws itself: prose and code in the editor, a
picture in `src/renderer/editor/image/`.

**`.pdf` is the case he asked for after `.png`, and Tortie cannot draw one today.** Read from the
tree: `.pdf` is not in `IMAGE_MEDIA_TYPES`, so `gmux-asset:` refuses to stream it and the image tab
never claims it; `PREVIEWABLE_EXTENSIONS` is `.html` and `.htm` and its comment names PDF explicitly —
*"Mermaid, PDF, CSV and Quarto are each deferred to their own phase and are NOT one word away from
being added here"* (`src/shared/preview-types.ts:50`); and there is no PDF component anywhere under
`src/renderer/`. A `.pdf` clicked today would open in the editor and answer with the binary-file
sentence `src/renderer/editor/tab-io.ts:127` already writes.

**So the recommendation is one extension and it is a judgement rather than a measurement, and the
document says which.** `EXTERNAL_ALLOW = { '.pdf' }`:

- it is the kind he named, and the only one;
- it is the one common document kind Tortie has *deliberately deferred* rather than never considered,
  so the door is a stand-in for a surface that is expected to exist one day and can be closed again in
  one line when it does;
- **it appears zero times in this corpus, so shipping it costs zero measured false positives and buys
  zero measured spans.** That is the honest statement of what he is getting: a door for a case that
  did not occur once in 52,094 rows, held open for the day it does.

**Anything else must be argued from its own evidence, and none of the obvious candidates has any.**
Office documents, archives, spreadsheets and video are each zero in this corpus. **A denylist is
refused outright, as the entry requires**: the set is spelled as the closed set above or the external
door does not ship.

---

## 4. QUESTION 3 — WHAT REFUSAL 8 IS BUYING, AND WHAT LIFTING IT WOULD COST

**This phase does not lift refusal 8. This section is the measurement and the decision is his.**

### 4.1 What it costs and what it prevents

Over the 461 spans that are the last token on their row:

| | count |
| --- | --- |
| spans that reach the pane's LAST COLUMN, which is the only shape a terminal wrap can take | 66 |
| — of which tmux says the two rows really are one line | **57 (86.4%)** |
| spans that stop short of the last column, so the row simply ended there | 395 |
| — of which tmux says the two rows are one line | 19 (4.8%) |
| what the span itself is — a file | 39 |
| — a directory | 151 |
| — not there at all | 271 |
| **file spans refusal 8 refuses, as it is spelled** | **78 of 388, 20.1%** |
| **clicks it actually prevents** — the span is really there AND the oracle says it is truncated | **7** |

**Refusal 8 as spelled costs twenty percent of the file spans to prevent seven wrong opens.** That is
a much worse trade than research 107's 4.2% suggests, and the reason is that refusal 8 refuses every
span that is the LAST THING ON ITS ROW, while only a span that reaches the pane's last COLUMN can
have been wrapped by the terminal. A path at the end of an ordinary sentence is refused for a reason
that cannot apply to it.

**Spelled tightly — refuse only a span that reaches the pane's last column, or one that starts a row
whose predecessor filled its own — it refuses 34 file spans instead of 78**, and it keeps 86.4% of its
protection, because 57 of the 66 spans at the last column really are truncated. **That is a cheaper
refusal 8 rather than a lifted one, and it is available without any rejoin at all.**

### 4.2 Can a rejoin rule be written that never lies about where a span ends?

**No, and the measurement is three deep.**

**One. The fact is missing from the buffer and nothing recovers it.** research 107 section 4 measured
this and nothing here contradicts it: xterm's `isWrapped` is `true` for a shell's or Claude Code's own
wrap, `false` when the PROGRAM breaks the line itself, and `false` again once the line has been
scrolled back into view, because tmux copy-mode repaints the rows. Section 4.1 measured that a
SELECTION is governed by the same flag. **This capture reproduces the program-wrap half exactly**: tmux
calls **4,703 of 42,936** claude rows wrapped and **6 of 8,353** codex rows — research 107 read 6 as
well, in a different capture, weeks of scrollback apart.

**Two. The only substitute a provider could read is the row's width, and it is a guess.** Of the
22,783 rows that fill the pane's width, tmux says only **4,702 — 20.6% —** are continued. Per agent:
claude 4,699 of 17,473 (26.9%), codex **2 of 5,003 (0.0%)**, shell 1 of 307 (0.3%). At the SPAN level
the same proxy is much better, 57 of 66, but it is still 9 spans in 66 where the rule would be
guessing, and on codex it is measuring nothing at all.

**Three. A glue that produces a real file is not evidence the join happened.** A blind glue — the span
plus the next row's leading path run, with the program's gutter stripped — produces a path that
EXISTS **57 times**, and tmux confirms only **18** of them. **39 of 57, 68.4%, are joins tmux never
made.** The mechanism is measured rather than guessed: of those 39, **22 have a DIRECTORY as the span**
and 17 a span that is not there, and **0 have a file**. A span that ends in a directory followed by a
row that begins with a name inside that directory glues into something that resolves perfectly and is
two unrelated lines.

**And on codex the question cannot be answered at all.** A gutter-stripping glue reconstructs an
existing file **20 times** on the codex panes and tmux confirms **2**, because tmux never joined those
rows and never will — the program drew them. **This is a correction to research 107 in the useful
direction and it does not change its conclusion**: research 107 says a blind two-row join on codex
"produces a string with the gutter buried in the middle of the path", which is true of a blind join
and not of a gutter-stripping one. The gutter can be stripped. What cannot be had is any way to know
whether the strip was right, and **the errors are invisible: a rejoin that opens the wrong file opens
a file, which looks exactly like working.**

### 4.3 The decision, put to him

| option | what it costs | what it buys |
| --- | --- | --- |
| **leave refusal 8 as it is** | 78 file spans, 20.1% | 7 wrong opens prevented; nothing ever guesses |
| **spell it tightly** (last column only) | 34 file spans, 8.8% | 57 of the 66 truncations still refused; still nothing guesses; **44 more spans clickable** |
| **rejoin at the last column** | a rule that is wrong about 9 spans in 66 on claude and unmeasurable on codex | **34 spans** whose glue is a file the span alone was not, of which tmux confirms 18 |

**Jake's own screenshot is a codex pane, which is the row of that table with no evidence in it.** The
tight spelling would not make his path clickable either, because his span does reach the last column —
it is only the rejoin row that could, and it is the row where nothing can be checked. **The honest
sentence to him is unchanged from research 107 and this measurement strengthens it: widening the root
rule does not make a Codex-wrapped path clickable, and neither does any rejoin that can be trusted.**

---

## 5. QUESTION 4 — THE GUARDS, READ FROM THE TREE

### 5.1 `looksLikeSecretPath`, and what `NEVER_PREVIEW` does and does not name

`src/shared/preview-types.ts:192`. It reads the base NAME only, never content, and runs the six rules
at `:127`: dotenv in every spelling (`.env` and anything starting `.env.`), key material by extension
(`.pem .key .cer .crt .der .p12 .pfx .jks .keystore .asc .gpg .ppk`), the four SSH key stems and their
`.pub` halves, `.properties`, `.netrc`/`_netrc`, `.htpasswd`/`htpasswd`. `canPreviewPath` at `:218`
runs it FIRST and the extension allowlist second.

**It does not name `auth.json`, and §2.4 measures that the gap is a family**: `.npmrc` is in this
corpus three times, inside a project root, and holds an auth token. **The list's own header argues why
it exists when the allowlist already refuses every row** — *"The allowlist is a set somebody will add
a line to. This list is the reason they may not add a line for these, stated in the same file they
would edit"* — which is exactly the argument for putting the credential-JSON family in it now, before
a second surface starts opening files by name.

### 5.2 The local-only predicate

`src/renderer/terminal/TerminalPane.tsx:351`, `() => sessionRow()?.machine === undefined`, one screen
above `new WebLinksAddon(` at `:359`. It is read PER KEYSTROKE rather than captured, which is the
property refusal 5 needs — a session's machine is a live fact and a closure that captured it would
answer for the session as it was when the pane mounted. **The corpus cannot test refusal 5: every
session in it is local, and `remote_projects` reads 0 rows on this Mac, which is refusal 11's own
argument arriving through the manifest.**

### 5.3 What `drop:prepare` answers today, and whether refusal 6 can hold

`DropPreparedItem` (`src/shared/types.ts:1392`) answers `sourcePath`, `kind: 'file' | 'dir' |
'missing'`, `refPath`, `copied`, `isImage`, `bytes`. **It answers no realpath, no mode and no
executable bit**, so version two needs three fields added to a reply that already exists — which is
what research 107 section 12 clause 3 already asked for with the realpath, and a field on a reply is
not a door.

Its two traps are unchanged and both are real: `prepareOne` **writes** when a filename holds `\r` or
`\n` (the newline rescue copies the file into the drop store), and it **reads 256 bytes** of every
regular file to sniff an image. A hover must do neither — refusal 3 — and the read is not needed
either, because the image destination is gated on `IMAGE_EXTENSIONS` and not on the sniff.

**Refusal 6 cannot hold literally for the external door, and the measured argument is this.**
`shell.openPath` exists only in main, so a click in the renderer reaches it through a channel or not
at all. The contract holds exactly one channel that hands a file to an application, `fs:openWith`
(`src/shared/ipc/files.ts:354`), and its `resolveTarget` (`src/main/fs/open-with.ts:409`) requires an
open project ROOT and proves the file inside it. **Reusing it would mean deleting
`resolveOpenProjectRoot` from the one call site research 107 section 8 cites as the argument against
this whole capability.** A new narrow channel is strictly safer than widening that one.

So: **one new channel, and every question re-asked inside it.** The renderer's copy of the answer
decides only whether to draw an underline; main's own answer is the only thing that acts, because the
hover answer is a cache and the file at that spelling can be replaced between the underline and the
click. Phase 235 is the precedent for where the guard goes: `fs:reveal` is ungated in main and its
rule lives at every call site, and that shape needed **six doors and three rounds inside one phase**
to hold.

**And the harness seam the entry's app run needs already exists in the same domain.**
`GMUX_OPEN_WITH_RECORD` (`src/main/fs/open-with.ts:583`) names a file; when it is set a launch appends
one JSON line naming the binary and the argv and **starts nothing**. The external door should wear the
same shape, so the app run can read what LaunchServices would have been handed without LaunchServices
ever being handed it.

### 5.4 HOW TO ASK THE EXECUTABLE-BIT AND BUNDLE QUESTIONS, AND WHERE IN THE SEQUENCE

The order is not a detail: **mode is asked before extension**, or a `.pdf` with the executable bit set
walks through the allowlist. The sequence, and each step is a refusal WORD rather than a boolean:

1. **the spelling** — not absolute, or holding `\r` or `\n` → refused before any filesystem call;
2. **`lstat`, then `realpath`** — everything after this is asked of the realpath, leaf included
   (refusal 10);
3. **the bundle** — a directory carrying an extension, or one holding `Contents/Info.plist`;
4. **a regular file** — refuses a directory, a FIFO, a device, a socket;
5. **`looksLikeSecretPath` on the realpath's base name**;
6. **the executable bit** — `st.mode & 0o111`, on the realpath, **before the extension is read**;
7. **the extension** — an image goes to Tortie's image surface, a member of the closed external set
   goes to `shell.openPath`, everything else opens as text in Tortie.

**Steps 3 and 4 overlap on purpose and step 4 is the one that actually holds.** A bundle IS a
directory, so the regular-file test refuses every bundle whatever its suffix says; the named bundle
check exists so the refusal word is accurate and so a later round cannot delete the regular-file test
believing the bundle check covers it. Note that main's existing `isAppBundleOnDisk`
(`src/main/fs/open-with.ts:567`) tests `.app` and a directory and would NOT catch a bundle wearing a
`.png` suffix — **the regular-file test is what catches that**, and it is the reason a `.app` never
reaches a door.

**This sequence was run rather than reasoned.** `node build/p247/offer-cost.mjs --fixtures` builds
fifteen hostile shapes in a scratch directory it removes in a `finally`, asks the sequence about each,
and prints the answer. **Nothing is opened and nothing is executed: every answer is `lstat`, `realpath`
and `stat`.** All fifteen behaved:

| shape | answer |
| --- | --- |
| a `.png` that is really a shell script | `tortie:image` — Tortie draws bytes and runs nothing |
| a `.png` carrying the executable bit | `refused:executable-bit` |
| a `.pdf` carrying the executable bit | `refused:executable-bit`, so the allowlist never sees it |
| an ordinary `.pdf` | `mac:openPath` |
| a `.command`, executable | `refused:executable-bit` |
| a `.command` with NO executable bit | `tortie:editor` — it is not on the allowlist, so it opens as text |
| a BUNDLE DIRECTORY wearing a `.png` suffix | `refused:bundle` |
| a `.app` | `refused:bundle` |
| a symlink spelled `.png` whose leaf is a bundle | `refused:bundle` |
| a symlink spelled `.md` whose leaf is a `.pem` | `refused:secret-name` |
| `auth.json` | **`tortie:editor` — the shipped gap, reproduced rather than assumed** |
| a spelling with a newline in it | `refused:control-character` |
| a Mach-O `.dylib` | `refused:executable-bit` |
| `/usr/bin/env` | `refused:executable-bit` |
| `/etc/hosts` | `tortie:editor` — **not refused by anything, and that is the widening** |

**The last row is the one to read twice.** A system text file is a real file, it is not a secret by
name, it carries no executable bit, and version two will underline it. That is the widening working as
intended and it should be stated to him in those words rather than discovered later.

### 5.5 One clause the destination needs and does not need arguing

`openFileAt` (`src/renderer/context/open-detail.ts:89`) takes a `repoPath` alongside the path and its
own comment says why a path outside it is ordinary business: *"Most context files live OUTSIDE the
project — `~/.claude/skills/…` is the common case here, not the edge one"*, and every open from it is
`mode: 'file'` so no git call is ever made for an outside path. The pane's own project is the
`repoPath` to pass; an absolute path outside it simply stays absolute. **The widened destination needs
no new argument and no new function.**

---

## 6. WHAT IS NOT MEASURED, STATED RATHER THAN HIDDEN

- **Eleven of the fourteen registry agents.** Only claude, codex and shell were running, which is
  research 107's own gap and is unchanged.
- **Every remote path.** No session in this corpus runs on another machine and `remote_projects` reads
  0 rows, so refusal 5 and refusal 11 are inherited reasoning and not measurements.
- **Version two's recall.** §2.2's 4.7% is a COMPOSITION of research 107's hand-marked 37.5% with this
  capture's door-reaching share. Measuring it directly needs a fresh hand adjudication of real
  references against all of version two's clauses, and nobody has done one.
- **Whether he would CLICK any of the 200.** The adjudication asks whether the text really names that
  file, not whether he wants it. Only he can answer the second.
- **The `.pdf` door.** Zero occurrences in the corpus, so its false-positive rate, its usefulness and
  its risk are all unmeasured by construction. What IS measured is that no other kind needs it.
- **The oracle's blind half.** tmux's `-J` sees a terminal wrap and cannot see a program wrap, so every
  codex reading in §4.2 is an upper bound on what can be confirmed and says nothing about what is
  true. 20 codex glues resolve to a real file and 2 are confirmed; the other 18 are simply unknown.
- **The `-J` alignment.** 2 of the 5 claude panes align by index and every codex and shell pane does,
  which is why the oracle is a substring question. A substring probe can be fooled by a pane that
  really does contain the same two-row text elsewhere; the probe uses the row's whole width plus 20
  characters of its successor to make that unlikely, and it is not impossible.
- **Any behaviour of the running app.** No Electron was launched. Every door answer in §5.4 is the
  SEQUENCE run under node over files this measurement made itself, not the product running it, because
  the product does not have it yet.
- **The per-hover cache.** research 107 section 7.5 argues it from the distinct-path counts and this
  capture agrees with the argument — 72 distinct files behind 200 spans — but no cache was built and
  none was measured.
- **The corpus is live and it moved under the measurement.** Five runs across forty minutes read 1,574
  to 1,585 detection offers and 310 to 320 kept spans. Every share held to within a point. The numbers
  quoted throughout are one run, `build/p247/offer-cost.mjs` at 52,094 rows, so the document is
  internally consistent rather than assembled from the best reading of each.
