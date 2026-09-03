/**
 * A copy composed from the HISTORY — Phase 209.
 *
 * A pane's xterm holds one screen of a tmux client, so `Terminal.getSelection`
 * can only ever answer for the rows on screen. When the selection's two ends
 * are history positions (./history-selection.ts), the text has to come from
 * the server: main runs `capture-pane -e -J -S -E` between the two lines
 * (src/main/capture/service.ts), and this file turns those bytes into what
 * xterm's own path would have produced for the same cells.
 *
 * WHY AN XTERM TERMINAL, UNOPENED. The point is that highlight and copy never
 * disagree about the text, and xterm's own text is not the pane's bytes
 * joined with newlines. Two things measured on 2026-09-03 decide it:
 *
 *   - a WRAPPED row is joined to the row above with no newline at all, both
 *     live and after a tmux repaint, because `selectionText` reads the row's
 *     wrapped flag (SelectionService.ts, `selectionText`);
 *   - a WIDE character occupies two cells, a drag whose end lands on its
 *     first cell takes the whole character, and a start on its second half
 *     is moved past it, so a copy over 日本語 from cell 3 to cell 12 reads
 *     "語テキ ab" and not a leading space.
 *
 * So the joined lines are written into a Terminal of the pane's own width
 * that is never opened: `write` fills its buffer and `getLine` reads it, and
 * only `select` needs a renderer. The joined line re-wraps at the same width
 * and marks its continuation rows wrapped, which is the flag the join below
 * reads, and wide characters occupy their two cells because the same parser
 * put them there. The join itself is xterm's `selectionText` in twenty lines,
 * over the public buffer API, and the probe proves the two paths byte for
 * byte over a wrapped row and a wide row by copying the same rows both ways.
 *
 * This module is behind a lazy door: ./index.ts imports it only when a copy
 * spans the history, so an ordinary copy parses nothing new.
 */

import { Terminal } from '@xterm/xterm';
import type { IBufferRange, ITheme } from '@xterm/xterm';
import type { InstalledGmuxApi } from '@shared/ipc';
import type { HistorySelectionRange } from './history-selection';
import { serializeAsHtml, toClipboardHtml } from './serialize';

type CaptureBridge = NonNullable<InstalledGmuxApi['capture']>;

/** What main answered for an exact range, split into rows. */
export interface HistoryRows {
  rows: string[];
  /** The history line `rows[0]` is, after main's clamp. */
  firstLine: number;
}

/**
 * `capture-pane -p` ends every row with a newline, so a split leaves one
 * empty string after the last row. That one is dropped and no other: an
 * empty row in the middle is a blank line the person selected.
 */
export function splitRows(ansi: string): string[] {
  if (ansi.length === 0) return [];
  const rows = ansi.split('\n');
  if (rows[rows.length - 1] === '') rows.pop();
  return rows;
}

/** The rows between two history lines, inclusive, joined or as drawn. */
export async function readHistoryRows(
  bridge: CaptureBridge,
  tmuxName: string,
  start: number,
  end: number,
  join: boolean
): Promise<HistoryRows> {
  const res = await bridge.pane({
    tmuxName,
    historyLines: 0,
    range: { start, end },
    join
  });
  return { rows: splitRows(res.ansi), firstLine: res.firstLine ?? start };
}

/**
 * A Terminal of the given width holding these rows, never opened. Resolves
 * after the write has landed in the buffer.
 *
 * The scrollback is sized to the bytes rather than to the row count, because
 * a joined line re-wraps into as many rows as its width demands and a buffer
 * that runs out drops the OLDEST rows, which are the start of the selection.
 */
export async function bufferTerminal(
  rows: string[],
  cols: number
): Promise<Terminal> {
  let chars = 0;
  for (const row of rows) chars += row.length;
  const term = new Terminal({
    cols: Math.max(1, cols),
    rows: 24,
    scrollback: rows.length + Math.ceil(chars / Math.max(1, cols)) + 24,
    allowProposedApi: true
  });
  if (rows.length > 0) {
    await new Promise<void>((resolve) => {
      term.write(rows.join('\r\n'), resolve);
    });
  }
  return term;
}

/**
 * xterm's `selectionText` over a buffer range, `end.x` exclusive as in
 * xterm's model: the first row from its column, every wrapped row joined to
 * the row above with nothing between, every other row on a line of its own,
 * trailing blanks trimmed, non breaking spaces made plain.
 */
export function composeText(term: Terminal, sel: IBufferRange): string {
  const buffer = term.buffer.active;
  const text = (y: number, from: number, to?: number): string =>
    buffer.getLine(y)?.translateToString(true, from, to) ?? '';
  const wrapped = (y: number): boolean => buffer.getLine(y)?.isWrapped === true;
  const out: string[] = [];
  const oneRow = sel.start.y === sel.end.y;
  out.push(text(sel.start.y, sel.start.x, oneRow ? sel.end.x : undefined));
  for (let y = sel.start.y + 1; y <= sel.end.y - 1; y += 1) {
    const row = text(y, 0);
    if (wrapped(y)) out[out.length - 1] += row;
    else out.push(row);
  }
  if (!oneRow) {
    const row = text(sel.end.y, 0, sel.end.x);
    if (wrapped(sel.end.y)) out[out.length - 1] += row;
    else out.push(row);
  }
  return out.map((line) => line.replace(/ /g, ' ')).join('\n');
}

/**
 * The buffer range a history range is, over rows whose first row is
 * `firstLine`. A start above the first row, being a line the server no
 * longer holds, begins at the first cell of the first row; an end past the
 * rows written is the last cell of the last row.
 */
export function bufferRangeFor(
  range: HistorySelectionRange,
  firstLine: number,
  rowCount: number
): IBufferRange {
  const last = Math.max(0, rowCount - 1);
  const startRow = range.start.line - firstLine;
  const endRow = range.end.line - firstLine;
  return {
    start:
      startRow < 0
        ? { x: 0, y: 0 }
        : { x: range.start.col, y: Math.min(startRow, last) },
    end:
      endRow > last
        ? { x: range.cols, y: last }
        : { x: Math.min(range.cols, range.end.col + 1), y: Math.max(0, endRow) }
  };
}

/** What Copy as HTML needs beyond the text. */
export interface HistoryHtmlOptions {
  theme: ITheme;
  fontFamily: string;
  fontSizePx: number;
}

/** Text and, when asked, the clipboard HTML for a selection in the history. */
export async function composeHistorySelection(
  bridge: CaptureBridge,
  tmuxName: string,
  range: HistorySelectionRange,
  html: HistoryHtmlOptions | null
): Promise<{ text: string; html: string }> {
  const { rows, firstLine } = await readHistoryRows(
    bridge,
    tmuxName,
    range.start.line,
    range.end.line,
    true
  );
  if (rows.length === 0) return { text: '', html: '' };
  const term = await bufferTerminal(rows, range.cols);
  try {
    // The buffer is as tall as the re-wrapped rows, plus the blank rows of a
    // screen nothing was written to, which the range never reaches.
    const written = term.buffer.active.length;
    const sel = bufferRangeFor(range, firstLine, written);
    const text = composeText(term, sel);
    if (html === null || text.length === 0) return { text, html: '' };
    const body = serializeAsHtml(term, {
      theme: html.theme,
      onlySelection: true,
      selection: sel,
      includeGlobalBackground: false,
      fontFamily: html.fontFamily,
      fontSizePx: html.fontSizePx
    });
    return { text, html: toClipboardHtml(body) };
  } finally {
    term.dispose();
  }
}
