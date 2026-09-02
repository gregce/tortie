/**
 * The logins store (Phase 202), written as the adversary rather than as the
 * happy path.
 *
 * What this file is defending is a person's own vendor sign in. The failure
 * modes worth writing tests for are the ones where Tortie could reach outside
 * its own data directory: a store file whose id names a parent directory, a
 * remove aimed at the default location, a name that is really a path, and a
 * chosen login whose directory somebody deleted underneath it.
 *
 * NOTHING HERE TOUCHES THE PERSON'S HOME. Every test runs against a temporary
 * root of its own, and the assertions about the default login are assertions
 * that Tortie composed NO PATH at all for it.
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
import { DEFAULT_LOGIN_NAME, sanitizeLoginName } from '@shared/logins';
import { isOwnedLoginDir, loginDirIn, loginDirOnDisk, loginsFileIn } from '../dirs';
import {
  addLogin,
  chooseLogin,
  effectiveLogin,
  listLogins,
  readLoginsFile,
  removeLogin,
  resolveLoginDir
} from '../store';

let root = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'p202-logins-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

function writeRaw(text: string): void {
  mkdirSync(root, { recursive: true });
  writeFileSync(loginsFileIn(root), text, 'utf8');
}

describe('the name filter', () => {
  it('takes a label and refuses a path, a token and the reserved word', () => {
    expect(sanitizeLoginName('Work')).toBe('Work');
    expect(sanitizeLoginName('  Work 2  ')).toBe('Work 2');
    expect(sanitizeLoginName('team.eu')).toBe('team.eu');
    expect(sanitizeLoginName('../../.claude')).toBeNull();
    expect(sanitizeLoginName('/Users/gdc/.claude')).toBeNull();
    expect(sanitizeLoginName('.hidden')).toBeNull();
    expect(sanitizeLoginName('a/b')).toBeNull();
    expect(sanitizeLoginName(DEFAULT_LOGIN_NAME)).toBeNull();
    expect(sanitizeLoginName('default')).toBeNull();
    expect(sanitizeLoginName('x'.repeat(33))).toBeNull();
    expect(sanitizeLoginName(42)).toBeNull();
  });
});

describe('the ownership rule', () => {
  it('accepts a direct child of a provider root and nothing else', () => {
    expect(isOwnedLoginDir(root, 'claude', loginDirIn(root, 'claude', 'a'.repeat(16)))).toBe(true);
    // The provider root itself is not a login.
    expect(isOwnedLoginDir(root, 'claude', join(root, 'claude'))).toBe(false);
    // Deeper than a login.
    expect(isOwnedLoginDir(root, 'claude', join(root, 'claude', 'x', 'y'))).toBe(false);
    // The other provider's tree.
    expect(isOwnedLoginDir(root, 'claude', join(root, 'codex', 'x'))).toBe(false);
    // Outside the root entirely, which is the whole point.
    expect(isOwnedLoginDir(root, 'claude', join(root, '..', 'elsewhere'))).toBe(false);
    expect(isOwnedLoginDir(root, 'claude', '/Users/somebody/.claude')).toBe(false);
    expect(isOwnedLoginDir(root, 'claude', 'relative/path')).toBe(false);
    expect(isOwnedLoginDir(root, 'claude', '')).toBe(false);
  });
});

describe('a login directory that is a link', () => {
  /**
   * THE ONE ESCAPE THE STRING RULE CANNOT SEE, and the Phase 202 verifier
   * found it in the running app rather than in the source. `resolve` does not
   * follow a link, so an entry named by sixteen hex characters that is really
   * a symlink to another directory on the machine is spelled inside the root
   * and passes every spelling test there is. It was listed as present,
   * chosen, put on a pane as `CLAUDE_CONFIG_DIR` and read by the meter, and
   * that variable carries claude's settings, hooks, skills, plugins and
   * agents with it.
   *
   * Every test here plants a REAL link before anything reads the store, which
   * is the threat model: whoever can write the logins directory writes it
   * while Tortie is not looking.
   */
  function outsideWithCredential(): string {
    const outside = join(root, '..', `p202-outside-${process.pid.toString(36)}`);
    mkdirSync(outside, { recursive: true });
    writeFileSync(
      join(outside, '.credentials.json'),
      '{"claudeAiOauth":{"accessToken":"not-tortie-own"}}',
      'utf8'
    );
    return outside;
  }

  it('refuses an entry that is a link out of the owned root, and reads nothing in it', () => {
    const outside = outsideWithCredential();
    try {
      const id = 'd'.repeat(16);
      mkdirSync(join(root, 'claude'), { recursive: true });
      symlinkSync(outside, loginDirIn(root, 'claude', id));
      writeRaw(
        JSON.stringify({
          v: 1,
          chosen: { claude: 'Planted' },
          logins: [{ provider: 'claude', id, name: 'Planted', createdAt: 1 }]
        })
      );
      // The spelling rule says yes, which is exactly why the disk rule exists.
      expect(isOwnedLoginDir(root, 'claude', loginDirIn(root, 'claude', id))).toBe(true);
      expect(loginDirOnDisk(root, 'claude', loginDirIn(root, 'claude', id))).toBe('escapes');
      const read = readLoginsFile(root);
      expect(read.file.logins).toHaveLength(0);
      expect(read.problems.join(' ')).toContain('not one Tortie owns');
      // The chosen name goes with the dropped row.
      expect(read.file.chosen['claude']).toBeUndefined();
      // Nothing lists it, nothing resolves it, and nothing may choose it.
      expect(listLogins(root).logins.filter((l) => !l.isDefault)).toHaveLength(0);
      expect(resolveLoginDir(root, 'claude', 'Planted').dir).toBeNull();
      expect(effectiveLogin(root, 'claude').dir).toBeNull();
      expect(chooseLogin(root, 'claude', 'Planted').ok).toBe(false);
      // AND THE DIRECTORY IT POINTED AT IS UNTOUCHED. A refusal never deletes.
      expect(existsSync(join(outside, '.credentials.json'))).toBe(true);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('never reports a credential it had to follow a link to find', () => {
    const outside = outsideWithCredential();
    try {
      const id = 'e'.repeat(16);
      mkdirSync(join(root, 'claude'), { recursive: true });
      symlinkSync(outside, loginDirIn(root, 'claude', id));
      writeRaw(
        JSON.stringify({
          v: 1,
          chosen: {},
          logins: [{ provider: 'claude', id, name: 'Planted', createdAt: 1 }]
        })
      );
      expect(
        listLogins(root).logins.some((l) => l.name === 'Planted' && l.present)
      ).toBe(false);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('refuses a provider root and a logins root that are links', () => {
    const elsewhere = join(root, '..', `p202-elsewhere-${process.pid.toString(36)}`);
    try {
      const id = 'f'.repeat(16);
      mkdirSync(join(elsewhere, id), { recursive: true });
      mkdirSync(root, { recursive: true });
      symlinkSync(elsewhere, join(root, 'claude'));
      expect(loginDirOnDisk(root, 'claude', loginDirIn(root, 'claude', id))).toBe('escapes');
      // The logins root itself, one level up.
      const linkedRoot = join(root, '..', `p202-linked-root-${process.pid.toString(36)}`);
      symlinkSync(root, linkedRoot);
      try {
        expect(loginDirOnDisk(linkedRoot, 'claude', loginDirIn(linkedRoot, 'claude', id))).toBe(
          'escapes'
        );
      } finally {
        rmSync(linkedRoot, { recursive: true, force: true });
      }
    } finally {
      rmSync(elsewhere, { recursive: true, force: true });
    }
  });

  it('refuses a file where a folder should be, and separates gone from escaped', () => {
    const id = 'a'.repeat(16);
    mkdirSync(join(root, 'claude'), { recursive: true });
    writeFileSync(loginDirIn(root, 'claude', id), 'not a folder', 'utf8');
    expect(loginDirOnDisk(root, 'claude', loginDirIn(root, 'claude', id))).toBe('escapes');
    // ABSENT IS NOT AN ESCAPE. A login whose folder the person deleted has to
    // fall back to the default and name itself, which is a different answer.
    expect(loginDirOnDisk(root, 'claude', loginDirIn(root, 'claude', 'b'.repeat(16)))).toBe(
      'absent'
    );
    const added = addLogin(root, 'codex', 'Work');
    if (!added.ok) throw new Error('add failed');
    expect(loginDirOnDisk(root, 'codex', added.dir ?? '')).toBe('ok');
  });

  it('refuses a link that points at another login inside the root', () => {
    const added = addLogin(root, 'claude', 'One');
    if (!added.ok) throw new Error('add failed');
    const id = 'c'.repeat(16);
    symlinkSync(added.dir ?? '', loginDirIn(root, 'claude', id));
    expect(loginDirOnDisk(root, 'claude', loginDirIn(root, 'claude', id))).toBe('escapes');
  });
});

describe('add, choose and remove', () => {
  it('creates an empty owned directory and does not choose it', () => {
    const added = addLogin(root, 'claude', 'Work');
    expect(added.ok).toBe(true);
    if (!added.ok) return;
    expect(added.dir).not.toBeNull();
    expect(isOwnedLoginDir(root, 'claude', added.dir ?? '')).toBe(true);
    expect(existsSync(added.dir ?? '')).toBe(true);
    // EMPTY. Tortie signs nobody in and writes no credential.
    expect(existsSync(join(added.dir ?? '', '.credentials.json'))).toBe(false);
    const rows = added.snapshot.logins.filter((l) => l.provider === 'claude');
    expect(rows.map((l) => l.name)).toEqual([DEFAULT_LOGIN_NAME, 'Work']);
    expect(rows[0]?.chosen).toBe(true);
    expect(rows[1]?.chosen).toBe(false);
    expect(rows[1]?.present).toBe(false);
  });

  it('refuses a second login of the same name and keeps the first', () => {
    expect(addLogin(root, 'claude', 'Work').ok).toBe(true);
    const again = addLogin(root, 'claude', 'work');
    expect(again.ok).toBe(false);
    expect(readLoginsFile(root).file.logins).toHaveLength(1);
  });

  it('lets the two providers use the same name', () => {
    expect(addLogin(root, 'claude', 'Work').ok).toBe(true);
    expect(addLogin(root, 'codex', 'Work').ok).toBe(true);
    expect(readLoginsFile(root).file.logins).toHaveLength(2);
  });

  it('chooses a known login and refuses an unknown one', () => {
    addLogin(root, 'claude', 'Work');
    expect(chooseLogin(root, 'claude', 'Work').ok).toBe(true);
    expect(effectiveLogin(root, 'claude').name).toBe('Work');
    expect(chooseLogin(root, 'claude', 'Nope').ok).toBe(false);
    // Still Work: a refused choose changes nothing.
    expect(effectiveLogin(root, 'claude').name).toBe('Work');
    expect(chooseLogin(root, 'claude', null).ok).toBe(true);
    expect(effectiveLogin(root, 'claude').name).toBeNull();
  });

  it('removes only its own folder and never the default', () => {
    const added = addLogin(root, 'codex', 'Second');
    if (!added.ok) throw new Error('add failed');
    chooseLogin(root, 'codex', 'Second');
    expect(removeLogin(root, 'codex', DEFAULT_LOGIN_NAME).ok).toBe(false);
    const removed = removeLogin(root, 'codex', 'Second');
    expect(removed.ok).toBe(true);
    expect(existsSync(added.dir ?? '')).toBe(false);
    // The choice goes back to the default with the login it named.
    expect(effectiveLogin(root, 'codex').name).toBeNull();
    expect(effectiveLogin(root, 'codex').fellBack).toBe(false);
  });
});

describe('the file an agent could edit', () => {
  it('drops a row whose id would leave the root, and says so', () => {
    writeRaw(
      JSON.stringify({
        v: 1,
        chosen: { claude: 'Escape' },
        logins: [
          { provider: 'claude', id: '../../../.claude', name: 'Escape', createdAt: 1 }
        ]
      })
    );
    const read = readLoginsFile(root);
    expect(read.file.logins).toHaveLength(0);
    expect(read.problems.join(' ')).toContain('sixteen hex');
    // And with the row gone the chosen name is refused too, so nothing points
    // at a directory Tortie does not own.
    expect(read.file.chosen.claude).toBeUndefined();
    expect(effectiveLogin(root, 'claude').dir).toBeNull();
  });

  it('drops a row with an absolute id and a row with a separator in it', () => {
    writeRaw(
      JSON.stringify({
        v: 1,
        chosen: {},
        logins: [
          { provider: 'claude', id: '/Users/gdc/.claude', name: 'Abs', createdAt: 1 },
          { provider: 'claude', id: 'aaaaaaaa/bbbbbbbb', name: 'Sep', createdAt: 2 },
          { provider: 'claude', id: 'AAAAAAAAAAAAAAAA', name: 'Upper', createdAt: 3 }
        ]
      })
    );
    expect(readLoginsFile(root).file.logins).toHaveLength(0);
    expect(readLoginsFile(root).problems).toHaveLength(3);
  });

  it('drops a row whole rather than half of it', () => {
    writeRaw(
      JSON.stringify({
        v: 1,
        chosen: {},
        logins: [
          { provider: 'claude', id: 'a'.repeat(16), name: '../etc', createdAt: 1 },
          { provider: 'gemini', id: 'b'.repeat(16), name: 'Other', createdAt: 2 },
          { provider: 'codex', id: 'c'.repeat(16), name: 'Good', createdAt: 3 }
        ]
      })
    );
    const read = readLoginsFile(root);
    expect(read.file.logins.map((l) => l.name)).toEqual(['Good']);
    expect(read.problems).toHaveLength(2);
  });

  it('reads a file that is not JSON as no added logins, with a sentence', () => {
    writeRaw('{ not json');
    const read = readLoginsFile(root);
    expect(read.file.logins).toHaveLength(0);
    expect(read.problems[0]).toContain('valid JSON');
    // The default is still there and still chosen.
    const rows = listLogins(root).logins.filter((l) => l.provider === 'claude');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.isDefault).toBe(true);
    expect(rows[0]?.chosen).toBe(true);
  });
});

describe('resolving a name to a directory', () => {
  it('answers no directory at all for the default', () => {
    const resolved = resolveLoginDir(root, 'claude', null);
    expect(resolved.dir).toBeNull();
    expect(resolved.name).toBeNull();
    expect(resolved.fellBack).toBe(false);
    // The reserved word resolves the same way, whatever its case.
    expect(resolveLoginDir(root, 'claude', 'default').dir).toBeNull();
  });

  it('falls back to the default when the folder was deleted', () => {
    const added = addLogin(root, 'claude', 'Work');
    if (!added.ok) throw new Error('add failed');
    chooseLogin(root, 'claude', 'Work');
    expect(effectiveLogin(root, 'claude').dir).toBe(added.dir);
    rmSync(added.dir ?? '', { recursive: true, force: true });
    const after = effectiveLogin(root, 'claude');
    expect(after.dir).toBeNull();
    expect(after.name).toBeNull();
    expect(after.fellBack).toBe(true);
    expect(after.asked).toBe('Work');
  });

  it('falls back for a name nothing knows', () => {
    const resolved = resolveLoginDir(root, 'codex', 'Ghost');
    expect(resolved.fellBack).toBe(true);
    expect(resolved.dir).toBeNull();
  });
});

describe('the file itself', () => {
  it('holds names and ids and no path, no token and no home directory', () => {
    addLogin(root, 'claude', 'Work');
    chooseLogin(root, 'claude', 'Work');
    const text = readFileSync(loginsFileIn(root), 'utf8');
    expect(text).toContain('"Work"');
    expect(text).not.toContain('/');
    expect(text).not.toContain('token');
  });
});
