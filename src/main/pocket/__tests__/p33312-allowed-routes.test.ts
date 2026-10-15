/**
 * The routes a person ALLOWED (Phase 333.12, build/p33312/SPEC.md §4, §5.1 to
 * §5.5, §9.2 rows C1 to C11), driven through the SHIPPING `PocketHost`.
 *
 * WHAT A WAITING ROUTE IS, HERE. No build has a route outside the eleven yet,
 * so this file makes one: `../door/table` is mocked to hold a MUTABLE copy of
 * the real table, to which {@link plant} appends the read route `probe`
 * (`GET /v1/probe`, the app run's own plant, build/p33312/SPEC.md §7.2), and
 * `../route-ledger` is mocked to list `probe` as an id some build shipped.
 * Everything else is the shipping code: the host, the pairing owner, the
 * store, the confirm record, the gate, the push's destinations.
 *
 * THE MOCKS ARE `./ipc.test.ts`'s, cut down: `electron` with a reversible
 * seal that RECORDS which seal each write went under (so the record-then-store
 * order is read from the writes themselves, and a store write can be made to
 * fail alone), `../bind` as booleans that record every start's input and every
 * update (the served set among them), and Tailscale as an in-memory stand-in.
 * Nothing binds a socket, nothing execs a program, nothing reads his home.
 *
 * Each row is red if its clause is taken out of the shipping code:
 *   C1  `allowedRoutesOf` reads WHOLE or null; the four pure sets.
 *   C2  a 0.111.x store and its record hash as they did, read through fields().
 *   C3  a first Allow allows the build's whole table, and writes the allowed
 *       set only when the table is not the eleven.
 *   C4  an update that adds a route: confirmed, published, alerts, the route
 *       waiting and never served.
 *   C5  Allow while a route waits: the record, THEN the store, then one update
 *       of the served set, and no restart.
 *   C6  the same with the store write failing: refused with its sentence,
 *       `changed`, closed, and the route never served.
 *   C6b the same with the RECORD failing to seal (the fix round, lens 1's
 *       K18): no store write at all, the allowed set unchanged on disk and in
 *       memory, the route not served by main, no routes update for the door,
 *       and the door as it was.
 *   C7  the allowed set's own hash handed to Allow while a route waits is
 *       refused and records nothing.
 *   C8  the pairing Allow never allows a waiting route (his answer 10).
 *   C9  alerts off narrows in main while a route waits, with no stop; on a
 *       `changed` door it records nothing.
 *   C10 Remove of one of two keeps the other (his answer 9); of the only one,
 *       withdraws.
 *   C11 a downgrade that dropped the field reads `changed`, and never serves
 *       the route.
 *   C11b the one state D21 names where the store's set is wider than the
 *       record's (the fix round, lens 1's nit): an older Mac's Allow over the
 *       eleven that wrote no store. It reads `changed`, so no door opens and
 *       nothing reaches the served answer, and the Allow that reopens it names
 *       the route.
 */

import { EventEmitter } from 'node:events';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCipheriv, createHash, generateKeyPairSync, hkdfSync, randomBytes, sign as signWith, type KeyObject } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PocketRouteId } from '@shared/ipc/pocket';
import type { FunnelChild, FunnelDeps } from '../funnel';
import type { PocketSealedPresentation } from '../pairing';
import type { PocketFacts } from '../routes';
import type { PocketRoute } from '../door/table';
import type { PocketLedgerRow } from '../route-ledger';
import { fakeNameDeps, type FakeNameDeps } from './dns-fixtures';

let userData = '';
let keystore = true;
/** When true, a write under the STORE's seal throws (C6); the record's seal still works. */
let failStoreSeal = false;
/** When true, a write under the RECORD's seal throws (C6b, the fix round); the store's seal still works. */
let failRecordSeal = false;
/** Every seal written, by which file it was for, in order. */
const seals: ('record' | 'store' | 'other')[] = [];

const MARKER = '--tortie-p33312-test--';

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true, isPackaged: false },
  shell: { openExternal: async () => undefined },
  BrowserWindow: { getAllWindows: () => [] },
  ipcMain: { handle: () => undefined },
  safeStorage: {
    isEncryptionAvailable: () => keystore,
    encryptString: (text: string) => {
      const which = text.startsWith('gmux-config-confirm-v1:')
        ? 'record'
        : text.startsWith('gmux-pocket-store-v1:')
          ? 'store'
          : 'other';
      if (which === 'store' && failStoreSeal) throw new Error('p33312: the store seal refused this write');
      if (which === 'record' && failRecordSeal) throw new Error('p33312: the record seal refused this write');
      seals.push(which);
      return Buffer.from(`${MARKER}${text}`, 'utf8');
    },
    decryptString: (buf: Buffer) => {
      const text = buf.toString('utf8');
      if (!text.startsWith(MARKER)) throw new Error('not ours');
      return text.slice(MARKER.length);
    }
  }
}));

vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const quiet = (): void => undefined;
  return { ...real, getLog: () => ({ error: quiet, warn: quiet, info: quiet, debug: quiet }) };
});

// ---------------------------------------------------------------------------
// The table with a route a person has not allowed, and the ledger that knows it
// ---------------------------------------------------------------------------

const PROBE_ROW = { id: 'probe', method: 'GET', path: '/v1/probe', reads: true, windowOnly: false, signed: true } as unknown as PocketRoute;
const PROBE = 'probe' as PocketRouteId;

const hoisted = vi.hoisted(() => ({ routes: [] as unknown[] }));

vi.mock('../door/table', async (importOriginal) => {
  const real = await importOriginal<typeof import('../door/table')>();
  hoisted.routes.splice(0, hoisted.routes.length, ...real.POCKET_ROUTES);
  const routes = hoisted.routes as PocketRoute[];
  return {
    ...real,
    POCKET_ROUTES: routes,
    matchPocketRoute: (method: string, pathname: string) =>
      routes.find((r) => r.method === method && r.path === pathname) ?? null
  };
});

vi.mock('../route-ledger', async (importOriginal) => {
  const real = await importOriginal<typeof import('../route-ledger')>();
  const probe: PocketLedgerRow = { id: 'probe', method: 'GET', path: '/v1/probe', reads: true, signed: true, windowOnly: false, bodyCap: 1024, clause: null };
  const ledger = Object.freeze([...real.POCKET_ROUTE_LEDGER, probe]);
  return { ...real, POCKET_ROUTE_LEDGER: ledger, POCKET_LEDGER_IDS: new Set(ledger.map((r) => r.id)) };
});

/** An update of this Mac adds the route `probe` to the table. */
function plant(): void {
  if (!(hoisted.routes as PocketRoute[]).some((r) => r.id === PROBE)) hoisted.routes.push(PROBE_ROW);
}

/** The table is the eleven again. */
function unplant(): void {
  const at = (hoisted.routes as PocketRoute[]).findIndex((r) => r.id === PROBE);
  if (at >= 0) hoisted.routes.splice(at, 1);
}

// ---------------------------------------------------------------------------
// The door process, as booleans that record what they were handed
// ---------------------------------------------------------------------------

const door = {
  listening: false,
  starts: 0,
  stops: 0,
  localPort: 0,
  updates: [] as { pins?: unknown[]; windowOpen?: boolean; routes?: readonly PocketRouteId[] }[],
  inputs: [] as { pins: unknown[]; routes: readonly PocketRouteId[] }[],
  identity: null as unknown
};

vi.mock('../bind', async (importOriginal) => {
  const real = await importOriginal<typeof import('../bind')>();
  const tls = await import('../tls');
  return {
    ...real,
    pocketDoorStatus: () => ({
      listening: door.listening,
      localPort: door.listening ? door.localPort : 0,
      certificateFingerprint: door.listening ? ((door.identity as { certificateFingerprint?: string } | null)?.certificateFingerprint ?? null) : null,
      publicKeyFingerprint: door.listening ? ((door.identity as { publicKeyFingerprint?: string } | null)?.publicKeyFingerprint ?? null) : null,
      shortFingerprint: null,
      lastRefusal: null,
      sentence: null
    }),
    pocketShutdownStarted: () => false,
    startPocketDoor: async (input: { pins: readonly unknown[]; routes: readonly PocketRouteId[] }) => {
      door.inputs.push({ pins: [...input.pins], routes: [...input.routes] });
      door.starts += 1;
      door.listening = true;
      door.localPort = 50_000 + door.starts;
      tls.holdDoorIdentity(door.identity as never);
      const id = door.identity as { certificateFingerprint: string; publicKeyFingerprint: string };
      return {
        ok: true,
        localPort: door.localPort,
        certificateFingerprint: id.certificateFingerprint,
        publicKeyFingerprint: id.publicKeyFingerprint,
        shortFingerprint: 'AAAA BBBB CCCC'
      };
    },
    stopPocketDoor: async () => {
      if (door.listening) door.stops += 1;
      door.listening = false;
      tls.holdDoorIdentity(null);
      return { accepted: 0, joined: true, waitedMs: 0 };
    },
    updatePocketDoor: (update: (typeof door.updates)[number]) => {
      if (door.listening) door.updates.push(update);
    },
    onPocketDoorExit: () => () => undefined
  };
});

// ---------------------------------------------------------------------------
// Tailscale, in memory (`./ipc.test.ts`'s stand-in, its approval path left out)
// ---------------------------------------------------------------------------

const PROGRAM = '/stand/in/tailscale';
const NAME = 'mac.tail00000.ts.net';

class Child extends EventEmitter {
  readonly stdout = new EventEmitter() as unknown as NodeJS.ReadableStream;
  readonly stderr = new EventEmitter() as unknown as NodeJS.ReadableStream;
  closed = false;
  command = '';
  constructor(
    readonly pid: number,
    private readonly onEnd: () => void
  ) {
    super();
  }
  close(code: number | null, signal: string | null = null): void {
    if (this.closed) return;
    this.closed = true;
    this.onEnd();
    this.emit('close', code, signal);
  }
  kill(signal: NodeJS.Signals): boolean {
    this.close(signal === 'SIGINT' ? 0 : null, signal);
    return true;
  }
}

const ts = {
  sessions: new Map<number, { port: number; target: string }>(),
  children: [] as Child[],
  nextPid: 80_000,
  deps: null as unknown as FunnelDeps
};

function fakeTailscale(): FunnelDeps {
  const status = (): string =>
    JSON.stringify({
      BackendState: 'Running',
      Self: { DNSName: `${NAME.toUpperCase()}.`, CapMap: { https: null, funnel: null } },
      CurrentTailnet: { Name: 'example.github', MagicDNSSuffix: 'tail00000.ts.net', MagicDNSEnabled: true },
      Peer: null
    });
  const serve = (): string => {
    if (ts.sessions.size === 0) return 'null';
    const foreground: Record<string, unknown> = {};
    for (const [pid, s] of ts.sessions) {
      foreground[`s${String(pid)}`] = {
        TCP: { [String(s.port)]: { TCPForward: s.target, ProxyProtocol: 2 } },
        AllowFunnel: { [`${NAME}:${String(s.port)}`]: true }
      };
    }
    return JSON.stringify({ TCP: {}, Foreground: foreground });
  };
  return {
    resolve: () => ({ resolution: { path: PROGRAM, source: 'dev-override', detail: '' }, overrideSet: true }),
    exec: async (_file, args) => ({
      stdout: args[0] === 'status' ? status() : serve(),
      stderr: '',
      code: 0,
      failed: false,
      errno: null
    }),
    spawn: (file, args) => {
      const pid = (ts.nextPid += 1);
      const port = Number(/--tcp=(\d+)/.exec(args.join(' '))?.[1] ?? 0);
      const target = (/tcp:\/\/(\S+)/.exec(args.join(' '))?.[1] ?? '').trim();
      const child = new Child(pid, () => ts.sessions.delete(pid));
      child.command = [file, ...args].join(' ');
      ts.children.push(child);
      setImmediate(() => {
        ts.sessions.set(pid, { port, target });
        (child.stdout as unknown as EventEmitter).emit(
          'data',
          Buffer.from(`Available on the internet:\n\n|-- tcp://${NAME}:${String(port)}\n\nPress Ctrl+C to exit.\n`, 'utf8')
        );
      });
      return child as unknown as FunnelChild;
    },
    ps: async (pid) => {
      const child = ts.children.find((c) => c.pid === pid);
      return child === undefined || child.closed ? null : { lstart: `start-${String(pid)}`, command: child.command };
    },
    kill: (pid, signal) => {
      const child = ts.children.find((c) => c.pid === pid);
      if (signal === 0) return child !== undefined && !child.closed;
      child?.kill(signal);
      return child !== undefined;
    },
    recordPath: () => join(userData, 'gmux', 'pocket-funnel', 'record.json'),
    now: () => clock,
    sleep: (ms) =>
      new Promise<void>((resolve) => {
        if (ms < 1_000) setImmediate(resolve);
      })
  };
}

// ---------------------------------------------------------------------------

const { PocketHost } = await import('../ipc');
const {
  POCKET_CONFIRM_ACKNOWLEDGEMENT,
  confirmPocketDoor,
  describePocketDoor,
  phoneIdOf,
  pocketConfirmStatus,
  pocketExecutionHash,
  readPocketStore,
  writePocketStore
} = await import('../pairing');
const { allowedRoutesFor, allowedRoutesOf, proposedRoutes, servedRoutesOf, waitingRoutesOf } = await import('../allowed-routes');
const { POCKET_TLS_SEAL_PREFIX, ensureDoorIdentity } = await import('../tls');
const { resetFunnelForTests } = await import('../funnel');
const { pocketRouteIds } = await import('../routes');
const { confirmPath } = await import('../../config/confirm-record');
const { LEGACY_ALLOWED_ROUTES, POCKET_ALLOWED_NOT_SAVED, POCKET_ROUTE_IDS } = await import('@shared/ipc/pocket');

type Host = InstanceType<typeof PocketHost>;

const FACTS: PocketFacts = {
  sessions: () => [],
  projects: () => [],
  blockedSince: () => new Map(),
  activity: () => undefined,
  statusWord: () => ({ dot: 'idle', label: 'idle' }),
  agentLabel: (id) => id,
  machineLabel: () => null,
  emptyLine: 'Nothing needs you',
  wakes: () => [],
  catchUp: async () => null,
  lastTurn: async () => ({ answerText: null, turnCount: 0 }),
  turns: async () => ({ turns: [], more: false }),
  handoff: () => null
};

let clock = 20_000_000;
let names: FakeNameDeps = fakeNameDeps();

function host(): Host {
  return new PocketHost({ facts: FACTS, now: () => clock, tailscale: ts.deps, names, onResume: () => () => undefined });
}

/** Let the queue and every immediate it scheduled run. */
async function settled(one: Host): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await one.idle();
    await new Promise((resolve) => setImmediate(resolve));
  }
}

/** The name answers: main says a code may show. */
async function namePairable(one: Host): Promise<void> {
  for (let i = 0; i < 6 && !one.status().pairable; i += 1) {
    names.releaseSleeps();
    await settled(one);
  }
  expect(one.status().pairable).toBe(true);
}

/** The sheet's Allow: the lines main drew and the hash they were drawn from. */
async function allow(one: Host): ReturnType<Host['confirmDoor']> {
  const s = one.status();
  const answer = await one.confirmDoor({ linesRead: s.confirmLines, hashRead: s.confirmHash });
  await settled(one);
  return answer;
}

interface Phone {
  label: string;
  sign: KeyObject;
  signPublic: string;
  exchangePublic: string;
  clientPublic: string;
}

function makePhone(label: string): Phone {
  const ed = generateKeyPairSync('ed25519');
  const x = generateKeyPairSync('x25519');
  const ck = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const b64u = (key: KeyObject): string => key.export({ format: 'der', type: 'spki' }).toString('base64url');
  return { label, sign: ed.privateKey, signPublic: b64u(ed.publicKey), exchangePublic: b64u(x.publicKey), clientPublic: b64u(ck.publicKey) };
}

/** A phone's `/pair` presentation, spelled from the wire format (`./ipc.test.ts`'s). */
function presentationOf(secretB64u: string, phone: Phone, extra: Record<string, unknown> = {}): PocketSealedPresentation {
  const secret = Buffer.from(secretB64u, 'base64url');
  const key = Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), 'tortie-pocket-pair-v1', 32));
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const inner = { ck: phone.clientPublic, ek: phone.signPublic, label: phone.label, xk: phone.exchangePublic, ...extra };
  const ct = Buffer.concat([cipher.update(JSON.stringify(inner), 'utf8'), cipher.final()]);
  const sealed = { iv: iv.toString('base64url'), ct: ct.toString('base64url'), tag: cipher.getAuthTag().toString('base64url') };
  const challenge = Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), 'tortie-pocket-challenge-v1', 32)).toString('base64url');
  const proof = ['tortie-pocket-present-v1', challenge, sealed.iv, sealed.ct, sealed.tag].join('\n');
  return { ...sealed, ek: phone.signPublic, sig: signWith(null, Buffer.from(proof, 'utf8'), phone.sign).toString('base64url') };
}

/** An Apple device token, 64 lowercase hex. */
const tokenFor = (seed: string): string => createHash('sha256').update(`p33312-token-${seed}`, 'utf8').digest('hex');

/** Pair one phone through the shipping window; answers its id and the lines its card drew. */
async function pairPhone(one: Host, phone: Phone, extra: Record<string, unknown> = {}): Promise<{ id: string; lines: readonly string[]; hash: string }> {
  const offer = await one.beginPairing();
  const secret = (JSON.parse(offer.payload) as { ps: string }).ps;
  one.pairing.present(presentationOf(secret, phone, extra));
  const view = one.pairing.view();
  const outcome = one.allowPhone({ linesRead: view.lines, hashRead: view.hash ?? '' });
  expect(outcome.allowed).toBe(true);
  one.cancelPairing();
  return { id: phoneIdOf(phone.signPublic), lines: view.lines, hash: view.hash ?? '' };
}

/** The routes line of a set of lines. */
const routesLine = (lines: readonly string[]): string => lines.find((l) => l.startsWith('Answers these and nothing else:')) ?? '';

/** The table's order of the eleven, which is what the door serves for a 0.111.x store. */
const elevenServed = (): readonly PocketRouteId[] => pocketRouteIds().filter((id) => id !== PROBE);

/**
 * A door set up on a build of the eleven, as a 0.111.x Mac leaves it: on,
 * agreed to, published, one phone with alerts, the alerts on and agreed to.
 * The store carries no allowed set (the table was the eleven at every Allow).
 */
async function setUpOnTheEleven(): Promise<{ one: Host; phone: string }> {
  unplant();
  const one = host();
  await one.setDoor({ on: true });
  await settled(one);
  await allow(one);
  expect(one.status().state).toBe('listening');
  await namePairable(one);
  const { id } = await pairPhone(one, makePhone('Phone A'), { apt: tokenFor('a'), ape: 'production' });
  await one.setPushAlerts(true);
  await settled(one);
  await allow(one);
  expect(one.status()).toMatchObject({ state: 'listening', confirmState: 'confirmed', pushAlerts: true });
  expect(readPocketStore().store?.allowedRoutes).toBeNull();
  return { one, phone: id };
}

/** Tortie quits and an update starts: the child and the door went with the last run. */
function relaunch(): Host {
  for (const c of ts.children) c.close(null, 'SIGKILL');
  ts.sessions.clear();
  resetFunnelForTests();
  door.listening = false;
  return host();
}

/** The update that adds `probe`, relaunched from the door the eleven left. */
async function updatedWithAWaitingRoute(): Promise<{ one: Host; phone: string }> {
  const { phone } = await setUpOnTheEleven();
  plant();
  const one = relaunch();
  door.inputs.length = 0;
  door.updates.length = 0;
  expect(await one.openAtLaunch()).toBe('opened');
  await settled(one);
  return { one, phone };
}

function fakeSeal(): Parameters<typeof ensureDoorIdentity>[0]['seal'] {
  return {
    available: () => true,
    seal: (text: string) => Buffer.from(`${POCKET_TLS_SEAL_PREFIX}${text}`).toString('base64'),
    open: (blob: unknown) => {
      if (typeof blob !== 'string' || blob.length === 0) return '';
      const text = Buffer.from(blob, 'base64').toString('utf8');
      return text.startsWith(POCKET_TLS_SEAL_PREFIX) ? text.slice(POCKET_TLS_SEAL_PREFIX.length) : '';
    }
  };
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'p33312-allowed-'));
  keystore = true;
  failStoreSeal = false;
  failRecordSeal = false;
  seals.length = 0;
  clock = 20_000_000;
  unplant();
  resetFunnelForTests();
  Object.assign(door, { listening: false, starts: 0, stops: 0, localPort: 0, updates: [], inputs: [] });
  const made = ensureDoorIdentity({
    path: join(userData, 'identity-for-test.json'),
    seal: fakeSeal(),
    names: { addresses: [], dnsNames: [NAME] }
  });
  if (made.kind !== 'ready') throw new Error('no test identity');
  door.identity = made.identity;
  ts.sessions.clear();
  ts.children.length = 0;
  ts.deps = fakeTailscale();
  names = fakeNameDeps();
});

afterEach(() => {
  for (const c of ts.children) c.close(null, 'SIGKILL');
  resetFunnelForTests();
  unplant();
  rmSync(userData, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// C1: the reader, whole or nothing, and the three sets
// ---------------------------------------------------------------------------

describe('C1: the allowed set is read whole or not at all, and the three sets are pure', () => {
  const eleven = [...LEGACY_ALLOWED_ROUTES];

  it('answers null for anything that is not a whole list, and the sorted list for one that is', () => {
    for (const [why, raw] of [
      ['absent', undefined],
      ['null', null],
      ['an object', {}],
      ['a string', 'blocked'],
      ['empty', []],
      ['a non-string', [...eleven, 7]],
      ['a duplicate', [...eleven, 'keys']],
      ['an id outside the ledger', [...eleven, 'zzz']],
      ['the eleven less keys', eleven.filter((id) => id !== 'keys')],
      ['more ids than the ledger has', [...eleven, PROBE, 'a', 'b']]
    ] as const) {
      expect(allowedRoutesOf(raw), why).toBeNull();
    }
    expect(allowedRoutesOf([...eleven].reverse())).toEqual([...eleven].sort());
    expect(Object.isFrozen(allowedRoutesOf(eleven))).toBe(true);
    // A ledger id this build's table lacks (the table is the eleven here) is WHOLE: kept.
    expect(pocketRouteIds()).not.toContain(PROBE);
    expect(allowedRoutesOf([PROBE, ...eleven])).toEqual([...eleven, PROBE].sort());
  });

  it('allowedRoutesFor is the stored list or the eleven; proposed, served and waiting as §4.1 says', () => {
    expect(allowedRoutesFor(null)).toEqual(LEGACY_ALLOWED_ROUTES);
    expect(allowedRoutesFor(['a', 'b'])).toEqual(['a', 'b']);
    plant();
    const build = pocketRouteIds();
    expect(build).toContain(PROBE);
    // No record: the build's whole table. On record: the allowed set with the build added.
    expect(proposedRoutes(eleven, build, false)).toEqual([...build].sort());
    expect(proposedRoutes(eleven, build, true)).toEqual([...eleven, PROBE].sort());
    expect(proposedRoutes([...eleven, 'gone'], build, true)).toEqual([...eleven, PROBE, 'gone'].sort());
    // With no record the allowed set is not read at all: an id this build lacks is not proposed.
    expect(proposedRoutes([...eleven, 'gone'], build, false)).toEqual([...build].sort());
    expect(servedRoutesOf(eleven, build)).toEqual(build.filter((id) => id !== PROBE));
    expect(servedRoutesOf([...eleven, 'gone'], build)).not.toContain('gone');
    expect(waitingRoutesOf(eleven, build, true)).toEqual([PROBE]);
    expect(waitingRoutesOf(eleven, build, false)).toEqual([]);
    expect(waitingRoutesOf([...eleven, PROBE], build, true)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// C2: a 0.111.x door hashes as it did
// ---------------------------------------------------------------------------

describe('C2: a launch-shaped store and its record read confirmed, byte for byte the 0.111.1 hash', () => {
  it('reads launch.wire.json’s routes, not a list in this test', async () => {
    const frozen = JSON.parse(
      readFileSync(join(__dirname, '..', '..', '..', '..', 'ios', 'TortieTests', 'Fixtures', 'frozen', 'launch.wire.json'), 'utf8')
    ) as { routes: { id: string }[] };
    const launchIds = frozen.routes.map((r) => r.id);
    expect(launchIds).toHaveLength(11);
    expect([...launchIds].sort()).toEqual([...LEGACY_ALLOWED_ROUTES]);
    // The store exactly as a 0.111.x Mac writes it: no allowedRoutes.
    const facts = { funnelProgram: PROGRAM, tailnet: 'example.github', publicName: NAME };
    // An identity, minted and sealed the way a press mints one; it moves nothing.
    await host().setPushAlerts(false);
    const store = readPocketStore().store;
    if (store === null) throw new Error('no store');
    const launchShaped = {
      identity: store.identity,
      phones: [],
      publicPort: 8443,
      tailnetFacts: facts,
      bindAtLaunch: true,
      enabled: true,
      pushAlerts: false,
      deadPushTokens: [],
      nameConfirmed: null
    };
    expect(writePocketStore(launchShaped as never)).toBe(true);
    // The record as 0.111.1's Allow wrote it: over its own table, the frozen ids.
    const at0111 = {
      ...facts,
      publicPort: 8443,
      bindAtLaunch: true,
      routes: launchIds,
      phones: [],
      pushAlerts: false
    };
    const drawn = describePocketDoor(at0111);
    confirmPocketDoor(at0111, { acknowledgement: POCKET_CONFIRM_ACKNOWLEDGEMENT, linesRead: drawn.lines, hashRead: drawn.hash });
    const one = host();
    expect([...one.fields().routes].sort()).toEqual([...launchIds].sort());
    expect(pocketExecutionHash(one.fields())).toBe(pocketExecutionHash(at0111));
    const s = one.status();
    expect(s.confirmState).toBe('confirmed');
    expect(s.confirmHash).toBe(drawn.hash);
    expect(s.routesWaiting).toEqual([]);
    expect(s.routesAllowed).toEqual(pocketRouteIds());
  });
});

// ---------------------------------------------------------------------------
// C3: a first Allow allows the build's whole table
// ---------------------------------------------------------------------------

describe('C3: a first setup’s Allow agrees to every route this build has', () => {
  it('names the whole table, waits on nothing, and writes the allowed set when the table is not the eleven', async () => {
    plant();
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    const s = one.status();
    expect(s.confirmState).toBe('never');
    expect(routesLine(s.confirmLines)).toContain('probe');
    expect(s.routesWaiting).toEqual([]);
    // The honesty sentence beside this Allow is composed over what it grants:
    // the whole table, the planted route in it (the fix round).
    expect(s.routesOffered).toEqual(pocketRouteIds());
    expect(s.routesAllowed).not.toContain(PROBE);
    expect((await allow(one)).allowed).toBe(true);
    expect(readPocketStore().store?.allowedRoutes).toEqual([...pocketRouteIds()].sort());
    const after = one.status();
    expect(after).toMatchObject({ state: 'listening', confirmState: 'confirmed', routesWaiting: [] });
    expect(after.routesAllowed).toEqual(pocketRouteIds());
    expect(after.routesOffered).toEqual(pocketRouteIds());
    expect(door.inputs.at(-1)?.routes).toContain(PROBE);
  });

  it('writes no allowed set when the table is the eleven', async () => {
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    expect(one.status().confirmState).toBe('never');
    expect((await allow(one)).allowed).toBe(true);
    expect(readPocketStore().store?.allowedRoutes).toBeNull();
    expect(one.status()).toMatchObject({ state: 'listening', confirmState: 'confirmed', routesWaiting: [] });
    expect([...(door.inputs.at(-1)?.routes ?? [])].sort()).toEqual([...POCKET_ROUTE_IDS].sort());
  });
});

// ---------------------------------------------------------------------------
// C4: the update that adds a route switches nobody off
// ---------------------------------------------------------------------------

describe('C4: an update that adds a route keeps the door, the phones and the alerts', () => {
  it('reads confirmed, publishes with no press, sends alerts, and lets only the new route wait', async () => {
    const { one } = await updatedWithAWaitingRoute();
    const s = one.status();
    expect(s.state).toBe('listening');
    expect(s.confirmState).toBe('confirmed');
    expect(s.routesWaiting).toEqual([PROBE]);
    expect(s.routesAllowed).toEqual(elevenServed());
    // What the Allow beside the block grants, which the honesty sentence is
    // composed over: the waiting route with the rest (the fix round).
    expect(s.routesOffered).toEqual(pocketRouteIds());
    expect(s.routes).toEqual(POCKET_ROUTE_IDS);
    // The lines Allow would agree to name the waiting route; the hash on record does not.
    expect(routesLine(s.confirmLines)).toContain('probe');
    expect(s.confirmHash).not.toBe(pocketConfirmStatus(one.fields()).hash);
    expect(one.fields().routes).not.toContain(PROBE);
    expect(one.pushDestinations()).toHaveLength(1);
    // The door process was started serving the eleven, and told the same once it listened (D22).
    expect(door.inputs.at(-1)?.routes).toEqual(elevenServed());
    expect(door.updates).toContainEqual({ routes: elevenServed() });
    for (const update of door.updates) expect(update.routes ?? []).not.toContain(PROBE);
  });
});

// ---------------------------------------------------------------------------
// C5, C6, C7: the Allow whose lines name the route, and only that
// ---------------------------------------------------------------------------

describe('C5: Allow while a route waits records first, saves second, and serves it with no restart', () => {
  it('writes the record, then the store with exactly the proposal’s routes, then one update', async () => {
    const { one } = await updatedWithAWaitingRoute();
    const proposal = one.status();
    const starts = door.starts;
    const stops = door.stops;
    seals.length = 0;
    door.updates.length = 0;
    const answer = await one.confirmDoor({ linesRead: proposal.confirmLines, hashRead: proposal.confirmHash });
    expect(answer.allowed).toBe(true);
    expect(answer.refusal).toBeNull();
    // THE ORDER, read from the seals themselves: the record, then the store.
    expect(seals).toEqual(['record', 'store']);
    expect(readPocketStore().store?.allowedRoutes).toEqual([...LEGACY_ALLOWED_ROUTES, PROBE].sort());
    expect(pocketConfirmStatus(one.fields()).hash).toBe(proposal.confirmHash);
    expect(door.updates).toEqual([{ routes: pocketRouteIds() }]);
    await settled(one);
    expect(door.starts).toBe(starts);
    expect(door.stops).toBe(stops);
    expect(one.status()).toMatchObject({ state: 'listening', confirmState: 'confirmed', routesWaiting: [] });
    expect(one.status().routesAllowed).toEqual(pocketRouteIds());
    expect(one.status().routesOffered).toEqual(pocketRouteIds());
  });
});

describe('C6: Allow while a route waits, with the store write failing', () => {
  it('answers allowed: false with its sentence, reads changed, closes, and never serves the route', async () => {
    const { one } = await updatedWithAWaitingRoute();
    const proposal = one.status();
    const stops = door.stops;
    failStoreSeal = true;
    const answer = await one.confirmDoor({ linesRead: proposal.confirmLines, hashRead: proposal.confirmHash });
    await settled(one);
    expect(answer.allowed).toBe(false);
    expect(answer.refusal).toBe(POCKET_ALLOWED_NOT_SAVED);
    expect(readPocketStore().store?.allowedRoutes).toBeNull();
    const s = one.status();
    expect(s.confirmState).toBe('changed');
    expect(s.state).not.toBe('listening');
    expect(door.stops).toBe(stops + 1);
    expect(one.pushDestinations()).toEqual([]);
    for (const input of door.inputs) expect(input.routes).not.toContain(PROBE);
    for (const update of door.updates) expect(update.routes ?? []).not.toContain(PROBE);
    // Allow again with the store writable: the door opens serving it.
    failStoreSeal = false;
    expect((await allow(one)).allowed).toBe(true);
    expect(one.status()).toMatchObject({ state: 'listening', confirmState: 'confirmed', routesWaiting: [] });
    expect(door.inputs.at(-1)?.routes).toContain(PROBE);
  });
});

describe('C6b: Allow while a route waits, with the RECORD failing to seal (the fix round)', () => {
  it('writes no allowed set, serves nothing new, tells the door nothing, and leaves the door as it was', async () => {
    const { one } = await updatedWithAWaitingRoute();
    const proposal = one.status();
    const recordBefore = readFileSync(confirmPath(), 'utf8');
    const starts = door.starts;
    const stops = door.stops;
    seals.length = 0;
    door.updates.length = 0;
    failRecordSeal = true;
    const answer = await one.confirmDoor({ linesRead: proposal.confirmLines, hashRead: proposal.confirmHash });
    await settled(one);
    failRecordSeal = false;
    // Refused with the record's own sentence, never the store's.
    expect(answer.allowed).toBe(false);
    expect(answer.refusal).toMatch(/could not record what you agreed to/);
    expect(answer.refusal).not.toBe(POCKET_ALLOWED_NOT_SAVED);
    // NO STORE WRITE AT ALL: the allowed set is unchanged on disk and in memory.
    expect(seals).not.toContain('store');
    expect(readPocketStore().store?.allowedRoutes).toBeNull();
    expect(one.fields().routes).not.toContain(PROBE);
    expect(readFileSync(confirmPath(), 'utf8')).toBe(recordBefore);
    // Main does not serve the route, and the door process is told nothing new.
    const routeServed = (one as unknown as { routeServed(id: PocketRouteId): boolean }).routeServed.bind(one);
    expect(routeServed(PROBE)).toBe(false);
    expect(routeServed('blocked' as PocketRouteId)).toBe(true);
    expect(door.updates.filter((u) => u.routes !== undefined)).toEqual([]);
    // The door is what it was before the press: confirmed on the eleven, the
    // route still waiting, nothing stopped or started.
    const s = one.status();
    expect(s).toMatchObject({ state: 'listening', confirmState: 'confirmed', routesWaiting: [PROBE] });
    expect(s.routesAllowed).toEqual(elevenServed());
    expect(door.stops).toBe(stops);
    expect(door.starts).toBe(starts);
    expect(one.pushDestinations()).toHaveLength(1);
  });
});

describe('C7: the allowed set’s own lines handed to Allow while a route waits', () => {
  it('is refused as changed after it was shown, and records nothing', async () => {
    const { one } = await updatedWithAWaitingRoute();
    const allowedOnly = pocketConfirmStatus(one.fields());
    const before = readFileSync(confirmPath(), 'utf8');
    await expect(one.confirmDoor({ linesRead: allowedOnly.lines, hashRead: allowedOnly.hash })).rejects.toThrow(
      /changed after it was shown/
    );
    expect(readFileSync(confirmPath(), 'utf8')).toBe(before);
    expect(readPocketStore().store?.allowedRoutes).toBeNull();
    expect(one.status().routesWaiting).toEqual([PROBE]);
  });
});

// ---------------------------------------------------------------------------
// C8, C9, C10: the three other presses never widen
// ---------------------------------------------------------------------------

describe('C8: the pairing Allow never allows a waiting route (his answer 10)', () => {
  it('draws the allowed set plus the phone, records exactly that, and the route still waits', async () => {
    const { one } = await updatedWithAWaitingRoute();
    await namePairable(one);
    const fieldsBefore = one.fields();
    const b = makePhone('Phone B');
    const { lines, hash } = await pairPhone(one, b);
    expect(routesLine(lines)).not.toContain('probe');
    const added = one.fields().phones.find((p) => p.id === phoneIdOf(b.signPublic));
    if (added === undefined) throw new Error('phone B was not saved');
    expect(hash).toBe(pocketExecutionHash({ ...fieldsBefore, phones: [...fieldsBefore.phones, added] }));
    expect(pocketConfirmStatus(one.fields())).toMatchObject({ state: 'confirmed', hash });
    expect(one.fields().routes).not.toContain(PROBE);
    expect(readPocketStore().store?.allowedRoutes).toBeNull();
    expect(one.status().routesWaiting).toEqual([PROBE]);
  });
});

describe('C9: alerts off while a route waits narrows in main, and on a changed door records nothing', () => {
  it('reads confirmed at once with alerts off, the route still waiting, and no stop', async () => {
    const { one } = await updatedWithAWaitingRoute();
    const stops = door.stops;
    const starts = door.starts;
    const after = await one.setPushAlerts(false);
    expect(after.confirmState).toBe('confirmed');
    expect(after.pushAlerts).toBe(false);
    expect(after.routesWaiting).toEqual([PROBE]);
    expect(pocketConfirmStatus(one.fields()).hash).toBe(pocketExecutionHash({ ...one.fields(), pushAlerts: false }));
    expect(one.fields().routes).not.toContain(PROBE);
    await settled(one);
    expect(door.stops).toBe(stops);
    expect(door.starts).toBe(starts);
    expect(one.status().state).toBe('listening');
  });

  it('records nothing for a door that was not confirmed before the press', async () => {
    const { one } = await updatedWithAWaitingRoute();
    const elsewhere = { ...one.fields(), publicPort: 10000 };
    const drawn = describePocketDoor(elsewhere);
    confirmPocketDoor(elsewhere, { acknowledgement: POCKET_CONFIRM_ACKNOWLEDGEMENT, linesRead: drawn.lines, hashRead: drawn.hash });
    expect(pocketConfirmStatus(one.fields()).state).toBe('changed');
    const before = readFileSync(confirmPath(), 'utf8');
    const after = await one.setPushAlerts(false);
    expect(readFileSync(confirmPath(), 'utf8')).toBe(before);
    expect(after.confirmState).toBe('changed');
  });
});

describe('C10: Remove of one of two keeps the other; Remove of the only phone withdraws', () => {
  it('records the door less that phone, keeps the other’s alerts, and stops nothing', async () => {
    const { one, phone } = await updatedWithAWaitingRoute();
    await namePairable(one);
    const b = await pairPhone(one, makePhone('Phone B'), { apt: tokenFor('b'), ape: 'production' });
    expect(one.pushDestinations()).toHaveLength(2);
    const stops = door.stops;
    const after = await one.removePhone(phone);
    expect(after.confirmState).toBe('confirmed');
    expect(after.phones.map((p) => p.id)).toEqual([b.id]);
    expect(after.routesWaiting).toEqual([PROBE]);
    expect(one.pushDestinations().map((d) => d.phoneId)).toEqual([b.id]);
    await settled(one);
    expect(door.stops).toBe(stops);
    expect(one.status().state).toBe('listening');
    // The other phone's pins are what the door holds.
    expect(door.updates.at(-1)?.pins).toHaveLength(1);
    // The last phone: the agreement is withdrawn and the door stops, as before.
    const last = await one.removePhone(b.id);
    await settled(one);
    expect(last.confirmState).toBe('never');
    expect(door.stops).toBe(stops + 1);
    expect(one.pushDestinations()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// C11: a downgrade and back is never wider
// ---------------------------------------------------------------------------

describe('C11: a record over twelve with the field dropped by an older Mac', () => {
  it('reads changed, serves the eleven at most, and never the route', async () => {
    const { one } = await updatedWithAWaitingRoute();
    expect((await allow(one)).allowed).toBe(true);
    expect(readPocketStore().store?.allowedRoutes).toContain(PROBE);
    // 0.111.1 rewrites the store field by field and drops what it does not know.
    const store = readPocketStore().store;
    if (store === null) throw new Error('no store');
    const { allowedRoutes: _dropped, ...asOlderMacWritesIt } = store;
    expect(writePocketStore(asOlderMacWritesIt as never)).toBe(true);
    door.inputs.length = 0;
    door.updates.length = 0;
    const back = relaunch();
    const s = back.status();
    expect(s.confirmState).toBe('changed');
    expect(s.routesAllowed).toEqual(elevenServed());
    expect(s.routesAllowed).not.toContain(PROBE);
    expect(back.fields().routes).not.toContain(PROBE);
    expect(await back.openAtLaunch()).toBe('refused');
    expect(door.inputs).toEqual([]);
    expect(back.pushDestinations()).toEqual([]);
  });
});

describe('C11b: a store wider than its record, left by an older Mac’s Allow that wrote no store (D21’s corner)', () => {
  it('reads changed, opens no door, sends no alert, and the Allow that reopens it names the route', async () => {
    const { one } = await updatedWithAWaitingRoute();
    expect((await allow(one)).allowed).toBe(true);
    expect(readPocketStore().store?.allowedRoutes).toContain(PROBE);
    // 0.111.1 reads `changed` over the twelve, its own table being the eleven,
    // and its sheet's Allow records the eleven. Its record write is the whole
    // of the press when nothing else moved, so the store keeps the twelve.
    const elevenFields = { ...one.fields(), routes: [...LEGACY_ALLOWED_ROUTES] };
    const shown = describePocketDoor(elevenFields);
    const record = confirmPocketDoor(elevenFields, {
      acknowledgement: POCKET_CONFIRM_ACKNOWLEDGEMENT,
      linesRead: shown.lines,
      hashRead: shown.hash
    });
    expect(record).not.toBeNull();
    expect(readPocketStore().store?.allowedRoutes).toContain(PROBE);
    door.inputs.length = 0;
    door.updates.length = 0;
    const starts = door.starts;
    const back = relaunch();
    const s = back.status();
    // THE CORNER: the store names the route, the record does not, and the
    // gate therefore reads changed.
    expect(s.confirmState).toBe('changed');
    expect(s.routesAllowed).toContain(PROBE);
    // So nothing is served: the door never opens, the door process is handed
    // nothing, and no alert goes out.
    expect(await back.openAtLaunch()).toBe('refused');
    await settled(back);
    expect(door.starts).toBe(starts);
    expect(door.inputs).toEqual([]);
    expect(door.updates).toEqual([]);
    expect(back.status().state).not.toBe('listening');
    expect(back.pushDestinations()).toEqual([]);
    // The only way back is an Allow whose lines name the route.
    expect(routesLine(back.status().confirmLines)).toContain(PROBE);
    expect(back.status().routesOffered).toContain(PROBE);
  });
});
