# 114 — the two refusals multiplied together, and whether a relative path has a base that can be trusted

Phase 250, the MEASURE step, 2026-09-09, at `2ca274ca`, Tortie 0.102.0, tmux 3.6a,
`@xterm/xterm` 6.0.0, node 22.23.1, over 29 of the operator's own live panes and 59,791 physical
rows.

**It builds nothing.** No product file was touched. One helper is kept because a later round would
really re-run it, `build/p250/funnel.mts`, and it answers every question below off ONE capture so
the answers are about the same corpus rather than several captures minutes apart. No Electron was
launched. No agent was spawned, no token spent, no keychain opened, no machine touched, no ssh
started. **`shell.openPath` and `shell.openExternal` were never called, by anything, at any point,
and neither is imported anywhere in this measurement.** The operator's live sessions on `-L gmux`
were LISTED, had their options SHOWN and were CAPTURED, and nothing else — never attached, never
sent a key, never killed — and they were 30 before every run and 30 after. The manifest was read
from a COPY for the bases, never opened in place. **The only filesystem calls anywhere are `lstat`,
`realpath` and `stat`, all of them inside the SHIPPING `factsForPath`: no path read out of a
transcript was opened, followed into, executed or written to.** Every number below is a count, a
rate or a shape, and no path out of any pane appears in this document.

This document inherits Phase 247's eleven refusals and lifts none of its own. It measures two lifts
and recommends both, with three narrowings that are priced rather than asserted.

---

## THE ANSWER IN EIGHT NUMBERS

| | |
| --- | --- |
| **What is clickable today**, over his own 29 panes | **195 spans over 61 distinct files**, out of 7,359 path-shaped spans the grammar yields — **2.6%** |
| **What is clickable today, of the paths that really name a file on this Mac** | **61 of 364 files — 16.8%.** Five of every six paths his agents print that really exist do nothing |
| **Where the losses are** | refusal 8 takes **2,021** spans, the relative rule takes **2,938**, and the door's own refusals take **2,205**. The two lifts address the first two |
| **What LIFT ONE costs**, re-derived | the tight spelling refuses **3 of 272** door-reaching absolute spans where the shipped one refuses **77**, and the tmux `-J` oracle flags **1** of the 1,724 spans it admits — **and that one is a padded row, so the path was never cut** |
| **Research 111 §4.1's own tight spelling, re-derived** | it refuses **41 of 272**, not 34 of 388's share. The difference is trailing whitespace: **32.2% of his rows are padded to the pane width**, and its head clause reads the padding as a wrap |
| **The three candidate bases** | **identical strings on 29 of 29 panes.** `projectPath`, `#{pane_current_path}` and the agent's launch cwd are one base in practice, and the manifest agrees on 229 of 235 rows |
| **What LIFT TWO gets wrong**, against an oracle inside his own transcripts | of 156 checkable relative spans the base is right on **132 (84.6%)** — but **115 of the 156 draw no link at all**, so of the **41 links actually drawn, 39 open the right file and 2 open a different one: 4.9%** |
| **What both lifts together reach** | **1,870 spans over 361 distinct files**, being **99.2%** of the 364 files that are really there |

**The two wrong opens are the same shape and it is his own workflow**: a subagent working in a
worktree under a scratch root prints a path relative to the worktree, the pane's session is the
checkout, and the click opens **the other copy of the same file**. That is the worst kind of wrong
open, because the file looks right.

---

## 1. THE CORPUS, THE INSTRUMENT, AND THE SECOND INSTRUMENT THAT CHECKED IT

`tmux -L gmux list-sessions`, then per session `show-options`, `list-panes` for the width and
`#{pane_current_path}`, then `capture-pane -p -N -S -` and `capture-pane -p -J -S -`. A session with
no `@gmux-agent` option is not ours and is skipped, which is why 29 of the 30 are here.

| agent | panes | physical rows | spans the grammar yields |
| --- | --- | --- | --- |
| claude | 11 | 49,403 | 5,743 |
| codex | 13 | 9,465 | 1,478 |
| shell | 5 | 923 | 138 |
| **total** | **29** | **59,791** | **7,359** |

**Nothing here is a restatement of the product.** The grammar is the shipping `tokensInRow`,
`looksLikePath`, `edgeRefusal` and `stripDecoration` imported from `src/shared/path-spans.ts`; the
renderer's own relative refusal is the shipping `couldBeAbsolute`; and the door is the shipping
`answerPathDoor` from `src/main/fs/path-door.ts`, which is `lstat`, `realpath`, `stat` and the pure
`decidePathDoor`. `build/p250/tsconfig.json` exists only to teach the loader the `@shared/*` alias
that main module uses. As an internal check the funnel's own survivor count is compared against what
the shipping `pathSpansInRow` yields over the same rows: **5,338 both ways.**

### 1.1 The cross-check, and the five spans it explains

Research 111's helper, `build/p247/offer-cost.mjs`, was run over the same corpus in the same window.
It is a genuinely different instrument: a different tokeniser (`build/p245/corpus-scan.mjs`), its own
resolution code and its own hand restatement of the door sequence.

- **It yields 7,359 path-shaped tokens. So does the shipping grammar.** The claim in
  `path-spans.ts`'s header that the port is line for line survives an exact count over 59,791 rows.
- **It offers 200 spans at a door. The shipping code offers 195.** Driven span by span, 183 keys
  match outright and 12 more are the same span at the same column opening the same file under a
  shorter spelling, which is the `~` expansion `expandHome` does and the older helper does not.
- **The five that remain are all `looksLikeSecretPath`**, and the shipped predicate is the stricter
  of the two. They are exactly the family research 111 §2.4 named — an `auth.json` twice and an
  `.npmrc` three times — and Phase 247 adopted `CREDENTIAL_FILE_NAMES` into
  `src/shared/preview-types.ts` in answer to it. **So research 111's published "200 spans reach a
  door" is five high against the code that shipped, and the shipped code is the safe side of the
  difference.**

That reconciliation is the reason the numbers below can be trusted to be about the product rather
than about a model of it.

---

## 2. QUESTION 1 — THE TWO REFUSALS MULTIPLIED TOGETHER

### 2.1 The funnel

| | spans | share of the grammar | distinct spellings |
| --- | --- | --- | --- |
| whitespace tokens | 356,345 | | |
| **spans the grammar yields** | **7,359** | 100% | 1,811 |
| survive REFUSAL 8 (`edgeRefusal`) | 5,338 | 72.5% | 1,105 |
| survive NOT-ABSOLUTE (`couldBeAbsolute`) | 2,400 | 32.6% | 266 |
| **REACH A DOOR** | **195** | **2.6%** | **61 distinct files** |

The doors are `editor` 190 and `image` 5. **Nothing reaches LaunchServices**, which is what research
111 predicted and what an empty allowlist means in practice.

The three losses, and they are of comparable size:

| where a span is lost | spans |
| --- | --- |
| refusal 8 | 2,021 |
| the relative rule | 2,938 |
| the door's own refusals | 2,205 |

The door's own 2,205 break down as **a directory 1,313**, **not there 742**, **the executable bit
136**, **a bundle 8**, **a secret name 6**. Every one of those is a refusal this phase keeps.

### 2.2 The percentage he can recognise from his own screen

Three ways of saying it, and the third is the honest one:

- **2.6% of the path-shaped things on his screen are clickable.** 97 in every 100 do nothing.
- **3.4% of the distinct spellings** his agents printed are clickable — 61 of 1,811.
- **16.8% of the paths that really name a file on this Mac.** Of the 364 files his agents named
  across those 29 panes that exist, are regular files, are not secrets by name and carry no
  executable bit, **61 are clickable and 303 are not.** Five in six.

**Neither refusal is a defect and both were measured.** Refusal 8 exists because a span whose end is
unknown must not be offered, and it is priced at 78 of 388 file spans in research 111 §4.1. The
relative rule exists because a relative path has no meaning without a base. What nobody had done is
put them in series against a real pane, and in series they leave 2.6%.

### 2.3 Per agent, because the two refusals do not bite equally

| agent | grammar | survive refusal 8 | relative | reach a door |
| --- | --- | --- | --- | --- |
| claude | 5,743 | 4,231 | 2,223 | 153 |
| codex | 1,478 | 1,024 | 655 | 37 |
| shell | 138 | 83 | 60 | 5 |

---

## 3. QUESTION 2 — LIFT ONE, PRICED, AND RESEARCH 111'S OWN SPELLING CORRECTED

### 3.1 The spelling this document measures

Refusal 8 exists for a path that RUNS OFF the edge. A path that merely ENDS at the last glyph of a
row has a known end. So:

> refuse a span whose last cell is the pane's LAST COLUMN, or one that starts a row whose
> PREDECESSOR filled its own last column **and ended on a character a path can continue with**.

The last clause is the shipped rule's own second half, kept. Everything it needs is readable in the
renderer: the width is `Terminal.cols`, the span's last column comes from the map `cellColumns`
already builds, and **the predecessor is measured by its DRAWN content — `translateToString(true)`,
the same thing `tmux capture-pane` hands back — and never by its raw length**. That last clause is
the whole difference between this spelling and research 111 section 4.1's, and section 3.4 prices
it: a third of his rows are padded out to the pane width with spaces their text does not reach, and
the raw length reads every one of them as a wrap. The predecessor's own drawn END is still a COLUMN
rather than a string index, so it is read out of that row's own `cellColumns` map, which covers the
padding cells the trimmed text stops short of — the map is the untrimmed thing here and the text is
not. **Nothing here reads `isWrapped`**, which research 107 measured lying in both directions.

**THE FIRST VERSION OF THIS SECTION SAID THE ROW ABOVE IS READ UNTRIMMED WITH
`translateToString(false)`**, which is research 111 section 4.1's clause and not this one's, while
section 3.4 two pages down argued against it and the helper that produced every number here
(`tightEdgeRefusal` in `build/p250/funnel.mts`) trimmed the row on its first line. Section 8 line 1
then told the next round to implement section 3.1. The fix round corrected the sentence, the
helper's own comment beside it, and section 8 line 1.

**AND IT MEASURED WHAT THE SENTENCE WOULD HAVE COST, because the first answer written down was
wrong.** That answer was "41 of 272 instead of 3", and those are `research111EdgeRefusal`'s numbers,
which differ in TWO clauses: the raw predecessor AND the path-character test dropped. Section 3.1's
own quoted rule keeps the path-character test, so its sentence taken literally is the raw
predecessor with that test still in place — and a row padded out to the width ends in a **space**,
which is not a character a path continues with, so the test absorbs the padding and the trim buys
nothing on its own. Driven over 32 live panes and **82,425 physical rows** through
`section31EdgeRefusal`, added to the funnel for this purpose:

| spelling | refuses, of 14,355 grammar spans | of 280 door-reaching absolute spans |
| --- | --- | --- |
| Phase 247's, as shipped before this phase | 4,649 | 81 (28.9%) |
| research 111 section 4.1 | 638 | 39 (13.9%) |
| **section 3.1's sentence taken literally** | **310** | **2 (0.7%)** |
| **the adopted spelling** | **310** | **2 (0.7%)** |

**The last two rows are the same rule in this corpus.** So the sentence was wrong and it was also
harmless, and both halves of that are said here rather than the first one alone. The corpus is
larger than the one section 2 was measured on (32 panes against 29), which is why 272 reads 280 and
77 reads 81; the shape is unchanged.

**What the fix round did about it is a gate rather than a correction.** `conformance:pathdoors` rule
15 runs this document's own helper at HEAD, asks the SHIPPING `edgeRefusal` the four questions the
measured spelling is asked, and fails if they part; the same run over the whole corpus agrees on
**14,355 of 14,355 spans, zero disagreements**. Its ablation is research 111's TWO clauses put back,
and the rule also asserts that the trim ALONE leaves the reading green — so the paragraph above
cannot decay into a claim nobody checks. Rule 15 also reads these four prose sites and fails when a
paragraph in any of them attributes an untrimmed predecessor to the adopted spelling without naming
it as the rejected reading, proved on six planted sentences of which two must be caught.

**AND THE HELPER HAD STOPPED RUNNING ALTOGETHER**, which is why none of this was visible. Phase 250
changed `edgeRefusal`'s third parameter from a string to a `RowEdges` and never updated the file
that measures it: run at HEAD, `--self-test` died on its sixth check with `Cannot read properties of
null (reading 'columns')`, and the corpus run died in its internal check. Nothing went red, because
tsx strips the types, `build/p250` is outside `tsc -b`, and the file was in no gate. The Phase 247
spelling is now carried in the funnel as `phase247EdgeRefusal` — a fixed reference point, copied
from `2ca274ca` — so "at the parent" keeps meaning what it meant, and the shipping import is used
for the identity check instead.

### 3.2 What it costs and what it keeps

| | spans | share of the grammar |
| --- | --- | --- |
| refused by the SHIPPED spelling | 2,021 | 27.5% |
| refused by RESEARCH 111 §4.1's spelling | 624 | 8.5% |
| refused by THIS spelling | 297 | 4.0% |

Over research 111's own denominator, being **272 absolute spans whose realpath reaches a door**:

| spelling | refuses | leaves clickable |
| --- | --- | --- |
| shipped | **77 (28.3%)** | 195 spans over 61 files |
| research 111 §4.1 | 41 (15.1%) | — |
| **this one** | **3 (1.1%)** | **269 spans over 90 distinct files** |

**Lift one alone takes the clickable set from 195 spans over 61 files to 269 over 90**, which is 38%
more spans and 48% more files, and every one of the extra spans is a path an agent printed at the
end of an ordinary sentence.

### 3.3 THE COST IN WRONG OPENS IS ZERO IN THIS CORPUS, AND THE REASON IS PADDING

tmux's own `-J` capture is the oracle: it joins the rows tmux believes were wrapped, so whether two
rows are really one line is tmux's answer rather than a model of one. Of the **1,724** spans the
tight spelling admits that the shipped one refuses, the oracle calls **38 (2.2%)** part of a wrapped
line, and **exactly 1 of those reaches a door**.

**And that one is a padded row.** A span that ends its row can only have been cut if nothing but the
row's edge sits after it; when the row carries trailing spaces up to the width, the break fell in
the padding and the path is whole. Asked that question, the single case answers **padded, 0 flush**.
So the tight spelling introduces **no measured truncation that could cut a path**.

**The protection it keeps is intact.** It still refuses **205** spans for reaching the pane's last
column, and the oracle confirms **139 of them (67.8%)** really are one line with their neighbour.
A wrapped path stays refused, which is what the entry requires, and the fixture arm proves it:
driven through the shipping grammar, a span that reaches the width is refused `edge` while the same
text in a wider pane is offered.

### 3.4 RESEARCH 111'S OWN TIGHT SPELLING IS NOT THE ONE TO ADOPT, AND THE REASON IS A MEASUREMENT

Research 111 §4.1 priced a tighter refusal 8 at 34 file spans against 78. Re-derived here its
spelling refuses **41 of 272**, more than five times what the spelling above refuses, and the
difference is one clause: it reads the predecessor's RAW length, trailing spaces included, and drops
the path-character test.

**32.2% of his rows — 19,237 of 59,791 — carry trailing whitespace out to the pane's width while
their drawn content stops short.** Research 111's head clause reads every one of those as a
predecessor that wrapped, so a span opening the row below one is refused for a break that fell in
the padding. That is the same padding fact §3.3 turns to the other purpose, and it is why this
document re-derived the number rather than adopting it, exactly as the entry asked.

### 3.5 The correction this measurement had to make to ITSELF

The first version of this helper asked the oracle about the wrong break. A span that ENDS its row
can only have been cut by the break BELOW it, and a span at a row's HEAD only by the break ABOVE it,
and both were asking `rowsAreOneLine(i)`. With the index wrong it read **6 wrong opens, 5 of them
flush**; with it right it reads **1, and that one padded**. The comment in `tightEdgeRefusal`'s
neighbourhood says so, because it is the kind of mistake a later round makes again.

### 3.6 Two limits of any column rule, stated rather than hidden

- **The width the renderer reads is today's width and the scrollback was written at yesterday's.**
  `IBufferLine.length` may exceed `Terminal.cols` after a resize, which xterm's own typings say, so
  a rule must compare against `cols`; and a row written when the pane was narrower carries its wrap
  from then. Two of the spans the first pass flagged sat 32 columns short of the current width,
  which is the signature of exactly this.
- **A column is not a string index on 28.5% of these rows.** 42,762 of 59,791 rows are pure ASCII
  where the two agree exactly; the rest need the map `cellColumns` already builds. This measurement
  uses an approximation of xterm's arithmetic and says so; the renderer has the real map.

---

## 4. QUESTION 3 — LIFT TWO, AND THE BASE IS DEFENSIBLE

He asked for this directly on 2026-09-09: *"i also would like to attempt to resolve relative paths
since we know what project a session is in and agents will normally refer to path."* So the job was
to find the trustworthy base, and the answer is that a trustworthy-enough base exists, that the ways
it fails are almost all fail-closed, and that the one way it fails open is measurable and can be
narrowed.

### 4.1 The three candidate bases are one base

| | |
| --- | --- |
| panes where all three bases are the SAME string | **29 of 29 (100%)** |
| `projectPath` == `#{pane_current_path}` | 29 |
| `projectPath` == the agent's launch cwd | 29 |
| manifest rows where `project_path` == `cwd`, over all 235 | **229 (97.4%)** |

**So there is no three-way disagreement in this corpus to arbitrate**, and the choice between them
is a choice about which is right on the day they differ. Two things follow rather than one:

- `#{pane_current_path}` is the LIVE fact — it is the pane's foreground process's own working
  directory — so it is the one that would follow an agent that changed directory. It costs a tmux
  round trip the renderer does not make today.
- `projectPath` is already in the provider's hands: `TerminalPane.tsx` passes
  `repoPath: () => sessionRow()?.projectPath ?? ''` to `PathLinkProvider` and the editor already
  takes it as the tab's repo. **Lift two needs no new fact on the renderer side at all.**

And neither of them sees the case that actually fails, which is §4.4.

### 4.2 What resolving buys

Of the **2,938** relative spans that survive refusal 8, over **839** distinct targets:

| | spans | share |
| --- | --- | --- |
| no base resolves — the span stays unclickable, which costs nothing | 1,714 | 58.3% |
| the base resolves to a file at a door | **1,224** | **41.7%** |
| the three bases resolve to DIFFERENT files | 0 | 0% |

**243 distinct files** stand behind those 1,224 spans, and their kinds are what an agent talks
about: `.md` 728, `.ts` 123, `.go` 83, `.tsx` 77, `.js` 55. **Not one of them takes the Mac door.**

The refusals the resolved paths meet are the ordinary ones — across all three bases, 3,543 answers
of `missing`, 1,497 of `not-a-regular-file`, 75 of `executable-bit` and 27 of `bundle`. **A resolved
relative path is asked every question an absolute one is asked**, because the sequence in
`decidePathDoor` never learns how the spelling was made. The fixture arm drives that: a relative
`bin/go.sh` is refused `executable-bit`, a relative `config/.env` is refused `secret-name`, a
relative directory is refused `not-a-regular-file`, and a relative symlink whose leaf is a bundle is
refused `bundle`.

### 4.3 THE ORACLE, WHICH IS INSIDE HIS OWN TRANSCRIPTS

A relative target whose own pane ALSO prints the same tail absolutely tells us what that text was
relative to. 156 relative spans have exactly one implied base that way, and 2 have more than one.

| | of the 156 |
| --- | --- |
| the base equals the implied base | **132 (84.6%)** |
| it does not, and the join resolves to nothing, so no link is drawn | 22 (14.1%) |
| it does not, and the join opens a real file anyway | **2 (1.3%)** |

**The click-level reading is the one that matters**, because a base that is wrong about a path that
does not exist costs nothing:

| what a hover would do, over the 156 | |
| --- | --- |
| draw no link at all | 115 (73.7%) |
| draw a link | 41 (26.3%) |
| — opening the file the text names | **39 — 95.1% of the links drawn** |
| — opening a DIFFERENT file | **2 — 4.9% of the links drawn** |

**The point estimate is one wrong open in twenty and the exact 95% interval, Clopper-Pearson on 2 of
41, runs from 0.60% to 16.53%**, so the upper end of it is worse than the one-in-ten he named. That is stated plainly rather
than rounded away. What the interval does not capture, and what §4.4 and §4.6 do, is that both
observed failures are one shape and that shape can be refused.

**The oracle's own limits.** It covers 156 of 2,938 relative spans, being 5.3%, and it is biased
toward paths a pane happens to print both ways. It cannot see a relative path the pane never spelled
in full, which is most of them.

### 4.4 WHAT THE TWO WRONG OPENS ARE, AND THEY ARE HIS OWN WORKFLOW

Both are four-segment `.ts` paths whose true base is **a scratch root** — a worktree — and whose
session's project is the checkout. The mechanism is ordinary here: a workflow agent runs in a pane
whose session is the checkout and spawns work whose working directory is a worktree under
`/private/tmp`; the worktree's own output goes into that pane; `#{pane_current_path}` still answers
the checkout, because the pane's foreground process never moved.

**So the click opens the other copy of the same file.** It is a real file, the right name, the right
contents by shape, and the wrong tree. Of the 24 oracle disagreements the families are: a system
root 14, a subdirectory of the project 4, a scratch root 3, elsewhere in the home 3. **The scratch
family is the only one that opens anything**, which is why 3 disagreements produce 2 wrong opens
while 14 produce none.

### 4.5 A WRONG BASE MOSTLY OPENS NOTHING, AND THAT IS THE ARGUMENT

Independently of the oracle: of the **839 distinct relative targets**, joined against all **7**
distinct bases anywhere in the corpus,

| opens a real file under N bases | targets | share |
| --- | --- | --- |
| 0 | 593 | 70.7% |
| 1 | 237 | 28.2% |
| 2 or more | **9** | **1.1%** |

**Seven in ten relative targets open nothing under any base at all**, and only one in ninety opens
something under two. A relative path is not a name that exists everywhere; it is a name that exists
in one tree. That is why the failure mode of a wrong base is overwhelmingly a link that is not
drawn.

### 4.6 THREE NARROWINGS, EACH PRICED

**One — containment, and it is cheap.** Offer a resolved relative path only when its REALPATH is
still inside the base. It costs **7 of the 1,224 links (0.6%)** and it removes the whole family of
`..` climbs and symlink escapes in one clause. 22 relative spans in the corpus carry a `..` segment
and the fixture arm shows one climbing out of its base into a sibling tree and opening. **Recommend
it.**

**Two — no Mac door for a resolved relative path.** The asymmetry is real and it is the reason
Phase 247's whole risk sits where it does: opening the wrong file in an editor tab is a surprise a
person sees and closes, and handing the wrong file to LaunchServices runs a program. **It costs
zero measured spans** — no relative resolution in 59,791 rows takes the Mac door, because
`EXTERNAL_ALLOW` is `{.pdf}` and there is no `.pdf` here — and the fixture arm shows that without
the rule a resolved `docs/paper.pdf` reaches `mac` today. **Recommend it**, as one clause: a door
answered for a spelling that was relative may be `editor` or `image` and never `mac`.

**Three — the disagreeing witness, and this one is the spec step's call.** Refuse a relative span
whose own pane has printed the same tail under a DIFFERENT absolute base. It refuses **26 of 2,938
relative spans (0.9%)** and **2 of the 1,224 links (0.2%)** — and those 2 are exactly the two
measured wrong opens. It is the only narrowing that removes them. Its cost is not in spans, it is in
mechanism: it needs a pane-wide index of absolute spellings that the provider does not have and that
a hover cannot build per call. **Priced, not recommended, because the work is real and the benefit
is two spans in twelve hundred.**

### 4.7 The answer to the question the entry asked

**A relative path an agent printed is relative to the directory the agent believes it is in, and
Tortie's best available name for that is the session's `projectPath` — which on every pane in this
corpus is the same string as the pane's own working directory and the directory the agent was
launched in.** It is right on 84.6% of the spans that can be checked, it draws no link on three
quarters of the ones it is wrong about, and of the links it does draw 95.1% open the file the text
names.

**That is defensible and this document recommends shipping it**, with containment and the Mac-door
refusal above, and with §4.4 written into the code as the stated limit rather than discovered later.
**If the fix round or the operator judges one in twenty too high, the honest lever is narrowing
three, not abandoning the lift** — because refusing relative paths altogether costs 1,601 of the
1,870 spans both lifts make clickable.

---

## 5. THE TWO LIFTS COMPOSED, AND WHICH SCREENSHOT EACH ONE FIXES

### 5.1 What a hover would offer

| | spans | distinct files |
| --- | --- | --- |
| today | 195 | 61 |
| LIFT ONE only | 269 | 90 |
| LIFT TWO only | 1,419 | 293 |
| **BOTH** | **1,870** | **361** |

As a share of the 7,359 spans the grammar yields: **2.6% today, 25.4% with both**. As a share of the
**364 files that are really there**: **16.8% today, 99.2% with both**.

**Lift two is the bigger of the two by a factor of five and lift one is the one he saw first.**

### 5.2 The three screenshots, driven through the shipping grammar and the shipping door

`--fixtures` builds each shape in a scratch directory it removes in a `finally` and asks the
shipping sequence about it. All twenty readings behaved.

| his screenshot | today | LIFT ONE | LIFT TWO | both |
| --- | --- | --- | --- | --- |
| an absolute, existing README **on a line of its own** | `refused:edge` | **`editor`** | no change | `editor` |
| a relative path **mid-sentence** with a trailing colon | `refused:not-absolute` | still refused | **`editor`** | `editor` |
| a relative path **at the end of a row**, and with `:93` | `refused:edge` | still refused | still refused | **`editor`** |

- **Screenshot one is lift one alone.** The span ends its row, refusal 8 refuses it, and the row is
  far short of the pane's width. The same fixture at a pane width equal to the row is still refused,
  which is the wrapped case staying refused.
- **Screenshot two is lift two alone.** Refusal 8 lets it through; `couldBeAbsolute` drops it before
  a round trip is made. The trailing `:` is already stripped by the shipping tokeniser's CLOSE set.
- **Screenshot three needs both**, because refusal 8 fires FIRST: with only lift two in, that span
  never reaches the relative rule at all. The `:93` suffix is already handled by the shipping
  `stripDecoration`.
- **And the same fixture shows the risk in one line**: screenshot two's path resolved against the
  WRONG base opens too, silently, a different file with the same name.

### 5.3 One shape neither lift reaches, and it should be said out loud

**A bare filename with no slash is never a candidate.** `looksLikePath` requires a `/`, so
`README.md` alone, `BACKLOG.md` alone or `funnel.mts` alone are not offered at any point and lift
two cannot reach them. That is the right rule — a token with no separator is a word — and it is a
stated limit rather than a gap to close.

---

## 6. THE MECHANISM, READ FROM THE TREE

Facts, not a design. The spec step owns the design.

- **The base is already in the provider.** `src/renderer/terminal/TerminalPane.tsx:391` passes
  `repoPath: () => sessionRow()?.projectPath ?? ''`, read per hover and never captured, and
  `PathLinkProvider` already hands it to `openInTortie` at the click.
- **`couldBeAbsolute` in `src/shared/path-doors.ts` is the renderer's own refusal**, and it is the
  ONE spelling of that rule by design so the two halves cannot drift. Lift two changes what happens
  after it, not whether it is asked.
- **`decidePathDoor`'s first clause, `src/shared/path-doors.ts:186`, is `if (!facts.spelling.startsWith('/'))`.** A resolved relative
  path arrives at it already absolute, so that clause is untouched and stays the backstop.
- **`answerPathDoor` already composes**: it expands `~`, reads the facts and decides. A base is one
  more thing to compose before `factsForPath`, and it is the join that has to happen somewhere.
- **Refusal 6 — no new IPC channel — can hold.** The hover ask is
  `drop.prepare(paths, { classify: true })`, which already carries an options object; a base is a
  field on a request that exists, which is the precedent research 111 §5.3 used for the three fields
  Phase 247 added to `DropPreparedItem`. Joining in the renderer instead would need no contract
  change at all, and it would mean main never sees the relative spelling — every check would still
  be on the realpath, so it is safe either way and it is a choice rather than a constraint.
- **`edgeRefusal` at `src/shared/path-spans.ts:160`, whose first clause is line 165, is the only place refusal 8 lives**, and the
  renderer passes it `translateToString(true)` for both rows. The tight spelling needs
  `Terminal.cols`, the span's last CELL COLUMN from the map `cellColumns` already builds, and the
  row above untrimmed. All three are available and none of them is `isWrapped`.
- **`conformance:pathdoors` drives the shipping grammar against `build/p245/corpus-scan.mjs`**, and
  §1.1 above is a second, independent confirmation that the two still agree at 7,359 spans.

---

## 7. WHAT IS NOT MEASURED, STATED RATHER THAN HIDDEN

- **Eleven of the fourteen registry agents.** Only claude, codex and shell were running, which is
  research 107's gap and research 111's, unchanged.
- **Every remote path.** No session in this corpus runs on another machine, so refusal 5 and
  refusal 11 remain inherited reasoning. Nothing in either lift touches them.
- **Whether he would CLICK any of the 1,870.** The oracle asks whether the text really names that
  file, never whether the link is wanted. Only he can answer the second.
- **A base for a pane whose three candidates DISAGREE.** There are none in this corpus, so the
  choice between `projectPath` and `#{pane_current_path}` is argued from mechanism above and
  measured by nothing.
- **The oracle's reach.** 156 of 2,938 relative spans, 5.3%, and biased toward paths a pane prints
  both ways. The 4.9% wrong-open rate is a rate over those 41 links and not over all 1,224.
- **The wrapped half of the codex panes.** tmux's `-J` sees a terminal wrap and cannot see a program
  wrap, so every codex reading here is an upper bound on what can be confirmed, exactly as research
  111 §4.2 says.
- **Any behaviour of the running app.** No Electron was launched. Every door answer here is the
  shipping sequence run under node, because the app does not have either lift yet. The entry's ONE
  app run belongs to the build step.
- **The per-hover cache under lift two.** 1,224 more spans would be asked about and cached against a
  `CACHE_MAX` of 512; the busiest pane in research 111's capture already held 460 distinct targets.
  **That ceiling is now the thing to check**, and this measurement did not check it.
- **The corpus is live.** Three consecutive runs in one window came back byte identical, and the
  scrollback will have rolled by the time anybody re-runs it.

---

## 8. THE RECOMMENDATION IN FOUR LINES

1. **Take lift one**, spelled as §3.1, not as research 111 §4.1 — and the one clause that separates
   them is that **the predecessor is measured by its DRAWN content and never by its raw length**, so
   read §3.4 before implementing §3.1. It costs no measured truncation and it is what fixes the
   screenshot he saw first.
2. **Take lift two**, against the session's `projectPath`, with **containment** (7 spans) and **no
   Mac door for a resolved spelling** (0 spans).
3. **Write §4.4 into the code**, because the worktree shape is his own workflow and a comment is the
   only place it will survive.
4. **The disagreeing-witness guard is priced and not recommended.** It is the lever if one wrong
   open in twenty is judged too many.
