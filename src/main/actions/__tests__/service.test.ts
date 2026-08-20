/**
 * The read lane's two query refresh (Phase 120).
 *
 * The service's doors are replaced the way remote-runs.test.ts replaces its
 * own: the gh process is a function this file passes in through a mocked
 * `./spawn`, and the four git reads come from a mocked `./repo`. What these
 * tests hold is the SHAPE of a refresh: which argvs are composed, in which
 * order, which failures skip the second query, and how the two answers fold
 * into one list.
 *
 * WHAT THIS FILE CANNOT SHOW. It cannot show that a real gh returns a tag
 * run for a real repository. `npm run probe:p120` measures that against
 * gregce/deadreckon and prints the run id.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionsHealth } from '@shared/actions';
import {
  buildAuthStatusArgv,
  buildRunListForBranchArgv,
  buildRunListForCommitArgv
} from '../argv';
import { WATCH_LIMITS } from '../watch';

// ---------------------------------------------------------------------------
// The world this module lives in, replaced
// ---------------------------------------------------------------------------

/** Every gh invocation the service asked for, in order. */
let ghCalls: Array<{ argv: string[]; cwd: string }> = [];

type Outcome = { ok: true; stdout: string } | { ok: false; health: ActionsHealth };

/** What each verb answers. Tests overwrite per case. */
let authOutcome: Outcome = { ok: true, stdout: '' };
let branchOutcome: Outcome = { ok: true, stdout: '[]' };
let commitOutcome: Outcome = { ok: true, stdout: '[]' };

vi.mock('../spawn', () => ({
  AUTH_TIMEOUT_MS: 3_000,
  READ_TIMEOUT_MS: 10_000,
  runGh: (
    argv: readonly string[],
    options: { cwd: string; timeoutMs: number }
  ): Promise<Outcome> => {
    ghCalls.push({ argv: [...argv], cwd: options.cwd });
    if (argv[0] === 'auth') return Promise.resolve(authOutcome);
    if (argv.includes('--commit')) return Promise.resolve(commitOutcome);
    return Promise.resolve(branchOutcome);
  }
}));

/** What the four git reads answer. Tests overwrite per case. */
let ownerRepo: string | null = 'owner/repo';
let branch: string | null = 'main';
let upstreamSha: string | null = 'a'.repeat(40);
let headSha: string | null = 'b'.repeat(40);

vi.mock('../repo', () => ({
  readOwnerRepo: () => Promise.resolve(ownerRepo),
  readBranch: () => Promise.resolve(branch),
  readUpstreamSha: () => Promise.resolve(upstreamSha),
  readHeadSha: () => Promise.resolve(headSha)
}));

vi.mock('../../watcher', () => ({
  onRepoChanged: () => () => undefined
}));

vi.mock('../../typed-events', () => ({
  broadcastEvent: () => undefined
}));

vi.mock('../../log', () => ({
  getLog: () => ({
    debug: () => undefined,
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined
  })
}));

const { disposeActionsService, readRuns } = await import('../service');

/** One row of gh's own `run list --json` output. */
function ghRow(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    databaseId: 4001,
    number: 12,
    workflowName: 'CI',
    displayTitle: 'a change',
    status: 'completed',
    conclusion: 'success',
    event: 'push',
    headBranch: 'main',
    headSha: 'a'.repeat(40),
    createdAt: '2026-08-20T10:00:00Z',
    startedAt: '2026-08-20T10:00:05Z',
    updatedAt: '2026-08-20T10:02:00Z',
    url: 'https://github.com/owner/repo/actions/runs/4001',
    ...over
  };
}

const REPO = '/tmp/p120-service-repo';

/** The argvs of every `run list` call, auth probe excluded. */
const listCalls = (): string[][] =>
  ghCalls.filter((one) => one.argv[0] === 'run').map((one) => one.argv);

beforeEach(() => {
  disposeActionsService();
  ghCalls = [];
  authOutcome = { ok: true, stdout: '' };
  branchOutcome = { ok: true, stdout: '[]' };
  commitOutcome = { ok: true, stdout: '[]' };
  ownerRepo = 'owner/repo';
  branch = 'main';
  upstreamSha = 'a'.repeat(40);
  headSha = 'b'.repeat(40);
});

describe('the two query refresh', () => {
  it('composes the branch argv and then the commit argv at the upstream sha', async () => {
    await readRuns({ repoPath: REPO });
    expect(ghCalls[0]?.argv).toEqual(buildAuthStatusArgv());
    expect(listCalls()).toEqual([
      buildRunListForBranchArgv({
        ownerRepo: 'owner/repo',
        branch: 'main',
        limit: WATCH_LIMITS.RUN_LIMIT
      }),
      buildRunListForCommitArgv({
        ownerRepo: 'owner/repo',
        sha: 'a'.repeat(40),
        limit: WATCH_LIMITS.COMMIT_RUN_LIMIT
      })
    ]);
  });

  it('uses the head sha when the branch has no upstream', async () => {
    upstreamSha = null;
    await readRuns({ repoPath: REPO });
    expect(listCalls()[1]).toContain('b'.repeat(40));
  });

  it('runs no commit query when both shas are null', async () => {
    upstreamSha = null;
    headSha = null;
    const out = await readRuns({ repoPath: REPO });
    expect(listCalls()).toHaveLength(1);
    expect(out.health).toEqual({ state: 'ready' });
  });

  it('runs no commit query after a branch failure, and keeps its rung', async () => {
    branchOutcome = { ok: false, health: { state: 'offline' } };
    const out = await readRuns({ repoPath: REPO });
    expect(listCalls()).toHaveLength(1);
    expect(out.health).toEqual({ state: 'offline' });
    expect(out.lastCheckedAt).toBeNull();
  });

  it('lands a run returned by both queries exactly once', async () => {
    branchOutcome = { ok: true, stdout: JSON.stringify([ghRow()]) };
    commitOutcome = {
      ok: true,
      stdout: JSON.stringify([ghRow(), ghRow({ databaseId: 4002 })])
    };
    const out = await readRuns({ repoPath: REPO });
    expect(out.runs.map((row) => row.id).sort()).toEqual([4001, 4002]);
  });

  it('lists a tag run the branch query alone omits', async () => {
    // The defect this phase fixes: GitHub records a tag push run's head
    // branch as the tag name, so only the commit query returns it.
    branchOutcome = { ok: true, stdout: JSON.stringify([ghRow()]) };
    commitOutcome = {
      ok: true,
      stdout: JSON.stringify([
        ghRow({ databaseId: 5001, headBranch: 'v9.9.9', event: 'push' })
      ])
    };
    const out = await readRuns({ repoPath: REPO });
    expect(out.runs.map((row) => row.id).sort()).toEqual([4001, 5001]);
    expect(out.runs.some((row) => row.headBranch === 'v9.9.9')).toBe(true);
  });

  it('concatenates the issues of the two answers, branch first', async () => {
    const badBranch = ghRow({ databaseId: 4003 });
    delete badBranch['url'];
    const badCommit = ghRow({ databaseId: 4004 });
    delete badCommit['headSha'];
    branchOutcome = { ok: true, stdout: JSON.stringify([badBranch]) };
    commitOutcome = { ok: true, stdout: JSON.stringify([badCommit]) };
    const out = await readRuns({ repoPath: REPO });
    expect(out.issues.map((one) => one.field)).toEqual(['url', 'headSha']);
  });

  it('keeps the branch rows and carries the rung when the commit query fails', async () => {
    branchOutcome = { ok: true, stdout: JSON.stringify([ghRow()]) };
    commitOutcome = { ok: false, health: { state: 'rate-limited' } };
    const out = await readRuns({ repoPath: REPO });
    expect(out.runs.map((row) => row.id)).toEqual([4001]);
    expect(out.health).toEqual({ state: 'rate-limited' });
    // A check did happen, so the age caption stays honest.
    expect(out.lastCheckedAt).not.toBeNull();
  });

  it('returns early on a detached HEAD with no run list read at all', async () => {
    branch = null;
    const out = await readRuns({ repoPath: REPO });
    expect(listCalls()).toHaveLength(0);
    expect(out.branch).toBeNull();
    expect(out.health).toEqual({ state: 'ready' });
  });
});
