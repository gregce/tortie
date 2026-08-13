/**
 * The secrets rule. A plaintext bearer token was found in the operator's own
 * `~/.cursor/mcp.json` and plaintext provider keys in two other agents'
 * settings. That is the norm rather than the outlier, so these cases pin the
 * rule rather than a sample of key names.
 */

import { describe, expect, it } from 'vitest';
import {
  hiddenValuesSentence,
  isSecretKey,
  MASK,
  maskEnv,
  maskFragment,
  maskInlineAssignment
} from '../secrets';

describe('isSecretKey', () => {
  it('matches the five names, singular and plural, upper and lower', () => {
    for (const key of [
      'API_KEY',
      'apiKey',
      'GITHUB_TOKEN',
      'tokens',
      'CLIENT_SECRET',
      'secrets',
      'PASSWORD',
      'AWS_CREDENTIALS'
    ]) {
      expect(isSecretKey(key)).toBe(true);
    }
  });

  it('leaves ordinary names alone', () => {
    for (const key of [
      'PATH',
      'HOME',
      'SKILLS_API_URL',
      'DO_NOT_TRACK',
      'keyboard'
    ]) {
      expect(isSecretKey(key)).toBe(false);
    }
  });
});

describe('maskEnv', () => {
  it('hides every value regardless of the key name, because guessing is how one gets through', () => {
    const pairs = maskEnv(['SUPABASE_ACCESS_TOKEN', 'PROJECT_REF', 'DEBUG']);
    expect(pairs.every((p) => p.masked)).toBe(true);
    expect(pairs.every((p) => p.value === MASK)).toBe(true);
  });

  it('returns key names only, sorted', () => {
    expect(maskEnv(['Z_VAR', 'A_VAR']).map((p) => p.key)).toEqual([
      'A_VAR',
      'Z_VAR'
    ]);
  });
});

describe('maskFragment', () => {
  it('hides a credential-shaped key anywhere in a rendered fragment', () => {
    const out = maskFragment([
      ['command', 'npx'],
      ['GITHUB_TOKEN', 'ghp_real']
    ]);
    expect(out[0]?.value).toBe('npx');
    expect(out[1]?.value).toBe(MASK);
    expect(out.some((p) => p.value.includes('ghp_real'))).toBe(false);
  });
});

describe('the sentence under a masked block', () => {
  it('names the count and points at the file', () => {
    expect(hiddenValuesSentence(1)).toBe(
      '1 environment value is hidden. Open the file to see it.'
    );
    expect(hiddenValuesSentence(3)).toBe(
      '3 environment values are hidden. Open the file to see them.'
    );
    expect(hiddenValuesSentence(0)).toBe('');
  });
});

describe('maskInlineAssignment', () => {
  it('hides the value half of an inline credential assignment', () => {
    expect(maskInlineAssignment('--token=abc123')).toBe(`--token=${MASK}`);
    expect(maskInlineAssignment('GH_TOKEN=abc123')).toBe(`GH_TOKEN=${MASK}`);
  });

  it('leaves an ordinary assignment alone', () => {
    expect(maskInlineAssignment('SKILLS_API_URL=https://example.com')).toBe(
      'SKILLS_API_URL=https://example.com'
    );
    expect(maskInlineAssignment('owner/repo')).toBe('owner/repo');
  });
});
