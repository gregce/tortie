/**
 * A ROW'S TEXT INTO TMUX'S OWN CELLS (Phase 337, build/p337/SPEC.md §5.3.4,
 * D10, §14 M5 to M7).
 *
 * The phone draws each run in a box of exactly the columns tmux gave it, so
 * the composer must cut a row into cells the way tmux did. A code point's
 * width alone is ./cell-widths.ts (tmux's own answer, measured); how code
 * points JOIN is the seven sequence rules measured on 281 sequences
 * (build/fixtures/screen/tmux-sequences.json), and src/shared/__tests__/
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
 * ONE SPELLING OF THE SEVEN RULES (Phase 368, build/p368/SPEC.md §4.2, D8).
 * The rules are `nextCell`: one code point against a small integer of state,
 * answering whether it joins the open cell, the width of the cell it leaves
 * open, and the state after it. Two readers call it and nothing else spells a
 * rule: `clusterCells` below, which cuts a captured row for the phone, and
 * src/renderer/terminal/tmux-widths.ts, which hands the same step to xterm as
 * the Mac's terminal prints, so the phone and the Mac cannot cut a row two
 * ways. The state is what the rules ask of the open cell and nothing more:
 * its width, a ZWJ waiting to join the next code point, a lone regional
 * indicator, a Hangul lead, and a first code point of emoji presentation.
 * Zero means no open cell, which is what xterm hands back after every control
 * and escape sequence, as a tab ends a cell here. `clusterCells` and `cellsOf`
 * answer for the 3.7b table exactly what they answered before the step
 * existed (cells.test.ts holds the two against the Phase 337 loop it
 * replaced), so the phone is unchanged (D9).
 *
 * PURE. It imports only ./cell-widths and logs nothing. What it remembers is
 * only what the runtime already answered, so it never asks twice whether a
 * code point has emoji presentation.
 */

import { cellWidthIn, type CellWidthTable } from './cell-widths';

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

/**
 * What the rules know of the open cell, as a small integer (at most six bits):
 * the open cell's width in the low two (0 when no cell is open), then four
 * flags. Zero is no open cell.
 */
export type CellState = number;

/** No open cell: the start of a row, after a tab, and after xterm's every control or escape sequence. */
export const NO_CELL: CellState = 0;

/** One code point's step through the rules. */
export interface CellStep {
  /**
   * True when the code point takes no cell of its own: it joins the open cell,
   * or, with none open (`width` 0), it is not drawn.
   */
  readonly join: boolean;
  /**
   * The width of the cell this code point opens or joins: the new cell's, or
   * the open cell's after the join; 0 for a code point that is not drawn. It is
   * also the open cell's width in `state`, but for a tab, a cell of 1 that
   * leaves nothing open.
   */
  readonly width: 0 | 1 | 2;
  /** The state after this code point. */
  readonly state: CellState;
}

/** The open cell's width, in the state's low two bits. */
const OPEN = 0b11;
/** A ZWJ joined the open cell, so the next code point joins it too (rule 3). */
const ZWJ_WAITS = 1 << 2;
/** The open cell is a lone regional indicator (rule 4). */
const LONE_RI = 1 << 3;
/** The open cell began with a Hangul syllable or a leading jamo (rule 7). */
const HANGUL_LEAD = 1 << 4;
/** The open cell began with a code point of emoji presentation (rule 5). */
const EMOJI_BASE = 1 << 5;
/** Every bit a state may hold. */
const STATE_BITS = OPEN | ZWJ_WAITS | LONE_RI | HANGUL_LEAD | EMOJI_BASE;

const TAB_CP = 0x09;
const ZWJ = 0x200d;
const VS15 = 0xfe0e;
const VS16 = 0xfe0f;
const TAB = '\t';

/** A code point that takes no cell and finds none open: not drawn. */
const NOT_DRAWN: CellStep = Object.freeze({ join: true, width: 0, state: NO_CELL });

/**
 * Every step there can be, made once and frozen, so a step allocates nothing:
 * xterm asks for one on every code point it prints. Indexed as xterm encodes a
 * code point's properties, `(state << 3) | (width << 1) | join`.
 */
const STEPS: readonly CellStep[] = Object.freeze(
  Array.from({ length: (STATE_BITS + 1) << 3 }, (_, code) =>
    Object.freeze({ join: (code & 1) === 1, width: ((code >> 1) & OPEN) as 0 | 1 | 2, state: code >> 3 })
  )
);

function step(join: boolean, width: 0 | 1 | 2, state: CellState): CellStep {
  return STEPS[(state << 3) | (width << 1) | (join ? 1 : 0)] ?? NOT_DRAWN;
}

/** A new cell of 1 with no flag: what a printable ASCII character opens. */
const ONE_CELL: CellStep = step(false, 1, 1);

/** Emoji presentation, by the runtime's own Unicode tables. */
const EMOJI_PRESENTATION = /^\p{Emoji_Presentation}$/u;

/**
 * Whether a code point of planes 0 and 1 has emoji presentation, asked of the
 * runtime once each (Phase 368): 0 not asked yet, 1 no, 2 yes. Every new cell
 * asks it, and xterm opens a new cell for nearly every code point it prints,
 * so a regular expression each time made CJK text write four times slower than
 * with xterm's own table. It answers what the expression answers.
 */
let emojiAsked: Uint8Array | null = null;

function hasEmojiPresentation(cp: number): boolean {
  if (cp < 0 || cp > 0x1ffff) return EMOJI_PRESENTATION.test(String.fromCodePoint(cp));
  const asked = (emojiAsked ??= new Uint8Array(0x20000));
  let known = asked[cp] ?? 0;
  if (known === 0) {
    known = EMOJI_PRESENTATION.test(String.fromCodePoint(cp)) ? 2 : 1;
    asked[cp] = known;
  }
  return known === 2;
}

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

/**
 * ONE code point through the seven rules, against the state the code point
 * before it left (Phase 368, D8). The rules that join are asked first, in
 * their measured order, and only of an open cell; then the code point's own
 * width in `table` decides: 0 joins the open cell or, with none open, is not
 * drawn (rule 7), and anything else opens a new cell, a regional indicator as
 * a cell of 1 (rule 4). A tab opens a cell of 1 that nothing joins.
 */
export function nextCell(state: CellState, cp: number, table: CellWidthTable): CellStep {
  // Printable ASCII, nearly everything a terminal prints, first: of the seven
  // rules only a waiting ZWJ asks about it (rule 3, below), and both measured
  // builds give it one cell (their first range, which cells.test.ts holds).
  if (cp >= 0x20 && cp < 0x7f && (state & ZWJ_WAITS) === 0) return ONE_CELL;
  if (cp === TAB_CP) return step(false, 1, NO_CELL);
  const at = (state & OPEN) === OPEN ? NO_CELL : state & STATE_BITS;
  const open = (at & OPEN) as 0 | 1 | 2;
  if (open !== 0) {
    // Rule 3: the code point after a ZWJ joins whatever it is.
    if ((at & ZWJ_WAITS) !== 0) return step(true, open, at & ~ZWJ_WAITS);
    if (cp === ZWJ) return step(true, open, at | ZWJ_WAITS);
    // Rule 1.
    if (cp === VS16) return step(true, 2, (at & ~OPEN) | 2);
    // Rule 2.
    if (cp === VS15) return step(true, open, at);
    // Rule 4: the pair's second half.
    if ((at & LONE_RI) !== 0 && isRegionalIndicator(cp)) return step(true, 2, ((at & ~OPEN) | 2) & ~LONE_RI);
    // Rule 5.
    if ((at & EMOJI_BASE) !== 0 && isSkinTone(cp)) return step(true, open, at);
    // Rule 7, the jamo half.
    if ((at & HANGUL_LEAD) !== 0 && isHangulTrail(cp)) return step(true, open, at);
  }
  const w = cellWidthIn(table, cp);
  // Rule 7: width 0 joins the cell before it, or is not drawn at all.
  if (w === 0) return open !== 0 ? step(true, open, at) : NOT_DRAWN;
  if (cp < 0x7f) return step(false, w, w);
  const ri = isRegionalIndicator(cp);
  const width = ri ? 1 : w;
  const flags = (ri ? LONE_RI : 0) | (isHangulLead(cp) ? HANGUL_LEAD : 0) | (hasEmojiPresentation(cp) ? EMOJI_BASE : 0);
  return step(false, width, width | flags);
}

/**
 * Code points into tmux's cells, by the seven measured rules. Each cell
 * carries the tag of the code point that opened it; a code point that joins a
 * cell takes that cell's tag, as tmux gives a cell one style. `table` is the
 * measured build whose widths cut the row; the phone's composer reads 3.7b's.
 */
export function clusterCells<T>(points: Iterable<TaggedPoint<T>>, table: CellWidthTable = '3.7b'): TaggedCell<T>[] {
  const cells: TaggedCell<T>[] = [];
  let state: CellState = NO_CELL;
  for (const point of points) {
    const ch = point.ch;
    const next = nextCell(state, ch.codePointAt(0) ?? 0, table);
    state = next.state;
    if (next.join) {
      const open = cells[cells.length - 1];
      // Width 0: there was no open cell, and tmux draws nothing.
      if (open !== undefined && next.width !== 0) {
        open.text += ch;
        open.w = next.width;
      }
      continue;
    }
    cells.push({ text: ch, w: next.width === 2 ? 2 : 1, tag: point.tag, tab: ch === TAB });
  }
  return cells;
}

/**
 * A string into tmux's cells: `{ text, w }` per cell, by the seven rules. A
 * tab answers as a cell of width 1 here, because its real span depends on its
 * column; the composer, which knows the column, gives it the span.
 */
export function cellsOf(text: string, table: CellWidthTable = '3.7b'): { text: string; w: 1 | 2 }[] {
  const points: TaggedPoint<null>[] = [];
  for (const ch of text) points.push({ ch, tag: null });
  return clusterCells(points, table).map(({ text: t, w }) => ({ text: t, w }));
}
