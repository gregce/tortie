/**
 * An account switch reports what actually happened (Phase 220, items 1 and 2 of
 * the goal document's failure-flow half).
 *
 * The four cases the brief names, driven through the REAL registered
 * `logins:choose` handler rather than a mock of its answer, because both
 * defects live in the seam between `activateLogin` and the registrar and a
 * test of either half alone walks past them.
 *
 *  - `unavailable_sessions_refuse_before_activation_writes`
 *  - `activation_exception_preserves_choice`
 *  - `partial_activation_reports_the_written_store`
 *  - `running_default_session_still_receives_chosen_account`
 *
 * WHAT WAS MEASURED AT THE PARENT, `b5cc017`. A rejected live-session query
 * with a default session running and a working query with no sessions at all
 * both answered `ok=true "one.example is signed in again."`, and an
 * `activateLogin` made to reject answered `ok=true` with `logins.json` holding
 * the new name. Both are green here and red with either repair removed.
 *
 * NOTHING HERE OPENS A KEYCHAIN, READS A HOME OR SPAWNS ANYTHING. The stores
 * are real files inside one temporary directory per test, the vault is a file
 * vault beside them, the `security` seam refuses every call, and the store
 * environment is an EMPTY map on purpose: `process.env` would let a
 * `CLAUDE_CONFIG_DIR` or a `CODEX_HOME` set on the machine running this suite
 * compose a default store path outside the scratch root.
 */

import { mkdtempSync, mkdirSync, readFileSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: {
    getPath: () => userData,
    getName: () => 'TortieTest'
  }
}));

/** The typed registrar, replaced by one that hands the handlers back. */
const handlers = new Map<string, (...args: unknown[]) => Promise<unknown>>();
vi.mock('../../typed-ipc', () => ({
  handle: (
    _ipc: unknown,
    channel: string,
    fn: (...args: unknown[]) => Promise<unknown>
  ) => {
    handlers.set(channel, fn);
  }
}));

const broadcasts: string[] = [];
vi.mock('../../typed-events', () => ({
  broadcastEvent: (name: string) => {
    broadcasts.push(name);
  }
}));

import { DEFAULT_LOGIN_NAME } from '../../../shared/logins';
import type { KeepDeps, LiveSession } from '../../credentials';

const { registerLoginsIpc } = await import('../ipc');
const { setKeepDeps, fileVault } = await import('../../credentials');
const keep = await import('../../credentials/keep');
const { readLoginsFile } = await import('../store');
const { loginDirIn } = await import('../dirs');
const { setLoginAccountDeps } = await import('../../usage/login-accounts');

const TOKEN = 'P220-TEST-TOKEN';

let scratch = '';
let home = '';
let root = '';
/**
 * What the live session seam answers this test.
 *
 * It stands in for `setLiveSessionsProbe`'s installed probe, which the shipped
 * seam forwards verbatim, rejection included: `liveSessionsSeam` in
 * `../../credentials/index.ts` is `probe === null ? [] : probe()`.
 */
let liveAnswer: () => Promise<LiveSession[]> = async () => [];

function codexCredential(who: string, nonce: string): string {
  const claims = { sub: `u-${who}`, email: `${who}@example.com` };
  const claim = Buffer.from(JSON.stringify(claims), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return JSON.stringify({
    OPENAI_API_KEY: null,
    tokens: {
      access_token: `${TOKEN}-${who}-${nonce}`,
      account_id: `acct-${who}`,
      id_token: `h.${claim}.s`
    }
  });
}

/** The vendor's own codex location, inside the scratch home and nowhere else. */
function codexDefault(): string {
  return join(home, '.codex', 'auth.json');
}

function writeFile(path: string, text: string): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, text, 'utf8');
}

function readIfThere(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

/**
 * The seams, over real files in the scratch root.
 *
 * `env` is empty rather than `process.env`, and `home` is the scratch home, so
 * no path this composes can leave the temporary directory.
 */
function deps(): KeepDeps {
  return {
    root,
    vault: fileVault(join(root, 'kept')),
    stores: {
      runner: { run: async () => ({ code: 1, stdout: '' }) },
      readText: async (path) => readIfThere(path),
      writeText: async (path, text) => {
        writeFile(path, text);
      },
      renamePath: async (from, to) => {
        writeFile(to, readFileSync(from, 'utf8'));
        rmSync(from, { force: true });
      },
      removePath: async (path) => {
        rmSync(path, { force: true });
      },
      env: {},
      home,
      keychainForClaude: false,
      userName: 'p220',
      wait: async () => undefined
    },
    liveSessions: () => liveAnswer(),
    now: () => 1_700_000_000_000
  };
}

/** The two accounts a person makes with one `/login`, the ordinary way. */
async function twoCodexAccounts(): Promise<{ promoted: string; dir: string }> {
  // EVERY OBSERVE IS REACHED THROUGH A CHANGE, because the held reading lives
  // for five seconds in a module the whole suite shares, so a plain
  // `logins:list` in the second test of a file would answer the first test's
  // facts. `logins:add` drops the hold and then lists, which is exactly what a
  // person pressing Add does.
  writeFile(codexDefault(), codexCredential('alice', '1'));
  await handlers.get('logins:add')?.(null, 'codex', 'seed-a');
  writeFile(codexDefault(), codexCredential('bob', '2'));
  await handlers.get('logins:add')?.(null, 'codex', 'seed-b');
  const rows = readLoginsFile(root).file.logins;
  const row = rows.find((l) => l.provider === 'codex' && l.name === 'alice.example');
  if (row === undefined) throw new Error(`no promoted login: ${JSON.stringify(rows)}`);
  return { promoted: row.name, dir: loginDirIn(root, 'codex', row.id) };
}

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'p220-activation-'));
  userData = join(scratch, 'userData');
  home = join(scratch, 'home');
  root = join(userData, 'gmux', 'logins');
  mkdirSync(root, { recursive: true });
  mkdirSync(home, { recursive: true });
  handlers.clear();
  broadcasts.length = 0;
  liveAnswer = async () => [];
  setKeepDeps(deps());
  // NOTHING IS ASKED OF A KEYCHAIN OR A HOME by the list this handler composes.
  setLoginAccountDeps({
    keychainHas: async () => false,
    exists: async () => false,
    readText: async () => null,
    env: {},
    home,
    now: () => 1_700_000_000_000
  });
  registerLoginsIpc({} as never);
});

afterEach(() => {
  setKeepDeps(null);
  setLoginAccountDeps(null);
  rmSync(scratch, { recursive: true, force: true });
});

describe('Phase 220: an account switch says what happened', () => {
  it('unavailable_sessions_refuse_before_activation_writes', async () => {
    const { promoted, dir } = await twoCodexAccounts();
    const before = readIfThere(codexDefault());
    // THE ANSWER CANNOT BE HAD. A core that has not opened the manifest, or one
    // that is closing, is exactly this.
    liveAnswer = async () => {
      throw new Error('the manifest is not open');
    };

    const result = (await handlers.get('logins:choose')?.(null, 'codex', promoted)) as {
      ok: boolean;
      reason?: string;
    };

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('could not check which sessions are running');
    // NEITHER ACTIVATION TARGET WAS WRITTEN: not the login's own store, and not
    // the person's own location.
    expect(existsSync(join(dir, 'auth.json'))).toBe(false);
    expect(readIfThere(codexDefault())).toBe(before);
    // AND THE SELECTED LOGIN IS UNCHANGED.
    expect(readLoginsFile(root).file.chosen['codex']).toBeUndefined();
  });

  it('a seam that answers something that is not a list has not answered', async () => {
    // THE FIX ROUND'S ARM (Phase 220). `liveSessionEvidence` guards the answer
    // with `Array.isArray` as well as catching the rejection, and nothing held
    // that guard up: removing it left every case in this file green. A seam
    // that resolves with `undefined`, which is what an injected function that
    // forgot its return value does, would then be spread into `.some(...)` and
    // the default lift decided on nothing at all.
    const { promoted, dir } = await twoCodexAccounts();
    const before = readIfThere(codexDefault());
    liveAnswer = (async () => undefined) as unknown as typeof liveAnswer;

    const result = (await handlers.get('logins:choose')?.(null, 'codex', promoted)) as {
      ok: boolean;
      reason?: string;
    };

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('could not check which sessions are running');
    expect(existsSync(join(dir, 'auth.json'))).toBe(false);
    expect(readIfThere(codexDefault())).toBe(before);
    expect(readLoginsFile(root).file.chosen['codex']).toBeUndefined();
  });

  it('a KNOWN empty answer is not the refusal, so Phase 211 is untouched', async () => {
    const { promoted, dir } = await twoCodexAccounts();
    liveAnswer = async () => [];

    const result = (await handlers.get('logins:choose')?.(null, 'codex', promoted)) as {
      ok: boolean;
      reason?: string;
    };

    expect(result.ok).toBe(true);
    // The login's own store is written whatever is running; only the DEFAULT
    // lift is the one a session decides.
    expect(readIfThere(join(dir, 'auth.json'))).toBe(codexCredential('alice', '1'));
    expect(readLoginsFile(root).file.chosen['codex']).toBe(promoted);
  });

  it('running_default_session_still_receives_chosen_account', async () => {
    const { promoted, dir } = await twoCodexAccounts();
    liveAnswer = async () => [{ provider: 'codex', login: null }];

    const result = (await handlers.get('logins:choose')?.(null, 'codex', promoted)) as {
      ok: boolean;
      reason?: string;
    };

    expect(result.ok).toBe(true);
    expect(readIfThere(join(dir, 'auth.json'))).toBe(codexCredential('alice', '1'));
    // THE PERSON'S OWN LOCATION FOLLOWS, which is the Phase 211 lift.
    expect(readIfThere(codexDefault())).toBe(codexCredential('alice', '1'));
    expect(readLoginsFile(root).file.chosen['codex']).toBe(promoted);
    // And the account it was written over is still somewhere.
    const names = readLoginsFile(root)
      .file.logins.filter((l) => l.provider === 'codex')
      .map((l) => l.name);
    expect(names).toContain('bob.example');
  });

  it('activation_exception_preserves_choice', async () => {
    const { promoted } = await twoCodexAccounts();
    const before = JSON.stringify(readLoginsFile(root).file);
    const threw = vi
      .spyOn(keep, 'activateLogin')
      .mockRejectedValue(new Error('the keychain fell over'));
    try {
      const result = (await handlers.get('logins:choose')?.(null, 'codex', promoted)) as {
        ok: boolean;
        reason?: string;
      };
      expect(result.ok).toBe(false);
      expect(result.reason).toContain('Something went wrong');
      // NOTHING WAS RECORDED. This is the whole finding: the file held the new
      // name at the parent and the person was told the switch had worked.
      expect(readLoginsFile(root).file.chosen['codex']).toBeUndefined();
      expect(JSON.stringify(readLoginsFile(root).file)).toBe(before);
    } finally {
      threw.mockRestore();
    }
  });

  it('partial_activation_reports_the_written_store, after an UNCLASSIFIED throw', async () => {
    const { promoted, dir } = await twoCodexAccounts();
    liveAnswer = async () => [{ provider: 'codex', login: null }];
    // THE FIRST LIFT LANDS AND THEN THE RECORD FILE STOPS BEING WRITABLE, which
    // is a throw no branch of the activation classifies: it leaves the record
    // update rather than the write, so it is the shape the parent swallowed.
    const installed = deps();
    setKeepDeps({
      ...installed,
      stores: {
        ...installed.stores,
        writeText: async (path, text) => {
          writeFile(path, text);
          if (path.startsWith(join(dir, 'auth.json'))) {
            rmSync(join(root, 'kept.json'), { force: true });
            mkdirSync(join(root, 'kept.json'), { recursive: true });
          }
        }
      }
    });

    const result = (await handlers.get('logins:choose')?.(null, 'codex', promoted)) as {
      ok: boolean;
      reason?: string;
    };

    // THE WRITE THAT HAPPENED IS REPORTED rather than hidden or rolled back.
    expect(readIfThere(join(dir, 'auth.json'))).toBe(codexCredential('alice', '1'));
    expect(result.ok).toBe(true);
    expect(String(result.reason)).toContain('did not finish');
    expect(readLoginsFile(root).file.chosen['codex']).toBe(promoted);
    // AND THE DEFAULT STORE STILL HOLDS THE ACCOUNT IT HELD, which is the
    // recovery copy: nothing was written over it and nothing was rolled back.
    expect(readIfThere(codexDefault())).toBe(codexCredential('bob', '2'));
  });

  it('a throw inside a lift that wrote nothing still names the store it was in', async () => {
    // THE FIX ROUND'S SECOND ARM (Phase 220). `activateLogin` tracks WHICH
    // store a lift is inside so an unclassified throw can say that this one
    // store holds either what it held or the chosen account, and nothing held
    // that up either: never setting it left every case green while the person
    // was told "nothing was changed" about a store that may have been written.
    //
    // The shape is the ordinary re-choose. The login's own store already holds
    // the account, so the first lift moves nothing, and the default lift is
    // then the only write there is and it throws.
    const { promoted, dir } = await twoCodexAccounts();
    liveAnswer = async () => [{ provider: 'codex', login: null }];
    // The login's own store already holds the account, the way it does on every
    // re-choose, and the person's own location still holds the other one.
    writeFile(join(dir, 'auth.json'), codexCredential('alice', '1'));
    expect(readIfThere(codexDefault())).toBe(codexCredential('bob', '2'));

    // AND THE RECORD FILE STOPS BEING WRITABLE once the default lift has begun,
    // which is a throw no branch of the activation classifies. The observe at
    // the top of `activateLogin` reads the same store first and runs OUTSIDE
    // the try, so it is the second reading of it that breaks the file.
    const installed = deps();
    const target = codexDefault();
    let readsOfDefault = 0;
    setKeepDeps({
      ...installed,
      stores: {
        ...installed.stores,
        readText: async (path) => {
          if (path.startsWith(target)) {
            readsOfDefault += 1;
            if (readsOfDefault === 2) {
              rmSync(join(root, 'kept.json'), { force: true });
              mkdirSync(join(root, 'kept.json'), { recursive: true });
            }
          }
          return installed.stores.readText(path);
        }
      }
    });

    const result = (await handlers.get('logins:choose')?.(null, 'codex', promoted)) as {
      ok: boolean;
      reason?: string;
    };

    // NOTHING WAS WRITTEN, so the choice stands as it was and the sentence
    // names the one store that may have been reached rather than claiming the
    // whole switch changed nothing.
    expect(result.ok).toBe(false);
    expect(String(result.reason)).toContain('Something went wrong');
    expect(String(result.reason)).toContain(DEFAULT_LOGIN_NAME);
    expect(String(result.reason)).not.toContain('nothing was changed');
  });

  it('partial_activation_reports_the_written_store', async () => {
    const { promoted, dir } = await twoCodexAccounts();
    liveAnswer = async () => [{ provider: 'codex', login: null }];
    // THE FIRST LIFT LANDS AND THE SECOND ONE THROWS. The seam that breaks is
    // the store writer, on the person's own location alone, so the login's own
    // store really is written before the throw.
    const installed = deps();
    const target = codexDefault();
    setKeepDeps({
      ...installed,
      stores: {
        ...installed.stores,
        writeText: async (path, text) => {
          if (path.startsWith(target)) throw new Error('the disk went away');
          writeFile(path, text);
        }
      }
    });

    const result = (await handlers.get('logins:choose')?.(null, 'codex', promoted)) as {
      ok: boolean;
      reason?: string;
    };

    // THE WRITE THAT HAPPENED IS NOT HIDDEN.
    expect(readIfThere(join(dir, 'auth.json'))).toBe(codexCredential('alice', '1'));
    expect(result.ok).toBe(true);
    expect(String(result.reason)).toContain('was not reached');
    expect(readLoginsFile(root).file.chosen['codex']).toBe(promoted);
    // AND THE RECOVERY COPY SURVIVES: the account the default store still holds
    // is one the person can go back to.
    const names = readLoginsFile(root)
      .file.logins.filter((l) => l.provider === 'codex')
      .map((l) => l.name)
      .sort();
    expect(names).toContain('bob.example');
    expect(readIfThere(codexDefault())).toBe(codexCredential('bob', '2'));
  });
});
