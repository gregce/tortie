/**
 * Phase 311 — the Catch Me Up line for the one row the phone exists for.
 *
 * Research 127 §7 item 2: `buildProjectLine`'s still working arm asks for
 * `status === 'running'`, so a session that is WAITING on the person fell
 * through to `The agent's answer is not in the record`. That is false of a
 * session whose agent is standing at a question, and no test covered the arm,
 * which is why it survived a hundred phases.
 *
 * What this file holds:
 * - A waiting row says it is waiting, and says it whether the newest turn is
 *   open, unclosed with no answer, or closed with none.
 * - The arm is LAST. A closed turn with an answer still says what it said and
 *   an interrupted turn still says it was stopped, because both are true of the
 *   record even while the agent stands at a new question.
 * - His no-regression rule, driven rather than asserted: every status that is
 *   not `needs_input` draws byte-identically to the parent for every row shape
 *   in the table, and the parent's answers are written out here as literals
 *   rather than recomputed, so a change to any of them fails this file.
 * - The one new sentence is the only new string, and it obeys the copy rules the
 *   rest of copy.ts obeys.
 */

import { describe, expect, it } from 'vitest';
import type {
  OverviewSessionView,
  OverviewTurnView
} from '@shared/overview';
import type { SessionStatus } from '@shared/types';
import { buildProjectLine, projectLineFor } from '@shared/overview-line';
import { OUTCOME_WAITING } from '@shared/overview-copy';

function turn(over: Partial<OverviewTurnView> = {}): OverviewTurnView {
  return {
    index: 0,
    askText: 'Make the session cookie httpOnly. Then run the suite.',
    askClipped: false,
    askAt: '2026-09-21T13:31:00.000Z',
    answerText: 'Done. The suite is green.',
    answerClipped: false,
    answerAt: '2026-09-21T13:40:00.000Z',
    closed: true,
    interrupted: false,
    notice: null,
    git: 'agrees',
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
    startedAt: new Date(2026, 8, 21, 9, 0).getTime(),
    lastTouchedAt: null,
    turns: [turn()],
    summary: null,
    summaryWrittenAt: null,
    ...over
  };
}

const NOW = new Date(2026, 8, 21, 15, 0).getTime();

/** The row shapes the line's table distinguishes, by the turn they end on. */
const SHAPES: Array<{ what: string; turns: OverviewTurnView[] }> = [
  { what: 'an open turn', turns: [turn({ closed: false, answerText: null })] },
  {
    what: 'a closed turn with no answer',
    turns: [turn({ closed: true, answerText: null })]
  },
  {
    what: 'an interrupted turn',
    turns: [turn({ closed: false, answerText: null, interrupted: true })]
  },
  { what: 'a closed turn that git agrees with', turns: [turn()] },
  {
    what: 'a closed turn git has no record of',
    turns: [turn({ git: 'no-record' })]
  }
];

// ---------------------------------------------------------------------------
// The arm this phase adds
// ---------------------------------------------------------------------------

describe('a session that is waiting on the person', () => {
  it('says it is waiting instead of claiming the answer is missing', () => {
    const out = buildProjectLine(
      session({ turns: [turn({ closed: false, answerText: null })] }),
      'needs_input',
      NOW
    );
    expect(out.outcome).toBe('The agent is waiting for you.');
    // The parent's answer for exactly this row, named so the repair is visible.
    expect(out.outcome).not.toBe('The agent’s answer is not in the record');
    // The ask is still the person's own first clause, unchanged.
    expect(out.ask).toBe('Make the session cookie httpOnly');
  });

  it('says it for a closed turn whose answer never reached the record', () => {
    const out = buildProjectLine(
      session({ askOnly: true, turns: [turn({ closed: true, answerText: null })] }),
      'needs_input',
      NOW
    );
    expect(out.outcome).toBe(OUTCOME_WAITING);
  });

  it('is the arm a written sentence still outranks', () => {
    // Phase 138's rule is untouched: a model's sentence replaces the whole
    // line, so this arm can never appear beside one.
    const out = projectLineFor(
      session({
        summary: 'It is waiting for a yes on one file.',
        turns: [turn({ closed: false, answerText: null })]
      }),
      'needs_input',
      NOW
    );
    expect(out.ask).toBeNull();
    expect(out.outcome).toBe('It is waiting for a yes on one file.');
  });
});

// ---------------------------------------------------------------------------
// The arm is last, so it moves only the rows that read wrong
// ---------------------------------------------------------------------------

describe('the arm is the last one before the fallback', () => {
  it('leaves an interrupted turn saying it was stopped', () => {
    expect(
      buildProjectLine(
        session({
          turns: [turn({ closed: false, answerText: null, interrupted: true })]
        }),
        'needs_input',
        NOW
      ).outcome
    ).toBe('Stopped before the agent answered');
  });

  it('leaves a closed, answered turn saying what the record says', () => {
    expect(
      buildProjectLine(session(), 'needs_input', NOW).outcome
    ).toBe('Done, and git agrees');
    expect(
      buildProjectLine(
        session({ turns: [turn({ git: 'no-record' })] }),
        'needs_input',
        NOW
      ).outcome
    ).toBe('The agent says it is done. git has no record of it');
  });

  it('leaves a session with no turns naming its start', () => {
    const out = buildProjectLine(
      session({ line: 'no-turns', turns: [] }),
      'needs_input',
      NOW
    );
    expect(out.ask).toBeNull();
    expect(out.outcome).toBe('started 09:00, nothing asked yet');
  });
});

// ---------------------------------------------------------------------------
// No regression against the parent for every other status
// ---------------------------------------------------------------------------

describe('every status that is not needs_input', () => {
  /**
   * What the parent commit answers for each shape at each status, written out
   * rather than computed, so this table is a reading of the old build and not a
   * restatement of the new one. `running` and everything else differ on one
   * row only, being the open turn, which is the still working arm.
   */
  const PARENT: Record<string, Record<string, string>> = {
    'an open turn': {
      running: 'The agent is still working',
      other: 'The agent’s answer is not in the record'
    },
    'a closed turn with no answer': {
      running: 'The agent’s answer is not in the record',
      other: 'The agent’s answer is not in the record'
    },
    'an interrupted turn': {
      running: 'Stopped before the agent answered',
      other: 'Stopped before the agent answered'
    },
    'a closed turn that git agrees with': {
      running: 'Done, and git agrees',
      other: 'Done, and git agrees'
    },
    'a closed turn git has no record of': {
      running: 'The agent says it is done. git has no record of it',
      other: 'The agent says it is done. git has no record of it'
    }
  };

  const OTHERS: SessionStatus[] = [
    'running',
    'idle',
    'exited',
    'restorable',
    'unknown',
    'discarded'
  ];

  for (const shape of SHAPES) {
    for (const status of OTHERS) {
      it(`draws the parent's line for ${shape.what} at ${status}`, () => {
        const want =
          PARENT[shape.what]?.[status === 'running' ? 'running' : 'other'];
        expect(want, `no parent reading for ${shape.what}`).toBeDefined();
        expect(
          buildProjectLine(session({ turns: shape.turns }), status, NOW).outcome
        ).toBe(want);
      });
    }
  }

  it('never draws the new sentence for any of them', () => {
    for (const shape of SHAPES) {
      for (const status of OTHERS) {
        expect(
          buildProjectLine(session({ turns: shape.turns }), status, NOW).outcome
        ).not.toBe(OUTCOME_WAITING);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// The one new string
// ---------------------------------------------------------------------------

describe('the new sentence', () => {
  it('is exactly the sentence the phase entry names', () => {
    expect(OUTCOME_WAITING).toBe('The agent is waiting for you.');
  });

  it('obeys the copy rules the rest of the file obeys', () => {
    // The person is "you", the agent is "the agent", neither is "it", and no
    // digit, because the formatters are the only digit sources.
    expect(OUTCOME_WAITING.toLowerCase()).toContain('the agent');
    expect(OUTCOME_WAITING).toContain('you');
    expect(OUTCOME_WAITING).not.toMatch(/ it[\s.]/);
    expect(OUTCOME_WAITING).not.toMatch(/\d/);
  });

  it('composes no part of what is being asked', () => {
    // The question is drawn UNDER the line from the activity channel. If it
    // ever reached this sentence, a redaction bug would become a copy bug.
    expect(OUTCOME_WAITING).not.toContain('?');
    expect(OUTCOME_WAITING).not.toContain('{');
  });
});
