/**
 * Session focus, the flight (Phase 80.1).
 *
 * What these tests hold, and why each one is here rather than in a
 * screenshot:
 *
 *  - the destination measurement leaves the shell's classes exactly as it
 *    found them, in BOTH directions. If it did not, the shell would be left
 *    in a state React never rendered;
 *  - the two refusals are the two sentences the spec wrote, and neither
 *    changes any state;
 *  - reduced motion appends nothing and flips the store in the same task;
 *  - the First Last Invert Play transform is arithmetic, so it is compared
 *    against numbers rather than described;
 *  - the keyframes name only `transform`. This is the guard on the sentence
 *    that is the whole design. A keyframe naming a layout property would
 *    resize live tmux sessions sixty times inside one gesture, and no unit
 *    test downstream of it would notice;
 *  - a full enter and a full leave put the surface's `visibility` back and
 *    take the photograph out of the document again;
 *  - the leave's arrival class goes on at the swap and comes off again after
 *    the fade. Left behind, its finished animation would hold the chrome at
 *    opacity 1 and the next enter would not fade;
 *  - a split group whose leaves are ALL waiting to be restored is refused.
 *    The DOM gate cannot see that, because TerminalRegion writes
 *    `data-surface-leaves` for every group whatever its leaves are doing.
 *
 * The vitest environment is node and jsdom is not a dependency of this
 * repository, so the DOM is a hand built stub and the copy builder is mocked.
 * That is the right seam anyway. This module owns the SEQUENCE and
 * ./focus-copy.ts owns the pixels, and each is tested where it lives.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// The stubs
// ---------------------------------------------------------------------------

interface FakeSession {
  id: string;
  status: string;
}

const store = {
  sessionFocus: false,
  setSessionFocus: vi.fn((on: boolean) => {
    store.sessionFocus = on;
  }),
  toast: vi.fn(),
  active: null as FakeSession | null,
  /** Every session this window knows about, as the real slice holds them. */
  sessions: [] as FakeSession[],
  /** The leaves TerminalRegion says it drew, which is what the gate reads. */
  visibleSessionIds: [] as string[],
  activeSession(): FakeSession | null {
    return store.active;
  }
};

/** Put a set of leaves on screen, in one line, for the refusal tests. */
function leaves(...rows: [string, string][]): void {
  store.sessions = rows.map(([id, status]) => ({ id, status }));
  store.visibleSessionIds = rows.map(([id]) => id);
}

vi.mock('../../state/store', () => ({
  useApp: { getState: () => store },
  effectiveStatusOf: (s: FakeSession) => s.status
}));

/** What the mocked copy builder hands back on the next call. */
const copyPlan = {
  node: null as ReturnType<typeof makeCopyNode> | null,
  throws: false
};

const buildStillCopy = vi.fn(() => {
  if (copyPlan.throws) throw new Error('no 2d context');
  return Promise.resolve(
    copyPlan.node === null ? null : { node: copyPlan.node, leaves: [] }
  );
});

vi.mock('../focus-copy', () => ({ buildStillCopy }));

function makeCopyNode(): {
  animate: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
} {
  return {
    animate: vi.fn(() => ({ finished: Promise.resolve() })),
    remove: vi.fn()
  };
}

/** A `classList` that answers add, remove and contains, and nothing else. */
function classList(initial: string[] = []): {
  add(name: string): void;
  remove(name: string): void;
  contains(name: string): boolean;
  names(): string[];
} {
  const held = new Set(initial);
  return {
    add: (name) => {
      held.add(name);
    },
    remove: (name) => {
      held.delete(name);
    },
    contains: (name) => held.has(name),
    names: () => [...held]
  };
}

const FIRST = { left: 220, top: 74, width: 800, height: 600 };
const LAST = { left: 0, top: 38, width: 1440, height: 862 };

/** Install a document whose surface answers `first` before the class flips. */
function installDom(opts: {
  surface: boolean;
  shellClasses?: string[];
  reducedMotion?: boolean;
}): {
  shell: {
    classList: ReturnType<typeof classList>;
    attrs: Record<string, string>;
  };
  surface: { style: Record<string, string> };
  appended: unknown[];
} {
  // `attrs` is separate from `classList` on purpose, and the separation is
  // the point of the arrival marker. React owns the shell's class attribute
  // and rewrites the whole string at the swap, so a hand added class does not
  // survive the very moment the arrival needs it.
  const attrs: Record<string, string> = {};
  const shell = {
    classList: classList(opts.shellClasses ?? []),
    attrs,
    setAttribute: (name: string, value: string) => {
      attrs[name] = value;
    },
    removeAttribute: (name: string) => {
      delete attrs[name];
    }
  };
  // The surface is small while the chrome is drawn and fills the window once
  // either focus class is on the shell, which is what the real stylesheet
  // does and what makes the destination measurement meaningful here.
  const surface = {
    style: {} as Record<string, string>,
    getBoundingClientRect: (): typeof FIRST =>
      shell.classList.contains('gmux-focus-measure') ||
      shell.classList.contains('session-focus')
        ? LAST
        : FIRST
  };
  const appended: unknown[] = [];
  vi.stubGlobal('document', {
    documentElement: {},
    body: {
      appendChild: (node: unknown) => {
        appended.push(node);
      }
    },
    querySelector: (sel: string) => {
      if (sel === '.shell') return shell;
      if (sel === '[data-surface-leaves]') return opts.surface ? surface : null;
      return null;
    }
  });
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: opts.reducedMotion === true })
  });
  vi.stubGlobal('getComputedStyle', () => ({
    getPropertyValue: (name: string) =>
      name === '--dur-panel' ? '200ms' : 'cubic-bezier(0.2, 0, 0, 1)'
  }));
  vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
    setTimeout(() => {
      cb(0);
    }, 0);
    return 0;
  });
  return { shell, surface, appended };
}

const {
  everyLeafNeedsRestore,
  focusRefusal,
  invertTransform,
  measureFocusRect,
  toggleSessionFocus,
  ARRIVE_ATTR,
  NOTHING_TO_FOCUS,
  RESTORE_FIRST
} = await import('../focus-flight');

beforeEach(() => {
  store.sessionFocus = false;
  store.active = null;
  store.sessions = [];
  store.visibleSessionIds = [];
  store.setSessionFocus.mockClear();
  store.toast.mockClear();
  buildStillCopy.mockClear();
  copyPlan.node = null;
  copyPlan.throws = false;
});

// ---------------------------------------------------------------------------

describe('measureFocusRect', () => {
  it('borrows the measure class and gives it back', () => {
    const { shell, surface } = installDom({ surface: true });
    const rect = measureFocusRect(
      shell as unknown as HTMLElement,
      surface as unknown as Element,
      'focused'
    );
    expect(rect).toEqual(LAST);
    expect(shell.classList.contains('gmux-focus-measure')).toBe(false);
    expect(shell.classList.names()).toEqual([]);
  });

  it('drops the focus class and puts it back on the way out', () => {
    const { shell, surface } = installDom({
      surface: true,
      shellClasses: ['session-focus']
    });
    const rect = measureFocusRect(
      shell as unknown as HTMLElement,
      surface as unknown as Element,
      'ordinary'
    );
    // Chrome back means the surface is small again, which is the destination.
    expect(rect).toEqual(FIRST);
    expect(shell.classList.contains('session-focus')).toBe(true);
    expect(shell.classList.contains('gmux-focus-measure')).toBe(false);
  });

  it('does not invent a focus class the shell never had', () => {
    const { shell, surface } = installDom({ surface: true });
    measureFocusRect(
      shell as unknown as HTMLElement,
      surface as unknown as Element,
      'ordinary'
    );
    expect(shell.classList.names()).toEqual([]);
  });
});

describe('refusing', () => {
  it('says there is no session when no surface is on screen', async () => {
    installDom({ surface: false });
    expect(focusRefusal()).toBe(NOTHING_TO_FOCUS);
    await toggleSessionFocus();
    expect(store.setSessionFocus).not.toHaveBeenCalled();
    expect(store.toast.mock.calls).toEqual([['info', NOTHING_TO_FOCUS]]);
  });

  it('names the restore when the selected session is restorable', async () => {
    installDom({ surface: false });
    store.active = { id: 's1', status: 'restorable' };
    expect(focusRefusal()).toBe(RESTORE_FIRST);
    await toggleSessionFocus();
    expect(store.setSessionFocus).not.toHaveBeenCalled();
    expect(store.toast.mock.calls).toEqual([['info', RESTORE_FIRST]]);
  });

  it('names the restore for an ended session too', () => {
    installDom({ surface: false });
    store.active = { id: 's1', status: 'exited' };
    expect(focusRefusal()).toBe(RESTORE_FIRST);
  });

  it('refuses nothing while a surface with a live leaf is drawn', () => {
    installDom({ surface: true });
    store.active = { id: 's1', status: 'restorable' };
    leaves(['s1', 'idle']);
    expect(focusRefusal()).toBeNull();
  });

  // The split-group hole. `[data-surface-leaves]` is written by TerminalRegion
  // for every group whatever its leaves are doing, so the DOM gate alone let
  // four restorable sessions fill the window with four Restore cards under an
  // empty title band. Measured live on 2026-08-18.
  it('refuses a split group whose every leaf is waiting to be restored', async () => {
    installDom({ surface: true });
    store.active = { id: 'a', status: 'restorable' };
    leaves(
      ['a', 'restorable'],
      ['b', 'restorable'],
      ['c', 'exited'],
      ['d', 'restorable']
    );
    expect(focusRefusal()).toBe(RESTORE_FIRST);
    await toggleSessionFocus();
    expect(store.setSessionFocus).not.toHaveBeenCalled();
    expect(store.toast.mock.calls).toEqual([['info', RESTORE_FIRST]]);
  });

  it('allows a split group with one live leaf among five dead ones', () => {
    installDom({ surface: true });
    leaves(
      ['a', 'restorable'],
      ['b', 'exited'],
      ['c', 'restorable'],
      ['d', 'exited'],
      ['e', 'restorable'],
      ['f', 'running']
    );
    expect(everyLeafNeedsRestore(['restorable', 'running'])).toBe(false);
    expect(focusRefusal()).toBeNull();
  });

  it('treats an unreadable leaf list as no answer rather than as a refusal', () => {
    installDom({ surface: true });
    // The attribute is on screen and the store has not caught up. Refusing
    // here would mean the mode says "restore this first" about a session it
    // cannot see, which is worse than opening.
    expect(everyLeafNeedsRestore([])).toBe(false);
    expect(focusRefusal()).toBeNull();
  });
});

describe('reduced motion', () => {
  it('flips the store in the same task and photographs nothing', () => {
    const { appended } = installDom({ surface: true, reducedMotion: true });
    void toggleSessionFocus();
    // No await between the call and this line, so the flip was synchronous.
    expect(store.setSessionFocus.mock.calls).toEqual([[true]]);
    expect(appended).toEqual([]);
    expect(buildStillCopy).not.toHaveBeenCalled();
  });
});

describe('invertTransform', () => {
  it('is the ordinary First Last Invert Play arithmetic', () => {
    expect(invertTransform(FIRST, LAST)).toBe(
      'translate(220px, 36px) scale(0.5556, 0.6961)'
    );
  });

  it('answers with an identity scale for a destination with no size', () => {
    expect(
      invertTransform(FIRST, { left: 0, top: 0, width: 0, height: 0 })
    ).toBe('translate(220px, 74px) scale(1, 1)');
  });
});

describe('the arrival marker', () => {
  it('is an attribute, because React would erase a class', () => {
    // App.tsx renders `className={`shell${sessionFocus ? ' session-focus' :
    // ''}`}`, so the swap changes that string and React writes the whole
    // class attribute. Measured on 2026-08-18 with a class: over a leave the
    // sidebar read `shell session-focus gmux-focusing` at opacity 0 and then
    // `shell` at opacity 1 in the next frame, class gone, no fade at all.
    expect(ARRIVE_ATTR.startsWith('data-')).toBe(true);
    const source = readFileSync(
      join(__dirname, '..', 'focus-flight.ts'),
      'utf8'
    );
    expect(source).toContain('setAttribute(ARRIVE_ATTR');
    expect(source).not.toContain('classList.add(ARRIVE_ATTR');
  });
});

describe('the keyframes', () => {
  /** The text of every `animate(` call in the module, parentheses balanced. */
  function animateCalls(source: string): string[] {
    const out: string[] = [];
    let at = source.indexOf('.animate(');
    while (at !== -1) {
      let depth = 0;
      let i = source.indexOf('(', at);
      const start = i;
      for (; i < source.length; i++) {
        const ch = source[i];
        if (ch === '(') depth += 1;
        else if (ch === ')') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      out.push(source.slice(start, i + 1));
      at = source.indexOf('.animate(', i);
    }
    return out;
  }

  it('names no layout property anywhere inside an animate call', () => {
    const source = readFileSync(
      join(__dirname, '..', 'focus-flight.ts'),
      'utf8'
    );
    const calls = animateCalls(source);
    expect(calls).toHaveLength(1);
    for (const call of calls) {
      for (const banned of [
        'width',
        'height',
        'left',
        'top',
        'right',
        'bottom',
        'flex',
        'inset',
        'margin',
        'padding'
      ]) {
        expect(call, `animate() must not name ${banned}`).not.toContain(banned);
      }
      expect(call).toContain('transform');
    }
  });
});

describe('a whole gesture', () => {
  it('appends the photograph, hides the surface, then puts both back', async () => {
    const { shell, surface, appended } = installDom({ surface: true });
    const node = makeCopyNode();
    copyPlan.node = node;

    await toggleSessionFocus();

    expect(appended).toEqual([node]);
    expect(node.animate).toHaveBeenCalledTimes(1);
    expect(store.setSessionFocus.mock.calls).toEqual([[true]]);
    // The chrome is fading OUT under the photograph on the way in, so the
    // arrival class must not be on the root. If it were, its `both` fill
    // would pin every region at opacity 1 and nothing would fade at all.
    expect(shell.attrs[ARRIVE_ATTR]).toBeUndefined();
    // Two frames pass between the swap and the tidy up, so the assertions
    // below wait for them the same way the module does.
    await new Promise((r) => setTimeout(r, 20));
    expect(surface.style['visibility']).toBe('');
    expect(node.remove).toHaveBeenCalledTimes(1);
  });

  it('flies back out and leaves nothing behind', async () => {
    const { shell, surface, appended } = installDom({
      surface: true,
      shellClasses: ['session-focus']
    });
    store.sessionFocus = true;
    const node = makeCopyNode();
    copyPlan.node = node;

    await toggleSessionFocus();
    await new Promise((r) => setTimeout(r, 20));

    expect(appended).toEqual([node]);
    expect(store.setSessionFocus.mock.calls).toEqual([[false]]);
    expect(surface.style['visibility']).toBe('');
    expect(node.remove).toHaveBeenCalledTimes(1);
    expect(shell.classList.contains('gmux-focusing')).toBe(false);
    // The leave's fade in. The chrome is only DRAWN at the swap, so this is
    // the first moment it can be animated, and the class carries the
    // animation that does it.
    expect(shell.attrs[ARRIVE_ATTR]).toBe('');
  });

  it('takes the arrival class off again once the fade has run', async () => {
    const { shell } = installDom({
      surface: true,
      shellClasses: ['session-focus']
    });
    store.sessionFocus = true;
    copyPlan.node = makeCopyNode();

    await toggleSessionFocus();
    await new Promise((r) => setTimeout(r, 400));

    // A class left behind would survive into the NEXT enter, where its
    // finished `both` fill would hold the chrome at opacity 1 and stop it
    // fading out.
    expect(shell.attrs[ARRIVE_ATTR]).toBeUndefined();
  });

  it('goes straight to the swap when the photograph cannot be taken', async () => {
    const { appended } = installDom({ surface: true });
    copyPlan.throws = true;
    await toggleSessionFocus();
    expect(appended).toEqual([]);
    expect(store.setSessionFocus.mock.calls).toEqual([[true]]);
  });
});
