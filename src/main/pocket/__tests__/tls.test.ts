/**
 * The door's TLS identity (Phase 313, builder A).
 *
 * THE INDEPENDENT CHECK IS NODE'S OWN TLS STACK. The certificate in this file
 * is written by hand as DER, so a test that only re-read it with the same
 * module's own parser would prove that two halves of one file agree. Instead
 * every structural claim is put to OpenSSL: `X509Certificate` parses it, and a
 * real TLS handshake on an ephemeral loopback port completes with
 * `rejectUnauthorized` ON and the certificate as the only `ca`, so the
 * signature, the validity window, the SAN and the extensions are all checked
 * by code nobody here wrote. The fingerprints are compared against
 * `x509.fingerprint256` and against a sha256 of the public key Node exports,
 * never against this module's own bytes.
 *
 * Everything binds 127.0.0.1 on an ephemeral port and closes it in a
 * `finally`. Nothing reads a keychain: the seal is a port and this file passes
 * a fake one, so no test here needs Electron, and the real seal is what
 * `probe:p313` drives.
 *
 * It writes only under a directory it makes with `mkdtemp` and removes.
 */

import { X509Certificate, createHash, createPublicKey, generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connect, createServer } from 'node:tls';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  CERTIFICATE_DAYS,
  CLIENT_CERTIFICATE_NOT_AFTER,
  IDENTITY_SENTENCES,
  P256_SPKI_HEADER,
  POCKET_TLS_SEAL_PREFIX,
  ensureDoorIdentity,
  isP256SpkiDer,
  issueClientCertificate,
  regenerateDoorIdentity,
  shortFingerprint,
  type IdentitySealPort
} from '../tls';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

let dir: string;
let path: string;

/**
 * A seal that is readable and therefore NOT a seal. It proves the module's
 * round trip and its three answers; what a real seal buys is in `seal.ts` and
 * is driven by the probe.
 */
function fakeSeal(over: Partial<IdentitySealPort> = {}): IdentitySealPort {
  return {
    available: () => true,
    seal: (text) => Buffer.from(`${POCKET_TLS_SEAL_PREFIX}${text}`).toString('base64'),
    open: (blob) => {
      if (typeof blob !== 'string' || blob.length === 0) return '';
      const text = Buffer.from(blob, 'base64').toString('utf8');
      if (!text.startsWith(POCKET_TLS_SEAL_PREFIX)) return '';
      return text.slice(POCKET_TLS_SEAL_PREFIX.length);
    },
    ...over
  };
}

const NAMES = { addresses: ['127.0.0.1'], dnsNames: ['tortie.test'] };

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'p313-tls-'));
  path = join(dir, 'pocket-identity.json');
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('the certificate Tortie writes by hand', () => {
  it('is parsed, path-validated and hostname-matched by Node itself', async () => {
    const made = ensureDoorIdentity({ path, seal: fakeSeal(), names: NAMES });
    expect(made.kind).toBe('ready');
    if (made.kind !== 'ready') return;

    const server = createServer(
      { key: made.identity.keyPem, cert: made.identity.certPem },
      (socket) => socket.end('ok')
    );
    try {
      const port = await new Promise<number>((resolve) => {
        server.listen(0, '127.0.0.1', () => {
          resolve((server.address() as { port: number }).port);
        });
      });
      const authorized = await new Promise<boolean>((resolve, reject) => {
        const socket = connect(
          {
            host: '127.0.0.1',
            port,
            // The certificate is the ONLY trust anchor, and the check is on.
            ca: [made.identity.certPem],
            rejectUnauthorized: true,
            minVersion: 'TLSv1.2'
          },
          () => {
            const ok = socket.authorized;
            socket.end();
            resolve(ok);
          }
        );
        socket.on('error', reject);
      });
      expect(authorized).toBe(true);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('carries the names it was asked for, as an address and a name', () => {
    const made = ensureDoorIdentity({ path, seal: fakeSeal(), names: NAMES });
    if (made.kind !== 'ready') throw new Error('not ready');
    const x509 = new X509Certificate(made.identity.certPem);
    expect(x509.subjectAltName).toContain('IP Address:127.0.0.1');
    expect(x509.subjectAltName).toContain('DNS:tortie.test');
    expect(x509.subject).toContain('CN=Tortie');
    expect(x509.issuer).toBe(x509.subject); // self-signed
    expect(x509.ca).toBe(false);
    expect(made.identity.subjectAltNames).toEqual(['127.0.0.1', 'tortie.test']);
  });

  it('lives 397 days, which is inside Apple’s 398 day ceiling', () => {
    const now = Date.UTC(2026, 8, 22, 12, 0, 0);
    const made = ensureDoorIdentity({ path, seal: fakeSeal(), names: NAMES, now });
    if (made.kind !== 'ready') throw new Error('not ready');
    const x509 = new X509Certificate(made.identity.certPem);
    const days =
      (Date.parse(x509.validTo) - Date.parse(x509.validFrom)) / MS_PER_DAY;
    expect(Math.round(days)).toBe(CERTIFICATE_DAYS);
    expect(days).toBeLessThan(398);
    expect(Date.parse(x509.validFrom)).toBeLessThan(now);
    expect(made.identity.notAfter).toBe(Date.parse(x509.validTo));
    expect(made.identity.notBefore).toBe(Date.parse(x509.validFrom));
  });

  it('reports the two fingerprints Node computes, not its own', () => {
    const made = ensureDoorIdentity({ path, seal: fakeSeal(), names: NAMES });
    if (made.kind !== 'ready') throw new Error('not ready');
    const x509 = new X509Certificate(made.identity.certPem);
    expect(made.identity.certificateFingerprint).toBe(x509.fingerprint256);
    const spki = x509.publicKey.export({ type: 'spki', format: 'der' });
    const expected = createHash('sha256')
      .update(spki)
      .digest('hex')
      .toUpperCase()
      .replace(/(.{2})(?=.)/g, '$1:');
    expect(made.identity.publicKeyFingerprint).toBe(expected);
    expect(shortFingerprint(made.identity.publicKeyFingerprint)).toMatch(
      /^[0-9A-F]{4} [0-9A-F]{4} [0-9A-F]{4}$/
    );
  });
});

describe('the sealed file', () => {
  it('holds no key in the clear and is owner-only', () => {
    const made = ensureDoorIdentity({ path, seal: fakeSeal(), names: NAMES });
    if (made.kind !== 'ready') throw new Error('not ready');
    const raw = readFileSync(path, 'utf8');
    expect(raw).not.toContain('BEGIN PRIVATE KEY');
    expect(raw).not.toContain('BEGIN CERTIFICATE');
    expect(raw).not.toContain(made.identity.keyPem.slice(40, 80));
    expect(Object.keys(JSON.parse(raw))).toEqual(['version', 'sealed']);
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it('is opened again rather than replaced, so the pin does not move', () => {
    const first = ensureDoorIdentity({ path, seal: fakeSeal(), names: NAMES });
    const before = sha256File(path);
    const second = ensureDoorIdentity({ path, seal: fakeSeal(), names: NAMES });
    if (first.kind !== 'ready' || second.kind !== 'ready') throw new Error('x');
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.renewed).toBe(false);
    expect(second.identity.publicKeyFingerprint).toBe(
      first.identity.publicKeyFingerprint
    );
    expect(sha256File(path)).toBe(before);
  });
});

describe('the three answers a seal can give', () => {
  it('refuses and writes NOTHING when the keystore is not ready', () => {
    ensureDoorIdentity({ path, seal: fakeSeal(), names: NAMES });
    const before = sha256File(path);
    const out = ensureDoorIdentity({
      path,
      seal: fakeSeal({ open: () => null, available: () => false }),
      names: NAMES
    });
    expect(out).toEqual({
      kind: 'refused',
      reason: 'seal-unavailable',
      sentence: IDENTITY_SENTENCES['seal-unavailable']
    });
    expect(sha256File(path)).toBe(before);
  });

  it('refuses a blob that proves nothing, and does not quietly re-pair everything', () => {
    ensureDoorIdentity({ path, seal: fakeSeal(), names: NAMES });
    writeFileSync(
      path,
      `${JSON.stringify({ version: 1, sealed: 'bm90LWEtc2VhbA==' })}\n`,
      'utf8'
    );
    const before = sha256File(path);
    const out = ensureDoorIdentity({ path, seal: fakeSeal(), names: NAMES });
    expect(out).toEqual({
      kind: 'refused',
      reason: 'identity-unreadable',
      sentence: IDENTITY_SENTENCES['identity-unreadable']
    });
    expect(sha256File(path)).toBe(before);
  });

  it('writes nothing at all when the seal cannot be produced', () => {
    const out = ensureDoorIdentity({
      path,
      seal: fakeSeal({ seal: () => undefined }),
      names: NAMES
    });
    expect(out).toEqual({
      kind: 'refused',
      reason: 'seal-write-failed',
      sentence: IDENTITY_SENTENCES['seal-write-failed']
    });
    expect(() => statSync(path)).toThrow();
  });

  it('refuses when there is no name to put in the certificate', () => {
    const out = ensureDoorIdentity({
      path,
      seal: fakeSeal(),
      names: { addresses: [], dnsNames: [] }
    });
    expect(out).toEqual({
      kind: 'refused',
      reason: 'no-subject-names',
      sentence: IDENTITY_SENTENCES['no-subject-names']
    });
  });
});

describe('renewal', () => {
  it('re-issues from the SAME key near expiry, so a paired phone stays paired', () => {
    const born = Date.UTC(2026, 0, 1);
    const first = ensureDoorIdentity({
      path,
      seal: fakeSeal(),
      names: NAMES,
      now: born
    });
    if (first.kind !== 'ready') throw new Error('not ready');
    const later = first.identity.notAfter - 10 * MS_PER_DAY;
    const second = ensureDoorIdentity({
      path,
      seal: fakeSeal(),
      names: NAMES,
      now: later
    });
    if (second.kind !== 'ready') throw new Error('not ready');
    expect(second.renewed).toBe(true);
    expect(second.created).toBe(false);
    expect(second.identity.publicKeyFingerprint).toBe(
      first.identity.publicKeyFingerprint
    );
    expect(second.identity.certificateFingerprint).not.toBe(
      first.identity.certificateFingerprint
    );
    expect(second.identity.keyPem).toBe(first.identity.keyPem);
  });

  it('re-issues when the tailnet address changed, keeping the key', () => {
    const first = ensureDoorIdentity({ path, seal: fakeSeal(), names: NAMES });
    const second = ensureDoorIdentity({
      path,
      seal: fakeSeal(),
      names: { addresses: ['100.101.102.103'], dnsNames: [] }
    });
    if (first.kind !== 'ready' || second.kind !== 'ready') throw new Error('x');
    expect(second.renewed).toBe(true);
    expect(second.identity.subjectAltNames).toEqual(['100.101.102.103']);
    expect(second.identity.publicKeyFingerprint).toBe(
      first.identity.publicKeyFingerprint
    );
    expect(
      new X509Certificate(second.identity.certPem).subjectAltName
    ).toContain('IP Address:100.101.102.103');
  });

  it('is what a person asks for when they want a NEW identity', () => {
    const first = ensureDoorIdentity({ path, seal: fakeSeal(), names: NAMES });
    const next = regenerateDoorIdentity({ path, seal: fakeSeal(), names: NAMES });
    if (first.kind !== 'ready' || next.kind !== 'ready') throw new Error('x');
    expect(next.created).toBe(true);
    expect(next.identity.publicKeyFingerprint).not.toBe(
      first.identity.publicKeyFingerprint
    );
  });
});

function sha256File(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

// ---------------------------------------------------------------------------
// Phase 330: the phone's client certificate (build/p330/SPEC.md §4.7.4)
//
// THE INDEPENDENT CHECK IS AGAIN NODE'S OWN TLS STACK: OpenSSL parses the
// certificate, verifies its signature under the door's key, and a real TLS 1.3
// handshake on loopback completes with the phone PRESENTING it, while the
// server reads the peer's key back and hashes it the way the door does.
// ---------------------------------------------------------------------------

/** A phone's client key: P-256, uncompressed SPKI, base64url. */
function clientKey(): { spki: string; privatePem: string } {
  const pair = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return {
    spki: pair.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url'),
    privatePem: pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
  };
}

function pem(der: Buffer): string {
  const body = der.toString('base64').match(/.{1,64}/g) ?? [];
  return `-----BEGIN CERTIFICATE-----\n${body.join('\n')}\n-----END CERTIFICATE-----\n`;
}

describe('the client certificate the Mac issues a phone', () => {
  const NOW = Date.UTC(2026, 8, 29, 12, 0, 0);

  it('is parsed by Node, over the phone’s own key, signed by the door’s key', () => {
    const door = ensureDoorIdentity({ path, seal: fakeSeal(), names: NAMES });
    if (door.kind !== 'ready') throw new Error('not ready');
    const phone = clientKey();
    const der = issueClientCertificate(door.identity.keyPem, phone.spki, NOW);
    const x509 = new X509Certificate(der);
    expect(x509.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url')).toBe(phone.spki);
    expect(x509.verify(new X509Certificate(door.identity.certPem).publicKey)).toBe(true);
    expect(x509.verify(createPublicKey(clientKey().privatePem))).toBe(false);
    expect(x509.issuer).toBe('CN=Tortie');
    expect(x509.subject).toBe('CN=Tortie phone');
    expect(x509.ca).toBe(false);
    expect(x509.keyUsage).toEqual(['1.3.6.1.5.5.7.3.2']);
    expect(Date.parse(x509.validFrom)).toBe(Math.floor((NOW - 5 * 60 * 1000) / 1000) * 1000);
    expect(Date.parse(x509.validTo)).toBe(CLIENT_CERTIFICATE_NOT_AFTER);
    expect(x509.validTo).toContain('9999');
    // A positive 16-byte serial, fresh each time.
    expect(x509.serialNumber).toMatch(/^[0-7][0-9A-F]{31}$/);
    const again = new X509Certificate(issueClientCertificate(door.identity.keyPem, phone.spki, NOW));
    expect(again.serialNumber).not.toBe(x509.serialNumber);
  });

  it('carries its three extensions as DER Node itself reads: not a CA, digitalSignature, clientAuth', () => {
    const door = ensureDoorIdentity({ path, seal: fakeSeal(), names: NAMES });
    if (door.kind !== 'ready') throw new Error('not ready');
    const der = issueClientCertificate(door.identity.keyPem, clientKey().spki, NOW);
    const hex = der.toString('hex');
    // basicConstraints, critical, empty SEQUENCE (cA FALSE is the default).
    expect(hex).toContain('0603551d130101ff04023000');
    // keyUsage, critical, digitalSignature only.
    expect(hex).toContain('0603551d0f0101ff040403020780');
    // extKeyUsage, clientAuth, and not serverAuth.
    expect(hex).toContain('0603551d25040c300a06082b06010505070302');
    expect(hex).not.toContain('06082b06010505070301');
  });

  it('completes a real TLS 1.3 handshake as the client’s identity, and the server reads back the same key', async () => {
    const door = ensureDoorIdentity({ path, seal: fakeSeal(), names: NAMES });
    if (door.kind !== 'ready') throw new Error('not ready');
    const phone = clientKey();
    const certPem = pem(issueClientCertificate(door.identity.keyPem, phone.spki, Date.now()));
    let peerSpki: string | null = null;
    let peerAuthorized: boolean | null = null;
    const server = createServer(
      {
        key: door.identity.keyPem,
        cert: door.identity.certPem,
        minVersion: 'TLSv1.3',
        requestCert: true,
        rejectUnauthorized: false
      },
      (socket) => {
        const peer = socket.getPeerX509Certificate();
        peerSpki = peer?.publicKey.export({ type: 'spki', format: 'der' }).toString('base64url') ?? null;
        peerAuthorized = socket.authorized;
        socket.end('ok');
      }
    );
    try {
      const port = await new Promise<number>((resolve) => {
        server.listen(0, '127.0.0.1', () => resolve((server.address() as { port: number }).port));
      });
      const protocol = await new Promise<string | null>((resolve, reject) => {
        const socket = connect(
          {
            host: '127.0.0.1',
            port,
            servername: 'tortie.test',
            key: phone.privatePem,
            cert: certPem,
            ca: [door.identity.certPem],
            rejectUnauthorized: true,
            minVersion: 'TLSv1.3'
          },
          () => {
            const p = socket.getProtocol();
            socket.on('data', () => socket.end());
            socket.on('end', () => resolve(p));
          }
        );
        socket.on('error', reject);
      });
      expect(protocol).toBe('TLSv1.3');
      expect(peerSpki).toBe(phone.spki);
      // There is no CA to chain to: the pin, not OpenSSL, is the check.
      expect(peerAuthorized).toBe(false);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('is issued over the one spelling of a P-256 key and nothing else', () => {
    const door = ensureDoorIdentity({ path, seal: fakeSeal(), names: NAMES });
    if (door.kind !== 'ready') throw new Error('not ready');
    const ed = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'der' });
    const p384 = generateKeyPairSync('ec', { namedCurve: 'secp384r1' }).publicKey.export({
      type: 'spki',
      format: 'der'
    });
    const good = Buffer.from(clientKey().spki, 'base64url');
    const jwk = createPublicKey({ key: good, format: 'der', type: 'spki' }).export({ format: 'jwk' });
    const y = Buffer.from(String(jwk.y), 'base64url');
    const compressed = Buffer.concat([
      Buffer.from('3039301306072a8648ce3d020106082a8648ce3d030107032200', 'hex'),
      Buffer.from([((y[31] ?? 0) & 1) === 1 ? 3 : 2]),
      Buffer.from(String(jwk.x), 'base64url')
    ]);
    const offCurve = Buffer.from(good);
    offCurve[good.length - 1] = (offCurve[good.length - 1] ?? 0) ^ 1;
    // The X9.62 HYBRID form: the same 91 bytes and a point OpenSSL accepts,
    // but a second spelling of the key, so a second pin.
    const hybrid = Buffer.from(good);
    hybrid[26] = ((y[31] ?? 0) & 1) === 1 ? 0x07 : 0x06;
    expect(() => createPublicKey({ key: hybrid, format: 'der', type: 'spki' })).not.toThrow();
    // A trailing byte OpenSSL ignores, which would hash to another pin.
    const trailing = Buffer.concat([good, Buffer.from([0])]);
    expect(() => createPublicKey({ key: trailing, format: 'der', type: 'spki' })).not.toThrow();
    expect(isP256SpkiDer(good)).toBe(true);
    expect(good.subarray(0, 26).equals(P256_SPKI_HEADER)).toBe(true);
    for (const bad of [ed, p384, compressed, offCurve, hybrid, trailing, Buffer.alloc(0)]) {
      expect(isP256SpkiDer(bad)).toBe(false);
      expect(() => issueClientCertificate(door.identity.keyPem, bad.toString('base64url'), NOW)).toThrow();
    }
  });
});
