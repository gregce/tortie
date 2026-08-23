/**
 * The two clock formatters (Phase 137). They are the only sources of digits
 * on the page beside formatAge, so their shapes are pinned here.
 */

import { describe, expect, it } from 'vitest';
import { formatReadClock, formatTurnClock } from '../clock';

// Local-time constructions, so the assertions hold in every zone.
const NOW = new Date(2026, 7, 22, 15, 0).getTime();

describe('formatTurnClock', () => {
  it('is null for a missing clock, which is how deepseek draws no clock', () => {
    expect(formatTurnClock(null, NOW)).toBeNull();
  });

  it('is null for an unreadable clock', () => {
    expect(formatTurnClock('not a date', NOW)).toBeNull();
  });

  it('shows the time alone for a turn from today', () => {
    const at = new Date(2026, 7, 22, 13, 31).getTime();
    expect(formatTurnClock(at, NOW)).toBe('13:31');
  });

  it('adds the date for an older turn', () => {
    const at = new Date(2026, 7, 19, 9, 5).getTime();
    expect(formatTurnClock(at, NOW)).toBe('Aug 19, 09:05');
  });

  it('reads an ISO string the way the wire carries one', () => {
    const at = new Date(2026, 7, 22, 8, 7);
    expect(formatTurnClock(at.toISOString(), NOW)).toBe('08:07');
  });
});

describe('formatReadClock', () => {
  it('pads both fields', () => {
    expect(formatReadClock(new Date(2026, 7, 22, 9, 5).getTime())).toBe(
      '09:05'
    );
  });

  it('keeps the twenty four hour form the mock shows', () => {
    expect(formatReadClock(new Date(2026, 7, 22, 13, 31).getTime())).toBe(
      '13:31'
    );
  });
});
