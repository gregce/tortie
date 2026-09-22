/**
 * Phase 312 — the renderer's side of the choices the agent drew.
 *
 * `src/renderer/choice.ts` is the one place a surface asks whether a session is
 * at a numbered choice, so these are the rules that stop a later round widening
 * it into something else. The main-side detector has its own gate; nothing here
 * re-tests the regexes.
 *
 * The reader is the part worth running. It is the renderer's only defence
 * against an `activity:changed` update from a build of main that does not agree
 * with this window — and for this field the consequence of getting it wrong is
 * specific: a half-read list of things a person is being asked to choose
 * between is drawn under a sentence saying the agent is waiting, and the person
 * presses a numeral that belongs to something else. So every misshapen shape
 * below must be dropped WHOLE, which is the configuration overlay's rule
 * (Phase 23) applied to a message instead of to a file.
 */

import { describe, expect, it } from 'vitest';
import type {
  SessionActivityInfo,
  SessionChoiceInfo
} from '@shared/ipc/sessions';
import {
  CHOICE_NOT_PRESSABLE,
  atNumberedChoice,
  choiceOptionsFor,
  readChoice,
  readQuestion
} from '../choice';

/** An update carrying whatever main is claimed to have sent. */
function update(choice: unknown): SessionActivityInfo {
  return { sessionId: 'one', ...(choice === undefined ? {} : { choice }) } as
    SessionActivityInfo;
}

const THREE: SessionChoiceInfo = {
  atChoice: true,
  options: [
    { marker: '1', text: 'Yes' },
    { marker: '2', text: 'Yes, allow all edits during this session' },
    { marker: '3', text: 'No' }
  ]
};

describe('readChoice — the three answers, and they are not interchangeable', () => {
  it('says nothing about the choice when the field is absent', () => {
    expect(readChoice(update(undefined))).toBeUndefined();
  });

  it('is a CLEAR when main says the session is not at a choice', () => {
    // The explicit false is the whole reason the renderer never has to read a
    // clear out of an absence. `null` is what deletes the record.
    expect(readChoice(update({ atChoice: false }))).toBeNull();
  });

  it('is a clear for a bare null too', () => {
    expect(readChoice(update(null))).toBeNull();
  });

  it('reads the options when the session is at a choice', () => {
    expect(readChoice(update(THREE))).toEqual(THREE);
  });
});

describe('readChoice — the marker is the agent’s, never the index', () => {
  it('keeps a gap in the numbering rather than renumbering it', () => {
    // The shape that makes an index-derived numeral a lie: an agent whose
    // second drawn option is marked 4.
    const read = readChoice(
      update({
        atChoice: true,
        options: [
          { marker: '1', text: 'Yes' },
          { marker: '4', text: 'No' }
        ]
      })
    );
    expect(read).not.toBeNull();
    expect(read).not.toBeUndefined();
    const options = choiceOptionsFor(read as SessionChoiceInfo);
    expect(options.map((o) => o.marker)).toEqual(['1', '4']);
    // An index would have said 1 and 2, and the person would press the wrong
    // key. This is the assertion that rules that out.
    expect(options.map((o) => o.marker)).not.toEqual(['1', '2']);
  });

  it('keeps a two-digit marker whole', () => {
    const read = readChoice(
      update({
        atChoice: true,
        options: [
          { marker: '9', text: 'nine' },
          { marker: '10', text: 'ten' }
        ]
      })
    );
    expect(choiceOptionsFor(read as SessionChoiceInfo)[1]?.marker).toBe('10');
  });

  it('keeps the drawn ORDER, and does not sort by marker', () => {
    const read = readChoice(
      update({
        atChoice: true,
        options: [
          { marker: '3', text: 'third drawn first' },
          { marker: '1', text: 'first drawn second' }
        ]
      })
    );
    expect(
      choiceOptionsFor(read as SessionChoiceInfo).map((o) => o.marker)
    ).toEqual(['3', '1']);
  });
});

describe('readChoice — every misshapen CHOICE is dropped whole', () => {
  const dropped: ReadonlyArray<[string, unknown]> = [
    ['a string where the object goes', 'atChoice'],
    ['a number', 7],
    ['a boolean', true],
    ['no atChoice at all', { options: [] }],
    ['atChoice as the string "true"', { atChoice: 'true', options: [] }],
    ['atChoice true with no options field', { atChoice: true }],
    ['options as a string', { atChoice: true, options: 'Yes' }],
    ['options as an object', { atChoice: true, options: { 0: 'Yes' } }],
    ['an option that is a bare string', { atChoice: true, options: ['1. Yes'] }],
    ['an option that is null', { atChoice: true, options: [null] }],
    [
      'an option with no marker',
      { atChoice: true, options: [{ text: 'Yes' }] }
    ],
    [
      'an option with an empty marker',
      { atChoice: true, options: [{ marker: '', text: 'Yes' }] }
    ],
    [
      'an option whose marker is a number',
      { atChoice: true, options: [{ marker: 1, text: 'Yes' }] }
    ],
    [
      'an option with no text',
      { atChoice: true, options: [{ marker: '1' }] }
    ],
    [
      'ONE bad option among good ones',
      {
        atChoice: true,
        options: [
          { marker: '1', text: 'Yes' },
          { marker: 2, text: 'No' }
        ]
      }
    ],
    ['at a choice with an empty option list', { atChoice: true, options: [] }]
  ];

  for (const [name, raw] of dropped) {
    it(`drops ${name}`, () => {
      // `undefined` is the drop: the record keeps whatever it had, and the row
      // draws the excerpt it drew before this phase. It is deliberately NOT
      // `null`, which would delete a record main never said to delete.
      expect(readChoice(update(raw))).toBeUndefined();
    });
  }

  it('never partially merges: one bad option loses the good ones too', () => {
    const read = readChoice(
      update({
        atChoice: true,
        options: [
          { marker: '1', text: 'Yes' },
          { marker: '2', text: 'No' },
          { marker: 3, text: 'Cancel' }
        ]
      })
    );
    expect(read).toBeUndefined();
    // The failure this rules out is a list of two options drawn under a
    // question that offered three.
    expect(choiceOptionsFor(read ?? undefined)).toEqual([]);
  });

  it('keeps an empty option TEXT, because a blank row is what the agent drew', () => {
    // An empty marker is a shape error; empty text is not. `1.` with nothing
    // after it is a row the agent drew and the person can see.
    const read = readChoice(
      update({ atChoice: true, options: [{ marker: '1', text: '' }] })
    );
    expect(read).toEqual({
      atChoice: true,
      options: [{ marker: '1', text: '' }]
    });
  });
});

describe('choiceOptionsFor / atNumberedChoice — the one question', () => {
  it('draws nothing for a session with no record', () => {
    expect(choiceOptionsFor(undefined)).toEqual([]);
    expect(atNumberedChoice(undefined)).toBe(false);
  });

  it('draws nothing when main says the session is not at a choice', () => {
    expect(choiceOptionsFor({ atChoice: false })).toEqual([]);
    expect(atNumberedChoice({ atChoice: false })).toBe(false);
  });

  it('draws the rows when it is', () => {
    expect(choiceOptionsFor(THREE)).toEqual(THREE.options);
    expect(atNumberedChoice(THREE)).toBe(true);
  });

  it('agrees with itself: the question and the list never disagree', () => {
    const cases: ReadonlyArray<SessionChoiceInfo | undefined> = [
      undefined,
      { atChoice: false },
      THREE
    ];
    for (const c of cases) {
      expect(atNumberedChoice(c)).toBe(choiceOptionsFor(c).length > 0);
    }
  });
});

describe('readQuestion — the one composed question, read structurally', () => {
  /** An update carrying whatever main is claimed to have sent for `question`. */
  const q = (question: unknown): SessionActivityInfo =>
    ({
      sessionId: 'one',
      ...(question === undefined ? {} : { question })
    }) as SessionActivityInfo;

  it('says nothing when the field is absent', () => {
    expect(readQuestion(q(undefined))).toBeUndefined();
  });

  it('reads a question main composed', () => {
    expect(readQuestion(q('Do you want to make this edit to note.txt?'))).toBe(
      'Do you want to make this edit to note.txt?'
    );
  });

  it("reads an empty string as MAIN'S OWN CLEAR, and never as a question", () => {
    // Phase 311's landing is what made this arm exist. Main sends the clear as
    // an explicit empty string on the tick the wait ends — whatever ended it, a
    // hook, the person typing, or the dialog leaving the screen — so no surface
    // has to read a clear out of an absence, and the record goes rather than
    // holding what the session used to ask. A blank drawn where a sentence
    // belongs would read as a bug in the agent, so it is never the third answer.
    expect(readQuestion(q(''))).toBeNull();
    expect(readQuestion(q(''))).not.toBe('');
  });

  it.each([
    ['a number', 7],
    ['a null', null],
    ['an object', { text: 'Do you want to?' }],
    ['an array', ['Do you want to?']],
    ['a boolean', true]
  ])('drops %s rather than drawing it', (_name, value) => {
    expect(readQuestion(q(value))).toBeUndefined();
    // And a misshapen value is NOT the clear either. Dropping an update from a
    // build of main this window does not agree with is not the same claim as
    // being told there is no question, and reading it as one would empty a row
    // that is still asking something.
    expect(readQuestion(q(value))).not.toBeNull();
  });
});

describe('the words, and where they come from', () => {
  it('says the drawn options are answered in the session', () => {
    // The phone mock draws this sentence over its own option cards
    // (docs/design/phone/Choice.html), so the desktop and the phone say one
    // thing. A character of drift here is a character of drift there.
    expect(CHOICE_NOT_PRESSABLE).toBe('Answer this in the session.');
  });
});
