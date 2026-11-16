/**
 * Phase 368 (build/p368/SPEC.md D18, §4.5 item 9): links reach the terminal.
 *
 * tmux keeps every OSC 8 link a program prints and writes it only to a client
 * that has the `hyperlinks` feature, so the attach asks for it with `-T
 * hyperlinks`. On this Mac always; on another machine only when that machine's
 * SERVER and its PROGRAM are both a version that parses the flag and reads the
 * feature at the index the program sends (3.4 and later; section 0.1 item 9).
 *
 * Three things are held here, each from the outside:
 *
 *  1. the local argv, through the composer and through the attach host;
 *  2. the far gate over EVERY pair of the nine far versions Tortie has measured
 *     and a program that named none, with the expected answer computed from a
 *     list of the too-old versions written out here, never from the gate's own
 *     list, and read through far-tmux's live memory (a pair read against a
 *     server that has since restarted at another version answers no);
 *  3. the far argv with and without the flag, spawned by the attach host over
 *     fakes, so `planFor` is shown to hand the gate's answer to the composer.
 *
 * Nothing here spawns a real process or opens a terminal.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemoteMachineContext } from '../../machines/context';
import {
  noteFarPair,
  noteFarServerVersion,
  resetFarTmuxForTests
} from '../../machines/far-tmux';
import { TESTED_REMOTE_TMUX_VERSIONS } from '../../tmux/version';
import { attachPlan } from '../attach-plan';
import {
  HYPERLINK_FAR_VERSIONS,
  farAttachHyperlinks,
  farAttachTakesHyperlinks
} from '../hyperlinks-gate';

// ---------------------------------------------------------------------------
// Fakes for the attach host, as attach-host.test.ts makes them
// ---------------------------------------------------------------------------

interface Spawned {
  file: string;
  argv: string[];
  opts: { cols: number; rows: number };
}

// Hoisted with the mocks: the version table this file imports at the top
// reaches the log module, which reads `electron` before the body runs.
const { fakeIpcMain, spawned } = vi.hoisted(() => ({
  fakeIpcMain: { on: () => undefined, removeListener: () => undefined },
  spawned: [] as Spawned[]
}));
vi.mock('electron', () => ({ ipcMain: fakeIpcMain }));

vi.mock('node-pty', () => ({
  spawn: vi.fn((file: string, argv: string[], opts: { cols: number; rows: number }) => {
    spawned.push({ file, argv, opts });
    return {
      pid: 1,
      write: vi.fn(),
      resize: vi.fn(),
      kill: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      onData: () => undefined,
      onExit: () => undefined
    };
  })
}));
vi.mock('../../tmux/resolve', () => ({
  findTmuxBinary: () => '/usr/bin/false',
  resolveConfPath: () => '/dev/null',
  resolveTmux: () => ({
    path: '/usr/bin/false',
    source: 'dev-path',
    packaged: false,
    detail: '/usr/bin/false'
  }),
  tmuxUnavailableError: () => new Error('no tmux'),
  activeTmuxSocket: () => 'p368-unit',
  assertConfUsable: () => undefined
}));
vi.mock('../../tmux/supervisor', () => ({ TMUX_SOCKET: 'p368-unit' }));
vi.mock('../../tmux/env', () => ({
  withUtf8Locale: (env: Record<string, string | undefined>) => env
}));

const { AttachHost } = await import('../attach-host');

const MACHINE: RemoteMachineContext = {
  kind: 'remote',
  machineId: 'far-one',
  sshBin: '/usr/bin/ssh',
  host: 'far-one.example.invalid',
  user: 'person',
  port: 2222,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'p368-far',
  controlPath: '/tmp/tortie-501/m-p368',
  hostKeys: {
    tortie: '/Users/x/Library/Application Support/Tortie/known-machines',
    user: '/Users/x/.ssh/known_hosts'
  }
};

function makeSender(): never {
  return {
    isDestroyed: () => false,
    once: vi.fn(),
    removeListener: vi.fn(),
    send: vi.fn()
  } as never;
}

function host(): InstanceType<typeof AttachHost> {
  return new AttachHost({
    tmuxBin: '/opt/fake/tmux',
    confPath: '/opt/fake/tmux.conf',
    socketName: 'p368-unit'
  });
}

/** The one string ssh hands the far machine's login shell. */
function farCommand(argv: readonly string[]): string {
  return argv[argv.length - 1] ?? '';
}

beforeEach(() => {
  spawned.length = 0;
  resetFarTmuxForTests();
});

// ---------------------------------------------------------------------------
// 1. The local argv
// ---------------------------------------------------------------------------

describe('the local attach asks for links', () => {
  it('composes -T hyperlinks right after -u, before the socket', () => {
    const plan = attachPlan({
      kind: 'local',
      bin: '/opt/fake/tmux',
      socket: 'p368-unit',
      confPath: '/opt/fake/tmux.conf',
      tmuxName: '$7'
    });
    expect(plan.argv).toEqual([
      '-u',
      '-T',
      'hyperlinks',
      '-L',
      'p368-unit',
      '-f',
      '/opt/fake/tmux.conf',
      'attach-session',
      '-t',
      '=$7'
    ]);
  });

  it('is what the attach host spawns for a session on this Mac', () => {
    host().attach({ sessionId: 's-local', tmuxName: '$7', sender: makeSender() });
    expect(spawned).toHaveLength(1);
    expect(spawned[0]?.file).toBe('/opt/fake/tmux');
    expect(spawned[0]?.argv.slice(0, 3)).toEqual(['-u', '-T', 'hyperlinks']);
  });
});

// ---------------------------------------------------------------------------
// 2. The far gate
// ---------------------------------------------------------------------------

/**
 * Written out here, never read from the gate: the measured far versions whose
 * program or server cannot take the flag (3.2a and 3.3a parse `-T` but read
 * index 4 as `cstyle`; section 0.1 item 9).
 */
const TOO_OLD = ['3.2a', '3.3a'];
const MEASURED = TESTED_REMOTE_TMUX_VERSIONS.map((row) => row.version);

describe('the far gate (D18)', () => {
  it('reads the nine far versions Tortie measured, oldest first', () => {
    expect(MEASURED).toEqual(['3.2a', '3.3a', '3.4', '3.5a', '3.6', '3.6a', '3.6b', '3.7b', '3.7c']);
  });

  it('lists exactly the measured far versions from 3.4 on, frozen', () => {
    expect([...HYPERLINK_FAR_VERSIONS]).toEqual(MEASURED.filter((v) => !TOO_OLD.includes(v)));
    expect(Object.isFrozen(HYPERLINK_FAR_VERSIONS)).toBe(true);
    for (const old of [...TOO_OLD, '3.1c', '3.0a', '2.9a']) {
      expect(HYPERLINK_FAR_VERSIONS).not.toContain(old);
    }
  });

  it('answers yes for exactly the pairs whose server AND program are both 3.4 or later', () => {
    let yes = 0;
    let asked = 0;
    for (const server of MEASURED) {
      for (const program of [...MEASURED, null]) {
        const want = !TOO_OLD.includes(server) && program !== null && !TOO_OLD.includes(program);
        expect(farAttachTakesHyperlinks({ server, program }), `${server} beside ${String(program)}`).toBe(
          want
        );
        asked += 1;
        if (want) yes += 1;
      }
    }
    // Nine servers by nine programs and a program that named none; 7 × 7 say yes.
    expect(asked).toBe(90);
    expect(yes).toBe(49);
  });

  it('answers no for no pair at all and for any version nobody measured, however close', () => {
    expect(farAttachTakesHyperlinks(null)).toBe(false);
    for (const odd of ['3.1c', '3.5', '3.4a', '3.8', 'next-3.8', '3.7b ', ' 3.7b', '', 'tmux 3.7b']) {
      expect(farAttachTakesHyperlinks({ server: odd, program: '3.7b' }), `server ${odd}`).toBe(false);
      expect(farAttachTakesHyperlinks({ server: '3.7b', program: odd }), `program ${odd}`).toBe(false);
    }
  });
});

describe('the far gate reads far-tmux.ts\'s pair, only while its server is current', () => {
  it('says no for a machine nothing was read about', () => {
    expect(farAttachHyperlinks('far-one')).toBe(false);
  });

  it('says yes for a server the set-up started, which records the program as the server', () => {
    noteFarServerVersion('far-one', '3.7b');
    noteFarPair('far-one', '3.7b', '3.7b');
    expect(farAttachHyperlinks('far-one')).toBe(true);
    // Another machine is not this one.
    expect(farAttachHyperlinks('far-two')).toBe(false);
  });

  it('says no for a warm server from 3.6 on, whose program Prepare does not read', () => {
    noteFarServerVersion('far-one', '3.6a');
    noteFarPair('far-one', '3.6a', null);
    expect(farAttachHyperlinks('far-one')).toBe(false);
  });

  it('says no for a measured pair whose server is too old, though its program is not', () => {
    // 3.3a's row lists 3.5a among its programs, a pair Phase 342 measured.
    noteFarServerVersion('far-one', '3.3a');
    noteFarPair('far-one', '3.3a', '3.5a');
    expect(farAttachHyperlinks('far-one')).toBe(false);
  });

  it('stops saying yes the moment a read notes another server version', () => {
    noteFarServerVersion('far-one', '3.5a');
    noteFarPair('far-one', '3.5a', '3.5a');
    expect(farAttachHyperlinks('far-one')).toBe(true);
    noteFarServerVersion('far-one', '3.3a');
    expect(farAttachHyperlinks('far-one')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. The far argv, spawned by the attach host
// ---------------------------------------------------------------------------

describe('the attach host hands the gate\'s answer to the composer', () => {
  const TODAY = "/usr/bin/tmux -L p368-far -f /dev/null -u attach-session -t '=$4'";
  const WITH_LINKS = "/usr/bin/tmux -L p368-far -f /dev/null -u -T hyperlinks attach-session -t '=$4'";

  function attachFar(): Spawned {
    host().attach({ sessionId: 's-far', tmuxName: '$4', sender: makeSender(), machine: MACHINE });
    const one = spawned[spawned.length - 1];
    if (one === undefined) throw new Error('nothing was spawned');
    return one;
  }

  it('spawns today\'s far call for a machine nothing was read about', () => {
    const one = attachFar();
    expect(one.file).toBe('/usr/bin/ssh');
    expect(farCommand(one.argv)).toBe(TODAY);
  });

  it('spawns the far call with -T hyperlinks when the server and program are both 3.4 or later', () => {
    noteFarServerVersion('far-one', '3.6b');
    noteFarPair('far-one', '3.6b', '3.6b');
    expect(farCommand(attachFar().argv)).toBe(WITH_LINKS);
  });

  it('spawns today\'s far call for a warm 3.7b server whose program was never read', () => {
    noteFarServerVersion('far-one', '3.7b');
    noteFarPair('far-one', '3.7b', null);
    expect(farCommand(attachFar().argv)).toBe(TODAY);
  });

  it('spawns today\'s far call once that server restarts at a version too old', () => {
    noteFarServerVersion('far-one', '3.4');
    noteFarPair('far-one', '3.4', '3.4');
    expect(farCommand(attachFar().argv)).toBe(WITH_LINKS);
    noteFarServerVersion('far-one', '3.2a');
    expect(farCommand(attachFar().argv)).toBe(TODAY);
  });
});

// ---------------------------------------------------------------------------
// The one decider, read from the tree
// ---------------------------------------------------------------------------

/** `text` with its comments taken out, by a walk that knows a string from a comment. */
function codeOf(text: string): string {
  let out = '';
  let quote: string | null = null;
  for (let i = 0; i < text.length; i += 1) {
    const c = text.charAt(i);
    const next = text.charAt(i + 1);
    if (quote !== null) {
      out += c;
      if (c === '\\') {
        out += next;
        i += 1;
      } else if (c === quote) {
        quote = null;
      }
      continue;
    }
    if (c === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 1;
      continue;
    }
    if (c === '/' && next === '/') {
      const end = text.indexOf('\n', i);
      i = end === -1 ? text.length : end - 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    out += c;
  }
  return out;
}

describe('one decider', () => {
  const hostCode = codeOf(readFileSync(join(__dirname, '..', 'attach-host.ts'), 'utf8'));
  const planCode = codeOf(readFileSync(join(__dirname, '..', 'attach-plan.ts'), 'utf8'));

  it('the attach host sets hyperlinks from farAttachHyperlinks and from nothing else', () => {
    expect(hostCode.split('farAttachHyperlinks(').length - 1).toBe(1);
    expect(hostCode).toContain('hyperlinks: farAttachHyperlinks(req.machine.machineId)');
    expect(hostCode.split('hyperlinks:').length - 1).toBe(1);
  });

  it('the composer adds the far flag only behind an explicit true', () => {
    expect(planCode).toContain('target.hyperlinks === true');
    // Two spellings of the flag pair: the local argv and the far one.
    expect(planCode.split("'hyperlinks'").length - 1).toBe(2);
  });
});
