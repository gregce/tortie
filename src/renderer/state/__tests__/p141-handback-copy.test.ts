/**
 * PHASE 141 — every sentence a person reads about an agent that left.
 *
 * WHAT THIS FILE EXISTS FOR. The copy in this phase carries the whole of its
 * honesty. There are three card sentences and four landing sentences, and the
 * one thing that must be true of all seven is that none of them ever claims an
 * agent is running. Research 64 section 7.3 named that refusal, because a card
 * that says an agent is there when it is not is worse than a card that says
 * nothing at all, and it is what Candidate C got wrong.
 *
 * Eight things are pinned below.
 *
 *  - The three card sentences are the three the research wrote, one per state.
 *  - The card names the clock time the agent left when there is one, and drops
 *    that clause rather than printing a fake time when there is not.
 *  - A row with no handback record reads EXACTLY what it read before this
 *    phase, which is what keeps the ordinary session untouched.
 *  - A row whose agent left never reads the old sentence, because "its
 *    conversation comes back after a restart" is true and points a person at a
 *    restart while their conversation is one press away in front of them.
 *  - The four landing sentences are four different sentences.
 *  - `absent` and `unknown` say different things, because a screen Tortie READ
 *    and found nothing on is a different claim from a screen Tortie could not
 *    read, and saying "it is not there" when nobody looked is the shape of
 *    dishonesty the restore gate already took apart.
 *  - Only `armed` is good news, so only `armed` is a success.
 *  - Not one of the seven sentences says an agent is running, and none of them
 *    reuses the remote wording, which says "on that machine" about a session
 *    that is on this Mac.
 *
 * The last block pins the reader that decides WHICH of the sentences a row
 * gets. It is a checked read rather than a field access, because the value
 * crossed a process boundary and it is the one field on that message whose
 * value decides whether a person is offered a verb that types into a live
 * session. A field that arrived misshapen is dropped whole and the row keeps
 * what it had, which is the rule an invalid configuration row already follows.
 */

import { describe, expect, it } from 'vitest';
import type { Session } from '@shared/types';
import {
  RESUME_IN_PLACE_LABEL,
  RESUME_IN_PLACE_SUBLABEL,
  RESUME_IN_PLACE_REFUSALS,
  RESUME_VERB,
  handbackNote,
  resumeInPlaceAnswerNote,
  resumeInPlaceLanded,
  resumeInPlaceNote,
  resumeInPlaceRefusalNote,
  resumeNote
} from '../resume';
import type { ResumeInPlaceLanding, SessionHandback } from '../resume';
import { readHandback } from '../subscriptions';

/** An ordinary armed claude row, which is what most of his sessions are. */
const ARMED: Pick<
  Session,
  | 'agent'
  | 'machine'
  | 'status'
  | 'agentSessionId'
  | 'resumeArgv'
  | 'resumeCapture'
> = {
  agent: 'claude',
  status: 'idle',
  agentSessionId: 'abc',
  resumeArgv: ['/usr/local/bin/claude', '--resume', 'abc'],
  resumeCapture: 'armed'
};

/** 2026-08-24 at 14:22 local, so the clause the card prints has a real time. */
const LEFT_AT = new Date(2026, 7, 24, 14, 22, 0).getTime();

function left(leftAt = LEFT_AT): SessionHandback {
  return { state: 'left', leftAt };
}

const LANDINGS: readonly ResumeInPlaceLanding[] = [
  'armed',
  'twice',
  'absent',
  'unknown'
];

const ALL_SENTENCES: readonly string[] = [
  handbackNote(left()),
  handbackNote({ state: 'returning', leftAt: LEFT_AT }),
  handbackNote({ state: 'unconfirmed', leftAt: LEFT_AT }),
  ...LANDINGS.map((x) => resumeInPlaceNote(x)),
  ...RESUME_IN_PLACE_REFUSALS.map((x) => resumeInPlaceRefusalNote(x))
];

describe('Phase 141 — the card sentences', () => {
  it('names the time the agent left and points at the prompt', () => {
    const note = handbackNote(left());
    expect(note).toContain('The agent left at ');
    expect(note).toContain('Its conversation is still here');
    expect(note).toContain('Resume puts the command back on your prompt.');
  });

  it('drops the time clause rather than printing a time it does not have', () => {
    const note = handbackNote(left(0));
    expect(note).toBe(
      'The agent left. Its conversation is still here, and Resume puts the ' +
        'command back on your prompt.'
    );
    expect(note).not.toContain(' at ');
  });

  it('says something is running and that Tortie is waiting to be told which', () => {
    expect(handbackNote({ state: 'returning', leftAt: LEFT_AT })).toBe(
      'Something is running here. Tortie is waiting to see which ' +
        'conversation it is.'
    );
  });

  it('says a different conversation is open and that Tortie kept the saved one', () => {
    expect(handbackNote({ state: 'unconfirmed', leftAt: LEFT_AT })).toBe(
      'A different conversation is open here. Tortie is still holding the ' +
        'one it saved.'
    );
  });

  it('gives three different sentences for the three states', () => {
    const notes = new Set([
      handbackNote(left()),
      handbackNote({ state: 'returning', leftAt: LEFT_AT }),
      handbackNote({ state: 'unconfirmed', leftAt: LEFT_AT })
    ]);
    expect(notes.size).toBe(3);
  });
});

describe('Phase 141 — the sentence on an ordinary row does not move', () => {
  it('reads exactly what it read before this phase with no record', () => {
    expect(resumeNote(ARMED)).toBe(
      'Its conversation comes back after a restart.'
    );
    expect(resumeNote(ARMED, undefined)).toBe(
      'Its conversation comes back after a restart.'
    );
  });

  it('never points a person at a restart once the agent has left', () => {
    const note = resumeNote(ARMED, left());
    expect(note).not.toContain('restart');
    expect(note).toBe(handbackNote(left()));
  });

  it('replaces the sentence in all three states', () => {
    for (const state of ['left', 'returning', 'unconfirmed'] as const) {
      const handback: SessionHandback = { state, leftAt: LEFT_AT };
      expect(resumeNote(ARMED, handback)).toBe(handbackNote(handback));
    }
  });

  /**
   * The re-verifier's finding (fix round). markLeft publishes 'left' on every
   * witnessed drop of a non shell agent, including agents that hand Tortie no
   * conversation id, so a record can sit on a row the verb predicate refuses.
   * The handback sentence must not win the slot there: it would say the
   * conversation is still here on a row with nothing to resume. The refused
   * row reads exactly what it read before any handback existed.
   */
  it('keeps the old sentence on a row the verb predicate refuses', () => {
    for (const state of ['left', 'returning', 'unconfirmed'] as const) {
      const handback: SessionHandback = { state, leftAt: LEFT_AT };
      expect(resumeNote({ ...ARMED, agentSessionId: undefined }, handback)).toBe(
        'Its conversation comes back after a restart.'
      );
    }
    expect(resumeNote({ ...ARMED, resumeArgv: [] }, left())).not.toBe(
      handbackNote(left())
    );
  });

  it('drops the left sentence once the session has ended, because the verb is gone', () => {
    expect(resumeNote({ ...ARMED, status: 'exited' }, left())).toBe(
      'Its conversation comes back after a restart.'
    );
  });
});

describe('Phase 141 — the four landings', () => {
  it('gives four different sentences', () => {
    expect(new Set(LANDINGS.map((x) => resumeInPlaceNote(x))).size).toBe(4);
  });

  it('tells the person the command is there and that they press Enter', () => {
    expect(resumeInPlaceNote('armed')).toBe(
      'The command is on your prompt. Press Enter to bring the ' +
        'conversation back.'
    );
  });

  it('keeps a screen it read apart from a screen it could not read', () => {
    expect(resumeInPlaceNote('absent')).toContain('it is not on the screen');
    expect(resumeInPlaceNote('unknown')).toContain(
      'could not read the screen'
    );
    expect(resumeInPlaceNote('unknown')).not.toContain('is not on the screen');
  });

  it('says nothing ran for each of the three that did not land', () => {
    for (const landing of ['twice', 'absent', 'unknown'] as const) {
      expect(resumeInPlaceNote(landing)).toContain('Nothing ran');
    }
  });

  it('treats only the armed landing as good news', () => {
    expect(resumeInPlaceLanded('armed')).toBe(true);
    for (const landing of ['twice', 'absent', 'unknown'] as const) {
      expect(resumeInPlaceLanded(landing)).toBe(false);
    }
  });
});

describe('Phase 141 — the refusals that bind every sentence', () => {
  it('never claims an agent is running', () => {
    for (const sentence of ALL_SENTENCES) {
      expect(sentence).not.toMatch(/agent is running/i);
      expect(sentence).not.toMatch(/the agent is (back|here|there)/i);
      expect(sentence).not.toMatch(/resumed the conversation/i);
    }
  });

  it('never says "on that machine", because this session is on this Mac', () => {
    for (const sentence of ALL_SENTENCES) {
      expect(sentence).not.toContain('that machine');
    }
  });

  it('never says Tortie pressed anything', () => {
    for (const sentence of ALL_SENTENCES) {
      expect(sentence).not.toMatch(/Tortie press(ed|es)(?! Enter)/);
    }
    // The two that mention Enter at all say who presses it, and it is not
    // Tortie. This is the promise the whole phase rests on.
    expect(resumeInPlaceNote('armed')).toContain('Press Enter');
    expect(resumeInPlaceNote('twice')).toContain('Tortie never presses Enter');
  });

  it('ends every sentence, so no card reads as a fragment', () => {
    for (const sentence of ALL_SENTENCES) {
      expect(sentence.trim().endsWith('.')).toBe(true);
    }
  });

  it('never uses a dash where a person reads a word', () => {
    for (const sentence of ALL_SENTENCES) {
      expect(sentence).not.toContain('—');
      expect(sentence).not.toContain('–');
    }
  });
});

describe('Phase 141 — the words the native menus carry', () => {
  it('names the verb the same way on the row and in the menus', () => {
    expect(RESUME_VERB).toBe('Resume');
    expect(RESUME_IN_PLACE_LABEL).toBe('Resume conversation');
  });

  it('says where the command goes and who presses Enter', () => {
    expect(RESUME_IN_PLACE_SUBLABEL).toBe(
      'The command goes on your prompt. You press Enter.'
    );
  });
});

describe('Phase 141 — reading the handback off the activity update', () => {
  const ID = 'sess-1';

  it('leaves the record alone when the update says nothing about it', () => {
    expect(readHandback({ sessionId: ID })).toBeUndefined();
    expect(readHandback({ sessionId: ID, excerpt: 'building' })).toBeUndefined();
  });

  it('clears the record for none and for null', () => {
    expect(
      readHandback({ sessionId: ID, handback: { state: 'none' } } as never)
    ).toBeNull();
    expect(readHandback({ sessionId: ID, handback: null } as never)).toBeNull();
  });

  it('takes each of the three states', () => {
    for (const state of ['left', 'returning', 'unconfirmed'] as const) {
      expect(
        readHandback({
          sessionId: ID,
          handback: { state, leftAt: LEFT_AT }
        } as never)
      ).toEqual({ state, leftAt: LEFT_AT });
    }
  });

  it('drops a misshapen record whole rather than half taking it', () => {
    const bad: unknown[] = [
      { state: 'gone', leftAt: LEFT_AT },
      { state: 7, leftAt: LEFT_AT },
      { leftAt: LEFT_AT },
      'left',
      42
    ];
    for (const handback of bad) {
      expect(
        readHandback({ sessionId: ID, handback } as never)
      ).toBeUndefined();
    }
  });

  it('keeps the state when only the time is missing, because the state is the fact', () => {
    expect(
      readHandback({ sessionId: ID, handback: { state: 'left' } } as never)
    ).toEqual({ state: 'left', leftAt: 0 });
    expect(
      readHandback({
        sessionId: ID,
        handback: { state: 'left', leftAt: 'soon' }
      } as never)
    ).toEqual({ state: 'left', leftAt: 0 });
  });

  it('a record with no time still gives the person a whole sentence', () => {
    const record = readHandback({
      sessionId: ID,
      handback: { state: 'left' }
    } as never);
    expect(record).not.toBeNull();
    expect(record).not.toBeUndefined();
    if (record !== null && record !== undefined) {
      expect(handbackNote(record)).toBe(handbackNote({ state: 'left', leftAt: 0 }));
    }
  });
});

// ---------------------------------------------------------------------------
// ADDED AT INTEGRATION. Main answers a press with either a landing or a
// refusal, and the store used to read only the landing half, so every refused
// press produced a toast with no words in it. These six sentences are the other
// half, and this is the file that owns every word a person reads about resume.
// ---------------------------------------------------------------------------

describe('Phase 141 — the six sentences for a press that typed nothing', () => {
  it('gives six different sentences', () => {
    const said = RESUME_IN_PLACE_REFUSALS.map((x) => resumeInPlaceRefusalNote(x));
    expect(new Set(said).size).toBe(said.length);
    expect(said.length).toBe(6);
  });

  it('says plainly in every one of them that nothing was typed', () => {
    for (const refusal of RESUME_IN_PLACE_REFUSALS) {
      const said = resumeInPlaceRefusalNote(refusal);
      expect(said).toMatch(/typed nothing|nothing to put back/u);
      expect(said.endsWith('.')).toBe(true);
    }
  });

  it('never asks a person to press Enter at the end of a command that is not there', () => {
    for (const refusal of RESUME_IN_PLACE_REFUSALS) {
      expect(resumeInPlaceRefusalNote(refusal)).not.toMatch(/press enter/iu);
    }
  });

  it('reads the landing when there is one and the refusal when there is not', () => {
    expect(resumeInPlaceAnswerNote({ landing: 'armed', refusal: null })).toBe(
      resumeInPlaceNote('armed')
    );
    expect(resumeInPlaceAnswerNote({ landing: null, refusal: 'running' })).toBe(
      resumeInPlaceRefusalNote('running')
    );
  });

  it('still gives a person words when main answers with neither half', () => {
    // A build of main this window does not understand, which is the case that
    // used to produce a toast with nothing in it.
    const said = resumeInPlaceAnswerNote({ landing: null, refusal: null });
    expect(said.length).toBeGreaterThan(0);
    const invented = resumeInPlaceAnswerNote({
      landing: null,
      refusal: 'a-reason-from-a-later-build'
    } as never);
    expect(invented).toBe(said);
  });
});
