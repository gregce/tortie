/**
 * What the meter draws, at the level a node test can reach (Phase 181).
 *
 * The three densities are one component and the strings they draw come from
 * two pure functions, so those are what this file pins: the text form the
 * operator asked for, the hover lines, and the rule that decides which window
 * the single bar draws.
 */

import { describe, expect, it } from 'vitest';
import type { UsageProviderSnapshot } from '@shared/usage';
import { emptyUsageProvider } from '@shared/usage';
import { cardLines, usageLine } from '../UsageMeter';
import { usageResetIn, usageSeverity } from '../usage-copy';

const NOW = Date.UTC(2026, 7, 31, 12, 0, 0);

function snap(over: Partial<UsageProviderSnapshot> = {}): UsageProviderSnapshot {
  return { ...emptyUsageProvider('claude', 'ok'), ...over };
}

describe('the line the meter draws', () => {
  it('is the form the operator asked for', () => {
    const line = usageLine(
      snap({
        fiveHour: { percent: 58, resetsAt: null },
        sevenDay: { percent: 41, resetsAt: null }
      })
    );
    expect(line).toBe('58% 5h · 41% wk');
  });

  it('drops a window the vendor did not name, rather than showing a zero', () => {
    expect(usageLine(snap({ sevenDay: { percent: 2, resetsAt: null } }))).toBe(
      '2% wk'
    );
    expect(usageLine(snap())).toBe('');
  });

  it('rounds once and never shows a decimal', () => {
    expect(usageLine(snap({ fiveHour: { percent: 56.4, resetsAt: null } }))).toBe(
      '56% 5h'
    );
  });
});

describe('the hover lines', () => {
  it('name both windows and their countdowns', () => {
    const lines = cardLines(
      snap({
        fiveHour: { percent: 2, resetsAt: NOW + 3 * 3_600_000 },
        sevenDay: { percent: 56, resetsAt: NOW + 4 * 86_400_000 }
      }),
      NOW
    );
    expect(lines[0]).toBe('Claude');
    expect(lines[1]).toBe('2% 5h, Resets in 3h 0m');
    expect(lines[2]).toBe('56% wk, Resets in 4d 0h');
  });

  it('say nothing about a reset the vendor left null', () => {
    const lines = cardLines(snap({ fiveHour: { percent: 0, resetsAt: null } }), NOW);
    expect(lines[1]).toBe('0% 5h');
  });

  it('name the per model window when the vendor gives one', () => {
    const lines = cardLines(
      snap({ scoped: { label: 'Fable', percent: 100, resetsAt: null } }),
      NOW
    );
    expect(lines).toContain('Fable 100% wk');
  });

  it('say run the agent when the login was refused, and never sign in', () => {
    const lines = cardLines(snap({ state: 'expired' }), NOW);
    expect(lines).toContain('Run Claude Code to refresh the login.');
    expect(lines.join(' ')).not.toContain('Sign in');
  });

  it('say sign in ONLY when there is no login at all', () => {
    expect(cardLines(snap({ state: 'signed-out' }), NOW)).toContain(
      'Sign in with Claude Code to see usage.'
    );
    expect(cardLines(snap({ state: 'unavailable' }), NOW).join(' ')).not.toContain(
      'Sign in'
    );
  });

  it('mark a stale reading rather than replacing the numbers', () => {
    const lines = cardLines(
      snap({ state: 'stale', fiveHour: { percent: 9, resetsAt: null } }),
      NOW
    );
    expect(lines).toContain('9% 5h');
    expect(lines).toContain('Last read failed');
  });
});

describe('the bar', () => {
  it('steps where research 72 records the steps', () => {
    expect(usageSeverity(0)).toBe('normal');
    expect(usageSeverity(59.9)).toBe('normal');
    expect(usageSeverity(60)).toBe('warm');
    expect(usageSeverity(79.9)).toBe('warm');
    expect(usageSeverity(80)).toBe('hot');
    expect(usageSeverity(100)).toBe('hot');
  });
});

describe('the countdown', () => {
  it('never counts backwards past a reset that has already happened', () => {
    expect(usageResetIn(NOW - 10_000, NOW)).toBe('Resets now');
  });

  it('reads in minutes, hours then days', () => {
    expect(usageResetIn(NOW + 5 * 60_000, NOW)).toBe('Resets in 5m');
    expect(usageResetIn(NOW + 90 * 60_000, NOW)).toBe('Resets in 1h 30m');
    expect(usageResetIn(NOW + 50 * 3_600_000, NOW)).toBe('Resets in 2d 2h');
  });
});
