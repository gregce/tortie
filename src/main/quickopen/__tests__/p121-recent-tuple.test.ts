/**
 * Phase 121. A recently opened file travels as two fields, so a folder whose
 * path holds a space is listed instead of being dropped.
 *
 * THE DEFECT THIS FILE PINS. The pair used to travel as one string,
 * `${root} ${relPath}`, and the ranking worker took it apart at the FIRST
 * space. For a project at `/Users/gdc/My Projects/app` that produced the root
 * `/Users/gdc/My`, no open root matched it, and every recent file in that
 * project was skipped. A person with such a folder pressed Cmd+P, typed
 * nothing, and got an empty palette.
 *
 * WHAT IS ON DISK, SO NOBODY BELIEVES A MIGRATION HAPPENED. The persisted store
 * `gmux.quickopen.recents` has held an array of objects since the day it
 * shipped. The joined string was never written to a file. The backward
 * compatible reader below guards the WIRE, being a `quickopen:query` composed
 * by a renderer from before this phase, and nothing else.
 */

import { describe, expect, it } from 'vitest';
import { rootKeyOf, workspaceTarget } from '@shared/workspace-target';
import {
  recentHitOf,
  recentMapKeyOf,
  recentOfLegacyKey,
  recentsOf
} from '../rows';

/** A local project folder whose path holds a space. This is the defect's shape. */
const SPACED = '/Users/gdc/My Projects/app';
/** A local project folder with no space in it, the control. */
const PLAIN = '/Users/gdc/gmux';
/** The map key's separator, written as an escape and never as a literal byte. */
const NUL = '\u0000';

describe('a root holding a space', () => {
  it('answers a hit whose repoPath is the whole root', () => {
    const hit = recentHitOf({ root: SPACED, relPath: 'README.md' });
    expect(hit?.repoPath).toBe(SPACED);
    expect(hit?.relPath).toBe('README.md');
    // A folder on this Mac carries no machine id at all, which is the Phase 99
    // rule and it did not change here.
    expect(hit === null ? true : 'machineId' in hit).toBe(false);
  });

  it('keeps a relative path holding a space whole', () => {
    const hit = recentHitOf({ root: PLAIN, relPath: 'src/a b.ts' });
    expect(hit?.repoPath).toBe(PLAIN);
    expect(hit?.relPath).toBe('src/a b.ts');
  });

  it('keeps both fields whole when both hold a space', () => {
    const hit = recentHitOf({ root: SPACED, relPath: 'src/a b.ts' });
    expect(hit?.repoPath).toBe(SPACED);
    expect(hit?.relPath).toBe('src/a b.ts');
  });

  it('carries the machine when the root names one and the path holds a space', () => {
    const root = rootKeyOf(workspaceTarget('/home/greg/My Projects/app', 'studio'));
    const hit = recentHitOf({ root, relPath: 'src/x.ts' });
    expect(hit?.machineId).toBe('studio');
    expect(hit?.repoPath).toBe('/home/greg/My Projects/app');
  });

  it('keeps a path holding a colon on the far side whole, as Phase 99 set it', () => {
    const root = rootKeyOf(workspaceTarget('/home/greg/a:b', 'studio'));
    const hit = recentHitOf({ root, relPath: 'src/x.ts' });
    expect(hit?.machineId).toBe('studio');
    expect(hit?.repoPath).toBe('/home/greg/a:b');
  });

  it('gives the same relative path on two machines two different hits', () => {
    const there = rootKeyOf(workspaceTarget(SPACED, 'studio'));
    const here = recentHitOf({ root: SPACED, relPath: 'src/a b.ts' });
    const away = recentHitOf({ root: there, relPath: 'src/a b.ts' });
    expect(here?.repoPath).toBe(away?.repoPath);
    expect(here?.machineId).toBeUndefined();
    expect(away?.machineId).toBe('studio');
    expect(here).not.toEqual(away);
  });

  it('answers null when either field is empty', () => {
    expect(recentHitOf({ root: '', relPath: 'a.ts' })).toBeNull();
    expect(recentHitOf({ root: SPACED, relPath: '' })).toBeNull();
  });
});

describe('recentMapKeyOf', () => {
  it('separates the same path on two machines', () => {
    const there = rootKeyOf(workspaceTarget(SPACED, 'studio'));
    expect(recentMapKeyOf(SPACED, 'a.ts')).not.toBe(
      recentMapKeyOf(there, 'a.ts')
    );
  });

  it('cannot map two different files onto one key', () => {
    // This is the exact pair the space separator collapsed into one key:
    // `/a b` with `c` and `/a` with `b c` both joined to `/a b c`.
    expect(recentMapKeyOf('/a b', 'c')).not.toBe(recentMapKeyOf('/a', 'b c'));
  });

  it('joins with NUL, which no POSIX path and no machine id can hold', () => {
    expect(recentMapKeyOf('/a', 'b')).toBe(`/a${NUL}b`);
    expect(recentMapKeyOf('/a', 'b').includes(' ')).toBe(false);
  });
});

describe('recentOfLegacyKey, which reads what an older build sent', () => {
  it('reads a key with no space in its root', () => {
    expect(recentOfLegacyKey(`${PLAIN} README.md`)).toEqual({
      root: PLAIN,
      relPath: 'README.md'
    });
  });

  it('reads a relative path that holds a space', () => {
    expect(recentOfLegacyKey(`${PLAIN} src/a b.ts`)).toEqual({
      root: PLAIN,
      relPath: 'src/a b.ts'
    });
  });

  it('reads a key whose root names a machine', () => {
    const root = rootKeyOf(workspaceTarget(PLAIN, 'studio'));
    expect(recentOfLegacyKey(`${root} src/a.ts`)).toEqual({
      root,
      relPath: 'src/a.ts'
    });
  });

  it('answers null when there is nothing to split', () => {
    expect(recentOfLegacyKey('')).toBeNull();
    expect(recentOfLegacyKey(PLAIN)).toBeNull();
    expect(recentOfLegacyKey(' /x')).toBeNull();
    expect(recentOfLegacyKey('/x ')).toBeNull();
  });

  it('cannot recover a root that holds a space, which is why the shape changed', () => {
    // It is read the way it was written, not better. The old build wrote
    // `/Users/gdc/My Projects/app README.md` and meant the project at
    // `/Users/gdc/My Projects/app`. Its own text cannot say that, so this
    // answers what that build meant by it, which is a root nothing matches.
    expect(recentOfLegacyKey(`${SPACED} README.md`)).toEqual({
      root: '/Users/gdc/My',
      relPath: 'Projects/app README.md'
    });
  });
});

describe('recentsOf, the one normaliser at the boundary', () => {
  it('reads a mixed list in order', () => {
    expect(
      recentsOf([`${PLAIN} README.md`, { root: SPACED, relPath: 'x.ts' }])
    ).toEqual([
      { root: PLAIN, relPath: 'README.md' },
      { root: SPACED, relPath: 'x.ts' }
    ]);
  });

  it('drops every element it cannot read', () => {
    expect(
      recentsOf([
        '',
        'noSpace',
        { root: '', relPath: 'x' },
        { root: '/a', relPath: '' }
      ])
    ).toEqual([]);
  });

  it('agrees field for field with the new composer for every space free root', () => {
    // The stored row shape, which did not change: { repoPath, relPath,
    // machineId, at }. Compose the OLD wire key the way the shipping build
    // composed it, read it back, and compare with the tuple the new composer
    // builds from the same row.
    const rows = [
      { repoPath: PLAIN, relPath: 'README.md', machineId: 'local' },
      { repoPath: PLAIN, relPath: 'src/a b.ts', machineId: 'local' },
      { repoPath: '/home/greg/gmux', relPath: 'src/x.ts', machineId: 'studio' }
    ];
    for (const row of rows) {
      const target = workspaceTarget(row.repoPath, row.machineId);
      const tuple = { root: rootKeyOf(target), relPath: row.relPath };
      const legacy = `${rootKeyOf(target)} ${row.relPath}`;
      expect(recentsOf([legacy])).toEqual([tuple]);
    }
  });

  it('is the reason a root with a space needs the new shape', () => {
    // The same comparison as above, for a root that holds a space. The old key
    // does NOT read back to the tuple, and no reader could make it. That is the
    // whole reason the wire shape changed rather than the reader being fixed.
    const tuple = { root: SPACED, relPath: 'README.md' };
    const legacy = `${SPACED} README.md`;
    expect(recentsOf([legacy])).not.toEqual([tuple]);
    expect(recentsOf([tuple])).toEqual([tuple]);
  });
});
