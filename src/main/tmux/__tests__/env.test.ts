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
  MACOS_LOGIN_SESSION_VAR,
  hasUtf8Locale,
  loginSessionEnv,
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

/**
 * The macOS login session number (Phase 133).
 *
 * A pane takes `SECURITYSESSIONID` from the tmux server, and that server is
 * durable, so before this the pane joined whichever login session was live when
 * the server first started. An explicit `-e` pair on the `new-session` line
 * wins, which is what this composes. Tortie never invents a value and never
 * parses one.
 */
describe('loginSessionEnv', () => {
  it('returns the one pair when this process is in a login session', () => {
    assert.deepEqual(loginSessionEnv({ SECURITYSESSIONID: '186ad' }), {
      SECURITYSESSIONID: '186ad'
    });
  });

  it('returns nothing when there is no number, so the line is unchanged', () => {
    assert.deepEqual(loginSessionEnv({}), {});
    assert.deepEqual(loginSessionEnv({ PATH: '/usr/bin' }), {});
  });

  it('treats an empty string as no number', () => {
    assert.deepEqual(loginSessionEnv({ SECURITYSESSIONID: '' }), {});
  });

  it('passes the value through unchanged, including a non-hex string', () => {
    // Tortie does not parse this and does not check its shape. Whatever macOS
    // put in this process's environment is what the pane is told.
    const out = loginSessionEnv({ SECURITYSESSIONID: 'not-hex-at-all' });
    assert.equal(out[MACOS_LOGIN_SESSION_VAR], 'not-hex-at-all');
  });

  it('never mutates the input env', () => {
    const env: NodeJS.ProcessEnv = { SECURITYSESSIONID: '186ad' };
    const out = loginSessionEnv(env);
    out[MACOS_LOGIN_SESSION_VAR] = 'rewritten';
    assert.equal(env['SECURITYSESSIONID'], '186ad');
    assert.equal(Object.keys(env).length, 1);
  });

  it('carries exactly one name, so nothing else rides along', () => {
    const out = loginSessionEnv({
      SECURITYSESSIONID: '186ad',
      ANTHROPIC_API_KEY: 'sk-not-a-real-key'
    });
    assert.deepEqual(Object.keys(out), [MACOS_LOGIN_SESSION_VAR]);
  });
});
