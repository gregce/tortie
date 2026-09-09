# 107 — can a path be found in a transcript at all?

Phase 245's measure step, 2026-09-08, at `ec6fe137`, Tortie 0.101.0, tmux 3.6a, `@xterm/xterm`
6.0.0, `@xterm/addon-web-links` 0.12.0.

It builds nothing. Two scripts are kept because a later round would really re-run them,
`build/p245/corpus-scan.mjs` and `build/p245/wrap-probe.mjs`, and everything else was thrown away.
No Electron was launched. No agent was spawned and no token was spent. The operator's 20 live
sessions on `-L gmux` were LISTED and CAPTURED and nothing else — never attached, never sent a key,
never killed — and they were 20 before and 20 after. The one filesystem call this measurement makes
is `lstat`, on absolute candidates only, under a refusal list; **no path read out of a transcript
was opened, executed or written to.** Every count below is a count, a rate or a shape: no path out
of the operator's transcripts is quoted, because a transcript can hold anything.

---

## THE ANSWER IN FOUR NUMBERS

| | |
| --- | --- |
| **Hit rate (recall)** of the only policy with an acceptable false positive rate | **37.5%** of the real path references a person would want to click |
| **False positive rate** of the generous detector — the one that would reach the other 62.5% | **40.0%** |
| **False positive rate** of the conservative policy | **0 of 45** hand-marked, and **4.3%** measured mechanically over all 1,560 of them |
| **Wrap rate** | **6.3%** of real path occurrences are split across rows, and **the wrap flag xterm would need to rejoin them is absent in the two cases that matter** |

Every count in this document comes from ONE capture, taken at 00:25 on 2026-09-08. The sessions are
live and kept producing output, so `build/p245/corpus-scan.mjs` re-run against them today reads a
few tenths of a percent differently and reads a twentieth session that did not exist then. The
conclusions do not move; the third decimal place does.

**It is viable, and only in one narrow shape.** A link provider that offers ABSOLUTE paths that are
really on this disk, inside an open project, is worth building. A link provider that tries to reach
relative paths, or to rejoin wrapped ones, is not: it underlines the wrong span two times in five,
and the machinery that would rejoin a wrapped URL cannot see a wrapped path.

**And that narrow shape does not make the path in the issue clickable**, for two reasons that are
both the product's own standing rules rather than oversights. Section 11 says so plainly and names
the one widening that would, without recommending it.

---

## 1. The corpus

`tmux -L gmux list-sessions`, then `capture-pane -p -S -` per session. A session with no
`@gmux-agent` option is not ours and was skipped, which is why 19 of the 20 are here.

| agent | sessions | physical rows | path-shaped tokens |
| --- | --- | --- | --- |
| claude | 5 | 39,812 | 4,726 |
| codex | 10 | 8,106 | 1,280 |
| shell | 4 | 772 | 128 |
| **total** | **19** | **48,690** | **6,134** |

**The corpus covers 3 of the 14 agents in the registry**, because those are the three that were
running. cursor, gemini, droid, deepseek, antigravity, muse, qwen, pi, omp, grok and the two IDE
rows are UNMEASURED, and this document claims nothing about them. The two shapes section 4 measures
are shapes of TUI rather than shapes of vendor, so the finding should carry; that is an inference
and it is labelled as one.

**Paths outnumber URLs 28 to 1.** 6,134 path-shaped tokens against **222** `http(s)` URLs, and the
URLs are the only ones clickable today. Whatever else this document says, the gesture is aimed at
the right thing.

---

## 2. What a transcript really produces, counted

Over the 6,134 path-shaped tokens:

| | count | share |
| --- | --- | --- |
| relative to a cwd the terminal does not know | 3,500 | **57.1%** |
| absolute | 2,634 | 42.9% |
| decorated (`~`, `file://`, a `:line[:col]` suffix) | 188 | 3.1% |
| — of which a `:line` or `:line:col` suffix | 128 | 2.1% |
| — of which `~` | 53 | 0.9% |
| — of which `file://` | 7 | 0.1% |
| a markdown file | 836 | 13.6% |
| **an image, which is what the issue asked for** | **69** | **1.1%** |
| a path under a root this Mac does not have (`/root/…`, `/home/…`) | 61 | 1.0% |
| a credential-shaped file (`auth.json`, `.env`, a key) | 3 | 0.05% |

Of the 2,634 absolute candidates, **1,027 (39.0%) are not there** — truncated fragments, paths on
other machines, and files that have since been deleted. Of the 1,607 that are there: 1,225
directories, 267 files, 68 symlinks.

**Two of those rows change what should be built.** The issue is about an image and images are 1.1%
of the surface; markdown is twelve times more common, and a source file more common still. And a
transcript names credential files, so a link that opens whatever it is pointed at will one day open
the operator's `auth.json` in an editor tab.

---

## 3. The hit rate and the false positive rate

### 3.1 How ground truth was decided

Two detectors were written by different methods so that where they disagree there is something to
look at. **A** is a maximal-run regex over the whole line, the generous shape an emulator reaches
for first. **B** tokenises on whitespace, strips the decoration a person's eye strips for free, and
judges each token against a segment grammar. A found 7,708 spans and B found 6,134; by distinct span
text they share 1,424, A alone holds 641 and B alone holds 289. Every disagreement family was read,
and the two are not one instrument: A's extra 641 are almost entirely URL remnants and wrap
fragments, B's extra 289 are almost entirely `:line`-suffixed paths that A splits in two.

200 detector-B spans were then drawn at random from the whole corpus with a fixed seed and
**adjudicated by hand**, each with 28 characters of context on the left and 22 on the right, into
four classes:

- **a real reference** — a path a person could sensibly click
- **not a path** — the span is something else entirely
- **truncated** — a real path, but the underlined span is a FRAGMENT of it
- **a path on another machine** — real, and not on this disk

### 3.2 The result

| | n = 200 |
| --- | --- |
| a real reference | 120 — **precision 60.0%** |
| not a path | 40 |
| truncated | 35 |
| ambiguous | 4 |
| a path on another machine | 1 |
| | **false positive rate 40.0%** |

**Nearly half the false positives — 35 of 80 — are wrap artefacts**, spans that are the head or the
tail of a path the terminal or the agent broke across two rows. The rest fall into families that are
worth naming, because each is a thing a provider would have to refuse by hand and none of them can
be told from a path by shape alone:

| family | what it looks like |
| --- | --- |
| slash commands | `/login`, `/model`, `/status` — an agent's own prompt, and common |
| git refs | `origin/main`, `HEAD..origin/main` |
| timezones | `America/Chicago`, printed 6 times in one table |
| markup and code | `</p>`, `/>` in JSX, `//` opening a comment |
| regex and sed | `/^###`, `s/a/b/`, an address in `sed -i` |
| package and repo names | `@neondatabase/serverless`, `gregce/as-built-architecture` |
| rates and money | `$59.99/mo`, `143.2 files/s`, `171/383` |
| diff prefixes | `a/src/components/board.tsx` — the real path is the span minus two characters |

### 3.3 The one policy with an acceptable false positive rate

Offer a span only when, after `~`, `file://` and a `:line[:col]` suffix are stripped, it is
**absolute**, names **at least one segment**, and **`lstat` says something is there**.

| | |
| --- | --- |
| spans offered, of the 200 sampled | 45 |
| false positives among them | **0** |
| hit rate over the 120 hand-marked real references | **37.5%** |

Zero of 45 is not zero. The rule of three puts the 95% upper bound on the true false positive rate
at about **6.7%**, and the mechanical measurement in section 3.4 lands inside that.

### 3.4 The conservative policy's own false positive, measured over all of it

Over the whole corpus the policy offers **1,560 spans**, 25.4% of the path-shaped tokens. **67 of
them (4.3%) end exactly at a row boundary that the next row continues with a path character.** Those
are the ones that survive the existence check by accident: the truncated head happens to be a real
directory, so clicking opens the parent folder instead of the file the agent named. A further 81
(5.2%) begin at the head of a row whose predecessor ends in a path character, which is the other
half of the same split; that test is looser and 5.2% is an upper bound rather than a reading.

**So the honest number for the conservative policy is a false positive rate of about 4%, and every
one of those four is a wrap artefact.** It has no other failure mode in this corpus.

---

## 4. THE WRAP, AND IT IS THE FINDING THAT DECIDES THE SHAPE

`build/p245/wrap-probe.mjs` starts a tmux server of its own on `gmux-p245-<pid>`, attaches a real
`tmux attach-session` client under a real pty at 60 columns, and feeds the client's own bytes into
the **shipping `@xterm/xterm` 6.0.0** from `node_modules`, driven headless under node behind a
44-line DOM shim (`build/p245/dom-shim.mjs`; xterm's buffer, its wrap flag and its link providers
are all DOM free, and only `Terminal.open()` needs a document, which nothing here calls). It reads
`isWrapped` off the real buffer rather than off a model of one. Seven readings, all seven as
expected, stable over three runs, and it ends its pty, its server and its socket file in a
`finally`.

`@xterm/addon-web-links` already knows how to rejoin a split link: `LinkComputer.computeLink` walks
UP and DOWN from the hovered row, joining lines, and **it decides which rows to join by asking each
one `isWrapped`.** So the whole question is whether a path arrives in xterm's buffer as wrapped
lines.

| shape | `isWrapped` on the continuation row |
| --- | --- |
| **A** — one long line let out at the pane width, which is what a shell and Claude Code's prose produce | **true** |
| **B** — the PROGRAM breaks the path at its own width and puts its own gutter on the next row, which is what Codex's TUI does | **false** |
| **C** — shape A, then scrolled back into view the way Tortie scrolls | **false** |

**Shape B is the issue's own screenshot.** Codex writes each visual row itself and never lets the
terminal wrap, and the corpus proves it independently. `capture-pane -J` joins wrapped lines, so the
difference between a joined and an unjoined capture is exactly the number of rows tmux thinks were
wrapped:

| | rows | joined | rows tmux calls wrapped |
| --- | --- | --- | --- |
| the ten codex panes | 8,096 | 8,090 | **6, and all six are in one pane** |
| the five claude panes | 39,807 | 32,932 | **6,875** |

(The row counts here are `wc -l` and section 1's are a split on newline, so they differ by one per
pane; nothing else separates them.)

**Nine of the ten codex panes collapse by nothing at all.** Codex's continuation row also carries a
gutter — a box character and a space — so even joining two rows blindly produces a string with the
gutter buried in the middle of the path.

**Shape C is worse, because it is the gesture the person actually makes.** Tortie scrolls with tmux
`copy-mode` (`src/main/tmux/scroll.ts`, and `goto-line` since Phase 13.7), and copy-mode REDRAWS the
visible rows. A wrapped line scrolled back into view is painted afresh, row by row, and the flag is
gone. Measured in one terminal fed every byte the client ever wrote, live output first and the
redraw over it: the line's continuation row read `isWrapped=true` while it was live and
`isWrapped=false` after it was scrolled back. **Wanting to click a path an agent printed a minute
ago means scrolling to it, and scrolling to it is what destroys the only signal that could rejoin
it.**

So: **6.3% of real path occurrences are split across rows** (105 of 1,665, measured by finding paths
that `lstat` confirms and that appear in no single row but do appear when two adjacent rows are
glued with the gutter stripped — a LOWER bound, since it cannot see a path split three ways or one
whose glued form still does not exist). And of those 105, the number a per-line provider using
xterm's own wrap machinery could rejoin is **the claude share only, and only while the line is still
live**.

---

## 5. What `registerLinkProvider` actually gives you

Read out of `node_modules/@xterm/xterm/typings/xterm.d.ts` and the bundled `lib/xterm.js`, and
exercised in the probe.

**It is not called on every render.** The charter assumed it was, and that is worth correcting
before anybody prices it. `Linkifier._askForLink` is driven from `_handleMouseMove` →
`_handleHover`, and it fires only when the buffer cell under the pointer changes. A pane nobody is
pointing at asks nothing. Measured cost of one `provideLinks` call over a 5,001-line buffer of
realistic agent output at 120 columns: **0.0031 to 0.0047 ms**. Even at a pointer crossing a full
row it is under a tenth of a millisecond per row. **Cost is not the constraint here and nothing in
this document is limited by it.**

**Two providers can disagree, and registration order decides.** `_removeIntersectingLinks` walks the
providers in registration order and drops any link whose columns a lower-indexed provider already
claimed. `_checkLinkProviderResult` also refuses to promote a link while any earlier provider is
still outstanding. xterm registers its own `OscLinkProvider` (OSC 8 hyperlinks) first;
`WebLinksAddon` is registered by `TerminalPane.tsx:359`; anything added after would lose every
contested span to both. **This is a feature and it settles a design question for free**: a path
provider registered LAST can never steal a span from a URL that web-links already matched, which
removes the whole `//host/path` family from the false positive list.

**The shipping addon cannot be extended to a path by its options.** `ILinkProviderOptions` offers
`urlRegex`, and it looks like the extension point. It is not: `LinkComputer.computeLink` passes
every match through an `isUrl()` that calls `new URL(text)` and requires the string to start with
the parsed origin, so a bare `/private/tmp/a/b.png` is thrown away whatever regex found it. Measured:
the addon handed `/(?:\/[A-Za-z0-9._-]+)+` and pointed at a real path row returns **0 links**, while
the unmodified addon over a wrapped `https://` URL returns **1 link spanning two rows**. A `file://`
URL would pass `isUrl` — but `EXTERNAL_URL` in `src/main/security/trusted-window.ts:60` is
`/^https?:/i`, so a `file://` link that reached `window.open` is denied and opens nothing today.

`LinkComputer` and `WebLinkProvider` are **not exported** from the addon's built entry or its
typings — `exports.WebLinksAddon` is the whole public surface. So reusing its wrap-rejoining walk
means vendoring an MIT extract, which is what CLAUDE.md's "assemble, never reimplement" asks for
anyway. Given section 4, there is very little reason to want it.

---

## 6. What a click should do, per kind, and who already owns the decision

**Tortie already decides what a path means, in one place, for the drop gesture, and the module is
`src/main/drop/prepare.ts`.** `preparePaths` takes a path, stats it once, and answers
`kind: 'file' | 'dir' | 'missing'` plus `isImage` — and `isImage` is a **magic-byte sniff of the
file's head**, not an extension guess (`sniffImage` in `src/main/drop/store.ts`). It is reached over
the `drop:prepare` channel. **That is the owner a click must reuse**, and reusing it means the
renderer never guesses a kind, exactly as `attachPaths` in `src/renderer/terminal/drop/pipeline.ts`
never does.

The second half of the routing already exists too: `src/renderer/editor/store.ts:481` asks
`isImagePath` from `@shared/image-types` and sends an open request to the image surface rather than
Monaco. So the surfaces and the router are both there.

| kind | where the click should land | why |
| --- | --- | --- |
| an image inside an open project | Tortie's own image surface | it exists, it is already what a tree row does, and it keeps the person in the window; the issue asked for "browser or Preview" and Preview is a worse answer than the surface already built |
| a source or text file inside an open project | an editor tab | the same place every other open in Tortie lands |
| a markdown file inside an open project | the markdown preview | 13.6% of the surface, and the biggest single win |
| a directory inside an open project | reveal it in the Explorer | never a new project tab: a click is not a decision to add a project |
| **anything outside every open project** | **it is never a link at all** | section 7, refusal 2 |
| an `http(s)` URL | unchanged — `WebLinksAddon` already has it | |
| a `file://` URL | treat the path inside it as a path, subject to every rule above | it is denied today and opens nothing |
| a path on another machine | **nothing** | section 8 |
| a path that is not there | **it is never underlined**, because `lstat` is the offer condition | a link that does nothing is worse than no link |

---

## 7. What must not happen, priced against Phase 23

**`shell.openPath` on a string out of a terminal buffer is a capability, and it should be refused.**

The reason is not squeamishness, it is the boundary CLAUDE.md already draws:
*Configuration selects from choices the compiled world already contains, or names an executable the
user has personally confirmed.* A terminal buffer is not configuration at all. It is a stream an
agent writes, and an agent under `--dangerously-skip-permissions` writes whatever it likes into it.
`shell.openPath` hands that string to LaunchServices, which chooses a program by extension and runs
it. A `.command`, a `.app`, a `.webloc`, a `.terminal` or a `.scpt` named on one line of output
would become one click from executing. **Refusal 8 — nothing may cause a process to start on a
configuration change alone — is the same shape and the same argument, and this would be a worse
version of it, because there is no human confirming any bytes anywhere.**

The tree's Open With row is not a precedent for it. `src/main/fs/open-with.ts` takes a path the
person picked out of a tree that Tortie itself drew, and it still runs it through
`resolveOpenProjectRoot` and `resolveInsideRoot` from `src/main/fs/paths.ts` and refuses any root
that is not an open project. **Every filesystem action in Tortie is confined to an open project
root, and there is no channel today that opens an arbitrary path in the operating system.** The
three `shell.openPath` calls in main open directories Tortie itself created — the config guide, the
log directory and the migration notice.

So the refusals, written as refusals so a later phase inherits them:

1. **A click never runs anything.** No `shell.openPath`, no `shell.openExternal` on a path, no Open
   With, no LaunchServices. Opening is not executing and this line stays bright.
2. **A click never reaches outside every open project.** The span may be underlined only when it
   resolves inside a root `listProjectRoots()` returns, through the same
   `resolveOpenProjectRoot` / `resolveInsideRoot` gate the tree and Open With already use. Outside
   it, the span is not a link at all — not a link that refuses, a span that was never offered.
3. **A click never opens a path that is not there.** `lstat` is the offer condition, so a path an
   agent invented is never underlined.
4. **A path is never underlined without the person pointing at it.** xterm's providers are
   hover-driven and this keeps them that way; nothing is decorated on the resting face. That is also
   what stops a transcript full of one repeated `cd` — 528 of them to a single project root in this
   corpus — from reading as hyperlink soup.
5. **No new IPC channel that takes a path and does something with it.** The existing
   `drop:prepare` answers the kind and the editor store already routes; a version one that needs a
   new channel has grown past what this measurement supports.
6. **Refusal 2 is what keeps a credential out of an editor tab.** `~/.codex/auth.json` appears in
   this corpus and is outside every project root, so rule 2 covers it without a special case; a
   later round must not weaken rule 2 and then reach for one.

---

## 8. The remote case, and it is the third instance of the Phase 235 bug waiting to happen

**Both homes are `/Users/gdc`.** A path in a session on the Mac Pro reads exactly like a path on
this Mac, and `lstat` on this Mac will happily confirm a file with the same name in the same place —
a different file. Phase 235 fixed this class twice, on Reveal for a remote tab and on the image
surface's Reveal, and a link provider that ran the same rules on a remote pane would be the third.

**It cannot be told from a local one by looking at the text.** It can be told from the SESSION:
`session.machine !== undefined` is what `attachPaths` already branches on
(`src/renderer/terminal/drop/pipeline.ts`), and the pane knows which session it is.

**So the rule is: a pane whose session runs on another machine offers no path links at all.** Not a
link that fails, no underline. The corpus cannot measure this — every session in it is local — but
61 tokens under `/root/`, `/home/` and `/workspace/` are already in it from containers and CI logs,
so the foreign-path family exists even with no remote session anywhere near.

---

## 9. The relative half, and why it is refused rather than deferred

57.1% of path-shaped tokens are relative, and they are the majority of what an agent writes when it
names a file it just touched. Reaching them is the whole difference between a 37.5% hit rate and a
good one. It is still refused, for a reason that is structural rather than a matter of effort.

**A scrollback line has no cwd.** tmux can answer `#{pane_current_path}`, but that is the cwd NOW.
A line printed an hour ago was printed under whatever the cwd was then, and in this corpus the cwd
moves: **555 `cd` commands to 11 distinct absolute targets** across the nineteen panes, 528 of them
to one project root and 27 of them somewhere else.

**And the operator's own workflow makes the wrong answer plausible rather than obviously wrong.**
This corpus holds **435 mentions of `git worktree`**. A worktree is a second complete copy of the
project, so a relative name resolves under both roots and both files exist. Measured on this Mac
right now, against the project root and three worktree paths named in the transcripts:

| the relative name | live roots that resolve it |
| --- | --- |
| `docs/BACKLOG.md` | 2 of 4 |
| `docs/research` | 2 of 4 |
| `package.json` | 2 of 4 |
| `CLAUDE.md` | 2 of 4 |
| `scripts` | 2 of 4 |
| `src/app` | 0 of 4 |

**Five of six common relative names resolve under more than one live root.** A provider that picked
one would open the right filename in the wrong tree, silently, and the person would edit a file that
is not the file the agent wrote. That is worse than not offering the link.

---

## 10. Does it serve the agentic workflow?

The scope guardrail's own test, and it splits.

**Yes, for one case, and it is the strongest case there is.** An agent names a file it just wrote,
and the person wants to look at it. That is the loop Tortie exists for, it happens many times an
hour, and today the only way through it is to read the path off the screen and retype it in the
Explorer. Paths outnumber URLs in a real transcript 28 to 1 and URLs are the ones that are
clickable.

**No, for the rest of it.** Rejoining wrapped paths, resolving relative ones, handling remote panes,
opening things in the operating system, a preference for which app opens what — every one of those
is there because terminals have it, and each buys a slice of the remaining 62.5% at a cost measured
above in wrong spans, wrong files and a capability this product refuses.

---

## 11. The recommendation

### Version one, small enough to be obviously right

**One additional xterm link provider, registered AFTER `WebLinksAddon` so it can never take a span
from a URL, offering a link only when all of these hold:**

1. the session runs on THIS Mac (`session.machine === undefined`);
2. the span, after `~`, `file://` and a `:line[:col]` suffix are stripped, is **absolute** and names
   at least one segment;
3. it resolves **inside an open project root**, through `resolveOpenProjectRoot` and
   `resolveInsideRoot` in `src/main/fs/paths.ts` — the same gate the tree and Open With use;
4. it is **really there**, and `src/main/drop/prepare.ts` is what says so and what says what it is;
5. the span does **not** touch either end of its row.

**A click routes through the surfaces Tortie already has**, by the kind `prepare.ts` answered:
image → the image surface, markdown → the markdown preview, other file → an editor tab, directory →
reveal in the Explorer. A `:line` suffix, when present, is the line to scroll to.

Rule 5 is the cheap answer to section 4 and it costs the 4.3% measured in section 3.4. It is also
honest in a way rejoining would not be: a span that runs off the edge of a row is a span whose end
we do not know.

### What it deliberately does not do

No relative paths. No rejoining across rows. No remote panes. No `shell.openPath` and no Open With.
No new IPC channel. No underline until the pointer is on it. No decoration on the resting face.

### AND IT DOES NOT FIX THE SCREENSHOT IN THE ISSUE, which has to be said plainly

Jake's path is `[image] /private/tmp/claude-501/…/test-pattern-1440.png` in a **Codex** pane. Version
one fails it twice over:

- **it is outside every open project root**, so refusal 2 refuses it — and not as an oversight. The
  same rule refuses it in `src/main/preview/protocol.ts`, which is READ ONLY, resolves the leaf's
  real path first so a symlink cannot spell its way out, and still answers `outside-root`. The
  containment rule in this codebase is not about writes; it is about every path.
- **it is wrapped in a pane whose wrap flag is false**, so rule 5 refuses the truncated span even if
  the first objection went away.

So the honest report to him is that the narrow provider makes an agent's own project files
clickable, and does not make a screenshot under `/private/tmp` clickable. **The one change that
would, and it is his call rather than this document's:** allow an IMAGE, and only an image, outside
every project root to open in Tortie's own image surface, on the argument that decoding bytes in a
sandboxed renderer starts no process and runs nothing, which is a materially weaker capability than
`shell.openPath`. It is still a widening of a rule this codebase applies everywhere else, it is
worth about **69 tokens in 6,134** in this corpus, and it would need its own refusals — a size cap,
the leaf's real path resolved before the read, and the `canPreviewPath` extension gate — before it
could be written down as a recommendation. It is not one here.

### What the second step would be, if the first proves out

**Relative paths anchored to a project, and only when the answer is unambiguous.** Resolve a
relative span against the session's project root, offer the link only when **exactly one** open
project root resolves it and no live worktree under that root does. Section 9's table is the test it
has to pass, and it will fail it on this Mac today — which is the point of making it a second step
with its own measurement rather than a widening of the first.

### If the honest answer had been nothing, this document would say so

It is not nothing. It is one narrow provider with a measured 0-of-45 hand-marked and 4.3% mechanical
false positive rate, reaching 37.5% of what a person would want, in the one case the product exists
for. Everything past that is worse than the thing it replaces, and the numbers above are why.

---

## 12. What is unmeasured, stated rather than hidden

- **Eleven of the fourteen registry agents.** Only claude, codex and shell were running.
- **Every remote path.** No session in the corpus runs on another machine; section 8 is reasoned
  from Phase 235 and from `pipeline.ts`, not measured.
- **The relative resolution rate.** It was refused deliberately: measuring it means reading inside
  the operator's own repositories, and section 9's six-name table is the bounded version that makes
  the ambiguity a measurement instead of an inference.
- **What a person would actually click.** The 200-span adjudication asks "is this a real path
  reference", not "would he click it". Those are not the same question and only he can answer the
  second.
- **The `head-of-row` figure, 5.2%.** It is an upper bound on the tail half of a split span, not a
  reading; the `end-of-row` figure, 4.3%, is the reading.
- **The 200-span adjudication is one person's reading**, not two independent ones. The four classes
  were fixed before the sample was drawn and the draw is seeded, so it can be re-drawn and re-marked;
  it has not been.
