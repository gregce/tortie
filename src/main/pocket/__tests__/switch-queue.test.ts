/**
 * The door's switch handles ONE PRESS AT A TIME (Phase 316.1, his ruling of
 * 2026-09-23: "Yes, fix and land."), re-pointed in Phase 330 (build/p330/
 * SPEC.md §4.3) through the door PROCESS and the Funnel CHILD.
 *
 * WHAT THE 316.1 REVERIFY FOUND. `setDoor` on, off, on, off inside one turn
 * ended with the sealed store saying off, the sheet saying off, and the door
 * LISTENING, and a paired phone read 200 from it. Its shapes were X1b (the
 * four presses with turns between them), X1c (the four in one turn, with a
 * phone), X1d (the production-shaped wait on the sessions) and X2b (a start, a
 * stop, a start, a stop, the first start inside its listen when the stop
 * lands).
 *
 * WHAT THIS FILE HOLDS. Every one of those shapes, driven through the SHIPPING
 * owner over the REAL `./bind.ts` with the door process run in this process
 * (`./door/in-process.ts`, the same listener the utility process runs), on
 * loopback TLS with a real phone paired through the real window and reading
 * with a real signature, over a connection presenting the client certificate
 * the Mac issued it, behind a PROXY v2 header the way Funnel forwards. Funnel
 * itself is an in-memory stand-in behind `FunnelDeps`: it publishes a
 * foreground session when its child starts, and deletes it when the child is
 * signalled, as tailscaled does. After the LAST press settles (`host.idle()`,
 * because since Phase 330 no IPC answer waits on a start), the things a person
 * and a phone can see must agree: the sealed store, the sheet's state, the
 * module, the socket, Funnel's session, and the phone. The last press decides.
 *
 * `./bind.ts` is the real module. The one wrapper below counts how many starts
 * reached it, so X2b can place its stop inside the first start's wait for the
 * door process rather than wherever a microtask count happens to put it.
 *
 * NOTHING HERE BINDS ANYTHING BUT 127.0.0.1:0, and no program is executed.
 * Every door is stopped in `afterEach`, and every Funnel child ended, whatever
 * happened.
 *
 * THE MAC'S NAME (Phase 332) is asked of `./dns-fixtures.ts`'s `fakeNameDeps`,
 * which opens no socket: it answers the record, and its sleeps end on the next
 * macrotask, so every published door here confirms its name in two rounds and
 * a phone is paired only once main says a code may show.
 */

import {
  createHash,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  type KeyObject
} from 'node:crypto';
import { EventEmitter } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { connect as netConnect } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connect as tlsConnect } from 'node:tls';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Session } from '@shared/types';
import type { FunnelChild, FunnelDeps } from '../funnel';
import type { PocketFacts } from '../routes';
import { fakeNameDeps } from './dns-fixtures';

let userData = '';
const MARKER = '--tortie-pocket-switch-queue-test--';

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

/** Kept quiet, and kept, so a failure can say what the door refused. */
const logged: string[] = [];
vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const capture =
    (level: string) =>
    (msg: string): void => {
      logged.push(`${level} ${msg}`);
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

/**
 * How many starts reached the REAL bind, whether a door was already listening
 * when each one did, and the last local port a door reported.
 */
const binds = { entered: 0, listeningAtEntry: [] as boolean[], lastLocalPort: 0 };
vi.mock('../bind', async (importOriginal) => {
  const real = await importOriginal<typeof import('../bind')>();
  return {
    ...real,
    startPocketDoor: async (input: Parameters<typeof real.startPocketDoor>[0]) => {
      binds.entered += 1;
      binds.listeningAtEntry.push(real.pocketDoorStatus().listening);
      const result = await real.startPocketDoor(input);
      if (result.ok) binds.lastLocalPort = result.localPort;
      return result;
    }
  };
});

const { PocketHost } = await import('../ipc');
const {
  POCKET_HEADERS,
  phoneIdOf,
  pocketConfirmStatus,
  readPocketStore,
  sealPresentationAsPhone,
  signAsPhone
} = await import('../pairing');
const bind = await import('../bind');
const { inProcessDoor } = await import('../door/in-process');
const { resetFunnelForTests } = await import('../funnel');
const { issueClientCertificate } = await import('../tls');

type Host = InstanceType<typeof PocketHost>;

// ---------------------------------------------------------------------------
// Funnel, in memory
// ---------------------------------------------------------------------------

const PROGRAM = '/stand/in/tailscale';
const NAME = 'mac.tail00000.ts.net';

class FakeStream extends EventEmitter {}

class Child extends EventEmitter {
  readonly stdout = new FakeStream() as unknown as NodeJS.ReadableStream;
  readonly stderr = new FakeStream() as unknown as NodeJS.ReadableStream;
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

const funnel = {
  sessions: new Map<number, { port: number; target: string }>(),
  children: [] as Child[],
  /** Held open, a child waits here before it prints that it is published. */
  hold: null as Promise<void> | null,
  spawned: 0,
  nextPid: 90_000
};

function funnelDeps(): FunnelDeps {
  return {
    resolve: () => ({ resolution: { path: PROGRAM, source: 'dev-override', detail: '' }, overrideSet: true }),
    exec: async (_file, args) => {
      if (args[0] === 'status') {
        return {
          stdout: JSON.stringify({
            BackendState: 'Running',
            Self: { DNSName: `${NAME}.`, CapMap: { https: null, funnel: null } },
            CurrentTailnet: { Name: 'example.github' },
            Peer: null
          }),
          stderr: '',
          code: 0,
          failed: false,
          errno: null
        };
      }
      const foreground: Record<string, unknown> = {};
      for (const [pid, s] of funnel.sessions) {
        foreground[`s${String(pid)}`] = {
          TCP: { [String(s.port)]: { TCPForward: s.target, ProxyProtocol: 2 } },
          AllowFunnel: { [`${NAME}:${String(s.port)}`]: true }
        };
      }
      return {
        stdout: funnel.sessions.size === 0 ? 'null' : JSON.stringify({ Foreground: foreground }),
        stderr: '',
        code: 0,
        failed: false,
        errno: null
      };
    },
    spawn: (file, args) => {
      funnel.spawned += 1;
      const pid = (funnel.nextPid += 1);
      const port = Number(/--tcp=(\d+)/.exec(args.join(' '))?.[1] ?? 0);
      const target = /tcp:\/\/(\S+)/.exec(args.join(' '))?.[1] ?? '';
      const child = new Child(pid, () => funnel.sessions.delete(pid));
      child.command = [file, ...args].join(' ');
      funnel.children.push(child);
      const hold = funnel.hold;
      setImmediate(() => {
        void (hold ?? Promise.resolve()).then(() => {
          if (child.closed) return;
          funnel.sessions.set(pid, { port, target });
          child.out('Available on the internet:\n');
        });
      });
      return child as unknown as FunnelChild;
    },
    ps: async (pid) => {
      const c = funnel.children.find((x) => x.pid === pid);
      return c === undefined || c.closed ? null : { lstart: `s${String(pid)}`, command: c.command };
    },
    kill: (pid, signal) => {
      const c = funnel.children.find((x) => x.pid === pid);
      if (signal === 0) return c !== undefined && !c.closed;
      c?.kill(signal);
      return c !== undefined;
    },
    recordPath: () => join(userData, 'gmux', 'pocket-funnel', 'record.json'),
    now: () => Date.now(),
    sleep: (ms) =>
      new Promise<void>((resolve) => {
        if (ms < 1_000) setTimeout(resolve, 1);
      })
  };
}

// ---------------------------------------------------------------------------
// The world
// ---------------------------------------------------------------------------

const SESSION = {
  id: 's-switch',
  name: 'switch',
  tmuxName: 'switch',
  projectPath: '/w/switch',
  cwd: '/w/switch',
  agent: 'claude',
  status: 'idle',
  createdAt: 1
} as Session;

const FACTS: PocketFacts = {
  sessions: () => [SESSION],
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

const tick = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Does anything accept a TCP connection on the door's last port? Nothing is sent. */
function socketAnswers(port: number): Promise<boolean> {
  if (port === 0) return Promise.resolve(false);
  return new Promise((done) => {
    const socket = netConnect({ host: '127.0.0.1', port });
    const finish = (value: boolean): void => {
      socket.destroy();
      done(value);
    };
    socket.setTimeout(2_000, () => finish(false));
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
  });
}

const hosts: Host[] = [];
/** Every held wait on the sessions, released in `afterEach` whatever happened. */
const releasers: Array<() => void> = [];

/** A host over a fresh store, its door process run in this process. */
function hostOn(beforeOpen?: () => Promise<unknown>): Host {
  const one = new PocketHost({
    facts: FACTS,
    tailscale: funnelDeps(),
    door: inProcessDoor(),
    names: fakeNameDeps({ sleep: 'now' }),
    ...(beforeOpen !== undefined ? { beforeOpen } : {})
  });
  hosts.push(one);
  return one;
}

/** The sheet's order: Pair, read, Allow, listening. */
async function onAndConfirmed(one: Host): Promise<void> {
  await one.setDoor({ on: true });
  await one.idle();
  const lines = one.status();
  await one.confirmDoor({ linesRead: lines.confirmLines, hashRead: lines.confirmHash });
  await one.idle();
  expect(one.status().state).toBe('listening');
}

// ---------------------------------------------------------------------------
// The phone, its half spelled here from the wire format
// ---------------------------------------------------------------------------

interface Phone {
  id: string;
  signPrivate: KeyObject;
  binding: string;
  keyPem: string;
  certPem: string;
}

function pem(der: Buffer): string {
  const body = der.toString('base64').replace(/.{1,64}/g, '$&\n');
  return `-----BEGIN CERTIFICATE-----\n${body}-----END CERTIFICATE-----\n`;
}

/** Pair one phone through the shipping window on a published door, once main says a code may show. */
async function pairPhone(one: Host): Promise<Phone> {
  for (let i = 0; i < 400 && !one.status().pairable; i += 1) await tick();
  expect(one.status().pairable).toBe(true);
  const offer = await one.beginPairing();
  const signing = generateKeyPairSync('ed25519');
  const exchange = generateKeyPairSync('x25519');
  const client = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const signingKey = signing.publicKey.export({ format: 'der', type: 'spki' }).toString('base64url');
  const exchangeKey = exchange.publicKey.export({ format: 'der', type: 'spki' }).toString('base64url');
  const clientKey = client.publicKey.export({ format: 'der', type: 'spki' }).toString('base64url');
  const body = (): Parameters<Host['pairing']['present']>[0] =>
    JSON.parse(
      sealPresentationAsPhone(
        offer.payload,
        { label: 'Switch iPhone', signingKey, exchangeKey, clientKey },
        signing.privateKey
      ).toString('utf8')
    ) as Parameters<Host['pairing']['present']>[0];
  expect(one.pairing.present(body())).toEqual({ state: 'pending' });
  const view = one.pairing.view();
  expect(one.allowPhone({ linesRead: view.lines, hashRead: view.hash ?? '' }).allowed).toBe(true);
  const allowed = one.pairing.present(body());
  if (allowed.state !== 'allowed') throw new Error('the phone was not handed its certificate');
  one.cancelPairing();
  const dx = String((JSON.parse(offer.payload) as { dx: string }).dx);
  const shared = diffieHellman({
    privateKey: exchange.privateKey,
    publicKey: createPublicKey({ key: Buffer.from(dx, 'base64url'), format: 'der', type: 'spki' })
  });
  const binding = Buffer.from(
    hkdfSync('sha256', shared, Buffer.from(`${dx}\n${exchangeKey}`, 'utf8'), 'tortie-pocket-bind-v1', 32)
  ).toString('hex');
  return {
    id: phoneIdOf(signingKey),
    signPrivate: signing.privateKey,
    binding,
    keyPem: client.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    certPem: pem(Buffer.from(allowed.cert, 'base64url'))
  };
}

/** A PROXY v2 TCP4 header, the way Funnel's forward writes one. */
function proxyHeader(): Buffer {
  return Buffer.concat([
    Buffer.from([0x0d, 0x0a, 0x0d, 0x0a, 0x00, 0x0d, 0x0a, 0x51, 0x55, 0x49, 0x54, 0x0a]),
    Buffer.from([0x21, 0x11, 0x00, 0x0c]),
    Buffer.from([203, 0, 113, 7]),
    Buffer.from([127, 0, 0, 1]),
    Buffer.from([0x30, 0x39, 0x20, 0xfb])
  ]);
}

/**
 * A signed read over mutual TLS, behind a PROXY header, one request per
 * connection. 0 when there was no socket to read from or it was closed before
 * a status line.
 */
function phoneReads(phone: Phone, port: number, target = '/v1/blocked'): Promise<number> {
  if (port === 0) return Promise.resolve(0);
  const timestamp = String(Date.now());
  const nonce = randomBytes(16).toString('hex');
  const signature = signAsPhone(phone.signPrivate, {
    method: 'GET',
    target,
    bodySha256: createHash('sha256').update(Buffer.alloc(0)).digest('hex'),
    timestamp,
    nonce,
    binding: phone.binding
  });
  return new Promise((done) => {
    let settled = false;
    let text = '';
    const raw = netConnect({ host: '127.0.0.1', port });
    const finish = (status: number): void => {
      if (settled) return;
      settled = true;
      raw.destroy();
      done(status);
    };
    raw.setTimeout(5_000, () => finish(0));
    raw.once('error', () => finish(0));
    raw.once('connect', () => {
      raw.write(proxyHeader());
      let secure: ReturnType<typeof tlsConnect>;
      try {
        // The phone pins the door's KEY (tested in `./pairing.test.ts` and on
        // the phone); this client only has to reach the door's pin check.
        secure = tlsConnect({
          socket: raw,
          servername: NAME,
          key: phone.keyPem,
          cert: phone.certPem,
          rejectUnauthorized: false,
          minVersion: 'TLSv1.3'
        });
      } catch {
        finish(0);
        return;
      }
      secure.once('error', () => finish(0));
      secure.once('close', () => {
        const line = /^HTTP\/1\.1 (\d{3})/.exec(text);
        finish(line === null ? 0 : Number(line[1]));
      });
      secure.on('data', (chunk: Buffer) => {
        text += chunk.toString('latin1');
      });
      secure.once('secureConnect', () => {
        secure.write(
          [
            `GET ${target} HTTP/1.1`,
            `Host: ${NAME}:8443`,
            `${POCKET_HEADERS.phone}: ${phone.id}`,
            `${POCKET_HEADERS.timestamp}: ${timestamp}`,
            `${POCKET_HEADERS.nonce}: ${nonce}`,
            `${POCKET_HEADERS.signature}: ${signature}`,
            'Connection: close',
            '',
            ''
          ].join('\r\n')
        );
      });
    });
  });
}

// ---------------------------------------------------------------------------
// The agreement
// ---------------------------------------------------------------------------

interface Reading {
  enabled: boolean | null;
  bindAtLaunch: boolean | null;
  sheet: string;
  /**
   * The sheet's sentence is the GATE's own, or none: never a refusal a
   * superseded start answered.
   */
  onlyTheGateSpeaks: boolean;
  module: boolean;
  socket: boolean;
  /** Funnel publishes a foreground session, and exactly one child is alive. */
  published: boolean;
  phone: number | null;
}

/** What the store, the sheet, the module, the socket, Funnel and a phone say. */
async function reading(one: Host, phone?: Phone): Promise<Reading> {
  await one.idle();
  await tick();
  await sleep(20);
  await one.idle();
  const stored = readPocketStore().store;
  const sheet = one.status();
  const port = bind.pocketDoorStatus().listening ? bind.pocketDoorStatus().localPort : binds.lastLocalPort;
  const socket = await socketAnswers(port);
  const gate = pocketConfirmStatus(one.fields());
  const alive = funnel.children.filter((c) => !c.closed).length;
  return {
    enabled: stored?.enabled ?? null,
    bindAtLaunch: stored?.bindAtLaunch ?? null,
    sheet: sheet.state,
    onlyTheGateSpeaks: sheet.refusal === (sheet.state === 'listening' ? null : gate.refusal),
    module: bind.pocketDoorStatus().listening,
    socket,
    published: funnel.sessions.size === 1 && alive === 1,
    phone: phone === undefined || !socket ? null : await phoneReads(phone, port)
  };
}

/** The last press was OFF: every one of them says off, and a phone reads nothing. */
function agreeOff(r: Reading): void {
  expect(r).toEqual({
    enabled: false,
    bindAtLaunch: false,
    sheet: 'off',
    onlyTheGateSpeaks: true,
    module: false,
    socket: false,
    published: false,
    phone: null
  });
  expect(funnel.sessions.size).toBe(0);
  expect(funnel.children.every((c) => c.closed)).toBe(true);
}

/** The last press was ON, on confirmed fields: every one of them says listening. */
function agreeListening(r: Reading, withPhone: boolean): void {
  expect(r).toEqual({
    enabled: true,
    bindAtLaunch: true,
    sheet: 'listening',
    onlyTheGateSpeaks: true,
    module: true,
    socket: true,
    published: true,
    phone: withPhone ? 200 : null
  });
}

/** The presses, pressed back to back, with `k` turns of `wait` after each. */
async function press(
  one: Host,
  switches: readonly boolean[],
  k = 0,
  wait: () => Promise<void> = tick
): Promise<void> {
  const pressed: Promise<unknown>[] = [];
  for (const on of switches) {
    pressed.push(one.setDoor({ on }));
    for (let i = 0; i < k; i += 1) await wait();
  }
  const settledPresses = await Promise.allSettled(pressed);
  // Every press here is one the owner accepts; none may be refused.
  expect(settledPresses.map((s) => s.status)).toEqual(switches.map(() => 'fulfilled'));
}

/** The production `beforeOpen` once the app is up: a window exists, the core has booted. */
const upAlready = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'p330-switch-'));
  bind.resetPocketDoorForTests();
  resetFunnelForTests();
  binds.entered = 0;
  binds.listeningAtEntry = [];
  binds.lastLocalPort = 0;
  funnel.sessions.clear();
  funnel.children = [];
  funnel.hold = null;
  funnel.spawned = 0;
  logged.length = 0;
});

afterEach(async () => {
  for (const release of releasers.splice(0)) release();
  for (const one of hosts.splice(0)) {
    try {
      await one.stop();
    } catch {
      /* a stop never throws; this is the teardown */
    }
  }
  await bind.stopPocketDoor();
  for (const c of funnel.children) c.close(null, 'SIGKILL');
  bind.resetPocketDoorForTests();
  resetFunnelForTests();
  rmSync(userData, { recursive: true, force: true });
});

afterAll(async () => {
  await bind.joinPocketDoor();
  bind.resetPocketDoorForTests();
});

// ---------------------------------------------------------------------------
// The control: the sheet's order reaches a phone over mutual TLS
// ---------------------------------------------------------------------------

describe('the control', () => {
  it('a paired phone reads 200 over its own client certificate, and a stranger’s certificate is cut', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    const phone = await pairPhone(one);
    agreeListening(await reading(one, phone), true);
    // The same signature over a connection presenting ANOTHER key, in a
    // certificate the stranger made over it itself.
    const stranger = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const strangerPem = stranger.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
    const strangerSpki = stranger.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url');
    const other = {
      ...phone,
      keyPem: strangerPem,
      certPem: pem(issueClientCertificate(strangerPem, strangerSpki, Date.now()))
    };
    expect(await phoneReads(other, bind.pocketDoorStatus().localPort)).toBe(0);
    expect(logged.some((l) => l.includes('refused a connection at the door: unknown-key'))).toBe(true);
    // And the phone itself still reads.
    expect(await phoneReads(phone, bind.pocketDoorStatus().localPort)).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// The reverify's four shapes. Each ends on an OFF, so all four must say off.
// ---------------------------------------------------------------------------

describe('the reverify’s shapes: the last press is off, and nothing listens or publishes', () => {
  it('X1b: on, off, on, off in one turn, from a confirmed door that was switched off', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    await one.setDoor({ on: false });
    await press(one, [true, false, true, false]);
    agreeOff(await reading(one));
  });

  it('X1c: on, off, on, off in one turn with a phone paired: the phone reads nothing', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    const phone = await pairPhone(one);
    const port = bind.pocketDoorStatus().localPort;
    expect(await phoneReads(phone, port)).toBe(200);
    await one.setDoor({ on: false });
    await press(one, [true, false, true, false]);
    agreeOff(await reading(one, phone));
    expect(await phoneReads(phone, binds.lastLocalPort)).toBe(0);
  });

  for (const k of [3, 4]) {
    it(`X1d: on, off, on, off ${String(k)} microtasks apart, with the production wait on the sessions and a phone paired`, async () => {
      const one = hostOn(upAlready);
      await onAndConfirmed(one);
      const phone = await pairPhone(one);
      await one.setDoor({ on: false });
      await press(one, [true, false, true, false], k, () => Promise.resolve());
      agreeOff(await reading(one, phone));
      expect(await phoneReads(phone, binds.lastLocalPort)).toBe(0);
    });
  }

  it('X2b: the first start is inside its door’s start when the off lands; then on, off', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    const phone = await pairPhone(one);
    await one.setDoor({ on: false });
    const entered = binds.entered;
    const first = one.setDoor({ on: true });
    // Placed, not counted: the next three presses are pressed only once the
    // first start has reached the real bind, whose wait for the door process
    // is its one await.
    for (let i = 0; i < 400 && binds.entered === entered; i += 1) await tick();
    expect(binds.entered).toBe(entered + 1);
    const rest = [one.setDoor({ on: false }), one.setDoor({ on: true }), one.setDoor({ on: false })];
    await Promise.all([first, ...rest]);
    agreeOff(await reading(one, phone));
    expect(await phoneReads(phone, binds.lastLocalPort)).toBe(0);
  });

  it('X3 (Phase 330): the off lands while Funnel is starting: the child is ended and nothing publishes', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    await one.setDoor({ on: false });
    let release = (): void => undefined;
    funnel.hold = new Promise<void>((resolve) => {
      release = resolve;
    });
    releasers.push(() => release());
    const spawned = funnel.spawned;
    void one.setDoor({ on: true });
    for (let i = 0; i < 400 && funnel.spawned === spawned; i += 1) await tick();
    expect(funnel.spawned).toBe(spawned + 1);
    expect(one.status().state).toBe('opening');
    const off = await one.setDoor({ on: false });
    expect(off.state).toBe('off');
    release();
    agreeOff(await reading(one));
  });
});

// ---------------------------------------------------------------------------
// The sweep the reverify ran around those shapes. Every row ends on an OFF.
// ---------------------------------------------------------------------------

describe('the sweep around them: every offset, with and without a wait on the sessions', () => {
  for (const waitsOnSessions of [false, true]) {
    for (let k = 0; k <= 6; k += 1) {
      it(`on, off, on, off, ${String(k)} turns apart (${waitsOnSessions ? 'the sessions take a timer' : 'no wait on the sessions'})`, async () => {
        const one = hostOn(waitsOnSessions ? () => sleep(1) : undefined);
        await onAndConfirmed(one);
        await one.setDoor({ on: false });
        await press(one, [true, false, true, false], k);
        agreeOff(await reading(one));
      });
    }
  }
  for (let k = 0; k <= 4; k += 1) {
    it(`the production wait on the sessions, ${String(k)} microtasks apart, with a phone`, async () => {
      const one = hostOn(upAlready);
      await onAndConfirmed(one);
      const phone = await pairPhone(one);
      await one.setDoor({ on: false });
      await press(one, [true, false, true, false], k, () => Promise.resolve());
      agreeOff(await reading(one, phone));
    });
  }
});

// ---------------------------------------------------------------------------
// The last press decides in the other direction too.
// ---------------------------------------------------------------------------

describe('when the last press is ON, the door the person switched on is the one that answers', () => {
  it('on, on: the second press does not lose the door the first one opened', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    const phone = await pairPhone(one);
    await one.setDoor({ on: false });
    await press(one, [true, true]);
    agreeListening(await reading(one, phone), true);
  });

  it('on, off, on in one turn', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    const phone = await pairPhone(one);
    await one.setDoor({ on: false });
    await press(one, [true, false, true]);
    agreeListening(await reading(one, phone), true);
  });

  for (const k of [0, 1, 2, 3, 4]) {
    it(`on, off, on, off, on, ${String(k)} microtasks apart, with the production wait on the sessions`, async () => {
      const one = hostOn(upAlready);
      await onAndConfirmed(one);
      const phone = await pairPhone(one);
      await one.setDoor({ on: false });
      await press(one, [true, false, true, false, true], k, () => Promise.resolve());
      agreeListening(await reading(one, phone), true);
    });
  }
});

// ---------------------------------------------------------------------------
// The ruling's two clauses about a superseded start, and the wait it ends.
// ---------------------------------------------------------------------------

describe('a start whose press is no longer the last one', () => {
  /** A wait on the sessions this test releases, and how often it was entered. */
  function heldSessions(): {
    wait: () => Promise<unknown>;
    entered: () => number;
    hold: () => void;
    release: () => void;
  } {
    let held = false;
    let entered = 0;
    let release = (): void => undefined;
    const sessions = new Promise<void>((resolve) => {
      release = resolve;
    });
    releasers.push(() => release());
    return {
      wait: () => {
        if (!held) return Promise.resolve();
        entered += 1;
        return sessions;
      },
      entered: () => entered,
      hold: () => {
        held = true;
      },
      release: () => release()
    };
  }

  async function until(test: () => boolean): Promise<void> {
    for (let i = 0; i < 400 && !test(); i += 1) await tick();
    expect(test()).toBe(true);
  }

  it('stops waiting on the sessions when a later press arrives, so the off is answered while they are still coming up', async () => {
    const sessions = heldSessions();
    const one = hostOn(sessions.wait);
    await onAndConfirmed(one);
    await one.setDoor({ on: false });
    sessions.hold();
    const entered = binds.entered;
    const on = one.setDoor({ on: true });
    await until(() => sessions.entered() === 1);
    const off = await one.setDoor({ on: false });
    expect(off.state).toBe('off');
    await on;
    expect(binds.entered).toBe(entered);
    agreeOff(await reading(one));
    sessions.release();
    await tick();
    agreeOff(await reading(one));
    expect(binds.entered).toBe(entered);
  });

  it('does not start when it is superseded before it forks: on, on, and ONE start reaches the bind', async () => {
    const sessions = heldSessions();
    const one = hostOn(sessions.wait);
    await onAndConfirmed(one);
    const phone = await pairPhone(one);
    await one.setDoor({ on: false });
    sessions.hold();
    const entered = binds.entered;
    const first = one.setDoor({ on: true });
    await until(() => sessions.entered() === 1);
    const second = one.setDoor({ on: true });
    await until(() => sessions.entered() === 2);
    sessions.release();
    await Promise.all([first, second]);
    await one.idle();
    expect(binds.entered).toBe(entered + 1);
    agreeListening(await reading(one, phone), true);
  });

  it('closes a door that started under it before the next press runs', async () => {
    const one = hostOn();
    await onAndConfirmed(one);
    const phone = await pairPhone(one);
    await one.setDoor({ on: false });
    const entered = binds.entered;
    const first = one.setDoor({ on: true });
    await until(() => binds.entered === entered + 1);
    const second = one.setDoor({ on: true });
    await Promise.all([first, second]);
    await one.idle();
    // The second start reached the bind with nothing listening: the door the
    // first one opened was closed inside the first one's turn.
    expect(binds.listeningAtEntry.slice(entered)).toEqual([false, false]);
    agreeListening(await reading(one, phone), true);
  });
});
