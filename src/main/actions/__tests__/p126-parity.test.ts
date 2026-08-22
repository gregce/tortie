/**
 * The local Runs section and the remote one get the same answer from the same
 * bytes (Phase 126).
 *
 * Before this phase the merged runs read was written twice, once in
 * `../service.ts` and once in `../../machines/remote-runs.ts`, and the second
 * copy imported four private files of this directory to do it. Both now call
 * `readMergedRuns`. These fixtures hand that one function the exact bytes gh
 * would print and assert the answer, the health rung and THE NUMBER OF gh
 * PROCESSES for both call shapes.
 *
 * THE CALL SHAPES DIFFER IN ONE FIELD AND ONLY ONE. The local service passes
 * `cap: false` because its own `mergeRuns` folds and caps against the rows
 * already on screen. The remote path takes the default of true. Every case
 * below runs both shapes and asserts they agree, except the one case built to
 * show where the cap bites, which says so.
 *
 * Nothing here spawns. The `spawner` seam is called instead of `gh`, and every
 * case counts how many times it was called.
 */

import { describe, expect, it } from 'vitest';
import { readMergedRuns, type GhSpawner } from '../runs-read';

const OWNER_REPO = 'itavero/tortie';
const TIP = 'a'.repeat(40);
const OLD = 'b'.repeat(40);

/** One row as gh prints it, with every field present and easy to override. */
function ghRow(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    databaseId: 1,
    number: 1,
    workflowName: 'CI',
    displayTitle: 'a change',
    status: 'completed',
    conclusion: 'success',
    event: 'push',
    headBranch: 'main',
    headSha: OLD,
    createdAt: '2026-08-20T10:00:00Z',
    startedAt: '2026-08-20T10:00:05Z',
    updatedAt: '2026-08-20T10:05:00Z',
    url: 'https://github.com/itavero/tortie/actions/runs/1',
    ...over
  };
}

interface Recorded {
  readonly argvs: string[][];
  readonly spawner: GhSpawner;
}

/**
 * A spawner that answers the branch read with `branch` and the commit read
 * with `commit`. A null answer is a gh that failed with that stderr.
 */
function spawnerFor(
  branch: { rows?: Record<string, unknown>[]; fail?: string },
  commit: { rows?: Record<string, unknown>[]; fail?: string } = {}
): Recorded {
  const argvs: string[][] = [];
  const spawner: GhSpawner = (_bin, argv) => {
    argvs.push([...argv]);
    const which = argv.includes('--commit') ? commit : branch;
    if (which.fail !== undefined) {
      return Promise.resolve({
        stdout: '',
        stderr: which.fail,
        code: 1,
        timedOut: false,
        spawnError: null
      });
    }
    return Promise.resolve({
      stdout: JSON.stringify(which.rows ?? []),
      stderr: '',
      code: 0,
      timedOut: false,
      spawnError: null
    });
  };
  return { argvs, spawner };
}

/** The local service's call shape. */
function localCall(
  spawner: GhSpawner,
  over: { branch?: string; tipSha?: string | null; limit?: number } = {}
): ReturnType<typeof readMergedRuns> {
  return readMergedRuns(
    {
      ownerRepo: OWNER_REPO,
      branch: over.branch ?? 'main',
      tipSha: over.tipSha === undefined ? TIP : over.tipSha,
      limit: over.limit ?? 10,
      cwd: '/tmp/repo',
      cap: false
    },
    { spawner, bin: '/usr/bin/gh' }
  );
}

/** The remote path's call shape. gh stands in this Mac's home directory. */
function remoteCall(
  spawner: GhSpawner,
  over: { branch?: string; tipSha?: string | null; limit?: number } = {}
): ReturnType<typeof readMergedRuns> {
  return readMergedRuns(
    {
      ownerRepo: OWNER_REPO,
      branch: over.branch ?? 'main',
      tipSha: over.tipSha === undefined ? TIP : over.tipSha,
      limit: over.limit ?? 10,
      cwd: '/Users/gdc'
    },
    { spawner, bin: '/usr/bin/gh' }
  );
}

describe('the local and remote Runs reads agree', () => {
  it('case 1: a branch read that failed makes exactly one process', async () => {
    const local = spawnerFor({ fail: 'gh auth login required' });
    const localRead = await localCall(local.spawner);
    const remote = spawnerFor({ fail: 'gh auth login required' });
    const remoteRead = await remoteCall(remote.spawner);

    expect(localRead.branchOk).toBe(false);
    expect(localRead.health).toEqual({ state: 'logged-out' });
    expect(localRead.runs).toEqual([]);
    expect(localRead.spawns).toBe(1);
    expect(local.argvs).toHaveLength(1);
    expect(remoteRead).toEqual(localRead);
    expect(remote.argvs).toHaveLength(1);
  });

  it('case 2: no tip commit means one process and branch rows only', async () => {
    const local = spawnerFor({ rows: [ghRow({ databaseId: 7 })] });
    const localRead = await localCall(local.spawner, { tipSha: null });
    const remote = spawnerFor({ rows: [ghRow({ databaseId: 7 })] });
    const remoteRead = await remoteCall(remote.spawner, { tipSha: null });

    expect(localRead.branchOk).toBe(true);
    expect(localRead.merged).toBe(false);
    expect(localRead.runs.map((one) => one.id)).toEqual([7]);
    expect(localRead.spawns).toBe(1);
    expect(local.argvs).toHaveLength(1);
    expect(local.argvs[0]).toContain('--branch');
    expect(remoteRead).toEqual(localRead);
  });

  it('case 3: two good reads merge and sort newest first', async () => {
    const rows = {
      rows: [
        ghRow({ databaseId: 2, startedAt: '2026-08-20T09:00:00Z' }),
        ghRow({ databaseId: 1, startedAt: '2026-08-20T08:00:00Z' })
      ]
    };
    const tagRun = {
      rows: [
        ghRow({
          databaseId: 9,
          headSha: TIP,
          headBranch: 'v0.8.7',
          startedAt: '2026-08-20T11:00:00Z'
        })
      ]
    };
    const local = spawnerFor(rows, tagRun);
    const localRead = await localCall(local.spawner);
    const remote = spawnerFor(rows, tagRun);
    const remoteRead = await remoteCall(remote.spawner);

    expect(localRead.spawns).toBe(2);
    expect(local.argvs).toHaveLength(2);
    expect(local.argvs[0]).toContain('--branch');
    expect(local.argvs[1]).toContain('--commit');
    expect(localRead.merged).toBe(true);
    expect(localRead.runs.map((one) => one.id)).toEqual([9, 2, 1]);
    expect(remoteRead).toEqual(localRead);
  });

  it('case 4: a run in both answers keeps the commit query copy', async () => {
    const branch = {
      rows: [ghRow({ databaseId: 5, displayTitle: 'the branch read' })]
    };
    const commit = {
      rows: [
        ghRow({
          databaseId: 5,
          headSha: TIP,
          displayTitle: 'the commit read, which ran second'
        })
      ]
    };
    const local = spawnerFor(branch, commit);
    const localRead = await localCall(local.spawner);
    const remote = spawnerFor(branch, commit);
    const remoteRead = await remoteCall(remote.spawner);

    expect(localRead.runs).toHaveLength(1);
    expect(localRead.runs[0]?.displayTitle).toBe(
      'the commit read, which ran second'
    );
    expect(remoteRead).toEqual(localRead);
  });

  it('case 5: a commit read that failed leaves the branch rows standing', async () => {
    const branch = { rows: [ghRow({ databaseId: 3 })] };
    const commit = { fail: 'API rate limit exceeded' };
    const local = spawnerFor(branch, commit);
    const localRead = await localCall(local.spawner);
    const remote = spawnerFor(branch, commit);
    const remoteRead = await remoteCall(remote.spawner);

    expect(localRead.branchOk).toBe(true);
    expect(localRead.commitFailed).toBe(true);
    expect(localRead.health).toEqual({ state: 'rate-limited' });
    expect(localRead.runs.map((one) => one.id)).toEqual([3]);
    expect(localRead.spawns).toBe(2);
    expect(remoteRead).toEqual(localRead);
  });

  it('case 6: a run at the tip is kept past the limit', async () => {
    // Eleven branch rows, all older than the limit's worth, then one run at
    // the tip that sorts last. The cap keeps it anyway.
    const branchRows = Array.from({ length: 11 }, (_unused, index) =>
      ghRow({
        databaseId: 100 + index,
        startedAt: `2026-08-20T${String(20 - index).padStart(2, '0')}:00:00Z`
      })
    );
    const commitRows = [
      ghRow({
        databaseId: 500,
        headSha: TIP,
        startedAt: '2026-08-19T01:00:00Z'
      })
    ];
    const remote = spawnerFor({ rows: branchRows }, { rows: commitRows });
    const remoteRead = await remoteCall(remote.spawner, { limit: 10 });

    expect(remoteRead.runs).toHaveLength(11);
    expect(remoteRead.runs.map((one) => one.id)).toContain(500);
    // Ten branch rows plus the tip run. The eleventh branch row is dropped.
    expect(remoteRead.runs.map((one) => one.id)).not.toContain(110);

    // THIS IS THE ONE CASE WHERE THE TWO SHAPES DIFFER, and it is the whole
    // reason `cap` exists. The local service does not cap here, because its
    // own `mergeRuns` caps against the rows already on screen and keeps the
    // commit it is watching. Capping twice can drop a row that fold keeps.
    const local = spawnerFor({ rows: branchRows }, { rows: commitRows });
    const localRead = await localCall(local.spawner, { limit: 10 });
    expect(localRead.runs).toHaveLength(12);
    expect(localRead.runs.map((one) => one.id)).toContain(110);
  });

  it('case 7: a branch name gh would read as a flag makes no process', async () => {
    const local = spawnerFor({ rows: [ghRow()] });
    const localRead = await localCall(local.spawner, {
      branch: '--upload-pack=evil'
    });
    const remote = spawnerFor({ rows: [ghRow()] });
    const remoteRead = await remoteCall(remote.spawner, {
      branch: '--upload-pack=evil'
    });

    expect(localRead.refused).toBe(true);
    expect(localRead.branchOk).toBe(false);
    expect(localRead.runs).toEqual([]);
    expect(localRead.spawns).toBe(0);
    expect(local.argvs).toEqual([]);
    expect(remoteRead).toEqual(localRead);
    expect(remote.argvs).toEqual([]);
  });
});
