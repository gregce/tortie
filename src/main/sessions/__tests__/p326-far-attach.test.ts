/**
 * Phase 326 — an attach to a session on another machine waits for that
 * machine, bounded, and never asks this Mac.
 *
 * WHAT WAS WRONG. A session created alone in a remote tab was attached before
 * its far `@gmux-id` stamp landed. No feed row held it yet, so the attach fell
 * through to the LOCAL branch, listed this Mac's tmux server, and refused with
 * "This session is no longer running." over a session that was running.
 *
 * WHAT IS UNDER TEST. `awaitFarBinding`, the whole policy, one case per turn of
 * the loop in build/p326/SPEC.md D4, over fake dependencies and vitest's fake
 * clock, so a 7,000 ms budget is spent in no wall time and every case can say
 * exactly WHEN it answered. Then `AttachTickets`, `farBindingRefusal`, and the
 * two dependencies `defaultFarAttachDeps` builds itself rather than delegating
 * (the announce wait and the readiness question), over a stubbed machine layer.
 *
 * Every case also asserts that no timer is left behind, because a wait that
 * leaks a timer per attach is how a quit gets held.
 */

import type { SessionStatus } from '@shared/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  FarAttachDeps,
  FarBinding,
  RemoteSessionRow
} from '../far-attach';

/** The machine layer's announce and readiness, stubbed for the wiring cases. */
const machine = vi.hoisted(() => ({
  listeners: new Set<() => void>(),
  subscribed: 0,
  ready: new Set<string>()
}));

vi.mock('../../machines/remote-sessions', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../machines/remote-sessions')
  >();
  return {
    ...actual,
    onRemoteSessionsChanged: (listener: () => void): (() => void) => {
      machine.subscribed += 1;
      machine.listeners.add(listener);
      return () => {
        machine.listeners.delete(listener);
      };
    },
    readyRemoteContext: (machineId: string): unknown => {
      if (!machine.ready.has(machineId)) {
        throw new Error(`${machineId} is not ready`);
      }
      return { kind: 'remote', machineId };
    }
  };
});

const {
  ANNOUNCE_RECHECK_MS,
  AttachTickets,
  REMOTE_ATTACH_BIND_WAIT_MS,
  awaitFarBinding,
  defaultFarAttachDeps,
  farBindingRefusal
} = await import('../far-attach');
const { ATTACH_NOT_HEARD, MACHINE_NOT_READY } = await import(
  '../../machines/remote-copy'
);

type Settle = 'settled' | 'none' | 'timeout' | 'aborted';

const ID = 'far-1';
const MACHINE = 'studio';

function feedRow(over?: Partial<RemoteSessionRow>): RemoteSessionRow {
  return {
    id: ID,
    machineId: MACHINE,
    tmuxId: '$7',
    tmuxName: 'far-one',
    name: 'far one',
    agent: 'shell',
    projectPath: '/srv/repo',
    cwd: '/srv/repo',
    createdAt: 1,
    activityAt: 1,
    status: 'running',
    movedAt: 0,
    ...over
  };
}

/**
 * One far machine and one session on it, as the dependencies see them. Every
 * field is what a case sets; every list is what the loop asked.
 */
interface World {
  row: RemoteSessionRow | null;
  record: boolean;
  status: SessionStatus | null;
  known: boolean;
  flight: boolean;
  ready: boolean;
  /** When the last list that COMPLETED was asked, or null. */
  completedAt: number | null;
  /** What the machine does when it is asked a list. */
  onPoll: (issuedAt: number) => Promise<void>;
  /** Every question the loop asked, in order. */
  asked: string[];
  /** Ends the flight, as the create's `finally` does. */
  endFlight(): void;
  /** Fires one remote announce. */
  announce(): void;
}

function world(over?: Partial<World>): { w: World; deps: FarAttachDeps } {
  const settlers = new Set<(s: Settle) => void>();
  const announcers = new Set<() => void>();
  const w: World = {
    row: null,
    record: true,
    status: 'unknown',
    known: true,
    flight: false,
    ready: false,
    completedAt: null,
    onPoll: () => Promise.resolve(),
    asked: [],
    endFlight(): void {
      w.flight = false;
      for (const one of [...settlers]) one('settled');
    },
    announce(): void {
      for (const one of [...announcers]) one();
    },
    ...over
  };
  const deps: FarAttachDeps = {
    row: () => {
      w.asked.push('row');
      return w.row;
    },
    recordExists: () => {
      w.asked.push('record');
      return w.record;
    },
    projectedStatus: () => {
      w.asked.push('status');
      return w.status;
    },
    machineKnown: () => {
      w.asked.push('known');
      return w.known;
    },
    inFlight: () => {
      w.asked.push('inFlight');
      return w.flight;
    },
    settled: (_id, ms, signal) => {
      w.asked.push(`settled:${String(ms)}`);
      return new Promise<Settle>((resolve) => {
        const timer = setTimeout(() => finish('timeout'), ms);
        const onAbort = (): void => finish('aborted');
        const finish = (s: Settle): void => {
          clearTimeout(timer);
          settlers.delete(finish);
          signal.removeEventListener('abort', onAbort);
          resolve(s);
        };
        settlers.add(finish);
        signal.addEventListener('abort', onAbort);
      });
    },
    contextReady: () => {
      w.asked.push('ready');
      return w.ready;
    },
    poll: () => {
      w.asked.push('poll');
      return w.onPoll(Date.now());
    },
    listCompletedSince: (_m, at) => {
      w.asked.push('completed');
      return w.completedAt !== null && w.completedAt >= at;
    },
    nextAnnounce: (ms, signal) => {
      w.asked.push(`announce:${String(ms)}`);
      return new Promise<void>((resolve) => {
        const timer = setTimeout(() => finish(), ms);
        const finish = (): void => {
          clearTimeout(timer);
          announcers.delete(finish);
          signal.removeEventListener('abort', finish);
          resolve();
        };
        announcers.add(finish);
        signal.addEventListener('abort', finish);
      });
    },
    now: () => Date.now()
  };
  return { w, deps };
}

/** A machine that answers a list after `ms`, having done `then` to the world. */
function answersAfter(w: World, ms: number, then: () => void) {
  return (issuedAt: number): Promise<void> =>
    new Promise<void>((resolve) => {
      setTimeout(() => {
        then();
        w.completedAt = issuedAt;
        resolve();
      }, ms);
    });
}

interface Run {
  settledAt: number | null;
  verdict: FarBinding | null;
}

/** Start the wait and record when it answered, on the fake clock. */
function start(
  deps: FarAttachDeps,
  opts?: { live?: () => boolean; signal?: AbortSignal }
): { run: Run; done: Promise<FarBinding>; startedAt: number } {
  const startedAt = Date.now();
  const run: Run = { settledAt: null, verdict: null };
  const done = awaitFarBinding(deps, {
    sessionId: ID,
    machineId: MACHINE,
    budgetMs: REMOTE_ATTACH_BIND_WAIT_MS,
    live: opts?.live ?? (() => true),
    signal: opts?.signal ?? new AbortController().signal
  }).then((verdict) => {
    run.settledAt = Date.now() - startedAt;
    run.verdict = verdict;
    return verdict;
  });
  return { run, done, startedAt };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  machine.listeners.clear();
  machine.subscribed = 0;
  machine.ready.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the budget', () => {
  it('is 7,000 ms, never above the quit join, and a quiet turn is 500 ms', () => {
    expect(REMOTE_ATTACH_BIND_WAIT_MS).toBe(7_000);
    expect(REMOTE_ATTACH_BIND_WAIT_MS).toBeLessThanOrEqual(10_000);
    expect(ANNOUNCE_RECHECK_MS).toBe(500);
  });
});

describe('awaitFarBinding, one turn of the loop at a time', () => {
  it('1. a feed row answers at once, and nothing else is asked', async () => {
    const { w, deps } = world({ row: feedRow() });
    const { run, done } = start(deps);
    await done;
    expect(run.verdict).toEqual({ kind: 'row', row: feedRow() });
    expect(run.settledAt).toBe(0);
    expect(w.asked).toEqual(['known', 'row']);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('2. a running create is waited for, then its row answers, with no list asked', async () => {
    const { w, deps } = world({ flight: true });
    const { run } = start(deps);
    await vi.advanceTimersByTimeAsync(1_200);
    expect(run.verdict).toBeNull();
    expect(w.asked).toContain(`settled:${String(REMOTE_ATTACH_BIND_WAIT_MS)}`);
    // The create lists its own session and then ends its flight.
    w.row = feedRow();
    w.endFlight();
    await vi.advanceTimersByTimeAsync(0);
    expect(run.verdict).toEqual({ kind: 'row', row: feedRow() });
    expect(run.settledAt).toBe(1_200);
    expect(w.asked).not.toContain('poll');
    expect(w.asked).not.toContain('ready');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('2. a create that outlives the budget answers unanswered AT the budget, asking no list', async () => {
    const { w, deps } = world({ flight: true, ready: true });
    const { run } = start(deps);
    await vi.advanceTimersByTimeAsync(REMOTE_ATTACH_BIND_WAIT_MS - 1);
    expect(run.verdict).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(run.verdict?.kind).toBe('unanswered');
    expect(run.settledAt).toBe(REMOTE_ATTACH_BIND_WAIT_MS);
    expect(w.asked).not.toContain('poll');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('3. a create that took its record back answers absent, once it has ended', async () => {
    const { w, deps } = world({ flight: true, ready: true });
    const { run } = start(deps);
    await vi.advanceTimersByTimeAsync(300);
    w.record = false;
    w.endFlight();
    await vi.advanceTimersByTimeAsync(0);
    expect(run.verdict).toEqual({ kind: 'absent', why: 'no record of it remains' });
    expect(run.settledAt).toBe(300);
    expect(w.asked).not.toContain('poll');
  });

  it('3. no record at all answers absent at once', async () => {
    const { w, deps } = world({ record: false, ready: true });
    const { run, done } = start(deps);
    await done;
    expect(run.verdict?.kind).toBe('absent');
    expect(run.settledAt).toBe(0);
    expect(w.asked).not.toContain('poll');
  });

  it('4. its own list proving the record restorable answers absent', async () => {
    const made = world({ ready: true });
    const w = made.w;
    w.onPoll = answersAfter(w, 80, () => {
      w.status = 'restorable';
    });
    const { run } = start(made.deps);
    await vi.advanceTimersByTimeAsync(80);
    expect(run.verdict).toEqual({
      kind: 'absent',
      why: 'a list asked after the attach did not hold it (restorable)'
    });
    expect(run.settledAt).toBe(80);
    expect(w.asked.filter((one) => one === 'poll')).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('4. its own list proving the record exited answers absent', async () => {
    const made = world({ ready: true });
    const w = made.w;
    w.onPoll = answersAfter(w, 40, () => {
      w.status = 'exited';
    });
    const { run } = start(made.deps);
    await vi.advanceTimersByTimeAsync(40);
    expect(run.verdict?.kind).toBe('absent');
  });

  it('4. its own list listing the session answers row', async () => {
    const made = world({ ready: true });
    const w = made.w;
    w.onPoll = answersAfter(w, 60, () => {
      w.row = feedRow({ tmuxId: '$9' });
    });
    const { run } = start(made.deps);
    await vi.advanceTimersByTimeAsync(60);
    expect(run.verdict).toEqual({ kind: 'row', row: feedRow({ tmuxId: '$9' }) });
  });

  it('4. its own list completing while the record still reads unknown answers unanswered, asking once', async () => {
    const made = world({ ready: true, status: 'unknown' });
    const w = made.w;
    w.onPoll = answersAfter(w, 50, () => undefined);
    const { run } = start(made.deps);
    await vi.advanceTimersByTimeAsync(50);
    expect(run.verdict?.kind).toBe('unanswered');
    expect(run.settledAt).toBe(50);
    expect(w.asked.filter((one) => one === 'poll')).toHaveLength(1);
  });

  it('4. a restorable reading from a list asked BEFORE the attach is not absence', async () => {
    // The feed's own list answered before this attach asked its own, and its own
    // list failed: nothing asked after the attach has spoken, so it may not say
    // absent, whatever the record projects.
    const made = world({ ready: true, status: 'restorable', completedAt: 999_000 });
    const w = made.w;
    w.onPoll = () => Promise.reject(new Error('link dropped'));
    const { run } = start(made.deps);
    await vi.advanceTimersByTimeAsync(0);
    expect(run.verdict).toEqual({
      kind: 'unanswered',
      why: 'no list asked after the attach answered in time'
    });
  });

  it('4. its own list failing answers unanswered, and the failure is not thrown', async () => {
    const made = world({ ready: true });
    made.w.onPoll = () => Promise.reject(new Error('ssh: connection refused'));
    const { run } = start(made.deps);
    await vi.advanceTimersByTimeAsync(0);
    expect(run.verdict?.kind).toBe('unanswered');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('5 and 6. a list that never answers is bounded by the budget left', async () => {
    const made = world({ ready: true });
    made.w.onPoll = () => new Promise<void>(() => undefined);
    const { run } = start(made.deps);
    await vi.advanceTimersByTimeAsync(REMOTE_ATTACH_BIND_WAIT_MS - 1);
    expect(run.verdict).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(run.verdict?.kind).toBe('unanswered');
    expect(run.settledAt).toBe(REMOTE_ATTACH_BIND_WAIT_MS);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('5. the budget runs from the ask, so a create that ends late leaves only the rest for the list', async () => {
    const made = world({ flight: true, ready: true });
    made.w.onPoll = () => new Promise<void>(() => undefined);
    const { run } = start(made.deps);
    await vi.advanceTimersByTimeAsync(6_900);
    made.w.endFlight();
    await vi.advanceTimersByTimeAsync(99);
    expect(run.verdict).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(run.settledAt).toBe(REMOTE_ATTACH_BIND_WAIT_MS);
    expect(run.verdict?.kind).toBe('unanswered');
  });

  it('7. a machine not signed in yet is waited for, 500 ms at a time, and an announce carrying the row answers', async () => {
    const { w, deps } = world({ ready: false });
    const { run } = start(deps);
    await vi.advanceTimersByTimeAsync(1_200);
    expect(run.verdict).toBeNull();
    expect(w.asked.filter((one) => one === `announce:${String(ANNOUNCE_RECHECK_MS)}`)).toHaveLength(3);
    expect(w.asked).not.toContain('poll');
    w.row = feedRow();
    w.announce();
    await vi.advanceTimersByTimeAsync(0);
    expect(run.verdict).toEqual({ kind: 'row', row: feedRow() });
    expect(run.settledAt).toBe(1_200);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('7 then 6. a machine that signs in during the wait is asked one list of its own', async () => {
    const made = world({ ready: false });
    const w = made.w;
    w.onPoll = answersAfter(w, 30, () => {
      w.row = feedRow();
    });
    const { run } = start(made.deps);
    await vi.advanceTimersByTimeAsync(700);
    w.ready = true;
    await vi.advanceTimersByTimeAsync(300 + 30);
    expect(run.verdict).toEqual({ kind: 'row', row: feedRow() });
    expect(run.settledAt).toBe(1_030);
    expect(w.asked.filter((one) => one === 'poll')).toHaveLength(1);
  });

  it('7. a machine that never signs in answers unanswered at the budget, every turn bounded by it', async () => {
    const { w, deps } = world({ ready: false });
    const { run } = start(deps);
    await vi.advanceTimersByTimeAsync(REMOTE_ATTACH_BIND_WAIT_MS);
    expect(run.verdict).toEqual({
      kind: 'unanswered',
      why: `nothing answered within ${String(REMOTE_ATTACH_BIND_WAIT_MS)} ms`
    });
    expect(run.settledAt).toBe(REMOTE_ATTACH_BIND_WAIT_MS);
    const turns = w.asked.filter((one) => one.startsWith('announce:'));
    expect(turns).toHaveLength(REMOTE_ATTACH_BIND_WAIT_MS / ANNOUNCE_RECHECK_MS);
    expect(w.asked).not.toContain('poll');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('7. a quiet turn is trimmed to what is left of the budget', async () => {
    const { w, deps } = world({ flight: true, ready: false });
    const { run } = start(deps);
    await vi.advanceTimersByTimeAsync(6_800);
    w.endFlight();
    await vi.advanceTimersByTimeAsync(0);
    expect(w.asked.at(-1)).toBe('announce:200');
    await vi.advanceTimersByTimeAsync(200);
    expect(run.verdict?.kind).toBe('unanswered');
    expect(run.settledAt).toBe(REMOTE_ATTACH_BIND_WAIT_MS);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('a machine this run does not know answers machine-unknown before anything else is asked', async () => {
    const { w, deps } = world({ known: false, row: feedRow() });
    const { run, done } = start(deps);
    await done;
    expect(run.verdict).toEqual({ kind: 'machine-unknown' });
    expect(w.asked).toEqual(['known']);
  });
});

describe('a wait nobody wants any more answers stale and asks nothing after', () => {
  it('after the create wait', async () => {
    let wanted = true;
    const { w, deps } = world({ flight: true, ready: true });
    const { run } = start(deps, { live: () => wanted });
    await vi.advanceTimersByTimeAsync(100);
    wanted = false;
    w.row = feedRow();
    w.endFlight();
    await vi.advanceTimersByTimeAsync(0);
    expect(run.verdict).toEqual({ kind: 'stale' });
    expect(w.asked.at(-1)).toMatch(/^settled:/);
  });

  it('after its own list', async () => {
    let wanted = true;
    const made = world({ ready: true });
    const w = made.w;
    w.onPoll = answersAfter(w, 20, () => {
      wanted = false;
      w.row = feedRow();
    });
    const { run } = start(made.deps, { live: () => wanted });
    await vi.advanceTimersByTimeAsync(20);
    expect(run.verdict).toEqual({ kind: 'stale' });
    expect(w.asked.at(-1)).toBe('poll');
  });

  it('after an announce', async () => {
    let wanted = true;
    const { w, deps } = world({ ready: false });
    const { run } = start(deps, { live: () => wanted });
    await vi.advanceTimersByTimeAsync(250);
    wanted = false;
    w.row = feedRow();
    w.announce();
    await vi.advanceTimersByTimeAsync(0);
    expect(run.verdict).toEqual({ kind: 'stale' });
    expect(w.asked.at(-1)).toMatch(/^announce:/);
  });

  it('before the first turn', async () => {
    const { w, deps } = world({ row: feedRow() });
    const { run, done } = start(deps, { live: () => false });
    await done;
    expect(run.verdict).toEqual({ kind: 'stale' });
    expect(w.asked).toEqual([]);
  });
});

describe('the shutdown signal ends every wait at once', () => {
  for (const [label, over] of [
    ['the create wait', { flight: true, ready: true }],
    ['the announce wait', { ready: false }],
    ['its own list', { ready: true }]
  ] as const) {
    it(`during ${label}`, async () => {
      const made = world(over);
      made.w.onPoll = () => new Promise<void>(() => undefined);
      const controller = new AbortController();
      const added = vi.spyOn(controller.signal, 'addEventListener');
      const removed = vi.spyOn(controller.signal, 'removeEventListener');
      const { run } = start(made.deps, { signal: controller.signal });
      await vi.advanceTimersByTimeAsync(150);
      expect(run.verdict).toBeNull();
      controller.abort();
      await vi.advanceTimersByTimeAsync(0);
      expect(run.verdict).toEqual({ kind: 'stale' });
      expect(run.settledAt).toBe(150);
      expect(vi.getTimerCount()).toBe(0);
      expect(removed.mock.calls.length).toBe(added.mock.calls.length);
    });
  }

  it('an already aborted signal answers stale at once', async () => {
    const controller = new AbortController();
    controller.abort();
    const { w, deps } = world({ row: feedRow() });
    const { run, done } = start(deps, { signal: controller.signal });
    await done;
    expect(run.verdict).toEqual({ kind: 'stale' });
    expect(w.asked).toEqual([]);
  });
});

describe('AttachTickets', () => {
  it('holds the newest ticket per session and nothing older', () => {
    const tickets = new AttachTickets();
    const first = tickets.take('a');
    expect(tickets.holds('a', first)).toBe(true);
    const second = tickets.take('a');
    expect(second).not.toBe(first);
    expect(tickets.holds('a', first)).toBe(false);
    expect(tickets.holds('a', second)).toBe(true);
  });

  it('invalidate stops the session holding, and no other session', () => {
    const tickets = new AttachTickets();
    const a = tickets.take('a');
    const b = tickets.take('b');
    tickets.invalidate('a');
    expect(tickets.holds('a', a)).toBe(false);
    expect(tickets.holds('b', b)).toBe(true);
    const again = tickets.take('a');
    expect(tickets.holds('a', again)).toBe(true);
    expect(again).not.toBe(a);
  });

  it('a ticket from one session never holds for another', () => {
    const tickets = new AttachTickets();
    const a = tickets.take('a');
    tickets.take('b');
    expect(tickets.holds('b', a)).toBe(false);
  });

  it('shutdown aborts the one signal, and is idempotent', () => {
    const tickets = new AttachTickets();
    const seen = vi.fn();
    tickets.signal.addEventListener('abort', seen);
    expect(tickets.signal.aborted).toBe(false);
    tickets.shutdown();
    tickets.shutdown();
    expect(tickets.signal.aborted).toBe(true);
    expect(seen).toHaveBeenCalledTimes(1);
  });
});

describe('farBindingRefusal', () => {
  const who = { machineId: MACHINE, tmuxName: 'far-one' };

  it('absent is SESSION_NOT_FOUND in the remote branch’s own words', () => {
    const err = farBindingRefusal({ kind: 'absent', why: 'no record of it remains' }, who);
    expect(err.payload).toEqual({
      code: 'SESSION_NOT_FOUND',
      message: 'This session is not running right now.',
      detail: 'studio far-one: no record of it remains',
      remedy: undefined
    });
  });

  it('unanswered is TMUX_UNREACHABLE with the one new sentence, which the pane offers Try again under', () => {
    const err = farBindingRefusal({ kind: 'unanswered', why: 'nothing answered within 7000 ms' }, who);
    expect(err.payload.code).toBe('TMUX_UNREACHABLE');
    expect(err.payload.message).toBe(ATTACH_NOT_HEARD);
    expect(err.payload.detail).toBe('studio far-one: nothing answered within 7000 ms');
  });

  it('machine-unknown is INVALID_INPUT with the existing not-signed-in sentence', () => {
    const err = farBindingRefusal({ kind: 'machine-unknown' }, who);
    expect(err.payload.code).toBe('INVALID_INPUT');
    expect(err.payload.message).toBe(MACHINE_NOT_READY);
    expect(err.payload.detail?.startsWith('studio far-one: ')).toBe(true);
  });

  it('never says the local sentence', () => {
    for (const verdict of [
      { kind: 'absent', why: 'x' },
      { kind: 'unanswered', why: 'x' },
      { kind: 'machine-unknown' }
    ] as const) {
      expect(farBindingRefusal(verdict, who).payload.message).not.toBe(
        'This session is no longer running.'
      );
    }
  });
});

describe('defaultFarAttachDeps, the two things it builds itself', () => {
  it('nextAnnounce resolves on an announce, unsubscribed and with no timer left', async () => {
    const deps = defaultFarAttachDeps();
    let resolved = false;
    void deps.nextAnnounce(500, new AbortController().signal).then(() => {
      resolved = true;
    });
    expect(machine.subscribed).toBe(1);
    expect(machine.listeners.size).toBe(1);
    for (const listener of [...machine.listeners]) listener();
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(true);
    expect(machine.listeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('nextAnnounce resolves after its bound, unsubscribed', async () => {
    const deps = defaultFarAttachDeps();
    let resolved = false;
    void deps.nextAnnounce(500, new AbortController().signal).then(() => {
      resolved = true;
    });
    await vi.advanceTimersByTimeAsync(499);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(resolved).toBe(true);
    expect(machine.listeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('nextAnnounce resolves on abort, unsubscribed, its abort listener removed', async () => {
    const deps = defaultFarAttachDeps();
    const controller = new AbortController();
    const added = vi.spyOn(controller.signal, 'addEventListener');
    const removed = vi.spyOn(controller.signal, 'removeEventListener');
    let resolved = false;
    void deps.nextAnnounce(500, controller.signal).then(() => {
      resolved = true;
    });
    controller.abort();
    await vi.advanceTimersByTimeAsync(0);
    expect(resolved).toBe(true);
    expect(machine.listeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    expect(removed.mock.calls.length).toBe(added.mock.calls.length);
  });

  it('nextAnnounce on an aborted signal subscribes nothing', async () => {
    const deps = defaultFarAttachDeps();
    const controller = new AbortController();
    controller.abort();
    await deps.nextAnnounce(500, controller.signal);
    expect(machine.subscribed).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('contextReady is the readiness question without its throw', () => {
    const deps = defaultFarAttachDeps();
    expect(deps.contextReady(MACHINE)).toBe(false);
    machine.ready.add(MACHINE);
    expect(deps.contextReady(MACHINE)).toBe(true);
  });
});
