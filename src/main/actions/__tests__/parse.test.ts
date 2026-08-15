/**
 * The parser (Phase 46, spec section 10.2).
 *
 * The two fixtures were captured from the real gh 2.95.0 on this machine on
 * 2026-08-15, read only, against gregce/tortie:
 *
 *   gh run list --repo gregce/tortie --branch main --limit 10 --json <fields>
 *   gh run view 31900744174 --repo gregce/tortie --json jobs,status,conclusion,url
 *
 * The jobs fixture is the one that carries the two facts that shaped the
 * design: the step numbers are not contiguous, and the job url is the job
 * page rather than the run page.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseRunJobs, parseRunList } from '../parse';

function fixture(name: string): unknown {
  return JSON.parse(
    readFileSync(join(__dirname, 'fixtures', name), 'utf8')
  ) as unknown;
}

const runList = fixture('run-list.json');
const runView = fixture('run-view-jobs.json');

describe('parseRunList, against the captured gh output', () => {
  const parsed = parseRunList(runList);

  it('keeps all ten rows and reports nothing', () => {
    expect(parsed.runs).toHaveLength(10);
    expect(parsed.issues).toEqual([]);
  });

  it('reads the first row field for field, with epoch milliseconds', () => {
    expect(parsed.runs[0]).toEqual({
      id: 31900744174,
      number: 20,
      workflowName: 'gates',
      displayTitle:
        'fix(terminal): keep the selection on right click and calm the focus ring',
      status: 'completed',
      statusRaw: 'completed',
      conclusion: 'success',
      conclusionRaw: 'success',
      event: 'push',
      headBranch: 'main',
      headSha: '08b47570681d5204c4faa93b5cb1306e9d1c9ec8',
      createdAt: Date.parse('2026-08-15T18:18:02Z'),
      startedAt: Date.parse('2026-08-15T18:18:02Z'),
      updatedAt: Date.parse('2026-08-15T18:21:44Z'),
      url: 'https://github.com/gregce/tortie/actions/runs/31900744174'
    });
  });
});

describe('parseRunJobs, against the captured gh output', () => {
  const parsed = parseRunJobs(runView);
  const job = parsed.jobs[0];

  it('keeps the one job and its eleven steps', () => {
    expect(parsed.jobs).toHaveLength(1);
    expect(parsed.issues).toEqual([]);
    expect(job?.steps).toHaveLength(11);
  });

  it('keeps steps in array order, gap and all', () => {
    // The real run went 1 to 8, then 15, 16, 17. Sorting by number would be
    // wrong, and drawing the number as a position would be wrong.
    expect(job?.steps.map((step) => step.number)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 15, 16, 17
    ]);
    expect(job?.steps[0]?.name).toBe('Set up job');
    expect(job?.steps[10]?.name).toBe('Complete job');
  });

  it('the job url is the job page and it is not the run page', () => {
    const runUrl = (runView as { url: string }).url;
    expect(job?.url).toBe(
      'https://github.com/gregce/tortie/actions/runs/31900744174/job/95051018949'
    );
    expect(runUrl).toBe(
      'https://github.com/gregce/tortie/actions/runs/31900744174'
    );
    expect(job?.url).not.toBe(runUrl);
  });

  it('reads the job timestamps as epoch milliseconds', () => {
    expect(job?.startedAt).toBe(Date.parse('2026-08-15T18:18:05Z'));
    expect(job?.completedAt).toBe(Date.parse('2026-08-15T18:21:43Z'));
  });
});

describe('the drop rules', () => {
  const row = (over: Record<string, unknown> = {}): unknown => ({
    databaseId: 1,
    number: 1,
    workflowName: 'gates',
    displayTitle: 'a commit',
    status: 'completed',
    conclusion: 'success',
    event: 'push',
    headBranch: 'main',
    headSha: 'abc1234',
    createdAt: '2026-08-15T18:18:02Z',
    startedAt: '2026-08-15T18:18:02Z',
    updatedAt: '2026-08-15T18:21:44Z',
    url: 'https://github.com/o/r/actions/runs/1',
    ...over
  });

  it('drops a run with no databaseId and names the field', () => {
    const parsed = parseRunList([row({ databaseId: undefined })]);
    expect(parsed.runs).toEqual([]);
    expect(parsed.issues).toEqual([
      { kind: 'run', field: 'databaseId', reason: 'is not a number' }
    ]);
  });

  it('drops a run whose url is empty and names the field', () => {
    const parsed = parseRunList([row({ url: '' })]);
    expect(parsed.runs).toEqual([]);
    expect(parsed.issues).toEqual([
      { kind: 'run', field: 'url', reason: 'is empty' }
    ]);
  });

  it('keeps a run whose status word it has never seen', () => {
    const parsed = parseRunList([row({ status: 'waiting', conclusion: '' })]);
    expect(parsed.issues).toEqual([]);
    expect(parsed.runs[0]?.status).toBe('unknown');
    expect(parsed.runs[0]?.statusRaw).toBe('waiting');
    expect(parsed.runs[0]?.conclusion).toBeNull();
    expect(parsed.runs[0]?.conclusionRaw).toBeNull();
  });

  it('keeps a run whose conclusion word it has never seen', () => {
    const parsed = parseRunList([row({ conclusion: 'exploded' })]);
    expect(parsed.runs[0]?.conclusion).toBe('unknown');
    expect(parsed.runs[0]?.conclusionRaw).toBe('exploded');
  });

  it('falls back rather than dropping for displayTitle and number', () => {
    const parsed = parseRunList([
      row({ displayTitle: undefined, number: undefined })
    ]);
    expect(parsed.issues).toEqual([]);
    expect(parsed.runs[0]?.displayTitle).toBe('');
    expect(parsed.runs[0]?.number).toBe(0);
  });

  it('reads gh zero timestamps as absent rather than as the year 1', () => {
    const parsed = parseRunList([
      row({ status: 'queued', startedAt: '0001-01-01T00:00:00Z' })
    ]);
    expect(parsed.runs[0]?.startedAt).toBeNull();
  });

  it('parses the empty array to nothing at all', () => {
    // Measured: a commit with no runs prints [] and exits 0. The empty case
    // is not an error.
    expect(parseRunList([])).toEqual({ runs: [], issues: [] });
  });

  it('answers with one issue when the payload is not a list', () => {
    const parsed = parseRunList({ message: 'Not Found' });
    expect(parsed.runs).toEqual([]);
    expect(parsed.issues).toEqual([
      { kind: 'run', field: 'runs', reason: 'is not a list' }
    ]);
  });

  it('drops a job with no name and keeps the rest of the answer', () => {
    const parsed = parseRunJobs({
      jobs: [
        { databaseId: 1, status: 'completed', url: 'https://x/1', steps: [] },
        {
          databaseId: 2,
          name: 'build',
          status: 'completed',
          url: 'https://x/2',
          steps: []
        }
      ]
    });
    expect(parsed.jobs).toHaveLength(1);
    expect(parsed.jobs[0]?.name).toBe('build');
    expect(parsed.issues).toEqual([
      { kind: 'job', field: 'name', reason: 'is not a string' }
    ]);
  });

  it('drops one bad step and keeps its job', () => {
    const parsed = parseRunJobs({
      jobs: [
        {
          databaseId: 1,
          name: 'gates',
          status: 'in_progress',
          url: 'https://x/1',
          steps: [
            { number: 1, name: 'Set up job', status: 'completed' },
            { number: 2, status: 'completed' }
          ]
        }
      ]
    });
    expect(parsed.jobs[0]?.steps).toHaveLength(1);
    expect(parsed.issues).toEqual([
      { kind: 'step', field: 'name', reason: 'is not a string' }
    ]);
  });
});
