/**
 * THE ONE WRITE PATH (Phase 317, build/p317/SPEC.md §5.3.4), driven step by
 * step over a recording fake of what it is handed.
 *
 * What this file proves that reading `../writes.ts` cannot:
 *
 *  - THE ORDER: a malformed body is answered before the ledger, the ledger
 *    before the claim, the claim before the last check, and the last check is
 *    the last thing asked before the act, with no await between (a flag a
 *    microtask flips after the check is read by the act still unflipped).
 *  - EVERY REFUSAL, on its outcome, reason and sentence, and on the recorder's
 *    count of acts.
 *  - THE LEDGER on a fake clock: a repeated write id answers its recorded body
 *    and acts on nothing until exactly `2 * POCKET_CLOCK_SKEW_MS` has passed;
 *    the caps of 512 a phone and 4,096 in all answer `busy` and evict nothing.
 *  - `acted`: on the act's answer, on a recorded hit, and on the `busy` a
 *    same-id duplicate in flight gets, and NOT on any other `busy` (§14
 *    finding 9); a pending entry that never acted leaves nothing behind (§14
 *    finding 16).
 *  - THE ECHO of a well-formed write id inside a malformed body (§14 finding
 *    14), and the worst legal body measured against its cap (§14 finding 17).
 *  - ONE LOG LINE per write that acted, naming the verb, the outcome word and
 *    the session id, and nothing else.
 *
 * Nothing here opens a socket, reads a file or touches Electron.
 */

import { describe, expect, it, vi } from 'vitest';

/** Every line the log wrote, with its fields. */
const logged: { level: string; msg: string; fields: Record<string, unknown> | undefined }[] = [];

vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const capture =
    (level: string) =>
    (msg: string, fields?: Record<string, unknown>): void => {
      logged.push({ level, msg, fields });
    };
  return {
    ...real,
    getLog: () => ({ error: capture('error'), warn: capture('warn'), info: capture('info'), debug: capture('debug') })
  };
});

const writesModule = await import('../writes');
const {
  createPocketWriteHandler,
  parseEndBody,
  POCKET_WRITE_LEDGER_MAX,
  POCKET_WRITE_LEDGER_MS,
  POCKET_WRITE_LEDGER_PER_PHONE
} = writesModule;
const { POCKET_ROUTES } = await import('../door/table');
const { POCKET_WRITE_BODY_CAPS } = await import('../door/limits');
const { POCKET_CLOCK_SKEW_MS } = await import('../pairing');
const { POCKET_WRITE_SENTENCES } = await import('@shared/ipc/pocket');
const { END_FAILED } = await import('@shared/lifecycle-words');
type PocketWriteDeps = import('../writes').PocketWriteDeps;
type PocketEndOutcome = import('../routes').PocketEndOutcome;
type PocketRoute = import('../door/table').PocketRoute;
type DoorAnswer = import('../bind').DoorAnswer;
type DoorAdmission = import('../bind').DoorAdmission;
type PocketWriteAnswer = import('@shared/ipc/pocket').PocketWriteAnswer;

const END = POCKET_ROUTES.find((r) => r.id === 'end') as PocketRoute;
const BLOCKED = POCKET_ROUTES.find((r) => r.id === 'blocked') as PocketRoute;
const OPEN: DoorAdmission = { stopping: () => false };

/** A write id: 32 lowercase hex, distinct per `n`. */
function wid(n: number): string {
  return n.toString(16).padStart(32, '0');
}

function endBody(session: string, write: string, batch = false): Buffer {
  return Buffer.from(JSON.stringify({ session, write, batch }), 'utf8');
}

function parsed(answer: DoorAnswer): PocketWriteAnswer {
  expect(answer.status).toBe(200);
  return JSON.parse(answer.body as string) as PocketWriteAnswer;
}

/** A deferred, so a test can hold an act open and look at the world meanwhile. */
function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

interface Rig {
  readonly handle: ReturnType<typeof createPocketWriteHandler>;
  /** Every act the recording fake was asked for, in order. */
  readonly ends: { sessionId: string; batch: boolean }[];
  /** What was asked, in order: `shuttingDown`, `stillPaired`, `end`. */
  readonly asked: string[];
  clock: number;
  paired: boolean;
  quitting: boolean;
  /** What `end` answers next, or a function that answers it. */
  endWith: () => Promise<PocketEndOutcome>;
}

function rig(over: { writes?: false } = {}): Rig {
  const self: Rig = {
    handle: undefined as unknown as Rig['handle'],
    ends: [],
    asked: [],
    clock: 1_000_000,
    paired: true,
    quitting: false,
    endWith: async () => ({ outcome: 'done' })
  };
  const deps: PocketWriteDeps = {
    shuttingDown: () => {
      self.asked.push('shuttingDown');
      return self.quitting;
    },
    stillPaired: () => {
      self.asked.push('stillPaired');
      return self.paired;
    },
    now: () => self.clock,
    ...(over.writes === false
      ? {}
      : {
          writes: {
            end: (input: { sessionId: string; batch: boolean }) => {
              self.asked.push('end');
              self.ends.push(input);
              return self.endWith();
            }
          }
        })
  };
  (self as { handle: Rig['handle'] }).handle = createPocketWriteHandler(deps);
  return self;
}

// ---------------------------------------------------------------------------

describe('the body caps, computed from the worst legal body (§5.3.3, §14 finding 17)', () => {
  const longest = 'A'.repeat(128);

  it('measures the worst end body at 199 bytes (198 with batch true)', () => {
    expect(JSON.stringify({ session: longest, write: wid(1), batch: false }).length).toBe(199);
    expect(JSON.stringify({ session: longest, write: wid(1), batch: true }).length).toBe(198);
    // In any key order, because the phone sorts its keys and a client need not.
    expect(JSON.stringify({ write: wid(1), batch: false, session: longest }).length).toBe(199);
    expect(JSON.stringify({ batch: false, session: longest, write: wid(1) }).length).toBe(199);
  });

  it('holds it under its cap, the one write route has the one cap, and the worst legal body parses', () => {
    expect(POCKET_WRITE_BODY_CAPS).toEqual({ end: 512 });
    expect(endBody(longest, wid(1)).byteLength).toBeLessThanOrEqual(POCKET_WRITE_BODY_CAPS.end);
    // The whole alphabet at the longest length.
    const every = 'aZ09._:-'.repeat(16);
    expect(every).toHaveLength(128);
    expect(parseEndBody(endBody(every, wid(1)))).toEqual({ ok: true, verb: 'end', write: wid(1), session: every, batch: false });
  });
});

// ---------------------------------------------------------------------------

describe('step 1, the strict parse', () => {
  const W = wid(7);
  const malformedEnds: [string, string][] = [
    ['not JSON', '{"session":"s1",'],
    ['an array', '["s1"]'],
    ['null', 'null'],
    ['a string', '"s1"'],
    ['a fourth key', JSON.stringify({ session: 's1', write: W, batch: false, x: 1 })],
    ['a missing key', JSON.stringify({ session: 's1', write: W })],
    ['a write of 31 hex', JSON.stringify({ session: 's1', write: W.slice(1), batch: false })],
    ['a write of 33 hex', JSON.stringify({ session: 's1', write: `${W}0`, batch: false })],
    ['an uppercase write', JSON.stringify({ session: 's1', write: W.toUpperCase().replace(/0/g, 'A'), batch: false })],
    ['a write that is not hex', JSON.stringify({ session: 's1', write: 'g'.repeat(32), batch: false })],
    ['an empty session', JSON.stringify({ session: '', write: W, batch: false })],
    ['a session of 129', JSON.stringify({ session: 'a'.repeat(129), write: W, batch: false })],
    ['a session with a slash', JSON.stringify({ session: 'a/b', write: W, batch: false })],
    ['a session with a space', JSON.stringify({ session: 'a b', write: W, batch: false })],
    ['a session with a newline', JSON.stringify({ session: 'a\nb', write: W, batch: false })],
    ['a session that is a number', JSON.stringify({ session: 7, write: W, batch: false })],
    ['a batch that is a string', JSON.stringify({ session: 's1', write: W, batch: 'false' })],
    ['a batch that is a number', JSON.stringify({ session: 's1', write: W, batch: 0 })],
    ['a __proto__ key', '{"session":"s1","write":"' + W + '","batch":false,"__proto__":{}}']
  ];

  for (const [name, text] of malformedEnds) {
    it(`refuses an end body with ${name}: 200, refused, malformed, the door's sentence, and nothing acts`, async () => {
      const r = rig();
      const answer = await r.handle(END, Buffer.from(text, 'utf8'), 'phone-a', OPEN);
      const body = parsed(answer);
      expect(body.verb).toBe('end');
      expect(body.outcome).toBe('refused');
      expect(body.reason).toBe('malformed');
      expect(body.sentence).toBe(POCKET_WRITE_SENTENCES.unreadable);
      expect(answer.acted).toBeUndefined();
      expect(r.ends).toEqual([]);
      // Nothing past the parse was asked.
      expect(r.asked).toEqual([]);
    });
  }

  // §14 finding 14: an empty echo could never be drawn for a body the phone
  // made, so a well-formed id is echoed whatever else is wrong.
  it('echoes a well-formed write id inside a malformed body, and "" only when there is none', async () => {
    const r = rig();
    const kept = parsed(await r.handle(END, Buffer.from(JSON.stringify({ session: 's/1', write: W, batch: false })), 'phone-a', OPEN));
    expect(kept.write).toBe(W);
    const extra = parsed(await r.handle(END, Buffer.from(JSON.stringify({ session: 's1', write: W, batch: false, more: 1 })), 'phone-a', OPEN));
    expect(extra.write).toBe(W);
    const none = parsed(await r.handle(END, Buffer.from(JSON.stringify({ session: 's1', write: 'nope', batch: false })), 'phone-a', OPEN));
    expect(none.write).toBe('');
    const garbage = parsed(await r.handle(END, Buffer.from('}{'), 'phone-a', OPEN));
    expect(garbage.write).toBe('');
  });

  it('records nothing for a malformed body: the same id, well formed, acts', async () => {
    const r = rig();
    await r.handle(END, Buffer.from(JSON.stringify({ session: 's/1', write: W, batch: false })), 'phone-a', OPEN);
    const body = parsed(await r.handle(END, endBody('s1', W), 'phone-a', OPEN));
    expect(body.outcome).toBe('done');
    expect(r.ends).toEqual([{ sessionId: 's1', batch: false }]);
  });

  it('answers the five fields, in order, and no sixth', async () => {
    const r = rig();
    const answer = await r.handle(END, endBody('s1', W), 'phone-a', OPEN);
    expect(Object.keys(JSON.parse(answer.body as string))).toEqual(['verb', 'write', 'outcome', 'reason', 'sentence']);
    expect(parsed(answer)).toEqual({ verb: 'end', write: W, outcome: 'done', reason: null, sentence: null });
  });
});

// ---------------------------------------------------------------------------

describe('a host with no writes', () => {
  it('answers the write route 404 before anything, a malformed body included', async () => {
    const r = rig({ writes: false });
    for (const body of [endBody('s1', wid(1)), Buffer.from('not json')]) {
      expect(await r.handle(END, body, 'phone-a', OPEN)).toEqual({ status: 404, body: null });
    }
    expect(r.asked).toEqual([]);
  });

  it('answers a read route handed to it 404, and acts on nothing', async () => {
    const r = rig();
    expect(await r.handle(BLOCKED, endBody('s1', wid(1)), 'phone-a', OPEN)).toEqual({ status: 404, body: null });
    expect(r.asked).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('step 4, the last check, then the act with nothing between', () => {
  it('asks the quit, the door and the phone, in that order, and the act is the next thing asked', async () => {
    const r = rig();
    let stoppingAsked = false;
    const door: DoorAdmission = {
      stopping: () => {
        r.asked.push('stopping');
        stoppingAsked = true;
        return false;
      }
    };
    await r.handle(END, endBody('s1', wid(1)), 'phone-a', door);
    expect(stoppingAsked).toBe(true);
    expect(r.asked).toEqual(['shuttingDown', 'stopping', 'stillPaired', 'end']);
  });

  it('awaits nothing between the check and the act: a microtask queued by the check has not run when the act starts', async () => {
    const r = rig();
    let flipped = false;
    let seenAtAct: boolean | null = null;
    const deps: PocketWriteDeps = {
      shuttingDown: () => false,
      stillPaired: () => {
        queueMicrotask(() => {
          flipped = true;
        });
        return true;
      },
      writes: {
        end: async () => {
          seenAtAct = flipped;
          return { outcome: 'done' };
        }
      }
    };
    const handle = createPocketWriteHandler(deps);
    await handle(END, endBody('s1', wid(1)), 'phone-a', OPEN);
    expect(seenAtAct).toBe(false);
    expect(r.ends).toEqual([]);
  });

  for (const [name, set] of [
    ['the quit has begun', (r: Rig) => (r.quitting = true)],
    ['the phone is no longer paired', (r: Rig) => (r.paired = false)]
  ] as const) {
    it(`refuses 404 with no body when ${name}, acts on nothing, and leaves nothing in the ledger`, async () => {
      const r = rig();
      set(r);
      expect(await r.handle(END, endBody('s1', wid(1)), 'phone-a', OPEN)).toEqual({ status: 404, body: null });
      expect(r.ends).toEqual([]);
      // §14 finding 16: the pending entry was dropped, so the same ids act now.
      r.quitting = false;
      r.paired = true;
      expect(parsed(await r.handle(END, endBody('s1', wid(1)), 'phone-a', OPEN)).outcome).toBe('done');
    });
  }

  it('refuses 404 when THIS door has begun to stop, and acts on nothing', async () => {
    const r = rig();
    const stopping: DoorAdmission = { stopping: () => true };
    expect(await r.handle(END, endBody('s1', wid(1)), 'phone-a', stopping)).toEqual({ status: 404, body: null });
    expect(r.ends).toEqual([]);
  });

  it('leaks no claim or ledger slot through 600 refusals at the check', async () => {
    const r = rig();
    r.paired = false;
    for (let i = 0; i < 600; i += 1) await r.handle(END, endBody('s1', wid(i)), 'phone-a', OPEN);
    r.paired = true;
    expect(parsed(await r.handle(END, endBody('s1', wid(9999)), 'phone-a', OPEN)).outcome).toBe('done');
  });
});

// ---------------------------------------------------------------------------

describe('step 5 and 6, the act and its outcome', () => {
  it('answers done, marked acted, and hands end the session and the batch flag', async () => {
    const r = rig();
    const answer = await r.handle(END, endBody('sess-1', wid(1), true), 'phone-a', OPEN);
    expect(answer.acted).toBe(true);
    expect(Object.keys(answer).sort()).toEqual(['acted', 'body', 'status']);
    expect(parsed(answer)).toEqual({ verb: 'end', write: wid(1), outcome: 'done', reason: null, sentence: null });
    expect(r.ends).toEqual([{ sessionId: 'sess-1', batch: true }]);
  });

  it('carries a gate’s refusal word and sentence through, marked acted', async () => {
    const r = rig();
    r.endWith = async () => ({ outcome: 'refused', reason: 'unreachable', sentence: 'the gate’s own sentence' });
    const answer = await r.handle(END, endBody('s1', wid(1)), 'phone-a', OPEN);
    expect(answer.acted).toBe(true);
    expect(parsed(answer)).toEqual({ verb: 'end', write: wid(1), outcome: 'refused', reason: 'unreachable', sentence: 'the gate’s own sentence' });
  });

  it('reads a rejected end, and one that throws before its promise exists, as failed with END_FAILED', async () => {
    const r = rig();
    r.endWith = () => Promise.reject(new Error('CANARY-argv tmux kill-session -t secret'));
    const rejected = await r.handle(END, endBody('s1', wid(1)), 'phone-a', OPEN);
    expect(rejected.acted).toBe(true);
    expect(parsed(rejected)).toEqual({ verb: 'end', write: wid(1), outcome: 'failed', reason: null, sentence: END_FAILED });
    r.endWith = () => {
      throw new Error('CANARY-sync');
    };
    const thrown = await r.handle(END, endBody('s2', wid(2)), 'phone-a', OPEN);
    expect(parsed(thrown)).toMatchObject({ outcome: 'failed', sentence: END_FAILED });
    expect(JSON.stringify(logged)).not.toContain('CANARY');
  });
});

// ---------------------------------------------------------------------------

describe('step 2, the ledger', () => {
  it('answers a repeated write id with its recorded body and its recorded acted, and acts on nothing', async () => {
    const r = rig();
    const first = await r.handle(END, endBody('s1', wid(1)), 'phone-a', OPEN);
    r.endWith = async () => ({ outcome: 'failed', sentence: 'never asked' });
    const again = await r.handle(END, endBody('s1', wid(1)), 'phone-a', OPEN);
    expect(again.body).toBe(first.body);
    expect(again.acted).toBe(true);
    expect(r.ends).toHaveLength(1);
    // Even when the second body names a different session: the id decides.
    const other = await r.handle(END, endBody('s2', wid(1), true), 'phone-a', OPEN);
    expect(other.body).toBe(first.body);
    expect(r.ends).toHaveLength(1);
  });

  it('keys on the phone AND the write id: another phone’s same id is its own write', async () => {
    const r = rig();
    await r.handle(END, endBody('s1', wid(1)), 'phone-a', OPEN);
    await r.handle(END, endBody('s2', wid(1)), 'phone-b', OPEN);
    expect(r.ends.map((e) => e.sessionId)).toEqual(['s1', 's2']);
  });

  it('remembers an id for exactly 2 × POCKET_CLOCK_SKEW_MS, the constant and not a second spelling', async () => {
    expect(POCKET_WRITE_LEDGER_MS).toBe(2 * POCKET_CLOCK_SKEW_MS);
    expect(POCKET_WRITE_LEDGER_MS).toBe(120_000);
    const r = rig();
    const start = r.clock;
    await r.handle(END, endBody('s1', wid(1)), 'phone-a', OPEN);
    r.clock = start + POCKET_WRITE_LEDGER_MS - 1;
    await r.handle(END, endBody('s1', wid(1)), 'phone-a', OPEN);
    expect(r.ends).toHaveLength(1);
    r.clock = start + POCKET_WRITE_LEDGER_MS;
    await r.handle(END, endBody('s1', wid(1)), 'phone-a', OPEN);
    expect(r.ends).toHaveLength(2);
  });

  // §14 finding 9: the duplicate's write may be acting now, so its busy is
  // marked and never replaced by a 404.
  it('answers busy MARKED acted to a duplicate of a write still in flight, and acts once', async () => {
    const r = rig();
    const held = deferred<PocketEndOutcome>();
    r.endWith = () => held.promise;
    const first = r.handle(END, endBody('s1', wid(1)), 'phone-a', OPEN);
    const dup = await r.handle(END, endBody('s1', wid(1)), 'phone-a', OPEN);
    expect(dup.acted).toBe(true);
    expect(parsed(dup)).toEqual({ verb: 'end', write: wid(1), outcome: 'busy', reason: null, sentence: POCKET_WRITE_SENTENCES.busy });
    held.resolve({ outcome: 'done' });
    expect(parsed(await first).outcome).toBe('done');
    expect(r.ends).toHaveLength(1);
    // And once recorded, the duplicate reads the recorded answer.
    expect(parsed(await r.handle(END, endBody('s1', wid(1)), 'phone-a', OPEN)).outcome).toBe('done');
  });

  it('answers busy UNMARKED to another write from the same phone while one is in flight', async () => {
    const r = rig();
    const held = deferred<PocketEndOutcome>();
    r.endWith = () => held.promise;
    const first = r.handle(END, endBody('s1', wid(1)), 'phone-a', OPEN);
    const second = await r.handle(END, endBody('s2', wid(2)), 'phone-a', OPEN);
    expect(second.acted).toBeUndefined();
    expect(parsed(second)).toMatchObject({ outcome: 'busy', write: wid(2), sentence: POCKET_WRITE_SENTENCES.busy });
    held.resolve({ outcome: 'done' });
    await first;
    expect(r.ends).toHaveLength(1);
    // The busy left no ledger entry: wid(2) acts now.
    r.endWith = async () => ({ outcome: 'done' });
    expect(parsed(await r.handle(END, endBody('s2', wid(2)), 'phone-a', OPEN)).outcome).toBe('done');
  });

  it('answers busy UNMARKED to a second phone ending the same session while one is in flight', async () => {
    const r = rig();
    const held = deferred<PocketEndOutcome>();
    r.endWith = () => held.promise;
    const first = r.handle(END, endBody('s1', wid(1)), 'phone-a', OPEN);
    const other = await r.handle(END, endBody('s1', wid(2)), 'phone-b', OPEN);
    expect(other.acted).toBeUndefined();
    expect(parsed(other).outcome).toBe('busy');
    // A different session from that phone is not held up.
    r.endWith = async () => ({ outcome: 'done' });
    expect(parsed(await r.handle(END, endBody('s2', wid(3)), 'phone-b', OPEN)).outcome).toBe('done');
    held.resolve({ outcome: 'done' });
    await first;
    expect(r.ends.map((e) => e.sessionId)).toEqual(['s1', 's2']);
  });

  it('holds at most 512 ids a phone: the next is busy, unmarked, and evicts nothing', async () => {
    expect(POCKET_WRITE_LEDGER_PER_PHONE).toBe(512);
    const r = rig();
    for (let i = 0; i < 512; i += 1) await r.handle(END, endBody('s1', wid(i)), 'phone-a', OPEN);
    expect(r.ends).toHaveLength(512);
    const full = await r.handle(END, endBody('s1', wid(600)), 'phone-a', OPEN);
    expect(full.acted).toBeUndefined();
    expect(parsed(full)).toMatchObject({ outcome: 'busy', write: wid(600) });
    expect(r.ends).toHaveLength(512);
    // Nothing was evicted: the oldest id still answers its recorded body.
    expect(parsed(await r.handle(END, endBody('s1', wid(0)), 'phone-a', OPEN)).outcome).toBe('done');
    expect(r.ends).toHaveLength(512);
    // Another phone is not full.
    expect(parsed(await r.handle(END, endBody('s1', wid(600)), 'phone-b', OPEN)).outcome).toBe('done');
    // And once the lifetime has passed, phone-a writes again.
    r.clock += POCKET_WRITE_LEDGER_MS;
    expect(parsed(await r.handle(END, endBody('s1', wid(601)), 'phone-a', OPEN)).outcome).toBe('done');
  });

  it('holds at most 4,096 ids in all: the next is busy, unmarked, from any phone', async () => {
    expect(POCKET_WRITE_LEDGER_MAX).toBe(4_096);
    const r = rig();
    for (let p = 0; p < 8; p += 1) {
      for (let i = 0; i < 512; i += 1) await r.handle(END, endBody('s1', wid(i)), `phone-${p}`, OPEN);
    }
    expect(r.ends).toHaveLength(4_096);
    const full = await r.handle(END, endBody('s1', wid(1)), 'phone-new', OPEN);
    expect(full.acted).toBeUndefined();
    expect(parsed(full).outcome).toBe('busy');
    expect(r.ends).toHaveLength(4_096);
  });
});

// ---------------------------------------------------------------------------

describe('step 7, one log line', () => {
  it('writes one line per write that acted: the verb, the outcome word, and the session id', async () => {
    logged.length = 0;
    const r = rig();
    await r.handle(END, endBody('sess-9', wid(1)), 'phone-a', OPEN);
    r.endWith = async () => ({ outcome: 'refused', reason: 'gone', sentence: 'Session not found.' });
    await r.handle(END, endBody('sess-8', wid(2)), 'phone-a', OPEN);
    expect(logged).toEqual([
      { level: 'info', msg: "the phone's end: done", fields: { session: 'sess-9' } },
      { level: 'info', msg: "the phone's end: refused", fields: { session: 'sess-8' } }
    ]);
    // Never the write id, a body or a sentence.
    const text = JSON.stringify(logged);
    for (const never of [wid(1), wid(2), 'Session not found.', 'batch', 'phone-a']) {
      expect(text).not.toContain(never);
    }
  });

  it('writes nothing for a write that never acted: malformed, a ledger hit, busy, or a refusal at the check', async () => {
    const r = rig();
    await r.handle(END, endBody('s1', wid(1)), 'phone-a', OPEN);
    logged.length = 0;
    await r.handle(END, Buffer.from('nope'), 'phone-a', OPEN);
    await r.handle(END, endBody('s1', wid(1)), 'phone-a', OPEN);
    r.paired = false;
    await r.handle(END, endBody('s1', wid(2)), 'phone-a', OPEN);
    expect(logged).toEqual([]);
  });
});
