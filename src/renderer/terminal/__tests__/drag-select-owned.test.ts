/**
 * Phase 205 item 3, fix round — the drag leaves a pane whose mouse is not
 * ours entirely alone.
 *
 * `ScrollSurface` has kept the WHEEL out of two kinds of pane since Phase
 * 12.3, being a program that asked for mouse reporting and an app on its own
 * alternate screen, and the drag shipped without the same rule. MEASURED in
 * the app at 44941af with `cat` behind SGR mouse reporting: a drag held above
 * the top edge scrolled the history from 0 to 104, put the pane into copy
 * mode and painted 43 lines. This is that gesture with no app in it.
 *
 * The DOM here is three stubs rather than a document, because the suite runs
 * under node. They are exactly what ../capture/metrics reads, being one
 * `querySelector` per level and one rect, so the module under test is the
 * shipping one and nothing is mocked out of it.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Terminal } from '@xterm/xterm';
import { DragSelect } from '../scroll/drag-select';
import type { ScrollSurface, ScrollView } from '../scroll/surface';

/** A pane at (100, 200), 80 by 40 cells of 7.5 by 18.5 px. */
const RECT = { left: 100, top: 200, width: 600, height: 740 };

interface Rig {
  scrollBy: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  view: ScrollView;
  press: (clientX: number, clientY: number) => void;
  moveTo: (clientX: number, clientY: number) => void;
  detach: () => void;
}

function rig(owned: boolean): Rig {
  const screen = {
    getBoundingClientRect: () => RECT
  } as unknown as HTMLElement;
  const pane = { querySelector: () => screen };
  const moves: ((event: MouseEvent) => void)[] = [];
  const doc = {
    querySelector: () => pane,
    addEventListener: (type: string, fn: (event: MouseEvent) => void) => {
      if (type === 'mousemove') moves.push(fn);
    },
    removeEventListener: () => undefined
  };
  (screen as unknown as { ownerDocument: unknown }).ownerDocument = doc;
  const globals = globalThis as unknown as Record<string, unknown>;
  globals.document = doc;
  globals.CSS = { escape: (s: string) => s };
  // The module asks `target instanceof Node` before it trusts an
  // `ownerDocument`. There is no Node under this lane, so the stub makes that
  // answer false and the module falls back to `globalThis.document`, which is
  // the same object the listeners are counted on.
  globals.Node = class {};

  const view: ScrollView = {
    position: 0,
    history: 900,
    rows: 40,
    atLive: true,
    owned,
    hasPane: true
  };
  const scrollBy = vi.fn();
  const subscribe = vi.fn(() => () => undefined);
  const select = vi.fn();
  const clearSelection = vi.fn();
  const surface = {
    get view() {
      return view;
    },
    scrollBy,
    subscribe
  } as unknown as ScrollSurface;
  // Phase 209 added two reads of the terminal: the change event, watched so
  // a click or a select all drops a held history range, and the pressed
  // cell's width, so a press on the second half of a wide character starts
  // where xterm's own selection would. Neither exists under this lane, and
  // a stub that answers nothing is exactly a pane with no wide characters.
  const term = {
    cols: 80,
    rows: 40,
    select,
    clearSelection,
    onSelectionChange: () => ({ dispose: () => undefined }),
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
    scrollBy,
    subscribe,
    select,
    view,
    press: (x, y) => down?.(event(x, y)),
    moveTo: (x, y) => {
      for (const fn of moves) fn(event(x, y));
    },
    detach
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('a drag held outside the pane', () => {
  it('scrolls the history when the pane is ours', () => {
    vi.useFakeTimers();
    const r = rig(true);
    r.press(RECT.left + 40, RECT.top + 700);
    r.moveTo(RECT.left + 40, RECT.top - 40);
    vi.advanceTimersByTime(200);
    r.detach();
    expect(r.scrollBy).toHaveBeenCalled();
    expect(r.scrollBy.mock.calls.every(([n]) => (n as number) > 0)).toBe(true);
  });

  it('does nothing at all when the program inside asked for the mouse', () => {
    vi.useFakeTimers();
    const r = rig(false);
    r.press(RECT.left + 40, RECT.top + 700);
    r.moveTo(RECT.left + 40, RECT.top - 40);
    vi.advanceTimersByTime(200);
    r.detach();
    // The view is watched from the attach, since Phase 209 re-projects a
    // held range when the view moves, so the subscription is not the
    // gesture's and is the same one in both panes. The gesture is the scroll
    // and the select, and neither happened.
    expect(r.subscribe).toHaveBeenCalledTimes(1);
    expect(r.scrollBy).not.toHaveBeenCalled();
    expect(r.select).not.toHaveBeenCalled();
  });

  it('stops when a program asks for the mouse mid gesture', () => {
    vi.useFakeTimers();
    const r = rig(true);
    r.press(RECT.left + 40, RECT.top + 700);
    r.moveTo(RECT.left + 40, RECT.top - 40);
    vi.advanceTimersByTime(200);
    const before = r.scrollBy.mock.calls.length;
    expect(before).toBeGreaterThan(0);
    // A picker opens while the button is still down.
    r.view.owned = false;
    vi.advanceTimersByTime(1000);
    r.detach();
    expect(r.scrollBy.mock.calls.length).toBe(before);
  });
});
