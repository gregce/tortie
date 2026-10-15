/**
 * THE SERVED SET (Phase 333.12, build/p33312/SPEC.md §5.6 to §5.8, §9.2 rows
 * S1 to S8): the routes a person allowed that this build has, handed to the
 * door process and asked by main, driven rather than read.
 *
 * A route this build has that nobody allowed yet WAITS, and a waiting route is
 * refused `route`, the same 404 an older Mac gives a route it does not have.
 * What this file proves, each against the shipping code:
 *
 *  - S1, the wire: a start without a valid served set is dropped WHOLE (so the
 *    door never says `listening` rather than answering every route), an update
 *    with an invalid one is dropped whole with everything else it carried, and
 *    a good one round-trips.
 *  - S2, S3, S8, the door process over REAL loopback mutual TLS, started by the
 *    shipping `startPocketDoor` behind `inProcessDoor()`: a read and a write
 *    outside the served set are refused `route` BEFORE THE BODY (a body over
 *    the route's cap still reads `route`, never `oversized`) and forwarded
 *    nowhere; the start message carried the set; one `updatePocketDoor({ routes
 *    })` posts one `update`, after which the same requests are forwarded, and
 *    a live socket is not cut by the change, only asked again.
 *  - S4, S5, main's handler: a route not served is refused before the pairing
 *    arm and before `verify` (no nonce spent, nothing presented), and again in
 *    refusal 7 when it stops being served while the answer was composed.
 *  - S6, S7, the write path: the fourth ask of the last check refuses 404 with
 *    no verb called and no ledger entry kept, and `still` sees the route stop
 *    being served after the claim.
 *
 * It binds only the listener's own `listen(0, '127.0.0.1')`, through the
 * in-process door. Every door is joined, and every socket destroyed, in
 * `afterEach`. Nothing here forks a process, touches Electron or reads a file
 * outside its scratch directory.
 */

import { createHash, generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { connect as netConnect, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connect as tlsConnect, type TLSSocket } from 'node:tls';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { POCKET_ROUTE_IDS, POCKET_WRITE_SENTENCES, type PocketRouteId } from '@shared/ipc/pocket';

/** Every line the log wrote, as `level message`. */
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

const { joinPocketDoor, resetPocketDoorForTests, startPocketDoor, updatePocketDoor } = await import('../bind');
const { inProcessDoor } = await import('../door/in-process');
const { createDoorListener } = await import('../door/listener');
const { POCKET_ROUTES } = await import('../door/table');
const { toDoorOf } = await import('../door/wire');
const { createPocketHandler } = await import('../server');
const { createPocketWriteHandler } = await import('../writes');
const { POCKET_TLS_SEAL_PREFIX, ensureDoorIdentity, issueClientCertificate } = await import('../tls');
type DoorAdmission = import('../bind').DoorAdmission;
type DoorRequestHandler = import('../bind').DoorRequestHandler;
type DoorChild = import('../door/wire').DoorChild;
type DoorRequest = import('../door/wire').DoorRequest;
type DoorSpawner = import('../door/wire').DoorSpawner;
type DoorListenerStats = import('../door/listener').DoorListenerStats;
type FromDoor = import('../door/wire').FromDoor;
type ToDoor = import('../door/wire').ToDoor;
type PocketHandlerDeps = import('../server').PocketHandlerDeps;
type PocketWriteDeps = import('../writes').PocketWriteDeps;
type PocketStillAllowed = import('../routes').PocketStillAllowed;
type PocketReplyOutcome = import('../routes').PocketReplyOutcome;
type IdentitySealPort = import('../tls').IdentitySealPort;

const NAME = 'mac.tail00000.ts.net';
const PUBLIC_PORT = 8443;
const HOST = `${NAME}:${String(PUBLIC_PORT)}`;
const PIN = 'A'.repeat(43);

/** Every route of this build but `sessions` and `say`: one read and one write wait. */
const WAITING: readonly PocketRouteId[] = ['sessions', 'say'];
const SERVED_LESS: readonly PocketRouteId[] = POCKET_ROUTE_IDS.filter((id) => !WAITING.includes(id));

// ---------------------------------------------------------------------------
// Plumbing
// ---------------------------------------------------------------------------

let dir = '';
const sockets: (Socket | TLSSocket)[] = [];

const seal: IdentitySealPort = {
  available: () => true,
  seal: (text) => Buffer.from(`${POCKET_TLS_SEAL_PREFIX}${text}`).toString('base64'),
  open: (blob) => {
    if (typeof blob !== 'string' || blob.length === 0) return '';
    const text = Buffer.from(blob, 'base64').toString('utf8');
    return text.startsWith(POCKET_TLS_SEAL_PREFIX) ? text.slice(POCKET_TLS_SEAL_PREFIX.length) : '';
  }
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'p33312-served-'));
  resetPocketDoorForTests();
  logged.length = 0;
});

afterEach(async () => {
  for (const s of sockets.splice(0)) s.destroy();
  await joinPocketDoor();
  resetPocketDoorForTests();
  rmSync(dir, { recursive: true, force: true });
});

function identity(): { keyPem: string; certPem: string } {
  const made = ensureDoorIdentity({ path: join(dir, 'pocket-identity.json'), seal, names: { addresses: [], dnsNames: [NAME] } });
  if (made.kind !== 'ready') throw new Error('no identity');
  return made.identity;
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
  const der = issueClientCertificate(identity().keyPem, spki.toString('base64url'), Date.now());
  const b64 = der.toString('base64').replace(/.{1,64}/g, '$&\n');
  return {
    id,
    key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    cert: `-----BEGIN CERTIFICATE-----\n${b64}-----END CERTIFICATE-----\n`,
    pin: createHash('sha256').update(spki).digest('base64url')
  };
}

/** A PROXY v2 TCP4 header, spelled here, as Funnel's forwarder sends one. */
function proxyHeader(): Buffer {
  const header = Buffer.alloc(28);
  Buffer.from('0d0a0d0a000d0a515549540a', 'hex').copy(header, 0);
  header.writeUInt8(0x21, 12);
  header.writeUInt8(0x11, 13);
  header.writeUInt16BE(12, 14);
  [203, 0, 113, 7, 127, 0, 0, 1].forEach((b, i) => header.writeUInt8(b, 16 + i));
  return header;
}

interface Answer {
  readonly status: number;
  readonly body: string;
}

/** One phone connection: PROXY v2, then TLS 1.3 with its client certificate. */
interface Connection {
  /** Send one request and wait for ONE whole answer on this connection, or null when it closed first. */
  ask(request: string): Promise<Answer | null>;
  isClosed(): boolean;
}

async function dial(port: number, phone: Phone): Promise<Connection> {
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
  let buffer = Buffer.alloc(0);
  let closed = false;
  let wake: (() => void) | null = null;
  const poke = (): void => {
    const w = wake;
    wake = null;
    w?.();
  };
  tls.on('data', (d: Buffer) => {
    buffer = Buffer.concat([buffer, d]);
    poke();
  });
  const gone = (): void => {
    closed = true;
    poke();
  };
  tls.once('close', gone);
  raw.once('close', gone);
  await new Promise<void>((resolve) => {
    tls.once('secureConnect', () => resolve());
    tls.once('close', () => resolve());
    setTimeout(resolve, 3_000);
  });
  /** One whole answer off the front of the buffer, by its Content-Length. */
  const take = (): Answer | null => {
    const text = buffer.toString('latin1');
    const end = text.indexOf('\r\n\r\n');
    if (end === -1) return null;
    const head = text.slice(0, end);
    const length = Number(/\r\ncontent-length:\s*(\d+)/i.exec(head)?.[1] ?? 0);
    if (buffer.length < end + 4 + length) return null;
    const status = Number(/^HTTP\/1\.1 (\d{3})/.exec(head)?.[1] ?? 0);
    const body = buffer.subarray(end + 4, end + 4 + length).toString('utf8');
    buffer = buffer.subarray(end + 4 + length);
    return { status, body };
  };
  return {
    async ask(request: string): Promise<Answer | null> {
      if (!closed) tls.write(request);
      const deadline = Date.now() + 3_000;
      for (;;) {
        const answer = take();
        if (answer !== null) return answer;
        if (closed || Date.now() > deadline) return null;
        await new Promise<void>((resolve) => {
          wake = resolve;
          setTimeout(resolve, 50);
        });
      }
    },
    isClosed: () => closed
  };
}

const SIGNATURE_HEADERS =
  'x-tortie-phone: phone-a\r\nx-tortie-timestamp: 1\r\nx-tortie-nonce: 0123456789abcdef\r\nx-tortie-signature: s\r\n';

/** A signed GET, its body (when any) carried with its Content-Length. */
function get(target: string, body = '', connection: 'close' | 'keep-alive' = 'close'): string {
  const length = body.length > 0 ? `Content-Length: ${String(Buffer.byteLength(body))}\r\n` : '';
  return `GET ${target} HTTP/1.1\r\nHost: ${HOST}\r\n${SIGNATURE_HEADERS}${length}Connection: ${connection}\r\n\r\n${body}`;
}

/** A signed POST. */
function post(target: string, body: string): string {
  return `POST ${target} HTTP/1.1\r\nHost: ${HOST}\r\n${SIGNATURE_HEADERS}Content-Type: application/json\r\nContent-Length: ${String(Buffer.byteLength(body))}\r\nConnection: close\r\n\r\n${body}`;
}

async function until(ready: () => boolean, ms = 3_000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!ready()) {
    if (Date.now() > deadline) throw new Error('timed out waiting');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

/**
 * The shipping in-process door, with every message main posts to it recorded
 * on the way through, so S8 reads what crossed rather than what was meant to.
 */
function recordingDoor(): { spawn: DoorSpawner; posted: ToDoor[]; stats: () => DoorListenerStats } {
  const spawner = inProcessDoor();
  const posted: ToDoor[] = [];
  const spawn: DoorSpawner = (): DoorChild => {
    const child = spawner();
    return {
      get pid() {
        return child.pid;
      },
      post: (message) => {
        posted.push(structuredClone(message));
        child.post(message);
      },
      onMessage: (listener) => child.onMessage(listener),
      onExit: (listener) => child.onExit(listener),
      kill: () => child.kill()
    };
  };
  const stats = (): DoorListenerStats => {
    const listener = spawner.doors[0];
    if (listener === undefined) throw new Error('no door was spawned');
    return listener.stats();
  };
  return { spawn, posted, stats };
}

/** Main's side of a door started by the shipping `startPocketDoor`, recording what reached it. */
async function openDoor(routes: readonly PocketRouteId[], phone: Phone): Promise<{
  port: number;
  handled: DoorRequest[];
  door: ReturnType<typeof recordingDoor>;
}> {
  const door = recordingDoor();
  const handled: DoorRequest[] = [];
  const handle: DoorRequestHandler = async (request) => {
    handled.push(request);
    return { status: 200, body: '"answered"' };
  };
  const result = await startPocketDoor({
    handle,
    publicHost: { name: NAME, port: PUBLIC_PORT },
    pins: [{ phoneId: phone.id, spkiSha256: phone.pin }],
    windowOpen: false,
    routes,
    identity: (options) => ensureDoorIdentity({ ...options, seal }),
    identityPath: join(dir, 'pocket-identity.json'),
    spawn: door.spawn
  });
  if (!result.ok) throw new Error(`the door did not open: ${result.reason}`);
  return { port: result.localPort, handled, door };
}

/** The routes an update carried to the door, in the order they were posted. */
function updatesOf(posted: readonly ToDoor[]): (readonly PocketRouteId[] | undefined)[] {
  return posted.flatMap((m) => (m.kind === 'update' ? [m.routes] : []));
}

// ---------------------------------------------------------------------------
// S1: the wire
// ---------------------------------------------------------------------------

describe('S1: the served set on the wire', () => {
  const start = {
    kind: 'start',
    generation: 3,
    tls: { key: 'k', cert: 'c' },
    pins: [{ phoneId: 'phone-a', spkiSha256: PIN }],
    host: { name: NAME, port: PUBLIC_PORT },
    windowOpen: false,
    routes: [...SERVED_LESS]
  };

  it('round-trips a start that carries a valid served set, and an update that carries one', () => {
    expect(toDoorOf(start)).toEqual(start);
    expect(toDoorOf({ ...start, routes: [...POCKET_ROUTE_IDS] })).toEqual({ ...start, routes: [...POCKET_ROUTE_IDS] });
    // An empty set is a door that serves nothing, which is narrower, never wider.
    expect(toDoorOf({ ...start, routes: [] })).toEqual({ ...start, routes: [] });
    expect(toDoorOf({ kind: 'update', routes: ['blocked'] })).toEqual({ kind: 'update', routes: ['blocked'] });
    expect(toDoorOf({ kind: 'update', pins: [], windowOpen: true, routes: [...POCKET_ROUTE_IDS] })).toEqual({
      kind: 'update',
      pins: [],
      windowOpen: true,
      routes: [...POCKET_ROUTE_IDS]
    });
    // An update that carries no set leaves it out, so the door keeps the one it holds.
    expect(toDoorOf({ kind: 'update', pins: [] })).toEqual({ kind: 'update', pins: [] });
  });

  it('drops a start WHOLE when its served set is missing, not an array, unknown, doubled, not a string, or longer than the table', () => {
    const { routes: _routes, ...without } = start;
    void _routes;
    const bad: unknown[] = [
      undefined,
      null,
      'blocked',
      { 0: 'blocked' },
      ['blocked', 'probe'],
      ['blocked', 'BLOCKED'],
      ['/v1/blocked'],
      ['blocked', 'blocked'],
      ['blocked', 7],
      [...POCKET_ROUTE_IDS, 'blocked'],
      [...POCKET_ROUTE_IDS, 'probe'],
      Array.from({ length: POCKET_ROUTES.length + 1 }, () => 'blocked')
    ];
    expect(toDoorOf(without)).toBeNull();
    for (const routes of bad) {
      expect(toDoorOf(routes === undefined ? without : { ...start, routes }), JSON.stringify(routes)).toBeNull();
    }
  });

  it('drops an update WHOLE when it carries a served set that does not validate, pins and window with it', () => {
    for (const routes of [null, 'all', ['nope'], ['say', 'say'], [1], [...POCKET_ROUTE_IDS, 'blocked']]) {
      expect(toDoorOf({ kind: 'update', routes }), JSON.stringify(routes)).toBeNull();
      expect(toDoorOf({ kind: 'update', pins: [{ phoneId: 'a', spkiSha256: PIN }], windowOpen: true, routes })).toBeNull();
    }
  });

  it('keeps the ids it was sent, and nothing else on the message', () => {
    const got = toDoorOf({ ...start, extra: 'x', routes: ['blocked', 'end'] });
    expect(got).toEqual({ ...start, routes: ['blocked', 'end'] });
    expect(Object.keys(got ?? {}).sort()).toEqual(['generation', 'host', 'kind', 'pins', 'routes', 'tls', 'windowOpen']);
  });

  it('a door process handed a start with no served set never says it is listening', async () => {
    const messages: FromDoor[] = [];
    const { keyPem, certPem } = identity();
    const listener = createDoorListener((m) => messages.push(m));
    try {
      listener.receive({
        kind: 'start',
        generation: 4,
        tls: { key: keyPem, cert: certPem },
        pins: [],
        host: { name: NAME, port: PUBLIC_PORT },
        windowOpen: false
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(listener.stats().droppedMessages).toBe(1);
      expect(messages.some((m) => m.kind === 'listening')).toBe(false);
    } finally {
      listener.kill();
    }
  });
});

// ---------------------------------------------------------------------------
// S2, S3, S8: the door process, over real mutual TLS
// ---------------------------------------------------------------------------

describe('S8: main hands the door process the served set', () => {
  it('posts it in the start, and one update per updatePocketDoor({ routes })', async () => {
    const phone = makePhone('phone-a');
    const { door } = await openDoor(SERVED_LESS, phone);
    const starts = door.posted.filter((m) => m.kind === 'start');
    expect(starts).toHaveLength(1);
    expect(starts[0]?.kind === 'start' ? starts[0].routes : null).toEqual(SERVED_LESS);
    updatePocketDoor({ routes: POCKET_ROUTE_IDS });
    expect(updatesOf(door.posted)).toEqual([POCKET_ROUTE_IDS]);
    const update = door.posted.at(-1);
    expect(update).toEqual({ kind: 'update', routes: [...POCKET_ROUTE_IDS] });
    // An update that names no routes carries none, so the door keeps its set.
    updatePocketDoor({ windowOpen: true });
    expect(door.posted.at(-1)).toEqual({ kind: 'update', windowOpen: true });
    expect(door.stats().droppedMessages).toBe(0);
  });
});

describe('S2: a read the person has not allowed', () => {
  it('is refused `route` before its body, forwarded nowhere, and answered once the set allows it', async () => {
    const phone = makePhone('phone-a');
    const { port, handled, door } = await openDoor(SERVED_LESS, phone);

    const plain = await (await dial(port, phone)).ask(get('/v1/sessions?show=all'));
    expect(plain?.status).toBe(404);
    expect(plain?.body).toBe('');
    // A 16 KiB body, sixteen times the signed read's cap: the refusal comes
    // before the body is read, so it is `route` and never `oversized`.
    const heavy = await (await dial(port, phone)).ask(get('/v1/sessions?show=all', 'x'.repeat(16 * 1024)));
    expect(heavy?.status).not.toBe(200);
    await until(() => door.stats().refused.route === 2);
    expect(door.stats().refused.oversized).toBe(0);
    expect(door.stats().forwarded).toBe(0);
    expect(handled).toEqual([]);

    // A served read on the same door is forwarded as before.
    expect((await (await dial(port, phone)).ask(get('/v1/blocked')))?.status).toBe(200);
    expect(handled.map((r) => r.route)).toEqual(['blocked']);

    // Allowed now: the full set, posted by update, and the same read is forwarded.
    updatePocketDoor({ routes: POCKET_ROUTE_IDS });
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    const after = await (await dial(port, phone)).ask(get('/v1/sessions?show=all'));
    expect(after).toEqual({ status: 200, body: '"answered"' });
    expect(handled.map((r) => r.route)).toEqual(['blocked', 'sessions']);
    expect(door.stats().refused.route).toBe(2);
  });

  it('a change of set cuts no socket: a live connection is asked again on its next request', async () => {
    const phone = makePhone('phone-a');
    const { port, handled, door } = await openDoor(POCKET_ROUTE_IDS, phone);
    const live = await dial(port, phone);
    expect(await live.ask(get('/v1/sessions', '', 'keep-alive'))).toEqual({ status: 200, body: '"answered"' });
    updatePocketDoor({ routes: SERVED_LESS });
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    expect(live.isClosed()).toBe(false);
    expect(await live.ask(get('/v1/sessions', '', 'keep-alive'))).toEqual({ status: 404, body: '' });
    expect(await live.ask(get('/v1/blocked', '', 'keep-alive'))).toEqual({ status: 200, body: '"answered"' });
    expect(handled.map((r) => r.route)).toEqual(['sessions', 'blocked']);
    expect(door.stats().refused.route).toBe(1);
  });
});

describe('S3: a write the person has not allowed', () => {
  const SAY_BODY = JSON.stringify({ session: 's1', text: 'hello', write: 'a'.repeat(32) });

  it('is refused `route` before its body, forwarded nowhere, and forwarded once the set allows it', async () => {
    const phone = makePhone('phone-a');
    const { port, handled, door } = await openDoor(SERVED_LESS, phone);

    expect((await (await dial(port, phone)).ask(post('/v1/say', SAY_BODY)))?.status).toBe(404);
    // One byte over say's own cap (32,768): still `route`, never `oversized`.
    const over = await (await dial(port, phone)).ask(post('/v1/say', 'x'.repeat(32 * 1024 + 1)));
    expect(over?.status).not.toBe(200);
    await until(() => door.stats().refused.route === 2);
    expect(door.stats().refused.oversized).toBe(0);
    expect(door.stats().forwarded).toBe(0);
    expect(handled).toEqual([]);

    updatePocketDoor({ routes: POCKET_ROUTE_IDS });
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
    expect(await (await dial(port, phone)).ask(post('/v1/say', SAY_BODY))).toEqual({ status: 200, body: '"answered"' });
    expect(handled.map((r) => r.route)).toEqual(['say']);
    const forwarded = handled[0];
    if (forwarded === undefined || forwarded.route !== 'say') throw new Error('no say forwarded');
    expect(Buffer.from(forwarded.body).toString('utf8')).toBe(SAY_BODY);
  });
});

// ---------------------------------------------------------------------------
// S4, S5: main's handler
// ---------------------------------------------------------------------------

const HEADERS = {
  'x-tortie-phone': 'phone-a',
  'x-tortie-timestamp': '1790000000000',
  'x-tortie-nonce': '0123456789abcdef',
  'x-tortie-signature': 's'.repeat(86)
};
const PRESENTATION = { iv: 'A'.repeat(16), ct: 'B'.repeat(40), tag: 'C'.repeat(22), ek: 'D'.repeat(59), sig: 'E'.repeat(86) };
const OPEN: DoorAdmission = { stopping: () => false };

function signedRead(route: 'blocked' | 'sessions', target: string): DoorRequest {
  return { route, method: 'GET', target, headers: HEADERS, body: new Uint8Array(0), channel: 'phone-a' };
}

function signedWrite(route: 'end' | 'say', body: string): DoorRequest {
  return { route, method: 'POST', target: `/v1/${route}`, headers: HEADERS, body: new Uint8Array(Buffer.from(body)), channel: 'phone-a' };
}

/** A handler whose every dep records that it was asked, served by `served`. */
function recordingHandler(served: (id: PocketRouteId) => boolean, over: Partial<PocketHandlerDeps> = {}) {
  const asked: string[] = [];
  const deps: PocketHandlerDeps = {
    shuttingDown: () => false,
    pairingWindowOpen: () => {
      asked.push('window');
      return true;
    },
    present: () => {
      asked.push('present');
      return { state: 'pending' };
    },
    verify: () => {
      asked.push('verify');
      return { ok: true, phoneId: 'phone-a' };
    },
    stillPaired: () => {
      asked.push('stillPaired');
      return true;
    },
    routeServed: (id) => {
      asked.push(`routeServed:${id}`);
      return served(id);
    },
    answer: async () => {
      asked.push('answer');
      return { rows: [] };
    },
    write: async () => {
      asked.push('write');
      return { status: 200, body: '"acted"', acted: true };
    },
    ...over
  };
  return { handle: createPocketHandler(deps), asked };
}

const refusedWords = (): string[] => logged.filter((l) => l.startsWith('warn refused a request at the door: '));

describe('S4: main refuses a route not served before anything of the request is read', () => {
  it('a read: refused `route`, verify never called, nothing answered', async () => {
    const { handle, asked } = recordingHandler((id) => id !== 'sessions');
    expect(await handle(signedRead('sessions', '/v1/sessions?show=all'), OPEN)).toEqual({ status: 404, body: null });
    expect(asked).toEqual(['routeServed:sessions']);
    expect(refusedWords()).toEqual(['warn refused a request at the door: route']);
    // The served read beside it is answered, asked about by its own id.
    expect(await handle(signedRead('blocked', '/v1/blocked'), OPEN)).toEqual({ status: 200, body: '{"rows":[]}' });
    expect(asked.slice(1)).toEqual(['routeServed:blocked', 'verify', 'answer', 'stillPaired', 'routeServed:blocked']);
  });

  it('a write: refused `route`, verify and the write path never called', async () => {
    const { handle, asked } = recordingHandler((id) => id !== 'say');
    expect(await handle(signedWrite('say', '{}'), OPEN)).toEqual({ status: 404, body: null });
    expect(asked).toEqual(['routeServed:say']);
    expect(await handle(signedWrite('end', '{}'), OPEN)).toEqual({ status: 200, body: '"acted"', acted: true });
    expect(asked.slice(1)).toEqual(['routeServed:end', 'verify', 'write']);
  });

  it('/pair: refused `route` before the window is asked and before the presentation reaches its owner', async () => {
    const { handle, asked } = recordingHandler((id) => id !== 'pair');
    expect(await handle({ route: 'pair', presentation: PRESENTATION }, OPEN)).toEqual({ status: 404, body: null });
    expect(asked).toEqual(['routeServed:pair']);
    expect(refusedWords()).toEqual(['warn refused a request at the door: route']);
  });

  it('asks after refusal 1: a quit refuses `shutdown` and asks no route', async () => {
    const { handle, asked } = recordingHandler(() => false, { shuttingDown: () => true });
    expect(await handle(signedRead('blocked', '/v1/blocked'), OPEN)).toEqual({ status: 404, body: null });
    expect(asked).toEqual([]);
    expect(refusedWords()).toEqual(['warn refused a request at the door: shutdown']);
  });
});

describe('S5: refusal 7 asks the route again before a read’s answer leaves', () => {
  it('a route that stops being served while the answer is composed sends nothing', async () => {
    let served = true;
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { handle, asked } = recordingHandler(() => served, {
      answer: async () => {
        asked.push('answer');
        await held;
        return { rows: ['a line nobody allowed'] };
      }
    });
    const inFlight = handle(signedRead('sessions', '/v1/sessions?show=all'), OPEN);
    await new Promise((resolve) => setImmediate(resolve));
    expect(asked).toEqual(['routeServed:sessions', 'verify', 'answer']);
    served = false;
    release();
    expect(await inFlight).toEqual({ status: 404, body: null });
    expect(asked).toEqual(['routeServed:sessions', 'verify', 'answer', 'stillPaired', 'routeServed:sessions']);
    expect(refusedWords()).toEqual(['warn refused a request at the door: route']);
  });

  it('a phone removed in the same window is refused for that, which is asked first', async () => {
    let paired = true;
    let served = true;
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { handle } = recordingHandler(() => served, {
      stillPaired: () => paired,
      answer: async () => {
        await held;
        return { rows: [] };
      }
    });
    const inFlight = handle(signedRead('blocked', '/v1/blocked'), OPEN);
    await new Promise((resolve) => setImmediate(resolve));
    paired = false;
    served = false;
    release();
    expect(await inFlight).toEqual({ status: 404, body: null });
    expect(refusedWords()).toEqual(['warn refused a request at the door: unpaired']);
  });
});

// ---------------------------------------------------------------------------
// S6, S7: the write path's fourth ask
// ---------------------------------------------------------------------------

const SAY = POCKET_ROUTES.find((r) => r.id === 'say');
if (SAY === undefined) throw new Error('no say row');

function sayBody(write: string): Buffer {
  return Buffer.from(JSON.stringify({ session: 's1', text: 'hello', write }), 'utf8');
}

describe('S6: the last check refuses a route that stopped being served, before the act', () => {
  it('404, no verb called, and no ledger entry kept: the same write id acts once it is served', async () => {
    const asked: string[] = [];
    let served = false;
    const says: string[] = [];
    const deps: PocketWriteDeps = {
      shuttingDown: () => false,
      stillPaired: () => true,
      routeServed: (id) => {
        asked.push(id);
        return served;
      },
      writes: {
        end: async () => ({ outcome: 'done' }),
        choose: async () => ({ outcome: 'done' }),
        say: async (input) => {
          says.push(input.text);
          return { outcome: 'done' };
        },
        keys: async () => ({ outcome: 'done' })
      }
    };
    const write = createPocketWriteHandler(deps);
    const id = 'b'.repeat(32);
    expect(await write(SAY, sayBody(id), 'phone-a', OPEN)).toEqual({ status: 404, body: null });
    expect(asked).toEqual(['say']);
    expect(says).toEqual([]);
    // Nothing was kept: neither a recorded answer nor a pending `busy`.
    served = true;
    const answer = await write(SAY, sayBody(id), 'phone-a', OPEN);
    expect(answer.status).toBe(200);
    expect(answer.acted).toBe(true);
    expect(JSON.parse(answer.body ?? '{}')).toEqual({ verb: 'say', write: id, outcome: 'done', reason: null, sentence: null });
    expect(says).toEqual(['hello']);
  });

  it('through main’s handler: served at the top, not at the last check, refused 404 for `route` and never acted', async () => {
    let asks = 0;
    const says: string[] = [];
    const routeServed = (): boolean => {
      asks += 1;
      // Yes at the handler's top, no at the write path's last check.
      return asks === 1;
    };
    const write = createPocketWriteHandler({
      shuttingDown: () => false,
      stillPaired: () => true,
      routeServed,
      writes: {
        end: async () => ({ outcome: 'done' }),
        choose: async () => ({ outcome: 'done' }),
        say: async (input) => {
          says.push(input.text);
          return { outcome: 'done' };
        },
        keys: async () => ({ outcome: 'done' })
      }
    });
    const handle = createPocketHandler({
      shuttingDown: () => false,
      pairingWindowOpen: () => false,
      present: () => ({ state: 'refused' }),
      verify: () => ({ ok: true, phoneId: 'phone-a' }),
      stillPaired: () => true,
      routeServed,
      answer: async () => null,
      write
    });
    expect(await handle(signedWrite('say', sayBody('c'.repeat(32)).toString('utf8')), OPEN)).toEqual({ status: 404, body: null });
    expect(asks).toBe(2);
    expect(says).toEqual([]);
    expect(refusedWords()).toEqual(['warn refused a request at the door: route']);
  });
});

describe('S7: `still` sees a route stop being served after the claim', () => {
  it('a verb that reads before it types finds `still` false and answers `refused` `stopped`, typing nothing', async () => {
    let served = true;
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let handed: PocketStillAllowed | null = null;
    const typed: string[] = [];
    const write = createPocketWriteHandler({
      shuttingDown: () => false,
      stillPaired: () => true,
      routeServed: () => served,
      writes: {
        end: async () => ({ outcome: 'done' }),
        choose: async () => ({ outcome: 'done' }),
        say: async (input, still): Promise<PocketReplyOutcome> => {
          handed = still;
          await held;
          if (!still()) return { outcome: 'refused', reason: 'stopped', sentence: POCKET_WRITE_SENTENCES.stopped };
          typed.push(input.text);
          return { outcome: 'done' };
        },
        keys: async () => ({ outcome: 'done' })
      }
    });
    const inFlight = write(SAY, sayBody('d'.repeat(32)), 'phone-a', OPEN);
    await new Promise((resolve) => setImmediate(resolve));
    expect(handed).not.toBeNull();
    expect((handed as PocketStillAllowed | null)?.()).toBe(true);
    served = false;
    expect((handed as PocketStillAllowed | null)?.()).toBe(false);
    release();
    const answer = await inFlight;
    expect(answer.status).toBe(200);
    expect(answer.acted).toBe(true);
    expect(JSON.parse(answer.body ?? '{}')).toEqual({
      verb: 'say',
      write: 'd'.repeat(32),
      outcome: 'refused',
      reason: 'stopped',
      sentence: POCKET_WRITE_SENTENCES.stopped
    });
    expect(typed).toEqual([]);
  });
});
