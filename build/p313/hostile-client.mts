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
import type { PocketFacts, PocketRoute } from '../../src/main/pocket/routes.js';
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
const { POCKET_READ_BODY_CAP_BYTES } = await import('../../src/main/pocket/door/wire.js');
const { POCKET_ROUTES, createPocketRoutes, readTurnRange } = await import('../../src/main/pocket/routes.js');
const { createPocketFacts, readPocketTurns } = await import('../../src/main/pocket/facts.js');
const pairingModule = await import('../../src/main/pocket/pairing.js');
const { POCKET_OTHERS_MAX } = await import('../../src/shared/ipc/pocket.js');
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

const doorSpawn = inProcessDoor();
let doorStarted = false;

try {
  const doorIdentity: PocketIdentity = newIdentity().identity;
  let phones: PocketPhoneFields[] = [];
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

  // THE HOST'S OWN COMPOSITION (`ipc.ts`), spelled here because the host
  // needs a sealed store to be built; every owner it composes is shipping code.
  const handle = createPocketHandler({
    // THE QUIT FLAG ALONE, as the host hands it. A door that is stopping is
    // known only to the admission of its generation, which is what 14c proves.
    shuttingDown: () => false,
    pairingWindowOpen: () => pairing.windowOpen(),
    present: (presentation) => pairing.present(presentation),
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
        case 'pair':
          return null;
      }
    }
  });

  const openSeal = {
    available: () => true,
    seal: (text: string) => text,
    open: (blob: unknown) => (typeof blob === 'string' ? blob : null)
  };
  const started = await bind.startPocketDoor({
    handle,
    publicHost: { name: NAME, port: PUBLIC_PORT },
    pins: [],
    windowOpen: false,
    identity: (options) => tlsModule.ensureDoorIdentity({ ...options, seal: openSeal }),
    identityPath: join(scratch, 'identity.json'),
    spawn: doorSpawn
  });
  if (!started.ok) throw new Error(`the door refused to start: ${started.reason} — ${started.sentence}`);
  doorStarted = true;
  localPort = started.localPort;
  doorPin = spkiPinOf(started.publicKeyFingerprint);
  const certificateSha = started.certificateFingerprint.replace(/[^0-9a-f]/gi, '').toLowerCase();
  const listener = (): DoorListenerHandle => {
    const door = doorSpawn.doors[0];
    if (door === undefined) throw new Error('the door process has no listener');
    return door;
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
    ['5a', '/v1/sessions', 'a path that is nearly a row is not a row'],
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
    const honestToken = createHash('sha256').update('p314-hostile-honest-token').digest('hex');
    record('17d', 'an honest token and environment, spelled in capitals', 'pending', stateOf(await presentAs(sealed(alerted, s, { push: { apt: honestToken.toUpperCase(), ape: 'development' } }))), 'a phone that asks for alerts is paired like any other.');
    const deviceLine = `Alerts for "${alerted.fields.label}" go through Apple (development), device ${createHash('sha256').update(honestToken, 'utf8').digest('hex').slice(0, 8)}`;
    record('17e', 'what the person is asked to allow names that device, by a digest computed here', 'named', pairing.view().lines.includes(deviceLine) ? 'named' : 'not-named', 'the token is hashed into what the person confirms.');
    record('17f', 'and the sheet never carries the token itself', 'absent', JSON.stringify(pairing.view()).toLowerCase().includes(honestToken) ? 'present' : 'absent', 'the token stays in main.');
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

// If EVERY arm answered a refusal, the door has one check rather than many,
// and the honest arms prove the door was answering at all.
const refusedAll = arms.length > 0 && arms.every((a) => a.got.startsWith('refused') || a.got.startsWith('nosocket'));
if (refusedAll) {
  problems.push('every arm was refused, INCLUDING the honest ones: the door this client drove answers nothing, so no refusal above proves anything.');
}

process.stdout.write(`P313_HOSTILE:${JSON.stringify({ arms, problems })}\n`);
