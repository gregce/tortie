/**
 * The read only merged runs read, used by BOTH the local Runs section and the
 * remote one (Phase 126).
 *
 * ## Why this file exists
 *
 * Phase 120 added a second gh read on both paths, and it added it twice. The
 * local copy sat in `./service.ts` and the remote copy sat in
 * `../machines/remote-runs.ts`, and the two copies were about 45 lines of the
 * same work. The remote copy reached that shape by importing four private
 * files of this directory, being `./argv`, `./merge`, `./parse` and `./spawn`,
 * plus one number from `./watch`. That is 11 values and 1 type read across the
 * directory's own wall, and the wall is what `./index.ts` describes.
 *
 * This module is the one door. It is named in `./index.ts` beside the two IPC
 * functions, and it is the only thing under `src/main/actions/` that a file
 * under `src/main/machines/` may import. The rule is asserted by
 * `__tests__/p126-boundary.test.ts`.
 *
 * ## What it is
 *
 * It spawns gh, it parses, it folds and it caps. It holds no state, it starts
 * no timer, it owns no watch, it registers no IPC channel and it imports
 * nothing from `../machines`. It also imports nothing from the sessions
 * domain, so the rule that only session behavior may raise "needs input" is
 * untouched.
 *
 * ## The order of work, and both callers get exactly this
 *
 *  1. Build the branch argv and ask `assertReadOnlyArgv` about it. A refusal
 *     is a branch read that did not happen, and no process is created.
 *  2. Run one gh process for the branch query. On failure return
 *     `branchOk: false` with that health and make NO second process. A broken
 *     gh makes one process per read, never two.
 *  3. On success, parse. Then, when `tipSha` is not null, build the commit
 *     argv, ask `assertReadOnlyArgv` again, and run a second gh process. It
 *     runs after the first on the same lane, never in parallel.
 *  4. Fold with `mergeRunQueries(branchRuns, commitRuns)`. The commit query's
 *     copy of a duplicated run id wins because it was read second.
 *  5. Cap with `capRuns(merged, limit, tipSha)` when `cap` is true, which
 *     keeps a run at the tip past the limit.
 *  6. Concatenate the two issue lists, branch issues first.
 *
 * ## Two fields exist because the two callers really do differ, and both are
 * about keeping the answer on screen the same as it was
 *
 * `cap` DEFAULTS TO TRUE AND THE LOCAL PATH PASSES FALSE. The local service
 * does not cap here because its own `mergeRuns` folds the incoming rows into
 * the rows already on screen and caps that result against `rec.limit`, with
 * its own exception for the commit it is watching. Capping twice can drop a
 * row the local fold would have kept, in two ways. The watched commit and the
 * branch tip are not always the same commit, so a watched row past the limit
 * would be dropped here and never reach the fold that would have kept it. And
 * this cap counts rows in `startedAt` order while the local fold counts them
 * in `createdAt` order, so a run created early and started late sits at a
 * different position in the two lists. The remote path has no such fold and no
 * rows on screen to merge with, so it caps here, which is what it did before
 * this phase.
 *
 * `merged` IS FALSE WHEN NO COMMIT ANSWER CAME BACK, and then the branch rows
 * stand in the order gh printed them. That is what the remote path did before
 * this phase and it is what is on screen today. The local path re sorts every
 * list it receives inside its own `mergeRuns`, so the order this module
 * returns is not observable there.
 *
 * ## The one behaviour that was unified, named rather than hidden
 *
 * An argv the allowlist refuses now comes back as `branchOk: false` and
 * `refused: true` on both paths. The remote path already did that. The local
 * path let the refusal throw out of the read and reach the renderer as an IPC
 * error. Nothing can reach either shape: the branch name comes from
 * `git rev-parse --abbrev-ref HEAD` on the local path and from
 * `git rev-parse --abbrev-ref HEAD` on the far side on the remote one, and
 * `git check-ref-format` refuses a name that starts with a dash or holds
 * whitespace, so a name gh would read as a flag cannot exist.
 */

import type { ActionsHealth, ActionsParseIssue, ActionsRun } from '@shared/actions';
import {
  MAX_LIMIT,
  assertReadOnlyArgv,
  buildRunListForBranchArgv,
  buildRunListForCommitArgv
} from './argv';
import { capRuns, mergeRunQueries } from './merge';
import { parseJsonOrNull, parseRunList } from './parse';
import { READ_TIMEOUT_MS, runGh, type GhSpawner } from './spawn';
import { WATCH_LIMITS } from './watch';

export type { GhSpawner };

/** What one merged runs read is asked for. */
export interface MergedRunsInput {
  /** `owner/repo`, already resolved by the caller. */
  readonly ownerRepo: string;
  /** The branch to list runs for. */
  readonly branch: string;
  /** The commit at the branch tip, or null when there is none to ask about. */
  readonly tipSha: string | null;
  /** How many branch rows to ask gh for, already clamped by the caller. */
  readonly limit: number;
  /** gh's working directory. `--repo` is explicit, so it changes no answer. */
  readonly cwd: string;
  /**
   * Cap the merged list at `limit` here. Defaults to true. The local Runs
   * service passes false and caps in its own fold, for the reason in the file
   * header.
   */
  readonly cap?: boolean;
}

/** The test seam. Both fields are undefined in the product. */
export interface MergedRunsSeam {
  /** Test seam: skip the real gh spawn. */
  readonly spawner?: GhSpawner;
  /** Test seam: skip binary resolution and the login shell PATH capture. */
  readonly bin?: string;
}

/** What the read found. */
export interface MergedRunsRead {
  /** True when the branch query ran and gh answered it. */
  readonly branchOk: boolean;
  /** True when the argv allowlist refused the branch command line. */
  readonly refused: boolean;
  readonly runs: readonly ActionsRun[];
  readonly issues: readonly ActionsParseIssue[];
  /** Ready when both reads worked. Otherwise the health of whichever failed. */
  readonly health: ActionsHealth;
  /** True when the branch read worked and the commit read did not. */
  readonly commitFailed: boolean;
  /** True when a commit answer came back and the two lists were folded. */
  readonly merged: boolean;
  /** How many gh processes this read created. 0, 1 or 2. */
  readonly spawns: number;
}

/**
 * The numbers this read works to, gathered in one place so a caller does not
 * reach into `./argv` or `./watch` for them.
 */
export const RUNS_READ_LIMITS = {
  /** The highest `--limit` the argv module will compose. */
  MAX_LIMIT,
  /** Rows at rest, for the current branch. */
  RUN_LIMIT: WATCH_LIMITS.RUN_LIMIT,
  /** Runs one push may start. */
  COMMIT_RUN_LIMIT: WATCH_LIMITS.COMMIT_RUN_LIMIT,
  /** The ceiling on one gh read. */
  READ_TIMEOUT_MS
} as const;

const NOT_READ: MergedRunsRead = {
  branchOk: false,
  refused: true,
  runs: [],
  issues: [],
  health: { state: 'ready' },
  commitFailed: false,
  merged: false,
  spawns: 0
};

/**
 * Read the runs for one branch, then the runs its tip commit started, and
 * fold them into one list.
 *
 * It never rejects for anything gh did. It rejects only if `./spawn` itself
 * rejects for a reason other than the argv, which nothing in this repository
 * does today.
 */
export async function readMergedRuns(
  input: MergedRunsInput,
  seam: MergedRunsSeam = {}
): Promise<MergedRunsRead> {
  const ghOptions = {
    cwd: input.cwd,
    timeoutMs: READ_TIMEOUT_MS,
    ...(seam.spawner === undefined ? {} : { spawner: seam.spawner }),
    ...(seam.bin === undefined ? {} : { bin: seam.bin })
  };

  const branchArgv = buildRunListForBranchArgv({
    ownerRepo: input.ownerRepo,
    branch: input.branch,
    limit: input.limit
  });
  try {
    // The allowlist's own rule, asked here rather than copied. `runGh` asks it
    // again before it makes a process.
    assertReadOnlyArgv(branchArgv);
  } catch {
    return NOT_READ;
  }

  const outcome = await runGh(branchArgv, ghOptions);
  if (!outcome.ok) {
    // A broken gh makes ONE process per read, not two: the commit query is
    // never run after a branch failure.
    return {
      branchOk: false,
      refused: false,
      runs: [],
      issues: [],
      health: outcome.health,
      commitFailed: false,
      merged: false,
      spawns: 1
    };
  }

  const branchParsed = parseRunList(parseJsonOrNull(outcome.stdout));
  if (input.tipSha === null) {
    return {
      branchOk: true,
      refused: false,
      runs: branchParsed.runs,
      issues: branchParsed.issues,
      health: { state: 'ready' },
      commitFailed: false,
      merged: false,
      spawns: 1
    };
  }

  // The SECOND query (Phase 120): the runs the tip commit started. GitHub
  // records a tag push run's head branch as the TAG NAME, so the branch query
  // alone can never return a release run. Sequential, after the branch read.
  const commitArgv = buildRunListForCommitArgv({
    ownerRepo: input.ownerRepo,
    sha: input.tipSha,
    limit: WATCH_LIMITS.COMMIT_RUN_LIMIT
  });
  try {
    // The same belt the branch argv gets. The branch rows stand on a refusal.
    assertReadOnlyArgv(commitArgv);
  } catch {
    return {
      branchOk: true,
      refused: false,
      runs: branchParsed.runs,
      issues: branchParsed.issues,
      health: { state: 'ready' },
      commitFailed: false,
      merged: false,
      spawns: 1
    };
  }

  const commitOutcome = await runGh(commitArgv, ghOptions);
  if (!commitOutcome.ok) {
    // The branch rows stand and the rung names the COMMIT failure, so the
    // panel does not claim a full read that did not happen.
    return {
      branchOk: true,
      refused: false,
      runs: branchParsed.runs,
      issues: branchParsed.issues,
      health: commitOutcome.health,
      commitFailed: true,
      merged: false,
      spawns: 2
    };
  }

  const commitParsed = parseRunList(parseJsonOrNull(commitOutcome.stdout));
  const merged = mergeRunQueries(branchParsed.runs, commitParsed.runs);
  const runs =
    input.cap === false ? merged : capRuns(merged, input.limit, input.tipSha);
  return {
    branchOk: true,
    refused: false,
    runs,
    issues: [...branchParsed.issues, ...commitParsed.issues],
    health: { state: 'ready' },
    commitFailed: false,
    merged: true,
    spawns: 2
  };
}
