/**
 * Phase 152 — the mapping from one session to the file its agent keeps the
 * conversation in, and the cache that makes it cheap enough to sit on the
 * projection.
 *
 * WHAT IS PROVED HERE, and it is deliberately narrow. The resolver itself is
 * Phase 137's and has its own conformance gate over a real fixture corpus
 * (`npm run conformance:overview`), so nothing here re-tests where claude keeps
 * its files. What is proved here is the part Phase 152 wrote: the four
 * short circuits that never ask the resolver at all, the mapping from each of
 * the resolver's five answers to what a person is told, and the cache, which
 * must never report a path that has gone.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Session, SessionMachine } from '@shared/types';

type Location = { state: string; file?: string; provider?: string; detail?: string };

const calls: { agent: string; agentSessionId: string | null }[] = [];
let answer: Location = { state: 'no-file', provider: 'claude' };
/** Milliseconds one resolve costs, so the pass budget can be driven. */
let costMs = 0;

vi.mock('../../overview/reader', () => ({
  resolveSessionLog: (input: { agent: string; agentSessionId: string | null }) => {
    calls.push({ agent: input.agent, agentSessionId: input.agentSessionId });
    if (costMs > 0) {
      const until = performance.now() + costMs;
      while (performance.now() < until) {
        /* the directory walk this stands in for */
      }
    }
    return answer;
  }
}));

const { clearRecordPathCache, stampRecordLocation, stampRecordLocations } = await import(
  '../record-path'
);

const CONVERSATION = '3f2a1b8c-0000-4000-8000-0000000091d4';

const STUDIO: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'green',
  answering: true,
  canRestore: true,
  restoreReason: null
};

function sess(over: Partial<Session> = {}): Session {
  return {
    id: 'sess-1',
    name: 'auth',
    tmuxName: 'auth',
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude',
    status: 'running',
    createdAt: 0,
    ...over
  };
}

let scratch: string;

beforeEach(() => {
  clearRecordPathCache();
  calls.length = 0;
  answer = { state: 'no-file', provider: 'claude' };
  costMs = 0;
  scratch = mkdtempSync(join(tmpdir(), 'p152-record-'));
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// The four short circuits: rows the resolver is never asked about
// ---------------------------------------------------------------------------

describe('the rows that never reach the resolver', () => {
  it('says a shell has no conversation and no record', () => {
    const out = stampRecordLocation(sess({ agent: 'shell' }));
    expect(out.recordPath).toBeUndefined();
    expect(out.recordAbsence).toBe('shell');
    expect(calls).toHaveLength(0);
  });

  /**
   * The important one. A conversation id means something on the machine whose
   * store holds it and nowhere else, so looking under THIS home directory for
   * a session that runs on another Mac could name a file belonging to a
   * different conversation. It is refused before the lookup rather than after.
   */
  it('refuses to look on this Mac for a session on another machine', () => {
    const out = stampRecordLocation(
      sess({ machine: STUDIO, agentSessionId: CONVERSATION })
    );
    expect(out.recordPath).toBeUndefined();
    expect(out.recordAbsence).toBe('remote');
    expect(calls).toHaveLength(0);
  });

  it('says there is no conversation id when the agent never wrote one', () => {
    expect(stampRecordLocation(sess()).recordAbsence).toBe('no-id');
    expect(stampRecordLocation(sess({ id: 'b', agentSessionId: '' })).recordAbsence).toBe(
      'no-id'
    );
    expect(calls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// The mapping from the resolver's five answers
// ---------------------------------------------------------------------------

describe('what each answer from the resolver becomes', () => {
  it('carries the path when the resolver resolved one', () => {
    const file = join(scratch, 'conversation.jsonl');
    writeFileSync(file, '{}\n');
    answer = { state: 'resolved', file };
    const out = stampRecordLocation(sess({ agentSessionId: CONVERSATION }));
    expect(out.recordPath).toBe(file);
    expect(out.recordAbsence).toBeUndefined();
  });

  /**
   * `wrong-conversation` is a real file and it IS this conversation id's
   * record. What is wrong is that the conversation names a different folder,
   * which Catch Me Up says. A copy verb hands over the path it proved.
   */
  it('carries the path when the record names a different folder', () => {
    const file = join(scratch, 'elsewhere.jsonl');
    writeFileSync(file, '{}\n');
    answer = { state: 'wrong-conversation', file, detail: 'somewhere else' };
    expect(stampRecordLocation(sess({ agentSessionId: CONVERSATION })).recordPath).toBe(
      file
    );
  });

  it('maps the three empty answers to their own reasons', () => {
    const cases: [string, string][] = [
      ['no-file', 'not-yet'],
      ['no-store', 'no-store'],
      ['unsupported', 'unsupported']
    ];
    for (const [state, absence] of cases) {
      clearRecordPathCache();
      answer = { state };
      const out = stampRecordLocation(sess({ agentSessionId: CONVERSATION }));
      expect(out.recordPath, state).toBeUndefined();
      expect(out.recordAbsence, state).toBe(absence);
    }
  });

  /**
   * THE FIX ROUND'S HARDENING. The resolver joins the id into a path, so an id
   * that walks out of the agent store would name a file under no store at all,
   * and this phase is what puts a path in front of a person. Nothing can put
   * such an id in the manifest today, so this proves the refusal rather than a
   * bug, and it never asks the resolver at all.
   */
  it('refuses a conversation id that would walk out of the store', () => {
    for (const bad of ['../../../../etc/passwd', 'a/b', '.', '..', 'a\\b']) {
      clearRecordPathCache();
      calls.length = 0;
      const out = stampRecordLocation(sess({ agentSessionId: bad }));
      expect(out.recordPath, bad).toBeUndefined();
      expect(out.recordAbsence, bad).toBe('no-id');
      expect(calls, bad).toHaveLength(0);
    }
  });

  it('always sets exactly one of the two fields', () => {
    const states = ['resolved', 'wrong-conversation', 'no-file', 'no-store', 'unsupported'];
    const file = join(scratch, 'one.jsonl');
    writeFileSync(file, '{}\n');
    for (const state of states) {
      clearRecordPathCache();
      answer = { state, file };
      const out = stampRecordLocation(sess({ agentSessionId: CONVERSATION }));
      const has = (out.recordPath !== undefined ? 1 : 0) + (out.recordAbsence !== undefined ? 1 : 0);
      expect(has, state).toBe(1);
    }
  });
});

// ---------------------------------------------------------------------------
// The cache
// ---------------------------------------------------------------------------

describe('the cache', () => {
  it('asks the resolver once for a row that has not changed', () => {
    const file = join(scratch, 'cached.jsonl');
    writeFileSync(file, '{}\n');
    answer = { state: 'resolved', file };
    const one = sess({ agentSessionId: CONVERSATION });
    for (let i = 0; i < 20; i += 1) stampRecordLocation(one);
    expect(calls).toHaveLength(1);
  });

  /**
   * The rule that matters most: a path a person cannot open is worse than no
   * path. A cached answer is re-checked with one stat, so a record the agent
   * deleted stops being offered on the next broadcast rather than on the next
   * restart.
   */
  it('stops reporting a path once the file is gone', () => {
    const file = join(scratch, 'doomed.jsonl');
    writeFileSync(file, '{}\n');
    answer = { state: 'resolved', file };
    const one = sess({ agentSessionId: CONVERSATION });
    expect(stampRecordLocation(one).recordPath).toBe(file);
    rmSync(file);
    answer = { state: 'no-file' };
    const after = stampRecordLocation(one);
    expect(after.recordPath).toBeUndefined();
    expect(after.recordAbsence).toBe('not-yet');
  });

  it('asks again when the conversation id arrives', () => {
    const before = stampRecordLocation(sess());
    expect(before.recordAbsence).toBe('no-id');
    const file = join(scratch, 'arrived.jsonl');
    writeFileSync(file, '{}\n');
    answer = { state: 'resolved', file };
    expect(stampRecordLocation(sess({ agentSessionId: CONVERSATION })).recordPath).toBe(
      file
    );
    expect(calls).toHaveLength(1);
  });

  /**
   * A conversation with no turns yet becomes a file the moment a person sends
   * their first message, so an empty answer has to expire while the app stays
   * open. Twenty seconds, driven by the injected clock rather than by waiting.
   */
  it('asks again for an empty answer once the window has passed', () => {
    const one = sess({ agentSessionId: CONVERSATION });
    stampRecordLocation(one, 1_000);
    stampRecordLocation(one, 10_000);
    expect(calls).toHaveLength(1);
    const file = join(scratch, 'later.jsonl');
    writeFileSync(file, '{}\n');
    answer = { state: 'resolved', file };
    expect(stampRecordLocation(one, 30_000).recordPath).toBe(file);
    expect(calls).toHaveLength(2);
  });

  /**
   * THE FIX ROUND'S DEFECT. Every unresolved row used to be given the same
   * window and have its clock reset in the same pass, so all of them came due
   * in the same later pass and the walk they share ran again for every one of
   * them inside one tick of the main process. Two hundred rows here, and no
   * two of them may come due in the same pass.
   */
  it('spreads when empty answers come due, so a pass never re-asks them all', () => {
    const due = new Map<number, number>();
    for (let i = 0; i < 200; i += 1) {
      clearRecordPathCache();
      const one = sess({ id: `sess-${i}`, agentSessionId: CONVERSATION });
      stampRecordLocation(one, 0);
      // Walk the clock forward until this row asks the resolver a second time.
      let at = 0;
      const before = calls.length;
      while (calls.length === before && at < 60_000) {
        at += 250;
        stampRecordLocation(one, at);
      }
      due.set(at, (due.get(at) ?? 0) + 1);
    }
    const worst = Math.max(...due.values());
    expect(due.size).toBeGreaterThan(20);
    expect(worst).toBeLessThan(30);
  });

  /** The promise the short window exists for still holds for a new session. */
  it('never waits longer than the window while the session is new', () => {
    for (let i = 0; i < 200; i += 1) {
      clearRecordPathCache();
      const one = sess({ id: `new-${i}`, agentSessionId: CONVERSATION });
      const before = calls.length;
      stampRecordLocation(one, 0);
      stampRecordLocation(one, 20_000);
      expect(calls.length - before, `new-${i}`).toBe(2);
    }
  });

  /**
   * A session that has had no record for a minute is not the case the short
   * window was written for, so the asking slows down and stops costing a
   * directory walk every twenty seconds for the rest of the day.
   */
  it('asks less often once a row has missed several times in a row', () => {
    const one = sess({ agentSessionId: CONVERSATION });
    let at = 0;
    const gaps: number[] = [];
    let last = 0;
    while (at < 600_000) {
      const before = calls.length;
      stampRecordLocation(one, at);
      if (calls.length > before && at > 0) {
        gaps.push(at - last);
        last = at;
      }
      at += 250;
    }
    expect(gaps.length).toBeGreaterThan(4);
    expect(gaps[0]).toBeLessThanOrEqual(20_000);
    expect(gaps[gaps.length - 1]).toBeGreaterThan(20_000);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(120_000);
  });

  /** Finding the record puts the row back on the short window at once. */
  it('starts the count again once a path is found', () => {
    const one = sess({ agentSessionId: CONVERSATION });
    for (let at = 0; at < 600_000; at += 250) stampRecordLocation(one, at);
    const file = join(scratch, 'appeared.jsonl');
    writeFileSync(file, '{}\n');
    answer = { state: 'resolved', file };
    // The row is slow now, so walk far enough forward that it asks again.
    let at = 600_000;
    const before = calls.length;
    while (calls.length === before && at < 900_000) {
      at += 250;
      stampRecordLocation(one, at);
    }
    expect(stampRecordLocation(one, at).recordPath).toBe(file);
    rmSync(file);
    answer = { state: 'no-file' };
    expect(stampRecordLocation(one, at + 250).recordAbsence).toBe('not-yet');
    const asked = calls.length;
    // Back on the short window: one more empty answer comes due inside it.
    stampRecordLocation(one, at + 250 + 20_000);
    expect(calls.length).toBe(asked + 1);
  });

  /**
   * The pass, not the row, is what has to stay cheap. Spreading the rows apart
   * is not enough on its own, because a handful of them still land in the same
   * pass now and then, so a pass carries a budget for RE-asking. A row Tortie
   * has never asked about is never held back, because there is no earlier
   * answer to stand in for it.
   */
  it('holds re-asking to a budget for the pass, and never holds back a first ask', () => {
    const many: Session[] = [];
    for (let i = 0; i < 60; i += 1) {
      many.push(sess({ id: `many-${i}`, agentSessionId: CONVERSATION }));
    }
    costMs = 5;
    // Nothing is cached, so every row is a first ask and every one is asked.
    stampRecordLocations(many, 0);
    expect(calls).toHaveLength(60);
    // Long enough that every one of them is due again.
    calls.length = 0;
    const out = stampRecordLocations(many, 10_000_000);
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.length).toBeLessThan(20);
    // Every row still carries an answer, including the ones held back.
    expect(out).toHaveLength(60);
    for (const one of out) expect(one.recordAbsence).toBe('not-yet');
  });

  /** A row held back keeps its place, so the next pass asks about it first. */
  it('does not reset the clock of a row it held back', () => {
    const many: Session[] = [];
    for (let i = 0; i < 60; i += 1) {
      many.push(sess({ id: `queue-${i}`, agentSessionId: CONVERSATION }));
    }
    costMs = 5;
    stampRecordLocations(many, 0);
    calls.length = 0;
    stampRecordLocations(many, 10_000_000);
    const first = new Set(calls.map((c) => c.agentSessionId === null));
    expect(first.size).toBeGreaterThan(0);
    const asked = calls.length;
    calls.length = 0;
    // The very next pass, one millisecond later, asks about more of them
    // rather than waiting another window.
    stampRecordLocations(many, 10_000_001);
    expect(calls.length).toBeGreaterThan(0);
    expect(asked + calls.length).toBeLessThanOrEqual(60);
  });

  it('never mutates the session it was handed', () => {
    const file = join(scratch, 'pure.jsonl');
    writeFileSync(file, '{}\n');
    answer = { state: 'resolved', file };
    const one = sess({ agentSessionId: CONVERSATION });
    const out = stampRecordLocation(one);
    expect(one.recordPath).toBeUndefined();
    expect(out).not.toBe(one);
  });
});
