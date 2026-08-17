/**
 * Reading the list of places another machine looks for programs (Phase 69, M2).
 *
 * The parser is the whole of what can be tested without a machine, and it is the
 * part that matters: a chatty login file on the other side must not be able to
 * corrupt the answer, and an answer that is not a real search list has to read as
 * no answer at all rather than as a short one.
 */

import { describe, expect, it } from 'vitest';
import {
  noRemotePathRefusal,
  parseRemotePath,
  remotePathCommand,
  remotePathWithPrefixCommand
} from '../remote-path';
import { REMOTE_PATH_MARKER } from '../connection-test';

/** What the far side prints, with the markers around the answer. */
function printed(value: string, noise = ''): string {
  return `${noise}${REMOTE_PATH_MARKER}${value}${REMOTE_PATH_MARKER}\n`;
}

describe('the command', () => {
  it('asks for a login shell and not an interactive one', () => {
    // The local capture uses -lic, because a person's interactive lines can put
    // directories on PATH. There is no terminal on this connection, and an
    // interactive shell reading from a pipe prints job control noise for nothing.
    expect(remotePathCommand()).toContain('-lc ');
    expect(remotePathCommand()).not.toContain('-lic');
  });

  it('quotes the shell path, for an account whose shell has a space in it', () => {
    expect(remotePathCommand()).toContain('"$SHELL"');
  });

  it('puts the marker pair around the answer', () => {
    const command = remotePathCommand();
    expect(command.split(REMOTE_PATH_MARKER)).toHaveLength(3);
  });

  it('has a second shape for the M3 de-risking probe only', () => {
    const command = remotePathWithPrefixCommand('/opt/tortie/bin:/usr/bin');
    expect(command.startsWith('PATH=')).toBe(true);
    expect(command).toContain('/opt/tortie/bin:/usr/bin');
    // A value carrying a space is quoted by the one quoting helper in this
    // process, so a search list with a space in a directory name still works.
    expect(remotePathWithPrefixCommand('/a b/bin')).toContain("'/a b/bin'");
  });
});

describe('the answer', () => {
  it('reads a plain search list', () => {
    expect(parseRemotePath(printed('/usr/local/bin:/usr/bin:/bin'))).toBe(
      '/usr/local/bin:/usr/bin:/bin'
    );
  });

  it('ignores everything a login file printed around it', () => {
    const noise =
      'Welcome to pop-os\nYou have mail.\nnvm: version 20 in use\n';
    expect(parseRemotePath(printed('/home/greg/.local/bin:/usr/bin', noise))).toBe(
      '/home/greg/.local/bin:/usr/bin'
    );
  });

  it('reads an answer that spans lines, because a value can carry one', () => {
    expect(parseRemotePath(printed('/usr/bin\n:/bin'))).toBe('/usr/bin\n:/bin');
  });

  it('treats no markers as no answer', () => {
    expect(parseRemotePath('bash: no such file\n')).toBeNull();
  });

  it('treats empty markers as no answer', () => {
    expect(parseRemotePath(printed(''))).toBeNull();
  });

  it('treats an answer with no absolute directory as no answer', () => {
    // A relative entry alone means the far side answered with something that is
    // not a search list, and guessing from it is how the wrong copy of a program
    // runs. No answer is a refusal upstream rather than a fallback.
    expect(parseRemotePath(printed('bin:.:../tools'))).toBeNull();
  });

  it('accepts a list where only one entry is absolute', () => {
    expect(parseRemotePath(printed('.:/usr/bin'))).toBe('.:/usr/bin');
  });

  it('does not count a bare slash as a directory', () => {
    expect(parseRemotePath(printed('/'))).toBeNull();
  });
});

describe('the refusal', () => {
  it('names the machine and says nothing was started', () => {
    const sentence = noRemotePathRefusal('popos');
    expect(sentence).toContain('popos');
    expect(sentence).toContain('Nothing was started.');
    expect(sentence).not.toContain('PATH');
  });
});
