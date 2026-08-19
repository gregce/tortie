/**
 * The recent projects file (Phase 18.6 item 2).
 *
 * Four properties are pinned here. The list is newest first with one row per
 * path. A corrupt file yields an empty list rather than a boot failure, which
 * is the whole reason this data is allowed to live outside the manifest. A
 * write never throws at its caller, because an open or a close must not fail
 * over a convenience list. A folder that has been deleted is reported as
 * missing without the row being dropped.
 *
 * Phase 92 pins a fifth property. A row's identity is the pair of the machine
 * and the path, so two machines can hold the same path without either row
 * replacing or removing the other, and the existence check never stats a folder
 * that is on another computer.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData }
}));

const {
  clearRecents,
  listRecents,
  missingRecents,
  onRecentsChanged,
  RECENTS_FILE_MAX,
  rememberProject,
  removeRecent,
  resetRecentsCacheForTests,
  sanitizeRecents,
  withKnownMachines,
  withRecent,
  withoutRecent
} = await import('../store');

function project(
  path: string,
  name?: string,
  machineId?: string
): {
  id: string;
  path: string;
  name: string;
  machineId?: string;
} {
  const row = {
    id: machineId === undefined ? path : `${machineId}:${path}`,
    path,
    name: name ?? path.split('/').pop() ?? path
  };
  return machineId === undefined ? row : { ...row, machineId };
}

function writeRecentsFile(contents: string): void {
  writeFileSync(join(userData, 'recents.json'), contents, 'utf8');
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'tortie-recents-'));
  resetRecentsCacheForTests();
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
});

describe('the list algebra', () => {
  it('keeps one row per path and puts the newest first', () => {
    const a = { path: '/a', name: 'a', lastOpenedAt: 1 };
    const b = { path: '/b', name: 'b', lastOpenedAt: 2 };
    const aAgain = { path: '/a', name: 'a', lastOpenedAt: 3 };
    expect(withRecent(withRecent([a], b), aAgain).map((r) => r.path)).toEqual([
      '/a',
      '/b'
    ]);
  });

  it('caps the list at the file maximum', () => {
    let list: ReturnType<typeof withRecent> = [];
    for (let i = 0; i < RECENTS_FILE_MAX + 7; i += 1) {
      list = withRecent(list, {
        path: `/p/${String(i)}`,
        name: String(i),
        lastOpenedAt: i
      });
    }
    expect(list).toHaveLength(RECENTS_FILE_MAX);
    expect(list[0]?.path).toBe(`/p/${String(RECENTS_FILE_MAX + 6)}`);
  });

  it('drops one path and keeps the rest', () => {
    const list = [
      { path: '/a', name: 'a', lastOpenedAt: 2 },
      { path: '/b', name: 'b', lastOpenedAt: 1 }
    ];
    expect(withoutRecent(list, '/a').map((r) => r.path)).toEqual(['/b']);
  });

  it('refuses a relative path, a duplicate and a nameless row', () => {
    const rows = sanitizeRecents({
      recents: [
        { path: 'relative/path', name: 'no', lastOpenedAt: 9 },
        { path: '/Users/me/src/web', name: '  ', lastOpenedAt: 5 },
        { path: '/Users/me/src/web', name: 'again', lastOpenedAt: 4 },
        { path: '/Users/me/src/api', lastOpenedAt: 'soon' },
        null,
        7
      ]
    });
    expect(rows).toEqual([
      { path: '/Users/me/src/web', name: 'web', lastOpenedAt: 5 },
      { path: '/Users/me/src/api', name: 'api', lastOpenedAt: 0 }
    ]);
  });
});

describe('the file', () => {
  it('reads back what it wrote, newest first', () => {
    rememberProject(project('/Users/me/src/api'));
    rememberProject(project('/Users/me/src/web'));
    resetRecentsCacheForTests();
    expect(listRecents().map((r) => r.name)).toEqual(['web', 'api']);
  });

  it('carries the manifest name rather than the folder name', () => {
    rememberProject(project('/Users/me/src/web-2', 'webapp'));
    resetRecentsCacheForTests();
    expect(listRecents()[0]?.name).toBe('webapp');
  });

  it('moves a project already in the list to the front', () => {
    rememberProject(project('/Users/me/src/api'));
    rememberProject(project('/Users/me/src/web'));
    rememberProject(project('/Users/me/src/api'));
    resetRecentsCacheForTests();
    expect(listRecents().map((r) => r.name)).toEqual(['api', 'web']);
  });

  it('treats a corrupt file as an empty list', () => {
    writeRecentsFile('{ this is not json');
    expect(listRecents()).toEqual([]);
    // And it can still be written after that.
    rememberProject(project('/Users/me/src/api'));
    resetRecentsCacheForTests();
    expect(listRecents().map((r) => r.name)).toEqual(['api']);
  });

  it('treats a missing file as an empty list', () => {
    expect(listRecents()).toEqual([]);
  });

  it('never throws at its caller when the file cannot be written', () => {
    // Replace the user data directory with a FILE, so creating the directory
    // and writing inside it both fail. An open or a close must not fail
    // because a convenience list could not be saved.
    rmSync(userData, { recursive: true, force: true });
    writeFileSync(userData, 'in the way', 'utf8');
    expect(() => {
      rememberProject(project('/Users/me/src/api'));
    }).not.toThrow();
    // The in-memory list still answers for this run.
    expect(listRecents().map((r) => r.name)).toEqual(['api']);
  });

  it('removes one row and clears them all', () => {
    rememberProject(project('/Users/me/src/api'));
    rememberProject(project('/Users/me/src/web'));
    expect(removeRecent('/Users/me/src/api').map((r) => r.name)).toEqual([
      'web'
    ]);
    resetRecentsCacheForTests();
    expect(listRecents().map((r) => r.name)).toEqual(['web']);
    clearRecents();
    resetRecentsCacheForTests();
    expect(listRecents()).toEqual([]);
  });

  it('tells listeners about every write and stops after unsubscribe', () => {
    const seen: number[] = [];
    const off = onRecentsChanged((rows) => seen.push(rows.length));
    rememberProject(project('/Users/me/src/api'));
    rememberProject(project('/Users/me/src/web'));
    off();
    rememberProject(project('/Users/me/src/db'));
    expect(seen).toEqual([1, 2]);
  });
});

describe('the folder existence check', () => {
  it('reports a folder that is gone and a path that is now a file', async () => {
    const live = join(userData, 'live');
    const gone = join(userData, 'gone');
    const file = join(userData, 'file');
    mkdirSync(live);
    mkdirSync(gone);
    writeFileSync(file, 'not a folder', 'utf8');
    rememberProject(project(live));
    rememberProject(project(gone));
    rememberProject(project(file));
    rmSync(gone, { recursive: true, force: true });
    const missing = await missingRecents();
    expect(missing.sort()).toEqual([file, gone].sort());
    // The rows themselves stay. A row that vanished without explanation would
    // make the user doubt their own memory.
    expect(listRecents()).toHaveLength(3);
  });
});

describe('a row names the machine its folder is on (Phase 92)', () => {
  it('keeps a valid machine id, drops one that fails the pattern, and reads `local` as this Mac', () => {
    const rows = sanitizeRecents({
      recents: [
        { path: '/a', name: 'a', lastOpenedAt: 3, machineId: 'mac-pro' },
        { path: '/b', name: 'b', lastOpenedAt: 2, machineId: 'Mac Pro!' },
        { path: '/c', name: 'c', lastOpenedAt: 1, machineId: 'local' }
      ]
    });
    expect(rows).toEqual([
      { path: '/a', name: 'a', lastOpenedAt: 3, machineId: 'mac-pro' },
      // The row survives. Only the id is dropped, because the path is still a
      // folder somebody opened.
      { path: '/b', name: 'b', lastOpenedAt: 2 },
      { path: '/c', name: 'c', lastOpenedAt: 1 }
    ]);
  });

  it('keeps two rows with the same path on two machines', () => {
    const rows = sanitizeRecents({
      recents: [
        { path: '/Users/gdc/dev', name: 'dev', lastOpenedAt: 2 },
        {
          path: '/Users/gdc/dev',
          name: 'dev',
          lastOpenedAt: 1,
          machineId: 'mac-pro'
        }
      ]
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.machineId)).toEqual([undefined, 'mac-pro']);
  });

  it('replaces only the row for the pair that was opened again', () => {
    rememberProject(project('/Users/gdc/dev'));
    rememberProject(project('/Users/gdc/dev', 'dev', 'mac-pro'));
    rememberProject(project('/Users/gdc/dev'));
    resetRecentsCacheForTests();
    const rows = listRecents();
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.machineId)).toEqual([undefined, 'mac-pro']);
  });

  it('removes one row of a pair and leaves the other machine alone', () => {
    const list = [
      { path: '/Users/gdc/dev', name: 'dev', lastOpenedAt: 2 },
      {
        path: '/Users/gdc/dev',
        name: 'dev',
        lastOpenedAt: 1,
        machineId: 'mac-pro'
      }
    ];
    expect(withoutRecent(list, '/Users/gdc/dev', 'mac-pro')).toEqual([list[0]]);
    // An omitted machine means this Mac, so an old caller removes the local row.
    expect(withoutRecent(list, '/Users/gdc/dev')).toEqual([list[1]]);
  });

  it('writes the machine for a remote project and no machine for a local one', () => {
    rememberProject(project('/Users/gdc/api'));
    rememberProject(project('/srv/web', 'web', 'mac-pro'));
    resetRecentsCacheForTests();
    const rows = listRecents();
    expect(rows[0]).toMatchObject({ path: '/srv/web', machineId: 'mac-pro' });
    expect(rows[1]).not.toHaveProperty('machineId');
  });

  it('removes a remote row through removeRecent without touching the local one', () => {
    rememberProject(project('/Users/gdc/dev'));
    rememberProject(project('/Users/gdc/dev', 'dev', 'mac-pro'));
    const left = removeRecent('/Users/gdc/dev', 'mac-pro');
    expect(left).toHaveLength(1);
    expect(left[0]).not.toHaveProperty('machineId');
  });

  it('never stats a folder that is on another machine', async () => {
    const gone = join(userData, 'gone');
    mkdirSync(gone);
    rememberProject(project(gone));
    rmSync(gone, { recursive: true, force: true });
    // The same path, on a machine. It does not exist here either, and it must
    // still never be reported, because this Mac has no standing to answer for
    // another computer.
    rememberProject(project(gone, 'over there', 'mac-pro'));
    rememberProject(project('/definitely/not/here', 'remote', 'mac-pro'));
    const missing = await missingRecents();
    expect(missing).toEqual([gone]);
  });

  it('drops a row whose machine has gone and keeps one whose machine is merely unconfirmed', () => {
    const list = [
      { path: '/here', name: 'here', lastOpenedAt: 3 },
      { path: '/there', name: 'there', lastOpenedAt: 2, machineId: 'mac-pro' },
      { path: '/nowhere', name: 'nowhere', lastOpenedAt: 1, machineId: 'gone' }
    ];
    // `mac-pro` is in the machines file. Whether anybody has confirmed it is a
    // different question, answered when a read is attempted.
    const kept = withKnownMachines(list, new Set(['mac-pro']));
    expect(kept.map((r) => r.path)).toEqual(['/here', '/there']);
    // And the row is not deleted. Adding the machine back brings it back.
    expect(withKnownMachines(list, new Set(['mac-pro', 'gone']))).toHaveLength(
      3
    );
  });
});
