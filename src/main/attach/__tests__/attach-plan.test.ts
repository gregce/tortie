/**
 * The attach composition, for both kinds of machine (Phase 70, M3).
 *
 * TWO PROMISES ARE UNDER TEST HERE, and they are different in kind.
 *
 * The first is that the LOCAL attach did not move by one byte. Fifty-odd
 * releases of local sessions attach through this argv, and the only reason it
 * changed file at all is that a second shape arrived beside it. So the golden
 * below is WRITTEN OUT from `attach-host.ts` at `b660df9` rather than imported
 * from the module under test, because importing the implementation and comparing
 * it against itself would pass whatever the implementation did.
 *
 * The second is that the REMOTE attach carries everything research 51 section
 * 4.1 says it must: a forced terminal, every option of the carriage, the
 * configuration refusal, the UTF-8 flag, an absolute program, the socket read
 * from the machine rather than written here, and an exact name match.
 *
 * And one rule about the module itself. Phase 69 found that reading a constant
 * from a module that loads `node-pty` put a native terminal binding into the
 * import graph of the durable manifest store, and the measured failure was
 * `node build/contract-inventory.mjs --check` crashing rather than diffing. This
 * rung adds an attach over ssh, so it is exactly the rung that can undo that
 * fix. The import test below reads this module's own import lines and fails on
 * anything outside a short allowed list.
 *
 * Nothing here spawns anything. `attachPlan` is pure and both contexts are
 * shapes rather than this machine's real state.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REQUIRED_SSH_OPTIONS } from '../../machines/ssh';
import type { RemoteMachineContext } from '../../machines/context';
import { attachPlan, type AttachTargetLocal } from '../attach-plan';

const planSource = readFileSync(join(__dirname, '..', 'attach-plan.ts'), 'utf8');

/**
 * Every module `../attach-plan.ts` may import. Nothing that spawns a process,
 * opens a terminal or loads a native module belongs on this list, now or later.
 */
const ALLOWED_IMPORTS = [
  '../machines/context',
  '../machines/ssh',
  '../restore/command',
  'node:path'
];

const REMOTE: RemoteMachineContext = {
  kind: 'remote',
  machineId: 'popos',
  sshBin: '/usr/bin/ssh',
  host: 'pop-os.tail1a2b.ts.net',
  user: 'greg',
  port: 2222,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p70-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: {
    tortie: '/Users/x/Library/Application Support/Tortie/gmux/machines/known-machines',
    user: '/Users/x/.ssh/known_hosts'
  }
};

function remotePlan(tmuxName = 'proj--one') {
  return attachPlan({ kind: 'remote', ctx: REMOTE, tmuxName });
}

/** The single argument ssh carries to the other machine's login shell. */
function remoteCommand(tmuxName = 'proj--one'): string {
  const argv = remotePlan(tmuxName).argv;
  return argv[argv.length - 1] ?? '';
}

// ---------------------------------------------------------------------------
// The local golden, taken from b660df9
// ---------------------------------------------------------------------------

interface Vector {
  readonly what: string;
  readonly target: AttachTargetLocal;
  readonly golden: readonly string[];
}

/**
 * What `attach-host.ts` composed at `b660df9`, for eight shapes of caller.
 *
 * The last one is the shape the one production caller actually sends: an
 * immutable `$`-id, which `=$3` addresses exactly and which no rename can move.
 */
const VECTORS: readonly Vector[] = [
  {
    what: 'a plain name',
    target: {
      kind: 'local',
      bin: '/opt/homebrew/bin/tmux',
      socket: 'gmux',
      confPath: '/repo/resources/gmux-tmux.conf',
      tmuxName: 'proj--one'
    },
    golden: [
      '-u',
      '-L',
      'gmux',
      '-f',
      '/repo/resources/gmux-tmux.conf',
      'attach-session',
      '-t',
      '=proj--one'
    ]
  },
  {
    what: 'a name with a space',
    target: {
      kind: 'local',
      bin: '/opt/homebrew/bin/tmux',
      socket: 'gmux',
      confPath: '/repo/resources/gmux-tmux.conf',
      tmuxName: 'my session'
    },
    golden: [
      '-u',
      '-L',
      'gmux',
      '-f',
      '/repo/resources/gmux-tmux.conf',
      'attach-session',
      '-t',
      '=my session'
    ]
  },
  {
    what: 'a name with a hyphen',
    target: {
      kind: 'local',
      bin: '/opt/homebrew/bin/tmux',
      socket: 'gmux',
      confPath: '/repo/resources/gmux-tmux.conf',
      tmuxName: 'api-gateway'
    },
    golden: [
      '-u',
      '-L',
      'gmux',
      '-f',
      '/repo/resources/gmux-tmux.conf',
      'attach-session',
      '-t',
      '=api-gateway'
    ]
  },
  {
    // The host at b660df9 added `=` unconditionally, so a caller that already
    // wrote one got two. That is the golden, and this vector pins it rather
    // than tidying it: the composer must not start collapsing prefixes that a
    // caller chose.
    what: 'a name a caller already prefixed with =',
    target: {
      kind: 'local',
      bin: '/opt/homebrew/bin/tmux',
      socket: 'gmux',
      confPath: '/repo/resources/gmux-tmux.conf',
      tmuxName: '=already'
    },
    golden: [
      '-u',
      '-L',
      'gmux',
      '-f',
      '/repo/resources/gmux-tmux.conf',
      'attach-session',
      '-t',
      '==already'
    ]
  },
  {
    what: 'a non-default socket',
    target: {
      kind: 'local',
      bin: '/opt/homebrew/bin/tmux',
      socket: 'gmux-smoke-t3',
      confPath: '/repo/resources/gmux-tmux.conf',
      tmuxName: 'proj--one'
    },
    golden: [
      '-u',
      '-L',
      'gmux-smoke-t3',
      '-f',
      '/repo/resources/gmux-tmux.conf',
      'attach-session',
      '-t',
      '=proj--one'
    ]
  },
  {
    what: 'a non-default configuration path',
    target: {
      kind: 'local',
      bin: '/Applications/Tortie.app/Contents/Resources/tmux/bin/tmux',
      socket: 'gmux',
      confPath:
        '/Applications/Tortie.app/Contents/Resources/resources/gmux-tmux.conf',
      tmuxName: 'proj--one'
    },
    golden: [
      '-u',
      '-L',
      'gmux',
      '-f',
      '/Applications/Tortie.app/Contents/Resources/resources/gmux-tmux.conf',
      'attach-session',
      '-t',
      '=proj--one'
    ]
  },
  {
    what: 'a long name',
    target: {
      kind: 'local',
      bin: '/opt/homebrew/bin/tmux',
      socket: 'gmux',
      confPath: '/repo/resources/gmux-tmux.conf',
      tmuxName: `${'a'.repeat(120)}--tail`
    },
    golden: [
      '-u',
      '-L',
      'gmux',
      '-f',
      '/repo/resources/gmux-tmux.conf',
      'attach-session',
      '-t',
      `=${'a'.repeat(120)}--tail`
    ]
  },
  {
    what: 'a name whose body is only digits, which is what a $-id looks like',
    target: {
      kind: 'local',
      bin: '/opt/homebrew/bin/tmux',
      socket: 'gmux',
      confPath: '/repo/resources/gmux-tmux.conf',
      tmuxName: '$3'
    },
    golden: [
      '-u',
      '-L',
      'gmux',
      '-f',
      '/repo/resources/gmux-tmux.conf',
      'attach-session',
      '-t',
      '=$3'
    ]
  }
];

describe('the local attach did not move by one byte', () => {
  for (const vector of VECTORS) {
    it(`composes ${vector.what} exactly as b660df9 did`, () => {
      const plan = attachPlan(vector.target);
      expect(plan.file).toBe(vector.target.bin);
      expect(plan.argv).toEqual(vector.golden);
    });
  }

  it('runs the tmux it was handed and never a bare name', () => {
    for (const vector of VECTORS) {
      expect(attachPlan(vector.target).file.startsWith('/')).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// The remote shape
// ---------------------------------------------------------------------------

describe('the remote attach carries the ATTACH row of research 51 section 4.1', () => {
  it('runs the ssh client this process resolved', () => {
    expect(remotePlan().file).toBe(REMOTE.sshBin);
  });

  it('forces a terminal, and does it with the first argument', () => {
    // Without a terminal ssh gives the remote command no tty at all and tmux
    // refuses to attach. Index 0 is asserted so a later option cannot be
    // inserted in front of it and quietly change what ssh parses first.
    expect(remotePlan().argv[0]).toBe('-t');
  });

  it('carries every option of the carriage', () => {
    const text = remotePlan().argv.join(' ');
    for (const option of REQUIRED_SSH_OPTIONS) {
      expect(text).toContain(option);
    }
  });

  it('names the machine after its options and before the command', () => {
    const argv = remotePlan().argv;
    expect(argv[argv.length - 2]).toBe(REMOTE.host);
  });

  it('sends the whole tmux call as ONE quoted argument', () => {
    // ssh joins everything after the address with single spaces and hands the
    // resulting string to that machine's login shell. Phase 69 measured what
    // separate arguments do to a `;` and to a `#{...}`, and the answer was that
    // both were eaten in silence.
    const argv = remotePlan('my session').argv;
    expect(argv.filter((a) => a.includes('attach-session'))).toHaveLength(1);
    expect(argv[argv.length - 1]).toContain("'=my session'");
  });

  it('refuses that machine\'s own configuration file', () => {
    // One flag more than the research table's ATTACH row, on purpose: any verb
    // can create a server implicitly, and a server born without this reads that
    // machine's own file. It is inert on a live server, which is the only state
    // an attach meets.
    expect(remoteCommand()).toContain('-f /dev/null');
  });

  it('says the client is UTF-8', () => {
    expect(remoteCommand().split(' ')).toContain('-u');
  });

  it('attaches, and matches the name exactly', () => {
    const parts = remoteCommand().split(' ');
    expect(parts).toContain('attach-session');
    expect(parts[parts.indexOf('attach-session') + 1]).toBe('-t');
    expect(parts[parts.indexOf('attach-session') + 2]).toBe("'=proj--one'");
  });

  it('quotes the target so the far side cannot rewrite it', () => {
    // MEASURED 2026-08-17 by build/probe-remote-attach.mjs: an unquoted
    // `=p70-attach-77211` came back as "zsh:1: p70-attach-77211 not found",
    // because zsh replaces a word beginning with `=` with the path of the
    // command named after it. Every target is quoted whatever it looks like.
    for (const name of ['proj--one', '$3', 'my session', '=already', '3']) {
      const command = remoteCommand(name);
      expect(command.endsWith(`'=${name}'`)).toBe(true);
    }
  });

  it('names the absolute program the confirm hash bound, never a bare name', () => {
    expect(remoteCommand().startsWith(`${REMOTE.remoteTmuxPath} `)).toBe(true);
  });

  it('reads the socket from the machine rather than from a literal', () => {
    const other: RemoteMachineContext = { ...REMOTE, socket: 'gmux-p70-other' };
    const command = attachPlan({
      kind: 'remote',
      ctx: other,
      tmuxName: 'proj--one'
    }).argv;
    expect(command[command.length - 1]).toContain('-L gmux-p70-other');
  });

  it('never writes a socket name of its own', () => {
    // The far side of the live probe is this Mac, so a literal real socket name
    // in this module would put a remote command on the server holding the
    // operator's live sessions.
    expect(planSource).not.toContain('gmux');
  });

  it('leaves an unset port and an unset user off the command line', () => {
    const bare: RemoteMachineContext = { ...REMOTE, port: null, user: null };
    const argv = attachPlan({
      kind: 'remote',
      ctx: bare,
      tmuxName: 'proj--one'
    }).argv;
    expect(argv).not.toContain('-p');
    expect(argv).not.toContain('-l');
  });
});

// ---------------------------------------------------------------------------
// The import rule
// ---------------------------------------------------------------------------

describe('the plan module imports nothing that could start something', () => {
  it('imports only from the allowed list', () => {
    const specifiers = [...planSource.matchAll(/from '([^']+)'/g)].map(
      (match) => match[1]
    );
    expect(specifiers.length).toBeGreaterThan(0);
    for (const specifier of specifiers) {
      expect(ALLOWED_IMPORTS).toContain(specifier);
    }
  });

  it('imports neither node-pty nor child_process, in any form', () => {
    const sites = [
      ...planSource.matchAll(/(?:from|require\()\s*'([^']+)'/g)
    ].map((match) => match[1]);
    expect(sites).not.toContain('node-pty');
    expect(sites).not.toContain('child_process');
    expect(sites).not.toContain('node:child_process');
  });
});
