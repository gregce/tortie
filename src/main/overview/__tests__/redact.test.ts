/**
 * The redaction pass, section 8 of the spec. One fixture string carries
 * every secret shape research 63 found in the operator's kept slices. Every
 * one must come out masked, and a home path must survive because the git
 * mark needs it.
 */

import { describe, expect, it } from 'vitest';
import { REDACTION_PATTERN_NAMES, redactText, SECRET_PATTERNS, TORTIE_PATTERNS } from '../redact';

/** Every shape the research measured, with the value the mask must remove. */
const SHAPES: Array<{ name: string; raw: string; value: string }> = [
  { name: 'aws-key', raw: 'the key is AKIAIOSFODNN7EXAMPLE ok', value: 'AKIAIOSFODNN7EXAMPLE' },
  {
    name: 'github-token',
    raw: 'push with ghp_16C7e42F292c6912E7710c838347Ae178B4a',
    value: 'ghp_16C7e42F292c6912E7710c838347Ae178B4a'
  },
  {
    name: 'slack-token',
    raw: `slack says ${['xoxb', '1234567890', 'abcdefghij'].join('-')} works`,
    value: ['xoxb', '1234567890', 'abcdefghij'].join('-')
  },
  {
    name: 'api-key',
    raw: 'anthropic gave me sk-ant-api03-AAAABBBBCCCCDDDDEEEEFFFF to test',
    value: 'sk-ant-api03-AAAABBBBCCCCDDDDEEEEFFFF'
  },
  {
    name: 'google-key',
    raw: 'maps needs AIzaSyA1234567890abcdefghijklmnopqrstuv',
    value: 'AIzaSyA1234567890abcdefghijklmnopqrstuv'
  },
  {
    name: 'jwt',
    raw: 'the session cookie is eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJ',
    value: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJ'
  },
  {
    name: 'private-key',
    raw: '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\n-----END RSA PRIVATE KEY-----',
    value: 'MIIEowIBAAKCAQEA'
  },
  {
    name: 'bearer',
    raw: 'Authorization: Bearer abcDEF123456789012345678',
    value: 'abcDEF123456789012345678'
  },
  {
    name: 'assignment',
    raw: 'set api_key=hunter2hunter2 in the env',
    value: 'hunter2hunter2'
  },
  {
    name: 'stripe-key',
    // Joined at runtime so the committed bytes hold no key shaped literal,
    // which the push protection on the repository refuses.
    raw: `charge with ${['sk', 'live', '4eC39HqLyjWDarjtT1zdp7dc'].join('_')} or ${['sk', 'test', '4eC39HqLyjWDarjtT1zdp7dc'].join('_')}`,
    value: ['sk', 'live', '4eC39HqLyjWDarjtT1zdp7dc'].join('_')
  },
  { name: 'email', raw: 'mail greg@example.com about it', value: 'greg@example.com' }
];

describe('redactText', () => {
  it('masks every shape the research found, on one combined text', () => {
    const combined = SHAPES.map((s) => s.raw).join('\n');
    const out = redactText(combined);
    for (const s of SHAPES) {
      expect(out).not.toContain(s.value);
      expect(out).toContain(`[REDACTED:${s.name}]`);
    }
  });

  it('masks each shape on its own', () => {
    for (const s of SHAPES) {
      const out = redactText(s.raw);
      expect(out, s.name).not.toContain(s.value);
      expect(out, s.name).toContain('[REDACTED:');
    }
  });

  it('keeps the structure around a kept group, the word Bearer survives', () => {
    const out = redactText('Authorization: Bearer abcDEF123456789012345678');
    expect(out).toContain('Bearer ');
    expect(out).toContain('[REDACTED:bearer]');
  });

  it('a home path is not a secret and survives, the git mark needs it', () => {
    const text = 'the fix is in /Users/example/demo-app/src/index.ts and nothing else';
    expect(redactText(text)).toBe(text);
  });

  it('a bare git sha survives, evidence is not a secret', () => {
    const text = 'committed as 9f21c0e4d1b2a3c4e5f60718293a4b5c6d7e8f90';
    expect(redactText(text)).toBe(text);
  });

  it('returns the input unchanged when nothing matched', () => {
    const text = 'add a --dry-run flag to the sync script';
    expect(redactText(text)).toBe(text);
  });

  it('runs the vendored array first and the Tortie rules second, eleven names', () => {
    expect(REDACTION_PATTERN_NAMES).toEqual([
      ...SECRET_PATTERNS.map((p) => p.name),
      ...TORTIE_PATTERNS.map((p) => p.name)
    ]);
    expect(REDACTION_PATTERN_NAMES.length).toBe(11);
    expect(REDACTION_PATTERN_NAMES[0]).toBe('aws-key');
    expect(REDACTION_PATTERN_NAMES[9]).toBe('stripe-key');
    expect(REDACTION_PATTERN_NAMES[10]).toBe('email');
  });
});
