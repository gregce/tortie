/**
 * THE ONE WRITE PATH (Phase 317, build/p317/SPEC.md §5.3.4; widened by Phase
 * 318, build/p318/SPEC.md §5.1.4), driven step by step over a recording fake
 * of what it is handed.
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
 *    the caps of 2,048 a phone and 8,192 in all (Phase 337, D24; 512 and 4,096
 *    before it) answer `busy` and evict nothing.
 *  - `acted`: on the act's answer, on a recorded hit, and on the `busy` a
 *    same-id duplicate in flight gets, and NOT on any other `busy` (§14
 *    finding 9); a pending entry that never acted leaves nothing behind (§14
 *    finding 16).
 *  - THE ECHO of a well-formed write id inside a malformed body (§14 finding
 *    14), and the worst legal body measured against its cap (§14 finding 17).
 *  - ONE LOG LINE per write that acted, naming the verb, the outcome word and
 *    the session id, and nothing else.
 *  - (Phase 318) the two reply verbs through the same path: their strict
 *    parses, the verb in the ledger key, one in flight per phone and per
 *    session ACROSS verbs, the `still` handed in built from the last check's
 *    three asks, and `replySettled`'s `REPLY_FAILED`.
 *  - (Phase 337) the keys write through the same path: `parseKeysBody`'s
 *    exact key set and item shapes, D17's rule that a named key other than
 *    `BSpace` is the write's ONLY item, the verb handed the items, the turn,
 *    the mark and the same `still`, and D43's bounded log line: a session's
 *    `done` keys writes logged once per `KEYS_LOG_QUIET_MS`, every other
 *    outcome of every verb every time.
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
  KEYS_LOG_QUIET_MS,
  parseEndBody,
  parseKeysBody,
  POCKET_WRITE_LEDGER_MAX,
  POCKET_WRITE_LEDGER_MS,
  POCKET_WRITE_LEDGER_PER_PHONE
} = writesModule;
const { POCKET_ROUTES } = await import('../door/table');
const { POCKET_WRITE_BODY_CAPS } = await import('../door/limits');
const { POCKET_CLOCK_SKEW_MS } = await import('../pairing');
const { POCKET_KEYS_MAX_ITEMS, POCKET_SCREEN_KEY_NAMES, POCKET_WRITE_SENTENCES } = await import('@shared/ipc/pocket');
const { END_FAILED } = await import('@shared/lifecycle-words');
const { REPLY_FAILED } = await import('@shared/reply-copy');
type PocketWriteDeps = import('../writes').PocketWriteDeps;
type PocketEndOutcome = import('../routes').PocketEndOutcome;
type PocketReplyOutcome = import('../routes').PocketReplyOutcome;
type PocketChooseInput = import('../routes').PocketChooseInput;
type PocketSayInput = import('../routes').PocketSayInput;
type PocketKeysInput = import('../routes').PocketKeysInput;
type PocketStillAllowed = import('../routes').PocketStillAllowed;
type PocketRoute = import('../door/table').PocketRoute;
type DoorAnswer = import('../bind').DoorAnswer;
type DoorAdmission = import('../bind').DoorAdmission;
type PocketWriteAnswer = import('@shared/ipc/pocket').PocketWriteAnswer;

const END = POCKET_ROUTES.find((r) => r.id === 'end') as PocketRoute;
const CHOOSE = POCKET_ROUTES.find((r) => r.id === 'choose') as PocketRoute;
const SAY = POCKET_ROUTES.find((r) => r.id === 'say') as PocketRoute;
const KEYS = POCKET_ROUTES.find((r) => r.id === 'keys') as PocketRoute;
const BLOCKED = POCKET_ROUTES.find((r) => r.id === 'blocked') as PocketRoute;
const OPEN: DoorAdmission = { stopping: () => false };

/** A write id: 32 lowercase hex, distinct per `n`. */
function wid(n: number): string {
  return n.toString(16).padStart(32, '0');
}

function endBody(session: string, write: string, batch = false): Buffer {
  return Buffer.from(JSON.stringify({ session, write, batch }), 'utf8');
}

/** A question id in `src/main/reply/question-id.ts`'s shape. */
const QID = '0123456789abcdef-42';
/** A mark in `hashScreen`'s shape. */
const MARK = 'a1b2c3d4e5f6';

function chooseBody(session: string, write: string, over: Record<string, unknown> = {}): Buffer {
  return Buffer.from(JSON.stringify({ mark: MARK, marker: '1', question: QID, session, write, ...over }), 'utf8');
}

function sayBody(session: string, write: string, text: unknown = 'hello phone'): Buffer {
  return Buffer.from(JSON.stringify({ session, text, write }), 'utf8');
}

/** A keys body (Phase 337, D17), its fields overridable one at a time. */
function keysBody(session: string, write: string, over: Record<string, unknown> = {}): Buffer {
  return Buffer.from(
    JSON.stringify({ dialog: null, keys: [{ t: 'ls' }], session, turn: QID, write, ...over }),
    'utf8'
  );
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
  /** Every press the recording fake was asked for, with the `still` it was handed. */
  readonly chooses: { input: PocketChooseInput; still: PocketStillAllowed }[];
  /** Every message the recording fake was asked for, with the `still` it was handed. */
  readonly says: { input: PocketSayInput; still: PocketStillAllowed }[];
  /** Every keys write the recording fake was asked for, with the `still` it was handed (Phase 337). */
  readonly keyed: { input: PocketKeysInput; still: PocketStillAllowed }[];
  /** What was asked, in order: `shuttingDown`, `stillPaired`, `end`, `choose`, `say`. */
  readonly asked: string[];
  clock: number;
  paired: boolean;
  quitting: boolean;
  /** What `end` answers next, or a function that answers it. */
  endWith: () => Promise<PocketEndOutcome>;
  /** What `choose` and `say` answer next. */
  replyWith: (still: PocketStillAllowed) => Promise<PocketReplyOutcome>;
}

function rig(over: { writes?: false } = {}): Rig {
  const self: Rig = {
    handle: undefined as unknown as Rig['handle'],
    ends: [],
    chooses: [],
    says: [],
    keyed: [],
    asked: [],
    clock: 1_000_000,
    paired: true,
    quitting: false,
    endWith: async () => ({ outcome: 'done' }),
    replyWith: async () => ({ outcome: 'done' })
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
            },
            choose: (input: PocketChooseInput, still: PocketStillAllowed) => {
              self.asked.push('choose');
              self.chooses.push({ input, still });
              return self.replyWith(still);
            },
            say: (input: PocketSayInput, still: PocketStillAllowed) => {
              self.asked.push('say');
              self.says.push({ input, still });
              return self.replyWith(still);
            },
            keys: (input: PocketKeysInput, still: PocketStillAllowed) => {
              self.asked.push('keys');
              self.keyed.push({ input, still });
              return self.replyWith(still);
            }
          }
        })
  };
  (self as { handle: Rig['handle'] }).handle = createPocketWriteHandler(deps);
  return self;
}

/** The writes a test hands in directly, every member answering done. */
const doneWrites = {
  end: async (): Promise<PocketEndOutcome> => ({ outcome: 'done' }),
  choose: async (): Promise<PocketReplyOutcome> => ({ outcome: 'done' }),
  say: async (): Promise<PocketReplyOutcome> => ({ outcome: 'done' }),
  keys: async (): Promise<PocketReplyOutcome> => ({ outcome: 'done' })
};

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

  it('holds it under its cap, each write route has its own cap, and the worst legal body parses', () => {
    expect(POCKET_WRITE_BODY_CAPS).toEqual({ end: 512, choose: 512, say: 32_768, keys: 16_384 });
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
        ...doneWrites,
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

  // PHASE 337 (D24): the caps rose from 512 and 4,096, because a phone typing
  // on a Screen sends a keys write at most every 100 ms, at most 1,200 in one
  // ledger life of 120 s.
  it('holds at most 2,048 ids a phone: the next is busy, unmarked, and evicts nothing', async () => {
    expect(POCKET_WRITE_LEDGER_PER_PHONE).toBe(2_048);
    expect(POCKET_WRITE_LEDGER_PER_PHONE).toBeGreaterThanOrEqual(POCKET_WRITE_LEDGER_MS / 100);
    const r = rig();
    for (let i = 0; i < 2_048; i += 1) await r.handle(END, endBody('s1', wid(i)), 'phone-a', OPEN);
    expect(r.ends).toHaveLength(2_048);
    const full = await r.handle(END, endBody('s1', wid(3_000)), 'phone-a', OPEN);
    expect(full.acted).toBeUndefined();
    expect(parsed(full)).toMatchObject({ outcome: 'busy', write: wid(3_000) });
    expect(r.ends).toHaveLength(2_048);
    // Nothing was evicted: the oldest id still answers its recorded body.
    expect(parsed(await r.handle(END, endBody('s1', wid(0)), 'phone-a', OPEN)).outcome).toBe('done');
    expect(r.ends).toHaveLength(2_048);
    // Another phone is not full.
    expect(parsed(await r.handle(END, endBody('s1', wid(3_000)), 'phone-b', OPEN)).outcome).toBe('done');
    // And once the lifetime has passed, phone-a writes again.
    r.clock += POCKET_WRITE_LEDGER_MS;
    expect(parsed(await r.handle(END, endBody('s1', wid(3_001)), 'phone-a', OPEN)).outcome).toBe('done');
  });

  it('holds at most 8,192 ids in all: the next is busy, unmarked, from any phone', async () => {
    expect(POCKET_WRITE_LEDGER_MAX).toBe(8_192);
    const r = rig();
    for (let p = 0; p < 4; p += 1) {
      for (let i = 0; i < 2_048; i += 1) await r.handle(END, endBody('s1', wid(i)), `phone-${p}`, OPEN);
    }
    expect(r.ends).toHaveLength(8_192);
    const full = await r.handle(END, endBody('s1', wid(1)), 'phone-new', OPEN);
    expect(full.acted).toBeUndefined();
    expect(parsed(full).outcome).toBe('busy');
    expect(r.ends).toHaveLength(8_192);
  });

  it('takes 1,200 keys writes from one phone in one ledger life, the most its 100 ms pacing sends, none of them busy', async () => {
    const r = rig();
    for (let i = 0; i < 1_200; i += 1) {
      const answer = parsed(await r.handle(KEYS, keysBody('s1', wid(i)), 'phone-a', OPEN));
      expect(answer.outcome).toBe('done');
      r.clock += 100;
    }
    expect(r.keyed).toHaveLength(1_200);
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

// ---------------------------------------------------------------------------
// PHASE 318 (build/p318/SPEC.md §5.1.2, §5.1.4): the reply's two writes
// through the same path, the same ledger and the same claims.
// ---------------------------------------------------------------------------

describe('Phase 318, step 1: the strict parse of a press and a message', () => {
  const W = wid(31);
  const malformedChooses: [string, string][] = [
    ['a sixth key', JSON.stringify({ mark: MARK, marker: '1', question: QID, session: 's1', write: W, extra: 1 })],
    ['a missing mark', JSON.stringify({ marker: '1', question: QID, session: 's1', write: W })],
    ['a missing marker', JSON.stringify({ mark: MARK, question: QID, session: 's1', write: W })],
    ['a question of 15 hex', JSON.stringify({ mark: MARK, marker: '1', question: '0123456789abcde-1', session: 's1', write: W })],
    ['a question of 17 hex', JSON.stringify({ mark: MARK, marker: '1', question: '0123456789abcdef0-1', session: 's1', write: W })],
    ['a question with upper-case hex', JSON.stringify({ mark: MARK, marker: '1', question: '0123456789ABCDEF-1', session: 's1', write: W })],
    ['a question with a leading-zero count', JSON.stringify({ mark: MARK, marker: '1', question: '0123456789abcdef-01', session: 's1', write: W })],
    ['a question with no count', JSON.stringify({ mark: MARK, marker: '1', question: '0123456789abcdef-', session: 's1', write: W })],
    ['a question with 17 digits', JSON.stringify({ mark: MARK, marker: '1', question: `0123456789abcdef-${'1'.repeat(17)}`, session: 's1', write: W })],
    ['a question with no dash', JSON.stringify({ mark: MARK, marker: '1', question: '0123456789abcdef_1', session: 's1', write: W })],
    ['a question with a sign', JSON.stringify({ mark: MARK, marker: '1', question: '0123456789abcdef--1', session: 's1', write: W })],
    ['a question that is a number', JSON.stringify({ mark: MARK, marker: '1', question: 42, session: 's1', write: W })],
    ['a mark of 11 hex', JSON.stringify({ mark: MARK.slice(1), marker: '1', question: QID, session: 's1', write: W })],
    ['a mark of 13 hex', JSON.stringify({ mark: `${MARK}0`, marker: '1', question: QID, session: 's1', write: W })],
    ['an upper-case mark', JSON.stringify({ mark: MARK.toUpperCase(), marker: '1', question: QID, session: 's1', write: W })],
    ['a marker of 0', JSON.stringify({ mark: MARK, marker: '0', question: QID, session: 's1', write: W })],
    ['a marker of 10', JSON.stringify({ mark: MARK, marker: '10', question: QID, session: 's1', write: W })],
    ['a marker of a', JSON.stringify({ mark: MARK, marker: 'a', question: QID, session: 's1', write: W })],
    ['a marker that is a number', JSON.stringify({ mark: MARK, marker: 1, question: QID, session: 's1', write: W })],
    ['a session with a slash', JSON.stringify({ mark: MARK, marker: '1', question: QID, session: 'a/b', write: W })],
    ['an end body sent to choose', JSON.stringify({ batch: false, session: 's1', write: W })],
    ['a say body sent to choose', JSON.stringify({ session: 's1', text: 'hi', write: W })]
  ];
  for (const [name, text] of malformedChooses) {
    it(`refuses a choose body with ${name}: 200, refused, malformed, the write id echoed, and nothing acts`, async () => {
      const r = rig();
      const answer = await r.handle(CHOOSE, Buffer.from(text, 'utf8'), 'phone-a', OPEN);
      const body = parsed(answer);
      expect(body).toEqual({ verb: 'choose', write: W, outcome: 'refused', reason: 'malformed', sentence: POCKET_WRITE_SENTENCES.unreadable });
      expect(answer.acted).toBeUndefined();
      expect(r.chooses).toEqual([]);
      expect(r.asked).toEqual([]);
    });
  }

  const malformedSays: [string, string][] = [
    ['a fourth key', JSON.stringify({ session: 's1', text: 'hi', write: W, also: 's2' })],
    ['a missing text', JSON.stringify({ session: 's1', write: W })],
    ['a text that is a number', JSON.stringify({ session: 's1', text: 7, write: W })],
    ['a text that is null', JSON.stringify({ session: 's1', text: null, write: W })],
    ['a text that is an array', JSON.stringify({ session: 's1', text: ['hi'], write: W })],
    ['a text that is an object', JSON.stringify({ session: 's1', text: { t: 'hi' }, write: W })],
    ['an empty session', JSON.stringify({ session: '', text: 'hi', write: W })],
    ['a choose body sent to say', JSON.stringify({ mark: MARK, marker: '1', question: QID, session: 's1', write: W })]
  ];
  for (const [name, text] of malformedSays) {
    it(`refuses a say body with ${name}: 200, refused, malformed, the write id echoed, and nothing acts`, async () => {
      const r = rig();
      const answer = await r.handle(SAY, Buffer.from(text, 'utf8'), 'phone-a', OPEN);
      expect(parsed(answer)).toEqual({ verb: 'say', write: W, outcome: 'refused', reason: 'malformed', sentence: POCKET_WRITE_SENTENCES.unreadable });
      expect(answer.acted).toBeUndefined();
      expect(r.says).toEqual([]);
      expect(r.asked).toEqual([]);
    });
  }

  it('echoes "" for a press or a message whose write id is not well formed', async () => {
    const r = rig();
    expect(parsed(await r.handle(CHOOSE, chooseBody('s1', 'nope'), 'phone-a', OPEN)).write).toBe('');
    expect(parsed(await r.handle(SAY, sayBody('s1', W.toUpperCase().replace(/0/g, 'A')), 'phone-a', OPEN)).write).toBe('');
    expect(parsed(await r.handle(SAY, Buffer.from('}{'), 'phone-a', OPEN)).write).toBe('');
  });

  it('reads a question id at both ends of its shape: one digit, `0` itself, and sixteen digits', () => {
    for (const question of ['0123456789abcdef-0', '0123456789abcdef-1', `0123456789abcdef-${String(Number.MAX_SAFE_INTEGER)}`]) {
      expect(writesModule.parseChooseBody(chooseBody('s1', W, { question })), question).toEqual({
        ok: true,
        verb: 'choose',
        write: W,
        session: 's1',
        question,
        mark: MARK,
        marker: '1'
      });
    }
    for (const marker of ['1', '5', '9']) {
      expect(writesModule.parseChooseBody(chooseBody('s1', W, { marker })).ok, marker).toBe(true);
    }
  });

  it('takes a message text EXACTLY as sent: empty, slash, bang, control characters and a lone surrogate all reach the verb untouched', async () => {
    // The text rules are the verb's (§5.5): the parse decides nothing about them.
    const texts = [
      '',
      '/exit',
      '!touch x',
      '  padded  ',
      'a\nb',
      `${String.fromCharCode(0x1b)}[201~`,
      String.fromCharCode(0xd800),
      'é',
      'é',
      'x'.repeat(5_000)
    ];
    const r = rig();
    for (const [i, text] of texts.entries()) {
      const answer = await r.handle(SAY, sayBody(`s${String(i)}`, wid(100 + i), text), 'phone-a', OPEN);
      expect(parsed(answer).outcome).toBe('done');
    }
    expect(r.says.map((s) => s.input.text)).toEqual(texts);
    // A body written the Swift way, `/` as `\/`, is the same text.
    const swift = Buffer.from('{"session":"s99","text":"\\/exit","write":"' + wid(999) + '"}', 'utf8');
    await r.handle(SAY, swift, 'phone-a', OPEN);
    expect(r.says.at(-1)?.input).toEqual({ sessionId: 's99', text: '/exit' });
  });

  it('answers a write row whose id is not in the closed write list 404, before anything is read', async () => {
    const r = rig();
    const forged = { ...BLOCKED, method: 'POST' as const, reads: false };
    expect(await r.handle(forged, sayBody('s1', wid(1)), 'phone-a', OPEN)).toEqual({ status: 404, body: null });
    expect(r.asked).toEqual([]);
  });

  it('answers a press and a message 404 on a host with no writes', async () => {
    const r = rig({ writes: false });
    expect(await r.handle(CHOOSE, chooseBody('s1', wid(1)), 'phone-a', OPEN)).toEqual({ status: 404, body: null });
    expect(await r.handle(SAY, sayBody('s1', wid(2)), 'phone-a', OPEN)).toEqual({ status: 404, body: null });
    expect(r.asked).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('Phase 318, steps 4 to 6: the last check, `still`, the act and the outcome', () => {
  it('hands choose the session, the question id, the mark and the marker, and say the session and the text, and nothing else', async () => {
    const r = rig();
    const chose = await r.handle(CHOOSE, chooseBody('sess-c', wid(1), { marker: '3' }), 'phone-a', OPEN);
    expect(chose.acted).toBe(true);
    expect(parsed(chose)).toEqual({ verb: 'choose', write: wid(1), outcome: 'done', reason: null, sentence: null });
    expect(r.chooses.map((c) => c.input)).toEqual([{ sessionId: 'sess-c', question: QID, mark: MARK, marker: '3' }]);
    const said = await r.handle(SAY, sayBody('sess-s', wid(2), 'hello phone'), 'phone-a', OPEN);
    expect(said.acted).toBe(true);
    expect(parsed(said)).toEqual({ verb: 'say', write: wid(2), outcome: 'done', reason: null, sentence: null });
    expect(r.says.map((s) => s.input)).toEqual([{ sessionId: 'sess-s', text: 'hello phone' }]);
    expect(r.ends).toEqual([]);
  });

  it('asks the quit, the door and the phone before a press, and the act is the next thing asked', async () => {
    const r = rig();
    const door: DoorAdmission = {
      stopping: () => {
        r.asked.push('stopping');
        return false;
      }
    };
    await r.handle(CHOOSE, chooseBody('s1', wid(1)), 'phone-a', door);
    expect(r.asked).toEqual(['shuttingDown', 'stopping', 'stillPaired', 'choose']);
    r.asked.length = 0;
    await r.handle(SAY, sayBody('s1', wid(2)), 'phone-a', door);
    expect(r.asked).toEqual(['shuttingDown', 'stopping', 'stillPaired', 'say']);
  });

  it('awaits nothing between the check and a press or a message: a microtask queued by the check has not run when the verb starts', async () => {
    for (const route of [CHOOSE, SAY]) {
      let flipped = false;
      let seenAtAct: boolean | null = null;
      const handle = createPocketWriteHandler({
        shuttingDown: () => false,
        stillPaired: () => {
          queueMicrotask(() => {
            flipped = true;
          });
          return true;
        },
        writes: {
          ...doneWrites,
          choose: async () => {
            seenAtAct = flipped;
            return { outcome: 'done' };
          },
          say: async () => {
            seenAtAct = flipped;
            return { outcome: 'done' };
          }
        }
      });
      const body = route === CHOOSE ? chooseBody('s1', wid(1)) : sayBody('s1', wid(1));
      await handle(route, body, 'phone-a', OPEN);
      expect(seenAtAct, route.id).toBe(false);
    }
  });

  it('hands choose and say a `still` that asks the same three things as the last check, in its order, and asks nothing until the verb calls it', async () => {
    const r = rig();
    let stopping = false;
    const door: DoorAdmission = {
      stopping: () => {
        r.asked.push('stopping');
        return stopping;
      }
    };
    await r.handle(CHOOSE, chooseBody('s1', wid(1)), 'phone-a', door);
    await r.handle(SAY, sayBody('s2', wid(2)), 'phone-a', door);
    const [chose] = r.chooses;
    const [said] = r.says;
    if (chose === undefined || said === undefined) throw new Error('the verbs were not called');
    // Building it asked nothing: the asks recorded are the last checks' and the verbs'.
    expect(r.asked).toEqual(['shuttingDown', 'stopping', 'stillPaired', 'choose', 'shuttingDown', 'stopping', 'stillPaired', 'say']);
    for (const still of [chose.still, said.still]) {
      r.asked.length = 0;
      expect(still()).toBe(true);
      expect(r.asked).toEqual(['shuttingDown', 'stopping', 'stillPaired']);
      r.quitting = true;
      expect(still()).toBe(false);
      r.quitting = false;
      stopping = true;
      expect(still()).toBe(false);
      stopping = false;
      r.paired = false;
      expect(still()).toBe(false);
      r.paired = true;
      expect(still()).toBe(true);
    }
  });

  it('hands `still` the phone the signature was verified for, and never another', async () => {
    const asked: string[] = [];
    const paired = new Set(['phone-z']);
    let handed: PocketStillAllowed | null = null;
    const handle = createPocketWriteHandler({
      shuttingDown: () => false,
      stillPaired: (phone) => {
        asked.push(phone);
        return paired.has(phone);
      },
      writes: {
        ...doneWrites,
        say: async (_input, still) => {
          handed = still;
          return { outcome: 'done' };
        }
      }
    });
    await handle(SAY, sayBody('s1', wid(1)), 'phone-z', OPEN);
    asked.length = 0;
    expect((handed as PocketStillAllowed | null)?.()).toBe(true);
    expect(asked).toEqual(['phone-z']);
    // Removing THAT phone is what `still` sees; another phone's pairing is nothing to it.
    paired.delete('phone-z');
    paired.add('phone-a');
    expect((handed as PocketStillAllowed | null)?.()).toBe(false);
  });

  it('answers a verb that found `still` false with its refusal, 200, marked acted, never a 404', async () => {
    const r = rig();
    const held = deferred<void>();
    r.replyWith = async (still) => {
      await held.promise;
      return still() ? { outcome: 'done' } : { outcome: 'refused', reason: 'stopped', sentence: POCKET_WRITE_SENTENCES.stopped };
    };
    const inFlight = r.handle(SAY, sayBody('s1', wid(1)), 'phone-a', OPEN);
    await Promise.resolve();
    // Removed while the verb reads: its own final check sees it.
    r.paired = false;
    held.resolve();
    const answer = await inFlight;
    expect(answer.status).toBe(200);
    expect(answer.acted).toBe(true);
    expect(parsed(answer)).toEqual({ verb: 'say', write: wid(1), outcome: 'refused', reason: 'stopped', sentence: POCKET_WRITE_SENTENCES.stopped });
  });

  it('refuses 404 with no body at the last check for a press and a message, and the verb is never asked', async () => {
    for (const route of [CHOOSE, SAY]) {
      const r = rig();
      r.paired = false;
      const body = route === CHOOSE ? chooseBody('s1', wid(1)) : sayBody('s1', wid(1));
      expect(await r.handle(route, body, 'phone-a', OPEN), route.id).toEqual({ status: 404, body: null });
      expect(await r.handle(route, body, 'phone-a', { stopping: () => true }), route.id).toEqual({ status: 404, body: null });
      r.paired = true;
      r.quitting = true;
      expect(await r.handle(route, body, 'phone-a', OPEN), route.id).toEqual({ status: 404, body: null });
      expect(r.chooses).toEqual([]);
      expect(r.says).toEqual([]);
      // Nothing was left in the ledger: the same id acts once the check passes.
      r.quitting = false;
      expect(parsed(await r.handle(route, body, 'phone-a', OPEN)).outcome, route.id).toBe('done');
    }
  });

  it('carries every reply refusal word and its sentence through, marked acted', async () => {
    const reasons = ['gone', 'changed', 'unpressable', 'unsayable', 'stopped', 'empty', 'long', 'character'] as const;
    const r = rig();
    for (const [i, reason] of reasons.entries()) {
      r.replyWith = async () => ({ outcome: 'refused', reason, sentence: `the ${reason} sentence` });
      const answer = await r.handle(i % 2 === 0 ? CHOOSE : SAY, i % 2 === 0 ? chooseBody(`s${String(i)}`, wid(i)) : sayBody(`s${String(i)}`, wid(i)), 'phone-a', OPEN);
      expect(answer.acted).toBe(true);
      expect(parsed(answer)).toMatchObject({ outcome: 'refused', reason, sentence: `the ${reason} sentence` });
    }
    r.replyWith = async () => ({ outcome: 'failed', sentence: 'Your answer was typed and the question is still there.' });
    const failed = await r.handle(CHOOSE, chooseBody('s-f', wid(50)), 'phone-a', OPEN);
    expect(parsed(failed)).toEqual({ verb: 'choose', write: wid(50), outcome: 'failed', reason: null, sentence: 'Your answer was typed and the question is still there.' });
  });

  it('reads a rejected press or message, and one that throws before its promise exists, as failed with REPLY_FAILED', async () => {
    const r = rig();
    logged.length = 0;
    r.replyWith = () => Promise.reject(new Error('CANARY-argv tmux send-keys -t secret'));
    for (const [i, route] of [CHOOSE, SAY].entries()) {
      const body = route === CHOOSE ? chooseBody('s1', wid(10 + i)) : sayBody('s2', wid(10 + i), 'CANARY-words');
      const answer = await r.handle(route, body, 'phone-a', OPEN);
      expect(answer.acted).toBe(true);
      expect(parsed(answer)).toEqual({ verb: route.id, write: wid(10 + i), outcome: 'failed', reason: null, sentence: REPLY_FAILED });
    }
    r.replyWith = () => {
      throw new Error('CANARY-sync');
    };
    const thrown = await r.handle(SAY, sayBody('s3', wid(20)), 'phone-a', OPEN);
    expect(parsed(thrown)).toMatchObject({ outcome: 'failed', sentence: REPLY_FAILED });
    expect(JSON.stringify(logged)).not.toContain('CANARY');
  });
});

// ---------------------------------------------------------------------------

describe('Phase 318, steps 2 and 3: the verb in the ledger key, and one in flight across verbs', () => {
  it('keys the ledger on the verb: the same write id under another verb is its own write', async () => {
    const r = rig();
    const said = await r.handle(SAY, sayBody('s1', wid(1)), 'phone-a', OPEN);
    const chose = await r.handle(CHOOSE, chooseBody('s1', wid(1)), 'phone-a', OPEN);
    const ended = await r.handle(END, endBody('s1', wid(1)), 'phone-a', OPEN);
    expect(parsed(said).verb).toBe('say');
    expect(parsed(chose).verb).toBe('choose');
    expect(parsed(ended).verb).toBe('end');
    expect([r.says.length, r.chooses.length, r.ends.length]).toEqual([1, 1, 1]);
    // And within one verb the id still answers its recorded body.
    const again = await r.handle(SAY, sayBody('s1', wid(1), 'other words'), 'phone-a', OPEN);
    expect(again.body).toBe(said.body);
    expect(again.acted).toBe(true);
    expect(r.says).toHaveLength(1);
  });

  it('answers a message re-sent with the same write id what it recorded, and types it once (the kept say, §Revision R13)', async () => {
    const r = rig();
    const first = await r.handle(SAY, sayBody('s1', wid(7), 'run it'), 'phone-a', OPEN);
    const resent = await r.handle(SAY, sayBody('s1', wid(7), 'run it'), 'phone-a', OPEN);
    expect(resent.body).toBe(first.body);
    expect(r.says).toHaveLength(1);
    // While the first is still acting, the re-send is busy MARKED acted.
    const held = deferred<void>();
    r.replyWith = async () => {
      await held.promise;
      return { outcome: 'done' };
    };
    const slow = r.handle(SAY, sayBody('s2', wid(8), 'slow'), 'phone-a', OPEN);
    const dup = await r.handle(SAY, sayBody('s2', wid(8), 'slow'), 'phone-a', OPEN);
    expect(dup.acted).toBe(true);
    expect(parsed(dup)).toEqual({ verb: 'say', write: wid(8), outcome: 'busy', reason: null, sentence: POCKET_WRITE_SENTENCES.busy });
    held.resolve();
    expect(parsed(await slow).outcome).toBe('done');
    expect(r.says.filter((s) => s.input.sessionId === 's2')).toHaveLength(1);
  });

  it('holds one write in flight per SESSION across verbs: an End and a message never overlap on one session', async () => {
    const r = rig();
    const held = deferred<PocketEndOutcome>();
    r.endWith = () => held.promise;
    const ending = r.handle(END, endBody('s1', wid(1)), 'phone-a', OPEN);
    const say = await r.handle(SAY, sayBody('s1', wid(2)), 'phone-b', OPEN);
    expect(say.acted).toBeUndefined();
    expect(parsed(say)).toEqual({ verb: 'say', write: wid(2), outcome: 'busy', reason: null, sentence: POCKET_WRITE_SENTENCES.busy });
    const choose = await r.handle(CHOOSE, chooseBody('s1', wid(3)), 'phone-c', OPEN);
    expect(parsed(choose).outcome).toBe('busy');
    // Another session from another phone is not held up.
    expect(parsed(await r.handle(SAY, sayBody('s2', wid(4)), 'phone-b', OPEN)).outcome).toBe('done');
    held.resolve({ outcome: 'done' });
    await ending;
    expect(r.says.map((s) => s.input.sessionId)).toEqual(['s2']);
    expect(r.chooses).toEqual([]);
    // The busy left nothing behind: the same ids act now.
    expect(parsed(await r.handle(SAY, sayBody('s1', wid(2)), 'phone-b', OPEN)).outcome).toBe('done');
  });

  it('holds one write in flight per PHONE across verbs', async () => {
    const r = rig();
    const held = deferred<void>();
    r.replyWith = async () => {
      await held.promise;
      return { outcome: 'done' };
    };
    const pressing = r.handle(CHOOSE, chooseBody('s1', wid(1)), 'phone-a', OPEN);
    const end = await r.handle(END, endBody('s2', wid(2)), 'phone-a', OPEN);
    expect(end.acted).toBeUndefined();
    expect(parsed(end).outcome).toBe('busy');
    const say = await r.handle(SAY, sayBody('s3', wid(3)), 'phone-a', OPEN);
    expect(parsed(say).outcome).toBe('busy');
    held.resolve();
    expect(parsed(await pressing).outcome).toBe('done');
    expect(r.ends).toEqual([]);
    expect(r.says).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe('Phase 318, step 7: one log line, and never the words', () => {
  it('writes one line per press or message that acted, naming the verb and the outcome, with the session id alone', async () => {
    logged.length = 0;
    const r = rig();
    const canaryText = 'CANARY-TEXT /exit !rm';
    await r.handle(SAY, sayBody('sess-say', wid(0xabc), canaryText), 'phone-a', OPEN);
    r.replyWith = async () => ({ outcome: 'refused', reason: 'changed', sentence: 'CANARY-SENTENCE' });
    await r.handle(CHOOSE, chooseBody('sess-choose', wid(0xdef), { marker: '7' }), 'phone-a', OPEN);
    expect(logged).toEqual([
      { level: 'info', msg: "the phone's say: done", fields: { session: 'sess-say' } },
      { level: 'info', msg: "the phone's choose: refused", fields: { session: 'sess-choose' } }
    ]);
    const text = JSON.stringify(logged);
    for (const never of [canaryText, 'CANARY', wid(0xabc), wid(0xdef), QID, MARK, '"7"', 'phone-a']) {
      expect(text, never).not.toContain(never);
    }
  });

  it('writes nothing for a press or a message that never acted', async () => {
    const r = rig();
    logged.length = 0;
    await r.handle(CHOOSE, chooseBody('s1', wid(1), { marker: '0' }), 'phone-a', OPEN);
    await r.handle(SAY, Buffer.from('{"session":"s1","text":5,"write":"' + wid(2) + '"}'), 'phone-a', OPEN);
    r.paired = false;
    await r.handle(SAY, sayBody('s1', wid(3)), 'phone-a', OPEN);
    expect(logged).toEqual([]);
  });
});

describe('Phase 318, the door’s own sentence for a verb whose last check failed', () => {
  it('says the Mac stopped answering and that nothing was done, in the door’s words and no tmux word', () => {
    expect(POCKET_WRITE_SENTENCES.stopped).toBe('Your Mac stopped answering this phone. Nothing was done.');
    expect(Object.keys(POCKET_WRITE_SENTENCES).sort()).toEqual(['busy', 'stopped', 'unreadable']);
    for (const sentence of Object.values(POCKET_WRITE_SENTENCES)) {
      expect(sentence).not.toMatch(/\b(pane|window|prefix|tmux)\b/i);
    }
  });
});

// ---------------------------------------------------------------------------
// PHASE 337 (build/p337/SPEC.md §5.5, D17, D24, D43): the keys write through
// the same path, the same ledger and the same claims.
// ---------------------------------------------------------------------------

describe('Phase 337, step 1: the strict parse of a keys write', () => {
  const W = wid(0x337);
  const ok = (over: Record<string, unknown>): ReturnType<typeof parseKeysBody> =>
    parseKeysBody(keysBody('s1', W, over));

  it('reads the five keys exactly, the items as sent, and the turn and the mark', () => {
    expect(ok({})).toEqual({ ok: true, verb: 'keys', write: W, session: 's1', keys: [{ t: 'ls' }], turn: QID, dialog: null });
    expect(ok({ dialog: MARK, keys: [{ k: 'Enter' }] })).toEqual({
      ok: true,
      verb: 'keys',
      write: W,
      session: 's1',
      keys: [{ k: 'Enter' }],
      turn: QID,
      dialog: MARK
    });
  });

  it('takes every one of the 35 names alone, compared exactly', () => {
    expect(POCKET_SCREEN_KEY_NAMES).toHaveLength(35);
    for (const name of POCKET_SCREEN_KEY_NAMES) {
      const read = ok({ keys: [{ k: name }] });
      expect(read.ok, name).toBe(true);
      if (read.ok) expect(read.keys).toEqual([{ k: name }]);
    }
  });

  it('takes text and BSpace items together in any order, and a lone named key, and nothing is trimmed', () => {
    for (const keys of [
      [{ k: 'BSpace' }, { t: 'x' }],
      [{ t: 'x' }, { k: 'BSpace' }, { k: 'BSpace' }, { t: '  y ' }],
      [{ k: 'BSpace' }, { k: 'BSpace' }],
      [{ k: 'C-c' }],
      [{ k: 'Escape' }],
      [{ t: ' ' }]
    ]) {
      const read = ok({ keys });
      expect(read.ok, JSON.stringify(keys)).toBe(true);
      if (read.ok) expect(read.keys).toEqual(keys);
    }
  });

  it('hands a text holding control characters to the verb unchanged: its rules are the verb’s, with their sentence', () => {
    const control = `a${String.fromCharCode(3)}b${String.fromCharCode(0x7f)}${String.fromCharCode(0xd800)}`;
    const read = ok({ keys: [{ t: control }] });
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.keys).toEqual([{ t: control }]);
  });

  it(`takes 1 to ${String(POCKET_KEYS_MAX_ITEMS)} items and no more`, () => {
    expect(POCKET_KEYS_MAX_ITEMS).toBe(64);
    expect(ok({ keys: Array.from({ length: 64 }, () => ({ t: 'a' })) }).ok).toBe(true);
    expect(ok({ keys: Array.from({ length: 65 }, () => ({ t: 'a' })) })).toEqual({ ok: false, write: W });
    expect(ok({ keys: [] })).toEqual({ ok: false, write: W });
  });

  // D17, §Attack A1: a program reads one write as one input, and Escape then a
  // key in one read is Meta-key, so a named key other than BSpace is alone.
  const notAlone: [string, unknown][] = [
    ['text then Enter', [{ t: 'a' }, { k: 'Enter' }]],
    ['Escape then text', [{ k: 'Escape' }, { t: 'b' }]],
    ['Up twice', [{ k: 'Up' }, { k: 'Up' }]],
    ['BSpace then Tab', [{ k: 'BSpace' }, { k: 'Tab' }]],
    ['C-c sixty-four times', Array.from({ length: 64 }, () => ({ k: 'C-c' }))]
  ];
  for (const [name, keys] of notAlone) {
    it(`refuses a named key that is not the write’s one item: ${name}`, () => {
      expect(ok({ keys })).toEqual({ ok: false, write: W });
    });
  }

  const malformed: [string, Record<string, unknown> | string][] = [
    ['not JSON', '{"keys":'],
    ['an array', '[]'],
    ['a sixth key', { extra: 1 }],
    ['a size', { cols: 80 }],
    ['keys that is not an array', { keys: { t: 'a' } }],
    ['keys that is a string', { keys: 'ls' }],
    ['an item with two keys', { keys: [{ t: 'a', k: 'Enter' }] }],
    ['an item with no key', { keys: [{}] }],
    ['an item that is a string', { keys: ['a'] }],
    ['an item that is an array', { keys: [['a']] }],
    ['an item that is null', { keys: [null] }],
    ['a text that is not a string', { keys: [{ t: 7 }] }],
    ['an empty text', { keys: [{ t: '' }] }],
    ['a name that is not a string', { keys: [{ k: 1 }] }],
    ['the name M-x', { keys: [{ k: 'M-x' }] }],
    ['the name F1', { keys: [{ k: 'F1' }] }],
    ['the name C-Up', { keys: [{ k: 'C-Up' }] }],
    ['the name C-c;', { keys: [{ k: 'C-c;' }] }],
    ['the name enter in lower case', { keys: [{ k: 'enter' }] }],
    ['the name with a space', { keys: [{ k: ' Enter' }] }],
    ['an item key named other', { keys: [{ x: 'a' }] }],
    ['a turn of the wrong shape', { turn: '0123456789abcdef' }],
    ['a turn with a leading zero', { turn: '0123456789abcdef-042' }],
    ['a turn that is null', { turn: null }],
    ['a dialog of 11 hex', { dialog: MARK.slice(1) }],
    ['a dialog in upper case', { dialog: 'A1B2C3D4E5F6' }],
    ['a dialog that is false', { dialog: false }],
    ['a session with a slash', { session: 'a/b' }],
    ['a write that is not hex', { write: 'g'.repeat(32) }]
  ];
  for (const [name, over] of malformed) {
    it(`refuses a keys body with ${name}: 200, refused, malformed, and nothing acts`, async () => {
      const r = rig();
      const body = typeof over === 'string' ? Buffer.from(over, 'utf8') : keysBody('s1', W, over);
      const answer = await r.handle(KEYS, body, 'phone-a', OPEN);
      const read = parsed(answer);
      expect(read.verb).toBe('keys');
      expect(read.outcome).toBe('refused');
      expect(read.reason).toBe('malformed');
      expect(read.sentence).toBe(POCKET_WRITE_SENTENCES.unreadable);
      expect(answer.acted).toBeUndefined();
      expect(r.keyed).toEqual([]);
      expect(r.asked).toEqual([]);
    });
  }

  it('echoes the write id inside a malformed keys body, and "" when there is none', async () => {
    const r = rig();
    expect(parsed(await r.handle(KEYS, keysBody('s1', W, { keys: [{ k: 'F1' }] }), 'phone-a', OPEN)).write).toBe(W);
    expect(parsed(await r.handle(KEYS, keysBody('s1', 'nope'), 'phone-a', OPEN)).write).toBe('');
  });
});

describe('Phase 337, steps 2 to 6: the keys write through the one path', () => {
  it('hands keys the session, the items, the turn and the mark, and nothing else, after the same last check', async () => {
    const r = rig();
    let stopping = false;
    const door: DoorAdmission = {
      stopping: () => {
        r.asked.push('stopping');
        return stopping;
      }
    };
    const keys = [{ k: 'BSpace' }, { t: 'é' }];
    const answer = await r.handle(KEYS, keysBody('s9', wid(1), { keys, dialog: MARK }), 'phone-a', door);
    expect(parsed(answer)).toEqual({ verb: 'keys', write: wid(1), outcome: 'done', reason: null, sentence: null });
    expect(answer.acted).toBe(true);
    expect(r.asked).toEqual(['shuttingDown', 'stopping', 'stillPaired', 'keys']);
    const [call] = r.keyed;
    if (call === undefined) throw new Error('keys was not called');
    expect(call.input).toEqual({ sessionId: 's9', keys, turn: QID, dialog: MARK });
    expect(Object.keys(call.input).sort()).toEqual(['dialog', 'keys', 'sessionId', 'turn']);
    // The same `still` as the reply's: the three asks, in order, asked only when called.
    r.asked.length = 0;
    expect(call.still()).toBe(true);
    expect(r.asked).toEqual(['shuttingDown', 'stopping', 'stillPaired']);
    stopping = true;
    expect(call.still()).toBe(false);
  });

  it('refuses 404 at the last check and never asks keys', async () => {
    const r = rig();
    r.paired = false;
    expect(await r.handle(KEYS, keysBody('s1', wid(1)), 'phone-a', OPEN)).toEqual({ status: 404, body: null });
    expect(r.keyed).toEqual([]);
  });

  it('carries the keys verb’s refusals through, marked acted, and reads a rejection as failed with REPLY_FAILED', async () => {
    const r = rig();
    r.replyWith = async () => ({ outcome: 'refused', reason: 'unreachable', sentence: 'This session cannot take keys now. Nothing was typed.' });
    const refused = await r.handle(KEYS, keysBody('s1', wid(1)), 'phone-a', OPEN);
    expect(parsed(refused)).toMatchObject({ outcome: 'refused', reason: 'unreachable' });
    expect(refused.acted).toBe(true);
    r.replyWith = () => Promise.reject(new Error('boom'));
    expect(parsed(await r.handle(KEYS, keysBody('s1', wid(2)), 'phone-a', OPEN))).toMatchObject({
      outcome: 'failed',
      sentence: REPLY_FAILED
    });
  });

  it('keys the ledger on the verb, answers a re-sent keys write what it recorded, and types it once', async () => {
    const r = rig();
    const first = await r.handle(KEYS, keysBody('s1', wid(5)), 'phone-a', OPEN);
    const again = await r.handle(KEYS, keysBody('s1', wid(5)), 'phone-a', OPEN);
    expect(again).toEqual({ status: 200, body: first.body, acted: true });
    expect(r.keyed).toHaveLength(1);
    // The same write id under another verb is its own write.
    expect(parsed(await r.handle(SAY, sayBody('s1', wid(5)), 'phone-a', OPEN)).outcome).toBe('done');
  });

  it('holds one write in flight per session ACROSS verbs: a keys write and an End never overlap on one session', async () => {
    const r = rig();
    const held = deferred<PocketReplyOutcome>();
    r.replyWith = () => held.promise;
    const typing = r.handle(KEYS, keysBody('s1', wid(1)), 'phone-a', OPEN);
    const ending = await r.handle(END, endBody('s1', wid(2)), 'phone-b', OPEN);
    expect(parsed(ending).outcome).toBe('busy');
    expect(r.ends).toEqual([]);
    held.resolve({ outcome: 'done' });
    expect(parsed(await typing).outcome).toBe('done');
  });
});

describe('Phase 337, step 7: the keys log line, bounded (D43)', () => {
  it('logs twenty done keys writes on one session in two seconds ONCE, and a second session once more', async () => {
    logged.length = 0;
    const r = rig();
    for (let i = 0; i < 20; i += 1) {
      await r.handle(KEYS, keysBody('sess-k', wid(i)), 'phone-a', OPEN);
      r.clock += 100;
    }
    await r.handle(KEYS, keysBody('sess-j', wid(100)), 'phone-a', OPEN);
    expect(r.keyed).toHaveLength(21);
    expect(logged).toEqual([
      { level: 'info', msg: "the phone's keys: done", fields: { session: 'sess-k' } },
      { level: 'info', msg: "the phone's keys: done", fields: { session: 'sess-j' } }
    ]);
  });

  it('logs a refused or failed keys write every time, among done ones', async () => {
    logged.length = 0;
    const r = rig();
    await r.handle(KEYS, keysBody('sess-k', wid(1)), 'phone-a', OPEN);
    r.replyWith = async () => ({ outcome: 'refused', reason: 'changed', sentence: 'moved' });
    await r.handle(KEYS, keysBody('sess-k', wid(2)), 'phone-a', OPEN);
    await r.handle(KEYS, keysBody('sess-k', wid(3)), 'phone-a', OPEN);
    r.replyWith = async () => ({ outcome: 'failed', sentence: REPLY_FAILED });
    await r.handle(KEYS, keysBody('sess-k', wid(4)), 'phone-a', OPEN);
    r.replyWith = async () => ({ outcome: 'done' });
    await r.handle(KEYS, keysBody('sess-k', wid(5)), 'phone-a', OPEN);
    expect(logged.map((l) => l.msg)).toEqual([
      "the phone's keys: done",
      "the phone's keys: refused",
      "the phone's keys: refused",
      "the phone's keys: failed"
    ]);
  });

  it(`logs the session’s next done keys write once ${String(KEYS_LOG_QUIET_MS)} ms have passed, and not one millisecond before`, async () => {
    expect(KEYS_LOG_QUIET_MS).toBe(60_000);
    logged.length = 0;
    const r = rig();
    await r.handle(KEYS, keysBody('sess-k', wid(1)), 'phone-a', OPEN);
    r.clock += KEYS_LOG_QUIET_MS - 1;
    await r.handle(KEYS, keysBody('sess-k', wid(2)), 'phone-a', OPEN);
    expect(logged).toHaveLength(1);
    r.clock += 1;
    await r.handle(KEYS, keysBody('sess-k', wid(3)), 'phone-a', OPEN);
    expect(logged).toHaveLength(2);
    // And the quiet minute starts again from THAT line, not from the first.
    r.clock += KEYS_LOG_QUIET_MS - 1;
    await r.handle(KEYS, keysBody('sess-k', wid(4)), 'phone-a', OPEN);
    expect(logged).toHaveLength(2);
  });


  it('logs end, choose and say every time, whatever keys did on the same session', async () => {
    logged.length = 0;
    const r = rig();
    for (let i = 0; i < 3; i += 1) {
      await r.handle(KEYS, keysBody('sess-k', wid(10 + i)), 'phone-a', OPEN);
      await r.handle(SAY, sayBody('sess-k', wid(20 + i)), 'phone-a', OPEN);
      await r.handle(CHOOSE, chooseBody('sess-k', wid(30 + i)), 'phone-a', OPEN);
      await r.handle(END, endBody('sess-k', wid(40 + i)), 'phone-a', OPEN);
    }
    expect(logged.map((l) => l.msg)).toEqual([
      "the phone's keys: done",
      "the phone's say: done",
      "the phone's choose: done",
      "the phone's end: done",
      "the phone's say: done",
      "the phone's choose: done",
      "the phone's end: done",
      "the phone's say: done",
      "the phone's choose: done",
      "the phone's end: done"
    ]);
  });

  it('never logs a key, a text, the turn, the mark or the write id', async () => {
    logged.length = 0;
    const r = rig();
    await r.handle(KEYS, keysBody('sess-k', wid(0xabc), { keys: [{ t: 'CANARY-337' }], dialog: MARK }), 'phone-a', OPEN);
    r.replyWith = async () => ({ outcome: 'refused', reason: 'character', sentence: 'That holds a character' });
    await r.handle(KEYS, keysBody('sess-k', wid(0xdef), { keys: [{ k: 'C-c' }] }), 'phone-a', OPEN);
    const text = JSON.stringify(logged);
    for (const never of ['CANARY-337', 'C-c', QID, MARK, wid(0xabc), wid(0xdef), 'That holds', 'phone-a']) {
      expect(text, never).not.toContain(never);
    }
  });
});
