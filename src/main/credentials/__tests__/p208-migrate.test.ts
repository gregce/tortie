/**
 * Phase 208. The one move onto the scoped name, and who may make it.
 *
 * Every test runs the SHIPPING migration over a `security` in a map that
 * records every service name it was handed: no keychain is opened, no process
 * is spawned, and the only path touched is a scratch directory each test makes
 * and removes for the record file.
 */

import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeKeptFile } from '../kept';
import {
  isOwnProfile,
  migrateUnscopedVault,
  ownProfileVerdict,
  unscopedVaultServiceFor
} from '../migrate';
import { credentialDigest } from '../payload';
import type { SecurityRunner } from '../security';
import { keychainVault, slotFor, stagedSlotFor, vaultServiceFor } from '../vault';

const OWN = '/Users/someone/Library/Application Support/Tortie';
const ROOT_TAIL = join('gmux', 'logins');

function fakeSecurity(): SecurityRunner & {
  items: Map<string, string>;
  named: string[];
  deletes: string[];
} {
  const items = new Map<string, string>();
  const named: string[] = [];
  const deletes: string[] = [];
  return {
    items,
    named,
    deletes,
    run: async (argv, stdin) => {
      if (argv[0] === '-i') {
        const found =
          /^add-generic-password -U -a "([^"]*)" -s "([^"]*)" -X "([0-9a-f]*)"$/.exec(
            (stdin ?? '').trim()
          );
        if (found === null) return { code: 1, stdout: '' };
        named.push(found[2] ?? '');
        items.set(found[2] ?? '', Buffer.from(found[3] ?? '', 'hex').toString('utf8'));
        return { code: 0, stdout: '' };
      }
      const at = argv.indexOf('-s');
      const service = at < 0 ? '' : (argv[at + 1] ?? '');
      named.push(service);
      if (argv[0] === 'find-generic-password') {
        const held = items.get(service);
        if (held === undefined) return { code: 1, stdout: '' };
        return { code: 0, stdout: argv.includes('-w') ? `${held}\n` : 'attributes\n' };
      }
      if (argv[0] === 'delete-generic-password') {
        deletes.push(service);
        items.delete(service);
        return { code: 0, stdout: '' };
      }
      return { code: 1, stdout: '' };
    }
  };
}

const cred = (who: string): string =>
  JSON.stringify({ claudeAiOauth: { accessToken: `P208-${who}` } });

/**
 * The deletes that named an UNSCOPED item. The shipping write discards its own
 * scoped staged place in a finally, and that delete is the write's rather than
 * the migration's.
 */
const unscopedDeletes = (names: string[]): string[] =>
  names.filter((n) => !/-[0-9a-f]{8}$/.test(n));

let root = '';
beforeEach(() => {
  root = join(mkdtempSync(join(tmpdir(), 'p208-migrate-')), ROOT_TAIL);
});
afterEach(() => {
  rmSync(join(root, '..', '..'), { recursive: true, force: true });
});

const DEFAULT = slotFor('claude', null);
const LOGIN = slotFor('claude', 'b'.repeat(16));

describe('Phase 208: isOwnProfile', () => {
  const env = {};
  it('the person own profile passes', () => {
    expect(isOwnProfile({ userData: OWN, appData: '/Users/someone/Library/Application Support', appName: 'Tortie', env })).toBe(true);
    expect(isOwnProfile({ userData: `${OWN}/`, appData: '/Users/someone/Library/Application Support/', appName: 'Tortie', env })).toBe(true);
  });
  it('a --user-data-dir profile fails', () => {
    expect(isOwnProfile({ userData: '/private/tmp/gmux-p208-1/profile', appData: '/Users/someone/Library/Application Support', appName: 'Tortie', env })).toBe(false);
  });
  it('a harness launch of any kind fails, whatever its profile', () => {
    for (const harness of [
      { GMUX_PROBES: '1' },
      { GMUX_PROBES: '0' },
      { GMUX_SMOKE: 'basic' },
      { GMUX_SHOT: '1' },
      { GMUX_UPDATE_REHEARSAL: '1' }
    ]) {
      expect(isOwnProfile({ userData: OWN, appData: '/Users/someone/Library/Application Support', appName: 'Tortie', env: harness })).toBe(false);
    }
  });
  it('an empty answer from Electron fails', () => {
    expect(isOwnProfile({ userData: '', appData: '', appName: '', env })).toBe(false);
  });
});

describe('Phase 219: a home behind a link, and a refusal that says which', () => {
  let scratch = '';
  beforeEach(() => {
    scratch = mkdtempSync(join(tmpdir(), 'p219-profile-'));
  });
  afterEach(() => {
    rmSync(scratch, { recursive: true, force: true });
  });

  /**
   * THE FOUR SHAPES, on a real disk with a real link.
   *
   * `resolve` never follows a link, so before Phase 219 the two MIXED shapes
   * read false and the migration was refused for ever on a machine whose home
   * or whose Application Support is reached through one. Both of them really
   * are the same directory, which is what `realpathSync` is asked.
   */
  it('a real link over the profile is the person own profile from either spelling', () => {
    const real = join(scratch, 'real');
    const support = join(real, 'Library', 'Application Support');
    mkdirSync(join(support, 'Tortie'), { recursive: true });
    const linked = join(scratch, 'linked-home');
    symlinkSync(real, linked);
    const linkedSupport = join(linked, 'Library', 'Application Support');
    const shapes: [string, string][] = [
      [join(support, 'Tortie'), support],
      [join(linkedSupport, 'Tortie'), linkedSupport],
      [join(support, 'Tortie'), linkedSupport],
      [join(linkedSupport, 'Tortie'), support]
    ];
    for (const [userData, appData] of shapes) {
      expect(ownProfileVerdict({ userData, appData, appName: 'Tortie', env: {} })).toBe('own');
    }
  });

  it('a scratch profile is still refused however the link is spelled', () => {
    const real = join(scratch, 'real2');
    const support = join(real, 'Library', 'Application Support');
    mkdirSync(join(support, 'Tortie'), { recursive: true });
    const elsewhere = join(scratch, 'profile');
    mkdirSync(elsewhere, { recursive: true });
    const linked = join(scratch, 'linked-home2');
    symlinkSync(real, linked);
    for (const appData of [support, join(linked, 'Library', 'Application Support')]) {
      expect(
        ownProfileVerdict({ userData: elsewhere, appData, appName: 'Tortie', env: {} })
      ).toBe('elsewhere');
      expect(isOwnProfile({ userData: elsewhere, appData, appName: 'Tortie', env: {} })).toBe(
        false
      );
    }
  });

  it('the refusal says WHICH refusal it is', () => {
    expect(ownProfileVerdict({ userData: OWN, appData: '/Users/someone/Library/Application Support', appName: 'Tortie', env: { GMUX_PROBES: '1' } })).toBe('harness');
    expect(ownProfileVerdict({ userData: '', appData: '', appName: '', env: {} })).toBe('no-paths');
    expect(ownProfileVerdict({ userData: '/private/tmp/p208/profile', appData: '/Users/someone/Library/Application Support', appName: 'Tortie', env: {} })).toBe('elsewhere');
    expect(ownProfileVerdict({ userData: OWN, appData: '/Users/someone/Library/Application Support', appName: 'Tortie', env: {} })).toBe('own');
  });

  it('a refused migration carries its reason out', async () => {
    for (const verdict of ['harness', 'no-paths', 'elsewhere'] as const) {
      const security = fakeSecurity();
      security.items.set(unscopedVaultServiceFor(DEFAULT), cred('old'));
      const result = await migrateUnscopedVault({
        runner: security,
        vault: keychainVault(security, root),
        root,
        slots: [DEFAULT],
        ownProfile: verdict
      });
      expect(result).toEqual({
        refused: true,
        reason: verdict,
        moved: 0,
        deleted: 0,
        kept: 0,
        failed: 0
      });
      expect(security.named).toEqual([]);
    }
  });

  /**
   * THE DELETE THAT FAILED AND WAS COUNTED AS A DELETE.
   *
   * `keychainDelete` answered `void`, so this arm read `{deleted: 2}` while
   * both items were still on the machine and the next launch would find them
   * again. The runner below answers 44, which is what `security` uses for an
   * item it could not find.
   */
  it('a delete security refuses is counted as failed, never as deleted', async () => {
    const security = fakeSecurity();
    const refusingDelete: SecurityRunner = {
      run: async (argv, stdin) => {
        if (argv[0] === 'delete-generic-password') return { code: 44, stdout: '' };
        return security.run(argv, stdin);
      }
    };
    security.items.set(unscopedVaultServiceFor(stagedSlotFor(DEFAULT)), cred('residue'));
    security.items.set(unscopedVaultServiceFor(DEFAULT), cred('old'));
    const result = await migrateUnscopedVault({
      runner: refusingDelete,
      vault: keychainVault(refusingDelete, root),
      root,
      slots: [DEFAULT],
      ownProfile: 'own'
    });
    expect(result.deleted).toBe(0);
    expect(result.failed).toBe(2);
    expect(result.moved).toBe(1);
    // AND THE ITEMS ARE REALLY STILL THERE, which is the whole point.
    expect(security.items.has(unscopedVaultServiceFor(DEFAULT))).toBe(true);
    expect(security.items.has(unscopedVaultServiceFor(stagedSlotFor(DEFAULT)))).toBe(true);
  });

  it('a delete that succeeds is still counted as one', async () => {
    const security = fakeSecurity();
    security.items.set(unscopedVaultServiceFor(DEFAULT), cred('old'));
    const result = await migrateUnscopedVault({
      runner: security,
      vault: keychainVault(security, root),
      root,
      slots: [DEFAULT],
      ownProfile: 'own'
    });
    expect(result.deleted).toBe(1);
    expect(result.failed).toBe(0);
  });
});

describe('Phase 208: migrateUnscopedVault', () => {
  it('a profile that is not the person own composes no unscoped name at all', async () => {
    const security = fakeSecurity();
    security.items.set(unscopedVaultServiceFor(DEFAULT), cred('old'));
    const result = await migrateUnscopedVault({
      runner: security,
      vault: keychainVault(security, root),
      root,
      slots: [DEFAULT, LOGIN],
      ownProfile: 'elsewhere'
    });
    expect(result.refused).toBe(true);
    expect(security.named).toEqual([]);
    expect(security.items.get(unscopedVaultServiceFor(DEFAULT))).toBe(cred('old'));
  });

  it('an unscoped item present and the scoped one absent is moved and deleted', async () => {
    const security = fakeSecurity();
    security.items.set(unscopedVaultServiceFor(DEFAULT), cred('old'));
    const result = await migrateUnscopedVault({
      runner: security,
      vault: keychainVault(security, root),
      root,
      slots: [DEFAULT, LOGIN],
      ownProfile: 'own'
    });
    expect(result).toEqual({ refused: false, reason: null, moved: 1, deleted: 1, kept: 0, failed: 0 });
    expect(security.items.get(vaultServiceFor(DEFAULT, root))).toBe(cred('old'));
    expect(security.items.has(unscopedVaultServiceFor(DEFAULT))).toBe(false);
    expect(unscopedDeletes(security.deletes)).toEqual([unscopedVaultServiceFor(DEFAULT)]);
    expect([...security.items.keys()]).toEqual([vaultServiceFor(DEFAULT, root)]);
  });

  it('an unscoped item absent moves nothing and deletes nothing', async () => {
    const security = fakeSecurity();
    const result = await migrateUnscopedVault({
      runner: security,
      vault: keychainVault(security, root),
      root,
      slots: [DEFAULT, LOGIN],
      ownProfile: 'own'
    });
    expect(result).toEqual({ refused: false, reason: null, moved: 0, deleted: 0, kept: 0, failed: 0 });
    expect(security.deletes).toEqual([]);
    expect(security.items.size).toBe(0);
  });

  it('both present with the same bytes keeps the scoped one and deletes the old', async () => {
    const security = fakeSecurity();
    security.items.set(unscopedVaultServiceFor(DEFAULT), cred('same'));
    security.items.set(vaultServiceFor(DEFAULT, root), cred('same'));
    const result = await migrateUnscopedVault({
      runner: security,
      vault: keychainVault(security, root),
      root,
      slots: [DEFAULT],
      ownProfile: 'own'
    });
    expect(result).toEqual({ refused: false, reason: null, moved: 0, deleted: 1, kept: 0, failed: 0 });
    expect([...security.items.keys()]).toEqual([vaultServiceFor(DEFAULT, root)]);
  });

  it('both present and the record naming the OLD bytes rewrites the scoped one', async () => {
    const security = fakeSecurity();
    security.items.set(unscopedVaultServiceFor(DEFAULT), cred('recorded'));
    security.items.set(vaultServiceFor(DEFAULT, root), cred('stale'));
    writeKeptFile(root, {
      v: 1,
      slots: {
        [DEFAULT]: {
          email: null,
          subject: null,
          digest: credentialDigest(cred('recorded')),
          account: null,
          from: null,
          at: 1
        }
      }
    });
    const result = await migrateUnscopedVault({
      runner: security,
      vault: keychainVault(security, root),
      root,
      slots: [DEFAULT],
      ownProfile: 'own'
    });
    expect(result).toEqual({ refused: false, reason: null, moved: 1, deleted: 1, kept: 0, failed: 0 });
    expect(security.items.get(vaultServiceFor(DEFAULT, root))).toBe(cred('recorded'));
    expect(security.items.has(unscopedVaultServiceFor(DEFAULT))).toBe(false);
  });

  it('both present and the record naming the SCOPED bytes keeps it and deletes the old', async () => {
    const security = fakeSecurity();
    security.items.set(unscopedVaultServiceFor(DEFAULT), cred('older'));
    security.items.set(vaultServiceFor(DEFAULT, root), cred('recorded'));
    writeKeptFile(root, {
      v: 1,
      slots: {
        [DEFAULT]: {
          email: null,
          subject: null,
          digest: credentialDigest(cred('recorded')),
          account: null,
          from: null,
          at: 1
        }
      }
    });
    const result = await migrateUnscopedVault({
      runner: security,
      vault: keychainVault(security, root),
      root,
      slots: [DEFAULT],
      ownProfile: 'own'
    });
    expect(result).toEqual({ refused: false, reason: null, moved: 0, deleted: 1, kept: 0, failed: 0 });
    expect(security.items.get(vaultServiceFor(DEFAULT, root))).toBe(cred('recorded'));
  });

  it('a staged leftover under the old name is deleted without being moved', async () => {
    const security = fakeSecurity();
    security.items.set(unscopedVaultServiceFor(stagedSlotFor(LOGIN)), cred('residue'));
    const result = await migrateUnscopedVault({
      runner: security,
      vault: keychainVault(security, root),
      root,
      slots: [LOGIN],
      ownProfile: 'own'
    });
    expect(result).toEqual({ refused: false, reason: null, moved: 0, deleted: 1, kept: 0, failed: 0 });
    expect(security.items.size).toBe(0);
  });

  it('a scoped copy that does not read back equal leaves the old item where it was', async () => {
    const security = fakeSecurity();
    security.items.set(unscopedVaultServiceFor(DEFAULT), cred('old'));
    const scoped = vaultServiceFor(DEFAULT, root);
    // A keychain whose writes to the scoped name do not land.
    const refusing: SecurityRunner = {
      run: async (argv, stdin) => {
        if (argv[0] === '-i' && (stdin ?? '').includes(`-s "${scoped}"`)) {
          return { code: 1, stdout: '' };
        }
        return security.run(argv, stdin);
      }
    };
    const result = await migrateUnscopedVault({
      runner: refusing,
      vault: keychainVault(refusing, root),
      root,
      slots: [DEFAULT],
      ownProfile: 'own'
    });
    expect(result).toEqual({ refused: false, reason: null, moved: 0, deleted: 0, kept: 1, failed: 0 });
    expect(security.items.get(unscopedVaultServiceFor(DEFAULT))).toBe(cred('old'));
    expect(unscopedDeletes(security.deletes)).toEqual([]);
  });

  it('a slot that is not one Tortie minted is never asked about', async () => {
    const security = fakeSecurity();
    security.items.set(unscopedVaultServiceFor('other.default'), cred('x'));
    await migrateUnscopedVault({
      runner: security,
      vault: keychainVault(security, root),
      root,
      slots: ['other.default', 'claude.../../x'],
      ownProfile: 'own'
    });
    expect(security.named).toEqual([]);
  });

  it('no answer carries a payload, a name or a digest', async () => {
    const security = fakeSecurity();
    security.items.set(unscopedVaultServiceFor(DEFAULT), cred('old'));
    const result = await migrateUnscopedVault({
      runner: security,
      vault: keychainVault(security, root),
      root,
      slots: [DEFAULT],
      ownProfile: 'own'
    });
    const text = JSON.stringify(result);
    expect(text).not.toContain('P208');
    expect(text).not.toContain('Tortie-credentials');
    expect(Object.keys(result).sort()).toEqual([
      'deleted',
      'failed',
      'kept',
      'moved',
      'reason',
      'refused'
    ]);
  });
});
