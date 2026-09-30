/**
 * Phase 323. End ends what the hang-up left running, driven through the REAL
 * `killSessionAdmitted` (build/p323/SPEC.md §5.2).
 *
 * HOW IT IS DRIVEN. The shape of ./p293-removed-remote-row.test.ts and
 * ./p293-lifecycle-gate.test.ts, for their reason: booting a core needs a tmux
 * server, an attach host and a control client, so a functional boot would
 * prove the mocks rather than the method. The real body comes off
 * `GmuxCore.prototype`, with its two real helpers `readEndTree` and
 * `endAfterHangup`, and runs against a small object holding what it reads,
 * with a REAL `MutationLedger` behind it, because what a quit waits for (the
 * End, and since the fix round NOT the ending after it) is half of what is
 * proved here.
 *
 * What is replaced, and nothing else: the session server (`../../tmux`, whose
 * `list-panes` answer is planted and whose `kill-session` is recorded), the
 * end-time capture (`../../restore/snapshots`), the push to every window
 * (`../../typed-events`), the log, and the machine layer's memory for the one
 * remote case. The process table, the identity re-read, the signal, the clock
 * and the waits come in through `endTreeDeps`, so nothing here reads the live
 * table and no real process is ever signalled: the recording `kill` asserts
 * every pid it is handed is above 1 and is not this test's own.
 *
 * ONE EVENT LOG records every step in order, which is how "THE ORDER IS THE
 * PROMISE" is asserted rather than described.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EndDeps, TreeRow } from '../../proc/session-tree';
import type { ManifestSessionRecord } from '../../manifest';

const h = vi.hoisted(() => ({
  /** Every step, in the order it happened. */
  events: [] as string[],
  /** Every log line, `<level> <message>`. */
  logged: [] as string[],
  /** What `list-panes` answers, or an error to throw. */
  panes: '' as string | Error,
  /** Ids the stubbed machine feed claims. */
  remote: new Set<string>(),
  /** When set, the end-time capture waits for it. */
  captureGate: null as Promise<void> | null,
  /** The options each tmux call was given, beside its argv. */
  tmuxCalls: [] as Array<{ args: string[]; timeoutMs: number | undefined }>
}));

vi.mock('../../tmux', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tmux')>();
  return {
    ...actual,
    execTmux: (
      args: readonly string[],
      options?: { timeoutMs?: number }
    ): Promise<string> => {
      h.events.push(`execTmux ${args.join(' ')}`);
      h.tmuxCalls.push({ args: [...args], timeoutMs: options?.timeoutMs });
      return h.panes instanceof Error
        ? Promise.reject(h.panes)
        : Promise.resolve(h.panes);
    },
    killSession: (target: string): Promise<void> => {
      h.events.push(`killSession ${target}`);
      return Promise.resolve();
    }
  };
});

vi.mock('../../restore/snapshots', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../restore/snapshots')>();
  return {
    ...actual,
    captureSessionSnapshot: async (target: string): Promise<void> => {
      h.events.push(`capture ${target}`);
      if (h.captureGate !== null) await h.captureGate;
      h.events.push('capture written');
    }
  };
});

vi.mock('../../typed-events', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../typed-events')>();
  return {
    ...actual,
    broadcastEvent: (name: string): void => {
      h.events.push(`broadcast ${name}`);
    }
  };
});

vi.mock('../../log', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../log')>();
  const line =
    (level: string) =>
    (msg: string): void => {
      h.logged.push(`${level} ${msg}`);
    };
  return {
    ...actual,
    getLog: () => ({
      error: line('error'),
      warn: line('warn'),
      info: line('info'),
      debug: line('debug')
    })
  };
});

vi.mock('../../machines/remote-sessions', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../machines/remote-sessions')
  >();
  return {
    ...actual,
    isRemoteSessionId: (id: string): boolean => h.remote.has(id),
    remoteSessionRow: (): null => null,
    remoteKill: (id: string): Promise<void> => {
      h.events.push(`remoteKill ${id}`);
      return Promise.resolve();
    }
  };
});

vi.mock('../../machines/remote-capsule', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('../../machines/remote-capsule')
  >();
  return {
    ...actual,
    captureRemoteSessionNow: (id: string): Promise<boolean> => {
      h.events.push(`captureRemote ${id}`);
      return Promise.resolve(true);
    }
  };
});

const { GmuxCore } = await import('../core');
const { MutationLedger } = await import('../mutation-ledger');
const { PANE_ROOT_FORMAT, TREE_READ_TIMEOUT_MS } = await import('../../proc/session-tree');

type Borrowed = (this: unknown, ...args: never[]) => unknown;
const proto = GmuxCore.prototype as unknown as Record<string, Borrowed>;
const killSessionAdmitted = proto['killSessionAdmitted'] as unknown as (
  this: unknown,
  sessionId: string
) => Promise<void>;

// ---------------------------------------------------------------------------
// The planted world
// ---------------------------------------------------------------------------

const SERVER = 611;
const STARTED = 'Tue Sep 29 17:41:36 2026';

function row(
  pid: number,
  ppid: number,
  pgid: number,
  tpgid: number,
  stat: string,
  command: string
): TreeRow {
  return { pid, ppid, pgid, tpgid, stat, lstart: STARTED, command };
}

/**
 * A created Gemini (both in the pane's group, SPEC §3) under the pane the
 * `$-id` names, and beside it ANOTHER session's pane whose pid a stale
 * `panePid` on the record points at. That one is somebody's live work.
 */
function plantedTable(): Map<number, TreeRow> {
  const t = new Map<number, TreeRow>();
  for (const r of [
    row(1, 0, 1, 0, 'Ss', '/sbin/launchd'),
    row(SERVER, 1, SERVER, 0, 'Ss', 'tmux -L gmux-p323 new-session'),
    row(812, SERVER, 812, 812, 'Ss+', 'node /opt/homebrew/bin/gemini'),
    row(813, 812, 812, 812, 'S+', 'node gemini child'),
    row(4321, SERVER, 4321, 4321, 'Ss+', 'claude'),
    row(4322, 4321, 4321, 4321, 'S+', 'claude tool')
  ]) {
    t.set(r.pid, r);
  }
  return t;
}

const PANE_ANSWER = '812 0 611 /dev/ttys012\n';

interface Held {
  /** Sleeps waiting to be released. */
  pending: number;
  release(): void;
}

/**
 * The injected table, re-read, signal, clock and waits. The planted processes
 * never end on the hang-up and end on SIGTERM. When `hold` is set, every sleep
 * waits until `held.release()` is called, and after that none does.
 *
 * `tableFails` makes the TERMINAL read (End's) answer null while the planted
 * processes go on running and the identity re-read goes on answering for them,
 * so a fallback that signalled anything on a failed read would be seen doing
 * it. `rereadFails` makes every identity re-read answer null. `terminalGate`,
 * when set, holds the terminal read until it settles.
 */
function endDeps(
  options: {
    tableFails?: boolean;
    rereadFails?: boolean;
    hold?: boolean;
    terminalGate?: Promise<void>;
  } = {}
): { deps: EndDeps; held: Held } {
  let t = 0;
  const gone = new Set<number>();
  let releasers: Array<() => void> = [];
  let holding = options.hold === true;
  const held: Held = {
    pending: 0,
    release: () => {
      holding = false;
      const now = releasers;
      releasers = [];
      held.pending = 0;
      for (const r of now) r();
    }
  };
  const table = plantedTable();
  const deps: EndDeps = {
    readTable: () => {
      h.events.push('readTable (the wide read End never asks)');
      return Promise.resolve(new Map(table));
    },
    readTerminals: async (ttys) => {
      h.events.push(`readTerminals ${ttys.join(',')}`);
      if (options.terminalGate !== undefined) await options.terminalGate;
      h.events.push('readTerminals answered');
      return options.tableFails === true ? null : new Map(table);
    },
    // The pane check (the second fix round): the hang-up closed the pane,
    // so the server shows none of this session's.
    livePanes: () => {
      h.events.push('livePanes');
      return Promise.resolve(new Set<number>([4321]));
    },
    reread: (pids) => {
      h.events.push(`reread ${pids.join(',')}`);
      if (options.rereadFails === true) return Promise.resolve(null);
      const m = new Map<number, TreeRow>();
      for (const pid of pids) {
        const r = table.get(pid);
        if (r !== undefined && !gone.has(pid)) m.set(pid, r);
      }
      return Promise.resolve(m);
    },
    kill: (pid, signal) => {
      expect(pid).toBeGreaterThan(1);
      expect(pid).not.toBe(process.pid);
      h.events.push(`kill ${pid} ${signal}`);
      gone.add(pid);
    },
    sleep: (ms) => {
      t += ms;
      if (!holding) return Promise.resolve();
      held.pending += 1;
      return new Promise<void>((resolve) => {
        releasers.push(resolve);
      });
    },
    now: () => t
  };
  return { deps, held };
}

function record(over: Partial<ManifestSessionRecord> = {}): ManifestSessionRecord {
  return {
    id: 'gem-1',
    name: 'gemini work',
    tmuxName: 'gem-name',
    projectPath: '/w',
    cwd: '/w',
    agent: 'gemini',
    status: 'running',
    createdAt: 1,
    lastSeen: 1,
    argv: ['gemini'],
    ...over
  } as ManifestSessionRecord;
}

function fakeCore(
  rec: ManifestSessionRecord,
  deps: EndDeps
): { core: Record<string, unknown>; ledger: InstanceType<typeof MutationLedger> } {
  const ledger = new MutationLedger({
    isDisposed: () => false,
    refusalFor: (entry) => new Error(`refused ${entry}`)
  });
  const core: Record<string, unknown> = {
    manifest: {
      getSession: (id: string) => (id === rec.id ? rec : undefined),
      setStatus: (id: string, status: string): void => {
        h.events.push(`setStatus ${id} ${status}`);
      }
    },
    mustGetSession: proto['mustGetSession'],
    readEndTree: proto['readEndTree'],
    endAfterHangup: proto['endAfterHangup'],
    idCaptureWatches: new Map(),
    attachHost: { detach: (): void => undefined },
    liveIds: new Map([[rec.id, '$7']]),
    byTmuxId: new Map([['$7', rec.id]]),
    queueCaptureSync: (): void => {
      h.events.push('sync');
    },
    activity: { forget: (): void => undefined },
    resumeInPlace: { forget: (): void => undefined },
    hookServer: { revoke: (): void => undefined },
    broadcastSessions: (): void => {
      h.events.push('broadcastSessions');
    },
    endTreeDeps: deps,
    ledger
  };
  return { core, ledger };
}

/** The index of the first event starting with `prefix`; -1 when none does. */
function at(prefix: string): number {
  return h.events.findIndex((e) => e.startsWith(prefix));
}

function kills(): string[] {
  return h.events.filter((e) => e.startsWith('kill '));
}

function tick(ms = 20): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeEach(() => {
  h.events = [];
  h.logged = [];
  h.panes = PANE_ANSWER;
  h.remote.clear();
  h.captureGate = null;
  h.tmuxCalls = [];
});

// ---------------------------------------------------------------------------
// The cases
// ---------------------------------------------------------------------------

describe('the order is the promise', () => {
  it('captures and reads the tree, hangs up only when both are done, broadcasts, and only then signals', async () => {
    const { deps } = endDeps();
    const { core } = fakeCore(record(), deps);
    await killSessionAdmitted.call(core, 'gem-1');
    await tick();

    const capture = at('capture $7');
    const written = at('capture written');
    const panes = at('execTmux list-panes');
    const table = at('readTerminals /dev/ttys012');
    const answered = at('readTerminals answered');
    const hangup = at('killSession $7');
    const status = at('broadcast status:changed');
    const sessions = at('broadcastSessions');
    const firstKill = at('kill ');
    for (const i of [capture, written, panes, table, answered, hangup, status, sessions, firstKill]) {
      expect(i).toBeGreaterThan(-1);
    }
    // The tree read began before the capture finished: they run at once.
    expect(panes).toBeLessThan(written);
    expect(panes).toBeLessThan(table);
    // The hang-up waits for BOTH.
    expect(written).toBeLessThan(hangup);
    expect(answered).toBeLessThan(hangup);
    expect(hangup).toBeLessThan(status);
    expect(status).toBeLessThan(sessions);
    expect(sessions).toBeLessThan(firstKill);
    // Every re-read comes after the hang-up too, and End never reads the
    // whole table.
    expect(at('reread')).toBeGreaterThan(hangup);
    expect(at('readTable')).toBe(-1);

    expect(kills()).toEqual(['kill 812 SIGTERM', 'kill 813 SIGTERM']);
    expect(h.logged.filter((l) => l.startsWith('info ended'))).toEqual([
      'info ended 2 process(es) of "gemini work" that outlived the hang-up: ' +
        'node 812 SIGTERM, node 813 SIGTERM'
    ]);
  });

  it('reads the tree beside the capture, not after it, and hangs up only once the read has answered', async () => {
    // The fix round: read one after the other, the two made every End answer
    // the window about 57 ms later. Here the tree read is HELD: the capture
    // must still start and finish, and the hang-up must still wait.
    let openRead: () => void = () => undefined;
    const terminalGate = new Promise<void>((resolve) => {
      openRead = resolve;
    });
    const { deps } = endDeps({ terminalGate });
    const { core } = fakeCore(record(), deps);
    const end = killSessionAdmitted.call(core, 'gem-1');
    await tick();
    expect(at('readTerminals /dev/ttys012')).toBeGreaterThan(-1);
    expect(at('readTerminals answered')).toBe(-1);
    expect(at('capture $7')).toBeGreaterThan(-1);
    expect(at('capture written')).toBeGreaterThan(-1);
    expect(at('killSession $7')).toBe(-1);
    openRead();
    await end;
    expect(at('killSession $7')).toBeGreaterThan(at('readTerminals answered'));
  });

  it('reads the panes within one read’s bound, so a stuck tmux cannot hold the End (the verifier’s X7)', async () => {
    // Without the bound the pane read falls back to the tmux layer's own 10 s
    // default, and the End's hang-up waits for it.
    const { deps } = endDeps();
    const { core } = fakeCore(record(), deps);
    await killSessionAdmitted.call(core, 'gem-1');
    await tick();
    const read = h.tmuxCalls.filter((c) => c.args[0] === 'list-panes');
    expect(read).toHaveLength(1);
    expect(read[0]?.timeoutMs).toBeGreaterThan(0);
    expect(read[0]?.timeoutMs).toBeLessThanOrEqual(TREE_READ_TIMEOUT_MS);
    // And the pane check is asked only after the hang-up, before a signal.
    expect(at('livePanes')).toBeGreaterThan(at('killSession $7'));
    expect(at('livePanes')).toBeLessThan(at('kill '));
  });

  it('never logs a command line', async () => {
    const { deps } = endDeps();
    const { core } = fakeCore(record(), deps);
    await killSessionAdmitted.call(core, 'gem-1');
    await tick();
    for (const line of h.logged) {
      expect(line).not.toContain('/opt/homebrew/bin/gemini');
      expect(line).not.toContain('gemini child');
    }
  });
});

describe('a plain shell (ruling R2)', () => {
  it('reads nothing and signals nothing, and the End still ends', async () => {
    const { deps } = endDeps();
    const { core, ledger } = fakeCore(record({ agent: 'shell' }), deps);
    await killSessionAdmitted.call(core, 'gem-1');
    await tick();
    expect(at('execTmux')).toBe(-1);
    expect(at('readTerminals')).toBe(-1);
    expect(at('reread')).toBe(-1);
    expect(kills()).toEqual([]);
    expect(at('killSession $7')).toBeGreaterThan(-1);
    expect(at('setStatus gem-1 exited')).toBeGreaterThan(-1);
    expect(ledger.size).toBe(0);
  });
});

describe('a process table that cannot be read', () => {
  it('still ends the session, signals nothing and says so once', async () => {
    const { deps } = endDeps({ tableFails: true });
    const { core } = fakeCore(record(), deps);
    await killSessionAdmitted.call(core, 'gem-1');
    await tick();
    expect(at('killSession $7')).toBeGreaterThan(-1);
    expect(at('setStatus gem-1 exited')).toBeGreaterThan(-1);
    expect(at('reread')).toBe(-1);
    expect(kills()).toEqual([]);
    expect(h.logged.filter((l) => l.startsWith('warn'))).toEqual([
      'warn the panes or processes of "gemini work" could not be read when ' +
        'it was ended, so only the hang-up was sent'
    ]);
  });

  it('treats a pane read that throws the same way', async () => {
    h.panes = new Error('tmux went away');
    const { deps } = endDeps();
    const { core } = fakeCore(record(), deps);
    await killSessionAdmitted.call(core, 'gem-1');
    await tick();
    expect(at('killSession $7')).toBeGreaterThan(-1);
    expect(at('setStatus gem-1 exited')).toBeGreaterThan(-1);
    expect(at('readTerminals')).toBe(-1);
    expect(kills()).toEqual([]);
    expect(h.logged.filter((l) => l.startsWith('warn'))).toHaveLength(1);
  });

  it('says so once, and signals nothing, when a re-read after the hang-up fails', async () => {
    const { deps } = endDeps({ rereadFails: true });
    const { core } = fakeCore(record(), deps);
    await killSessionAdmitted.call(core, 'gem-1');
    await tick();
    expect(at('reread')).toBeGreaterThan(at('killSession $7'));
    expect(kills()).toEqual([]);
    expect(h.logged.filter((l) => l.startsWith('warn'))).toEqual([
      'warn the process table could not be read again after "gemini work" ' +
        'was ended, so nothing further was signalled'
    ]);
    expect(h.logged.filter((l) => l.startsWith('info ended'))).toEqual([]);
  });

  it('says nothing when the session has no live pane', async () => {
    h.panes = '812 1 611 /dev/ttys012\n';
    const { deps } = endDeps();
    const { core } = fakeCore(record(), deps);
    await killSessionAdmitted.call(core, 'gem-1');
    await tick();
    expect(at('readTerminals')).toBe(-1);
    expect(kills()).toEqual([]);
    expect(h.logged.filter((l) => l.startsWith('warn'))).toEqual([]);
  });
});

describe('the waits are not in band', () => {
  it('settles the End while the first wait is still held', async () => {
    const { deps, held } = endDeps({ hold: true });
    const { core, ledger } = fakeCore(record(), deps);
    await killSessionAdmitted.call(core, 'gem-1');
    // The End has answered; the ending is parked in its first wait.
    expect(at('broadcastSessions')).toBeGreaterThan(-1);
    await tick();
    expect(held.pending).toBe(1);
    expect(kills()).toEqual([]);
    // Handed to nothing a quit waits on (the fix round).
    expect(ledger.size).toBe(0);
    held.release();
    await tick();
    expect(kills()).toEqual(['kill 812 SIGTERM', 'kill 813 SIGTERM']);
  });
});

describe('a quit does not wait for the waits (the fix round)', () => {
  it('joins at once while the ending is still in its grace', async () => {
    // Joining the ending made a quit after an End wait out the graces with the
    // window on screen (the verifier: 4.8 s after a Gemini End, 6.6 s for a
    // process that ignores both signals, against no wait at all today).
    const { deps, held } = endDeps({ hold: true });
    const { core, ledger } = fakeCore(record(), deps);
    await ledger.admit('killSession', () => killSessionAdmitted.call(core, 'gem-1'));
    await tick();
    expect(held.pending).toBe(1);
    let joined = false;
    const join = ledger.join(10_000).then(() => {
      joined = true;
    });
    await tick();
    expect(joined).toBe(true);
    expect(kills()).toEqual([]);
    // The ending goes on after the join, as long as the app does.
    held.release();
    await join;
    await tick();
    expect(kills()).toEqual(['kill 812 SIGTERM', 'kill 813 SIGTERM']);
  });

  it('waits for an End whose capture was in flight when the quit began, and not for its ending', async () => {
    let openCapture: () => void = () => undefined;
    h.captureGate = new Promise<void>((resolve) => {
      openCapture = resolve;
    });
    const { deps, held } = endDeps({ hold: true });
    const { core, ledger } = fakeCore(record(), deps);
    // The End, admitted the way `killSession` admits it.
    const end = ledger.admit('killSession', () =>
      killSessionAdmitted.call(core, 'gem-1')
    );
    await tick();
    expect(at('capture $7')).toBeGreaterThan(-1);
    expect(at('capture written')).toBe(-1);

    // The quit begins while the End is inside its capture.
    ledger.beginShutdown();
    let joined = false;
    const join = ledger.join(10_000).then(() => {
      joined = true;
      h.events.push('joined');
    });
    await tick();
    // The End itself is still joined, as it always was.
    expect(joined).toBe(false);

    openCapture();
    await end;
    await join;
    // The hang-up landed before the quit went on; the ending did not.
    expect(at('killSession $7')).toBeLessThan(at('joined'));
    expect(held.pending).toBe(1);
    expect(kills()).toEqual([]);
    held.release();
    await tick();
    expect(kills()).toEqual(['kill 812 SIGTERM', 'kill 813 SIGTERM']);
    // A NEW End after the shutdown began is refused, as it always was.
    await expect(
      ledger.admit('killSession', () => killSessionAdmitted.call(core, 'gem-1'))
    ).rejects.toThrow('refused killSession');
  });
});

describe('a session on another machine', () => {
  it('never reads a tree', async () => {
    h.remote.add('far-1');
    const { deps } = endDeps();
    const { core } = fakeCore(record({ id: 'far-1' }), deps);
    await killSessionAdmitted.call(core, 'far-1');
    await tick();
    expect(at('remoteKill far-1')).toBeGreaterThan(-1);
    expect(at('execTmux')).toBe(-1);
    expect(at('readTerminals')).toBe(-1);
    expect(kills()).toEqual([]);
  });
});

describe('the root', () => {
  it('is the $-id liveIds holds; a panePid on the record is ignored', async () => {
    const { deps } = endDeps();
    // A stale create-time pid that now names ANOTHER session's live pane.
    const { core } = fakeCore(record({ panePid: 4321 }), deps);
    await killSessionAdmitted.call(core, 'gem-1');
    await tick();
    const reads = h.events.filter((e) => e.startsWith('execTmux'));
    expect(reads).toEqual([
      `execTmux list-panes -s -t $7 -F ${PANE_ROOT_FORMAT}`
    ]);
    // Never the name, and never the stale pid.
    expect(reads.join(' ')).not.toContain('gem-name');
    expect(kills()).toEqual(['kill 812 SIGTERM', 'kill 813 SIGTERM']);
    expect(h.events.some((e) => e.includes('4321') || e.includes('4322'))).toBe(false);
  });

  it('reads nothing for a row with no live binding', async () => {
    const { deps } = endDeps();
    const { core } = fakeCore(record(), deps);
    (core['liveIds'] as Map<string, string>).clear();
    await killSessionAdmitted.call(core, 'gem-1');
    await tick();
    expect(at('execTmux')).toBe(-1);
    expect(at('killSession')).toBe(-1);
    expect(at('setStatus gem-1 exited')).toBeGreaterThan(-1);
    expect(kills()).toEqual([]);
  });
});
