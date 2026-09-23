/**
 * The push engine (Phase 314, SPEC §3), driven the way the harness seam
 * composes it: the SHIPPING blocked feed over a fake core, the SHIPPING
 * `WakeMark` over the shared drivable monitor, and rows composed the way the
 * door composes them — `attentionRows` for the set and the order, and
 * `blockedAge` for `seenAtWake`. Only the sender is a fake, recording each
 * request and answering from a script; `apns.test.ts` drives the real one
 * against a loopback stand-in.
 *
 * THE CLOCKS ARE THE TEST'S. A wall clock and a monotonic clock that the test
 * moves, and a scheduler whose timers fire only when the test advances time.
 * A sleep moves the wall clock and not the monotonic one, which is what a Mac
 * does. Nothing here sleeps, opens a socket or reads a file.
 *
 * Each test names the clause of the engine it would catch if that clause were
 * removed.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { createHash, randomBytes } from 'node:crypto';
import type { PocketBlockedRow } from '@shared/ipc/pocket';
import type { Project, Session } from '@shared/types';
import { PUSH_WAKE_SEEN, type PushSentenceId } from '@shared/push-copy';
import type { ApnsProviderKey } from '../../credentials/apns-key';
import type { PocketPushDestination } from '../../pocket/pairing';
import { drivableMonitor, type DrivableMonitor } from '../../power/drivable-monitor';
import { WakeMark } from '../../power/wake-mark';
import { WAKE_WINDOW_MS, attentionRows, blockedAge } from '../../tray/attention';
import {
  blockedSinceMap,
  installBlockedFeed,
  onBlockedChange,
  resetBlockedFeedForTests
} from '../../tray/blocked-feed';
import { classifyApnsAnswer, type ApnsAnswer, type ApnsRequest, type ApnsSender } from '../apns';
import {
  ALERT_FLOOR_MS,
  COALESCE_MS,
  JOIN_BOUND_MS,
  RETRY_AFTER_MS,
  createPushEngine,
  type PushEngine
} from '../engine';

// ---------------------------------------------------------------------------
// The clocks and the scheduler
// ---------------------------------------------------------------------------

const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

class Clock {
  wall = 1_758_500_000_000;
  mono = 5_000_000;
  private readonly timers: Array<{ at: number; fn: () => void; live: boolean }> = [];

  schedule = (fn: () => void, ms: number): (() => void) => {
    const timer = { at: this.mono + ms, fn, live: true };
    this.timers.push(timer);
    return () => {
      timer.live = false;
    };
  };

  pending(): number {
    return this.timers.filter((t) => t.live).length;
  }

  /** Move both clocks by `ms`, firing each timer that falls due, in order. */
  async advance(ms: number): Promise<void> {
    const end = this.mono + ms;
    for (;;) {
      const next = this.timers
        .filter((t) => t.live && t.at <= end)
        .sort((a, b) => a.at - b.at)[0];
      if (next === undefined) break;
      this.wall += next.at - this.mono;
      this.mono = next.at;
      next.live = false;
      next.fn();
      await settle();
      await settle();
    }
    this.wall += end - this.mono;
    this.mono = end;
    await settle();
  }
}

// ---------------------------------------------------------------------------
// The rig: sessions, the feed, the wake, the door's rows, the destinations
// ---------------------------------------------------------------------------

const PROJECTS: Project[] = [{ id: 'p1', path: '/repos/webapp', name: 'webapp' }];
const CANARY = 'CANARY-5d1a';

interface Sent {
  readonly at: number;
  readonly token: string;
  readonly request: ApnsRequest;
  readonly body: { aps: Record<string, unknown>; tortie?: Record<string, unknown> };
}

function destination(label: string): PocketPushDestination {
  const token = randomBytes(32).toString('hex');
  return {
    phoneId: `phone-${label}`,
    token,
    environment: 'development',
    tokenDigest: createHash('sha256').update(token).digest('hex')
  };
}

function key(topic = 'software.itavero.tortie.phone'): ApnsProviderKey {
  return { keyId: 'ABC123DEFG', teamId: 'TEAM123456', topic, p8: 'scratch, never signed here' };
}

interface Rig {
  clock: Clock;
  monitor: DrivableMonitor;
  wake: WakeMark;
  engine: PushEngine;
  sent: Sent[];
  said: PushSentenceId[];
  dropped: PocketPushDestination[];
  destinations: PocketPushDestination[];
  keyReads(): number;
  closes(): number;
  setKey(next: ApnsProviderKey | null): void;
  script: (request: ApnsRequest, index: number) => ApnsAnswer | Promise<ApnsAnswer>;
  block(...ids: string[]): void;
  clear(...ids: string[]): void;
  status(id: string, status: Session['status']): void;
  remote(id: string, machine: string): void;
  rows(): PocketBlockedRow[];
  broadcast(): void;
  to(dest: PocketPushDestination): Sent[];
}

const rigs: Rig[] = [];

function rig(
  options: { seed?: string[]; destinations?: number; dropPersists?: boolean } = {}
): Rig {
  const clock = new Clock();
  const sessions = new Map<string, Session>();
  const machines = new Map<string, string>();
  let currentKey: ApnsProviderKey | null = key();
  let keyReads = 0;
  let closes = 0;
  const monitor = drivableMonitor();
  const wake = new WakeMark(monitor, () => clock.wall);
  const destinations = Array.from({ length: options.destinations ?? 2 }, (_, i) =>
    destination(String.fromCharCode(65 + i))
  );

  const core = {
    onSessionsBroadcast: null as ((s: Session[]) => void) | null,
    listSessions: () => [...sessions.values()],
    listProjects: () => PROJECTS
  };

  const rows = (): PocketBlockedRow[] => {
    const all = [...sessions.values()];
    return attentionRows(all, PROJECTS, blockedSinceMap()).map((row) => {
      const s = sessions.get(row.sessionId) as Session;
      return {
        sessionId: s.id,
        name: s.name,
        project: 'webapp',
        machine: machines.get(s.id) ?? null,
        agent: 'claude',
        agentLabel: 'Claude Code',
        statusLabel: 'needs input',
        statusDot: 'attention',
        question: `${CANARY} may I?`,
        choices: [],
        blockedSince: row.since,
        seenAtWake: blockedAge(row.since, wake.wakes()).seenAtWake
      };
    });
  };

  const self: Rig = {
    clock,
    monitor,
    wake,
    engine: undefined as unknown as PushEngine,
    sent: [],
    said: [],
    dropped: [],
    destinations,
    keyReads: () => keyReads,
    closes: () => closes,
    setKey: (next) => {
      currentKey = next;
    },
    script: () => ({ ok: true }),
    block: (...ids) => {
      for (const id of ids) {
        sessions.set(id, {
          id,
          name: id,
          tmuxName: id,
          projectPath: '/repos/webapp',
          cwd: '/repos/webapp',
          agent: 'claude',
          status: 'needs_input',
          createdAt: 1
        } as Session);
      }
      self.broadcast();
    },
    clear: (...ids) => {
      for (const id of ids) {
        const s = sessions.get(id);
        if (s !== undefined) sessions.set(id, { ...s, status: 'idle' });
      }
      self.broadcast();
    },
    status: (id, status) => {
      const s = sessions.get(id);
      if (s !== undefined) sessions.set(id, { ...s, status });
      self.broadcast();
    },
    remote: (id, machine) => {
      machines.set(id, machine);
    },
    rows,
    broadcast: () => core.onSessionsBroadcast?.([...sessions.values()]),
    to: (dest) => self.sent.filter((s) => s.token === dest.token)
  };

  const sender: ApnsSender = {
    send: async (k, request) => {
      const body = JSON.parse(request.payload) as Sent['body'];
      self.sent.push({ at: clock.mono, token: request.token, request, body });
      expect(k).toBe(currentKey);
      return self.script(request, self.sent.length - 1);
    },
    close: async () => {
      closes += 1;
    }
  };

  // Seeded rows exist BEFORE the engine's first observe, which is launch.
  for (const id of options.seed ?? []) {
    sessions.set(id, {
      id,
      name: id,
      tmuxName: id,
      projectPath: '/repos/webapp',
      cwd: '/repos/webapp',
      agent: 'claude',
      status: 'needs_input',
      createdAt: 1
    } as Session);
  }

  self.engine = createPushEngine({
    rows,
    destinations: () => self.destinations,
    providerKey: async () => {
      keyReads += 1;
      return currentKey;
    },
    sender,
    drop: (d) => {
      self.dropped.push(d);
      // A host whose sealed write failed keeps answering the dead token.
      if (options.dropPersists === false) return;
      self.destinations = self.destinations.filter((x) => x.tokenDigest !== d.tokenDigest);
    },
    wake,
    now: () => clock.wall,
    monotonic: () => clock.mono,
    schedule: clock.schedule,
    say: (id) => self.said.push(id)
  });
  onBlockedChange(() => self.engine.observe());
  installBlockedFeed(core, () => clock.wall);
  rigs.push(self);
  return self;
}

afterEach(() => {
  for (const r of rigs.splice(0)) {
    r.engine.beginShutdown();
    r.wake.dispose();
  }
  resetBlockedFeedForTests();
});

function alertOf(sent: Sent | undefined): { title: string; body: string } {
  return (sent?.body.aps.alert ?? { title: '', body: '' }) as { title: string; body: string };
}

// ---------------------------------------------------------------------------

describe('launch (E6)', () => {
  it('seeds silently: rows already blocked at launch are never alerted', async () => {
    const r = rig({ seed: ['s1', 's2', 's3'] });
    r.broadcast();
    await r.clock.advance(120_000);
    expect(r.sent).toHaveLength(0);
    expect(r.keyReads()).toBe(0);
    expect(r.clock.pending()).toBe(0);
  });

  it('counts the seeded rows in the badge of the next send', async () => {
    const r = rig({ seed: ['s1', 's2'] });
    r.block('s3');
    await r.clock.advance(COALESCE_MS);
    expect(r.sent).toHaveLength(2);
    expect(r.sent[0]?.body.aps.badge).toBe(3);
  });
});

describe('ordinary time (E3)', () => {
  it('sends one single alert per phone, COALESCE_MS after the join and not before', async () => {
    const r = rig();
    r.block('s1');
    await r.clock.advance(COALESCE_MS - 1);
    expect(r.sent).toHaveLength(0);
    await r.clock.advance(1);
    expect(r.sent).toHaveLength(2);
    for (const dest of r.destinations) expect(r.to(dest)).toHaveLength(1);
    const first = r.sent[0];
    expect(alertOf(first)).toEqual({ title: 's1 needs input', body: 'webapp · Claude Code' });
    expect(first?.request.priority).toBe(10);
    expect(first?.request.collapseId).toBe('s1');
    expect(first?.request.expiration).toBe(Math.floor(r.clock.wall / 1000) + 3600);
    expect(first?.request.topic).toBe('software.itavero.tortie.phone');
    expect(first?.body.aps['thread-id']).toBe('s1');
  });

  it('turns twenty rows flipping at once into ONE count alert per phone', async () => {
    const r = rig();
    const ids = Array.from({ length: 20 }, (_, i) => `s${String(i + 2).padStart(2, '0')}`);
    r.block(...ids);
    await r.clock.advance(60_000);
    expect(r.sent).toHaveLength(2);
    expect(alertOf(r.sent[0]).title).toBe('Needs your input (20)');
    expect(r.sent[0]?.request.collapseId).toBe('tortie-waiting');
  });

  it('gathers joins spread across the coalescing window into the one alert', async () => {
    const r = rig();
    r.block('a');
    await r.clock.advance(1_000);
    r.block('b');
    await r.clock.advance(1_000);
    r.block('c');
    await r.clock.advance(COALESCE_MS);
    expect(r.sent).toHaveLength(2);
    expect(alertOf(r.sent[0])).toEqual({ title: 'Needs your input (3)', body: 'c · b · a' });
  });

  it('holds the floor: a join five seconds after a send waits until thirty have passed', async () => {
    const r = rig();
    r.block('a');
    await r.clock.advance(COALESCE_MS);
    const sentAt = r.clock.mono;
    await r.clock.advance(5_000);
    r.block('b');
    await r.clock.advance(ALERT_FLOOR_MS - 5_000 - 1);
    expect(r.sent).toHaveLength(2);
    await r.clock.advance(1);
    expect(r.sent).toHaveLength(4);
    expect(r.sent[2]?.at).toBe(sentAt + ALERT_FLOOR_MS);
  });

  it('does not announce a row that joined and left inside the window', async () => {
    const r = rig();
    r.block('a');
    await r.clock.advance(1_000);
    r.clear('a');
    await r.clock.advance(60_000);
    expect(r.sent).toHaveLength(0);
  });

  it('corrects a fall with a badge-only send: no word, priority 5, stored nowhere', async () => {
    const r = rig();
    r.block('a', 'b');
    await r.clock.advance(COALESCE_MS);
    expect(r.sent[0]?.body.aps.badge).toBe(2);
    r.clear('a');
    await r.clock.advance(ALERT_FLOOR_MS);
    const badge = r.sent.slice(2);
    expect(badge).toHaveLength(2);
    expect(badge[0]?.request.payload).toBe('{"aps":{"badge":1}}');
    expect(badge[0]?.request.priority).toBe(5);
    expect(badge[0]?.request.expiration).toBe(0);
    expect(badge[0]?.request.collapseId).toBeNull();
  });
});

describe('what never rises (E1, E2)', () => {
  it('sends nothing, and arms nothing, for working (running) and idle', async () => {
    const r = rig({ seed: ['w'] });
    r.status('w', 'running');
    r.status('w', 'idle');
    r.status('w', 'running');
    r.block('x');
    r.status('x', 'running');
    await r.clock.advance(120_000);
    expect(r.sent).toHaveLength(0);
    expect(r.clock.pending()).toBe(0);
  });

  it('never raises the badge without an alert', async () => {
    const r = rig();
    r.block('a');
    await r.clock.advance(COALESCE_MS);
    r.clear('a');
    await r.clock.advance(ALERT_FLOOR_MS);
    r.block('b', 'c');
    await r.clock.advance(ALERT_FLOOR_MS);
    expect(r.sent).toHaveLength(6);
    for (const dest of r.destinations) {
      let last = 0;
      const seen = r.to(dest);
      expect(seen.map((s) => s.body.aps.badge)).toEqual([1, 0, 2]);
      for (const s of seen) {
        const badge = s.body.aps.badge as number;
        if (s.body.aps.alert === undefined) expect(badge).toBeLessThan(last);
        last = badge;
      }
    }
  });

  it('never announces or counts a row on another machine (the remote filter)', async () => {
    const r = rig();
    r.remote('far', 'studio');
    r.block('far');
    await r.clock.advance(60_000);
    expect(r.sent).toHaveLength(0);
    expect(r.clock.pending()).toBe(0);
    r.block('near');
    await r.clock.advance(60_000);
    expect(r.sent).toHaveLength(2);
    expect(alertOf(r.sent[0]).title).toBe('near needs input');
    expect(r.sent[0]?.body.aps.badge).toBe(1);
  });
});

describe('block, clear, block again (E4)', () => {
  it('replaces its own card: the second alert carries the same collapse id and thread id', async () => {
    const r = rig({ destinations: 1 });
    r.block('s1');
    await r.clock.advance(COALESCE_MS);
    r.clear('s1');
    await r.clock.advance(ALERT_FLOOR_MS);
    r.block('s1');
    await r.clock.advance(ALERT_FLOOR_MS);
    expect(r.sent.map((s) => s.request.payload)).toEqual([
      expect.stringContaining('"title":"s1 needs input"'),
      '{"aps":{"badge":0}}',
      expect.stringContaining('"title":"s1 needs input"')
    ]);
    expect(r.sent[2]?.request.collapseId).toBe(r.sent[0]?.request.collapseId);
    expect(r.sent[2]?.body.aps['thread-id']).toBe(r.sent[0]?.body.aps['thread-id']);
  });
});

describe('the wake (E5), the first arm of the attack', () => {
  it('turns an eight-hour sleep and three rows first seen after it into ONE alert per phone', async () => {
    const r = rig();
    r.monitor.fire('suspend');
    expect(r.engine.status().state).toBe('asleep');
    r.clock.wall += 8 * 60 * 60_000; // the Mac slept; the monotonic clock did not move
    r.monitor.fire('resume');
    await r.clock.advance(1_000);
    r.block('w1');
    await r.clock.advance(6_000);
    r.block('w2');
    await r.clock.advance(7_000);
    r.block('w3');
    // Suppressed: nothing but the one wake flush is armed inside the window.
    expect(r.clock.pending()).toBe(1);
    await r.clock.advance(WAKE_WINDOW_MS - 14_000 - 1);
    expect(r.sent).toHaveLength(0);
    await r.clock.advance(1);
    expect(r.sent).toHaveLength(2);
    for (const dest of r.destinations) expect(r.to(dest)).toHaveLength(1);
    expect(alertOf(r.sent[0])).toEqual({
      title: 'Needs your input (3)',
      body: `${PUSH_WAKE_SEEN} · w3 · w2 · w1`
    });
    expect(r.rows().map((row) => [row.name, row.seenAtWake])).toEqual([
      ['w3', true],
      ['w2', true],
      ['w1', true]
    ]);
    await r.clock.advance(120_000);
    expect(r.sent).toHaveLength(2);
  });

  it('takes a row first seen at exactly resume + 15,000 ms into the wake alert, and not one at 15,001', async () => {
    const r = rig({ destinations: 1 });
    r.monitor.fire('suspend');
    r.clock.wall += 8 * 60 * 60_000;
    r.monitor.fire('resume');
    const resumedAt = r.wake.wakes()[0]?.resumedAt ?? 0;
    await r.clock.advance(WAKE_WINDOW_MS - 1);
    r.clock.wall = resumedAt + WAKE_WINDOW_MS;
    r.block('edge');
    await r.clock.advance(1);
    expect(r.sent).toHaveLength(1);
    expect(alertOf(r.sent[0]).body).toBe(`${PUSH_WAKE_SEEN} · edge`);
    r.clock.wall = resumedAt + WAKE_WINDOW_MS + 1;
    r.block('late');
    expect(r.rows().find((row) => row.name === 'late')?.seenAtWake).toBe(false);
    await r.clock.advance(ALERT_FLOOR_MS);
    expect(r.sent).toHaveLength(2);
    expect(alertOf(r.sent[1]).title).toBe('late needs input');
  });

  it('folds a row that joined two seconds before the suspend into the wake alert, not seen at the wake', async () => {
    const r = rig({ destinations: 1 });
    r.block('p');
    await r.clock.advance(2_000);
    r.monitor.fire('suspend');
    // The suspend cancels the flush that was armed, and closes the connections.
    expect(r.clock.pending()).toBe(0);
    expect(r.closes()).toBe(1);
    r.clock.wall += 8 * 60 * 60_000;
    r.monitor.fire('resume');
    await r.clock.advance(1_000);
    r.block('w1');
    await r.clock.advance(WAKE_WINDOW_MS);
    expect(r.sent).toHaveLength(1);
    // p's stamp is true and w1's is the wake's, so the wake is not said: it
    // would be false of p (the fix round). The one alert still carries both.
    expect(alertOf(r.sent[0]).title).toBe('Needs your input (2)');
    expect(alertOf(r.sent[0]).body).toBe('w1 · p');
    expect(r.rows().map((row) => [row.name, row.seenAtWake])).toEqual([
      ['w1', true],
      ['p', false]
    ]);
  });

  it('sends nothing at the wake when nothing joined', async () => {
    const r = rig({ seed: ['old'] });
    r.broadcast();
    r.monitor.fire('suspend');
    r.monitor.fire('resume');
    await r.clock.advance(60_000);
    expect(r.sent).toHaveLength(0);
    expect(r.keyReads()).toBe(0);
  });
});

describe("Apple's answers (E7)", () => {
  it('drops a phone Apple answered 410 for, says so once, and never sends to it again', async () => {
    const r = rig();
    const [a, b] = r.destinations as [PocketPushDestination, PocketPushDestination];
    r.script = (req) =>
      req.token === b.token ? classifyApnsAnswer(410, 'Unregistered') : { ok: true };
    r.block('s1');
    await r.clock.advance(COALESCE_MS);
    expect(r.dropped).toEqual([b]);
    expect(r.said.filter((id) => id === 'dropped')).toHaveLength(1);
    r.block('s2');
    await r.clock.advance(ALERT_FLOOR_MS);
    r.block('s3');
    await r.clock.advance(ALERT_FLOOR_MS);
    expect(r.to(b)).toHaveLength(1);
    expect(r.to(a)).toHaveLength(3);
  });

  it('drops a token for the wrong environment exactly like a 410', async () => {
    const r = rig({ destinations: 1 });
    r.script = () => classifyApnsAnswer(400, 'BadDeviceToken');
    r.block('s1');
    await r.clock.advance(COALESCE_MS);
    expect(r.dropped).toHaveLength(1);
    r.block('s2');
    await r.clock.advance(ALERT_FLOOR_MS);
    expect(r.sent).toHaveLength(1);
  });

  it('stops while the same key is in place after a key fault, and a corrected key lifts it', async () => {
    const r = rig({ destinations: 1 });
    r.script = () => classifyApnsAnswer(400, 'DeviceTokenNotForTopic');
    r.block('s1');
    await r.clock.advance(COALESCE_MS);
    expect(r.said).toEqual(['refused-key']);
    expect(r.engine.status().state).toBe('refused');
    expect(r.dropped).toHaveLength(0);
    r.block('s2');
    await r.clock.advance(ALERT_FLOOR_MS);
    expect(r.sent).toHaveLength(1);
    r.setKey(key('software.itavero.tortie.corrected'));
    r.script = () => ({ ok: true });
    r.block('s3');
    await r.clock.advance(ALERT_FLOOR_MS);
    expect(r.sent).toHaveLength(2);
    expect(r.said).toEqual(['refused-key']);
  });

  it('retries exactly once after fifteen seconds, recomposed, and only to the phone that failed', async () => {
    const r = rig();
    const [a, b] = r.destinations as [PocketPushDestination, PocketPushDestination];
    let failed = false;
    r.script = (req) => {
      if (req.token === a.token && !failed) {
        failed = true;
        return classifyApnsAnswer(503, 'ServiceUnavailable');
      }
      return { ok: true };
    };
    r.block('s1');
    await r.clock.advance(COALESCE_MS);
    await r.clock.advance(RETRY_AFTER_MS - 1);
    expect(r.to(a)).toHaveLength(1);
    await r.clock.advance(1);
    expect(r.to(a)).toHaveLength(2);
    expect(r.to(b)).toHaveLength(1);
    expect(alertOf(r.to(a)[1]).title).toBe('s1 needs input');
    await r.clock.advance(120_000);
    expect(r.sent).toHaveLength(3);
  });

  it('gives up after the second failure, says unreachable once, and never tries a third time', async () => {
    const r = rig({ destinations: 1 });
    r.script = () => classifyApnsAnswer(500, 'InternalServerError');
    r.block('s1');
    await r.clock.advance(COALESCE_MS + RETRY_AFTER_MS);
    await r.clock.advance(600_000);
    expect(r.sent).toHaveLength(2);
    expect(r.said).toEqual(['unreachable']);
  });

  it('does not announce, on the retry, a row answered in the meantime', async () => {
    const r = rig({ destinations: 1 });
    let n = 0;
    r.script = () => (n++ === 0 ? classifyApnsAnswer(500, 'InternalServerError') : { ok: true });
    r.block('s1');
    await r.clock.advance(COALESCE_MS);
    r.clear('s1');
    await r.clock.advance(RETRY_AFTER_MS);
    expect(r.sent.filter((s) => s.body.aps.alert !== undefined)).toHaveLength(1);
  });

  it('does not retry a 429', async () => {
    const r = rig({ destinations: 1 });
    r.script = () => classifyApnsAnswer(429, 'TooManyRequests');
    r.block('s1');
    await r.clock.advance(600_000);
    expect(r.sent).toHaveLength(1);
    expect(r.said).toEqual([]);
  });
});

describe('the fix round (Phase 314): what the attack found', () => {
  it('never asks a dropped token again even when the host could not write the drop down', async () => {
    const r = rig({ dropPersists: false });
    const [a, b] = r.destinations as [PocketPushDestination, PocketPushDestination];
    r.script = (req) =>
      req.token === b.token ? classifyApnsAnswer(410, 'Unregistered') : { ok: true };
    r.block('s1');
    await r.clock.advance(COALESCE_MS);
    for (const id of ['s2', 's3', 's4']) {
      r.block(id);
      await r.clock.advance(ALERT_FLOOR_MS);
    }
    // The host still answers b; the engine does not ask it.
    expect(r.destinations).toContain(b);
    expect(r.to(b)).toHaveLength(1);
    expect(r.to(a)).toHaveLength(4);
    expect(r.said).toEqual(['dropped']);
  });

  it('asks a token two pairings presented once, not twice', async () => {
    const r = rig({ destinations: 1 });
    const [a] = r.destinations as [PocketPushDestination];
    r.destinations = [a, { ...a, phoneId: 'phone-again' }];
    r.block('s1');
    await r.clock.advance(COALESCE_MS);
    expect(r.sent).toHaveLength(1);
  });

  it('reads a second ExpiredProviderToken as this Mac’s clock, stops nothing, and tries again', async () => {
    const r = rig({ destinations: 1 });
    // The fake sender answers what the real one answers after its one re-mint.
    r.script = () => classifyApnsAnswer(403, 'ExpiredProviderToken');
    r.block('s1');
    await r.clock.advance(COALESCE_MS);
    expect(r.said).toEqual(['clock']);
    expect(r.engine.status().state).not.toBe('refused');
    expect(r.engine.status().sentence).toBe(
      'This Mac’s clock is behind Apple’s, so this alert was not sent.'
    );
    expect(r.dropped).toHaveLength(0);
    // The clock is put right: the next join sends, and the sentence clears.
    r.script = () => ({ ok: true });
    r.block('s2');
    await r.clock.advance(ALERT_FLOOR_MS);
    expect(r.sent).toHaveLength(2);
    expect(r.engine.status().sentence).toBeNull();
    expect(r.said).toEqual(['clock']);
  });

  it('corrects the badge when a row leaves while its alert is in flight', async () => {
    const r = rig({ destinations: 1 });
    let answer: (a: ApnsAnswer) => void = () => undefined;
    r.script = () =>
      new Promise<ApnsAnswer>((resolve) => {
        answer = resolve;
      });
    r.block('a', 'b');
    await r.clock.advance(COALESCE_MS);
    expect(r.sent).toHaveLength(1);
    expect(r.sent[0]?.body.aps.badge).toBe(2);
    // b is answered at the Mac while Apple has not yet answered.
    r.clear('b');
    r.script = () => ({ ok: true });
    answer({ ok: true });
    await settle();
    await settle();
    await r.clock.advance(ALERT_FLOOR_MS);
    expect(r.sent).toHaveLength(2);
    expect(r.sent[1]?.body).toEqual({ aps: { badge: 1 } });
    await r.clock.advance(600_000);
    expect(r.sent).toHaveLength(2);
  });
});

describe('a fall is an event, not a state (the integrator, Phase 314)', () => {
  // The engine once asked "is the count below the last badge DELIVERED" on
  // every broadcast, so a badge Apple refused was sent again on the next
  // broadcast of any session, every four seconds, beside its one retry. The
  // rule is SPEC §2.7's: one retry after fifteen seconds, and a 429 not at
  // all; the next join or fall sends the current state.
  const badges = (r: Rig): Sent[] => r.sent.filter((s) => s.body.aps.alert === undefined);
  const churn = async (r: Rig, ticks: number): Promise<void> => {
    for (let i = 0; i < ticks; i += 1) {
      await r.clock.advance(2_000);
      r.broadcast();
    }
  };

  it('tries a failed badge exactly once more, however many broadcasts follow', async () => {
    const r = rig({ destinations: 1 });
    r.block('a', 'b');
    await r.clock.advance(COALESCE_MS);
    r.script = (req) =>
      req.priority === 5 ? classifyApnsAnswer(500, 'InternalServerError') : { ok: true };
    r.clear('a');
    await churn(r, 300);
    expect(badges(r)).toHaveLength(2);
    expect(r.said).toEqual(['unreachable']);
  });

  it('does not send a badge Apple answered 429 again on later broadcasts', async () => {
    const r = rig({ destinations: 1 });
    r.block('a', 'b');
    await r.clock.advance(COALESCE_MS);
    r.script = (req) =>
      req.priority === 5 ? classifyApnsAnswer(429, 'TooManyRequests') : { ok: true };
    r.clear('a');
    await churn(r, 300);
    expect(badges(r)).toHaveLength(1);
  });

  it('still corrects the NEXT fall after one Apple refused', async () => {
    const r = rig({ destinations: 1 });
    r.block('a', 'b');
    await r.clock.advance(COALESCE_MS);
    let refused = false;
    r.script = (req) => {
      if (req.priority === 5 && !refused) {
        refused = true;
        return classifyApnsAnswer(429, 'TooManyRequests');
      }
      return { ok: true };
    };
    r.clear('a');
    await churn(r, 30);
    r.clear('b');
    await churn(r, 30);
    expect(badges(r).map((s) => s.request.payload)).toEqual([
      '{"aps":{"badge":1}}',
      '{"aps":{"badge":0}}'
    ]);
  });

  it('reads the key no more for a refused key however many broadcasts follow a fall', async () => {
    const r = rig({ destinations: 1 });
    r.block('a', 'b');
    await r.clock.advance(COALESCE_MS);
    r.script = () => classifyApnsAnswer(403, 'InvalidProviderToken');
    r.clear('a');
    await churn(r, 30);
    const reads = r.keyReads();
    await churn(r, 300);
    expect(r.keyReads()).toBe(reads);
    expect(badges(r)).toHaveLength(1);
  });
});

describe('inert (E8)', () => {
  it('reads no key, arms no timer and sends nothing when there is no destination', async () => {
    const r = rig();
    r.destinations = [];
    r.block('s1');
    r.block('s2');
    await r.clock.advance(120_000);
    expect(r.keyReads()).toBe(0);
    expect(r.clock.pending()).toBe(0);
    expect(r.sent).toHaveLength(0);
    expect(r.said).toEqual([]);
    expect(r.engine.status().state).toBe('inert');
  });

  it('does not announce, when the switch returns, a row that joined while it was off', async () => {
    const r = rig();
    const saved = r.destinations;
    r.destinations = [];
    r.block('s1');
    r.destinations = saved;
    r.broadcast();
    await r.clock.advance(120_000);
    expect(r.sent).toHaveLength(0);
  });

  it('sends nothing without a key and says so once, however many flushes find none', async () => {
    const r = rig();
    r.setKey(null);
    r.block('s1');
    await r.clock.advance(COALESCE_MS);
    r.block('s2');
    await r.clock.advance(ALERT_FLOOR_MS);
    expect(r.sent).toHaveLength(0);
    expect(r.keyReads()).toBe(2);
    expect(r.said).toEqual(['no-key']);
    expect(r.engine.status()).toMatchObject({ state: 'no-key' });
    r.setKey(key());
    r.block('s3');
    await r.clock.advance(ALERT_FLOOR_MS);
    expect(r.sent).toHaveLength(2);
    expect(r.engine.status().state).toBe('ready');
  });
});

describe('the clock moved backwards (§4.1)', () => {
  it('still sends once, on time by the monotonic clock, with no negative number anywhere', async () => {
    const r = rig({ destinations: 1 });
    r.block('s1');
    r.clock.wall -= 2 * 60 * 60_000;
    await r.clock.advance(COALESCE_MS);
    expect(r.sent).toHaveLength(1);
    expect(r.sent[0]?.request.expiration).toBe(Math.floor(r.clock.wall / 1000) + 3600);
    expect(r.sent[0]?.request.payload).not.toMatch(/-\d/);
  });
});

describe('shutdown (E9)', () => {
  it('closes admission, cancels its timers, and sends nothing afterwards', async () => {
    const r = rig();
    r.block('s1');
    expect(r.clock.pending()).toBe(1);
    r.engine.beginShutdown();
    expect(r.clock.pending()).toBe(0);
    r.block('s2');
    await r.clock.advance(120_000);
    expect(r.sent).toHaveLength(0);
    r.monitor.fire('suspend');
    r.monitor.fire('resume');
    expect(r.clock.pending()).toBe(0);
  });

  it('joins a send in flight, but no longer than its bound, then closes the connections', async () => {
    const r = rig({ destinations: 1 });
    r.script = () => new Promise<ApnsAnswer>(() => undefined);
    r.block('s1');
    await r.clock.advance(COALESCE_MS);
    expect(r.sent).toHaveLength(1);
    r.engine.beginShutdown();
    let joined = false;
    void r.engine.join().then(() => {
      joined = true;
    });
    await r.clock.advance(JOIN_BOUND_MS - 1);
    expect(joined).toBe(false);
    await r.clock.advance(1);
    await settle();
    expect(joined).toBe(true);
    expect(r.closes()).toBe(1);
  });
});

describe('what the engine says', () => {
  it('never lets a question or a canary reach a request', async () => {
    const r = rig();
    r.block('s1');
    await r.clock.advance(COALESCE_MS);
    r.block('s2', 's3');
    await r.clock.advance(ALERT_FLOOR_MS);
    expect(r.sent.length).toBeGreaterThan(0);
    for (const s of r.sent) {
      expect(JSON.stringify(s.request)).not.toContain(CANARY);
    }
  });
});
