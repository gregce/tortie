/**
 * Integration tests for the SYNC verbs (BACKLOG Phase 12 item 3): remotes,
 * push, publish, pull, sync — against the REAL system git, with a local BARE
 * repository standing in for the network. Nothing here touches a network:
 * `file://`-style local remotes exercise the same git code paths (refspecs,
 * upstream tracking, fast-forward rejection) with none of the flakiness.
 *
 * Isolated from the developer's global/system git config like every sibling
 * suite — which also means no `pull.rebase` is set, so the "divergent
 * branches" case here is exactly the one a real user hits.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { GitService } from '../service';
import { git, isolateGitConfig, makeRepo as makeHarnessRepo } from './harness';

isolateGitConfig();

/** A bare repo to push to and pull from — the stand-in for a remote. */
function makeBare(): string {
  const dir = mkdtempSync(join(tmpdir(), 'gmux-sync-bare-'));
  git(dir, 'init', '--bare', '-b', 'main');
  return dir;
}

/** A working clone of `bare` with the test identity and origin wired. */
function makeClone(bare: string, prefix: string): string {
  const dir = makeHarnessRepo(prefix);
  git(dir, 'remote', 'add', 'origin', bare);
  return dir;
}

function commitFile(dir: string, name: string, body: string, message: string): string {
  writeFileSync(join(dir, name), body);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', message);
  return git(dir, 'rev-parse', 'HEAD').trim();
}

describe('GitService sync verbs against a local bare remote', () => {
  const cleanups: string[] = [];
  afterAll(() => {
    for (const d of cleanups) rmSync(d, { recursive: true, force: true });
  });

  it('remotes() reports name, URL and which one the branch tracks', async () => {
    const bare = makeBare();
    const dir = makeClone(bare, 'gmux-sync-a-');
    cleanups.push(bare, dir);
    const svc = new GitService(dir);
    commitFile(dir, 'a.txt', 'one\n', 'first');

    let result = await svc.remotes();
    expect(result.remotes).toEqual([
      { name: 'origin', fetchUrl: bare, pushUrl: bare, tracked: false }
    ]);
    expect(result.branch).toBe('main');
    expect(result.upstream).toBeNull(); // nothing published yet

    await svc.push({ repoPath: dir, setUpstream: true });

    result = await svc.remotes();
    expect(result.upstream).toBe('origin/main');
    expect(result.remotes[0]?.tracked).toBe(true);
  });

  it('push without an upstream is a typed state, not a failure', async () => {
    const bare = makeBare();
    const dir = makeClone(bare, 'gmux-sync-b-');
    cleanups.push(bare, dir);
    const svc = new GitService(dir);
    commitFile(dir, 'a.txt', 'one\n', 'first');

    expect(await svc.push({ repoPath: dir })).toEqual({
      status: 'no-upstream',
      branch: 'main',
      remote: 'origin'
    });
    // Nothing was pushed behind the user's back.
    expect(git(bare, 'branch', '--list').trim()).toBe('');

    expect(await svc.push({ repoPath: dir, setUpstream: true })).toEqual({
      status: 'pushed',
      remote: 'origin',
      branch: 'main'
    });
    expect(git(bare, 'branch', '--list')).toContain('main');

    // Second push with nothing new: "up-to-date", still not an error.
    expect(await svc.push({ repoPath: dir })).toEqual({
      status: 'up-to-date',
      remote: 'origin',
      branch: 'main'
    });
  });

  it('pull reports up-to-date, pulled, and no-upstream distinctly', async () => {
    const bare = makeBare();
    const a = makeClone(bare, 'gmux-sync-c1-');
    cleanups.push(bare, a);
    const svcA = new GitService(a);
    commitFile(a, 'a.txt', 'one\n', 'first');

    expect(await svcA.pull()).toEqual({ status: 'no-upstream', branch: 'main' });

    await svcA.push({ repoPath: a, setUpstream: true });
    expect(await svcA.pull()).toEqual({
      status: 'up-to-date',
      upstream: 'origin/main'
    });

    // A second clone lands a commit on the remote…
    const b = mkdtempSync(join(tmpdir(), 'gmux-sync-c2-'));
    cleanups.push(b);
    git(tmpdir(), 'clone', '-q', bare, b);
    git(b, 'config', 'user.name', 'gmux test');
    git(b, 'config', 'user.email', 'test@gmux.local');
    commitFile(b, 'b.txt', 'from b\n', 'b work');
    git(b, 'push', '-q', 'origin', 'main');

    // …and A pulls it.
    expect(await svcA.pull()).toEqual({
      status: 'pulled',
      upstream: 'origin/main'
    });
    const status = await svcA.status();
    expect(status.behind).toBe(0);
  });

  it('a rejected push names the problem and the recovery', async () => {
    const bare = makeBare();
    const a = makeClone(bare, 'gmux-sync-d1-');
    cleanups.push(bare, a);
    const svcA = new GitService(a);
    commitFile(a, 'a.txt', 'one\n', 'first');
    await svcA.push({ repoPath: a, setUpstream: true });

    const b = mkdtempSync(join(tmpdir(), 'gmux-sync-d2-'));
    cleanups.push(b);
    git(tmpdir(), 'clone', '-q', bare, b);
    git(b, 'config', 'user.name', 'gmux test');
    git(b, 'config', 'user.email', 'test@gmux.local');
    commitFile(b, 'b.txt', 'from b\n', 'b work');
    git(b, 'push', '-q', 'origin', 'main');

    // A commits too, without pulling: its push must be rejected.
    commitFile(a, 'a2.txt', 'two\n', 'a work');
    await expect(svcA.push({ repoPath: a })).rejects.toThrow(/Push rejected/);
  });

  it('divergent branches explain themselves instead of failing blankly', async () => {
    const bare = makeBare();
    const a = makeClone(bare, 'gmux-sync-e1-');
    cleanups.push(bare, a);
    const svcA = new GitService(a);
    commitFile(a, 'a.txt', 'one\n', 'first');
    await svcA.push({ repoPath: a, setUpstream: true });

    const b = mkdtempSync(join(tmpdir(), 'gmux-sync-e2-'));
    cleanups.push(b);
    git(tmpdir(), 'clone', '-q', bare, b);
    git(b, 'config', 'user.name', 'gmux test');
    git(b, 'config', 'user.email', 'test@gmux.local');
    commitFile(b, 'b.txt', 'from b\n', 'b work');
    git(b, 'push', '-q', 'origin', 'main');
    commitFile(a, 'a2.txt', 'two\n', 'a work');

    // No pull.rebase configured (isolated config) → git refuses to choose.
    await expect(svcA.pull()).rejects.toThrow(/diverged|merge or rebase/i);

    // With the user's preference set, the same pull succeeds and sync()
    // then pushes the merge back in one gesture.
    git(a, 'config', 'pull.rebase', 'false');
    const result = await svcA.sync();
    expect(result.pull.status).toBe('pulled');
    expect(result.push?.status).toBe('pushed');
    expect((await svcA.status()).ahead).toBe(0);
  });

  it('sync on an already-synced repo is a clean no-op pair', async () => {
    const bare = makeBare();
    const dir = makeClone(bare, 'gmux-sync-f-');
    cleanups.push(bare, dir);
    const svc = new GitService(dir);
    commitFile(dir, 'a.txt', 'one\n', 'first');
    await svc.push({ repoPath: dir, setUpstream: true });

    const result = await svc.sync();
    expect(result.pull).toEqual({ status: 'up-to-date', upstream: 'origin/main' });
    expect(result.push).toEqual({
      status: 'up-to-date',
      remote: 'origin',
      branch: 'main'
    });
  });

  it('an unreachable remote fails with a real message, not silence', async () => {
    const dir = makeHarnessRepo('gmux-sync-g-');
    cleanups.push(dir);
    const svc = new GitService(dir);
    commitFile(dir, 'a.txt', 'one\n', 'first');
    git(dir, 'remote', 'add', 'origin', join(tmpdir(), 'gmux-does-not-exist.git'));

    // The bad-URL case must NOT read as "authenticate" — git prints its
    // credential catch-all here too, and sending the user to their SSH keys
    // over a typo'd path is exactly the wrong recovery.
    await expect(svc.fetch()).rejects.toThrow(/Couldn’t find a repository at/);
    await expect(
      svc.push({ repoPath: dir, setUpstream: true })
    ).rejects.toThrow(/Couldn’t find a repository at/);
  });

  it('remotes() is a friendly empty result with no remotes at all', async () => {
    const dir = makeHarnessRepo('gmux-sync-h-');
    cleanups.push(dir);
    const svc = new GitService(dir);
    commitFile(dir, 'a.txt', 'one\n', 'first');

    expect(await svc.remotes()).toEqual({
      remotes: [],
      branch: 'main',
      upstream: null
    });
    expect(await svc.push({ repoPath: dir })).toEqual({
      status: 'no-upstream',
      branch: 'main',
      remote: null
    });
    await expect(
      svc.push({ repoPath: dir, setUpstream: true })
    ).rejects.toThrow(/no remote to publish to/);
  });

  it('a detached HEAD refuses to push instead of guessing a branch', async () => {
    const bare = makeBare();
    const dir = makeClone(bare, 'gmux-sync-i-');
    cleanups.push(bare, dir);
    const svc = new GitService(dir);
    const first = commitFile(dir, 'a.txt', 'one\n', 'first');
    commitFile(dir, 'a.txt', 'two\n', 'second');
    git(dir, 'checkout', '-q', '--detach', first);

    expect(await svc.currentBranch()).toBeNull();
    await expect(svc.push({ repoPath: dir })).rejects.toThrow(/not on a branch/);
  });
});
