/**
 * The Apple push key, as a file a person picked (Phase 316.5, build/p3165/
 * SPEC.md §5.2.1): the name rule, the reads that refuse, and the one honest
 * key kept and read back through Phase 314's SHIPPING sealed store.
 *
 * EVERY KEY HERE IS A SCRATCH KEY made by `node:crypto` in this run and
 * written only under this file's own temporary directory, which is removed
 * after each test. No key of his is read, named or looked for.
 *
 * Which clause each test would catch if it were removed:
 *  - "refused BEFORE ANY OPEN" fails if the name check moves after the open,
 *    because `node:fs/promises` `open` is counted and must read zero;
 *  - "a directory named like a key" fails if the `fstat` on the descriptor
 *    stops asking `isFile()`;
 *  - "a FIFO named like a key answers at once" fails if `O_NONBLOCK` is taken
 *    off the open (the read would wait for a writer that never comes, and the
 *    test times out) or if `isFile()` is not asked;
 *  - "4,097 bytes" fails if the size bound is dropped or moved past the read;
 *  - "keep's own refusals" fail if the answer stops going through
 *    `apnsKeyStore.keep`, whose check is the one place a P-256 key is judged;
 *  - "the honest key" fails if the key id stops coming from the name, or the
 *    team or the topic stop being the phone app's compiled facts.
 */

import { spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const opens = vi.hoisted(() => ({ count: 0 }));

vi.mock('node:fs/promises', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...real,
    open: (...args: Parameters<typeof real.open>) => {
      opens.count += 1;
      return real.open(...args);
    }
  };
});

const { apnsKeyStore } = await import('../../credentials/apns-key');
const { testSeal } = await import('../../credentials/__tests__/test-seal');
const {
  KEY_FILE_MAX_BYTES,
  KEY_FILE_TOO_LARGE,
  KEY_FILE_UNREADABLE,
  KEY_NAME_REFUSED,
  KEY_PICK_MESSAGE,
  PHONE_APP_TEAM,
  PHONE_APP_TOPIC,
  keyIdOfFileName,
  readKeyFile
} = await import('../key-file');

let root = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'p3165-key-file-'));
  opens.count = 0;
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function scratchPem(kind: 'p256' | 'p384' | 'rsa'): string {
  const pair =
    kind === 'rsa'
      ? generateKeyPairSync('rsa', { modulusLength: 2048 })
      : generateKeyPairSync('ec', { namedCurve: kind === 'p256' ? 'prime256v1' : 'secp384r1' });
  return pair.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
}

function write(name: string, text: string | Buffer): string {
  const path = join(root, name);
  writeFileSync(path, text, { mode: 0o600 });
  return path;
}

describe('the name, before anything is opened', () => {
  it('reads Apple’s key id from AuthKey_ then ten capital letters or digits, on the basename', () => {
    expect(keyIdOfFileName('AuthKey_6782V6SJJ7.p8')).toBe('6782V6SJJ7');
    expect(keyIdOfFileName('/Users/someone/Downloads/AuthKey_ABCDE12345.p8')).toBe('ABCDE12345');
    expect(keyIdOfFileName('AuthKey_0000000000.p8')).toBe('0000000000');
  });

  it('refuses every other spelling', () => {
    for (const name of [
      'AuthKey_6782v6sjj7.p8', // lowercase
      'AuthKey_6782V6SJJ.p8', // nine
      'AuthKey_6782V6SJJ77.p8', // eleven
      '6782V6SJJ7.p8', // no prefix
      'authkey_6782V6SJJ7.p8',
      'AuthKey_6782V6SJJ7.p8.txt',
      'AuthKey_6782V6SJJ7.pem',
      'AuthKey_6782V6SJJ7',
      'AuthKey_6782V6SJ-7.p8',
      '/tmp/AuthKey_6782V6SJJ7.p8/other.p8',
      ''
    ]) {
      expect(keyIdOfFileName(name), name).toBeNull();
    }
  });

  it('is refused BEFORE ANY OPEN, with the one sentence, and never a value', async () => {
    // A misnamed file that exists and holds an honest key: the name alone refuses it.
    const path = write('AuthKey_6782v6sjj7.p8', scratchPem('p256'));
    for (const p of [path, join(root, 'AuthKey_NINE12345.p8'), join(root, 'key.p8'), join(root, 'nowhere', 'x')]) {
      expect(await readKeyFile(p)).toEqual({ ok: false, refusal: KEY_NAME_REFUSED });
    }
    expect(opens.count).toBe(0);
    expect(KEY_NAME_REFUSED).not.toContain(root);
  });
});

describe('what the descriptor is', () => {
  it('an absent file is unreadable', async () => {
    expect(await readKeyFile(join(root, 'AuthKey_ABCDE12345.p8'))).toEqual({ ok: false, refusal: KEY_FILE_UNREADABLE });
  });

  it('a directory named like a key is unreadable', async () => {
    const path = join(root, 'AuthKey_ABCDE12345.p8');
    mkdirSync(path);
    expect(await readKeyFile(path)).toEqual({ ok: false, refusal: KEY_FILE_UNREADABLE });
    expect(opens.count).toBe(1);
  });

  it('a FIFO named like a key answers at once, unreadable, with no writer ever coming', async () => {
    const path = join(root, 'AuthKey_FIFO012345.p8');
    const made = spawnSync('/usr/bin/mkfifo', [path], { timeout: 5_000 });
    expect(made.status).toBe(0);
    const started = Date.now();
    expect(await readKeyFile(path)).toEqual({ ok: false, refusal: KEY_FILE_UNREADABLE });
    expect(Date.now() - started).toBeLessThan(2_000);
  }, 5_000);

  it('4,097 bytes is too large; 4,096 is read', async () => {
    expect(KEY_FILE_MAX_BYTES).toBe(4_096);
    const over = write('AuthKey_LARGE12345.p8', Buffer.alloc(KEY_FILE_MAX_BYTES + 1, 0x41));
    expect(await readKeyFile(over)).toEqual({ ok: false, refusal: KEY_FILE_TOO_LARGE });
    const at = write('AuthKey_EXACT12345.p8', Buffer.alloc(KEY_FILE_MAX_BYTES, 0x41));
    const read = await readKeyFile(at);
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.key.p8).toHaveLength(KEY_FILE_MAX_BYTES);
  });

  it('says its words exactly as the SPEC pins them, each ending that nothing was changed', () => {
    expect(KEY_PICK_MESSAGE).toBe('Choose the Apple push key for Tortie’s iPhone app');
    expect(KEY_NAME_REFUSED).toBe(
      'Tortie reads the key id from the file’s name, AuthKey_ then ten letters or digits. Choose the file Apple gave you. Nothing was changed.'
    );
    expect(KEY_FILE_UNREADABLE).toBe('Tortie could not read that file. Nothing was changed.');
    expect(KEY_FILE_TOO_LARGE).toBe('That file is too large to be an Apple push key. Nothing was changed.');
  });
});

describe('through Phase 314’s sealed store', () => {
  it('an RSA key, a P-384 key and text are each refused by keep’s own sentence, and nothing is kept', async () => {
    const store = apnsKeyStore(join(root, 'push'), testSeal());
    for (const [name, text] of [
      ['AuthKey_RSA0000000.p8', scratchPem('rsa')],
      ['AuthKey_P384000000.p8', scratchPem('p384')],
      ['AuthKey_TEXT000000.p8', 'this is not a key\n']
    ] as const) {
      const read = await readKeyFile(write(name, text));
      expect(read.ok, name).toBe(true);
      if (!read.ok) continue;
      const kept = await store.keep(read.key);
      expect(kept.ok, name).toBe(false);
      if (!kept.ok) {
        expect(kept.reason).toMatch(/^The Apple push key was not kept, because its key is not a P-256 private key/);
        expect(kept.field).toBe('p8');
      }
    }
    expect(await store.read()).toBeNull();
  });

  it('the honest scratch key is kept under the name’s id and the phone app’s compiled team and topic, and reads back', async () => {
    const pem = scratchPem('p256');
    const read = await readKeyFile(write('AuthKey_P3165SCRAT.p8', pem));
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.key).toEqual({ keyId: 'P3165SCRAT', teamId: PHONE_APP_TEAM, topic: PHONE_APP_TOPIC, p8: pem });
    expect(PHONE_APP_TOPIC).toBe('com.itavero.tortie.phone');
    expect(PHONE_APP_TEAM).toBe('4GRQMF5T5U');
    const store = apnsKeyStore(join(root, 'push'), testSeal());
    expect(await store.keep(read.key)).toEqual({ ok: true });
    const back = await store.read();
    expect(back?.keyId).toBe('P3165SCRAT');
    expect(back?.teamId).toBe(PHONE_APP_TEAM);
    expect(back?.topic).toBe(PHONE_APP_TOPIC);
    expect(back?.p8.trim()).toBe(pem.trim());
  });
});
