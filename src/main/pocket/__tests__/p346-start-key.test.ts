/**
 * START'S ROUTE, ITS WAIT, AND THE SESSIONS ANSWER'S KEY (Phase 346,
 * build/p346/SPEC.md D1 to D4, D9, D26, D31, §4.1, §4.8, §4.11, §4.12).
 *
 *  - THE KEY (D9, D26): `pocketStartOf` re-composes the Sessions answer's
 *    `start` field by field, answering `waiting`, a whole offer, or undefined
 *    over a hostile corpus; `sessions()` reads `facts.start` once and spreads
 *    the key LAST, and a host with no start carries no key.
 *  - THE ROUTE AND ITS WORDS (D1, D3, D4): the table's row, the ledger's row,
 *    the clause in `WRITE_CLAUSES`, the honesty sentence, the face's clause
 *    and the waiting words, each D3's exact words, and `start` never one of
 *    the eleven.
 *  - THE WAIT, OVER THE SHIPPING HOST (D2, D31): an update from the eleven
 *    keeps the door and lets ONLY `start` wait, `startAllowed()` reads false
 *    and the key says `waiting`; the Allow whose lines name it serves it with
 *    no restart and `startAllowed()` reads true; a first setup on this build
 *    proposes the twelve, which `fields()` is not, so only the proposal's own
 *    hash is agreed to.
 *
 * THE HOST'S MOCKS ARE `./p33312-allowed-routes.test.ts`'s, cut down:
 * `electron` with a reversible seal, `../bind` as booleans that record every
 * start and update, Tailscale as an in-memory stand-in, and `../door/table` as
 * a MUTABLE copy of the real table, from which {@link asTheParent} removes
 * `start` so a door can be set up as the parent build leaves it. Nothing binds
 * a socket, nothing execs a program, nothing reads his home.
 */

import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PocketRouteId, PocketSessionsStart } from '@shared/ipc/pocket';
import type { FunnelChild, FunnelDeps } from '../funnel';
import type { PocketFacts } from '../routes';
import type { PocketRoute } from '../door/table';

let userData = '';
const MARKER = '--tortie-p346-test--';

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true, isPackaged: false },
  shell: { openExternal: async () => undefined },
  BrowserWindow: { getAllWindows: () => [] },
  ipcMain: { handle: () => undefined },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (text: string) => Buffer.from(`${MARKER}${text}`, 'utf8'),
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
// The table, which a test can take back to the parent's eleven
// ---------------------------------------------------------------------------

const hoisted = vi.hoisted(() => ({ routes: [] as unknown[], start: null as unknown }));

vi.mock('../door/table', async (importOriginal) => {
  const real = await importOriginal<typeof import('../door/table')>();
  hoisted.routes.splice(0, hoisted.routes.length, ...real.POCKET_ROUTES);
  hoisted.start = real.POCKET_ROUTES.find((r) => r.id === 'start') ?? null;
  const routes = hoisted.routes as PocketRoute[];
  return {
    ...real,
    POCKET_ROUTES: routes,
    matchPocketRoute: (method: string, pathname: string) =>
      routes.find((r) => r.method === method && r.path === pathname) ?? null
  };
});

/** The parent build (`0b87d0af`): the table is the eleven. */
function asTheParent(): void {
  const at = (hoisted.routes as PocketRoute[]).findIndex((r) => r.id === 'start');
  if (at >= 0) hoisted.routes.splice(at, 1);
}

/** This build: the table holds `start`, last. */
function asThisBuild(): void {
  if (!(hoisted.routes as PocketRoute[]).some((r) => r.id === 'start')) hoisted.routes.push(hoisted.start);
}

// ---------------------------------------------------------------------------
// The door process, as booleans that record what they were handed
// ---------------------------------------------------------------------------

const door = {
  listening: false,
  starts: 0,
  stops: 0,
  localPort: 0,
  updates: [] as { routes?: readonly PocketRouteId[] }[],
  inputs: [] as { routes: readonly PocketRouteId[] }[],
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
    startPocketDoor: async (input: { routes: readonly PocketRouteId[] }) => {
      door.inputs.push({ routes: [...input.routes] });
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
// Tailscale, in memory
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
  nextPid: 81_000,
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
    exec: async (_file, args) => ({ stdout: args[0] === 'status' ? status() : serve(), stderr: '', code: 0, failed: false, errno: null }),
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

const { fakeNameDeps } = await import('./dns-fixtures');
const { PocketHost } = await import('../ipc');
const { describePocketDoor, pocketConfirmStatus, readPocketStore, WRITE_CLAUSES } = await import('../pairing');
const { POCKET_TLS_SEAL_PREFIX, ensureDoorIdentity } = await import('../tls');
const { resetFunnelForTests } = await import('../funnel');
const { createPocketRoutes, pocketRouteIds, pocketStartOf, pocketWriteRouteIds } = await import('../routes');
const { POCKET_ROUTE_LEDGER } = await import('../route-ledger');
const { POCKET_WRITE_BODY_CAPS } = await import('../door/limits');
const { proposedRoutes, servedRoutesOf, waitingRoutesOf } = await import('../allowed-routes');
const {
  LEGACY_ALLOWED_ROUTES,
  POCKET_DOOR_HONESTY,
  POCKET_FACE_CLAUSES,
  POCKET_NEW_ROUTE_WORDS,
  POCKET_ROUTE_IDS,
  POCKET_SESSION_WRITE_IDS,
  POCKET_START_AGENTS_MAX,
  POCKET_START_PROJECTS_MAX,
  POCKET_WRITE_ROUTE_IDS,
  pocketDoorHonesty
} = await import('@shared/ipc/pocket');

type Host = InstanceType<typeof PocketHost>;

/** D3's clause, word for word. */
const CLAUSE = 'start a session in a project open in Tortie, on this Mac or another machine';

let clock = 30_000_000;
let names = fakeNameDeps();

function factsWith(start?: () => PocketSessionsStart | undefined): PocketFacts {
  return {
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
    handoff: () => null,
    ...(start !== undefined ? { start } : {})
  };
}

/** An offer a composer would answer: one project here, one on a machine, two agents. */
function offer(): Record<string, unknown> {
  return {
    state: 'offered',
    projects: [
      { id: 'p-1', label: 'app', machine: null, folder: null, place: 'local' },
      { id: 'p-2', label: 'api', machine: 'Mac Pro', folder: null, place: 'macpro' }
    ],
    places: [
      { id: 'local', ready: true, read: true, agents: ['claude', 'codex'] },
      { id: 'macpro', ready: false, read: false, agents: [] }
    ],
    agents: [
      { id: 'claude', name: 'Claude Code', icon: 'claude', danger: null },
      { id: 'codex', name: 'Codex', icon: 'codex', danger: 'Full auto' }
    ],
    chosen: 'p-1',
    defaultAgent: 'claude'
  };
}

// ---------------------------------------------------------------------------
// The key
// ---------------------------------------------------------------------------

describe('pocketStartOf, the key re-composed field by field (D9, D26)', () => {
  it('answers waiting as itself, and a whole offer as a fresh copy of exactly its fields', () => {
    expect(pocketStartOf({ state: 'waiting' })).toEqual({ state: 'waiting' });
    expect(pocketStartOf({ state: 'waiting', extra: 1 })).toEqual({ state: 'waiting' });
    const value = offer();
    const out = pocketStartOf(value);
    expect(out).toEqual(value);
    expect(out).not.toBe(value);
    // A field the contract does not name is not carried.
    const extra: Record<string, unknown> = { ...offer(), path: '/secret' };
    const projects = extra['projects'] as Record<string, unknown>[];
    projects[0] = { ...projects[0], path: '/Users/x' };
    expect(JSON.stringify(pocketStartOf(extra))).not.toContain('secret');
    expect(JSON.stringify(pocketStartOf(extra))).not.toContain('/Users/x');
  });

  it('clips a drawn string and keeps the offer', () => {
    const long = offer();
    (long.projects as Record<string, unknown>[])[0] = { id: 'p-1', label: 'x'.repeat(300), machine: null, folder: 'f'.repeat(300), place: 'local' };
    const out = pocketStartOf(long);
    if (out === undefined || out.state !== 'offered') throw new Error('refused');
    expect(out.projects[0]?.label).toHaveLength(200);
    expect(out.projects[0]?.label.endsWith('…')).toBe(true);
    expect(out.projects[0]?.folder).toHaveLength(200);
  });

  const hostile: [string, (o: Record<string, unknown>) => unknown][] = [
    ['null', () => null],
    ['a string', () => 'offered'],
    ['an array', () => [offer()]],
    ['an unknown state', (o) => ({ ...o, state: 'maybe' })],
    ['no state', (o) => ({ ...o, state: undefined })],
    ['projects not a list', (o) => ({ ...o, projects: {} })],
    ['places missing', (o) => ({ ...o, places: undefined })],
    ['agents a string', (o) => ({ ...o, agents: 'claude' })],
    ['a project naming an unlisted place', (o) => ({ ...o, projects: [{ id: 'p-1', label: 'app', machine: null, folder: null, place: 'nowhere' }] })],
    ['201 projects', (o) => ({ ...o, projects: Array.from({ length: POCKET_START_PROJECTS_MAX + 1 }, (_, i) => ({ id: `p-${String(i)}`, label: 'a', machine: null, folder: null, place: 'local' })), chosen: null })],
    ['202 places', (o) => ({ ...o, places: Array.from({ length: POCKET_START_PROJECTS_MAX + 2 }, (_, i) => ({ id: `m-${String(i)}`, ready: true, read: true, agents: [] })) })],
    ['65 agents', (o) => ({ ...o, agents: Array.from({ length: POCKET_START_AGENTS_MAX + 1 }, (_, i) => ({ id: `a-${String(i)}`, name: 'A', icon: 'a', danger: null })) })],
    ['a chosen not listed', (o) => ({ ...o, chosen: 'p-9' })],
    ['a defaultAgent not listed', (o) => ({ ...o, defaultAgent: 'gemini' })],
    ['a defaultAgent that is a number', (o) => ({ ...o, defaultAgent: 7 })],
    ['a number where a label is', (o) => ({ ...o, projects: [{ id: 'p-1', label: 7, machine: null, folder: null, place: 'local' }], chosen: null })],
    ['a project id the clip would cut', (o) => ({ ...o, projects: [{ id: 'p'.repeat(201), label: 'a', machine: null, folder: null, place: 'local' }], chosen: null })],
    ['an empty project id', (o) => ({ ...o, projects: [{ id: '', label: 'a', machine: null, folder: null, place: 'local' }], chosen: null })],
    ['two projects with one id', (o) => ({ ...o, projects: [...(o.projects as unknown[]), (o.projects as unknown[])[0]] })],
    ['two places with one id', (o) => ({ ...o, places: [...(o.places as unknown[]), (o.places as unknown[])[0]] })],
    ['two agents with one id', (o) => ({ ...o, agents: [...(o.agents as unknown[]), (o.agents as unknown[])[0]] })],
    ['a place listing an agent not offered', (o) => ({ ...o, places: [{ id: 'local', ready: true, read: true, agents: ['gemini'] }, (o.places as unknown[])[1]] })],
    ['a place listing an agent twice', (o) => ({ ...o, places: [{ id: 'local', ready: true, read: true, agents: ['claude', 'claude'] }, (o.places as unknown[])[1]] })],
    ['ready that is a string', (o) => ({ ...o, places: [{ id: 'local', ready: 'yes', read: true, agents: [] }, (o.places as unknown[])[1]] })],
    ['a danger that is a number', (o) => ({ ...o, agents: [{ id: 'claude', name: 'Claude Code', icon: 'claude', danger: 1 }, (o.agents as unknown[])[1]] })],
    ['a machine that is an object', (o) => ({ ...o, projects: [{ id: 'p-1', label: 'app', machine: { label: 'x' }, folder: null, place: 'local' }, (o.projects as unknown[])[1]] })]
  ];

  it(`answers undefined for every one of ${String(hostile.length)} hostile values`, () => {
    expect(hostile.length).toBeGreaterThanOrEqual(15);
    for (const [why, make] of hostile) expect(pocketStartOf(make(offer())), why).toBeUndefined();
    expect(pocketStartOf(undefined)).toBeUndefined();
  });

  it('accepts an offer with no project, no place, no agent and nothing chosen', () => {
    const empty = { state: 'offered', projects: [], places: [], agents: [], chosen: null, defaultAgent: null };
    expect(pocketStartOf(empty)).toEqual(empty);
  });
});

describe('the Sessions answer carries the key last, read once (D1, D9)', () => {
  it('spreads waiting or the offer as its last key, and nothing for a host with no start', () => {
    let asked = 0;
    const waiting = createPocketRoutes(
      factsWith(() => {
        asked += 1;
        return { state: 'waiting' };
      })
    ).sessions(new URLSearchParams());
    expect(asked).toBe(1);
    expect(Object.keys(waiting ?? {}).at(-1)).toBe('start');
    expect(waiting?.start).toEqual({ state: 'waiting' });

    const offered = createPocketRoutes(factsWith(() => offer() as PocketSessionsStart)).sessions(new URLSearchParams());
    expect(offered?.start).toEqual(offer());

    const none = createPocketRoutes(factsWith()).sessions(new URLSearchParams());
    expect(none).not.toBeNull();
    expect(Object.keys(none ?? {})).not.toContain('start');
    const undef = createPocketRoutes(factsWith(() => undefined)).sessions(new URLSearchParams());
    expect(Object.keys(undef ?? {})).not.toContain('start');
    // A broken offer is no key, and the rest of the answer stands.
    const broken = createPocketRoutes(factsWith(() => ({ ...offer(), chosen: 'nope' }) as PocketSessionsStart)).sessions(new URLSearchParams());
    expect(broken).not.toBeNull();
    expect(Object.keys(broken ?? {})).not.toContain('start');
  });

  it('is never read for a refused query', () => {
    let asked = 0;
    const refused = createPocketRoutes(
      factsWith(() => {
        asked += 1;
        return { state: 'waiting' };
      })
    ).sessions(new URLSearchParams('show=everything'));
    expect(refused).toBeNull();
    expect(asked).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The route and its words
// ---------------------------------------------------------------------------

describe('the route and its words (D1, D3, D4)', () => {
  it('is one signed POST alive outside any window, last in the table, the contract and the writes', () => {
    asThisBuild();
    expect(pocketRouteIds().at(-1)).toBe('start');
    expect(POCKET_ROUTE_IDS.at(-1)).toBe('start');
    const rows = (hoisted.routes as PocketRoute[]).filter((r) => r.id === 'start');
    expect(rows).toEqual([{ id: 'start', method: 'POST', path: '/v1/start', reads: false, windowOnly: false, signed: true }]);
    expect(POCKET_WRITE_ROUTE_IDS).toEqual(['end', 'choose', 'say', 'keys', 'start']);
    expect(pocketWriteRouteIds()).toEqual(['end', 'choose', 'say', 'keys', 'start']);
    expect(POCKET_SESSION_WRITE_IDS).toEqual(['end', 'choose', 'say', 'keys']);
    expect(POCKET_WRITE_BODY_CAPS.start).toBe(512);
    expect((LEGACY_ALLOWED_ROUTES as readonly string[]).includes('start')).toBe(false);
  });

  it('says D3’s words in every owner, and the ledger row matches the table and the cap', () => {
    expect(WRITE_CLAUSES.start).toBe(CLAUSE);
    expect(POCKET_ROUTE_LEDGER.at(-1)).toEqual({
      id: 'start',
      method: 'POST',
      path: '/v1/start',
      reads: false,
      signed: true,
      windowOnly: false,
      bodyCap: 512,
      clause: CLAUSE
    });
    expect(POCKET_FACE_CLAUSES.start).toBe('start sessions');
    expect(POCKET_NEW_ROUTE_WORDS.start).toEqual({
      title: 'start sessions from your phone',
      sentence: 'An agent installed where the project is, with your launch defaults.'
    });
    // The honesty sentence: the eleven's byte for byte, and the clause only once allowed.
    expect(pocketDoorHonesty(LEGACY_ALLOWED_ROUTES)).toBe(POCKET_DOOR_HONESTY);
    expect(pocketDoorHonesty([...LEGACY_ALLOWED_ROUTES, 'start'])).toBe(`${POCKET_DOOR_HONESTY} It can also ${CLAUSE}.`);
    for (const said of [CLAUSE, POCKET_NEW_ROUTE_WORDS.start?.title ?? '', POCKET_NEW_ROUTE_WORDS.start?.sentence ?? '']) {
      expect(said).not.toMatch(/face id|touch id|passcode/i);
    }
  });

  it('lets the lines name the start clause last, and only when the route is in the set', () => {
    const fields = {
      funnelProgram: PROGRAM,
      tailnet: 'example.github',
      publicName: NAME,
      publicPort: 8443,
      bindAtLaunch: true,
      phones: [],
      pushAlerts: false
    };
    const eleven = describePocketDoor({ ...fields, routes: [...LEGACY_ALLOWED_ROUTES] });
    const twelve = describePocketDoor({ ...fields, routes: [...LEGACY_ALLOWED_ROUTES, 'start'] });
    expect(eleven.lines.join('\n')).not.toContain(CLAUSE);
    expect(twelve.lines.find((l) => l.startsWith('Lets an allowed phone'))?.endsWith(` and ${CLAUSE}`)).toBe(true);
    expect(twelve.hash).not.toBe(eleven.hash);
  });

  it('waits exactly as 333.12 designs it over the real table: served eleven, waiting start, proposed twelve with no record', () => {
    asThisBuild();
    const build = pocketRouteIds();
    expect(build).toHaveLength(12);
    expect(servedRoutesOf(LEGACY_ALLOWED_ROUTES, build)).toHaveLength(11);
    expect(servedRoutesOf(LEGACY_ALLOWED_ROUTES, build)).not.toContain('start');
    expect(waitingRoutesOf(LEGACY_ALLOWED_ROUTES, build, true)).toEqual(['start']);
    expect(waitingRoutesOf(LEGACY_ALLOWED_ROUTES, build, false)).toEqual([]);
    expect(proposedRoutes(LEGACY_ALLOWED_ROUTES, build, false)).toEqual([...build].sort());
    expect(proposedRoutes(LEGACY_ALLOWED_ROUTES, build, true)).toContain('start');
  });
});

// ---------------------------------------------------------------------------
// The wait, over the shipping host
// ---------------------------------------------------------------------------

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

/** The host, its facts' start key composed the way capabilities.ts composes it, from `startAllowed()`. */
function host(): Host {
  const holder: { one: Host | null } = { one: null };
  const facts = factsWith(() => (holder.one?.startAllowed() === true ? (offer() as PocketSessionsStart) : { state: 'waiting' }));
  holder.one = new PocketHost({ facts, now: () => clock, tailscale: ts.deps, names, onResume: () => () => undefined });
  return holder.one;
}

async function settled(one: Host): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await one.idle();
    await new Promise((resolve) => setImmediate(resolve));
  }
}

/** The sheet's Allow: the lines main drew and the hash they were drawn from. */
async function allow(one: Host): ReturnType<Host['confirmDoor']> {
  const s = one.status();
  const answer = await one.confirmDoor({ linesRead: s.confirmLines, hashRead: s.confirmHash });
  await settled(one);
  return answer;
}

function relaunch(): Host {
  for (const c of ts.children) c.close(null, 'SIGKILL');
  ts.sessions.clear();
  resetFunnelForTests();
  door.listening = false;
  return host();
}

/** The key the Sessions answer would carry for this host now. */
function keyOf(one: Host): PocketSessionsStart | undefined {
  return createPocketRoutes(factsWith(() => (one.startAllowed() ? (offer() as PocketSessionsStart) : { state: 'waiting' }))).sessions(
    new URLSearchParams()
  )?.start;
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'p346-start-key-'));
  clock = 30_000_000;
  asThisBuild();
  resetFunnelForTests();
  Object.assign(door, { listening: false, starts: 0, stops: 0, localPort: 0, updates: [], inputs: [] });
  const made = ensureDoorIdentity({ path: join(userData, 'identity-for-test.json'), seal: fakeSeal(), names: { addresses: [], dnsNames: [NAME] } });
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
  asThisBuild();
  rmSync(userData, { recursive: true, force: true });
});

describe('the wait, over the shipping host (D2, D9, D31)', () => {
  it('an update from the parent keeps the door, lets only start wait, says waiting, and serves it at the Allow that names it', async () => {
    // The parent build: a door agreed to over the eleven, as 0.111.x leaves it.
    asTheParent();
    const parent = host();
    await parent.setDoor({ on: true });
    await settled(parent);
    expect((await allow(parent)).allowed).toBe(true);
    expect(parent.status()).toMatchObject({ state: 'listening', confirmState: 'confirmed' });
    expect(readPocketStore().store?.allowedRoutes).toBeNull();

    // This build, relaunched with no press.
    asThisBuild();
    const one = relaunch();
    door.inputs.length = 0;
    door.updates.length = 0;
    expect(await one.openAtLaunch()).toBe('opened');
    await settled(one);
    const s = one.status();
    expect(s).toMatchObject({ state: 'listening', confirmState: 'confirmed' });
    expect(s.routesWaiting).toEqual(['start']);
    expect(s.routesAllowed).not.toContain('start');
    expect(s.routesOffered).toContain('start');
    expect(s.confirmFace.rows).toEqual([]);
    expect(s.confirmFace.added).toEqual([
      { id: 'start', title: 'New: start sessions from your phone', sentence: 'An agent installed where the project is, with your launch defaults.' }
    ]);
    expect(s.confirmLines.join('\n')).toContain(CLAUSE);
    expect(one.startAllowed()).toBe(false);
    expect(keyOf(one)).toEqual({ state: 'waiting' });
    expect(door.inputs.at(-1)?.routes).not.toContain('start');
    expect(door.inputs.at(-1)?.routes).toHaveLength(11);

    // The Allow whose lines name it: served, with no restart.
    const starts = door.starts;
    expect((await allow(one)).allowed).toBe(true);
    expect(one.startAllowed()).toBe(true);
    expect(one.status().routesWaiting).toEqual([]);
    expect(readPocketStore().store?.allowedRoutes).toContain('start');
    expect(door.updates.some((u) => (u.routes ?? []).includes('start'))).toBe(true);
    expect(door.starts).toBe(starts);
    expect(keyOf(one)).toEqual(offer());
  });

  it('a first setup proposes the twelve, which fields() is not, and only the proposal’s hash is agreed to', async () => {
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    const s = one.status();
    expect(s.confirmState).toBe('never');
    expect(s.routesOffered).toEqual(pocketRouteIds());
    expect(s.routesWaiting).toEqual([]);
    expect(s.confirmFace.added).toEqual([]);
    // fields() reads the eleven a store with no allowed set reads as.
    const own = pocketConfirmStatus(one.fields());
    expect([...one.fields().routes].sort()).toEqual([...LEGACY_ALLOWED_ROUTES]);
    expect(own.hash).not.toBe(s.confirmHash);
    // fields()'s own lines are refused: the seam that agreed to them would agree to nothing (D31).
    await expect(one.confirmDoor({ linesRead: own.lines, hashRead: own.hash })).rejects.toThrow();
    expect(one.startAllowed()).toBe(false);
    // The proposal is agreed to: the twelve, start among them.
    expect((await allow(one)).allowed).toBe(true);
    expect(one.status()).toMatchObject({ state: 'listening', confirmState: 'confirmed', routesWaiting: [] });
    expect(one.startAllowed()).toBe(true);
    expect([...(readPocketStore().store?.allowedRoutes ?? [])]).toEqual([...pocketRouteIds()].sort());
    expect(door.inputs.at(-1)?.routes).toContain('start');
    expect(keyOf(one)).toEqual(offer());
  });
});
