/**
 * The three semantic refusals (Phase 259, research 118 §6.4 and §7.1).
 *
 * R1 refuses the ANSWER WHOLE for a model-written evidence level, and it is
 * asked of a FIELD VALUE and never as a search inside a sentence, because four
 * of the ten words are ordinary English.
 *
 * R2 refuses a ROW whole for an unresolvable citation, never a trim: a claim
 * that keeps its sentence while losing the citation that justified it is worse
 * than no claim. An answer with nothing left is refused whole.
 *
 * R3 asks for a TOKEN in the FACTS block rather than a substring anywhere in
 * it. Research 118 §6.4 planted three numbers and measured the substring form
 * catching ONE, so the case below MEASURES both forms over those three strings
 * rather than asserting this file's own arithmetic.
 */

import { describe, expect, it } from 'vitest';
import {
  digitRuns,
  validateArchSemanticAnswer,
  type ArchSemanticContext
} from '../validate';
import type { ArchGradeSources } from '../../semantic/grade';

/** The two files this fixture repository tracks. Everything else is gone. */
const TRACKED: Record<string, number> = { 'src/a.ts': 400, 'src/b.ts': 40 };

const GRADE: ArchGradeSources = {
  lines: (path) => TRACKED[path] ?? null,
  facts: (path) =>
    path === 'src/a.ts'
      ? [{ category: 'surface', kind: 'ipc-channel', subject: 'arch:map', line: 10 }]
      : [],
  decls: () => []
};

const BLOCK = [
  'PART src-main',
  'files: 1068 tracked of 3182 in this repository, 1068 parsed',
  'FACTS',
  'surface',
  '  ipc-channel arch:map at src/a.ts:10',
  'END FACTS'
].join('\n');

function context(over: Partial<ArchSemanticContext> = {}): ArchSemanticContext {
  return {
    kind: 'part',
    partId: 'src-main',
    partIds: ['src-main', 'src-renderer'],
    factBlock: BLOCK,
    grade: GRADE,
    ...over
  };
}

const FIELDS = ['name', 'receives', 'does', 'returns', 'runsIn', 'keeps', 'limit'] as const;

function answer(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    part: 'src-main',
    claims: FIELDS.map((field) => ({
      field,
      text: field === 'name' ? 'The IPC door' : `what the part ${field}`,
      facts: [{ at: 'src/a.ts:10', why: 'the channel it registers' }]
    })),
    gates: [],
    ...over
  });
}

describe('R1, a model written evidence level', () => {
  it('refuses the answer whole when a field VALUE is one of the ten words', () => {
    const ruling = validateArchSemanticAnswer(
      answer({
        claims: FIELDS.map((field) => ({
          field,
          text: field === 'runsIn' ? 'reached' : 'a plain sentence',
          facts: [{ at: 'src/a.ts:10', why: 'x' }]
        }))
      }),
      context()
    );
    expect(ruling.refusal).toBe('level-written');
    expect(ruling.kept).toBeNull();
  });

  it('KEEPS the same word inside a sentence, because that is honest prose', () => {
    const ruling = validateArchSemanticAnswer(
      answer({
        claims: FIELDS.map((field) => ({
          field,
          text:
            field === 'does'
              ? 'The app is composed of three parts and this one is reached from main.'
              : 'a plain sentence',
          facts: [{ at: 'src/a.ts:10', why: 'x' }]
        }))
      }),
      context()
    );
    expect(ruling.refusal).toBeNull();
    expect(ruling.kept).not.toBeNull();
  });

  it('normalises a hyphen and a capital, so accepted-live and Accepted Live are one word', () => {
    for (const word of ['accepted-live', 'Accepted Live', 'accepted  live']) {
      const ruling = validateArchSemanticAnswer(
        answer({
          claims: FIELDS.map((field) => ({
            field,
            text: field === 'keeps' ? word : 'a plain sentence',
            facts: [{ at: 'src/a.ts:10', why: 'x' }]
          }))
        }),
        context()
      );
      expect(ruling.refusal, word).toBe('level-written');
    }
  });

  it('refuses a KEY that names a level even when its value does not', () => {
    const ruling = validateArchSemanticAnswer(
      answer({
        claims: FIELDS.map((field) => ({
          field,
          text: 'a plain sentence',
          evidence: 'something else entirely',
          facts: [{ at: 'src/a.ts:10', why: 'x' }]
        }))
      }),
      context()
    );
    expect(ruling.refusal).toBe('level-written');
  });
});

describe('R2, an unresolvable citation', () => {
  it('drops the ROW whole and keeps the rest', () => {
    const ruling = validateArchSemanticAnswer(
      answer({
        claims: FIELDS.map((field) => ({
          field,
          text: 'a plain sentence',
          facts: [
            { at: 'src/a.ts:10', why: 'good' },
            ...(field === 'limit' ? [{ at: 'src/gone.ts:1', why: 'bad' }] : [])
          ]
        }))
      }),
      context()
    );
    expect(ruling.refusal).toBeNull();
    expect(ruling.rowsDropped).toBe(1);
    expect(ruling.dropped).toContain('src/gone.ts:1');
    expect(ruling.kept?.kind).toBe('part');
    if (ruling.kept?.kind === 'part') {
      expect(ruling.kept.claims.map((one) => one.field)).not.toContain('limit');
      expect(ruling.kept.claims).toHaveLength(6);
    }
  });

  it('never trims a row down to its good citations', () => {
    const ruling = validateArchSemanticAnswer(
      answer({
        claims: FIELDS.map((field) => ({
          field,
          text: 'a plain sentence',
          facts: [
            { at: 'src/a.ts:10', why: 'good' },
            ...(field === 'does' ? [{ at: '../escape.ts:1', why: 'bad' }] : [])
          ]
        }))
      }),
      context()
    );
    if (ruling.kept?.kind === 'part') {
      const does = ruling.kept.claims.find((one) => one.field === 'does');
      expect(does).toBeUndefined();
    }
  });

  it('refuses the answer whole under no-row-stood when nothing is left', () => {
    const ruling = validateArchSemanticAnswer(
      answer({
        claims: FIELDS.map((field) => ({
          field,
          text: 'a plain sentence',
          facts: [{ at: 'src/gone.ts:1', why: 'bad' }]
        }))
      }),
      context()
    );
    expect(ruling.refusal).toBe('no-row-stood');
    expect(ruling.rowsDropped).toBe(7);
  });
});

describe('R3, the digit rule as a TOKEN', () => {
  it('catches three of three where the substring form catches one of three', () => {
    // The three research 118 §6.4 planted, with the block that hid two of them.
    const block = [
      'FACTS',
      'surface',
      '  session p117-lost-9 at src/a.ts:10',
      '  refusal 192.0.2.1 is refused at src/a.ts:11',
      'END FACTS'
    ].join('\n');
    const planted = ['17', '4096', '92'];
    const tokens = new Set(digitRuns(block));
    const byToken = planted.filter((run) => !tokens.has(run)).length;
    const bySubstring = planted.filter((run) => !block.includes(run)).length;
    expect(byToken).toBe(3);
    expect(bySubstring).toBe(1);
    // And the shipping validator agrees with the token half.
    for (const run of planted) {
      const ruling = validateArchSemanticAnswer(
        answer({
          claims: FIELDS.map((field) => ({
            field,
            text: field === 'limit' ? `a refresh is retried ${run} times` : 'a plain sentence',
            facts: [{ at: 'src/a.ts:10', why: 'x' }]
          }))
        }),
        context({ factBlock: block })
      );
      expect(ruling.refusal, run).toBe('invented-number');
    }
  });

  it('keeps a number the block really carries as a token', () => {
    const ruling = validateArchSemanticAnswer(
      answer({
        claims: FIELDS.map((field) => ({
          field,
          text: field === 'keeps' ? 'it holds 1068 parsed files' : 'a plain sentence',
          facts: [{ at: 'src/a.ts:10', why: 'x' }]
        }))
      }),
      context()
    );
    expect(ruling.refusal).toBeNull();
  });

  it('never reads a citation, whose line number is a digit run by construction', () => {
    // `src/a.ts:10` carries the run 10, which the block does carry; the point
    // is that a line number is judged by the grammar and the resolution and
    // never by this rule, so a citation to line 399 is kept.
    const ruling = validateArchSemanticAnswer(
      answer({
        claims: FIELDS.map((field) => ({
          field,
          text: 'a plain sentence',
          facts: [{ at: 'src/a.ts:399', why: 'a line the block never names' }]
        }))
      }),
      context()
    );
    expect(ruling.refusal).toBeNull();
  });
});

describe('the shape', () => {
  it('refuses an answer about another part', () => {
    const ruling = validateArchSemanticAnswer(
      answer({ part: 'src-renderer' }),
      context()
    );
    expect(ruling.refusal).toBe('wrong-part');
  });

  it('wants exactly one claim per field, and refuses a repeat', () => {
    expect(
      validateArchSemanticAnswer(
        answer({ claims: FIELDS.slice(0, 6).map((field) => ({ field, text: 'x', facts: [{ at: 'src/a.ts:10', why: 'x' }] })) }),
        context()
      ).refusal
    ).toBe('claim-fields');
    expect(
      validateArchSemanticAnswer(
        answer({
          claims: FIELDS.map((field, at) => ({
            field: at === 6 ? 'does' : field,
            text: 'x',
            facts: [{ at: 'src/a.ts:10', why: 'x' }]
          }))
        }),
        context()
      ).refusal
    ).toBe('claim-fields');
  });

  it('refuses a gate whose answer is a fifth word', () => {
    const ruling = validateArchSemanticAnswer(
      answer({
        gates: [
          {
            id: 'adopt-a-session',
            question: 'Will Tortie adopt it?',
            answer: 'maybe',
            because: 'it has no stamp',
            facts: [{ at: 'src/a.ts:10', why: 'x' }]
          }
        ]
      }),
      context()
    );
    expect(ruling.refusal).toBe('gate-invalid');
  });

  it('keeps a gate with one of the four and drops one whose citation is broken', () => {
    const ruling = validateArchSemanticAnswer(
      answer({
        gates: [
          {
            id: 'adopt-a-session',
            question: 'Will Tortie adopt it?',
            answer: 'stops',
            because: 'it has no stamp',
            facts: [{ at: 'src/a.ts:10', why: 'x' }]
          },
          {
            id: 'friday-deploy',
            question: 'Will it refuse a Friday?',
            answer: 'stops',
            because: 'invented',
            facts: [{ at: 'src/nowhere.ts:106', why: 'x' }]
          }
        ]
      }),
      context()
    );
    expect(ruling.kept?.kind).toBe('part');
    if (ruling.kept?.kind === 'part') {
      expect(ruling.kept.gates.map((one) => one.id)).toEqual(['adopt-a-session']);
    }
    expect(ruling.rowsDropped).toBe(1);
  });
});

describe('the journeys answer', () => {
  const walk = (over: Record<string, unknown> = {}): string =>
    JSON.stringify({
      journeys: [
        {
          id: 'start-and-return',
          name: 'starting a session and coming back to it',
          steps: [
            {
              partId: 'src-main',
              label: 'main writes the row',
              facts: [{ at: 'src/a.ts:10', why: 'x' }]
            },
            {
              partId: 'src-renderer',
              label: 'the window draws it',
              facts: [{ at: 'src/a.ts:10', why: 'x' }]
            }
          ]
        }
      ],
      ...over
    });

  it('keeps a walk whose steps name parts the partition holds', () => {
    const ruling = validateArchSemanticAnswer(walk(), context({ kind: 'journeys' }));
    expect(ruling.refusal).toBeNull();
    if (ruling.kept?.kind === 'journeys') {
      expect(ruling.kept.journeys[0]?.steps.map((one) => one.seq)).toEqual([1, 2]);
    }
  });

  it('refuses a step naming a part that is only a PREFIX of a real one', () => {
    const ruling = validateArchSemanticAnswer(
      JSON.stringify({
        journeys: [
          {
            id: 'start-and-return',
            name: 'a walk',
            steps: [{ partId: 'src-main-extra', label: 'x', facts: [{ at: 'src/a.ts:10', why: 'x' }] }]
          }
        ]
      }),
      context({ kind: 'journeys' })
    );
    expect(ruling.refusal).toBe('journey-invalid');
  });

  it('renumbers a walk that lost a step rather than leaving a gap', () => {
    const ruling = validateArchSemanticAnswer(
      JSON.stringify({
        journeys: [
          {
            id: 'start-and-return',
            name: 'a walk',
            steps: [
              { partId: 'src-main', label: 'one', facts: [{ at: 'src/gone.ts:1', why: 'x' }] },
              { partId: 'src-main', label: 'two', facts: [{ at: 'src/a.ts:10', why: 'x' }] }
            ]
          }
        ]
      }),
      context({ kind: 'journeys' })
    );
    expect(ruling.rowsDropped).toBe(1);
    if (ruling.kept?.kind === 'journeys') {
      expect(ruling.kept.journeys[0]?.steps).toEqual([
        expect.objectContaining({ seq: 1, label: 'two' })
      ]);
    }
  });

  it('refuses the journeys keys on a part ask and the part keys on a journeys ask', () => {
    expect(validateArchSemanticAnswer(walk(), context()).refusal).toBe('bad-shape');
    expect(
      validateArchSemanticAnswer(answer(), context({ kind: 'journeys' })).refusal
    ).toBe('bad-shape');
  });
});
