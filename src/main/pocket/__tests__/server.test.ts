/**
 * The door's handler, driven over a REAL socket by a hostile client written by
 * hand (Phase 313).
 *
 * WHAT THIS IS. The scripted hostile phone the phase asks for, in the ordinary
 * battery: no Swift, no Apple, no phone, no Electron. It pairs the way a phone
 * pairs, reads the three routes the way a phone reads them, and is then refused
 * ten different ways. The pairing, the verifier, the routes and the handler are
 * the SHIPPING modules; only the phone's half is written here, from the wire
 * format, so a test cannot pass by agreeing with itself.
 *
 * WHAT IT DOES NOT DRIVE, and the reason is not laziness. TLS and the bind
 * belong to `../bind.ts` and `../tls.ts`, which have their own tests, and the
 * refusal of a socket whose source is the door's own address happens there, on
 * the `connection` event, before a header exists. This file therefore runs the
 * handler behind a plain `node:http` listener on loopback — the handler is a
 * `(req, res)` function and knows nothing about what carried the bytes.
 *
 * EVERY LISTENER IS CLOSED IN A `finally`. `withDoor` owns one and ends it
 * whatever happened, so a failing assertion cannot leave a socket bound.
 */

import { createServer, request as httpRequest, type Server } from 'node:http';
import { connect } from 'node:net';
import {
  createCipheriv,
  createHash,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  sign as signWith,
  type KeyObject
} from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Project, Session } from '@shared/types';
import type { PocketFacts } from '../routes';
import type {
  PocketExecutionFields,
  PocketIdentity,
  PocketPhoneFields
} from '../pairing';

let userData = '';

const MARKER = '--tortie-pocket-server-test--';

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => true },
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

/**
 * Every line the door's log wrote, as `level message`. The handler logs each
 * refusal's REASON once, so a test can read which refusal answered.
 */
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

const {
  POCKET_HEADERS,
  POCKET_PAIRING_WINDOW_MS,
  PocketPairing,
  PocketRequestVerifier,
  newIdentity,
  pairingBinding,
  phoneIdOf
} = await import('../pairing');
const { createPocketRoutes } = await import('../routes');
const { createPocketHandler, POCKET_READ_BODY_CAP_BYTES } = await import('../server');
const { POCKET_ROUTE_IDS } = await import('@shared/ipc/pocket');

// ---------------------------------------------------------------------------
// The fixture main
// ---------------------------------------------------------------------------

function session(over: Partial<Session> & Pick<Session, 'id' | 'name'>): Session {
  return {
    tmuxName: over.name,
    projectPath: '/w/alpha',
    cwd: '/w/alpha',
    agent: 'claude',
    status: 'needs_input',
    createdAt: 1,
    ...over
  } as Session;
}

const SESSIONS: Session[] = [
  session({ id: 's1', name: 'one' }),
  session({ id: 's2', name: 'two', status: 'running' })
];
const PROJECTS: Project[] = [{ id: 'p', path: '/w/alpha', name: 'alpha' }];

const FACTS: PocketFacts = {
  sessions: () => SESSIONS,
  projects: () => PROJECTS,
  blockedSince: () => new Map([['s1', 9_000]]),
  activity: () => ({ question: 'May I run the tests?' }),
  statusWord: (s) =>
    s.status === 'needs_input'
      ? { dot: 'attention', label: 'needs input' }
      : { dot: 'working', label: 'working' },
  agentLabel: () => 'Claude Code',
  machineLabel: () => null,
  emptyLine: 'Nothing needs you',
  wakes: () => [],
  catchUp: async () => ({ ask: 'wire it', outcome: 'Done, and git agrees' }),
  lastTurn: async () => ({ answerText: 'wired', turnCount: 2 }),
  turns: async () => ({ turns: [], more: false }),
  handoff: () => null
};

// ---------------------------------------------------------------------------
// The phone, written out by hand
// ---------------------------------------------------------------------------

function b64u(buf: Buffer): string {
  return buf.toString('base64url');
}

interface FakePhone {
  label: string;
  sign: KeyObject;
  signPublic: string;
  exchange: KeyObject;
  exchangePublic: string;
}

function makePhone(label = 'A phone'): FakePhone {
  const ed = generateKeyPairSync('ed25519');
  const x = generateKeyPairSync('x25519');
  return {
    label,
    sign: ed.privateKey,
    signPublic: b64u(ed.publicKey.export({ format: 'der', type: 'spki' })),
    exchange: x.privateKey,
    exchangePublic: b64u(x.publicKey.export({ format: 'der', type: 'spki' }))
  };
}

/** The `/pair` wire format, spelled by the test. */
function sealPresentation(secretB64u: string, phone: FakePhone): string {
  const key = Buffer.from(
    hkdfSync(
      'sha256',
      Buffer.from(secretB64u, 'base64url'),
      Buffer.alloc(0),
      'tortie-pocket-pair-v1',
      32
    )
  );
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plain = JSON.stringify({
    label: phone.label,
    ek: phone.signPublic,
    xk: phone.exchangePublic
  });
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return JSON.stringify({
    iv: b64u(iv),
    ct: b64u(ct),
    tag: b64u(cipher.getAuthTag())
  });
}

// ---------------------------------------------------------------------------
// One door, ended in a finally
// ---------------------------------------------------------------------------

interface Door {
  port: number;
  pairing: InstanceType<typeof PocketPairing>;
  verifier: InstanceType<typeof PocketRequestVerifier>;
  identity: PocketIdentity;
  phones: PocketPhoneFields[];
  clock: { now: number };
  quitting: { yes: boolean };
  /**
   * The door that accepted each request, as `./bind.ts` hands it to the
   * handler (the Phase 316.1 fix round).
   */
  stopping: { yes: boolean };
  /**
   * An answer held open inside its composition, where the refresh awaits in
   * the shipping composer. `reached` counts the answers that got there.
   */
  hold: { gate: Promise<void> | null; reached: number };
}

interface Reply {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

async function withDoor(fn: (door: Door, call: Caller) => Promise<void>): Promise<void> {
  const identity = newIdentity().identity;
  const phones: PocketPhoneFields[] = [];
  const clock = { now: 5_000_000 };
  const quitting = { yes: false };
  const stopping = { yes: false };
  const hold: Door['hold'] = { gate: null, reached: 0 };
  const fields: PocketExecutionFields = {
    bindAddress: '127.0.0.1',
    port: 0,
    bindAtLaunch: false,
    routes: POCKET_ROUTE_IDS,
    phones,
    pushAlerts: false
  };
  const pairing = new PocketPairing({
    identity: () => identity,
    fieldsNow: () => ({ ...fields, phones: [...phones] }),
    savePhones: (next) => {
      phones.length = 0;
      phones.push(...next);
      return true;
    },
    // QR v:2 (Phase 316): the pin a listening door hands the window.
    publicKeyPin: () => 'p316-a-listening-door',
    now: () => clock.now
  });
  const verifier = new PocketRequestVerifier({
    identity: () => identity,
    phones: () => phones,
    now: () => clock.now
  });
  const routes = createPocketRoutes(FACTS);
  let bound = 0;
  const handler = createPocketHandler({
    boundAddress: () => '127.0.0.1',
    boundPort: () => bound,
    shuttingDown: () => quitting.yes,
    pairingWindowOpen: () => pairing.windowOpen(),
    present: (body, from) => pairing.present(body, from),
    verify: (input) => {
      const verdict = verifier.verify(input);
      return verdict.ok
        ? { ok: true, phoneId: verdict.phone.id }
        : { ok: false, reason: verdict.reason };
    },
    stillPaired: (phoneId) => phones.some((p) => p.id === phoneId),
    answer: async (route, query) => {
      hold.reached += 1;
      if (hold.gate !== null) await hold.gate;
      switch (route.id) {
        case 'blocked':
          return routes.blocked();
        case 'session': {
          const id = query.get('id');
          return id === null ? null : await routes.session(id);
        }
        case 'turns': {
          const id = query.get('id');
          return id === null ? null : await routes.turns(id, { limit: query.get('limit') });
        }
        case 'pair':
          return null;
      }
    }
  });

  const server: Server = createServer((req, res) => {
    void handler(req, res, { stopping: () => stopping.yes });
  });
  try {
    bound = await new Promise<number>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        resolve((server.address() as { port: number }).port);
      });
    });
    const call = makeCaller(bound);
    await fn(
      { port: bound, pairing, verifier, identity, phones, clock, quitting, stopping, hold },
      call
    );
  } finally {
    // EVERY listener this file opens is closed here, whatever happened.
    await new Promise<void>((resolve) => {
      server.closeAllConnections?.();
      server.close(() => resolve());
    });
  }
}

interface CallOptions {
  method?: string;
  path?: string;
  body?: string | Buffer;
  headers?: Record<string, string>;
}

type Caller = (options: CallOptions) => Promise<Reply>;

function makeCaller(port: number): Caller {
  return (options) =>
    new Promise<Reply>((resolve, reject) => {
      const body = options.body ?? '';
      const req = httpRequest(
        {
          host: '127.0.0.1',
          port,
          method: options.method ?? 'GET',
          path: options.path ?? '/v1/blocked',
          headers: {
            'content-length': String(Buffer.byteLength(body)),
            ...(options.headers ?? {})
          }
        },
        (res) => {
          let text = '';
          res.setEncoding('utf8');
          res.on('data', (chunk: string) => {
            text += chunk;
          });
          res.on('end', () =>
            resolve({
              status: res.statusCode ?? 0,
              headers: res.headers,
              body: text
            })
          );
        }
      );
      req.on('error', reject);
      req.end(body);
    });
}

/** The signed request a phone makes. The canonical string is spelled here. */
function signed(
  door: Door,
  phone: FakePhone,
  options: CallOptions & { nonce?: string; timestamp?: string } = {}
): CallOptions {
  const method = options.method ?? 'GET';
  const path = options.path ?? '/v1/blocked';
  const body = Buffer.from(options.body ?? '');
  const timestamp = options.timestamp ?? String(door.clock.now);
  const nonce = options.nonce ?? b64u(randomBytes(16));
  const binding = pairingBinding(door.identity, {
    id: phoneIdOf(phone.signPublic),
    label: phone.label,
    signingKey: phone.signPublic,
    exchangeKey: phone.exchangePublic,
    address: '127.0.0.1',
    pushToken: '',
    pushEnvironment: ''
  });
  const text = [
    'tortie-pocket-req-v1',
    method.toUpperCase(),
    path,
    createHash('sha256').update(body).digest('hex'),
    timestamp,
    nonce,
    binding
  ].join('\n');
  return {
    method,
    path,
    ...(options.body !== undefined ? { body: options.body } : {}),
    headers: {
      [POCKET_HEADERS.phone]: phoneIdOf(phone.signPublic),
      [POCKET_HEADERS.timestamp]: timestamp,
      [POCKET_HEADERS.nonce]: nonce,
      [POCKET_HEADERS.signature]: b64u(
        signWith(null, Buffer.from(text, 'utf8'), phone.sign)
      ),
      ...(options.headers ?? {})
    }
  };
}

/** Pair a phone the way a phone pairs, ending with the person's allow. */
async function pair(door: Door, call: Caller, phone: FakePhone): Promise<void> {
  const offer = door.pairing.open({ tailnetKey: null });
  const secret = (JSON.parse(offer.payload) as { ps: string }).ps;
  const reply = await call({
    method: 'POST',
    path: '/pair',
    body: sealPresentation(secret, phone)
  });
  expect(reply.status).toBe(200);
  expect(JSON.parse(reply.body)).toEqual({ state: 'pending' });
  const next = door.pairing.fieldsWithPending();
  const { describePocketDoor, POCKET_CONFIRM_ACKNOWLEDGEMENT } = await import(
    '../pairing'
  );
  const summary = describePocketDoor(next);
  const outcome = door.pairing.allow({
    acknowledgement: POCKET_CONFIRM_ACKNOWLEDGEMENT,
    linesRead: summary.lines,
    hashRead: summary.hash
  });
  expect(outcome.allowed).toBe(true);
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'p313-server-'));
  logged.length = 0;
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------

describe('a phone that pairs can read the three questions', () => {
  it('pairs, lists, reads one session and reads its turns', async () => {
    await withDoor(async (door, call) => {
      const phone = makePhone('Greg iPhone');
      await pair(door, call, phone);

      const list = await call(signed(door, phone, { path: '/v1/blocked' }));
      expect(list.status).toBe(200);
      const blocked = JSON.parse(list.body) as {
        rows: { sessionId: string; statusLabel: string; question: string }[];
        emptyLine: string;
      };
      expect(blocked.rows.map((r) => r.sessionId)).toEqual(['s1']);
      expect(blocked.rows[0]?.statusLabel).toBe('needs input');
      expect(blocked.rows[0]?.question).toBe('May I run the tests?');

      const one = await call(signed(door, phone, { path: '/v1/session?id=s1' }));
      expect(one.status).toBe(200);
      const detail = JSON.parse(one.body) as {
        session: { name: string; catchUp: { outcome: string } };
      };
      expect(detail.session.name).toBe('one');
      expect(detail.session.catchUp.outcome).toBe('Done, and git agrees');

      const turns = await call(signed(door, phone, { path: '/v1/turns?id=s1' }));
      expect(turns.status).toBe(200);
      expect(JSON.parse(turns.body)).toMatchObject({ sessionId: 's1', more: false });
    });
  });

  it('puts Referrer-Policy and no-store on every answer, and never a cookie', async () => {
    await withDoor(async (door, call) => {
      const phone = makePhone();
      await pair(door, call, phone);
      const ok = await call(signed(door, phone));
      const refused = await call({ path: '/nope' });
      for (const reply of [ok, refused]) {
        expect(reply.headers['referrer-policy']).toBe('no-referrer');
        expect(reply.headers['cache-control']).toBe('no-store');
        expect(reply.headers['x-content-type-options']).toBe('nosniff');
        expect(reply.headers['set-cookie']).toBeUndefined();
      }
    });
  });

  it('never puts a token in any url it needs, and needs no Authorization', async () => {
    await withDoor(async (door, call) => {
      const phone = makePhone();
      await pair(door, call, phone);
      const options = signed(door, phone, { path: '/v1/session?id=s1' });
      // The path a phone sends carries an id a person could read over their
      // shoulder and nothing else. No 32-hex token, no key, no secret.
      expect(options.path).toBe('/v1/session?id=s1');
      expect(/[0-9a-f]{32}/.test(options.path ?? '')).toBe(false);
      expect(Object.keys(options.headers ?? {})).not.toContain('authorization');
      const reply = await call(options);
      expect(reply.status).toBe(200);
    });
  });
});

// ---------------------------------------------------------------------------

describe('the hostile client is refused, and told nothing', () => {
  it('refuses a route that does not exist', async () => {
    await withDoor(async (door, call) => {
      const phone = makePhone();
      await pair(door, call, phone);
      for (const path of ['/', '/v1', '/v1/blocked/', '/v1/sessions', '/admin']) {
        const reply = await call(signed(door, phone, { path }));
        expect(reply.status).toBe(404);
        expect(reply.body).toBe('');
      }
    });
  });

  it('refuses a request that asks to SET anything', async () => {
    await withDoor(async (door, call) => {
      const phone = makePhone();
      await pair(door, call, phone);
      // There is no write route, so every shape of one is simply not a route.
      for (const [method, path] of [
        ['POST', '/v1/status'],
        ['POST', '/v1/session'],
        ['PUT', '/v1/blocked'],
        ['DELETE', '/v1/session'],
        ['POST', '/v1/end']
      ] as const) {
        const reply = await call(signed(door, phone, { method, path }));
        expect(reply.status).toBe(404);
      }
    });
  });

  it('refuses an unsigned request', async () => {
    await withDoor(async (door, call) => {
      const phone = makePhone();
      await pair(door, call, phone);
      expect((await call({ path: '/v1/blocked' })).status).toBe(404);
    });
  });

  it('refuses a bearer token, which is not a thing this door has', async () => {
    await withDoor(async (door, call) => {
      const phone = makePhone();
      await pair(door, call, phone);
      const reply = await call({
        path: '/v1/blocked',
        headers: { authorization: `Bearer ${b64u(randomBytes(32))}` }
      });
      expect(reply.status).toBe(404);
    });
  });

  it('refuses a replayed request, byte for byte', async () => {
    await withDoor(async (door, call) => {
      const phone = makePhone();
      await pair(door, call, phone);
      const options = signed(door, phone);
      expect((await call(options)).status).toBe(200);
      expect((await call(options)).status).toBe(404);
    });
  });

  it('refuses a timestamp outside the window', async () => {
    await withDoor(async (door, call) => {
      const phone = makePhone();
      await pair(door, call, phone);
      const stale = signed(door, phone, {
        timestamp: String(door.clock.now - 10 * 60_000)
      });
      expect((await call(stale)).status).toBe(404);
    });
  });

  it('refuses a phone whose stored address is not where it is calling from', async () => {
    await withDoor(async (door, call) => {
      const phone = makePhone();
      await pair(door, call, phone);
      expect((await call(signed(door, phone))).status).toBe(200);
      // The phone moved, or somebody else is using its key from elsewhere.
      const only = door.phones[0];
      if (only !== undefined) {
        door.phones[0] = { ...only, address: '100.64.0.250' };
      }
      expect((await call(signed(door, phone))).status).toBe(404);
    });
  });

  it('refuses a phone nobody allowed, holding a key of its own', async () => {
    await withDoor(async (door, call) => {
      const allowed = makePhone('allowed');
      await pair(door, call, allowed);
      const stranger = makePhone('stranger');
      expect((await call(signed(door, stranger))).status).toBe(404);
    });
  });

  it('refuses a stale key after the person removed that phone', async () => {
    await withDoor(async (door, call) => {
      const phone = makePhone();
      await pair(door, call, phone);
      expect((await call(signed(door, phone))).status).toBe(200);
      door.phones.length = 0;
      door.verifier.forget(phoneIdOf(phone.signPublic));
      expect((await call(signed(door, phone))).status).toBe(404);
    });
  });

  it('refuses a Host header that is not this door', async () => {
    await withDoor(async (door, call) => {
      const phone = makePhone();
      await pair(door, call, phone);
      for (const host of ['evil.example', '127.0.0.1:1', '100.64.0.1', 'localhost']) {
        const reply = await call({
          ...signed(door, phone),
          headers: { ...signed(door, phone).headers, host }
        });
        expect(reply.status).toBe(404);
      }
    });
  });

  it('refuses a request with NO Host header at all', async () => {
    // Node's own client always writes one, so this is spoken down a raw socket
    // as HTTP/1.0 — which is exactly the shape a hand-written client has.
    await withDoor(async (door) => {
      const status = await new Promise<number>((resolve, reject) => {
        const socket = connect(door.port, '127.0.0.1', () => {
          socket.write('GET /v1/blocked HTTP/1.0\r\n\r\n');
        });
        let text = '';
        socket.setEncoding('utf8');
        socket.on('data', (chunk: string) => {
          text += chunk;
        });
        socket.on('error', reject);
        socket.on('close', () => {
          const line = /^HTTP\/1\.[01] (\d{3})/.exec(text);
          resolve(line === null ? 0 : Number(line[1]));
        });
      });
      expect(status).toBe(404);
    });
  });

  it('refuses a body over the cap, dropped whole rather than truncated', async () => {
    await withDoor(async (door, call) => {
      const phone = makePhone();
      await pair(door, call, phone);
      const big = 'x'.repeat(POCKET_READ_BODY_CAP_BYTES + 1);
      const reply = await call(signed(door, phone, { body: big }));
      expect(reply.status).toBe(404);
      expect(reply.body).toBe('');
    });
  });

  it('refuses a 10 MiB body on the pairing route', async () => {
    await withDoor(async (door, call) => {
      door.pairing.open({ tailnetKey: null });
      const reply = await call({
        method: 'POST',
        path: '/pair',
        body: Buffer.alloc(10 * 1024 * 1024, 0x61)
      });
      expect(reply.status).toBe(404);
      expect(reply.body).toBe('');
    });
  });

  it('refuses /pair outside a window, and after the window shut', async () => {
    await withDoor(async (door, call) => {
      const phone = makePhone();
      // No window has ever been opened.
      expect(
        (
          await call({
            method: 'POST',
            path: '/pair',
            body: sealPresentation(b64u(randomBytes(16)), phone)
          })
        ).status
      ).toBe(404);
      const offer = door.pairing.open({ tailnetKey: null });
      const secret = (JSON.parse(offer.payload) as { ps: string }).ps;
      door.clock.now += POCKET_PAIRING_WINDOW_MS + 1;
      expect(
        (
          await call({
            method: 'POST',
            path: '/pair',
            body: sealPresentation(secret, phone)
          })
        ).status
      ).toBe(404);
    });
  });

  it('refuses a presentation that never saw the QR', async () => {
    await withDoor(async (door, call) => {
      door.pairing.open({ tailnetKey: null });
      const reply = await call({
        method: 'POST',
        path: '/pair',
        body: sealPresentation(b64u(randomBytes(16)), makePhone())
      });
      // The route exists and the window is open, so it answers — with the one
      // word it is allowed to say, and nothing is pending afterwards.
      expect(reply.status).toBe(200);
      expect(JSON.parse(reply.body)).toEqual({ state: 'refused' });
      expect(door.pairing.view().state).toBe('waiting');
    });
  });

  it('refuses everything once the quit has begun', async () => {
    await withDoor(async (door, call) => {
      const phone = makePhone();
      await pair(door, call, phone);
      door.quitting.yes = true;
      expect((await call(signed(door, phone))).status).toBe(404);
      expect((await call({ method: 'POST', path: '/pair', body: '{}' })).status).toBe(
        404
      );
    });
  });

  // THE PHASE 316.1 FIX ROUND. A Remove, or a door that stops, while the
  // phone's request is INSIDE its composition: the answer is composed (the
  // held gate is where the shipping composer awaits the refresh) and must
  // still not leave. Each is asserted on its refusal reason, read off the
  // handler's own once-per-reason log line, and each has a control that
  // answers, so a door that is merely closed cannot pass.
  it('answers a request held inside its composition when nothing changed (the control)', async () => {
    await withDoor(async (door, call) => {
      const phone = makePhone();
      await pair(door, call, phone);
      let release = (): void => undefined;
      door.hold.gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const inFlight = call(signed(door, phone, { path: '/v1/session?id=s1' }));
      await vi.waitFor(() => expect(door.hold.reached).toBe(1));
      release();
      expect((await inFlight).status).toBe(200);
    });
  });

  it('refuses, unpaired, an answer composed for a phone removed while it was in flight', async () => {
    await withDoor(async (door, call) => {
      const phone = makePhone();
      await pair(door, call, phone);
      let release = (): void => undefined;
      door.hold.gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const inFlight = call(signed(door, phone, { path: '/v1/session?id=s1' }));
      await vi.waitFor(() => expect(door.hold.reached).toBe(1));
      // The person presses Remove: the phone leaves the set the verifier and
      // the last check both read.
      door.phones.length = 0;
      door.verifier.forget(phoneIdOf(phone.signPublic));
      release();
      const reply = await inFlight;
      expect(reply.status).toBe(404);
      expect(reply.body).toBe('');
      expect(logged).toContain('warn refused a request on the tailnet door: unpaired');
      expect(logged.some((l) => l.endsWith(': shutdown'))).toBe(false);
    });
  });

  it('refuses an answer composed while the door that accepted it began to stop', async () => {
    await withDoor(async (door, call) => {
      const phone = makePhone();
      await pair(door, call, phone);
      let release = (): void => undefined;
      door.hold.gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const inFlight = call(signed(door, phone, { path: '/v1/turns?id=s1' }));
      await vi.waitFor(() => expect(door.hold.reached).toBe(1));
      // The person switched the door off; the quit has NOT begun, so only the
      // door instance knows.
      door.stopping.yes = true;
      release();
      const reply = await inFlight;
      expect(reply.status).toBe(404);
      expect(door.quitting.yes).toBe(false);
      expect(logged).toContain('warn refused a request on the tailnet door: shutdown');
      expect(logged.some((l) => l.endsWith(': unpaired'))).toBe(false);
    });
  });

  it('refuses a session id nobody has, and never says which it had', async () => {
    await withDoor(async (door, call) => {
      const phone = makePhone();
      await pair(door, call, phone);
      const reply = await call(signed(door, phone, { path: '/v1/session?id=nope' }));
      expect(reply.status).toBe(404);
      expect(reply.body).toBe('');
      const missing = await call(signed(door, phone, { path: '/v1/session' }));
      expect(missing.status).toBe(404);
    });
  });
});
