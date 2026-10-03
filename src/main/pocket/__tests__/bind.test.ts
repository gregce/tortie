/**
 * The door's life: the process it runs in, its refusals and its death (Phase
 * 313; rebuilt around a `utilityProcess` by Phase 330, build/p330/SPEC.md
 * §4.5.3).
 *
 * WHAT THIS FILE NEVER DOES. It never forks a process: vitest has no
 * `utilityProcess`, so every door here is `inProcessDoor()`, which runs the
 * SAME listener behind the same spawner interface, or a fake child this file
 * writes when what is measured is main's side of the wire alone. The one thing
 * that IS real is the listener's own `listen(0, '127.0.0.1')` and the mutual
 * TLS over it, and it is real on purpose: a teardown that is asserted rather
 * than driven proves nothing. Every door is joined in `afterEach`, and every
 * client socket destroyed there, whatever happened.
 */

import { createHash, generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { connect as netConnect, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { connect as tlsConnect, type TLSSocket } from 'node:tls';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
    getLog: () => ({ error: capture('error'), warn: capture('warn'), info: capture('info'), debug: capture('debug') })
  };
});

const {
  DOOR_SENTENCES,
  DOOR_STOP_KILL_MS,
  beginPocketShutdown,
  joinPocketDoor,
  onPocketDoorExit,
  pocketDoorDroppedMessages,
  pocketDoorShuttingDown,
  pocketDoorStatus,
  pocketShutdownStarted,
  resetPocketDoorForTests,
  startPocketDoor,
  stopPocketDoor,
  updatePocketDoor
} = await import('../bind');
type DoorStartInput = import('../bind').DoorStartInput;
type DoorRequestHandler = import('../bind').DoorRequestHandler;
const { inProcessDoor } = await import('../door/in-process');
type DoorChild = import('../door/wire').DoorChild;
type ToDoor = import('../door/wire').ToDoor;
const {
  IDENTITY_SENTENCES,
  POCKET_TLS_SEAL_PREFIX,
  ensureDoorIdentity,
  issueClientCertificate,
  pocketCertificateFingerprint,
  pocketPublicKeyFingerprint,
  pocketTlsMaterial
} = await import('../tls');
type IdentitySealPort = import('../tls').IdentitySealPort;

const NAME = 'mac.tail00000.ts.net';
const HOST = { name: NAME, port: 8443 };

// ---------------------------------------------------------------------------
// Plumbing
// ---------------------------------------------------------------------------

let dir: string;
const sockets: (Socket | TLSSocket)[] = [];

const seal: IdentitySealPort = {
  available: () => true,
  seal: (text) => Buffer.from(`${POCKET_TLS_SEAL_PREFIX}${text}`).toString('base64'),
  open: (blob) => {
    if (typeof blob !== 'string' || blob.length === 0) return '';
    const text = Buffer.from(blob, 'base64').toString('utf8');
    if (!text.startsWith(POCKET_TLS_SEAL_PREFIX)) return '';
    return text.slice(POCKET_TLS_SEAL_PREFIX.length);
  }
};

/** The real identity module, over a scratch file and a readable fake seal. */
const identity: DoorStartInput['identity'] = (options) => ensureDoorIdentity({ ...options, seal });

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'p330-bind-'));
  resetPocketDoorForTests();
  logged.length = 0;
});

afterEach(async () => {
  for (const s of sockets.splice(0)) s.destroy();
  await joinPocketDoor();
  resetPocketDoorForTests();
  rmSync(dir, { recursive: true, force: true });
});

function doorKeyPem(): string {
  const made = ensureDoorIdentity({ path: join(dir, 'pocket-identity.json'), seal, names: { addresses: [], dnsNames: [NAME] } });
  if (made.kind !== 'ready') throw new Error('no identity');
  return made.identity.keyPem;
}

interface Phone {
  readonly id: string;
  readonly key: string;
  readonly cert: string;
  readonly pin: string;
}

/** A phone: a P-256 key, and the certificate the Mac issues over it. */
function makePhone(id: string): Phone {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const spki = publicKey.export({ type: 'spki', format: 'der' });
  const der = issueClientCertificate(doorKeyPem(), spki.toString('base64url'), Date.now());
  const b64 = der.toString('base64').replace(/.{1,64}/g, '$&\n');
  return {
    id,
    key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    cert: `-----BEGIN CERTIFICATE-----\n${b64}-----END CERTIFICATE-----\n`,
    pin: createHash('sha256').update(spki).digest('base64url')
  };
}

/** A PROXY v2 TCP4 header, spelled here. */
function proxyHeader(): Buffer {
  const header = Buffer.alloc(28);
  Buffer.from('0d0a0d0a000d0a515549540a', 'hex').copy(header, 0);
  header.writeUInt8(0x21, 12);
  header.writeUInt8(0x11, 13);
  header.writeUInt16BE(12, 14);
  [203, 0, 113, 7, 127, 0, 0, 1].forEach((b, i) => header.writeUInt8(b, 16 + i));
  return header;
}

/**
 * One GET over mutual TLS, the way a phone behind the forwarder sends one.
 * Answers the status, or 0 when the door closed the connection unanswered.
 */
async function read(port: number, phone: Phone, target = '/v1/blocked'): Promise<{ status: number; body: string }> {
  const raw = netConnect(port, '127.0.0.1');
  sockets.push(raw);
  raw.on('error', () => undefined);
  await new Promise<void>((resolve) => raw.once('connect', () => resolve()));
  raw.write(proxyHeader());
  const tls = tlsConnect({
    socket: raw,
    servername: NAME,
    minVersion: 'TLSv1.3',
    rejectUnauthorized: false,
    key: phone.key,
    cert: phone.cert
  });
  sockets.push(tls);
  tls.on('error', () => undefined);
  const chunks: Buffer[] = [];
  tls.on('data', (d: Buffer) => chunks.push(d));
  await new Promise<void>((resolve) => {
    tls.once('secureConnect', () => resolve());
    tls.once('close', () => resolve());
  });
  tls.write(
    `GET ${target} HTTP/1.1\r\nHost: ${NAME}:8443\r\nx-tortie-phone: ${phone.id}\r\nx-tortie-timestamp: 1\r\n` +
      `x-tortie-nonce: 0123456789abcdef\r\nx-tortie-signature: s\r\nConnection: close\r\n\r\n`
  );
  await new Promise<void>((resolve) => {
    tls.once('close', () => resolve());
    raw.once('close', () => resolve());
    setTimeout(resolve, 4_000);
  });
  const text = Buffer.concat(chunks).toString('utf8');
  const status = Number(/^HTTP\/1\.1 (\d{3})/.exec(text)?.[1] ?? 0);
  return { status, body: text.slice(text.indexOf('\r\n\r\n') + 4) };
}

const answered: DoorRequestHandler = async () => ({ status: 200, body: '"answered"' });

function startInput(over: Partial<DoorStartInput> = {}): DoorStartInput {
  return {
    handle: answered,
    publicHost: HOST,
    pins: [],
    windowOpen: false,
    identity,
    identityPath: join(dir, 'pocket-identity.json'),
    spawn: inProcessDoor(),
    ...over
  };
}

/**
 * A door process that is not one: it records what main posts and says what a
 * test tells it to, so main's side of the wire can be driven alone.
 */
function fakeChild(behaviour: { listen?: boolean; ignoreStop?: boolean } = {}): {
  spawn: () => DoorChild;
  posted: ToDoor[];
  say: (message: unknown) => void;
  exit: () => void;
  killed: () => number;
} {
  const posted: ToDoor[] = [];
  let onMessage: (message: unknown) => void = () => undefined;
  let onExit: (code: number | null) => void = () => undefined;
  let kills = 0;
  let exited = false;
  const exit = (): void => {
    if (exited) return;
    exited = true;
    setImmediate(() => onExit(0));
  };
  const child: DoorChild = {
    pid: undefined,
    post(message) {
      posted.push(message);
      if (message.kind === 'start' && behaviour.listen !== false) {
        setImmediate(() => onMessage({ kind: 'listening', localPort: 50_123 }));
      }
      if (message.kind === 'stop' && behaviour.ignoreStop !== true) {
        setImmediate(() => onMessage({ kind: 'stopped', accepted: 0, joined: true, waitedMs: 1 }));
      }
    },
    onMessage(listener) {
      onMessage = listener;
    },
    onExit(listener) {
      onExit = listener;
    },
    kill() {
      kills += 1;
      exit();
    }
  };
  return { spawn: () => child, posted, say: (m) => onMessage(m), exit, killed: () => kills };
}

async function turn(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setImmediate(resolve));
}

// ---------------------------------------------------------------------------
// The door
// ---------------------------------------------------------------------------

describe('the door', () => {
  it('forks a process that listens on loopback, answers a pinned phone over mutual TLS, and closes', async () => {
    const phone = makePhone('phone-a');
    const spawn = inProcessDoor();
    const started = await startPocketDoor(startInput({ spawn, pins: [{ phoneId: phone.id, spkiSha256: phone.pin }] }));
    if (!started.ok) throw new Error(started.sentence);
    expect(started.localPort).toBeGreaterThan(0);
    expect(spawn.doors).toHaveLength(1);
    expect(pocketDoorStatus()).toMatchObject({ listening: true, localPort: started.localPort, lastRefusal: null });
    const answer = await read(started.localPort, phone);
    expect(answer).toEqual({ status: 200, body: '"answered"' });
    await stopPocketDoor();
    expect(pocketDoorStatus().listening).toBe(false);
    // The process's listener is gone: nothing answers on its port.
    const refused = await new Promise<string>((resolve) => {
      const probe = netConnect(started.localPort, '127.0.0.1');
      sockets.push(probe);
      probe.once('connect', () => resolve('connected'));
      probe.once('error', (e: NodeJS.ErrnoException) => resolve(e.code ?? 'error'));
    });
    expect(refused).toBe('ECONNREFUSED');
  });

  it('hands the handler the channel the handshake completed with', async () => {
    const a = makePhone('phone-a');
    const seen: (string | null)[] = [];
    const started = await startPocketDoor(
      startInput({
        pins: [{ phoneId: a.id, spkiSha256: a.pin }],
        handle: async (request) => {
          seen.push(request.route === 'pair' ? null : request.channel);
          return { status: 200, body: '1' };
        }
      })
    );
    if (!started.ok) throw new Error('did not open');
    await read(started.localPort, a);
    expect(seen).toEqual(['phone-a']);
  });

  it('refuses to open with no certificate, and says the identity’s own sentence', async () => {
    const result = await startPocketDoor(
      startInput({
        identity: () => ({
          kind: 'refused',
          reason: 'seal-unavailable',
          sentence: IDENTITY_SENTENCES['seal-unavailable']
        })
      })
    );
    expect(result).toEqual({ ok: false, reason: 'no-certificate', sentence: IDENTITY_SENTENCES['seal-unavailable'] });
    expect(pocketDoorStatus().listening).toBe(false);
  });

  it('asks the identity for the public name alone, and no address', async () => {
    const asked: unknown[] = [];
    await startPocketDoor(
      startInput({
        identity: (options) => {
          asked.push(options.names);
          return ensureDoorIdentity({ ...options, seal });
        }
      })
    );
    expect(asked).toEqual([{ addresses: [], dnsNames: [NAME] }]);
  });

  it('refuses bind-failed when the process cannot listen, and door-exited when it dies opening', async () => {
    const cannot = fakeChild({ listen: false });
    const opening = startPocketDoor(startInput({ spawn: cannot.spawn }));
    await turn();
    cannot.say({ kind: 'refused', reason: 'bind-failed' });
    expect(await opening).toEqual({ ok: false, reason: 'bind-failed', sentence: DOOR_SENTENCES['bind-failed'] });
    expect(cannot.killed()).toBe(1);
    const dies = fakeChild({ listen: false });
    const second = startPocketDoor(startInput({ spawn: dies.spawn }));
    await turn();
    dies.exit();
    expect(await second).toEqual({ ok: false, reason: 'door-exited', sentence: DOOR_SENTENCES['door-exited'] });
    expect(pocketDoorStatus()).toMatchObject({ listening: false, lastRefusal: 'door-exited' });
  });

  it('holds its material only while it is answering with it', async () => {
    expect(pocketTlsMaterial()).toBeNull();
    const started = await startPocketDoor(startInput());
    if (!started.ok) throw new Error('did not open');
    expect(pocketCertificateFingerprint()).toBe(started.certificateFingerprint);
    expect(pocketPublicKeyFingerprint()).toBe(started.publicKeyFingerprint);
    expect(pocketTlsMaterial()?.cert).toContain('BEGIN CERTIFICATE');
    await stopPocketDoor();
    expect(pocketTlsMaterial()).toBeNull();
    expect(pocketCertificateFingerprint()).toBeNull();
  });

  it('forks ONE process when two starts race', async () => {
    const spawn = inProcessDoor();
    const [first, second] = await Promise.all([
      startPocketDoor(startInput({ spawn })),
      startPocketDoor(startInput({ spawn }))
    ]);
    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    expect(spawn.doors).toHaveLength(1);
    // And a start while open answers what is open, forking nothing.
    expect(await startPocketDoor(startInput({ spawn }))).toEqual(first);
    expect(spawn.doors).toHaveLength(1);
  });

  // THE PHASE 316.1 FIX ROUND, on a process rather than a socket: a stop that
  // lands inside the start's wait must end the process that start forked.
  it('ends the process when it is stopped while it is still opening', async () => {
    const child = fakeChild();
    const opening = startPocketDoor(startInput({ spawn: child.spawn }));
    await stopPocketDoor();
    const result = await opening;
    expect(result.ok).toBe(false);
    expect(child.killed()).toBeGreaterThan(0);
    expect(pocketDoorStatus().listening).toBe(false);
    // A person's stop is not the quit, so the module's last word is not "quitting".
    expect(pocketDoorStatus().lastRefusal).toBeNull();
  });

  it('forks a fresh process for a start that follows a stop inside an opening', async () => {
    const spawn = inProcessDoor();
    const first = startPocketDoor(startInput({ spawn }));
    await stopPocketDoor();
    const second = startPocketDoor(startInput({ spawn }));
    const [one, two] = await Promise.all([first, second]);
    expect(one.ok).toBe(false);
    expect(two.ok).toBe(true);
    expect(spawn.doors).toHaveLength(2);
    expect(pocketDoorStatus().listening).toBe(true);
  });

  it('opens nothing once the quit has begun', async () => {
    await joinPocketDoor(); // the disposer's own line
    const spawn = inProcessDoor();
    const result = await startPocketDoor(startInput({ spawn }));
    expect(result).toEqual({ ok: false, reason: 'quitting', sentence: DOOR_SENTENCES['quitting'] });
    expect(spawn.doors).toHaveLength(0);
  });

  it('answers the quit with an empty report when it never opened', async () => {
    expect(await joinPocketDoor()).toEqual({ accepted: 0, joined: true, waitedMs: 0 });
  });
});

// ---------------------------------------------------------------------------
// Refusal 7 by generation, and the stop
// ---------------------------------------------------------------------------

describe('refusal 7 by generation', () => {
  it('refuses a request stamped for another generation, and no handler sees it', async () => {
    const child = fakeChild();
    let handled = 0;
    const started = await startPocketDoor(
      startInput({
        spawn: child.spawn,
        handle: async () => {
          handled += 1;
          return { status: 200, body: '1' };
        }
      })
    );
    if (!started.ok) throw new Error('did not open');
    const start = child.posted.find((m) => m.kind === 'start');
    if (start?.kind !== 'start') throw new Error('no start');
    const request = {
      route: 'blocked',
      method: 'GET',
      target: '/v1/blocked',
      headers: {
        'x-tortie-phone': 'p',
        'x-tortie-timestamp': '1',
        'x-tortie-nonce': '0123456789abcdef',
        'x-tortie-signature': 's'
      },
      body: new Uint8Array(0),
      channel: 'p'
    };
    child.say({ kind: 'request', id: 1, generation: start.generation + 1, request });
    child.say({ kind: 'request', id: 2, generation: start.generation, request });
    await turn();
    expect(handled).toBe(1);
    expect(child.posted.filter((m) => m.kind === 'answer')).toEqual([
      { kind: 'answer', id: 1, status: 404, body: null },
      { kind: 'answer', id: 2, status: 200, body: '1' }
    ]);
  });

  it('drops a message from the door process that does not validate, whole, and counts it', async () => {
    const child = fakeChild();
    let handled = 0;
    await startPocketDoor(
      startInput({
        spawn: child.spawn,
        handle: async () => {
          handled += 1;
          return { status: 200, body: '1' };
        }
      })
    );
    const start = child.posted.find((m) => m.kind === 'start');
    if (start?.kind !== 'start') throw new Error('no start');
    const before = pocketDoorDroppedMessages();
    // A header over its bound, a raw body where bytes go, a word that is not one.
    child.say({ kind: 'request', id: 1, generation: start.generation, request: { route: 'blocked', method: 'GET', target: '/v1/blocked', headers: { 'x-tortie-phone': 'p', 'x-tortie-timestamp': '1', 'x-tortie-nonce': 'short', 'x-tortie-signature': 's' }, body: new Uint8Array(0), channel: 'p' } });
    child.say({ kind: 'request', id: 2, generation: start.generation, request: { route: 'pair', presentation: { iv: 'x' } } });
    child.say({ kind: 'refusal', word: '203.0.113.7' });
    await turn();
    expect(pocketDoorDroppedMessages() - before).toBe(3);
    expect(handled).toBe(0);
    expect(child.posted.filter((m) => m.kind === 'answer')).toEqual([]);
    expect(logged.some((l) => l.includes('203.0.113.7'))).toBe(false);
  });

  it('refuses a request an OLD door process stamps with the NEW door’s generation', async () => {
    const first = fakeChild();
    await startPocketDoor(startInput({ spawn: first.spawn }));
    await stopPocketDoor();
    let handled = 0;
    const second = fakeChild();
    await startPocketDoor(
      startInput({
        spawn: second.spawn,
        handle: async () => {
          handled += 1;
          return { status: 200, body: '1' };
        }
      })
    );
    const live = second.posted.find((m) => m.kind === 'start');
    if (live?.kind !== 'start') throw new Error('no start');
    // The first process is gone, but a message it sent late names the live
    // generation. It is not that door, so it is not answered.
    first.say({
      kind: 'request',
      id: 1,
      generation: live.generation,
      request: {
        route: 'blocked',
        method: 'GET',
        target: '/v1/blocked',
        headers: { 'x-tortie-phone': 'p', 'x-tortie-timestamp': '1', 'x-tortie-nonce': '0123456789abcdef', 'x-tortie-signature': 's' },
        body: new Uint8Array(0),
        channel: 'p'
      }
    });
    await turn();
    expect(handled).toBe(0);
  });

  it('hands a handler nothing forwarded after its door began to stop', async () => {
    const child = fakeChild({ ignoreStop: true });
    let handled = 0;
    await startPocketDoor(
      startInput({
        spawn: child.spawn,
        handle: async () => {
          handled += 1;
          return { status: 200, body: '1' };
        }
      })
    );
    const start = child.posted.find((m) => m.kind === 'start');
    if (start?.kind !== 'start') throw new Error('no start');
    const stopping = stopPocketDoor();
    child.say({
      kind: 'request',
      id: 4,
      generation: start.generation,
      request: {
        route: 'blocked',
        method: 'GET',
        target: '/v1/blocked',
        headers: { 'x-tortie-phone': 'p', 'x-tortie-timestamp': '1', 'x-tortie-nonce': '0123456789abcdef', 'x-tortie-signature': 's' },
        body: new Uint8Array(0),
        channel: 'p'
      }
    });
    await turn();
    expect(handled).toBe(0);
    expect(child.posted.filter((m) => m.kind === 'answer')).toEqual([{ kind: 'answer', id: 4, status: 404, body: null }]);
    await stopping;
  }, 10_000);

  it('answers 404 for a request composed while its own door began to stop, and asks the instance', async () => {
    const child = fakeChild();
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const seen: boolean[] = [];
    const started = await startPocketDoor(
      startInput({
        spawn: child.spawn,
        handle: async (_request, door) => {
          seen.push(door.stopping());
          await held;
          seen.push(door.stopping());
          return { status: 200, body: '"late"' };
        }
      })
    );
    if (!started.ok) throw new Error('did not open');
    const start = child.posted.find((m) => m.kind === 'start');
    if (start?.kind !== 'start') throw new Error('no start');
    child.say({
      kind: 'request',
      id: 9,
      generation: start.generation,
      request: {
        route: 'session',
        method: 'GET',
        target: '/v1/session?id=a',
        headers: {
          'x-tortie-phone': 'p',
          'x-tortie-timestamp': '1',
          'x-tortie-nonce': '0123456789abcdef',
          'x-tortie-signature': 's'
        },
        body: new Uint8Array(0),
        channel: 'p'
      }
    });
    await turn();
    // The module drops its door on the stop's first line; the instance the
    // handler holds is the one that still knows.
    const stopping = stopPocketDoor();
    expect(pocketDoorStatus().listening).toBe(false);
    expect(child.posted.at(-1)?.kind).toBe('stop');
    expect(child.posted.some((m) => m.kind === 'shutdown')).toBe(true);
    release();
    const report = await stopping;
    expect(seen).toEqual([false, true]);
    expect(report).toMatchObject({ accepted: 1, joined: true });
    expect(child.posted.filter((m) => m.kind === 'answer')).toEqual([{ kind: 'answer', id: 9, status: 404, body: null }]);
  });

  it('closes admission on the FIRST line of the quit, synchronously, and tells the process', async () => {
    const child = fakeChild();
    await startPocketDoor(startInput({ spawn: child.spawn }));
    expect(pocketDoorShuttingDown()).toBe(false);
    beginPocketShutdown();
    expect(pocketShutdownStarted()).toBe(true);
    expect(pocketDoorShuttingDown()).toBe(true);
    expect(child.posted.at(-1)).toEqual({ kind: 'shutdown' });
  });

  it('kills a process that never says it stopped, two seconds after stop', async () => {
    const child = fakeChild({ ignoreStop: true });
    await startPocketDoor(startInput({ spawn: child.spawn }));
    const started = Date.now();
    await stopPocketDoor();
    const waited = Date.now() - started;
    expect(child.killed()).toBe(1);
    expect(waited).toBeGreaterThanOrEqual(DOOR_STOP_KILL_MS - 100);
    expect(waited).toBeLessThan(DOOR_STOP_KILL_MS + 1_500);
  }, 10_000);

  it('joins a request a real door had accepted, then goes', async () => {
    const phone = makePhone('phone-a');
    let release = (): void => undefined;
    const slow = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = await startPocketDoor(
      startInput({
        pins: [{ phoneId: phone.id, spkiSha256: phone.pin }],
        handle: async () => {
          await slow;
          return { status: 200, body: '"late"' };
        }
      })
    );
    if (!started.ok) throw new Error('did not open');
    const inFlight = read(started.localPort, phone);
    await new Promise((resolve) => setTimeout(resolve, 150));
    const stopping = stopPocketDoor();
    release();
    const report = await stopping;
    const answer = await inFlight;
    expect(report.accepted).toBe(1);
    expect(report.joined).toBe(true);
    // Composed while its door stopped: refused, never answered.
    expect(answer.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// The pins, and a death nobody asked for
// ---------------------------------------------------------------------------

describe('what main tells a running door', () => {
  it('a pins update cuts the removed phone and keeps the other', async () => {
    const a = makePhone('phone-a');
    const b = makePhone('phone-b');
    const started = await startPocketDoor(
      startInput({
        pins: [
          { phoneId: a.id, spkiSha256: a.pin },
          { phoneId: b.id, spkiSha256: b.pin }
        ]
      })
    );
    if (!started.ok) throw new Error('did not open');
    expect((await read(started.localPort, a)).status).toBe(200);
    updatePocketDoor({ pins: [{ phoneId: b.id, spkiSha256: b.pin }] });
    await turn();
    expect((await read(started.localPort, a)).status).toBe(0);
    expect((await read(started.localPort, b)).status).toBe(200);
    // One line per word per process, a word and never a value.
    expect(logged.filter((l) => l === 'warn refused a connection at the door: unknown-key')).toHaveLength(1);
    await read(started.localPort, a);
    expect(logged.filter((l) => l.includes('unknown-key'))).toHaveLength(1);
  });

  it('writes one line per word per PROCESS OF MAIN, however many door processes say it', async () => {
    const stranger = makePhone('nobody');
    for (let i = 0; i < 2; i += 1) {
      const started = await startPocketDoor(startInput());
      if (!started.ok) throw new Error('did not open');
      // Each door process posts the word once; main writes it once in all.
      expect((await read(started.localPort, stranger)).status).toBe(0);
      await turn();
      await stopPocketDoor();
    }
    expect(logged.filter((l) => l === 'warn refused a connection at the door: unknown-key')).toHaveLength(1);
  });

  it('says so when the process dies unasked, and draws the door off', async () => {
    const child = fakeChild();
    let told = 0;
    onPocketDoorExit(() => {
      told += 1;
    });
    await startPocketDoor(startInput({ spawn: child.spawn }));
    expect(pocketDoorStatus().listening).toBe(true);
    child.exit();
    await turn();
    expect(told).toBe(1);
    expect(pocketDoorStatus()).toMatchObject({
      listening: false,
      lastRefusal: 'door-exited',
      sentence: DOOR_SENTENCES['door-exited']
    });
    expect(pocketTlsMaterial()).toBeNull();
  });

  it('does not call a stop a death', async () => {
    const child = fakeChild();
    let told = 0;
    onPocketDoorExit(() => {
      told += 1;
    });
    await startPocketDoor(startInput({ spawn: child.spawn }));
    await stopPocketDoor();
    await turn();
    expect(told).toBe(0);
    expect(pocketDoorStatus().lastRefusal).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// A write's answer (Phase 317, build/p317/SPEC.md §5.3.4, §14 finding 9)
// ---------------------------------------------------------------------------

describe('a write’s answer', () => {
  const WRITE_HEADERS = {
    'x-tortie-phone': 'p',
    'x-tortie-timestamp': '1',
    'x-tortie-nonce': '0123456789abcdef',
    'x-tortie-signature': 's'
  };
  const writeRequest = {
    route: 'end',
    method: 'POST',
    target: '/v1/end',
    headers: WRITE_HEADERS,
    body: new Uint8Array(Buffer.from('{"batch":false,"session":"s1","write":"' + '0'.repeat(32) + '"}')),
    channel: 'p'
  };

  async function opened(handle: DoorRequestHandler, child = fakeChild()): Promise<{ child: ReturnType<typeof fakeChild>; generation: number }> {
    const started = await startPocketDoor(startInput({ spawn: child.spawn, handle }));
    if (!started.ok) throw new Error('did not open');
    const start = child.posted.find((m) => m.kind === 'start');
    if (start?.kind !== 'start') throw new Error('no start');
    return { child, generation: start.generation };
  }

  it('hands the handler a write the wire let through, as the POST it is', async () => {
    const seen: string[] = [];
    const { child, generation } = await opened(async (request) => {
      seen.push(request.route === 'pair' ? 'pair' : `${request.method} ${request.target}`);
      return { status: 200, body: '"ok"', acted: true };
    });
    child.say({ kind: 'request', id: 1, generation, request: writeRequest });
    await turn();
    expect(seen).toEqual(['POST /v1/end']);
    expect(child.posted.filter((m) => m.kind === 'answer')).toEqual([{ kind: 'answer', id: 1, status: 200, body: '"ok"' }]);
  });

  it('never replaces an ACTED answer composed while its door began to stop, and still replaces one that is not', async () => {
    let release = (): void => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { child, generation } = await opened(async (request) => {
      await held;
      return request.route !== 'pair' && request.target === '/v1/end'
        ? { status: 200, body: '"acted"', acted: true }
        : { status: 200, body: '"read"' };
    });
    child.say({ kind: 'request', id: 1, generation, request: writeRequest });
    child.say({ kind: 'request', id: 2, generation, request: { ...writeRequest, route: 'blocked', method: 'GET', target: '/v1/blocked', body: new Uint8Array(0) } });
    await turn();
    const stopping = stopPocketDoor();
    release();
    await stopping;
    const answers = child.posted.filter((m) => m.kind === 'answer');
    expect(answers).toContainEqual({ kind: 'answer', id: 1, status: 200, body: '"acted"' });
    expect(answers).toContainEqual({ kind: 'answer', id: 2, status: 404, body: null });
  });

  it('posts nothing in place of an acted answer that fails the wire’s bound, and a 404 in place of one that is not acted', async () => {
    const huge = `"${'x'.repeat(2 * 1024 * 1024 + 8)}"`;
    const { child, generation } = await opened(async (request) =>
      request.route !== 'pair' && request.target === '/v1/end'
        ? { status: 200, body: huge, acted: true }
        : { status: 200, body: huge }
    );
    child.say({ kind: 'request', id: 1, generation, request: writeRequest });
    child.say({ kind: 'request', id: 2, generation, request: { ...writeRequest, route: 'blocked', method: 'GET', target: '/v1/blocked', body: new Uint8Array(0) } });
    await turn();
    expect(child.posted.filter((m) => m.kind === 'answer')).toEqual([{ kind: 'answer', id: 2, status: 404, body: null }]);
  });
});

// ---------------------------------------------------------------------------
// The rules read as text, because they are one line away from gone
// ---------------------------------------------------------------------------

describe('the source of the module', () => {
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'bind.ts'), 'utf8');
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n');

  it('binds nothing: the one listen is the door process’s', () => {
    expect(code).not.toMatch(/\.listen\(/);
    expect(code).not.toContain('0.0.0.0');
    expect(code).not.toContain('networkInterfaces');
  });

  // NOT `env: {}`: Electron 43 reads an empty object as "not set" and hands the
  // door main's whole environment (measured by the Phase 330 verifier with
  // `ps -E`). One named variable replaces it.
  it('forks the one door process with an environment of one variable, no stdio and its own name', () => {
    expect(code.match(/utilityProcess\.fork\(/g) ?? []).toHaveLength(1);
    expect(code).toMatch(/utilityProcess\.fork\(join\(__dirname, 'pocket-door\.js'\), \[\], \{\s*env: \{ TORTIE_DOOR: '1' \},\s*stdio: 'ignore',\s*serviceName: DOOR_SERVICE_NAME\s*\}\)/);
    expect(code).not.toContain('allowLoadingUnsignedLibraries');
  });

  it('runs no program and names no tailnet', () => {
    expect(code).not.toContain('execFile');
    expect(code).not.toMatch(/\bspawn\(/);
    expect(code).not.toContain('tailscale');
    expect(code).not.toMatch(/isSelfOrigin|HARNESS_LOOPBACK|tailnetCandidates|pocketBindAddress/);
  });
});
