/**
 * Integration tests: the Phase-14.5 history-graph read (GitService.graphLog /
 * divergence) against the REAL system git, in throwaway repos, with the same
 * global/system config isolation as the sibling suites.
 *
 * The fixture is the one research 24 §4.4 specifies and measured against
 * `git log --graph --all`: local `main` **7 ahead / 2 behind** `origin/main`,
 * a two-parent merge, a **three-parent octopus merge**, a tag, and three side
 * branches. Keeping it here means the awkward cases the phase was warned about
 * — octopus merges, parents outside the loaded window, a detached HEAD, an
 * upstream that has been deleted — are executable rather than argued.
 *
 * The assertion that earns its keep is the LAST one in the first block: every
 * parent must appear after all of its children. That is not a nicety — the
 * swimlane fold is a left fold whose state is the previous row's output, so a
 * parent arriving early would silently produce wrong lanes rather than an
 * error. It is the reason `--topo-order` is in the command at all.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { GitService } from '../service';
import { git, isolateGitConfig, makeRepo as makeHarnessRepo } from './harness';

const makeRepo = (): string => makeHarnessRepo('gmux-gitgraph-test-');

isolateGitConfig();

/** Commit `file` with `subject` and return the new full SHA. */
function commit(dir: string, file: string, subject: string): string {
  writeFileSync(join(dir, file), `${subject}\n`);
  git(dir, 'add', '-A');
  git(dir, 'commit', '-m', subject);
  return git(dir, 'rev-parse', 'HEAD').trim();
}

interface Fixture {
  origin: string;
  clone: string;
  svc: GitService;
  /** Shared ancestor: the merge base of main and origin/main. */
  base2: string;
  /** The two commits only origin has. */
  remote1: string;
  remote2: string;
  /** The three-parent octopus merge; also `main`'s tip and tag v1.0. */
  octopus: string;
  /** The two-parent merge of featA. */
  mergeA: string;
}

describe('GitService history graph against real git', () => {
  const cleanups: string[] = [];
  afterAll(() => {
    for (const d of cleanups) rmSync(d, { recursive: true, force: true });
  });

  /**
   * research 24 §4.4's repo: 7 ahead / 2 behind, one 2-parent merge, one
   * 3-parent octopus merge, a tag, three side branches.
   */
  function makeDivergedRepo(): Fixture {
    const origin = makeRepo();
    cleanups.push(origin);
    commit(origin, 'a.txt', 'base1');
    const base2 = commit(origin, 'b.txt', 'base2');

    const parent = mkdtempSync(join(tmpdir(), 'gmux-gitgraph-clone-'));
    cleanups.push(parent);
    git(parent, 'clone', origin, 'clone');
    const clone = join(parent, 'clone');
    git(clone, 'config', 'user.name', 'gmux test');
    git(clone, 'config', 'user.email', 'test@gmux.local');
    git(clone, 'config', 'commit.gpgsign', 'false');

    // Two commits only the remote has → behind 2.
    const remote1 = commit(origin, 'r1.txt', 'remote1');
    const remote2 = commit(origin, 'r2.txt', 'remote2');

    // Local work → ahead 7 (local1 + a1 + a2 + mergeA + b1 + c1 + octopus).
    commit(clone, 'l1.txt', 'local1');
    git(clone, 'checkout', '-b', 'featA');
    commit(clone, 'a1.txt', 'a1');
    commit(clone, 'a2.txt', 'a2');
    git(clone, 'checkout', 'main');
    git(clone, 'merge', '--no-ff', '-m', 'Merge featA', 'featA');
    const mergeA = git(clone, 'rev-parse', 'HEAD').trim();

    git(clone, 'checkout', '-b', 'featB');
    commit(clone, 'b1.txt', 'b1');
    git(clone, 'checkout', 'main');
    git(clone, 'checkout', '-b', 'featC');
    commit(clone, 'c1.txt', 'c1');
    git(clone, 'checkout', 'main');
    git(clone, 'merge', '--no-ff', '-m', 'Octopus merge featB+featC', 'featB', 'featC');
    const octopus = git(clone, 'rev-parse', 'HEAD').trim();
    git(clone, 'tag', 'v1.0');

    // Bring the remote refs (and FETCH_HEAD) into the clone.
    git(clone, 'fetch', 'origin');

    return {
      origin,
      clone,
      svc: new GitService(clone),
      base2,
      remote1,
      remote2,
      octopus,
      mergeA
    };
  }

  // -------------------------------------------------------------------------

  describe('the diverged fixture', () => {
    it('reports ahead/behind, the merge base, and the last-fetch age', async () => {
      const f = makeDivergedRepo();
      const d = await f.svc.divergence();

      expect(d.branch).toBe('main');
      expect(d.upstream).toBe('origin/main');
      expect(d.upstreamRef).toBe('refs/remotes/origin/main');
      expect(d.upstreamGone).toBe(false);
      expect(d.ahead).toBe(7);
      expect(d.behind).toBe(2);
      expect(d.headSha).toBe(f.octopus);
      expect(d.upstreamSha).toBe(f.remote2);
      expect(d.mergeBase).toBe(f.base2);
      expect(d.truncated).toBe(false);
      // The honesty requirement: a freshness timestamp always travels with the
      // numbers, so the UI can never render "up to date" without one.
      expect(d.lastFetchedAt).toBeGreaterThan(0);
    });

    it('walks the upstream too, so commits you are BEHIND by are in the payload', async () => {
      const f = makeDivergedRepo();
      const page = await f.svc.graphLog({ maxCount: 100 });
      const shas = page.entries.map((e) => e.hash);

      // The thing a HEAD-only walk could never do (research 24 §6.2).
      expect(shas).toContain(f.remote1);
      expect(shas).toContain(f.remote2);

      const unpushed = page.entries.filter((e) => e.unpushed === true);
      const unpulled = page.entries.filter((e) => e.unpulled === true);
      expect(unpushed).toHaveLength(7);
      expect(unpulled).toHaveLength(2);
      expect(unpulled.map((e) => e.hash).sort()).toEqual(
        [f.remote1, f.remote2].sort()
      );
      // The counts and the shading come from ONE symmetric difference, so they
      // cannot disagree.
      expect(unpushed).toHaveLength(page.divergence.ahead);
      expect(unpulled).toHaveLength(page.divergence.behind);
      // A commit is never both, and shared history is neither.
      expect(page.entries.filter((e) => e.unpushed && e.unpulled)).toHaveLength(0);
      const base = page.entries.find((e) => e.hash === f.base2)!;
      expect(base.unpushed).toBeUndefined();
      expect(base.unpulled).toBeUndefined();
    });

    it('handles an octopus merge with no special case', async () => {
      const f = makeDivergedRepo();
      const page = await f.svc.graphLog({ maxCount: 100 });
      const octopus = page.entries.find((e) => e.hash === f.octopus)!;
      expect(octopus.parents).toHaveLength(3);
      const mergeA = page.entries.find((e) => e.hash === f.mergeA)!;
      expect(mergeA.parents).toHaveLength(2);
      // Every parent SHA is a full 40-char oid the fold can key lanes on.
      for (const e of page.entries) {
        for (const p of e.parents) expect(p).toMatch(/^[0-9a-f]{40}$/);
      }
    });

    it('pins refs and tags to their own commits, typed', async () => {
      const f = makeDivergedRepo();
      const page = await f.svc.graphLog({ maxCount: 100, scope: 'everything' });
      const byRef = new Map(
        page.entries.flatMap((e) => e.refs.map((r) => [`${r.kind}:${r.name}`, e.hash]))
      );

      // The reference screenshot's whole point: `main` and `origin/main` are
      // pinned to DIFFERENT commits.
      expect(byRef.get('localBranch:main')).toBe(f.octopus);
      expect(byRef.get('remoteBranch:origin/main')).toBe(f.remote2);
      expect(byRef.get('localBranch:main')).not.toBe(byRef.get('remoteBranch:origin/main'));
      // Tags arrive for free with the walk (the long-standing gap).
      expect(byRef.get('tag:v1.0')).toBe(f.octopus);

      const head = page.entries.find((e) => e.hash === f.octopus)!;
      expect(head.refs.find((r) => r.name === 'main')?.current).toBe(true);
      expect(head.refs[0]!.name).toBe('main'); // current branch hoisted first
      const remote = page.entries
        .find((e) => e.hash === f.remote2)!
        .refs.find((r) => r.kind === 'remoteBranch')!;
      expect(remote.remote).toBe('origin');
      // The symbolic origin/HEAD a clone always has must never render.
      expect(git(f.clone, 'branch', '-r')).toContain('origin/HEAD');
      expect([...byRef.keys()]).not.toContain('remoteBranch:origin/HEAD');
    });

    it('returns commits in topological order — no parent before its children', async () => {
      const f = makeDivergedRepo();
      const page = await f.svc.graphLog({ maxCount: 100, scope: 'everything' });
      const position = new Map(page.entries.map((e, i) => [e.hash, i]));
      for (const [i, e] of page.entries.entries()) {
        for (const p of e.parents) {
          const at = position.get(p);
          if (at === undefined) continue; // parent outside the window: fine
          expect(at).toBeGreaterThan(i);
        }
      }
    });
  });

  // -------------------------------------------------------------------------

  describe('scopes', () => {
    it('branch scope is the current branch and its upstream — and nothing else', async () => {
      const f = makeDivergedRepo();
      const page = await f.svc.graphLog({ maxCount: 100, scope: 'branch' });
      expect(page.scope).toBe('branch');
      expect(page.refs).toEqual([
        'refs/heads/main',
        'refs/remotes/origin/main'
      ]);
      // featA/featB/featC are merged into main, so their commits are still
      // reachable — the scope narrows the TIPS, not the reachable history.
      expect(page.entries.length).toBe(11);
    });

    it('local scope adds every local branch, keeping the upstream', async () => {
      const f = makeDivergedRepo();
      // An unmerged branch, reachable from no other tip.
      git(f.clone, 'checkout', '-b', 'orphaned');
      const only = commit(f.clone, 'z.txt', 'only-on-orphaned');
      git(f.clone, 'checkout', 'main');

      const branchScope = await f.svc.graphLog({ maxCount: 100, scope: 'branch' });
      expect(branchScope.entries.map((e) => e.hash)).not.toContain(only);

      const page = await f.svc.graphLog({ maxCount: 100, scope: 'local' });
      expect(page.refs).toContain('refs/heads/featA');
      expect(page.refs).toContain('refs/heads/orphaned');
      expect(page.refs).toContain('refs/remotes/origin/main');
      expect(page.entries.map((e) => e.hash)).toContain(only);
    });

    it('everything scope adds remote refs and tags but never refs/stash or refs/notes', async () => {
      const f = makeDivergedRepo();
      // Both exist in real repos and both would inject a parallel line of
      // history under `git log --all`.
      writeFileSync(join(f.clone, 'dirty.txt'), 'wip\n');
      git(f.clone, 'add', '-A');
      git(f.clone, 'stash');
      git(f.clone, 'notes', 'add', '-m', 'a note', 'HEAD');

      const page = await f.svc.graphLog({ maxCount: 100, scope: 'everything' });
      expect(page.refs).toContain('refs/tags/v1.0');
      expect(page.refs).toContain('refs/remotes/origin/main');
      expect(page.refs.some((r) => r.startsWith('refs/stash'))).toBe(false);
      expect(page.refs.some((r) => r.startsWith('refs/notes/'))).toBe(false);
    });

    it('survives a tag that points at a blob (fatal to a naive walk)', async () => {
      const f = makeDivergedRepo();
      const blob = git(f.clone, 'hash-object', '-w', join(f.clone, 'a.txt')).trim();
      git(f.clone, 'tag', 'a-blob-tag', blob);

      const page = await f.svc.graphLog({ maxCount: 100, scope: 'everything' });
      expect(page.refs).not.toContain('refs/tags/a-blob-tag');
      expect(page.entries.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------

  describe('paging', () => {
    it('reports hasMore from a limit+1 probe and never shows the probe', async () => {
      const f = makeDivergedRepo();
      const shallow = await f.svc.graphLog({ maxCount: 3 });
      expect(shallow.entries).toHaveLength(3);
      expect(shallow.hasMore).toBe(true);

      const full = await f.svc.graphLog({ maxCount: 100 });
      expect(full.hasMore).toBe(false);
      expect(full.entries).toHaveLength(11);

      // Exactly at the boundary: 11 commits requested, none beyond.
      const exact = await f.svc.graphLog({ maxCount: 11 });
      expect(exact.entries).toHaveLength(11);
      expect(exact.hasMore).toBe(false);
    });

    it('deepening a page appends — the earlier rows keep their identity and order', async () => {
      const f = makeDivergedRepo();
      const first = await f.svc.graphLog({ maxCount: 4 });
      const deeper = await f.svc.graphLog({ maxCount: 9, refs: first.refs });

      // The lane fold is a left fold over commits 0..n, so row n's lanes are
      // stable across paging IF AND ONLY IF the prefix is stable. Assert the
      // data-layer half of that promise.
      expect(deeper.entries.slice(0, 4).map((e) => e.hash)).toEqual(
        first.entries.map((e) => e.hash)
      );
    });

    it('a pinned ref set is used verbatim, and survives a ref deleted underneath it', async () => {
      const f = makeDivergedRepo();
      const local = await f.svc.graphLog({ maxCount: 100, scope: 'local' });
      expect(local.refs).toContain('refs/heads/featA');

      // An agent deletes a branch mid-scroll. The pinned list is now stale.
      git(f.clone, 'branch', '-D', 'featA');
      const next = await f.svc.graphLog({ maxCount: 100, refs: local.refs });
      expect(next.refs).toEqual(local.refs); // pinned verbatim, as asked
      expect(next.entries.length).toBe(local.entries.length); // --ignore-missing
    });

    it('a new commit at HEAD shifts rows down without rewriting them', async () => {
      const f = makeDivergedRepo();
      const before = await f.svc.graphLog({ maxCount: 100 });
      const fresh = commit(f.clone, 'new.txt', 'brand new');
      const after = await f.svc.graphLog({ maxCount: 100, refs: before.refs });

      expect(after.entries[0]!.hash).toBe(fresh);
      expect(after.entries.slice(1).map((e) => e.hash)).toEqual(
        before.entries.map((e) => e.hash)
      );
      expect(after.divergence.ahead).toBe(8);
    });
  });

  // -------------------------------------------------------------------------

  describe('awkward repositories', () => {
    it('a detached HEAD keeps a history and types the bare HEAD decoration', async () => {
      const f = makeDivergedRepo();
      git(f.clone, 'checkout', '--detach', f.mergeA);

      const page = await f.svc.graphLog({ maxCount: 100 });
      expect(page.refs).toContain('HEAD');
      expect(page.entries.length).toBeGreaterThan(0);
      expect(page.entries[0]!.hash).toBe(f.mergeA);
      expect(page.entries[0]!.refs.some((r) => r.kind === 'head')).toBe(true);
      expect(page.divergence.branch).toBeNull();
      expect(page.divergence.upstream).toBeNull();
      expect(page.divergence.ahead).toBe(0);
      expect(page.isRepo).toBe(true);
    });

    it('an upstream that no longer exists is a typed state, not a crash', async () => {
      const f = makeDivergedRepo();
      git(f.clone, 'update-ref', '-d', 'refs/remotes/origin/main');

      const d = await f.svc.divergence();
      expect(d.upstream).toBe('origin/main');
      expect(d.upstreamGone).toBe(true);
      expect(d.upstreamSha).toBeNull();
      expect(d.mergeBase).toBeNull();

      const page = await f.svc.graphLog({ maxCount: 100 });
      expect(page.entries.length).toBeGreaterThan(0);
      expect(page.entries.every((e) => e.unpulled === undefined)).toBe(true);
    });

    it('a branch with no upstream at all reports zeroes and still draws', async () => {
      const dir = makeRepo();
      cleanups.push(dir);
      const head = commit(dir, 'a.txt', 'only commit');
      const svc = new GitService(dir);

      const page = await svc.graphLog();
      expect(page.isRepo).toBe(true);
      expect(page.entries.map((e) => e.hash)).toEqual([head]);
      expect(page.refs).toEqual(['refs/heads/main']);
      expect(page.divergence.branch).toBe('main');
      expect(page.divergence.upstream).toBeNull();
      expect(page.divergence.upstreamRef).toBeNull();
      expect(page.divergence.lastFetchedAt).toBeNull();
      expect(page.divergence.headSha).toBe(head);
    });

    it('a repo with no commits yet is empty history, not an error', async () => {
      const dir = makeRepo();
      cleanups.push(dir);
      const svc = new GitService(dir);

      const page = await svc.graphLog();
      expect(page.entries).toEqual([]);
      expect(page.hasMore).toBe(false);
      expect(page.refs).toEqual([]);
      expect(page.isRepo).toBe(true);
      expect(page.divergence.branch).toBe('main');
      expect(page.divergence.headSha).toBeNull();
    });

    it('a folder that is not a repo resolves empty rather than rejecting', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'gmux-gitgraph-notrepo-'));
      cleanups.push(dir);
      const svc = new GitService(dir);

      const page = await svc.graphLog();
      expect(page.isRepo).toBe(false);
      expect(page.entries).toEqual([]);
      expect(page.refs).toEqual([]);
      expect(page.divergence.branch).toBeNull();
      // The frozen git:log contract keeps its friendly empty answer too.
      expect(await svc.log()).toEqual([]);
    });

    it('a repo with two roots keeps both — the fold must not assume one', async () => {
      const dir = makeRepo();
      cleanups.push(dir);
      const rootA = commit(dir, 'a.txt', 'root A');
      git(dir, 'checkout', '--orphan', 'second');
      git(dir, 'rm', '-rf', '--cached', '.');
      const rootB = commit(dir, 'b.txt', 'root B');
      git(dir, 'checkout', 'main');

      const page = await new GitService(dir).graphLog({ scope: 'local' });
      const roots = page.entries.filter((e) => e.parents.length === 0);
      expect(roots.map((e) => e.hash).sort()).toEqual([rootA, rootB].sort());
    });
  });

  // -------------------------------------------------------------------------

  it('git:log keeps working, now ref-scoped and decorated', async () => {
    const f = makeDivergedRepo();
    const entries = await f.svc.log(5);
    expect(entries).toHaveLength(5);
    expect(entries[0]!.hash).toBe(f.octopus);
    expect(entries[0]!.shortSha.length).toBeGreaterThanOrEqual(7);
    expect(entries[0]!.author).toBe('gmux test');
    expect(Date.parse(entries[0]!.dateISO)).toBe(entries[0]!.authorDate);
    expect(entries[0]!.refs.map((r) => r.name)).toContain('main');
  });
});
