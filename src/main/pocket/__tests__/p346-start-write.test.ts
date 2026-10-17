/**
 * THE START BRANCH OF THE ONE WRITE PATH (Phase 346, build/p346/SPEC.md §3.3,
 * D5, D6, D16 to D19, D32), driven through the SHIPPING handler with a
 * recording `PocketWrites.start`.
 *
 *  - THE BODY (D6): `parseStartBody` reads exactly `{agent, project, write}`,
 *    and a hostile corpus of more than thirty bodies is every one `malformed`,
 *    answered with the write id echoed when a well-formed one was there, and
 *    nothing acted or recorded.
 *  - THE ORDER (§3.3): parse, ledger, the phone's claim, the start's claim,
 *    the rate, the pending entry, the last check, the act. A refusal at any
 *    step before the act acts on nothing.
 *  - THE LEDGER (D17): the same write id again while it runs is `busy`,
 *    marked `acted`, with START_STILL; after, the recorded answer with its
 *    session, one act.
 *  - THE LIMITS (D16, D18, D19): one start in flight on this Mac across
 *    phones (START_BUSY); one write in flight per phone across verbs (the
 *    door's busy); six starts a minute per phone, the seventh `refused`
 *    `often` and NOT recorded, so the same id acts once the window allows.
 *  - THE LAST CHECK (§3.3 step 4): the quit, the door stopping, the phone
 *    removed and the route not served are each a 404 with nothing acted, and
 *    `still` asks the same four with `start`'s own route.
 *  - THE ANSWER (D5): exactly six fields, each exactly-when rule held, and a
 *    rejection or an unreadable session is `failed` START_FAILED.
 *  - THE LOG (D32): one line per start, `the phone's start: <outcome>`, its
 *    one field the new session's id or '', and no project, agent or write id.
 */

import { describe, expect, it, vi } from 'vitest';

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

const { createPocketWriteHandler, parseStartBody, startAnswer, START_RATE_MAX, START_RATE_WINDOW_MS } = await import('../writes');
const { POCKET_ROUTES } = await import('../door/table');
const { POCKET_WRITE_BODY_CAPS } = await import('../door/limits');
const { POCKET_WRITE_SENTENCES } = await import('@shared/ipc/pocket');
const { LAUNCHABLE_AGENT_IDS } = await import('../../agents/registry');
const { START_BUSY, START_FAILED, START_OFTEN, START_STILL } = await import('@shared/start-copy');
type PocketRoute = import('../door/table').PocketRoute;
type DoorAnswer = import('../bind').DoorAnswer;
type DoorAdmission = import('../bind').DoorAdmission;
type PocketStartOutcome = import('../routes').PocketStartOutcome;
type PocketStillAllowed = import('../routes').PocketStillAllowed;
type PocketWrites = import('../routes').PocketWrites;
type PocketStartAnswer = import('@shared/ipc/pocket').PocketStartAnswer;

const START = POCKET_ROUTES.find((r) => r.id === 'start') as PocketRoute;
const END = POCKET_ROUTES.find((r) => r.id === 'end') as PocketRoute;
const OPEN: DoorAdmission = { stopping: () => false };
/** A project id in `randomUUID()`'s shape. */
const PROJECT = '0f9b1c2d-3e4f-4a5b-8c7d-9e0f1a2b3c4d';

function wid(n: number): string {
  return n.toString(16).padStart(32, '0');
}

function startBody(over: Record<string, unknown> = {}, write = wid(1)): Buffer {
  return Buffer.from(JSON.stringify({ agent: 'claude', project: PROJECT, write, ...over }), 'utf8');
}

function answerOf(answer: DoorAnswer): PocketStartAnswer {
  expect(answer.status).toBe(200);
  return JSON.parse(answer.body as string) as PocketStartAnswer;
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const DONE: PocketStartOutcome = { outcome: 'done', session: { id: '11111111-2222-4333-8444-555555555555', name: 'claude-3' } };

interface Rig {
  handle: ReturnType<typeof createPocketWriteHandler>;
  /** Every start asked for, with the `still` it was handed. */
  starts: { input: { project: string; agent: string }; still: PocketStillAllowed }[];
  /** Every other verb asked for. */
  others: string[];
  asked: string[];
  routesAsked: string[];
  clock: number;
  paired: Set<string>;
  quitting: boolean;
  served: Set<string>;
  startWith: () => Promise<PocketStartOutcome>;
  endWith: () => Promise<{ outcome: 'done' }>;
}

function rig(): Rig {
  const self: Rig = {
    handle: undefined as unknown as Rig['handle'],
    starts: [],
    others: [],
    asked: [],
    routesAsked: [],
    clock: 5_000_000,
    paired: new Set(['phone-a', 'phone-b']),
    quitting: false,
    served: new Set(['end', 'choose', 'say', 'keys', 'start']),
    startWith: async () => DONE,
    endWith: async () => ({ outcome: 'done' })
  };
  const writes: PocketWrites = {
    end: () => {
      self.others.push('end');
      return self.endWith();
    },
    choose: async () => {
      self.others.push('choose');
      return { outcome: 'done' };
    },
    say: async () => {
      self.others.push('say');
      return { outcome: 'done' };
    },
    keys: async () => {
      self.others.push('keys');
      return { outcome: 'done' };
    },
    start: (input, still) => {
      self.asked.push('start');
      self.starts.push({ input, still });
      return self.startWith();
    }
  };
  self.handle = createPocketWriteHandler({
    shuttingDown: () => {
      self.asked.push('shuttingDown');
      return self.quitting;
    },
    stillPaired: (phone) => {
      self.asked.push('stillPaired');
      return self.paired.has(phone);
    },
    routeServed: (id) => {
      self.asked.push('routeServed');
      self.routesAsked.push(id);
      return self.served.has(id);
    },
    writes,
    now: () => self.clock
  });
  return self;
}

// ---------------------------------------------------------------------------
// The body
// ---------------------------------------------------------------------------

describe('the start body (D6)', () => {
  it('reads exactly agent, project and write, whatever their order and spacing, for every compiled launchable agent', () => {
    for (const agent of LAUNCHABLE_AGENT_IDS) {
      expect(parseStartBody(startBody({ agent }))).toEqual({ ok: true, verb: 'start', write: wid(1), project: PROJECT, agent });
    }
    expect(LAUNCHABLE_AGENT_IDS).toHaveLength(13);
    const reordered = Buffer.from(`{ "write": "${wid(2)}", "agent": "codex",\n "project": "${PROJECT}" }`, 'utf8');
    expect(parseStartBody(reordered)).toEqual({ ok: true, verb: 'start', write: wid(2), project: PROJECT, agent: 'codex' });
  });

  it('holds the worst legal body, 143 bytes, under its 512 cap', () => {
    const worst = startBody({ agent: 'antigravity', project: 'a'.repeat(64) });
    expect(worst.byteLength).toBe(143);
    expect(POCKET_WRITE_BODY_CAPS.start).toBe(512);
    expect(parseStartBody(worst).ok).toBe(true);
  });

  /** NS3's corpus, and more: every one malformed. */
  const corpus: [string, Buffer][] = [
    ['not JSON', Buffer.from('{"agent":', 'utf8')],
    ['empty', Buffer.alloc(0)],
    ['an array', Buffer.from('[]', 'utf8')],
    ['a string', Buffer.from('"claude"', 'utf8')],
    ['null', Buffer.from('null', 'utf8')],
    ['a number', Buffer.from('7', 'utf8')],
    ['missing agent', Buffer.from(JSON.stringify({ project: PROJECT, write: wid(1) }), 'utf8')],
    ['missing project', Buffer.from(JSON.stringify({ agent: 'claude', write: wid(1) }), 'utf8')],
    ['missing write', Buffer.from(JSON.stringify({ agent: 'claude', project: PROJECT }), 'utf8')],
    ['an extra key', startBody({ name: 'mine' })],
    ['an extra cwd', startBody({ cwd: '/tmp' })],
    ['an extra extraArgs', startBody({ extraArgs: ['--yolo'] })],
    ['shell', startBody({ agent: 'shell' })],
    ['SHELL', startBody({ agent: 'SHELL' })],
    ['a cased agent', startBody({ agent: 'Claude' })],
    ['a padded agent', startBody({ agent: ' claude' })],
    ['a padded agent, after', startBody({ agent: 'claude ' })],
    ['an agent with a NUL', startBody({ agent: 'claude\u0000' })],
    ['an overlay-only id', startBody({ agent: 'my-own-agent' })],
    ['a capture-only IDE id', startBody({ agent: 'cursoride' })],
    ['an agent that is a number', startBody({ agent: 1 })],
    ['an agent that is an object', startBody({ agent: { id: 'claude' } })],
    ['a 65-character project', startBody({ project: 'a'.repeat(65) })],
    ['an empty project', startBody({ project: '' })],
    ['a project holding /', startBody({ project: '../etc' })],
    ['a project holding .', startBody({ project: 'a.b' })],
    ['a project holding %', startBody({ project: 'a%2Fb' })],
    ['a project holding a space', startBody({ project: 'a b' })],
    ['a project path', startBody({ project: '/Users/someone/src/app' })],
    ['a project that is a number', startBody({ project: 12 })],
    ['a nested project', startBody({ project: { id: PROJECT } })],
    ['a 31-hex write', startBody({}, 'a'.repeat(31))],
    ['a 33-hex write', startBody({}, 'a'.repeat(33))],
    ['an upper-case write', startBody({}, 'A'.repeat(32))],
    ['a write that is null', startBody({ write: null })],
    ['duplicate agent keys', Buffer.from(`{"agent":"claude","agent":"codex","project":"${PROJECT}","write":"${wid(1)}"}`, 'utf8')],
    ['duplicate write keys', Buffer.from(`{"agent":"claude","project":"${PROJECT}","write":"${wid(1)}","write":"${wid(2)}"}`, 'utf8')],
    ['an escaped agent', Buffer.from(`{"agent":"\\u0063laude","project":"${PROJECT}","write":"${wid(1)}"}`, 'utf8')],
    ['a 600-byte body', Buffer.from(`{"agent":"claude",${' '.repeat(520)}"project":"${PROJECT}","write":"${wid(1)}"}`, 'utf8')],
    ['a prototype key', Buffer.from(`{"__proto__":{"x":1},"agent":"claude","project":"${PROJECT}","write":"${wid(1)}"}`, 'utf8')]
  ];

  it(`refuses every one of ${String(corpus.length)} hostile bodies as malformed`, () => {
    expect(corpus.length).toBeGreaterThanOrEqual(30);
    for (const [why, body] of corpus) expect(parseStartBody(body).ok, why).toBe(false);
  });

  it('answers each malformed body refused malformed through the write path, acting on nothing and recording nothing', async () => {
    const r = rig();
    for (const [why, body] of corpus) {
      const out = answerOf(await r.handle(START, body, 'phone-a', OPEN));
      expect(out, why).toMatchObject({ verb: 'start', outcome: 'refused', reason: 'malformed', sentence: POCKET_WRITE_SENTENCES.unreadable, session: null });
    }
    expect(r.starts).toEqual([]);
    expect(r.asked).toEqual([]);
    // A well-formed write id beside a bad field is echoed; none, `""`.
    expect(answerOf(await r.handle(START, startBody({ agent: 'shell' }, wid(9)), 'phone-a', OPEN)).write).toBe(wid(9));
    expect(answerOf(await r.handle(START, Buffer.from('[]', 'utf8'), 'phone-a', OPEN)).write).toBe('');
    // Nothing was recorded: the honest body with a write id a malformed one carried acts.
    expect(answerOf(await r.handle(START, startBody({}, wid(9)), 'phone-a', OPEN)).outcome).toBe('done');
    expect(r.starts).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// The act, the answer and the log
// ---------------------------------------------------------------------------

describe('an honest start (§3.3, D5, D32)', () => {
  it('acts once with exactly the two ids, after the last check, and answers the six fields', async () => {
    const r = rig();
    logged.length = 0;
    const answer = await r.handle(START, startBody({ agent: 'codex' }), 'phone-a', OPEN);
    expect(answer.acted).toBe(true);
    const out = answerOf(answer);
    expect(Object.keys(out)).toEqual(['verb', 'write', 'outcome', 'reason', 'sentence', 'session']);
    expect(out).toEqual({ verb: 'start', write: wid(1), outcome: 'done', reason: null, sentence: null, session: DONE.outcome === 'done' ? DONE.session : null });
    expect(r.starts.map((s) => s.input)).toEqual([{ project: PROJECT, agent: 'codex' }]);
    expect(r.asked).toEqual(['shuttingDown', 'stillPaired', 'routeServed', 'start']);
    expect(r.routesAsked).toEqual(['start']);
    expect(r.others).toEqual([]);
    // One line, its one field the new session.
    const lines = logged.filter((l) => l.msg.startsWith("the phone's"));
    expect(lines).toEqual([{ level: 'info', msg: "the phone's start: done", fields: { session: DONE.outcome === 'done' ? DONE.session.id : '' } }]);
    const said = JSON.stringify(logged);
    expect(said).not.toContain(PROJECT);
    expect(said).not.toContain('codex');
    expect(said).not.toContain(wid(1));
  });

  it('hands the act the same four asks as its still, with start’s own route', async () => {
    const r = rig();
    await r.handle(START, startBody(), 'phone-a', OPEN);
    const still = r.starts[0]?.still;
    if (still === undefined) throw new Error('no start');
    r.asked.length = 0;
    r.routesAsked.length = 0;
    expect(still()).toBe(true);
    expect(r.asked).toEqual(['shuttingDown', 'stillPaired', 'routeServed']);
    expect(r.routesAsked).toEqual(['start']);
    r.served.delete('start');
    expect(still()).toBe(false);
    r.served.add('start');
    r.paired.delete('phone-a');
    expect(still()).toBe(false);
  });

  it('answers each refusal the act decides with its reason and sentence, recorded, and logs it with no session', async () => {
    for (const reason of ['project', 'agent', 'machine', 'interpreter', 'stopped'] as const) {
      const r = rig();
      logged.length = 0;
      r.startWith = async () => ({ outcome: 'refused', reason, sentence: `the ${reason} sentence` });
      const out = answerOf(await r.handle(START, startBody(), 'phone-a', OPEN));
      expect(out).toEqual({ verb: 'start', write: wid(1), outcome: 'refused', reason, sentence: `the ${reason} sentence`, session: null });
      expect(logged.filter((l) => l.msg.startsWith("the phone's"))).toEqual([
        { level: 'info', msg: "the phone's start: refused", fields: { session: '' } }
      ]);
      // Recorded: the same id again answers the same, acting on nothing more.
      expect(answerOf(await r.handle(START, startBody(), 'phone-a', OPEN))).toEqual(out);
      expect(r.starts).toHaveLength(1);
    }
  });

  it('answers failed with START_FAILED for a rejection, a throw before the promise, and a session a phone could not read', async () => {
    const shapes: [string, () => Promise<PocketStartOutcome>][] = [
      ['a rejection', () => Promise.reject(new Error('CANARY /Users/someone/secret'))],
      [
        'a throw',
        () => {
          throw new Error('CANARY');
        }
      ],
      ['an empty session id', async () => ({ outcome: 'done', session: { id: '', name: 'claude-1' } })],
      ['a session id holding a slash', async () => ({ outcome: 'done', session: { id: 'a/b', name: 'claude-1' } })],
      ['an empty name', async () => ({ outcome: 'done', session: { id: 'abc', name: '' } })],
      ['an outcome nobody knows', async () => ({ outcome: 'nope' }) as unknown as PocketStartOutcome]
    ];
    for (const [why, act] of shapes) {
      const r = rig();
      r.startWith = act;
      const answer = await r.handle(START, startBody(), 'phone-a', OPEN);
      expect(answer.acted, why).toBe(true);
      expect(answerOf(answer), why).toEqual({ verb: 'start', write: wid(1), outcome: 'failed', reason: null, sentence: START_FAILED, session: null });
      expect(answer.body ?? '', why).not.toContain('CANARY');
    }
  });

  it('composes startAnswer field by field, six fields and nothing else', () => {
    const extra = { id: 's', name: 'n', path: '/secret' } as unknown as { id: string; name: string };
    expect(JSON.parse(startAnswer(wid(3), 'done', null, null, extra))).toEqual({
      verb: 'start',
      write: wid(3),
      outcome: 'done',
      reason: null,
      sentence: null,
      session: { id: 's', name: 'n' }
    });
  });
});

// ---------------------------------------------------------------------------
// The last check
// ---------------------------------------------------------------------------

describe('the last check (§3.3 step 4)', () => {
  const cases: [string, (r: Rig) => void][] = [
    ['the quit', (r) => (r.quitting = true)],
    ['the phone removed', (r) => r.paired.delete('phone-a')],
    ['the route not served', (r) => r.served.delete('start')]
  ];
  for (const [why, arrange] of cases) {
    it(`answers 404 with nothing acted and nothing recorded: ${why}`, async () => {
      const r = rig();
      arrange(r);
      const answer = await r.handle(START, startBody(), 'phone-a', OPEN);
      expect(answer).toEqual({ status: 404, body: null });
      expect(r.starts).toEqual([]);
      // Nothing left behind: once allowed again, the same id acts.
      r.quitting = false;
      r.paired.add('phone-a');
      r.served.add('start');
      expect(answerOf(await r.handle(START, startBody(), 'phone-a', OPEN)).outcome).toBe('done');
      expect(r.starts).toHaveLength(1);
    });
  }

  it('answers 404 while the door stops, and asks nothing past it', async () => {
    const r = rig();
    const answer = await r.handle(START, startBody(), 'phone-a', { stopping: () => true });
    expect(answer).toEqual({ status: 404, body: null });
    expect(r.starts).toEqual([]);
  });

  it('answers 404 to a start on a host handed no writes, before anything is read', async () => {
    const asked: string[] = [];
    const handle = createPocketWriteHandler({
      shuttingDown: () => (asked.push('shuttingDown'), false),
      stillPaired: () => (asked.push('stillPaired'), true),
      routeServed: () => (asked.push('routeServed'), true)
    });
    expect(await handle(START, startBody(), 'phone-a', OPEN)).toEqual({ status: 404, body: null });
    expect(asked).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The ledger and the limits
// ---------------------------------------------------------------------------

describe('the ledger (D17)', () => {
  it('answers the same write id busy, acted, START_STILL while it runs, and the recorded answer after, with ONE act', async () => {
    const r = rig();
    const held = deferred<PocketStartOutcome>();
    r.startWith = () => held.promise;
    const first = r.handle(START, startBody(), 'phone-a', OPEN);
    await Promise.resolve();
    const again = await r.handle(START, startBody(), 'phone-a', OPEN);
    expect(again.acted).toBe(true);
    expect(answerOf(again)).toEqual({ verb: 'start', write: wid(1), outcome: 'busy', reason: null, sentence: START_STILL, session: null });
    held.resolve(DONE);
    const done = await first;
    const after = await r.handle(START, startBody(), 'phone-a', OPEN);
    expect(after).toEqual({ status: 200, body: done.body, acted: true });
    expect(answerOf(after).session).toEqual(DONE.outcome === 'done' ? DONE.session : null);
    expect(r.starts).toHaveLength(1);
  });

  it('keys a start apart from another verb under the same write id, and from another phone', async () => {
    const r = rig();
    await r.handle(END, Buffer.from(JSON.stringify({ batch: false, session: 's1', write: wid(1) }), 'utf8'), 'phone-a', OPEN);
    expect(r.others).toEqual(['end']);
    expect(answerOf(await r.handle(START, startBody(), 'phone-a', OPEN)).outcome).toBe('done');
    expect(answerOf(await r.handle(START, startBody(), 'phone-b', OPEN)).outcome).toBe('done');
    expect(r.starts).toHaveLength(2);
  });

  it('forgets a recorded start after the ledger’s life, so the same id may act again', async () => {
    const r = rig();
    await r.handle(START, startBody(), 'phone-a', OPEN);
    r.clock += 121_000;
    await r.handle(START, startBody(), 'phone-a', OPEN);
    expect(r.starts).toHaveLength(2);
  });
});

describe('the limits (D16, D18, D19)', () => {
  it('lets one start run on this Mac at a time across phones: a second phone reads busy START_BUSY, unrecorded', async () => {
    const r = rig();
    const held = deferred<PocketStartOutcome>();
    r.startWith = () => held.promise;
    const first = r.handle(START, startBody(), 'phone-a', OPEN);
    await Promise.resolve();
    const second = await r.handle(START, startBody({}, wid(2)), 'phone-b', OPEN);
    expect(second.acted).toBeUndefined();
    expect(answerOf(second)).toEqual({ verb: 'start', write: wid(2), outcome: 'busy', reason: null, sentence: START_BUSY, session: null });
    held.resolve(DONE);
    await first;
    expect(r.starts).toHaveLength(1);
    // Not recorded: the same id acts once the first is done.
    r.startWith = async () => DONE;
    expect(answerOf(await r.handle(START, startBody({}, wid(2)), 'phone-b', OPEN)).outcome).toBe('done');
    expect(r.starts).toHaveLength(2);
  });

  it('lets one write run per phone across verbs: a start while that phone’s End runs reads the door’s busy, and the reverse', async () => {
    const r = rig();
    const heldEnd = deferred<{ outcome: 'done' }>();
    r.endWith = () => heldEnd.promise;
    const ending = r.handle(END, Buffer.from(JSON.stringify({ batch: false, session: 's1', write: wid(7) }), 'utf8'), 'phone-a', OPEN);
    await Promise.resolve();
    expect(answerOf(await r.handle(START, startBody(), 'phone-a', OPEN))).toMatchObject({
      outcome: 'busy',
      sentence: POCKET_WRITE_SENTENCES.busy
    });
    // Another phone may start while phone-a's End runs.
    expect(answerOf(await r.handle(START, startBody({}, wid(3)), 'phone-b', OPEN)).outcome).toBe('done');
    heldEnd.resolve({ outcome: 'done' });
    await ending;
    const heldStart = deferred<PocketStartOutcome>();
    r.startWith = () => heldStart.promise;
    const starting = r.handle(START, startBody({}, wid(4)), 'phone-a', OPEN);
    await Promise.resolve();
    const end = await r.handle(END, Buffer.from(JSON.stringify({ batch: false, session: 's2', write: wid(5) }), 'utf8'), 'phone-a', OPEN);
    expect(JSON.parse(end.body as string)).toMatchObject({ verb: 'end', outcome: 'busy' });
    heldStart.resolve(DONE);
    await starting;
  });

  it(`refuses the ${String(START_RATE_MAX + 1)}th start in ${String(START_RATE_WINDOW_MS)} ms often, unrecorded, and lets it act once the window allows`, async () => {
    expect(START_RATE_MAX).toBe(6);
    expect(START_RATE_WINDOW_MS).toBe(60_000);
    const r = rig();
    for (let i = 1; i <= START_RATE_MAX; i += 1) {
      expect(answerOf(await r.handle(START, startBody({}, wid(i)), 'phone-a', OPEN)).outcome).toBe('done');
      r.clock += 1_000;
    }
    const seventh = await r.handle(START, startBody({}, wid(7)), 'phone-a', OPEN);
    expect(seventh.acted).toBeUndefined();
    expect(answerOf(seventh)).toEqual({ verb: 'start', write: wid(7), outcome: 'refused', reason: 'often', sentence: START_OFTEN, session: null });
    expect(r.starts).toHaveLength(START_RATE_MAX);
    // Another phone has its own count.
    expect(answerOf(await r.handle(START, startBody({}, wid(8)), 'phone-b', OPEN)).outcome).toBe('done');
    // The first start leaves the window at exactly 60 s after it: the same id acts.
    r.clock = 5_000_000 + START_RATE_WINDOW_MS;
    expect(answerOf(await r.handle(START, startBody({}, wid(7)), 'phone-a', OPEN)).outcome).toBe('done');
    expect(r.starts).toHaveLength(START_RATE_MAX + 2);
  });

  it('counts a start at its claim, so one refused at the last check still counts', async () => {
    const r = rig();
    r.served.delete('start');
    for (let i = 1; i <= START_RATE_MAX; i += 1) {
      expect((await r.handle(START, startBody({}, wid(i)), 'phone-a', OPEN)).status).toBe(404);
    }
    r.served.add('start');
    expect(answerOf(await r.handle(START, startBody({}, wid(9)), 'phone-a', OPEN)).reason).toBe('often');
    expect(r.starts).toEqual([]);
  });
});
