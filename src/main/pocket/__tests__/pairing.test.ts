/**
 * The pairing gate (Phase 313; the client key, the proof and QR v:3 in Phase
 * 330, build/p330/SPEC.md §4.4, §4.7, §4.8).
 *
 * These are written as the adversary rather than as the happy path, because
 * what this gate defends against is not a mistake. It is a process running as
 * the same user, with write access to the same home directory, that can write
 * `pocket.json` and can compute a sha256 as easily as Tortie can — and, since
 * Phase 330, anything on the internet that saw a pairing code in time.
 *
 * THE PHONE HALF IS WRITTEN OUT BY HAND, and that is the point. Nothing below
 * reuses a helper of the module under test to build a presentation, a proof, a
 * challenge, a fingerprint or a signature: the test composes each from the wire
 * format itself, exactly as a phone with no Swift would. A test that signed
 * with the module's own composer would prove the module agrees with itself and
 * nothing about what is on the wire. The ONE test that calls the module's own
 * `sealPresentationAsPhone` checks its output against this hand spelling.
 *
 * `safeStorage` is faked with a reversible transform standing in for the
 * keychain. It is not encryption and it is not meant to be. What it models is
 * the one property the gate depends on: Tortie can produce the value and the
 * file's author cannot.
 */

import {
  X509Certificate,
  createCipheriv,
  createDecipheriv,
  createHash,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  sign as signWith,
  verify as verifyWith,
  type KeyObject
} from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Type-only, so it is erased before anything loads and the mock below still
// wins for every value this file reaches for.
import type {
  PocketExecutionFields,
  PocketIdentity,
  PocketPhoneFields,
  PocketSealedPresentation
} from '../pairing';

let userData = '';
let ready = true;
let keystore = true;

const MARKER = '--tortie-pocket-test-key--';

vi.mock('electron', () => ({
  app: { getPath: () => userData, isReady: () => ready },
  safeStorage: {
    isEncryptionAvailable: () => keystore,
    encryptString: (text: string) => Buffer.from(`${MARKER}${text}`, 'utf8'),
    decryptString: (buf: Buffer) => {
      const text = buf.toString('utf8');
      if (!text.startsWith(MARKER)) throw new Error('not ours');
      return text.slice(MARKER.length);
    }
  }
}));

const {
  EMPTY_POCKET_FIELDS,
  POCKET_CLOCK_SKEW_MS,
  POCKET_CONFIRM_ACKNOWLEDGEMENT,
  POCKET_CONFIRM_RECORD_KEY,
  POCKET_EXECUTION_HASH_ALGORITHM,
  POCKET_HEADERS,
  POCKET_PAIRING_WINDOW_MS,
  POCKET_QR_VERSION,
  POCKET_REQUEST_ALGORITHM,
  PocketPairing,
  PocketRequestVerifier,
  assertPocketDoorMayBind,
  canonicalPocketText,
  canonicalRequestText,
  clientKeyPinOf,
  confirmPocketDoor,
  describePocketDoor,
  forgetPocketDoor,
  isClientKeySpki,
  newIdentity,
  openIdentity,
  pairFingerprint,
  pairingBinding,
  pairingChallengeOf,
  phoneIdOf,
  phoneView,
  pocketConfirmStatus,
  pocketExecutionHash,
  pocketStorePath,
  presentationProofText,
  pushTokenDigest,
  readPocketStore,
  sealPresentationAsPhone,
  spkiPinOf,
  writePocketStore
} = await import('../pairing');
const { POCKET_TLS_SEAL_PREFIX, ensureDoorIdentity, issueClientCertificate } = await import(
  '../tls'
);
const { confirmPath } = await import('../../config/confirm-record');
const { DOOR_PINS_MAX } = await import('../door/wire');
const { POCKET_CONFIRM_WARNING, POCKET_ROUTE_IDS } = await import('@shared/ipc/pocket');

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
  client: KeyObject;
  clientPublic: string;
}

function makePhone(label = 'A phone'): FakePhone {
  const ed = generateKeyPairSync('ed25519');
  const x = generateKeyPairSync('x25519');
  const ck = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return {
    label,
    sign: ed.privateKey,
    signPublic: b64u(ed.publicKey.export({ format: 'der', type: 'spki' })),
    exchange: x.privateKey,
    exchangePublic: b64u(x.publicKey.export({ format: 'der', type: 'spki' })),
    client: ck.privateKey,
    clientPublic: b64u(ck.publicKey.export({ format: 'der', type: 'spki' }))
  };
}

/** The window's challenge, spelled by the test (SPEC §4.7.2). */
function challengeOf(secretB64u: string): string {
  return b64u(
    Buffer.from(
      hkdfSync(
        'sha256',
        Buffer.from(secretB64u, 'base64url'),
        Buffer.alloc(0),
        'tortie-pocket-challenge-v1',
        32
      )
    )
  );
}

interface PresentOptions {
  /** Extra inner keys (push fields, or a lie). */
  extra?: Record<string, unknown>;
  /** The key the proof is signed with; defaults to the phone's own. */
  signer?: KeyObject;
  /** The `ek` the OUTER body names; defaults to the phone's own. */
  outerEk?: string;
  /** The challenge signed over; defaults to the window's. */
  challenge?: string;
  /** Drop the client key from the inner JSON. */
  noClientKey?: boolean;
}

/**
 * The wire format of `POST /pair`, v2, spelled by the test and never imported
 * from the module: the inner JSON with sorted keys, AES-256-GCM under
 * HKDF(ps, "tortie-pocket-pair-v1"), and an Ed25519 signature over
 * "tortie-pocket-present-v1\n<challenge>\n<iv>\n<ct>\n<tag>".
 */
function presentation(
  secretB64u: string,
  phone: FakePhone,
  options: PresentOptions = {}
): PocketSealedPresentation {
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
  const inner: Record<string, unknown> = {
    ek: phone.signPublic,
    label: phone.label,
    xk: phone.exchangePublic,
    ...(options.noClientKey === true ? {} : { ck: phone.clientPublic }),
    ...(options.extra ?? {})
  };
  const sorted = Object.fromEntries(Object.keys(inner).sort().map((k) => [k, inner[k]]));
  const ct = Buffer.concat([cipher.update(JSON.stringify(sorted), 'utf8'), cipher.final()]);
  const sealed = { iv: b64u(iv), ct: b64u(ct), tag: b64u(cipher.getAuthTag()) };
  const proof = [
    'tortie-pocket-present-v1',
    options.challenge ?? challengeOf(secretB64u),
    sealed.iv,
    sealed.ct,
    sealed.tag
  ].join('\n');
  const sig = b64u(signWith(null, Buffer.from(proof, 'utf8'), options.signer ?? phone.sign));
  return { ...sealed, ek: options.outerEk ?? phone.signPublic, sig };
}

/** The canonical signing string, spelled by the test. */
function phoneSignature(
  phone: FakePhone,
  door: PocketIdentity,
  parts: {
    method: string;
    target: string;
    body: Buffer;
    timestamp: string;
    nonce: string;
  }
): string {
  // The binding, derived on the PHONE's side: its private X25519 key and the
  // door's public one, never `pairingBinding`.
  const shared = diffieHellman({
    privateKey: phone.exchange,
    publicKey: createPublicKey({
      key: Buffer.from(door.exchangePublic, 'base64url'),
      format: 'der',
      type: 'spki'
    })
  });
  const binding = Buffer.from(
    hkdfSync(
      'sha256',
      shared,
      Buffer.from(`${door.exchangePublic}\n${phone.exchangePublic}`, 'utf8'),
      'tortie-pocket-bind-v1',
      32
    )
  ).toString('hex');
  const text = [
    'tortie-pocket-req-v1',
    parts.method.toUpperCase(),
    parts.target,
    createHash('sha256').update(parts.body).digest('hex'),
    parts.timestamp,
    parts.nonce,
    binding
  ].join('\n');
  return b64u(signWith(null, Buffer.from(text, 'utf8'), phone.sign));
}

function phoneFields(phone: FakePhone): PocketPhoneFields {
  return {
    id: phoneIdOf(phone.signPublic),
    label: phone.label,
    signingKey: phone.signPublic,
    exchangeKey: phone.exchangePublic,
    clientKey: phone.clientPublic,
    pushToken: '',
    pushEnvironment: ''
  };
}

/** The fingerprint, spelled by the test. */
function fingerprintOf(phone: FakePhone): string {
  const digest = createHash('sha256')
    .update(`tortie-pocket-fp-v2\n${phone.signPublic}\n${phone.exchangePublic}\n${phone.clientPublic}`)
    .digest('hex');
  return (digest.slice(0, 24).match(/.{4}/g) ?? []).join(' ');
}

/**
 * A pin in the QR's own shape, base64url of 32 bytes. What it is a hash OF is
 * proved in 'the QR pins the public key' below, against a real door identity.
 */
const PIN = b64u(createHash('sha256').update('p330-a-door-key').digest());

const BASE: PocketExecutionFields = {
  funnelProgram: '/Applications/Tailscale.app/Contents/MacOS/Tailscale',
  tailnet: 'example.github',
  publicName: 'mac.tail00000.ts.net',
  publicPort: 8443,
  bindAtLaunch: false,
  routes: POCKET_ROUTE_IDS,
  phones: [],
  pushAlerts: false
};

function consentFor(fields: PocketExecutionFields): {
  acknowledgement: typeof POCKET_CONFIRM_ACKNOWLEDGEMENT;
  linesRead: readonly string[];
  hashRead: string;
} {
  const summary = describePocketDoor(fields);
  return {
    acknowledgement: POCKET_CONFIRM_ACKNOWLEDGEMENT,
    linesRead: summary.lines,
    hashRead: summary.hash
  };
}

/** A seal that is readable and therefore not one; `./tls.test.ts`'s shape. */
function fakeTlsSeal(): Parameters<typeof ensureDoorIdentity>[0]['seal'] {
  return {
    available: () => true,
    seal: (text: string) => Buffer.from(`${POCKET_TLS_SEAL_PREFIX}${text}`).toString('base64'),
    open: (blob: unknown) => {
      if (typeof blob !== 'string' || blob.length === 0) return '';
      const text = Buffer.from(blob, 'base64').toString('utf8');
      return text.startsWith(POCKET_TLS_SEAL_PREFIX)
        ? text.slice(POCKET_TLS_SEAL_PREFIX.length)
        : '';
    }
  };
}

/** A real door identity from `./tls.ts`, written under this test's directory. */
function realDoor(now?: number): {
  keyPem: string;
  certPem: string;
  certificateFingerprint: string;
  publicKeyFingerprint: string;
  notAfter: number;
} {
  const made = ensureDoorIdentity({
    path: join(userData, 'p330-identity.json'),
    seal: fakeTlsSeal(),
    names: { addresses: [], dnsNames: ['mac.tail00000.ts.net'] },
    ...(now !== undefined ? { now } : {})
  });
  if (made.kind !== 'ready') throw new Error(`no identity: ${made.kind}`);
  return made.identity;
}

/** A P-256 SPKI with the point COMPRESSED: a valid key, not the canonical form. */
function compressedSpki(phone: FakePhone): string {
  const jwk = createPublicKey({
    key: Buffer.from(phone.clientPublic, 'base64url'),
    format: 'der',
    type: 'spki'
  }).export({ format: 'jwk' });
  const y = Buffer.from(String(jwk.y), 'base64url');
  const x = Buffer.from(String(jwk.x), 'base64url');
  const prefix = ((y[y.length - 1] ?? 0) & 1) === 1 ? 0x03 : 0x02;
  const header = Buffer.from('3039301306072a8648ce3d020106082a8648ce3d030107032200', 'hex');
  return b64u(Buffer.concat([header, Buffer.from([prefix]), x]));
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'p330-pairing-'));
  ready = true;
  keystore = true;
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// The hash (SPEC §4.4)
// ---------------------------------------------------------------------------

describe('the hash covers exactly the fields that decide what the door answers', () => {
  it('names the v3 algorithm and the one record key', () => {
    expect(POCKET_EXECUTION_HASH_ALGORITHM).toBe('sha256-pocket-exec-v3');
    const text = canonicalPocketText(BASE);
    expect(text.startsWith('sha256-pocket-exec-v3\n')).toBe(true);
    expect(text).toContain(POCKET_CONFIRM_RECORD_KEY);
    expect(POCKET_CONFIRM_RECORD_KEY.startsWith('pocket:')).toBe(true);
  });

  it('is exactly the eight keys, sorted, and names no bind address, port or address', () => {
    const rows = JSON.parse(canonicalPocketText(BASE).split('\n')[1] ?? '[]') as [string, unknown][];
    expect(rows.map(([k]) => k)).toEqual([
      'id',
      'bindAtLaunch',
      'funnelProgram',
      'phones',
      'publicName',
      'publicPort',
      'pushAlerts',
      'routes',
      'tailnet'
    ]);
    const text = canonicalPocketText({ ...BASE, phones: [phoneFields(makePhone())] });
    expect(text).not.toContain('bindAddress');
    expect(text).not.toContain('"port"');
    expect(text).not.toContain('address');
    // Every key of the fields is a row: a field that fell out of NORMALIZE
    // would be a key missing here.
    for (const key of Object.keys(EMPTY_POCKET_FIELDS)) {
      expect(rows.some(([k]) => k === key), key).toBe(true);
    }
  });

  it('moves when any execution bearing field moves', () => {
    const base = pocketExecutionHash(BASE);
    const moved: Partial<PocketExecutionFields>[] = [
      { funnelProgram: '/usr/local/bin/tailscale' },
      { tailnet: 'another.github' },
      { publicName: 'other.tail00000.ts.net' },
      { publicPort: 10000 },
      { bindAtLaunch: true },
      { routes: ['blocked'] },
      { phones: [phoneFields(makePhone())] },
      { pushAlerts: true }
    ];
    for (const change of moved) {
      expect(pocketExecutionHash({ ...BASE, ...change }), JSON.stringify(Object.keys(change))).not.toBe(base);
    }
  });

  it('moves when an allowed phone moves its client key, label, or any other key', () => {
    const phone = makePhone();
    const one = pocketExecutionHash({ ...BASE, phones: [phoneFields(phone)] });
    const changes: Partial<PocketPhoneFields>[] = [
      { clientKey: makePhone().clientPublic },
      { label: 'Something else' },
      { signingKey: makePhone().signPublic },
      { exchangeKey: makePhone().exchangePublic },
      { pushToken: 'a'.repeat(64), pushEnvironment: 'development' }
    ];
    for (const change of changes) {
      expect(
        pocketExecutionHash({ ...BASE, phones: [{ ...phoneFields(phone), ...change }] }),
        JSON.stringify(Object.keys(change))
      ).not.toBe(one);
    }
  });

  it('does not move for the order two lists happen to be written in', () => {
    const a = makePhone('A');
    const b = makePhone('B');
    expect(pocketExecutionHash({ ...BASE, phones: [phoneFields(b), phoneFields(a)] })).toBe(
      pocketExecutionHash({ ...BASE, phones: [phoneFields(a), phoneFields(b)] })
    );
    expect(
      pocketExecutionHash({ ...BASE, routes: [...POCKET_ROUTE_IDS].reverse() })
    ).toBe(pocketExecutionHash(BASE));
  });

  it('is the empty door with no program, tailnet, name or port', () => {
    expect(EMPTY_POCKET_FIELDS.funnelProgram).toBe('');
    expect(EMPTY_POCKET_FIELDS.tailnet).toBe('');
    expect(EMPTY_POCKET_FIELDS.publicName).toBe('');
    expect(EMPTY_POCKET_FIELDS.publicPort).toBe(0);
    expect(EMPTY_POCKET_FIELDS.phones).toEqual([]);
    expect(EMPTY_POCKET_FIELDS.routes).toEqual(POCKET_ROUTE_IDS);
    expect(describePocketDoor(EMPTY_POCKET_FIELDS).lines).toContain('Allows no phone yet');
  });
});

describe('the lines a person reads are exactly the hashed facts', () => {
  it('names the internet, the tailnet, the port and the program, in that order', () => {
    const lines = describePocketDoor(BASE).lines;
    expect(lines[0]).toBe(
      'Answers on the internet at https://mac.tail00000.ts.net:8443, through Tailscale Funnel on example.github'
    );
    expect(lines[1]).toBe(
      'Publishes it with /Applications/Tailscale.app/Contents/MacOS/Tailscale'
    );
    expect(lines[2]).toBe('Answers only after you turn it on');
    expect(lines[3]).toBe('Answers these and nothing else: blocked, pair, session, turns');
    expect(lines[4]).toBe('Tells your phone nothing through Apple');
    expect(lines[5]).toBe('Allows no phone yet');
    expect(describePocketDoor({ ...BASE, bindAtLaunch: true }).lines[2]).toBe(
      'Starts answering when Tortie starts'
    );
  });

  it('carries the warning beside them and never inside them', () => {
    const summary = describePocketDoor(BASE);
    expect(summary.warning).toBe(POCKET_CONFIRM_WARNING);
    expect(POCKET_CONFIRM_WARNING).toContain('over the internet');
    expect(summary.lines).not.toContain(POCKET_CONFIRM_WARNING);
  });

  it('names a phone with the three-key fingerprint the person matched, and no address', () => {
    const phone = makePhone('Greg iPhone');
    const lines = describePocketDoor({ ...BASE, phones: [phoneFields(phone)] }).lines;
    expect(lines).toContain(`Allows the phone "Greg iPhone", key ${fingerprintOf(phone)}`);
    expect(lines.join('\n')).not.toMatch(/ at \d/);
  });
});

describe('the fingerprint is a hash of ALL THREE keys (v2)', () => {
  it('is the test’s own spelling, and moves when any key moves', () => {
    const a = makePhone();
    const b = makePhone();
    const one = pairFingerprint(a.signPublic, a.exchangePublic, a.clientPublic);
    expect(one).toBe(fingerprintOf(a));
    expect(one).toMatch(/^([0-9a-f]{4} ){5}[0-9a-f]{4}$/);
    expect(pairFingerprint(b.signPublic, a.exchangePublic, a.clientPublic)).not.toBe(one);
    expect(pairFingerprint(a.signPublic, b.exchangePublic, a.clientPublic)).not.toBe(one);
    expect(pairFingerprint(a.signPublic, a.exchangePublic, b.clientPublic)).not.toBe(one);
  });

  it('derives the phone id from the signing key, so nobody chooses it', () => {
    const a = makePhone();
    expect(phoneIdOf(a.signPublic)).toBe(phoneIdOf(a.signPublic));
    expect(phoneIdOf(makePhone().signPublic)).not.toBe(phoneIdOf(a.signPublic));
  });
});

describe('a confirmation is written by a person and by nothing else', () => {
  it('refuses an inexact acknowledgement', () => {
    expect(() =>
      confirmPocketDoor(BASE, {
        ...consentFor(BASE),
        acknowledgement: 'a person read what this door will answer and allowed it ' as never
      })
    ).toThrow();
  });

  it('refuses when the door moved after the sheet was drawn', () => {
    const drawn = consentFor(BASE);
    expect(() => confirmPocketDoor({ ...BASE, publicPort: 10000 }, drawn)).toThrow();
  });

  it('records, and the door then may start', () => {
    expect(pocketConfirmStatus(BASE).state).toBe('never');
    expect(() => assertPocketDoorMayBind(BASE)).toThrow();
    const record = confirmPocketDoor(BASE, consentFor(BASE));
    expect(record?.id).toBe(POCKET_CONFIRM_RECORD_KEY);
    expect(pocketConfirmStatus(BASE).state).toBe('confirmed');
    expect(() => assertPocketDoorMayBind(BASE)).not.toThrow();
  });

  it('asks again the moment a Tailscale fact moves, and says it will not publish', () => {
    confirmPocketDoor(BASE, consentFor(BASE));
    for (const moved of [
      { ...BASE, tailnet: 'another.github' },
      { ...BASE, publicName: 'other.tail00000.ts.net' },
      { ...BASE, funnelProgram: '/opt/homebrew/bin/tailscale' }
    ]) {
      const status = pocketConfirmStatus(moved);
      expect(status.state).toBe('changed');
      expect(status.refusal).toContain('will not publish this door');
      expect(status.refusal).not.toContain('tailnet');
    }
  });

  it('reads a record written under v2 as changed, which asks again', () => {
    confirmPocketDoor(BASE, consentFor(BASE));
    const path = confirmPath();
    const file = JSON.parse(readFileSync(path, 'utf8')) as {
      confirmations: Record<string, { algorithm: string }>;
    };
    expect(file.confirmations[POCKET_CONFIRM_RECORD_KEY]?.algorithm).toBe('sha256-pocket-exec-v3');
  });

  it('drops a record the seal does not cover', () => {
    confirmPocketDoor(BASE, consentFor(BASE));
    const path = confirmPath();
    const file = JSON.parse(readFileSync(path, 'utf8')) as {
      confirmations: Record<string, unknown>;
      seal: string;
    };
    const forged = { ...BASE, publicName: 'attacker.tail00000.ts.net' };
    file.confirmations[POCKET_CONFIRM_RECORD_KEY] = {
      id: POCKET_CONFIRM_RECORD_KEY,
      hash: pocketExecutionHash(forged),
      algorithm: POCKET_EXECUTION_HASH_ALGORITHM,
      at: Date.now(),
      lines: []
    };
    writeFileSync(path, JSON.stringify(file), 'utf8');
    expect(pocketConfirmStatus(forged).state).toBe('never');
  });

  it('answers unknown, not confirmed, when the keystore cannot be read', () => {
    confirmPocketDoor(BASE, consentFor(BASE));
    keystore = false;
    const status = pocketConfirmStatus(BASE);
    expect(status.state).toBe('unknown');
    expect(() => assertPocketDoorMayBind(BASE)).toThrow();
  });

  it('forgets one, and the door stops being allowed to start', () => {
    confirmPocketDoor(BASE, consentFor(BASE));
    forgetPocketDoor();
    expect(pocketConfirmStatus(BASE).state).toBe('never');
  });
});

// ---------------------------------------------------------------------------
// The store (SPEC §4.4)
// ---------------------------------------------------------------------------

function storeWith(over: Record<string, unknown>): void {
  const minted = newIdentity();
  writePocketStore({
    identity: minted.sealed,
    phones: [],
    publicPort: 8443,
    tailnetFacts: null,
    bindAtLaunch: false,
    enabled: false,
    pushAlerts: false,
    deadPushTokens: [],
    ...over
  } as never);
}

describe('the sealed store', () => {
  it('round trips the public port and the Tailscale facts, and an unsealed file carries nothing', () => {
    const minted = newIdentity();
    const facts = { funnelProgram: BASE.funnelProgram, tailnet: BASE.tailnet, publicName: BASE.publicName };
    expect(
      writePocketStore({
        identity: minted.sealed,
        phones: [],
        publicPort: 10000,
        tailnetFacts: facts,
        bindAtLaunch: false,
        enabled: true,
        pushAlerts: false,
        deadPushTokens: []
      })
    ).toBe(true);
    const read = readPocketStore();
    expect(read.sealKnown).toBe(true);
    expect(read.store?.publicPort).toBe(10000);
    expect(read.store?.tailnetFacts).toEqual(facts);
    expect(read.droppedPhones).toBe(0);
    // The attack: the file is rewritten in the clear with a phone planted in it.
    writeFileSync(
      pocketStorePath(),
      JSON.stringify({
        version: 1,
        sealed: Buffer.from(
          JSON.stringify({ identity: minted.sealed, phones: [phoneFields(makePhone('Planted'))] }),
          'utf8'
        ).toString('base64')
      }),
      'utf8'
    );
    expect(readPocketStore().store).toBeNull();
  });

  it('reads Phase 316’s port as no public port, and 443 as none either', () => {
    storeWith({ publicPort: undefined, port: 8823 });
    expect(readPocketStore().store?.publicPort).toBe(0);
    storeWith({ publicPort: 443 });
    expect(readPocketStore().store?.publicPort).toBe(0);
    storeWith({ publicPort: 8443 });
    expect(readPocketStore().store?.publicPort).toBe(8443);
  });

  it('drops a fact set that is not whole', () => {
    storeWith({ tailnetFacts: { funnelProgram: '/x', tailnet: '', publicName: 'a.b.ts.net' } });
    expect(readPocketStore().store?.tailnetFacts).toBeNull();
  });

  it('drops every Phase 316 phone row WHOLE and counts them', () => {
    const good = phoneFields(makePhone('Good'));
    const old = { ...phoneFields(makePhone('Old')), address: '100.64.0.9' } as Record<string, unknown>;
    delete old['clientKey'];
    const edKey = { ...phoneFields(makePhone('WrongKind')), clientKey: makePhone().signPublic };
    const compressed = (() => {
      const p = makePhone('Compressed');
      return { ...phoneFields(p), clientKey: compressedSpki(p) };
    })();
    storeWith({ phones: [good, old, edKey, compressed, { id: 'x', label: 'Half' }] });
    const read = readPocketStore();
    expect(read.store?.phones.map((p) => p.label)).toEqual(['Good']);
    expect(read.droppedPhones).toBe(4);
  });

  it('answers not-known rather than empty when the keystore is unavailable', () => {
    storeWith({});
    keystore = false;
    const read = readPocketStore();
    expect(read.sealKnown).toBe(false);
    expect(read.store).toBeNull();
  });

  it('keeps the keys usable across a round trip', () => {
    const minted = newIdentity();
    const reopened = openIdentity(minted.sealed);
    expect(reopened.signPublic).toBe(minted.identity.signPublic);
    expect(reopened.exchangePublic).toBe(minted.identity.exchangePublic);
  });
});

describe('a client key is a canonical P-256 SPKI and nothing else', () => {
  it('accepts the uncompressed form Node exports', () => {
    expect(isClientKeySpki(makePhone().clientPublic)).toBe(true);
  });

  it('refuses a compressed point, another curve, another kind, and junk', () => {
    const p = makePhone();
    expect(isClientKeySpki(compressedSpki(p))).toBe(false);
    const p384 = generateKeyPairSync('ec', { namedCurve: 'secp384r1' });
    expect(isClientKeySpki(b64u(p384.publicKey.export({ format: 'der', type: 'spki' })))).toBe(false);
    expect(isClientKeySpki(p.signPublic)).toBe(false);
    expect(isClientKeySpki('')).toBe(false);
    expect(isClientKeySpki(`${p.clientPublic}=`)).toBe(false);
    expect(isClientKeySpki(42)).toBe(false);
  });

  it('pins the SPKI a handshake presents: the certificate’s own key, hashed by Node', () => {
    const door = realDoor();
    const phone = makePhone();
    const cert = new X509Certificate(issueClientCertificate(door.keyPem, phone.clientPublic, Date.now()));
    const spki = cert.publicKey.export({ type: 'spki', format: 'der' });
    expect(clientKeyPinOf(phone.clientPublic)).toBe(b64u(createHash('sha256').update(spki).digest()));
    // And never the certificate's own hash.
    expect(clientKeyPinOf(phone.clientPublic)).not.toBe(b64u(createHash('sha256').update(cert.raw).digest()));
  });
});

// ---------------------------------------------------------------------------
// The window (SPEC §4.7, §4.8)
// ---------------------------------------------------------------------------

describe('the pairing window', () => {
  let door: PocketIdentity;
  let tlsDoor: ReturnType<typeof realDoor>;
  let clock = 1_000_000;
  let fields: PocketExecutionFields;
  let saved: readonly PocketPhoneFields[] = [];
  let pin: string | null = PIN;
  let issuing = true;
  let signed = 0;

  function makePairing(): InstanceType<typeof PocketPairing> {
    return new PocketPairing({
      identity: () => door,
      fieldsNow: () => fields,
      savePhones: (phones) => {
        saved = phones;
        return true;
      },
      publicKeyPin: () => pin,
      issueCertificate: (ck) => {
        if (!issuing) return null;
        signed += 1;
        return b64u(issueClientCertificate(tlsDoor.keyPem, ck, clock));
      },
      now: () => clock
    });
  }

  function secretOf(offer: { payload: string }): string {
    return (JSON.parse(offer.payload) as { ps: string }).ps;
  }

  beforeEach(() => {
    door = newIdentity().identity;
    tlsDoor = realDoor();
    clock = 1_000_000;
    fields = BASE;
    saved = [];
    pin = PIN;
    issuing = true;
  });

  it('refuses to open with no public name or no public port, and moves nothing', () => {
    fields = { ...BASE, publicName: '' };
    expect(() => makePairing().open()).toThrow(/no public name/);
    fields = { ...BASE, publicPort: 0 };
    expect(() => makePairing().open()).toThrow(/no public name/);
  });

  it('is v:3: exactly the eight keys in order, the public name and port, and no credential', () => {
    const offer = makePairing().open();
    expect(POCKET_QR_VERSION).toBe(3);
    const payload = JSON.parse(offer.payload) as Record<string, unknown>;
    expect(Object.keys(payload)).toEqual(['v', 'host', 'port', 'fp', 'dk', 'dx', 'ps', 'exp']);
    expect(payload['v']).toBe(3);
    expect(payload['host']).toBe('mac.tail00000.ts.net');
    expect(payload['port']).toBe(8443);
    expect(payload['fp']).toBe(PIN);
    expect(payload['dk']).toBe(door.signPublic);
    expect(payload['dx']).toBe(door.exchangePublic);
    expect(Buffer.from(String(payload['ps']), 'base64url')).toHaveLength(16);
    expect(payload['exp']).toBe(clock + POCKET_PAIRING_WINDOW_MS);
    expect(offer.payload).not.toContain('tskey');
    expect(offer.payload).not.toContain('"tk"');
  });

  it('refuses to open while there is no key to pin, and the window that was open stays', () => {
    const pairing = makePairing();
    const first = secretOf(pairing.open());
    pin = null;
    expect(() => pairing.open()).toThrow(/not listening/);
    expect(pairing.windowOpen()).toBe(true);
    expect(pairing.present(presentation(first, makePhone())).state).toBe('pending');
  });

  it('is dead before it is opened and after it expires', () => {
    const pairing = makePairing();
    expect(pairing.windowOpen()).toBe(false);
    pairing.open();
    expect(pairing.windowOpen()).toBe(true);
    clock += POCKET_PAIRING_WINDOW_MS + 1;
    expect(pairing.windowOpen()).toBe(false);
  });

  it('derives the challenge the test spells, and the proof text the test spells', () => {
    const secret = randomBytes(16);
    expect(pairingChallengeOf(secret)).toBe(challengeOf(b64u(secret)));
    expect(presentationProofText('C', 'I', 'T', 'G')).toBe('tortie-pocket-present-v1\nC\nI\nT\nG');
  });

  it('accepts a presentation sealed under the QR secret and signed over its challenge', () => {
    const pairing = makePairing();
    const secret = secretOf(pairing.open());
    expect(pairing.present(presentation(secret, makePhone('Greg iPhone')))).toEqual({ state: 'pending' });
  });

  it('refuses a proof signed by a key other than the one the body names', () => {
    const pairing = makePairing();
    const secret = secretOf(pairing.open());
    const phone = makePhone();
    expect(pairing.present(presentation(secret, phone, { signer: makePhone().sign })).state).toBe('refused');
    expect(pairing.view().state).toBe('waiting');
  });

  it('refuses a proof over another window’s challenge', () => {
    const pairing = makePairing();
    const secret = secretOf(pairing.open());
    const other = challengeOf(b64u(randomBytes(16)));
    expect(pairing.present(presentation(secret, makePhone(), { challenge: other })).state).toBe('refused');
  });

  it('refuses a seal under a secret that was never on the screen, however well it is signed', () => {
    const pairing = makePairing();
    pairing.open();
    const stranger = b64u(randomBytes(16));
    // Signed over the REAL window's challenge would need the real secret; this
    // is the stranger's best: a proof over its own challenge.
    expect(pairing.present(presentation(stranger, makePhone())).state).toBe('refused');
  });

  it('refuses a body whose ciphertext was changed after it was signed', () => {
    const pairing = makePairing();
    const secret = secretOf(pairing.open());
    const honest = presentation(secret, makePhone());
    const ct = Buffer.from(honest.ct, 'base64url');
    ct[0] = (ct[0] ?? 0) ^ 1;
    expect(pairing.present({ ...honest, ct: b64u(ct) }).state).toBe('refused');
  });

  it('refuses a sealed signing key that is not the one the proof was checked under', () => {
    const pairing = makePairing();
    const secret = secretOf(pairing.open());
    const phone = makePhone();
    const decoy = makePhone();
    // The outer ek is the decoy's and signs honestly; the sealed ek is another.
    expect(
      pairing.present(presentation(secret, phone, { outerEk: decoy.signPublic, signer: decoy.sign })).state
    ).toBe('refused');
  });

  it('refuses a presentation with no client key, or a client key that is not canonical P-256', () => {
    const pairing = makePairing();
    const secret = secretOf(pairing.open());
    const phone = makePhone();
    expect(pairing.present(presentation(secret, phone, { noClientKey: true })).state).toBe('refused');
    expect(pairing.present(presentation(secret, phone, { extra: { ck: compressedSpki(phone) } })).state).toBe(
      'refused'
    );
    expect(pairing.present(presentation(secret, phone, { extra: { ck: phone.signPublic } })).state).toBe(
      'refused'
    );
  });

  it('refuses a client key a paired phone already completes handshakes with', () => {
    const paired = makePhone('Paired');
    fields = { ...BASE, phones: [phoneFields(paired)] };
    const pairing = makePairing();
    const secret = secretOf(pairing.open());
    const thief = makePhone('Thief');
    expect(
      pairing.present(presentation(secret, thief, { extra: { ck: paired.clientPublic } })).state
    ).toBe('refused');
  });

  it('refuses a presentation whose signing slot holds a key of the wrong kind', () => {
    const pairing = makePairing();
    const secret = secretOf(pairing.open());
    const phone = makePhone();
    const swapped: FakePhone = { ...phone, signPublic: phone.exchangePublic };
    expect(pairing.present(presentation(secret, swapped)).state).toBe('refused');
  });

  it('presents nothing and allows nothing outside the window', () => {
    const pairing = makePairing();
    const secret = secretOf(pairing.open());
    clock += POCKET_PAIRING_WINDOW_MS + 1;
    expect(pairing.present(presentation(secret, makePhone())).state).toBe('refused');
    expect(pairing.allow(consentFor(BASE)).allowed).toBe(false);
  });

  it('shows the same three-key fingerprint the phone can compute for itself', () => {
    const pairing = makePairing();
    const secret = secretOf(pairing.open());
    const phone = makePhone('Greg iPhone');
    pairing.present(presentation(secret, phone));
    const view = pairing.view();
    expect(view.state).toBe('presented');
    expect(view.label).toBe('Greg iPhone');
    expect(view.fingerprint).toBe(fingerprintOf(phone));
    expect(view.hash).toBe(pocketExecutionHash(pairing.fieldsWithPending()));
    expect(pairing.fieldsWithPending().phones[0]?.clientKey).toBe(phone.clientPublic);
  });

  it('a second presenter replaces the first, and the first sheet’s hash no longer allows', () => {
    const pairing = makePairing();
    const secret = secretOf(pairing.open());
    pairing.present(presentation(secret, makePhone('First')));
    const firstSheet = pairing.view();
    pairing.present(presentation(secret, makePhone('Card flip')));
    expect(pairing.view().label).toBe('Card flip');
    expect(() => pairing.allow(consentFor({ ...BASE }))).toThrow();
    expect(() =>
      pairing.allow({
        acknowledgement: POCKET_CONFIRM_ACKNOWLEDGEMENT,
        linesRead: firstSheet.lines,
        hashRead: firstSheet.hash ?? ''
      })
    ).toThrow();
    expect(saved).toEqual([]);
  });

  it('the person allows it LAST, and that is what writes the record', () => {
    const pairing = makePairing();
    const secret = secretOf(pairing.open());
    const phone = makePhone('Greg iPhone');
    pairing.present(presentation(secret, phone));
    expect(pocketConfirmStatus(pairing.fieldsWithPending()).state).toBe('never');
    expect(saved).toEqual([]);
    const next = pairing.fieldsWithPending();
    expect(pairing.allow(consentFor(next)).allowed).toBe(true);
    expect(pocketConfirmStatus(next).state).toBe('confirmed');
    expect(saved.map((p) => p.label)).toEqual(['Greg iPhone']);
    expect(pairing.view().state).toBe('allowed');
  });

  it('refuses a phone past the door’s pin cap with its own sentence, and signs and records nothing (lens 1)', () => {
    fields = { ...BASE, phones: Array.from({ length: DOOR_PINS_MAX }, (_, i) => phoneFields(makePhone(`P${String(i)}`))) };
    const pairing = makePairing();
    const secret = secretOf(pairing.open());
    pairing.present(presentation(secret, makePhone('One too many')));
    const next = pairing.fieldsWithPending();
    expect(next.phones).toHaveLength(DOOR_PINS_MAX + 1);
    signed = 0;
    const outcome = pairing.allow(consentFor(next));
    expect(outcome.allowed).toBe(false);
    expect(outcome.refusal).toContain(`${String(DOOR_PINS_MAX)} phones`);
    expect(signed).toBe(0);
    expect(saved).toEqual([]);
    expect(pocketConfirmStatus(next).state).toBe('never');
    // One fewer is still allowed: the cap is the wire's, not below it.
    fields = { ...BASE, phones: fields.phones.slice(1) };
    const room = makePairing();
    room.present(presentation(secretOf(room.open()), makePhone('The sixty-fourth')));
    const fits = room.fieldsWithPending();
    expect(fits.phones).toHaveLength(DOOR_PINS_MAX);
    expect(room.allow(consentFor(fits)).allowed).toBe(true);
    expect(signed).toBe(1);
  });

  it('issues the certificate FIRST: a door with nothing to sign with records nothing', () => {
    const pairing = makePairing();
    const secret = secretOf(pairing.open());
    pairing.present(presentation(secret, makePhone()));
    issuing = false;
    const next = pairing.fieldsWithPending();
    const outcome = pairing.allow(consentFor(next));
    expect(outcome.allowed).toBe(false);
    expect(pocketConfirmStatus(next).state).toBe('never');
    expect(saved).toEqual([]);
  });

  it('hands the certificate to the allowed phone, over its own client key, and to nothing else', () => {
    const pairing = makePairing();
    const secret = secretOf(pairing.open());
    const phone = makePhone('Greg iPhone');
    pairing.present(presentation(secret, phone));
    expect(pairing.allow(consentFor(pairing.fieldsWithPending())).allowed).toBe(true);
    const answer = pairing.present(presentation(secret, phone));
    expect(answer.state).toBe('allowed');
    if (answer.state !== 'allowed') throw new Error('not allowed');
    // INDEPENDENT: OpenSSL parses it, and its key is the phone's own.
    const cert = new X509Certificate(Buffer.from(answer.cert, 'base64url'));
    expect(b64u(cert.publicKey.export({ type: 'spki', format: 'der' }))).toBe(phone.clientPublic);
    expect(cert.verify(new X509Certificate(tlsDoor.certPem).publicKey)).toBe(true);
    // The SAME certificate every time it asks.
    const again = pairing.present(presentation(secret, phone));
    expect(again).toEqual(answer);
    // A second phone that photographed the screen can derive the challenge and
    // sign over it with ITS key: it is not the allowed phone.
    const thief = makePhone('Thief');
    expect(pairing.present(presentation(secret, thief))).toEqual({ state: 'refused' });
    // The allowed phone's key named by a body the thief signed: refused.
    expect(
      pairing.present(presentation(secret, phone, { signer: thief.sign }))
    ).toEqual({ state: 'refused' });
    // An `allowed` poll with no proof at all.
    expect(pairing.present({ ...presentation(secret, phone), sig: '' })).toEqual({ state: 'refused' });
    expect(saved.map((p) => p.label)).toEqual(['Greg iPhone']);
  });

  it('refuses an allowed poll after the deadline: the challenge dies with the window', () => {
    const pairing = makePairing();
    const secret = secretOf(pairing.open());
    const phone = makePhone('Greg iPhone');
    pairing.present(presentation(secret, phone));
    pairing.allow(consentFor(pairing.fieldsWithPending()));
    clock += POCKET_PAIRING_WINDOW_MS + 1;
    expect(pairing.windowOpen()).toBe(false);
    expect(pairing.view().state).toBe('idle');
    expect(pairing.present(presentation(secret, phone))).toEqual({ state: 'refused' });
    expect(saved.map((p) => p.label)).toEqual(['Greg iPhone']);
  });

  it('refuses an allow whose sheet was drawn for a different door', () => {
    const pairing = makePairing();
    const secret = secretOf(pairing.open());
    pairing.present(presentation(secret, makePhone()));
    expect(() => pairing.allow(consentFor(BASE))).toThrow();
    expect(saved).toEqual([]);
  });

  it('destroys the secret when the window is cancelled', () => {
    const pairing = makePairing();
    const secret = secretOf(pairing.open());
    pairing.cancel();
    expect(pairing.windowOpen()).toBe(false);
    expect(pairing.present(presentation(secret, makePhone())).state).toBe('refused');
  });
});

describe('the QR pins the door’s public key, not its certificate', () => {
  it('is sha256 over the SubjectPublicKeyInfo, base64url, as Node itself reads the key', () => {
    const door = realDoor();
    const spki = new X509Certificate(door.certPem).publicKey.export({ type: 'spki', format: 'der' });
    expect(spkiPinOf(door.publicKeyFingerprint)).toBe(b64u(createHash('sha256').update(spki).digest()));
  });

  it('survives the certificate’s renewal', () => {
    const born = Date.UTC(2026, 0, 1);
    const first = realDoor(born);
    const renewed = realDoor(first.notAfter - 10 * 24 * 60 * 60 * 1000);
    expect(renewed.certificateFingerprint).not.toBe(first.certificateFingerprint);
    expect(spkiPinOf(renewed.publicKeyFingerprint)).toBe(spkiPinOf(first.publicKeyFingerprint));
  });

  it('is never made from anything that is not 32 bytes', () => {
    expect(spkiPinOf(null)).toBeNull();
    expect(spkiPinOf('')).toBeNull();
    expect(spkiPinOf('AB:CD')).toBeNull();
    expect(spkiPinOf('ZZ'.repeat(32))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The verifier (SPEC §4.7.5)
// ---------------------------------------------------------------------------

describe('every request is signed, over the phone’s own connection', () => {
  let door: PocketIdentity;
  let phones: PocketPhoneFields[] = [];
  let clock = 2_000_000;

  function verifier(): InstanceType<typeof PocketRequestVerifier> {
    return new PocketRequestVerifier({
      identity: () => door,
      phones: () => phones,
      now: () => clock
    });
  }

  function request(
    phone: FakePhone,
    over: Partial<{
      method: string;
      target: string;
      body: Buffer;
      channel: string | null;
      timestamp: string;
      nonce: string;
      signature: string;
    }> = {}
  ): Parameters<InstanceType<typeof PocketRequestVerifier>['verify']>[0] {
    const method = over.method ?? 'GET';
    const target = over.target ?? '/v1/blocked';
    const body = over.body ?? Buffer.alloc(0);
    const timestamp = over.timestamp ?? String(clock);
    const nonce = over.nonce ?? b64u(randomBytes(16));
    const signature =
      over.signature ?? phoneSignature(phone, door, { method, target, body, timestamp, nonce });
    return {
      method,
      target,
      body,
      channel: over.channel === undefined ? phoneIdOf(phone.signPublic) : over.channel,
      headers: {
        [POCKET_HEADERS.phone]: phoneIdOf(phone.signPublic),
        [POCKET_HEADERS.timestamp]: timestamp,
        [POCKET_HEADERS.nonce]: nonce,
        [POCKET_HEADERS.signature]: signature
      }
    };
  }

  beforeEach(() => {
    door = newIdentity().identity;
    clock = 2_000_000;
    phones = [];
  });

  it('accepts a phone the person allowed, on its own connection', () => {
    const phone = makePhone();
    phones = [phoneFields(phone)];
    expect(verifier().verify(request(phone)).ok).toBe(true);
  });

  it('refuses a phone nobody allowed', () => {
    expect(verifier().verify(request(makePhone()))).toEqual({ ok: false, reason: 'unpaired' });
  });

  it('refuses a paired phone’s signature over ANOTHER phone’s connection', () => {
    const a = makePhone('A');
    const b = makePhone('B');
    phones = [phoneFields(a), phoneFields(b)];
    expect(verifier().verify(request(a, { channel: phoneIdOf(b.signPublic) }))).toEqual({
      ok: false,
      reason: 'channel'
    });
  });

  it('refuses a signed read over a connection that presented no certificate', () => {
    const phone = makePhone();
    phones = [phoneFields(phone)];
    expect(verifier().verify(request(phone, { channel: null }))).toEqual({ ok: false, reason: 'channel' });
  });

  it('asks the channel before it spends anything a stranger could make cost', () => {
    const phone = makePhone();
    phones = [phoneFields(phone)];
    const v = verifier();
    const nonce = b64u(randomBytes(16));
    expect(v.verify(request(phone, { channel: 'nobody', nonce }))).toEqual({ ok: false, reason: 'channel' });
    // The nonce is not spent: the phone's own read with it still verifies.
    expect(v.verify(request(phone, { nonce })).ok).toBe(true);
  });

  it('refuses a clock outside the window, on both sides', () => {
    const phone = makePhone();
    phones = [phoneFields(phone)];
    const old = String(clock - POCKET_CLOCK_SKEW_MS - 1);
    const ahead = String(clock + POCKET_CLOCK_SKEW_MS + 1);
    expect(verifier().verify(request(phone, { timestamp: old }))).toEqual({ ok: false, reason: 'stale' });
    expect(verifier().verify(request(phone, { timestamp: ahead }))).toEqual({ ok: false, reason: 'stale' });
  });

  it('refuses a replayed request, byte for byte', () => {
    const phone = makePhone();
    phones = [phoneFields(phone)];
    const v = verifier();
    const req = request(phone);
    expect(v.verify(req).ok).toBe(true);
    expect(v.verify(req)).toEqual({ ok: false, reason: 'replay' });
  });

  it('does not spend a nonce for a request whose signature failed', () => {
    const phone = makePhone();
    phones = [phoneFields(phone)];
    const v = verifier();
    const nonce = b64u(randomBytes(16));
    expect(v.verify(request(phone, { nonce, signature: b64u(randomBytes(64)) }))).toEqual({
      ok: false,
      reason: 'signature'
    });
    expect(v.verify(request(phone, { nonce })).ok).toBe(true);
  });

  it('refuses a signature made for a different request, and for a different door', () => {
    const phone = makePhone();
    phones = [phoneFields(phone)];
    const timestamp = String(clock);
    const nonce = b64u(randomBytes(16));
    const signature = phoneSignature(phone, door, {
      method: 'GET',
      target: '/v1/blocked',
      body: Buffer.alloc(0),
      timestamp,
      nonce
    });
    expect(
      verifier().verify(request(phone, { target: '/v1/session?id=abc', timestamp, nonce, signature }))
    ).toEqual({ ok: false, reason: 'signature' });
    const other = phoneSignature(phone, newIdentity().identity, {
      method: 'GET',
      target: '/v1/blocked',
      body: Buffer.alloc(0),
      timestamp,
      nonce
    });
    expect(verifier().verify(request(phone, { timestamp, nonce, signature: other }))).toEqual({
      ok: false,
      reason: 'signature'
    });
  });

  it('refuses a request with a header missing', () => {
    const phone = makePhone();
    phones = [phoneFields(phone)];
    const full = request(phone);
    for (const name of Object.values(POCKET_HEADERS)) {
      const headers = { ...full.headers } as Record<string, unknown>;
      delete headers[name];
      expect(verifier().verify({ ...full, headers: headers as never })).toEqual({
        ok: false,
        reason: 'headers'
      });
    }
  });

  it('forgets a removed phone', () => {
    const phone = makePhone();
    phones = [phoneFields(phone)];
    const v = verifier();
    expect(v.verify(request(phone)).ok).toBe(true);
    v.forget(phoneIdOf(phone.signPublic));
    phones = [];
    expect(v.verify(request(phone))).toEqual({ ok: false, reason: 'unpaired' });
  });

  it('names its algorithm in the bytes it signs, and the binding agrees on both sides', () => {
    const text = canonicalRequestText({
      method: 'GET',
      target: '/v1/blocked',
      bodySha256: 'ff',
      timestamp: '1',
      nonce: 'n',
      binding: 'b'
    });
    expect(text.startsWith(`${POCKET_REQUEST_ALGORITHM}\n`)).toBe(true);
    const phone = makePhone();
    // The phone derived it on its side in `phoneSignature`; the Mac's side:
    const mine = pairingBinding(door, phoneFields(phone));
    expect(mine).toHaveLength(64);
  });
});

// ---------------------------------------------------------------------------
// The harness helper, held to the hand spelling (SPEC §4.8.5)
// ---------------------------------------------------------------------------

describe('sealPresentationAsPhone writes what the test spells', () => {
  it('answers a body with sorted keys, an inner JSON with sorted keys, and a proof that verifies', () => {
    const door = newIdentity().identity;
    const tlsDoor = realDoor();
    const pairing = new PocketPairing({
      identity: () => door,
      fieldsNow: () => BASE,
      savePhones: () => true,
      publicKeyPin: () => PIN,
      issueCertificate: (ck) => b64u(issueClientCertificate(tlsDoor.keyPem, ck, Date.now()))
    });
    const offer = pairing.open();
    const phone = makePhone('Harness phone');
    const t = createHash('sha256').update('p330-token').digest('hex');
    const body = sealPresentationAsPhone(
      offer.payload,
      {
        label: phone.label,
        signingKey: phone.signPublic,
        exchangeKey: phone.exchangePublic,
        clientKey: phone.clientPublic,
        pushToken: t,
        pushEnvironment: 'development'
      },
      phone.sign
    );
    const text = body.toString('utf8');
    const outer = JSON.parse(text) as Record<string, string>;
    expect(Object.keys(outer)).toEqual(['ct', 'ek', 'iv', 'sig', 'tag']);
    // The test opens it with its own key derivation.
    const secret = Buffer.from((JSON.parse(offer.payload) as { ps: string }).ps, 'base64url');
    const key = Buffer.from(hkdfSync('sha256', secret, Buffer.alloc(0), 'tortie-pocket-pair-v1', 32));
    const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(outer['iv'] ?? '', 'base64url'));
    decipher.setAuthTag(Buffer.from(outer['tag'] ?? '', 'base64url'));
    const inner = Buffer.concat([
      decipher.update(Buffer.from(outer['ct'] ?? '', 'base64url')),
      decipher.final()
    ]).toString('utf8');
    expect(Object.keys(JSON.parse(inner) as object)).toEqual(['ape', 'apt', 'ck', 'ek', 'label', 'xk']);
    const proof = [
      'tortie-pocket-present-v1',
      challengeOf(b64u(secret)),
      outer['iv'],
      outer['ct'],
      outer['tag']
    ].join('\n');
    expect(
      verifyWith(
        null,
        Buffer.from(proof, 'utf8'),
        createPublicKey({ key: Buffer.from(phone.signPublic, 'base64url'), format: 'der', type: 'spki' }),
        Buffer.from(outer['sig'] ?? '', 'base64url')
      )
    ).toBe(true);
    // And the Mac opens it.
    expect(pairing.present(outer as unknown as PocketSealedPresentation)).toEqual({ state: 'pending' });
    const pending = pairing.fieldsWithPending().phones[0];
    expect(pending?.pushToken).toBe(t);
    expect(pending?.clientKey).toBe(phone.clientPublic);
  });
});

// ---------------------------------------------------------------------------
// Phase 314: the push fields, carried unchanged
// ---------------------------------------------------------------------------

function token(seed = 'a'): string {
  return createHash('sha256').update(`p314-token-${seed}`).digest('hex');
}

function tokened(
  phone: FakePhone,
  pushToken = token(),
  pushEnvironment: '' | 'development' | 'production' = 'development'
): PocketPhoneFields {
  return { ...phoneFields(phone), pushToken, pushEnvironment };
}

describe('the push fields are execution bearing', () => {
  it('moves the hash when the switch moves, or a phone’s token or environment moves', () => {
    expect(pocketExecutionHash({ ...BASE, pushAlerts: true })).not.toBe(pocketExecutionHash(BASE));
    const phone = makePhone();
    const one = pocketExecutionHash({ ...BASE, phones: [tokened(phone)] });
    expect(pocketExecutionHash({ ...BASE, phones: [phoneFields(phone)] })).not.toBe(one);
    expect(pocketExecutionHash({ ...BASE, phones: [tokened(phone, token('b'))] })).not.toBe(one);
    expect(pocketExecutionHash({ ...BASE, phones: [tokened(phone, token(), 'production')] })).not.toBe(one);
  });

  it('draws each token as its digest’s first eight, never the token', () => {
    const phone = makePhone('Greg iPhone');
    const t = token();
    const lines = describePocketDoor({ ...BASE, phones: [tokened(phone, t)] }).lines;
    expect(lines).toContain(
      `Alerts for "Greg iPhone" go through Apple (development), device ${createHash('sha256')
        .update(t, 'utf8')
        .digest('hex')
        .slice(0, 8)}`
    );
    expect(lines.join('\n').includes(t)).toBe(false);
  });
});

describe('the device token arrives inside the sealed presentation, and nowhere else', () => {
  function presentWith(extra: Record<string, unknown>): {
    answer: string;
    pending: PocketPhoneFields | undefined;
  } {
    const door = newIdentity().identity;
    const pairing = new PocketPairing({
      identity: () => door,
      fieldsNow: () => BASE,
      savePhones: () => true,
      publicKeyPin: () => PIN,
      issueCertificate: () => null,
      now: () => 1_000_000
    });
    const secret = (JSON.parse(pairing.open().payload) as { ps: string }).ps;
    const phone = makePhone('Greg iPhone');
    const answer = pairing.present(presentation(secret, phone, { extra })).state;
    return {
      answer,
      pending: pairing.fieldsWithPending().phones.find((p) => p.label === 'Greg iPhone')
    };
  }

  it('carries an honest token, folded to lowercase', () => {
    const t = token();
    const { answer, pending } = presentWith({ apt: t.toUpperCase(), ape: 'production' });
    expect(answer).toBe('pending');
    expect(pending?.pushToken).toBe(t);
    expect(pending?.pushEnvironment).toBe('production');
  });

  it('pairs a phone that asks for no alerts, with empty push fields', () => {
    const { answer, pending } = presentWith({});
    expect(answer).toBe('pending');
    expect(pending?.pushToken).toBe('');
  });

  const refused: [string, Record<string, unknown>][] = [
    ['a token that is not hex', { apt: 'z'.repeat(64), ape: 'development' }],
    ['a token with no environment', { apt: 'a'.repeat(64) }],
    ['an environment with no token', { ape: 'development' }],
    ['an environment that is not one of the two words', { apt: 'a'.repeat(64), ape: 'sandbox' }]
  ];
  for (const [name, extra] of refused) {
    it(`refuses the WHOLE presentation for ${name}`, () => {
      const { answer, pending } = presentWith(extra);
      expect(answer).toBe('refused');
      expect(pending).toBeUndefined();
    });
  }
});

describe('the store keeps the switch and the dead tokens', () => {
  it('round trips both, and keeps only digests, the newest 64', () => {
    const digests = Array.from({ length: 70 }, (_, i) => pushTokenDigest(token(String(i))));
    storeWith({
      phones: [phoneFields(makePhone('Old'))],
      pushAlerts: true,
      deadPushTokens: [...digests, 'not-a-digest']
    });
    const read = readPocketStore();
    expect(read.store?.pushAlerts).toBe(true);
    expect(read.store?.deadPushTokens).toEqual(digests.slice(-64));
    expect(read.store?.phones[0]?.pushToken).toBe('');
  });
});

describe('the sheet sees a phone’s label, fingerprint and alerts, never its token or an address', () => {
  it('says none, on or stopped, with the three-key fingerprint', () => {
    const phone = makePhone();
    const t = token();
    const view = phoneView(tokened(phone, t), 1);
    expect(view.fingerprint).toBe(fingerprintOf(phone));
    expect(Object.keys(view).sort()).toEqual(['addedAt', 'alerts', 'fingerprint', 'id', 'label']);
    expect(phoneView(phoneFields(phone), 1).alerts).toBe('none');
    expect(view.alerts).toBe('on');
    expect(phoneView(tokened(phone, t), 1, new Set([pushTokenDigest(t)])).alerts).toBe('stopped');
    expect(JSON.stringify(view).includes(t)).toBe(false);
  });
});
