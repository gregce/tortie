/**
 * The arch store, and the two rules that make a torn tree safe (Phase 63).
 *
 * The generation stamp is the one that matters. A check over a half written
 * tree can take seconds, and by the time it answers the tree has moved on. A
 * store that let it write would publish an answer about a repository that no
 * longer exists, so a run whose generation is no longer the newest is refused
 * here rather than being trusted to refuse itself.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ArchCoverageCounts, ArchVerdict } from '@shared/arch';
import { ARCH_SCANNED_NO_HEAD, ArchStore } from '../db';

let dir: string;
let store: ArchStore;
const KEY = 'dev:ino';
const PATH = '/somewhere/project';

const COUNTS: ArchCoverageCounts = {
  checkedHold: 12,
  broke: 1,
  cannotCheck: 21,
  accepted: 2,
  unresolvedImports: 412,
  totalImports: 9800
};

function verdict(subjectId: string, over: Partial<ArchVerdict> = {}): ArchVerdict {
  return {
    subjectId,
    status: 'convergent',
    coverage: 'checked',
    checkedAtCommit: 'a'.repeat(40),
    generation: 1,
    firstCheck: false,
    reason: null,
    durationMs: 3,
    ...over
  };
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-arch-store-'));
  store = new ArchStore(join(dir, 'arch.db'));
});

afterEach(() => {
  store.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('the arch store', () => {
  it('answers with nothing before any run, and never with zeroes that read as clean', () => {
    const state = store.repoState(KEY);
    expect(state.checkedAtCommit).toBeNull();
    expect(state.generation).toBe(0);
    expect(state.counts).toBeNull();
    expect(store.verdicts(KEY)).toEqual([]);
  });

  it('hands out a new generation for every run', () => {
    expect(store.claimGeneration(KEY, PATH)).toBe(1);
    expect(store.claimGeneration(KEY, PATH)).toBe(2);
    expect(store.currentGeneration(KEY)).toBe(2);
  });

  it('REFUSES a run that a newer one has already superseded', () => {
    const slow = store.claimGeneration(KEY, PATH);
    const fast = store.claimGeneration(KEY, PATH);
    expect(
      store.publish({
        repoKey: KEY,
        repoPath: PATH,
        generation: fast,
        checkedAtCommit: 'b'.repeat(40),
        verdicts: [verdict('edge:one')],
        freshness: [],
        counts: COUNTS
      })
    ).toBe(true);
    // The slow run answers last and is thrown away. Without this the older
    // answer would overwrite the newer one and the view would go backwards.
    expect(
      store.publish({
        repoKey: KEY,
        repoPath: PATH,
        generation: slow,
        checkedAtCommit: 'c'.repeat(40),
        verdicts: [verdict('edge:one', { status: 'divergent' })],
        freshness: [],
        counts: COUNTS
      })
    ).toBe(false);
    expect(store.verdicts(KEY)[0]?.status).toBe('convergent');
    expect(store.repoState(KEY).checkedAtCommit).toBe('b'.repeat(40));
  });

  it('keeps the strip counts, including the accepted count a verdict row cannot carry', () => {
    const generation = store.claimGeneration(KEY, PATH);
    store.publish({
      repoKey: KEY,
      repoPath: PATH,
      generation,
      checkedAtCommit: 'd'.repeat(40),
      verdicts: [],
      freshness: [{ componentId: 'scm', commitsBehind: 4, uncommittedFiles: 2 }],
      counts: COUNTS
    });
    expect(store.repoState(KEY).counts).toEqual(COUNTS);
    expect(store.freshness(KEY)).toEqual([
      { componentId: 'scm', commitsBehind: 4, uncommittedFiles: 2 }
    ]);
  });

  it('round trips the offending places a failure list jumps to', () => {
    const generation = store.claimGeneration(KEY, PATH);
    const offending = [
      {
        fromPath: 'src/a.ts',
        toPath: 'src/b.ts',
        line: 12,
        specifier: './b'
      }
    ];
    store.publish({
      repoKey: KEY,
      repoPath: PATH,
      generation,
      checkedAtCommit: 'e'.repeat(40),
      verdicts: [verdict('edge:two', { status: 'divergent', offending })],
      freshness: [],
      counts: COUNTS
    });
    expect(store.verdicts(KEY)[0]?.offending).toEqual(offending);
  });

  it('scans a file once and reuses the stamp until it drifts', () => {
    store.saveImports(KEY, [
      {
        relPath: 'src/a.ts',
        mtimeMs: 100,
        size: 20,
        imports: [
          {
            fromPath: 'src/a.ts',
            line: 1,
            specifier: './b',
            toPath: 'src/b.ts',
            resolution: 'first-party',
            language: 'typescript'
          }
        ]
      }
    ]);
    expect(store.importStamps(KEY).get('src/a.ts')).toEqual({
      mtimeMs: 100,
      size: 20
    });
    expect(store.imports(KEY)).toHaveLength(1);
    // A second save of the same file replaces its rows rather than adding to
    // them, so a file that lost an import loses the edge with it.
    store.saveImports(KEY, [
      { relPath: 'src/a.ts', mtimeMs: 200, size: 21, imports: [] }
    ]);
    expect(store.imports(KEY)).toHaveLength(0);
  });

  it('forgets a file the tree no longer tracks, so a branch flip leaves nothing behind', () => {
    store.saveImports(KEY, [
      { relPath: 'src/gone.ts', mtimeMs: 1, size: 1, imports: [] }
    ]);
    store.forgetImportFiles(KEY, ['src/gone.ts']);
    expect(store.importStamps(KEY).size).toBe(0);
  });

  it('records the no-head stamp for a repository with no commits, so building clears', () => {
    // Phase 160 fix round. A repository with no commits has no HEAD for
    // rev-parse to name, and leaving the stamp null kept the map's building
    // flag true forever: every arch:mapUpdated push made the renderer re-read
    // arch:map, whose building flag scheduled the next scan, measured live at
    // 615 pushes in 20 seconds. The stamp lands with the sentinel instead,
    // the sentinel round-trips, and it can never collide with a real commit
    // because a commit is forty hex characters.
    expect(store.repoState(KEY).scannedAtCommit).toBeNull();
    store.markScanned(KEY, PATH, ARCH_SCANNED_NO_HEAD);
    expect(store.repoState(KEY).scannedAtCommit).toBe(ARCH_SCANNED_NO_HEAD);
    expect(/^[0-9a-f]{40}$/.test(ARCH_SCANNED_NO_HEAD)).toBe(false);
    store.markScanned(KEY, PATH, 'a'.repeat(40));
    expect(store.repoState(KEY).scannedAtCommit).toBe('a'.repeat(40));
  });

  it('drops a whole repository when its tab closes for good', () => {
    const generation = store.claimGeneration(KEY, PATH);
    store.publish({
      repoKey: KEY,
      repoPath: PATH,
      generation,
      checkedAtCommit: 'f'.repeat(40),
      verdicts: [verdict('edge:three')],
      freshness: [],
      counts: COUNTS
    });
    store.forgetRepo(KEY);
    expect(store.verdicts(KEY)).toEqual([]);
    expect(store.repoState(KEY).generation).toBe(0);
  });
});
