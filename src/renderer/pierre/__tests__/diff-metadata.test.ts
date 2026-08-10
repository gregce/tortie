/**
 * The approximate comparison that stands in while a large diff is still being
 * computed in a worker (Phase 12.0). It has to produce a patch @pierre/diffs
 * accepts, with full-file line arrays attached (isPartial false) so hunk
 * expansion keeps working while the approximation is on screen.
 */
import { describe, expect, it } from 'vitest';
import { coarseDiff, countLines, fileCacheKey } from '../diff-metadata';

const file = (contents: string) => ({ name: 'sample.ts', contents });

describe('countLines', () => {
  it('counts lines with and without a trailing newline', () => {
    expect(countLines('')).toBe(0);
    expect(countLines('a')).toBe(1);
    expect(countLines('a\n')).toBe(1);
    expect(countLines('a\nb')).toBe(2);
    expect(countLines('a\nb\n')).toBe(2);
    expect(countLines('\n\n')).toBe(2);
  });
});

describe('fileCacheKey', () => {
  it('changes when the contents change', () => {
    const a = fileCacheKey('work', '/x/y.ts', 'const a = 1;\n');
    const b = fileCacheKey('work', '/x/y.ts', 'const a = 2;\n');
    expect(a).not.toBe(b);
    expect(fileCacheKey('work', '/x/y.ts', 'const a = 1;\n')).toBe(a);
  });

  it('separates the two sides of one file', () => {
    const contents = 'same\n';
    expect(fileCacheKey('head', '/x/y.ts', contents)).not.toBe(
      fileCacheKey('work', '/x/y.ts', contents)
    );
  });
});

describe('coarseDiff', () => {
  it('reports no diff for identical contents', () => {
    expect(coarseDiff(file('a\nb\n'), file('a\nb\n'))).toBeNull();
  });

  it('keeps the shared head and tail out of the changed block', () => {
    const before = 'a\nb\nc\nd\ne\nf\ng\nh\n';
    const after = 'a\nb\nc\nd\nCHANGED\nf\ng\nh\n';
    const meta = coarseDiff(file(before), file(after));
    expect(meta).not.toBeNull();
    if (meta === null) return;
    expect(meta.isPartial).toBe(false);
    expect(meta.hunks).toHaveLength(1);
    const [hunk] = meta.hunks;
    expect(hunk?.deletionLines).toBe(1);
    expect(hunk?.additionLines).toBe(1);
    // Full file contents stay attached, so context expansion still works.
    expect(meta.deletionLines).toHaveLength(8);
    expect(meta.additionLines).toHaveLength(8);
  });

  it('collapses a genuinely rewritten file into one replaced block', () => {
    const before = Array.from({ length: 40 }, (_, i) => `old ${i}`).join('\n');
    const after = Array.from({ length: 30 }, (_, i) => `new ${i}`).join('\n');
    const meta = coarseDiff(file(`${before}\n`), file(`${after}\n`));
    expect(meta).not.toBeNull();
    if (meta === null) return;
    expect(meta.hunks).toHaveLength(1);
    expect(meta.hunks[0]?.deletionLines).toBe(40);
    expect(meta.hunks[0]?.additionLines).toBe(30);
    expect(meta.unifiedLineCount).toBe(70);
  });

  it('handles a file with no previous version', () => {
    const meta = coarseDiff(file(''), file('one\ntwo\n'));
    expect(meta).not.toBeNull();
    if (meta === null) return;
    expect(meta.hunks[0]?.deletionLines).toBe(0);
    expect(meta.hunks[0]?.additionLines).toBe(2);
  });

  it('handles a file whose contents were all removed', () => {
    const meta = coarseDiff(file('one\ntwo\n'), file(''));
    expect(meta).not.toBeNull();
    if (meta === null) return;
    expect(meta.hunks[0]?.deletionLines).toBe(2);
    expect(meta.hunks[0]?.additionLines).toBe(0);
  });

  it('handles an append at the end of a file', () => {
    const meta = coarseDiff(file('a\nb\n'), file('a\nb\nc\n'));
    expect(meta).not.toBeNull();
    if (meta === null) return;
    expect(meta.hunks[0]?.deletionLines).toBe(0);
    expect(meta.hunks[0]?.additionLines).toBe(1);
  });
});
