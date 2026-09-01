/**
 * How a diff is drawn, and where that choice is kept (Phase 185).
 *
 * A PURE LEAF ON PURPOSE. It imports nothing but a type, so the editor store
 * can read the persisted choice at construction without dragging @pierre/diffs
 * and @pierre/trees into the boot chunk. The first cut of this phase put these
 * functions in ./diff-render-options, which imports ./theme-bridge for the
 * registered theme, and the store's one import grew the eager set past the
 * probe-containment budget. RE-MEASURED at the phase's tip rather than carried
 * forward: the counterfactual was built twice, once by moving these functions
 * bodily into ./diff-render-options and once by re-exporting them from it, and
 * the two routes agree at 2,140,596 and 2,140,589 raw bytes against this
 * tree's 1,980,400, being a growth of 160,196 and 160,189 against a budget of
 * 2,000,000. The figure recorded first, 161,871, reproduces by neither route.
 * The values are needed in two places that are otherwise far apart, being the
 * worker pool before any React state exists and the store, so a leaf with no
 * imports is the shape.
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
 * measured over a real 53-insertion, 62-deletion commit to this repository's
 * PierreDiff.tsx, counting the `data-diff-span` elements. TWO ROUTES, and they
 * do not give the same numbers, so each is labelled with where it came from.
 *
 * Through Pierre's own server renderer, which renders the WHOLE file:
 *
 *   none      0 spans      — nothing inside the row is picked out
 *   word      220 spans, 1,555 highlighted characters
 *   word-alt  71 spans, 1,723 highlighted characters
 *   char      359 spans, 1,177 highlighted characters
 *
 * Out of the RUNNING APP, read off the shadow DOM by `npm run probe:p185` over
 * that same pair. Every count is lower because the surface is virtualized: the
 * diff scrolls inside `.ed-pierre` and Pierre materializes a window of rows,
 * not the file. These are the numbers a person is looking at, and the probe is
 * what re-derives them:
 *
 *   none      0 spans
 *   word      188 spans, 1,262 highlighted characters
 *   word-alt  45 spans, 1,420 highlighted characters
 *   char      311 spans, 950 highlighted characters
 *
 * The two routes agree on everything the words below claim, being the ORDER
 * and the RATIOS: word-alt draws the fewest spans over the most text and char
 * the most spans over the least, on both.
 *
 * `word` and `word-alt` run the SAME diff (jsdiff `diffWordsWithSpace`) and
 * differ only in how the result is packed into spans:
 * utils/parseDiffDecorations.js `pushOrJoinSpan` merges neighbouring runs, and
 * swallows a one-character unchanged gap, when `enableJoin` is on — which is
 * `lineDiffType === 'word-alt'` and nothing else. That is why word-alt draws a
 * fraction of the spans over MORE text: it paints the whole changed phrase in
 * one patch where `word` paints each changed word separately. The fraction is
 * a third through the server renderer (71 against 220) and a quarter through
 * the app (45 against 188), so name the route when you quote it. `char` runs
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
const LS_REDLINE = 'gmux.diffRedline';

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

/**
 * The redline (Phase 191). OFF is what shipped before it, because the redline
 * is a THIRD reading of a change offered underneath the two rows that are
 * already there rather than a replacement for them, and a person who never
 * opens the control sees the diff they already knew.
 *
 * It keeps its key beside the other two because they are one question asked
 * three ways, being how this change is drawn, and this file is the leaf that
 * owns those keys. It imports nothing, which is why the store can read all
 * three at construction without dragging @pierre/diffs into the boot chunk.
 */
export function readDiffRedline(): boolean {
  try {
    return localStorage.getItem(LS_REDLINE) === '1';
  } catch {
    return false;
  }
}

export function writeDiffRedline(on: boolean): void {
  try {
    localStorage.setItem(LS_REDLINE, on ? '1' : '0');
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
