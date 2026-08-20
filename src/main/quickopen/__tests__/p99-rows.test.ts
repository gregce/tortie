/**
 * Phase 99. One ranked path into one quick open row, and one recents key back
 * into one.
 *
 * THE ONE LINE THIS FILE EXISTS FOR. `/Users/gdc/gmux/README.md` on this Mac
 * and `/Users/gdc/gmux/README.md` on another machine are DIFFERENT files. A hit
 * carries a path, and a path alone cannot say whose computer it is on, so the
 * hit carries the machine as well. Every test below is about that field being
 * there when it should be and absent when it should not.
 *
 * The ranking worker is a `worker_threads` entry point, so a decomposition
 * inside it could not be read without starting a thread. It lives in
 * `../rows.ts` instead, which imports nothing but the shared key pair, and this
 * file reads it directly.
 */

import { describe, expect, it } from 'vitest';
import { LOCAL_MACHINE_ID, rootKeyOf, workspaceTarget } from '@shared/workspace-target';
import { hitOf, recentHitOf } from '../rows';

const HERE = '/Users/gdc/gmux';
const THERE = rootKeyOf(workspaceTarget(HERE, 'studio'));

describe('hitOf', () => {
  it('gives a folder on this Mac no machine at all', () => {
    // Absent rather than the word `local`. The contract declares the field
    // optional, and every hit a build before Phase 99 produced had none.
    const hit = hitOf(HERE, 'README.md', [0, 1], 42, false);
    expect(hit).toEqual({
      repoPath: HERE,
      relPath: 'README.md',
      positions: [0, 1],
      score: 42,
      recent: false
    });
    expect('machineId' in hit).toBe(false);
  });

  it('gives a folder on another machine the machine it is on', () => {
    const hit = hitOf(THERE, 'README.md', [], 7, true);
    expect(hit.machineId).toBe('studio');
    // The path is the path ON THAT MACHINE, so a surface that opens the file
    // hands it to that machine rather than to this one.
    expect(hit.repoPath).toBe(HERE);
    expect(hit.recent).toBe(true);
    expect(hit.score).toBe(7);
  });

  it('gives the same relative path from two computers two different hits', () => {
    const here = hitOf(HERE, 'README.md', [], 1, false);
    const there = hitOf(THERE, 'README.md', [], 1, false);
    expect(here.repoPath).toBe(there.repoPath);
    expect(here.machineId).toBeUndefined();
    expect(there.machineId).toBe('studio');
    expect(here).not.toEqual(there);
  });

  it('keeps a path holding a colon on the far side whole', () => {
    const key = rootKeyOf(workspaceTarget('/home/greg/a:b', 'studio'));
    const hit = hitOf(key, 'src/x.ts', [], 0, false);
    expect(hit.machineId).toBe('studio');
    expect(hit.repoPath).toBe('/home/greg/a:b');
  });

  it('never invents the local id as a value on the wire', () => {
    expect(hitOf(HERE, 'a.ts', [], 0, false).machineId).toBeUndefined();
    expect(LOCAL_MACHINE_ID).toBe('local');
  });
});

describe('recentHitOf', () => {
  it('splits at the first space, so a relative path may hold spaces', () => {
    const hit = recentHitOf(`${HERE} src/a b.ts`);
    expect(hit).toEqual({
      repoPath: HERE,
      relPath: 'src/a b.ts',
      positions: [],
      score: 0,
      recent: true
    });
  });

  it('carries the machine out of a key that names one', () => {
    const hit = recentHitOf(`${THERE} src/a.ts`);
    expect(hit?.machineId).toBe('studio');
    expect(hit?.repoPath).toBe(HERE);
    expect(hit?.relPath).toBe('src/a.ts');
  });

  it('reads a key an older build wrote as a file on this Mac, which it was', () => {
    // A recents entry from before Phase 99 has no machine in its first field.
    // Nothing is migrated and nothing is discarded, because reading it as local
    // is reading it correctly.
    expect(recentHitOf(`${HERE} README.md`)?.machineId).toBeUndefined();
  });

  it('answers null for a key that does not split', () => {
    expect(recentHitOf('')).toBeNull();
    expect(recentHitOf(HERE)).toBeNull();
    expect(recentHitOf(` ${HERE}`)).toBeNull();
    expect(recentHitOf(`${HERE} `)).toBeNull();
  });

  it('marks every recent hit recent, because that is what the list is', () => {
    expect(recentHitOf(`${THERE} a.ts`)?.recent).toBe(true);
    expect(recentHitOf(`${THERE} a.ts`)?.positions).toEqual([]);
  });
});
