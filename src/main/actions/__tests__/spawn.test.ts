/**
 * The degrade ladder, as a unit test (Phase 46).
 *
 * Not named in the spec's test list. It is here because the ladder is the
 * part of this phase a user is most likely to meet, and a driven probe alone
 * would leave the classifier's ORDER untested. The order matters: a rate
 * limited answer often also mentions authentication, so rate limit is read
 * first, and the last rung shows gh's own first line rather than inventing a
 * sentence.
 *
 * The rate limit rung is the one whose exit code was never measured, here or
 * in research 45. Detection is by the words gh printed, and this test pins
 * that choice so a later change to it is deliberate.
 */

import { describe, expect, it } from 'vitest';
import { classifyGhFailure, firstStderrLine } from '../spawn';

function result(over: Partial<Parameters<typeof classifyGhFailure>[0]>) {
  return {
    stdout: '',
    stderr: '',
    code: 1,
    timedOut: false,
    spawnError: null,
    ...over
  };
}

describe('classifyGhFailure', () => {
  it('reports gh as missing when the spawn itself failed with ENOENT', () => {
    expect(classifyGhFailure(result({ spawnError: 'spawn gh ENOENT' }))).toEqual(
      { state: 'missing' }
    );
  });

  it('reports offline when our own timeout fired', () => {
    expect(classifyGhFailure(result({ timedOut: true, code: null }))).toEqual({
      state: 'offline'
    });
  });

  it('reports rate limited from gh own words, whatever the exit code', () => {
    for (const code of [1, 4]) {
      expect(
        classifyGhFailure(
          result({
            code,
            stderr:
              'API rate limit exceeded for user ID 1. Authenticated requests get a higher rate limit.'
          })
        )
      ).toEqual({ state: 'rate-limited' });
    }
  });

  it('reports logged out on exit code 4', () => {
    expect(classifyGhFailure(result({ code: 4, stderr: '' }))).toEqual({
      state: 'logged-out'
    });
  });

  it('reports logged out from gh own words', () => {
    expect(
      classifyGhFailure(
        result({
          stderr:
            'You are not logged into any GitHub hosts. To log in, run: gh auth login'
        })
      )
    ).toEqual({ state: 'logged-out' });
  });

  it('reports offline for the network phrases gh prints', () => {
    const phrases = [
      'dial tcp: lookup api.github.com: no such host',
      'Get "https://api.github.com": connection refused',
      'net/http: TLS handshake timeout',
      'context deadline exceeded'
    ];
    for (const stderr of phrases) {
      expect(classifyGhFailure(result({ stderr }))).toEqual({
        state: 'offline'
      });
    }
  });

  it('falls to the last rung with gh own first line', () => {
    const health = classifyGhFailure(
      result({ stderr: '\n  could not find any workflows\nsecond line\n' })
    );
    expect(health).toEqual({
      state: 'error',
      detail: 'could not find any workflows'
    });
  });
});

describe('firstStderrLine', () => {
  it('caps the line at 200 characters', () => {
    expect(firstStderrLine('x'.repeat(500))).toHaveLength(200);
  });

  it('says so rather than showing nothing', () => {
    expect(firstStderrLine('   \n  \n')).toBe('gh printed nothing.');
  });
});
