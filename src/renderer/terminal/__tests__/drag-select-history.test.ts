/**
 * Phase 209 — the selection is the history, not the screen.
 *
 * The controller under this lane is the shipping one, ../scroll/drag-select,
 * over the same three stubs ./drag-select-owned.test.ts uses, plus a view the
 * test moves by hand and a terminal that records every `select` and every
 * `clearSelection`. What is proved:
 *
 *   - the anchor is a HISTORY position, so a hold that scrolls the view far
 *     past it keeps drawing from the top of the screen while the range held
 *     for the copy verbs still starts where the press was;
 *   - a streaming pane cannot move the anchor, because the poll re-anchors a
 *     parked view by exactly the lines that arrived, and the same span is
 *     drawn before and after;
 *   - after the button comes up the range stays held, a scroll back to the
 *     anchor draws it at its own column again, and a change to the selection
 *     that is not ours drops it.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Terminal } from '@xterm/xterm';
import { DragSelect } from '../scroll/drag-select';
import type { ScrollSurface, ScrollView } from '../scroll/surface';
import {
  historyRangeToCopy,
  historySelection,
  holdHistorySelection
} from '../capture/history-selection';

/** A pane at (100, 200), 80 by 40 cells of 7.5 by 18.5 px. */
const RECT = { left: 100, top: 200, width: 600, height: 740 };
const CELL_W = 7.5;
const CELL_H = 18.5;
const xOf = (col: number): number => RECT.left + (col + 0.5) * CELL_W;
const yOf = (row: number): number => RECT.top + (row + 0.5) * CELL_H;

interface Rig {
  select: ReturnType<typeof vi.fn>;
  clearSelection: ReturnType<typeof vi.fn>;
  scrollBy: ReturnType<typeof vi.fn>;
  press: (col: number, row: number) => void;
  moveTo: (clientX: number, clientY: number) => void;
  release: () => void;
  /** Move the surface's view, as an answered scroll or a poll would. */
  setView: (position: number, history: number) => void;
  /** xterm reports a selection change that was not ours. */
  foreignChange: () => void;
  detach: () => void;
}

function rig(): Rig {
  const screen = {
    getBoundingClientRect: () => RECT
  } as unknown as HTMLElement;
  const pane = { querySelector: () => screen };
  const moves: ((event: MouseEvent) => void)[] = [];
  const ups: (() => void)[] = [];
  const doc = {
    querySelector: () => pane,
    addEventListener: (type: string, fn: (event: MouseEvent) => void) => {
      if (type === 'mousemove') moves.push(fn);
      if (type === 'mouseup') ups.push(fn as unknown as () => void);
    },
    removeEventListener: () => undefined
  };
  (screen as unknown as { ownerDocument: unknown }).ownerDocument = doc;
  const globals = globalThis as unknown as Record<string, unknown>;
  globals.document = doc;
  globals.CSS = { escape: (s: string) => s };
  globals.Node = class {};

  const view: ScrollView = {
    position: 0,
    history: 900,
    rows: 40,
    atLive: true,
    owned: true,
    hasPane: true
  };
  const listeners: ((v: ScrollView) => void)[] = [];
  const scrollBy = vi.fn();
  const surface = {
    get view() {
      return { ...view };
    },
    scrollBy,
    subscribe: (fn: (v: ScrollView) => void) => {
      listeners.push(fn);
      fn({ ...view });
      return () => undefined;
    }
  } as unknown as ScrollSurface;

  const select = vi.fn();
  const clearSelection = vi.fn();
  let changed: (() => void) | null = null;
  const term = {
    cols: 80,
    rows: 40,
    select,
    clearSelection,
    onSelectionChange: (fn: () => void) => {
      changed = fn;
      return { dispose: () => undefined };
    },
    buffer: { active: { getLine: () => undefined } }
  } as unknown as Terminal;

  let down: ((event: MouseEvent) => void) | null = null;
  const container = {
    addEventListener: (type: string, fn: (event: MouseEvent) => void) => {
      if (type === 'mousedown') down = fn;
    },
    removeEventListener: () => undefined
  } as unknown as HTMLElement;
  const detach = new DragSelect('s1', term, surface).attach(container);

  const event = (clientX: number, clientY: number): MouseEvent =>
    ({
      button: 0,
      detail: 1,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      ctrlKey: false,
      clientX,
      clientY,
      target: screen
    }) as unknown as MouseEvent;

  return {
    select,
    clearSelection,
    scrollBy,
    press: (col, row) => down?.(event(xOf(col), yOf(row))),
    moveTo: (x, y) => {
      for (const fn of moves) fn(event(x, y));
    },
    release: () => {
      for (const fn of ups) fn();
    },
    setView: (position, history) => {
      view.position = position;
      view.history = history;
      view.atLive = position === 0;
      for (const fn of listeners) fn({ ...view });
    },
    foreignChange: () => changed?.(),
    detach
  };
}

/** The `select` argument list xterm would be handed for a span. */
const span = (
  column: number,
  row: number,
  length: number
): [number, number, number] => [column, row, length];

afterEach(() => {
  vi.useRealTimers();
  holdHistorySelection('s1', null);
});

describe('a drag that scrolls keeps its anchor in the history', () => {
  it('draws from the top of the screen once the anchor has left it, and holds the real start', () => {
    vi.useFakeTimers();
    const r = rig();
    // Live, 900 lines of history, rows 0..39 show lines 900..939. Press at
    // column 4 of row 30, which is line 930.
    r.press(4, 30);
    r.moveTo(xOf(10), RECT.top - 20);
    expect(r.select).not.toHaveBeenCalled();
    // The edge tick asked for lines and the answer moved the view up 5.
    vi.advanceTimersByTime(60);
    expect(r.scrollBy).toHaveBeenCalled();
    r.setView(5, 900);
    // Anchor line 930 is now on row 35; the head is the pointer, clamped to
    // row 0 column 10, which is line 895. Drawn from (10, 0) to (4, 35).
    expect(r.select).toHaveBeenLastCalledWith(...span(10, 0, 35 * 80 + 5 - 10));
    // The view travels far past the anchor: line 930 is 20 rows below the
    // bottom. The drawing is clamped to the last cell of the last row and
    // the range for the copy still ends at the press.
    r.setView(60, 900);
    expect(r.select).toHaveBeenLastCalledWith(...span(10, 0, 40 * 80 - 10));
    expect(historyRangeToCopy('s1')).toEqual({
      start: { line: 840, col: 10 },
      end: { line: 930, col: 4 },
      cols: 80
    });
    r.release();
    r.detach();
  });

  it('cannot be moved by lines arriving at the bottom', () => {
    vi.useFakeTimers();
    const r = rig();
    // Press on row 34, which is line 934 at the live bottom, and drag up to
    // row 28.
    r.press(0, 34);
    r.moveTo(xOf(6), yOf(28));
    // A wheel took over the drag: the view moved 6, so the anchor is now on
    // row 40, one below the bottom, and the head under the pointer is line
    // 922. The drawing runs from (6, 28) to the last cell of the last row.
    r.setView(6, 900);
    expect(r.select).toHaveBeenLastCalledWith(...span(6, 28, 11 * 80 + 80 - 6));
    const before = r.select.mock.lastCall;
    // The pane streams. The poll re-anchors a parked view by exactly what
    // arrived, so both numbers grow by 38, the same span is drawn, and the
    // range still ends on the line that was pressed.
    r.setView(44, 938);
    expect(r.select.mock.lastCall).toEqual(before);
    expect(historyRangeToCopy('s1')).toEqual({
      start: { line: 922, col: 6 },
      end: { line: 934, col: 0 },
      cols: 80
    });
    r.release();
    r.detach();
  });

  it('keeps the range after the button comes up and draws it again where the view goes', () => {
    vi.useFakeTimers();
    const r = rig();
    r.press(7, 30);
    r.moveTo(xOf(9), RECT.top - 20);
    r.setView(60, 900);
    r.release();
    // Held, and spanning the screen: line 930 is below the bottom.
    expect(historyRangeToCopy('s1')).toEqual({
      start: { line: 840, col: 9 },
      end: { line: 930, col: 7 },
      cols: 80
    });
    // Scroll back to the anchor with no button down. Row 30 shows line 930
    // when position is 0, and the start at 840 is above the top.
    r.setView(0, 900);
    expect(r.select).toHaveBeenLastCalledWith(...span(0, 0, 30 * 80 + 8));
    // Scroll to where the start is on row 0: position 60 again.
    r.setView(60, 900);
    expect(r.select).toHaveBeenLastCalledWith(...span(9, 0, 40 * 80 - 9));
    // Scroll where none of it is on screen: nothing is drawn, nothing is
    // forgotten.
    r.setView(200, 900);
    expect(r.clearSelection).toHaveBeenCalledTimes(1);
    expect(historySelection('s1')).not.toBeNull();
    // A change that is not ours, being a click or a select all, drops it.
    r.foreignChange();
    expect(historySelection('s1')).toBeNull();
    r.detach();
  });

  it('a drag that never scrolled holds nothing, so the screen selection stays xterm\'s', () => {
    vi.useFakeTimers();
    const r = rig();
    r.press(2, 10);
    r.moveTo(xOf(20), yOf(12));
    r.release();
    expect(r.select).not.toHaveBeenCalled();
    expect(historySelection('s1')).toBeNull();
    r.detach();
  });

  it('redraws a held range a photograph cleared', () => {
    vi.useFakeTimers();
    const r = rig();
    r.press(3, 30);
    r.moveTo(xOf(3), RECT.top - 20);
    r.setView(10, 900);
    r.release();
    const held = historySelection('s1');
    expect(held).not.toBeNull();
    const drawn = r.select.mock.calls.length;
    // Capture Screen clears the highlight, which xterm reports, and puts it
    // back through the entry it read first.
    r.foreignChange();
    expect(historySelection('s1')).toBeNull();
    held?.redraw();
    expect(historySelection('s1')).not.toBeNull();
    expect(r.select.mock.calls.length).toBe(drawn + 1);
    r.detach();
  });
});
