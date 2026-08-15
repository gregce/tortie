/**
 * The words on the three screens that stop a boot (Phase 41).
 *
 * These are the sentences a user reads at the worst moment they will have with
 * Tortie, which is the moment it will not start. Two things are pinned here.
 *
 * First, the sentences themselves, so a later edit that softens or shortens one
 * of them has to say so. The version screen's promise is the one that matters
 * most: it tells the user that nothing was changed and nothing was ended, and
 * that promise is only worth anything if the code behind it stays true.
 *
 * Second, the house writing rules, applied to every user facing line in the
 * module: no em dash, no en dash, and no colon except to introduce a list.
 *
 * Runner: vitest (`npm test`). Assertions on node:assert/strict.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import {
  COPY_COMMAND_TOASTS,
  TMUX_BUNDLE_INCOMPLETE_COPY,
  TMUX_MISSING_COPY,
  TMUX_VERSION_BLOCKED_COPY
} from '../tmux-block-copy';

/** Every user facing string in the module, flattened. */
const everyLine: string[] = [
  TMUX_MISSING_COPY.title,
  ...TMUX_MISSING_COPY.body,
  TMUX_MISSING_COPY.command,
  TMUX_MISSING_COPY.copyLabel,
  TMUX_MISSING_COPY.button,
  TMUX_MISSING_COPY.buttonBusy,
  TMUX_BUNDLE_INCOMPLETE_COPY.title,
  ...TMUX_BUNDLE_INCOMPLETE_COPY.body,
  TMUX_BUNDLE_INCOMPLETE_COPY.button,
  TMUX_VERSION_BLOCKED_COPY.title,
  ...TMUX_VERSION_BLOCKED_COPY.body,
  ...TMUX_VERSION_BLOCKED_COPY.ways,
  TMUX_VERSION_BLOCKED_COPY.command,
  TMUX_VERSION_BLOCKED_COPY.copyLabel,
  ...TMUX_VERSION_BLOCKED_COPY.afterCommand,
  TMUX_VERSION_BLOCKED_COPY.button,
  COPY_COMMAND_TOASTS.ok,
  COPY_COMMAND_TOASTS.failed
];

describe('the development build screen', () => {
  it('keeps the §6.4 title and body, and adds what a packaged build does', () => {
    assert.equal(
      TMUX_MISSING_COPY.title,
      'Tortie needs tmux to keep sessions alive'
    );
    assert.equal(
      TMUX_MISSING_COPY.body[0],
      'Tortie runs sessions on a private tmux server so they survive quits ' +
        'and crashes. It never touches your own tmux setup.'
    );
    assert.equal(
      TMUX_MISSING_COPY.body[1],
      'This is a development build. A packaged Tortie carries its own copy ' +
        'of tmux and needs nothing installed first.'
    );
    assert.equal(TMUX_MISSING_COPY.command, 'brew install tmux');
  });
});

describe('the broken install screen', () => {
  it('tells the user nothing is lost, and asks them to install nothing', () => {
    assert.equal(
      TMUX_BUNDLE_INCOMPLETE_COPY.title,
      'Tortie is missing part of its install'
    );
    assert.equal(
      TMUX_BUNDLE_INCOMPLETE_COPY.body[0],
      'Nothing has been lost. Your sessions are recorded, and Tortie lists ' +
        'them again as soon as it can start.'
    );
    for (const line of TMUX_BUNDLE_INCOMPLETE_COPY.body) {
      assert.ok(!line.includes('brew'), line);
    }
  });
});

describe('the untested version screen', () => {
  it('promises that nothing was changed and nothing was ended', () => {
    assert.equal(
      TMUX_VERSION_BLOCKED_COPY.title,
      'Tortie will not attach to the session server it found'
    );
    assert.equal(
      TMUX_VERSION_BLOCKED_COPY.body[0],
      'Nothing has been changed and nothing has been ended. Every session on ' +
        'that server is still running, and Tortie has not touched it.'
    );
    assert.equal(
      TMUX_VERSION_BLOCKED_COPY.body[1],
      'Attaching across a pair that was never tested can hang instead of ' +
        'failing, and a hang would look like Tortie freezing on work you ' +
        'care about.'
    );
    assert.equal(TMUX_VERSION_BLOCKED_COPY.body[2], 'You have two ways forward.');
  });

  it('offers exactly two ways forward, and quitting is one of them', () => {
    assert.equal(TMUX_VERSION_BLOCKED_COPY.ways.length, 2);
    assert.equal(
      TMUX_VERSION_BLOCKED_COPY.ways[0],
      'Leave it alone. Quit Tortie and keep using the copy of Tortie that ' +
        'started that server.'
    );
    assert.equal(
      TMUX_VERSION_BLOCKED_COPY.ways[1],
      'Move over. End the old server yourself, then open Tortie again. ' +
        'Tortie starts a new server with the version it carries, lists your ' +
        'sessions from its own records, and you restore the ones you want. ' +
        'Restoring brings the agent back with its conversation.'
    );
  });

  it('shows the command on the real socket, and says Tortie will not run it', () => {
    // The socket name is an ADDRESS, not a name (see the supervisor's note on
    // TMUX_SOCKET). A screen that printed a different one would send the user
    // to a server that holds none of their work.
    assert.equal(TMUX_VERSION_BLOCKED_COPY.command, 'tmux -L gmux kill-server');
    assert.equal(
      TMUX_VERSION_BLOCKED_COPY.afterCommand[0],
      'That command ends every session on the old server. Tortie will not ' +
        'run it for you, because ending a server that holds your work is ' +
        'your decision. Restarting your Mac has the same effect.'
    );
    assert.equal(
      TMUX_VERSION_BLOCKED_COPY.afterCommand[1],
      'Tortie does not restore sessions on its own. It lists them, and you ' +
        'choose which ones come back.'
    );
  });
});

describe('the house writing rules', () => {
  it('no line uses an em dash or an en dash', () => {
    for (const line of everyLine) {
      assert.ok(!line.includes('—'), `em dash in ${JSON.stringify(line)}`);
      assert.ok(!line.includes('–'), `en dash in ${JSON.stringify(line)}`);
    }
  });

  it('no line uses a colon, because none of them introduces a list', () => {
    for (const line of everyLine) {
      assert.ok(!line.includes(':'), `colon in ${JSON.stringify(line)}`);
    }
  });

  it('every button says the same two words on all three screens', () => {
    assert.equal(TMUX_MISSING_COPY.button, 'Check again');
    assert.equal(TMUX_BUNDLE_INCOMPLETE_COPY.button, 'Check again');
    assert.equal(TMUX_VERSION_BLOCKED_COPY.button, 'Check again');
    assert.equal(TMUX_MISSING_COPY.buttonBusy, 'Checking…');
    assert.equal(TMUX_BUNDLE_INCOMPLETE_COPY.buttonBusy, 'Checking…');
    assert.equal(TMUX_VERSION_BLOCKED_COPY.buttonBusy, 'Checking…');
  });
});
