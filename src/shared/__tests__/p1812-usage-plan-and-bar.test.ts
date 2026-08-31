/**
 * The two shared rules Phase 181.2 adds: which window the bar may be told to
 * fill to, and what a plan word may be.
 *
 * THE PLAN WORD IS THE ONE THAT MATTERS. The card names the thing a person
 * pays for so they can tell whose quota is on screen, and the gate that makes
 * that safe is narrow on purpose. So BOTH sides of it are pinned below: what
 * it refuses, being a long value and an address, and what it lets through,
 * being any short word of that shape INCLUDING an identifier shaped one. The
 * second set is the one that matters, because a reader who saw only the first
 * would conclude the gate can be handed a field that holds an identifier, and
 * it cannot. What keeps one off the card is that main reads two plan fields
 * and no others, which `src/main/usage/__tests__/p1812-plan.test.ts` pins.
 *
 * Every value below is invented for this file. Nothing here is read from a
 * keychain, a credentials file or a vendor.
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_USAGE_BAR_WINDOW,
  USAGE_BAR_WINDOWS,
  noUsageChosen,
  sanitizeUsageBarWindow,
  sanitizeUsageSettings
} from '../settings';
import { USAGE_PLAN_MAX, emptyUsageProvider, usagePlanWord } from '../usage';

describe('the bar window a settings file may name', () => {
  it('ships as the five hour window, which is the number read first', () => {
    expect(DEFAULT_USAGE_BAR_WINDOW).toBe('five-hour');
    expect(noUsageChosen().bar).toBe('five-hour');
  });

  it('offers exactly three choices', () => {
    expect([...USAGE_BAR_WINDOWS]).toEqual([
      'five-hour',
      'seven-day',
      'most-used'
    ]);
  });

  it('keeps each of the three', () => {
    for (const choice of USAGE_BAR_WINDOWS) {
      expect(sanitizeUsageBarWindow(choice)).toBe(choice);
      expect(sanitizeUsageSettings({ bar: choice }).bar).toBe(choice);
    }
  });

  it('reads anything else as the shipped answer rather than crashing', () => {
    for (const bad of [null, undefined, 7, {}, [], 'hourly', 'FIVE-HOUR']) {
      expect(sanitizeUsageBarWindow(bad)).toBe('five-hour');
    }
  });

  it('reads a settings file written before this phase as the shipped answer', () => {
    expect(sanitizeUsageSettings({ claude: true, codex: true })).toEqual({
      claude: true,
      codex: true,
      bar: 'five-hour'
    });
  });

  it('leaves the switches alone when only the bar is wrong', () => {
    expect(sanitizeUsageSettings({ claude: true, codex: false, bar: 9 })).toEqual({
      claude: true,
      codex: false,
      bar: 'five-hour'
    });
  });
});

describe('the plan word', () => {
  it('lets a plain plan word through as the vendor wrote it', () => {
    for (const word of ['pro', 'max', 'plus', 'team', 'enterprise', 'Max 20x']) {
      expect(usagePlanWord(word)).toBe(word);
    }
  });

  it('trims the spaces around one', () => {
    expect(usagePlanWord('  pro  ')).toBe('pro');
  });

  it('refuses the long identifiers and the address, which is the half that works', () => {
    // Every one of these is invented here and none is anybody's. Each is over
    // the cap or holds an `@`, which is what refuses it. Nothing here is
    // evidence that a SHORT one is refused; the case below says it is not.
    const identifiers = [
      '11111111-2222-3333-4444-555555555555',
      'org-11111111-2222-3333-4444-555555555555',
      'user_01ABCDEFGHIJKLMNOPQRSTUVWX',
      'someone@example.com',
      'sk-EXAMPLE-NOT-A-REAL-KEY-000000000000',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIn0.QQ'
    ];
    for (const value of identifiers) {
      expect(usagePlanWord(value), `${value} must not be drawable`).toBeNull();
    }
  });

  it('LETS A SHORT IDENTIFIER SHAPED VALUE THROUGH, so what it is handed is the guard', () => {
    // Not a defect and not a wish. This is the measurement the comment on
    // `usagePlanWord` rests on, and it is pinned so a later round reads it
    // instead of the claim two earlier comments made. Each value is invented
    // here, each is under the cap, and each comes back drawable. No cap can
    // fix that, because `pro` and a short id are the same shape. The guard is
    // that main calls the gate on `subscriptionType` and `plan_type` only.
    for (const short of ['org-01HZY8Q7C3K9', 'Firstname Lastname', 'sk-EXAMPLE-abcd12']) {
      expect(short.length).toBeLessThanOrEqual(USAGE_PLAN_MAX);
      expect(usagePlanWord(short), `${short} passes the shape and the cap`).toBe(short);
    }
  });

  it('refuses anything that is not a word at all', () => {
    for (const bad of [null, undefined, 7, {}, [], '', '   ', '20', '/etc/passwd']) {
      expect(usagePlanWord(bad)).toBeNull();
    }
  });

  it('is null on a provider that has read nothing', () => {
    expect(emptyUsageProvider('claude').plan).toBeNull();
    expect(emptyUsageProvider('codex', 'signed-out').plan).toBeNull();
  });
});
