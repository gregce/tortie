# Research 83 — the shadow baseline, and rewind phrase by phrase

Phase 222, research only. Everything below was measured on 2026-09-07 in the worktree at
`/private/tmp/wt-p222` detached at `24f0e7a`, by running the **shipping** modules under node through
the pinned `tsx`, by driving the shipping `RepoWatcher` and the shipping `composeRedlineDocument`, by
real `git` in scratch repositories made for the purpose, and by six Electron passes over a harness
page that links the real `redline.css` and `tokens.css`. Every Electron went through
`build/electron-run.mjs` and was ended in a `finally`; the post-run count found nothing left. No tmux
server was contacted, no repository of the operator's was written to, no package was installed,
`package.json` and the lockfile are unmoved, no shipping file was edited, and no version was bumped.
The scratch scripts every number comes from are under `.p222/`; the fix round's are under
`.p222/fix/`.

**This document has been through a fix round.** A verifier attacked the recommendation as the charter
asked and constructed cases in which a person loses prose. Three of them survived every guard this
document stated. Section 3 lists every correction, and each one is written into the section it
belongs to rather than only collected there.

This document answers questions the operator asked twice on 2026-09-07. His clarifications supersede
issue 15 and the entry in `docs/BACKLOG.md` carries them verbatim.

**It recommends nothing be started.** It prices the work, says which parts can ship apart, and names
the one thing that can lose his prose. The choice is his.

---

## 0. The answer, before any detail

1. **The idea works, and it is smaller than the issue feared.** A redline drawn between a shadow
   baseline and the file on disk needs no git, no worktree, no index and no staging area. The pair is
   two strings Tortie already holds, and the shipping composer takes exactly two strings today.
2. **Rewind is one function, and accept is the same function pointed the other way.** Rewinding a
   phrase writes the file and leaves the baseline alone. Accepting a phrase writes the baseline and
   leaves the file alone. Accepting everything is `baseline := the bytes you are looking at`, which
   is one line of state. All of that is measured in section B, exhaustively over all 256 subsets of an
   eight-change paragraph, with zero failures. **It is safe only with four guards, and the fix round
   found two of them missing:** re-derive at press time against a fresh read (E.7); **refuse a
   truncated read** (E.7a, which silently reverted a whole 5.9 MB document in one arm and dropped
   98,110 bytes in another); bind the press to the **baseline generation** it was drawn against
   (B.8a, without which a per-phrase accept landing between the draw and the press rewound the wrong
   phrase); and hold the write under a precondition (E.5).
3. **The difficulty moved to the baseline, and that is now the crux.** When it is taken, when it
   advances, where it lives, and what a stale one does. A missing baseline is benign — the view falls
   back to exactly what ships today. A **stale** baseline that still looks plausible is the danger,
   and section A8 names the sequence in which a person presses rewind believing it is an undo and
   writes another branch's prose over their own file. **The fix round added a second sequence that
   needs no staleness and no mistake at all**, being the person rewinding their own uncommitted
   paragraph, measured at 149 bytes gone from every place Tortie holds anything (A8a).
4. **"Every agent edit shows up" is mostly already built.** The chain from an agent's write to a
   recomposed redline exists end to end and costs zero new watcher subscriptions and zero FSEvents
   exclusion paths. It has one measured hole: a file inside a gitignored directory is seen **0 times
   out of 8**. One `fs.watch` on the active file's directory closes it, at about 1 % of a core in the
   worst case, and `fs.watch` is structurally incapable of touching the eight-path budget.
5. **Typing in the view is a separate feature and should be phase two or later.** Rewind needs no
   caret at all; the keyboard-only scheme was measured working on the shipped markup with **zero**
   visual change. Everything hard — caret across struck-through runs, `beforeinput`, Enter, paste,
   IME — belongs to typing and stands between nobody and "undo this phrase".
6. **The nearest prior art is not the one everybody would name.** Cursor ships the non-git baseline at
   whole-workspace grain and per-change controls at line grain. **Wymark**, a macOS beta read on the
   day, says it ships almost exactly the sentence he wrote, as a standalone markdown editor. What is
   genuinely Tortie's is narrow: phrase-level rewind *inside the agent shell*, on the active file,
   with no second editor to move into. He should spend an evening with Wymark before this is built.
7. **The prose allowlist stays exactly as it is, and the reason has changed.** The old confetti
   argument does not survive this repository. The new one is about the write: reverting one run inside
   a paragraph always yields prose; reverting one run inside a line of source produced a file
   TypeScript cannot parse in **39 of 169** real single-change rewinds.

---

## 1. The confirmation the charter asked for, and it holds

**With a shadow baseline, git is not involved in the redline at all.** The rock both earlier framings
hit — git stages lines, and a phrase inside a paragraph is not a line — is not on this path.

Read from the tree: `src/renderer/editor/RedlineDocument.tsx:89` composes
`composeRedlineDocument(tab.headContents ?? '', workingText)`. It is two strings. The composer never
knew where its left-hand side came from, and it does not care. Replacing `tab.headContents` with a
baseline of Tortie's own changes one argument and nothing else.

Run rather than read, twice and independently:

- The shipping composer was driven under node over non-git baseline pairs throughout section A and
  needed no change to do it (`.p222/m2-smoke.ts`).
- Phase 194's correctness property was re-derived with the baseline in place of HEAD:
  `oldTextOf(runs) === baseline` and `newTextOf(runs) === current`, both true, over a 405-byte
  paragraph against its 416-byte edited form at 24 runs (`.p222/rewind.mts`), and again over the
  eight-change fixture in section B at 23 runs. Section B then **strengthens** it: those two
  projections are the two endpoints of one family, and every one of the 2⁸ = 256 intermediate states
  satisfies both, with 0 failures.

Rewinding a phrase writes a file whose content is the current file with one run put back. Git sees
that file when a person commits, exactly as it does now. **Most of the difficulty the issue
anticipated does evaporate**, and the operator should know that first.

**What replaces it is the baseline**, and section A is what it costs.

---

## 2. Where the measurements disagreed, and how each was resolved

Five probes ran in parallel. They disagreed in six places. None is averaged.

**1. "No new watcher is needed" against "the budget has zero free slots."** Section A7 concluded the
existing chain delivers and the exclusion budget is not in play; section C measured the worktree
stream at **8 of 8 kernel paths with 0 free slots** on his repository's shape, and measured a
gitignored file seen **0 times out of 8**. Both are right and the resolution is C's, because it drove
the thing: the existing bus delivers for a tracked, non-ignored file in a repository whose watcher has
started, at 313 ms median; it delivers *nothing* for a file under any of his eleven ignored roots; and
the proposal adds zero exclusion paths not because there is room but because **there is none**. A
ninth path on that stream turns off all eight, `.git` included, in silence. Section A7's sentence
"only two `watcher.subscribe` call sites" is also wrong on a detail: the gate prints **four**, being
two settings directories plus the worktree and dotgit streams.

**2. Watcher latency, 309–311 against 313 and 465.** Section A quoted the numbers banked in
`repo-watcher.ts`'s own header from Phase 151. Section C measured its own: 313 ms median at the main
side over two runs of eight edits, and 465–510 ms into the shipping renderer bus. They agree; the
figure to use is C's, because it was taken today, and it is about half a second end to end.

**3. Rewind identity.** Section E said "by its own bytes and its own offset, never by its index, and
refuse when ambiguous". Section B measured that rule: identity is `(offset into the baseline, deleted
text, inserted text)`, baseline offsets are **strictly increasing across a draw (0 violations in 2,998
draws)**, and over 1,500 draws with an outside edit landing in between, **1,472 resolved to exactly
one edit, 28 to none, and 0 to more than one**. Same rule; B carries the numbers and the property that
makes it safe, which is that the baseline does not move during the press — **and B.8a is the guard
that makes that property true, which the fix round found neither section stated.**

**4. Per-phrase accept.** Section B measured it costing no mechanism at all — it writes only Tortie's
own shadow copy and not one byte of his file. Section F refuses it in version one. **The fix round
found one thing it does cost, and it is not a byte of his file: it MOVES THE BASELINE**, which is the
coordinate system every pressed identity is expressed in, so it needs B.8a's generation guard before
it ships. That strengthens F's refusal rather than weakening it. That is not a
contradiction and both stand: it is cheap, it is *safer* than rewind, and it is kept out of the first
version because two controls that mean different things beside each other is a surface problem rather
than a mechanism problem.

**5. The state of `npm run conformance:redline`.** Two builders reported it green today. The
integrator ran it four times at 17:30 and it was **red every time**, on rule 5 alone, reading 487,
576, 663 and 695 ms against its 400 ms ceiling and rising monotonically. The machine's load average
was **97.48** at the time, from the operator's own unrelated Go and clang work. Nothing in this phase
touched shipping code. **Rule 5 is a wall-clock budget and it is load-sensitive**, which is worth
knowing before a builder reads a red gate as a regression. The other fifteen rules passed in all four
runs. **The committer measured the other end of that, so the sentence is a measurement on both sides
rather than an inference from one:** at a load average of **4.98** the same rule on the same tree read
**156 ms** against the same 400 ms ceiling, and every one of the sixteen passed. The load moved by a
factor of about 20 between the two readings and the rule's cost moved by a factor of 3 to 4.5, which
is the whole finding: **neither the green nor the red is a reading of this rule's own cost**, and a
builder should treat a red rule 5 as a question about the machine before it is a question about the
code.

**6. The gate prints sixteen rules, and `CLAUDE.md` says fourteen.** Confirmed by running it three
times, twice in the fix round and once by the committer: rules 15 and 16 are Phase 194's two byte-exact
projections over 26 fixtures with a 3,000-pair fuzz, and the 96 adjacent pairs sharing no whitespace.
`CLAUDE.md:269`'s sentence — *"so fourteen rulings stay executable rather than documented"* — is stale
by two. **It is owed by a LATER commit and not by this phase's**, and the draft of this line said "this
phase's commit", which is an instruction this phase's own scope forbids: a research phase touches
`docs/research/` and the running log and nothing else, so the sentence asked for something that could
not be done and was not done. The correction is handed on in the landing entry in `docs/BACKLOG.md`
instead, alongside this section's other one, being that a red rule 5 is load rather than a regression.

---

## 3. The fix round, and what it changed

A verifier ran the charter's named independent method — construct the case where a person loses prose
they wrote and see whether the proposal stops it — and constructed five. **Three survived every guard
this document stated.** Every one below was re-derived here rather than accepted: the scripts are
under `.p222/fix/` and their outputs beside them. The instrument was checked first
(`.p222/fix/f0-selfcheck.ts`): a hand-written `editsOf` and `mix` reproduce section B's whole
transcript from the paragraphs printed in B.1 — 477 B md5 `32119ae9`, 464 B md5 `8cc5e7a6`, 23 runs,
one block, `approximate false`, the eight baseline offsets 7, 27, 62, 74, 183, 244, 322 and 450, the
E4 rewind at 465 B md5 `cd918864` first differing at offset 180, and all 256 subsets distinct with 0
projection failures. Four of the corrections below rest on that instrument, so it is proved before it
is used.

**The three that lose prose.**

1. **A truncated read reaches the rewind, and nothing checks it.** E.7 step 1 says re-read at the
   moment of the press, and the renderer's only reader caps at 5 MB and reports `truncated`. The word
   appeared four times in this document and never once in a rewind context. Two arms, both driven:
   98,110 bytes dropped in one, and in the other the whole 5,895,890-byte document silently reverted
   to the baseline with both of the agent's other edits gone. **E.7a** is the new refusal and
   **A3.1** and **E.5** are corrected.
2. **"The baseline is immutable during the press" was asserted, and A2.2 makes two things move it.**
   A2.3's refusals cover the file changing, typing, looking, session lifecycle and a rewind. They do
   not cover an accept or a commit, and both are asynchronous with a press. Reproduced: a per-phrase
   accept of a preceding shrinking edit slid a second identical phrase's baseline offset exactly onto
   the first's, the pressed identity resolved to **exactly one** edit — the wrong one — and the write
   succeeded with nothing said. **B.8a** states the guard the document never stated.
3. **The loss case that needs no staleness is rewinding your own writing.** A2.3 refuses on purpose to
   advance the baseline when the person types or saves, so their own uncommitted paragraphs sit in the
   redline as insertions with rewind controls beside them, on a surface whose verb means undo. Driven
   with a perfectly fresh baseline: 149 bytes gone, surviving in no file, no baseline, no redline and
   no undo stack. **A8a**.

**The conclusion that was refuted by re-running this document's own script.** A2.1 concluded that the
reading failure at scale is fixed by nothing but a baseline that moves, and its instrument was blind:
`.p222/m4-scale.ts` printed `skipped=${doc.skipped ?? 0}` and `RedlineDocument` has no `skipped`
field, so every row printed a constant zero. With `whole` restored the same rows reproduce byte for
byte and show what was hidden. **A2.1 is rewritten**, the direction survives, and the stated cause
does not.

**Eight further corrections**, each written into the section it belongs to rather than only here: the untracked-file
claim in **A1.2** narrowed to what the first read can actually see; the HEAD re-seed in **A4.2**
caveated, because the signal it rides is lazy and in-process, and the "newest of" rule given the
ordering it never had; the containment guard carried into **E.5**, which had answered three of E.4's
four rows; **E.5** also told that its tmp-and-rename writes into the repository A3.2 refused to write
into; **encoding named for the first time** in **E.7b**, measured at three bytes corrupted outside
the rewound span on a latin-1 `.txt`; **G.1** given all nine of its rows and its ratio band
restated, because two omitted rows break it; **D.4** made to answer the charter's fourth question for
the two options that dodged it; and **F.2**'s impermanence sentence widened past a restart.

---

## A. The baseline, which is the crux — what the shadow copy actually is

Every number in this section was produced on 2026-09-07 by a script under `.p222/`, run against this
tree at `24f0e7a`, with its output committed beside it. Nothing was recalled. No Electron was
launched, no tmux server was touched, no repository of the operator's was written to, and every
scratch git repository was made for the purpose under `/private/tmp/`.

### A0. Why this section is the crux

Section 1 above confirms that git is not involved in the redline at all, and it was confirmed by
running the shipping composer over non-git baseline pairs throughout this section
(`.p222/m2-smoke.ts`). **The difficulty really has moved to the baseline, and it is not small.** The
rest of this section is what it costs.

### A1. When is the baseline taken?

#### A1.1 The six candidate moments, driven over one timeline

`.p222/m2-baseline-policies.ts` runs one realistic day over one real document
(`docs/ZEN-OF-TORTIE.md`, 7,990 bytes) through the **shipping** composer and reports what redline each
candidate baseline draws. The timeline: the file is committed (V0); **the person edits one word
themselves** (V1); a session starts; the agent writes twice (V2, V3); at t5 the person opens the
redline, looks, and accepts; the agent writes once more (V4); at t6 the person looks again.

```
AT t5, the person opens the redline after two agent writes:
  A  baseline = git HEAD (what ships today)          del=  3 ins=  4 delChars=  20 insChars=  63
  B  baseline = when the file was opened (V1)        del=  2 ins=  3 delChars=  15 insChars=  59
  C  baseline = when the session started (V1)        del=  2 ins=  3 delChars=  15 insChars=  59
  D  baseline = when the person last looked (V1)     del=  2 ins=  3 delChars=  15 insChars=  59
  E  baseline = when the person last accepted (V1)   del=  2 ins=  3 delChars=  15 insChars=  59
  Z  baseline = every observed file change (V3)      del=  0 ins=  0 delChars=   0 insChars=   0

AT t6, after the person accepted at t5 and the agent wrote once more:
  A  baseline = git HEAD, still uncommitted (V0)     del=  5 ins=  7 delChars=  30 insChars=  83
  B  baseline = when the file was opened (V1)        del=  4 ins=  6 delChars=  25 insChars=  79
  C  baseline = when the session started (V1)        del=  4 ins=  6 delChars=  25 insChars=  79
  D  baseline = last look, which was t5 (V3)         del=  2 ins=  3 delChars=  10 insChars=  20
  E  baseline = last accept, which was t5 (V3)       del=  2 ins=  3 delChars=  10 insChars=  20
  Z  baseline = every observed change (V4)           del=  0 ins=  0 delChars=   0 insChars=   0
```

Four things fall out of that table and each of them decides something.

**Z is the naive reading of "shadow DOM", and it draws nothing, ever.** A baseline that follows the
file is a baseline that is always equal to the file. Zero at t5, zero at t6, zero for ever. It is
worth stating plainly because "a shadow copy that tracks the file" is the first sentence anybody
writes and it is empty by construction. **Whatever advances the baseline, it is never the file
changing.**

**A is today's behaviour and it attributes the person's own edit to the change set.** At t5 it draws
three deletions where the others draw two, and the extra one is `place → home`, which the person typed
themselves before any agent ran. Re-derived independently with **git's own word diff** rather than
jsdiff, over the same two pairs (`git diff --no-index --word-diff=porcelain`, git 2.50.1):

```
baseline = V1 (last dealt with) vs V3            baseline = V0 (HEAD, ships today) vs V3
   -it            +that weight                     -place         +home     <- the person's own edit
   -them.         +them, quietly and without …     -it            +that weight
   -vigilant, not +watchful rather than            -them.         +them, quietly and without …
                                                   -vigilant, not +watchful rather than
```

Three changed word runs against four, and the extra one is the person's. jsdiff and git disagree on
token boundaries by one (`them.`), which is why the run counts differ by one from the table above;
they agree exactly on the SET of changes and on the delta between the two baselines, which is the
thing being claimed.

**B and C are the same answer at t5 and grow without bound after it.** "When the file was opened" and
"when the session started" both resolve to V1 here, and neither ever moves. A2 measures what that
costs.

**D and E are the only two that shrink**, and at t6 they are the only ones showing the person the one
thing that changed since they dealt with it: 2 deletions and 20 inserted characters, against B and C's
4 and 79 and A's 5 and 83.

#### A1.2 The recommendation

**The baseline is the last version of this file the person has dealt with, and it is seeded from
HEAD.** In one sentence, and this is the whole rule:

> **baseline = the newest of { the HEAD version of the file, the last version the person accepted,
> the last version the person committed }; and for a file with no HEAD version, the first bytes Tortie
> successfully read.**

That answers his sentence — *"each bit of what was actively edited"* is what changed since he last
dealt with it, which is D and E — and it has four properties no other formulation here has.

1. **It degrades to exactly what ships today with zero state.** A person who has never accepted
   anything, in a tree with nothing lost, gets `headContents`, which is precisely
   `RedlineDocument.tsx:89` as it stands. Version one is a strict superset of Phase 194 rather than a
   replacement for it, and a lost baseline is not a broken feature (A3.4).
2. **It fixes the "only shows up when there was a diff" complaint, for an untracked file that is
   already open.** An untracked prose file has no redline at all today, and the reason is measured
   rather than inferred: `git show HEAD:untracked.md` exits **128** with `fatal: path
   'untracked.md' exists on disk, but not in 'HEAD'`, `loadHead` catches that and patches
   `canDiff: false` (`src/renderer/editor/tab-io.ts`), and the Redline option is gated on
   `tab.canDiff` (`src/renderer/editor/EditorPanel.tsx:217` and `:236`). No HEAD, no Redline tab,
   ever. "The first bytes Tortie read" is the clause that gives that file a redline.

   **The example this claim was first written to does NOT hold, and the correction is the fix
   round's.** The draft said *"an agent writing a brand new `notes.md` and rewriting it ten times"*,
   and the first read cannot see any of that. `loadContents` is called from exactly one place,
   `store.ts:587` inside `openFile`, confirmed by grep over the whole renderer: it runs when **the
   person opens the file**, which for a file the agent created is after all ten writes. The baseline
   seeds from the tenth version and the redline is empty. **The claim narrows to: an untracked file
   that was already open when the agent wrote to it gets a redline where today it gets none.** A file
   the agent created from nothing needs a second seeding moment that this document does not name and
   a build phase would have to; the honest reading is that this property is worth less than the draft
   claimed and is still worth having.
3. **Taking it at the FIRST SUCCESSFUL READ, not lazily when the view opens, is deliberate.** A
   baseline captured the first time somebody presses Redline would be captured from whatever the file
   said at that moment, which may be mid-rewrite, and it would then be wrong for ever. The first read
   already happens: `loadContents` fills `savedContents` when the tab opens. **This is a distinction
   between tab-open and redline-mode-select, and neither of them precedes the agent** — see the
   correction to property 2.
4. **It never needs to know who wrote a byte,** which matters because it cannot (A4).

#### A1.3 The moments that are refused, and why

- **"When the session started"** is refused because it is not well defined. Several sessions touch one
  file, sessions outlive tabs and tabs outlive sessions, and a file opened an hour after a session
  started would take a baseline from a state nobody ever saw. It also makes the baseline depend on the
  agent layer, which is the wrong direction: the redline is about a file, not about a session.
- **"On an explicit gesture only"**, with no seed, is refused because it asks the person to press
  something *before* the agent runs, and the one thing they cannot know is when the agent is about to
  write. It would be a feature that only works if you predicted you would need it.
- **A hook** is refused as the trigger. Claude Code's `PostToolUse` does reach Tortie, and a payload
  carrying `tool_input.file_path` arrives at `src/main/activity/hooks.ts` — but that file's own opening
  rule is that *"nothing here may ever be load-bearing"*, only claude ships hooks at all (codex is
  refused there by name because it needs `--dangerously-bypass-hook-trust`), and the event map keeps a
  state word and discards the body. A baseline moment that exists for one of the agents Tortie
  supports is not a baseline moment.

### A2. When does it move forward?

#### A2.1 The growth, measured, because "grows without bound" is a claim about numbers

`.p222/m3-unbounded.ts` applies forty successive agent-shaped edits to the same 8 KB document and
composes the redline at each of two baselines.

```
n   baseline = OPEN (V0)                      baseline = LAST DEALT WITH (V n-1)
    del  ins  chars   compose ms              del  ins  chars   compose ms
  1    1    1     13       7.71                 1    1     13       0.22
  5    5    5     68       0.57                 1    1     16       0.19
 10   10   10    130       0.73                 1    1     11       0.16
 20   20   20    242       1.50                 1    1      9       0.13
 40   40   40    488       2.56                 1    1     11       0.09
```

Linear, and it never comes down. Forty small edits is a modest afternoon. **That table is unaffected
by every cap** — `docs/ZEN-OF-TORTIE.md`'s longest line is 80 characters and 40 changes is under
`REDLINE_MAX_BLOCKS` = 60 — so its 488 characters over 40 edits, about twelve each, is the honest
shape of the growth and is the number the corrected large-file reading below agrees with.

**The large-file table below was published with a blind instrument and its conclusion was wrong. This
is the corrected one, and the correction is the fix round's.** `.p222/m4-scale.ts` printed
`skipped=${doc.skipped ?? 0}`, and `RedlineDocument` has no `skipped` field — it has `whole`
(`redline-document.ts:145`) — so all six rows printed a constant `skipped=0` and the caps that were
firing were invisible. Re-run with `whole` restored (`.p222/fix/m4-whole.ts`), over the same document
and the same edit shape, the numbers reproduce byte for byte and say something else:

(`tooDifferent` and `unaligned` are 0 in every row and are elided from the `whole` column here; the
committed output at `.p222/fix/out-m4-whole.txt` prints all four.)

```
CLAUDE.md, 125,831 bytes, 362 lines, one word changed per write on a line over 70 characters
after   1 agent writes: del=   1 ins=   1 markedChars=   13 blocks=  1 whole={tooBig:0, overCap: 0} compose= 7.3ms
after  10 agent writes: del=  10 ins=  10 markedChars=  123 blocks= 10 whole={tooBig:0, overCap: 0} compose= 1.9ms
after  50 agent writes: del=  50 ins=  50 markedChars=13719 blocks= 35 whole={tooBig:1, overCap: 0} compose= 8.1ms
after 100 agent writes: del= 100 ins= 100 markedChars=29437 blocks= 55 whole={tooBig:2, overCap: 0} compose=14.3ms
after 200 agent writes: del= 175 ins= 175 markedChars=119109 blocks= 85 whole={tooBig:2, overCap:25} compose=18.6ms
after 400 agent writes: del= 203 ins= 203 markedChars=133860 blocks= 80 whole={tooBig:3, overCap:20} compose=25.3ms
```

**Almost none of that 119,109 is the redline's marking. It is the shipping caps drawing whole
blocks.** `.p222/fix/m4-attribute.ts` re-derives the same partition independently, applies the
composer's own block rules with and without `REDLINE_MAX_BLOCKS`, and attributes every marked
character. It agrees with the shipping compose to within 22–74 characters, which is `peelSharedSpace`
moving shared bytes into `same` runs:

| n | shipping markedChars | from blocks drawn WHOLE | from word-level runs | with the block cap removed |
| --- | --- | --- | --- | --- |
| 50 | 13,719 | 13,105 in 1 block | **636** | 13,741 (unchanged) |
| 100 | 29,437 | 28,222 in 2 blocks | **1,239** | 29,461 (unchanged) |
| 200 | 119,109 | 117,347 in 27 blocks | **1,836** | 62,175 |
| 400 | 133,860 | 131,694 in 23 blocks | **2,212** | 91,260 |

At 200 writes **98.5 %** of the marked characters come from blocks drawn whole, and the reason is
`CLAUDE.md`'s own shape: it holds **7 lines longer than `REDLINE_MAX_BLOCK_CHARS` = 4,000**, with a
maximum of 9,339, so a single word changed on one of them marks the whole paragraph twice over, once
struck through and once inserted. Past 60 changes `REDLINE_MAX_BLOCKS` does the same to every block
after the sixtieth.

**Run over a large prose file whose lines are ordinary, the picture is quite different**
(`.p222/fix/m4-ordinary.ts`, `docs/BACKLOG.md`, 2,660,698 bytes, 23,321 lines, edits confined to
lines between 70 and 400 characters so no block can be too big):

```
docs/BACKLOG.md, 2,660,698 bytes, 23,321 lines; no block is ever too big, so overCap is the only cap
after   1 writes: markedChars=    11 (0.00%) blocks=  1 whole={overCap:  0}
after  10 writes: markedChars=   120 (0.00%) blocks= 10 whole={overCap:  0}
after  50 writes: markedChars=   608 (0.02%) blocks= 50 whole={overCap:  0}
after 100 writes: markedChars= 10751 (0.40%) blocks=100 whole={overCap: 40}
after 200 writes: markedChars= 32635 (1.23%) blocks=200 whole={overCap:140}
after 400 writes: markedChars= 76421 (2.87%) blocks=400 whole={overCap:340}
```

Below sixty changes, where no cap fires at all, fifty edits mark **608 characters**, about twelve
each. Above sixty, every further change is drawn whole and the marked count stops being about the
edits and starts being about the size of the paragraphs holding them.

**Four sentences of the draft, judged one at a time.**

- *"At 200 writes, 119,109 of about 126,000 characters are marked"* is true and misleading: 117,347
  of them are two-sided whole-block draws on a document with 9 KB lines, not the accumulated redline.
- *"The whole document is a redline"* is right about what a person would see, and wrong about why.
- *"No cap, cost guard or virtualisation addresses it"* is refuted twice. The caps do not fail to
  address it; **they produce most of it.**
- *"Only a baseline that moves does"* **survives, and now has a measured reason it did not have**: a
  baseline that moves keeps the change count under `REDLINE_MAX_BLOCKS` = 60, which is exactly the
  boundary at which the marked count stops tracking the edits. The word-level growth itself is linear
  and small — 636, 1,239, 1,836, 2,212 characters over 50 to 400 edits — and it is the whole-draw
  cliff at 60 changes, not the accumulation, that makes the view unreadable.

A build phase inherits one obligation from this correction: **a redline drawn against a baseline must
report `doc.whole` on its own face** the way `redlineDocumentNote` already does, because a person
looking at a page of red cannot otherwise tell an agent's rewrite from a cap that fired.

#### A2.2 What advances it

**Two gestures, both the person's, and nothing else.**

1. **Accept.** Accepting is the baseline advancing, and the charter's guess that this "may be one line
   of state" is right. Accepting the whole file sets the baseline to what is in front of the person.
2. **A commit that includes the file — and the fix round narrowed this one, because the premise is
   false in this product.** The draft's reason was *"when a person commits, they have declared the
   file theirs"*. **In Tortie, agents commit.** `CLAUDE.md`'s own operating contract says *"Commit per
   phase"* and *"The committer is the last agent"*, and it is the ordinary rhythm of the product this
   feature lives in. An agent that commits mid-work would erase the person's ability to rewind the
   very edits that agent had just made, which is thread 150230 in section E.9 happening inside Tortie
   rather than in Cursor — and E.9 names that class of failure as the real difference between what he
   asked for and what Cursor ships. **The two sections cannot both stand as first written, and this
   is the one that gives way.** Either the commit-advance is refused outright, or it is qualified to a
   commit the PERSON made in this window, which Tortie can tell because it is the window the commit
   was issued from. This document recommends the qualification and records that the refusal is also a
   defensible answer, since accept alone already bounds the growth.

   With the qualification, the redline's span is *"since your last commit or your last accept,
   whichever is later"*, which is strictly narrower than today's *"since your last commit"* and never
   wider; without it, an agent's commit silently makes the span zero.

**Accepting ONE change is the same mechanism, not a different one**, and it is worth writing down here
because it is where the crux dissolution pays off a second time. The baseline is text. Accepting run
*n* means the new baseline is *the document with run n's new text taken and every other run's old text
kept*, which is the exact mirror of rewinding run *n*. Both are compositions over the same run list and
neither needs anything from git. (The rewind half is section E's; what matters here is that
per-change accept costs the baseline nothing beyond being writable.) **It costs one thing more, added
by the fix round: it moves the baseline, and every drawn rewind control is an offset INTO the
baseline. B.8a is the guard, and it applies to this gesture as much as to a commit.**

#### A2.3 What does NOT advance it, stated as refusals because each is a one-line mistake

- **The file changing.** Policy Z above. It is the whole feature, deleted.
- **The person typing, or saving their own typing.** Their edit shows in the redline as an insertion,
  which is honest — the view's claim is "this changed since the baseline", not "the agent did this" —
  and the alternative asks the file to remember an author it does not have (A4). **This refusal is
  right and it has a price the fix round measured**, being that the person's own uncommitted
  paragraphs then carry rewind controls on a surface whose verb means undo. A8a is that case, it needs
  no staleness and no mistake, and the mitigation A4.2 ruling 1 offers for it is copy rather than
  mechanism.
- **The redline view being opened, scrolled or closed.** A baseline that advances because you looked is
  a baseline that silently swallows an edit that arrived while you were looking away and back. That is
  precisely the Zen's *"come back without reconstruction"* broken by the thing meant to serve it. This
  is why the rule in A1.2 says "dealt with" and not "looked at": **"last look" is correct as an intent
  and wrong as a trigger.**
- **A session starting or ending, a tab closing, the app quitting.** Reopening a file must show the
  same thing it showed before.
- **A rewind.** A rewind moves the file toward the baseline; it does not move the baseline. If it did,
  rewinding twice would mean two different things.

### A3. Where does it live?

#### A3.1 The size class, measured

The 219 `.md` and `.txt` files in this tree, `.git` and `node_modules` excluded:

```
n=219  total=9,780,444 bytes (9.33 MB)
min=27  p50=25,001  p90=71,172  p99=155,780  max=2,658,585  mean=44,660
```

The maximum is `docs/BACKLOG.md`. Two structural bounds already in the tree cap this without any new
rule: `READ_CAP_BYTES = 5 * 1024 * 1024` at `src/main/fs/ipc.ts:57`, past which a read comes back
`truncated`; and a truncated tab is refused by `save` outright (`src/renderer/editor/tab-io.ts:465`
and `:552`, `if (tab.deleted || tab.truncated || tab.error !== null) return false`) and is read-only
in Monaco (`MonacoHost.tsx:167`). So no baseline can exceed 5 MB. `MAX_TABS = 10`
(`src/renderer/editor/store.ts:100`) bounds how many can be live at once.

**The draft went one clause further than the tree supports and the fix round removed it.** It said
that a file at the cap *"can never be rewound and never needs a baseline at all"*, and that rests
entirely on `save` being the only way bytes reach the file. **Section E.5's whole recommendation is a
new channel that is not `save`**, so the design routes around the only guard this paragraph leans on,
and E.7's press-time re-read is not `save` either. Driven, the consequence is not theoretical: see
**E.7a**, where a rewind over a truncated read dropped 98,110 bytes in one arm and silently reverted
a 5,895,890-byte document to its baseline in another. The refusal has to be restated where the write
is, and it is.

**Worst realistic live set: ten prose tabs at this tree's p90 is 712 KB.**

#### A3.2 The five homes, priced

| Home | Write cost | Lost when | What a person loses |
| --- | --- | --- | --- |
| **In memory, on the tab** | free (a reference to a string the tab already holds) | tab close, LRU eviction past 10 tabs, window reload, quit, crash | the narrowing; the view falls back to HEAD |
| **`localStorage`** | synchronous, on the renderer's main thread | cleared site data, a fresh profile | same, plus it is the wrong size class |
| **Beside the file in the repo** | one write | the person deletes it | — **refused**, see below |
| **`<userData>/gmux/baselines/` via `src/main/durable`** | **measured**: 9.0 ms median at 126 KB, 15.1 ms at 2.66 MB | the directory being lost | same as in memory |
| **The manifest (SQLite)** | a table, a migration, a WAL | manifest recovery | same — **refused**, see below |

The durable numbers are `.p222/m1-durable-cost.ts`, ten runs each through the **shipping**
`writeDurable` in `src/main/durable/write.ts`, which is the sequence research 34 §4 specifies and the
only place in the product allowed to implement it:

```
ZEN-OF-TORTIE.md (5 KB, a small doc)     bytes=    7998 min= 7.9ms median= 9.0ms max=11.9ms
CLAUDE.md (126 KB, this tree p99)        bytes=  125874 min= 8.9ms median=10.0ms max=11.9ms
BACKLOG.md (2.66 MB, this tree max)      bytes= 2658585 min=14.8ms median=15.1ms max=16.9ms
```

**Beside the file is refused.** It writes into the person's repository, at a path Tortie chose, which
would either be committed by the next `git add -A` or need an ignore entry Tortie does not own. It is
the same posture as the tmux rule in `CLAUDE.md`: do not touch state you did not create.

**The manifest is refused, and there is a precedent in the tree that already decided this exact
question the same way.** `src/main/restore/snapshots.ts` records, at length and by name, that research
34 §4 step 9 puts the completion record in the manifest and that snapshots deliberately keep it in a
file instead — *"a KNOWN, RECORDED DEVIATION rather than an oversight"*. The reason applies here with
more force: the manifest is the source of truth for restore, it is 2.3 MB with a 4.1 MB WAL on the
operator's machine right now, and it is recovered on every boot. Growing it with prose blobs, for data
whose loss costs nothing (A3.4), buys a second durability domain for the wrong half of the product.

**`localStorage` is refused** on shape rather than on a number. It is synchronous on the renderer's
main thread, it is per-viewer, and `CLAUDE.md`'s own guidance is that `gmux.*` keys hold per-viewer
conveniences — a remembered mode, a width. A 2.66 MB string is not that. *The per-origin quota was NOT
measured, because measuring it needs an Electron and this phase runs none; the refusal does not rest
on it.*

#### A3.3 The recommendation

**Version one holds the baseline in memory, on the tab, and writes nothing to disk. The durable store
is the second step, its home is `<userData>/gmux/baselines/`, its mechanism is `src/main/durable`, and
its price is already measured above so nobody has to re-derive it.**

The reason for that order is A3.4, and it is the only reason. If losing the baseline cost a person
their prose, this recommendation would invert immediately.

If and when it becomes durable, three things are already decided by the tree and should not be
re-argued: the key shape is `(repo_path, rel_path)`, which is what `symbol_file`
(`src/main/symbols/persist.ts:75`) and `arch_tree_file` (`src/main/arch/db.ts:386`) both use; the write
goes through `writeDurable` and nothing hand-rolled; and the ring is generations with a prune after the
record commits, which is `SNAPSHOT_GENERATIONS = 3` next door.

#### A3.4 If a baseline is lost, what does a person lose?

**Almost always: the narrowing, and nothing else.** The view widens back to "since HEAD", which is
exactly the redline that ships today. For an untracked file it falls back to nothing, which is also
exactly what ships today. Nothing that is on disk is at risk, because the baseline is a *previous*
state of a file whose *current* state is on disk and whose *committed* state is in git.

**There is one case where the baseline holds the only copy, and it must not be waved past.** A person
writes a paragraph, does not commit, an agent rewrites it, the baseline is lost. That paragraph is then
gone. Two facts make this worth stating carefully.

**First: it is already gone today, and worse than most people assume.** When the watcher notices an
agent's write, `refreshRepo` re-reads the clean tab and calls `resetWorkingModel`
(`src/renderer/editor/tab-io.ts:624`), which is `model.setValue(contents)`
(`src/renderer/editor/monaco-loader.ts:135`). Read from the installed **monaco-editor 0.56.0** on
2026-09-07, `setValue` reaches `_setValueFromTextBuffer`
(`node_modules/monaco-editor/esm/vs/editor/common/model/textModel.js:329`), whose body contains, under
the comment `// Destroy my edit history and settings`, the line `this._commandManager.clear()`.
**So an agent overwriting a prose file destroys that tab's Monaco undo stack.** ⌘Z gives the person
nothing. Today there is no undo of an agent's prose edit anywhere in Tortie. An in-memory baseline is
the first one there has ever been, and it is a strict improvement even in the moment it is lost.

**Second: the danger is not the loss, it is the belief.** A baseline that people rely on is a backup,
and Tortie must never let it read as one. **The surface says what the baseline is and when it was
taken, and never implies the old text is kept anywhere.** A person who believes Tortie is holding their
history will stop committing, and that is a worse outcome than the feature not existing. This is the
one place in this section where a copy decision is a correctness decision.

### A4. What happens when the file changes outside Tortie?

#### A4.1 The thing a baseline can never do

**A file records no author.** Tortie sees bytes at a path changing and cannot tell an agent's write from
another editor's save from `git checkout` from the person's own hand. `.p222/m5-outside.ts` makes that
concrete with real git rather than an argument: a baseline was pinned on a feature branch in a scratch
repository made for the purpose, then `git checkout main` moved the file underneath it. The two
resulting files are committed at `.p222/a-baseline-fixtures/` so the reading re-runs without the
repository. What the **shipping** composer then draws:

```
baseline=8026B  after=7990B
the redline reads: del=3 (43 chars) ins=2 (7 chars) blocks=2
  del "home"                              ins "place"
  del "that weight"                       ins "it"
  del ", quietly and without asking"
```

The person's own committed word is struck through in red, and the branch they just switched *to* is
drawn in green as if an agent had inserted it. It is a perfectly correct answer to "what changed since
the baseline" and a completely wrong answer to the question the person is actually asking.

#### A4.2 Three rulings

1. **The view never says an agent did it.** It says what changed since a named baseline, and it names
   the baseline on its face — *"since you accepted, 14:02"*, *"since the last commit"*. This is not
   hedging; it is the only claim the mechanism can support, and it is also the claim that survives the
   person's own typing showing up (A2.3).
2. **When HEAD moves, the baseline is re-seeded from the new HEAD version.** A branch switch, a stash, a
   pull and a rebase all move HEAD, and the re-seed turns the picture above into an empty redline, which
   is the truthful one. **This costs nothing new**: `RepoWatcher` already runs a dedicated dotgit
   subscription filtered down to `.git/HEAD` and `.git/refs/**` (`src/main/watcher/repo-watcher.ts`),
   and `refreshRepo` already re-runs `git show HEAD:<path>` on every tick (`tab-io.ts:640`). The signal
   is in the product; only the rule is new.

   **Two caveats the fix round added, because this ruling is the first of the three things A8 says
   stop the worst case and it cannot fire in the case that creates it.** First, the signal is
   in-process and lazy: `ensureWatcher` (`src/main/git/ipc.ts:109`) starts the subscription the first
   time a git channel is asked about that repository, and it dies with the process. **Quit Tortie,
   `git checkout other-branch`, relaunch** and HEAD moved while nothing was watching, and nothing in
   this document compares the baseline to HEAD at load. That is moot for version one, whose baseline
   dies with the process anyway, and it becomes live the moment A3.3's durable second step lands —
   which A3.3 does not say. **A durable baseline must compare itself to HEAD when it is loaded, not
   only when the watcher ticks.** Second, A1.2's rule says *"the newest of"* three versions and never
   defines the ordering. Under a timestamp reading a checkout to an OLDER commit leaves a stale
   accepted baseline winning, which is precisely the case A8 draws. **The ordering has to be stated:
   a HEAD version that Tortie has not seen before wins outright, whatever its date**, because the
   question the redline answers is "what has changed since you last dealt with it" and a checkout is
   dealing with it.
3. **The file moving under a redline that is already drawn is a REWIND hazard, not a baseline hazard,**
   and it belongs to section E with one fact it needs: **`fs:writeFile` has no precondition of any
   kind.** The handler is `await writeFile(abs, contents, 'utf8')` (`src/main/fs/ipc.ts:238`) — no mtime
   check, no size check, no `O_EXCL`, no `lstat`, and it follows a symlink. `save` in `tab-io.ts` calls
   it blind.

#### A4.3 The one hole this section cannot close, named rather than smoothed over

**A dirty tab does not refresh at all.** `refreshRepo` skips any tab with unsaved edits (`if
(!tab.dirty)` at `tab-io.ts:616`). So while the person is typing, the disk can move underneath them,
and the redline's right-hand side — which is the Monaco model via `useLiveTabText`, not the disk —
shows the person's buffer, not the file. That is a pre-existing condition, it is correct as far as it
goes (the right-hand side should always be *what is in front of the person*), and it means **"every
agent edit shows up" is false for exactly as long as a tab is dirty.** A build phase says so on the
surface rather than discovering it in a bug report.

### A5. Does a git worktree serve here at all?

**No. Say so plainly and do not build one.**

1. **A worktree holds commits, and the baseline is by definition a state that was never committed.**
   This is not a cost objection, it is a capability one: the thing the shadow baseline exists to
   represent — the file as it stood between two commits, after the person's own edit and before the
   agent's — cannot be checked out, because there is nothing to check out. A worktree could only ever
   reproduce what `git show HEAD:<path>` already gives for free.
2. **The price is real.** Measured on a 2,833-file scratch repository built from this tree's tracked
   files: `git worktree add --detach` took **0.51, 0.54 and 0.46 seconds** and put **109,064 KB** on
   disk, three times out of three.
3. **Tortie has never created a git worktree**, confirmed by grep over `src/main/git/`, and the
   product's standing posture toward machinery it did not create — the tmux rules in `CLAUDE.md` say it
   for tmux and the same argument holds for a person's git directory — is not to start.

**What it would buy if it were needed**, so the refusal is a judgement rather than a reflex: a worktree
gives you a whole tree at some commit, which is what you want if you intend to *run* something against
an old state — build it, test it, open a second editor on it. That is a different feature, it is not
what he asked for, and it is not a reason to put one under this one.

### A6. Does Tortie already have a home for this?

Read from the tree rather than assumed, so a build phase does not invent a store that exists.

**No existing store holds file CONTENT keyed by path. Two hold per-file STAMPS and one holds content
keyed by something else.**

- `symbol_file (repo_path, rel_path, mtime_ms, size, indexed_at)` at `src/main/symbols/persist.ts:75` —
  a freshness stamp, no bytes.
- `arch_tree_file (repo_key, rel_path, mtime_ms, size, lines, declares)` at `src/main/arch/db.ts:386` —
  the same shape, no bytes.
- The scrollback snapshots under `<userData>/gmux/snapshots/` — real content, real generations, real
  durability, but keyed by **session id**, not by file. 278 entries on the operator's machine today, in
  the `<sessionId>.txt.<generation>` plus `<sessionId>.capsules.json` layout.

The four SQLite databases under `<userData>/gmux/` on his machine right now are `manifest.db` (2.3 MB,
4.1 MB WAL), `arch.db` (4.5 MB), `overview.db` (3.1 MB) and `symbols.db` (36 MB). Only three modules in
the whole of `src/main` write through the durable module at all: `restore/snapshots.ts`,
`manifest/recovery.ts` and `manifest/reconstruct.ts`.

**So: reuse the MECHANISM, not a store.** `src/main/durable` is the thing that already exists and is
already the only place allowed to write a file the product cannot afford to lose. `(repo_path,
rel_path)` is the key shape the tree already uses twice. Neither is needed by version one, which holds
nothing on disk.

**One thing Tortie already knows that is worth recording here and NOT relying on.** `overview.db`'s
`turn_fact` table carries a `paths` column (`JSON PathMention[]`) and a `path_source` column per agent
turn, populated across every provider the overview reader supports
(`src/main/overview/store/schema.ts:73`, `src/main/overview/reader/paths.ts:13`). So Tortie can often
say which files a given turn touched. It is derived from transcript text as well as from tool calls
(`source: 'command' | 'tool' | 'text'`), it is capped at 200 paths a turn, and it lags the file system.
It is a fine hint and a bad foundation, and no part of the baseline should depend on it.

### A7. What delivers "every agent edit shows up", and where the Zen line sits

**It is already built for the ordinary case, and no new subscription is needed.** `RepoWatcher`
coalesces FSEvents into `onChange(repoPath)` on a 300 ms debounce, and `refreshRepo` re-reads every
clean worktree tab and updates `savedContents` (`tab-io.ts:616` to `:629`). The numbers in that
watcher's own header, banked by Phase 151, are **309, 310 and 311 ms median latency** and **27/28,
29/29, 29/29 edits surfaced within five seconds**; section C re-measured the same stream today at
**313 ms median, 8 of 8 edits seen**, and about **465 ms** end to end into the shipping renderer bus.

**The FSEvents exclusion budget is untouched, but section C is the authority on it and it is more
pointed than this paragraph first said.** `EXCLUSION_PATH_BUDGET = 8`
(`src/main/watcher/ignored-roots.ts:115`) is the cap above which the macOS API silently applies *zero*
exclusions. A baseline adds none, so `npm run conformance:watcher` prints the same four call sites
after this work as before it — and it is **four**, not two, being two settings directories plus the
worktree and dotgit streams. The reason nothing may be added is not comfort: section C drove the
shipping planner over his repository's eleven ignored roots and read **8 of 8 kernel paths with zero
free slots**. There is no room, and a ninth turns all eight off.

**And this paragraph's "every agent edit shows up" has one measured hole, which section C owns.** A
file inside a gitignored directory is seen **0 times out of 8**. His checkout has eleven ignored roots
today and `.specstory/` alone holds nine markdown and text files. Closing that is one `fs.watch` on
the active file's directory, which is measured there and which cannot touch the eight-path budget.

**The cost of being correct on arrival**, so that nothing has to stream (`.p222/m6-detect.mjs`, and the
compose column of A2.1):

```
docs/ZEN-OF-TORTIE.md    ~   8 KB   stat=0.0020ms  read=0.017ms  read+sha256=0.016ms
CLAUDE.md                ~ 126 KB   stat=0.0013ms  read=0.132ms  read+sha256=0.060ms
docs/BACKLOG.md          ~2658 KB   stat=0.0011ms  read=2.426ms  read+sha256=1.011ms
```

Noticing a change is one to two **microseconds**. Re-reading the largest prose file in this tree is
2.4 ms. Composing the redline is 0.09 ms to 28 ms, and the 28 ms case is a document that is 95 %
marked and unreadable for other reasons — **which A2.1's correction renames rather than removes**: the
95 % is the shipping caps drawing whole blocks on a file with 9 KB lines, and the cost argument is
unchanged either way, since 28 ms is nothing whatever produced it. A run over a large prose file with
ordinary lines composes 400 scattered edits in 52 ms, which is also nothing.

**That is the whole argument for where the Zen line sits.** The view can be recomputed from scratch
every time it is opened, at a cost no person can perceive, from a baseline and a file. It therefore
needs **no stream, no animation, no counter, no badge and no notification** — and the only thing that
ever moves the baseline is a gesture the person made. A surface that is correct whenever you look at it
is *"come back without reconstruction"*. A surface that tells you something arrived is *"Not a
supervisor's console"*. **The line is: nothing about this feature may ever run when the view is closed,
and nothing about it may ever ask for attention.** If a later round wants a dot on the tab saying
"changed", that is the refusal being crossed, and it should be argued as such rather than added as
polish.

### A8. The worst thing that happens when the baseline is wrong or missing

**Missing is benign and is the case to design for.** The view falls back to HEAD, which is what ships
today; for an untracked file it falls back to nothing, which is also what ships today. The person is
never worse off than they are now, and A3.4 shows they are better off even in the moment of loss,
because there is no other undo of an agent's prose edit in the product at all.

**Wrong is the danger, and its shape is measured.** The worst thing is a baseline that is stale in a way
that still looks plausible. `git checkout` is the reproduction (A4.1): the redline then draws the
person's own committed sentence struck through in red and the other branch's text inserted in green,
and it is not distinguishable on the face from an agent's edit. If the person rewinds that, they are not
undoing anything. **They are writing another branch's prose over their file, through an `fs:writeFile`
with no precondition, having read the screen as an undo.** That is the sentence to hold a build phase to.

Three things stop it, and all three are cheap: re-seed the baseline when HEAD moves (A4.2, the signal
already exists, **with that ruling's two caveats**); name the baseline on the face so a person can see
when it was taken; and make the rewind re-derive against the file as it is at the instant of the write
rather than as it was when the view was drawn.

### A8a. The loss that needs no staleness and no mistake, and it is the person's own writing

**The fix round's finding, and it is the easiest loss on this surface rather than the most exotic.**
A2.3 refuses on purpose to advance the baseline when the person types or saves. That refusal is right
— the alternative asks the file to remember an author it does not have — and its consequence is that
**the person's own uncommitted paragraphs sit in the redline as insertions, each with a rewind control
beside it, on a surface whose verb means "undo the agent".** Nothing on the face says who wrote a
byte, because A4.1 measured that nothing can.

Driven with a perfectly fresh baseline, no `git checkout`, no stale draw, and E.7's ARM 3 fully
applied (`.p222/fix/f5-own-prose.ts`): the baseline is the file at HEAD, the person writes a
149-byte paragraph and saves it, an agent tidies one sentence elsewhere, and the redline draws two
edits. The person presses the one that is their own paragraph.

```
the redline against a PERFECTLY FRESH baseline: 2 edits
   E0 at  21: "is" -> "ships"
   E1 at  35: ""   -> "\nWe should say plainly that the shadow baseline is not a bac"…
ARM 3: the identity resolves to 1 edit -> WROTE
  file 187 B -> 38 B      bytes of HIS OWN writing destroyed : 149
  his paragraph survives in the file : false
  ...in the baseline                 : false
  ...in the recomposed redline       : false
  ...anywhere in git                 : no — it was never committed
  ...in Monaco's undo stack          : no — resetWorkingModel calls setValue, which clears it (A3.4)
  what the person was told           : nothing; the write returned success
```

**Every guard this document proposes is satisfied and none of them is about this case.** The baseline
is correct, the press-time re-read is correct, the identity resolves to exactly one edit, the write is
what the person asked for. The loss is that they asked for the wrong thing, and the surface is what
invited it.

Three answers, and a build phase owes at least the second:

1. **Copy alone.** A4.2 ruling 1 already says the view never claims an agent did it, and names the
   baseline on its face. That is the whole mitigation the draft had, and it is copy against a
   destructive one-press control.
2. **The in-memory undo journal**, which section F.4 lists as a refusal item — *"a rewind must not
   ship without its undo"* — and which is this case's actual floor. E.8 prices it at tens of bytes an
   entry. It is not an extra; for this case it is the guard.
3. **Refuse to draw a rewind control on an edit that is entirely an insertion the person's own save
   put there.** Tortie cannot tell an author from a file (A4.1), but it CAN tell that the bytes
   arrived through its own `save` rather than through a watcher tick, because `save` runs in the
   renderer that owns the tab. That is a narrower claim than authorship and it is available for free.
   It is offered rather than recommended, because it is a surface decision and the operator's.

### A9. What was NOT verified in this section

- **No Electron was launched and no app was driven.** Every measurement is the shipping module run
  under node through the pinned `tsx`, or real `git`, or the real filesystem. The Monaco undo finding in
  A3.4 is read from the installed `monaco-editor` 0.56.0 source and from the shipping call site; **it
  was not observed in the running app**, and it is the first thing a build phase should confirm with
  one app run.
- **The `localStorage` quota was not measured**, for the same reason. The refusal in A3.2 rests on
  shape, not on a number.
- **No real agent wrote a file in any of this.** The agent edits in A1 to A4 are scripted string edits
  chosen to be plausible, not a recording of a session. Whether real agents write prose files
  atomically, and whether a watcher tick can therefore read a half-written file, is **UNMEASURED**.
- **The growth curves are one shape of edit**, being scattered single-word replacements. A rewrite of a
  whole paragraph reaches the "everything is marked" state faster than the tables suggest, not slower.
- **No number here was taken on the operator's own repositories.** The file-size distribution is this
  worktree; the git measurements are scratch repositories built for the purpose under `/private/tmp/`;
  the `<userData>` sizes in A6 are a read-only directory listing.
- **Nothing was measured about several windows or several projects** holding the same file open at
  once, which the in-memory recommendation makes a real question: two windows would hold two baselines
  and could disagree.

---

## B. Rewind, phrase by phrase, demonstrated rather than described

Every script in this section calls the **shipping** modules through the pinned `tsx`:
`composeRedlineDocument`, `oldTextOf` and `newTextOf` from
`src/renderer/editor/redline-document.ts`, and `redlineRuns` from `src/renderer/editor/redline.ts`,
which is jsdiff's `diffWords` with an `Intl.Segmenter` and `maxEditLength` 200. Nothing here
re-implements the diff. Scripts and captured outputs are under `.p222/b-rewind/`, consolidated at
`.p222/b-rewind/TRANSCRIPT.txt` (295 lines).

### B.1 The real paragraph, and the real bytes

BASELINE — one paragraph on one line, 477 bytes, md5 `32119ae9`:

```
Tortie keeps every session alive in a private tmux server, so closing the window is safe and a crash is an interruption to the interface rather than to the work. The application is a disposable client: it attaches to whatever is already running, draws it, and gets out of the way. When you come back the agent still knows what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be reconstructed from memory.
```

CURRENT — the same line after an agent made eight scattered edits, 464 bytes, md5 `8cc5e7a6`:

```
Tortie holds every session open in a private tmux server, so quitting the app is safe and a crash is an interruption to the interface rather than to the work. The application is a throwaway viewer: it attaches to whatever is already running and gets out of the way. When you come back the agent still knows exactly what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be rebuilt from memory.
```

### B.2 What the shipping path returns

`composeRedlineDocument(BASELINE, CURRENT)` gives `blocks 1, approximate false, whole {tooBig:0,
tooDifferent:0, overCap:0, unaligned:0}` and **23 runs**:

```
  0      same "Tortie "
  1 E 0 del  "keeps"
  2 E 0 ins  "holds"
  3      same " every session "
  4 E 1 del  "alive"
  5 E 1 ins  "open"
  6      same " in a private tmux server, so "
  7 E 2 del  "closing"
  8 E 2 ins  "quitting"
  9      same " the "
 10 E 3 del  "window"
 11 E 3 ins  "app"
 12      same " is safe and a crash is an interruption to the interface rather than to the work. The application is a "
 13 E 4 del  "disposable client"
 14 E 4 ins  "throwaway viewer"
 15      same ": it attaches to whatever is already running"
 16 E 5 del  ", draws it,"
 17      same " and gets out of the way. When you come back the agent still knows "
 18 E 6 ins  "exactly "
 19      same "what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be "
 20 E 7 del  "reconstructed"
 21 E 7 ins  "rebuilt"
 22      same " from memory.\n"
```

`oldTextOf(runs) === BASELINE` (md5 `32119ae9`) and `newTextOf(runs) === CURRENT` (md5 `8cc5e7a6`).
Phase 191's ruling 6 shows through at run 18: E6 is an insertion with no deletion beside it, and E5 is
a deletion with no insertion. Both are still rewindable.

**The unit of rewind is a maximal stretch of consecutive non-`same` runs.** The fixture gives eight of
them, which is exactly the eight things a person would point at. The grouping is not a choice with
alternatives worth pricing: a `same` run can never be empty, because `push` in `redline-document.ts`
refuses `''`, so consecutive non-`same` runs really are one place in the document.

### B.3 THE RULE, stated exactly

There is one function, and rewind and accept are that function pointed at different destinations. Let
`E` be the edits of the drawn run list, and let `T ⊆ E` be the edits that take the **inserted** side:

```
mix(runs, T) = concat over runs r:
    r.kind === 'same' → r.text
    r.kind === 'ins'  → r.text  if edit(r) ∈ T  else  ''
    r.kind === 'del'  → ''      if edit(r) ∈ T  else  r.text
```

Measured:

| | |
| --- | --- |
| `mix(runs, ∅)` | `=== BASELINE` and `=== oldTextOf(runs)`, both true |
| `mix(runs, E)` | `=== CURRENT` and `=== newTextOf(runs)`, both true |
| **rewind edit `e`** | write **the file** `:= mix(runs, E \ {e})`. The baseline does not move. |
| **accept edit `e`** | write **the baseline** `:= mix(runs, {e})`. The file does not move. |

**Reverting E4 in the middle**, `throwaway viewer` back to `disposable client`, gives 465 bytes,
md5 `cd918864`:

```
Tortie holds every session open in a private tmux server, so quitting the app is safe and a crash is an interruption to the interface rather than to the work. The application is a disposable client: it attaches to whatever is already running and gets out of the way. When you come back the agent still knows exactly what it was doing and why, because the conversation is resumed rather than restarted, and nothing you were waiting on has to be rebuilt from memory.
```

The only difference from CURRENT is at offset 180: `"throwaway viewer"` (16 bytes) becomes
`"disposable client"` (17 bytes). Every one of the other seven agent edits still stands. **The rewind
carries no state**: the set `T` never persists, it is one press's argument.

### B.4 The hard cases, each shown

#### B.4a Two adjacent runs, and where the phrase boundary really comes from

**A replacement collapses into one edit, and the boundary is jsdiff's rather than ours.**
`"We shipped the red lorry on Monday."` → `"We shipped a blue lorry on Monday."` gives ONE edit,
`del "the red" / ins "a blue"`. The same sentence to `"the blue van"` gives one edit,
`del "red lorry" / ins "blue van"`. A person cannot rewind *red → blue* there without also rewinding
*lorry → van*, because the shortest edit script never separated them. **That is a real limit of
"phrase by phrase" and it should be said to him plainly: the phrase is whatever jsdiff made
contiguous.**

**Two edits separated by a `same` run are fully independent.**
`"The red lorry and the red van both left."` → `"The blue lorry and the green van both left."`:

```
revert E0 only : "The red lorry and the green van both left.\n"
revert E1 only : "The blue lorry and the red van both left.\n"
revert both    : "The red lorry and the red van both left.\n"   === baseline: true
order-free (set union)                            : true
E0, then recompose, then E1, gives the same bytes  : true
```

**Can one maximal group hold more than one `del` and one `ins`?** Yes, rarely, and harmlessly. Over
3,999 fuzz pairs the largest group was **3 runs**, in **10 groups**, all of the shape the whitespace
repair in `exactRuns` produces (`del "\nclient" / ins " "`). Never more. A pure spacing change becomes
its own edit — `del "  " / ins ""` — which is a rewind control over invisible bytes. That is a surface
problem for section D, not a correctness one.

#### B.4b A run whose neighbours were already reverted

Driven sequentially, recomposing after each press:

```
before press: 8 edits  E0[keeps→holds] E1[alive→open] E2[closing→quitting] E3[window→app]
                       E4[disposable client→throwaway viewer] E5[, draws it,→] E6[→exactly ] E7[reconstructed→rebuilt]
pressing E0             file md5 c5847def, 464 bytes
before press: 7 edits   (E0 is gone; the rest are intact and renumbered)
pressing E2 window→app  file md5 fa26b6a0, 467 bytes
after two presses: 6 edits, both projections still exact
```

The neighbour case proper — revert E0 and E2, then the E1 that sits between them:

```
after reverting E0 and E2           : ba46346b
recomposed, E1 is intact            : "alive"→"open" present
after reverting the one between     : f7570724
equals reverting {E0,E1,E2} at once : true
```

**Edits do not interact.** Over the fuzz, **8,884 ordered pairs** were checked as "rewind A,
recompose, rewind B" against "rewind {A,B} in one pass": **0 mismatches**. That is why the mechanism
needs no state.

#### B.4c Rewinding the same run twice

Two readings, both benign. On one drawn list, pressing twice is a set insert: `mix` with `{E4}` and
with `{E4, E4}` give the same bytes, md5 `cd918864` both. And after the write the view recomposes and
**the pressed edit is gone** — 8 edits become 7, and `"disposable client"` is no longer among them.
There is no second press to make, because the control is not there. Nothing needs to guard a double
press.

#### B.4d The file changing between the draw and the press

This is the case that decides safety, so it was driven three ways. While the person read the view, the
agent appended a paragraph **and** changed a word elsewhere: disk becomes 552 bytes, md5 `2ebbc147`,
while the view still shows the draw of the 464-byte `8cc5e7a6`.

**ARM 1 — write the projection of the stale run list, which is the naive rewind.** Written md5
`cd918864`, 465 bytes:

```
the appended paragraph is GONE  : true
the other word change is GONE   : true
bytes of prose destroyed        : 87
```

**An unconditional write destroys work nobody asked to rewind**, and it is one line of code away by
default, because `gmux.fs.writeFile(path, contents)` writes the whole file with no expected bytes and
no mtime check (section E.4).

**ARM 2 — compare-and-swap on the drawn bytes.** `cas(CURRENT, MOVED)` refuses. Nothing is lost.
Nothing is rewound either, and the person has to look again and press again. Safe, and worse than it
needs to be.

**ARM 3 — re-derive at press time against the file as it is now.** Read the file, recompose against
the same baseline, find the pressed edit by identity, project that:

```
fresh edits: keeps→holds | alive→open | →", long-lived" | closing→quitting | window→app |
             disposable client→throwaway viewer | , draws it,→ | →exactly  |
             reconstructed→rebuilt | →"\nEvery session carries its own name…\n"
edits matching the pressed pair exactly: 1
written md5 5993a16a, 553 bytes
  the appended paragraph SURVIVES           : true
  the other word change SURVIVES            : true
  the pressed phrase is back to the baseline: true
  the rest of the agent work still stands   : true
```

**The identity that makes ARM 3 work is the BASELINE OFFSET, and it works because the baseline is the
one thing that does not move.** An edit is `(offset into the baseline, deleted text, inserted text)`.
On the fixture the eight drawn identities sit at baseline offsets 7, 27, 62, 74, 183, 244, 322 and
450, and after the file moved underneath **all eight still resolve to exactly one edit each** — the
fresh compose inserted a ninth at offset 45 and a tenth at 477 without disturbing any of them.

**Text alone is not an identity, and that is measured rather than argued.**
`"The disposable client is small. A disposable client is replaceable."` with both replaced gives
**two** edits matching the pressed pair by text, at offsets 4 and 34. By offset they are distinct:

```
rewind the FIRST : "The disposable client is small. A throwaway viewer is replaceable.\n"
rewind the SECOND: "The throwaway viewer is small. A disposable client is replaceable.\n"
```

**Baseline offsets are strictly increasing across the edits of one draw** — 2,998 random draws,
**0 non-increasing pairs** — so an offset names at most one edit, always. Two edits cannot share one,
because the `same` run between them is at least one character of the baseline.

**When ARM 3 must refuse, and it does.** Fuzz: 1,500 draws, an unrelated paragraph appended between
the draw and the press, the pressed identity resolved against the fresh compose:

```
checked: 1500   resolved to exactly one: 1472   none: 28   more than one: 0
of the unique ones, bytes differing from "the rewind plus the arrival": 0
```

**Zero ambiguous resolutions, ever.** The 28 refusals are all one shape:

```
pressed : at 353 "a."→"rewind!"
after   : at 353 "a"→"rewind!\nA new paragraph the agent wrote while you were reading"
```

The outside change landed **inside** the pressed edit and grew it. The offset still matches; the
deleted and inserted text no longer do. That is a merge conflict, and refusing is the only correct
answer, because rewinding the widened edit would throw away the arriving paragraph. **So the refusal
rule is one sentence: refuse when the outside change overlapped the phrase you pressed, and only
then.**

**The size of the race, read from the tree.** The redline's right-hand side is the Monaco model via
`useLiveTabText`, which debounces at `MODEL_SYNC_DEBOUNCE_MS = 150`. The model is refreshed from disk
by `refreshRepo` (`tab-io.ts:615`, clean buffers only), driven by `onRepoChanged` at
`REPO_CHANGED_DEBOUNCE_MS = 150`, driven by `RepoWatcher`'s 300 ms coalescing window, whose measured
median delivery is 309–313 ms. **So the drawn side trails disk by roughly 600–800 ms in the good
case**, and longer after an FSEvents drop. The stale window is routine, not exotic.

### B.5 Is there an accept at all?

**Yes, and it is the same function pointed at the baseline instead of the file. "Accept everything" is
one assignment:**

```
ACCEPT ALL : baseline := mix(runs, E) === the file bytes : true
             recomposed redline is empty                 : true (1 run, 0 blocks)
```

**Per-phrase accept falls out for free and writes nothing to the file:**

```
accept "disposable client"→"throwaway viewer"
  new baseline md5 a1e60e70, 476 bytes
  file unchanged md5 8cc5e7a6
  edits left: 7 of 8; the accepted phrase is gone from the redline: true
  and NOT ONE BYTE of the file changed: true
```

Note the asymmetry, because it is why accept is the safe half: **a rewind writes his prose file; a
per-phrase accept writes only Tortie's own shadow copy.** He asked for rewind and never asked for
per-phrase accept. It is recorded here as available at zero extra mechanism whenever he wants it, and
section F still keeps it out of a first version for surface reasons.

### B.6 What is undo of a rewind?

**Measured: after the rewind, the agent's words are gone from every durable thing Tortie holds.**

```
after rewinding E4, is "throwaway viewer" anywhere in
  the file       : false
  the baseline   : false
  the new redline: false
```

The inverse edit is small and exactly known at press time — `replace "disposable client" with
"throwaway viewer"` at a baseline offset, being **16 bytes of insertion, 17 of deletion and one
integer** for this edit. Three answers, priced:

1. **Monaco's own undo stack, which would cost nothing — and is destroyed by the very thing this
   feature exists for.** If a rewind is applied as `model.pushEditOperations(...)` rather than a file
   write, ⌘Z is the undo and it is free and exact;
   `monaco-editor/esm/vs/editor/editor.api.d.ts:2352` calls it "the preferred way… the edit operations
   will land on the undo stack" and warns at `:2367` that `applyEdits` "can have dire consequences on
   the undo stack". But `resetWorkingModel` (`monaco-loader.ts:135`) calls `model.setValue`, and
   `textModel.js:342-343` in the installed 0.56.0 reads `// Destroy my edit history and settings` then
   `this._commandManager.clear()`. `refreshRepo` calls `resetWorkingModel` on every clean-buffer
   reload, so **the next agent edit to that file clears the person's pending ⌘Z.** (Read from the
   installed source today, not run: constructing a `TextModel` under node needs Monaco's instantiation
   service.) A phase that wants ⌘Z to be the answer must change that reload path, which is a change to
   a file this feature does not otherwise touch.
2. **A bounded in-memory journal of the last N rewinds**, each `(baseline offset, deleted, inserted)`
   — tens of bytes each, independent of Monaco entirely.
3. **Nothing.** The person retypes. Defensible only because a rewind is small by construction.

Whichever is chosen, say it on the face, because the honest reading of the measurement is that
**without one of the first two, a rewind is not undoable from anything Tortie keeps.**

### B.7 Phase 194's correctness property, strengthened under the baseline model

Phase 194's claim, in `redline-document.ts`'s own header: *"The composed runs with every `ins` removed
equal the OLD file byte for byte, and with every `del` removed they equal the NEW file byte for
byte."* Under this model OLD is the shadow baseline and NEW is the bytes on disk. **The words are
unchanged.** What this phase adds is that those two are the **endpoints of one family**.

Checked exhaustively over all 2⁸ = 256 subsets of the fixture's eight edits: for every `T ⊆ E`,
recomposing the baseline against `mix(T)` gives `oldTextOf === BASELINE`, `newTextOf === mix(T)`, and
exactly `|T|` edits remaining.

```
subsets checked : 256
distinct files  : 256  (all 256 give distinct bytes: true)
projection failures  : 0
edit-count mismatches: 0
mix({})  md5 32119ae9 === BASELINE 32119ae9
mix(all) md5 8cc5e7a6 === CURRENT  8cc5e7a6
```

And beyond the one example: **400 random prose pairs, 4,126 subsets, 0 projection failures, 0
edit-count mismatches**, plus a separate corpus of **3,999 pairs with 0 projection failures**.

*One honest note on method: the first run of the exhaustive check reported 186 mismatches. The bug was
the probe's own — it had written `|E \ T|` where the property is `|T|`. Corrected, rerun, zero. The
projection checks were green in both runs.*

### B.8 The verdict on the stale-file case

**Survivable, and only under one specific rule.**

- **Writing the projection of the drawn run list is not survivable.** It destroyed 87 bytes of prose
  the agent wrote while the person was reading, in the first case tried, and the stale window it needs
  is 600–800 ms of ordinary operation.
- **The rule that makes it survivable:** a rewind carries `(baseline offset, deleted text, inserted
  text)`, never a run index and never the drawn bytes. At press time, re-read the file, recompose
  against the same baseline, and act **only if that identity resolves to exactly one edit**. Then
  write `mix(freshRuns, E' \ {that edit})`. If it resolves to none, **refuse, redraw, and say the
  phrase moved.** Measured at 1,472 of 1,500 proceeding correctly with the arriving work intact, 28
  refusing, 0 ever ambiguous, and 0 producing bytes other than "the rewind plus whatever arrived".
- **The safety argument rests on one property: the baseline is immutable during the press.** An offset
  into it cannot shift under an outside edit. **A design that advanced the baseline on a timer would
  break this**, which is a second reason for section A2.3's refusals. **That sentence was asserted and
  it is not true as this document's own A2.2 leaves it — B.8a is the guard it needs.**
- **A plain compare-and-swap is the fallback if the identity scheme is judged too clever.** It is
  honest and strictly worse: it refuses in every case where the file moved at all, including the 1,472
  where the rewind was perfectly well defined.
- **Two things this cannot make safe on its own**, and a build phase owns both: the write itself,
  because `fs:writeFile` takes no expected bytes, so the compare would have to happen in the renderer
  against a just-read copy, which is a narrower guarantee than an atomic swap in main (section E.5
  assembles the parts that fix it); and `npm run conformance:redline` rule 9, which goes red the day
  rewind ships and must be narrowed deliberately rather than deleted (section F.3a).

### B.8a. The guard the draft never stated: a press is bound to the baseline generation it was drawn against

**The fix round's second finding, and it resurrects through the baseline the exact failure E.7
rejects through the index.** B.8's whole safety argument is that the baseline does not move during the
press. The draft rested that on A2.3's refusals — and A2.3 refuses the file changing, the person
typing, looking, session lifecycle and a rewind. **It does not refuse either of the two things A2.2
says DO advance the baseline**, being an accept and a commit, and both are asynchronous with a press:
a commit can be an agent's (see A2.2's correction), and an accept can come from a second window on the
same file, which A9 already records as unmeasured.

Constructed and driven with the shipping composer (`.p222/fix/f2-baseline-moved.ts`). A document with
two IDENTICAL phrases, and a heading clause the agent deleted whose length is exactly the gap between
their two baseline offsets:

```
--- the draw the person is looking at ---
drawn: 3 edits
   E0 at baseline offset  20  ", filed on the Tuesday of that week." -> ""
   E1 at baseline offset  86  "red" -> "blue"
   E2 at baseline offset 122  "red" -> "blue"
the person presses the FIRST lorry: (offset 86, "red" -> "blue")

--- the baseline advanced: the heading edit was accepted (B.5's per-phrase accept) ---
baseline 137 B -> 101 B  (shrank by 36)

--- ARM 3 at press time: re-read the file, recompose against the baseline ---
fresh: 2 edits
   E0 at baseline offset  50  "red" -> "blue"
   E1 at baseline offset  86  "red" -> "blue"

the pressed identity resolves to 1 edit(s) — ARM 3 says WRITE
   and the edit it resolved to is E1, which is the SECOND lorry — not the one pressed

   "The consignment note is here."
   "The first lorry was blue on Monday."
   "The second lorry was red on Friday."

  the phrase pressed (FIRST lorry) is back  : false
  a phrase NOT pressed (SECOND) was rewound : true
  what the person was told                  : nothing; the write returned success
```

**Every stated guard was satisfied.** The re-read was fresh, the recompose was against the baseline,
the identity resolved to exactly one edit, and the write succeeded. It is E.7's own sentence about
index identity — *"both writes succeed, so nothing would have said a word"* — reappearing through the
baseline, because the identity's coordinate system moved while the identity did not.

**The guard is one integer and it costs nothing.** The baseline carries a generation number that
increments on every advance. A drawn run list carries the generation it was composed against. At press
time, before anything is read or written:

> **If the baseline generation is not the one the view was drawn against, refuse, redraw, and say the
> baseline moved.** Only then do the re-read, the recompose and the identity resolution of E.7.

It is strictly cheaper than the identity scheme it protects, it needs no new state beyond one counter,
and it is the reason B.8's invariant is true rather than an assumption that it is. **A2.3's refusals
are what keep the generation from moving often; this is what makes it safe that it moves at all.**

---

## C. "All agent edits at any time would show up" — what actually delivers that, and what it costs

Everything in this section is measured on 2026-09-07 in this worktree at `24f0e7a`, on node
22.23.1 and the Electron 43.3.0 the tree pins. The probes are named against every number; they
launch no Electron, start no tmux server, spend no token, and every process and every watch handle
they start is released in a `finally`. Nothing under his home was written.

### C.0 The short answer

**Almost all of it already ships, and the part that does not is a hole rather than a cost.** The
chain that re-reads an open file when an agent writes to it exists today, has five peers on the same
signal, and consumes **zero** new FSEvents subscriptions and **zero** exclusion paths. What it does
not cover is a file the repository *ignores*, a file outside every open project, and the first few
milliseconds after a tab switch. Closing those is one `fs.watch` handle on the active file's
directory, and `fs.watch` is structurally incapable of touching the eight path budget — measured
below at the symbol level rather than argued.

The recommendation is therefore: **ride the existing bus, add one directory watch for the active
prose file only, and never let either of them be what makes the view correct.**

---

### C.1 What already exists, read from the tree rather than assumed

`npm run conformance:watcher`, run in this worktree, prints the whole watching surface of the
product in four rows:

```
CALL SITE                                      IGNORE     PLAIN  USERSPACE
config/store.ts:396                            none       -      -
machines/store.ts:432                          none       -      -
watcher/repo-watcher.ts:250                    computed   -      -
watcher/repo-watcher.ts:431                    literal    5      0
```

Four `watcher.subscribe` call sites in the whole of `src/main`. Two of them watch a settings
directory. The other two are `RepoWatcher`'s worktree stream and its targeted dotgit stream.

That worktree stream's single `onChange(repoPath)` feeds `src/main/watcher/bus.ts`, and the bus
already has **five** main-side consumers: git (`git/ipc.ts:102`), quick open (`quickopen/ipc.ts:46`),
the arch checker (`arch/watch.ts:98`), actions (`actions/service.ts:565`) and symbols
(`symbols/service.ts:120`). `bus.ts` exists precisely so a consumer can be added **without** a second
FSEvents subscription, and says so in its own header.

On the renderer side there are five more, over one shared 150 ms debounce in
`src/renderer/state/repo-changed.ts`: the tree, the git store, the run list, the history depth store,
and — the one that matters here — **the editor store**, at `src/renderer/editor/store.ts:353`.

And what the editor store does with it is already the thing he is asking for.
`src/renderer/editor/tab-io.ts:573`'s `refreshRepo` walks every worktree tab in that repository and,
for a clean buffer, does exactly this:

```ts
const result = await gmux.fs.readFile(tab.path);
if (result.contents !== tab.savedContents) {
  deps.patch(tab.id, { savedContents: result.contents, truncated: result.truncated });
  resetWorkingModel(tab.id, result.contents);
}
```

The comment above it reads *"Reload clean buffers so the editor tracks the agent's edits."* From
there `useLiveTabText` (`src/renderer/editor/live-text.ts`) hands the new text to
`RedlineDocument`'s `useMemo`, which re-composes. **The pipe from an agent's write to a recomposed
redline is already connected end to end.** Nothing in question C has to be invented; it has to be
finished.

### C.2 The three candidate mechanisms, priced

#### Arm 1 — the bus that already exists

Driven with the **shipping** `RepoWatcher` over a scratch repository built to his own checkout's
shape (`.p222/probe-watch.mts`, output `.p222/out-probe-watch.txt`), eight edits to a tracked
`doc.md`, 900 ms apart:

| run | edits seen | latencies (ms) | median |
| --- | --- | --- | --- |
| 1 | 8 / 8 | 313 313 313 313 315 313 315 315 | 313 |
| 2 | 8 / 8 | 305 313 313 313 314 313 307 313 | 313 |

That 313 ms is the 300 ms non-resetting debounce and essentially nothing else, which agrees with
Phase 151's own recorded 309–311 ms.

End to end, driving the shipping `RepoWatcher` **into** the shipping renderer bus
(`.p222/probe-chain.mts`), eight edits a second apart, twice:

| run | main `onChange` | main median | renderer tick | renderer median |
| --- | --- | --- | --- | --- |
| 1 | 7 / 8 | 359 ms | 7 / 8 | 510 ms |
| 2 | 8 / 8 | 314 ms | 8 / 8 | **465 ms** |

Call it **about half a second from an agent's write to the surface that re-reads the file**, in one
process with no IPC hop counted. That is well inside "correct whenever you look at it" and nowhere
near a live stream.

One honest detail, seen in run 1 and not in run 2: 7 of the 8 edits produced their own tick, because
the 300 ms window is **non-resetting** and two edits can land inside one. That is not a lost edit.
The read is of the file as it stands, so the *result* of every edit shows up; not every edit gets its
own notification. For a redline of baseline against current, that is the behaviour you want, and it
is why the claim to make is "every edit shows up" rather than "every edit is announced".

**And here is what arm 1 cannot see.** The same probe drove eight edits to `.specstory/notes.md`,
inside a directory the repository ignores:

```
tracked doc.md               : 8/8 edits seen, median 313 ms
.specstory/notes.md (ignored): 0/8 edits seen
```

**Zero of eight.** Phase 151 spends the eight kernel slots on the repository's own ignored roots, and
anything past them gets a userspace matcher; either way the events never reach JavaScript. This is
not hypothetical for him. Read from his own checkout on 2026-09-07 (a read, nothing written), it has
**eleven** ignored roots today — `.antigravitycli`, `.playwright-mcp`, `.specstory`, `.tmp`, `.tsc`,
`build/vendor`, `demo/dist`, `docs/arch`, `node_modules`, `out`, `release` — and `.specstory/` alone
holds 9 markdown and text files. A prose file an agent edits under any of those is invisible to arm 1
forever.

The other two blind spots, read from the tree rather than measured: `ensureWatcher` in
`src/main/git/ipc.ts:109` starts a watcher lazily on the first `git:*` call for a repository, so a
file in a project nobody has touched has no watcher yet; and a file outside every open project has no
repository to be watched under at all.

#### Arm 2 — one `fs.watch` on the active file's **directory**

This is not a new idea in this codebase. `src/main/credentials/watch.ts` already does exactly it, for
exactly this reason, and its header says so in as many words:

> This is `node:fs`'s own `watch`, not a subscription through `../watcher/`, so the FSEvents
> exclusion budget the app's real file watcher lives under is untouched … And it watches the
> DIRECTORY the file sits in rather than the file itself, because a file watcher goes silent after a
> rename-over.

Both halves of that were re-measured here rather than taken on trust.

**Latency**, same probe, same edits, with the parcel stream running beside it: 11 12 12 12 11 11 11 11
ms in run 1, and 1 52 6 1 1 11 8 0 ms in run 2. Median about 7–11 ms, against arm 1's 313.

**It sees the ignored directory**: 8 callbacks for the same eight edits arm 1 missed entirely.

**A watch on the FILE really does go deaf** (`.p222/probe-cost.mts`): 1 callback after an in-place
write, 1 more after a rename-over, and then **0** for the next in-place write. A directory watch with
a basename filter is as narrow as a file watch and does not have that failure.

**Callbacks per write**: 1.0 for an ordinary write, 2.0 for stage-and-rename. So a coalescing window
is needed, but a small one.

**Cost.** With a child process churning 60 rotating files into the same directory
(`.p222/probe-fswatch-alone.mts`, `.p222/probe-cost.mts`):

| mechanism, over 5 s of pathological churn in one directory | our CPU | events |
| --- | --- | --- |
| nothing watching | 0.000–0.002 s | — |
| one `fs.watch` on that directory, alone | 0.049–0.066 s | 1,281–6,310 raw callbacks, 0 passed the one-name filter |
| the `RepoWatcher` parcel stream on that tree, alone | 1.415–1.603 s | 9–10 `onChange` |
| the parcel stream **plus** the `fs.watch` | 0.705–1.530 s | (the same) |

**The directory watch costs about 1 % of one core in the worst case it will ever meet, and is 22 to
29 times cheaper than the repo stream it sits beside.** At rest it is 0.000–0.002 s over three
seconds, which is to say unmeasurable. Installing one costs 1 ms.

#### Arm 3 — a poll

`statSync` on one file costs **0.0022–0.0038 ms**, so a 250 ms poll costs about 0.9 ms of CPU per
minute and is genuinely trivial. It is still the wrong answer, for two reasons that are about
correctness rather than cost: it converts a 7 ms answer into an up-to-250 ms one for no saving worth
having, and it is a timer that runs whether or not anything is happening, which is the shape the Zen
line in C.6 is about. Keep it in reserve as a backstop for a location `fs.watch` cannot reach (a
network mount), not as the mechanism.

#### Arm 4 — "something the agent layer already knows"

Read from the tree, and **refused**. `src/main/activity/hooks.ts:531` really does register a
`PostToolUse` HTTP hook and really does read the request body (capped at 64 KB), so a file path an
agent wrote *might* be recoverable from it. It is the wrong mechanism anyway, and the reason is
universality rather than difficulty:

- It is **claude only**. The same file says codex hooks are deliberately not implemented, and no
  other agent has anything like it.
- It requires the `--settings` file to have been installed, which the same file documents can be
  **refused** (Phase 182: a project-level `statusLine` conflict), and which does not exist at all for
  a session Tortie did not launch.
- It sees nothing an agent did outside a Tortie session, nothing a person did in another editor, and
  nothing `git checkout` did.

A baseline whose freshness depends on one vendor's optional hook is a baseline that is quietly wrong
for every other agent. The file system is the one thing every writer has in common, and it is what
should be watched.

### C.3 The eight path budget, and the exact distance — which is zero, and does not move

The constraint, stated exactly as `src/main/watcher/ignored-roots.ts` measured it:
`FSEventStreamSetExclusionPaths` accepts at most **eight** paths, and at nine it returns false and
applies **zero**, `.git` included, silently.

**First: the budget is PER STREAM, not global.** Read from
`node_modules/@parcel/watcher/src/macos/FSEventsBackend.cc:247`, the call is
`FSEventStreamSetExclusionPaths(stream, exclusions)` on the stream created eleven lines above it from
that one watcher's own `mIgnorePaths`. Each subscription gets its own eight.

**Second: the worktree stream has zero free slots on his repository right now.** Driving the shipping
`readIgnoredRoots` and `planWorktreeIgnore` over a scratch repository with his eleven ignored roots
(`.p222/probe-watch.mts`):

```
ignored roots found : 11
kernel plain paths  : 8 of 8   (.git + 7 roots)
userspace overflow  : 4
FREE SLOTS          : 0
```

So the distance from the cliff, on the one stream that matters, is **zero**. Not one. Any proposal
that adds an exclusion path to the worktree subscription is the ninth path, and it turns off all
eight including `.git`. (The dotgit stream at `repo-watcher.ts:431` passes a literal 5 and has 3 free;
the two settings-directory streams pass none. None of that headroom is transferable — it belongs to
other trees.)

**Third: `fs.watch` cannot consume a slot, and this is measured at the symbol level rather than
argued.** libuv resolves the CoreServices entry points it uses by `dlsym`, so their names are literal
strings in the binary:

| binary | `FSEventStream*` names present | `SetExclusionPaths` occurrences |
| --- | --- | --- |
| node 22.23.1 | Create, Invalidate, Release, ScheduleWithRunLoop, Start, Stop | **0** |
| Electron 43.3.0's own `Electron Framework` | the same six | **0** |
| `@parcel/watcher`'s `watcher.node` (both copies) | those plus **`_FSEventStreamSetExclusionPaths`** and Unschedule | — |

`@parcel/watcher`'s native addon is the **only** binary in the whole application that imports
`FSEventStreamSetExclusionPaths`. The symbol does not exist in the Electron process that would run
this feature except through that one addon. A `fs.watch` handle therefore cannot set an exclusion
path, cannot consume one of the eight, and cannot be the ninth.

**Fourth, proved by behaviour as well as by symbols.** With two `fs.watch` handles open on the same
tree, eight writes were driven into a directory the parcel stream excludes in the kernel. The parcel
stream delivered **0** `onChange` calls for them and 8 for the tracked file in the same run — the
exclusions still held exactly as before:

```
parcel stream during those runs: 8 / 0 onChange calls
=> the 8 kernel exclusions still hold with fs.watch handles open: YES
```

**The distance from the budget, stated plainly for the phase brief: the proposal adds zero plain
paths to zero streams. `npm run conformance:watcher` prints the same four call sites, the same
`5 plain / 0 userspace` on the dotgit row, and the same `computed` on the worktree row, after this
work as before it.** If a later round is ever tempted to reach for a second `@parcel/watcher`
subscription instead, `bus.ts` already refuses it in writing and Phase 151 already priced it: no
exclusions at all cost 178,208 events and 9.06 CPU seconds over 30 seconds of churn.

### C.4 Scope is the active file only, and that is what keeps this trivial

He said the **active** file, `md` and `txt` only. Confirming that the cost is trivial is not a
formality; it is what makes every number above small.

- **One** directory watch. 1 ms to install, ~1 % of a core in the worst case, unmeasurable at rest.
- **One** file read per settled event. A `readFile` of a 404 KB markdown file, and the existing
  `refreshRepo` already does exactly this and already no-ops when the bytes did not move — 100,000
  identity comparisons of a 69,818-byte string cost 0.49 ms in total, so the guard is free.
- **One** baseline held, for one file.
- **Zero** new subscriptions, **zero** exclusion paths, **zero** new bus.

The prose allowlist is not a cost saving, it is a correctness rule that already ships: `redline.ts`
ruling 3 confines the redline to the markdown extensions plus `txt` and `text`, because research 74
§2.4 measured a real code change producing 311 character-level spans of confetti. It stays.

**What widening would cost, stated and not recommended.** There are two different widenings and they
are not the same size.

*Every open prose tab, rather than the active one.* Measured at 1, 10, 50, 200 and 500 directory
handles (`.p222/probe-widen.mts`): installing 500 took 46–114 ms, resident memory moved by less than
1 MB after the first handle, CPU at rest stayed at 0.000–0.058 s over two seconds, and latency stayed
at 2–12 ms. So this widening is cheap in machinery. **Its real cost is not the watch, it is the
baselines** — N files to keep a shadow copy of, N of them to reconcile after a crash, and N of them
to get wrong. That is section A's problem, not this one's, and it is the reason not to.

*Every prose file in the repository.* This is the expensive one and it is a different mechanism
entirely. You cannot do it with directory handles, because you do not know where the files are until
you have walked the tree; it needs a recursive subscription, which means a second `@parcel/watcher`
stream on a tree `bus.ts` measures at 95k files, which is the exact thing `bus.ts` was written to
refuse. Do not.

### C.5 What redrawing costs, against the `probe:p167` plateau rule

**The composer.** Driving the **shipping** `composeRedlineDocument` from Phase 194 over real files in
this tree, with agent-shaped word replacements (`.p222/probe-redraw2.mts`):

| file | bytes | shape of the edit | runs | `del` | `ins` | compose (ms), two runs |
| --- | --- | --- | --- | --- | --- | --- |
| `docs/ZEN-OF-TORTIE.md` | 7,990 | 1 phrase replaced | 10 | 3 | 3 | 0.16 / 0.17 |
| | | 10 phrases replaced | 130 | 43 | 43 | 1.14 / 0.98 |
| | | 60 phrases replaced | 796 | 265 | 265 | 5.25 / 4.91 |
| | | whole file rewritten | 1,965 | 628 | 668 | 11.93 / 11.99 |
| `DESIGN.md` | 69,818 | 1 phrase replaced | 10 | 3 | 3 | 0.16 / 0.16 |
| | | 10 phrases replaced | 220 | 73 | 73 | 1.28 / 1.32 |
| | | 60 phrases replaced | 1,646 | 548 | 548 | 11.81 / 12.34 |
| | | whole file rewritten | 3,829 | 1,134 | 1,347 | **53.06 / 55.09** |
| `docs/research/74-…md` | 28,197 | 10 phrases replaced | 152 | 50 | 50 | 0.69 / 0.79 |
| | | whole file rewritten | 3,317 | 992 | 1,162 | 32.27 / 34.75 |

Phase 194's correctness property (`ins` removed equals old, `del` removed equals new) held on every
row, and identical text composes to one run in 0.00 ms.

**Read that table as two numbers.** An ordinary agent edit to prose is **0.15 to 1.3 ms**. The
ceiling, a 69 KB document rewritten end to end, is **53 to 55 ms** — one long frame, once, and the shipping
caps fire and say so on the face (`62 changes drawn whole rather than word by word`). At half a
second between ticks, nothing here can saturate anything.

**The plateau question, which is the one Phase 200 taught.** `build/probe-p167-scale.mjs` judges
every block-to-block pair on heap, DOM nodes and listeners, with budgets of **400 nodes** and **200
listeners** a block, and the shape that fails it is a CSS transition still running on an element that
was removed. Three facts:

1. `src/renderer/editor/redline.css` declares **no** `transition`, **no** `animation` and **no**
   `@keyframes` — grepped, zero occurrences in 123 lines. The exact defect shape `probe:p167` exists
   to catch cannot occur on this surface.
2. The drawn node count is a function of the *pair*, not of how many times it was redrawn: one
   element per run, from `RedlineRuns` in `RedlineRow.tsx`. Ten runs stay ten elements however many
   ticks arrive.
3. `RedlineDocument` adds exactly one `document`-level `copy` listener on mount and removes it on
   unmount. One listener, balanced, against a budget of 200.

**But the Redline view is not driven by `probe:p167` today** — `redline` appears **zero** times in
`build/probe-p167-scale.mjs`, whose `P167_SURFACES` default is `overview,arch,file,diff,preview`.
Phase 194 shipped a surface the plateau probe never opens. **A phase that makes this surface
continuously recomposing must add `redline` to that list in the same commit**, and drive it with a
file being rewritten under it rather than only opened and closed. That is the one concrete
verification obligation this section hands the builder.

### C.6 The Zen line, in mechanism terms

The Zen refuses *"Not a supervisor's console. Tortie never asks the human to watch an agent work."*
and asks for *"look away without anxiety and come back without reconstruction."* Both sentences are
about the same thing, so the line has to be stated as a mechanism or it will be argued about
forever. It is four rules, and each is checkable by reading a file.

**1. Nothing animates.** No transition, no fade, no highlight-on-arrival, no scroll to the new
change. A redraw replaces text in place and the page looks the same until you read it. This is a
scan: `redline.css` has zero `transition`, `animation` and `@keyframes` today, and it must still have
zero afterwards. A "flash the changed phrase" affordance is the single most likely thing a later
round adds, and it is exactly the line.

**2. Nothing notifies.** No toast, no badge, no dot on the tab, no sound, no count anywhere. Today's
`refreshRepo` already meets this: on the success path it raises no toast at all, and it toasts only
when a save fails or a HEAD read fails. There is one live region on the surface — the `ed-note`
banner in `RedlineDocument.tsx:120` carries `role="status"`, which a screen reader announces when its
text changes. Under ordinary editing that note is `null` and announces nothing; it appears only when
the caps fire. **A shadow-baseline version must not start writing a per-edit sentence into that
banner**, because a live region that changes on every agent write is a notification whatever it looks
like.

**3. Nothing sets a status.** This is the standing refusal and it is the easiest to keep: the shadow
baseline machinery imports nothing from `src/main/activity/` and nothing it writes reaches
`SessionStatus` (`src/shared/types.ts:80`). That is a scan in the shape of `conformance:logins`'s
rule 1 — what a domain cannot name, it cannot reach — and it should be written as one.

**4. And the one that is not a refusal but a positive obligation: the view's correctness must not
depend on the watch.** A console is correct because you were watching. A calm surface is correct
because it re-derives when you look at it. Concretely: **the redline reads the file when it is
opened, when its tab is activated, and when the window regains focus** — the event is only what makes
it *sooner*.

That fourth rule is not decoration; three measurements say it is load bearing.

- **There is an arming window.** Installing an `fs.watch` and writing in the same millisecond, 20
  trials per delay, twice: at 0 ms the edit was seen 10/20 and 13/20; at 2 ms 18/20 and 14/20; at
  5 ms 19/20 both times; at 10 ms and beyond **20/20** every time. The handle is live within about
  ten milliseconds, and an edit that lands in that window is simply gone. A read taken immediately
  after arming closes it deterministically, and costs one `readFile`.
- **A read fired by an event can catch a write in progress.** A child process rewriting a 404 KB
  markdown file 120 times while the watcher read on every event: run 1 gave 2 short or failed reads
  out of 224; run 2 gave 0 out of 225. Rare, real, and a torn read draws a redline with the whole
  tail struck through.
- **A settle debounce reduces the reads but does not remove that.** At 0 ms, 52–55 reads; at 400 ms,
  1 read. But a short read still occurred at 80 ms in one run and at 150 ms in another. **A debounce
  is a cost control, not a correctness guarantee.** The read-when-you-look rule is what makes a torn
  frame self-correcting instead of permanent.

Today the product does **not** meet rule 4: `loadContents` is called once, at tab creation
(`store.ts:587`), and neither activating a tab nor switching its mode re-reads the file. The only
re-read is `refreshRepo` on the bus. So a change the bus never saw — one inside `.specstory/`, one in
a project with no watcher yet, one lost to an arming window — stays invisible until something
unrelated moves. **Adding the read-on-look is a small change and it is the one that earns the Zen
sentence**, because it is what lets the answer to "is this view right?" be "yes, always" rather than
"yes, if the watcher was up".

### C.7 What was NOT verified, so a builder does not pretend otherwise

- **No Electron was launched and no app run was made.** Every renderer-side number here comes from
  running the shipping modules under node. The 465–510 ms end-to-end figure is measured in **one
  process**, so it does not include the `EVT_GIT_CHANGED` IPC hop; the real number is that plus one
  main-to-renderer message.
- **No real agent was driven.** Spending his model was out of scope, so the write patterns are
  simulated from the two shapes that were measured directly (in-place write, stage-and-rename). What
  an actual `claude` Edit tool does to a markdown file on disk is **unmeasured**, and a phase should
  measure it before choosing a debounce.
- **The `PostToolUse` payload shape was not checked.** Arm 4 is refused on universality, which is
  read from Tortie's own tree; whether claude's hook body actually carries `file_path` was not
  verified here and does not change the refusal.
- **`fs.watch` was not measured over a network mount or a case-insensitive volume**, and the arming
  window was measured with 40 other handles held, not with 500.
- **The torn-read rate is from two runs on one machine** and moved between them (2 of 224, then 0 of
  225). It is a shape that occurs, not a rate to design against.
- **The eleven ignored roots are his checkout's on 2026-09-07**, read once. `ignored-roots.ts`
  recorded eight on 2026-08-25, so the number moves; the conclusion — that the worktree stream is at
  8 of 8 with no free slot — held at both counts.
- **`docs/arch/` and `out/` and `release/` are among those ignored roots but hold no prose he
  writes**; `.specstory/` (9 files) and `.tmp/` (2) are the ones that carry markdown, so the hole in
  arm 1 is real but narrow on his own repository. It is wide on a repository whose `notes/` or
  `drafts/` is gitignored, which is an ordinary shape.

### C.8 The recommendation, in four lines

1. **Ride the existing bus.** Zero new subscriptions, zero exclusion paths, ~465–510 ms, and the editor
   already re-reads on it.
2. **Add one `fs.watch` on the active prose file's directory**, filtered to its basename, in the
   `src/main/credentials/watch.ts` pattern. ~7 ms, ~1 % of a core at worst, and it is the only thing
   that sees an ignored directory. Coalesce a burst; the window is a cost control, not a guarantee.
3. **Read the file when the view is looked at** — opened, activated, focused — and once immediately
   after arming the watch. This, not the watch, is what makes the sentence "correct whenever you look
   at it" true.
4. **Add `redline` to `P167_SURFACES`** in the same commit, and keep `redline.css` at zero
   transitions, the `ed-note` banner silent under ordinary editing, and `src/main/activity/`
   unimported.

---

## D. The standalone view in DOM terms, where a control can go, and whether a person can type in it

Six Electron passes on 2026-09-07, each launched through `build/electron-run.mjs`'s `withElectron` on
a scratch profile and torn down in a `finally`, over a harness page that links the **real**
`src/renderer/editor/redline.css` and `src/renderer/styles/tokens.css` and renders runs produced by
the **real** `composeRedlineDocument`. Engine: Electron 43.3.0, Chromium 150.0.7871.212. Outputs are
`.p222/out-dom.json` through `out-dom6.json`. Post-run count: 0 leftover processes from this
worktree.

**The harness reproduces the view's markup and stylesheets; it does not mount the React component
inside the real `EditorPanel` tree.** That limit is stated once here and applies to the whole section.

### D.1 What the Phase 194 view actually is

```
body > div > div.ed-redline-view      display:flex, column, position:absolute inset:0
            > div.ed-redline-scroll   display:block, overflow:auto, tabIndex=0, role=region
              > div.ed-redline.ed-redline-doc[data-redline]   display:block
                > span | <del data-redline-del> | <ins data-redline-ins>   ×N, flat
```

- **It is not a grid and not a row model.** `grid-template-columns` computes to `none` and `display`
  is `block`. This is the opposite of Pierre, where every line is a grid item of a subgrid and
  blockified by the specification. **Research 74 §3's finding constrains nothing here, and that is now
  confirmed by measurement rather than inherited.**
- **It reflows, and reflow is the point.** `white-space: pre-wrap`, `overflow-wrap: anywhere`,
  `max-width` computing to 556.82px at the shipped 13px text, `margin-inline: auto`, line-height
  21.45px, `cursor: text`. The 783-character fixture drew **368.23px tall at a 900px pane and 432.57px
  at 480px**, and 3 of 12 marked runs fragment across line boxes at 900px.
- **The document is flat.** 21 top-level children for the fixture, in document order
  `SPAN,DEL,INS,SPAN,DEL,INS,SPAN,INS,SPAN,DEL,INS,SPAN,DEL,INS,SPAN,INS,SPAN,INS,SPAN,DEL,SPAN`. One
  element per run, no wrapper per change, **no element that means "this change"**. A `del` and its
  `ins` are siblings, adjacent by convention only.
- **A change is real `<del>` and `<ins>`**, inline, `line-through` on the deletion, `--error` and
  `--success` with washes, no new token and no colour literal (gate rule 8).
- **Phase 194's projection property was re-derived off the live DOM**: concatenating every top-level
  child that is not an `INS` reproduced the baseline byte for byte, and everything that is not a `DEL`
  reproduced the current file byte for byte. That is the same property section B proves in node, taken
  in the browser instead.
- **There is no line number and there should not be one.** The fixture is 8 file lines, 4 of them
  non-empty, and draws **14 line boxes at 900px and 20 at 480px**. A number here would either repeat
  four values down fourteen rows or number something that is not a file line. It is a document.
- **What a person can already do**: select, drag, double-click, triple-click, scroll, focus the
  scroller, and copy — where a copy yields the **new** text through `redline-copy.ts`. Nothing else.
  It is explicitly read-only, and `conformance:redline` rule 9 scans all six redline files for a
  bridge, a write or an accept and fails on a hit.

**Two structural facts to carry forward.** `RedlineRow` is now **dead code** — Phase 194 removed the
in-diff mount and `grep '<RedlineRow'` over `src/` returns nothing; only its shared `RedlineRuns` is
used, by `RedlineDocument.tsx:36`. And the right-hand side of the redline **is already live**:
`RedlineDocument.tsx:54` calls `useLiveTabText`, and `tab-io.ts:614–626` re-reads a **clean** tab on a
watcher tick, so an agent's write to an open clean `.md` already reaches this view today.

### D.2 What a control costs, and what a caret costs

Tried, not reasoned.

**A control costs almost nothing structurally and everything typographically.** Eight inline buttons
inserted after each change (45.12 × 20.15px) added **1.42px of document height** and pushed the
following text **45.12px sideways** — one control width per change, permanently, mid-sentence. Two
more costs: the button's glyph enters the clipboard unless it carries `data-redline-tag` (an untagged
copy read `…when the window is closed**rewind**. This release…`; tagged, it was byte-identical to the
file), and it enters the DOM projection unless the reader skips it. At 20.15px it is also under WCAG
2.2's 24px target.

**A caret costs a policy, not a widget.** `contenteditable` on `.ed-redline-doc` works immediately:
`isContentEditable` true, `pre-wrap` preserved, marks intact, selection and the shipped copy rule
unaffected, and undo of three edits returned both projections exactly. The problem is what the browser
does by default, all measured with **real key events through CDP** rather than `execCommand`:

| default behaviour | measured |
| --- | --- |
| caret walks *inside* a deletion | **4 ArrowRight presses to cross a 4-character deletion** — the person walks through text that is not in their file |
| typing at the right edge of a deletion | lands **inside the `<del>`**: `gone` → `goneQ`, **so the baseline is now wrong** |
| typing inside unchanged text | lands in a `same` run, which counts on **both** sides — baseline delta +1 |
| Enter | Chromium re-parents everything after the split into a `<div>`: 21 top-level nodes → **2** |
| rich paste | `<b>` survived, and a pasted `<del>fake deletion</del>` became a **real** deletion: del 5→6, and the baseline gained 19 characters it never had |

**Two off-the-shelf fixes close all of it, and both were measured working:**

- **`contenteditable="false"` on every `<del>`** makes deletions atomic islands: 4 arrow presses
  become **1**, typing after a deletion lands in the following `<ins>` instead of in the past, and
  Backspace after a deletion removes the whole `<del>` element (5 dels → 4) rather than one character
  of it. Selection across the island and the shipped copy rule are unaffected.
- **Cancel every `beforeinput` and re-apply it yourself.** With real keystrokes the handler saw
  `insertText` then `insertParagraph`, both cancellable. Cancelling and inserting a fresh `<ins>`
  gave: **21 top-level nodes intact, 0 divs, 0 brs, baseline projection exact, the typed character
  became a new insertion (ins 7 → 8), and Enter refused.** Uncancelled, the same keystrokes gave a div
  and a +1 baseline delta.
- `contenteditable="plaintext-only"` is supported and is a cheaper middle: marks survive, a typed
  character lands in the `<ins>`, the baseline stays exact, and a rich paste is **flattened for free**.
- **IME works and lands in the right element.** Through CDP `Input.imeSetComposition`, a three-step
  Japanese composition fired `compositionstart / update ×3 / end`, composed *inside* the `<ins>`,
  committed there (`closed日本語`), and the current-side projection kept it. This is the one thing
  everybody assumes breaks; it did not.

**A trap worth recording, because it produced a wrong conclusion first.** Scripted `execCommand` fires
**no** `beforeinput` in Chromium 150. Pass 5 saw zero events and concluded the interception was
impossible; pass 6 dispatched real keys and it fires and is cancellable.

### D.3 Where a control can go, judged against *just enough words*

**1. A control per change, in the flow — REFUSE.** It is the only placement that changes the
typography of the sentence: 45.12px of chrome between the words at every change, eight times in three
paragraphs. The redline exists so a person reads the marked-up sentence; a button per change makes it
a form. It also needs `data-redline-tag` to stay out of the clipboard and a projection reader that
skips it, which are two invariants a later round can silently break.

**2. Hover or focus reveal, as an out-of-flow overlay — ACCEPT as the pointer affordance.** An
absolutely positioned overlay moved the text by **0.00px** and stayed out of the copy. One rule is
mandatory and it is the finding: **anchor to `getClientRects()[0]`, never to
`getBoundingClientRect()`.** At a 380px pane the union rect of a wrapped change was **239.29px to the
left of where the change actually starts** (3 fragments), and 149.84px for a second. A chip anchored
on the bounding box points at empty margin.

**3. Keyboard only, with no drawn control at all — ACCEPT, and this is the one that should ship
first.** Measured on the shipped markup with nothing added but `tabIndex="-1"`: changes are focusable,
focusing moved the document by **0.00px**, the existing selection survived focus, the copy answer was
unchanged, and on a 3,670px document `focus()` scrolled the change into view on its own (scrollTop 0 →
2971) with no `scrollIntoView` call. Chromium paints the focus outline as **one box per fragment** on
a wrapped change, which is the correct picture rather than a defect. Reading order came out as
document order. This is what *just enough words* asks for: nothing on the resting face, a
next/previous chord, and one key to rewind the change you are on.

**4. A margin — REFUSE, on two numbers.** The free space left of the centred column is **147.59px at a
900px pane, 47.59px at 700px and 0.00px at 520px**, so the affordance vanishes exactly when the pane
is narrow. Worse, a margin marker addresses a *line*, and a line holds several changes: over the
fixture, 12 changes sat on **6 lines with 4 of those holding more than one** (max 3 at 900px, **max 5
at 520px**). A margin control cannot name the phrase, which is the unit he asked for.

### D.4 Typing, three ways, and what breaks first in each

#### A. Monaco with the redline as decorations

**The received objection is wrong at 0.56.0, and that is the headline.** Measured against Monaco's own
content origin, caret position error over a proportional UI font at columns 5/15/30/50/70/88 was
**worst 0.44px**, against **0.43px for Menlo on the same line**. `disableMonospaceOptimizations`
changed **nothing at all** — identical samples both ways — because Monaco detects
`fontInfo.isMonospace === false` and takes the measuring path itself. Word wrap over a 420px column:
**0 lines overflowed**, no horizontal scrollbar, in both settings. Monaco reflows proportional prose
correctly.

Deletions can be drawn without polluting the file, via `ModelDecorationInjectedTextOptions`
(`editor.api.d.ts:1808–1856`), which is exported and first class. Measured: injected content **drawn**
in the DOM, `model.getValue()` **unchanged**, surviving an edit before it, **wrapping correctly** when
long (a 160-character injected deletion turned 2 rendered lines into 6 with 0 overflow), and the caret
**steps over it** — column 24 at x=161, column 25 at x=205, with no stop between.

**What breaks first: injected content must be a single line, and 26.7% of real deleted runs are not.**
The API says so (`content: string`, "Must be a single line") and the engine agrees: a `\n` inside
injected content rendered as the visible control glyph `␊`. Measured over ten pairs with the shipping
composer (`.p222/newline-runs.mts`): **4 of 15 deleted runs carry a line break, 26.7%**. A realistic
in-paragraph edit had 0 of 5 — but a removed paragraph, a removed blank line, a reordered list and
three-lines-into-one all did, and those are exactly the edits agents make to markdown. Second break:
injected text is not in the model, so it never copies, which is right for a redline but means the
deletion is unselectable. Third: Monaco arrives as an editor, so gutter, minimap, folding and line
decorations all have to be turned off before it stops looking like the surface he did not want.

**What happens when the file changes underneath while a caret is in the view — the charter asked this
of every option and the draft answered it only for option C. The fix round answers it here.** Monaco
IS the tab's editor, so this option inherits the answer the tree already has and it is not a good one:
`refreshRepo` reloads a tab only `if (!tab.dirty)` (`tab-io.ts:616`), so the instant a caret has
typed anything, the agent's later writes stop arriving and the redline goes stale with nothing on its
face. If the tab is CLEAN, the reload path is `resetWorkingModel` -> `model.setValue`, which
`textModel.js:343` follows with `this._commandManager.clear()` — so a file changing under a resting
caret **destroys the undo stack and moves the caret**, since `setValue` replaces the whole model
rather than applying an edit. That is a strictly worse answer than option C's, because option C only
goes stale where this one also loses ⌘Z. A phase choosing Monaco owns changing that reload path to
`pushEditOperations`, which B.6 already names for the undo question and which is the same fix.

**Verdict: the strongest typing option, blocked on one thing.** Either deletions are split at line
breaks into several injected decorations, or a multi-line deletion falls back to something else. A
design decision, not a rewrite.

#### B. A contenteditable document view

**Viable, on one condition, and the condition is a lot of code.** Everything works out of the box and
everything is wrong by default, per D.2. The measured cure is `contenteditable="false"` on deletions
**plus** cancelling every `beforeinput` and re-applying the edit as the view's own `<ins>`. With both,
real keystrokes left the structure intact and the baseline exact.

**What breaks first: Enter, and it breaks quietly.** Uncancelled, Chromium represents a new paragraph
as a `<div>` boundary and **not as a character** — the fair recursive projection read a delta of **0
characters on both sides** while the screen showed a new paragraph. The picture and the bytes
disagreed and no byte-level check could see it. That is precisely the class of defect the Phase 194
verifier caught with `peelSharedSpace`, and it is why this option needs the `beforeinput` policy
rather than a lint. Second break: an unintercepted paste writes new `<del>` elements into the document
and **rewrites the baseline** (+19 characters); `plaintext-only` closes that one for free and is the
sensible floor.

**What happens when the file changes underneath while a caret is in the view — again the charter's
question, and this option is the one with no answer at all in the tree.** A contenteditable view owns
its own DOM, so nothing existing refreshes it: a watcher tick would have to re-render the document
under a live selection, and there is no `setValue` and no `pushEditOperations` to argue about because
the view is not a Monaco model. **This is the option's real second cost and the draft did not price
it.** Either the view refuses to redraw while it has focus, which makes it stale exactly like a dirty
tab and needs a sentence on its face, or it redraws and must restore a selection expressed in a run
list that has just changed shape. Neither was measured; the harness never drove a redraw under a live
caret. It is recorded in D.7 as unverified rather than answered.

#### C. Editing elsewhere and reflecting here

**Cheapest by far, and half of it already ships.** `useLiveTabText` plus `resetWorkingModel` on the
watcher tick already means an edit in Source mode, or an agent's write to a clean open tab, shows up
in the Redline view. Nothing is built.

**What breaks first: a dirty tab.** `tab-io.ts:614` refreshes only `if (!tab.dirty)`, on purpose. So
the moment a person types in Source, the agent's later writes stop arriving and the redline goes stale
with no sign on its face. It is the same conflict a rewind must answer (section A4.3), and this option
does not create it.

### D.5 Can typing be phase two? Yes, and it should be

**Rewind needs no caret at all.** The keyboard-only scheme in D.3 needs `tabIndex="-1"`, a
next/previous chord and one key, and it was measured working on the shipped markup with zero visual
change: 0.00px moved, selection preserved, copy unchanged, auto-scroll free. Every hard thing in D.4 —
caret across struck-through runs, `beforeinput` interception, Enter, paste, IME, Monaco's single-line
injected content — belongs to *typing*, and none of it stands between a person and "undo this phrase".

The order that falls out: **rewind by keyboard first**, hover chip second (anchored to
`getClientRects()[0]`), typing third — and if typing is wanted, **Monaco is now the front-runner
rather than the fallback**, on the strength of the 0.44px measurement, with its one blocker named and
countable at 26.7%.

### D.6 The gate, and what Phase 191's in-diff redline gets

`npm run conformance:redline` **prints sixteen rules, not fourteen** (see section 2, disagreement 6).
Two of the sixteen bind this work directly and a phase must say what it does about them rather than
letting a later round discover it.

- **Rule 9 is the one this phase breaks.** Its scanner reads all six redline files for
  `gmuxBridge|writeFile|writeFileSync|acceptChange|rejectChange|applyChange` and an `'fs:…'` channel,
  and fails on any hit. **A rewind writes.** The honest move is to narrow rule 9 to the pure
  computational modules and give the write its own arm with its own ablations — not to put the write
  in a seventh file so the scanner misses it. Section F.3a says what it should become.
- **Rule 8** forbids a colour literal in `RedlineRow.tsx`, `RedlineDocument.tsx` and `redline.css`, so
  any control, focus ring or hover chip is tokens only. `--accent` and `--border-strong` already cover
  the placements above; no new token is needed.

**Phase 191's in-diff redline gets none of this, because it no longer exists.** Phase 194 removed the
`lineAnnotations`/`renderAnnotation` mount, the `gmux.diffRedline` key and the `.ed-diff-bar` control
at his word — *"no i don't want the toggle for redline inside the diff review"* — and **rule 7
actively scans `PierreDiff.tsx` and `DiffControls.tsx`** to keep it out. Giving the diff any part of
this would mean deleting a green gate rule he asked for. **Leave it alone.**

### D.7 What was NOT verified in this section

- **A real IME with a real input method.** Only CDP-synthesised composition was driven.
- **A paste from the real system pasteboard.** Flattening was measured through `insertHTML` and
  `plaintext-only` instead.
- **Any of this inside the real `EditorPanel` tree.** The harness reproduces the view's markup and
  stylesheets; it does not mount the React component.
- **Monaco's injected-text behaviour was measured in the harness**, not inside Tortie's own configured
  editor with its own options.
- **No option was driven with the file changing underneath a live caret.** The fix round answered the
  charter's fourth question for options A and B from the tree rather than from a run — A from
  `refreshRepo`'s `if (!tab.dirty)` and `setValue`'s `_commandManager.clear()`, B from the absence of
  any refresh path at all. **Option B's redraw-under-a-selection is the one genuinely unpriced thing
  left in this section**, and a phase that chooses contenteditable owes it a measurement before it
  chooses.

---

## E. What is written to his file, and when

### E.1 The bytes, named exactly

A rewind writes **the whole file**. It is one string, composed from the run list the shipping
`composeRedlineDocument(baseline, current)` returns, by this rule:

> emit the NEW side of every run, except for the one change being rewound, where the OLD side
> is emitted instead.

That rule is only meaningful because of the correctness property Phase 194 already proves, and
the first thing this phase did was re-derive it with the baseline in place of HEAD:

```
oldTextOf(runs) === baseline : true
newTextOf(runs) === current  : true
```

measured over a 405 byte paragraph against its 416 byte edited form, 24 runs
(`.p222/rewind.mts`). Because both projections hold, the composed string is exactly the current
file with one change put back, and nothing else can have moved.

**What lands on disk is one contiguous span replaced.** Driven over a real paragraph with eight
scattered edits, every single rewind changed exactly one span and left every other byte
identical:

| change | what it was | file bytes | the span replaced on disk |
| --- | --- | --- | --- |
| 0 | `Monday` -> `Friday` | 416 -> 416 | at 21, `"Fri"` -> `"Mon"` |
| 1 | `three` -> `four` | 416 -> 417 | at 43, `"four"` -> `"three"` |
| 2 | ` and` -> `,` | 416 -> 419 | at 102, `","` -> `" and"` |
| 3 | `` -> ` and the map` | 416 -> 404 | at 114, `" and the map"` -> `""` |
| 4 | `1.9` -> `1.4` | 416 -> 416 | at 160, `"4"` -> `"9"` |
| 5 | `slower` -> `faster` | 416 -> 416 | at 210, `"fast"` -> `"slow"` |
| 6 | `would like but` -> `expected and` | 416 -> 418 | at 225, `"expected and"` -> `"would like but"` |
| 7 | `week` -> `fortnight` | 416 -> 411 | at 406, `"fortnight"` -> `"week"` |

Two properties fall out of that table and both matter later. Rewinding a change is **not**
rewinding a word: change 6 restores fourteen characters across two words, because that is what
the shortest edit script grouped. And the span the person sees marked is not always the span
that moves: change 0 draws `Monday` against `Friday` and moves three bytes, because `Fri` and
`Mon` are the only part that differs.

Rewinding every change one at a time, recomposing after each, landed on the baseline **byte for
byte** in eight rewinds.

### E.2 To which path, and by which process

The path is `tab.path`, the absolute path the active worktree tab already carries. Not
`relPath`, not `origRelPath`, and never a path resolved on another machine, for the reason
`tab-io.ts` states twice already about review tabs.

**The renderer composes and MAIN writes.** The renderer is the only place that holds both
strings: the baseline and the live text. Main never had them. That is the same division
`saveOnMachine` states in its own comment about the digest, at
`src/renderer/editor/tab-io.ts`, and there is no reason to move it.

### E.3 Through which seam, and what the seam gives free

The seam exists. It is:

```
window.gmux.fs.writeFile(path, contents)     src/preload/files.ts:20
  -> 'fs:writeFile'                          src/shared/ipc/base.ts:70
  -> handle(ipc, 'fs:writeFile', ...)        src/main/fs/ipc.ts:229
        await writeFile(abs, contents, 'utf8')
```

It is what every save the editor has ever made goes through, and a rewind gets three things
from it without asking:

- **The sender check.** `handle` in `src/main/typed-ipc.ts` calls `assertTrustedIpcSender` for
  every invoke channel, so only a window Tortie made can reach it.
- **The quit door.** The same wrapper refuses every channel with the typed `SHUTTING_DOWN`
  shape once `appLifecycleState() === 'quitting'`, so a rewind cannot land during the ordered
  teardown.
- **A sentence rather than a stack.** The handler already wraps a failure as
  `FS_FAILED, "Could not save <name>"`, and `errorSentence` on the renderer side already turns
  that into one line.

### E.4 What the seam does NOT give, and it is four things, each measured

Run in a scratch directory, nothing under the person's home touched
(`.p222/wtest/probe.mjs`):

| | measured | consequence for a rewind |
| --- | --- | --- |
| 1 | **It follows a symlink.** A write to a link replaced the link's target, and the link stayed a link. | A `notes.md` that is a link puts the write wherever the link points. |
| 2 | **It truncates in place.** The inode did not move across a rewrite, and a 5,000 byte file became a 10 byte file with the old bytes gone and no copy anywhere. | A crash, a full disk or a killed process mid-write leaves the person's prose truncated. |
| 3 | **A concurrent reader sees a partial file.** Reading while a 2 MB write was in flight observed a size that was neither the old one nor the new one. | An agent reading the file it is working on during a rewind reads half a document. |
| 4 | **There is no precondition of any kind**, and no containment guard either. `fs:createFile`, `fs:rename`, `fs:move` and `fs:trash` all prove their path is inside an open project root through `file-ops.ts`; `fs:writeFile` proves nothing. | Whatever string arrives is written over whatever is at that path. |

**None of that is a defect in `fs:writeFile`, and the phase should not report it as one.** For
a save it is correct and has been for a hundred phases: a person pressed Cmd-S, Monaco holds
the whole buffer, the bytes exist in the model as well as on disk, and if the write is wrong
the person is looking at the file and can press it again.

A rewind is different on all three counts. Nobody typed the bytes it restores, they exist in
exactly one place which is the baseline, the file it is writing over may be being written by an
agent at the same instant, and the person may not be looking at it. **So a rewind should not
use `fs:writeFile`.**

### E.5 The write a rewind should use, assembled from parts already in this tree

Nothing new needs inventing, which is the point of this section. Three patterns already ship
and each answers one row of the table above.

- **The precondition** is `machines:putFile`. `saveOnMachine` computes the sha256 of
  `tab.savedContents`, sends it as `expect`, and `putFileOnMachine` in
  `src/main/machines/remote-file.ts:255` has the far side refuse on a mismatch and answer
  `stale`. That is a compare-and-swap over a file, it is already reasoned about in this tree
  down to the case where the link drops after the write and before the answer, and it exists
  **only for the remote path**. The local path has no equivalent.
- **The no-follow** is `src/main/credentials/nofollow.ts`, being unlink then an exclusive
  create so a re-planted link fails the write rather than being followed, plus an `lstat` in
  front of the rename. Phase 204's committer's round added it because a `writeFile` inside a
  guarded directory followed a planted link, which is row 1 above happening for real in this
  product.
- **The atomic replace** is `src/main/settings/store.ts:657`, being write to a temp name then
  `renameSync`. Measured: tmp plus rename moves the inode, so a reader sees the old file or the
  new file and never a partial one, which is rows 2 and 3.

- **The containment guard is the fourth row and the fix round had to add it here, because the three
  patterns above answer rows 1 to 3 and the draft carried nothing across for row 4.** `fs:createFile`,
  `fs:rename`, `fs:move` and `fs:trash` all resolve and authorise a project root first, through
  `root()` in `src/main/fs/file-ops.ts:149` calling `resolveOpenProjectRoot` against
  `listProjectRoots()`; `fs:writeFile` calls none of it (`src/main/fs/ipc.ts:229-247`, confirmed).
  A new renderer-reachable whole-file write that did not carry it would be **the second channel in
  the product with no containment**, and it would be the one a rewind aims. It costs one call: the
  same `root()` gate the file operations already use.

**Recommendation: a NEW channel rather than a wider `fs:writeFile`.** Adding an optional
precondition to `fs:writeFile` changes the channel every Cmd-S in the product goes through, and
a mistake there breaks saving. A separate channel is one line in
`docs/audits/contract-baseline.txt`, is reachable only from the redline, and cannot regress the
save path. Its answer should be a word rather than a throw, in `putFileOnMachine`'s shape:
`wrote`, `stale`, or `refused`, so the renderer can say the right sentence for each.

**Four things the channel must refuse, three of which the fix round added.** Stated here so a build
phase does not have to reconstruct them from three different sections:

1. **A stale digest** — the precondition above. `stale`.
2. **A path outside every open project root** — the containment guard above. `refused`.
3. **A truncated read on either side.** E.7a measured what happens without it: a rewind composed over
   the first 5 MB of a larger file dropped 98,110 bytes in one arm and reverted a whole 5,895,890-byte
   document to its baseline in another, and answered `wrote` both times. A3.1's `save` refusal does
   not carry, because this channel is not `save`. `refused`.
4. **A baseline generation that has moved since the draw.** B.8a. `refused`, and it is checked in the
   renderer before this channel is called at all.

**And one thing the recommendation itself imports, which A3.2 refused two hundred lines earlier.**
The atomic replace pattern taken from `src/main/settings/store.ts:657` is `writeFileSync(tmp)` then
`renameSync(tmp, path)` with `tmp = ${path}.tmp` — **a file Tortie creates inside the person's
repository, at a path Tortie chose, which is word for word the objection A3.2 used to refuse keeping
the baseline beside the file**, and which a crash or a killed process leaves behind for the next
`git add -A` to pick up. The objection was raised once and not the second time. It does not sink the
pattern, because the file is transient by design and the atomicity is worth having, but a build phase
owes two things it would otherwise discover: the temp name must be one `git status` will not show as
an untracked file people commit by accident, and a leftover must be cleaned on the next write rather
than left. Writing it to a system temp directory is NOT the answer, because `rename` is only atomic
within a volume.

**One more thing a phase reading E.5 alone would not know.** The rename-over this pattern performs is
exactly the operation section C.2 measured making an `fs.watch` **on the file** go deaf — 1 callback,
1 more after a rename-over, then 0 for the next in-place write. It is harmless here only because
C.8's recommendation watches the DIRECTORY with a basename filter, for exactly that reason. The two
recommendations depend on each other and neither says so.

### E.6 The Monaco trap, and a first version will hit it

If the tab is open in File mode with unsaved edits, the working model and the disk hold
different bytes, and the tree already knows this: `refreshRepo` in `tab-io.ts` reloads a tab
only `if (!tab.dirty)`, deliberately, so a person's typing is never overwritten by the watcher.
But `save()` writes `model.getValue()` over the **whole file**.

So a rewind that writes to disk while the tab is dirty is **silently undone by the next Cmd-S**,
because the stale model is written over the top of it. There are two honest answers and the
first version should take the second:

1. Write through the model when one exists and is dirty, being a Monaco edit followed by a
   save, so the model and the disk stay one thing.
2. **Refuse while the tab is dirty**, with a sentence saying so.

Answer 2 is smaller, it is truthful, and it removes an entire class of question about what a
caret is doing while bytes move under it. Answer 1 is the right end state and it is not a first
version.

---

### E.7 What happens when the file changed underneath, which is the failure mode that loses work

This is the case the charter names and it is the one worth the most care, because the naive
answer succeeds, says nothing, and destroys work.

**The setup, driven end to end** (`.p222/stale.mts`). A baseline `B`. The agent had written
`C1` when the redline was drawn, showing three changes. The person read it. While they read,
the agent kept working and wrote `C2`, adding a section. Then they pressed rewind.

**The naive answer**, being to write the string composed from the run list that is on screen:

```
NAIVE: 161 bytes written.
  Does it still contain the agent's new section?  false
  Bytes of the agent's work destroyed:            85
```

Eighty five bytes here, and unbounded in general: **everything the agent wrote between the draw
and the press is gone**, from the only copy, and the write returns success. That is the defect,
and it is worth stating in the operator's own terms: the Zen's promise is *nothing important
gets lost*, and the naive rewind loses whatever arrived while he was reading.

**The safe answer is three steps and none of them is expensive.**

1. **Re-read the file at the moment of the press.** Not `tab.savedContents`, which is what
   Tortie last read, which is exactly the stale thing.
2. **Recompose the redline** against the baseline and those fresh bytes.
3. **Find the change by its own bytes and its own offset, never by its index** in the drawn
   list, and refuse rather than guess.

Driven over the six shapes the file can be in when the button is pressed (`.p222/safe.mts`):

| what the agent did meanwhile | outcome | the agent's other work |
| --- | --- | --- |
| nothing | writes 91 B, `Monday` restored | kept |
| appended a section | writes 118 B, `Monday` restored | kept |
| edited elsewhere, being the heading | writes 103 B, `Monday` restored | kept |
| re-edited the same phrase, `Friday` to `Tuesday` | **refuses** | untouched |
| reverted it itself, back to `Monday` | **refuses** | untouched |
| replaced the file wholesale | **refuses** | untouched |

**Why identity by index is unsafe, measured rather than argued.** In the third row the agent
edited the heading instead. The recomposed change list then reads
`"" -> " for 0.101.0"` at index 0, where the drawn list read `"Monday" -> "Friday"`. A rewind
of "index 0" pressed against the old drawing would have **reverted the heading rather than
Monday**, and both writes succeed, so nothing would have said a word. The identity of a change
has to be its own bytes plus where it sits, and where two identical changes both exist and have
moved, the honest answer is to refuse as ambiguous.

**The last two rows deserve different sentences, and a first version should write both.**
"That change is no longer in the file" is right for `Tuesday`. It is wrong for the row where
the agent put `Monday` back itself, where the true sentence is that it is already back to what
it was and there is nothing to do. Same refusal, different meaning to a person.

**Recomposing costs nothing, so there is no excuse for using the stale list.** Measured over
real files in this tree:

| file | size | compose |
| --- | --- | --- |
| `CLAUDE.md`, one word changed | 125,831 B | 1.3 ms |
| `CLAUDE.md` against itself | 125,831 B | 0.0 ms |
| the same file four times over, one word changed | 503,324 B | 6.6 ms |

(`.p222/safe.mts`.)

**And the precondition is still needed on top of all three steps**, because between the re-read
and the write there is a window a fast agent can land in. The sha256 of what was read is what
closes it, which is E.5's channel.

### E.7a. Step 1 has to refuse a truncated read, and the draft never said so

**The fix round's first finding, and it is the largest measured loss in this document.** Step 1 says
*"re-read the file at the moment of the press"*. The renderer's only reader is
`gmux.fs.readFile` -> `fs:readFile` -> `readTextCapped`, which returns **the first
`READ_CAP_BYTES = 5 * 1024 * 1024` bytes** and reports `truncated: true`
(`src/main/fs/ipc.ts:57-89`). Step 2 then recomposes over that truncated string, step 3 resolves the
identity against it, and E.1's rule writes **the whole file**. The word `truncated` appeared four
times in this document's 2,310 lines and never once in a rewind context.

Driven with the shipping composer and the shipping cap over scratch prose files, nothing under the
person's home touched (`.p222/fix/f1-truncated.ts`). Three agent edits: one near the top, which the
person presses, one in the middle, and one past the 5 MB mark.

| arm | file | what the re-read gave | the compose | ARM 3 said | what happened |
| --- | --- | --- | --- | --- | --- |
| A, a small truncated tail | 5,340,990 B | 5,242,880 B, `truncated: true` | 3 edits, exact | **`wrote`** | **98,110 bytes gone**, the last paragraph of the file absent, the agent's edit past the cap gone |
| B, a large truncated tail | 5,895,890 B | 5,242,880 B, `truncated: true` | 1 edit, `approximate: true` | **`wrote`** | **the whole document reverted to the baseline**; both of the agent's other edits gone |

**Arm B is the shape nobody would predict from reading the code**, and it is why this needed running
rather than reasoning. A truncated tail longer than `REDLINE_DOC_MAX_LINE_EDITS = 1,000` lines makes
`linePartition` give up and fall back to head-and-tail, so the ENTIRE document becomes one change
block drawn whole. There is then exactly one edit in the list, the person's press resolves to it
unambiguously, and `mix` puts the whole baseline back. **One phrase pressed, the whole file reverted,
nothing said.**

**The refusal is one line and it goes in three places.** The channel refuses a write whose source read
was truncated (E.5's list, item 3); the view does not draw rewind controls on a tab whose
`truncated` flag is set, which the tree already tracks and `refreshRepo` already keeps fresh
(`tab-io.ts:622`); and the sentence a person sees is its own, being that the file is too large for
Tortie to rewind rather than a generic failure. The tree's existing treatment of a truncated tab —
read-only in Monaco, refused by `save` — is the right instinct and this is the same instinct restated
where the new write is.

### E.7b. Encoding, which this document did not name once

**The fix round's finding, and it is narrow, real and cheap to state.** The words `encoding`,
`UTF-8`, `BOM` and `CRLF` each appeared **zero** times in 2,310 lines. A rewind writes the **whole**
file (E.1) through a `readFile(..., 'utf8')` and a `writeFile(..., 'utf8')`, so every byte in the file
makes the round trip whether or not the person pointed at it. `readTextCapped` refuses only BINARY
content, by sniffing the first 8,192 bytes for a NUL — and a legacy single-byte encoding has no NULs,
so it opens.

Driven on a latin-1 `.txt` with the accents outside the rewound span
(`.p222/fix/f9-encoding.ts`):

```
on disk: 87 bytes, latin-1
  as latin-1  : "Notes de réunion" / "La reponse fût brève et polie."
  read as utf8: 3 bytes already read back as U+FFFD in memory
compose: 1 edit — E0 at 38: "huit" -> "neuf"
AFTER THE REWIND
  file 87 B -> 93 B
  the pressed span went back to "huit"  : true
  line 1: "Notes de r�union"
  line 3: "La reponse f�t br�ve et polie."
  what the person was told              : nothing; the write returned success
```

Three characters the person never pointed at were destroyed and the file grew by six bytes.

**`save` has exactly the same shape today and this is not reported as a defect in `save`**, for E.4's
reason: a person pressing Cmd-S is looking at the mojibake in Monaco and can decide. **A rewind is
one press sold as a targeted undo**, the person is looking at a redline rather than at the file, and
`.txt` is precisely where legacy encodings still live. The honest answer is not to build encoding
detection — that is a different feature and a large one. It is to say so:

- **The limit is stated in section H** rather than discovered by whoever hits it.
- A build phase that wants a guard has a cheap one: a read whose UTF-8 decode produced a U+FFFD that
  the bytes on disk did not contain is not a file Tortie should offer to rewind. That is a byte
  comparison, not a detector, and it costs one pass.

### E.8 A rewind is destructive and it is not undoable from the view

This was expected to be free and it is not, so it is recorded as a finding rather than a
detail (`.p222/undo.mts`). After rewinding `Monday` -> `Friday`, the file says `Monday`, the baseline says
`Monday`, and the recomposed redline shows only the other change. **The bytes `Friday` now
exist in no file and in no baseline.** There is nothing left on screen to press, so the view
cannot undo itself.

The cheap answer, and it is the same machinery: the renderer remembers, per tab and in memory
only, the span each rewind replaced, and Undo is another guarded write in the other direction
with the same precondition. It is honest to say on its face that it lasts for the session. What
must not happen is a one-click control that permanently discards an agent's phrase with no way
back and no warning, which is what the smallest possible implementation would be.

---

### E.9 What Cursor actually does, read on 2026-09-07

He named Cursor for the feel, so this was read rather than recalled. Everything here is quoted
or paraphrased from pages fetched on 2026-09-07, with the source beside it.

**Cursor already has a baseline that is not git, and it is called a checkpoint.** From
[cursor.com/docs/agent/chat/checkpoints](https://cursor.com/docs/agent/chat/checkpoints):
checkpoints "save snapshots of your codebase during an Agent session", the Agent "automatically
creates them before making significant changes", capturing "the state of all modified files",
and the docs are explicit about the relationship to git:

> Checkpoints are stored locally and separate from Git. Only use them for undoing Agent
> changes; use Git for permanent version control.

Restoring one "reverts all files to that saved state", and "reverts files only; it does not
remove messages from the conversation."

**So the shadow baseline half of his idea is not speculative: the product he named ships it.**
What it is not is per phrase. It is a whole-workspace snapshot and its only verb is
restore-everything.

**The per-change half is the inline diff, and it is line grain.** Cursor draws red and green in
the file with per-change Keep and Undo controls, behind a setting. That is established by a
dated support thread rather than by the docs page:
[forum thread 158983](https://forum.cursor.com/t/per-change-keep-undo-buttons-missing-after-agent-edits-only-undo-all-available/158983),
24 April 2026, where a person reports that "the individual Keep/Undo buttons for each change no
longer appear" and "the only option is 'Undo All'", and Cursor's own support replies pointing at
Settings then Agents then Inline Diffs, which resolved it the same day. The unit is a hunk or a
line. It is the line-based unit this phase is trying to get underneath.

**The pending state belongs to the turn, not to the file, and Cursor's users feel that as bugs.**
Three dated threads, all read on 2026-09-07:

- [150230](https://forum.cursor.com/t/no-option-to-keep-undo-cursor-diffs-once-changes-have-been-committed/150230),
  29 January 2026: diffs still show after a commit but the Keep control is gone, acknowledged by
  Cursor as "a known issue" that "has been logged", with a workaround of committing a trivial
  change to make Keep All come back.
- [162532](https://forum.cursor.com/t/after-updating-cursor-agent-mode-applies-file-changes-directly-to-disk-with-no-red-green-inline-diff-and-no-keep-undo-or-accept-reject-controls-settings-that-used-to-control-this-either-dont-exist-in-my-ui-or-have-no-effect-this-removed/162532):
  after an update, edits land straight on disk with no diff and no Keep or Undo at all.
- [154011](https://forum.cursor.com/t/cursor-automatically-applies-ai-edits-without-showing-diff-preview-or-undo-keep-options/154011):
  the same complaint from a different direction.

**The review docs page is about reading, not accepting.**
[cursor.com/docs/agent/review](https://cursor.com/docs/agent/review) describes watching the
agent work through the diff view, stopping it with Cmd Shift Backspace, and clicking **Review**
then **Find Issues** to run a dedicated code review that "analyzes proposed edits line by line".
It documents no accept at any granularity, and no word-level anything.

**What this means for his sentence, stated plainly.** Cursor gives per-change Keep and Undo at
line grain, owned by the agent turn, over a whole-workspace non-git snapshot. He asked for the
opposite on two axes: **per phrase rather than per line**, and **a property of the file that is
correct whenever you look**, rather than a property of a turn that expires when the turn does.
The three threads above are the evidence that the second axis is a real difference and not a
refinement: every one of them is somebody losing the controls at a boundary, being a commit, an
update, a settings default, where a baseline owned by the file would not have moved at all.

**And that sentence is the one the fix round used to correct A2.2**, because as first drafted this
document diagnosed Cursor's flaw and then adopted its trigger: A2.2 made *a commit that includes the
file* advance the baseline, in a product where agents commit. Thread 150230 is that failure, and it
would have been reproduced here. A2.2 now qualifies the commit-advance to a commit the person made,
so this paragraph's claim of a real difference stands rather than being spent.

---

### E.10 Other prior art, each checked on the day

The most useful finding in this document was nearly the wrong one. The draft of this section
said that nobody does phrase-level rewind against a non-git baseline. **That is false, and the
correction is the finding.**

| what | granularity | where the baseline is | what it is |
| --- | --- | --- | --- |
| Cursor | hunk / line | local checkpoint, not git | above |
| Zed | hunk, in a multibuffer review pane and inline | the agent's edit set, drawn as a temporary override of the git diff | line grain, and it expires |
| Windsurf | per file or per hunk, edits land in a staging area first | the staging area | line grain |
| Word track changes | word | the document model | records the change AS IT IS MADE |
| Google Docs suggesting mode | word | the document model | same |
| CriticMarkup | word | the file itself | markup lives IN the text |
| `track-changes` (mgkay) | numbered highlight | the file itself, plus `.tc-history.md` beside it | the AGENT writes the markup |
| **Wymark** (was Markwell) | **per change, over plain markdown on disk** | **its own baseline, not git** | **this is his sentence** |

**The two families, and why the split matters.** Everything that does word-level accept and
reject does it because **the editor owns the document model and records the change at the moment
it is made**. Word and Google Docs are not diffing anything;
[Google's own help](https://support.google.com/docs/answer/6033474) describes a suggestion as a
thing that is created as a suggestion, drawn green with the original struck through, and
accepted or rejected one at a time. Nobody reconstructs those by comparison. Two products push
the recording into the file itself instead:
[CriticMarkup](https://www.cultofmac.com/news/critic-markup-brings-markdown-like-change-tracking-to-plain-text)
as a plain-text syntax, and
[track-changes](https://mgkay.github.io/track-changes/), read 2026-09-07, where Claude writes
numbered highlights into the document and a plain-text `.tc-history.md` beside it records every
decision, driven by commands like `/tc accept 1-9,!4`. Both need the writer's cooperation, which
means **asking the agent to produce markup**, which is a different product from the one he
described.

**Zed is worth one sentence of its own, because it is the closest of the three code editors
and it still is not this.** From
[zed.dev/docs/ai/agent-panel](https://zed.dev/docs/ai/agent-panel), read 2026-09-07: the review
opens with `ctrl-shift-r` into "a special multi-buffer tab with all changes", and "You can accept
or reject each individual change hunk, or the whole set of changes made by the agent", with the
same keep and reject hunk controls available inline. Its baseline is not a shadow copy: the
inline review "temporarily overrides the buffer's git diff while review is active", so the
comparison is git's, dressed up for the duration of a review, and it goes away when the review
does. Hunk grain, git underneath, expires with the turn.

**Wymark is the exception and he should look at it before this is built.**
[wymark.app](https://wymark.app/), read 2026-09-07;
[markwell.md](https://markwell.md/) 301-redirects to it, so the two names the search returned are
one product renamed. Its own sentences:

> A polished WYSIWYG markdown editor, with the comments and track changes you know from Word and
> Google Docs.

> Whatever moved your document, a commit on someone else's branch, a version you saved last
> week, a draft you handed to a tool, it comes back as changes you read, accept, reject, and
> comment on.

> Accept and reject per change, and keep your version history.

> the file stays yours: plain markdown, on your disk

and from its docs:

> an always-on review layer: every change to the file, whether you typed it or an AI agent wrote
> it, shows up as a reviewable diff you can accept or reject

> The moment the file differs from your baseline, the difference is visible and actionable.

> Your file is the source of truth. Both editor views display the file on disk; every edit
> reaches the disk immediately; nothing rewrites content you did not touch.

Local-first, no account, macOS beta, copyright 2026.

**IT WAS NOT RUN.** The landing page and the docs pages were read; the beta was not downloaded
and nothing was installed, per this phase's rules. So everything above is what the product says
about itself, and a phase that builds on it should verify rather than quote.

### E.11 So what is actually Tortie's, stated narrowly

Three of the four things he asked for have shipping prior art. The honest statement of what is
new is small, and small is fine:

- A non-git baseline: **Cursor ships it**, at whole-workspace grain.
- Phrase-level accept and reject: **Word and Google Docs ship it**, inside their own document
  model.
- Phrase-level review against a baseline over a plain file on disk: **Wymark says it ships it**,
  as a standalone macOS markdown editor, today, in beta.
- Phrase-level rewind **inside an agent shell, scoped to the file you are working in, beside the
  session that made the edit, with no separate editor to move into**: nothing found does this.

**And the useful conclusion for the operator is not "build it".** It is that he can download
Wymark this evening and find out in an hour whether the shape he described is the shape he
wants, and possibly whether he wants it from Tortie at all. Refusing or narrowing is a real
answer, and "keep using the tool that already does this beside Tortie" is a real answer too. If
he does want it from Tortie, the reason will be the fourth line above, which is that he does not
want to leave the window his sessions are in, and that reason should be the one the phase is
built to.

---

## G. The prose boundary, re-derived, and the argument has to change

The instruction was to re-derive the 311 character-level spans of confetti over a real code
change in this tree and confirm the boundary still holds. **The number does not reproduce as
stated, the confetti argument does not separate prose from code here at all, and the boundary
holds anyway for a different and much stronger reason.** All three of those are measured below.

### G.1 The 311 does not reproduce, and the reason is that it was never a jsdiff number

Research 74 section 2.4 records Phase 185 measuring 188, 45 and 311 spans over a real commit to
`PierreDiff.tsx`. Running the installed jsdiff over every commit that ever touched that file
(`.p222/confetti4.mts`). **The draft published five of the nine rows the script prints, and the
sentence above the table said "every commit that ever touched that file". The fix round re-ran it and
this is all of them:**

| commit | old B | new B | `diffWords` | `diffWordsWithSpace` | `diffChars` | chars ÷ words |
| --- | --- | --- | --- | --- | --- | --- |
| `e53a32e` | 13,076 | 13,618 | 6 | 7 | 18 | 3.00 |
| `1c1e4e4` | 17,572 | 13,076 | 68 | 163 | 284 | 4.18 |
| `e238ff1` | 12,622 | 17,572 | 21 | 32 | 79 | 3.76 |
| `468a67d` | 12,094 | 12,622 | 7 | 26 | 44 | **6.29** |
| `0a31afb` | 10,139 | 12,094 | 15 | 19 | 52 | 3.47 |
| `d3ee863` | 9,935 | 10,139 | 85 | 242 | **319** | 3.75 |
| `611d74c` | 7,122 | 9,935 | 85 | 147 | 254 | 2.99 |
| `bc8ebd9` | 5,307 | 7,122 | 11 | 45 | 42 | 3.82 |
| `207decf` | 0 | 5,307 | 1 | 1 | 1 | 1.00 (the file's creation, degenerate) |

Nothing reads 188, 45 and 311. `d3ee863` reads 85, 242 and 319, which is the same shape and the
same order of magnitude. The likely explanation is that Phase 185 counted **drawn `data-diff-span`
elements in the running app**, under Pierre's own per-line highlighter with both sides counted,
which is a different count from parts returned by jsdiff over a file pair. Research 74's own
table counts spans that way. So the 311 is not wrong, it is a different measurement, and this
document should not treat it as a jsdiff figure.

**What reproduces is the DIRECTION, and the draft's band was an artifact of the rows it published.**
It said *"between 3.0 and 4.2 times as many marked spans"*, which is exactly the range of the five
rows it showed and is broken by two it did not: `468a67d` reads **6.29** and the file's creation reads
1.00. Over the eight real changes the range is **2.99 to 6.29**, with a median of 3.76. The claim that
survives is the one the allowlist ever needed: **character mode marks three to six times as many spans
as word mode on every real code change in this file's history, and never fewer.** That is a
correction to a sentence rather than to a finding, and it is the class this repository's own
conventions name — a sentence that reads as a measurement of a whole population when it is the range
of a sample.

### G.2 The confetti COUNT does not separate prose from code in this tree

The redline does not work per line and does not use `diffChars`. It partitions by lines, then
runs the shipping `redlineRuns` per change block. So the honest question is how many marked runs
a real change produces per block, and how small they are. Swept over the last 120 commits of
this worktree, running the shipping module (`.p222/boundary.mts`):

| corpus | commits | file pairs | paired blocks | marked runs | runs per block | run chars p25 / median / p75 / p95 | <= 3 chars | <= 8 chars |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| code, `.ts` `.tsx` `.mjs` under `src/` and `build/` | 65 | 122 | 238 | 1,096 | 4.6 | 5 / 12 / 30 / 159 | 202 = **18.4%** | 451 = 41.1% |
| prose, `.md` | 66 | 31 | 81 | 517 | 6.4 | 4 / 13 / 38 / 175 | 120 = **23.2%** | 212 = 41.0% |

**Prose in this tree fragments slightly more than code, not less.** The distributions are close
to identical at every quartile. Any argument for the allowlist that rests on "prose produces
fewer tiny runs" is refuted by its own repository, and this document should not make it.

### G.3 What the tiny runs actually ARE, which is where the difference lives

Counting the tiny runs by their exact text (`.p222/tiny.mts`), none of them whitespace-only on
either side:

**Code, 202 tiny runs, top by frequency:**
`"* "` 43, `"\n *"` 31, `")"` 11, `"'"` 7, `"it"` 6, `"}\n"` 4, `"."` 4, `"\""` 3, `"="` 3,
`"\n    //"` 3, `"// "` 3.

**Prose, 120 tiny runs, top by frequency:**
`"**"` 5, `","` 5, `")"` 5, `" ("` 5, `"3.6"` 4, `"3.7"` 4, `"** "` 4, `"45"` 3, `"it"` 3,
`"2.9"` 3, `"and"` 3, `";"` 2, `"but"` 2, `"yes"` 2, `"36"` 2.

Seventy four of code's 202, being 37%, are the JSDoc comment leader `* ` and `\n *` alone.
A control offering to rewind `\n *` is offering to rewind nothing a person can name. Prose's
tiny runs are **numbers a person changed**, being `3.6` to `3.7`, `2.9`, `45`, `36`, and
**real words**, being `it`, `and`, `but`, `yes`, alongside markdown emphasis and punctuation.
A version number an agent changed is precisely the bit a person wants to put back.

**So the boundary is about what the fragments MEAN, not how many there are**, and that is a
weaker argument than a count. It needs a stronger one, and there is one.

### G.4 The real argument, and it is about the WRITE

Phase 191's ruling 3 justified the allowlist as a **reading** rule: a redline reflows
proportional text, which destroys the only structure a line of source has. That is still true
and it still stands. Rewind adds a second reason that is much harder to argue with, because a
rewind is not a reading, it is a **write to his file**.

> Reverting one run inside a paragraph always produces prose. Reverting one run inside a line of
> source can produce a file that does not parse.

Measured (`.p222/parse.mts`). Eight real code commits in this tree were composed through the
shipping `composeRedlineDocument`, both projections checked, every single-change rewind applied,
and every result parsed by TypeScript's own parser:

```
CODE:  8 real file pairs, 169 single-change rewinds,
       39 produced a file TypeScript cannot parse = 23.1%
```

Examples, each one change:

- `src/main/git/service.ts@8af93d5` change 3: `"let page: { entries: GitGraphLogEntry"` back to `"const "`
- the same file change 4: `"]; hasMore: boolean };\n    let sides: DivergenceSides;\n    t"` back to `""`
- change 8: `"{\n          "` back to `""`
- change 10: `"\n        })"` back to `""`
- change 13: `"    } finally {\n      if (queue !== null && this.walkQueues."` back to `""`

Nearly one rewind in four leaves the file broken, and the person who pressed the button did not
ask for that and will not necessarily see it. **Prose has no equivalent failure.** Over the same
sweep on real markdown, every pair's projections held and every single-change rewind produced a
document that is still a document, because there is no grammar for it to violate.

That is the argument to keep, it is about a write rather than about a picture, and it is the one
this phase adds. **The allowlist is not widened**, and the seven extensions
`md, markdown, mdown, mkd, mdx, txt, text` in `src/renderer/editor/redline.ts` stay exactly as
they are.

---

## H. What was NOT verified, and a builder may not pretend otherwise

Sections A9, C.7 and D.7 carry their own lists for the baseline, the watching and the surface. This
one collects the rest, and one thing that is measured rather than unverified: `npm run
conformance:redline` was **red** in four consecutive runs here, on rule 5's 400 ms wall-clock ceiling
alone, at a machine load average of 97.48 (section 2, disagreement 5). Nothing in this phase touched
shipping code.

- **The real app was never driven, in any section.** Sections A, B, E, G and this one ran the
  shipping modules under node; section D ran six Electron passes over a **harness page** that links
  the real stylesheets and renders real runs, which is not the same as mounting the view inside
  `EditorPanel`. The claims about `RedlineDocument`, the Monaco dirty-tab interaction, the Monaco undo
  stack and the quit door are read from the source, not observed running. **One app run is the first
  thing a build phase owes.**
- **No write channel was built or prototyped.** E.5 assembles three patterns that already ship
  and it was not run as one thing.
- **Wymark was not installed or run.** Its pages were read on 2026-09-07 and it is quoted about
  itself. Zed and Windsurf were not run either. Zed's row rests on its own
  documentation page read on the day; **Windsurf's row rests on search summaries alone and no
  primary source, so it is the weakest line in that table and should be re-checked before
  anything is built on it.** Cursor's rows rest on its own docs pages and four dated forum
  threads, three of which carry an official reply.
- **The corpus in section G is this repository only**, being 120 commits of a TypeScript and
  markdown tree written largely by agents. The 18.4% and 23.2% are properties of this tree and
  another repository would give other numbers. The 23.1% parse-failure figure is over eight file
  pairs, which is small, and it is the direction rather than the exact rate that the argument
  needs.
- **The parse check is TypeScript's parser only.** A rewind that leaves a file parsing can still
  leave it wrong, so 23.1% is a floor on the harm and not a measure of it.
- **The rewind grouping, being adjacent non-`same` runs collapsed into one change, is this
  document's own unit** and not yet a shipping decision. Section B.2 argues it is the only sensible
  one, because a `same` run can never be empty; that is an argument, not a measurement of what a
  person would point at. A different grouping changes the change counts in E.1 and E.7 and nothing
  about the write mechanism or any failure mode.
- **ENCODING IS A STATED LIMIT AND NOT A SOLVED ONE.** E.7b measures it: a rewind writes the whole
  file through a UTF-8 round trip, and on a latin-1 `.txt` three characters outside the rewound span
  became U+FFFD and the file grew six bytes, with nothing said. No encoding detection is proposed and
  none should be inferred from this document. A build phase either states the limit on the face or
  refuses to rewind a file whose decode lost bytes, which E.7b prices at one pass. **A BOM, a CRLF
  file and a UTF-16 file were NOT driven at all** — only latin-1 — and CRLF in particular interacts
  with `linePartition` in a way nothing here has measured.
- **The fix round's five constructed losses were run under node with the shipping composer, not in
  the app.** They use a hand-written `editsOf` and `mix`, proved first against section B's whole
  published transcript (section 3), which is the strongest check available without an app run and is
  not the same as one. **The arms that matter most, being E.7a's truncated read and B.8a's moved
  baseline, would each be one line in a build phase's own gate**, and that is where they belong.
- **B.8a's collision was constructed rather than sampled.** It needed a document with two identical
  phrases and an accepted edit whose length exactly equals the gap between their baseline offsets.
  **How often that shape occurs in real prose is UNMEASURED**, and it does not matter: the guard is
  one integer, and a failure mode that silently rewrites the wrong sentence does not need to be
  common to be worth one integer.
- **A2.2's qualification — "a commit the person made in this window" — was not implemented or
  measured.** That Tortie can tell its own window's commits from an agent's is an inference from
  where the commit is issued, not a reading from the tree. A build phase confirms it before relying
  on it; if it cannot, the refusal is the fallback and accept alone still bounds the growth.

---

## F. The smallest first version, and what it leaves out

### F.1 The ask, broken into pieces that can ship apart

| | piece | depends on | size |
| --- | --- | --- | --- |
| A | the baseline: when taken, where it lives, when it advances | nothing | the crux, owned elsewhere in this document |
| B | draw the redline against the baseline rather than HEAD | A | very small, see below |
| C | rewind one change, with the guarded write | A, B | the real work |
| D | notice every agent edit without being asked | A | the watcher question |
| E | type in the redline | B | a separate feature |

**B is nearly free and that is worth saying loudly.** `RedlineDocument` already calls
`composeRedlineDocument(tab.headContents ?? '', workingText)`. Drawing against a shadow baseline
is the same call with a different first argument. Every ruling Phase 194 proved carries over
untouched, because the composer never knew where its old side came from. The correctness
property was re-derived under a non-git baseline at the top of this document and it holds.

**C is the work**, and it is three parts: grouping adjacent `del` and `ins` runs into one change
a person can name, the control, and the guarded write of E.5 with the recompose-and-locate of
E.7.

### F.2 What ships together

**Ship the cheapest honest A, plus B, plus C. That is his sentence and nothing else is.**

*A note from the write's side on what the cheapest A is, offered to the section that owns it.*
The bytes Tortie last read for that tab are already in the tree, as `tab.savedContents`, already
refreshed by the watcher, already meaning "what the file said when Tortie last looked". Holding
that as the baseline for the life of the tab is a one-field first version. A durable baseline is a
real thing to want and it is a second phase.

**It is not durable, and the fix round widened what that sentence has to say.** The draft said only
that *"a restart loses the redline"*. A3.2's own table lists four ways an in-memory baseline dies and
a restart is the least likely of them: **tab close, LRU eviction past ten tabs, window reload, quit,
crash**. `MAX_TABS = 10` (`store.ts:100`, confirmed), and opening an eleventh prose tab is an
ordinary mid-session action nobody would connect to losing a redline. Under A3.4's own reasoning that
is the moment an uncommitted paragraph's only other copy disappears. **So the surface's sentence is
"this lasts as long as this tab is open", not "this lasts until you restart"** — and if that sentence
is judged too weak to ship behind, the answer is A3.3's durable step rather than a softer sentence.

### F.3 The order, and it is chosen so that each step is provable before the next starts

1. **Draw the redline against the baseline instead of HEAD, read only.** Nothing writes. This
   alone answers "all agent edits show up", it is the piece with the least risk in the whole
   ask, and it can be looked at for a week before anything else is built.
2. **Build the guarded write channel, with its precondition, its no-follow and its atomic
   replace, and no UI at all.** It is provable by a conformance gate that launches no Electron,
   in the shape `conformance:credentials` already uses for `nofollow.ts`, being a planted link
   that must make the write fail and a stale digest that must make it refuse.
3. **Wire rewind to it**, with the re-read, the recompose, identity by bytes, and the four
   refusal sentences as sentences.
4. **Stop.**

### F.3a The gate that has to change, deliberately, and must not simply be deleted

`npm run conformance:redline` rule 9 reads, in its own printed words:

> no redline file names a bridge, a write or an accept, so nothing here can change a file

It is a scan over the real source and it is currently green, run on 2026-09-07 in this worktree
with every rule passing. **Shipping a rewind makes that rule false**, and the temptation for
whoever ships it is to delete the rule, which would remove the only thing standing between the
redline and an unreviewed write path.

The rule should be **narrowed rather than removed**, and the narrowing is the phase's own
safety property: the redline modules may name exactly one write channel, being the guarded one
from E.5, at exactly one call site, and no other bridge and no other write. That is the same
shape `conformance:logins` rule 1 already uses for the one deletion call in the logins domain,
being a scan that finds the single call site and proves the function holding it asks its guard
first, read by matching braces rather than by searching the file for a word. The phase brief
should say what rule 9 becomes, in words, before any code is written.

### F.4 What should NOT be built, and each refusal has a reason

- **No typing in the redline.** He asked to rewind, not to type. Every problem typing brings,
  being caret placement across struck-through runs, undo, IME and composition, paste, and what a
  caret does when the file moves under it, is unrelated to the thing he asked for, and none of
  them has to be answered for rewind to work. Phase two at the earliest.
- **No accept button in version one.** If accept means anything here it means *advance the
  baseline to here*, which **writes no file at all**. That is a good feature and it is a
  different one, it cannot ship before the baseline question is settled, and a button labelled
  Accept that writes nothing next to a button labelled Rewind that writes the file is two
  meanings for one surface.
- **No rewind-all, no rewind of a selection, no multi-select.** Each is a compound write and
  each multiplies the stale case in E.7. One change, one write.
- **A rewind must not ship without its undo.** E.8 measured that the view cannot undo itself and
  the rewound phrase survives nowhere. An in-memory per-tab stack is cheap and it is the floor.
  **A8a is why this is not a nicety**: the loss case that needs no staleness and no mistake is the
  person rewinding their own uncommitted paragraph, and for that case the journal is the only guard
  there is.
- **No widening of the prose allowlist**, for the reason section G measures.
- **No git worktree, no index, no stash.** The whole point of the shadow baseline is that git is
  not involved, and every mechanism that reaches for git brings the line-granularity problem
  back with it.
- **No live stream, no animation, no notification, no badge.** The view is correct whenever you
  look at it. That is the Zen's *come back without reconstruction*; the thing next to it is the
  refusal *not a supervisor's console*, and the difference is exactly whether anything moves or
  announces itself when you are not looking.


### F.5 The verdicts, piece by piece, because they are not the same

The charter asked that the pieces be separated. They are, and they do not get one verdict.

| piece | verdict | why |
| --- | --- | --- |
| **The baseline, and the redline it draws** | **Ready to be decided.** The mechanism is measured, the failure modes are named, and the read-only version writes nothing. | Drawing against a baseline is one argument changed in an existing call, every Phase 194 ruling carries over, and a lost baseline degrades to exactly what ships today. |
| **Rewind** | **Ready, but only with FOUR rules, and the fix round found two of them missing.** It is not shippable as "write the projection of what is on screen", and it is not shippable with the re-read alone either. | The naive form destroyed 87 bytes of prose in the first case tried, and returned success. With the re-read, the recompose and identity by baseline offset, it was correct in 1,472 of 1,500 and refused in the other 28, never ambiguously — and it still lost 98,110 bytes over a truncated read (E.7a) and rewound the wrong phrase after an accept moved the baseline (B.8a). The four are: refuse a truncated read; bind the press to the baseline generation; re-derive at press time; and write under a precondition and a containment guard. It also needs its undo, which A8a makes a guard rather than a nicety. |
| **Typing in the view** | **Not ready, and not needed.** Phase two at the earliest. | Everything hard belongs to typing and nothing about rewind depends on it. Monaco is the front-runner if it is ever wanted, blocked on one measured thing: 26.7% of real deleted runs carry a line break and injected text must be a single line. |
| **Per-phrase accept** | **Free, and deliberately deferred.** | It writes only Tortie's own copy and not one byte of his file, so it is the safe half. It is held back on surface grounds, not mechanism grounds. |

### F.6 Roughly what it costs, in phases

Estimated from what each piece touches, not from a schedule. Every number here is a judgement and is
labelled as one.

- **Phase 1 — draw against the baseline, read only.** One field on the tab, the first-read seeding, the
  HEAD re-seed, and one argument changed in `RedlineDocument`. Verification is Tier 2: the gates plus
  one app run, plus one independent method. Its natural independent method is the one this document
  used, being the projection property re-derived over the baseline pair. **One phase, and it is
  small.**
- **Phase 2 — the guarded write channel, with no UI at all.** The precondition from `machines:putFile`,
  the no-follow from `credentials/nofollow.ts` and the tmp-and-rename from `settings/store.ts`. It
  spawns nothing and needs no Electron, so it is provable by a conformance gate in the shape
  `conformance:credentials` already uses. Tier 3 by the tiering rule, because it writes the person's
  file. **One phase.**
- **Phase 3 — wire rewind.** The grouping, the keyboard affordance from D.3, the re-read and recompose,
  identity by baseline offset, the four refusal sentences, the in-memory undo journal, and the
  narrowing of `conformance:redline` rule 9 in the same commit. Tier 3, and the verifier's named job is
  the stale-file attack. **One phase, and it is the real work.** **Its gate owes six arms, one per
  loss this document measured**, being the stale draw, the truncated read (E.7a, both the exact and
  the `approximate` shape, because they fail differently), the moved baseline generation (B.8a), the
  path outside every project root (E.5), the person's own insertion (A8a), and the encoding round trip
  (E.7b) as a stated refusal or a stated limit. Each of them is a pure computation over two strings,
  so the gate launches no Electron and spawns nothing, in the `conformance:credentials` shape.
- **Optional later, each its own phase and none of them owed:** the durable baseline
  (`<userData>/gmux/baselines/` through `src/main/durable`, already priced at 9.0 ms median for 126 KB);
  the `fs.watch` on the active file's directory that closes the gitignored hole; per-phrase accept; and
  typing.

**So: three phases for the thing he asked for, and everything else is optional.** That estimate rests
on the four pieces being genuinely separable, which F.5 is the argument for; if the first version
turned out to need typing, the estimate is wrong by more than one phase.

### F.7 The one obligation a build phase inherits from this document

`redline` appears **zero** times in `build/probe-p167-scale.mjs`, whose `P167_SURFACES` default is
`overview,arch,file,diff,preview`. Phase 194 shipped a surface the plateau probe never opens. **A
phase that makes this surface continuously recomposing adds `redline` to that list in the same
commit**, and drives it with a file being rewritten under it rather than only opened and closed.

---

**This document recommends that nothing be started.** It prices the work, separates it into pieces
that can be decided one at a time, names the sequences in which a person loses prose, and records that
a product doing most of this already exists and can be tried in an evening. The operator chooses.

**And after a fix round it names five such sequences rather than one.** The stale draw (B.4d), the
truncated read (E.7a), the moved baseline (B.8a), the person's own paragraph (A8a) and the encoding
round trip (E.7b). Three of those were found by attacking a recommendation that had already stated
its guards, which is the argument for the guards being written as gate arms rather than as
paragraphs. It is also the argument for the first recommendation in this document standing: **step 1
of F.3 writes nothing at all**, and every one of these five is a property of the write.
