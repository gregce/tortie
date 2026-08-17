/**
 * Run hover card content (Phase 46.1). PURE.
 *
 * Every string the card can show is decided here, from the run row gh already
 * sent and the jobs already cached for it. Nothing in this file can start a
 * process, and __tests__/run-card-format.test.ts pins the exact strings and
 * every omission rule.
 *
 * The card shows no actor. gh's run list payload has no field naming a
 * person, and this phase does not widen the field list.
 */

import type { ActionsJob, ActionsRun } from '@shared/actions';
import { formatAbsolute, formatRelativeLong } from './format';
import {
  RUNS_JOBS_EMPTY,
  activityDuration,
  activityDurationText,
  activityTooltip,
  formatDurationLong,
  jobActivity,
  runActivity,
  runGlyph
} from './runs-format';
import type { RunGlyph } from './runs-format';

/** The Jobs block's one muted line when nothing has been read for the run. */
export const RUNS_CARD_JOBS_HINT = 'Expand the run to load its jobs.';

/** One row of the label and value grid. */
export interface RunCardField {
  label: string;
  value: string;
}

/** One line of the Jobs block, drawn from the cache and never from a read. */
export interface RunCardJobLine {
  /** The job's own id, for the React key. */
  key: number;
  glyph: RunGlyph;
  name: string;
  /** Compact duration, e.g. `48s`. Null when gh sent no timestamps. */
  duration: string | null;
}

export interface RunCardModel {
  /** The run's status glyph, same table as the row's. */
  glyph: RunGlyph;
  workflowName: string;
  /** Long relative age of createdAt, e.g. `3 hours ago`. */
  age: string;
  /** The full commit subject. Null when gh sent an empty title. */
  subject: string | null;
  /** The one sentence the row's tooltip used to say. */
  summary: string;
  /** Label and value rows. A row whose value is missing is not in the list. */
  fields: RunCardField[];
  /** Job lines from the cache. Empty when there is nothing to draw. */
  jobs: RunCardJobLine[];
  /** The muted line under `Jobs` when there are no job lines. Null otherwise. */
  jobsNote: string | null;
  /** The copy button's face, `#128`, or `Run URL` when gh sent no number. */
  copyLabel: string;
  /** `Run 128 of gates`, or the workflow name alone when the number is 0. */
  ariaLabel: string;
  url: string;
}

/**
 * Everything the card draws, in one shape.
 *
 * `cachedJobs` is the jobs already read for this run, or null when no read
 * has answered yet. The card never triggers a read. Null draws the hint line
 * and a cached empty list draws the same sentence the expanded run shows,
 * because expanding again would still find no jobs.
 */
export function runCardModel(
  run: ActionsRun,
  cachedJobs: readonly ActionsJob[] | null,
  nowMs: number
): RunCardModel {
  const activity = runActivity(run);

  const fields: RunCardField[] = [];
  if (run.number > 0) fields.push({ label: 'Run', value: `#${run.number}` });
  if (run.headBranch !== '') {
    fields.push({ label: 'Branch', value: run.headBranch });
  }
  if (run.event !== '') {
    // The exact event word gh printed, e.g. `push` or `workflow_dispatch`.
    fields.push({ label: 'Trigger', value: run.event });
  }
  if (run.startedAt !== null) {
    fields.push({ label: 'Started', value: formatAbsolute(run.startedAt) });
  }
  const tookMs = activityDuration(activity);
  if (run.status === 'completed' && tookMs !== null) {
    fields.push({ label: 'Duration', value: formatDurationLong(tookMs) });
  }

  const jobs: RunCardJobLine[] = (cachedJobs ?? []).map((job) => ({
    key: job.id,
    glyph: runGlyph(job.status, job.conclusion),
    name: job.name,
    duration: activityDurationText(jobActivity(job))
  }));
  const jobsNote =
    jobs.length > 0
      ? null
      : cachedJobs === null
        ? RUNS_CARD_JOBS_HINT
        : RUNS_JOBS_EMPTY;

  return {
    glyph: runGlyph(run.status, run.conclusion),
    workflowName: run.workflowName,
    age: formatRelativeLong(run.createdAt, nowMs),
    subject: run.displayTitle !== '' ? run.displayTitle : null,
    summary: activityTooltip(activity, nowMs),
    fields,
    jobs,
    jobsNote,
    copyLabel: run.number > 0 ? `#${run.number}` : 'Run URL',
    ariaLabel:
      run.number > 0
        ? `Run ${run.number} of ${run.workflowName}`
        : run.workflowName,
    url: run.url
  };
}
