/**
 * The received row, over invented files and an invented clock (Phase 374, rows
 * U4, U5 and U6).
 *
 * PURE. Nothing is read from any folder, no real plan, address or number from
 * anybody's account is in this file, and every hash is a run of one letter.
 */

import { describe, expect, it } from 'vitest';
import { USAGE_STALE_MS } from '@shared/usage';
import {
  antigravityRow,
  heldReading,
  newestReading,
  parseAntigravityFile,
  type AntigravityFile,
  type AntigravityReading
} from '../antigravity/receive';
import { HASH_A, HASH_B, line, type LineBucket } from './p374-receiver';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
/** A fixed epoch. The day is invented. */
const T0 = Date.UTC(2031, 0, 10, 12, 0, 0);
const iso = (at: number): string => new Date(at).toISOString();

function file(
  q: Record<string, LineBucket>,
  mtimeMs: number = T0,
  id = 's1',
  over: Record<string, unknown> = {}
): AntigravityFile {
  return { id, text: line(q, over), mtimeMs };
}

function reading(q: Record<string, LineBucket>, at: number = T0): AntigravityReading {
  const r = newestReading([file(q, at)], at);
  if (r === null) throw new Error('not a reading');
  return r;
}

const FULL_SET: Record<string, LineBucket> = {
  'gemini-5h': { f: 0.75, r: iso(T0 + 3 * HOUR) },
  'gemini-weekly': { f: 0.5, r: iso(T0 + 3 * DAY) },
  '3p-5h': { f: 0.9, r: iso(T0 + 4 * HOUR) },
  '3p-weekly': { f: 1, r: iso(T0 + 7 * DAY) }
};

describe('the file', () => {
  it('reads the four buckets, the plan word and the account mark', () => {
    const r = parseAntigravityFile(line(FULL_SET, { p: 'Example Plan' }));
    expect(r?.hash).toBe(HASH_A);
    expect(r?.plan).toBe('Example Plan');
    expect(Object.keys(r?.buckets ?? {})).toEqual([
      'gemini-5h',
      'gemini-weekly',
      '3p-5h',
      '3p-weekly'
    ]);
    expect(r?.buckets['gemini-5h']).toEqual({
      f: 0.75,
      r: T0 + 3 * HOUR,
      disabled: false,
      amount: false
    });
  });

  it('is not a reading when it is a fresh slot, or anything but the one shape', () => {
    for (const text of [
      '{}',
      '',
      'null',
      '[]',
      '7',
      '"x"',
      '{"v":1',
      line(FULL_SET, { v: 2 }),
      line(FULL_SET, { v: '1' }),
      line(FULL_SET, { q: null }),
      line(FULL_SET, { q: [] }),
      `${line(FULL_SET)}${line(FULL_SET)}`,
      `${line(FULL_SET)}${' '.repeat(5000)}`
    ]) {
      expect(parseAntigravityFile(text), text.slice(0, 40)).toBeNull();
    }
  });

  it('IGNORES A FILE WITH NO ACCOUNT, and one whose account is not a hash', () => {
    for (const h of [null, undefined, '', 'x', 'A'.repeat(64), 'a'.repeat(63), 7, {}]) {
      expect(parseAntigravityFile(line(FULL_SET, { h }))).toBeNull();
    }
    expect(parseAntigravityFile(line(FULL_SET, { h: 'someone@example.com' }))).toBeNull();
  });

  it('drops a bucket id nobody compiled, one of another case, and an inherited one', () => {
    const r = parseAntigravityFile(
      line({
        'GEMINI-5H': { f: 0.1 },
        'argon-5h': { f: 0.1 },
        toString: { f: 0.1 },
        'gemini-weekly': { f: 0.5 }
      })
    );
    expect(Object.keys(r?.buckets ?? {})).toEqual(['gemini-weekly']);
  });

  it('takes a reset that is one exact instant and nothing looser', () => {
    const at = (r: unknown): number | null | undefined =>
      parseAntigravityFile(line({ 'gemini-5h': { f: 0.5, r } }))?.buckets['gemini-5h']?.r;
    expect(at('2031-01-10T15:00:00Z')).toBe(T0 + 3 * HOUR);
    expect(at('2031-01-10T15:00:00.123456789Z')).toBe(T0 + 3 * HOUR + 123);
    expect(at('2031-01-10T17:00:00+02:00')).toBe(T0 + 3 * HOUR);
    for (const odd of ['5', '2031', '2031-01-10', '', 'Z', 7, null, {}, '9999-99-99T99:99:99Z']) {
      expect(at(odd), String(odd)).toBeNull();
    }
  });

  it('puts the plan word through the one gate', () => {
    for (const p of ['someone@example.com', '11111111-2222-3333-4444-555555555555', 7, '']) {
      expect(parseAntigravityFile(line(FULL_SET, { p }))?.plan).toBeNull();
    }
  });
});

describe('U5: a number is drawn only from a real one', () => {
  const five = (b: LineBucket): unknown =>
    antigravityRow(reading({ 'gemini-5h': b, 'gemini-weekly': { f: 0.5 } }), T0).fiveHour;

  it('is what was USED, through the one clamp', () => {
    expect(five({ f: 0.75, r: iso(T0 + HOUR) })).toEqual({
      percent: 25,
      resetsAt: T0 + HOUR
    });
    expect(five({ f: 0.0345 })).toEqual({ percent: 96.6, resetsAt: null });
    expect(five({ f: 0, r: iso(T0 + HOUR) })).toEqual({
      percent: 100,
      resetsAt: T0 + HOUR
    });
  });

  it('draws nothing from a value out of range, and never a FULL bar from one', () => {
    for (const f of [-3, -0.0001, 1.0001, 1.5, null, '0.5', true, {}, []]) {
      expect(five({ f }), String(f)).toBeNull();
    }
    const infinite = line({ 'gemini-5h': { f: 0.5 } }).replace('"f":0.5', '"f":1e309');
    const r = newestReading([{ id: 's', text: infinite, mtimeMs: T0 }], T0);
    expect(r?.buckets['gemini-5h']?.f).toBe(Number.POSITIVE_INFINITY);
    expect(antigravityRow(r, T0).fiveHour).toBeNull();
    expect(antigravityRow(r, T0).state).toBe('no-windows');
  });

  it('draws nothing from a disabled bucket, at 1.0 or at 0, or from anything odd there', () => {
    for (const d of [true, 'true', 'no', 1, 0, {}]) {
      expect(five({ f: 1, d }), JSON.stringify(d)).toBeNull();
      expect(five({ f: 0, d }), JSON.stringify(d)).toBeNull();
    }
    expect(five({ f: 0.5, d: false })).not.toBeNull();
    expect(five({ f: 0.5, d: null })).not.toBeNull();
  });

  it('draws nothing from a bucket that states an amount', () => {
    for (const a of [true, 'x', 1, 0]) expect(five({ f: 0.5, a })).toBeNull();
    expect(five({ f: null, a: true })).toBeNull();
  });

  it('draws a full bucket at 0 with NO reset, because that reset is a placeholder', () => {
    expect(five({ f: 1, r: iso(T0 + 5 * HOUR) })).toEqual({ percent: 0, resetsAt: null });
    // And the placeholder decides nothing else either: a passed one is not void.
    expect(five({ f: 1, r: iso(T0 - HOUR) })).toEqual({ percent: 0, resetsAt: null });
  });

  it('voids a window whose reset is a zero time, so an empty bucket is no full bar', () => {
    for (const r of ['1970-01-01T00:00:00Z', '0001-01-01T00:00:00Z']) {
      expect(five({ f: 0, r })).toBeNull();
    }
  });

  it('keeps the one bound on a reset nobody could mean', () => {
    expect(five({ f: 0.5, r: iso(T0 + 400 * DAY) })).toEqual({
      percent: 50,
      resetsAt: null
    });
  });
});

describe('U4: age is decided when the row is composed', () => {
  const r = reading(FULL_SET);

  it('is ok at 29 minutes, stale at 31, and says when the numbers changed', () => {
    expect(antigravityRow(r, T0 + 29 * MIN).state).toBe('ok');
    expect(antigravityRow(r, T0 + USAGE_STALE_MS).state).toBe('ok');
    const old = antigravityRow(r, T0 + 31 * MIN);
    expect(old.state).toBe('stale');
    expect(old.readAt).toBe(T0);
    expect(old.fiveHour).toEqual({ percent: 25, resetsAt: T0 + 3 * HOUR });
    expect(old.loginChanged).toBe(false);
  });

  it('voids the five hour window at its reset and leaves the week', () => {
    const row = antigravityRow(r, T0 + 3 * HOUR);
    expect(row.fiveHour).toBeNull();
    expect(row.sevenDay).toEqual({ percent: 50, resetsAt: T0 + 3 * DAY });
    expect(row.state).toBe('stale');
  });

  it('voids a window older than it is long, so an old full bucket is not drawn for a month', () => {
    const idle = reading({
      'gemini-5h': { f: 1, r: iso(T0 + 5 * HOUR) },
      'gemini-weekly': { f: 1, r: iso(T0 + 7 * DAY) }
    });
    expect(antigravityRow(idle, T0 + 5 * HOUR).fiveHour).not.toBeNull();
    expect(antigravityRow(idle, T0 + 5 * HOUR + 1).fiveHour).toBeNull();
    expect(antigravityRow(idle, T0 + 7 * DAY).sevenDay).not.toBeNull();
    const gone = antigravityRow(idle, T0 + 7 * DAY + 1);
    expect(gone.sevenDay).toBeNull();
    expect(gone.state).toBe('waiting');
  });

  it('waits when every window has passed, and says nothing about a plan', () => {
    const row = antigravityRow(r, T0 + 30 * DAY, 'version');
    expect(row).toMatchObject({
      state: 'waiting',
      waitingFor: 'version',
      fiveHour: null,
      sevenDay: null,
      second: null,
      plan: null,
      readAt: null
    });
  });

  it('waits before anything has arrived', () => {
    expect(antigravityRow(null, T0)).toMatchObject({
      provider: 'antigravity',
      state: 'waiting',
      waitingFor: 'session',
      login: null
    });
  });

  it('says no windows when the newest reading names none it can draw', () => {
    expect(antigravityRow(reading({}), T0)).toMatchObject({
      state: 'no-windows',
      waitingFor: null,
      readAt: T0
    });
  });

  it('never says signed out, expired, api key or unavailable, whatever it holds', () => {
    const states = new Set<string>();
    for (const q of [{}, FULL_SET, { 'gemini-5h': { f: -1 } }] as Record<string, LineBucket>[]) {
      for (const after of [0, HOUR, 6 * HOUR, 8 * DAY]) {
        states.add(antigravityRow(reading(q), T0 + after).state);
      }
    }
    expect([...states].sort()).toEqual(['no-windows', 'ok', 'stale', 'waiting']);
  });
});

describe('the two groups', () => {
  it('puts the Gemini group on the face and the other on `second`', () => {
    const row = antigravityRow(reading(FULL_SET), T0);
    expect(row.fiveHour?.percent).toBe(25);
    expect(row.sevenDay?.percent).toBe(50);
    expect(row.scoped).toBeNull();
    expect(row.second).toEqual({
      label: 'Claude and GPT',
      fiveHour: { percent: 10, resetsAt: T0 + 4 * HOUR },
      sevenDay: { percent: 0, resetsAt: null }
    });
  });

  it('draws no second group when it has no window, and the row when it alone has one', () => {
    expect(antigravityRow(reading({ 'gemini-5h': { f: 0.5 } }), T0).second).toBeNull();
    const only = antigravityRow(reading({ '3p-5h': { f: 0.5 } }), T0);
    expect(only.state).toBe('ok');
    expect(only.fiveHour).toBeNull();
    expect(only.second?.fiveHour).toEqual({ percent: 50, resetsAt: null });
    expect(only.second?.sevenDay).toBeNull();
  });

  it('carries no account mark of any kind', () => {
    expect(JSON.stringify(antigravityRow(reading(FULL_SET), T0))).not.toContain(HASH_A);
  });
});

describe('U6: the newest file speaks whole', () => {
  it('draws every bucket of the newest file and none of an older one', () => {
    const r = newestReading(
      [
        file({ 'gemini-5h': { f: 0.1 }, 'gemini-weekly': { f: 0.2 } }, T0 - MIN, 'old'),
        file({ 'gemini-5h': { f: 0.75 } }, T0, 'new')
      ],
      T0
    );
    const row = antigravityRow(r, T0);
    expect(row.fiveHour?.percent).toBe(25);
    expect(row.sevenDay).toBeNull();
  });

  it('drops everything of another account with its newer file, in either listing order', () => {
    const mine = file(FULL_SET, T0 - MIN, 'a', { p: 'Example One' });
    const theirs = file({ '3p-weekly': { f: 0.5 } }, T0, 'b', { h: HASH_B, p: 'Example Two' });
    for (const files of [
      [mine, theirs],
      [theirs, mine]
    ]) {
      const r = newestReading(files, T0);
      expect(r?.hash).toBe(HASH_B);
      const row = antigravityRow(r, T0);
      expect(row.plan).toBe('Example Two');
      expect(row.fiveHour).toBeNull();
      expect(row.sevenDay).toBeNull();
    }
  });

  it('skips a newer file with no account, and answers nothing when there is none', () => {
    const r = newestReading(
      [file(FULL_SET, T0 - MIN, 'a'), file(FULL_SET, T0, 'b', { h: null })],
      T0
    );
    expect(r?.at).toBe(T0 - MIN);
    expect(newestReading([{ id: 'x', text: '{}', mtimeMs: T0 }], T0)).toBeNull();
    expect(newestReading([], T0)).toBeNull();
  });

  it('counts a future time as now, ONCE, so an unchanged file still ages', () => {
    const seen = new Map<string, number>();
    const ahead = file(FULL_SET, T0 + 2 * HOUR);
    expect(newestReading([ahead], T0, seen)?.at).toBe(T0);
    expect(newestReading([ahead], T0 + 40 * MIN, seen)?.at).toBe(T0);
    const row = antigravityRow(
      newestReading([ahead], T0 + 40 * MIN, seen),
      T0 + 40 * MIN
    );
    expect(row.state).toBe('stale');
    // A file written in between is newer than it, and stays newer.
    const real = file({ 'gemini-5h': { f: 0.5 } }, T0 + 41 * MIN, 'real');
    expect(newestReading([ahead, real], T0 + 42 * MIN, seen)?.at).toBe(T0 + 41 * MIN);
    expect(newestReading([ahead, real], T0 + 50 * MIN, seen)?.at).toBe(T0 + 41 * MIN);
    // And a file that has gone is forgotten, so the map cannot grow.
    newestReading([real], T0 + 51 * MIN, seen);
    expect(seen.size).toBe(0);
  });

  it('holds what it had when the newest session is removed, and takes a newer one', () => {
    const newer = reading(FULL_SET, T0);
    const older = reading({ 'gemini-5h': { f: 0.1 } }, T0 - HOUR);
    expect(heldReading(newer, older, T0)).toBe(newer);
    expect(heldReading(newer, null, T0)).toBe(newer);
    expect(heldReading(null, older, T0)).toBe(older);
    const next = reading({ 'gemini-5h': { f: 0.1 } }, T0 + MIN);
    expect(heldReading(newer, next, T0 + MIN)).toBe(next);
    // The clock was put back: what the folder says now is the newer thing.
    expect(heldReading(newer, older, T0 - MIN)).toBe(older);
  });
});
