/**
 * gh's JSON, narrowed (Phase 46, spec section 3.8).
 *
 * Pure, and it takes `unknown`. Per the Phase 23 mechanical rule, a row that
 * is missing a field it needs is DROPPED WHOLE and the drop is reported with
 * the field named. It is never partially merged, never silently dropped and
 * never a crash.
 *
 * AN UNRECOGNIZED WORD IS NOT A MISSING FIELD. GitHub adds vocabulary, and a
 * run whose status is a word this build has never seen is still a run that
 * is happening. So the word is kept verbatim in `statusRaw`, the narrowed
 * value becomes 'unknown', and the panel draws the neutral icon and says the
 * word. Dropping the row instead would hide work that is really running.
 *
 * TIMESTAMPS. gh prints ISO strings and prints `0001-01-01T00:00:00Z` for a
 * timestamp that does not exist yet, which is what a queued run's
 * `startedAt` is. Everything before 1971 is therefore read as absent, and
 * the panel shows no duration rather than a duration of 55 years.
 *
 * STEP ORDER IS ARRAY ORDER. Measured on 2026-08-15 against a real run, the
 * step numbers went 1 to 8, then 15, 16, 17. Sorting by number would be
 * wrong and rendering the number as a position would be wrong.
 */

import type {
  ActionsConclusion,
  ActionsJob,
  ActionsParseIssue,
  ActionsRun,
  ActionsStatus,
  ActionsStep
} from '@shared/actions';

export interface ParsedRuns {
  runs: ActionsRun[];
  issues: ActionsParseIssue[];
}

export interface ParsedJobs {
  jobs: ActionsJob[];
  issues: ActionsParseIssue[];
}

/** The three lifecycle words this build narrows. Everything else is unknown. */
const STATUS_WORDS: ReadonlySet<string> = new Set([
  'queued',
  'in_progress',
  'completed'
]);

/** The nine outcome words this build narrows. Everything else is unknown. */
const CONCLUSION_WORDS: ReadonlySet<string> = new Set([
  'success',
  'failure',
  'cancelled',
  'skipped',
  'timed_out',
  'action_required',
  'neutral',
  'stale',
  'startup_failure'
]);

/** Anything earlier than this is gh's "no timestamp yet". */
const MIN_EPOCH_MS = Date.UTC(1971, 0, 1);

/** One row's refusal, thrown inside a row and caught by the row loop. */
class RowRefused extends Error {
  readonly field: string;
  readonly reason: string;

  constructor(field: string, reason: string) {
    super(`${field} ${reason}`);
    this.name = 'RowRefused';
    this.field = field;
    this.reason = reason;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  if (typeof value !== 'string') throw new RowRefused(field, 'is not a string');
  if (value.length === 0) throw new RowRefused(field, 'is empty');
  return value;
}

function requireNumber(row: Record<string, unknown>, field: string): number {
  const value = row[field];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RowRefused(field, 'is not a number');
  }
  return value;
}

function requireEpoch(row: Record<string, unknown>, field: string): number {
  const value = optionalEpoch(row[field]);
  if (value === null) throw new RowRefused(field, 'is not a date');
  return value;
}

function optionalString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function optionalNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** An ISO string to epoch milliseconds, or null when there is no timestamp. */
export function optionalEpoch(value: unknown): number | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms) || ms < MIN_EPOCH_MS) return null;
  return ms;
}

/** The status word, narrowed. The raw word travels beside it. */
export function narrowStatus(raw: string): ActionsStatus {
  return STATUS_WORDS.has(raw) ? (raw as ActionsStatus) : 'unknown';
}

/**
 * The conclusion word, narrowed. An empty string means the run has not
 * concluded, which is null and not 'unknown'.
 */
export function narrowConclusion(raw: unknown): {
  conclusion: ActionsConclusion | null;
  conclusionRaw: string | null;
} {
  if (typeof raw !== 'string' || raw.length === 0) {
    return { conclusion: null, conclusionRaw: null };
  }
  return {
    conclusion: CONCLUSION_WORDS.has(raw)
      ? (raw as ActionsConclusion)
      : 'unknown',
    conclusionRaw: raw
  };
}

/** `gh run list --json <RUN_LIST_FIELDS>` output, already JSON parsed. */
export function parseRunList(payload: unknown): ParsedRuns {
  if (!Array.isArray(payload)) {
    return {
      runs: [],
      issues: [{ kind: 'run', field: 'runs', reason: 'is not a list' }]
    };
  }

  const runs: ActionsRun[] = [];
  const issues: ActionsParseIssue[] = [];
  for (const entry of payload) {
    if (!isRecord(entry)) {
      issues.push({ kind: 'run', field: 'run', reason: 'is not an object' });
      continue;
    }
    try {
      runs.push(readRun(entry));
    } catch (err) {
      issues.push(issueFrom('run', err));
    }
  }
  return { runs, issues };
}

function readRun(row: Record<string, unknown>): ActionsRun {
  const statusRaw = requireString(row, 'status');
  const { conclusion, conclusionRaw } = narrowConclusion(row['conclusion']);
  return {
    id: requireNumber(row, 'databaseId'),
    number: optionalNumber(row['number'], 0),
    workflowName: requireString(row, 'workflowName'),
    displayTitle: optionalString(row['displayTitle'], ''),
    status: narrowStatus(statusRaw),
    statusRaw,
    conclusion,
    conclusionRaw,
    event: optionalString(row['event'], ''),
    headBranch: optionalString(row['headBranch'], ''),
    headSha: requireString(row, 'headSha'),
    createdAt: requireEpoch(row, 'createdAt'),
    startedAt: optionalEpoch(row['startedAt']),
    updatedAt: optionalEpoch(row['updatedAt']),
    url: requireString(row, 'url')
  };
}

/**
 * `gh run view <id> --json jobs,status,conclusion,url` output, already JSON
 * parsed. A bare array of jobs is accepted too, so a caller that already
 * reached into `.jobs` gets the same answer.
 */
export function parseRunJobs(payload: unknown): ParsedJobs {
  const list = isRecord(payload) ? payload['jobs'] : payload;
  if (!Array.isArray(list)) {
    return {
      jobs: [],
      issues: [{ kind: 'job', field: 'jobs', reason: 'is not a list' }]
    };
  }

  const jobs: ActionsJob[] = [];
  const issues: ActionsParseIssue[] = [];
  for (const entry of list) {
    if (!isRecord(entry)) {
      issues.push({ kind: 'job', field: 'job', reason: 'is not an object' });
      continue;
    }
    try {
      jobs.push(readJob(entry, issues));
    } catch (err) {
      issues.push(issueFrom('job', err));
    }
  }
  return { jobs, issues };
}

function readJob(
  row: Record<string, unknown>,
  issues: ActionsParseIssue[]
): ActionsJob {
  const statusRaw = requireString(row, 'status');
  const { conclusion, conclusionRaw } = narrowConclusion(row['conclusion']);
  const steps: ActionsStep[] = [];
  const rawSteps = row['steps'];
  if (Array.isArray(rawSteps)) {
    // Array order, never number order. See the module header.
    for (const entry of rawSteps) {
      if (!isRecord(entry)) {
        issues.push({ kind: 'step', field: 'step', reason: 'is not an object' });
        continue;
      }
      try {
        steps.push(readStep(entry));
      } catch (err) {
        issues.push(issueFrom('step', err));
      }
    }
  }
  return {
    id: requireNumber(row, 'databaseId'),
    name: requireString(row, 'name'),
    status: narrowStatus(statusRaw),
    statusRaw,
    conclusion,
    conclusionRaw,
    startedAt: optionalEpoch(row['startedAt']),
    completedAt: optionalEpoch(row['completedAt']),
    url: requireString(row, 'url'),
    steps
  };
}

function readStep(row: Record<string, unknown>): ActionsStep {
  const statusRaw = requireString(row, 'status');
  const { conclusion, conclusionRaw } = narrowConclusion(row['conclusion']);
  return {
    number: requireNumber(row, 'number'),
    name: requireString(row, 'name'),
    status: narrowStatus(statusRaw),
    statusRaw,
    conclusion,
    conclusionRaw,
    startedAt: optionalEpoch(row['startedAt']),
    completedAt: optionalEpoch(row['completedAt'])
  };
}

/** A caught row refusal, as the issue the panel reports. */
function issueFrom(
  kind: ActionsParseIssue['kind'],
  err: unknown
): ActionsParseIssue {
  if (err instanceof RowRefused) {
    return { kind, field: err.field, reason: err.reason };
  }
  return { kind, field: kind, reason: 'could not be read' };
}

/** JSON.parse that answers null rather than throwing. */
export function parseJsonOrNull(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}
