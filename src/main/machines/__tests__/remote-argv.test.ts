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

import { describe, expect, it, vi } from 'vitest';

// PHASE 109. The wire, replaced so the two refusal arms of the walk can be
// driven for real: the facts read states a home and the program search finds
// nothing. Everything else in this file is pure and uses the module as it is.
vi.mock('../remote-run', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../remote-run')>()),
  runRemoteRead: (_ctx: unknown, scriptId: string) => {
    if (scriptId === 'machine-facts') {
      return Promise.resolve({
        payload: 'home=/Users/gdc\n',
        generation: 1,
        bytes: 16
      });
    }
    return Promise.resolve({ payload: 'none none', generation: 1, bytes: 9 });
  }
}));

const {
  REMOTE_ARGV_TIMEOUT_MS,
  assertArgvBelongsToMachine,
  findRemoteProgram,
  parseProgramFind,
  parseRemoteWhich,
  rebaseRemoteDir,
  remoteSearchCount,
  remoteSearchDirs,
  remoteWhichCommand
} = await import('../remote-argv');
const { REMOTE_PATH_MARKER } = await import('../carriage');
const { RESTORE_WRONG_MACHINE, noRemoteProgramRefusal } = await import(
  '../remote-copy'
);
const { GmuxError } = await import('../../errors');

import type { RemoteMachineContext } from '../context';

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
  it('names the program, the machine, the count, and says what to do', () => {
    const sentence = noRemoteProgramRefusal('claude', 'Studio', 17);
    expect(sentence).toContain('claude');
    expect(sentence).toContain('Studio');
    expect(sentence).toContain('17 folders');
    expect(sentence).toContain('Install it on Studio');
    expect(sentence).toContain('Nothing was started there');
  });

  it('carries no dash the writing rules refuse', () => {
    const sentence = noRemoteProgramRefusal('codex', 'Studio', 4);
    expect(sentence).not.toContain('—');
    expect(sentence).not.toContain('–');
  });

  /** No transport word reaches a person. */
  it('names no transport and no program of the transport', () => {
    const sentence = noRemoteProgramRefusal('codex', 'Studio', 4);
    for (const word of ['ssh', 'tmux', 'socket', 'PATH', 'pane']) {
      expect(sentence).not.toContain(word);
    }
  });
});

// ---------------------------------------------------------------------------
// PHASE 84, item 10. The three source walk
//
// The composition and the parse are pure and are tested for real. The read
// itself crosses to another computer, and a mocked spawn would prove the mock,
// so the end to end walk is watched by `npm run probe:realunknowns` against the
// operator's Mac Pro and by `GMUX_SMOKE=remote-sessions` against a scratch one.
// ---------------------------------------------------------------------------

describe('rebasing one probe folder on that machine\'s own home', () => {
  it('rebases a tilde entry on the home the machine stated', () => {
    expect(rebaseRemoteDir('~/.claude/local', '/Users/gdc')).toBe(
      '/Users/gdc/.claude/local'
    );
  });

  it('keeps an absolute entry as it is', () => {
    expect(rebaseRemoteDir('/opt/homebrew/bin', '/Users/gdc')).toBe(
      '/opt/homebrew/bin'
    );
  });

  it('reads a bare tilde as the home itself', () => {
    expect(rebaseRemoteDir('~', '/home/gdc')).toBe('/home/gdc');
  });

  /**
   * A glob expanded on another computer is a command deciding its own
   * arguments, and this product does not do that. codex names both of these.
   */
  it('sends neither a value nor a pattern', () => {
    expect(rebaseRemoteDir('$NVM_BIN', '/Users/gdc')).toBeNull();
    expect(rebaseRemoteDir('~/.nvm/versions/node/*/bin', '/Users/gdc')).toBeNull();
    expect(rebaseRemoteDir('~/tools/[abc]/bin', '/Users/gdc')).toBeNull();
    expect(rebaseRemoteDir('~/tools/?/bin', '/Users/gdc')).toBeNull();
  });

  it('sends nothing relative, because it names nothing on its own', () => {
    expect(rebaseRemoteDir('bin', '/Users/gdc')).toBeNull();
    expect(rebaseRemoteDir('./bin', '/Users/gdc')).toBeNull();
  });

  /**
   * PHASE 109, fix 4. Every folder list this module sends is joined with
   * colons, and `pathTemplate` permits a colon in a configured path, so an
   * entry holding one split into two wrong folders on the far side. It is
   * refused whole and counted, the same answer a glob gets.
   */
  it('drops an entry holding a colon, because colons join the sent list', () => {
    expect(rebaseRemoteDir('/opt/a:b', '/Users/gdc')).toBeNull();
    expect(rebaseRemoteDir('~/odd:dir', '/Users/gdc')).toBeNull();
    const { dirs, skipped } = remoteSearchDirs(['/opt/a:b'], '/Users/gdc');
    expect(skipped).toBe(1);
    expect(dirs.join(':')).not.toContain('a:b');
  });

  /** Tortie composes no home path for another computer out of a guess. */
  it('drops a tilde entry when the machine stated no home', () => {
    expect(rebaseRemoteDir('~/.local/bin', '')).toBeNull();
  });
});

describe('the folders one walk asks about', () => {
  it('puts the agent\'s own folders before the install folders', () => {
    const { dirs } = remoteSearchDirs(['~/.claude/local'], '/Users/gdc');
    expect(dirs[0]).toBe('/Users/gdc/.claude/local');
    expect(dirs).toContain('/Users/gdc/.local/bin');
    expect(dirs).toContain('/opt/homebrew/bin');
  });

  it('counts the entries it would not send rather than dropping them silently', () => {
    const { dirs, skipped } = remoteSearchDirs(
      ['$NVM_BIN', '~/.nvm/versions/node/*/bin'],
      '/Users/gdc'
    );
    expect(skipped).toBe(2);
    expect(dirs).not.toContain('$NVM_BIN');
  });

  it('names one folder once, however many lists hold it', () => {
    const { dirs } = remoteSearchDirs(['~/.local/bin'], '/Users/gdc');
    const at = dirs.filter((dir) => dir === '/Users/gdc/.local/bin');
    expect(at).toHaveLength(1);
  });

  /**
   * A machine that would not say where its home is contributes only the folders
   * that do not depend on one. Tortie does not guess at /Users/<somebody>.
   */
  it('keeps only the home free folders when the machine stated no home', () => {
    const { dirs } = remoteSearchDirs(['~/.claude/local'], '');
    expect(dirs).toEqual(['/opt/homebrew/bin', '/usr/local/bin']);
  });
});

describe('how many folders a walk tested', () => {
  it('counts both lists once each', () => {
    expect(remoteSearchCount('/usr/bin:/bin', ['/opt/homebrew/bin'])).toBe(3);
  });

  it('counts a folder on both lists once', () => {
    expect(remoteSearchCount('/usr/local/bin:/bin', ['/usr/local/bin'])).toBe(2);
  });

  it('counts nothing for an empty list', () => {
    expect(remoteSearchCount('', [])).toBe(0);
  });
});

describe('reading what the machine answered', () => {
  it('reads the list word and the path', () => {
    expect(parseProgramFind('install /Users/gdc/.local/bin/claude')).toEqual({
      source: 'install',
      path: '/Users/gdc/.local/bin/claude'
    });
  });

  /**
   * The list word comes first because a folder on another computer can hold a
   * space in its name, so the path is the rest of the line.
   */
  it('keeps a path that holds a space', () => {
    expect(parseProgramFind('path /Users/gdc/my tools/claude')).toEqual({
      source: 'path',
      path: '/Users/gdc/my tools/claude'
    });
  });

  it('reads a machine that found nothing as no answer', () => {
    expect(parseProgramFind('none none')).toBeNull();
  });

  it('refuses anything that is not an absolute path', () => {
    expect(parseProgramFind('path claude')).toBeNull();
    expect(parseProgramFind('path ./claude')).toBeNull();
  });

  it('refuses a list word it does not know', () => {
    expect(parseProgramFind('somewhere /usr/bin/claude')).toBeNull();
  });

  it('refuses an answer with no space in it at all', () => {
    expect(parseProgramFind('')).toBeNull();
    expect(parseProgramFind('none')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PHASE 109. The two refusal arms of the walk, driven over the seam
// ---------------------------------------------------------------------------

describe('the walk that found nothing', () => {
  const CTX: RemoteMachineContext = {
    kind: 'remote',
    machineId: 'studio-machine',
    sshBin: '/usr/bin/ssh',
    host: '127.0.0.1',
    user: 'gdc',
    port: 2222,
    remoteTmuxPath: '/usr/bin/tmux',
    socket: 'gmux-p109-unit',
    controlPath: '/tmp/tortie-501/m-0123456789ab',
    hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' },
    label: 'Studio'
  };

  /** The thrown payload, parsed the way the renderer parses it. */
  async function refusalOf(
    ctx: RemoteMachineContext,
    bare: string
  ): Promise<{ code: string; message: string }> {
    try {
      await findRemoteProgram(ctx, bare, []);
    } catch (err) {
      if (err instanceof GmuxError) {
        return { code: err.payload.code, message: err.payload.message };
      }
      throw err;
    }
    throw new Error('the walk did not refuse');
  }

  it('throws AGENT_NOT_ON_MACHINE, so the sheet can draw a full block', async () => {
    // The `AGENT_INTERPRETER_MISSING` precedent: a different failure gets a
    // different code, because the surface's answer is different. Before this
    // code the refusal fell through to one generic error line.
    const { code } = await refusalOf(CTX, 'claude');
    expect(code).toBe('AGENT_NOT_ON_MACHINE');
  });

  it('names the label the person typed, not the machine id', async () => {
    const { message } = await refusalOf(CTX, 'claude');
    expect(message).toContain('claude on Studio.');
    expect(message).toContain('Install it on Studio');
    expect(message).not.toContain('studio-machine');
  });

  it('falls back to the id for a context written before the label crossed', async () => {
    const { label: _dropped, ...bare } = CTX;
    const { message } = await refusalOf(bare as RemoteMachineContext, 'claude');
    expect(message).toContain('claude on studio-machine.');
  });

  it('keeps INVALID_INPUT for a name that is not a plain program name', async () => {
    // Nothing was asked of any machine for this one, so it is not an absence
    // and it must never grey a tile through the fold back.
    const { code, message } = await refusalOf(CTX, 'bad name');
    expect(code).toBe('INVALID_INPUT');
    expect(message).toContain('Studio');
  });
});
