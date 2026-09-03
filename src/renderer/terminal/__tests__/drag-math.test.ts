/**
 * Phase 205 item 3 — the geometry of a selection drag that scrolls.
 *
 * The controller needs an app to prove; these rules do not. Every number
 * below comes from the shape the pane actually has, being a text surface at a
 * known origin with a measured cell box, and the two that matter most are the
 * anchor tracking and the clamp, because they are the difference between a
 * selection that GROWS as rows come into view and one that slides along at a
 * fixed height, which is what the pane did before.
 */

import { describe, expect, it } from 'vitest';
import type { PaneBox } from '../scroll/drag-math';
import {
  anchorAfterScroll,
  cellAtPoint,
  edgeScrollLines,
  selectionSpan
} from '../scroll/drag-math';

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

describe('anchorAfterScroll', () => {
  const anchor = { col: 12, row: 30 };

  it('leaves the anchor alone while nothing has scrolled', () => {
    expect(anchorAfterScroll(anchor, 0, BOX)).toEqual(anchor);
  });

  it('moves the anchor DOWN as the buffer scrolls back in time', () => {
    // Scrolling back moves the content down the screen, so the anchor rides
    // with the text it was placed on. This is the whole of "keep extending".
    expect(anchorAfterScroll(anchor, 1, BOX)).toEqual({ col: 12, row: 31 });
    expect(anchorAfterScroll(anchor, 9, BOX)).toEqual({ col: 12, row: 39 });
  });

  it('moves it UP when the buffer scrolls back toward live output', () => {
    expect(anchorAfterScroll(anchor, -5, BOX)).toEqual({ col: 12, row: 25 });
    expect(anchorAfterScroll(anchor, -30, BOX)).toEqual({ col: 12, row: 0 });
  });

  it('clamps past the bottom to the LAST cell, because it is the end', () => {
    expect(anchorAfterScroll(anchor, 10, BOX)).toEqual({ col: 80, row: 39 });
    expect(anchorAfterScroll(anchor, 5000, BOX)).toEqual({ col: 80, row: 39 });
  });

  it('clamps above the top to the FIRST cell, because it is the start', () => {
    expect(anchorAfterScroll(anchor, -31, BOX)).toEqual({ col: 0, row: 0 });
    expect(anchorAfterScroll(anchor, -5000, BOX)).toEqual({ col: 0, row: 0 });
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
