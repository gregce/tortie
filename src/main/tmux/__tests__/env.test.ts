/**
 * Unit tests for the UTF-8 locale guard (Phase 9.2 Bug C).
 *
 * tmux marks a client non-UTF-8 — and substitutes `_` for every non-ASCII
 * cell — when no LC_ALL/LC_CTYPE/LANG mentions UTF-8 (tmux.c scans the
 * first non-empty of the three). launchd launches carry none of them.
 *
 * Runner: vitest (`npm test`). Assertions stay on node:assert/strict —
 * they work unchanged under vitest's node environment.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  DEFAULT_UTF8_LANG,
  hasUtf8Locale,
  withUtf8Locale
} from '../env';

describe('hasUtf8Locale — mirrors tmux.c first-non-empty scan', () => {
  it('false for an empty env (the launchd GUI case)', () => {
    assert.equal(hasUtf8Locale({}), false);
  });

  it('true for LANG=en_US.UTF-8', () => {
    assert.equal(hasUtf8Locale({ LANG: 'en_US.UTF-8' }), true);
  });

  it('true for the UTF8 spelling and case-insensitive', () => {
    assert.equal(hasUtf8Locale({ LANG: 'de_DE.utf8' }), true);
  });

  it('true for LC_CTYPE=UTF-8 alone (macOS Terminal default)', () => {
    assert.equal(hasUtf8Locale({ LC_CTYPE: 'UTF-8' }), true);
  });

  it('false when the first non-empty var is non-UTF-8 (LC_ALL=C wins)', () => {
    // tmux stops at the first NON-EMPTY of LC_ALL → LC_CTYPE → LANG, so an
    // explicit LC_ALL=C makes the client non-UTF-8 even with a UTF-8 LANG.
    // (Rendering still survives via the attach client's `tmux -u`.)
    assert.equal(
      hasUtf8Locale({ LC_ALL: 'C', LANG: 'en_US.UTF-8' }),
      false
    );
  });

  it('empty strings are skipped like tmux does', () => {
    assert.equal(hasUtf8Locale({ LC_ALL: '', LANG: 'en_US.UTF-8' }), true);
  });
});

describe('withUtf8Locale', () => {
  it('injects LANG when the env has no locale at all', () => {
    const out = withUtf8Locale({ PATH: '/usr/bin' });
    assert.equal(out['LANG'], DEFAULT_UTF8_LANG);
    assert.equal(out['PATH'], '/usr/bin');
  });

  it('never overrides a locale the user actually configured', () => {
    const out = withUtf8Locale({ LANG: 'fr_FR.UTF-8' });
    assert.equal(out['LANG'], 'fr_FR.UTF-8');
  });

  it('never mutates the input env', () => {
    const env: NodeJS.ProcessEnv = { PATH: '/usr/bin' };
    withUtf8Locale(env);
    assert.equal(env['LANG'], undefined);
  });

  it('drops undefined entries so node-pty gets a clean string map', () => {
    const out = withUtf8Locale({ PATH: '/usr/bin', EMPTY: undefined });
    assert.equal('EMPTY' in out, false);
  });
});
