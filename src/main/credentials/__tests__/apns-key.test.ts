/**
 * Phase 314. The Apple push provider key is kept in one sealed slot, checked
 * on the way in and on the way out, and never in the clear.
 *
 * Every test runs the SHIPPING `apnsKeyStore` over the test seal on real files
 * in a scratch directory it makes and removes. Every key here is GENERATED IN
 * THIS FILE with `node:crypto` and is worth nothing after the run: no real
 * Apple key exists anywhere in this phase, and no key byte is printed. Keys
 * are compared by sha256, never as text in an assertion message.
 *
 * WHICH CLAUSE EACH TEST WOULD FAIL WITHOUT, said so a later round can tell a
 * pin from decoration:
 *
 *  - "the file is sealed" fails if the seal handed to `sealedVault` is dropped
 *    (the file then IS the record, `-----BEGIN` and all).
 *  - "a plaintext key planted at the slot" fails if `read` stops going through
 *    `backend.get` and parses the file itself, which is the same-uid attacker's
 *    shape: a file he wrote is not a key Tortie kept.
 *  - "a seal that cannot be made" fails if the write stops going through the
 *    one write (`safeSwap`), whose stage catch is the sentence asserted.
 *  - each refusal fails if its field's check is taken out of
 *    `checkApnsProviderKey`, because the record would then be kept.
 *  - "an invalid record read back" fails if `read` stops re-checking.
 */

import { createHash, generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  APNS_KEY_SLOT,
  APNS_TOPIC_MAX_BYTES,
  apnsKeyStore,
  checkApnsProviderKey,
  type ApnsProviderKey
} from '../apns-key';
import { NO_TEST_SEAL, testSeal } from './test-seal';

const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

/** A scratch P-256 key, PKCS#8 PEM. Made here, worth nothing after the run. */
function scratchP8(): string {
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  return privateKey.export({ format: 'pem', type: 'pkcs8' }) as string;
}

function record(over: Partial<ApnsProviderKey> = {}): ApnsProviderKey {
  return {
    keyId: 'ABCDE12345',
    teamId: 'TEAM987654',
    topic: 'software.itavero.tortie.phone',
    p8: scratchP8(),
    ...over
  };
}

/** The PEM's base64 body, with its armour and line ends gone. */
function bodyOf(pem: string): string {
  return pem
    .split('\n')
    .filter((l) => l.length > 0 && !l.startsWith('-----'))
    .join('');
}

let root = '';
let dir = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'p314-apns-key-'));
  dir = join(root, 'push');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

const slotFile = (): string => join(dir, `${APNS_KEY_SLOT}.cred`);
const stagedFile = (): string => join(dir, `${APNS_KEY_SLOT}.pending.cred`);

describe('the key round trips through the sealed slot', () => {
  it('keeps and reads back the same record, by sha256', async () => {
    const store = apnsKeyStore(dir, testSeal());
    const key = record();
    expect(await store.keep(key)).toEqual({ ok: true });
    const back = await store.read();
    expect(back).not.toBeNull();
    expect(sha256(JSON.stringify(back))).toBe(sha256(JSON.stringify(key)));
  });

  it('writes one sealed file, 0600 in a 0700 directory, and leaves nothing staged', async () => {
    const store = apnsKeyStore(dir, testSeal());
    const key = record();
    await store.keep(key);
    expect(existsSync(slotFile())).toBe(true);
    expect(existsSync(stagedFile())).toBe(false);
    expect(statSync(slotFile()).mode & 0o777).toBe(0o600);
    expect(statSync(dir).mode & 0o777).toBe(0o700);
  });

  it('is sealed: the file is not the record and holds no window of the key', async () => {
    const store = apnsKeyStore(dir, testSeal());
    const key = record();
    await store.keep(key);
    const file = readFileSync(slotFile(), 'utf8');
    const payload = JSON.stringify({ v: 1, ...key });
    expect(sha256(file)).not.toBe(sha256(payload));
    expect(file.includes('-----BEGIN')).toBe(false);
    const body = bodyOf(key.p8);
    expect(body.length).toBeGreaterThan(128);
    for (const at of [0, Math.floor(body.length / 2) - 32, body.length - 64]) {
      expect(file.includes(body.slice(at, at + 64))).toBe(false);
    }
  });

  it('stores the key re-exported, so a CRLF file reads back as the one canonical spelling', async () => {
    const store = apnsKeyStore(dir, testSeal());
    const key = record();
    const crlf = `${key.p8.replace(/\n/g, '\r\n')}  \r\n`;
    expect(await store.keep({ ...key, p8: crlf })).toEqual({ ok: true });
    const back = await store.read();
    expect(back?.p8).toBe(key.p8);
  });

  it('replaces the old key with the new one, whole', async () => {
    const store = apnsKeyStore(dir, testSeal());
    await store.keep(record());
    const second = record({ keyId: 'ZZZZZ99999' });
    await store.keep(second);
    const back = await store.read();
    expect(back?.keyId).toBe('ZZZZZ99999');
    expect(sha256(back?.p8 ?? '')).toBe(sha256(second.p8));
  });

  it('forgets: the slot is gone and read answers null', async () => {
    const store = apnsKeyStore(dir, testSeal());
    await store.keep(record());
    await store.forget();
    expect(existsSync(slotFile())).toBe(false);
    expect(await store.read()).toBeNull();
  });
});

describe('the seal is the whole of the protection', () => {
  it('a seal that cannot be made keeps NOTHING and says the one write’s own sentence', async () => {
    const store = apnsKeyStore(dir, NO_TEST_SEAL);
    const answer = await store.keep(record());
    expect(answer).toEqual({
      ok: false,
      reason: 'Nothing could be written, so nothing changed.',
      field: null
    });
    expect(existsSync(slotFile())).toBe(false);
    expect(existsSync(stagedFile())).toBe(false);
  });

  it('a seal that cannot OPEN reads null, and never throws', async () => {
    const seal = testSeal();
    await apnsKeyStore(dir, seal).keep(record());
    seal.refuseOpens = 10;
    await expect(apnsKeyStore(dir, seal).read()).resolves.toBeNull();
  });

  it('a plaintext key planted at the slot reads null: the seal refuses a blob it did not write', async () => {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeFileSync(slotFile(), JSON.stringify({ v: 1, ...record() }), { mode: 0o600 });
    expect(await apnsKeyStore(dir, testSeal()).read()).toBeNull();
  });

  it('a sealed blob that is not JSON reads null', async () => {
    const seal = testSeal();
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeFileSync(slotFile(), seal.wrap('not json at all') ?? '', { mode: 0o600 });
    expect(await apnsKeyStore(dir, seal).read()).toBeNull();
  });

  it('an absent slot reads null', async () => {
    expect(await apnsKeyStore(dir, testSeal()).read()).toBeNull();
  });
});

describe('a record is refused WHOLE with the field named', () => {
  const cases: [string, () => Partial<ApnsProviderKey>, string][] = [
    ['a lowercase key id', () => ({ keyId: 'abcde12345' }), 'keyId'],
    ['a nine character key id', () => ({ keyId: 'ABCDE1234' }), 'keyId'],
    ['an eleven character key id', () => ({ keyId: 'ABCDE123456' }), 'keyId'],
    ['a team id with a hyphen', () => ({ teamId: 'TEAM-98765' }), 'teamId'],
    ['an empty team id', () => ({ teamId: '' }), 'teamId'],
    ['a topic with no dot', () => ({ topic: 'tortie' }), 'topic'],
    ['a topic with a space', () => ({ topic: 'software.itavero.tortie phone' }), 'topic'],
    ['a topic with a trailing dot', () => ({ topic: 'software.itavero.' }), 'topic'],
    [
      'a topic one byte over the ceiling',
      () => ({ topic: `a.${'b'.repeat(APNS_TOPIC_MAX_BYTES - 1)}` }),
      'topic'
    ],
    [
      'a P-384 key',
      () => ({
        p8: generateKeyPairSync('ec', { namedCurve: 'secp384r1' }).privateKey.export({
          format: 'pem',
          type: 'pkcs8'
        }) as string
      }),
      'p8'
    ],
    [
      'an Ed25519 key',
      () => ({
        p8: generateKeyPairSync('ed25519').privateKey.export({
          format: 'pem',
          type: 'pkcs8'
        }) as string
      }),
      'p8'
    ],
    [
      'a P-256 key written as SEC1 rather than PKCS#8',
      () => ({
        p8: generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).privateKey.export({
          format: 'pem',
          type: 'sec1'
        }) as string
      }),
      'p8'
    ],
    [
      'the PUBLIC half of a P-256 key',
      () => ({
        p8: generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).publicKey.export({
          format: 'pem',
          type: 'spki'
        }) as string
      }),
      'p8'
    ],
    ['a key that is not a key', () => ({ p8: '-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----\n' }), 'p8']
  ];

  for (const [name, over, field] of cases) {
    it(`${name}: refused as ${field}, and nothing is written`, async () => {
      const store = apnsKeyStore(dir, testSeal());
      const answer = await store.keep(record(over()));
      expect(answer.ok).toBe(false);
      if (answer.ok) return;
      expect(answer.field).toBe(field);
      expect(answer.reason.length).toBeGreaterThan(0);
      expect(existsSync(slotFile())).toBe(false);
    });
  }

  it('keeps a topic exactly at the ceiling', async () => {
    const topic = `a.${'b'.repeat(APNS_TOPIC_MAX_BYTES - 2)}`;
    expect(Buffer.byteLength(topic)).toBe(APNS_TOPIC_MAX_BYTES);
    expect(await apnsKeyStore(dir, testSeal()).keep(record({ topic }))).toEqual({ ok: true });
  });

  it('a refused record leaves the key already kept exactly as it was', async () => {
    const store = apnsKeyStore(dir, testSeal());
    const good = record();
    await store.keep(good);
    await store.keep(record({ teamId: 'nope' }));
    expect(sha256(JSON.stringify(await store.read()))).toBe(sha256(JSON.stringify(good)));
  });

  it('an invalid record read back from the slot answers null, whole', async () => {
    const seal = testSeal();
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    writeFileSync(
      slotFile(),
      seal.wrap(JSON.stringify({ v: 1, ...record(), keyId: 'lowercase1' })) ?? '',
      { mode: 0o600 }
    );
    expect(await apnsKeyStore(dir, seal).read()).toBeNull();
    // And a record of a version this build does not know.
    writeFileSync(slotFile(), seal.wrap(JSON.stringify({ v: 2, ...record() })) ?? '', {
      mode: 0o600
    });
    expect(await apnsKeyStore(dir, seal).read()).toBeNull();
  });

  it('checks a value that is not an object at all', () => {
    expect(checkApnsProviderKey(null).ok).toBe(false);
    expect(checkApnsProviderKey('ABCDE12345').ok).toBe(false);
  });
});
