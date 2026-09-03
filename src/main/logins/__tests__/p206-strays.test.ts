/**
 * A login the person removed leaves nothing behind (Phase 206).
 *
 * The Phase 203 verifier found the operator's own disk holding two claude
 * login directories while `logins.json` held one row. Remove deleted the row
 * and not the rest, so this file pins the two halves that live in the logins
 * domain: which directories are strays, and what a stray's removal is allowed
 * to touch.
 *
 * NOTHING HERE OPENS A KEYCHAIN OR READS ANYBODY'S HOME. Every test runs
 * against a temporary root of its own.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loginDirIn, loginsFileIn } from '../dirs';
import { addLogin, removeStrayLoginDir, strayLoginIds } from '../store';

let root = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'p206-strays-'));
});
afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

/** Write the file whole, the way a hand edit or an older Tortie would. */
function writeRows(rows: unknown): void {
  writeFileSync(
    loginsFileIn(root),
    JSON.stringify({ v: 1, chosen: {}, logins: rows }),
    'utf8'
  );
}

describe('strayLoginIds', () => {
  it('names a directory no row names', () => {
    addLogin(root, 'claude', 'Kept');
    const stray = '0123456789abcdef';
    mkdirSync(loginDirIn(root, 'claude', stray), { recursive: true });
    expect(strayLoginIds(root, 'claude')).toEqual([stray]);
  });

  it('names nothing when every directory has a row', () => {
    addLogin(root, 'claude', 'One');
    addLogin(root, 'claude', 'Two');
    expect(strayLoginIds(root, 'claude')).toEqual([]);
  });

  it('keeps a row the READER drops for a name collision', () => {
    // THE ATTACK. Two rows share a name, so `readLoginsFile` drops the second
    // one whole. It is still a row the person added and its directory still
    // holds their credential, so sweeping on the sanitized list would delete
    // a live login because some other row shares its name.
    const live = '1111111111111111';
    const shadow = '2222222222222222';
    for (const id of [live, shadow]) {
      mkdirSync(loginDirIn(root, 'claude', id), { recursive: true });
    }
    writeRows([
      { provider: 'claude', id: live, name: 'Work', createdAt: 1 },
      { provider: 'claude', id: shadow, name: 'Work', createdAt: 2 }
    ]);
    expect(strayLoginIds(root, 'claude')).toEqual([]);
  });

  it('sweeps nothing when the file is absent or will not parse', () => {
    const id = '3333333333333333';
    mkdirSync(loginDirIn(root, 'claude', id), { recursive: true });
    // No file at all. Tortie cannot tell a removal from a lost file, and the
    // two answers differ by the person's credentials.
    expect(strayLoginIds(root, 'claude')).toEqual([]);
    writeFileSync(loginsFileIn(root), '{ not json', 'utf8');
    expect(strayLoginIds(root, 'claude')).toEqual([]);
    writeFileSync(loginsFileIn(root), JSON.stringify({ v: 1 }), 'utf8');
    expect(strayLoginIds(root, 'claude')).toEqual([]);
    // And with a file it CAN read, the same directory is a stray.
    writeRows([]);
    expect(strayLoginIds(root, 'claude')).toEqual([id]);
  });

  it('ignores an entry whose name is not an id', () => {
    writeRows([]);
    mkdirSync(join(root, 'claude', 'not-an-id'), { recursive: true });
    expect(strayLoginIds(root, 'claude')).toEqual([]);
  });

  it('reads each provider on its own', () => {
    writeRows([]);
    const id = '4444444444444444';
    mkdirSync(loginDirIn(root, 'codex', id), { recursive: true });
    expect(strayLoginIds(root, 'claude')).toEqual([]);
    expect(strayLoginIds(root, 'codex')).toEqual([id]);
  });
});

describe('removeStrayLoginDir', () => {
  it('removes the folder', () => {
    const id = '5555555555555555';
    const dir = loginDirIn(root, 'claude', id);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '.credentials.json'), 'x', 'utf8');
    expect(removeStrayLoginDir(root, 'claude', id)).toBe(true);
    expect(existsSync(dir)).toBe(false);
  });

  it('unlinks a stray that is a LINK and never reaches through it', () => {
    const victim = join(root, 'not-tortie-own');
    mkdirSync(victim, { recursive: true });
    writeFileSync(join(victim, 'auth.json'), 'OWN', 'utf8');
    const id = '6666666666666666';
    mkdirSync(join(root, 'claude'), { recursive: true });
    symlinkSync(victim, loginDirIn(root, 'claude', id));
    expect(removeStrayLoginDir(root, 'claude', id)).toBe(true);
    expect(existsSync(loginDirIn(root, 'claude', id))).toBe(false);
    expect(readFileSync(join(victim, 'auth.json'), 'utf8')).toBe('OWN');
  });

  it('refuses an id that is not one, so no path is composed', () => {
    for (const id of ['..', '../..', '', 'a/b', '/etc', 'A'.repeat(16)]) {
      expect(removeStrayLoginDir(root, 'claude', id)).toBe(false);
    }
  });
});
