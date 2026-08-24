/**
 * Phase 138, Builder B's half of the one line, run rather than read.
 *
 * Three things are held here and each one is a refusal from the entry.
 *
 *  - A written sentence replaces the WHOLE line. There is no `you asked` lead
 *    in front of it and no quotes around any part of it, because the model
 *    writes exactly one thing.
 *  - With no sentence written the line is Phase 137's built line, byte for
 *    byte, because `buildProjectLine` is untouched and `projectLineFor` calls
 *    it. So None is a complete answer.
 *  - The written sentence carries no clock, so the data-clock attribute the
 *    integer probe reads is absent on a row a model wrote.
 *
 * This repository carries no jsdom, so the component renders through
 * `renderToStaticMarkup`, the shape p1372-columns-marks.test.tsx uses.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  OverviewProject,
  OverviewSessionView,
  OverviewTurnView
} from '@shared/overview';
import { ProjectLines } from '../ProjectLines';
import { buildProjectLine, projectLineFor } from '../line';

const NOW = Date.UTC(2026, 7, 23, 12, 0, 0);

function turn(over: Partial<OverviewTurnView> = {}): OverviewTurnView {
  return {
    index: 0,
    askText: 'Fix the flaky restore test. Then run the suite.',
    askClipped: false,
    askAt: '2026-08-23T11:00:00.000Z',
    answerText: 'Done. The suite is green.',
    answerClipped: false,
    answerAt: '2026-08-23T11:04:00.000Z',
    closed: true,
    interrupted: false,
    notice: null,
    git: 'agrees',
    namedOnlyOutside: false,
    ...over
  };
}

function session(
  over: Partial<OverviewSessionView> = {}
): OverviewSessionView {
  return {
    sessionId: 'one',
    name: 'claude-six',
    agent: 'claude',
    agentLabel: 'Claude Code',
    model: null,
    branch: null,
    line: 'turns',
    lineDetail: null,
    askOnly: false,
    noTurnClock: false,
    startedAt: NOW - 7_200_000,
    lastTouchedAt: NOW - 600_000,
    turns: [turn()],
    summary: null,
    ...over
  };
}

function project(sessions: OverviewSessionView[]): OverviewProject {
  return {
    projectPath: '/x/gmux',
    projectName: 'gmux',
    readAt: NOW,
    isGitRepo: true,
    sessions,
    reads: {}
  };
}

const WRITTEN =
  'You asked for the restore test to stop failing and the agent has the ' +
  'suite passing again.';

describe('projectLineFor', () => {
  it('draws the written sentence alone, with no ask and no lead', () => {
    const out = projectLineFor(session({ summary: WRITTEN }), 'idle', NOW);
    expect(out.ask).toBeNull();
    expect(out.outcome).toBe(WRITTEN);
  });

  it('is exactly the built line when nothing was written', () => {
    const s = session();
    expect(projectLineFor(s, 'idle', NOW)).toEqual(
      buildProjectLine(s, 'idle', NOW)
    );
  });

  it('is exactly the built line for an empty sentence', () => {
    const s = session({ summary: '' });
    expect(projectLineFor(s, 'idle', NOW)).toEqual(
      buildProjectLine(s, 'idle', NOW)
    );
  });

  it('replaces the honest sentence too, when a model wrote one', () => {
    const s = session({ line: 'no-turns', turns: [], summary: WRITTEN });
    const out = projectLineFor(s, 'idle', NOW);
    expect(out.ask).toBeNull();
    expect(out.outcome).toBe(WRITTEN);
  });
});

describe('the project view with a written sentence', () => {
  const markup = renderToStaticMarkup(
    <ProjectLines
      project={project([session({ summary: WRITTEN })])}
      statuses={{ one: 'idle' }}
      selected={0}
      onSelect={() => undefined}
      onActivate={() => undefined}
      now={NOW}
    />
  );

  it('draws the sentence', () => {
    expect(markup).toContain(WRITTEN);
  });

  it('draws no you asked lead and no quoted ask', () => {
    expect(markup).not.toContain('overview-line-lead');
    expect(markup).not.toContain('you asked');
    expect(markup).not.toContain('Fix the flaky restore test');
  });

  it('marks no clock on the written sentence', () => {
    expect(markup).not.toContain('data-clock');
  });
});

describe('the project view with nothing written', () => {
  const markup = renderToStaticMarkup(
    <ProjectLines
      project={project([session()])}
      statuses={{ one: 'idle' }}
      selected={0}
      onSelect={() => undefined}
      onActivate={() => undefined}
      now={NOW}
    />
  );

  it('draws Phase 137 built line, lead and all', () => {
    expect(markup).toContain('overview-line-lead');
    expect(markup).toContain('Fix the flaky restore test');
    expect(markup).toContain('Done, and git agrees');
  });

  it('still marks the clock on a session with nothing asked yet', () => {
    const idle = renderToStaticMarkup(
      <ProjectLines
        project={project([session({ line: 'no-turns', turns: [] })])}
        statuses={{ one: 'idle' }}
        selected={0}
        onSelect={() => undefined}
        onActivate={() => undefined}
        now={NOW}
      />
    );
    expect(idle).toContain('data-clock');
  });
});
