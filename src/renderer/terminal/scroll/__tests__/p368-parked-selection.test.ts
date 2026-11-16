/**
 * Phase 368, item 7, TAKEN BACK OUT by the fix round (issue 44,
 * build/p368/SPEC.md §As built "The fix round"; research 142 §2.3 and §2.4).
 *
 * The build held every selection made while the pane was scrolled back (a
 * click, a double click, a select all, a drag that never scrolled) as history
 * positions, so Copy composed it through `-J` and a line tmux wrapped stayed
 * whole. The attack lens then copied rows tmux holds with a STALE wrap mark (a
 * program redrew them in place) and got 4 lines where the screen draws 11,
 * three of them rows drawn apart glued with runs of a hundred spaces; the
 * parent copied the 11 as drawn. The ink guard leaves research 142's G2 glued,
 * which the parent copies as drawn, so no rule was left that is never worse
 * than the parent, and the conversion was removed.
 *
 * So this file now pins the PARENT's behaviour, which a later round must not
 * change again without that measurement: a selection xterm made, live or
 * scrolled back, is xterm's own and nothing is held for it; only a drag that
 * took over (it scrolled the view) is held as history, as Phase 209 built it.
 *
 * The controller is the shipping ../drag-select over the same DOM stubs its
 * Phase 205 and 209 lanes use. The terminal stub behaves as xterm 6.0.0 does
 * where this module reads it: `select` sets the span exactly as
 * SelectionModel's `finalSelectionEnd` computes it and reports the change
 * synchronously, as `setSelection` does, and xterm's own gestures report a
 * change only when the button comes up (SelectionService.ts,
 * `_handleMouseUp`), never on a press or a move.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IBufferRange, Terminal } from '@xterm/xterm';
import { DragSelect } from '../drag-select';
import type { ScrollSurface, ScrollView } from '../surface';
import {
  historyRangeToCopy,
  holdHistorySelection
} from '../../capture/history-selection';

/** A pane at (100, 200), 80 by 40 cells of 7.5 by 18.5 px. */
const RECT = { left: 100, top: 200, width: 600, height: 740 };
const CELL_W = 7.5;
const CELL_H = 18.5;
const COLS = 80;
const ROWS = 40;
const xOf = (col: number): number => RECT.left + (col + 0.5) * CELL_W;
const yOf = (row: number): number => RECT.top + (row + 0.5) * CELL_H;

/** Where the view is: live, or parked over a frame of the given depth. */
interface ViewAt {
  position: number;
  history: number;
  entry: number | null;
  owned?: boolean;
}

/**
 * xterm's SelectionModel for a span set by `select(column, row, length)`:
 * the end wraps at the width, and a span that ends on the right edge ends at
 * column `cols` of its last row rather than at column 0 of the next.
 */
function spanRange(column: number, row: number, length: number): IBufferRange {
  const startPlusLength = column + length;
  if (startPlusLength <= COLS) {
    return { start: { x: column, y: row }, end: { x: startPlusLength, y: row } };
  }
  if (startPlusLength % COLS === 0) {
    return {
      start: { x: column, y: row },
      end: { x: COLS, y: row + Math.floor(startPlusLength / COLS) - 1 }
    };
  }
  return {
    start: { x: column, y: row },
    end: { x: startPlusLength % COLS, y: row + Math.floor(startPlusLength / COLS) }
  };
}

function rig(at: ViewAt) {
  const screen = { getBoundingClientRect: () => RECT } as unknown as HTMLElement;
  const pane = { querySelector: () => screen };
  const moves: ((event: MouseEvent) => void)[] = [];
  const ups: (() => void)[] = [];
  const doc = {
    querySelector: () => pane,
    addEventListener: (type: string, fn: (event: MouseEvent) => void) => {
      if (type === 'mousemove') moves.push(fn);
      if (type === 'mouseup') ups.push(fn as unknown as () => void);
    },
    removeEventListener: (type: string, fn: unknown) => {
      if (type === 'mousemove') moves.splice(moves.indexOf(fn as never) >>> 0, 1);
      if (type === 'mouseup') ups.splice(ups.indexOf(fn as never) >>> 0, 1);
    }
  };
  (screen as unknown as { ownerDocument: unknown }).ownerDocument = doc;
  vi.stubGlobal('document', doc);
  vi.stubGlobal('CSS', { escape: (s: string) => s });
  // `target instanceof Node` is false against this stub, so the module listens
  // on `globalThis.document`, the same object the listeners are counted on.
  vi.stubGlobal('Node', class {});

  const view: ScrollView = {
    position: at.position,
    history: at.history,
    historyAtEntry: at.entry,
    rows: ROWS,
    atLive: at.position === 0,
    owned: at.owned ?? true,
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

  // The selection xterm holds, and its change event.
  let selection: IBufferRange | undefined;
  let changed: (() => void) | null = null;
  const select = vi.fn((column: number, row: number, length: number) => {
    selection = spanRange(column, row, length);
    changed?.();
  });
  const clearSelection = vi.fn(() => {
    selection = undefined;
    changed?.();
  });
  const term = {
    cols: COLS,
    rows: ROWS,
    select,
    clearSelection,
    getSelectionPosition: () => selection,
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

  const event = (clientX: number, clientY: number, detail = 1): MouseEvent =>
    ({
      button: 0,
      detail,
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
    scrollBy,
    selection: () => selection,
    /**
     * xterm's own gesture or public call ended with this selection and said
     * so: the button of a click, a double click or a triple click came up, a
     * select all, a clear. `undefined` is a click that left nothing selected.
     */
    xtermReports(range: IBufferRange | undefined): void {
      selection = range;
      changed?.();
    },
    /** A press of the given click count, as xterm and then the mount see it. */
    press(col: number, row: number, detail = 1): void {
      // xterm's mousedown runs first, on `.xterm`, below the mount: a single
      // press starts a new selection with no end, and reports nothing.
      if (detail === 1) selection = undefined;
      down?.(event(xOf(col), yOf(row), detail));
    },
    /** A move with the button down: xterm extends its selection silently. */
    moveTo(col: number, row: number, from: { col: number; row: number }): void {
      selection = { start: { x: from.col, y: from.row }, end: { x: col + 1, y: row } };
      for (const fn of [...moves]) fn(event(xOf(col), yOf(row)));
    },
    moveAbove(col: number): void {
      for (const fn of [...moves]) fn(event(xOf(col), RECT.top - 20));
    },
    /** The button comes up: the mount's capture-phase listener runs first. */
    release(): void {
      for (const fn of [...ups]) fn();
    },
    setView(position: number, history: number, entry: number | null): void {
      view.position = position;
      view.history = history;
      view.historyAtEntry = entry;
      view.atLive = position === 0;
      for (const fn of listeners) fn({ ...view });
    },
    detach
  };
}

/** Parked 100 lines back over a frame 900 lines deep: row r is line 800 + r. */
const PARKED: ViewAt = { position: 100, history: 1040, entry: 900 };

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  holdHistorySelection('s1', null);
});

describe("a selection made while scrolled back that never scrolled is xterm's own, as before Phase 368", () => {
  it('holds nothing for a double click, a triple click or a Shift click', () => {
    const r = rig(PARKED);
    r.press(4, 10, 1);
    r.release();
    r.press(4, 10, 2);
    r.xtermReports({ start: { x: 4, y: 10 }, end: { x: 9, y: 10 } });
    expect(historyRangeToCopy('s1')).toBeNull();
    r.press(0, 7, 3);
    r.xtermReports({ start: { x: 0, y: 7 }, end: { x: COLS, y: 7 } });
    expect(historyRangeToCopy('s1')).toBeNull();
    r.xtermReports({ start: { x: 0, y: 7 }, end: { x: 12, y: 9 } });
    expect(historyRangeToCopy('s1')).toBeNull();
    // xterm's own selection stands, and the mount never redraws it.
    expect(r.selection()).toEqual({ start: { x: 0, y: 7 }, end: { x: 12, y: 9 } });
    expect(r.select).not.toHaveBeenCalled();
    r.detach();
  });

  it('holds nothing for a select all', () => {
    const r = rig(PARKED);
    r.xtermReports({ start: { x: 0, y: 0 }, end: { x: COLS, y: ROWS - 1 } });
    expect(historyRangeToCopy('s1')).toBeNull();
    expect(r.selection()).toEqual({ start: { x: 0, y: 0 }, end: { x: COLS, y: ROWS - 1 } });
    r.detach();
  });

  it('holds nothing for a drag that never scrolled, when its button comes up', () => {
    vi.useFakeTimers();
    const r = rig(PARKED);
    r.press(2, 10);
    r.moveTo(20, 12, { col: 2, row: 10 });
    r.release();
    expect(historyRangeToCopy('s1')).toBeNull();
    expect(r.scrollBy).not.toHaveBeenCalled();
    expect(r.select).not.toHaveBeenCalled();
    r.detach();
  });

  it("holds nothing on a view walked to position 0 inside copy mode, nor live, nor on a pane whose mouse is the program's", () => {
    const views: ViewAt[] = [
      { position: 0, history: 950, entry: 900 },
      { position: 0, history: 900, entry: null },
      { ...PARKED, owned: false }
    ];
    for (const at of views) {
      const r = rig(at);
      r.xtermReports({ start: { x: 0, y: 3 }, end: { x: 7, y: 3 } });
      expect(historyRangeToCopy('s1'), JSON.stringify(at)).toBeNull();
      expect(r.select, JSON.stringify(at)).not.toHaveBeenCalled();
      r.detach();
      vi.unstubAllGlobals();
    }
  });
});

describe('a drag that scrolled is held as history, as Phase 209 built it', () => {
  /** A drag from row 30 past the top edge, whose tick scrolled the view five lines back. */
  function takeOver(): ReturnType<typeof rig> {
    vi.useFakeTimers();
    const r = rig({ position: 0, history: 900, entry: null });
    r.press(4, 30);
    r.moveAbove(10);
    vi.advanceTimersByTime(60);
    expect(r.scrollBy).toHaveBeenCalled();
    r.setView(5, 900, 900);
    return r;
  }

  it('holds the range the drag drew, and a change xterm made drops it', () => {
    const r = takeOver();
    expect(historyRangeToCopy('s1')).toEqual({
      start: { line: 895, col: 10 },
      end: { line: 930, col: 4 },
      cols: COLS
    });
    // A select all mid drag is not held: the range goes, as it always did.
    r.xtermReports({ start: { x: 0, y: 0 }, end: { x: COLS, y: ROWS - 1 } });
    expect(historyRangeToCopy('s1')).toBeNull();
    r.release();
    r.detach();
  });

  it('drops the range at a new press, which xterm has already begun', () => {
    const r = takeOver();
    r.release();
    expect(historyRangeToCopy('s1')).not.toBeNull();
    r.press(30, 20);
    expect(historyRangeToCopy('s1')).toBeNull();
    r.detach();
  });

  it('drops the range at the teardown', () => {
    const r = takeOver();
    r.release();
    expect(historyRangeToCopy('s1')).not.toBeNull();
    r.detach();
    expect(historyRangeToCopy('s1')).toBeNull();
  });
});
