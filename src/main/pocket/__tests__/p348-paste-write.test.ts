/**
 * THE PHONE'S PASTE THROUGH THE DOOR (Phase 348, build/p348/SPEC.md §4.6
 * steps 8, 9, 14 and 16, D26 to D30, D32, D43), driven against the SHIPPING
 * door table, caps, wire validator, route ledger, contract words, write path
 * (src/main/pocket/writes.ts) and screen and page copiers
 * (src/main/pocket/routes.ts).
 *
 *  - THE ROUTE: one signed POST after `remove`, everywhere; not one of the
 *    eleven, so it waits for its own Allow; its cap 131,072, which holds the
 *    worst legal body (16,384 C0 bytes each escaped `\u00XX`, 98,566 bytes,
 *    composed here) and lets the door drop 131,073 whole; its words, "on this
 *    Mac" (D32, corrected by D22).
 *  - THE BODY: `{ dialog, session, text, turn, write }` exactly; the text any
 *    string, taken as it is; the turn a question id's shape; the dialog null
 *    or a mark's.
 *  - THE PATH: the act handed the four fields and a `still` that asks the four
 *    things the last check asks, the paste route among them; its own answer
 *    shape for busy, malformed and recorded; keys and a paste never overlap
 *    on one session.
 *  - THE SCREEN ANSWER: `paste` leaves, as `true`, only when the composer set
 *    it AND the route is served; `wraps` on the screen and on a page only
 *    after their own check, a list of the wrong shape costing the marks and
 *    nothing else.
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

const { createPocketWriteHandler, parsePasteBody, pasteAnswer } = await import('../writes');
const { POCKET_ROUTES } = await import('../door/table');
const { POCKET_WRITE_BODY_CAPS } = await import('../door/limits');
const { doorRequestOf } = await import('../door/wire');
const { POCKET_ROUTE_LEDGER } = await import('../route-ledger');
const { WRITE_CLAUSES } = await import('../pairing');
const { createPocketRoutes, screenOf, scrollbackOf } = await import('../routes');
const pocket = await import('@shared/ipc/pocket');
const { PASTE_FAILED, PASTE_THIS_MAC_ONLY } = await import('@shared/screen-copy');
type PocketRoute = import('../door/table').PocketRoute;
type PocketWrites = import('../routes').PocketWrites;
type PocketFacts = import('../routes').PocketFacts;
type PocketPasteInput = import('../routes').PocketPasteInput;
type PocketPasteOutcome = import('../routes').PocketPasteOutcome;
type PocketStillAllowed = import('../routes').PocketStillAllowed;
type DoorAdmission = import('../bind').DoorAdmission;
type Screen = import('@shared/ipc/pocket').PocketScreen;
type ScreenAnswer = import('@shared/ipc/pocket').PocketScreenAnswer;
type Page = import('@shared/ipc/pocket').PocketScrollbackAnswer;
type Session = import('@shared/types').Session;

const PASTE = POCKET_ROUTES.find((r) => r.id === 'paste') as PocketRoute;
const KEYS = POCKET_ROUTES.find((r) => r.id === 'keys') as PocketRoute;
const OPEN: DoorAdmission = { stopping: () => false };
const CLAUSE = 'paste text into a session on this Mac';
const QID = '0123456789abcdef-42';
const MARK = 'a1b2c3d4e5f6';

const wid = (n: number): string => n.toString(16).padStart(32, '0');
const ch = (cp: number): string => String.fromCodePoint(cp);

/** JSON with sorted keys, as the phone writes it. */
function sortedJson(fields: Record<string, unknown>): string {
  return JSON.stringify(Object.fromEntries(Object.keys(fields).sort().map((k) => [k, fields[k]])));
}

function pasteBody(session: string, write: string, over: Record<string, unknown> = {}): Buffer {
  return Buffer.from(sortedJson({ dialog: null, session, text: 'echo hi', turn: QID, write, ...over }), 'utf8');
}

function keysBody(session: string, write: string): Buffer {
  return Buffer.from(sortedJson({ dialog: null, keys: [{ t: 'a' }], session, turn: QID, write }), 'utf8');
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

interface Rig {
  handle: ReturnType<typeof createPocketWriteHandler>;
  pastes: { input: PocketPasteInput; still: PocketStillAllowed }[];
  keyed: unknown[];
  served: Set<string>;
  paired: boolean;
  quitting: boolean;
  pasteWith: (still: PocketStillAllowed) => Promise<PocketPasteOutcome>;
  keysWith: () => Promise<{ outcome: 'done' }>;
}

function rig(): Rig {
  const self: Rig = {
    handle: undefined as unknown as Rig['handle'],
    pastes: [],
    keyed: [],
    served: new Set(pocket.POCKET_WRITE_ROUTE_IDS),
    paired: true,
    quitting: false,
    pasteWith: async () => ({ outcome: 'done' }),
    keysWith: async () => ({ outcome: 'done' })
  };
  const writes: PocketWrites = {
    end: async () => ({ outcome: 'done' }),
    choose: async () => ({ outcome: 'done' }),
    say: async () => ({ outcome: 'done' }),
    keys: (input) => {
      self.keyed.push(input);
      return self.keysWith();
    },
    start: async () => ({ outcome: 'failed', sentence: 'not in this test' }),
    remove: async () => ({ outcome: 'failed', sentence: 'not in this test' }),
    paste: (input, still) => {
      self.pastes.push({ input, still });
      return self.pasteWith(still);
    }
  };
  self.handle = createPocketWriteHandler({
    shuttingDown: () => self.quitting,
    stillPaired: () => self.paired,
    routeServed: (id) => self.served.has(id),
    writes,
    now: () => 2_000_000
  });
  return self;
}

const answerOf = (body: string | null): Record<string, unknown> => JSON.parse(body ?? 'null') as Record<string, unknown>;

// ---------------------------------------------------------------------------

describe('the route and its words (D26, D29, D32)', () => {
  it('is one signed POST after remove, everywhere it is listed, and waits for its own Allow', () => {
    expect(POCKET_ROUTES.filter((r) => r.id === 'paste')).toEqual([
      { id: 'paste', method: 'POST', path: '/v1/paste', reads: false, windowOnly: false, signed: true }
    ]);
    expect(POCKET_ROUTES.at(-1)?.id).toBe('paste');
    expect(pocket.POCKET_ROUTE_IDS.at(-1)).toBe('paste');
    expect(pocket.POCKET_WRITE_ROUTE_IDS.at(-1)).toBe('paste');
    expect((pocket.LEGACY_ALLOWED_ROUTES as readonly string[]).includes('paste')).toBe(false);
    expect((pocket.POCKET_SESSION_WRITE_IDS as readonly string[]).includes('paste')).toBe(false);
    const row = POCKET_ROUTE_LEDGER.at(-1);
    expect(row).toEqual({ id: 'paste', method: 'POST', path: '/v1/paste', reads: false, signed: true, windowOnly: false, bodyCap: 131072, clause: CLAUSE });
    expect(WRITE_CLAUSES.paste).toBe(CLAUSE);
    expect(pocket.POCKET_FACE_CLAUSES.paste).toBe('paste into a session');
    expect(pocket.POCKET_NEW_ROUTE_WORDS.paste).toEqual({
      title: 'paste into sessions from your phone',
      sentence: 'It lands as a paste at this Mac does, with no Return added.'
    });
  });

  it('the honesty sentence over every route says the three added clauses in the table’s order', () => {
    expect(pocket.pocketDoorHonesty(pocket.POCKET_ROUTE_IDS)).toBe(
      `${pocket.POCKET_DOOR_HONESTY} It can also start a session in a project open in Tortie, on this Mac or another machine, remove a session that has ended and paste text into a session on this Mac.`
    );
  });

  it('holds the worst legal body, 98,566 bytes, under its cap of 131,072, and it parses to the very text', () => {
    expect(POCKET_WRITE_BODY_CAPS.paste).toBe(131_072);
    expect(pocket.POCKET_PASTE_MAX_TEXT_BYTES).toBe(16_384);
    // 16,384 bytes of C0 controls, each escaped six bytes; the other keys at their longest.
    const text = ch(0x01).repeat(16_384);
    const worst = { dialog: MARK, session: 'aZ09._:-'.repeat(16), text, turn: `${'e'.repeat(16)}-${String(Number.MAX_SAFE_INTEGER)}`, write: 'f'.repeat(32) };
    const bytes = Buffer.from(sortedJson(worst), 'utf8');
    expect(bytes.byteLength).toBe(98_566);
    expect(bytes.byteLength).toBeLessThanOrEqual(POCKET_WRITE_BODY_CAPS.paste);
    const parsed = parsePasteBody(bytes);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.text).toBe(text);
    // The door process lets 131,072 through and drops 131,073 whole.
    const request = (n: number): Record<string, unknown> => ({
      route: 'paste',
      method: 'POST',
      target: '/v1/paste',
      headers: { 'x-tortie-phone': 'p', 'x-tortie-timestamp': '1', 'x-tortie-nonce': 'n'.repeat(16), 'x-tortie-signature': 's' },
      body: new Uint8Array(n),
      channel: 'p'
    });
    expect(doorRequestOf(request(131_072))).toMatchObject({ route: 'paste', target: '/v1/paste' });
    expect(doorRequestOf(request(131_073))).toBeNull();
  });
});

describe('the body (D28, §4.6 step 8)', () => {
  const W = wid(9);
  it('reads the five fields, the text exactly as it came, an empty one and a CR included', () => {
    expect(parsePasteBody(pasteBody('s1', W))).toEqual({ ok: true, verb: 'paste', write: W, session: 's1', text: 'echo hi', turn: QID, dialog: null });
    expect(parsePasteBody(pasteBody('s1', W, { dialog: MARK }))).toMatchObject({ ok: true, dialog: MARK });
    for (const text of ['', `  spaced\t${ch(0x0d)}${ch(0x0a)}  `, `a${ch(0x1b)}[201~b`, 'é😀中']) {
      const got = parsePasteBody(pasteBody('s1', W, { text }));
      expect(got, JSON.stringify(text)).toMatchObject({ ok: true, text });
    }
  });

  const malformed: [string, Record<string, unknown> | string, string][] = [
    ['an extra key', { extra: 1 }, W],
    ['a missing dialog', '', W],
    ['a turn that is not a question id', { turn: 'nope' }, W],
    ['a turn with a leading zero', { turn: '0123456789abcdef-07' }, W],
    ['a dialog of 11 hex', { dialog: MARK.slice(1) }, W],
    ['a dialog in capitals', { dialog: MARK.toUpperCase() }, W],
    ['a text that is a number', { text: 7 }, W],
    ['a text that is an array', { text: ['a'] }, W],
    ['a session id with a space', { session: 's 1' }, W],
    ['a write id that is not one', { write: 'nope' }, '']
  ];
  for (const [name, over, echo] of malformed) {
    it(`refuses ${name}`, () => {
      const body =
        typeof over === 'string'
          ? Buffer.from(JSON.stringify({ session: 's1', text: 'x', turn: QID, write: W }), 'utf8')
          : pasteBody('s1', W, over);
      expect(parsePasteBody(body)).toEqual({ ok: false, write: echo });
    });
  }
});

describe('the answer (D27)', () => {
  it('is exactly the five fields, in order, verb paste', () => {
    expect(pasteAnswer(wid(1), 'done', null, null)).toBe(`{"verb":"paste","write":"${wid(1)}","outcome":"done","reason":null,"sentence":null}`);
    expect(JSON.parse(pasteAnswer(wid(2), 'refused', 'machine', PASTE_THIS_MAC_ONLY))).toEqual({
      verb: 'paste',
      write: wid(2),
      outcome: 'refused',
      reason: 'machine',
      sentence: PASTE_THIS_MAC_ONLY
    });
  });
});

describe('the write path (§4.6 step 8)', () => {
  it('hands the act the four fields and a still that asks the four things the last check asks', async () => {
    const r = rig();
    logged.length = 0;
    const text = `a${ch(0x0a)}b`;
    const answer = await r.handle(PASTE, pasteBody('s1', wid(3), { text, dialog: MARK }), 'phone-a', OPEN);
    expect(answer).toEqual({ status: 200, body: pasteAnswer(wid(3), 'done', null, null), acted: true });
    expect(r.pastes.map((p) => p.input)).toEqual([{ sessionId: 's1', text, turn: QID, dialog: MARK }]);
    const still = r.pastes[0]?.still ?? ((): boolean => false);
    expect(still()).toBe(true);
    r.served.delete('paste');
    expect(still()).toBe(false);
    r.served.add('paste');
    r.paired = false;
    expect(still()).toBe(false);
    r.paired = true;
    r.quitting = true;
    expect(still()).toBe(false);
    expect(logged).toEqual([{ msg: "the phone's paste: done", fields: { session: 's1' } }]);
    expect(JSON.stringify(logged)).not.toMatch(/echo|a\\nb/);
  });

  it('answers the same write id again from the ledger, typing nothing twice', async () => {
    const r = rig();
    const first = await r.handle(PASTE, pasteBody('s1', wid(4)), 'phone-a', OPEN);
    expect(await r.handle(PASTE, pasteBody('s1', wid(4)), 'phone-a', OPEN)).toEqual(first);
    expect(r.pastes).toHaveLength(1);
  });

  it('refuses a malformed body in the paste’s own shape', async () => {
    const r = rig();
    const answer = await r.handle(PASTE, pasteBody('s1', wid(5), { extra: true }), 'phone-a', OPEN);
    expect(answerOf(answer.body)).toEqual({
      verb: 'paste',
      write: wid(5),
      outcome: 'refused',
      reason: 'malformed',
      sentence: pocket.POCKET_WRITE_SENTENCES.unreadable
    });
    expect(r.pastes).toEqual([]);
  });

  it('never overlaps keys on one session: the paste is busy in its own shape while keys are in flight', async () => {
    const r = rig();
    const hold = deferred<{ outcome: 'done' }>();
    r.keysWith = () => hold.promise;
    const typing = r.handle(KEYS, keysBody('s1', wid(6)), 'phone-a', OPEN);
    const busy = await r.handle(PASTE, pasteBody('s1', wid(7)), 'phone-b', OPEN);
    expect(answerOf(busy.body)).toEqual({ verb: 'paste', write: wid(7), outcome: 'busy', reason: null, sentence: pocket.POCKET_WRITE_SENTENCES.busy });
    hold.resolve({ outcome: 'done' });
    await typing;
    expect(r.pastes).toEqual([]);
  });

  it('a route nobody allowed is the door’s 404 at the last check, and nothing is pasted', async () => {
    const r = rig();
    r.served.delete('paste');
    expect(await r.handle(PASTE, pasteBody('s1', wid(8)), 'phone-a', OPEN)).toEqual({ status: 404, body: null });
    expect(r.pastes).toEqual([]);
  });

  it('answers the verb’s refusals in its words, and a rejection as failed with PASTE_FAILED', async () => {
    const r = rig();
    r.pasteWith = async () => ({ outcome: 'refused', reason: 'machine', sentence: PASTE_THIS_MAC_ONLY });
    expect(answerOf((await r.handle(PASTE, pasteBody('s1', wid(9)), 'phone-a', OPEN)).body)).toMatchObject({
      outcome: 'refused',
      reason: 'machine',
      sentence: PASTE_THIS_MAC_ONLY
    });
    r.pasteWith = () => Promise.reject(new Error('CANARY'));
    expect(answerOf((await r.handle(PASTE, pasteBody('s1', wid(10)), 'phone-a', OPEN)).body)).toEqual({
      verb: 'paste',
      write: wid(10),
      outcome: 'failed',
      reason: null,
      sentence: PASTE_FAILED
    });
  });
});

// ---------------------------------------------------------------------------
// The screen answer's flag and marks, and the page's marks
// ---------------------------------------------------------------------------

const REV = '0123456789ab';

function screenOfSize(rows = 3, over: Partial<Screen> = {}): Screen {
  return {
    cols: 4,
    rows,
    cursor: { x: 0, y: 0, visible: true },
    alternate: false,
    ground: '#131417',
    ink: '#d8dbe2',
    caret: '#e8eaed',
    styles: [{ fg: '#d8dbe2', bg: null, bold: false, dim: false, italic: false, underline: false, strike: false }],
    lines: Array.from({ length: rows }, () => [{ text: 'abcd', style: 0, cells: 4 }]),
    turn: QID,
    asking: false,
    dialog: null,
    typable: true,
    depth: null,
    space: null,
    ...over
  };
}

const answer = (screen: Screen): ScreenAnswer => ({ sessionId: 'a', revision: REV, at: 1, unchanged: false, screen, why: null, sentence: null });

describe('the screen answer’s paste flag (D30) and marks (D43)', () => {
  it('copies paste as true only when the composer set it and the route is served', () => {
    expect(screenOf(answer(screenOfSize(3, { paste: true })), 'a', 1, true)?.screen?.paste).toBe(true);
    for (const [screen, served] of [
      [screenOfSize(3, { paste: true }), false],
      [screenOfSize(3), true],
      [screenOfSize(3, { paste: 'yes' as unknown as boolean }), true]
    ] as const) {
      const got = screenOf(answer(screen), 'a', 1, served);
      expect(got?.screen).not.toBeNull();
      expect('paste' in (got?.screen ?? {})).toBe(false);
    }
    // Absent the caller's word, it never leaves.
    expect('paste' in (screenOf(answer(screenOfSize(3, { paste: true })), 'a', 1)?.screen ?? {})).toBe(false);
  });

  it('copies a good marks list as a fresh array, and leaves the key off for any other', () => {
    const good = [0, 1];
    const got = screenOf(answer(screenOfSize(3, { wraps: good })), 'a', 1);
    expect(got?.screen?.wraps).toEqual([0, 1]);
    expect(got?.screen?.wraps).not.toBe(good);
    const bad: unknown[] = [[], [1, 0], [0, 0], [2], [-1], [0.5], ['0'], [0, 3], 'x', null];
    for (const wraps of bad) {
      const out = screenOf(answer(screenOfSize(3, { wraps: wraps as number[] })), 'a', 1);
      expect(out?.screen, JSON.stringify(wraps)).not.toBeNull();
      expect('wraps' in (out?.screen ?? {}), JSON.stringify(wraps)).toBe(false);
    }
  });

  it('the screen route reads pasteAllowed as the answer leaves', async () => {
    const session: Session = { id: 'a', name: 'a', tmuxName: 'a', projectPath: '/w', cwd: '/w', agent: 'shell', status: 'running', createdAt: 1 } as Session;
    let allowed = false;
    const facts: PocketFacts = {
      sessions: () => [session],
      projects: () => [],
      blockedSince: () => new Map(),
      wakes: () => [],
      activity: () => undefined,
      statusWord: () => ({ dot: 'working', label: 'working' }),
      agentLabel: (id) => id,
      machineLabel: () => null,
      emptyLine: 'Nothing needs you',
      catchUp: async () => null,
      lastTurn: async () => ({ answerText: null, turnCount: 0 }),
      turns: async () => ({ turns: [], more: false }),
      handoff: () => null,
      screen: async () => answer(screenOfSize(3, { paste: true })),
      pasteAllowed: () => allowed
    };
    const routes = createPocketRoutes(facts);
    expect('paste' in ((await routes.screen(new URLSearchParams('id=a'), () => false))?.screen ?? {})).toBe(false);
    allowed = true;
    expect((await routes.screen(new URLSearchParams('id=a'), () => false))?.screen?.paste).toBe(true);
    const without = createPocketRoutes({ ...facts, pasteAllowed: undefined });
    expect('paste' in ((await without.screen(new URLSearchParams('id=a'), () => false))?.screen ?? {})).toBe(false);
  });
});

describe('a page’s marks (D43)', () => {
  function page(over: Partial<Page> = {}): Page {
    return {
      sessionId: 'a',
      at: 1,
      from: 10,
      depth: 100,
      wrap: 4,
      space: 'feedc0ffee01',
      styles: [{ fg: '#d8dbe2', bg: null, bold: false, dim: false, italic: false, underline: false, strike: false }],
      rows: [[{ text: 'abcd', style: 0, cells: 4 }], [{ text: 'ef', style: 0, cells: 2 }], []],
      why: null,
      sentence: null,
      ...over
    };
  }

  it('copies indices into the page’s rows, never its last row, and leaves the key off for anything else', () => {
    expect(scrollbackOf(page({ wraps: [0] }), 'a', 1)?.wraps).toEqual([0]);
    expect(scrollbackOf(page({ wraps: [0, 1] }), 'a', 1)?.wraps).toEqual([0, 1]);
    for (const wraps of [[2], [1, 0], [0, 0], [], [-1]]) {
      const got = scrollbackOf(page({ wraps }), 'a', 1);
      expect(got, JSON.stringify(wraps)).not.toBeNull();
      expect('wraps' in (got ?? {}), JSON.stringify(wraps)).toBe(false);
    }
  });

  it('refuses an absence that carries marks beside its word: it would say two things', () => {
    const absent: Page = { ...page(), from: null, depth: null, wrap: null, space: null, styles: [], rows: [], why: 'busy', sentence: null };
    expect(scrollbackOf(absent, 'a', 1)?.why).toBe('busy');
    expect(scrollbackOf({ ...absent, wraps: [0] }, 'a', 1)).toBeNull();
  });
});
