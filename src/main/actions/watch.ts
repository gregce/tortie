/**
 * The bounded watch, as a pure state machine (Phase 46, spec section 3.3).
 *
 * It takes an injected `now` and returns the next state plus at most one
 * command. It never spawns, never sets a timer and never touches a process.
 * The driver in service.ts owns the wall clock and the two gh lanes.
 *
 *   idle --arm(sha)--> discovering --runs found--> watching --all done--> stopped(complete)
 *                           |                          |
 *                           | 120 s, nothing found     | 30 min from the arm
 *                           v                          v
 *                     stopped(no-runs)            stopped(cap)
 *
 *   release() from any state --> stopped(released)
 *
 * A RUN COUNTS AS COMPLETE ONLY WHEN ITS STATUS IS EXACTLY 'completed'. An
 * unrecognized word counts as INCOMPLETE, so the 30 minute cap is what ends
 * the watch rather than a guess. That is deliberate. Dropping to complete on
 * a word we do not know would report a finish that did not happen.
 *
 * DISCOVERY COUNTS WALL CLOCK, NOT TICKS, so a machine that slept through
 * two minutes does not wake up owed 24 more tries.
 */

import type {
  ActionsRun,
  ActionsWatchPhase,
  ActionsWatchStop,
  ActionsWatchView
} from '@shared/actions';

/** Every number the watch runs on. The copy and the tests read these. */
export const WATCH_LIMITS = {
  /** How often `run list --commit` is tried while nothing has been found. */
  DISCOVER_INTERVAL_MS: 5_000,
  /** 24 tries, then stop quietly. */
  DISCOVER_GIVE_UP_MS: 120_000,
  /** How often the discovered runs are re read. */
  POLL_INTERVAL_MS: 5_000,
  /** 30 minutes from the arm, covering both phases. */
  HARD_CAP_MS: 1_800_000,
  /** Rows at rest, for the current branch. */
  RUN_LIMIT: 10,
  /** Runs one push may start. */
  COMMIT_RUN_LIMIT: 20
} as const;

export interface WatchState {
  phase: ActionsWatchPhase;
  /** The pushed commit being followed, null when idle. */
  sha: string | null;
  /** Why it stopped, null unless the phase is 'stopped'. */
  stop: ActionsWatchStop | null;
  /** When the current watch was armed. 0 when it has never been armed. */
  armedAt: number;
  /** When the last command was issued. Null means none has been. */
  lastCommandAt: number | null;
  /** The run ids discovery found. */
  runIds: number[];
}

export type WatchCommand =
  | { kind: 'none' }
  | { kind: 'discover'; sha: string }
  | { kind: 'poll'; sha: string };

export interface TickResult {
  state: WatchState;
  command: WatchCommand;
}

const NO_COMMAND: WatchCommand = { kind: 'none' };

/** A watch that has never been armed. */
export function idleWatch(): WatchState {
  return {
    phase: 'idle',
    sha: null,
    stop: null,
    armedAt: 0,
    lastCommandAt: null,
    runIds: []
  };
}

/**
 * Arm on a pushed commit.
 *
 * Arming while a watch is already running SUPERSEDES it: the new sha
 * replaces the old one and both clocks restart. The operator cares about the
 * newest push, so arming from 'stopped' and from 'watching' behave the same.
 */
export function arm(_state: WatchState, sha: string, now: number): WatchState {
  return {
    phase: 'discovering',
    sha,
    stop: null,
    armedAt: now,
    lastCommandAt: null,
    runIds: []
  };
}

/** Stop, because the user closed the tab or the section let the repo go. */
export function release(state: WatchState): WatchState {
  return { ...state, phase: 'stopped', stop: 'released', lastCommandAt: null };
}

/**
 * One wall clock moment. Returns the next state and the one command the
 * driver should run, which is at most one gh process on the poll lane.
 */
export function tick(state: WatchState, now: number): TickResult {
  if (state.phase === 'idle' || state.phase === 'stopped') {
    return { state, command: NO_COMMAND };
  }
  const sha = state.sha;
  if (sha === null) {
    return { state: { ...state, phase: 'stopped', stop: 'released' }, command: NO_COMMAND };
  }

  if (state.phase === 'discovering') {
    if (now - state.armedAt >= WATCH_LIMITS.DISCOVER_GIVE_UP_MS) {
      return {
        state: { ...state, phase: 'stopped', stop: 'no-runs' },
        command: NO_COMMAND
      };
    }
    if (dueNow(state.lastCommandAt, now, WATCH_LIMITS.DISCOVER_INTERVAL_MS)) {
      return {
        state: { ...state, lastCommandAt: now },
        command: { kind: 'discover', sha }
      };
    }
    return { state, command: NO_COMMAND };
  }

  // phase === 'watching'
  if (now - state.armedAt >= WATCH_LIMITS.HARD_CAP_MS) {
    return {
      state: { ...state, phase: 'stopped', stop: 'cap' },
      command: NO_COMMAND
    };
  }
  if (dueNow(state.lastCommandAt, now, WATCH_LIMITS.POLL_INTERVAL_MS)) {
    return {
      state: { ...state, lastCommandAt: now },
      command: { kind: 'poll', sha }
    };
  }
  return { state, command: NO_COMMAND };
}

function dueNow(
  lastCommandAt: number | null,
  now: number,
  intervalMs: number
): boolean {
  return lastCommandAt === null || now - lastCommandAt >= intervalMs;
}

/**
 * What one gh answer told the watch.
 *
 * Called after a discover or a poll returns. Discovery with rows moves to
 * 'watching'. Any answer whose rows are all complete stops the watch, and
 * "all complete" is only true when every status is exactly 'completed'.
 */
export function observeRuns(
  state: WatchState,
  runs: readonly Pick<ActionsRun, 'id' | 'status'>[],
  _now: number
): WatchState {
  if (state.phase !== 'discovering' && state.phase !== 'watching') {
    return state;
  }
  if (runs.length === 0) return state;

  const runIds = runs.map((run) => run.id);
  const allComplete = runs.every((run) => run.status === 'completed');
  if (allComplete) {
    return { ...state, phase: 'stopped', stop: 'complete', runIds };
  }
  return { ...state, phase: 'watching', stop: null, runIds };
}

/** The part of the watch the panel draws. */
export function toWatchView(state: WatchState): ActionsWatchView {
  return { phase: state.phase, sha: state.sha, stop: state.stop };
}
