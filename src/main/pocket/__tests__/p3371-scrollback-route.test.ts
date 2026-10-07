/**
 * One page of the Screen's history, through the door's own route (Phase 337.1,
 * build/p3371/SPEC.md §5.2, §5.3.1, D7, D8, §7.2).
 *
 * Three things are proved here that reading the module cannot prove.
 *
 * THE QUERY IS CLOSED. Exactly six names, each once, every number a whole
 * number spelled one way and inside its bound, `from + count <= depth`, and
 * `keep` one of two words. Every shape that is nearly a query (a sign, a
 * leading zero, one past a bound, a size, a name twice) is driven and must be
 * refused with its word, and a refused query must never reach the reader.
 *
 * THE PAGE IS COMPOSED FIELD BY FIELD, whatever the reader said. A reader that
 * answers a row past the width, a style it never sent, a page reaching into
 * the live screen, a pane name of the wrong shape or a `why` beside rows is
 * answered as an unknown id; a field the contract does not name never leaves.
 *
 * THE ROUTE ASKS IN THE ORDER §5.3.1 WRITES: the query, the session by id, the
 * reader (absent is no route), the session again after the read, then the
 * composer inside the ask it read.
 *
 * Nothing here opens a socket, reads a file, starts a process or touches
 * Electron.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { Session } from '@shared/types';
import {
  POCKET_SCREEN_MAX_BYTES,
  POCKET_SCREEN_MAX_COLS,
  POCKET_SCREEN_MAX_RUNS,
  POCKET_SCREEN_MAX_STYLES,
  POCKET_SCROLLBACK_MAX_COUNT,
  POCKET_SCROLLBACK_MAX_INDEX,
  type PocketScreenStyle,
  type PocketScrollbackAnswer
} from '@shared/ipc/pocket';
import { MAX_SCROLLBACK_LINES } from '@shared/settings';
import { SCREEN_ENDED, SCREEN_UNREACHABLE, SCROLLBACK_BUSY, SCROLLBACK_MOVED } from '@shared/screen-copy';
import {
  createPocketRoutes,
  readScrollbackQuery,
  scrollbackOf,
  type PocketFacts,
  type PocketScrollbackAsk
} from '../routes';

// ---------------------------------------------------------------------------
// The fixture
// ---------------------------------------------------------------------------

function session(id: string, status: Session['status'] = 'running'): Session {
  return {
    id,
    name: id,
    tmuxName: id,
    projectPath: '/Users/x/work/alpha',
    cwd: '/Users/x/work/alpha',
    agent: 'claude',
    status,
    createdAt: 1
  } as Session;
}

const SESSIONS: Session[] = [session('s-live'), session('s-idle', 'idle'), session('s-gone', 'exited')];

function facts(over: Partial<PocketFacts> = {}): PocketFacts {
  return {
    sessions: () => SESSIONS,
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
    now: () => 123_456,
    ...over
  };
}

const SPACE = '0a1b2c3d4e5f';
const PLAIN: PocketScreenStyle = { fg: '#d8dbe2', bg: null, bold: false, dim: false, italic: false, underline: false, strike: false };
const LOUD: PocketScreenStyle = { fg: '#ff8800', bg: '#000000', bold: true, dim: false, italic: true, underline: true, strike: false };

/** An honest page: `count` rows from `from`, two styles, at width `wrap`, in a history of `depth` lines. */
function pageOf(over: Partial<PocketScrollbackAnswer> = {}, shape: { from?: number; count?: number; depth?: number; wrap?: number } = {}): PocketScrollbackAnswer {
  const from = shape.from ?? 100;
  const count = shape.count ?? 3;
  const wrap = shape.wrap ?? 8;
  const depth = shape.depth ?? 3_000;
  const rows = Array.from({ length: count }, (_, i) =>
    i === 0 ? [{ text: 'L101', style: 0, cells: 4 }, { text: String.fromCodePoint(0x6f22), style: 1, cells: 2 }] : i === 1 ? [] : [{ text: `L${String(from + i + 1)}`, style: 0, cells: 4 }]
  );
  return {
    sessionId: 'someone-else',
    at: 99,
    from,
    depth,
    wrap,
    space: SPACE,
    styles: [{ ...PLAIN }, { ...LOUD }],
    rows,
    why: null,
    sentence: null,
    ...over
  };
}

const ASK: PocketScrollbackAsk = { from: 100, count: 3, depth: 3_000, wrap: 8, keep: 'bottom' };

const q = (text: string): URLSearchParams => new URLSearchParams(text);
const HONEST = 'id=s-live&from=100&count=3&depth=3000&wrap=8&keep=bottom';

// ---------------------------------------------------------------------------
// The contract
// ---------------------------------------------------------------------------

describe('the contract (§5.2)', () => {
  it('asks at most 128 rows a page, and indexes as deep as the Scrollback depth setting goes', () => {
    expect(POCKET_SCROLLBACK_MAX_COUNT).toBe(128);
    // 100 rows and the 8 overlap rows fit (D7).
    expect(POCKET_SCROLLBACK_MAX_COUNT).toBeGreaterThanOrEqual(100 + 8);
    expect(POCKET_SCROLLBACK_MAX_INDEX).toBe(MAX_SCROLLBACK_LINES);
    expect(POCKET_SCROLLBACK_MAX_INDEX).toBe(100_000);
  });

  it('imports the index bound from the settings rather than spelling it again', () => {
    const source = readFileSync(join(__dirname, '..', '..', '..', 'shared', 'ipc', 'pocket.ts'), 'utf8');
    expect(source).toMatch(/import \{ MAX_SCROLLBACK_LINES \} from '\.\.\/settings';/);
    expect(source).toMatch(/export const POCKET_SCROLLBACK_MAX_INDEX = MAX_SCROLLBACK_LINES;/);
  });
});

// ---------------------------------------------------------------------------
// The query (D7)
// ---------------------------------------------------------------------------

describe('readScrollbackQuery (D7)', () => {
  it('reads the six names, in any order, into the ask', () => {
    expect(readScrollbackQuery(q(HONEST))).toEqual({ ok: true, id: 's-live', ask: ASK });
    expect(readScrollbackQuery(q('keep=top&wrap=8&depth=3000&count=3&from=100&id=s-live'))).toEqual({
      ok: true,
      id: 's-live',
      ask: { ...ASK, keep: 'top' }
    });
  });

  it('takes every bound exactly at its edge', () => {
    // The oldest line, one row, a history of one line.
    expect(readScrollbackQuery(q('id=a&from=0&count=1&depth=1&wrap=1&keep=top'))).toEqual({
      ok: true,
      id: 'a',
      ask: { from: 0, count: 1, depth: 1, wrap: 1, keep: 'top' }
    });
    // The deepest page of the deepest history at the widest width.
    const deepest = `id=a&from=${String(100_000 - 128)}&count=128&depth=100000&wrap=${String(POCKET_SCREEN_MAX_COLS)}&keep=bottom`;
    expect(readScrollbackQuery(q(deepest))).toEqual({
      ok: true,
      id: 'a',
      ask: { from: 99_872, count: 128, depth: 100_000, wrap: 512, keep: 'bottom' }
    });
    // from + count exactly the depth: the page ends at the live top.
    expect(readScrollbackQuery(q('id=a&from=2900&count=100&depth=3000&wrap=80&keep=bottom')).ok).toBe(true);
    // An id of 128 characters, and a UUID.
    expect(readScrollbackQuery(q(`id=${'a'.repeat(128)}&from=0&count=1&depth=1&wrap=1&keep=top`)).ok).toBe(true);
    expect(readScrollbackQuery(q('id=9e6c0d6a-1a51-4b33-8d0f-2a1b3c4d5e6f&from=0&count=1&depth=1&wrap=1&keep=top')).ok).toBe(true);
  });

  /** The honest query with one name's value replaced, or the name removed (`null`). */
  const withValue = (name: string, value: string | null): string => {
    const params = q(HONEST);
    if (value === null) params.delete(name);
    else params.set(name, value);
    return params.toString();
  };

  const refused: [string, string, string][] = [
    // Each name missing.
    ['no id', withValue('id', null), 'id'],
    ['no from', withValue('from', null), 'number'],
    ['no count', withValue('count', null), 'number'],
    ['no depth', withValue('depth', null), 'number'],
    ['no wrap', withValue('wrap', null), 'number'],
    ['no keep', withValue('keep', null), 'keep'],
    // Each name twice.
    ['id twice', `${HONEST}&id=s-live`, 'repeated'],
    ['from twice', `${HONEST}&from=100`, 'repeated'],
    ['count twice', `${HONEST}&count=3`, 'repeated'],
    ['depth twice', `${HONEST}&depth=3000`, 'repeated'],
    ['wrap twice', `${HONEST}&wrap=8`, 'repeated'],
    ['keep twice', `${HONEST}&keep=bottom`, 'repeated'],
    // A name the query does not have, sizes first: the phone never sizes the Mac.
    ['cols', `${HONEST}&cols=80`, 'parameter'],
    ['rows', `${HONEST}&rows=24`, 'parameter'],
    ['width', `${HONEST}&width=80`, 'parameter'],
    ['height', `${HONEST}&height=24`, 'parameter'],
    ['resize', `${HONEST}&resize=1`, 'parameter'],
    ['since, the poll’s name', `${HONEST}&since=0123456789ab`, 'parameter'],
    ['an empty name', `${HONEST}&=1`, 'parameter'],
    ['a name in another case', HONEST.replace('from=', 'From='), 'parameter'],
    // The id.
    ['an empty id', withValue('id', ''), 'id'],
    ['an id of 129', withValue('id', 'a'.repeat(129)), 'id'],
    // A number spelled any other way.
    ['a sign', withValue('from', '+5'), 'number'],
    ['a minus', withValue('from', '-1'), 'number'],
    ['a leading zero', withValue('from', '0100'), 'number'],
    ['a leading zero on count', withValue('count', '03'), 'number'],
    ['a point', withValue('count', '3.0'), 'number'],
    ['an exponent', withValue('depth', '3e3'), 'number'],
    ['hex', withValue('wrap', '0x8'), 'number'],
    ['a space before', withValue('wrap', ' 8'), 'number'],
    ['a space after', withValue('wrap', '8 '), 'number'],
    ['an empty number', withValue('depth', ''), 'number'],
    ['digits that are not ASCII', withValue('count', String.fromCodePoint(0xff13)), 'number'],
    ['ten digits', withValue('depth', '1000000000'), 'number'],
    // A number out of its bound.
    ['from of 100,001', withValue('from', '100001'), 'range'],
    ['depth of 100,001', `id=s-live&from=100&count=3&depth=100001&wrap=8&keep=bottom`, 'range'],
    ['a count of 0', withValue('count', '0'), 'range'],
    ['a count of 129', withValue('count', '129'), 'range'],
    ['a wrap of 0', withValue('wrap', '0'), 'range'],
    ['a wrap of 513', withValue('wrap', '513'), 'range'],
    // A page past the top of the phone's own index space (§Attack B1).
    ['from + count past depth', 'id=s-live&from=2998&count=3&depth=3000&wrap=8&keep=bottom', 'range'],
    ['from at depth', 'id=s-live&from=3000&count=1&depth=3000&wrap=8&keep=bottom', 'range'],
    ['a depth of 0', 'id=s-live&from=0&count=1&depth=0&wrap=8&keep=bottom', 'range'],
    // keep.
    ['keep middle', withValue('keep', 'middle'), 'keep'],
    ['keep TOP', withValue('keep', 'TOP'), 'keep'],
    ['keep Bottom', withValue('keep', 'Bottom'), 'keep'],
    ['keep empty', withValue('keep', ''), 'keep'],
    ['keep with a space', withValue('keep', 'top '), 'keep']
  ];
  for (const [name, query, reason] of refused) {
    it(`refuses ${name} with ${reason}`, () => {
      expect(readScrollbackQuery(q(query))).toEqual({ ok: false, reason });
    });
  }
});

// ---------------------------------------------------------------------------
// The page, composed field by field (scrollbackOf, D8, §5.3.1)
// ---------------------------------------------------------------------------

describe('scrollbackOf (D8, §5.3.1)', () => {
  it('copies every field and nothing else, with fresh arrays, and the session the query named', () => {
    const from = pageOf();
    const extra = {
      ...from,
      secret: 'x',
      styledBytes: '\u001b[31mraw',
      styles: [{ ...PLAIN, colourSpace: 'p3' }, { ...LOUD }],
      rows: from.rows.map((row) => row.map((run) => ({ ...run, pane: '%3' })))
    } as unknown as PocketScrollbackAnswer;
    const got = scrollbackOf(extra, 's-live', 5, ASK);
    expect(got).toEqual({ ...from, sessionId: 's-live' });
    expect(Object.keys(got ?? {})).toEqual(['sessionId', 'at', 'from', 'depth', 'wrap', 'space', 'styles', 'rows', 'why', 'sentence']);
    expect(got?.rows).not.toBe(extra.rows);
    expect(got?.rows[0]).not.toBe(extra.rows[0]);
    expect(got?.rows[0]?.[0]).not.toBe(extra.rows[0]?.[0]);
    expect(Object.keys(got?.rows[0]?.[0] ?? {}).sort()).toEqual(['cells', 'style', 'text']);
    expect(got?.styles).not.toBe(extra.styles);
    expect(Object.keys(got?.styles[0] ?? {}).sort()).toEqual(['bg', 'bold', 'dim', 'fg', 'italic', 'strike', 'underline']);
  });

  it('stamps the time it was handed when the reader carried none, and sets the sentence null', () => {
    expect(scrollbackOf(pageOf({ at: Number.NaN }), 'a', 5)?.at).toBe(5);
    expect(scrollbackOf(pageOf({ sentence: 'the reader said this' }), 'a', 5)?.sentence).toBeNull();
  });

  it('answers each absence with main’s own sentence for its word, and nothing else', () => {
    const absent = (why: PocketScrollbackAnswer['why']): PocketScrollbackAnswer =>
      pageOf({ why, sentence: 'anything', from: null, depth: null, wrap: null, space: null, styles: [], rows: [] });
    const words: [NonNullable<PocketScrollbackAnswer['why']>, string][] = [
      ['ended', SCREEN_ENDED],
      ['unreachable', SCREEN_UNREACHABLE],
      ['moved', SCROLLBACK_MOVED],
      ['busy', SCROLLBACK_BUSY]
    ];
    for (const [why, sentence] of words) {
      expect(scrollbackOf(absent(why), 'a', 5), why).toEqual({
        sessionId: 'a',
        at: 99,
        from: null,
        depth: null,
        wrap: null,
        space: null,
        styles: [],
        rows: [],
        why,
        sentence
      });
    }
    expect(scrollbackOf(absent('gone' as never), 'a', 5)).toBeNull();
    expect(scrollbackOf(absent('large' as never), 'a', 5)).toBeNull();
    expect(scrollbackOf(absent('Moved' as never), 'a', 5)).toBeNull();
  });

  it('refuses a `why` that carries anything else, because that answer says two things', () => {
    const base = pageOf({ why: 'moved', sentence: null, from: null, depth: null, wrap: null, space: null, styles: [], rows: [] });
    expect(scrollbackOf(base, 'a', 5)).not.toBeNull();
    expect(scrollbackOf({ ...base, rows: [[{ text: 'L1', style: 0, cells: 2 }]] }, 'a', 5)).toBeNull();
    expect(scrollbackOf({ ...base, rows: [[]] }, 'a', 5)).toBeNull();
    expect(scrollbackOf({ ...base, styles: [{ ...PLAIN }] }, 'a', 5)).toBeNull();
    expect(scrollbackOf({ ...base, from: 0 }, 'a', 5)).toBeNull();
    expect(scrollbackOf({ ...base, depth: 10 }, 'a', 5)).toBeNull();
    expect(scrollbackOf({ ...base, wrap: 8 }, 'a', 5)).toBeNull();
    expect(scrollbackOf({ ...base, space: SPACE }, 'a', 5)).toBeNull();
    expect(scrollbackOf({ ...base, rows: undefined as never }, 'a', 5)).toBeNull();
  });

  it('answers null for a value that is not an answer', () => {
    expect(scrollbackOf(null as unknown as PocketScrollbackAnswer, 'a', 5)).toBeNull();
    expect(scrollbackOf('page' as unknown as PocketScrollbackAnswer, 'a', 5)).toBeNull();
  });

  it('takes the edges: the oldest line, a page ending at the live top, the deepest index and the widest width', () => {
    expect(scrollbackOf(pageOf({}, { from: 0, count: 3, depth: 3 }), 'a', 5)?.from).toBe(0);
    expect(scrollbackOf(pageOf({}, { from: 2_997, count: 3, depth: 3_000 }), 'a', 5)?.rows).toHaveLength(3);
    expect(scrollbackOf(pageOf({}, { from: 99_997, count: 3, depth: 100_000 }), 'a', 5)?.depth).toBe(100_000);
    const wide = pageOf({ wrap: POCKET_SCREEN_MAX_COLS, rows: [[{ text: 'x'.repeat(512), style: 0, cells: 512 }]] }, { count: 1 });
    expect(scrollbackOf(wide, 'a', 5)?.wrap).toBe(512);
    const many = pageOf({}, { from: 0, count: POCKET_SCROLLBACK_MAX_COUNT, depth: 3_000 });
    expect(scrollbackOf(many, 'a', 5)?.rows).toHaveLength(128);
  });

  const malformed: [string, Partial<PocketScrollbackAnswer>][] = [
    // The numbers.
    ['a from that is null with no why', { from: null }],
    ['a negative from', { from: -1 }],
    ['a from that is not whole', { from: 100.5 }],
    ['a from past the index bound', { from: 100_001 }],
    ['a depth past the index bound', { depth: 100_001 }],
    ['a depth that is a string', { depth: '3000' as unknown as number }],
    ['a wrap of 0', { wrap: 0 }],
    ['a wrap past the widest screen', { wrap: 513 }],
    ['a wrap that is null with no why', { wrap: null }],
    // The index space's name (§Attack B8).
    ['a space of 11 hex', { space: SPACE.slice(1) }],
    ['a space of 13 hex', { space: `${SPACE}0` }],
    ['a space in upper case', { space: SPACE.toUpperCase() }],
    ['a space that is not hex', { space: '0a1b2c3d4e5g' }],
    ['a space that is null with no why', { space: null }],
    ['a pane id for a space', { space: '%3' }],
    // The rows.
    ['no rows with no why', { rows: [] }],
    ['rows that are not a list', { rows: 'L101' as never }],
    ['a row that is not a list', { rows: [[{ text: 'L', style: 0, cells: 1 }], 'L102' as never, []] }],
    ['a run whose style is out of range', { rows: [[{ text: 'L', style: 2, cells: 1 }], [], []] }],
    ['a run whose style is negative', { rows: [[{ text: 'L', style: -1, cells: 1 }], [], []] }],
    ['a run of no cells', { rows: [[{ text: 'L', style: 0, cells: 0 }], [], []] }],
    ['a run wider than wrap', { rows: [[{ text: 'abcdefghi', style: 0, cells: 9 }], [], []] }],
    [
      'a row whose runs together pass wrap',
      { rows: [[{ text: 'abcde', style: 0, cells: 5 }, { text: 'fghi', style: 1, cells: 4 }], [], []] }
    ],
    ['a run whose text is not a string', { rows: [[{ text: 7 as unknown as string, style: 0, cells: 1 }], [], []] }],
    ['a run that is null', { rows: [[null as never], [], []] }],
    // The styles.
    ['a style whose fg is not a colour', { styles: [{ ...PLAIN, fg: 'red' }, { ...LOUD }] }],
    ['a style whose bg is in upper case', { styles: [{ ...PLAIN }, { ...LOUD, bg: '#FF8800' }] }],
    ['a style whose bold is not a boolean', { styles: [{ ...PLAIN, bold: 1 as unknown as boolean }, { ...LOUD }] }],
    ['styles that are not a list', { styles: null as never }]
  ];
  for (const [name, over] of malformed) {
    it(`answers null, never a malformed page, for ${name}`, () => {
      expect(scrollbackOf(pageOf(over), 'a', 5)).toBeNull();
    });
  }

  it('answers null for a page that reaches into the live screen: from + rows past depth (D12)', () => {
    expect(scrollbackOf(pageOf({}, { from: 2_998, count: 3, depth: 3_000 }), 'a', 5)).toBeNull();
    expect(scrollbackOf(pageOf({}, { from: 0, count: 3, depth: 2 }), 'a', 5)).toBeNull();
    expect(scrollbackOf(pageOf({}, { from: 0, count: 1, depth: 0 }), 'a', 5)).toBeNull();
  });

  it('answers null past each cap, read from the contract', () => {
    expect(scrollbackOf(pageOf({}, { from: 0, count: POCKET_SCROLLBACK_MAX_COUNT + 1, depth: 3_000 }), 'a', 5)).toBeNull();
    const style = { ...PLAIN };
    const tooManyStyles = Array.from({ length: POCKET_SCREEN_MAX_STYLES + 1 }, () => ({ ...style }));
    expect(scrollbackOf(pageOf({ styles: tooManyStyles }), 'a', 5)).toBeNull();
    // Exactly at the style cap it is served.
    expect(scrollbackOf(pageOf({ styles: tooManyStyles.slice(1) }), 'a', 5)).not.toBeNull();
    // Runs: 128 rows of 129 one-cell runs is 16,512, past 16,384.
    const runRow = Array.from({ length: 129 }, () => ({ text: 'x', style: 0, cells: 1 }));
    const tooManyRuns = pageOf({ wrap: 512, rows: Array.from({ length: 128 }, () => runRow.map((r) => ({ ...r }))) }, { from: 0, count: 128 });
    expect(128 * 129).toBeGreaterThan(POCKET_SCREEN_MAX_RUNS);
    expect(scrollbackOf(tooManyRuns, 'a', 5)).toBeNull();
    // Bytes: 128 rows of 512 cells, each a letter under nine combining
    // accents, is about 1.2 MB as JSON: inside every other cap and over the
    // answer's.
    const cell = `a${String.fromCodePoint(0x301).repeat(9)}`;
    const heavy = pageOf({ wrap: 512, rows: Array.from({ length: 128 }, () => [{ text: cell.repeat(512), style: 0, cells: 512 }]) }, { from: 0, count: 128 });
    expect(Buffer.byteLength(JSON.stringify(heavy))).toBeGreaterThan(POCKET_SCREEN_MAX_BYTES);
    expect(scrollbackOf(heavy, 'a', 5)).toBeNull();
    // And one such row is served: the byte cap reads the whole answer.
    const light = pageOf({ wrap: 512, rows: [[{ text: cell.repeat(512), style: 0, cells: 512 }]] }, { from: 0, count: 1 });
    expect(scrollbackOf(light, 'a', 5)?.rows).toHaveLength(1);
  });

  it('holds the page inside the ask the route read: its rows, its width and its depth', () => {
    // Inside the ask: a shorter page kept from the bottom, and from the top.
    expect(scrollbackOf(pageOf({}, { from: 101, count: 2 }), 'a', 5, ASK)).not.toBeNull();
    expect(scrollbackOf(pageOf({}, { from: 100, count: 2 }), 'a', 5, { ...ASK, keep: 'top' })).not.toBeNull();
    // A deeper history than the phone saw is the history having grown.
    expect(scrollbackOf(pageOf({}, { depth: 3_050 }), 'a', 5, ASK)).not.toBeNull();
    // Rows before the first asked, or past the last asked.
    expect(scrollbackOf(pageOf({}, { from: 99 }), 'a', 5, ASK)).toBeNull();
    expect(scrollbackOf(pageOf({}, { from: 101 }), 'a', 5, ASK)).toBeNull();
    expect(scrollbackOf(pageOf({}, { from: 100, count: 4 }), 'a', 5, ASK)).toBeNull();
    // Another width, or a shallower history than the phone saw (D12).
    expect(scrollbackOf(pageOf({}, { wrap: 9 }), 'a', 5, ASK)).toBeNull();
    expect(scrollbackOf(pageOf({}, { depth: 2_999 }), 'a', 5, ASK)).toBeNull();
    // Without the ask, the same pages are judged by the invariants alone.
    expect(scrollbackOf(pageOf({}, { from: 99 }), 'a', 5)).not.toBeNull();
    expect(scrollbackOf(pageOf({}, { wrap: 9 }), 'a', 5)).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// The route (§5.3.1)
// ---------------------------------------------------------------------------

describe('the route', () => {
  it('hands the reader the session, the ask it read and the very closing, and answers what it composed', async () => {
    const asked: unknown[] = [];
    const closing = (): boolean => false;
    const routes = createPocketRoutes(
      facts({
        scrollback: async (s, ask, handed) => {
          asked.push([s.id, ask, handed]);
          return pageOf();
        }
      })
    );
    const got = await routes.scrollback(q(HONEST), closing);
    expect(asked).toEqual([['s-live', ASK, closing]]);
    expect(got).toEqual({ ...pageOf(), sessionId: 's-live' });
  });

  it('hands an idle session and an ended one to the reader too: the reader says ended, and the route carries its word', async () => {
    const routes = createPocketRoutes(
      facts({
        scrollback: async (s) =>
          s.status === 'exited'
            ? { ...pageOf(), from: null, depth: null, wrap: null, space: null, styles: [], rows: [], why: 'ended', sentence: null }
            : pageOf()
      })
    );
    expect((await routes.scrollback(q(HONEST.replace('s-live', 's-idle')), () => false))?.rows).toHaveLength(3);
    expect(await routes.scrollback(q(HONEST.replace('s-live', 's-gone')), () => false)).toMatchObject({
      sessionId: 's-gone',
      why: 'ended',
      sentence: SCREEN_ENDED,
      rows: []
    });
  });

  it('answers null, and asks no reader, for a refused query or an id nobody has', async () => {
    let asked = 0;
    const routes = createPocketRoutes(
      facts({
        scrollback: async () => {
          asked += 1;
          return pageOf();
        }
      })
    );
    for (const query of [
      '',
      HONEST.replace('s-live', 'nobody'),
      `${HONEST}&cols=80`,
      HONEST.replace('from=100', 'from=-1'),
      HONEST.replace('count=3', 'count=129'),
      HONEST.replace('keep=bottom', 'keep=middle'),
      HONEST.replace('depth=3000', 'depth=102'),
      `${HONEST}&id=s-live`
    ]) {
      expect(await routes.scrollback(q(query), () => false), query).toBeNull();
    }
    expect(asked).toBe(0);
  });

  it('answers null when this Mac has no page reader: the route does not exist (404)', async () => {
    const routes = createPocketRoutes(facts());
    expect(await routes.scrollback(q(HONEST), () => false)).toBeNull();
  });

  it('answers null, never a hang, when the reader rejects or throws', async () => {
    const rejects = createPocketRoutes(facts({ scrollback: () => Promise.reject(new Error('read failed')) }));
    expect(await rejects.scrollback(q(HONEST), () => false)).toBeNull();
    const throws = createPocketRoutes(
      facts({
        scrollback: () => {
          throw new Error('before the promise');
        }
      })
    );
    expect(await throws.scrollback(q(HONEST), () => false)).toBeNull();
  });

  it('answers a session removed while its page was read as an id nobody has, and nothing of it leaves', async () => {
    let listed: Session[] = SESSIONS;
    const routes = createPocketRoutes(
      facts({
        sessions: () => listed,
        scrollback: async () => {
          listed = SESSIONS.filter((s) => s.id !== 's-live');
          return pageOf();
        }
      })
    );
    expect(await routes.scrollback(q(HONEST), () => false)).toBeNull();
  });

  it('answers null for a page the reader served outside the ask it was handed', async () => {
    const outside = createPocketRoutes(facts({ scrollback: async () => pageOf({}, { from: 101 }) }));
    expect(await outside.scrollback(q(HONEST), () => false)).toBeNull();
    const shallower = createPocketRoutes(facts({ scrollback: async () => pageOf({}, { depth: 2_999 }) }));
    expect(await shallower.scrollback(q(HONEST), () => false)).toBeNull();
    const wider = createPocketRoutes(facts({ scrollback: async () => pageOf({}, { wrap: 9 }) }));
    expect(await wider.scrollback(q(HONEST), () => false)).toBeNull();
  });

  it('never asks the Screen’s watcher for a page, nor the page reader for a picture', async () => {
    let watched = 0;
    let paged = 0;
    const routes = createPocketRoutes(
      facts({
        screen: async () => {
          watched += 1;
          return { sessionId: 's-live', revision: '0123456789ab', at: 1, unchanged: true, screen: null, why: null, sentence: null };
        },
        scrollback: async () => {
          paged += 1;
          return pageOf();
        }
      })
    );
    await routes.scrollback(q(HONEST), () => false);
    expect([watched, paged]).toEqual([0, 1]);
    await routes.screen(q('id=s-live'), () => false);
    expect([watched, paged]).toEqual([1, 1]);
  });

  it('does not change /v1/session: a session offers its screen as before, and names no page', async () => {
    const routes = createPocketRoutes(facts({ scrollback: async () => pageOf() }));
    const detail = await routes.session('s-live');
    expect(detail?.session.screen).toBe(false);
    expect(JSON.stringify(detail)).not.toContain('scrollback');
  });
});
