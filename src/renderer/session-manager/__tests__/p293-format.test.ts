/**
 * Phase 293. The sheet's four formats, and the one cell that must not use them.
 *
 * What these tests hold:
 *  - an age is two units and never `now`, and a clock set back reads `0s`;
 *  - a day is the LOCAL calendar day, so `Yesterday` is the day before today
 *    and not 24 hours ago, across a year boundary included;
 *  - another year carries its year, in both date formats;
 *  - `exactTime` carries no zone suffix;
 *  - A `createdAt` THAT IS NOT ABOVE 0 DRAWS A DASH, with no small and no
 *    title. A feed-only row on another machine reads 0 when the far side's
 *    field is unreadable, and `Dec 31, 1969` beside `20,000d old` is a lie.
 *
 * Every date is built from local parts (`new Date(y, m, d, h)`), so the file
 * reads the same in any zone a runner is in.
 */

import { describe, expect, it } from 'vitest';
import { ageTwoUnits, dayLabel, exactTime, removedDate } from '../format';
import { createdCell, DASH } from '../copy';

const at = (
  y: number,
  m: number,
  d: number,
  h = 12,
  min = 0,
  s = 0
): number => new Date(y, m - 1, d, h, min, s).getTime();

describe('ageTwoUnits (Phase 293)', () => {
  const now = at(2026, 9, 18, 15, 56, 0);

  it('draws seconds under a minute, and never the word now', () => {
    expect(ageTwoUnits(now - 48_000, now)).toBe('48s');
    expect(ageTwoUnits(now, now)).toBe('0s');
    expect(ageTwoUnits(now - 59_999, now)).toBe('59s');
  });

  it('draws minutes under an hour', () => {
    expect(ageTwoUnits(now - 60_000, now)).toBe('1m');
    expect(ageTwoUnits(now - 5 * 60_000 - 20_000, now)).toBe('5m');
    expect(ageTwoUnits(now - 59 * 60_000, now)).toBe('59m');
  });

  it('draws hours and minutes under a day', () => {
    expect(ageTwoUnits(now - (5 * 60 + 14) * 60_000, now)).toBe('5h 14m');
    expect(ageTwoUnits(now - 60 * 60_000, now)).toBe('1h 0m');
    expect(ageTwoUnits(now - (23 * 60 + 59) * 60_000, now)).toBe('23h 59m');
  });

  it('draws days and hours from then on', () => {
    expect(ageTwoUnits(now - (2 * 24 + 1) * 3_600_000, now)).toBe('2d 1h');
    expect(ageTwoUnits(now - 24 * 3_600_000, now)).toBe('1d 0h');
    expect(ageTwoUnits(now - 400 * 24 * 3_600_000, now)).toBe('400d 0h');
  });

  it('reads 0s for a time in the future, never a negative age', () => {
    expect(ageTwoUnits(now + 90_000, now)).toBe('0s');
  });
});

describe('dayLabel (Phase 293)', () => {
  it('says Today for the same local day, however many hours apart', () => {
    expect(dayLabel(at(2026, 9, 18, 0, 10), at(2026, 9, 18, 23, 50))).toBe(
      'Today'
    );
  });

  it('says Yesterday for the day before, by the calendar and not by 24 hours', () => {
    // Two hours ago, and already yesterday.
    expect(dayLabel(at(2026, 9, 17, 23, 0), at(2026, 9, 18, 1, 0))).toBe(
      'Yesterday'
    );
    // Forty six hours ago, and still yesterday.
    expect(dayLabel(at(2026, 9, 17, 0, 30), at(2026, 9, 18, 23, 0))).toBe(
      'Yesterday'
    );
  });

  it('names the month and the day inside this year', () => {
    expect(dayLabel(at(2026, 9, 16), at(2026, 9, 18))).toBe('Sep 16');
    expect(dayLabel(at(2026, 1, 2), at(2026, 9, 18))).toBe('Jan 2');
  });

  it('crosses a year boundary: Yesterday first, and the year after that', () => {
    const newYear = at(2026, 1, 1, 10);
    expect(dayLabel(at(2025, 12, 31, 23), newYear)).toBe('Yesterday');
    expect(dayLabel(at(2025, 12, 30, 23), newYear)).toBe('Dec 30, 2025');
    expect(dayLabel(at(2025, 9, 16), at(2026, 9, 18))).toBe('Sep 16, 2025');
  });

  it('does not call the day after today Yesterday', () => {
    expect(dayLabel(at(2026, 9, 19), at(2026, 9, 18))).toBe('Sep 19');
  });
});

describe('exactTime and removedDate (Phase 293)', () => {
  it('is the locale form to the second, with no zone suffix', () => {
    const ms = at(2026, 9, 18, 15, 56, 7);
    const expected = new Date(ms).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
    expect(exactTime(ms)).toBe(expected);
    expect(exactTime(ms)).toContain('2026');
    expect(exactTime(ms)).not.toMatch(/\bET\b/);
  });

  it('names the removal day, with the year only when it is another year', () => {
    const now = at(2026, 9, 18);
    expect(removedDate(at(2026, 8, 12), now)).toBe('Aug 12');
    expect(removedDate(at(2025, 8, 12), now)).toBe('Aug 12, 2025');
    // The leading word moved into the slot's own sentence.
    expect(removedDate(at(2026, 8, 12), now)).not.toMatch(/removed/i);
  });
});

describe('the Created cell (Phase 293, SPEC 2.5)', () => {
  const now = at(2026, 9, 18, 15, 56);

  it('draws the day, the age and the exact time for a real createdAt', () => {
    const created = at(2026, 9, 16, 9, 30);
    const cell = createdCell(created, now);
    expect(cell.main).toBe('Sep 16');
    expect(cell.small).toBe('2d 6h old');
    expect(cell.title).toBe(exactTime(created));
    expect(cell.busy).toBe(false);
  });

  it('draws a dash with NO small and NO title when createdAt is 0', () => {
    expect(createdCell(0, now)).toEqual({
      main: DASH,
      small: null,
      title: null,
      busy: false
    });
  });

  it('draws the same dash for a negative or a not-a-number createdAt', () => {
    expect(createdCell(-1, now).main).toBe(DASH);
    expect(createdCell(Number.NaN, now).main).toBe(DASH);
    expect(createdCell(-1, now).small).toBeNull();
  });

  it('never prints 1969 or 1970 for an unreadable createdAt', () => {
    const drawn = JSON.stringify(createdCell(0, now));
    expect(drawn).not.toMatch(/19(69|70)/);
  });
});
