/**
 * GitHub Actions data types (Phase 46). Every field here is something the gh
 * CLI printed, narrowed by src/main/actions/parse.ts. Nothing in this file
 * knows about IPC; src/shared/ipc/actions.ts carries the channels.
 */

/** The run and job lifecycle words gh prints, plus our catch all. */
export type ActionsStatus = 'queued' | 'in_progress' | 'completed' | 'unknown';

/** The outcome words gh prints, plus our catch all. Null while incomplete. */
export type ActionsConclusion =
  | 'success'
  | 'failure'
  | 'cancelled'
  | 'skipped'
  | 'timed_out'
  | 'action_required'
  | 'neutral'
  | 'stale'
  | 'startup_failure'
  | 'unknown';

/** One workflow run. Epoch milliseconds, never ISO strings, past the parser. */
export interface ActionsRun {
  id: number;
  number: number;
  workflowName: string;
  displayTitle: string;
  status: ActionsStatus;
  /** The exact word gh printed, for the tooltip when status is 'unknown'. */
  statusRaw: string;
  conclusion: ActionsConclusion | null;
  conclusionRaw: string | null;
  event: string;
  headBranch: string;
  headSha: string;
  createdAt: number;
  startedAt: number | null;
  updatedAt: number | null;
  url: string;
}

export interface ActionsStep {
  number: number;
  name: string;
  status: ActionsStatus;
  statusRaw: string;
  conclusion: ActionsConclusion | null;
  conclusionRaw: string | null;
  startedAt: number | null;
  completedAt: number | null;
}

export interface ActionsJob {
  id: number;
  name: string;
  status: ActionsStatus;
  statusRaw: string;
  conclusion: ActionsConclusion | null;
  conclusionRaw: string | null;
  startedAt: number | null;
  completedAt: number | null;
  /** The job page on github.com. Not the run page. */
  url: string;
  steps: ActionsStep[];
}

/** One row the parser refused, with the field that made it refuse. */
export interface ActionsParseIssue {
  /** 'run' | 'job' | 'step'. */
  kind: 'run' | 'job' | 'step';
  /** The field that was missing or the wrong type. */
  field: string;
  /** Plain reason, e.g. "missing" or "not a number". */
  reason: string;
}

/** What the section can honestly say about gh right now. */
export type ActionsHealth =
  | { state: 'ready' }
  | { state: 'no-remote' }
  | { state: 'missing' }
  | { state: 'logged-out' }
  | { state: 'rate-limited' }
  | { state: 'offline' }
  | { state: 'error'; detail: string };

export type ActionsWatchPhase =
  | 'idle'
  | 'discovering'
  | 'watching'
  | 'stopped';

export type ActionsWatchStop = 'complete' | 'no-runs' | 'cap' | 'released';

/** The watch, as much of it as the panel draws. */
export interface ActionsWatchView {
  phase: ActionsWatchPhase;
  /** The pushed commit being followed, null when idle. */
  sha: string | null;
  /** Why it stopped, null unless phase is 'stopped'. */
  stop: ActionsWatchStop | null;
}

/**
 * One repository's whole answer. `actions:runs` resolves with this AND the
 * `actions:changed` event carries it, so the renderer has one reducer and one
 * shape, whether the update was asked for or pushed.
 */
export interface ActionsUpdate {
  repoPath: string;
  /** The branch the list was read for, null when it could not be read. */
  branch: string | null;
  /** owner/repo, null when there is no github.com origin. */
  ownerRepo: string | null;
  runs: ActionsRun[];
  /** Epoch ms of the last completed read, null when nothing has been read. */
  lastCheckedAt: number | null;
  health: ActionsHealth;
  watch: ActionsWatchView;
  issues: ActionsParseIssue[];
}

export interface ActionsRunsInput {
  repoPath: string;
  /** Rows to ask for. Defaults to 10, clamped to 1..50. */
  limit?: number;
}

export interface ActionsJobsInput {
  repoPath: string;
  runId: number;
}

export interface ActionsJobsResult {
  repoPath: string;
  runId: number;
  jobs: ActionsJob[];
  issues: ActionsParseIssue[];
  health: ActionsHealth;
  lastCheckedAt: number | null;
}
