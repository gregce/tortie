/**
 * Unit tests for the display-name → tmux-name sanitizer.
 *
 * Runner: vitest (`npm test`). Assertions stay on node:assert/strict —
 * they work unchanged under vitest's node environment.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  dedupeSessionName,
  formatSessionTarget,
  FALLBACK_TMUX_NAME,
  MAX_TMUX_NAME_LENGTH,
  sanitizeSessionName
} from '../names';

describe('sanitizeSessionName', () => {
  it('passes plain names through untouched', () => {
    assert.equal(sanitizeSessionName('auth-refactor'), 'auth-refactor');
    assert.equal(sanitizeSessionName('webapp_2'), 'webapp_2');
  });

  it('rewrites . : / to - (tmux 3.7+ accepts them verbatim; -t breaks)', () => {
    assert.equal(sanitizeSessionName('webapp/auth.refactor'), 'webapp-auth-refactor');
    assert.equal(sanitizeSessionName('a:b'), 'a-b');
    assert.equal(sanitizeSessionName('v1.2.3'), 'v1-2-3');
  });

  it('replaces each ambiguous character individually (no collapsing)', () => {
    assert.equal(sanitizeSessionName('a.:b'), 'a--b');
    assert.equal(sanitizeSessionName('a//b'), 'a--b');
  });

  it('keeps spaces (targets use $-ids), collapsing runs and trimming', () => {
    assert.equal(sanitizeSessionName('  my   cool session  '), 'my cool session');
  });

  it('folds tabs and newlines into single spaces', () => {
    assert.equal(sanitizeSessionName('a\t\nb'), 'a b');
  });

  it('strips C0 controls, DEL and C1 controls', () => {
    const bell = String.fromCharCode(7);
    const esc = String.fromCharCode(27);
    const del = String.fromCharCode(127);
    const c1 = String.fromCharCode(0x85);
    assert.equal(sanitizeSessionName(`a${bell}${esc}b${del}${c1}c`), 'abc');
  });

  it('falls back when nothing survives', () => {
    assert.equal(sanitizeSessionName(''), FALLBACK_TMUX_NAME);
    assert.equal(sanitizeSessionName('   '), FALLBACK_TMUX_NAME);
    assert.equal(sanitizeSessionName(String.fromCharCode(7, 27)), FALLBACK_TMUX_NAME);
  });

  it('caps absurd lengths', () => {
    const long = 'a'.repeat(MAX_TMUX_NAME_LENGTH * 2);
    assert.equal(sanitizeSessionName(long).length, MAX_TMUX_NAME_LENGTH);
  });

  it('keeps unicode display names intact', () => {
    assert.equal(sanitizeSessionName('déploiement été'), 'déploiement été');
    assert.equal(sanitizeSessionName('日本語セッション'), '日本語セッション');
  });
});

describe('dedupeSessionName', () => {
  it('returns the name unchanged when free', () => {
    assert.equal(dedupeSessionName('a-b', new Set(['x'])), 'a-b');
  });

  it('suffixes -2 on first collision (a.b vs a:b both sanitize to a-b)', () => {
    assert.equal(dedupeSessionName('a-b', new Set(['a-b'])), 'a-b-2');
  });

  it('walks to the next free suffix', () => {
    const taken = new Set(['a-b', 'a-b-2', 'a-b-3']);
    assert.equal(dedupeSessionName('a-b', taken), 'a-b-4');
  });
});

describe('formatSessionTarget', () => {
  it('passes immutable $-ids through', () => {
    assert.equal(formatSessionTarget('$12'), '$12');
  });

  it('prefixes names with = for exact-match targeting', () => {
    assert.equal(formatSessionTarget('auth-refactor'), '=auth-refactor');
  });
});
