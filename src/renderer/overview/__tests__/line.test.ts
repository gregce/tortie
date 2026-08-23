/**
 * The project view's built line (Phase 137). The table is section 10.3 of
 * the build spec. No model writes any of it, so every row is a pure
 * function of the session view, the status and git.
 */

import { describe, expect, it } from 'vitest';
import type {
  OverviewSessionView,
  OverviewTurnView
} from '@shared/overview';
import { buildProjectLine, firstClause, honestLineHasClock } from '../line';

function turn(over: Partial<OverviewTurnView> = {}): OverviewTurnView {
  return {
    index: 0,
    askText: 'Fix the flaky restore test. Then run the suite.',
    askClipped: false,
    askAt: '2026-08-22T13:31:00.000Z',
    answerText: 'Done. The suite is green.',
    answerClipped: false,
    answerAt: '2026-08-22T13:40:00.000Z',
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
    name: 'claude-6',
    agent: 'claude',
    agentLabel: 'Claude Code',
    model: null,
    branch: null,
    line: 'turns',
    lineDetail: null,
    askOnly: false,
    noTurnClock: false,
    startedAt: new Date(2026, 7, 22, 9, 0).getTime(),
    lastTouchedAt: null,
    turns: [turn()],
    ...over
  };
}

const NOW = new Date(2026, 7, 22, 15, 0).getTime();

describe('buildProjectLine', () => {
  it('says done and git agrees when git agrees', () => {
    const out = buildProjectLine(session(), 'idle', NOW);
    expect(out.ask).toBe('Fix the flaky restore test');
    expect(out.outcome).toBe('Done, and git agrees');
  });

  it('marks the claim when git has no record', () => {
    const out = buildProjectLine(
      session({ turns: [turn({ git: 'no-record' })] }),
      'idle',
      NOW
    );
    expect(out.outcome).toBe(
      'The agent says it is done. git has no record of it'
    );
  });

  it('says outside this project when every named path was outside', () => {
    const out = buildProjectLine(
      session({
        turns: [turn({ git: 'nothing-to-check', namedOnlyOutside: true })]
      }),
      'idle',
      NOW
    );
    expect(out.outcome).toBe('Done, outside this project');
  });

  it('says answered when there was nothing to check', () => {
    const out = buildProjectLine(
      session({ turns: [turn({ git: 'nothing-to-check' })] }),
      'idle',
      NOW
    );
    expect(out.outcome).toBe('Answered');
  });

  it('says still working for an open turn in a running session', () => {
    const out = buildProjectLine(
      session({ turns: [turn({ closed: false, answerText: null })] }),
      'running',
      NOW
    );
    expect(out.outcome).toBe('The agent is still working');
  });

  it('says stopped for an interrupted turn', () => {
    const out = buildProjectLine(
      session({
        turns: [turn({ closed: false, answerText: null, interrupted: true })]
      }),
      'idle',
      NOW
    );
    expect(out.outcome).toBe('Stopped before the agent answered');
  });

  it('says the answer is not in the record for a closed turn with none', () => {
    const out = buildProjectLine(
      session({
        askOnly: true,
        turns: [turn({ closed: true, answerText: null })]
      }),
      'idle',
      NOW
    );
    expect(out.outcome).toBe('The agent’s answer is not in the record');
  });

  it('names the start for a session with nothing asked yet', () => {
    const out = buildProjectLine(
      session({ line: 'no-turns', turns: [] }),
      'idle',
      NOW
    );
    expect(out.ask).toBeNull();
    expect(out.outcome).toBe('started 09:00, nothing asked yet');
  });

  it('says no agent here for a shell', () => {
    const out = buildProjectLine(
      session({ line: 'shell', agent: 'shell', turns: [] }),
      'idle',
      NOW
    );
    expect(out.ask).toBeNull();
    expect(out.outcome).toBe('no agent here');
  });

  it('is honest about a provider with no store on this Mac', () => {
    expect(
      buildProjectLine(session({ line: 'no-store', turns: [] }), 'idle', NOW)
        .outcome
    ).toBe('This agent keeps no record on this Mac that Tortie can read');
  });

  it('carries main’s own sentence for an unreadable record', () => {
    expect(
      buildProjectLine(
        session({
          line: 'unreadable',
          lineDetail: 'The file is not valid JSON.',
          turns: []
        }),
        'idle',
        NOW
      ).outcome
    ).toBe(
      'Tortie could not read this session’s record. The file is not valid JSON.'
    );
  });

  it('names the wrong folder case without naming the folder', () => {
    expect(
      buildProjectLine(
        session({ line: 'wrong-conversation', turns: [] }),
        'idle',
        NOW
      ).outcome
    ).toBe('The record Tortie has for this session names a different folder');
  });

  it('says where a remote session’s record lives', () => {
    expect(
      buildProjectLine(session({ line: 'remote', turns: [] }), 'idle', NOW)
        .outcome
    ).toBe('This session runs on another machine. Its record is there');
  });
});

describe('firstClause', () => {
  it('cuts at the first sentence end', () => {
    expect(firstClause('Do the thing. Then another.')).toBe('Do the thing');
  });

  it('cuts at a question mark', () => {
    expect(firstClause('Why is restore slow? Look into it.')).toBe(
      'Why is restore slow?'.slice(0, -1)
    );
  });

  it('cuts at a newline', () => {
    expect(firstClause('line one\nline two')).toBe('line one');
  });

  it('clips a long clause at a word boundary with an ellipsis', () => {
    const long =
      'Please rework the whole restore path so that every session comes back with its conversation armed';
    const out = firstClause(long);
    expect(out.endsWith('…')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(73);
    expect(out).not.toContain('  ');
    // The cut lands between words, never inside one.
    expect(long.startsWith(out.slice(0, -1))).toBe(true);
    expect(long[out.length - 1]).not.toBe(undefined);
  });

  it('keeps a short ask whole', () => {
    expect(firstClause('Run the tests')).toBe('Run the tests');
  });
});

describe('honestLineHasClock', () => {
  it('is true only where the sentence carries the started clock', () => {
    expect(honestLineHasClock(session({ line: 'no-turns', turns: [] }))).toBe(
      true
    );
    expect(honestLineHasClock(session({ line: 'turns', turns: [] }))).toBe(
      true
    );
    expect(honestLineHasClock(session({ line: 'shell', turns: [] }))).toBe(
      false
    );
    expect(honestLineHasClock(session())).toBe(false);
  });
});
