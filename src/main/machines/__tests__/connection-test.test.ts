/**
 * The one visible connection test, checked where it is pure.
 *
 * Everything below is composition and parsing. No pty is started here, and
 * nothing in this file spawns anything: the live run is proven by the Electron
 * smoke and by the live probe, which drive the real app against a scratch sshd
 * on 127.0.0.1.
 *
 * The two properties worth stating. `BatchMode=no` is on this command and on
 * nothing else in the tree, so a person is present exactly once and every
 * future ssh fails fast instead of waiting for somebody who is not there. And
 * the marker pair is what stops a chatty login file on the other machine from
 * corrupting the answer.
 */

import { describe, expect, it } from 'vitest';
import {
  KEY_INSTALL_DEADLINE_MS,
  TEST_PASSWORD_STOP_NOTE,
  classifyProbeOutput,
  KNOWN_HOSTS_OPTION,
  PINNED_SSH_PATH,
  REMOTE_PATH_MARKER,
  SSH_BATCH_MODE_INTERACTIVE,
  SSH_BATCH_MODE_STEADY,
  TEST_DEADLINE_MS,
  TEST_MAX_OUTPUT_BYTES,
  composeKnownHostsOption,
  composeTestArgv,
  composeTestCommandLine,
  parseResolvedPath,
  remoteProbeCommand,
  userHostKeysPath
} from '../connection-test';

/**
 * The two files a run checks a machine's identity against. Tortie's own path
 * carries a space, because the real one does on every Mac.
 */
const KEYS = {
  tortie: '/Users/x/Library/Application Support/Tortie/gmux/machines/known-machines',
  user: '/Users/x/.ssh/known_hosts'
};

const FULL = {
  host: 'pop-os.tail1a2b.ts.net',
  user: 'greg',
  port: 2222,
  remoteTmuxPath: '/usr/bin/tmux'
};

const BARE = {
  host: '127.0.0.1',
  user: null,
  port: null,
  remoteTmuxPath: null
};

describe('the argv', () => {
  it('carries BatchMode=no, because a person is watching this one', () => {
    expect(composeTestArgv(FULL, KEYS)).toContain(SSH_BATCH_MODE_INTERACTIVE);
    expect(SSH_BATCH_MODE_INTERACTIVE).toBe('BatchMode=no');
  });

  it('carries it exactly once', () => {
    const argv = composeTestArgv(FULL, KEYS);
    expect(argv.filter((a) => a === SSH_BATCH_MODE_INTERACTIVE)).toHaveLength(1);
  });

  it('names the steady constant Phase 69 reads, and it is the other one', () => {
    expect(SSH_BATCH_MODE_STEADY).toBe('BatchMode=yes');
    expect(composeTestArgv(FULL, KEYS)).not.toContain(SSH_BATCH_MODE_STEADY);
  });

  it('asks the host key question rather than answering it', () => {
    expect(composeTestArgv(FULL, KEYS)).toContain('StrictHostKeyChecking=ask');
  });

  it('bounds how long the connection may take', () => {
    expect(composeTestArgv(FULL, KEYS)).toContain('ConnectTimeout=10');
  });

  it('passes -p only when a port is set', () => {
    expect(composeTestArgv(FULL, KEYS)).toContain('-p');
    expect(composeTestArgv(FULL, KEYS)).toContain('2222');
    expect(composeTestArgv(BARE, KEYS)).not.toContain('-p');
  });

  it('passes -l only when an account name is set', () => {
    expect(composeTestArgv(FULL, KEYS)).toContain('-l');
    expect(composeTestArgv(FULL, KEYS)).toContain('greg');
    expect(composeTestArgv(BARE, KEYS)).not.toContain('-l');
  });

  it('puts the address after every option', () => {
    const argv = composeTestArgv(FULL, KEYS);
    const hostAt = argv.indexOf(FULL.host);
    expect(hostAt).toBeGreaterThan(argv.indexOf('-p'));
    expect(hostAt).toBeGreaterThan(argv.indexOf('-l'));
    expect(hostAt).toBeLessThan(argv.length - 1);
  });

  it('ends with ONE argument carrying the whole remote command', () => {
    const argv = composeTestArgv(FULL, KEYS);
    const last = argv[argv.length - 1] ?? '';
    expect(last).toContain(REMOTE_PATH_MARKER);
    expect(last).toContain('command -v');
  });

  it('asks for tmux by name when no program path was chosen', () => {
    const last = composeTestArgv(BARE, KEYS)[composeTestArgv(BARE, KEYS).length - 1] ?? '';
    expect(last).toContain('command -v tmux');
  });

  it('asks for the exact path when one was chosen', () => {
    const argv = composeTestArgv(FULL, KEYS);
    expect(argv[argv.length - 1] ?? '').toContain('command -v /usr/bin/tmux');
  });

  it('quotes a program path holding a space', () => {
    const argv = composeTestArgv({ ...FULL, remoteTmuxPath: '/opt/my tools/tmux' }, KEYS);
    const last = argv[argv.length - 1] ?? '';
    expect(last).toContain("'/opt/my tools/tmux'");
  });
});

describe('where a machine’s identity is recorded', () => {
  const optionOf = (argv: string[]): string =>
    argv.find((a) => a.startsWith(`${KNOWN_HOSTS_OPTION}=`)) ?? '';

  it('names the record files itself, so the client never picks its own', () => {
    // The first build named none. The client then used its default, which is
    // the file in the person's home folder, and answering the question in
    // Tortie wrote three lines into it. Measured at 932 bytes before and 1229
    // after.
    expect(optionOf(composeTestArgv(FULL, KEYS))).not.toBe('');
    expect(optionOf(composeTestArgv(BARE, KEYS))).not.toBe('');
  });

  it('names it exactly once', () => {
    const argv = composeTestArgv(FULL, KEYS);
    expect(argv.filter((a) => a.startsWith(`${KNOWN_HOSTS_OPTION}=`))).toHaveLength(1);
  });

  it('puts the file Tortie owns first, which is the only one that is written', () => {
    const value = optionOf(composeTestArgv(FULL, KEYS));
    expect(value.indexOf(KEYS.tortie)).toBeGreaterThan(-1);
    expect(value.indexOf(KEYS.user)).toBeGreaterThan(value.indexOf(KEYS.tortie));
  });

  it('quotes both paths, because Tortie’s own directory has a space in it', () => {
    expect(composeKnownHostsOption(KEYS)).toBe(
      `${KNOWN_HOSTS_OPTION}="${KEYS.tortie}" "${KEYS.user}"`
    );
  });

  it('reads the person’s own record and writes nowhere near it', () => {
    // Second in the list, so a key it does not know cannot be added to it.
    // The alarm still works from it, which is the reason it is read at all.
    expect(userHostKeysPath('/Users/x')).toBe('/Users/x/.ssh/known_hosts');
    const value = optionOf(composeTestArgv(FULL, KEYS));
    expect(value.endsWith(`"${KEYS.user}"`)).toBe(true);
  });

  it('shows the record file in the command line a person can read', () => {
    expect(composeTestCommandLine(PINNED_SSH_PATH, FULL, KEYS)).toContain(KEYS.tortie);
  });
});

describe('the remote command', () => {
  it('wraps the answer in the marker pair, twice', () => {
    const command = remoteProbeCommand('tmux');
    expect(command.split(REMOTE_PATH_MARKER)).toHaveLength(3);
  });

  it('does not fail when the program is not there', () => {
    expect(remoteProbeCommand('tmux')).toContain('|| true');
  });
});

describe('the command line the transcript shows', () => {
  it('starts with the client this run uses', () => {
    const line = composeTestCommandLine(PINNED_SSH_PATH, FULL, KEYS);
    expect(line.startsWith(PINNED_SSH_PATH)).toBe(true);
  });

  it('shows the substituted client when one was given', () => {
    const line = composeTestCommandLine('/tmp/fake-ssh', FULL, KEYS);
    expect(line.startsWith('/tmp/fake-ssh')).toBe(true);
  });
});

describe('the answer the machine sends back', () => {
  it('reads a full path out of the markers', () => {
    const text = `some login noise\n${REMOTE_PATH_MARKER}/usr/bin/tmux${REMOTE_PATH_MARKER}\n`;
    expect(parseResolvedPath(text)).toBe('/usr/bin/tmux');
  });

  it('ignores everything printed around the markers', () => {
    const text =
      `Welcome to Pop OS\n/usr/bin/tmux is not the answer\n` +
      `${REMOTE_PATH_MARKER}/opt/homebrew/bin/tmux${REMOTE_PATH_MARKER}\n` +
      `have a nice day\n`;
    expect(parseResolvedPath(text)).toBe('/opt/homebrew/bin/tmux');
  });

  it('refuses a relative answer', () => {
    const text = `${REMOTE_PATH_MARKER}bin/tmux${REMOTE_PATH_MARKER}\n`;
    expect(parseResolvedPath(text)).toBeNull();
  });

  it('refuses an empty answer', () => {
    const text = `${REMOTE_PATH_MARKER}${REMOTE_PATH_MARKER}\n`;
    expect(parseResolvedPath(text)).toBeNull();
  });

  it('refuses output with no markers at all', () => {
    expect(parseResolvedPath('/usr/bin/tmux\n')).toBeNull();
  });

  it('refuses a single marker', () => {
    expect(parseResolvedPath(`${REMOTE_PATH_MARKER}/usr/bin/tmux\n`)).toBeNull();
  });
});

describe('the sheet the outcome carries', () => {
  /**
   * The sheet exists so the Add Machine flow has a hash to send back. The
   * property worth pinning here is which four values it covers: the id the
   * person typed, plus the three form fields, plus the path the MACHINE
   * reported rather than the one the person guessed.
   */
  it('is the hash of the id plus the resolved path, not the typed one', async () => {
    const { describeMachine } = await import('../confirm');
    const typed = { ...BARE, remoteTmuxPath: null };
    const resolved = { ...BARE, remoteTmuxPath: '/opt/homebrew/bin/tmux' };
    expect(describeMachine('probe', typed).hash).not.toBe(
      describeMachine('probe', resolved).hash
    );
    expect(describeMachine('probe', resolved).lines).toContain(
      'Runs this program on that machine: /opt/homebrew/bin/tmux'
    );
  });
});

describe('the bounds', () => {
  it('gives the whole test 60 seconds, because a person may be reading', () => {
    expect(TEST_DEADLINE_MS).toBe(60_000);
  });

  it('gives a key install half of that, because nobody is reading', () => {
    // The password was typed before the call started, so there is no person to
    // wait for. Thirty seconds is three times the connect budget.
    expect(KEY_INSTALL_DEADLINE_MS).toBe(30_000);
    expect(KEY_INSTALL_DEADLINE_MS).toBeLessThan(TEST_DEADLINE_MS);
  });

  it('shows at most 256 KB of output', () => {
    expect(TEST_MAX_OUTPUT_BYTES).toBe(256 * 1024);
  });

  it('runs the ssh every Mac has, at an absolute path', () => {
    expect(PINNED_SSH_PATH).toBe('/usr/bin/ssh');
  });
});

/**
 * PHASE 79.1 FIX ROUND. The machine that asks for a password.
 *
 * The live stop is proven by `build/probe-key-install.mjs` leg 4, which drives
 * this module against a scratch server on 127.0.0.1 set up the way a stock Mac
 * with Remote Login on is. What is checked here is the decision the live stop
 * and the finished transcript share.
 */
describe('a machine that asks for a password', () => {
  /** The 27 bytes a real client printed, from the golden file. */
  const REAL = "\rgdc@127.0.0.1's password: ";

  it('is its own class rather than a machine answering slowly', () => {
    expect(classifyProbeOutput(REAL, -1)).toBe('password-required');
  });

  it('is still that class when the question is not the last thing printed', () => {
    expect(
      classifyProbeOutput(`some banner\ngreg@box password: \n`, -1)
    ).toBe('password-required');
  });

  it('loses to a machine that turned the answer down', () => {
    // Both are in the text when a wrong answer was given. The machine has
    // spoken by then, and what it said is the truer of the two.
    const both = `greg@box's password: \nPermission denied, please try again.\n`;
    expect(classifyProbeOutput(both, 255)).toBe('auth-refused');
  });

  it('does not read an ordinary line holding the word as a question', () => {
    expect(classifyProbeOutput('your password: is wrong\n', 255)).toBe('unknown');
  });

  it('never wins over a machine that answered the probe', () => {
    const ok = `greg@box's password: \n__TORTIE_PATH__/usr/bin/tmux__TORTIE_PATH__\n`;
    expect(classifyProbeOutput(ok, 0)).toBe('ok');
  });

  it('says in the transcript that Tortie stopped and why', () => {
    expect(TEST_PASSWORD_STOP_NOTE).toContain('asked for a password');
    expect(TEST_PASSWORD_STOP_NOTE).toContain('stopped here');
    // No em dash, no en dash, and the house colon rule.
    expect(TEST_PASSWORD_STOP_NOTE).not.toMatch(/[\u2014\u2013]/);
    expect(TEST_PASSWORD_STOP_NOTE).not.toContain(':');
  });
});
