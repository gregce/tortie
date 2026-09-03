/**
 * Phase 206, the fix round. How far the sweep and the stray finisher reach.
 *
 * The Phase 206 verifier measured two places where a credential nobody can
 * reach survives every observe, and both are the same gap seen from two sides:
 * the sweep and the stray finisher both read the DIRECTORIES on disk, and a
 * removed login's directory is the first of its four parts to go. So a slot
 * whose folder has already gone was invisible to both.
 *
 * Every test runs the SHIPPING modules over injected seams: no keychain is
 * opened, no vendor location is named, no process is spawned, and the only
 * paths touched are inside a scratch directory each test makes and removes.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loginDirIn } from '../../logins/dirs';
import { namedLoginIds, strayLoginIds } from '../../logins/store';
import { readKeptFile, writeKeptFile, type KeptRecord } from '../kept';
import { observeProvider, type KeepDeps } from '../keep';
import type { StoreDeps } from '../stores';
import { stagedSlotFor, vaultDiscardStaged, type VaultBackend } from '../vault';

/** A vault in a map that counts every delete it was ASKED for. */
function countingVault(): VaultBackend & {
  slots: Map<string, string>;
  deletes: string[];
  reads: string[];
} {
  const slots = new Map<string, string>();
  const deletes: string[] = [];
  const reads: string[] = [];
  return {
    kind: 'file',
    slots,
    deletes,
    reads,
    get: async (slot) => {
      reads.push(slot);
      return slots.get(slot) ?? null;
    },
    put: async (slot, payload) => {
      slots.set(slot, payload);
    },
    del: async (slot) => {
      deletes.push(slot);
      slots.delete(slot);
    }
  };
}

/** The whole file system this domain sees, as a map of path to text. */
function fakeStores(files: Map<string, string>): StoreDeps {
  return {
    runner: { run: async () => ({ code: 1, stdout: '' }) },
    readText: async (path) => files.get(path) ?? null,
    writeText: async (path, text) => {
      files.set(path, text);
    },
    renamePath: async (from, to) => {
      const value = files.get(from);
      if (value === undefined) throw new Error('nothing staged');
      files.set(to, value);
      files.delete(from);
    },
    removePath: async (path) => {
      files.delete(path);
    },
    env: {},
    home: '/home',
    keychainForClaude: false,
    userName: 'tester',
    wait: async () => undefined
  };
}

const A_ROW: KeptRecord = {
  email: null,
  subject: null,
  digest: 'a'.repeat(64),
  account: 'tester',
  from: null,
  at: 1
};

const CREDENTIAL = JSON.stringify({
  claudeAiOauth: { accessToken: 'planted', subscriptionType: 'max' }
});

let root = '';

function writeLogins(rows: { id: string; name: string }[]): void {
  writeFileSync(
    join(root, 'logins.json'),
    JSON.stringify({
      v: 1,
      logins: rows.map((r) => ({ ...r, provider: 'claude', createdAt: 1 }))
    }),
    'utf8'
  );
}

function deps(vault: VaultBackend): KeepDeps {
  return {
    root,
    vault,
    stores: fakeStores(new Map()),
    liveSessions: async () => [],
    now: () => 1_000
  };
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'p206-reach-'));
  mkdirSync(join(root, 'claude'), { recursive: true });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('the sweep reaches a slot whose directory has gone', () => {
  it('clears a staged credential beside a live row with no folder on disk', async () => {
    // The row is THERE, so this is not a stray: it is a login whose folder is
    // missing, which `storesOf` drops and the sweep therefore never saw.
    writeLogins([{ id: '1111111111111111', name: 'One' }]);
    writeKeptFile(root, { v: 1, slots: { 'claude.1111111111111111': A_ROW } });
    const vault = countingVault();
    vault.slots.set('claude.1111111111111111', CREDENTIAL);
    vault.slots.set(stagedSlotFor('claude.1111111111111111'), CREDENTIAL);

    await observeProvider(deps(vault), 'claude');

    expect(vault.slots.has(stagedSlotFor('claude.1111111111111111'))).toBe(false);
    // AND THE SETTLED SLOT IS NOT TOUCHED, which is the whole point of a sweep
    // that names the staged place and never the slot.
    expect(vault.slots.get('claude.1111111111111111')).toBe(CREDENTIAL);
  });

  it('still clears the default slot and a login whose folder is there', async () => {
    const id = '2222222222222222';
    writeLogins([{ id, name: 'Two' }]);
    mkdirSync(loginDirIn(root, 'claude', id), { recursive: true });
    writeKeptFile(root, { v: 1, slots: {} });
    const vault = countingVault();
    vault.slots.set(stagedSlotFor('claude.default'), CREDENTIAL);
    vault.slots.set(stagedSlotFor(`claude.${id}`), CREDENTIAL);

    await observeProvider(deps(vault), 'claude');

    expect(vault.slots.has(stagedSlotFor('claude.default'))).toBe(false);
    expect(vault.slots.has(stagedSlotFor(`claude.${id}`))).toBe(false);
  });
});

describe('the stray finisher reaches a stray with no directory', () => {
  it('clears the slot and the record row of an id no row names', async () => {
    const stray = '3333333333333333';
    writeLogins([{ id: '4444444444444444', name: 'Live' }]);
    mkdirSync(loginDirIn(root, 'claude', '4444444444444444'), { recursive: true });
    writeKeptFile(root, {
      v: 1,
      slots: { [`claude.${stray}`]: A_ROW, 'claude.4444444444444444': A_ROW }
    });
    const vault = countingVault();
    vault.slots.set(`claude.${stray}`, CREDENTIAL);

    // THE DIRECTORY IS NOT THERE, which is what made this invisible: the
    // provider root's `readdir` answers nothing about it.
    expect(strayLoginIds(root, 'claude')).toEqual([]);

    await observeProvider(deps(vault), 'claude');

    expect(vault.slots.has(`claude.${stray}`)).toBe(false);
    expect(readKeptFile(root).file.slots[`claude.${stray}`]).toBeUndefined();
    // THE LIVE ROW IS UNTOUCHED, which is the refusal that matters most.
    expect(readKeptFile(root).file.slots['claude.4444444444444444']).toBeDefined();
  });

  it('authorises nothing when the record of what the person owns cannot be read', async () => {
    const stray = '5555555555555555';
    writeFileSync(join(root, 'logins.json'), 'not json at all', 'utf8');
    writeKeptFile(root, { v: 1, slots: { [`claude.${stray}`]: A_ROW } });
    const vault = countingVault();
    vault.slots.set(`claude.${stray}`, CREDENTIAL);

    expect(namedLoginIds(root)).toBeNull();

    await observeProvider(deps(vault), 'claude');

    expect(vault.slots.get(`claude.${stray}`)).toBe(CREDENTIAL);
  });

  it('reads a slot name out of the record file before it uses one', async () => {
    // The record file is one an agent with write access to the home directory
    // could edit, and half of a slot name is half of a keychain service name.
    writeLogins([]);
    writeFileSync(
      join(root, 'kept.json'),
      JSON.stringify({
        v: 1,
        slots: {
          'claude.../../etc/passwd': A_ROW,
          'notaprovider.6666666666666666': A_ROW,
          'claude.6666666666666666': A_ROW
        }
      }),
      'utf8'
    );
    const vault = countingVault();

    await observeProvider(deps(vault), 'claude');

    for (const asked of [...vault.deletes, ...vault.reads]) {
      expect(asked.startsWith('claude.')).toBe(true);
      expect(asked).not.toContain('/');
    }
  });
});

describe('the sweep asks for no delete it has no evidence it needs', () => {
  it('reads the staged place and stops when it is empty', async () => {
    const vault = countingVault();
    await vaultDiscardStaged(vault, 'claude.default');
    expect(vault.reads).toEqual(['claude.default.pending']);
    expect(vault.deletes).toEqual([]);
  });

  it('deletes exactly the staged place when one is there', async () => {
    const vault = countingVault();
    vault.slots.set('claude.default.pending', CREDENTIAL);
    vault.slots.set('claude.default', CREDENTIAL);
    await vaultDiscardStaged(vault, 'claude.default');
    expect(vault.deletes).toEqual(['claude.default.pending']);
    expect(vault.slots.get('claude.default')).toBe(CREDENTIAL);
  });

  it('asks the person keychain namespace for nothing on a whole observe', async () => {
    // A PROBE ON A SCRATCH PROFILE. On macOS this backend's store is the
    // person's login keychain rather than anything inside the profile, so a
    // delete asked here with nothing staged is a reach into their namespace on
    // every launch of every probe in this tree.
    writeLogins([]);
    const vault = countingVault();
    await observeProvider(deps(vault), 'claude');
    expect(vault.deletes).toEqual([]);
  });
});
