/**
 * Phase 208. The vault is scoped to its profile.
 *
 * Every keychain name Tortie's own store composes carries a digest of the
 * logins root it is running in, so two profiles on one machine can never
 * address one item, and no name the scoped composer can produce is ever the
 * unscoped name a tree before this phase wrote.
 *
 * Every test runs the SHIPPING module over an injected runner: no keychain is
 * opened and no process is spawned.
 */

import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { isPlainSecurityName, type SecurityRunner } from '../security';
import {
  keychainVault,
  slotFor,
  stagedSlotFor,
  VAULT_ACCOUNT,
  VAULT_SERVICE_PREFIX,
  vaultScopeDigest,
  vaultServiceFor
} from '../vault';

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

/** A `security` in a map that records every service name it was handed. */
function recordingRunner(): SecurityRunner & {
  items: Map<string, string>;
  named: string[];
} {
  const items = new Map<string, string>();
  const named: string[] = [];
  return {
    items,
    named,
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

  it('the keychain backend reads, writes and deletes the scoped name only', async () => {
    const runner = recordingRunner();
    const vault = keychainVault(runner, SCRATCH_ROOT);
    const slot = slotFor('claude', null);
    await vault.put(slot, '{"claudeAiOauth":{"accessToken":"t"}}');
    expect(await vault.get(slot)).toBe('{"claudeAiOauth":{"accessToken":"t"}}');
    await vault.del(slot);
    expect(await vault.get(slot)).toBeNull();
    const scoped = vaultServiceFor(slot, SCRATCH_ROOT);
    expect(runner.named.length).toBe(4);
    for (const name of runner.named) expect(name).toBe(scoped);
    expect(runner.named).not.toContain(unscoped(slot));
    expect([...runner.items.keys()]).toEqual([]);
  });

  it('a slot written by one profile is invisible to another', async () => {
    const runner = recordingRunner();
    const slot = slotFor('codex', null);
    await keychainVault(runner, OWN_ROOT).put(slot, '{"tokens":{"access_token":"a"}}');
    expect(await keychainVault(runner, SCRATCH_ROOT).get(slot)).toBeNull();
    expect(await keychainVault(runner, OWN_ROOT).get(slot)).toBe(
      '{"tokens":{"access_token":"a"}}'
    );
    expect([...runner.items.keys()]).toEqual([vaultServiceFor(slot, OWN_ROOT)]);
  });

  it('the item account attribute is still Tortie own', () => {
    expect(VAULT_ACCOUNT).toBe('tortie');
  });
});
