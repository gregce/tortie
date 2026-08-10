/**
 * Integration tests: GitService against the REAL system git in throwaway
 * repos under os.tmpdir(). Isolated from the developer's global/system git
 * config (signing, hooks, templates) via GIT_CONFIG_GLOBAL/SYSTEM.
 */

import { mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { GitService } from '../service';
import { git, isolateGitConfig, makeRepo as makeHarnessRepo } from './harness';

const makeRepo = (): string => makeHarnessRepo('gmux-git-test-');

isolateGitConfig();

describe('GitService against real git', () => {
  const cleanups: string[] = [];
  afterAll(() => {
    for (const d of cleanups) rmSync(d, { recursive: true, force: true });
  });

  it('treats a plain folder as a friendly non-repo state', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gmux-notrepo-'));
    cleanups.push(dir);
    const svc = new GitService(dir);

    expect(await svc.isRepo()).toBe(false);
    const status = await svc.status();
    expect(status.isRepo).toBe(false);
    expect(status.files).toEqual([]);
    expect(await svc.log()).toEqual([]);
    expect(await svc.showHead('anything.txt')).toBeNull();
    await expect(svc.stage(['x.txt'])).rejects.toThrow(/NOT_A_GIT_REPO/);
    await expect(svc.commit('msg')).rejects.toThrow(/NOT_A_GIT_REPO/);
  });

  it('runs the full stage → commit → log → showHead → modify → discard loop', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    // Untracked
    writeFileSync(join(dir, 'a.txt'), 'hello v1\n');
    let status = await svc.status();
    expect(status.isRepo).toBe(true);
    expect(status.branch).toBe('main');
    expect(status.groups.untracked.map((f) => f.path)).toEqual(['a.txt']);

    // Stage
    await svc.stage(['a.txt']);
    status = await svc.status();
    expect(status.groups.staged.map((f) => f.path)).toEqual(['a.txt']);
    expect(status.groups.staged[0]!.indexState).toBe('A');

    // Commit (multi-line message via -F tempfile)
    const hash = await svc.commit('feat: add a.txt\n\nBody line.\n');
    expect(hash).toMatch(/^[0-9a-f]{40}$/);

    // Log
    const log = await svc.log();
    expect(log).toHaveLength(1);
    expect(log[0]!.sha).toBe(hash);
    expect(log[0]!.shortSha.length).toBeGreaterThanOrEqual(7);
    expect(log[0]!.subject).toBe('feat: add a.txt');
    expect(log[0]!.author).toBe('gmux test');
    expect(log[0]!.parents).toEqual([]);
    expect(Date.parse(log[0]!.dateISO)).toBe(log[0]!.authorDate);

    // showHead
    expect(await svc.showHead('a.txt')).toBe('hello v1\n');
    expect(await svc.showHead('never-existed.txt')).toBeNull();

    // Modify → changes group
    writeFileSync(join(dir, 'a.txt'), 'hello v2\n');
    status = await svc.status();
    expect(status.groups.changes.map((f) => f.path)).toEqual(['a.txt']);
    expect(status.groups.changes[0]!.worktreeState).toBe('M');
    expect(status.groups.staged).toEqual([]);

    // Stage then unstage (restore --staged path)
    await svc.stage(['a.txt']);
    await svc.unstage(['a.txt']);
    status = await svc.status();
    expect(status.groups.staged).toEqual([]);
    expect(status.groups.changes.map((f) => f.path)).toEqual(['a.txt']);

    // Discard tracked modification → clean
    await svc.discard(['a.txt']);
    expect(await svc.showHead('a.txt')).toBe('hello v1\n');
    status = await svc.status();
    expect(status.files).toEqual([]);

    // Discard untracked → file deleted
    writeFileSync(join(dir, 'junk.txt'), 'trash\n');
    await svc.discard(['junk.txt']);
    expect(existsSync(join(dir, 'junk.txt'))).toBe(false);

    // Discarding an already-clean path is a silent no-op
    await svc.discard(['a.txt']);
  });

  it('reports staged renames with origPath', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'old name.txt'), 'same content for rename\n');
    await svc.stage(['old name.txt']);
    await svc.commit('add old name');
    git(dir, 'mv', 'old name.txt', 'new name.txt');

    const status = await svc.status();
    const ren = status.groups.staged.find((f) => f.indexState === 'R');
    expect(ren).toBeDefined();
    expect(ren!.path).toBe('new name.txt');
    expect(ren!.origPath).toBe('old name.txt');
  });

  it('unstages on an unborn branch via the rm --cached fallback', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'first.txt'), 'x\n');
    await svc.stage(['first.txt']);
    let status = await svc.status();
    expect(status.groups.staged.map((f) => f.path)).toEqual(['first.txt']);

    await svc.unstage(['first.txt']);
    status = await svc.status();
    expect(status.groups.staged).toEqual([]);
    expect(status.groups.untracked.map((f) => f.path)).toEqual(['first.txt']);

    // Empty repo history is [] rather than an error
    expect(await svc.log()).toEqual([]);
    expect(await svc.showHead('first.txt')).toBeNull();
  });

  it('is binary-safe through showHeadBuffer', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    const bytes = Buffer.from([0, 1, 2, 255, 254, 0, 10, 13, 0, 42]);
    writeFileSync(join(dir, 'blob.bin'), bytes);
    await svc.stage(['blob.bin']);
    await svc.commit('add binary');

    const roundTrip = await svc.showHeadBuffer('blob.bin');
    expect(roundTrip).not.toBeNull();
    expect(Buffer.compare(roundTrip!, bytes)).toBe(0);
  });

  it('rejects empty commits and empty messages with structured errors', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    await expect(svc.commit('   ')).rejects.toThrow(/INVALID_INPUT/);
    await expect(svc.commit('no changes')).rejects.toThrow(/GIT_FAILED/);
  });

  it('rejects path escapes', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);
    await expect(svc.stage(['../outside.txt'])).rejects.toThrow(
      /INVALID_INPUT/
    );
    await expect(svc.showHead('/etc/passwd')).rejects.toThrow(
      /INVALID_INPUT/
    );
  });

  it('stages literal metacharacter filenames without globbing', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'file[1].txt'), 'bracketed\n');
    writeFileSync(join(dir, 'file1.txt'), 'plain\n');
    await svc.stage(['file[1].txt']);
    const status = await svc.status();
    expect(status.groups.staged.map((f) => f.path)).toEqual(['file[1].txt']);
    expect(status.groups.untracked.map((f) => f.path)).toEqual(['file1.txt']);
  });

  it('detects merge-in-progress with conflicts', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'c.txt'), 'base\n');
    await svc.stage(['c.txt']);
    await svc.commit('base');
    git(dir, 'checkout', '-b', 'feature');
    writeFileSync(join(dir, 'c.txt'), 'feature\n');
    await svc.stage(['c.txt']);
    await svc.commit('feature change');
    git(dir, 'checkout', 'main');
    writeFileSync(join(dir, 'c.txt'), 'main\n');
    await svc.stage(['c.txt']);
    await svc.commit('main change');
    try {
      git(dir, 'merge', 'feature');
    } catch {
      /* conflict expected */
    }

    const status = await svc.status();
    expect(status.merging).toBe(true);
    expect(status.groups.merge.map((f) => f.path)).toEqual(['c.txt']);
    expect(status.groups.merge[0]!.indexState).toBe('U');
  });
});
