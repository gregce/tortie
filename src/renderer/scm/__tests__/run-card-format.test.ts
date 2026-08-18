/**
 * Phase 46.1. The run hover card's content, pinned.
 *
 * runCardModel is the only place the card's strings and omission rules are
 * decided, so every rule is asserted here. The unit tests run under node with
 * no DOM, which is exactly why the card's decisions live in a pure module and
 * RunHoverCard.tsx carries wiring only.
 *
 * The Started value goes through toLocaleString, which depends on the
 * machine's locale. Those assertions compare against formatAbsolute's own
 * answer for the same instant instead of a literal, so the test pins the
 * source of the value without pinning the machine.
 */

import { describe, expect, it } from 'vitest';
import type { ActionsJob, ActionsRun } from '@shared/actions';
import { formatAbsolute } from '../format';
import { runGlyph } from '../runs-format';
import { RUNS_CARD_JOBS_HINT, runCardModel } from '../run-card-format';

const T = 1_700_000_000_000;
const MIN = 60_000;
const HOUR = 60 * MIN;

function run(patch: Partial<ActionsRun>): ActionsRun {
  return {
    id: 42,
    number: 128,
    workflowName: 'gates',
    displayTitle: 'feat(scm): watch runs',
    status: 'completed',
    statusRaw: 'completed',
    conclusion: 'success',
    conclusionRaw: 'success',
    event: 'push',
    headBranch: 'main',
    headSha: 'abc123',
    createdAt: T - 3 * HOUR,
    startedAt: T - 10 * MIN,
    updatedAt: T - 5 * MIN,
    url: 'https://github.com/o/r/actions/runs/42',
    ...patch
  };
}

function job(patch: Partial<ActionsJob>): ActionsJob {
  return {
    id: 9001,
    name: 'build',
    status: 'completed',
    statusRaw: 'completed',
    conclusion: 'success',
    conclusionRaw: 'success',
    startedAt: T - 10 * MIN,
    completedAt: T - 10 * MIN + 48_000,
    url: 'https://github.com/o/r/actions/runs/42/job/9001',
    steps: [],
    ...patch
  };
}

describe('runCardModel, a completed run', () => {
  const model = runCardModel(run({}), null, T);

  it('heads with the glyph, the name and the long age', () => {
    expect(model.glyph).toEqual(runGlyph('completed', 'success'));
    expect(model.workflowName).toBe('gates');
    expect(model.age).toBe('3 hours ago');
  });

  it('carries the full subject and the summary sentence', () => {
    expect(model.subject).toBe('feat(scm): watch runs');
    expect(model.summary).toBe(
      'gates succeeded 5 minutes ago and took 5 minutes.'
    );
  });

  it('fills every grid row, in order', () => {
    expect(model.fields).toEqual([
      { label: 'Run', value: '#128' },
      { label: 'Branch', value: 'main' },
      { label: 'Trigger', value: 'push' },
      { label: 'Started', value: formatAbsolute(T - 10 * MIN) },
      { label: 'Duration', value: '5 minutes' }
    ]);
  });

  it('names itself and the copy button by the run number', () => {
    expect(model.ariaLabel).toBe('Run 128 of gates');
    expect(model.copyLabel).toBe('#128');
    expect(model.url).toBe('https://github.com/o/r/actions/runs/42');
  });
});

describe('runCardModel, a running run', () => {
  const model = runCardModel(
    run({
      status: 'in_progress',
      statusRaw: 'in_progress',
      conclusion: null,
      conclusionRaw: null,
      startedAt: T - 90_000,
      updatedAt: null
    }),
    null,
    T
  );

  it('says how long it has been running', () => {
    expect(model.summary).toBe(
      'gates has been running for 1 minute 30 seconds.'
    );
  });

  it('shows Started but never a Duration while unfinished', () => {
    expect(model.fields).toEqual([
      { label: 'Run', value: '#128' },
      { label: 'Branch', value: 'main' },
      { label: 'Trigger', value: 'push' },
      { label: 'Started', value: formatAbsolute(T - 90_000) }
    ]);
  });
});

describe('runCardModel, a queued run', () => {
  const model = runCardModel(
    run({
      status: 'queued',
      statusRaw: 'queued',
      conclusion: null,
      conclusionRaw: null,
      startedAt: null,
      updatedAt: null
    }),
    null,
    T
  );

  it('says it is queued and shows neither Started nor Duration', () => {
    expect(model.summary).toBe('gates is queued.');
    expect(model.fields).toEqual([
      { label: 'Run', value: '#128' },
      { label: 'Branch', value: 'main' },
      { label: 'Trigger', value: 'push' }
    ]);
    expect(model.glyph).toEqual(runGlyph('queued', null));
  });
});

describe('runCardModel, a run gh sent no number for', () => {
  const model = runCardModel(run({ number: 0 }), null, T);

  it('drops the Run row rather than showing a number that exists nowhere', () => {
    expect(model.fields.some((f) => f.label === 'Run')).toBe(false);
  });

  it('names itself by the workflow alone', () => {
    expect(model.ariaLabel).toBe('gates');
  });

  it('gives the copy button the word Copy rather than a number that exists nowhere', () => {
    expect(model.copyLabel).toBe('Copy');
  });
});

describe('runCardModel, missing values', () => {
  it('drops Branch and Trigger when gh sent empty strings', () => {
    const model = runCardModel(run({ headBranch: '', event: '' }), null, T);
    expect(model.fields.map((f) => f.label)).toEqual([
      'Run',
      'Started',
      'Duration'
    ]);
  });

  it('turns an empty title into no subject line at all', () => {
    expect(runCardModel(run({ displayTitle: '' }), null, T).subject).toBeNull();
  });
});

describe('runCardModel, the Jobs block', () => {
  it('draws one line per cached job, glyph, name and compact duration', () => {
    const model = runCardModel(
      run({}),
      [
        job({}),
        job({
          id: 9002,
          name: 'package',
          conclusion: 'failure',
          conclusionRaw: 'failure',
          startedAt: null,
          completedAt: null
        })
      ],
      T
    );
    expect(model.jobs).toEqual([
      {
        key: 9001,
        glyph: runGlyph('completed', 'success'),
        name: 'build',
        duration: '48s'
      },
      {
        key: 9002,
        glyph: runGlyph('completed', 'failure'),
        name: 'package',
        duration: null
      }
    ]);
    expect(model.jobsNote).toBeNull();
  });

  it('hints at expanding when nothing has been read', () => {
    const model = runCardModel(run({}), null, T);
    expect(model.jobs).toEqual([]);
    expect(model.jobsNote).toBe(RUNS_CARD_JOBS_HINT);
    expect(RUNS_CARD_JOBS_HINT).toBe('Expand the run to load its jobs.');
  });

  it('says the run has no jobs when the cache answered with zero', () => {
    // Expanding again would still find nothing, so the hint would be a lie.
    const model = runCardModel(run({}), [], T);
    expect(model.jobs).toEqual([]);
    expect(model.jobsNote).toBe('This run has no jobs yet.');
  });
});
