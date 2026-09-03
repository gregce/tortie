/**
 * Pure geometry for a selection drag that scrolls — Phase 205 item 3.
 *
 * No DOM and no xterm, so every rule below is unit-testable on its own. The
 * controller that owns the gesture is ./drag-select.ts, and the measurement
 * that made this necessary is in that file's header.
 *
 * ONE COORDINATE SYSTEM, and it is the SCREEN. A pane's xterm client lives in
 * the alternate buffer for its whole life, so its buffer is exactly the rows
 * on screen and has no history of its own; the history is tmux's, and tmux
 * repaints the same screen rows with different text as it scrolls. So a cell
 * here is a screen cell, and the only thing that has to move when the buffer
 * scrolls is the ANCHOR, which is the end of the selection the person is not
 * holding.
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

/**
 * Where the anchor sits after the buffer moved under it.
 *
 * `scrolled` is how far the pane has travelled back in time since the drag
 * began, in lines, which is the difference of two `#{scroll_position}`
 * readings. Scrolling BACK moves the content DOWN the screen, so the anchor's
 * row rises by the same amount. That is the whole difference between a
 * selection that grows as rows come into view and one that slides along at a
 * fixed height, which is what the pane did before.
 *
 * Off the screen the anchor is clamped, and the clamp carries the meaning of
 * the edge it hit: past the bottom it is the END of the selection, so it
 * takes the last column of the last row; above the top it is the START, so it
 * takes the first column of the first row. What is highlighted is therefore
 * always exactly what a copy would take, which is the property this keeps.
 */
export function anchorAfterScroll(
  anchor: Cell,
  scrolled: number,
  box: PaneBox
): Cell {
  const row = anchor.row + scrolled;
  if (row < 0) return { col: 0, row: 0 };
  if (row > box.rows - 1) {
    return { col: box.cols, row: Math.max(0, box.rows - 1) };
  }
  return { col: anchor.col, row };
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
