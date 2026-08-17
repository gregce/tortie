/**
 * The jobs and steps under an expanded run (Phase 46).
 *
 * Steps render in ARRAY ORDER and never in number order. The numbers gh sends
 * are not contiguous: the run measured for the spec went 1 to 8, then 15, 16,
 * 17. Sorting by number would be a guess, and reordering by it would put the
 * steps in an order the workflow never ran them in.
 *
 * A job or a step whose timestamps gh did not send shows no duration at all,
 * rather than a zero that would claim it took no time.
 *
 * A run with exactly one job skips that job's row (Phase 46.1). The run row
 * above already carries the same status, so the steps lift one level and
 * take the indent the job row occupied. soloJob in runs-format decides, and
 * its tests pin the rules.
 */

import React from 'react';
import type { ActionsJob, ActionsRun, ActionsStep } from '@shared/actions';
import { useApp } from '../state/store';
import type { MenuItemSpec } from '../state/store';
import { useRuns, runsRepoState } from './runs';
import {
  RUNS_JOBS_EMPTY,
  RUNS_JOBS_FAILED,
  RUNS_JOBS_LOADING,
  activityDurationText,
  activityTooltip,
  healthNote,
  hiddenNotes,
  jobActivity,
  runGlyph,
  soloJob,
  stepActivity
} from './runs-format';
import { RunStatusIcon, copyUrl, openOnGitHub } from './RunRow';

/**
 * The two verbs a job row and a step row share.
 *
 * A step has no URL of its own in the API, so a step's menu says job and means
 * job. Naming it "step" and opening the job page would be the menu lying about
 * where it is taking you.
 */
function jobMenuItems(job: ActionsJob): MenuItemSpec[] {
  return [
    { label: 'Open on GitHub', run: () => openOnGitHub(job.url) },
    { label: 'Copy job URL', run: () => copyUrl(job.url, 'Job URL copied.') }
  ];
}

function StepRow({
  step,
  job,
  now,
  lifted = false
}: {
  step: ActionsStep;
  /** The step's own job, kept even when lifted so the menu's verbs still
      open and copy the job page. */
  job: ActionsJob;
  now: number;
  /** True when the run's one job row is skipped and the steps take its place. */
  lifted?: boolean;
}): React.JSX.Element {
  const setMenu = useApp((s) => s.setMenu);
  const activity = stepActivity(step);
  const duration = activityDurationText(activity);
  return (
    <div
      className={`runs-step${lifted ? ' lifted' : ''}`}
      title={activityTooltip(activity, now)}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setMenu({ x: e.clientX, y: e.clientY, items: jobMenuItems(job) });
      }}
    >
      <RunStatusIcon glyph={runGlyph(step.status, step.conclusion)} />
      <span className="runs-step-name">{step.name}</span>
      <span className="runs-space" />
      {duration !== null ? (
        <span className="runs-dur num">{duration}</span>
      ) : null}
    </div>
  );
}

function JobBlock({
  job,
  now
}: {
  job: ActionsJob;
  now: number;
}): React.JSX.Element {
  const setMenu = useApp((s) => s.setMenu);
  const activity = jobActivity(job);
  const duration = activityDurationText(activity);
  return (
    <div className="runs-job-block">
      <div
        className="runs-job"
        title={activityTooltip(activity, now)}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenu({ x: e.clientX, y: e.clientY, items: jobMenuItems(job) });
        }}
      >
        <RunStatusIcon glyph={runGlyph(job.status, job.conclusion)} />
        <span className="runs-job-name">{job.name}</span>
        <span className="runs-space" />
        {duration !== null ? (
          <span className="runs-dur num">{duration}</span>
        ) : null}
      </div>
      {job.steps.map((step, i) => (
        <StepRow key={`${step.number}-${i}`} step={step} job={job} now={now} />
      ))}
    </div>
  );
}

export function RunJobs({
  repoPath,
  run,
  now
}: {
  repoPath: string;
  run: ActionsRun;
  now: number;
}): React.JSX.Element {
  const record = useRuns((s) => runsRepoState(s.repos, repoPath));
  const jobs = record.jobs[run.id];
  const result = jobs?.result ?? null;

  if (result === null) {
    // A failed read is not an empty run. The channel itself did not answer,
    // so the line says that and nothing about what the run contains.
    return (
      <div className="runs-jobs">
        <div className="runs-note">
          {jobs?.failed === true ? RUNS_JOBS_FAILED : RUNS_JOBS_LOADING}
        </div>
      </div>
    );
  }

  const health = healthNote(result.health);
  const hidden = hiddenNotes(result.issues);
  const solo = soloJob(result.jobs);

  return (
    <div className="runs-jobs">
      {health !== null ? (
        <div className="runs-note">
          {health.line}
          {health.detail !== null ? (
            <span className="runs-note-detail">{health.detail}</span>
          ) : null}
        </div>
      ) : null}
      {result.jobs.length === 0 && health === null ? (
        <div className="runs-note">{RUNS_JOBS_EMPTY}</div>
      ) : solo !== null ? (
        solo.steps.map((step, i) => (
          <StepRow
            key={`${step.number}-${i}`}
            step={step}
            job={solo}
            now={now}
            lifted
          />
        ))
      ) : (
        result.jobs.map((job) => <JobBlock key={job.id} job={job} now={now} />)
      )}
      {hidden.map((line) => (
        <div className="runs-note" key={line}>
          {line}
        </div>
      ))}
    </div>
  );
}
