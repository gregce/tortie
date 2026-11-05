/**
 * THE PAGE KEYS AND THE PAGE OFFER THROUGH THE DOOR (Phase 350,
 * build/p350/SPEC.md §4.3, D5, D6, D24), driven against the SHIPPING write
 * path (src/main/pocket/writes.ts), door table, caps and route ledger, the
 * door's screen copier (src/main/pocket/routes.ts) and the composer
 * (src/main/screen/compose.ts).
 *
 *  - THE NAMES (D24): `PPage` and `NPage` are the contract's last two of 37;
 *    the strict parse takes each ALONE and the write path forwards it to
 *    `keys` exactly as sent, once; beside any other item, cased or spaced any
 *    other way, modified, or spelled as another program spells the key, the
 *    body is malformed and nothing acts.
 *  - THE ROUTE (D5): a page rides the allowed `keys` row unchanged: its
 *    method, path, signing, window, cap and clause are what they were, it is
 *    one of the eleven legacy routes, and no route, ledger row or clause was
 *    added.
 *  - THE OFFER (D6): `pages` leaves the door as the literal `true` only where
 *    the composer set it, with no served gate (the paste's own gate unmoved),
 *    and a value of any other shape leaves as no key at all; composed and
 *    copied end to end, a full screen that takes keys offers it and an inline
 *    one does not.
 *  - THE OFFER AT THE CAP (the fix round): the offer's own 13 bytes never make
 *    `large` a picture the build before this phase served: a picture or an
 *    answer over the 1 MiB cap by no more than the offer is served without
 *    it, one byte more is `large` as before, and one at the cap keeps it.
 */

import { describe, expect, it, vi } from 'vitest';

vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  const quiet = (): void => undefined;
  return { ...real, getLog: () => ({ error: quiet, warn: quiet, info: quiet, debug: quiet }) };
});

const { createPocketWriteHandler, parseKeysBody } = await import('../writes');
const { POCKET_ROUTES } = await import('../door/table');
const { POCKET_WRITE_BODY_CAPS } = await import('../door/limits');
const { POCKET_ROUTE_LEDGER } = await import('../route-ledger');
const { WRITE_CLAUSES } = await import('../pairing');
const { screenOf } = await import('../routes');
const { composeScreen } = await import('../../screen/compose');
const pocket = await import('@shared/ipc/pocket');
type PocketRoute = import('../door/table').PocketRoute;
type PocketWrites = import('../routes').PocketWrites;
type PocketKeysInput = import('../routes').PocketKeysInput;
type DoorAdmission = import('../bind').DoorAdmission;
type Screen = import('@shared/ipc/pocket').PocketScreen;
type ScreenAnswer = import('@shared/ipc/pocket').PocketScreenAnswer;
type ScreenReading = import('../../screen/read').ScreenReading;

const KEYS = POCKET_ROUTES.find((r) => r.id === 'keys') as PocketRoute;
const OPEN: DoorAdmission = { stopping: () => false };
const QID = '0123456789abcdef-42';
const PAGES = ['PPage', 'NPage'] as const;

const wid = (n: number): string => n.toString(16).padStart(32, '0');

/** JSON with sorted keys, as the phone writes it. */
function sortedJson(fields: Record<string, unknown>): string {
  return JSON.stringify(Object.fromEntries(Object.keys(fields).sort().map((k) => [k, fields[k]])));
}

function keysBody(write: string, keys: unknown): Buffer {
  return Buffer.from(sortedJson({ dialog: null, keys, session: 's1', turn: QID, write }), 'utf8');
}

const answerOf = (body: string | null): Record<string, unknown> => JSON.parse(body ?? 'null') as Record<string, unknown>;

/** The write path over a recording `keys`, every other verb unreachable here. */
function rig(): { handle: ReturnType<typeof createPocketWriteHandler>; keyed: PocketKeysInput[] } {
  const keyed: PocketKeysInput[] = [];
  const writes: PocketWrites = {
    end: async () => ({ outcome: 'done' }),
    choose: async () => ({ outcome: 'done' }),
    say: async () => ({ outcome: 'done' }),
    keys: async (input) => {
      keyed.push(input);
      return { outcome: 'done' };
    },
    start: async () => ({ outcome: 'failed', sentence: 'not in this test' }),
    remove: async () => ({ outcome: 'failed', sentence: 'not in this test' }),
    paste: async () => ({ outcome: 'failed', sentence: 'not in this test' }),
    rename: async () => ({ outcome: 'failed', sentence: 'not in this test' })
  };
  const handle = createPocketWriteHandler({
    shuttingDown: () => false,
    stillPaired: () => true,
    routeServed: () => true,
    writes,
    now: () => 2_000_000
  });
  return { handle, keyed };
}

// ---------------------------------------------------------------------------
// THE NAMES
// ---------------------------------------------------------------------------

describe('the two page keys, by name (D24)', () => {
  it('are the contract’s last two of 37, after Phase 337’s 35 in their own order', () => {
    expect(pocket.POCKET_SCREEN_KEY_NAMES).toHaveLength(37);
    expect(pocket.POCKET_SCREEN_KEY_NAMES.slice(0, 9)).toEqual(['Escape', 'Tab', 'BTab', 'Enter', 'BSpace', 'Up', 'Down', 'Left', 'Right']);
    expect(pocket.POCKET_SCREEN_KEY_NAMES.slice(9, 35)).toEqual('abcdefghijklmnopqrstuvwxyz'.split('').map((l) => `C-${l}`));
    expect(pocket.POCKET_SCREEN_KEY_NAMES.slice(35)).toEqual(['PPage', 'NPage']);
  });

  for (const page of PAGES) {
    it(`the strict parse takes a lone ${page}, exactly as sent`, () => {
      expect(parseKeysBody(keysBody(wid(1), [{ k: page }]))).toEqual({
        ok: true,
        verb: 'keys',
        write: wid(1),
        session: 's1',
        keys: [{ k: page }],
        turn: QID,
        dialog: null
      });
    });
  }

  const notAlone: [string, unknown[]][] = [
    ['PPage then text', [{ k: 'PPage' }, { t: 'x' }]],
    ['text then NPage', [{ t: 'x' }, { k: 'NPage' }]],
    ['BSpace then PPage', [{ k: 'BSpace' }, { k: 'PPage' }]],
    ['NPage then BSpace', [{ k: 'NPage' }, { k: 'BSpace' }]],
    ['PPage twice', [{ k: 'PPage' }, { k: 'PPage' }]],
    ['PPage then NPage', [{ k: 'PPage' }, { k: 'NPage' }]],
    ['Escape then PPage', [{ k: 'Escape' }, { k: 'PPage' }]],
    ['sixty-four NPage', Array.from({ length: 64 }, () => ({ k: 'NPage' }))]
  ];
  for (const [name, keys] of notAlone) {
    it(`refuses a page that is not its write’s one item: ${name}`, () => {
      expect(parseKeysBody(keysBody(wid(2), keys))).toEqual({ ok: false, write: wid(2) });
    });
  }

  const misspelt = ['ppage', 'npage', 'PPAGE', 'NPAGE', 'nPage', 'PageUp', 'PageDown', 'PgUp', 'PgDn', 'Page_Up', ' PPage', 'PPage ', 'NPage\n', 'S-PPage', 'C-NPage', 'M-PPage', 'PPage;', 'PPage NPage', 'Home', 'End', 'F1'];
  for (const name of misspelt) {
    it(`refuses the name ${JSON.stringify(name)}: one of the 37 by identity, or nothing`, () => {
      expect(parseKeysBody(keysBody(wid(3), [{ k: name }]))).toEqual({ ok: false, write: wid(3) });
    });
  }

  it('through the write path: a lone page reaches keys once with exactly its item; a page not alone reaches nothing', async () => {
    const r = rig();
    for (const [n, page] of PAGES.entries()) {
      const answer = await r.handle(KEYS, keysBody(wid(0x350 + n), [{ k: page }]), 'phone-a', OPEN);
      expect(answerOf(answer.body)).toMatchObject({ verb: 'keys', write: wid(0x350 + n), outcome: 'done' });
      expect(answer.acted).toBe(true);
    }
    expect(r.keyed).toEqual([
      { sessionId: 's1', keys: [{ k: 'PPage' }], turn: QID, dialog: null },
      { sessionId: 's1', keys: [{ k: 'NPage' }], turn: QID, dialog: null }
    ]);
    const refused = await r.handle(KEYS, keysBody(wid(0x360), [{ k: 'PPage' }, { t: 'x' }]), 'phone-a', OPEN);
    expect(answerOf(refused.body)).toMatchObject({ outcome: 'refused', reason: 'malformed', sentence: pocket.POCKET_WRITE_SENTENCES.unreadable });
    expect(r.keyed).toHaveLength(2);
    // The same page's write id again: the recorded answer, typed once.
    const again = await r.handle(KEYS, keysBody(wid(0x350), [{ k: 'PPage' }]), 'phone-a', OPEN);
    expect(answerOf(again.body)).toMatchObject({ verb: 'keys', write: wid(0x350), outcome: 'done' });
    expect(r.keyed).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// THE ROUTE
// ---------------------------------------------------------------------------

describe('a page rides the allowed keys route, unchanged (D5)', () => {
  it('the keys row, its cap, its clause and its ledger row are what Phase 337 allowed', () => {
    expect(KEYS).toEqual({ id: 'keys', method: 'POST', path: '/v1/keys', reads: false, windowOnly: false, signed: true });
    expect(POCKET_WRITE_BODY_CAPS.keys).toBe(16_384);
    expect(WRITE_CLAUSES.keys).toBe('type into any session as you would at this Mac');
    expect(POCKET_ROUTE_LEDGER.find((row) => row.id === 'keys')).toEqual({
      id: 'keys',
      method: 'POST',
      path: '/v1/keys',
      reads: false,
      signed: true,
      windowOnly: false,
      bodyCap: 16384,
      clause: 'type into any session as you would at this Mac'
    });
    expect(pocket.LEGACY_ALLOWED_ROUTES).toContain('keys');
  });

  it('no route, ledger row or clause is added: the table, the ids and the ledger name the same fifteen', () => {
    const table = POCKET_ROUTES.map((r) => r.id).sort();
    expect(table).toEqual([...pocket.POCKET_ROUTE_IDS].sort());
    expect(POCKET_ROUTE_LEDGER.map((r) => r.id).sort()).toEqual(table);
    expect(table).toEqual(['blocked', 'choose', 'end', 'keys', 'pair', 'paste', 'remove', 'rename', 'say', 'screen', 'scrollback', 'session', 'sessions', 'start', 'turns']);
  });
});

// ---------------------------------------------------------------------------
// THE OFFER
// ---------------------------------------------------------------------------

const REV = '0123456789ab';

function screenOfSize(over: Partial<Screen> = {}): Screen {
  return {
    cols: 4,
    rows: 3,
    cursor: { x: 0, y: 0, visible: true },
    alternate: true,
    ground: '#131417',
    ink: '#d8dbe2',
    caret: '#e8eaed',
    styles: [{ fg: '#d8dbe2', bg: null, bold: false, dim: false, italic: false, underline: false, strike: false }],
    lines: Array.from({ length: 3 }, () => [{ text: 'abcd', style: 0, cells: 4 }]),
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

describe('the page offer, copied by the door (D6)', () => {
  it('copies pages as the literal true where the composer set it, whether or not paste is served', () => {
    for (const served of [true, false, undefined]) {
      const got = served === undefined ? screenOf(answer(screenOfSize({ pages: true })), 'a', 1) : screenOf(answer(screenOfSize({ pages: true })), 'a', 1, served);
      expect(got?.screen?.pages, String(served)).toBe(true);
    }
  });

  it('leaves the key off, and still answers the screen, for absent and for every value that is not true', () => {
    for (const value of [undefined, false, null, 1, 'true', 'yes', {}, [true]]) {
      const screen = value === undefined ? screenOfSize() : screenOfSize({ pages: value as unknown as boolean });
      const got = screenOf(answer(screen), 'a', 1, true);
      expect(got?.screen, JSON.stringify(value)).not.toBeNull();
      expect('pages' in (got?.screen ?? {}), JSON.stringify(value)).toBe(false);
    }
  });

  it('moves no other flag: paste still leaves only where it is served', () => {
    const both = screenOfSize({ pages: true, paste: true });
    expect(screenOf(answer(both), 'a', 1, true)?.screen).toMatchObject({ pages: true, paste: true });
    const unserved = screenOf(answer(both), 'a', 1, false)?.screen ?? {};
    expect('paste' in unserved).toBe(false);
    expect((unserved as Screen).pages).toBe(true);
  });

  it('end to end: a full screen that takes keys is offered pages, an inline one and one that takes no keys are not', () => {
    const reading = (alternate: boolean): ScreenReading => ({
      styled: 'a full-screen view\nof numbered rows\n',
      display: { paneId: '%9', cols: 40, rows: 4, cursorX: 0, cursorY: 0, cursorVisible: true, alternate, history: 0 },
      displayLine: ['%9', 40, 4, 0, 0, 1, alternate ? 1 : 0, 0].join('\t'),
      steady: true
    });
    const served = (alternate: boolean, typable: boolean): Record<string, unknown> => {
      const composed = composeScreen(reading(alternate), { turn: QID, status: 'idle', typable, local: true });
      if (composed === 'large') throw new Error('large');
      const out = screenOf(answer(composed.screen), 'a', 1, true);
      if (out === null || out.screen === null) throw new Error('the door refused a composed screen');
      return out.screen as unknown as Record<string, unknown>;
    };
    expect(served(true, true)['pages']).toBe(true);
    expect(JSON.stringify(served(true, true))).toContain('"pages":true');
    expect('pages' in served(false, true)).toBe(false);
    expect('pages' in served(true, false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// THE OFFER AT THE CAP (the fix round)
// ---------------------------------------------------------------------------

describe('the offer never makes large a picture the build before served (the fix round)', () => {
  const CAP = pocket.POCKET_SCREEN_MAX_BYTES;
  const OFFER = Buffer.byteLength(',"pages":true', 'utf8');
  const bytesOf = (value: unknown): number => Buffer.byteLength(JSON.stringify(value), 'utf8');

  it('the offer is 13 bytes, and the cap is 1 MiB', () => {
    expect(OFFER).toBe(13);
    expect(CAP).toBe(1_048_576);
  });

  it('the door: an answer over the cap by the offer alone is served without it; one byte more is large; one at the cap keeps it', () => {
    // One row, one run whose text is n bytes: a run's text is not bounded by its cells.
    const screen = (n: number, pages: boolean): Screen =>
      screenOfSize({ rows: 1, cursor: { x: 0, y: 0, visible: true }, lines: [[{ text: 'y'.repeat(n), style: 0, cells: 1 }]], ...(pages ? { pages: true } : {}) });
    const served = (n: number, pages: boolean): ScreenAnswer | null => screenOf(answer(screen(n, pages)), 'a', 1, true);
    // The answer's bytes at n = 10, with the offer: every byte of n adds one.
    const small = served(10, true);
    expect(small?.screen?.pages).toBe(true);
    const at = (target: number): number => 10 + target - bytesOf(small);
    // Over the cap by exactly the offer: served, without it, and exactly what
    // the same picture with no offer is served as (the build before).
    const edge = served(at(CAP + OFFER), true);
    expect(edge?.why).toBeNull();
    expect('pages' in (edge?.screen ?? {})).toBe(false);
    expect(bytesOf(edge)).toBe(CAP);
    expect(edge).toEqual(served(at(CAP + OFFER), false));
    // One byte more: large, as the build before answered the picture with no offer.
    expect(served(at(CAP + OFFER + 1), true)?.why).toBe('large');
    expect(served(at(CAP + OFFER + 1), false)?.why).toBe('large');
    // At the cap, the offer stays.
    const full = served(at(CAP), true);
    expect(full?.screen?.pages).toBe(true);
    expect(bytesOf(full)).toBe(CAP);
    // With no offer, the same picture at the cap is served with no key, as before.
    const plain = served(at(CAP + OFFER), false);
    expect(plain?.why).toBeNull();
    expect(bytesOf(plain)).toBe(CAP);
  });

  it('the composer: a picture over the cap by the offer alone is composed without it; one byte more is large; one at the cap keeps it', () => {
    // One cell carries 'x' and m combining marks (2 bytes each in UTF-8, every
    // one joining the cell before it), and r plain letters after it fill the
    // odd byte: the composed bytes move by exactly 2m + r.
    const reading = (m: number, r: number): ScreenReading => ({
      styled: `x${'\u0301'.repeat(m)}${'a'.repeat(r)}`,
      display: { paneId: '%9', cols: 4, rows: 1, cursorX: 0, cursorY: 0, cursorVisible: true, alternate: true, history: 0 },
      displayLine: ['%9', 4, 1, 0, 0, 1, 1, 0].join('\t'),
      steady: true
    });
    const compose = (target: number, base: number) => {
      const need = target - base;
      const m = Math.floor(need / 2);
      return composeScreen(reading(m, need - 2 * m), { turn: QID, status: 'idle', typable: true, local: false });
    };
    const first = composeScreen(reading(0, 0), { turn: QID, status: 'idle', typable: true, local: false });
    if (first === 'large') throw new Error('large');
    expect(first.screen.pages).toBe(true);
    const base = first.bytes;
    const edge = compose(CAP + OFFER, base);
    if (edge === 'large') throw new Error('the offer alone made the picture large');
    expect('pages' in edge.screen).toBe(false);
    expect(edge.bytes).toBe(CAP);
    expect(bytesOf(edge.screen)).toBe(CAP);
    expect(compose(CAP + OFFER + 1, base)).toBe('large');
    const full = compose(CAP, base);
    if (full === 'large') throw new Error('large at the cap');
    expect(full.screen.pages).toBe(true);
    expect(full.bytes).toBe(CAP);
  });
});
