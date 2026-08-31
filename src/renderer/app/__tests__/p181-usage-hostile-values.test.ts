/**
 * The renderer is the only place a served number becomes words, and it must
 * not repeat a number it cannot draw (Phase 181 fix round).
 *
 * Main clamps every percentage and drops a reset beyond the horizon, proved
 * over 31 hostile bodies on 2026-08-31, so nothing here is reachable from the
 * wire today. It is defense in depth, and it is worth its lines because the
 * verification of that day served hostile snapshots through the real channel
 * and watched this file draw `NaN% 5h`, `Infinity% 5h`, `500% 5h` and
 * `-40% 5h`, and watched a bar keep its previous width when the width it was
 * given was not a length at all.
 *
 * The rule: a number this file cannot draw honestly draws NOTHING.
 */

import { describe, expect, it } from 'vitest';
import type { UsageProviderSnapshot } from '@shared/usage';
import { emptyUsageProvider } from '@shared/usage';
import { barPercent, cardLines, usageLine } from '../UsageMeter';
import { usagePercentText, usageResetIn } from '../usage-copy';

const NOW = Date.UTC(2026, 7, 31, 12, 0, 0);

function snap(over: Partial<UsageProviderSnapshot> = {}): UsageProviderSnapshot {
  return { ...emptyUsageProvider('claude', 'ok'), ...over };
}

describe('a percentage the meter cannot draw', () => {
  it('draws nothing rather than the word NaN', () => {
    expect(usagePercentText(Number.NaN, '5h')).toBe('');
    expect(usagePercentText(Number.POSITIVE_INFINITY, '5h')).toBe('');
  });

  it('is clamped to its track rather than repeated', () => {
    expect(usagePercentText(500, '5h')).toBe('100% 5h');
    expect(usagePercentText(-40, '5h')).toBe('0% 5h');
  });

  it('leaves the window it came from out of the line', () => {
    const line = usageLine(
      snap({
        fiveHour: { percent: Number.NaN, resetsAt: null },
        sevenDay: { percent: 30, resetsAt: null }
      })
    );
    expect(line).toBe('30% wk');
  });

  it('is left out of the hover lines too', () => {
    const lines = cardLines(
      snap({
        fiveHour: { percent: Number.POSITIVE_INFINITY, resetsAt: null },
        scoped: { label: 'Fable', percent: Number.NaN, resetsAt: null }
      }),
      NOW
    );
    expect(lines.join(' ')).not.toMatch(/NaN|Infinity/);
  });
});

describe('the bar width', () => {
  it('is always a length between zero and a hundred', () => {
    expect(
      barPercent(snap({ fiveHour: { percent: 500, resetsAt: null } }), 'five-hour')
    ).toBe(100);
    expect(
      barPercent(snap({ fiveHour: { percent: -40, resetsAt: null } }), 'most-used')
    ).toBe(0);
  });

  it('is absent when no window carried a number it could draw', () => {
    expect(
      barPercent(
        snap({ fiveHour: { percent: Number.NaN, resetsAt: null } }),
        'five-hour'
      )
    ).toBeNull();
  });
});

describe('a reset time the meter cannot draw', () => {
  it('says nothing rather than counting to a date nobody will see', () => {
    expect(usageResetIn(1e15, NOW)).toBe('');
    expect(usageResetIn(Number.POSITIVE_INFINITY, NOW)).toBe('');
    expect(usageResetIn(Number.NaN, NOW)).toBe('');
  });

  it('still draws the seven day window it exists for', () => {
    expect(usageResetIn(NOW + 6 * 86_400_000, NOW)).toBe('Resets in 6d 0h');
  });

  it('leaves the clause out of the hover line rather than trailing a comma', () => {
    const lines = cardLines(
      snap({ fiveHour: { percent: 7, resetsAt: 1e15 } }),
      NOW
    );
    expect(lines[1]).toBe('7% 5h');
  });
});
