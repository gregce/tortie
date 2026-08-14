/**
 * The columnar table and its ranker.
 *
 * These are the cases a manual pass through the palette will not find: the
 * camel-hump highlight, `@`-mode document order, and the fact that removing a
 * file has to invalidate the derived columns rather than leaving a stale blob
 * behind.
 */

import { describe, expect, it } from 'vitest';
import { SymbolTable } from '../store';
import type { ExtractedSymbol } from '../extract';

function sym(
  name: string,
  overrides: Partial<ExtractedSymbol> = {}
): ExtractedSymbol {
  return {
    name,
    kind: 'function',
    container: null,
    line: 1,
    column: 0,
    endColumn: name.length,
    ...overrides
  };
}

describe('SymbolTable', () => {
  it('is empty until something is put in it', () => {
    const t = new SymbolTable();
    expect(t.query('anything', 10)).toEqual([]);
    expect(t.fileCount).toBe(0);
    expect(t.symbolCount).toBe(0);
  });

  it('counts a file with zero symbols as indexed', () => {
    const t = new SymbolTable();
    t.setFile('empty.ts', []);
    expect(t.fileCount).toBe(1);
    expect(t.has('empty.ts')).toBe(true);
    expect(t.symbolCount).toBe(0);
  });

  it('ranks an exact name above a prefix above a subsequence', () => {
    const t = new SymbolTable();
    t.setFile('a.ts', [
      sym('openFile'),
      sym('openFileInNewTab'),
      sym('reopenFileLater')
    ]);
    const hits = t.query('openFile', 10);
    expect(hits.map((h) => h.name)).toEqual([
      'openFile',
      'openFileInNewTab',
      'reopenFileLater'
    ]);
  });

  it('highlights camelCase humps rather than the leftmost characters', () => {
    const t = new SymbolTable();
    t.setFile('a.ts', [sym('onFileOpen')]);
    const hit = t.query('ofo', 10)[0];
    expect(hit?.name).toBe('onFileOpen');
    // o(0) F(2) O(6) — the humps, not o(0) o(?) …
    expect(hit?.positions).toEqual([0, 2, 6]);
  });

  it('highlights snake_case word starts too', () => {
    const t = new SymbolTable();
    t.setFile('a.py', [sym('load_user_config')]);
    const hit = t.query('luc', 10)[0];
    expect(hit?.positions).toEqual([0, 5, 10]);
  });

  it('ignores case in the query', () => {
    const t = new SymbolTable();
    t.setFile('a.ts', [sym('MAX_TABS', { kind: 'constant' })]);
    expect(t.query('maxtabs', 10)[0]?.name).toBe('MAX_TABS');
    expect(t.query('MAXTABS', 10)[0]?.name).toBe('MAX_TABS');
  });

  it('drops symbols the query cannot be a subsequence of', () => {
    const t = new SymbolTable();
    t.setFile('a.ts', [sym('alpha'), sym('beta')]);
    expect(t.query('zzz', 10)).toEqual([]);
    // Order matters: "ahpla" is the same letters, wrong sequence.
    expect(t.query('ahpla', 10)).toEqual([]);
  });

  it('carries kind, container, file and position through to the hit', () => {
    const t = new SymbolTable();
    t.setFile('src/a.ts', [
      sym('render', {
        kind: 'method',
        container: 'ActivityBar',
        line: 42,
        column: 2,
        endColumn: 8
      })
    ]);
    expect(t.query('render', 10)[0]).toMatchObject({
      name: 'render',
      kind: 'method',
      container: 'ActivityBar',
      relPath: 'src/a.ts',
      line: 42,
      column: 2,
      endColumn: 8
    });
  });

  it('restricts to one file and keeps document order in @ mode', () => {
    const t = new SymbolTable();
    t.setFile('a.ts', [
      sym('zeta', { line: 3 }),
      sym('alpha', { line: 10 }),
      sym('mid', { line: 20 })
    ]);
    t.setFile('b.ts', [sym('alphaElsewhere', { line: 1 })]);
    const hits = t.query('', 50, 'a.ts');
    expect(hits.map((h) => h.name)).toEqual(['zeta', 'alpha', 'mid']);
    // Even with a query, @ mode stays in document order — "what is in this
    // file, in order" is the question ⌘⇧O answers about the open file.
    expect(t.query('a', 50, 'a.ts').map((h) => h.name)).toEqual([
      'zeta',
      'alpha'
    ]);
  });

  it('returns nothing for a file it has not indexed', () => {
    const t = new SymbolTable();
    t.setFile('a.ts', [sym('x')]);
    expect(t.query('x', 10, 'never-seen.ts')).toEqual([]);
  });

  it('invalidates the derived columns when a file changes', () => {
    const t = new SymbolTable();
    t.setFile('a.ts', [sym('before')]);
    expect(t.query('before', 10)).toHaveLength(1);
    t.setFile('a.ts', [sym('after')]);
    expect(t.query('before', 10)).toHaveLength(0);
    expect(t.query('after', 10)).toHaveLength(1);
  });

  it('forgets a removed file', () => {
    const t = new SymbolTable();
    t.setFile('a.ts', [sym('gone')]);
    t.setFile('b.ts', [sym('stays')]);
    t.removeFile('a.ts');
    expect(t.query('gone', 10)).toEqual([]);
    expect(t.query('stays', 10)).toHaveLength(1);
    expect(t.fileCount).toBe(1);
  });

  it('retainOnly drops everything an enumeration no longer lists', () => {
    const t = new SymbolTable();
    t.setFile('a.ts', [sym('a')]);
    t.setFile('b.ts', [sym('b')]);
    t.setFile('c.ts', [sym('c')]);
    expect(t.retainOnly(new Set(['b.ts']))).toBe(2);
    expect(t.fileCount).toBe(1);
    expect(t.query('a', 10)).toEqual([]);
    expect(t.query('b', 10)).toHaveLength(1);
  });

  it('honours the limit', () => {
    const t = new SymbolTable();
    t.setFile(
      'a.ts',
      Array.from({ length: 200 }, (_, i) => sym(`handler${i}`))
    );
    expect(t.query('handler', 25)).toHaveLength(25);
  });

  it('answers a three-letter query over 100k symbols inside the budget', () => {
    // Research 19 §3.3 measured 4-8 ms at this scale. The assertion is a
    // REGRESSION TRIPWIRE at 10x that, not a benchmark: it exists so a future
    // "let's just use a regex per symbol" cannot land unnoticed.
    const t = new SymbolTable();
    for (let f = 0; f < 200; f++) {
      t.setFile(
        `src/file${f}.ts`,
        Array.from({ length: 500 }, (_, i) =>
          sym(`someHandlerName${f}_${i}`, { line: i + 1 })
        )
      );
    }
    expect(t.symbolCount).toBe(100_000);
    t.query('warm', 50);
    const started = performance.now();
    const hits = t.query('shn', 50);
    const elapsed = performance.now() - started;
    expect(hits.length).toBe(50);
    // 80 ms is the tripwire on a developer machine. Shared CI runners are
    // slower and uneven, and this line failed at 88 ms on a run whose diff
    // never touched symbols. 200 ms keeps the tripwire real there: the
    // regression this test exists to catch would cost far more than that.
    expect(elapsed).toBeLessThan(process.env.CI ? 200 : 80);
  });
});
