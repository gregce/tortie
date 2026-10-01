/**
 * The phone alerts, composed for a person (Phase 316.5, build/p3165/SPEC.md
 * §5.1, §5.2.2, §7.2): inert until the door answers a destination, one sender
 * and one engine after the door's own wait for the core, a disarm the moment
 * that answer empties, the quit's two lines, and the Apple push key's port.
 *
 * WHAT IS REAL. The shipping composition, Phase 314's shipping engine and,
 * where a test names it, the shipping sender over the in-process cleartext
 * HTTP/2 stand-in on `127.0.0.1` port 0, closed in `afterEach` whatever the
 * test did. WHAT IS NOT: the door (a host that answers destinations a test
 * sets), the blocked feed (a listener set a test fires), the key's store (in
 * memory) and Electron (a panel that records what it was asked).
 *
 * NOTHING LEAVES THIS MAC, by three nets. Every test but one hands the
 * composition its own sender aimed at the stand-in. The one test that builds
 * the DEFAULT sender runs with `GMUX_PROBES=1`, so `allowRemote` is false and
 * Apple's hosts are refused before any socket, which is what that test proves.
 * And `node:http2`'s `connect` is FENCED exactly as `../../push/__tests__/
 * apns.test.ts` fences it (Phase 314's I2): anything but the two literal
 * loopback addresses throws at the fence, and `afterEach` asserts the fence
 * saw nothing.
 *
 * THE KEY is a P-256 key generated in memory for this run. The one file this
 * file writes a key to is under its own temporary directory, removed after
 * each test.
 *
 * Which clause each test would catch if it were removed is named in the test.
 */

import { generateKeyPairSync, randomBytes, randomUUID, type KeyObject } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingHttpHeaders, type ServerHttp2Session } from 'node:http2';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PocketBlockedRow } from '@shared/ipc/pocket';
import { PUSH_NO_KEY } from '@shared/push-copy';
import type { ApnsKeyStore, ApnsProviderKey } from '../../credentials/apns-key';
import type { PocketHost } from '../../pocket/ipc';
import type { PocketPushDestination } from '../../pocket/pairing';
import type { ApnsSender } from '../../push/apns';

// ---------------------------------------------------------------------------
// The fence (Phase 314's I2, as `../../push/__tests__/apns.test.ts` has it)
// ---------------------------------------------------------------------------

const fence = vi.hoisted(() => ({ hits: [] as string[] }));

vi.mock('node:http2', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:http2')>();
  const fenced = (authority: string | URL, ...rest: unknown[]): unknown => {
    let host = '';
    try {
      host = new URL(String(authority)).hostname;
    } catch {
      host = String(authority);
    }
    if (host !== '127.0.0.1' && host !== '[::1]') {
      fence.hits.push(host);
      throw new Error('[p3165 fence] this file reaches nothing but 127.0.0.1');
    }
    return (original.connect as (...args: unknown[]) => unknown)(authority, ...rest);
  };
  return { ...original, connect: fenced };
});

// ---------------------------------------------------------------------------
// Electron, the log, the feed and the modules the push seam would compose
// ---------------------------------------------------------------------------

const electron = vi.hoisted(() => ({
  userData: '/nowhere',
  mock: false,
  panels: [] as unknown[][],
  panelAnswer: { canceled: true, filePaths: [] as string[] }
}));

vi.mock('electron', () => ({
  app: {
    getPath: () => electron.userData,
    commandLine: { hasSwitch: (name: string) => name === 'use-mock-keychain' && electron.mock }
  },
  BrowserWindow: { fromWebContents: () => null, getAllWindows: () => [] },
  dialog: {
    showOpenDialog: async (...args: unknown[]) => {
      electron.panels.push(args);
      return electron.panelAnswer;
    }
  }
}));

const logged = vi.hoisted(() => [] as string[]);

vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const capture =
    (level: string) =>
    (msg: string, fields?: Record<string, unknown>): void => {
      logged.push(JSON.stringify([level, msg, fields ?? null]));
    };
  return {
    ...real,
    getLog: () => ({ error: capture('error'), warn: capture('warn'), info: capture('info'), debug: capture('debug') })
  };
});

const feed = vi.hoisted(() => ({ listeners: new Set<() => void>(), subscribed: 0 }));

vi.mock('../../tray/blocked-feed', () => ({
  blockedSinceMap: () => new Map(),
  installBlockedFeed: () => undefined,
  onBlockedChange: (listener: () => void) => {
    feed.subscribed += 1;
    feed.listeners.add(listener);
    return () => {
      feed.listeners.delete(listener);
    };
  }
}));

const composed = vi.hoisted(() => ({ core: 0, appStore: 0 }));

// THE SENDER'S OPTIONS, as the composition hands them (the 316.5 fix round):
// a pass-through, except that a test may put a sender that dials nothing in
// place of the one built, so a person's launch can be read with no socket.
const senders = vi.hoisted(() => ({ options: [] as { origin(env: string): string; allowRemote?: boolean }[], standIn: null as unknown }));
vi.mock('../../push/apns', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../push/apns')>();
  return {
    ...original,
    createApnsSender: (options: Parameters<typeof original.createApnsSender>[0]) => {
      senders.options.push(options);
      return (senders.standIn as ReturnType<typeof original.createApnsSender> | null) ?? original.createApnsSender(options);
    }
  };
});

// THE CORE IS NEVER ASKED FOR by the composition (conformance:push P1): a call
// here is counted and every test asserts zero.
vi.mock('../../sessions', () => ({
  getGmuxCore: () => {
    composed.core += 1;
    return new Promise(() => undefined);
  }
}));
vi.mock('../../credentials', () => ({
  APNS_KEY_SLOT: 'apns-provider',
  apnsKeyDir: () => '/nowhere/push',
  apnsKeyStoreForApp: () => {
    composed.appStore += 1;
    throw new Error('p3165: the app store is not reached by a test that hands its own');
  }
}));
vi.mock('../../agents/registry', () => ({ getRegistryEntry: () => ({ displayName: 'Claude Code' }) }));
vi.mock('../../pocket/ipc', () => ({ PocketHost: class {} }));
vi.mock('../../pocket/pairing', () => ({
  pocketConfirmStatus: () => ({ state: 'never', lines: [], hash: '' }),
  readPocketStore: () => ({ store: null, sealKnown: true }),
  sealPresentationAsPhone: () => Buffer.alloc(0)
}));
vi.mock('../../pocket/routes', () => ({ createPocketRoutes: () => ({}) }));
vi.mock('../../pocket/funnel', () => ({ resolveFunnelProgram: () => null }));
vi.mock('../../pocket/public-name', () => ({ nameServersFrom: () => ({ kind: 'system' }) }));

const { createPhoneAlerts, beginPhoneAlertsShutdown, joinPhoneAlerts, PHONE_ALERTS_JOIN_MS } = await import('../index');
const { KEY_NAME_REFUSED, KEY_PICK_MESSAGE, PHONE_APP_TEAM, PHONE_APP_TOPIC } = await import('../key-file');
const { createApnsSender } = await import('../../push/apns');
const { COALESCE_MS } = await import('../../push/engine');
const { WakeMark } = await import('../../power/wake-mark');
const { drivableMonitor } = await import('../../power/drivable-monitor');

// ---------------------------------------------------------------------------
// The stand-in: Apple, on loopback, recording what it was sent
// ---------------------------------------------------------------------------

interface Seen {
  readonly path: string;
  readonly headers: IncomingHttpHeaders;
  readonly body: string;
}

interface StandIn {
  readonly origin: string;
  readonly seen: Seen[];
  close(): Promise<void>;
}

const standIns: StandIn[] = [];

async function startStandIn(answer: { status: number; reason?: string } = { status: 200 }): Promise<StandIn> {
  const server = createServer();
  const live = new Set<ServerHttp2Session>();
  const seen: Seen[] = [];
  server.on('session', (session) => {
    live.add(session);
    session.on('close', () => live.delete(session));
    session.on('error', () => undefined);
  });
  server.on('stream', (stream, headers) => {
    const chunks: Buffer[] = [];
    stream.on('error', () => undefined);
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => {
      seen.push({ path: String(headers[':path']), headers, body: Buffer.concat(chunks).toString('utf8') });
      stream.respond({ ':status': answer.status, 'apns-id': randomUUID() });
      stream.end(answer.reason === undefined ? undefined : JSON.stringify({ reason: answer.reason }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const standIn: StandIn = {
    origin: `http://127.0.0.1:${String((server.address() as AddressInfo).port)}`,
    seen,
    close: async () => {
      for (const session of live) session.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  };
  standIns.push(standIn);
  return standIn;
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function scratchKey(keyId = 'P3165SCRAT'): { key: ApnsProviderKey; publicKey: KeyObject } {
  const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return {
    key: {
      keyId,
      teamId: PHONE_APP_TEAM,
      topic: PHONE_APP_TOPIC,
      p8: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    },
    publicKey: pair.publicKey
  };
}

function destination(environment: 'development' | 'production'): PocketPushDestination {
  const token = randomBytes(32).toString('hex');
  return { phoneId: `phone-${environment}`, token, environment, tokenDigest: `digest-${token.slice(0, 8)}` };
}

function row(sessionId: string): PocketBlockedRow {
  return {
    sessionId,
    name: `session ${sessionId}`,
    project: 'webapp',
    machine: null,
    agent: 'claude',
    agentLabel: 'Claude Code',
    statusLabel: 'needs input',
    statusTitle: 'Needs input',
    ageText: 'now',
    statusDot: 'attention',
    question: 'p3165 canary: may I?',
    choices: [],
    blockedSince: Date.now(),
    seenAtWake: false
  };
}

/** A key store in memory that counts what it was asked. */
function memoryKeys(initial: ApnsProviderKey | null = null): ApnsKeyStore & {
  reads: number;
  kept: ApnsProviderKey[];
  forgets: number;
  readGate: Promise<void> | null;
  refuse: string | null;
} {
  let held = initial;
  const store = {
    reads: 0,
    kept: [] as ApnsProviderKey[],
    forgets: 0,
    readGate: null as Promise<void> | null,
    refuse: null as string | null,
    keep: async (key: ApnsProviderKey) => {
      if (store.refuse !== null) return { ok: false as const, reason: store.refuse, field: 'p8' as const };
      store.kept.push(key);
      held = key;
      return { ok: true as const };
    },
    read: async () => {
      store.reads += 1;
      // What the file held when the read began: a keep that lands while the
      // read is in flight does not change what that read answers.
      const value = held;
      const gate = store.readGate;
      if (gate !== null) await gate;
      return value;
    },
    forget: async () => {
      store.forgets += 1;
      held = null;
    }
  };
  return store;
}

/** A sender that records and answers 200, or the shipping one when a test builds it. */
function recordingSender(): ApnsSender & { sends: string[]; closes: number; closeGate: Promise<void> | null } {
  const sender = {
    sends: [] as string[],
    closes: 0,
    closeGate: null as Promise<void> | null,
    send: async (_key: ApnsProviderKey, request: { token: string }) => {
      sender.sends.push(request.token);
      return { ok: true as const };
    },
    close: async () => {
      sender.closes += 1;
      if (sender.closeGate !== null) await sender.closeGate;
    }
  };
  return sender;
}

interface FakeHost {
  destinations: PocketPushDestination[];
  announces: number;
  dropped: string[];
  host: PocketHost;
}

function fakeHost(destinations: PocketPushDestination[] = []): FakeHost {
  const fake: FakeHost = {
    destinations,
    announces: 0,
    dropped: [],
    host: undefined as unknown as PocketHost
  };
  fake.host = {
    pushDestinations: () => fake.destinations,
    dropPushToken: (digest: string) => {
      fake.dropped.push(digest);
    },
    announce: () => {
      fake.announces += 1;
    }
  } as unknown as PocketHost;
  return fake;
}

function deferred(): { promise: Promise<void>; resolve: () => void; calls: number; ready: () => Promise<void> } {
  let resolve = (): void => undefined;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  const d = {
    promise,
    resolve: () => resolve(),
    calls: 0,
    ready: async () => {
      d.calls += 1;
      await promise;
    }
  };
  return d;
}

/** Let the chain, and everything it scheduled on the microtask queue, run. */
async function drained(): Promise<void> {
  for (let i = 0; i < 12; i += 1) await new Promise((resolve) => setImmediate(resolve));
}

const linesSaying = (text: string): number => logged.filter((l) => l.includes(text)).length;
const wake = (): InstanceType<typeof WakeMark> => new WakeMark(drivableMonitor());

let scratch = '';

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'p3165-alerts-'));
  logged.length = 0;
  feed.listeners.clear();
  feed.subscribed = 0;
  composed.core = 0;
  composed.appStore = 0;
  senders.options.length = 0;
  senders.standIn = null;
  electron.userData = '/nowhere';
  electron.mock = false;
  electron.panels.length = 0;
  electron.panelAnswer = { canceled: true, filePaths: [] };
});

afterEach(async () => {
  // THE FINALLY: the module's one instance is shut and joined, and every
  // stand-in this file opened is closed, whatever the test did.
  vi.useRealTimers();
  try {
    beginPhoneAlertsShutdown();
    await joinPhoneAlerts();
  } finally {
    for (const standIn of standIns.splice(0)) await standIn.close();
    vi.unstubAllEnvs();
    rmSync(scratch, { recursive: true, force: true });
  }
  // THE FENCE saw nothing, and nothing asked for the core.
  expect(fence.hits.splice(0)).toEqual([]);
  expect(composed.core).toBe(0);
});

// ---------------------------------------------------------------------------
// Inert until the door answers a destination
// ---------------------------------------------------------------------------

describe('never armed', () => {
  it('composes NOTHING: no wait for the core, no sender, no subscription and no key read', async () => {
    // Fails if the step composes on anything but a destination the door answers.
    const door = fakeHost([]);
    const ready = deferred();
    const keys = memoryKeys(scratchKey().key);
    const makeSender = vi.fn(recordingSender);
    const alerts = createPhoneAlerts({ host: () => door.host, ready: ready.ready, rows: () => [row('a')], wake: wake(), keys, makeSender });
    alerts.rearm();
    alerts.port.changed();
    alerts.port.changed();
    await drained();
    expect(ready.calls).toBe(0);
    expect(makeSender).not.toHaveBeenCalled();
    expect(feed.subscribed).toBe(0);
    expect(keys.reads).toBe(0);
    expect(composed.appStore).toBe(0);
    expect(alerts.port.sentence()).toBeNull();
    expect(linesSaying('phone alerts armed')).toBe(0);
  });

  it('with no door at all is the same nothing', async () => {
    const ready = deferred();
    const makeSender = vi.fn(recordingSender);
    const alerts = createPhoneAlerts({ host: () => null, ready: ready.ready, rows: () => [], wake: wake(), keys: memoryKeys(), makeSender });
    alerts.rearm();
    await drained();
    expect(ready.calls).toBe(0);
    expect(makeSender).not.toHaveBeenCalled();
  });
});

describe('arming', () => {
  it('composes ONCE, only after the door’s wait for the core, and seeds silently', async () => {
    // Fails if the engine is built before `ready` (P1a), if the first observe
    // is not the seed (a row already waiting would be announced), or if a
    // second sender is built.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const door = fakeHost([destination('development')]);
    const ready = deferred();
    const sender = recordingSender();
    const makeSender = vi.fn(() => sender);
    let rows = [row('already-waiting')];
    const alerts = createPhoneAlerts({ host: () => door.host, ready: ready.ready, rows: () => rows, wake: wake(), keys: memoryKeys(scratchKey().key), makeSender });
    alerts.rearm();
    await drained();
    expect(ready.calls).toBe(1);
    expect(makeSender).not.toHaveBeenCalled();
    expect(feed.subscribed).toBe(0);
    ready.resolve();
    await drained();
    expect(makeSender).toHaveBeenCalledTimes(1);
    expect(feed.listeners.size).toBe(1);
    expect(linesSaying('phone alerts armed')).toBe(1);
    expect(door.announces).toBeGreaterThan(0);
    // The row that was waiting when the alerts armed is never announced.
    for (const listener of feed.listeners) listener();
    await vi.advanceTimersByTimeAsync(COALESCE_MS * 3);
    await drained();
    expect(sender.sends).toEqual([]);
    // A row that starts waiting now is.
    rows = [...rows, row('new')];
    for (const listener of feed.listeners) listener();
    await vi.advanceTimersByTimeAsync(COALESCE_MS + 100);
    await drained();
    expect(sender.sends).toEqual([door.destinations[0]?.token]);
  });

  it('asks again after the core: a Remove that lands while it waits composes nothing', async () => {
    // Fails if the second ask after `ready` is removed (P1b).
    const door = fakeHost([destination('production')]);
    const ready = deferred();
    const makeSender = vi.fn(recordingSender);
    const alerts = createPhoneAlerts({ host: () => door.host, ready: ready.ready, rows: () => [], wake: wake(), keys: memoryKeys(), makeSender });
    alerts.rearm();
    await drained();
    door.destinations = [];
    ready.resolve();
    await drained();
    expect(makeSender).not.toHaveBeenCalled();
    expect(feed.subscribed).toBe(0);
  });

  it('a re-arm while one is pending composes once', async () => {
    // Fails if the chain stops being serial, or a step composes over an engine that exists.
    const door = fakeHost([destination('development')]);
    const ready = deferred();
    const makeSender = vi.fn(recordingSender);
    const alerts = createPhoneAlerts({ host: () => door.host, ready: ready.ready, rows: () => [], wake: wake(), keys: memoryKeys(), makeSender });
    alerts.rearm();
    alerts.rearm();
    alerts.port.changed();
    alerts.port.changed();
    await drained();
    ready.resolve();
    await drained();
    expect(makeSender).toHaveBeenCalledTimes(1);
    expect(feed.subscribed).toBe(1);
    expect(linesSaying('phone alerts armed')).toBe(1);
  });

  for (const cause of ['a Remove', 'alerts off', 'a changed agreement']) {
    it(`disarms on ${cause}: the feed is let go and the sender closed, and a re-arm is a fresh engine`, async () => {
      // To the composition every cause is one fact: the door answers no
      // destination (ipc.test.ts proves each cause empties it and asks the
      // port again). Fails if the disarm arm is removed or stops joining.
      const door = fakeHost([destination('production')]);
      const senders: ReturnType<typeof recordingSender>[] = [];
      const makeSender = vi.fn(() => {
        const s = recordingSender();
        senders.push(s);
        return s;
      });
      const alerts = createPhoneAlerts({ host: () => door.host, ready: async () => undefined, rows: () => [], wake: wake(), keys: memoryKeys(), makeSender });
      alerts.rearm();
      await drained();
      expect(feed.listeners.size).toBe(1);
      const announcedBefore = door.announces;
      door.destinations = [];
      alerts.port.changed();
      await drained();
      expect(feed.listeners.size).toBe(0);
      expect(senders[0]?.closes).toBe(1);
      expect(linesSaying('phone alerts disarmed')).toBe(1);
      expect(door.announces).toBeGreaterThan(announcedBefore);
      expect(alerts.port.sentence()).toBeNull();
      door.destinations = [destination('production')];
      alerts.port.changed();
      await drained();
      expect(makeSender).toHaveBeenCalledTimes(2);
      expect(feed.listeners.size).toBe(1);
    });
  }
});

// ---------------------------------------------------------------------------
// The quit
// ---------------------------------------------------------------------------

describe('the quit', () => {
  it('begin closes admission SYNCHRONOUSLY, and join closes the sender', async () => {
    // Fails if begin stops unsubscribing, or join stops joining the engine.
    const door = fakeHost([destination('development')]);
    const sender = recordingSender();
    const makeSender = vi.fn(() => sender);
    const alerts = createPhoneAlerts({ host: () => door.host, ready: async () => undefined, rows: () => [], wake: wake(), keys: memoryKeys(), makeSender });
    alerts.rearm();
    await drained();
    expect(feed.listeners.size).toBe(1);
    beginPhoneAlertsShutdown();
    expect(feed.listeners.size).toBe(0);
    // Nothing is composed after the begin.
    door.destinations = [];
    alerts.rearm();
    door.destinations = [destination('production')];
    alerts.rearm();
    await joinPhoneAlerts();
    expect(sender.closes).toBe(1);
    expect(makeSender).toHaveBeenCalledTimes(1);
  });

  it('never waits for a step parked on a core that will not come', async () => {
    // A launch that opens no window never answers `ready`. Fails if the join
    // waits for the parked step (the quit would take PHONE_ALERTS_JOIN_MS).
    const door = fakeHost([destination('development')]);
    const ready = deferred();
    const makeSender = vi.fn(recordingSender);
    const alerts = createPhoneAlerts({ host: () => door.host, ready: ready.ready, rows: () => [], wake: wake(), keys: memoryKeys(), makeSender });
    alerts.rearm();
    await drained();
    const started = Date.now();
    beginPhoneAlertsShutdown();
    await joinPhoneAlerts();
    expect(Date.now() - started).toBeLessThan(500);
    ready.resolve();
    await drained();
    expect(makeSender).not.toHaveBeenCalled();
  });

  it('is bounded at PHONE_ALERTS_JOIN_MS when a step never settles, and says so in one line of counts', async () => {
    // Fails if the bound is removed: the join would wait forever on a sender
    // whose close never ends.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const door = fakeHost([destination('development')]);
    const sender = recordingSender();
    const alerts = createPhoneAlerts({ host: () => door.host, ready: async () => undefined, rows: () => [], wake: wake(), keys: memoryKeys(), makeSender: () => sender });
    alerts.rearm();
    await drained();
    sender.closeGate = new Promise(() => undefined);
    door.destinations = [];
    alerts.rearm();
    await drained();
    let joined = false;
    beginPhoneAlertsShutdown();
    const joining = joinPhoneAlerts().then(() => {
      joined = true;
    });
    await vi.advanceTimersByTimeAsync(PHONE_ALERTS_JOIN_MS - 10);
    expect(joined).toBe(false);
    await vi.advanceTimersByTimeAsync(20);
    // The engine's own join is bounded too; let it pass.
    await vi.advanceTimersByTimeAsync(4_000);
    await joining;
    expect(joined).toBe(true);
    const line = logged.find((l) => l.includes('settled phone alerts'));
    expect(line).toContain('NOT joined');
    expect(line).not.toMatch(/token|p8|BEGIN/i);
  });
});

// ---------------------------------------------------------------------------
// A block, sent
// ---------------------------------------------------------------------------

describe('a block', () => {
  it('sends exactly one request per destination, each at its own environment’s origin', async () => {
    // Fails if the engine stops being handed each destination's environment,
    // or the feed stops reaching `observe`.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const dev = await startStandIn();
    const prod = await startStandIn();
    const door = fakeHost([destination('development'), destination('production')]);
    const sender = createApnsSender({ origin: (env) => (env === 'development' ? dev.origin : prod.origin) });
    let rows: PocketBlockedRow[] = [];
    const alerts = createPhoneAlerts({
      host: () => door.host,
      ready: async () => undefined,
      rows: () => rows,
      wake: wake(),
      keys: memoryKeys(scratchKey().key),
      makeSender: () => sender
    });
    alerts.rearm();
    await drained();
    rows = [row('s-p3165')];
    for (const listener of feed.listeners) listener();
    await vi.advanceTimersByTimeAsync(COALESCE_MS + 100);
    await vi.waitFor(() => {
      expect(dev.seen.length + prod.seen.length).toBe(2);
    });
    const [devDest, prodDest] = door.destinations;
    expect(dev.seen.map((s) => s.path)).toEqual([`/3/device/${String(devDest?.token)}`]);
    expect(prod.seen.map((s) => s.path)).toEqual([`/3/device/${String(prodDest?.token)}`]);
    for (const seen of [...dev.seen, ...prod.seen]) {
      expect(seen.headers['apns-topic']).toBe(PHONE_APP_TOPIC);
      const body = JSON.parse(seen.body) as { aps: { 'thread-id': string }; tortie: { v: number; session: string } };
      expect(body.tortie).toEqual({ v: 1, session: 's-p3165' });
      expect(body.aps['thread-id']).toBe('s-p3165');
      expect(seen.body).not.toContain('canary');
    }
    // And nothing more.
    await vi.advanceTimersByTimeAsync(COALESCE_MS * 2);
    await drained();
    expect(dev.seen.length + prod.seen.length).toBe(2);
    expect(logged.join('\n')).not.toContain(String(devDest?.token));
  });

  it('says the engine’s sentence once and redraws the sheet: no key kept', async () => {
    // Fails if `say` stops announcing, or the port stops reading the engine's sentence.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const door = fakeHost([destination('production')]);
    const sender = recordingSender();
    let rows: PocketBlockedRow[] = [];
    const alerts = createPhoneAlerts({ host: () => door.host, ready: async () => undefined, rows: () => rows, wake: wake(), keys: memoryKeys(null), makeSender: () => sender });
    alerts.rearm();
    await drained();
    const before = door.announces;
    rows = [row('s1')];
    for (const listener of feed.listeners) listener();
    await vi.advanceTimersByTimeAsync(COALESCE_MS + 100);
    await drained();
    expect(sender.sends).toEqual([]);
    expect(alerts.port.sentence()).toBe(PUSH_NO_KEY);
    expect(door.announces).toBeGreaterThan(before);
    expect(linesSaying(PUSH_NO_KEY)).toBe(1);
  });

  for (const [what, answer] of [
    ['410 Unregistered', { status: 410, reason: 'Unregistered' }],
    ['400 BadDeviceToken', { status: 400, reason: 'BadDeviceToken' }]
  ] as const) {
    it(`a token Apple calls dead (${what}) reaches the door's durable drop, by its digest`, async () => {
      // Fails if the composition's `drop` stops reaching host.dropPushToken
      // (the 316.5 fix round's V3: the engine's in-run dead set hid it until a
      // relaunch, after which Tortie sent to a token Apple called gone).
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
      const apple = await startStandIn(answer);
      const dead = destination('production');
      const door = fakeHost([dead]);
      const sender = createApnsSender({ origin: () => apple.origin });
      let rows: PocketBlockedRow[] = [];
      const alerts = createPhoneAlerts({ host: () => door.host, ready: async () => undefined, rows: () => rows, wake: wake(), keys: memoryKeys(scratchKey().key), makeSender: () => sender });
      alerts.rearm();
      await drained();
      rows = [row('s-dead')];
      for (const listener of feed.listeners) listener();
      await vi.advanceTimersByTimeAsync(COALESCE_MS + 100);
      await vi.waitFor(() => {
        expect(door.dropped).toEqual([dead.tokenDigest]);
      });
      expect(apple.seen.map((x) => x.path)).toEqual([`/3/device/${dead.token}`]);
      expect(logged.join('\n')).not.toContain(dead.token);
    });
  }
});

// ---------------------------------------------------------------------------
// The one default sender
// ---------------------------------------------------------------------------

describe('the default sender (the ONE test that builds it, under GMUX_PROBES=1)', () => {
  it('in a harness launch refuses Apple before any socket, and with the override reaches each environment’s stand-in', async () => {
    // Fails if `allowRemote` stops being `!isHarnessLaunch(process.env)` (the
    // first leg would dial Apple and hit the fence), or if the origin stops
    // reading each environment (the second leg's two stand-ins would not each
    // see their own).
    vi.stubEnv('GMUX_PROBES', '1');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

    // LEG 1: no override. Apple's host, refused as not this Mac, and nothing dialled.
    {
      const door = fakeHost([destination('production')]);
      let rows: PocketBlockedRow[] = [];
      const alerts = createPhoneAlerts({ host: () => door.host, ready: async () => undefined, rows: () => rows, wake: wake(), keys: memoryKeys(scratchKey().key) });
      alerts.rearm();
      await drained();
      rows = [row('s1')];
      for (const listener of feed.listeners) listener();
      await vi.advanceTimersByTimeAsync(COALESCE_MS + 100);
      await drained();
      expect(linesSaying('not built to reach Apple')).toBe(1);
      expect(fence.hits).toEqual([]);
      beginPhoneAlertsShutdown();
      await vi.advanceTimersByTimeAsync(10);
      await joinPhoneAlerts();
    }

    // LEG 2: the harness override names two loopback origins.
    {
      const harness = join(scratch, 'harness');
      const dir = join(harness, 'alerts');
      mkdirSync(join(harness, 'profile'), { recursive: true });
      mkdirSync(dir, { recursive: true });
      const dev = await startStandIn();
      const prod = await startStandIn();
      writeFileSync(join(dir, 'alerts.json'), JSON.stringify({ origins: { development: dev.origin, production: prod.origin } }));
      vi.stubEnv('GMUX_HARNESS_ALERTS', dir);
      vi.stubEnv('GMUX_HARNESS_DIR', harness);
      electron.userData = join(harness, 'profile');
      electron.mock = true;
      const door = fakeHost([destination('development'), destination('production')]);
      let rows: PocketBlockedRow[] = [];
      const alerts = createPhoneAlerts({ host: () => door.host, ready: async () => undefined, rows: () => rows, wake: wake(), keys: memoryKeys(scratchKey().key) });
      alerts.rearm();
      await drained();
      rows = [row('s2')];
      for (const listener of feed.listeners) listener();
      await vi.advanceTimersByTimeAsync(COALESCE_MS + 100);
      await vi.waitFor(() => {
        expect(dev.seen.length + prod.seen.length).toBe(2);
      });
      expect(dev.seen.map((s) => s.path)).toEqual([`/3/device/${String(door.destinations[0]?.token)}`]);
      expect(prod.seen.map((s) => s.path)).toEqual([`/3/device/${String(door.destinations[1]?.token)}`]);
    }
  });
});

describe('a person’s launch (the default sender, read with nothing dialled)', () => {
  it('hands the sender Apple’s host BY EACH TOKEN’S ENVIRONMENT, with remote allowed', async () => {
    // Fails if the origin stops being `apnsOrigin(<the environment asked>)`
    // (the 316.5 fix round's V1: `apnsOrigin('production')` sent every
    // development token to the production host, answered BadDeviceToken and
    // dropped, with every gate green), or if a person's launch stops allowing
    // Apple. The sender built is replaced by one that dials nothing, so the
    // hosts are read, never reached; the fence would catch a dial all the same.
    senders.standIn = recordingSender();
    const door = fakeHost([destination('development'), destination('production')]);
    const alerts = createPhoneAlerts({ host: () => door.host, ready: async () => undefined, rows: () => [], wake: wake(), keys: memoryKeys(scratchKey().key) });
    alerts.rearm();
    await drained();
    expect(senders.options).toHaveLength(1);
    const options = senders.options[0];
    expect(options?.allowRemote).toBe(true);
    expect(options?.origin('development')).toBe('https://api.sandbox.push.apple.com:443');
    expect(options?.origin('production')).toBe('https://api.push.apple.com:443');
    expect(fence.hits).toEqual([]);
  });

  it('a harness launch with no override hands Apple’s hosts with remote REFUSED', async () => {
    // The pair of the test above: the same composition under GMUX_PROBES=1.
    vi.stubEnv('GMUX_PROBES', '1');
    senders.standIn = recordingSender();
    const door = fakeHost([destination('production')]);
    const alerts = createPhoneAlerts({ host: () => door.host, ready: async () => undefined, rows: () => [], wake: wake(), keys: memoryKeys(scratchKey().key) });
    alerts.rearm();
    await drained();
    expect(senders.options.map((o) => o.allowRemote)).toEqual([false]);
  });
});

// ---------------------------------------------------------------------------
// The Apple push key's port
// ---------------------------------------------------------------------------

describe('the key’s port', () => {
  it('reads the key id LAZILY: once, on the first ask, answered by an announce', async () => {
    // Fails if the id is read at composition (a person who never opens the
    // sheet would read the store), or read on every status.
    const door = fakeHost([]);
    const keys = memoryKeys(scratchKey('ABCDE12345').key);
    let gate = (): void => undefined;
    keys.readGate = new Promise<void>((resolve) => {
      gate = resolve;
    });
    const alerts = createPhoneAlerts({ host: () => door.host, ready: async () => undefined, rows: () => [], wake: wake(), keys, makeSender: recordingSender });
    await drained();
    expect(keys.reads).toBe(0);
    expect(alerts.port.keyId()).toBeNull();
    expect(alerts.port.keyId()).toBeNull();
    await drained();
    expect(alerts.port.keyId()).toBeNull();
    expect(keys.reads).toBe(1);
    const before = door.announces;
    gate();
    await drained();
    expect(alerts.port.keyId()).toBe('ABCDE12345');
    expect(door.announces).toBe(before + 1);
    expect(keys.reads).toBe(1);
  });

  it('a key kept while the first read is in flight is not overwritten by that read', async () => {
    const door = fakeHost([]);
    const keys = memoryKeys(scratchKey('OLDKEY0001').key);
    let gate = (): void => undefined;
    keys.readGate = new Promise<void>((resolve) => {
      gate = resolve;
    });
    const path = join(scratch, 'AuthKey_NEWKEY0001.p8');
    writeFileSync(path, scratchKey().key.p8, { mode: 0o600 });
    const alerts = createPhoneAlerts({ host: () => door.host, ready: async () => undefined, rows: () => [], wake: wake(), keys, makeSender: recordingSender, pickFile: async () => path });
    expect(alerts.port.keyId()).toBeNull();
    expect(await alerts.port.chooseKey({} as never)).toEqual({ kept: true, refusal: null });
    gate();
    await drained();
    expect(alerts.port.keyId()).toBe('NEWKEY0001');
  });

  it('chooses through the harness key file with NO panel, and keeps the compiled team and topic', async () => {
    // Fails if a harness launch opens the native panel, or the key id stops
    // coming from Apple's own file name.
    const harness = join(scratch, 'harness');
    const dir = join(harness, 'alerts');
    mkdirSync(join(harness, 'profile'), { recursive: true });
    mkdirSync(dir, { recursive: true });
    const { key } = scratchKey();
    const keyFile = join(dir, 'AuthKey_P3165SCRAT.p8');
    writeFileSync(keyFile, key.p8, { mode: 0o600 });
    writeFileSync(join(dir, 'alerts.json'), JSON.stringify({ origins: { development: 'http://127.0.0.1:9', production: 'http://127.0.0.1:9' }, keyFile }));
    vi.stubEnv('GMUX_PROBES', '1');
    vi.stubEnv('GMUX_HARNESS_ALERTS', dir);
    vi.stubEnv('GMUX_HARNESS_DIR', harness);
    electron.userData = join(harness, 'profile');
    electron.mock = true;
    const door = fakeHost([]);
    const keys = memoryKeys();
    const alerts = createPhoneAlerts({ host: () => door.host, ready: async () => undefined, rows: () => [], wake: wake(), keys, makeSender: recordingSender });
    const before = door.announces;
    expect(await alerts.port.chooseKey({} as never)).toEqual({ kept: true, refusal: null });
    expect(electron.panels).toEqual([]);
    expect(keys.kept).toEqual([{ keyId: 'P3165SCRAT', teamId: PHONE_APP_TEAM, topic: PHONE_APP_TOPIC, p8: key.p8 }]);
    expect(alerts.port.keyId()).toBe('P3165SCRAT');
    expect(door.announces).toBe(before + 1);
    expect(logged.join('\n')).not.toContain('BEGIN');
  });

  it('a harness launch with NO override opens no panel and answers nothing chosen, at once', async () => {
    // Fails if a harness launch without GMUX_HARNESS_ALERTS reaches the native
    // file panel (the 316.5 fix round: probe:p313's census pressed
    // pocket:choosePushKey, a real panel opened on his screen that nobody
    // answered, and the probe never finished).
    vi.stubEnv('GMUX_PROBES', '1');
    const door = fakeHost([]);
    const keys = memoryKeys();
    const alerts = createPhoneAlerts({ host: () => door.host, ready: async () => undefined, rows: () => [], wake: wake(), keys, makeSender: recordingSender });
    expect(await alerts.port.chooseKey({} as never)).toEqual({ kept: false, refusal: null });
    expect(electron.panels).toEqual([]);
    expect(keys.kept).toEqual([]);
    expect(alerts.port.keyId()).toBeNull();
  });

  it('a person’s launch opens the native panel with the pinned message, and a cancel keeps nothing', async () => {
    const door = fakeHost([]);
    const keys = memoryKeys();
    const alerts = createPhoneAlerts({ host: () => door.host, ready: async () => undefined, rows: () => [], wake: wake(), keys, makeSender: recordingSender });
    expect(await alerts.port.chooseKey({} as never)).toEqual({ kept: false, refusal: null });
    expect(electron.panels).toHaveLength(1);
    const options = electron.panels[0]?.at(-1) as { message: string; properties: string[] };
    expect(options.message).toBe(KEY_PICK_MESSAGE);
    expect(options.properties).toEqual(['openFile']);
    expect(keys.kept).toEqual([]);
  });

  it('answers a misnamed file and a refused keep with their own sentences, and keeps nothing', async () => {
    const door = fakeHost([]);
    const keys = memoryKeys();
    const misnamed = join(scratch, 'key.p8');
    writeFileSync(misnamed, scratchKey().key.p8, { mode: 0o600 });
    let picked = misnamed;
    const alerts = createPhoneAlerts({ host: () => door.host, ready: async () => undefined, rows: () => [], wake: wake(), keys, makeSender: recordingSender, pickFile: async () => picked });
    expect(await alerts.port.chooseKey({} as never)).toEqual({ kept: false, refusal: KEY_NAME_REFUSED });
    picked = join(scratch, 'AuthKey_REFUSED001.p8');
    writeFileSync(picked, 'not a key\n', { mode: 0o600 });
    keys.refuse = 'The Apple push key was not kept, because its key is not a P-256 private key in a PKCS#8 file. Nothing was changed.';
    expect(await alerts.port.chooseKey({} as never)).toEqual({ kept: false, refusal: keys.refuse });
    expect(keys.kept).toEqual([]);
  });

  it('forgets: the store is emptied, the id is null and the sheet redraws', async () => {
    const door = fakeHost([]);
    const keys = memoryKeys(scratchKey('ABCDE12345').key);
    const alerts = createPhoneAlerts({ host: () => door.host, ready: async () => undefined, rows: () => [], wake: wake(), keys, makeSender: recordingSender });
    alerts.port.keyId();
    await drained();
    expect(alerts.port.keyId()).toBe('ABCDE12345');
    const before = door.announces;
    await alerts.port.forgetKey();
    expect(keys.forgets).toBe(1);
    expect(alerts.port.keyId()).toBeNull();
    expect(door.announces).toBe(before + 1);
  });
});
