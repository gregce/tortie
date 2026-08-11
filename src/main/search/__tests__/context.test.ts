/**
 * `search:context` — the lines fetched when a result group is expanded.
 *
 * Two properties are worth pinning: it reads only as far as it must (so
 * expanding a hit near the top of a 400 MB log is not a 400 MB read), and it
 * goes through the same `resolveInsideRoot` guard as every fs mutation, so a
 * crafted relPath cannot read outside the project.
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readSearchContext } from '../context';

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'gmux-search-ctx-'));
  await writeFile(
    join(root, 'file.ts'),
    Array.from({ length: 40 }, (_, i) => `line ${i + 1}`).join('\n')
  );
  await writeFile(join(root, 'crlf.ts'), 'one\r\ntwo\r\nthree\r\n');
  await writeFile(join(root, 'wide.ts'), `a\n${'x'.repeat(9000)}\nb\n`);
  await writeFile(join(root, 'secret.txt'), 'not part of the project\n');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('readSearchContext', () => {
  it('returns the lines either side, excluding the match line itself', async () => {
    const { lines } = await readSearchContext({
      repoPath: root,
      relPath: 'file.ts',
      line: 10,
      before: 2,
      after: 2
    });
    expect(lines.map((l) => l.line)).toEqual([8, 9, 11, 12]);
    expect(lines[0]!.text).toBe('line 8');
  });

  it('clamps at the top and the bottom of the file', async () => {
    const head = await readSearchContext({
      repoPath: root,
      relPath: 'file.ts',
      line: 1,
      before: 5,
      after: 1
    });
    expect(head.lines.map((l) => l.line)).toEqual([2]);

    const tail = await readSearchContext({
      repoPath: root,
      relPath: 'file.ts',
      line: 40,
      before: 1,
      after: 5
    });
    expect(tail.lines.map((l) => l.line)).toEqual([39]);
  });

  it('strips CRLF carriage returns', async () => {
    const { lines } = await readSearchContext({
      repoPath: root,
      relPath: 'crlf.ts',
      line: 2,
      before: 1,
      after: 1
    });
    expect(lines.map((l) => l.text)).toEqual(['one', 'three']);
  });

  it('clamps a very long context line like the stream does', async () => {
    const { lines } = await readSearchContext({
      repoPath: root,
      relPath: 'wide.ts',
      line: 1,
      before: 0,
      after: 1,
      maxLineChars: 100
    });
    expect(lines[0]!.text).toHaveLength(101); // 100 + the ellipsis
  });

  it('asks for nothing and gets nothing', async () => {
    const { lines } = await readSearchContext({
      repoPath: root,
      relPath: 'file.ts',
      line: 5,
      before: 0,
      after: 0
    });
    expect(lines).toEqual([]);
  });

  it('refuses a path that escapes the project root', async () => {
    await expect(
      readSearchContext({
        repoPath: join(root, 'sub-that-does-not-exist'),
        relPath: 'file.ts',
        line: 1,
        before: 1,
        after: 1
      })
    ).rejects.toThrow();

    await expect(
      readSearchContext({
        repoPath: root,
        relPath: '../secret.txt',
        line: 1,
        before: 1,
        after: 1
      })
    ).rejects.toThrow();
  });

  it('refuses a nonsense line number', async () => {
    await expect(
      readSearchContext({
        repoPath: root,
        relPath: 'file.ts',
        line: 0,
        before: 1,
        after: 1
      })
    ).rejects.toThrow();
  });
});
