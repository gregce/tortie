/**
 * The two shared rules Phase 181.2 adds: which window the bar may be told to
 * fill to, and what a plan word may be.
 *
 * THE PLAN WORD IS THE ONE THAT MATTERS. The card names the thing a person
 * pays for so they can tell whose quota is on screen, and the refusal that
 * makes that safe is a shape rather than a promise: an identifier cannot pass
 * this gate, so no uuid, organization id or address can reach a face even if
 * a vendor moves a plan word onto one of those fields tomorrow.
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
import { emptyUsageProvider, usagePlanWord } from '../usage';

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

  it('REFUSES an identifier, which is the whole point of the gate', () => {
    // Every one of these is invented here and none is anybody's.
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
