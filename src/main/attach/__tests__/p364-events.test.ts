/**
 * Phase 364: the attach host's diagnostic records (build/p364/SPEC.md §4.3,
 * D9).
 *
 * Check type: contract test over the REAL `AttachHost`, the REAL flag
 * (`../../diagnostic-build/flag`) and the REAL record composer
 * (`../../diagnostic-build/events`), with `logEvent` captured. The define is
 * the global the flag reads, stubbed per load with a fresh module graph
 * (vitest turns a config `define` into exactly that global, so a stub wins
 * over it). node-pty and ipcMain are fakes: no terminal is started.
 *
 * What it pins, at the two points D9 names in attach-host.ts:
 *  - a spawn: the session id, the kind of client and the new pid, and never
 *    the argv (the program, the socket or the session's name);
 *  - an exit: the session id, the exit code, the signal when there is one,
 *    and whether Tortie caused it, for an exit nobody asked for and for a
 *    detach;
 *  - a spawn that fails writes no record;
 *  - with the define off, the same drive writes no record at all.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemoteMachineContext } from '../../machines/context';

interface LogRecord {
  readonly scope: string;
  readonly level: string;
  readonly event: string;
  readonly msg: string;
  readonly fields: Record<string, unknown> | undefined;
}

const records = vi.hoisted(() => [] as LogRecord[]);

vi.mock('../../log', async (importOriginal) => {
  const real = await importOriginal<typeof import('../../log')>();
  return {
    ...real,
    logEvent: (scope: string, level: string, event: string, msg: string, fields?: Record<string, unknown>) => {
      records.push({ scope, level, event, msg, fields });
    }
  };
});

vi.mock('electron', () => ({
  ipcMain: { on: () => undefined, removeListener: () => undefined }
}));

interface FakePty {
  readonly pid: number;
  readonly file: string;
  readonly argv: string[];
  kill: ReturnType<typeof vi.fn>;
  exit(e: { exitCode: number; signal?: number }): void;
}

const ptys = vi.hoisted(() => ({
  made: [] as FakePty[],
  nextPid: 70_001,
  /** The next spawn throws, as node-pty does when it cannot start the program. */
  failNext: false
}));

vi.mock('node-pty', () => ({
  spawn: (file: string, argv: string[]) => {
    if (ptys.failNext) {
      ptys.failNext = false;
      throw new Error('posix_spawnp failed.');
    }
    let onExit: ((e: { exitCode: number; signal?: number }) => void) | null = null;
    const pty: FakePty = {
      pid: ptys.nextPid,
      file,
      argv,
      kill: vi.fn(),
      exit: (e) => onExit?.(e)
    };
    ptys.nextPid += 1;
    ptys.made.push(pty);
    return {
      pid: pty.pid,
      write: () => undefined,
      resize: () => undefined,
      kill: pty.kill,
      pause: () => undefined,
      resume: () => undefined,
      onData: () => undefined,
      onExit: (cb: (e: { exitCode: number; signal?: number }) => void) => {
        onExit = cb;
      }
    };
  }
}));

// The host is handed an explicit program, configuration and socket, so these
// only need the names to exist (as in attach-host.test.ts).
vi.mock('../../tmux/resolve', () => ({
  findTmuxBinary: () => '/usr/bin/false',
  resolveConfPath: () => '/dev/null',
  resolveTmux: () => ({ path: '/usr/bin/false', source: 'dev-path', packaged: false, detail: '/usr/bin/false' }),
  tmuxUnavailableError: () => new Error('no tmux'),
  activeTmuxSocket: () => 'gmux-p364-events',
  assertConfUsable: () => undefined
}));
vi.mock('../../tmux/supervisor', () => ({ TMUX_SOCKET: 'gmux' }));
vi.mock('../../tmux/env', () => ({
  withUtf8Locale: (env: Record<string, string | undefined>) => env
}));

const MACHINE: RemoteMachineContext = {
  kind: 'remote',
  machineId: 'p364-far',
  sshBin: '/usr/bin/ssh',
  host: 'far.p364.invalid',
  user: 'nobody',
  port: 2222,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p364-far',
  controlPath: '/tmp/tortie-501/m-p364',
  hostKeys: { tortie: '/scratch/p364/known-machines', user: '/scratch/p364/known_hosts' }
};

/** A session name the record may not carry: it rides in the argv. */
const NAME = 'p364-a-name-only-the-argv-carries';

function sender() {
  return {
    isDestroyed: () => false,
    once: () => undefined,
    removeListener: () => undefined,
    send: () => undefined
  };
}

/** The attach host module, loaded fresh under the define. */
async function attachHostWith(diagnostic: boolean): Promise<typeof import('../attach-host')> {
  vi.resetModules();
  vi.stubGlobal('__TORTIE_DIAGNOSTIC__', diagnostic);
  return import('../attach-host');
}

const diagnostic = (): LogRecord[] => records.filter((r) => r.event.startsWith('diagnostic.'));

/** A record as diagnosticEvent composes it (src/main/diagnostic-build/events.ts). */
const record = (what: string, fields: Record<string, number | string>): LogRecord => ({
  scope: 'diagnostic',
  level: 'info',
  event: 'diagnostic.terminal',
  msg: `terminal ${what}`,
  fields: { ...fields, what }
});

/**
 * One drive through both points: a local attach whose client dies on its own
 * (a signal), a re-attach that replaces it, the replacement detached, a
 * remote attach whose link goes, and a spawn that fails.
 */
function drive(mod: typeof import('../attach-host')): { exitsSeen: [string, number, boolean, string][]; failed: unknown } {
  const exitsSeen: [string, number, boolean, string][] = [];
  const h = new mod.AttachHost({
    tmuxBin: '/opt/fake/tmux',
    confPath: '/opt/fake/gmux-tmux.conf',
    socketName: 'gmux-p364-events',
    onExit: (id, code, expected, kind) => exitsSeen.push([id, code, expected, kind])
  });
  h.attach({ sessionId: 's-local', tmuxName: NAME, sender: sender() as never });
  ptys.made[0]!.exit({ exitCode: 1, signal: 15 });
  h.attach({ sessionId: 's-local', tmuxName: NAME, sender: sender() as never });
  h.detach('s-local');
  // node-pty's exit event types its signal as optional, so an exit with none is driven too.
  ptys.made[1]!.exit({ exitCode: 0 });
  h.attach({ sessionId: 's-far', tmuxName: NAME, sender: sender() as never, machine: MACHINE });
  ptys.made[2]!.exit({ exitCode: 255, signal: 0 });
  ptys.failNext = true;
  let failed: unknown = null;
  try {
    h.attach({ sessionId: 's-fails', tmuxName: NAME, sender: sender() as never });
  } catch (err) {
    failed = err;
  }
  return { exitsSeen, failed };
}

beforeEach(() => {
  records.length = 0;
  ptys.made.length = 0;
  ptys.nextPid = 70_001;
  ptys.failNext = false;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the diagnostic build', () => {
  it('records each spawn and each exit, with the fields D9 names and nothing else', async () => {
    const { exitsSeen, failed } = drive(await attachHostWith(true));
    // The drive did what it says.
    expect(ptys.made).toHaveLength(3);
    expect(String((failed as Error | null)?.message)).toContain('SPAWN_FAILED');
    expect(exitsSeen).toEqual([
      ['s-local', 1, false, 'local'],
      ['s-local', 0, true, 'local'],
      ['s-far', 255, false, 'remote']
    ]);
    expect(diagnostic()).toEqual([
      record('spawn', { sessionId: 's-local', kind: 'local', pid: 70_001 }),
      record('exit', { sessionId: 's-local', code: 1, signal: 15, expected: 'no' }),
      record('spawn', { sessionId: 's-local', kind: 'local', pid: 70_002 }),
      record('exit', { sessionId: 's-local', code: 0, expected: 'yes' }),
      record('spawn', { sessionId: 's-far', kind: 'remote', pid: 70_003 }),
      record('exit', { sessionId: 's-far', code: 255, signal: 0, expected: 'no' })
      // The spawn that failed started nothing, and wrote nothing.
    ]);
  });

  it('never names the program, the socket, the machine or the session name', async () => {
    drive(await attachHostWith(true));
    expect(diagnostic().length).toBeGreaterThan(0);
    // The argv did carry them, so their absence below is the record's own.
    expect(ptys.made[0]!.argv.join(' ')).toContain(NAME);
    for (const r of diagnostic()) {
      const text = JSON.stringify(r);
      for (const word of [NAME, '/opt/fake/tmux', 'gmux-tmux.conf', 'gmux-p364-events', 'far.p364.invalid', '/usr/bin/ssh', 'gmux-p364-far']) {
        expect(text).not.toContain(word);
      }
    }
  });
});

describe('the normal build', () => {
  it('writes no record for the same drive', async () => {
    const { exitsSeen } = drive(await attachHostWith(false));
    expect(ptys.made).toHaveLength(3);
    expect(exitsSeen).toHaveLength(3);
    expect(diagnostic()).toEqual([]);
  });
});
