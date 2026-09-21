/**
 * Phase 208. The vault is scoped to its profile.
 *
 * Every keychain name Tortie's own store composes carries a digest of the
 * logins root it is running in, so two profiles on one machine can never
 * address one item, and no name the scoped composer can produce is ever the
 * unscoped name a tree before this phase wrote.
 *
 * SINCE PHASE 304 THE NAME IS ONLY READ. Tortie's own store is a sealed file
 * under the profile, and the keychain item under the scoped name is what the
 * read-through migrates FROM: the last two cases below drive that arm over the
 * shipping `sealedVault` and prove it composes the scoped name alone, sends no
 * `-i` line, and leaves another profile's item where it is.
 *
 * Every test runs the SHIPPING module over an injected runner: no keychain is
 * opened and no process is spawned. The only paths touched are inside a
 * scratch directory each test makes and removes.
 */

import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { isPlainSecurityName, type SecurityRunner } from '../security';
import {
  legacyKeychainVault,
  sealedVault,
  slotFor,
  stagedSlotFor,
  VAULT_SERVICE_PREFIX,
  vaultScopeDigest,
  vaultServiceFor
} from '../vault';
import { testSeal } from './test-seal';

const OWN_ROOT = '/Users/someone/Library/Application Support/Tortie/gmux/logins';
const SCRATCH_ROOT = '/private/tmp/gmux-p208-1234/profile/gmux/logins';
const SLOTS = [
  slotFor('claude', null),
  slotFor('codex', null),
  slotFor('claude', 'a'.repeat(16)),
  slotFor('codex', '0123456789abcdef'),
  stagedSlotFor(slotFor('claude', null))
];

/** The unscoped name, spelled here and nowhere the shipping composer reaches. */
function unscoped(slot: string): string {
  return `${VAULT_SERVICE_PREFIX}${slot}`;
}

/** A `security` in a map that records every service name and every argv it was handed. */
function recordingRunner(): SecurityRunner & {
  items: Map<string, string>;
  named: string[];
  argvs: string[][];
} {
  const items = new Map<string, string>();
  const named: string[] = [];
  const argvs: string[][] = [];
  return {
    items,
    named,
    argvs,
    run: async (argv, stdin) => {
      argvs.push([...argv]);
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
        items.delete(service);
        return { code: 0, stdout: '' };
      }
      return { code: 1, stdout: '' };
    }
  };
}

describe('Phase 208: the vault service name carries its profile', () => {
  it('two roots compose two different names for the same slot', () => {
    for (const slot of SLOTS) {
      expect(vaultServiceFor(slot, OWN_ROOT)).not.toBe(vaultServiceFor(slot, SCRATCH_ROOT));
    }
  });

  it('the digest is the first eight hex of a sha256 of the root, re-derived here', () => {
    for (const root of [OWN_ROOT, SCRATCH_ROOT]) {
      const digest = createHash('sha256').update(root).digest('hex').slice(0, 8);
      expect(vaultScopeDigest(root)).toBe(digest);
      expect(vaultServiceFor('claude.default', root)).toBe(
        `Tortie-credentials-claude.default-${digest}`
      );
    }
  });

  it('one root composes the same name on every call', () => {
    expect(vaultServiceFor('claude.default', OWN_ROOT)).toBe(
      vaultServiceFor('claude.default', OWN_ROOT)
    );
  });

  it('no name composed from any root equals the unscoped one', () => {
    const roots = [OWN_ROOT, SCRATCH_ROOT, '/', 'x', OWN_ROOT.repeat(3)];
    for (const root of roots) {
      for (const slot of SLOTS) {
        const scoped = vaultServiceFor(slot, root);
        expect(scoped).not.toBe(unscoped(slot));
        for (const other of SLOTS) expect(scoped).not.toBe(unscoped(other));
        expect(scoped.startsWith(VAULT_SERVICE_PREFIX)).toBe(true);
      }
    }
  });

  it('an empty scope is refused rather than composing the unscoped name', () => {
    expect(() => vaultServiceFor('claude.default', '')).toThrow();
    expect(() => vaultServiceFor('claude.default', undefined as unknown as string)).toThrow();
  });

  it('every scoped name is a plain security name', () => {
    for (const slot of SLOTS) {
      expect(isPlainSecurityName(vaultServiceFor(slot, OWN_ROOT))).toBe(true);
    }
  });

  describe('Phase 304: the read-through asks the scoped name, and only reads it', () => {
    let dir = '';
    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'p208-scope-'));
    });
    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    it('a miss reads the scoped item through, sends no -i line, and deletes exactly that name', async () => {
      const runner = recordingRunner();
      const slot = slotFor('claude', null);
      const scoped = vaultServiceFor(slot, SCRATCH_ROOT);
      runner.items.set(scoped, '{"claudeAiOauth":{"accessToken":"t"}}');
      const vault = sealedVault(join(dir, 'kept'), testSeal(), legacyKeychainVault(runner, SCRATCH_ROOT));
      expect(await vault.get(slot)).toBe('{"claudeAiOauth":{"accessToken":"t"}}');
      // One read, one delete, both of the scoped name; nothing written to the keychain.
      expect(runner.named).toEqual([scoped, scoped]);
      expect(runner.argvs.map((a) => a[0])).toEqual(['find-generic-password', 'delete-generic-password']);
      expect(runner.named).not.toContain(unscoped(slot));
      expect([...runner.items.keys()]).toEqual([]);
      // A hit asks the keychain nothing more.
      expect(await vault.get(slot)).toBe('{"claudeAiOauth":{"accessToken":"t"}}');
      expect(runner.named.length).toBe(2);
    });

    it('a slot kept by one profile is invisible to another, and the other writes no file', async () => {
      const runner = recordingRunner();
      const slot = slotFor('codex', null);
      runner.items.set(vaultServiceFor(slot, OWN_ROOT), '{"tokens":{"access_token":"a"}}');
      const other = sealedVault(join(dir, 'other'), testSeal(), legacyKeychainVault(runner, SCRATCH_ROOT));
      expect(await other.get(slot)).toBeNull();
      expect(runner.named).toEqual([vaultServiceFor(slot, SCRATCH_ROOT)]);
      expect(readdirOrEmpty(join(dir, 'other'))).toEqual([]);
      // The owning profile still reads its own item, and moves it into its own file.
      const own = sealedVault(join(dir, 'own'), testSeal(), legacyKeychainVault(runner, OWN_ROOT));
      expect(await own.get(slot)).toBe('{"tokens":{"access_token":"a"}}');
      expect([...runner.items.keys()]).toEqual([]);
      expect(readdirOrEmpty(join(dir, 'own'))).toEqual([`${slot}.cred`]);
    });
  });
});

/** The files under a kept directory, or none when the directory was never made. */
function readdirOrEmpty(path: string): string[] {
  try {
    return readdirSync(path).sort();
  } catch {
    return [];
  }
}
