/**
 * Folding two run list answers into one list (Phase 120).
 *
 * GitHub records a tag push run's head branch as the TAG NAME, so a release
 * run never appears in a `run list --branch` answer. Phase 120 therefore asks
 * gh twice, once for the branch and once for the commit at the branch tip,
 * and this module is the one place the two answers become one list. Both the
 * local Runs section (../actions/service.ts) and the remote one
 * (../machines/remote-runs.ts) fold through here, so the two groups cannot
 * disagree about what a merged list is.
 *
 * PURE. It imports one type and nothing else. It spawns nothing, it reads no
 * state, and both exports are unit tested in __tests__/merge.test.ts.
 *
 * THE DEDUPE IS NOT OPTIONAL. A run at the tip whose head branch is the
 * branch is returned by BOTH queries, so the two answers are never assumed
 * disjoint. When both queries return the same run id, the commit query's row
 * wins, because the queries run one after the other and the commit query ran
 * second, so its copy of the run is the newer read.
 */

import type { ActionsRun } from '@shared/actions';

/**
 * Dedupe two answers by run id and sort newest first.
 *
 * The sort key is `startedAt` when it is not null, else `createdAt`, because
 * a queued run has not started. Ties break by `id` descending so the order
 * is stable across reads.
 */
export function mergeRunQueries(
  branchRuns: readonly ActionsRun[],
  commitRuns: readonly ActionsRun[]
): ActionsRun[] {
  const byId = new Map<number, ActionsRun>();
  for (const run of branchRuns) byId.set(run.id, run);
  // Second on purpose: the commit query ran second, so its row is newer.
  for (const run of commitRuns) byId.set(run.id, run);
  return [...byId.values()].sort((a, b) => {
    const aKey = a.startedAt ?? a.createdAt;
    const bKey = b.startedAt ?? b.createdAt;
    if (aKey !== bKey) return bKey - aKey;
    return b.id - a.id;
  });
}

/**
 * Keep at most `limit` rows. A row whose `headSha` equals `tipSha` is kept
 * past the limit.
 *
 * This mirrors the watched sha exception the local service's own fold has:
 * the runs the newest commit started are the reason the second query exists,
 * so an older page of branch rows may never push them out. The ceiling is
 * therefore the limit plus the runs one commit started.
 */
export function capRuns(
  runs: readonly ActionsRun[],
  limit: number,
  tipSha: string | null
): ActionsRun[] {
  const kept: ActionsRun[] = [];
  for (const run of runs) {
    const atTip = tipSha !== null && run.headSha === tipSha;
    if (kept.length < limit || atTip) kept.push(run);
  }
  return kept;
}
