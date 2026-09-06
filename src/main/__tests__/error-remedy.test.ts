/**
 * The remedy a structured error may carry (Phase 217), in src/main/errors.ts.
 *
 * `gmuxErrorPayloadOf` fails closed by design, and it is the reader the durable
 * create boundary shares. This phase gave it a fourth field to read, and the
 * rule these cases hold is that the fourth field can never make the reader
 * answer differently about the first three. A remedy of a shape this build does
 * not understand is dropped WHOLE and the payload around it survives, because
 * the command a remedy carries is the one thing on a refusal screen that could
 * end somebody's work, and a half read one would put an invented command in
 * front of a person about to run it.
 *
 * Runner: vitest (`npm test`). Assertions on node:assert/strict.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import { gmuxError, gmuxErrorPayloadOf, isGmuxError } from '../errors';

const remedy = {
  lines: ['That server was started by Tortie at /Applications/Tortie.app.'],
  command: 'tmux -L gmux kill-server'
};

describe('a refusal that carries a remedy', () => {
  it('round trips through the error and through JSON', () => {
    const err = gmuxError('TMUX_VERSION_UNTESTED', 'blocked', 'detail', remedy);
    assert.deepEqual(err.payload.remedy, remedy);
    // The renderer reads the JSON in the message, so the remedy has to survive
    // that trip and not only the object.
    assert.deepEqual(
      (JSON.parse(err.message) as { remedy: unknown }).remedy,
      remedy
    );
  });

  it('is read back by the structural reader', () => {
    const err = gmuxError('TMUX_VERSION_UNTESTED', 'blocked', 'detail', remedy);
    assert.deepEqual(gmuxErrorPayloadOf(err)?.remedy, remedy);
    assert.equal(isGmuxError(err, 'TMUX_VERSION_UNTESTED'), true);
  });

  it('every error that composes none carries none', () => {
    const err = gmuxError('GIT_FAILED', 'git said no', 'exit 128');
    assert.equal(err.payload.remedy, undefined);
    assert.equal(gmuxErrorPayloadOf(err)?.remedy, undefined);
  });
});

describe('a remedy of the wrong shape', () => {
  /** The payload shape, with a remedy planted straight onto it. */
  function planted(bad: unknown): unknown {
    return {
      payload: {
        code: 'TMUX_VERSION_UNTESTED',
        message: 'blocked',
        detail: 'detail',
        remedy: bad
      }
    };
  }

  it('is dropped whole, and the payload around it still reads', () => {
    for (const bad of [
      'a string',
      42,
      ['an array'],
      { command: 'x' },
      { lines: 'not an array', command: 'x' },
      { lines: ['fine', 7], command: 'x' },
      { lines: [], command: 12 },
      { lines: [], command: undefined }
    ]) {
      const read = gmuxErrorPayloadOf(planted(bad));
      assert.notEqual(read, null, JSON.stringify(bad));
      assert.equal(read?.code, 'TMUX_VERSION_UNTESTED');
      assert.equal(read?.message, 'blocked');
      assert.equal(read?.detail, 'detail');
      assert.equal(read?.remedy, undefined, JSON.stringify(bad));
    }
  });

  it('a null command is a remedy with no command, not a broken one', () => {
    const read = gmuxErrorPayloadOf(planted({ lines: ['a line'], command: null }));
    assert.deepEqual(read?.remedy, { lines: ['a line'], command: null });
  });
});
