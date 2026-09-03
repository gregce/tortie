/**
 * Phase 204. The store Tortie owns, the one write, and the three verbs.
 *
 * Every test here runs the SHIPPING modules over injected seams: no keychain
 * is opened, no vendor location is named, no process is spawned, and the only
 * paths touched are inside a scratch directory each test makes and removes.
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_LOGIN_NAME,
  loginNameFromEmail,
  nextKeptLoginName
} from '@shared/logins';
import { addLogin, readLoginsFile } from '../../logins/store';
import { loginDirIn } from '../../logins/dirs';
import { credentialDigest, isCredentialPayload } from '../payload';
import { decodeKeychainPayload, isPlainSecurityName } from '../security';
import { safeSwap, type SwapTarget } from '../swap';
import { readKeptFile, writeKeptFile } from '../kept';
import {
  activateLogin,
  observeProvider,
  type KeepDeps,
  type LiveSession
} from '../keep';
import type { StoreDeps } from '../stores';
import { isSlotName, slotFor, vaultGet, vaultPut, type VaultBackend } from '../vault';

/** A vault that lives in a map, and can be made to fail one step on purpose. */
function fakeVault(): VaultBackend & {
  slots: Map<string, string>;
  failPut: Set<string>;
  corrupt: Set<string>;
} {
  const slots = new Map<string, string>();
  const failPut = new Set<string>();
  const corrupt = new Set<string>();
  return {
    kind: 'file',
    slots,
    failPut,
    corrupt,
    get: async (slot) => {
      const value = slots.get(slot);
      if (value === undefined) return null;
      return corrupt.has(slot) ? `${value}-not-what-was-written` : value;
    },
    put: async (slot, payload) => {
      if (failPut.has(slot)) throw new Error('refused');
      slots.set(slot, payload);
    },
    del: async (slot) => {
      slots.delete(slot);
    }
  };
}

/** A claude credential, as the vendor writes one. */
function claudeCredential(token: string): string {
  return JSON.stringify({
    claudeAiOauth: { accessToken: token, subscriptionType: 'max' }
  });
}

/** A codex credential, with the address in the id token claim. */
function codexCredential(token: string, email: string | null): string {
  const claims = email === null ? { sub: 'u' } : { sub: 'u', email };
  const payload = Buffer.from(JSON.stringify(claims), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return JSON.stringify({
    OPENAI_API_KEY: null,
    tokens: {
      access_token: token,
      account_id: 'acct',
      ...(email === null ? {} : { id_token: `h.${payload}.s` })
    }
  });
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

let root = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'p204-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('what a credential is', () => {
  it('takes the vendor shapes and refuses everything else', () => {
    expect(isCredentialPayload('claude', claudeCredential('t'))).toBe(true);
    expect(isCredentialPayload('codex', codexCredential('t', 'a@b.com'))).toBe(true);
    expect(isCredentialPayload('claude', '{"claudeAiOauth":{}}')).toBe(false);
    expect(isCredentialPayload('claude', '{"a":1}')).toBe(false);
    expect(isCredentialPayload('claude', 'not json')).toBe(false);
    // A TRUNCATED FILE, which is one of the shapes the attack list names.
    expect(isCredentialPayload('claude', claudeCredential('t').slice(0, 20))).toBe(false);
    // API KEY BILLING IS NOT AN ACCOUNT THIS PHASE KEEPS.
    expect(
      isCredentialPayload('codex', JSON.stringify({ OPENAI_API_KEY: 'sk', tokens: { access_token: 't' } }))
    ).toBe(false);
  });

  it('digests the same bytes to the same value and different bytes apart', () => {
    expect(credentialDigest('a')).toBe(credentialDigest('a'));
    expect(credentialDigest('a')).not.toBe(credentialDigest('b'));
    expect(credentialDigest('a')).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('the security primitive', () => {
  it('takes back exactly one trailing newline and decodes the hex form', () => {
    expect(decodeKeychainPayload('abc\n')).toBe('abc');
    expect(decodeKeychainPayload('abc  \n')).toBe('abc  ');
    // MEASURED: a payload that is not printable comes back as hex.
    expect(decodeKeychainPayload('6162630a\n')).toBe('abc\n');
    // A payload that IS a hex string is not mistaken for its own decoding.
    expect(decodeKeychainPayload('6162\n')).toBe('6162');
  });

  it('refuses a name that could change what command runs', () => {
    expect(isPlainSecurityName('Tortie-credentials-claude.default')).toBe(true);
    expect(isPlainSecurityName('a"b')).toBe(false);
    expect(isPlainSecurityName('a\\b')).toBe(false);
    expect(isPlainSecurityName('a\nb')).toBe(false);
    expect(isPlainSecurityName('')).toBe(false);
  });
});

describe('the one write', () => {
  function target(state: { real: string | null; staged: string | null }): SwapTarget {
    return {
      read: async () => state.real,
      stage: async (p) => {
        state.staged = p;
      },
      readStaged: async () => state.staged,
      commit: async (p) => {
        state.real = p;
      },
      discard: async () => {
        state.staged = null;
      }
    };
  }

  it('leaves the old value when the staged copy does not read back equal', async () => {
    const state = { real: 'old', staged: null as string | null };
    const io = target(state);
    io.readStaged = async () => 'something else';
    const done = await safeSwap(io, 'new');
    expect(done.ok).toBe(false);
    expect(state.real).toBe('old');
  });

  it('leaves the old value when the staging itself fails', async () => {
    const state = { real: 'old', staged: null as string | null };
    const io = target(state);
    io.stage = async () => {
      throw new Error('no');
    };
    const done = await safeSwap(io, 'new');
    expect(done.ok).toBe(false);
    expect(state.real).toBe('old');
  });

  it('drops the staged copy whatever happened', async () => {
    const state = { real: 'old', staged: null as string | null };
    await safeSwap(target(state), 'new');
    expect(state.staged).toBeNull();
    expect(state.real).toBe('new');
  });

  it('is stopped at each step and the place holds the old value or the new', async () => {
    for (const step of ['stage', 'verify', 'commit'] as const) {
      const state = { real: 'old', staged: null as string | null };
      const done = await safeSwap(target(state), 'new', step);
      expect(done.ok).toBe(false);
      // A CRASH LEAVES ONE OR THE OTHER AND NEVER NEITHER.
      expect(state.real === 'old' || state.real === 'new').toBe(true);
      expect(state.real).not.toBeNull();
    }
  });

  it('refuses an empty payload outright', async () => {
    const state = { real: 'old', staged: null as string | null };
    expect((await safeSwap(target(state), '')).ok).toBe(false);
    expect(state.real).toBe('old');
  });
});

describe('the slots', () => {
  it('takes the shapes Tortie mints and refuses a hand edited one', () => {
    expect(isSlotName(slotFor('claude', null))).toBe(true);
    expect(isSlotName(slotFor('codex', 'a'.repeat(16)))).toBe(true);
    expect(isSlotName('claude.../../etc')).toBe(false);
    expect(isSlotName('other.default')).toBe(false);
    expect(isSlotName('claude')).toBe(false);
    expect(isSlotName(7)).toBe(false);
  });

  it('never writes a slot it does not own', async () => {
    const vault = fakeVault();
    const done = await vaultPut(vault, 'claude.../escape', 'x');
    expect(done.ok).toBe(false);
    expect(vault.slots.size).toBe(0);
  });

  it('leaves the slot alone when the copy does not read back equal', async () => {
    const vault = fakeVault();
    await vaultPut(vault, 'claude.default', 'first');
    vault.corrupt.add('claude.default.pending');
    const done = await vaultPut(vault, 'claude.default', 'second');
    expect(done.ok).toBe(false);
    expect(await vaultGet(vault, 'claude.default')).toBe('first');
  });
});

describe('a name minted from an address', () => {
  it('makes one a person recognises and never holds an at sign', () => {
    expect(loginNameFromEmail('greg@itavero.software')).toBe('greg.itavero');
    expect(loginNameFromEmail('a.b+c@example.co.uk')).toBe('a.bc.example');
    expect(loginNameFromEmail('greg@itavero.software')).not.toContain('@');
  });

  it('numbers a collision and answers null for an address that makes no name', () => {
    expect(loginNameFromEmail('greg@itavero.software', ['greg.itavero'])).toBe(
      'greg.itavero 2'
    );
    expect(loginNameFromEmail('@@@')).toBeNull();
    expect(loginNameFromEmail(null)).toBeNull();
    expect(nextKeptLoginName(['Kept 1'])).toBe('Kept 2');
  });

  it('refuses to mint the reserved name', () => {
    expect(loginNameFromEmail('default@x')).not.toBe(DEFAULT_LOGIN_NAME);
  });
});

describe('the record file', () => {
  it('drops an invalid row whole and names the reason', () => {
    writeKeptFile(root, {
      v: 1,
      slots: {
        'claude.default': { email: 'a@b.com', digest: 'f'.repeat(64), account: null, at: 1 },
        'claude.nonsense': { email: null, digest: 'f'.repeat(64), account: null, at: 1 },
        'codex.default': { email: null, digest: 'not a digest', account: null, at: 1 }
      }
    });
    const read = readKeptFile(root);
    expect(Object.keys(read.file.slots)).toEqual(['claude.default']);
    expect(read.problems.length).toBe(2);
    expect(read.problems.join(' ')).toContain('digest');
  });

  it('holds no credential of any kind', () => {
    writeKeptFile(root, {
      v: 1,
      slots: {
        'claude.default': { email: 'a@b.com', digest: 'f'.repeat(64), account: 'gdc', at: 1 }
      }
    });
    const text = readFileSync(join(root, 'kept.json'), 'utf8');
    expect(text).not.toContain('accessToken');
    expect(text).not.toContain('claudeAiOauth');
  });
});

describe('the three verbs', () => {
  function deps(files: Map<string, string>, live: LiveSession[] = []): KeepDeps {
    return {
      root,
      vault: fakeVault(),
      stores: fakeStores(files),
      liveSessions: async () => live,
      now: () => 1_000
    };
  }

  it('keeps what a store holds and puts the account it replaced on the menu', async () => {
    const files = new Map<string, string>();
    files.set('/home/.codex/auth.json', codexCredential('first', 'one@example.com'));
    const d = deps(files);
    const first = await observeProvider(d, 'codex');
    expect(first.events.some((e) => e.kind === 'kept')).toBe(true);

    // THE PERSON TYPES /login INSIDE A SESSION and the store now holds another
    // account. Nothing in Tortie did this; it is read afterwards.
    files.set('/home/.codex/auth.json', codexCredential('second', 'two@example.com'));
    const second = await observeProvider(d, 'codex');
    const promoted = second.events.find((e) => e.kind === 'promoted');
    expect(promoted?.login).toBe('one.example');
    expect(promoted?.says).toContain('one@example.com');

    // THE ACCOUNT HE LEFT IS STILL SELECTABLE, and its credential is the one
    // that was in the store before, byte for byte.
    const row = readLoginsFile(root).file.logins.find((l) => l.name === 'one.example');
    expect(row).toBeDefined();
    const kept = await vaultGet(d.vault, slotFor('codex', row?.id ?? ''));
    expect(kept).toBe(codexCredential('first', 'one@example.com'));
  });

  it('does not promote the same account twice however often the store changes', async () => {
    const files = new Map<string, string>();
    files.set('/home/.codex/auth.json', codexCredential('a', 'one@example.com'));
    const d = deps(files);
    await observeProvider(d, 'codex');
    files.set('/home/.codex/auth.json', codexCredential('b', 'two@example.com'));
    await observeProvider(d, 'codex');
    files.set('/home/.codex/auth.json', codexCredential('a', 'one@example.com'));
    await observeProvider(d, 'codex');
    files.set('/home/.codex/auth.json', codexCredential('b', 'two@example.com'));
    await observeProvider(d, 'codex');
    const names = readLoginsFile(root).file.logins.map((l) => l.name).sort();
    expect(names).toEqual(['one.example', 'two.example']);
  });

  it('puts a kept account back into the store the login runs under', async () => {
    const files = new Map<string, string>();
    files.set('/home/.codex/auth.json', codexCredential('a', 'one@example.com'));
    const d = deps(files);
    await observeProvider(d, 'codex');
    files.set('/home/.codex/auth.json', codexCredential('b', 'two@example.com'));
    await observeProvider(d, 'codex');

    const row = readLoginsFile(root).file.logins.find((l) => l.name === 'one.example');
    const dir = loginDirIn(root, 'codex', row?.id ?? '');
    // ITS OWN STORE IS EMPTY until it is chosen, which is exactly the row that
    // must not read as never signed in.
    expect(files.get(join(dir, 'auth.json'))).toBeUndefined();

    const put = await activateLogin(d, 'codex', 'one.example');
    expect(put).toEqual({ ok: true, wrote: true, says: 'one.example is signed in again.' });
    expect(files.get(join(dir, 'auth.json'))).toBe(codexCredential('a', 'one@example.com'));
    // NOTHING WAS WRITTEN INTO THE PERSON'S OWN LOCATION.
    expect(files.get('/home/.codex/auth.json')).toBe(codexCredential('b', 'two@example.com'));
  });

  it('writes nothing at all when the default login is chosen', async () => {
    const files = new Map<string, string>();
    files.set('/home/.codex/auth.json', codexCredential('a', 'one@example.com'));
    const d = deps(files);
    const before = new Map(files);
    const put = await activateLogin(d, 'codex', DEFAULT_LOGIN_NAME);
    expect(put).toEqual({
      ok: true,
      wrote: false,
      says: 'Your own sign in is used as it is.'
    });
    expect(files.get('/home/.codex/auth.json')).toBe(before.get('/home/.codex/auth.json'));
  });

  it('refuses to write a store a session is running under', async () => {
    const files = new Map<string, string>();
    files.set('/home/.codex/auth.json', codexCredential('a', 'one@example.com'));
    const d = deps(files, [{ provider: 'codex', login: 'one.example' }]);
    await observeProvider(d, 'codex');
    files.set('/home/.codex/auth.json', codexCredential('b', 'two@example.com'));
    await observeProvider(d, 'codex');
    const put = await activateLogin(d, 'codex', 'one.example');
    expect(put.ok).toBe(false);
    expect(put.ok ? '' : put.reason).toContain('A session is running');
  });

  it('forgets nothing when a store is caught mid change', async () => {
    const files = new Map<string, string>();
    files.set('/home/.codex/auth.json', codexCredential('a', 'one@example.com'));
    const d = deps(files);
    await observeProvider(d, 'codex');
    const kept = await vaultGet(d.vault, slotFor('codex', null));
    // A STORE THAT IS SUDDENLY EMPTY DOES NOT CLEAR THE COPY.
    files.delete('/home/.codex/auth.json');
    await observeProvider(d, 'codex');
    expect(await vaultGet(d.vault, slotFor('codex', null))).toBe(kept);
  });

  it('keeps a claude store the same way, from the account file beside it', async () => {
    const files = new Map<string, string>();
    files.set('/home/.claude/.credentials.json', claudeCredential('a'));
    files.set('/home/.claude.json', JSON.stringify({ oauthAccount: { emailAddress: 'one@example.com' } }));
    const d = deps(files);
    await observeProvider(d, 'claude');
    files.set('/home/.claude/.credentials.json', claudeCredential('b'));
    files.set('/home/.claude.json', JSON.stringify({ oauthAccount: { emailAddress: 'two@example.com' } }));
    const seen = await observeProvider(d, 'claude');
    expect(seen.events.find((e) => e.kind === 'promoted')?.login).toBe('one.example');
  });

  it('adds no login when the account did not change, only the token', async () => {
    const files = new Map<string, string>();
    files.set('/home/.codex/auth.json', codexCredential('a', 'one@example.com'));
    const d = deps(files);
    await observeProvider(d, 'codex');
    files.set('/home/.codex/auth.json', codexCredential('refreshed', 'one@example.com'));
    const seen = await observeProvider(d, 'codex');
    expect(seen.events.some((e) => e.kind === 'promoted')).toBe(false);
    expect(readLoginsFile(root).file.logins).toEqual([]);
    // AND THE COPY IS THE FRESH ONE, so an account put back is not a stale one.
    expect(await vaultGet(d.vault, slotFor('codex', null))).toBe(
      codexCredential('refreshed', 'one@example.com')
    );
  });

  it('says nothing about a login it has no copy of', async () => {
    const files = new Map<string, string>();
    const d = deps(files);
    const added = addLogin(root, 'codex', 'Spare');
    expect(added.ok).toBe(true);
    const put = await activateLogin(d, 'codex', 'Spare');
    expect(put).toEqual({
      ok: true,
      wrote: false,
      says: 'Tortie has no kept sign in for this one.'
    });
  });
});
