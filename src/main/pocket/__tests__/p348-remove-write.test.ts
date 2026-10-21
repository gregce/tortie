/**
 * THE PHONE'S REMOVE THROUGH THE DOOR (Phase 348, build/p348/SPEC.md §4.2
 * steps 1 to 5, D9, D26 to D28, D32, D49), driven against the SHIPPING door
 * table, caps, wire validator, route ledger, contract words, write path
 * (src/main/pocket/writes.ts) and session composer (src/main/pocket/routes.ts).
 *
 *  - THE ROUTE: one signed POST alive outside any window, after `start` in the
 *    table, both id lists and the ledger, NOT one of the eleven every older
 *    store was allowed (so it waits for its own Allow) and NOT a write that
 *    answers `PocketWriteAnswer`; its cap 512 over a worst body of 185 bytes;
 *    its words in the Allow line, the honesty sentence, the face and the New
 *    line, none naming Face ID.
 *  - THE BODY: `{ session, write }` exactly, read by the one strict parse; a
 *    batch, a key given twice or an escaped value is malformed.
 *  - THE PATH: the act called with the session id alone, once; the answer
 *    `PocketRemoveAnswer`'s five fields, its busy, malformed and recorded
 *    answers in that shape; one in flight per session ACROSS verbs, so an End
 *    and a Remove never overlap; the route asked at the last check; one log
 *    line with no write id.
 *  - THE OFFER: `/v1/session` carries `removeConfirm` only when the facts'
 *    `removeConfirmOf` answers words, copied field by field.
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

const { createPocketWriteHandler, parseRemoveBody, removeAnswer } = await import('../writes');
const { POCKET_ROUTES } = await import('../door/table');
const { POCKET_WRITE_BODY_CAPS } = await import('../door/limits');
const { doorRequestOf } = await import('../door/wire');
const { POCKET_ROUTE_LEDGER } = await import('../route-ledger');
const { WRITE_CLAUSES, describePocketDoor } = await import('../pairing');
const { createPocketRoutes } = await import('../routes');
const pocket = await import('@shared/ipc/pocket');
const { REMOVE_FAILED, LIFECYCLE_SESSION_CHANGED } = await import('@shared/lifecycle-words');
type PocketRoute = import('../door/table').PocketRoute;
type PocketWrites = import('../routes').PocketWrites;
type PocketFacts = import('../routes').PocketFacts;
type PocketRemoveOutcome = import('../routes').PocketRemoveOutcome;
type DoorAdmission = import('../bind').DoorAdmission;
type Session = import('@shared/types').Session;

const REMOVE = POCKET_ROUTES.find((r) => r.id === 'remove') as PocketRoute;
const END = POCKET_ROUTES.find((r) => r.id === 'end') as PocketRoute;
const OPEN: DoorAdmission = { stopping: () => false };
const CLAUSE = 'remove a session that has ended';

const wid = (n: number): string => n.toString(16).padStart(32, '0');
const removeBody = (session: string, write: string): Buffer => Buffer.from(JSON.stringify({ session, write }), 'utf8');
const endBody = (session: string, write: string): Buffer => Buffer.from(JSON.stringify({ batch: false, session, write }), 'utf8');

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

interface Rig {
  handle: ReturnType<typeof createPocketWriteHandler>;
  removes: { sessionId: string }[];
  ends: unknown[];
  served: Set<string>;
  asked: string[];
  removeWith: () => Promise<PocketRemoveOutcome>;
  endWith: () => Promise<{ outcome: 'done' }>;
}

function rig(): Rig {
  const self: Rig = {
    handle: undefined as unknown as Rig['handle'],
    removes: [],
    ends: [],
    served: new Set(pocket.POCKET_WRITE_ROUTE_IDS),
    asked: [],
    removeWith: async () => ({ outcome: 'done' }),
    endWith: async () => ({ outcome: 'done' })
  };
  const writes: PocketWrites = {
    end: (input) => {
      self.ends.push(input);
      return self.endWith();
    },
    choose: async () => ({ outcome: 'done' }),
    say: async () => ({ outcome: 'done' }),
    keys: async () => ({ outcome: 'done' }),
    start: async () => ({ outcome: 'failed', sentence: 'not in this test' }),
    remove: (input) => {
      self.removes.push(input);
      return self.removeWith();
    },
    paste: async () => ({ outcome: 'failed', sentence: 'not in this test' })
  };
  self.handle = createPocketWriteHandler({
    shuttingDown: () => false,
    stillPaired: () => true,
    routeServed: (id) => {
      self.asked.push(id);
      return self.served.has(id);
    },
    writes,
    now: () => 1_000_000
  });
  return self;
}

const answerOf = (body: string | null): Record<string, unknown> => JSON.parse(body ?? 'null') as Record<string, unknown>;

// ---------------------------------------------------------------------------

describe('the route and its words (D9, D26, D32)', () => {
  it('is one signed POST alive outside any window, after start, before paste, everywhere it is listed', () => {
    expect(POCKET_ROUTES.filter((r) => r.id === 'remove')).toEqual([
      { id: 'remove', method: 'POST', path: '/v1/remove', reads: false, windowOnly: false, signed: true }
    ]);
    const ids = POCKET_ROUTES.map((r) => r.id);
    expect(ids.indexOf('remove')).toBe(ids.indexOf('start') + 1);
    expect(pocket.POCKET_ROUTE_IDS.slice(-3)).toEqual(['start', 'remove', 'paste']);
    expect(pocket.POCKET_WRITE_ROUTE_IDS).toEqual(['end', 'choose', 'say', 'keys', 'start', 'remove', 'paste']);
    // Not one of the eleven every older store was allowed: it waits for its own Allow.
    expect((pocket.LEGACY_ALLOWED_ROUTES as readonly string[]).includes('remove')).toBe(false);
    // Not a write the frozen phones read PocketWriteAnswer for (gate:onlyadd A3).
    expect((pocket.POCKET_SESSION_WRITE_IDS as readonly string[]).includes('remove')).toBe(false);
  });

  it('holds a cap of 512 over a worst legal body of 185 bytes, and the door process holds it too', () => {
    expect(POCKET_WRITE_BODY_CAPS.remove).toBe(512);
    const worst = removeBody('aZ09._:-'.repeat(16), 'f'.repeat(32));
    expect(worst.byteLength).toBe(185);
    expect(parseRemoveBody(worst).ok).toBe(true);
    const request = (bytes: number): Record<string, unknown> => ({
      route: 'remove',
      method: 'POST',
      target: '/v1/remove',
      headers: { 'x-tortie-phone': 'p', 'x-tortie-timestamp': '1', 'x-tortie-nonce': 'n'.repeat(16), 'x-tortie-signature': 's' },
      body: new Uint8Array(bytes),
      channel: 'p'
    });
    expect(doorRequestOf(request(512))).toMatchObject({ route: 'remove', method: 'POST', target: '/v1/remove' });
    expect(doorRequestOf(request(513))).toBeNull();
    expect(doorRequestOf({ ...request(10), target: '/v1/remove?x=1' })).toBeNull();
    expect(doorRequestOf({ ...request(10), method: 'GET' })).toBeNull();
  });

  it('is the ledger’s row, its cap and its clause, appended after start’s', () => {
    const at = POCKET_ROUTE_LEDGER.findIndex((r) => r.id === 'remove');
    expect(POCKET_ROUTE_LEDGER[at - 1]?.id).toBe('start');
    expect(POCKET_ROUTE_LEDGER[at]).toEqual({
      id: 'remove',
      method: 'POST',
      path: '/v1/remove',
      reads: false,
      signed: true,
      windowOnly: false,
      bodyCap: 512,
      clause: CLAUSE
    });
    expect(WRITE_CLAUSES.remove).toBe(CLAUSE);
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
    const without = describePocketDoor({ ...fields, routes: [...pocket.LEGACY_ALLOWED_ROUTES, 'start'] });
    const withIt = describePocketDoor({ ...fields, routes: [...pocket.LEGACY_ALLOWED_ROUTES, 'start', 'remove'] });
    expect(without.lines.join('\n')).not.toContain(CLAUSE);
    expect(withIt.lines.find((l) => l.startsWith('Lets an allowed phone'))?.endsWith(` and ${CLAUSE}`)).toBe(true);
    expect(withIt.hash).not.toBe(without.hash);
    expect(pocket.pocketDoorHonesty([...pocket.LEGACY_ALLOWED_ROUTES, 'remove'])).toBe(`${pocket.POCKET_DOOR_HONESTY} It can also ${CLAUSE}.`);
    expect(pocket.POCKET_FACE_CLAUSES.remove).toBe('remove ended sessions');
    expect(pocket.POCKET_NEW_ROUTE_WORDS.remove).toEqual({
      title: 'remove sessions from your phone',
      sentence: 'An ended session moves to Past Sessions on this Mac, where you can restore it.'
    });
    for (const said of [CLAUSE, 'remove ended sessions', pocket.POCKET_NEW_ROUTE_WORDS.remove?.title ?? '', pocket.POCKET_NEW_ROUTE_WORDS.remove?.sentence ?? '']) {
      expect(said).not.toMatch(/face id|touch id|passcode/i);
    }
  });
});

describe('the body (D28)', () => {
  const W = wid(7);
  it('reads exactly { session, write }', () => {
    expect(parseRemoveBody(removeBody('s1', W))).toEqual({ ok: true, verb: 'remove', write: W, session: 's1' });
    // Whitespace JSON allows is fine; the phone sorts its keys, a client need not.
    expect(parseRemoveBody(Buffer.from(`{ "write": "${W}", "session": "s1" }`))).toEqual({ ok: true, verb: 'remove', write: W, session: 's1' });
  });

  const malformed: [string, string, string][] = [
    ['not JSON', '{"session":"s1",', ''],
    ['an array', '["s1"]', ''],
    ['a batch', `{"batch":false,"session":"s1","write":"${W}"}`, W],
    ['a missing session', `{"write":"${W}"}`, W],
    ['an extra key', `{"session":"s1","write":"${W}","why":"x"}`, W],
    ['a session id with a slash', `{"session":"../s1","write":"${W}"}`, W],
    ['a session id of 129', `{"session":"${'a'.repeat(129)}","write":"${W}"}`, W],
    ['a write id in capitals', `{"session":"s1","write":"${'AB'.repeat(16)}"}`, ''],
    ['a short write id', `{"session":"s1","write":"abc"}`, ''],
    ['a key given twice', `{"session":"s1","session":"s2","write":"${W}"}`, W],
    ['an escaped value', `{"session":"\\u0073\\u0031","write":"${W}"}`, W]
  ];
  for (const [name, text, echo] of malformed) {
    it(`refuses ${name}, echoing ${echo === '' ? 'no' : 'its'} write id`, () => {
      expect(parseRemoveBody(Buffer.from(text, 'utf8'))).toEqual({ ok: false, write: echo });
    });
  }
});

describe('the answer (D27)', () => {
  it('is exactly the five fields, in order, verb remove', () => {
    expect(removeAnswer(wid(1), 'done', null, null)).toBe(`{"verb":"remove","write":"${wid(1)}","outcome":"done","reason":null,"sentence":null}`);
    expect(JSON.parse(removeAnswer(wid(2), 'refused', 'changed', LIFECYCLE_SESSION_CHANGED))).toEqual({
      verb: 'remove',
      write: wid(2),
      outcome: 'refused',
      reason: 'changed',
      sentence: LIFECYCLE_SESSION_CHANGED
    });
  });
});

describe('the write path (§4.2 step 3)', () => {
  it('acts once with the session id alone, answers in Remove’s shape marked acted, and logs one line with no write id', async () => {
    const r = rig();
    logged.length = 0;
    const answer = await r.handle(REMOVE, removeBody('s1', wid(3)), 'phone-a', OPEN);
    expect(answer).toEqual({
      status: 200,
      body: removeAnswer(wid(3), 'done', null, null),
      acted: true
    });
    expect(r.removes).toEqual([{ sessionId: 's1' }]);
    expect(r.asked).toEqual(['remove']);
    expect(logged).toEqual([{ msg: "the phone's remove: done", fields: { session: 's1' } }]);
    expect(JSON.stringify(logged)).not.toContain(wid(3));
  });

  it('answers the same write id again from the ledger, acting on nothing; a fresh id acts', async () => {
    const r = rig();
    const first = await r.handle(REMOVE, removeBody('s1', wid(4)), 'phone-a', OPEN);
    const again = await r.handle(REMOVE, removeBody('s1', wid(4)), 'phone-a', OPEN);
    expect(again).toEqual(first);
    expect(r.removes).toHaveLength(1);
    await r.handle(REMOVE, removeBody('s1', wid(5)), 'phone-a', OPEN);
    expect(r.removes).toHaveLength(2);
  });

  it('refuses a malformed body in Remove’s own shape, and acts on nothing', async () => {
    const r = rig();
    const answer = await r.handle(REMOVE, Buffer.from(`{"batch":true,"session":"s1","write":"${wid(6)}"}`), 'phone-a', OPEN);
    expect(answer.status).toBe(200);
    expect(answerOf(answer.body)).toEqual({
      verb: 'remove',
      write: wid(6),
      outcome: 'refused',
      reason: 'malformed',
      sentence: pocket.POCKET_WRITE_SENTENCES.unreadable
    });
    expect(r.removes).toEqual([]);
  });

  it('never overlaps an End on one session: each is busy in its own shape while the other is in flight', async () => {
    const r = rig();
    const hold = deferred<{ outcome: 'done' }>();
    r.endWith = () => hold.promise;
    const ending = r.handle(END, endBody('s1', wid(7)), 'phone-a', OPEN);
    const busy = await r.handle(REMOVE, removeBody('s1', wid(8)), 'phone-b', OPEN);
    expect(answerOf(busy.body)).toEqual({ verb: 'remove', write: wid(8), outcome: 'busy', reason: null, sentence: pocket.POCKET_WRITE_SENTENCES.busy });
    expect(r.removes).toEqual([]);
    hold.resolve({ outcome: 'done' });
    await ending;
    // And the other way round.
    const holdRemove = deferred<PocketRemoveOutcome>();
    r.removeWith = () => holdRemove.promise;
    const removing = r.handle(REMOVE, removeBody('s2', wid(9)), 'phone-a', OPEN);
    const endBusy = await r.handle(END, endBody('s2', wid(10)), 'phone-b', OPEN);
    expect(answerOf(endBusy.body)).toMatchObject({ verb: 'end', outcome: 'busy' });
    holdRemove.resolve({ outcome: 'done' });
    expect((await removing).acted).toBe(true);
  });

  it('a route nobody allowed is the door’s 404 at the last check, before anything acts', async () => {
    const r = rig();
    r.served.delete('remove');
    expect(await r.handle(REMOVE, removeBody('s1', wid(11)), 'phone-a', OPEN)).toEqual({ status: 404, body: null });
    expect(r.removes).toEqual([]);
    // Nothing kept: the same write id acts once it is served.
    r.served.add('remove');
    expect((await r.handle(REMOVE, removeBody('s1', wid(11)), 'phone-a', OPEN)).acted).toBe(true);
    expect(r.removes).toHaveLength(1);
  });

  it('answers what the verb answered, in its words, and a rejection or a throw as failed with REMOVE_FAILED', async () => {
    const r = rig();
    r.removeWith = async () => ({ outcome: 'refused', reason: 'changed', sentence: LIFECYCLE_SESSION_CHANGED });
    expect(answerOf((await r.handle(REMOVE, removeBody('s1', wid(12)), 'phone-a', OPEN)).body)).toMatchObject({
      outcome: 'refused',
      reason: 'changed',
      sentence: LIFECYCLE_SESSION_CHANGED
    });
    r.removeWith = () => Promise.reject(new Error('CANARY'));
    const rejected = await r.handle(REMOVE, removeBody('s1', wid(13)), 'phone-a', OPEN);
    expect(answerOf(rejected.body)).toEqual({ verb: 'remove', write: wid(13), outcome: 'failed', reason: null, sentence: REMOVE_FAILED });
    expect(rejected.acted).toBe(true);
    r.removeWith = () => {
      throw new Error('CANARY');
    };
    expect(answerOf((await r.handle(REMOVE, removeBody('s1', wid(14)), 'phone-a', OPEN)).body)).toMatchObject({
      outcome: 'failed',
      sentence: REMOVE_FAILED
    });
    expect(JSON.stringify(logged)).not.toContain('CANARY');
  });
});

describe('the offer on /v1/session (D49)', () => {
  const ended: Session = {
    id: 's1',
    name: 'nightly',
    tmuxName: 'nightly',
    projectPath: '/w',
    cwd: '/w',
    agent: 'shell',
    status: 'exited',
    createdAt: 1
  } as Session;

  function factsWith(removeConfirmOf?: PocketFacts['removeConfirmOf']): PocketFacts {
    return {
      sessions: () => [ended],
      projects: () => [],
      blockedSince: () => new Map(),
      wakes: () => [],
      activity: () => undefined,
      statusWord: () => ({ dot: 'ended', label: 'ended' }),
      agentLabel: (id) => id,
      machineLabel: () => null,
      emptyLine: 'Nothing needs you',
      catchUp: async () => null,
      lastTurn: async () => ({ answerText: null, turnCount: 0 }),
      turns: async () => ({ turns: [], more: false }),
      handoff: () => null,
      ...(removeConfirmOf === undefined ? {} : { removeConfirmOf }),
      now: () => 5
    };
  }

  const WORDS = { title: "Remove 'nightly'?", body: 'It moves to Past Sessions and you can restore it from there.', confirmLabel: 'Remove' };

  it('carries the words, field by field and nothing else, only when removeConfirmOf answers them', async () => {
    const asked: string[] = [];
    const got = await createPocketRoutes(
      factsWith((session) => {
        asked.push(session.id);
        return { ...WORDS, extra: 'never leaves' } as unknown as typeof WORDS;
      })
    ).session('s1');
    expect(got?.session.removeConfirm).toEqual(WORDS);
    expect(Object.keys(got?.session.removeConfirm ?? {})).toEqual(['title', 'body', 'confirmLabel']);
    expect(asked).toEqual(['s1']);
  });

  it('carries no key when the facts have no member, answer null, throw, or answer anything but three strings', async () => {
    const absent = [
      factsWith(),
      factsWith(() => null),
      factsWith(() => {
        throw new Error('no core');
      }),
      factsWith(() => ({ ...WORDS, title: 7 }) as unknown as typeof WORDS),
      factsWith(() => 'Remove' as unknown as typeof WORDS)
    ];
    for (const facts of absent) {
      const got = await createPocketRoutes(facts).session('s1');
      expect(got).not.toBeNull();
      expect('removeConfirm' in (got?.session ?? {})).toBe(false);
    }
  });
});
