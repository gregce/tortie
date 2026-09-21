/**
 * Phase 304. Tortie's own vault is a sealed file, not a keychain item, and a
 * sign in of any size is kept.
 *
 * Every test here runs the SHIPPING `sealedVault` through the SHIPPING
 * `vaultPut` and `vaultGet`, over the test seal and a legacy vault in a map,
 * on real files inside a scratch directory each test makes and removes. No
 * keychain is opened, no process is spawned, and no Electron is needed: the
 * seal is an argument, which is the whole point of the seam.
 *
 * THE FOUR THINGS THIS FILE PINS, each red at the parent, where the vault on
 * macOS was a keychain item on one `security` line:
 *
 *  1. THE SIZE. 4,193 bytes (his `~/.codex/auth.json`), 64 KB and 1 MB round
 *     trip byte for byte, compared by sha256 and never by content; the file's
 *     bytes are never the payload; a `get` follows no link.
 *  2. THE SEAL. A seal that cannot be made keeps NOTHING and answers the one
 *     write's own sentence, never a plaintext file.
 *  3. THE READ-THROUGH, step by step. A miss asks the legacy item; a hit
 *     asks nothing; the file is written, read back, and only then is the
 *     item deleted; every row of the crash table leaves at least one copy.
 *  4. THE DELETE. `del` of a staged name asks the legacy arm nothing, so the
 *     one write's `finally` discard spawns nothing; `del` of a slot asks it
 *     once, so a removed login clears an older build's item.
 *
 * NO TOKEN BYTE IS PRINTED, LOGGED OR COMPARED AS TEXT: every large payload is
 * compared by sha256 and length, and the payloads are random hex made here.
 */

import { createHash, randomBytes } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  NO_LEGACY,
  sealedVault,
  slotFor,
  stagedSlotFor,
  vaultDel,
  vaultDiscardStaged,
  vaultGet,
  vaultPut,
  type VaultBackend
} from '../vault';
import { NO_TEST_SEAL, recordingLegacy, testSeal, TEST_SEAL_MARK, type TestSeal } from './test-seal';

const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

/** A payload of exactly `bytes` bytes of random hex: a credential shape is not needed below `vaultPut`. */
function payloadOf(bytes: number): string {
  const text = randomBytes(Math.ceil(bytes / 2)).toString('hex').slice(0, bytes);
  expect(Buffer.byteLength(text, 'utf8')).toBe(bytes);
  return text;
}

/** Does `haystack` contain any 64-byte window of `needle`? Compared without printing either. */
function holdsAWindowOf(haystack: string, needle: string): boolean {
  for (let at = 0; at + 64 <= needle.length; at += 64) {
    if (haystack.includes(needle.slice(at, at + 64))) return true;
  }
  return false;
}

let dir = '';
let seal: TestSeal;
beforeEach(() => {
  dir = join(mkdtempSync(join(tmpdir(), 'p304-vault-')), 'kept');
  seal = testSeal();
});
afterEach(() => {
  rmSync(join(dir, '..'), { recursive: true, force: true });
});

const SLOT = slotFor('codex', 'a'.repeat(16));
const DEFAULT = slotFor('claude', null);
const fileOf = (slot: string): string => join(dir, `${slot}.cred`);

describe('Phase 304: a sign in of any size round trips through the shipping vault', () => {
  it('keeps 4,193 bytes, 64 KB and 1 MB byte for byte, by sha256', async () => {
    const vault = sealedVault(dir, seal, NO_LEGACY);
    for (const bytes of [4_193, 65_536, 1_048_576]) {
      const payload = payloadOf(bytes);
      expect(await vaultPut(vault, SLOT, payload)).toEqual({ ok: true });
      const back = await vaultGet(vault, SLOT);
      expect(back).not.toBeNull();
      expect(Buffer.byteLength(back ?? '', 'utf8')).toBe(bytes);
      expect(sha256(back ?? '')).toBe(sha256(payload));
      // THE FILE IS NOT THE PAYLOAD: what is on disk is what the seal answered.
      const onDisk = readFileSync(fileOf(SLOT), 'utf8');
      expect(sha256(onDisk)).not.toBe(sha256(payload));
      expect(onDisk.startsWith(TEST_SEAL_MARK)).toBe(true);
      expect(holdsAWindowOf(onDisk, payload)).toBe(false);
    }
  });

  it('writes the file with mode 0600 in a directory with mode 0700, and leaves no staged file', async () => {
    const vault = sealedVault(dir, seal, NO_LEGACY);
    expect(await vaultPut(vault, SLOT, payloadOf(4_193))).toEqual({ ok: true });
    expect(statSync(fileOf(SLOT)).mode & 0o777).toBe(0o600);
    expect(statSync(dir).mode & 0o777).toBe(0o700);
    expect(readdirSync(dir).sort()).toEqual([`${SLOT}.cred`]);
  });

  it('the parent measurement: 1,946 bytes was the most one security line could carry, and the vault has no such number', async () => {
    // The keychain arm's stage line for a codex login slot was 106 bytes of
    // overhead plus two hex characters per byte against a 4,000 byte cap, so
    // 1,947 bytes was refused there. Here the two sides of that edge are the
    // same case.
    const vault = sealedVault(dir, seal, NO_LEGACY);
    for (const bytes of [1_946, 1_947, 2_100]) {
      const payload = payloadOf(bytes);
      expect(await vaultPut(vault, SLOT, payload)).toEqual({ ok: true });
      expect(sha256((await vaultGet(vault, SLOT)) ?? '')).toBe(sha256(payload));
    }
  });

  it('a get follows no link: a link planted at a slot name reads as absent, and a put replaces it with a file', async () => {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    const victim = join(dir, '..', 'victim.json');
    const secret = payloadOf(200);
    writeFileSync(victim, seal.wrap(secret) ?? '', { mode: 0o600 });
    symlinkSync(victim, fileOf(SLOT));
    const vault = sealedVault(dir, seal, NO_LEGACY);
    expect(await vaultGet(vault, SLOT)).toBeNull();
    // And a link planted at the STAGED name is unlinked rather than followed.
    symlinkSync(victim, `${fileOf(SLOT)}.writing`);
    const payload = payloadOf(4_193);
    expect(await vaultPut(vault, SLOT, payload)).toEqual({ ok: true });
    expect(lstatSync(fileOf(SLOT)).isSymbolicLink()).toBe(false);
    expect(sha256((await vaultGet(vault, SLOT)) ?? '')).toBe(sha256(payload));
    expect(sha256(readFileSync(victim, 'utf8'))).toBe(sha256(seal.wrap(secret) ?? ''));
  });
});

describe('Phase 304: a seal that cannot be made keeps nothing', () => {
  it('answers the one write own sentence, writes no file, and never a plaintext one', async () => {
    const vault = sealedVault(dir, NO_TEST_SEAL, NO_LEGACY);
    const payload = payloadOf(4_193);
    expect(await vaultPut(vault, SLOT, payload)).toEqual({
      ok: false,
      reason: 'Nothing could be written, so nothing changed.'
    });
    expect(existsSync(fileOf(SLOT))).toBe(false);
    expect(existsSync(fileOf(stagedSlotFor(SLOT)))).toBe(false);
    expect(await vaultGet(vault, SLOT)).toBeNull();
  });

  it('a seal that comes back keeps the next put, and a file it cannot open reads as a miss rather than as bytes', async () => {
    const vault = sealedVault(dir, seal, NO_LEGACY);
    const payload = payloadOf(4_193);
    seal.refuseWraps = 1;
    expect(await vaultPut(vault, SLOT, payload)).toEqual({
      ok: false,
      reason: 'Nothing could be written, so nothing changed.'
    });
    expect(await vaultPut(vault, SLOT, payload)).toEqual({ ok: true });
    // A file sealed under somebody else's key: the seal will not open it.
    const foreign = sealedVault(dir, NO_TEST_SEAL, NO_LEGACY);
    expect(await vaultGet(foreign, SLOT)).toBeNull();
    // And garbage at the slot's name is a miss too, never an answer.
    writeFileSync(fileOf(SLOT), 'not a sealed blob', { mode: 0o600 });
    expect(await vaultGet(vault, SLOT)).toBeNull();
  });

  it('the vault names no security verb and composes no -i line on any path', async () => {
    const source = readFileSync(join(__dirname, '..', 'vault.ts'), 'utf8');
    expect(source).not.toContain('keychainWrite');
    expect(source).not.toContain("'-i'");
    expect(source).not.toContain('add-generic-password');
  });
});

describe('Phase 304: the read-through, step by step', () => {
  const payload = 'legacy-item-bytes-' + 'x'.repeat(100);

  it('a miss asks the legacy item, writes the file, reads it back, and only then deletes the item', async () => {
    const legacy = recordingLegacy({ [SLOT]: payload });
    const vault = sealedVault(dir, seal, legacy);
    expect(await vaultGet(vault, SLOT)).toBe(payload);
    expect(legacy.gets).toEqual([SLOT]);
    expect(legacy.dels).toEqual([SLOT]);
    expect(legacy.items.size).toBe(0);
    // THE ORDER: one wrap for the write, then ONE open for the read-back (an
    // absent file is never opened), and the delete came after both.
    expect(seal.wraps).toBe(1);
    expect(seal.opens).toBe(1);
    expect(seal.open(readFileSync(fileOf(SLOT), 'utf8'))).toBe(payload);
  });

  it('a hit asks the legacy arm nothing', async () => {
    const legacy = recordingLegacy({ [SLOT]: 'never-read' });
    const vault = sealedVault(dir, seal, legacy);
    expect(await vaultPut(vault, SLOT, payload)).toEqual({ ok: true });
    expect(await vaultGet(vault, SLOT)).toBe(payload);
    expect(legacy.gets).toEqual([]);
    expect(legacy.dels).toEqual([]);
    expect(legacy.items.get(SLOT)).toBe('never-read');
  });

  it('a miss with nothing in the legacy arm answers null and writes nothing', async () => {
    const legacy = recordingLegacy();
    const vault = sealedVault(dir, seal, legacy);
    expect(await vaultGet(vault, SLOT)).toBeNull();
    expect(legacy.gets).toEqual([SLOT]);
    expect(legacy.dels).toEqual([]);
    expect(existsSync(dir)).toBe(false);
  });

  it('a legacy arm that throws is a miss, and nothing is deleted', async () => {
    const legacy = recordingLegacy({ [SLOT]: payload });
    legacy.throwOnGet = true;
    const vault = sealedVault(dir, seal, legacy);
    expect(await vaultGet(vault, SLOT)).toBeNull();
    expect(legacy.dels).toEqual([]);
    expect(legacy.items.get(SLOT)).toBe(payload);
  });

  it('no seal during the read-through: the answer is the legacy bytes, no file, no delete', async () => {
    const legacy = recordingLegacy({ [SLOT]: payload });
    const vault = sealedVault(dir, NO_TEST_SEAL, legacy);
    expect(await vaultGet(vault, SLOT)).toBe(payload);
    expect(existsSync(fileOf(SLOT))).toBe(false);
    expect(legacy.dels).toEqual([]);
    expect(legacy.items.get(SLOT)).toBe(payload);
    // And once the seal is back the next get reads through again and finishes.
    const later = sealedVault(dir, seal, legacy);
    expect(await later.get(SLOT)).toBe(payload);
    expect(legacy.items.size).toBe(0);
    expect(seal.open(readFileSync(fileOf(SLOT), 'utf8'))).toBe(payload);
  });

  it('a read-back that disagrees leaves the item: the answer is the legacy bytes and nothing is deleted', async () => {
    const legacy = recordingLegacy({ [SLOT]: payload });
    const vault = sealedVault(dir, seal, legacy);
    // The write's wrap goes through; the read-back's open is refused.
    seal.refuseOpens = 1;
    expect(await vaultGet(vault, SLOT)).toBe(payload);
    expect(legacy.dels).toEqual([]);
    expect(legacy.items.get(SLOT)).toBe(payload);
    // Two copies: the item, and the file the next get reads as a hit.
    expect(seal.open(readFileSync(fileOf(SLOT), 'utf8'))).toBe(payload);
    expect(await vaultGet(vault, SLOT)).toBe(payload);
    expect(legacy.gets).toEqual([SLOT]);
  });

  it('a delete the legacy arm refuses leaves both copies, and the next get is a hit that asks nothing', async () => {
    const legacy = recordingLegacy({ [SLOT]: payload });
    legacy.refuseDel.add(SLOT);
    const vault = sealedVault(dir, seal, legacy);
    expect(await vaultGet(vault, SLOT)).toBe(payload);
    expect(legacy.dels).toEqual([SLOT]);
    expect(legacy.items.get(SLOT)).toBe(payload);
    expect(await vaultGet(vault, SLOT)).toBe(payload);
    expect(legacy.gets).toEqual([SLOT]);
  });

  it('a delete that throws is caught, and the answer is still the legacy bytes', async () => {
    const legacy = recordingLegacy({ [SLOT]: payload });
    const vault = sealedVault(dir, seal, {
      get: legacy.get,
      del: async () => {
        throw new Error('the keychain could not be asked');
      }
    });
    expect(await vaultGet(vault, SLOT)).toBe(payload);
    expect(await vaultGet(vault, SLOT)).toBe(payload);
  });

  /**
   * THE CRASH TABLE of `build/p304/SPEC.md` §3.5, one row per kill, driven by
   * planting what each kill leaves and asking the next `get`. Every row answers
   * the payload and ends with the file holding it. A kill BEFORE the file
   * exists leaves the item, and the next get reads through again and finishes
   * the move; a kill AFTER the rename leaves the item AND the file, the next
   * get is a hit that asks the keychain nothing, and the item is the duplicate
   * `../migrate.ts`'s boot pass sweeps, which `./p208-migrate.test.ts` drives.
   */
  it('every row of the crash table leaves at least one copy, and the next get finishes or leaves the duplicate for the sweep', async () => {
    const rows: { name: string; plant: () => void; itemsLeft: number }[] = [
      { name: 'before the sealed write', plant: () => undefined, itemsLeft: 0 },
      {
        name: 'mid .writing, a partial staged file',
        plant: () => {
          mkdirSync(dir, { recursive: true, mode: 0o700 });
          writeFileSync(`${fileOf(SLOT)}.writing`, 'half of a sealed', { mode: 0o600 });
        },
        itemsLeft: 0
      },
      {
        name: 'after the rename, before the read-back',
        plant: () => {
          mkdirSync(dir, { recursive: true, mode: 0o700 });
          writeFileSync(fileOf(SLOT), seal.wrap(payload) ?? '', { mode: 0o600 });
        },
        itemsLeft: 1
      },
      {
        name: 'after the read-back, before the delete',
        plant: () => {
          mkdirSync(dir, { recursive: true, mode: 0o700 });
          writeFileSync(fileOf(SLOT), seal.wrap(payload) ?? '', { mode: 0o600 });
        },
        itemsLeft: 1
      }
    ];
    for (const row of rows) {
      rmSync(dir, { recursive: true, force: true });
      const legacy = recordingLegacy({ [SLOT]: payload });
      row.plant();
      const vault = sealedVault(dir, seal, legacy);
      expect(await vaultGet(vault, SLOT), row.name).toBe(payload);
      expect(legacy.items.size, row.name).toBe(row.itemsLeft);
      expect(seal.open(readFileSync(fileOf(SLOT), 'utf8')), row.name).toBe(payload);
      expect(existsSync(`${fileOf(SLOT)}.writing`), row.name).toBe(false);
      // Never zero copies: the file holds it now, and the item too when the
      // kill fell after the rename.
      expect(legacy.gets, row.name).toEqual(row.itemsLeft === 0 ? [SLOT] : []);
    }
  });

  it('after the delete, the file alone answers and the legacy arm is never asked again', async () => {
    const legacy = recordingLegacy({ [SLOT]: payload });
    const vault = sealedVault(dir, seal, legacy);
    expect(await vaultGet(vault, SLOT)).toBe(payload);
    const fresh = recordingLegacy();
    const again = sealedVault(dir, seal, fresh);
    expect(await vaultGet(again, SLOT)).toBe(payload);
    expect(fresh.gets).toEqual([]);
  });
});

describe('Phase 304: the delete', () => {
  it('del of a staged name touches the file alone, so the one write discards nothing through the keychain', async () => {
    const legacy = recordingLegacy();
    const vault = sealedVault(dir, seal, legacy);
    expect(await vaultPut(vault, SLOT, 'kept-bytes')).toEqual({ ok: true });
    // `safeSwap`'s own `finally` discarded the staged place: the file went, and
    // the legacy arm was never asked to delete anything.
    expect(existsSync(fileOf(stagedSlotFor(SLOT)))).toBe(false);
    expect(legacy.dels).toEqual([]);
    // The staged get on the way (readStaged) hit the file and asked nothing.
    expect(legacy.gets).toEqual([]);
  });

  it('del of a slot removes the file and asks the legacy arm once, so a removed login clears an older build item', async () => {
    const legacy = recordingLegacy({ [SLOT]: 'older-build-item' });
    const vault = sealedVault(dir, seal, legacy);
    expect(await vaultPut(vault, SLOT, 'kept-bytes')).toEqual({ ok: true });
    await vaultDel(vault, SLOT);
    expect(existsSync(fileOf(SLOT))).toBe(false);
    expect(legacy.dels).toEqual([SLOT]);
    expect(legacy.items.size).toBe(0);
  });

  it('the staged sweep reads before it deletes, and asks the legacy arm for the staged name only on a miss', async () => {
    const legacy = recordingLegacy({ [stagedSlotFor(DEFAULT)]: 'a-pre-304-staged-leftover' });
    const vault = sealedVault(dir, seal, legacy);
    await vaultDiscardStaged(vault, DEFAULT);
    // The leftover was read through into the staged file and then removed with
    // it, so it is gone from both places and nothing else was touched.
    expect(legacy.gets).toEqual([stagedSlotFor(DEFAULT)]);
    expect(legacy.dels).toEqual([stagedSlotFor(DEFAULT)]);
    expect(legacy.items.size).toBe(0);
    expect(existsSync(fileOf(stagedSlotFor(DEFAULT)))).toBe(false);
    expect(existsSync(fileOf(DEFAULT))).toBe(false);
  });

  it('the legacy arm is never handed a put, by type and at run time', async () => {
    const legacy = recordingLegacy();
    const vault: VaultBackend = sealedVault(dir, seal, legacy);
    expect(await vaultPut(vault, SLOT, 'kept-bytes')).toEqual({ ok: true });
    expect(await vaultPut(vault, DEFAULT, 'other-bytes')).toEqual({ ok: true });
    expect(legacy.items.size).toBe(0);
    expect(Object.keys(legacy).sort()).toEqual(['del', 'dels', 'get', 'gets', 'items', 'refuseDel', 'throwOnGet']);
  });
});
