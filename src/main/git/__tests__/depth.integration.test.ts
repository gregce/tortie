/**
 * Integration tests: the git-depth GitService methods (branches / checkout /
 * createBranch / createTag / cherryPick / commitDetail / remoteUrl /
 * checkoutDetached) against the REAL system git in throwaway repos, isolated
 * from the developer's global/system git config exactly like
 * service.integration.test.ts.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { GitService } from '../service';

const ENV_ISOLATION = {
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null'
} as const;

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...ENV_ISOLATION }
  });
}

function makeRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'gmux-gitdepth-test-'));
  git(dir, 'init', '-b', 'main');
  git(dir, 'config', 'user.name', 'gmux test');
  git(dir, 'config', 'user.email', 'test@gmux.local');
  git(dir, 'config', 'commit.gpgsign', 'false');
  return dir;
}

let savedGlobal: string | undefined;
let savedSystem: string | undefined;

beforeAll(() => {
  savedGlobal = process.env['GIT_CONFIG_GLOBAL'];
  savedSystem = process.env['GIT_CONFIG_SYSTEM'];
  process.env['GIT_CONFIG_GLOBAL'] = '/dev/null';
  process.env['GIT_CONFIG_SYSTEM'] = '/dev/null';
});

afterAll(() => {
  if (savedGlobal === undefined) delete process.env['GIT_CONFIG_GLOBAL'];
  else process.env['GIT_CONFIG_GLOBAL'] = savedGlobal;
  if (savedSystem === undefined) delete process.env['GIT_CONFIG_SYSTEM'];
  else process.env['GIT_CONFIG_SYSTEM'] = savedSystem;
});

describe('GitService git-depth methods against real git', () => {
  const cleanups: string[] = [];
  afterAll(() => {
    for (const d of cleanups) rmSync(d, { recursive: true, force: true });
  });

  it('branches / checkout / createBranch / checkoutDetached round-trip', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'a.txt'), 'one\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-m', 'initial commit');
    const first = git(dir, 'rev-parse', 'HEAD').trim();
    writeFileSync(join(dir, 'a.txt'), 'one\ntwo\n');
    git(dir, 'commit', '-am', 'second commit');

    // createBranch from a start ref switches to it (VS Code semantics).
    await svc.createBranch('feature/x', first);
    let branches = await svc.branches();
    expect(branches.map((b) => b.name).sort()).toEqual(['feature/x', 'main']);
    expect(branches.find((b) => b.name === 'feature/x')!.current).toBe(true);
    expect(branches.find((b) => b.name === 'feature/x')!.sha).toBe(first);
    expect(branches.find((b) => b.name === 'main')!.subject).toBe('second commit');

    await svc.checkout('main');
    branches = await svc.branches();
    expect(branches.find((b) => b.name === 'main')!.current).toBe(true);

    // Detached checkout: no branch is current; status shows detachedAt.
    await svc.checkoutDetached(first);
    branches = await svc.branches();
    expect(branches.every((b) => !b.current)).toBe(true);
    const status = await svc.status();
    expect(status.branch).toBeUndefined();
    expect(status.detachedAt).toBe(first.slice(0, 7));

    await svc.checkout('main'); // leave the repo on a branch

    // Bad inputs are rejected before any git spawn.
    await expect(svc.checkout('--force')).rejects.toThrow(/INVALID_INPUT/);
    await expect(svc.checkoutDetached('not-a-sha')).rejects.toThrow(/INVALID_INPUT/);
  });

  it('creates tags and reports them via git', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'a.txt'), 'x\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-m', 'c1');
    const sha = git(dir, 'rev-parse', 'HEAD').trim();

    await svc.createTag('v1.0.0', sha);
    expect(git(dir, 'tag', '--points-at', sha)).toContain('v1.0.0');

    // Duplicate tag → friendly GIT_FAILED, not a raw stack.
    await expect(svc.createTag('v1.0.0', sha)).rejects.toThrow(/GIT_FAILED/);
  });

  it('cherry-picks cleanly and resolves the new HEAD sha', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'base.txt'), 'base\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-m', 'base');
    git(dir, 'checkout', '-b', 'side');
    writeFileSync(join(dir, 'side.txt'), 'side\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-m', 'side work');
    const sideSha = git(dir, 'rev-parse', 'HEAD').trim();
    git(dir, 'checkout', 'main');
    // Diverge main so the pick lands on a different parent (otherwise git
    // can reproduce a byte-identical commit → identical sha).
    writeFileSync(join(dir, 'main.txt'), 'main\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-m', 'main diverges');

    const result = await svc.cherryPick(sideSha);
    expect(result.status).toBe('applied');
    if (result.status === 'applied') {
      expect(result.sha).toBe(git(dir, 'rev-parse', 'HEAD').trim());
      expect(result.sha).not.toBe(sideSha);
    }
    expect(existsSync(join(dir, 'side.txt'))).toBe(true);
  });

  it('reports cherry-pick conflicts as a typed state and aborts cleanly', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'f.txt'), 'base\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-m', 'base');
    git(dir, 'checkout', '-b', 'side');
    writeFileSync(join(dir, 'f.txt'), 'side version\n');
    git(dir, 'commit', '-am', 'side edit');
    const sideSha = git(dir, 'rev-parse', 'HEAD').trim();
    git(dir, 'checkout', 'main');
    writeFileSync(join(dir, 'f.txt'), 'main version\n');
    git(dir, 'commit', '-am', 'main edit');
    const mainSha = git(dir, 'rev-parse', 'HEAD').trim();

    const result = await svc.cherryPick(sideSha);
    expect(result.status).toBe('conflict');
    if (result.status === 'conflict') expect(result.aborted).toBe(true);

    // The repo was left EXACTLY as before: same HEAD, clean tree, no
    // sequencer state.
    expect(git(dir, 'rev-parse', 'HEAD').trim()).toBe(mainSha);
    expect(git(dir, 'status', '--porcelain').trim()).toBe('');
    expect(existsSync(join(dir, '.git', 'CHERRY_PICK_HEAD'))).toBe(false);
  });

  it('commitDetail returns author, ISO date, formatted body, files, and counts', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'a.txt'), 'one\ntwo\n');
    mkdirSync(join(dir, 'dir with space'));
    writeFileSync(join(dir, 'dir with space', 'b file.txt'), 'x\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-m', 'initial commit');

    writeFileSync(join(dir, 'a.txt'), 'one\ntwo\nthree\n');
    writeFileSync(join(dir, 'bin.dat'), Buffer.from([0, 1, 2]));
    git(dir, 'add', '-A');
    git(
      dir,
      'commit',
      '-m',
      'subject line\n\nParagraph one.\n\n- bullet a\n- bullet b\n\nUses `inline code` here.'
    );
    const sha = git(dir, 'rev-parse', 'HEAD').trim();

    const detail = await svc.commitDetail(sha);
    expect(detail.sha).toBe(sha);
    expect(detail.shortSha).toBe(git(dir, 'rev-parse', '--short', sha).trim());
    expect(detail.author).toBe('gmux test');
    expect(detail.email).toBe('test@gmux.local');
    expect(new Date(detail.dateISO).getTime()).not.toBeNaN();
    expect(detail.subject).toBe('subject line');
    expect(detail.body).toBe(
      'Paragraph one.\n\n- bullet a\n- bullet b\n\nUses `inline code` here.'
    );
    expect(detail.files).toEqual([
      { path: 'a.txt', status: 'M', insertions: 1, deletions: 0 },
      { path: 'bin.dat', status: 'A', insertions: 0, deletions: 0, binary: true }
    ]);
    expect(detail.insertions).toBe(1);
    expect(detail.deletions).toBe(0);

    // Renames carry origPath.
    git(dir, 'mv', join('dir with space', 'b file.txt'), join('dir with space', 'renamed.txt'));
    git(dir, 'commit', '-m', 'rename commit');
    const renSha = git(dir, 'rev-parse', 'HEAD').trim();
    const renDetail = await svc.commitDetail(renSha);
    expect(renDetail.files).toEqual([
      {
        path: 'dir with space/renamed.txt',
        origPath: 'dir with space/b file.txt',
        status: 'R',
        insertions: 0,
        deletions: 0
      }
    ]);

    // Unknown sha → friendly GIT_FAILED; junk sha → INVALID_INPUT.
    await expect(svc.commitDetail('deadbeef')).rejects.toThrow(/GIT_FAILED/);
    await expect(svc.commitDetail('$(rm -rf /)')).rejects.toThrow(/INVALID_INPUT/);
  });

  it('commitDetail shows merge commits against the first parent', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    writeFileSync(join(dir, 'base.txt'), 'base\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-m', 'base');
    git(dir, 'checkout', '-b', 'side');
    writeFileSync(join(dir, 'side.txt'), 'side\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-m', 'side work');
    git(dir, 'checkout', 'main');
    writeFileSync(join(dir, 'main.txt'), 'main\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-m', 'main work');
    git(dir, 'merge', '--no-ff', '-m', 'merge side', 'side');
    const mergeSha = git(dir, 'rev-parse', 'HEAD').trim();

    const detail = await svc.commitDetail(mergeSha);
    // vs first parent (main): only the side branch's file arrives.
    expect(detail.files.map((f) => f.path)).toEqual(['side.txt']);
    expect(detail.insertions).toBe(1);
  });

  it('remoteUrl normalizes GitHub origins and hides everything else', async () => {
    const dir = makeRepo();
    cleanups.push(dir);
    const svc = new GitService(dir);

    expect(await svc.remoteUrl()).toBeNull(); // no origin

    git(dir, 'remote', 'add', 'origin', 'git@github.com:specstory/gmux.git');
    expect(await svc.remoteUrl()).toBe('https://github.com/specstory/gmux');

    git(dir, 'remote', 'set-url', 'origin', 'https://gitlab.com/x/y.git');
    expect(await svc.remoteUrl()).toBeNull();
  });

  it('branches resolves [] for non-repos and unborn HEADs', async () => {
    const plain = mkdtempSync(join(tmpdir(), 'gmux-depth-notrepo-'));
    cleanups.push(plain);
    expect(await new GitService(plain).branches()).toEqual([]);

    const unborn = makeRepo();
    cleanups.push(unborn);
    expect(await new GitService(unborn).branches()).toEqual([]);
  });
});
