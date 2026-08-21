/**
 * Phase 121. What the renderer hands the ranking worker is two fields.
 *
 * The defect this file guards against was one string per recent file, being
 * `${rootKey} ${relPath}`, which the worker took apart at the FIRST space. A
 * project folder whose path holds a space, e.g. `/Users/gdc/My Projects/app`,
 * split into the root `/Users/gdc/My`, which matched no indexed root, so the
 * worker skipped the entry and an empty Cmd+P listed nothing at all for that
 * project. Two fields cannot split wrong.
 *
 * WHAT THIS FILE DOES NOT CLAIM, and it is stated here so nobody reads a
 * migration into it. The persisted store `gmux.quickopen.recents` has always
 * held an array of `{ repoPath, relPath, machineId, at }` objects. The joined
 * string was never written to disk. `load()` and `persist()` are unchanged by
 * Phase 121, and the cases below prove that by writing a row in the shape a
 * shipped build wrote it and reading it back field for field.
 *
 * The module reads localStorage once, at import, so every case installs its
 * store first and then imports the module fresh.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QuickOpenRecent } from '@shared/ipc';

let stored: Record<string, string> = {};

const storage = {
  getItem: (k: string): string | null => stored[k] ?? null,
  setItem: (k: string, v: string): void => {
    stored[k] = v;
  },
  removeItem: (k: string): void => {
    delete stored[k];
  }
};

vi.stubGlobal('window', { localStorage: storage });
vi.stubGlobal('localStorage', storage);

const STORAGE_KEY = 'gmux.quickopen.recents';

/** One row in the shape the shipping build persists, and has since Phase 99. */
interface StoredRow {
  repoPath: string;
  relPath: string;
  machineId?: string;
  at: number;
}

type RecentsModule = typeof import('../recents');

/** Install a store, then import the module so its one `load()` reads it. */
async function withStore(rows: StoredRow[]): Promise<RecentsModule> {
  stored = { [STORAGE_KEY]: JSON.stringify(rows) };
  vi.resetModules();
  return import('../recents');
}

beforeEach(() => {
  stored = {};
});

describe('a root whose path holds a space', () => {
  it('survives the trip from the store to the worker whole', async () => {
    const mod = await withStore([
      {
        repoPath: '/Users/gdc/My Projects/app',
        relPath: 'README.md',
        machineId: 'local',
        at: 10
      }
    ]);
    expect(mod.recentFiles()).toHaveLength(1);
    expect(mod.recentKeys()[0]).toEqual({
      root: '/Users/gdc/My Projects/app',
      relPath: 'README.md'
    });
  });

  it('is the pair the old joined string could not name', async () => {
    const mod = await withStore([
      {
        repoPath: '/Users/gdc/My Projects/app',
        relPath: 'src/a b.ts',
        machineId: 'local',
        at: 10
      }
    ]);
    const entry = mod.recentKeys()[0] as QuickOpenRecent;
    expect(entry.root).toBe('/Users/gdc/My Projects/app');
    expect(entry.relPath).toBe('src/a b.ts');
    // The string the build before Phase 121 sent for this row, and the root
    // the worker read out of it. `/Users/gdc/My` matches no indexed root.
    const joined = `${entry.root} ${entry.relPath}`;
    expect(joined.slice(0, joined.indexOf(' '))).toBe('/Users/gdc/My');
  });
});

describe('a store written by an older build', () => {
  it('reads a row with no machine id as a file on this Mac', async () => {
    // The shape a build BEFORE Phase 99 persisted. There is no machineId field
    // at all, and the row is not discarded and not rewritten.
    const mod = await withStore([
      { repoPath: '/Users/gdc/gmux', relPath: 'README.md', at: 3 }
    ]);
    expect(mod.recentFiles()[0]?.machineId).toBe('local');
    expect(mod.recentKeys()[0]).toEqual({
      root: '/Users/gdc/gmux',
      relPath: 'README.md'
    });
  });

  it('reads a row on a machine as that machine', async () => {
    const mod = await withStore([
      {
        repoPath: '/home/greg/My Projects/app',
        relPath: 'src/a b.ts',
        machineId: 'studio',
        at: 4
      }
    ]);
    expect(mod.recentKeys()[0]).toEqual({
      root: 'machine:studio:/home/greg/My Projects/app',
      relPath: 'src/a b.ts'
    });
  });
});

describe('one relative path under one absolute path on two computers', () => {
  it('is two entries with two different roots', async () => {
    const mod = await withStore([
      {
        repoPath: '/Users/gdc/My Projects/app',
        relPath: 'README.md',
        machineId: 'studio',
        at: 20
      },
      {
        repoPath: '/Users/gdc/My Projects/app',
        relPath: 'README.md',
        machineId: 'local',
        at: 10
      }
    ]);
    const keys = mod.recentKeys();
    expect(keys).toHaveLength(2);
    expect(keys[0]?.root).toBe('machine:studio:/Users/gdc/My Projects/app');
    expect(keys[1]?.root).toBe('/Users/gdc/My Projects/app');
    expect(keys[0]?.relPath).toBe(keys[1]?.relPath);
    expect(keys[0]?.root).not.toBe(keys[1]?.root);
  });
});

describe('noteOpened', () => {
  it('puts the newest first and persists the same object array', async () => {
    const mod = await withStore([
      {
        repoPath: '/Users/gdc/My Projects/app',
        relPath: 'README.md',
        machineId: 'local',
        at: 1
      }
    ]);
    mod.noteOpened('/Users/gdc/My Projects/app', 'src/a b.ts');
    expect(mod.recentKeys()).toEqual([
      { root: '/Users/gdc/My Projects/app', relPath: 'src/a b.ts' },
      { root: '/Users/gdc/My Projects/app', relPath: 'README.md' }
    ]);

    // What went to localStorage is an array of objects, exactly the shape a
    // build before Phase 121 wrote. No joined string reaches the store.
    const raw = stored[STORAGE_KEY] ?? '';
    const written = JSON.parse(raw) as StoredRow[];
    expect(written).toHaveLength(2);
    expect(written[0]?.repoPath).toBe('/Users/gdc/My Projects/app');
    expect(written[0]?.relPath).toBe('src/a b.ts');
    expect(written[0]?.machineId).toBe('local');
    expect(typeof written[0]?.at).toBe('number');
    expect(raw).not.toContain('/Users/gdc/My Projects/app src/a b.ts');
  });
});

describe('nothing composes a joined string any more', () => {
  it('gives every entry as an object with exactly two string fields', async () => {
    const mod = await withStore([
      {
        repoPath: '/Users/gdc/My Projects/app',
        relPath: 'src/a b.ts',
        machineId: 'local',
        at: 2
      },
      {
        repoPath: '/home/greg/plain',
        relPath: 'README.md',
        machineId: 'studio',
        at: 1
      }
    ]);
    for (const entry of mod.recentKeys()) {
      expect(typeof entry).toBe('object');
      expect(Object.keys(entry).sort()).toEqual(['relPath', 'root']);
      expect(typeof entry.root).toBe('string');
      expect(typeof entry.relPath).toBe('string');
    }
  });
});
