/**
 * The ten refusals (Phase 138).
 *
 * The entry's strongest refusal is that the model writes exactly one thing.
 * This file drives a hostile fixture through the validator, because gate one
 * watched the model write a commit mark into its very first sentence and gate
 * two found 167 of 215 unguarded summaries carrying a digit. A rule in a
 * prompt asks. This decides.
 *
 * The candidates that are valid are here too, because a validator that
 * refuses everything is not a validator. Several of them are here because the
 * first cut of the validator refused them: it tested for the word commit and
 * for five status words, and over sixty folds of real turns that refused
 * 31.7 percent of sentences while only 8.3 percent broke a refusal the entry
 * names. The rules now name the mark and the state rather than the vocabulary
 * around them, and these keepers are what holds that.
 */

import { describe, expect, it } from 'vitest';
import type { StoredTurn } from '../../store';
import {
  validateFoldText,
  FOLD_REFUSALS,
  FOLD_REFUSAL_REASONS,
  FOLD_TEXT_MAX_CHARS,
  type FoldRefusal
} from '../validate';

const ASK =
  'Please rework the project rail so the close control stays reachable ' +
  'when the sidebar is narrow, and keep the hint where it already sits.';
const ANSWER =
  'I moved the reserved slot into the rail and overlaid the hint inside ' +
  'it, so revealing the hint can no longer reflow anything above it.';

function turn(index: number): StoredTurn {
  return {
    sessionId: 's1',
    index,
    askText: ASK,
    askAt: '2026-08-23T10:00:00Z',
    answerText: ANSWER,
    answerAt: '2026-08-23T10:01:00Z',
    queued: 1,
    closed: true,
    interrupted: false,
    notice: null,
    stopReason: 'end_turn',
    durationMs: 1_000,
    paths: [],
    pathSource: 'tool-calls',
    gitVerdict: null,
    gitCheckedAt: null
  };
}

const TURNS = [turn(0)];

interface Candidate {
  what: string;
  text: string;
  refusal: FoldRefusal | null;
}

/**
 * The hostile fixture. Every refusal is represented, the git mark and the path
 * in four shapes each, and one candidate at the end that must reach the page.
 */
const CANDIDATES: Candidate[] = [
  { what: 'nothing at all', text: '', refusal: 'empty' },
  { what: 'only whitespace', text: '   \t  ', refusal: 'empty' },
  {
    what: 'two lines',
    text: 'You asked for the rail to settle.\nThe agent did it.',
    refusal: 'newline'
  },
  {
    what: 'a very long sentence',
    text: `You asked the agent to ${'settle the rail again and '.repeat(20)}stop.`,
    refusal: 'too-long'
  },
  {
    what: 'a digit written as a digit',
    text: 'You asked the agent to settle 3 rails and it settled them.',
    refusal: 'digit'
  },
  {
    what: 'a count written as a word',
    text: 'You asked the agent to settle three rails and it settled them.',
    refusal: null
  },
  {
    what: 'a short git hash',
    text: 'You asked for the rail to settle and the agent landed 9c41ab2.',
    refusal: 'git-mark'
  },
  {
    what: 'a full git hash',
    text:
      'You asked for the rail and the agent landed ' +
      'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678.',
    refusal: 'git-mark'
  },
  {
    what: 'the mark named rather than pasted',
    text: 'The agent settled the rail and read you back the commit hash.',
    refusal: 'git-mark'
  },
  {
    what: 'the word sha',
    text: 'The agent settled the rail and told you the sha for it.',
    refusal: 'git-mark'
  },
  {
    what: 'the bare word commit, with no mark anywhere',
    text: 'You asked the agent to commit the rail work and it did.',
    refusal: null
  },
  {
    what: 'the word committed used about a person rather than about git',
    text:
      'The agent committed to coming back to you with the rail measurement ' +
      'once the long run finishes.',
    refusal: null
  },
  {
    what: 'a path with slashes',
    text: 'The agent reworked src/renderer/app/ProjectRail and you approved.',
    refusal: 'path'
  },
  {
    what: 'a file with a source extension',
    text: 'The agent reworked ProjectRail.tsx and you approved the result.',
    refusal: 'path'
  },
  {
    what: 'a leading slash path',
    text: 'The agent looked under /Users/someone/work and found the rail.',
    refusal: 'path'
  },
  {
    what: 'a bare dotted name',
    text: 'The agent read settings.json and answered you about the rail.',
    refusal: 'path'
  },
  {
    what: 'an em dash',
    text: 'You asked for the rail — the agent settled it.',
    refusal: 'dash'
  },
  {
    what: 'an en dash',
    text: 'You asked for the rail – the agent settled it.',
    refusal: 'dash'
  },
  {
    what: 'the status word idle',
    text: 'The agent settled the rail and the session is idle now.',
    refusal: 'status-word'
  },
  {
    what: 'the status words needs input',
    text: 'The agent settled the rail and now needs input from you.',
    refusal: 'status-word'
  },
  {
    what: 'the status words waiting on you',
    text: 'The agent settled the rail and is waiting on you.',
    refusal: 'status-word'
  },
  {
    what: 'the status word running',
    text: 'The agent is running the rail work you asked for.',
    refusal: 'status-word'
  },
  {
    what: 'the state of the session, said with the word live',
    text: 'The agent settled the rail and the session is live now.',
    refusal: 'status-word'
  },
  {
    what: 'the word live inside the name of the thing you are building',
    text: 'You asked the agent to widen the live build room and it did.',
    refusal: null
  },
  {
    what: 'the word running about the work rather than about the session',
    text: 'You asked the agent for a running order and it wrote you one.',
    refusal: null
  },
  {
    what: 'a verbatim ask',
    text: `You said: ${ASK.slice(0, 90)}`,
    refusal: 'quoted-ask'
  },
  {
    what: 'a verbatim answer',
    text: `The agent said: ${ANSWER.slice(0, 90)}`,
    refusal: 'quoted-answer'
  },
  {
    what: 'a sentence that says what happened',
    text:
      'You asked the agent to keep the close control reachable in a narrow ' +
      'sidebar, and it reworked the rail so revealing a hint moves nothing.',
    refusal: null
  }
];

describe('validateFoldText — the hostile fixture', () => {
  it.each(CANDIDATES)('rules on $what', ({ text, refusal }) => {
    const out = validateFoldText(text, TURNS);
    expect(out.refusal).toBe(refusal);
    if (refusal === null) {
      expect(out.kept).toBe(text.trim());
    } else {
      expect(out.kept).toBeNull();
    }
  });

  it('has at least one candidate for every refusal it names', () => {
    const covered = new Set(
      CANDIDATES.map((candidate) => candidate.refusal).filter(
        (refusal): refusal is FoldRefusal => refusal !== null
      )
    );
    for (const refusal of FOLD_REFUSALS) {
      expect(covered.has(refusal), `no fixture for ${refusal}`).toBe(true);
    }
  });

  it('has one sentence for every refusal', () => {
    for (const refusal of FOLD_REFUSALS) {
      expect(FOLD_REFUSAL_REASONS[refusal].length).toBeGreaterThan(10);
    }
  });

  it('refuses whole rather than trimming', () => {
    const out = validateFoldText(
      'The agent settled the rail in 2 places.',
      TURNS
    );
    expect(out.kept).toBeNull();
    expect(out.refusal).toBe('digit');
  });

  it('accepts a sentence exactly at the length cap', () => {
    const text = `You asked and the agent answered${'.'.repeat(
      FOLD_TEXT_MAX_CHARS - 32
    )}`;
    expect(text.length).toBe(FOLD_TEXT_MAX_CHARS);
    expect(validateFoldText(text, TURNS).refusal).toBeNull();
  });

  it('refuses one character over the cap', () => {
    const text = `You asked and the agent answered${'.'.repeat(
      FOLD_TEXT_MAX_CHARS - 31
    )}`;
    expect(validateFoldText(text, TURNS).refusal).toBe('too-long');
  });

  it('does not call an ordinary shared phrase a quote', () => {
    const out = validateFoldText(
      'You asked about the sidebar and the agent explained where it sits.',
      TURNS
    );
    expect(out.refusal).toBeNull();
  });

  it('sees a quote through reflowed whitespace', () => {
    const reflowed = ASK.slice(0, 80).replace(/ /g, '\t');
    const out = validateFoldText(`The agent read ${reflowed}`, TURNS);
    expect(out.refusal).toBe('quoted-ask');
  });
});
