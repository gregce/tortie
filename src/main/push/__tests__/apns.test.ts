/**
 * The APNs sender (Phase 314, SPEC §2.5 to §2.7), driven against a loopback
 * stand-in and nothing else.
 *
 * THE STAND-IN is a cleartext HTTP/2 server (`node:http2` `createServer`) on
 * `127.0.0.1` port 0, in this process, closed in a `finally` by every test that
 * starts one. It records each stream's path, headers and body and answers from
 * a script the test sets. It is the only thing the sender is ever aimed at
 * here. No host off this Mac is dialled by this file, by THREE nets: the tests
 * that hand the sender a refused origin also hand it a device address that is
 * not hex, so a sender whose origin refusal had been removed would still
 * refuse before a socket; no test passes `allowRemote` (`conformance:push`
 * H3); and `node:http2`'s `connect` is FENCED below, so a sender with every
 * refusal removed throws at the fence rather than dial, and the fence's hit
 * list is asserted empty after every test.
 *
 * THE KEY is a P-256 key generated in memory by `node:crypto` for this run and
 * never written anywhere. Each provider token the stand-in receives is VERIFIED
 * with the matching public key, never byte-compared, because ECDSA signatures
 * are randomised.
 *
 * Which clause each test would catch if it were removed is named in the test.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createServer,
  type IncomingHttpHeaders,
  type ServerHttp2Session
} from 'node:http2';
import { generateKeyPairSync, randomBytes, randomUUID, verify, type KeyObject } from 'node:crypto';
import { createServer as createTcpServer, type AddressInfo, type Socket } from 'node:net';
import type { ApnsProviderKey } from '../../credentials/apns-key';
import {
  IDLE_CLOSE_MS,
  TOKEN_REUSE_MS,
  apnsOrigin,
  classifyApnsAnswer,
  createApnsSender,
  providerKeyDigest,
  providerTokenSigningInput,
  type ApnsRequest,
  type ApnsSender
} from '../apns';

// ---------------------------------------------------------------------------
// The fence (the integrator, Phase 314): `conformance:push`'s driven half fences
// every socket module and vitest has no such net, so this file fences the one
// call the sender dials through. Anything but the two literal loopback
// addresses is refused and recorded, and `afterEach` asserts nothing was.
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
      throw new Error('[p314 fence] this file reaches nothing but 127.0.0.1');
    }
    return (original.connect as (...args: unknown[]) => unknown)(authority, ...rest);
  };
  return { ...original, connect: fenced };
});

/** Origins the sender must refuse. `conformance:push` H3's one exemption is this name. */
const HOSTILE_ORIGINS = Object.freeze(['http://10.0.0.1:80', 'http://localhost:80']);

// ---------------------------------------------------------------------------
// The stand-in
// ---------------------------------------------------------------------------

interface Seen {
  readonly path: string;
  readonly headers: IncomingHttpHeaders;
  readonly body: string;
}

type Script = (seen: Seen, index: number) => { status: number; reason?: string } | 'reset';

interface StandIn {
  readonly origin: string;
  readonly seen: Seen[];
  sessions(): number;
  openSessions(): number;
  script: Script;
  close(): Promise<void>;
}

async function startStandIn(): Promise<StandIn> {
  const server = createServer();
  const live = new Set<ServerHttp2Session>();
  let sessions = 0;
  const seen: Seen[] = [];
  const standIn: StandIn = {
    origin: '',
    seen,
    sessions: () => sessions,
    openSessions: () => live.size,
    script: () => ({ status: 200 }),
    close: async () => {
      for (const session of live) session.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  };
  server.on('session', (session) => {
    sessions += 1;
    live.add(session);
    session.on('close', () => live.delete(session));
    session.on('error', () => undefined);
  });
  server.on('stream', (stream, headers) => {
    const chunks: Buffer[] = [];
    stream.on('error', () => undefined);
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => {
      const entry: Seen = {
        path: String(headers[':path']),
        headers,
        body: Buffer.concat(chunks).toString('utf8')
      };
      seen.push(entry);
      const answer = standIn.script(entry, seen.length - 1);
      if (answer === 'reset') {
        stream.close(0x2); // INTERNAL_ERROR, with no response
        return;
      }
      if (answer.status === 200) {
        stream.respond({ ':status': 200, 'apns-id': randomUUID() });
        stream.end();
        return;
      }
      stream.respond({ ':status': answer.status, 'content-type': 'application/json' });
      stream.end(JSON.stringify({ reason: answer.reason ?? '', timestamp: 1 }));
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as AddressInfo).port;
  return Object.assign(standIn, { origin: `http://127.0.0.1:${port}` });
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function scratchKey(): { key: ApnsProviderKey; publicKey: KeyObject } {
  const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return {
    key: {
      keyId: 'ABC123DEFG',
      teamId: 'TEAM123456',
      topic: 'software.itavero.tortie.phone',
      p8: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    },
    publicKey: pair.publicKey
  };
}

function request(over: Partial<ApnsRequest> = {}): ApnsRequest {
  return {
    token: randomBytes(32).toString('hex'),
    environment: 'development',
    topic: 'software.itavero.tortie.phone',
    payload: '{"aps":{"badge":1}}',
    priority: 10,
    expiration: 1_900_000_000,
    collapseId: 'c0ffee00-0000-4000-8000-000000000000',
    ...over
  };
}

function bearerOf(seen: Seen): string {
  const header = String(seen.headers.authorization ?? '');
  expect(header.startsWith('bearer ')).toBe(true);
  return header.slice('bearer '.length);
}

function claimsOf(token: string): { header: unknown; claims: { iss: string; iat: number } } {
  const [head, body] = token.split('.');
  return {
    header: JSON.parse(Buffer.from(head ?? '', 'base64url').toString('utf8')),
    claims: JSON.parse(Buffer.from(body ?? '', 'base64url').toString('utf8'))
  };
}

const opened: Array<{ standIn: StandIn | null; sender: ApnsSender | null }> = [];

async function rig(nowRef: { t: number } = { t: 1_758_500_000_000 }): Promise<{
  standIn: StandIn;
  sender: ApnsSender;
  now: { t: number };
}> {
  const standIn = await startStandIn();
  const sender = createApnsSender({ origin: () => standIn.origin, now: () => nowRef.t });
  opened.push({ standIn, sender });
  return { standIn, sender, now: nowRef };
}

afterEach(async () => {
  // THE FINALLY: every stand-in and every sender this file opened is closed,
  // whatever the test did.
  for (const entry of opened.splice(0)) {
    try {
      await entry.sender?.close();
    } finally {
      await entry.standIn?.close();
    }
  }
  // THE FENCE saw nothing: no test in this file tried to leave this Mac.
  const hits = fence.hits.splice(0);
  expect(hits).toEqual([]);
});

// ---------------------------------------------------------------------------
// Apple's two origins, and the refusals
// ---------------------------------------------------------------------------

describe("Apple's origins (H1)", () => {
  it('maps the two environments to two different https origins on port 443', () => {
    const dev = new URL(apnsOrigin('development'));
    const prod = new URL(apnsOrigin('production'));
    expect(dev.protocol).toBe('https:');
    expect(prod.protocol).toBe('https:');
    expect(dev.hostname.endsWith('.apple.com')).toBe(true);
    expect(prod.hostname.endsWith('.apple.com')).toBe(true);
    expect(dev.hostname.includes('sandbox')).toBe(true);
    expect(prod.hostname.includes('sandbox')).toBe(false);
    expect(apnsOrigin('development')).toMatch(/:443$/);
    expect(apnsOrigin('production')).toMatch(/:443$/);
  });
});

describe('the refusals come before any socket (H2)', () => {
  it("refuses Apple's origin when not built to reach it (the loopback refusal)", async () => {
    const { key } = scratchKey();
    // A device address that is not hex is the safety net: if the origin
    // refusal were removed, the hex refusal would still stop the send before
    // a socket, and this test would go red on the reason rather than dial.
    const sender = createApnsSender({ origin: apnsOrigin });
    opened.push({ standIn: null, sender });
    const answer = await sender.send(key, request({ token: 'NOT-HEX' }));
    expect(answer.ok).toBe(false);
    if (answer.ok) return;
    expect(answer.kind).toBe('later');
    expect(answer.reason).toMatch(/not this Mac/);
  });

  it('refuses cleartext to a host that is not loopback, a NAME included, before the remote refusal', async () => {
    // No allowRemote here (conformance:push H3 refuses it in every test). The
    // cleartext refusal is checked FIRST, so its own reason is the answer; if
    // it were removed, the remote refusal would answer instead and the reason
    // would not match.
    const { key } = scratchKey();
    for (const hostile of HOSTILE_ORIGINS) {
      const sender = createApnsSender({ origin: () => hostile });
      opened.push({ standIn: null, sender });
      const answer = await sender.send(key, request({ token: 'NOT-HEX' }));
      expect(answer.ok).toBe(false);
      if (answer.ok) return;
      expect(answer.kind).toBe('later');
      expect(answer.reason).toMatch(/cleartext/);
    }
  });

  it('refuses an origin with a path, or a scheme that is not http, without connecting', async () => {
    const { standIn } = await rig();
    const { key } = scratchKey();
    for (const origin of [`${standIn.origin}/3/device`, standIn.origin.replace('http:', 'ftp:'), 'not a url']) {
      const sender = createApnsSender({ origin: () => origin });
      opened.push({ standIn: null, sender });
      const answer = await sender.send(key, request());
      expect(answer.ok).toBe(false);
    }
    expect(standIn.sessions()).toBe(0);
  });

  it('refuses a device address that is not lowercase hex before composing a path (the hex refusal)', async () => {
    const { standIn, sender } = await rig();
    const { key } = scratchKey();
    for (const token of ['ABCDEF0123', '../../x', 'abc/def', '', 'abc def']) {
      const answer = await sender.send(key, request({ token }));
      expect(answer.ok).toBe(false);
      if (answer.ok) continue;
      expect(answer.kind).toBe('drop');
      expect(answer.status).toBe(0);
    }
    expect(standIn.sessions()).toBe(0);
    expect(standIn.seen).toHaveLength(0);
  });

  it('accepts the loopback stand-in without allowRemote', async () => {
    const { standIn, sender } = await rig();
    const { key } = scratchKey();
    expect(await sender.send(key, request())).toEqual({ ok: true });
    expect(standIn.seen).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// The request (SPEC §2.5)
// ---------------------------------------------------------------------------

describe('the headers and the body (A4)', () => {
  it('sends exactly the headers SPEC §2.5 names, and the payload bytes as the body', async () => {
    const { standIn, sender } = await rig();
    const { key } = scratchKey();
    const req = request({ payload: '{"aps":{"alert":{"title":"t","body":"b"}}}' });
    await sender.send(key, req);
    const seen = standIn.seen[0];
    expect(seen).toBeDefined();
    if (seen === undefined) return;
    expect(seen.headers[':method']).toBe('POST');
    expect(seen.path).toBe(`/3/device/${req.token}`);
    expect(seen.headers['apns-topic']).toBe(req.topic);
    expect(seen.headers['apns-push-type']).toBe('alert');
    expect(seen.headers['apns-priority']).toBe('10');
    expect(seen.headers['apns-expiration']).toBe('1900000000');
    expect(seen.headers['apns-collapse-id']).toBe(req.collapseId);
    expect(seen.headers['apns-id']).toBeUndefined();
    expect(seen.body).toBe(req.payload);
    const own = Object.keys(seen.headers).filter((name) => !name.startsWith(':'));
    expect(own.sort()).toEqual(
      ['apns-collapse-id', 'apns-expiration', 'apns-priority', 'apns-push-type', 'apns-topic', 'authorization'].sort()
    );
  });

  it('sends no collapse id when there is none, and the badge priority and expiration as given', async () => {
    const { standIn, sender } = await rig();
    const { key } = scratchKey();
    await sender.send(key, request({ collapseId: null, priority: 5, expiration: 0 }));
    const seen = standIn.seen[0];
    expect(seen?.headers['apns-collapse-id']).toBeUndefined();
    expect(seen?.headers['apns-priority']).toBe('5');
    expect(seen?.headers['apns-expiration']).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// The provider token (SPEC §2.6)
// ---------------------------------------------------------------------------

describe('the provider token (J1, J2)', () => {
  it('pins the signing input byte for byte', () => {
    const expected =
      Buffer.from('{"alg":"ES256","kid":"ABC123DEFG"}', 'utf8').toString('base64url') +
      '.' +
      Buffer.from('{"iss":"TEAM123456","iat":1758500000}', 'utf8').toString('base64url');
    expect(providerTokenSigningInput('ABC123DEFG', 'TEAM123456', 1_758_500_000)).toBe(expected);
    expect(expected).not.toContain('=');
  });

  it('signs a token whose 64-byte ieee-p1363 signature verifies under the public key', async () => {
    const { standIn, sender, now } = await rig();
    const { key, publicKey } = scratchKey();
    await sender.send(key, request());
    const seen = standIn.seen[0];
    if (seen === undefined) throw new Error('nothing arrived');
    const token = bearerOf(seen);
    const parts = token.split('.');
    expect(parts).toHaveLength(3);
    const iat = Math.floor(now.t / 1000);
    expect(`${parts[0]}.${parts[1]}`).toBe(providerTokenSigningInput(key.keyId, key.teamId, iat));
    const signature = Buffer.from(parts[2] ?? '', 'base64url');
    expect(signature).toHaveLength(64);
    expect(
      verify('sha256', Buffer.from(`${parts[0]}.${parts[1]}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, signature)
    ).toBe(true);
    expect(claimsOf(token).header).toEqual({ alg: 'ES256', kid: key.keyId });
    expect(claimsOf(token).claims).toEqual({ iss: key.teamId, iat });
  });

  it('reuses under 50 minutes and re-mints at 50 (the reuse test)', async () => {
    const { standIn, sender, now } = await rig();
    const { key } = scratchKey();
    await sender.send(key, request());
    now.t += TOKEN_REUSE_MS - 1_000;
    await sender.send(key, request());
    now.t += 1_000;
    await sender.send(key, request());
    const tokens = standIn.seen.map(bearerOf);
    expect(tokens[1]).toBe(tokens[0]);
    expect(tokens[2]).not.toBe(tokens[0]);
    expect(claimsOf(tokens[2] ?? '').claims.iat - claimsOf(tokens[0] ?? '').claims.iat).toBe(TOKEN_REUSE_MS / 1000);
  });

  it('REUSES when the wall clock moved backwards, instead of re-minting (J2; red if a negative age re-mints)', async () => {
    const { standIn, sender, now } = await rig();
    const { key } = scratchKey();
    await sender.send(key, request());
    now.t -= 2 * 60 * 60_000;
    await sender.send(key, request());
    const tokens = standIn.seen.map(bearerOf);
    expect(tokens[1]).toBe(tokens[0]);
  });

  it('re-mints after an eight-hour sleep, with iat moved by eight hours', async () => {
    const { standIn, sender, now } = await rig();
    const { key } = scratchKey();
    await sender.send(key, request());
    now.t += 8 * 60 * 60_000;
    await sender.send(key, request());
    const [first, second] = standIn.seen.map(bearerOf).map(claimsOf);
    expect((second?.claims.iat ?? 0) - (first?.claims.iat ?? 0)).toBe(8 * 60 * 60);
  });

  it('re-mints for a different key record', async () => {
    const { standIn, sender } = await rig();
    const a = scratchKey().key;
    const b = { ...a, topic: 'software.itavero.tortie.other' };
    expect(providerKeyDigest(a)).not.toBe(providerKeyDigest(b));
    await sender.send(a, request());
    await sender.send(b, request({ topic: b.topic }));
    const tokens = standIn.seen.map(bearerOf);
    expect(tokens[1]).not.toBe(tokens[0]);
  });

  it('answers ExpiredProviderToken with one re-mint and one retry, and never a third attempt', async () => {
    const { standIn, sender } = await rig();
    const { key } = scratchKey();
    standIn.script = (_seen, index) =>
      index === 0 ? { status: 403, reason: 'ExpiredProviderToken' } : { status: 200 };
    expect(await sender.send(key, request())).toEqual({ ok: true });
    expect(standIn.seen).toHaveLength(2);
    const [first, second] = standIn.seen.map(bearerOf);
    expect(second).not.toBe(first);

    standIn.script = () => ({ status: 403, reason: 'ExpiredProviderToken' });
    const before = standIn.seen.length;
    const answer = await sender.send(key, request());
    expect(standIn.seen.length - before).toBe(2);
    expect(answer).toMatchObject({ ok: false, status: 403, kind: 'reauth' });
  });

  it('refuses a key that is not P-256 without connecting', async () => {
    const { standIn, sender } = await rig();
    const rsa = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const key: ApnsProviderKey = {
      ...scratchKey().key,
      p8: rsa.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    };
    const answer = await sender.send(key, request());
    expect(answer).toMatchObject({ ok: false, kind: 'stop' });
    expect(standIn.sessions()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Apple's answers (SPEC §2.7), every row driven against the stand-in
// ---------------------------------------------------------------------------

describe("Apple's answers (E7)", () => {
  const TABLE: Array<[number, string, string]> = [
    [410, 'Unregistered', 'drop'],
    [410, 'ExpiredToken', 'drop'],
    [400, 'BadDeviceToken', 'drop'],
    [400, 'DeviceTokenNotForTopic', 'stop'],
    [400, 'BadPriority', 'stop'],
    [403, 'InvalidProviderToken', 'stop'],
    [403, 'MissingProviderToken', 'stop'],
    [413, 'PayloadTooLarge', 'stop'],
    [429, 'TooManyRequests', 'later'],
    [500, 'InternalServerError', 'retry'],
    [503, 'ServiceUnavailable', 'retry']
  ];

  it.each(TABLE)('answers %i %s as %s', async (status, reason, kind) => {
    const { standIn, sender } = await rig();
    const { key } = scratchKey();
    standIn.script = () => ({ status, reason });
    const answer = await sender.send(key, request());
    expect(answer).toEqual({ ok: false, status, reason, kind });
    expect(standIn.seen).toHaveLength(1);
  });

  it('answers 200 as ok', () => {
    expect(classifyApnsAnswer(200, '')).toEqual({ ok: true });
  });

  it('answers a stream reset with no response as retry', async () => {
    const { standIn, sender } = await rig();
    const { key } = scratchKey();
    standIn.script = () => 'reset';
    expect(await sender.send(key, request())).toMatchObject({ ok: false, status: 0, kind: 'retry' });
  });

  it('answers a refused connection as retry, and does not throw', async () => {
    const standIn = await startStandIn();
    const origin = standIn.origin;
    await standIn.close();
    const sender = createApnsSender({ origin: () => origin });
    opened.push({ standIn: null, sender });
    expect(await sender.send(scratchKey().key, request())).toMatchObject({ ok: false, kind: 'retry' });
  });
});

// ---------------------------------------------------------------------------
// The connection
// ---------------------------------------------------------------------------

describe('one connection per origin', () => {
  it('reuses one HTTP/2 session for many sends, and opens a fresh one after close()', async () => {
    const { standIn, sender } = await rig();
    const { key } = scratchKey();
    await sender.send(key, request());
    await sender.send(key, request());
    await Promise.all([sender.send(key, request()), sender.send(key, request())]);
    expect(standIn.sessions()).toBe(1);
    await sender.close();
    await expect.poll(() => standIn.openSessions()).toBe(0);
    await sender.send(key, request());
    expect(standIn.sessions()).toBe(2);
  });

  it('keeps one session per environment', async () => {
    const dev = await startStandIn();
    const prod = await startStandIn();
    const sender = createApnsSender({ origin: (env) => (env === 'production' ? prod.origin : dev.origin) });
    opened.push({ standIn: dev, sender }, { standIn: prod, sender: null });
    const { key } = scratchKey();
    await sender.send(key, request({ environment: 'development' }));
    await sender.send(key, request({ environment: 'production' }));
    expect(dev.seen).toHaveLength(1);
    expect(prod.seen).toHaveLength(1);
  });

  it('closes a connection after thirty minutes with no request on it, and not a moment before', async () => {
    const { standIn, sender } = await rig();
    const { key } = scratchKey();
    expect(IDLE_CLOSE_MS).toBe(30 * 60_000);
    // Only the global setTimeout is faked, which is the one the idle close
    // uses; node:http2's own timers are internal and keep real time.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      await sender.send(key, request());
      vi.advanceTimersByTime(IDLE_CLOSE_MS - 1);
    } finally {
      vi.useRealTimers();
    }
    await new Promise((resolve) => setImmediate(resolve));
    expect(standIn.openSessions()).toBe(1);
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    try {
      await sender.send(key, request());
      vi.advanceTimersByTime(IDLE_CLOSE_MS);
    } finally {
      vi.useRealTimers();
    }
    await expect.poll(() => standIn.openSessions()).toBe(0);
    expect(standIn.sessions()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// A peer that never answers (the fix round, Phase 314)
// ---------------------------------------------------------------------------

/**
 * A TCP listener on 127.0.0.1 that takes every connection and never writes a
 * byte: behind `https:` it is a TLS handshake nobody answers, behind `http:` an
 * h2c peer that never sends its SETTINGS. It counts what it took and what the
 * sender closed.
 */
async function startSilentPeer(): Promise<{
  port: number;
  accepted(): number;
  closed(): number;
  close(): Promise<void>;
}> {
  const sockets = new Set<Socket>();
  let accepted = 0;
  let closed = 0;
  const server = createTcpServer((socket) => {
    accepted += 1;
    sockets.add(socket);
    socket.on('error', () => undefined);
    // Read and drop what arrives, so the sender's FIN is seen at all.
    socket.resume();
    socket.on('close', () => {
      closed += 1;
      sockets.delete(socket);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  return {
    port: (server.address() as AddressInfo).port,
    accepted: () => accepted,
    closed: () => closed,
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  };
}

/** Settle or answer `pending` after `ms` of real time, whichever comes first. */
async function within<T>(work: Promise<T>, ms: number): Promise<T | 'still pending'> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const bound = new Promise<'still pending'>((resolve) => {
    timer = setTimeout(() => resolve('still pending'), ms);
  });
  try {
    return await Promise.race([work, bound]);
  } finally {
    clearTimeout(timer);
  }
}

describe('a peer that never answers is given up on, and never handed on (the fix round)', () => {
  // Before the fix, a send on a connection whose TLS handshake nobody answered
  // was STILL PENDING after three minutes (the verifier's measurement): the
  // only timer was the stream's own, and node puts off a pending stream's
  // reset until the connection is ready, which never comes. The stuck
  // connection was then handed to every later send.
  it.each([
    ['a TLS handshake nobody answers', 'https'],
    ['an h2c peer that never sends a byte', 'http']
  ])('%s: settles as unreachable by the deadline, and the next send dials fresh', async (_label, scheme) => {
    const peer = await startSilentPeer();
    const sender = createApnsSender({
      origin: () => `${scheme}://127.0.0.1:${String(peer.port)}`,
      requestTimeoutMs: 200
    });
    try {
      const { key } = scratchKey();
      const first = await within(sender.send(key, request()), 3_000);
      expect(first).toEqual({ ok: false, status: 0, reason: 'Unreachable', kind: 'retry' });
      expect(peer.accepted()).toBe(1);
      // The dead connection was destroyed, not kept.
      await expect.poll(() => peer.closed()).toBe(1);
      const second = await within(sender.send(key, request()), 3_000);
      expect(second).toMatchObject({ ok: false, status: 0, kind: 'retry' });
      expect(peer.accepted()).toBe(2);
    } finally {
      await sender.close();
      await peer.close();
    }
  });

  it('settles on a 200 whose body trickles forever, at the deadline, on the status it had', async () => {
    const server = createServer();
    const drips = new Set<ReturnType<typeof setInterval>>();
    server.on('session', (session) => session.on('error', () => undefined));
    server.on('stream', (stream) => {
      stream.on('error', () => undefined);
      stream.on('data', () => undefined);
      stream.on('end', () => {
        stream.respond({ ':status': 200, 'apns-id': randomUUID() });
        const drip = setInterval(() => {
          if (!stream.destroyed && !stream.closed) stream.write('x');
        }, 20);
        drips.add(drip);
        stream.on('close', () => {
          clearInterval(drip);
          drips.delete(drip);
        });
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as AddressInfo).port;
    const sender = createApnsSender({ origin: () => `http://127.0.0.1:${String(port)}`, requestTimeoutMs: 300 });
    try {
      const started = Date.now();
      const answer = await within(sender.send(scratchKey().key, request()), 3_000);
      expect(answer).toEqual({ ok: true });
      expect(Date.now() - started).toBeLessThan(2_000);
    } finally {
      for (const drip of drips) clearInterval(drip);
      await sender.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('settles on a body past the read cap without waiting for its end', async () => {
    const server = createServer();
    server.on('session', (session) => session.on('error', () => undefined));
    server.on('stream', (stream) => {
      stream.on('error', () => undefined);
      stream.on('data', () => undefined);
      stream.on('end', () => {
        stream.respond({ ':status': 500, 'content-type': 'application/json' });
        stream.write('x'.repeat(8_192));
        // and never ends
      });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const port = (server.address() as AddressInfo).port;
    // The shipping deadline, 20 s: the cap must settle it long before.
    const sender = createApnsSender({ origin: () => `http://127.0.0.1:${String(port)}` });
    try {
      const answer = await within(sender.send(scratchKey().key, request()), 3_000);
      expect(answer).toMatchObject({ ok: false, status: 500, kind: 'retry' });
    } finally {
      await sender.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
