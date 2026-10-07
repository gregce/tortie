/**
 * The page reader (Phase 337.1, build/p3371/SPEC.md §5.3.5, D2, D9 to D15,
 * §7.2; §Attack B1 to B3, B10), on fake timers over a fake tmux whose pane
 * holds numbered lines (`L000001` is index 0) and can grow, shrink or switch
 * between the three commands of a round, as tmux 3.6a and 3.7b place a
 * capture's ends (`cmd-capture-pane.c`): D9's numbers, attempt 1 at the
 * phone's depth and later attempts at the previous display; the overscan; the
 * OLDEST page while lines arrive, served from the oldest line by
 * `max(0, a + h1)`; an agreement failing then holding; a cover failing at a
 * flood then holding at the newer frame; three failures `busy`; every `moved`
 * of D12; `closing()` before an attempt, waiting its turn, waiting its floor
 * and inside a round, each answered within one tick; the slot held until a
 * round settles; the queue's bound; one page in flight a session; the two
 * floors and the duty cycle; a far round's absence; and the production rounds
 * over the control client and the spawned list. Nothing here spawns tmux.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PocketScrollbackAnswer } from '@shared/ipc/pocket';
import { SCREEN_ENDED, SCREEN_UNREACHABLE, SCROLLBACK_BUSY, SCROLLBACK_MOVED } from '@shared/screen-copy';
import type { Session } from '@shared/types';
import type { PocketScrollbackAsk } from '../../pocket/routes';
import { PAGE_STEP_ROWS, spaceOf } from '../compose';
import { parseScreenDisplay, SCREEN_FORMAT, type PageRound, type ScreenCore, type ScreenDisplay } from '../read';
import { row } from './session-row';
import {
  createScreenScrollback,
  PAGE_SLICE_MS,
  SCROLLBACK_ATTEMPTS,
  SCROLLBACK_MIN_GAP_MS,
  SCROLLBACK_MIN_GAP_REMOTE_MS,
  SCROLLBACK_OVERSCAN,
  SCROLLBACK_QUEUE_MAX,
  type ScreenScrollbackDeps
} from '../scrollback';
import {
  SCREEN_DUTY_FACTOR,
  SCREEN_LOCAL_READ_DEADLINE_MS,
  SCREEN_REMOTE_READ_DEADLINE_MS,
  SCREEN_TICK_MS,
  SCREEN_TICK_REMOTE_MS
} from '../watch';

/** What a page's composition costs, in fake ms: the duty cycle's test sets it. */
const cost = vi.hoisted(() => ({ ms: 0 }));
/** What each step of a page's composition costs, in fake ms (the fix round's stepping). */
const stepCost = vi.hoisted(() => ({ ms: 0 }));
/** The production down path's one spawn, scripted by the test that drives it. */
const spawned = vi.hoisted(() => ({
  calls: [] as { args: readonly string[]; options: unknown }[],
  answer: (_args: readonly string[]): string => ''
}));

vi.mock('../compose', async (original) => {
  const real = await original<typeof import('../compose')>();
  return {
    ...real,
    composePageSteps: function* (...args: Parameters<typeof real.composePageSteps>) {
      const inner = real.composePageSteps(...args);
      for (;;) {
        const step = inner.next();
        if (stepCost.ms > 0) vi.setSystemTime(Date.now() + stepCost.ms);
        if (step.done === true) {
          if (cost.ms > 0) vi.setSystemTime(Date.now() + cost.ms);
          return step.value;
        }
        yield;
      }
    }
  };
});

vi.mock('../../tmux', async (original) => {
  const real = await original<typeof import('../../tmux')>();
  return {
    ...real,
    execTmux: (args: readonly string[], options?: unknown) => {
      spawned.calls.push({ args, options });
      return Promise.resolve(spawned.answer(args));
    }
  };
});

const L = (i: number): string => `L${String(i + 1).padStart(6, '0')}`;
const numbered = (from: number, count: number): string[] => Array.from({ length: count }, (_, i) => L(from + i));

/** A pane: its history of numbered lines (index 0 the oldest) and its frame. */
interface Pane {
  paneId: string;
  cols: number;
  rows: number;
  alternate: boolean;
  lines: string[];
}

function pane(history: number, extra: Partial<Pane> = {}): Pane {
  return { paneId: '%1', cols: 120, rows: 40, alternate: false, lines: numbered(0, history), ...extra };
}

/** Lines printed: they scroll into the history, which keeps every index it had. */
function grow(p: Pane, n: number): void {
  for (let k = 0; k < n; k += 1) p.lines.push(L(p.lines.length));
}

function displayLineOf(p: Pane): string {
  return [p.paneId, String(p.cols), String(p.rows), '0', '0', '1', p.alternate ? '1' : '0', String(p.lines.length)].join('\t');
}

function displayOf(p: Pane): ScreenDisplay {
  const d = parseScreenDisplay(displayLineOf(p));
  if (d === null) throw new Error('the fake display does not parse');
  return d;
}

/** `capture-pane -S a -E b` as tmux places its ends: each at history + n, one above the oldest at the oldest. */
function captureOf(p: Pane, a: number, b: number): string[] {
  const h = p.lines.length;
  let top = Math.max(a + h, 0);
  let bottom = Math.max(b + h, 0);
  if (bottom < top) [top, bottom] = [bottom, top];
  return p.lines.slice(top, bottom + 1);
}

/** What happens to the pane around one round: before its first display, between the display and the capture, and after. */
interface Weather {
  before?: (p: Pane) => void;
  between?: (p: Pane) => void;
  after?: (p: Pane) => void;
}

function roundOf(p: Pane, a: number, b: number, w: Weather = {}): PageRound {
  w.before?.(p);
  const first = displayOf(p);
  w.between?.(p);
  const rows = captureOf(p, a, b);
  w.after?.(p);
  return { first, rows, last: displayOf(p) };
}

const FAR = { machine: { id: 'm1' } as unknown as Session['machine'] };

interface Rig {
  readonly scrollback: ReturnType<typeof createScreenScrollback>;
  readonly sessions: Session[];
  readonly panes: Map<string, Pane>;
  /** Every round started, in order. */
  readonly rounds: { id: string; a: number; b: number; at: number }[];
  /** Per session, what happens around each of its next rounds. */
  readonly weather: Map<string, Weather[]>;
  readonly control: { connected: boolean; sendCommand(command: string): Promise<string[]> };
  /** When set, a round answers this instead of the pane. */
  hold: ((id: string, a: number, b: number) => Promise<PageRound | 'unreachable' | null>) | null;
  core: ScreenCore | null;
}

function rig(deps: Partial<ScreenScrollbackDeps> = {}): Rig {
  const sessions = [row('s1'), row('s2'), row('r1', FAR)];
  const panes = new Map<string, Pane>([
    ['s1', pane(3000)],
    ['s2', pane(3000, { paneId: '%2' })],
    ['r1', pane(3000, { paneId: '%9' })]
  ]);
  const control = { connected: true, sendCommand: (_: string): Promise<string[]> => Promise.reject(new Error('unused')) };
  const core: ScreenCore = {
    listSessions: () => sessions,
    tmuxIdOf: (id) => (sessions.some((s) => s.id === id && s.machine === undefined) ? `$${id.slice(1)}` : null),
    manifest: { getSession: () => undefined },
    control,
    activity: { noteUserInput: () => undefined }
  };
  const r: Rig = {
    scrollback: null as unknown as Rig['scrollback'],
    sessions,
    panes,
    rounds: [],
    weather: new Map(),
    control,
    hold: null,
    core
  };
  const read = (id: string, a: number, b: number): Promise<PageRound | 'unreachable' | null> => {
    r.rounds.push({ id, a, b, at: Date.now() });
    if (r.hold !== null) return r.hold(id, a, b);
    const p = panes.get(id);
    if (p === undefined) return Promise.resolve(null);
    return Promise.resolve(roundOf(p, a, b, r.weather.get(id)?.shift()));
  };
  (r as { scrollback: Rig['scrollback'] }).scrollback = createScreenScrollback({
    core: () => r.core,
    // A round on this Mac never answers `unreachable`: the far reader's word.
    readLocalRounds: (_core, tmuxId, a, b) =>
      read(`s${tmuxId.slice(1)}`, a, b).then((round) => (round === 'unreachable' ? null : round)),
    readRemoteRounds: (id, a, b) => read(id, a, b),
    now: () => Date.now(),
    ...deps
  });
  return r;
}

function ask(from: number, count: number, depth: number, extra: Partial<PocketScrollbackAsk> = {}): PocketScrollbackAsk {
  return { from, count, depth, wrap: 120, keep: 'bottom', ...extra };
}

/** A page, and whether and when it was answered. */
function page(r: Rig, id: string, a: PocketScrollbackAsk, closing: () => boolean = () => false) {
  const out: { answer: PocketScrollbackAnswer | null; at: number | null } = { answer: null, at: null };
  const session = r.sessions.find((s) => s.id === id) ?? row(id);
  void r.scrollback.page(session, a, closing).then((answer) => {
    out.answer = answer;
    out.at = Date.now();
  });
  return out;
}

/** The text of every row a page carried. */
function texts(answer: PocketScrollbackAnswer | null): string[] {
  return (answer?.rows ?? []).map((runs) => runs.map((run) => run.text).join(''));
}

/** A page asked and answered with no clock moving. */
async function served(r: Rig, id: string, a: PocketScrollbackAsk): Promise<PocketScrollbackAnswer | null> {
  const p = page(r, id, a);
  await vi.advanceTimersByTimeAsync(0);
  return p.answer;
}

function expectAbsent(answer: PocketScrollbackAnswer | null, why: string, sentence: string): void {
  expect(answer).toMatchObject({ from: null, depth: null, wrap: null, space: null, styles: [], rows: [], why, sentence });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  cost.ms = 0;
  stepCost.ms = 0;
  spawned.calls = [];
  spawned.answer = () => '';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the constants (§5.3.5)', () => {
  it('overscan 128, three attempts, 250 ms here, the far poll’s 400 ms there, four waiting', () => {
    expect(SCROLLBACK_OVERSCAN).toBe(128);
    expect(SCROLLBACK_ATTEMPTS).toBe(3);
    expect(SCROLLBACK_MIN_GAP_MS).toBe(250);
    expect(SCROLLBACK_MIN_GAP_REMOTE_MS).toBe(SCREEN_TICK_REMOTE_MS);
    expect(SCROLLBACK_MIN_GAP_REMOTE_MS).toBe(400);
    expect(SCROLLBACK_QUEUE_MAX).toBe(4);
  });
});

describe('the row (step 1)', () => {
  it('a row not listed, not live, or on this Mac with no $-id is `ended`, and nothing is read', async () => {
    const r = rig();
    expectAbsent(await served(r, 'nobody', ask(0, 10, 3000)), 'ended', SCREEN_ENDED);
    r.sessions[0] = row('s1', { status: 'exited' });
    expectAbsent(await served(r, 's1', ask(0, 10, 3000)), 'ended', SCREEN_ENDED);
    r.sessions[0] = row('s1');
    const noTarget = rig();
    noTarget.core = { ...(noTarget.core as ScreenCore), tmuxIdOf: () => null };
    expectAbsent(await served(noTarget, 's1', ask(0, 10, 3000)), 'ended', SCREEN_ENDED);
    expect(r.rounds).toEqual([]);
    expect(noTarget.rounds).toEqual([]);
  });

  it('no core is `unreachable`; an ask outside D7’s bounds is `busy`; neither reads anything', async () => {
    const r = rig();
    r.core = null;
    expectAbsent(await served(r, 's1', ask(0, 10, 3000)), 'unreachable', SCREEN_UNREACHABLE);
    const bad = rig();
    for (const a of [
      ask(0, 0, 3000),
      ask(0, 129, 3000),
      ask(2950, 100, 3000),
      ask(-1, 10, 3000),
      ask(0.5, 10, 3000),
      ask(0, 10, 100_001),
      ask(0, 10, 3000, { wrap: 513 }),
      ask(0, 10, 3000, { keep: 'middle' as never })
    ]) {
      expectAbsent(await served(bad, 's1', a), 'busy', SCROLLBACK_BUSY);
    }
    expect(bad.rounds).toEqual([]);
  });
});

describe('D9’s numbers', () => {
  it('attempt 1 at the ask’s depth: a = from - overscan - depth, b = min(from + count, depth) - 1 - depth; the page by index', async () => {
    const r = rig();
    const answer = await served(r, 's1', ask(2900, 100, 3000));
    expect(r.rounds).toEqual([{ id: 's1', a: 2900 - SCROLLBACK_OVERSCAN - 3000, b: -1, at: 1_000_000 }]);
    expect(answer).toMatchObject({ sessionId: 's1', from: 2900, depth: 3000, wrap: 120, space: spaceOf('%1'), why: null, sentence: null });
    expect(texts(answer)).toEqual(numbered(2900, 100));
    expect(answer?.styles).toHaveLength(1);
  });

  it('the start is NEVER held at the oldest line: from 30 names a line above it (§Attack B1)', async () => {
    const r = rig();
    await served(r, 's1', ask(30, 100, 3000));
    expect(r.rounds[0]?.a).toBe(30 - SCROLLBACK_OVERSCAN - 3000);
    expect((r.rounds[0]?.a ?? 0) + 3000).toBeLessThan(0);
  });

  it('later attempts at the previous attempt’s last display: an agreement failing, then holding', async () => {
    const r = rig();
    const p = r.panes.get('s1') as Pane;
    // Lines scroll in between the first display and the capture: the two displays disagree.
    r.weather.set('s1', [{ between: (q) => grow(q, 5) }]);
    const answer = await served(r, 's1', ask(2900, 100, 3000));
    expect(r.rounds).toHaveLength(2);
    expect(r.rounds[0]).toMatchObject({ a: 2900 - 128 - 3000, b: -1 });
    expect(r.rounds[1]).toMatchObject({ a: 2900 - 128 - 3005, b: 3000 - 1 - 3005 });
    expect(answer?.depth).toBe(3005);
    expect(texts(answer)).toEqual(numbered(2900, 100));
    expect(p.lines).toHaveLength(3005);
  });
});

describe('the OLDEST page while lines arrive (§Attack B1)', () => {
  for (const from of [0, 30, 100]) {
    it(`from ${String(from)}: lines arriving between the phone’s depth and the statement are covered at attempt 1`, async () => {
      for (const arrived of [1, 50, 120]) {
        const r = rig();
        r.weather.set('s1', [{ before: (q) => grow(q, arrived) }]);
        const answer = await served(r, 's1', ask(from, 100, 3000));
        expect(r.rounds, `${String(arrived)} arrived`).toHaveLength(1);
        expect(answer?.from, `${String(arrived)} arrived`).toBe(from);
        expect(answer?.depth).toBe(3000 + arrived);
        expect(texts(answer), `${String(arrived)} arrived`).toEqual(numbered(from, 100));
      }
    });
  }
});

describe('the cover', () => {
  it('a flood of more lines than the overscan since the phone’s picture: attempt 1 does not cover, attempt 2 at the newer frame does', async () => {
    const r = rig();
    r.weather.set('s1', [{ before: (q) => grow(q, 200) }]);
    const answer = await served(r, 's1', ask(1000, 100, 3000));
    expect(r.rounds).toHaveLength(2);
    expect(r.rounds[1]).toMatchObject({ a: 1000 - 128 - 3200, b: 1100 - 1 - 3200 });
    expect(answer?.from).toBe(1000);
    expect(texts(answer)).toEqual(numbered(1000, 100));
  });

  it('a capture whose line count is not the agreed frame’s is not a page: the next attempt', async () => {
    for (const shape of ['one short', 'two over'] as const) {
      const r = rig();
      let n = 0;
      r.hold = (id, a, b) => {
        n += 1;
        const p = r.panes.get(id) as Pane;
        const round = roundOf(p, a, b);
        if (n > 1) return Promise.resolve(round);
        // Two rows past the end still cover the page: only the count can tell.
        const rows = shape === 'one short' ? round.rows.slice(1) : [...round.rows, 'x', 'y'];
        return Promise.resolve({ ...round, rows });
      };
      const answer = await served(r, 's1', ask(2900, 100, 3000));
      expect(n, shape).toBe(2);
      expect(texts(answer), shape).toEqual(numbered(2900, 100));
    }
  });

  it('three attempts that never agree are `busy`, and nothing read is carried', async () => {
    const r = rig();
    r.weather.set('s1', [1, 2, 3, 4].map(() => ({ between: (q: Pane) => grow(q, 1) })));
    const answer = await served(r, 's1', ask(2900, 100, 3000));
    expect(r.rounds).toHaveLength(SCROLLBACK_ATTEMPTS);
    expectAbsent(answer, 'busy', SCROLLBACK_BUSY);
  });
});

describe('`moved` over the agreed frame (D12), the capture dropped unsent', () => {
  it('the alternate screen', async () => {
    const r = rig();
    (r.panes.get('s1') as Pane).alternate = true;
    expectAbsent(await served(r, 's1', ask(2900, 100, 3000)), 'moved', SCROLLBACK_MOVED);
    expect(r.rounds).toHaveLength(1);
  });

  it('a width that is not the index space’s', async () => {
    const r = rig();
    expectAbsent(await served(r, 's1', ask(2900, 100, 3000, { wrap: 80 })), 'moved', SCROLLBACK_MOVED);
  });

  it('a history shallower than the phone’s depth (a trim at the limit, a clear), `from` past it included', async () => {
    const r = rig();
    (r.panes.get('s1') as Pane).lines.splice(0, 300);
    expectAbsent(await served(r, 's1', ask(2900, 100, 3000)), 'moved', SCROLLBACK_MOVED);
    const cleared = rig();
    (cleared.panes.get('s1') as Pane).lines.length = 50;
    expectAbsent(await served(cleared, 's1', ask(100, 20, 120)), 'moved', SCROLLBACK_MOVED);
  });

  it('a trim that leaves `from` inside the history is still `moved`: every index then names another line', async () => {
    // At a limit tmux frees lines from the top; 50 freed shifts every index by 50.
    const r = rig();
    (r.panes.get('s1') as Pane).lines.splice(0, 50);
    expectAbsent(await served(r, 's1', ask(100, 100, 3000)), 'moved', SCROLLBACK_MOVED);
    expect(r.rounds).toHaveLength(1);
  });

  it('a history shallower than the PREVIOUS attempt’s display, though at the phone’s depth: main saw it shrink', async () => {
    const r = rig();
    r.weather.set('s1', [
      { between: (q) => grow(q, 10) },
      // A trim between the two attempts: 3,010 lines become 3,005.
      { before: (q) => void q.lines.splice(0, 5) }
    ]);
    const answer = await served(r, 's1', ask(2900, 100, 3000));
    expect(r.rounds).toHaveLength(2);
    expectAbsent(answer, 'moved', SCROLLBACK_MOVED);
  });
});

describe('the space (§Attack B8)', () => {
  it('a page is the agreed pane’s space, whatever pane the phone’s picture was of: main does not compare it', async () => {
    const r = rig();
    const p = r.panes.get('s1') as Pane;
    p.paneId = '%2';
    const answer = await served(r, 's1', ask(2900, 100, 3000));
    expect(answer?.space).toBe(spaceOf('%2'));
    expect(answer?.space).not.toBe(spaceOf('%1'));
  });

  it('a pane switched between the two displays is a disagreement, and the next attempt’s pane is the page’s', async () => {
    const r = rig();
    r.weather.set('s1', [{ between: (q) => void (q.paneId = '%2') }]);
    const answer = await served(r, 's1', ask(2900, 100, 3000));
    expect(r.rounds).toHaveLength(2);
    expect(answer?.space).toBe(spaceOf('%2'));
  });
});

describe('closing() (§Attack B3): answered within one tick wherever the page waits', () => {
  it('before an attempt: `unreachable`, nothing read', async () => {
    const r = rig();
    const p = page(r, 's1', ask(2900, 100, 3000), () => true);
    await vi.advanceTimersByTimeAsync(0);
    expectAbsent(p.answer, 'unreachable', SCREEN_UNREACHABLE);
    expect(r.rounds).toEqual([]);
  });

  it('inside a round that never settles: answered within one tick, the slot held until the round settles', async () => {
    const r = rig();
    let settle: (round: PageRound | null) => void = () => undefined;
    r.hold = () =>
      new Promise((resolve) => {
        settle = resolve;
      });
    let closing = false;
    const first = page(r, 's1', ask(2900, 100, 3000), () => closing);
    await vi.advanceTimersByTimeAsync(50);
    expect(first.answer).toBeNull();
    closing = true;
    const t = Date.now();
    await vi.advanceTimersByTimeAsync(SCREEN_TICK_MS);
    expectAbsent(first.answer, 'unreachable', SCREEN_UNREACHABLE);
    expect((first.at ?? Infinity) - t).toBeLessThanOrEqual(SCREEN_TICK_MS);
    // The slot: a page asked now waits for the round left settling.
    r.hold = null;
    const second = page(r, 's1', ask(2900, 100, 3000));
    await vi.advanceTimersByTimeAsync(5_000);
    expect(second.answer).toBeNull();
    expect(r.rounds).toHaveLength(1);
    settle(null);
    await vi.advanceTimersByTimeAsync(SCROLLBACK_MIN_GAP_MS);
    expect(texts(second.answer)).toEqual(numbered(2900, 100));
  });

  it('waiting its turn behind a page in a round: answered within one tick, and it leaves the line', async () => {
    const r = rig();
    let settle: (round: PageRound | null) => void = () => undefined;
    r.hold = () =>
      new Promise((resolve) => {
        settle = resolve;
      });
    page(r, 's1', ask(2900, 100, 3000));
    let closing = false;
    const waiting = page(r, 's1', ask(2800, 100, 3000), () => closing);
    const after = page(r, 's1', ask(2700, 100, 3000));
    await vi.advanceTimersByTimeAsync(300);
    closing = true;
    const t = Date.now();
    await vi.advanceTimersByTimeAsync(SCREEN_TICK_MS);
    expectAbsent(waiting.answer, 'unreachable', SCREEN_UNREACHABLE);
    expect((waiting.at ?? Infinity) - t).toBeLessThanOrEqual(SCREEN_TICK_MS);
    // The page behind it moves up: the next round is its own.
    r.hold = null;
    settle(null);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(r.rounds.map((x) => x.a)).toContain(2700 - 128 - 3000);
    expect(r.rounds.map((x) => x.a)).not.toContain(2800 - 128 - 3000);
    expect(texts(after.answer)).toEqual(numbered(2700, 100));
  });

  it('waiting its floor: answered within one tick, and no round is started', async () => {
    const r = rig();
    await served(r, 's1', ask(2900, 100, 3000));
    let closing = false;
    const p = page(r, 's1', ask(2800, 100, 3000), () => closing);
    await vi.advanceTimersByTimeAsync(20);
    closing = true;
    const t = Date.now();
    await vi.advanceTimersByTimeAsync(SCREEN_TICK_MS);
    expectAbsent(p.answer, 'unreachable', SCREEN_UNREACHABLE);
    expect((p.at ?? Infinity) - t).toBeLessThanOrEqual(SCREEN_TICK_MS);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(r.rounds).toHaveLength(1);
  });

  it('a far round past its deadline is `unreachable`; here, the next attempt', async () => {
    const r = rig();
    let calls = 0;
    r.hold = (id, a, b) => {
      calls += 1;
      if (calls === 1) return new Promise<PageRound | null>(() => undefined);
      return Promise.resolve(roundOf(r.panes.get(id) as Pane, a, b));
    };
    const here = page(r, 's1', ask(2900, 100, 3000));
    await vi.advanceTimersByTimeAsync(SCREEN_LOCAL_READ_DEADLINE_MS - 1);
    expect(here.answer).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(texts(here.answer)).toEqual(numbered(2900, 100));
    expect(calls).toBe(2);
    const far = rig();
    far.hold = () => new Promise<PageRound | null>(() => undefined);
    const there = page(far, 'r1', ask(2900, 100, 3000));
    await vi.advanceTimersByTimeAsync(SCREEN_REMOTE_READ_DEADLINE_MS);
    expectAbsent(there.answer, 'unreachable', SCREEN_UNREACHABLE);
    expect(far.rounds).toHaveLength(1);
  });

  it('a far round that answers unreachable is `unreachable` at once', async () => {
    const r = rig();
    r.hold = () => Promise.resolve('unreachable' as const);
    expectAbsent(await served(r, 'r1', ask(2900, 100, 3000)), 'unreachable', SCREEN_UNREACHABLE);
    expect(r.rounds).toHaveLength(1);
  });
});

describe('the turn: one page in flight a session, FIFO, the queue bounded (D14)', () => {
  it('a fifth page waiting on one session is `busy` at once; the four waiting go in order', async () => {
    const r = rig();
    let settle: (round: PageRound | null) => void = () => undefined;
    r.hold = () =>
      new Promise((resolve) => {
        settle = resolve;
      });
    page(r, 's1', ask(2900, 100, 3000));
    const waiting = [2800, 2700, 2600, 2500].map((from) => page(r, 's1', ask(from, 100, 3000)));
    const fifth = page(r, 's1', ask(2400, 100, 3000));
    await vi.advanceTimersByTimeAsync(0);
    expectAbsent(fifth.answer, 'busy', SCROLLBACK_BUSY);
    expect(waiting.every((w) => w.answer === null)).toBe(true);
    expect(r.rounds).toHaveLength(1);
    r.hold = null;
    settle(null);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(waiting.map((w) => w.answer?.from)).toEqual([2800, 2700, 2600, 2500]);
    expect(r.rounds.slice(-4).map((x) => x.a + 128 + 3000)).toEqual([2800, 2700, 2600, 2500]);
  });

  it('never two rounds of one session at once, while another session pages beside it', async () => {
    const r = rig();
    const open = new Map<string, number>();
    let most = 0;
    r.hold = (id, a, b) => {
      open.set(id, (open.get(id) ?? 0) + 1);
      most = Math.max(most, open.get(id) ?? 0);
      return new Promise((resolve) => {
        setTimeout(() => {
          open.set(id, (open.get(id) ?? 1) - 1);
          resolve(roundOf(r.panes.get(id) as Pane, a, b));
        }, 300);
      });
    };
    const mine = [2900, 2800, 2700].map((from) => page(r, 's1', ask(from, 100, 3000)));
    const other = page(r, 's2', ask(2900, 100, 3000));
    await vi.advanceTimersByTimeAsync(300);
    expect(other.answer?.from).toBe(2900);
    expect(mine[0]?.answer?.from).toBe(2900);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(mine.map((m) => m.answer?.from)).toEqual([2900, 2800, 2700]);
    expect(most).toBe(1);
  });
});

describe('the floors and the duty cycle (D14, §Attack B2, B10)', () => {
  it('250 ms between two page starts of a session here, and the far poll’s 400 ms there', async () => {
    for (const [id, gap] of [
      ['s1', SCROLLBACK_MIN_GAP_MS],
      ['r1', SCROLLBACK_MIN_GAP_REMOTE_MS]
    ] as const) {
      const r = rig();
      await served(r, id, ask(2900, 100, 3000));
      const second = page(r, id, ask(2800, 100, 3000));
      await vi.advanceTimersByTimeAsync(gap - 1);
      expect(second.answer, id).toBeNull();
      await vi.advanceTimersByTimeAsync(1);
      expect(second.answer?.from, id).toBe(2800);
      expect((r.rounds[1]?.at ?? 0) - (r.rounds[0]?.at ?? 0), id).toBe(gap);
    }
  });

  it('after a costly page the next starts no sooner than SCREEN_DUTY_FACTOR composes later', async () => {
    const r = rig();
    cost.ms = 120;
    await served(r, 's1', ask(2900, 100, 3000));
    cost.ms = 0;
    const second = page(r, 's1', ask(2800, 100, 3000));
    await vi.advanceTimersByTimeAsync(SCREEN_DUTY_FACTOR * 120 - 121);
    expect(second.answer).toBeNull();
    await vi.advanceTimersByTimeAsync(10);
    expect(second.answer?.from).toBe(2800);
    expect((r.rounds[1]?.at ?? 0) - (r.rounds[0]?.at ?? 0)).toBeGreaterThanOrEqual(SCREEN_DUTY_FACTOR * 120);
  });

  it('a costly composition hands the event loop back between its steps, its time the steps’ own (the fix round)', async () => {
    let handed = 0;
    const r = rig({
      handBack: () => {
        handed += 1;
        return Promise.resolve();
      }
    });
    // Each step of the page costs 3 fake ms: after two, the steps have held
    // main PAGE_SLICE_MS (4), and the reader hands the loop back.
    stepCost.ms = 3;
    const first = await served(r, 's1', ask(2900, 100, 3000));
    expect(first?.from).toBe(2900);
    expect(first?.rows.length).toBe(100);
    // 228 rows read and 100 built, a stop after every eight: 28 + 12 stops,
    // and the loop handed back at every second one.
    const stops = Math.floor(228 / PAGE_STEP_ROWS) + Math.floor(100 / PAGE_STEP_ROWS);
    expect(handed).toBe(Math.floor(stops / 2));
    expect(PAGE_SLICE_MS).toBe(4);
    // The duty cycle reads the steps' 3 ms each, not the waits between them.
    stepCost.ms = 0;
    const spent = 3 * (stops + 1);
    const second = page(r, 's1', ask(2800, 100, 3000));
    await vi.advanceTimersByTimeAsync(SCREEN_DUTY_FACTOR * spent - spent - 1);
    expect(second.answer).toBeNull();
    await vi.advanceTimersByTimeAsync(spent + 2);
    expect(second.answer?.from).toBe(2800);
    expect((r.rounds[1]?.at ?? 0) - (r.rounds[0]?.at ?? 0)).toBeGreaterThanOrEqual(SCREEN_DUTY_FACTOR * spent);
  });

  it('a cheap composition never hands the loop back, and the door stopping inside a costly one answers unreachable', async () => {
    let handed = 0;
    let stopping = false;
    const r = rig({
      handBack: () => {
        handed += 1;
        stopping = true;
        return Promise.resolve();
      }
    });
    expect((await served(r, 's1', ask(2900, 100, 3000)))?.rows.length).toBe(100);
    expect(handed).toBe(0);
    stepCost.ms = 5;
    const p = page(r, 's2', ask(2900, 100, 3000), () => stopping);
    await vi.advanceTimersByTimeAsync(0);
    expect(handed).toBe(1);
    expectAbsent(p.answer, 'unreachable', SCREEN_UNREACHABLE);
  });

  it('another session’s page waits for no floor of this one’s', async () => {
    const r = rig();
    await served(r, 's1', ask(2900, 100, 3000));
    expect((await served(r, 's2', ask(2900, 100, 3000)))?.from).toBe(2900);
  });
});

describe('the production rounds on this Mac', () => {
  const LINE = (h: number): string => ['%1', '120', '40', '0', '0', '1', '0', String(h)].join('\t');

  it('over the control client: display, capture -S a -E b, display, one command a line, written in one statement', async () => {
    const written: string[] = [];
    const ticks: number[] = [];
    let tick = 0;
    const control = {
      connected: true,
      sendCommand(command: string): Promise<string[]> {
        written.push(command);
        ticks.push(tick);
        if (command.startsWith('display-message')) return Promise.resolve([LINE(3000)]);
        return Promise.resolve(numbered(2772, 228));
      }
    };
    const sessions = [row('s1')];
    const core: ScreenCore = {
      listSessions: () => sessions,
      tmuxIdOf: () => '$7',
      manifest: { getSession: () => undefined },
      control,
      activity: { noteUserInput: () => undefined }
    };
    const scrollback = createScreenScrollback({ core: () => core, now: () => Date.now() });
    const out = scrollback.page(sessions[0] as Session, ask(2900, 100, 3000), () => false);
    tick += 1;
    await vi.advanceTimersByTimeAsync(0);
    const answer = await out;
    expect(written).toEqual([
      `display-message -p -t $7 '${SCREEN_FORMAT}'`,
      'capture-pane -p -e -t $7 -S -228 -E -1',
      `display-message -p -t $7 '${SCREEN_FORMAT}'`
    ]);
    expect(new Set(ticks)).toEqual(new Set([0]));
    expect(texts(answer)).toEqual(numbered(2900, 100));
    expect(spawned.calls).toEqual([]);
  });

  it('with the client down: ONE spawned list of the three, split by count from its first display', async () => {
    const control = { connected: false, sendCommand: (): Promise<string[]> => Promise.reject(new Error('down')) };
    const sessions = [row('s1')];
    const core: ScreenCore = {
      listSessions: () => sessions,
      tmuxIdOf: () => '$7',
      manifest: { getSession: () => undefined },
      control,
      activity: { noteUserInput: () => undefined }
    };
    // A captured row shaped like a display stands inside the capture: a row.
    const forged = LINE(5);
    spawned.answer = () => [LINE(3000), forged, ...numbered(2773, 227), LINE(3000), ''].join('\n');
    const scrollback = createScreenScrollback({ core: () => core, now: () => Date.now() });
    const out = scrollback.page(sessions[0] as Session, ask(2900, 100, 3000), () => false);
    await vi.advanceTimersByTimeAsync(0);
    const answer = await out;
    const display = ['display-message', '-p', '-t', '$7', SCREEN_FORMAT];
    expect(spawned.calls).toEqual([
      {
        args: [...display, ';', 'capture-pane', '-p', '-e', '-t', '$7', '-S', '-228', '-E', '-1', ';', ...display],
        options: { timeoutMs: SCREEN_LOCAL_READ_DEADLINE_MS }
      }
    ]);
    expect(texts(answer)).toEqual(numbered(2900, 100));
    // A count that does not hold is no round: three attempts, then `busy`.
    spawned.calls = [];
    spawned.answer = () => [LINE(3000), ...numbered(2772, 10), LINE(3000), ''].join('\n');
    const again = createScreenScrollback({ core: () => core, now: () => Date.now() });
    const busy = again.page(sessions[0] as Session, ask(2900, 100, 3000), () => false);
    await vi.advanceTimersByTimeAsync(0);
    expectAbsent(await busy, 'busy', SCROLLBACK_BUSY);
    expect(spawned.calls).toHaveLength(SCROLLBACK_ATTEMPTS);
  });
});

describe('what it never does (D15)', () => {
  it('logs nothing, reads no error’s text, sets no status and sizes nothing', () => {
    const text = readFileSync(join(__dirname, '..', 'scrollback.ts'), 'utf8');
    const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/\bconsole\.|\blog\(|\.message\b/);
    expect(code).not.toMatch(/noteUserInput|setStatus|noteHookEvent|\.status\s*=/);
    expect(code).not.toMatch(/resize-window|resize-pane|refresh-client|send-keys|copy-mode/);
    // Its verbs are the two reads, and its one format the screen's.
    expect([...code.matchAll(/'([a-z]+-[a-z]+)'/g)].map((m) => m[1]).sort()).toEqual(['capture-pane', 'display-message']);
    expect(code).not.toContain('#{');
  });
});
