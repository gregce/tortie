/**
 * Phase 198. The file walk against real git, over the repository the
 * conformance gate also builds: a copy, a rename to a name holding `*` and
 * `[`, an in place rewrite, a delete, a merge, and a wholesale move whose
 * contents changed too much to pair.
 */

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { GitService } from '../service';
import { git, isolateGitConfig, makeRepo as makeHarnessRepo } from './harness';

isolateGitConfig();

const STAR = 'notes/star*[x].txt';

function lines(prefix: string, count: number): string {
  const out: string[] = [];
  for (let i = 1; i <= count; i++) out.push(`${prefix} ${String(i)}`);
  return `${out.join('\n')}\n`;
}

describe('GitService.graphLog with a path', () => {
  const cleanups: string[] = [];
  afterAll(() => {
    for (const d of cleanups) rmSync(d, { recursive: true, force: true });
    delete process.env['GIT_AUTHOR_DATE'];
    delete process.env['GIT_COMMITTER_DATE'];
  });

  /**
   * `diff.renames` is switched OFF in the fixture on purpose: the walk's own
   * `-M` is what pairs the rename and the copy, and a fixture that inherited
   * a rename friendly config would pass without it.
   */
  function makeFixture(): GitService {
    const dir = makeHarnessRepo('gmux-filehistory-test-');
    cleanups.push(dir);
    git(dir, 'config', 'diff.renames', 'false');
    // Fixed, increasing dates: a followed walk is date ordered rather than
    // topo ordered (see `walk` in service.ts), so the row order the pins
    // below state must not depend on the second a test happened to run in.
    let at = 1700000000;
    const c = (subject: string): void => {
      at += 1;
      process.env['GIT_AUTHOR_DATE'] = `${String(at)} +0000`;
      process.env['GIT_COMMITTER_DATE'] = `${String(at)} +0000`;
      git(dir, 'add', '-A');
      git(dir, 'commit', '-q', '-m', subject);
    };
    mkdirSync(join(dir, 'notes'), { recursive: true });
    writeFileSync(join(dir, 'notes/a.txt'), lines('alpha line', 40));
    writeFileSync(join(dir, 'notes/gone.txt'), 'gone 1\ngone 2\n');
    c('c1 add a and gone');
    writeFileSync(join(dir, 'notes/a.txt'), lines('alpha line', 41));
    c('c2 edit a');
    git(dir, 'checkout', '-q', '-b', 'side');
    writeFileSync(join(dir, 'notes/a.txt'), `${lines('alpha line', 41)}side edit\n`);
    c('c3 side edits a');
    git(dir, 'checkout', '-q', 'main');
    writeFileSync(join(dir, 'notes/b.txt'), lines('alpha line', 41));
    c('c4 copy a to b');
    git(dir, 'merge', '-q', '--no-ff', '-m', 'c5 merge side', 'side');
    writeFileSync(join(dir, 'notes/b.txt'), `${lines('alpha line', 41)}beta line\n`);
    rmSync(join(dir, 'notes/gone.txt'));
    c('c6 edit b, delete gone');
    git(dir, 'mv', 'notes/b.txt', STAR);
    c('c7 rename b to star');
    writeFileSync(join(dir, STAR), `${lines('alpha line', 41)}beta line\nstar edit\n`);
    c('c8 edit star');
    writeFileSync(join(dir, STAR), lines('rewritten', 40));
    c('c9 rewrite star in place');
    rmSync(join(dir, STAR));
    writeFileSync(join(dir, 'notes/final.txt'), lines('final', 40));
    c('c10 move star to final with new content');
    return new GitService(dir);
  }

  const shape = (svc: GitService, path: string, follow: boolean) =>
    svc.graphLog({ path, follow }).then((r) =>
      r.entries.map((e) => [
        e.subject.split(' ')[0] ?? '',
        e.file?.status ?? '-',
        e.file?.path ?? '-',
        e.file?.origPath ?? '-'
      ])
    );

  it('follows the star file back through the rename and the copy', async () => {
    const svc = makeFixture();
    expect(await shape(svc, STAR, true)).toEqual([
      ['c10', 'D', STAR, '-'],
      ['c9', 'M', STAR, '-'],
      ['c8', 'M', STAR, '-'],
      ['c7', 'R', STAR, 'notes/b.txt'],
      ['c6', 'M', 'notes/b.txt', '-'],
      ['c4', 'C', 'notes/b.txt', 'notes/a.txt'],
      // c3 is on the side branch merged AFTER the copy. Under --topo-order
      // git's pathspec rewrite misses it; the followed walk drops that flag
      // and this row is the proof it did.
      ['c3', 'M', 'notes/a.txt', '-'],
      ['c2', 'M', 'notes/a.txt', '-'],
      ['c1', 'A', 'notes/a.txt', '-']
    ]);
  });

  it('draws a deleted file as its D then its A', async () => {
    const svc = makeFixture();
    expect(await shape(svc, 'notes/gone.txt', true)).toEqual([
      ['c6', 'D', 'notes/gone.txt', '-'],
      ['c1', 'A', 'notes/gone.txt', '-']
    ]);
  });

  it('reads a copy as C under follow and as A on the plain walk', async () => {
    const svc = makeFixture();
    const followed = await shape(svc, 'notes/b.txt', true);
    expect(followed.map((r) => r[1])).toEqual(['D', 'M', 'C', 'M', 'M', 'A']);
    const plain = await shape(svc, 'notes/b.txt', false);
    expect(plain.map((r) => `${r[0]} ${r[1]}`)).toEqual(['c7 D', 'c6 M', 'c4 A']);
  });

  it('leaves the merge out of the followed walk and in the plain one', async () => {
    const svc = makeFixture();
    const followed = await shape(svc, 'notes/a.txt', true);
    expect(followed.map((r) => r[0])).toEqual(['c3', 'c2', 'c1']);
    const plain = await shape(svc, 'notes', false);
    const merge = plain.find((r) => r[0] === 'c5');
    expect(merge).toEqual(['c5', '-', '-', '-']);
  });

  it('answers a path that never existed with no rows and no error', async () => {
    const svc = makeFixture();
    const r = await svc.graphLog({ path: 'notes/nope.txt', follow: true });
    expect(r.entries).toEqual([]);
    expect(r.hasMore).toBe(false);
  });

  it('refuses a folder under follow with a sentence, and walks it plain', async () => {
    const svc = makeFixture();
    await expect(svc.graphLog({ path: 'notes', follow: true })).rejects.toThrow(
      /Only a file can be followed/
    );
    const plain = await svc.graphLog({ path: 'notes', follow: false });
    expect(plain.entries.length).toBe(10);
  });

  it('refuses follow without a path', async () => {
    const svc = makeFixture();
    await expect(svc.graphLog({ follow: true })).rejects.toThrow(
      /exactly one file path/
    );
  });

  it('refuses a path that escapes the repository', async () => {
    const svc = makeFixture();
    await expect(
      svc.graphLog({ path: '../notes/a.txt', follow: true })
    ).rejects.toThrow(/relative to the repository root/);
  });

  it('pages with hasMore and a smaller window', async () => {
    const svc = makeFixture();
    const page = await svc.graphLog({ path: STAR, follow: true, maxCount: 3 });
    expect(page.entries.map((e) => e.subject.split(' ')[0] ?? '')).toEqual(['c10', 'c9', 'c8']);
    expect(page.hasMore).toBe(true);
  });
});
