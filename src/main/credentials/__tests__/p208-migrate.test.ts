/**
 * Phase 208. The one move onto the scoped name, and who may make it.
 *
 * Every test runs the SHIPPING migration over a `security` in a map that
 * records every service name it was handed: no keychain is opened, no process
 * is spawned, and the only path touched is a scratch directory each test makes
 * and removes for the record file.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { writeKeptFile } from '../kept';
import {
  isOwnProfile,
  migrateUnscopedVault,
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

describe('Phase 208: migrateUnscopedVault', () => {
  it('a profile that is not the person own composes no unscoped name at all', async () => {
    const security = fakeSecurity();
    security.items.set(unscopedVaultServiceFor(DEFAULT), cred('old'));
    const result = await migrateUnscopedVault({
      runner: security,
      vault: keychainVault(security, root),
      root,
      slots: [DEFAULT, LOGIN],
      ownProfile: false
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
      ownProfile: true
    });
    expect(result).toEqual({ refused: false, moved: 1, deleted: 1, kept: 0 });
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
      ownProfile: true
    });
    expect(result).toEqual({ refused: false, moved: 0, deleted: 0, kept: 0 });
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
      ownProfile: true
    });
    expect(result).toEqual({ refused: false, moved: 0, deleted: 1, kept: 0 });
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
      ownProfile: true
    });
    expect(result).toEqual({ refused: false, moved: 1, deleted: 1, kept: 0 });
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
      ownProfile: true
    });
    expect(result).toEqual({ refused: false, moved: 0, deleted: 1, kept: 0 });
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
      ownProfile: true
    });
    expect(result).toEqual({ refused: false, moved: 0, deleted: 1, kept: 0 });
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
      ownProfile: true
    });
    expect(result).toEqual({ refused: false, moved: 0, deleted: 0, kept: 1 });
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
      ownProfile: true
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
      ownProfile: true
    });
    const text = JSON.stringify(result);
    expect(text).not.toContain('P208');
    expect(text).not.toContain('Tortie-credentials');
    expect(Object.keys(result).sort()).toEqual(['deleted', 'kept', 'moved', 'refused']);
  });
});
