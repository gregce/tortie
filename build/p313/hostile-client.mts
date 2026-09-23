/**
 * The scripted hostile phone (Phase 313) — this phase's proof, and it runs in
 * the ordinary battery.
 *
 * NO SWIFT, NO APPLE, NO PHONE. It is a node client that pairs honestly with
 * the SHIPPING door, reads what the door will answer, and then attacks it
 * thirteen ways. Every arm asserts a REFUSAL WITH ITS REASON, because a refusal
 * that answers the wrong word is a refusal nobody can act on and a door whose
 * reasons all collapse to one is a door with one check.
 *
 * WHAT IT BINDS. TWO TLS listeners on `127.0.0.1`, each on a port it found for
 * itself by opening an ephemeral socket and closing it. The first is the door
 * every arm below drives, with the self-origin refusal off because under
 * loopback every client IS the bind address; the second is arm 15's, with that
 * refusal ON, and it exists for one arm. Both are ended in a `finally`, and the
 * second is also stopped inside its own arm.
 * **It never touches a real interface**, it starts no Electron, no tmux, no
 * ssh and no agent, it reads nothing under the person's home, and its one write
 * is a self-signed scratch identity under a `mkdtemp` that is removed in a
 * `finally`. That identity's key is generated for this run and is worth nothing
 * after it; no operator credential is read, and no key, signature or nonce
 * BYTE is printed, logged or compared by anything but sha256.
 *
 * WHAT IT DOES NOT PROVE, said rather than hidden. The TLS handshake itself,
 * the tailnet bind, and the real `os.networkInterfaces()` answer are not driven
 * here — the client replaces nothing about TLS but it does drive a certificate
 * this run generated, and the address is loopback by construction. `probe:p313`
 * is where those live. What IS driven here is every byte of the admission and
 * route path, over the real listener, with the real verifier and the real
 * pairing window.
 *
 * WHY THE ALLOW STEP IS NOT DRIVEN. `PocketPairing.allow` writes a sealed
 * confirmation record, which needs the OS keystore and therefore Electron. The
 * phone set AFTER a person allowed is plain data, so this client builds that
 * state directly and attacks the request path, which is its subject. The
 * pairing WINDOW and `present` are driven for real.
 *
 * It prints one line, `P313_HOSTILE:{...}`, which the runner beside it reads.
 */

import { createServer as createPlainServer } from 'node:net';
import { request as httpsRequest } from 'node:https';
import {
  createCipheriv,
  createHash,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  type KeyObject
} from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// Arm 15 speaks to its door by hand rather than through `ask()`, because what
// it measures is a socket that never becomes an HTTP conversation at all.
import { connect as tlsConnect } from 'node:tls';

import {
  ensureDoorIdentity,
  type IdentityOptions,
  type IdentitySealPort
} from '../../src/main/pocket/tls.js';
import { PocketDoor } from '../../src/main/pocket/bind.js';
import {
  createPocketHandler,
  POCKET_READ_BODY_CAP_BYTES,
  type PocketHandlerDeps
} from '../../src/main/pocket/server.js';
import { POCKET_ROUTES, type PocketRoute } from '../../src/main/pocket/routes.js';
import {
  PocketPairing,
  PocketRequestVerifier,
  POCKET_HEADERS,
  POCKET_REQUEST_ALGORITHM,
  canonicalRequestText,
  newIdentity,
  phoneIdOf,
  signAsPhone,
  type PocketIdentity,
  type PocketPhoneFields
} from '../../src/main/pocket/pairing.js';

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

interface Arm {
  n: string;
  name: string;
  /** What the door must answer. */
  want: string;
  got: string;
  ok: boolean;
  why: string;
}

const arms: Arm[] = [];
const problems: string[] = [];
const record = (n: string, name: string, want: string, got: string, why: string): void => {
  arms.push({ n, name, want, got, ok: want === got, why });
  if (want !== got) {
    problems.push(`${n} "${name}": the door answered ${JSON.stringify(got)} where ${JSON.stringify(want)} was required. ${why}`);
  }
};

// ---------------------------------------------------------------------------
// The phone, written from the outside
// ---------------------------------------------------------------------------

const b64u = (buf: Buffer): string => buf.toString('base64url');

/**
 * A phone's key material, made here rather than taken from the door's own
 * helpers, so the two sides of every signature are two implementations.
 */
function makePhone(label: string, address: string, doorExchangePublic: string): {
  fields: PocketPhoneFields;
  signPrivate: KeyObject;
  binding: string;
} {
  const signing = generateKeyPairSync('ed25519');
  const exchange = generateKeyPairSync('x25519');
  const signingKey = b64u(signing.publicKey.export({ type: 'spki', format: 'der' }));
  const exchangeKey = b64u(exchange.publicKey.export({ type: 'spki', format: 'der' }));
  // THE BINDING, DERIVED FROM THE PHONE'S SIDE. The door derives it from its own
  // private key and this public one; this derives it from this private key and
  // the door's public one. They must agree, and nothing but Diffie-Hellman
  // makes them agree, so an equal answer is evidence rather than a copy.
  const shared = diffieHellman({
    privateKey: exchange.privateKey,
    publicKey: createPublicKey({
      key: Buffer.from(doorExchangePublic, 'base64url'),
      format: 'der',
      type: 'spki'
    })
  });
  const binding = Buffer.from(
    hkdfSync(
      'sha256',
      shared,
      Buffer.from(`${doorExchangePublic}\n${exchangeKey}`, 'utf8'),
      'tortie-pocket-bind-v1',
      32
    )
  ).toString('hex');
  return {
    fields: {
      id: phoneIdOf(signingKey),
      label,
      signingKey,
      exchangeKey,
      address,
      pushToken: '',
      pushEnvironment: ''
    },
    signPrivate: signing.privateKey,
    binding
  };
}

/**
 * The canonical string, written out here rather than imported.
 *
 * It is the second implementation of the one thing both sides must agree on.
 * Arm 16 holds it against the door's own, byte for byte, so this client cannot
 * pass by signing whatever the door happens to check.
 */
function canonicalHere(
  method: string,
  target: string,
  body: Buffer,
  timestamp: string,
  nonce: string,
  binding: string
): string {
  return [
    POCKET_REQUEST_ALGORITHM,
    method.toUpperCase(),
    target,
    createHash('sha256').update(body).digest('hex'),
    timestamp,
    nonce,
    binding
  ].join('\n');
}

// ---------------------------------------------------------------------------
// The wire
// ---------------------------------------------------------------------------

interface Answer {
  status: number;
  body: string;
  /** Set when the socket never produced an answer. Status is then 0. */
  error?: string;
}

let port = 0;
/**
 * The certificate this client pins, sha256 of the DER, set once the door has an
 * identity. Nothing is accepted before it is set.
 *
 * The door's certificate is self-signed and in no trust store, which is the
 * design — research 127 §5's door table: "Tortie terminates its own, with a key
 * sealed under safeStorage; its fingerprint rides in the pairing QR and the app
 * pins it." So the client turns the CA check off and PINS INSTEAD, which is
 * strictly stronger here than a CA path would be: only this exact certificate
 * is accepted, and a man in the middle presenting a perfectly valid certificate
 * for some other key is refused.
 */
let pinnedFingerprint: string | null = null;

/** The peer's certificate, or a sentence saying why it is not the pinned one. */
function checkPin(peer: { raw?: Buffer } | undefined): Error | undefined {
  if (pinnedFingerprint === null) return new Error('nothing is pinned yet');
  const raw = peer?.raw;
  if (raw === undefined) return new Error('the door presented no certificate');
  const got = createHash('sha256').update(raw).digest('hex');
  return got === pinnedFingerprint
    ? undefined
    : new Error('the door presented a certificate that is not the pinned one');
}

function ask(
  method: string,
  target: string,
  headers: Record<string, string>,
  body: Buffer | null
): Promise<Answer> {
  // IT NEVER REJECTS. One arm that cannot reach the door must not end the run,
  // because the thirteen arms below it are the proof and a refusal that arrives
  // as a dead socket is itself a reading worth having.
  return new Promise((resolve) => {
    const reject = (err: Error): void => resolve({ status: 0, body: '', error: err.message });
    const req = httpsRequest(
      {
        host: '127.0.0.1',
        port,
        method,
        path: target,
        // EVERY REQUEST GETS ITS OWN SOCKET. The default agent pools them, and
        // a pooled socket fires `secureConnect` once, so the pin below would be
        // checked on the first request of a run and on no other — which is the
        // shape of a check that is not one.
        agent: false,
        // The certificate is one this run generated seconds ago and is in no
        // trust store, because the door signs its own. So the CA path is off
        // and the FINGERPRINT is checked instead — which is what a paired phone
        // does, and which refuses a valid certificate for the wrong key where a
        // CA check would accept it.
        rejectUnauthorized: false,
        headers
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () =>
          resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') })
        );
      }
    );
    // THE PIN, CHECKED BY HAND. `checkServerIdentity` is never called when the
    // CA path is off, so the comparison happens here, on the secure socket,
    // before a byte of the answer is read — and a mismatch ends the socket.
    req.on('socket', (socket) => {
      socket.on('secureConnect', () => {
        const peer = (socket as unknown as { getPeerCertificate?: () => { raw?: Buffer } })
          .getPeerCertificate?.();
        const bad = checkPin(peer);
        if (bad !== undefined) {
          socket.destroy();
          reject(bad);
        }
      });
    });
    req.on('error', reject);
    if (body !== null) req.write(body);
    req.end();
  });
}

/** One signed request, from a phone that signs honestly unless told otherwise. */
async function signedAsk(
  phone: { fields: PocketPhoneFields; signPrivate: KeyObject; binding: string },
  target: string,
  options: {
    signedTarget?: string;
    signedBody?: Buffer;
    body?: Buffer;
    timestamp?: string;
    nonce?: string;
    omit?: (keyof typeof POCKET_HEADERS)[];
  } = {}
): Promise<Answer> {
  const body = options.body ?? Buffer.alloc(0);
  const timestamp = options.timestamp ?? String(Date.now());
  const nonce = options.nonce ?? randomBytes(12).toString('hex');
  const signature = signAsPhone(phone.signPrivate, {
    method: 'GET',
    target: options.signedTarget ?? target,
    bodySha256: createHash('sha256').update(options.signedBody ?? body).digest('hex'),
    timestamp,
    nonce,
    binding: phone.binding
  });
  const headers: Record<string, string> = {
    [POCKET_HEADERS.phone]: phone.fields.id,
    [POCKET_HEADERS.timestamp]: timestamp,
    [POCKET_HEADERS.nonce]: nonce,
    [POCKET_HEADERS.signature]: signature
  };
  for (const name of options.omit ?? []) delete headers[POCKET_HEADERS[name]];
  // A LENGTH RATHER THAN A CHUNKED ENCODING. A GET with a body is exactly the
  // shape an attacker sends, and node writes it chunked when no length is
  // given; the door then answers and ends while the client is still writing,
  // and the reading comes back as a dead socket instead of the refusal the
  // door actually made. The length is what an ordinary client sends.
  if (body.length > 0) headers['content-length'] = String(body.length);
  return ask('GET', target, headers, body.length > 0 ? body : null);
}

/** What the door answered, as a word: `ok`, `refused-<status>`, or a dead socket. */
function verdict(answer: Answer): string {
  if (answer.status === 200) return 'ok';
  if (answer.status === 0) return `nosocket-${answer.error ?? 'unknown'}`;
  return `refused-${String(answer.status)}`;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

const scratch = mkdtempSync(join(tmpdir(), 'p313-hostile-'));
let door: PocketDoor | null = null;
/**
 * The SECOND door, arm 15's, with the self-origin refusal turned ON.
 *
 * It exists for one arm and it is stopped inside that arm and again in the
 * `finally`, because a listener this script left behind would be a listener on
 * every commit.
 */
let selfDoor: PocketDoor | null = null;
let probePort: ReturnType<typeof createPlainServer> | null = null;

/**
 * A seal that seals nothing.
 *
 * The identity this run generates is a throwaway for a loopback listener and is
 * destroyed with the scratch directory. It is NOT a credential of the person's,
 * and no real seal is reachable without Electron.
 */
const openSeal: IdentitySealPort = {
  available: () => true,
  seal: (text) => text,
  open: (blob) => (typeof blob === 'string' ? blob : null)
};

async function freePort(): Promise<number> {
  return await new Promise((resolve, reject) => {
    const server = createPlainServer();
    probePort = server;
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const found = typeof address === 'object' && address !== null ? address.port : 0;
      server.close(() => {
        probePort = null;
        resolve(found);
      });
    });
  });
}

try {
  port = await freePort();
  if (port === 0) throw new Error('no ephemeral port was free on 127.0.0.1');

  const doorIdentity: PocketIdentity = newIdentity().identity;
  let phones: PocketPhoneFields[] = [];
  const pairing = new PocketPairing({
    identity: () => doorIdentity,
    fieldsNow: () => ({
      bindAddress: '127.0.0.1',
      port,
      bindAtLaunch: false,
      routes: POCKET_ROUTES.map((r) => r.id),
      phones,
      pushAlerts: false
    }),
    savePhones: (next) => {
      phones = [...next];
      return true;
    },
    certificateFingerprint: () => pinnedFingerprint
  });
  const verifier = new PocketRequestVerifier({
    identity: () => doorIdentity,
    phones: () => phones
  });

  const FACTS = {
    blocked: [{ sessionId: 'ses_1', name: 'fix-login', age: '2m' }],
    session: { sessionId: 'ses_1', name: 'fix-login' },
    turns: [{ who: 'you', text: 'make the cookie httpOnly' }]
  };

  door = new PocketDoor();
  const deps: PocketHandlerDeps = {
    boundAddress: () => door?.address ?? null,
    boundPort: () => door?.port ?? 0,
    shuttingDown: () => door?.shutdownStarted ?? true,
    pairingWindowOpen: () => pairing.windowOpen(),
    present: (body, from) => pairing.present(body, from),
    verify: (input) => {
      const v = verifier.verify(input);
      return v.ok ? { ok: true } : { ok: false, reason: v.reason };
    },
    answer: async (route: PocketRoute) => {
      if (route.id === 'blocked') return FACTS.blocked;
      if (route.id === 'session') return FACTS.session;
      if (route.id === 'turns') return FACTS.turns;
      return null;
    }
  };

  const started = await door.start({
    port,
    handle: createPocketHandler(deps),
    // The identity is made under a seal that seals nothing, into a scratch
    // directory removed in the `finally`. It is a throwaway for a loopback
    // listener and is worth nothing after this run.
    identity: (options: IdentityOptions) => ensureDoorIdentity({ ...options, seal: openSeal }),
    identityPath: join(scratch, 'identity.json'),
    // THE ONE HARNESS SEAM. Under loopback every client IS this machine, so
    // the self-origin refusal that protects the door on a tailnet would refuse
    // the proof as well. `bind.ts` carries the seam deliberately and defaults
    // it to ON for a tailnet bind; `probe:p313` is where the refusal itself is
    // driven, because only a real second address can drive it.
    refuseSelfOrigin: false
  });
  if (!started.ok) throw new Error(`the door refused to start: ${started.reason} — ${started.sentence}`);
  pinnedFingerprint = started.certificateFingerprint.replace(/[^0-9a-f]/gi, '').toLowerCase();

  // -------------------------------------------------------------------------
  // 0. It answers at all, and it answers the honest phone
  // -------------------------------------------------------------------------

  const offer = pairing.open();
  const qr = JSON.parse(offer.payload) as Record<string, unknown>;
  const secret = Buffer.from(String(qr['ps']), 'base64url');
  const doorExchangePublic = String(qr['dx']);

  /**
   * Seal a presentation the way a phone does, under the QR's one-shot secret.
   * `push` is the Phase 314 half, `apt` and `ape`, spelled here from the wire
   * format and never through the door's own sealing helper.
   */
  const present = (
    label: string,
    signingKey: string,
    exchangeKey: string,
    withSecret = secret,
    push: Record<string, unknown> = {}
  ): Buffer => {
    const key = Buffer.from(hkdfSync('sha256', withSecret, Buffer.alloc(0), 'tortie-pocket-pair-v1', 32));
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const plain = Buffer.from(JSON.stringify({ label, ek: signingKey, xk: exchangeKey, ...push }), 'utf8');
    const ct = Buffer.concat([cipher.update(plain), cipher.final()]);
    return Buffer.from(
      JSON.stringify({ iv: b64u(iv), ct: b64u(ct), tag: b64u(cipher.getAuthTag()) }),
      'utf8'
    );
  };

  const good = makePhone('the honest phone', '127.0.0.1', doorExchangePublic);
  const paired = await ask(
    'POST',
    '/pair',
    { 'content-type': 'application/json' },
    present(good.fields.label, good.fields.signingKey, good.fields.exchangeKey)
  );
  record(
    '0a',
    'an honest phone presents inside the window',
    'ok',
    verdict(paired),
    'the pairing route must answer a phone that sealed its presentation under the QR’s own secret.'
  );
  record(
    '0b',
    'presenting ALLOWS nothing on its own',
    'pending',
    (JSON.parse(paired.body || '{}') as { state?: string }).state ?? 'none',
    'the human confirms on the Mac, LAST. A phone that has presented must not be able to read anything yet.'
  );

  // The person allowed it. That step seals a record and needs the keystore, so
  // the state it produces is built here and the request path is what is driven.
  phones = [good.fields];

  for (const target of ['/v1/blocked', '/v1/session?id=ses_1', '/v1/turns?id=ses_1']) {
    const answer = await signedAsk(good, target);
    record(
      `0c${target}`,
      `an allowed phone reads ${target}`,
      'ok',
      verdict(answer),
      'the three reads are what this door is for; if they do not answer, nothing below means anything.'
    );
  }

  // -------------------------------------------------------------------------
  // The attacks
  // -------------------------------------------------------------------------

  // 1. A stale key: a phone that was never allowed, signing perfectly.
  const stale = makePhone('a phone nobody allowed', '127.0.0.1', doorExchangePublic);
  record(
    '1',
    'a stale key — a phone nobody allowed, signing perfectly',
    'refused-404',
    verdict(await signedAsk(stale, '/v1/blocked')),
    'a key is not an admission. Only the set the person confirmed may ask.'
  );

  // 2. A replayed pairing: the window is shut and the same sealed body is sent.
  pairing.cancel();
  record(
    '2',
    'a replayed pairing after the window shut',
    'refused-404',
    verdict(
      await ask(
        'POST',
        '/pair',
        { 'content-type': 'application/json' },
        present(good.fields.label, good.fields.signingKey, good.fields.exchangeKey)
      )
    ),
    '/pair is dead outside its window, and a photographed screen must be worth nothing after it shuts.'
  );

  // 3. No signature at all.
  record(
    '3',
    'a request with no signature',
    'refused-404',
    verdict(await ask('GET', '/v1/blocked', {}, null)),
    'there is no bearer and no cookie to fall back on, so an unsigned read is not a read.'
  );

  // 4. A signature over a different body.
  record(
    '4',
    'a signature made over a different body',
    'refused-404',
    verdict(
      await signedAsk(good, '/v1/blocked', {
        body: Buffer.from('{"end":"ses_1"}', 'utf8'),
        signedBody: Buffer.alloc(0)
      })
    ),
    'the body is in the signed bytes, so swapping it after signing must not survive.'
  );

  // 4b. A signature over a different TARGET — the query is in the signature.
  record(
    '4b',
    'a signature made over a different session id',
    'refused-404',
    verdict(
      await signedAsk(good, '/v1/session?id=ses_OTHER', {
        signedTarget: '/v1/session?id=ses_1'
      })
    ),
    'the id rides in the query BECAUSE the table is exact, so the query must be inside the signature.'
  );

  // 5. A route that is not in the table, and the hook server's own shape.
  for (const [n, target, why] of [
    ['5a', '/v1/sessions', 'a path that is nearly a row is not a row'],
    ['5b', '/v1/blocked/', 'a trailing slash is a different string'],
    ['5c', '/V1/BLOCKED', 'case is not folded'],
    ['5d', '/h/0123456789abcdef0123456789abcdef', "the hook server's token-in-a-path shape on the pocket port"],
    ['5e', '/', 'the door serves no page at its root today']
  ] as const) {
    record(
      n,
      `a route that is not in the table: ${target}`,
      'refused-404',
      verdict(await signedAsk(good, target)),
      why
    );
  }

  // 6. A request from an address that is not the paired one.
  const elsewhere = makePhone('the same phone, elsewhere', '100.64.9.9', doorExchangePublic);
  phones = [good.fields, elsewhere.fields];
  record(
    '6',
    'a request from an address that is not the paired one',
    'refused-404',
    verdict(await signedAsk(elsewhere, '/v1/blocked')),
    'a phone may ask from the address it presented from and no other.'
  );
  phones = [good.fields];

  // 7. A second pairing while one is live.
  const second = makePhone('a second phone', '127.0.0.1', doorExchangePublic);
  pairing.open();
  const reopened = JSON.parse(pairing.open().payload) as Record<string, unknown>;
  const liveSecret = Buffer.from(String(reopened['ps']), 'base64url');
  await ask(
    'POST',
    '/pair',
    { 'content-type': 'application/json' },
    present(good.fields.label, good.fields.signingKey, good.fields.exchangeKey, liveSecret)
  );
  const secondAnswer = await ask(
    'POST',
    '/pair',
    { 'content-type': 'application/json' },
    present(second.fields.label, second.fields.signingKey, second.fields.exchangeKey, liveSecret)
  );
  record(
    '7a',
    'a second phone presents while one is already pending',
    'pending',
    (JSON.parse(secondAnswer.body || '{}') as { state?: string }).state ?? 'none',
    'two phones must never both be pending, so the second replaces the first and the sheet is never ambiguous.'
  );
  record(
    '7b',
    'and the sheet shows the SECOND phone',
    second.fields.label,
    pairing.view().label ?? 'none',
    'the person confirms a key they can see; a sheet still showing the first phone would confirm the wrong one.'
  );
  pairing.cancel();

  // 8. A request after the pairing was revoked.
  phones = [];
  record(
    '8',
    'a request after the phone was removed',
    'refused-404',
    verdict(await signedAsk(good, '/v1/blocked')),
    'Remove drops the phone from the set at once, and a phone still on the tailnet reaches a door that refuses it.'
  );
  phones = [good.fields];

  // 9. An oversized body, dropped whole.
  record(
    '9',
    'a body over the cap',
    'refused-404',
    verdict(
      await signedAsk(good, '/v1/blocked', {
        body: Buffer.alloc(POCKET_READ_BODY_CAP_BYTES * 16, 0x41)
      })
    ),
    'a body over the cap is dropped WHOLE and never truncated and parsed, because half a body that parses is a body somebody chose the shape of.'
  );

  // 10. A clock outside the window, both ways.
  for (const [n, at, why] of [
    ['10a', String(Date.now() - 10 * 60_000), 'a captured request replayed ten minutes later'],
    ['10b', String(Date.now() + 10 * 60_000), 'a request from a clock set forward, which is how a nonce window is outrun']
  ] as const) {
    record(n, `a timestamp outside the window (${n === '10a' ? 'behind' : 'ahead'})`, 'refused-404', verdict(await signedAsk(good, '/v1/blocked', { timestamp: at })), why);
  }

  // 11. A replayed nonce — the whole request, byte for byte, twice.
  const onceNonce = randomBytes(12).toString('hex');
  const onceAt = String(Date.now());
  const first = await signedAsk(good, '/v1/blocked', { nonce: onceNonce, timestamp: onceAt });
  record('11a', 'the first use of a nonce', 'ok', verdict(first), 'the honest request must work, or the replay proves nothing.');
  record(
    '11b',
    'the same request again, byte for byte',
    'refused-404',
    verdict(await signedAsk(good, '/v1/blocked', { nonce: onceNonce, timestamp: onceAt })),
    'a nonce is spent once. A signature captured on the wire must be worth nothing.'
  );

  // 12. Each header missing on its own.
  for (const name of ['phone', 'timestamp', 'nonce', 'signature'] as const) {
    record(
      `12-${name}`,
      `the ${name} header missing`,
      'refused-404',
      verdict(await signedAsk(good, '/v1/blocked', { omit: [name] })),
      'every header is required, and a missing one is refused before the expensive check.'
    );
  }

  // 13. A wrong Host header.
  record(
    '13',
    'a Host header that is not the door',
    'refused-404',
    verdict(
      await ask('GET', '/v1/blocked', { host: 'tortie.example.com', [POCKET_HEADERS.phone]: good.fields.id }, null)
    ),
    "the hook server's own check: a request addressed to somebody else is not this door's."
  );

  // 17. THE DEVICE TOKEN'S ONE DOOR IN (Phase 314).
  //
  // The token an alert is addressed to rides inside the sealed presentation,
  // because the route table is closed and gains no route for it. So the one
  // place a hostile token can arrive is `POST /pair`, and a presentation whose
  // `apt` or `ape` is not exactly the shape is refused WHOLE, with the same one
  // word as every other refusal and nothing put in front of the person. An
  // honest one is answered `pending`, and what the person would allow names the
  // token by the first eight of its digest, computed HERE by this client's own
  // sha256 rather than read back from the door.
  {
    const window17 = JSON.parse(pairing.open().payload) as Record<string, unknown>;
    const secret17 = Buffer.from(String(window17['ps']), 'base64url');
    const alerted = makePhone('a phone that asks for alerts', '127.0.0.1', doorExchangePublic);
    const stateOf = (answer: Answer): string =>
      (JSON.parse(answer.body || '{}') as { state?: string }).state ?? `none-${verdict(answer)}`;
    const presentPush = (push: Record<string, unknown>): Promise<Answer> =>
      ask(
        'POST',
        '/pair',
        { 'content-type': 'application/json' },
        present(alerted.fields.label, alerted.fields.signingKey, alerted.fields.exchangeKey, secret17, push)
      );
    record(
      '17a',
      'a presentation whose device token is not hex',
      'refused',
      stateOf(await presentPush({ apt: 'not-a-device-token-'.repeat(4), ape: 'development' })),
      'the token decides where his words go at Apple, so a token that is not the shape is not a token, and the presentation carrying it is refused whole.'
    );
    record(
      '17b',
      'a presentation that names an environment and no token',
      'refused',
      stateOf(await presentPush({ ape: 'production' })),
      'the two travel together or not at all: an environment with no token addresses nothing.'
    );
    record(
      '17c',
      'and neither refusal put a phone in front of the person',
      'waiting',
      pairing.view().state,
      'a refused presentation must leave the sheet exactly as it was, or a hostile body could redraw what the person is asked to allow.'
    );
    const honestToken = createHash('sha256').update('p314-hostile-honest-token').digest('hex');
    record(
      '17d',
      'an honest token and environment, spelled in capitals',
      'pending',
      stateOf(await presentPush({ apt: honestToken.toUpperCase(), ape: 'development' })),
      'a phone that asks for alerts is paired like any other; presenting still allows nothing.'
    );
    const deviceLine =
      `Alerts for "${alerted.fields.label}" go through Apple (development), device ` +
      createHash('sha256').update(honestToken, 'utf8').digest('hex').slice(0, 8);
    record(
      '17e',
      'what the person is asked to allow names that device, by a digest computed here',
      'named',
      pairing.view().lines.includes(deviceLine) ? 'named' : 'not-named',
      'the token is HASHED into what the person confirms, so the sheet must name it, and name the lowercase token the door folded it to.'
    );
    record(
      '17f',
      'and the sheet never carries the token itself',
      'absent',
      JSON.stringify(pairing.view()).toLowerCase().includes(honestToken) ? 'present' : 'absent',
      'the token is an address at Apple and stays in main; the sheet draws eight hex of its digest and nothing more.'
    );
    pairing.cancel();
  }

  // 14. The shutdown is a resource owner.
  const report = await door.stop();
  door = null;
  record(
    '14',
    'the stop joins what it accepted',
    'true',
    String(report.joined),
    'a stop that returns must have no handler still running, or a quit reads main’s state during its own disposal.'
  );
  const afterStop = await ask('GET', '/v1/blocked', {}, null);
  record(
    '14b',
    'and nothing answers after it',
    'refused',
    afterStop.status === 0 ? 'refused' : `answered-${String(afterStop.status)}`,
    'a stopped door is not bound.'
  );

  // 16. RE-DERIVATION. The bytes a signature covers, built twice.
  //
  // The binding is already proved by every honest arm above: it is derived here
  // from the PHONE's private key and the door's public one, and by the door
  // from its own private key and the phone's public one, and a signature only
  // verifies if two independent Diffie-Hellman answers agreed. This arm covers
  // the other half, the framing, so a door that signed six fields and checked
  // five could not pass.
  {
    const body = Buffer.from('{"a":1}', 'utf8');
    const mine = canonicalHere('get', '/v1/session?id=ses_1', body, '1700000000000', 'abcdef0123456789', good.binding);
    const theirs = canonicalRequestText({
      method: 'get',
      target: '/v1/session?id=ses_1',
      bodySha256: createHash('sha256').update(body).digest('hex'),
      timestamp: '1700000000000',
      nonce: 'abcdef0123456789',
      binding: good.binding
    });
    record(
      '16',
      'the signed bytes, built independently, are the door\u2019s own bytes',
      createHash('sha256').update(theirs).digest('hex'),
      createHash('sha256').update(mine).digest('hex'),
      'compared by sha256 so no signing input is printed. A door that signed one framing and checked another would pass every arm above and be forgeable.'
    );
  }

  // 15. THE SELF-ORIGIN REFUSAL, DRIVEN RATHER THAN STATED.
  //
  // It used to record the word "stated", on the argument that under loopback
  // every client IS the bind address so the arm could not be driven here. That
  // was backwards: under loopback every client is the bind address, which makes
  // a loopback door with the refusal turned ON the one place it can be driven
  // cheaply. The fix round measured what the missing arm cost — inverting
  // `isSelfOrigin`'s one `===` to `!==` left this client green and admitted the
  // local socket — so a SECOND door is stood up here with `refuseSelfOrigin:
  // true`, on its own ephemeral loopback port, stopped in the `finally`.
  //
  // THE ASSERTION IS THAT NOTHING WAS ANSWERED AND NOTHING WAS RUN. The socket
  // is destroyed on the `connection` event, before the TLS handshake, so a
  // client sees a dead socket rather than an HTTP status — and the handler this
  // door was given records whether it ever ran, which is the half a status
  // alone cannot prove.
  {
    const selfPort = await freePort();
    if (selfPort === 0) throw new Error('no second ephemeral port was free on 127.0.0.1');
    let handlerRan = false;
    selfDoor = new PocketDoor();
    const startedSelf = await selfDoor.start({
      port: selfPort,
      handle: (_req, res) => {
        handlerRan = true;
        res.statusCode = 200;
        res.end('{}');
      },
      identity: (options: IdentityOptions) => ensureDoorIdentity({ ...options, seal: openSeal }),
      identityPath: join(scratch, 'identity-self.json'),
      refuseSelfOrigin: true
    });
    if (!startedSelf.ok) {
      throw new Error(`the self-origin door refused to start: ${startedSelf.reason} — ${startedSelf.sentence}`);
    }
    const reading = await new Promise<string>((done) => {
      let answered = 0;
      const socket = tlsConnect(
        { host: '127.0.0.1', port: selfPort, rejectUnauthorized: false },
        () => {
          socket.write('GET /v1/blocked HTTP/1.1\r\nHost: 127.0.0.1\r\nConnection: close\r\n\r\n');
        }
      );
      socket.setTimeout(10_000, () => {
        socket.destroy();
        done('timeout');
      });
      socket.on('data', (chunk: Buffer) => {
        answered += chunk.length;
      });
      socket.on('error', () => done('refused-socket'));
      socket.on('close', () => done(answered === 0 ? 'refused-socket' : `answered-${String(answered)}-bytes`));
    });
    record(
      '15',
      'a request whose source IS the bind address',
      'refused-socket',
      reading,
      'research 127 §7 item 10: a local process of his own user reaches this port and sends whatever header it likes, so identity in a header is worth nothing against it. The socket is destroyed on the connection event, before the TLS handshake, so an admitted request would come back as an HTTP status rather than a dead socket.'
    );
    record(
      '15b',
      'and its request handler never ran',
      'not-reached',
      handlerRan ? 'reached' : 'not-reached',
      'a status alone cannot prove this half: a door that admitted the socket and answered 404 from a later refusal would still have run the handler. Nothing composed an answer for this request at all.'
    );
    await selfDoor.stop();
    selfDoor = null;
  }
} catch (err) {
  problems.push(`the client threw: ${err instanceof Error ? err.message : String(err)}`);
} finally {
  if (door !== null) {
    try {
      await door.stop();
    } catch {
      /* the run is over either way */
    }
  }
  if (selfDoor !== null) {
    try {
      await selfDoor.stop();
    } catch {
      /* the run is over either way */
    }
  }
  if (probePort !== null) {
    try {
      probePort.close();
    } catch {
      /* the run is over either way */
    }
  }
  rmSync(scratch, { recursive: true, force: true });
}

// If EVERY arm answered the same refusal, the door has one check rather than
// thirteen, and the most likely reason is the one this file names above.
const refusedAll = arms.length > 0 && arms.every((a) => a.got.startsWith('refused'));
if (refusedAll) {
  problems.push(
    'every arm was refused, INCLUDING the honest ones. The door this client drove refuses a request whose ' +
      'source is its own bind address, and under loopback every client is that address. The door needs the ' +
      'seam src/main/pocket/bind.ts already has (refuseSelfOrigin), or this phase has no runnable proof.'
  );
}

process.stdout.write(`P313_HOSTILE:${JSON.stringify({ arms, problems })}\n`);
