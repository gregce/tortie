/**
 * The boot verb, and how a machine with no server is told from one that refused
 * (Phase 69, M2).
 *
 * Nothing here connects to anything. The one live half, being that the boot verb
 * really produces a server that stays up, is measured by
 * `build/probe-execplane.mjs` step 7 and by `npm run smoke:execplane`.
 */

import { describe, expect, it } from 'vitest';
import { remoteBootArgs } from '../remote-server';
import { ledgerRowFor, remoteVerbsOf } from '../exec-plane';
import { classifyMachineOutput } from '../errors';

describe('the boot verb', () => {
  it('sets exit-empty in the SAME invocation that creates the server', () => {
    // MEASURED on tmux 3.6a on a scratch socket, 2026-08-17:
    //
    //   tmux -L scratch -f /dev/null start-server
    //     exit 0, and 0.3 s later list-sessions answers
    //     "no server running on /private/tmp/tmux-501/scratch"
    //
    //   tmux -L scratch -f /dev/null start-server ';' set-option -s exit-empty off
    //     exit 0, list-sessions answers with zero rows and exit 0
    //
    // tmux's own default for exit-empty is `on`, so a server created with
    // -f /dev/null and no sessions ends itself immediately. On this Mac the
    // configuration file prevents that. On another machine nothing does.
    const argv = remoteBootArgs();
    expect(argv[0]).toBe('start-server');
    expect(argv).toContain(';');
    expect(argv.slice(argv.indexOf(';') + 1)).toEqual([
      'set-option',
      '-s',
      'exit-empty',
      'off'
    ]);
  });

  it('uses the -s flag, because exit-empty is a server option', () => {
    expect(remoteBootArgs()).not.toContain('-g');
  });

  it('sends only verbs the ledger allows', () => {
    for (const verb of remoteVerbsOf(remoteBootArgs())) {
      expect(ledgerRowFor(verb)).not.toBeNull();
    }
  });

  it('does not name the configuration file, because the argv already carries it', () => {
    expect(remoteBootArgs()).not.toContain('-f');
    expect(remoteBootArgs()).not.toContain('/dev/null');
  });
});

describe('a machine with no server, against one that refused', () => {
  it('reads both no-server sentences the client can print', () => {
    // The first is what tmux prints when the socket FILE is there and nothing is
    // listening. The second is a real capture from a socket nothing had ever used,
    // taken by build/capture-machine-goldens.mjs.
    expect(
      classifyMachineOutput('no server running on /private/tmp/tmux-501/gmux-p69')
    ).toBe('no-server');
    expect(
      classifyMachineOutput(
        'error connecting to /private/tmp/tmux-501/gmux-p69 (No such file or directory)'
      )
    ).toBe('no-server');
  });

  it('keeps a refused connection a different answer', () => {
    // Research 51 section 4.4 requires these be told apart. A machine with no
    // server is the ordinary answer for one nobody has prepared. A refusal is the
    // far side declining the connection, and preparing it will not help.
    expect(
      classifyMachineOutput('ssh: connect to host 127.0.0.1 port 22: Connection refused')
    ).toBe('refused');
  });

  it('keeps a changed identity the one alarming answer', () => {
    expect(
      classifyMachineOutput(
        'WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!\nno server running on x'
      )
    ).toBe('host-key-changed');
  });
});
