/**
 * THE PHONE'S RENAME THROUGH THE DOOR (Phase 349, build/p349/SPEC.md §4.1,
 * §4.2 steps 1 to 3, D2, D6, D10, D13, D21), driven against the SHIPPING door
 * table, caps, wire validator, route ledger, contract words and write path
 * (src/main/pocket/writes.ts).
 *
 *  - THE ROUTE: one signed POST alive outside any window, LAST in the table,
 *    both id lists and the ledger, NOT one of the eleven every older store was
 *    allowed (so it waits for its own Allow, D13) and NOT a write that answers
 *    `PocketWriteAnswer`; its cap 2,048 over a worst legal body of 915 bytes
 *    (§2.4); its words (D10) in the Allow line, the honesty sentence, the face
 *    and the New line, none naming Face ID (D8).
 *  - THE BODY: `{ name, session, write }` exactly, read by the one strict
 *    parse; the name ANY string, taken as it is (D6): no trim, an escape legal,
 *    a key given twice keeping its last value.
 *  - THE ANSWER: `PocketRenameAnswer`'s six fields in order, `name` non-null
 *    exactly when `done` (D21).
 *  - THE PATH: the act called with the session id and the name as sent, once;
 *    its busy, malformed and recorded answers in the rename's own shape; one in
 *    flight per phone and per session ACROSS verbs; the route, the door, the
 *    phone and the quit asked at the last check; one log line naming neither
 *    the name nor the write id; a `done` with no name answered `failed`.
 */

import { describe, expect, it, vi } from 'vitest';

const logged: { msg: string; fields: Record<string, unknown> | undefined }[] = [];

vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const capture = (msg: string, fields?: Record<string, unknown>): void => {
    logged.push({ msg, fields });
  };
  return { ...real, getLog: () => ({ error: capture, warn: capture, info: capture, debug: capture }) };
});

const { createPocketWriteHandler, parseRenameBody, renameAnswer } = await import('../writes');
const { POCKET_ROUTES } = await import('../door/table');
const { POCKET_WRITE_BODY_CAPS } = await import('../door/limits');
const { doorRequestOf } = await import('../door/wire');
const { POCKET_ROUTE_LEDGER } = await import('../route-ledger');
const { WRITE_CLAUSES, describePocketDoor } = await import('../pairing');
const pocket = await import('@shared/ipc/pocket');
const { RENAME_FAILED, LIFECYCLE_SESSION_CHANGED, SESSION_NOT_FOUND } = await import('@shared/lifecycle-words');
const { SESSION_NAME_CHARACTER, SESSION_NAME_MAX_UNITS } = await import('@shared/session-names');
type PocketRoute = import('../door/table').PocketRoute;
type PocketWrites = import('../routes').PocketWrites;
type PocketRenameOutcome = import('../routes').PocketRenameOutcome;
type DoorAdmission = import('../bind').DoorAdmission;

const RENAME = POCKET_ROUTES.find((r) => r.id === 'rename') as PocketRoute;
const END = POCKET_ROUTES.find((r) => r.id === 'end') as PocketRoute;
const KEYS = POCKET_ROUTES.find((r) => r.id === 'keys') as PocketRoute;
const OPEN: DoorAdmission = { stopping: () => false };
const CLAUSE = 'rename a session';
const TURN = '0123456789abcdef-1';

const wid = (n: number): string => n.toString(16).padStart(32, '0');
const ch = (code: number): string => String.fromCharCode(code);
/** A rename body, its keys sorted as the phone sorts them. */
const renameBody = (session: string, name: string, write: string): Buffer => Buffer.from(JSON.stringify({ name, session, write }), 'utf8');
const endBody = (session: string, write: string): Buffer => Buffer.from(JSON.stringify({ batch: false, session, write }), 'utf8');
const keysBody = (session: string, write: string): Buffer =>
  Buffer.from(JSON.stringify({ dialog: null, keys: [{ t: 'x' }], session, turn: TURN, write }), 'utf8');

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

interface Rig {
  handle: ReturnType<typeof createPocketWriteHandler>;
  renames: { sessionId: string; name: string }[];
  asked: string[];
  served: Set<string>;
  paired: boolean;
  quitting: boolean;
  stopping: boolean;
  renameWith: (input: { sessionId: string; name: string }) => Promise<PocketRenameOutcome>;
  endWith: () => Promise<{ outcome: 'done' }>;
  keysWith: () => Promise<{ outcome: 'done' }>;
}

function rig(): Rig {
  const self: Rig = {
    handle: undefined as unknown as Rig['handle'],
    renames: [],
    asked: [],
    served: new Set(pocket.POCKET_WRITE_ROUTE_IDS),
    paired: true,
    quitting: false,
    stopping: false,
    // The Mac's verb stores the name trimmed, as the renderer trims it.
    renameWith: async (input) => ({ outcome: 'done', name: input.name.trim() }),
    endWith: async () => ({ outcome: 'done' }),
    keysWith: async () => ({ outcome: 'done' })
  };
  const writes: PocketWrites = {
    end: () => {
      self.asked.push('end');
      return self.endWith();
    },
    choose: async () => ({ outcome: 'done' }),
    say: async () => ({ outcome: 'done' }),
    keys: () => {
      self.asked.push('keys');
      return self.keysWith();
    },
    start: async () => ({ outcome: 'failed', sentence: 'not in this test' }),
    remove: async () => ({ outcome: 'failed', sentence: 'not in this test' }),
    paste: async () => ({ outcome: 'failed', sentence: 'not in this test' }),
    rename: (input) => {
      self.asked.push('rename');
      self.renames.push(input);
      return self.renameWith(input);
    }
  };
  self.handle = createPocketWriteHandler({
    shuttingDown: () => self.quitting,
    stillPaired: () => self.paired,
    routeServed: (id) => self.served.has(id),
    writes,
    now: () => 3_000_000
  });
  return self;
}

/** A door whose last check reads `stopping` off the rig. */
const doorOf = (r: Rig): DoorAdmission => ({ stopping: () => r.stopping });

const answerOf = (body: string | null): Record<string, unknown> => JSON.parse(body ?? 'null') as Record<string, unknown>;

/** The body a door request validator is handed for a write of `bytes` bytes. */
function request(bytes: number): Record<string, unknown> {
  return {
    route: 'rename',
    method: 'POST',
    target: '/v1/rename',
    headers: { 'x-tortie-phone': 'p', 'x-tortie-timestamp': '1', 'x-tortie-nonce': 'n'.repeat(16), 'x-tortie-signature': 's' },
    body: new Uint8Array(bytes),
    channel: 'p'
  };
}

// ---------------------------------------------------------------------------

describe('the route and its words (D10, D13, §4.1)', () => {
  it('is one signed POST alive outside any window, last everywhere it is listed', () => {
    expect(POCKET_ROUTES.filter((r) => r.id === 'rename')).toEqual([
      { id: 'rename', method: 'POST', path: '/v1/rename', reads: false, windowOnly: false, signed: true }
    ]);
    expect(POCKET_ROUTES.filter((r) => r.path === '/v1/rename')).toHaveLength(1);
    expect(POCKET_ROUTES.at(-1)?.id).toBe('rename');
    expect(pocket.POCKET_ROUTE_IDS.at(-1)).toBe('rename');
    expect(pocket.POCKET_ROUTE_IDS.slice(-2)).toEqual(['paste', 'rename']);
    expect(pocket.POCKET_WRITE_ROUTE_IDS).toEqual(['end', 'choose', 'say', 'keys', 'start', 'remove', 'paste', 'rename']);
  });

  it('waits for its own Allow and answers its own shape: in neither the eleven nor the session writes', () => {
    // Not one of the eleven every older store was allowed: it waits for its own Allow (D13).
    expect((pocket.LEGACY_ALLOWED_ROUTES as readonly string[]).includes('rename')).toBe(false);
    // Not a write the frozen phones read PocketWriteAnswer for (gate:onlyadd A3).
    expect((pocket.POCKET_SESSION_WRITE_IDS as readonly string[]).includes('rename')).toBe(false);
    expect(pocket.POCKET_SESSION_WRITE_IDS).toEqual(['end', 'choose', 'say', 'keys']);
  });

  it('holds a cap of 2,048 over the worst legal body of 915 bytes, and the door process holds it too', () => {
    expect(POCKET_WRITE_BODY_CAPS.rename).toBe(2_048);
    const session = 'aZ09._:-'.repeat(16);
    const write = 'f'.repeat(32);
    // §2.4: 120 C0 units, each escaped six bytes; 60 astral characters,
    // escaped as surrogate pairs by an encoder that escapes them; 120 quotes;
    // 120 three-byte characters raw.
    const c0 = renameBody(session, ch(0x01).repeat(SESSION_NAME_MAX_UNITS), write);
    expect(c0.byteLength).toBe(915);
    const astral = Buffer.from(
      `{"name":"${'\\ud83d\\ude00'.repeat(SESSION_NAME_MAX_UNITS / 2)}","session":"${session}","write":"${write}"}`,
      'utf8'
    );
    expect(astral.byteLength).toBe(915);
    expect(renameBody(session, '"'.repeat(SESSION_NAME_MAX_UNITS), write).byteLength).toBe(435);
    expect(renameBody(session, '中'.repeat(SESSION_NAME_MAX_UNITS), write).byteLength).toBe(555);
    for (const worst of [c0, astral]) {
      expect(worst.byteLength * 2).toBeLessThan(POCKET_WRITE_BODY_CAPS.rename);
      expect(parseRenameBody(worst).ok).toBe(true);
    }
    expect(doorRequestOf(request(2_048))).toMatchObject({ route: 'rename', method: 'POST', target: '/v1/rename' });
    expect(doorRequestOf(request(2_049))).toBeNull();
    expect(doorRequestOf({ ...request(10), target: '/v1/rename?x=1' })).toBeNull();
    expect(doorRequestOf({ ...request(10), method: 'GET' })).toBeNull();
  });

  it('is the ledger’s row, its cap and its clause, appended after paste’s', () => {
    const at = POCKET_ROUTE_LEDGER.findIndex((r) => r.id === 'rename');
    expect(at).toBe(POCKET_ROUTE_LEDGER.length - 1);
    expect(POCKET_ROUTE_LEDGER[at - 1]?.id).toBe('paste');
    expect(POCKET_ROUTE_LEDGER[at]).toEqual({
      id: 'rename',
      method: 'POST',
      path: '/v1/rename',
      reads: false,
      signed: true,
      windowOnly: false,
      bodyCap: 2048,
      clause: CLAUSE
    });
    expect(WRITE_CLAUSES.rename).toBe(CLAUSE);
  });

  it('says its clause in the Allow line, the honesty sentence, the face and the New line, and names no Face ID', () => {
    const fields = {
      funnelProgram: '/Applications/Tailscale.app/Contents/MacOS/Tailscale',
      tailnet: 'example.github',
      publicName: 'mac.tail0000.ts.net',
      publicPort: 8443,
      bindAtLaunch: false,
      phones: [],
      pushAlerts: false
    };
    const fourteen = [...pocket.LEGACY_ALLOWED_ROUTES, 'start', 'remove', 'paste'] as const;
    const without = describePocketDoor({ ...fields, routes: [...fourteen] });
    const withIt = describePocketDoor({ ...fields, routes: [...fourteen, 'rename'] });
    expect(without.lines.join('\n')).not.toContain(CLAUSE);
    expect(withIt.lines.find((l) => l.startsWith('Lets an allowed phone'))?.endsWith(` and ${CLAUSE}`)).toBe(true);
    expect(withIt.hash).not.toBe(without.hash);
    expect(pocket.pocketDoorHonesty([...pocket.LEGACY_ALLOWED_ROUTES, 'rename'])).toBe(`${pocket.POCKET_DOOR_HONESTY} It can also ${CLAUSE}.`);
    expect(pocket.POCKET_FACE_CLAUSES.rename).toBe('rename sessions');
    expect(pocket.POCKET_NEW_ROUTE_WORDS.rename).toEqual({
      title: 'rename sessions from your phone',
      sentence: 'Name a session as you start it, or rename one later.'
    });
    for (const said of [CLAUSE, 'rename sessions', pocket.POCKET_NEW_ROUTE_WORDS.rename?.title ?? '', pocket.POCKET_NEW_ROUTE_WORDS.rename?.sentence ?? '']) {
      expect(said).not.toMatch(/face id|touch id|passcode/i);
    }
  });
});

describe('the body (D6, §4.2 step 1)', () => {
  const W = wid(7);
  it('reads exactly { name, session, write }, in any key order', () => {
    expect(parseRenameBody(renameBody('s1', 'nightly', W))).toEqual({ ok: true, verb: 'rename', write: W, session: 's1', name: 'nightly' });
    // Whitespace JSON allows is fine; the phone sorts its keys, a client need not.
    expect(parseRenameBody(Buffer.from(`{ "write": "${W}", "session": "s1", "name": "x" }`))).toEqual({
      ok: true,
      verb: 'rename',
      write: W,
      session: 's1',
      name: 'x'
    });
  });

  it('takes the name AS IT IS: empty, spaces, a refused character and a lone surrogate reach the verb, which answers them in words', () => {
    for (const name of ['', '   ', '  padded  ', `a${ch(0x09)}b`, `x${ch(0x202e)}y`, ch(0xd800), 'it’s "x" fix--auth', '👨‍👩‍👧‍👦 fam', 'x'.repeat(121)]) {
      expect(parseRenameBody(renameBody('s1', name, W)), JSON.stringify(name)).toEqual({ ok: true, verb: 'rename', write: W, session: 's1', name });
    }
  });

  it('is NOT held to its own bytes (D6): an escaped character is a name, and a key given twice keeps its last value', () => {
    // `s1` is the name "s1", written with escapes, which the start's
    // and Remove's own-bytes rule would refuse.
    const escaped = Buffer.from(`{"name":"\\u0073\\u0031","session":"s1","write":"${W}"}`, 'utf8');
    expect(parseRenameBody(escaped)).toEqual({ ok: true, verb: 'rename', write: W, session: 's1', name: 's1' });
    const twice = Buffer.from(`{"name":"first","name":"last","session":"s1","write":"${W}"}`, 'utf8');
    expect(parseRenameBody(twice)).toEqual({ ok: true, verb: 'rename', write: W, session: 's1', name: 'last' });
  });

  const malformed: [string, string, string][] = [
    ['not JSON', '{"name":"x",', ''],
    ['an array', '["x"]', ''],
    ['null', 'null', ''],
    ['a missing name', `{"session":"s1","write":"${W}"}`, W],
    ['a missing session', `{"name":"x","write":"${W}"}`, W],
    ['an extra key', `{"name":"x","session":"s1","why":"y","write":"${W}"}`, W],
    ['a batch', `{"batch":false,"name":"x","session":"s1","write":"${W}"}`, W],
    ['the start’s keys', `{"agent":"claude","project":"p1","write":"${W}"}`, W],
    ['the Remove’s keys', `{"session":"s1","write":"${W}"}`, W],
    ['a number for the name', `{"name":7,"session":"s1","write":"${W}"}`, W],
    ['null for the name', `{"name":null,"session":"s1","write":"${W}"}`, W],
    ['an object for the name', `{"name":{"t":"x"},"session":"s1","write":"${W}"}`, W],
    ['a session id with a slash', `{"name":"x","session":"../s1","write":"${W}"}`, W],
    ['a session id of 129', `{"name":"x","session":"${'a'.repeat(129)}","write":"${W}"}`, W],
    ['a write id in capitals', `{"name":"x","session":"s1","write":"${'AB'.repeat(16)}"}`, ''],
    ['a short write id', '{"name":"x","session":"s1","write":"abc"}', ''],
    ['a body over its cap', `{"name":"${'x'.repeat(2_100)}","session":"s1","write":"${W}"}`, W]
  ];
  for (const [name, text, echo] of malformed) {
    it(`refuses ${name}, echoing ${echo === '' ? 'no' : 'its'} write id`, () => {
      expect(parseRenameBody(Buffer.from(text, 'utf8'))).toEqual({ ok: false, write: echo });
    });
  }
});

describe('the answer (§4.2 step 2, D21)', () => {
  it('is exactly the six fields, in order, verb rename, the stored name only when done', () => {
    expect(renameAnswer(wid(1), 'done', null, null, 'nightly')).toBe(
      `{"verb":"rename","write":"${wid(1)}","outcome":"done","reason":null,"sentence":null,"name":"nightly"}`
    );
    expect(JSON.parse(renameAnswer(wid(2), 'refused', 'name', SESSION_NAME_CHARACTER, null))).toEqual({
      verb: 'rename',
      write: wid(2),
      outcome: 'refused',
      reason: 'name',
      sentence: SESSION_NAME_CHARACTER,
      name: null
    });
    expect(Object.keys(JSON.parse(renameAnswer('', 'busy', null, 'x', null)) as object)).toEqual(['verb', 'write', 'outcome', 'reason', 'sentence', 'name']);
  });
});

describe('the write path (§4.2 step 3)', () => {
  it('acts once with the session id and the name as sent, answers the name stored marked acted, and logs one line naming neither', async () => {
    const r = rig();
    logged.length = 0;
    const answer = await r.handle(RENAME, renameBody('s1', '  CANARY name  ', wid(3)), 'phone-a', OPEN);
    expect(answer).toEqual({
      status: 200,
      body: renameAnswer(wid(3), 'done', null, null, 'CANARY name'),
      acted: true
    });
    // The verb trims, as the Mac does; the door hands it what the phone sent.
    expect(r.renames).toEqual([{ sessionId: 's1', name: '  CANARY name  ' }]);
    expect(r.asked).toEqual(['rename']);
    expect(logged).toEqual([{ msg: "the phone's rename: done", fields: { session: 's1' } }]);
    expect(JSON.stringify(logged)).not.toContain(wid(3));
    expect(JSON.stringify(logged)).not.toContain('CANARY');
  });

  it('answers the same write id again from the ledger, acting on nothing; a fresh id acts', async () => {
    const r = rig();
    const first = await r.handle(RENAME, renameBody('s1', 'a', wid(4)), 'phone-a', OPEN);
    const again = await r.handle(RENAME, renameBody('s1', 'a', wid(4)), 'phone-a', OPEN);
    expect(again).toEqual(first);
    expect(r.renames).toHaveLength(1);
    await r.handle(RENAME, renameBody('s1', 'a', wid(5)), 'phone-a', OPEN);
    expect(r.renames).toHaveLength(2);
  });

  it('keys a rename apart from another verb under the same write id, and from another phone', async () => {
    const r = rig();
    await r.handle(END, endBody('s1', wid(6)), 'phone-a', OPEN);
    expect(answerOf((await r.handle(RENAME, renameBody('s1', 'a', wid(6)), 'phone-a', OPEN)).body).outcome).toBe('done');
    expect(answerOf((await r.handle(RENAME, renameBody('s1', 'a', wid(6)), 'phone-b', OPEN)).body).outcome).toBe('done');
    expect(r.renames).toHaveLength(2);
  });

  it('answers the same write id busy, acted, while it runs, and the recorded answer after, with ONE act', async () => {
    const r = rig();
    const held = deferred<PocketRenameOutcome>();
    r.renameWith = () => held.promise;
    const first = r.handle(RENAME, renameBody('s1', 'a', wid(7)), 'phone-a', OPEN);
    await Promise.resolve();
    const again = await r.handle(RENAME, renameBody('s1', 'a', wid(7)), 'phone-a', OPEN);
    expect(again.acted).toBe(true);
    expect(answerOf(again.body)).toEqual({ verb: 'rename', write: wid(7), outcome: 'busy', reason: null, sentence: pocket.POCKET_WRITE_SENTENCES.busy, name: null });
    held.resolve({ outcome: 'done', name: 'a' });
    const done = await first;
    expect(await r.handle(RENAME, renameBody('s1', 'a', wid(7)), 'phone-a', OPEN)).toEqual({ status: 200, body: done.body, acted: true });
    expect(r.renames).toHaveLength(1);
  });

  it('refuses a malformed body in the rename’s own shape, and acts on nothing', async () => {
    const r = rig();
    const answer = await r.handle(RENAME, Buffer.from(`{"name":7,"session":"s1","write":"${wid(8)}"}`), 'phone-a', OPEN);
    expect(answer.status).toBe(200);
    expect(answer.acted).toBeUndefined();
    expect(answerOf(answer.body)).toEqual({
      verb: 'rename',
      write: wid(8),
      outcome: 'refused',
      reason: 'malformed',
      sentence: pocket.POCKET_WRITE_SENTENCES.unreadable,
      name: null
    });
    expect(r.renames).toEqual([]);
  });

  it('never overlaps an End on one session: each is busy in its own shape while the other is in flight', async () => {
    const r = rig();
    const hold = deferred<{ outcome: 'done' }>();
    r.endWith = () => hold.promise;
    const ending = r.handle(END, endBody('s1', wid(9)), 'phone-a', OPEN);
    const busy = await r.handle(RENAME, renameBody('s1', 'as it ends', wid(10)), 'phone-b', OPEN);
    expect(answerOf(busy.body)).toEqual({ verb: 'rename', write: wid(10), outcome: 'busy', reason: null, sentence: pocket.POCKET_WRITE_SENTENCES.busy, name: null });
    expect(r.renames).toEqual([]);
    hold.resolve({ outcome: 'done' });
    await ending;
    // And the other way round.
    const holdRename = deferred<PocketRenameOutcome>();
    r.renameWith = () => holdRename.promise;
    const renaming = r.handle(RENAME, renameBody('s2', 'a', wid(11)), 'phone-a', OPEN);
    const endBusy = await r.handle(END, endBody('s2', wid(12)), 'phone-b', OPEN);
    expect(answerOf(endBusy.body)).toMatchObject({ verb: 'end', outcome: 'busy' });
    holdRename.resolve({ outcome: 'done', name: 'a' });
    expect((await renaming).acted).toBe(true);
  });

  it('holds one write in flight per phone across verbs: a rename while the same phone’s keys write runs is busy, and renames nothing', async () => {
    const r = rig();
    const hold = deferred<{ outcome: 'done' }>();
    r.keysWith = () => hold.promise;
    const typing = r.handle(KEYS, keysBody('s3', wid(13)), 'phone-a', OPEN);
    const busy = await r.handle(RENAME, renameBody('s4', 'a', wid(14)), 'phone-a', OPEN);
    expect(answerOf(busy.body)).toMatchObject({ verb: 'rename', outcome: 'busy', name: null });
    expect(r.renames).toEqual([]);
    hold.resolve({ outcome: 'done' });
    await typing;
    // Nothing kept: the same write id acts once the phone's write is done.
    expect(answerOf((await r.handle(RENAME, renameBody('s4', 'a', wid(14)), 'phone-a', OPEN)).body).outcome).toBe('done');
    expect(r.renames).toHaveLength(1);
  });

  it('a route nobody allowed is the door’s 404 at the last check, before anything acts', async () => {
    const r = rig();
    r.served.delete('rename');
    expect(await r.handle(RENAME, renameBody('s1', 'a', wid(15)), 'phone-a', OPEN)).toEqual({ status: 404, body: null });
    expect(r.renames).toEqual([]);
    // Nothing kept: the same write id acts once it is served.
    r.served.add('rename');
    expect((await r.handle(RENAME, renameBody('s1', 'a', wid(15)), 'phone-a', OPEN)).acted).toBe(true);
    expect(r.renames).toHaveLength(1);
  });

  it('a phone removed, the door stopping or the quit before the act is a 404 with nothing renamed', async () => {
    for (const [what, set] of [
      ['the phone removed', (r: Rig) => (r.paired = false)],
      ['the door stopping', (r: Rig) => (r.stopping = true)],
      ['the quit', (r: Rig) => (r.quitting = true)]
    ] as const) {
      const r = rig();
      set(r);
      expect(await r.handle(RENAME, renameBody('s1', 'a', wid(16)), 'phone-a', doorOf(r)), what).toEqual({ status: 404, body: null });
      expect(r.renames, what).toEqual([]);
    }
  });

  it('a host with no writes answers a rename the way it answers a route it does not have', async () => {
    const handle = createPocketWriteHandler({ shuttingDown: () => false, stillPaired: () => true, routeServed: () => true });
    expect(await handle(RENAME, renameBody('s1', 'a', wid(17)), 'phone-a', OPEN)).toEqual({ status: 404, body: null });
  });

  it('answers what the verb refused, in its words, with no name', async () => {
    const r = rig();
    const refusals = [
      ['name', SESSION_NAME_CHARACTER],
      ['changed', LIFECYCLE_SESSION_CHANGED],
      ['gone', SESSION_NOT_FOUND],
      ['unreachable', 'Tortie cannot see whether this session is running, so it cannot rename it.']
    ] as const;
    for (const [i, [reason, sentence]] of refusals.entries()) {
      r.renameWith = async () => ({ outcome: 'refused', reason, sentence });
      const answer = await r.handle(RENAME, renameBody('s1', 'a', wid(20 + i)), 'phone-a', OPEN);
      expect(answer.acted, reason).toBe(true);
      expect(answerOf(answer.body), reason).toEqual({ verb: 'rename', write: wid(20 + i), outcome: 'refused', reason, sentence, name: null });
    }
  });

  it('answers a failed rename in its own words, and a rejection or a throw as failed with RENAME_FAILED, logging no text', async () => {
    const r = rig();
    logged.length = 0;
    r.renameWith = async () => ({ outcome: 'failed', sentence: 'the verb’s own failure' });
    expect(answerOf((await r.handle(RENAME, renameBody('s1', 'a', wid(30)), 'phone-a', OPEN)).body)).toEqual({
      verb: 'rename',
      write: wid(30),
      outcome: 'failed',
      reason: null,
      sentence: 'the verb’s own failure',
      name: null
    });
    r.renameWith = () => Promise.reject(new Error('CANARY'));
    const rejected = await r.handle(RENAME, renameBody('s1', 'a', wid(31)), 'phone-a', OPEN);
    expect(answerOf(rejected.body)).toEqual({ verb: 'rename', write: wid(31), outcome: 'failed', reason: null, sentence: RENAME_FAILED, name: null });
    expect(rejected.acted).toBe(true);
    r.renameWith = () => {
      throw new Error('CANARY');
    };
    expect(answerOf((await r.handle(RENAME, renameBody('s1', 'a', wid(32)), 'phone-a', OPEN)).body)).toMatchObject({
      outcome: 'failed',
      sentence: RENAME_FAILED,
      name: null
    });
    expect(JSON.stringify(logged)).not.toContain('CANARY');
  });

  it('answers a done whose name is not a non-empty string as failed with RENAME_FAILED (D21)', async () => {
    const r = rig();
    const bads = [
      ['an empty name', ''],
      ['a number', 7],
      ['null', null],
      ['no name at all', undefined]
    ] as const;
    for (const [i, [what, bad]] of bads.entries()) {
      r.renameWith = async () => ({ outcome: 'done', name: bad }) as unknown as PocketRenameOutcome;
      const answer = await r.handle(RENAME, renameBody('s1', 'a', wid(40 + i)), 'phone-a', OPEN);
      expect(answerOf(answer.body), what).toEqual({ verb: 'rename', write: wid(40 + i), outcome: 'failed', reason: null, sentence: RENAME_FAILED, name: null });
      expect(answer.acted, what).toBe(true);
    }
  });

  it('answers an outcome the verb never names as failed with RENAME_FAILED, and a name exactly as main stored it', async () => {
    const r = rig();
    r.renameWith = async () => ({ outcome: 'maybe' }) as unknown as PocketRenameOutcome;
    expect(answerOf((await r.handle(RENAME, renameBody('s1', 'a', wid(50)), 'phone-a', OPEN)).body)).toMatchObject({ outcome: 'failed', sentence: RENAME_FAILED, name: null });
    // The name in the answer is what main stored, never the one the phone sent.
    r.renameWith = async () => ({ outcome: 'done', name: 'what main stored' });
    expect(answerOf((await r.handle(RENAME, renameBody('s1', 'what the phone sent', wid(51)), 'phone-a', OPEN)).body)).toMatchObject({
      outcome: 'done',
      reason: null,
      sentence: null,
      name: 'what main stored'
    });
  });
});
