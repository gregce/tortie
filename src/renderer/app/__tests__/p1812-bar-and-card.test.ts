/**
 * The bar says which window it means, and the card sits where a person can
 * read it (Phase 181.2).
 *
 * The operator's screenshot of 2026-08-31 is the case this file is built on:
 * the line reads 32 percent 5h and 62 percent wk and the bar is filled to 62,
 * because the bar drew the maximum of the two windows and carried no label.
 * So the first block below drives his numbers through all three choices, and
 * the second drives the card's placement at both orientations, in the raw
 * viewport pixels the component positions in.
 *
 * No value here came off a vendor or a login. The plan words are invented.
 */

import { describe, expect, it } from 'vitest';
import type { UsageProviderSnapshot } from '@shared/usage';
import { emptyUsageProvider } from '@shared/usage';
import { barPercent, cardLines, usageCardTop } from '../UsageMeter';
import { usagePlanLine } from '../usage-copy';

const NOW = Date.UTC(2026, 7, 31, 12, 0, 0);

function snap(over: Partial<UsageProviderSnapshot> = {}): UsageProviderSnapshot {
  return { ...emptyUsageProvider('claude', 'ok'), ...over };
}

/** His screenshot: 32 percent of the five hour window, 62 percent of the week. */
const HIS = snap({
  fiveHour: { percent: 32, resetsAt: null },
  sevenDay: { percent: 62, resetsAt: null }
});

/** What Codex answered on his machine: the weekly window and no other. */
const WEEKLY_ONLY = snap({
  provider: 'codex',
  sevenDay: { percent: 62, resetsAt: null }
});

describe('the window the bar fills to', () => {
  it('is the five hour one by default, which is the number read first', () => {
    expect(barPercent(HIS, 'five-hour')).toBe(32);
  });

  it('is the weekly one when a person asks for the weekly one', () => {
    expect(barPercent(HIS, 'seven-day')).toBe(62);
  });

  it('is the fuller of the two under most used, which is what shipped', () => {
    expect(barPercent(HIS, 'most-used')).toBe(62);
  });

  it('falls back to the window the vendor DID name', () => {
    // Codex named one window on his machine, so every choice draws that one
    // rather than an empty track or a zero no vendor served.
    expect(barPercent(WEEKLY_ONLY, 'five-hour')).toBe(62);
    expect(barPercent(WEEKLY_ONLY, 'seven-day')).toBe(62);
    expect(barPercent(WEEKLY_ONLY, 'most-used')).toBe(62);
  });

  it('is absent when the vendor named no window at all', () => {
    for (const choice of ['five-hour', 'seven-day', 'most-used'] as const) {
      expect(barPercent(snap(), choice)).toBeNull();
    }
  });

  it('agrees with the number a person reads, which is the whole defect', () => {
    // The line leads with the five hour window, so the shipped choice draws
    // the same number the line leads with.
    expect(barPercent(HIS, 'five-hour')).toBe(HIS.fiveHour?.percent);
  });
});

describe('where the hover card goes', () => {
  const H = 120;
  const VIEW = 900;

  it('is centred on the meter when there is room, as it always was', () => {
    const top = usageCardTop({ top: 400, bottom: 440 }, H, VIEW);
    expect(top).toBe(360);
  });

  it('hangs UNDER the top band rather than sliding over the tabs', () => {
    // Sessions organized on top: the meter sits in the 36px band under the
    // project tabs. Centring would put the card's top at a negative number
    // and the old clamp parked it over those tabs.
    const top = usageCardTop({ top: 38, bottom: 74 }, H, VIEW);
    expect(top).toBe(80);
    expect(top).toBeGreaterThan(74);
  });

  it('sits ABOVE the meter at the foot of the dock', () => {
    const top = usageCardTop({ top: 840, bottom: 880 }, H, VIEW);
    expect(top).toBe(714);
    expect(top + H).toBeLessThan(840);
  });

  it('stays inside both window edges however short the window is', () => {
    for (const anchor of [
      { top: 38, bottom: 74 },
      { top: 400, bottom: 440 },
      { top: 840, bottom: 880 }
    ]) {
      for (const viewport of [200, 300, 640, 900, 1400]) {
        const top = usageCardTop(anchor, H, viewport);
        expect(top).toBeGreaterThanOrEqual(8);
        if (viewport >= H + 16) expect(top + H).toBeLessThanOrEqual(viewport - 8);
      }
    }
  });
});

describe('the line that says whose numbers these are', () => {
  it('names the plan in plain words', () => {
    expect(usagePlanLine('pro')).toBe('Pro plan');
    expect(usagePlanLine('max_20x')).toBe('Max 20x plan');
  });

  it('says nothing when the vendor named no plan', () => {
    expect(usagePlanLine(null)).toBe('');
    expect(usagePlanLine('')).toBe('');
  });

  it('says nothing rather than drawing an identifier', () => {
    expect(usagePlanLine('11111111-2222-3333-4444-555555555555')).toBe('');
    expect(usagePlanLine('someone@example.com')).toBe('');
  });

  it('sits under the vendor name and above the windows', () => {
    const lines = cardLines(
      snap({
        plan: 'pro',
        fiveHour: { percent: 32, resetsAt: null },
        sevenDay: { percent: 62, resetsAt: null }
      }),
      NOW
    );
    expect(lines).toEqual(['Claude', 'Pro plan', '32% 5h', '62% wk']);
  });

  it('is left out whole when the provider named no plan', () => {
    const lines = cardLines(
      snap({ fiveHour: { percent: 32, resetsAt: null } }),
      NOW
    );
    expect(lines).toEqual(['Claude', '32% 5h']);
  });

  it('is still drawn when a provider has no numbers to show', () => {
    const lines = cardLines(
      { ...emptyUsageProvider('codex', 'no-windows'), plan: 'plus' },
      NOW
    );
    expect(lines).toEqual([
      'Codex',
      'Plus plan',
      'Codex reported no plan window.'
    ]);
  });
});
