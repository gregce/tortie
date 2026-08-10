/**
 * Integration tests for the HISTORICAL COMMIT DIFF path (BACKLOG Phase 12
 * item 4) against the REAL system git, isolated from the developer's global
 * config exactly like the sibling suites.
 *
 * What the bug was: a file opened from HISTORY rendered `HEAD` vs the WORKING
 * TREE, because the commit SHA never crossed the renderer's open-file bus.
 * These tests pin the contract that replaces it — LEFT is the file at the
 * commit's FIRST PARENT, RIGHT is the file at the commit — across every shape
 * a commit's file list can take: modify · add · delete · rename (including
 * with the user's `diff.renames` turned OFF) · root commit · merge commit ·
 * binary · a path that isn't in that commit · bad input.
 */

import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { GitService } from '../service';
import { git, isolateGitConfig, makeRepo as makeHarnessRepo } from './harness';

const makeRepo = (): string => makeHarnessRepo('gmux-commitdiff-test-');

isolateGitConfig();

/** Commit everything in the worktree and return the new full SHA. */
function commitAll(dir: string, message: string): string {
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', message);
  return git(dir, 'rev-parse', 'HEAD').trim();
}

describe('GitService.commitFileDiff against real git', () => {
  const cleanups: string[] = [];
  afterAll(() => {
    for (const d of cleanups) rmSync(d, { recursive: true, force: true });
  });

  it('diffs parent→commit for a MODIFIED file, ignoring the working tree', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'a.txt'), 'one\n');
    const first = commitAll(dir, 'first');
    writeFileSync(join(dir, 'a.txt'), 'one\ntwo\n');
    const second = commitAll(dir, 'second');
    writeFileSync(join(dir, 'a.txt'), 'one\ntwo\nthree\n');
    const third = commitAll(dir, 'third');
    // …and an UNSAVED edit on top: the historical diff must not see it.
    writeFileSync(join(dir, 'a.txt'), 'totally different\n');

    const diff = await svc.commitFileDiff({
      repoPath: dir,
      sha: second,
      path: 'a.txt',
      status: 'M'
    });
    expect(diff.sha).toBe(second);
    expect(diff.parentSha).toBe(first);
    expect(diff.oldPath).toBe('a.txt');
    expect(diff.newPath).toBe('a.txt');
    expect(diff.oldContents).toBe('one\n');
    expect(diff.newContents).toBe('one\ntwo\n');
    expect(diff.binary).toBe(false);

    // The regression in one assertion: the SECOND commit's diff is NOT the
    // third commit's content and NOT the worktree's.
    expect(diff.newContents).not.toContain('three');
    expect(diff.newContents).not.toContain('totally different');
    expect(third).not.toBe(second);
  });

  it('an ADDED file has no left side (all green)', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'a.txt'), 'a\n');
    commitAll(dir, 'first');
    writeFileSync(join(dir, 'new.txt'), 'brand new\n');
    const sha = commitAll(dir, 'add new.txt');

    const diff = await svc.commitFileDiff({
      repoPath: dir,
      sha,
      path: 'new.txt',
      status: 'A'
    });
    expect(diff.oldPath).toBeNull();
    expect(diff.oldContents).toBeNull();
    expect(diff.newPath).toBe('new.txt');
    expect(diff.newContents).toBe('brand new\n');
  });

  it('a DELETED file OPENS, with no right side (all red)', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'gone.txt'), 'here today\n');
    writeFileSync(join(dir, 'keep.txt'), 'k\n');
    commitAll(dir, 'first');
    rmSync(join(dir, 'gone.txt'));
    const sha = commitAll(dir, 'delete gone.txt');

    const diff = await svc.commitFileDiff({
      repoPath: dir,
      sha,
      path: 'gone.txt',
      status: 'D'
    });
    expect(diff.oldPath).toBe('gone.txt');
    expect(diff.oldContents).toBe('here today\n');
    expect(diff.newPath).toBeNull();
    expect(diff.newContents).toBeNull();
  });

  it('a RENAME diffs origPath@parent → path@commit', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'old-name.txt'), 'stable content\n');
    const first = commitAll(dir, 'first');
    git(dir, 'mv', 'old-name.txt', 'new-name.txt');
    const sha = commitAll(dir, 'rename');

    const detail = await svc.commitDetail(sha);
    expect(detail.files).toHaveLength(1);
    expect(detail.files[0]?.status).toBe('R');
    expect(detail.files[0]?.path).toBe('new-name.txt');
    expect(detail.files[0]?.origPath).toBe('old-name.txt');

    const diff = await svc.commitFileDiff({
      repoPath: dir,
      sha,
      path: 'new-name.txt',
      origPath: 'old-name.txt',
      status: 'R'
    });
    expect(diff.parentSha).toBe(first);
    expect(diff.oldPath).toBe('old-name.txt');
    expect(diff.newPath).toBe('new-name.txt');
    expect(diff.oldContents).toBe('stable content\n');
    expect(diff.newContents).toBe('stable content\n');
  });

  it('pairs renames even when the user has diff.renames = false', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);
    // The exact config that used to make a rename decay into D + A.
    git(dir, 'config', 'diff.renames', 'false');

    writeFileSync(join(dir, 'from.txt'), 'same bytes\n');
    commitAll(dir, 'first');
    git(dir, 'mv', 'from.txt', 'to.txt');
    const sha = commitAll(dir, 'rename with renames off');

    const detail = await svc.commitDetail(sha);
    expect(detail.files.map((f) => f.status)).toEqual(['R']);
    expect(detail.files[0]?.origPath).toBe('from.txt');
    expect(detail.files[0]?.path).toBe('to.txt');
  });

  it('a ROOT commit has no parent and every file reads as added', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'first.txt'), 'genesis\n');
    const root = commitAll(dir, 'root commit');

    expect(await svc.firstParent(root)).toBeNull();
    const diff = await svc.commitFileDiff({
      repoPath: dir,
      sha: root,
      path: 'first.txt',
      status: 'A'
    });
    expect(diff.parentSha).toBeNull();
    expect(diff.oldPath).toBeNull();
    expect(diff.oldContents).toBeNull();
    expect(diff.newContents).toBe('genesis\n');
  });

  it('a MERGE commit diffs against its FIRST parent only', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'base.txt'), 'base\n');
    commitAll(dir, 'first');
    git(dir, 'checkout', '-q', '-b', 'side');
    writeFileSync(join(dir, 'side.txt'), 'from the side\n');
    commitAll(dir, 'side work');
    git(dir, 'checkout', '-q', 'main');
    writeFileSync(join(dir, 'main.txt'), 'from main\n');
    const mainTip = commitAll(dir, 'main work');
    git(dir, 'merge', '--no-ff', '-m', 'merge side', 'side');
    const mergeSha = git(dir, 'rev-parse', 'HEAD').trim();

    expect(await svc.firstParent(mergeSha)).toBe(mainTip);

    // First-parent view: only the side branch's file arrives in the merge.
    const detail = await svc.commitDetail(mergeSha);
    expect(detail.files.map((f) => f.path)).toEqual(['side.txt']);

    const diff = await svc.commitFileDiff({
      repoPath: dir,
      sha: mergeSha,
      path: 'side.txt',
      status: 'A'
    });
    expect(diff.parentSha).toBe(mainTip);
    expect(diff.oldPath).toBeNull(); // absent on the first parent
    expect(diff.newContents).toBe('from the side\n');
  });

  it('flags BINARY files instead of returning mojibake', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'seed.txt'), 'x\n');
    commitAll(dir, 'first');
    writeFileSync(join(dir, 'blob.bin'), Buffer.from([0, 1, 2, 0, 255, 10]));
    const sha = commitAll(dir, 'add binary');

    const diff = await svc.commitFileDiff({
      repoPath: dir,
      sha,
      path: 'blob.bin',
      status: 'A'
    });
    expect(diff.binary).toBe(true);
    expect(diff.newContents).toBeNull();
    expect(diff.newPath).toBe('blob.bin'); // the side still EXISTS
  });

  it('a stale status letter cannot produce a wrong diff', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'a.txt'), 'v1\n');
    commitAll(dir, 'first');
    writeFileSync(join(dir, 'a.txt'), 'v2\n');
    const sha = commitAll(dir, 'second');

    // Claim it was ADDED when it was modified: the blobs decide, not the hint.
    const diff = await svc.commitFileDiff({
      repoPath: dir,
      sha,
      path: 'a.txt',
      status: 'A'
    });
    expect(diff.oldContents).toBe('v1\n');
    expect(diff.newContents).toBe('v2\n');
  });

  it('a path absent from that commit resolves to empty sides, never a throw', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'a.txt'), 'a\n');
    const sha = commitAll(dir, 'only a.txt');

    const diff = await svc.commitFileDiff({
      repoPath: dir,
      sha,
      path: 'never-existed.txt',
      status: 'M'
    });
    expect(diff.oldPath).toBeNull();
    expect(diff.newPath).toBeNull();
    expect(diff.binary).toBe(false);
  });

  it('rejects a bad commit id and a path outside the repo', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);
    writeFileSync(join(dir, 'a.txt'), 'a\n');
    const sha = commitAll(dir, 'first');

    // Not hex → INVALID_INPUT before any git spawn.
    await expect(
      svc.commitFileDiff({ repoPath: dir, sha: 'zzzz', path: 'a.txt', status: 'M' })
    ).rejects.toThrow(/INVALID_INPUT/);
    // Well-formed but absent → still INVALID_INPUT, never a silent empty diff.
    await expect(
      svc.commitFileDiff({
        repoPath: dir,
        sha: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        path: 'a.txt',
        status: 'M'
      })
    ).rejects.toThrow(/INVALID_INPUT/);
    await expect(
      svc.commitFileDiff({
        repoPath: dir,
        sha,
        path: '../escape.txt',
        status: 'M'
      })
    ).rejects.toThrow(/INVALID_INPUT/);
  });

  it('accepts an abbreviated sha and resolves it to the full id', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);
    writeFileSync(join(dir, 'a.txt'), 'a\n');
    const sha = commitAll(dir, 'first');

    const diff = await svc.commitFileDiff({
      repoPath: dir,
      sha: sha.slice(0, 8),
      path: 'a.txt',
      status: 'A'
    });
    expect(diff.sha).toBe(sha);
    expect(diff.shortSha).toBe(sha.slice(0, 7));
  });
});
