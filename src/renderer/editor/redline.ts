/**
 * The redline, being what a change reads like when it is marked up the way a
 * person marks up a document (Phase 191).
 *
 * The operator asked for the deleted words struck through in red IMMEDIATELY
 * FOLLOWED by the inserted words, inline, on one flowing line. Phase 185 chose
 * how much of each ROW is washed; it never touched how the two rows RELATE,
 * and it could not have. Every @pierre/diffs line is a grid item of a subgrid,
 * so its display is blockified by the CSS specification and no stylesheet can
 * undo it (docs/research/74-redline-in-the-diff-view.md §3). Pierre cannot
 * draw a redline. It can HOLD one, in a light-DOM annotation row it hands
 * back, and that is what this module computes the contents of.
 *
 * ## The rulings this file implements, each decided from a measurement
 *
 * 1. ONE REDLINE PER CHANGE BLOCK, NOT PER LINE. Three deleted lines and one
 *    inserted line is not one pair. `hunk.hunkContent` already groups
 *    consecutive `-` and `+` lines into a single `ChangeContent`, so the block
 *    is read straight off it, both sides are joined, every run of whitespace
 *    INCLUDING the newlines is normalised to one space, and `diffWords` is
 *    called once over the pair. That is what stops research 74 §6.5's
 *    strikethrough over an invisible newline.
 *
 * 2. THE ANCHOR is the LAST line of the block on the addition side, so the row
 *    lands under the whole block instead of splitting the deletion group. A
 *    block with no additions anchors on its last deletion instead. Pierre
 *    keyed its annotation maps by the FILE line number rather than by an index
 *    into `additionLines` (`utils/iterateOverDiff.js`), and the two are equal
 *    only for a diff parsed from whole files. The coarse path in
 *    ../pierre/diff-metadata parses a PATCH, where they are not, so the number
 *    is derived from the hunk header the way Pierre derives it.
 *
 * 3. PROSE ONLY, by a narrow extension allowlist in the exact shape of
 *    ./markdown/markdown-path.ts. A redline row is proportional and reflowing,
 *    which is what makes it read like a marked-up document and is exactly what
 *    destroys the only structure a line of source has. `diffWords` is a word
 *    tokenizer, and research 74 §2.4 measured a real code change giving 311
 *    character-level spans of confetti. The operator's own file is
 *    `test/test.txt`, which is not markdown, so the set is the markdown
 *    extensions plus `txt` and `text`. Widening it is one line, and it costs
 *    an `.rst`, an `.adoc` and an `.org` until somebody asks.
 *
 * 4. THE CAPS ARE REQUIRED, not advisory, because
 *    `dist/react/utils/renderDiffChildren.js` maps over `lineAnnotations`
 *    UNCONDITIONALLY: every annotation's React subtree mounts whether or not
 *    its row is inside the virtualizer's window. Three of them, and the
 *    numbers were measured rather than guessed (build/conformance-redline.mjs
 *    re-runs the measurement and fails if it moves):
 *      - `maxEditLength`, so a fully rewritten block gives up instead of
 *        hanging. Myers is O(ND). At 400 a pathological 60-block file cost
 *        594 ms; at 200 it costs 199 ms and a realistic 40-word edit inside an
 *        830-word block is untouched at 1.9 ms. 200 it is.
 *      - a per-block character budget, so an enormous block is skipped before
 *        the tokenizer ever sees it.
 *      - a whole-file block cap, so the mounted subtree is bounded.
 *    Anything skipped is SAID, through the surface's existing `ed-note`
 *    banner, rather than silently missing.
 *
 * 5. A WHITESPACE ONLY CHANGE SAYS SO, and it is the one thing this module
 *    cannot draw. Ruling 1's normalisation collapses every run of whitespace,
 *    including the newlines, to one space, which is what lets three lines read
 *    as one sentence. When the ONLY difference between the two sides is
 *    whitespace, that normalisation makes them identical, `diffWords` returns
 *    one unchanged run, and the row would draw the sentence with nothing
 *    marked at all under a pair of rows Pierre has painted red and green.
 *    Measured on 2026-09-01 in the running app: "Spaced   out     words
 *    here." becoming "Spaced out words here." drew one plain span, and four
 *    leading spaces becoming a tab drew one plain span. A row that says
 *    nothing changed under a block the diff says changed is the same "it looks
 *    broken" picture that started this phase, and on markdown it is worse than
 *    cosmetic, because four spaces against a tab is the difference between a
 *    paragraph and a code block. So the block is flagged `whitespaceOnly` and
 *    ./RedlineRow draws a short tag on it. Silence was refused: a row that is
 *    missing is not a row that explains itself, and this is the one case where
 *    the two rows above are the only honest reading.
 *
 * 6. THE ORDER OF THE RUNS IS JSDIFF'S OWN, AND IT IS NOT ALWAYS A PAIR. The
 *    obvious reading of the operator's sentence, being that a deletion is
 *    always immediately followed by its insertion, is TRUE for a word replaced
 *    in place and FALSE in general, and this file used to assert the general
 *    form. Measured on 2026-09-01, in the running app and independently by
 *    calling jsdiff from a script: three lines becoming one, being "Red lorry
 *    stands still. Yellow lorry moves fast. Green lorry waits here." to "Red
 *    yellow and green lorry waits here.", draws
 *
 *      same "Red " | ins "yellow and green " | same "lorry " |
 *      del "stands still. Yellow lorry moves fast. Green lorry " |
 *      same "waits here."
 *
 *    The insertion comes BEFORE the deletion and the two are not adjacent at
 *    all, because the shortest edit script keeps "Red " and "lorry " and
 *    "waits here." and moves everything else around them. That is the honest
 *    reading of what changed and the picture is defensible, so the runs are
 *    drawn in the order they arrive and are never reordered into pairs:
 *    reordering them would be drawing a diff nobody computed. What the
 *    operator asked for holds where it can hold, which is every in-place
 *    replacement, and the demonstration block draws four of them.
 *
 *    A related trap for anything that checks this by rectangles: in a right to
 *    left run the insertion is drawn to the LEFT of its deletion, so "the
 *    insertion's left edge is past the deletion's right edge" is false there
 *    for a reason that has nothing to do with the order of the runs.
 *
 * WHAT THIS FILE MAY NEVER GROW. No accept and no reject. Accepting a change
 * means WRITING A FILE, which is a different feature with different risks, and
 * the backlog entry refuses both by name. Nothing here opens a file, and
 * nothing here reaches an IPC bridge.
 */

import { diffWords } from 'diff';
import type { ChangeContent, FileDiffMetadata, Hunk } from '@pierre/diffs';
import { baseName } from './paths';

/**
 * Which files get a redline. Deliberately narrow, and the same shape and the
 * same reason as ./markdown/markdown-path.ts: this is a READING aid over
 * prose, and a file somebody opened to read as code must not have its
 * indentation reflowed away because its extension looked wordy.
 */
const REDLINE_EXTENSIONS = new Set([
  'md',
  'markdown',
  'mdown',
  'mkd',
  'mdx',
  'txt',
  'text'
]);

/** True for the prose extensions above (case-insensitive). */
export function isRedlinePath(path: string): boolean {
  const name = baseName(path).toLowerCase();
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return false;
  return REDLINE_EXTENSIONS.has(name.slice(dot + 1));
}

/**
 * The edit distance past which `diffWords` gives up and returns `undefined`.
 * See ruling 4 above for the two measurements that chose 200.
 */
export const REDLINE_MAX_EDIT_LENGTH = 200;

/**
 * The largest block, per side, in characters after normalisation. Past this
 * the block is skipped without calling the tokenizer at all. A redline over
 * four thousand characters is not something a person reads as a marked-up
 * sentence anyway.
 */
export const REDLINE_MAX_BLOCK_CHARS = 4_000;

/**
 * How many blocks in one file get a row. Every annotation's React subtree
 * mounts whether or not it is on screen, so this is the bound on the mounted
 * tree rather than a rendering nicety.
 */
export const REDLINE_MAX_BLOCKS = 60;

/** One run of the marked-up line. */
export interface RedlineRun {
  kind: 'same' | 'del' | 'ins';
  text: string;
}

/** One change block, drawn as one flowing line. */
export interface RedlineBlock {
  /** Which of Pierre's two sides the row hangs under. */
  side: 'additions' | 'deletions';
  /** Pierre's own file line number for that side, 1-based. */
  lineNumber: number;
  /** The runs, in document order. See ruling 6 for what that order is. */
  runs: RedlineRun[];
  /**
   * The two sides hold the SAME WORDS and only the spacing between them
   * changed, so there is nothing for the marked-up line to strike through.
   * Ruling 5 is why the row still draws and what it says.
   */
  whitespaceOnly: boolean;
}

export interface RedlineResult {
  blocks: RedlineBlock[];
  /**
   * How many change blocks got no row, and why, so the surface can say it.
   * `tooBig` is the character budget, `tooDifferent` is `maxEditLength`
   * giving up, `overCap` is the whole-file block cap.
   */
  skipped: { tooBig: number; tooDifferent: number; overCap: number };
}

const EMPTY: RedlineResult = {
  blocks: [],
  skipped: { tooBig: 0, tooDifferent: 0, overCap: 0 }
};

/**
 * Every run of whitespace, newlines included, becomes one space, and the ends
 * are trimmed. This is what makes a three-lines-into-one change read as one
 * sentence, and it is why the original strings are never reconstructed from
 * the parts: `diffWords` does not round-trip the input (research 73 §5.1), and
 * this normalisation is lossy on purpose.
 */
export function normalizeBlockText(lines: readonly string[]): string {
  return lines.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * One `Intl.Segmenter`, built once and only if the engine has one.
 *
 * Without it `diffWords` splits a zero-width-joiner emoji cluster, which draws
 * as garbage under a strikethrough, and sees one enormous token in Japanese
 * (research 74 §7). It is deliberately typed loosely by jsdiff itself, so the
 * cast is theirs rather than ours.
 */
let segmenter: Intl.Segmenter | null | undefined;
function wordSegmenter(): Intl.Segmenter | null {
  if (segmenter === undefined) {
    try {
      segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
    } catch {
      segmenter = null;
    }
  }
  return segmenter;
}

/**
 * The word-level runs for one pair of normalised strings, or null when the
 * guard gave up. Exported because the conformance gate re-derives it and the
 * verifier is asked to compare it against jsdiff called independently.
 */
export function redlineRuns(
  oldText: string,
  newText: string
): RedlineRun[] | null {
  const seg = wordSegmenter();
  const parts = diffWords(oldText, newText, {
    maxEditLength: REDLINE_MAX_EDIT_LENGTH,
    ...(seg !== null ? { intlSegmenter: seg } : {})
  });
  if (parts === undefined) return null;
  const runs: RedlineRun[] = [];
  for (const part of parts) {
    if (part.value === '') continue;
    runs.push({
      kind: part.added ? 'ins' : part.removed ? 'del' : 'same',
      text: part.value
    });
  }
  return runs;
}

/**
 * Pierre's own line number for a side of a hunk, derived the way
 * `utils/iterateOverDiff.js` derives it: the hunk header's start, less one
 * when that side has any lines at all, plus one, plus the block's offset from
 * the hunk's own start index on that side.
 */
function lineNumberFor(
  hunk: Hunk,
  block: ChangeContent,
  side: 'additions' | 'deletions'
): number {
  const start = side === 'additions' ? hunk.additionStart : hunk.deletionStart;
  const count = side === 'additions' ? hunk.additionCount : hunk.deletionCount;
  const hunkIndex =
    side === 'additions' ? hunk.additionLineIndex : hunk.deletionLineIndex;
  const blockIndex =
    side === 'additions' ? block.additionLineIndex : block.deletionLineIndex;
  const rows = side === 'additions' ? block.additions : block.deletions;
  const first = start - (count === 0 ? 0 : 1) + 1;
  return first + (blockIndex - hunkIndex) + rows - 1;
}

/** The lines of one side of a block, straight out of the metadata's arrays. */
function sliceLines(
  all: readonly string[],
  from: number,
  count: number
): string[] {
  const out: string[] = [];
  for (let i = from; i < from + count; i++) {
    const line = all[i];
    if (line !== undefined) out.push(line);
  }
  return out;
}

/**
 * Every change block in a diff, as one redline each.
 *
 * A block with nothing on one side still draws, and it draws as all struck
 * through or all inserted. That is correct, and it is also the picture
 * research 74 warns about: on a pure DELETION a redline and a plain
 * strikethrough are the same thing in every implementation including Word's,
 * so a demonstration of this feature must use a pair that REPLACES words.
 */
export function redlineBlocks(meta: FileDiffMetadata): RedlineResult {
  const blocks: RedlineBlock[] = [];
  const skipped = { tooBig: 0, tooDifferent: 0, overCap: 0 };

  for (const hunk of meta.hunks) {
    for (const content of hunk.hunkContent) {
      if (content.type !== 'change') continue;
      if (blocks.length >= REDLINE_MAX_BLOCKS) {
        skipped.overCap += 1;
        continue;
      }
      const oldText = normalizeBlockText(
        sliceLines(meta.deletionLines, content.deletionLineIndex, content.deletions)
      );
      const newText = normalizeBlockText(
        sliceLines(meta.additionLines, content.additionLineIndex, content.additions)
      );
      if (
        oldText.length > REDLINE_MAX_BLOCK_CHARS ||
        newText.length > REDLINE_MAX_BLOCK_CHARS
      ) {
        skipped.tooBig += 1;
        continue;
      }
      const side = content.additions > 0 ? 'additions' : 'deletions';
      // RULING 5. The two sides are the same words. `normalizeBlockText` is
      // what made them the same, so the marked-up line CANNOT show this change
      // and must not pretend the block is unchanged. The block is flagged and
      // the row says so. See the ruling above for why silence was refused.
      if (oldText === newText) {
        blocks.push({
          side,
          lineNumber: lineNumberFor(hunk, content, side),
          runs: oldText === '' ? [] : [{ kind: 'same', text: oldText }],
          whitespaceOnly: true
        });
        continue;
      }
      const runs = redlineRuns(oldText, newText);
      if (runs === null) {
        skipped.tooDifferent += 1;
        continue;
      }
      blocks.push({
        side,
        lineNumber: lineNumberFor(hunk, content, side),
        runs,
        whitespaceOnly: false
      });
    }
  }

  return blocks.length === 0 && skipped.tooBig === 0 &&
    skipped.tooDifferent === 0 && skipped.overCap === 0
    ? EMPTY
    : { blocks, skipped };
}

/** The key an annotation is found by: Pierre gives back only side and number. */
export function redlineKey(side: string, lineNumber: number): string {
  return `${side}:${String(lineNumber)}`;
}

/**
 * What the clipboard gets for one block: the NEW text, being the plain runs
 * and the insertions with the deletions dropped.
 *
 * The redline is a reading aid over a change that already happened, and what a
 * person wants to paste into a message or a commit body is the resulting
 * sentence. The old text is one row above and copies cleanly from Pierre's own
 * deletion row, so nothing is lost.
 */
export function newTextOf(runs: readonly RedlineRun[]): string {
  return runs
    .filter((run) => run.kind !== 'del')
    .map((run) => run.text)
    .join('');
}

/** The interleaved text a browser's own serializer would take from the row. */
export function drawnTextOf(runs: readonly RedlineRun[]): string {
  return runs.map((run) => run.text).join('');
}

/** One short sentence naming what got no row, or null when nothing did. */
export function redlineSkipNote(result: RedlineResult): string | null {
  const { tooBig, tooDifferent, overCap } = result.skipped;
  const total = tooBig + tooDifferent + overCap;
  if (total === 0) return null;
  const why: string[] = [];
  if (tooDifferent > 0) why.push(`${String(tooDifferent)} rewritten`);
  if (tooBig > 0) why.push(`${String(tooBig)} too long`);
  if (overCap > 0) why.push(`${String(overCap)} past the first ${String(REDLINE_MAX_BLOCKS)}`);
  return `${String(total)} change${total === 1 ? '' : 's'} ${total === 1 ? 'has' : 'have'} no redline (${why.join(', ')}). The two rows above each one still show it.`;
}
