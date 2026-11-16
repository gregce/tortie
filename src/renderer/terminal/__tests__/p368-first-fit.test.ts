/**
 * Phase 368 (build/p368/SPEC.md D1, D2, D4, D6): the size a pane attaches at,
 * and the size a new or restored session is made at, decided in the renderer.
 *
 * WHAT WAS WRONG (research 145 section 3.2). The pane attached and only then
 * pushed the size it had fitted, so a push a few milliseconds late told the
 * session's program 80 by 24 first; and the store's create and restore sent no
 * size, so every session was made at 80 by 24 and its first attach was a size
 * change for its program.
 *
 * Three halves, each driven or read on its own:
 *
 *  1. `./tab-size.ts`, driven with vitest's clock: a pane with a size attaches
 *     at once with it; a pane with none waits for its first fit, at most
 *     FIRST_FIT_WAIT_MS, then takes the window's last fitted size, then none;
 *     and (the fix round) its terminal is put at that size before the attach,
 *     which names the terminal's own size, so a client is never spawned at a
 *     size its terminal is not at.
 *  2. The store's two funnels, driven through the real store over a recording
 *     bridge: the create and the restore send the one visible pane's size, the
 *     window's last fit, or nothing.
 *  3. `TerminalPane.tsx`'s wiring, read as text with comments blanked, because
 *     the pane needs a browser and an xterm to mount: the attach carries the
 *     size, the explicit push waits for a size of the pane's own, every size the
 *     pane pushes is noted, and a bundled face is loaded before the terminal
 *     opens. The other builders' four seams are read here too.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Terminal } from '@xterm/xterm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Every create request and every restore option the bridge was handed. */
const bridge = vi.hoisted(() => ({
  created: [] as Record<string, unknown>[],
  restored: [] as unknown[]
}));

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {
    sessions: {
      create: (input: Record<string, unknown>) => {
        bridge.created.push(input);
        return Promise.resolve({
          id: `made-${String(bridge.created.length)}`,
          name: String(input['name']),
          projectPath: String(input['projectPath']),
          cwd: String(input['projectPath']),
          agent: 'shell',
          status: 'running',
          createdAt: 0
        });
      },
      restore: (_id: string, options?: unknown) => {
        bridge.restored.push(options);
        return Promise.resolve({ ...RESTORABLE, status: 'running' });
      },
      list: () => Promise.resolve([]),
      onChanged() {},
      onStatusChanged() {}
    },
    machines: { rows: () => Promise.resolve({ rows: [] }) },
    projects: { list: () => Promise.resolve([]) },
    notice: { pending: () => Promise.resolve([]) },
    setSessionsPosition: () => Promise.resolve(),
    setProjectsPosition: () => Promise.resolve()
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

const RESTORABLE = {
  id: 'r1',
  name: 'back',
  tmuxName: 'back',
  projectPath: '/here/work',
  cwd: '/here/work',
  agent: 'shell',
  status: 'restorable',
  createdAt: 0
};

const {
  FIRST_FIT_WAIT_MS,
  boxHasSize,
  firstFitLatch,
  lastWindowFit,
  noteFit,
  resetWindowFitForTests,
  settleForAttach,
  sizeForAttach,
  tabSizeForCreate,
  withinFirstFitBound
} = await import('../tab-size');
const { registerTerminal } = await import('../drop/registry');
const { useApp } = await import('../../state/store');

/** A mounted terminal, as the registry holds it, with a laid out container or none. */
function mounted(cols: number, rows: number, box: { w: number; h: number } | null): Terminal {
  return {
    cols,
    rows,
    element:
      box === null
        ? undefined
        : { parentElement: { clientWidth: box.w, clientHeight: box.h } }
  } as unknown as Terminal;
}

const unregister: (() => void)[] = [];

beforeEach(() => {
  resetWindowFitForTests();
  bridge.created.length = 0;
  bridge.restored.length = 0;
});

afterEach(() => {
  for (const off of unregister.splice(0)) off();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// 1. The size a pane attaches at (D1, D4)
// ---------------------------------------------------------------------------

describe('the size a pane attaches at', () => {
  it('a pane with a size attaches at once with it, and waits for nothing', async () => {
    vi.useFakeTimers();
    const latch = firstFitLatch();
    const wait = vi.spyOn(latch, 'wait');
    const size = await sizeForAttach({ fitNow: () => ({ cols: 124, rows: 39 }), latch });
    expect(size).toEqual({ cols: 124, rows: 39 });
    expect(wait).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a pane with no size waits for its first fit, and attaches at that fit', async () => {
    vi.useFakeTimers();
    const latch = firstFitLatch();
    let fitted: { cols: number; rows: number } | null = null;
    noteFit(97, 30);
    let answer: unknown = 'pending';
    void sizeForAttach({ fitNow: () => fitted, latch }).then((size) => {
      answer = size;
    });
    await vi.advanceTimersByTimeAsync(200);
    expect(answer).toBe('pending');
    fitted = { cols: 124, rows: 39 };
    latch.fitted();
    await vi.advanceTimersByTimeAsync(0);
    // Its own fit, not the window's: the window's is only the fallback.
    expect(answer).toEqual({ cols: 124, rows: 39 });
  });

  it(`a pane still with no size after ${String(FIRST_FIT_WAIT_MS)} ms takes the window's last fitted size, and not a moment before`, async () => {
    vi.useFakeTimers();
    noteFit(162, 39);
    const latch = firstFitLatch();
    let answer: unknown = 'pending';
    void sizeForAttach({ fitNow: () => null, latch }).then((size) => {
      answer = size;
    });
    await vi.advanceTimersByTimeAsync(FIRST_FIT_WAIT_MS - 1);
    expect(answer).toBe('pending');
    await vi.advanceTimersByTimeAsync(1);
    expect(answer).toEqual({ cols: 162, rows: 39 });
  });

  it('with no size and no window fit either, it knows none, and the settle answers the terminal’s own', async () => {
    vi.useFakeTimers();
    const latch = firstFitLatch();
    let answer: unknown = 'pending';
    void sizeForAttach({ fitNow: () => null, latch }).then((size) => {
      answer = size;
    });
    await vi.advanceTimersByTimeAsync(FIRST_FIT_WAIT_MS);
    expect(answer).toBeNull();
    // The fix round: the attach then names the size xterm really is at, its
    // own unfitted 80 by 24, and never main's last size, which this terminal
    // was never put at.
    const term = sized(80, 24);
    expect(settleForAttach(term, null)).toEqual({ cols: 80, rows: 24 });
    expect(term.resizes).toEqual([]);
  });

  it('a pane that goes while it waits stops waiting at once', async () => {
    vi.useFakeTimers();
    const latch = firstFitLatch();
    let answer: unknown = 'pending';
    void sizeForAttach({ fitNow: () => null, latch }).then((size) => {
      answer = size;
    });
    latch.close();
    await vi.advanceTimersByTimeAsync(0);
    expect(answer).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('the bound is 500 ms', () => {
    expect(FIRST_FIT_WAIT_MS).toBe(500);
  });
});

/** A terminal that records every resize it is asked for, as xterm's own would apply it. */
function sized(cols: number, rows: number): {
  cols: number;
  rows: number;
  resizes: string[];
  resize(c: number, r: number): void;
} {
  const t = {
    cols,
    rows,
    resizes: [] as string[],
    resize(c: number, r: number): void {
      t.resizes.push(`${String(c)}x${String(r)}`);
      t.cols = c;
      t.rows = r;
    }
  };
  return t;
}

describe('the client is spawned at the size the terminal is at (the fix round)', () => {
  it('a pane hidden at its mount is put at the window’s size before it attaches', async () => {
    // Catch Me Up open, or the editor filling the row: the container has no
    // size, xterm sits at its unfitted 80 by 24, and the window's last fit is
    // 124 by 39. The attack lens measured 34 of 39 rows garbled when the
    // client was spawned at 124 by 39 beside a terminal still at 80 by 24.
    vi.useFakeTimers();
    noteFit(124, 39);
    const latch = firstFitLatch();
    const term = sized(80, 24);
    let attached: unknown = 'pending';
    void sizeForAttach({ fitNow: () => null, latch }).then((wanted) => {
      attached = settleForAttach(term, wanted);
    });
    await vi.advanceTimersByTimeAsync(FIRST_FIT_WAIT_MS);
    expect(term.resizes).toEqual(['124x39']);
    expect(attached).toEqual({ cols: 124, rows: 39 });
    expect({ cols: term.cols, rows: term.rows }).toEqual(attached);
  });

  it('a pane that fitted already is not moved, and attaches at its own size', () => {
    const term = sized(97, 30);
    expect(settleForAttach(term, { cols: 97, rows: 30 })).toEqual({ cols: 97, rows: 30 });
    expect(term.resizes).toEqual([]);
  });

  it('the size answered is always the terminal’s own, read after the move', () => {
    // A terminal that clamps what it is handed answers what it holds, so the
    // client can never be spawned at a size the terminal refused.
    const clamping = {
      cols: 80,
      rows: 24,
      resize(c: number, r: number): void {
        clamping.cols = Math.min(c, 120);
        clamping.rows = r;
      }
    };
    expect(settleForAttach(clamping, { cols: 162, rows: 39 })).toEqual({ cols: 120, rows: 39 });
  });
});

describe('the first fit latch', () => {
  it('a fit before the wait answers at once, true', async () => {
    const latch = firstFitLatch();
    latch.fitted();
    expect(await latch.wait()).toBe(true);
  });

  it('settles once: a close after a fit, and a fit after a close, change nothing', async () => {
    const fittedFirst = firstFitLatch();
    fittedFirst.fitted();
    fittedFirst.close();
    expect(await fittedFirst.wait()).toBe(true);
    const closedFirst = firstFitLatch();
    closedFirst.close();
    closedFirst.fitted();
    expect(await closedFirst.wait()).toBe(false);
  });
});

describe("the window's last fitted size", () => {
  it('keeps the last size a pane noted, and refuses one that is not a size', () => {
    expect(lastWindowFit()).toBeNull();
    noteFit(124, 39);
    noteFit(0, 39);
    noteFit(124.5, 39);
    noteFit(1001, 39);
    expect(lastWindowFit()).toEqual({ cols: 124, rows: 39 });
    noteFit(97, 39);
    expect(lastWindowFit()).toEqual({ cols: 97, rows: 39 });
  });

  it('a box has a size only when it is wider and taller than nothing', () => {
    expect(boxHasSize(null)).toBe(false);
    expect(boxHasSize(undefined)).toBe(false);
    expect(boxHasSize({ clientWidth: 0, clientHeight: 600 })).toBe(false);
    expect(boxHasSize({ clientWidth: 900, clientHeight: 0 })).toBe(false);
    expect(boxHasSize({ clientWidth: 900, clientHeight: 600 })).toBe(true);
  });
});

describe('the bound on a bundled face (D6)', () => {
  it('resolves when the face loads, when it fails, and at the bound when it never answers', async () => {
    vi.useFakeTimers();
    let done = 0;
    void withinFirstFitBound(Promise.resolve()).then(() => (done += 1));
    void withinFirstFitBound(Promise.reject(new Error('no face'))).then(() => (done += 1));
    await vi.advanceTimersByTimeAsync(0);
    expect(done).toBe(2);
    let hung = false;
    void withinFirstFitBound(new Promise(() => undefined)).then(() => {
      hung = true;
    });
    await vi.advanceTimersByTimeAsync(FIRST_FIT_WAIT_MS - 1);
    expect(hung).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(hung).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. The size a new or restored session is made at (D2)
// ---------------------------------------------------------------------------

describe('the size a new session is made at', () => {
  it('the one visible pane of the active project: its own size', () => {
    unregister.push(registerTerminal('s1', mounted(124, 39, { w: 900, h: 600 })));
    noteFit(97, 30);
    expect(tabSizeForCreate(['s1'], ['s1', 's2'])).toEqual({ cols: 124, rows: 39 });
  });

  it('two panes on screen, a split: the window’s last fitted size', () => {
    unregister.push(registerTerminal('s1', mounted(62, 39, { w: 450, h: 600 })));
    unregister.push(registerTerminal('s2', mounted(61, 39, { w: 450, h: 600 })));
    noteFit(124, 39);
    expect(tabSizeForCreate(['s1', 's2'], ['s1', 's2'])).toEqual({ cols: 124, rows: 39 });
  });

  it('a pane whose container has no size, one not opened, or one not in the project: the window’s last fitted size', () => {
    unregister.push(registerTerminal('hidden', mounted(80, 24, { w: 0, h: 0 })));
    unregister.push(registerTerminal('unopened', mounted(80, 24, null)));
    unregister.push(registerTerminal('elsewhere', mounted(50, 20, { w: 400, h: 300 })));
    noteFit(124, 39);
    expect(tabSizeForCreate(['hidden'], ['hidden'])).toEqual({ cols: 124, rows: 39 });
    expect(tabSizeForCreate(['unopened'], ['unopened'])).toEqual({ cols: 124, rows: 39 });
    expect(tabSizeForCreate(['elsewhere'], ['s1'])).toEqual({ cols: 124, rows: 39 });
  });

  it('nothing on screen and nothing ever fitted: none', () => {
    expect(tabSizeForCreate([], [])).toBeNull();
  });
});

describe("the store's two funnels send it", () => {
  function seed(visible: string[]): void {
    useApp.setState({
      projects: [{ id: 'p1', path: '/here/work', name: 'work' }],
      activeProjectId: 'p1',
      sessions: [
        {
          id: 's1',
          name: 'one',
          tmuxName: 'one',
          projectPath: '/here/work',
          cwd: '/here/work',
          agent: 'shell',
          status: 'running',
          createdAt: 0
        },
        { ...RESTORABLE }
      ],
      visibleSessionIds: visible,
      toasts: [],
      confirm: null,
      restoringIds: {}
    } as never);
  }

  it('a create sends the visible pane’s size', async () => {
    seed(['s1']);
    unregister.push(registerTerminal('s1', mounted(124, 39, { w: 900, h: 600 })));
    await useApp.getState().createSession({ name: 'two', agent: 'shell' });
    expect(bridge.created[0]?.['size']).toEqual({ cols: 124, rows: 39 });
  });

  it('a create with nothing on screen sends the window’s last fit, and with none, no size at all', async () => {
    seed([]);
    noteFit(162, 39);
    await useApp.getState().createSession({ name: 'two', agent: 'shell' });
    resetWindowFitForTests();
    await useApp.getState().createSession({ name: 'three', agent: 'shell' });
    expect(bridge.created[0]?.['size']).toEqual({ cols: 162, rows: 39 });
    expect(Object.keys(bridge.created[1] ?? {})).not.toContain('size');
  });

  it('a restore sends the visible pane’s size, and with none sends the options it sent before', async () => {
    seed(['s1']);
    const off = registerTerminal('s1', mounted(124, 39, { w: 900, h: 600 }));
    await useApp.getState().restoreSession('r1');
    off();
    seed([]);
    await useApp.getState().restoreSession('r1');
    expect(bridge.restored).toEqual([{ size: { cols: 124, rows: 39 } }, undefined]);
  });
});

// ---------------------------------------------------------------------------
// 3. TerminalPane's wiring, read as text (D1, D4, D6, §9.2)
// ---------------------------------------------------------------------------

describe("TerminalPane's wiring", () => {
  const pane = readFileSync(join(import.meta.dirname, '..', 'TerminalPane.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');

  /** The body of the first `{ … }` block after `needle`, by matching braces. */
  function blockAfter(needle: string): string {
    const at = pane.indexOf(needle);
    expect(at, needle).toBeGreaterThan(-1);
    // From the needle's END: a needle may hold a brace of its own.
    const open = pane.indexOf('{', at + needle.length - (needle.endsWith('{') ? 1 : 0));
    let depth = 0;
    for (let i = open; i < pane.length; i += 1) {
      if (pane[i] === '{') depth += 1;
      else if (pane[i] === '}') {
        depth -= 1;
        if (depth === 0) return pane.slice(open + 1, i);
      }
    }
    throw new Error(`no closing brace after ${needle}`);
  }

  it('the attach carries the size, decided first by sizeForAttach', () => {
    const decide = pane.indexOf('await sizeForAttach(');
    const attach = pane.indexOf('gmux.sessions.attach(sessionId, size ?? undefined)');
    expect(decide).toBeGreaterThan(-1);
    expect(attach).toBeGreaterThan(decide);
    expect(pane.split('sessions.attach(').length - 1).toBe(1);
  });

  it('the size it carries is the terminal’s own, settled between the decision and the attach (the fix round)', () => {
    const decide = pane.indexOf('const wanted = await sizeForAttach(');
    const settle = pane.indexOf('const size = settleForAttach(term, wanted);');
    const attach = pane.indexOf('await gmux.sessions.attach(sessionId, size ?? undefined)');
    expect(decide).toBeGreaterThan(-1);
    expect(settle).toBeGreaterThan(decide);
    expect(attach).toBeGreaterThan(settle);
    // Nothing between the settle and the attach awaits, so no fit can move the
    // terminal off the size the client is spawned at before it is asked for.
    expect(pane.slice(settle, attach)).not.toContain('await');
  });

  it('the explicit push after the attach waits for a size of the pane’s own', () => {
    const after = pane.slice(pane.indexOf('gmux.sessions.attach(sessionId, size ?? undefined)'));
    const guarded = blockAfter('if (boxHasSize(container)) {');
    expect(after.indexOf('if (boxHasSize(container)) {')).toBeGreaterThan(-1);
    expect(guarded).toContain('gmux.sessions');
    expect(guarded).toContain('.resize({ sessionId, cols: term.cols, rows: term.rows })');
    expect(guarded).toContain('noteFit(term.cols, term.rows)');
  });

  it('every size the pane pushes is noted, and the resize handler still sends it', () => {
    const handler = blockAfter('term.onResize(({ cols, rows }) =>');
    expect(handler).toContain('if (boxHasSize(container)) noteFit(cols, rows);');
    expect(handler).toContain('gmux.sessions.resize(');
  });

  it('a fit with a size settles the first fit latch, and the teardown closes it', () => {
    expect(blockAfter('const doFit = (): void =>')).toContain(
      'if (boxHasSize(container)) firstFit.fitted();'
    );
    expect(blockAfter('return () =>')).toContain('firstFit.close();');
  });

  it('a face is loaded, within the bound, before the terminal opens (D6)', () => {
    const load = pane.indexOf('await withinFirstFitBound(');
    const open = pane.indexOf('term.open(container)');
    expect(load).toBeGreaterThan(-1);
    expect(open).toBeGreaterThan(load);
    expect(pane.slice(load, open)).toContain('loadWorkAreaFace(preset,');
    expect(pane.slice(load, open)).toContain('appliedFontRef.current = `${preset} ${customFontFamily}`;');
  });

  it("the other builders' seams are wired where §9.2 says", () => {
    const options = blockAfter('new Terminal(');
    expect(options).toContain('allowProposedApi: true');
    expect(options).toContain('linkHandler: links.handler');
    expect(pane.indexOf('const links = paneLinks();')).toBeLessThan(pane.indexOf('new Terminal('));
    const made = pane.indexOf('termRef.current = term;');
    const widths = pane.indexOf('registerTmuxWidths(term, sessionRow()?.cellWidths ?? null);');
    const bound = pane.indexOf('links.bind(term);');
    expect(widths).toBeGreaterThan(made);
    expect(bound).toBeGreaterThan(made);
    // Both before anything is written: the open comes later still.
    expect(pane.indexOf('term.open(container)')).toBeGreaterThan(Math.max(widths, bound));
    expect(pane).toContain('const unroute = routePaneCopy(container, sessionId, term);');
    expect(blockAfter('return () =>')).toContain('unroute();');
  });
});
