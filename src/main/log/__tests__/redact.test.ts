/**
 * Phase 35. Write-time redaction (research 42 §9).
 *
 * The rule is Signal's, and it is the single most copyable fact in the peer
 * table: every string passes one hook before it reaches disk, so the file on
 * disk is already safe and a later hand export cannot leak what was never
 * written. Tortie's one rule in this phase is that the home directory prefix
 * becomes `~`.
 */

import { describe, expect, it } from 'vitest';
import { redactString, redactValue } from '../redact';

const HOME = '/Users/gdc';

describe('redactString', () => {
  it('replaces the home directory prefix with ~', () => {
    expect(redactString('/Users/gdc/gmux/src/main/index.ts', HOME)).toBe(
      '~/gmux/src/main/index.ts'
    );
  });

  it('replaces every occurrence, not only the first', () => {
    expect(
      redactString('copied /Users/gdc/a to /Users/gdc/b', HOME)
    ).toBe('copied ~/a to ~/b');
  });

  it('does not need a separator after the prefix', () => {
    // An argv joined into one string, a quoted path and a bare home all
    // redact the same way.
    expect(redactString('cwd="/Users/gdc"', HOME)).toBe('cwd="~"');
    expect(redactString('/Users/gdc', HOME)).toBe('~');
  });

  it('leaves a string with no home directory in it alone', () => {
    expect(redactString('tmux 3.6a, socket gmux', HOME)).toBe(
      'tmux 3.6a, socket gmux'
    );
  });

  it('refuses to redact against an empty or root home, which would ruin every string', () => {
    expect(redactString('/Users/gdc/x', '')).toBe('/Users/gdc/x');
    expect(redactString('/Users/gdc/x', '/')).toBe('/Users/gdc/x');
  });
});

describe('redactValue', () => {
  it('walks nested objects and arrays', () => {
    expect(
      redactValue(
        {
          path: '/Users/gdc/gmux/manifest.db',
          nested: { to: ['/Users/gdc/q', 3, null] }
        },
        HOME
      )
    ).toEqual({
      path: '~/gmux/manifest.db',
      nested: { to: ['~/q', 3, null] }
    });
  });

  it('leaves non-string leaves exactly as they are', () => {
    expect(redactValue({ n: 8704, ok: false, none: null }, HOME)).toEqual({
      n: 8704,
      ok: false,
      none: null
    });
  });

  it('cuts a cycle rather than following it', () => {
    const cyclic: Record<string, unknown> = { path: '/Users/gdc/a' };
    cyclic['self'] = cyclic;
    // A log field must never be the thing that hangs the app.
    expect(redactValue(cyclic, HOME)).toEqual({
      path: '~/a',
      self: undefined
    });
  });
});
