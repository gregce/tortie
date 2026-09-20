#!/usr/bin/env node
/**
 * `npm run conformance:redline`, the cheap gate on the redline (Phase 191).
 *
 * About 20 seconds since Phase 243 added rules 21 to 24, which drive the
 * durable baseline store over a real directory on a real disk; it was about 3
 * seconds before. It launches no Electron, opens no window, starts no tmux
 * server, spawns no agent, makes no request and reads nothing under the
 * person's home. Every number it prints came from the SHIPPING module, run
 * under node by build/redline-conformance-probe.mts.
 *
 * ## Why a gate rather than a unit test
 *
 * Four of the things this phase decided are one line away from being undone by
 * a later round that means well, and none of them is visible in a screenshot:
 *
 *   - THE ANCHOR. @pierre/diffs keys its annotation maps by the FILE line
 *     number, and the index into `additionLines` is equal to it only when the
 *     diff was parsed from whole files. The coarse path parses a PATCH, where
 *     it is not. The rule 4 fixture is a patch whose hunk starts at line 40, so
 *     the two answers differ by 39 and a regression cannot hide.
 *   - THE CAPS. `renderDiffChildren.js` maps over `lineAnnotations`
 *     unconditionally, so every annotation's React subtree mounts whether or
 *     not it is on screen. Rule 5 drives the worst case the caps allow and
 *     fails if it costs more than the ceiling, which is what makes
 *     `REDLINE_MAX_EDIT_LENGTH` a measurement rather than a guess.
 *   - NO REDLINE IN THE DIFF, NO COLOUR LITERAL, NO WRITE PATH. Three
 *     refusals, each of which is a scan over the real source (rules 7, 8 and
 *     9), and each scanner is proved on fixtures this file writes itself so a
 *     scan that cannot fail is not mistaken for a scan that passed. The first
 *     was "no redline in two columns" while Phase 191's toggle lived in the
 *     diff bar; Phase 194 took the toggle out at the operator's word, so the
 *     rule now pins the removal rather than the guard the removal made moot.
 *
 * ## The rules
 *
 *   1. The prose allowlist answers yes to the markdown set plus txt and text,
 *      and no to everything else including .rst, .adoc and .org.
 *   2. Every pair round-trips: the runs with the deletions dropped rebuild the
 *      new text byte for byte, and with the insertions dropped they rebuild
 *      the old text. This is what makes the copy handler's answer correct, and
 *      it holds over emoji with a zero width joiner, combining marks, a right
 *      to left run and Japanese.
 *   3. INDEPENDENTLY RE-DERIVED. A hand written word level LCS in this file,
 *      deliberately not jsdiff, produces its own removed and added word
 *      sequences and they must equal the module's. The Japanese pair is
 *      excluded and the exclusion is printed, because a whitespace tokenizer
 *      cannot segment Japanese, which is the reason the module passes an
 *      Intl.Segmenter at all.
 *   4. THE ANCHORS, re-derived the same way: a line level LCS over the whole
 *      file fixture, grouped into blocks, and each block's LAST added line is
 *      the number the module must have anchored on. Plus the patch fixture,
 *      where an index and a line number differ by 39.
 *   5. The caps fire, all three, and the worst case they allow is under the
 *      ceiling.
 *   6. Nothing skipped means NO note, so a clean file grows no banner.
 *   7. The redline is never drawn in the diff. The diff surface and its
 *      control row name none of the redline modules, mount no annotation and
 *      read no redline preference, so the diff draws only what Pierre draws
 *      and the redline has exactly one home, which is its own view.
 *   8. No colour literal in the row's own component or stylesheet.
 *   9. THE ONE WRITE (Phase 227, narrowed from "no write anywhere"). The
 *      redline modules may name exactly ONE write channel, Phase 226's
 *      guarded write, at exactly ONE call site in exactly one file, and the
 *      declared function holding it must ask the baseline generation guard
 *      first and re-read the file second, read by matching braces through
 *      functionBodyOf and never by searching for a word. A forbidden write
 *      (writeFile, an accept, an `fs:` channel string) anywhere, a second
 *      call site, or the bridge reached from any other redline file is a
 *      failure, so the write still has exactly one reviewed door.
 *  10. The gate is named in package.json and in build/verification-checks.mjs,
 *      because a gate nothing names is how a gate decays.
 *  11. A WHITESPACE ONLY CHANGE IS FLAGGED. Two sides that hold the same words
 *      and differ only in spacing are made identical by the normalisation, so
 *      the marked-up line cannot draw the change. The block carries
 *      `whitespaceOnly`, its runs are the one unchanged sentence, and no other
 *      block in the same file carries the flag.
 *  12. THE ACCOUNTING. Every change block in a file either draws a row or is
 *      counted in the skip note. Nothing is silently dropped, over five
 *      fixtures including the two caps and the patch path.
 *  13. THE PERSON'S PASTEBOARD IS PUT BACK IN A `finally`. The harness writes
 *      it with the window's own Copy command, and everything after that used
 *      to sit in one `try` whose `catch` only logs, so a throw in the probe
 *      expression, in `capturePage` or in the PNG write left the copied diff
 *      text on his pasteboard. Read by matching braces rather than by
 *      searching for the word, and the scanner is proved on four fixtures this
 *      file writes itself, one of which hides the word `finally` in a comment.
 *      `clipboard.clear()` is checked too: it may be reached only from inside
 *      the restore, because clearing empties every flavour and restoring "no
 *      text" is not the same as emptying the pasteboard.
 *  14. THE RUNS ARE NEVER REORDERED INTO PAIRS. jsdiff's shortest edit script
 *      puts the insertion BEFORE the deletion on the three-into-one pair and
 *      leaves them non-adjacent, which is honest output. A later round that
 *      "tidies" the runs into deletion-then-insertion would be drawing a diff
 *      nobody computed, so the order of that pair is pinned here.
 *  15. THE DOCUMENT (Phase 194). The redline view composes the WHOLE file
 *      from the two versions, and its one correctness claim is re-derived
 *      here by plain joins over the runs the shipping module printed: with
 *      every insertion dropped they are the old file byte for byte, with
 *      every deletion dropped the new file, over seventeen whole file
 *      fixtures including an unchanged file, two empty files, a final
 *      newline gained and lost, CRLF, unicode, and every cap firing, and the
 *      block a cap refuses draws WHOLE rather than leaving a hole. A seeded
 *      fuzz of 3,000 pairs reports the same two counts at zero, and the
 *      repair's own refusal count at zero, because the module's fallback
 *      would still satisfy the projections and only the count says whether
 *      the repair actually ran.
 *  16. A CHANGE TO THE LAST WORD OF A LINE STAYS ON ITS LINE. jsdiff attaches
 *      a word's trailing whitespace to its token, so "Monday" becoming
 *      "Friday" at the end of a line arrived as del "Monday\n" then ins
 *      "Friday\n", the deletion carried the line break, and the insertion
 *      landed on the NEXT line under it, which is the opposite of the charter
 *      sentence and which both projections were blind to. Over every document
 *      fixture and the fuzz, no adjacent deletion and insertion, in either
 *      order, shares a whitespace character at its start or its end, and the
 *      six last word fixtures pin the exact runs: the word struck, the word
 *      inserted, and the line break in the plain run after them.
 *  17. TYPING (Phase 237). Two halves. 17a is a scan: no typing file may name
 *      a baseline advance, which is research 83 A2.3 made structural rather
 *      than promised, proved on four plants of which two must be caught. 17b
 *      drives the SHIPPING rules under node, one arm per trap research 97
 *      measured with real CDP key events — Enter arriving as `insertLineBreak`
 *      and not `insertParagraph`, the outside write HELD while a composition is
 *      open, `insertCompositionText` ignored because it is the one event no
 *      `preventDefault` can cancel, the caret coming back through a redraw with
 *      0 characters of error against a hand re-derivation, and a keystroke
 *      folding into the current side with both projections exact — and every
 *      arm goes red under an ablation of its own clause.
 *  18. THE CURRENT CHANGE (Phase 239). The controls stopped being a pointer's
 *      guest, and both halves of that can be undone in one line. 18a is a
 *      SCAN: neither `redline-current.ts` nor the view's own `step` may read
 *      `document.activeElement`, which is the single word behind both defects
 *      research 99 measured — reading the position off the focus swallowed the
 *      first ⌥↓ of a fresh view (§2.2, reproduced in two runs), and holding the
 *      ELEMENT rather than the identity let an outside write take the person's
 *      place away while the change was still drawn with the same identity,
 *      offset and generation (§2.3). `focusedChange` keeps its read, because it
 *      is the fallback for a hover nobody has stepped from, so the scan is
 *      aimed at the two places the decision now lives and is proved on three
 *      plants. 18b DRIVES the shipping module under node over the nine-change
 *      fixture and the recompose that makes it ten, with TEN arms — the step
 *      from nowhere, the two ends, six positions, the recompose, the identity
 *      rule with its generation clause, a wrapper carrying no identity, the
 *      swallowed press as the number 0, 1, 2 against 0, 0, 0, and the FIX
 *      ROUND'S THREE — and every one goes red under an ablation of its own
 *      clause. The ablated copies live in a scratch directory OUTSIDE `src/`,
 *      removed in a `finally`, because this module's only import is
 *      `import type` and resolves nothing at runtime.
 *
 *      THE FIX ROUND'S THREE ARMS ARE THE THREE THINGS THE VERIFIER MEASURED
 *      AND NOTHING PINNED. A change is the span of BASELINE it covers, being
 *      `off` and `del`, because Phase 237 ships typing in this document and
 *      typing rewrites `ins` on every keystroke: with `ins` in the identity,
 *      three characters typed into the change the controls were drawn on took
 *      the chip away and left 0 changes marked, 3 runs of 3, where the parent
 *      commit kept them 3 of 3. A caret the VIEW put back after a recompose is
 *      not a move, because the restore is by current-side offset and a write
 *      ABOVE the caret leaves that offset on different text: the mark, the
 *      chip and the ⌥⌫ target all walked to the change a `/bin/sh` had just
 *      made while the held change was still drawn two rows below with the same
 *      offset, the same deleted text and the same inserted text. And a press
 *      on the document's own prose LETS GO, because the controls could be
 *      summoned and never put away — clicking plain prose far from any change
 *      left the chip drawn on change 0 where the parent read it gone, over a
 *      171.60 x 30px overlay sitting on the marked-up sentence research 83 D.3
 *      says the view exists so a person can read.
 *
 *  19. ACCEPT (Phase 238). Six arms on the SHIPPING accept, driven under node
 *      by build/redline-accept-probe.mts, and every one goes red under an
 *      ablation of its own clause. 19a is accept over all 256 subsets,
 *      accepted one change at a time with the picture re-derived between —
 *      which is what the view really does, because every accept moves the
 *      baseline — landing on the single mix over the whole subset with the
 *      current text projecting back byte for byte at every one. 19b and 19c
 *      are research 83 B.8a's own document with a REAL accept moving the
 *      generation between the draw and the press: the rewind refuses through
 *      the shipping press with nothing written, the stale accept refuses with
 *      nothing advanced, and both are held against the reading that makes
 *      them worth something, being that WITHOUT the guard the same identity
 *      resolves to exactly one change and it is the SECOND lorry. 19d is a
 *      digest of a REAL FILE on a real disk before and after an accept, with
 *      a rewind through the same harness in the same breath so the reader is
 *      shown able to see a write. 19e is accept-all leaving a redline of one
 *      run and zero changes, without ever asking what is under focus. 19f is
 *      the fix round's, being the undo of a rewind after an accept refusing,
 *      writing nothing, keeping its entry and no longer being offered, with a
 *      control undo that really writes beside it.
 *
 *  20. THE KEYBOARD STAYS IN THE VIEW (Phase 238's fix round). An accept
 *      removes the wrapper the keyboard was on, so the view puts the focus
 *      back on the scroller — INSIDE the accepted guard and nowhere else, or
 *      a refused accept would pull the keyboard off the change. A scan of the
 *      shipping source, proved on five plants of which four must fail.
 *
 *      ITS ABLATION DIRECTORIES ARE NOT INSIDE `src/`. Rules 8 and 17 copy
 *      their chain into a dotted subdirectory of src/renderer/editor, which
 *      works and is untidy; this one uses `.p238-accept-*` at the repository
 *      root, which .gitignore's own phase-working-directory line already
 *      covers, so an interrupted run can never leave something committable
 *      under the source tree. It has to be inside the repository rather than under the OS
 *      temporary directory, because the copied chain imports `diff` and node
 *      resolves that by walking up to `node_modules`.
 *
 *  21. THE DURABLE BASELINE'S ROUND TRIP (Phase 243). A baseline and the HEAD
 *      version it was taken against go into `<userData>/gmux/baselines/` and
 *      come back byte for byte and code unit for code unit, over the corpus
 *      rules 2 and 15 already carry plus a lone surrogate, an empty baseline
 *      and control bytes, and including the case where the two sides are the
 *      same string and the record collapses them.
 *  22. CAUGHT MID WRITE. The store is driven with a REAL filesystem that fails
 *      at exactly one step — open, write, sync, close, rename, the directory
 *      flush, and the record itself — so every step before the fault really
 *      happened on a real disk. Every one refuses, and every one leaves the
 *      OLD record or the NEW one and never neither, which is the whole reason
 *      the ring is two rather than one.
 *  23. CREDIBILITY IS `nextBaseline` REPLAYED, and a hostile record is dropped
 *      WHOLE. The stored record carries the HEAD version it was taken against;
 *      handed one that has not moved the rule answers the SAME object and the
 *      baseline stands, handed one that has it re-seeds from the commit, so no
 *      narrowing across a commit can survive. Ten planted records are each
 *      refused with the field and the reason named, one of which is a row
 *      naming a body path of its own — a record may only name the path its own
 *      key's generation would have, or a hostile one would have the reader
 *      open whatever it named — and one of which is a BASELINE GENERATION past
 *      the bound, which is the field Phase 227's press guard is bound to and
 *      the one field that had no bound until this phase's fix round.
 *  24. THE RING, THE CEILING AND THE DOOR. Five stores leave exactly two
 *      bodies and two entries and the newest reads; the shipped numbers are
 *      pinned; the ceiling evicts oldest first and keeps the newest; a record
 *      past the age bound is swept and a fresh one is not; and the door's
 *      nine refusals each answer their own word and leave NOTHING on disk.
 *
 *      ALL FOUR ARE DRIVEN OVER A REAL DIRECTORY under the OS temporary
 *      directory, removed in a `finally`. Nothing is written inside `src/`,
 *      nothing under the person's home is read, and the "project" the store
 *      admits is a scratch directory of its own. Six ablations, one clause
 *      each, and every one must move its arm's reading.
 *
 *  25. THE PARTITION'S TIE (Phase 246). On 2026-09-09 the operator inserted a
 *      paragraph ABOVE one he had changed by a single word, and the paragraph
 *      below was drawn as a whole deletion in red followed by the whole
 *      paragraph again in green. NO CAP DID THAT: docs/research/110 measured
 *      the word edit distance at 93 against 200, the two sides at 312 and 165
 *      characters against 4,000, `diffWords` ANSWERING with 19 runs,
 *      `exactRuns` not refusing and the note correctly `null`. The arithmetic
 *      finished and the picture was still unreadable, which is why no rule
 *      above this one could see it: they all ask whether the arithmetic ran.
 *
 *      `diffLines` had two shortest edit scripts of the SAME LENGTH and took
 *      the one that pairs the removed paragraph with the inserted one.
 *      `slideBoundaries` breaks that tie, and six arms driven under node by
 *      build/redline-slide-probe.mts pin it, each with an ablation of its own
 *      clause that must move its own arm's reading:
 *
 *        25a HIS BAD PICTURE, 15 marked runs at the parent and 3 at HEAD,
 *            being the struck word he deleted, the paragraph he inserted in
 *            green, and the one word that moved.
 *        25b THE TIE ITSELF. Over 25 documents, the line cost of the
 *            partition before the slide equals the cost after it, every time.
 *            This is what makes it a tie-BREAK rather than a different diff:
 *            the same lines are removed and the same lines are added and only
 *            their grouping moves, so it cannot buy a picture with edits
 *            jsdiff refused to spend.
 *        25c BOTH PROJECTIONS, over the same 25, plus research 74 §6.5's own
 *            picture: no marked run is a newline wearing a strikethrough, and
 *            no adjacent deletion and insertion shares whitespace at either
 *            end, which is how one would be made.
 *        25d RESEARCH 110 §6'S CORPUS, being one word changed in each of
 *            eight paragraphs with a paragraph inserted above it and below
 *            it. 1 of 8 read as the reader wants at the parent with it
 *            inserted above and 8 of 8 do at HEAD; below is 8 of 8 on both
 *            sides and must stay there.
 *        25e and 25f THE REFUSALS THAT KEEP IT NARROW, seven shapes that must
 *            each read zero slides beside a control that reads one: a bridge
 *            that is prose, a partner that is not a pure insertion, the
 *            backward direction, a candidate only as good as the pairing it
 *            would replace, a candidate that resembles nothing, and a pairing
 *            the two sides already agree on.
 *
 *      AND HIS GOOD PICTURE IS THE CONTROL. Its runs are digested and the
 *      digest is compared to the one the PARENT COMMIT printed, and it is
 *      asserted UNMOVED under every one of the six ablations. A fix that
 *      improves one picture and moves the other is not a fix.
 *
 *      Its ablation directories are `.p246-slide-*` at the repository root
 *      for rule 19's reason: .gitignore's phase-working-directory line covers
 *      them, and the copied chain imports `diff`, which node resolves by
 *      walking up to node_modules.
 *
 *  26-32. THE TABLE (Phase 251, research 114 §6.3 and §6.5). Every rule above
 *      this one asks whether the arithmetic ran on a PARAGRAPH, and a table is
 *      not a paragraph: `diffWords` matches the dash groups of one separator
 *      row against another's and the pipes of row 3 against the pipes of row
 *      5, so a table with one cell changed drew as a ribbon in which no row
 *      was recognisably a row, and all twenty-five of them passed while it
 *      did. Eleven arms on the SHIPPING composer, driven under node by
 *      build/redline-table-probe.mts, each with an ablation of its own clause.
 *
 *        26 BOTH PROJECTIONS, over the committed corpus and a seeded fuzz of
 *           420 table pairs mutated the ways a person mutates a table, being
 *           a cell rewritten, two rows swapped, a row taken out, a row put in,
 *           a column added and the separator's own dashes changed.
 *        27 NO RUN CROSSES A ROW BOUNDARY. Every run the row path emits lies
 *           wholly inside one row of the side it belongs to, and the flat path
 *           over the same block is the control that crosses four times. Its
 *           ablation makes the block ONE row again, which is the flat path
 *           wearing the table path's name.
 *        28 A RENAMED FIRST COLUMN STILL PAIRS. This is the whole of fault 3:
 *           a first-cell key cannot pair a row whose first cell is what
 *           changed, so it degrades EVERY row of a renamed label column to a
 *           whole-row pair, which is a WORSE picture than the flat stream it
 *           replaces, and a renamed label column is the commonest table edit
 *           there is. The ablation is that key, put back.
 *        29 THE THREE CAPS, ASKED AS THREE QUESTIONS, because they are three
 *           different promises and a later round can undo any one of them on
 *           its own. (a) The word budget is the BLOCK's: 60 rows spending four
 *           edits each spend 200 between them and not 240, and the ten rows
 *           past the budget are whole-row replacements. (b) The table path is
 *           INSIDE the character cap: 4,060 bytes reaches no differ at all and
 *           is counted `tooBig`, where 3,986 draws 163 runs — which is what
 *           makes "fault 3 is not fixed above the character cap" checkable
 *           rather than asserted. (c) `tableRuns` has a refusal of its own,
 *           because unlike `redlineRuns` it answers on every input there is:
 *           at 666 rows of 3,330 bytes, comfortably inside the character cap,
 *           it answers null, and at 60 it answers 120 runs — under a counter
 *           and a sentence of its OWN, `N with too many rows`, because 3,330
 *           characters is a fifth of the character cap and `too long` would be
 *           a false sentence about the only quantity it names. (d) THE FIX
 *           ROUND'S, and it is a refusal of the ANSWER rather than of the
 *           input: `tableRuns` may answer `pairs === 0`, meaning the alignment
 *           aligned no row at all, and that answer draws exactly the two runs
 *           the whole-block fallback draws — research 114 §6.3's own condemned
 *           picture, reached through the resemblance door rather than the
 *           first-cell one 28 is about. So the caller does not draw it: the
 *           block falls through to the flat path, with the whole-block
 *           fallback still behind that. The arm holds three readings against
 *           each other, because a fall-through that fires on everything is as
 *           wrong as one that fires on nothing. Over the 201 real table change
 *           blocks in this repository's own prose history it fires on 21, and
 *           the one-row bucket — 144 of the 201, where the row alignment has
 *           no second row to protect the picture FROM — goes from 16 blocks
 *           louder than the flat path to none.
 *        30 THE CANCEL PASS IS AN IDENTITY on both projections over all 435
 *           documents. IT FIRES ZERO TIMES IN THE PIPELINE and the gate prints
 *           that rather than hiding it: `peelSharedSpace` reaches the shape
 *           research 114 §6.5 rule 4 names before it does, so it is a guard
 *           rather than a repair, and the arm drives it directly so an
 *           ablation still has a reading to move.
 *        31 THE DROPPED SEPARATOR. A plain-dashes separator pair marks its
 *           DELETED copy `drop` and an alignment marker on either side draws
 *           both, and the bytes are in the run list either way, so both
 *           projections hold in the same reading. NOT DRAWN IS NOT ABSENT.
 *        32 NO CHANGE IS EVER ENTIRELY UNDRAWN, and the property is INK
 *           rather than presence: 0 of 2,457 changes over the corpus and the
 *           fuzz carry no mark a person can see. 32b is ruling 5 both ways,
 *           and it is this phase's own finding: research 114 §6.5 says a
 *           spacing change is a whitespace mark with an opposite-kind
 *           whitespace mark beside it, which is true of the MOCK's composer
 *           and false of the product's, because `peelSharedSpace` takes the
 *           shared ends off the pair and leaves the deletion standing alone.
 *           Driven over the shipping composer, the one-clause rule withheld
 *           the wash from every spacing change this path can draw.
 *
 *      Its ablation directories are `.p251-table-*` at the repository root,
 *      for rules 19 and 25's reason.
 *
 *  33-36. THE ROOM AND THE WASH (Phase 251, research 114 §6.1, §6.2 and §7
 *      arms 6, 11, 14 and 15). Every rule above these asks about the RUNS.
 *      These four ask about the page they are drawn on, which is the half
 *      research 113 measured and no gate had ever looked at: 58.42% of the
 *      pane the operator works in was empty canvas, a wrapped mark painted its
 *      15.00px font box on a 21.45px line pitch so a run drew as a stack of
 *      tiles with a 6.45px band between every pair, and the ring on the
 *      current change drew 23 outlined boxes at that pane and 43 at the
 *      panel's floor.
 *
 *        33 THE MEASURE MEANS CHARACTERS OF TEXT. `max-width: 68ch` on a box
 *           carrying 48px of padding INSIDE it delivers 62.1 characters, so
 *           the number in the stylesheet never meant what it said. The measure
 *           is the text's now and the padding is added on top of it in the
 *           page's own track; six planted stylesheets, four of which must
 *           fail, and the reading off the running app is `probe:p249`.
 *        34 THE RAIL NEVER COLLAPSES AND THE CURRENT CHANGE IS ALWAYS MARKED.
 *           The design's first version set the rail to zero at the panel's
 *           floor and scoped the outline that replaces it to the TODAY look,
 *           so at 319px the current change was marked by NOTHING AT ALL, at
 *           the one width where the outline is worst. Two halves: the
 *           stylesheet's ladder is asked of every `data-room` value read out
 *           of the shipping module, and `railBarFor` and `roomFor` are DRIVEN
 *           under node with six ablations, one clause each.
 *        35 COLOUR AND DECORATION CARRY THE MEANING, NOT THE WASH. This phase
 *           makes the wash TALLER, which is the change that would tempt a
 *           later round to let it mean something; research 113 §7.4 measured
 *           it at 1.152:1 and 1.223:1 against the canvas. With the background
 *           taken away a deletion and an insertion must still differ, in BOTH
 *           colour and decoration.
 *        36 THE WASH ARITHMETIC, AND WHAT THIS FILE CANNOT SEE. The block
 *           padding is derived from the pitch, the font box and the seam
 *           rather than typed; the short side carries its `max(0px, …)`; the
 *           trailing inline pixel is gone and the leading one stays; and the
 *           pitch agrees with the `line-height` the document really declares.
 *           THE LONG SIDE IS NOT GUARDED HERE AND CANNOT BE — `--redline-
 *           fontbox` is a font metric, a face substitution moves it, and only
 *           `probe:p249`'s painted-height reading can see the overlap.
 *
 *      Rule 34's ablation directories are `.p251-room-*` at the repository
 *      root, for rules 19, 25 and 26's reason.
 *
 *  37. THE BAR'S INNER GRID IS THE PAGE'S GRID (Phase 251, research 114 §7
 *      arm 12). `Accept all` sat 414.1px past the column's right content edge
 *      at the pane the operator works in, and research 113 §4 named the cause
 *      exactly: the bar was justified against the PANEL while the column was
 *      centred inside it, so the button's distance from the thing it acts on
 *      WAS the right-hand dead space. The fix is that the bar's inner box
 *      takes the page's own tracks, and the failure mode of the fix is the two
 *      templates drifting apart one careless edit at a time — which nothing
 *      would see, because a bar 12px out of step with its column still looks
 *      like a bar. So the two are read out of the stylesheet BY MATCHING
 *      BRACES and compared, `grid-template-columns` and `column-gap` both, and
 *      the scanner is proved on planted rules of which five must fail.
 *
 *  39. THE BAND IS MEASURED IN THE SCROLLER'S CONTENT BOX (Phase 251, the fix
 *      round). This is the half rule 38 CANNOT SEE, and it is why it is a scan
 *      of the real source rather than a seventh arm on the probe. Rule 38 and
 *      `p251-redline-controls.test.ts` both drive `chipPlace` over a MODEL of
 *      the room, and both models hand it `panel - 10`, which is the content
 *      box; the shipping caller handed `scroll.getBoundingClientRect()`, which
 *      is the BORDER box and includes the vertical scrollbar. So every number
 *      the two printed agreed while the running app placed the chip up to a
 *      scrollbar's width past the box the page is centred in: 9.7px of overhang
 *      at a 1308px panel, with `.ed-redline-scroll` really growing a horizontal
 *      scrollbar that appeared and disappeared as the pointer moved onto and
 *      off a change. THE BAND ARM IS THE ONE PLACEMENT IN THIS VIEW THAT IS
 *      DELIBERATELY OUTSIDE THE PAGE, so it is the one that can grow the
 *      scroller's scrollable area, and the width it is judged against is all
 *      that stands between it and doing so. Asked over the real file by
 *      matching parentheses: `chipPlace` is called from exactly one place, with
 *      four arguments, and its third names `clientWidth` and never
 *      `getBoundingClientRect` or `offsetWidth`. Seven planted callers, five of
 *      which must fail. The BEHAVIOURAL half is `npm run probe:p249`'s band
 *      sweep, which reads the overhang and the scrollbar off the running app.
 *
 *  38. THE CHIP TAKES THE BAND ARM ONLY WHEN THE BAND HOLDS ITS OWN DRAWN
 *      WIDTH (Phase 251, research 114 §7 arm 13, §6.4). Six arms on the
 *      SHIPPING `chipPlace` and `chipAnchorRect`, driven under node by
 *      build/redline-chip-probe.mts, each with an ablation of its own clause.
 *
 *        ONE DECISION, ONE NUMBER. The first version of the design gated the
 *        margin on a `data-room` ladder at 1060px while the placement asked
 *        whether a 264px track was at least 200px wide: two undeclared numbers
 *        and a 264px cliff on one pixel of drag. The question is asked once
 *        here, of the chip's own drawn width, so A RE-LABELLED BUTTON MOVES
 *        THE ANSWER BY ITSELF — 258.28px takes the band at the operator's pane
 *        and 299.07px does not, at the same pixel. The ablation is that
 *        ladder, being a constant threshold in place of the measurement.
 *
 *        THE TEST AND THE PLACEMENT ARE THE SAME ARITHMETIC, which is what
 *        makes it one number rather than two: the arm asks for the chip's
 *        width plus the gutter and then puts the chip at that gutter, so an
 *        accepted chip really fits. The arm reads `fits` for every cell and an
 *        ablation that places further out than the test allowed goes red.
 *
 *        THE OVERLAY ARM IS REQUIRED AND IS NOT A FALLBACK ANYBODY MAY
 *        DELETE. Research 96 §4.1 and research 113 §7.3 each measured 0.00px
 *        of free canvas at the editor panel's own floor and this probe reads
 *        the same 0.00px there, so at 319px there is nowhere else for the
 *        controls to be. Phase 236's placement is unchanged inside it.
 *
 *        THE ANCHOR IS UNTOUCHED. `chipAnchorRect` still answers
 *        `getClientRects()[0]`, asks for no bounding box at all, and research
 *        96 §4.5's own 435.73px displacement is re-derived through the
 *        shipping placement rather than quoted.
 *
 *        THE PAGE IS THE CONTAINING BLOCK IN BOTH ARMS, which is the fact
 *        redline-chip.tsx, RedlineDocument.tsx and redline.css all state and
 *        must move together. Moving the page moves the overlay placement with
 *        it by exactly as much and moves the band placement by nothing at all,
 *        because the band is the page's own width plus the gutter.
 *
 *      Its ablation directories are `.p251-chip-*` at the repository root, for
 *      rules 19, 25 and 26's reason.
 *
 *  40. THE PRESS THAT MOVES ON (2026-09-16; rewritten by Phase 282 on
 *      2026-09-17, when PR 28's own rule was measured wrong twice).
 *      ⌥↩ stopped marking the change under focus and ⌥⌫ puts it back, and both
 *      now leave the person on the change that was DRAWN AFTER the one they
 *      pressed, so a run of approvals or rejections is one chord pressed over
 *      and over rather than ⌥↩ ⌥↓ repeated. Past the end the picture comes
 *      round to its first remaining change rather than stranding the changes
 *      above it.
 *
 *      THE FOLLOWER IS CARRIED BY IDENTITY AND THE INDEX IS ONLY THE
 *      FALLBACK. PR 28 carried the pressed change's INDEX across the redraw
 *      and took the element standing there afterwards, on the claim that both
 *      verbs leave every other change in the order it was drawn in. The Phase
 *      282 review measured that claim false twice: ⌥⌫ RE-READS the file, so
 *      an agent's write already on disk above the pressed change adds a
 *      change in front of it and the move landed on the one the person had
 *      just walked past — which the next ⌥⌫ in the rhythm would rewrite, and
 *      a per-change accept has no undo; and a redraw RE-CUTS neighbours, so
 *      accepting change 3 of 4 in a list landed on a merged bullet above it.
 *      So `pressMoveOf` records WHICH change came next and `landingAfterPress`
 *      asks three questions in one fixed order: WAIT while the pressed change
 *      is still drawn on `off`, `del` AND `ins` (and not `sameChange`, which
 *      parked the move on an agent's new change at the same span); then the
 *      FOLLOWER by `sameChange`, at its offset plus an accept's own
 *      `ins.length - del.length` when it was drawn after the pressed one;
 *      then `indexAfterRemoval`, only when that follower is gone. The view
 *      names `indexAfterRemoval` nowhere at all now.
 *
 *      THE TWO VERBS DIFFER IN ONE WAY THAT MATTERS: an accept moves the
 *      baseline in memory and redraws in its own tick, while a rewind writes
 *      the file. Measured in the app at 35 ms against 1,139 ms, and PR 28's
 *      author's own complaint — so a landed write is ADOPTED by the tab that
 *      wrote it, which is the line this rule refuses to lose. Two orderings
 *      ride on that adoption and both are read here: the host takes the
 *      keyboard BEFORE it, because a rewind of the ONLY remaining change
 *      removes the wrapper the keyboard was on and Chromium sends focus to
 *      `document.body`, where the scroller's key handler never hears ⌥⇧⌫
 *      again; and the hold LANDS AFTER it, with the bytes the tab holds once
 *      the adoption has had its say.
 *
 *      ONE PRESS AT A TIME. A rewind is in the air for a write and, when the
 *      adoption refuses, a whole watcher round trip, and the picture goes on
 *      drawing the change it rewound. So the press takes a HOLD; a second
 *      rewind of that change and every accept on that tab answer `held` with
 *      a sentence and touch nothing; and the hold is let go by a layout
 *      effect keyed on the picture AND on `savedContents`, because a watcher
 *      read moves the bytes without moving a dirty tab's picture. A KEY
 *      REPEAT IS NOT A PRESS either: with the move-on, a held ⌥⌫ became
 *      "rewind every change in the file, writing it once per change" and a
 *      held ⌥↩ became the accept-all chord keymap.ts removed on purpose, so a
 *      repeated keydown runs only `next` and `prev` — after the
 *      `preventDefault()`, which is not optional, because an unprevented ⌥⌫
 *      in the `plaintext-only` document is Chromium's `deleteWordBackward`.
 *
 *      THE CLEAN TRANSITION NAMES THE RE-READ (Phase 282.2). A landed hold on
 *      a dirty tab answers every accept with "Save or undo your edits first,
 *      then accept", and Phase 282.1's reverify measured the undo leading
 *      nowhere: ⌘Z takes the tab back to clean and NO READ FOLLOWS, because
 *      `refreshRepo` had one caller, the watcher's tick, and the rewind's own
 *      tick was spent while the tab was dirty — so the hold stood on a clean
 *      tab and every ⌥↩ said "still being rewound" while nothing was. So the
 *      view holds an effect keyed on `[tab.dirty]` ALONE that, with a landed
 *      hold, calls the store's `rereadRepo`, and `rereadRepo` reaches
 *      `refreshRepo`. The refusals are read with it: no read without a landed
 *      hold, none on the way INTO dirty, and no adoption of the bytes the
 *      hold remembers, because a read asks the disk what is there NOW. THE
 *      DIRECTION IS READ TOO, since the phase's fix round: both verifiers
 *      planted `if (!tab.dirty) return;` in a scratch copy and this rule
 *      exited 0, so the two spellings it accepts (the early return on the
 *      un-negated flag, the guard round the call on the negated one) are read
 *      for which way they test, and any other spelling is refused by name.
 *
 *      AND live-text.ts READS NO WORKING MODEL ON THE RENDER PATH. PR 28
 *      added one line there that read the model at every render; it made the
 *      Redline view draw text one keystroke ahead of the typing hook's own
 *      last picture, which is the BLOCKING scramble (`swift` typed as
 *      `swfti`, and `probe:p237` failing 5 checks in the app). The `useState`
 *      initialiser and the effect may read the model; nothing that runs on
 *      every render may.
 *
 *      IT IS A SCAN BECAUSE THE SUITE CANNOT SEE IT: this tree carries no
 *      jsdom, so nothing in vitest focuses an element, and the move is read
 *      off one picture and spent on the next. Four scanners, over
 *      RedlineDocument.tsx, redline-current.ts, live-text.ts and (since Phase
 *      282.2, for `rereadRepo` alone) store.ts, reading the callbacks and the
 *      effects by MATCHING PARENTHESES so that one callback's references are
 *      never mistaken for another's. Each is proved on planted shapes this
 *      file writes, one per clause that must fail, and then on ABLATIONS OF
 *      THE SHIPPING SOURCE — the identity lookup removed so only the index is
 *      left, the holds dropped from each verb, the host focus dropped, the
 *      repeat test dropped, PR 28's live-text line put back, the clean
 *      transition's effect removed, its landed-hold test removed, its flag
 *      test inverted, the store's `rereadRepo` reaching nothing, and five
 *      more — each of which must turn this rule red on its own clause. The
 *      ablations are made on the strings in memory and never on the tree,
 *      because this gate runs in the commit battery; the four files' sha256
 *      are compared in a `finally` to prove it.
 *
 *  41. A KEYSTROKE BELONGS TO THE TAB IT WAS TYPED IN (Phase 297). Type one
 *      character in one file's Redline view, click another Redline tab, and
 *      the second file's buffer became the first file's whole text: the tab
 *      read unsaved, the page drew every word of the second file as deleted,
 *      and ⌘S wrote the first file's bytes over the second file with nothing
 *      asked. Every release from 0.102.0 through 0.108.0 had it. One mount
 *      serves every tab (`<RedlineDocument>` is unkeyed on purpose, and
 *      keying it is refused — it would move five other per-mount lifetimes),
 *      so the render that carries the ARRIVING tab still carries the
 *      DEPARTING tab's typing state; the `[tabId]` effect's `setState` is a
 *      task, the edit effect below it runs in the same commit, and its
 *      continuation after `await ensureWorkingModel` is a microtask. A
 *      microtask cannot lose to a task, so the departing tab's text reached
 *      the arriving tab's model every time, before React's reset render could
 *      land. Five clauses, all in ./redline-edits:
 *
 *        41a THE STATE CARRIES ITS TAB, in the `useState` and in the reseed
 *            the `[tabId]` effect makes, because a state with no tab id is a
 *            state the effect below cannot tell from its own. The reseed
 *            stamps the tab the effect is running FOR: `{ tabId: state.tabId }`
 *            names a tab id to any question that only asks whether one is
 *            mentioned, and the id it names is the one the state ALREADY
 *            carried, which at a tab change is the departing tab's — so the
 *            arriving tab is handed a state that still belongs to the tab it
 *            came from and every return below it passes.
 *        41b THE EDIT EFFECT RETURNS ON ANOTHER TAB'S STATE, THE RIGHT WAY
 *            ROUND, AND RETURNS FIRST. The return must be taken when the state
 *            belongs to ANOTHER tab: flipped — `===` where `!==` belongs, one
 *            character — it drops every keystroke this tab really typed and
 *            lets the departing tab's text through, and it answers every other
 *            question this rule asks. The test is read in the honest spellings
 *            rather than in one: the field either way round, a negation of it,
 *            and a BOOLEAN NAMED for it (`const mine = state.tabId === tabId;`
 *            above `if (!mine) return;`), which is the same test and must not
 *            be reported as a missing one. And the return must stand ABOVE the
 *            line that records `written.current`: the Phase 297 attack measured
 *            the other placement leaking BYTE FOR BYTE, because the seed the
 *            `[tabId]` effect stamped is the departing tab's text and the
 *            phantom third run then applies it. One line down is the mistake a
 *            builder really makes, so it is an ablation of its own rather than
 *            the deleted return anything would catch.
 *        41c THE SLOT IS KEYED BY THE TAB THAT TYPED IT. `wanted` holds a
 *            text per tab (a map, or a pair carrying the id), every write
 *            files it under `tabId`, and the continuation applies only this
 *            tab's own text, so two tabs with continuations in flight cannot
 *            take each other's.
 *        41d `lastEdit` IS RESET AT A TAB CHANGE, or the arriving tab's first
 *            keystroke folds into the departing tab's undo step.
 *        41e AND THE `[tabId]` EFFECT NEVER EMPTIES THE WHOLE SLOT. The
 *            attack's second finding: with the slot blanked, a first keystroke
 *            whose real chunk load is still in flight when the person clicks
 *            away finds nothing to apply, the character is DROPPED and the
 *            provisional dirty mark stands on nothing. Dropping the ARRIVING
 *            tab's own entry is allowed; blanking the slot is not.
 *        41f AND IT RESETS THE COUNT, `written.current = 0`, in the same
 *            effect. Left at the departing tab's count, the reset render — this
 *            hook's own edits back at 0 against that count — reads as a
 *            keystroke nobody typed, and the phantom third run the return above
 *            exists to stop is back with the seed, which is the departing tab's
 *            own text. The line is in the shipping source and was load bearing
 *            from the first build; nothing asked for it until now, so a round
 *            that dropped it would have left this rule green.
 *
 *      IT IS A SCAN FOR THE REASON RULE 40 IS ONE, and for one more: under
 *      `act` an update scheduled from a passive effect is flushed before the
 *      continuation's microtask, so a unit case that wraps the switch in `act`
 *      observes the order the app never has and passes at the parent. The
 *      order is reproduced in ./__tests__ by driving the switch outside it;
 *      this rule pins the WIRING, which is the half a later round would drop.
 *      One scanner over the shipping file, proved on planted hooks written
 *      here in BOTH shapes the fix may take and in both honest spellings of
 *      the return, one plant per clause that must fail, and then on ablations
 *      of the shipping source — the seed's tab id taken out of the declaration
 *      and out of the reseed, the reseed stamped with the id the state already
 *      carried, the return deleted, the return moved one line down, the return
 *      flipped the wrong way round in the comparison and again through a
 *      boolean named for it, the slot unkeyed, the write filed under no tab,
 *      the continuation's key dropped, the `lastEdit` reset deleted, the count
 *      reset deleted and the blanket drop put back — each of which must turn
 *      this rule red on its own clause. Made on the string in memory, with the
 *      file's sha256 compared in a `finally`, because this gate runs in the
 *      commit battery.
 *      Rule 9's derived set already covers ./redline-edits and no file is
 *      added, so its floor of 23 is unchanged.
 *
 * Exit 0 when every rule passes, 1 otherwise with each failure named.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  blockAt,
  callArguments,
  closeOf,
  functionBodyOf,
  stripComments
} from './scan-source.mjs';
import { tsxCli } from './ts-runner.mjs';

const TAG = '[conformance:redline]';
const failures = [];
const fail = (message) => failures.push(message);
const say = (line) => console.log(`${TAG} ${line}`);

/** Milliseconds the worst case the caps allow may cost. */
const WORST_CASE_CEILING_MS = 400;

// THE SET IS DERIVED, AND THE LIST BELOW IS THE REASONS. The Phase 227
// verifier planted a guarded write in `redline-commands.ts`, a redline file
// this list did not name, and rule 9 stayed green: the charter's own sentence
// is that "the write does not go into a seventh file so the scanner misses
// it", and a hand list is exactly how a seventh file gets missed. So the files
// rule 9 scans are every file under src/renderer/editor whose name begins
// `redline`, `Redline`, `rewind` or `baseline` (the last two the bare module
// names, the first two a prefix), read from the directory, and
// the count is held to a floor the way `gate:electron` holds its helper
// population: adding a redline file can never turn this gate red, deleting or
// renaming one does, and a deliberate deletion lowers the floor in the same
// commit. A file named outside the prefix is the stated limit, and the hand
// list is asserted to be a SUBSET of the derived set so a file it names
// cannot drift off in silence.
const REDLINE_DIR = 'src/renderer/editor';
const REDLINE_NAME = /^(redline[.-]|Redline[A-Z]|rewind\.|baseline[.-])/;
const REDLINE_FILES_FLOOR = 23;
const REDLINE_FILES = readdirSync(REDLINE_DIR)
  .filter((name) => REDLINE_NAME.test(name))
  .sort()
  .map((name) => `${REDLINE_DIR}/${name}`);
const REDLINE_FILES_NAMED = [
  'src/renderer/editor/redline.ts',
  'src/renderer/editor/redline-copy.ts',
  'src/renderer/editor/RedlineRow.tsx',
  'src/renderer/editor/redline.css',
  // Phase 194: the view and the document it draws. Same refusals.
  'src/renderer/editor/redline-document.ts',
  'src/renderer/editor/RedlineDocument.tsx',
  // Phase 225: the shadow baseline the view draws against. Same refusals,
  // because a module that decides the left side must not be able to write
  // the right one.
  'src/renderer/editor/baseline.ts',
  // Phase 227: the pure press and the one call site that writes. rewind.ts
  // decides and must never write; redline-write.ts holds the single permitted
  // write channel, which rule 9 was narrowed to allow at exactly one call site.
  'src/renderer/editor/rewind.ts',
  'src/renderer/editor/redline-write.ts',
  // Phase 251: the room the page has and the bar the current change draws.
  // Two pure functions and a number, out of ./RedlineDocument so rule 34 can
  // drive them under node. Same refusals.
  'src/renderer/editor/redline-room.ts',
  // Phase 227: the undo journal, per tab and in memory. It writes nothing.
  'src/renderer/editor/redline-journal.ts',
  // Phase 227: the refusal sentences. Text for a person, no write.
  'src/renderer/editor/redline-sentences.ts',
  // Phase 227: the road from the native menu to the mounted view. No write.
  'src/renderer/editor/redline-commands.ts',
  // Phase 227 fix round: the press, which owns the order between the chord
  // and the one call site and moves the journal. It names no bridge.
  'src/renderer/editor/redline-press.ts',
  // Phase 194: the harness probe that reads the view. It names no write.
  'src/renderer/editor/redline-shot-probe.ts',
  // Phase 236: the change chip, being the redline's controls on the face. It
  // draws buttons that call the SAME commands the chord and the Edit menu
  // call, so it names no bridge and reaches no write of its own.
  'src/renderer/editor/redline-chip.tsx',
  // Phase 236: the first-run line's per-session flag and its sentence. In
  // memory only, like the journal, and it writes nothing.
  'src/renderer/editor/redline-hint.ts',
  // Phase 237: typing. The rules are pure and hold no baseline; the caret is
  // the DOM half and decides nothing; the wiring joins them to the tab and
  // writes the tab's own monaco buffer, which is the same buffer ⌘S writes.
  // None of the three may reach a file: a typed character is saved through
  // the ordinary save path and never through a door of its own.
  'src/renderer/editor/redline-typing.ts',
  'src/renderer/editor/redline-caret.ts',
  'src/renderer/editor/redline-edits.ts',
  // Phase 239: the current change, held as an identity so it survives the
  // recompose an agent's write causes. It is pure, it reads drawn attributes
  // and answers elements, and it writes nothing.
  'src/renderer/editor/redline-current.ts',
  // Phase 238: the accept press. It is ./redline-press's sibling and it is
  // synchronous, because an accept writes no file (research 83 B.5) and so has
  // no read and no write to await. It names neither the store nor a bridge:
  // the advance is injected, exactly as the rewind's one call site is.
  'src/renderer/editor/redline-accept.ts',
  // Phase 243: the durable half of the baseline, decided purely. It answers
  // whether a tab may keep one, what a moved one asks main to record and what
  // a stored one comes back as. It names NO bridge: the two calls live in
  // ./tab-io beside the file read and the HEAD read, which is what keeps this
  // family's doors the ones this rule already knows about. `baseline.` became
  // `baseline[.-]` in the same change, so a `baseline-*` file cannot be the
  // seventh file the derived set exists to catch.
  'src/renderer/editor/baseline-durable.ts'
];

// ---------------------------------------------------------------------------
// The independent implementations. Hand written on purpose: a re-derivation
// that calls the same library proves only that the library is deterministic.
// ---------------------------------------------------------------------------

/** Longest common subsequence of two arrays, as a list of [i, j] pairs. */
function lcsPairs(a, b) {
  const n = a.length;
  const m = b.length;
  const table = [];
  for (let i = 0; i <= n; i++) table.push(new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[i][j] =
        a[i] === b[j]
          ? table[i + 1][j + 1] + 1
          : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const pairs = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      pairs.push([i, j]);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) i++;
    else j++;
  }
  return pairs;
}

/** What was removed and what was added, as two sequences. */
function removedAndAdded(a, b) {
  const pairs = lcsPairs(a, b);
  const keptA = new Set(pairs.map((p) => p[0]));
  const keptB = new Set(pairs.map((p) => p[1]));
  return {
    removed: a.filter((_, i) => !keptA.has(i)),
    added: b.filter((_, i) => !keptB.has(i))
  };
}

/**
 * Words for the comparison, being whitespace runs with ASCII sentence
 * punctuation trimmed off the ends. It keeps emoji, combining marks and
 * non-Latin script, which are exactly what rule 2 is about.
 */
const PUNCT = /^[.,;:!?"'`()[\]{}]+|[.,;:!?"'`()[\]{}]+$/g;
function compareWords(text) {
  return text
    .split(/\s+/)
    .map((w) => w.replace(PUNCT, ''))
    .filter((w) => w !== '');
}

// ---------------------------------------------------------------------------
// The scanners, each written so it CAN fail, and each proved below on
// fixtures this file writes.
// ---------------------------------------------------------------------------

/** Every colour literal a stylesheet or a component might carry. */
const COLOUR_LITERAL =
  /(#[0-9a-fA-F]{3,8}\b)|\b(rgba?|hsla?|color-mix|oklch|lab)\s*\(|:\s*(red|green|blue|black|white|orange|yellow|purple|pink|gray|grey)\s*[;}]/;

function findColourLiterals(source) {
  const found = [];
  for (const [index, line] of source.split('\n').entries()) {
    const bare = line.replace(/\/\*[\s\S]*?\*\//g, '');
    if (bare.trimStart().startsWith('*') || bare.trimStart().startsWith('//')) {
      continue;
    }
    const hit = COLOUR_LITERAL.exec(bare);
    if (hit !== null) found.push(`${String(index + 1)}: ${line.trim()}`);
  }
  return found;
}

/**
 * Anything that would put the redline back in the diff: an import of one of
 * its modules, Pierre's annotation slot, or the preference Phase 191 kept.
 * Comment lines are skipped, because the surface is allowed to SAY where the
 * redline went.
 */
const MOUNT_WORDS =
  /from\s+['"]\.\/(?:redline|RedlineRow|redline-copy)['"]|\b(?:lineAnnotations|renderAnnotation|diffRedline|setDiffRedline)\b/;

function findRedlineMounts(source) {
  const found = [];
  for (const [index, line] of source.split('\n').entries()) {
    const bare = line.replace(/\/\*[\s\S]*?\*\//g, '');
    if (bare.trimStart().startsWith('*') || bare.trimStart().startsWith('//')) {
      continue;
    }
    if (MOUNT_WORDS.test(bare)) found.push(`${String(index + 1)}: ${line.trim()}`);
  }
  return found;
}

// PHASE 227 NARROWED RULE 9. The redline may name exactly one write, being
// Phase 226's guarded write, at one call site, and the function holding it
// asks the generation guard before the re-read before the write.
//
// A forbidden write fails EVERYWHERE, the permitted file included: a plain
// writeFile, an accept, or an `fs:` channel string is never allowed here,
// because they follow a link or reach a second channel. The bridge itself may
// be named ONLY in the one permitted file, where the guarded write is reached.
const CALL_SITE_FILE = 'src/renderer/editor/redline-write.ts';
const CALL_SITE_FN = 'applyRewind';
// PHASE 238 TOOK `acceptChange` OUT OF THIS LIST, AND THE REASON IS THE
// PARAGRAPH RATHER THAN THE EDIT. The word was here as a PROXY for "an accept
// writes a file", which was true while there was no accept: Phase 227's own
// header said "Accepting a change writes a file, which is a feature with
// different risks". Research 83 B.3 and B.5 measured the opposite and Phase
// 238 shipped it: accepting change `e` writes THE BASELINE as `mix(runs, {e})`
// and the file's md5 is unchanged, so `acceptChange` in ./rewind.ts is a pure
// string function and banning its NAME bans the safe half of the feature while
// banning nothing dangerous. What replaced the proxy is the real property,
// asked two ways. Structurally, an accept that wrote a file would have to name
// `writeFile`, an `fs:` channel or the bridge, and all three still fail here
// and in every redline file but the one call site — the plants below drive
// exactly that shape. Behaviourally, rule 18c runs the SHIPPING accept over a
// real file on disk and compares its sha256 before and after.
const FORBIDDEN_WRITE =
  /\b(writeFile|writeFileSync|rejectChange|applyChange)\b|['"`]fs:[a-zA-Z]/;
const NAMES_BRIDGE = /\bgmuxBridge\b/;
// A MENTION and not a call. The verifier aliased the method in the permitted
// file, `const w = b.fs.writeGuarded; w.call(b.fs, ...)`, and a pattern that
// wanted `.writeGuarded(` counted it as nothing. Every appearance of the name
// outside a comment is counted, so an alias, a destructure or a bound copy is
// a second write and fails.
const WRITE_CALL = /\bwriteGuarded\b/g;

/**
 * Every finding rule 9 has over a set of redline sources (a Map of relative
 * path to source). Empty means the redline has exactly one reviewed write and
 * the guard in front of it. Written so it CAN fail, and proved on fixtures.
 */
function rule9Findings(files) {
  const out = [];
  let writeCalls = 0;
  let writeCallFile = null;
  for (const [file, source] of files) {
    const permitted = file === CALL_SITE_FILE;
    const calls = (stripComments(source).match(WRITE_CALL) ?? []).length;
    if (calls > 0) {
      writeCalls += calls;
      writeCallFile = file;
    }
    for (const [index, line] of source.split('\n').entries()) {
      const bare = line.replace(/\/\*[\s\S]*?\*\//g, '');
      if (bare.trimStart().startsWith('*') || bare.trimStart().startsWith('//')) continue;
      if (FORBIDDEN_WRITE.test(bare)) {
        out.push(`9. ${file} names a forbidden write: ${String(index + 1)}: ${line.trim()}`);
      }
      if (!permitted && NAMES_BRIDGE.test(bare)) {
        out.push(`9. ${file} reaches the bridge, which only ${CALL_SITE_FILE} may: ${String(index + 1)}: ${line.trim()}`);
      }
    }
  }
  if (writeCalls !== 1) {
    out.push(`9. the redline names the guarded write ${String(writeCalls)} time(s); it must name it exactly once`);
  } else if (writeCallFile !== CALL_SITE_FILE) {
    out.push(`9. the one guarded write is in ${writeCallFile}, and it must be ${CALL_SITE_FILE}`);
  } else {
    // The order, read from the call site's own braces.
    const body = functionBodyOf(stripComments(files.get(CALL_SITE_FILE) ?? ''), CALL_SITE_FN);
    if (body === null) {
      out.push(`9. ${CALL_SITE_FN} is not a declared function, so the guard order cannot be read by braces`);
    } else {
      const guard = body.search(/drawnGeneration[\s\S]{0,40}generation/);
      const read = body.indexOf('readFile(');
      const write = body.search(/\bwriteGuarded\b/);
      if (guard === -1) out.push(`9. ${CALL_SITE_FN} does not ask the baseline generation guard`);
      else if (read === -1) out.push(`9. ${CALL_SITE_FN} does not re-read the file`);
      else if (!(guard < read && read < write)) {
        out.push(`9. ${CALL_SITE_FN} does not ask the guard before the re-read before the write`);
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Run the probe.
// ---------------------------------------------------------------------------

const probe = spawnSync(
  process.execPath,
  [
    tsxCli(),
    '--tsconfig',
    'tsconfig.node.json',
    'build/redline-conformance-probe.mts'
  ],
  { encoding: 'utf8', cwd: process.cwd(), maxBuffer: 32 * 1024 * 1024 }
);
if (probe.status !== 0) {
  process.stderr.write(
    `${TAG} the probe did not run:\n${probe.stderr || '(no output)'}\n`
  );
  process.exit(1);
}
let data;
try {
  data = JSON.parse(probe.stdout);
} catch {
  process.stderr.write(`${TAG} the probe did not print JSON:\n${probe.stdout}\n`);
  process.exit(1);
}

// -- rule 1: the prose allowlist, asked of BOTH askers -----------------------
//
// PHASE 243'S FIX ROUND ADDED THE SECOND HALF. The store keeps a baseline only
// for a file the redline would draw, and it cannot import the renderer, so it
// asks `@shared/prose-paths`'s `isProsePath`. Phase 243 shipped that module
// saying "one list, two askers" while `redline.ts` still declared the same
// seven strings of its own — two lists, no import, and nothing comparing
// them, so an extension added to one would make the store keep baselines for
// files the view never draws or refuse one it does. The list is imported now,
// and this rule asks both answers over the same names so they cannot drift
// again.
for (const row of data.paths.yes) {
  if (row.redline !== true) fail(`1. ${row.path} should get a redline and does not.`);
}
for (const row of data.paths.no) {
  if (row.redline !== false) fail(`1. ${row.path} should get no redline and does.`);
}
for (const row of [...data.paths.yes, ...data.paths.no]) {
  if (row.prose !== row.redline) {
    fail(
      `1. the view and the store disagree about ${row.path}: the redline says ` +
        `${String(row.redline)} and the baseline store says ${String(row.prose)}.`
    );
  }
}
say(
  `1. the allowlist says yes to ${String(data.paths.yes.length)} prose names and ` +
    `no to ${String(data.paths.no.length)} others, including .rst, .adoc and .org, ` +
    `and the view and the baseline store agree on all ` +
    `${String(data.paths.yes.length + data.paths.no.length)}`
);

// -- rules 2 and 3: round trip, and the independent re-derivation ------------
let compared = 0;
let excluded = 0;
for (const pair of data.pairs) {
  if (pair.runs === null) {
    // Only the pair that is meant to defeat the guard may come back null.
    if (pair.name !== 'rewritten past the guard') {
      fail(`2. "${pair.name}" gave up, and only the rewritten fixture may.`);
    }
    continue;
  }
  if (pair.rebuiltNew !== pair.newText) {
    fail(
      `2. "${pair.name}" does not rebuild its new text: ` +
        `${JSON.stringify(pair.rebuiltNew)} against ${JSON.stringify(pair.newText)}.`
    );
  }
  if (pair.rebuiltOld !== pair.oldText) {
    fail(
      `2. "${pair.name}" does not rebuild its old text: ` +
        `${JSON.stringify(pair.rebuiltOld)} against ${JSON.stringify(pair.oldText)}.`
    );
  }
  if (pair.lcs !== true) {
    excluded += 1;
    if (typeof pair.why !== 'string' || pair.why === '') {
      fail(`3. "${pair.name}" is excluded from the re-derivation and says no reason why.`);
    } else {
      say(`3. excluded from the re-derivation: "${pair.name}", because ${pair.why}`);
    }
    continue;
  }
  const mine = removedAndAdded(
    compareWords(pair.oldText),
    compareWords(pair.newText)
  );
  const theirs = {
    removed: pair.runs
      .filter((r) => r.kind === 'del')
      .flatMap((r) => compareWords(r.text)),
    added: pair.runs
      .filter((r) => r.kind === 'ins')
      .flatMap((r) => compareWords(r.text))
  };
  if (JSON.stringify(mine.removed) !== JSON.stringify(theirs.removed)) {
    fail(
      `3. "${pair.name}" removed words disagree: this file derived ` +
        `${JSON.stringify(mine.removed)}, the module drew ${JSON.stringify(theirs.removed)}.`
    );
  }
  if (JSON.stringify(mine.added) !== JSON.stringify(theirs.added)) {
    fail(
      `3. "${pair.name}" added words disagree: this file derived ` +
        `${JSON.stringify(mine.added)}, the module drew ${JSON.stringify(theirs.added)}.`
    );
  }
  compared += 1;
}
if (compared < 6) {
  fail(`3. only ${String(compared)} pair(s) were re-derived, which is too few to mean anything.`);
}
say(
  `2. ${String(data.pairs.length)} pairs round-trip both sides byte for byte, ` +
    'emoji with a zero width joiner, combining marks, a right to left run and Japanese included'
);
say(
  `3. ${String(compared)} of them re-derived by a hand written LCS in this file and agreed, ` +
    `${String(excluded)} excluded, each with its reason printed above`
);

// -- rule 4: the anchors, re-derived ----------------------------------------
{
  const oldLines = data.wholeFile.oldLines;
  const newLines = data.wholeFile.newLines;
  const pairs = lcsPairs(oldLines, newLines);
  const keptNew = new Set(pairs.map((p) => p[1]));
  const keptOld = new Set(pairs.map((p) => p[0]));
  // Walk the two files together, grouping each run of unmatched lines into one
  // block, and take the last added line of each block as the anchor.
  const expected = [];
  let i = 0;
  let j = 0;
  let p = 0;
  while (i < oldLines.length || j < newLines.length) {
    const nextPair = pairs[p];
    if (nextPair !== undefined && nextPair[0] === i && nextPair[1] === j) {
      i++;
      j++;
      p++;
      continue;
    }
    let lastAdded = -1;
    let sawDeletion = false;
    while (
      (i < oldLines.length && !keptOld.has(i)) ||
      (j < newLines.length && !keptNew.has(j))
    ) {
      if (i < oldLines.length && !keptOld.has(i)) {
        sawDeletion = true;
        i++;
      }
      if (j < newLines.length && !keptNew.has(j)) {
        lastAdded = j;
        j++;
      }
    }
    if (lastAdded >= 0) expected.push({ side: 'additions', lineNumber: lastAdded + 1 });
    else if (sawDeletion) expected.push({ side: 'deletions', lineNumber: i });
  }
  const drawn = data.wholeFile.blocks.map((b) => ({
    side: b.side,
    lineNumber: b.lineNumber
  }));
  if (JSON.stringify(drawn) !== JSON.stringify(expected)) {
    fail(
      `4. the anchors disagree: this file derived ${JSON.stringify(expected)}, ` +
        `the module produced ${JSON.stringify(drawn)}.`
    );
  }
  // The patch fixture: hunk header `+40,5` with one context line before the
  // change, so the file line number is 41 while the index into additionLines
  // is 1. An anchor built from the index would read 2.
  const partial = data.partial.blocks[0];
  if (partial === undefined || partial.lineNumber !== 41) {
    fail(
      '4. the patch fixture anchored at ' +
        `${JSON.stringify(partial?.lineNumber ?? null)} rather than 41, which is what an ` +
        'anchor built from the index into additionLines rather than from the hunk header does.'
    );
  }
  say(
    `4. ${String(drawn.length)} anchors re-derived by a line level LCS and agreed ` +
      `(${JSON.stringify(drawn)}), and the patch fixture anchored at ` +
      `${String(partial?.lineNumber ?? 0)} where an index would read 2`
  );
}

// -- rule 5: the caps -------------------------------------------------------
{
  const rewritten = data.pairs.find((p) => p.name === 'rewritten past the guard');
  if (rewritten === undefined || rewritten.runs !== null) {
    fail('5. a fully rewritten block did not defeat maxEditLength, so the guard is inert.');
  }
  if (data.capped.blocks !== data.caps.maxBlocks || data.capped.skipped.overCap !== 5) {
    fail(
      `5. the block cap did not fire: ${String(data.capped.blocks)} blocks drew and ` +
        `${String(data.capped.skipped.overCap)} were held back.`
    );
  }
  if (data.big.blocks !== 0 || data.big.skipped.tooBig !== 1) {
    fail(
      `5. the character budget did not fire: ${String(data.big.blocks)} blocks drew and ` +
        `${String(data.big.skipped.tooBig)} were held back.`
    );
  }
  if (data.worst.ms > WORST_CASE_CEILING_MS) {
    fail(
      `5. the worst case the caps allow cost ${String(data.worst.ms)}ms against a ceiling of ` +
        `${String(WORST_CASE_CEILING_MS)}ms. Lower REDLINE_MAX_EDIT_LENGTH or ` +
        'REDLINE_MAX_BLOCKS rather than raising the ceiling.'
    );
  }
  say(
    `5. all three caps fired, and the worst case they allow (${String(data.caps.maxBlocks)} blocks ` +
      `of ${String(data.caps.maxBlockChars)} rewritten characters) cost ${String(data.worst.ms)}ms ` +
      `against a ceiling of ${String(WORST_CASE_CEILING_MS)}ms`
  );
}

// -- rule 6: silence when nothing was skipped -------------------------------
if (data.emptyNote !== null || data.wholeFile.note !== null) {
  fail(
    `6. a clean file grew a note: ${JSON.stringify(data.wholeFile.note)} / ` +
      `${JSON.stringify(data.emptyNote)}.`
  );
}
if (typeof data.capped.note !== 'string' || !data.capped.note.includes('60')) {
  fail(`6. a file with skipped blocks said nothing: ${JSON.stringify(data.capped.note)}.`);
}
say('6. nothing skipped means no note, and something skipped says how many and why');

// -- rules 7 to 9: the refusals, scanned over the real source ---------------
const sources = new Map();
for (const file of REDLINE_FILES) {
  sources.set(file, readFileSync(file, 'utf8'));
}
if (REDLINE_FILES.length < REDLINE_FILES_FLOOR) {
  fail(`9. ${String(REDLINE_FILES.length)} redline files under ${REDLINE_DIR}, under the floor of ${String(REDLINE_FILES_FLOOR)}: a redline file was deleted or renamed, and a deliberate deletion lowers the floor in the same commit`);
}
for (const file of REDLINE_FILES_NAMED) {
  if (!REDLINE_FILES.includes(file)) {
    fail(`9. ${file} is named in the reasons list and not found by the derivation, so the list and the tree disagree`);
  }
}
say(`9. ${String(REDLINE_FILES.length)} redline files scanned, derived by name from ${REDLINE_DIR} (floor ${String(REDLINE_FILES_FLOOR)}), ${String(REDLINE_FILES_NAMED.length)} of them with a reason in the list`);
for (const file of [
  'src/renderer/editor/PierreDiff.tsx',
  'src/renderer/editor/DiffControls.tsx'
]) {
  const hits = findRedlineMounts(readFileSync(file, 'utf8'));
  if (hits.length > 0) {
    fail(
      `7. ${file} puts the redline back in the diff, which the operator asked out on 2026-09-01: ${hits.join(' | ')}`
    );
  }
}
say('7. the diff surface and its control row name no redline module, slot or preference, so the diff draws only what Pierre draws');

for (const file of [
  'src/renderer/editor/RedlineRow.tsx',
  'src/renderer/editor/RedlineDocument.tsx',
  'src/renderer/editor/redline.css',
  // Phase 236: the chip is a fourth drawn thing and is held to the same rule.
  'src/renderer/editor/redline-chip.tsx'
]) {
  const hits = findColourLiterals(sources.get(file) ?? '');
  if (hits.length > 0) {
    fail(`8. ${file} carries a colour literal: ${hits.join(' | ')}`);
  }
}
say('8. the row and the view draw from tokens only, with no colour literal in a component or the stylesheet');

for (const finding of rule9Findings(sources)) fail(finding);
say(
  `9. the redline names one guarded write at one call site (${CALL_SITE_FILE}), ` +
    `whose function asks the baseline generation guard before the re-read before the write, ` +
    `and no forbidden write anywhere`
);

// -- rule 10: the gate is named ---------------------------------------------
{
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  if (pkg.scripts['conformance:redline'] === undefined) {
    fail('10. package.json does not name conformance:redline.');
  }
  const checks = readFileSync('build/verification-checks.mjs', 'utf8');
  if (!checks.includes("'conformance:redline'")) {
    fail('10. build/verification-checks.mjs does not classify conformance:redline.');
  }
  say('10. the gate is named in package.json and classified in build/verification-checks.mjs');
}

// -- rule 11: a whitespace only change is flagged ---------------------------
{
  const blocks = Array.isArray(data.spacing.blocks) ? data.spacing.blocks : [];
  const flagged = blocks.filter((b) => b.whitespaceOnly === true);
  const plain = blocks.filter((b) => b.whitespaceOnly !== true);
  const runsOf = (b) => (b.runs ?? []).map((r) => `${r.kind}:${r.text}`);
  if (flagged.length !== 2) {
    fail(
      `11. the spacing fixture flagged ${String(flagged.length)} block(s) rather than 2: ` +
        JSON.stringify(blocks.map((b) => ({ w: b.whitespaceOnly, runs: runsOf(b) })))
    );
  } else if (
    flagged.some(
      (b) =>
        (b.runs ?? []).length !== 1 ||
        b.runs[0].kind !== 'same' ||
        (b.runs ?? []).some((r) => r.kind !== 'same')
    )
  ) {
    fail(
      `11. a flagged block drew something other than one unchanged run: ` +
        JSON.stringify(flagged.map(runsOf))
    );
  } else if (plain.length !== 1 || !runsOf(plain[0]).some((r) => r.startsWith('del:'))) {
    fail(
      `11. the real change in the spacing fixture was mis-flagged: ` +
        JSON.stringify(plain.map((b) => ({ w: b.whitespaceOnly, runs: runsOf(b) })))
    );
  } else if (data.spacing.note !== null) {
    fail(`11. a flagged block was counted as skipped: ${JSON.stringify(data.spacing.note)}`);
  } else {
    say(
      `11. a whitespace only change is flagged and draws its sentence: ` +
        `${String(flagged.length)} flagged (${JSON.stringify(flagged.map(runsOf))}), ` +
        `${String(plain.length)} not`
    );
  }
}

// -- rule 12: the accounting -----------------------------------------------
{
  const rows = Array.isArray(data.accounting) ? data.accounting : [];
  const bad = rows.filter((row) => {
    const skipped = row.skipped ?? {};
    const total =
      row.drawn + (skipped.tooBig ?? 0) + (skipped.tooDifferent ?? 0) + (skipped.overCap ?? 0);
    return total !== row.changeBlocks;
  });
  if (rows.length < 5) {
    fail(`12. only ${String(rows.length)} fixture(s) reported their accounting.`);
  } else if (bad.length > 0) {
    fail(
      `12. a change block was neither drawn nor counted: ` +
        JSON.stringify(bad)
    );
  } else {
    say(
      `12. every change block is drawn or counted, over ${String(rows.length)} fixtures: ` +
        rows
          .map(
            (row) =>
              `${row.name} ${String(row.drawn)}+${String(
                (row.skipped.tooBig ?? 0) +
                  (row.skipped.tooDifferent ?? 0) +
                  (row.skipped.overCap ?? 0)
              )}=${String(row.changeBlocks)}`
          )
          .join(', ')
    );
  }
}

// -- rule 13: the person's pasteboard is put back in a `finally` ------------
//
// The same shape build/assert-electron-teardown.mjs uses on an Electron kill,
// and for the same reason: a restore on the happy path is a restore that
// worked because nothing threw.
{
  /**
   * The chain of blocks enclosing EVERY call site of `needle`, read by
   * MATCHING BRACES. Strings, template literals and comments are skipped, so
   * neither a brace nor the word `finally` inside one can fool it, and the
   * needle itself is only ever found in code. Every occurrence, not the first:
   * a second call somewhere else is exactly what this has to catch.
   */
  const enclosingBlocks = (source, needle) => {
    const opens = [];
    const sites = [];
    let i = 0;
    while (i < source.length) {
      if (source.startsWith(needle, i)) {
        sites.push(
          opens.map((at) =>
            source.slice(Math.max(0, at - 60), at).replace(/\s+/g, ' ').trim()
          )
        );
        i += needle.length;
        continue;
      }
      const c = source[i];
      if (c === '/' && source[i + 1] === '/') {
        const nl = source.indexOf('\n', i);
        i = nl === -1 ? source.length : nl;
        continue;
      }
      if (c === '/' && source[i + 1] === '*') {
        const end = source.indexOf('*/', i + 2);
        i = end === -1 ? source.length : end + 2;
        continue;
      }
      if (c === "'" || c === '"' || c === '`') {
        i += 1;
        while (i < source.length) {
          if (source[i] === '\\') {
            i += 2;
            continue;
          }
          if (source[i] === c) {
            i += 1;
            break;
          }
          i += 1;
        }
        continue;
      }
      if (c === '{') opens.push(i);
      else if (c === '}') opens.pop();
      i += 1;
    }
    return sites;
  };
  const inFinally = (chain) => chain.some((head) => /\bfinally\s*$/.test(head));
  const inside = (chain, name) => chain.some((head) => head.includes(name));

  // The scanner, proved on fixtures, because a scan that cannot fail proves
  // nothing. The fourth hides the word in a comment on purpose.
  const dir = mkdtempSync(join(tmpdir(), 'redline-finally-'));
  try {
    const FIXTURES = [
      { name: 'in a finally', src: 'try { a(); } finally { restore(); }', want: true },
      { name: 'in the try only', src: 'try { a(); restore(); } catch (e) { log(e); }', want: false },
      {
        name: 'after the try',
        src: 'try { a(); } catch (e) { log(e); }\nrestore();',
        want: false
      },
      {
        name: 'the word in a comment',
        src: 'try {\n  // finally {\n  restore();\n} catch (e) { log(e); }',
        want: false
      }
    ];
    const wrong = [];
    for (const fixture of FIXTURES) {
      const file = join(dir, `${fixture.name.replace(/\s+/g, '-')}.ts`);
      writeFileSync(file, fixture.src);
      const sites = enclosingBlocks(readFileSync(file, 'utf8'), 'restore();');
      const got = sites.length === 1 && sites.every(inFinally);
      if (got !== fixture.want) {
        wrong.push(`${fixture.name}: read ${String(got)} over ${String(sites.length)} site(s)`);
      }
    }
    if (wrong.length > 0) {
      fail(`13. the brace scanner is wrong on its own fixtures: ${wrong.join(' | ')}`);
    } else {
      const shot = readFileSync('src/main/harness/shot.ts', 'utf8');
      const restores = enclosingBlocks(shot, 'restoreClipboard();');
      const clears = enclosingBlocks(shot, 'clipboard.clear();');
      const loose = restores.filter((chain) => !inFinally(chain));
      const strayClears = clears.filter((chain) => !inside(chain, 'restoreClipboard'));
      if (restores.length === 0) {
        fail('13. src/main/harness/shot.ts no longer calls restoreClipboard().');
      } else if (loose.length > 0) {
        fail(
          '13. the clipboard restore in src/main/harness/shot.ts is not inside a `finally`, so a ' +
            'throw after the copy leaves the copied text on the person’s own pasteboard. ' +
            `Enclosing blocks: ${JSON.stringify(loose)}`
        );
      } else if (strayClears.length > 0) {
        fail(
          '13. clipboard.clear() is reached from outside the restore in ' +
            `src/main/harness/shot.ts: ${JSON.stringify(strayClears)}`
        );
      } else {
        say(
          `13. the pasteboard is put back in a finally at ${String(restores.length)} call site(s) ` +
            `(${String(FIXTURES.length)} scanner fixtures behaved), and the ` +
            `${String(clears.length)} clipboard.clear() call site(s) are all inside the restore`
        );
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// -- rule 14: the runs are never reordered into pairs -----------------------
{
  const pair = (data.pairs ?? []).find(
    (one) => one.name === 'insertion before its deletion'
  );
  const kinds = ((pair ?? {}).runs ?? []).map((run) => run.kind).join(',');
  const WANT = 'same,ins,same,del,same';
  if (kinds !== WANT) {
    fail(
      `14. the order fixture came out ${JSON.stringify(kinds)} rather than ` +
        `${JSON.stringify(WANT)}. If jsdiff itself changed, re-measure and move the ` +
        'expectation; if this module now reorders the runs, it is drawing a diff nobody ' +
        'computed and the comment in redline.ts ruling 6 is false again.'
    );
  } else {
    // The pair is excluded from rule 3 because the LCS has a tie, so the
    // independent comparison happens here instead, as multisets rather than
    // sequences: the two implementations keep a different one of three
    // identical tokens and remove the same eight words.
    const mine = removedAndAdded(
      compareWords(pair.oldText),
      compareWords(pair.newText)
    );
    const theirs = {
      removed: pair.runs.filter((r) => r.kind === 'del').flatMap((r) => compareWords(r.text)),
      added: pair.runs.filter((r) => r.kind === 'ins').flatMap((r) => compareWords(r.text))
    };
    const bag = (list) => [...list].sort().join('|');
    if (bag(mine.removed) !== bag(theirs.removed) || bag(mine.added) !== bag(theirs.added)) {
      fail(
        `14. the order fixture's words disagree with this file's own derivation: removed ` +
          `${JSON.stringify(theirs.removed)} against ${JSON.stringify(mine.removed)}, added ` +
          `${JSON.stringify(theirs.added)} against ${JSON.stringify(mine.added)}.`
      );
    } else {
      say(
        `14. the runs keep jsdiff's own order: the order fixture is ${kinds}, with the ` +
          'insertion before a deletion it is not paired with and nothing tidying it, and its ' +
          `${String(theirs.removed.length)} removed and ${String(theirs.added.length)} added ` +
          'words match this file’s own derivation as multisets'
      );
    }
  }
}


// -- rule 15: the document, both projections re-derived by plain joins ------
{
  const docs = Array.isArray(data.document) ? data.document : [];
  const oldOf = (runs) => runs.filter((r) => r.kind !== 'ins').map((r) => r.text).join('');
  const newOf = (runs) => runs.filter((r) => r.kind !== 'del').map((r) => r.text).join('');
  const at = (a, b) => {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return `offset ${String(i)}: ${JSON.stringify(a.slice(i, i + 20))} against ${JSON.stringify(b.slice(i, i + 20))}`;
  };
  if (docs.length < 20) fail(`15. only ${String(docs.length)} document fixture(s) were composed.`);
  let wholeSeen = 0;
  for (const d of docs) {
    if (!Array.isArray(d.runs)) {
      fail(`15. "${d.name}" printed no runs.`);
      continue;
    }
    const o = oldOf(d.runs);
    const n = newOf(d.runs);
    if (o !== d.old) fail(`15. "${d.name}" with the insertions dropped is not the old file, ${at(o, d.old)}.`);
    if (n !== d.new) fail(`15. "${d.name}" with the deletions dropped is not the new file, ${at(n, d.new)}.`);
    for (let i = 1; i < d.runs.length; i++) {
      if (d.runs[i].kind === d.runs[i - 1].kind) fail(`15. "${d.name}" has two adjacent ${d.runs[i].kind} runs.`);
    }
    if (d.runs.some((r) => r.text === '')) fail(`15. "${d.name}" holds an empty run.`);
    if (d.whole.unaligned !== 0) fail(`15. "${d.name}" had ${String(d.whole.unaligned)} block(s) the repair refused.`);
    const whole = d.whole.tooBig + d.whole.tooDifferent + d.whole.overCap;
    wholeSeen += whole;
    // A refused block draws WHOLE and the note says so; a clean document has none.
    if (whole > 0 && (typeof d.note !== 'string' || !d.note.includes('drawn whole'))) {
      fail(`15. "${d.name}" drew ${String(whole)} block(s) whole and its note does not say so: ${JSON.stringify(d.note)}.`);
    }
    if (whole === 0 && d.approximate !== true && d.note !== null) {
      fail(`15. "${d.name}" drew every block as words and still carries a note: ${JSON.stringify(d.note)}.`);
    }
  }
  const unchanged = docs.find((d) => d.name === 'unchanged');
  if (unchanged !== undefined && !(unchanged.runs.length === 1 && unchanged.runs[0].kind === 'same' && unchanged.blocks === 0)) {
    fail(`15. the unchanged file is not one plain run: ${JSON.stringify(unchanged.runs.map((r) => r.kind))}.`);
  }
  const cap = docs.find((d) => d.name === 'past the block cap');
  if (cap !== undefined && cap.whole.overCap !== 5) fail(`15. the block cap fired ${String(cap.whole.overCap)} times, wanting 5.`);
  const big = docs.find((d) => d.name === 'past the character budget');
  if (big !== undefined && big.whole.tooBig !== 1) fail(`15. the character budget fired ${String(big.whole.tooBig)} times, wanting 1.`);
  const rewritten = docs.find((d) => d.name === 'rewritten past the guard');
  if (rewritten !== undefined && !(rewritten.whole.tooDifferent === 1 && rewritten.runs.map((r) => r.kind).join(',') === 'same,del,ins,same')) {
    fail(`15. the rewritten paragraph did not draw whole between its context: ${JSON.stringify(rewritten.runs.map((r) => r.kind))}.`);
  }
  const coarse = docs.filter((d) => d.name.startsWith('rewritten past the line guard'));
  if (coarse.length < 4) fail(`15. only ${String(coarse.length)} fixture(s) reach the coarse fallback, wanting 4.`);
  for (const d of coarse) {
    if (d.approximate !== true) fail(`15. the line guard did not fire on "${d.name}".`);
  }
  // The coarse fallback's shared head is a LINE of the old side, so it must
  // be empty or end on a newline, and the new side must begin with it. A
  // head of "\n" over a new side that begins with "n" is the one byte defect
  // the verifier of Phase 194 caught.
  for (const d of coarse) {
    const head = d.runs[0]?.kind === 'same' ? d.runs[0].text : '';
    if (!(head === '' || head.endsWith('\n')) || !d.new.startsWith(head)) {
      fail(`15. "${d.name}" claims a shared head ${JSON.stringify(head.slice(0, 20))} that is not a line both sides begin with.`);
    }
  }
  if (wholeSeen < 7) fail(`15. only ${String(wholeSeen)} block(s) drew whole across the fixtures, so the caps were not all seen.`);
  const f = data.fuzz ?? {};
  if (!(f.pairs >= 3000 && f.oldWrong === 0 && f.newWrong === 0 && f.unaligned === 0)) {
    fail(`15. the fuzz disagreed: ${JSON.stringify(f)}.`);
  }
  say(
    `15. ${String(docs.length)} whole file fixtures re-derived by plain joins: with the insertions dropped they are the old file and with the deletions dropped the new file, byte for byte; ` +
      `${String(wholeSeen)} refused blocks drew whole and were named in the note; the fuzz held over ${String(f.pairs)} pairs in ${String(f.ms)} ms with ${String(f.unaligned)} repairs refused and ${String(f.whole)} blocks drawn whole`
  );
}

// -- rule 16: a change to the last word of a line stays on its line -----------
{
  const docs = Array.isArray(data.document) ? data.document : [];
  const isSpace = (ch) => /\s/.test(ch);
  let pairs = 0;
  for (const d of docs) {
    if (!Array.isArray(d.runs)) continue;
    for (let i = 1; i < d.runs.length; i++) {
      const p = d.runs[i - 1];
      const q = d.runs[i];
      if (p.kind === 'same' || q.kind === 'same') continue;
      pairs += 1;
      const end = p.text.slice(-1);
      const start = p.text.charAt(0);
      if (isSpace(end) && end === q.text.slice(-1)) {
        fail(`16. "${d.name}" has a ${p.kind} and an ${q.kind} that share the trailing ${JSON.stringify(end)}: ${JSON.stringify(p.text.slice(-24))} then ${JSON.stringify(q.text.slice(-24))}.`);
      }
      if (isSpace(start) && start === q.text.charAt(0)) {
        fail(`16. "${d.name}" has a ${p.kind} and an ${q.kind} that share the leading ${JSON.stringify(start)}: ${JSON.stringify(p.text.slice(0, 24))} then ${JSON.stringify(q.text.slice(0, 24))}.`);
      }
    }
  }
  if (pairs < 20) fail(`16. only ${String(pairs)} adjacent pair(s) were seen across the fixtures, too few to mean anything.`);
  // The exact runs, so the rule is seen to say what the words are, not only
  // what they are not.
  const want = {
    'last word of a line': ['same:We ship on ', 'del:Monday', 'ins:Friday', 'same:\nNext line.\n'],
    'last word of the file': ['same:- item one\n- item ', 'del:two', 'ins:three', 'same:\n'],
    'last word before a blank line': ['same:Ends ', 'del:here', 'ins:there', 'same:\n\nNext.\n'],
    'last word with crlf': ['same:one\r\n', 'del:two', 'ins:2', 'same:\r\nthree\r\n'],
    'first word after shared indentation': ['same:list:\n    ', 'del:old', 'ins:new', 'same: item\n'],
    'a whole line, drawn as a pair': ['same:a\n\tkept tab ', 'del:old', 'ins:new', 'same:\nz\n']
  };
  let pinned = 0;
  for (const [name, runs] of Object.entries(want)) {
    const d = docs.find((one) => one.name === name);
    if (d === undefined) {
      fail(`16. the fixture "${name}" was not composed.`);
      continue;
    }
    const got = d.runs.map((r) => `${r.kind}:${r.text}`);
    if (JSON.stringify(got) !== JSON.stringify(runs)) {
      fail(`16. "${name}" drew ${JSON.stringify(got)}, wanting ${JSON.stringify(runs)}.`);
    } else pinned += 1;
  }
  const f = data.fuzz ?? {};
  if (f.edgeShared !== 0) fail(`16. the fuzz found ${String(f.edgeShared)} adjacent pair(s) sharing whitespace at an end.`);
  say(`16. ${String(pairs)} adjacent deletion and insertion pairs across the fixtures share no whitespace at either end, ${String(pinned)} last word fixtures drew exactly the runs pinned, and the fuzz found ${String(f.edgeShared)} such pairs over ${String(f.pairs)}`);
}

// ---------------------------------------------------------------------------
// The scanners, proved on fixtures this file writes. A scan that cannot fail
// proves nothing, so every one of the three is shown failing and passing.
// ---------------------------------------------------------------------------
{
  const dir = mkdtempSync(join(tmpdir(), 'redline-gate-'));
  let behaved = 0;
  try {
    const cases = [
      {
        what: 'a stylesheet with a hex literal',
        file: 'bad.css',
        body: '.ed-redline del { color: #e5655e; }',
        run: (s) => findColourLiterals(s).length > 0,
        want: true
      },
      {
        what: 'a stylesheet with an rgba literal',
        file: 'bad2.css',
        body: '.ed-redline ins { background: rgba(1, 2, 3, 0.1); }',
        run: (s) => findColourLiterals(s).length > 0,
        want: true
      },
      {
        what: 'a stylesheet with a named colour',
        file: 'bad3.css',
        body: '.ed-redline del { color: red; }',
        run: (s) => findColourLiterals(s).length > 0,
        want: true
      },
      {
        what: 'a stylesheet drawing only from tokens',
        file: 'good.css',
        body: '.ed-redline del { color: var(--error); background: var(--error-wash); }',
        run: (s) => findColourLiterals(s).length > 0,
        want: false
      },
      {
        what: 'a comment naming a colour, which is not a declaration',
        file: 'good2.css',
        body: '/* measured at #e5655e in the running app */\n.x { color: var(--error); }',
        run: (s) => findColourLiterals(s).length > 0,
        want: false
      },
      {
        what: 'a diff surface mounting the redline in the annotation slot',
        file: 'bad-slot.tsx',
        body: '<FileDiff fileDiff={meta} lineAnnotations={annotations} renderAnnotation={draw} />',
        run: (s) => findRedlineMounts(s).length > 0,
        want: true
      },
      {
        what: 'a diff surface importing the row',
        file: 'bad-import.tsx',
        body: "import { RedlineRow } from './RedlineRow';",
        run: (s) => findRedlineMounts(s).length > 0,
        want: true
      },
      {
        what: 'a control row reading the preference Phase 191 kept',
        file: 'bad-pref.tsx',
        body: '  const redline = useEditor((s) => s.diffRedline);',
        run: (s) => findRedlineMounts(s).length > 0,
        want: true
      },
      {
        what: 'a diff surface that only says where the redline went',
        file: 'good-surface.tsx',
        body: "// Phase 191 used lineAnnotations and renderAnnotation; see ./redline\n<FileDiff fileDiff={meta} options={options} />",
        run: (s) => findRedlineMounts(s).length > 0,
        want: false
      },
      {
        what: 'a diff surface that only says where the redline went (second copy)',
        file: 'good-surface2.tsx',
        body: "// see ./redline for lineAnnotations\n<FileDiff options={options} />",
        run: (s) => findRedlineMounts(s).length > 0,
        want: false
      }
    ];
    for (const one of cases) {
      const path = join(dir, one.file);
      writeFileSync(path, one.body);
      const got = one.run(readFileSync(path, 'utf8'));
      if (got !== one.want) {
        fail(
          `fixture "${one.what}" was expected to ${one.want ? 'fail' : 'pass'} the scan and did not.`
        );
      } else behaved += 1;
    }
    say(`${String(behaved)} fixtures behaved, so the three scanners above can fail`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Rule 9's narrowed scanner, proved on planted redline sets. A scan that
// cannot fail proves nothing, so the shape that ships passes and four shapes
// a later round might write must each be caught: a second call site, a write
// in another redline file, the guard after the read, and no guard at all.
// ---------------------------------------------------------------------------
{
  const SHIPPING_CALL = `import { gmuxBridge } from '../bridge';
export async function applyRewind(ctx) {
  if (ctx.drawnGeneration !== ctx.generation) return { refused: 'baselineMoved' };
  const bridge = gmuxBridge();
  const read = await bridge.fs.readFile(ctx.path);
  const result = await bridge.fs.writeGuarded({ root: ctx.root, path: ctx.path, contents: 'x' });
  return result;
}`;
  const cleanReader = `export function changesOf(runs) { return runs; }`;
  const map = (entries) => new Map(entries);
  const CALL = 'src/renderer/editor/redline-write.ts';
  const PLANTS = [
    {
      what: 'the shipping shape: one guarded call, guard before read before write',
      files: [[CALL, SHIPPING_CALL], ['src/renderer/editor/rewind.ts', cleanReader]],
      wantFail: false
    },
    {
      what: 'a second call site in the permitted file',
      files: [[CALL, SHIPPING_CALL + `
export async function again(ctx) { const b = gmuxBridge(); return b.fs.writeGuarded({ root: ctx.root, path: ctx.path, contents: 'y' }); }`]],
      wantFail: true
    },
    {
      what: 'a write in another redline file',
      files: [[CALL, SHIPPING_CALL], ['src/renderer/editor/rewind.ts', `export async function sneak() { await gmux.fs.writeFile('/x', 'y'); }`]],
      wantFail: true
    },
    {
      what: 'the guard after the read',
      files: [[CALL, `import { gmuxBridge } from '../bridge';
export async function applyRewind(ctx) {
  const bridge = gmuxBridge();
  const read = await bridge.fs.readFile(ctx.path);
  if (ctx.drawnGeneration !== ctx.generation) return { refused: 'baselineMoved' };
  return bridge.fs.writeGuarded({ root: ctx.root, path: ctx.path, contents: 'x' });
}`]],
      wantFail: true
    },
    {
      what: 'no guard at all',
      files: [[CALL, `import { gmuxBridge } from '../bridge';
export async function applyRewind(ctx) {
  const bridge = gmuxBridge();
  const read = await bridge.fs.readFile(ctx.path);
  return bridge.fs.writeGuarded({ root: ctx.root, path: ctx.path, contents: 'x' });
}`]],
      wantFail: true
    },
    {
      what: 'the bridge named in another redline file',
      files: [[CALL, SHIPPING_CALL], ['src/renderer/editor/RedlineDocument.tsx', `import { gmuxBridge } from '../bridge';\nexport function View() { return null; }`]],
      wantFail: true
    },
    {
      // PHASE 238. The accept that SHIPS is a pure string function and must
      // pass, or the gate bans the safe half of the feature.
      what: 'the shipping accept: a pure baseline computation in rewind.ts',
      files: [[CALL, SHIPPING_CALL], ['src/renderer/editor/rewind.ts', `export function acceptChange(runs, changes, index) { return mix(runs, changes, new Set([index])); }`]],
      wantFail: false
    },
    {
      // And an accept that reaches a file is still caught, which is what the
      // removed word used to stand in for.
      what: 'an accept that writes a file',
      files: [[CALL, SHIPPING_CALL], ['src/renderer/editor/redline-accept.ts', `export async function acceptChange(p, b) { await gmux.fs.writeFile(p, b); }`]],
      wantFail: true
    },
    {
      what: 'an accept that reaches the bridge from a second file',
      files: [[CALL, SHIPPING_CALL], ['src/renderer/editor/redline-accept.ts', `import { gmuxBridge } from '../bridge';\nexport function accept() { return gmuxBridge(); }`]],
      wantFail: true
    },
    {
      what: "the verifier's alias: a bound copy of the method in the permitted file, called without its name",
      files: [[CALL, SHIPPING_CALL + `
export async function again(ctx) { const b = gmuxBridge(); const w = b.fs.writeGuarded; return w.call(b.fs, { root: ctx.root, path: ctx.path, contents: 'y' }); }`]],
      wantFail: true
    },
    {
      what: "the verifier's seventh file: a guarded write in redline-commands.ts",
      files: [[CALL, SHIPPING_CALL], ['src/renderer/editor/redline-commands.ts', `import { gmuxBridge } from '../bridge';\nexport function run() { return gmuxBridge()?.fs.writeGuarded({ root: '/', path: '/x', contents: 'y' }); }`]],
      wantFail: true
    }
  ];
  let behaved9 = 0;
  for (const plant of PLANTS) {
    const findings = rule9Findings(map(plant.files));
    const failed = findings.length > 0;
    if (failed === plant.wantFail) behaved9 += 1;
    else fail(`9. the narrowed scanner misread "${plant.what}": ${JSON.stringify(findings)}`);
  }
  say(`9. the narrowed scanner behaved on ${String(behaved9)} of ${String(PLANTS.length)} planted redline sets`);
}

// ---------------------------------------------------------------------------
// PHASE 227, item 8: six arms on the SHIPPING rewind.ts, one per loss research 83 measured, and a seventh from the fix round on the SHIPPING press,
// 83 measured, each a pure computation over two strings through
// build/redline-rewind-probe.mts. Every arm goes red under an ablation of its
// clause: the gate copies the four value modules of the pure chain to a dotted
// subdir of the editor, edits one clause of the copy's rewind.ts, and fails
// unless that arm's reading moves. The copies are removed in a `finally`.
// ---------------------------------------------------------------------------
{
  const CHAIN = ['rewind.ts', 'redline-document.ts', 'redline.ts', 'paths.ts', 'redline-press.ts', 'redline-journal.ts'];
  const EDITOR = 'src/renderer/editor';
  const runRewindProbe = (dir) => {
    const probe = spawnSync(
      process.execPath,
      [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/redline-rewind-probe.mts'],
      { encoding: 'utf8', cwd: process.cwd(), maxBuffer: 32 * 1024 * 1024, env: { ...process.env, REWIND_DIR: dir } }
    );
    if (probe.status !== 0) return { error: (probe.stderr || '(no output)').slice(-400) };
    const line = probe.stdout.trim().split('\n').pop() ?? '';
    try {
      return JSON.parse(line);
    } catch {
      return { error: `no JSON: ${probe.stdout.slice(0, 200)}` };
    }
  };

  // The seven arms, each with the reading the shipping module must print and the
  // one clause whose ablation must move it.
  const ARMS = [
    {
      name: 'the stale draw (B.4d): re-derive at press time keeps the arrival',
      key: 'staleDraw',
      expect: (a) => a.outcome === 'write' && a.rewound === true && a.keptArrival === true,
      from: 'composeRedlineDocument(input.baseline, input.fresh)',
      to: 'composeRedlineDocument(input.baseline, input.baseline)'
    },
    {
      name: 'the truncated read (E.7a), both shapes, refused before the compose',
      key: 'truncated',
      expect: (a) => a.exact === 'refused/fileTooLarge' && a.approx === 'refused/fileTooLarge',
      from: "if (input.truncated) return 'fileTooLarge';",
      to: "if (false) return 'fileTooLarge';"
    },
    {
      name: 'the moved baseline generation (B.8a), refused before any read',
      key: 'movedBaseline',
      expect: (a) => a.plain === 'refused/baselineMoved' && a.first === 'refused/baselineMoved',
      from: "if (input.drawnGeneration !== input.baselineGeneration) return 'baselineMoved';",
      to: "if (false) return 'baselineMoved';"
    },
    {
      // PHASE 273. The arm reads the SPLIT rather than one mapping: the one
      // cause `outsideRoot`'s sentence describes keeps it, and the four the
      // phase separated out take `io`, which asserts nothing. The ablation puts
      // the shipped-before mapping back on the clause that owns the split.
      name: 'the path outside every root (E.5), surfaced by the view',
      key: 'outsideRoot',
      expect: (a) =>
        a.key === 'outsideRoot' &&
        a.containment === 'io' &&
        a.protectedKey === 'io' &&
        a.unreadableKey === 'io' &&
        a.unknownKey === 'io' &&
        a.wroteKey === null,
      from: "    case 'projectClosed':\n      return 'outsideRoot';",
      to: "    case 'projectClosed':\n      return 'io';"
    },
    {
      // The other half of the same split, and it needs its own ablation
      // because the two clauses fail in opposite directions: this one puts the
      // sentence "is not in an open project" back on four causes that never
      // measured it, which is the lie Phase 273 exists to remove.
      name: 'the four split causes take io, which asserts nothing about the project',
      key: 'outsideRoot',
      expect: (a) => a.containment === 'io' && a.key === 'outsideRoot',
      from: "    case 'outside':\n    case 'protected':\n    case 'unreadable':\n    case 'projectsUnknown':\n      return 'io';",
      to: "    case 'outside':\n    case 'protected':\n    case 'unreadable':\n    case 'projectsUnknown':\n      return 'outsideRoot';"
    },
    {
      name: "the person's own insertion (A8a): rewinds AND undoes byte for byte",
      key: 'ownInsertion',
      expect: (a) => a.rewindOutcome === 'write' && a.gone === true && a.undoOutcome === 'write' && a.restored === true,
      from: 'input.fresh.slice(0, loc) + pressed.ins + input.fresh.slice(loc + pressed.del.length)',
      to: "input.fresh.slice(0, loc) + '' + input.fresh.slice(loc + pressed.del.length)"
    },
    {
      name: 'the encoding round trip (E.7b), decodeLoss refused',
      key: 'encoding',
      expect: (a) => a.outcome === 'refused/decodeLoss' && a.clean === 'write',
      from: "if (input.fresh.includes('\uFFFD')) return 'decodeLoss';",
      to: "if (false) return 'decodeLoss';"
    },
    // THE SEVENTH ARM, the fix round's. The verifier moved the focus with ⌥↓
    // while the real press awaited main's read: E0 was rewound and the journal
    // held E1, so undo refused and E0 was recoverable from nothing; moved onto
    // the pure insertion E6, undo wrote "exactly " twice. The arm drives the
    // SHIPPING press with a call site that moves the focus inside its await,
    // and the ablation is the first shipped shape put back, being the focus
    // read again after the await to build the journal entry.
    {
      name: 'the focus moved while the press awaited: the journal holds what was pressed',
      key: 'focusMoved',
      file: 'redline-press.ts',
      expect: (a) =>
        a.toNext.rewound === true && a.toNext.journalHoldsPressed === true && a.toNext.restored === true &&
        a.toInsertion.rewound === true && a.toInsertion.journalHoldsPressed === true &&
        a.toInsertion.restored === true && a.toInsertion.duplicated === false,
      from: "if (kind === 'rewind') recordRewind(tab.id, pressed);",
      to: "if (kind === 'rewind') { const p = deps.focused(); if (p !== null) recordRewind(tab.id, p); }"
    }
  ];

  const shipping = runRewindProbe(EDITOR);
  if (shipping.error !== undefined) {
    fail(`8. the rewind probe did not run: ${shipping.error}`);
  } else {
    for (const arm of ARMS) {
      if (!arm.expect(shipping[arm.key])) {
        fail(`8. the shipping rewind read the wrong thing for "${arm.name}": ${JSON.stringify(shipping[arm.key])}`);
      }
    }
    // The ablations, one clause each, in a dotted subdir removed in a finally.
    const prefix = `.p227-ablation-${process.pid.toString(36)}-`;
    const made = [];
    let red = 0;
    try {
      for (const [i, arm] of ARMS.entries()) {
        const dir = join(EDITOR, `${prefix}${String(i)}`);
        mkdirSync(dir, { recursive: true });
        made.push(dir);
        for (const f of CHAIN) cpSync(join(EDITOR, f), join(dir, f));
        const armFile = arm.file ?? 'rewind.ts';
        const target = join(dir, armFile);
        const before = readFileSync(target, 'utf8');
        if (!before.includes(arm.from)) {
          fail(`8. the ablation for "${arm.name}" found nothing to edit in ${armFile}`);
          continue;
        }
        writeFileSync(target, before.replace(arm.from, arm.to));
        const ablated = runRewindProbe(dir);
        if (ablated.error !== undefined) {
          fail(`8. the ablation for "${arm.name}" stopped the probe running (${ablated.error}), so it proves nothing`);
          continue;
        }
        const moved = JSON.stringify(ablated[arm.key]) !== JSON.stringify(shipping[arm.key]);
        if (moved) red += 1;
        else fail(`8. the ablation for "${arm.name}" changed nothing this arm reads, so it cannot fail: ${JSON.stringify(ablated[arm.key])}`);
      }
      say(`8. ${String(ARMS.length)} arms over the shipping rewind and press, and ${String(red)} of ${String(ARMS.length)} ablations moved their arm's reading`);
    } finally {
      for (const dir of made) rmSync(dir, { recursive: true, force: true });
      // A sweep, in case a name from an interrupted run is left.
      for (const name of readdirSync(EDITOR)) {
        if (name.startsWith(prefix) && existsSync(join(EDITOR, name))) {
          rmSync(join(EDITOR, name), { recursive: true, force: true });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// PHASE 237, rule 17: TYPING. Two halves, because a later round can undo
// either without touching the other.
//
// 17a is a SCAN. Research 83 A2.3: typing never moves the baseline and never
// moves the generation, so a rewind drawn before a keystroke must not refuse
// because of one. The three typing files may not name a baseline advance at
// all, which is what makes that structural rather than promised, and the
// scanner is proved on fixtures this file writes so a scan that cannot fail is
// never mistaken for a scan that passed.
//
// 17b DRIVES the shipping rules under node, one arm per trap research 97
// measured with real CDP key events, and ablates the clause behind each one.
// ---------------------------------------------------------------------------
{
  const TYPING_FILES = [
    'src/renderer/editor/redline-typing.ts',
    'src/renderer/editor/redline-caret.ts',
    'src/renderer/editor/redline-edits.ts'
  ];
  // A baseline ADVANCE, never the word: ./redline-edits is allowed to say the
  // word in a comment and the scan strips comments anyway, but no typing file
  // may call the one function that moves it or patch the field it lives in.
  const BASELINE_ADVANCE = /\bnextBaseline\b|\bbaseline\s*:|\bgeneration\s*:|\bheadSeen\b/;
  const baselineFindings = (files) => {
    const out = [];
    for (const [file, source] of files) {
      for (const [index, line] of stripComments(source).split('\n').entries()) {
        if (BASELINE_ADVANCE.test(line)) {
          out.push(`17. ${file} moves the baseline: ${String(index + 1)}: ${line.trim()}`);
        }
      }
    }
    return out;
  };

  const shippingTyping = new Map(
    TYPING_FILES.map((file) => [file, readFileSync(file, 'utf8')])
  );
  for (const file of TYPING_FILES) {
    if (!existsSync(file)) fail(`17. ${file} is not there, so rule 17 proves nothing`);
  }
  const found = baselineFindings(shippingTyping);
  for (const line of found) fail(line);

  // The scanner, proved on four plants, two of which must be caught.
  const PLANTS = [
    { name: 'a call that advances it', source: 'const b = nextBaseline(s, e);', caught: true },
    { name: 'a patch of the field', source: 'patch(id, { baseline: next });', caught: true },
    { name: 'the word in a comment', source: '// the baseline: never moved here\nconst x = 1;', caught: false },
    { name: 'an ordinary line', source: "const at = edit.start + edit.text.length;", caught: false }
  ];
  let plantsOk = 0;
  for (const plant of PLANTS) {
    const hits = baselineFindings(new Map([['plant.ts', plant.source]]));
    if (hits.length > 0 === plant.caught) plantsOk += 1;
    else fail(`17. the baseline scanner behaved wrongly on "${plant.name}"`);
  }
  say(
    `17a. ${String(TYPING_FILES.length)} typing files name no baseline advance (${String(plantsOk)} of ${String(PLANTS.length)} scanner fixtures behaved)`
  );

  // 17b. The arms.
  const TYPING_CHAIN = [
    'redline-typing.ts',
    'text-edit.ts',
    'redline-document.ts',
    'redline.ts',
    'paths.ts',
    'rewind.ts'
  ];
  const EDITOR_DIR = 'src/renderer/editor';
  const runTypingProbe = (dir) => {
    const probe = spawnSync(
      process.execPath,
      [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/redline-typing-probe.mts'],
      {
        encoding: 'utf8',
        cwd: process.cwd(),
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, TYPING_DIR: dir }
      }
    );
    if (probe.status !== 0) return { error: (probe.stderr || '(no output)').slice(-400) };
    const line = probe.stdout.trim().split('\n').pop() ?? '';
    try {
      return JSON.parse(line);
    } catch {
      return { error: `no JSON: ${probe.stdout.slice(0, 200)}` };
    }
  };

  const TYPING_ARMS = [
    {
      // Research 97 §3 corrects research 83 D.2: under `plaintext-only` a real
      // Enter reports `insertLineBreak` and NOT `insertParagraph`, so a phase
      // handling only the latter refuses Enter in silence.
      name: 'Enter is bytes, and it arrives as insertLineBreak',
      key: 'enterIsBytes',
      expect: (a) =>
        a.lineBreak.answered === true &&
        a.paragraph.answered === true &&
        a.onlyANewline === true &&
        a.lineBreak.caret === a.paragraph.caret,
      file: 'redline-typing.ts',
      from: "const LINE_BREAKS = new Set(['insertLineBreak', 'insertParagraph']);",
      to: "const LINE_BREAKS = new Set(['insertParagraph']);"
    },
    {
      // Research 97 §3.1: a redraw landing inside an open composition breaks
      // the composition and puts the committed text in a plain span, which
      // counts on the baseline side too and took the projection out by two.
      name: 'an outside write is HELD while a composition is open',
      key: 'compositionHeld',
      expect: (a) =>
        a.heldDuring === true &&
        a.heldApplied === true &&
        a.currentExact === true &&
        a.baselineExact === true &&
        a.japaneseInsideAChange === true,
      file: 'redline-typing.ts',
      from:
        '  if (state.composing !== null) {\n' +
        '    return state.held === event.text ? state : { ...state, held: event.text };\n' +
        '  }\n',
      to: ''
    },
    {
      name: "the input events a composition owns are the composition's",
      key: 'compositionIgnored',
      expect: (a) =>
        a.insertCompositionTextIgnored === true &&
        a.insertTextIgnored === true &&
        a.deleteIgnored === true &&
        a.ignoredWithNoComposition === true,
      file: 'redline-typing.ts',
      from: '    if (state.composing !== null) return state;',
      to: '    if (false) return state;'
    },
    {
      // The one door no `preventDefault` closes, read three times out of three
      // off the event itself. THE ABLATION CARRIES TWO EDITS ON PURPOSE, the
      // way conformance:logins' do: this event is guarded twice, once by the
      // named refusal and once by the default that answers nothing for an
      // input type nobody measured, so removing either alone changes nothing a
      // person could see. It plants the shape the rule refuses, being a later
      // round deciding to insert the composition's own text.
      name: 'insertCompositionText is ignored even with no composition open',
      key: 'compositionIgnored',
      file: 'redline-typing.ts',
      expect: (a) => a.ignoredWithNoComposition === true,
      edits: [
        {
          from: "    if (event.inputType === 'insertCompositionText') return state;",
          to: '    if (false) return state;'
        },
        {
          from: "const INSERTS = new Set([\n  'insertText',",
          to: "const INSERTS = new Set([\n  'insertCompositionText',\n  'insertText',"
        }
      ]
    },
    {
      // Research 97 §2.2's eight readings, four shapes with a caret in each.
      // The expected answer is re-derived in the probe by a hand walk over the
      // two texts, so this is not the module checking itself.
      name: 'the caret comes back through a redraw with 0 characters of error',
      key: 'caretThroughRedraw',
      expect: (a) =>
        a.length === 4 &&
        a.every((one) => one.error === 0) &&
        // …and the naive answer is really different on three of the four, or
        // an arm that restores nothing would read as a pass.
        a.filter((one) => one.naive !== one.got).length === 3,
      file: 'text-edit.ts',
      from:
        '  if (clamped <= prefix) return clamped;\n' +
        '  if (clamped >= oldEnd) return newText.length - (oldText.length - clamped);\n' +
        '  return prefix;',
      to: '  return clamped;'
    },
    {
      // The whole point: a keystroke folds into the CURRENT side, the composer
      // is handed the SAME baseline, and both projections stay exact.
      name: 'typing folds into the current side and the baseline does not move',
      key: 'projection',
      expect: (a) =>
        a.baselineBefore === true &&
        a.baselineAfter === true &&
        a.currentAfter === true &&
        a.insideAChange === true &&
        a.caret === a.expectedCaret &&
        a.edits === 7 &&
        JSON.stringify(a.stateKeys) ===
          JSON.stringify(['caret', 'composing', 'edits', 'held', 'text']),
      file: 'redline-typing.ts',
      from: '  return text.slice(0, edit.start) + edit.text + text.slice(edit.end);',
      to: '  return text.slice(0, edit.start) + edit.text + text.slice(edit.end + 1);'
    }
  ];

  const shippingTypingRead = runTypingProbe(EDITOR_DIR);
  if (shippingTypingRead.error !== undefined) {
    fail(`17. the typing probe did not run: ${shippingTypingRead.error}`);
  } else {
    for (const arm of TYPING_ARMS) {
      if (!arm.expect(shippingTypingRead[arm.key])) {
        fail(
          `17. the shipping typing read the wrong thing for "${arm.name}": ${JSON.stringify(shippingTypingRead[arm.key])}`
        );
      }
    }
    // THE ABLATED COPIES ARE SIBLINGS OF THE FILES THEY ABLATE, and the depth
    // is exact, for the reason `build/conformance-credentials.mjs` states over
    // its own `.p204-ablation-` copies. The chain reaches `diff`,
    // `@pierre/diffs` and `@shared/fs-ops`, so a copy in the system temporary
    // directory cannot resolve any of the three: every ablation would fail to
    // IMPORT rather than fail the rule it removed, and a suite red for the
    // wrong reason proves as little as one green for the wrong reason. The
    // name begins with a dot so neither TypeScript's include globs nor the
    // test runner picks it up, and the `finally` below removes every one of
    // them and then sweeps the directory for anything a kill left behind.
    const prefix = `.p237-ablation-${process.pid.toString(36)}-`;
    const made = [];
    let red = 0;
    try {
      for (const [i, arm] of TYPING_ARMS.entries()) {
        const dir = join(EDITOR_DIR, `${prefix}${String(i)}`);
        mkdirSync(dir, { recursive: true });
        made.push(dir);
        for (const f of TYPING_CHAIN) cpSync(join(EDITOR_DIR, f), join(dir, f));
        const target = join(dir, arm.file);
        const before = readFileSync(target, 'utf8');
        const edits = arm.edits ?? [{ from: arm.from, to: arm.to }];
        let ablated_source = before;
        let missing = false;
        for (const edit of edits) {
          if (!ablated_source.includes(edit.from)) {
            fail(`17. the ablation for "${arm.name}" found nothing to edit in ${arm.file}`);
            missing = true;
            break;
          }
          ablated_source = ablated_source.replace(edit.from, edit.to);
        }
        if (missing) continue;
        writeFileSync(target, ablated_source);
        const ablated = runTypingProbe(dir);
        if (ablated.error !== undefined) {
          fail(`17. the ablation for "${arm.name}" stopped the probe running (${ablated.error}), so it proves nothing`);
          continue;
        }
        const moved =
          JSON.stringify(ablated[arm.key]) !== JSON.stringify(shippingTypingRead[arm.key]);
        if (moved) red += 1;
        else {
          fail(
            `17. the ablation for "${arm.name}" changed nothing this arm reads, so it cannot fail: ${JSON.stringify(ablated[arm.key])}`
          );
        }
      }
      say(
        `17b. ${String(TYPING_ARMS.length)} arms over the shipping typing rules, and ${String(red)} of ${String(TYPING_ARMS.length)} ablations moved their arm's reading`
      );
    } finally {
      for (const dir of made) rmSync(dir, { recursive: true, force: true });
      for (const name of readdirSync(EDITOR_DIR)) {
        if (name.startsWith(prefix) && existsSync(join(EDITOR_DIR, name))) {
          rmSync(join(EDITOR_DIR, name), { recursive: true, force: true });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 18. THE CURRENT CHANGE (Phase 239). Two halves, because a later round can
// undo either without touching the other.
//
// 18a is a SCAN: neither the module that decides which change is current nor
// the view's own step may read `document.activeElement`. That single word is
// the whole of both defects research 99 measured. Reading the position off the
// focus is what swallowed the first ⌥↓ of a view (section 2.2, two runs), and
// holding the ELEMENT rather than the identity is what let an outside write
// take the person's place away while the change was still drawn with the same
// identity, offset and generation (section 2.3). `pressedElement` KEEPS its
// read of the focused wrapper and the caret, because it is what a press acts
// on when nothing has been stepped to, so the scan is aimed at the two places
// the DECISION now lives and is proved on plants that must fail.
//
// 18b DRIVES the shipping module under node through
// build/redline-current-probe.mts and ablates the clause behind each arm. The
// ablation directories are in the SYSTEM TEMPORARY DIRECTORY and not inside
// `src/`: this module's only import is `import type`, which is erased, so a
// copy resolves nothing at runtime and runs exactly where it is put.
// ---------------------------------------------------------------------------
{
  const CURRENT_FILE = 'src/renderer/editor/redline-current.ts';
  const VIEW_FILE = 'src/renderer/editor/RedlineDocument.tsx';

  // 18a. The scan.
  const currentSource = readFileSync(CURRENT_FILE, 'utf8');
  if (stripComments(currentSource).includes('activeElement')) {
    fail(`18a. ${CURRENT_FILE} names activeElement, so the current change is a focus again and the recompose takes it away (research 99 §2.3)`);
  }
  const viewSource = readFileSync(VIEW_FILE, 'utf8');
  const stepBody = functionBodyOf(stripComments(viewSource), 'step');
  const arrowStep = /const\s+step\s*=\s*useCallback\(/.test(viewSource);
  if (stepBody === null && !arrowStep) {
    fail(`18a. ${VIEW_FILE} declares no step, so the chord walks from something this rule cannot read`);
  }
  // The step is an arrow inside useCallback, so its body is read from the
  // `const step` line to the line that closes the callback at the same indent.
  const stepText = (() => {
    const at = viewSource.indexOf('const step = useCallback(');
    if (at === -1) return null;
    const end = viewSource.indexOf('\n  );', at);
    return end === -1 ? null : stripComments(viewSource.slice(at, end));
  })();
  if (stepText === null) {
    fail(`18a. could not read the step's own body out of ${VIEW_FILE}`);
  } else if (stepText.includes('activeElement')) {
    fail(`18a. the step in ${VIEW_FILE} reads activeElement, which is the swallowed first press (research 99 §2.2)`);
  }
  // The scanner is proved on plants, so a scan that cannot fail is never
  // mistaken for a scan that passed.
  const PLANTS = [
    { name: 'a clean step', text: 'const step = useCallback((d) => { walk(held, d); }\n  );', caught: false },
    { name: 'the focus put back', text: 'const step = useCallback((d) => { const a = host.ownerDocument.activeElement; walk(a, d); }\n  );', caught: true },
    { name: 'the focus in a comment only', text: 'const step = useCallback((d) => { /* not activeElement */ walk(held, d); }\n  );', caught: false }
  ];
  let plantsOk = 0;
  for (const plant of PLANTS) {
    const at = plant.text.indexOf('const step = useCallback(');
    const end = plant.text.indexOf('\n  );', at);
    const body = stripComments(plant.text.slice(at, end));
    if (body.includes('activeElement') === plant.caught) plantsOk += 1;
    else fail(`18a. the scanner behaved wrongly on the plant "${plant.name}"`);
  }
  // And the fallback is still there, or the scan above is a scan of nothing.
  // It is `pressedElement` that carries it now: the accept and the rewind both
  // read that one element, and its last two clauses are the focused wrapper
  // and the caret, which is the identity a hover with no step presses with.
  if (!viewSource.includes('pressedElement')) {
    fail('18a. the view no longer names pressedElement at all, so a hovered change with no step has no identity to press');
  }
  say(`18a. the current change and the step name no activeElement (${String(plantsOk)} of ${String(PLANTS.length)} scanner plants behaved), and the hover fallback is still named`);

  // 18b. The driven half.
  const runCurrentProbe = (dir) => {
    const probe = spawnSync(
      process.execPath,
      [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/redline-current-probe.mts'],
      {
        encoding: 'utf8',
        cwd: process.cwd(),
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, CURRENT_DIR: dir }
      }
    );
    if (probe.status !== 0) return { error: (probe.stderr || '(no output)').slice(-400) };
    const line = probe.stdout.trim().split('\n').pop() ?? '';
    try {
      return JSON.parse(line);
    } catch {
      return { error: `no JSON: ${probe.stdout.slice(0, 200)}` };
    }
  };

  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const CURRENT_ARMS = [
    {
      name: 'from nowhere, next is the first change and previous the last',
      key: 'fromNowhere',
      expect: (a) => same(a, [0, 8]),
      from: '  if (at === null) return delta === 1 ? 0 : count - 1;',
      to: '  if (at === null) return null;'
    },
    {
      name: 'THE ENDS LOOP: past the last comes round to the first, and an empty document steps nowhere',
      key: 'ends',
      expect: (a) => same(a, [8, 0, null]),
      from: '  return (at + delta + count) % count;',
      to: '  return Math.min(count - 1, Math.max(0, at + delta));'
    },
    {
      name: 'six positions, being the whole of the step',
      key: 'six',
      expect: (a) => same(a, [1, 8, 5, 3, 0, 7]),
      from: 'export function stepIndex(\n  count: number,\n  at: number | null,\n  delta: 1 | -1\n): number | null {\n  if (count <= 0) return null;',
      to: 'export function stepIndex(\n  count: number,\n  at: number | null,\n  delta: 1 | -1\n): number | null {\n  if (count <= 0) return null;\n  delta = (delta === 1 ? -1 : 1) as 1 | -1;'
    },
    {
      name: 'THE RECOMPOSE: 9 changes become 10 and the place is still found',
      key: 'recompose',
      expect: (a) => same(a, { before: 6, sameObject: false, after: 7, rewound: null }),
      from: '  return a.off === b.off && a.del === b.del;',
      to: '  return (a as unknown) === (b as unknown);'
    },
    {
      name: 'a change is the span of baseline it covers, so a commit keeps your place',
      key: 'identity',
      expect: (a) =>
        same(a, {
          acrossGenerations: true,
          typedInto: true,
          differentBaselineSpan: false,
          differentOffset: false,
          noIdentity: null
        }),
      from: '  return a.off === b.off && a.del === b.del;\n}',
      to: '  return a.off === b.off && a.del === b.del && a.generation === b.generation;\n}'
    },
    {
      // THE FIX ROUND'S FINDING 1, AS THE CLAUSE THAT CAUSED IT. Phase 237
      // ships typing in this document, and typing rewrites `ins` on every
      // keystroke: with `ins` in the identity the verifier typed three
      // characters into the change the controls were drawn on and read the
      // chip GONE with 0 changes marked, 3 runs of 3, where the parent commit
      // kept them 3 of 3. The ablation is exactly the clause that shipped.
      name: 'THE TYPED-INTO CHANGE: three characters do not move the controls',
      key: 'identity',
      expect: (a) => a !== undefined && a.typedInto === true,
      from: '  return a.off === b.off && a.del === b.del;\n}',
      to: '  return a.off === b.off && a.del === b.del && a.ins === b.ins;\n}'
    },
    {
      name: 'a wrapper with no identity on it is never the current change',
      key: 'identity',
      expect: (a) => a !== undefined && a.noIdentity === null,
      from: '  if (!Number.isInteger(off) || !Number.isInteger(generation)) return null;',
      to: '  if (false) return null;'
    },
    {
      // RESEARCH 99 §2.2 AS A NUMBER. Three presses from a fresh view read 0,
      // 1, 2. A rule that reads its position from a focus that never arrived
      // reads 0, 0, 0 — the chord repeating the first change for ever.
      name: 'THE SWALLOWED FIRST PRESS: three presses walk 0, 1, 2',
      key: 'walk',
      expect: (a) => same(a, [0, 1, 2]),
      from: '  const next = stepIndex(items.length, indexOfChange(items, id), delta);',
      to: '  const next = stepIndex(items.length, null, delta);'
    },
    {
      // THE FIX ROUND'S FINDING 2. The view restores the caret after every
      // recompose, by current-side offset; a write ABOVE it leaves those
      // offsets on different text, and reading the `selectionchange` that
      // follows as the person's own move put the mark, the chip and the ⌥⌫
      // target on the change a shell had just made while the held change was
      // still drawn two rows below. The ablation is the restore comparison
      // taken out, which is what shipped.
      name: 'THE RESTORED CARET IS NOT A MOVE, and a caret elsewhere is silence',
      key: 'caret',
      expect: (a) =>
        same(a, {
          person: 'moved, on calm',
          restore: 'no move',
          elsewhere: 'no move',
          onProse: 'moved, on no change',
          firstEver: 'moved, on quick brown foxes'
        }),
      from: '  if (restored !== null && restored.anchor === now.anchor && restored.focus === now.focus) {\n    return null;\n  }',
      to: '  if (false) {\n    return null;\n  }'
    },
    {
      // THE FIX ROUND'S FINDING 3. The controls could be summoned and never
      // put away: the verifier clicked plain prose far from any change and
      // read the chip still drawn on change 0, where the parent read it gone.
      // The ablation is the chrome clause, because a rule that only asked
      // "not a change" would put the controls away every time somebody
      // reached for the chip, which lives outside the document.
      name: 'A PRESS ON THE PROSE LETS GO, and a press on the chrome does not',
      key: 'letGo',
      expect: (a) => same(a, { prose: true, change: false, chip: false, nothing: false }),
      from: '  return target.closest(DOC_SELECTOR) !== null;',
      to: '  return true;'
    },
    {
      // THE COMMITTER'S ROUND, AND IT IS THIS PHASE'S OWN SUBJECT IN A SHAPE
      // NO ARM ABOVE COULD PRODUCE. Every outside write the arms above drive
      // ADDS a change, so the wrapper is replaced and the chip's anchor prop
      // moves with it. A write that MERGES into a change keeps the count,
      // React reuses the very same DOM node, the prop is `Object.is`-equal and
      // nothing re-measures: the chip's bottom stood at 622.24 while the change
      // it names moved to 647.69, a gap of 25.44px against the 4.00px it is
      // drawn with, a whole line above the phrase, over unrelated prose, and it
      // was still there four seconds later. The ablation is what shipped.
      name: 'THE MERGED WRITE: a wrapper that SURVIVED the recompose is measured again',
      key: 'measure',
      expect: (a) => a !== undefined && a.survived === true,
      from: '  return now !== null && now === before;\n}',
      to: '  return false;\n}'
    },
    {
      // And the other side of it, because a rule that answered "yes" to
      // everything would spend a whole extra render on every draw and would
      // ask the chip to measure an element React is in the middle of
      // replacing. A DIFFERENT element needs nothing, because its own prop
      // moved; nothing drawn needs nothing, because there is no chip.
      name: 'and a REPLACED wrapper is not, nor is a face with no controls on it',
      key: 'measure',
      expect: (a) =>
        same(a, { survived: true, replaced: false, goneNow: false, fresh: false, neither: false }),
      from: '  return now !== null && now === before;',
      to: '  return now === before;'
    }
  ];

  const shippingCurrent = runCurrentProbe('src/renderer/editor');
  if (shippingCurrent.error !== undefined) {
    fail(`18b. the current-change probe did not run: ${shippingCurrent.error}`);
  } else {
    for (const arm of CURRENT_ARMS) {
      if (!arm.expect(shippingCurrent[arm.key])) {
        fail(`18b. the shipping module read the wrong thing for "${arm.name}": ${JSON.stringify(shippingCurrent[arm.key])}`);
      }
    }
    // THE ABLATED COPIES LIVE IN A SCRATCH DIRECTORY OUTSIDE `src/`, removed in
    // a finally. `redline-current.ts`'s only import is `import type`, erased at
    // runtime, so a copy anywhere resolves everything it needs, which is
    // nothing.
    const scratch = mkdtempSync(join(tmpdir(), 'p239-ablation-'));
    let red = 0;
    try {
      for (const [i, arm] of CURRENT_ARMS.entries()) {
        const dir = join(scratch, String(i));
        mkdirSync(dir, { recursive: true });
        const before = readFileSync(CURRENT_FILE, 'utf8');
        if (!before.includes(arm.from)) {
          fail(`18b. the ablation for "${arm.name}" found nothing to edit in ${CURRENT_FILE}`);
          continue;
        }
        writeFileSync(join(dir, 'redline-current.ts'), before.replace(arm.from, arm.to));
        const ablated = runCurrentProbe(dir);
        if (ablated.error !== undefined) {
          fail(`18b. the ablation for "${arm.name}" stopped the probe running (${ablated.error}), so it proves nothing`);
          continue;
        }
        if (!same(ablated[arm.key], shippingCurrent[arm.key])) red += 1;
        else {
          fail(`18b. the ablation for "${arm.name}" changed nothing this arm reads, so it cannot fail: ${JSON.stringify(ablated[arm.key])}`);
        }
      }
      say(`18b. ${String(CURRENT_ARMS.length)} arms over the shipping current change, and ${String(red)} of ${String(CURRENT_ARMS.length)} ablations moved their arm's reading`);
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
  }

  // 18c. THE WIRING, WHICH 18b CANNOT SEE.
  //
  // `chipNeedsMeasure` is a pure function and this repository carries no jsdom,
  // so nothing in `npm test` and nothing in 18b can tell a rule that is CALLED
  // from a rule that merely compiles. The defect it exists for is exactly a
  // wiring one: the answer was always available and nobody asked for it, and
  // the chip stayed 25.44px from the change it names. So the two ends are read
  // out of the real source — the view must ask the question in the same layout
  // effect that finds the marked wrapper, and the chip's placement effect must
  // DEPEND on the token the answer moves, because a token nothing depends on
  // re-measures nothing. The scanner is proved on plants that must fail.
  const CHIP_FILE = 'src/renderer/editor/redline-chip.tsx';
  /** Every `useLayoutEffect` in a source, as its body text and its deps text. */
  const layoutEffects = (text) => {
    const out = [];
    let at = text.indexOf('useLayoutEffect(');
    while (at !== -1) {
      const close = text.indexOf('}, [', at);
      if (close === -1) break;
      const end = text.indexOf(']', close);
      out.push({
        body: text.slice(at, close),
        deps: end === -1 ? '' : text.slice(close + 4, end)
      });
      at = text.indexOf('useLayoutEffect(', close);
    }
    return out;
  };
  const chipSource = readFileSync(CHIP_FILE, 'utf8');
  const chipEffects = layoutEffects(stripComments(chipSource));
  const placing = chipEffects.find((e) => e.body.includes('chipAnchorRect('));
  if (placing === undefined) {
    fail(`18c. ${CHIP_FILE} has no layout effect that places the chip, so this rule reads nothing`);
  } else if (!/\bplacement\b/.test(placing.deps)) {
    fail(`18c. the chip's placement effect does not depend on the view's placement token (deps: ${placing.deps.trim()}), so a wrapper that SURVIVED a recompose is never measured again — the 25.44px the committer's round measured`);
  }
  const marking = layoutEffects(stripComments(viewSource)).find((e) =>
    e.body.includes('setCurrentEl(')
  );
  if (marking === undefined) {
    fail(`18c. ${VIEW_FILE} has no layout effect that finds the marked wrapper, so this rule reads nothing`);
  } else if (!marking.body.includes('chipNeedsMeasure(')) {
    fail(`18c. ${VIEW_FILE} finds the marked wrapper and never asks chipNeedsMeasure, so a reused wrapper leaves the controls at the pixel the old layout put them at`);
  }
  if (!/placement=\{/.test(viewSource)) {
    fail(`18c. ${VIEW_FILE} never hands the chip a placement token at all`);
  }
  // The scanner, proved on plants. Three of the five must fail, and each one
  // is a real way a later round takes this out: the dep dropped, the ask
  // dropped, and the name left in a comment where it means nothing.
  const WIRE_PLANTS = [
    {
      name: 'the shipping shape',
      chip: 'useLayoutEffect(() => { const rect = chipAnchorRect(anchor); put(rect);\n  }, [anchor, view, chipRef, placement]);',
      view: 'useLayoutEffect(() => { setCurrentEl(el); if (chipNeedsMeasure(a, b)) remeasure();\n  }, [current, composed]);',
      ok: true
    },
    {
      name: 'the token dropped from the deps',
      chip: 'useLayoutEffect(() => { const rect = chipAnchorRect(anchor); put(rect);\n  }, [anchor, view, chipRef]);',
      view: 'useLayoutEffect(() => { setCurrentEl(el); if (chipNeedsMeasure(a, b)) remeasure();\n  }, [current, composed]);',
      ok: false
    },
    {
      name: 'the question never asked',
      chip: 'useLayoutEffect(() => { const rect = chipAnchorRect(anchor); put(rect);\n  }, [anchor, view, chipRef, placement]);',
      view: 'useLayoutEffect(() => { setCurrentEl(el);\n  }, [current, composed]);',
      ok: false
    },
    {
      name: 'the token named only in a comment',
      chip: 'useLayoutEffect(() => { const rect = chipAnchorRect(anchor); put(rect);\n  }, [anchor, view, chipRef /* placement */]);',
      view: 'useLayoutEffect(() => { setCurrentEl(el); if (chipNeedsMeasure(a, b)) remeasure();\n  }, [current, composed]);',
      ok: false
    },
    {
      name: 'a second effect beside the placing one, which must not answer for it',
      chip: 'useLayoutEffect(() => { measureNothing();\n  }, [placement]);\nuseLayoutEffect(() => { const rect = chipAnchorRect(anchor); put(rect);\n  }, [anchor, view, chipRef, placement]);',
      view: 'useLayoutEffect(() => { setCurrentEl(el); if (chipNeedsMeasure(a, b)) remeasure();\n  }, [current, composed]);',
      ok: true
    }
  ];
  let wireOk = 0;
  for (const plant of WIRE_PLANTS) {
    const c = layoutEffects(stripComments(plant.chip)).find((e) =>
      e.body.includes('chipAnchorRect(')
    );
    const v = layoutEffects(stripComments(plant.view)).find((e) =>
      e.body.includes('setCurrentEl(')
    );
    const passes =
      c !== undefined &&
      v !== undefined &&
      /\bplacement\b/.test(c.deps) &&
      v.body.includes('chipNeedsMeasure(');
    if (passes === plant.ok) wireOk += 1;
    else fail(`18c. the scanner behaved wrongly on the plant "${plant.name}"`);
  }
  say(`18c. the view asks chipNeedsMeasure where it finds the mark and the chip's placement depends on the token (${String(wireOk)} of ${String(WIRE_PLANTS.length)} scanner plants behaved, ${String(WIRE_PLANTS.filter((p) => !p.ok).length)} of them must fail)`);
}



// ---------------------------------------------------------------------------
// PHASE 238, rule 19: ACCEPT. Five arms on the SHIPPING accept, driven under
// node by build/redline-accept-probe.mts, one clause each ablated.
//
// This is the rule that makes research 83 B.3 and B.5 executable rather than
// documented, and 19b is the one that earns the phase its tier: B.8a measured
// that a baseline moving between a draw and a press makes the pressed identity
// resolve to exactly one edit that is the WRONG one, with the write answering
// success and nothing said. Phase 227 shipped the guard against a gesture that
// did not exist yet; THIS phase is the first thing that moves the generation
// often, so the guard is driven from a real accept here rather than from a
// hand-set integer.
//
// The chain is copied to `.p238-accept-*` at the REPOSITORY ROOT, which
// .gitignore's phase-working-directory line covers, and removed in a
// `finally` with a
// sweep for a name an interrupted run left. It cannot go under the OS
// temporary directory, because the copied modules import `diff` and node
// resolves that by walking up to node_modules.
// ---------------------------------------------------------------------------
{
  const ACCEPT_CHAIN = [
    'rewind.ts',
    'redline-document.ts',
    'redline.ts',
    'paths.ts',
    'redline-press.ts',
    'redline-journal.ts',
    'redline-accept.ts'
  ];
  const SRC = 'src/renderer/editor';
  const runAcceptProbe = (dir) => {
    const probe = spawnSync(
      process.execPath,
      [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/redline-accept-probe.mts'],
      {
        encoding: 'utf8',
        cwd: process.cwd(),
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, ACCEPT_DIR: dir }
      }
    );
    if (probe.status !== 0) return { error: (probe.stderr || '(no output)').slice(-400) };
    const line = probe.stdout.trim().split('\n').pop() ?? '';
    try {
      return JSON.parse(line);
    } catch {
      return { error: `no JSON: ${probe.stdout.slice(0, 200)}` };
    }
  };

  const ACCEPT_ARMS = [
    {
      name: '19a. accept over all 256 subsets is mix over that subset, and the current text never moves',
      key: 'subsets',
      expect: (a) =>
        a.subsets === 256 &&
        a.agreed === 256 &&
        a.countsHeld === 256 &&
        a.distinct === 256 &&
        a.currentMoved === 0,
      file: 'rewind.ts',
      from: 'return mix(runs, changes, new Set([index]));',
      to: 'return mix(runs, changes, new Set());'
    },
    {
      name: '19b. B.8a: a rewind drawn before an accept refuses through the SHIPPING press and writes nothing',
      key: 'pressAfterAccept',
      expect: (a) =>
        a.outcome === 'refused' &&
        a.why === 'baselineMoved' &&
        a.said === 'baselineMoved' &&
        a.fileUnmoved === true &&
        // The trap was really set: without the guard this identity resolves to
        // exactly one change, and it is the SECOND lorry.
        a.wouldResolveTo === 1 &&
        a.wouldBeWrong === true,
      file: 'rewind.ts',
      from: "if (input.drawnGeneration !== input.baselineGeneration) return 'baselineMoved';",
      to: "if (false) return 'baselineMoved';"
    },
    {
      name: '19c. B.8a the other way: an accept drawn before an accept refuses and advances nothing',
      key: 'acceptAfterAccept',
      expect: (a) =>
        a.outcome === 'refused' &&
        a.why === 'baselineMoved' &&
        a.said === 'baselineMoved' &&
        a.advanced === 0,
      file: 'rewind.ts',
      from: `  if (input.drawnGeneration !== input.baselineGeneration) {
    return { outcome: 'refused', why: 'baselineMoved' };
  }`,
      to: '  if (false) { return { outcome: \'refused\', why: \'baselineMoved\' }; }'
    },
    {
      name: '19d. an accept writes NO FILE, by a digest of a real file before and after',
      key: 'noFileWritten',
      expect: (a) =>
        a.acceptFileDigestMoved === false &&
        // The reader is shown able to see a write, in the same breath.
        a.rewindFileDigestMoved === true &&
        a.acceptedIsMixOfOne === true &&
        typeof a.acceptedBaselineSha === 'string',
      file: 'redline-accept.ts',
      from: '  deps.advance(plan.baseline, deps.now());',
      to: '  deps.advance(plan.baseline.slice(1), deps.now());'
    },
    {
      name: '19e. accept-all leaves a redline of one run and zero changes, and never asks what is focused',
      key: 'acceptAllEmpty',
      expect: (a) =>
        a.outcome === 'accepted' &&
        a.askedFocus === false &&
        a.baselineIsCurrent === true &&
        a.sameAsAcceptAll === true &&
        a.changesLeft === 0 &&
        a.runs === 1 &&
        a.nonSameRuns === 0,
      file: 'rewind.ts',
      from: `export function acceptAll(current: string): string {
  return current;
}`,
      to: `export function acceptAll(current: string): string {
  return current.slice(1);
}`
    },
    {
      // THE FIX ROUND'S ARM, and it is the one place this phase broke a
      // neighbour. A rewind's journal entry is an offset INTO the baseline it
      // was drawn against, so an accept replaces the coordinate system and
      // ./redline-write refuses the undo before it reads a byte. That refusal
      // is right and is untouched. What was wrong is that the FACE went on
      // promising the undo, and the sentence it gave told a person who had
      // pressed the recovery to press the destructive one. The arm reads the
      // refusal, that no byte moved, that the entry is still kept rather than
      // swept, and what the face's own question answers on each side of the
      // accept — with a CONTROL undo that really writes, so a reading that
      // refused whatever happened could not pass.
      name: '19f. the undo of a rewind after an accept refuses, writes nothing, and is no longer offered',
      key: 'undoAfterAccept',
      expect: (a) =>
        a.rewroteFirst === true &&
        a.undoableBefore === true &&
        a.undoableAfter === false &&
        a.outcome === 'refused' &&
        a.why === 'baselineMoved' &&
        a.said === 'baselineMoved' &&
        a.fileUnmoved === true &&
        a.depthAfter === 1 &&
        a.controlWrote === true &&
        a.controlBack === true &&
        a.controlDepth === 0,
      file: 'redline-journal.ts',
      from:
        '  return entry !== undefined && entry.generation === generation ? entry : undefined;',
      to: '  return entry;'
    }
  ];

  const shippingAccept = runAcceptProbe(SRC);
  if (shippingAccept.error !== undefined) {
    fail(`19. the accept probe did not run: ${shippingAccept.error}`);
  } else {
    for (const arm of ACCEPT_ARMS) {
      if (!arm.expect(shippingAccept[arm.key] ?? {})) {
        fail(`19. the shipping accept read the wrong thing for "${arm.name}": ${JSON.stringify(shippingAccept[arm.key])}`);
      }
    }
    const prefix = `.p238-accept-${process.pid.toString(36)}-`;
    const made = [];
    let red = 0;
    try {
      for (const [i, arm] of ACCEPT_ARMS.entries()) {
        const dir = `${prefix}${String(i)}`;
        mkdirSync(dir, { recursive: true });
        made.push(dir);
        for (const f of ACCEPT_CHAIN) cpSync(join(SRC, f), join(dir, f));
        const target = join(dir, arm.file);
        const before = readFileSync(target, 'utf8');
        if (!before.includes(arm.from)) {
          fail(`19. the ablation for "${arm.name}" found nothing to edit in ${arm.file}`);
          continue;
        }
        writeFileSync(target, before.replace(arm.from, arm.to));
        const ablated = runAcceptProbe(dir);
        if (ablated.error !== undefined) {
          fail(`19. the ablation for "${arm.name}" stopped the probe running (${ablated.error}), so it proves nothing`);
          continue;
        }
        const moved =
          JSON.stringify(ablated[arm.key]) !== JSON.stringify(shippingAccept[arm.key]);
        if (moved) red += 1;
        else {
          fail(`19. the ablation for "${arm.name}" changed nothing this arm reads, so it cannot fail: ${JSON.stringify(ablated[arm.key])}`);
        }
      }
      say(
        `19. ${String(ACCEPT_ARMS.length)} arms over the shipping accept, and ${String(red)} of ${String(ACCEPT_ARMS.length)} ablations moved their arm's reading`
      );
      if (shippingAccept.pressAfterAccept?.wouldResolveTo === 1) {
        say(
          "19b. and the guard is not a tautology: with it removed the same identity resolves to exactly one change, which is the SECOND lorry (research 83 B.8a)"
        );
      }
    } finally {
      for (const dir of made) rmSync(dir, { recursive: true, force: true });
      // A sweep, in case a name from an interrupted run is left at the root.
      for (const name of readdirSync('.')) {
        if (name.startsWith(prefix) && existsSync(name)) {
          rmSync(name, { recursive: true, force: true });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// PHASE 238's FIX ROUND, rule 20: THE KEYBOARD STAYS IN THE VIEW.
//
// One line in src/renderer/editor/RedlineDocument.tsx's accept callback puts
// the focus back on the scroller when an accept landed, and it is a DEFECT the
// builder's own `probe:p167` drive found rather than a nicety: an accept
// removes the change wrapper the keyboard was on, Chromium sends focus to
// `document.body` when a focused element leaves the tree, and the scroller's
// key handler is a React handler ON the scroller — so a keydown at body never
// reaches it and the NEXT ⌥↓ and ⌥↩ do nothing at all. Driven with two accepts
// an open, the first landed and the second never fired, six times out of
// twelve.
//
// NOTHING IN THE COMMIT BATTERY PINNED IT. `probe:p167` is the only check that
// drives it and it is not in the battery, and its accept arm can be turned off
// with `P167_ACCEPTS=0`. The suite cannot pin it either, because this tree's
// vitest environment is `node` and there is no DOM to lose a focus in. So it is
// pinned here, as a scan of the shipping source with its scanner proved on
// fixtures this file writes, which is the same instrument rules 7 to 9 use.
//
// THE GUARD IS PART OF THE RULE. A focus taken unconditionally would pull the
// keyboard off the change the person is standing on when an accept REFUSES,
// and research 96 §1.2 measured what that costs: with the focus anywhere else
// `focusedChange` answers null, so the next press does nothing, and `moveFocus`
// computes `current === -1`, so the next arrow jumps to the first change rather
// than the neighbour.
// ---------------------------------------------------------------------------
{
  const VIEW = 'src/renderer/editor/RedlineDocument.tsx';
  const HOST_FOCUS = 'hostRef.current?.focus(';
  const ACCEPTED_GUARD = "result.outcome === 'accepted'";
  /**
   * What is wrong with this source's accept callback, or an empty list. The
   * callback is found by name and read by MATCHING PARENTHESES from
   * `useCallback(`, rather than by a regular expression over lines, so a focus
   * call that belongs to a different callback of the same file cannot be read
   * as this one's.
   */
  const acceptFocusFindings = (source) => {
    const code = stripComments(source);
    const at = code.indexOf('const accept = useCallback(');
    if (at === -1) return ['no `const accept = useCallback(` in the view'];
    const open = code.indexOf('(', at + 'const accept = useCallback'.length - 1);
    const close = closeOf(code, open);
    if (close === -1) return ['the accept callback is not closed'];
    const region = code.slice(open, close + 1);
    if (!region.includes(HOST_FOCUS)) {
      return ['the accept callback never returns the keyboard to the scroller'];
    }
    const guard = region.indexOf(ACCEPTED_GUARD);
    if (guard === -1) {
      return ['the accept callback focuses the scroller with no accepted guard'];
    }
    const brace = region.indexOf('{', guard);
    const body = brace === -1 ? null : blockAt(region, brace);
    if (body === null || !body.includes(HOST_FOCUS)) {
      return ['the accept callback focuses the scroller outside the accepted guard'];
    }
    return [];
  };

  if (!existsSync(VIEW)) fail(`20. ${VIEW} is not there, so rule 19 proves nothing`);
  else {
    for (const line of acceptFocusFindings(readFileSync(VIEW, 'utf8'))) fail(`20. ${line}`);
  }

  // The scanner, proved on five plants, four of which must be caught.
  const SHAPE = (inner) =>
    `const press = useCallback(async () => {\n  hostRef.current?.focus({ preventScroll: true });\n}, []);\n` +
    `const accept = useCallback((kind, host) => {\n  const result = pressAccept(kind, tabOf(), deps(host));\n${inner}\n}, [tab.id]);\n`;
  const PLANTS = [
    {
      name: 'the shipping shape',
      source: SHAPE(
        "  if (result.outcome === 'accepted') {\n    hostRef.current?.focus({ preventScroll: true });\n  }"
      ),
      caught: false
    },
    {
      name: 'the focus line deleted',
      source: SHAPE("  if (result.outcome === 'accepted') {\n    bump();\n  }"),
      caught: true
    },
    {
      name: 'the focus taken unconditionally, which steals it on a refusal',
      source: SHAPE('  hostRef.current?.focus({ preventScroll: true });'),
      caught: true
    },
    {
      name: 'the focus inside the guard but of the wrong element',
      source: SHAPE(
        "  if (result.outcome === 'accepted') {\n    chipRef.current?.focus();\n  }"
      ),
      caught: true
    },
    {
      // The shape the paren matcher exists for: the only host focus in the
      // file belongs to the OTHER callback, and a line scan would pass it.
      name: 'the focus in the rewind callback and not the accept one',
      source:
        `const press = useCallback(async () => {\n  if (result.outcome === 'accepted') {\n    hostRef.current?.focus({ preventScroll: true });\n  }\n}, []);\n` +
        `const accept = useCallback((kind, host) => {\n  const result = pressAccept(kind, tabOf(), deps(host));\n  bump();\n}, [tab.id]);\n`,
      caught: true
    }
  ];
  let plantsOk = 0;
  for (const plant of PLANTS) {
    const hits = acceptFocusFindings(plant.source);
    if (hits.length > 0 === plant.caught) plantsOk += 1;
    else {
      fail(
        `20. the scanner behaved wrongly on "${plant.name}": ${JSON.stringify(hits)}`
      );
    }
  }
  say(
    `20. the accept returns the keyboard to the scroller, inside the accepted guard and nowhere else (${String(plantsOk)} of ${String(PLANTS.length)} scanner fixtures behaved, ${String(PLANTS.filter((q) => q.caught).length)} of them must fail)`
  );
}

// ---------------------------------------------------------------------------
// PHASE 243, rules 21 to 24: THE DURABLE BASELINE.
//
// Four arms over the SHIPPING store (src/main/baselines/store.ts) driven under
// node against a real directory on a real disk, plus the SHIPPING rule
// (src/renderer/editor/baseline.ts) driven over strings, through
// build/p243-baselines-probe.mts. Every fixture is written by the probe into a
// scratch directory under the OS temporary directory and removed in a
// `finally`; nothing is written inside `src/`, nothing under the person's home
// is read, and the "project" the store admits is a scratch directory of its
// own.
//
//  21. THE ROUND TRIP, over the corpus rules 2 and 15 already carry: emoji
//      with a zero width joiner, combining marks, a right to left run,
//      Japanese, CRLF, a lone surrogate, an empty baseline and control bytes.
//      A baseline and the HEAD version it was taken against come back byte for
//      byte and code unit for code unit, including when the two are the same
//      string and the record collapses them.
//  22. CAUGHT MID WRITE, at every step of the sequence — open, write, sync,
//      close, rename, the directory flush, and the record itself. The store
//      holds the OLD record or the NEW one and NEVER NEITHER, which is what
//      generations are for. Each fault is injected into a REAL filesystem, so
//      every step before it really happened on a real disk.
//  23. CREDIBILITY IS `nextBaseline` REPLAYED, and a hostile record is dropped
//      WHOLE. A restored baseline handed a HEAD version that has not moved
//      answers the SAME object and stands; handed one that has, it re-seeds
//      from the commit, so no narrowing across a commit survives. Then ten
//      planted records — not JSON, a version from another day, a record naming
//      a different file, entries that are not a list, a row that is not an
//      object, a sha256 that is not one, an origin nobody ships, a body path
//      of its own, a generation that is not one, and a BASELINE GENERATION
//      past the bound — are each refused with the field and the reason named,
//      and the good record still reads after them.
//  24. THE RING, THE CEILING AND THE DOOR. Five stores leave exactly two
//      bodies and two entries and the newest reads; the shipped numbers are
//      pinned (ring 2, seven days, 32 MB); the ceiling evicts oldest first and
//      keeps the newest; a record past the age bound is swept and a fresh one
//      is not; and the door's nine refusals each answer their own word and
//      leave NOTHING on disk, with a generation AT the bound still kept.
//
// Every arm goes red under an ablation of its own clause, in a dotted
// subdirectory removed in a `finally`. The store's ablations copy the store
// beside a copy of `src/main/durable`, so `../durable` still resolves; the
// rule's copy is `baseline.ts` beside a two line stand-in for `./tab-identity`,
// whose `fileInRepo` plays no part in the clause being ablated and whose real
// chain reaches half the renderer.
// ---------------------------------------------------------------------------
{
  const STORE_SRC = 'src/main/baselines';
  const DURABLE_SRC = 'src/main/durable';
  const RULE_SRC = 'src/renderer/editor';
  const DURABLE_FILES = ['index.ts', 'error.ts', 'fs.ts', 'generations.ts', 'write.ts'];

  const runBaselineProbe = (storeDir, ruleDir) => {
    const probe = spawnSync(
      process.execPath,
      [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/p243-baselines-probe.mts'],
      {
        encoding: 'utf8',
        cwd: process.cwd(),
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, BASELINES_DIR: storeDir, BASELINE_RULE_DIR: ruleDir }
      }
    );
    if (probe.status !== 0) return { error: (probe.stderr || '(no output)').slice(-500) };
    const line = probe.stdout.trim().split('\n').pop() ?? '';
    try {
      return JSON.parse(line);
    } catch {
      return { error: `no JSON: ${probe.stdout.slice(0, 200)}` };
    }
  };

  const ARMS = [
    {
      rule: 21,
      name: 'the round trip over the hostile corpus, both sides, byte for byte',
      key: 'roundTrip',
      expect: (a) => a.allBack === true && a.rows.length === 9,
      chain: 'store',
      file: 'store.ts',
      from: "const payload = Buffer.from(JSON.stringify(bodyDoc), 'utf8');",
      to: "const payload = Buffer.from(JSON.stringify(bodyDoc), 'latin1');"
    },
    {
      rule: 22,
      name: 'caught mid write at every step: the old record or the new one, never neither',
      key: 'midWrite',
      expect: (a) =>
        a.everyStepOldOrNew === true &&
        a.rows.length === 7 &&
        a.rows.every((r) => r.refused === true),
      chain: 'store',
      file: 'store.ts',
      // The record published by a plain write rather than durably, which is
      // the charter's third settled point removed: the record then commits
      // while the body did not, and the reader is left with NEITHER.
      from: `await writeDurable(
        {
          path: recordPathOf(dir, keyName),
          data: Buffer.from(JSON.stringify(record), 'utf8')
        },
        { fs: deps.fs }
      );`,
      to: `await (await import('node:fs/promises')).writeFile(
        recordPathOf(dir, keyName),
        JSON.stringify(record),
        'utf8'
      );`
    },
    {
      rule: 23,
      name: 'the credibility rule is nextBaseline replayed: a moved HEAD re-seeds',
      key: 'credibility',
      expect: (a) =>
        a.standsWhenHeadHasNotMoved === true &&
        a.reseedsWhenItHas === true &&
        a.emptyHeadNeverSeeds === true &&
        a.everyPlantDropped === true &&
        a.drops.length === 10 &&
        a.goodRecordStillReads === true,
      chain: 'rule',
      file: 'baseline.ts',
      from: '  if (event.contents === current.headSeen) return current;',
      to: '  if (true) return current;'
    },
    {
      rule: 23,
      name: 'a record naming a different file is dropped whole',
      key: 'credibility',
      expect: (a) => a.everyPlantDropped === true,
      chain: 'store',
      file: 'store.ts',
      from: '  if (baselineKeyName(file.repoPath, file.relPath) !== keyName) {',
      to: '  if (false) {'
    },
    {
      rule: 24,
      name: 'the ring is two, the ceiling evicts oldest first, and the age bound binds',
      key: 'ring',
      expect: (a) =>
        a.bodies === 2 &&
        a.entries === 2 &&
        a.generations === 2 &&
        a.maxAgeDays === 7 &&
        a.maxDirMb === 32 &&
        a.newest === 'generation 5\n' &&
        a.afterCeiling < a.beforeCeiling &&
        a.oldestGone === true &&
        a.newestKept === true &&
        a.oldSwept === true &&
        a.freshKept === true,
      chain: 'store',
      file: 'store.ts',
      from: 'export const BASELINE_GENERATIONS = 2;',
      to: 'export const BASELINE_GENERATIONS = 5;'
    },
    {
      // THE FIX ROUND'S ARM. `baselineGeneration` is what Phase 227's press
      // guard is bound to, and it was the one record field with no upper
      // bound: planted at `Number.MAX_SAFE_INTEGER` the record was accepted
      // whole, and `nextBaseline`'s `+ 1` then has a fixed point, so the guard
      // stops seeing the baseline move.
      rule: 23,
      name: 'a baseline generation past the bound is dropped whole',
      key: 'credibility',
      expect: (a) =>
        a.everyPlantDropped === true &&
        a.drops[9]?.reason === 'entries.baselineGeneration: not a generation',
      chain: 'store',
      file: 'store.ts',
      from: '      (entry.baselineGeneration as number) > BASELINE_MAX_GENERATION',
      to: '      false'
    },
    {
      rule: 24,
      name: 'the door refuses a generation past the bound and keeps one at it',
      key: 'ring',
      expect: (a) =>
        a.refusals[8]?.refused === 'input' &&
        a.atTheBoundIsKept === true &&
        a.boundStillMoves === true,
      chain: 'store',
      file: 'store.ts',
      from: '      input.generation > BASELINE_MAX_GENERATION',
      to: '      false'
    },
    {
      rule: 24,
      name: "the door's refusals, one word each, leaving nothing on disk",
      key: 'ring',
      expect: (a) =>
        a.leftBehind === 0 &&
        a.refusals.length === 9 &&
        a.refusals.map((r) => r.refused).join(',') ===
          'remote,outside,input,input,prose,truncated,tooLarge,input,input' &&
        a.refusals.every((r) => typeof r.reason === 'string' && r.reason.includes(':')) &&
        a.maxGeneration === 1_000_000_000 &&
        a.boundStillMoves === true &&
        a.atTheBoundIsKept === true,
      chain: 'store',
      file: 'store.ts',
      from: '    if (input.truncated === true) {',
      to: '    if (false) {'
    }
  ];

  const shipping = runBaselineProbe(STORE_SRC, RULE_SRC);
  if (shipping.error !== undefined) {
    fail(`21-24. the baselines probe did not run: ${shipping.error}`);
  } else {
    for (const arm of ARMS) {
      if (!arm.expect(shipping[arm.key])) {
        fail(
          `${String(arm.rule)}. the shipping store read the wrong thing for "${arm.name}": ` +
            `${JSON.stringify(shipping[arm.key]).slice(0, 600)}`
        );
      }
    }
    const storePrefix = `.p243-store-${process.pid.toString(36)}-`;
    const rulePrefix = `.p243-rule-${process.pid.toString(36)}-`;
    const made = [];
    let red = 0;
    try {
      for (const [i, arm] of ARMS.entries()) {
        let storeDir = STORE_SRC;
        let ruleDir = RULE_SRC;
        let target;
        if (arm.chain === 'store') {
          const base = join('src/main', `${storePrefix}${String(i)}`);
          mkdirSync(join(base, 'baselines'), { recursive: true });
          mkdirSync(join(base, 'durable'), { recursive: true });
          made.push(base);
          for (const f of ['store.ts', 'index.ts', 'ipc.ts']) {
            cpSync(join(STORE_SRC, f), join(base, 'baselines', f));
          }
          for (const f of DURABLE_FILES) {
            cpSync(join(DURABLE_SRC, f), join(base, 'durable', f));
          }
          storeDir = join(base, 'baselines');
          target = join(storeDir, arm.file);
        } else {
          const base = join(RULE_SRC, `${rulePrefix}${String(i)}`);
          mkdirSync(base, { recursive: true });
          made.push(base);
          cpSync(join(RULE_SRC, 'baseline.ts'), join(base, 'baseline.ts'));
          // The stand-in named in this section's header. `fileInRepo` is the
          // only value ./baseline takes from ./tab-identity, it plays no part
          // in any clause ablated here, and the real module reaches
          // ../machines and ./save-sentences.
          writeFileSync(
            join(base, 'tab-identity.ts'),
            'export function fileInRepo(_repo: string, _path: string): boolean {\n  return true;\n}\n'
          );
          ruleDir = base;
          target = join(ruleDir, arm.file);
        }
        const before = readFileSync(target, 'utf8');
        if (!before.includes(arm.from)) {
          fail(`${String(arm.rule)}. the ablation for "${arm.name}" found nothing to edit in ${arm.file}`);
          continue;
        }
        writeFileSync(target, before.replace(arm.from, arm.to));
        const ablated = runBaselineProbe(storeDir, ruleDir);
        if (ablated.error !== undefined) {
          fail(
            `${String(arm.rule)}. the ablation for "${arm.name}" stopped the probe running ` +
              `(${ablated.error}), so it proves nothing`
          );
          continue;
        }
        if (JSON.stringify(ablated[arm.key]) !== JSON.stringify(shipping[arm.key])) red += 1;
        else {
          fail(
            `${String(arm.rule)}. the ablation for "${arm.name}" changed nothing this arm reads, ` +
              'so it cannot fail'
          );
        }
      }
      say(
        `21. a baseline and the HEAD version it was taken against come back byte for byte over ` +
          `${String(shipping.roundTrip.rows.length)} hostile fixtures, the collapsed pair included`
      );
      say(
        `22. caught mid write at ${String(shipping.midWrite.rows.length)} steps of the sequence, ` +
          'every one refused and every one leaving the old record or the new one, never neither'
      );
      say(
        `23. a HEAD version that has not moved answers the SAME object and one that has re-seeds ` +
          `from the commit, and ${String(shipping.credibility.drops.length)} planted records were ` +
          'each dropped whole with the field and the reason named'
      );
      say(
        `24. five stores leave ${String(shipping.ring.bodies)} bodies and ` +
          `${String(shipping.ring.entries)} entries at ring ${String(shipping.ring.generations)}, ` +
          `the bounds are ${String(shipping.ring.maxAgeDays)} days and ` +
          `${String(shipping.ring.maxDirMb)} MB, the ceiling took the oldest and kept the newest, ` +
          `and the door's ${String(shipping.ring.refusals.length)} refusals left ` +
          `${String(shipping.ring.leftBehind)} files behind`
      );
      say(
        `21-24. ${String(ARMS.length)} arms over the shipping store and rule, and ` +
          `${String(red)} of ${String(ARMS.length)} ablations moved their arm's reading`
      );
    } finally {
      for (const dir of made) rmSync(dir, { recursive: true, force: true });
      for (const [parent, prefix] of [['src/main', storePrefix], [RULE_SRC, rulePrefix]]) {
        for (const name of readdirSync(parent)) {
          if (name.startsWith(prefix) && existsSync(join(parent, name))) {
            rmSync(join(parent, name), { recursive: true, force: true });
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// PHASE 246, rule 25: THE PARTITION'S TIE. Six arms on the SHIPPING slide,
// driven under node by build/redline-slide-probe.mts, one clause each ablated,
// with his GOOD picture held beside them as a control that may not move.
//
// Every rule above this one asks whether the arithmetic ran. Research 110
// measured a picture in which it ran perfectly and was still unreadable, so
// none of them could see it, and none of them can see it coming back.
// ---------------------------------------------------------------------------
{
  const SLIDE_CHAIN = ['redline-document.ts', 'redline.ts', 'paths.ts'];
  const SRC = 'src/renderer/editor';
  // The digest the PARENT COMMIT printed for his good picture, taken with the
  // same probe over HEAD~1's redline-document.ts on 2026-09-09. It is here so
  // the control is a measurement of the other side rather than a promise.
  const GOOD_AT_THE_PARENT = '662f5a30ef765e70';

  const runSlideProbe = (dir) => {
    const probe = spawnSync(
      process.execPath,
      [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/redline-slide-probe.mts'],
      {
        encoding: 'utf8',
        cwd: process.cwd(),
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, SLIDE_DIR: dir }
      }
    );
    if (probe.status !== 0) return { error: (probe.stderr || '(no output)').slice(-400) };
    const line = probe.stdout.trim().split('\n').pop() ?? '';
    try {
      return JSON.parse(line);
    } catch {
      return { error: `no JSON: ${probe.stdout.slice(0, 200)}` };
    }
  };

  const SLIDE_ARMS = [
    {
      name: '25a. his bad picture draws the paragraph he inserted and the one word that moved',
      key: 'bad',
      expect: (a) =>
        a.markedCount === 3 &&
        a.slid === 1 &&
        a.oldOk === true &&
        a.newOk === true &&
        a.marks?.[0] === 'del:micro' &&
        typeof a.marks?.[1] === 'string' &&
        a.marks[1].startsWith('ins:What context do agents need?') &&
        a.marks?.[2] === 'del:simple' &&
        // NO CAP FIRED, at the parent or at HEAD. This is the reading that
        // refutes the entry's hypothesis and it stays in the gate.
        a.whole?.tooBig === 0 &&
        a.whole?.tooDifferent === 0 &&
        a.whole?.overCap === 0 &&
        a.whole?.unaligned === 0,
      file: 'redline-document.ts',
      from: 'export const REDLINE_SLIDE_RESEMBLANCE = 0.5;',
      to: 'export const REDLINE_SLIDE_RESEMBLANCE = 0;'
    },
    {
      name: '25b. the tie: the line cost of the partition is the same before and after the slide',
      key: 'tie',
      expect: (a) => a.documents === 25 && a.costEqual === 25 && a.costMoved === 0,
      file: 'redline-document.ts',
      from: "      paired === '' || !paired.endsWith('\\n') ? 0 : resemblance(here.oldText, paired);",
      to: "      paired === '' ? 0 : resemblance(here.oldText, paired);"
    },
    {
      name: '25c. both projections hold, and research 74 §6.5’s newline under a strikethrough does not come back',
      key: 'exact',
      expect: (a) =>
        a.documents === 25 &&
        a.oldOk === 25 &&
        a.newOk === 25 &&
        a.slidTotal === 9 &&
        a.whitespaceOnlyMarked === 0 &&
        a.sharedSpacePairs === 0,
      file: 'redline-document.ts',
      from: "    out.push({ kind: 'change', oldText: '', newText: here.newText + bridge });",
      to: "    out.push({ kind: 'change', oldText: '', newText: here.newText });"
    },
    {
      name: "25d. research 110 §6's corpus reads the way a reader wants, above and below",
      key: 'corpus',
      expect: (a) =>
        a.above?.readable === 8 &&
        a.above?.slid === 7 &&
        // BELOW NEVER NEEDED REPAIRING and must not start being repaired.
        a.below?.readable === 8 &&
        a.below?.slid === 0,
      file: 'redline-document.ts',
      from: "      partner.oldText === '' &&",
      to: "      partner.oldText !== '' &&"
    },
    {
      name: '25e. the bridge is a blank line, the partner is a pure insertion, and it looks forward only',
      key: 'narrowBridge',
      expect: (a) =>
        a.control === 1 &&
        a.prose === 0 &&
        a.proseThatMatches === 0 &&
        a.notPure === 0 &&
        a.backwards === 0,
      file: 'redline-document.ts',
      from: "      if (step === undefined || step.kind !== 'same' || step.oldText.trim() !== '') break;",
      to: "      if (step === undefined || step.kind !== 'same') break;"
    },
    {
      name: '25f. a candidate must beat the pairing it replaces, not merely tie with it',
      key: 'narrowMargin',
      expect: (a) =>
        a.control === 1 &&
        a.sameReadingTwice === 0 &&
        // The trap was really set: the candidate IS better, by 0.20, which is
        // under the margin and over nothing else.
        a.sameReadingTwiceReads?.[0] === 0.4 &&
        a.sameReadingTwiceReads?.[1] === 0.6 &&
        a.unrelated === 0 &&
        a.believed === 0,
      file: 'redline-document.ts',
      from: 'export const REDLINE_SLIDE_MARGIN = 0.25;',
      to: 'export const REDLINE_SLIDE_MARGIN = -1;'
    }
  ];

  const shippingSlide = runSlideProbe(SRC);
  if (shippingSlide.error !== undefined) {
    fail(`25. the slide probe did not run: ${shippingSlide.error}`);
  } else {
    for (const arm of SLIDE_ARMS) {
      if (!arm.expect(shippingSlide[arm.key] ?? {})) {
        fail(
          `25. the shipping slide read the wrong thing for "${arm.name}": ` +
            `${JSON.stringify(shippingSlide[arm.key])}`
        );
      }
    }
    // The two constants are pinned with the two readings that chose them, so a
    // number that moves has to move the reading beside it in the same commit.
    const c = shippingSlide.constants ?? {};
    if (c.resemblance !== 0.5 || c.margin !== 0.25) {
      fail(
        `25. the slide's constants moved without this gate moving with them: ${JSON.stringify(c)}`
      );
    }
    if (c.wronglyPaired !== 0.09 || c.realPartner !== 0.98) {
      fail(
        `25. the readings that chose the constants moved: the pairing reads ` +
          `${String(c.wronglyPaired)} against 0.09 and the real partner ` +
          `${String(c.realPartner)} against 0.98.`
      );
    }
    // THE CONTROL. His GOOD picture is what the parent commit drew, and the
    // whole point of the phase is that it did not move.
    const good = shippingSlide.good ?? {};
    if (good.digest !== GOOD_AT_THE_PARENT) {
      fail(
        `25. his good picture is no longer what the parent commit drew: ` +
          `${String(good.digest)} against ${GOOD_AT_THE_PARENT}.`
      );
    }
    if (good.slid !== 0 || good.markedCount !== 1 || good.marks?.[0] !== 'del:micro') {
      fail(`25. his good picture is not one struck word: ${JSON.stringify(good)}`);
    }

    const prefix = `.p246-slide-${process.pid.toString(36)}-`;
    const made = [];
    let red = 0;
    let controlHeld = 0;
    try {
      for (const [i, arm] of SLIDE_ARMS.entries()) {
        const dir = `${prefix}${String(i)}`;
        mkdirSync(dir, { recursive: true });
        made.push(dir);
        for (const f of SLIDE_CHAIN) cpSync(join(SRC, f), join(dir, f));
        const target = join(dir, arm.file);
        const before = readFileSync(target, 'utf8');
        if (!before.includes(arm.from)) {
          fail(`25. the ablation for "${arm.name}" found nothing to edit in ${arm.file}`);
          continue;
        }
        writeFileSync(target, before.replace(arm.from, arm.to));
        const ablated = runSlideProbe(dir);
        if (ablated.error !== undefined) {
          fail(
            `25. the ablation for "${arm.name}" stopped the probe running (${ablated.error}), ` +
              `so it proves nothing`
          );
          continue;
        }
        if (JSON.stringify(ablated[arm.key]) !== JSON.stringify(shippingSlide[arm.key])) red += 1;
        else {
          fail(
            `25. the ablation for "${arm.name}" changed nothing this arm reads, so it cannot ` +
              `fail: ${JSON.stringify(ablated[arm.key])}`
          );
        }
        // AND THE CONTROL HOLDS THROUGH EVERY ONE OF THEM. If an ablation of
        // the slide can move his good picture, the slide is reaching a block
        // it has no business in.
        if (JSON.stringify(ablated.good) === JSON.stringify(shippingSlide.good)) controlHeld += 1;
        else {
          fail(
            `25. the ablation for "${arm.name}" moved his GOOD picture, which no clause of the ` +
              `slide may reach: ${JSON.stringify(ablated.good)}`
          );
        }
      }
      say(
        `25. ${String(SLIDE_ARMS.length)} arms over the shipping slide, ` +
          `${String(red)} of ${String(SLIDE_ARMS.length)} ablations moved their arm's reading, ` +
          `and his good picture held its parent-commit digest ${GOOD_AT_THE_PARENT} through ` +
          `${String(controlHeld)} of ${String(SLIDE_ARMS.length)} of them`
      );
      say(
        `25. his bad picture reads ${String(shippingSlide.bad?.markedCount)} marked runs against 15 ` +
          `at the parent, with every cap still passing; the line cost is unmoved over ` +
          `${String(shippingSlide.tie?.documents)} documents and both projections hold over all of them`
      );
    } finally {
      for (const dir of made) rmSync(dir, { recursive: true, force: true });
      // A sweep, in case a name from an interrupted run is left at the root.
      for (const name of readdirSync('.')) {
        if (name.startsWith(prefix) && existsSync(name)) {
          rmSync(name, { recursive: true, force: true });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// PHASE 251, rules 26 to 32: THE TABLE IS DIFFED ROW AGAINST ROW, and the four
// leaf rules that stop a change being drawn as nothing at all. Seven arms on
// the SHIPPING composer, driven under node by build/redline-table-probe.mts,
// each with an ablation of its own clause that must move its own arm's
// reading.
//
// Rules 1 to 25 all ask whether the arithmetic ran on a PARAGRAPH. A table is
// not a paragraph: `diffWords` matches the dash groups of one separator row
// against another's and the pipes of row 3 against the pipes of row 5, and
// every rule above this one passed while it did.
// ---------------------------------------------------------------------------
{
  const TABLE_CHAIN = ['redline-document.ts', 'redline.ts', 'paths.ts'];
  const SRC = 'src/renderer/editor';

  const runTableProbe = (dir) => {
    const probe = spawnSync(
      process.execPath,
      [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/redline-table-probe.mts'],
      {
        encoding: 'utf8',
        cwd: process.cwd(),
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, TABLE_DIR: dir }
      }
    );
    if (probe.status !== 0) return { error: (probe.stderr || '(no output)').slice(-400) };
    const line = probe.stdout.trim().split('\n').pop() ?? '';
    try {
      return JSON.parse(line);
    } catch {
      return { error: `no JSON: ${probe.stdout.slice(0, 200)}` };
    }
  };

  const TABLE_ARMS = [
    {
      name: '26. both projections hold over the corpus and a seeded fuzz of 420 table pairs',
      key: 'projections',
      expect: (a) =>
        a.documents === 435 &&
        a.corpus === 15 &&
        a.fuzz === 420 &&
        a.oldOk === 435 &&
        a.newOk === 435,
      file: 'redline-document.ts',
      from: "      emit('ins', newRows[step.next ?? 0] ?? '');",
      to: "      emit('ins', (newRows[step.next ?? 0] ?? '').slice(1));"
    },
    {
      // THE ROW IS THE UNIT, and this is the whole of fault 3. The ablation
      // makes the block ONE row again, which is the flat path wearing the
      // table path's name, and the crossings come straight back.
      name: '27. no run crosses a row boundary, where the flat path crosses four times',
      key: 'rowsNotCrossed',
      expect: (a) =>
        a.rowCrossings === 0 &&
        a.flatCrossings === 4 &&
        a.rowRuns === 9 &&
        a.paired === 1 &&
        a.unpaired === 2,
      file: 'redline-document.ts',
      from: "  return text.match(/[^\\n]*\\n|[^\\n]+$/g) ?? [];",
      to: '  return [text];'
    },
    {
      // A FIRST-CELL KEY IS THE DEFECT, not a simpler spelling of the fix: it
      // degrades every row of a renamed label column to a whole-row pair,
      // which is a worse picture than the flat stream this replaces.
      name: '28. a renamed first column still pairs, word for word',
      key: 'renamedColumn',
      expect: (a) =>
        a.paired === 3 &&
        a.wholeRows === 0 &&
        a.unpaired === 0 &&
        a.resemblance === 0.5 &&
        a.marks.join('|') ===
          'del:Sessions|ins:Ledger|del:Manifest|ins:Record|del:Server|ins:Daemon' &&
        a.oneRow.join('|') === 'same:| |del:Sessions|ins:Ledger|same: | the tab order |\n',
      file: 'redline-document.ts',
      from: '  const ta = rowTokens(a);\n  const tb = rowTokens(b);',
      to:
        "  const ta = rowTokens((a.split('|')[1] ?? ''));\n" +
        "  const tb = rowTokens((b.split('|')[1] ?? ''));"
    },
    {
      // 4(a). THE WORD BUDGET IS THE BLOCK'S. A per-row cap of 200 would let
      // this one block spend 240, which is ruling 4's own promise broken.
      name: "29a. the word budget is the block's, and the rows past it are whole rows",
      key: 'caps',
      read: (a) => a.budget,
      expect: (a) =>
        a.budget.spent === 200 &&
        a.budget.limit === 200 &&
        a.budget.paired === 50 &&
        a.budget.wholeRows === 10 &&
        a.budget.flatCollapsed === true &&
        a.budget.changes === 60,
      file: 'redline-document.ts',
      from: '    const words = redlineRunsWithin(a, b, REDLINE_MAX_EDIT_LENGTH - spent);',
      to: '    const words = redlineRunsWithin(a, b, REDLINE_MAX_EDIT_LENGTH);'
    },
    {
      // 4(b). THE TABLE PATH IS INSIDE THE CHARACTER CAP. This is what makes
      // "fault 3 is not fixed above the char cap" checkable rather than
      // asserted: one byte over and no differ runs at all.
      name: '29b. a block one byte over the character cap reaches no differ and draws whole',
      key: 'caps',
      read: (a) => a.charCap,
      expect: (a) =>
        a.charCap.limit === 4000 &&
        a.charCap.overBytes > 4000 &&
        a.charCap.overRuns === 3 &&
        a.charCap.overTooBig === 1 &&
        a.charCap.underBytes <= 4000 &&
        a.charCap.underRuns > 100 &&
        a.charCap.underTooBig === 0,
      file: 'redline-document.ts',
      from:
        '      block.oldText.length > REDLINE_MAX_BLOCK_CHARS ||\n' +
        '      block.newText.length > REDLINE_MAX_BLOCK_CHARS',
      to: '      false'
    },
    {
      // 4(c). `tableRuns` HAS A REFUSAL OF ITS OWN, because unlike
      // `redlineRuns` it answers on every input there is.
      name: '29c. tableRuns refuses at 666 rows inside the character cap, and not at 60',
      key: 'caps',
      read: (a) => a.rowCap,
      expect: (a) =>
        a.rowCap.limit === 60 &&
        a.rowCap.at666 === null &&
        a.rowCap.at666Bytes === 3330 &&
        a.rowCap.at61 === null &&
        a.rowCap.at60 === 120 &&
        // THE ROW CAP'S OWN COUNTER AND ITS OWN SENTENCE (the fix round). 666
        // rows of five bytes is 3,330 characters, so `N too long` would be a
        // false sentence about the only quantity it names, and both counters
        // are read so a round that folds them back together goes red here.
        a.rowCap.documentTooBigAt666 === 0 &&
        a.rowCap.documentTooManyRowsAt666 === 1 &&
        a.rowCap.noteAt666.includes('1 with too many rows'),
      file: 'redline.ts',
      from: 'export const REDLINE_MAX_TABLE_ROWS = 60;',
      to: 'export const REDLINE_MAX_TABLE_ROWS = 100_000;'
    },
    {
      // 4(d). THE FOURTH REFUSAL, AND IT IS THE FIX ROUND'S. `tableRuns` may
      // answer with `pairs === 0`, and that answer draws exactly the two runs
      // the whole-block fallback draws — research 114 §6.3's own condemned
      // picture, reached through the resemblance door rather than the
      // first-cell one it was written against. So the caller does not draw it.
      //
      // THE ARM HOLDS THREE READINGS AGAINST EACH OTHER, because a
      // fall-through that fires on everything is as wrong as one that fires on
      // nothing: the refused block is drawn word by word with nothing counted
      // whole; a block in which even one row pairs still takes the row
      // alignment and keeps its unchanged row whole; and the merge property
      // that makes the fall-through free is read rather than asserted.
      name: '29d. an alignment that aligned no row falls through to the flat path',
      key: 'fallThrough',
      expect: (a) =>
        a.refusedPairs === 0 &&
        a.refusedResemblance < a.threshold &&
        a.drawnSame > 1 &&
        a.drawnMarks > 2 &&
        a.drawnWhole === 0 &&
        a.oldOk === true &&
        a.newOk === true &&
        a.keepPairs > 0 &&
        a.keepFirstRunIsWholeRow === true &&
        a.mergedKinds === 'del|ins' &&
        a.mergedIsWholeBlock === true,
      file: 'redline-document.ts',
      from: '      if (table.pairs > 0) {',
      to: '      if (table.pairs >= 0) {'
    },
    {
      name: '30. the cancel pass is an identity on both projections',
      key: 'cancel',
      expect: (a) =>
        a.documents === 435 &&
        a.held === 435 &&
        a.planted.join('|') === 'same:axb' &&
        a.plantedDiffer.join('|') === 'same:a|del:x|ins:y|same:b',
      file: 'redline-document.ts',
      from: '      a.text === b.text\n    ) {',
      to: '      a.text.length === b.text.length\n    ) {'
    },
    {
      // THE SEPARATOR'S DELETED COPY IS NOT DRAWN, and not drawn is not the
      // same as absent: both projections still hold in the same reading.
      name: '31. a plain separator drops its deleted copy and an aligned one draws both',
      key: 'separator',
      expect: (a) =>
        a.plain.drops.length === 1 &&
        a.plain.kinds.join('') === 'del' &&
        a.plain.oldOk === true &&
        a.plain.newOk === true &&
        a.aligned.drops.length === 0 &&
        a.aligned.oldOk === true &&
        a.aligned.newOk === true &&
        a.fixture.drops.length === 1 &&
        a.fixture.kinds.join('') === 'del',
      file: 'redline-document.ts',
      from: "    if (a.text.includes(':') || b.text.includes(':')) continue;",
      to: '    if (false) continue;'
    },
    {
      // A CHANGE MUST CARRY INK, and the property is INK rather than
      // presence: the first version of this rule asked only that a leaf was
      // not `display: none`, and the lone blank passed it while drawing
      // nothing at all.
      name: '32a. no change is ever entirely undrawn',
      key: 'ink',
      expect: (a) =>
        a.changes > 2000 &&
        a.inkless === 0 &&
        a.loneMarks === 3 &&
        a.blankLineMarks.join('|') === 'del:"\\n":lone',
      file: 'redline-document.ts',
      from: "        if (leaf !== undefined && leaf.blank && !leaf.spacing) leaf.lone = true;",
      to: '        if (false) leaf.lone = true;'
    },
    {
      // RULING 5 STANDS EXACTLY AND NO WIDER, and its second clause is this
      // phase's own finding: `peelSharedSpace` takes the shared ends off a
      // real spacing change, so research 114 §6.5's one-clause rule read
      // FALSE on every spacing change this path can draw.
      name: '32b. a spacing change keeps its wash and a structural newline does not',
      key: 'ruling5',
      expect: (a) =>
        a.spacing.length === 3 &&
        a.spacing.every((row) => row.endsWith(':washed')) &&
        a.structural.join('|') === 'del:"\\n":lone',
      file: 'redline-document.ts',
      from: "      opposite(i - 1) || opposite(i + 1) || !/[\\n\\r]/.test(run.text);",
      to: '      opposite(i - 1) || opposite(i + 1);'
    }
  ];

  const shippingTable = runTableProbe(SRC);
  if (shippingTable.error !== undefined) {
    fail(`26-32. the table probe did not run: ${shippingTable.error}`);
  } else {
    for (const arm of TABLE_ARMS) {
      if (!arm.expect(shippingTable[arm.key] ?? {})) {
        fail(
          `${arm.name.slice(0, 4)} the shipping composer read the wrong thing for ` +
            `"${arm.name}": ${JSON.stringify((arm.read ?? ((x) => x))(shippingTable[arm.key] ?? {}))}`
        );
      }
    }

    const prefix = `.p251-table-${process.pid.toString(36)}-`;
    const made = [];
    let red = 0;
    try {
      for (const [i, arm] of TABLE_ARMS.entries()) {
        const dir = `${prefix}${String(i)}`;
        mkdirSync(dir, { recursive: true });
        made.push(dir);
        for (const f of TABLE_CHAIN) cpSync(join(SRC, f), join(dir, f));
        const target = join(dir, arm.file);
        const before = readFileSync(target, 'utf8');
        if (!before.includes(arm.from)) {
          fail(`${arm.name.slice(0, 4)} the ablation found nothing to edit in ${arm.file}`);
          continue;
        }
        writeFileSync(target, before.replace(arm.from, arm.to));
        const ablated = runTableProbe(dir);
        if (ablated.error !== undefined) {
          fail(
            `${arm.name.slice(0, 4)} the ablation stopped the probe running (${ablated.error}), ` +
              'so it proves nothing'
          );
          continue;
        }
        const pick = arm.read ?? ((x) => x);
        if (
          JSON.stringify(pick(ablated[arm.key] ?? {})) !==
          JSON.stringify(pick(shippingTable[arm.key] ?? {}))
        ) {
          red += 1;
        } else {
          fail(
            `${arm.name.slice(0, 4)} the ablation changed nothing this arm reads, so it cannot ` +
              `fail: ${JSON.stringify(pick(ablated[arm.key] ?? {}))}`
          );
        }
      }

      const caps = shippingTable.caps ?? {};
      say(
        `26. both projections hold over ${String(shippingTable.projections.documents)} documents, ` +
          `being ${String(shippingTable.projections.corpus)} committed fixtures of which ` +
          `${String(shippingTable.tableBlocks)} are table blocks and a seeded fuzz of ` +
          `${String(shippingTable.projections.fuzz)} table pairs`
      );
      say(
        `27. every run of a reordered table lies inside one row ` +
          `(${String(shippingTable.rowsNotCrossed.rowRuns)} runs, ` +
          `${String(shippingTable.rowsNotCrossed.rowCrossings)} crossings), where the flat path ` +
          `crosses ${String(shippingTable.rowsNotCrossed.flatCrossings)} times`
      );
      say(
        `28. a renamed first column pairs ${String(shippingTable.renamedColumn.paired)} of 3 rows ` +
          `at a resemblance of ${String(shippingTable.renamedColumn.resemblance)}, and ` +
          `| Sessions | against | Ledger | draws del "Sessions" beside ins "Ledger" and nothing else`
      );
      say(
        `29. the three caps, asked as three questions: the block spent ` +
          `${String(caps.budget.spent)} of ${String(caps.budget.limit)} edits over ` +
          `${String(caps.budget.paired)} paired rows with ${String(caps.budget.wholeRows)} whole ` +
          `rows past it; ${String(caps.charCap.overBytes)} bytes draws ` +
          `${String(caps.charCap.overRuns)} runs and counts tooBig where ` +
          `${String(caps.charCap.underBytes)} draws ${String(caps.charCap.underRuns)}; and ` +
          `tableRuns answers null at 666 rows of ${String(caps.rowCap.at666Bytes)} bytes and ` +
          `${String(caps.rowCap.at60)} runs at ${String(caps.rowCap.limit)}, under a counter and ` +
          `a sentence of its own ("${caps.rowCap.noteAt666.split('(').pop()?.replace(').', '')}")`
      );
      say(
        `29d. a table block whose alignment paired ` +
          `${String(shippingTable.fallThrough.refusedPairs)} rows at a resemblance of ` +
          `${String(shippingTable.fallThrough.refusedResemblance)} against a threshold of ` +
          `${String(shippingTable.fallThrough.threshold)} falls through to the flat path and is ` +
          `drawn as ${String(shippingTable.fallThrough.drawnMarks)} marks around ` +
          `${String(shippingTable.fallThrough.drawnSame)} unchanged runs rather than as one ` +
          `whole row beside another; a block with ${String(shippingTable.fallThrough.keepPairs)} ` +
          `pair keeps the row alignment, and the answer that is refused really is the ` +
          `whole-block fallback (${shippingTable.fallThrough.mergedKinds}), so nothing is lost`
      );
      say(
        `30. the cancel pass is an identity on both projections over ` +
          `${String(shippingTable.cancel.held)} documents, and it fires ` +
          `${String(shippingTable.cancel.firedInThePipeline)} times in the pipeline because ` +
          `peelSharedSpace reaches the shape first; driven directly it collapses the pair`
      );
      say(
        `31. a plain separator's deleted copy is marked drop and its bytes are still in the run ` +
          `list, and an aligned one draws both copies`
      );
      say(
        `32. ${String(shippingTable.ink.inkless)} of ${String(shippingTable.ink.changes)} changes ` +
          `are drawn as nothing at all, with ${String(shippingTable.ink.loneMarks)} lone marks ` +
          `carrying a bar; a spacing change keeps its wash and a structural newline does not`
      );
      say(
        `26-32. ${String(TABLE_ARMS.length)} arms over the shipping composer, and ` +
          `${String(red)} of ${String(TABLE_ARMS.length)} ablations moved their arm's reading`
      );
    } finally {
      for (const dir of made) rmSync(dir, { recursive: true, force: true });
      // A sweep, in case a name from an interrupted run is left at the root.
      for (const name of readdirSync('.')) {
        if (name.startsWith(prefix) && existsSync(name)) {
          rmSync(name, { recursive: true, force: true });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// PHASE 251, rules 33 to 36: THE ROOM AND THE WASH (research 114 §6.1, §6.2,
// §6.5 and §7 arms 6, 11, 14 and 15).
//
// Every rule above these asks about the RUNS. These four ask about the page
// they are drawn on, which is the half research 113 measured and no gate has
// ever looked at: 58.42% of the pane the operator works in was empty canvas, a
// wrapped mark painted its 15.00px font box on a 21.45px line pitch so a run
// drew as a stack of tiles with a 6.45px band between every pair, and the ring
// on the current change drew 23 outlined boxes at that pane and 43 at the
// panel's floor.
//
// WHAT IS HERE AND WHAT IS IN THE APP RUN, because §7 arm 6 is explicit about
// it: a stylesheet reading cannot see a face substitution, so the LONG side of
// the wash — where two vertically adjacent washes would overlap — is guarded
// by `npm run probe:p249` reading the painted height off the running app and
// never by anything in this file. What is here is the structure that makes
// that reading possible: the arithmetic is derived rather than typed, the
// short side carries its `max(0px, …)` guard, the trailing inline pixel is
// gone, and the pitch agrees with the line height it is supposed to be.
// ---------------------------------------------------------------------------

/**
 * Every rule in a stylesheet as `{ selector, body }`, read by MATCHING BRACES
 * so a declaration in a neighbouring rule is never read as this rule's. It is
 * the same walk `cssBlocksFor` above does; this one keeps the selector, which
 * is what rules 33 to 36 need in order to say WHICH rule they mean.
 */
function cssRules(css) {
  const bare = stripComments(css);
  const out = [];
  let from = 0;
  for (;;) {
    const open = bare.indexOf('{', from);
    if (open === -1) break;
    const body = blockAt(bare, open);
    if (body === null) break;
    const close = closeOf(bare, open);
    const prev = Math.max(bare.lastIndexOf('}', open - 1), bare.lastIndexOf(';', open - 1));
    const selector = bare.slice(prev + 1, open).replace(/\s+/g, ' ').trim();
    if (!selector.startsWith('@')) out.push({ selector, body });
    from = close === -1 ? open + 1 : close + 1;
  }
  return out;
}

/** The value the cascade leaves for `prop` on every rule whose selector matches. */
function declFor(css, matches, prop) {
  let value;
  for (const rule of cssRules(css)) {
    if (!matches(rule.selector)) continue;
    const re = new RegExp(`(?:^|;|\\{)\\s*${prop}\\s*:([^;}]*)`, 'g');
    let hit;
    while ((hit = re.exec(rule.body)) !== null) value = hit[1].replace(/\s+/g, ' ').trim();
  }
  return value;
}

/** Whitespace-blind, so a reformat is not a finding. */
const tight = (text) => (text ?? '').replace(/\s+/g, '');

// ---------------------------------------------------------------------------
// Rule 33. THE MEASURE MEANS CHARACTERS OF TEXT (§7 arm 11).
//
// `max-width: 68ch` on a box carrying 48px of padding INSIDE it delivers 62.1
// characters, so the number in the stylesheet never meant what it said
// (research 113 §1: the `ch` computes at 8.1885px and the text column measured
// 508.81px). The measure is now the TEXT's and the padding is added on top of
// it in the page's own track, and the failure mode of that fix is somebody
// putting the padding back inside — which nothing would see, because a column
// 48px narrower than it should be still looks like a column.
//
// The APP RUN is what proves it on the face: `npm run probe:p249` reads the
// document's box against the measure plus its padding at three pane widths on
// both bases. This is the structure that reading depends on.
// ---------------------------------------------------------------------------

/**
 * The three facts rule 33 asks of a stylesheet, as one function so the plants
 * below exercise exactly what the shipping file is asked.
 */
function measureFindings(css) {
  const found = [];
  const docMaxWidth = declFor(css, (s) => s.trim() === '.ed-redline-doc', 'max-width');
  if (docMaxWidth !== undefined) {
    found.push(
      `the document declares max-width: ${docMaxWidth}, so the padding is inside the measure again`
    );
  }
  const measure = declFor(css, (s) => /\.ed-redline-view(?![\w-])/.test(s), '--redline-measure');
  if (measure === undefined) {
    found.push('no --redline-measure is declared on .ed-redline-view');
  } else if (!/^\d+(\.\d+)?ch$/.test(measure)) {
    found.push(`--redline-measure is ${measure}, which is not stated in characters`);
  }
  const track = declFor(
    css,
    (s) => /\.ed-redline-page(?![\w-])/.test(s),
    'grid-template-columns'
  );
  const t = tight(track);
  if (track === undefined) {
    found.push('the page declares no grid-template-columns');
  } else if (!t.includes('var(--redline-measure)')) {
    found.push(`the page's column track does not name the measure: ${track}`);
  } else if (!t.includes('var(--redline-pad)*2')) {
    found.push(
      `the page's column track does not add the document's padding on top of the measure: ${track}`
    );
  }
  // The DOCUMENT's own rule and never a rule about something inside it: the
  // marks' own padding lives on `.ed-redline-doc :is(del, ins)` and reading it
  // here would answer the wash's arithmetic to a question about the column.
  const pad = declFor(css, (s) => s.trim() === '.ed-redline-doc', 'padding');
  if (pad === undefined || !pad.includes('var(--redline-pad)')) {
    found.push(
      `the document's inline padding is "${String(pad)}" rather than the --redline-pad the track adds`
    );
  }
  return found;
}

{
  const CSS = readFileSync('src/renderer/editor/redline.css', 'utf8');
  const TRACK =
    'var(--redline-rail) minmax(0, calc(var(--redline-measure) + var(--redline-pad) * 2))';
  const GOOD =
    `.ed-redline-view { --redline-measure: 84ch; --redline-pad: var(--space-8); }\n` +
    `.ed-redline-page { grid-template-columns: ${TRACK}; }\n` +
    `.ed-redline-doc { padding: var(--space-7) var(--redline-pad) var(--space-10); }\n`;
  const PLANTS = [
    { name: 'the shipped shape', css: GOOD, caught: false },
    {
      name: 'the two terms written the other way round, which is the same fact',
      css: GOOD.replace(
        'calc(var(--redline-measure) + var(--redline-pad) * 2)',
        'calc(var(--redline-pad) * 2 + var(--redline-measure))'
      ),
      caught: false
    },
    {
      name: 'the shipped max-width put back on the document',
      css: `${GOOD}.ed-redline-doc { max-width: 68ch; }\n`,
      caught: true
    },
    {
      name: 'the padding taken back inside the measure',
      css: GOOD.replace(
        'minmax(0, calc(var(--redline-measure) + var(--redline-pad) * 2))',
        'minmax(0, var(--redline-measure))'
      ),
      caught: true
    },
    {
      name: 'the measure given in pixels, so the number stops meaning characters',
      css: GOOD.replace('84ch', '688px'),
      caught: true
    },
    {
      name: "the document's own padding drifting off the name the track adds",
      css: GOOD.replace(
        'padding: var(--space-7) var(--redline-pad) var(--space-10)',
        'padding: var(--space-7) var(--space-8) var(--space-10)'
      ),
      caught: true
    }
  ];
  let behaved = 0;
  for (const plant of PLANTS) {
    const hits = measureFindings(plant.css);
    if (hits.length > 0 === plant.caught) behaved += 1;
    else {
      fail(
        `33. the plant "${plant.name}" ${plant.caught ? 'was not caught' : 'was caught'}: ` +
          JSON.stringify(hits)
      );
    }
  }
  for (const finding of measureFindings(CSS)) fail(`33. ${finding}`);
  const measure = declFor(CSS, (s) => /\.ed-redline-view(?![\w-])/.test(s), '--redline-measure');
  say(
    `33. the measure is ${String(measure)} of TEXT and the document's ` +
      `${String(
        declFor(CSS, (s) => /\.ed-redline-view(?![\w-])/.test(s), '--redline-pad')
      )} of inline padding is added on top of it in the page's own track, ` +
      `where the shipped 68ch box delivered 62.1 characters; ` +
      `${String(behaved)} of ${String(PLANTS.length)} planted stylesheets behaved, ` +
      `${String(PLANTS.filter((p) => p.caught).length)} of them must fail. ` +
      `The reading off the running app is npm run probe:p249`
  );
}

// ---------------------------------------------------------------------------
// Rule 34. THE RAIL NEVER COLLAPSES, AND THE CURRENT CHANGE IS ALWAYS MARKED
// (§7 arm 14).
//
// Research 114 §1.3 is the reason this is a rule at all. The design's first
// version set the rail to zero at the editor panel's own floor and scoped the
// outline that would otherwise replace it to the TODAY look, so at 319px the
// current change was marked by NOTHING AT ALL — at the one width where the
// outline is worst, 43 boxes on one change. That is Phase 239's shape 4
// dropped, and it is one declaration away at any time.
//
// TWO HALVES, and they can be undone separately. The stylesheet half asks that
// every value `data-room` can take has a rail with a POSITIVE width, reading
// the list of values out of the shipping module rather than out of a list
// here. The arithmetic half DRIVES the shipping `railBarFor` and `roomFor`
// under node and ablates them one clause at a time, because a rule that can
// only read its subject is what this gate exists to refuse.
// ---------------------------------------------------------------------------

/** The rail width the cascade leaves for one `data-room` value. */
function railWidthFor(css, room) {
  const base = declFor(css, (s) => /\.ed-redline-view(?![\w-[])/.test(s), '--redline-rail');
  const own = declFor(
    css,
    (s) => s.includes(`[data-room='${room}']`) || s.includes(`[data-room="${room}"]`),
    '--redline-rail'
  );
  return own ?? base;
}

function railFindings(css, rooms) {
  const found = [];
  for (const room of rooms) {
    const width = railWidthFor(css, room);
    if (width === undefined) {
      found.push(`data-room='${room}' has no rail width at all`);
      continue;
    }
    const px = /^(\d+(?:\.\d+)?)px$/.exec(width);
    if (px === null) {
      found.push(`data-room='${room}' has a rail of "${width}", which is not a length in pixels`);
    } else if (Number(px[1]) <= 0) {
      found.push(`data-room='${room}' collapses the rail to ${width}`);
    }
  }
  return found;
}

{
  const CSS_FILE = 'src/renderer/editor/redline.css';
  const CSS = readFileSync(CSS_FILE, 'utf8');
  const SRC = 'src/renderer/editor';

  const runRoomProbe = (dir) => {
    const probe = spawnSync(
      process.execPath,
      [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/redline-room-probe.mts', dir],
      { encoding: 'utf8', cwd: process.cwd(), maxBuffer: 8 * 1024 * 1024 }
    );
    if (probe.status !== 0) return { error: (probe.stderr || '(no output)').slice(-400) };
    try {
      return JSON.parse(probe.stdout);
    } catch {
      return { error: `no JSON: ${probe.stdout.slice(0, 200)}` };
    }
  };

  const shipping = runRoomProbe(SRC);
  if (shipping.error !== undefined) {
    fail(`34. the room probe did not run over the shipping module: ${shipping.error}`);
  } else {
    // -- the stylesheet half, proved on plants first ------------------------
    const GOOD =
      ".ed-redline-view { --redline-rail: 20px; --redline-gap: var(--space-5); }\n" +
      ".ed-redline-view[data-room='narrow'] { --redline-rail: 3px; --redline-gap: var(--space-2); }\n";
    const PLANTS = [
      { name: 'the shipped ladder', css: GOOD, caught: false },
      {
        name: 'the narrow rail collapsed to zero, which is the design version that dropped the mark',
        css: GOOD.replace('--redline-rail: 3px', '--redline-rail: 0px'),
        caught: true
      },
      {
        name: 'the narrow rail given a percentage, which can compute to nothing',
        css: GOOD.replace('--redline-rail: 3px', '--redline-rail: 0%'),
        caught: true
      },
      {
        name: 'the ladder deleted, so a room value has no rule at all',
        css: ".ed-redline-view[data-room='narrow'] { --redline-gap: var(--space-2); }\n",
        caught: true
      },
      {
        name: 'the base rail alone, which covers every value the view can emit',
        css: '.ed-redline-view { --redline-rail: 20px; }\n',
        caught: false
      }
    ];
    let behaved = 0;
    for (const plant of PLANTS) {
      const hits = railFindings(plant.css, shipping.values);
      if (hits.length > 0 === plant.caught) behaved += 1;
      else {
        fail(
          `34. the plant "${plant.name}" ${plant.caught ? 'was not caught' : 'was caught'}: ` +
            JSON.stringify(hits)
        );
      }
    }
    for (const finding of railFindings(CSS, shipping.values)) fail(`34. ${finding}`);

    // THE VIEW REALLY EMITS IT, so this is not a scan of a dead attribute.
    const view = readFileSync('src/renderer/editor/RedlineDocument.tsx', 'utf8');
    if (!view.includes('data-room={room}')) {
      fail('34. the view does not put data-room on .ed-redline-view, so the ladder decides nothing');
    }
    if (!view.includes('roomFor(')) {
      fail('34. the view never asks roomFor, so the room is not measured at all');
    }
    if (!view.includes('railBarFor(')) {
      fail('34. the view never asks railBarFor, so the current change draws no bar');
    }

    // -- the arithmetic half, driven and then ablated -----------------------
    const ARMS = [
      {
        name: '34a. a change that has collapsed to no height still draws the bar',
        read: (a) => a.bars.collapsed,
        expect: (a) => a.bars.collapsed !== null && a.bars.collapsed.height === 2,
        from: 'Math.max(2, last.bottom - first.top)',
        to: 'last.bottom - first.top'
      },
      {
        name: "34b. the bar spans the whole change, first rect's top to last rect's bottom",
        read: (a) => a.bars.wrapped,
        expect: (a) => a.bars.wrapped !== null && Math.round(a.bars.wrapped.height) === 380,
        from: 'const last = rects[rects.length - 1];',
        to: 'const last = rects[0];'
      },
      {
        name: '34c. the bar is in the rail’s own coordinates, so a scrolled page reads the same',
        read: (a) => ({ one: a.bars.oneLine, scrolled: a.bars.scrolled }),
        expect: (a) =>
          a.bars.oneLine !== null &&
          a.bars.scrolled !== null &&
          a.bars.oneLine.top === a.bars.scrolled.top,
        from: 'top: first.top - railTop,',
        to: 'top: first.top,'
      },
      {
        name: '34d. a change the recompose took away draws nothing at all',
        read: (a) => a.bars.gone,
        expect: (a) => a.bars.gone === null,
        from: 'if (first === undefined || last === undefined) return null;',
        to: 'if (first === undefined || last === undefined) return { top: 0, height: 0 };'
      },
      {
        name: '34e. the ladder is wide AT its floor and narrow one pixel below it',
        read: (a) => a.rooms,
        expect: (a) =>
          a.rooms[String(a.floor)] === 'full' &&
          a.rooms[String(a.floor - 1)] === 'narrow' &&
          a.rooms['1339'] === 'full' &&
          a.rooms['689'] === 'full' &&
          a.rooms['309'] === 'narrow',
        from: 'return scrollerWidth >= REDLINE_RAIL_FLOOR',
        to: 'return scrollerWidth > REDLINE_RAIL_FLOOR'
      },
      {
        name: "34f. the floor is the 45-character measure, so the panel's floor is narrow",
        read: (a) => ({ floor: a.floor, at309: a.rooms['309'] }),
        expect: (a) => a.floor === 449 && a.rooms['309'] === 'narrow',
        from: 'export const REDLINE_RAIL_FLOOR = 449;',
        to: 'export const REDLINE_RAIL_FLOOR = 0;'
      }
    ];
    for (const arm of ARMS) {
      if (!arm.expect(shipping)) {
        fail(`${arm.name.slice(0, 4)} the shipping module reads ${JSON.stringify(arm.read(shipping))}`);
      }
    }

    const prefix = `.p251-room-${process.pid.toString(36)}-`;
    const made = [];
    let red = 0;
    try {
      for (const [i, arm] of ARMS.entries()) {
        const dir = `${prefix}${String(i)}`;
        mkdirSync(dir, { recursive: true });
        made.push(dir);
        cpSync(join(SRC, 'redline-room.ts'), join(dir, 'redline-room.ts'));
        const target = join(dir, 'redline-room.ts');
        const before = readFileSync(target, 'utf8');
        if (!before.includes(arm.from)) {
          fail(`${arm.name.slice(0, 4)} the ablation found nothing to edit in redline-room.ts`);
          continue;
        }
        writeFileSync(target, before.replace(arm.from, arm.to));
        const ablated = runRoomProbe(dir);
        if (ablated.error !== undefined) {
          fail(
            `${arm.name.slice(0, 4)} the ablation stopped the probe running (${ablated.error}), ` +
              'so it proves nothing'
          );
          continue;
        }
        if (JSON.stringify(arm.read(ablated)) !== JSON.stringify(arm.read(shipping))) {
          red += 1;
        } else {
          fail(
            `${arm.name.slice(0, 4)} the ablation changed nothing this arm reads, so it cannot ` +
              `fail: ${JSON.stringify(arm.read(ablated))}`
          );
        }
      }
      say(
        `34. the rail is ${String(railWidthFor(CSS, 'full'))} where the column has it to spare ` +
          `and ${String(railWidthFor(CSS, 'narrow'))} at the panel's floor, never zero, over ` +
          `${String(shipping.values.length)} room value(s) read from redline-room.ts; ` +
          `${String(behaved)} of ${String(PLANTS.length)} planted stylesheets behaved, ` +
          `${String(PLANTS.filter((p) => p.caught).length)} of them must fail`
      );
      say(
        `34. the ladder turns at a scroller of ${String(shipping.floor)}px, being 45 characters ` +
          `of text plus the document's padding plus the rail and its gutter, and the bar spans ` +
          `the whole change (${String(
            Math.round((shipping.bars.wrapped?.height ?? 0) * 100) / 100
          )}px over 18 fragments) and never less than its own 2px; ` +
          `${String(red)} of ${String(ARMS.length)} ablations moved their arm's reading`
      );
    } finally {
      for (const dir of made) rmSync(dir, { recursive: true, force: true });
      for (const name of readdirSync('.')) {
        if (name.startsWith(prefix) && existsSync(name)) {
          rmSync(name, { recursive: true, force: true });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Rule 35. COLOUR AND DECORATION CARRY THE MEANING, NOT THE WASH (§7 arm 15).
//
// Research 113 §7.4 measured the two washes at 1.152:1 and 1.223:1 against the
// canvas, which is below every floor in the product, and research 114 §2
// re-derived them on the live page. Phase 251 makes the wash TALLER, which is
// exactly the change that would tempt a later round to let it carry meaning —
// and a design that leaned on a 1.15:1 difference to tell a deletion from an
// insertion would be leaning on a difference that is not there for anybody.
//
// So the rule is the property rather than the ratio: with the background taken
// away, a deletion and an insertion must still differ, in BOTH `color` and
// `text-decoration`. That is asked of the cascade the document really applies.
// ---------------------------------------------------------------------------

function meaningFindings(css) {
  const found = [];
  const of = (tag, prop) =>
    declFor(
      css,
      (s) => new RegExp(`(^|[\\s,:(])${tag}(?![\\w-])`).test(s) && !s.includes('[data-redline-'),
      prop
    );
  const del = { color: of('del', 'color'), decoration: of('del', 'text-decoration') };
  const ins = { color: of('ins', 'color'), decoration: of('ins', 'text-decoration') };
  for (const [name, side] of [
    ['a deletion', del],
    ['an insertion', ins]
  ]) {
    if (side.color === undefined) found.push(`${name} has no colour of its own`);
    if (side.decoration === undefined) found.push(`${name} has no text-decoration of its own`);
  }
  if (del.color !== undefined && del.color === ins.color) {
    found.push(`a deletion and an insertion share the colour ${del.color}`);
  }
  if (del.decoration !== undefined && del.decoration === ins.decoration) {
    found.push(`a deletion and an insertion share the decoration ${del.decoration}`);
  }
  return found;
}

{
  const CSS = readFileSync('src/renderer/editor/redline.css', 'utf8');
  const GOOD =
    '.ed-redline del { color: var(--error); background: var(--error-wash); ' +
    'text-decoration: line-through; }\n' +
    '.ed-redline ins { color: var(--success); background: var(--success-wash); ' +
    'text-decoration: none; }\n';
  const PLANTS = [
    { name: 'the shipped pair', css: GOOD, caught: false },
    {
      name: 'the two sides told apart by the wash alone, at 1.15:1',
      css: GOOD.replace('color: var(--success)', 'color: var(--error)').replace(
        'text-decoration: none',
        'text-decoration: line-through'
      ),
      caught: true
    },
    {
      name: 'the same colour, differing only in decoration',
      css: GOOD.replace('color: var(--success)', 'color: var(--error)'),
      caught: true
    },
    {
      name: 'the same decoration, differing only in colour',
      css: GOOD.replace('text-decoration: none', 'text-decoration: line-through'),
      caught: true
    },
    {
      name: 'a deletion with no decoration declared at all',
      css: GOOD.replace('text-decoration: line-through; ', ''),
      caught: true
    }
  ];
  let behaved = 0;
  for (const plant of PLANTS) {
    const hits = meaningFindings(plant.css);
    if (hits.length > 0 === plant.caught) behaved += 1;
    else {
      fail(
        `35. the plant "${plant.name}" ${plant.caught ? 'was not caught' : 'was caught'}: ` +
          JSON.stringify(hits)
      );
    }
  }
  for (const finding of meaningFindings(CSS)) fail(`35. ${finding}`);
  say(
    `35. a deletion and an insertion differ in BOTH colour and decoration, so the 1.152:1 and ` +
      `1.223:1 washes research 113 §7.4 measured carry nothing; ` +
      `${String(behaved)} of ${String(PLANTS.length)} planted stylesheets behaved, ` +
      `${String(PLANTS.filter((p) => p.caught).length)} of them must fail`
  );
}

// ---------------------------------------------------------------------------
// Rule 36. THE WASH ARITHMETIC, AND WHAT THIS FILE CANNOT SEE (§7 arm 6).
//
// The wash paints the line pitch less a 2px seam, so the fragments of one
// wrapped run meet and the run reads as one shape. The operator chose SEAM
// over Ribbon on 2026-09-09 and research 114 §1.2 says in those words that the
// choice is TASTE; nothing here re-dresses it as a measurement.
//
// THE LONG SIDE IS NOT GUARDED HERE AND CANNOT BE. `--redline-fontbox` is a
// multiple of the font size, 1.1539, which is what `-apple-system` at 13px
// really measures on this machine; CSS exposes no unit for the content area of
// a line box, so a face substitution moves it and this file would read exactly
// the same. Too SMALL and the 6.45px band comes back, which the `max(0px, …)`
// below refuses; too LARGE and the washes of vertically adjacent lines overlap,
// which only `npm run probe:p249`'s painted-height reading can see.
//
// What IS asked here is the structure that reading depends on, and the three
// clauses a later round would undo for tidiness:
//   - the block padding is DERIVED from the pitch, the font box and the seam,
//     rather than typed as a pixel count that stops following the font size;
//   - the short side carries its `max(0px, …)` guard;
//   - the trailing inline pixel is gone and the leading one stays, which is
//     what stopped a wash ending 1.00px past its own last glyph;
//   - and `--redline-pitch` agrees with the `line-height` the document really
//     declares, so a change to one cannot silently leave the other behind.
// ---------------------------------------------------------------------------

function washFindings(css) {
  const found = [];
  const doc = (prop) =>
    declFor(css, (s) => /(^|[\s,])\.ed-redline-doc(?![\w-])$/.test(s.trim()), prop);
  const wash = doc('--redline-wash');
  const pitch = doc('--redline-pitch');
  const fontbox = doc('--redline-fontbox');
  const seam = doc('--redline-seam');
  const lineHeight = doc('line-height');
  if (wash === undefined) {
    found.push('the document declares no --redline-wash, so the wash is not derived at all');
  } else {
    const w = tight(wash);
    if (!w.startsWith('max(0px,')) {
      found.push(`--redline-wash is "${wash}", which does not guard the short side with max(0px, …)`);
    }
    for (const name of ['--redline-pitch', '--redline-fontbox', '--redline-seam']) {
      if (!w.includes(`var(${name})`)) {
        found.push(`--redline-wash does not derive from ${name}: ${wash}`);
      }
    }
  }
  if (pitch === undefined) found.push('the document declares no --redline-pitch');
  if (fontbox === undefined) found.push('the document declares no --redline-fontbox');
  if (seam === undefined) {
    found.push('the document declares no --redline-seam');
  } else if (!/^\d+(\.\d+)?px$/.test(seam)) {
    found.push(`--redline-seam is "${seam}", which is not a length in pixels`);
  }
  // THE PITCH AGREES WITH THE LINE HEIGHT, or the wash is derived from a
  // number the document stopped using.
  const factor = /\*\s*([\d.]+)\s*\)/.exec(pitch ?? '');
  if (pitch !== undefined && lineHeight !== undefined) {
    if (factor === null || factor[1] !== lineHeight.trim()) {
      found.push(
        `--redline-pitch is "${pitch}" while the document's line-height is "${lineHeight}"`
      );
    }
  }
  // THE TRAILING PIXEL IS GONE. The shorthand is `block 0 block <lead>`.
  const marks = declFor(
    css,
    (s) => s.includes('.ed-redline-doc :is(del, ins)') && !s.includes('[data-redline-'),
    'padding'
  );
  if (marks === undefined) {
    found.push('the document’s marks declare no padding of their own');
  } else {
    const parts = marks.split(/\s+(?![^(]*\))/);
    if (parts.length !== 4) {
      found.push(`the marks' padding is "${marks}", which is not four sides`);
    } else if (parts[1] !== '0') {
      found.push(`the marks keep ${parts[1]} of trailing inline padding, past their last glyph`);
    } else if (parts[3] === '0') {
      found.push('the marks lost their leading pixel too, so a mark touches whatever precedes it');
    }
  }
  return found;
}

{
  const CSS = readFileSync('src/renderer/editor/redline.css', 'utf8');
  const GOOD =
    '.ed-redline-doc { line-height: 1.65; }\n' +
    '.ed-redline-doc { --redline-pitch: calc(var(--text-base) * 1.65); ' +
    '--redline-fontbox: calc(var(--text-base) * 1.1539); --redline-seam: 2px; ' +
    '--redline-wash: max(0px, calc((var(--redline-pitch) - var(--redline-fontbox) ' +
    '- var(--redline-seam)) / 2)); }\n' +
    '.ed-redline-doc :is(del, ins) { padding: var(--redline-wash) 0 var(--redline-wash) 1px; }\n';
  const PLANTS = [
    { name: 'the shipped arithmetic', css: GOOD, caught: false },
    {
      name: 'the short-side guard taken off, so the band can come back',
      css: GOOD.replace(
        'max(0px, calc((var(--redline-pitch) - var(--redline-fontbox) - var(--redline-seam)) / 2))',
        'calc((var(--redline-pitch) - var(--redline-fontbox) - var(--redline-seam)) / 2)'
      ),
      caught: true
    },
    {
      name: 'the height typed as a pixel count, which stops following the font size',
      css: GOOD.replace(
        'max(0px, calc((var(--redline-pitch) - var(--redline-fontbox) - var(--redline-seam)) / 2))',
        '2.22px'
      ),
      caught: true
    },
    {
      name: 'the trailing inline pixel put back, which is what crossed the table’s own pipe',
      css: GOOD.replace(
        'padding: var(--redline-wash) 0 var(--redline-wash) 1px',
        'padding: var(--redline-wash) 1px var(--redline-wash) 1px'
      ),
      caught: true
    },
    {
      name: 'both inline pixels dropped, which puts two words glyph against glyph',
      css: GOOD.replace(
        'padding: var(--redline-wash) 0 var(--redline-wash) 1px',
        'padding: var(--redline-wash) 0 var(--redline-wash) 0'
      ),
      caught: true
    },
    {
      name: 'the line height moved and the pitch left behind',
      css: GOOD.replace('line-height: 1.65;', 'line-height: 1.8;'),
      caught: true
    },
    {
      name: 'the seam widened, which is taste and not a defect',
      css: GOOD.replace('--redline-seam: 2px', '--redline-seam: 4px'),
      caught: false
    }
  ];
  let behaved = 0;
  for (const plant of PLANTS) {
    const hits = washFindings(plant.css);
    if (hits.length > 0 === plant.caught) behaved += 1;
    else {
      fail(
        `36. the plant "${plant.name}" ${plant.caught ? 'was not caught' : 'was caught'}: ` +
          JSON.stringify(hits)
      );
    }
  }
  for (const finding of washFindings(CSS)) fail(`36. ${finding}`);
  const seam = declFor(
    CSS,
    (s) => /(^|[\s,])\.ed-redline-doc(?![\w-])$/.test(s.trim()),
    '--redline-seam'
  );
  say(
    `36. the wash is the line pitch less a ${String(seam)} seam, derived from the pitch and the ` +
      `font box with the short side guarded by max(0px, …) and no trailing inline padding; ` +
      `${String(behaved)} of ${String(PLANTS.length)} planted stylesheets behaved, ` +
      `${String(PLANTS.filter((p) => p.caught).length)} of them must fail`
  );
  say(
    '36. the LONG side is guarded by a reading and never by this file: --redline-fontbox is a ' +
      'font metric, a face substitution moves it, and npm run probe:p249 is what reads the ' +
      'painted height against the pitch on the running app. Seam over Ribbon is the operator’s ' +
      'TASTE (research 114 §1.2) and is not a measurement'
  );
}

// ---------------------------------------------------------------------------
// PHASE 251, rule 37: THE BAR'S INNER GRID IS THE PAGE'S GRID.
//
// Research 113 §4 measured `Accept all` sitting 414.1px past the column's own
// right content edge at the pane the operator works in, and named the cause
// rather than the symptom: the bar was `justify-content: flex-end` against the
// PANEL while the column was centred inside it, so the button's distance from
// the thing it acts on WAS the right-hand dead space. Research 114 §6.4's fix
// is that the bar's inner box takes the page's own tracks, which puts both of
// its ends on the column at every width.
//
// A stylesheet cannot say "the same as that one", so the two templates are two
// copies of one fact and the failure mode is drift: a bar twelve pixels out of
// step with its column still looks exactly like a bar, so nothing but this
// rule would ever see it. Read BY MATCHING BRACES rather than by searching the
// file for a word, because a declaration in a neighbouring rule is not this
// rule's declaration.
//
// THE CONTRACT THIS RULE HOLDS, and the two class names are the contract:
//   .ed-redline-page        the two-track page, `[rail] [column]`
//   .ed-redline-bar-inner   the bar's inner box, which takes the same tracks
// Both must declare `grid-template-columns` and `column-gap`, and the values
// must be identical. A missing rule is a FAILURE and never a skip: the whole
// point of this rule is that it cannot pass while the page does not exist.
// ---------------------------------------------------------------------------
const GRID_PROPS = ['grid-template-columns', 'column-gap'];

/** Every rule block in `css` whose selector list names the class `cls`. */
function cssBlocksFor(css, cls) {
  const bare = stripComments(css);
  const at = new RegExp(`\\.${cls}(?![\\w-])`);
  const blocks = [];
  let from = 0;
  for (;;) {
    const open = bare.indexOf('{', from);
    if (open === -1) break;
    const body = blockAt(bare, open);
    if (body === null) break;
    const close = closeOf(bare, open);
    // The selector is the text between the previous rule's end and this brace.
    const prev = Math.max(
      bare.lastIndexOf('}', open - 1),
      bare.lastIndexOf(';', open - 1)
    );
    const selector = bare.slice(prev + 1, open).trim();
    if (at.test(selector) && !selector.startsWith('@')) blocks.push(body);
    from = close === -1 ? open + 1 : close + 1;
  }
  return blocks;
}

/**
 * What the cascade leaves for each of `GRID_PROPS` on this class: the LAST
 * declaration wins, which is what a browser does and what a second rule
 * overriding the first would rely on.
 */
function gridOf(css, cls) {
  const out = {};
  for (const body of cssBlocksFor(css, cls)) {
    for (const prop of GRID_PROPS) {
      const m = new RegExp(`(?:^|;|\\{)\\s*${prop}\\s*:([^;}]*)`, 'g');
      let hit;
      while ((hit = m.exec(body)) !== null) out[prop] = hit[1].replace(/\s+/g, ' ').trim();
    }
  }
  return out;
}

{
  const CSS_FILE = 'src/renderer/editor/redline.css';
  const PAGE_CLASS = 'ed-redline-page';
  const BAR_CLASS = 'ed-redline-bar-inner';

  // The scanner is proved on plants FIRST, so a scan that cannot fail is never
  // mistaken for a scan that passed. Five of the seven must be caught.
  const TRACKS = 'var(--redline-rail) minmax(0, calc(var(--redline-measure) + var(--space-8) * 2))';
  const PLANTS = [
    {
      name: 'the two grids agree',
      css:
        `.${PAGE_CLASS} { position: relative; display: grid;\n` +
        `  grid-template-columns: ${TRACKS};\n  column-gap: var(--space-5); }\n` +
        `.${BAR_CLASS} { display: grid;\n  grid-template-columns: ${TRACKS};\n` +
        '  column-gap: var(--space-5); }\n',
      caught: false
    },
    {
      name: 'the same fact spelled through one custom property',
      css:
        `.${PAGE_CLASS} { grid-template-columns: var(--redline-tracks); column-gap: var(--space-5); }\n` +
        `.${BAR_CLASS} { grid-template-columns: var(--redline-tracks); column-gap: var(--space-5); }\n`,
      caught: false
    },
    {
      name: 'the bar drifted one track',
      css:
        `.${PAGE_CLASS} { grid-template-columns: ${TRACKS}; column-gap: var(--space-5); }\n` +
        `.${BAR_CLASS} { grid-template-columns: 20px minmax(0, 1fr); column-gap: var(--space-5); }\n`,
      caught: true
    },
    {
      name: 'the bar drifted only its gutter, which is the invisible one',
      css:
        `.${PAGE_CLASS} { grid-template-columns: ${TRACKS}; column-gap: var(--space-5); }\n` +
        `.${BAR_CLASS} { grid-template-columns: ${TRACKS}; column-gap: var(--space-4); }\n`,
      caught: true
    },
    {
      name: 'the bar has no grid at all, which is today',
      css:
        `.${PAGE_CLASS} { grid-template-columns: ${TRACKS}; column-gap: var(--space-5); }\n` +
        `.ed-redline-bar { display: flex; justify-content: flex-end; }\n`,
      caught: true
    },
    {
      name: 'there is no page, so the contract was never met',
      css: `.ed-redline-doc { max-width: 68ch; margin-inline: auto; }\n`,
      caught: true
    },
    {
      name: 'a later rule overrides the page and the bar was left behind',
      css:
        `.${PAGE_CLASS} { grid-template-columns: ${TRACKS}; column-gap: var(--space-5); }\n` +
        `.${BAR_CLASS} { grid-template-columns: ${TRACKS}; column-gap: var(--space-5); }\n` +
        `.ed-redline-view .${PAGE_CLASS} { grid-template-columns: 3px minmax(0, 1fr); }\n`,
      caught: true
    },
    {
      // A NEIGHBOUR IS NOT THIS RULE. The bar's own grid is absent and the
      // page's declaration sits two rules away in the same file; a scan for
      // the word rather than for the block would read it as the bar's.
      name: 'a neighbouring rule carries the template the bar does not',
      css:
        `.${PAGE_CLASS} { grid-template-columns: ${TRACKS}; column-gap: var(--space-5); }\n` +
        `.${BAR_CLASS} { align-items: center; }\n` +
        `.ed-redline-bar-cell { grid-template-columns: ${TRACKS}; column-gap: var(--space-5); }\n`,
      caught: true
    }
  ];

  const drift = (css) => {
    const page = gridOf(css, PAGE_CLASS);
    const bar = gridOf(css, BAR_CLASS);
    const lines = [];
    for (const prop of GRID_PROPS) {
      if (page[prop] === undefined) lines.push(`.${PAGE_CLASS} declares no ${prop}`);
      else if (bar[prop] === undefined) lines.push(`.${BAR_CLASS} declares no ${prop}`);
      else if (page[prop] !== bar[prop]) {
        lines.push(
          `${prop} has drifted: .${PAGE_CLASS} says ${JSON.stringify(page[prop])} and ` +
            `.${BAR_CLASS} says ${JSON.stringify(bar[prop])}`
        );
      }
    }
    return lines;
  };

  let proved = 0;
  for (const plant of PLANTS) {
    if (drift(plant.css).length > 0 === plant.caught) proved += 1;
    else fail(`37. the grid scanner behaved wrongly on the plant "${plant.name}"`);
  }

  if (!existsSync(CSS_FILE)) {
    fail(`37. ${CSS_FILE} is not there, so rule 37 proves nothing`);
  } else {
    const found = drift(readFileSync(CSS_FILE, 'utf8'));
    for (const line of found) {
      fail(
        `37. ${line}. Research 114 §6.4's contract is that .${BAR_CLASS} takes ` +
          `.${PAGE_CLASS}'s own tracks, so both ends of the bar land on the column ` +
          `(414.1px past it today, 0.0px in the proposal). Both rules must declare ` +
          `${GRID_PROPS.join(' and ')}, with identical values.`
      );
    }
    if (found.length === 0) {
      const page = gridOf(readFileSync(CSS_FILE, 'utf8'), PAGE_CLASS);
      say(
        `37. the bar's inner box takes the page's own tracks, read by matching braces: ` +
          `${JSON.stringify(page['grid-template-columns'])} with a ` +
          `${JSON.stringify(page['column-gap'])} gutter, and ${String(proved)} of ` +
          `${String(PLANTS.length)} planted stylesheets behaved, ` +
          `${String(PLANTS.filter((p) => p.caught).length)} of them caught`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// PHASE 251, rule 38: THE CHIP TAKES THE BAND ARM ONLY WHEN THE BAND HOLDS ITS
// OWN DRAWN WIDTH. Six arms on the SHIPPING `chipPlace` and `chipAnchorRect`,
// driven under node by build/redline-chip-probe.mts, each with an ablation of
// its own clause that must move its own arm's reading.
// ---------------------------------------------------------------------------
{
  const CHIP_CHAIN = ['redline-chip.tsx'];
  const SRC = 'src/renderer/editor';

  const runChipProbe = (dir) => {
    const probe = spawnSync(
      process.execPath,
      [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/redline-chip-probe.mts'],
      {
        encoding: 'utf8',
        cwd: process.cwd(),
        maxBuffer: 32 * 1024 * 1024,
        env: { ...process.env, CHIP_DIR: dir }
      }
    );
    if (probe.status !== 0) return { error: (probe.stderr || '(no output)').slice(-400) };
    const line = probe.stdout.trim().split('\n').pop() ?? '';
    try {
      return JSON.parse(line);
    } catch {
      return { error: `no JSON: ${probe.stdout.slice(0, 200)}` };
    }
  };

  const CHIP_ARMS = [
    {
      // ONE DECISION, ONE NUMBER, AND THE NUMBER IS THE CHIP'S OWN WIDTH. The
      // ablation is the first version's shape, being a constant standing in
      // for the measurement: under it a re-labelled 299.07px chip takes the
      // band at a pane that does not hold it.
      name: '38a. the band arm is taken only when the band holds the chip that drew',
      key: 'arms',
      expect: (a) =>
        a['1349/product'].arm === 'band' &&
        a['1349/mock'].arm === 'band' &&
        a['1349/relabelled'].arm === 'overlay' &&
        a['699/product'].arm === 'overlay' &&
        a['319/product'].arm === 'overlay' &&
        Object.values(a).every((cell) => cell.fits === true),
      file: 'redline-chip.tsx',
      from: '  if (band >= size.width + CHIP_BAND_GUTTER) {',
      to: '  if (band >= 200) {'
    },
    {
      // THE BAND IS THE CANVAS BETWEEN TWO RIGHT EDGES, not the difference of
      // two widths. The ablation is the arithmetic a later round reaches for,
      // and it reads 571.17px of canvas where there is 285.58px.
      name: '38b. the band is the canvas between the page and the scroller, not two widths',
      key: 'arms',
      file: 'redline-chip.tsx',
      expect: (a) => a['1349/relabelled'].arm === 'overlay',
      from: '  const band = scroll.left + scroll.width - (page.left + page.width);',
      to: '  const band = scroll.width - page.width;'
    },
    {
      // THE TEST AND THE PLACEMENT ARE THE SAME ARITHMETIC. Placing further
      // out than the test allowed puts the chip past the scroller's own edge,
      // which is what `fits` reads and what nothing else in this gate would.
      name: '38c. a chip the band arm accepted really fits inside the scroller',
      key: 'arms',
      file: 'redline-chip.tsx',
      expect: (a) => Object.values(a).every((cell) => cell.fits === true),
      from: '      left: page.width + CHIP_BAND_GUTTER,',
      to: '      left: page.width + CHIP_BAND_GUTTER * 4,'
    },
    {
      // PHASE 236'S ONE MANDATORY RULE, untouched by this phase and asked
      // behaviourally: rects[0], no bounding box asked for at all, and
      // research 96 §4.5's own displacement re-derived through the placement.
      name: '38d. the anchor is the first client rect and no bounding box is ever asked for',
      key: 'anchor',
      file: 'redline-chip.tsx',
      expect: (a) =>
        a.isFirstRect === true &&
        a.asked === 'getClientRects' &&
        a.none === true &&
        a.displacement === 435.73,
      from: '  return el.getClientRects()[0];',
      to: '  return el.getBoundingClientRect?.() ?? el.getClientRects()[0];'
    },
    {
      // THE OVERLAY ARM IS REQUIRED. 0.00px of canvas at the floor is research
      // 96 §4.1's and research 113 §7.3's own reading, and the clamp is what
      // keeps a 258.28px chip inside a 309px page there.
      name: '38e. the overlay arm holds at the floor, where there is 0.00px of canvas',
      key: 'overlay',
      file: 'redline-chip.tsx',
      expect: (a) =>
        a.band === 0 &&
        a.clampedRight === 50.72 &&
        a.clampedLeft === 0 &&
        a.above === 366 &&
        a.below === 21,
      from:
        '    left: Math.max(0, Math.min(rect.left - page.left, page.width - size.width)),',
      to: '    left: Math.max(0, rect.left - page.left),'
    },
    {
      // THE PAGE IS THE CONTAINING BLOCK IN BOTH ARMS, which is the fact
      // redline-chip.tsx, RedlineDocument.tsx and redline.css all state.
      name: '38f. both arms are measured against the page and never against the scroller',
      key: 'containing',
      file: 'redline-chip.tsx',
      expect: (a) =>
        a.overlayLeftShift === 100 &&
        a.overlayTopShift === 50 &&
        a.bandLeft === 783.83 &&
        a.bandLeftShifted === 783.83 &&
        a.bandTopFollowsTheChange === 0,
      from: '  const above = rect.top - page.top - size.height - CHIP_GAP;',
      to: '  const above = rect.top - scroll.top - size.height - CHIP_GAP;'
    }
  ];

  const shippingChip = runChipProbe(SRC);
  if (shippingChip.error !== undefined) {
    fail(`38. the chip probe did not run: ${shippingChip.error}`);
  } else {
    for (const arm of CHIP_ARMS) {
      if (!arm.expect(shippingChip[arm.key] ?? {})) {
        fail(
          `${arm.name.slice(0, 4)} the shipping chip read the wrong thing for ` +
            `"${arm.name}": ${JSON.stringify(shippingChip[arm.key] ?? {})}`
        );
      }
    }

    const prefix = `.p251-chip-${process.pid.toString(36)}-`;
    const made = [];
    let red = 0;
    try {
      for (const [i, arm] of CHIP_ARMS.entries()) {
        const dir = `${prefix}${String(i)}`;
        mkdirSync(dir, { recursive: true });
        made.push(dir);
        for (const f of CHIP_CHAIN) cpSync(join(SRC, f), join(dir, f));
        const target = join(dir, arm.file);
        const before = readFileSync(target, 'utf8');
        if (!before.includes(arm.from)) {
          fail(`${arm.name.slice(0, 4)} the ablation found nothing to edit in ${arm.file}`);
          continue;
        }
        writeFileSync(target, before.replace(arm.from, arm.to));
        const ablated = runChipProbe(dir);
        if (ablated.error !== undefined) {
          fail(
            `${arm.name.slice(0, 4)} the ablation stopped the probe running ` +
              `(${ablated.error}), so it proves nothing`
          );
          continue;
        }
        if (
          JSON.stringify(ablated[arm.key] ?? {}) !== JSON.stringify(shippingChip[arm.key] ?? {})
        ) {
          red += 1;
        } else {
          fail(
            `${arm.name.slice(0, 4)} the ablation changed nothing this arm reads, so it ` +
              `cannot fail: ${JSON.stringify(ablated[arm.key] ?? {})}`
          );
        }
      }

      const g = shippingChip.geometry;
      const t = shippingChip.thresholds;
      say(
        `38. the page is ${String(g.pageAt1349)}px wide at the operator's 1349px pane, ` +
          `leaving ${String(g.bandAt1349)}px of canvas beside it; the product's 258.28px ` +
          `chip takes the band there and a re-labelled 299.07px one does not, at the ` +
          `same pixel`
      );
      say(
        `38. the band arm turns on at a scroller of ${String(t.productScroller)}px, being a ` +
          `panel of ${String(t.productPanel)}px, and at ${String(t.mockScroller)}px for the ` +
          `mock's 223.1px chip — which is research 114 §4.2's own two numbers, re-derived ` +
          `from the shipping decision rather than quoted`
      );
      say(
        `38. at the editor panel's own floor the canvas is ` +
          `${String(shippingChip.overlay.band)}px, which is research 96 §4.1's reading, so ` +
          `the overlay arm is required and is not a fallback anybody may delete`
      );
      say(
        `38. the anchor is still getClientRects()[0], no bounding box is asked for at all, ` +
          `and the bounding box would put the chip ` +
          `${String(shippingChip.anchor.displacement)}px into empty margin`
      );
      say(
        `38. ${String(CHIP_ARMS.length)} arms over the shipping chip, and ${String(red)} of ` +
          `${String(CHIP_ARMS.length)} ablations moved their arm's reading`
      );
    } finally {
      for (const dir of made) rmSync(dir, { recursive: true, force: true });
      // A sweep, in case a name from an interrupted run is left at the root.
      for (const name of readdirSync('.')) {
        if (name.startsWith(prefix) && existsSync(name)) {
          rmSync(name, { recursive: true, force: true });
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// PHASE 251, THE FIX ROUND, rule 39: THE BAND IS MEASURED IN THE SCROLLER'S
// CONTENT BOX, AND THIS IS THE HALF RULE 38 CANNOT SEE.
//
// Rule 38 and `p251-redline-controls.test.ts` both drive `chipPlace` over a
// MODEL of the room, and both models hand it `panel - 10`, which is the content
// box. The shipping caller handed `scroll.getBoundingClientRect()`, which is the
// BORDER box and includes the vertical scrollbar, so the two agreed on every
// number they printed while the running app placed the chip up to a scrollbar's
// width past the box the page is centred in: measured at a 1308px panel, 9.7px
// of overhang and a horizontal scrollbar really drawn on `.ed-redline-scroll`,
// appearing and disappearing as the pointer moved onto and off a change. The
// band arm is the ONE placement in this view that is deliberately outside the
// page, so it is the one that can grow the scroller's scrollable area, and the
// width it is judged against is all that stands between it and doing so.
//
// A MODEL CANNOT CATCH THIS, which is why the rule is a scan of the real source
// and the behavioural half is `npm run probe:p249`'s band sweep in the running
// app. What is asked: `chipPlace` is CALLED from exactly one place in the chip
// file, that call passes four arguments, and its third argument names
// `clientWidth` and never `getBoundingClientRect` or `offsetWidth`.
// ---------------------------------------------------------------------------
{
  const CHIP_FILE = 'src/renderer/editor/redline-chip.tsx';

  /** Every `chipPlace(` CALL in a file, its declaration excluded. */
  const chipPlaceCalls = (source) => {
    const code = stripComments(source);
    const calls = [];
    const re = /\bchipPlace\s*\(/g;
    let m;
    while ((m = re.exec(code)) !== null) {
      const before = code.slice(Math.max(0, m.index - 40), m.index);
      // The declaration itself is not a call.
      if (/\bfunction\s*$/.test(before)) continue;
      calls.push(callArguments(code, m.index + m[0].length - 1));
    }
    return calls;
  };

  const scanChipCaller = (source) => {
    const calls = chipPlaceCalls(source);
    if (calls.length === 0) return ['chipPlace is called from nowhere at all'];
    if (calls.length > 1) {
      return [
        `chipPlace is called from ${String(calls.length)} places, and this rule reads one`
      ];
    }
    const args = calls[0];
    if (args.length !== 4) {
      return [`chipPlace is called with ${String(args.length)} arguments, wanting 4`];
    }
    const third = args[2] ?? '';
    const lines = [];
    if (!/\bclientWidth\b/.test(third)) {
      lines.push('the scroller argument does not name clientWidth');
    }
    if (/\bgetBoundingClientRect\s*\(\s*\)\s*(?:,|$)/.test(third)) {
      lines.push('the scroller argument is a bare getBoundingClientRect(), which is the border box');
    }
    if (/\boffsetWidth\b/.test(third)) {
      lines.push('the scroller argument names offsetWidth, which is the border box');
    }
    return lines;
  };

  const GOOD = `
    const box = scroll.getBoundingClientRect();
    setPlace(chipPlace(rect, page.getBoundingClientRect(), {
      left: box.left, top: box.top, bottom: box.bottom,
      width: scroll.clientWidth, height: box.height
    }, { width: own?.width ?? 0, height: own?.height ?? 0 }));
  `;
  const PLANTS = [
    { name: 'the shipping shape', src: GOOD, caught: false },
    {
      name: 'the defect: the scroller border box handed in whole',
      src: `setPlace(chipPlace(rect, page.getBoundingClientRect(), scroll.getBoundingClientRect(), { width: 1, height: 1 }));`,
      caught: true
    },
    {
      name: 'offsetWidth, which is the border box under another name',
      src: `const box = scroll.getBoundingClientRect();
        setPlace(chipPlace(rect, page.getBoundingClientRect(), { ...box, width: scroll.offsetWidth }, s));`,
      caught: true
    },
    {
      name: 'clientWidth in a comment only',
      src: `setPlace(chipPlace(rect, p, /* scroll.clientWidth */ scroll.getBoundingClientRect(), s));`,
      caught: true
    },
    { name: 'no call at all', src: `const x = 1;`, caught: true },
    {
      name: 'two callers, one of them the old shape',
      src: `${GOOD}\nsetPlace(chipPlace(rect, p, scroll.getBoundingClientRect(), s));`,
      caught: true
    },
    {
      name: 'the right box, spelled with a spread',
      src: `const box = scroll.getBoundingClientRect();
        setPlace(chipPlace(rect, page.getBoundingClientRect(), { ...toRect(box), width: scroll.clientWidth }, s));`,
      caught: false
    }
  ];

  let proved = 0;
  for (const plant of PLANTS) {
    if (scanChipCaller(plant.src).length > 0 === plant.caught) proved += 1;
    else fail(`39. the caller scanner behaved wrongly on the plant "${plant.name}"`);
  }

  if (!existsSync(CHIP_FILE)) {
    fail(`39. ${CHIP_FILE} is not there, so rule 39 proves nothing`);
  } else {
    const found = scanChipCaller(readFileSync(CHIP_FILE, 'utf8'));
    for (const line of found) {
      fail(
        `39. ${line}. The band arm places the chip OUTSIDE the page, at ` +
          `page.width + CHIP_BAND_GUTTER, so the box it is judged against must be the one ` +
          `the page is centred in — the scroller's CONTENT box. A border box is a ` +
          `scrollbar wider, and the chip then hangs past the content box and grows a ` +
          `horizontal scrollbar the redline has never had (9.7px at a 1308px panel).`
      );
    }
    if (found.length === 0) {
      say(
        `39. the chip's one caller hands chipPlace the scroller's CONTENT box, read by ` +
          `matching parentheses, so the running app is judged against the same box ` +
          `rule 38's model and both design documents are; ${String(proved)} of ` +
          `${String(PLANTS.length)} planted callers behaved, ` +
          `${String(PLANTS.filter((p) => p.caught).length)} of them must fail`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// THE PRESS THAT MOVES ON, 2026-09-16, rule 40, rewritten by Phase 282 on
// 2026-09-17: THE FOLLOWER IS CARRIED BY IDENTITY, ONE PRESS AT A TIME, AND
// THE RENDER PATH READS NO MODEL.
//
// ⌥↩ stops marking the change under focus and ⌥⌫ puts it back, and BOTH now
// leave the person on the change that was DRAWN AFTER it, so a run of
// approvals or rejections is a run of the one chord rather than ⌥↩ ⌥↓ repeated
// or ⌥⌫ ⌥↓ repeated. Past the last change the picture comes round to its first
// remaining change, so a run that started in the middle of a document does not
// strand the changes above it.
//
// THE INDEX WAS THE WRONG THING TO CARRY. PR 28 read the pressed change's
// index off the picture before the press and took the element standing at that
// index after the redraw, on the claim that both verbs leave every other
// change in the order it was drawn in. The Phase 282 review measured that
// claim false twice: a rewind RE-READS the file, so an agent's write already
// on disk above the pressed change adds a change in front of it and the move
// landed on the change the person had just walked past — which the next ⌥⌫ in
// the rhythm would rewrite, and a per-change accept has no undo; and a redraw
// RE-CUTS neighbours, so accepting change 3 of 4 in a list landed on a merged
// bullet above it. So the press records WHICH CHANGE CAME NEXT, and the index
// survives only as the fallback for a follower that is gone — inside
// ./redline-current `landingAfterPress`, which the view no longer works around.
//
// The two verbs still differ in one way that matters: an accept moves the
// baseline in memory and redraws in its own tick, while a rewind writes the
// file. Measured in the app at 35 ms against 1,139 ms, and PR 28's author's own
// complaint — so a landed write is ADOPTED by the tab that wrote it, which is
// the line this rule refuses to lose. TWO ORDERINGS RIDE ON THAT ADOPTION and
// this rule reads both: the host takes the keyboard BEFORE it, because a
// rewind of the ONLY remaining change removes the wrapper the keyboard was on
// and Chromium sends focus to `document.body`, where the scroller's React key
// handler never hears ⌥⇧⌫ again; and the hold LANDS AFTER it, with the bytes
// the tab holds once the adoption has had its say.
//
// ONE PRESS AT A TIME, because a rewind is in the air for a write and, when
// the adoption refuses, a whole watcher round trip, and the picture goes on
// drawing the change it rewound. So the press takes a HOLD; a second rewind of
// that same change and EVERY accept on that tab answer `held` with a sentence
// and touch nothing; and the hold is let go by a layout effect keyed on the
// picture AND on `savedContents`, because a watcher read moves the bytes
// without moving a dirty tab's picture and the release must still be asked.
// A KEY REPEAT IS NOT A PRESS either: with the move-on, a held ⌥⌫ became
// "rewind every change in the file, writing it once per change" and a held ⌥↩
// became the accept-all chord `keymap.ts` removed on purpose, so a repeated
// keydown runs only `next` and `prev` — after the `preventDefault()`, which is
// not optional, because an unprevented ⌥⌫ in the `plaintext-only` document is
// Chromium's `deleteWordBackward`.
//
// THE CLEAN TRANSITION NAMES THE RE-READ, Phase 282.2. Phase 282.1 kept a
// landed hold on a dirty tab and gave the accept a sentence that names two
// ways out, "Save or undo your edits first, then accept". Both of its
// reverifiers then drove the undo and read it leading nowhere: ⌘Z takes the
// tab back to clean (./redline-edits marks it from the buffer) and NO READ
// FOLLOWS, because `refreshRepo` had ONE caller, the watcher's debounced tick
// in ./store `init`, and the rewind's own tick was spent while the tab was
// dirty. On a paused agent nothing else in that repository changes, so the
// hold stood on a CLEAN tab and every ⌥↩ answered "still being rewound" while
// nothing was. So the view makes the read that tick would have made: an
// effect keyed on `[tab.dirty]` ALONE that, when a hold has LANDED, calls the
// store's `rereadRepo`, which reaches ./tab-io's queued `refreshRepo`. What
// the phase refuses is read here with it — no read without a landed hold, so
// an ordinary undo on an ordinary tab reads nothing; none on the way INTO
// dirty; and no adoption of the bytes the hold remembers, because a read asks
// the disk what is there NOW and rules 22 and 26 of `conformance:save` already
// guard that read. The BEHAVIOUR is pinned where it can run,
// p2822-after-undo.test.ts and p282-view-presses.test.ts with no hand-made
// read; this clause pins the wiring a later round would drop.
//
// AND ./live-text READS NO WORKING MODEL ON THE RENDER PATH. PR 28 added one
// line there that read the model at every render; it made this view draw text
// one keystroke ahead of the typing hook's own last picture, which is the
// BLOCKING scramble — `swift` typed as `swfti`, and `probe:p237` failing 5
// checks in the app. The `useState` initialiser and the effect may read the
// model; nothing that runs on every render may.
//
// NOTHING IN THE COMMIT BATTERY COULD SEE THE WIRING. This tree's vitest
// environment is `node` and there is no jsdom, so no test focuses an element
// and none can read the state a recompose leaves behind;
// `p282-move-on.test.ts` and `p282-one-press.test.ts` pin the ARITHMETIC and
// the ANSWERS, and this rule pins the WIRING, which is where a later round
// would drop it. It is the same instrument rule 20 uses: four scanners over
// the shipping source (the fourth, Phase 282.2's, reads ./store for
// `rereadRepo` and nothing else), each reading callbacks and effects by
// MATCHING PARENTHESES so one callback's references cannot be mistaken for
// another's, each proved on planted shapes this file writes, and then on
// ABLATIONS OF THE SHIPPING SOURCE ITSELF.
//
// THE ABLATIONS ARE MADE ON STRINGS AND NEVER ON THE TREE. This gate runs in
// the commit battery, so a rule that edited the operator's own source and
// crashed between the edit and the restore would leave him an ablated file.
// Each ablation reads the shipping bytes, mutates the COPY and asks the same
// scanner; the four files' sha256 are taken before and compared in a
// `finally` after, so a later round that reaches for the disk instead is
// caught here rather than by him.
// ---------------------------------------------------------------------------
{
  const VIEW = 'src/renderer/editor/RedlineDocument.tsx';
  const CURRENT = 'src/renderer/editor/redline-current.ts';
  const LIVE = 'src/renderer/editor/live-text.ts';
  const STORE = 'src/renderer/editor/store.ts';
  const REF = 'advanceAfterPress';
  const PENDING = `const pending = ${REF}.current;`;
  const ACCEPTED_GUARD = "result.outcome === 'accepted'";

  /** The body of one named `const NAME = useCallback(` call, or null. */
  const callbackBody = (code, open) => {
    const at = code.indexOf(open);
    if (at === -1) return null;
    const paren = code.indexOf('(', at + open.length - 1);
    const close = paren === -1 ? -1 : closeOf(code, paren);
    return close === -1 ? null : code.slice(paren, close + 1);
  };

  /**
   * The body of the scroller's own key handler, found by the command it
   * DECODES rather than by being the only `onKeyDown` in the file, so a second
   * handler added later is never judged in its place.
   */
  const keyHandlerBody = (code) => {
    let from = 0;
    for (;;) {
      const at = code.indexOf('onKeyDown', from);
      if (at === -1) return null;
      const arrow = code.indexOf('=>', at);
      const open = arrow === -1 ? -1 : code.indexOf('{', arrow);
      const body = open === -1 ? null : blockAt(code, open);
      if (body !== null && body.includes('redlineCommandOf(')) return body;
      from = at + 1;
    }
  };

  /**
   * PHASE 282.2. The effect whose dependency array is EXACTLY `[tab.dirty]`:
   * where its call starts and closes in `code`, and its callback as text. Null
   * when the view holds none.
   *
   * It is found by its DEPENDENCIES rather than by the call it holds, because
   * the dependencies are the ruling. The release effect above it watches the
   * picture and `savedContents` and is asked on every redraw and every read;
   * this one may run on a move of the flag and on nothing else, so an effect
   * that calls `rereadRepo` from `[composed, tab.dirty]` is not this effect
   * and is not found. Every `useEffect(` and `useLayoutEffect(` is read by
   * matching parentheses and its LAST argument compared whole.
   *
   * `stripComments` blanks a comment character for character, so an offset in
   * the stripped text is the same offset in the file, which is how the two
   * ablations below cut the shipping bytes at a span found here.
   */
  const cleanEffectOf = (code) => {
    const opener = /\buse(?:Layout)?Effect\(/g;
    let m;
    while ((m = opener.exec(code)) !== null) {
      const open = m.index + m[0].length - 1;
      const close = closeOf(code, open);
      if (close === -1) continue;
      const args = callArguments(code, open);
      if (args.length < 2) continue;
      if (args[args.length - 1].replace(/\s+/g, '') !== '[tab.dirty]') continue;
      return { start: m.index, open, close, body: args.slice(0, -1).join(', ') };
    }
    return null;
  };

  /**
   * PHASE 282.2's FIX ROUND. WHICH WAY the clean transition reads the flag:
   * 'clean' when the re-read is reached only on a tab that is NOT dirty,
   * 'dirty' when it is reached only on one that is, 'unread' when the flag is
   * named but in no test this reader can follow.
   *
   * THE CLAUSE READ TEXT AND NOT POLARITY, and both of the phase's verifiers
   * drove it rather than took the SPEC's word: with `if (!tab.dirty) return;`
   * in a scratch copy of the view this gate exited 0 with every ablation red,
   * while p2822-after-undo.test.ts went 5 red of 8. Its sentence said "the
   * effect never asks which way the flag moved", which claimed a direction it
   * could not see. So the two spellings the clause accepts are read for their
   * direction, and anything else is refused by name rather than passed:
   *
   *   if (tab.dirty ...) return;          the early return, flag UN-negated,
   *                                       joined to other reasons by `||` only
   *   if (!tab.dirty && ...) { CALL }     the guard round the call, flag
   *                                       NEGATED, joined by `&&` only
   *
   * A comparison with a literal (`tab.dirty === false`) is `unread`: it can be
   * right, and this reader would have to evaluate it to know, so the clause
   * asks for one of the two spellings it can read instead. Only a test BEFORE
   * the call is looked at, because a test after it decides nothing.
   */
  const flagPolarityOf = (body, call) => {
    const tests = /\bif\s*\(/g;
    let answer = 'unread';
    let m;
    while ((m = tests.exec(body)) !== null) {
      const open = m.index + m[0].length - 1;
      if (call !== -1 && open > call) break;
      const close = closeOf(body, open);
      if (close === -1) continue;
      const cond = body.slice(open + 1, close).replace(/\s+/g, '');
      if (!cond.includes('tab.dirty')) continue;
      if (/tab\.dirty(?:===?|!==?)|(?:===?|!==?)tab\.dirty/.test(cond)) return 'unread';
      const negated = cond.includes('!tab.dirty');
      const after = body.slice(close + 1);
      if (/^\s*(?:\{\s*)?return\b/.test(after)) {
        // The early return: the call is reached when this test is FALSE.
        if (cond.includes('&&')) return 'unread';
        answer = negated ? 'dirty' : 'clean';
        continue;
      }
      // The guard: the call must sit inside the statement this test governs.
      const brace = /^\s*\{/.exec(after);
      const end = brace === null ? body.indexOf(';', close) : closeOf(body, close + brace[0].length);
      if (call === -1 || call < close || call > end) continue;
      if (cond.includes('||')) return 'unread';
      answer = negated ? 'clean' : 'dirty';
    }
    return answer;
  };

  /**
   * What is wrong with this source's move, one-press and repeat wiring, or an
   * empty list. Both callbacks and both layout effects are found by name or by
   * the call they hold and read by MATCHING PARENTHESES, the way rule 20 reads
   * the accept, so a line scan cannot mistake one callback's own references
   * for the other's.
   */
  const advanceFindings = (source) => {
    const code = stripComments(source);
    const out = [];
    // 1. THE ACCEPT records the follower BEFORE the press (the change it takes
    //    is gone from the picture after it), passes the holds, says something
    //    when it is held, and arms inside the accepted guard for one change
    //    only — accept-all leaves no change to move to and a refusal must not
    //    move anybody.
    const accept = callbackBody(code, 'const accept = useCallback(');
    if (accept === null) out.push('no `const accept = useCallback(` in the view');
    else {
      if (!accept.includes("pressMoveOf('accept'")) {
        out.push('the accept never records the change drawn after the one it takes, so the move is the index PR 28 carried and nothing better');
      }
      if (!accept.includes('holds:')) {
        out.push('the accept passes no holds, so it can take a change while a rewind this view pressed is still being drawn');
      }
      if (!accept.includes("outcome === 'held'") || !accept.includes('redlineHeldSentence(')) {
        out.push('a held accept is not answered with a sentence, so a press that was refused says nothing at all');
      }
      const guard = accept.indexOf(ACCEPTED_GUARD);
      const guardBody = guard === -1 ? null : blockAt(accept, accept.indexOf('{', guard));
      if (guardBody === null || !guardBody.includes(`${REF}.current =`)) {
        out.push('the accept never arms the move to the next change inside the accepted guard');
      }
      if (guardBody !== null && !guardBody.includes("kind === 'one'")) {
        out.push('the accept arms without the per-change clause, so accept-all or a refusal could move somebody');
      }
    }
    // 2. THE REWIND: the follower recorded before the press, the holds passed,
    //    a held press answered, the arming kept to a rewind, and the three
    //    acts around the adoption in their measured order — focus, adopt,
    //    land.
    const press = callbackBody(code, 'const press = useCallback(');
    if (press === null) {
      out.push('no `const press = useCallback(` in the view, so a rewind cannot move on');
    } else {
      if (!press.includes(`${REF}.current =`)) {
        out.push('the rewind never arms the move to the next change');
      }
      if (!press.includes("kind === 'rewind'")) {
        out.push('the arming is not kept to a rewind, so an undo could move somebody');
      }
      if (!press.includes("pressMoveOf('rewind'")) {
        out.push(
          'the rewind never records the change drawn after the one it rewinds, so an agent’s write above lands the move on the change before it'
        );
      }
      if (!press.includes('holds:')) {
        out.push(
          'the rewind passes no holds, so a second ⌥⌫ on the change this view is still rewinding writes the file again'
        );
      }
      if (!press.includes("outcome === 'held'") || !press.includes('redlineHeldSentence(')) {
        out.push('a held rewind is not answered with a sentence, so a press that was refused says nothing at all');
      }
      const adopt = press.indexOf('adoptWritten(');
      if (adopt === -1) {
        out.push('a landed write is not adopted by the tab, so a rewind redraws only when the watcher gets round to it');
      } else {
        const land = press.indexOf('landHold(');
        if (land === -1) {
          out.push(
            'the hold the press took is never landed, so the release can never let it go and every accept on that tab is refused until the view is opened again'
          );
        } else if (land < adopt) {
          out.push(
            'the hold lands before the adoption, so it records the bytes the tab held before the write instead of the ones it holds after it'
          );
        }
        const focus = press.indexOf('host.focus(');
        if (focus === -1) {
          out.push(
            'the rewind never gives the host the keyboard, so rewinding the only remaining change leaves the focus at document.body and ⌥⇧⌫ does nothing until a click'
          );
        } else if (focus > adopt) {
          out.push(
            'the host takes the keyboard after the adoption, and the adoption is what removes the wrapper it was on, so there is nothing left to take it from'
          );
        } else if (!press.includes('CHANGE_SELECTOR')) {
          out.push(
            'the rewind takes the keyboard without asking whether it was on a change wrapper, so a rewind from the Edit menu pulls it out of a terminal'
          );
        }
      }
    }
    // 3. THE ARITHMETIC BELONGS TO ./redline-current NOW. `indexAfterRemoval`
    //    is the fallback inside `landingAfterPress`, and a caller here would
    //    be PR 28's index rule growing back beside the identity move that
    //    replaced it.
    if (code.includes('indexAfterRemoval(')) {
      out.push('the view bounds the index itself, so PR 28’s index rule is back beside the identity move that replaced it');
    }
    // 4. THE EFFECT THAT SPENDS THE MOVE, found by the read rather than by
    //    name, so the nearest layout effect above the read is the one judged.
    const read = code.indexOf(PENDING);
    if (read === -1) {
      out.push('nothing reads the armed move, so the change after a press is never taken');
    } else {
      const effectAt = code.lastIndexOf('useLayoutEffect(', read);
      if (effectAt === -1) {
        out.push('the armed move is read outside a layout effect, so it is spent before the redraw');
      } else {
        const effectOpen = code.indexOf('(', effectAt);
        const effectClose = closeOf(code, effectOpen);
        const effect = effectClose === -1 ? '' : code.slice(effectOpen, effectClose + 1);
        const waitAt = effect.indexOf("'wait'");
        const clearAt = effect.lastIndexOf(`${REF}.current = null;`);
        if (!effect.includes(PENDING)) {
          out.push('the layout effect above the read is not the one that takes the armed move');
        }
        if (!effect.includes('const standing = currentRef.current;')) {
          out.push('the move does not check that the person is still standing on the pressed change, so it overrides a move made meanwhile');
        }
        if (!effect.includes('landingAfterPress(')) {
          out.push('the move does not ask landingAfterPress where to land, so the follower is never found by identity');
        }
        if (waitAt === -1) {
          out.push('the move does not honour the wait, so a rewind whose adoption refused lands on the change it just rewound');
        } else if (clearAt !== -1 && clearAt < waitAt) {
          out.push('the armed move is cleared before the wait is answered, so a picture that has not caught up loses the move altogether');
        }
        if (clearAt === -1) {
          out.push('the armed move is never cleared, so a later recompose moves somebody for no reason');
        }
        if (!effect.includes('changeElements(')) {
          out.push('the move never asks the redrawn picture for the element to take');
        }
        if (!effect.includes('makeCurrent(')) {
          out.push('the next change is never made current, so the controls stay on the change that was pressed');
        }
        if (!effect.includes('.focus(')) {
          out.push('the next change is never focused, so the keyboard cannot reach the next press');
        }
      }
    }
    // 5. THE HOLDS LET GO IN THEIR OWN LAYOUT EFFECT, and it watches the bytes
    //    as well as the picture: a watcher read moves `savedContents` without
    //    moving a dirty tab's composed picture, and the release's second
    //    clause must still be asked.
    const releaseAt = code.indexOf('releaseHolds(');
    if (releaseAt === -1) {
      out.push('nothing releases the rewind holds, so one landed rewind refuses every accept on that tab until the view is opened again');
    } else {
      const holdAt = code.lastIndexOf('useLayoutEffect(', releaseAt);
      const holdOpen = holdAt === -1 ? -1 : code.indexOf('(', holdAt);
      const holdClose = holdOpen === -1 ? -1 : closeOf(code, holdOpen);
      const holdEffect = holdClose === -1 ? '' : code.slice(holdOpen, holdClose + 1);
      if (!holdEffect.includes('releaseHolds(')) {
        out.push('the holds are released outside a layout effect, so they are let go a paint after the picture that stopped drawing them');
      } else {
        const args = callArguments(code, holdOpen);
        const deps = args[args.length - 1] ?? '';
        if (!deps.includes('savedContents')) {
          out.push('the release effect does not watch savedContents, so a watcher read that moves the bytes under a dirty tab never asks whether the hold may go');
        }
        // PHASE 282'S FIX ROUND asked for `dirty` in these dependencies too,
        // because it had made a dirty tab release every landed hold. PHASE
        // 282.1 withdrew that release — the reverify measured it letting ⌥↩
        // accept the change the person had just rewound, drawn backwards once
        // the tab was clean again — so the effect no longer takes the flag,
        // and this rule no longer asks for it. The rule that a dirty tab KEEPS
        // its holds is pinned where it can run: p282-one-press.test.ts, "A
        // LANDED HOLD STAYS ON A DIRTY TAB".
      }
    }
    // 6. A KEY REPEAT IS NOT A PRESS, and the `preventDefault()` stays in
    //    front of that test whatever else moves.
    const keydown = keyHandlerBody(code);
    if (keydown === null) {
      out.push('the scroller has no key handler that decodes a redline command, so no chord reaches the view at all');
    } else {
      const prevent = keydown.indexOf('preventDefault()');
      const repeat = keydown.indexOf('event.repeat');
      if (prevent === -1) {
        out.push(
          'the key handler does not preventDefault, so ⌥⌫ is Chromium’s deleteWordBackward and deletes a word of the person’s text'
        );
      }
      if (repeat === -1 || !keydown.includes('redlineRepeatRuns(')) {
        out.push(
          'a repeated keydown runs the command, so a held ⌥⌫ rewinds every change in the file and a held ⌥↩ is the accept-all chord keymap.ts removed on purpose'
        );
      } else if (prevent !== -1 && prevent > repeat) {
        out.push('the repeat is consumed before the preventDefault, so the repeat that fell through deletes a word through ./redline-edits');
      }
    }
    // 7. PHASE 282.2. THE CLEAN TRANSITION NAMES THE RE-READ. The accept's
    //    sentence on a dirty tab names undo as a way out, and an undo moves
    //    nothing the release effect watches until somebody READS: the flag
    //    goes clean, `savedContents` stays the agent's words, and the
    //    watcher's tick for the rewind was spent while the tab was dirty. So
    //    the view asks for that read itself — with a landed hold, on the way
    //    OUT of dirty, and by reading rather than by adopting what the hold
    //    remembers. Everything up to the call is what decides whether it is
    //    made, so the two tests are looked for there.
    const clean = cleanEffectOf(code);
    if (clean === null) {
      out.push(
        'no effect is keyed on [tab.dirty] alone, so ⌘Z back to clean pulls no read and a landed hold answers "still being rewound" until the agent next writes to that repository'
      );
    } else {
      const call = clean.body.indexOf('rereadRepo(');
      const asked = call === -1 ? clean.body : clean.body.slice(0, call);
      if (call === -1) {
        out.push(
          'the effect keyed on tab.dirty never calls rereadRepo, so the undo the acceptDirty sentence names leads to no read'
        );
      }
      if (!asked.includes('rewindHolds.current') || !/landed/i.test(asked)) {
        out.push(
          'the re-read is pulled on every clean transition whether a hold has landed or not, so an ordinary undo on an ordinary tab reads the disk'
        );
      }
      if (!asked.includes('tab.dirty')) {
        out.push(
          'the effect never asks which way the flag moved, so the read is pulled on the way INTO dirty as well as out of it'
        );
      } else {
        // PHASE 282.2's FIX ROUND. And WHICH WAY it asks, read and not assumed
        // (`flagPolarityOf` says what the verifiers measured).
        const way = flagPolarityOf(clean.body, call);
        if (way === 'dirty') {
          out.push(
            'the effect tests the flag the wrong way round, so the read is pulled on the way INTO dirty and never on the way out of it, and ⌘Z back to clean leaves the hold standing'
          );
        } else if (way === 'unread') {
          out.push(
            'the effect names tab.dirty in no test this rule can read the direction of; write `if (tab.dirty) return;` before the call, or `if (!tab.dirty && …) {` round it'
          );
        }
      }
      if (clean.body.includes('adoptWritten(')) {
        out.push(
          'the clean transition adopts the bytes the hold remembers instead of asking the disk what is there now, so a write that landed between the rewind and the undo is drawn over'
        );
      }
    }
    return out;
  };

  /**
   * What is wrong with `landingAfterPress`, or an empty list. THE ORDER OF THE
   * THREE QUESTIONS IS THE RULE: wait, then the follower, then the index.
   */
  const landingFindings = (source) => {
    const out = [];
    const body = functionBodyOf(stripComments(source), 'landingAfterPress');
    if (body === null) {
      out.push('there is no landingAfterPress, so the move has nowhere to ask where it lands');
      return out;
    }
    const waitAt = body.indexOf("'wait'");
    const followerAt = body.indexOf('move.follower');
    const fallbackAt = body.indexOf('indexAfterRemoval(');
    if (waitAt === -1) {
      out.push('landingAfterPress never waits, so a rewind whose adoption refused steps past the change it just rewound while the picture still draws it');
    } else if (!body.slice(0, waitAt).includes('.ins')) {
      out.push('the wait asks sameChange rather than off, del AND ins, so an agent’s new change at the same span parks the move until the person walks away');
    }
    if (followerAt === -1) {
      out.push('landingAfterPress never looks for the follower by identity, so it is PR 28’s index rule under a new name');
    } else if (!body.includes('followerAfter')) {
      out.push('the follower is looked for at its recorded offset whatever the verb did, so an accept’s own ins-minus-del shift is never taken and change 3 of 4 in a list lands above it');
    }
    if (fallbackAt === -1) {
      out.push('landingAfterPress has no fallback, so a follower merged away or split leaves the person nowhere');
    }
    if (waitAt !== -1 && followerAt !== -1 && waitAt > followerAt) {
      out.push('the follower is asked before the wait, so a picture that has not caught up is moved on anyway');
    }
    if (followerAt !== -1 && fallbackAt !== -1 && followerAt > fallbackAt) {
      out.push('the index fallback is asked before the follower, so the identity the press recorded is never used');
    }
    return out;
  };

  /**
   * What is wrong with `useLiveTabText`, or an empty list. The `useState`
   * initialiser and the effect may read the working model; NOTHING THAT RUNS
   * ON EVERY RENDER MAY. Every hook CALL is cut out of the body, arguments and
   * all, and what is left is what React runs on every render of every
   * consumer.
   */
  const liveTextFindings = (source) => {
    const out = [];
    const body = functionBodyOf(stripComments(source), 'useLiveTabText');
    if (body === null) {
      out.push('there is no useLiveTabText, so the two surfaces that shared one debounce have grown apart again');
      return out;
    }
    let everyRender = body;
    for (const hook of ['useState', 'useEffect', 'useMemo', 'useRef', 'useCallback']) {
      for (;;) {
        const at = everyRender.indexOf(hook);
        if (at === -1) break;
        // The `(` of the CALL, past a generic argument list if there is one.
        const open = everyRender.indexOf('(', at + hook.length);
        if (open === -1 || /[;{}]/.test(everyRender.slice(at + hook.length, open))) break;
        const close = closeOf(everyRender, open);
        if (close === -1) break;
        everyRender = everyRender.slice(0, at) + everyRender.slice(close + 1);
      }
    }
    if (everyRender.includes('getWorkingModel')) {
      out.push(
        'live-text.ts reads the working model on the render path, so the Redline view draws text one keystroke ahead of the typing hook’s own last picture and a burst of keys scrambles'
      );
    }
    return out;
  };

  /**
   * PHASE 282.2. What is wrong with the store's `rereadRepo`, or an empty
   * list. The view's clean transition calls it by name, and a name that
   * reaches nothing is the same lingering hold with one more hop in it.
   *
   * A store action is a shorthand METHOD on the object the factory returns,
   * which `functionBodyOf` does not read, and the name stands in the file
   * twice: once in the state's interface, where the parameter list is followed
   * by a type and a `;`, and once as the action, where it is followed by a
   * body. So every `rereadRepo(` is visited, a declaration with no body is
   * passed over, and an arrow bound to the name is read too, so a later
   * refactor from one spelling to the other cannot make this read nothing.
   */
  const rereadFindings = (source) => {
    const code = stripComments(source);
    const out = [];
    const bodies = [];
    const named = /\brereadRepo\s*(?::\s*(?:async\s*)?)?\(/g;
    let m;
    while ((m = named.exec(code)) !== null) {
      const params = closeOf(code, m.index + m[0].length - 1);
      if (params === -1) continue;
      const rest = code.slice(params + 1);
      const method = /^\s*(?::[^;{=]*)?\{/.exec(rest);
      const arrow = /^\s*(?::[^;{=]*)?=>\s*/.exec(rest);
      if (method !== null) {
        const body = blockAt(code, params + method[0].length);
        if (body !== null) bodies.push(body);
      } else if (arrow !== null) {
        const from = params + 1 + arrow[0].length;
        const body = code[from] === '{' ? blockAt(code, from) : code.slice(from, code.indexOf('\n', from));
        if (body !== null) bodies.push(body);
      }
    }
    if (bodies.length === 0) {
      out.push('the editor store has no rereadRepo action, so the view’s clean transition has nothing to call');
    } else if (!bodies.some((body) => body.includes('refreshRepo('))) {
      out.push(
        'rereadRepo does not reach refreshRepo, so the read the clean transition asks for is never made and the hold lingers as it did'
      );
    }
    return out;
  };

  // ---- The shipping sources, read once and judged. -------------------------
  const SOURCES = new Map();
  for (const file of [VIEW, CURRENT, LIVE, STORE]) {
    if (!existsSync(file)) fail(`40. ${file} is not there, so rule 40 proves nothing`);
    else SOURCES.set(file, readFileSync(file, 'utf8'));
  }
  const SCANNERS = new Map([
    [VIEW, advanceFindings],
    [CURRENT, landingFindings],
    [LIVE, liveTextFindings],
    [STORE, rereadFindings]
  ]);
  const scanOf = (file) => SCANNERS.get(file) ?? (() => []);
  for (const [file, source] of SOURCES) {
    for (const line of scanOf(file)(source)) fail(`40. ${file}: ${line}`);
  }

  // ---- The view's scanner, proved on planted shapes, one clause each. ------
  const ACCEPT_BODY =
    '  const pressed = identityOf(pressedElement(host));\n' +
    "  const move = pressMoveOf('accept', changeElements(host).map(identityOf), pressed);\n" +
    '  const result = pressAccept(kind, tabOf(), { focused: () => pressed, holds: rewindHolds.current });\n' +
    "  if (result.outcome === 'held') {\n" +
    "    toast('info', redlineHeldSentence('accept', live.name));\n" +
    '    return;\n' +
    '  }\n' +
    "  if (result.outcome === 'accepted') {\n" +
    "    if (kind === 'one' && move !== null) advanceAfterPress.current = move;\n" +
    '    hostRef.current?.focus({ preventScroll: true });\n' +
    '  }';
  const PRESS_BODY =
    '  const pressed = identityOf(pressedElement(host));\n' +
    "  const move = pressMoveOf('rewind', changeElements(host).map(identityOf), pressed);\n" +
    '  const result = await pressRedline(kind, tabOf(), { focused: () => pressed, apply: applyRewind, holds: rewindHolds.current });\n' +
    "  if (result.outcome === 'held') {\n" +
    "    toast('info', redlineHeldSentence('rewind', live.name));\n" +
    '    return;\n' +
    '  }\n' +
    "  if (result.outcome === 'wrote') {\n" +
    '    const active = host.ownerDocument.activeElement;\n' +
    '    const onAChange = active instanceof HTMLElement && host.contains(active) && active.closest(CHANGE_SELECTOR) !== null;\n' +
    '    if (onAChange) host.focus({ preventScroll: true });\n' +
    '    adoptWritten(live.id, result.contents, result.was);\n' +
    '    const adopted = tabOf();\n' +
    "    if (kind === 'rewind' && adopted !== undefined) landHold(rewindHolds.current, result.entry, adopted.savedContents, result.was);\n" +
    '  }\n' +
    "  if (kind === 'rewind' && result.outcome === 'wrote' && move !== null) advanceAfterPress.current = move;";
  const MOVE_EFFECT =
    '  const host = hostRef.current;\n' +
    '  const pending = advanceAfterPress.current;\n' +
    '  if (host === null || pending === null) return;\n' +
    '  const standing = currentRef.current;\n' +
    '  if (standing === null || !sameChange(standing, pending.pressed)) {\n' +
    '    advanceAfterPress.current = null;\n' +
    '    return;\n' +
    '  }\n' +
    '  const items = changeElements(host);\n' +
    '  const landing = landingAfterPress(items.map(identityOf), pending);\n' +
    "  if (landing === 'wait') return;\n" +
    '  advanceAfterPress.current = null;\n' +
    '  const el = landing === null ? null : (items[landing] ?? null);\n' +
    '  if (el === null) return;\n' +
    '  makeCurrent(el);\n' +
    '  el.focus();';
  const RELEASE_EFFECT =
    'useLayoutEffect(() => {\n' +
    '  const host = hostRef.current;\n' +
    '  releaseHolds(rewindHolds.current, host === null ? [] : changeElements(host).map(identityOf), tab.savedContents);\n' +
    '}, [composed, tab.savedContents]);';
  // PHASE 282.2. The clean transition, in the shape the view ships it in.
  const CLEAN_EFFECT =
    'useEffect(() => {\n' +
    '  if (tab.dirty) return;\n' +
    '  if (!rewindHolds.current.some((h) => h.landed !== null)) return;\n' +
    '  useEditor.getState().rereadRepo(tab.repoPath);\n' +
    '}, [tab.dirty]);';
  const KEY_HANDLER =
    'const scroller = { onKeyDown: (event) => {\n' +
    '  const command = redlineCommandOf(event);\n' +
    '  if (command === null) return;\n' +
    '  event.preventDefault();\n' +
    '  if (event.repeat && !redlineRepeatRuns(command)) return;\n' +
    '  runCommand(command);\n' +
    '} };';
  const viewSource = (over = {}) => {
    const p = {
      accept: ACCEPT_BODY,
      press: PRESS_BODY,
      effect: MOVE_EFFECT,
      release: RELEASE_EFFECT,
      clean: CLEAN_EFFECT,
      keydown: KEY_HANDLER,
      ...over
    };
    return (
      'const advanceAfterPress = useRef(null);\n' +
      'const rewindHolds = useRef([]);\n' +
      `const accept = useCallback((kind, host) => {\n${p.accept}\n}, [tab.id]);\n` +
      `const press = useCallback(async (kind, host) => {\n${p.press}\n}, [tab.id]);\n` +
      `useLayoutEffect(() => {\n${p.effect}\n}, [composed, generation, makeCurrent]);\n` +
      `${p.release}\n${p.clean}\n${p.keydown}\n`
    );
  };
  const NO_ACCEPT_MOVE =
    '  const move = { at: indexOfChange(changeElements(host), pressed) };\n';
  const VIEW_PLANTS = [
    { name: 'the shipping shape', source: viewSource(), want: null },
    {
      name: 'the accept records no follower, so only PR 28’s index is left',
      source: viewSource({
        accept: ACCEPT_BODY.replace(
          "  const move = pressMoveOf('accept', changeElements(host).map(identityOf), pressed);\n",
          NO_ACCEPT_MOVE
        )
      }),
      want: 'never records the change drawn after the one it takes'
    },
    {
      name: 'the accept passes no holds, so it takes a change mid-rewind',
      source: viewSource({ accept: ACCEPT_BODY.replace(', holds: rewindHolds.current', '') }),
      want: 'the accept passes no holds'
    },
    {
      name: 'a held accept says nothing',
      source: viewSource({
        accept: ACCEPT_BODY.replace(
          "  if (result.outcome === 'held') {\n    toast('info', redlineHeldSentence('accept', live.name));\n    return;\n  }\n",
          ''
        )
      }),
      want: 'a held accept is not answered with a sentence'
    },
    {
      name: 'the accept arming deleted, so an accept stops where it landed',
      source: viewSource({
        accept: ACCEPT_BODY.replace(
          "    if (kind === 'one' && move !== null) advanceAfterPress.current = move;\n",
          ''
        )
      }),
      want: 'never arms the move to the next change inside the accepted guard'
    },
    {
      name: 'the accept arming outside the accepted guard, which moves somebody on a refusal',
      source: viewSource({
        accept:
          ACCEPT_BODY.replace(
            "    if (kind === 'one' && move !== null) advanceAfterPress.current = move;\n",
            ''
          ) + "\n  if (kind === 'one') advanceAfterPress.current = move;"
      }),
      want: 'never arms the move to the next change inside the accepted guard'
    },
    {
      name: 'the accept per-change clause dropped, so accept-all arms a change that is gone',
      source: viewSource({
        accept: ACCEPT_BODY.replace("if (kind === 'one' && move !== null) ", 'if (move !== null) ')
      }),
      want: 'arms without the per-change clause'
    },
    {
      name: 'the rewind arming deleted, so option-delete stops where it landed',
      source: viewSource({
        press: PRESS_BODY.replace(
          "\n  if (kind === 'rewind' && result.outcome === 'wrote' && move !== null) advanceAfterPress.current = move;",
          ''
        )
      }),
      want: 'the rewind never arms the move'
    },
    {
      name: 'the rewind arming not kept to a rewind, so an undo could move somebody',
      source: viewSource({ press: PRESS_BODY.replaceAll("kind === 'rewind' && ", '') }),
      want: 'not kept to a rewind'
    },
    {
      name: 'the rewind records no follower, so an agent’s write above lands the move before it',
      source: viewSource({
        press: PRESS_BODY.replace(
          "  const move = pressMoveOf('rewind', changeElements(host).map(identityOf), pressed);\n",
          NO_ACCEPT_MOVE
        )
      }),
      want: 'never records the change drawn after the one it rewinds'
    },
    {
      name: 'the rewind passes no holds, so a second chord writes the file again',
      source: viewSource({ press: PRESS_BODY.replace(', holds: rewindHolds.current', '') }),
      want: 'the rewind passes no holds'
    },
    {
      name: 'a held rewind says nothing',
      source: viewSource({
        press: PRESS_BODY.replace(
          "  if (result.outcome === 'held') {\n    toast('info', redlineHeldSentence('rewind', live.name));\n    return;\n  }\n",
          ''
        )
      }),
      want: 'a held rewind is not answered with a sentence'
    },
    {
      name: 'the write not adopted, so the rewind redraws only when the watcher says so',
      source: viewSource({
        press: PRESS_BODY.replace('    adoptWritten(live.id, result.contents, result.was);\n', '')
      }),
      want: 'a landed write is not adopted'
    },
    {
      name: 'the hold never landed, so every accept on the tab is refused for good',
      source: viewSource({
        press: PRESS_BODY.replace(
          "    if (kind === 'rewind' && adopted !== undefined) landHold(rewindHolds.current, result.entry, adopted.savedContents, result.was);\n",
          ''
        )
      }),
      want: 'is never landed'
    },
    {
      name: 'the hold landed before the adoption, so it records the bytes from before the write',
      source: viewSource({
        press: PRESS_BODY.replace(
          '    adoptWritten(live.id, result.contents, result.was);\n    const adopted = tabOf();\n',
          '    const adopted = tabOf();\n'
        ).replace(
          "    if (kind === 'rewind' && adopted !== undefined) landHold(rewindHolds.current, result.entry, adopted.savedContents, result.was);\n",
          "    if (kind === 'rewind' && adopted !== undefined) landHold(rewindHolds.current, result.entry, adopted.savedContents, result.was);\n    adoptWritten(live.id, result.contents, result.was);\n"
        )
      }),
      want: 'the hold lands before the adoption'
    },
    {
      name: 'the host focus dropped, so a rewind of the only change strands the keyboard at document.body',
      source: viewSource({
        press: PRESS_BODY.replace('    if (onAChange) host.focus({ preventScroll: true });\n', '')
      }),
      want: 'never gives the host the keyboard'
    },
    {
      name: 'the host focus after the adoption, which is after the wrapper it was on is gone',
      source: viewSource({
        press: PRESS_BODY.replace(
          '    if (onAChange) host.focus({ preventScroll: true });\n    adoptWritten(live.id, result.contents, result.was);\n',
          '    adoptWritten(live.id, result.contents, result.was);\n    if (onAChange) host.focus({ preventScroll: true });\n'
        )
      }),
      want: 'takes the keyboard after the adoption'
    },
    {
      name: 'the host focus made unconditional, which pulls the keyboard out of a terminal',
      source: viewSource({
        press: PRESS_BODY.replace(
          '    const active = host.ownerDocument.activeElement;\n    const onAChange = active instanceof HTMLElement && host.contains(active) && active.closest(CHANGE_SELECTOR) !== null;\n    if (onAChange) host.focus({ preventScroll: true });\n',
          '    host.focus({ preventScroll: true });\n'
        )
      }),
      want: 'without asking whether it was on a change wrapper'
    },
    {
      name: 'the view bounds the index itself, so PR 28’s rule grows back',
      source: viewSource({
        effect: MOVE_EFFECT.replace(
          '  const landing = landingAfterPress(items.map(identityOf), pending);\n',
          '  const landing = indexAfterRemoval(items.length, pending.at);\n'
        )
      }),
      want: 'the view bounds the index itself'
    },
    {
      name: 'the read deleted, so the armed move is never spent',
      source: viewSource({ effect: MOVE_EFFECT.replace(`  ${PENDING}\n`, '') }),
      want: 'nothing reads the armed move'
    },
    {
      name: 'the standing guard dropped, so a move made during a rewind is overridden',
      source: viewSource({
        effect: MOVE_EFFECT.replace('  const standing = currentRef.current;\n', '')
      }),
      want: 'still standing on the pressed change'
    },
    {
      name: 'landingAfterPress dropped for a bare index into the picture',
      source: viewSource({
        effect: MOVE_EFFECT.replace(
          '  const landing = landingAfterPress(items.map(identityOf), pending);\n',
          '  const landing = pending.at;\n'
        )
      }),
      want: 'does not ask landingAfterPress'
    },
    {
      name: 'the wait dropped, so a rewind lands on the change it just rewound',
      source: viewSource({
        effect: MOVE_EFFECT.replace("  if (landing === 'wait') return;\n", '')
      }),
      want: 'does not honour the wait'
    },
    {
      name: 'the move cleared before the wait is answered, so a trailing picture loses it',
      source: viewSource({
        effect: MOVE_EFFECT.replace(
          "  if (landing === 'wait') return;\n  advanceAfterPress.current = null;\n",
          "  advanceAfterPress.current = null;\n  if (landing === 'wait') return;\n"
        )
      }),
      want: 'cleared before the wait is answered'
    },
    {
      name: 'the move left armed after it is spent, so a later recompose moves somebody',
      source: viewSource({
        effect: MOVE_EFFECT.replaceAll('  advanceAfterPress.current = null;\n', '')
      }),
      want: 'never cleared'
    },
    {
      name: 'the redrawn picture never asked for the element to take',
      source: viewSource({
        effect: MOVE_EFFECT.replace(
          '  const items = changeElements(host);\n',
          '  const items = itemsRef.current;\n'
        )
      }),
      want: 'never asks the redrawn picture'
    },
    {
      name: 'the move focused but never made current',
      source: viewSource({ effect: MOVE_EFFECT.replace('  makeCurrent(el);\n', '') }),
      want: 'never made current'
    },
    {
      name: 'the focus dropped, so the keyboard cannot reach the next press',
      source: viewSource({ effect: MOVE_EFFECT.replace('  el.focus();', '') }),
      want: 'never focused'
    },
    {
      name: 'the release deleted, so one landed rewind refuses every later accept',
      source: viewSource({ release: '' }),
      want: 'nothing releases the rewind holds'
    },
    {
      name: 'the release moved out of a layout effect, so it is a paint late',
      source: viewSource({
        release: RELEASE_EFFECT.replace('useLayoutEffect(() => {', 'useEffect(() => {')
      }),
      want: 'released outside a layout effect'
    },
    {
      name: 'the release effect stops watching savedContents',
      source: viewSource({
        release: RELEASE_EFFECT.replace('}, [composed, tab.savedContents]);', '}, [composed]);')
      }),
      want: 'does not watch savedContents'
    },
    // PHASE 282.2. The clean transition, one clause each, and first a second
    // spelling that must PASS, so the scanner is shown not to pin the first.
    {
      name: 'the clean transition written as one test around the call, in a layout effect',
      source: viewSource({
        clean:
          'useLayoutEffect(() => {\n' +
          '  if (!tab.dirty && rewindHolds.current.some((h) => h.landed !== null)) {\n' +
          '    useEditor.getState().rereadRepo(tab.repoPath);\n' +
          '  }\n' +
          '}, [tab.dirty]);'
      }),
      want: null
    },
    {
      name: 'the clean transition deleted, so ⌘Z back to clean pulls no read',
      source: viewSource({ clean: '' }),
      want: 'no effect is keyed on [tab.dirty] alone'
    },
    {
      name: 'the clean transition keyed on the picture as well, so every redraw of a clean tab reads the disk',
      source: viewSource({
        clean: CLEAN_EFFECT.replace('}, [tab.dirty]);', '}, [composed, tab.dirty]);')
      }),
      want: 'no effect is keyed on [tab.dirty] alone'
    },
    {
      name: 'the re-read deleted from the clean transition',
      source: viewSource({
        clean: CLEAN_EFFECT.replace('  useEditor.getState().rereadRepo(tab.repoPath);\n', '')
      }),
      want: 'never calls rereadRepo'
    },
    {
      name: 'the landed-hold test deleted, so an ordinary undo reads the disk',
      source: viewSource({
        clean: CLEAN_EFFECT.replace(
          '  if (!rewindHolds.current.some((h) => h.landed !== null)) return;\n',
          ''
        )
      }),
      want: 'on every clean transition'
    },
    {
      name: 'any hold asked for, landed or still in the air',
      source: viewSource({
        clean: CLEAN_EFFECT.replace(
          '!rewindHolds.current.some((h) => h.landed !== null)',
          'rewindHolds.current.length === 0'
        )
      }),
      want: 'on every clean transition'
    },
    {
      name: 'the landed-hold test made after the re-read it was to decide',
      source: viewSource({
        clean: CLEAN_EFFECT.replace(
          '  if (!rewindHolds.current.some((h) => h.landed !== null)) return;\n  useEditor.getState().rereadRepo(tab.repoPath);\n',
          '  useEditor.getState().rereadRepo(tab.repoPath);\n  if (!rewindHolds.current.some((h) => h.landed !== null)) return;\n'
        )
      }),
      want: 'on every clean transition'
    },
    {
      name: 'the flag never asked, so the way INTO dirty reads too',
      source: viewSource({ clean: CLEAN_EFFECT.replace('  if (tab.dirty) return;\n', '') }),
      want: 'never asks which way the flag moved'
    },
    // PHASE 282.2's FIX ROUND. THE DIRECTION, which both verifiers drove past
    // this clause: every shape below named the flag before the call and was
    // green until the clause read which way.
    {
      name: 'the early return INVERTED, so the read is pulled on the way into dirty (the shape both verifiers planted)',
      source: viewSource({ clean: CLEAN_EFFECT.replace('  if (tab.dirty) return;\n', '  if (!tab.dirty) return;\n') }),
      want: 'the wrong way round'
    },
    {
      name: 'the guard round the call INVERTED',
      source: viewSource({
        clean:
          'useEffect(() => {\n' +
          '  if (tab.dirty && rewindHolds.current.some((h) => h.landed !== null)) {\n' +
          '    useEditor.getState().rereadRepo(tab.repoPath);\n' +
          '  }\n' +
          '}, [tab.dirty]);'
      }),
      want: 'the wrong way round'
    },
    {
      name: 'the early return joined with &&, so a dirty tab with a landed hold reads',
      source: viewSource({
        clean: CLEAN_EFFECT.replace('  if (tab.dirty) return;\n', '  if (tab.dirty && rewindHolds.current.length === 0) return;\n')
      }),
      want: 'in no test this rule can read the direction of'
    },
    {
      name: 'the flag compared with a literal, which this clause refuses to evaluate',
      source: viewSource({ clean: CLEAN_EFFECT.replace('  if (tab.dirty) return;\n', '  if (tab.dirty !== false) return;\n') }),
      want: 'in no test this rule can read the direction of'
    },
    {
      name: 'the flag tested only AFTER the call it was to decide',
      source: viewSource({
        clean: CLEAN_EFFECT.replace(
          '  if (tab.dirty) return;\n  if (!rewindHolds.current.some((h) => h.landed !== null)) return;\n  useEditor.getState().rereadRepo(tab.repoPath);\n',
          '  if (!rewindHolds.current.some((h) => h.landed !== null)) return;\n  useEditor.getState().rereadRepo(tab.repoPath);\n  if (tab.dirty) return;\n'
        )
      }),
      want: 'never asks which way the flag moved'
    },
    {
      name: 'the early return with a second reason joined by ||, which must PASS',
      source: viewSource({
        clean: CLEAN_EFFECT.replace(
          '  if (tab.dirty) return;\n  if (!rewindHolds.current.some((h) => h.landed !== null)) return;\n',
          '  if (tab.dirty || !rewindHolds.current.some((h) => h.landed !== null)) return;\n'
        )
      }),
      want: null
    },
    {
      name: 'the bytes the hold remembers adopted instead of read',
      source: viewSource({
        clean: CLEAN_EFFECT.replace(
          '  useEditor.getState().rereadRepo(tab.repoPath);\n',
          '  const hold = rewindHolds.current.find((h) => h.landed !== null);\n' +
            '  if (hold !== undefined) useEditor.getState().adoptWritten(tab.id, hold.landed.saved, tab.savedContents);\n'
        )
      }),
      want: 'adopts the bytes the hold remembers'
    },
    {
      name: 'the repeat test deleted, so a held chord rewinds the whole file',
      source: viewSource({
        keydown: KEY_HANDLER.replace('  if (event.repeat && !redlineRepeatRuns(command)) return;\n', '')
      }),
      want: 'a repeated keydown runs the command'
    },
    {
      name: 'the repeat consumed before the preventDefault, so it falls through to deleteWordBackward',
      source: viewSource({
        keydown: KEY_HANDLER.replace(
          '  event.preventDefault();\n  if (event.repeat && !redlineRepeatRuns(command)) return;\n',
          '  if (event.repeat && !redlineRepeatRuns(command)) return;\n  event.preventDefault();\n'
        )
      }),
      want: 'consumed before the preventDefault'
    },
    {
      name: 'the preventDefault deleted altogether',
      source: viewSource({ keydown: KEY_HANDLER.replace('  event.preventDefault();\n', '') }),
      want: 'does not preventDefault'
    }
  ];

  // ---- ./redline-current's scanner, proved on planted bodies. --------------
  const LANDING_BODY =
    'export function landingAfterPress(drawn, move) {\n' +
    '  const pressed = move.pressed;\n' +
    '  const stillDrawn = drawn.some((id) => id !== null && id.off === pressed.off && id.del === pressed.del && id.ins === pressed.ins);\n' +
    "  if (stillDrawn) return 'wait';\n" +
    '  if (move.follower !== null) {\n' +
    "    const shift = move.verb === 'accept' && move.followerAfter ? pressed.ins.length - pressed.del.length : 0;\n" +
    '    const want = move.follower.off + shift;\n' +
    '    const found = drawn.findIndex((id) => id !== null && id.off === want);\n' +
    '    if (found !== -1) return found;\n' +
    '  }\n' +
    '  return indexAfterRemoval(drawn.length, move.at);\n' +
    '}\n';
  const LANDING_PLANTS = [
    { name: 'the shipping shape', source: LANDING_BODY, want: null },
    {
      name: 'the wait dropped',
      source: LANDING_BODY.replace("  if (stillDrawn) return 'wait';\n", '  void stillDrawn;\n'),
      want: 'never waits'
    },
    {
      name: 'the wait narrowed to sameChange, which parks on an agent’s new change',
      source: LANDING_BODY.replace(
        'id.off === pressed.off && id.del === pressed.del && id.ins === pressed.ins',
        'sameChange(id, pressed)'
      ),
      want: 'asks sameChange rather than off, del AND ins'
    },
    {
      name: 'the follower lookup deleted, which is PR 28’s index rule',
      source: LANDING_BODY.replace(/  if \(move\.follower !== null\) \{[\s\S]*?\n  \}\n/, ''),
      want: 'never looks for the follower by identity'
    },
    {
      name: 'the accept shift dropped, so change 3 of 4 in a list lands above it',
      source: LANDING_BODY.replace(
        "move.verb === 'accept' && move.followerAfter ? pressed.ins.length - pressed.del.length : 0",
        '0'
      ),
      want: 'whatever the verb did'
    },
    {
      name: 'the fallback deleted, so a merged-away follower leaves the person nowhere',
      source: LANDING_BODY.replace(
        '  return indexAfterRemoval(drawn.length, move.at);\n',
        '  return null;\n'
      ),
      want: 'has no fallback'
    },
    {
      name: 'the fallback asked before the follower',
      source:
        'export function landingAfterPress(drawn, move) {\n' +
        '  const pressed = move.pressed;\n' +
        '  const stillDrawn = drawn.some((id) => id !== null && id.off === pressed.off && id.del === pressed.del && id.ins === pressed.ins);\n' +
        "  if (stillDrawn) return 'wait';\n" +
        '  const at = indexAfterRemoval(drawn.length, move.at);\n' +
        '  if (move.follower !== null && move.followerAfter) return at;\n' +
        '  return at;\n' +
        '}\n',
      want: 'asked before the follower'
    }
  ];

  // ---- ./live-text's scanner, proved on planted hooks. ---------------------
  const LIVE_BODY =
    'export function useLiveTabText(tabId: string, savedContents: string, track: boolean): string {\n' +
    '  const [modelText, setModelText] = useState<string | null>(() =>\n' +
    '    track ? (getWorkingModel(tabId)?.getValue() ?? null) : null\n' +
    '  );\n' +
    '  useEffect(() => {\n' +
    '    const model = getWorkingModel(tabId);\n' +
    '    setModelText(model?.getValue() ?? null);\n' +
    '  }, [tabId, track]);\n' +
    '  return modelText ?? savedContents;\n' +
    '}\n';
  /** PR 28's own two lines, verbatim but for the comment that stood above them. */
  const PR28_LIVE_READ =
    '  const live = track ? (getWorkingModel(tabId)?.getValue() ?? null) : null;\n' +
    '  return live ?? modelText ?? savedContents;\n';
  const LIVE_PLANTS = [
    { name: 'the shipping shape, which is main’s own', source: LIVE_BODY, want: null },
    {
      name: 'PR 28’s render-path read put back',
      source: LIVE_BODY.replace('  return modelText ?? savedContents;\n', PR28_LIVE_READ),
      want: 'reads the working model on the render path'
    }
  ];

  // ---- ./store's scanner, proved on planted actions (Phase 282.2). ---------
  // The interface line is planted with every one of them, because it is what
  // a reader that took the FIRST `rereadRepo(` would judge instead of the
  // action, and it has no body to judge.
  const STORE_INTERFACE = 'export interface EditorState {\n  rereadRepo(repoPath: string): void;\n}\n';
  const STORE_ACTION = '  rereadRepo(repoPath) {\n    void io.refreshRepo(repoPath);\n  },\n';
  const storeSource = (action) =>
    `${STORE_INTERFACE}const actions = {\n  adoptWritten(id, contents, was) {\n    io.adoptWritten(id, contents, was);\n  },\n${action}};\n`;
  const STORE_PLANTS = [
    { name: 'the shipping shape', source: storeSource(STORE_ACTION), want: null },
    {
      name: 'the same action bound as an arrow',
      source: storeSource('  rereadRepo: (repoPath) => void io.refreshRepo(repoPath),\n'),
      want: null
    },
    {
      name: 'the action reaching nothing, so the view calls a name and no read is made',
      source: storeSource('  rereadRepo(repoPath) {\n    void repoPath;\n  },\n'),
      want: 'does not reach refreshRepo'
    },
    {
      name: 'the action deleted and the interface line left behind',
      source: storeSource(''),
      want: 'has no rereadRepo action'
    }
  ];

  let plantsOk = 0;
  let plantsTotal = 0;
  let plantsCaught = 0;
  for (const [label, plants, scan] of [
    ['view', VIEW_PLANTS, advanceFindings],
    ['landingAfterPress', LANDING_PLANTS, landingFindings],
    ['live-text', LIVE_PLANTS, liveTextFindings],
    ['store', STORE_PLANTS, rereadFindings]
  ]) {
    for (const plant of plants) {
      plantsTotal += 1;
      if (plant.want !== null) plantsCaught += 1;
      const hits = scan(plant.source);
      const ok =
        plant.want === null ? hits.length === 0 : hits.some((line) => line.includes(plant.want));
      if (ok) plantsOk += 1;
      else fail(`40. the ${label} scanner behaved wrongly on "${plant.name}": ${JSON.stringify(hits)}`);
    }
  }

  // ---- ABLATIONS OF THE SHIPPING SOURCE. ----------------------------------
  // A planted shape proves the scanner CAN fail. These prove it is anchored in
  // the bytes that really ship: each takes the real file, removes exactly one
  // clause from the COPY, and must produce that clause's own finding. An
  // ablation whose edit matched nothing fails too, because a clause that was
  // re-anchored while its ablation went on matching nothing is a clause nobody
  // is watching.
  const digestOf = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
  const digestsBefore = new Map();
  for (const file of SOURCES.keys()) digestsBefore.set(file, digestOf(file));
  const ABLATIONS = [
    {
      name: 'the identity lookup removed, so only the index is left (PR 28’s rule)',
      file: CURRENT,
      find: /  if \(move\.follower !== null\) \{[\s\S]*?\n  \}\n/,
      to: '',
      want: 'never looks for the follower by identity'
    },
    {
      name: 'the accept’s own shift removed, so a follower drawn after it is sought at the wrong offset',
      file: CURRENT,
      find: "move.verb === 'accept' && move.followerAfter ? pressed.ins.length - pressed.del.length : 0",
      to: '0',
      want: 'whatever the verb did'
    },
    {
      name: 'the wait narrowed to sameChange, which parks the move on an agent’s new change',
      file: CURRENT,
      find: 'id.off === pressed.off && id.del === pressed.del && id.ins === pressed.ins',
      to: 'sameChange(id, pressed)',
      want: 'asks sameChange rather than off, del AND ins'
    },
    {
      name: 'the one-press guard removed from the rewind, so a second chord writes again',
      file: VIEW,
      find: '\n          holds: rewindHolds.current\n        }\n      );',
      to: '\n        }\n      );',
      want: 'the rewind passes no holds'
    },
    {
      name: 'the one-press guard removed from the accept, so it can take a change mid-rewind',
      file: VIEW,
      find: '\n          holds: rewindHolds.current\n        }\n      );',
      nth: 2,
      to: '\n        }\n      );',
      want: 'the accept passes no holds'
    },
    {
      name: 'the host focus removed, so rewinding the only change strands the keyboard',
      file: VIEW,
      find: '        if (onAChange) host.focus({ preventScroll: true });\n',
      to: '',
      want: 'never gives the host the keyboard'
    },
    {
      name: 'the hold no longer landed after the adoption',
      file: VIEW,
      find: /\n *landHold\([^\n]*\);/,
      to: '',
      want: 'is never landed'
    },
    {
      name: 'the release effect stops watching savedContents',
      file: VIEW,
      find: '  }, [composed, tab.savedContents]);',
      to: '  }, [composed]);',
      want: 'does not watch savedContents'
    },
    {
      name: 'the repeat test removed, so a held ⌥⌫ rewinds every change in the file',
      file: VIEW,
      find: '          if (event.repeat && !redlineRepeatRuns(command)) return;\n',
      to: '',
      want: 'a repeated keydown runs the command'
    },
    {
      name: 'landingAfterPress swapped back for the index, which is PR 28’s move',
      file: VIEW,
      find: '    const landing = landingAfterPress(items.map(identityOf), pending);',
      to: '    const landing = indexAfterRemoval(items.length, pending.at);',
      want: 'the view bounds the index itself'
    },
    {
      name: 'PR 28’s live-text read at every render put back',
      file: LIVE,
      find: '  return modelText ?? savedContents;\n',
      to: PR28_LIVE_READ,
      want: 'reads the working model on the render path'
    },
    // PHASE 282.2. THE TWO BELOW ARE CUT AT A SPAN THE READER FINDS rather than
    // at a string, because what they remove has no spelling of its own to
    // anchor on: the effect is known by its dependencies and the hold test by
    // the holds it asks. `cleanEffectOf` reads the comment-stripped text, whose
    // offsets are the file's own, and the cut is made in the shipping bytes at
    // those offsets. An effect or a test that is no longer there returns the
    // source unchanged, which the loop below fails as an ablation that found
    // nothing to edit.
    {
      name: 'the clean transition’s effect removed, so ⌘Z back to clean pulls no read and the hold lingers',
      file: VIEW,
      edit: (source) => {
        const clean = cleanEffectOf(stripComments(source));
        return clean === null ? source : source.slice(0, clean.start) + source.slice(clean.close + 1);
      },
      want: 'no effect is keyed on [tab.dirty] alone'
    },
    {
      name: 'the landed-hold test removed, so the read is pulled on every clean transition',
      file: VIEW,
      edit: (source) => {
        const code = stripComments(source);
        const clean = cleanEffectOf(code);
        if (clean === null) return source;
        const asks = /rewindHolds\.current\.\w+\(/.exec(code.slice(clean.open, clean.close));
        if (asks === null) return source;
        const at = clean.open + asks.index;
        const close = closeOf(code, at + asks[0].length - 1);
        return close === -1 ? source : `${source.slice(0, at)}true${source.slice(close + 1)}`;
      },
      want: 'on every clean transition'
    },
    // PHASE 282.2's FIX ROUND. The two the verifiers made by hand in scratch
    // copies and found this rule had no arm for. The first is cut inside the
    // effect the reader finds, so another `if (tab.dirty) return;` elsewhere in
    // the view is never the one inverted; the second is this rule's only
    // ablation of ./store, whose scanner had fixtures and no shipping arm.
    {
      name: 'the clean transition’s flag test inverted, so the read is pulled on the way INTO dirty',
      file: VIEW,
      edit: (source) => {
        const code = stripComments(source);
        const clean = cleanEffectOf(code);
        if (clean === null) return source;
        const test = /if\s*\(\s*tab\.dirty\s*\)/.exec(code.slice(clean.open, clean.close));
        if (test === null) return source;
        const at = clean.open + test.index;
        return `${source.slice(0, at)}if (!tab.dirty)${source.slice(at + test[0].length)}`;
      },
      want: 'the wrong way round'
    },
    {
      name: 'the store’s rereadRepo reaching nothing, so the view calls a name and no read is made',
      file: STORE,
      find: /(\n\s*rereadRepo\(repoPath\) \{\n\s*)void io\.refreshRepo\(repoPath\);/,
      to: '$1void repoPath;',
      want: 'does not reach refreshRepo'
    }
  ];
  let ablationsRed = 0;
  try {
    for (const arm of ABLATIONS) {
      const source = SOURCES.get(arm.file);
      if (source === undefined) continue;
      let ablated = source;
      if (typeof arm.edit === 'function') {
        ablated = arm.edit(source);
      } else if (typeof arm.find === 'string') {
        let at = -1;
        for (let i = 0; i < (arm.nth ?? 1); i += 1) at = source.indexOf(arm.find, at + 1);
        if (at !== -1) {
          ablated = source.slice(0, at) + arm.to + source.slice(at + arm.find.length);
        }
      } else {
        ablated = source.replace(arm.find, arm.to);
      }
      if (ablated === source) {
        fail(
          `40. the ablation "${arm.name}" found nothing to edit in ${arm.file}, so it proves nothing; re-anchor it`
        );
        continue;
      }
      const hits = scanOf(arm.file)(ablated);
      if (hits.some((line) => line.includes(arm.want))) ablationsRed += 1;
      else {
        fail(
          `40. the ablation "${arm.name}" did not turn this rule red on its own clause: ${JSON.stringify(hits)}`
        );
      }
    }
  } finally {
    for (const [file, digest] of digestsBefore) {
      if (digestOf(file) !== digest) {
        fail(
          `40. ${file} changed while rule 40 ran; the ablations are made on strings in memory and this rule must never write to the tree`
        );
      }
    }
  }

  say(
    `40. the press that moves on: the follower is carried by IDENTITY and the index is only landingAfterPress's fallback, one press at a time (the holds passed to both verbs, answered with a sentence, landed after the adoption and released in a layout effect that watches savedContents), the clean transition names the re-read (an effect keyed on [tab.dirty] alone that tests a landed hold before it calls rereadRepo, which reaches refreshRepo, and adopts nothing), the host takes the keyboard BEFORE the adoption, a key repeat runs only next and prev after the preventDefault, and live-text.ts reads no working model on the render path (${String(plantsOk)} of ${String(plantsTotal)} scanner fixtures behaved, ${String(plantsCaught)} of them must fail)`
  );
  say(
    `40. ${String(ablationsRed)} of ${String(ABLATIONS.length)} ablations of the SHIPPING source turned this rule red on their own clause, made on the strings in memory with the four files' sha256 compared in a finally`
  );
}

// ---------------------------------------------------------------------------
// A KEYSTROKE BELONGS TO THE TAB IT WAS TYPED IN, rule 41 (Phase 297).
//
// Type one character in one file's Redline view, click another Redline tab,
// and the second file's buffer became the first file's whole text: the tab
// read unsaved, the page drew every word of the second file as deleted, and
// ⌘S wrote the first file's bytes over the second file with nothing asked —
// auto save, off by default, with no key at all. Phase 290's three Tier 3
// verifiers each measured it in the running app and every release from
// 0.102.0 through 0.108.0 carried it.
//
// WHY THE ORDER IS FORCED, which is what makes this a wiring rule rather than
// a taste. `EditorPanel.tsx` draws `<RedlineDocument tab={activeTab} />` with
// no `key` ON PURPOSE, and `key={activeTab.id}` is the entry's option D, which
// it REFUSES: Phase 282 made `rewindHolds`, `advanceAfterPress`, the chip and
// the scroller per-MOUNT, so keying the view would remount it at every switch
// and move five other lifetimes to fix this one. So clicking tab B re-renders
// the mount that was serving tab A, and that render carries B's `tabId` with
// A's typing state still in it. The `[tabId]` effect runs first and reseeds by
// `setState`, which is a TASK; the edit effect below it runs in the SAME
// commit, with A's state; and its continuation after `await
// ensureWorkingModel` is a MICROTASK. A microtask cannot lose to a task, so
// the departing tab's whole text reached the arriving tab's model every time,
// before React's reset render could land.
//
// THE SIX CLAUSES, all in ./redline-edits:
//
//   41a THE STATE CARRIES ITS TAB, in the `useState` and in the reseed the
//       `[tabId]` effect makes. A state with no tab id is a state the effect
//       below cannot tell from its own, and every clause under this one needs
//       the question to be answerable at all. The reseed stamps THE TAB THE
//       EFFECT IS RUNNING FOR, which is not the same question as whether a tab
//       id is mentioned: `setState({ tabId: state.tabId, … })` mentions one and
//       the one it mentions is the id the state ALREADY carried, so at a tab
//       change the arriving tab is handed a state stamped with the DEPARTING
//       tab, the return below reads `state.tabId === tabId` and passes it, and
//       the leak is back with every clause here satisfied.
//   41b THE EDIT EFFECT RETURNS ON ANOTHER TAB'S STATE, THE RIGHT WAY ROUND,
//       AND RETURNS FIRST.
//
//       THE WAY ROUND IS A CLAUSE, not a detail of one. `state.tabId === tabId`
//       where `!==` belongs is one character, it returns on the run that is
//       honestly this tab's and lets the run carrying the departing tab's text
//       through, and it satisfies every other question this rule asks — the
//       comparison is there, it is above the count, the slot is keyed. So the
//       test is read with its POLARITY: the return has to be the one taken when
//       the state belongs to ANOTHER tab.
//
//       AND IT IS READ IN THE HONEST SPELLINGS RATHER THAN IN ONE. The field
//       either way round, a negation of it, and a boolean NAMED for the question
//       — `const mine = state.tabId === tabId;` above `if (!mine) return;` is
//       the same test and the Phase 297 verifier wrote it by hand to see
//       whether this rule would call it missing. A rule that refuses an honest
//       spelling is a rule a builder works around; a rule that refuses it with
//       the words "never returns" is also saying something untrue, so the
//       refusal below names what it looked for instead.
//
//       THE PLACEMENT IS THE THIRD HALF: the return must stand ABOVE the line
//       that records `written.current`. The Phase 297 attack measured the other
//       placement leaking BYTE FOR BYTE: the seed the `[tabId]` effect stamped
//       is the departing tab's own text (./live-text holds `modelText` in state,
//       so at the switch render `liveText` is still the departing tab's model
//       value), and with `written.current` already moved, the phantom third run
//       applies that seed to the arriving tab. One line down is the mistake a
//       builder really makes, so it is an ablation of its own rather than the
//       deleted return anything would catch.
//   41c THE SLOT IS KEYED BY THE TAB THAT TYPED IT. `wanted` holds a text per
//       tab — a map, or a pair carrying the id — every write files it under
//       `tabId`, and the continuation applies only this tab's own text. Two
//       tabs can have continuations in flight at once, because both await the
//       same `loadMonaco()` promise, so one slot for the hook is one keystroke
//       taking another's.
//   41d `lastEdit` IS RESET AT A TAB CHANGE, or the arriving tab's first
//       keystroke folds into the departing tab's undo step, which a timer and
//       a caret left behind by the other tab are enough to do.
//   41e AND THE `[tabId]` EFFECT NEVER EMPTIES THE WHOLE SLOT. The attack's
//       second finding: with the slot blanked, a first keystroke whose real
//       chunk load is still in flight when the person clicks away finds
//       nothing to apply, the character is DROPPED, and the provisional dirty
//       mark Phase 282 makes before the await is never withdrawn on that path,
//       so the tab reads unsaved with nothing unsaved. Today that character
//       survives only because the leaking run re-fills the slot one line
//       later, so the fix must take the line out rather than leave it.
//       Dropping the ARRIVING tab's own entry is allowed and is read as such.
//   41f AND IT RESETS THE COUNT. `written.current = 0` is in the shipping
//       `[tabId]` effect and its own comment there says it is load bearing:
//       without it the reset render — this hook's own `state.typing.edits` back
//       at 0 against the departing tab's count — reads as a keystroke nobody
//       typed, and the edit effect writes the SEED into the arriving tab's
//       buffer, which is the write the app verifiers actually read. Until this
//       round nothing here asked for it, so a builder who took the line out
//       while tidying the effect would have left this rule green and the phantom
//       third run would be back. It is asked in the same effect as 41d and 41e
//       because it is the same reset.
//
// IT IS A SCAN FOR THE REASON RULE 40 IS ONE, and for one more that is this
// defect's own: under `act` an update scheduled from a passive effect is
// flushed inside the act loop BEFORE the continuation's microtask, so a unit
// case that wraps the tab switch in `act` observes an order the app has never
// had and passes at the parent — which is why no test saw this for seven
// releases. The order is reproduced in ./__tests__ by driving the switch
// outside `act`; this rule pins the wiring, which is the half a later round
// would drop.
//
// ONE SCANNER, proved on planted hooks written here in BOTH shapes the fix may
// take (a map keyed by tab, and a pair carrying the id) and in BOTH honest
// spellings of the return (the comparison, and a boolean named for it), one
// plant per clause that must fail — the return written the wrong way round
// among them — and then on ABLATIONS OF THE SHIPPING SOURCE. The ablations
// are made on the string in memory and never on the tree, for rule 40's
// reason: this gate runs in the commit battery, and a rule that edited his own
// source and crashed between the edit and the restore would leave him an
// ablated file. The file's sha256 is compared in a `finally`.
//
// Rule 9's derived set already covers ./redline-edits and this phase adds no
// file, so REDLINE_FILES_FLOOR is unchanged at 23.
// ---------------------------------------------------------------------------
{
  const EDITS = 'src/renderer/editor/redline-edits.ts';

  /**
   * Every `useEffect`/`useLayoutEffect` call in `code`, with the offset its
   * body opens at, its body as text and its dependency array as text.
   *
   * Read by MATCHING PARENTHESES, so one effect's references are never
   * mistaken for another's, and the dependency array is the LAST argument
   * rather than a search for a bracket: the two effects this rule reads are
   * both found by what they ARE — one by its dependencies, one by the loader
   * it awaits — because neither has a name.
   */
  const effectsOf = (code) => {
    const out = [];
    const opener = /\buse(?:Layout)?Effect\(/g;
    let m;
    while ((m = opener.exec(code)) !== null) {
      const open = m.index + m[0].length - 1;
      const close = closeOf(code, open);
      if (close === -1) continue;
      const args = callArguments(code, open);
      const deps = args.length === 0 ? null : args[args.length - 1].trim();
      const arrow = code.indexOf('=>', open);
      const brace = arrow === -1 || arrow > close ? -1 : code.indexOf('{', arrow);
      const body = brace === -1 || brace > close ? null : blockAt(code, brace);
      out.push({ start: m.index, close, deps, body, bodyAt: brace + 1 });
      opener.lastIndex = close;
    }
    return out;
  };

  /** Every call of `name` in `text`, with the span of its arguments. */
  const callsNaming = (text, name) => {
    const out = [];
    const finder = new RegExp(`\\b${name}\\s*(?:<[^<>()]*>)?\\(`, 'g');
    let m;
    while ((m = finder.exec(text)) !== null) {
      const open = m.index + m[0].length - 1;
      const close = closeOf(text, open);
      if (close === -1) continue;
      out.push({ at: m.index, open, close, text: text.slice(open + 1, close) });
      finder.lastIndex = close;
    }
    return out;
  };

  /** The statement in `text` that holds the offset `at`, up to its own `;`. */
  const statementAt = (text, at) => {
    const from = text.lastIndexOf('\n', at) + 1;
    const end = text.indexOf(';', at);
    return end === -1 ? text.slice(from) : text.slice(from, end + 1);
  };

  /**
   * The comparison in `condition` that asks whether the state in hand was
   * typed on the tab this render carries, as `{ text, index }`, or null.
   *
   * `state.tabId !== tabId` is the plain spelling and the first two forms read
   * it in either order. A hook that destructured the field first is read too,
   * by asking whether the bare name on the other side of the comparison was
   * bound FROM a `.tabId` anywhere in the file — so the builder's own local
   * name cannot make this rule read nothing, while `path !== tabId` still
   * cannot pass for it. The MATCH rather than a yes is handed back because the
   * ablation that neutralises the comparison cuts exactly this span.
   */
  const tabComparisonIn = (condition, code) => {
    for (const form of [
      /[A-Za-z_$][\w$.]*\.tabId\s*[!=]==?\s*tabId\b/,
      /\btabId\s*[!=]==?\s*[A-Za-z_$][\w$.]*\.tabId\b/
    ]) {
      const m = form.exec(condition);
      if (m !== null) return { text: m[0], index: m.index };
    }
    const bare = /\b([A-Za-z_$][\w$]*)\s*[!=]==?\s*tabId\b|\btabId\s*[!=]==?\s*([A-Za-z_$][\w$]*)\b/g;
    let m;
    while ((m = bare.exec(condition)) !== null) {
      const name = m[1] ?? m[2];
      if (name === undefined || name === 'tabId') continue;
      const bound = new RegExp(
        `tabId\\s*:\\s*${name}\\b|\\b${name}\\s*=\\s*[A-Za-z_$][\\w$.]*\\.tabId\\b`
      );
      if (bound.test(code)) return { text: m[0], index: m.index };
    }
    return null;
  };

  /**
   * The same comparison as `tabComparisonIn`, WITH WHICH WAY ROUND IT READS:
   * `{ text, index, other }`, where `other` is true when the comparison is TRUE
   * for a state typed on ANOTHER tab, or null when there is none.
   *
   * The spellings are the three above; the difference is that the OPERATOR is
   * captured rather than lumped into `[!=]==?`. This phase's own defect written
   * the wrong way round is one character — `===` where `!==` belongs — and it
   * satisfies every other question this rule asks while returning on the run
   * that is honestly this tab's and letting the departing tab's text through.
   */
  const tabComparisonWayRound = (text, code) => {
    for (const form of [
      /[A-Za-z_$][\w$.]*\.tabId\s*(!==?|===?)\s*tabId\b/,
      /\btabId\s*(!==?|===?)\s*[A-Za-z_$][\w$.]*\.tabId\b/
    ]) {
      const m = form.exec(text);
      if (m !== null) return { text: m[0], index: m.index, other: m[1].startsWith('!') };
    }
    const bare =
      /\b([A-Za-z_$][\w$]*)\s*(!==?|===?)\s*tabId\b|\btabId\s*(!==?|===?)\s*([A-Za-z_$][\w$]*)\b/g;
    let m;
    while ((m = bare.exec(text)) !== null) {
      const name = m[1] ?? m[4];
      const op = m[2] ?? m[3];
      if (name === undefined || op === undefined || name === 'tabId') continue;
      const bound = new RegExp(
        `tabId\\s*:\\s*${name}\\b|\\b${name}\\s*=\\s*[A-Za-z_$][\\w$.]*\\.tabId\\b`
      );
      if (bound.test(code)) return { text: m[0], index: m.index, other: op.startsWith('!') };
    }
    return null;
  };

  /**
   * The expression inside `condition` whose truth answers "was the state in
   * hand typed on another tab", as `{ text, index, other }` — `other` being
   * that expression's own reading — or null when the condition holds no such
   * test.
   *
   * The comparison is read first. A BOOLEAN NAMED FOR THE QUESTION is read
   * second, because `const mine = state.tabId === tabId;` above an
   * `if (!mine) return;` is the same test honestly spelled and the Phase 297
   * verifier wrote it by hand to see whether this rule would report the guard
   * missing. The name is resolved to its declaration anywhere in the file and
   * accepted only when what it was bound FROM is itself a comparison of the two
   * tabs, so a boolean bound from anything else — `editable`, `had`, `live` —
   * is not this test and cannot stand in for it.
   */
  const tabTestIn = (condition, code) => {
    const comparison = tabComparisonWayRound(condition, code);
    if (comparison !== null) return comparison;
    const names = /\b([A-Za-z_$][\w$]*)\b/g;
    let m;
    while ((m = names.exec(condition)) !== null) {
      const name = m[1];
      if (name === 'tabId') continue;
      const decl = new RegExp(`\\b(?:const|let|var)\\s+${name}\\s*(?::[^=;\\n]*)?=\\s*([^;\\n]+)`);
      const bound = decl.exec(code);
      if (bound === null) continue;
      const from = tabComparisonWayRound(bound[1], code);
      if (from === null) continue;
      return { text: name, index: m.index, other: from.other };
    }
    return null;
  };

  /**
   * How many `!` stand between the start of a condition and the test inside it,
   * or null when anything else does.
   *
   * Only `(`, whitespace and `!` are read, so the plain comparison,
   * `if (!mine)` and `if (!(state.tabId === tabId))` are all answered. A
   * COMPOUND condition is answered by null rather than by a guess: a test
   * sitting in an `&&` chain is not taken on every foreign state, so this rule
   * says it cannot read the return — and names what it looked for — instead of
   * reading half of one.
   */
  const negationsBefore = (pre) => {
    let bangs = 0;
    for (const ch of pre) {
      if (ch === '!') bangs += 1;
      else if (ch === '(' || /\s/.test(ch)) continue;
      else return null;
    }
    return bangs;
  };

  /** Whether nothing but the condition's own closing parentheses follow the test. */
  const nothingAfter = (post) => /^[\s)]*$/.test(post);

  /**
   * The return the edit effect takes because the state belongs to another tab:
   * `{ at, open, close, test, other }` — the offset of that `if` in `body`, the
   * span of its condition, the test inside it, and WHICH WAY ROUND the return
   * is taken — or null when no `if` in the body is a readable test of the two
   * tabs whose consequent returns.
   *
   * Every `if` is read by matching parentheses and asked three questions in
   * this order — does its condition test the two tabs, is that test the whole
   * of the condition, and does its consequent RETURN. The third is not a
   * formality: Phase 282.1 measured a gate reading mention order alone stay
   * green on `if (…) void 0;`, so a test that is present but answers nothing is
   * not a test.
   *
   * An honest guard is answered the moment it is found. A guard written the
   * WRONG WAY ROUND is remembered and answered only when no honest one follows,
   * because "there is no return this rule can read" and "the return is taken on
   * the wrong answer" are different findings and the caller says them in
   * different words.
   */
  const tabGuardIn = (body, code) => {
    const ifs = /\bif\s*\(/g;
    let inverted = null;
    let m;
    while ((m = ifs.exec(body)) !== null) {
      const open = body.indexOf('(', m.index);
      const close = open === -1 ? -1 : closeOf(body, open);
      if (close === -1) continue;
      const condition = body.slice(open, close + 1);
      const test = tabTestIn(condition, code);
      if (test === null) continue;
      const flips = negationsBefore(condition.slice(0, test.index));
      if (flips === null) continue;
      if (!nothingAfter(condition.slice(test.index + test.text.length))) continue;
      const rest = body.slice(close + 1);
      const braced = /^\s*\{/.exec(rest);
      const returns =
        braced === null
          ? /^\s*return\b/.test(rest)
          : (blockAt(body, close + braced[0].length) ?? '').includes('return');
      if (!returns) continue;
      const found = {
        at: m.index,
        open,
        close,
        test,
        other: flips % 2 === 0 ? test.other : !test.other
      };
      if (found.other) return found;
      if (inverted === null) inverted = found;
    }
    return inverted;
  };

  /**
   * Where `text` names the tab a reseed is FOR, as `{ text, index }`, or null.
   *
   * `tabId` has to appear as a VALUE: not as the property key `tabId:`, and not
   * as a field of something else. `{ tabId: state.tabId, … }` answers any
   * `\btabId\b` question with a yes, and the id it names is the one the state
   * ALREADY carried — at a tab change, the departing tab's — so the arriving
   * tab is handed a state stamped with the tab it came from and the return in
   * the edit effect passes it. The MATCH is handed back because the ablation
   * that stamps the state's own id cuts exactly this span.
   */
  const tabStampIn = (text) => {
    const finder = /\btabId\b/g;
    let m;
    while ((m = finder.exec(text)) !== null) {
      if (/[.?]\s*$/.test(text.slice(0, m.index))) continue;
      if (/^\s*:/.test(text.slice(m.index + m[0].length))) continue;
      return { text: m[0], index: m.index };
    }
    return null;
  };

  /** Every offset in `text` where `wanted.current` is WRITTEN, not read. */
  const wantedWritesIn = (text) => {
    const out = [];
    const finder =
      /wanted\.current\s*(?:=[^=]|\.\s*(?:set|clear|delete)\s*\(|\[[^\]]*\]\s*=[^=])/g;
    let m;
    while ((m = finder.exec(text)) !== null) out.push(m.index);
    return out;
  };

  /** Where the keystroke is recorded, which the return above must beat. */
  const WRITTEN_WRITE = /written\.current\s*=[^=]/;
  /** The reset of that count which the tab change has to make (clause 41f). */
  const WRITTEN_RESET = /written\.current\s*=\s*0\s*;/;
  /** A read of the slot that names the tab it is asking for. */
  const KEYED_READ = /wanted\.current\s*(?:\.\s*get\s*\(|\[)\s*tabId\b/;

  /**
   * The parts of the hook both the clauses and the ablations need, with
   * ABSOLUTE offsets into the comment-stripped text — which are the file's own
   * offsets, because `stripComments` blanks character for character, so an
   * ablation can cut the shipping bytes at a span found here.
   *
   * The typing state is found by the SEED it takes rather than by its name,
   * with the setter the `[tabId]` effect calls as the second way in, because
   * the names are the builder's and a hook that seeds through a helper of its
   * own would otherwise make this rule read nothing.
   */
  const piecesOf = (code) => {
    const effects = effectsOf(code);
    const tabEffect = effects.find((e) => e.deps === '[tabId]') ?? null;
    const edit =
      effects.find((e) => e.body !== null && e.body.includes('ensureWorkingModel(')) ?? null;
    const decls = [];
    const finder =
      /const\s*\[\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*\]\s*=\s*useState\s*(?:<[^<>()]*>)?\(/g;
    let m;
    while ((m = finder.exec(code)) !== null) {
      const open = m.index + m[0].length - 1;
      const close = closeOf(code, open);
      if (close === -1) continue;
      decls.push({
        getter: m[1],
        setter: m[2],
        open,
        close,
        arg: code.slice(open + 1, close)
      });
      finder.lastIndex = close;
    }
    let typing = decls.find((d) => d.arg.includes('initialTyping(')) ?? null;
    if (typing === null && tabEffect !== null && tabEffect.body !== null) {
      typing = decls.find((d) => tabEffect.body.includes(`${d.setter}(`)) ?? null;
    }
    const slot = /const\s+wanted\s*=\s*useRef[^;]*;/.exec(code);
    return {
      tabEffect,
      edit,
      typing,
      slot: slot === null ? null : { at: slot.index, text: slot[0] }
    };
  };

  /** What is wrong with the hook, or an empty list. One line per clause. */
  const keystrokeFindings = (source) => {
    const code = stripComments(source);
    const { tabEffect, edit, typing, slot } = piecesOf(code);
    const out = [];
    if (tabEffect === null || tabEffect.body === null) {
      out.push(
        'there is no effect keyed on [tabId] alone, so nothing reseeds this hook when the person clicks another tab and clauses 41a, 41d and 41e read nothing'
      );
    }
    if (edit === null || edit.body === null) {
      out.push(
        'no effect in this hook awaits ensureWorkingModel, so the path that writes a keystroke into a tab’s buffer is not where this rule reads it'
      );
      return out;
    }
    const body = edit.body;

    // 41a. THE STATE CARRIES ITS TAB, declared and reseeded.
    if (typing === null) {
      out.push(
        'nothing in this hook holds the typing state in a useState this rule could read, so 41a read nothing'
      );
    } else if (!/\btabId\b/.test(typing.arg)) {
      out.push(
        'the typing state is declared with no tab id, so the edit effect cannot tell a state typed on the departing tab from one typed on this one'
      );
    }
    if (typing !== null && tabEffect !== null && tabEffect.body !== null) {
      const reseed = callsNaming(tabEffect.body, typing.setter)[0] ?? null;
      if (reseed === null) {
        out.push(
          `the [tabId] effect never calls ${typing.setter}, so the arriving tab goes on holding the departing tab’s typing state`
        );
      } else if (!/\btabId\b/.test(reseed.text)) {
        out.push(
          'the reseed at a tab change carries no tab id, so the state the arriving tab starts with belongs to nobody and the guard below cannot refuse it'
        );
      } else if (tabStampIn(reseed.text) === null) {
        out.push(
          'the reseed at a tab change stamps the tab id the state already carried rather than the tab this effect is running FOR, so the arriving tab is handed a state that still belongs to the departing tab, the return in the edit effect reads it as its own, and the departing tab’s text goes through with every other clause satisfied'
        );
      }
    }

    // 41b. THE RETURN, THE RIGHT WAY ROUND, AND ABOVE THE LINE THAT RECORDS
    // THE KEYSTROKE. The refusal SAYS WHAT WAS LOOKED FOR rather than what is
    // missing: an earlier draft answered the honest `const mine = …; if (!mine)
    // return;` spelling with "never returns on another tab's state", which is
    // both a refusal of a correct fix and a sentence that is not true of it.
    const guard = tabGuardIn(body, code);
    if (guard === null) {
      out.push(
        'the edit effect has no return this rule can read for a typing state typed on another tab: it looked for an if of its own whose whole condition is state.tabId against tabId — either order, a negation of it, or a boolean bound from it — and whose consequent returns, so as it stands clicking another Redline tab files the departing tab’s whole text in wanted and the continuation applies it to the arriving tab’s model'
      );
    } else {
      if (!guard.other) {
        out.push(
          'the edit effect’s return is taken when the typing state belongs to THIS tab, which is the test the wrong way round: the run that has to return is the one carrying ANOTHER tab’s state, and as written every keystroke this tab really typed returns before it is written while the departing tab’s text goes on to the arriving tab’s model'
        );
      }
      const written = WRITTEN_WRITE.exec(body);
      const filed = wantedWritesIn(body);
      const recorded = [written === null ? -1 : written.index, filed[0] ?? -1].filter(
        (n) => n !== -1
      );
      if (recorded.length > 0 && guard.at > Math.min(...recorded)) {
        out.push(
          'the edit effect records the keystroke before it returns on another tab’s state, so the seed the [tabId] effect stamped — which is the departing tab’s own text — is applied to the arriving tab anyway'
        );
      }
    }

    // 41c. THE SLOT IS KEYED BY THE TAB THAT TYPED IT, written and read.
    if (slot === null) {
      out.push('this hook holds no wanted ref, so 41c read nothing');
    } else if (!/\btabId\b|\bMap\s*[<(]/.test(slot.text)) {
      out.push(
        'the wanted slot holds one text for every tab, so a continuation cannot tell whose keystroke it is holding and two tabs in flight at once take each other’s'
      );
    }
    for (const at of wantedWritesIn(body)) {
      if (!/\btabId\b/.test(statementAt(body, at))) {
        out.push(
          'the edit effect writes the wanted slot without naming a tab, so the text it holds belongs to whichever tab’s continuation reads it next'
        );
      }
    }
    const asyncAt = body.indexOf('void (async');
    const tail = asyncAt === -1 ? body : body.slice(asyncAt);
    const applyAt = tail.indexOf('applyModelText(');
    if (applyAt === -1) {
      out.push('the edit effect applies no text to a model at all, so 41c read nothing');
    } else {
      const region = tail.slice(0, applyAt);
      if (!KEYED_READ.test(region) && tabComparisonIn(region, code) === null) {
        out.push(
          'the continuation applies whatever the slot holds without asking which tab typed it, so a text typed in one tab still reaches another tab’s buffer'
        );
      }
    }

    // 41d, 41e AND 41f. THE TAB CHANGE RESETS THE UNDO RUN AND THE COUNT, AND
    // EMPTIES NO SLOT.
    if (tabEffect !== null && tabEffect.body !== null) {
      if (!/lastEdit\.current\s*=/.test(tabEffect.body)) {
        out.push(
          'the [tabId] effect leaves lastEdit where the departing tab left it, so the arriving tab’s first keystroke can be folded into another tab’s undo step'
        );
      }
      if (!WRITTEN_RESET.test(tabEffect.body)) {
        out.push(
          'the [tabId] effect leaves written.current at the departing tab’s count, so the reset render — this hook’s own edits back at 0 against that count — reads as a keystroke nobody typed and the edit effect writes the seed, which is the departing tab’s own text, into the arriving tab’s buffer'
        );
      }
      for (const at of wantedWritesIn(tabEffect.body)) {
        const stmt = statementAt(tabEffect.body, at);
        if (/wanted\.current\s*\.\s*delete\s*\(\s*tabId\b/.test(stmt)) continue;
        out.push(
          'the [tabId] effect empties the whole wanted slot, so a first keystroke whose chunk load is still in flight when the person clicks away is dropped and the provisional dirty mark stands on nothing'
        );
      }
    }
    return out;
  };

  // ---- The shipping source, read once and judged. ---------------------------
  let shipping = null;
  if (!existsSync(EDITS)) fail(`41. ${EDITS} is not there, so rule 41 proves nothing`);
  else {
    shipping = readFileSync(EDITS, 'utf8');
    for (const line of keystrokeFindings(shipping)) fail(`41. ${EDITS}: ${line}`);
  }

  // ---- The scanner, proved on planted hooks, one clause each. ---------------
  // Written here rather than copied out of the tree: a fixture taken from the
  // source cannot prove a scanner reads the source. Both shapes the fix may
  // take are planted honest, because the rule must pass either.
  const hook = (o) => {
    const seed =
      o.declTab === false
        ? '() => initialTyping(liveText)'
        : '() => ({ tabId, typing: initialTyping(liveText) })';
    const reseed =
      o.resetTab === false
        ? 'initialTyping(liveText)'
        : o.resetTab === 'stale'
          ? '{ tabId: state.tabId, typing: initialTyping(liveText) }'
          : '{ tabId, typing: initialTyping(liveText) }';
    const slot =
      o.slot === 'plain'
        ? 'const wanted = useRef<string | null>(null);'
        : o.slot === 'pair'
          ? 'const wanted = useRef<{ tabId: string; text: string } | null>(null);'
          : 'const wanted = useRef<Map<string, string>>(new Map());';
    const write =
      o.write === 'plain'
        ? 'wanted.current = state.typing.text;'
        : o.slot === 'pair'
          ? 'wanted.current = { tabId, text: state.typing.text };'
          : 'wanted.current.set(tabId, state.typing.text);';
    const read =
      o.read === 'any'
        ? 'const want = wanted.current.values().next().value ?? null;'
        : o.slot === 'pair'
          ? 'const held = wanted.current;\n      if (held !== null && held.tabId !== tabId) return;\n      const want = held === null ? null : held.text;'
          : 'const want = wanted.current.get(tabId) ?? null;';
    // BOTH HONEST SPELLINGS OF THE RETURN, AND THE ONE THAT IS NOT. `boolean`
    // is the shape the Phase 297 verifier wrote by hand — the same test, named
    // — and it has to pass; `inverted` is one character from the shipping line
    // and must not, because it returns on the tab that DID type the state.
    const guardLines =
      o.guard === 'none'
        ? []
        : o.guard === 'inverted'
          ? ['    if (state.tabId === tabId) return;']
          : o.guard === 'boolean'
            ? ['    const mine = state.tabId === tabId;', '    if (!mine) return;']
            : ['    if (state.tabId !== tabId) return;'];
    return [
      'export function useRedlineTyping(args: { tab: EditorTab; liveText: string }): RedlineTyping {',
      `  const [state, setState] = useState(${seed});`,
      '  const written = useRef(0);',
      `  ${slot}`,
      '  const lastEdit = useRef<{ at: number; when: number } | null>(null);',
      '',
      '  useEffect(() => {',
      '    lastLive.current = liveText;',
      ...(o.writtenReset === false ? [] : ['    written.current = 0;']),
      ...(o.blank === true ? ['    wanted.current = null;'] : []),
      ...(o.dropOwn === true ? ['    wanted.current.delete(tabId);'] : []),
      ...(o.lastEditReset === false ? [] : ['    lastEdit.current = null;']),
      `    setState(${reseed});`,
      `  }, ${o.deps ?? '[tabId]'});`,
      '',
      '  useEffect(() => {',
      ...(o.guard === 'late' ? [] : guardLines),
      '    if (!editable || state.typing.edits === written.current) return;',
      '    written.current = state.typing.edits;',
      ...(o.guard === 'late' ? guardLines : []),
      `    ${write}`,
      '    void (async () => {',
      '      const model = await ensureWorkingModel(tabId, () => saved, path);',
      '      if (model === null) return;',
      `      ${read}`,
      '      if (want === null) return;',
      '      applyModelText(model, want, true);',
      '    })();',
      '  }, [editable, state.typing.edits, state.typing.text, tabId, path]);',
      '}',
      ''
    ].join('\n');
  };
  const PLANTS = [
    { name: 'the map shape, all five clauses honest', o: {}, want: null },
    {
      name: 'the pair shape, the continuation comparing the id it filed',
      o: { slot: 'pair' },
      want: null
    },
    {
      name: 'the arriving tab’s own entry dropped at the tab change, which is allowed',
      o: { dropOwn: true },
      want: null
    },
    {
      name: 'the state declared with no tab id',
      o: { declTab: false },
      want: 'declared with no tab id'
    },
    {
      name: 'the reseed carrying no tab id',
      o: { resetTab: false },
      want: 'reseed at a tab change carries no tab id'
    },
    {
      name: 'the reseed stamped with the id the state already carried',
      o: { resetTab: 'stale' },
      want: 'stamps the tab id the state already carried'
    },
    {
      name: 'the return deleted, which is the parent',
      o: { guard: 'none' },
      want: 'no return this rule can read'
    },
    {
      // THE HONEST SPELLING THE VERIFIER WROTE BY HAND. It must pass, and an
      // earlier draft refused it with the words "never returns", which was a
      // refusal of a correct fix and a sentence untrue of it.
      name: 'the tab test named as a boolean, which is the same test',
      o: { guard: 'boolean' },
      want: null
    },
    {
      name: 'the tab test written the wrong way round',
      o: { guard: 'inverted' },
      want: 'is taken when the typing state belongs to THIS tab'
    },
    {
      name: 'the return one line below written.current, the attack’s cLate shape',
      o: { guard: 'late' },
      want: 'records the keystroke before it returns'
    },
    {
      name: 'the parent’s own slot, write and read',
      o: { slot: 'plain', write: 'plain', read: 'any' },
      want: 'holds one text for every tab'
    },
    {
      name: 'the typed text filed under no tab',
      o: { write: 'plain' },
      want: 'writes the wanted slot without naming a tab'
    },
    {
      name: 'the continuation applying whatever the slot holds',
      o: { read: 'any' },
      want: 'without asking which tab typed it'
    },
    {
      name: 'the lastEdit reset removed',
      o: { lastEditReset: false },
      want: 'leaves lastEdit where the departing tab left it'
    },
    {
      name: 'the written.current reset removed from the [tabId] effect',
      o: { writtenReset: false },
      want: 'leaves written.current at the departing tab'
    },
    {
      name: 'the blanket drop put back',
      o: { blank: true },
      want: 'empties the whole wanted slot'
    },
    {
      // THE RESET IS FOUND BY ITS DEPENDENCIES, which are the ruling: an
      // effect that also watches `liveText` runs on an outside write too, so
      // it is a different effect and must never be judged in the reset's
      // place.
      name: 'the reset effect watching liveText too, so it is not the reset',
      o: { deps: '[tabId, liveText]' },
      want: 'there is no effect keyed on [tabId] alone'
    }
  ];
  let plantsOk = 0;
  let plantsCaught = 0;
  for (const plant of PLANTS) {
    if (plant.want !== null) plantsCaught += 1;
    const hits = keystrokeFindings(hook(plant.o));
    const ok =
      plant.want === null ? hits.length === 0 : hits.some((line) => line.includes(plant.want));
    if (ok) plantsOk += 1;
    else fail(`41. the scanner behaved wrongly on "${plant.name}": ${JSON.stringify(hits)}`);
  }

  // ---- ABLATIONS OF THE SHIPPING SOURCE. -----------------------------------
  // A planted hook proves the scanner CAN fail. These prove it is anchored in
  // the bytes that really ship: each takes the real file, removes or moves
  // exactly one clause in the COPY, and must produce that clause's own
  // finding. Every one is cut at a span the readers above FIND rather than at
  // a string, because a fix whose spelling this file guessed would be a rule
  // pinned to the guess. An ablation whose edit matched nothing fails too: a
  // clause that was re-anchored while its ablation went on matching nothing is
  // a clause nobody is watching.
  const digestBefore =
    shipping === null ? null : createHash('sha256').update(readFileSync(EDITS)).digest('hex');
  const lineStart = (text, at) => text.lastIndexOf('\n', at) + 1;
  /**
   * `source` with the operator of the comparison `cmp` — found in a region that
   * begins at `base` in the source — turned the other way round, or null when
   * `cmp` is a name rather than a comparison. `!==` becomes `===` and `===`
   * becomes `!==`, so the edit is one character either way and the polarity is
   * reversed whichever spelling ships.
   */
  const flipOperator = (source, base, cmp) => {
    const op = /!==?|===?/.exec(cmp.text);
    if (op === null) return null;
    const at = base + cmp.index + op.index;
    const to = op[0].startsWith('!')
      ? '='.repeat(op[0].length)
      : `!${'='.repeat(op[0].length - 1)}`;
    return `${source.slice(0, at)}${to}${source.slice(at + op[0].length)}`;
  };
  const ABLATIONS = [
    {
      name: 'the tab id taken out of the typing state’s declaration',
      edit: (source) => {
        const { typing } = piecesOf(stripComments(source));
        if (typing === null) return source;
        const to = '() => initialTyping(liveText)';
        return `${source.slice(0, typing.open + 1)}${to}${source.slice(typing.close)}`;
      },
      want: 'declared with no tab id'
    },
    {
      name: 'the tab id taken out of the reseed the [tabId] effect makes',
      edit: (source) => {
        const code = stripComments(source);
        const { tabEffect, typing } = piecesOf(code);
        if (tabEffect === null || tabEffect.body === null || typing === null) return source;
        const call = callsNaming(tabEffect.body, typing.setter)[0];
        if (call === undefined) return source;
        const open = tabEffect.bodyAt + call.open;
        const close = tabEffect.bodyAt + call.close;
        return `${source.slice(0, open + 1)}initialTyping(liveText)${source.slice(close)}`;
      },
      want: 'reseed at a tab change carries no tab id'
    },
    {
      // THE STAMP THAT IS A TAB ID AND IS THE WRONG ONE. Cut at the span the
      // clause itself found, so the edit is the shorthand turned into the
      // state's own field and nothing else moves: `{ tabId, … }` becomes
      // `{ tabId: state.tabId, … }`, which is the departing tab at a tab change.
      name: 'the reseed stamped with the id the state already carried, not the tab the effect runs for',
      edit: (source) => {
        const code = stripComments(source);
        const { tabEffect, typing } = piecesOf(code);
        if (tabEffect === null || tabEffect.body === null || typing === null) return source;
        const call = callsNaming(tabEffect.body, typing.setter)[0];
        if (call === undefined) return source;
        const stamp = tabStampIn(call.text);
        if (stamp === null) return source;
        const at = tabEffect.bodyAt + call.open + 1 + stamp.index;
        const to = `tabId: ${typing.getter}.tabId`;
        return `${source.slice(0, at)}${to}${source.slice(at + stamp.text.length)}`;
      },
      want: 'stamps the tab id the state already carried'
    },
    {
      name: 'the return on another tab’s state neutralised, which is the parent',
      edit: (source) => {
        const code = stripComments(source);
        const { edit } = piecesOf(code);
        if (edit === null || edit.body === null) return source;
        const guard = tabGuardIn(edit.body, code);
        if (guard === null) return source;
        const at = edit.bodyAt + guard.open + guard.test.index;
        return `${source.slice(0, at)}false${source.slice(at + guard.test.text.length)}`;
      },
      want: 'no return this rule can read'
    },
    {
      // THE ONE-CHARACTER SHAPE: the same comparison, the other way round. It
      // returns on the run that is honestly this tab's and lets the run
      // carrying the departing tab's state through, and every other question
      // this rule asks is satisfied by it.
      name: 'THE TEST THE WRONG WAY ROUND: the guard’s operator flipped, one character',
      edit: (source) => {
        const code = stripComments(source);
        const { edit } = piecesOf(code);
        if (edit === null || edit.body === null) return source;
        const guard = tabGuardIn(edit.body, code);
        if (guard === null || !guard.other) return source;
        const inPlace = flipOperator(source, edit.bodyAt + guard.open, guard.test);
        if (inPlace !== null) return inPlace;
        // The guard names a boolean, so the operator to turn round is in the
        // declaration it was bound from.
        const decl = new RegExp(
          `\\b(?:const|let|var)\\s+${guard.test.text}\\s*(?::[^=;\\n]*)?=\\s*([^;\\n]+)`
        ).exec(code);
        if (decl === null) return source;
        const bound = tabComparisonWayRound(decl[1], code);
        if (bound === null) return source;
        return flipOperator(source, decl.index + decl[0].lastIndexOf(decl[1]), bound) ?? source;
      },
      want: 'is taken when the typing state belongs to THIS tab'
    },
    {
      // THE HONEST SPELLING, AND THEN THE WRONG ANSWER TAKEN FROM IT. Naming
      // the test is a fix this rule must accept, so the ablation proves the
      // acceptance is not a blanket one: through the boolean the polarity is
      // still read, and the return taken when the state IS this tab's is still
      // refused.
      name: 'THE TEST NAMED AS A BOOLEAN AND READ THE WRONG WAY ROUND',
      edit: (source) => {
        const code = stripComments(source);
        const { edit } = piecesOf(code);
        if (edit === null || edit.body === null) return source;
        const guard = tabGuardIn(edit.body, code);
        if (guard === null || !guard.other) return source;
        if (/^\s*\{/.test(edit.body.slice(guard.close + 1))) return source;
        const semi = edit.body.indexOf(';', guard.close);
        if (semi === -1) return source;
        const from = lineStart(edit.body, guard.at);
        const indent = ' '.repeat(guard.at - from);
        const named = `${indent}const mine = ${guard.test.text};\n${indent}if (${
          guard.test.other ? '!' : ''
        }mine) return;`;
        return source.slice(0, edit.bodyAt + from) + named + source.slice(edit.bodyAt + semi + 1);
      },
      want: 'is taken when the typing state belongs to THIS tab'
    },
    {
      name: 'THE ATTACK’S cLate SHAPE: the return moved one line below written.current',
      edit: (source) => {
        const code = stripComments(source);
        const { edit } = piecesOf(code);
        if (edit === null || edit.body === null) return source;
        const guard = tabGuardIn(edit.body, code);
        const write = WRITTEN_WRITE.exec(edit.body);
        if (guard === null || write === null || write.index < guard.at) return source;
        const from = lineStart(edit.body, write.index);
        const semi = edit.body.indexOf(';', write.index);
        if (semi === -1) return source;
        const to = semi + 2 > edit.body.length ? semi + 1 : semi + 2;
        const statement = edit.body.slice(from, to);
        const above = edit.bodyAt + lineStart(edit.body, guard.at);
        return (
          source.slice(0, above) +
          statement +
          source.slice(above, edit.bodyAt + from) +
          source.slice(edit.bodyAt + to)
        );
      },
      want: 'records the keystroke before it returns'
    },
    {
      name: 'the slot unkeyed, back to one text for the whole hook',
      edit: (source) => {
        const { slot } = piecesOf(stripComments(source));
        if (slot === null) return source;
        const to = 'const wanted = useRef<string | null>(null);';
        if (slot.text === to) return source;
        return source.slice(0, slot.at) + to + source.slice(slot.at + slot.text.length);
      },
      want: 'holds one text for every tab'
    },
    {
      name: 'the typed text filed under no tab, which is the parent’s own line',
      edit: (source) => {
        const code = stripComments(source);
        const { edit } = piecesOf(code);
        if (edit === null || edit.body === null) return source;
        const at = wantedWritesIn(edit.body)[0];
        if (at === undefined) return source;
        const semi = edit.body.indexOf(';', at);
        if (semi === -1) return source;
        const from = edit.bodyAt + at;
        const to = edit.bodyAt + semi + 1;
        const parent = 'wanted.current = state.text;';
        if (source.slice(from, to) === parent) return source;
        return source.slice(0, from) + parent + source.slice(to);
      },
      want: 'writes the wanted slot without naming a tab'
    },
    {
      name: 'the continuation’s key dropped, so it applies whatever the slot holds',
      edit: (source) => {
        const code = stripComments(source);
        const { edit } = piecesOf(code);
        if (edit === null || edit.body === null) return source;
        const asyncAt = edit.body.indexOf('void (async');
        const base = edit.bodyAt + (asyncAt === -1 ? 0 : asyncAt);
        const tail = asyncAt === -1 ? edit.body : edit.body.slice(asyncAt);
        const applyAt = tail.indexOf('applyModelText(');
        const region = applyAt === -1 ? tail : tail.slice(0, applyAt);
        const keyed = /wanted\.current\s*\.\s*get\s*\(\s*tabId\s*\)/.exec(region);
        if (keyed !== null) {
          const at = base + keyed.index;
          return `${source.slice(0, at)}wanted.current.values().next().value${source.slice(at + keyed[0].length)}`;
        }
        const cmp = tabComparisonIn(region, code);
        if (cmp === null) return source;
        const at = base + cmp.index;
        return `${source.slice(0, at)}false${source.slice(at + cmp.text.length)}`;
      },
      want: 'without asking which tab typed it'
    },
    {
      name: 'the lastEdit reset deleted from the [tabId] effect',
      edit: (source) => {
        const code = stripComments(source);
        const { tabEffect } = piecesOf(code);
        if (tabEffect === null || tabEffect.body === null) return source;
        const m = /lastEdit\.current\s*=[^;]*;/.exec(tabEffect.body);
        if (m === null) return source;
        const from = tabEffect.bodyAt + lineStart(tabEffect.body, m.index);
        const to = tabEffect.bodyAt + m.index + m[0].length + 1;
        return source.slice(0, from) + source.slice(to);
      },
      want: 'leaves lastEdit where the departing tab left it'
    },
    {
      // ONE LINE OUT OF THE RESET EFFECT, which is the tidy a later round makes:
      // the line looks like bookkeeping and its own comment in the source is the
      // only thing that said otherwise until this clause existed.
      name: 'the written.current reset deleted from the [tabId] effect',
      edit: (source) => {
        const code = stripComments(source);
        const { tabEffect } = piecesOf(code);
        if (tabEffect === null || tabEffect.body === null) return source;
        const m = WRITTEN_RESET.exec(tabEffect.body);
        if (m === null) return source;
        const from = tabEffect.bodyAt + lineStart(tabEffect.body, m.index);
        const to = tabEffect.bodyAt + m.index + m[0].length + 1;
        return source.slice(0, from) + source.slice(to);
      },
      want: 'leaves written.current at the departing tab'
    },
    {
      name: 'the blanket drop put back in the [tabId] effect',
      edit: (source) => {
        const { tabEffect } = piecesOf(stripComments(source));
        if (tabEffect === null) return source;
        const at = tabEffect.bodyAt;
        return `${source.slice(0, at)}\n    wanted.current = null;${source.slice(at)}`;
      },
      want: 'empties the whole wanted slot'
    }
  ];
  let ablationsRed = 0;
  try {
    for (const arm of ABLATIONS) {
      if (shipping === null) continue;
      const ablated = arm.edit(shipping);
      if (ablated === shipping) {
        fail(
          `41. the ablation "${arm.name}" found nothing to edit in ${EDITS}, so it proves nothing; re-anchor it`
        );
        continue;
      }
      const hits = keystrokeFindings(ablated);
      if (hits.some((line) => line.includes(arm.want))) ablationsRed += 1;
      else {
        fail(
          `41. the ablation "${arm.name}" did not turn this rule red on its own clause: ${JSON.stringify(hits)}`
        );
      }
    }
  } finally {
    if (digestBefore !== null) {
      const after = createHash('sha256').update(readFileSync(EDITS)).digest('hex');
      if (after !== digestBefore) {
        fail(
          `41. ${EDITS} changed while rule 41 ran; the ablations are made on the string in memory and this rule must never write to the tree`
        );
      }
    }
  }

  say(
    `41. a keystroke belongs to the tab it was typed in: the typing state carries its tab in the declaration and in a reseed stamped with the tab the effect runs FOR, the edit effect returns on another tab’s state — the right way round, in either spelling, and ABOVE the line that records it — the wanted slot is keyed by the tab that typed it and the continuation applies only that tab’s own text, and the [tabId] effect resets lastEdit and the count while emptying no slot (${String(plantsOk)} of ${String(PLANTS.length)} planted hooks behaved, ${String(plantsCaught)} of them must fail)`
  );
  say(
    `41. ${String(ablationsRed)} of ${String(ABLATIONS.length)} ablations of the SHIPPING source turned this rule red on their own clause, each cut at a span the readers found rather than at a guessed spelling, made on the string in memory with ${EDITS}'s sha256 compared in a finally`
  );
}

if (failures.length > 0) {
  console.error(`${TAG} ${String(failures.length)} failure(s):`);
  for (const line of failures) console.error(`${TAG}   ${line}`);
  process.exit(1);
}
say('every rule passed.');
process.exit(0);
