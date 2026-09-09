# 107 — can a path be found in a transcript, and what should a click do with one?

Phase 245, 2026-09-08 and 2026-09-09, at `ec6fe137`, Tortie 0.101.0, tmux 3.6a, `@xterm/xterm`
6.0.0, `@xterm/addon-web-links` 0.12.0.

**Sections 1 to 5 are the measure step**, which asked whether a path can be FOUND at all and what
xterm's link API gives you. **Sections 6 to 13 answer what a click should DO**, and they correct the
measure step's own draft in four places where re-deriving a claim against the source refuted it: what
Tortie's existing path rules really are (section 6), what the offer set really contains (section 7),
why the issue's path is refused (section 12), and the denominator of the false positive rate
(section 3.5). Where a number moved, both readings are here.

It builds nothing. Three scripts are kept because a later round would really re-run them,
`build/p245/corpus-scan.mjs`, `build/p245/wrap-probe.mjs` and `build/p245/root-cost.mjs`, and
everything else was thrown away. `corpus-scan.mjs` gained a main-module guard so its detectors can be
imported without a capture running as a side effect, and it prints exactly what it printed before;
`wrap-probe.mjs` gained the two readings of section 4.1. No Electron was launched. No agent was
spawned and no token was spent. The operator's live sessions on `-L gmux` were LISTED and CAPTURED and
nothing else — never attached, never sent a key, never killed — and they were 21 before the second
round's runs and 21 after. The manifest was read from a COPY, never opened in place, to answer which
folders are open projects. The only filesystem calls anywhere in this work are `lstat` and `realpath`,
both metadata only, on absolute candidates under a refusal list; **no path read out of a transcript
was opened, executed or written to.** Every count below is a count, a rate or a shape: no path out of
the operator's transcripts is quoted, because a transcript can hold anything.

---

## THE ANSWER IN FOUR NUMBERS

| | |
| --- | --- |
| **Hit rate (recall)** of the only policy with an acceptable false positive rate | **37.5%** of the real path references a person would want to click |
| **False positive rate** of the generous detector — the one that would reach the other 62.5% | **40.0%** |
| **False positive rate** of the conservative policy | **0 of 45** hand-marked, and **4.2%** measured mechanically over all 1,293 spans the policy really offers (section 3.5 corrects the denominator) |
| **Wrap rate** | **6.3%** of real path occurrences are split across rows, and **the wrap flag xterm would need to rejoin them is absent in the two cases that matter** |

There are TWO captures. Sections 1 to 4 come from the first, at 00:25 on 2026-09-08, over 19 sessions
and 48,690 rows. Sections 3.5 and 7 come from the second, later the same night, over 20 sessions and
44,435 rows. The sessions are live, they kept producing output and scrollback rolls, so every rate
agrees to a few tenths of a percent and no conclusion moves — which is the stability reading the
measure step promised, taken rather than asserted. The third decimal place moves; nothing else does.

**One number in this table is the whole recommendation and it is not in it.** Of the 1,293 spans the
policy offers, **153 — 11.8%, standing behind 43 distinct files — are a FILE inside an open project
root**, which is the only shape with a destination that exists. The rest are directories, which Tortie
has nowhere to put. Section 7 is that measurement.

**It is viable, and only in one narrow shape.** A link provider that offers ABSOLUTE paths that are
really on this disk, inside an open project, is worth building. A link provider that tries to reach
relative paths, or to rejoin wrapped ones, is not: it underlines the wrong span two times in five,
and the machinery that would rejoin a wrapped URL cannot see a wrapped path.

**And that narrow shape does not make the path in the issue clickable.** The measure step gave two
reasons and section 12 refutes one of them: the root rule is a precision choice rather than a
capability Tortie lacks, and **the wrap is the only objection that is real** — which also means no
widening at any scope would fix it. Section 12 says so plainly, and names the one widening that is
genuinely cheap without recommending it.

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

### 3.5 A CORRECTION TO THE DENOMINATOR ABOVE, found by re-deriving it

**The 1,560 in section 3.4 is not the number the policy in section 3.3 offers.** The inline count in
`corpus-scan.mjs` applies "absolute" and "something is there" but not the **at least one segment**
clause, and the corpus is full of a bare `/` — a prompt character, a tree glyph, a lone separator in
prose. A bare `/` is path-shaped by the grammar, `lstat` says it is a directory, and the inline count
offers it. The policy refuses it, and the script's own self-test says so in as many words.

Measured on a second capture, taken later the same night over 20 sessions and 44,435 rows:
**260 bare-root tokens**, and the policy's own offer count is **1,293** where the inline count reads
1,553. The wrap figure moves with its denominator and does not change: **54 of 1,293, 4.2%**, against
the 4.3% section 3.4 reports. Every conclusion in sections 3 and 4 stands. The denominator is stated
here so a later round measuring against it uses the policy's number rather than the script's.

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

### 4.1 AND SELECTING THE PATH IS NO WAY ROUND IT

A link provider is not the only gesture available, and the obvious retreat is to let the person do the
work: SELECT the path across both rows and act on the selection through the terminal's own context
menu, which already exists (`src/renderer/terminal/terminal-menu.ts`, whose Copy, Copy as HTML and
Capture Selection rows all read the selection). A selection is the one span the PERSON defines rather
than the buffer, so it looked like the way around shape C.

**It is governed by the same flag.** Read out of the shipping `@xterm/xterm` 6.0.0 bundle, xterm's own
selection text builder walks the rows between the two ends and, for each one, **appends to the previous
string when the line `isWrapped` and pushes a new element otherwise** — and the elements are then
joined with a line break. It is the same question `LinkComputer` asks, asked in a different file.

So a selection across a program-wrapped path in a Codex pane recovers a string with a newline in the
middle of the path and the program's gutter after it, which is exactly what a blind two-row join
produces. A selection across a wrapped line that has been scrolled back into view recovers the same
thing, for the reason shape C gives. **There is no gesture in this product that recovers a wrapped
path, because the fact that is missing is missing from the buffer.**

`wrap-probe.mjs` carries this as two readings rather than one: the source reading above, and an
assertion that a headless `Terminal` answers `getSelection()` with the empty string, so nobody later
mistakes the headless answer for a measurement. The live selection needs a terminal that has been
`open()`ed against a real document, and this probe is headless by design.

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

## 6. WHAT TORTIE'S EXISTING RULES ACTUALLY ARE, RE-DERIVED FROM THE SOURCE

This section exists because both of the answers below — what a click should DO, and what must never
happen — turn on it, and because the measure step's draft of this document (commit `8f9d5f41`, and
"the first draft" everywhere below) got it wrong in a way that would have shaped a phase. It claimed
that *every filesystem action in Tortie is confined to an open project root*. **That is true of writes and false of reads**, and
the distinction is not an accident — it is a gradient the codebase already draws deliberately, by what
the action can DO.

| what the action does | what guards it | where |
| --- | --- | --- |
| **launches a program** (Open With) | `resolveOpenProjectRoot` **and** `resolveInsideRoot` — an open project, or refused | `src/main/fs/open-with.ts:413` |
| **renames, moves, trashes, writes** | the same two, plus `.git` at any depth, plus parent symlinks resolved | `src/main/fs/paths.ts` |
| **renders a DOCUMENT into a renderer** (`gmux-preview:`) | root containment, leaf realpath'd, plus `canPreviewPath` | `src/main/preview/protocol.ts:352` |
| **reads bytes into a sandboxed decoder** (`gmux-asset:`, `fs:readImage`) | absolute, extension allowlist, symlink resolved and re-checked, size cap — **no root check** | `src/main/assets/protocol.ts`, `src/main/fs/image.ts` |
| **reads text** (`fs:readFile`, `fs:readDir`) | absolute, UTF-8, capped — **no root check** | `src/main/fs/ipc.ts:212` |
| **hands a path to Finder** (`fs:reveal`) | **nothing in main at all** — `resolvePath` then `shell.showItemInFolder` | `src/main/fs/ipc.ts:205` |

`paths.ts` says so in its own first line: *"Path guards for every fs:\* MUTATION channel."* The asset
protocol says so too, and argues it: *"Trust boundary: identical to `fs:readFile`, which already serves
any absolute path the renderer names — this adds no reach, and narrows it by method (GET only) and by
an image/font extension allowlist."*

**Three consequences, each of which changes an answer below.**

**One. Tortie already opens files outside every project, on purpose, and has a function for it.**
`openFileAt` in `src/renderer/context/open-detail.ts:89` opens an absolute path in the editor, landing
on a line when there is one, and its own comment says *"Most context files live OUTSIDE the project —
`~/.claude/skills/…` is the common case here, not the edge one."* It forces `mode: 'file'` so a path
outside the active repository never enters the diff path and no git call is ever made for it. So
"open a file outside a project root in an editor tab" is not a capability to be granted. It is
shipped, it is reached from the Context view many times a day, and **it is the function a click should
call.**

**Two. The first draft's proof that the issue's path is refused does not hold.** It cited
`src/main/preview/protocol.ts` answering `outside-root`. That channel serves HTML documents:
`canPreviewPath` is `looksLikeSecretPath` first and `isHtmlPath` second, so a `.png` is refused by that
handler as `not-previewable` and never reaches its root check at all. A `.png` goes to `gmux-asset:`
and `fs:readImage`, **which have no root check and would serve it today.**

**Three. Every root rule this document recommends is therefore a PRECISION rule, not a capability
rule.** It is a choice about which spans to underline, argued from a false-positive rate, and it must
be argued that way rather than borrowed from an invariant that does not exist. That is a weaker
justification than the first draft claimed, and it is the true one.

### 6.1 And the one thing that is genuinely ungated is the one that leaked six times

`fs:reveal` takes any string the renderer sends and hands it to `shell.showItemInFolder`. There is no
guard in main. Every guard is at a **call site in the renderer**, one per surface — and Phase 235 is
what that costs. It fixed this class **three times in one phase**, across doors it had to count:

- item 1, the editor tab strip (`EditorTabs.tsx`);
- the fix round, the **fourth** door — the guided fix's `Open Folder` button beside a broken Context
  row, now `problemRevealDir` in `src/renderer/context/menus.ts:98`, whose comment names the reason:
  *"both homes are `/Users/gdc`: `fs:reveal` would open Finder here on whatever happens to sit at the
  same path, which is the wrong folder rather than nothing"*;
- the committer's round, the **sixth** door — the image surface's `Reveal in Finder` in the
  `too-large` state (`ImageView.tsx:92`), reachable because an SVG on another machine is text and
  still gets an image tab.

**A per-call-site rule needed six sites and three rounds to hold.** That is the strongest argument in
this document for where the remote rule belongs, and section 9 spends it.

---

## 7. WHAT A CLICK SHOULD DO, PER KIND — measured, not imagined

Question 3 asks for the kinds a transcript really produces and, for each, the destination and the
reason. Section 2 counted what is path-SHAPED. This section counts what the conservative policy would
actually OFFER, which is the set a click can land on, and it is a different and much smaller set.

`build/p245/root-cost.mjs`, over the second capture — 20 sessions, 44,435 physical rows, and the
**7 open project roots** read from a copy of the manifest, never from his live file:

| of the 1,293 spans the policy offers | count | share |
| --- | --- | --- |
| a **directory** | 925 | **71.5%** |
| a **file** | 300 | 23.2% |
| a **symlink** | 68 | 5.3% |
| inside an open project root | 1,011 | 78.2% |
| outside every open project root | 282 | 21.8% |
| under `.git`, which the fs contract already refuses | 0 | 0% |
| **a FILE inside an open project root** | **153** | **11.8%** |

**That last row is the whole answer to what a click should do.** Everything else the policy offers
either has no destination or is refused, and that is 1,140 of the 1,293.

And of the 153:

| | count | share of the 153 |
| --- | --- | --- |
| an image, by the SHIPPED extension list | 12 | 7.8% |
| markdown | 23 | 15.0% |
| everything else — an editor tab | 118 | 77.1% |
| matching the shipped `NEVER_PREVIEW` name list | **0** | 0% |
| an image by eye that no Tortie surface can draw | **0** | 0% |
| **distinct files behind all 153 spans** | **43** | |

### 7.1 The directory finding, and it decides the shape

**Tortie has no "reveal in the Explorer" surface.** Every `reveal` in this product is Finder —
`tree-menu.ts:285`, `EditorTabs.tsx`, `HomeScreen.tsx`, `ContextDetailTab.tsx`, all of them
`fs:reveal`. The first draft's table routed a directory to "reveal it in the Explorer", which is a
surface that does not exist. **Proposing it would have been building, which is what this phase must
not do.**

So a directory has nowhere to land, and directories are 71.5% of the offer. Refusing them is not a
concession; it removes the largest source of noise on the face. The 858 in-root directory spans stand
behind **22 distinct directories** — 39 mentions each, which is the repeated `cd` this corpus is full
of. The 153 in-root file spans stand behind **43 distinct files**, 3.6 mentions each. **The directory
half is twenty-two folders drawn thirty-nine times each; the file half is forty-three files drawn
three or four times each.** Only one of those is a person wanting to look at something.

### 7.2 The destinations, and every one of them already exists

| kind | destination | why, and what already does it |
| --- | --- | --- |
| a **file** inside an open project root | **an editor tab, through `openFileAt`** | it is one existing function, it takes the `:line` suffix as `selection.line`, and the editor store decides the rest |
| — and it is an image | **Tortie's own image surface** | `store.ts:480` already routes `isImagePath` to the image viewer. No branch is needed in the provider |
| — and it is markdown | **the same tab, which lands in `'preview'`** | `MARKDOWN_MODES` puts a `.md` tab in `preview` by default. **Markdown is not a second destination** — the first draft listed it as one |
| a **directory** | **nothing — it is never a link** | section 7.1: there is no destination, and it is 71.5% of the noise |
| a **symlink** | **nothing in version one** | 68 of 68 in this corpus are outside every root, so the root rule already removes them and no separate rule is needed |
| an `http(s)` **URL** | unchanged | `WebLinksAddon` has it, and registering after it means the path provider can never take a span from it |
| a **`file://` URL** | the path inside it, subject to every rule above | it opens nothing today: `EXTERNAL_URL` in `trusted-window.ts:60` is `/^https?:/i`, so a `file:` reaching `window.open` is denied and dropped. 7 in the corpus |
| a path **on another machine** | **nothing** | section 9 |
| a path that **is not there** | **never underlined** | `lstat` is the offer condition, so a path an agent invented never draws a link |

### 7.3 His words were "in browser or Preview", and the answer is neither

Jake asked for the image to open "in browser or Preview". **Tortie's own image surface is the better
answer, and the reasons are structural rather than preference.**

- **Preview means `shell.openPath`, and that is a capability this document refuses** (section 8). The
  image surface starts no process at all.
- **The browser means `shell.openExternal` on a `file:` URL**, which `trusted-window.ts` denies today
  and which would have to be widened to allow. The surface needs no rule changed.
- **The surface exists, and it is what every other image open in Tortie already does** — a tree row, a
  Context row, a diff. A click in the transcript landing somewhere different from a click in the tree
  would be the product disagreeing with itself.
- **It is the only one of the three that can be told apart from a remote path.** Preview and the
  browser open whatever is at that spelling on THIS Mac, which is section 9's whole subject.

### 7.4 THE OWNER MODULE, and the trap in reusing it

**The owner is `src/main/drop/prepare.ts`.** `preparePaths` is where Tortie already decides what a path
MEANS: one `stat`, answering `kind: 'file' | 'dir' | 'missing'`, plus `isImage` from `sniffImage` in
`src/main/drop/store.ts`. It is reached over `drop:prepare`, and `attachPaths` in
`src/renderer/terminal/drop/pipeline.ts` is the existing caller that never guesses a kind. A link
provider asks the same question about the same thing and must ask it in the same place.

**Two things a build round must know before it reuses that module, because neither is obvious.**

**`preparePaths` has a SIDE EFFECT.** A filename containing `\r` or `\n` triggers the newline rescue:
the file is COPIED into the drop store under a safe name and the copy is referenced instead. That is
right for a drop, which is a deliberate gesture that ends in a paste. It is wrong for a hover.
**A hover must never write**, and a link provider driven by pointer movement calling `preparePaths`
would put files into `userData` as the pointer crosses a row. Version one needs that module's
classification WITHOUT its rescue — a read-only option on `preparePaths`, or a caller that asks only
for `kind`. Whichever the build round picks, it is a refusal in section 8 and not a detail.

**The two "image" answers in this codebase are different instruments, deliberately.**
`prepare.ts`'s `isImage` is a **magic-byte sniff of the file's head**. The image SURFACE is gated by
**extension**: `IMAGE_EXTENSIONS` in `src/shared/image-types.ts`, which is what `gmux-asset:` will
stream and which leaves TIFF out on purpose because Chromium cannot decode it. So a click routed to
the image surface must satisfy BOTH, or it draws a tab the protocol then refuses. The cost of that
rule in this corpus is **zero** — 0 of the 153 in-root file spans are an image by eye that no Tortie
surface can draw — and the rule is still required, because zero today is not zero tomorrow.

### 7.5 The cost, which is not where anybody expected it

Section 5 measured `provideLinks` at 0.0031–0.0047 ms and established that xterm asks **on hover, per
cell the pointer enters**, not per render. That is the provider's own arithmetic and it constrains
nothing. **The cost that does exist is the existence check**, because `lstat` is the offer condition
and the answer lives in main. A pointer crossing one row asks about every cell in it. So the provider
answers from a per-path cache and the IPC round trip happens once per distinct path, not once per
cell. This corpus is the reason it works: **43 distinct files behind 153 spans, and 22 distinct
directories behind 858.** The repetition that makes a naive implementation expensive is the same
repetition that makes a cache nearly free.

---

## 8. WHAT MUST NOT HAPPEN, priced against Phase 23 and against the rules that really exist

**`shell.openPath` on a string out of a terminal buffer is a capability, and it is refused.**

The argument is not squeamishness and it is not a general suspicion of opening files. It is the
boundary CLAUDE.md already draws: *Configuration selects from choices the compiled world already
contains, or names an executable the user has personally confirmed.* **A terminal buffer is not
configuration.** It is a stream an agent writes, and an agent running under
`--dangerously-skip-permissions` writes whatever it likes into it. `shell.openPath` hands that string
to LaunchServices, which **chooses a program by extension and runs it**. A `.command`, a `.app`, a
`.webloc`, a `.terminal` or a `.scpt` on one line of output would be one click from executing.
**Refusal 8 — nothing may cause a process to start on a configuration change alone — is the same
shape and the same argument, and this would be the worse version of it, because no human confirms any
bytes anywhere.**

And it would be new reach rather than an extension of something. The three `shell.openPath` calls in
main open **directories Tortie itself created** — the configuration folder (`config/guide.ts:230`),
the log directory (`log/ipc.ts:95`) and the migration notice's folder (`migrate/notice.ts:252`).
Open With, the one thing in this product that launches a program on a person's file, is the one
filesystem action that **is** confined to an open project root, through `resolveOpenProjectRoot` and
`resolveInsideRoot`, on a path the person picked out of a tree Tortie itself drew. It is not a
precedent for this. It is the argument against it.

**Opening is not executing, and this document keeps that line bright.** Everything section 7
recommends reads bytes into a sandboxed renderer and starts nothing.

### The refusals, written as refusals so a later phase inherits them

1. **A click never runs anything.** No `shell.openPath`, no `shell.openExternal` on a path, no Open
   With, no LaunchServices, no `/usr/bin/open`. Opening is not executing.
2. **A click never opens a path that is not there.** `lstat` is the offer condition, so a path an
   agent invented is never underlined. A link that does nothing is worse than no link.
3. **A hover never writes.** The classification a link provider asks for must not carry
   `preparePaths`' newline rescue copy, and no other write may be reached from a pointer moving over a
   pane. This one is new in this draft and it is the trap section 7.4 found.
4. **A path is never underlined without the person pointing at it.** xterm's providers are
   hover-driven; nothing is decorated on the resting face. It is also what stops 858 spans over 22
   directories from reading as hyperlink soup.
5. **A pane whose session runs on another machine offers no path links at all.** Section 9.
6. **No new IPC channel that takes a path and does something with it.** `drop:prepare` answers the
   kind, `openFileAt` opens it, and the editor store routes it. A version one that needs a new channel
   has grown past what this measurement supports.
7. **A directory is never a link**, until a destination for one exists. Today there is none.
8. **A span that touches either end of its row is never offered.** It is the cheap answer to section
   4, it costs the 4.2% of section 3.5, and it is honest in a way rejoining would not be: a span that
   runs off the edge of a row is a span whose end we do not know.
9. **The root rule is a PRECISION rule and must be argued as one.** Section 6 is why. A later round
   that wants to widen it is not breaking an invariant — it is trading false positives, and it must
   bring a measurement rather than an appeal to a rule that does not exist.

### 8.1 What the root rule does and does not buy, stated honestly

It is worth being exact, because the first draft leaned on this rule harder than the evidence
supports.

**It buys precision.** It removes 282 of 1,293 spans, and the ones it removes are the ones most likely
to be a fragment, a container path, or a file on some other machine — 68 of 68 symlinks and 147 of 300
files.

**It does not buy safety from secrets, because nothing needed buying.** Section 2 found 3
credential-shaped tokens in the whole corpus, and **0 of the 153 in-root file spans match the shipped
`NEVER_PREVIEW` name list.** If a later round widens the root rule, the guard it needs is not the root
rule — it is `looksLikeSecretPath` from `src/shared/preview-types.ts`, which already exists, is name-only
by design, refuses dotenv in every spelling, key material by extension, ssh key stems, `.properties`,
netrc and htpasswd, and is already run first by `canPreviewPath`. **Name it now so the next round
reaches for it instead of inventing one.** It does not name `auth.json`, which this corpus does
contain; that is a stated gap rather than an oversight, and widening the list is a change to a shipped
predicate that a later phase must argue on its own.

**It does not buy protection from opening the wrong thing on a remote pane.** Both homes are
`/Users/gdc` and a project root is spelled identically on both machines, so a remote path can be
*inside* an open root and still name a different file. Only section 9's rule catches that.

---

## 9. THE REMOTE CASE, and why the rule goes in the provider

**Both homes are `/Users/gdc`.** A path printed in a session on the Mac Pro reads exactly like a path
on this Mac, `lstat` here will happily confirm a file with the same name in the same place, and it is a
different file. **It cannot be told from a local one by looking at the text, at any length, ever.**

**It can be told from the SESSION, and the pane already knows.** `TerminalPane.tsx` holds the exact
predicate one screen above where `WebLinksAddon` is loaded — Phase 96's ⌘K closure, at line 351:

```
() => sessionRow()?.machine === undefined
```

It is the same question `attachPaths` asks before it decides a drop must carry bytes rather than a
path (`pipeline.ts:112`), and the same one `problemRevealDir` and the Phase 108 Context menus ask
before they build an item that opens or reveals.

**So the rule is: a pane whose session runs on another machine offers no path links at all.** Not a
link that fails, not a link that explains itself — no underline. That also keeps the *Just enough
words* rule and the operator's own standing note that a remote surface must not carry explanatory text
just because it is remote: an affordance that can never be true here is one fewer control, never a
dead one.

**And the rule goes in the PROVIDER, which is the point of this section.** Section 6.1 counted what
the alternative costs: `fs:reveal` is ungated in main, its remote rule lives at every call site, and
that shape needed **six doors and three rounds inside one phase** to hold. A link provider is one
registration in one file with one closure. Putting the machine check anywhere else — in the click
handler, in the destination, in `openFileAt` — recreates the per-call-site shape that Phase 235 spent
a phase paying for. **This is the third instance of that bug waiting to happen, and one line in the
provider is what makes it not happen.**

The corpus cannot measure this: every session in it is local. It is reasoned from Phase 235,
`pipeline.ts` and the pane's own closure, and it is labelled as reasoning in section 13. What the
corpus does show is that the foreign-path family exists with no remote session anywhere near — 61
tokens under `/root/`, `/home/` and `/workspace/` from containers and CI logs.

---

## 10. THE RELATIVE HALF, and why it is refused rather than deferred

57.1% of path-shaped tokens are relative, and they are the majority of what an agent writes when it
names a file it just touched. Reaching them is the whole difference between a 37.5% hit rate and a
good one. It is still refused, for a reason that is structural rather than a matter of effort.

**A scrollback line has no cwd.** tmux can answer `#{pane_current_path}`, but that is the cwd NOW. A
line printed an hour ago was printed under whatever the cwd was then, and in this corpus the cwd
moves: **555 `cd` commands to 11 distinct absolute targets** across the panes, 528 of them to one
project root and 27 somewhere else.

**And the operator's own workflow makes the wrong answer plausible rather than obviously wrong.** This
corpus holds **435 mentions of `git worktree`**. A worktree is a second complete copy of the project,
so a relative name resolves under both roots and both files exist. Measured against the project root
and three worktree paths named in the transcripts:

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
is not the file the agent wrote. That is worse than not offering the link — and note that it is the
one failure mode in this whole document that a person cannot see happening.

---

## 11. DOES IT SERVE THE AGENTIC WORKFLOW, or does it exist because terminals have it?

The scope guardrail's own test, answered honestly. **It splits, and it splits harder than the first
draft said.**

**Yes, for one case, and it is the strongest case there is.** An agent names a file it just wrote and
the person wants to look at it. That is the loop Tortie exists for, it happens many times an hour, and
today the only way through it is to read the path off the screen and retype it in the Explorer. Paths
outnumber URLs in a real transcript **28 to 1** and the URLs are the ones that are clickable. That
asymmetry is the whole case and it is a good one.

**No, for everything else, and the measurement is what makes that a finding rather than an opinion.**
The case above is worth **153 of 1,293 offered spans — 11.8% — standing behind 43 distinct files.**
Every widening that would grow that number buys a slice of the rest at a price this document has
already measured:

- **directories** (71.5% of the offer) have no destination, and inside a project root they are 22
  folders drawn 858 times.
  Every IDE underlines them. That is the reason, and it is not a good one.
- **relative paths** (57.1% of path-shaped tokens) open the wrong file in the wrong worktree, silently.
- **rejoining wrapped paths** needs a fact the buffer does not hold (section 4), and no gesture
  recovers it (section 4.1).
- **remote panes** open a different file with the same name (section 9).
- **`shell.openPath`, Open With, "in browser or Preview"** are a capability priced in section 8.
- **a preference for which app opens what** is IDE furniture with an agentic coat on.

So the honest shape is: **one narrow provider serves the loop the product exists for, and the entire
remaining surface area is there because terminals have it.** That is a scope-guardrail answer, and it
is why the recommendation below is one rule shorter than the first draft's.

---

## 12. THE RECOMMENDATION

### Version one, small enough to be obviously right

**One additional xterm link provider, registered AFTER `WebLinksAddon` in
`src/renderer/terminal/TerminalPane.tsx`, offering a link only when all of these hold:**

1. **the session runs on THIS Mac** — the closure already at `TerminalPane.tsx:351`,
   `sessionRow()?.machine === undefined`;
2. the span, after `~`, `file://` and a `:line[:col]` suffix are stripped, is **absolute** and names
   **at least one segment** (the clause section 3.5 found missing from the inline count);
3. it resolves **inside an open project root** — the same containment `resolveOpenProjectRoot` and
   `resolveInsideRoot` in `src/main/fs/paths.ts` apply, and used here **for precision**, which section
   6 is careful about. **This one is answered in the renderer and needs no channel**: the store already
   holds `projects` (`src/renderer/state/projects-slice.ts`), which is the same list main reads through
   `listProjectRoots`, so the provider filters against a list it already has. Main's own gate is not
   moved, not weakened and not consulted — it stays exactly where it is, guarding what it guards;
4. **`src/main/drop/prepare.ts` says it is a `file`** — not a directory, not missing — asked without
   its newline rescue copy, per refusal 3;
5. the span **does not touch either end of its row**.

**A click calls `openFileAt(path, repoPath, { preview: false, line })`** — `src/renderer/context/open-detail.ts:89`,
the function the Context view already opens absolute paths with. The `:line` suffix becomes
`selection.line`. **Nothing else is routed by the provider**: `src/renderer/editor/store.ts` already
sends an image path to the image surface and opens markdown in `preview`, so image, markdown and text
are one call and three destinations that already work.

That is: one registration, one existing classification, one existing open function. **No new IPC
channel, no new surface, no new capability, and no new decision about what a path means.**

### What it deliberately does not do

No relative paths. No directories. No rejoining across rows. No remote panes. No `shell.openPath`, no
Open With, no `file:` to the browser. No new IPC channel. No underline until the pointer is on it, and
nothing on the resting face. No write of any kind on a hover.

### AND IT DOES NOT FIX THE SCREENSHOT IN THE ISSUE. The reason has changed, and it matters

Jake's path is `[image] /private/tmp/claude-501/…/test-pattern-1440.png` in a **Codex** pane. The first
draft said version one fails it twice over, on the root rule and on the wrap. **Only one of those is
real, and it is the one that cannot be fixed.**

- **The root objection is not a capability objection.** Section 6 re-derived it: `gmux-asset:` and
  `fs:readImage` serve any absolute path with an allowed extension, under a symlink re-check and a
  32 MB cap and **no root check**, and `openFileAt` opens paths outside every project as its ordinary
  business. Tortie could draw that PNG today with nothing widened. The root rule keeps version one
  precise; it is not what stands between him and his file, and the document should not have told him
  it was.
- **The wrap objection is real and it is terminal.** His pane is shape B. The continuation row carries
  `isWrapped=false` and a gutter, the flag is absent, no rejoin is possible, selecting it recovers the
  same broken string (section 4.1), and scrolling to it would have destroyed the flag even if Codex
  had left one. **There is no version of this feature, at any scope, that makes that span clickable
  without a heuristic that guesses where a path ends** — and a heuristic that guesses is the 40%
  false-positive detector section 3 rejected.

**So the honest report to him is one sentence: the narrow provider makes an agent's own project files
clickable, and it does not make a Codex-wrapped path clickable, because the terminal is not told that
the line was broken.** Widening the root rule would not change that. It is worth saying, because "we
could allow paths outside your projects" is the answer he would otherwise expect, and it would buy him
nothing.

**The one widening that is genuinely cheap, and it is still not recommended here.** Allowing an
IMAGE — and only an image — outside every project root to open in Tortie's own image surface costs no
new capability at all, for the reason above. It is worth **1 span in this corpus** on the outside-root
side and 12 on the inside, it would need the `IMAGE_EXTENSIONS` gate and `looksLikeSecretPath` in front
of it, and **it would not fix the issue that prompted it.** It is his call and not this document's, and
it should be made on its own evidence rather than on Jake's screenshot.

### What the second step would be, if the first proves out

**Relative paths anchored to a project, and only when the answer is unambiguous.** Resolve a relative
span against the session's project root; offer the link only when **exactly one** open project root
resolves it and no live worktree under that root does. Section 10's table is the test it has to pass,
and **it fails that test on this Mac today** — which is precisely why it is a second step with its own
measurement rather than a widening of the first.

**And a directory destination, if one is ever wanted.** 71.5% of the offer is directories and there is
nowhere to put them. If a later round builds "select this folder in the Explorer", the directory half
of this measurement becomes available in one line. Until then it stays refused, and the refusal is
about the missing destination rather than about the path.

### If the honest answer had been nothing, this document would say so

It is not nothing, and it is smaller than the first draft claimed. It is one narrow provider, reaching
**153 spans over 43 distinct files in a 44,435-row corpus**, in the one case the product exists for,
with a measured false-positive rate of 4.2% and every one of those a wrap artefact the fifth rule
refuses. Everything past that is worse than the thing it replaces, and the numbers above are why.

---

## 13. WHAT IS UNMEASURED, stated rather than hidden

- **Eleven of the fourteen registry agents.** Only claude, codex and shell were running.
- **Every remote path.** No session in the corpus runs on another machine; section 9 is reasoned from
  Phase 235, `pipeline.ts:112` and the pane's own Phase 96 closure, not measured.
- **The relative resolution rate.** Refused deliberately: measuring it means reading inside the
  operator's own repositories, and section 10's six-name table is the bounded version that makes the
  ambiguity a measurement instead of an inference.
- **What a person would actually click.** The 200-span adjudication asks "is this a real path
  reference", not "would he click it". Those are not the same question and only he can answer the
  second. The 153 in section 7 is an upper bound on the useful half, not a reading of his intent.
- **The live selection.** Section 4.1 is a source reading of the shipping bundle plus an assertion that
  the headless answer is empty. Driving a real selection needs a terminal that has been `open()`ed,
  which needs an Electron, which this phase does not launch.
- **`looksLikeSecretPath` against `auth.json`.** It does not match, and this corpus contains that name.
  Section 8.1 states it as a gap rather than fixing it, because the predicate is shipped and shared
  with `canPreviewPath`.
- **The per-hover cache.** Section 7.5 argues it from the distinct-path counts. No cache was built and
  none was measured, because building one is what this phase must not do.
- **The two captures are not the same capture.** Sections 1 to 4 are the first, at 00:25; sections 3.5
  and 7 are the second, later the same night, and it read 20 sessions and 44,435 rows where the first
  read 19 and 48,690. The sessions are live and scrollback rolls. Every rate agrees to a few tenths of
  a percent and no conclusion moves, which is itself the stability reading section 1 promised.
- **The 200-span adjudication is one person's reading**, not two independent ones. The four classes
  were fixed before the sample was drawn and the draw is seeded, so it can be re-drawn and re-marked;
  it has not been.
