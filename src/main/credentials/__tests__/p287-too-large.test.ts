/**
 * Phase 287, as Phase 304 leaves it. The vendor's own keychain item is the one
 * store in this domain that can refuse a sign in for its size, the refusal has
 * a name, and nothing is written over anything.
 *
 * Every test here runs the SHIPPING modules — `sealedVault` over the test seal,
 * `observeProvider`, `activateLogin`, `liftStore` through it, `safeSwap`, and
 * the vendor's `keychainTarget` over the Phase 281 first-match `security` model
 * — over injected seams. No keychain is opened, no process is spawned, no
 * vendor location on this machine is named, and the only paths touched are
 * inside a scratch directory each test makes and removes.
 *
 * WHAT PHASE 304 DID TO PHASE 287, so a later round reads this file right.
 * Phase 287 pinned four losses and a dead end (V1, L2, L3, L4, L6), every one
 * of them a refusal of TORTIE'S OWN vault, which was then a keychain item on one
 * `security` line with a ceiling of about 1,946 bytes. Phase 304 made that
 * vault a sealed file with no ceiling, so those five cases no longer exist:
 * the store that refused them keeps them. What survives is the case Phase 287's
 * reverify found the sentence blaming the wrong store for — the VENDOR'S item,
 * which Claude Code itself reads over one `security` line and which Tortie
 * writes the vendor's way (Phase 281), unchanged on purpose:
 *
 *  - L5a: the login's own item cannot take the sign in Tortie keeps for it.
 *    The click is refused with the one sentence, and no item is added.
 *  - L5b: the login's own store already holds its account, a default session
 *    runs, and the DEFAULT item cannot take the sign in. The choice stands, the
 *    default item is untouched, and the reason travels out so the toast can say
 *    the running session keeps its sign in.
 *
 * The last describe holds what became true instead: Tortie's own store sends
 * no `security` line at all, and the stores Phase 287 could only refuse are
 * kept whole.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LOGIN_TOO_LARGE_SENTENCE } from '@shared/login-copy';
import { DEFAULT_LOGIN_NAME } from '@shared/logins';
import { loginDirIn } from '../../logins/dirs';
import { addLogin, readLoginsFile } from '../../logins/store';
import { readKeptFile, updateKeptFile } from '../kept';
import {
  activateLogin,
  observeProvider,
  type KeepDeps,
  type LiveSession
} from '../keep';
import type { LockDeps } from '../locks';
import { credentialDigest } from '../payload';
import { claudeWriteService, type StoreDeps } from '../stores';
import {
  legacyKeychainVault,
  NO_LEGACY,
  sealedVault,
  slotFor,
  vaultGet,
  vaultPut,
  type VaultBackend
} from '../vault';
import { firstMatchSecurity, type KeychainRow } from './first-match-security';
import { testSeal } from './test-seal';

let root = '';
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'p287-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** In-memory lock seams, so a claude write here makes no real directory. */
function memLocks(): LockDeps {
  const dirs = new Set<string>();
  let clock = 1_000;
  return {
    mkdir: (path) => (dirs.has(path) ? false : (dirs.add(path), true)),
    mtimeMs: (path) => (dirs.has(path) ? clock : null),
    rmdir: (path) => {
      dirs.delete(path);
    },
    touch: () => undefined,
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
    setInterval: () => ({ clear: () => undefined })
  };
}

/**
 * A codex credential of a chosen size in BYTES, for a chosen account.
 *
 * The padding is a long access token, so the payload stays exactly what
 * `isCredentialPayload` admits and nothing here is a shape no vendor writes.
 * 2,100 bytes was over the cap for every slot of the keychain vault Phase 287
 * measured, and it is about half the size of the real `~/.codex/auth.json`
 * that phase measured at 4,193 bytes.
 */
function codexCredential(email: string | null, bytes = 160): string {
  const claims = email === null ? { sub: 'acct' } : { sub: 'acct', email };
  const idToken = Buffer.from(JSON.stringify(claims), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const shell = (token: string): string =>
    JSON.stringify({
      OPENAI_API_KEY: null,
      tokens: {
        access_token: token,
        account_id: 'acct',
        ...(email === null ? {} : { id_token: `h.${idToken}.s` })
      }
    });
  const empty = Buffer.byteLength(shell(''), 'utf8');
  if (bytes < empty + 1) throw new Error('a codex credential cannot be that small');
  return shell(`p287-${'x'.repeat(bytes - empty - 5)}`);
}

/** A claude credential of a chosen size in BYTES. */
function claudeCredential(bytes = 160): string {
  const shell = (token: string): string =>
    JSON.stringify({ claudeAiOauth: { accessToken: token, subscriptionType: 'max' } });
  const empty = Buffer.byteLength(shell(''), 'utf8');
  return shell(`p287-${'x'.repeat(bytes - empty - 5)}`);
}

/** Whose sign in a claude directory is, in the file claude writes it to. */
function claudeAccountFile(email: string): string {
  return JSON.stringify({ oauthAccount: { emailAddress: email } });
}

/** The whole file system this domain sees, as a map of path to text. */
function fakeStores(
  files: Map<string, string>,
  over: Partial<StoreDeps> = {}
): StoreDeps {
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
    userName: 'p287-os',
    wait: async () => undefined,
    ...over
  };
}

/** Tortie's own vault, the REAL sealed backend, with no legacy item to read. */
function sealedVaultOver(): VaultBackend {
  return sealedVault(join(root, 'kept'), testSeal(), NO_LEGACY);
}

function keepOver(
  stores: StoreDeps,
  vault: VaultBackend,
  live: LiveSession[] = []
): KeepDeps {
  return {
    root,
    vault,
    stores,
    liveSessions: async () => live,
    now: () => 1_000,
    lockDeps: memLocks()
  };
}

/**
 * A login Tortie has already kept, set up directly rather than through a
 * `/login` story, so each test below states only the shape it is about.
 */
async function keptLogin(
  vault: VaultBackend,
  provider: 'claude' | 'codex',
  name: string,
  payload: string,
  email: string | null
): Promise<{ id: string; dir: string; slot: string }> {
  expect(addLogin(root, provider, name).ok).toBe(true);
  const row = readLoginsFile(root).file.logins.find((l) => l.name === name);
  if (row === undefined) throw new Error('the fixture lost its login');
  const slot = slotFor(provider, row.id);
  expect(await vaultPut(vault, slot, payload)).toEqual({ ok: true });
  updateKeptFile(root, {
    [slot]: {
      email,
      subject: 'acct',
      digest: credentialDigest(payload),
      account: null,
      from: null,
      at: 1,
      superseded: null
    }
  });
  return { id: row.id, dir: loginDirIn(root, provider, row.id), slot };
}

/**
 * THE VENDOR ACCOUNT IS 60 CHARACTERS, which is what puts the vendor's staged
 * line over the cap: the default item's staged line carries 42 bytes of
 * command, 38 of service, the account and two hex characters per payload byte,
 * and a login's staged line 9 more for the directory digest.
 */
const VENDOR_ACCOUNT = `p287${'a'.repeat(56)}`;

/** 1,940 bytes: 42 + 60 + 38 + 3,880 = 4,020 for the default item, over the 4,000 byte cap. */
const OVER_THE_VENDOR_CAP = 1_940;

/** A claude world over the keychain: the person's own small item, and a login of `bytes`. */
async function claudeWorld(
  bytes: number,
  live: LiveSession[],
  loginItemHoldsIt: boolean
): Promise<{
  rows: KeychainRow[];
  runner: ReturnType<typeof firstMatchSecurity>;
  vault: VaultBackend;
  d: KeepDeps;
  payload: string;
  own: string;
  work: { id: string; dir: string; slot: string };
}> {
  expect(VENDOR_ACCOUNT.length).toBe(60);
  const files = new Map<string, string>();
  files.set('/home/.claude.json', claudeAccountFile('own@example.com'));
  const own = claudeCredential();
  const rows: KeychainRow[] = [
    { service: 'Claude Code-credentials', account: VENDOR_ACCOUNT, payload: own, mdat: '20260916000000Z' }
  ];
  const runner = firstMatchSecurity(rows);
  const stores = fakeStores(files, { runner, env: { USER: VENDOR_ACCOUNT }, keychainForClaude: true });
  const vault = sealedVaultOver();
  const d = keepOver(stores, vault, live);
  const payload = claudeCredential(bytes);
  expect(Buffer.byteLength(payload, 'utf8')).toBe(bytes);
  const work = await keptLogin(vault, 'claude', 'work', payload, 'work@example.com');
  if (loginItemHoldsIt) {
    files.set(join(work.dir, '.claude.json'), claudeAccountFile('work@example.com'));
    rows.push({
      service: claudeWriteService(work.dir),
      account: VENDOR_ACCOUNT,
      payload,
      mdat: '20260916000001Z'
    });
  }
  return { rows, runner, vault, d, payload, own, work };
}

/** Every vendor row, copied, so a later comparison is by value. */
const vendorRows = (rows: KeychainRow[]): KeychainRow[] =>
  rows.filter((r) => r.service.startsWith('Claude Code-credentials')).map((r) => ({ ...r }));

describe("Phase 287, kept by Phase 304: the agent's own item is the one store that can refuse for size", () => {
  it("L5a: the login's own item cannot take the sign in Tortie keeps: refused with the sentence, no item added", async () => {
    const { rows, runner, vault, d, payload, work } = await claudeWorld(OVER_THE_VENDOR_CAP, [], false);
    const before = vendorRows(rows);

    const put = await activateLogin(d, 'claude', 'work');
    expect(put).toEqual({ ok: false, reason: LOGIN_TOO_LARGE_SENTENCE, why: 'too-large' });
    // NO ITEM WAS ADDED for the login's own store, staged or committed, and the
    // kept copy is whole: Tortie's own store held it all along.
    expect(rows.filter((r) => r.service.startsWith('Claude Code-credentials-'))).toEqual([]);
    expect(vendorRows(rows)).toEqual(before);
    expect(await vaultGet(vault, work.slot)).toBe(payload);
    // NOT ONE `-i` LINE reached the runner: the stage was refused in front of
    // the spawn, which is Phase 287's cap doing exactly what it did.
    expect(runner.sent.filter((c) => c.argv[0] === '-i')).toEqual([]);
  });

  it("L5b: the login's own store holds its account, a default session runs, and the default item cannot take it: the choice stands", async () => {
    const { rows, vault, d, payload, own, work } = await claudeWorld(
      OVER_THE_VENDOR_CAP,
      [{ provider: 'claude', login: null }],
      true
    );
    const put = await activateLogin(d, 'claude', 'work');
    // The login's own store already holds the account, so nothing was written
    // there and every new session under it works; the running default session
    // was not moved because the agent's own item cannot take the sign in. The
    // choice stands and the reason travels out for the toast.
    expect(put).toEqual({
      ok: true,
      wrote: false,
      says: 'That account is already in place.',
      why: 'too-large'
    });
    // THE DEFAULT ITEM IS BYTE IDENTICAL: the stage was refused before a line
    // was sent, so the person's own sign in was never touched.
    const defaultItem = rows.find(
      (r) => r.service === 'Claude Code-credentials' && r.account === VENDOR_ACCOUNT
    );
    expect(defaultItem?.payload).toBe(own);
    expect(rows.filter((r) => r.service.startsWith('Claude Code-credentials.'))).toEqual([]);
    // The outgoing default account was promoted into a login of its own BEFORE
    // the write was tried, so it is on the menu whatever the item could take.
    const logins = readLoginsFile(root).file.logins.filter((l) => l.provider === 'claude');
    expect(logins.map((l) => l.name).sort()).toEqual(['own.example', 'work']);
    const ownRow = logins.find((l) => l.name === 'own.example');
    expect(ownRow).toBeDefined();
    expect(await vaultGet(vault, slotFor('claude', ownRow?.id ?? ''))).toBe(own);
    // The login's own item is untouched too.
    const loginItem = rows.find((r) => r.service === claudeWriteService(work.dir));
    expect(loginItem?.payload).toBe(payload);
    expect(await vaultGet(vault, work.slot)).toBe(payload);
  });

  it('L5b, the control: with no default session nothing failed, so nothing is named', async () => {
    const { rows, d, payload, work } = await claudeWorld(OVER_THE_VENDOR_CAP, [], true);
    const before = vendorRows(rows);
    const put = await activateLogin(d, 'claude', 'work');
    expect(put).toEqual({ ok: true, wrote: false, says: 'That account is already in place.' });
    expect('why' in put).toBe(false);
    expect(vendorRows(rows)).toEqual(before);
    expect(rows.find((r) => r.service === claudeWriteService(work.dir))?.payload).toBe(payload);
  });

  it('the control for the cap: a sign in the agent CAN hold is put back the vendor way, with -a first', async () => {
    const small = 160;
    const { rows, d, payload, work } = await claudeWorld(small, [], false);
    const put = await activateLogin(d, 'claude', 'work');
    expect(put).toEqual({ ok: true, wrote: true, says: 'work is signed in again.' });
    const loginItem = rows.find((r) => r.service === claudeWriteService(work.dir));
    expect(loginItem?.payload).toBe(payload);
    expect(loginItem?.account).toBe(VENDOR_ACCOUNT);
  });
});

describe("Phase 304: Tortie's own store has no line, so the stores Phase 287 could only refuse are kept", () => {
  it('keeps a 2,100 byte codex sign in, and sends no security line doing it', async () => {
    const runner = firstMatchSecurity([]);
    const vault = sealedVault(join(root, 'kept'), testSeal(), legacyKeychainVault(runner, root));
    const slot = slotFor('codex', 'a'.repeat(16));
    const payload = codexCredential('one@example.com', 2_100);
    // At `a4f44588` this answered "Nothing could be written, so nothing
    // changed."; at Phase 287's head it answered the sentence with its name.
    expect(await vaultPut(vault, slot, payload)).toEqual({ ok: true });
    expect(await vaultGet(vault, slot)).toBe(payload);
    // NOT ONE ARGV: the write is a file, its read-back is the file, the staged
    // discard is the file, and a hit never asks the legacy arm.
    expect(runner.sent).toEqual([]);
  });

  it('an observe of a default store one security line could not carry keeps it, and the row carries no size', async () => {
    const files = new Map<string, string>();
    const big = codexCredential('own@example.com', 2_100);
    files.set('/home/.codex/auth.json', big);
    const vault = sealedVaultOver();
    const d = keepOver(fakeStores(files), vault);

    const seen = await observeProvider(d, 'codex');
    // The default row draws as a mirrored capture always has (the person's own
    // location is never restored into), and nothing on it is a size.
    expect(seen.facts.get('')).toEqual({ kept: false, restores: false, email: 'own@example.com' });
    expect(Object.keys(seen.facts.get('') ?? {}).sort()).toEqual(['email', 'kept', 'restores']);
    expect(seen.events).toEqual([
      {
        kind: 'kept',
        provider: 'codex',
        login: DEFAULT_LOGIN_NAME,
        says: 'Tortie kept own@example.com so it can be put back.'
      }
    ]);
    expect(await vaultGet(vault, slotFor('codex', null))).toBe(big);
    expect(readKeptFile(root).file.slots[slotFor('codex', null)]?.digest).toBe(credentialDigest(big));
    expect(files.get('/home/.codex/auth.json')).toBe(big);
  });

  it("the default lift over a 2,100 byte default store keeps and promotes it, so the person's own sign in survives the switch", async () => {
    // Phase 287's L3, inverted. At `a4f44588` this switch DESTROYED the sign
    // in; at Phase 287's head it was refused with the sentence; now the rolling
    // copy holds it, the outgoing account gets a login, and the lift reaches
    // the running session.
    const files = new Map<string, string>();
    const big = codexCredential('own@example.com', 2_100);
    files.set('/home/.codex/auth.json', big);
    const vault = sealedVaultOver();
    const d = keepOver(fakeStores(files), vault, [{ provider: 'codex', login: null }]);
    const kept = codexCredential('work@example.com');
    const work = await keptLogin(vault, 'codex', 'work', kept, 'work@example.com');

    const put = await activateLogin(d, 'codex', 'work');
    expect(put).toEqual({ ok: true, wrote: true, says: 'work is signed in again.' });
    expect(files.get('/home/.codex/auth.json')).toBe(kept);
    expect(files.get(join(work.dir, 'auth.json'))).toBe(kept);
    const logins = readLoginsFile(root).file.logins.filter((l) => l.provider === 'codex');
    expect(logins.map((l) => l.name).sort()).toEqual(['own.example', 'work']);
    const ownRow = logins.find((l) => l.name === 'own.example');
    expect(await vaultGet(vault, slotFor('codex', ownRow?.id ?? ''))).toBe(big);
  });

  it('a login whose own store grew past the old cap under the same account is captured and in place', async () => {
    // Phase 287's L6, inverted: nothing is refused, nothing is named, and the
    // grown credential is what Tortie now keeps for the login.
    const files = new Map<string, string>();
    files.set('/home/.codex/auth.json', codexCredential('own@example.com'));
    const vault = sealedVaultOver();
    const d = keepOver(fakeStores(files), vault);
    const work = await keptLogin(vault, 'codex', 'work', codexCredential('work@example.com'), 'work@example.com');
    const grown = codexCredential('work@example.com', 2_100);
    files.set(join(work.dir, 'auth.json'), grown);

    const put = await activateLogin(d, 'codex', 'work');
    expect(put).toEqual({ ok: true, wrote: false, says: 'That account is already in place.' });
    expect('why' in put).toBe(false);
    expect(files.get(join(work.dir, 'auth.json'))).toBe(grown);
    expect(await vaultGet(vault, work.slot)).toBe(grown);
  });

  it('STATED, NOT FIXED: a capture refused for a reason that is NOT size still writes over the unkept sign in', async () => {
    // build/p287/SPEC.md §7 and the Phase 304 entry's last refusal. A default
    // store whose capture fails for a reason with no name (here: the vault
    // refusing the default slot; in the app: the seal unavailable, or a read
    // back that disagreed) is still written over, exactly as it was before
    // either phase. The test exists so the narrowness is a measured fact rather
    // than a claim, and so a later round that fixes it has to edit this.
    const files = new Map<string, string>();
    const gone = codexCredential('other@example.com');
    const slots = new Map<string, string>();
    let refuseDefaultSlot = false;
    const vault: VaultBackend = {
      get: async (slot) => slots.get(slot) ?? null,
      put: async (slot, payload) => {
        if (refuseDefaultSlot && slot.startsWith('codex.default')) {
          throw new Error('refused for a reason with no name');
        }
        slots.set(slot, payload);
      },
      del: async (slot) => {
        slots.delete(slot);
      }
    };
    const own = codexCredential('own@example.com');
    files.set('/home/.codex/auth.json', own);
    const d = keepOver(fakeStores(files), vault, [{ provider: 'codex', login: null }]);
    const kept = codexCredential('work@example.com');
    const work = await keptLogin(vault, 'codex', 'work', kept, 'work@example.com');
    // The person's own account, kept in the default slot AND held in a login of
    // its own, so the promotion below answers held.
    await observeProvider(d, 'codex');
    await keptLogin(vault, 'codex', 'own.example', own, 'own@example.com');
    // A THIRD ACCOUNT signed in, and its capture cannot be made.
    files.set('/home/.codex/auth.json', gone);
    refuseDefaultSlot = true;

    const put = await activateLogin(d, 'codex', 'work');
    expect(put).toEqual({ ok: true, wrote: true, says: 'work is signed in again.' });
    expect(files.get('/home/.codex/auth.json')).toBe(kept);
    expect(files.get(join(work.dir, 'auth.json'))).toBe(kept);
    // The unkept third account is gone from the machine. That is today's
    // behaviour and neither phase changes it.
    expect([...slots.values()]).not.toContain(gone);
  });
});
