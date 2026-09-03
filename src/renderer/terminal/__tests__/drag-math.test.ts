/**
 * Phase 205 item 3 and Phase 209, the geometry of a selection drag that
 * scrolls, and the history positions a selection is kept in.
 *
 * The controller needs an app to prove; these rules do not. Every number
 * below comes from the shape the pane actually has, being a text surface at a
 * known origin with a measured cell box, and the ones that matter most are
 * the conversions between a screen row and a history line, because they are
 * the difference between a selection that keeps the text it was placed on and
 * one that keeps a row of the screen while the text moves under it, which is
 * what Phase 205 shipped and stated as its limit.
 */

import { describe, expect, it } from 'vitest';
import type { PaneBox } from '../scroll/drag-math';
import {
  cellAtPoint,
  edgeScrollLines,
  historyLineOf,
  historyRange,
  screenRowOf,
  selectionSpan,
  toHistory,
  visibleSpan
} from '../scroll/drag-math';
import type { HistoryFrame } from '../scroll/drag-math';

/** A pane at (100, 200), 80 by 40 cells, 7.5 by 18.5 px each (measured). */
const BOX: PaneBox = {
  left: 100,
  top: 200,
  cellWidth: 7.5,
  cellHeight: 18.5,
  cols: 80,
  rows: 40
};
const BOTTOM = BOX.top + BOX.rows * BOX.cellHeight;

describe('edgeScrollLines', () => {
  it('is zero everywhere inside the pane, including both edges', () => {
    expect(edgeScrollLines(BOX.top, BOX)).toBe(0);
    expect(edgeScrollLines(BOX.top + 1, BOX)).toBe(0);
    expect(edgeScrollLines(BOTTOM, BOX)).toBe(0);
    expect(edgeScrollLines(BOTTOM - 1, BOX)).toBe(0);
    expect(edgeScrollLines((BOX.top + BOTTOM) / 2, BOX)).toBe(0);
  });

  it('scrolls back in time above the top and forward below the bottom', () => {
    // Positive is what ScrollSurface.scrollBy takes for "back in time".
    expect(edgeScrollLines(BOX.top - 1, BOX)).toBe(1);
    expect(edgeScrollLines(BOX.top - 20, BOX)).toBe(2);
    expect(edgeScrollLines(BOTTOM + 1, BOX)).toBe(-1);
    expect(edgeScrollLines(BOTTOM + 20, BOX)).toBe(-2);
  });

  it('caps one tick at a screen, however far the pointer is flung', () => {
    expect(edgeScrollLines(BOX.top - 100_000, BOX)).toBe(BOX.rows);
    expect(edgeScrollLines(BOTTOM + 100_000, BOX)).toBe(-BOX.rows);
  });

  it('is zero for a pane that has not been measured yet', () => {
    expect(edgeScrollLines(0, { ...BOX, cellHeight: 0 })).toBe(0);
    expect(edgeScrollLines(0, { ...BOX, rows: 0 })).toBe(0);
  });
});

describe('cellAtPoint', () => {
  it('reads the cell under the point', () => {
    expect(cellAtPoint(100, 200, BOX)).toEqual({ col: 0, row: 0 });
    expect(cellAtPoint(100 + 7.5 * 3 + 1, 200 + 18.5 * 5 + 1, BOX)).toEqual({
      col: 3,
      row: 5
    });
  });

  it('clamps a pointer that has left the pane', () => {
    expect(cellAtPoint(-9999, -9999, BOX)).toEqual({ col: 0, row: 0 });
    expect(cellAtPoint(9999, 9999, BOX)).toEqual({ col: 79, row: 39 });
  });
});

describe('history positions', () => {
  // The measurement of 2026-09-03 on a scratch server: a 40 by 10 pane with
  // 96 lines of history parked 30 above the live bottom.
  const frame: HistoryFrame = { history: 96, position: 30, rows: 10, cols: 40 };

  it('converts a screen row to the history line it shows, and back', () => {
    // Row 0 at position 30 is 30 lines above the live screen's top row.
    expect(historyLineOf(0, frame)).toBe(66);
    expect(screenRowOf(66, frame)).toBe(0);
    for (let row = 0; row < frame.rows; row += 1) {
      expect(screenRowOf(historyLineOf(row, frame), frame)).toBe(row);
    }
    for (let line = 0; line < 200; line += 1) {
      expect(historyLineOf(screenRowOf(line, frame), frame)).toBe(line);
    }
  });

  it('keeps the column with the line', () => {
    expect(toHistory({ col: 12, row: 3 }, frame)).toEqual({ line: 69, col: 12 });
  });

  it('at the live bottom the top row is the first row past the history', () => {
    const live: HistoryFrame = { ...frame, position: 0 };
    expect(historyLineOf(0, live)).toBe(96);
    expect(historyLineOf(9, live)).toBe(105);
  });

  it('does not move when lines arrive at the bottom of a parked view', () => {
    // Ten lines arrived while the view was parked. The poll re-anchors the
    // view by the growth, so `history` and `position` grow together, and the
    // line under every row is the one that was there. That is the streaming
    // claim of the phase, and it is arithmetic rather than luck.
    const grown: HistoryFrame = { ...frame, history: 106, position: 40 };
    for (let row = 0; row < frame.rows; row += 1) {
      expect(historyLineOf(row, grown)).toBe(historyLineOf(row, frame));
    }
  });

  it('moves the ROW, never the line, when the view is live and lines arrive', () => {
    // A live view has nothing to re-anchor, so the text scrolls up the
    // screen. The position of a line is unchanged; the row it is drawn on is
    // what moved, by exactly the lines that arrived.
    const live: HistoryFrame = { ...frame, position: 0 };
    const anchored = toHistory({ col: 4, row: 7 }, live);
    const later: HistoryFrame = { ...live, history: live.history + 3 };
    expect(screenRowOf(anchored.line, later)).toBe(4);
    expect(toHistory({ col: 4, row: 4 }, later)).toEqual(anchored);
  });

  it('orders a range by line first and column second, either way round', () => {
    const a = { line: 70, col: 30 };
    const b = { line: 72, col: 2 };
    expect(historyRange(a, b)).toEqual({ start: a, end: b });
    expect(historyRange(b, a)).toEqual({ start: a, end: b });
    const c = { line: 70, col: 5 };
    expect(historyRange(a, c)).toEqual({ start: c, end: a });
    expect(historyRange(a, a)).toEqual({ start: a, end: a });
  });
});

describe('visibleSpan', () => {
  const frame: HistoryFrame = { history: 96, position: 30, rows: 10, cols: 40 };
  // Rows 0..9 show lines 66..75 under this frame.

  it('draws a range that is wholly on screen exactly, and says it fits', () => {
    const range = historyRange({ line: 68, col: 4 }, { line: 70, col: 9 });
    expect(visibleSpan(range, frame)).toEqual(
      selectionSpan({ col: 4, row: 2 }, { col: 9, row: 4 }, 40)
    );
  });

  it('clamps a start above the top to the first cell, for drawing only', () => {
    const range = historyRange({ line: 20, col: 33 }, { line: 70, col: 9 });
    expect(visibleSpan(range, frame)).toEqual(
      selectionSpan({ col: 0, row: 0 }, { col: 9, row: 4 }, 40)
    );
    // The range itself still knows where it starts.
    expect(range.start).toEqual({ line: 20, col: 33 });
  });

  it('clamps an end below the bottom to the last cell of the last row', () => {
    const range = historyRange({ line: 68, col: 4 }, { line: 200, col: 1 });
    expect(visibleSpan(range, frame)).toEqual({
      column: 4,
      row: 2,
      length: 7 * 40 + (40 - 4)
    });
  });

  it('draws the whole screen for a range that covers it from both sides', () => {
    const range = historyRange({ line: 0, col: 0 }, { line: 500, col: 0 });
    expect(visibleSpan(range, frame)).toEqual({
      column: 0,
      row: 0,
      length: 10 * 40
    });
  });

  it('draws nothing for a range that is entirely off the screen', () => {
    expect(
      visibleSpan(historyRange({ line: 1, col: 0 }, { line: 65, col: 39 }), frame)
    ).toBeNull();
    expect(
      visibleSpan(historyRange({ line: 76, col: 0 }, { line: 90, col: 0 }), frame)
    ).toBeNull();
    expect(visibleSpan(historyRange({ line: 1, col: 0 }, { line: 2, col: 0 }), {
      ...frame,
      rows: 0
    })).toBeNull();
  });

  it('follows the view: scrolling back to the anchor shows it drawn again', () => {
    // The Phase 205 limit, inverted. Anchor at line 40, head at line 70 after
    // the hold. Parked where the anchor is off screen it is clamped away;
    // parked back at the anchor it is drawn at its own column.
    const range = historyRange({ line: 40, col: 7 }, { line: 70, col: 9 });
    const atAnchor: HistoryFrame = { ...frame, position: 56 };
    expect(screenRowOf(40, atAnchor)).toBe(0);
    expect(visibleSpan(range, atAnchor)).toEqual({
      column: 7,
      row: 0,
      length: 9 * 40 + (40 - 7)
    });
  });
});

describe('selectionSpan', () => {
  it('reads the same either way round', () => {
    const a = { col: 4, row: 2 };
    const b = { col: 9, row: 7 };
    expect(selectionSpan(a, b, 80)).toEqual(selectionSpan(b, a, 80));
  });

  it('starts at the earlier end and counts cells across row ends', () => {
    // Row 2 column 4 to row 7 column 9, with the cell under the later end in.
    expect(selectionSpan({ col: 4, row: 2 }, { col: 9, row: 7 }, 80)).toEqual({
      column: 4,
      row: 2,
      length: 5 * 80 + (10 - 4)
    });
  });

  it('takes at least the one cell the two ends share', () => {
    expect(selectionSpan({ col: 3, row: 1 }, { col: 3, row: 1 }, 80)).toEqual({
      column: 3,
      row: 1,
      length: 1
    });
  });

  it('never reaches past the end of a row', () => {
    const span = selectionSpan({ col: 0, row: 0 }, { col: 79, row: 0 }, 80);
    expect(span).toEqual({ column: 0, row: 0, length: 80 });
  });

  it('takes a clamped anchor as a whole-row end', () => {
    // What anchorAfterScroll hands back when the anchor left the bottom.
    const span = selectionSpan({ col: 0, row: 5 }, { col: 80, row: 39 }, 80);
    expect(span).toEqual({ column: 0, row: 5, length: 34 * 80 + 80 });
  });
});
