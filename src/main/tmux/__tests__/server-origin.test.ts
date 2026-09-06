/**
 * Unit tests for src/main/tmux/server-origin.ts (Phase 217).
 *
 * The module answers one question, being who started the session server that is
 * already running, and the refusal screen's words are composed from its answer.
 * So the rule these cases hold is not "it reads a pid". It is that a read that
 * fails leaves a field NULL rather than producing a value somebody invented,
 * because the command that ends up under those words ends every session on a
 * server.
 *
 * Nothing here spawns a process. The tmux door and the process table reader are
 * both injected, which is why the shipping module takes them as arguments.
 *
 * Runner: vitest (`npm test`). Assertions on node:assert/strict.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import {
  appBundleOf,
  appNameOf,
  readServerOrigin,
  UNKNOWN_ORIGIN,
  type PsReader
} from '../server-origin';
import type { TmuxExec } from '../version';

/** A door that answers one string to `display-message`, or refuses. */
function door(answer: string | null): TmuxExec {
  return (args) => {
    assert.deepEqual(args, ['display-message', '-p', '#{pid}']);
    return answer === null
      ? Promise.reject(new Error('no server'))
      : Promise.resolve(answer);
  };
}

/** A process table that answers one string, and records what it was asked. */
function table(answer: string | null): PsReader & { asked: number[] } {
  const asked: number[] = [];
  const read = (pid: number): Promise<string | null> => {
    asked.push(pid);
    return Promise.resolve(answer);
  };
  return Object.assign(read, { asked });
}

describe('appBundleOf', () => {
  it('finds the bundle an installed Tortie runs its tmux from', () => {
    assert.equal(
      appBundleOf('/Applications/Tortie.app/Contents/Resources/bin/tmux'),
      '/Applications/Tortie.app'
    );
  });

  it('finds it wherever the application was put', () => {
    assert.equal(
      appBundleOf('/Users/x/Desktop/Tortie.app/Contents/MacOS/Tortie'),
      '/Users/x/Desktop/Tortie.app'
    );
  });

  it('a plain binary is in no bundle', () => {
    assert.equal(appBundleOf('/opt/homebrew/bin/tmux'), null);
    assert.equal(appBundleOf('/usr/bin/tmux'), null);
  });

  it('a directory merely named .app with nothing under it is not a bundle', () => {
    assert.equal(appBundleOf('/tmp/notreally.app/bin/tmux'), null);
  });

  it('names the bundle the way a person does', () => {
    assert.equal(appNameOf('/Applications/Tortie.app'), 'Tortie');
  });
});

describe('readServerOrigin', () => {
  it('reads the pid, then the program that pid is running', async () => {
    const ps = table('/Applications/Tortie.app/Contents/Resources/bin/tmux');
    const origin = await readServerOrigin(door('953\n'), ps);
    assert.deepEqual(origin, {
      pid: 953,
      binary: '/Applications/Tortie.app/Contents/Resources/bin/tmux',
      appBundle: '/Applications/Tortie.app'
    });
    assert.deepEqual(ps.asked, [953]);
  });

  it('a server that will not answer leaves everything null', async () => {
    const ps = table('/opt/homebrew/bin/tmux');
    assert.deepEqual(await readServerOrigin(door(null), ps), UNKNOWN_ORIGIN);
    // And the process table was never asked, because there was no pid to ask
    // about. A guessed pid is a guessed answer.
    assert.deepEqual(ps.asked, []);
  });

  it('an answer that is not a pid is refused before it reaches an argv', async () => {
    for (const bad of ['', 'nope', '-1', '12; rm -rf /', '3.7b', '0']) {
      const ps = table('/opt/homebrew/bin/tmux');
      assert.deepEqual(
        await readServerOrigin(door(`${bad}\n`), ps),
        UNKNOWN_ORIGIN,
        bad
      );
      assert.deepEqual(ps.asked, [], bad);
    }
  });

  it('a process table that will not answer keeps the pid and drops the rest', async () => {
    const origin = await readServerOrigin(door('4242\n'), table(null));
    assert.deepEqual(origin, { pid: 4242, binary: null, appBundle: null });
  });

  it('a command that is not an absolute path is not a binary path', async () => {
    // ps prints a full path on macOS. Anything else is a shape this module
    // does not understand, and it says so rather than printing it.
    const origin = await readServerOrigin(door('4242\n'), table('tmux'));
    assert.deepEqual(origin, { pid: 4242, binary: null, appBundle: null });
  });
});
