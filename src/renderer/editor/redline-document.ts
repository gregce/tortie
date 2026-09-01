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
 * ## No newline is normalised away
 *
 * Phase 191 joined a block's lines into one sentence so three lines read as
 * one. This module keeps every newline, because the projections are byte
 * exact and because the view draws with `white-space: pre-wrap`, so the
 * document keeps the line structure its author gave it. A run may therefore
 * carry a newline, and a strikethrough over one is invisible, which is
 * harmless here: the line break it sits on is drawn either way.
 *
 * WHAT THIS FILE MAY NEVER GROW. No accept and no reject: accepting a change
 * means writing a file, which the backlog entry refuses by name. Nothing here
 * reaches an IPC bridge, opens a file or writes anything.
 */

import { diffLines } from 'diff';
import {
  newTextOf,
  redlineRuns,
  REDLINE_MAX_BLOCK_CHARS,
  REDLINE_MAX_BLOCKS
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
  /** The whole document, in order. Adjacent runs never share a kind. */
  runs: RedlineRun[];
  /** How many change blocks the line partition found. */
  blocks: number;
  /**
   * How many of them drew WHOLE, being the old text as one deletion and the
   * new text as one insertion, and why: the character budget, the word
   * guard giving up, the block cap, or the repair refusing. The last should
   * be zero and the gate prints it.
   */
  whole: {
    tooBig: number;
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
}

const NO_WHOLE = { tooBig: 0, tooDifferent: 0, overCap: 0, unaligned: 0 };

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

/** One change block of the line partition. */
interface LineBlock {
  kind: 'same' | 'change';
  oldText: string;
  newText: string;
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
      approximate: false
    };
  }
  const { blocks, approximate } = linePartition(oldText, newText);
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

  return { runs, blocks: count, whole, approximate };
}

/**
 * One short sentence for the banner under the document, or null when every
 * block drew as words. "Drawn whole" is the phrase, because that is what the
 * reader sees: the paragraph struck through and the paragraph that replaced
 * it, rather than the words that moved inside it.
 */
export function redlineDocumentNote(doc: RedlineDocument): string | null {
  const { tooBig, tooDifferent, overCap, unaligned } = doc.whole;
  const total = tooBig + tooDifferent + overCap + unaligned;
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
    if (overCap > 0) why.push(`${String(overCap)} past the first ${String(REDLINE_MAX_BLOCKS)}`);
    parts.push(
      `${String(total)} change${total === 1 ? '' : 's'} drawn whole rather than word by word (${why.join(', ')}).`
    );
  }
  return parts.length === 0 ? null : parts.join(' ');
}
