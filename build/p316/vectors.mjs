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
 *   keys      five keys from fixed, public seeds: the phone's two, the Mac's
 *             two, and the phone's P-256 CLIENT key (Phase 330). They are TEST
 *             KEYS that pair with nothing, derived from their labels so
 *             anybody can regenerate them; no key of anybody's is read.
 *   identity  `phoneIdOf`, `pairFingerprint` over all three of the phone's keys
 *             (`tortie-pocket-fp-v2`), `pairingBinding` (from the Mac's side;
 *             the Swift derives the same binding from the phone's) and
 *             `clientKeyPinOf`, the pin the door admits the client key by.
 *   requests  `canonicalRequestText` and `signAsPhone` (Node's Ed25519 is
 *             deterministic) for six requests, each ACCEPTED by the shipping
 *             `PocketRequestVerifier` here over the phone's own channel, and
 *             one tampered target it refuses `signature`. The targets are
 *             spelled the way the Swift client spells them, and the door's own
 *             URL parser reads each back to the same bytes and the same `id`.
 *             Phase 317 adds the WRITE (build/p317/SPEC.md §6.3): `POST
 *             /v1/end` with a fixed body, the bytes Swift's JSONEncoder writes
 *             with `.sortedKeys`, at most its route's cap in the shipping
 *             `POCKET_WRITE_BODY_CAPS`. (Its fix round took `POST /v1/unpair`
 *             out, and its vector with it.)
 *   writeTampered  (Phase 317) the end write's signature presented over its
 *             body with ONE BYTE CHANGED, which the shipping verifier refuses
 *             `signature`: the body is covered, not only the target.
 *   pins      two door certificates issued by the shipping `tls.ts` for the
 *             public name, with the `publicKeyFingerprint` it reports and the
 *             QR pin `spkiPinOf` makes of it.
 *   client    the client certificate the shipping `issueClientCertificate`
 *             issued over the client key, signed by the first door's key. The
 *             Swift must build a SecCertificate from it and read back `ck`.
 *   pushSeal  the presentation carrying an alert address (Phase 316.5): the
 *             phone's plaintext with `ape` and `apt` (keys sorted, as Swift's
 *             JSONEncoder writes them) sealed at a fixed nonce and signed, which
 *             the SHIPPING `openPresentation` must open to exactly that token
 *             and environment. The Swift must write the same plaintext.
 *   alerts    Phase 314's three alert shapes, composed by the SHIPPING
 *             `composeAlert` and `composeBadge` (src/main/push/alert.ts) over
 *             the shipping `/v1/blocked` rows below, each with the tap the
 *             phone's `AlertTap.parse` must answer: the single alert opens the
 *             session its row names, the count alert and the badge the list.
 *   seal      the presentation v2 (Phase 330): the window's challenge
 *             (`pairingChallengeOf`), the proof text (`presentationProofText`),
 *             the shipping `sealPresentationAsPhone` output, which the Swift
 *             must OPEN to the same plaintext; and the phone's own sealing of
 *             its own plaintext under a fixed nonce, signed by Node over the
 *             same proof, which the shipping opener must open to the same keys
 *             and label and whose signature holds over the shipping proof.
 *   qr        two QR v:3 payloads from the shipping `PocketPairing.open`, one
 *             per public port.
 *   pairAnswers  `/pair`'s three answers as the shipping handler writes them:
 *             `pending` and `refused` from the shipping `present`, and
 *             `allowed` carrying the client certificate above; and (Phase
 *             316.5, research 136 §9) `pendingSends`, the `pending` a Mac that
 *             can send an alert answers, `{"state":"pending","alerts":true}`,
 *             the one cue on which the phone asks iOS for alerts. A Mac that
 *             cannot send answers `pending` byte for byte as before.
 *   answers   the three reads composed by the shipping `createPocketRoutes`,
 *             turns through the shipping `readPocketTurns`, over fixed facts
 *             at a fixed clock; each also with fields the phone does not know.
 *             Since Phase 317 every row carries the End the SHIPPING
 *             `endOfferOf` (src/main/sessions/pocket-writes.ts) decides over
 *             it, its manifest record and whether Tortie holds a row for its
 *             machine, and a session offered End carries the Mac's own
 *             `endConfirm`: a running, a waiting and an idle session are
 *             offered End and End these, the idle one on a machine Tortie
 *             holds no row for is offered End alone (`batch: false`, the Mac
 *             batch's one narrowing), and the exited one is offered nothing.
 *
 * --check. Regenerates everything in memory and compares. The deterministic
 * vectors must match byte for byte. The ones that carry a random value (the
 * seal from the door's sealer, the door certificates, the client certificate
 * and the QR's one-shot secret) are held by RELATION instead: the recorded
 * seal must still open under the shipping opener with its signature holding,
 * each recorded door certificate must still hash to its recorded fingerprint
 * and pin, the recorded client certificate must still carry `ck` and verify
 * under the first door's key, and a freshly minted QR must equal the recorded
 * one with only `ps` differing. A write run keeps a recorded random value that
 * still holds, so regenerating an unchanged tree changes no byte.
 *
 * WHAT IT DOES NOT DO. It opens no socket, starts no Electron, binds nothing
 * and reads nothing under the person's home. Its one scratch directory (the
 * certificates' sealed file, sealed by a seal that seals nothing) is under
 * `os.tmpdir()` and removed in a `finally`. It prints no key, no signature and
 * no conversation line; the file it writes holds only the test keys above.
 * The public name, the tailnet and the program path are made up.
 *
 * It runs itself under the pinned tsx (`build/ts-runner.mjs`) so it can import
 * the TypeScript it is holding the Swift to.
 */

import { spawnSync } from 'node:child_process';
import {
  X509Certificate,
  createCipheriv,
  createECDH,
  createHash,
  createPrivateKey,
  createPublicKey,
  hkdfSync,
  sign as signWith,
  verify as verifyWith
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
const { createPocketHandler } = await import('../../src/main/pocket/server.ts');
const { createPocketRoutes } = await import('../../src/main/pocket/routes.ts');
const { readPocketTurns, pocketTurnOf } = await import('../../src/main/pocket/facts.ts');
const { statusVisual } = await import('../../src/shared/status-words.ts');
const { POCKET_ROUTE_IDS } = await import('../../src/shared/ipc/pocket.ts');
const { NOTHING_NEEDS_YOU } = await import('../../src/main/tray/attention.ts');
const { composeAlert, composeBadge } = await import('../../src/main/push/alert.ts');
// Phase 317: the End each row is offered, decided by the shipping pure verdict.
const pocketWrites = await import('../../src/main/sessions/pocket-writes.ts').catch((err) => ({ loadError: String(err?.message ?? err) }));

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
/** The made-up door every vector is for (Phase 330): a public name, a Funnel port, a tailnet and a program path. */
const PUBLIC_NAME = 'p330-mac.tail00000.ts.net';
const PUBLIC_PORT = 8443;
const TAILNET = 'p330-vectors.example';
const FUNNEL_PROGRAM = '/p330/vectors/tailscale';

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

const seeds = {
  phoneSigning: seed('phone signing'),
  phoneExchange: seed('phone exchange'),
  macSigning: seed('mac signing'),
  macExchange: seed('mac exchange'),
  phoneClient: seed('phone client')
};
const phoneSignPrivate = privateOf('ed25519', seeds.phoneSigning);
const phoneExchangePrivate = privateOf('x25519', seeds.phoneExchange);
const ek = spkiOf(phoneSignPrivate);
const xk = spkiOf(phoneExchangePrivate);
// The phone's P-256 client key, from its seed as the private scalar. The
// Swift imports its X9.63 form (`04 || x || y || d`) where a test needs the
// identity the certificate below makes.
const clientEcdh = createECDH('prime256v1');
clientEcdh.setPrivateKey(seeds.phoneClient);
const clientPoint = clientEcdh.getPublicKey();
const clientPrivate = createPrivateKey({
  key: {
    kty: 'EC',
    crv: 'P-256',
    d: b64u(seeds.phoneClient),
    x: b64u(clientPoint.subarray(1, 33)),
    y: b64u(clientPoint.subarray(33, 65))
  },
  format: 'jwk'
});
const ck = spkiOf(clientPrivate);
if (!pairing.isClientKeySpki(ck)) fail('the client key is not a key the shipping door admits (isClientKeySpki)');
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
  clientKey: ck,
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
  macExchangeKey: identity.exchangePublic,
  clientKey: ck,
  clientKeyX963: Buffer.concat([clientPoint, seeds.phoneClient]).toString('hex'),
  clientKeyPkcs8: clientPrivate.export({ format: 'der', type: 'pkcs8' }).toString('base64')
};

const binding = pairing.pairingBinding(identity, phoneFields);
const identityVectors = {
  phoneId: pairing.phoneIdOf(ek),
  fingerprint: pairing.pairFingerprint(ek, xk, ck),
  binding,
  clientPin: pairing.clientKeyPinOf(ck)
};
if (identityVectors.clientPin !== b64u(sha256(Buffer.from(ck, 'base64url')))) {
  fail('clientKeyPinOf is not sha256 over the client key\'s SPKI DER, base64url');
}

/** Every door's fields, as the shipping hash reads them, for one public port. */
const fieldsAt = (publicPort, phones = []) => ({
  funnelProgram: FUNNEL_PROGRAM,
  tailnet: TAILNET,
  publicName: PUBLIC_NAME,
  publicPort,
  bindAtLaunch: false,
  routes: [...POCKET_ROUTE_IDS],
  phones,
  pushAlerts: false
});

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
/** Phase 317: a fixed write id, 32 lowercase hex, from a public label. */
const WRITE_END = sha256hex('tortie-p317-vector write end').slice(0, 32);

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
  { name: 'lowercase-method-with-body', method: 'post', target: '/pair', body: '{"x":1}', id: null },
  // PHASE 317: the write, signed over POST, its path and its body
  // (build/p317/SPEC.md §5.8.1). The body is what Swift's JSONEncoder writes
  // with `.sortedKeys`, a fresh 32-hex write id each time; the id here is
  // fixed so the vector is.
  { name: 'end', method: 'POST', target: '/v1/end', body: JSON.stringify({ batch: false, session: SESSION_TALK, write: WRITE_END }), id: null }
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
    // The phone's own connection: its client key completed the handshake.
    channel: identityVectors.phoneId,
    headers: {
      'x-tortie-phone': identityVectors.phoneId,
      'x-tortie-timestamp': timestamp,
      'x-tortie-nonce': nonce,
      'x-tortie-signature': signature
    }
  });
  if (!verdict.ok) fail(`request ${shape.name}: the shipping verifier refused it (${verdict.reason})`);
  // THE DOOR'S OWN URL PARSE reads the target back byte for byte, and the id.
  const url = new URL(shape.target, `https://${PUBLIC_NAME}:${String(PUBLIC_PORT)}`);
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
    channel: identityVectors.phoneId,
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

// PHASE 317: the write is within the shipping cap, written with sorted keys,
// and a body with one byte changed is refused `signature`.
const { POCKET_WRITE_BODY_CAPS } = await import('../../src/main/pocket/door/limits.ts');
for (const name of ['end']) {
  const r = requests.find((x) => x.name === name);
  const cap = POCKET_WRITE_BODY_CAPS?.[name];
  if (typeof cap !== 'number') {
    fail(`write ${name}: the shipping door/limits.ts declares no POCKET_WRITE_BODY_CAPS.${name}`);
    continue;
  }
  if (Buffer.byteLength(r.body, 'utf8') > cap) fail(`write ${name}: its body is ${String(Buffer.byteLength(r.body, 'utf8'))} bytes, over the shipping cap of ${String(cap)}`);
  const keys = Object.keys(JSON.parse(r.body));
  if (keys.join() !== [...keys].sort().join()) fail(`write ${name}: its body's keys are not sorted, which is how Swift's JSONEncoder writes them with .sortedKeys`);
  if (!/^[0-9a-f]{32}$/.test(JSON.parse(r.body).write)) fail(`write ${name}: its write id is not 32 lowercase hex`);
}
const writeTampered = (() => {
  const base = requests.find((x) => x.name === 'end');
  // One byte of the body changed: the session id's last character.
  const at = base.body.indexOf(SESSION_TALK) + SESSION_TALK.length - 1;
  const body = `${base.body.slice(0, at)}${base.body[at] === '3' ? '4' : '3'}${base.body.slice(at + 1)}`;
  const verifier = new pairing.PocketRequestVerifier({
    identity: () => identity,
    phones: () => [phoneFields],
    now: () => Number(base.timestamp)
  });
  const verdict = verifier.verify({
    method: 'POST',
    target: base.target,
    body: Buffer.from(body, 'utf8'),
    channel: identityVectors.phoneId,
    headers: {
      'x-tortie-phone': identityVectors.phoneId,
      'x-tortie-timestamp': base.timestamp,
      'x-tortie-nonce': base.nonce,
      'x-tortie-signature': base.signature
    }
  });
  if (verdict.ok || verdict.reason !== 'signature') {
    fail(`the end write with one body byte changed was not refused 'signature' (${verdict.ok ? 'accepted' : verdict.reason})`);
  }
  return {
    signedFor: base.name,
    body,
    bodySha256: sha256hex(Buffer.from(body, 'utf8')),
    canonical: pairing.canonicalRequestText({
      method: 'POST',
      target: base.target,
      bodySha256: sha256hex(Buffer.from(body, 'utf8')),
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
// Pins: the shipping door certificates, their fingerprints and the QR's pin
// ---------------------------------------------------------------------------

/** A seal that seals nothing, for a throwaway identity in a scratch file. */
const openSeal = {
  available: () => true,
  seal: (text) => text,
  open: (blob) => (typeof blob === 'string' ? blob : null)
};
const colonHex = (buf) => (buf.toString('hex').toUpperCase().match(/.{2}/g) ?? []).join(':');

/** Does a recorded door certificate still hash to its recorded fingerprints and pin, for the public name? */
function pinHolds(entry) {
  try {
    const der = Buffer.from(entry.certificateDer, 'base64');
    const cert = new X509Certificate(der);
    const spki = cert.publicKey.export({ format: 'der', type: 'spki' });
    return (
      cert.publicKey.asymmetricKeyDetails?.namedCurve === 'prime256v1' &&
      cert.checkHost(PUBLIC_NAME) === PUBLIC_NAME &&
      colonHex(sha256(spki)) === entry.publicKeyFingerprint &&
      colonHex(sha256(der)) === entry.certificateFingerprint &&
      pairing.spkiPinOf(entry.publicKeyFingerprint) === entry.pin &&
      entry.pin !== b64u(sha256(der))
    );
  } catch {
    return false;
  }
}

/** Two fresh door identities for the public name, and the first one's key to issue with (never written). */
function freshPins() {
  const dir = mkdtempSync(join(tmpdir(), 'p330-vectors-'));
  try {
    const made = ['first', 'second'].map((label) => {
      const outcome = tls.ensureDoorIdentity({
        path: join(dir, `${label}.json`),
        seal: openSeal,
        now: T,
        names: { addresses: [], dnsNames: [PUBLIC_NAME] }
      });
      if (outcome.kind !== 'ready') throw new Error(`tls.ts refused: ${outcome.reason}`);
      const der = new X509Certificate(outcome.identity.certPem).raw;
      return {
        keyPem: outcome.identity.keyPem,
        entry: {
          name: label,
          certificateDer: der.toString('base64'),
          certificateFingerprint: outcome.identity.certificateFingerprint,
          publicKeyFingerprint: outcome.identity.publicKeyFingerprint,
          pin: pairing.spkiPinOf(outcome.identity.publicKeyFingerprint)
        }
      };
    });
    return { pins: made.map((m) => m.entry), firstKeyPem: made[0].keyPem };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Does a recorded client certificate carry `ck`, ask for client auth, and verify under the first door's key? */
function clientHolds(entry, doorPin) {
  try {
    const cert = new X509Certificate(Buffer.from(entry.certificateDer, 'base64'));
    const door = new X509Certificate(Buffer.from(doorPin.certificateDer, 'base64'));
    return (
      b64u(cert.publicKey.export({ format: 'der', type: 'spki' })) === ck &&
      entry.clientKey === ck &&
      cert.verify(door.publicKey) &&
      (cert.keyUsage ?? []).includes('1.3.6.1.5.5.7.3.2') &&
      cert.subject === 'CN=Tortie phone'
    );
  } catch {
    return false;
  }
}

const minted = freshPins();
for (const entry of minted.pins) {
  if (!pinHolds(entry)) fail(`a certificate the shipping tls.ts just issued does not hold its own pin (${entry.name})`);
}
if (minted.pins[0].pin === minted.pins[1].pin) fail('two fresh door identities share a pin');
const mintedClient = {
  clientKey: ck,
  certificateDer: tls.issueClientCertificate(minted.firstKeyPem, ck, T).toString('base64')
};
if (!clientHolds(mintedClient, minted.pins[0])) fail('the client certificate the shipping tls.ts just issued does not carry ck or verify under its door');
const recordedPins = Array.isArray(recorded?.pins) ? recorded.pins : null;
const recordedClient = recorded?.client ?? null;
const recordedHolds =
  recordedPins !== null &&
  recordedPins.length === 2 &&
  recordedPins.every(pinHolds) &&
  recordedPins[0].pin !== recordedPins[1].pin &&
  recordedClient !== null &&
  clientHolds(recordedClient, recordedPins[0]);
// The client certificate is signed by the first door's key, which is never
// written, so the two are kept, or minted, together.
const pins = recordedHolds ? recordedPins : minted.pins;
const client = recordedHolds ? recordedClient : mintedClient;
if (CHECK && !recordedHolds) fail('pins and client: the recorded certificates no longer hold their recorded fingerprints, pin, key and issuer');

// ---------------------------------------------------------------------------
// The sealed, signed presentation (v2, Phase 330)
// ---------------------------------------------------------------------------

const PAIR_SECRET = seed('pairing secret').subarray(0, 16);
const SEAL_IV = seed('pairing iv').subarray(0, 12);
const challenge = pairing.pairingChallengeOf(PAIR_SECRET);

/** THE SHIPPING OPENER, as `present` runs it. */
const opener = new pairing.PocketPairing({
  identity: () => identity,
  fieldsNow: () => fieldsAt(PUBLIC_PORT),
  savePhones: () => true,
  publicKeyPin: () => pins[0].pin,
  issueCertificate: () => client.certificateDer,
  now: () => T
});
/** Does the shipping proof text, over this body's own fields, verify under its `ek`? */
const proofHolds = (outer) => {
  try {
    const text = pairing.presentationProofText(challenge, outer.iv, outer.ct, outer.tag);
    return verifyWith(
      null,
      Buffer.from(text, 'utf8'),
      createPublicKey({ key: Buffer.from(outer.ek, 'base64url'), format: 'der', type: 'spki' }),
      Buffer.from(outer.sig, 'base64url')
    );
  } catch {
    return false;
  }
};
/** What the shipping opener reads out of a body, or null. */
const doorOpens = (bodyText) => {
  let outer;
  try {
    outer = JSON.parse(bodyText);
  } catch {
    return null;
  }
  if (Object.keys(outer).sort().join() !== 'ct,ek,iv,sig,tag') return null;
  // `openPresentation` is the method `present` calls; it is private to the
  // type and not to the runtime, and calling it names the exact code path.
  const opened = opener.openPresentation(PAIR_SECRET, outer);
  return opened === null
    ? null
    : { label: opened.label, signingKey: opened.signingKey, exchangeKey: opened.exchangeKey, clientKey: opened.clientKey, proof: proofHolds(outer) };
};
const presentedAs = { label: PHONE_LABEL, signingKey: ek, exchangeKey: xk, clientKey: ck };
const sameKeys = (opened) =>
  opened !== null &&
  opened.proof === true &&
  opened.label === presentedAs.label &&
  opened.signingKey === presentedAs.signingKey &&
  opened.exchangeKey === presentedAs.exchangeKey &&
  opened.clientKey === presentedAs.clientKey;

// (a) The door's own sealer, whose nonce is random. The Swift must OPEN it.
const doorPlaintext = JSON.stringify({ ck, ek, label: PHONE_LABEL, xk });
const freshDoorSeal = pairing
  .sealPresentationAsPhone(JSON.stringify({ ps: b64u(PAIR_SECRET) }), presentedAs, phoneSignPrivate)
  .toString('utf8');
if (!sameKeys(doorOpens(freshDoorSeal))) fail('the shipping opener cannot open, or the shipping proof does not hold over, the shipping sealer');
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
if (CHECK && fromDoor !== recordedDoorSeal) fail('seal.fromDoor: the recorded body no longer opens to the recorded plaintext with its proof holding');

// (b) The phone's sealing, at a fixed nonce, of the phone's own plaintext
// (keys sorted, as Swift's JSONEncoder writes them), signed over the shipping
// proof text. The DOOR must open it and its signature must hold. Node's
// Ed25519 is deterministic, so the signature is a vector; CryptoKit's is not,
// so the Swift is held to the proof text and to the signature verifying.
const phonePlaintext = JSON.stringify({ ck, ek, label: PHONE_LABEL, xk });
const sealKey = Buffer.from(hkdfSync('sha256', PAIR_SECRET, Buffer.alloc(0), 'tortie-pocket-pair-v1', 32));
const cipher = createCipheriv('aes-256-gcm', sealKey, SEAL_IV);
const phoneCt = Buffer.concat([cipher.update(phonePlaintext, 'utf8'), cipher.final()]);
const phoneSealed = { iv: b64u(SEAL_IV), ct: b64u(phoneCt), tag: b64u(cipher.getAuthTag()) };
const phoneProof = pairing.presentationProofText(challenge, phoneSealed.iv, phoneSealed.ct, phoneSealed.tag);
const phoneSig = b64u(signWith(null, Buffer.from(phoneProof, 'utf8'), phoneSignPrivate));
const phoneBody = JSON.stringify({ ct: phoneSealed.ct, ek, iv: phoneSealed.iv, sig: phoneSig, tag: phoneSealed.tag });
if (!sameKeys(doorOpens(phoneBody))) fail('the shipping opener cannot open, or the shipping proof does not hold over, the phone-shaped body');

const seal = {
  secret: b64u(PAIR_SECRET),
  challenge,
  label: PHONE_LABEL,
  fromDoor,
  fromPhone: { iv: phoneSealed.iv, plaintext: phonePlaintext, ct: phoneSealed.ct, tag: phoneSealed.tag, proof: phoneProof, sig: phoneSig, body: phoneBody }
};

// (c) Phase 316.5: the phone's presentation WITH an alert address. The token
// is a made-up test token from a public seed, 64 hex digits the way Apple's
// 32 bytes are written, and the environment is the one a DEBUG build presents.
// The plaintext is the Swift's (keys sorted, `ape` and `apt` first), sealed at
// a fixed nonce and signed; the SHIPPING opener must open it to exactly this
// address, and the body without the address must still open to none.
const PUSH_TOKEN = sha256hex('tortie-p3165-vector push token');
const PUSH_ENVIRONMENT = 'development';
const PUSH_IV = seed('pairing push iv').subarray(0, 12);
const pushPlaintext = JSON.stringify({ ape: PUSH_ENVIRONMENT, apt: PUSH_TOKEN, ck, ek, label: PHONE_LABEL, xk });
const pushCipher = createCipheriv('aes-256-gcm', sealKey, PUSH_IV);
const pushCt = Buffer.concat([pushCipher.update(pushPlaintext, 'utf8'), pushCipher.final()]);
const pushSealed = { iv: b64u(PUSH_IV), ct: b64u(pushCt), tag: b64u(pushCipher.getAuthTag()) };
const pushProof = pairing.presentationProofText(challenge, pushSealed.iv, pushSealed.ct, pushSealed.tag);
const pushSig = b64u(signWith(null, Buffer.from(pushProof, 'utf8'), phoneSignPrivate));
const pushBody = JSON.stringify({ ct: pushSealed.ct, ek, iv: pushSealed.iv, sig: pushSig, tag: pushSealed.tag });
/** The address the SHIPPING opener reads out of a body, or null when it refuses the body. */
const doorOpensPush = (bodyText) => {
  const outer = JSON.parse(bodyText);
  const opened = opener.openPresentation(PAIR_SECRET, outer);
  return opened === null ? null : { pushToken: opened.pushToken, pushEnvironment: opened.pushEnvironment, keys: sameKeys({ ...opened, proof: proofHolds(outer) }) };
};
const pushOpened = doorOpensPush(pushBody);
if (pushOpened === null || !pushOpened.keys || pushOpened.pushToken !== PUSH_TOKEN || pushOpened.pushEnvironment !== PUSH_ENVIRONMENT) {
  fail('the shipping opener does not open the phone-shaped body with an alert address to that address and those keys');
}
const plainOpened = doorOpensPush(phoneBody);
if (plainOpened === null || plainOpened.pushToken !== '' || plainOpened.pushEnvironment !== '') {
  fail('the shipping opener reads an alert address out of a body that carries none');
}
const pushSeal = {
  token: PUSH_TOKEN,
  environment: PUSH_ENVIRONMENT,
  iv: pushSealed.iv,
  plaintext: pushPlaintext,
  ct: pushSealed.ct,
  tag: pushSealed.tag,
  proof: pushProof,
  sig: pushSig,
  body: pushBody,
  opened: { pushToken: pushOpened?.pushToken ?? null, pushEnvironment: pushOpened?.pushEnvironment ?? null }
};

// ---------------------------------------------------------------------------
// QR v:3, from the shipping window
// ---------------------------------------------------------------------------

/** A shipping window over the public name at `publicPort`. */
const windowAt = (publicPort) =>
  new pairing.PocketPairing({
    identity: () => identity,
    fieldsNow: () => fieldsAt(publicPort),
    savePhones: () => true,
    publicKeyPin: () => pins[0].pin,
    issueCertificate: () => client.certificateDer,
    now: () => T
  });

/** The payload with its one random field, `ps`, replaced. */
const withPs = (payload, ps) => JSON.stringify({ ...JSON.parse(payload), ps });
const qrShapes = [
  { name: 'funnel-8443', publicPort: 8443 },
  { name: 'funnel-10000', publicPort: 10000 }
];
const qr = qrShapes.map((shape) => {
  const window = windowAt(shape.publicPort);
  const fresh = window.open().payload;
  window.cancel();
  const parsed = JSON.parse(fresh);
  if (
    parsed.v !== 3 ||
    parsed.host !== PUBLIC_NAME ||
    parsed.port !== shape.publicPort ||
    parsed.fp !== pins[0].pin ||
    parsed.dk !== identity.signPublic ||
    parsed.dx !== identity.exchangePublic ||
    Object.keys(parsed).join() !== 'v,host,port,fp,dk,dx,ps,exp'
  ) {
    fail(`qr ${shape.name}: the shipping window minted a payload this file does not describe`);
  }
  const old = Array.isArray(recorded?.qr) ? recorded.qr.find((q) => q.name === shape.name) : undefined;
  const oldPs = typeof old?.payload === 'string' ? JSON.parse(old.payload).ps : undefined;
  const keep = typeof oldPs === 'string' && withPs(fresh, oldPs) === old.payload;
  if (CHECK && !keep) fail(`qr ${shape.name}: the shipping window now mints a different payload`);
  return { name: shape.name, payload: keep ? old.payload : fresh };
});

// ---------------------------------------------------------------------------
// /pair's three answers, as the shipping handler writes them
// ---------------------------------------------------------------------------

/** The shipping handler's `/pair` answer for one presentation, with `present` given. */
const pairAnswerOf = async (present, presentation) => {
  const handle = createPocketHandler({
    shuttingDown: () => false,
    pairingWindowOpen: () => true,
    present,
    verify: () => ({ ok: false, reason: 'unpaired' }),
    stillPaired: () => false,
    answer: async () => null
  });
  const answer = await handle({ route: 'pair', presentation }, { stopping: () => false });
  if (answer.status !== 200 || typeof answer.body !== 'string') fail(`/pair answered ${String(answer.status)} to a presentation inside a window`);
  return answer.body;
};
const pairAnswers = await (async () => {
  // A live window: the phone's presentation through the SHIPPING present.
  const window = windowAt(PUBLIC_PORT);
  const offer = window.open();
  const body = JSON.parse(pairing.sealPresentationAsPhone(offer.payload, presentedAs, phoneSignPrivate).toString('utf8'));
  const pending = await pairAnswerOf((p) => window.present(p), body);
  // Another key's proof over the same seal: refused, whatever the seal holds.
  const stranger = privateOf('ed25519', seed('a stranger'));
  const forged = { ...body, ek: spkiOf(stranger), sig: b64u(signWith(null, Buffer.from(pairing.presentationProofText(pairing.pairingChallengeOf(Buffer.from(JSON.parse(offer.payload).ps, 'base64url')), body.iv, body.ct, body.tag), 'utf8'), stranger)) };
  const refused = await pairAnswerOf((p) => window.present(p), forged);
  window.cancel();
  // `allowed` is reached through `allow`, which records the person's agreement
  // on disk, so the vectors do not reach it through `present`: the handler is
  // handed the answer's own shape (`PocketPairAnswer`) with the certificate.
  const allowed = await pairAnswerOf(() => ({ state: 'allowed', cert: Buffer.from(client.certificateDer, 'base64').toString('base64url') }), body);
  // Phase 316.5 (research 136 §9): alerts are the push key holder's alone, so
  // a Mac that can send one says so on `pending`, and that word is the only
  // thing that makes the phone ask iOS. Handed the answer's own shape, as
  // `allowed` is: when to say it is the Mac's own rule, held by its own tests.
  const pendingSends = await pairAnswerOf(() => ({ state: 'pending', alerts: true }), body);
  if (pending !== '{"state":"pending"}') fail(`the shipping present answered the phone's presentation ${pending}`);
  if (refused !== '{"state":"refused"}') fail(`the shipping present answered a forged proof ${refused}`);
  if (pendingSends !== '{"state":"pending","alerts":true}') {
    fail(`the shipping handler answers a phone pairing with a Mac that can send ${pendingSends}; the phone asks iOS for alerts only on {"state":"pending","alerts":true} (research 136 §9), so this Mac's phone would never be asked`);
  }
  return { pending, refused, allowed, pendingSends };
})();

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
/** The machine the remote session runs on, for which Tortie holds no machine row in these facts. */
const UNKNOWN_MACHINE = 'm1';
const endOfferOfRow = (session) => {
  if (typeof pocketWrites.endOfferOf !== 'function') {
    fail(`the shipping src/main/sessions/pocket-writes.ts exports no endOfferOf${pocketWrites.loadError === undefined ? '' : ` (${pocketWrites.loadError})`}, so no row's End can be composed`);
    return { state: 'none' };
  }
  return pocketWrites.endOfferOf(session, { status: session.status }, (machineId) => machineId !== UNKNOWN_MACHINE);
};

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
  // PHASE 317: the shipping verdict over each row, its record (the manifest's
  // status, as written) and the one machine Tortie holds no row for here.
  endOffer: (session) => endOfferOfRow(session),
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
// PHASE 317: the offers the facts were chosen to produce, read back from the
// SHIPPING answers, so a vector set that drew no End is refused by name.
{
  const blockedAnswer = JSON.parse(answers.blocked?.json ?? '{}');
  const offerOf = (id) => [...(blockedAnswer.rows ?? []), ...(blockedAnswer.others ?? [])].find((r) => r.sessionId === id)?.end;
  const want = [
    [S.talk, { state: 'offered', batch: true }],
    [S.waiting, { state: 'offered', batch: true }],
    [S.quiet, { state: 'offered', batch: true }],
    [S.remote, { state: 'offered', batch: false }],
    [S.failed, { state: 'none' }]
  ];
  for (const [id, end] of want) {
    if (JSON.stringify(offerOf(id)) !== JSON.stringify(end)) fail(`the shipping /v1/blocked offers ${JSON.stringify(offerOf(id))} on ${id}, not ${JSON.stringify(end)}`);
  }
  const talkConfirm = JSON.parse(answers['session-talk']?.json ?? '{}').session?.endConfirm;
  if (talkConfirm?.title !== "End 'talk'?" || talkConfirm?.confirmLabel !== 'End session' || typeof talkConfirm?.body !== 'string' || talkConfirm.body === '') {
    fail(`the shipping /v1/session answers ${JSON.stringify(talkConfirm)} as the talk session's endConfirm, not the Mac's own confirmation`);
  }
}

// ---------------------------------------------------------------------------
// Phase 314's alerts, and the tap each one is (Phase 316.5)
// ---------------------------------------------------------------------------

const blockedNow = await routes.blocked();
const waitingRow = blockedNow?.rows?.[0];
const otherRow = blockedNow?.others?.[0];
if (waitingRow === undefined || otherRow === undefined) fail('alerts: the shipping /v1/blocked answer has no waiting row and other row to compose from');
const alertShapes = [
  { name: 'single', plan: () => composeAlert({ announce: [waitingRow], blockedCount: 1 }), session: waitingRow?.sessionId ?? null },
  { name: 'count', plan: () => composeAlert({ announce: [waitingRow, otherRow], blockedCount: 2 }), session: null },
  { name: 'badge', plan: () => composeBadge(0), session: null }
];
const alerts = alertShapes.map((shape) => {
  const plan = shape.plan();
  if (plan.kind !== shape.name) fail(`alerts ${shape.name}: the shipping composer made a ${plan.kind} alert`);
  const tortie = JSON.parse(plan.payload).tortie;
  if (shape.name === 'single' && (tortie?.v !== 1 || tortie?.session !== shape.session)) fail('alerts single: the payload does not name its row\'s session as tortie.session');
  if (shape.name !== 'single' && tortie?.session !== undefined) fail(`alerts ${shape.name}: the payload names a session`);
  return { name: shape.name, payload: plan.payload, tap: shape.session === null ? { kind: 'list' } : { kind: 'session', session: shape.session } };
});

// ---------------------------------------------------------------------------
// Written or compared
// ---------------------------------------------------------------------------

const vectors = {
  about:
    'Written by build/p316/vectors.mjs from the shipping TypeScript. Test keys from public seeds; they pair with nothing. The public name, the tailnet and the program path are made up.',
  keys,
  identity: identityVectors,
  requests,
  tampered,
  writeTampered,
  pins,
  client,
  seal,
  pushSeal,
  qr,
  pairAnswers,
  answers,
  alerts
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
  `${String(requests.length)} signed requests, 1 of them a write (and 1 tampered target, 1 tampered write body), ${String(pins.length)} pins, 1 client certificate, 3 seals (1 with an alert address), ` +
  `${String(qr.length)} QR payloads, ${String(Object.keys(pairAnswers).length)} /pair answers, ${String(Object.keys(answers).length)} answers, ${String(alerts.length)} alerts`;
if (CHECK) {
  process.stdout.write(`${TAG} PASS: ios/TortieTests/Fixtures/vectors.json is what the shipping TypeScript produces: ${counts}.\n`);
} else {
  writeFileSync(OUT, text, 'utf8');
  process.stdout.write(`${TAG} wrote ios/TortieTests/Fixtures/vectors.json: ${counts}.\n`);
}
