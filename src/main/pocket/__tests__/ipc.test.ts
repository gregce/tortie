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
 */

import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
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

import type { Session } from '@shared/types';
import type { FunnelChild, FunnelDeps } from '../funnel';
import type { PocketSealedPresentation } from '../pairing';
import type { PocketFacts } from '../routes';

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
const { resetFunnelForTests } = await import('../funnel');
const {
  POCKET_CONFIRM_WARNING,
  POCKET_FUNNEL_RESTARTING,
  POCKET_FUNNEL_SENTENCES,
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

function host(over: { beforeOpen?: () => Promise<unknown>; facts?: PocketFacts } = {}): Host {
  return new PocketHost({
    facts: over.facts ?? FACTS,
    now: () => clock,
    tailscale: ts.deps,
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

/** A host whose door is on, confirmed and published, as the sheet leaves it. */
async function listeningHost(): Promise<Host> {
  const one = host();
  await pairAndAllow(one);
  expect(one.status().state).toBe('listening');
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
      approvalText: null,
      publishedAt: null
    });
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
    expect(status.funnel.publishedAt).toBe(clock);
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
      const phone = makePhone('Held iPhone');
      const offer = await one.beginPairing();
      const { id } = await (async () => {
        const secret = (JSON.parse(offer.payload) as { ps: string }).ps;
        one.pairing.present(presentationOf(secret, phone));
        const view = one.pairing.view();
        one.allowPhone({ linesRead: view.lines, hashRead: view.hash ?? '' });
        return { id: phoneIdOf(phone.signPublic) };
      })();
      const dx = String((JSON.parse(offer.payload) as { dx: string }).dx);
      const shared = diffieHellman({
        privateKey: phone.exchange,
        publicKey: createPublicKey({ key: Buffer.from(dx, 'base64url'), format: 'der', type: 'spki' })
      });
      const binding = Buffer.from(
        hkdfSync('sha256', shared, Buffer.from(`${dx}\n${phone.exchangePublic}`, 'utf8'), 'tortie-pocket-bind-v1', 32)
      ).toString('hex');
      const ask = async (): Promise<number> => {
        const target = `/v1/session?id=${session.id}`;
        const timestamp = String(clock);
        const nonce = randomBytes(12).toString('hex');
        const answer = await one.handler(
          {
            route: 'session',
            method: 'GET',
            target,
            body: new Uint8Array(0),
            channel: id,
            headers: {
              [POCKET_HEADERS.phone]: id,
              [POCKET_HEADERS.timestamp]: timestamp,
              [POCKET_HEADERS.nonce]: nonce,
              [POCKET_HEADERS.signature]: signAsPhone(phone.sign, {
                method: 'GET',
                target,
                bodySha256: createHash('sha256').update(Buffer.alloc(0)).digest('hex'),
                timestamp,
                nonce,
                binding
              })
            } as never
          },
          { stopping: () => false }
        );
        return answer.status;
      };
      return { one, held, ask, phoneId: id };
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

  it('serves exactly the eleven pocket channels, openApproval among them', () => {
    expect([...registered().keys()].sort()).toEqual(
      [
        'pocket:allowPhone',
        'pocket:beginPairing',
        'pocket:cancelPairing',
        'pocket:confirmDoor',
        'pocket:forgetDoor',
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
    expect(POCKET_ROUTE_IDS).toEqual(['pair', 'blocked', 'session', 'turns']);
  });
});
