/**
 * The door's own TLS identity (Phase 313, mechanism item 2).
 *
 * Tortie terminates its own TLS. The key is generated once, sealed with
 * `sealText` under this module's own prefix, and never leaves this process;
 * the certificate is self-signed by that key, and its fingerprint is what a
 * paired phone pins and what the pairing panel draws. That is the design and
 * not a shortcut: research 127 §7 items 10 and 11 end `tailscale serve` as the
 * door, because under Serve the TLS ends in `tailscaled`, a same-uid process
 * that takes the port next owns whatever the phone trusts, and **a certificate
 * Tortie does not hold is a certificate a client cannot pin**.
 *
 * ## No dependency, no spawn, no `openssl`
 *
 * Node has no certificate writer, so the X.509 is assembled here as DER by
 * hand and signed with `node:crypto`. The three alternatives were each refused
 * for a reason this phase already carries:
 *
 *  - a package (`selfsigned`, `node-forge`) is a new runtime dependency and
 *    this phase installs nothing;
 *  - `openssl` or `security` is a SPAWNED PROCESS, and the door's own tier
 *    argument in the backlog entry is that it "spawns no process, holds no
 *    sign-in, and every route is a read";
 *  - `tailscale serve` is refused above.
 *
 * What proves the hand-written DER is right is not this comment: the tests
 * hand the certificate to Node's own TLS stack as a `ca` and complete a
 * VERIFIED handshake against it, so OpenSSL parses, path-validates and
 * hostname-matches every byte written here.
 *
 * ## Two fingerprints, and the pin belongs on the SECOND one
 *
 * `certificateFingerprint` is sha256 over the certificate's DER, which is what
 * the backlog entry names and what a person compares on two screens.
 * `publicKeyFingerprint` is sha256 over the SubjectPublicKeyInfo, and it is
 * the one a paired device should hold, because **the key outlives the
 * certificate**: a certificate is 397 days long (Apple's own ceiling for a
 * TLS server certificate is 398), it is renewed FROM THE SAME KEY before it
 * expires, and a renewal that changed the pin would silently un-pair every
 * phone thirteen months after it was paired. Both are exported, both are
 * derived from the sealed bytes rather than read out of the file, and neither
 * is ever logged.
 *
 * ## Fail closed, and never regenerate behind the person's back
 *
 * `openSealedText` answers three ways and this module treats all three
 * differently, because two of them look alike and are not:
 *
 *  - no file at all is a FIRST RUN: a key is generated and sealed.
 *  - `null` is "not known yet", being `app` not ready or the keystore
 *    unavailable. The door refuses to bind and nothing on disk is touched.
 *    Overwriting here would throw away a working identity because a keychain
 *    was momentarily unavailable, which is `seal.ts`'s own warning.
 *  - `''` is a blob that proves nothing, being forged, truncated or written
 *    under another machine's key. The identity is UNREADABLE and the door
 *    refuses; it is not silently replaced, because a replacement is a re-pair
 *    of every device and that is a person's decision, offered as
 *    `regenerateDoorIdentity`.
 *
 * Nothing here writes a key, a seal or a fingerprint to the log. The only
 * fields that ever reach a log line are a count, a reason word and a clock.
 */

import {
  createHash,
  createPrivateKey,
  createPublicKey,
  createSign,
  generateKeyPairSync,
  randomBytes
} from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { isIPv4 } from 'node:net';
import { dirname, join } from 'node:path';
import { app } from 'electron';

import { openSealedText, sealAvailable, sealText } from '../config/seal';

/**
 * The third key prefix, beside `gmux-config-confirm-v1:` in
 * `src/main/config/confirm-record.ts` and the settings danger seal. A prefix
 * is what stops a blob sealed for one purpose from opening as another.
 */
export const POCKET_TLS_SEAL_PREFIX = 'gmux-pocket-tls-v1:';

/** 397 days. Apple's ceiling for a TLS server certificate is 398. */
export const CERTIFICATE_DAYS = 397;

/** Renew this far ahead of expiry, from the SAME key. */
export const RENEW_WITHIN_MS = 30 * 24 * 60 * 60 * 1000;

/** Clock skew allowance on `notBefore`. */
const NOT_BEFORE_SKEW_MS = 5 * 60 * 1000;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// What a caller gets
// ---------------------------------------------------------------------------

/** The subject names a certificate is asked to cover. */
export interface DoorSubjectNames {
  /** IPv4 literals, being the Mac's tailnet address. */
  readonly addresses: readonly string[];
  /** Names, being the MagicDNS name when one is known. */
  readonly dnsNames: readonly string[];
}

/** The identity the door serves with. `keyPem` never leaves this process. */
export interface DoorIdentity {
  readonly keyPem: string;
  readonly certPem: string;
  /** sha256 over the certificate DER, uppercase hex in colon pairs. */
  readonly certificateFingerprint: string;
  /** sha256 over the SubjectPublicKeyInfo DER. The pin that survives renewal. */
  readonly publicKeyFingerprint: string;
  /** Epoch ms. */
  readonly notBefore: number;
  readonly notAfter: number;
  /** Exactly the names inside the certificate, in the order they are encoded. */
  readonly subjectAltNames: readonly string[];
}

/** Why an identity could not be produced. One word, one sentence. */
export type IdentityRefusal =
  | 'seal-unavailable'
  | 'identity-unreadable'
  | 'seal-write-failed'
  | 'no-subject-names';

export type IdentityOutcome =
  | {
      readonly kind: 'ready';
      readonly identity: DoorIdentity;
      /** True when this call generated a new key. */
      readonly created: boolean;
      /** True when this call issued a new certificate under the old key. */
      readonly renewed: boolean;
    }
  | {
      readonly kind: 'refused';
      readonly reason: IdentityRefusal;
      readonly sentence: string;
    };

/**
 * The sentences a person reads. They are here, in the module that owns the
 * refusal, which is the rule `build/assert-bundle-refusals.mjs` exists to
 * keep: a refusal's words live with the code that refuses.
 */
export const IDENTITY_SENTENCES: Readonly<Record<IdentityRefusal, string>> = {
  'seal-unavailable':
    'Tortie could not reach this Mac’s keychain, so it cannot keep the door’s certificate safe. The door is off until it can.',
  'identity-unreadable':
    'The door’s certificate cannot be opened on this Mac. Tortie will not replace it on its own, because a new certificate means pairing every phone again.',
  'seal-write-failed':
    'Tortie could not seal the door’s new certificate, so it wrote nothing and the door is off.',
  'no-subject-names':
    'Tortie has no tailnet address to put in the door’s certificate, so there is nothing to serve.'
};

/** The seal, as a port, so a test can drive this module with no Electron. */
export interface IdentitySealPort {
  available(): boolean;
  seal(text: string): string | undefined;
  open(blob: unknown): string | null;
}

/** The real one. Named here so the module's own imports show what it uses. */
export const electronSeal: IdentitySealPort = {
  available: () => sealAvailable(),
  seal: (text) => sealText(POCKET_TLS_SEAL_PREFIX, text),
  open: (blob) => openSealedText(POCKET_TLS_SEAL_PREFIX, blob)
};

export interface IdentityOptions {
  /** Where the sealed identity lives. Defaults to `doorIdentityPath()`. */
  readonly path?: string;
  readonly seal?: IdentitySealPort;
  /** Epoch ms, injectable so expiry and renewal are testable. */
  readonly now?: number;
  readonly names: DoorSubjectNames;
}

/**
 * `<userData>/gmux/pocket-identity.json`, beside the confirm record and inside
 * the inner `gmux/` directory CLAUDE.md pins. The file holds one sealed blob
 * and nothing else a reader could believe.
 */
export function doorIdentityPath(): string {
  return join(app.getPath('userData'), 'gmux', 'pocket-identity.json');
}

// ---------------------------------------------------------------------------
// The sealed file
// ---------------------------------------------------------------------------

interface IdentityFile {
  version: 1;
  /** safeStorage over `${POCKET_TLS_SEAL_PREFIX}${JSON.stringify(SealedIdentity)}`. */
  sealed?: string;
}

interface SealedIdentity {
  keyPem: string;
  certPem: string;
}

/** What the file says, before anything is believed about it. */
type LoadResult =
  | { kind: 'missing' }
  | { kind: 'unknown' }
  | { kind: 'unreadable' }
  | { kind: 'loaded'; sealed: SealedIdentity };

function loadSealed(path: string, seal: IdentitySealPort): LoadResult {
  let raw: unknown = null;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return { kind: 'missing' };
  }
  const blob =
    raw !== null && typeof raw === 'object'
      ? (raw as Record<string, unknown>)['sealed']
      : undefined;
  if (typeof blob !== 'string' || blob.length === 0) return { kind: 'missing' };
  const opened = seal.open(blob);
  if (opened === null) return { kind: 'unknown' };
  if (opened.length === 0) return { kind: 'unreadable' };
  try {
    const parsed: unknown = JSON.parse(opened);
    if (parsed === null || typeof parsed !== 'object') return { kind: 'unreadable' };
    const obj = parsed as Record<string, unknown>;
    const keyPem = obj['keyPem'];
    const certPem = obj['certPem'];
    if (typeof keyPem !== 'string' || typeof certPem !== 'string') {
      return { kind: 'unreadable' };
    }
    if (keyPem.length === 0 || certPem.length === 0) return { kind: 'unreadable' };
    return { kind: 'loaded', sealed: { keyPem, certPem } };
  } catch {
    return { kind: 'unreadable' };
  }
}

/** Write the whole file sealed, atomically, owner-readable only. */
function writeSealed(
  path: string,
  seal: IdentitySealPort,
  sealed: SealedIdentity
): boolean {
  const blob = seal.seal(JSON.stringify(sealed));
  if (blob === undefined) return false;
  const file: IdentityFile = { version: 1, sealed: blob };
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(file, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600
  });
  renameSync(tmp, path); // atomic on the same volume
  return true;
}

// ---------------------------------------------------------------------------
// The identity
// ---------------------------------------------------------------------------

/**
 * Load the sealed identity, or make one; renew the certificate from the same
 * key when it is near expiry or no longer covers the names the door needs.
 */
export function ensureDoorIdentity(options: IdentityOptions): IdentityOutcome {
  const seal = options.seal ?? electronSeal;
  const now = options.now ?? Date.now();
  const names = normaliseNames(options.names);
  if (names.length === 0) {
    return refusal('no-subject-names');
  }
  let path: string;
  try {
    path = options.path ?? doorIdentityPath();
  } catch {
    // `app` is not available. That is the same answer as an unavailable
    // keystore: not known yet, and nothing is written.
    return refusal('seal-unavailable');
  }

  const loaded = loadSealed(path, seal);
  if (loaded.kind === 'unknown') return refusal('seal-unavailable');
  if (loaded.kind === 'unreadable') return refusal('identity-unreadable');

  if (loaded.kind === 'loaded') {
    const held = describe(loaded.sealed);
    if (held !== null && !needsReissue(held, names, now)) {
      return { kind: 'ready', identity: held, created: false, renewed: false };
    }
    if (held !== null) {
      // Same key, new certificate. The public-key pin does not move, which is
      // the whole reason renewal is allowed to happen without asking anybody.
      const certPem = issueCertificate(loaded.sealed.keyPem, names, now);
      const next: SealedIdentity = { keyPem: loaded.sealed.keyPem, certPem };
      if (!writeSealed(path, seal, next)) return refusal('seal-write-failed');
      const identity = describe(next);
      if (identity === null) return refusal('identity-unreadable');
      return { kind: 'ready', identity, created: false, renewed: true };
    }
    // The blob opened but the PEM inside it is not a key this build can use.
    return refusal('identity-unreadable');
  }

  // First run: no file, or a file with nothing sealed in it.
  if (!seal.available()) return refusal('seal-unavailable');
  const created = generateIdentity(names, now);
  if (!writeSealed(path, seal, created)) return refusal('seal-write-failed');
  const identity = describe(created);
  if (identity === null) return refusal('identity-unreadable');
  return { kind: 'ready', identity, created: true, renewed: false };
}

/**
 * Throw the identity away and make a new one. A person's decision, because it
 * un-pairs every device that pinned the old key.
 */
export function regenerateDoorIdentity(options: IdentityOptions): IdentityOutcome {
  const seal = options.seal ?? electronSeal;
  const now = options.now ?? Date.now();
  const names = normaliseNames(options.names);
  if (names.length === 0) return refusal('no-subject-names');
  if (!seal.available()) return refusal('seal-unavailable');
  let path: string;
  try {
    path = options.path ?? doorIdentityPath();
  } catch {
    return refusal('seal-unavailable');
  }
  const made = generateIdentity(names, now);
  if (!writeSealed(path, seal, made)) return refusal('seal-write-failed');
  const identity = describe(made);
  if (identity === null) return refusal('identity-unreadable');
  return { kind: 'ready', identity, created: true, renewed: false };
}

/**
 * The short form a person matches on two screens (research 127 §7 item 18:
 * the confirmation binds to a KEY and not to a name, and both sides show a
 * short fingerprint). Twelve hex digits of the public-key fingerprint, in
 * groups of four.
 */
export function shortFingerprint(fingerprint: string): string {
  const hex = fingerprint.replace(/:/g, '').toUpperCase();
  const head = hex.slice(0, 12);
  return `${head.slice(0, 4)} ${head.slice(4, 8)} ${head.slice(8, 12)}`;
}

// ---------------------------------------------------------------------------
// What the rest of the domain reads, under the names `build/p313/SPEC.md` §1
// pins. The door holds the identity when it opens and drops it when it closes,
// so a fingerprint anybody draws is the fingerprint something is answering
// with, and never one from a certificate no socket is serving.
//
// It is a HOLD rather than a cache with its own life: nothing here re-reads
// the file, re-seals anything or asks a keystore. `bind.ts` calls
// `holdDoorIdentity` and this module never calls back into it, which is what
// keeps the two modules acyclic.
// ---------------------------------------------------------------------------

let held: DoorIdentity | null = null;

/** The door's own line: what it opened with, or null once it has closed. */
export function holdDoorIdentity(identity: DoorIdentity | null): void {
  held = identity;
}

/** The sha256 a paired client pins and the pairing panel draws. */
export function pocketCertificateFingerprint(): string | null {
  return held?.certificateFingerprint ?? null;
}

/**
 * The fingerprint that SURVIVES a renewal, which is the one a device should
 * hold. See the header: the key outlives the certificate.
 */
export function pocketPublicKeyFingerprint(): string | null {
  return held?.publicKeyFingerprint ?? null;
}

/** The material the listener serves with. Null when no door is open. */
export function pocketTlsMaterial(): { key: string; cert: string } | null {
  if (held === null) return null;
  return { key: held.keyPem, cert: held.certPem };
}

function refusal(reason: IdentityRefusal): IdentityOutcome {
  return { kind: 'refused', reason, sentence: IDENTITY_SENTENCES[reason] };
}

/** Addresses first, then names; duplicates and empties dropped. */
function normaliseNames(names: DoorSubjectNames): readonly string[] {
  const out: string[] = [];
  for (const address of names.addresses) {
    if (isIPv4(address) && !out.includes(address)) out.push(address);
  }
  for (const name of names.dnsNames) {
    const trimmed = name.trim();
    if (trimmed.length > 0 && !out.includes(trimmed)) out.push(trimmed);
  }
  return out;
}

function needsReissue(
  held: DoorIdentity,
  wanted: readonly string[],
  now: number
): boolean {
  if (held.notAfter - now <= RENEW_WITHIN_MS) return true;
  if (held.notBefore > now + NOT_BEFORE_SKEW_MS) return true;
  return wanted.some((name) => !held.subjectAltNames.includes(name));
}

/** Read back what a sealed pair actually is, from the bytes and not the file. */
function describe(sealed: SealedIdentity): DoorIdentity | null {
  try {
    const der = pemToDer(sealed.certPem, 'CERTIFICATE');
    const parsed = readCertificateFacts(der);
    if (parsed === null) return null;
    return {
      keyPem: sealed.keyPem,
      certPem: sealed.certPem,
      certificateFingerprint: fingerprintOf(der),
      publicKeyFingerprint: fingerprintOf(parsed.spki),
      notBefore: parsed.notBefore,
      notAfter: parsed.notAfter,
      subjectAltNames: parsed.subjectAltNames
    };
  } catch {
    return null;
  }
}

function fingerprintOf(der: Buffer): string {
  const hex = createHash('sha256').update(der).digest('hex').toUpperCase();
  return (hex.match(/.{2}/g) ?? []).join(':');
}

function generateIdentity(names: readonly string[], now: number): SealedIdentity {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const keyPem = privateKey
    .export({ type: 'pkcs8', format: 'pem' })
    .toString();
  return { keyPem, certPem: issueCertificate(keyPem, names, now) };
}

// ---------------------------------------------------------------------------
// X.509, written by hand
//
// RFC 5280 §4.1. Everything below is DER: definite lengths, no indefinite
// forms, and the one signature is ECDSA-with-SHA256, whose AlgorithmIdentifier
// carries NO parameters (RFC 5758 §3.2).
// ---------------------------------------------------------------------------

const OID_COMMON_NAME = '2.5.4.3';
const OID_ECDSA_SHA256 = '1.2.840.10045.4.3.2';
const OID_BASIC_CONSTRAINTS = '2.5.29.19';
const OID_KEY_USAGE = '2.5.29.15';
const OID_SUBJECT_ALT_NAME = '2.5.29.17';
const OID_EXT_KEY_USAGE = '2.5.29.37';
const OID_SERVER_AUTH = '1.3.6.1.5.5.7.3.1';

/** The name on the certificate. A person reads the fingerprint, not this. */
const SUBJECT_COMMON_NAME = 'Tortie';

function issueCertificate(
  keyPem: string,
  names: readonly string[],
  now: number
): string {
  const privateKey = createPrivateKey(keyPem);
  const spki = createPublicKey(privateKey).export({
    type: 'spki',
    format: 'der'
  });
  const notBefore = now - NOT_BEFORE_SKEW_MS;
  const notAfter = now + CERTIFICATE_DAYS * MS_PER_DAY;

  const tbs = derSequence(
    Buffer.concat([
      derExplicit(0, derInteger(Buffer.from([2]))), // v3
      derInteger(serialNumber()),
      signatureAlgorithm(),
      distinguishedName(SUBJECT_COMMON_NAME),
      derSequence(Buffer.concat([derTime(notBefore), derTime(notAfter)])),
      distinguishedName(SUBJECT_COMMON_NAME),
      Buffer.from(spki),
      derExplicit(3, derSequence(Buffer.concat(extensions(names))))
    ])
  );

  const signature = createSign('SHA256').update(tbs).sign(privateKey);
  const certificate = derSequence(
    Buffer.concat([tbs, signatureAlgorithm(), derBitString(signature)])
  );
  return derToPem(certificate, 'CERTIFICATE');
}

/** 16 random bytes, always positive. */
function serialNumber(): Buffer {
  const bytes = randomBytes(16);
  bytes[0] = (bytes[0] ?? 0) & 0x7f;
  if (bytes[0] === 0) bytes[0] = 0x01;
  return bytes;
}

function signatureAlgorithm(): Buffer {
  return derSequence(derOid(OID_ECDSA_SHA256));
}

function distinguishedName(commonName: string): Buffer {
  const attribute = derSequence(
    Buffer.concat([derOid(OID_COMMON_NAME), derUtf8(commonName)])
  );
  return derSequence(der(0x31, attribute)); // SET OF
}

function extensions(names: readonly string[]): Buffer[] {
  const basic = extension(OID_BASIC_CONSTRAINTS, true, derSequence(Buffer.alloc(0)));
  // digitalSignature only: an ECDSA server key signs the handshake and
  // encrypts nothing.
  const keyUsage = extension(
    OID_KEY_USAGE,
    true,
    der(0x03, Buffer.from([0x07, 0x80]))
  );
  const extended = extension(
    OID_EXT_KEY_USAGE,
    false,
    derSequence(derOid(OID_SERVER_AUTH))
  );
  const san = extension(
    OID_SUBJECT_ALT_NAME,
    false,
    derSequence(Buffer.concat(names.map(generalName)))
  );
  return [basic, keyUsage, extended, san];
}

function generalName(name: string): Buffer {
  if (isIPv4(name)) {
    const octets = name.split('.').map((part) => Number.parseInt(part, 10));
    return der(0x87, Buffer.from(octets)); // [7] iPAddress, IMPLICIT primitive
  }
  return der(0x82, Buffer.from(name, 'utf8')); // [2] dNSName
}

function extension(oid: string, critical: boolean, value: Buffer): Buffer {
  const parts = [derOid(oid)];
  if (critical) parts.push(der(0x01, Buffer.from([0xff]))); // BOOLEAN TRUE
  parts.push(der(0x04, value)); // OCTET STRING
  return derSequence(Buffer.concat(parts));
}

// --- the DER writer -------------------------------------------------------

function der(tag: number, content: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), derLength(content.length), content]);
}

function derLength(length: number): Buffer {
  if (length < 0x80) return Buffer.from([length]);
  const bytes: number[] = [];
  let left = length;
  while (left > 0) {
    bytes.unshift(left & 0xff);
    left = Math.floor(left / 256);
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

function derSequence(content: Buffer): Buffer {
  return der(0x30, content);
}

/** A context-specific, constructed, EXPLICIT tag. */
function derExplicit(number: number, content: Buffer): Buffer {
  return der(0xa0 | number, content);
}

function derInteger(magnitude: Buffer): Buffer {
  let start = 0;
  while (start < magnitude.length - 1 && magnitude[start] === 0) start += 1;
  const trimmed = magnitude.subarray(start);
  const needsPad = (trimmed[0] ?? 0) >= 0x80;
  return der(
    0x02,
    needsPad ? Buffer.concat([Buffer.from([0]), trimmed]) : trimmed
  );
}

function derBitString(content: Buffer): Buffer {
  return der(0x03, Buffer.concat([Buffer.from([0]), content]));
}

function derUtf8(text: string): Buffer {
  return der(0x0c, Buffer.from(text, 'utf8'));
}

function derOid(dotted: string): Buffer {
  const parts = dotted.split('.').map((p) => Number.parseInt(p, 10));
  const first = (parts[0] ?? 0) * 40 + (parts[1] ?? 0);
  const bytes: number[] = [first];
  for (const part of parts.slice(2)) {
    const chunk: number[] = [part & 0x7f];
    let left = Math.floor(part / 128);
    while (left > 0) {
      chunk.unshift((left & 0x7f) | 0x80);
      left = Math.floor(left / 128);
    }
    bytes.push(...chunk);
  }
  return der(0x06, Buffer.from(bytes));
}

/**
 * UTCTime below 2050 and GeneralizedTime at or above it, which is RFC 5280
 * §4.1.2.5's rule and not a preference.
 */
function derTime(epochMs: number): Buffer {
  const d = new Date(epochMs);
  const pad = (n: number, width: number): string => String(n).padStart(width, '0');
  const year = d.getUTCFullYear();
  const rest =
    pad(d.getUTCMonth() + 1, 2) +
    pad(d.getUTCDate(), 2) +
    pad(d.getUTCHours(), 2) +
    pad(d.getUTCMinutes(), 2) +
    pad(d.getUTCSeconds(), 2) +
    'Z';
  if (year < 2050) {
    return der(0x17, Buffer.from(pad(year % 100, 2) + rest, 'ascii'));
  }
  return der(0x18, Buffer.from(pad(year, 4) + rest, 'ascii'));
}

function derToPem(content: Buffer, label: string): string {
  const body = content.toString('base64').match(/.{1,64}/g) ?? [];
  return `-----BEGIN ${label}-----\n${body.join('\n')}\n-----END ${label}-----\n`;
}

function pemToDer(pem: string, label: string): Buffer {
  const begin = `-----BEGIN ${label}-----`;
  const end = `-----END ${label}-----`;
  const start = pem.indexOf(begin);
  const stop = pem.indexOf(end);
  if (start < 0 || stop < 0) throw new Error('not a PEM block');
  const body = pem.slice(start + begin.length, stop).replace(/\s+/g, '');
  return Buffer.from(body, 'base64');
}

// --- the DER reader, for the facts the door reports -----------------------

interface CertificateFacts {
  readonly spki: Buffer;
  readonly notBefore: number;
  readonly notAfter: number;
  readonly subjectAltNames: readonly string[];
}

interface Tlv {
  readonly tag: number;
  readonly content: Buffer;
  /** The whole element, header included. */
  readonly raw: Buffer;
  readonly end: number;
}

function readTlv(buf: Buffer, offset: number): Tlv | null {
  if (offset + 2 > buf.length) return null;
  const tag = buf[offset] ?? 0;
  const first = buf[offset + 1] ?? 0;
  let length = 0;
  let cursor = offset + 2;
  if (first < 0x80) {
    length = first;
  } else {
    const count = first & 0x7f;
    if (count === 0 || count > 4 || cursor + count > buf.length) return null;
    for (let i = 0; i < count; i += 1) {
      length = length * 256 + (buf[cursor + i] ?? 0);
    }
    cursor += count;
  }
  const end = cursor + length;
  if (end > buf.length) return null;
  return {
    tag,
    content: buf.subarray(cursor, end),
    raw: buf.subarray(offset, end),
    end
  };
}

function children(content: Buffer): Tlv[] {
  const out: Tlv[] = [];
  let offset = 0;
  while (offset < content.length) {
    const tlv = readTlv(content, offset);
    if (tlv === null) break;
    out.push(tlv);
    offset = tlv.end;
  }
  return out;
}

/**
 * Read back the three facts the door reports. It parses what this module
 * writes and nothing more: a certificate from anywhere else is not something
 * this door ever serves.
 */
function readCertificateFacts(der: Buffer): CertificateFacts | null {
  const certificate = readTlv(der, 0);
  if (certificate === null || certificate.tag !== 0x30) return null;
  const top = children(certificate.content);
  const tbs = top[0];
  if (tbs === undefined || tbs.tag !== 0x30) return null;
  const fields = children(tbs.content);
  // v3: [0] version, serial, algorithm, issuer, validity, subject, spki, [3]
  if (fields.length < 8) return null;
  const validity = fields[4];
  const spki = fields[6];
  const extensionsField = fields[7];
  if (validity === undefined || spki === undefined || extensionsField === undefined) {
    return null;
  }
  const times = children(validity.content);
  const notBefore = readTime(times[0]);
  const notAfter = readTime(times[1]);
  if (notBefore === null || notAfter === null) return null;
  return {
    spki: Buffer.from(spki.raw),
    notBefore,
    notAfter,
    subjectAltNames: readSubjectAltNames(extensionsField)
  };
}

function readTime(tlv: Tlv | undefined): number | null {
  if (tlv === undefined) return null;
  const text = tlv.content.toString('ascii');
  const m =
    tlv.tag === 0x17
      ? /^(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(text)
      : /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})Z$/.exec(text);
  if (m === null) return null;
  const rawYear = Number.parseInt(m[1] ?? '0', 10);
  // RFC 5280 §4.1.2.5.1: a two digit year 50 or above is 19xx.
  const year = tlv.tag === 0x17 ? (rawYear >= 50 ? 1900 + rawYear : 2000 + rawYear) : rawYear;
  return Date.UTC(
    year,
    Number.parseInt(m[2] ?? '1', 10) - 1,
    Number.parseInt(m[3] ?? '1', 10),
    Number.parseInt(m[4] ?? '0', 10),
    Number.parseInt(m[5] ?? '0', 10),
    Number.parseInt(m[6] ?? '0', 10)
  );
}

function readSubjectAltNames(extensionsField: Tlv): readonly string[] {
  const inner = children(extensionsField.content)[0];
  if (inner === undefined) return [];
  for (const ext of children(inner.content)) {
    const parts = children(ext.content);
    const oid = parts[0];
    const value = parts[parts.length - 1];
    if (oid === undefined || value === undefined) continue;
    if (oidText(oid) !== OID_SUBJECT_ALT_NAME) continue;
    const names = children(value.content)[0];
    if (names === undefined) return [];
    const out: string[] = [];
    for (const name of children(names.content)) {
      if (name.tag === 0x87 && name.content.length === 4) {
        out.push(Array.from(name.content).join('.'));
      } else if (name.tag === 0x82) {
        out.push(name.content.toString('utf8'));
      }
    }
    return out;
  }
  return [];
}

function oidText(tlv: Tlv): string {
  if (tlv.tag !== 0x06 || tlv.content.length === 0) return '';
  const bytes = Array.from(tlv.content);
  const first = bytes[0] ?? 0;
  const parts = [Math.floor(first / 40), first % 40];
  let value = 0;
  for (const byte of bytes.slice(1)) {
    value = value * 128 + (byte & 0x7f);
    if ((byte & 0x80) === 0) {
      parts.push(value);
      value = 0;
    }
  }
  return parts.join('.');
}
