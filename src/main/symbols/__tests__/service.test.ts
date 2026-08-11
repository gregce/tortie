/**
 * The index lifecycle — the part of symbols that is a PROMISE rather than a
 * parser, and therefore the part worth pinning down:
 *
 *  - `query` never starts a build. This is the whole "never on project open"
 *    guarantee; if it ever regresses, gmux quietly starts burning six cores
 *    per project the user opens.
 *  - a cold project says `cold: true` rather than returning an empty list.
 *  - the second build re-parses only what drifted, which is what
 *    `(repoPath, relPath, mtimeMs, size)` is for.
 *  - a file that disappears is forgotten from BOTH the table and SQLite, or
 *    the palette offers a jump into a file that is gone.
 *
 * The worker pool is faked (real tree-sitter is covered by extract.test.ts) so
 * these run in milliseconds and can assert exactly which files were parsed.
 * Persistence is REAL, in a temp file, because the incremental key is the
 * thing under test.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SymbolPersistence } from '../persist';
import { SymbolService } from '../service';
import type { SymbolPool } from '../pool';
import type { IndexedFile } from '../worker';

let root = '';
let dbPath = '';
let dbDir = '';
let persistence: SymbolPersistence;

/** Every path the fake pool was asked to parse, in order, across all builds. */
let parsed: string[][] = [];

vi.mock('../files', () => ({
  listIndexableFiles: (repoPath: string) =>
    Promise.resolve(mockListing.get(repoPath) ?? [])
}));

const mockListing = new Map<string, string[]>();

/** A pool that "parses" by statting the file and inventing one symbol. */
function fakePool(): SymbolPool {
  return {
    async run(files: { relPath: string; absPath: string }[]) {
      parsed.push(files.map((f) => f.relPath));
      const { statSync } = await import('node:fs');
      const out: IndexedFile[] = [];
      for (const file of files) {
        let st;
        try {
          st = statSync(file.absPath);
        } catch {
          continue;
        }
        out.push({
          relPath: file.relPath,
          mtimeMs: st.mtimeMs,
          size: st.size,
          symbols: [
            {
              name: symbolNameFor(file.relPath),
              kind: 'function',
              container: null,
              line: 1,
              column: 0,
              endColumn: 4
            }
          ]
        });
      }
      return out;
    },
    async shutdown() {
      /* nothing to tear down */
    }
  } as unknown as SymbolPool;
}

function symbolNameFor(relPath: string): string {
  return relPath.replace(/[^a-z]/gi, '');
}

function write(relPath: string, body: string): void {
  const abs = join(root, relPath);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, body, 'utf8');
}

function makeService(): SymbolService {
  return new SymbolService({
    pool: fakePool(),
    persistence,
    onProgress: () => undefined
  });
}

/** Wait for the background build kicked off by `ensure()`. */
async function settle(ms = 250): Promise<void> {
  const until = Date.now() + ms;
  while (Date.now() < until) await new Promise((r) => setTimeout(r, 5));
}

/**
 * Long enough to clear the watcher's 300 ms debounce AND the build behind it.
 * The debounce is deliberate (agents write in bursts), so a watcher test has
 * to wait it out rather than mock it away.
 */
const AFTER_WATCH_DEBOUNCE = 700;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-symbols-'));
  dbDir = mkdtempSync(join(tmpdir(), 'gmux-symdb-'));
  dbPath = join(dbDir, 'symbols.db');
  persistence = new SymbolPersistence(dbPath);
  parsed = [];
  mockListing.clear();
});

afterEach(() => {
  persistence.close();
  rmSync(root, { recursive: true, force: true });
  // The db lives in its OWN temp dir (SQLite writes -wal/-shm siblings), so
  // it needs its own cleanup — without this every run left a gmux-symdb-*
  // directory behind, 288 of them on the machine when Phase 13.8 swept.
  rmSync(dbDir, { recursive: true, force: true });
});

describe('SymbolService', () => {
  it('reports a project it has never heard of as COLD, and parses nothing', () => {
    const service = makeService();
    const result = service.query({ repoPath: root, query: 'a', limit: 10 });
    expect(result.cold).toBe(true);
    expect(result.indexing).toBe(false);
    expect(result.hits).toEqual([]);
    // The guarantee: asking a question never starts the machine.
    expect(parsed).toEqual([]);
  });

  it('builds on ensure() and answers from the table afterwards', async () => {
    write('alpha.ts', 'export function alpha() {}');
    write('beta.ts', 'export function beta() {}');
    mockListing.set(root, ['alpha.ts', 'beta.ts']);

    const service = makeService();
    expect(service.ensure(root).started).toBe(true);
    await settle();

    const result = service.query({ repoPath: root, query: 'alpha', limit: 10 });
    expect(result.cold).toBe(false);
    expect(result.indexing).toBe(false);
    expect(result.hits.map((h) => h.relPath)).toEqual(['alpha.ts']);
    expect(parsed.flat().sort()).toEqual(['alpha.ts', 'beta.ts']);
  });

  it('re-parses only the file that drifted on the second build', async () => {
    write('alpha.ts', 'export function alpha() {}');
    write('beta.ts', 'export function beta() {}');
    mockListing.set(root, ['alpha.ts', 'beta.ts']);

    const first = makeService();
    first.ensure(root);
    await settle();
    first.release(root);
    parsed = [];

    // Same content, new mtime AND new size → drifted.
    write('beta.ts', 'export function beta() { return 1; }');

    const second = makeService();
    second.ensure(root);
    await settle();

    expect(parsed.flat()).toEqual(['beta.ts']);
    // …and alpha is still answerable, from the SQLite copy.
    expect(
      second.query({ repoPath: root, query: 'alphats', limit: 10 }).hits
    ).toHaveLength(1);
  });

  it('parses nothing at all when nothing changed', async () => {
    write('alpha.ts', 'export function alpha() {}');
    mockListing.set(root, ['alpha.ts']);

    const first = makeService();
    first.ensure(root);
    await settle();
    first.release(root);
    parsed = [];

    const second = makeService();
    second.ensure(root);
    await settle();
    expect(parsed.flat()).toEqual([]);
    expect(
      second.query({ repoPath: root, query: 'alpha', limit: 10 }).hits
    ).toHaveLength(1);
  });

  it('notices a same-size edit through mtime', async () => {
    write('alpha.ts', 'export function alphaa() {}');
    mockListing.set(root, ['alpha.ts']);
    const first = makeService();
    first.ensure(root);
    await settle();
    first.release(root);
    parsed = [];

    // Identical LENGTH, different content — only mtime separates them, which
    // is exactly why the key is a pair.
    write('alpha.ts', 'export function alphab() {}');
    const future = new Date(Date.now() + 5_000);
    utimesSync(join(root, 'alpha.ts'), future, future);

    const second = makeService();
    second.ensure(root);
    await settle();
    expect(parsed.flat()).toEqual(['alpha.ts']);
  });

  it('forgets a file that vanished, in memory and on disk', async () => {
    write('alpha.ts', 'export function alpha() {}');
    write('gone.ts', 'export function gone() {}');
    mockListing.set(root, ['alpha.ts', 'gone.ts']);

    const service = makeService();
    service.ensure(root);
    await settle();
    expect(
      service.query({ repoPath: root, query: 'gonets', limit: 10 }).hits
    ).toHaveLength(1);

    rmSync(join(root, 'gone.ts'));
    mockListing.set(root, ['alpha.ts']);
    service.ensure(root);
    await settle();

    expect(
      service.query({ repoPath: root, query: 'gonets', limit: 10 }).hits
    ).toEqual([]);
    // And it is gone from the persisted copy too, not just the table.
    expect(persistence.loadStamps(root).has('gone.ts')).toBe(false);
    expect(persistence.loadSymbols(root).has('gone.ts')).toBe(false);
  });

  it('refuses to build when the grammars are missing, and says why', async () => {
    write('alpha.ts', 'export function alpha() {}');
    mockListing.set(root, ['alpha.ts']);
    const service = new SymbolService({
      pool: fakePool(),
      persistence,
      onProgress: () => undefined,
      assetProblem: () => 'The language grammars are missing from this build.'
    });
    service.ensure(root);
    await settle();
    const result = service.query({ repoPath: root, query: 'a', limit: 10 });
    expect(result.error).toBe('The language grammars are missing from this build.');
    expect(result.indexing).toBe(false);
    expect(parsed).toEqual([]);
  });

  it('re-indexes when the repo watcher fires, and only for live projects', async () => {
    write('alpha.ts', 'export function alpha() {}');
    mockListing.set(root, ['alpha.ts']);

    // Typed through a holder: TS narrows a plain `let` assigned only inside a
    // callback to `never` at the call sites below.
    const watcher: { fire?: (repoPath: string) => void } = {};
    const service = new SymbolService({
      pool: fakePool(),
      persistence,
      onProgress: () => undefined,
      onRepoChanged: (cb) => {
        watcher.fire = cb;
        return () => undefined;
      }
    });

    // A project with no index must not react at all — that is what keeps
    // "never on project open" true while agents write files continuously.
    watcher.fire?.('/some/other/repo');
    watcher.fire?.(root);
    await settle(AFTER_WATCH_DEBOUNCE);
    expect(parsed).toEqual([]);

    service.ensure(root);
    await settle();
    parsed = [];

    write('alpha.ts', 'export function alpha() { return 2; }');
    write('added.ts', 'export function added() {}');
    mockListing.set(root, ['alpha.ts', 'added.ts']);
    watcher.fire?.(root);
    await settle(AFTER_WATCH_DEBOUNCE);

    expect(parsed.flat().sort()).toEqual(['added.ts', 'alpha.ts']);
    expect(
      service.query({ repoPath: root, query: 'addedts', limit: 10 }).hits
    ).toHaveLength(1);
  });

  it('release() drops the table and makes the project cold again', async () => {
    write('alpha.ts', 'export function alpha() {}');
    mockListing.set(root, ['alpha.ts']);
    const service = makeService();
    service.ensure(root);
    await settle();
    service.release(root);
    const result = service.query({ repoPath: root, query: 'a', limit: 10 });
    expect(result.cold).toBe(true);
    expect(result.hits).toEqual([]);
  });
});

describe('SymbolPersistence', () => {
  it('round-trips symbols and stamps for one repo', () => {
    persistence.saveFiles('/repo', [
      {
        relPath: 'a.ts',
        mtimeMs: 1234.5,
        size: 42,
        symbols: [
          {
            name: 'alpha',
            kind: 'function',
            container: null,
            line: 3,
            column: 9,
            endColumn: 14
          }
        ]
      }
    ]);
    expect(persistence.loadStamps('/repo').get('a.ts')).toEqual({
      mtimeMs: 1234.5,
      size: 42
    });
    expect(persistence.loadSymbols('/repo').get('a.ts')).toEqual([
      {
        name: 'alpha',
        kind: 'function',
        container: null,
        line: 3,
        column: 9,
        endColumn: 14
      }
    ]);
  });

  it('replaces a file rather than accumulating duplicate rows', () => {
    const save = (name: string): void =>
      persistence.saveFiles('/repo', [
        {
          relPath: 'a.ts',
          mtimeMs: 1,
          size: 1,
          symbols: [
            {
              name,
              kind: 'function',
              container: null,
              line: 1,
              column: 0,
              endColumn: 1
            }
          ]
        }
      ]);
    save('first');
    save('second');
    const rows = persistence.loadSymbols('/repo').get('a.ts');
    expect(rows).toHaveLength(1);
    expect(rows?.[0]?.name).toBe('second');
  });

  it('keeps repos apart', () => {
    persistence.saveFiles('/one', [
      { relPath: 'a.ts', mtimeMs: 1, size: 1, symbols: [] }
    ]);
    persistence.saveFiles('/two', [
      { relPath: 'b.ts', mtimeMs: 1, size: 1, symbols: [] }
    ]);
    expect([...persistence.loadStamps('/one').keys()]).toEqual(['a.ts']);
    expect([...persistence.loadStamps('/two').keys()]).toEqual(['b.ts']);
    persistence.forgetRepo('/one');
    expect(persistence.loadStamps('/one').size).toBe(0);
    expect(persistence.loadStamps('/two').size).toBe(1);
  });
});
