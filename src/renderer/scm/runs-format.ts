/**
 * Runs section formatting (Phase 46). PURE.
 *
 * No React, no bridge, no clock of its own: every function here takes the data
 * and, where time matters, the instant to measure against. Every sentence the
 * Runs section can say is written once in this file, so a copy change is a
 * diff in one place and __tests__/runs-format.test.ts pins the exact strings.
 *
 * The icon and token table is the spec's, and it is the only place a run state
 * turns into something visible. Colours are CLASS names here (tone-success,
 * tone-error) and tokens in runs.css. The UI rule is tokens only, and a
 * pure module cannot read a token.
 */

import type {
  ActionsConclusion,
  ActionsHealth,
  ActionsJob,
  ActionsParseIssue,
  ActionsRun,
  ActionsStatus,
  ActionsStep,
  ActionsWatchView
} from '@shared/actions';
import { formatRelative, formatRelativeLong } from './format';

// ---------------------------------------------------------------------------
// Fixed copy
// ---------------------------------------------------------------------------

/** First read in flight, nothing on screen yet. */
export const RUNS_LOOKING = 'Looking for runs.';

/** A read came back with zero rows. gh prints `[]` and exits 0 for this. */
export const RUNS_EMPTY = 'No runs for this branch yet.';

/** A run was expanded and its jobs read is in flight. */
export const RUNS_JOBS_LOADING = 'Loading jobs.';

/** A run whose jobs read came back with zero jobs. */
export const RUNS_JOBS_EMPTY = 'This run has no jobs yet.';

/**
 * The last rung of the degrade ladder, and also what a jobs read that never
 * answered says. One string, because the two are the same fact to the reader:
 * the request did not come back and the panel is not going to guess.
 */
export const RUNS_JOBS_FAILED = 'GitHub could not answer that request.';

/** Nothing has been read for this repository yet. */
export const RUNS_NOT_CHECKED = 'Not checked yet.';

/** gh's own words are shown, but never more than this many characters. */
export const DETAIL_MAX = 200;

// ---------------------------------------------------------------------------
// Icons and tones
// ---------------------------------------------------------------------------

/**
 * The five tones a run state can draw in. Each maps to exactly one token in
 * runs.css: muted → --text-muted, working → --status-working, success →
 * --success, error → --error, warning → --warning.
 *
 * Nothing here uses --status-attention. That yellow means "a session needs
 * you", and a failing workflow run is not a session.
 */
export type RunTone = 'muted' | 'working' | 'success' | 'error' | 'warning';

export interface RunGlyph {
  /** Codicon id, without the `codicon-` prefix. */
  name: string;
  tone: RunTone;
  /** True for the one state that spins, being a run that is under way. */
  spin: boolean;
}

const GLYPH_MUTED: RunGlyph = {
  name: 'circle-large-outline',
  tone: 'muted',
  spin: false
};

/**
 * Icon and tone for one run, job or step.
 *
 * Status decides while the thing is not finished. Conclusion decides once it
 * is. A word we do not recognise draws the neutral glyph rather than guessing,
 * and the tooltip says the word out loud.
 */
export function runGlyph(
  status: ActionsStatus,
  conclusion: ActionsConclusion | null
): RunGlyph {
  if (status === 'in_progress') {
    return { name: 'sync', tone: 'working', spin: true };
  }
  if (status !== 'completed') {
    // 'queued' and 'unknown' both rest here.
    return GLYPH_MUTED;
  }
  switch (conclusion) {
    case 'success':
      return { name: 'pass-filled', tone: 'success', spin: false };
    case 'failure':
      return { name: 'error', tone: 'error', spin: false };
    case 'timed_out':
      return { name: 'clock', tone: 'error', spin: false };
    case 'cancelled':
      return { name: 'circle-slash', tone: 'muted', spin: false };
    case 'skipped':
      return { name: 'debug-step-over', tone: 'muted', spin: false };
    case 'action_required':
      return { name: 'warning', tone: 'warning', spin: false };
    default:
      // neutral, stale, startup_failure, unknown and null.
      return GLYPH_MUTED;
  }
}

// ---------------------------------------------------------------------------
// Durations
// ---------------------------------------------------------------------------

/**
 * Compact duration for a row: `48s`, `3m 42s`, `1h 04m`.
 *
 * Minutes and hours pad their second part to two digits so a column of rows
 * lines up. Anything below one second reads `0s` rather than an empty cell.
 */
export function formatDuration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${String(minutes % 60).padStart(2, '0')}m`;
}

/**
 * The run row's age, reading as an age: `4m ago`, `3h ago`, `2d ago`
 * (Phase 46.1). A bare `3h` next to a bare `5m 24s` left the reader to guess
 * which figure was the age and which the duration. This wraps formatRelative
 * so the two never drift. The under one minute case stays the single word
 * `now`, because "now ago" is not English.
 */
export function formatAgeShort(epochMs: number, nowMs: number): string {
  const rel = formatRelative(epochMs, nowMs);
  return rel === 'now' ? rel : `${rel} ago`;
}

/** "1 second" / "3 seconds", and the same for minutes and hours. */
function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/**
 * The same duration inside a sentence: `48 seconds`, `3 minutes 42 seconds`,
 * `1 hour 4 minutes`. A zero remainder is dropped, so 180 seconds reads
 * `3 minutes` rather than `3 minutes 0 seconds`.
 */
export function formatDurationLong(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return plural(seconds, 'second');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const rest = seconds % 60;
    return rest === 0
      ? plural(minutes, 'minute')
      : `${plural(minutes, 'minute')} ${plural(rest, 'second')}`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0
    ? plural(hours, 'hour')
    : `${plural(hours, 'hour')} ${plural(rest, 'minute')}`;
}

// ---------------------------------------------------------------------------
// One shape for a run, a job and a step
// ---------------------------------------------------------------------------

/**
 * What a tooltip needs, whichever of the three rows it is describing.
 *
 * The spec writes ten sentences for a run and says a job and a step use the
 * same ten with their own name. One shape and one function is how that stays
 * true, instead of three copies that drift.
 */
export interface RunActivity {
  name: string;
  status: ActionsStatus;
  statusRaw: string;
  conclusion: ActionsConclusion | null;
  conclusionRaw: string | null;
  startedAt: number | null;
  /** When it finished. Null while it is still going. */
  finishedAt: number | null;
}

export function runActivity(run: ActionsRun): RunActivity {
  return {
    name: run.workflowName,
    status: run.status,
    statusRaw: run.statusRaw,
    conclusion: run.conclusion,
    conclusionRaw: run.conclusionRaw,
    startedAt: run.startedAt,
    // A run has no completedAt of its own. Once it is finished, the last
    // update IS the finish, which is what gh's own run list shows.
    finishedAt: run.status === 'completed' ? run.updatedAt : null
  };
}

export function jobActivity(job: ActionsJob): RunActivity {
  return {
    name: job.name,
    status: job.status,
    statusRaw: job.statusRaw,
    conclusion: job.conclusion,
    conclusionRaw: job.conclusionRaw,
    startedAt: job.startedAt,
    finishedAt: job.completedAt
  };
}

export function stepActivity(step: ActionsStep): RunActivity {
  return {
    name: step.name,
    status: step.status,
    statusRaw: step.statusRaw,
    conclusion: step.conclusion,
    conclusionRaw: step.conclusionRaw,
    startedAt: step.startedAt,
    finishedAt: step.completedAt
  };
}

/**
 * How long it took, in milliseconds, or null when either end is missing.
 *
 * A step whose timestamps gh did not send shows no duration at all. Showing a
 * zero there would claim it took no time.
 */
export function activityDuration(a: RunActivity): number | null {
  if (a.startedAt === null || a.finishedAt === null) return null;
  return Math.max(0, a.finishedAt - a.startedAt);
}

/** The compact duration for a row, or null when there is nothing to say. */
export function activityDurationText(a: RunActivity): string | null {
  const ms = activityDuration(a);
  return ms === null ? null : formatDuration(ms);
}

/**
 * The one job whose own row can be skipped (Phase 46.1).
 *
 * A run with exactly one job draws that job's row as a repeat: the run row
 * above already carries the same status, and the hover card names the job.
 * When this answers with a job, RunJobs lifts its steps one level and draws
 * no job row. Null means draw every job as usual.
 *
 * A single job with zero steps stays a row, because collapsing it would
 * leave nothing under the run row at all.
 */
export function soloJob(jobs: readonly ActionsJob[]): ActionsJob | null {
  const only = jobs.length === 1 ? jobs[0] : undefined;
  if (only === undefined) return null;
  return only.steps.length > 0 ? only : null;
}

// ---------------------------------------------------------------------------
// Sentences
// ---------------------------------------------------------------------------

/** " 3 minutes ago", or the empty string when the finish time is unknown. */
function agoPart(finishedAt: number | null, nowMs: number): string {
  return finishedAt === null ? '' : ` ${formatRelativeLong(finishedAt, nowMs)}`;
}

/**
 * The row tooltip. Ten sentences, one per shape the data can take, plus the
 * stated fallbacks for a row whose timestamps gh did not send.
 */
export function activityTooltip(a: RunActivity, nowMs: number): string {
  const ago = agoPart(a.finishedAt, nowMs);
  const ms = activityDuration(a);
  const took = ms === null ? null : formatDurationLong(ms);

  if (a.status === 'queued') return `${a.name} is queued.`;
  if (a.status === 'in_progress') {
    if (a.startedAt === null) return `${a.name} is running now.`;
    const running = formatDurationLong(Math.max(0, nowMs - a.startedAt));
    return `${a.name} has been running for ${running}.`;
  }
  if (a.status !== 'completed') {
    return `${a.name} reports the state "${a.statusRaw}".`;
  }

  switch (a.conclusion) {
    case 'success':
      return took === null
        ? `${a.name} succeeded${ago}.`
        : `${a.name} succeeded${ago} and took ${took}.`;
    case 'failure':
      return took === null
        ? `${a.name} failed${ago}.`
        : `${a.name} failed${ago} after ${took}.`;
    case 'cancelled':
      return `${a.name} was cancelled${ago}.`;
    case 'skipped':
      return `${a.name} was skipped${ago}.`;
    case 'timed_out':
      return took === null
        ? `${a.name} ran out of time.`
        : `${a.name} ran out of time after ${took}.`;
    case 'action_required':
      return `${a.name} needs someone to act on GitHub.`;
    default:
      return a.conclusionRaw === null
        ? `${a.name} finished${ago}.`
        : `${a.name} finished${ago} and reports "${a.conclusionRaw}".`;
  }
}

/**
 * The header icon's tooltip. It speaks about the branch rather than about one
 * workflow, because the header carries one icon for a list of rows.
 */
export function headerTooltip(latest: ActionsRun): string {
  if (latest.status === 'queued') return 'A run for this branch is queued.';
  if (latest.status === 'in_progress') {
    return 'A run for this branch is running now.';
  }
  if (latest.status === 'completed') {
    if (latest.conclusion === 'success') {
      return 'The latest run for this branch succeeded.';
    }
    if (latest.conclusion === 'failure') {
      return 'The latest run for this branch failed.';
    }
    if (latest.conclusion === 'cancelled') {
      return 'The latest run for this branch was cancelled.';
    }
    const word = latest.conclusionRaw ?? latest.statusRaw;
    return `The latest run for this branch reports "${word}".`;
  }
  return `The latest run for this branch reports "${latest.statusRaw}".`;
}

/** "Last checked 3 minutes ago." or "Not checked yet." */
export function lastCheckedNote(
  lastCheckedAt: number | null,
  nowMs: number
): string {
  if (lastCheckedAt === null) return RUNS_NOT_CHECKED;
  return `Last checked ${formatRelativeLong(lastCheckedAt, nowMs)}.`;
}

/** One line of the degrade ladder, plus gh's own words when we have them. */
export interface RunsHealthNote {
  line: string;
  /** gh's first stderr line, capped. Null unless the rung carries one. */
  detail: string | null;
}

/**
 * What the section says about gh right now. Null means there is nothing to
 * say, which is the ready rung and the no-remote rung (that one has no
 * section at all).
 */
export function healthNote(health: ActionsHealth): RunsHealthNote | null {
  switch (health.state) {
    case 'ready':
    case 'no-remote':
      return null;
    case 'missing':
      return {
        line: 'Runs need the GitHub CLI. Install gh to see them here.',
        detail: null
      };
    case 'logged-out':
      return { line: 'Sign in with gh auth login to see runs.', detail: null };
    case 'rate-limited':
      return {
        line: 'GitHub is limiting requests. Runs will refresh when the limit resets.',
        detail: null
      };
    case 'offline':
      return { line: 'Could not reach GitHub.', detail: null };
    case 'error': {
      const detail = health.detail.slice(0, DETAIL_MAX);
      return { line: RUNS_JOBS_FAILED, detail: detail.length > 0 ? detail : null };
    }
  }
}

/**
 * What the watch is doing, in one line, or null when there is nothing worth
 * saying. A watch that ended because everything finished says nothing at all:
 * the rows themselves carry that answer.
 *
 * The 5 seconds and the 2 minutes and the 30 minutes are main's own numbers
 * (POLL_INTERVAL_MS, DISCOVER_GIVE_UP_MS, HARD_CAP_MS). If those move, these
 * sentences move with them.
 */
export function watchNote(watch: ActionsWatchView): string | null {
  if (watch.phase === 'discovering') {
    return 'Watching for a run to start after your push.';
  }
  if (watch.phase === 'watching') {
    return 'Watching this push. Checking every 5 seconds.';
  }
  if (watch.phase === 'stopped') {
    if (watch.stop === 'no-runs') {
      return 'No run started for that push in the first 2 minutes.';
    }
    if (watch.stop === 'cap') {
      return 'Stopped watching after 30 minutes. Use refresh to check again.';
    }
  }
  return null;
}

const ISSUE_NOUNS: Record<ActionsParseIssue['kind'], [string, string]> = {
  run: ['run', 'runs'],
  job: ['job', 'jobs'],
  step: ['step', 'steps']
};

/**
 * One line per kind of row the parser refused, naming the count and the field
 * that made it refuse.
 *
 * A dropped row is never silent (the Phase 23 mechanical rule) and never a
 * crash. The user is told something is missing and told which field, which is
 * the only thing that makes a gh field rename debuggable from the panel.
 */
export function hiddenNotes(issues: readonly ActionsParseIssue[]): string[] {
  const out: string[] = [];
  for (const kind of ['run', 'job', 'step'] as const) {
    const mine = issues.filter((i) => i.kind === kind);
    const first = mine[0];
    if (first === undefined) continue;
    const [one, many] = ISSUE_NOUNS[kind];
    out.push(
      mine.length === 1
        ? `One ${one} was hidden. GitHub did not send its ${first.field}.`
        : `${mine.length} ${many} were hidden. The first was missing its ${first.field}.`
    );
  }
  return out;
}

/**
 * The expand toggle's label. A run whose number gh did not send falls back to
 * 0 in the parser, and a label reading "run 0" would be a number the user can
 * find nowhere, so that row's label names the workflow alone.
 */
export function expandLabel(run: ActionsRun, expanded: boolean): string {
  const verb = expanded ? 'Hide' : 'Show';
  return run.number > 0
    ? `${verb} jobs for ${run.workflowName} run ${run.number}`
    : `${verb} jobs for ${run.workflowName}`;
}

/**
 * The label of a row that OPENS the run rather than expanding it (Phase 105).
 *
 * The Runs group for a folder on another machine draws no jobs, because reading
 * them is a second channel and a second gh process for every row. So the row
 * sends the person to github.com, and its label has to say that rather than
 * promising an expander that is not there. The number is dropped for the same
 * reason `expandLabel` drops it, being that the parser falls back to 0 when gh
 * did not send one and "run 0" names a number nobody can find.
 */
export function openLabel(run: ActionsRun): string {
  return run.number > 0
    ? `Open ${run.workflowName} run ${run.number} on GitHub`
    : `Open ${run.workflowName} on GitHub`;
}
