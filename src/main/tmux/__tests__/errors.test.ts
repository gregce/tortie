/**
 * Unit tests for classifyTmuxFailure (src/main/tmux/errors.ts).
 *
 * Phase 41 added two patterns and put them ahead of the three that were there,
 * so the order is now load bearing. These tests cover all five, and the one
 * string that is deliberately NOT matched.
 *
 * Runner: vitest (`npm test`). Assertions on node:assert/strict.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import { classifyTmuxFailure } from '../errors';

describe('the version patterns Phase 41 added', () => {
  it('classifies a protocol version mismatch', () => {
    const err = classifyTmuxFailure(
      'protocol version mismatch (client 8, server 7)\n',
      'fallback'
    );
    assert.equal(err.payload.code, 'TMUX_VERSION_MISMATCH');
    assert.equal(
      err.payload.message,
      'The session server is running a different version of tmux than ' +
        'Tortie, and the two cannot talk to each other.'
    );
    assert.match(err.payload.detail ?? '', /client 8, server 7/);
  });

  it('classifies a server that is too old for the client', () => {
    const err = classifyTmuxFailure(
      'server version is too old for client\n',
      'fallback'
    );
    assert.equal(err.payload.code, 'TMUX_VERSION_MISMATCH');
  });

  /**
   * MEASURED 2026-08-15 on a scratch socket: a 3.5a client against a 3.7b
   * server prints exactly this and exits 1. It is not matched, because an
   * ordinary crashed server prints it too and calling that a version problem
   * would put the wrong name on a real crash.
   */
  it('leaves "server exited unexpectedly" unclassified', () => {
    const err = classifyTmuxFailure('server exited unexpectedly\n', 'fallback');
    assert.equal(err.payload.code, 'UNKNOWN');
    assert.equal(err.payload.message, 'fallback');
  });
});

describe('the three patterns that were already here', () => {
  it('no server running', () => {
    assert.equal(
      classifyTmuxFailure('no server running on /tmp/tmux-501/gmux', 'x').payload
        .code,
      'TMUX_UNREACHABLE'
    );
  });

  it('missing session', () => {
    assert.equal(
      classifyTmuxFailure("can't find session: $12", 'x').payload.code,
      'SESSION_NOT_FOUND'
    );
  });

  it('duplicate session', () => {
    assert.equal(
      classifyTmuxFailure('duplicate session: fix-auth', 'x').payload.code,
      'INVALID_INPUT'
    );
  });

  it('anything else keeps the caller sentence and the raw text', () => {
    const err = classifyTmuxFailure('some new tmux complaint', 'tmux x failed');
    assert.equal(err.payload.code, 'UNKNOWN');
    assert.equal(err.payload.detail, 'some new tmux complaint');
  });

  it('empty stderr carries no detail at all', () => {
    assert.equal(classifyTmuxFailure('', 'tmux x failed').payload.detail, undefined);
  });
});
