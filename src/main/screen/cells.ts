/**
 * A ROW'S TEXT INTO TMUX'S OWN CELLS (Phase 337, build/p337/SPEC.md §5.3.4,
 * D10, §14 M5 to M7).
 *
 * The phone draws each run in a box of exactly the columns tmux gave it, so
 * the composer must cut a row into cells the way tmux did. A code point's
 * width alone is ./cell-widths.ts (tmux 3.7b's own answer, measured); how code
 * points JOIN is the seven sequence rules measured on 281 sequences
 * (build/fixtures/screen/tmux-sequences.json), and src/main/screen/__tests__/
 * cells.test.ts holds every one of them:
 *
 *  1. VS16 (U+FE0F) joins the cell before it and widens it to 2;
 *  2. VS15 (U+FE0E) joins it and keeps its width;
 *  3. a ZWJ (U+200D) joins it, and joins the NEXT code point into it too;
 *  4. a regional-indicator pair is one cell of 2, a lone one a cell of 1;
 *  5. a skin tone (U+1F3FB to U+1F3FF) joins a base of emoji presentation, and
 *     after any other is its own cell (of 2, by its width);
 *  6. a keycap (`1`, VS16, U+20E3) is one cell of 2, by rules 1 and 7;
 *  7. a code point of width 0 joins the cell before it, and Hangul medial and
 *     final jamo join a syllable or a leading jamo whatever their own width.
 *
 * A zero-width code point with no cell before it is dropped: tmux draws none
 * there (§14 M1: a lone VS16 and a ZWSP are absent from the capture).
 *
 * A TAB IS ITS OWN CELL. tmux 3.7b's `capture-pane -p` and `-e` both print a
 * tab as one `\t` and the columns it spans as nothing (measured by the screen
 * builder on 2026-10-05: `a\tb` reads `a\tb`, and the cursor after
 * `12345678\tz|` is at column 18). Its span depends on the column it starts
 * at, which only the composer knows, so here it is a cell marked `tab`.
 *
 * PURE. It imports only ./cell-widths and logs nothing.
 */

import { cellWidthOf } from './cell-widths';

/** One code point of a row, carrying whatever its caller tags it with (the composer: its pen). */
export interface TaggedPoint<T> {
  readonly ch: string;
  readonly tag: T;
}

/** One tmux cell: its text, its width, the tag of the code point that opened it, and whether it is a tab. */
export interface TaggedCell<T> {
  text: string;
  w: 1 | 2;
  readonly tag: T;
  readonly tab: boolean;
}

const ZWJ = 0x200d;
const VS15 = 0xfe0e;
const VS16 = 0xfe0f;
const TAB = '\t';

/** Emoji presentation, by the runtime's own Unicode tables. */
const EMOJI_PRESENTATION = /^\p{Emoji_Presentation}$/u;

function isRegionalIndicator(cp: number): boolean {
  return cp >= 0x1f1e6 && cp <= 0x1f1ff;
}

function isSkinTone(cp: number): boolean {
  return cp >= 0x1f3fb && cp <= 0x1f3ff;
}

/** A Hangul syllable or leading jamo: what medial and final jamo join (rule 7). */
function isHangulLead(cp: number): boolean {
  return (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0xa960 && cp <= 0xa97f) || (cp >= 0xac00 && cp <= 0xd7a3);
}

/** A Hangul medial or final jamo (rule 7). */
function isHangulTrail(cp: number): boolean {
  return (cp >= 0x1160 && cp <= 0x11ff) || (cp >= 0xd7b0 && cp <= 0xd7ff);
}

/** One cell under construction, with the two facts the rules ask of it. */
interface Building<T> extends TaggedCell<T> {
  /** 1 for a lone regional indicator, 2 once paired, 0 otherwise. */
  ri: 0 | 1 | 2;
  hangul: boolean;
}

/**
 * Code points into tmux's cells, by the seven measured rules. Each cell
 * carries the tag of the code point that opened it; a code point that joins a
 * cell takes that cell's tag, as tmux gives a cell one style.
 */
export function clusterCells<T>(points: Iterable<TaggedPoint<T>>): TaggedCell<T>[] {
  const cells: Building<T>[] = [];
  let joinNext = false;
  for (const point of points) {
    const ch = point.ch;
    const cp = ch.codePointAt(0) ?? 0;
    if (ch === TAB) {
      cells.push({ text: TAB, w: 1, tag: point.tag, tab: true, ri: 0, hangul: false });
      joinNext = false;
      continue;
    }
    const last = cells[cells.length - 1];
    const open = last !== undefined && !last.tab ? last : undefined;
    if (open !== undefined) {
      if (joinNext) {
        // Rule 3: the code point after a ZWJ joins whatever it is.
        open.text += ch;
        joinNext = false;
        continue;
      }
      if (cp === ZWJ) {
        open.text += ch;
        joinNext = true;
        continue;
      }
      if (cp === VS16) {
        // Rule 1.
        open.text += ch;
        open.w = 2;
        continue;
      }
      if (cp === VS15) {
        // Rule 2.
        open.text += ch;
        continue;
      }
      if (isRegionalIndicator(cp) && open.ri === 1) {
        // Rule 4: the pair's second half.
        open.text += ch;
        open.w = 2;
        open.ri = 2;
        continue;
      }
      if (isSkinTone(cp) && EMOJI_PRESENTATION.test(String.fromCodePoint(open.text.codePointAt(0) ?? 0))) {
        // Rule 5.
        open.text += ch;
        continue;
      }
      if (isHangulTrail(cp) && open.hangul) {
        // Rule 7, the jamo half.
        open.text += ch;
        continue;
      }
    }
    const w = cellWidthOf(cp);
    if (w === 0) {
      // Rule 7: width 0 joins the cell before it, or is not drawn at all.
      if (open !== undefined) open.text += ch;
      continue;
    }
    const ri = isRegionalIndicator(cp);
    cells.push({ text: ch, w: ri ? 1 : w, tag: point.tag, tab: false, ri: ri ? 1 : 0, hangul: isHangulLead(cp) });
  }
  return cells.map(({ text, w, tag, tab }) => ({ text, w, tag, tab }));
}

/**
 * A string into tmux's cells: `{ text, w }` per cell, by the seven rules. A
 * tab answers as a cell of width 1 here, because its real span depends on its
 * column; the composer, which knows the column, gives it the span.
 */
export function cellsOf(text: string): { text: string; w: 1 | 2 }[] {
  const points: TaggedPoint<null>[] = [];
  for (const ch of text) points.push({ ch, tag: null });
  return clusterCells(points).map(({ text: t, w }) => ({ text: t, w }));
}
