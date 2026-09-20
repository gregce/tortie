/**
 * The truth table behind the session manager's two activity columns
 * (Phase 293, spec section 3.4).
 *
 * `toActivity` is pure, so every row of the table is driven here with plain
 * objects: no store, no reader, no disk. The store's half of the same claim,
 * being what the SQL answers over records the PRODUCT reader read, is
 * store-activity.test.ts, and the orchestration is activity.test.ts.
 *
 * What this file holds down, in the words of the phase: NULL IS PRESERVED AND
 * NEVER BECOMES ZERO, and one clock is never drawn as another.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { OverviewSessionActivity } from '@shared/overview';
import {
  classifyActivityRow,
  isOnAnotherMachine,
  parseIsoMs,
  toActivity,
  type ActivityRowFacts
} from '../activity-map';
import { parseIsoMs as parseIsoMsFromService } from '../service';
import type { StoredActivity, StoredReadState } from '../store';

const ASK_AT = '2026-08-20T10:00:00.000Z';
const ANSWER_AT = '2026-08-20T10:05:00.000Z';
const TOUCHED_AT = '2026-08-20T10:06:00.000Z';
const READ_AT = 1_756_000_000_000;

function facts(over: Partial<ActivityRowFacts> = {}): ActivityRowFacts {
  return {
    id: 'S1',
    agent: 'claude',
    machineId: 'local',
    agentSessionId: 'aaaa',
    known: true,
    ...over
  };
}

/** A session read `ok` that holds three turns, the last one answered. */
function stored(over: Partial<StoredActivity> = {}): StoredActivity {
  return {
    sessionId: 'S1',
    provider: 'claude',
    readState: 'ok',
    lastReadAt: READ_AT,
    lastTouchedAt: TOUCHED_AT,
    turns: 3,
    userMessages: 3,
    agentReplies: 3,
    lastAskAt: ASK_AT,
    lastAnswerAt: ANSWER_AT,
    lastHasAnswer: true,
    ...over
  };
}

/** What the LEFT JOIN answers for a session that holds no turn: NULL everywhere. */
const NO_TURNS: Partial<StoredActivity> = {
  turns: null,
  userMessages: null,
  agentReplies: null,
  lastAskAt: null,
  lastAnswerAt: null,
  lastHasAnswer: null
};

/** The five value fields of invariant 1. `readAt` is not one of them. */
function values(a: OverviewSessionActivity): unknown[] {
  return [
    a.userMessages,
    a.agentMessages,
    a.lastMessageAt,
    a.lastMessageBy,
    a.lastMessageClock
  ];
}

const ALL_NULL = [null, null, null, null, null];

// ---------------------------------------------------------------------------
// Rows 1 to 4. Decided with no store and no disk.
// ---------------------------------------------------------------------------

describe('rows 1 to 4: decided from the manifest alone', () => {
  it('row 1: an id this Mac does not know is unavailable, unknown-session, all null', () => {
    const out = toActivity(facts({ known: false, agent: '' }), undefined);
    expect(out.coverage).toBe('unavailable');
    expect(out.reason).toBe('unknown-session');
    expect(values(out)).toEqual(ALL_NULL);
    expect(out.readAt).toBeNull();
    expect(out.sessionId).toBe('S1');
  });

  it('row 2: a session on another machine is unavailable, remote, all null', () => {
    const out = toActivity(facts({ machineId: 'm1' }), undefined);
    expect(out.coverage).toBe('unavailable');
    expect(out.reason).toBe('remote');
    expect(values(out)).toEqual(ALL_NULL);
  });

  it('row 3: a shell is NOT APPLICABLE, never unavailable and never zero', () => {
    const out = toActivity(
      facts({ agent: 'shell', agentSessionId: null }),
      undefined
    );
    expect(out.coverage).toBe('not-applicable');
    expect(out.reason).toBe('shell');
    expect(values(out)).toEqual(ALL_NULL);
    expect(out.userMessages).not.toBe(0);
  });

  it('row 4: no conversation id yet is unavailable, no-id, for null and for the empty string', () => {
    for (const agentSessionId of [null, '']) {
      const out = toActivity(facts({ agentSessionId }), undefined);
      expect(out.coverage).toBe('unavailable');
      expect(out.reason).toBe('no-id');
      expect(values(out)).toEqual(ALL_NULL);
    }
  });

  it('asks in the table order: unknown, then remote, then shell, then no id', () => {
    const everything = {
      known: false,
      machineId: 'm1',
      agent: 'shell',
      agentSessionId: null
    };
    expect(toActivity(facts(everything), undefined).reason).toBe(
      'unknown-session'
    );
    expect(
      toActivity(facts({ ...everything, known: true }), undefined).reason
    ).toBe('remote');
    expect(
      toActivity(facts({ ...everything, known: true, machineId: 'local' }), undefined)
        .reason
    ).toBe('shell');
  });

  it('never lets a stored row outvote the manifest: a leftover `ok` row under a remote session is still remote', () => {
    for (const over of [
      { known: false },
      { machineId: 'm1' },
      { agent: 'shell' },
      { agentSessionId: null }
    ]) {
      const out = toActivity(facts(over), stored());
      expect(out.coverage).not.toBe('complete');
      expect(values(out)).toEqual(ALL_NULL);
    }
  });

  it('classifyActivityRow answers null exactly when the row has a record worth reading', () => {
    expect(classifyActivityRow(facts())).toBeNull();
    expect(classifyActivityRow(facts({ agent: 'droid' }))).toBeNull();
    expect(classifyActivityRow(facts({ agent: 'shell' }))?.reason).toBe('shell');
    expect(classifyActivityRow(facts({ machineId: 'm1' }))?.reason).toBe('remote');
  });

  it('classifyActivityRow and toActivity cannot disagree on a classified row', () => {
    for (const over of [
      { known: false },
      { machineId: 'm1' },
      { agent: 'shell' },
      { agentSessionId: '' }
    ]) {
      expect(toActivity(facts(over), stored())).toEqual(
        classifyActivityRow(facts(over))
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Row 0, and rows 5 to 10. Decided from what the store holds after the refresh.
// ---------------------------------------------------------------------------

describe('row 0: the refresh threw, or wrote nothing', () => {
  it('is unavailable, unreadable, all null, and is an ANSWER so the cell never waits', () => {
    const out = toActivity(facts(), undefined);
    expect(out.coverage).toBe('unavailable');
    expect(out.reason).toBe('unreadable');
    expect(values(out)).toEqual(ALL_NULL);
    expect(out.readAt).toBeNull();
  });
});

describe('rows 5 to 7 and 10: a record Tortie cannot read right now', () => {
  it('row 5: no-store is unavailable, no-store, all null, even when turns are somehow stored', () => {
    for (const over of [NO_TURNS, {}]) {
      const out = toActivity(
        facts({ agent: 'droid' }),
        stored({ provider: 'droid', readState: 'no-store', ...over })
      );
      expect(out.coverage).toBe('unavailable');
      expect(out.reason).toBe('no-store');
      expect(values(out)).toEqual(ALL_NULL);
      expect(out.readAt).toBe(READ_AT);
    }
  });

  const MISSING: Array<[StoredReadState, string]> = [
    ['no-file', 'not-yet'],
    ['unreadable', 'unreadable'],
    ['wrong-conversation', 'wrong-conversation']
  ];

  it.each(MISSING)(
    'row 6: %s with NO stored turn is unavailable, %s, all null, and never a zero',
    (readState, reason) => {
      for (const none of [NO_TURNS, { ...NO_TURNS, turns: 0 }]) {
        const out = toActivity(facts(), stored({ readState, ...none }));
        expect(out.coverage).toBe('unavailable');
        expect(out.reason).toBe(reason);
        expect(values(out)).toEqual(ALL_NULL);
      }
    }
  );

  it.each(MISSING)(
    'row 7: %s WITH stored turns is partial, record-gone, and carries the stored counts',
    (readState) => {
      const out = toActivity(
        facts(),
        stored({ readState, turns: 5, userMessages: 6, agentReplies: 4 })
      );
      expect(out.coverage).toBe('partial');
      expect(out.reason).toBe('record-gone');
      expect(out.userMessages).toBe(6);
      expect(out.agentMessages).toBe(4);
      expect(out.lastMessageBy).toBe('agent');
      expect(out.lastMessageAt).toBe(Date.parse(ANSWER_AT));
      expect(out.lastMessageClock).toBe('message');
      expect(out.readAt).toBe(READ_AT);
    }
  );

  it('row 7 cannot be entered by a turn count with no sum beside it: that falls to row 6, never to a number', () => {
    const out = toActivity(
      facts(),
      stored({ readState: 'no-file', turns: 2, userMessages: null })
    );
    expect(out.coverage).toBe('unavailable');
    expect(values(out)).toEqual(ALL_NULL);
  });

  it.each(['shell', 'remote'] as StoredReadState[])(
    'row 10: a stored %s state the classifier did not catch is unavailable, unreadable, all null',
    (readState) => {
      const out = toActivity(facts(), stored({ readState }));
      expect(out.coverage).toBe('unavailable');
      expect(out.reason).toBe('unreadable');
      expect(values(out)).toEqual(ALL_NULL);
    }
  );

  it('row 10 also answers a read state this build has never heard of', () => {
    const out = toActivity(
      facts(),
      stored({ readState: 'something-later' as StoredReadState })
    );
    expect(out.coverage).toBe('unavailable');
    expect(out.reason).toBe('unreadable');
    expect(values(out)).toEqual(ALL_NULL);
  });
});

describe('rows 8 and 9: a record that WAS read, the only place a zero is made', () => {
  it('row 9: ok is complete with a null reason and both counts', () => {
    const out = toActivity(facts(), stored());
    expect(out).toEqual({
      sessionId: 'S1',
      coverage: 'complete',
      reason: null,
      userMessages: 3,
      agentMessages: 3,
      lastMessageAt: Date.parse(ANSWER_AT),
      lastMessageBy: 'agent',
      lastMessageClock: 'message',
      readAt: READ_AT
    });
  });

  it('row 9: ok with zero turns maps the NULL of the LEFT JOIN to 0, and has no last message', () => {
    const out = toActivity(facts(), stored(NO_TURNS));
    expect(out.coverage).toBe('complete');
    expect(out.reason).toBeNull();
    expect(out.userMessages).toBe(0);
    expect(out.agentMessages).toBe(0);
    expect(out.lastMessageAt).toBeNull();
    expect(out.lastMessageBy).toBeNull();
    expect(out.lastMessageClock).toBeNull();
  });

  it('row 8: gemini is partial, ask-only, and its NULL asks are 0 too, because a record was read', () => {
    const out = toActivity(
      facts({ agent: 'gemini' }),
      stored({ provider: 'gemini', ...NO_TURNS })
    );
    expect(out.coverage).toBe('partial');
    expect(out.reason).toBe('ask-only');
    expect(out.userMessages).toBe(0);
    expect(out.agentMessages).toBeNull();
  });

  it('row 8: gemini with zero replies on record is NULL, never 0, and stays partial', () => {
    const out = toActivity(
      facts({ agent: 'gemini' }),
      stored({
        provider: 'gemini',
        agentReplies: 0,
        lastAnswerAt: null,
        lastHasAnswer: false
      })
    );
    expect(out.coverage).toBe('partial');
    expect(out.userMessages).toBe(3);
    expect(out.agentMessages).toBeNull();
    expect(out.lastMessageBy).toBe('you');
  });

  it('row 8: gemini with replies on record carries the count', () => {
    const out = toActivity(
      facts({ agent: 'gemini' }),
      stored({ provider: 'gemini', agentReplies: 2 })
    );
    expect(out.coverage).toBe('partial');
    expect(out.reason).toBe('ask-only');
    expect(out.agentMessages).toBe(2);
  });

  it('codex: the user count is the SUM of queued asks, 4 over 3 turns, and never the turn count', () => {
    const out = toActivity(
      facts({ agent: 'codex' }),
      stored({ provider: 'codex', turns: 3, userMessages: 4, agentReplies: 3 })
    );
    expect(out.userMessages).toBe(4);
    expect(out.agentMessages).toBe(3);
  });

  it('NULL becomes 0 ONLY under `ok`: every other read state keeps the null', () => {
    const others: StoredReadState[] = [
      'no-file',
      'no-store',
      'unreadable',
      'wrong-conversation',
      'shell',
      'remote'
    ];
    for (const readState of others) {
      for (const provider of ['claude', 'gemini']) {
        const out = toActivity(facts(), stored({ readState, provider, ...NO_TURNS }));
        expect(out.userMessages).toBeNull();
        expect(out.agentMessages).toBeNull();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// The two invariants, over every row at once
// ---------------------------------------------------------------------------

describe('the two invariants', () => {
  const READ_STATES: StoredReadState[] = [
    'ok',
    'no-file',
    'no-store',
    'unreadable',
    'wrong-conversation',
    'shell',
    'remote'
  ];
  const FACTS: ActivityRowFacts[] = [
    facts(),
    facts({ agent: 'gemini' }),
    facts({ known: false }),
    facts({ machineId: 'm1' }),
    facts({ agent: 'shell' }),
    facts({ agentSessionId: null })
  ];
  const STORED: Array<StoredActivity | undefined> = [undefined];
  for (const readState of READ_STATES) {
    for (const provider of ['claude', 'gemini', 'deepseek']) {
      STORED.push(stored({ readState, provider }));
      STORED.push(stored({ readState, provider, ...NO_TURNS }));
      STORED.push(stored({ readState, provider, agentReplies: 0, lastHasAnswer: false }));
    }
  }
  const every: OverviewSessionActivity[] = [];
  for (const f of FACTS) for (const s of STORED) every.push(toActivity(f, s));

  it('covers all four coverages, so neither invariant passes by seeing nothing', () => {
    expect(new Set(every.map((a) => a.coverage))).toEqual(
      new Set(['complete', 'partial', 'unavailable', 'not-applicable'])
    );
  });

  it('1: unavailable and not-applicable carry five nulls', () => {
    for (const a of every) {
      if (a.coverage === 'unavailable' || a.coverage === 'not-applicable') {
        expect(values(a)).toEqual(ALL_NULL);
      }
    }
  });

  it('2: complete and partial carry a NUMBER of user messages, so no reader ever needs a fallback', () => {
    for (const a of every) {
      if (a.coverage === 'complete' || a.coverage === 'partial') {
        expect(typeof a.userMessages).toBe('number');
      }
    }
  });

  it('the reason is null exactly when the coverage is complete', () => {
    for (const a of every) {
      expect(a.reason === null).toBe(a.coverage === 'complete');
    }
  });

  it('the clock is null exactly when the time is null', () => {
    for (const a of every) {
      expect(a.lastMessageClock === null).toBe(a.lastMessageAt === null);
    }
  });

  it('a complete row always carries a number of agent replies, and only ask-only may carry null', () => {
    for (const a of every) {
      if (a.coverage === 'complete') expect(typeof a.agentMessages).toBe('number');
      if (a.coverage === 'partial' && a.agentMessages === null) {
        expect(a.reason).toBe('ask-only');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// The last message: who, when, and WHICH CLOCK
// ---------------------------------------------------------------------------

describe('the last message', () => {
  it('an answered last turn with its own clock is the agent, the reply time, clock message', () => {
    const out = toActivity(facts(), stored());
    expect(out.lastMessageBy).toBe('agent');
    expect(out.lastMessageAt).toBe(Date.parse(ANSWER_AT));
    expect(out.lastMessageClock).toBe('message');
  });

  it('antigravity: a last turn with no answer is YOU, at the ask time, clock message', () => {
    const out = toActivity(
      facts({ agent: 'antigravity' }),
      stored({
        provider: 'antigravity',
        agentReplies: 2,
        lastAnswerAt: null,
        lastHasAnswer: false
      })
    );
    expect(out.lastMessageBy).toBe('you');
    expect(out.lastMessageAt).toBe(Date.parse(ASK_AT));
    expect(out.lastMessageClock).toBe('message');
    expect(out.agentMessages).toBe(2);
  });

  // The first pass of this phase drew the PROMPT's time under "Agent reply".
  // The rule that fixes it names no provider: it asks what the stored turn
  // holds. So it is driven here under a name no agent has.
  it.each(['cursor', 'claude', 'an-agent-that-does-not-exist-yet'])(
    'a last turn WITH an answer and NO answer clock is clock ASK with the ask time, for provider %s',
    (provider) => {
      const out = toActivity(
        facts({ agent: provider }),
        stored({ provider, lastAnswerAt: null, lastHasAnswer: true })
      );
      expect(out.lastMessageBy).toBe('agent');
      expect(out.lastMessageAt).toBe(Date.parse(ASK_AT));
      expect(out.lastMessageClock).toBe('ask');
      expect(out.lastMessageClock).not.toBe('message');
    }
  );

  it('an answer clock that does not parse is no clock, and falls to the ask under clock ask', () => {
    const out = toActivity(
      facts(),
      stored({ lastAnswerAt: 'not a time', lastHasAnswer: true })
    );
    expect(out.lastMessageAt).toBe(Date.parse(ASK_AT));
    expect(out.lastMessageClock).toBe('ask');
  });

  it('reads the text clock one agent writes on a prompt, at minute resolution, under clock ask', () => {
    const tag = 'Thursday, Aug 20, 2026, 9:14 AM (UTC-4)';
    const out = toActivity(
      facts({ agent: 'cursor' }),
      stored({ provider: 'cursor', lastAskAt: tag, lastAnswerAt: null })
    );
    expect(out.lastMessageAt).not.toBeNull();
    expect((out.lastMessageAt ?? 1) % 60_000).toBe(0);
    expect(out.lastMessageClock).toBe('ask');
  });

  it('deepseek: no clock on either slot is the record’s updated time, clock SESSION, and the author stands', () => {
    const touched = '2026-08-10T19:57:47.358535Z';
    const out = toActivity(
      facts({ agent: 'deepseek' }),
      stored({
        provider: 'deepseek',
        agentReplies: 1,
        lastAskAt: null,
        lastAnswerAt: null,
        lastHasAnswer: false,
        lastTouchedAt: touched
      })
    );
    expect(out.coverage).toBe('complete');
    expect(out.lastMessageBy).toBe('you');
    expect(out.lastMessageAt).toBe(Date.parse(touched));
    expect(out.lastMessageClock).toBe('session');
  });

  it('an unanswered last turn never borrows the ask clock as `ask`: that clock means a reply was drawn', () => {
    const out = toActivity(
      facts(),
      stored({ lastAskAt: null, lastAnswerAt: null, lastHasAnswer: false })
    );
    expect(out.lastMessageClock).toBe('session');
  });

  it('nothing parses: the time and the clock are null and the AUTHOR IS KEPT', () => {
    for (const lastHasAnswer of [true, false]) {
      const out = toActivity(
        facts(),
        stored({
          lastAskAt: null,
          lastAnswerAt: null,
          lastTouchedAt: 'never',
          lastHasAnswer
        })
      );
      expect(out.lastMessageAt).toBeNull();
      expect(out.lastMessageClock).toBeNull();
      expect(out.lastMessageBy).toBe(lastHasAnswer ? 'agent' : 'you');
      expect(out.coverage).toBe('complete');
    }
  });

  it('with no turns all three are null, whatever the session clock says', () => {
    const out = toActivity(facts(), stored({ ...NO_TURNS, lastTouchedAt: TOUCHED_AT }));
    expect(out.lastMessageAt).toBeNull();
    expect(out.lastMessageBy).toBeNull();
    expect(out.lastMessageClock).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The helpers the service shares, and the purity the gate relies on
// ---------------------------------------------------------------------------

describe('the shared spelling of "on another machine"', () => {
  it('reads an absent id and this Mac’s id as here, and anything else as elsewhere', () => {
    expect(isOnAnotherMachine(undefined)).toBe(false);
    expect(isOnAnotherMachine('local')).toBe(false);
    expect(isOnAnotherMachine('m1')).toBe(true);
  });
});

describe('the one time parser', () => {
  it('is ONE function: the service re-exports this file’s, under the name it always had', () => {
    expect(parseIsoMsFromService).toBe(parseIsoMs);
  });

  it('answers null for null and for text that is no time', () => {
    expect(parseIsoMs(null)).toBeNull();
    expect(parseIsoMs('never')).toBeNull();
    expect(parseIsoMs(ASK_AT)).toBe(Date.parse(ASK_AT));
  });
});

describe('purity', () => {
  const source = readFileSync(join(__dirname, '..', 'activity-map.ts'), 'utf8');

  it('imports nothing that can open a file or a store: shared modules, and types', () => {
    const froms = [...source.matchAll(/^import\s+(type\s+)?[\s\S]*?from\s+'([^']+)';/gm)];
    expect(froms.length).toBeGreaterThan(0);
    for (const [, typeOnly, from] of froms) {
      const pure = (from ?? '').startsWith('@shared/');
      expect(pure || typeOnly !== undefined).toBe(true);
    }
  });

  it('never writes a fallback to zero with `??`: a zero is made by an explicit null test, in rows 8 and 9 only', () => {
    expect(source).not.toMatch(/\?\?\s*0/);
    expect([...source.matchAll(/=== null \? 0 :/g)]).toHaveLength(2);
  });
});
