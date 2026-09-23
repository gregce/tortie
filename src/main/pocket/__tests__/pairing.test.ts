/**
 * The pairing gate (Phase 313).
 *
 * These are written as the adversary rather than as the happy path, because
 * what this gate defends against is not a mistake. It is a process running as
 * the same user, with write access to the same home directory, that can write
 * `pocket.json` and can compute a sha256 as easily as Tortie can — and, on the
 * other side, anything else that can reach a tailnet address.
 *
 * THE PHONE HALF IS WRITTEN OUT BY HAND, and that is the point. Nothing below
 * reuses a private helper of the module under test to build a presentation or a
 * signature: the test composes the sealed body and the canonical signing string
 * itself, from the wire format, exactly as a phone with no Swift would. A test
 * that signed with the module's own composer would prove the module agrees with
 * itself and nothing about what is on the wire.
 *
 * `safeStorage` is faked with a reversible transform standing in for the
 * keychain. It is not encryption and it is not meant to be. What it models is
 * the one property the gate depends on: Tortie can produce the value and the
 * file's author cannot.
 */

import {
  createCipheriv,
  createHash,
  createPublicKey,
  generateKeyPairSync,
  hkdfSync,
  randomBytes,
  sign as signWith,
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
  PocketPhoneFields
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
  POCKET_REQUEST_ALGORITHM,
  PocketPairing,
  PocketRequestVerifier,
  assertPocketDoorMayBind,
  canonicalPocketText,
  canonicalRequestText,
  confirmPocketDoor,
  describePocketDoor,
  forgetPocketDoor,
  newIdentity,
  openIdentity,
  pairFingerprint,
  pairingBinding,
  phoneIdOf,
  pocketConfirmStatus,
  pocketExecutionHash,
  pocketStorePath,
  pushTokenDigest,
  readPocketStore,
  sealPresentationAsPhone,
  phoneView,
  writePocketStore
} = await import('../pairing');
const { confirmPath } = await import('../../config/confirm-record');
const { POCKET_CONFIRM_WARNING, POCKET_ROUTE_IDS } = await import(
  '@shared/ipc/pocket'
);

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

/** The wire format, spelled by the test and never imported from the module. */
function sealPresentation(
  secretB64u: string,
  phone: FakePhone,
  extra: Record<string, unknown> = {}
): Buffer {
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
    xk: phone.exchangePublic,
    ...extra
  });
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.from(
    JSON.stringify({
      iv: b64u(iv),
      ct: b64u(ct),
      tag: b64u(cipher.getAuthTag())
    }),
    'utf8'
  );
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
  const binding = pairingBinding(door, {
    id: phoneIdOf(phone.signPublic),
    label: phone.label,
    signingKey: phone.signPublic,
    exchangeKey: phone.exchangePublic,
    address: '100.64.0.9',
    pushToken: '',
    pushEnvironment: ''
  });
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

function phoneFields(phone: FakePhone, address = '100.64.0.9'): PocketPhoneFields {
  return {
    id: phoneIdOf(phone.signPublic),
    label: phone.label,
    signingKey: phone.signPublic,
    exchangeKey: phone.exchangePublic,
    address,
    pushToken: '',
    pushEnvironment: ''
  };
}

const BASE: PocketExecutionFields = {
  bindAddress: '100.64.0.1',
  port: 8823,
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

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'p313-pairing-'));
  ready = true;
  keystore = true;
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------

describe('the hash covers exactly the fields that decide what the door answers', () => {
  it('names its algorithm and the one record key', () => {
    const text = canonicalPocketText(BASE);
    expect(text.startsWith(`${POCKET_EXECUTION_HASH_ALGORITHM}\n`)).toBe(true);
    expect(text).toContain(POCKET_CONFIRM_RECORD_KEY);
    expect(POCKET_CONFIRM_RECORD_KEY.startsWith('pocket:')).toBe(true);
  });

  it('moves when any execution bearing field moves', () => {
    const base = pocketExecutionHash(BASE);
    expect(pocketExecutionHash({ ...BASE, bindAddress: '100.64.0.2' })).not.toBe(base);
    expect(pocketExecutionHash({ ...BASE, port: 8824 })).not.toBe(base);
    expect(pocketExecutionHash({ ...BASE, bindAtLaunch: true })).not.toBe(base);
    expect(pocketExecutionHash({ ...BASE, routes: ['blocked'] })).not.toBe(base);
    const phone = makePhone();
    expect(
      pocketExecutionHash({ ...BASE, phones: [phoneFields(phone)] })
    ).not.toBe(base);
  });

  it('moves when an allowed phone moves address, label or key', () => {
    const phone = makePhone();
    const one = pocketExecutionHash({ ...BASE, phones: [phoneFields(phone)] });
    expect(
      pocketExecutionHash({
        ...BASE,
        phones: [{ ...phoneFields(phone), address: '100.64.0.77' }]
      })
    ).not.toBe(one);
    expect(
      pocketExecutionHash({
        ...BASE,
        phones: [{ ...phoneFields(phone), label: 'Something else' }]
      })
    ).not.toBe(one);
    expect(
      pocketExecutionHash({
        ...BASE,
        phones: [{ ...phoneFields(phone), signingKey: makePhone().signPublic }]
      })
    ).not.toBe(one);
  });

  it('does not move for the order two lists happen to be written in', () => {
    const a = makePhone('A');
    const b = makePhone('B');
    const one = pocketExecutionHash({
      ...BASE,
      phones: [phoneFields(a), phoneFields(b)]
    });
    const other = pocketExecutionHash({
      ...BASE,
      phones: [phoneFields(b), phoneFields(a)]
    });
    expect(other).toBe(one);
    expect(
      pocketExecutionHash({ ...BASE, routes: [...POCKET_ROUTE_IDS].reverse() })
    ).toBe(pocketExecutionHash(BASE));
  });
});

describe('the lines a person reads are exactly the hashed facts', () => {
  it('carries the warning beside them and never inside them', () => {
    const summary = describePocketDoor(BASE);
    expect(summary.warning).toBe(POCKET_CONFIRM_WARNING);
    expect(summary.lines).not.toContain(POCKET_CONFIRM_WARNING);
    expect(canonicalPocketText(BASE)).not.toContain(POCKET_CONFIRM_WARNING);
  });

  it('names every route it will answer', () => {
    const line = describePocketDoor(BASE).lines.find((l) =>
      l.startsWith('Answers these and nothing else:')
    );
    for (const id of POCKET_ROUTE_IDS) expect(line).toContain(id);
  });

  it('names a phone with the fingerprint the person matched', () => {
    const phone = makePhone('Greg iPhone');
    const lines = describePocketDoor({
      ...BASE,
      phones: [phoneFields(phone)]
    }).lines;
    const row = lines.find((l) => l.includes('Greg iPhone'));
    expect(row).toBeDefined();
    expect(row).toContain(
      pairFingerprint(phone.signPublic, phone.exchangePublic)
    );
  });
});

describe('the fingerprint is a hash of BOTH keys', () => {
  it('moves when either key moves', () => {
    const a = makePhone();
    const b = makePhone();
    const one = pairFingerprint(a.signPublic, a.exchangePublic);
    expect(pairFingerprint(b.signPublic, a.exchangePublic)).not.toBe(one);
    expect(pairFingerprint(a.signPublic, b.exchangePublic)).not.toBe(one);
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
        acknowledgement:
          'a person read what this door will answer and allowed it ' as never
      })
    ).toThrow();
  });

  it('refuses when the door moved after the sheet was drawn', () => {
    const drawn = consentFor(BASE);
    expect(() =>
      confirmPocketDoor({ ...BASE, port: 9000 }, drawn)
    ).toThrow();
  });

  it('records, and the door then may bind', () => {
    expect(pocketConfirmStatus(BASE).state).toBe('never');
    expect(() => assertPocketDoorMayBind(BASE)).toThrow();
    const record = confirmPocketDoor(BASE, consentFor(BASE));
    expect(record?.id).toBe(POCKET_CONFIRM_RECORD_KEY);
    expect(pocketConfirmStatus(BASE).state).toBe('confirmed');
    expect(() => assertPocketDoorMayBind(BASE)).not.toThrow();
  });

  it('asks again the moment a field moves', () => {
    confirmPocketDoor(BASE, consentFor(BASE));
    const moved = { ...BASE, port: 9000 };
    expect(pocketConfirmStatus(moved).state).toBe('changed');
    expect(() => assertPocketDoorMayBind(moved)).toThrow();
  });

  it('asks again the moment a phone is added to the file by hand', () => {
    confirmPocketDoor(BASE, consentFor(BASE));
    const forged = { ...BASE, phones: [phoneFields(makePhone('Planted'))] };
    expect(pocketConfirmStatus(forged).state).toBe('changed');
  });

  it('drops a record the seal does not cover', () => {
    confirmPocketDoor(BASE, consentFor(BASE));
    const path = confirmPath();
    const file = JSON.parse(readFileSync(path, 'utf8')) as {
      confirmations: Record<string, unknown>;
      seal: string;
    };
    // The attack: the record is rewritten to a hash the attacker computed for a
    // door of their own, keeping the seal that covered the real one.
    file.confirmations[POCKET_CONFIRM_RECORD_KEY] = {
      id: POCKET_CONFIRM_RECORD_KEY,
      hash: pocketExecutionHash({ ...BASE, bindAddress: '100.64.0.250' }),
      algorithm: POCKET_EXECUTION_HASH_ALGORITHM,
      at: Date.now(),
      lines: []
    };
    writeFileSync(path, JSON.stringify(file), 'utf8');
    expect(
      pocketConfirmStatus({ ...BASE, bindAddress: '100.64.0.250' }).state
    ).toBe('never');
  });

  it('answers unknown, not confirmed, when the keystore cannot be read', () => {
    confirmPocketDoor(BASE, consentFor(BASE));
    keystore = false;
    const status = pocketConfirmStatus(BASE);
    expect(status.state).toBe('unknown');
    expect(status.refusal).not.toBeNull();
    expect(() => assertPocketDoorMayBind(BASE)).toThrow();
  });

  it('forgets one, and the door stops being allowed to bind', () => {
    confirmPocketDoor(BASE, consentFor(BASE));
    forgetPocketDoor();
    expect(pocketConfirmStatus(BASE).state).toBe('never');
  });
});

describe('the sealed store', () => {
  it('round trips, and an unsealed file carries nothing', () => {
    const minted = newIdentity();
    expect(
      writePocketStore({
        identity: minted.sealed,
        phones: [],
        port: 8823,
        bindAtLaunch: false,
        enabled: true,
        pushAlerts: false,
        deadPushTokens: []
      })
    ).toBe(true);
    const read = readPocketStore();
    expect(read.sealKnown).toBe(true);
    expect(read.store?.enabled).toBe(true);
    // The attack: the file is rewritten with a phone the person never allowed.
    writeFileSync(
      pocketStorePath(),
      JSON.stringify({
        version: 1,
        sealed: Buffer.from(
          JSON.stringify({
            identity: minted.sealed,
            phones: [phoneFields(makePhone('Planted'))],
            port: 8823,
            bindAtLaunch: true,
            enabled: true
          }),
          'utf8'
        ).toString('base64')
      }),
      'utf8'
    );
    expect(readPocketStore().store).toBeNull();
  });

  it('drops an invalid phone row WHOLE and keeps the good ones', () => {
    const minted = newIdentity();
    const good = phoneFields(makePhone('Good'));
    writePocketStore({
      identity: minted.sealed,
      // The bad row is half a phone. It must not be merged and must not throw.
      phones: [good, { id: 'x', label: 'Bad' } as unknown as PocketPhoneFields],
      port: 8823,
      bindAtLaunch: false,
      enabled: false,
      pushAlerts: false,
      deadPushTokens: []
    });
    const read = readPocketStore();
    expect(read.store?.phones.map((p) => p.label)).toEqual(['Good']);
  });

  it('answers not-known rather than empty when the keystore is unavailable', () => {
    writePocketStore({
      identity: newIdentity().sealed,
      phones: [],
      port: 8823,
      bindAtLaunch: false,
      enabled: false,
      pushAlerts: false,
      deadPushTokens: []
    });
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

// ---------------------------------------------------------------------------

describe('the pairing window', () => {
  let door: PocketIdentity;
  let clock = 1_000_000;
  let fields: PocketExecutionFields;
  let saved: readonly PocketPhoneFields[] = [];

  function makePairing(): InstanceType<typeof PocketPairing> {
    return new PocketPairing({
      identity: () => door,
      fieldsNow: () => fields,
      savePhones: (phones) => {
        saved = phones;
        return true;
      },
      certificateFingerprint: () => 'ab:cd',
      now: () => clock
    });
  }

  beforeEach(() => {
    door = newIdentity().identity;
    clock = 1_000_000;
    fields = BASE;
    saved = [];
  });

  it('refuses to open with no tailnet address', () => {
    fields = { ...BASE, bindAddress: '' };
    expect(() => makePairing().open()).toThrow();
  });

  it('carries no tailnet key and no bearer token in the QR', () => {
    const offer = makePairing().open();
    const payload = JSON.parse(offer.payload) as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(
      ['dk', 'dx', 'exp', 'fp', 'host', 'port', 'ps', 'v'].sort()
    );
    // Research 128 §3.2: Tortie holds no Tailscale credential, so nothing in
    // the QR can be a tailnet auth key. Tailscale's own keys begin `tskey-`.
    expect(offer.payload).not.toContain('tskey');
    expect(offer.payload.toLowerCase()).not.toContain('bearer');
    expect(offer.payload.toLowerCase()).not.toContain('authorization');
    expect(payload['exp']).toBe(clock + POCKET_PAIRING_WINDOW_MS);
  });

  it('is dead before it is opened and after it expires', () => {
    const pairing = makePairing();
    expect(pairing.windowOpen()).toBe(false);
    pairing.open();
    expect(pairing.windowOpen()).toBe(true);
    clock += POCKET_PAIRING_WINDOW_MS + 1;
    expect(pairing.windowOpen()).toBe(false);
  });

  it('accepts a presentation sealed under the QR secret, and nothing else', () => {
    const pairing = makePairing();
    const offer = pairing.open();
    const secret = (JSON.parse(offer.payload) as { ps: string }).ps;
    const phone = makePhone('Greg iPhone');
    expect(pairing.present(sealPresentation(secret, phone), '100.64.0.9')).toBe(
      'pending'
    );
    // A body sealed under a secret that was never on the screen.
    const other = makePairing();
    other.open();
    expect(
      pairing.present(sealPresentation(b64u(randomBytes(16)), phone), '100.64.0.9')
    ).toBe('refused');
    // Plain text, no seal at all.
    expect(
      pairing.present(
        Buffer.from(JSON.stringify({ label: 'x', ek: 'y', xk: 'z' }), 'utf8'),
        '100.64.0.9'
      )
    ).toBe('refused');
  });

  it('refuses a presentation whose keys are the wrong kind', () => {
    const pairing = makePairing();
    const secret = (JSON.parse(pairing.open().payload) as { ps: string }).ps;
    const phone = makePhone();
    // The signing slot is handed an X25519 key, which cannot verify anything.
    const swapped: FakePhone = {
      ...phone,
      signPublic: phone.exchangePublic
    };
    expect(pairing.present(sealPresentation(secret, swapped), '100.64.0.9')).toBe(
      'refused'
    );
  });

  it('presents nothing and allows nothing outside the window', () => {
    const pairing = makePairing();
    const secret = (JSON.parse(pairing.open().payload) as { ps: string }).ps;
    clock += POCKET_PAIRING_WINDOW_MS + 1;
    expect(
      pairing.present(sealPresentation(secret, makePhone()), '100.64.0.9')
    ).toBe('refused');
    expect(pairing.allow(consentFor(BASE)).allowed).toBe(false);
  });

  it('shows the same fingerprint the phone can compute for itself', () => {
    const pairing = makePairing();
    const secret = (JSON.parse(pairing.open().payload) as { ps: string }).ps;
    const phone = makePhone('Greg iPhone');
    pairing.present(sealPresentation(secret, phone), '100.64.0.9');
    const view = pairing.view();
    expect(view.state).toBe('presented');
    expect(view.label).toBe('Greg iPhone');
    expect(view.fingerprint).toBe(
      pairFingerprint(phone.signPublic, phone.exchangePublic)
    );
    expect(view.hash).toBe(pocketExecutionHash(pairing.fieldsWithPending()));
  });

  it('the person allows it LAST, and that is what writes the record', () => {
    const pairing = makePairing();
    const secret = (JSON.parse(pairing.open().payload) as { ps: string }).ps;
    const phone = makePhone('Greg iPhone');
    pairing.present(sealPresentation(secret, phone), '100.64.0.9');
    // Presenting has recorded nothing.
    expect(pocketConfirmStatus(pairing.fieldsWithPending()).state).toBe('never');
    expect(saved).toEqual([]);
    const next = pairing.fieldsWithPending();
    const outcome = pairing.allow(consentFor(next));
    expect(outcome.allowed).toBe(true);
    expect(pocketConfirmStatus(next).state).toBe('confirmed');
    expect(saved.map((p) => p.label)).toEqual(['Greg iPhone']);
    expect(pairing.view().state).toBe('allowed');
  });

  it('tells the allowed phone it was allowed, and tells nothing else', () => {
    const pairing = makePairing();
    const secret = (JSON.parse(pairing.open().payload) as { ps: string }).ps;
    const phone = makePhone('Greg iPhone');
    pairing.present(sealPresentation(secret, phone), '100.64.0.9');
    const next = pairing.fieldsWithPending();
    expect(pairing.allow(consentFor(next)).allowed).toBe(true);
    // The phone is sitting on "Nothing is paired until you do" and asks again.
    expect(pairing.present(sealPresentation(secret, phone), '100.64.0.9')).toBe(
      'allowed'
    );
    // A second phone that photographed the same screen learns nothing, because
    // the allow destroyed the secret.
    expect(
      pairing.present(sealPresentation(secret, makePhone('Thief')), '100.64.0.250')
    ).toBe('refused');
    expect(saved.map((p) => p.label)).toEqual(['Greg iPhone']);
  });

  it('sweeps an ALLOWED window at its deadline, so the sheet goes idle', () => {
    const pairing = makePairing();
    const secret = (JSON.parse(pairing.open().payload) as { ps: string }).ps;
    const phone = makePhone('Greg iPhone');
    pairing.present(sealPresentation(secret, phone), '100.64.0.9');
    pairing.allow(consentFor(pairing.fieldsWithPending()));
    expect(pairing.view().state).toBe('allowed');
    clock += POCKET_PAIRING_WINDOW_MS + 1;
    expect(pairing.windowOpen()).toBe(false);
    expect(pairing.view().state).toBe('idle');
    // And the phone that WAS allowed is told nothing after the window shut.
    expect(pairing.present(sealPresentation(secret, phone), '100.64.0.9')).toBe(
      'refused'
    );
    // The phone is still allowed: the record and the phone set say so, and it
    // is the signed reads that prove it from here on.
    expect(saved.map((p) => p.label)).toEqual(['Greg iPhone']);
  });

  it('refuses an allow whose sheet was drawn for a different door', () => {
    const pairing = makePairing();
    const secret = (JSON.parse(pairing.open().payload) as { ps: string }).ps;
    pairing.present(sealPresentation(secret, makePhone()), '100.64.0.9');
    expect(() => pairing.allow(consentFor(BASE))).toThrow();
    expect(saved).toEqual([]);
  });

  it('destroys the secret when the window is cancelled', () => {
    const pairing = makePairing();
    const secret = (JSON.parse(pairing.open().payload) as { ps: string }).ps;
    pairing.cancel();
    expect(pairing.windowOpen()).toBe(false);
    expect(
      pairing.present(sealPresentation(secret, makePhone()), '100.64.0.9')
    ).toBe('refused');
  });
});

// ---------------------------------------------------------------------------

describe('every request is signed', () => {
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
      from: string;
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
      over.signature ??
      phoneSignature(phone, door, { method, target, body, timestamp, nonce });
    return {
      method,
      target,
      body,
      from: over.from ?? '100.64.0.9',
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

  it('accepts a phone the person allowed', () => {
    const phone = makePhone();
    phones = [phoneFields(phone)];
    const verdict = verifier().verify(request(phone));
    expect(verdict.ok).toBe(true);
  });

  it('refuses a phone nobody allowed', () => {
    const phone = makePhone();
    const verdict = verifier().verify(request(phone));
    expect(verdict).toEqual({ ok: false, reason: 'unpaired' });
  });

  it('refuses an address that is not the one the phone paired from', () => {
    const phone = makePhone();
    phones = [phoneFields(phone)];
    const verdict = verifier().verify(request(phone, { from: '100.64.0.77' }));
    expect(verdict).toEqual({ ok: false, reason: 'address' });
  });

  it('refuses a clock outside the window, on both sides', () => {
    const phone = makePhone();
    phones = [phoneFields(phone)];
    const old = String(clock - POCKET_CLOCK_SKEW_MS - 1);
    const ahead = String(clock + POCKET_CLOCK_SKEW_MS + 1);
    expect(verifier().verify(request(phone, { timestamp: old }))).toEqual({
      ok: false,
      reason: 'stale'
    });
    expect(verifier().verify(request(phone, { timestamp: ahead }))).toEqual({
      ok: false,
      reason: 'stale'
    });
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
    expect(
      v.verify(request(phone, { nonce, signature: b64u(randomBytes(64)) }))
    ).toEqual({ ok: false, reason: 'signature' });
    // The honest phone's own request, using that same nonce, still works: an
    // unsigned flood cannot burn a real nonce.
    expect(v.verify(request(phone, { nonce })).ok).toBe(true);
  });

  it('refuses a signature made for a different request', () => {
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
    // The same signature aimed at a different path.
    expect(
      verifier().verify(
        request(phone, { target: '/v1/session?id=abc', timestamp, nonce, signature })
      )
    ).toEqual({ ok: false, reason: 'signature' });
  });

  it('refuses a signature made for a DIFFERENT DOOR, which is the binding', () => {
    const phone = makePhone();
    phones = [phoneFields(phone)];
    const otherDoor = newIdentity().identity;
    const timestamp = String(clock);
    const nonce = b64u(randomBytes(16));
    const signature = phoneSignature(phone, otherDoor, {
      method: 'GET',
      target: '/v1/blocked',
      body: Buffer.alloc(0),
      timestamp,
      nonce
    });
    expect(
      verifier().verify(request(phone, { timestamp, nonce, signature }))
    ).toEqual({ ok: false, reason: 'signature' });
  });

  it('refuses a request with a header missing', () => {
    const phone = makePhone();
    phones = [phoneFields(phone)];
    const full = request(phone);
    for (const name of Object.values(POCKET_HEADERS)) {
      const headers = { ...full.headers };
      delete (headers as Record<string, unknown>)[name];
      expect(verifier().verify({ ...full, headers })).toEqual({
        ok: false,
        reason: 'headers'
      });
    }
  });

  it('forgets a removed phone, keys and spent nonces alike', () => {
    const phone = makePhone();
    phones = [phoneFields(phone)];
    const v = verifier();
    const req = request(phone);
    expect(v.verify(req).ok).toBe(true);
    v.forget(phoneIdOf(phone.signPublic));
    phones = [];
    expect(v.verify(request(phone))).toEqual({ ok: false, reason: 'unpaired' });
  });

  it('names its algorithm in the bytes it signs', () => {
    const text = canonicalRequestText({
      method: 'GET',
      target: '/v1/blocked',
      bodySha256: 'ff',
      timestamp: '1',
      nonce: 'n',
      binding: 'b'
    });
    expect(text.startsWith(`${POCKET_REQUEST_ALGORITHM}\n`)).toBe(true);
  });

  it('derives the same binding on both sides and never sends it', () => {
    const phone = makePhone();
    const fields = phoneFields(phone);
    const mine = pairingBinding(door, fields);
    // The phone's half, computed with the phone's private key and the door's
    // public one. Equal secrets, so equal bindings.
    expect(mine).toHaveLength(64);
    expect(
      pairingBinding(door, { ...fields, exchangeKey: makePhone().exchangePublic })
    ).not.toBe(mine);
    expect(
      createPublicKey({
        key: Buffer.from(fields.exchangeKey, 'base64url'),
        format: 'der',
        type: 'spki'
      }).asymmetricKeyType
    ).toBe('x25519');
  });
});

describe('the empty door', () => {
  it('allows no phone and answers the whole closed table', () => {
    expect(EMPTY_POCKET_FIELDS.phones).toEqual([]);
    expect(EMPTY_POCKET_FIELDS.routes).toEqual(POCKET_ROUTE_IDS);
    expect(describePocketDoor(EMPTY_POCKET_FIELDS).lines).toContain(
      'Allows no phone yet'
    );
  });
});

// ---------------------------------------------------------------------------
// Phase 314: the switch, the device token, and the one door it comes in by
// ---------------------------------------------------------------------------

/** A device token, as a phone presents one: 32 bytes of hex. */
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
  it('names the v2 algorithm, because the canonical text changed shape', () => {
    expect(POCKET_EXECUTION_HASH_ALGORITHM).toBe('sha256-pocket-exec-v2');
    expect(canonicalPocketText(BASE)).toContain('"pushAlerts"');
  });

  it('moves the hash when the switch moves', () => {
    expect(pocketExecutionHash({ ...BASE, pushAlerts: true })).not.toBe(
      pocketExecutionHash(BASE)
    );
  });

  it('moves the hash when a phone’s token or its environment moves', () => {
    const phone = makePhone();
    const one = pocketExecutionHash({ ...BASE, phones: [tokened(phone)] });
    expect(pocketExecutionHash({ ...BASE, phones: [phoneFields(phone)] })).not.toBe(one);
    expect(
      pocketExecutionHash({ ...BASE, phones: [tokened(phone, token('b'))] })
    ).not.toBe(one);
    expect(
      pocketExecutionHash({ ...BASE, phones: [tokened(phone, token(), 'production')] })
    ).not.toBe(one);
  });

  it('asks again when the switch is turned on after a confirm', () => {
    confirmPocketDoor(BASE, consentFor(BASE));
    expect(pocketConfirmStatus({ ...BASE, pushAlerts: true }).state).toBe('changed');
  });

  it('draws the switch and each token as lines the person reads', () => {
    const phone = makePhone('Greg iPhone');
    const t = token();
    const off = describePocketDoor({ ...BASE, phones: [tokened(phone, t)] }).lines;
    expect(off).toContain('Tells your phone nothing through Apple');
    expect(off).toContain(
      `Alerts for "Greg iPhone" go through Apple (development), device ${createHash('sha256')
        .update(t, 'utf8')
        .digest('hex')
        .slice(0, 8)}`
    );
    const on = describePocketDoor({ ...BASE, pushAlerts: true }).lines;
    expect(on).toContain(
      'Tells your phone through Apple when a session starts waiting on you, never what it asks, and nothing while this Mac sleeps'
    );
    // A phone with no token draws no alerts line at all.
    const none = describePocketDoor({ ...BASE, phones: [phoneFields(phone)] }).lines;
    expect(none.some((l) => l.startsWith('Alerts for'))).toBe(false);
  });

  it('never draws the token itself, only its digest’s first eight', () => {
    const t = token();
    const lines = describePocketDoor({ ...BASE, phones: [tokened(makePhone(), t)] }).lines;
    expect(lines.join('\n').includes(t)).toBe(false);
  });
});

describe('the device token arrives inside the sealed presentation, and nowhere else', () => {
  let door: PocketIdentity;
  let fields: PocketExecutionFields;

  function makePairing(): InstanceType<typeof PocketPairing> {
    return new PocketPairing({
      identity: () => door,
      fieldsNow: () => fields,
      savePhones: () => true,
      certificateFingerprint: () => 'ab:cd',
      now: () => 1_000_000
    });
  }

  beforeEach(() => {
    door = newIdentity().identity;
    fields = BASE;
  });

  function presentWith(extra: Record<string, unknown>): {
    answer: string;
    pending: PocketPhoneFields | undefined;
  } {
    const pairing = makePairing();
    const secret = (JSON.parse(pairing.open().payload) as { ps: string }).ps;
    const phone = makePhone('Greg iPhone');
    const answer = pairing.present(sealPresentation(secret, phone, extra), '100.64.0.9');
    return {
      answer,
      pending: pairing.fieldsWithPending().phones.find((p) => p.label === 'Greg iPhone')
    };
  }

  it('carries an honest token and environment into the fields the person confirms', () => {
    const t = token();
    const { answer, pending } = presentWith({ apt: t, ape: 'production' });
    expect(answer).toBe('pending');
    expect(pending?.pushToken).toBe(t);
    expect(pending?.pushEnvironment).toBe('production');
  });

  it('folds an uppercase token to lowercase, so one token has one digest', () => {
    const t = token();
    const { answer, pending } = presentWith({ apt: t.toUpperCase(), ape: 'development' });
    expect(answer).toBe('pending');
    expect(pending?.pushToken).toBe(t);
  });

  it('pairs a phone that asks for no alerts, with empty push fields', () => {
    const { answer, pending } = presentWith({});
    expect(answer).toBe('pending');
    expect(pending?.pushToken).toBe('');
    expect(pending?.pushEnvironment).toBe('');
  });

  const refused: [string, Record<string, unknown>][] = [
    ['a token that is not hex', { apt: 'z'.repeat(64), ape: 'development' }],
    ['a token of 31 characters', { apt: 'a'.repeat(31), ape: 'development' }],
    ['a token of 257 characters', { apt: 'a'.repeat(257), ape: 'development' }],
    ['a token that is a number', { apt: 1234, ape: 'development' }],
    ['a token with no environment', { apt: 'a'.repeat(64) }],
    ['an environment with no token', { ape: 'development' }],
    ['an environment that is not one of the two words', { apt: 'a'.repeat(64), ape: 'sandbox' }],
    ['an empty token beside an environment', { apt: '', ape: 'production' }]
  ];
  for (const [name, extra] of refused) {
    it(`refuses the WHOLE presentation for ${name}`, () => {
      const { answer, pending } = presentWith(extra);
      expect(answer).toBe('refused');
      expect(pending).toBeUndefined();
    });
  }

  it('the helper the harness pairs through seals what the door opens', () => {
    const pairing = makePairing();
    const offer = pairing.open();
    const phone = makePhone('Harness phone');
    const t = token('h');
    const body = sealPresentationAsPhone(offer.payload, {
      label: phone.label,
      signingKey: phone.signPublic,
      exchangeKey: phone.exchangePublic,
      pushToken: t,
      pushEnvironment: 'development'
    });
    expect(pairing.present(body, '100.64.0.9')).toBe('pending');
    const pending = pairing.fieldsWithPending().phones[0];
    expect(pending?.pushToken).toBe(t);
    expect(pending?.pushEnvironment).toBe('development');
  });
});

describe('the store keeps the switch and the dead tokens', () => {
  it('round trips both, and a row from before Phase 314 reads as no token', () => {
    const minted = newIdentity();
    const d1 = pushTokenDigest(token('dead-1'));
    writePocketStore({
      identity: minted.sealed,
      phones: [phoneFields(makePhone('Old'))],
      port: 8823,
      bindAtLaunch: false,
      enabled: false,
      pushAlerts: true,
      deadPushTokens: [d1]
    });
    const read = readPocketStore();
    expect(read.store?.pushAlerts).toBe(true);
    expect(read.store?.deadPushTokens).toEqual([d1]);
    expect(read.store?.phones[0]?.pushToken).toBe('');
    expect(read.store?.phones[0]?.pushEnvironment).toBe('');
  });

  it('reads a row with NO push keys at all as a phone that gave no token', () => {
    const minted = newIdentity();
    const bare = { ...phoneFields(makePhone('Bare')) } as Record<string, unknown>;
    delete bare['pushToken'];
    delete bare['pushEnvironment'];
    writePocketStore({
      identity: minted.sealed,
      phones: [bare as unknown as PocketPhoneFields],
      port: 8823,
      bindAtLaunch: false,
      enabled: false,
      pushAlerts: false,
      deadPushTokens: []
    });
    const phone = readPocketStore().store?.phones[0];
    expect(phone?.label).toBe('Bare');
    expect(phone?.pushToken).toBe('');
  });

  it('drops a row whose push fields are present and wrong, WHOLE', () => {
    const minted = newIdentity();
    const good = tokened(makePhone('Good'));
    const bad: PocketPhoneFields[] = [
      { ...tokened(makePhone('Upper')), pushToken: token().toUpperCase() },
      { ...tokened(makePhone('NoEnv')), pushEnvironment: '' },
      { ...phoneFields(makePhone('EnvOnly')), pushEnvironment: 'production' },
      { ...tokened(makePhone('Short')), pushToken: 'abcd' }
    ];
    writePocketStore({
      identity: minted.sealed,
      phones: [good, ...bad],
      port: 8823,
      bindAtLaunch: false,
      enabled: false,
      pushAlerts: false,
      deadPushTokens: []
    });
    expect(readPocketStore().store?.phones.map((p) => p.label)).toEqual(['Good']);
  });

  it('keeps only digests in the dead list, and only the newest 64', () => {
    const minted = newIdentity();
    const digests = Array.from({ length: 70 }, (_, i) => pushTokenDigest(token(String(i))));
    writePocketStore({
      identity: minted.sealed,
      phones: [],
      port: 8823,
      bindAtLaunch: false,
      enabled: false,
      pushAlerts: false,
      deadPushTokens: [...digests, 'not-a-digest', token('raw').toUpperCase()]
    });
    const dead = readPocketStore().store?.deadPushTokens ?? [];
    expect(dead).toHaveLength(64);
    expect(dead).toEqual(digests.slice(-64));
  });
});

describe('the sheet sees whether a phone can be told, never its token', () => {
  it('says none, on or stopped', () => {
    const phone = makePhone();
    const t = token();
    expect(phoneView(phoneFields(phone), 1).alerts).toBe('none');
    expect(phoneView(tokened(phone, t), 1).alerts).toBe('on');
    expect(phoneView(tokened(phone, t), 1, new Set([pushTokenDigest(t)])).alerts).toBe('stopped');
    expect(JSON.stringify(phoneView(tokened(phone, t), 1)).includes(t)).toBe(false);
  });
});
