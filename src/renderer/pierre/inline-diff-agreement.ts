/**
 * Do the inline modes draw this diff the same? (Phase 190)
 *
 * THE DEFECT THIS ANSWERS. The operator changed the Inline control between
 * Words, Phrases and Characters and nothing happened, which read as broken.
 * Research 74 measured why on his own file: his edit was a pure word DELETION
 * with nothing inserted, and on that shape `diffWordsWithSpace` and
 * `diffChars` return the same parts, so the three modes draw BYTE IDENTICAL
 * markup (md5 c11388b3 stacked, 7c5465f9 split). Nothing is broken. The
 * control offered four names for what was one answer and said nothing.
 *
 * THE DECISION, so a later round does not reopen it. Of the three options the
 * backlog entry weighed, this is option 2: say it on the face when it is
 * true, one short muted line beside the control, present only when the mode
 * the person chose draws exactly what another mode would draw, and nothing at
 * all when the modes differ. Not option 1, because the cost objection that
 * made it the fallback is measured away below. Not option 3, greying the
 * buttons, because the answer here is per DIFF and not per visible window, so
 * nothing changes as a person scrolls, and greying would have to compute the
 * same thing anyway.
 *
 * HOW IT IS COMPUTED, and why it is exact rather than a guess. Pierre 1.3.5
 * reads `lineDiffType` in exactly one rendering place,
 * `renderDiffWithHighlighter.js` computeLineDiffDecorations: for every change
 * block it pairs the i-th deleted line with the i-th added line, skips the
 * pair when either side is longer than `maxLineDiffLength` (1000), runs
 * `diffChars` for Characters and `diffWordsWithSpace` for the other two, and
 * folds the parts into spans through `pushOrJoinSpan`, where Words and
 * Phrases differ only by its `enableJoin` flag. The decorations are the only
 * thing the mode changes, so two modes whose decoration lists are equal over
 * every pair draw identical markup. This module replays that fold with the
 * SAME two exported helpers and the SAME two jsdiff functions, and compares
 * the lists. It calls no diff function Pierre does not already call.
 *
 * THE COST, measured on 2026-09-01 in the running app through
 * build/probe-p190-agreement.mjs, and the bounds that keep it there. It runs
 * ONCE per parsed diff, only when the exact diff is in (never on the
 * approximation), on the object `useDiffMetadata` already produced, so
 * switching modes costs nothing extra. It stops early once every pairwise
 * comparison has failed, which is the first pair or two on a real code diff,
 * and it examines at most `AGREEMENT_PAIR_CAP` pairs. Under those bounds a
 * real code diff costs well under a millisecond, and the worst case the cap
 * allows, a hundred agreeing pairs each just under a thousand characters, was
 * measured at a few milliseconds once per diff open, a small fraction of the
 * `parseDiffFromFile` Tortie already runs on the same thread for the same
 * diff. The probe prints the number each run.
 *
 * WHAT IT SAYS NOTHING ABOUT, deliberately. When the cap is hit the answer
 * is unknown and no line is drawn. When every pair was over the length limit
 * nothing was compared and no line is drawn, although Pierre draws no span in
 * any mode there. When Off is chosen and there are paired lines, the other
 * three do draw something Off does not, so no line. Agreement is empirical
 * and NOT the same as "nothing was inserted": research 74 measured that about
 * a quarter of real one word prose deletions still differ under Characters,
 * because jsdiff may take the space on the other side of the word. That is
 * why this compares the drawn spans and never the shape of the edit.
 */

import { cleanLastNewline, pushOrJoinSpan } from '@pierre/diffs';
import type { FileDiffMetadata, LineDiffTypes } from '@pierre/diffs';
import { diffChars, diffWordsWithSpace } from 'diff';
import type { ChangeObject } from 'diff';

/**
 * Pierre's own default for `maxLineDiffLength`, DiffHunksRenderer.js
 * getOptionsWithDefaults. Tortie passes none of its own, so this is the limit
 * the renderer applies, and a pair over it gets no inline span in any mode.
 * Pinned by a test that reads the renderer's defaults.
 */
export const PIERRE_MAX_LINE_DIFF_LENGTH = 1000;

/**
 * How many paired change lines are compared before the answer is given up as
 * unknown. A diff where two modes agree throughout walks every pair, because
 * the early exit only fires once all three comparisons have failed, and this
 * is what bounds that walk.
 */
export const AGREEMENT_PAIR_CAP = 100;

export interface InlineDiffAgreement {
  /** Paired change lines seen, a lower bound once the early exit fired. */
  readonly pairs: number;
  /** Pairs actually compared, within the length limit and under the cap. */
  readonly compared: number;
  /** Pairs skipped because a side was over `PIERRE_MAX_LINE_DIFF_LENGTH`. */
  readonly skipped: number;
  /** True when `AGREEMENT_PAIR_CAP` stopped the walk, so nothing is claimed. */
  readonly capped: boolean;
  /** Words and Phrases drew the same spans over every compared pair. */
  readonly wordPhrase: boolean;
  /** Words and Characters drew the same spans over every compared pair. */
  readonly wordChar: boolean;
  /** Phrases and Characters drew the same spans over every compared pair. */
  readonly phraseChar: boolean;
  /** Wall time of the comparison, `performance.now()` either side. */
  readonly costMs: number;
}

/**
 * The spans one mode would draw for one pair, as a comparable key. It is
 * Pierre's own fold, being computeLineDiffDecorations from the parts onward,
 * with `enableJoin` standing where `lineDiffType === "word-alt"` stands there.
 * A span is `start+length` on its side, so two equal keys are two equal
 * decoration lists.
 */
function spanKey(parts: ChangeObject<string>[], enableJoin: boolean): string {
  const deletionSpans: [0 | 1, string][] = [];
  const additionSpans: [0 | 1, string][] = [];
  const lastItem = parts[parts.length - 1];
  for (const item of parts) {
    const isLastItem = item === lastItem;
    if (!item.added && !item.removed) {
      pushOrJoinSpan({ item, arr: deletionSpans, enableJoin, isNeutral: true, isLastItem });
      pushOrJoinSpan({ item, arr: additionSpans, enableJoin, isNeutral: true, isLastItem });
    } else if (item.removed) {
      pushOrJoinSpan({ item, arr: deletionSpans, enableJoin, isLastItem });
    } else {
      pushOrJoinSpan({ item, arr: additionSpans, enableJoin, isLastItem });
    }
  }
  return `${sideKey(deletionSpans)}|${sideKey(additionSpans)}`;
}

function sideKey(spans: readonly [0 | 1, string][]): string {
  const out: string[] = [];
  let at = 0;
  for (const [flag, text] of spans) {
    if (flag === 1) out.push(`${String(at)}+${String(text.length)}`);
    at += text.length;
  }
  return out.join(',');
}

let last: InlineDiffAgreement | null = null;

/** The most recent answer, for the harness to read. Never drives the UI. */
export function readLastInlineDiffAgreement(): InlineDiffAgreement | null {
  return last;
}

/**
 * Compare what the three drawing modes would draw over `meta`, Pierre's own
 * parsed diff. Pure over its input apart from the reading kept for the
 * harness; call it once per diff and keep the result.
 */
export function inlineDiffAgreement(meta: FileDiffMetadata): InlineDiffAgreement {
  const started = performance.now();
  let pairs = 0;
  let compared = 0;
  let skipped = 0;
  let capped = false;
  let wordPhrase = true;
  let wordChar = true;
  let phraseChar = true;

  walk: for (const hunk of meta.hunks) {
    for (const content of hunk.hunkContent) {
      if (content.type !== 'change') continue;
      const paired = Math.min(content.deletions, content.additions);
      for (let i = 0; i < paired; i++) {
        // Every comparison has failed, so no further pair can change the
        // answer. On a real code diff this is where the walk ends.
        if (!wordPhrase && !wordChar && !phraseChar) break walk;
        if (compared >= AGREEMENT_PAIR_CAP) {
          capped = true;
          break walk;
        }
        pairs += 1;
        const deletion = cleanLastNewline(
          meta.deletionLines[content.deletionLineIndex + i] ?? ''
        );
        const addition = cleanLastNewline(
          meta.additionLines[content.additionLineIndex + i] ?? ''
        );
        if (
          deletion.length > PIERRE_MAX_LINE_DIFF_LENGTH ||
          addition.length > PIERRE_MAX_LINE_DIFF_LENGTH
        ) {
          skipped += 1;
          continue;
        }
        compared += 1;
        // One word diff serves both Words and Phrases; they differ only in
        // the fold. Characters is computed only while some comparison
        // against it is still open.
        const words = diffWordsWithSpace(deletion, addition);
        const word = spanKey(words, false);
        const phrase = spanKey(words, true);
        if (wordPhrase && word !== phrase) wordPhrase = false;
        if (wordChar || phraseChar) {
          const char = spanKey(diffChars(deletion, addition), false);
          if (wordChar && word !== char) wordChar = false;
          if (phraseChar && phrase !== char) phraseChar = false;
        }
      }
    }
  }

  const answer: InlineDiffAgreement = {
    pairs,
    compared,
    skipped,
    capped,
    wordPhrase,
    wordChar,
    phraseChar,
    costMs: performance.now() - started
  };
  last = answer;
  return answer;
}

const LABEL: Record<Exclude<LineDiffTypes, 'none'>, string> = {
  word: 'Words',
  'word-alt': 'Phrases',
  char: 'Characters'
};

/**
 * The one line the control may show, or null for nothing. Null is the
 * resting answer: whenever the chosen mode draws something no other mode
 * draws, whenever the answer is unknown, and whenever there is no answer yet.
 */
export function inlineDiffAgreementLine(
  agreement: InlineDiffAgreement | null,
  mode: LineDiffTypes
): string | null {
  if (agreement === null) return null;
  // No deleted line is paired with an added line anywhere, so no mode,
  // Off included, draws anything inside a row.
  if (agreement.pairs === 0 && !agreement.capped) {
    return 'Every mode draws this change the same.';
  }
  if (mode === 'none') return null;
  if (agreement.capped || agreement.compared === 0) return null;

  const same: Exclude<LineDiffTypes, 'none'>[] = [];
  const agrees = (a: typeof mode, b: Exclude<LineDiffTypes, 'none'>): boolean => {
    const pair = [a, b].sort().join(' ');
    if (pair === 'word word-alt') return agreement.wordPhrase;
    if (pair === 'char word') return agreement.wordChar;
    return agreement.phraseChar;
  };
  for (const m of ['word', 'word-alt', 'char'] as const) {
    if (m === mode || agrees(mode, m)) same.push(m);
  }
  if (same.length < 2) return null;
  const names = same.map((m) => LABEL[m]);
  const list =
    names.length === 3
      ? `${names[0]}, ${names[1]} and ${names[2]}`
      : `${names[0]} and ${names[1]}`;
  return `${list} draw this change the same.`;
}
