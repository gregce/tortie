/**
 * A SESSION'S SCREEN, COMPOSED FOR THE PHONE (Phase 337, build/p337/SPEC.md
 * §5.3.4, D9, D12, D15, D16).
 *
 * The phone draws the screen and never parses it (his ruling 4: no emulator
 * on the phone), so everything is decided here, from one read (./read.ts):
 *
 *  1. ROWS OF CELLS, by the one style reader (./sgr.ts), the pen carried across
 *     rows, cut into tmux's own cells (./cells.ts, tmux 3.7b's widths and the
 *     seven measured sequence rules). A tab is one cell spanning to the next
 *     multiple of eight, tmux's default tab stops (measured, ./cells.ts); a
 *     program that moves its tab stops draws its tab one span off here, stated.
 *  2. STYLES RESOLVED TO sRGB as this Mac's own dark terminal draws them at its
 *     default appearance (./palette.ts, D12): the sixteen slots, xterm's cube
 *     and greys, 24-bit passed through; inverse swaps the two, the ground
 *     standing in for a default background, and THEN bold on slots 0 to 7
 *     takes 8 to 15 for the ink alone (xterm's default and its order); hidden
 *     is drawn in its ground; the default background is null (the ground).
 *     Deduplicated into one table.
 *  3. RUNS OF ONE STYLE: width-1 cells of one style run together, and a cell
 *     wider or narrower than one column, or a tab, is always its own run, so
 *     the phone can place every run at its own column. Trailing cells that are
 *     a blank in a null ground with no underline, strike or overline are
 *     dropped, as `capture-pane -p` drops them. A row the reader marks
 *     unreadable is drawn as its text in the default style.
 *  4. THE QUESTION (D16): `asking` is the session's status `needs_input`, or a
 *     numbered question drawn (`detectDialogRows(...).atChoice` over the plain
 *     text of the same capture: the composed rows' text, which equals
 *     `capture-pane -p` up to trailing blanks, which `normalizeCapture` drops);
 *     `dialog`, while asking, is {@link windowMarkOf} the plain text.
 *  5. THE CAPS (D15): over 512 columns, 200 rows, 1,024 styles, 16,384 runs or
 *     1 MiB composed, the answer is `'large'` and no rows.
 *
 * {@link windowMarkOf} IS THE ONE SPELLING of the window's mark: the answer's
 * `dialog`, the keys verb's final check (D21) and the watcher's nudge (D4) all
 * call it, so the three can never compare two different hashes.
 *
 * PURE. It reads no clock, no file and no process, and logs nothing. Outside
 * src/main/screen and src/shared it imports ../activity/screen and
 * ../reply/reader alone (§5.3.4, `conformance:pocket` Z12).
 */

import {
  POCKET_SCREEN_MAX_BYTES,
  POCKET_SCREEN_MAX_COLS,
  POCKET_SCREEN_MAX_ROWS,
  POCKET_SCREEN_MAX_RUNS,
  POCKET_SCREEN_MAX_STYLES,
  type PocketScreen,
  type PocketScreenRun,
  type PocketScreenStyle
} from '@shared/ipc/pocket';
import type { SessionStatus } from '@shared/types';
import { detectDialogRows, hashScreen, normalizeCapture } from '../activity/screen';
import { readBackWindowOf } from '../reply/reader';
import { clusterCells, type TaggedCell, type TaggedPoint } from './cells';
import { SCREEN_PALETTE, xterm256 } from './palette';
import type { ScreenReading } from './read';
import { DEFAULT_PEN, readStyledRows, type Colour, type Pen } from './sgr';

/** tmux's default tab stops: every eighth column (measured, ./cells.ts). */
const TAB_STOP = 8;

/** What the composer is told besides the read. */
export interface ComposeExtra {
  /** The session's question id now (`replyTurns.current(id).id`). */
  readonly turn: string;
  readonly status: SessionStatus;
  /** Keys are taken now. */
  readonly typable: boolean;
}

/** A composed screen, with the plain text and the window mark it was decided from. */
export interface ComposedScreen {
  readonly screen: PocketScreen;
  /** The composed rows' text, one row a line: what `asking` and the mark read. */
  readonly plain: string;
  /** {@link windowMarkOf} the plain text, whether or not the session is asking. */
  readonly mark: string;
  /** The screen's JSON in bytes, which the 1 MiB cap read. */
  readonly bytes: number;
}

/** The rows and styles of one capture, before the envelope. */
interface ComposedRows {
  readonly lines: PocketScreenRun[][];
  readonly styles: PocketScreenStyle[];
  readonly plain: string;
  readonly runs: number;
}

/**
 * THE WINDOW'S MARK, the one spelling (D4, D16, D21): the hash of the last 24
 * inked rows of a plain capture, the press's own read-back window
 * (src/main/reply/reader.ts).
 */
export function windowMarkOf(plain: string): string {
  return hashScreen(readBackWindowOf(plain));
}

/** Whether a session is asking him something: waiting on him, or a numbered question drawn (D16). */
export function askingOf(plain: string, status: SessionStatus): boolean {
  return status === 'needs_input' || detectDialogRows(normalizeCapture(plain)).atChoice;
}

/** A colour as `#rrggbb`, or null for the default. `brighten` (bold, for the colour drawn as the ink) takes slots 0 to 7 to 8 to 15 (xterm's default). */
function resolve(colour: Colour | null, brighten: boolean): string | null {
  if (colour === null) return null;
  if (colour.kind === 'rgb') return `#${hex2(colour.r)}${hex2(colour.g)}${hex2(colour.b)}`;
  const n = brighten && colour.n < 8 ? colour.n + 8 : colour.n;
  return xterm256(n);
}

function hex2(n: number): string {
  return n.toString(16).padStart(2, '0');
}

/**
 * A pen as the phone draws it (D12).
 *
 * INVERSE SWAPS FIRST, AND BOLD BRIGHTENS THE INK AFTER (the fix round of
 * 2026-10-06), as the Mac's own renderer does: @xterm/addon-webgl 0.19.0's
 * `TextureAtlas._drawToCache` swaps the two colours and their modes before it
 * asks `_getForegroundColor`, which takes slots 0 to 7 to 8 to 15 when bold,
 * and `RectangleRenderer._updateRectangle` fills an inverse cell's ground
 * with the pen's foreground slot as written, never brightened. Brightening
 * first drew bold inverse red on #f07e78 where the Mac draws #e5655e (the
 * verify's own reader, through the real door, on a hostile page). Under
 * inverse a default ink is the ground and a default ground is the ink.
 */
function styleOf(pen: Pen): PocketScreenStyle {
  const ink = pen.inverse ? pen.bg : pen.fg;
  const ground = pen.inverse ? pen.fg : pen.bg;
  let fg = resolve(ink, pen.bold) ?? (pen.inverse ? SCREEN_PALETTE.ground : SCREEN_PALETTE.ink);
  const bg = resolve(ground, false) ?? (pen.inverse ? SCREEN_PALETTE.ink : null);
  if (pen.hidden) fg = bg ?? SCREEN_PALETTE.ground;
  return {
    fg,
    bg,
    bold: pen.bold,
    dim: pen.dim,
    italic: pen.italic,
    underline: pen.underline,
    strike: pen.strike
  };
}

/** The table's key for a style. */
function keyOf(style: PocketScreenStyle): string {
  return [
    style.fg,
    style.bg ?? '',
    style.bold ? 'b' : '',
    style.dim ? 'd' : '',
    style.italic ? 'i' : '',
    style.underline ? 'u' : '',
    style.strike ? 's' : ''
  ].join('|');
}

/** One cell placed: its text, its columns, its style index, and whether it may join a run. */
interface Placed {
  readonly text: string;
  readonly cells: number;
  readonly style: number;
  /** A width-1 cell that is not a tab: the only kind runs are made of. */
  readonly plain: boolean;
  /** A blank the trailing trim may drop. */
  readonly droppable: boolean;
}

/**
 * The rows of one styled capture: exactly `rows` rows (more are cut, fewer are
 * padded with empty rows), each a list of runs, and the style table. Every
 * row's cells stop at `cols` columns. With `caps`, it stops and answers null
 * the moment the styles or the runs pass theirs, so a screen built to be
 * refused costs main a fraction of its composition.
 */
function composeRows(styled: string, rows: number, cols: number, caps = false): ComposedRows | null {
  const read = readStyledRows(styled);
  const table = new Map<string, number>();
  const styles: PocketScreenStyle[] = [];
  const indexOf = (pen: Pen, overline: boolean, blank: boolean): { style: number; droppable: boolean } => {
    const style = styleOf(pen);
    const key = keyOf(style);
    let at = table.get(key);
    if (at === undefined) {
      at = styles.length;
      table.set(key, at);
      styles.push(style);
    }
    return { style: at, droppable: blank && style.bg === null && !style.underline && !style.strike && !overline };
  };
  const lines: PocketScreenRun[][] = [];
  const texts: string[] = [];
  let runCount = 0;
  for (let r = 0; r < rows; r += 1) {
    const row = read[r];
    if (row === undefined) {
      lines.push([]);
      texts.push('');
      continue;
    }
    // A row the reader could not follow is drawn as its text in the default style.
    const points: TaggedPoint<Pen>[] = row.cells.map((cell) => ({
      ch: cell.ch,
      tag: row.readable ? cell.pen : DEFAULT_PEN
    }));
    const cells: TaggedCell<Pen>[] = clusterCells(points);
    const placed: Placed[] = [];
    let col = 0;
    for (const cell of cells) {
      const span = cell.tab ? Math.min(TAB_STOP - (col % TAB_STOP), cols - col) : cell.w;
      // A row never covers more than the pane's columns: the phone refuses an
      // answer whose row does (build/p337/SPEC.md §5.8.2), and tmux never
      // draws a cell past its last column.
      if (span < 1 || col + span > cols) break;
      const { style, droppable } = indexOf(cell.tag, cell.tag.overline, cell.text === ' ');
      placed.push({ text: cell.text, cells: span, style, plain: !cell.tab && span === 1, droppable });
      col += span;
    }
    while (placed.length > 0 && placed[placed.length - 1]?.droppable === true) placed.pop();
    const runs: PocketScreenRun[] = [];
    let open: PocketScreenRun | null = null;
    for (const p of placed) {
      if (open !== null && p.plain && open.style === p.style) {
        open.text += p.text;
        open.cells += 1;
        continue;
      }
      open = { text: p.text, style: p.style, cells: p.cells };
      runs.push(open);
      if (!p.plain) open = null;
    }
    runCount += runs.length;
    if (caps && (styles.length > POCKET_SCREEN_MAX_STYLES || runCount > POCKET_SCREEN_MAX_RUNS)) return null;
    lines.push(runs);
    texts.push(runs.map((run) => run.text).join(''));
  }
  return { lines, styles, plain: texts.join('\n'), runs: runCount };
}

/**
 * The plain text a read composes to, one row a line: what `asking`, the
 * window's mark and the keys verb's check read. The same composition the
 * screen answer draws, so the two can never read two different texts.
 */
export function plainOf(reading: ScreenReading): string {
  const { cols, rows } = reading.display;
  if (cols > POCKET_SCREEN_MAX_COLS || rows > POCKET_SCREEN_MAX_ROWS) return '';
  return composeRows(reading.styled, rows, cols)?.plain ?? '';
}

/** The question a read shows, over its plain text and the session's status (D16). */
export function questionOf(
  reading: ScreenReading,
  status: SessionStatus
): { readonly plain: string; readonly asking: boolean; readonly dialog: string | null; readonly mark: string } {
  const plain = plainOf(reading);
  const asking = askingOf(plain, status);
  const mark = windowMarkOf(plain);
  return { plain, asking, dialog: asking ? mark : null, mark };
}

/**
 * One read composed into the phone's screen, or `'large'` over any cap of D15.
 * It reads no clock: the watcher times it for its duty cycle.
 */
export function composeScreen(reading: ScreenReading, extra: ComposeExtra): ComposedScreen | 'large' {
  const display = reading.display;
  if (display.cols > POCKET_SCREEN_MAX_COLS || display.rows > POCKET_SCREEN_MAX_ROWS) return 'large';
  const composed = composeRows(reading.styled, display.rows, display.cols, true);
  if (composed === null || composed.styles.length > POCKET_SCREEN_MAX_STYLES || composed.runs > POCKET_SCREEN_MAX_RUNS) {
    return 'large';
  }
  const asking = askingOf(composed.plain, extra.status);
  const mark = windowMarkOf(composed.plain);
  const screen: PocketScreen = {
    cols: display.cols,
    rows: display.rows,
    cursor: {
      x: Math.min(Math.max(display.cursorX, 0), display.cols),
      y: Math.min(Math.max(display.cursorY, 0), display.rows - 1),
      visible: display.cursorVisible
    },
    alternate: display.alternate,
    ground: SCREEN_PALETTE.ground,
    ink: SCREEN_PALETTE.ink,
    caret: SCREEN_PALETTE.caret,
    styles: composed.styles,
    lines: composed.lines,
    turn: extra.turn,
    asking,
    dialog: asking ? mark : null,
    typable: extra.typable
  };
  const bytes = Buffer.byteLength(JSON.stringify(screen), 'utf8');
  if (bytes > POCKET_SCREEN_MAX_BYTES) return 'large';
  return { screen, plain: composed.plain, mark, bytes };
}
