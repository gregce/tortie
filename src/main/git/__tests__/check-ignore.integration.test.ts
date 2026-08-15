/**
 * Phase 47 item 1: GitService.checkIgnore against the REAL system git, in
 * throwaway repos under os.tmpdir(), isolated from the developer's global and
 * system git config the same way every other git suite here is.
 *
 * These are the four properties the file tree's dimming depends on. Each one
 * was measured before the feature was designed rather than assumed, and each
 * would be silently wrong in a way no screenshot would catch.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { GitService } from '../service';
import { git, isolateGitConfig, makeRepo as makeHarnessRepo } from './harness';

const makeRepo = (): string => makeHarnessRepo('gmux-ignore-test-');

isolateGitConfig();

describe('GitService.checkIgnore against real git', () => {
  const cleanups: string[] = [];
  afterAll(() => {
    for (const d of cleanups) rmSync(d, { recursive: true, force: true });
  });

  it('answers with the ignored subset, spelled exactly as it was asked', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    mkdirSync(join(dir, 'dist'));
    mkdirSync(join(dir, 'src'));
    writeFileSync(join(dir, 'dist', 'a.js'), 'x\n');
    writeFileSync(join(dir, 'src', 'main.ts'), 'x\n');
    writeFileSync(join(dir, 'notes.log'), 'x\n');
    writeFileSync(join(dir, '.gitignore'), '*.log\ndist/\n');
    git(dir, 'add', '.gitignore', 'src/main.ts');
    git(dir, 'commit', '-m', 'init');

    const svc = new GitService(dir);
    const answer = await svc.checkIgnore([
      'dist/',
      'src/',
      'notes.log',
      'src/main.ts',
      '.gitignore'
    ]);
    // The directory keeps its trailing slash, which is what tells
    // @pierre/trees it may dim the whole subtree without asking again.
    expect(answer).toEqual(['dist/', 'notes.log']);
  });

  it('maps "none of these are ignored" (exit 1) to an empty list', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    writeFileSync(join(dir, 'a.txt'), 'x\n');
    git(dir, 'add', 'a.txt');
    git(dir, 'commit', '-m', 'init');

    const svc = new GitService(dir);
    expect(await svc.checkIgnore(['a.txt'])).toEqual([]);
  });

  it('never reports a TRACKED file, so a committed file is never dimmed', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    writeFileSync(join(dir, 'keep.log'), 'x\n');
    git(dir, 'add', 'keep.log');
    git(dir, 'commit', '-m', 'keep');
    // The pattern arrives after the file is already tracked.
    writeFileSync(join(dir, '.gitignore'), '*.log\n');
    writeFileSync(join(dir, 'other.log'), 'x\n');

    const svc = new GitService(dir);
    expect(await svc.checkIgnore(['keep.log', 'other.log'])).toEqual([
      'other.log'
    ]);
  });

  it('never reports a directory that still holds a tracked file', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    mkdirSync(join(dir, 'nested'));
    writeFileSync(join(dir, 'nested', 'tracked.txt'), 'x\n');
    git(dir, 'add', 'nested/tracked.txt');
    git(dir, 'commit', '-m', 'init');
    writeFileSync(join(dir, '.gitignore'), 'nested/\n');

    const svc = new GitService(dir);
    expect(await svc.checkIgnore(['nested/'])).toEqual([]);
  });

  it('maps a fatal (exit 128) to an empty list rather than a rejection', async () => {
    // A path outside the repository makes git exit 128 and abandon the list.
    // The tree only ever sends repo-relative paths; this proves the friendly
    // read holds if that ever stops being true.
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);
    expect(await svc.checkIgnore(['/etc/hosts'])).toEqual([]);
  });

  it('treats a plain folder as the empty answer, not an error', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gmux-ignore-notrepo-'));
    cleanups.push(dir);
    const svc = new GitService(dir);
    expect(await svc.checkIgnore(['anything'])).toEqual([]);
  });

  it('spawns nothing for an empty or blank-only list', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);
    expect(await svc.checkIgnore([])).toEqual([]);
    expect(await svc.checkIgnore(['', ''])).toEqual([]);
  });

  it('splits on NUL, so a path with a newline in it survives', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    writeFileSync(join(dir, '.gitignore'), '*.log\n');
    git(dir, 'add', '.gitignore');
    git(dir, 'commit', '-m', 'init');

    const svc = new GitService(dir);
    const weird = 'two\nlines.log';
    expect(await svc.checkIgnore([weird, 'plain.log'])).toEqual([
      weird,
      'plain.log'
    ]);
  });
});
