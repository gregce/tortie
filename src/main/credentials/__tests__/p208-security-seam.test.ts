/**
 * Phase 208. The keychain file seam on the real runner, without running it.
 *
 * The runner itself is exercised by build/probe-p208-vault.mjs over a scratch
 * keychain; here only the path rule is driven, so no process is spawned.
 */

import { describe, expect, it } from 'vitest';
import { defaultSecurityRunner, isPlainKeychainPath } from '../security';

describe('Phase 208: the keychain file a runner will name', () => {
  it('an absolute plain path passes', () => {
    expect(isPlainKeychainPath('/private/tmp/gmux-p208-1/scratch.keychain-db')).toBe(true);
    expect(isPlainKeychainPath('/a b/c.keychain-db')).toBe(true);
  });
  it('a relative path, an empty one, or one carrying a quote, a backslash or a line break is refused', () => {
    for (const bad of ['', 'scratch.keychain-db', './x', '/a"b', '/a\\b', '/a\nb', '/a\rb']) {
      expect(isPlainKeychainPath(bad)).toBe(false);
    }
  });
  it('the runner throws on a path it will not name, rather than running without it', () => {
    expect(() => defaultSecurityRunner('relative.keychain-db')).toThrow();
    expect(() => defaultSecurityRunner('/a"b')).toThrow();
  });
  it('the runner with no path and with a plain path both build', () => {
    expect(typeof defaultSecurityRunner().run).toBe('function');
    expect(typeof defaultSecurityRunner('/private/tmp/x.keychain-db').run).toBe('function');
  });
});
