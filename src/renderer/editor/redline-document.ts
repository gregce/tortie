/**
 * The redline as a DOCUMENT, being the whole file read as flowing prose with
 * every change marked in place (Phase 194).
 *
 * Phase 191 hung a marked-up line under each of Pierre's change blocks, and
 * Pierre drew everything around it: the line numbers, the gutter, and the
 * unchanged context. The operator did not want any of that. He wanted the
 * document itself, the way a marked-up draft reads, so this module composes
 * the WHOLE document from the two versions and hands it to ./RedlineDocument
 * to draw with no Pierre in the tree at all.
 *
 * ## The one correctness claim, and it is exact
 *
 * The composed runs with every `ins` removed equal the OLD file byte for byte,
 * and with every `del` removed they equal the NEW file byte for byte. That is
 * the whole meaning of a redline, it needs no trust in the code that drew it,
 * and build/conformance-redline.mjs re-derives it over a fixture corpus and a
 * seeded fuzz. Everything below is in service of that sentence.
 *
 * ## Where the context comes from: THE TWO FILE VERSIONS, never the hunks
 *
 * Pierre's parsed hunks carry context lines, and the backlog entry allowed
 * either source. The hunks were refused for two reasons that both break the
 * claim above. A hunk holds only the lines near a change, so anything between
 * two hunks is elided and the document would have a hole exactly where the
 * reader expects the paragraph to continue. And the coarse path in
 * ../pierre/diff-metadata parses a PATCH, whose line arrays are indexed by the
 * patch rather than by the file, so "the text between block 2 and block 3" is
 * not a slice of anything the metadata holds. Composing from `headContents`
 * and the live working text directly means every byte of both files is in
 * the input, and the partition below is what accounts for each one.
 *
 * ## The partition, in two levels
 *
 * 1. LINES. `diffLines` over the two versions gives a lossless line level
 *    partition: unchanged stretches, and change blocks of consecutive removed
 *    and added lines. It round trips exactly, measured over 3,000 random pairs
 *    in the fuzz that chose it. Its cost is Myers, O(ND), and a fully
 *    rewritten 10,000 line file took 8.7 seconds uncapped, so
 *    `REDLINE_DOC_MAX_LINE_EDITS` bounds the edit distance and the fallback
 *    is the honest coarse answer: the shared head and tail kept, everything
 *    between them one block. Measured at 40 ms for that same file.
 *
 * 2. WORDS, inside each block, through `redlineRuns` from ./redline, being
 *    the engine Phase 191 proved: `diffWords` with an `Intl.Segmenter`, so an
 *    emoji family with a zero width joiner stays whole and Japanese is
 *    segmented, under the same `maxEditLength` guard.
 *
 * ## WHY THE RUNS ARE REPAIRED, measured rather than assumed
 *
 * `diffWords` does not round trip the OLD side. Research 73 §5.1 measured 120
 * characters recovered against 121, and the fuzz for this phase measured it
 * at 2,196 failures in 3,000 random pairs: whitespace between words is taken
 * from the NEW side in every unchanged run, and a deleted run's own spacing
 * can be dropped or moved. The new side always rebuilt exactly. Phase 191
 * could live with that because it normalised every block to single spaces
 * first and its rows were never asked to reproduce a file. A document is.
 *
 * So `exactRuns` walks jsdiff's runs against both original strings and puts
 * the real bytes back: a deletion carries the old side's own spacing, and an
 * unchanged run whose spacing differs between the sides is split there into
 * the old spacing struck through and the new spacing inserted, which is the
 * honest redline of a whitespace change and the thing Phase 191's ruling 5
 * could not draw. The words themselves are matched character for character,
 * so anything that is not a whitespace disagreement refuses rather than
 * guesses, and the block then draws whole. Whether that ever happens is a
 * number the gate prints, and over the corpus and the fuzz it is zero.
 *
 * ## A BLOCK THE CAPS REFUSE DRAWS WHOLE
 *
 * Phase 191 drew nothing for a block past `REDLINE_MAX_BLOCK_CHARS`, past
 * `REDLINE_MAX_EDIT_LENGTH` or past `REDLINE_MAX_BLOCKS`, and counted it in a
 * note, because Pierre's two rows were still on screen. A standalone document
 * cannot draw nothing without a hole. So such a block draws as the whole old
 * text struck through followed by the whole new text inserted, which
 * satisfies both projections trivially and reads as "this paragraph was
 * rewritten", and the note says how many drew that way and why.
 *
 * ## THE PARTITION HAS A TIE, AND A BOUNDARY SLIDES ACROSS IT (Phase 246)
 *
 * On 2026-09-09 the operator inserted a paragraph ABOVE a paragraph he had
 * changed by one word, and the paragraph below was drawn as a whole deletion
 * in red followed by the whole paragraph again in green. Nothing was marked at
 * the word level and a reader could not see which word moved.
 *
 * NO CAP DID THAT, and docs/research/110 refutes all three of the entry's
 * candidates with numbers: the block's word edit distance was 93 against a cap
 * of 200, its two sides were 312 and 165 characters against a budget of 4,000,
 * `diffWords` ANSWERED with 19 runs, `exactRuns` did not refuse, and the note
 * was correctly `null` because by this module's own accounting nothing was
 * skipped. The arithmetic finished; the picture was still unreadable.
 *
 * The cause is `diffLines` choosing between two shortest edit scripts OF THE
 * SAME LENGTH. Both alignments move four lines. It took the one that pairs the
 * removed paragraph with the INSERTED one — the two resemble each other by
 * 0.09 — while the removed paragraph's real partner sits one byte later,
 * across a blank line the partition matched as unchanged, at 0.98 and a word
 * distance of 1. This is not jsdiff being worse than git: research 110 §3 ran
 * git 2.50.1 over the same two files with `diff.indentHeuristic` on and off
 * and under `patience`, `histogram` and `minimal`, and every one of them slid
 * the same way. At the line level both alignments really are equally good, and
 * only something that reads what is INSIDE the lines can tell them apart. Over
 * a synthetic corpus it is 8 of 8 when the paragraph goes in above and 0 of 8
 * when it goes in below, so it is not rare — it is every time.
 *
 * `slideBoundaries` is the tie-breaker, and what it may do is deliberately
 * narrow. A change block whose two sides do not resemble each other, followed
 * across whitespace-only unchanged text by a PURE INSERTION whose lines end
 * with that same whitespace and whose head DOES resemble the removed side, is
 * re-cut into the insertion that has no counterpart, the pair that does, and
 * the whitespace put back. It computes no edit script of its own, it moves no
 * run and it reorders nothing, so ruling 6 of ./redline stands untouched; the
 * word diff is still jsdiff's, called on a different pair. THE LINE COST IS
 * IDENTICAL by construction — the same lines are deleted and the same lines
 * are inserted, only their grouping moves — which is what makes it a
 * tie-breaker rather than a different diff. And both projections are exact
 * before and after, because the bridge is the same bytes on both sides.
 *
 * ## No newline is normalised away
 *
 * Phase 191 joined a block's lines into one sentence so three lines read as
 * one. This module keeps every newline, because the projections are byte
 * exact and because the view draws with `white-space: pre-wrap`, so the
 * document keeps the line structure its author gave it. A run may therefore
 * carry a newline, and a strikethrough over one is invisible, which is
 * harmless here: the line break it sits on is drawn either way.
 *
 * ## A CHANGE TO THE LAST WORD OF A LINE STAYS ON ITS LINE
 *
 * `diffWords` attaches a word's trailing whitespace to its token, and the
 * repair keeps it, so "We ship on Monday" becoming "We ship on Friday" arrived
 * as del "Monday\n" then ins "Friday\n". The deletion carried the line break,
 * the insertion landed on the NEXT line under it, and the picture read as a
 * line inserted rather than a word replaced, which is the opposite of the
 * charter sentence: the deleted words struck through IMMEDIATELY FOLLOWED by
 * the inserted words. The verifier of Phase 194 counted the shape in 11 of the
 * 99 pairs in its fixtures, and both projections held over every one, so no
 * byte level check could see it. `peelSharedSpace` is the answer: whitespace
 * the two sides of an adjacent pair share at their ends is common to both
 * files at that position, so it is moved into the plain run beside the pair,
 * trailing whitespace after it and leading whitespace before it. Only
 * whitespace moves, so the words jsdiff chose are drawn exactly as it chose
 * them, and the projections cannot change because the same bytes leave both
 * sides and land once in a run both sides own.
 *
 * ## A TABLE IS DIFFED ROW AGAINST ROW (Phase 251, research 114 §6.3)
 *
 * A change block whose every line is a table line went through the same single
 * `diffWords` as a paragraph, and a table is not a paragraph: the tokenizer
 * matches the dash groups of one separator row against another's, and the
 * pipes of row 3 against the pipes of row 5, so a table with one cell changed
 * drew as an interleaved ribbon in which no row was recognisably a row. So a
 * table block is ALIGNED first, row against row, and each PAIR is word-diffed
 * on its own; an unpaired row is a whole deletion or a whole insertion.
 *
 * THE ROWS ARE ALIGNED BY RESEMBLANCE OVER THE WHOLE ROW, NEVER BY THE FIRST
 * CELL, and that is the single most important sentence in this section. A
 * first-cell key cannot pair a row whose first cell is what changed, so a
 * renamed label column — the commonest table edit there is — degrades EVERY
 * row from word level to a whole-row deletion beside a whole-row insertion,
 * which is a WORSE picture than the flat stream it replaces. The key is an
 * order-preserving longest common subsequence in which two rows are the same
 * row when they share at least `REDLINE_ROW_RESEMBLANCE` of their word tokens,
 * which is research 110 §6's own measure and its own threshold reused rather
 * than invented. `| Sessions | the tab order |` against
 * `| Ledger | the tab order |` composes to `del "Sessions"` beside
 * `ins "Ledger"` and nothing else.
 *
 * AND THE RESEMBLANCE DOOR REACHES THE SAME BAD PICTURE, which the fix round
 * measured and this path now refuses. A row rewritten past the threshold does
 * not pair either, and a block in which NO row pairs draws exactly the two runs
 * `drawWhole` draws — the paragraph above's own condemned picture, arrived at
 * from the other side. So `tableRuns` may answer with `pairs === 0` and
 * `composeRedlineDocument` does not draw that answer: it falls through to the
 * flat path, and to the whole-block fallback behind it. The numbers are in
 * `tableRuns`'s own header.
 *
 * THE WORD BUDGET IS THE BLOCK'S AND NOT THE ROW'S. See `redlineRunsWithin` in
 * ./redline: `REDLINE_MAX_EDIT_LENGTH` was measured for ONE call per block, so
 * each pair is given what is LEFT of it and a pair that cannot be diffed
 * inside what is left is a whole-row replacement, which is the fallback the
 * block cap already has.
 *
 * A SEPARATOR ROW PAIRS ONLY WITH A SEPARATOR ROW and is never word-diffed,
 * because word-diffing `| --- | --- |` against `| --- | --- | --- |` matches
 * the dash groups and interleaves the two rows. When both sides are plain
 * dashes — no `:` alignment marker on either — the deleted copy is marked
 * `drop` by `redlineLeaves` and the stylesheet does not draw it, so the reader
 * sees the separator once the way the file has it. Its bytes are still in the
 * markup, so both projections, the copy handler's clone and every leaf walk
 * read exactly what they read before.
 *
 * WHAT THE ROW CAP IS ANSWERABLE FOR, MEASURED RATHER THAN QUOTED. Research
 * 114 §6.3 justified it with 666 unpaired rows of five bytes emitting 1,332
 * runs against the flat path's 2, and this file re-derives 1,332 exactly — and
 * then refutes half of the conclusion, because those 1,332 are 666 deletions
 * followed by 666 insertions, `push` merges each side into ONE run on the way
 * into the document, and the mounted cost of that shape is 2 runs with the cap
 * lifted as well as with it in place. The shape that really mounts is rows
 * that PAIR and fall past the shared word budget, because each of those emits
 * a deletion beside an insertion and adjacent runs of different kinds never
 * merge: 571 rows of `|ab|` against `|ab x|`, being 2,855 and 3,997 bytes and
 * both comfortably inside the character cap, emit 1,342 runs in 77 ms with the
 * cap lifted and 3 with it in place. `pairRows` is an O(n·m) dynamic program
 * with a token bag at every cell besides, measured at 1 ms for 60 rows, 110 ms
 * for 600 and 444 ms for 1,200, so the cap answers for the arithmetic as well
 * as for the DOM.
 *
 * WHICH SIDE OF THE CAPS THIS SITS ON. `tableRuns` sits INSIDE
 * `REDLINE_MAX_BLOCK_CHARS`, after it, so A TABLE OVER THE CHARACTER CAP IS
 * NOT FIXED BY THIS AND THAT IS A STATED LIMIT RATHER THAN AN OMISSION: the
 * block is refused before the tokenizer as it always was, it draws whole, and
 * `redlineDocumentNote` says `N too long`. The ROW cap says `N with too many
 * rows` instead, in its own counter, because 61 rows of five bytes is 844
 * characters and `too long` is a false sentence about it. Re-derived over this repository on
 * 2026-09-09: 46 of its 1,951 markdown tables are over the cap, among them
 * DESIGN.md:297 at 8,231 bytes and docs/BACKLOG.md:13554 at 22,283 bytes. And
 * `tableRuns` has a refusal of ITS OWN, `REDLINE_MAX_TABLE_ROWS`, because
 * unlike `redlineRuns` it answers on every input there is; ./redline's ruling
 * 4 carries the measurement.
 *
 * AND THE CHANGE UNIT MOVES WITH THE COMPOSER. `changesOf` in ./rewind reads
 * this run list, and ⌥↓, ⌥⌫, ⌥↩ and the `N of M changes` counter all read
 * `changesOf`, so for a table whose flat edit cap collapsed the block one
 * change becomes one per row: measured at 1 against 60 on a 60-row table with
 * two words changed in every row, where the flat path spends 240 edits against
 * a cap of 200 and gives up. THAT IS FINER GRANULARITY RATHER THAN A DEFECT
 * and it is taken on purpose rather than inherited — a person who rewinds a
 * table row now rewinds that row and not the table. It is BOUNDED by
 * `REDLINE_MAX_TABLE_ROWS`, which is the answer to research 114 §6.3's own
 * 200-row reading: a 200-row table is refused by the row cap and draws whole,
 * so it is one change here whatever its rows say.
 *
 * ## A CHANGE MUST CARRY INK (Phase 251, research 114 §6.5)
 *
 * `redlineLeaves` is the leaf-level half, and it is here rather than in the
 * view because it is arithmetic over the run list and the gate drives it under
 * node. It answers four questions per mark, and ./RedlineRow turns them into
 * attributes the stylesheet keys on. The one that is a rule rather than a
 * classification is `lone`: a blank line added or removed composes to exactly
 * one run, `del "\n"` or `ins "\n"`, with no other mark beside it, and with
 * the wash and the strikethrough both correctly withheld from it the reader
 * would be shown NOTHING AT ALL while the counter, the chip and ⌥↓ still
 * offered Rewind and Accept on it. So a whitespace mark whose whole CHANGE
 * holds nothing a reader can read is marked, and the stylesheet draws it as a
 * bar through a pseudo-element, which adds no node, no text node and no leaf.
 *
 * RULING 5 OF ./redline STANDS EXACTLY AND NO WIDER: a whitespace mark that IS
 * a spacing change keeps its wash, because in a standalone document nothing
 * else can say that a spacing change happened.
 *
 * WHAT THIS FILE MAY NEVER GROW. No accept and no reject: accepting a change
 * means writing a file, which the backlog entry refuses by name. Nothing here
 * reaches an IPC bridge, opens a file or writes anything.
 */

import { diffLines } from 'diff';
import {
  newTextOf,
  redlineRuns,
  redlineRunsWithin,
  REDLINE_MAX_BLOCK_CHARS,
  REDLINE_MAX_BLOCKS,
  REDLINE_MAX_EDIT_LENGTH,
  REDLINE_MAX_TABLE_ROWS
} from './redline';
import type { RedlineRun } from './redline';

export { newTextOf };

/**
 * The line level edit distance past which `diffLines` gives up and the coarse
 * partition is used instead. Chosen from a measurement on 2026-09-01: a
 * fully rewritten 10,000 line file cost 8,660 ms uncapped, 40 ms at 1,000 and
 * 146 ms at 2,000, while a 5,000 line file with 30 scattered edits cost
 * 1.4 ms at any cap because jsdiff trims the shared head and tail first.
 */
export const REDLINE_DOC_MAX_LINE_EDITS = 1_000;

export interface RedlineDocument {
  /**
   * The whole document, in order. Adjacent runs never share a kind, and an
   * adjacent deletion and insertion never share whitespace at either end.
   */
  runs: RedlineRun[];
  /** How many change blocks the line partition found. */
  blocks: number;
  /**
   * How many of them drew WHOLE, being the old text as one deletion and the
   * new text as one insertion, and why: the character budget, the word
   * guard giving up, the block cap, or the repair refusing. The last should
   * be zero and the gate prints it.
   *
   * PHASE 251 ADDED `tooManyRows`, AND THE FIX ROUND SPLIT IT OUT OF `tooBig`.
   * The two draw the same picture, which is why the phase first counted them
   * together — and the note does not say the same sentence about both. `tooBig`
   * reads `N too long`, which is true of a block over `REDLINE_MAX_BLOCK_CHARS`
   * and false of the thing the row cap refuses: a table of 61 rows of five
   * bytes is 844 characters, a fifth of that cap, and `1 too long` is a false
   * sentence about the only quantity it names. So the row cap has a counter and
   * a phrase of its own, `N with too many rows`.
   */
  whole: {
    tooBig: number;
    tooManyRows: number;
    tooDifferent: number;
    overCap: number;
    unaligned: number;
  };
  /**
   * True when the LINE partition gave up under `REDLINE_DOC_MAX_LINE_EDITS`
   * and the coarse answer was used: the shared head and tail kept, one block
   * between them. The projections still hold; the block is just coarser.
   */
  approximate: boolean;
  /**
   * How many change blocks `slideBoundaries` re-cut, being the Phase 246
   * tie-break. It is a NUMBER RATHER THAN A SENTENCE on purpose: a repair that
   * worked has nothing to tell a person, and the surface's banner is for what
   * could not be drawn. The gate reads it, because without it a slide that
   * silently stopped firing would look exactly like a file that did not need
   * one.
   */
  slid: number;
}

const NO_WHOLE = {
  tooBig: 0,
  tooManyRows: 0,
  tooDifferent: 0,
  overCap: 0,
  unaligned: 0
};

function isSpace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || /\s/.test(ch);
}

/** Append, merging into the previous run when the kind is the same. */
function push(out: RedlineRun[], kind: RedlineRun['kind'], text: string): void {
  if (text === '') return;
  const last = out[out.length - 1];
  if (last !== undefined && last.kind === kind) {
    last.text += text;
  } else {
    out.push({ kind, text });
  }
}

/**
 * jsdiff's runs, repaired so that they are exact on BOTH sides. See the file
 * header for the measurement that makes this necessary. Returns null when the
 * runs disagree with the originals in anything but whitespace, which is the
 * signal to draw the block whole rather than guess.
 */
export function exactRuns(
  runs: readonly RedlineRun[],
  oldText: string,
  newText: string
): RedlineRun[] | null {
  const out: RedlineRun[] = [];
  let o = 0;
  let n = 0;

  /** The whitespace run of `s` starting at `at`. */
  const spaceRun = (s: string, at: number): string => {
    let k = at;
    while (k < s.length && isSpace(s.charAt(k))) k++;
    return s.slice(at, k);
  };

  for (const run of runs) {
    const text = run.text;
    if (run.kind === 'ins') {
      // Insertions live on the new side only, which jsdiff rebuilds exactly.
      if (!newText.startsWith(text, n)) return null;
      push(out, 'ins', text);
      n += text.length;
      continue;
    }
    let i = 0;
    while (i < text.length) {
      const ch = text.charAt(i);
      if (isSpace(ch)) {
        // A whitespace segment of the run against the old side's own
        // whitespace at this point, whatever its length, including none.
        const mine = spaceRun(text, i);
        const theirs = spaceRun(oldText, o);
        if (run.kind === 'del') {
          push(out, 'del', theirs);
        } else {
          // An unchanged run's spacing is the NEW side's. Where the old side
          // disagrees, that disagreement IS a change, and it is drawn as one.
          if (!newText.startsWith(mine, n)) return null;
          if (mine === theirs) {
            push(out, 'same', mine);
          } else {
            push(out, 'del', theirs);
            push(out, 'ins', mine);
          }
          n += mine.length;
        }
        o += theirs.length;
        i += mine.length;
        continue;
      }
      // A word character. The old side may carry spacing here that the run
      // lost, which belongs to the old side alone.
      const stray = spaceRun(oldText, o);
      if (stray !== '') {
        push(out, 'del', stray);
        o += stray.length;
      }
      if (oldText.charAt(o) !== ch) return null;
      if (run.kind === 'same') {
        if (newText.charAt(n) !== ch) return null;
        n += 1;
      }
      push(out, run.kind, ch);
      o += 1;
      i += 1;
    }
  }
  // Whatever is left can only be spacing, or the runs were not this pair's.
  if (o < oldText.length) {
    const rest = oldText.slice(o);
    if (spaceRun(rest, 0) !== rest) return null;
    push(out, 'del', rest);
  }
  if (n < newText.length) {
    const rest = newText.slice(n);
    if (spaceRun(rest, 0) !== rest) return null;
    push(out, 'ins', rest);
  }
  // The claim itself, checked on the way out rather than trusted.
  if (oldTextOf(out) !== oldText || newTextOf(out) !== newText) return null;
  return out;
}

/** The old side of a run list: everything that is not an insertion. */
export function oldTextOf(runs: readonly RedlineRun[]): string {
  let s = '';
  for (const run of runs) if (run.kind !== 'ins') s += run.text;
  return s;
}

/** The whitespace the two strings share at their start, character for character. */
function sharedLeadingSpace(a: string, b: string): string {
  let k = 0;
  while (k < a.length && k < b.length && a.charAt(k) === b.charAt(k) && isSpace(a.charAt(k))) k++;
  return a.slice(0, k);
}

/** The whitespace the two strings share at their end, character for character. */
function sharedTrailingSpace(a: string, b: string): string {
  let k = 0;
  while (
    k < a.length &&
    k < b.length &&
    a.charAt(a.length - 1 - k) === b.charAt(b.length - 1 - k) &&
    isSpace(a.charAt(a.length - 1 - k))
  ) {
    k++;
  }
  return a.slice(a.length - k);
}

/**
 * Whitespace an adjacent deletion and insertion share at their ends moves out
 * of the pair and into the plain run beside it, so a change to the last word
 * of a line keeps its insertion on that line. See the file header. The pair
 * may arrive in either order, because jsdiff sometimes puts the insertion
 * first (ruling 6 of ./redline), and the order is kept. Only whitespace moves:
 * the words themselves are drawn exactly as jsdiff chose them. Adjacent runs
 * of one kind are merged and no empty run survives.
 */
export function peelSharedSpace(runs: readonly RedlineRun[]): RedlineRun[] {
  const out: RedlineRun[] = [];
  for (let i = 0; i < runs.length; i++) {
    const a = runs[i];
    const b = runs[i + 1];
    if (a === undefined) break;
    const pair =
      b !== undefined && a.kind !== 'same' && b.kind !== 'same' && a.kind !== b.kind;
    if (!pair || b === undefined) {
      push(out, a.kind, a.text);
      continue;
    }
    const lead = sharedLeadingSpace(a.text, b.text);
    const aRest = a.text.slice(lead.length);
    const bRest = b.text.slice(lead.length);
    const trail = sharedTrailingSpace(aRest, bRest);
    push(out, 'same', lead);
    push(out, a.kind, aRest.slice(0, aRest.length - trail.length));
    push(out, b.kind, bRest.slice(0, bRest.length - trail.length));
    push(out, 'same', trail);
    i += 1;
  }
  return out;
}

/** One change block of the line partition. */
export interface LineBlock {
  kind: 'same' | 'change';
  oldText: string;
  newText: string;
}

/**
 * How much two stretches of prose must resemble each other before the line
 * partition's pairing of them is believed. One constant, and it is the same
 * number on both sides of the question: a pairing under it is not believed,
 * and a candidate at or over it is.
 *
 * The two readings that chose it are the operator's own file
 * (docs/research/110 §3): the pair the partition made resembles itself by
 * **0.09**, and the removed paragraph resembles its real partner one byte
 * later by **0.98**. Half is where research 110 §6 already drew the line when
 * it counted the mis-slide 8 times out of 8, so the number this file pins is
 * the number that corpus was counted with rather than a new one.
 */
export const REDLINE_SLIDE_RESEMBLANCE = 0.5;

/**
 * How much better than the pairing it replaces a candidate must be. A second
 * constant, and it exists because a threshold alone is not enough: a pairing
 * at 0.47 and a candidate at 0.51 are the same reading twice, and sliding on
 * that is noise.
 *
 * IT WAS MEASURED RATHER THAN CHOSEN, over 135 real prose pairs out of this
 * repository's own history (`build/p246/measure-slide.mts`, banked at
 * `build/p246/out-measure-slide.txt`). Fourteen change blocks there are
 * doubtful AND have a reachable pure insertion behind a blank line. Four of
 * them clear the threshold above, and their margins are 0.87, 0.65, 0.38 and
 * **0.04**. The first three each LOWER the word edit distance of the block
 * they re-cut — over the cap to 21, 6 to 3, and 10 to 4 — and the fourth
 * RAISES it, from 29 to over the cap, which would turn a block that draws
 * word by word into one that draws whole. Nothing sits between 0.04 and 0.38,
 * so the number is placed in that gap rather than on either reading, and the
 * operator's own file clears it by 0.89.
 */
export const REDLINE_SLIDE_MARGIN = 0.25;

/** The lowercased words of a string, in order, empties dropped. */
function wordsOf(text: string): string[] {
  return text.toLowerCase().split(/\s+/).filter((w) => w !== '');
}

/**
 * How much two stretches of prose resemble each other, from 0 to 1: how many
 * of the first's words appear in the second at all, over the larger of the two
 * vocabularies. It is deliberately crude, because it decides nothing on its
 * own — it only chooses between two alignments the line differ already
 * measured as equal, and every byte of both files is drawn whichever it picks.
 * It is O(words) rather than O(lines squared), so no block is too big to ask
 * about and there is no fourth cap.
 */
export function resemblance(a: string, b: string): number {
  const A = wordsOf(a);
  const B = new Set(wordsOf(b));
  if (A.length === 0) return B.size === 0 ? 1 : 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit += 1;
  return hit / Math.max(A.length, B.size);
}

/**
 * THE TIE-BREAKER. See the file header for the measurement that makes this
 * necessary and for why swapping the line differ does not.
 *
 * The one shape it repairs, in the order it is asked:
 *
 *   1. a change block whose two sides are both non-empty and resemble each
 *      other BELOW `REDLINE_SLIDE_RESEMBLANCE`, so the partition's pairing of
 *      them is not believed;
 *   2. followed by unchanged text that is WHITESPACE ONLY, which between two
 *      paragraphs is the blank line and nothing else — the bridge, and it must
 *      exist, because two change blocks are never adjacent in this partition;
 *   3. followed by a PURE INSERTION whose text ENDS WITH that same bridge, and
 *      ends with it in WHOLE LINES, so what is left still carries its own line
 *      terminator;
 *   4. whose head, being the insertion with that trailing bridge taken off,
 *      resembles the removed side AT OR ABOVE the same number, and beats the
 *      pairing it would replace by at least `REDLINE_SLIDE_MARGIN`, so a
 *      0.47 against a 0.51 is read as one reading twice rather than as
 *      evidence.
 *
 * Then `[change(O,N), same(T), change(-,I)]` becomes
 * `[change(-, N+T), change(O, I minus its trailing T), same(T)]`.
 *
 * BOTH PROJECTIONS ARE UNCHANGED, by inspection rather than by trust: the old
 * side reads `O + T` before and `"" + O + T` after, and the new side reads
 * `N + T + I` before and `(N + T) + (I - T) + T` after, which is the same
 * string because `I` ends with `T`. THE LINE COST IS UNCHANGED TOO: the same
 * lines are deleted and the same lines are inserted, and the bridge is a
 * `same` block on both sides of the rewrite, so this cannot buy a picture by
 * spending edits jsdiff refused to spend.
 *
 * WHAT IT REFUSES, and each refusal is a limit rather than an oversight. It
 * looks FORWARD only, because research 110 §6 measured the mis-slide 8 times
 * out of 8 with the paragraph inserted above and 0 times out of 8 with it
 * inserted below, so there is no measured backward case to repair. It requires
 * the insertion to end with the bridge, because absorbing the bridge into the
 * pair instead would cost two line operations more per bridge line and would
 * stop being a tie-break. And a block it does not repair is drawn exactly as
 * it is drawn today, word by word, because the arithmetic ran and a picture
 * this pass could not improve is not a give-up to announce.
 */
export function slideBoundaries(blocks: readonly LineBlock[]): {
  blocks: LineBlock[];
  slid: number;
} {
  const out: LineBlock[] = [];
  let slid = 0;
  let i = 0;
  while (i < blocks.length) {
    const here = blocks[i];
    if (here === undefined) break;
    const doubtful =
      here.kind === 'change' &&
      here.oldText !== '' &&
      here.newText !== '' &&
      resemblance(here.oldText, here.newText) < REDLINE_SLIDE_RESEMBLANCE;
    if (!doubtful) {
      out.push(here);
      i += 1;
      continue;
    }
    let j = i + 1;
    let bridge = '';
    while (j < blocks.length) {
      const step = blocks[j];
      if (step === undefined || step.kind !== 'same' || step.oldText.trim() !== '') break;
      bridge += step.oldText;
      j += 1;
    }
    const partner = blocks[j];
    const reachable =
      bridge.endsWith('\n') &&
      partner !== undefined &&
      partner.kind === 'change' &&
      partner.oldText === '' &&
      partner.newText.endsWith(bridge);
    if (!reachable || partner === undefined) {
      out.push(here);
      i += 1;
      continue;
    }
    const paired = partner.newText.slice(0, partner.newText.length - bridge.length);
    // THE LINE COST IS ONLY EQUAL WHEN THE BRIDGE IS WHOLE LINES OF THE
    // INSERTION. An insertion of `"paragraph\n"` across a bridge of `"\n"`
    // leaves `"paragraph"` with no terminator, which is still one line, so the
    // rewrite would add a line the partition did not. Refuse it there.
    const better =
      paired === '' || !paired.endsWith('\n') ? 0 : resemblance(here.oldText, paired);
    if (
      better < REDLINE_SLIDE_RESEMBLANCE ||
      better - resemblance(here.oldText, here.newText) < REDLINE_SLIDE_MARGIN
    ) {
      out.push(here);
      i += 1;
      continue;
    }
    out.push({ kind: 'change', oldText: '', newText: here.newText + bridge });
    out.push({ kind: 'change', oldText: here.oldText, newText: paired });
    out.push({ kind: 'same', oldText: bridge, newText: bridge });
    slid += 1;
    i = j + 1;
  }
  return { blocks: out, slid };
}

// ---------------------------------------------------------------------------
// THE TABLE BLOCK (Phase 251, research 114 §6.3). See the file header.
// ---------------------------------------------------------------------------

/** A table line: optional leading whitespace, then a pipe. */
const TABLE_LINE = /^\s*\|/;

/** A separator row's alphabet: pipes, dashes, colons and spacing, nothing else. */
const SEPARATOR_ROW = /^[\s|:-]+$/;

/**
 * How much two rows must resemble each other to be the same row.
 *
 * ONE CONSTANT, AND IT IS RESEARCH 110 §6'S OWN, reused rather than invented:
 * `REDLINE_SLIDE_RESEMBLANCE` above is the same number asking the same kind of
 * question one level up, about two stretches of prose rather than two rows.
 * The measure differs — this one is a token MULTISET overlap, so a row that
 * repeats a word cannot claim credit for it twice — and the threshold does
 * not.
 */
export const REDLINE_ROW_RESEMBLANCE = 0.5;

/** The lines of a block, each carrying its own newline when it had one. */
function rowsOf(text: string): string[] {
  return text.match(/[^\n]*\n|[^\n]+$/g) ?? [];
}

/** The word tokens of a row, lower-cased. Pipes, dashes and punctuation drop out. */
function rowTokens(line: string): string[] {
  return line.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

/**
 * A table separator row, being the `| --- | :-- |` line under a header. It
 * must carry a pipe as well as a dash, so a thematic break or a setext
 * underline in ordinary prose is not one of these and is never dropped.
 */
export function isSeparatorRow(line: string): boolean {
  const row = line.replace(/\n$/, '');
  return SEPARATOR_ROW.test(row) && row.includes('|') && row.includes('-');
}

/**
 * How much two rows resemble each other, from 0 to 1: twice the size of their
 * common token multiset over the sum of their sizes, so an identical pair
 * reads 1 and a disjoint pair reads 0.
 *
 * A separator row resembles a separator row and nothing else, asked BEFORE the
 * arithmetic, because a separator row has no tokens at all and a bag-of-words
 * measure would happily pair one with a row of empty cells.
 */
export function rowResemblance(a: string, b: string): number {
  const sepA = isSeparatorRow(a);
  const sepB = isSeparatorRow(b);
  if (sepA || sepB) return sepA && sepB ? 1 : 0;
  const ta = rowTokens(a);
  const tb = rowTokens(b);
  if (ta.length === 0 && tb.length === 0) return 1;
  if (ta.length === 0 || tb.length === 0) return 0;
  const bag = new Map<string, number>();
  for (const t of ta) bag.set(t, (bag.get(t) ?? 0) + 1);
  let common = 0;
  for (const t of tb) {
    const n = bag.get(t) ?? 0;
    if (n > 0) {
      common += 1;
      bag.set(t, n - 1);
    }
  }
  return (2 * common) / (ta.length + tb.length);
}

/** One step of the row alignment: a pair, a row with no partner either way. */
export interface RowStep {
  kind: 'pair' | 'del' | 'ins';
  /** Index into the old rows, for `pair` and `del`. */
  old?: number;
  /** Index into the new rows, for `pair` and `ins`. */
  next?: number;
}

/**
 * THE ORDER-PRESERVING PAIRING. A plain longest common subsequence over the
 * rows in which "equal" means `rowResemblance` clears the threshold.
 *
 * It is written out rather than handed to `diffArrays` because the pairing
 * INDICES are what the caller needs and a comparator-driven `diffArrays`
 * answers values. Ruling 6 of ./redline is untouched: nothing is reordered,
 * each side is consumed in its own order, and that is exactly what keeps both
 * projections exact — every old row lands in one `pair` or one `del` and every
 * new row in one `pair` or one `ins`, once, in order.
 *
 * It is O(n·m) with a token bag at every cell, which is why
 * `REDLINE_MAX_TABLE_ROWS` exists in front of it.
 */
export function pairRows(
  oldRows: readonly string[],
  newRows: readonly string[]
): RowStep[] {
  const n = oldRows.length;
  const m = newRows.length;
  const same = (i: number, j: number): boolean =>
    rowResemblance(oldRows[i] ?? '', newRows[j] ?? '') >= REDLINE_ROW_RESEMBLANCE;
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    new Array<number>(m + 1).fill(0)
  );
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) {
      const row = dp[i] as number[];
      const below = dp[i + 1] as number[];
      row[j] = same(i, j)
        ? (below[j + 1] as number) + 1
        : Math.max(below[j] as number, row[j + 1] as number);
    }
  }
  const out: RowStep[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    const row = dp[i] as number[];
    const below = dp[i + 1] as number[];
    if (same(i, j) && (row[j] as number) === (below[j + 1] as number) + 1) {
      out.push({ kind: 'pair', old: i, next: j });
      i += 1;
      j += 1;
    } else if ((below[j] as number) >= (row[j + 1] as number)) {
      out.push({ kind: 'del', old: i });
      i += 1;
    } else {
      out.push({ kind: 'ins', next: j });
      j += 1;
    }
  }
  while (i < n) {
    out.push({ kind: 'del', old: i });
    i += 1;
  }
  while (j < m) {
    out.push({ kind: 'ins', next: j });
    j += 1;
  }
  return out;
}

/** What `tableRuns` did, so the gate can read the caps rather than infer them. */
export interface TableRunsResult {
  /** The runs for the whole block, repaired, in document order. */
  runs: RedlineRun[];
  /**
   * HOW MANY ROWS THE ALIGNMENT ALIGNED, of every kind: `paired + wholeRows +
   * identical + separators`. It is the field the CALLER reads, because zero of
   * them means this path drew nothing at all — see `tableRuns`'s own header
   * and `composeRedlineDocument`'s call site.
   */
  pairs: number;
  /** Pairs drawn word by word. */
  paired: number;
  /** Pairs the shared budget or the repair refused, drawn as whole rows. */
  wholeRows: number;
  /** Pairs whose two rows were byte identical, drawn as one unchanged run. */
  identical: number;
  /** Separator pairs, which are never word-diffed. */
  separators: number;
  /** Rows with no partner at all, drawn whole. */
  unpaired: number;
  /**
   * How much of `REDLINE_MAX_EDIT_LENGTH` the block's rows spent BETWEEN THEM.
   * It can never exceed it, which is the whole point of the shared budget, and
   * the gate reads this number rather than trusting the sentence.
   */
  spent: number;
}

/**
 * A change block is a table block when every non-empty line of BOTH sides is a
 * table line, and each side has at least one. Both sides, because a paragraph
 * turning into a table is a rewrite rather than a table edit, and the row
 * alignment has nothing to align it against.
 */
export function isTableBlock(oldText: string, newText: string): boolean {
  const rows = (text: string): string[] =>
    text.split('\n').filter((line) => line !== '');
  const side = (text: string): boolean => {
    const lines = rows(text);
    return lines.length > 0 && lines.every((line) => TABLE_LINE.test(line));
  };
  return side(oldText) && side(newText);
}

/**
 * The runs for one table change block, aligned row against row, or null when
 * `REDLINE_MAX_TABLE_ROWS` refuses it and the block must draw whole.
 *
 * See the file header for every rule this follows. The short form is that
 * every old row lands in exactly one `pair` or one `del` and every new row in
 * exactly one `pair` or one `ins`, in order, so the two projections hold by
 * construction and not by inspection.
 *
 * AN ANSWER WITH `pairs === 0` IS NOT AN ANSWER, and the caller must not draw
 * it. THE FIX ROUND ADDED THIS SENTENCE AND THE MEASUREMENT UNDER IT. When the
 * alignment pairs no row at all, `pairRows` emits every deletion and then every
 * insertion, `push` merges each side into one run on the way into the document,
 * and what reaches the page is BYTE IDENTICAL to `drawWhole`'s two runs — the
 * whole-block fallback wearing this path's name. So `composeRedlineDocument`
 * asks the flat path instead, with the whole-block fallback still behind it,
 * and nothing this path can draw is lost by doing so.
 *
 * It is not a rare shape and it is not free. Over the 201 real table change
 * blocks in this repository's own prose history, 26 pair nothing and 21 of
 * those the flat path draws word by word; 17 are one row against one row, where
 * the row alignment has no second row to protect the picture FROM. The one
 * research 114 §6.3 would recognise is `docs/research/107` at `9e0f57a6`, a
 * single row whose second cell was rewritten: `rowResemblance` reads 0.29, the
 * row does not pair, and it drew as a whole deletion beside a whole insertion —
 * *"a WORSE picture than the flat stream it replaces"* in that section's own
 * words, arrived at through the resemblance door rather than the first-cell one
 * it was written against. With the fall-through, marked characters over the 201
 * blocks go 49,606 to 45,708 and the one-row bucket returns to the flat path's
 * own 14,606 exactly, being 16 blocks louder against 0.
 *
 * THE STATED LIMIT IS THAT THE FALL-THROUGH ONLY CLOSES THE CASE WHERE NO ROW
 * PAIRS, and the committer's round writes it down rather than widening the
 * fix. A block in which SOME rows pair reaches the same "worse picture than
 * the flat stream it replaces" from the same door, because the rows that did
 * NOT pair still draw whole beside the ones that did. Re-derived through
 * build/p251/one-block.mts over `docs/BACKLOG.md` at `47eb4f9c`, three rows
 * against three with two of them paired: this path draws 506 marked characters
 * in 8 change units and the flat path draws 314 in 12, with ZERO runs crossing
 * a row on either side, so there was no confetti for the louder picture to be
 * buying. It is the design this phase chose — an unpaired row is a whole
 * deletion or a whole insertion — it is older than the fall-through, and the
 * fall-through made no such block worse. Whether a partly paired block should
 * fall through too is a question for a later round, and it is not free the way
 * `pairs === 0` is: there the two answers are byte identical, and here they
 * are not.
 */
export function tableRuns(oldText: string, newText: string): TableRunsResult | null {
  const oldRows = rowsOf(oldText);
  const newRows = rowsOf(newText);
  if (
    oldRows.length > REDLINE_MAX_TABLE_ROWS ||
    newRows.length > REDLINE_MAX_TABLE_ROWS
  ) {
    return null;
  }
  const runs: RedlineRun[] = [];
  /**
   * A ROW IS ITS OWN RUN HERE AND IS NEVER MERGED WITH THE ROW ABOVE IT, which
   * is the one place this file does not use `push`.
   *
   * `composeRedlineDocument` pushes these through `push` on the way in, so the
   * DOCUMENT still holds the invariant that adjacent runs never share a kind
   * and nothing downstream sees anything new. What merging here would destroy
   * is the only honest reading of what this path COSTS: 666 unpaired rows are
   * 1,332 runs out of this function and two runs after the merge, and a gate
   * reading the merged number would watch the row cap's own justification
   * disappear. The number the cap is answerable for is this one.
   */
  const emit = (kind: RedlineRun['kind'], text: string): void => {
    if (text !== '') runs.push({ kind, text });
  };
  let paired = 0;
  let wholeRows = 0;
  let identical = 0;
  let separators = 0;
  let unpaired = 0;
  let spent = 0;
  for (const step of pairRows(oldRows, newRows)) {
    if (step.kind === 'del') {
      emit('del', oldRows[step.old ?? 0] ?? '');
      unpaired += 1;
      continue;
    }
    if (step.kind === 'ins') {
      emit('ins', newRows[step.next ?? 0] ?? '');
      unpaired += 1;
      continue;
    }
    const a = oldRows[step.old ?? 0] ?? '';
    const b = newRows[step.next ?? 0] ?? '';
    if (a === b) {
      emit('same', a);
      identical += 1;
      continue;
    }
    // A SEPARATOR ROW IS NEVER WORD-DIFFED. See the file header.
    if (isSeparatorRow(a) && isSeparatorRow(b)) {
      emit('del', a);
      emit('ins', b);
      separators += 1;
      continue;
    }
    // THE BUDGET IS THE BLOCK'S. Each pair is given what is left of it.
    const words = redlineRunsWithin(a, b, REDLINE_MAX_EDIT_LENGTH - spent);
    const exact = words === null ? null : exactRuns(words.runs, a, b);
    if (words === null || exact === null) {
      emit('del', a);
      emit('ins', b);
      wholeRows += 1;
      continue;
    }
    spent += words.edits;
    for (const run of exact) emit(run.kind, run.text);
    paired += 1;
  }
  return {
    runs,
    pairs: paired + wholeRows + identical + separators,
    paired,
    wholeRows,
    identical,
    separators,
    unpaired,
    spent
  };
}

/**
 * A DELETION AND AN INSERTION OF THE SAME BYTES ARE NOT A CHANGE (Phase 251,
 * research 114 §6.5 rule 4).
 *
 * `exactRuns` splits an unchanged run whose spacing differs into the old
 * spacing struck through and the new spacing inserted, which is right when the
 * two really differ — and a changed line's own trailing newline can go through
 * the same door, so `del x` lands beside `ins x` and the document draws the
 * same bytes twice. Replacing such a pair with one unchanged run is EXACTLY
 * EQUIVALENT ON BOTH PROJECTIONS: the non-ins side loses `ins x` and gains `x`
 * where it had `del x`, and the non-del side is the mirror. So it is a
 * correction rather than a decoration, and the gate asks it as a property over
 * the fuzz rather than over a fixture.
 *
 * It runs AFTER `peelSharedSpace`, because the peel is what leaves such a pair
 * behind: it splits a pair at its shared ends and can hand back two rests that
 * are the same string.
 */
export function cancelPairs(runs: readonly RedlineRun[]): RedlineRun[] {
  const out: RedlineRun[] = [];
  for (let i = 0; i < runs.length; i += 1) {
    const a = runs[i];
    const b = runs[i + 1];
    if (a === undefined) break;
    if (
      b !== undefined &&
      a.kind !== 'same' &&
      b.kind !== 'same' &&
      a.kind !== b.kind &&
      a.text === b.text
    ) {
      push(out, 'same', a.text);
      i += 1;
      continue;
    }
    push(out, a.kind, a.text);
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE LEAF RULES (Phase 251, research 114 §6.5). See the file header.
// ---------------------------------------------------------------------------

/** A run with nothing in it a reader can read: no letter and no digit. */
const WORDLESS = /^[^\p{L}\p{N}]*$/u;

/** Anything a reader can read. */
const INK = /[\p{L}\p{N}]/u;

/**
 * What ./RedlineRow needs to know about one run to draw its leaf. Every field
 * is FALSE for a `same` run, because these are rules about MARKS.
 */
export interface RedlineLeaf {
  /**
   * No letter and no digit, and not only whitespace: a table's `|` and its
   * `---`. It keeps its colour and its strikethrough and takes no wash,
   * because a wash on furniture reads as a change to the furniture.
   */
  wordless: boolean;
  /** Only whitespace. */
  blank: boolean;
  /**
   * A whitespace mark that IS a spacing change. It KEEPS its wash: ruling 5 of
   * ./redline, exactly and no wider. See `redlineLeaves` for the two clauses
   * that answer it and for why research 114 §6.5's own single clause reads
   * false on the very case ruling 5 is about.
   */
  spacing: boolean;
  /**
   * A whitespace mark whose whole CHANGE holds nothing a reader can read, so
   * neither the wash nor the strikethrough has anything to land on and the
   * change would be drawn as nothing at all. See the file header.
   */
  lone: boolean;
  /**
   * A deleted separator row whose insertion is a separator row too and where
   * neither side carries a `:` alignment marker. It is not DRAWN, which is not
   * the same as absent: its bytes stay in the markup.
   */
  drop: boolean;
}

const NO_LEAF: RedlineLeaf = {
  wordless: false,
  blank: false,
  spacing: false,
  lone: false,
  drop: false
};

/**
 * The leaf facts for one run list, in the same order, one per run.
 *
 * It is pure arithmetic over runs and it is deliberately NOT a field on
 * `RedlineRun`: `push` merges adjacent runs of one kind by concatenating their
 * text, so a flag carried on a run would be a flag about whichever half
 * arrived first. Asking here, once, after every merge, is the only place the
 * answer is about the run that is actually drawn.
 *
 * It takes the runs of ONE change when ./RedlineDocument draws a change and
 * the runs of one block when ./RedlineRow draws a row, and it groups them the
 * same way either time, being research 83 B.2's unit: a maximal stretch of
 * consecutive non-`same` runs.
 */
export function redlineLeaves(runs: readonly RedlineRun[]): RedlineLeaf[] {
  const out: RedlineLeaf[] = runs.map((run) =>
    run.kind === 'same'
      ? { ...NO_LEAF }
      : {
          ...NO_LEAF,
          wordless: WORDLESS.test(run.text) && run.text.trim() !== '',
          blank: run.text.trim() === ''
        }
  );

  // RULE 2, AND IT HAS TWO CLAUSES WHERE RESEARCH 114 §6.5 HAS ONE, because
  // the one it has reads FALSE on the very case ruling 5 is about.
  //
  // §6.5 says a spacing change is a whitespace mark with an opposite-kind
  // whitespace mark beside it, being `del "   "` beside `ins " "`, and over
  // the MOCK's composer it is: the mock does not peel. `peelSharedSpace` runs
  // in this file and takes the whitespace the two sides SHARE at their ends
  // out of the pair, so three spaces becoming one arrives as `same " "` and
  // then `del "  "` ALONE, with the insertion peeled away to nothing. Driven
  // over the shipping composer on 2026-09-09, "Spaced   out   words   here."
  // becoming "Spaced out words here." read three lone deletions and not one
  // pair, so the one-clause rule withheld the wash from every spacing change
  // this document path can actually draw.
  //
  // So a whitespace mark is a spacing change when EITHER an opposite-kind
  // whitespace mark is beside it — four spaces becoming a tab, where the peel
  // finds nothing shared to take — OR it carries no line terminator at all,
  // which is spacing INSIDE one line and is what the peel leaves behind. A
  // whitespace mark that carries a line terminator and stands alone is a
  // line's own break moving, which is markdown structure rather than spacing:
  // it gets no wash, because washing it paints a coloured bar past the last
  // glyph on the row, and rule 3 below is what stops it being drawn as
  // nothing at all instead.
  const blankMark = (k: number): boolean =>
    runs[k] !== undefined && runs[k]?.kind !== 'same' && out[k]?.blank === true;
  for (let i = 0; i < runs.length; i += 1) {
    const leaf = out[i];
    const run = runs[i];
    if (leaf === undefined || run === undefined || !leaf.blank) continue;
    const opposite = (k: number): boolean =>
      blankMark(k) && runs[k]?.kind !== run.kind;
    leaf.spacing =
      opposite(i - 1) || opposite(i + 1) || !/[\n\r]/.test(run.text);
  }

  // RULE 3. A CHANGE MUST CARRY INK. The unit is the group, so the question
  // is asked of the group and answered on every mark in it.
  let start = 0;
  while (start < runs.length) {
    if (runs[start]?.kind === 'same') {
      start += 1;
      continue;
    }
    let end = start;
    let ink = false;
    while (end < runs.length && runs[end]?.kind !== 'same') {
      if (INK.test(runs[end]?.text ?? '')) ink = true;
      end += 1;
    }
    if (!ink) {
      for (let k = start; k < end; k += 1) {
        const leaf = out[k];
        if (leaf !== undefined && leaf.blank && !leaf.spacing) leaf.lone = true;
      }
    }
    start = end;
  }

  // RULE 1'S OTHER HALF, and it is the separator pair. The deleted copy of a
  // plain-dashes separator row is not drawn, because a separator row's only
  // content is the column count and the header above it already shows that.
  // An alignment marker on either side draws both, because then the row is
  // saying something the header does not.
  for (let i = 0; i + 1 < runs.length; i += 1) {
    const a = runs[i];
    const b = runs[i + 1];
    if (a === undefined || b === undefined) continue;
    if (a.kind === 'same' || b.kind === 'same' || a.kind === b.kind) continue;
    if (!isSeparatorRow(a.text) || !isSeparatorRow(b.text)) continue;
    if (a.text.includes(':') || b.text.includes(':')) continue;
    const deleted = a.kind === 'del' ? i : i + 1;
    const leaf = out[deleted];
    if (leaf !== undefined) leaf.drop = true;
  }

  return out;
}

/**
 * The line level partition: the two versions as alternating unchanged
 * stretches and change blocks, every byte of both in exactly one of them.
 */
function linePartition(
  oldText: string,
  newText: string
): { blocks: LineBlock[]; approximate: boolean } {
  const parts = diffLines(oldText, newText, {
    maxEditLength: REDLINE_DOC_MAX_LINE_EDITS
  });
  if (parts !== undefined) {
    const blocks: LineBlock[] = [];
    let pendingOld = '';
    let pendingNew = '';
    let inChange = false;
    const flush = (): void => {
      if (inChange) {
        blocks.push({ kind: 'change', oldText: pendingOld, newText: pendingNew });
        pendingOld = '';
        pendingNew = '';
        inChange = false;
      }
    };
    for (const part of parts) {
      if (part.added === true) {
        inChange = true;
        pendingNew += part.value;
      } else if (part.removed === true) {
        inChange = true;
        pendingOld += part.value;
      } else {
        flush();
        if (part.value !== '') {
          blocks.push({ kind: 'same', oldText: part.value, newText: part.value });
        }
      }
    }
    flush();
    return { blocks, approximate: false };
  }

  // The guard gave up. Keep the shared head and tail, snapped to line
  // boundaries, and call everything between them one block, which is what
  // ../pierre/diff-metadata's coarseDiff does for the same reason. Both are
  // taken as BYTES common to the two strings, so the three pieces rebuild
  // either side exactly whatever the middle holds, including nothing.
  const shortest = Math.min(oldText.length, newText.length);
  let prefix = 0;
  while (prefix < shortest && oldText.charAt(prefix) === newText.charAt(prefix)) prefix++;
  // Back to the start of the line the prefix ends inside. A prefix of zero
  // stays zero: `lastIndexOf` clamps a negative position to 0, so asking it
  // about position -1 reads the first character, and an old side that BEGINS
  // with a newline then claimed a shared head of "\n" the new side did not
  // have. The verifier of Phase 194 caught it as one byte off on the new
  // projection over a 1,300 line rewrite.
  prefix = prefix === 0 ? 0 : oldText.lastIndexOf('\n', prefix - 1) + 1;
  let suffix = 0;
  while (
    suffix < shortest - prefix &&
    oldText.charAt(oldText.length - 1 - suffix) === newText.charAt(newText.length - 1 - suffix)
  ) {
    suffix++;
  }
  // Forward to the first line break inside the suffix, so the tail starts on
  // a line of its own; a suffix with no break in it is not a tail.
  const tailBreak = oldText.indexOf('\n', oldText.length - suffix);
  suffix = tailBreak === -1 ? 0 : oldText.length - tailBreak;
  const blocks: LineBlock[] = [];
  const headText = oldText.slice(0, prefix);
  const tailText = oldText.slice(oldText.length - suffix);
  if (headText !== '') blocks.push({ kind: 'same', oldText: headText, newText: headText });
  blocks.push({
    kind: 'change',
    oldText: oldText.slice(prefix, oldText.length - suffix),
    newText: newText.slice(prefix, newText.length - suffix)
  });
  if (tailText !== '') blocks.push({ kind: 'same', oldText: tailText, newText: tailText });
  return { blocks, approximate: true };
}

/**
 * The whole document as runs. See the file header for every rule this
 * follows; the short form is that every byte of `oldText` lands in a `same`
 * or a `del` run and every byte of `newText` in a `same` or an `ins` run, in
 * order, and nothing else is in the output.
 */
export function composeRedlineDocument(
  oldText: string,
  newText: string
): RedlineDocument {
  if (oldText === newText) {
    return {
      runs: oldText === '' ? [] : [{ kind: 'same', text: oldText }],
      blocks: 0,
      whole: { ...NO_WHOLE },
      approximate: false,
      slid: 0
    };
  }
  const partitioned = linePartition(oldText, newText);
  const { blocks, slid } = slideBoundaries(partitioned.blocks);
  const approximate = partitioned.approximate;
  const runs: RedlineRun[] = [];
  const whole = { ...NO_WHOLE };
  let count = 0;

  const drawWhole = (block: LineBlock): void => {
    push(runs, 'del', block.oldText);
    push(runs, 'ins', block.newText);
  };

  for (const block of blocks) {
    if (block.kind === 'same') {
      push(runs, 'same', block.oldText);
      continue;
    }
    count += 1;
    // A block with one empty side is already its own redline, and it needs no
    // tokenizer and counts against no cap: it is one run either way.
    if (block.oldText === '' || block.newText === '') {
      drawWhole(block);
      continue;
    }
    if (count > REDLINE_MAX_BLOCKS) {
      whole.overCap += 1;
      drawWhole(block);
      continue;
    }
    if (
      block.oldText.length > REDLINE_MAX_BLOCK_CHARS ||
      block.newText.length > REDLINE_MAX_BLOCK_CHARS
    ) {
      whole.tooBig += 1;
      drawWhole(block);
      continue;
    }
    // THE TABLE PATH SITS INSIDE THE CHARACTER CAP, AFTER IT. A block over
    // that cap reaches no differ at all, exactly as it did before this phase,
    // which is what makes the stated limit in the file header checkable.
    if (isTableBlock(block.oldText, block.newText)) {
      const table = tableRuns(block.oldText, block.newText);
      if (table === null) {
        whole.tooManyRows += 1;
        drawWhole(block);
        continue;
      }
      // AN ALIGNMENT THAT ALIGNED NO ROW HAS DRAWN NOTHING, so this block
      // falls THROUGH to the flat path below, with the whole-block fallback
      // still behind that. `tableRuns`'s header carries the proof that its own
      // answer at `pairs === 0` is byte identical to `drawWhole`'s, so nothing
      // is lost, and the measurement that says the picture is really worse.
      if (table.pairs > 0) {
        for (const run of table.runs) push(runs, run.kind, run.text);
        continue;
      }
    }
    const words = redlineRuns(block.oldText, block.newText);
    if (words === null) {
      whole.tooDifferent += 1;
      drawWhole(block);
      continue;
    }
    const exact = exactRuns(words, block.oldText, block.newText);
    if (exact === null) {
      whole.unaligned += 1;
      drawWhole(block);
      continue;
    }
    for (const run of exact) push(runs, run.kind, run.text);
  }

  // Once, over the whole document, so a block drawn whole is covered as well
  // as a word level pair. The peel moves the same bytes out of both sides of a
  // pair and into one run both sides own, so neither projection can change,
  // and the cancel pass after it replaces a pair the peel left holding the
  // same bytes on both sides with the one unchanged run it is equal to.
  return {
    runs: cancelPairs(peelSharedSpace(runs)),
    blocks: count,
    whole,
    approximate,
    slid
  };
}

/**
 * One short sentence for the banner under the document, or null when every
 * block drew as words. "Drawn whole" is the phrase, because that is what the
 * reader sees: the paragraph struck through and the paragraph that replaced
 * it, rather than the words that moved inside it.
 */
export function redlineDocumentNote(doc: RedlineDocument): string | null {
  const { tooBig, tooManyRows, tooDifferent, overCap, unaligned } = doc.whole;
  const total = tooBig + tooManyRows + tooDifferent + overCap + unaligned;
  const parts: string[] = [];
  if (doc.approximate) {
    parts.push(
      'Too many changed lines to pair up, so the changed stretch is drawn as one block.'
    );
  }
  if (total > 0) {
    const why: string[] = [];
    if (tooDifferent + unaligned > 0) why.push(`${String(tooDifferent + unaligned)} rewritten`);
    if (tooBig > 0) why.push(`${String(tooBig)} too long`);
    if (tooManyRows > 0) why.push(`${String(tooManyRows)} with too many rows`);
    if (overCap > 0) why.push(`${String(overCap)} past the first ${String(REDLINE_MAX_BLOCKS)}`);
    parts.push(
      `${String(total)} change${total === 1 ? '' : 's'} drawn whole rather than word by word (${why.join(', ')}).`
    );
  }
  return parts.length === 0 ? null : parts.join(' ');
}
