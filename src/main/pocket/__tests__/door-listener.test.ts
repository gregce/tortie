/**
 * The door process's listener, driven over REAL LOOPBACK TLS (Phase 330,
 * build/p330/SPEC.md §4.6 and §5.1 item 2).
 *
 * THIS FILE IS MAIN. It runs `createDoorListener` in this process exactly as
 * `../door-process.ts` runs it in the door process, sends it the messages main
 * sends, and answers the requests it forwards. The CLIENT is written here by
 * hand: its PROXY v2 encoder is a second spelling of the header on the
 * attacker's side, which is the point, and its client certificates are the
 * ones the Mac issues (`../tls.ts`'s `issueClientCertificate`), over keys this
 * file makes.
 *
 * EVERY REFUSAL BEFORE STEP 5 IS ALSO ASSERTED ON THE PARSER COUNTER. The
 * listener counts the sockets its `http.Server` was handed, on that server's
 * own `connection` event; a refusal that leaves the count unmoved is a refusal
 * none of whose bytes reached the HTTP parser.
 *
 * WHAT IT BINDS. The listener's one `listen(0, '127.0.0.1')`, and nothing
 * else. Every listener is stopped and killed in `afterEach`, and every client
 * socket is destroyed there too, whatever happened.
 */

import { createHash, generateKeyPairSync, type KeyObject } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { connect as netConnect, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Duplex } from 'node:stream';
import { connect as tlsConnect, type TLSSocket } from 'node:tls';
import { afterEach, beforeAll, afterAll, describe, expect, it } from 'vitest';

import { createDoorListener, type DoorListenerHandle } from '../door/listener';
import { PER_SOURCE_MAX } from '../door/limits';
import type { DoorPin, DoorRequest, FromDoor } from '../door/wire';
import {
  POCKET_TLS_SEAL_PREFIX,
  ensureDoorIdentity,
  issueClientCertificate,
  type IdentitySealPort
} from '../tls';

const NAME = 'mac.tail00000.ts.net';
const PUBLIC_PORT = 8443;
const HOST = `${NAME}:${String(PUBLIC_PORT)}`;

// ---------------------------------------------------------------------------
// The door's identity, and the phones', made here
// ---------------------------------------------------------------------------

let dir = '';
let doorKey = '';
let doorCert = '';

const seal: IdentitySealPort = {
  available: () => true,
  seal: (text) => Buffer.from(`${POCKET_TLS_SEAL_PREFIX}${text}`).toString('base64'),
  open: (blob) => {
    if (typeof blob !== 'string' || blob.length === 0) return '';
    const text = Buffer.from(blob, 'base64').toString('utf8');
    return text.startsWith(POCKET_TLS_SEAL_PREFIX) ? text.slice(POCKET_TLS_SEAL_PREFIX.length) : '';
  }
};

interface Phone {
  readonly id: string;
  readonly key: string;
  readonly cert: string;
  readonly pin: string;
}

function pem(der: Buffer, label: string): string {
  const b64 = der.toString('base64').replace(/.{1,64}/g, '$&\n');
  return `-----BEGIN ${label}-----\n${b64}-----END ${label}-----\n`;
}

/** A phone: a P-256 key, and the certificate the Mac issues over it. */
function makePhone(id: string): Phone {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const spki = publicKey.export({ type: 'spki', format: 'der' });
  const der = issueClientCertificate(doorKey, spki.toString('base64url'), Date.now());
  return {
    id,
    key: (privateKey as KeyObject).export({ type: 'pkcs8', format: 'pem' }).toString(),
    cert: pem(der, 'CERTIFICATE'),
    pin: createHash('sha256').update(spki).digest('base64url')
  };
}

let paired: Phone;
let other: Phone;
let stranger: Phone;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'p330-door-listener-'));
  const made = ensureDoorIdentity({
    path: join(dir, 'identity.json'),
    seal,
    names: { addresses: [], dnsNames: [NAME] }
  });
  if (made.kind !== 'ready') throw new Error(`no identity: ${made.reason}`);
  doorKey = made.identity.keyPem;
  doorCert = made.identity.certPem;
  paired = makePhone('phone-a');
  other = makePhone('phone-b');
  stranger = makePhone('nobody');
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Main, played by this file
// ---------------------------------------------------------------------------

interface Main {
  readonly door: DoorListenerHandle;
  readonly port: number;
  readonly messages: FromDoor[];
  readonly requests: DoorRequest[];
  words(): string[];
}

const doors: DoorListenerHandle[] = [];
const sockets: (Socket | TLSSocket | Duplex)[] = [];

afterEach(async () => {
  for (const s of sockets.splice(0)) s.destroy();
  for (const door of doors.splice(0)) {
    door.receive({ kind: 'stop' });
    await new Promise((resolve) => setTimeout(resolve, 20));
    door.kill();
  }
});

async function until(ready: () => boolean, ms = 3_000): Promise<void> {
  const deadline = Date.now() + ms;
  while (!ready()) {
    if (Date.now() > deadline) throw new Error('timed out waiting');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

/**
 * Start a listener as main starts one. `answer` is what main answers a
 * forwarded request; the default answers every read `{"ok":true}` and every
 * presentation `{"state":"pending"}`.
 */
async function startDoor(
  options: {
    pins?: DoorPin[];
    windowOpen?: boolean;
    answer?: (request: DoorRequest) => { status: 200 | 404; body: string | null } | null;
    timings?: Parameters<typeof createDoorListener>[1];
  } = {}
): Promise<Main> {
  const messages: FromDoor[] = [];
  const requests: DoorRequest[] = [];
  let door: DoorListenerHandle | null = null;
  door = createDoorListener((message) => {
    messages.push(message);
    if (message.kind === 'request') {
      requests.push(message.request);
      const answer =
        options.answer === undefined
          ? message.request.route === 'pair'
            ? { status: 200 as const, body: '{"state":"pending"}' }
            : { status: 200 as const, body: '{"ok":true}' }
          : options.answer(message.request);
      if (answer !== null) {
        setImmediate(() => door?.receive({ kind: 'answer', id: message.id, ...answer }));
      }
    }
  }, options.timings);
  doors.push(door);
  door.receive({
    kind: 'start',
    generation: 7,
    tls: { key: doorKey, cert: doorCert },
    pins: options.pins ?? [{ phoneId: paired.id, spkiSha256: paired.pin }],
    host: { name: NAME, port: PUBLIC_PORT },
    windowOpen: options.windowOpen ?? false
  });
  await until(() => messages.some((m) => m.kind === 'listening'));
  const listening = messages.find((m) => m.kind === 'listening');
  if (listening?.kind !== 'listening') throw new Error('did not listen');
  const d = door;
  return {
    door: d,
    port: listening.localPort,
    messages,
    requests,
    words: () => messages.flatMap((m) => (m.kind === 'refusal' ? [m.word] : []))
  };
}

// ---------------------------------------------------------------------------
// The client, written from the outside
// ---------------------------------------------------------------------------

/**
 * A PROXY v2 header, spelled by this file and not by `../door/proxy-v2.ts`: a
 * second encoder on the attacker's side, honest or forged as it likes.
 */
function proxyHeader(source = '203.0.113.7', over: { command?: number; family?: number; length?: number } = {}): Buffer {
  const signature = Buffer.from('0d0a0d0a000d0a515549540a', 'hex');
  const addresses = Buffer.alloc(12);
  source.split('.').forEach((octet, i) => addresses.writeUInt8(Number(octet), i));
  [127, 0, 0, 1].forEach((octet, i) => addresses.writeUInt8(octet, 4 + i));
  addresses.writeUInt16BE(51_000, 8);
  addresses.writeUInt16BE(8443, 10);
  const fixed = Buffer.alloc(4);
  fixed.writeUInt8(over.command ?? 0x21, 0);
  fixed.writeUInt8(over.family ?? 0x11, 1);
  fixed.writeUInt16BE(over.length ?? 12, 2);
  return Buffer.concat([signature, fixed, addresses]);
}

type Mode = 'separate' | 'one-write' | 'byte-by-byte';

interface Dialled {
  readonly tls: TLSSocket;
  /** Everything the door sent back, in clear. */
  readonly received: () => Buffer;
  /** Resolves when the connection closed, with whether the handshake completed. */
  readonly closed: Promise<void>;
  readonly error: () => string | null;
  /** True once the connection is gone, whichever side ended it. */
  readonly isClosed: () => boolean;
}

/**
 * Dial the door the way Funnel's forwarder and a phone do together: a TCP
 * connection, a PROXY v2 header, then TLS 1.3 with SNI and (for a paired
 * phone) a client certificate.
 *
 * `one-write` puts the header and the ClientHello in ONE `write`, which is the
 * shape the forwarder usually produces; `byte-by-byte` sends the header and
 * the hello one byte per turn; `separate` sends the header, waits, then the
 * hello.
 */
async function dial(
  port: number,
  options: {
    header?: Buffer | null;
    mode?: Mode;
    servername?: string;
    phone?: Phone | null;
    maxVersion?: 'TLSv1.2' | 'TLSv1.3';
  } = {}
): Promise<Dialled> {
  const raw = netConnect(port, '127.0.0.1');
  sockets.push(raw);
  raw.on('error', () => undefined);
  await new Promise<void>((resolve, reject) => {
    raw.once('connect', () => resolve());
    raw.once('error', reject);
  });
  const mode = options.mode ?? 'separate';
  let header: Buffer | null = options.header === undefined ? proxyHeader() : options.header;
  if (mode === 'separate' && header !== null) {
    raw.write(header);
    header = null;
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
  let firstWrite = true;
  const shim = new Duplex({
    write(chunk: Buffer, _encoding, callback) {
      let bytes = chunk;
      if (header !== null) {
        bytes = Buffer.concat([header, chunk]);
        header = null;
      }
      if (mode === 'byte-by-byte' && firstWrite) {
        firstWrite = false;
        let i = 0;
        const next = (): void => {
          if (i >= bytes.length || raw.destroyed) {
            callback();
            return;
          }
          raw.write(bytes.subarray(i, i + 1));
          i += 1;
          setTimeout(next, 1);
        };
        next();
        return;
      }
      firstWrite = false;
      raw.write(bytes, () => callback());
    },
    read() {
      /* pushed from the raw socket */
    },
    destroy(err, callback) {
      raw.destroy();
      callback(err);
    }
  });
  sockets.push(shim);
  raw.on('data', (data: Buffer) => shim.push(data));
  raw.on('end', () => shim.push(null));
  raw.on('close', () => shim.destroy());
  const tls = tlsConnect({
    socket: shim,
    servername: options.servername ?? NAME,
    minVersion: options.maxVersion === 'TLSv1.2' ? 'TLSv1.2' : 'TLSv1.3',
    maxVersion: options.maxVersion ?? 'TLSv1.3',
    // The door's own pin is checked by the phone and by `hostile-client`;
    // this file is about what the DOOR refuses.
    rejectUnauthorized: false,
    ...(options.phone ? { key: options.phone.key, cert: options.phone.cert } : {})
  });
  sockets.push(tls);
  const chunks: Buffer[] = [];
  let error: string | null = null;
  tls.on('data', (d: Buffer) => chunks.push(d));
  tls.on('error', (e: Error) => {
    error = e.message;
  });
  // CLOSED IS THE RAW SOCKET'S CLOSE, or the TLS socket's. A door that refuses
  // before the handshake destroys the raw socket, and a TLS socket over a
  // stream that is already gone never emits a close of its own.
  const closed = new Promise<void>((resolve) => {
    if (raw.destroyed) resolve();
    raw.once('close', () => resolve());
    tls.once('close', () => resolve());
  });
  let gone = false;
  void closed.then(() => {
    gone = true;
  });
  return { tls, received: () => Buffer.concat(chunks), closed, error: () => error, isClosed: () => gone };
}

interface Response {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly rawHeaders: string;
  readonly body: string;
}

function parseResponse(bytes: Buffer): Response | null {
  const text = bytes.toString('utf8');
  const end = text.indexOf('\r\n\r\n');
  if (end === -1) return null;
  const [statusLine, ...lines] = text.slice(0, end).split('\r\n');
  const status = Number(/^HTTP\/1\.1 (\d{3})/.exec(statusLine ?? '')?.[1] ?? 0);
  const headers: Record<string, string> = {};
  for (const line of lines) {
    const at = line.indexOf(':');
    headers[line.slice(0, at).trim().toLowerCase()] = line.slice(at + 1).trim();
  }
  return { status, headers, rawHeaders: text.slice(0, end), body: text.slice(end + 4) };
}

/** Resolves once the client's handshake completed; never, if it did not. */
function secured(d: Dialled): Promise<void> {
  return new Promise<void>((resolve) => {
    if ((d.tls as unknown as { _secureEstablished?: boolean })._secureEstablished) resolve();
    else d.tls.once('secureConnect', () => resolve());
  });
}

/** One request over a dialled connection, `Connection: close`. */
async function exchange(d: Dialled, request: string): Promise<Response | null> {
  await Promise.race([secured(d), d.closed, new Promise((resolve) => setTimeout(resolve, 3_000))]);
  if (!d.tls.destroyed) d.tls.write(request);
  await Promise.race([d.closed, new Promise((resolve) => setTimeout(resolve, 3_000))]);
  return parseResponse(d.received());
}

function get(target: string, extra: Record<string, string> = {}, host = HOST): string {
  const headers = {
    Host: host,
    'x-tortie-phone': 'phone-a',
    'x-tortie-timestamp': String(Date.now()),
    'x-tortie-nonce': '0123456789abcdef0123',
    'x-tortie-signature': 'c'.repeat(86),
    Connection: 'close',
    ...extra
  };
  return `GET ${target} HTTP/1.1\r\n${Object.entries(headers)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\r\n')}\r\n\r\n`;
}

function post(target: string, body: string, host = HOST): string {
  return `POST ${target} HTTP/1.1\r\nHost: ${host}\r\nContent-Type: application/json\r\nContent-Length: ${String(Buffer.byteLength(body))}\r\nConnection: close\r\n\r\n${body}`;
}

const PRESENTATION = JSON.stringify({
  iv: 'A'.repeat(16),
  ct: 'B'.repeat(100),
  tag: 'C'.repeat(22),
  ek: 'D'.repeat(59),
  sig: 'E'.repeat(86)
});

// ---------------------------------------------------------------------------
// The honest phone, and the hand-over of buffered bytes
// ---------------------------------------------------------------------------

describe('a paired phone', () => {
  for (const mode of ['separate', 'one-write', 'byte-by-byte'] as const) {
    it(`reads through a header sent ${mode === 'separate' ? 'before' : mode === 'one-write' ? 'in ONE write with' : 'byte by byte with'} its ClientHello`, async () => {
      const main = await startDoor();
      const d = await dial(main.port, { phone: paired, mode });
      const answer = await exchange(d, get('/v1/blocked'));
      expect(answer?.status).toBe(200);
      expect(answer?.body).toBe('{"ok":true}');
      expect(main.requests).toHaveLength(1);
      const request = main.requests[0];
      expect(request?.route).toBe('blocked');
      if (request?.route !== 'pair') expect(request?.channel).toBe(paired.id);
      expect(main.door.stats().parserSockets).toBe(1);
      // THE HAND-OVER, MEASURED. In one write the ClientHello is buffered past
      // the header and must be put back in front of the stream; sent after a
      // pause, nothing is buffered and nothing needs putting back.
      if (mode === 'one-write') expect(main.door.stats().handedBuffered).toBe(1);
      if (mode === 'separate') expect(main.door.stats().handedBuffered).toBe(0);
    });
  }

  it('forwards the four signature headers and nothing else, and the target as it arrived', async () => {
    const main = await startDoor();
    const d = await dial(main.port, { phone: paired });
    await exchange(d, get('/v1/turns?id=ses_1&limit=5', { 'x-other': 'never', cookie: 'no' }));
    const request = main.requests[0];
    if (request === undefined || request.route === 'pair') throw new Error('no read forwarded');
    expect(request.target).toBe('/v1/turns?id=ses_1&limit=5');
    expect(Object.keys(request.headers).sort()).toEqual([
      'x-tortie-nonce',
      'x-tortie-phone',
      'x-tortie-signature',
      'x-tortie-timestamp'
    ]);
    expect(JSON.stringify(request)).not.toContain('203.0.113.7');
    expect(JSON.stringify(request)).not.toContain('never');
  });

  it('puts an explicit Content-Length and no Transfer-Encoding on every answer, a 404 included', async () => {
    const main = await startDoor({
      answer: (r) => (r.route === 'blocked' ? { status: 200, body: '{"rows":[]}' } : { status: 404, body: null })
    });
    const ok = await exchange(await dial(main.port, { phone: paired }), get('/v1/blocked'));
    const refused = await exchange(await dial(main.port, { phone: paired }), get('/v1/session?id=x'));
    const route = await exchange(await dial(main.port, { phone: paired }), get('/v1/nothing'));
    for (const [answer, length] of [
      [ok, String(Buffer.byteLength('{"rows":[]}'))],
      [refused, '0'],
      [route, '0']
    ] as const) {
      expect(answer?.headers['content-length']).toBe(length);
      expect(answer?.headers['transfer-encoding']).toBeUndefined();
      expect(answer?.headers['referrer-policy']).toBe('no-referrer');
      expect(answer?.headers['cache-control']).toBe('no-store');
    }
    expect(ok?.status).toBe(200);
    expect(refused?.status).toBe(404);
    expect(refused?.body).toBe('');
    expect(route?.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// Refused before the parser: every one is asserted on its word AND on the
// parser counter
// ---------------------------------------------------------------------------

describe('refused before a byte reaches the HTTP parser', () => {
  async function refusedBeforeParser(
    main: Main,
    d: Dialled,
    word: string
  ): Promise<void> {
    const answer = await exchange(d, get('/v1/blocked'));
    expect(answer).toBeNull();
    await until(() => main.words().includes(word));
    expect(main.door.stats().refused[word as keyof ReturnType<DoorListenerHandle['stats']>['refused']]).toBeGreaterThan(0);
    expect(main.door.stats().parserSockets).toBe(0);
    expect(main.door.stats().parserRequests).toBe(0);
    expect(main.requests).toHaveLength(0);
  }

  it('no PROXY header at all: TLS straight at the port', async () => {
    const main = await startDoor();
    await refusedBeforeParser(main, await dial(main.port, { phone: paired, header: null }), 'proxy');
  });

  it('a malformed header: LOCAL, UDP, a length under the family’s, and a length over 216', async () => {
    const main = await startDoor();
    for (const over of [{ command: 0x20 }, { family: 0x12 }, { length: 11 }, { length: 217 }]) {
      const d = await dial(main.port, { phone: paired, header: proxyHeader('198.51.100.1', over) });
      expect(await exchange(d, get('/v1/blocked'))).toBeNull();
    }
    await until(() => main.door.stats().refused.proxy >= 4);
    expect(main.door.stats().parserSockets).toBe(0);
    expect(main.door.stats().handshakes).toBe(0);
  });

  it('a header that never finishes, after the header timeout', async () => {
    const main = await startDoor({ timings: { timings: { proxyHeaderMs: 150 } } });
    const raw = netConnect(main.port, '127.0.0.1');
    sockets.push(raw);
    raw.on('error', () => undefined);
    raw.write(proxyHeader().subarray(0, 10));
    await new Promise<void>((resolve) => raw.once('close', () => resolve()));
    expect(main.words()).toContain('proxy');
    expect(main.door.stats().parserSockets).toBe(0);
  });

  it('a FORGED header naming a paired phone’s source reaches no identity', async () => {
    // Any process on this Mac can write this header. It is a rate-limit key
    // and nothing else: with no certificate outside a window it is destroyed.
    const main = await startDoor();
    await refusedBeforeParser(
      main,
      await dial(main.port, { phone: null, header: proxyHeader('203.0.113.7') }),
      'no-certificate'
    );
  });

  it('no certificate outside a window', async () => {
    const main = await startDoor({ windowOpen: false });
    await refusedBeforeParser(main, await dial(main.port, { phone: null }), 'no-certificate');
  });

  it('a certificate over a key that is not paired', async () => {
    const main = await startDoor();
    await refusedBeforeParser(main, await dial(main.port, { phone: stranger }), 'unknown-key');
  });

  it('the wrong server name', async () => {
    const main = await startDoor();
    await refusedBeforeParser(
      main,
      await dial(main.port, { phone: paired, servername: 'other.tail00000.ts.net' }),
      'server-name'
    );
  });

  it('TLS 1.2, under which the client certificate would cross the relay in the clear', async () => {
    const main = await startDoor();
    const d = await dial(main.port, { phone: paired, maxVersion: 'TLSv1.2' });
    await d.closed;
    await until(() => main.words().includes('handshake'));
    expect(main.door.stats().parserSockets).toBe(0);
    expect(main.door.stats().handshakes).toBe(0);
  });

  it('a fifth connection from one source, while four are open', async () => {
    const main = await startDoor();
    const held: Dialled[] = [];
    for (let i = 0; i < PER_SOURCE_MAX; i += 1) {
      const d = await dial(main.port, { phone: paired, header: proxyHeader('192.0.2.9') });
      await secured(d);
      held.push(d);
    }
    await until(() => main.door.stats().open === PER_SOURCE_MAX);
    const parserBefore = main.door.stats().parserSockets;
    const fifth = await dial(main.port, { phone: paired, header: proxyHeader('192.0.2.9') });
    expect(await exchange(fifth, get('/v1/blocked'))).toBeNull();
    await until(() => main.words().includes('source-cap'));
    expect(main.door.stats().parserSockets).toBe(parserBefore);
    // Another source is not counted against the first.
    const elsewhere = await dial(main.port, { phone: paired, header: proxyHeader('192.0.2.10') });
    expect((await exchange(elsewhere, get('/v1/blocked')))?.status).toBe(200);
    // Closing one of the four frees its place.
    held[0]?.tls.destroy();
    await until(() => main.door.stats().open === PER_SOURCE_MAX);
    const again = await dial(main.port, { phone: paired, header: proxyHeader('192.0.2.9') });
    expect((await exchange(again, get('/v1/blocked')))?.status).toBe(200);
  });

  it('every connection once admission has closed, before its PROXY header or TLS', async () => {
    const main = await startDoor();
    main.door.receive({ kind: 'shutdown' });
    await new Promise((resolve) => setImmediate(resolve));
    await refusedBeforeParser(main, await dial(main.port, { phone: paired }), 'shutdown');
    // Refused on arrival: never handed to TLS, so no handshake was spent on it.
    expect(main.door.stats().handedToTls).toBe(0);
    // And ON ARRIVAL, not once a header comes: a socket that says nothing is
    // closed at once rather than held for the header's five seconds.
    const silent = netConnect(main.port, '127.0.0.1');
    sockets.push(silent);
    silent.on('error', () => undefined);
    const closedAt = await new Promise<number>((resolve) => {
      const started = Date.now();
      silent.once('close', () => resolve(Date.now() - started));
      setTimeout(() => resolve(-1), 2_000);
    });
    expect(closedAt).toBeGreaterThanOrEqual(0);
    expect(closedAt).toBeLessThan(1_000);
  });

  it('a handshake already in flight when admission closes, at its secureConnection', async () => {
    const main = await startDoor();
    const raw = netConnect(main.port, '127.0.0.1');
    sockets.push(raw);
    raw.on('error', () => undefined);
    await new Promise<void>((resolve) => raw.once('connect', () => resolve()));
    raw.write(proxyHeader());
    // The header is read and the socket handed to TLS; THEN the quit begins.
    await until(() => main.door.stats().handedToTls === 1);
    main.door.receive({ kind: 'shutdown' });
    await new Promise((resolve) => setImmediate(resolve));
    const tls = tlsConnect({ socket: raw, servername: NAME, minVersion: 'TLSv1.3', rejectUnauthorized: false, key: paired.key, cert: paired.cert });
    sockets.push(tls);
    tls.on('error', () => undefined);
    await new Promise<void>((resolve) => {
      raw.once('close', () => resolve());
      setTimeout(resolve, 3_000);
    });
    expect(main.door.stats().handshakes).toBe(1);
    expect(main.door.stats().refused.shutdown).toBe(1);
    expect(main.door.stats().parserSockets).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The window, and the one route a certificate-less connection may reach
// ---------------------------------------------------------------------------

describe('a connection with no certificate, inside a window', () => {
  it('reaches POST /pair, and the outer JSON is forwarded parsed', async () => {
    const main = await startDoor({ windowOpen: true });
    const answer = await exchange(await dial(main.port, { phone: null }), post('/pair', PRESENTATION));
    expect(answer?.status).toBe(200);
    expect(answer?.body).toBe('{"state":"pending"}');
    const request = main.requests[0];
    expect(request?.route).toBe('pair');
    if (request?.route === 'pair') {
      expect(Object.keys(request.presentation).sort()).toEqual(['ct', 'ek', 'iv', 'sig', 'tag']);
    }
  });

  it('reaches nothing else: a signed route is refused `route`, and main is not asked', async () => {
    const main = await startDoor({ windowOpen: true });
    const answer = await exchange(await dial(main.port, { phone: null }), get('/v1/blocked'));
    expect(answer?.status).toBe(404);
    expect(main.words()).toContain('route');
    expect(main.requests).toHaveLength(0);
  });

  it('is cut the moment the window shuts', async () => {
    const main = await startDoor({ windowOpen: true });
    const d = await dial(main.port, { phone: null });
    await secured(d);
    await until(() => main.door.stats().open === 1);
    main.door.receive({ kind: 'update', windowOpen: false });
    // AT ONCE, not when some timer later cuts an idle socket.
    await Promise.race([d.closed, new Promise((resolve) => setTimeout(resolve, 1_000))]);
    expect(d.isClosed()).toBe(true);
    await until(() => main.door.stats().open === 0);
  });

  it('refuses /pair outside a window, even to a paired phone', async () => {
    const main = await startDoor({ windowOpen: false });
    const answer = await exchange(await dial(main.port, { phone: paired }), post('/pair', PRESENTATION));
    expect(answer?.status).toBe(404);
    expect(main.words()).toContain('window');
    expect(main.requests).toHaveLength(0);
  });
});

describe('/pair’s outer JSON, parsed strictly in the door process', () => {
  const shapes: [string, string][] = [
    ['a sixth key', JSON.stringify({ ...JSON.parse(PRESENTATION), extra: 1 })],
    ['a missing key', JSON.stringify({ iv: 'A'.repeat(16), ct: 'B', tag: 'C'.repeat(22), ek: 'D' })],
    ['not JSON', '{"iv":'],
    ['an array', '[1,2,3]'],
    ['an iv of the wrong length', JSON.stringify({ ...JSON.parse(PRESENTATION), iv: 'A'.repeat(15) })],
    ['a field that is not base64url', JSON.stringify({ ...JSON.parse(PRESENTATION), ct: 'a+b/c=' })],
    ['a number where a string goes', JSON.stringify({ ...JSON.parse(PRESENTATION), sig: 5 })]
  ];
  for (const [name, body] of shapes) {
    it(`refuses ${name} as malformed, and main is never handed it`, async () => {
      const main = await startDoor({ windowOpen: true });
      const answer = await exchange(await dial(main.port, { phone: null }), post('/pair', body));
      expect(answer?.status).toBe(404);
      expect(main.words()).toContain('malformed');
      expect(main.requests).toHaveLength(0);
    });
  }
});

// ---------------------------------------------------------------------------
// HTTP: the Host, the table, the body cap, the headers
// ---------------------------------------------------------------------------

describe('HTTP refusals, each with its word', () => {
  it('a Host that is not exactly the public name and port', async () => {
    const main = await startDoor();
    for (const host of [NAME, `${NAME}:10000`, `127.0.0.1:${String(PUBLIC_PORT)}`, `MAC.tail00000.ts.net:8443`]) {
      const answer = await exchange(await dial(main.port, { phone: paired }), get('/v1/blocked', {}, host));
      expect(answer?.status).toBe(404);
    }
    expect(main.door.stats().refused.host).toBe(4);
    expect(main.requests).toHaveLength(0);
  });

  it('a path, a method or a target form that is not in the table', async () => {
    const main = await startDoor();
    for (const request of [
      get('/v1/blocked/'),
      get('/V1/blocked'),
      get('//evil/v1/blocked'),
      `POST /v1/blocked HTTP/1.1\r\nHost: ${HOST}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`,
      `GET https://${HOST}/v1/blocked HTTP/1.1\r\nHost: ${HOST}\r\nConnection: close\r\n\r\n`
    ]) {
      const answer = await exchange(await dial(main.port, { phone: paired }), request);
      expect(answer?.status).toBe(404);
    }
    expect(main.door.stats().refused.route).toBe(5);
    expect(main.requests).toHaveLength(0);
  });

  it('a body over the cap, dropped whole', async () => {
    const main = await startDoor();
    const body = 'x'.repeat(1025);
    const answer = await exchange(
      await dial(main.port, { phone: paired }),
      `GET /v1/blocked HTTP/1.1\r\nHost: ${HOST}\r\nx-tortie-phone: phone-a\r\nx-tortie-timestamp: 1\r\nx-tortie-nonce: 0123456789abcdef\r\nx-tortie-signature: s\r\nContent-Length: 1025\r\nConnection: close\r\n\r\n${body}`
    );
    expect(answer?.status).toBe(404);
    expect(main.words()).toContain('oversized');
    expect(main.requests).toHaveLength(0);
  });

  it('a signed read with a header missing or out of bounds', async () => {
    const main = await startDoor();
    const extras: Record<string, string>[] = [
      { 'x-tortie-nonce': 'short' },
      { 'x-tortie-signature': 's'.repeat(129) },
      { 'x-tortie-phone': 'p'.repeat(65) },
      { 'x-tortie-timestamp': '1'.repeat(21) }
    ];
    for (const extra of extras) {
      const answer = await exchange(await dial(main.port, { phone: paired }), get('/v1/blocked', extra));
      expect(answer?.status).toBe(404);
    }
    expect(main.door.stats().refused.malformed).toBe(4);
    expect(main.requests).toHaveLength(0);
  });

  it('an idle keep-alive connection, after the keep-alive bound and not the headers one', async () => {
    const main = await startDoor({ timings: { timings: { keepAliveMs: 200, headersMs: 5_000 } } });
    const d = await dial(main.port, { phone: paired });
    await secured(d);
    // No `Connection: close`: the connection stays open after its answer.
    d.tls.write(get('/v1/blocked', { Connection: 'keep-alive' }));
    await until(() => parseResponse(d.received()) !== null);
    const answered = Date.now();
    await Promise.race([d.closed, new Promise((resolve) => setTimeout(resolve, 3_000))]);
    expect(d.isClosed()).toBe(true);
    expect(Date.now() - answered).toBeLessThan(1_500);
  });

  it('a request that sends half its headers, after the door’s own headers timer', async () => {
    const main = await startDoor({ timings: { timings: { headersMs: 200 } } });
    const d = await dial(main.port, { phone: paired });
    await secured(d);
    d.tls.write(`GET /v1/blocked HTTP/1.1\r\nHost: ${HOST}\r\n`);
    const started = Date.now();
    await Promise.race([d.closed, new Promise((resolve) => setTimeout(resolve, 3_000))]);
    expect(d.isClosed()).toBe(true);
    expect(Date.now() - started).toBeLessThan(2_000);
  });
});

// ---------------------------------------------------------------------------
// The pins, the answer, the stop
// ---------------------------------------------------------------------------

describe('what main tells the door', () => {
  it('a pins update cuts a live socket whose key is no longer pinned, and keeps the others', async () => {
    const main = await startDoor({
      pins: [
        { phoneId: paired.id, spkiSha256: paired.pin },
        { phoneId: other.id, spkiSha256: other.pin }
      ]
    });
    const a = await dial(main.port, { phone: paired });
    const b = await dial(main.port, { phone: other, header: proxyHeader('198.51.100.20') });
    await secured(a);
    await secured(b);
    await until(() => main.door.stats().open === 2);
    main.door.receive({ kind: 'update', pins: [{ phoneId: other.id, spkiSha256: other.pin }] });
    // AT ONCE: Remove means now, not when the idle socket times out.
    await Promise.race([a.closed, new Promise((resolve) => setTimeout(resolve, 1_000))]);
    expect(a.isClosed()).toBe(true);
    const answer = await exchange(b, get('/v1/blocked', { 'x-tortie-phone': other.id }));
    expect(answer?.status).toBe(200);
    // And the removed key's next handshake is refused before the parser.
    const before = main.door.stats().parserSockets;
    expect(await exchange(await dial(main.port, { phone: paired }), get('/v1/blocked'))).toBeNull();
    await until(() => main.words().includes('unknown-key'));
    expect(main.door.stats().parserSockets).toBe(before);
  });

  it('refuses a request main never answers, rather than holding the phone', async () => {
    const main = await startDoor({ answer: () => null, timings: { timings: { answerMs: 150 } } });
    const answer = await exchange(await dial(main.port, { phone: paired }), get('/v1/blocked'));
    expect(answer?.status).toBe(404);
  });

  it('drops a message from main that does not validate, whole', async () => {
    const main = await startDoor();
    main.door.receive({ kind: 'answer', id: 1, status: 404, body: 'a reason on the wire' });
    main.door.receive({ kind: 'update', pins: [{ phoneId: 'x', spkiSha256: 'short' }] });
    main.door.receive({ kind: 'start', generation: 8, tls: { key: 'k', cert: 'c' }, pins: [], host: { name: NAME, port: 1 }, windowOpen: true });
    main.door.receive('stop');
    expect(main.door.stats().droppedMessages).toBe(4);
    // The bad pin update did not empty the pins: the phone still reads.
    expect((await exchange(await dial(main.port, { phone: paired }), get('/v1/blocked')))?.status).toBe(200);
  });

  it('stops: joins a request main is answering, refuses what arrives after, and says stopped', async () => {
    let release: (() => void) | null = null;
    const main = await startDoor({ answer: () => null });
    const d = await dial(main.port, { phone: paired });
    const inFlight = exchange(d, get('/v1/blocked'));
    await until(() => main.requests.length === 1);
    const forwarded = main.messages.find((m) => m.kind === 'request');
    release = () => {
      if (forwarded?.kind === 'request') {
        main.door.receive({ kind: 'answer', id: forwarded.id, status: 200, body: '{"late":true}' });
      }
    };
    main.door.receive({ kind: 'shutdown' });
    main.door.receive({ kind: 'stop' });
    await new Promise((resolve) => setTimeout(resolve, 50));
    release();
    const answer = await inFlight;
    expect(answer?.status).toBe(200);
    await until(() => main.messages.some((m) => m.kind === 'stopped'));
    const stopped = main.messages.find((m) => m.kind === 'stopped');
    expect(stopped).toMatchObject({ kind: 'stopped', accepted: 1, joined: true });
  });
});

describe('the source of the listener', () => {
  it('names the source in a log nowhere, and forwards no address', async () => {
    const { readFileSync } = await import('node:fs');
    const text = readFileSync(join(__dirname, '..', 'door', 'listener.ts'), 'utf8');
    expect(text).not.toMatch(/\.addressBlock\b/);
    expect(text).not.toMatch(/remoteAddress/);
  });
});
