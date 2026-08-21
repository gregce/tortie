/**
 * Where a tmux command runs, and the one composer for both shapes (Phase 69, M2).
 *
 * THE MOST IMPORTANT TEST IN THIS FILE is the local golden. Fifty-nine call sites
 * now reach tmux through a new door, and the argv this composer builds for the
 * local Mac has to be byte for byte what `tmuxArgs` built at `ab94847`. The golden
 * below is written out from that commit's one line body rather than imported from
 * the current code, because importing the implementation and comparing it against
 * itself would pass whatever the implementation did.
 *
 * Nothing here spawns anything. `tmuxCommand` and `shellCommand` are pure, and the
 * two contexts are shapes rather than this machine's real state.
 */

import { describe, expect, it, vi } from 'vitest';

// PHASE 109. The gate alone is replaced, so `buildRemoteMachineContext` can
// be driven without a keychain record. The hash helper it also imports stays
// real, because it is pure.
vi.mock('../confirm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../confirm')>()),
  assertMachineMayConnect: () => {}
}));

const {
  REMOTE_CONF_PATH,
  buildRemoteMachineContext,
  forgetMachineRuntime,
  machineContext,
  machineGeneration,
  registerRemoteMachineContext,
  remoteTmuxArgv,
  setMachineRemotePath,
  shellCommand,
  tmuxCommand
} = await import('../context');
import type { LocalMachineContext, RemoteMachineContext } from '../context';

const LOCAL: LocalMachineContext = {
  kind: 'local',
  machineId: 'local',
  bin: '/opt/homebrew/bin/tmux',
  socket: 'gmux-p69-unit',
  confPath: '/repo/resources/gmux-tmux.conf',
  binSource: 'dev-path',
  packaged: false
};

const REMOTE: RemoteMachineContext = {
  kind: 'remote',
  machineId: 'popos',
  sshBin: '/usr/bin/ssh',
  host: 'pop-os.tail1a2b.ts.net',
  user: 'greg',
  port: 2222,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p69-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: {
    tortie: '/Users/x/Library/Application Support/Tortie/gmux/machines/known-machines',
    user: '/Users/x/.ssh/known_hosts'
  },
  // Phase 83. It is carried on the context and it reaches no argv. The vectors
  // below are what says so: every one of them is composed from a context that
  // carries a version, and none of the composed strings names it.
  acceptedTmuxVersion: '3.9a'
};

/** The twelve vectors, taken from the real call sites rather than invented. */
const VECTORS: readonly (readonly string[])[] = [
  ['start-server'],
  ['list-sessions', '-F', '#{session_id}'],
  ['display-message', '-p', '#{version}'],
  ['list-sessions', '-F', '#{version}'],
  ['set-environment', '-g', 'PATH', '/usr/bin:/bin'],
  ['set-option', '-g', 'history-limit', '25000'],
  ['set-option', '-g', 'copy-mode-position-format', ''],
  ['set-option', '-g', 'mode-style', 'noattr,bg=default,fg=default'],
  ['show-options', '-gv', 'history-limit'],
  ['capture-pane', '-p', '-J', '-e', '-t', '$3'],
  ['kill-session', '-t', '$7'],
  ['has-session', '-t', '=smoke-keeper']
];

/** `ab94847`'s `tmuxArgs`, typed out: `['-L', socket, '-f', confPath, ...rest]`. */
function goldenAt_ab94847(
  ctx: LocalMachineContext,
  rest: readonly string[]
): string[] {
  return ['-L', ctx.socket, '-f', ctx.confPath, ...rest];
}

describe('the local composition, against ab94847', () => {
  it('is byte for byte the same on all twelve argument vectors', () => {
    for (const rest of VECTORS) {
      const plan = tmuxCommand(LOCAL, rest);
      expect(plan.file).toBe(LOCAL.bin);
      expect([...plan.argv]).toEqual(goldenAt_ab94847(LOCAL, rest));
    }
  });

  it('keeps an empty string argument, because one of the five options is one', () => {
    const plan = tmuxCommand(LOCAL, [
      'set-option',
      '-g',
      'copy-mode-position-format',
      ''
    ]);
    expect(plan.argv[plan.argv.length - 1]).toBe('');
    expect(plan.argv).toHaveLength(8);
  });

  it('passes no argument at all through unchanged', () => {
    expect([...tmuxCommand(LOCAL, []).argv]).toEqual([
      '-L',
      LOCAL.socket,
      '-f',
      LOCAL.confPath
    ]);
  });
});

describe('the remote composition', () => {
  const VERB = ['list-sessions', '-F', '#{session_id}'];
  const plan = tmuxCommand(REMOTE, VERB);
  /**
   * The tmux call, as a list, before it is quoted.
   *
   * The four tests below read THIS rather than `plan.argv`, and the reason is the
   * correction the live probe forced. ssh carries no argv to the other machine. It
   * joins everything after the address with single spaces and hands one string to
   * that machine's login shell. So the whole tmux call travels as ONE quoted
   * argument of `plan.argv`, and picking `-L` back out of that string would be
   * reading the quoting rather than the command. `remoteTmuxArgv` exists so the
   * order is written in exactly one place and can be read as a list. The last test
   * in this block is what ties the two together.
   */
  const remote = remoteTmuxArgv(REMOTE, VERB);

  it('runs the ssh this process resolved, not tmux', () => {
    expect(plan.file).toBe(REMOTE.sshBin);
  });

  it('carries -f /dev/null on EVERY command, not only the boot verb', () => {
    // tmux reads a configuration file when it CREATES a server, and any verb can
    // create the server implicitly. Passing it always is what stops the other
    // machine's own ~/.tmux.conf being read on any path at all.
    const at = remote.indexOf('-f');
    expect(at).toBeGreaterThan(-1);
    expect(remote[at + 1]).toBe(REMOTE_CONF_PATH);
    expect(REMOTE_CONF_PATH).toBe('/dev/null');
  });

  it('names the socket as the value of -L, and never a literal', () => {
    const at = remote.indexOf('-L');
    expect(at).toBeGreaterThan(-1);
    expect(remote[at + 1]).toBe(REMOTE.socket);
    expect(remote).not.toContain('gmux');
    // The composed command must never name the operator's own socket, because
    // that is the one holding his running sessions. The check is on the `-L`
    // value and not on the whole string, because the path to the file Tortie
    // owns legitimately contains the inner `gmux` data directory, and that name
    // is one live data is bound to.
    expect(plan.argv.join(' ')).not.toContain('-L gmux ');
    expect(plan.argv.join(' ')).toContain(`-L ${REMOTE.socket} `);
  });

  it('runs the absolute program path the confirm hash bound', () => {
    expect(remote[0]).toBe(REMOTE.remoteTmuxPath);
    expect(REMOTE.remoteTmuxPath.startsWith('/')).toBe(true);
  });

  it('puts the address before the program and the verb after it', () => {
    const programAt = remote.indexOf(REMOTE.remoteTmuxPath);
    const verbAt = remote.indexOf('list-sessions');
    expect(programAt).toBeLessThan(verbAt);
    // The address comes before the whole remote command in the ssh argv, and the
    // remote command is the last argument.
    const hostAt = plan.argv.indexOf(REMOTE.host);
    expect(hostAt).toBeGreaterThan(-1);
    expect(hostAt).toBe(plan.argv.length - 2);
  });

  it('sends the tmux call as ONE quoted argument, so the far shell cannot eat it', () => {
    // MEASURED 2026-08-17: unquoted, the far side's shell read `#{session_id}` as
    // the start of a comment and dropped it, so the format never reached tmux.
    const last = plan.argv[plan.argv.length - 1];
    expect(last).toContain(REMOTE.remoteTmuxPath);
    expect(last).toContain('-L');
    expect(last).toContain(REMOTE.socket);
    expect(last).toContain(REMOTE_CONF_PATH);
    expect(last).toContain('list-sessions');
    // The format is quoted, so the far side's shell hands it to tmux intact.
    expect(last).toContain("'#{session_id}'");
    // One argument, not six. Nothing after it.
    for (const piece of remote.slice(1)) {
      expect(plan.argv).not.toContain(piece);
    }
  });

  it('carries -p and -l only because this row has both', () => {
    expect(plan.argv).toContain('-p');
    expect(plan.argv).toContain('2222');
    expect(plan.argv).toContain('-l');
    expect(plan.argv).toContain('greg');
    const bare = tmuxCommand(
      { ...REMOTE, port: null, user: null },
      ['list-sessions']
    );
    expect(bare.argv).not.toContain('-p');
    expect(bare.argv).not.toContain('-l');
  });
});

describe('the version a person accepted (Phase 83)', () => {
  it('reaches no argv on either door', () => {
    // The context above carries 3.9a. If any composer put it on a command, a
    // value a person typed into a sheet would be reaching a process.
    const verb = tmuxCommand(REMOTE, ['list-sessions', '-F', '#{session_id}']);
    const shell = shellCommand(REMOTE, 'command -v claude');
    expect(verb.argv.join(' ')).not.toContain('3.9a');
    expect(shell.argv.join(' ')).not.toContain('3.9a');
    expect(remoteTmuxArgv(REMOTE, ['kill-session']).join(' ')).not.toContain(
      '3.9a'
    );
  });

  it('changes not one byte of a composed command', () => {
    const withOne = tmuxCommand(REMOTE, ['list-sessions']);
    const withNone = tmuxCommand(
      { ...REMOTE, acceptedTmuxVersion: null },
      ['list-sessions']
    );
    expect(withOne).toEqual(withNone);
  });
});

describe('the login shell command', () => {
  it('carries the same options and no tmux at all', () => {
    const plan = shellCommand(REMOTE, 'echo hello');
    expect(plan.file).toBe(REMOTE.sshBin);
    expect(plan.argv).not.toContain(REMOTE.remoteTmuxPath);
    expect(plan.argv).not.toContain('-L');
    expect(plan.argv).toContain('ControlMaster=auto');
    // The whole command is ONE argument, so ssh hands it to the far side's shell
    // verbatim rather than a local shell splitting it first.
    expect(plan.argv[plan.argv.length - 1]).toBe('echo hello');
  });
});

// ---------------------------------------------------------------------------
// PHASE 109. The label on the context, and the runtime a removal drops
// ---------------------------------------------------------------------------

describe('the label the person typed (Phase 109)', () => {
  it('reaches no argv on either door', () => {
    // The label exists so a far side refusal can name the machine the way the
    // person named it. If any composer put it on a command, a presentation
    // string would be reaching a process.
    const labelled: RemoteMachineContext = { ...REMOTE, label: 'Pop Studio' };
    const verb = tmuxCommand(labelled, ['list-sessions', '-F', '#{session_id}']);
    const shell = shellCommand(labelled, 'command -v claude');
    expect(verb.argv.join(' ')).not.toContain('Pop Studio');
    expect(shell.argv.join(' ')).not.toContain('Pop Studio');
    expect(
      remoteTmuxArgv(labelled, ['kill-session']).join(' ')
    ).not.toContain('Pop Studio');
  });

  it('changes not one byte of a composed command', () => {
    const withOne = tmuxCommand({ ...REMOTE, label: 'Pop Studio' }, [
      'list-sessions'
    ]);
    const withNone = tmuxCommand({ ...REMOTE, label: null }, ['list-sessions']);
    const absent = tmuxCommand(REMOTE, ['list-sessions']);
    expect(withOne).toEqual(withNone);
    expect(withOne).toEqual(absent);
  });

  it('is carried by the builder and is null when the caller has none', () => {
    // The gate is replaced by a no-op above; everything else in the builder is
    // the real composition. `label` is not on MachineExecutionFields, which is
    // the type level half of "the hash does not move for it";
    // `npm run conformance:machines` condition 2 is the executable half.
    const input = {
      machineId: 'p109-label',
      fields: {
        host: '127.0.0.1',
        user: 'greg',
        port: 2222,
        remoteTmuxPath: '/usr/bin/tmux',
        acceptedTmuxVersion: null
      },
      packaged: false,
      env: {} as NodeJS.ProcessEnv,
      home: '/Users/x',
      uid: 501,
      tortieHostKeys: '/t/known-machines'
    };
    const named = buildRemoteMachineContext({ ...input, label: 'Pop OS' });
    expect(named.label).toBe('Pop OS');
    const bare = buildRemoteMachineContext(input);
    expect(bare.label).toBeNull();
  });
});

describe('forgetMachineRuntime (Phase 109, fix 7)', () => {
  it('drops the context and the generation record for one machine', () => {
    const ctx: RemoteMachineContext = { ...REMOTE, machineId: 'p109-forget' };
    registerRemoteMachineContext(ctx);
    setMachineRemotePath('p109-forget', '/usr/bin:/bin');
    expect(machineGeneration('p109-forget')).toEqual({
      generation: 1,
      remotePath: '/usr/bin:/bin'
    });
    expect(machineContext('p109-forget')).toBe(ctx);

    forgetMachineRuntime('p109-forget');
    expect(machineGeneration('p109-forget')).toEqual({
      generation: 0,
      remotePath: null
    });
    expect(() => machineContext('p109-forget')).toThrow(/has not signed in/);
  });

  it('leaves every other machine alone', () => {
    registerRemoteMachineContext({ ...REMOTE, machineId: 'p109-keep' });
    registerRemoteMachineContext({ ...REMOTE, machineId: 'p109-drop' });
    forgetMachineRuntime('p109-drop');
    expect(machineGeneration('p109-keep').generation).toBe(1);
    expect(machineContext('p109-keep').machineId).toBe('p109-keep');
    forgetMachineRuntime('p109-keep');
  });

  it('makes a machine added back start at generation one, like a new one', () => {
    registerRemoteMachineContext({ ...REMOTE, machineId: 'p109-again' });
    registerRemoteMachineContext({ ...REMOTE, machineId: 'p109-again' });
    expect(machineGeneration('p109-again').generation).toBe(2);
    forgetMachineRuntime('p109-again');
    registerRemoteMachineContext({ ...REMOTE, machineId: 'p109-again' });
    expect(machineGeneration('p109-again').generation).toBe(1);
    forgetMachineRuntime('p109-again');
  });
});
