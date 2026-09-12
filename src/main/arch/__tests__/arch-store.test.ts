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
import type { ArchCoverageCounts, ArchFactDraft, ArchVerdict } from '@shared/arch';
import { ARCH_BOUNDARY_START_KINDS, ARCH_FACT_KINDS, ARCH_MODULE_ROOT_KIND } from '@shared/arch';
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

  // -------------------------------------------------------------------------
  // The fact base (Phase 257). A fact is a function of (bytes, path); the link
  // from a repository's file to those facts is what a repository owns.
  // -------------------------------------------------------------------------

  const OID_A = 'a'.repeat(40);
  const OID_B = 'b'.repeat(40);
  const REPO_2 = 'dev:ino2';

  function draft(over: Partial<ArchFactDraft> = {}): ArchFactDraft {
    return {
      category: 'surface',
      kind: 'ipc-channel',
      subject: 'IPC serves arch:map',
      line: 12,
      rule: 'surface.ipc.electron',
      evidence: "ipcMain.handle('arch:map', fn)",
      ...over
    };
  }

  function link(relPath: string, oid: string, over: Partial<Parameters<ArchStore['linkFactFiles']>[1][number]> = {}) {
    return { relPath, oid, mtimeMs: 100, size: 20, lang: 'typescript', vendored: null, truncated: false, wrapDigest: null, ...over };
  }

  it('keeps a fact list per (oid, path) and answers it through the link, sorted', () => {
    store.saveFacts(OID_A, 'src/ipc.ts', [
      draft({ line: 30, subject: 'IPC serves z' }),
      draft({ line: 12, subject: 'IPC serves arch:map' }),
      draft({ line: 12, subject: 'IPC serves a:b', rule: 'surface.ipc.electron' })
    ]);
    expect(store.facts(KEY)).toEqual([]);
    store.linkFactFiles(KEY, [link('src/ipc.ts', OID_A)]);
    const facts = store.facts(KEY);
    expect(facts.map((f) => `${f.file}:${String(f.line)} ${f.subject}`)).toEqual([
      'src/ipc.ts:12 IPC serves a:b',
      'src/ipc.ts:12 IPC serves arch:map',
      'src/ipc.ts:30 IPC serves z'
    ]);
    expect(facts.every((f) => f.viaWrapper === false)).toBe(true);
    expect(store.hasFactsFor(OID_A, 'src/ipc.ts')).toBe(true);
    // The same bytes at ANOTHER path are another fact list, because three
    // rule families read the path.
    expect(store.hasFactsFor(OID_A, 'test/ipc.test.ts')).toBe(false);
  });

  it('a link is proof of a read, so a file with no facts is not parsed again on every stamp move', () => {
    store.saveFacts(OID_B, 'src/empty.ts', []);
    expect(store.hasFactsFor(OID_B, 'src/empty.ts')).toBe(false);
    store.linkFactFiles(KEY, [link('src/empty.ts', OID_B)]);
    expect(store.hasFactsFor(OID_B, 'src/empty.ts')).toBe(true);
  });

  it('REFUSES a whole save when one row is outside the closed sets, naming the field, and writes nothing', () => {
    expect(() => store.saveFacts(OID_A, 'src/a.ts', [draft(), draft({ category: 'boundary', kind: 'barrel' })])).toThrow(
      /arch_fact\.kind "barrel" is not a boundary kind/
    );
    expect(() =>
      store.saveFacts(OID_A, 'src/a.ts', [draft({ category: 'decl' as ArchFactDraft['category'], kind: 'function' })])
    ).toThrow(/arch_fact\.category "decl" is not one of/);
    expect(() => store.saveFacts(OID_A, 'src/a.ts', [draft({ subject: 'x'.repeat(161) })])).toThrow(/arch_fact\.subject holds 161/);
    expect(() => store.saveFacts(OID_A, 'src/a.ts', [draft({ evidence: 'x'.repeat(201) })])).toThrow(/arch_fact\.evidence holds 201/);
    expect(() => store.saveFacts(OID_A, 'src/a.ts', [draft({ line: 0 })])).toThrow(/arch_fact\.line must be a positive integer/);
    store.linkFactFiles(KEY, [link('src/a.ts', OID_A)]);
    expect(store.facts(KEY)).toEqual([]);
    expect(store.hasFactsFor(OID_A, 'src/a.ts')).toBe(true); // the link, not a fact
    expect(() => store.saveWrapFacts(KEY, 'src/a.ts', [draft({ kind: 'handler' })])).toThrow(/arch_fact_wrap\.kind "handler"/);
  });

  it('round trips every stamp column', () => {
    store.linkFactFiles(KEY, [
      link('src/a.ts', OID_A, { mtimeMs: 1.5, size: 9, lang: 'typescript', vendored: null, truncated: true, wrapDigest: 'd'.repeat(64) }),
      link('vendor/x.js', OID_B, { lang: null, vendored: 'path: vendor', truncated: false, wrapDigest: null })
    ]);
    const stamps = store.factStamps(KEY);
    expect(stamps.get('src/a.ts')).toEqual({ mtimeMs: 1.5, size: 9, oid: OID_A, wrapDigest: 'd'.repeat(64), lang: 'typescript', vendored: null, truncated: true });
    expect(stamps.get('vendor/x.js')).toEqual({ mtimeMs: 100, size: 20, oid: OID_B, wrapDigest: null, lang: null, vendored: 'path: vendor', truncated: false });
    // A re-link replaces rather than appends.
    store.linkFactFiles(KEY, [link('src/a.ts', OID_B, { truncated: false })]);
    expect(store.factStamps(KEY).get('src/a.ts')?.oid).toBe(OID_B);
    expect(store.factStamps(KEY).size).toBe(2);
  });

  it('shares one fact list between two repositories and prunes it only when nothing links it', () => {
    store.saveFacts(OID_A, 'src/ipc.ts', [draft()]);
    store.saveWrapperDecls(OID_A, 'src/ipc.ts', [
      { name: 'handle', innerCallee: 'ipc.handle', innerLast: 'handle', paramIndex: 1, innerIndex: 0, hops: 1, line: 4 }
    ]);
    store.linkFactFiles(KEY, [link('src/ipc.ts', OID_A)]);
    store.linkFactFiles(REPO_2, [link('src/ipc.ts', OID_A)]);
    expect(store.facts(REPO_2)).toHaveLength(1);
    store.forgetFactFiles(KEY, ['src/ipc.ts']);
    expect(store.pruneUnlinkedFacts()).toBe(0);
    expect(store.facts(KEY)).toEqual([]);
    expect(store.facts(REPO_2)).toHaveLength(1);
    expect(store.wrapperDecls([{ oid: OID_A, relPath: 'src/ipc.ts' }]).get('src/ipc.ts')).toHaveLength(1);
    store.forgetFactFiles(REPO_2, ['src/ipc.ts']);
    expect(store.pruneUnlinkedFacts()).toBe(2); // one fact row and one wrapper row
    expect(store.hasFactsFor(OID_A, 'src/ipc.ts')).toBe(false);
    expect(store.wrapperDecls([{ oid: OID_A, relPath: 'src/ipc.ts' }]).size).toBe(0);
  });

  it('keeps wrapper-only facts per FILE, replaces rather than appends, and clears them whole', () => {
    store.linkFactFiles(KEY, [link('src/arch/ipc.ts', OID_A, { wrapDigest: 'e'.repeat(64) })]);
    store.saveWrapFacts(KEY, 'src/arch/ipc.ts', [
      draft({ rule: 'surface.ipc.electron+wrap', subject: 'IPC serves arch:load' }),
      draft({ rule: 'surface.ipc.electron+wrap', subject: 'IPC serves arch:map', line: 13 })
    ]);
    expect(store.facts(KEY).map((f) => [f.subject, f.viaWrapper])).toEqual([
      ['IPC serves arch:load', true],
      ['IPC serves arch:map', true]
    ]);
    store.saveWrapFacts(KEY, 'src/arch/ipc.ts', [draft({ rule: 'surface.ipc.electron+wrap', subject: 'IPC serves arch:load' })]);
    expect(store.facts(KEY)).toHaveLength(1);
    const counts = store.factCounts(KEY);
    expect(counts.wrapFacts).toBe(1);
    expect(counts.wrapDigest).toBe('e'.repeat(64));
    expect(counts.byCategory.surface).toBe(1);
    expect(counts.byRule['surface.ipc.electron+wrap']).toBe(1);
    store.clearWrapFacts(KEY);
    expect(store.facts(KEY)).toEqual([]);
  });

  it('counts the denominators beside the facts', () => {
    store.saveFacts(OID_A, 'src/a.ts', [draft(), draft({ category: 'effect', kind: 'spawn', subject: 'runs git', rule: 'effect.spawn.node' })]);
    store.linkFactFiles(KEY, [
      link('src/a.ts', OID_A, { truncated: true }),
      link('vendor/x.js', OID_B, { lang: null, vendored: 'path: vendor' }),
      link('README.md', 'c'.repeat(40), { lang: null })
    ]);
    const counts = store.factCounts(KEY);
    expect(counts.files).toBe(3);
    expect(counts.vendored).toBe(1);
    expect(counts.truncated).toBe(1);
    expect(counts.unread).toBe(1);
    expect(counts.byCategory).toEqual({ entrypoint: 0, boundary: 0, surface: 1, store: 0, effect: 1, network: 0, gate: 0, test: 0 });
    expect(counts.wrapDigest).toBeNull();
  });

  it('answers the six build-and-start kinds and the module roots through two readers that never overlap', () => {
    const rows: ArchFactDraft[] = [
      ...ARCH_BOUNDARY_START_KINDS.map((kind, i) =>
        draft({ category: 'boundary', kind, subject: `starts a ${kind}`, line: i + 1, rule: 'boundary.worker' })
      ),
      draft({ category: 'boundary', kind: ARCH_MODULE_ROOT_KIND, subject: 'module root src/index.ts', line: 1, rule: 'boundary.path.module-root' }),
      draft({ line: 50 })
    ];
    expect(ARCH_FACT_KINDS.boundary).toEqual([...ARCH_BOUNDARY_START_KINDS, ARCH_MODULE_ROOT_KIND]);
    store.saveFacts(OID_A, 'src/index.ts', rows);
    store.linkFactFiles(KEY, [link('src/index.ts', OID_A)]);
    const starts = store.boundaryStarts(KEY);
    const roots = store.moduleRoots(KEY);
    expect(starts.map((f) => f.kind)).toEqual([...ARCH_BOUNDARY_START_KINDS]);
    expect(roots.map((f) => f.kind)).toEqual([ARCH_MODULE_ROOT_KIND]);
    const boundary = store.facts(KEY).filter((f) => f.category === 'boundary');
    expect(starts.length + roots.length).toBe(boundary.length);
  });

  it('drops the links and prunes the shared lists when a repository is forgotten', () => {
    store.saveFacts(OID_A, 'src/a.ts', [draft()]);
    store.linkFactFiles(KEY, [link('src/a.ts', OID_A)]);
    store.saveWrapFacts(KEY, 'src/a.ts', [draft({ rule: 'x+wrap' })]);
    store.forgetRepo(KEY);
    expect(store.facts(KEY)).toEqual([]);
    expect(store.factStamps(KEY).size).toBe(0);
    expect(store.hasFactsFor(OID_A, 'src/a.ts')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The three Phase 258 readers: facts by category, files by category, links
// under directories
// ---------------------------------------------------------------------------

describe('the fact readers the reading surface draws from (Phase 258)', () => {
  const OID_A = 'a'.repeat(40);
  const OID_B = 'b'.repeat(40);
  function draft(over: Partial<ArchFactDraft> = {}): ArchFactDraft {
    return { category: 'surface', kind: 'ipc-channel', subject: 'IPC serves arch:map', line: 12, rule: 'surface.ipc.electron', evidence: 'x', ...over };
  }
  function link(relPath: string, oid: string, over: Partial<Parameters<ArchStore['linkFactFiles']>[1][number]> = {}) {
    return { relPath, oid, mtimeMs: 100, size: 20, lang: 'typescript', vendored: null, truncated: false, wrapDigest: null, ...over };
  }

  it('answers the named categories only, through the links AND the wrap table, sorted', () => {
    store.saveFacts(OID_A, 'src/a.ts', [
      draft({ category: 'test', kind: 'test-case', subject: 'it a', line: 40, rule: 'test.vitest' }),
      draft({ category: 'effect', kind: 'spawn', subject: 'runs git', line: 20, rule: 'effect.spawn.node' }),
      draft({ line: 12 })
    ]);
    store.linkFactFiles(KEY, [link('src/a.ts', OID_A, { wrapDigest: 'e'.repeat(64) })]);
    store.saveWrapFacts(KEY, 'src/a.ts', [draft({ rule: 'surface.ipc.electron+wrap', subject: 'IPC serves arch:load', line: 30 })]);
    const rows = store.factsOf(KEY, ['surface', 'effect']);
    expect(rows.map((f) => `${String(f.line)} ${f.category} ${f.subject}${f.viaWrapper ? ' +wrap' : ''}`)).toEqual([
      '12 surface IPC serves arch:map',
      '20 effect runs git',
      '30 surface IPC serves arch:load +wrap'
    ]);
    expect(store.factsOf(KEY, ['gate'])).toEqual([]);
    expect(store.factsOf(KEY, [])).toEqual([]);
    // A word outside the eight is not a category and is not spliced into any SQL.
    expect(store.factsOf(KEY, ['nonsense' as ArchFactDraft['category']])).toEqual([]);
  });

  it('answers the distinct files of one category, wrap facts included', () => {
    store.saveFacts(OID_A, 'src/a.test.ts', [
      draft({ category: 'test', kind: 'test-case', subject: 'it a', line: 1, rule: 'test.vitest' }),
      draft({ category: 'test', kind: 'test-case', subject: 'it b', line: 2, rule: 'test.vitest' })
    ]);
    store.saveFacts(OID_B, 'src/b.ts', [draft()]);
    store.linkFactFiles(KEY, [link('src/a.test.ts', OID_A), link('src/b.ts', OID_B), link('src/c.ts', 'c'.repeat(40))]);
    store.saveWrapFacts(KEY, 'src/c.ts', [draft({ category: 'test', kind: 'test-case', subject: 'it c', rule: 'test.vitest+wrap' })]);
    expect(store.factFiles(KEY, 'test')).toEqual(['src/a.test.ts', 'src/c.ts']);
    expect(store.factFiles(KEY, 'surface')).toEqual(['src/b.ts']);
    expect(store.factFiles(KEY, 'gate')).toEqual([]);
  });

  it('counts the link denominators under a set of directories, a file once', () => {
    store.linkFactFiles(KEY, [
      link('src/main/a.ts', OID_A, { truncated: true }),
      link('src/main/b.ts', OID_B),
      link('src/shared/c.ts', 'c'.repeat(40)),
      link('vendor/x.js', 'd'.repeat(40), { lang: null, vendored: 'path: vendor' }),
      link('README.md', 'e'.repeat(40), { lang: null })
    ]);
    expect(store.linkCountsUnder(KEY, [''])).toEqual({ files: 5, parsed: 3, vendored: 1, truncated: 1 });
    expect(store.linkCountsUnder(KEY, ['src/main', 'src/main'])).toEqual({ files: 2, parsed: 2, vendored: 0, truncated: 1 });
    expect(store.linkCountsUnder(KEY, ['src'])).toEqual({ files: 3, parsed: 3, vendored: 0, truncated: 1 });
    expect(store.linkCountsUnder(KEY, ['srcx'])).toEqual({ files: 0, parsed: 0, vendored: 0, truncated: 0 });
    expect(store.linkCountsUnder(KEY, [])).toEqual({ files: 0, parsed: 0, vendored: 0, truncated: 0 });
  });
});
