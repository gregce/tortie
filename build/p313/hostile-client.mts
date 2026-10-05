/**
 * The scripted hostile client (Phase 313; rebuilt for the door on the internet
 * by Phase 330, build/p330/SPEC.md §6.2) — and it runs in the ordinary battery.
 *
 * NO SWIFT, NO APPLE, NO PHONE, NO TAILSCALE. It is a node client that pairs
 * honestly with the SHIPPING door, reads what the door will answer, and then
 * attacks it every way §6.2 names. Every arm asserts a REFUSAL WITH ITS
 * REASON — the door process's own word from its counters, or the verifier's
 * word main refused with — and, where the refusal is before HTTP, that the
 * PARSER COUNTER DID NOT MOVE: a socket the HTTP parser was never handed is a
 * socket none of whose bytes it read.
 *
 * WHAT IT DRIVES. The door process's listener, IN THIS PROCESS
 * (`src/main/pocket/door/in-process.ts`), started through the shipping
 * `startPocketDoor` behind the shipping main-side handler, the shipping
 * pairing owner, the shipping verifier and the shipping route composer. The
 * client writes each PROXY v2 header ITSELF, honest or forged, with its own
 * encoder: a second spelling on the attacker's side is the point. It dials
 * `127.0.0.1` on the port the listener reported, with TLS 1.3, SNI set to the
 * public name, and, for a paired phone, the client certificate the shipping
 * Allow issued over a key this client made. The real Funnel stand-in carries
 * traffic in `probe:p330`, `probe:p313`, `probe:p314` and `probe:p316`, which
 * start processes; this check starts none.
 *
 * WHAT IT BINDS. One listener, the door's own `listen(0, '127.0.0.1')`. It
 * never touches a real interface, starts no Electron, no tmux, no ssh, no
 * agent and no Tailscale, reads nothing under the person's home, and writes
 * only under a `mkdtemp` removed in the `finally`: the door's throwaway
 * identity and the sealed confirm record the shipping Allow writes.
 *
 * THE ONE STAND-IN: ELECTRON. `PocketPairing.allow` records the agreement
 * under the OS keystore, and the keystore needs Electron. So before any
 * shipping module is imported, this file puts an `electron` in the module
 * cache whose `safeStorage` seals with a marker and whose `userData` is the
 * scratch directory. That seal protects nothing and is thrown away with the
 * directory; it is what lets the Allow, the certificate it issues and every
 * `allowed` answer be DRIVEN here rather than built by hand, which is what the
 * Phase 313 client had to do.
 *
 * THE ARMS THAT LEFT, and why, so a later round does not restore them. Arm 6
 * (a request from an address that is not the paired one) and arm 15 (the
 * self-origin refusal) read `isSelfOrigin` and a phone's address. Behind
 * Funnel every connection arrives from 127.0.0.1, so an address pins nothing
 * and a self-origin refusal would refuse every phone; both went with the
 * thing they read (build/p330/SPEC.md §6.2). Arm 6 became `C` (a paired phone's
 * signature over another phone's connection). The K1 arms went with his
 * tailnet key, which no code carries any more (`conformance:pocket` K2).
 *
 * PHASE 317 ADDED THE WRITES (build/p317/SPEC.md §6.1): the shipping write
 * path (`src/main/pocket/writes.ts`) behind the same handler, over a
 * RECORDING FAKE of the writes main is handed, so every write arm is asserted
 * on its reason or outcome AND on the count of acts. Three of them stop the
 * door while a write's answer is in composition and start it again (a new
 * process over the same key); the late-answer arm is why this client's door
 * answers within `HOSTILE_ANSWER_MS` rather than the production 15 s. The
 * read-removal arm (WE15) touches read paths alone, so it runs unchanged in a
 * parent clone.
 *
 * PHASE 318 ADDED THE REPLY'S TWO WRITES (build/p318/SPEC.md §6.2): `choose`
 * and `say`, through the same shipping write path, over the same recording
 * fake, whose `choose` and `say` record their inputs and ask the `still` the
 * write path handed them, as the reply's verbs do in their final check. The
 * RW arms assert each on its reason or outcome AND on the fake's count of
 * calls: an honest press and message, a replay, a re-signed write id, the same
 * id under another verb, an End and a message on one session, every malformed
 * body shape, a message over the say cap, a query, a wrong signature, another
 * phone's connection, a phone removed before and during the act, the door
 * stopping during a message, and main answering past the bound.
 *
 * PHASE 316.7 ADDED THE SESSIONS QUERY (build/p3167/SPEC.md §8.2): a signed
 * `GET /v1/sessions` whose five closed words are read by main alone, driven
 * here through the shipping composer with the honest arms beside the hostile
 * ones. Every word cased, doubled, empty or key-only, an unknown parameter, a
 * percent-encoded word (answered as that word) and non-word, a NUL, targets
 * of 10 KB and 2 KB, five malformed ids, a well-formed id naming nothing, the
 * route with a trailing slash, another route's signature, and a phone removed
 * between its verify and its answer. A refused query answers 404 with no
 * body, and the log holds the word `route` and no query value. The long
 * targets are refused under the word `malformed` AFTER Node's HTTP parser has
 * read them (§15 F13), so those arms assert main was never asked and never a
 * parser counter of zero. MEASURED: at 10 KB it is the parser's own 8 KB head
 * cap that refuses, which cuts the socket with no answer; at 2 KB it is the
 * door's 1,024-character target bound, which answers 404.
 *
 * It prints one line, `P313_HOSTILE:{...}`, which the runner beside it reads.
 */

import {
  X509Certificate,
  createCipheriv,
  createHash,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  sign as signWith,
  type KeyObject
} from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { connect as netConnect, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connect as tlsConnect, type TLSSocket } from 'node:tls';

import type { DoorListenerHandle } from '../../src/main/pocket/door/listener.js';
import type {
  PocketChooseInput,
  PocketEndOutcome,
  PocketFacts,
  PocketReplyOutcome,
  PocketRoute,
  PocketSayInput,
  PocketWrites
} from '../../src/main/pocket/routes.js';
import type { PocketExecutionFields, PocketIdentity, PocketPhoneFields } from '../../src/main/pocket/pairing.js';
import type { StoredTurn } from '../../src/main/overview/store/index.js';
import type { Session, SessionStatus } from '../../src/shared/types.js';

// ---------------------------------------------------------------------------
// The scratch directory, and the one stand-in
// ---------------------------------------------------------------------------

const scratch = mkdtempSync(join(tmpdir(), 'p330-hostile-'));
const SEAL_MARKER = '--p330-hostile-seal--';
{
  const requireHere = createRequire(import.meta.url);
  const electronPath = requireHere.resolve('electron');
  requireHere.cache[electronPath] = {
    id: electronPath,
    filename: electronPath,
    loaded: true,
    exports: {
      app: { getPath: () => scratch, isReady: () => true, isPackaged: false },
      safeStorage: {
        isEncryptionAvailable: () => true,
        encryptString: (text: string) => Buffer.from(`${SEAL_MARKER}${text}`, 'utf8'),
        decryptString: (buf: Buffer) => {
          const text = buf.toString('utf8');
          if (!text.startsWith(SEAL_MARKER)) throw new Error('not this run’s seal');
          return text.slice(SEAL_MARKER.length);
        }
      }
    }
  } as unknown as NodeJS.Module;
}

const tlsModule = await import('../../src/main/pocket/tls.js');
const bind = await import('../../src/main/pocket/bind.js');
const { inProcessDoor } = await import('../../src/main/pocket/door/in-process.js');
const { createPocketHandler } = await import('../../src/main/pocket/server.js');
const { createPocketWriteHandler } = await import('../../src/main/pocket/writes.js');
const { POCKET_READ_BODY_CAP_BYTES } = await import('../../src/main/pocket/door/wire.js');
const { POCKET_PAIR_BODY_CAP_BYTES } = await import('../../src/main/pocket/door/limits.js');
const { POCKET_ROUTES, createPocketRoutes, readTurnRange } = await import('../../src/main/pocket/routes.js');
const { createPocketFacts, readPocketTurns } = await import('../../src/main/pocket/facts.js');
const pairingModule = await import('../../src/main/pocket/pairing.js');
const { POCKET_NO_REPLY, POCKET_OTHERS_MAX, POCKET_WRITE_SENTENCES } = await import('../../src/shared/ipc/pocket.js');
const { POCKET_WRITE_BODY_CAPS } = await import('../../src/main/pocket/door/limits.js');
const { OUTCOME_REMOTE } = await import('../../src/shared/overview-copy.js');
const { statusVisual } = await import('../../src/shared/status-words.js');

const {
  PocketPairing,
  PocketRequestVerifier,
  POCKET_CONFIRM_ACKNOWLEDGEMENT,
  POCKET_HEADERS,
  POCKET_PAIRING_WINDOW_MS,
  POCKET_REQUEST_ALGORITHM,
  canonicalRequestText,
  clientKeyPinOf,
  newIdentity,
  phoneIdOf,
  signAsPhone,
  spkiPinOf
} = pairingModule;

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

/**
 * EVERY LINE MAIN LOGS IN THIS PROCESS (Phase 316.7, §8.2). The shipping
 * logger writes to the console here, as it does in any process with no file
 * transport, so the console is wrapped once and every line is kept, still
 * passed on, for the arm that reads the log for the refusal's word and for a
 * query value that must never be in it.
 */
const logged: string[] = [];
for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
  const original = console[level].bind(console);
  console[level] = (...args: unknown[]): void => {
    logged.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    original(...args);
  };
}

// ---------------------------------------------------------------------------
// The phone, written from the outside
// ---------------------------------------------------------------------------

const NAME = 'mac.tail00000.ts.net';
const PUBLIC_PORT = 8443;
const HOST = `${NAME}:${String(PUBLIC_PORT)}`;

const b64u = (buf: Buffer): string => buf.toString('base64url');

interface Phone {
  fields: PocketPhoneFields;
  signPrivate: KeyObject;
  binding: string;
  /** The P-256 private key its TLS handshakes complete with, PEM. */
  tlsKey: string;
  /** The certificate the Mac issued over it, PEM, once allowed. */
  tlsCert: string | null;
}

/**
 * A phone's key material, made here rather than taken from the door's own
 * helpers, so the two sides of every signature are two implementations.
 */
function makePhone(label: string, doorExchangePublic: string): Phone {
  const signing = generateKeyPairSync('ed25519');
  const exchange = generateKeyPairSync('x25519');
  const client = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const signingKey = b64u(signing.publicKey.export({ type: 'spki', format: 'der' }));
  const exchangeKey = b64u(exchange.publicKey.export({ type: 'spki', format: 'der' }));
  // THE BINDING, DERIVED FROM THE PHONE'S SIDE. The door derives it from its own
  // private key and this public one; this derives it from this private key and
  // the door's public one. Nothing but Diffie-Hellman makes them agree.
  const shared = diffieHellman({
    privateKey: exchange.privateKey,
    publicKey: createPublicKey({ key: Buffer.from(doorExchangePublic, 'base64url'), format: 'der', type: 'spki' })
  });
  const binding = Buffer.from(
    hkdfSync('sha256', shared, Buffer.from(`${doorExchangePublic}\n${exchangeKey}`, 'utf8'), 'tortie-pocket-bind-v1', 32)
  ).toString('hex');
  return {
    fields: {
      id: phoneIdOf(signingKey),
      label,
      signingKey,
      exchangeKey,
      clientKey: b64u(client.publicKey.export({ type: 'spki', format: 'der' })),
      pushToken: '',
      pushEnvironment: ''
    },
    signPrivate: signing.privateKey,
    binding,
    tlsKey: client.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    tlsCert: null
  };
}

/** The door's pin of a phone's client key, spelled here: sha256 of the SPKI DER. */
const pinHere = (clientKey: string): string =>
  createHash('sha256').update(Buffer.from(clientKey, 'base64url')).digest().toString('base64url');

/** A DER certificate as PEM, for node's TLS client. */
function pem(der: Buffer): string {
  return `-----BEGIN CERTIFICATE-----\n${der.toString('base64').replace(/.{1,64}/g, '$&\n')}-----END CERTIFICATE-----\n`;
}

/**
 * The canonical string, written out here rather than imported.
 *
 * The second implementation of the one thing both sides must agree on. Arm 16
 * holds it against the door's own, byte for byte.
 */
function canonicalHere(method: string, target: string, body: Buffer, timestamp: string, nonce: string, binding: string): string {
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

/**
 * A PROXY v2 TCP4 header, spelled by this client from the protocol's table and
 * never through `src/main/pocket/door/proxy-v2.ts`. The source is whatever the
 * attacker likes, which is exactly why the door treats it as a rate-limit key
 * and nothing else.
 */
function proxyHeader(source = '203.0.113.7'): Buffer {
  const header = Buffer.alloc(28);
  Buffer.from('0d0a0d0a000d0a515549540a', 'hex').copy(header, 0);
  header.writeUInt8(0x21, 12); // version 2, PROXY
  header.writeUInt8(0x11, 13); // TCP over IPv4
  header.writeUInt16BE(12, 14);
  source.split('.').forEach((octet, i) => header.writeUInt8(Number(octet), 16 + i));
  [127, 0, 0, 1].forEach((octet, i) => header.writeUInt8(octet, 20 + i));
  header.writeUInt16BE(40_000 + Math.floor(Math.random() * 20_000), 24);
  header.writeUInt16BE(PUBLIC_PORT, 26);
  return header;
}

// ---------------------------------------------------------------------------
// The wire
// ---------------------------------------------------------------------------

interface Answer {
  status: number;
  body: string;
  headers: Record<string, string>;
  /** True when the TLS handshake completed on the client's side. */
  handshake: boolean;
  error?: string;
}

let localPort = 0;
/**
 * The KEY this client pins: the QR's `fp`, set once the first window is open.
 * The door's certificate is self-signed and in no trust store, which is the
 * design, so the client turns the CA check off and PINS INSTEAD, the phone's
 * way: the 26-byte P-256 SubjectPublicKeyInfo header plus the leaf's 65-byte
 * point, sha256, base64url.
 */
let pinnedKey: string | null = null;
/** The leaf the last handshake presented, for arm F2's re-derivation. */
let lastLeaf: { raw?: Buffer; pubkey?: Buffer } | null = null;
const SPKI_P256_HEADER = Buffer.from('3059301306072a8648ce3d020106082a8648ce3d030107034200', 'hex');

function pinOfLeaf(peer: { pubkey?: Buffer } | null | undefined): string | null {
  const point = peer?.pubkey;
  if (point === undefined || !Buffer.isBuffer(point) || point.length !== 65) return null;
  return createHash('sha256').update(Buffer.concat([SPKI_P256_HEADER, point])).digest().toString('base64url');
}

/** Every socket this client opened, destroyed in the `finally` whatever happened. */
const openSockets = new Set<Socket | TLSSocket>();

interface Dial {
  /** The PROXY header to write first, or null for none. Default: an honest one. */
  proxy?: Buffer | null;
  /** The TLS identity to present, or null for none. */
  as?: Phone | null;
  servername?: string;
  host?: string;
  /** Pin check on the door's key. Default on. */
  pin?: boolean;
}

/**
 * One request over its own connection, the way Funnel's forwarder and a phone
 * send one together. IT NEVER REJECTS: a refusal that arrives as a dead socket
 * is itself a reading, and one arm that cannot reach the door must not end the
 * run.
 */
function ask(method: string, target: string, headers: Record<string, string>, body: Buffer | null, dial: Dial = {}): Promise<Answer> {
  return new Promise((resolve) => {
    let handshake = false;
    let settled = false;
    const chunks: Buffer[] = [];
    const raw = netConnect(localPort, '127.0.0.1');
    openSockets.add(raw);
    let tls: TLSSocket | null = null;
    const finish = (error?: string): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      raw.destroy();
      tls?.destroy();
      openSockets.delete(raw);
      if (tls !== null) openSockets.delete(tls);
      const text = Buffer.concat(chunks).toString('utf8');
      const end = text.indexOf('\r\n\r\n');
      if (end === -1) {
        resolve({ status: 0, body: '', headers: {}, handshake, ...(error !== undefined ? { error } : {}) });
        return;
      }
      const [statusLine, ...lines] = text.slice(0, end).split('\r\n');
      const parsed: Record<string, string> = {};
      for (const line of lines) {
        const at = line.indexOf(':');
        parsed[line.slice(0, at).trim().toLowerCase()] = line.slice(at + 1).trim();
      }
      resolve({ status: Number(/^HTTP\/1\.1 (\d{3})/.exec(statusLine ?? '')?.[1] ?? 0), body: text.slice(end + 4), headers: parsed, handshake });
    };
    const timer = setTimeout(() => finish('timeout'), 8_000);
    raw.on('error', (e: Error) => finish(e.message));
    raw.on('close', () => finish());
    raw.once('connect', () => {
      const header = dial.proxy === undefined ? proxyHeader() : dial.proxy;
      if (header !== null) raw.write(header);
      const who = dial.as ?? null;
      tls = tlsConnect({
        socket: raw,
        servername: dial.servername ?? NAME,
        minVersion: 'TLSv1.3',
        rejectUnauthorized: false,
        ...(who !== null && who.tlsCert !== null ? { key: who.tlsKey, cert: who.tlsCert } : {})
      });
      openSockets.add(tls);
      tls.on('error', (e: Error) => finish(e.message));
      tls.on('data', (d: Buffer) => chunks.push(d));
      tls.on('close', () => finish());
      tls.once('secureConnect', () => {
        handshake = true;
        const peer = (tls as unknown as { getPeerCertificate: () => { raw?: Buffer; pubkey?: Buffer } }).getPeerCertificate();
        lastLeaf = peer;
        // THE PIN, CHECKED BY HAND, on the secure socket before a byte of the
        // request is written.
        if (dial.pin !== false && (pinnedKey === null || pinOfLeaf(peer) !== pinnedKey)) {
          finish('the door presented a key that is not the pinned one');
          return;
        }
        const head = [
          `${method} ${target} HTTP/1.1`,
          `Host: ${dial.host ?? HOST}`,
          ...Object.entries(headers).map(([k, v]) => `${k}: ${v}`),
          ...(body !== null ? [`Content-Length: ${String(body.length)}`] : []),
          'Connection: close'
        ].join('\r\n');
        tls?.write(`${head}\r\n\r\n`);
        if (body !== null) tls?.write(body);
      });
    });
  });
}

/** What the door answered, as a word: `ok`, `refused-<status>`, or a dead socket. */
function verdict(answer: Answer): string {
  if (answer.status === 200) return 'ok';
  if (answer.status === 0) return 'nosocket';
  return `refused-${String(answer.status)}`;
}

/** One signed read, from a phone that signs honestly unless told otherwise. */
function signedAsk(
  phone: Phone,
  target: string,
  options: {
    signedTarget?: string;
    signedBody?: Buffer;
    body?: Buffer;
    timestamp?: string;
    nonce?: string;
    omit?: (keyof typeof POCKET_HEADERS)[];
    /** Present ANOTHER phone's client certificate on the connection. */
    over?: Phone;
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
  return ask('GET', target, headers, body.length > 0 ? body : null, { as: options.over ?? phone });
}

/**
 * Seal AND SIGN a presentation the way a phone does (build/p330/SPEC.md
 * §4.7.2), spelled here from the wire format and never through the door's own
 * helper: the inner JSON with its keys sorted, sealed under a key derived from
 * the QR's one-shot secret, and the outer body signed over the window's
 * challenge by the presented Ed25519 key.
 */
function sealed(
  phone: Phone,
  secret: Buffer,
  options: { push?: Record<string, unknown>; signer?: KeyObject; ek?: string; extra?: Record<string, unknown>; dropSig?: boolean } = {}
): Buffer {
  const inner: Record<string, unknown> = {
    ck: phone.fields.clientKey,
    ek: phone.fields.signingKey,
    label: phone.fields.label,
    xk: phone.fields.exchangeKey,
    ...(options.push ?? {})
  };
  const sortedInner = Object.fromEntries(Object.keys(inner).sort().map((k) => [k, inner[k]]));
  const key = Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), 'tortie-pocket-pair-v1', 32));
  const ivBytes = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, ivBytes);
  const ctBytes = Buffer.concat([cipher.update(Buffer.from(JSON.stringify(sortedInner), 'utf8')), cipher.final()]);
  const iv = b64u(ivBytes);
  const ct = b64u(ctBytes);
  const tag = b64u(cipher.getAuthTag());
  const challenge = b64u(Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), 'tortie-pocket-challenge-v1', 32)));
  const proof = `tortie-pocket-present-v1\n${challenge}\n${iv}\n${ct}\n${tag}`;
  const sig = b64u(signWith(null, Buffer.from(proof, 'utf8'), options.signer ?? phone.signPrivate));
  const outer: Record<string, unknown> = { ct, ek: options.ek ?? phone.fields.signingKey, iv, sig, tag, ...(options.extra ?? {}) };
  if (options.dropSig === true) delete outer['sig'];
  return Buffer.from(JSON.stringify(outer), 'utf8');
}

/** POST /pair, on a connection presenting `as` (or nothing). */
const presentAs = (body: Buffer, as: Phone | null = null, proxy?: Buffer): Promise<Answer> =>
  ask('POST', '/pair', { 'content-type': 'application/json' }, body, { as, ...(proxy !== undefined ? { proxy } : {}) });

const stateOf = (answer: Answer): string => {
  try {
    return (JSON.parse(answer.body || '{}') as { state?: string }).state ?? `none-${verdict(answer)}`;
  } catch {
    return `none-${verdict(answer)}`;
  }
};
const bodyOf = (answer: Answer): Record<string, unknown> => {
  try {
    return JSON.parse(answer.body || '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
};

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

/**
 * THE ANSWER BOUND, SHORTENED FOR THIS CLIENT ALONE (Phase 317). A write main
 * answers later than the bound is CUT, never answered 404, and the arm that
 * proves it waits the bound out; at the production 15 s it would be the slowest
 * thing in the battery. Every other arm answers in milliseconds. Production
 * passes no timings at all.
 */
const HOSTILE_ANSWER_MS = 3_000;
const doorSpawn = inProcessDoor({ timings: { answerMs: HOSTILE_ANSWER_MS } });
let doorStarted = false;

try {
  const doorIdentity: PocketIdentity = newIdentity().identity;
  let phones: PocketPhoneFields[] = [];
  /** Whether the composition says this Mac can send an alert (research 136, arms 17m to 17o). */
  let macSends = false;
  /** The pairing owner's clock, moved by the arms that need a window to expire. */
  let skew = 0;
  const clock = (): number => Date.now() + skew;
  let doorPin: string | null = null;
  let doorListening = true;
  const fields = (): PocketExecutionFields => ({
    funnelProgram: '/p330/hostile/the-program-resolveTailscale-answered',
    tailnet: 'hostile.example',
    publicName: NAME,
    publicPort: PUBLIC_PORT,
    bindAtLaunch: false,
    routes: POCKET_ROUTES.map((r) => r.id),
    phones,
    pushAlerts: false
  });
  /** The door process's pins, spelled HERE from each phone's client key. */
  const pinsOf = (list: readonly PocketPhoneFields[]) => list.map((p) => ({ phoneId: p.id, spkiSha256: pinHere(p.clientKey) }));
  const pairing = new PocketPairing({
    identity: () => doorIdentity,
    fieldsNow: fields,
    savePhones: (next) => {
      phones = [...next];
      bind.updatePocketDoor({ pins: pinsOf(phones) });
      return true;
    },
    publicKeyPin: () => (doorListening ? doorPin : null),
    // THE SHIPPING ISSUER, over the door's own key, as the host wires it.
    issueCertificate: (clientKey) => {
      const material = tlsModule.pocketTlsMaterial();
      return material === null ? null : tlsModule.issueClientCertificate(material.key, clientKey, clock()).toString('base64url');
    },
    now: clock
  });
  /** Tell the door process what main's window says, as the host does. */
  const windowSync = (): void => bind.updatePocketDoor({ windowOpen: pairing.windowOpen() });
  const verifier = new PocketRequestVerifier({ identity: () => doorIdentity, phones: () => phones });
  /** The last reason main's verifier refused with, which is the word main logs. */
  let lastVerify = 'none';

  // -------------------------------------------------------------------------
  // THE FACTS, written here; the ROUTES and the TURNS READER are shipping code.
  // -------------------------------------------------------------------------

  const T0 = Date.now() - 3_600_000;
  const aSession = (id: string, name: string, status: SessionStatus, extra: Partial<Session> = {}): Session =>
    ({ id, name, tmuxName: name, projectPath: '/p313/project', cwd: '/p313/project', agent: 'claude', status, createdAt: T0, ...extra }) as Session;
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
  const LONG_WORD = `p313${'w'.repeat(4_000 - 4)}`;
  const LONGER_WORD = `${LONG_WORD}x`;
  const TALK_TURNS: StoredTurn[] = [
    ...Array.from({ length: 10 }, (_, i) => aTurn('ses_talk', i, `ask ${String(i)}`, i === 6 ? null : `answer ${String(i)}`)),
    aTurn('ses_talk', 10, LONG_WORD, null, false),
    aTurn('ses_talk', 11, LONGER_WORD, 'the last answer')
  ];
  const turnsOf = new Map<string, StoredTurn[]>([['ses_talk', TALK_TURNS]]);
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
  const events: string[] = [];
  let removeDuringRefresh: string | null = null;
  let holdRefresh: Promise<void> | null = null;
  const pairedAsked: { id: string; answer: boolean }[] = [];
  /** Every request main's handler was handed, so an arm can say main was never asked (§8.2). */
  let mainRequests = 0;
  /** What the sessions composer answered last: null is a refusal, the answer otherwise. */
  let lastSessions: unknown = 'not-asked';
  /** A phone to take out of the store AFTER the sessions answer is composed and before it leaves. */
  let removeAfterSessions: string | null = null;
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

  // PHASE 317: THE ONE WRITE PATH, SHIPPING, over a RECORDING FAKE of the
  // writes main is handed. Every write arm is asserted on its reason or
  // outcome AND on this recorder's count, so an act the door let through is
  // counted even when its answer was refused.
  const acts: { sessionId: string; batch: boolean }[] = [];
  let holdAct: Promise<void> | null = null;
  let actsReached = 0;
  /**
   * PHASE 318. Every press and message the write path handed the fake, and
   * what the `still` it was handed answered when the fake asked it, AFTER any
   * hold: the reply's verbs ask it in their final check, after their reads.
   */
  const replies: { verb: 'choose' | 'say'; sessionId: string; input: PocketChooseInput | PocketSayInput; still: boolean }[] = [];
  const replyAnswer = async (
    verb: 'choose' | 'say',
    input: PocketChooseInput | PocketSayInput,
    still: () => boolean
  ): Promise<PocketReplyOutcome> => {
    actsReached += 1;
    if (holdAct !== null) await holdAct;
    const allowed = still();
    replies.push({ verb, sessionId: input.sessionId, input, still: allowed });
    return allowed ? { outcome: 'done' } : { outcome: 'refused', reason: 'stopped', sentence: POCKET_WRITE_SENTENCES.stopped };
  };
  const recordingWrites: PocketWrites = {
    end: async (input): Promise<PocketEndOutcome> => {
      acts.push(input);
      actsReached += 1;
      if (holdAct !== null) await holdAct;
      return { outcome: 'done' };
    },
    choose: (input, still) => replyAnswer('choose', input, still),
    say: (input, still) => replyAnswer('say', input, still)
  };
  const writeHandler = createPocketWriteHandler({
    shuttingDown: () => false,
    stillPaired: (id) => phones.some((p) => p.id === id),
    writes: recordingWrites
  });
  /**
   * Arms that need the door to BEGIN TO STOP while a write's answer is in
   * composition set this: the stop starts after the write path answered and
   * before `bind.ts` posts, and is not awaited here, because the stop joins
   * this very job (SPEC §5.3.4). Arms that need the phone REMOVED after the
   * signature and before the write path set the other.
   */
  let stopAfterWrite: Promise<unknown> | null | 'arm' = null;
  let removeBeforeWrite: string | null = null;

  // THE HOST'S OWN COMPOSITION (`ipc.ts`), spelled here because the host
  // needs a sealed store to be built; every owner it composes is shipping code.
  const handle = createPocketHandler({
    // THE QUIT FLAG ALONE, as the host hands it. A door that is stopping is
    // known only to the admission of its generation, which is what 14c proves.
    shuttingDown: () => false,
    pairingWindowOpen: () => pairing.windowOpen(),
    // RESEARCH 136 (Phase 316.5): the host adds `alerts: true` to a pending
    // answer when the Mac can send. Here the arm decides it, as the host's
    // `alertsCanSend()` would, and the answer goes out through the SHIPPING
    // `pairBody` behind the real door.
    present: (presentation) => {
      const answer = pairing.present(presentation);
      return answer.state === 'pending' && macSends ? { state: 'pending', alerts: true } : answer;
    },
    verify: (input) => {
      const v = verifier.verify(input);
      lastVerify = v.ok ? 'ok' : v.reason;
      return v.ok ? { ok: true, phoneId: v.phone.id } : { ok: false, reason: v.reason };
    },
    stillPaired: (id) => {
      const answer = phones.some((p) => p.id === id);
      pairedAsked.push({ id, answer });
      return answer;
    },
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
          return id === null ? null : await routes.turns(id, { limit: query.get('limit'), from: query.get('from'), to: query.get('to') });
        }
        case 'sessions': {
          // PHASE 316.7: the whole query goes to the shipping composer, as in
          // ipc.ts; an arm may take its phone out of the store after the answer
          // is composed, which is a Remove landing between verify and answer.
          lastSessions = routes.sessions(query);
          if (removeAfterSessions !== null) {
            const gone = removeAfterSessions;
            removeAfterSessions = null;
            phones = phones.filter((p) => p.id !== gone);
          }
          return lastSessions;
        }
        case 'pair':
          return null;
        case 'end':
        case 'choose':
        case 'say':
          return null;
      }
    },
    write: async (route, body, verifiedPhone, door) => {
      if (removeBeforeWrite !== null) {
        const gone = removeBeforeWrite;
        removeBeforeWrite = null;
        phones = phones.filter((p) => p.id !== gone);
      }
      const answer = await writeHandler(route, body, verifiedPhone, door);
      if (stopAfterWrite === 'arm') stopAfterWrite = bind.stopPocketDoor();
      return answer;
    }
  });

  const openSeal = {
    available: () => true,
    seal: (text: string) => text,
    open: (blob: unknown) => (typeof blob === 'string' ? blob : null)
  };
  const doorInput = {
    handle: ((request, door) => {
      mainRequests += 1;
      return handle(request, door);
    }) as typeof handle,
    publicHost: { name: NAME, port: PUBLIC_PORT },
    pins: [],
    windowOpen: false,
    identity: (options: Parameters<typeof tlsModule.ensureDoorIdentity>[0]) => tlsModule.ensureDoorIdentity({ ...options, seal: openSeal }),
    identityPath: join(scratch, 'identity.json'),
    spawn: doorSpawn
  };
  const started = await bind.startPocketDoor(doorInput);
  if (!started.ok) throw new Error(`the door refused to start: ${started.reason} — ${started.sentence}`);
  doorStarted = true;
  localPort = started.localPort;
  doorPin = spkiPinOf(started.publicKeyFingerprint);
  const certificateSha = started.certificateFingerprint.replace(/[^0-9a-f]/gi, '').toLowerCase();
  // THE CURRENT door process's listener: the write arms stop the door and
  // start it again (a new process, the same key), and read the new one.
  const listener = (): DoorListenerHandle => {
    const door = doorSpawn.doors[doorSpawn.doors.length - 1];
    if (door === undefined) throw new Error('the door process has no listener');
    return door;
  };
  /** Start the door again after an arm stopped it: the same key, a new process. */
  const restart = async (): Promise<void> => {
    const again = await bind.startPocketDoor({ ...doorInput, pins: pinsOf(phones) });
    if (!again.ok) throw new Error(`the door refused to start again: ${again.reason}`);
    doorStarted = true;
    localPort = again.localPort;
  };
  const stats = () => listener().stats();

  // -------------------------------------------------------------------------
  // 0. The honest phone: present, allowed, handed its certificate, reads.
  // -------------------------------------------------------------------------

  const offer = pairing.open();
  windowSync();
  const qr = JSON.parse(offer.payload) as Record<string, unknown>;
  const secret = Buffer.from(String(qr['ps']), 'base64url');
  const doorExchangePublic = String(qr['dx']);
  pinnedKey = typeof qr['fp'] === 'string' ? qr['fp'] : null;

  const good = makePhone('the honest phone', doorExchangePublic);
  const paired = await presentAs(sealed(good, secret));
  record('0a', 'an honest phone presents inside the window, with no certificate yet', 'pending', stateOf(paired), 'the pairing route must answer a phone that sealed and signed its presentation under the QR’s own secret.');
  record('0b', 'presenting ALLOWS nothing on its own', 'presented', pairing.view().state, 'the human confirms on the Mac, LAST.');

  // F2. The QR is v:3, exactly eight keys, and pins the door's public key.
  {
    const leaf = lastLeaf as { raw?: Buffer; pubkey?: Buffer } | null;
    const leafPin = pinOfLeaf(leaf);
    const x509Pin =
      leaf?.raw === undefined
        ? null
        : createHash('sha256').update(new X509Certificate(leaf.raw).publicKey.export({ type: 'spki', format: 'der' })).digest().toString('base64url');
    record('F2a', 'the QR is v:3 with exactly the eight keys, in order', 'v3:v,host,port,fp,dk,dx,ps,exp', `v${String(qr['v'])}:${Object.keys(qr).join(',')}`, 'no credential and no address: the code a screen shows carries nothing a thief can use after it shuts.');
    record('F2b', 'the QR names the public name and port a phone dials', `${NAME}:${String(PUBLIC_PORT)}`, `${String(qr['host'])}:${String(qr['port'])}`, 'the phone dials the name Funnel publishes and the port Funnel serves, never the local port.');
    record(
      'F2c',
      'the QR’s fp is the served leaf’s KEY, hashed the phone’s way and node’s way, and not the certificate’s hash',
      'the-key',
      leafPin !== null && leafPin === qr['fp'] && x509Pin === qr['fp'] && qr['fp'] !== Buffer.from(certificateSha, 'hex').toString('base64url') ? 'the-key' : 'differs',
      'the certificate is renewed every 397 days; a pin on it would un-pair every phone with nothing on either screen saying why.'
    );
    doorListening = false;
    let withoutPin = 'opened';
    try {
      pairing.open();
    } catch {
      withoutPin = 'refused';
    }
    doorListening = true;
    record('F2d', 'no window opens while the door has no key to pin', 'refused', withoutPin, 'a QR with fp: null pins nothing.');
  }

  // The person allows it: the SHIPPING Allow, which records the agreement and
  // issues the certificate over the key the phone presented.
  const card = pairing.view();
  const allowed = pairing.allow({ acknowledgement: POCKET_CONFIRM_ACKNOWLEDGEMENT, linesRead: card.lines, hashRead: card.hash ?? '' });
  record('0c', 'the person allows the phone on the card they read', 'allowed', allowed.allowed ? 'allowed' : `refused: ${String(allowed.refusal)}`, 'the Allow is the last step, and it is on the Mac.');
  const polled = await presentAs(sealed(good, secret));
  const certificate = String(bodyOf(polled)['cert'] ?? '');
  let certKey = 'none';
  try {
    certKey = b64u(new X509Certificate(Buffer.from(certificate, 'base64url')).publicKey.export({ type: 'spki', format: 'der' }));
  } catch {
    certKey = 'unparsed';
  }
  record(
    '0d',
    'the allowed phone, proving its key again, is handed a certificate over the key it presented',
    'allowed-its-key',
    `${stateOf(polled)}-${certKey === good.fields.clientKey ? 'its-key' : 'another-key'}`,
    'the certificate is what the phone presents at every handshake; one over another key would be a way in for that key.'
  );
  good.tlsCert = pem(Buffer.from(certificate, 'base64url'));
  record('0e', 'the door’s pin for the phone is the client key’s sha256, spelled twice', 'equal', pinHere(good.fields.clientKey) === clientKeyPinOf(good.fields.clientKey) ? 'equal' : 'differs', 'the pin the door checks and the pin the host hands it are one pin.');
  pairing.cancel();
  windowSync();

  for (const target of ['/v1/blocked', '/v1/session?id=ses_1', '/v1/turns?id=ses_1']) {
    record(`0f${target}`, `the allowed phone reads ${target} over mutual TLS`, 'ok', verdict(await signedAsk(good, target)), 'the three reads are what this door is for.');
  }
  {
    const answer = await signedAsk(good, '/v1/blocked');
    record('0g', 'every answer carries an explicit Content-Length and no transfer coding', 'length', answer.headers['content-length'] === String(Buffer.byteLength(answer.body)) && answer.headers['transfer-encoding'] === undefined ? 'length' : `length=${String(answer.headers['content-length'])} te=${String(answer.headers['transfer-encoding'])}`, 'the phone’s reader requires the length and refuses any transfer coding.');
  }

  // -------------------------------------------------------------------------
  // Before a byte reaches the HTTP parser: each on its word AND the counter
  // -------------------------------------------------------------------------

  /** Drive one connection and read the door's own counters around it. */
  const beforeParser = async (run: () => Promise<Answer>, word: keyof ReturnType<typeof stats>['refused']): Promise<string> => {
    const before = stats();
    const answer = await run();
    await until(() => stats().refused[word] > before.refused[word]);
    const after = stats();
    const parser = after.parserSockets === before.parserSockets && after.parserRequests === before.parserRequests;
    return `${verdict(answer)}-${word}-${parser ? 'parser-untouched' : 'PARSER-REACHED'}`;
  };
  const stranger = makePhone('a key nobody paired', doorExchangePublic);
  stranger.tlsCert = pem(tlsModule.issueClientCertificate(tlsModule.pocketTlsMaterial()?.key ?? '', stranger.fields.clientKey, Date.now()));

  record('N1', 'no certificate outside a window', 'nosocket-no-certificate-parser-untouched', await beforeParser(() => signedAsk(good, '/v1/blocked', { over: { ...good, tlsCert: null } }), 'no-certificate'), 'research 132 §9 condition 1: a stranger never reaches the HTTP parser.');
  record('N2', 'a certificate over a key that is not paired, even one the Mac itself signed', 'nosocket-unknown-key-parser-untouched', await beforeParser(() => signedAsk(stranger, '/v1/blocked'), 'unknown-key'), 'the pin is over the KEY; a certificate the door signed for somebody else is not a way in.');
  record('P1', 'no PROXY header at all', 'nosocket-proxy-parser-untouched', await beforeParser(() => ask('GET', '/v1/blocked', {}, null, { as: good, proxy: null }), 'proxy'), 'the limiter must always have a key, so a connection without the header is refused rather than counted under a default.');
  record('P2', 'a FORGED header naming a paired phone’s source, with no certificate', 'nosocket-no-certificate-parser-untouched', await beforeParser(() => ask('GET', '/v1/blocked', {}, null, { as: null, proxy: proxyHeader('203.0.113.7') }), 'no-certificate'), 'any process on this Mac can write the header naming any address; the source reaches no identity.');
  record('S1', 'the wrong server name', 'nosocket-server-name-parser-untouched', await beforeParser(() => ask('GET', '/v1/blocked', {}, null, { as: good, servername: 'other.tail00000.ts.net' }), 'server-name'), 'the door answers for its public name and nothing else.');
  {
    const held: Promise<Answer>[] = [];
    const holdOpen: TLSSocket[] = [];
    for (let i = 0; i < 4; i += 1) {
      await new Promise<void>((resolve) => {
        const raw = netConnect(localPort, '127.0.0.1');
        openSockets.add(raw);
        raw.on('error', () => undefined);
        raw.once('connect', () => {
          raw.write(proxyHeader('192.0.2.9'));
          const t = tlsConnect({ socket: raw, servername: NAME, minVersion: 'TLSv1.3', rejectUnauthorized: false, key: good.tlsKey, cert: good.tlsCert ?? '' });
          openSockets.add(t);
          t.on('error', () => undefined);
          t.once('secureConnect', () => resolve());
          holdOpen.push(t);
        });
      });
    }
    await until(() => stats().open >= 4);
    const fifth = await beforeParser(() => ask('GET', '/v1/blocked', {}, null, { as: good, proxy: proxyHeader('192.0.2.9') }), 'source-cap');
    record('P3', 'a fifth connection from one source while four are open', 'nosocket-source-cap-parser-untouched', fifth, 'one client holds at most four connections, so three idle sockets a second cannot keep the phone out.');
    record('P3b', 'and another source is not counted against it', 'ok', verdict(await signedAsk(good, '/v1/blocked')), 'the cap is per source; the phone, from its own source, still reads.');
    for (const t of holdOpen) t.destroy();
    void held;
  }

  // -------------------------------------------------------------------------
  // HTTP refusals, and the signature
  // -------------------------------------------------------------------------

  record('1', 'a request with no signature', 'refused-404', verdict(await ask('GET', '/v1/blocked', {}, null, { as: good })), 'there is no bearer and no cookie to fall back on, so an unsigned read is not a read.');
  record('4', 'a signature made over a different body', 'refused-404:signature', `${verdict(await signedAsk(good, '/v1/blocked', { body: Buffer.from('{"end":"ses_1"}', 'utf8'), signedBody: Buffer.alloc(0) }))}:${lastVerify}`, 'the body is in the signed bytes.');
  record('4b', 'a signature made over a different session id', 'refused-404:signature', `${verdict(await signedAsk(good, '/v1/session?id=ses_OTHER', { signedTarget: '/v1/session?id=ses_1' }))}:${lastVerify}`, 'the id rides in the query BECAUSE the table is exact, so the query is inside the signature.');
  for (const [n, target, why] of [
    ['5a', '/v1/sessionz', 'a path that is nearly a row is not a row (Phase 316.7 made /v1/sessions a row)'],
    ['5b', '/v1/blocked/', 'a trailing slash is a different string'],
    ['5c', '/V1/BLOCKED', 'case is not folded'],
    ['5d', '/h/0123456789abcdef0123456789abcdef', "the hook server's token-in-a-path shape"],
    ['5e', '/', 'the door serves no page at its root']
  ] as const) {
    record(n, `a route that is not in the table: ${target}`, 'refused-404', verdict(await signedAsk(good, target)), why);
  }
  record('9', 'a body over the cap', 'refused-404', verdict(await signedAsk(good, '/v1/blocked', { body: Buffer.alloc(POCKET_READ_BODY_CAP_BYTES * 16, 0x41) })), 'a body over the cap is dropped WHOLE.');
  for (const [n, at, why] of [
    ['10a', String(Date.now() - 10 * 60_000), 'a captured request replayed ten minutes later'],
    ['10b', String(Date.now() + 10 * 60_000), 'a request from a clock set forward']
  ] as const) {
    record(n, `a timestamp outside the window (${n === '10a' ? 'behind' : 'ahead'})`, 'refused-404:stale', `${verdict(await signedAsk(good, '/v1/blocked', { timestamp: at }))}:${lastVerify}`, why);
  }
  {
    const onceNonce = randomBytes(12).toString('hex');
    const onceAt = String(Date.now());
    record('11a', 'the first use of a nonce', 'ok', verdict(await signedAsk(good, '/v1/blocked', { nonce: onceNonce, timestamp: onceAt })), 'the honest request must work, or the replay proves nothing.');
    record('11b', 'the same request again, byte for byte: a replay', 'refused-404:replay', `${verdict(await signedAsk(good, '/v1/blocked', { nonce: onceNonce, timestamp: onceAt }))}:${lastVerify}`, 'a nonce is spent once.');
  }
  for (const name of ['phone', 'timestamp', 'nonce', 'signature'] as const) {
    const before = stats().refused.malformed;
    const answer = await signedAsk(good, '/v1/blocked', { omit: [name] });
    record(`12-${name}`, `the ${name} header missing`, 'refused-404-malformed', `${verdict(answer)}-${stats().refused.malformed > before ? 'malformed' : 'not-the-door'}`, 'every header is required, and the door process refuses a request without one before main is told.');
  }
  {
    const before = stats().refused.host;
    const answer = await ask('GET', '/v1/blocked', { [POCKET_HEADERS.phone]: good.fields.id }, null, { as: good, host: 'tortie.example.com' });
    record('13', 'a Host header that is not the door', 'refused-404-host', `${verdict(answer)}-${stats().refused.host > before ? 'host' : 'other'}`, 'a request addressed to somebody else is not this door’s.');
  }

  // C. A PAIRED PHONE'S VALID SIGNATURE OVER ANOTHER PHONE'S CONNECTION.
  const other = makePhone('a second allowed phone', doorExchangePublic);
  {
    const w = pairing.open();
    windowSync();
    const s = Buffer.from(String((JSON.parse(w.payload) as Record<string, unknown>)['ps']), 'base64url');
    await presentAs(sealed(other, s));
    const v = pairing.view();
    pairing.allow({ acknowledgement: POCKET_CONFIRM_ACKNOWLEDGEMENT, linesRead: v.lines, hashRead: v.hash ?? '' });
    other.tlsCert = pem(Buffer.from(String(bodyOf(await presentAs(sealed(other, s)))['cert'] ?? ''), 'base64url'));
    pairing.cancel();
    windowSync();
    record('C0', 'the second phone reads over its own connection', 'ok', verdict(await signedAsk(other, '/v1/blocked')), 'both phones are paired; the refusal below is about the connection, not the phone.');
    record('C', 'the first phone’s valid signature sent over the SECOND phone’s connection', 'refused-404:channel', `${verdict(await signedAsk(good, '/v1/blocked', { over: other }))}:${lastVerify}`, 'research 132 §9 condition 3: a thief needs the client key AND the signing key; a signature alone, over somebody else’s handshake, reads nothing.');
  }

  // /pair: the window, the outer JSON, the proof, the card, the deadline.
  {
    const w = pairing.open();
    windowSync();
    const s = Buffer.from(String((JSON.parse(w.payload) as Record<string, unknown>)['ps']), 'base64url');
    const first = makePhone('the phone that scanned first', doorExchangePublic);
    const second = makePhone('a phone with a photograph of the code', doorExchangePublic);
    {
      // A CONNECTION WITH NO CERTIFICATE REACHES POST /pair AND NOTHING ELSE:
      // a valid signature of the allowed phone, sent inside the window over a
      // connection that presented no certificate, is refused by the door
      // process before main is asked anything.
      const beforeRoute = stats().refused.route;
      lastVerify = 'not-asked';
      const answer = await signedAsk(good, '/v1/blocked', { over: { ...good, tlsCert: null } });
      record('W', 'inside a window, a certificate-less connection asks a signed route with a valid signature', 'refused-404-route-not-asked', `${verdict(answer)}-${stats().refused.route > beforeRoute ? 'route' : 'other'}-${lastVerify}`, 'the window opens POST /pair to whoever holds the code, and nothing else: a read needs the phone’s own key at the handshake.');
    }
    const beforeMalformed = stats().refused.malformed;
    record('J1', '/pair’s outer JSON with a sixth key', 'refused-404-malformed', `${verdict(await presentAs(sealed(first, s, { extra: { apt: 'x' } })))}-${stats().refused.malformed > beforeMalformed ? 'malformed' : 'not-the-door'}`, 'the door process parses the outer JSON strictly, so main never runs JSON.parse on a stranger’s bytes.');
    record('J2', 'a presentation whose proof is signed by another key than the one it names', 'refused', stateOf(await presentAs(sealed(first, s, { signer: second.signPrivate }))), 'the presentation proves the key it names, or it names nothing.');
    record('J3', 'the first phone presents', 'pending', stateOf(await presentAs(sealed(first, s))), 'an honest presentation inside the window.');
    const firstCard = pairing.view();
    // THE CARD FLIP: a leaked code presented from another source.
    record('J4', 'a second presenter with the code, from another source, replaces the first', 'pending', stateOf(await presentAs(sealed(second, s), null, proxyHeader('198.51.100.66'))), 'two phones are never both pending; the Mac’s card flips, and the six-group match is what refuses a card that did not change.');
    record('J5', 'and the card now shows the second phone', second.fields.label, pairing.view().label ?? 'none', 'the person confirms a key they can see.');
    let byHash = 'allowed';
    try {
      const result = pairing.allow({ acknowledgement: POCKET_CONFIRM_ACKNOWLEDGEMENT, linesRead: firstCard.lines, hashRead: firstCard.hash ?? '' });
      byHash = result.allowed ? 'allowed' : 'refused';
    } catch {
      byHash = 'refused-by-hash';
    }
    record('J6', 'an Allow pressed on the OLD card is refused by its hash', 'refused-by-hash', byHash, 'the Allow is bound to the hash of the card drawn, so a card that flipped under the press allows nothing.');
    // The person allows the card in front of them: the second phone.
    const now = pairing.view();
    pairing.allow({ acknowledgement: POCKET_CONFIRM_ACKNOWLEDGEMENT, linesRead: now.lines, hashRead: now.hash ?? '' });
    const beforeNoProof = stats().refused.malformed;
    record('J7', 'an allowed poll with NO proof', 'refused-404-malformed', `${verdict(await presentAs(sealed(second, s, { dropSig: true })))}-${stats().refused.malformed > beforeNoProof ? 'malformed' : 'not-the-door'}`, 'without the signature the outer JSON is not a presentation at all.');
    record('J8', 'an allowed poll with a WRONG key’s proof (the first phone asking to be the one allowed)', 'refused', stateOf(await presentAs(sealed(first, s))), 'the certificate goes to the phone that was allowed and to nothing else.');
    record('J9', 'the allowed phone’s own poll', 'allowed', stateOf(await presentAs(sealed(second, s))), 'the control: the refusals above are about the proof, not a window that stopped answering.');
    skew = POCKET_PAIRING_WINDOW_MS + 1_000;
    record('J10', 'the allowed phone’s poll AFTER the deadline, which main refuses though the door process has not been told', 'refused-404:window', `${verdict(await presentAs(sealed(second, s)))}:${pairing.windowOpen() ? 'open' : 'window'}`, 'main asks its own window again; the door process’s copy lags by a message.');
    skew = 0;
    pairing.cancel();
    windowSync();
    // Take the second allowed phone out again, as a Remove would.
    phones = phones.filter((p) => p.id !== second.fields.id);
    bind.updatePocketDoor({ pins: pinsOf(phones) });
  }

  // 2. A replayed pairing after the window shut.
  record('2', 'a replayed pairing after the window shut, on the allowed phone’s own connection', 'refused-404', verdict(await presentAs(sealed(good, secret), good)), '/pair is dead outside its window.');

  // 17. THE DEVICE TOKEN'S ONE DOOR IN (Phase 314), inside the sealed presentation.
  {
    const w = pairing.open();
    windowSync();
    const s = Buffer.from(String((JSON.parse(w.payload) as Record<string, unknown>)['ps']), 'base64url');
    const alerted = makePhone('a phone that asks for alerts', doorExchangePublic);
    record('17a', 'a presentation whose device token is not hex', 'refused', stateOf(await presentAs(sealed(alerted, s, { push: { apt: 'not-a-device-token-'.repeat(4), ape: 'development' } }))), 'a token that is not the shape is refused whole.');
    record('17b', 'a presentation that names an environment and no token', 'refused', stateOf(await presentAs(sealed(alerted, s, { push: { ape: 'production' } }))), 'the two travel together or not at all.');
    record('17c', 'and neither refusal put a phone in front of the person', 'waiting', pairing.view().state, 'a refused presentation leaves the sheet as it was.');
    // PHASE 316.5 (build/p3165/SPEC.md §6.1): the phone starts SENDING its
    // address, so the shapes it must never get past are driven through the
    // door process's own body cap as well as main's parser. The bound first:
    // 257 hex is one past it, and the whole presentation still fits the cap,
    // so the refusal is main's and never the cap's.
    const bounded = createHash('sha256').update('p3165-hostile-bounded').digest('hex');
    const long = sealed(alerted, s, { push: { apt: 'a'.repeat(257), ape: 'production' } });
    record('17g', 'a presentation whose device token is 257 hex, one past the bound, inside the body cap', 'refused-fits', `${stateOf(await presentAs(long))}-${long.length <= POCKET_PAIR_BODY_CAP_BYTES ? 'fits' : 'over-the-cap'}`, 'a device token is 32 to 256 hex, and one character past it refuses the whole presentation.');
    record('17h', 'a presentation that names the sandbox as its environment', 'refused', stateOf(await presentAs(sealed(alerted, s, { push: { apt: bounded, ape: 'sandbox' } }))), 'the environment is development or production, the two hosts Apple has, and nothing else.');
    record('17i', 'a presentation that names a token and no environment', 'refused', stateOf(await presentAs(sealed(alerted, s, { push: { apt: bounded } }))), 'a token with no environment cannot be addressed: the host is chosen from it.');
    {
      const huge = sealed(alerted, s, { push: { apt: 'ab'.repeat(5_120), ape: 'production' } });
      const before = stats().refused.oversized;
      const answer = await presentAs(huge);
      record('17j', 'a sealed presentation carrying a 10 KB token, dropped at the door’s body cap with nothing presented', 'refused-404-oversized-waiting', `${verdict(answer)}-${stats().refused.oversized > before ? 'oversized' : 'other'}-${pairing.view().state}`, 'the door process reads at most its cap of /pair and drops the rest whole, so a token that large never reaches main.');
    }
    const honestToken = createHash('sha256').update('p314-hostile-honest-token').digest('hex');
    record('17d', 'an honest token and environment, spelled in capitals', 'pending', stateOf(await presentAs(sealed(alerted, s, { push: { apt: honestToken.toUpperCase(), ape: 'development' } }))), 'a phone that asks for alerts is paired like any other.');
    const deviceLine = `Alerts for "${alerted.fields.label}" go through Apple (development), device ${createHash('sha256').update(honestToken, 'utf8').digest('hex').slice(0, 8)}`;
    record('17e', 'what the person is asked to allow names that device, by a digest computed here', 'named', pairing.view().lines.includes(deviceLine) ? 'named' : 'not-named', 'the token is hashed into what the person confirms.');
    record('17f', 'and the sheet never carries the token itself', 'absent', JSON.stringify(pairing.view()).toLowerCase().includes(honestToken) ? 'present' : 'absent', 'the token stays in main.');
    // THE HONEST ARM OF PHASE 316.5: the shape the phone sends, 64 hex in
    // capitals for production, is paired, and what is kept is folded to
    // lowercase, which is the one spelling the push and the hash read.
    const upper = createHash('sha256').update('p3165-hostile-honest-production').digest('hex').toUpperCase();
    record('17k', 'an honest production token of 64 hex in capitals', 'pending', stateOf(await presentAs(sealed(alerted, s, { push: { apt: upper, ape: 'production' } }))), 'a phone that allowed alerts pairs like any other.');
    {
      const card = pairing.view();
      const lower = upper.toLowerCase();
      const device = `Alerts for "${alerted.fields.label}" go through Apple (production), device ${createHash('sha256').update(lower, 'utf8').digest('hex').slice(0, 8)}`;
      let kept = 'not-allowed';
      try {
        const result = pairing.allow({ acknowledgement: POCKET_CONFIRM_ACKNOWLEDGEMENT, linesRead: card.lines, hashRead: card.hash ?? '' });
        const stored = phones.find((p) => p.id === alerted.fields.id);
        kept = !result.allowed || stored === undefined ? 'not-stored' : `${stored.pushToken === lower ? 'lowercased' : 'as-sent'}-${stored.pushEnvironment}`;
      } catch {
        kept = 'refused-by-hash';
      }
      record('17l', 'and the phone it pairs holds that token lowercased, for production, as its lines named it', 'lowercased-production-named', `${kept}-${card.lines.includes(device) ? 'named' : 'not-named'}`, 'one token has one spelling and one digest, and the person confirms the digest of the spelling that is kept.');
      phones = phones.filter((p) => p.id !== alerted.fields.id);
      bind.updatePocketDoor({ pins: pinsOf(phones) });
    }
    // RESEARCH 136 (Phase 316.5): whether this Mac can send an alert rides on
    // `pending` alone, as the literal true, and a Mac that cannot send answers
    // the bytes it answered before, so a phone of 1.0.0 (2) reads it as it did.
    pairing.cancel();
    windowSync();
    {
      // A window of their own: the one above allowed a phone, and an allowed
      // window answers every other phone refused.
      const own = pairing.open();
      windowSync();
      const s = Buffer.from(String((JSON.parse(own.payload) as Record<string, unknown>)['ps']), 'base64url');
      const asking = makePhone('a phone the Mac tells whether it can send', doorExchangePublic);
      macSends = false;
      record('17m', 'a Mac that cannot send answers pending with the bytes it answered before', '{"state":"pending"}', (await presentAs(sealed(asking, s))).body, 'alerts are the key holder’s alone; nothing is promised by a Mac that cannot send.');
      macSends = true;
      record('17n', 'a Mac that can send says so on pending, as the literal true and nothing else', '{"state":"pending","alerts":true}', (await presentAs(sealed(asking, s))).body, 'the phone asks iOS for alerts only when this word is there.');
      record('17o', 'and a refusal never carries it', '{"state":"refused"}', (await presentAs(sealed(asking, s, { push: { apt: 'a'.repeat(257), ape: 'production' } }))).body, 'a refused presentation is told nothing about alerts.');
      macSends = false;
    }
    pairing.cancel();
    windowSync();
  }

  // -------------------------------------------------------------------------
  // The routes, read by the allowed phone (Phase 316.1's arms, over mutual TLS)
  // -------------------------------------------------------------------------

  {
    const answer = await signedAsk(good, '/v1/blocked');
    const body = bodyOf(answer) as { rows?: { sessionId: string }[]; others?: { sessionId: string }[]; othersOmitted?: number };
    const rows = (body.rows ?? []).map((r) => r.sessionId);
    const others = (body.others ?? []).map((r) => r.sessionId).sort();
    const want = listed.map((s) => s.id).filter((id) => !rows.includes(id)).sort();
    record('O1a', 'others, over the wire, is exactly the listed sessions that are not blocked', 'exact', verdict(answer) === 'ok' && JSON.stringify(rows) === JSON.stringify(['ses_1']) && JSON.stringify(others) === JSON.stringify(want) && body.othersOmitted === 0 ? 'exact' : `rows ${String(rows.length)}, others ${String(others.length)} of ${String(want.length)}`, 'a session in both lists or in neither is a session drawn twice or lost.');
    const many: Session[] = Array.from({ length: POCKET_OTHERS_MAX + 5 }, (_, i) => aSession(`ses_m${String(i).padStart(3, '0')}`, `m${String(i)}`, i < 3 ? 'needs_input' : 'idle', { createdAt: T0 + i }));
    const big = createPocketRoutes({ ...facts, sessions: () => many, blockedSince: () => new Map() }).blocked();
    const bigRows = new Set(big.rows.map((r) => r.sessionId));
    const bigOthers = big.others.map((r) => r.sessionId);
    const disjoint = bigOthers.every((id) => !bigRows.has(id)) && new Set(bigOthers).size === bigOthers.length;
    record('O1b', `${String(many.length)} sessions, 3 waiting: every waiting row, ${String(POCKET_OTHERS_MAX)} others, the rest counted, none twice`, `3-${String(POCKET_OTHERS_MAX)}-2-disjoint`, `${String(big.rows.length)}-${String(big.others.length)}-${String(big.othersOmitted)}-${disjoint ? 'disjoint' : 'overlapping'}`, 'the cap is the contract’s, and the count of what it left out is said.');
  }

  // -------------------------------------------------------------------------
  // THE SESSIONS QUERY (Phase 316.7, build/p3167/SPEC.md §8.2), read by the
  // allowed phone over mutual TLS through the shipping composer. The honest
  // arms first, so a door that refuses everything fails here too.
  // -------------------------------------------------------------------------
  {
    interface SessionsBody {
      asked?: { show?: string; group?: string; sort?: string; agent?: string | null; machine?: string | null };
      rows?: { sessionId: string; group: number }[];
      groups?: { id: string; count: number; omitted: number }[];
      total?: number;
      omitted?: number;
    }
    const sessionsOf = (answer: Answer): SessionsBody => bodyOf(answer) as SessionsBody;
    const askedOf = (b: SessionsBody): string =>
      b.asked === undefined ? 'none' : `${String(b.asked.show)}/${String(b.asked.group)}/${String(b.asked.sort)}/${String(b.asked.agent)}/${String(b.asked.machine)}`;

    // SQ0. The defaults: no query reads Active, Project, Recent, no filter.
    const plain = await signedAsk(good, '/v1/sessions');
    const plainBody = sessionsOf(plain);
    record('SQ0', 'GET /v1/sessions with no query answers the defaults', 'ok-active/project/recent/null/null', `${verdict(plain)}-${askedOf(plainBody)}`, 'an absent word is its default (D3), and the honest read is what makes every refusal below mean something.');

    // SQ1. All · None · Recent is today's list in today's order, id for id.
    const whole = sessionsOf(await signedAsk(good, '/v1/sessions?show=all&group=none&sort=recent'));
    const today = bodyOf(await signedAsk(good, '/v1/blocked')) as { rows?: { sessionId: string }[]; others?: { sessionId: string }[] };
    const todayIds = [...(today.rows ?? []), ...(today.others ?? [])].map((r) => r.sessionId);
    const wholeIds = (whole.rows ?? []).map((r) => r.sessionId);
    record('SQ1', 'show=all&group=none&sort=recent is /v1/blocked’s rows then others, id for id', 'same', JSON.stringify(wholeIds) === JSON.stringify(todayIds) && wholeIds.length === listed.length && whole.total === listed.length && whole.omitted === 0 ? 'same' : `sessions ${JSON.stringify(wholeIds)} blocked ${JSON.stringify(todayIds)}`, 'D10: Recent activity IS today’s order, so the list he has today is one tap away.');

    // SQ2. A percent-encoded closed word decodes to that word and IS that word.
    const encoded = await signedAsk(good, '/v1/sessions?show=%61ctive');
    record('SQ2', 'show=%61ctive is answered as show=active', 'ok-active', `${verdict(encoded)}-${String(sessionsOf(encoded).asked?.show)}`, 'URLSearchParams decodes before the reader compares (D3); an escape is a spelling, not a second word.');

    // SQ3. A well-formed id that names nothing keeps no rows and leaves nothing out.
    const nobody = await signedAsk(good, '/v1/sessions?show=all&agent=nobody-here');
    const nb = sessionsOf(nobody);
    record('SQ3', 'agent=nobody-here: answered, no rows, nothing omitted', 'ok-0-0-0', `${verdict(nobody)}-${String((nb.rows ?? []).length)}-${String((nb.groups ?? []).length)}-${String(nb.omitted)}`, 'a filter that matches nothing is an empty answer, never a refusal and never a fallback.');

    // SQ4. Every refused query: 404, no body, the signature held, the composer
    // answered null, the phone still paired — which is the handler's `route`.
    const refusedQueries: [string, string, string][] = [
      ['SQ5a', 'show=Active', 'a word is compared for equality, so a cased word is no word'],
      ['SQ5b', 'group=Project', 'the same, for the group word'],
      ['SQ5c', 'sort=Recent', 'the same, for the sort word'],
      ['SQ6a', 'show=active&show=ended', 'a word asked twice is two questions, and the door answers one'],
      ['SQ6b', 'sort=name&sort=name', 'even the same word twice'],
      ['SQ7', 'show=', 'an empty value is not a word'],
      ['SQ8', 'show', 'a key with no value is not a word'],
      ['SQ9', 'limit=1', 'five parameters and no others'],
      ['SQ10', 'show=act%C4%B1ve', 'a percent-encoded spelling of something that is not a word (a dotless i)'],
      ['SQ11', 'show=active%00', 'a NUL after a word makes it another string'],
      ['SQ12a', 'agent=Claude', 'an id is lowercase'],
      ['SQ12b', 'agent=9x', 'an id begins with a letter'],
      ['SQ12c', `agent=${'a'.repeat(33)}`, 'an id is at most 32 characters'],
      ['SQ12d', 'agent=a%2Fb', 'an id holds letters, digits and hyphens only'],
      ['SQ12e', 'machine=..', 'and a machine id is an id or local, never a path step']
    ];
    for (const [n, q, why] of refusedQueries) {
      lastVerify = 'not-asked';
      lastSessions = 'not-asked';
      pairedAsked.length = 0;
      const answer = await signedAsk(good, `/v1/sessions?${q}`);
      const paired = pairedAsked.at(-1)?.answer;
      const word = lastVerify === 'ok' && lastSessions === null && paired === true ? 'route' : `verify:${lastVerify}-composed:${lastSessions === null ? 'null' : typeof lastSessions}-paired:${String(paired)}`;
      record(n, `/v1/sessions?${q.length > 40 ? `${q.slice(0, 40)}…` : q}`, 'refused-404-nobody-route', `${verdict(answer)}-${answer.body === '' ? 'nobody' : 'BODY'}-${word}`, `${why}; refused WHOLE by main's reader (D3), answered as an unknown id is, never with a list the phone did not ask for.`);
    }

    // SQ13. A target of 10 KB. MEASURED, not as the SPEC first said (§8.2
    // expected a 404 from the target bound): the door's HTTP parser caps a
    // request's head at DOOR_MAX_HEADER_BYTES (8 KB), so Node itself refuses
    // this one (`clientError`), the door cuts the socket under the word
    // `malformed`, and no byte of an answer is written. Either way main is
    // never handed it, which is the claim; the parser counter is not asserted,
    // because the parser is what refused (§15 F13).
    {
      const before = stats();
      const mainBefore = mainRequests;
      const answer = await signedAsk(good, `/v1/sessions?show=all&agent=${'a'.repeat(10_240)}`);
      const after = stats();
      record('SQ13', 'a 10 KB target on /v1/sessions: cut by the parser’s 8 KB head cap', 'nosocket-nobody-malformed-main-never-asked', `${verdict(answer)}-${answer.body === '' ? 'nobody' : 'BODY'}-${after.refused.malformed > before.refused.malformed ? 'malformed' : 'other'}-${mainRequests === mainBefore && after.forwarded === before.forwarded ? 'main-never-asked' : `MAIN ASKED ${String(mainRequests - mainBefore)}`}`, 'a head over the parser’s cap is cut whole before the door reads a route, and main is never told.');
    }
    // SQ13b. A target of 2 KB passes the parser and meets the door's own target
    // bound (DOOR_TARGET_MAX_CHARS, 1,024), which runs AFTER the parser: a 404
    // with the word `malformed`, and main is never asked.
    {
      const before = stats();
      const mainBefore = mainRequests;
      const answer = await signedAsk(good, `/v1/sessions?show=all&agent=${'a'.repeat(2_048)}`);
      const after = stats();
      record('SQ13b', 'a 2 KB target on /v1/sessions: refused at the door’s target bound', 'refused-404-nobody-malformed-main-never-asked', `${verdict(answer)}-${answer.body === '' ? 'nobody' : 'BODY'}-${after.refused.malformed > before.refused.malformed ? 'malformed' : 'other'}-${mainRequests === mainBefore && after.forwarded === before.forwarded ? 'main-never-asked' : `MAIN ASKED ${String(mainRequests - mainBefore)}`}`, 'the door bounds a target at 1,024 characters before main is told anything (wire.ts); the check runs after the HTTP parser, so its proof is that main was never handed the request.');
    }

    // SQ14. The route with a trailing slash is no route: refused at the door.
    {
      const before = stats();
      const mainBefore = mainRequests;
      const answer = await signedAsk(good, '/v1/sessions/');
      const after = stats();
      record('SQ14', '/v1/sessions/ is not a route', 'refused-404-route-main-never-asked', `${verdict(answer)}-${after.refused.route > before.refused.route ? 'route' : 'other'}-${mainRequests === mainBefore ? 'main-never-asked' : 'MAIN ASKED'}`, 'a trailing slash is a different string, and the table is exact strings.');
    }

    // SQ15. /v1/blocked's signature replayed on /v1/sessions.
    record('SQ15', 'a /v1/blocked signature sent with /v1/sessions', 'refused-404:signature', `${verdict(await signedAsk(good, '/v1/sessions', { signedTarget: '/v1/blocked' }))}:${lastVerify}`, 'the target is in the signed bytes, so one read’s signature is not another’s.');

    // SQ16. A phone removed between its verify and its answer: refusal 7.
    {
      const kept = phones;
      removeAfterSessions = good.fields.id;
      pairedAsked.length = 0;
      lastSessions = 'not-asked';
      const answer = await signedAsk(good, '/v1/sessions?show=all');
      const ask = pairedAsked.filter((a) => a.id === good.fields.id).at(-1);
      phones = kept;
      record('SQ16', 'a phone removed after the sessions answer was composed and before it left', 'refused-404-nobody-composed-unpaired', `${verdict(answer)}-${answer.body === '' ? 'nobody' : 'BODY'}-${lastSessions !== null && lastSessions !== 'not-asked' ? 'composed' : 'uncomposed'}-${ask === undefined ? 'never-asked' : ask.answer ? 'still-paired' : 'unpaired'}`, 'refusal 7 is asked of every read’s answer, this one too: the person’s Remove wins over an answer already composed.');
      record('SQ16b', 'and the phone reads its sessions again once the person has it back', 'ok', verdict(await signedAsk(good, '/v1/sessions')), 'the refusal is about membership at the moment of the answer.');
    }
  }
  {
    events.length = 0;
    const session = await signedAsk(good, '/v1/session?id=ses_talk');
    const seenSession = [...events];
    events.length = 0;
    const page = await signedAsk(good, '/v1/turns?id=ses_talk&limit=3');
    const seenTurns = [...events];
    record('T2a', '/v1/session asks the refresh BEFORE it reads the conversation', 'refresh-first', verdict(session) === 'ok' && seenSession[0] === 'refresh:ses_talk' && seenSession.includes('lastTurn:ses_talk') && seenSession.filter((e) => e.startsWith('refresh')).length === 1 ? 'refresh-first' : seenSession.join(',') || verdict(session), 'a read that comes first answers what the conversation WAS.');
    record('T2b', '/v1/turns asks the refresh BEFORE it reads the turns', 'refresh-first', verdict(page) === 'ok' && JSON.stringify(seenTurns) === JSON.stringify(['refresh:ses_talk', 'turns:ses_talk']) ? 'refresh-first' : seenTurns.join(',') || verdict(page), 'the order the probe’s append depends on.');
    const collected: { index: number; absence: unknown; answerText: unknown }[] = [];
    let to: number | null = null;
    let sane = true;
    for (let pages = 0; pages < 20; pages += 1) {
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
    record('T2c', 'paged back to the first turn: every turn once, in order, and each unanswered one says so', `${String(TALK_TURNS.length)}-said`, `${whole ? String(collected.length) : `broken(${indexes.join(',')})`}-${absences ? 'said' : 'unsaid'}`, 'the phone stitches pages together by index.');
  }
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
    record(n, `a page asked as ${query}`, `refused-404:${reason}`, `${verdict(wire)}:${decided.ok ? 'accepted' : decided.reason}`, 'a page that is not a page is refused rather than guessed at.');
  }
  {
    const a = bodyOf(await signedAsk(good, '/v1/turns?id=ses_talk&limit=3&to=4')) as { turns?: { index: number }[] };
    const b = bodyOf(await signedAsk(good, '/v1/turns?id=ses_talk&limit=3&to=5')) as { turns?: { index: number }[] };
    const shared = (a.turns ?? []).filter((t) => (b.turns ?? []).some((u) => u.index === t.index));
    const agree = shared.every((t) => JSON.stringify(t) === JSON.stringify((b.turns ?? []).find((u) => u.index === t.index)));
    record('Pg7', 'two overlapping pages agree byte for byte where they overlap', 'agree-2', `${agree ? 'agree' : 'disagree'}-${String(shared.length)}`, 'a turn read twice is the same turn twice.');
  }
  {
    const body = bodyOf(await signedAsk(good, '/v1/turns?id=ses_talk&from=10&to=11&limit=2')) as {
      turns?: { index: number; askText: string; askClipped: boolean; answerText: string | null; absence: string | null }[];
    };
    const t10 = body.turns?.find((t) => t.index === 10);
    const t11 = body.turns?.find((t) => t.index === 11);
    record('Lg1', 'a 4,000-character one-word ask comes back whole and unclipped', '4000-unclipped', `${String(t10?.askText.length ?? 0)}-${t10?.askClipped === false && t10?.askText === LONG_WORD ? 'unclipped' : 'clipped-or-changed'}`, 'the phone wraps it; the door does not cut it.');
    record('Lg2', 'one character more is clipped at the one clip, and says so', '4000-clipped', `${String(t11?.askText.length ?? 0)}-${t11?.askClipped === true ? 'clipped' : 'unclipped'}`, 'toTurnView holds the only clip.');
    record('Lg3', 'the unanswered long ask carries its absence sentence, the answered one none', 'said', t10?.answerText === null && typeof t10?.absence === 'string' && t10.absence.length > 0 && t11?.absence === null ? 'said' : 'unsaid', 'main chooses the sentence.');
  }
  {
    record('Rm1', 'the session of an id nobody lists', 'refused-404', verdict(await signedAsk(good, '/v1/session?id=ses_gone')), 'an id is not an admission.');
    record('Rm2', 'the turns of an id nobody lists', 'refused-404', verdict(await signedAsk(good, '/v1/turns?id=ses_gone')), 'the same, for its conversation.');
    events.length = 0;
    const remote = await signedAsk(good, '/v1/turns?id=ses_remote');
    const rb = bodyOf(remote) as { note?: unknown; turns?: unknown[]; more?: unknown };
    record('Rm3', 'a remote row’s turns: main’s own sentence, and nothing on this Mac read', 'note', verdict(remote) === 'ok' && rb.note === OUTCOME_REMOTE && Array.isArray(rb.turns) && rb.turns.length === 0 && rb.more === false && !events.some((e) => e.endsWith(':ses_remote')) ? 'note' : `${verdict(remote)} note=${JSON.stringify(rb.note)}`, 'the conversation of a session on another machine is on that machine.');
    removeDuringRefresh = 'ses_doomed';
    events.length = 0;
    const doomedSession = await signedAsk(good, '/v1/session?id=ses_doomed');
    record('Rm4', 'a session Removed while its /v1/session is in flight is answered as unknown', 'refused-404-unread', `${verdict(doomedSession)}-${events.some((e) => e === 'lastTurn:ses_doomed' || e === 'catchUp:ses_doomed') ? 'read' : 'unread'}`, 'the route looks the session up AGAIN after the refresh.');
    listed = [...listed, aSession('ses_doomed', 'doomed', 'idle')];
    events.length = 0;
    const doomedTurns = await signedAsk(good, '/v1/turns?id=ses_doomed');
    record('Rm5', 'the same Remove during /v1/turns', 'refused-404-unread', `${verdict(doomedTurns)}-${events.includes('turns:ses_doomed') ? 'read' : 'unread'}`, 'and for its conversation.');
    removeDuringRefresh = null;
    // Rm6. A PHONE REMOVED while its request is inside the refresh.
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
    record('Rm6', 'a phone Removed while its request is inside the refresh: composed, then refused unpaired', 'refused-404-composed-unpaired', `${verdict(removedAnswer)}-${events.includes('turns:ses_talk') ? 'composed' : 'uncomposed'}-${lastAsk === undefined ? 'never-asked' : lastAsk.answer ? 'still-paired' : 'unpaired'}`, 'refusal 7: the handler asks whether the phone it verified is still paired, with nothing awaited before the answer leaves.');
    record('Rm6b', 'the phone reads again once the person has it back', 'ok', verdict(await signedAsk(good, '/v1/blocked')), 'the refusal is about membership at the moment of the answer.');
  }
  {
    const shipped = createPocketFacts({ core: () => null, overview: {} as never, wakes: () => [] });
    const onWire = (bodyOf(await signedAsk(good, '/v1/session?id=ses_1')) as { session?: { handoff?: unknown } }).session?.handoff;
    record('H2', 'the production hand-off answers null, and the session detail carries none', 'null-null', `${shipped.handoff(listed[0] as Session) === null ? 'null' : 'composed'}-${onWire === null ? 'null' : 'composed'}`, 'nothing hands off in this phase.');
  }

  // -------------------------------------------------------------------------
  // THE WRITES (Phase 317, build/p317/SPEC.md §6.1): each arm on its reason or
  // outcome, and on the recording fake's count of acts.
  // -------------------------------------------------------------------------
  {
    const phonesBefore = phones;
    /** Pair one more phone through a window of its own, the honest way. */
    const allowAnother = async (label: string): Promise<Phone> => {
      const w = pairing.open();
      windowSync();
      const s = Buffer.from(String((JSON.parse(w.payload) as Record<string, unknown>)['ps']), 'base64url');
      const phone = makePhone(label, doorExchangePublic);
      await presentAs(sealed(phone, s));
      const v = pairing.view();
      pairing.allow({ acknowledgement: POCKET_CONFIRM_ACKNOWLEDGEMENT, linesRead: v.lines, hashRead: v.hash ?? '' });
      phone.tlsCert = pem(Buffer.from(String(bodyOf(await presentAs(sealed(phone, s)))['cert'] ?? ''), 'base64url'));
      pairing.cancel();
      windowSync();
      return phone;
    };
    /** The four signature headers over a write: POST unless told otherwise, the body's own bytes. */
    const writeHeaders = (phone: Phone, target: string, body: Buffer, options: { signAs?: string; nonce?: string; timestamp?: string } = {}): Record<string, string> => {
      const timestamp = options.timestamp ?? String(Date.now());
      const nonce = options.nonce ?? randomBytes(12).toString('hex');
      return {
        'content-type': 'application/json',
        [POCKET_HEADERS.phone]: phone.fields.id,
        [POCKET_HEADERS.timestamp]: timestamp,
        [POCKET_HEADERS.nonce]: nonce,
        [POCKET_HEADERS.signature]: signAsPhone(phone.signPrivate, {
          method: options.signAs ?? 'POST',
          target,
          bodySha256: createHash('sha256').update(body).digest('hex'),
          timestamp,
          nonce,
          binding: phone.binding
        })
      };
    };
    const endBody = (session: string, write: string, batch = false): Buffer =>
      Buffer.from(JSON.stringify({ batch, session, write }), 'utf8');
    const writeId = (): string => randomBytes(16).toString('hex');
    /** One signed write over the phone's own connection (or `over` another's). */
    const writeAs = (phone: Phone, target: string, body: Buffer, options: { signAs?: string; nonce?: string; timestamp?: string; over?: Phone } = {}): Promise<Answer> =>
      ask('POST', target, writeHeaders(phone, target, body, options), body, { as: options.over ?? phone });
    /** What a write answered: `200:<outcome>[:<reason>]`, or the word for a 404 or a cut. */
    const said = (answer: Answer): string => {
      if (answer.status !== 200) return verdict(answer);
      const b = bodyOf(answer);
      return `200:${String(b['outcome'])}${b['reason'] === null || b['reason'] === undefined ? '' : `:${String(b['reason'])}`}`;
    };
    const holding = (): (() => void) => {
      let release = (): void => undefined;
      holdAct = new Promise<void>((resolve) => {
        release = resolve;
      });
      return () => {
        holdAct = null;
        release();
      };
    };

    const wA = await allowAnother('a phone that ends');
    const wB = await allowAnother('a second phone that ends');

    // WE1. The honest End: done, and one act.
    const honestId = writeId();
    const honestBody = endBody('ses_w1', honestId);
    const honestHeaders = writeHeaders(wA, '/v1/end', honestBody);
    const honest = await ask('POST', '/v1/end', honestHeaders, honestBody, { as: wA });
    record('WE1', 'an honest End over the phone’s own connection', '200:done-1', `${said(honest)}-${String(acts.length)}`, 'the write the door now has: both gates in main, then the Mac’s own End, once.');
    const honestEcho = bodyOf(honest);
    record('WE1b', 'its answer is the five fields, echoing the write id', `end-${honestId}-5`, `${String(honestEcho['verb'])}-${String(honestEcho['write'])}-${String(Object.keys(honestEcho).length)}`, 'the phone accepts an answer only for the write it sent.');

    // WE2. The same bytes again: the nonce is spent.
    record('WE2', 'the same bytes again', 'refused-404:replay-1', `${verdict(await ask('POST', '/v1/end', honestHeaders, honestBody, { as: wA }))}:${lastVerify}-${String(acts.length)}`, 'a signed request is spent once, whatever it carries.');

    // WE3. The same write id under a fresh nonce: the ledger answers, nothing acts.
    {
      const again = await writeAs(wA, '/v1/end', honestBody);
      record('WE3', 'the same write id, signed afresh', 'recorded-1', `${again.body === honest.body ? 'recorded' : `other(${said(again)})`}-${String(acts.length)}`, 'research 135 §4.4: a nonce is not exactly once, so the write id is, for twice the clock.');
    }

    // WE4. Two phones on one session at once: the second is busy.
    {
      const release = holding();
      const reachedBefore = actsReached;
      const first = writeAs(wA, '/v1/end', endBody('ses_w4', writeId()));
      await until(() => actsReached > reachedBefore);
      const second = await writeAs(wB, '/v1/end', endBody('ses_w4', writeId()));
      release();
      const firstAnswer = await first;
      record('WE4', 'two phones end one session at once', '200:done/200:busy-1', `${said(firstAnswer)}/${said(second)}-${String(acts.filter((a) => a.sessionId === 'ses_w4').length)}`, 'one write in flight per session: the second is told so, and never acts.');
    }

    // WE5. A fourth key in the body.
    {
      const id = writeId();
      const answer = await writeAs(wA, '/v1/end', Buffer.from(JSON.stringify({ batch: false, session: 'ses_w5', write: id, also: 'ses_w6' }), 'utf8'));
      const echoed = bodyOf(answer)['write'];
      record('WE5', 'a body with a fourth key', `200:refused:malformed-echoed-0`, `${said(answer)}-${echoed === id ? 'echoed' : 'not-echoed'}-${String(acts.filter((a) => a.sessionId === 'ses_w5' || a.sessionId === 'ses_w6').length)}`, 'the body is parsed strictly in main: an unknown key refuses it whole, and its well-formed id is echoed.');
    }
    // WE18. Malformed but for a well-formed write id: that id echoed.
    {
      const id = writeId();
      const answer = await writeAs(wA, '/v1/end', Buffer.from(JSON.stringify({ batch: 'no', session: 'ses/w18', write: id }), 'utf8'));
      const b = bodyOf(answer);
      record('WE18', 'a body malformed but for a well-formed write id', `200:refused:malformed-${id}-unreadable`, `${said(answer)}-${String(b['write'])}-${b['sentence'] === 'Your Mac could not read that request. Nothing was done.' ? 'unreadable' : String(b['sentence'])}`, '§14 finding 14: the phone can tell the Mac’s “I could not read that” from an answer to another write.');
    }

    // WE6. A query on /v1/end: refused at the door, never forwarded.
    {
      const before = stats();
      const answer = await writeAs(wA, '/v1/end?session=ses_w1', endBody('ses_w1', writeId()));
      const after = stats();
      record('WE6', 'a query on /v1/end', 'refused-404-route-not-forwarded', `${verdict(answer)}-${after.refused.route > before.refused.route ? 'route' : 'other'}-${after.forwarded === before.forwarded ? 'not-forwarded' : 'FORWARDED'}`, 'a write takes no query: everything it says is in its signed body.');
    }
    // WE7. A GET signature on a POST.
    record('WE7', 'a GET signature on a POST', 'refused-404:signature-0', `${verdict(await writeAs(wA, '/v1/end', endBody('ses_w7', writeId()), { signAs: 'GET' }))}:${lastVerify}-${String(acts.filter((a) => a.sessionId === 'ses_w7').length)}`, 'the method is in the signed bytes, so a read’s signature is not a write’s.');
    // WE8. A body over the cap: dropped whole at the door.
    {
      const before = stats();
      const big = Buffer.from(JSON.stringify({ batch: false, session: 's'.repeat(600), write: writeId() }), 'utf8');
      const answer = await writeAs(wA, '/v1/end', big);
      const after = stats();
      record('WE8', 'a body over the end cap', 'refused-404-oversized-not-forwarded', `${verdict(answer)}-${after.refused.oversized > before.refused.oversized ? 'oversized' : 'other'}-${after.forwarded === before.forwarded ? 'not-forwarded' : 'FORWARDED'}`, 'each write has its own cap, from its worst legal body.');
    }
    // WE9. A valid signature over another phone's connection.
    record('WE9', 'a write signed by one phone, sent over the other’s connection', 'refused-404:channel-0', `${verdict(await writeAs(wA, '/v1/end', endBody('ses_w9', writeId()), { over: wB }))}:${lastVerify}-${String(acts.filter((a) => a.sessionId === 'ses_w9').length)}`, 'a write needs the phone’s own key at the handshake, like every read.');

    // WE10. A phone removed BEFORE the act: 404, nothing acts.
    {
      removeBeforeWrite = wB.fields.id;
      const answer = await writeAs(wB, '/v1/end', endBody('ses_w10', writeId()));
      record('WE10a', 'a phone removed after its signature held and before the act', 'refused-404-0', `${verdict(answer)}-${String(acts.filter((a) => a.sessionId === 'ses_w10').length)}`, 'the last check before the act asks again whether the phone is paired, with nothing between it and the act.');
      phones = [...phones, wB.fields];
    }
    // WE10b. Removed AFTER the act began: the answer leaves, the act counted once.
    {
      const release = holding();
      const reachedBefore = actsReached;
      const inFlight = writeAs(wB, '/v1/end', endBody('ses_w10b', writeId()));
      await until(() => actsReached > reachedBefore);
      phones = phones.filter((p) => p.id !== wB.fields.id);
      bind.updatePocketDoor({ pins: pinsOf(phones) });
      await new Promise((resolve) => setTimeout(resolve, 50));
      release();
      const answer = await inFlight;
      record('WE10b', 'a phone removed while its End is acting: the answer still leaves whole', '200:done-1', `${said(answer)}-${String(acts.filter((a) => a.sessionId === 'ses_w10b').length)}`, 'after the act nothing replaces the answer, and a revoked socket answering a write finishes it before it is cut.');
      phones = [...phones, wB.fields];
      bind.updatePocketDoor({ pins: pinsOf(phones) });
    }

    // WE12. Main later than the bound: the connection is CUT, never 404.
    {
      const release = holding();
      const before = stats();
      const reachedBefore = actsReached;
      const lateId = writeId();
      const lateBody = endBody('ses_w12', lateId);
      const answer = await writeAs(wA, '/v1/end', lateBody);
      const after = stats();
      release();
      await until(() => actsReached > reachedBefore);
      record('WE12', 'main answers a write later than the bound', 'nosocket-nobytes-cut-1', `${verdict(answer)}-${answer.body === '' && answer.status === 0 ? 'nobytes' : 'BYTES'}-${after.writesCut === before.writesCut + 1 ? 'cut' : `writesCut ${String(after.writesCut - before.writesCut)}`}-${String(acts.filter((a) => a.sessionId === 'ses_w12').length)}`, 'D4: a 404 would say nothing was done, and main may be acting on it; the phone reads “no answer” and re-reads.');
      await new Promise((resolve) => setTimeout(resolve, 20));
      const recorded = await writeAs(wA, '/v1/end', lateBody);
      record('WE12b', 'and the same write id afterwards reads what the act came to, acting nothing again', '200:done-1', `${said(recorded)}-${String(acts.filter((a) => a.sessionId === 'ses_w12').length)}`, 'the ledger recorded the late act.');
    }

    // WE14. A request pipelined on a revoked socket: never forwarded.
    {
      const wP = await allowAnother('a phone that pipelines');
      const release = holding();
      const reachedBefore = actsReached;
      const result = await new Promise<{ bytes: string; closed: boolean; forwardedDuring: number }>((resolve) => {
        const raw = netConnect(localPort, '127.0.0.1');
        openSockets.add(raw);
        raw.on('error', () => undefined);
        const chunks: Buffer[] = [];
        let forwardedDuring = -1;
        const timer = setTimeout(() => done(false), 6_000);
        const done = (closed: boolean): void => {
          clearTimeout(timer);
          raw.destroy();
          resolve({ bytes: Buffer.concat(chunks).toString('utf8'), closed, forwardedDuring });
        };
        raw.once('connect', () => {
          raw.write(proxyHeader('198.51.100.40'));
          const t = tlsConnect({ socket: raw, servername: NAME, minVersion: 'TLSv1.3', rejectUnauthorized: false, key: wP.tlsKey, cert: wP.tlsCert ?? '' });
          openSockets.add(t);
          t.on('error', () => undefined);
          t.on('data', (d: Buffer) => chunks.push(d));
          t.on('close', () => done(true));
          t.once('secureConnect', () => {
            const body = endBody('ses_w14', writeId());
            const head = Object.entries(writeHeaders(wP, '/v1/end', body)).map(([k, v]) => `${k}: ${v}`);
            t.write(`POST /v1/end HTTP/1.1\r\nHost: ${HOST}\r\n${head.join('\r\n')}\r\nContent-Length: ${String(body.length)}\r\nConnection: keep-alive\r\n\r\n`);
            t.write(body);
            void (async () => {
              await until(() => actsReached > reachedBefore);
              phones = phones.filter((p) => p.id !== wP.fields.id);
              bind.updatePocketDoor({ pins: pinsOf(phones) });
              await new Promise((r) => setTimeout(r, 50));
              const forwardedAt = stats().forwarded;
              const target = '/v1/blocked';
              const timestamp = String(Date.now());
              const nonce = randomBytes(12).toString('hex');
              const sig = signAsPhone(wP.signPrivate, { method: 'GET', target, bodySha256: createHash('sha256').update(Buffer.alloc(0)).digest('hex'), timestamp, nonce, binding: wP.binding });
              t.write(`GET ${target} HTTP/1.1\r\nHost: ${HOST}\r\n${POCKET_HEADERS.phone}: ${wP.fields.id}\r\n${POCKET_HEADERS.timestamp}: ${timestamp}\r\n${POCKET_HEADERS.nonce}: ${nonce}\r\n${POCKET_HEADERS.signature}: ${sig}\r\n\r\n`);
              await new Promise((r) => setTimeout(r, 100));
              forwardedDuring = stats().forwarded - forwardedAt;
              release();
            })();
          });
        });
      });
      const responses = result.bytes.split('HTTP/1.1 ').length - 1;
      record('WE14', 'a request pipelined on a revoked socket that is still answering a write', '1-response-200-not-forwarded-closed', `${String(responses)}-response-${result.bytes.startsWith('HTTP/1.1 200') ? '200' : 'other'}-${result.forwardedDuring === 0 ? 'not-forwarded' : `forwarded ${String(result.forwardedDuring)}`}-${result.closed ? 'closed' : 'open'}`, 'X10: a revoked socket finishes its write’s answer and takes no further request.');
    }

    // WE15. A READ in flight when its phone is removed: cut at once, no byte,
    // never 404, exactly as at the parent. Read paths only, so the same arm
    // runs unchanged in a parent clone (SPEC §7.7).
    {
      const wR = await allowAnother('a phone removed mid-read');
      let release = (): void => undefined;
      holdRefresh = new Promise<void>((resolve) => {
        release = resolve;
      });
      events.length = 0;
      const heldRead = signedAsk(wR, '/v1/turns?id=ses_talk&limit=2');
      await until(() => events.includes('refresh:ses_talk'));
      const removedAt = Date.now();
      phones = phones.filter((p) => p.id !== wR.fields.id);
      bind.updatePocketDoor({ pins: pinsOf(phones) });
      const answer = await heldRead;
      const tookMs = Date.now() - removedAt;
      release();
      holdRefresh = null;
      record('WE15', 'a read in flight when its phone is removed', 'nosocket-nobytes-at-once', `${verdict(answer)}-${answer.body === '' && answer.status === 0 ? 'nobytes' : 'BYTES'}-${tookMs < 1_000 ? 'at-once' : `after ${String(tookMs)} ms`}`, '§14 finding 22: only a socket answering a WRITE finishes first; a removed phone’s read is cut at once, as it always was, and never told 404.');
    }

    // WE13. The unpair the fix round took out is NO ROUTE: a paired phone's
    // signed POST to it is refused `route` at the door and never forwarded,
    // and the phone stays paired and reads (build/p317/SPEC.md "§Fix round").
    {
      const wU = await allowAnother('a phone that asks to unpair itself');
      const before = stats();
      const answer = await writeAs(wU, '/v1/unpair', Buffer.from(JSON.stringify({ write: writeId() }), 'utf8'));
      const after = stats();
      record('WE13', 'a signed POST to /v1/unpair, the write the fix round took out', 'refused-404-route-not-forwarded-paired', `${verdict(answer)}-${after.refused.route > before.refused.route ? 'route' : 'other'}-${after.forwarded === before.forwarded ? 'not-forwarded' : 'FORWARDED'}-${phones.some((p) => p.id === wU.fields.id) ? 'paired' : 'REMOVED'}`, 'the phone forgets itself alone, as before this phase; nothing on the door removes a phone but Remove on the Mac.');
      record('WE13b', 'and the same phone still reads', '200', String((await signedAsk(wU, '/v1/blocked')).status), 'nothing was dropped, so its key still completes a handshake and its signature still holds.');
    }

    // WE16. A duplicate of a write still in flight, answered while the door
    // begins to stop: its busy is marked and NOT replaced by 404.
    {
      const release = holding();
      const reachedBefore = actsReached;
      const dupId = writeId();
      const dupBody = endBody('ses_w16', dupId);
      const first = writeAs(wA, '/v1/end', dupBody);
      await until(() => actsReached > reachedBefore);
      stopAfterWrite = 'arm';
      const dup = await writeAs(wA, '/v1/end', dupBody);
      release();
      const firstAnswer = await first;
      const stopping = stopAfterWrite;
      stopAfterWrite = null;
      if (stopping !== null && stopping !== 'arm') await stopping;
      doorStarted = false;
      record('WE16', 'a duplicate of an in-flight write id while the door stops', '200:busy/200:done-1', `${said(dup)}/${said(firstAnswer)}-${String(acts.filter((a) => a.sessionId === 'ses_w16').length)}`, '§14 finding 9: the duplicate’s write may be acting, so a 404 would be false.');
      await restart();

      // WE17. A recorded hit for a write that acted, answered while the door stops.
      stopAfterWrite = 'arm';
      const hit = await writeAs(wA, '/v1/end', dupBody);
      const stopping2 = stopAfterWrite;
      stopAfterWrite = null;
      if (stopping2 !== null && stopping2 !== 'arm') await stopping2;
      doorStarted = false;
      record('WE17', 'a recorded hit for a write that acted, while the door stops', `recorded-1`, `${hit.status === 200 && hit.body === firstAnswer.body ? 'recorded' : said(hit)}-${String(acts.filter((a) => a.sessionId === 'ses_w16').length)}`, '§14 finding 9: the recorded answer speaks for an act that happened, and is never replaced.');
      await restart();
    }

    // WE11. The door begins to stop AFTER the act: the answer is 200, not 404.
    {
      const release = holding();
      const reachedBefore = actsReached;
      const inFlight = writeAs(wA, '/v1/end', endBody('ses_w11', writeId()));
      await until(() => actsReached > reachedBefore);
      const stopping = bind.stopPocketDoor();
      release();
      const answer = await inFlight;
      await stopping;
      doorStarted = false;
      record('WE11', 'the door switched off just after the act', '200:done-1', `${said(answer)}-${String(acts.filter((a) => a.sessionId === 'ses_w11').length)}`, 'D4: after the act nothing replaces the answer, whatever the door is doing.');
      await restart();
      record('WE11b', 'and the door that starts again reads, after three stops and three new processes', 'ok-4', `${verdict(await signedAsk(good, '/v1/blocked'))}-${String(doorSpawn.doors.length)}`, 'the arms above stopped the door three times; the control is that each stop happened and the door answers again.');
    }

    // -----------------------------------------------------------------------
    // PHASE 318 (build/p318/SPEC.md §6.2): the reply's two writes, on the same
    // door, through the same write path, ledger and claims, over the recording
    // fake whose `choose` and `say` ask the `still` they were handed.
    // -----------------------------------------------------------------------
    {
      const QID = '0123456789abcdef-12';
      const MARK = 'a1b2c3d4e5f6';
      const chooseBody = (session: string, write: string, over: Record<string, unknown> = {}): Buffer =>
        Buffer.from(JSON.stringify({ mark: MARK, marker: '1', question: QID, session, write, ...over }), 'utf8');
      const sayBody = (session: string, write: string, text: unknown = 'hello phone'): Buffer =>
        Buffer.from(JSON.stringify({ session, text, write }), 'utf8');
      /** The say body as Swift's `JSONEncoder` writes it: sorted keys, `/` as `\/`. */
      const swiftSayBody = (session: string, write: string, text: string): Buffer =>
        Buffer.from(JSON.stringify({ session, text, write }).split('/').join('\\/'), 'utf8');
      const callsOn = (sessionId: string): number => replies.filter((r) => r.sessionId === sessionId).length;
      const echoOf = (answer: Answer): string => String(bodyOf(answer)['write']);

      // RW1. An honest press: done, one call, exactly its four fields.
      const pressId = writeId();
      const pressBody = chooseBody('ses_r1', pressId, { marker: '2' });
      const pressHeaders = writeHeaders(wA, '/v1/choose', pressBody);
      const press = await ask('POST', '/v1/choose', pressHeaders, pressBody, { as: wA });
      const pressed = replies.find((r) => r.sessionId === 'ses_r1');
      record('RW1', 'an honest press over the phone’s own connection', '200:done-1-exact', `${said(press)}-${String(callsOn('ses_r1'))}-${pressed !== undefined && pressed.verb === 'choose' && JSON.stringify(pressed.input) === JSON.stringify({ sessionId: 'ses_r1', question: QID, mark: MARK, marker: '2' }) ? 'exact' : 'other'}`, 'a press reaches main’s one write path with the question id, the mark and the marker the phone was shown, and nothing else.');
      const pressEcho = bodyOf(press);
      record('RW1b', 'its answer names the verb choose and echoes the write id', `choose-${pressId}-5`, `${String(pressEcho['verb'])}-${String(pressEcho['write'])}-${String(Object.keys(pressEcho).length)}`, 'the phone accepts an answer only for the write and the verb it sent.');

      // RW2. An honest message, its words holding `/`, a quote, a line feed and
      // an emoji, written the Swift way: done, one call, the words exact.
      const words = `/review "this" please${String.fromCharCode(0x0a)}then !ls ${String.fromCodePoint(0x1f44d)}`;
      const sayId = writeId();
      const saidBody = swiftSayBody('ses_r2', sayId, words);
      const sayHeaders = writeHeaders(wA, '/v1/say', saidBody);
      const say = await ask('POST', '/v1/say', sayHeaders, saidBody, { as: wA });
      const sent = replies.find((r) => r.sessionId === 'ses_r2');
      record('RW2', 'an honest message, written the Swift way, over the phone’s own connection', '200:done-1-exact', `${said(say)}-${String(callsOn('ses_r2'))}-${sent !== undefined && sent.verb === 'say' && (sent.input as PocketSayInput).text === words ? 'exact' : 'other'}`, 'the words reach main byte for byte: `\\/` is the same `/`, and nothing is trimmed or normalized.');

      // RW3. The same bytes again: the nonce is spent.
      record('RW3', 'a press and a message, the same bytes again', 'refused-404:replay/refused-404:replay-1-1', `${verdict(await ask('POST', '/v1/choose', pressHeaders, pressBody, { as: wA }))}:${lastVerify}/${verdict(await ask('POST', '/v1/say', sayHeaders, saidBody, { as: wA }))}:${lastVerify}-${String(callsOn('ses_r1'))}-${String(callsOn('ses_r2'))}`, 'a signed request is spent once, whatever it carries.');

      // RW4. The same write id under a fresh nonce: the ledger answers, nothing is typed again.
      {
        const againPress = await writeAs(wA, '/v1/choose', pressBody);
        const againSay = await writeAs(wA, '/v1/say', saidBody);
        record('RW4', 'the same write id, signed afresh, for a press and for a message', 'recorded/recorded-1-1', `${againPress.body === press.body ? 'recorded' : `other(${said(againPress)})`}/${againSay.body === say.body ? 'recorded' : `other(${said(againSay)})`}-${String(callsOn('ses_r1'))}-${String(callsOn('ses_r2'))}`, 'research 135 §4.4 A8: the same paste sent twice was submitted twice, so the write id makes a message happen once.');
      }

      // RW5. The same write id under ANOTHER verb: its own write (D4).
      {
        const answer = await writeAs(wA, '/v1/choose', chooseBody('ses_r5', sayId));
        record('RW5', 'the say’s write id sent again as a press', `200:done-choose-${sayId}-1`, `${said(answer)}-${String(bodyOf(answer)['verb'])}-${echoOf(answer)}-${String(callsOn('ses_r5'))}`, 'the ledger keys on the verb, so one verb’s recorded answer never stands in for another verb’s write.');
      }

      // RW6. An End and a message on one session at once: the second is busy.
      {
        const release = holding();
        const reachedBefore = actsReached;
        const ending = writeAs(wA, '/v1/end', endBody('ses_r6', writeId()));
        await until(() => actsReached > reachedBefore);
        const message = await writeAs(wB, '/v1/say', sayBody('ses_r6', writeId()));
        release();
        const ended = await ending;
        record('RW6', 'an End and a message on one session at once', '200:done/200:busy-unmarked-0', `${said(ended)}/${said(message)}-${message.status === 200 && bodyOf(message)['outcome'] === 'busy' ? 'unmarked' : 'other'}-${String(callsOn('ses_r6'))}`, 'one write in flight per session ACROSS verbs: a message can never land while End is ending the same session.');
      }

      // RW7. Every malformed body: 200 refused malformed, the id echoed, no call.
      {
        const shapes: [string, string, '/v1/choose' | '/v1/say', (id: string) => Buffer][] = [
          ['RW7a', 'a press with a sixth key', '/v1/choose', (id) => chooseBody('ses_r7', id, { session2: 'ses_r7b' })],
          ['RW7b', 'a press with no mark', '/v1/choose', (id) => Buffer.from(JSON.stringify({ marker: '1', question: QID, session: 'ses_r7', write: id }), 'utf8')],
          ['RW7c', 'a press whose question is 15 hex', '/v1/choose', (id) => chooseBody('ses_r7', id, { question: '0123456789abcde-12' })],
          ['RW7d', 'a press whose question count has a leading zero', '/v1/choose', (id) => chooseBody('ses_r7', id, { question: '0123456789abcdef-012' })],
          ['RW7e', 'a press whose mark is 11 hex', '/v1/choose', (id) => chooseBody('ses_r7', id, { mark: MARK.slice(1) })],
          ['RW7f', 'a press whose mark is 13 hex', '/v1/choose', (id) => chooseBody('ses_r7', id, { mark: `${MARK}0` })],
          ['RW7g', 'a press whose mark is upper case', '/v1/choose', (id) => chooseBody('ses_r7', id, { mark: MARK.toUpperCase() })],
          ['RW7h', 'a press whose marker is 0', '/v1/choose', (id) => chooseBody('ses_r7', id, { marker: '0' })],
          ['RW7i', 'a press whose marker is 10', '/v1/choose', (id) => chooseBody('ses_r7', id, { marker: '10' })],
          ['RW7j', 'a press whose marker is a', '/v1/choose', (id) => chooseBody('ses_r7', id, { marker: 'a' })],
          ['RW7k', 'a message with a fourth key', '/v1/say', (id) => Buffer.from(JSON.stringify({ session: 'ses_r7', text: 'hi', write: id, also: 'ses_r7b' }), 'utf8')],
          ['RW7l', 'a message with no text', '/v1/say', (id) => Buffer.from(JSON.stringify({ session: 'ses_r7', write: id }), 'utf8')],
          ['RW7m', 'a message whose text is a number', '/v1/say', (id) => sayBody('ses_r7', id, 7)],
          ['RW7n', 'a message whose text is an array', '/v1/say', (id) => sayBody('ses_r7', id, ['hi'])]
        ];
        for (const [n, name, target, bodyFor] of shapes) {
          const id = writeId();
          const answer = await writeAs(wA, target, bodyFor(id));
          const b = bodyOf(answer);
          record(n, name, `200:refused:malformed-${id}-unreadable-0`, `${said(answer)}-${echoOf(answer)}-${b['sentence'] === POCKET_WRITE_SENTENCES.unreadable ? 'unreadable' : String(b['sentence'])}-${String(callsOn('ses_r7') + callsOn('ses_r7b'))}`, 'each body is parsed strictly in main by its own verb: anything else refuses it whole, and its well-formed id is echoed.');
        }
      }

      // RW8. A message over the say cap: dropped whole at the door. And one of
      // 4,096 control characters, 24,771 bytes escaped, is NOT dropped: the Mac
      // must answer it in words (D3).
      {
        const before = stats();
        const big = sayBody('ses_r8', writeId(), 'x'.repeat(POCKET_WRITE_BODY_CAPS.say));
        const answer = await writeAs(wA, '/v1/say', big);
        const after = stats();
        record('RW8', `a message body over the say cap (${String(big.length)} bytes)`, 'refused-404-oversized-not-forwarded-0', `${verdict(answer)}-${after.refused.oversized > before.refused.oversized ? 'oversized' : 'other'}-${after.forwarded === before.forwarded ? 'not-forwarded' : 'FORWARDED'}-${String(callsOn('ses_r8'))}`, 'the say cap is 32,768 and a body over it never reaches main.');
        const controls = sayBody('ses_r8b', writeId(), String.fromCharCode(0x01).repeat(4_096));
        const reached = await writeAs(wA, '/v1/say', controls);
        const span = controls.length > POCKET_WRITE_BODY_CAPS.end * 16 && controls.length <= POCKET_WRITE_BODY_CAPS.say ? 'past-16k-under-say-cap' : `${String(controls.length)} bytes`;
        record('RW8b', `a message of 4,096 control characters (${String(controls.length)} bytes escaped)`, 'past-16k-under-say-cap-200:done-1', `${span}-${said(reached)}-${String(callsOn('ses_r8b'))}`, 'D3, §Revision R10: past the 16,384 an earlier draft named and under the say cap, so it reaches main, whose text rules answer it in words; the fake here answers done.');
      }

      // RW9. A query on /v1/say: refused at the door, never forwarded.
      {
        const before = stats();
        const answer = await writeAs(wA, '/v1/say?session=ses_r9', sayBody('ses_r9', writeId()));
        const after = stats();
        record('RW9', 'a query on /v1/say', 'refused-404-route-not-forwarded', `${verdict(answer)}-${after.refused.route > before.refused.route ? 'route' : 'other'}-${after.forwarded === before.forwarded ? 'not-forwarded' : 'FORWARDED'}`, 'a write takes no query: everything it says, the words included, is in its signed body.');
      }

      // RW10. A GET signature on a POST, and a press's signature on a message.
      record('RW10', 'a GET signature on POST /v1/choose', 'refused-404:signature-0', `${verdict(await writeAs(wA, '/v1/choose', chooseBody('ses_r10', writeId()), { signAs: 'GET' }))}:${lastVerify}-${String(callsOn('ses_r10'))}`, 'the method is in the signed bytes.');
      {
        const body = sayBody('ses_r10b', writeId());
        const answer = await ask('POST', '/v1/say', writeHeaders(wA, '/v1/choose', body), body, { as: wA });
        record('RW10b', 'a body signed for /v1/choose, sent to /v1/say', 'refused-404:signature-0', `${verdict(answer)}:${lastVerify}-${String(callsOn('ses_r10b'))}`, 'the path is in the signed bytes, so one write’s signature is never another’s.');
      }

      // RW11. A valid signature over another phone's connection.
      record('RW11', 'a message signed by one phone, sent over the other’s connection', 'refused-404:channel-0', `${verdict(await writeAs(wA, '/v1/say', sayBody('ses_r11', writeId()), { over: wB }))}:${lastVerify}-${String(callsOn('ses_r11'))}`, 'a write needs the phone’s own key at the handshake.');

      // RW12. A phone removed BEFORE the act: 404, the verb never asked.
      {
        removeBeforeWrite = wB.fields.id;
        const answer = await writeAs(wB, '/v1/choose', chooseBody('ses_r12', writeId()));
        record('RW12a', 'a phone removed after its signature held and before the press', 'refused-404-0', `${verdict(answer)}-${String(callsOn('ses_r12'))}`, 'the last check before the act asks again whether the phone is paired.');
        phones = [...phones, wB.fields];
      }
      // RW12b. Removed WHILE the verb reads: the verb's own final check sees it.
      {
        const release = holding();
        const reachedBefore = actsReached;
        const inFlight = writeAs(wB, '/v1/say', sayBody('ses_r12b', writeId()));
        await until(() => actsReached > reachedBefore);
        phones = phones.filter((p) => p.id !== wB.fields.id);
        bind.updatePocketDoor({ pins: pinsOf(phones) });
        await new Promise((resolve) => setTimeout(resolve, 50));
        release();
        const answer = await inFlight;
        const asked = replies.find((r) => r.sessionId === 'ses_r12b');
        record('RW12b', 'a phone removed while its message is being read: refused stopped, 200, never a 404', '200:refused:stopped-acted-still-false-1', `${said(answer)}-${answer.status === 200 ? 'acted' : 'not-acted'}-still-${String(asked?.still)}-${String(callsOn('ses_r12b'))}`, 'D5: the door’s last check is handed to the verb as `still`, and the verb asks it again before it types; a 404 would say nothing was asked when the write path had already started the verb.');
        phones = [...phones, wB.fields];
        bind.updatePocketDoor({ pins: pinsOf(phones) });
      }

      // RW13. Main later than the bound: the connection is CUT, never 404.
      {
        const release = holding();
        const before = stats();
        const lateBody = chooseBody('ses_r13', writeId());
        const answer = await writeAs(wA, '/v1/choose', lateBody);
        const after = stats();
        release();
        await until(() => replies.some((r) => r.sessionId === 'ses_r13'));
        record('RW13', 'main answers a press later than the bound', 'nosocket-nobytes-cut-1', `${verdict(answer)}-${answer.body === '' && answer.status === 0 ? 'nobytes' : 'BYTES'}-${after.writesCut === before.writesCut + 1 ? 'cut' : `writesCut ${String(after.writesCut - before.writesCut)}`}-${String(callsOn('ses_r13'))}`, 'D4: main may be pressing now, so the phone reads “no answer” and reads the session again.');
        await new Promise((resolve) => setTimeout(resolve, 20));
        const recorded = await writeAs(wA, '/v1/choose', lateBody);
        record('RW13b', 'and the same write id afterwards reads what the press came to, pressing nothing again', '200:done-1', `${said(recorded)}-${String(callsOn('ses_r13'))}`, 'the ledger recorded the late press.');
      }

      // RW14. The door begins to stop WHILE a message is read: the verb's own
      // check sees it, and the answer is 200 and never replaced.
      {
        const release = holding();
        const reachedBefore = actsReached;
        const inFlight = writeAs(wA, '/v1/say', sayBody('ses_r14', writeId()));
        await until(() => actsReached > reachedBefore);
        const stopping = bind.stopPocketDoor();
        release();
        const answer = await inFlight;
        await stopping;
        doorStarted = false;
        const asked = replies.find((r) => r.sessionId === 'ses_r14');
        record('RW14', 'the door switched off while a message is being read', '200:refused:stopped-still-false-1', `${said(answer)}-still-${String(asked?.still)}-${String(callsOn('ses_r14'))}`, 'D5 and D4: the stopping door is in `still`, so nothing is typed, and after the act nothing replaces the answer.');
        await restart();
        record('RW14b', 'and the door that starts again reads', 'ok-5', `${verdict(await signedAsk(good, '/v1/blocked'))}-${String(doorSpawn.doors.length)}`, 'the control: the stop happened and the door answers again.');
      }

      // RW15. A composer with no reply reader serves the empty offer, field by field.
      {
        const detail = (bodyOf(await signedAsk(good, '/v1/session?id=ses_1')) as { session?: { reply?: unknown } }).session;
        record('RW15', '/v1/session on a door with no reply reader', JSON.stringify(POCKET_NO_REPLY), JSON.stringify(detail?.reply), 'absent reads the empty offer: no button and no box, which is what this phase does on every agent it does not serve.');
        const list = bodyOf(await signedAsk(good, '/v1/blocked')) as { rows?: Record<string, unknown>[]; others?: Record<string, unknown>[] };
        const carrying = [...(list.rows ?? []), ...(list.others ?? [])].filter((row) => 'reply' in row).length;
        record('RW15b', 'and /v1/blocked’s rows carry no reply', '0', String(carrying), 'D18: the reply is on /v1/session alone; the list answers do not change.');
      }
    }

    phones = phonesBefore;
    bind.updatePocketDoor({ pins: pinsOf(phones) });
  }

  // 8. REMOVE: the removed phone's pin leaves the door, its next handshake is
  // refused before the parser, and the phone that stays still reads.
  {
    const kept = phones;
    phones = phones.filter((p) => p.id !== other.fields.id);
    bind.updatePocketDoor({ pins: pinsOf(phones) });
    await new Promise((resolve) => setImmediate(resolve));
    record('8', 'a request after the phone was removed', 'nosocket-unknown-key-parser-untouched', await beforeParser(() => signedAsk(other, '/v1/blocked'), 'unknown-key'), 'Remove takes the pin out of the door process, so the removed phone never reaches the parser again.');
    record('8b', 'and the phone that stays still reads', 'ok', verdict(await signedAsk(good, '/v1/blocked')), 'removing one phone is not closing the door on the other.');
    phones = kept.filter((p) => p.id !== other.fields.id);
  }

  // 16. RE-DERIVATION. The bytes a signature covers, built twice.
  {
    const body = Buffer.from('{"a":1}', 'utf8');
    const mine = canonicalHere('get', '/v1/session?id=ses_1', body, '1700000000000', 'abcdef0123456789', good.binding);
    const theirs = canonicalRequestText({ method: 'get', target: '/v1/session?id=ses_1', bodySha256: createHash('sha256').update(body).digest('hex'), timestamp: '1700000000000', nonce: 'abcdef0123456789', binding: good.binding });
    record('16', 'the signed bytes, built independently, are the door’s own bytes', createHash('sha256').update(theirs).digest('hex'), createHash('sha256').update(mine).digest('hex'), 'compared by sha256 so no signing input is printed.');
  }

  // 14. THE STOP, with a request INSIDE ITS COMPOSITION: refusal 7 by generation.
  {
    let release = (): void => undefined;
    holdRefresh = new Promise<void>((resolve) => {
      release = resolve;
    });
    events.length = 0;
    const heldAsk = signedAsk(good, '/v1/turns?id=ses_talk&limit=2');
    await until(() => events.includes('refresh:ses_talk'));
    const stopping = bind.stopPocketDoor();
    release();
    const report = await stopping;
    const heldAnswer = await heldAsk;
    holdRefresh = null;
    doorStarted = false;
    record('14', 'the stop joins what it accepted', 'true-1', `${String(report.joined)}-${String(report.accepted)}`, 'a stop that returns must have no handler still running.');
    record('14c', 'a request inside its composition when its door began to stop: composed, then refused', 'refused-404-composed', `${verdict(heldAnswer)}-${events.includes('turns:ses_talk') ? 'composed' : 'uncomposed'}`, 'the admission of that request’s generation is asked again after the answer is composed, with nothing awaited before the post.');
  }
  record('14b', 'and nothing answers after it', 'nosocket', verdict(await ask('GET', '/v1/blocked', {}, null, { as: good })), 'a stopped door is not bound.');
} catch (err) {
  problems.push(`the client threw: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}`);
} finally {
  for (const socket of openSockets) socket.destroy();
  if (doorStarted) {
    try {
      await bind.joinPocketDoor();
    } catch {
      /* the run is over either way */
    }
  }
  for (const door of doorSpawn.doors) door.kill();
  rmSync(scratch, { recursive: true, force: true });
}

// THE LOG (Phase 316.7, §8.2): the refusals above are logged by their WORD,
// `route` among them, and never with a value any query carried.
{
  const QUERY_VALUES = ['show=', 'group=', 'sort=', 'agent=', 'machine=', 'limit=', 'nobody-here', 'Claude', 'a'.repeat(33), 'act\u0131ve', 'act%C4%B1ve', '%61ctive'];
  const routeLine = logged.some((l) => l.includes('refused a request at the door: route'));
  const leaked = logged.filter((l) => QUERY_VALUES.some((v) => l.includes(v)));
  record('SQ17', 'the log names the refusal’s word, route, and no query value', 'route-no-value', `${routeLine ? 'route' : 'NO-ROUTE-LINE'}-${leaked.length === 0 ? 'no-value' : `VALUE IN ${String(leaked.length)} LINE(S)`}`, 'a door that logs what it was asked writes the phone’s words into his log; a refusal is a word and never a value (server.ts).');
}

// If EVERY arm answered a refusal, the door has one check rather than many,
// and the honest arms prove the door was answering at all.
const refusedAll = arms.length > 0 && arms.every((a) => a.got.startsWith('refused') || a.got.startsWith('nosocket'));
if (refusedAll) {
  problems.push('every arm was refused, INCLUDING the honest ones: the door this client drove answers nothing, so no refusal above proves anything.');
}

process.stdout.write(`P313_HOSTILE:${JSON.stringify({ arms, problems })}\n`);
