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
 *  6. WHERE IT SITS IN THE HISTORY (Phase 337.1 D3): `depth`, tmux's history
 *     size at this read, and `space`, {@link spaceOf} the pane, set TOGETHER,
 *     and only when the read was steady (its two displays agreed), the screen
 *     is not the alternate screen and the history is at most
 *     `POCKET_SCROLLBACK_MAX_INDEX`; otherwise both null, and the phone offers
 *     no scrollback from that one picture.
 *
 * A PAGE OF HISTORY (Phase 337.1 D11, {@link composePage}) is composed WHOLE,
 * then cut: every pen of the whole capture is read first, because tmux writes
 * each cell's style as a change from the cell before it across rows, then runs
 * are built for the kept rows alone, by the same per-row body the screen uses
 * ({@link rowRuns}), and past a cap the rows nearest the end the phone keeps
 * are kept, with a style table of their own.
 *
 * {@link windowMarkOf} IS THE ONE SPELLING of the window's mark: the answer's
 * `dialog`, the keys verb's final check (D21) and the watcher's nudge (D4) all
 * call it, so the three can never compare two different hashes.
 *
 * PURE. It reads no clock, no file and no process, and logs nothing. Outside
 * src/main/screen and src/shared it imports ../activity/screen and
 * ../reply/reader alone, and node's sha256 for {@link spaceOf} (§5.3.4,
 * `conformance:pocket` Z12).
 */

import { createHash } from 'node:crypto';
import {
  POCKET_SCREEN_MAX_BYTES,
  POCKET_SCREEN_MAX_COLS,
  POCKET_SCREEN_MAX_ROWS,
  POCKET_SCREEN_MAX_RUNS,
  POCKET_SCREEN_MAX_STYLES,
  POCKET_SCROLLBACK_MAX_INDEX,
  type PocketScreen,
  type PocketScreenRun,
  type PocketScreenStyle,
  type PocketScrollbackKeep
} from '@shared/ipc/pocket';
import type { SessionStatus } from '@shared/types';
import { detectDialogRows, hashScreen, normalizeCapture } from '../activity/screen';
import { readBackWindowOf } from '../reply/reader';
import { clusterCells, type TaggedCell, type TaggedPoint } from './cells';
import { SCREEN_PALETTE, xterm256 } from './palette';
import type { ScreenReading } from './read';
import { DEFAULT_PEN, readStyledRows, styledRows, type Colour, type Pen, type StyledRow } from './sgr';

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

/**
 * WHICH PANE AN INDEX SPACE BELONGS TO (Phase 337.1 D3, §Attack B8), declared
 * once, here: 12 lowercase hex of sha256 over the length-prefixed parts
 * `space` and the pane's `%`-id, the construction of the watcher's
 * `screenRevisionOf` (./watch.ts, which imports this module, so this one does
 * not import it), so no tmux id crosses the wire. A session's active pane can
 * change under the phone (the desk, or a program), and MEASURED (BM2, arm P,
 * both builds) a page asked after the switch was served from the other pane
 * with the width and the depth checks passing; this names the index space, so
 * the phone joins a page only to rows of the same one. The live picture and
 * every page (./scrollback.ts) call it over their agreed display.
 */
export function spaceOf(paneId: string): string {
  const hash = createHash('sha256');
  for (const part of ['space', paneId]) hash.update(`${String(part.length)}:${part};`, 'utf8');
  return hash.digest('hex').slice(0, 12);
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

/** A style table being built: each style once, in the order it was first met. */
interface StyleTable {
  readonly styles: PocketScreenStyle[];
  /** A pen's index in the table (added if new), and whether a blank in it may be trimmed. */
  indexOf(pen: Pen, overline: boolean, blank: boolean): { style: number; droppable: boolean };
}

function styleTable(): StyleTable {
  const table = new Map<string, number>();
  const styles: PocketScreenStyle[] = [];
  return {
    styles,
    indexOf(pen: Pen, overline: boolean, blank: boolean): { style: number; droppable: boolean } {
      const style = styleOf(pen);
      const key = keyOf(style);
      let at = table.get(key);
      if (at === undefined) {
        at = styles.length;
        table.set(key, at);
        styles.push(style);
      }
      return { style: at, droppable: blank && style.bg === null && !style.underline && !style.strike && !overline };
    }
  };
}

/**
 * ONE ROW'S RUNS, the per-row body the screen and a page of history share
 * (Phase 337.1 §Attack B10: never copied): the row's cells cut into tmux's own
 * cells, stopped at `cols` columns, the trailing droppable blanks trimmed, and
 * width-1 cells of one style run together, against `table`.
 */
function rowRuns(row: StyledRow, cols: number, table: StyleTable): PocketScreenRun[] {
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
    const { style, droppable } = table.indexOf(cell.tag, cell.tag.overline, cell.text === ' ');
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
  return runs;
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
  const table = styleTable();
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
    const runs = rowRuns(row, cols, table);
    runCount += runs.length;
    if (caps && (table.styles.length > POCKET_SCREEN_MAX_STYLES || runCount > POCKET_SCREEN_MAX_RUNS)) return null;
    lines.push(runs);
    texts.push(runs.map((run) => run.text).join(''));
  }
  return { lines, styles: table.styles, plain: texts.join('\n'), runs: runCount };
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
  // WHERE THIS PICTURE SITS IN THE HISTORY (Phase 337.1 D3): set together, or
  // both null: a read whose displays disagreed, the alternate screen (the
  // history belongs to a screen the program covered), or a history past the
  // deepest index a page may name.
  const placed = reading.steady && !display.alternate && display.history <= POCKET_SCROLLBACK_MAX_INDEX;
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
    typable: extra.typable,
    depth: placed ? display.history : null,
    space: placed ? spaceOf(display.paneId) : null
  };
  const bytes = Buffer.byteLength(JSON.stringify(screen), 'utf8');
  if (bytes > POCKET_SCREEN_MAX_BYTES) return 'large';
  return { screen, plain: composed.plain, mark, bytes };
}

/**
 * Room left in a page's 1 MiB for the answer's envelope (the session id, the
 * time, `from`, `depth`, `wrap`, `space`, `why` and `sentence`): the door holds
 * the WHOLE answer under `POCKET_SCREEN_MAX_BYTES` (src/main/pocket/routes.ts
 * `scrollbackOf`), so the page's styles and rows keep this much clear. A
 * session id the door finds is at most 128 characters, 768 bytes as JSON at
 * the very worst; the rest is under 200.
 */
const PAGE_ENVELOPE_BYTES = 1_024;

/** What a page's rows are asked for (D7, D11): the first index, how many, and which end matters. */
export interface PageWant {
  readonly from: number;
  readonly count: number;
  readonly keep: PocketScrollbackKeep;
}

/** A page of history composed (D8, D11): its first row's index, its own style table, its rows, and their bytes. */
export interface ComposedPage {
  readonly from: number;
  readonly styles: PocketScreenStyle[];
  readonly rows: PocketScreenRun[][];
  /** `{ styles, rows }` as JSON, in bytes. */
  readonly bytes: number;
}

/** A run's JSON with its style index at its widest (four digits: a kept table holds at most 1,024). */
function runBytes(runs: readonly PocketScreenRun[]): number {
  return Buffer.byteLength(JSON.stringify(runs.map((run) => ({ text: run.text, style: 9_999, cells: run.cells }))), 'utf8');
}

/**
 * The rows of a capture one step of a page's composition reads, or builds
 * runs for, before it stops for its reader (Phase 337.1's fix round): four
 * rows of per-cell truecolor at 512 columns are about 70 KB of capture, a few
 * milliseconds of main (eight held it 11 ms at p50 on a machine at a load of
 * 177, the fix round's own measurement).
 */
export const PAGE_STEP_ROWS = 4;

/**
 * A PAGE OF HISTORY, COMPOSED WHOLE, THEN CUT (Phase 337.1 D11, §5.3.4).
 *
 * `styled` is a styled capture whose rows are history lines `firstLine …`.
 * Every pen of the WHOLE capture is read first (the overscan included), so a
 * pen opened above the page is carried into its first row, as it is in the
 * live screen; then runs are built ONLY for the rows `[want.from, want.from +
 * want.count)` by index, through {@link rowRuns}, against one table; a row the
 * capture does not hold is empty. When the kept rows pass a cap (1,024 styles,
 * 16,384 runs, or 1 MiB with the envelope's room), the longest run of them
 * from the end `want.keep` names that fits is kept, a single row always (512
 * cells hold at most 512 styles and runs); then the page's own style table is
 * built from the kept rows alone, in their order. Pure, as the rest of this
 * module: the reader times it for its duty cycle (D14).
 *
 * A STEP AT A TIME (the fix round): {@link composePageSteps} is this
 * composition, yielding after every `PAGE_STEP_ROWS` rows it reads and every
 * `PAGE_STEP_ROWS` rows it builds, so its reader (./scrollback.ts) can hand
 * the event loop back between steps. A page of a dense history (300 columns,
 * every cell its own truecolor pair, 2.7 MB of capture) took 80 to 98 ms of
 * main in ONE block (Lens 1's measurement over the SHIPPING composer), every
 * page a stall the phone's door never caused before. This drives the same
 * steps to the end at once, for every caller that wants the page whole.
 */
export function composePage(styled: string, firstLine: number, cols: number, want: PageWant): ComposedPage {
  const steps = composePageSteps(styled, firstLine, cols, want);
  for (;;) {
    const step = steps.next();
    if (step.done === true) return step.value;
  }
}

/** {@link composePage}, a step at a time: it yields between steps and returns the page. Pure. */
export function* composePageSteps(
  styled: string,
  firstLine: number,
  cols: number,
  want: PageWant
): Generator<void, ComposedPage, undefined> {
  // 1. EVERY PEN, over the whole capture, PAGE_STEP_ROWS rows a step.
  const read: StyledRow[] = [];
  for (const row of styledRows(styled)) {
    read.push(row);
    if (read.length % PAGE_STEP_ROWS === 0) yield;
  }
  // 2. RUNS FOR THE ASKED ROWS ONLY, against one table, PAGE_STEP_ROWS a step.
  const table = styleTable();
  const built: PocketScreenRun[][] = [];
  for (let index = want.from; index < want.from + want.count; index += 1) {
    const row = read[index - firstLine];
    built.push(row === undefined ? [] : rowRuns(row, cols, table));
    if (built.length % PAGE_STEP_ROWS === 0) yield;
  }
  // 3. THE CAPS: the longest run of rows from `keep`'s end that fits.
  const order = built.map((_, i) => i);
  if (want.keep === 'bottom') order.reverse();
  const used = new Set<number>();
  let styleBytes = 0;
  let runs = 0;
  let rowBytes = 0;
  let kept = 0;
  const budget = POCKET_SCREEN_MAX_BYTES - PAGE_ENVELOPE_BYTES;
  for (const i of order) {
    const row = built[i] ?? [];
    const fresh = new Set<number>();
    for (const run of row) if (!used.has(run.style)) fresh.add(run.style);
    let freshBytes = 0;
    for (const at of fresh) freshBytes += Buffer.byteLength(JSON.stringify(table.styles[at]), 'utf8') + 1;
    const nextBytes = '{"styles":[],"rows":[]}'.length + styleBytes + freshBytes + rowBytes + runBytes(row) + 1;
    const fits =
      used.size + fresh.size <= POCKET_SCREEN_MAX_STYLES &&
      runs + row.length <= POCKET_SCREEN_MAX_RUNS &&
      nextBytes <= budget;
    if (!fits && kept > 0) break;
    for (const at of fresh) used.add(at);
    styleBytes += freshBytes;
    runs += row.length;
    rowBytes += runBytes(row) + 1;
    kept += 1;
  }
  const first = want.keep === 'bottom' ? want.count - kept : 0;
  const keptRows = built.slice(first, first + kept);
  // 4. THE PAGE'S OWN STYLE TABLE, from the kept rows alone.
  const remap = new Map<number, number>();
  const styles: PocketScreenStyle[] = [];
  const rows = keptRows.map((row) =>
    row.map((run) => {
      let at = remap.get(run.style);
      if (at === undefined) {
        at = styles.length;
        remap.set(run.style, at);
        const style = table.styles[run.style];
        if (style !== undefined) styles.push(style);
      }
      return { text: run.text, style: at, cells: run.cells };
    })
  );
  return {
    from: want.from + first,
    styles,
    rows,
    bytes: Buffer.byteLength(JSON.stringify({ styles, rows }), 'utf8')
  };
}
