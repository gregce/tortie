/**
 * The list asks the WHOLE question (Phase 203).
 *
 * The first defect the operator reported: he added a login, completed the
 * vendor's own sign in, and Tortie said `Not signed in yet` for ever. On macOS
 * a claude login's credential is a keychain item named for the login's own
 * directory, and `listLogins` asks for a `.credentials.json` that macOS never
 * writes. `listLoginsAsking` is the fix, and this file holds the shape of it.
 *
 * NOTHING HERE OPENS A KEYCHAIN OR READS ANYBODY'S HOME. The ask is injected,
 * every test runs against a temporary root of its own, and the assertions
 * about the default login are assertions that no path was composed for it.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LoginProviderId } from '@shared/logins';
import { DEFAULT_LOGIN_NAME } from '@shared/logins';
import { loginsFileIn } from '../dirs';
import { addLogin, listLogins, listLoginsAsking } from '../store';

let root = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'p203-list-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** An ask that records what it was asked and answers from a small table. */
function asking(
  table: Record<string, { present: boolean; email: string | null }> = {}
): {
  ask: (
    provider: LoginProviderId,
    dir: string | null
  ) => Promise<{ present: boolean; email: string | null }>;
  asked: [string, string | null][];
} {
  const asked: [string, string | null][] = [];
  return {
    asked,
    ask: async (provider, dir) => {
      asked.push([provider, dir]);
      return table[`${provider} ${dir ?? ''}`] ?? { present: false, email: null };
    }
  };
}

describe('listLoginsAsking', () => {
  it('answers present for a login whose credential is only in the keychain', async () => {
    const added = addLogin(root, 'claude', 'Work');
    expect(added.ok).toBe(true);
    const dir = added.ok ? (added.dir ?? '') : '';
    // The FILE half says absent, which is what macOS always says, and the
    // cheap list still says so. That is the defect, held here so the fix is
    // seen to be a fix rather than a coincidence.
    const cheap = listLogins(root).logins.find((l) => l.name === 'Work');
    expect(cheap?.present).toBe(false);

    const { ask } = asking({
      [`claude ${dir}`]: { present: true, email: 'work@example.com' }
    });
    const whole = await listLoginsAsking(root, ask);
    const row = whole.logins.find((l) => l.name === 'Work');
    expect(row?.present).toBe(true);
    expect(row?.email).toBe('work@example.com');
  });

  it('asks about the default login with a null directory and never a path', async () => {
    const { ask, asked } = asking({
      'claude ': { present: true, email: 'greg@example.com' }
    });
    const snapshot = await listLoginsAsking(root, ask);
    expect(asked).toEqual([
      ['claude', null],
      ['codex', null]
    ]);
    const own = snapshot.logins.find((l) => l.provider === 'claude' && l.isDefault);
    expect(own?.name).toBe(DEFAULT_LOGIN_NAME);
    expect(own?.email).toBe('greg@example.com');
    expect(own?.present).toBe(true);
    // The codex default answered nothing, which is the honest row rather than
    // a guess: absent and not known.
    const codex = snapshot.logins.find((l) => l.provider === 'codex' && l.isDefault);
    expect(codex?.present).toBe(false);
    expect(codex?.email).toBeNull();
  });

  it('never asks about a login whose folder is gone', async () => {
    const added = addLogin(root, 'claude', 'Work');
    const dir = added.ok ? (added.dir ?? '') : '';
    rmSync(dir, { recursive: true, force: true });
    const { ask, asked } = asking({
      [`claude ${dir}`]: { present: true, email: 'ghost@example.com' }
    });
    const snapshot = await listLoginsAsking(root, ask);
    // REMOVING A LOGIN LEAVES THE SCOPED KEYCHAIN ITEM BEHIND, so a folder
    // that is gone must never be asked about: the item would answer present
    // for a directory that is not there.
    expect(asked.some(([, d]) => d === dir)).toBe(false);
    const row = snapshot.logins.find((l) => l.name === 'Work');
    expect(row?.present).toBe(false);
    expect(row?.email).toBeNull();
  });

  it('keeps the whole list when one ask rejects', async () => {
    addLogin(root, 'claude', 'Work');
    const snapshot = await listLoginsAsking(root, async (_provider, dir) => {
      if (dir !== null) throw new Error('the keychain is busy');
      return { present: true, email: 'greg@example.com' };
    });
    expect(snapshot.logins.map((l) => l.name)).toEqual([
      DEFAULT_LOGIN_NAME,
      'Work',
      DEFAULT_LOGIN_NAME
    ]);
    const row = snapshot.logins.find((l) => l.name === 'Work');
    expect(row?.present).toBe(false);
    expect(row?.email).toBeNull();
  });

  it('drops a hostile row whole and asks nothing about it', async () => {
    mkdirSync(root, { recursive: true });
    writeFileSync(
      loginsFileIn(root),
      JSON.stringify({
        v: 1,
        chosen: { claude: 'Escape' },
        logins: [{ provider: 'claude', id: '../elsewhere', name: 'Escape', createdAt: 1 }]
      }),
      'utf8'
    );
    const { ask, asked } = asking();
    const snapshot = await listLoginsAsking(root, ask);
    expect(snapshot.logins.filter((l) => !l.isDefault)).toEqual([]);
    expect(snapshot.problems.length).toBeGreaterThan(0);
    expect(asked).toEqual([
      ['claude', null],
      ['codex', null]
    ]);
  });

  it('carries the address onto the row of an added codex login', async () => {
    const added = addLogin(root, 'codex', 'Spare');
    expect(added.ok).toBe(true);
    const dir = added.ok ? (added.dir ?? '') : '';
    const { ask, asked } = asking({
      [`codex ${dir}`]: { present: true, email: 'spare@example.com' }
    });
    const snapshot = await listLoginsAsking(root, ask);
    expect(asked).toContainEqual(['codex', dir]);
    const row = snapshot.logins.find((l) => l.name === 'Spare');
    expect(row?.email).toBe('spare@example.com');
    expect(row?.chosen).toBe(false);
  });
});
