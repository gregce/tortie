/**
 * The owner behind Settings then Phone (Phase 313; Funnel, the hash's facts,
 * the queue's new jobs and the sheet's contract in Phase 330, build/p330/
 * SPEC.md §4.2, §4.3, §4.10, §4.11).
 *
 * THE ACKNOWLEDGEMENT IS SUPPLIED IN MAIN. The renderer hands over two things,
 * the lines it drew and the hash it drew them from, and nothing else.
 *
 * THE DOOR'S LIFETIME (Phase 330): Pair (the switch on) reads Tailscale ONCE
 * and draws the lines; Allow records the agreement and queues the start; the
 * start sweeps, reads, forks the door process, and spawns the Funnel child,
 * and only a read-back counts it. No IPC answer waits on Tailscale's approval.
 *
 * NOTHING HERE BINDS A SOCKET, AND NOTHING EXECS A PROGRAM. `./bind.ts` is
 * replaced by a door made of booleans that counts its starts and stops and
 * holds a real TLS identity (so the allowed phone's certificate is signed by a
 * real key), and Tailscale is an in-memory stand-in behind `FunnelDeps` that
 * answers the two reads from its own state and runs a fake child that behaves
 * as the measured CLI does. The real TLS door is `./switch-queue.test.ts`'s.
 *
 * THE MAC'S NAME (Phase 332, build/p332/SPEC.md §4.9) is asked of
 * `./dns-fixtures.ts`'s `fakeNameDeps`, which opens no socket and reads only
 * its own hand-moved clock: its answers are written by the tests' own reply
 * writer, its sleeps are released by hand here, and it records every question
 * it is asked. Since Phase 332.1 (build/p3321/SPEC.md §5.3) the check is also
 * DRAWN, and that clock is moved by hand alongside the sleeps it stands for.
 */

import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  X509Certificate,
  createCipheriv,
  createHash,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  sign as signWith,
  type KeyObject
} from 'node:crypto';
import type { IpcMain } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PocketNameProgress, PocketRouteId, PocketStatus } from '@shared/ipc/pocket';
import type { Session } from '@shared/types';
import type { FunnelChild, FunnelDeps } from '../funnel';
import type { PocketAlertsPort } from '../ipc';
import type { PocketSealedPresentation } from '../pairing';
import type { PocketFacts, PocketWrites } from '../routes';
import { fakeNameDeps, nxdomainReply, recordReply, type FakeAnswer, type FakeNameDeps } from './dns-fixtures';

let userData = '';
let keystore = true;
let sealWrites = true;

const MARKER = '--tortie-pocket-ipc-test--';

/** Every event main pushed to a window, as JSON, in order. */
const sent: string[] = [];
/** Every log line any module wrote, message and fields, as JSON. */
const logged: string[] = [];
/** Every URL the host asked the OS to open. */
const opened: string[] = [];

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true, isPackaged: false },
  shell: {
    openExternal: async (url: string) => {
      opened.push(url);
    }
  },
  BrowserWindow: {
    getAllWindows: () => [
      {
        isDestroyed: () => false,
        webContents: {
          send: (channel: string, ...payload: unknown[]) => {
            sent.push(JSON.stringify([channel, ...payload]));
          }
        }
      }
    ]
  },
  ipcMain: { handle: () => undefined },
  safeStorage: {
    isEncryptionAvailable: () => keystore,
    encryptString: (text: string) => {
      if (!sealWrites) throw new Error('p330-ipc: the seal refused this write');
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
  const capture =
    (level: string) =>
    (msg: string, fields?: Record<string, unknown>): void => {
      logged.push(JSON.stringify([level, msg, fields ?? null]));
    };
  return {
    ...real,
    getLog: () => ({
      error: capture('error'),
      warn: capture('warn'),
      info: capture('info'),
      debug: capture('debug')
    })
  };
});

vi.mock('../../security/trusted-window', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../security/trusted-window')>();
  return { ...real, assertTrustedIpcSender: () => undefined };
});

// ---------------------------------------------------------------------------
// The door process, as booleans around a real identity
// ---------------------------------------------------------------------------

/** One order across the door process and the Funnel child: which ended first. */
const sequence: string[] = [];

const door = {
  listening: false,
  quitting: false,
  starts: 0,
  stops: 0,
  localPort: 0,
  order: [] as string[],
  updates: [] as { pins?: { phoneId: string; spkiSha256: string }[]; windowOpen?: boolean }[],
  inputs: [] as { publicHost: { name: string; port: number }; pins: unknown[]; windowOpen: boolean }[],
  exitListeners: new Set<() => void>(),
  identity: null as null | { keyPem: string; certPem: string; certificateFingerprint: string; publicKeyFingerprint: string }
};

vi.mock('../bind', async (importOriginal) => {
  const real = await importOriginal<typeof import('../bind')>();
  const tls = await import('../tls');
  return {
    ...real,
    pocketDoorStatus: () => ({
      listening: door.listening,
      localPort: door.listening ? door.localPort : 0,
      certificateFingerprint: door.listening ? (door.identity?.certificateFingerprint ?? null) : null,
      publicKeyFingerprint: door.listening ? (door.identity?.publicKeyFingerprint ?? null) : null,
      shortFingerprint: null,
      lastRefusal: null,
      sentence: null
    }),
    pocketShutdownStarted: () => door.quitting,
    startPocketDoor: async (input: (typeof door.inputs)[number]) => {
      door.order.push('door-start');
      door.inputs.push({ publicHost: input.publicHost, pins: [...input.pins], windowOpen: input.windowOpen });
      if (door.quitting) return { ok: false, reason: 'quitting', sentence: real.DOOR_SENTENCES.quitting };
      door.starts += 1;
      door.listening = true;
      door.localPort = 50_000 + door.starts;
      tls.holdDoorIdentity(door.identity as never);
      return {
        ok: true,
        localPort: door.localPort,
        certificateFingerprint: door.identity?.certificateFingerprint ?? '',
        publicKeyFingerprint: door.identity?.publicKeyFingerprint ?? '',
        shortFingerprint: 'AAAA BBBB CCCC'
      };
    },
    stopPocketDoor: async () => {
      door.order.push('door-stop');
      if (door.listening) sequence.push('door-stop');
      if (door.listening) door.stops += 1;
      door.listening = false;
      tls.holdDoorIdentity(null);
      return { accepted: 0, joined: true, waitedMs: 0 };
    },
    updatePocketDoor: (update: (typeof door.updates)[number]) => {
      if (door.listening) door.updates.push(update);
    },
    onPocketDoorExit: (cb: () => void) => {
      door.exitListeners.add(cb);
      return () => door.exitListeners.delete(cb);
    }
  };
});

// ---------------------------------------------------------------------------
// Tailscale, in memory: the measured CLI's behaviour and nothing else
// ---------------------------------------------------------------------------

const PROGRAM = '/stand/in/tailscale';
const NAME = 'mac.tail00000.ts.net';

class FakeStream extends EventEmitter {}

class Child extends EventEmitter {
  readonly stdout = new FakeStream() as unknown as NodeJS.ReadableStream;
  readonly stderr = new FakeStream() as unknown as NodeJS.ReadableStream;
  readonly signals: string[] = [];
  closed = false;
  /** Its command line as `ps` prints it: the program and the argv it was spawned with. */
  command = '';
  constructor(
    readonly pid: number,
    private readonly onEnd: () => void
  ) {
    super();
  }
  out(text: string): void {
    (this.stdout as unknown as EventEmitter).emit('data', Buffer.from(text, 'utf8'));
  }
  err(text: string): void {
    (this.stderr as unknown as EventEmitter).emit('data', Buffer.from(text, 'utf8'));
  }
  close(code: number | null, signal: string | null = null): void {
    if (this.closed) return;
    this.closed = true;
    this.onEnd();
    this.emit('close', code, signal);
  }
  kill(signal: NodeJS.Signals): boolean {
    this.signals.push(signal);
    ts.log.push(`${signal} ${String(this.pid)}`);
    if (!this.closed) sequence.push(`child-${signal}`);
    this.close(signal === 'SIGINT' ? 0 : null, signal);
    return true;
  }
}

const ts = {
  backend: 'Running',
  tailnet: 'example.github',
  dns: 'MAC.tail00000.ts.net.',
  caps: true,
  /** Ports his own Serve holds at the top level. */
  held: [] as number[],
  approval: 'none' as 'none' | 'wait' | 'elsewhere' | 'exit0',
  /** The stderr a funnel start fails with, or null. */
  refuse: null as string | null,
  /** The foreground sessions, by child pid. */
  sessions: new Map<number, { port: number; target: string }>(),
  children: [] as Child[],
  log: [] as string[],
  approve: null as null | (() => void),
  /** Held open, every read waits here: a job that holds the queue. */
  holdExec: null as Promise<void> | null,
  sleeps: [] as { ms: number; release: () => void }[],
  nextPid: 70_000,
  deps: null as unknown as FunnelDeps
};

function statusText(): string {
  return JSON.stringify({
    BackendState: ts.backend,
    Self: { DNSName: ts.dns, CapMap: ts.caps ? { https: null, funnel: null } : {} },
    CurrentTailnet: { Name: ts.tailnet, MagicDNSSuffix: 'tail00000.ts.net', MagicDNSEnabled: true },
    Peer: null
  });
}

function serveText(): string {
  const name = ts.dns.replace(/\.$/, '').toLowerCase();
  const foreground: Record<string, unknown> = {};
  for (const [pid, s] of ts.sessions) {
    foreground[`s${String(pid)}`] = {
      TCP: { [String(s.port)]: { TCPForward: s.target, ProxyProtocol: 2 } },
      AllowFunnel: { [`${name}:${String(s.port)}`]: true }
    };
  }
  const tcp = Object.fromEntries(ts.held.map((p) => [String(p), { HTTPS: true }]));
  if (ts.held.length === 0 && ts.sessions.size === 0) return 'null';
  return JSON.stringify({ TCP: tcp, Foreground: foreground });
}

function fakeTailscale(): FunnelDeps {
  return {
    resolve: () => ({ resolution: { path: PROGRAM, source: 'dev-override', detail: '' }, overrideSet: true }),
    exec: async (file, args) => {
      ts.log.push(`${file === PROGRAM ? '' : `${file} `}${args.join(' ')}`);
      if (ts.holdExec !== null) await ts.holdExec;
      if (args[0] === 'status') return { stdout: statusText(), stderr: '', code: 0, failed: false, errno: null };
      return { stdout: serveText(), stderr: '', code: 0, failed: false, errno: null };
    },
    spawn: (file, args) => {
      ts.log.push(`spawn ${[file, ...args].join(' ')}`);
      const pid = (ts.nextPid += 1);
      const port = Number(/--tcp=(\d+)/.exec(args.join(' '))?.[1] ?? 0);
      const target = (/tcp:\/\/(\S+)/.exec(args.join(' '))?.[1] ?? '').trim();
      const child = new Child(pid, () => ts.sessions.delete(pid));
      child.command = [file, ...args].join(' ');
      ts.children.push(child);
      const publish = (): void => {
        ts.sessions.set(pid, { port, target });
        child.out(`Available on the internet:\n\n|-- tcp://${NAME}:${String(port)}\n\nPress Ctrl+C to exit.\n`);
      };
      setImmediate(() => {
        if (ts.refuse !== null) {
          child.err(`${ts.refuse}\n`);
          child.close(1);
          return;
        }
        if (ts.approval === 'exit0') {
          child.out('         https://login.tailscale.com/f/funnel?node=nMADEUP\n');
          child.close(0);
          return;
        }
        if (ts.approval === 'wait' || ts.approval === 'elsewhere') {
          child.out(
            ts.approval === 'wait'
              ? '\nTo approve, visit:\n\n         https://login.tailscale.com/f/funnel?node=nMADEUP\n\n'
              : '         https://example.invalid/f/funnel\n'
          );
          ts.approve = () => {
            ts.approve = null;
            child.out('Success.\n');
            publish();
          };
          return;
        }
        publish();
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
    // Waits of a second or more are HELD (a test releases them); shorter ones
    // pass at once. The fake child ends on its first signal, so a stop never
    // needs its waits.
    sleep: (ms) =>
      new Promise<void>((resolve) => {
        ts.sleeps.push({ ms, release: () => resolve() });
        if (ms < 1_000) setImmediate(resolve);
      })
  };
}

// ---------------------------------------------------------------------------

const { PocketHost, registerPocketIpc } = await import('../ipc');
const {
  POCKET_CONFIRM_ACKNOWLEDGEMENT,
  POCKET_HEADERS,
  POCKET_PAIRING_WINDOW_MS,
  clientKeyPinOf,
  confirmPocketDoor,
  forgetPocketDoor,
  phoneIdOf,
  pocketConfirmStatus,
  readPocketStore,
  signAsPhone,
  writePocketStore
} = await import('../pairing');
const { POCKET_TLS_SEAL_PREFIX, ensureDoorIdentity } = await import('../tls');
const { beginFunnelShutdown, joinFunnel, resetFunnelForTests } = await import('../funnel');
const { gmuxErrorPayloadOf } = await import('../../errors');
const {
  POCKET_CONFIRM_WARNING,
  POCKET_FUNNEL_RESTARTING,
  POCKET_FUNNEL_SENTENCES,
  POCKET_NAME_SENTENCES,
  POCKET_ROUTE_IDS,
  pocketFunnelSentence
} = await import('@shared/ipc/pocket');

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

let clock = 10_000_000;
let resume: (() => void) | null = null;
/** The Mac's name, asked of the tests' own zone (Phase 332). Fresh per test. */
let names: FakeNameDeps = fakeNameDeps();

function host(over: { beforeOpen?: () => Promise<unknown>; facts?: PocketFacts; writes?: PocketWrites } = {}): Host {
  return new PocketHost({
    facts: over.facts ?? FACTS,
    ...(over.writes !== undefined ? { writes: over.writes } : {}),
    now: () => clock,
    tailscale: ts.deps,
    names,
    onResume: (cb) => {
      resume = cb;
      return () => {
        resume = null;
      };
    },
    ...(over.beforeOpen !== undefined ? { beforeOpen: over.beforeOpen } : {})
  });
}

function b64u(buf: Buffer): string {
  return buf.toString('base64url');
}

interface Phone {
  label: string;
  sign: KeyObject;
  signPublic: string;
  exchange: KeyObject;
  exchangePublic: string;
  clientPublic: string;
}

function makePhone(label: string): Phone {
  const ed = generateKeyPairSync('ed25519');
  const x = generateKeyPairSync('x25519');
  const ck = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return {
    label,
    sign: ed.privateKey,
    signPublic: b64u(ed.publicKey.export({ format: 'der', type: 'spki' })),
    exchange: x.privateKey,
    exchangePublic: b64u(x.publicKey.export({ format: 'der', type: 'spki' })),
    clientPublic: b64u(ck.publicKey.export({ format: 'der', type: 'spki' }))
  };
}

/** A phone's `/pair` presentation, spelled here from the wire format. */
function presentationOf(secretB64u: string, phone: Phone, extra: Record<string, unknown> = {}): PocketSealedPresentation {
  const secret = Buffer.from(secretB64u, 'base64url');
  const key = Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), 'tortie-pocket-pair-v1', 32));
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const inner: Record<string, unknown> = {
    ck: phone.clientPublic,
    ek: phone.signPublic,
    label: phone.label,
    xk: phone.exchangePublic,
    ...extra
  };
  const ct = Buffer.concat([cipher.update(JSON.stringify(inner), 'utf8'), cipher.final()]);
  const sealed = { iv: b64u(iv), ct: b64u(ct), tag: b64u(cipher.getAuthTag()) };
  const challenge = b64u(
    Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), 'tortie-pocket-challenge-v1', 32))
  );
  const proof = ['tortie-pocket-present-v1', challenge, sealed.iv, sealed.ct, sealed.tag].join('\n');
  return { ...sealed, ek: phone.signPublic, sig: b64u(signWith(null, Buffer.from(proof, 'utf8'), phone.sign)) };
}

/** Let the queue and every immediate it scheduled run. */
async function settled(one: Host): Promise<void> {
  for (let i = 0; i < 8; i += 1) {
    await one.idle();
    await new Promise((resolve) => setImmediate(resolve));
  }
}

/**
 * Every gap the name check is sleeping through ends now (the fake's sleeps,
 * released by hand), and whatever that fires runs.
 */
async function gapsPass(one: Host): Promise<void> {
  names.releaseSleeps();
  await settled(one);
}

/** The name answers twice: main says a code may show. */
async function namePairable(one: Host): Promise<void> {
  for (let i = 0; i < 4 && !one.status().pairable; i += 1) await gapsPass(one);
  expect(one.status().pairable).toBe(true);
}

/** The sheet's order: Pair (the switch on), read, Allow. */
async function pairAndAllow(one: Host): Promise<void> {
  await one.setDoor({ on: true });
  await settled(one);
  const lines = one.status();
  if (lines.confirmState !== 'confirmed') {
    await one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
    await settled(one);
  }
}

/**
 * A phone paired through the host's own window, and the request it sends over
 * its own channel, signed exactly as the phone signs one, over the binding the
 * pairing's HKDF derives from the exchange. The ONE spelling of that prelude
 * for every test here that talks to the door as a paired phone: the session
 * read held in flight, the Sessions read (Phase 316.7) and the writes (Phase
 * 317), which each carried a copy of it until 316.7's integrator drew it out.
 * `allowed` is what Allow answered; a caller that needs the window shut
 * cancels it itself.
 */
async function signingPhone(one: Host, label: string): Promise<{
  id: string;
  allowed: boolean;
  request: (route: PocketRouteId, method: 'GET' | 'POST', target: string, body?: Buffer) => Parameters<Host['handler']>[0];
}> {
  const phone = makePhone(label);
  const offer = await one.beginPairing();
  const secret = (JSON.parse(offer.payload) as { ps: string }).ps;
  one.pairing.present(presentationOf(secret, phone));
  const view = one.pairing.view();
  const { allowed } = one.allowPhone({ linesRead: view.lines, hashRead: view.hash ?? '' });
  const id = phoneIdOf(phone.signPublic);
  const dx = String((JSON.parse(offer.payload) as { dx: string }).dx);
  const shared = diffieHellman({
    privateKey: phone.exchange,
    publicKey: createPublicKey({ key: Buffer.from(dx, 'base64url'), format: 'der', type: 'spki' })
  });
  const binding = Buffer.from(
    hkdfSync('sha256', shared, Buffer.from(`${dx}\n${phone.exchangePublic}`, 'utf8'), 'tortie-pocket-bind-v1', 32)
  ).toString('hex');
  const request = (
    route: PocketRouteId,
    method: 'GET' | 'POST',
    target: string,
    body: Buffer = Buffer.alloc(0)
  ): Parameters<Host['handler']>[0] => {
    const timestamp = String(clock);
    const nonce = randomBytes(12).toString('hex');
    // One shape for a read and a write: the caller names a route and method
    // that go together, as the door's table does.
    return {
      route,
      method,
      target,
      body: new Uint8Array(body),
      channel: id,
      headers: {
        [POCKET_HEADERS.phone]: id,
        [POCKET_HEADERS.timestamp]: timestamp,
        [POCKET_HEADERS.nonce]: nonce,
        [POCKET_HEADERS.signature]: signAsPhone(phone.sign, {
          method,
          target,
          bodySha256: createHash('sha256').update(body).digest('hex'),
          timestamp,
          nonce,
          binding
        })
      } as never
    } as Parameters<Host['handler']>[0];
  };
  return { id, allowed, request };
}

/** A host whose door is on, confirmed and published, and whose name is not yet confirmed. */
async function publishedHost(): Promise<Host> {
  const one = host();
  await pairAndAllow(one);
  expect(one.status().state).toBe('listening');
  return one;
}

/** A host whose door is on, confirmed and published, and pairable, as the sheet leaves it. */
async function listeningHost(): Promise<Host> {
  const one = await publishedHost();
  await namePairable(one);
  return one;
}

/** Pair one phone through the shipping window. Answers its id and certificate. */
async function pairPhone(one: Host, phone: Phone, extra: Record<string, unknown> = {}): Promise<{ id: string; cert: string }> {
  const offer = await one.beginPairing();
  const secret = (JSON.parse(offer.payload) as { ps: string }).ps;
  expect(one.pairing.present(presentationOf(secret, phone, extra))).toEqual({ state: 'pending' });
  const view = one.pairing.view();
  expect(one.allowPhone({ linesRead: view.lines, hashRead: view.hash ?? '' }).allowed).toBe(true);
  const answer = one.pairing.present(presentationOf(secret, phone, extra));
  one.cancelPairing();
  if (answer.state !== 'allowed') throw new Error(`not allowed: ${answer.state}`);
  return { id: phoneIdOf(phone.signPublic), cert: answer.cert };
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
  userData = mkdtempSync(join(tmpdir(), 'p330-ipc-'));
  keystore = true;
  sealWrites = true;
  clock = 10_000_000;
  resume = null;
  resetFunnelForTests();
  Object.assign(door, {
    listening: false,
    quitting: false,
    starts: 0,
    stops: 0,
    localPort: 0,
    order: [],
    updates: [],
    inputs: []
  });
  door.exitListeners.clear();
  const made = ensureDoorIdentity({
    path: join(userData, 'identity-for-test.json'),
    seal: fakeSeal(),
    names: { addresses: [], dnsNames: [NAME] }
  });
  if (made.kind !== 'ready') throw new Error('no test identity');
  door.identity = made.identity;
  Object.assign(ts, {
    backend: 'Running',
    tailnet: 'example.github',
    dns: 'MAC.tail00000.ts.net.',
    caps: true,
    held: [],
    approval: 'none',
    refuse: null,
    children: [],
    log: [],
    approve: null,
    holdExec: null,
    sleeps: []
  });
  sequence.length = 0;
  ts.sessions.clear();
  ts.deps = fakeTailscale();
  names = fakeNameDeps();
  sent.length = 0;
  logged.length = 0;
  opened.length = 0;
});

afterEach(async () => {
  for (const child of ts.children) child.close(null, 'SIGKILL');
  resetFunnelForTests();
  rmSync(userData, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// The sheet at rest (SPEC §4.11, the parent measurement's zero)
// ---------------------------------------------------------------------------

describe('the status the sheet draws', () => {
  it('is off, unread and empty before anything happens, and reading it runs NOTHING', () => {
    const status = host().status();
    expect(status.state).toBe('off');
    expect(status.publicName).toBeNull();
    expect(status.publicPort).toBe(0);
    expect(status.phones).toEqual([]);
    expect(status.droppedPhones).toBe(0);
    expect(status.funnel).toEqual({
      state: 'idle',
      asksApproval: false,
      approvalOpens: false,
      approvalText: null
    });
    expect(status.nameCheck).toBe('none');
    expect(status.pairable).toBe(false);
    expect(names.questions).toEqual([]);
    expect(names.sleeps).toEqual([]);
    expect(Object.keys(status)).not.toContain('address');
    expect(Object.keys(status)).not.toContain('grant');
    expect(ts.log).toEqual([]);
    expect(door.order).toEqual([]);
  });

  it('carries the lines, the hash they were drawn from and the confirm state', async () => {
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    const status = one.status();
    expect(status.confirmState).toBe('never');
    expect(status.confirmHash).toBe(pocketConfirmStatus(one.fields()).hash);
    expect(status.confirmLines[0]).toBe(
      `Answers on the internet at https://${NAME}:8443, through Tailscale Funnel on example.github`
    );
    expect(status.confirmLines[1]).toBe(`Publishes it with ${PROGRAM}`);
  });
});

// ---------------------------------------------------------------------------
// Pair (the switch on): one read, the port chosen, nothing started
// ---------------------------------------------------------------------------

describe('switching the door on (Pair)', () => {
  it('answers at once with the door opening, then reads Tailscale ONCE and starts nothing unconfirmed', async () => {
    const one = host();
    const answered = await one.setDoor({ on: true });
    expect(answered.state).toBe('opening');
    expect(readPocketStore().store).toMatchObject({ enabled: true, bindAtLaunch: true });
    await settled(one);
    expect(ts.log).toEqual(['status --json --peers=false', 'serve status --json']);
    expect(door.order).toEqual([]);
    const status = one.status();
    expect(status.state).toBe('refused');
    expect(status.publicName).toBe(NAME);
    expect(status.publicPort).toBe(8443);
    expect(readPocketStore().store?.publicPort).toBe(8443);
    expect(readPocketStore().store?.tailnetFacts).toEqual({
      funnelProgram: PROGRAM,
      tailnet: 'example.github',
      publicName: NAME
    });
  });

  it('chooses 10000 when his Serve holds 8443, and refuses with a sentence when it holds both', async () => {
    ts.held = [8443];
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    expect(one.status().publicPort).toBe(10000);
    await one.setDoor({ on: false });
    ts.held = [8443, 10000];
    const two = host();
    await two.setDoor({ on: true });
    await settled(two);
    expect(two.status().refusal).toBe(POCKET_FUNNEL_SENTENCES['ports-taken']);
  });

  // THE FIX ROUND (lens 2: faces F1, F2 and F4, and probe:p316's D1). Nothing
  // is agreed to over lines that name no name, no port, or what Tailscale just
  // refused, so nothing is forked onto them either.
  it('both ports held on a FIRST Pair: not confirmable, its sentence, and a confirm records and starts nothing', async () => {
    ts.held = [8443, 10000];
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    const status = one.status();
    expect(status.publicName).toBe(NAME);
    expect(status.publicPort).toBe(0);
    expect(status.confirmLines[0]).toContain(`https://${NAME}:0,`);
    expect(status.confirmable).toBe(false);
    expect(status.refusal).toBe(POCKET_FUNNEL_SENTENCES['ports-taken']);
    const result = await one.confirmDoor({ linesRead: status.confirmLines, hashRead: status.confirmHash });
    expect(result.allowed).toBe(false);
    expect(result.refusal).toBe(POCKET_FUNNEL_SENTENCES['ports-taken']);
    await settled(one);
    expect(one.status().confirmState).toBe('never');
    expect(door.order).toEqual([]);
    expect(ts.log.filter((l) => l.startsWith('spawn'))).toEqual([]);
  });

  it('a confirm sent before the read lands records nothing: the lines read https://:0 (probe:p316 D1)', async () => {
    let release = (): void => undefined;
    ts.holdExec = new Promise<void>((resolve) => {
      release = resolve;
    });
    const one = host();
    const answered = await one.setDoor({ on: true });
    expect(answered.confirmable).toBe(false);
    expect(answered.confirmLines[0]).toContain('https://:0,');
    const result = await one.confirmDoor({ linesRead: answered.confirmLines, hashRead: answered.confirmHash });
    expect(result.allowed).toBe(false);
    expect(result.refusal).toMatch(/has not read Tailscale for this door yet/);
    ts.holdExec = null;
    release();
    await settled(one);
    const after = one.status();
    expect(after.confirmState).toBe('never');
    expect(after.confirmable).toBe(true);
    expect(after.confirmLines[0]).toContain(`https://${NAME}:8443,`);
    expect(door.order).toEqual([]);
  });

  it('Tailscale stopped with nothing agreed to: its sentence, never the stored lines, until a read succeeds', async () => {
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    forgetPocketDoor();
    ts.backend = 'Stopped';
    await one.setDoor({ on: true });
    await settled(one);
    const stopped = one.status();
    // The stored facts still name the door; they are not what is drawn.
    expect(stopped.publicName).toBe(NAME);
    expect(stopped.confirmable).toBe(false);
    expect(stopped.refusal).toBe(POCKET_FUNNEL_SENTENCES['not-running']);
    const refused = await one.confirmDoor({ linesRead: stopped.confirmLines, hashRead: stopped.confirmHash });
    expect(refused.allowed).toBe(false);
    expect(refused.refusal).toBe(POCKET_FUNNEL_SENTENCES['not-running']);
    expect(one.status().confirmState).toBe('never');
    // Try again, with Tailscale back: the lines may be agreed to again.
    ts.backend = 'Running';
    await one.setDoor({ on: true });
    await settled(one);
    expect(one.status().confirmable).toBe(true);
    expect(one.status().refusal).not.toBe(POCKET_FUNNEL_SENTENCES['not-running']);
    expect(door.order).toEqual([]);
  });

  it('forks nothing at launch onto an agreement over port 0, a record no build can write any more', async () => {
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    const store = readPocketStore().store;
    expect(store).not.toBeNull();
    if (store === null) return;
    expect(writePocketStore({ ...store, publicPort: 0 })).toBe(true);
    const two = host();
    const planted = pocketConfirmStatus(two.fields());
    confirmPocketDoor(two.fields(), {
      acknowledgement: POCKET_CONFIRM_ACKNOWLEDGEMENT,
      linesRead: planted.lines,
      hashRead: planted.hash
    });
    expect(pocketConfirmStatus(two.fields()).state).toBe('confirmed');
    expect(await two.openAtLaunch()).toBe('refused');
    expect(door.order).toEqual([]);
    expect(ts.log.filter((l) => l.startsWith('spawn'))).toEqual([]);
    expect(two.status().refusal).toMatch(/has not read Tailscale for this door yet/);
  });

  it('says Tailscale’s own sentence, never “this door changed”, when Tailscale is off', async () => {
    ts.backend = 'Stopped';
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    const status = one.status();
    expect(status.refusal).toBe(POCKET_FUNNEL_SENTENCES['not-running']);
    expect(status.publicName).toBeNull();
    expect(ts.log).toEqual(['status --json --peers=false']);
  });

  it('composes no Tailscale sentence while the door is off, though the last read failed', async () => {
    ts.backend = 'Stopped';
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    expect(one.status().refusal).toBe(POCKET_FUNNEL_SENTENCES['not-running']);
    await one.setDoor({ on: false });
    await settled(one);
    const off = one.status();
    expect(off.state).toBe('off');
    expect(off.confirmable).toBe(false);
    expect(off.refusal).not.toBe(POCKET_FUNNEL_SENTENCES['not-running']);
  });

  it('draws the standing-right warning only when this Mac lacks Funnel’s capabilities', async () => {
    ts.caps = false;
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    expect(one.status().funnel.asksApproval).toBe(true);
  });

  it('refuses during a quit and writes nothing', async () => {
    door.quitting = true;
    await expect(host().setDoor({ on: true })).rejects.toThrow(/quitting/);
    expect(readPocketStore().store).toBeNull();
    expect(ts.log).toEqual([]);
  });

  it('refuses anything that is not a switch, and writes nothing', async () => {
    const one = host();
    for (const bad of [null, {}, { on: 'yes' }]) {
      await expect(one.setDoor(bad as never)).rejects.toThrow(/could not read that switch/);
    }
    expect(readPocketStore().store).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Allow: the start, in the SPEC's order
// ---------------------------------------------------------------------------

describe('Allow starts the door in the SPEC’s order', () => {
  it('sweeps, reads, forks the door, spawns the exact argv at its local port, and counts on the read-back', async () => {
    names.answerWith(nxdomainReply()); // the name is not public yet, so a code waits
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    ts.log.length = 0;
    const lines = one.status();
    const result = await one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
    expect(result.allowed).toBe(true);
    // The answer does not wait on Tailscale.
    expect(result.status.state).toBe('opening');
    await settled(one);
    expect(door.order).toEqual(['door-start']);
    expect(ts.log).toEqual([
      'status --json --peers=false',
      'serve status --json',
      `spawn ${PROGRAM} funnel --tcp=8443 --proxy-protocol=2 tcp://127.0.0.1:${String(door.localPort)}`,
      'serve status --json'
    ]);
    expect(door.inputs[0]?.publicHost).toEqual({ name: NAME, port: 8443 });
    const status = one.status();
    expect(status.state).toBe('listening');
    expect(status.funnel.state).toBe('publishing');
    expect(status.funnel).not.toHaveProperty('publishedAt');
    // Phase 332: the counted start asks for the Mac's name at once, and a code waits.
    expect(status.nameCheck).toBe('checking');
    expect(status.pairable).toBe(false);
    expect(names.questions.map((q) => [q.qname, q.qtype, q.rd])).toEqual([[NAME, 'A', false]]);
  });

  it('forks and spawns nothing for a door nobody confirmed', async () => {
    const one = host();
    await one.setDoor({ on: true });
    await one.start();
    await settled(one);
    expect(door.order).toEqual([]);
    expect(ts.log.some((l) => l.startsWith('spawn'))).toBe(false);
  });

  it('refuses a confirm drawn for other fields, and starts nothing', async () => {
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    await expect(one.confirmDoor({ linesRead: [], hashRead: 'deadbeef' })).rejects.toThrow();
    await settled(one);
    expect(door.order).toEqual([]);
  });

  it('does not restart onto a moved field: the tailnet changed between Pair and the start', async () => {
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    const lines = one.status();
    ts.tailnet = 'someone-else.github';
    await one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
    await settled(one);
    expect(door.order).toEqual([]);
    const status = one.status();
    expect(status.confirmState).toBe('changed');
    expect(status.confirmLines[0]).toContain('someone-else.github');
    expect(ts.log.some((l) => l.startsWith('spawn'))).toBe(false);
  });

  it('refuses a confirmed port that is now somebody else’s, and never moves it', async () => {
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    const lines = one.status();
    ts.held = [8443];
    await one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
    await settled(one);
    expect(door.order).toEqual([]);
    expect(one.status().refusal).toBe(pocketFunnelSentence('port-taken', 8443));
    expect(one.status().refusal).toContain('port 8443');
    expect(readPocketStore().store?.publicPort).toBe(8443);
  });

  it('says each Funnel refusal in its own sentence, and stops the door process', async () => {
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    const lines = one.status();
    ts.refuse = 'Unable to turn on Funnel while shields-up is enabled';
    await one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
    await settled(one);
    expect(door.order).toEqual(['door-start', 'door-stop']);
    expect(one.status().state).toBe('refused');
    expect(one.status().refusal).toBe(POCKET_FUNNEL_SENTENCES['shields-up']);
  });
});

// ---------------------------------------------------------------------------
// The approval (SPEC §4.2.5, §4.3)
// ---------------------------------------------------------------------------

describe('Tailscale’s approval', () => {
  async function waitingOnApproval(mode: 'wait' | 'elsewhere' = 'wait'): Promise<Host> {
    ts.approval = mode;
    ts.caps = false;
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    const lines = one.status();
    await one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    return one;
  }

  it('draws Open Tailscale for Tailscale’s own page, and the answer did not wait for it', async () => {
    const one = await waitingOnApproval();
    const status = one.status();
    expect(status.state).toBe('opening');
    expect(status.funnel).toMatchObject({ state: 'approval', approvalOpens: true, approvalText: null });
    expect(await one.openApproval()).toBe(true);
    expect(opened).toEqual(['https://login.tailscale.com/f/funnel?node=nMADEUP']);
    ts.approve?.();
    await settled(one);
    expect(one.status().state).toBe('listening');
    // The page is not held once the wait is over.
    expect(await one.openApproval()).toBe(false);
    expect(opened).toHaveLength(1);
  });

  it('never opens a page on another host, and hands it over as text', async () => {
    const one = await waitingOnApproval('elsewhere');
    const status = one.status();
    expect(status.funnel).toMatchObject({
      state: 'approval',
      approvalOpens: false,
      approvalText: 'https://example.invalid/f/funnel'
    });
    expect(await one.openApproval()).toBe(false);
    expect(opened).toEqual([]);
    await one.setDoor({ on: false });
  });

  it('ends at once on an off press: the child is signalled, the door process stopped, and the answer is off', async () => {
    const one = await waitingOnApproval();
    const off = await one.setDoor({ on: false });
    expect(off.state).toBe('off');
    expect(ts.children[0]?.signals).toEqual(['SIGINT']);
    expect(door.order[0]).toBe('door-start');
    expect(door.order.slice(1).every((o) => o === 'door-stop')).toBe(true);
    expect(door.starts).toBe(1);
    expect(door.stops).toBe(1);
    expect(door.listening).toBe(false);
    expect(one.status().funnel.state).toBe('idle');
    expect(opened).toEqual([]);
  });

  it('says a non-admin’s exit 0 is not approved', async () => {
    ts.approval = 'exit0';
    const one = host();
    await pairAndAllow(one);
    expect(one.status().refusal).toBe(POCKET_FUNNEL_SENTENCES['not-approved']);
  });
});

// ---------------------------------------------------------------------------
// Off, and the order things end in
// ---------------------------------------------------------------------------

describe('switching the door off', () => {
  it('writes both fields false, and unpublishes FIRST: the child, then the door process', async () => {
    const one = await listeningHost();
    const pid = ts.children[0]?.pid;
    sequence.length = 0;
    const off = await one.setDoor({ on: false });
    expect(sequence).toEqual(['child-SIGINT', 'door-stop']);
    expect(off.state).toBe('off');
    expect(readPocketStore().store).toMatchObject({ enabled: false, bindAtLaunch: false });
    expect(ts.log.slice(-1)).toEqual([`SIGINT ${String(pid)}`]);
    expect(door.order.slice(-1)).toEqual(['door-stop']);
    expect(ts.sessions.size).toBe(0);
  });

  it('opens the agreed door again at once when nothing else moved', async () => {
    const one = await listeningHost();
    await one.setDoor({ on: false });
    await one.setDoor({ on: true });
    await settled(one);
    expect(one.status().state).toBe('listening');
    expect(door.starts).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// The restart (SPEC §4.2.7)
// ---------------------------------------------------------------------------

describe('a child that exits unexpectedly', () => {
  function restartWaits(): number[] {
    return ts.sleeps.filter((s) => s.ms >= 2_000 && s.ms !== 2_000 + 0.5).map((s) => s.ms);
  }

  it('says Tortie is trying again, restarts at the floor, and counts it', async () => {
    const one = await listeningHost();
    const first = ts.children[0];
    ts.sleeps.length = 0;
    first?.close(null, 'SIGKILL');
    await settled(one);
    const status = one.status();
    expect(status.state).toBe('opening');
    expect(status.funnel.state).toBe('restarting');
    expect(POCKET_FUNNEL_RESTARTING).toBe('Tailscale stopped publishing the door. Tortie is trying again.');
    const floor = ts.sleeps.find((s) => s.ms === 2_000);
    expect(floor).toBeDefined();
    floor?.release();
    await settled(one);
    expect(one.status().state).toBe('listening');
    expect(ts.children).toHaveLength(2);
    expect(door.starts).toBe(2);
    // A counted start resets the spacing: the next death waits the floor again.
    ts.sleeps.length = 0;
    ts.children[1]?.close(null, 'SIGKILL');
    await settled(one);
    expect(ts.sleeps.some((s) => s.ms === 2_000)).toBe(true);
    expect(restartWaits()).not.toContain(4_000);
    await one.setDoor({ on: false });
  });

  it('doubles the spacing while the restart keeps failing', async () => {
    const one = await listeningHost();
    ts.sleeps.length = 0;
    ts.refuse = 'Another client is changing the serve config; please try again.';
    ts.children[0]?.close(null, 'SIGKILL');
    await settled(one);
    ts.sleeps.find((s) => s.ms === 2_000)?.release();
    await settled(one);
    expect(ts.sleeps.some((s) => s.ms === 4_000)).toBe(true);
    expect(one.status().funnel.state).toBe('restarting');
    await one.setDoor({ on: false });
    expect(one.status().funnel.state).toBe('idle');
  });

  it('NEVER restarts onto a moved field: the gate reads changed and the new lines are drawn', async () => {
    const one = await listeningHost();
    const spawns = ts.children.length;
    ts.tailnet = 'switched-profile.github';
    ts.children[0]?.close(null, 'SIGKILL');
    await settled(one);
    ts.sleeps.find((s) => s.ms === 2_000)?.release();
    await settled(one);
    expect(ts.children).toHaveLength(spawns);
    const status = one.status();
    expect(status.state).toBe('refused');
    expect(status.confirmState).toBe('changed');
    expect(status.confirmLines[0]).toContain('switched-profile.github');
    expect(door.listening).toBe(false);
  });

  it('takes the same path when the door process dies: the child is stopped first, then both start again', async () => {
    const one = await listeningHost();
    door.listening = false;
    for (const cb of door.exitListeners) cb();
    await settled(one);
    expect(one.status().funnel.state).toBe('restarting');
    ts.sleeps.find((s) => s.ms === 2_000)?.release();
    await settled(one);
    expect(ts.children[0]?.signals).toEqual(['SIGINT']);
    expect(one.status().state).toBe('listening');
    expect(door.starts).toBe(2);
  });

  it('does not restart a child that died after the off was pressed and before its close ran', async () => {
    const one = await listeningHost();
    // A wake check holds the queue on a read, so the off's close waits.
    let release = (): void => undefined;
    ts.holdExec = new Promise<void>((resolve) => {
      release = resolve;
    });
    resume?.();
    await new Promise((resolve) => setImmediate(resolve));
    const off = one.setDoor({ on: false });
    await new Promise((resolve) => setImmediate(resolve));
    expect(readPocketStore().store?.enabled).toBe(false);
    ts.sleeps.length = 0;
    ts.children[0]?.close(null, 'SIGKILL');
    await new Promise((resolve) => setImmediate(resolve));
    expect(one.status().funnel.state).not.toBe('restarting');
    expect(ts.sleeps.some((s) => s.ms === 2_000)).toBe(false);
    ts.holdExec = null;
    release();
    expect((await off).state).toBe('off');
    await settled(one);
    expect(ts.children).toHaveLength(1);
    expect(one.status().funnel.state).toBe('idle');
  });

  it('does not restart once the switch is off', async () => {
    const one = await listeningHost();
    await one.setDoor({ on: false });
    ts.children[0]?.close(null, 'SIGKILL');
    await settled(one);
    expect(one.status().funnel.state).toBe('idle');
    expect(ts.sleeps.some((s) => s.ms === 2_000)).toBe(false);
  });
});

describe('the wake', () => {
  it('reads the serve config once while published, and restarts when Tailscale stopped publishing', async () => {
    const one = await listeningHost();
    ts.log.length = 0;
    resume?.();
    await settled(one);
    expect(ts.log).toEqual(['serve status --json']);
    // Tailscale dropped the session while the Mac slept (the child still runs).
    ts.sessions.clear();
    ts.log.length = 0;
    resume?.();
    await settled(one);
    expect(ts.log[0]).toBe('serve status --json');
    expect(ts.log.some((l) => l.startsWith('spawn'))).toBe(true);
    expect(one.status().state).toBe('listening');
  });

  it('runs nothing when the door is off', async () => {
    const one = host();
    resume?.();
    await settled(one);
    expect(ts.log).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The launch step (SPEC §4.13)
// ---------------------------------------------------------------------------

describe('the launch step', () => {
  it('does nothing at all for a door nobody turned on: no read, no ps, no fork', async () => {
    const one = host();
    expect(await one.openAtLaunch()).toBe('off');
    expect(ts.log).toEqual([]);
    expect(door.order).toEqual([]);
  });

  it('publishes a door the person left on and confirmed, with no press', async () => {
    await listeningHost();
    // A relaunch: the child and the door went with the last run.
    for (const c of ts.children) c.close(null, 'SIGKILL');
    ts.sessions.clear();
    resetFunnelForTests();
    door.listening = false;
    ts.log.length = 0;
    const next = host();
    expect(await next.openAtLaunch()).toBe('opened');
    expect(ts.log[0]).toBe('status --json --peers=false');
  });

  it('stays shut with Tailscale’s own sentence when Tailscale is off at launch, and the hash is the confirmed one', async () => {
    const one = await listeningHost();
    await one.setDoor({ on: false });
    await one.setDoor({ on: true });
    await settled(one);
    for (const c of ts.children) c.close(null, 'SIGKILL');
    resetFunnelForTests();
    door.listening = false;
    ts.backend = 'Stopped';
    const next = host();
    // The stored facts hash to the agreement: nothing reads "changed".
    expect(next.status().confirmState).toBe('confirmed');
    expect(await next.openAtLaunch()).toBe('refused');
    expect(next.status().refusal).toBe(POCKET_FUNNEL_SENTENCES['not-running']);
    expect(next.status().confirmState).toBe('confirmed');
  });

  it('ends a proved orphan at launch even when the door will not open', async () => {
    await listeningHost();
    const orphan = ts.children[0];
    // Tortie crashed: the child runs on, still recorded; the agreement is
    // then withdrawn, so this launch will not open the door.
    resetFunnelForTests();
    door.listening = false;
    forgetPocketDoor();
    ts.log.length = 0;
    const next = host();
    expect(await next.openAtLaunch()).toBe('refused');
    expect(orphan?.signals).toEqual(['SIGINT']);
    expect(ts.log.some((l) => l.startsWith('spawn'))).toBe(false);
    expect(ts.log.some((l) => l.startsWith('status'))).toBe(false);
  });

  it('stays shut, and says why, for bindAtLaunch written with no confirm', async () => {
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    const next = host();
    expect(await next.openAtLaunch()).toBe('refused');
    expect(door.order).toEqual([]);
    expect(next.status().refusal).toContain('nobody has confirmed');
  });
});

// ---------------------------------------------------------------------------
// Pairing through the owner (SPEC §4.3, §4.7)
// ---------------------------------------------------------------------------

describe('a pairing window opens only on a published door', () => {
  it('refuses while the door is off, and runs nothing', async () => {
    await expect(host().beginPairing()).rejects.toThrow(/not answering/);
    expect(ts.log).toEqual([]);
  });

  it('re-reads the serve config first, and shows the code only while Tailscale publishes it', async () => {
    const one = await listeningHost();
    ts.log.length = 0;
    const offer = await one.beginPairing();
    expect(ts.log).toEqual(['serve status --json']);
    const payload = JSON.parse(offer.payload) as Record<string, unknown>;
    expect(Object.keys(payload)).toEqual(['v', 'host', 'port', 'fp', 'dk', 'dx', 'ps', 'exp']);
    expect(payload['v']).toBe(3);
    expect(payload['host']).toBe(NAME);
    expect(payload['port']).toBe(8443);
    const spki = Buffer.from((door.identity?.publicKeyFingerprint ?? '').replace(/:/g, ''), 'hex');
    expect(payload['fp']).toBe(spki.toString('base64url'));
    expect(door.updates).toContainEqual({ windowOpen: true });
  });

  it('refuses with the restart path when Tailscale stopped publishing, and shows no code', async () => {
    const one = await listeningHost();
    ts.sessions.clear();
    await expect(one.beginPairing()).rejects.toThrow(/Tortie is trying again/);
    expect(one.pairing.windowOpen()).toBe(false);
    await settled(one);
    expect(one.status().state).toBe('listening');
    expect(ts.children.length).toBe(2);
  });

  it('tells the door process the window shut when it is cancelled', async () => {
    const one = await listeningHost();
    await one.beginPairing();
    one.cancelPairing();
    expect(door.updates.at(-1)).toEqual({ windowOpen: false });
  });
});

describe('the person is asked last, and main supplies the sentence', () => {
  it('allows the phone in front of the person, posts its pin, and hands it a certificate over its key', async () => {
    const one = await listeningHost();
    const phone = makePhone('Greg iPhone');
    const { id, cert } = await pairPhone(one, phone);
    const status = one.status();
    expect(status.phones.map((p) => p.label)).toEqual(['Greg iPhone']);
    expect(status.confirmState).toBe('confirmed');
    expect(status.state).toBe('listening');
    expect(door.updates).toContainEqual({ pins: [{ phoneId: id, spkiSha256: clientKeyPinOf(phone.clientPublic) }] });
    const x509 = new X509Certificate(Buffer.from(cert, 'base64url'));
    expect(b64u(x509.publicKey.export({ type: 'spki', format: 'der' }))).toBe(phone.clientPublic);
    expect(x509.verify(new X509Certificate(door.identity?.certPem ?? '').publicKey)).toBe(true);
    expect(POCKET_CONFIRM_ACKNOWLEDGEMENT).toBe('a person read what this door will answer and allowed it');
    expect(one.pairing.view().warning).toBe(POCKET_CONFIRM_WARNING);
  });

  it('refuses an allow whose hash is not the one the sheet drew', async () => {
    const one = await listeningHost();
    const offer = await one.beginPairing();
    const secret = (JSON.parse(offer.payload) as { ps: string }).ps;
    one.pairing.present(presentationOf(secret, makePhone('Greg iPhone')));
    expect(() => one.allowPhone({ linesRead: [], hashRead: 'deadbeef' })).toThrow();
    expect(one.status().phones).toEqual([]);
  });

  it('refuses an allow with no phone in front of the person', () => {
    const result = host().allowPhone({ linesRead: [], hashRead: '' });
    expect(result.allowed).toBe(false);
    expect(result.refusal).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Removing a phone (SPEC §4.7.6), and refusal 7 through the owner's handler
// ---------------------------------------------------------------------------

describe('removing a phone', () => {
  it('cuts its sockets at once with the new pins, withdraws the agreement, and closes: child, then door', async () => {
    const one = await listeningHost();
    const a = makePhone('A');
    const b = makePhone('B');
    const pa = await pairPhone(one, a);
    await pairPhone(one, b);
    door.updates.length = 0;
    const pid = ts.children[0]?.pid;
    door.order.length = 0;
    ts.log.length = 0;
    const after = await one.removePhone(pa.id);
    expect(door.updates[0]).toEqual({
      pins: [{ phoneId: phoneIdOf(b.signPublic), spkiSha256: clientKeyPinOf(b.clientPublic) }]
    });
    expect(after.phones.map((p) => p.label)).toEqual(['B']);
    expect(after.confirmState).toBe('never');
    expect(ts.log).toEqual([`SIGINT ${String(pid)}`]);
    expect(door.order).toEqual(['door-stop']);
    expect(after.state).toBe('refused');
    // Allow again: the door restarts without the removed phone's pin.
    await one.confirmDoor({ linesRead: after.confirmLines, hashRead: after.confirmHash });
    await settled(one);
    expect(one.status().state).toBe('listening');
    expect(door.inputs.at(-1)?.pins).toEqual([
      { phoneId: phoneIdOf(b.signPublic), spkiSha256: clientKeyPinOf(b.clientPublic) }
    ]);
  });

  it('changes nothing for an id nobody has', async () => {
    const one = await listeningHost();
    await pairPhone(one, makePhone('A'));
    const stops = door.stops;
    const after = await one.removePhone('not-a-phone');
    expect(after.phones).toHaveLength(1);
    expect(door.stops).toBe(stops);
    expect(after.state).toBe('listening');
  });

  describe('while the phone’s request is in flight', () => {
    async function heldOwner(): Promise<{
      one: Host;
      held: { gate: Promise<void> | null; reached: number };
      ask: () => Promise<number>;
      phoneId: string;
    }> {
      const held = { gate: null as Promise<void> | null, reached: 0 };
      const session = {
        id: 's-held',
        name: 'held',
        tmuxName: 'held',
        projectPath: '/w/held',
        cwd: '/w/held',
        agent: 'claude',
        status: 'idle',
        createdAt: 1
      } as Session;
      const one = host({
        facts: {
          ...FACTS,
          sessions: () => [session],
          refresh: async () => {
            held.reached += 1;
            if (held.gate !== null) await held.gate;
            return null;
          }
        }
      });
      await pairAndAllow(one);
      await namePairable(one);
      const phone = await signingPhone(one, 'Held iPhone');
      const ask = async (): Promise<number> => {
        const answer = await one.handler(phone.request('session', 'GET', `/v1/session?id=${session.id}`), {
          stopping: () => false
        });
        return answer.status;
      };
      return { one, held, ask, phoneId: phone.id };
    }

    it('answers the paired phone when nothing changed (the control)', async () => {
      const { held, ask } = await heldOwner();
      let release = (): void => undefined;
      held.gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const inFlight = ask();
      await vi.waitFor(() => expect(held.reached).toBe(1));
      release();
      expect(await inFlight).toBe(200);
    });

    it('refuses it, unpaired, when the phone is removed inside the refresh', async () => {
      const { one, held, ask, phoneId } = await heldOwner();
      let release = (): void => undefined;
      held.gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const inFlight = ask();
      await vi.waitFor(() => expect(held.reached).toBe(1));
      await one.removePhone(phoneId);
      release();
      expect(await inFlight).toBe(404);
      expect(logged.some((l) => l.includes('refused a request at the door: unpaired'))).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// The Sessions tab's read through the host (Phase 316.7, build/p3167/SPEC.md
// §6.2 step 2): the answer switch hands the whole query to the route.
// ---------------------------------------------------------------------------

describe('the Sessions tab’s read, through the host', () => {
  /** A paired phone that signs a read the way the phone does, over its own channel. */
  async function reader(one: Host, label: string): Promise<(target: string) => ReturnType<Host['handler']>> {
    const phone = await signingPhone(one, label);
    expect(phone.allowed).toBe(true);
    one.cancelPairing();
    return (target: string) => one.handler(phone.request('sessions', 'GET', target), { stopping: () => false });
  }

  const LISTED = [
    { id: 's-live', name: 'live one', tmuxName: 'l', projectPath: '/w/app', cwd: '/w/app', agent: 'claude', status: 'idle', createdAt: 5 },
    { id: 's-ended', name: 'ended one', tmuxName: 'e', projectPath: '/w/app', cwd: '/w/app', agent: 'claude', status: 'exited', createdAt: 4 }
  ] as Session[];

  it('answers GET /v1/sessions with the rows the route composed for the words asked', async () => {
    const one = host({ facts: { ...FACTS, sessions: () => LISTED } });
    await pairAndAllow(one);
    await namePairable(one);
    const get = await reader(one, 'Reader');
    const all = await get('/v1/sessions?show=all&group=none');
    expect(all.status).toBe(200);
    const body = JSON.parse(all.body as string) as { asked: { show: string }; rows: { sessionId: string }[]; total: number };
    expect(body.asked.show).toBe('all');
    expect(body.rows.map((r) => r.sessionId)).toEqual(['s-live', 's-ended']);
    expect(body.total).toBe(2);
    // No words: Active, so the ended session is out of sight.
    const fresh = await get('/v1/sessions');
    expect((JSON.parse(fresh.body as string) as { rows: { sessionId: string }[] }).rows.map((r) => r.sessionId)).toEqual(['s-live']);
  });

  it('refuses a query the route refuses with a 404, logged as route, and logs no query value', async () => {
    const one = host({ facts: { ...FACTS, sessions: () => LISTED } });
    await pairAndAllow(one);
    await namePairable(one);
    const get = await reader(one, 'Reader');
    const from = logged.length;
    for (const target of ['/v1/sessions?show=bogusword', '/v1/sessions?limit=9', '/v1/sessions?agent=Zed_Agent']) {
      expect(await get(target), target).toEqual({ status: 404, body: null });
    }
    const lines = logged.slice(from);
    // One line per reason per process, a word and never a value.
    expect(lines.filter((l) => l.includes('refused a request at the door: route'))).toHaveLength(1);
    for (const line of lines) {
      for (const value of ['bogusword', 'limit', 'Zed_Agent']) expect(line).not.toContain(value);
    }
  });
});

// ---------------------------------------------------------------------------
// Phase 337: the Screen's read and its keys, through the host
// (build/p337/SPEC.md §5.3.1, §5.5)
// ---------------------------------------------------------------------------

describe('the Screen and its keys, through the host (Phase 337)', () => {
  /** A paired phone that signs the way the phone does, over its own channel. */
  async function screenPhone(one: Host, label: string) {
    const phone = await signingPhone(one, label);
    expect(phone.allowed).toBe(true);
    one.cancelPairing();
    return phone;
  }

  const LISTED = [
    { id: 's-live', name: 'live one', tmuxName: 'l', projectPath: '/w/app', cwd: '/w/app', agent: 'claude', status: 'running', createdAt: 5 }
  ] as Session[];
  const REV = '0123456789ab';
  const UNCHANGED = { sessionId: 's-live', revision: REV, at: 7, unchanged: true, screen: null, why: null, sentence: null };

  it('answers GET /v1/screen through the switch, handing the watcher the session, since and refusal 1’s closing', async () => {
    const asked: [string, string | null, boolean][] = [];
    const one = host({
      facts: {
        ...FACTS,
        sessions: () => LISTED,
        screen: async (session, since, closing) => {
          asked.push([session.id, since, closing()]);
          return UNCHANGED;
        }
      }
    });
    await pairAndAllow(one);
    await namePairable(one);
    const phone = await screenPhone(one, 'Screen');
    const answer = await one.handler(phone.request('screen', 'GET', `/v1/screen?id=s-live&since=${REV}`), { stopping: () => false });
    expect(answer.status).toBe(200);
    expect(JSON.parse(answer.body as string)).toEqual(UNCHANGED);
    expect(asked).toEqual([['s-live', REV, false]]);
  });

  it('ends a held poll the moment the door that accepted it begins to stop, and answers nothing', async () => {
    let stopping = false;
    let seenClosing: boolean | null = null;
    const one = host({
      facts: {
        ...FACTS,
        sessions: () => LISTED,
        screen: async (_session, _since, closing) => {
          stopping = true;
          seenClosing = closing();
          return UNCHANGED;
        }
      }
    });
    await pairAndAllow(one);
    await namePairable(one);
    const phone = await screenPhone(one, 'Screen');
    const answer = await one.handler(phone.request('screen', 'GET', '/v1/screen?id=s-live'), { stopping: () => stopping });
    expect(seenClosing).toBe(true);
    expect(answer).toEqual({ status: 404, body: null });
  });

  it('answers /v1/screen 404 on a host with no watcher, and for a query the route refuses', async () => {
    let asked = 0;
    const bare = host({ facts: { ...FACTS, sessions: () => LISTED } });
    await pairAndAllow(bare);
    await namePairable(bare);
    const a = await screenPhone(bare, 'A');
    expect(await bare.handler(a.request('screen', 'GET', '/v1/screen?id=s-live'), { stopping: () => false })).toEqual({
      status: 404,
      body: null
    });
    const one = host({
      facts: {
        ...FACTS,
        sessions: () => LISTED,
        screen: async () => {
          asked += 1;
          return UNCHANGED;
        }
      }
    });
    await pairAndAllow(one);
    await namePairable(one);
    const b = await screenPhone(one, 'B');
    for (const target of ['/v1/screen', '/v1/screen?id=s-live&cols=80', '/v1/screen?id=s-live&since=XYZ', '/v1/screen?id=nobody']) {
      expect(await one.handler(b.request('screen', 'GET', target), { stopping: () => false }), target).toEqual({
        status: 404,
        body: null
      });
    }
    expect(asked).toBe(0);
  });

  it('types through the writes it was handed: POST /v1/keys reaches keys with the signed items, turn and mark', async () => {
    const asked: unknown[] = [];
    const one = host({
      writes: {
        end: async () => ({ outcome: 'done' }),
        choose: async () => ({ outcome: 'done' }),
        say: async () => ({ outcome: 'done' }),
        keys: async (input, still) => {
          asked.push([input, still()]);
          return { outcome: 'done' };
        }
      }
    });
    await pairAndAllow(one);
    await namePairable(one);
    const phone = await screenPhone(one, 'Keys');
    const W = 'c'.repeat(32);
    const body = { dialog: null, keys: [{ k: 'C-c' }], session: 's-live', turn: '0123456789abcdef-2', write: W };
    const answer = await one.handler(
      phone.request('keys', 'POST', '/v1/keys', Buffer.from(JSON.stringify(body), 'utf8')),
      { stopping: () => false }
    );
    expect(JSON.parse(answer.body as string)).toEqual({ verb: 'keys', write: W, outcome: 'done', reason: null, sentence: null });
    expect(answer.acted).toBe(true);
    expect(asked).toEqual([[{ sessionId: 's-live', keys: [{ k: 'C-c' }], turn: '0123456789abcdef-2', dialog: null }, true]]);
    expect(logged.some((l) => l.includes("the phone's keys: done") && l.includes('s-live'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The phone's writes through the host (Phase 317, build/p317/SPEC.md §5.5)
// ---------------------------------------------------------------------------

describe('the phone’s writes, through the host', () => {
  /** A paired phone that signs writes the way the phone does, over its own channel. */
  async function writer(one: Host, label: string): Promise<{
    id: string;
    post: (route: 'end' | 'unpair', body: Record<string, unknown>) => ReturnType<Host['handler']>;
  }> {
    const phone = await signingPhone(one, label);
    expect(phone.allowed).toBe(true);
    one.cancelPairing();
    const post = (route: 'end' | 'unpair', fields: Record<string, unknown>): ReturnType<Host['handler']> =>
      one.handler(
        // `unpair` is no route since the fix round; a test still sends it, as a stranger could.
        phone.request(route as 'end', 'POST', `/v1/${route}`, Buffer.from(JSON.stringify(fields), 'utf8')),
        { stopping: () => false }
      );
    return { id: phone.id, post };
  }

  const W1 = 'a'.repeat(32);
  const W2 = 'b'.repeat(32);

  it('ends a session through the writes it was handed, with the signed session id and batch flag', async () => {
    const asked: unknown[] = [];
    const one = host({
      writes: {
        end: async (input) => {
          asked.push(input);
          return { outcome: 'done' };
        },
        // Phase 318's two verbs and Phase 337's keys, unused here: this test asks End alone.
        choose: async () => ({ outcome: 'done' }),
        say: async () => ({ outcome: 'done' }),
        keys: async () => ({ outcome: 'done' })
      }
    });
    await pairAndAllow(one);
    await namePairable(one);
    const a = await writer(one, 'A');
    const answer = await a.post('end', { session: 'sess-1', write: W2, batch: true });
    expect(JSON.parse(answer.body as string)).toEqual({ verb: 'end', write: W2, outcome: 'done', reason: null, sentence: null });
    expect(answer.acted).toBe(true);
    expect(Object.keys(answer).sort()).toEqual(['acted', 'body', 'status']);
    expect(asked).toEqual([{ sessionId: 'sess-1', batch: true }]);
    expect(logged.some((l) => l.includes("the phone's end: done") && l.includes('sess-1'))).toBe(true);
  });

  it('answers the write 404 on a host handed no writes (the push seam’s shape)', async () => {
    const one = await listeningHost();
    const a = await writer(one, 'A');
    expect(await a.post('end', { session: 's', write: W1, batch: false })).toEqual({ status: 404, body: null });
    expect(one.status().phones).toHaveLength(1);
  });

  // THE FIX ROUND removed the phone's own unpair (build/p317/SPEC.md "§Fix
  // round"): the phone waited on it before it could forget a Mac that did not
  // answer, which made Unpair slower than today. Its path is no route now, so
  // the handler refuses it and nothing about the phones moves.
  it('refuses the removed unpair path and removes nobody, whatever the body says', async () => {
    const one = host({
      writes: {
        end: async () => ({ outcome: 'failed', sentence: 'not in this test' }),
        choose: async () => ({ outcome: 'failed', sentence: 'not in this test' }),
        say: async () => ({ outcome: 'failed', sentence: 'not in this test' }),
        keys: async () => ({ outcome: 'failed', sentence: 'not in this test' })
      }
    });
    await pairAndAllow(one);
    await namePairable(one);
    const a = await writer(one, 'A');
    const b = await writer(one, 'B');
    expect(await b.post('unpair', { write: W2 })).toEqual({ status: 404, body: null });
    expect(await b.post('unpair', { write: W2, phone: a.id })).toEqual({ status: 404, body: null });
    expect(one.status().phones).toHaveLength(2);
  });

  it('runs Remove as it always did: the store, the cut, the withdrawal, then the close', async () => {
    const one = await listeningHost();
    const a = await writer(one, 'A');
    await writer(one, 'B');
    door.updates.length = 0;
    door.order.length = 0;
    const after = await one.removePhone(a.id);
    expect(after.phones.map((p) => p.label)).toEqual(['B']);
    expect(after.confirmState).toBe('never');
    expect(door.updates).toHaveLength(1);
    expect(door.order).toEqual(['door-stop']);
  });

  it('reads Remove as the one store write that removes a phone, before anything yields, and no unpair beside it', async () => {
    const { readFileSync } = await import('node:fs');
    const text = readFileSync(join(__dirname, '..', 'ipc.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(text).not.toMatch(/dropPhone|unpairSigningPhone/);
    const start = text.indexOf('async removePhone(phoneId: string): Promise<PocketStatus> {');
    expect(start).toBeGreaterThan(-1);
    const body = text.slice(start, text.indexOf('await', start));
    expect(body).toContain('this.writeStore({ ...store, phones: kept })');
  });
});

// ---------------------------------------------------------------------------
// The store's migration (SPEC §4.4)
// ---------------------------------------------------------------------------

describe('phones paired before this version', () => {
  it('are dropped whole and counted for the sheet, and the old agreement reads changed', async () => {
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    const store = readPocketStore().store;
    if (store === null) throw new Error('no store');
    const old = {
      id: 'old',
      label: 'Old iPhone',
      signingKey: makePhone('x').signPublic,
      exchangeKey: makePhone('x').exchangePublic,
      address: '100.64.0.9',
      pushToken: '',
      pushEnvironment: ''
    };
    writePocketStore({ ...store, phones: [old as never] });
    const next = host();
    expect(next.status().droppedPhones).toBe(1);
    expect(next.status().phones).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The registrar (SPEC §4.11)
// ---------------------------------------------------------------------------

describe('the registrar', () => {
  function registered(): Map<string, (event: unknown, ...args: unknown[]) => unknown> {
    const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();
    const ipc = {
      handle: (channel: string, fn: (event: unknown, ...args: unknown[]) => unknown) => {
        handlers.set(channel, fn);
      }
    } as unknown as IpcMain;
    registerPocketIpc(ipc, host());
    return handlers;
  }

  it('serves exactly the thirteen pocket channels, openApproval and the push key’s two among them', () => {
    expect([...registered().keys()].sort()).toEqual(
      [
        'pocket:allowPhone',
        'pocket:beginPairing',
        'pocket:cancelPairing',
        'pocket:choosePushKey',
        'pocket:confirmDoor',
        'pocket:forgetDoor',
        'pocket:forgetPushKey',
        'pocket:openApproval',
        'pocket:pairingState',
        'pocket:removePhone',
        'pocket:setDoor',
        'pocket:setPushAlerts',
        'pocket:status'
      ].sort()
    );
  });

  it('opens a pairing window from no input at all, and openApproval opens nothing at rest', async () => {
    const handlers = registered();
    await expect(Promise.resolve().then(() => handlers.get('pocket:beginPairing')?.({}))).rejects.toThrow(
      /not answering/
    );
    expect(await handlers.get('pocket:openApproval')?.({})).toBe(false);
    expect(opened).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Phase 314: the push, which reads the confirmed fields and never the socket
// ---------------------------------------------------------------------------

const sha = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');
const tokenFor = (seed: string): string => sha(`p314-ipc-token-${seed}`);

async function confirmNow(one: Host): Promise<void> {
  const now = pocketConfirmStatus(one.fields());
  await one.confirmDoor({ linesRead: now.lines, hashRead: now.hash });
  await settled(one);
}

describe('where a push may go', () => {
  it('is every phone with a live token once the switch is on and confirmed, and nowhere before', async () => {
    const one = await listeningHost();
    const t = tokenFor('a');
    const { id } = await pairPhone(one, makePhone('Greg iPhone'), { apt: t.toUpperCase(), ape: 'production' });
    expect(one.pushDestinations()).toEqual([]);
    await one.setPushAlerts(true);
    expect(one.status().confirmState).toBe('changed');
    expect(one.pushDestinations()).toEqual([]);
    await confirmNow(one);
    expect(one.pushDestinations()).toEqual([{ phoneId: id, token: t, environment: 'production', tokenDigest: sha(t) }]);
    expect(JSON.stringify(one.status()).includes(t)).toBe(false);
  });

  it('keeps going across a relaunch with Tailscale off, because the stored facts are the confirmed ones', async () => {
    const one = await listeningHost();
    await pairPhone(one, makePhone('Greg iPhone'), { apt: tokenFor('a'), ape: 'development' });
    await one.setPushAlerts(true);
    await confirmNow(one);
    ts.backend = 'Stopped';
    const next = host();
    expect(next.pushDestinations()).toHaveLength(1);
    expect(ts.log.filter((l) => l.startsWith('status')).length).toBeGreaterThan(0);
  });

  it('stops at once when the switch goes off, and a dropped token stays dropped without moving the hash', async () => {
    const one = await listeningHost();
    const ta = tokenFor('a');
    const tb = tokenFor('b');
    await pairPhone(one, makePhone('A'), { apt: ta, ape: 'development' });
    await pairPhone(one, makePhone('B'), { apt: tb, ape: 'development' });
    await one.setPushAlerts(true);
    await confirmNow(one);
    const hash = pocketConfirmStatus(one.fields()).hash;
    one.dropPushToken(sha(tb));
    expect(one.pushDestinations().map((d) => d.token)).toEqual([ta]);
    expect(pocketConfirmStatus(one.fields()).hash).toBe(hash);
    await one.setPushAlerts(false);
    expect(one.pushDestinations()).toEqual([]);
  });
});

describe('the window’s deadline', () => {
  it('is three minutes, unchanged in this phase', () => {
    expect(POCKET_PAIRING_WINDOW_MS).toBe(3 * 60_000);
    // Phase 317 added the write after the reads, Phase 318 the two after it,
    // Phase 316.7 the Sessions tab's read after those, and Phase 337 the
    // Screen's read and write last; the window did not move.
    expect(POCKET_ROUTE_IDS).toEqual([
      'pair',
      'blocked',
      'session',
      'turns',
      'end',
      'choose',
      'say',
      'sessions',
      'screen',
      'keys'
    ]);
  });
});

// ---------------------------------------------------------------------------
// Phase 332: a code waits for the Mac's public name (build/p332/SPEC.md §4.9,
// §4.10, §6.2 item 3). Every question goes to `fakeNameDeps`, and every gap
// is a sleep this file releases by hand.
// ---------------------------------------------------------------------------

/** The sentence a promise was refused with, as main's error payload carries it. */
async function refusalOf(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (err) {
    return gmuxErrorPayloadOf(err)?.message ?? String(err);
  }
  throw new Error('it was not refused');
}

const CHECKING_REFUSAL = `${POCKET_NAME_SENTENCES.checking} No code was shown.`;
const TARGET = { tailnet: 'example.github', publicName: NAME, publicPort: 8443 };

/** Every gap the check slept, released or not, in order. */
function slept(): number[] {
  return names.sleeps.map((s) => s.ms);
}

/** Every status main pushed to a window, in order. */
function pushed(): PocketStatus[] {
  return sent
    .map((line) => JSON.parse(line) as [string, PocketStatus])
    .filter(([channel]) => channel === 'pocket:changed')
    .map(([, s]) => s);
}

/** Main's one predicate, as a reader outside main would check it. */
function pairableIsTheRule(s: PocketStatus): boolean {
  return s.pairable === (s.state === 'listening' && (s.nameCheck === 'confirmed' || s.nameCheck === 'unreadable'));
}

/** The registrar's handlers over this host. */
function handlersOf(one: Host): Map<string, (event: unknown, ...args: unknown[]) => unknown> {
  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();
  registerPocketIpc(
    {
      handle: (channel: string, fn: (event: unknown, ...args: unknown[]) => unknown) => {
        handlers.set(channel, fn);
      }
    } as unknown as IpcMain,
    one
  );
  return handlers;
}

/** A relaunch: the child and the door went with the last run; the store stays. */
function relaunch(): void {
  for (const c of ts.children) c.close(null, 'SIGKILL');
  ts.sessions.clear();
  resetFunnelForTests();
  door.listening = false;
}

/** The last restart's floor wait, released. */
function releaseRestart(): void {
  ts.sleeps.filter((s) => s.ms === 2_000).at(-1)?.release();
}

describe('the name check starts at the counted start and nowhere else (Phase 332)', () => {
  it('the sheet, both read channels, a launch with the door off, the wake and an unagreed switch ask nothing', async () => {
    names.answerWith(nxdomainReply());
    const one = host();
    const handlers = handlersOf(one);
    expect(one.status()).toMatchObject({ nameCheck: 'none', pairable: false });
    await handlers.get('pocket:status')?.({});
    await handlers.get('pocket:pairingState')?.({});
    expect(await one.openAtLaunch()).toBe('off');
    resume?.();
    await settled(one);
    await one.setDoor({ on: true });
    await settled(one);
    expect(one.status().state).toBe('refused');
    expect(names.questions).toEqual([]);
    expect(names.sleeps).toEqual([]);
    expect(names.held).toEqual([]);
    expect(one.status().nameCheck).toBe('none');
    // Allow: the counted start asks at once, one non-recursive A question for the door's name.
    const lines = one.status();
    await one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
    await settled(one);
    expect(one.status().state).toBe('listening');
    expect(names.questions.map((q) => [q.qname, q.qtype, q.rd])).toEqual([[NAME, 'A', false]]);
    expect(slept()).toEqual([20_000]);
    expect(logged.some((l) => l.includes('checking the Mac’s name before pairing'))).toBe(true);
  });

  it('a door refused at its start (a Funnel refusal) asks nothing', async () => {
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    ts.refuse = 'Unable to turn on Funnel while shields-up is enabled';
    const lines = one.status();
    await one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
    await settled(one);
    expect(one.status().state).toBe('refused');
    expect(names.questions).toEqual([]);
    expect(names.sleeps).toEqual([]);
  });
});

describe('a code waits for the Mac’s name (Phase 332)', () => {
  it('is refused with the checking sentence, opens no window and reads nothing, until a round answers', async () => {
    names.answerWith(nxdomainReply());
    const one = await publishedHost();
    expect(one.status()).toMatchObject({ state: 'listening', nameCheck: 'checking', pairable: false });
    ts.log.length = 0;
    expect(await refusalOf(one.beginPairing())).toBe(CHECKING_REFUSAL);
    expect(await refusalOf(Promise.resolve().then(() => handlersOf(one).get('pocket:beginPairing')?.({})))).toBe(
      CHECKING_REFUSAL
    );
    expect(one.pairing.view().state).toBe('idle');
    expect(one.pairing.windowOpen()).toBe(false);
    expect(ts.log).toEqual([]);
    expect(door.updates).not.toContainEqual({ windowOpen: true });
    // The 20 s gap passes and the second round answers the record: confirmed,
    // remembered, and the check stops (one yes, the fix round).
    names.answerWith(recordReply());
    await gapsPass(one);
    expect(names.questions).toHaveLength(2);
    expect(one.status()).toMatchObject({ nameCheck: 'confirmed', pairable: true });
    expect(readPocketStore().store?.nameConfirmed).toEqual(TARGET);
    expect(slept()).toEqual([20_000]);
    await gapsPass(one);
    expect(names.questions).toHaveLength(2);
    const offer = await one.beginPairing();
    expect(JSON.parse(offer.payload)).toMatchObject({ host: NAME, port: 8443 });
    expect(logged.some((l) => l.includes('the Mac’s name answers, so pairing is open'))).toBe(true);
  });

  it('opens with the unreadable word after ONE unreadable round, keeps checking, and a later no takes it away', async () => {
    // THE FIX ROUND: three rounds held Pair back about 55 s on a network that
    // blocks DNS, where the build before this phase showed it at once.
    names.answerWith('silent');
    const one = await publishedHost();
    expect(names.questions).toHaveLength(1);
    expect(slept()).toEqual([20_000]);
    expect(one.status()).toMatchObject({ nameCheck: 'unreadable', pairable: true });
    const offer = await one.beginPairing();
    one.cancelPairing();
    expect(offer.payload.length).toBeGreaterThan(0);
    // Nothing is remembered for a name nobody could read.
    expect(readPocketStore().store?.nameConfirmed).toBeNull();
    // Checking goes on; a no closes it again.
    names.answerWith(nxdomainReply());
    await gapsPass(one);
    expect(one.status()).toMatchObject({ nameCheck: 'checking', pairable: false });
    expect(await refusalOf(one.beginPairing())).toBe(CHECKING_REFUSAL);
    expect(slept()).toEqual([20_000, 30_000]);
    // An unreadable round opens it again, and each opening is said once.
    names.answerWith('silent');
    await gapsPass(one);
    expect(one.status()).toMatchObject({ nameCheck: 'unreadable', pairable: true });
    expect(logged.filter((l) => l.includes('could not be checked, so pairing is open'))).toHaveLength(2);
  });

  it('a no that lasts 18 rounds opens Pair with the unreadable word, keeps it open, and a yes still confirms (the fix round)', async () => {
    // A network that forges an authoritative "no such name" for ts.net read no
    // for ever and Pair never opened; the build before this phase showed it.
    names.answerWith(nxdomainReply());
    const one = await publishedHost();
    for (let i = 0; i < 16; i += 1) await gapsPass(one);
    expect(names.questions).toHaveLength(17);
    expect(one.status()).toMatchObject({ nameCheck: 'checking', pairable: false });
    expect(await refusalOf(one.beginPairing())).toBe(CHECKING_REFUSAL);
    await gapsPass(one);
    expect(names.questions).toHaveLength(18);
    expect(one.status()).toMatchObject({ nameCheck: 'unreadable', pairable: true });
    expect(logged.filter((l) => l.includes('the Mac’s name still does not answer, so pairing is open'))).toHaveLength(1);
    await gapsPass(one);
    expect(one.status()).toMatchObject({ nameCheck: 'unreadable', pairable: true });
    const offer = await one.beginPairing();
    one.cancelPairing();
    expect(offer.payload.length).toBeGreaterThan(0);
    expect(readPocketStore().store?.nameConfirmed).toBeNull();
    names.answerWith(recordReply());
    await gapsPass(one);
    expect(one.status()).toMatchObject({ nameCheck: 'confirmed', pairable: true });
    expect(readPocketStore().store?.nameConfirmed).toEqual(TARGET);
    expect(logged.filter((l) => l.includes('still does not answer'))).toHaveLength(1);
  });

  it('asks at the gaps 20, 30, 45 and 60 s, then every 60 s, and a yes confirms and asks nothing more', async () => {
    names.answerWith(nxdomainReply());
    const one = await publishedHost();
    for (let i = 0; i < 5; i += 1) await gapsPass(one);
    expect(slept()).toEqual([20_000, 30_000, 45_000, 60_000, 60_000, 60_000]);
    expect(one.status()).toMatchObject({ nameCheck: 'checking', pairable: false });
    names.answerWith(recordReply());
    await gapsPass(one);
    expect(one.status()).toMatchObject({ nameCheck: 'confirmed', pairable: true });
    expect(names.questions).toHaveLength(7);
    expect(names.pendingSleeps()).toEqual([]);
    await gapsPass(one);
    expect(names.questions).toHaveLength(7);
    // One log line per change of verdict, never one per round, and none names the name.
    expect(logged.filter((l) => l.includes('the Mac’s name check read no: nxdomain'))).toHaveLength(1);
    expect(logged.filter((l) => l.includes('the Mac’s name check read yes: record'))).toHaveLength(1);
    for (const l of logged) {
      expect(l).not.toContain(NAME);
      expect(l).not.toContain('example.github');
      expect(l).not.toContain('203.0.113.10');
    }
  });

  it('answers main’s one predicate in every status it answers and pushes, and no longer says when the door was published', async () => {
    names.answerWith('silent');
    const one = await publishedHost();
    names.answerWith(nxdomainReply());
    await gapsPass(one);
    names.answerWith(recordReply());
    await gapsPass(one);
    await one.setDoor({ on: false });
    await settled(one);
    const seen = [...pushed(), one.status()];
    expect(new Set(seen.map((s) => s.nameCheck))).toEqual(new Set(['none', 'checking', 'unreadable', 'confirmed']));
    expect(new Set(seen.map((s) => s.pairable))).toEqual(new Set([true, false]));
    for (const s of seen) {
      expect(pairableIsTheRule(s), JSON.stringify([s.state, s.nameCheck, s.pairable])).toBe(true);
      expect(Object.keys(s.funnel)).not.toContain('publishedAt');
    }
  });

  it('the confirm hash is the same with the name remembered and without it', async () => {
    names.answerWith(nxdomainReply());
    const one = await publishedHost();
    const before = one.status();
    expect(readPocketStore().store?.nameConfirmed).toBeNull();
    names.answerWith(recordReply());
    await namePairable(one);
    const after = one.status();
    expect(readPocketStore().store?.nameConfirmed).toEqual(TARGET);
    expect(after.confirmHash).toBe(before.confirmHash);
    expect(after.confirmLines).toEqual(before.confirmLines);
    expect(after.confirmState).toBe('confirmed');
    expect(pocketConfirmStatus(one.fields()).state).toBe('confirmed');
  });
});

describe('the door moves under a round (Phase 332)', () => {
  it('an off with a round held open writes nothing when it lands, and asks nothing more', async () => {
    names.answerWith(nxdomainReply());
    const one = await publishedHost(); // the first round answered no
    names.answerWith('hold');
    await gapsPass(one); // the second round, held
    expect(names.held).toHaveLength(1);
    await one.setDoor({ on: false });
    names.releaseHeld(recordReply());
    await settled(one);
    expect(readPocketStore().store?.nameConfirmed).toBeNull();
    expect(one.status()).toMatchObject({ state: 'off', nameCheck: 'none', pairable: false });
    for (let i = 0; i < 4; i += 1) await gapsPass(one);
    expect(names.questions).toHaveLength(2);
    // On again: checking, never the confirmation the late answer would have
    // written (its first round is held, so nothing it answers can hide that).
    names.answerWith('hold');
    await one.setDoor({ on: true });
    await settled(one);
    expect(one.status()).toMatchObject({ state: 'listening', nameCheck: 'checking', pairable: false });
  });

  // THE INTEGRATOR'S ROUND. The off writes `enabled: false` before its first
  // await, but the check stops only when its close reaches the queue. With
  // another door job holding the queue (here the wake's read of Tailscale), an
  // answer or a gap that lands in between must write nothing and ask nothing,
  // or a late yes re-remembers the name after the person cleared the setting.
  it('an off queued behind another door job: a late yes writes nothing, and nothing is asked before the close', async () => {
    names.answerWith(nxdomainReply());
    const one = await publishedHost(); // the first round answered no
    names.answerWith('hold');
    await gapsPass(one); // the second round, held
    expect(names.held.filter((h) => !h.released)).toHaveLength(1);
    let releaseExec: () => void = () => undefined;
    ts.holdExec = new Promise<void>((resolve) => {
      releaseExec = resolve;
    });
    resume?.();
    // The wake's job reaches its read of Tailscale, which now holds the queue.
    for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setImmediate(resolve));
    expect(one.status()).toMatchObject({ state: 'listening' });
    const off = one.setDoor({ on: false });
    names.releaseHeld(recordReply());
    for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setImmediate(resolve));
    expect(readPocketStore().store?.nameConfirmed).toBeNull();
    expect(slept()).toEqual([20_000]);
    expect(door.listening).toBe(true); // the close has not run yet
    // The door still listens until the close runs, and main says so honestly:
    // the switch is off, so no code may show.
    expect(one.status()).toMatchObject({ state: 'off', pairable: false });
    expect(pairableIsTheRule(one.status())).toBe(true);
    expect(await refusalOf(one.beginPairing())).toBe(CHECKING_REFUSAL);
    expect(one.pairing.windowOpen()).toBe(false);
    ts.holdExec = null;
    releaseExec();
    await off;
    await settled(one);
    expect(one.status()).toMatchObject({ state: 'off', nameCheck: 'none', pairable: false });
    expect(readPocketStore().store?.nameConfirmed).toBeNull();
    names.answerWith('hold');
    await one.setDoor({ on: true });
    await settled(one);
    expect(one.status()).toMatchObject({ state: 'listening', nameCheck: 'checking', pairable: false });
  });

  it('an off queued behind another door job: a door opened by the unreadable rule is not pairable before the close', async () => {
    names.answerWith('silent');
    const one = await publishedHost();
    expect(one.status()).toMatchObject({ state: 'listening', nameCheck: 'unreadable', pairable: true });
    let releaseExec: () => void = () => undefined;
    ts.holdExec = new Promise<void>((resolve) => {
      releaseExec = resolve;
    });
    resume?.();
    // The wake's job reaches its read of Tailscale, which now holds the queue.
    for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setImmediate(resolve));
    expect(one.status()).toMatchObject({ state: 'listening' });
    const off = one.setDoor({ on: false });
    for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setImmediate(resolve));
    const between = one.status();
    expect(door.listening).toBe(true); // the close has not run yet
    expect(between).toMatchObject({ state: 'off', pairable: false });
    expect(pairableIsTheRule(between)).toBe(true);
    expect(await refusalOf(one.beginPairing())).toBe(CHECKING_REFUSAL);
    expect(one.pairing.windowOpen()).toBe(false);
    ts.holdExec = null;
    releaseExec();
    await off;
    await settled(one);
    expect(one.status()).toMatchObject({ state: 'off', nameCheck: 'none', pairable: false });
  });

  it('an off queued behind another door job: a gap that ends before the close asks nothing', async () => {
    names.answerWith(nxdomainReply());
    const one = await publishedHost(); // one no, the 20 s gap armed
    let releaseExec: () => void = () => undefined;
    ts.holdExec = new Promise<void>((resolve) => {
      releaseExec = resolve;
    });
    resume?.(); // the wake asks now (a second no, the 30 s gap armed) and its read holds the queue
    for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setImmediate(resolve));
    expect(names.questions).toHaveLength(2);
    const off = one.setDoor({ on: false });
    names.releaseSleeps();
    for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setImmediate(resolve));
    expect(door.listening).toBe(true); // the close has not run yet
    expect(names.questions).toHaveLength(2);
    ts.holdExec = null;
    releaseExec();
    await off;
    await settled(one);
    for (let i = 0; i < 3; i += 1) await gapsPass(one);
    expect(names.questions).toHaveLength(2);
    expect(one.status()).toMatchObject({ state: 'off', nameCheck: 'none', pairable: false });
  });

  it('an answer from an earlier run lands in a later one and is dropped', async () => {
    names.answerWith(nxdomainReply());
    const one = await publishedHost(); // run 1: one no
    names.answerWith('hold');
    await gapsPass(one); // run 1's second round, held
    await one.setDoor({ on: false });
    await one.setDoor({ on: true });
    await settled(one); // run 2's first round, held too
    expect(one.status()).toMatchObject({ state: 'listening', nameCheck: 'checking' });
    expect(names.held.filter((h) => !h.released)).toHaveLength(2);
    // Run 1's yes would confirm run 1; the door is published and its fields are the same.
    names.held[0]?.release(recordReply());
    await settled(one);
    expect(readPocketStore().store?.nameConfirmed).toBeNull();
    expect(one.status()).toMatchObject({ nameCheck: 'checking', pairable: false });
    // Run 2 goes on by its own rounds: its own yes confirms.
    names.held[1]?.release(recordReply());
    await settled(one);
    expect(one.status()).toMatchObject({ nameCheck: 'confirmed', pairable: true });
  });

  it('on, off, on inside one gap leaves one timer: exactly one round per gap', async () => {
    names.answerWith(nxdomainReply());
    const one = await publishedHost();
    expect(names.questions).toHaveLength(1);
    await one.setDoor({ on: false });
    await one.setDoor({ on: true });
    await settled(one);
    expect(one.status().state).toBe('listening');
    expect(names.questions).toHaveLength(2);
    // Both runs' sleeps end together; only the live run's timer asks.
    expect(names.pendingSleeps()).toEqual([20_000, 20_000]);
    await gapsPass(one);
    expect(names.questions).toHaveLength(3);
    expect(names.pendingSleeps()).toEqual([30_000]);
    await gapsPass(one);
    expect(names.questions).toHaveLength(4);
  });

  it('a Remove mid-round drops the answer: a late yes writes nothing', async () => {
    // A door opened by the unreadable rule, so a phone can pair before the name answers.
    names.answerWith('silent');
    const one = await publishedHost();
    const { id } = await pairPhone(one, makePhone('A'));
    names.answerWith('hold');
    await gapsPass(one);
    expect(one.status()).toMatchObject({ state: 'listening', nameCheck: 'unreadable' });
    expect(names.held.filter((h) => !h.released)).toHaveLength(1);
    const asked = names.questions.length;
    await one.removePhone(id);
    names.releaseHeld(recordReply());
    await settled(one);
    expect(readPocketStore().store?.nameConfirmed).toBeNull();
    expect(one.status()).toMatchObject({ nameCheck: 'none', pairable: false });
    for (let i = 0; i < 3; i += 1) await gapsPass(one);
    expect(names.questions).toHaveLength(asked);
  });

  it('a Remove during the switch-on round drops the answer: a late no forgets nothing', async () => {
    const one = await listeningHost();
    const { id } = await pairPhone(one, makePhone('A'));
    await one.setDoor({ on: false });
    names.answerWith('hold');
    await one.setDoor({ on: true });
    await settled(one);
    expect(one.status()).toMatchObject({ state: 'listening', nameCheck: 'confirmed', pairable: true });
    expect(names.held.filter((h) => !h.released)).toHaveLength(1);
    const asked = names.questions.length;
    await one.removePhone(id);
    names.releaseHeld(nxdomainReply());
    await settled(one);
    expect(readPocketStore().store?.nameConfirmed).toEqual(TARGET);
    expect(one.status().pairable).toBe(false);
    for (let i = 0; i < 3; i += 1) await gapsPass(one);
    expect(names.questions).toHaveLength(asked);
  });

  it('the quit’s first line clears an armed timer: nothing is asked when its gap ends', async () => {
    names.answerWith(nxdomainReply());
    const one = await publishedHost();
    expect(names.pendingSleeps()).toEqual([20_000]);
    beginFunnelShutdown();
    await gapsPass(one);
    expect(names.questions).toHaveLength(1);
  });

  for (const [half, quit] of [
    ['the Funnel half', () => beginFunnelShutdown()],
    ['the door half', () => (door.quitting = true)]
  ] as const) {
    it(`a round held across the quit writes nothing and arms nothing (${half} first)`, async () => {
      names.answerWith(nxdomainReply());
      const one = await publishedHost(); // one no
      names.answerWith('hold');
      await gapsPass(one); // the second round, held
      quit();
      names.releaseHeld(recordReply());
      await settled(one);
      expect(readPocketStore().store?.nameConfirmed).toBeNull();
      expect(slept()).toEqual([20_000]);
      expect(one.status().pairable).toBe(false);
    });
  }

  it('a wall clock moved a day either way moves no gap and asks no extra round', async () => {
    names.answerWith(nxdomainReply());
    const one = await publishedHost();
    const real = Date.now();
    const spy = vi.spyOn(Date, 'now').mockReturnValue(real + 86_400_000);
    try {
      clock += 86_400_000;
      await gapsPass(one);
      spy.mockReturnValue(real - 86_400_000);
      clock -= 2 * 86_400_000;
      await gapsPass(one);
      resume?.();
      await settled(one);
    } finally {
      spy.mockRestore();
    }
    // The wake asked once, as a wake does; the clock asked nothing.
    expect(names.questions).toHaveLength(4);
    expect(slept()).toEqual([20_000, 30_000, 45_000, 60_000]);
  });
});

describe('the wake and the restart (Phase 332)', () => {
  it('a wake brings the next round forward once, and the gap it cut short fires nothing', async () => {
    names.answerWith(nxdomainReply());
    const one = await publishedHost();
    expect(names.pendingSleeps()).toEqual([20_000]);
    resume?.();
    await settled(one);
    expect(names.questions).toHaveLength(2);
    expect(slept()).toEqual([20_000, 30_000]);
    names.releaseSleeps(20_000);
    await settled(one);
    expect(names.questions).toHaveLength(2);
    names.releaseSleeps(30_000);
    await settled(one);
    expect(names.questions).toHaveLength(3);
  });

  it('a wake asks nothing once the name is confirmed, or with a round already out', async () => {
    const confirmed = await listeningHost();
    const asked = names.questions.length;
    resume?.();
    await settled(confirmed);
    expect(names.questions).toHaveLength(asked);
    // The switch-on round in flight: a wake asks nothing beside it.
    await confirmed.setDoor({ on: false });
    names.answerWith('hold');
    await confirmed.setDoor({ on: true });
    await settled(confirmed);
    let out = names.questions.length;
    resume?.();
    await settled(confirmed);
    expect(names.questions).toHaveLength(out);
    // It answers no, checking starts, and a checking round in flight: the
    // wake does not ask a second one beside it either.
    names.releaseHeld(nxdomainReply());
    await settled(confirmed);
    expect(confirmed.status().nameCheck).toBe('checking');
    await gapsPass(confirmed);
    out = names.questions.length;
    expect(names.held.filter((h) => !h.released)).toHaveLength(1);
    resume?.();
    await settled(confirmed);
    expect(names.questions).toHaveLength(out);
  });

  it('a restart pauses the check and resumes it at its counted start; a confirmed name is not asked again', async () => {
    names.answerWith(nxdomainReply());
    const one = await publishedHost();
    ts.children[0]?.close(null, 'SIGKILL');
    await settled(one);
    expect(one.status().funnel.state).toBe('restarting');
    expect(one.status()).toMatchObject({ nameCheck: 'none', pairable: false });
    // The gap passes while Tortie is trying again: nothing is asked.
    await gapsPass(one);
    expect(names.questions).toHaveLength(1);
    releaseRestart();
    await settled(one);
    expect(one.status().state).toBe('listening');
    expect(names.questions).toHaveLength(2);
    expect(one.status().nameCheck).toBe('checking');
    names.answerWith(recordReply());
    await gapsPass(one);
    expect(one.status()).toMatchObject({ nameCheck: 'confirmed', pairable: true });
    const asked = names.questions.length;
    ts.children.at(-1)?.close(null, 'SIGKILL');
    await settled(one);
    releaseRestart();
    await settled(one);
    expect(one.status()).toMatchObject({ state: 'listening', nameCheck: 'confirmed', pairable: true });
    expect(names.questions).toHaveLength(asked);
  });
});

describe('the switch-on round (Phase 332)', () => {
  it('a relaunch with the name kept shows Pair at once and asks once; a yes keeps it and arms nothing', async () => {
    await listeningHost();
    relaunch();
    const asked = names.questions.length;
    const sleeps = names.sleeps.length;
    names.answerWith('hold');
    const next = host();
    expect(await next.openAtLaunch()).toBe('opened');
    expect(next.status()).toMatchObject({ state: 'listening', nameCheck: 'confirmed', pairable: true });
    expect(names.questions).toHaveLength(asked + 1);
    expect(logged.some((l) => l.includes('asking once whether the Mac’s name still answers'))).toBe(true);
    // A code may show while the round is out.
    await next.beginPairing();
    next.cancelPairing();
    names.releaseHeld(recordReply());
    await settled(next);
    expect(next.status()).toMatchObject({ nameCheck: 'confirmed', pairable: true });
    expect(readPocketStore().store?.nameConfirmed).toEqual(TARGET);
    expect(names.sleeps).toHaveLength(sleeps);
    await gapsPass(next);
    expect(names.questions).toHaveLength(asked + 1);
  });

  it('a switch-on round that cannot be read keeps the name and arms nothing', async () => {
    await listeningHost();
    relaunch();
    const sleeps = names.sleeps.length;
    names.answerWith('silent');
    const next = host();
    expect(await next.openAtLaunch()).toBe('opened');
    await settled(next);
    expect(next.status()).toMatchObject({ nameCheck: 'confirmed', pairable: true });
    expect(readPocketStore().store?.nameConfirmed).toEqual(TARGET);
    expect(names.sleeps).toHaveLength(sleeps);
  });

  it('a switch-on round answered no forgets the name, takes Pair away, and checks from 20 s', async () => {
    await listeningHost();
    relaunch();
    names.answerWith('hold');
    const next = host();
    expect(await next.openAtLaunch()).toBe('opened');
    const sleeps = names.sleeps.length;
    names.releaseHeld(nxdomainReply());
    await settled(next);
    expect(readPocketStore().store?.nameConfirmed).toBeNull();
    expect(next.status()).toMatchObject({ nameCheck: 'checking', pairable: false });
    expect(names.sleeps.slice(sleeps).map((s) => s.ms)).toEqual([20_000]);
    expect(await refusalOf(next.beginPairing())).toBe(CHECKING_REFUSAL);
    names.answerWith(recordReply());
    await gapsPass(next);
    expect(next.status()).toMatchObject({ nameCheck: 'confirmed', pairable: true });
  });

  it('off then on keeps the name: Pair at once and one round; a no forgets it and checks from 20 s (the fix round)', async () => {
    // Forgetting it at the off held Pair back 20 s on every off and on, where
    // the build before this phase showed it at once.
    const one = await listeningHost();
    await one.setDoor({ on: false });
    expect(readPocketStore().store).toMatchObject({ enabled: false, bindAtLaunch: false, nameConfirmed: TARGET });
    expect(one.status()).toMatchObject({ state: 'off', pairable: false });
    const asked = names.questions.length;
    const sleeps = names.sleeps.length;
    names.answerWith('hold');
    await one.setDoor({ on: true });
    await settled(one);
    expect(one.status()).toMatchObject({ state: 'listening', nameCheck: 'confirmed', pairable: true });
    expect(names.questions).toHaveLength(asked + 1);
    expect(logged.some((l) => l.includes('asking once whether the Mac’s name still answers'))).toBe(true);
    names.releaseHeld(recordReply());
    await settled(one);
    expect(names.sleeps).toHaveLength(sleeps);
    await gapsPass(one);
    expect(names.questions).toHaveLength(asked + 1);
    // Off and on again, and this time the name has gone.
    await one.setDoor({ on: false });
    await one.setDoor({ on: true });
    await settled(one);
    expect(one.status().pairable).toBe(true);
    names.releaseHeld(nxdomainReply());
    await settled(one);
    expect(readPocketStore().store?.nameConfirmed).toBeNull();
    expect(one.status()).toMatchObject({ state: 'listening', nameCheck: 'checking', pairable: false });
    expect(names.sleeps.slice(sleeps).map((s) => s.ms)).toEqual([20_000]);
    expect(await refusalOf(one.beginPairing())).toBe(CHECKING_REFUSAL);
  });

  it('a switch-on round that answers no while beginPairing reads Tailscale opens no window (the fix round)', async () => {
    await listeningHost();
    relaunch();
    names.answerWith('hold');
    const next = host();
    expect(await next.openAtLaunch()).toBe('opened');
    expect(next.status()).toMatchObject({ nameCheck: 'confirmed', pairable: true });
    const opened = door.updates.filter((u) => u.windowOpen === true).length;
    let releaseExec: () => void = () => undefined;
    ts.holdExec = new Promise<void>((resolve) => {
      releaseExec = resolve;
    });
    const pressed = refusalOf(next.beginPairing());
    // The press passed the first ask and is reading Tailscale's serve config.
    for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setImmediate(resolve));
    names.releaseHeld(nxdomainReply());
    for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setImmediate(resolve));
    expect(next.status()).toMatchObject({ nameCheck: 'checking', pairable: false });
    ts.holdExec = null;
    releaseExec();
    expect(await pressed).toBe(CHECKING_REFUSAL);
    expect(next.pairing.windowOpen()).toBe(false);
    expect(next.pairing.view().state).toBe('idle');
    expect(door.updates.filter((u) => u.windowOpen === true)).toHaveLength(opened);
  });

  it('Remove then Allow, and a withdrawal then Allow, keep the name and ask once', async () => {
    const one = await listeningHost();
    const { id } = await pairPhone(one, makePhone('A'));
    const removed = await one.removePhone(id);
    expect(readPocketStore().store?.nameConfirmed).toEqual(TARGET);
    expect(removed).toMatchObject({ state: 'refused', pairable: false });
    for (const again of ['remove', 'forget'] as const) {
      if (again === 'forget') {
        await one.forgetDoor();
        expect(readPocketStore().store?.nameConfirmed).toEqual(TARGET);
      }
      const lines = one.status();
      const asked = names.questions.length;
      names.answerWith('hold');
      await one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
      await settled(one);
      expect(one.status(), again).toMatchObject({ state: 'listening', nameCheck: 'confirmed', pairable: true });
      expect(names.questions, again).toHaveLength(asked + 1);
      names.releaseHeld(recordReply());
      await settled(one);
      expect(names.questions, again).toHaveLength(asked + 1);
    }
  });
});

describe('what clears the remembered name, and what does not (Phase 332)', () => {
  it('the off write keeps it (the fix round), and an off over switches that already read off writes nothing', async () => {
    const one = await listeningHost();
    expect(readPocketStore().store?.nameConfirmed).toEqual(TARGET);
    await one.setDoor({ on: false });
    expect(readPocketStore().store).toMatchObject({ enabled: false, bindAtLaunch: false, nameConfirmed: TARGET });
    await host().setDoor({ on: false });
    expect(readPocketStore().store).toMatchObject({ enabled: false, bindAtLaunch: false, nameConfirmed: TARGET });
  });

  it('a read that asks Tailscale’s approval clears it', async () => {
    const one = await listeningHost();
    names.answerWith('hold'); // the restart's own round, held, so nothing it answers hides the clearing
    ts.caps = false; // the restart's read finds Funnel's capabilities gone; the child needs no page
    ts.children[0]?.close(null, 'SIGKILL');
    await settled(one);
    releaseRestart();
    await settled(one);
    expect(one.status().funnel.asksApproval).toBe(true);
    expect(one.status().state).toBe('listening');
    expect(readPocketStore().store?.nameConfirmed).toBeNull();
    expect(one.status()).toMatchObject({ nameCheck: 'checking', pairable: false });
  });

  it('a start that waited on Tailscale’s approval clears it', async () => {
    const one = await listeningHost();
    names.answerWith('hold'); // the start's own round, held
    ts.approval = 'wait'; // the capabilities stay: only the wait can clear it
    ts.children[0]?.close(null, 'SIGKILL');
    await settled(one);
    releaseRestart();
    // The start now waits on the page, inside the queue: wait for the face, never for the queue.
    await vi.waitFor(() => expect(one.status().funnel.state).toBe('approval'));
    expect(one.status().funnel.asksApproval).toBe(false);
    expect(readPocketStore().store?.nameConfirmed).toBeNull();
    ts.approve?.();
    await settled(one);
    expect(one.status()).toMatchObject({ state: 'listening', nameCheck: 'checking', pairable: false });
  });

  it('a withdrawal, a Remove and the alerts do not clear it', async () => {
    const one = await listeningHost();
    const { id } = await pairPhone(one, makePhone('A'));
    await one.setPushAlerts(true);
    expect(readPocketStore().store?.nameConfirmed).toEqual(TARGET);
    await one.removePhone(id);
    expect(readPocketStore().store?.nameConfirmed).toEqual(TARGET);
    await one.forgetDoor();
    expect(readPocketStore().store?.nameConfirmed).toEqual(TARGET);
  });

  for (const [field, moved] of [
    ['tailnet', { tailnet: 'someone-else.github' }],
    ['public name', { publicName: 'other.tail00000.ts.net' }],
    ['public port', { publicPort: 10000 }]
  ] as const) {
    it(`a remembered name for another ${field} does not count: the door reads checking`, async () => {
      const one = host();
      await one.setDoor({ on: true });
      await settled(one);
      const store = readPocketStore().store;
      if (store === null) throw new Error('no store');
      expect(writePocketStore({ ...store, nameConfirmed: { ...TARGET, ...moved } })).toBe(true);
      names.answerWith('hold'); // the start's own round, held
      const next = host();
      await pairAndAllow(next);
      expect(next.status()).toMatchObject({ state: 'listening', nameCheck: 'checking', pairable: false });
      // Nobody cleared it: it simply stopped counting.
      expect(readPocketStore().store?.nameConfirmed).toEqual({ ...TARGET, ...moved });
    });
  }

  it('a moved tailnet found by a restart’s read: the old name no longer counts after the next Allow', async () => {
    const one = await listeningHost();
    ts.tailnet = 'switched-profile.github';
    ts.children[0]?.close(null, 'SIGKILL');
    await settled(one);
    releaseRestart();
    await settled(one);
    const changed = one.status();
    expect(changed).toMatchObject({ state: 'refused', confirmState: 'changed', pairable: false });
    names.answerWith('hold'); // the Allow's own round, held
    await one.confirmDoor({ linesRead: changed.confirmLines, hashRead: changed.confirmHash });
    await settled(one);
    expect(one.status()).toMatchObject({ state: 'listening', nameCheck: 'checking', pairable: false });
    names.releaseHeld(recordReply());
    await settled(one);
    expect(one.status().pairable).toBe(true);
    expect(readPocketStore().store?.nameConfirmed).toEqual({ ...TARGET, tailnet: 'switched-profile.github' });
  });

  it('a store write that throws (the disk refused it) still holds the confirmation for this run', async () => {
    names.answerWith(nxdomainReply());
    const one = await publishedHost();
    names.answerWith(recordReply());
    const real = userData;
    // The store's directory is now a FILE: the next write throws ENOTDIR from mkdir.
    const blocked = join(real, 'blocked');
    writeFileSync(blocked, 'not a directory', 'utf8');
    userData = blocked;
    try {
      await gapsPass(one);
      expect(one.status()).toMatchObject({ nameCheck: 'confirmed', pairable: true });
      expect(logged.some((l) => l.includes('could not apply an answer'))).toBe(false);
    } finally {
      userData = real;
    }
    expect(readPocketStore().store?.nameConfirmed).toBeNull();
  });

  it('a seal that refuses the write still holds the confirmation for this run, and the next launch asks again', async () => {
    names.answerWith(nxdomainReply());
    const one = await publishedHost();
    names.answerWith(recordReply());
    sealWrites = false;
    await gapsPass(one);
    sealWrites = true;
    expect(one.status()).toMatchObject({ nameCheck: 'confirmed', pairable: true });
    expect(readPocketStore().store?.nameConfirmed).toBeNull();
    await one.beginPairing();
    one.cancelPairing();
    relaunch();
    names.answerWith('hold'); // the launch's own round, held
    const next = host();
    expect(await next.openAtLaunch()).toBe('opened');
    expect(next.status()).toMatchObject({ nameCheck: 'checking', pairable: false });
  });
});

// ---------------------------------------------------------------------------
// Phase 316.5: the alerts' port (build/p3165/SPEC.md §5.2.2, research 136)
// ---------------------------------------------------------------------------

/** A port that answers what a test sets and counts every call the host makes. */
function fakePort(): {
  port: PocketAlertsPort;
  calls: { keyId: number; sentence: number; choose: unknown[]; forget: number; changed: number };
  set(over: { keyId?: string | null; sentence?: string | null }): void;
} {
  let id: string | null = null;
  let said: string | null = null;
  const calls = { keyId: 0, sentence: 0, choose: [] as unknown[], forget: 0, changed: 0 };
  return {
    calls,
    set(over) {
      if (over.keyId !== undefined) id = over.keyId;
      if (over.sentence !== undefined) said = over.sentence;
    },
    port: {
      keyId: () => {
        calls.keyId += 1;
        return id;
      },
      sentence: () => {
        calls.sentence += 1;
        return said;
      },
      chooseKey: async (sender) => {
        calls.choose.push(sender);
        id = 'P3165SCRAT';
        return { kept: true, refusal: null };
      },
      forgetKey: async () => {
        calls.forget += 1;
        id = null;
      },
      changed: () => {
        calls.changed += 1;
      }
    }
  };
}

function hostWith(port: PocketAlertsPort): Host {
  return new PocketHost({
    facts: FACTS,
    now: () => clock,
    tailscale: ts.deps,
    names,
    onResume: () => () => undefined,
    alerts: port
  });
}

/** How many `pocket:changed` broadcasts went out. */
const broadcasts = (): number => sent.filter((line) => line.startsWith('["pocket:changed"')).length;

describe('the alerts’ port (Phase 316.5)', () => {
  it('status() carries the port’s key id and sentence, and nulls with no port', () => {
    const fake = fakePort();
    fake.set({ keyId: '6782V6SJJ7', sentence: 'a sentence main composed' });
    const status = hostWith(fake.port).status();
    expect(status.pushKeyId).toBe('6782V6SJJ7');
    expect(status.pushSentence).toBe('a sentence main composed');
    const bare = host().status();
    expect(bare.pushKeyId).toBeNull();
    expect(bare.pushSentence).toBeNull();
  });

  it('every change the host broadcasts asks the port again, and announce() only broadcasts', async () => {
    const fake = fakePort();
    const one = hostWith(fake.port);
    const before = broadcasts();
    one.announce();
    expect(broadcasts()).toBe(before + 1);
    expect(fake.calls.changed).toBe(0);
    await one.setPushAlerts(true);
    expect(fake.calls.changed).toBeGreaterThan(0);
    expect(broadcasts()).toBeGreaterThan(before + 1);
  });

  it('a Remove, alerts off and a forgotten agreement each ask the port again, with nowhere left to send', async () => {
    const fake = fakePort();
    const one = hostWith(fake.port);
    await pairAndAllow(one);
    await namePairable(one);
    const t = tokenFor('p3165-remove');
    const { id } = await pairPhone(one, makePhone('Greg iPhone'), { apt: t, ape: 'production' });
    await one.setPushAlerts(true);
    await confirmNow(one);
    expect(one.pushDestinations()).toHaveLength(1);

    // Remove.
    let asked = fake.calls.changed;
    await one.removePhone(id);
    expect(fake.calls.changed).toBeGreaterThan(asked);
    expect(one.pushDestinations()).toEqual([]);

    // Alerts off, after pairing again and agreeing.
    await confirmNow(one);
    await namePairable(one);
    await pairPhone(one, makePhone('Greg iPhone'), { apt: t, ape: 'production' });
    expect(one.pushDestinations()).toHaveLength(1);
    asked = fake.calls.changed;
    await one.setPushAlerts(false);
    expect(fake.calls.changed).toBeGreaterThan(asked);
    expect(one.pushDestinations()).toEqual([]);

    // A forgotten agreement.
    await one.setPushAlerts(true);
    await confirmNow(one);
    expect(one.pushDestinations()).toHaveLength(1);
    asked = fake.calls.changed;
    await one.forgetDoor();
    await settled(one);
    expect(fake.calls.changed).toBeGreaterThan(asked);
    expect(one.pushDestinations()).toEqual([]);
  });

  it('the two channels reach the port and nothing of the key comes back', async () => {
    const fake = fakePort();
    const one = hostWith(fake.port);
    const handlers = handlersOf(one);
    const sender = { id: 7 };
    expect(await handlers.get('pocket:choosePushKey')?.({ sender })).toEqual({ kept: true, refusal: null });
    expect(fake.calls.choose).toEqual([sender]);
    expect(one.status().pushKeyId).toBe('P3165SCRAT');
    const after = (await handlers.get('pocket:forgetPushKey')?.({})) as PocketStatus;
    expect(fake.calls.forget).toBe(1);
    expect(after.pushKeyId).toBeNull();
    // With no port there is nothing to choose, and forgetting forgets nothing.
    const bare = handlersOf(host());
    expect(await bare.get('pocket:choosePushKey')?.({ sender })).toEqual({ kept: false, refusal: null });
    expect(((await bare.get('pocket:forgetPushKey')?.({})) as PocketStatus).pushKeyId).toBeNull();
  });

  it('can send only with the switch on, the door agreed to and a key kept (research 136)', async () => {
    const fake = fakePort();
    const one = hostWith(fake.port);
    expect(one.alertsCanSend()).toBe(false);
    fake.set({ keyId: '6782V6SJJ7' });
    expect(one.alertsCanSend()).toBe(false);
    await pairAndAllow(one);
    expect(one.alertsCanSend()).toBe(false);
    await one.setPushAlerts(true);
    expect(one.status().confirmState).toBe('changed');
    expect(one.alertsCanSend()).toBe(false);
    await confirmNow(one);
    expect(one.alertsCanSend()).toBe(true);
    fake.set({ keyId: null });
    expect(one.alertsCanSend()).toBe(false);
    fake.set({ keyId: '6782V6SJJ7' });
    await one.setPushAlerts(false);
    expect(one.alertsCanSend()).toBe(false);
    // A host handed no port can never send.
    const bare = host();
    await pairAndAllow(bare);
    await bare.setPushAlerts(true);
    await confirmNow(bare);
    expect(bare.alertsCanSend()).toBe(false);
  });
});

describe('/pair tells the phone whether this Mac can send (research 136)', () => {
  /** Present one phone through the host's own handler, as the door process forwards it. */
  async function presentThroughDoor(one: Host): Promise<string> {
    const offer = await one.beginPairing();
    const secret = (JSON.parse(offer.payload) as { ps: string }).ps;
    const answer = await one.handler(
      { route: 'pair', presentation: presentationOf(secret, makePhone('Greg iPhone')) },
      { stopping: () => false }
    );
    one.cancelPairing();
    expect(answer.status).toBe(200);
    return String(answer.body);
  }

  it('says alerts: true on pending only while the switch is on, agreed to, and a key is kept', async () => {
    const fake = fakePort();
    const one = hostWith(fake.port);
    await pairAndAllow(one);
    await namePairable(one);
    // No key and the switch off: the bytes a Mac answered before this phase.
    expect(await presentThroughDoor(one)).toBe('{"state":"pending"}');
    await one.setPushAlerts(true);
    await confirmNow(one);
    await namePairable(one);
    expect(await presentThroughDoor(one)).toBe('{"state":"pending"}');
    fake.set({ keyId: '6782V6SJJ7' });
    expect(await presentThroughDoor(one)).toBe('{"state":"pending","alerts":true}');
    await one.setPushAlerts(false);
    await confirmNow(one);
    await namePairable(one);
    expect(await presentThroughDoor(one)).toBe('{"state":"pending"}');
  });

  it('a host handed no port never says it', async () => {
    const one = host();
    await pairAndAllow(one);
    await one.setPushAlerts(true);
    await confirmNow(one);
    await namePairable(one);
    expect(await presentThroughDoor(one)).toBe('{"state":"pending"}');
  });
});

// ---------------------------------------------------------------------------
// Phase 332.1: the name check, drawn (build/p3321/SPEC.md §5.3, §7.1 item 4)
// ---------------------------------------------------------------------------

/** Four kept servers, in the order GMUX_POCKET_NAME_SERVERS names the probe's stand-ins: A, B, C, D. */
const FOUR_SERVERS = [5301, 5302, 5303, 5304].map((port) => ({ address: '127.0.0.1', port }));
type Letter = 'R' | 'N' | 'S';
/** R the record, N an authoritative NXDOMAIN, S silence (the deadline). */
const LETTER_ANSWER: Readonly<Record<Letter, FakeAnswer>> = { R: recordReply(), N: nxdomainReply(), S: 'silent' };
const LETTER_DRAWN = { R: 'record', N: 'negative', S: 'unreadable' } as const;

/** A, B, C and D answer as the four letters say, from the next question on. */
function roundOf(letters: string): void {
  const kinds = [...letters] as Letter[];
  names.answerWith((_name, _type, q) => LETTER_ANSWER[kinds[q.server.port - 5301] ?? 'S']);
}

/** What the sheet is told those letters were, in server order. */
function drawnOf(letters: string): string[] {
  return [...letters].map((l) => LETTER_DRAWN[l as Letter]);
}

/** Every held question still out answers as the letters say, the LAST server first. */
function releaseRound(letters: string): void {
  const out = names.held.filter((h) => !h.released);
  expect(out).toHaveLength(4);
  for (const h of [...out].reverse()) h.release(LETTER_ANSWER[[...letters][h.question.server.port - 5301] as Letter]);
}

/** The name check asks the four servers, on the fake's own clock. */
function fourNames(): void {
  names = fakeNameDeps({ source: { kind: 'fixed', servers: FOUR_SERVERS } });
}

/** The pending gap passes on the clock, then ends, and whatever it fires runs. */
async function gapEnds(one: Host): Promise<void> {
  names.advance(names.pendingSleeps().at(-1) ?? 0);
  names.releaseSleeps();
  await settled(one);
}

/** The progress of every `pocket:changed` push since `from` (an index into `sent`). */
function progressSince(from: number): (PocketNameProgress | null)[] {
  return sent
    .slice(from)
    .map((line) => JSON.parse(line) as [string, PocketStatus])
    .filter(([channel]) => channel === 'pocket:changed')
    .map(([, s]) => s.nameProgress);
}

describe('the name check, drawn (Phase 332.1)', () => {
  it('is null with the door off, before a run, after an off, and for a switch-on round that keeps the name', async () => {
    fourNames();
    roundOf('NNNN');
    const one = host();
    expect(one.status().nameProgress).toBeNull();
    await one.setDoor({ on: true });
    await settled(one);
    expect(one.status()).toMatchObject({ state: 'refused', nameProgress: null });
    const lines = one.status();
    await one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
    await settled(one);
    expect(one.status().nameProgress).not.toBeNull();
    roundOf('RRRR');
    await gapEnds(one);
    expect(one.status().nameCheck).toBe('confirmed');
    await one.setDoor({ on: false });
    await settled(one);
    expect(one.status()).toMatchObject({ state: 'off', nameProgress: null });
    // On again over the remembered name: Pair at once, one round out, no dots.
    const from = sent.length;
    names.answerWith('hold');
    await one.setDoor({ on: true });
    await settled(one);
    expect(one.status()).toMatchObject({ state: 'listening', nameCheck: 'confirmed', pairable: true, nameProgress: null });
    expect(names.held.filter((h) => !h.released)).toHaveLength(4);
    expect(progressSince(from).every((p) => p === null)).toBe(true);
    // It answers yes: the confirmation stands, and nothing new is pushed.
    const before = sent.length;
    names.releaseHeld(recordReply());
    await settled(one);
    expect(sent.length).toBe(before);
    expect(one.status().nameProgress).toBeNull();
  });

  it('is null in the window between an off and its close (the integrator’s held queue)', async () => {
    fourNames();
    roundOf('NNNN');
    const one = await publishedHost();
    expect(one.status().nameProgress).not.toBeNull();
    let releaseExec: () => void = () => undefined;
    ts.holdExec = new Promise<void>((resolve) => {
      releaseExec = resolve;
    });
    resume?.();
    for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setImmediate(resolve));
    const off = one.setDoor({ on: false });
    for (let i = 0; i < 8; i += 1) await new Promise((resolve) => setImmediate(resolve));
    expect(door.listening).toBe(true); // the close has not run yet
    expect(one.status()).toMatchObject({ state: 'off', pairable: false, nameProgress: null });
    ts.holdExec = null;
    releaseExec();
    await off;
    await settled(one);
    expect(one.status()).toMatchObject({ state: 'off', nameProgress: null });
  });

  it('a switch-on round that answers no makes it visible: that round’s answers, and the next round in 20 s', async () => {
    fourNames();
    const one = await listeningHost();
    expect(one.status().nameProgress).toMatchObject({ answers: drawnOf('RRRR'), asking: false, nextInMs: null });
    await one.setDoor({ on: false });
    names.answerWith('hold');
    await one.setDoor({ on: true });
    await settled(one);
    expect(one.status().nameProgress).toBeNull();
    names.advance(3_000);
    releaseRound('RNRR');
    await settled(one);
    const shown = { answers: drawnOf('RNRR'), asking: false, elapsedMs: 3_000, nextInMs: 20_000 };
    expect(one.status()).toMatchObject({ nameCheck: 'checking', pairable: false, nameProgress: shown });
    expect(pushed().at(-1)?.nameProgress).toEqual(shown);
  });

  it('a round’s start pushes it out with the last answers; its end pushes the new ones in server order and the gap, which counts down', async () => {
    fourNames();
    roundOf('RNRN');
    names.advance(7_000); // the run starts where the clock is, not at 0
    const one = await publishedHost();
    expect(one.status().nameProgress).toEqual({ answers: drawnOf('RNRN'), asking: false, elapsedMs: 0, nextInMs: 20_000 });
    names.advance(5_000);
    expect(one.status().nameProgress).toEqual({ answers: drawnOf('RNRN'), asking: false, elapsedMs: 5_000, nextInMs: 15_000 });
    const from = sent.length;
    names.answerWith('hold');
    names.advance(15_000);
    names.releaseSleeps();
    await settled(one);
    const out = { answers: drawnOf('RNRN'), asking: true, elapsedMs: 20_000, nextInMs: null };
    expect(progressSince(from)).toEqual([out]);
    expect(one.status().nameProgress).toEqual(out);
    // Round two waits out D's silence, and the replies arrive last server first.
    names.advance(2_000);
    releaseRound('NSRN');
    await settled(one);
    expect(progressSince(from)).toEqual([out, { answers: drawnOf('NSRN'), asking: false, elapsedMs: 22_000, nextInMs: 30_000 }]);
    // A gap the clock has overrun reads nothing left, never a negative.
    names.advance(31_000);
    expect(one.status().nameProgress).toMatchObject({ elapsedMs: 53_000, nextInMs: 0 });
  });

  it('pushes exactly twice a round and never in a gap, and the alerts’ port is not asked again', async () => {
    fourNames();
    roundOf('NNNN');
    const fake = fakePort();
    const one = hostWith(fake.port);
    await pairAndAllow(one);
    expect(one.status().state).toBe('listening');
    await gapEnds(one); // round two: the steady state from here
    const asked = fake.calls.changed;
    for (const letters of ['RNNN', 'NRSN', 'SNRN']) {
      roundOf(letters);
      const from = sent.length;
      names.advance(10_000);
      await settled(one);
      expect(sent.length, letters).toBe(from);
      const gap = names.pendingSleeps().at(-1) ?? 0;
      names.advance(gap - 10_000);
      names.releaseSleeps();
      await settled(one);
      expect(sent.length, letters).toBe(from + 2);
      const [start, end] = progressSince(from);
      expect(start?.asking, letters).toBe(true);
      expect(end, letters).toMatchObject({ asking: false, answers: drawnOf(letters) });
    }
    expect(fake.calls.changed).toBe(asked);
  });

  it('after a confirmation it stays, frozen, until the next counted start, whose switch-on round shows nothing', async () => {
    fourNames();
    roundOf('NNNN');
    const one = await publishedHost();
    roundOf('RRRR');
    await gapEnds(one);
    expect(one.status()).toMatchObject({ nameCheck: 'confirmed', pairable: true });
    const frozen = { answers: drawnOf('RRRR'), asking: false, elapsedMs: 20_000, nextInMs: null };
    expect(one.status().nameProgress).toEqual(frozen);
    expect(pushed().at(-1)?.nameProgress).toEqual(frozen);
    names.advance(60_000);
    expect(one.status().nameProgress).toEqual(frozen);
    expect(names.pendingSleeps()).toEqual([]);
    await one.setDoor({ on: false });
    await settled(one);
    expect(one.status().nameProgress).toBeNull();
    names.answerWith('hold');
    await one.setDoor({ on: true });
    await settled(one);
    expect(one.status()).toMatchObject({ state: 'listening', nameCheck: 'confirmed', nameProgress: null });
  });

  it('a restart after an unexpected exit ends the frozen block, and a run that restarts begins its minutes again', async () => {
    fourNames();
    roundOf('NNNN');
    const one = await publishedHost();
    roundOf('RRRR');
    await gapEnds(one);
    expect(one.status().nameProgress).toMatchObject({ nextInMs: null, elapsedMs: 20_000 });
    // Over a confirmed name a restart asks nothing, so there is nothing to draw.
    ts.children.at(-1)?.close(null, 'SIGKILL');
    await settled(one);
    expect(one.status().nameProgress).toBeNull();
    releaseRestart();
    await settled(one);
    expect(one.status()).toMatchObject({ state: 'listening', nameCheck: 'confirmed', nameProgress: null });
    // A name that has gone: a new run, its minutes from nothing.
    await one.setDoor({ on: false });
    names.answerWith('hold');
    await one.setDoor({ on: true });
    await settled(one);
    releaseRound('NNNN');
    await settled(one);
    names.advance(90_000);
    expect(one.status().nameProgress).toMatchObject({ elapsedMs: 90_000 });
    ts.children.at(-1)?.close(null, 'SIGKILL');
    await settled(one);
    expect(one.status().nameProgress).toBeNull();
    names.advance(2_000);
    roundOf('NNNN');
    releaseRestart();
    await settled(one);
    expect(one.status()).toMatchObject({ state: 'listening', nameCheck: 'checking' });
    expect(one.status().nameProgress).toEqual({ answers: drawnOf('NNNN'), asking: false, elapsedMs: 0, nextInMs: 20_000 });
  });

  it('18 rounds of no open Pair with the unreadable word, and the progress goes on moving', async () => {
    fourNames();
    roundOf('NNNN');
    const one = await publishedHost();
    for (let i = 0; i < 17; i += 1) await gapEnds(one);
    expect(names.questions).toHaveLength(18 * 4);
    expect(one.status()).toMatchObject({ nameCheck: 'unreadable', pairable: true });
    // 20 + 30 + 45 + 14 × 60 s.
    expect(one.status().nameProgress).toEqual({ answers: drawnOf('NNNN'), asking: false, elapsedMs: 935_000, nextInMs: 60_000 });
    names.answerWith('hold');
    const from = sent.length;
    await gapEnds(one);
    const out = { answers: drawnOf('NNNN'), asking: true, elapsedMs: 995_000, nextInMs: null };
    expect(progressSince(from)).toEqual([out]);
    expect(one.status().nameProgress).toEqual(out);
  });

  it('a flapping name logs one line per change of verdict, never one per round, and no line names an answer, a server or the name', async () => {
    fourNames();
    roundOf('NRNR');
    const one = await publishedHost();
    for (const letters of ['RNRN', 'SSSS', 'NNRR', 'RRRR']) {
      roundOf(letters);
      await gapEnds(one);
    }
    expect(one.status().nameCheck).toBe('confirmed');
    expect(names.questions).toHaveLength(20);
    const reads = logged.map((l) => (JSON.parse(l) as [string, string])[1]).filter((m) => m.includes('the Mac’s name check read'));
    expect(reads).toEqual([
      'the Mac’s name check read no: nxdomain',
      'the Mac’s name check read unreadable: timeout',
      'the Mac’s name check read no: nxdomain',
      'the Mac’s name check read yes: record'
    ]);
    for (const l of logged) {
      expect(l).not.toMatch(/negative|530[1-4]|\[\\?"record|record,|\\?"answers\\?"/);
      expect(l).not.toContain(NAME);
      expect(l).not.toContain('203.0.113.10');
    }
  });

  it('a wall clock moved a day either way moves no minute and no gap on the sheet', async () => {
    fourNames();
    roundOf('NNNN');
    const one = await publishedHost();
    names.advance(5_000);
    const before = one.status().nameProgress;
    expect(before).toEqual({ answers: drawnOf('NNNN'), asking: false, elapsedMs: 5_000, nextInMs: 15_000 });
    const real = Date.now();
    const spy = vi.spyOn(Date, 'now').mockReturnValue(real + 86_400_000);
    try {
      clock += 86_400_000;
      expect(one.status().nameProgress).toEqual(before);
      spy.mockReturnValue(real - 86_400_000);
      clock -= 2 * 86_400_000;
      expect(one.status().nameProgress).toEqual(before);
    } finally {
      spy.mockRestore();
    }
  });

  it('carries four keys, whole milliseconds, its own copy of the answers, and no string but the three answer kinds', async () => {
    fourNames();
    roundOf('RNSR');
    const one = await publishedHost();
    names.advance(1_234.6);
    const text = JSON.stringify(one.status().nameProgress);
    const parsed = JSON.parse(text) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(['answers', 'asking', 'elapsedMs', 'nextInMs']);
    expect(parsed).toEqual({ answers: drawnOf('RNSR'), asking: false, elapsedMs: 1_235, nextInMs: 18_765 });
    const strings: string[] = [];
    const walk = (v: unknown): void => {
      if (typeof v === 'string') strings.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v !== null && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(parsed);
    expect(strings.sort()).toEqual(['negative', 'record', 'record', 'unreadable']);
    for (const word of [NAME, '127.0.0.1', '5301', 'nxdomain', 'timeout', 'example.github', '203.0.113.10']) {
      expect(text).not.toContain(word);
    }
    // A reader that writes into what it was handed changes nothing main holds.
    (one.status().nameProgress?.answers as string[] | undefined)?.push('record');
    expect(one.status().nameProgress?.answers).toEqual(drawnOf('RNSR'));
  });

  it('is null once the quit has stopped the Funnel child, though the switch is still on', async () => {
    fourNames();
    roundOf('NNNN');
    const one = await publishedHost();
    expect(one.status().nameProgress).not.toBeNull();
    await joinFunnel();
    await settled(one);
    expect(ts.children.every((c) => c.closed)).toBe(true);
    expect(readPocketStore().store?.enabled).toBe(true);
    expect(one.status()).toMatchObject({ pairable: false, nameProgress: null });
  });

  for (const [half, quit] of [
    ['the Funnel half', () => beginFunnelShutdown()],
    ['the door half', () => (door.quitting = true)]
  ] as const) {
    it(`a round held across the quit draws nothing of its answer (${half} first)`, async () => {
      fourNames();
      roundOf('NNNN');
      const one = await publishedHost();
      names.answerWith('hold');
      await gapEnds(one);
      expect(one.status().nameProgress).toMatchObject({ answers: drawnOf('NNNN'), asking: true });
      quit();
      releaseRound('RRRR');
      await settled(one);
      expect(readPocketStore().store?.nameConfirmed).toBeNull();
      // The door is still published until the quit's join, so the round
      // before it is still drawn, and never the answer that landed after.
      expect(one.status().nameProgress).toMatchObject({ answers: drawnOf('NNNN'), asking: false });
    });
  }

  it('a switch-on round’s start adds no push of its own: one fewer than a checking run’s first round, over the same counted start', async () => {
    fourNames();
    // Every push between the round's first question and the next microtask:
    // the round's own start push, if any, and the counted start's own.
    let window: number | null = null;
    const watchFirstQuestion = (): void => {
      window = null;
      let first = true;
      names.answerWith(() => {
        if (first) {
          first = false;
          const at = sent.length;
          queueMicrotask(() => {
            window = sent.length - at;
          });
        }
        return 'hold';
      });
    };
    const one = host();
    await one.setDoor({ on: true });
    await settled(one);
    watchFirstQuestion();
    const lines = one.status();
    await one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
    await settled(one);
    const checking = window;
    expect(one.status()).toMatchObject({ nameCheck: 'checking', nameProgress: { asking: true } });
    names.releaseHeld(recordReply());
    await settled(one);
    expect(one.status().nameCheck).toBe('confirmed');
    await one.setDoor({ on: false });
    await settled(one);
    watchFirstQuestion();
    await one.setDoor({ on: true });
    await settled(one);
    const reask = window;
    expect(one.status()).toMatchObject({ nameCheck: 'confirmed', nameProgress: null });
    expect(checking).not.toBeNull();
    expect(reask).toBe((checking ?? 0) - 1);
  });

  it('a clock that went backwards draws no negative minutes', async () => {
    let t = 50_000;
    names = fakeNameDeps({ source: { kind: 'fixed', servers: FOUR_SERVERS }, monotonic: () => t });
    roundOf('NNNN');
    const one = await publishedHost();
    t = 20_000;
    expect(one.status().nameProgress).toMatchObject({ elapsedMs: 0 });
  });

  it('the wake pushes the round it brings forward once, and a second wake with that round out pushes nothing', async () => {
    fourNames();
    roundOf('NNNN');
    const one = await publishedHost();
    names.answerWith('hold');
    const from = sent.length;
    resume?.();
    await settled(one);
    expect(progressSince(from)).toEqual([{ answers: drawnOf('NNNN'), asking: true, elapsedMs: 0, nextInMs: null }]);
    resume?.();
    await settled(one);
    expect(progressSince(from)).toHaveLength(1);
  });
});
