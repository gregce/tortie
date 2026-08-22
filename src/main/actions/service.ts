/**
 * The Runs service (Phase 46, spec sections 3.1 to 3.4).
 *
 * One record per OBSERVED repository. A repository becomes observed when the
 * renderer calls `actions:observe`, which happens the first time the user
 * expands the Runs section and never before. Nothing spawns for a repository
 * nobody has looked at, and nothing runs at all while no repository is
 * observed.
 *
 * TWO LANES PER REPOSITORY, AND NO GLOBAL QUEUE.
 *
 *   read lane  anything the user asked for: the list refresh and a jobs read.
 *              Reads are SERIALIZED, because an invoke has to be answered.
 *              The chain is capped, and a read that arrives with four
 *              already waiting is answered from the last known state instead
 *              of adding a fifth.
 *   poll lane  the watch. A tick whose previous gh process has not returned
 *              is SKIPPED rather than queued, because the next tick is five
 *              seconds away and a queue of stale polls helps nobody.
 *
 * The ceiling is therefore two gh processes per open project tab, and the
 * number of open tabs is the user's own choice.
 *
 * Since Phase 120 a list refresh makes up to TWO gh reads, the branch list
 * and then the commit list at the branch tip, because GitHub records a tag
 * push run's head branch as the tag name and the branch query alone can
 * never return it. The two reads run one after the other on the read lane,
 * never in parallel, so the lane still holds at most one live gh process at
 * a time and the two process ceiling per tab is unchanged.
 *
 * ONE ARMING PATH FOR BOTH PUSH MOMENTS, and this is the one deviation from
 * research 45 section 5.3. That document arms from the typed push result for
 * a push made in Tortie and from `git:changed` for a push made in a
 * terminal. A push made in Tortie already broadcasts `git:changed` for that
 * repository, and the pushed commit comes from the remote tracking ref
 * either way, so this service subscribes to the repo changed bus once and
 * learns both. It removes every edit to src/main/git, it makes the two push
 * moments impossible to diverge, and it deletes a code path only one entry
 * point could ever reach.
 *
 * THE WATCH IS NEVER DURABLE. It lives in the map below, in memory. It is
 * never written to the manifest, never to settings and never to disk.
 * Quitting Tortie ends every watch and relaunching starts none.
 */

import type {
  ActionsHealth,
  ActionsJobsInput,
  ActionsJobsResult,
  ActionsParseIssue,
  ActionsRun,
  ActionsRunsInput,
  ActionsUpdate
} from '@shared/actions';
import { resolve as resolvePath } from 'node:path';
import { EVT_ACTIONS_CHANGED } from '@shared/ipc';
import { gmuxError } from '../errors';
import { getLog } from '../log';
import { broadcastEvent } from '../typed-events';
import { onRepoChanged } from '../watcher';
import {
  MAX_LIMIT,
  buildAuthStatusArgv,
  buildRunListForCommitArgv,
  buildRunViewArgv
} from './argv';
import { parseJsonOrNull, parseRunJobs, parseRunList } from './parse';
import {
  readBranch,
  readHeadSha,
  readOwnerRepo,
  readUpstreamSha
} from './repo';
import { readMergedRuns } from './runs-read';
import { AUTH_TIMEOUT_MS, READ_TIMEOUT_MS, runGh } from './spawn';
import {
  WATCH_LIMITS,
  type WatchState,
  arm,
  idleWatch,
  observeRuns,
  release,
  tick,
  toWatchView
} from './watch';

const actionsLog = getLog('actions');

/**
 * How often the driver asks the state machine what to do. It is NOT a gh
 * call: the machine answers "nothing to do" on most of these. One second is
 * what keeps the 5 second interval and the 30 minute cap accurate to a
 * second without the machine needing its own timer.
 */
const TICK_INTERVAL_MS = 1_000;

/** Reads waiting on the read lane before a new one is answered from state. */
const READ_LANE_DEPTH = 4;

interface RepoRecord {
  repoPath: string;
  ownerRepo: string | null;
  branch: string | null;
  runs: ActionsRun[];
  issues: ActionsParseIssue[];
  lastCheckedAt: number | null;
  health: ActionsHealth;
  watch: WatchState;
  /** The last remote tracking sha this repository was seen at. */
  baselineSha: string | null;
  /** True once the baseline has been read, so observe does it once. */
  baselineRead: boolean;
  /** Rows the renderer last asked for. */
  limit: number;
  timer: NodeJS.Timeout | null;
  /** The read lane's tail, and how many reads are waiting on it. */
  readLane: Promise<void>;
  readDepth: number;
  /** True while the poll lane holds a live gh process. */
  pollBusy: boolean;
  /** True while the arming git reads are in flight. */
  armBusy: boolean;
}

const records = new Map<string, RepoRecord>();
let unsubscribeBus: (() => void) | null = null;

/**
 * Whether gh answered the auth probe once in this process.
 *
 * The 'ready' answer is cached for the life of the process, because a person
 * signs in about twice a year and the probe costs a process. A failure is
 * NOT cached, so signing in makes the next refresh work with no relaunch.
 * Signing OUT is caught by the read itself, which then classifies as logged
 * out from gh's own words.
 */
let authProbePassed = false;

// ---------------------------------------------------------------------------
// The record
// ---------------------------------------------------------------------------

/**
 * The map key, and it MUST be the same string the repo changed bus emits.
 *
 * src/main/git normalizes a repository path with `path.resolve` before it
 * starts the one watcher for it, and that resolved path is what the bus
 * carries. Normalizing the same way here is what makes an arming event find
 * its record. Symlinks are deliberately not resolved, for the same reason
 * git does not resolve them: the two ends would then disagree.
 */
function assertRepoPath(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw gmuxError('INVALID_INPUT', 'A repository path is required.');
  }
  return resolvePath(value);
}

function ensureRecord(repoPath: string): RepoRecord {
  const existing = records.get(repoPath);
  if (existing !== undefined) return existing;
  const created: RepoRecord = {
    repoPath,
    ownerRepo: null,
    branch: null,
    runs: [],
    issues: [],
    lastCheckedAt: null,
    health: { state: 'ready' },
    watch: idleWatch(),
    baselineSha: null,
    baselineRead: false,
    limit: WATCH_LIMITS.RUN_LIMIT,
    timer: null,
    readLane: Promise.resolve(),
    readDepth: 0,
    pollBusy: false,
    armBusy: false
  };
  records.set(repoPath, created);
  return created;
}

function snapshot(rec: RepoRecord): ActionsUpdate {
  return {
    repoPath: rec.repoPath,
    branch: rec.branch,
    ownerRepo: rec.ownerRepo,
    runs: rec.runs,
    lastCheckedAt: rec.lastCheckedAt,
    health: rec.health,
    watch: toWatchView(rec.watch),
    issues: rec.issues
  };
}

function broadcast(rec: RepoRecord): void {
  broadcastEvent(EVT_ACTIONS_CHANGED, snapshot(rec));
}

// ---------------------------------------------------------------------------
// The read lane
// ---------------------------------------------------------------------------

/**
 * Run `task` after whatever the read lane is already doing.
 *
 * A read is something the user asked for, so it is answered rather than
 * dropped. Deeper than `READ_LANE_DEPTH` and the caller gets `fallback`
 * instead, which is the last known state and is honest about its age.
 */
function onReadLane<T>(
  rec: RepoRecord,
  task: () => Promise<T>,
  fallback: () => T
): Promise<T> {
  if (rec.readDepth >= READ_LANE_DEPTH) return Promise.resolve(fallback());
  rec.readDepth += 1;
  const run = async (): Promise<T> => {
    try {
      return await task();
    } finally {
      rec.readDepth -= 1;
    }
  };
  const next = rec.readLane.then(run, run);
  rec.readLane = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

/**
 * The auth rung. Runs `gh auth status` at most once per process on the way
 * to the first successful read.
 */
async function ensureAuth(cwd: string): Promise<ActionsHealth> {
  if (authProbePassed) return { state: 'ready' };
  const outcome = await runGh(buildAuthStatusArgv(), {
    cwd,
    timeoutMs: AUTH_TIMEOUT_MS
  });
  if (outcome.ok) {
    authProbePassed = true;
    return { state: 'ready' };
  }
  return outcome.health;
}

function clampLimit(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return WATCH_LIMITS.RUN_LIMIT;
  }
  return Math.min(MAX_LIMIT, Math.max(1, Math.trunc(value)));
}

/**
 * Fold new rows into the ones already on screen.
 *
 * A branch read is the truth for the branch, so it replaces what is there.
 * The one exception is the commit being watched: a run started by a pull
 * request carries the source branch, not this one, so it is not in the
 * branch list and would vanish on every refresh while the user is watching
 * it. Rows for the watched commit are therefore kept past the limit, which
 * puts the ceiling at the limit plus the runs one push started.
 */
function mergeRuns(
  rec: RepoRecord,
  incoming: readonly ActionsRun[],
  mode: 'branch' | 'commit'
): ActionsRun[] {
  const watchSha = rec.watch.sha;
  const byId = new Map<number, ActionsRun>();
  for (const run of rec.runs) {
    const keep = mode === 'commit' || (watchSha !== null && run.headSha === watchSha);
    if (keep) byId.set(run.id, run);
  }
  for (const run of incoming) byId.set(run.id, run);

  const sorted = [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
  const kept: ActionsRun[] = [];
  for (const run of sorted) {
    const watched = watchSha !== null && run.headSha === watchSha;
    if (kept.length < rec.limit || watched) kept.push(run);
  }
  return kept;
}

// ---------------------------------------------------------------------------
// The four channels
// ---------------------------------------------------------------------------

/**
 * Start noticing pushes for this repository. Spawns nothing by itself: the
 * only work is one git read for the baseline commit.
 */
export async function observeRepo(repoPath: string): Promise<void> {
  const path = assertRepoPath(repoPath);
  const rec = ensureRecord(path);
  ensureBusSubscription();
  if (rec.baselineRead) return;
  rec.baselineRead = true;
  rec.baselineSha = await readUpstreamSha(path);
}

/** Stop noticing, and end any watch this repository has running. */
export function releaseRepo(repoPath: string): void {
  const rec = records.get(assertRepoPath(repoPath));
  if (rec === undefined) return;
  stopTimer(rec);
  rec.watch = release(rec.watch);
  records.delete(rec.repoPath);
  if (records.size === 0) dropBusSubscription();
}

/** Read the latest runs for this repository's current branch. */
export function readRuns(input: ActionsRunsInput): Promise<ActionsUpdate> {
  const repoPath = assertRepoPath(input?.repoPath);
  const rec = ensureRecord(repoPath);
  rec.limit = clampLimit(input.limit);
  return onReadLane(
    rec,
    () => runBranchRead(rec),
    () => snapshot(rec)
  );
}

async function runBranchRead(rec: RepoRecord): Promise<ActionsUpdate> {
  const [ownerRepo, branch] = await Promise.all([
    readOwnerRepo(rec.repoPath),
    readBranch(rec.repoPath)
  ]);
  rec.ownerRepo = ownerRepo;
  rec.branch = branch;

  if (ownerRepo === null) {
    rec.health = { state: 'no-remote' };
    return snapshot(rec);
  }

  const auth = await ensureAuth(rec.repoPath);
  if (auth.state !== 'ready') {
    rec.health = auth;
    return snapshot(rec);
  }

  if (branch === null) {
    // A detached HEAD has no branch to list runs for. The rows already on
    // screen stay and the panel keeps its age caption.
    rec.health = { state: 'ready' };
    return snapshot(rec);
  }

  // The branch tip, for the SECOND query below. The upstream tracking sha is
  // preferred because a run can only exist for a commit GitHub has, and a
  // local HEAD ahead of the push would name a commit with no runs. HEAD is
  // the fallback for a branch with no upstream at all.
  const tipSha =
    (await readUpstreamSha(rec.repoPath)) ?? (await readHeadSha(rec.repoPath));

  // BOTH gh reads, and the fold, live in `./runs-read.ts` since Phase 126.
  // The remote Runs section calls the same function with the same rules, so
  // the two panels cannot disagree about what a merged list is.
  //
  // `cap: false` IS THE ONE THING THIS PATH ASKS FOR AND THE REMOTE ONE DOES
  // NOT. `mergeRuns` below folds the incoming rows into the rows already on
  // screen and caps that result against `rec.limit`, keeping the commit it is
  // watching past the limit. Capping in both places can drop a row this fold
  // would have kept, so only this fold caps. The reasons are written out in
  // the header of `./runs-read.ts`.
  const read = await readMergedRuns({
    ownerRepo,
    branch,
    tipSha,
    limit: rec.limit,
    cwd: rec.repoPath,
    cap: false
  });
  if (!read.branchOk) {
    // A broken gh makes ONE process per read, not two: the commit query is
    // never run after a branch failure.
    rec.health = read.health;
    if (read.health.state === 'rate-limited') stopTimer(rec);
    return snapshot(rec);
  }
  if (read.commitFailed && read.health.state === 'rate-limited') stopTimer(rec);

  rec.runs = mergeRuns(rec, read.runs, 'branch');
  rec.issues = [...read.issues];
  // A check did happen, so the age caption moves even when the commit query
  // failed. Health carries that failure so the panel does not claim a full
  // read that did not happen.
  rec.lastCheckedAt = Date.now();
  rec.health = read.health;
  // A read is a user action, so it lifts a poller that a rate limit stopped.
  if (
    read.health.state !== 'rate-limited' &&
    (rec.watch.phase === 'discovering' || rec.watch.phase === 'watching')
  ) {
    ensureTimer(rec);
  }
  return snapshot(rec);
}

/** Read one run's jobs and their steps. */
export function readJobs(input: ActionsJobsInput): Promise<ActionsJobsResult> {
  const repoPath = assertRepoPath(input?.repoPath);
  const runId = input?.runId;
  if (typeof runId !== 'number' || !Number.isInteger(runId) || runId <= 0) {
    throw gmuxError('INVALID_INPUT', 'That run id is not a whole number.');
  }
  const rec = ensureRecord(repoPath);
  const empty = (): ActionsJobsResult => ({
    repoPath: rec.repoPath,
    runId,
    jobs: [],
    issues: [],
    health: rec.health,
    lastCheckedAt: rec.lastCheckedAt
  });
  return onReadLane(rec, () => runJobsRead(rec, runId), empty);
}

async function runJobsRead(
  rec: RepoRecord,
  runId: number
): Promise<ActionsJobsResult> {
  const base = {
    repoPath: rec.repoPath,
    runId,
    jobs: [] as ActionsJobsResult['jobs'],
    issues: [] as ActionsParseIssue[],
    lastCheckedAt: rec.lastCheckedAt
  };

  if (rec.ownerRepo === null) rec.ownerRepo = await readOwnerRepo(rec.repoPath);
  const ownerRepo = rec.ownerRepo;
  if (ownerRepo === null) return { ...base, health: { state: 'no-remote' } };

  const auth = await ensureAuth(rec.repoPath);
  if (auth.state !== 'ready') {
    rec.health = auth;
    return { ...base, health: auth };
  }

  const outcome = await runGh(buildRunViewArgv({ ownerRepo, runId }), {
    cwd: rec.repoPath,
    timeoutMs: READ_TIMEOUT_MS
  });
  if (!outcome.ok) {
    rec.health = outcome.health;
    if (outcome.health.state === 'rate-limited') stopTimer(rec);
    return { ...base, health: outcome.health };
  }

  const parsed = parseRunJobs(parseJsonOrNull(outcome.stdout));
  rec.health = { state: 'ready' };
  return {
    repoPath: rec.repoPath,
    runId,
    jobs: parsed.jobs,
    issues: parsed.issues,
    health: { state: 'ready' },
    lastCheckedAt: Date.now()
  };
}

// ---------------------------------------------------------------------------
// The watch driver
// ---------------------------------------------------------------------------

function ensureTimer(rec: RepoRecord): void {
  if (rec.timer !== null) return;
  const timer = setInterval(() => {
    onTick(rec);
  }, TICK_INTERVAL_MS);
  timer.unref?.();
  rec.timer = timer;
}

function stopTimer(rec: RepoRecord): void {
  if (rec.timer === null) return;
  clearInterval(rec.timer);
  rec.timer = null;
}

function onTick(rec: RepoRecord): void {
  const before = rec.watch;
  const result = tick(before, Date.now());
  rec.watch = result.state;
  if (result.state.phase === 'stopped') stopTimer(rec);
  if (result.state.phase !== before.phase || result.state.stop !== before.stop) {
    broadcast(rec);
  }
  if (result.command.kind !== 'none') {
    void runCommitRead(rec, result.command.sha);
  }
}

/**
 * One `run list --commit` on the poll lane. Skipped, not queued, when the
 * previous one has not come back.
 */
async function runCommitRead(rec: RepoRecord, sha: string): Promise<void> {
  if (rec.pollBusy) return;
  if (rec.ownerRepo === null) rec.ownerRepo = await readOwnerRepo(rec.repoPath);
  const ownerRepo = rec.ownerRepo;
  if (ownerRepo === null) return;

  rec.pollBusy = true;
  try {
    const outcome = await runGh(
      buildRunListForCommitArgv({
        ownerRepo,
        sha,
        limit: WATCH_LIMITS.COMMIT_RUN_LIMIT
      }),
      { cwd: rec.repoPath, timeoutMs: READ_TIMEOUT_MS }
    );

    // The tab may have closed while gh was answering. A released repository
    // has no record, and nothing should be painted for it.
    if (records.get(rec.repoPath) !== rec) return;

    if (!outcome.ok) {
      rec.health = outcome.health;
      if (outcome.health.state === 'rate-limited') {
        // The rows already fetched stay. The poller suspends until the user
        // asks for something, which is what lifts the timer again.
        stopTimer(rec);
      }
      broadcast(rec);
      return;
    }

    // A newer push may have superseded this watch while gh was answering.
    // Those rows belong to a commit nobody is following any more.
    if (rec.watch.sha !== sha) return;

    const parsed = parseRunList(parseJsonOrNull(outcome.stdout));
    rec.health = { state: 'ready' };
    rec.lastCheckedAt = Date.now();
    if (parsed.runs.length > 0) {
      rec.runs = mergeRuns(rec, parsed.runs, 'commit');
    }
    rec.watch = observeRuns(rec.watch, parsed.runs, Date.now());
    if (rec.watch.phase === 'stopped') stopTimer(rec);
    broadcast(rec);
  } catch (err) {
    actionsLog.warn(`a watch read failed: ${(err as Error).message}`, {
      repoPath: rec.repoPath
    });
  } finally {
    rec.pollBusy = false;
  }
}

// ---------------------------------------------------------------------------
// Arming, from the one repo changed bus
// ---------------------------------------------------------------------------

function ensureBusSubscription(): void {
  if (unsubscribeBus !== null) return;
  unsubscribeBus = onRepoChanged((repoPath) => {
    void onRepoChangedForActions(repoPath);
  });
}

function dropBusSubscription(): void {
  if (unsubscribeBus === null) return;
  unsubscribeBus();
  unsubscribeBus = null;
}

/**
 * The arming rule, stated in code exactly as the spec states it in prose.
 *
 * A watch is armed only when the remote tracking ref MOVED and now points at
 * local HEAD. A tracking ref that moved to something else came from a fetch
 * or from somebody else's push, and it is not our push. The baseline is
 * updated either way, so the same move is never considered twice.
 *
 * WHAT THIS MISSES, named rather than hidden. If the user pushes and then
 * commits again locally inside the watcher's 300 ms debounce, HEAD has
 * already moved past the pushed commit and no watch arms. The section still
 * refreshes on the same event, so the run appears in the list on the next
 * read, without step by step following.
 */
async function onRepoChangedForActions(repoPath: string): Promise<void> {
  const rec = records.get(repoPath);
  if (rec === undefined) return;
  if (rec.armBusy) return;
  rec.armBusy = true;
  try {
    const [upstream, head] = await Promise.all([
      readUpstreamSha(rec.repoPath),
      readHeadSha(rec.repoPath)
    ]);
    if (upstream === null) {
      rec.baselineSha = null;
      return;
    }
    if (upstream === rec.baselineSha) return;
    rec.baselineSha = upstream;
    if (upstream !== head) return;

    rec.watch = arm(rec.watch, upstream, Date.now());
    actionsLog.info('watching a push', {
      repoPath: rec.repoPath,
      sha: upstream.slice(0, 7)
    });
    ensureTimer(rec);
    broadcast(rec);
    // The first discovery goes out now rather than a second from now.
    onTick(rec);
  } finally {
    rec.armBusy = false;
  }
}

// ---------------------------------------------------------------------------
// Teardown
// ---------------------------------------------------------------------------

/** Quit time, and the test seam. Stops every timer and forgets every record. */
export function disposeActionsService(): void {
  for (const rec of records.values()) stopTimer(rec);
  records.clear();
  dropBusSubscription();
  authProbePassed = false;
}
