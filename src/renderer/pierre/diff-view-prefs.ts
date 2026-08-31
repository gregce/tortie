/**
 * How a diff is drawn, and where that choice is kept (Phase 185).
 *
 * A PURE LEAF ON PURPOSE. It imports nothing but a type, so the editor store
 * can read the persisted choice at construction without dragging @pierre/diffs
 * and @pierre/trees into the boot chunk. The first cut of this phase put these
 * functions in ./diff-render-options, which imports ./theme-bridge for the
 * registered theme, and the store's one import grew the eager set by 161,871
 * bytes and failed the probe-containment budget. The values are needed in two
 * places that are otherwise far apart, being the worker pool before any React
 * state exists and the store, so a leaf with no imports is the shape.
 *
 * ONE SETTING FOR THE WHOLE APP, never per file and never per project: a diff
 * you re-open drawn differently from the one you just closed is an annoyance
 * rather than a setting.
 */

import type { LineDiffTypes } from '@pierre/diffs';

/**
 * How much of a changed line is picked out inside the row.
 *
 * These are @pierre/diffs' own four `LineDiffTypes`, and the label is what a
 * person reads. The names are not self-explaining, so what each one DRAWS was
 * measured through Pierre's own server renderer over a real 53-insertion,
 * 62-deletion commit to this repository's PierreDiff.tsx, counting the
 * `data-diff-span` elements it emitted:
 *
 *   none      0 spans      — nothing inside the row is picked out
 *   word      220 spans, 1,555 highlighted characters
 *   word-alt  71 spans, 1,723 highlighted characters
 *   char      359 spans, 1,177 highlighted characters
 *
 * `word` and `word-alt` run the SAME diff (jsdiff `diffWordsWithSpace`) and
 * differ only in how the result is packed into spans:
 * utils/parseDiffDecorations.js `pushOrJoinSpan` merges neighbouring runs, and
 * swallows a one-character unchanged gap, when `enableJoin` is on — which is
 * `lineDiffType === 'word-alt'` and nothing else. That is why word-alt draws a
 * third of the spans over MORE text: it paints the whole changed phrase in one
 * patch where `word` paints each changed word separately. `char` runs
 * `diffChars` instead and can land inside a word, which is why it covers the
 * least text of the three.
 *
 * NOTE THE SHAPE THIS SITS IN. Pierre draws a changed line as TWO block rows,
 * deletion above addition, because renderTwoFiles highlights the two sides as
 * independent documents (docs/research/73-prose-redline.md §2). None of these
 * modes is a strikethrough-and-insert redline, and Pierre's stylesheet
 * contains `line-through` zero times. They choose how much of each row is
 * washed, not how the two rows relate.
 */
export interface InlineDiffMode {
  /** @pierre/diffs' own value, passed straight through. */
  readonly id: LineDiffTypes;
  /** The word on the control. */
  readonly label: string;
  /** What it draws, on hover. */
  readonly hint: string;
}

export const INLINE_DIFF_MODES: readonly InlineDiffMode[] = [
  { id: 'none', label: 'Off', hint: 'Mark the row, and nothing inside it' },
  { id: 'word', label: 'Words', hint: 'Pick out each changed word' },
  {
    id: 'word-alt',
    label: 'Phrases',
    hint: 'Pick out a run of changed words as one'
  },
  {
    id: 'char',
    label: 'Characters',
    hint: 'Pick out only the characters that differ'
  }
];

/**
 * What shipped before Phase 185 made this a choice. It stays the default so a
 * person who never opens the control sees the diffs they already knew.
 */
export const DEFAULT_INLINE_DIFF_MODE: LineDiffTypes = 'word';

export function isInlineDiffMode(value: unknown): value is LineDiffTypes {
  return INLINE_DIFF_MODES.some((m) => m.id === value);
}

const LS_INLINE_MODE = 'gmux.diffInlineMode';
const LS_BACKGROUNDS = 'gmux.diffBackgrounds';

export function readInlineDiffMode(): LineDiffTypes {
  try {
    const raw = localStorage.getItem(LS_INLINE_MODE);
    return isInlineDiffMode(raw) ? raw : DEFAULT_INLINE_DIFF_MODE;
  } catch {
    return DEFAULT_INLINE_DIFF_MODE;
  }
}

export function writeInlineDiffMode(mode: LineDiffTypes): void {
  try {
    localStorage.setItem(LS_INLINE_MODE, mode);
  } catch {
    /* cosmetic preference only */
  }
}

/** The full-width row wash. On is what shipped before Phase 185. */
export function readDiffBackgrounds(): boolean {
  try {
    return localStorage.getItem(LS_BACKGROUNDS) !== '0';
  } catch {
    return true;
  }
}

export function writeDiffBackgrounds(on: boolean): void {
  try {
    localStorage.setItem(LS_BACKGROUNDS, on ? '1' : '0');
  } catch {
    /* cosmetic preference only */
  }
}
