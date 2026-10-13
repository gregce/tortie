/**
 * Phase 347 (issue 33): the open file watch, every seam faked and the clock
 * driven. O1 to O14 of build/p347/SPEC.md §5.3.
 *
 * Check type: pure state test. No file is opened, no watcher armed, no timer
 * real: `armFile`, `canonical`, `identity` and `afterKernelSees` are fakes over
 * an in-memory world, and the window runs on vitest's fake clock. What a real
 * descriptor, a real kqueue watch and real FSEvents do is the native lane,
 * p347-open-files.native.test.ts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gmuxErrorPayloadOf } from '../../errors';
import { DEFAULT_DEBOUNCE_MS } from '../repo-watcher';
import {
  ARM_RECHECKS,
  OPEN_FILE_DECLARE_MAX,
  OPEN_FILE_WATCH_CAP,
  OPEN_FILE_WATCH_OFF_ENV,
  createOpenFileWatches,
  type ArmedFile,
  type OpenFileEventKind,
  type OpenFilePlan,
  type OpenFileWatchDeps,
  type OpenFileWatches
} from '../open-files';

interface FakeHandle extends ArmedFile {
  readonly path: string;
  closed: boolean;
  fire(kind: OpenFileEventKind): void;
  /** A callback the watcher delivers after its close. */
  late(kind: OpenFileEventKind): void;
}

/** The names the gate's order is read in. */
const GATE = ['canonical', 'excludes', 'armFile', 'canonical', 'excludes', 'identity'];

function makeWorld() {
  const calls: string[] = [];
  const world = {
    calls,
    /** Paths that name nothing: canonical null, identity null, armFile null. */
    gone: new Set<string>(),
    /** Paths whose descriptor open is refused (a FIFO, a link at the leaf). */
    refuseArm: new Set<string>(),
    /** One-shot answers for `canonical`, consumed in order, before the default. */
    canonicalSeq: new Map<string, Array<string | null>>(),
    /** Prefixes the plan excludes. */
    excluded: ['/r/notes', '/r/.git', '/q/notes'],
    plans: new Map<string, OpenFilePlan | null>(),
    ino: new Map<string, bigint>(),
    nextIno: 1000n,
    /** Runs after armFile made a handle, inside the gate (a replace during the open). */
    afterArm: null as ((path: string) => void) | null,
    handles: [] as FakeHandle[],
    checks: [] as Array<() => void>,
    sent: [] as Array<{ id: number; repo: string; at: number }>,
    env: {} as NodeJS.ProcessEnv,
    logs: [] as string[],
    planCalls: [] as string[]
  };
  const inoOf = (c: string): bigint => {
    let v = world.ino.get(c);
    if (v === undefined) {
      v = world.nextIno;
      world.nextIno += 1n;
      world.ino.set(c, v);
    }
    return v;
  };
  const replace = (c: string): void => {
    world.ino.set(c, world.nextIno);
    world.nextIno += 1n;
  };
  const plan: OpenFilePlan = {
    excludes: (c) => {
      calls.push('excludes');
      return world.excluded.some((p) => c === p || c.startsWith(`${p}/`));
    }
  };
  const deps: OpenFileWatchDeps = {
    planFor: (repo) => {
      world.planCalls.push(repo);
      return Promise.resolve(world.plans.has(repo) ? (world.plans.get(repo) ?? null) : plan);
    },
    canonical: (p) => {
      calls.push('canonical');
      const seq = world.canonicalSeq.get(p);
      if (seq !== undefined && seq.length > 0) return seq.shift() ?? null;
      return world.gone.has(p) ? null : p;
    },
    armFile: (c, onEvent) => {
      calls.push('armFile');
      if (world.gone.has(c) || world.refuseArm.has(c)) return null;
      const h: FakeHandle = {
        path: c,
        dev: 1n,
        ino: inoOf(c),
        closed: false,
        close() {
          h.closed = true;
        },
        fire(kind) {
          if (!h.closed) onEvent(kind);
        },
        late(kind) {
          onEvent(kind);
        }
      };
      world.handles.push(h);
      world.afterArm?.(c);
      return h;
    },
    identity: (c) => {
      calls.push('identity');
      return world.gone.has(c) ? null : { dev: 1n, ino: inoOf(c) };
    },
    afterKernelSees: (fn) => {
      calls.push('afterKernelSees');
      world.checks.push(fn);
    },
    setTimeout: (fn, ms) => {
      calls.push('window');
      const t = setTimeout(fn, ms);
      return { clear: () => clearTimeout(t) };
    },
    send: (id, repo) => world.sent.push({ id, repo, at: Date.now() }),
    env: () => world.env,
    log: (_level, message) => world.logs.push(message)
  };
  const open = (): FakeHandle[] => world.handles.filter((h) => !h.closed);
  const last = (path: string): FakeHandle | undefined =>
    [...world.handles].reverse().find((h) => h.path === path);
  const runChecks = (): void => {
    const pending = world.checks.splice(0);
    for (const fn of pending) fn();
  };
  return { world, deps, inoOf, replace, open, last, runChecks };
}

const entry = (path: string, repoPath = '/r') => ({ repoPath, path });
const notes = (i: number): string => `/r/notes/f${String(i)}.md`;

let watches: OpenFileWatches | null = null;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  watches?.dispose();
  watches = null;
  vi.useRealTimers();
});

function start(deps: OpenFileWatchDeps): OpenFileWatches {
  watches = createOpenFileWatches(deps);
  return watches;
}

/** Every `armFile` in the log came straight after the gate's G1 and G2. */
function armOnlyThroughGate(calls: string[]): boolean {
  return calls.every(
    (c, i) => c !== 'armFile' || (calls[i - 2] === 'canonical' && calls[i - 1] === 'excludes')
  );
}

describe('Phase 347 open file watches over fakes', () => {
  it('O1, O2: only what the plan excludes is armed; a refused arm holds nothing', async () => {
    const t = makeWorld();
    t.world.refuseArm.add('/r/notes/fifo');
    const w = start(t.deps);
    const res = await w.declare(1, [
      entry('/r/notes/a.md'),
      entry('/r/src/x.md'),
      entry('/r/debug.log'),
      entry('/r/notes/fifo')
    ]);
    expect(res).toEqual({ watched: 1 });
    expect(t.open().map((h) => h.path)).toEqual(['/r/notes/a.md']);
    expect(w.counts()).toEqual({ armed: 1, dormant: 3, capped: 0 });
    expect(t.world.handles.filter((h) => h.path === '/r/notes/fifo')).toHaveLength(0);
  });

  it('O3: change events make one notice per window that does not reset, and one after the last event', async () => {
    const t = makeWorld();
    const w = start(t.deps);
    await w.declare(1, [entry('/r/notes/a.md')]);
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    expect(t.world.sent).toHaveLength(1); // the arm's own window
    const h = t.last('/r/notes/a.md')!;
    const before = t.world.sent.length;
    let lastEventAt = 0;
    for (let i = 0; i < 200; i++) {
      h.fire('change');
      lastEventAt = Date.now();
      vi.advanceTimersByTime(6);
    }
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    const notices = t.world.sent.slice(before);
    expect(notices.length).toBeGreaterThanOrEqual(4);
    expect(notices.length).toBeLessThanOrEqual(5);
    expect(notices.at(-1)!.at).toBeGreaterThanOrEqual(lastEventAt);
    expect(notices.every((n) => n.repo === '/r' && n.id === 1)).toBe(true);
  });

  it('O4: rename with the file back re-arms through the gate; gone goes dormant; the next flush re-arms it', async () => {
    const t = makeWorld();
    const w = start(t.deps);
    await w.declare(1, [entry('/r/notes/a.md')]);
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    const h1 = t.last('/r/notes/a.md')!;
    t.replace('/r/notes/a.md');
    h1.fire('rename');
    const h2 = t.last('/r/notes/a.md')!;
    expect(h1.closed).toBe(true);
    expect(h2).not.toBe(h1);
    expect(h2.closed).toBe(false);
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    expect(t.world.sent).toHaveLength(2);

    // Gone: dormant, still a notice for the event.
    t.world.gone.add('/r/notes/a.md');
    h2.fire('rename');
    expect(h2.closed).toBe(true);
    expect(w.counts()).toEqual({ armed: 0, dormant: 1, capped: 0 });
    // Back before the window ends: its flush re-arms it.
    t.world.gone.delete('/r/notes/a.md');
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    expect(t.world.sent).toHaveLength(3);
    expect(w.counts().armed).toBe(1);
    // That arm opened a window of its own.
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    expect(t.world.sent).toHaveLength(4);

    // Gone through its flush: dormant, and no notice every window after.
    const h3 = t.last('/r/notes/a.md')!;
    t.world.gone.add('/r/notes/a.md');
    h3.fire('rename');
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    expect(t.world.sent).toHaveLength(5);
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS * 10);
    expect(t.world.sent).toHaveLength(5);
    expect(w.counts()).toEqual({ armed: 0, dormant: 1, capped: 0 });
    expect(armOnlyThroughGate(t.world.calls)).toBe(true);
  });

  it('O5: every arm opens a window: the declaration, the flush and the check', async () => {
    const t = makeWorld();
    const w = start(t.deps);
    await w.declare(1, [entry('/r/notes/a.md')]);
    expect(t.world.calls.filter((c) => c === 'window')).toHaveLength(1);
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    // The check's re-arm, with no window open.
    t.replace('/r/notes/a.md');
    t.runChecks();
    expect(t.world.calls.filter((c) => c === 'window')).toHaveLength(2);
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    expect(t.world.sent).toHaveLength(2);
    // The flush's re-arm of a dormant entry opens a window too.
    t.world.gone.add('/r/notes/a.md');
    t.last('/r/notes/a.md')!.fire('rename');
    t.world.gone.delete('/r/notes/a.md');
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    expect(t.world.sent).toHaveLength(3);
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    expect(t.world.sent).toHaveLength(4);
    expect(w.counts().armed).toBe(1);
  });

  it('O6: a declaration replaces the set; an unchanged armed entry is not re-armed and opens no window', async () => {
    const t = makeWorld();
    const w = start(t.deps);
    await w.declare(1, [entry('/r/notes/a.md'), entry('/r/notes/b.md')]);
    const a = t.last('/r/notes/a.md')!;
    const b = t.last('/r/notes/b.md')!;
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    await w.declare(1, [entry('/r/notes/b.md'), entry('/r/notes/c.md')]);
    expect(a.closed).toBe(true);
    expect(b.closed).toBe(false);
    expect(t.world.handles.filter((h) => h.path === '/r/notes/b.md')).toHaveLength(1);
    expect(t.last('/r/notes/c.md')!.closed).toBe(false);
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    const arms = t.world.calls.filter((c) => c === 'armFile').length;
    const windows = t.world.calls.filter((c) => c === 'window').length;
    await w.declare(1, [entry('/r/notes/b.md'), entry('/r/notes/c.md')]);
    expect(t.world.calls.filter((c) => c === 'armFile')).toHaveLength(arms);
    expect(t.world.calls.filter((c) => c === 'window')).toHaveLength(windows);
  });

  it('O7: the cap is 64 across the app; closing tabs frees slots; two senders share one handle per path', async () => {
    const t = makeWorld();
    const w = start(t.deps);
    const many = Array.from({ length: 1000 }, (_, i) => entry(notes(i)));
    // At most 512 are read from one declaration.
    const first = await w.declare(1, many);
    expect(first.watched).toBe(OPEN_FILE_WATCH_CAP);
    expect(w.counts()).toEqual({ armed: 64, dormant: 0, capped: OPEN_FILE_DECLARE_MAX - 64 });
    await w.declare(2, many.slice(500));
    expect(w.counts().armed).toBe(64);
    expect(w.counts().capped).toBe(1000 - 64);
    expect(t.open()).toHaveLength(64);
    // Counts only, never a path.
    expect(t.world.logs.length).toBeGreaterThan(0);
    expect(t.world.logs.every((m) => !m.includes('/r/'))).toBe(true);
    // Sender 1 closes its first ten tabs: ten slots free, and the next declaration arms ten more.
    await w.declare(1, many.slice(10, 512));
    expect(w.counts().armed).toBe(64);
    expect(w.counts().capped).toBe(1000 - 10 - 64);
    expect(t.open()).toHaveLength(64);
    expect(t.open().some((h) => h.path === notes(0))).toBe(false);

    // Two senders, one path, one handle.
    const t2 = makeWorld();
    watches?.dispose();
    const w2 = start(t2.deps);
    await w2.declare(7, [entry('/r/notes/s.md')]);
    await w2.declare(8, [entry('/r/notes/s.md')]);
    expect(t2.world.handles).toHaveLength(1);
    w2.dropSender(7);
    expect(t2.world.handles[0]!.closed).toBe(false);
    w2.dropSender(8);
    expect(t2.world.handles[0]!.closed).toBe(true);
  });

  it('O7b: a window that goes, or a project that closes, frees its slots for ANOTHER window’s capped tabs at once', async () => {
    // The attack lens's nit (the fix round): only a declaration used to re-arm
    // capped entries, so a second window's tabs stayed capped, with no
    // notice, until that window declared again.
    const t = makeWorld();
    const w = start(t.deps);
    const sixtyFour = Array.from({ length: OPEN_FILE_WATCH_CAP }, (_, i) => entry(notes(i)));
    await w.declare(1, sixtyFour);
    await w.declare(2, [entry('/q/notes/x.md', '/q'), entry('/q/notes/y.md', '/q'), entry('/q/notes/z.md', '/q')]);
    expect(w.counts()).toEqual({ armed: OPEN_FILE_WATCH_CAP, dormant: 0, capped: 3 });
    w.dropSender(1);
    expect(w.counts()).toEqual({ armed: 3, dormant: 0, capped: 0 });
    expect(t.open().map((h) => h.path).sort()).toEqual(['/q/notes/x.md', '/q/notes/y.md', '/q/notes/z.md']);
    // ...and a write there is noticed, to window 2 alone.
    t.runChecks();
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS * 2);
    const sentBefore = t.world.sent.length;
    t.last('/q/notes/y.md')!.fire('change');
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS * 2);
    expect(t.world.sent.slice(sentBefore)).toEqual([expect.objectContaining({ id: 2, repo: '/q' })]);

    // The same by a project closing: /r's 64 go and /q's capped three arm.
    const t2 = makeWorld();
    watches?.dispose();
    const w2 = start(t2.deps);
    await w2.declare(1, sixtyFour);
    await w2.declare(2, [entry('/q/notes/x.md', '/q'), entry('/q/notes/y.md', '/q'), entry('/q/notes/z.md', '/q')]);
    expect(w2.counts().capped).toBe(3);
    w2.dropRepo('/r');
    expect(w2.counts()).toEqual({ armed: 3, dormant: 0, capped: 0 });
    // Never past the cap: 64 more from a third window leave 61 to arm and 3 capped.
    await w2.declare(3, Array.from({ length: OPEN_FILE_WATCH_CAP }, (_, i) => entry(`/q/notes/w${String(i)}.md`, '/q')));
    expect(w2.counts()).toEqual({ armed: OPEN_FILE_WATCH_CAP, dormant: 0, capped: 3 });
    expect(t2.open()).toHaveLength(OPEN_FILE_WATCH_CAP);
  });

  it('O8: dropSender, dropRepo and dispose close every handle and clear every timer; a late callback does nothing', async () => {
    const t = makeWorld();
    const w = start(t.deps);
    await w.declare(1, [entry('/r/notes/a.md'), entry('/q/notes/b.md', '/q')]);
    expect(t.open()).toHaveLength(2);
    w.dropRepo('/q');
    expect(t.open().map((h) => h.path)).toEqual(['/r/notes/a.md']);
    const a = t.last('/r/notes/a.md')!;
    w.dropSender(1);
    expect(t.open()).toHaveLength(0);
    const sentBefore = t.world.sent.length;
    const armsAtClose = t.world.calls.filter((c) => c === 'armFile').length;
    a.late('change');
    a.late('rename');
    expect(t.world.calls.filter((c) => c === 'armFile')).toHaveLength(armsAtClose);
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS * 2);
    expect(t.world.sent.length).toBe(sentBefore);

    await w.declare(2, [entry('/r/notes/c.md')]);
    t.last('/r/notes/c.md')!.fire('change');
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    w.dispose();
    expect(vi.getTimerCount()).toBe(0);
    expect(t.open()).toHaveLength(0);
    // A check after dispose does nothing, and nothing arms again.
    const armsBefore = t.world.calls.filter((c) => c === 'armFile').length;
    t.runChecks();
    expect(await w.declare(2, [entry('/r/notes/d.md')])).toEqual({ watched: 0 });
    expect(t.world.calls.filter((c) => c === 'armFile')).toHaveLength(armsBefore);
  });

  it('O9: GMUX_NO_OPEN_FILE_WATCH=1 arms nothing, closes what is armed, answers 0', async () => {
    const t = makeWorld();
    const w = start(t.deps);
    await w.declare(1, [entry('/r/notes/a.md')]);
    expect(t.open()).toHaveLength(1);
    t.world.env[OPEN_FILE_WATCH_OFF_ENV] = '1';
    expect(await w.declare(1, [entry('/r/notes/a.md'), entry('/r/notes/b.md')])).toEqual({ watched: 0 });
    expect(t.open()).toHaveLength(0);
    expect(t.world.handles).toHaveLength(1);
    expect(w.counts()).toEqual({ armed: 0, dormant: 0, capped: 0 });
  });

  it('O10: two overlapping declarations from one sender run in order and the later set wins', async () => {
    const t = makeWorld();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    let asked = 0;
    const slow: OpenFileWatchDeps = {
      ...t.deps,
      // Only the FIRST declaration's plan is slow, so without the per-sender
      // queue the second would land first and the first would win.
      planFor: async (repo) => {
        asked += 1;
        if (asked === 1) await gate;
        return t.deps.planFor(repo);
      }
    };
    const w = start(slow);
    const first = w.declare(1, [entry('/r/notes/x.md')]);
    const second = w.declare(1, [entry('/r/notes/y.md')]);
    await Promise.resolve();
    release();
    await Promise.all([first, second]);
    expect(t.open().map((h) => h.path)).toEqual(['/r/notes/y.md']);
  });

  it('O10b: a declaration still waiting for its plans when its window goes lands nothing', async () => {
    const t = makeWorld();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    const w = start({
      ...t.deps,
      planFor: async (repo) => {
        await gate;
        return t.deps.planFor(repo);
      }
    });
    const pending = w.declare(1, [entry('/r/notes/x.md')]);
    w.dropSender(1);
    release();
    expect(await pending).toEqual({ watched: 0 });
    expect(t.world.handles).toHaveLength(0);
    expect(w.counts()).toEqual({ armed: 0, dormant: 0, capped: 0 });
  });

  it('O11: a notice goes only to the senders that declared that repository, with the string they declared, never a dropped one', async () => {
    const t = makeWorld();
    const w = start(t.deps);
    await w.declare(1, [entry('/r/notes/a.md', '/r')]);
    await w.declare(2, [entry('/q/notes/q.md', '/q')]);
    await w.declare(3, [entry('/r/notes/a.md', '/r/')]);
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    t.world.sent.length = 0;
    t.last('/r/notes/a.md')!.fire('change');
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    expect(t.world.sent.map((s) => [s.id, s.repo]).sort()).toEqual([
      [1, '/r'],
      [3, '/r/']
    ]);
    w.dropSender(1);
    t.world.sent.length = 0;
    t.last('/r/notes/a.md')!.fire('change');
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    expect(t.world.sent.map((s) => [s.id, s.repo])).toEqual([[3, '/r/']]);
  });

  it('O12: a non-array is refused INVALID_INPUT; a relative path, a non-string, an oversized one and the 513th entry are skipped', async () => {
    const t = makeWorld();
    const w = start(t.deps);
    const err = await w.declare(1, 'notes/a.md').catch((e: unknown) => e);
    expect(gmuxErrorPayloadOf(err)?.code).toBe('INVALID_INPUT');
    const filler = Array.from({ length: OPEN_FILE_DECLARE_MAX - 5 }, (_, i) => entry(`/r/src/f${String(i)}.md`));
    const res = await w.declare(1, [
      { repoPath: '/r', path: 'notes/rel.md' },
      { repoPath: 5, path: '/r/notes/n.md' },
      null,
      'a string',
      entry(`/r/notes/${'x'.repeat(4_100)}.md`),
      ...filler,
      entry('/r/notes/the-513th.md')
    ]);
    expect(res).toEqual({ watched: 0 });
    // Only the 507 well formed entries inside the first 512 reached the gate.
    expect(t.world.calls.filter((c) => c === 'canonical')).toHaveLength(OPEN_FILE_DECLARE_MAX - 5);
    expect(t.world.calls.filter((c) => c === 'armFile')).toHaveLength(0);
    expect(t.world.handles).toHaveLength(0);
    // The same file, inside the first 512, is read.
    expect(await w.declare(1, [entry('/r/notes/the-513th.md')])).toEqual({ watched: 1 });
  });

  it('O13: THE GATE, in order, for the declaration, the rename re-arm, the flush re-arm and the check re-arm, and armFile from nowhere else', async () => {
    const t = makeWorld();
    const w = start(t.deps);
    const path = '/r/notes/a.md';
    const tail = (from: number): string[] => t.world.calls.slice(from);

    // The declaration: the gate, then the window, then the check.
    await w.declare(1, [entry(path)]);
    expect(t.world.calls).toEqual([...GATE, 'window', 'afterKernelSees']);
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);

    // The rename re-arm: the event opens the window, then the gate and the check.
    let from = t.world.calls.length;
    t.replace(path);
    t.last(path)!.fire('rename');
    expect(tail(from)).toEqual(['window', ...GATE, 'afterKernelSees']);
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);

    // The flush re-arm of a dormant entry.
    t.world.gone.add(path);
    t.last(path)!.fire('rename');
    t.world.gone.delete(path);
    from = t.world.calls.length;
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    expect(tail(from)).toEqual([...GATE, 'window', 'afterKernelSees']);
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);

    // The check's re-arm: G1, G2 and G5 again, then the gate.
    t.world.checks.splice(0, t.world.checks.length - 1);
    t.replace(path);
    from = t.world.calls.length;
    t.runChecks();
    expect(tail(from)).toEqual(['canonical', 'excludes', 'identity', ...GATE, 'window', 'afterKernelSees']);
    expect(armOnlyThroughGate(t.world.calls)).toBe(true);
  });

  it('O13: G2 false never opens; G4 false closes with no window; G1 and G3 refusals open no window', async () => {
    const t = makeWorld();
    const w = start(t.deps);
    // G2: outside the plan.
    await w.declare(1, [entry('/r/src/x.md')]);
    expect(t.world.calls).toEqual(['canonical', 'excludes']);
    // G1: gone.
    t.world.gone.add('/r/notes/gone.md');
    await w.declare(1, [entry('/r/notes/gone.md')]);
    // G3: the descriptor open refused.
    t.world.refuseArm.add('/r/notes/fifo');
    await w.declare(1, [entry('/r/notes/fifo')]);
    // G4: a folder of the path swapped for a link to outside between G1 and G3.
    t.world.canonicalSeq.set('/r/notes/sub/d.md', ['/r/notes/sub/d.md', '/elsewhere/d.md']);
    await w.declare(1, [entry('/r/notes/sub/d.md')]);
    const swapped = t.last('/r/notes/sub/d.md')!;
    expect(swapped.closed).toBe(true);
    expect(t.world.calls).not.toContain('window');
    expect(vi.getTimerCount()).toBe(0);
    expect(w.counts()).toEqual({ armed: 0, dormant: 1, capped: 0 });
  });

  it('O13: G5 mismatched retries ARM_RECHECKS more times then goes dormant WITH a window; matched on the second try arms with one window', async () => {
    const t = makeWorld();
    const w = start(t.deps);
    t.world.afterArm = (c) => t.replace(c); // replaced every time it is opened
    await w.declare(1, [entry('/r/notes/a.md')]);
    expect(t.world.calls.filter((c) => c === 'armFile')).toHaveLength(1 + ARM_RECHECKS);
    expect(t.world.handles.every((h) => h.closed)).toBe(true);
    expect(t.world.calls.filter((c) => c === 'window')).toHaveLength(1);
    expect(t.world.calls).not.toContain('afterKernelSees');
    expect(w.counts()).toEqual({ armed: 0, dormant: 1, capped: 0 });
    // The flush tries once more; the file has settled.
    t.world.afterArm = null;
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    expect(w.counts().armed).toBe(1);

    const t2 = makeWorld();
    watches?.dispose();
    const w2 = start(t2.deps);
    let once = true;
    t2.world.afterArm = (c) => {
      if (once) t2.replace(c);
      once = false;
    };
    await w2.declare(1, [entry('/r/notes/b.md')]);
    expect(t2.world.calls.filter((c) => c === 'armFile')).toHaveLength(2);
    expect(t2.world.handles[0]!.closed).toBe(true);
    expect(t2.world.handles[1]!.closed).toBe(false);
    expect(t2.world.calls.filter((c) => c === 'window')).toHaveLength(1);
  });

  it('O14: THE CHECK: equal ends it; a move re-arms; four moves in a row leave it dormant with a window', async () => {
    const t = makeWorld();
    const w = start(t.deps);
    const path = '/r/notes/a.md';
    await w.declare(1, [entry(path)]);
    const h1 = t.last(path)!;
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    // Equal: nothing moves.
    t.runChecks();
    expect(h1.closed).toBe(false);
    expect(t.world.handles).toHaveLength(1);

    // A later arm, then moves in a row.
    t.replace(path);
    h1.fire('rename');
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    t.world.checks.splice(0, t.world.checks.length - 1);
    for (let move = 1; move <= ARM_RECHECKS; move++) {
      t.replace(path);
      t.runChecks();
      expect(w.counts().armed).toBe(1);
    }
    vi.advanceTimersByTime(DEFAULT_DEBOUNCE_MS);
    const windows = t.world.calls.filter((c) => c === 'window').length;
    t.replace(path); // the fourth move
    t.runChecks();
    expect(w.counts()).toEqual({ armed: 0, dormant: 1, capped: 0 });
    expect(t.world.calls.filter((c) => c === 'window')).toHaveLength(windows + 1);
    expect(t.world.checks).toHaveLength(0);
  });

  it('O14: the check asks the plan again: a path the stopped watcher no longer excludes is closed, whatever its identity', async () => {
    const t = makeWorld();
    const w = start(t.deps);
    await w.declare(1, [entry('/r/notes/a.md')]);
    const h = t.last('/r/notes/a.md')!;
    // The repository's watcher stopped (its plan answers false from then on);
    // the file itself has not moved.
    t.world.excluded = [];
    t.runChecks();
    expect(h.closed).toBe(true);
    expect(w.counts()).toEqual({ armed: 0, dormant: 1, capped: 0 });
  });

  it('O8: a late callback from a handle the check replaced does not touch the live one', async () => {
    const t = makeWorld();
    const w = start(t.deps);
    await w.declare(1, [entry('/r/notes/a.md')]);
    const h1 = t.last('/r/notes/a.md')!;
    t.replace('/r/notes/a.md');
    t.runChecks();
    const h2 = t.last('/r/notes/a.md')!;
    expect(h2).not.toBe(h1);
    const arms = t.world.calls.filter((c) => c === 'armFile').length;
    h1.late('rename');
    h1.late('error');
    expect(h2.closed).toBe(false);
    expect(t.world.calls.filter((c) => c === 'armFile')).toHaveLength(arms);
    expect(w.counts().armed).toBe(1);
  });

  it('O14: a check whose entry closed, or whose handle a rename replaced, does nothing', async () => {
    const t = makeWorld();
    const w = start(t.deps);
    await w.declare(1, [entry('/r/notes/a.md'), entry('/r/notes/b.md')]);
    const [checkA] = t.world.checks.splice(0, 1);
    // The rename replaced a's handle before its check ran.
    t.replace('/r/notes/a.md');
    t.last('/r/notes/a.md')!.fire('rename');
    t.replace('/r/notes/a.md');
    let from = t.world.calls.length;
    checkA!();
    expect(t.world.calls.slice(from)).toEqual([]);
    // b's entry closed before its check ran.
    const checkB = t.world.checks.shift()!;
    await w.declare(1, [entry('/r/notes/a.md')]);
    t.replace('/r/notes/b.md');
    from = t.world.calls.length;
    checkB();
    expect(t.world.calls.slice(from)).toEqual([]);
  });
});
