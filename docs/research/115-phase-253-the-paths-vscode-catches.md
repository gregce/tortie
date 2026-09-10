# 115 — the paths VS Code catches, measured against what Tortie refuses

Phase 253, the RESEARCH step, 2026-09-10, in a worktree at `279e86b9`, Tortie 0.103.x line,
tmux 3.6a, `@xterm/xterm` 6.0.0, node 22. The upstream is **microsoft/vscode at
`770a9bced0e6eff10342b2d95d7cfd98c33b85ed`** (2026-09-10, MIT), read from a shallow sparse clone of
`src/vs/workbench/contrib/terminalContrib/links/` and its tests into a scratch directory that was
**removed before this document was committed**. Nothing from the clone is vendored into `src/`; the
pieces this measurement needed were PORTED into `build/p253/vscode-catches.mts` with the upstream
file and commit named at the port site, and the port is proved on **24 rows of VS Code's own
`terminalLinkParsing.test.ts`** by `--self-test`.

**It builds nothing.** No file under `src/` was touched. Two helpers are kept because the build step
will really re-run them: `build/p253/vscode-catches.mts` (measurements A, A2 and C, one capture) and
`build/p253/wrap-reflow-probe.mjs` (measurement B, its own scratch tmux server and its own ptys, all
ended and the socket unlinked in a `finally`). No Electron was launched, no agent spawned, no token
spent, no keychain opened, no machine touched, no ssh started. `shell.openPath` and
`shell.openExternal` were never called and are imported by nothing here. The operator's live
sessions on `-L gmux` were LISTED, had their options SHOWN, their panes LISTED and their content
CAPTURED, and nothing else — never attached, never sent a key, never killed — and they were **39
before every run and 39 after**. The manifest was read from a COPY. The only filesystem calls on any
path out of a transcript are `lstat`, `realpath` and `stat`, all inside the SHIPPING
`answerPathDoor`; the project file index for measurement C is `git ls-files`, read only, and a root
on the task's refusal list was never indexed at all (4 of the 8 roots were refused, and the counts
say so). **No path, token or credential-shaped string out of any pane appears in this document or in
anything it produced: every number is a count, a rate or a digit-collapsed shape**, and the handful
of literal filenames below (`README.md`, `Makefile`, `package.json`…) are probe strings this
measurement chose itself and asked the corpus about.

This document inherits research 107's refusals as Phase 247 and Phase 250 left them and reopens
none. The corpus is live and moved under the measurement — three runs read 91,574 to 101,329
physical rows as scrollback rolled — and every share below held to within half a point across them;
the numbers quoted are one run (`run5`, 101,329 rows) so the document is internally consistent.

---

## THE ANSWER IN SEVEN NUMBERS

| | |
| --- | --- |
| **What VS Code's suffix parser reads in his panes that the shipping grammar refuses or half-reads** | 6,167 slash-bearing suffix links; ours reads path+line for **18.2%**, path-only for 3.7%, **nothing at all for 78.1%** |
| **What that refusal actually costs** | **154 spans resolve to a real file at a door**, and they are two families: grep-style `path:NN:` with the match text attached (**114**) and tsc-style `path(NN,NN)` (**23 of 23**) |
| **The noisiest VS Code clause, priced** | the bare space suffix `path 339`: **4,783 spans, of which 17 reach a door** — 99.6% of what it admits here is a count, a size or a quantity, not a line number |
| **The segment-grammar gap** (their no-suffix clause vs `looksLikePath`) | 8,690 refused spans, **299 reach a door over 95 files — and 294 of the 299 are the same grep family** wearing a different instrument; the only genuinely new characters are `[` `]` at **5 spans** |
| **The widened denominator, honestly** | A∪A2 reach **106 distinct files**, of which **≥ 35 are reachable through NO spelling the shipping grammar yields anywhere in the corpus** (the shipping grammar's own reachable set is 405 files, refusal 8 ignored, so both numbers are conservative) |
| **The wrapped join** | VS Code's `isWrapped` walk **does not survive tmux**, structurally: the pane's xterm is a tmux client in the ALTERNATE buffer, which holds exactly the visible screen — **0 rows of a scrolled-off line remain in the buffer to join** (probe arm 3), and the copy-mode repaint a person scrolls with carries a flag that joins to garbage (arm 5). **The wrapped path stays refused.** |
| **The bare filename** | 8,828 slashless file-shaped occurrences over 994 distinct tokens; **328 (4.5% of the resolvable) match exactly one project file**, 124 match several, 93.8% match nothing; **the cheap design — join to the pane's base, no index, no new channel — reaches 272 occurrences over 42 files** |

**The one-sentence version:** the win the operator asked for is real and it is narrow — it is grep
output, tsc output, and `README.md` said bare — and all three are reachable as token-level grammar
widenings behind the existing doors, while VS Code's two structural mechanisms (the `isWrapped`
join and the workspace-search opener) do not survive tmux and refusal 6 respectively, and the
measurements below are why.

---

## 1. THE UPSTREAM, READ WITH FILE AND LINE

All references are `src/vs/workbench/contrib/terminalContrib/links/` at `770a9bce`.

### 1.1 The suffix table is one generated regex with three clauses

`browser/terminalLinkParsing.ts:44-135`, `generateLinkSuffixRegex`. The three clauses, verbatim in
intent (their own comments carry the worked examples and the issue numbers):

1. **`(?::|#| |['"],|, )ROW([:.]COL(?:-(?:ROWEND\.)?COLEND)?)?`** (`:93`) — `foo:339`, `foo:339:12`,
   `foo:339:12-789`, `foo:339.12`, `foo 339`, `foo 339:12`, `foo#339`, `foo, 339`, `"foo",339`.
2. **`['"]?(?:,? |: ?| on )lines? ROW(?:-ROWEND)?(?:,? (?:col(?:umn)?|characters?) COL(?:-COLEND)?)?`**
   (`:112`) — `"foo", line 339, col 12`, `'foo' on line 339`, OCaml's `lines 339-341, characters
   12-789`.
3. **`:? ?[\[\(]ROW(?:(?:, ?|:)COL)?[\]\)]`** (`:125`) — `foo(339)`, `foo(339,12)`, `foo (339, 12)`,
   `foo: [339]`, `foo(339:12)` — `()` and `[]` interchangeable.

Spaces in all three also accept the non-breaking space (`:132`). The path BEFORE a suffix is read
back to the nearest whitespace by `linkWithSuffixPathCharacters` (`:212`) — so a path with a space
in it is cut at the space even inside quotes; only the whole-line `fallbackMatchers` recover spaced
paths. A suffix immediately followed by `/` is skipped so git's numeric `1/` `2/` diff prefixes are
not read as line numbers (`:271-274`). A quote prefix is trimmed with a multi-quote heuristic
(`:283-313`), and a path containing an opening bracket is re-offered from past the bracket
(`:325-338` — NOT ported into the measurement; stated limit, it changes which of two overlapping
candidates wins and never whether one exists).

**Their own test rows are the table's ground truth**: `test/browser/terminalLinkParsing.test.ts:42-158`,
about 160 `ITestLink` rows covering every spelling above plus the non-breaking-space forms, and
`test/browser/terminalLocalLinkDetector.test.ts:113-160` (`supportedLinkFormats`, ~30 format
templates driven over every path shape). **The port in `build/p253/vscode-catches.mts` is proved on
24 of those rows** and on the `1/` skip.

### 1.2 The no-suffix path clause allows almost any character

`terminalLinkParsing.ts:345-363`. `unixLocalLinkClause` accepts any segment character EXCEPT
`\0 < > ? whitespace ! ` & * ( ) ' " : ; \` (the backslash exclusion is their catastrophic
backtracking guard, issue #24795, `:350`); a start additionally refuses `[` and `]`. The shipping
`SEGMENT` in `src/shared/path-spans.ts:91` is the allowlist `[A-Za-z0-9._@%+~$-]` — the two
grammars differ by `= , # ^ [ ] { } |` and every non-ASCII character. Git diff prefixes `a/ b/ c/ i/
o/ w/ 1/ 2/` are stripped when the line shape says diff (`:382-417`).

### 1.3 The wrapped join is an `isWrapped` walk with a small cap

`browser/terminalLinkDetectorAdapter.ts:61-89`. From the hovered row: walk UP while
`getLine(startLine)?.isWrapped`, walk DOWN while `getLine(endLine+1)?.isWrapped`, capped at
`ceil(max(detector.maxLinkLength, cols)/cols)` rows each side (500 for the local detector, so ~4
rows at 120 cols). The joined text is then `translateToString(true, 0, cols)` per row concatenated
(`terminalLinkHelpers.ts:139-154`), string indices converted back to buffer ranges by
`convertLinkRangeToBuffer` (`:21-124` — their wide-char arithmetic, the same problem our
`cellColumns` solves, solved by offset-walking instead of a map).

### 1.4 Resolution: candidates, one stat, a 10-second cache — and no security questions at all

`browser/terminalLocalLinkDetector.ts:112-136` builds the candidate list: an absolute, `~` or
`file://` spelling is its own candidate; otherwise, **if shell integration's CommandDetection is
live**, `updateLinkWithRelativeCwd` (`terminalLinkHelpers.ts:221-251`) joins the cwd RECORDED FOR
THAT LINE — with a clever common-directory ladder for `common/file` under `/home/common` — and
otherwise the raw relative text falls through to the resolver, which joins `initialCwd`
(`terminalLinkResolver.ts:146-152`). Candidates also get trailing `] " ' .` progressively trimmed
(`:138-158`). Every candidate is `stat`ed through the file service (`terminalLinkResolver.ts:107`),
first hit wins, answers cached **10 seconds** (`:164-170`). Caps: line length 2,000, **10 resolved
links per line**, 1,024 characters per link (`terminalLocalLinkDetector.ts:18-35`).

**What is NOT in their sequence is the part Tortie must not port.** There is no secret-name
question, no executable-bit question, no bundle question — because their openers never leave the
product: a file opens in an editor tab (`terminalLinkOpeners.ts:30-55`), a workspace folder reveals
in their explorer, an outside folder opens a new window. **VS Code's detection can be ported freely
precisely because Tortie's door sequence, not theirs, decides what a click does** — every new
spelling still ends at `decidePathDoor`, which never learns how a spelling was found.

### 1.5 The bare word falls back to a workspace SEARCH

`terminalWordLinkDetector.ts` splits on the configured word separators (max length 100, trailing
`:` trimmed) and offers EVERY word as a `Search` link. The opener
(`terminalLinkOpeners.ts:81-276`) then: strips `:<non-digits>` tails (Ruby `:in`, grep result
text, `:141`), a trailing period (`:148`), a workspace-folder-name prefix (`:150-157`); tries the
cwd-resolved join, then the raw text; `_getExactMatch` stats an absolute candidate, else runs a
workspace **file search with `maxResults: 2`** — one result opens **regardless of whether it is
exact**; two results and a relative link trigger a second `**/name` search and open only a UNIQUE
exact basename match (`:219-247`); and everything else falls back to
`quickAccess.show(text)` — Quick Open prefilled (`:177`). There is also a MULTI-LINE detector
(`terminalMultiLineLinkDetector.ts:28-44`) for ripgrep/eslint's two-line format — a bare `NN:col`
row scans UP for the nearest non-indented, non-wrapped line and treats it as the path.

### 1.6 Registration order and the caps worth keeping in mind

`terminalLinkManager.ts:82-87`: multiline, then local (both only when `enableFileLinks`, which has a
`notRemote` setting), then uri (max 2,048), then word. Lower-priority providers lose contested
spans, which is the same rule xterm gives Tortie's provider registered after `WebLinksAddon`.

---

## 2. MEASUREMENT A — THE SUFFIX TABLE OVER HIS PANES

`build/p253/vscode-catches.mts`, 38 of 39 live sessions ours (claude 14, codex 14, shell 10),
101,329 physical rows, every door answer from the SHIPPING `answerPathDoor`. For every
suffix-carrying link the ported VS Code parser reads out of a row, three outcomes against the
shipping grammar: ours yields the same path with the same line (**withLine**), the path without the
line (**pathOnly**), or nothing (**invisible**); the refused/lossy ones are then resolved (absolute
as themselves, relative against the pane's manifest base).

| suffix family (digits collapsed) | n | withLine | pathOnly | invisible | reach a door | distinct paths |
| --- | --- | --- | --- | --- | --- | --- |
| ` N` (bare space) | 4,783 | 0 | 190 | 4,593 | **17** | 428 |
| `:N:N` | 989 | 955 | 0 | 34 | 0 | 27 |
| `:N` | 331 | 170 | 1 | 160 | **114** | 98 |
| `(N,N)` | 23 | 0 | 0 | 23 | **23** | 3 |
| ` N.N` | 18 | 0 | 18 | 0 | 0 | 15 |
| `, N.N` | 15 | 0 | 15 | 0 | 0 | 1 |
| `[N]` | 4 | 0 | 0 | 4 | 0 | 1 |
| ` (N)`, ` N:N`, `, N` | 4 | 0 | 2 | 2 | 0 | 4 |

### 2.1 The `:N` invisible family IS GREP OUTPUT, and that is the finding of the whole table

114 of the 160 invisible `:N` spans resolve to a real file. Their digit-collapsed token shapes,
probed separately: overwhelmingly **`path:NN:text`** — a path, a line number, and the matched text
attached WITHOUT whitespace, which is exactly what `grep -n`, ripgrep's inline format and half the
build tools print. The shipping `stripDecoration` (`path-spans.ts:174`) anchors `:(\d+)` at the
TOKEN'S END, so a token carrying anything after the line number keeps its `:` into the segment test
and the whole token is refused. VS Code's suffix regex is GLOBAL over the row and reads `:12`
mid-token. The extension histogram of the resolving ones (`.mdx` 41, `.go` 26, `.ts` 16, `.txt` 7,
`.css` 7…) is a coding session's grep, not prose.

### 2.2 `(N,N)` is tsc's own error format, at 23 of 23

Every single `path(12,34)`-shaped span in the corpus resolves — they are TypeScript compiler
errors (`src/x.ts(12,34): error TS…`), 23 spans over 3 distinct files. The shipping grammar yields
nothing for them: CLOSE strips the trailing `:` and `)`, and the surviving `(` fails `SEGMENT`.

### 2.3 The bare space clause is the one to refuse, and the number says why

`path 339` admits **4,783 spans and 17 reach a door — 99.6% of what it admits is not a line
reference** (a count, a byte size, a quantity after a path). Worse, its failure mode is not a dead
link: 190 of those spans are paths ours ALREADY underlines (pathOnly), and adopting the clause
would attach a NUMBER THAT IS NOT A LINE to a link that works — `wrote docs/x.md 3` opening at
line 3. The verbal families (`"path", line N`, `on line N` — VS Code clause 2) are all pathOnly
here too: the shipping tokenizer strips the quotes and the comma, so the path underlines today and
only the landing line is lost, at 0 door-reaching spans that are refused outright. **Both clauses
are priced and not recommended.**

### 2.4 Slashless suffix carriers

30,670 suffix links whose "path" holds no `/` — `Makefile:12`, timestamps, versions. Of the
file-shaped ones, **22 resolve at a door against the pane's base**. They belong to measurement C.

---

## 3. MEASUREMENT A2 — THE SEGMENT GRAMMAR, AND IT MOSTLY COLLAPSES INTO A

VS Code's `unixLocalLinkClause`, run over the same rows: 23,188 slash-bearing matches (URLs and
fractions excluded), the shipping grammar already yields 14,498 (62.5%), refuses 8,690. Of the
refused, **299 reach a door over 95 distinct files** — but the characters that refused them tell
two different stories:

- **Refused characters over ALL refused spans**: `=` 284, `…` 231, `^` 54, `#` 37, `|` 32, `[` 18,
  `{` 15… — flag spellings (`--file=path`), the ellipsis Claude Code truncates with, box-drawing.
- **Refused characters over the DOOR-REACHING spans**: `(none: token boundary)` **294**, `[` 5,
  `]` 5. The 294 carry no refused character at all — they are the grep family again: VS Code's
  clause stops at `:` (excluded there), so it extracts `path` out of `path:12:text` where our
  tokenizer keeps the whole token. **The union of A and A2's door-reaching files is 106, the
  overlap 39 — one mechanism (read the grep suffix) closes most of both.**

The genuinely new grammar reach is `[` `]` in a segment — VS Code's own test rows carry
`/foo/[bar].baz` — worth **5 door-reaching spans** here, plus a long tail of zero: `=` reaches no
door (the flag prefix is part of their match and resolves nowhere), `…` reaches none (a truncated
path is not on disk), `{ } ^ # |` none.

**The widened denominator**: of the 106 union files, **35 are reachable through no spelling the
shipping grammar yields anywhere in the corpus** (checked against the grammar's own reachable set
of 405 files with refusal 8 ignored, so the 35 is a floor and the 405 a generous ceiling). The
`:N-M` range spelling (`path:12-14`) is its own one-line candidate and is worth exactly **2 spans**
here, both resolving.

---

## 4. MEASUREMENT B — THE WRAPPED JOIN DOES NOT SURVIVE TMUX, AND THE REASON IS STRUCTURAL

`build/p253/wrap-reflow-probe.mjs`: a scratch tmux server on `gmux-p253-<pid>` shaped like the app
(`status off`, `history-limit 25000` — the two lines of `resources/gmux-tmux.conf` that decide what
the client sees), a real `attach-session` client under node-pty, its bytes replayed into the
shipping `@xterm/xterm` with `resize` applied at the same point in the stream, five arms, **5 of 5
readings as expected over three consecutive runs**, everything ended and the socket unlinked in a
`finally`.

| arm | state of a wrapped path line | `isWrapped` | a VS Code flag-join recovers the path |
| --- | --- | --- | --- |
| 1 | LIVE, still on the visible screen | true | **true** |
| 2 | a FRESH ATTACH repainting the same screen (reload, restore) | true | **true** |
| 3 | scrolled OFF the visible screen | — | **the row is not in the buffer at all: 0 of 24** |
| 4 | after a RESIZE reflow (tmux repaints; the everyday gesture — opening an editor tab narrows the pane 144→78) | true on one row | **false — the joined string is not the path**, while tmux's own `-J` still joins it correctly |
| 5 | repainted by the COPY-MODE redraw a person scrolls with | true on one row | **false** (research 107 shape C, reproduced) |

**Arm 3 is the fact that ends the question, and it is not about the flag.** Tortie's pane is a tmux
client parked in the ALTERNATE buffer (`src/main/tmux/sessions.ts:297`,
`TerminalPane.tsx:20` — its own comments say so), so xterm's buffer holds exactly the visible
screen and the history lives in tmux. VS Code's walk works because its xterm OWNS the scrollback;
ours has no scrollback to walk. The only rows a join could ever help are wrapped lines still on the
visible screen (arms 1–2) — and arms 4–5 show that the two repaints those rows routinely pass
through leave flags that are PRESENT AND WRONG: a join produces a string that is not the path,
which fails closed at `lstat` in the ordinary case and, per research 111 §4.2's measurement, glues
into a REAL wrong file 39 times out of 57 when it does resolve. Research 114 measured tmux's own
`-J` confirming 18 of 57 joins that look right, and this probe adds that even where tmux still
knows (arm 4), the client-side flag does not.

**RECOMMENDATION: REFUSE, with the reason restated.** The wrapped path stays unreachable not
because a rule forbids it but because the fact needed to rejoin it does not exist on the renderer
side of tmux, and the main-side oracle (`capture-pane -J`) would need a new capture round trip per
hover against refusal 6 to recover at best a 32% -confirmable join. `path-spans.ts`'s header should
say "the buffer this grammar reads is the visible screen of a tmux client" in as many words, so the
next round does not re-derive arm 3.

---

## 5. MEASUREMENT C — THE BARE FILENAME, AND THE WORD-SHAPED TOKEN MEASURED

Slashless tokens matching a file grammar (a dot with a real extension and a lettered stem, or
`Makefile`/`Dockerfile`/`LICENSE`/`NOTICE`/`README`/`CHANGELOG`; versions and all-digit shapes
refused), resolved against each pane's own project file index (`git ls-files` basenames; 4 roots
indexed, 4 refused by the task's own list, those occurrences counted separately and not guessed):

| | occurrences | distinct tokens |
| --- | --- | --- |
| bare file-shaped tokens | 8,828 | 994 |
| resolvable against an index | 7,257 | |
| — EXACTLY ONE project file matches | **328 (4.5%)** | 117 |
| — SEVERAL match | 124 (1.7%) | 28 |
| — NONE match | 6,805 (93.8%) | 405 |

**The word-shaped-token risk, measured rather than waved at:**

- **Domain-shaped tokens** (`.com/.io/.ai/...` tails, the family that looks most like a false
  positive): 92 occurrences, **0 match any project file**. The index is the filter.
- **The oracle** (the same pane also prints the name behind a slash, so the text demonstrably
  means the file): 228 occurrences confirmed, 109 of them in the exactly-one class — a lower
  bound of real references, since a bare mention needs no slash twin.
- **The names behind the exactly-one class are manifest names**, counted by probe strings this
  document chose: `README.md` 126, `Makefile` 59, `package.json` 46, `CLAUDE.md` 32, `AGENTS.md`
  30, `CHANGELOG.md` 23, `BACKLOG.md` 12. Extensions: `.md` 104, `.ts` 52, `.json` 39, `.png` 27.
  These are files agents name bare many times an hour, and the semantic risk of opening "the
  project's README.md" on the token `README.md` is small by construction: a unique basename match
  IS the file of that name.

**The three designs, priced:**

| design | reaches | wrong-open cost | mechanism cost |
| --- | --- | --- | --- |
| **A. open the unique match** (VS Code's one-result behaviour) | 328 occurrences / 117 tokens | a mention that is not a reference still opens the only file of that name — bounded by uniqueness, 0 domain-shaped leaks; the door sequence still refuses secrets, executables, bundles | needs a basename index question in the hover path (the ⌘P worker owns `rg --files` already, `src/main/quickopen/index.ts`) — a field on an existing reply, not a channel, but it is main-side work and a second population in the cache |
| **A′. the CHEAP design: join the bare name to the pane's base** — grammar widening only, resolution exactly as lift two already resolves `docs/x.md` | **272 occurrences / 42 files** (153 of them also index-unique; 119 join-opens where the index says several-or-none — the join is DETERMINISTIC where a basename search is ambiguous: `README.md` beside `docs/README.md` joins to the root one) | same bound as A, minus the index's reach into subdirectories | **near zero**: `looksLikePath` admits a file-shaped bare token, `answerPathDoor` already joins, every refusal already applies; no new question, no new channel, no new fact |
| **B. Quick Open prefilled** (VS Code's true fallback) | one + several = 452 occurrences | none — a picker cannot open the wrong file | a click that opens a PICKER is a different gesture from every other link in the product; needs new wiring into the ⌘P palette; refusal 2's own words — a link that does not open the named thing is worse than no link — cut against it |
| **C. stay refused** | 0 | 0 | 0 — and it costs the 228 oracle-confirmed occurrences |

**RECOMMENDATION: ADOPT A′, THE CHEAP DESIGN, NARROWED.** It is 83% of design A's reach at a
fraction of its mechanism, it reuses lift two's join and lift two's measured base (right on 84.6%
of checkable spans, research 114 §4.3), and it is honest about ambiguity — a name that exists both
at the root and deeper opens the root one, which is what the spelling literally says under the
session's own base. Three narrowings, each with its number: (i) the FILE-SHAPED grammar above and
never "any word" — VS Code's word detector offers every word because its opener is a search; ours
opens files, so the grammar is the filter, and 6,805 of 7,257 occurrences (93.8%) never resolve
anyway; (ii) a name-resolved spelling carries `resolvedFrom` and therefore **never takes the Mac
door**, exactly as lift two's clause already refuses (`path-doors.ts:304`); (iii) domain-shaped
tails stay refused by nothing extra — the join's `lstat` already answers `missing` for all 92.
Design A (the index) is priced and not recommended now; if the operator wants nested bare names
later, the ⌘P worker is where the question goes.

---

## 6. WHAT TODAY'S FUNNEL SAYS OVER THIS CORPUS, so the additions have a baseline

`build/p250/funnel.mts` run in the same window (91,668 rows of the same live corpus): the grammar
yields 14,643 spans over 2,139 distinct targets; the composed Phase 250 state — which IS the
shipping code — reaches **4,411 spans over 422 distinct files, 99.8% of the 423-file ceiling the
funnel can see**. Research 114's headline (99.2% of files that are really there) reproduces at
99.8% here. **The ceiling is the thing this phase moves**: the funnel's denominator is what the
shipping grammar yields, and measurements A/A2/C are all OUTSIDE it — at least 35 suffix/segment
files and the bare-name families are invisible to the instrument that reads 99.8%. The build step's
funnel re-run must therefore publish the share over the WIDENED denominator (grammar ∪ ported
clauses ∪ bare file-shaped tokens), not over today's.

---

## 7. THE RECOMMENDATIONS, PER MECHANISM, WITH THE EXACT SPELLINGS

### 7.1 The suffix table — ADOPT, NARROWED TO THE DELIMITED CLAUSES, at token level

**What is adopted:** the grep spelling and the bracket spelling, as two widenings of the ONE
anchored regex `stripDecoration` and `looksLikePath` share, plus the range form:

- `src/shared/path-spans.ts:155,174` — the `lc` regex `/^(.*?):(\d+)(?::(\d+))?$/` widens to
  tolerate an attached remainder and a range:
  `/^(.*?):(\d+)(?:-\d+)?(?::(\d+)(?:-\d+)?)?(?::.*)?$/` — reading `path:12:text` as path+line 12
  (the 114-span grep family), `path:12:34:text` as path+line+col, and `path:12-14` as line 12 (2
  spans). The head must still contain `/` (or be file-shaped bare, §7.3), so `Makefile:12` follows
  §7.3's rule and a timestamp never enters.
- a second clause for tsc/brackets, asked only when the first does not match:
  `/^(.*?)[([](\d+)(?:[,:] ?(\d+))?[)\]]$/` — reading `path(12,34)`, `path(12)`, `path[12,34]`,
  `path(12:34)` (the 23-span tsc family plus the 4 `[N]` spans). NOTE the tokenizer's CLOSE strip
  runs first, so the token arrives as `path(12,34)` with the trailing `:` and sentence punctuation
  already gone; the OPEN strip does not fire because the token does not START with `(`.
- **the UNDERLINE must not cover the grep remainder**: today a span's `end` is the whole token's
  end, which is right for `path:12` and wrong for `path:12:text`. `stripDecoration` gains a
  `visible` length (target + the suffix as drawn) and `pathSpansInRow` trims `span.end` to
  `span.start + visible` before `cellColumns` is consulted, so the cell arithmetic Phase 247's fix
  round built keeps holding.
- **What is refused, with its price attached:** the bare space clause (` N`, `, N`, ` N.N`) at
  4,783 spans for 17 doors and a false-line risk on 190 working links; the verbal clause
  (`line N`, `on line N`, `characters N-M`) whose paths all underline today and which would need a
  ROW-level second pass for line numbers alone; the non-breaking-space variants (0 in corpus);
  the multi-quote prefix heuristic and the bracket re-offer (`:283-338`), which arbitrate overlaps
  the token grammar does not produce.
- **The ported test rows are the gate's**: the rows of `terminalLinkParsing.test.ts` that exercise
  the adopted clauses (the `:N`/`:N:N`/`(N,N)`/`[N,N]` families and the `1/` skip) go into
  `conformance:pathdoors` as a new rule driven against OUR `stripDecoration`, with attribution,
  and its ablation is each new clause taken back out.

### 7.2 The segment grammar — ADOPT `[` `]` ONLY

`SEGMENT` (`path-spans.ts:91`) gains `[` and `]`; every other refused character measured **0
door-reaching spans** and stays refused (`=` would also underline every `--flag=path`, which is a
flag, not a path). One interaction is load-bearing and the build step must decide it explicitly:
CLOSE strips a trailing `]`, so `/foo/[bar]` arrives as `/foo/[bar` — the tokenizer keeps a
trailing `]` only when the token holds an unmatched `[`, which is one balance test in
`tokensInRow` and is exactly the shape VS Code excludes at a path START and allows inside
(`ExcludedStartPathCharactersClause`, `:351`). Worth 5 spans today; it is adopted because the
bracket TEST ROWS come free with 7.1's port and the risk is nil behind `lstat`.

### 7.3 The bare filename — ADOPT THE CHEAP DESIGN (§5), grammar-only

- `looksLikePath` (`path-spans.ts:152`) admits a slashless token when it is FILE-SHAPED: at least
  one `.` with a 1–8 character lettered extension and a lettered stem, or one of the six specials —
  the grammar this measurement shipped in `bareFileShaped`, with its self-test rows. Versions,
  all-digit shapes and bare words stay refused: **a token with no separator and no extension is a
  word**, which keeps research 114 §5.3's rule for everything that is not visibly a filename.
- resolution changes NOTHING: the token is relative, `couldBeAsked` already gates on a usable base,
  `answerPathDoor` already joins and already stamps `resolvedFrom`, so containment applies and the
  Mac door is already refused for it. **The door and `path-links.ts` need no change for this
  mechanism**; the one renderer-side note is the cache — the CORPUS-WIDE distinct-key population grows from
  2,139 to about 3,100, but the cache is one Map per pane and research 111's busiest single pane
  held 460 distinct targets against a `CACHE_MAX` of 2,048; the build step re-checks the busiest
  pane the way research 114 §7 asked, now with the bare names in the population.
- the priced-not-recommended half: the index-unique design (nested bare names, +56 occurrences
  over the join) and Quick Open prefill. Both are his to ask for with these numbers in front of
  him.

### 7.4 The wrapped join — REFUSE (§4), and write the alternate-buffer fact into the grammar's header

### 7.5 The multi-line detector (ripgrep's two-line format) — NOT ADOPTED, unmeasured

It needs the provider to scan UP through rows on every hover of a `NN:` line and to trust that the
path header is still on the visible screen (§4's alternate buffer bounds it the same way). Zero
instances were counted because the measurement did not look for it; it is named here so a later
round measures before it builds.

---

## 8. WHAT IS NOT MEASURED, STATED RATHER THAN HIDDEN

- **Eleven of the fourteen registry agents**, as in research 107/111/114 — claude, codex and shell
  were running.
- **The corpus is live**: runs read 91,574 → 101,329 rows over the session; every share held to
  within half a point, absolute counts moved by units. run5 is quoted throughout.
- **Four of the eight project roots were never indexed** (the task's refusal list), so measurement
  C's resolvable denominator is 7,257 of 8,828; the 1,571 unindexed occurrences are counted, not
  guessed.
- **The A/A2 door counts resolve RELATIVE candidates against the pane's single manifest base**, as
  lift two does; a grep line printed under a different cwd resolves to nothing here and is
  undercounted, not overcounted.
- **The bracket re-offer and multi-quote-prefix upstream behaviours were not ported** into the
  instrument; both arbitrate overlapping candidates and neither creates a family this corpus holds.
- **Whether he would CLICK any of it** — the same caveat every document in this line carries.
- **The multi-line (ripgrep two-line) format** — read, not counted (§7.5).
- **No behaviour of the running app** — no Electron was launched; every door answer is the shipping
  sequence under node. The build step owns the app run, at the parent and at HEAD, per the entry.
- **VS Code's shell-integration cwd-per-line** (OSC 633/7) is out of scope by the entry's own
  refusal and nothing here depends on it.

---

## 9. THE RECOMMENDATION IN FIVE LINES

1. **Port the delimited suffix clauses** (grep `path:NN[:CC]:text`, ranges, tsc `path(NN,NN)`,
   brackets) into the ONE anchored regex `stripDecoration` and `looksLikePath` share, with VS
   Code's own test rows in the gate — worth ~139 door-reaching spans today, concentrated exactly
   where a coding agent points at code. **Refuse the space and verbal clauses**, 4,800 spans of
   noise for 17 doors and a false-line risk on working links.
2. **Add `[` `]` to SEGMENT** with the balance rule in `tokensInRow` — 5 spans, free with 1's rows.
3. **Admit bare FILE-SHAPED names to the grammar and let lift two's join resolve them** — 272
   occurrences over 42 files for near-zero mechanism; the index and the picker are priced, not
   recommended.
4. **The wrapped join stays refused**: the pane's xterm is a tmux client in the alternate buffer
   and holds no scrollback to join; the flag survives only on live on-screen rows and joins to
   garbage after the reflow and copy-mode repaints everything else passes through.
5. **Every new spelling still ends at `decidePathDoor`** — VS Code's detection is portable
   precisely because its openers never leave its product and ours already refuse what could run;
   the funnel re-run publishes before/after over the WIDENED denominator, and the 107 refusals are
   untouched.
