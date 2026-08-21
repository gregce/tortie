/**
 * Phase 129 item 2 — the session rail answers the arrow keys and switches on
 * one click.
 *
 * Two defects the operator reported on 2026-08-21, with the sessions pane on
 * the right. Both were measured in the live app by build/probe-p129-rail.mjs
 * before anything was edited, and this suite holds the two decisions that came
 * out of the measurement, at the seam where each one lives.
 *
 *  - THE ARROWS. After one ArrowDown the keyboard was in
 *    `xterm-helper-textarea` rather than in the list, in both densities, so
 *    the second press never reached the list at all. The decision is
 *    `keyboardIsInASessionList()`, a DOM read that both of TerminalPane's
 *    focus calls now consult.
 *  - THE TWO CLICKS. Three click shapes were pressed on a collapsed rail item.
 *    A bare `click()` switched in one press. A pointerdown, pointerup and
 *    click at one point switched in one press. The same sequence with 8 px of
 *    travel never switched in three presses. The travel arms the drag engine,
 *    the drop lands on the row it started on and writes nothing, and the click
 *    that follows was swallowed anyway. The decision is that a drop which
 *    changed nothing lets its click through.
 *
 * The vitest environment is node and jsdom is not a dependency of this
 * repository, so both the document and the window are hand built stubs. That
 * is the right seam anyway: what is under test here is a rule, and the pixels
 * are proven by the probe.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// A document with one focused element, and a window that records listeners
// ---------------------------------------------------------------------------

interface FakeElement {
  slot: string | null;
  blur: ReturnType<typeof vi.fn>;
  closest(selector: string): FakeElement | null;
}

/**
 * `slot` is the value of the enclosing `data-slot`, or null for an element
 * that sits outside every session list. `closest` answers the way the real
 * one does for the one selector this module passes it.
 */
function element(slot: string | null): FakeElement {
  const el: FakeElement = {
    slot,
    blur: vi.fn(),
    closest(selector: string) {
      if (slot === null) return null;
      return selector.includes(`data-slot="${slot}"`) ? el : null;
    }
  };
  return el;
}

function focus(el: FakeElement | null): void {
  vi.stubGlobal('document', { activeElement: el });
}

const { keyboardIsInASessionList, releaseSessionListKeyboard } = await import(
  '../session-list-keyboard'
);

describe('keyboardIsInASessionList', () => {
  it('is true inside the top strip and inside the right hand dock', () => {
    focus(element('session-strip'));
    expect(keyboardIsInASessionList()).toBe(true);
    focus(element('session-dock'));
    expect(keyboardIsInASessionList()).toBe(true);
  });

  it('is false in the terminal, in the editor and with nothing focused', () => {
    focus(element(null));
    expect(keyboardIsInASessionList()).toBe(false);
    focus(null);
    expect(keyboardIsInASessionList()).toBe(false);
  });
});

describe('releaseSessionListKeyboard', () => {
  it('blurs the list that has the keyboard', () => {
    const el = element('session-dock');
    focus(el);
    releaseSessionListKeyboard();
    expect(el.blur).toHaveBeenCalledTimes(1);
  });

  it('leaves the keyboard alone when it is not in a session list', () => {
    const el = element(null);
    focus(el);
    releaseSessionListKeyboard();
    expect(el.blur).not.toHaveBeenCalled();
  });

  it('is a no-op when nothing has the keyboard', () => {
    focus(null);
    expect(() => releaseSessionListKeyboard()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// The swallow rule, at the engine that swallows
// ---------------------------------------------------------------------------

type Listener = (e: unknown) => void;

interface FakeWindow {
  listeners: Map<string, Set<Listener>>;
  addEventListener(type: string, fn: Listener, opts?: unknown): void;
  removeEventListener(type: string, fn: Listener, opts?: unknown): void;
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

function win(): FakeWindow {
  return globalThis.window as unknown as FakeWindow;
}

const { armPointerDrag, cancelPointerDrag, isDragActive } = await import(
  '../split/pointer-drag'
);

describe('a drag that changed nothing lets its click through', () => {
  beforeEach(() => {
    classes.clear();
    vi.stubGlobal('window', makeWindow());
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

  afterEach(() => {
    cancelPointerDrag();
    expect(isDragActive()).toBe(false);
  });

  /** Press, travel past the 4px threshold, release. */
  function dragAndDrop(onDrop: () => boolean | void): void {
    armPointerDrag(
      { clientX: 100, clientY: 100, button: 0, ctrlKey: false },
      {
        onMove: vi.fn(),
        onDrop,
        onEnd: vi.fn()
      }
    );
    win().emit('pointermove', { clientX: 108, clientY: 103 });
    win().emit('pointerup', { clientX: 108, clientY: 103 });
  }

  it('registers no click swallow when the drop answers false', () => {
    dragAndDrop(() => false);
    expect(win().count('click')).toBe(0);
  });

  it('still swallows the click when the drop changed something', () => {
    dragAndDrop(() => true);
    expect(win().count('click')).toBe(1);
  });

  it('still swallows when the drop answers nothing at all', () => {
    // Every other caller of the engine, the divider drag included, returns
    // undefined. Their behaviour must not have moved.
    dragAndDrop(() => undefined);
    expect(win().count('click')).toBe(1);
  });

  it('swallows on Esc, because a cancel decided nothing', () => {
    armPointerDrag(
      { clientX: 100, clientY: 100, button: 0, ctrlKey: false },
      { onMove: vi.fn(), onDrop: () => false, onEnd: vi.fn() }
    );
    win().emit('pointermove', { clientX: 140, clientY: 100 });
    cancelPointerDrag();
    expect(win().count('click')).toBe(1);
  });
});
