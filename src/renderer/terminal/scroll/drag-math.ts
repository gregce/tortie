/**
 * Pure geometry for a selection drag that scrolls, Phase 205 item 3, and
 * the history positions of Phase 209.
 *
 * No DOM and no xterm, so every rule below is unit-testable on its own. The
 * controller that owns the gesture is ./drag-select.ts, and the measurement
 * that made this necessary is in that file's header.
 *
 * TWO COORDINATE SYSTEMS, and the second is the one a selection is kept in.
 *
 * The SCREEN. A pane's xterm client lives in the alternate buffer for its
 * whole life, so its buffer is exactly the rows on screen and has no history
 * of its own; the history is tmux's, and tmux repaints the same screen rows
 * with different text as it scrolls. A `Cell` is a screen cell, and it is
 * what the pointer and xterm's `Terminal.select` speak.
 *
 * The HISTORY. tmux numbers the lines it holds from the oldest, and one
 * `display-message` answers where the screen sits in them. Screen row `r`
 * shows history line `depth - position + r`, where `depth` is the depth of THE
 * FRAME ON SCREEN and `#{scroll_position}` is how far above that frame's
 * bottom the view is parked. It is that line NUMBER a selection end is kept
 * as rather than the row, which is what makes it survive a stream: a line
 * keeps its number for as long as tmux holds it, whatever is printed after.
 *
 * WHICH DEPTH (Phase 292). Live, the frame on screen is the live pane and its
 * depth is `#{history_size}`. SCROLLED BACK, the screen shows the frame tmux
 * froze when the pane entered copy mode, and tmux holds that frame still by
 * itself while the agent writes: its depth is the history AT ENTRY, which
 * `ScrollSurface` records, and `#{history_size}` beside it goes on growing.
 * `frameDepth` in ./live-distance.ts is the one spelling of that choice.
 *
 * This header said otherwise until Phase 292, and what it said was true of the
 * app as it then was. It read a 2026-09-03 measurement (`scroll_position`
 * stayed 11 while `history_size` went 21 to 51, and the same screen row went
 * from LINE-22 to LINE-52) as a parked view sliding, and named the app's own
 * poll as what re-anchored it. That poll scrolled UP by every line printed, so
 * position and history grew together and `history - position` stood still;
 * the arithmetic was right BECAUSE the poll was dragging the page. Pull
 * request 30 deleted the poll's scroll, the position now holds while the
 * history grows, and the live history is the wrong depth for a parked pane by
 * exactly the lines printed since the park. `scrollPaneTo` in
 * src/main/tmux/scroll.ts carries the one account of the deletion.
 *
 * A `HistoryPos` is where a selection end really is, and it is never clamped;
 * only the DRAWING of it is, in `visibleSpan`.
 */

/** A screen cell. Column may equal `cols`, meaning past the end of the row. */
export interface Cell {
  col: number;
  row: number;
}

/** Where the pane is, and how big one cell measured. */
export interface PaneBox {
  /** Left edge of the text surface, in client pixels. */
  left: number;
  /** Top edge of the text surface, in client pixels. */
  top: number;
  cellWidth: number;
  cellHeight: number;
  cols: number;
  rows: number;
}

/** A range xterm's `Terminal.select(column, row, length)` accepts. */
export interface SelectionSpan {
  column: number;
  row: number;
  /** Cells, counted across row ends, so a span may cover many rows. */
  length: number;
}

/**
 * A place in the pane's history: `line` 0 is the oldest line tmux still
 * holds, and `col` is a cell in that line, inclusive at either end of a
 * range.
 */
export interface HistoryPos {
  line: number;
  col: number;
}

/** Two history positions with `start` no later than `end`. */
export interface HistoryRange {
  start: HistoryPos;
  end: HistoryPos;
}

/**
 * Where the screen sits in the history right now: the frame it shows and how
 * far up that frame the view is parked.
 */
export interface HistoryFrame {
  /**
   * The depth of the frame ON SCREEN: `#{history_size}` while live, and the
   * history at entry while scrolled back (`frameDepth`, ./live-distance.ts).
   */
  history: number;
  /** `#{scroll_position}`: lines the view is parked above that frame's bottom. */
  position: number;
  /** Visible rows. */
  rows: number;
  /** Visible columns. */
  cols: number;
}

function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value;
}

/**
 * Lines to scroll for ONE tick of a drag held outside the pane.
 *
 * Positive scrolls back in time, which is what `ScrollSurface.scrollBy` takes,
 * so a pointer above the top edge is positive. Zero while the pointer is
 * inside, which is what keeps an ordinary drag entirely xterm's business.
 *
 * The step grows with the overshoot, one line per cell height, and is capped
 * at one screen so a pointer flung to the far corner cannot jump the reader
 * through the whole history in a few ticks.
 */
export function edgeScrollLines(clientY: number, box: PaneBox): number {
  if (box.cellHeight <= 0 || box.rows <= 0) return 0;
  const bottom = box.top + box.rows * box.cellHeight;
  if (clientY >= box.top && clientY <= bottom) return 0;
  const over = clientY < box.top ? box.top - clientY : clientY - bottom;
  const step = clamp(Math.ceil(over / box.cellHeight), 1, box.rows);
  return clientY < box.top ? step : -step;
}

/** The cell under a point, clamped into the pane. */
export function cellAtPoint(
  clientX: number,
  clientY: number,
  box: PaneBox
): Cell {
  if (box.cellWidth <= 0 || box.cellHeight <= 0) return { col: 0, row: 0 };
  return {
    col: clamp(
      Math.floor((clientX - box.left) / box.cellWidth),
      0,
      Math.max(0, box.cols - 1)
    ),
    row: clamp(
      Math.floor((clientY - box.top) / box.cellHeight),
      0,
      Math.max(0, box.rows - 1)
    )
  };
}

/** The history line a screen row shows under this frame. */
export function historyLineOf(row: number, frame: HistoryFrame): number {
  return frame.history - frame.position + row;
}

/**
 * The screen row a history line sits on under this frame. Negative above the
 * top of the screen, `rows` or more below its bottom.
 */
export function screenRowOf(line: number, frame: HistoryFrame): number {
  return line - frame.history + frame.position;
}

/** A screen cell as the history position it shows right now. */
export function toHistory(cell: Cell, frame: HistoryFrame): HistoryPos {
  return { line: historyLineOf(cell.row, frame), col: cell.col };
}

/**
 * The two ends of a drag as one ordered range, by line first and column
 * second, so the caller never has to know which end the person is holding.
 */
export function historyRange(a: HistoryPos, b: HistoryPos): HistoryRange {
  const aFirst = a.line < b.line || (a.line === b.line && a.col <= b.col);
  return aFirst ? { start: a, end: b } : { start: b, end: a };
}

/**
 * The part of a history range that is on screen, as the span to draw, or
 * null when no row of it is.
 *
 * This is the ONLY place a selection end is clamped, and the clamp is for
 * drawing alone: an end above the top is drawn from the first cell of the
 * first row and an end below the bottom to the last cell of the last row,
 * while the range itself keeps its real positions. What is highlighted is
 * therefore always exactly the visible part of what a copy would take.
 */
export function visibleSpan(
  range: HistoryRange,
  frame: HistoryFrame
): SelectionSpan | null {
  if (frame.rows <= 0) return null;
  const top = screenRowOf(range.start.line, frame);
  const bottom = screenRowOf(range.end.line, frame);
  const last = frame.rows - 1;
  if (bottom < 0 || top > last) return null;
  const start: Cell =
    top < 0 ? { col: 0, row: 0 } : { col: range.start.col, row: top };
  const end: Cell =
    bottom > last
      ? { col: frame.cols, row: last }
      : { col: range.end.col, row: bottom };
  return selectionSpan(start, end, frame.cols);
}

/**
 * The two ends of a drag as one span, with the cell under the later end IN.
 *
 * Ordering is by row first and column second, and the caller never has to
 * know which end the person is holding.
 */
export function selectionSpan(a: Cell, b: Cell, cols: number): SelectionSpan {
  const aFirst = a.row < b.row || (a.row === b.row && a.col <= b.col);
  const start = aFirst ? a : b;
  const end = aFirst ? b : a;
  const endCol = Math.min(cols, end.col + 1);
  return {
    column: start.col,
    row: start.row,
    length: Math.max(1, (end.row - start.row) * cols + (endCol - start.col))
  };
}
