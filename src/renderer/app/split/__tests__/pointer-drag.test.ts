/**
 * Phase 12.2 — a rename must never be fought by a row tracking the pointer.
 *
 * Two independent defects put it there, and both are locked down here:
 *
 * 1. A SECONDARY press armed a drag. `button !== 0` alone was not enough:
 *    macOS's ctrl+click secondary click arrives as `button === 0` with
 *    `ctrlKey`, so the context-menu press sailed through the guard.
 * 2. A PENDING press (pressed, still under the 4px threshold) tore itself
 *    down on pointerup — but a native menu takes an OS mouse grab, so that
 *    pointerup never reaches the renderer. The listeners stayed live and the
 *    next pointermove, by which time the user was reaching for the rename
 *    box, armed a drag from a press made seconds earlier.
 *
 * The module drives `window`/`document` directly, so the suite runs against a
 * minimal event-target fake rather than pulling in a DOM implementation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

// --- minimal window/document fake -----------------------------------------

type Listener = (e: unknown) => void;

interface FakeWindow {
  listeners: Map<string, Set<Listener>>;
  addEventListener(type: string, fn: Listener, capture?: unknown): void;
  removeEventListener(type: string, fn: Listener, capture?: unknown): void;
  emit(type: string, event: Record<string, unknown>): void;
  count(type: string): number;
}

function makeWindow(): FakeWindow {
  const listeners = new Map<string, Set<Listener>>();
  return {
    listeners,
    addEventListener(type, fn) {
      const set = listeners.get(type) ?? new Set<Listener>();
      set.add(fn);
      listeners.set(type, set);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    emit(type, event) {
      for (const fn of [...(listeners.get(type) ?? [])]) {
        fn({ type, preventDefault() {}, stopPropagation() {}, ...event });
      }
    },
    count(type) {
      return listeners.get(type)?.size ?? 0;
    }
  };
}

const classes = new Set<string>();

beforeEach(() => {
  classes.clear();
  const win = makeWindow();
  vi.stubGlobal('window', win);
  vi.stubGlobal('document', {
    body: {
      classList: {
        add: (c: string) => classes.add(c),
        remove: (c: string) => classes.delete(c),
        contains: (c: string) => classes.has(c)
      }
    }
  });
});

// The engine keeps one module-level "a drag is outstanding" flag, so a test
// that leaves a drag armed would block every test after it.
afterEach(() => {
  cancelPointerDrag();
  expect(isDragActive()).toBe(false);
});

function win(): FakeWindow {
  return globalThis.window as unknown as FakeWindow;
}

/** A drag is ARMED exactly when the engine has marked the body. */
function isArmed(): boolean {
  return classes.has('gmux-dragging');
}

function press(over: Partial<Record<string, unknown>> = {}): {
  clientX: number;
  clientY: number;
  button: number;
  ctrlKey: boolean;
} {
  return { clientX: 100, clientY: 100, button: 0, ctrlKey: false, ...over };
}

type PointerSpy = Mock<(e: PointerEvent) => void>;

function spyHandlers(): {
  onStart: PointerSpy;
  onMove: PointerSpy;
  onDrop: PointerSpy;
  onEnd: Mock<(canceled: boolean) => void>;
} {
  return {
    onStart: vi.fn<(e: PointerEvent) => void>(),
    onMove: vi.fn<(e: PointerEvent) => void>(),
    onDrop: vi.fn<(e: PointerEvent) => void>(),
    onEnd: vi.fn<(canceled: boolean) => void>()
  };
}

// Imported after the globals exist — the module reads them lazily, but this
// keeps the suite honest about load order.
const { armPointerDrag, cancelPointerDrag, isDragActive, isSecondaryPress } =
  await import('../pointer-drag');

describe('isSecondaryPress', () => {
  it('accepts a plain primary press', () => {
    expect(isSecondaryPress({ button: 0, ctrlKey: false })).toBe(false);
  });

  it('rejects the middle and right buttons', () => {
    expect(isSecondaryPress({ button: 1, ctrlKey: false })).toBe(true);
    expect(isSecondaryPress({ button: 2, ctrlKey: false })).toBe(true);
  });

  it('rejects macOS ctrl+click, which Chromium reports as button 0', () => {
    expect(isSecondaryPress({ button: 0, ctrlKey: true })).toBe(true);
  });
});

describe('armPointerDrag — secondary presses never arm', () => {
  it.each([
    ['middle button', press({ button: 1 })],
    ['right button', press({ button: 2 })],
    ['ctrl+click (macOS secondary click)', press({ ctrlKey: true })]
  ])('ignores %s and registers no listeners', (_label, down) => {
    const h = spyHandlers();
    armPointerDrag(down, h);

    expect(win().count('pointermove')).toBe(0);
    expect(win().count('pointerup')).toBe(0);

    // Even a long travel afterwards must not start anything.
    win().emit('pointermove', { clientX: 400, clientY: 400 });
    expect(h.onStart).not.toHaveBeenCalled();
    expect(h.onMove).not.toHaveBeenCalled();
    expect(isArmed()).toBe(false);
    expect(isDragActive()).toBe(false);
  });

  it('still arms a primary press past the threshold', () => {
    const h = spyHandlers();
    armPointerDrag(press(), h);

    win().emit('pointermove', { clientX: 102, clientY: 100 }); // under 4px
    expect(h.onStart).not.toHaveBeenCalled();

    win().emit('pointermove', { clientX: 140, clientY: 100 });
    expect(h.onStart).toHaveBeenCalledTimes(1);
    expect(h.onMove).toHaveBeenCalledTimes(1);
    expect(isDragActive()).toBe(true);

    win().emit('pointerup', { clientX: 140, clientY: 100 });
    expect(h.onDrop).toHaveBeenCalledTimes(1);
    expect(h.onEnd).toHaveBeenCalledWith(false);
    expect(isDragActive()).toBe(false);
  });
});

describe('cancelPointerDrag', () => {
  it('revokes a PENDING press so a later move cannot arm it', () => {
    const h = spyHandlers();
    armPointerDrag(press(), h);
    expect(win().count('pointermove')).toBe(1);

    // The native menu opened: no pointerup will ever arrive.
    cancelPointerDrag();

    expect(win().count('pointermove')).toBe(0);
    expect(win().count('pointerup')).toBe(0);
    expect(win().count('keydown')).toBe(0);

    win().emit('pointermove', { clientX: 400, clientY: 400 });
    expect(h.onStart).not.toHaveBeenCalled();
    expect(isArmed()).toBe(false);
    // A pending drag never started, so it never "ends".
    expect(h.onEnd).not.toHaveBeenCalled();
  });

  it('aborts an ARMED drag, reporting it as canceled', () => {
    const h = spyHandlers();
    armPointerDrag(press(), h);
    win().emit('pointermove', { clientX: 200, clientY: 100 });
    expect(isDragActive()).toBe(true);

    cancelPointerDrag();

    expect(h.onEnd).toHaveBeenCalledWith(true);
    expect(h.onDrop).not.toHaveBeenCalled();
    expect(isDragActive()).toBe(false);
    expect(isArmed()).toBe(false);
  });

  it('is a no-op when nothing is outstanding, and frees the engine', () => {
    expect(() => cancelPointerDrag()).not.toThrow();

    // A canceled drag must not leave dragActive stuck — the next press works.
    const h = spyHandlers();
    armPointerDrag(press(), h);
    win().emit('pointermove', { clientX: 400, clientY: 100 });
    expect(h.onStart).toHaveBeenCalledTimes(1);
  });

  it('a finished drag does not keep a cancel handle around', () => {
    const first = spyHandlers();
    armPointerDrag(press(), first);
    win().emit('pointerup', { clientX: 100, clientY: 100 }); // first ends

    const second = spyHandlers();
    armPointerDrag(press({ clientX: 300 }), second);
    win().emit('pointermove', { clientX: 380, clientY: 100 });
    expect(second.onStart).toHaveBeenCalledTimes(1);

    expect(first.onEnd).not.toHaveBeenCalled();
    expect(isDragActive()).toBe(true);
    cancelPointerDrag();
    expect(second.onEnd).toHaveBeenCalledWith(true);
    // The already-finished first drag must not be re-ended.
    expect(first.onEnd).not.toHaveBeenCalled();
  });

  it('clears EVERY pending press, not just the most recent', () => {
    const a = spyHandlers();
    const b = spyHandlers();
    armPointerDrag(press({ clientX: 100 }), a);
    armPointerDrag(press({ clientX: 300 }), b);
    expect(win().count('pointermove')).toBe(2);

    cancelPointerDrag();

    expect(win().count('pointermove')).toBe(0);
    win().emit('pointermove', { clientX: 600, clientY: 400 });
    expect(a.onStart).not.toHaveBeenCalled();
    expect(b.onStart).not.toHaveBeenCalled();
  });
});
