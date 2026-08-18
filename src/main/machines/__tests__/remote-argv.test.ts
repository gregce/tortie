/**
 * Reading where ONE machine keeps ONE program (Phase 72, M5).
 *
 * The composition and the parse are pure, so they are tested for real. The read
 * itself spawns a sign in program against another computer, and a mocked spawn
 * would prove the mock, so the end to end capture is watched in
 * `GMUX_SMOKE=remote-sessions` and in the ten row matrix instead.
 *
 * The parse tests are the ones that matter. A wrong answer here is a manifest
 * row that names a program path on the wrong machine, and a restore composed
 * from it starts the wrong program or none at all.
 */

import { describe, expect, it } from 'vitest';
import {
  REMOTE_ARGV_TIMEOUT_MS,
  assertArgvBelongsToMachine,
  parseRemoteWhich,
  remoteWhichCommand
} from '../remote-argv';
import { REMOTE_PATH_MARKER } from '../carriage';
import { RESTORE_WRONG_MACHINE, noRemoteProgramRefusal } from '../remote-copy';

/** Wrap a value the way the far side's printf does. */
function printed(value: string): string {
  return `${REMOTE_PATH_MARKER}${value}${REMOTE_PATH_MARKER}`;
}

describe('the command sent to the machine', () => {
  it('runs a login shell rather than an interactive one', () => {
    const command = remoteWhichCommand('claude');
    expect(command).toContain('"$SHELL" -lc');
    expect(command).not.toContain('-lic');
  });

  /**
   * `command -v` is the POSIX spelling. `which` is not in POSIX and behaves
   * differently across the shells a machine might be running.
   */
  it('asks with command -v and not with which', () => {
    expect(remoteWhichCommand('codex')).toContain('command -v codex');
    expect(remoteWhichCommand('codex')).not.toContain('which ');
  });

  /**
   * A chatty login file on the other machine prints before the answer does. The
   * marker pair is what separates the two, and it is the same pair the PATH
   * capture uses rather than a second one.
   */
  it('wraps the answer in the marker pair the PATH capture already uses', () => {
    const command = remoteWhichCommand('claude');
    expect(command.split(REMOTE_PATH_MARKER)).toHaveLength(3);
  });

  it('gives the far side the same budget the PATH capture gets', () => {
    expect(REMOTE_ARGV_TIMEOUT_MS).toBe(10_000);
  });
});

describe('reading the answer', () => {
  it('reads an absolute path out from between the markers', () => {
    expect(parseRemoteWhich(printed('/opt/homebrew/bin/claude'))).toBe(
      '/opt/homebrew/bin/claude'
    );
  });

  it('ignores everything a login file printed around it', () => {
    const noise = `Welcome to the studio\nyou have mail\n${printed('/usr/bin/tmux')}\n`;
    expect(parseRemoteWhich(noise)).toBe('/usr/bin/tmux');
  });

  it('reads no answer when the markers never arrived', () => {
    expect(parseRemoteWhich('/usr/bin/tmux')).toBeNull();
  });

  it('reads no answer when the markers arrived empty', () => {
    expect(parseRemoteWhich(printed(''))).toBeNull();
  });

  /**
   * A shell builtin or an alias prints a bare word rather than a path, and a
   * bare word is not an answer to the question that was asked. Recording one
   * would put a value in `argv[0]` that names nothing on any machine.
   */
  it('refuses an answer that is not an absolute path', () => {
    expect(parseRemoteWhich(printed('claude'))).toBeNull();
    expect(parseRemoteWhich(printed('alias claude=claude --yolo'))).toBeNull();
    expect(parseRemoteWhich(printed('./claude'))).toBeNull();
  });

  /**
   * A printf of a multi line value means the shell answered something other
   * than one path, and picking a line out of it would be a guess.
   */
  it('refuses a multi line answer rather than taking a line from it', () => {
    expect(parseRemoteWhich(printed('/usr/bin/a\n/usr/bin/b'))).toBeNull();
  });

  it('keeps a path with a space in it whole', () => {
    expect(parseRemoteWhich(printed('/Users/me/my tools/claude'))).toBe(
      '/Users/me/my tools/claude'
    );
  });
});

describe('the machine binding', () => {
  it('passes when the row and the target are the same machine', () => {
    expect(() => {
      assertArgvBelongsToMachine('studio', 'studio');
    }).not.toThrow();
  });

  /**
   * A path captured on one machine can never be used to launch on another. This
   * is the assertion behind `machine.restore-wrong-machine`.
   */
  it('refuses a row whose machine is not the machine in hand', () => {
    let message = '';
    try {
      assertArgvBelongsToMachine('studio', 'laptop');
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain(RESTORE_WRONG_MACHINE);
  });

  it('names both machines in the detail a bug report reads', () => {
    let detail = '';
    try {
      assertArgvBelongsToMachine('studio', 'laptop');
    } catch (err) {
      detail = String(
        (JSON.parse((err as Error).message) as { detail?: string }).detail ?? ''
      );
    }
    expect(detail).toContain('studio');
    expect(detail).toContain('laptop');
  });
});

describe('the refusal a person reads', () => {
  it('names the program and the machine, and says what to do', () => {
    const sentence = noRemoteProgramRefusal('claude', 'Studio');
    expect(sentence).toContain('claude');
    expect(sentence).toContain('Studio');
    expect(sentence).toContain('Install it there');
    expect(sentence).toContain('did not start the session there');
  });

  it('carries no dash the writing rules refuse', () => {
    const sentence = noRemoteProgramRefusal('codex', 'Studio');
    expect(sentence).not.toContain('—');
    expect(sentence).not.toContain('–');
  });

  /** No transport word reaches a person. */
  it('names no transport and no program of the transport', () => {
    const sentence = noRemoteProgramRefusal('codex', 'Studio');
    for (const word of ['ssh', 'tmux', 'socket', 'PATH', 'pane']) {
      expect(sentence).not.toContain(word);
    }
  });
});
