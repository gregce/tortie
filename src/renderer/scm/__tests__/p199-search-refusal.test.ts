/**
 * Phase 199, fix round. Two defects a person can reach from the History
 * section's search field, each proved on the store itself over a bridge
 * this file owns, so the walk that would draw is counted rather than
 * believed.
 *
 * 1. A refused walk under a query must draw NOTHING but the refusal. At
 *    the parent commit `file:../x` was refused by the service and the store
 *    then fell through to the flat `git:log` walk, which drew the plain
 *    walk's first page as if it matched, gutter hidden, no sentence.
 * 2. A change search on screen must not run again on a repository change.
 *    At the parent commit every `git:changed` reread carried the applied
 *    query with its `change` term, so a file an agent wrote started another
 *    `-S` walk that nobody pressed for.
 *
 * `environment` is node and there is no document, so the window is stubbed
 * the way ./p107-remote-history.test.tsx stubs it, and the bridge is the
 * one thing under test that is real: the calls it receives ARE the proof.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitGraphLogEntry, GitGraphLogInput, GitLogEntry } from '@shared/types';

const REPO = '/scratch/p199/repo';
const REFUSAL = 'Paths must be relative to the repository root.';
const STOPPED = 'A git command took too long and was stopped.';

const graphLog = vi.fn();
const log = vi.fn();
const branches = vi.fn(async () => []);
let fireChanged: ((repoPath: string) => void) | null = null;

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  requestAnimationFrame: () => 0,
  matchMedia: () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {}
  }),
  gmux: {
    sessions: {
      restore: () => Promise.resolve({}),
      discard: () => Promise.resolve()
    },
    setSessionsPosition: () => Promise.resolve(),
    git: {
      graphLog,
      log,
      branches,
      status: () => Promise.resolve(null),
      onChanged: (cb: (repoPath: string) => void) => {
        fireChanged = cb;
        return () => undefined;
      }
    }
  }
});
vi.stubGlobal('requestAnimationFrame', () => 0);
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

const { depthRepoState, useGitDepth } = await import('../depth');
const { parseHistoryQuery } = await import('../history-search');
const { REPO_CHANGED_DEBOUNCE_MS } = await import('../../state/repo-changed');

/** A main process rejection, as the preload hands it to the renderer. */
function refusal(code: string, message: string, detail: string): Error {
  return new Error(`Error invoking remote method: ${JSON.stringify({ code, message, detail })}`);
}

function sha(i: number): string {
  return `${String(i).padStart(8, '0')}b9a4c3d2e1f0a9b8c7d6e5f4a3b2c1d0`;
}

function entry(i: number): GitGraphLogEntry {
  return {
    hash: sha(i),
    shortHash: sha(i).slice(0, 7),
    parents: i === 49 ? [] : [sha(i + 1)],
    author: 'probe',
    email: 'probe@example.invalid',
    date: 1_700_000_000 - i,
    subject: `commit ${String(i)}`,
    refs: []
  } as unknown as GitGraphLogEntry;
}

function flat(i: number): GitLogEntry {
  return {
    hash: sha(i),
    authorName: 'probe',
    authorDate: '2026-09-02T00:00:00.000Z',
    subject: `commit ${String(i)}`
  } as unknown as GitLogEntry;
}

const page = (n: number) => ({
  entries: Array.from({ length: n }, (_, i) => entry(i)),
  hasMore: n >= 50,
  refs: ['refs/heads/main'],
  divergence: {
    branch: 'main',
    upstream: null,
    upstreamRef: null,
    upstreamGone: false,
    ahead: 0,
    behind: 0,
    headSha: sha(0),
    upstreamSha: null,
    mergeBase: null,
    lastFetchedAt: null,
    truncated: false
  }
});

const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 0));
};

const repo = () => depthRepoState(useGitDepth.getState().repos, REPO);
const searches = () =>
  graphLog.mock.calls.map((c) => (c[0] as GitGraphLogInput).search ?? null);

beforeEach(async () => {
  graphLog.mockReset();
  log.mockReset();
  branches.mockClear();
  graphLog.mockImplementation(async (input: GitGraphLogInput) => {
    const s = input.search;
    if (s?.path !== undefined && (s.path.startsWith('/') || s.path.includes('..'))) {
      throw refusal('INVALID_INPUT', REFUSAL, s.path);
    }
    if (s?.change === 'slow') throw refusal('GIT_FAILED', STOPPED, 'git log exceeded 180000ms');
    if (s?.change !== undefined) return page(23);
    if (s !== undefined) return page(7);
    return page(50);
  });
  log.mockImplementation(async () => Array.from({ length: 51 }, (_, i) => flat(i)));
  useGitDepth.setState({ repos: {} });
  useGitDepth.getState().ensure(REPO, 'branch');
  await flush();
  expect(repo().log?.length).toBe(50);
});

describe('a refused walk under a query', () => {
  it('draws nothing and the sentence, never the flat walk (file outside the repo)', async () => {
    await useGitDepth.getState().setQuery(REPO, parseHistoryQuery('file:../gmux-copy/src'));
    await flush();
    const r = repo();
    expect(log).not.toHaveBeenCalled();
    expect(r.query?.file).toBe('../gmux-copy/src');
    expect(r.log).toEqual([]);
    expect(r.hasMore).toBe(false);
    expect(r.logLoading).toBe(false);
    expect(r.searchError).toBe(REFUSAL);
  });

  it('draws nothing and the sentence for an absolute path', async () => {
    await useGitDepth.getState().setQuery(REPO, parseHistoryQuery('file:/etc/passwd'));
    await flush();
    expect(log).not.toHaveBeenCalled();
    expect(repo().log).toEqual([]);
    expect(repo().searchError).toBe(REFUSAL);
  });

  it('draws nothing and the sentence when a change search is stopped by its timeout', async () => {
    await useGitDepth.getState().setQuery(REPO, parseHistoryQuery('change:slow'));
    await flush();
    expect(log).not.toHaveBeenCalled();
    expect(repo().log).toEqual([]);
    expect(repo().searchError).toBe(STOPPED);
    expect(repo().walkMs).toBeNull();
  });

  it('clears the sentence when the next walk answers', async () => {
    await useGitDepth.getState().setQuery(REPO, parseHistoryQuery('file:../x'));
    await flush();
    expect(repo().searchError).toBe(REFUSAL);
    await useGitDepth.getState().setQuery(REPO, parseHistoryQuery('file:src'));
    await flush();
    expect(repo().searchError).toBeNull();
    expect(repo().log?.length).toBe(7);
    await useGitDepth.getState().setQuery(REPO, null);
    await flush();
    expect(repo().searchError).toBeNull();
    expect(repo().log?.length).toBe(50);
  });

  it('still falls through to the flat walk for the PLAIN walk, which has no query', async () => {
    graphLog.mockImplementation(async () => {
      throw refusal('GIT_FAILED', 'Could not read git history.', 'fatal: something');
    });
    await useGitDepth.getState().refresh(REPO);
    await flush();
    expect(log).toHaveBeenCalledTimes(1);
    expect(repo().log?.length).toBe(50);
    expect(repo().searchError).toBeNull();
  });
});

describe('a change search on screen', () => {
  it('does not run again on a repository change', async () => {
    await useGitDepth.getState().setQuery(REPO, parseHistoryQuery('change:runGit'));
    await flush();
    expect(repo().log?.length).toBe(23);
    const ms = repo().walkMs;
    expect(searches().filter((s) => s?.change === 'runGit')).toHaveLength(1);
    const walksBefore = graphLog.mock.calls.length;
    const branchesBefore = branches.mock.calls.length;

    expect(fireChanged).not.toBeNull();
    fireChanged?.(REPO);
    await new Promise((r) => setTimeout(r, REPO_CHANGED_DEBOUNCE_MS + 50));
    await flush();

    expect(searches().filter((s) => s?.change === 'runGit')).toHaveLength(1);
    expect(graphLog.mock.calls.length).toBe(walksBefore);
    // The rest of the refresh still happens: the branches were re-read.
    expect(branches.mock.calls.length).toBeGreaterThan(branchesBefore);
    // The rows and the printed time the button drew are still on screen.
    expect(repo().log?.length).toBe(23);
    expect(repo().walkMs).toBe(ms);
    expect(repo().query?.change).toBe('runGit');
  });

  it('is unlike a keystroke query, which the reread keeps and re-walks', async () => {
    await useGitDepth.getState().setQuery(REPO, parseHistoryQuery('redline'));
    await flush();
    expect(searches().filter((s) => s?.message === 'redline')).toHaveLength(1);
    fireChanged?.(REPO);
    await new Promise((r) => setTimeout(r, REPO_CHANGED_DEBOUNCE_MS + 50));
    await flush();
    expect(searches().filter((s) => s?.message === 'redline')).toHaveLength(2);
    expect(repo().log?.length).toBe(7);
  });

  it('runs again when the button is pressed again, and when a page is loaded', async () => {
    const q = parseHistoryQuery('change:runGit');
    await useGitDepth.getState().setQuery(REPO, q);
    await flush();
    await useGitDepth.getState().setQuery(REPO, q);
    await flush();
    expect(searches().filter((s) => s?.change === 'runGit')).toHaveLength(2);
    await useGitDepth.getState().loadMore(REPO);
    await flush();
    expect(searches().filter((s) => s?.change === 'runGit')).toHaveLength(3);
    expect((graphLog.mock.calls.at(-1)?.[0] as GitGraphLogInput).maxCount).toBe(100);
  });
});
