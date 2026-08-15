/**
 * Phase 46 section 10.4. The Runs section's copy, pinned.
 *
 * Every sentence the section can say is asserted here character for character.
 * That is the point: a copy change should be a deliberate edit to two files,
 * not something that happens by accident while moving a component around.
 */

import { describe, expect, it } from 'vitest';
import type {
  ActionsConclusion,
  ActionsHealth,
  ActionsJob,
  ActionsRun,
  ActionsStatus,
  ActionsStep,
  ActionsWatchView
} from '@shared/actions';
import {
  RUNS_JOBS_FAILED,
  activityDuration,
  activityDurationText,
  activityTooltip,
  expandLabel,
  formatDuration,
  formatDurationLong,
  headerTooltip,
  healthNote,
  hiddenNotes,
  jobActivity,
  lastCheckedNote,
  runActivity,
  runGlyph,
  stepActivity,
  watchNote
} from '../runs-format';
import type { RunActivity } from '../runs-format';

const T = 1_700_000_000_000;
const MIN = 60_000;

function activity(patch: Partial<RunActivity>): RunActivity {
  return {
    name: 'gates',
    status: 'completed',
    statusRaw: 'completed',
    conclusion: 'success',
    conclusionRaw: 'success',
    startedAt: null,
    finishedAt: null,
    ...patch
  };
}

/** Completed `ago` milliseconds back, having taken `took` milliseconds. */
function finished(
  conclusion: ActionsConclusion,
  ago: number,
  took: number | null,
  conclusionRaw = conclusion as string
): RunActivity {
  const finishedAt = T - ago;
  return activity({
    conclusion,
    conclusionRaw,
    finishedAt,
    startedAt: took === null ? null : finishedAt - took
  });
}

function run(patch: Partial<ActionsRun>): ActionsRun {
  return {
    id: 42,
    number: 7,
    workflowName: 'gates',
    displayTitle: 'feat(scm): watch runs',
    status: 'completed',
    statusRaw: 'completed',
    conclusion: 'success',
    conclusionRaw: 'success',
    event: 'push',
    headBranch: 'main',
    headSha: 'abc123',
    createdAt: T - 5 * MIN,
    startedAt: T - 5 * MIN,
    updatedAt: T - 3 * MIN,
    url: 'https://github.com/o/r/actions/runs/42',
    ...patch
  };
}

// ---------------------------------------------------------------------------
// Icons and tones
// ---------------------------------------------------------------------------

describe('runGlyph', () => {
  it('covers all four statuses', () => {
    const table: [ActionsStatus, string, string, boolean][] = [
      ['queued', 'circle-large-outline', 'muted', false],
      ['in_progress', 'sync', 'working', true],
      ['completed', 'pass-filled', 'success', false],
      ['unknown', 'circle-large-outline', 'muted', false]
    ];
    for (const [status, name, tone, spin] of table) {
      expect(runGlyph(status, 'success')).toEqual({ name, tone, spin });
    }
  });

  it('covers all ten conclusions plus the absent one', () => {
    const table: [ActionsConclusion | null, string, string][] = [
      ['success', 'pass-filled', 'success'],
      ['failure', 'error', 'error'],
      ['cancelled', 'circle-slash', 'muted'],
      ['skipped', 'debug-step-over', 'muted'],
      ['timed_out', 'clock', 'error'],
      ['action_required', 'warning', 'warning'],
      ['neutral', 'circle-large-outline', 'muted'],
      ['stale', 'circle-large-outline', 'muted'],
      ['startup_failure', 'circle-large-outline', 'muted'],
      ['unknown', 'circle-large-outline', 'muted'],
      [null, 'circle-large-outline', 'muted']
    ];
    for (const [conclusion, name, tone] of table) {
      expect(runGlyph('completed', conclusion)).toEqual({
        name,
        tone,
        spin: false
      });
    }
  });

  it('lets status win while the run is not finished', () => {
    // A run still going carries no conclusion, and a stale one must not be
    // allowed to draw a finished icon over a running row.
    expect(runGlyph('in_progress', 'failure').name).toBe('sync');
    expect(runGlyph('queued', 'failure').tone).toBe('muted');
  });
});

// ---------------------------------------------------------------------------
// Durations
// ---------------------------------------------------------------------------

describe('formatDuration', () => {
  it('matches the six measured points', () => {
    expect(formatDuration(0)).toBe('0s');
    expect(formatDuration(1000)).toBe('1s');
    expect(formatDuration(48_000)).toBe('48s');
    expect(formatDuration(222_000)).toBe('3m 42s');
    expect(formatDuration(3_840_000)).toBe('1h 04m');
    expect(formatDuration(3_900_000)).toBe('1h 05m');
  });

  it('pads the second part so a column lines up', () => {
    expect(formatDuration(185_000)).toBe('3m 05s');
  });
});

describe('formatDurationLong', () => {
  it('reads as words inside a sentence', () => {
    expect(formatDurationLong(0)).toBe('0 seconds');
    expect(formatDurationLong(1000)).toBe('1 second');
    expect(formatDurationLong(48_000)).toBe('48 seconds');
    expect(formatDurationLong(222_000)).toBe('3 minutes 42 seconds');
    expect(formatDurationLong(3_840_000)).toBe('1 hour 4 minutes');
    expect(formatDurationLong(3_900_000)).toBe('1 hour 5 minutes');
  });

  it('drops a zero remainder', () => {
    expect(formatDurationLong(180_000)).toBe('3 minutes');
    expect(formatDurationLong(3_600_000)).toBe('1 hour');
  });
});

describe('activityDuration', () => {
  it('is null when either end is missing', () => {
    expect(activityDuration(activity({ startedAt: T, finishedAt: null }))).toBe(
      null
    );
    expect(activityDuration(activity({ startedAt: null, finishedAt: T }))).toBe(
      null
    );
    expect(activityDurationText(activity({ startedAt: null }))).toBe(null);
  });

  it('measures both ends when they are there', () => {
    expect(
      activityDurationText(activity({ startedAt: T - 222_000, finishedAt: T }))
    ).toBe('3m 42s');
  });
});

// ---------------------------------------------------------------------------
// The ten row sentences
// ---------------------------------------------------------------------------

describe('activityTooltip', () => {
  it('says the ten shapes exactly', () => {
    expect(activityTooltip(finished('success', 3 * MIN, 222_000), T)).toBe(
      'gates succeeded 3 minutes ago and took 3 minutes 42 seconds.'
    );
    expect(activityTooltip(finished('failure', 3 * MIN, 130_000), T)).toBe(
      'gates failed 3 minutes ago after 2 minutes 10 seconds.'
    );
    expect(activityTooltip(finished('cancelled', 3 * MIN, 9000), T)).toBe(
      'gates was cancelled 3 minutes ago.'
    );
    expect(activityTooltip(finished('skipped', 3 * MIN, null), T)).toBe(
      'gates was skipped 3 minutes ago.'
    );
    expect(activityTooltip(finished('timed_out', 3 * MIN, 25 * MIN), T)).toBe(
      'gates ran out of time after 25 minutes.'
    );
    expect(
      activityTooltip(finished('action_required', 3 * MIN, 1000), T)
    ).toBe('gates needs someone to act on GitHub.');
    expect(
      activityTooltip(finished('unknown', 3 * MIN, null, 'flaky'), T)
    ).toBe('gates finished 3 minutes ago and reports "flaky".');
    expect(
      activityTooltip(
        activity({ status: 'in_progress', startedAt: T - 80_000 }),
        T
      )
    ).toBe('gates has been running for 1 minute 20 seconds.');
    expect(activityTooltip(activity({ status: 'queued' }), T)).toBe(
      'gates is queued.'
    );
    expect(
      activityTooltip(
        activity({ status: 'unknown', statusRaw: 'waiting' }),
        T
      )
    ).toBe('gates reports the state "waiting".');
  });

  it('uses the same sentences for a job and for a step', () => {
    const step: ActionsStep = {
      number: 15,
      name: 'Run npm test',
      status: 'completed',
      statusRaw: 'completed',
      conclusion: 'success',
      conclusionRaw: 'success',
      startedAt: T - 3 * MIN - 222_000,
      completedAt: T - 3 * MIN
    };
    const job: ActionsJob = {
      id: 9,
      name: 'build',
      status: 'completed',
      statusRaw: 'completed',
      conclusion: 'failure',
      conclusionRaw: 'failure',
      startedAt: T - 3 * MIN - 130_000,
      completedAt: T - 3 * MIN,
      url: 'https://github.com/o/r/actions/runs/42/job/9',
      steps: [step]
    };
    expect(activityTooltip(jobActivity(job), T)).toBe(
      'build failed 3 minutes ago after 2 minutes 10 seconds.'
    );
    expect(activityTooltip(stepActivity(step), T)).toBe(
      'Run npm test succeeded 3 minutes ago and took 3 minutes 42 seconds.'
    );
  });

  it('falls back rather than inventing a time it was not given', () => {
    expect(
      activityTooltip(activity({ status: 'in_progress', startedAt: null }), T)
    ).toBe('gates is running now.');
    expect(
      activityTooltip(
        activity({ conclusion: 'success', finishedAt: null, startedAt: null }),
        T
      )
    ).toBe('gates succeeded.');
  });
});

describe('runActivity', () => {
  it('treats the last update as the finish, and only once finished', () => {
    expect(runActivity(run({})).finishedAt).toBe(T - 3 * MIN);
    expect(
      runActivity(run({ status: 'in_progress', conclusion: null })).finishedAt
    ).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// The header, the caption, the ladder, the watch, the dropped rows
// ---------------------------------------------------------------------------

describe('headerTooltip', () => {
  it('speaks about the branch, not about one workflow', () => {
    expect(headerTooltip(run({}))).toBe(
      'The latest run for this branch succeeded.'
    );
    expect(
      headerTooltip(run({ conclusion: 'failure', conclusionRaw: 'failure' }))
    ).toBe('The latest run for this branch failed.');
    expect(
      headerTooltip(run({ conclusion: 'cancelled', conclusionRaw: 'cancelled' }))
    ).toBe('The latest run for this branch was cancelled.');
    expect(
      headerTooltip(run({ status: 'in_progress', statusRaw: 'in_progress' }))
    ).toBe('A run for this branch is running now.');
    expect(headerTooltip(run({ status: 'queued', statusRaw: 'queued' }))).toBe(
      'A run for this branch is queued.'
    );
    expect(
      headerTooltip(run({ conclusion: 'unknown', conclusionRaw: 'flaky' }))
    ).toBe('The latest run for this branch reports "flaky".');
    expect(
      headerTooltip(run({ status: 'unknown', statusRaw: 'waiting' }))
    ).toBe('The latest run for this branch reports "waiting".');
  });
});

describe('lastCheckedNote', () => {
  it('has exactly two states', () => {
    expect(lastCheckedNote(null, T)).toBe('Not checked yet.');
    expect(lastCheckedNote(T - 3 * MIN, T)).toBe('Last checked 3 minutes ago.');
  });
});

describe('healthNote', () => {
  it('says one quiet line per rung', () => {
    const table: [ActionsHealth, string | null][] = [
      [{ state: 'ready' }, null],
      [{ state: 'no-remote' }, null],
      [
        { state: 'missing' },
        'Runs need the GitHub CLI. Install gh to see them here.'
      ],
      [{ state: 'logged-out' }, 'Sign in with gh auth login to see runs.'],
      [
        { state: 'rate-limited' },
        'GitHub is limiting requests. Runs will refresh when the limit resets.'
      ],
      [{ state: 'offline' }, 'Could not reach GitHub.'],
      [{ state: 'error', detail: 'boom' }, RUNS_JOBS_FAILED]
    ];
    for (const [health, line] of table) {
      expect(healthNote(health)?.line ?? null).toBe(line);
    }
  });

  it("carries gh's own words, capped at 200 characters", () => {
    const long = 'x'.repeat(500);
    const note = healthNote({ state: 'error', detail: long });
    expect(note?.detail?.length).toBe(200);
    expect(healthNote({ state: 'error', detail: '' })?.detail).toBe(null);
  });
});

describe('watchNote', () => {
  it('says something only while there is something to say', () => {
    const w = (
      phase: ActionsWatchView['phase'],
      stop: ActionsWatchView['stop'] = null
    ): ActionsWatchView => ({ phase, sha: 'abc123', stop });
    expect(watchNote(w('idle'))).toBe(null);
    expect(watchNote(w('discovering'))).toBe(
      'Watching for a run to start after your push.'
    );
    expect(watchNote(w('watching'))).toBe(
      'Watching this push. Checking every 5 seconds.'
    );
    expect(watchNote(w('stopped', 'no-runs'))).toBe(
      'No run started for that push in the first 2 minutes.'
    );
    expect(watchNote(w('stopped', 'cap'))).toBe(
      'Stopped watching after 30 minutes. Use refresh to check again.'
    );
    // A watch that ended because everything finished says nothing at all.
    // The rows carry that answer already.
    expect(watchNote(w('stopped', 'complete'))).toBe(null);
    expect(watchNote(w('stopped', 'released'))).toBe(null);
  });
});

describe('hiddenNotes', () => {
  it('names the count and the field, one line per kind', () => {
    expect(
      hiddenNotes([{ kind: 'run', field: 'databaseId', reason: 'missing' }])
    ).toEqual(['One run was hidden. GitHub did not send its databaseId.']);
    expect(
      hiddenNotes([
        { kind: 'run', field: 'url', reason: 'empty' },
        { kind: 'run', field: 'databaseId', reason: 'missing' }
      ])
    ).toEqual(['2 runs were hidden. The first was missing its url.']);
    expect(
      hiddenNotes([{ kind: 'job', field: 'name', reason: 'missing' }])
    ).toEqual(['One job was hidden. GitHub did not send its name.']);
    expect(
      hiddenNotes([
        { kind: 'job', field: 'name', reason: 'missing' },
        { kind: 'step', field: 'status', reason: 'missing' }
      ])
    ).toEqual([
      'One job was hidden. GitHub did not send its name.',
      'One step was hidden. GitHub did not send its status.'
    ]);
    expect(hiddenNotes([])).toEqual([]);
  });
});

describe('expandLabel', () => {
  it('names the workflow and the run number', () => {
    expect(expandLabel(run({}), false)).toBe('Show jobs for gates run 7');
    expect(expandLabel(run({}), true)).toBe('Hide jobs for gates run 7');
  });

  it('drops a number the parser had to invent', () => {
    // The parser falls back to 0 when gh did not send one, and a label
    // reading "run 0" would name a number the user can find nowhere.
    expect(expandLabel(run({ number: 0 }), false)).toBe(
      'Show jobs for gates'
    );
  });
});
