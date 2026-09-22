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

import { X509Certificate, createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { connect, createServer } from 'node:tls';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  CERTIFICATE_DAYS,
  IDENTITY_SENTENCES,
  POCKET_TLS_SEAL_PREFIX,
  ensureDoorIdentity,
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
