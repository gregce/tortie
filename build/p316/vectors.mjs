#!/usr/bin/env node
/**
 * `node build/p316/vectors.mjs [--check]` — the phone's test vectors, written
 * by the SHIPPING TypeScript (Phase 316.2, build/p316/SPEC.md §4 S2).
 *
 * WHY IT EXISTS. The iPhone app's door client is Swift, and the door is
 * TypeScript. Nothing in the tree may say what the door expects twice, so the
 * Swift is held to vectors that the door's own functions produce, byte for
 * byte, in `ios/TortieTests/Fixtures/vectors.json`:
 *
 *   keys      four key pairs from fixed, public seeds. They are TEST KEYS that
 *             pair with nothing, derived from their labels so anybody can
 *             regenerate them; no key of anybody's is read.
 *   identity  `phoneIdOf`, `pairFingerprint` and `pairingBinding` (from the
 *             Mac's side; the Swift derives the same binding from the phone's).
 *   requests  `canonicalRequestText` and `signAsPhone` (Node's Ed25519 is
 *             deterministic) for five requests, each ACCEPTED by the shipping
 *             `PocketRequestVerifier` here, and one tampered target it refuses
 *             `signature`. The targets are spelled the way the Swift client
 *             spells them, and the door's own URL parser reads each back to the
 *             same bytes and the same `id`.
 *   pins      two certificates issued by the shipping `tls.ts`, with the
 *             `publicKeyFingerprint` it reports and the QR pin `spkiPinOf`
 *             makes of it.
 *   seal      the shipping `sealPresentationAsPhone` output, which the Swift
 *             must OPEN to the same plaintext; and the Swift's own sealing of
 *             its own plaintext under a fixed nonce, which the shipping
 *             `PocketPairing` opener must open to the same keys and label.
 *   qr        three QR v:2 payloads from the shipping `PocketPairing.open`.
 *   answers   the three reads composed by the shipping `createPocketRoutes`,
 *             turns through the shipping `readPocketTurns`, over fixed facts
 *             at a fixed clock; each also with fields the phone does not know.
 *
 * --check. Regenerates everything in memory and compares. The deterministic
 * vectors must match byte for byte. The three that carry a random value (the
 * seal from the door's sealer, the certificates, and the QR's one-shot
 * secret) are held by RELATION instead: the recorded seal must still open
 * under the shipping opener, each recorded certificate must still hash to its
 * recorded fingerprint and pin, and a freshly minted QR must equal the
 * recorded one with only `ps` differing. A write run keeps a recorded random
 * value that still holds, so regenerating an unchanged tree changes no byte.
 *
 * WHAT IT DOES NOT DO. It opens no socket, starts no Electron, binds nothing
 * and reads nothing under the person's home. Its one scratch directory (the
 * certificates' sealed file, sealed by a seal that seals nothing) is under
 * `os.tmpdir()` and removed in a `finally`. It prints no key, no signature and
 * no conversation line; the file it writes holds only the test keys above.
 * The tailnet key in the QR vectors is made up.
 *
 * It runs itself under the pinned tsx (`build/ts-runner.mjs`) so it can import
 * the TypeScript it is holding the Swift to.
 */

import { spawnSync } from 'node:child_process';
import {
  X509Certificate,
  createCipheriv,
  createHash,
  createPrivateKey,
  createPublicKey,
  hkdfSync
} from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(HERE), '..', '..');
const OUT = join(ROOT, 'ios', 'TortieTests', 'Fixtures', 'vectors.json');
const TAG = '[p316 vectors]';
const CHECK = process.argv.includes('--check');

if (process.env.P316_VECTORS_INNER !== '1') {
  // THE OUTER RUN: the same file again, under the repository's pinned tsx.
  const { tsxCli } = await import('../ts-runner.mjs');
  const run = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', HERE, ...process.argv.slice(2)],
    {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 120_000,
      maxBuffer: 16 * 1024 * 1024,
      env: { ...process.env, P316_VECTORS_INNER: '1' }
    }
  );
  process.stdout.write(run.stdout ?? '');
  process.stderr.write(run.stderr ?? '');
  if (run.error !== undefined) {
    process.stdout.write(`${TAG} FAIL: ${String(run.error.message)}\n`);
    process.exit(1);
  }
  process.exit(run.status ?? 1);
}

// ---------------------------------------------------------------------------
// THE INNER RUN, under tsx: the shipping modules.
// ---------------------------------------------------------------------------

const pairing = await import('../../src/main/pocket/pairing.ts');
const tls = await import('../../src/main/pocket/tls.ts');
const { createPocketRoutes } = await import('../../src/main/pocket/routes.ts');
const { readPocketTurns, pocketTurnOf } = await import('../../src/main/pocket/facts.ts');
const { statusVisual } = await import('../../src/shared/status-words.ts');
const { POCKET_ROUTE_IDS } = await import('../../src/shared/ipc/pocket.ts');
const { NOTHING_NEEDS_YOU } = await import('../../src/main/tray/attention.ts');

const problems = [];
const fail = (what) => problems.push(what);

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const sha256 = (data) => createHash('sha256').update(data).digest();
const sha256hex = (data) => sha256(data).toString('hex');
/** A 32-byte seed from a PUBLIC label. Test keys, reproducible by anybody. */
const seed = (label) => sha256(`tortie-p316-vector ${label}`);

const PKCS8_HEADER = {
  ed25519: Buffer.from('302e020100300506032b657004220420', 'hex'),
  x25519: Buffer.from('302e020100300506032b656e04220420', 'hex')
};
const pkcs8Of = (kind, raw) => Buffer.concat([PKCS8_HEADER[kind], raw]);
const privateOf = (kind, raw) =>
  createPrivateKey({ key: pkcs8Of(kind, raw), format: 'der', type: 'pkcs8' });
const spkiOf = (key) => b64u(createPublicKey(key).export({ format: 'der', type: 'spki' }));

/** The fixed clock every composed vector is read at. 2026-09-21T21:46:40Z. */
const T = 1_790_000_000_000;
const PHONE_LABEL = 'Tortie’s iPhone';
const PHONE_ADDRESS = '127.0.0.1';
const MADE_UP_TAILNET_KEY = 'tskey-auth-kP316VECTOR-madeUpNotAKey0000000000000000';

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

const seeds = {
  phoneSigning: seed('phone signing'),
  phoneExchange: seed('phone exchange'),
  macSigning: seed('mac signing'),
  macExchange: seed('mac exchange')
};
const phoneSignPrivate = privateOf('ed25519', seeds.phoneSigning);
const phoneExchangePrivate = privateOf('x25519', seeds.phoneExchange);
const ek = spkiOf(phoneSignPrivate);
const xk = spkiOf(phoneExchangePrivate);
// THE SHIPPING identity reader, over the fixed Mac seeds.
const identity = pairing.openIdentity({
  signPrivate: b64u(pkcs8Of('ed25519', seeds.macSigning)),
  exchangePrivate: b64u(pkcs8Of('x25519', seeds.macExchange))
});
const phoneFields = {
  id: pairing.phoneIdOf(ek),
  label: PHONE_LABEL,
  signingKey: ek,
  exchangeKey: xk,
  address: PHONE_ADDRESS,
  pushToken: '',
  pushEnvironment: ''
};

const keys = {
  phoneSigningSeed: seeds.phoneSigning.toString('hex'),
  phoneExchangeSeed: seeds.phoneExchange.toString('hex'),
  macSigningSeed: seeds.macSigning.toString('hex'),
  macExchangeSeed: seeds.macExchange.toString('hex'),
  phoneSigningKey: ek,
  phoneExchangeKey: xk,
  macSigningKey: identity.signPublic,
  macExchangeKey: identity.exchangePublic
};

const binding = pairing.pairingBinding(identity, phoneFields);
const identityVectors = {
  phoneId: pairing.phoneIdOf(ek),
  fingerprint: pairing.pairFingerprint(ek, xk),
  binding
};

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------

/**
 * The Swift client's query encoding, spelled here only to name the target
 * the Swift must produce: every byte outside the RFC 3986 unreserved set as
 * `%XX` with uppercase hex. The door's URL parser is what judges it below.
 */
const queryValue = (value) =>
  [...Buffer.from(value, 'utf8')]
    .map((byte) =>
      (byte >= 0x41 && byte <= 0x5a) ||
      (byte >= 0x61 && byte <= 0x7a) ||
      (byte >= 0x30 && byte <= 0x39) ||
      byte === 0x2d || byte === 0x2e || byte === 0x5f || byte === 0x7e
        ? String.fromCharCode(byte)
        : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`
    )
    .join('');

const SESSION_TALK = '4d8f2c1a-9b7e-4c3d-8a21-5e6f7a8b9c02';
const ODD_ID = 'a b/c?d&e=f%g#h~i.j_k-l’';

const requestShapes = [
  { name: 'blocked', method: 'GET', target: '/v1/blocked', body: '', id: null },
  { name: 'session', method: 'GET', target: `/v1/session?id=${queryValue(SESSION_TALK)}`, body: '', id: SESSION_TALK },
  {
    name: 'turns-older',
    method: 'GET',
    target: `/v1/turns?id=${queryValue(SESSION_TALK)}&limit=20&to=24`,
    body: '',
    id: SESSION_TALK
  },
  { name: 'odd-id', method: 'GET', target: `/v1/session?id=${queryValue(ODD_ID)}`, body: '', id: ODD_ID },
  // The door signs GETs only; this row holds the body hash and the raised
  // method, which `canonicalRequestText` owns whatever the route.
  { name: 'lowercase-method-with-body', method: 'post', target: '/pair', body: '{"x":1}', id: null }
];

const requests = requestShapes.map((shape, i) => {
  const timestamp = String(T + i * 1_000);
  const nonce = sha256hex(`nonce ${shape.name}`).slice(0, 32);
  const facts = {
    method: shape.method,
    target: shape.target,
    bodySha256: sha256hex(Buffer.from(shape.body, 'utf8')),
    timestamp,
    nonce,
    binding
  };
  const canonical = pairing.canonicalRequestText(facts);
  const signature = pairing.signAsPhone(phoneSignPrivate, facts);
  // THE DOOR'S OWN VERIFIER accepts it, at the request's own clock.
  const verifier = new pairing.PocketRequestVerifier({
    identity: () => identity,
    phones: () => [phoneFields],
    now: () => Number(timestamp)
  });
  const verdict = verifier.verify({
    method: shape.method,
    target: shape.target,
    body: Buffer.from(shape.body, 'utf8'),
    from: PHONE_ADDRESS,
    headers: {
      'x-tortie-phone': identityVectors.phoneId,
      'x-tortie-timestamp': timestamp,
      'x-tortie-nonce': nonce,
      'x-tortie-signature': signature
    }
  });
  if (!verdict.ok) fail(`request ${shape.name}: the shipping verifier refused it (${verdict.reason})`);
  // THE DOOR'S OWN URL PARSE reads the target back byte for byte, and the id.
  const url = new URL(shape.target, `https://${PHONE_ADDRESS}`);
  if (`${url.pathname}${url.search}` !== shape.target) {
    fail(`request ${shape.name}: the door's URL parser reads the target as ${url.pathname}${url.search}`);
  }
  if (shape.id !== null && url.searchParams.get('id') !== shape.id) {
    fail(`request ${shape.name}: the door reads a different id`);
  }
  return {
    name: shape.name,
    method: shape.method,
    target: shape.target,
    id: shape.id,
    body: shape.body,
    bodySha256: facts.bodySha256,
    timestamp,
    nonce,
    canonical,
    signature
  };
});

// A signature for one target presented with another: refused `signature`.
const tampered = (() => {
  const base = requests[1];
  const target = `/v1/session?id=${queryValue('another-session')}`;
  const verifier = new pairing.PocketRequestVerifier({
    identity: () => identity,
    phones: () => [phoneFields],
    now: () => Number(base.timestamp)
  });
  const verdict = verifier.verify({
    method: 'GET',
    target,
    body: Buffer.alloc(0),
    from: PHONE_ADDRESS,
    headers: {
      'x-tortie-phone': identityVectors.phoneId,
      'x-tortie-timestamp': base.timestamp,
      'x-tortie-nonce': base.nonce,
      'x-tortie-signature': base.signature
    }
  });
  if (verdict.ok || verdict.reason !== 'signature') {
    fail(`the tampered target was not refused 'signature' (${verdict.ok ? 'accepted' : verdict.reason})`);
  }
  return {
    signedFor: base.name,
    target,
    canonical: pairing.canonicalRequestText({
      method: 'GET',
      target,
      bodySha256: base.bodySha256,
      timestamp: base.timestamp,
      nonce: base.nonce,
      binding
    }),
    doorSays: verdict.ok ? 'ok' : verdict.reason
  };
})();

// ---------------------------------------------------------------------------
// The existing file, whose random-bearing parts are kept while they hold
// ---------------------------------------------------------------------------

let recorded = null;
try {
  recorded = JSON.parse(readFileSync(OUT, 'utf8'));
} catch {
  recorded = null;
}

// ---------------------------------------------------------------------------
// Pins: the shipping certificate, its fingerprint and the QR's pin
// ---------------------------------------------------------------------------

/** A seal that seals nothing, for a throwaway identity in a scratch file. */
const openSeal = {
  available: () => true,
  seal: (text) => text,
  open: (blob) => (typeof blob === 'string' ? blob : null)
};
const colonHex = (buf) => (buf.toString('hex').toUpperCase().match(/.{2}/g) ?? []).join(':');

/** Does a recorded certificate still hash to its recorded fingerprints and pin? */
function pinHolds(entry) {
  try {
    const der = Buffer.from(entry.certificateDer, 'base64');
    const cert = new X509Certificate(der);
    const spki = cert.publicKey.export({ format: 'der', type: 'spki' });
    return (
      cert.publicKey.asymmetricKeyDetails?.namedCurve === 'prime256v1' &&
      colonHex(sha256(spki)) === entry.publicKeyFingerprint &&
      colonHex(sha256(der)) === entry.certificateFingerprint &&
      pairing.spkiPinOf(entry.publicKeyFingerprint) === entry.pin &&
      entry.pin !== b64u(sha256(der))
    );
  } catch {
    return false;
  }
}

function freshPins() {
  const dir = mkdtempSync(join(tmpdir(), 'p316-vectors-'));
  try {
    return ['first', 'second'].map((label) => {
      const outcome = tls.ensureDoorIdentity({
        path: join(dir, `${label}.json`),
        seal: openSeal,
        now: T,
        names: { addresses: [PHONE_ADDRESS], dnsNames: [] }
      });
      if (outcome.kind !== 'ready') throw new Error(`tls.ts refused: ${outcome.reason}`);
      const der = new X509Certificate(outcome.identity.certPem).raw;
      return {
        name: label,
        certificateDer: der.toString('base64'),
        certificateFingerprint: outcome.identity.certificateFingerprint,
        publicKeyFingerprint: outcome.identity.publicKeyFingerprint,
        pin: pairing.spkiPinOf(outcome.identity.publicKeyFingerprint)
      };
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const minted = freshPins();
for (const entry of minted) {
  if (!pinHolds(entry)) fail(`a certificate the shipping tls.ts just issued does not hold its own pin (${entry.name})`);
}
if (minted[0].pin === minted[1].pin) fail('two fresh door identities share a pin');
const recordedPins = Array.isArray(recorded?.pins) ? recorded.pins : null;
const pins =
  recordedPins !== null && recordedPins.length === 2 && recordedPins.every(pinHolds) && recordedPins[0].pin !== recordedPins[1].pin
    ? recordedPins
    : minted;
if (CHECK && pins !== recordedPins) fail('pins: the recorded certificates no longer hold their recorded fingerprint and pin');

// ---------------------------------------------------------------------------
// The sealed presentation
// ---------------------------------------------------------------------------

const PAIR_SECRET = seed('pairing secret').subarray(0, 16);
const SEAL_IV = seed('pairing iv').subarray(0, 12);

/** THE SHIPPING OPENER, as `POST /pair` runs it. */
const opener = new pairing.PocketPairing({
  identity: () => identity,
  fieldsNow: () => ({
    bindAddress: PHONE_ADDRESS,
    port: 8823,
    bindAtLaunch: false,
    routes: [...POCKET_ROUTE_IDS],
    phones: [],
    pushAlerts: false
  }),
  savePhones: () => true,
  publicKeyPin: () => pins[0].pin,
  now: () => T
});
/** What the shipping opener reads out of a body, or null. */
const doorOpens = (bodyText) => {
  // `openPresentation` is the method `present` calls; it is private to the
  // type and not to the runtime, and calling it names the exact code path.
  const opened = opener.openPresentation(PAIR_SECRET, Buffer.from(bodyText, 'utf8'));
  return opened === null
    ? null
    : { label: opened.label, signingKey: opened.signingKey, exchangeKey: opened.exchangeKey };
};
const presentedAs = { label: PHONE_LABEL, signingKey: ek, exchangeKey: xk };
const sameKeys = (opened) =>
  opened !== null &&
  opened.label === presentedAs.label &&
  opened.signingKey === presentedAs.signingKey &&
  opened.exchangeKey === presentedAs.exchangeKey;

// (a) The door's own sealer, whose nonce is random. The Swift must OPEN it.
const doorPlaintext = JSON.stringify({ label: PHONE_LABEL, ek, xk });
const freshDoorSeal = pairing
  .sealPresentationAsPhone(JSON.stringify({ ps: b64u(PAIR_SECRET) }), presentedAs)
  .toString('utf8');
if (!sameKeys(doorOpens(freshDoorSeal))) fail('the shipping opener cannot open the shipping sealer');
const recordedDoorSeal = recorded?.seal?.fromDoor;
const doorSealHolds = (entry) =>
  entry !== undefined &&
  entry !== null &&
  typeof entry.body === 'string' &&
  entry.plaintext === doorPlaintext &&
  sameKeys(doorOpens(entry.body));
const fromDoor = doorSealHolds(recordedDoorSeal)
  ? recordedDoorSeal
  : { body: freshDoorSeal, plaintext: doorPlaintext };
if (CHECK && fromDoor !== recordedDoorSeal) fail('seal.fromDoor: the recorded body no longer opens to the recorded plaintext');

// (b) The phone's sealing, at a fixed nonce, of the phone's own plaintext
// (keys sorted, as Swift's JSONEncoder writes them). The DOOR must open it.
const phonePlaintext = JSON.stringify({ ek, label: PHONE_LABEL, xk });
const sealKey = Buffer.from(hkdfSync('sha256', PAIR_SECRET, Buffer.alloc(0), 'tortie-pocket-pair-v1', 32));
const cipher = createCipheriv('aes-256-gcm', sealKey, SEAL_IV);
const phoneCt = Buffer.concat([cipher.update(phonePlaintext, 'utf8'), cipher.final()]);
const phoneBody = JSON.stringify({ ct: b64u(phoneCt), iv: b64u(SEAL_IV), tag: b64u(cipher.getAuthTag()) });
if (!sameKeys(doorOpens(phoneBody))) fail('the shipping opener cannot open the phone-shaped seal');

const seal = {
  secret: b64u(PAIR_SECRET),
  label: PHONE_LABEL,
  fromDoor,
  fromPhone: { iv: b64u(SEAL_IV), plaintext: phonePlaintext, body: phoneBody }
};

// ---------------------------------------------------------------------------
// QR v:2, from the shipping window
// ---------------------------------------------------------------------------

function mintQr(bindAddress, tailnetKey) {
  const window = new pairing.PocketPairing({
    identity: () => identity,
    fieldsNow: () => ({
      bindAddress,
      port: 8823,
      bindAtLaunch: true,
      routes: [...POCKET_ROUTE_IDS],
      phones: [],
      pushAlerts: false
    }),
    savePhones: () => true,
    publicKeyPin: () => pins[0].pin,
    now: () => T
  });
  const offer = window.open({ tailnetKey });
  window.cancel();
  return offer.payload;
}

/** The payload with its one random field, `ps`, replaced. */
const withPs = (payload, ps) => JSON.stringify({ ...JSON.parse(payload), ps });
const qrShapes = [
  { name: 'tailnet-with-key', bindAddress: '100.101.102.103', tailnetKey: MADE_UP_TAILNET_KEY },
  { name: 'tailnet-no-key', bindAddress: '100.101.102.103', tailnetKey: null },
  { name: 'loopback', bindAddress: PHONE_ADDRESS, tailnetKey: null }
];
const qr = qrShapes.map((shape) => {
  const fresh = mintQr(shape.bindAddress, shape.tailnetKey);
  const parsed = JSON.parse(fresh);
  if (parsed.v !== 2 || parsed.fp !== pins[0].pin || parsed.dk !== identity.signPublic || parsed.dx !== identity.exchangePublic) {
    fail(`qr ${shape.name}: the shipping window minted a payload this file does not describe`);
  }
  const old = Array.isArray(recorded?.qr) ? recorded.qr.find((q) => q.name === shape.name) : undefined;
  const oldPs = typeof old?.payload === 'string' ? JSON.parse(old.payload).ps : undefined;
  const keep = typeof oldPs === 'string' && withPs(fresh, oldPs) === old.payload;
  if (CHECK && !keep) fail(`qr ${shape.name}: the shipping window now mints a different payload`);
  return { name: shape.name, payload: keep ? old.payload : fresh };
});

// ---------------------------------------------------------------------------
// The answers, from the shipping route composer
// ---------------------------------------------------------------------------

const PROJECT_PATH = '/Users/p316/tortie';
const S = {
  waiting: '4d8f2c1a-9b7e-4c3d-8a21-5e6f7a8b9c01',
  talk: SESSION_TALK,
  quiet: '4d8f2c1a-9b7e-4c3d-8a21-5e6f7a8b9c03',
  remote: '4d8f2c1a-9b7e-4c3d-8a21-5e6f7a8b9c04',
  failed: '4d8f2c1a-9b7e-4c3d-8a21-5e6f7a8b9c05'
};
const aSession = (id, name, status, createdAt, extra = {}) => ({
  id,
  name,
  tmuxName: name,
  projectPath: PROJECT_PATH,
  cwd: PROJECT_PATH,
  agent: 'claude',
  status,
  createdAt,
  ...extra
});
const sessions = [
  aSession(S.waiting, 'fix-login', 'needs_input', T - 3_600_000),
  aSession(S.talk, 'talk', 'running', T - 7_200_000),
  aSession(S.quiet, 'quiet', 'idle', T - 86_400_000),
  aSession(S.remote, 'far-away', 'idle', T - 600_000, { machine: { id: 'm1', label: 'Mac Pro' } }),
  aSession(S.failed, 'broken', 'exited', T - 900_000, { exitCode: 1 })
];

const aTurn = (index, askText, answerText, extra = {}) => ({
  sessionId: S.talk,
  index,
  askText,
  askAt: new Date(T - 7_000_000 + index * 60_000).toISOString(),
  answerText,
  answerAt: answerText === null ? null : new Date(T - 7_000_000 + index * 60_000 + 30_000).toISOString(),
  queued: 0,
  closed: answerText !== null,
  interrupted: false,
  notice: null,
  stopReason: null,
  durationMs: null,
  paths: [],
  pathSource: 'text-only',
  gitVerdict: null,
  gitCheckedAt: null,
  ...extra
});
const TALK = Array.from({ length: 45 }, (_, i) => {
  if (i === 7) return aTurn(i, 'Keep **this** plain and _that_ `too`', '**x** is bold here, and `code` is code');
  if (i === 20) return aTurn(i, 'stop that', null, { interrupted: true, closed: true });
  if (i === 30) return aTurn(i, 'squash it', 'Squashed.', { notice: 'The conversation was compacted here' });
  if (i === 44) return aTurn(i, 'and now the phone', null, { closed: false });
  return aTurn(i, `ask ${String(i)}`, `answer ${String(i)}`);
});
const turnsOf = new Map([[S.talk, TALK]]);
/** The store's two readers' semantics: ascending, the LAST `limit` of the range. */
const store = {
  listTurns(sessionId, limit) {
    const all = turnsOf.get(sessionId) ?? [];
    return limit === undefined ? [...all] : all.slice(Math.max(0, all.length - limit));
  },
  listTurnsBetween(sessionId, from, to, limit) {
    const range = (turnsOf.get(sessionId) ?? []).filter((t) => t.index >= from && t.index <= to);
    return limit === undefined ? range : range.slice(Math.max(0, range.length - limit));
  }
};
const statusOf = (id) => sessions.find((s) => s.id === id)?.status ?? 'idle';

const facts = {
  sessions: () => sessions,
  projects: () => [{ path: PROJECT_PATH, name: 'tortie' }],
  blockedSince: () => new Map([[S.waiting, T - 120_000]]),
  wakes: () => [],
  activity: (id) =>
    ({
      [S.waiting]: {
        question: 'Do you want to **proceed** with `rm -rf build`?',
        choice: {
          atChoice: true,
          options: [
            { marker: '1', text: 'Yes' },
            { marker: '2', text: 'No, and tell Claude what to do differently' }
          ]
        },
        lastActivityAt: T - 60_000
      },
      [S.talk]: { lastActivityAt: T - 5_000 },
      [S.quiet]: { lastActivityAt: T - 3_600_000 }
    })[id],
  statusWord: (session) => {
    const word = statusVisual(session.status, session);
    return { dot: word.dot, label: word.label };
  },
  agentLabel: (agent) => (agent === 'claude' ? 'Claude Code' : agent),
  machineLabel: (session) => session.machine?.label ?? null,
  emptyLine: NOTHING_NEEDS_YOU,
  refresh: async (id) =>
    id === S.talk
      ? {
          sessionId: id,
          coverage: 'complete',
          reason: null,
          userMessages: 45,
          agentMessages: 42,
          lastMessageAt: T - 5_000,
          lastMessageBy: 'you',
          lastMessageClock: 'message',
          readAt: T
        }
      : {
          sessionId: id,
          coverage: 'not-applicable',
          reason: 'remote',
          userMessages: null,
          agentMessages: null,
          lastMessageAt: null,
          lastMessageBy: null,
          lastMessageClock: null,
          readAt: null
        },
  catchUp: async (id) => (id === S.talk ? { ask: 'and now the phone', outcome: 'Working on it' } : null),
  lastTurn: async (id) => {
    const last = store.listTurns(id, 1)[0];
    return {
      answerText: last === undefined ? null : pocketTurnOf(last, statusOf(id)).answerText,
      turnCount: (turnsOf.get(id) ?? []).length
    };
  },
  turns: async (id, range) => readPocketTurns(store, id, range, statusOf(id)),
  handoff: () => null,
  now: () => T
};
const routes = createPocketRoutes(facts);

/** The same answer with fields no phone knows, at three depths. */
function withUnknown(answer) {
  const copy = JSON.parse(JSON.stringify(answer));
  copy.futureField = { nested: [1, 2, 3], note: 'a newer Mac' };
  const row = copy.rows?.[0] ?? copy.others?.[0] ?? copy.session ?? copy.turns?.[0];
  if (row !== undefined) row.futureRowField = 'ignored';
  return copy;
}

const answerShapes = [
  ['blocked', () => routes.blocked()],
  ['session-talk', () => routes.session(S.talk)],
  ['session-waiting', () => routes.session(S.waiting)],
  ['turns-newest', () => routes.turns(S.talk, { limit: '20' })],
  ['turns-to-24', () => routes.turns(S.talk, { limit: '20', to: '24' })],
  ['turns-to-4', () => routes.turns(S.talk, { limit: '20', to: '4' })],
  ['turns-quiet', () => routes.turns(S.quiet, { limit: '20' })],
  ['turns-remote', () => routes.turns(S.remote, { limit: '20' })]
];
const answers = {};
for (const [name, compose] of answerShapes) {
  const answer = await compose();
  if (answer === null) {
    fail(`answer ${name}: the shipping composer answered nothing`);
    continue;
  }
  answers[name] = { json: JSON.stringify(answer), withUnknown: JSON.stringify(withUnknown(answer)) };
}

// ---------------------------------------------------------------------------
// Written or compared
// ---------------------------------------------------------------------------

const vectors = {
  about:
    'Written by build/p316/vectors.mjs from the shipping TypeScript. Test keys from public seeds; they pair with nothing. The tailnet key is made up.',
  keys,
  identity: identityVectors,
  requests,
  tampered,
  pins,
  seal,
  qr,
  madeUpTailnetKey: MADE_UP_TAILNET_KEY,
  answers
};
const text = `${JSON.stringify(vectors, null, 2)}\n`;

if (CHECK) {
  if (recorded === null) {
    fail(`${OUT} is missing or is not JSON; run node build/p316/vectors.mjs`);
  } else {
    const had = `${JSON.stringify(recorded, null, 2)}\n`;
    const onDisk = readFileSync(OUT, 'utf8');
    if (onDisk !== had) fail('the committed file is not in the form this script writes');
    for (const key of Object.keys(vectors)) {
      if (JSON.stringify(recorded[key]) !== JSON.stringify(vectors[key])) {
        fail(`"${key}" differs from what the shipping TypeScript produces now`);
      }
    }
    for (const key of Object.keys(recorded)) {
      if (!(key in vectors)) fail(`"${key}" is in the committed file and this script writes no such section`);
    }
  }
}

if (problems.length > 0) {
  process.stdout.write(`${TAG} FAIL, ${String(problems.length)}:\n`);
  for (const p of problems) process.stdout.write(`  - ${p}\n`);
  process.exit(1);
}

const counts =
  `${String(requests.length)} signed requests (and 1 tampered), ${String(pins.length)} pins, 2 seals, ` +
  `${String(qr.length)} QR payloads, ${String(Object.keys(answers).length)} answers`;
if (CHECK) {
  process.stdout.write(`${TAG} PASS: ios/TortieTests/Fixtures/vectors.json is what the shipping TypeScript produces: ${counts}.\n`);
} else {
  writeFileSync(OUT, text, 'utf8');
  process.stdout.write(`${TAG} wrote ios/TortieTests/Fixtures/vectors.json: ${counts}.\n`);
}
