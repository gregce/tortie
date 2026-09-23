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
 * PHASE 316.1 WIDENED IT, and the door it drives now answers from the SHIPPING
 * route composer (`createPocketRoutes`) and the SHIPPING turns reader
 * (`readPocketTurns`) over facts written here, rather than from three canned
 * answers. That is what lets the attack reach the clauses 316.1 added: the QR's
 * public-key pin re-derived from the leaf the door served, the Swift way; his
 * tailnet key refused when it is not the shape and gone when the window is;
 * `others` cut from one list, complementary and capped; a turn read only after
 * the refresh; page indexes that go backwards, are negative or are 2^53, each
 * refused for its own reason; a 4,000-character one-word ask; a removed
 * session, a remote row answered with its note, and a session removed WHILE
 * the phone's request is in flight. The three arms that need the real host —
 * `bindAtLaunch` with no confirm, `setDoor` during quit, and a Remove against a
 * listening door — are `probe:p313`'s, because only the app has a sealed store.
 * THE FIX ROUND ADDED TWO that hold the refresh open so the press lands INSIDE
 * the composition, which the app cannot place: `Rm6`, a phone removed there,
 * refused `unpaired` after its answer was composed; and `14c`, the door
 * stopping there, refused by the door instance the listener hands the handler.
 * The tailnet key every arm here uses is MADE UP for the run.
 *
 * It prints one line, `P313_HOSTILE:{...}`, which the runner beside it reads.
 */

import { createServer as createPlainServer } from 'node:net';
import { request as httpsRequest } from 'node:https';
import {
  X509Certificate,
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
import { inspect } from 'node:util';
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
import {
  POCKET_ROUTES,
  createPocketRoutes,
  readTurnRange,
  type PocketFacts,
  type PocketRoute
} from '../../src/main/pocket/routes.js';
import { createPocketFacts, readPocketTurns } from '../../src/main/pocket/facts.js';
import {
  PocketPairing,
  PocketRequestVerifier,
  POCKET_HEADERS,
  POCKET_PAIRING_WINDOW_MS,
  POCKET_REQUEST_ALGORITHM,
  canonicalRequestText,
  newIdentity,
  phoneIdOf,
  signAsPhone,
  spkiPinOf,
  type PocketIdentity,
  type PocketPhoneFields
} from '../../src/main/pocket/pairing.js';
import type { StoredTurn } from '../../src/main/overview/store/index.js';
import { POCKET_OTHERS_MAX } from '../../src/shared/ipc/pocket.js';
import { OUTCOME_REMOTE } from '../../src/shared/overview-copy.js';
import { statusVisual } from '../../src/shared/status-words.js';
import type { Session, SessionStatus } from '../../src/shared/types.js';

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
 * The KEY this client pins: the QR's `fp`, set once the first window is open.
 * Nothing is accepted before it is set.
 *
 * The door's certificate is self-signed and in no trust store, which is the
 * design — research 127 §5's door table: "Tortie terminates its own, with a key
 * sealed under safeStorage; its fingerprint rides in the pairing QR and the app
 * pins it." So the client turns the CA check off and PINS INSTEAD, which is
 * strictly stronger here than a CA path would be: only this exact key is
 * accepted, and a man in the middle presenting a perfectly valid certificate
 * for some other key is refused.
 *
 * PHASE 316.1: THE PIN IS THE PUBLIC KEY'S, COMPUTED THE PHONE'S WAY. It was
 * the certificate's sha256 until the QR's v:2, and the certificate is renewed
 * every 397 days. The phone prepends the 26-byte P-256 SubjectPublicKeyInfo
 * header to the leaf's 65-byte point and hashes that (build/p316/SPEC.md §3.3,
 * 112 of 112 equal to `tls.ts`); this client does exactly the same, so every
 * honest arm below is also a proof that the QR's `fp` is the key's.
 */
let pinnedKey: string | null = null;
/** The leaf the last handshake presented, for arm F1's re-derivation. */
let lastLeaf: { raw?: Buffer; pubkey?: Buffer } | null = null;

const SPKI_P256_HEADER = Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex');

/** The pin of a leaf, the phone's way, or null when the leaf is not a P-256 key. */
function pinOfLeaf(peer: { pubkey?: Buffer } | null | undefined): string | null {
  const point = peer?.pubkey;
  if (point === undefined || !Buffer.isBuffer(point) || point.length !== 65) return null;
  return createHash('sha256').update(Buffer.concat([SPKI_P256_HEADER, point])).digest().toString('base64url');
}

/** The peer's key, or a sentence saying why it is not the pinned one. */
function checkPin(peer: { raw?: Buffer; pubkey?: Buffer } | undefined): Error | undefined {
  if (pinnedKey === null) return new Error('nothing is pinned yet');
  if (peer?.raw === undefined) return new Error('the door presented no certificate');
  return pinOfLeaf(peer) === pinnedKey
    ? undefined
    : new Error('the door presented a key that is not the pinned one');
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
        const peer = (socket as unknown as { getPeerCertificate?: () => { raw?: Buffer; pubkey?: Buffer } })
          .getPeerCertificate?.();
        lastLeaf = peer ?? null;
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

/** Wait, a turn at a time, until `ready` answers true. Throws after 5 s. */
async function until(ready: () => boolean): Promise<void> {
  const deadline = Date.now() + 5_000;
  while (!ready()) {
    if (Date.now() > deadline) throw new Error('a held request never reached the refresh');
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
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
  /**
   * The pairing owner's clock, moved by the arms that need a window to expire.
   * Zero skew is the real clock, which is what every older arm ran on.
   */
  let skew = 0;
  const clock = (): number => Date.now() + skew;
  /** What the door's key pin is, and whether the door is "listening" for the pairing owner. */
  let doorPin: string | null = null;
  let doorListening = true;
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
    // THE SHIPPING CONVERSION, from the fingerprint the SHIPPING identity
    // reports, exactly as `ipc.ts` wires it; the phone's side of it is re-derived
    // from the leaf the door served, in arm F1.
    publicKeyPin: () => (doorListening ? doorPin : null),
    now: clock
  });
  const verifier = new PocketRequestVerifier({
    identity: () => doorIdentity,
    phones: () => phones
  });

  // -------------------------------------------------------------------------
  // THE FACTS, written here; the ROUTES and the TURNS READER are shipping code.
  // -------------------------------------------------------------------------

  const T0 = Date.now() - 3_600_000;
  const aSession = (id: string, name: string, status: SessionStatus, extra: Partial<Session> = {}): Session =>
    ({
      id,
      name,
      tmuxName: name,
      projectPath: '/p313/project',
      cwd: '/p313/project',
      agent: 'claude',
      status,
      createdAt: T0,
      ...extra
    }) as Session;
  const aTurn = (sessionId: string, index: number, askText: string, answerText: string | null, closed = true): StoredTurn => ({
    sessionId,
    index,
    askText,
    askAt: new Date(T0 + index * 1_000).toISOString(),
    answerText,
    answerAt: answerText === null ? null : new Date(T0 + index * 1_000 + 500).toISOString(),
    queued: 0,
    closed,
    interrupted: false,
    notice: null,
    stopReason: null,
    durationMs: null,
    paths: [],
    pathSource: 'text-only',
    gitVerdict: null,
    gitCheckedAt: null
  });
  /** A 4,000-character one-word ask, the longest that is not clipped, and one past it. */
  const LONG_WORD = `p313${'w'.repeat(4_000 - 4)}`;
  const LONGER_WORD = `${LONG_WORD}x`;
  const TALK_TURNS: StoredTurn[] = [
    ...Array.from({ length: 10 }, (_, i) => aTurn('ses_talk', i, `ask ${String(i)}`, i === 6 ? null : `answer ${String(i)}`)),
    aTurn('ses_talk', 10, LONG_WORD, null, false),
    aTurn('ses_talk', 11, LONGER_WORD, 'the last answer')
  ];
  const turnsOf = new Map<string, StoredTurn[]>([['ses_talk', TALK_TURNS]]);
  /** The store's own two readers' semantics: ascending, the LAST `limit` of the range. */
  const fakeStore = {
    listTurns(sessionId: string, limit?: number): StoredTurn[] {
      const all = turnsOf.get(sessionId) ?? [];
      return limit === undefined ? [...all] : all.slice(Math.max(0, all.length - limit));
    },
    listTurnsBetween(sessionId: string, from: number, to: number, limit?: number): StoredTurn[] {
      const range = (turnsOf.get(sessionId) ?? []).filter((t) => t.index >= from && t.index <= to);
      return limit === undefined ? range : range.slice(Math.max(0, range.length - limit));
    }
  };
  let listed: Session[] = [
    aSession('ses_1', 'fix-login', 'needs_input'),
    aSession('ses_talk', 'talk', 'idle'),
    aSession('ses_idle', 'quiet', 'idle'),
    aSession('ses_remote', 'far-away', 'running', { machine: { id: 'm1', label: 'Mac Pro' } as Session['machine'] }),
    aSession('ses_doomed', 'doomed', 'idle')
  ];
  /** The order the composer asked for things, so the refresh can be seen to come FIRST. */
  const events: string[] = [];
  /** A Remove that lands while the request is inside the refresh's yield. */
  let removeDuringRefresh: string | null = null;
  /**
   * A refresh HELD OPEN (the Phase 316.1 fix round), so a Remove or a stop can
   * land while a request is inside its composition, where the shipping
   * composer awaits before it reads the store.
   */
  let holdRefresh: Promise<void> | null = null;
  /** Every time the handler asked whether a phone is still paired, and the answer. */
  const pairedAsked: { id: string; answer: boolean }[] = [];
  const facts: PocketFacts = {
    sessions: () => listed,
    projects: () => [],
    blockedSince: () => new Map([['ses_1', T0 + 60_000]]),
    wakes: () => [],
    activity: () => undefined,
    statusWord: (session) => {
      const word = statusVisual(session.status, session);
      return { dot: word.dot, label: word.label };
    },
    agentLabel: (agent) => agent,
    machineLabel: (session) => session.machine?.label ?? null,
    emptyLine: 'Nothing needs you',
    refresh: async (sessionId) => {
      events.push(`refresh:${sessionId}`);
      await Promise.resolve();
      if (holdRefresh !== null) await holdRefresh;
      if (removeDuringRefresh === sessionId) listed = listed.filter((s) => s.id !== sessionId);
      return null;
    },
    catchUp: async (sessionId) => {
      events.push(`catchUp:${sessionId}`);
      return null;
    },
    lastTurn: async (sessionId) => {
      events.push(`lastTurn:${sessionId}`);
      const last = fakeStore.listTurns(sessionId, 1)[0];
      return { answerText: last?.answerText ?? null, turnCount: (turnsOf.get(sessionId) ?? []).length };
    },
    turns: async (sessionId, range) => {
      events.push(`turns:${sessionId}`);
      const status = listed.find((s) => s.id === sessionId)?.status ?? 'idle';
      return readPocketTurns(fakeStore, sessionId, range, status);
    },
    handoff: () => null
  };
  const routes = createPocketRoutes(facts);

  door = new PocketDoor();
  const deps: PocketHandlerDeps = {
    boundAddress: () => door?.address ?? null,
    boundPort: () => door?.port ?? 0,
    // THE QUIT FLAG ALONE, as the host hands it (`ipc.ts`: `pocketShutdownStarted`),
    // and this run never quits. A door that is stopping is known only to the
    // instance `bind.ts` hands the handler, which is what arm 14c proves; this
    // dep asked the instance until the Phase 316.1 fix round, and so hid that
    // the host's own composition did not.
    shuttingDown: () => false,
    pairingWindowOpen: () => pairing.windowOpen(),
    present: (body, from) => pairing.present(body, from),
    verify: (input) => {
      const v = verifier.verify(input);
      return v.ok ? { ok: true, phoneId: v.phone.id } : { ok: false, reason: v.reason };
    },
    // The host's own question, over the same phone set the verifier reads.
    stillPaired: (id) => {
      const answer = phones.some((p) => p.id === id);
      pairedAsked.push({ id, answer });
      return answer;
    },
    // The host's own dispatch (`ipc.ts`), spelled here because the host needs
    // the OS keystore to be built. The answers are the SHIPPING composer's.
    answer: async (route: PocketRoute, query) => {
      switch (route.id) {
        case 'blocked':
          return routes.blocked();
        case 'session': {
          const id = query.get('id');
          return id === null ? null : await routes.session(id);
        }
        case 'turns': {
          const id = query.get('id');
          return id === null
            ? null
            : await routes.turns(id, { limit: query.get('limit'), from: query.get('from'), to: query.get('to') });
        }
        case 'pair':
          return null;
      }
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
  doorPin = spkiPinOf(started.publicKeyFingerprint);
  const certificateSha = started.certificateFingerprint.replace(/[^0-9a-f]/gi, '').toLowerCase();

  // -------------------------------------------------------------------------
  // 0. It answers at all, and it answers the honest phone
  // -------------------------------------------------------------------------

  const offer = pairing.open({ tailnetKey: null });
  const qr = JSON.parse(offer.payload) as Record<string, unknown>;
  const secret = Buffer.from(String(qr['ps']), 'base64url');
  const doorExchangePublic = String(qr['dx']);
  // THE PIN THE PHONE HOLDS is the QR's, and nothing else.
  pinnedKey = typeof qr['fp'] === 'string' ? qr['fp'] : null;

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

  // F1. THE QR PINS THE DOOR'S PUBLIC KEY (Phase 316.1, build/p316/SPEC.md §2
  // row 24). The /pair above is the first handshake of the run, and it was
  // accepted only because the leaf the door served hashes, the phone's way, to
  // the QR's `fp`. Here the same leaf is hashed a SECOND way, through node's
  // own SubjectPublicKeyInfo export, and held against the certificate's hash,
  // which is what v:1 pinned and what the 397-day renewal would change.
  {
    // Read through a cast: it is assigned inside the socket's callback, which
    // the compiler's flow analysis does not follow.
    const leaf = lastLeaf as { raw?: Buffer; pubkey?: Buffer } | null;
    const leafPin = pinOfLeaf(leaf);
    const x509Pin =
      leaf?.raw === undefined
        ? null
        : createHash('sha256')
            .update(new X509Certificate(leaf.raw).publicKey.export({ type: 'spki', format: 'der' }))
            .digest()
            .toString('base64url');
    const certificatePin = Buffer.from(certificateSha, 'hex').toString('base64url');
    record('F1a', 'the QR is v:2', '2', String(qr['v']), 'v:2 tells a phone the pin is the KEY’s; v:1 meant the certificate’s, which the door renews every 397 days.');
    record(
      'F1b',
      'the QR’s fp is the served leaf’s key, hashed the phone’s way and node’s way',
      'equal',
      leafPin !== null && leafPin === qr['fp'] && x509Pin === qr['fp'] ? 'equal' : 'differs',
      'the phone pins the 26-byte P-256 header plus the leaf’s 65-byte point, sha256, base64url; a QR whose fp is anything else pins nothing the door serves.'
    );
    record(
      'F1c',
      'and it is not the certificate’s hash',
      'the-key',
      qr['fp'] === certificatePin || qr['fp'] === certificateSha ? 'the-certificate' : 'the-key',
      'a certificate pin un-pairs every phone thirteen months after it paired, with nothing on either screen saying why.'
    );
    doorListening = false;
    let withoutPin = 'opened';
    try {
      pairing.open({ tailnetKey: null });
    } catch {
      withoutPin = 'refused';
    }
    doorListening = true;
    record(
      'F1d',
      'no window opens while the door has no key to pin',
      'refused',
      withoutPin,
      'a window on a door that is not listening would put fp: null in the QR, and a phone that pins null pins nothing.'
    );
  }

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
  pairing.open({ tailnetKey: null });
  const reopened = JSON.parse(pairing.open({ tailnetKey: null }).payload) as Record<string, unknown>;
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
    const window17 = JSON.parse(pairing.open({ tailnetKey: null }).payload) as Record<string, unknown>;
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

  // -------------------------------------------------------------------------
  // PHASE 316.1 — the door switched on (build/p316/SPEC.md §4 S1, Method B)
  // -------------------------------------------------------------------------

  const stateOfAnswer = (answer: Answer): string =>
    (JSON.parse(answer.body || '{}') as { state?: string }).state ?? `none-${verdict(answer)}`;
  const bodyOf = (answer: Answer): Record<string, unknown> => {
    try {
      return JSON.parse(answer.body || '{}') as Record<string, unknown>;
    } catch {
      return {};
    }
  };

  // K1. HIS TAILNET KEY. The key below is MADE UP for this run: it has the
  // shape the door checks and no Tailscale server has ever seen it.
  {
    const KEY = `tskey-auth-kP313hostile${randomBytes(6).toString('hex')}-CNTRLp313hostile${randomBytes(12).toString('hex')}`;
    const keyBytes = Array.from(Buffer.from(KEY, 'utf8').subarray(0, 16))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');
    /** The sentence a refusal carries, or `opened`. */
    const refusalOf = (input: unknown): string => {
      try {
        pairing.open(input as { tailnetKey: string | null });
        return 'opened';
      } catch (err) {
        const text = err instanceof Error ? err.message : String(err);
        try {
          return String((JSON.parse(text) as { message?: unknown }).message ?? text);
        } catch {
          return text;
        }
      }
    };
    const tooLong = refusalOf({ tailnetKey: `tskey-auth-${'k'.repeat(10 * 1024)}` });
    record(
      'K1a',
      'a 10 KB key is refused, opens no window and holds nothing',
      'refused-closed-empty',
      `${tooLong === 'opened' ? 'opened' : 'refused'}-${pairing.windowOpen() ? 'open' : 'closed'}-${pairing.holdsTailnetKey() ? 'held' : 'empty'}`,
      'a paste of any size is checked for its length before anything else, and a refusal leaves nothing behind.'
    );
    const notAuth = refusalOf({ tailnetKey: `tskey-api-p313hostile${randomBytes(8).toString('hex')}` });
    record(
      'K1b',
      'a key that does not start tskey-auth- is refused, for its OWN reason',
      'own-reason',
      notAuth !== 'opened' && tooLong !== 'opened' && notAuth !== tooLong ? 'own-reason' : `same-or-opened`,
      'an API key or an OAuth secret pasted by mistake is not a join key, and saying "too long" about it would send him looking for the wrong thing.'
    );
    record(
      'K1c',
      'and neither refusal repeats what was pasted',
      'silent',
      [tooLong, notAuth].some((t) => t.includes('kkkkkkkkkk') || t.includes('p313hostile')) ? 'echoed' : 'silent',
      'a refusal sentence reaches the renderer and the log; it never carries the value it refused.'
    );
    const withKey = JSON.parse(pairing.open({ tailnetKey: KEY }).payload) as Record<string, unknown>;
    record(
      'K1d',
      'an honest key rides in the QR as tk, and the sheet’s view does not carry it',
      'tk-only',
      withKey['tk'] === KEY && !JSON.stringify(pairing.view()).includes(KEY) ? 'tk-only' : withKey['tk'] === KEY ? 'also-on-the-view' : 'not-in-the-qr',
      'the QR is the phone’s only copy, and the view is what every window of the app is sent.'
    );
    record('K1e', 'the window holds it while it is open', 'held', pairing.holdsTailnetKey() ? 'held' : 'not-held', 'the holder the next three arms empty must first be full, or they prove nothing.');
    skew += POCKET_PAIRING_WINDOW_MS + 1_000;
    const afterDeadline = pairing.windowOpen();
    record(
      'K1f',
      'past its deadline the window is gone at the first touch, and the key with it',
      'closed-zeroed',
      `${afterDeadline ? 'open' : 'closed'}-${pairing.holdsTailnetKey() ? 'held' : 'zeroed'}`,
      'expiry shreds what the window held; there is no timer, so the first thing that asks after the deadline is what shreds it, and quit shreds whatever is left.'
    );
    const expiredSecret = Buffer.from(String(withKey['ps']), 'base64url');
    const next = JSON.parse(pairing.open({ tailnetKey: null }).payload) as Record<string, unknown>;
    const reused = await ask(
      'POST',
      '/pair',
      { 'content-type': 'application/json' },
      present('a phone with the old code', good.fields.signingKey, good.fields.exchangeKey, expiredSecret)
    );
    record(
      'K1g',
      'a pairing code reused after its window: the next QR carries no key, and the old code opens nothing',
      'no-tk-refused',
      `${'tk' in next ? 'tk' : 'no-tk'}-${stateOfAnswer(reused)}`,
      'the key belonged to ONE window. A later window the person opened without a key must not carry his old one, and a photographed code is worth nothing after its deadline.'
    );
    pairing.cancel();
    skew = 0;
    const graph = inspect(pairing, { depth: Infinity, showHidden: true, maxArrayLength: Infinity, maxStringLength: Infinity });
    record(
      'K1h',
      'nothing in the pairing owner still holds the key, as text or as bytes',
      'absent',
      graph.includes(KEY) || graph.includes(KEY.slice(11)) || graph.includes(keyBytes) ? 'present' : 'absent',
      'the whole object graph of the owner, private fields included, holds neither the string nor its first sixteen bytes.'
    );
    pairing.open({ tailnetKey: KEY });
    pairing.cancel();
    record('K1i', 'cancel zeroes it', 'zeroed', pairing.holdsTailnetKey() ? 'held' : 'zeroed', 'the person pressing Cancel is the commonest way a window ends.');
    pairing.open({ tailnetKey: null });
    doorListening = false;
    const afterRead = refusalOf({ tailnetKey: KEY });
    doorListening = true;
    record(
      'K1j',
      'a refusal AFTER the key was read keeps nothing, and leaves the window that was open, open',
      'refused-open-empty',
      `${afterRead === 'opened' ? 'opened' : 'refused'}-${pairing.windowOpen() ? 'open' : 'closed'}-${pairing.holdsTailnetKey() ? 'held' : 'empty'}`,
      'the door stopped listening between the paste and the press: the bytes read for that press are zeroed on the way out, and the window already open is not taken down by a press that did nothing.'
    );
    pairing.cancel();
  }

  // O1. OTHERS: exactly the listed sessions that are not blocked, capped.
  {
    const answer = await signedAsk(good, '/v1/blocked');
    const body = bodyOf(answer) as { rows?: { sessionId: string }[]; others?: { sessionId: string }[]; othersOmitted?: number };
    const rows = (body.rows ?? []).map((r) => r.sessionId);
    const others = (body.others ?? []).map((r) => r.sessionId).sort();
    const want = listed.map((s) => s.id).filter((id) => !rows.includes(id)).sort();
    record(
      'O1a',
      'others, over the wire, is exactly the listed sessions that are not blocked',
      'exact',
      verdict(answer) === 'ok' && JSON.stringify(rows) === JSON.stringify(['ses_1']) && JSON.stringify(others) === JSON.stringify(want) && body.othersOmitted === 0
        ? 'exact'
        : `rows ${String(rows.length)}, others ${String(others.length)} of ${String(want.length)}, omitted ${String(body.othersOmitted)}`,
      'his ruling: the phone may open anything, so it must be able to FIND anything, and a session in both lists or in neither is a session drawn twice or lost.'
    );
    const many: Session[] = Array.from({ length: POCKET_OTHERS_MAX + 5 }, (_, i) =>
      aSession(`ses_m${String(i).padStart(3, '0')}`, `m${String(i)}`, i < 3 ? 'needs_input' : 'idle', { createdAt: T0 + i })
    );
    const big = createPocketRoutes({ ...facts, sessions: () => many, blockedSince: () => new Map() }).blocked();
    const bigRows = new Set(big.rows.map((r) => r.sessionId));
    const bigOthers = big.others.map((r) => r.sessionId);
    const disjoint = bigOthers.every((id) => !bigRows.has(id)) && new Set(bigOthers).size === bigOthers.length;
    record(
      'O1b',
      `${String(many.length)} sessions, 3 waiting: every waiting row, ${String(POCKET_OTHERS_MAX)} others, the rest counted, none twice`,
      `3-${String(POCKET_OTHERS_MAX)}-2-disjoint`,
      `${String(big.rows.length)}-${String(big.others.length)}-${String(big.othersOmitted)}-${disjoint ? 'disjoint' : 'overlapping'}`,
      'an answer of unbounded size is the one the phone reads on a train; the cap is the contract’s, and the count of what it left out is said.'
    );
  }

  // T2. FRESH BEFORE READ, and the conversation paged back whole.
  {
    events.length = 0;
    const session = await signedAsk(good, '/v1/session?id=ses_talk');
    const seenSession = [...events];
    events.length = 0;
    const page = await signedAsk(good, '/v1/turns?id=ses_talk&limit=3');
    const seenTurns = [...events];
    record(
      'T2a',
      '/v1/session asks the refresh BEFORE it reads the conversation',
      'refresh-first',
      verdict(session) === 'ok' && seenSession[0] === 'refresh:ses_talk' && seenSession.includes('lastTurn:ses_talk') && seenSession.filter((e) => e.startsWith('refresh')).length === 1
        ? 'refresh-first'
        : seenSession.join(',') || verdict(session),
      'the store is written only when Catch Me Up, the fold or the counts ask, so a read that comes first answers what the conversation WAS.'
    );
    record(
      'T2b',
      '/v1/turns asks the refresh BEFORE it reads the turns',
      'refresh-first',
      verdict(page) === 'ok' && JSON.stringify(seenTurns) === JSON.stringify(['refresh:ses_talk', 'turns:ses_talk']) ? 'refresh-first' : seenTurns.join(',') || verdict(page),
      'the probe appends a turn to a real record and reads it back; this holds the order the append depends on.'
    );
    const collected: { index: number; absence: unknown; answerText: unknown }[] = [];
    let to: number | null = null;
    let pages = 0;
    let sane = true;
    for (; pages < 20; pages += 1) {
      const answer = await signedAsk(good, `/v1/turns?id=ses_talk&limit=4${to === null ? '' : `&to=${String(to)}`}`);
      const body = bodyOf(answer) as { turns?: { index: number; absence: unknown; answerText: unknown }[]; more?: boolean };
      if (verdict(answer) !== 'ok' || !Array.isArray(body.turns)) {
        sane = false;
        break;
      }
      collected.unshift(...body.turns);
      if (body.more !== true) break;
      if (body.turns.length === 0) {
        sane = false;
        break;
      }
      to = (body.turns[0]?.index ?? 0) - 1;
    }
    const indexes = collected.map((t) => t.index);
    const whole = sane && JSON.stringify(indexes) === JSON.stringify(TALK_TURNS.map((t) => t.index));
    const absences = collected.every((t) => (t.answerText === null ? typeof t.absence === 'string' && t.absence.length > 0 : t.absence === null));
    record(
      'T2c',
      'paged back to the first turn: every turn once, in order, and each unanswered one says so',
      `${String(TALK_TURNS.length)}-said`,
      `${whole ? String(collected.length) : `broken(${indexes.join(',')})`}-${absences ? 'said' : 'unsaid'}`,
      'the phone stitches pages together by index; a page that repeats, skips or never ends is a conversation drawn wrong.'
    );
  }

  // PAGE INDEXES AN ATTACKER CHOOSES, each refused for its own reason.
  for (const [n, query, reason] of [
    ['Pg1', 'from=5&to=2', 'backwards'],
    ['Pg2', 'to=-5', 'index'],
    ['Pg3', 'from=-1&to=3', 'index'],
    ['Pg4', `to=${String(2 ** 53)}`, 'index'],
    ['Pg5', `from=${String(2 ** 53)}`, 'index'],
    ['Pg6', 'to=1e3', 'index']
  ] as const) {
    const params = new URLSearchParams(query);
    const decided = readTurnRange({ from: params.get('from'), to: params.get('to') });
    const wire = await signedAsk(good, `/v1/turns?id=ses_talk&${query}`);
    record(
      n,
      `a page asked as ${query}`,
      `refused-404:${reason}`,
      `${verdict(wire)}:${decided.ok ? 'accepted' : decided.reason}`,
      'a page that is not a page is refused rather than guessed at: a fallback answers a page the phone did not ask for, and the phone stitches it in as if it had.'
    );
  }
  {
    const a = bodyOf(await signedAsk(good, '/v1/turns?id=ses_talk&limit=3&to=4')) as { turns?: { index: number }[] };
    const b = bodyOf(await signedAsk(good, '/v1/turns?id=ses_talk&limit=3&to=5')) as { turns?: { index: number }[] };
    const shared = (a.turns ?? []).filter((t) => (b.turns ?? []).some((u) => u.index === t.index));
    const agree = shared.every((t) => JSON.stringify(t) === JSON.stringify((b.turns ?? []).find((u) => u.index === t.index)));
    record(
      'Pg7',
      'two overlapping pages agree byte for byte where they overlap',
      'agree-2',
      `${agree ? 'agree' : 'disagree'}-${String(shared.length)}`,
      'a turn read twice is the same turn twice, or the phone cannot tell a repeat from a change.'
    );
  }

  // A 4,000-CHARACTER ONE-WORD ASK, and one character past the one clip.
  {
    const body = bodyOf(await signedAsk(good, '/v1/turns?id=ses_talk&from=10&to=11&limit=2')) as {
      turns?: { index: number; askText: string; askClipped: boolean; answerText: string | null; absence: string | null }[];
    };
    const t10 = body.turns?.find((t) => t.index === 10);
    const t11 = body.turns?.find((t) => t.index === 11);
    record(
      'Lg1',
      'a 4,000-character one-word ask comes back whole and unclipped',
      '4000-unclipped',
      `${String(t10?.askText.length ?? 0)}-${t10?.askClipped === false && t10?.askText === LONG_WORD ? 'unclipped' : 'clipped-or-changed'}`,
      'one word with no break is the shape that breaks a phone’s layout, and the door answers it whole: the phone wraps it, the door does not cut it.'
    );
    record(
      'Lg2',
      'one character more is clipped at the one clip, and says so',
      '4000-clipped',
      `${String(t11?.askText.length ?? 0)}-${t11?.askClipped === true ? 'clipped' : 'unclipped'}`,
      'toTurnView holds the only clip, and a clip that is not said is a person reading half a sentence as the whole.'
    );
    record(
      'Lg3',
      'the unanswered long ask carries its absence sentence, the answered one none',
      'said',
      t10?.answerText === null && typeof t10?.absence === 'string' && t10.absence.length > 0 && t11?.absence === null ? 'said' : 'unsaid',
      'main chooses the sentence from the turn’s flags and the session’s status, so the phone never decides between the three itself.'
    );
  }

  // A REMOVED SESSION, A REMOTE ROW, AND A REMOVE WHILE THE REQUEST IS IN FLIGHT.
  {
    record('Rm1', 'the session of an id nobody lists', 'refused-404', verdict(await signedAsk(good, '/v1/session?id=ses_gone')), 'an id is not an admission; a session Tortie does not list is answered as nothing.');
    record('Rm2', 'the turns of an id nobody lists', 'refused-404', verdict(await signedAsk(good, '/v1/turns?id=ses_gone')), 'the same, for its conversation.');
    events.length = 0;
    const remote = await signedAsk(good, '/v1/turns?id=ses_remote');
    const rb = bodyOf(remote) as { note?: unknown; turns?: unknown[]; more?: unknown };
    record(
      'Rm3',
      'a remote row’s turns: main’s own sentence, never an error, and nothing on this Mac read',
      'note',
      verdict(remote) === 'ok' && rb.note === OUTCOME_REMOTE && Array.isArray(rb.turns) && rb.turns.length === 0 && rb.more === false && !events.some((e) => e.endsWith(':ses_remote'))
        ? 'note'
        : `${verdict(remote)} note=${JSON.stringify(rb.note)} read=${events.join(',')}`,
      'the conversation of a session on another machine is on that machine; the phone draws the sentence the Mac draws for it.'
    );
    removeDuringRefresh = 'ses_doomed';
    events.length = 0;
    const doomedSession = await signedAsk(good, '/v1/session?id=ses_doomed');
    record(
      'Rm4',
      'a session Removed while its /v1/session is in flight is answered as unknown, and read no further',
      'refused-404-unread',
      `${verdict(doomedSession)}-${events.some((e) => e === 'lastTurn:ses_doomed' || e === 'catchUp:ses_doomed') ? 'read' : 'unread'}`,
      'the refresh yields, so the route looks the session up AGAIN after it; a session removed in that gap is not read.'
    );
    listed = [...listed, aSession('ses_doomed', 'doomed', 'idle')];
    events.length = 0;
    const doomedTurns = await signedAsk(good, '/v1/turns?id=ses_doomed');
    record(
      'Rm5',
      'the same Remove during /v1/turns',
      'refused-404-unread',
      `${verdict(doomedTurns)}-${events.includes('turns:ses_doomed') ? 'read' : 'unread'}`,
      'and for its conversation.'
    );
    removeDuringRefresh = null;

    // Rm6. A PHONE REMOVED while its request is inside the refresh (the Phase
    // 316.1 fix round, the attack's R1). The route composes, because the
    // session is still listed; the answer must still not leave, and the handler
    // must have asked about THIS phone after the composition and been told no.
    let release = (): void => undefined;
    holdRefresh = new Promise<void>((resolve) => {
      release = resolve;
    });
    events.length = 0;
    pairedAsked.length = 0;
    const heldAsk = signedAsk(good, '/v1/turns?id=ses_talk&limit=2');
    await until(() => events.includes('refresh:ses_talk'));
    const keptPhones = phones;
    phones = phones.filter((p) => p.id !== good.fields.id);
    verifier.forget(good.fields.id);
    release();
    const removedAnswer = await heldAsk;
    holdRefresh = null;
    phones = keptPhones;
    const lastAsk = pairedAsked.filter((a) => a.id === good.fields.id).at(-1);
    record(
      'Rm6',
      'a phone Removed while its request is inside the refresh: composed, then refused unpaired',
      'refused-404-composed-unpaired',
      `${verdict(removedAnswer)}-${events.includes('turns:ses_talk') ? 'composed' : 'uncomposed'}-${lastAsk === undefined ? 'never-asked' : lastAsk.answer ? 'still-paired' : 'unpaired'}`,
      'SPEC S1 Method B: a Remove while the phone’s request is in flight. The answer was composed from the store as it stood AFTER the press, and before the fix it was sent; the handler now asks whether the phone it verified is still paired, with nothing awaited before the send.'
    );
    record(
      'Rm6b',
      'the phone reads again once the person has it back',
      'ok',
      verdict(await signedAsk(good, '/v1/blocked')),
      'the refusal is about the phone’s membership at the moment of the send, not a door that stopped answering.'
    );
  }

  // H2. THE HAND-OFF, from the one production composer and on the wire.
  {
    const shipped = createPocketFacts({ core: () => null, overview: {} as never, wakes: () => [] });
    const onWire = (bodyOf(await signedAsk(good, '/v1/session?id=ses_1')) as { session?: { handoff?: unknown } }).session?.handoff;
    record(
      'H2',
      'the production hand-off answers null, and the session detail carries none',
      'null-null',
      `${shipped.handoff(listed[0] as Session) === null ? 'null' : 'composed'}-${onWire === null ? 'null' : 'composed'}`,
      'nothing on the phone can dial ssh through the app’s own node, and where Claude’s Remote Control URL is recorded is unmeasured.'
    );
  }

  // 14. The shutdown is a resource owner — and since the Phase 316.1 fix round
  // it is driven with a request INSIDE ITS COMPOSITION when the stop begins,
  // which is where a person's switch-off, Remove or alerts flip meets a phone.
  {
    let release = (): void => undefined;
    holdRefresh = new Promise<void>((resolve) => {
      release = resolve;
    });
    events.length = 0;
    const heldAsk = signedAsk(good, '/v1/turns?id=ses_talk&limit=2');
    await until(() => events.includes('refresh:ses_talk'));
    const stopping = door.stop();
    release();
    const report = await stopping;
    const heldAnswer = await heldAsk;
    holdRefresh = null;
    door = null;
    record(
      '14',
      'the stop joins what it accepted',
      'true-1',
      `${String(report.joined)}-${String(report.accepted)}`,
      'a stop that returns must have no handler still running, or a quit reads main’s state during its own disposal.'
    );
    record(
      '14c',
      'a request inside its composition when the door began to stop: composed, then refused',
      'refused-404-composed',
      `${verdict(heldAnswer)}-${events.includes('turns:ses_talk') ? 'composed' : 'uncomposed'}`,
      'the stop joins the handler rather than cutting it, so without a last ask the answer composed inside the join left a door the person had closed. The ask is of the door INSTANCE, because the module drops its door before it joins.'
    );
  }
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
