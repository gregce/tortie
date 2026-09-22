/**
 * Phase 311 — what a waiting agent is asking, drawn under the line, run rather
 * than read.
 *
 * `p311-waiting-line.test.ts` holds the pure function. This holds the rendered
 * row, because the sentence and the question are two elements and a test of the
 * function alone cannot see whether the second one reached the page.
 *
 * Four things, each a refusal from the entry:
 *  - The question is drawn only on a row that is WAITING. Every other status
 *    draws the row it drew before this phase, question in the store or not.
 *  - It is drawn from the store and never composed into the sentence, so a
 *    redaction fault can never become a copy fault.
 *  - It is quoted text, which is what accounts for its digits under the integer
 *    rule: a question often carries a path, a count or a file name.
 *  - A row main has no question for draws nothing extra at all, which is his
 *    no-regression rule for the fourteen agents this phase does not touch.
 *
 * This repository carries no jsdom, so the component renders through
 * `renderToStaticMarkup`, the shape p138-written-line.test.tsx uses.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  OverviewProject,
  OverviewSessionView,
  OverviewTurnView
} from '@shared/overview';
import type { SessionStatus } from '@shared/types';
import { ProjectLines } from '../ProjectLines';

const NOW = Date.UTC(2026, 8, 21, 12, 0, 0);

function turn(over: Partial<OverviewTurnView> = {}): OverviewTurnView {
  return {
    index: 0,
    askText: 'Make the session cookie httpOnly. Then run the suite.',
    askClipped: false,
    askAt: '2026-09-21T11:00:00.000Z',
    answerText: null,
    answerClipped: false,
    answerAt: null,
    closed: false,
    interrupted: false,
    notice: null,
    git: 'nothing-to-check',
    namedOnlyOutside: false,
    ...over
  };
}

function session(over: Partial<OverviewSessionView> = {}): OverviewSessionView {
  return {
    sessionId: 'one',
    name: 'fix-login',
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
    summaryWrittenAt: null,
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

const QUESTION = 'Edit src/auth/session.ts?';

function draw(
  status: SessionStatus,
  questions?: Record<string, string>
): string {
  return renderToStaticMarkup(
    <ProjectLines
      project={project([session()])}
      statuses={{ one: status }}
      questions={questions}
      selected={0}
      onSelect={() => undefined}
      onActivate={() => undefined}
      now={NOW}
    />
  );
}

describe('a waiting row', () => {
  const markup = draw('needs_input', { one: QUESTION });

  it('says it is waiting', () => {
    expect(markup).toContain('The agent is waiting for you.');
  });

  it('draws what is being asked under that sentence', () => {
    expect(markup).toContain('overview-line-question');
    expect(markup).toContain(QUESTION);
    // Under, not inside: the sentence and the question are two elements, and
    // the question comes after.
    expect(markup.indexOf('The agent is waiting for you.')).toBeLessThan(
      markup.indexOf(QUESTION)
    );
  });

  it('draws it as quoted text, which is what accounts for its digits', () => {
    const at = markup.indexOf('overview-line-question');
    const element = markup.slice(at - 40, at + 40);
    expect(element).toContain('data-quoted');
  });

  it('never composes it into the sentence', () => {
    // If the two ever became one string, a question with a stray character
    // would be a copy defect rather than a data one.
    expect(markup).not.toContain(`waiting for you. ${QUESTION}`);
  });

  it('carries the whole of it on the hover, because the line truncates', () => {
    // THE FIX ROUND. This line is about 1,109px at the shipped width and main
    // sends up to 200 characters, so the tail is cut with an ellipsis and the
    // hover is where the rest of the sentence exists — the same repair the ⌘J
    // row's own label got.
    const long = `Edit ${'/deeply-nested-directory'.repeat(7)}/note.txt`;
    const html = draw('needs_input', { one: long });
    const at = html.indexOf('overview-line-question');
    expect(html.slice(at, at + 60 + long.length)).toContain(`title="${long}"`);
  });
});

describe('a row main has no question for', () => {
  it('draws the sentence and nothing else', () => {
    const markup = draw('needs_input', {});
    expect(markup).toContain('The agent is waiting for you.');
    expect(markup).not.toContain('overview-line-question');
  });

  it('draws the same with no questions prop at all', () => {
    // Every other caller of this view passes none, which is the fourteen
    // agents this phase does not touch and every surface but the project view.
    expect(draw('needs_input')).toBe(draw('needs_input', {}));
  });
});

describe('every status that is not needs_input', () => {
  const OTHERS: SessionStatus[] = [
    'running',
    'idle',
    'exited',
    'restorable',
    'unknown',
    'discarded'
  ];

  for (const status of OTHERS) {
    it(`draws no question at ${status}, even with one in the store`, () => {
      const markup = draw(status, { one: QUESTION });
      expect(markup).not.toContain('overview-line-question');
      expect(markup).not.toContain(QUESTION);
      expect(markup).not.toContain('The agent is waiting for you.');
    });

    it(`is byte identical with and without a question at ${status}`, () => {
      expect(draw(status, { one: QUESTION })).toBe(draw(status, {}));
    });
  }
});
