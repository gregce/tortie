/**
 * Integration tests: the branch-management GitService methods (Phase 10 #7 —
 * remoteBranches / fetch / checkoutTracking / deleteBranch) against the REAL
 * system git, using a local path clone as the "remote" (no network), with
 * the same global/system config isolation as the sibling suites.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { GitService } from '../service';
import { git, isolateGitConfig, makeRepo as makeHarnessRepo } from './harness';

const makeRepo = (): string => makeHarnessRepo('gmux-gitbranches-test-');

isolateGitConfig();

describe('GitService branch management against real git', () => {
  const cleanups: string[] = [];
  afterAll(() => {
    for (const d of cleanups) rmSync(d, { recursive: true, force: true });
  });

  /** Origin repo (main + feat/x) and a clone of it. */
  function makeOriginAndClone(): { origin: string; clone: string } {
    const origin = makeRepo();
    cleanups.push(origin);
    writeFileSync(join(origin, 'a.txt'), 'one\n');
    git(origin, 'add', '-A');
    git(origin, 'commit', '-m', 'initial commit');
    git(origin, 'checkout', '-b', 'feat/x');
    writeFileSync(join(origin, 'b.txt'), 'feature\n');
    git(origin, 'add', '-A');
    git(origin, 'commit', '-m', 'feature commit');
    git(origin, 'checkout', 'main');

    const parent = mkdtempSync(join(tmpdir(), 'gmux-gitbranches-clone-'));
    cleanups.push(parent);
    git(parent, 'clone', origin, 'clone');
    const clone = join(parent, 'clone');
    git(clone, 'config', 'user.name', 'gmux test');
    git(clone, 'config', 'user.email', 'test@gmux.local');
    git(clone, 'config', 'commit.gpgsign', 'false');
    return { origin, clone };
  }

  it('remoteBranches lists remote refs and dedupes origin/HEAD', async () => {
    const { clone } = makeOriginAndClone();
    const svc = new GitService(clone);

    // A clone always has the symbolic origin/HEAD ref — it must not render.
    expect(git(clone, 'branch', '-r')).toContain('origin/HEAD');

    const result = await svc.remoteBranches();
    const names = result.branches.map((b) => b.name).sort();
    expect(names).toEqual(['origin/feat/x', 'origin/main']);
    const feat = result.branches.find((b) => b.name === 'origin/feat/x')!;
    expect(feat.remote).toBe('origin');
    expect(feat.shortName).toBe('feat/x');
    expect(feat.subject).toBe('feature commit');
  });

  it('remoteBranches resolves empty for a repo with no remotes', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);
    const result = await svc.remoteBranches();
    expect(result.branches).toEqual([]);
  });

  it('fetch picks up new upstream branches and stamps lastFetchedAt', async () => {
    const { origin, clone } = makeOriginAndClone();
    const svc = new GitService(clone);

    git(origin, 'checkout', '-b', 'feat/new');
    writeFileSync(join(origin, 'c.txt'), 'new\n');
    git(origin, 'add', '-A');
    git(origin, 'commit', '-m', 'new branch commit');
    git(origin, 'checkout', 'main');

    await svc.fetch();
    const result = await svc.remoteBranches();
    expect(result.branches.map((b) => b.name)).toContain('origin/feat/new');
    // fetch writes FETCH_HEAD — the timestamp is now known and recent.
    expect(result.lastFetchedAt).not.toBeNull();
    expect(Math.abs(Date.now() - result.lastFetchedAt!)).toBeLessThan(60_000);
  });

  it('checkoutTracking creates a tracking local, then reuses it', async () => {
    const { clone } = makeOriginAndClone();
    const svc = new GitService(clone);

    await svc.checkoutTracking('origin/feat/x');
    let branches = await svc.branches();
    const feat = branches.find((b) => b.name === 'feat/x');
    expect(feat).toBeDefined();
    expect(feat!.current).toBe(true);
    expect(feat!.upstream).toBe('origin/feat/x');

    // Same short name now exists locally: plain switch, no duplicate.
    await svc.checkout('main');
    await svc.checkoutTracking('origin/feat/x');
    branches = await svc.branches();
    expect(branches.filter((b) => b.name === 'feat/x')).toHaveLength(1);
    expect(branches.find((b) => b.name === 'feat/x')!.current).toBe(true);
  });

  it('deleteBranch: merged deletes, unmerged is typed, force wins', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'a.txt'), 'one\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-m', 'initial commit');

    // Merged (tip == HEAD): plain -d succeeds.
    git(dir, 'branch', 'merged');
    expect(await svc.deleteBranch('merged')).toEqual({ status: 'deleted' });

    // Unmerged: -d refuses → typed state, branch still there.
    git(dir, 'checkout', '-b', 'wip');
    writeFileSync(join(dir, 'w.txt'), 'wip\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-m', 'wip commit');
    git(dir, 'checkout', 'main');
    expect(await svc.deleteBranch('wip')).toEqual({ status: 'unmerged' });
    expect((await svc.branches()).map((b) => b.name)).toContain('wip');

    // Force: -D discards it.
    expect(await svc.deleteBranch('wip', true)).toEqual({ status: 'deleted' });
    expect((await svc.branches()).map((b) => b.name)).not.toContain('wip');

    // Deleting the current branch stays a plain failure (git's own message).
    await expect(svc.deleteBranch('main')).rejects.toThrow();
  });
});
