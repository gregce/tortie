/**
 * The Screen's one watcher (Phase 337, build/p337/SPEC.md §5.3.2, D3, D4,
 * D13 to D15, D40; §Attack A6, A7, A8, A13), on fake timers and a fake core:
 * one read a tick however many polls; none with no poll; the duty cycle; the
 * hold answering `unchanged` at its bound and at once on a new revision; a
 * poll under `closing()` or at its hold's end answered within one tick WHILE
 * A READ NEVER SETTLES; one read in flight per session; the nudge and the
 * settle; the floor under a held poll and none under a stale one; the control
 * client down; a session on another machine out of reach; an ended row.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@shared/types';
import { SCREEN_ENDED, SCREEN_TOO_LARGE, SCREEN_UNREACHABLE } from '@shared/screen-copy';
import { createQuestionIds } from '../../reply/question-id';
import { plainOf, windowMarkOf } from '../compose';
import { readScreenLocal, type ScreenCore, type ScreenReading } from '../read';
import { row } from './session-row';
import {
  createScreenWatch,
  readingRevisionOf,
  SCREEN_HOLD_MS,
  SCREEN_LOCAL_READ_DEADLINE_MS,
  SCREEN_MIN_ANSWER_GAP_MS,
  SCREEN_NUDGE_MS,
  SCREEN_REMOTE_READ_DEADLINE_MS,
  SCREEN_SETTLE_MS,
  SCREEN_TICK_MS,
  SCREEN_TICK_REMOTE_MS,
  screenRevisionOf,
  type ScreenWatchDeps
} from '../watch';

/** What a composition costs, in fake ms: the duty cycle's test sets it. */
const cost = vi.hoisted(() => ({ ms: 0 }));

vi.mock('../compose', async (original) => {
  const real = await original<typeof import('../compose')>();
  return {
    ...real,
    composeScreen: (...args: Parameters<typeof real.composeScreen>) => {
      const answer = real.composeScreen(...args);
      if (cost.ms > 0) vi.setSystemTime(Date.now() + cost.ms);
      return answer;
    }
  };
});

function readingOf(text: string, cols = 20, rows = 3): ScreenReading {
  return {
    styled: text,
    display: { paneId: '%1', cols, rows, cursorX: 0, cursorY: 0, cursorVisible: true, alternate: false, history: 0 },
    displayLine: `%1\t${String(cols)}\t${String(rows)}\t0\t0\t1\t0\t0`,
    steady: true
  };
}

interface Harness {
  readonly watch: ReturnType<typeof createScreenWatch>;
  readonly sessions: Session[];
  readonly screens: Map<string, string>;
  readonly reads: { id: string; at: number }[];
  readonly turns: ReturnType<typeof createQuestionIds>;
  control: { connected: boolean };
  /** When set, a read answers this instead of the screen. */
  hold: ((id: string) => Promise<ScreenReading | null>) | null;
}

function harness(extra: Partial<ScreenWatchDeps> = {}): Harness {
  const sessions = [row('s1'), row('s2')];
  const screens = new Map<string, string>([
    ['s1', 'one'],
    ['s2', 'two']
  ]);
  const reads: { id: string; at: number }[] = [];
  const control = { connected: true, sendCommand: () => Promise.reject(new Error('unused')) };
  const core: ScreenCore = {
    listSessions: () => sessions,
    tmuxIdOf: (id) => (sessions.some((s) => s.id === id) ? `$${id.slice(1)}` : null),
    manifest: { getSession: () => undefined },
    control,
    activity: { noteUserInput: () => undefined }
  };
  const turns = createQuestionIds('0123456789abcdef');
  const h: Harness = {
    watch: null as unknown as ReturnType<typeof createScreenWatch>,
    sessions,
    screens,
    reads,
    turns,
    control,
    hold: null
  };
  const readLocal = (_core: ScreenCore, tmuxId: string): Promise<ScreenReading | null> => {
    const id = `s${tmuxId.slice(1)}`;
    reads.push({ id, at: Date.now() });
    if (h.hold !== null) return h.hold(id);
    return Promise.resolve(readingOf(screens.get(id) ?? ''));
  };
  (h as { watch: ReturnType<typeof createScreenWatch> }).watch = createScreenWatch({
    core: () => core,
    turns,
    readLocal,
    now: () => Date.now(),
    ...extra
  });
  return h;
}

/** A poll, and whether and when it was answered. */
function poll(h: Harness, id: string, since: string | null, closing: () => boolean = () => false) {
  const out: { answer: Awaited<ReturnType<Harness['watch']['answer']>> | null; at: number | null } = { answer: null, at: null };
  const session = h.sessions.find((s) => s.id === id) ?? row(id);
  void h.watch.answer(session, since, closing).then((a) => {
    out.answer = a;
    out.at = Date.now();
  });
  return out;
}

/** The revision a session answers now. */
async function revisionOf(h: Harness, id: string): Promise<string> {
  const p = poll(h, id, null);
  await vi.advanceTimersByTimeAsync(0);
  expect(p.answer).not.toBeNull();
  return p.answer?.revision ?? '';
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  cost.ms = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the constants hold the door’s bounds (Z10, Z19, Z21)', () => {
  it('the hold ends inside the door’s answer timer, two ticks inside its stop join, the settle after the nudge', () => {
    expect(SCREEN_HOLD_MS + SCREEN_TICK_MS).toBeLessThanOrEqual(15_000 - 2_000);
    expect(2 * SCREEN_TICK_MS).toBeLessThan(1_000);
    expect(SCREEN_LOCAL_READ_DEADLINE_MS).toBeLessThanOrEqual(SCREEN_REMOTE_READ_DEADLINE_MS);
    expect(SCREEN_SETTLE_MS).toBe(300);
    expect(SCREEN_SETTLE_MS).toBeGreaterThan(SCREEN_NUDGE_MS);
    expect(SCREEN_MIN_ANSWER_GAP_MS).toBe(250);
    expect(SCREEN_TICK_REMOTE_MS).toBe(400);
  });
});

describe('the answer at once', () => {
  it('a poll with no revision is answered at once with the screen and a 12-hex revision', async () => {
    const h = harness();
    const p = poll(h, 's1', null);
    await vi.advanceTimersByTimeAsync(0);
    expect(p.answer).toMatchObject({ sessionId: 's1', unchanged: false, why: null, sentence: null });
    expect(p.answer?.revision).toMatch(/^[0-9a-f]{12}$/);
    expect(p.answer?.screen?.lines[0]).toEqual([{ text: 'one', style: 0, cells: 3 }]);
    expect(p.answer?.screen?.turn).toBe(h.turns.current('s1').id);
  });

  it('a poll with a stale revision is answered at once', async () => {
    const h = harness();
    const p = poll(h, 's1', 'aaaaaaaaaaaa');
    await vi.advanceTimersByTimeAsync(0);
    expect(p.answer?.unchanged).toBe(false);
    expect(p.at).toBe(1_000_000);
  });
});

describe('the hold (D3)', () => {
  it('a current revision is held, and answered `unchanged` at the hold’s end, by SCREEN_HOLD_MS + SCREEN_TICK_MS', async () => {
    const h = harness();
    const rev = await revisionOf(h, 's1');
    const start = Date.now();
    const p = poll(h, 's1', rev);
    await vi.advanceTimersByTimeAsync(SCREEN_HOLD_MS - 1);
    expect(p.answer).toBeNull();
    await vi.advanceTimersByTimeAsync(SCREEN_TICK_MS + 1);
    expect(p.answer).toEqual({ sessionId: 's1', revision: rev, at: expect.any(Number), unchanged: true, screen: null, why: null, sentence: null });
    expect((p.at ?? Infinity) - start).toBeGreaterThanOrEqual(SCREEN_HOLD_MS);
    expect((p.at ?? Infinity) - start).toBeLessThanOrEqual(SCREEN_HOLD_MS + SCREEN_TICK_MS);
  });

  it('a held poll is answered the moment a read shows a new revision', async () => {
    const h = harness();
    const rev = await revisionOf(h, 's1');
    const p = poll(h, 's1', rev);
    await vi.advanceTimersByTimeAsync(600);
    expect(p.answer).toBeNull();
    h.screens.set('s1', 'moved');
    const changed = Date.now();
    await vi.advanceTimersByTimeAsync(SCREEN_TICK_MS + 1);
    expect(p.answer?.unchanged).toBe(false);
    expect(p.answer?.screen?.lines[0]).toEqual([{ text: 'moved', style: 0, cells: 5 }]);
    expect((p.at ?? Infinity) - changed).toBeLessThanOrEqual(SCREEN_TICK_MS);
  });

  it('the revision moves with the question id, and is the same for the same screen', async () => {
    const h = harness();
    const a = await revisionOf(h, 's1');
    const b = await revisionOf(h, 's1');
    expect(b).toBe(a);
    h.turns.bump('s1', 'desk');
    // A poll within a tick of the last read is answered from it, as a live entry's would be.
    await vi.advanceTimersByTimeAsync(SCREEN_TICK_MS + 1);
    expect(await revisionOf(h, 's1')).not.toBe(a);
    expect(readingRevisionOf('s1', readingOf('x'), 't', false, true)).not.toBe(readingRevisionOf('s1', readingOf('y'), 't', false, true));
    expect(readingRevisionOf('s1', readingOf('x'), 't', false, true)).not.toBe(readingRevisionOf('s1', readingOf('x'), 't', true, true));
    expect(readingRevisionOf('s1', readingOf('x'), 't', false, true)).not.toBe(readingRevisionOf('s2', readingOf('x'), 't', false, true));
    expect(screenRevisionOf(['ab', 'c'])).not.toBe(screenRevisionOf(['a', 'bc']));
  });
});

describe('one reader per session (D4, D15, Z16)', () => {
  it('reads once a tick however many polls wait', async () => {
    const h = harness();
    const rev = await revisionOf(h, 's1');
    h.reads.length = 0;
    const polls = [poll(h, 's1', rev), poll(h, 's1', rev), poll(h, 's1', rev)];
    await vi.advanceTimersByTimeAsync(1_000);
    expect(polls.every((p) => p.answer === null)).toBe(true);
    expect(h.reads.length).toBeGreaterThanOrEqual(9);
    expect(h.reads.length).toBeLessThanOrEqual(11);
    // and every waiting poll is answered from the one reading
    h.screens.set('s1', 'moved');
    await vi.advanceTimersByTimeAsync(SCREEN_TICK_MS + 1);
    expect(new Set(polls.map((p) => p.answer?.revision)).size).toBe(1);
    expect(polls.every((p) => p.answer?.unchanged === false)).toBe(true);
  });

  it('reads nothing for a session nobody waits on', async () => {
    const h = harness();
    await revisionOf(h, 's1');
    const after = h.reads.length;
    await vi.advanceTimersByTimeAsync(5_000);
    expect(h.reads.length).toBe(after);
  });

  it('two sessions are read apart, each once a tick', async () => {
    const h = harness();
    const r1 = await revisionOf(h, 's1');
    const r2 = await revisionOf(h, 's2');
    h.reads.length = 0;
    poll(h, 's1', r1);
    poll(h, 's2', r2);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(h.reads.filter((r) => r.id === 's1').length).toBeLessThanOrEqual(11);
    expect(h.reads.filter((r) => r.id === 's2').length).toBeLessThanOrEqual(11);
    expect(h.reads.filter((r) => r.id === 's2').length).toBeGreaterThanOrEqual(9);
  });

  it('THE DUTY CYCLE: after a read that composed, the next is not before 4 × the composition', async () => {
    const h = harness();
    cost.ms = 60;
    let n = 0;
    h.hold = (id) => Promise.resolve(readingOf(`${id}-${String((n += 1))}`));
    const p = poll(h, 's1', 'aaaaaaaaaaaa');
    await vi.advanceTimersByTimeAsync(0);
    expect(p.answer).not.toBeNull();
    const rev = p.answer?.revision ?? '';
    h.reads.length = 0;
    const held = poll(h, 's1', rev);
    await vi.advanceTimersByTimeAsync(1_200);
    // 60 ms a composition: a read every 240 ms, not every 100.
    expect(h.reads.length).toBeLessThanOrEqual(6);
    const gaps = h.reads.slice(1).map((r, i) => r.at - (h.reads[i]?.at ?? 0));
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(4 * 60);
    void held;
  });

  it('THE DUTY CYCLE survives a poll answered and a new one: an entry made again does not read early', async () => {
    const h = harness();
    cost.ms = 60;
    let n = 0;
    h.hold = (id) => Promise.resolve(readingOf(`${id}-${String((n += 1))}`));
    const first = poll(h, 's1', null);
    await vi.advanceTimersByTimeAsync(0);
    expect(first.answer).not.toBeNull();
    const readAt = h.reads[0]?.at ?? 0;
    // The phone's next poll, held on the revision it was just handed: a new entry.
    const second = poll(h, 's1', first.answer?.revision ?? '');
    await vi.advanceTimersByTimeAsync(0);
    expect(h.reads).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(300);
    expect(h.reads.length).toBe(2);
    expect((h.reads[1]?.at ?? 0) - readAt).toBeGreaterThanOrEqual(4 * 60);
    await vi.advanceTimersByTimeAsync(300);
    expect(second.answer).not.toBeNull();
  });
});

describe('a poll is answered from its own timer and never awaits a read (D3, §Attack A7)', () => {
  it('under closing(), within one tick, while a read never settles', async () => {
    const h = harness();
    const rev = await revisionOf(h, 's1');
    h.hold = () => new Promise<ScreenReading | null>(() => undefined);
    let closing = false;
    const p = poll(h, 's1', rev, () => closing);
    await vi.advanceTimersByTimeAsync(500);
    expect(p.answer).toBeNull();
    closing = true;
    const at = Date.now();
    await vi.advanceTimersByTimeAsync(SCREEN_TICK_MS);
    expect(p.answer?.unchanged).toBe(true);
    expect((p.at ?? Infinity) - at).toBeLessThanOrEqual(SCREEN_TICK_MS);
  });

  it('at the hold’s end, while a read never settles, and with ONE read in flight the whole time', async () => {
    const h = harness();
    const rev = await revisionOf(h, 's1');
    h.hold = () => new Promise<ScreenReading | null>(() => undefined);
    h.reads.length = 0;
    const start = Date.now();
    const p = poll(h, 's1', rev);
    await vi.advanceTimersByTimeAsync(SCREEN_HOLD_MS + SCREEN_TICK_MS);
    expect(p.answer?.unchanged).toBe(true);
    expect((p.at ?? Infinity) - start).toBeLessThanOrEqual(SCREEN_HOLD_MS + SCREEN_TICK_MS);
    expect(h.reads).toHaveLength(1);
  });

  it('a poll under closing() that has no reading at all answers, and says the machine cannot be reached', async () => {
    const h = harness();
    h.hold = () => new Promise<ScreenReading | null>(() => undefined);
    let closing = false;
    const p = poll(h, 's1', null, () => closing);
    await vi.advanceTimersByTimeAsync(300);
    closing = true;
    await vi.advanceTimersByTimeAsync(SCREEN_TICK_MS);
    expect(p.answer).toMatchObject({ unchanged: false, screen: null, why: 'unreachable', sentence: SCREEN_UNREACHABLE });
  });
});

describe('one read in flight per session, and the deadline (D3, §Attack A7)', () => {
  it('a remote read held 1.9 s at a 400 ms tick starts no second read', async () => {
    const remote: string[] = [];
    let n = 0;
    const h = harness({
      readRemote: (id) => {
        remote.push(id);
        n += 1;
        const text = `far-${String(n)}`;
        return new Promise((resolve) => setTimeout(() => resolve(readingOf(text)), 1_900));
      }
    });
    h.sessions[0] = row('s1', { machine: { id: 'm1' } as unknown as Session['machine'] });
    const p = poll(h, 's1', null);
    await vi.advanceTimersByTimeAsync(1_800);
    expect(remote).toHaveLength(1);
    expect(p.answer).toBeNull();
    await vi.advanceTimersByTimeAsync(200);
    expect(p.answer?.screen?.lines[0]?.[0]?.text).toBe('far-1');
  });

  it('a read past its deadline counts as not read, and keeps the slot until it settles', async () => {
    const h = harness();
    const rev = await revisionOf(h, 's1');
    h.hold = () => new Promise((resolve) => setTimeout(() => resolve(readingOf('late')), 1_500));
    h.reads.length = 0;
    const p = poll(h, 's1', rev);
    await vi.advanceTimersByTimeAsync(1_400);
    // The read past its deadline was not taken, and no second read started while it was out.
    expect(h.reads).toHaveLength(1);
    expect(p.answer).toBeNull();
    h.hold = null;
    h.screens.set('s1', 'fresh');
    await vi.advanceTimersByTimeAsync(300);
    expect(h.reads.length).toBeGreaterThanOrEqual(2);
    expect(p.answer?.screen?.lines[0]?.[0]?.text).toBe('fresh');
  });
});

describe('the nudge and the settle (D4, §Attack A6)', () => {
  it('the nudged session is read SCREEN_NUDGE_MS later, not a tick later', async () => {
    const h = harness();
    const rev = await revisionOf(h, 's1');
    poll(h, 's1', rev);
    await vi.advanceTimersByTimeAsync(50);
    h.reads.length = 0;
    const at = Date.now();
    h.watch.nudge('s1', windowMarkOf('one'));
    await vi.advanceTimersByTimeAsync(SCREEN_NUDGE_MS);
    expect(h.reads.map((r) => r.at - at)).toEqual([SCREEN_NUDGE_MS]);
  });

  it('a nudge whose reads show the same window and a moved turn answers NOTHING, held or stale, until 300 ms', async () => {
    const h = harness();
    const rev = await revisionOf(h, 's1');
    const held = poll(h, 's1', rev);
    await vi.advanceTimersByTimeAsync(400);
    // The keys act: the question id moves, then the nudge with the act's window mark.
    h.turns.bump('s1', 'phone');
    const at = Date.now();
    h.watch.nudge('s1', windowMarkOf(plainOf(readingOf('one'))));
    const stale = poll(h, 's1', rev);
    await vi.advanceTimersByTimeAsync(SCREEN_SETTLE_MS - 1);
    expect(held.answer).toBeNull();
    expect(stale.answer).toBeNull();
    await vi.advanceTimersByTimeAsync(SCREEN_TICK_MS + 1);
    expect(held.answer?.unchanged).toBe(false);
    expect(stale.answer?.revision).toBe(held.answer?.revision);
    expect(held.answer?.screen?.turn).toBe(h.turns.current('s1').id);
    expect((held.at ?? 0) - at).toBeGreaterThanOrEqual(SCREEN_SETTLE_MS);
  });

  it('the first read after the nudge whose window moved ends the settle at once, floor or no floor', async () => {
    const h = harness();
    const rev = await revisionOf(h, 's1');
    const held = poll(h, 's1', rev);
    await vi.advanceTimersByTimeAsync(10);
    h.turns.bump('s1', 'phone');
    const at = Date.now();
    h.watch.nudge('s1', windowMarkOf('one'));
    await vi.advanceTimersByTimeAsync(100);
    expect(held.answer).toBeNull();
    h.screens.set('s1', 'one, redrawn');
    await vi.advanceTimersByTimeAsync(SCREEN_TICK_MS + 1);
    expect(held.answer?.screen?.lines[0]?.[0]?.text).toBe('one, redrawn');
    // The settle's answer went before the held poll's 250 ms floor would have let it.
    expect((held.at ?? Infinity) - at).toBeLessThan(SCREEN_SETTLE_MS);
  });

  it('a read in flight when the nudge came does not end the settle, whatever it shows', async () => {
    const h = harness();
    const rev = await revisionOf(h, 's1');
    const held = poll(h, 's1', rev);
    await vi.advanceTimersByTimeAsync(400);
    let release: (r: ScreenReading) => void = () => undefined;
    h.hold = () =>
      new Promise((resolve) => {
        release = resolve;
      });
    await vi.advanceTimersByTimeAsync(SCREEN_TICK_MS);
    h.hold = null;
    h.turns.bump('s1', 'phone');
    h.watch.nudge('s1', windowMarkOf('one'));
    release(readingOf('drawn before the act'));
    await vi.advanceTimersByTimeAsync(SCREEN_NUDGE_MS + 5);
    expect(held.answer).toBeNull();
  });

  it('a read still out when the nudge came does not make the first read after it a whole tick late', async () => {
    const h = harness();
    const rev = await revisionOf(h, 's1');
    poll(h, 's1', rev);
    await vi.advanceTimersByTimeAsync(400);
    let release: (r: ScreenReading) => void = () => undefined;
    h.hold = () =>
      new Promise((resolve) => {
        release = resolve;
      });
    await vi.advanceTimersByTimeAsync(SCREEN_TICK_MS);
    h.hold = null;
    h.reads.length = 0;
    const at = Date.now();
    h.watch.nudge('s1', windowMarkOf('one'));
    await vi.advanceTimersByTimeAsync(40);
    release(readingOf('one'));
    await vi.advanceTimersByTimeAsync(SCREEN_TICK_MS);
    expect(h.reads.length).toBeGreaterThanOrEqual(1);
    expect((h.reads[0]?.at ?? Infinity) - at).toBeLessThanOrEqual(40 + SCREEN_NUDGE_MS);
  });

  it('a poll arriving after the nudge with no entry still waits for the redraw', async () => {
    const h = harness();
    const rev = await revisionOf(h, 's1');
    h.turns.bump('s1', 'phone');
    const at = Date.now();
    h.watch.nudge('s1', windowMarkOf('one'));
    h.reads.length = 0;
    const late = poll(h, 's1', rev);
    await vi.advanceTimersByTimeAsync(SCREEN_NUDGE_MS - 1);
    expect(h.reads).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(200);
    expect(late.answer).toBeNull();
    await vi.advanceTimersByTimeAsync(200);
    expect(late.answer?.unchanged).toBe(false);
    expect((late.at ?? 0) - at).toBeGreaterThanOrEqual(SCREEN_SETTLE_MS);
  });
});

describe('the floor between answers (D40, §Attack A13)', () => {
  it('a held poll is answered no sooner than 250 ms after it arrived; a stale one at once', async () => {
    const h = harness();
    const rev = await revisionOf(h, 's1');
    const arrived = Date.now();
    const held = poll(h, 's1', rev);
    await vi.advanceTimersByTimeAsync(20);
    h.screens.set('s1', 'spinner');
    await vi.advanceTimersByTimeAsync(SCREEN_TICK_MS);
    expect(held.answer).toBeNull();
    // A second phone's poll with the old revision is not held for the first's floor.
    const stale = poll(h, 's1', rev);
    await vi.advanceTimersByTimeAsync(0);
    expect(stale.answer?.screen?.lines[0]?.[0]?.text).toBe('spinner');
    await vi.advanceTimersByTimeAsync(SCREEN_MIN_ANSWER_GAP_MS);
    expect(held.answer?.screen?.lines[0]?.[0]?.text).toBe('spinner');
    expect((held.at ?? 0) - arrived).toBeGreaterThanOrEqual(SCREEN_MIN_ANSWER_GAP_MS);
    expect((held.at ?? 0) - arrived).toBeLessThanOrEqual(SCREEN_MIN_ANSWER_GAP_MS + SCREEN_TICK_MS);
  });

  it('a screen that changes every tick is answered about four times a second to one phone, not ten', async () => {
    const h = harness();
    let n = 0;
    h.hold = (id) => Promise.resolve(readingOf(`${id}-${String((n += 1))}`));
    let since: string | null = null;
    let answers = 0;
    const start = Date.now();
    while (Date.now() - start < 2_000) {
      const p = poll(h, 's1', since);
      while (p.answer === null) await vi.advanceTimersByTimeAsync(10);
      since = p.answer.revision;
      answers += 1;
    }
    expect(answers).toBeLessThanOrEqual(10);
    expect(answers).toBeGreaterThanOrEqual(6);
  });
});

describe('the cadence (§Attack A8)', () => {
  it('with the control client down a session is read every 400 ms, one spawn a read', async () => {
    const spawns: (readonly string[])[] = [];
    const h = harness({
      readLocal: (core, tmuxId) =>
        readScreenLocal(core, tmuxId, {
          spawn: (args) => {
            spawns.push(args);
            const line = '%1\t80\t3\t0\t0\t1\t0\t0';
            return Promise.resolve(`${line}\n${line}\nrow\nrow\n${line}\n`);
          }
        })
    });
    h.control.connected = false;
    const first = poll(h, 's1', null);
    await vi.advanceTimersByTimeAsync(0);
    // The capture's first row is shaped like a display, and is drawn as the row it is.
    expect((first.answer?.screen?.lines[0] ?? []).map((run) => run.text).join('')).toBe('%1\t80\t3\t0\t0\t1\t0\t0');
    expect(spawns).toHaveLength(1);
    const rev = first.answer?.revision ?? '';
    spawns.length = 0;
    poll(h, 's1', rev);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(spawns.length).toBeGreaterThanOrEqual(4);
    expect(spawns.length).toBeLessThanOrEqual(6);
  });

  it('a session on another machine is read every 400 ms with the control client UP and reads that settle at once (D3)', async () => {
    // The fix round of 2026-10-06 (lens 1's ablation V16): reading remote
    // rows at the local tick left every gate green, because the one remote
    // test held its read 1.9 s and so read once whatever the tick was. Here
    // every far read answers at once, so only the cadence spaces them.
    const at: number[] = [];
    const h = harness({
      readRemote: () => {
        at.push(Date.now());
        return Promise.resolve(readingOf('far-same'));
      }
    });
    h.sessions[0] = row('s1', { machine: { id: 'm1' } as unknown as Session['machine'] });
    h.control.connected = true;
    const first = poll(h, 's1', null);
    await vi.advanceTimersByTimeAsync(0);
    expect(first.answer?.screen?.lines[0]?.[0]?.text).toBe('far-same');
    at.length = 0;
    poll(h, 's1', first.answer?.revision ?? '');
    await vi.advanceTimersByTimeAsync(4_000);
    // Ten reads in 4 s at 400 ms, never the forty a 100 ms tick would make.
    expect(at.length).toBeGreaterThanOrEqual(9);
    expect(at.length).toBeLessThanOrEqual(11);
    for (let i = 1; i < at.length; i += 1) expect((at[i] ?? 0) - (at[i - 1] ?? 0)).toBeGreaterThanOrEqual(SCREEN_TICK_REMOTE_MS);
    // The local row beside it, same client, is read at the local tick.
    const local = await revisionOf(h, 's2');
    h.reads.length = 0;
    poll(h, 's2', local);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(h.reads.filter((r) => r.id === 's2').length).toBeGreaterThanOrEqual(9);
  });
});

describe('the absences', () => {
  it('a session on another machine out of reach answers `unreachable`, and that revision is held', async () => {
    const h = harness({ readRemote: () => Promise.resolve('unreachable' as const) });
    h.sessions[0] = row('s1', { machine: { id: 'm1' } as unknown as Session['machine'] });
    const p = poll(h, 's1', null);
    await vi.advanceTimersByTimeAsync(0);
    expect(p.answer).toMatchObject({ unchanged: false, screen: null, why: 'unreachable', sentence: SCREEN_UNREACHABLE });
    const held = poll(h, 's1', p.answer?.revision ?? '');
    await vi.advanceTimersByTimeAsync(5_000);
    expect(held.answer).toBeNull();
  });

  it('a row that is not running answers `ended` at once and reads nothing; its revision is held, not looped', async () => {
    const h = harness();
    h.sessions[0] = row('s1', { status: 'exited' });
    h.reads.length = 0;
    const p = poll(h, 's1', null);
    await vi.advanceTimersByTimeAsync(0);
    expect(p.answer).toMatchObject({ unchanged: false, screen: null, why: 'ended', sentence: SCREEN_ENDED });
    expect(h.reads).toHaveLength(0);
    const again = poll(h, 's1', p.answer?.revision ?? '');
    await vi.advanceTimersByTimeAsync(SCREEN_HOLD_MS - 10);
    expect(again.answer).toBeNull();
    await vi.advanceTimersByTimeAsync(SCREEN_TICK_MS + 10);
    expect(again.answer?.unchanged).toBe(true);
    expect(h.reads).toHaveLength(0);
  });

  it('a row that ends while held is answered `ended` at the next tick', async () => {
    const h = harness();
    const rev = await revisionOf(h, 's1');
    const p = poll(h, 's1', rev);
    await vi.advanceTimersByTimeAsync(500);
    h.sessions[0] = row('s1', { status: 'restorable' });
    await vi.advanceTimersByTimeAsync(SCREEN_TICK_MS + 1);
    expect(p.answer?.why).toBe('ended');
  });

  it('a live row with no reading at all by the hold’s end answers `unreachable`', async () => {
    const h = harness();
    h.hold = () => Promise.resolve(null);
    const p = poll(h, 's1', null);
    await vi.advanceTimersByTimeAsync(SCREEN_HOLD_MS + SCREEN_TICK_MS);
    expect(p.answer).toMatchObject({ why: 'unreachable', sentence: SCREEN_UNREACHABLE });
  });

  it('a screen over a cap answers `large`', async () => {
    const h = harness();
    h.hold = () => Promise.resolve(readingOf('x', 513, 3));
    const p = poll(h, 's1', null);
    await vi.advanceTimersByTimeAsync(0);
    expect(p.answer).toMatchObject({ screen: null, why: 'large', sentence: SCREEN_TOO_LARGE });
  });
});

describe('readFresh: one fresh reading, never cached', () => {
  it('reads every time it is asked, on this Mac and on another machine', async () => {
    const remote: string[] = [];
    const h = harness({
      readRemote: (id) => {
        remote.push(id);
        return Promise.resolve(readingOf('far'));
      }
    });
    // A watcher's reading in hand does not stand in for a fresh one.
    await revisionOf(h, 's1');
    h.reads.length = 0;
    h.screens.set('s1', 'now');
    expect((await h.watch.readFresh(row('s1'))) as ScreenReading).toEqual(readingOf('now'));
    await h.watch.readFresh(row('s1'));
    expect(h.reads).toHaveLength(2);
    expect(await h.watch.readFresh(row('s2', { machine: { id: 'm1' } as unknown as Session['machine'] }))).toEqual(readingOf('far'));
    expect(remote).toEqual(['s2']);
  });

  it('null for a session with no $-id, null past the local deadline, unreachable past the remote one', async () => {
    const h = harness({ readRemote: () => new Promise(() => undefined) });
    expect(await h.watch.readFresh(row('nobody'))).toBeNull();
    h.hold = () => new Promise(() => undefined);
    const local = h.watch.readFresh(row('s1'));
    await vi.advanceTimersByTimeAsync(SCREEN_LOCAL_READ_DEADLINE_MS);
    expect(await local).toBeNull();
    const far = h.watch.readFresh(row('s2', { machine: { id: 'm1' } as unknown as Session['machine'] }));
    await vi.advanceTimersByTimeAsync(SCREEN_REMOTE_READ_DEADLINE_MS);
    expect(await far).toBe('unreachable');
  });
});
