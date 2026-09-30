/**
 * Phase 323. The conformance harness reads a session's process tree BEFORE the
 * hang-up, ends what the hang-up leaves only where the harness sends the
 * hang-up itself, and says at the end of the run what is still running
 * (build/p323/SPEC.md §4.4).
 *
 * Nothing here reads the live process table, talks to tmux or signals a real
 * process. tmux is a stateful fake (a session's panes are gone once it is
 * killed, which is what makes the ORDER observable), the table is planted,
 * the clock and the waits are a fake, and `kill` is a recorder that refuses a
 * pid at or below 1. The real `../../proc/session-tree` does the selecting and
 * the ending; only its `defaultEndDeps` is replaced, which is the one seam the
 * module offers.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@shared/types';
import type { GmuxCore } from '../../sessions';
import type { EndDeps, TreeRow } from '../../proc/session-tree';

const h = vi.hoisted(() => ({
  events: [] as string[],
  /** tmux name to `$-id`, the live sessions. */
  sessions: new Map<string, string>(),
  /** `$-id` to its `list-panes` answer. */
  panes: new Map<string, string>(),
  /** `$-id` to the pids its hang-up ends by itself. */
  hupEnds: new Map<string, number[]>(),
  /** The live process table. */
  table: new Map<number, TreeRow>(),
  clock: 0,
  hold: null as Promise<void> | null,
  rereadNull: false,
  /** How many re-reads from now answer null before they answer again. */
  rereadNullTimes: 0,
  /** pid to the clock time it is gone by, as the product's own ending would make it. */
  goneAt: new Map<number, number>(),
  killSessionThrows: false,
  /** The tools round: a process table that cannot be read at record time. */
  tableNull: false,
  /** The tools round: a `list-panes -s` that tmux does not answer. */
  paneReadThrows: false,
  /** The tools round: a `list-sessions` that tmux does not answer. */
  listThrows: false
}));

vi.mock('../../tmux', () => ({
  formatSessionTarget: (ref: string): string =>
    ref.startsWith('$') ? ref : `=${ref}`,
  listSessions: (): Promise<Array<{ tmuxName: string; sessionId: string }>> => {
    h.events.push('list');
    if (h.listThrows) return Promise.reject(new Error('tmux did not answer'));
    return Promise.resolve(
      [...h.sessions].map(([tmuxName, sessionId]) => ({ tmuxName, sessionId }))
    );
  },
  execTmux: (args: readonly string[]): Promise<string> => {
    h.events.push(`tmux:${args[0] ?? ''}:${args[3] ?? ''}`);
    if (args[0] !== 'list-panes') return Promise.resolve('');
    // The pane check (the second fix round): every pane the fake server still
    // shows, by its process. A killed session's panes are gone from it.
    if (args[1] === '-a') {
      return Promise.resolve(
        [...h.panes.values()].map((line) => line.split(' ')[0] ?? '').join('\n')
      );
    }
    if (h.paneReadThrows) return Promise.reject(new Error('tmux did not answer'));
    const out = h.panes.get(args[3] ?? '');
    if (out === undefined) {
      return Promise.reject(new Error(`can't find session: ${args[3] ?? ''}`));
    }
    return Promise.resolve(out);
  },
  serverProbeVerdict: (): 'not-confirmed' => 'not-confirmed',
  killSession: (id: string): Promise<void> => {
    h.events.push(`kill-session:${id}`);
    if (h.killSessionThrows) return Promise.reject(new Error('tmux refused'));
    for (const [name, sid] of h.sessions) if (sid === id) h.sessions.delete(name);
    h.panes.delete(id);
    for (const pid of h.hupEnds.get(id) ?? []) h.table.delete(pid);
    return Promise.resolve();
  }
}));

vi.mock('../../restore/snapshots', () => ({
  deleteSnapshot: (): Promise<void> => Promise.resolve()
}));

vi.mock('../../proc/session-tree', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../proc/session-tree')>();
  const deps: Omit<EndDeps, 'livePanes'> = {
    readTable: () => {
      h.events.push('table');
      if (h.tableNull) return Promise.resolve(null);
      return Promise.resolve(new Map(h.table));
    },
    readTerminals: () => Promise.reject(new Error('the harness reads the wide table')),
    reread: (pids) => {
      h.events.push('reread');
      if (h.rereadNull) return Promise.resolve(null);
      if (h.rereadNullTimes > 0) {
        h.rereadNullTimes -= 1;
        return Promise.resolve(null);
      }
      const m = new Map<number, TreeRow>();
      for (const p of pids) {
        const r = h.table.get(p);
        const gone = h.goneAt.get(p);
        if (r !== undefined && (gone === undefined || h.clock < gone)) m.set(p, r);
      }
      return Promise.resolve(m);
    },
    kill: (pid, signal) => {
      if (!Number.isInteger(pid) || pid <= 1) throw new Error(`refused ${String(pid)}`);
      h.events.push(`signal:${String(pid)}:${signal}`);
      h.table.delete(pid);
    },
    sleep: async (ms) => {
      if (h.hold !== null) await h.hold;
      h.clock += ms;
    },
    now: () => h.clock
  };
  // The pane check is scratch.ts's own, over the fake tmux above, so this
  // test drives the composition the harness ships.
  return {
    ...actual,
    defaultEndDeps: (livePanes: EndDeps['livePanes']): EndDeps => ({ ...deps, livePanes })
  };
});

const LSTART = 'Tue Sep 29 17:41:36 2026';
const row = (
  pid: number,
  ppid: number,
  pgid: number,
  command: string,
  tpgid = pgid
): TreeRow => ({ pid, ppid, pgid, tpgid, stat: 'S+', lstart: LSTART, command });

/** The tmux server, pid 100, and one session's processes under it. */
function plantGemini(tmuxName: string, id: string, rootPid: number): void {
  h.sessions.set(tmuxName, id);
  h.panes.set(id, `${String(rootPid)} 0 100 /dev/ttys0${String(rootPid)}\n`);
  h.table.set(100, row(100, 1, 100, 'tmux -L gmux-test'));
  // Created Gemini: the launcher is the pane process and its child is in its
  // group; neither ends on the hang-up (SPEC §3).
  h.table.set(rootPid, row(rootPid, 100, rootPid, '/usr/bin/node /x/bin/gemini'));
  h.table.set(
    rootPid + 1,
    row(rootPid + 1, rootPid, rootPid, '/usr/bin/node --max-old-space-size=1 /x/bin/gemini')
  );
  // A `setsid` child in a group of its own: never signalled (SPEC §2.2).
  h.table.set(rootPid + 2, row(rootPid + 2, rootPid + 1, rootPid + 2, '/bin/sleep 600', 0));
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 20; i += 1) await new Promise((r) => setImmediate(r));
};

const signals = (): string[] => h.events.filter((e) => e.startsWith('signal:'));

const ORIGINAL_HARNESS_DIR = process.env['GMUX_HARNESS_DIR'];
const harnessDir = mkdtempSync(join(tmpdir(), 'p323-scratch-test-'));
process.env['GMUX_HARNESS_DIR'] = harnessDir;

afterAll(() => {
  if (ORIGINAL_HARNESS_DIR === undefined) delete process.env['GMUX_HARNESS_DIR'];
  else process.env['GMUX_HARNESS_DIR'] = ORIGINAL_HARNESS_DIR;
  rmSync(harnessDir, { recursive: true, force: true });
});

/** A fresh module each time: the recorded trees are module state. */
async function load(): Promise<typeof import('../scratch')> {
  vi.resetModules();
  return import('../scratch');
}

beforeEach(() => {
  h.events.length = 0;
  h.sessions.clear();
  h.panes.clear();
  h.hupEnds.clear();
  h.table.clear();
  h.clock = 0;
  h.hold = null;
  h.rereadNull = false;
  h.rereadNullTimes = 0;
  h.goneAt.clear();
  h.killSessionThrows = false;
  h.tableNull = false;
  h.paneReadThrows = false;
  h.listThrows = false;
});

describe('killOwnSession (the harness sends the hang-up itself)', () => {
  it('refuses a name the harness did not make before asking tmux anything', async () => {
    const { killOwnSession } = await load();
    plantGemini('his-work', '$1', 200);
    await expect(killOwnSession('his-work')).rejects.toThrow();
    expect(h.events).toEqual([]);
  });

  it('reads the tree by the $-id, then hangs up, then ends only the hang-up groups', async () => {
    const { killOwnSession, leftBehind } = await load();
    plantGemini('zz-conf-a', '$7', 200);
    await expect(killOwnSession('zz-conf-a')).resolves.toBe(true);
    const at = (e: string): number => h.events.indexOf(e);
    expect(at('list')).toBe(0);
    expect(at('tmux:list-panes:$7')).toBeGreaterThan(at('list'));
    expect(at('table')).toBeGreaterThan(at('tmux:list-panes:$7'));
    expect(at('kill-session:$7')).toBeGreaterThan(at('table'));
    expect(at('signal:200:SIGTERM')).toBeGreaterThan(at('kill-session:$7'));
    expect(signals().sort()).toEqual(['signal:200:SIGTERM', 'signal:201:SIGTERM']);
    await expect(leftBehind()).resolves.toEqual({ targets: [], outOfScope: ['sleep'], unread: [], recorded: 2 });
  });

  it('does not answer until the ending has finished', async () => {
    const { killOwnSession } = await load();
    plantGemini('zz-conf-a', '$7', 200);
    let release = (): void => undefined;
    h.hold = new Promise<void>((r) => {
      release = r;
    });
    let settled = false;
    const done = killOwnSession('zz-conf-a').then(() => {
      settled = true;
    });
    await flush();
    expect(h.events).toContain('kill-session:$7');
    expect(settled).toBe(false);
    expect(signals()).toEqual([]);
    h.hold = null;
    release();
    await done;
    expect(signals().length).toBe(2);
  });

  it('signals nothing and records nothing when the hang-up itself fails', async () => {
    const { killOwnSession, leftBehind } = await load();
    plantGemini('zz-conf-a', '$7', 200);
    h.killSessionThrows = true;
    await expect(killOwnSession('zz-conf-a')).rejects.toThrow('tmux refused');
    expect(signals()).toEqual([]);
    expect(h.events).not.toContain('reread');
    await expect(leftBehind()).resolves.toEqual({ targets: [], outOfScope: [], unread: [], recorded: 0 });
  });

  it('signals nothing whose pane the server still shows in another session, asking the run’s own server', async () => {
    // The second fix round's pane check, through scratch.ts's own composition:
    // a grouped session still shows the killed session's pane, so the hang-up
    // never reached it and nothing of it is signalled.
    const { killOwnSession } = await load();
    plantGemini('zz-conf-a', '$7', 200);
    h.panes.set('$9', '200 0 100 /dev/ttys0200\n');
    await killOwnSession('zz-conf-a');
    expect(h.events).toContain('tmux:list-panes:#{pane_pid}');
    expect(signals()).toEqual([]);
  });

  it('sends no signal to a process that ends on the hang-up', async () => {
    const { killOwnSession, leftBehind } = await load();
    plantGemini('zz-conf-a', '$7', 200);
    h.hupEnds.set('$7', [200, 201]);
    await killOwnSession('zz-conf-a');
    expect(signals()).toEqual([]);
    await expect(leftBehind()).resolves.toEqual({ targets: [], outOfScope: ['sleep'], unread: [], recorded: 2 });
  });
});

describe('cleanupCase (the product sends the hang-up)', () => {
  const core = (id: string, tmuxName: string, liveId: string): GmuxCore =>
    ({
      listSessionRecords: () => [{ id, tmuxName, name: tmuxName, status: 'running' }],
      killSession: async (sid: string): Promise<void> => {
        h.events.push(`core.killSession:${sid}`);
        // The product's End in this fake hangs up and ends nothing, so what
        // it should have ended is still there for the closing check to see.
        await (await import('../../tmux')).killSession(liveId);
      },
      discardSession: (): void => {
        h.events.push('discard');
      }
    }) as unknown as GmuxCore;

  it('records the tree before the product ends it, and signals nothing itself', async () => {
    const { cleanupCase, leftBehind } = await load();
    plantGemini('zz-conf-b', '$8', 400);
    await cleanupCase(
      core('s1', 'zz-conf-b', '$8'),
      { id: 's1' } as Session,
      join(harnessDir, 'not-the-scratch-root')
    );
    expect(h.events.indexOf('table')).toBeGreaterThan(-1);
    expect(h.events.indexOf('table')).toBeLessThan(h.events.indexOf('core.killSession:s1'));
    expect(signals()).toEqual([]);
    const left = await leftBehind();
    expect(left.targets.sort()).toEqual(['node', 'node']);
    expect(left.outOfScope).toEqual(['sleep']);
  });
});

describe('sweepLeftovers', () => {
  it("reads, hangs up and ends a leftover live session of ours, and never touches his", async () => {
    const { sweepLeftovers, leftBehind } = await load();
    plantGemini('zz-conf-c', '$9', 500);
    plantGemini('his-work', '$1', 600);
    const core = {
      listSessionRecords: () => [],
      discardSession: (): void => undefined
    } as unknown as GmuxCore;
    await expect(sweepLeftovers(core)).resolves.toBe(1);
    expect(h.events).toContain('kill-session:$9');
    expect(h.events).not.toContain('kill-session:$1');
    expect(h.events).not.toContain('tmux:list-panes:$1');
    expect(signals().sort()).toEqual(['signal:500:SIGTERM', 'signal:501:SIGTERM']);
    expect(h.table.has(600) && h.table.has(601)).toBe(true);
    await expect(leftBehind()).resolves.toEqual({ targets: [], outOfScope: ['sleep'], unread: [], recorded: 2 });
  });
});

describe('leftBehind (the closing check)', () => {
  it('waits for the product’s End to finish ending what it recorded, because the quit no longer does', async () => {
    const { cleanupCase, leftBehind } = await load();
    plantGemini('zz-conf-f', '$12', 900);
    const core = {
      listSessionRecords: () => [{ id: 's6', tmuxName: 'zz-conf-f', name: 'zz-conf-f', status: 'running' }],
      killSession: async (): Promise<void> => {
        await (await import('../../tmux')).killSession('$12');
        // The product's own ending, still in its grace when the run ends:
        // its targets are gone about 4.5 s after the hang-up.
        h.goneAt.set(900, h.clock + 4_500);
        h.goneAt.set(901, h.clock + 4_500);
      },
      discardSession: (): void => undefined
    } as unknown as GmuxCore;
    await cleanupCase(core, { id: 's6' } as Session, join(harnessDir, 'elsewhere'));
    await expect(leftBehind()).resolves.toEqual({ targets: [], outOfScope: ['sleep'], unread: [], recorded: 2 });
    expect(h.clock).toBeGreaterThanOrEqual(4_500);
    // It returned at the first poll after they went, not at the bound.
    expect(h.clock).toBeLessThan(4_500 + 500);
  });

  it('asks again when a re-read does not answer, rather than reading as a check that could not look', async () => {
    const { killOwnSession, leftBehind } = await load();
    plantGemini('zz-conf-g', '$13', 1_000);
    await killOwnSession('zz-conf-g');
    h.rereadNullTimes = 2;
    await expect(leftBehind()).resolves.toEqual({ targets: [], outOfScope: ['sleep'], unread: [], recorded: 2 });
  });

  it('drops a pid the kernel has handed to another process since the read', async () => {
    const { cleanupCase, leftBehind } = await load();
    plantGemini('zz-conf-d', '$10', 700);
    const core = {
      listSessionRecords: () => [{ id: 's4', tmuxName: 'zz-conf-d', name: 'zz-conf-d', status: 'running' }],
      killSession: async (): Promise<void> => {
        await (await import('../../tmux')).killSession('$10');
      },
      discardSession: (): void => undefined
    } as unknown as GmuxCore;
    await cleanupCase(core, { id: 's4' } as Session, join(harnessDir, 'elsewhere'));
    // 700 is reused by a stranger: same pid, a later start.
    h.table.set(700, { ...row(700, 1, 700, '/usr/bin/node /x/bin/gemini'), lstart: 'Tue Sep 29 18:00:00 2026' });
    // 701 exec'd another program.
    h.table.set(701, row(701, 700, 700, '/bin/zsh'));
    await expect(leftBehind()).resolves.toEqual({ targets: [], outOfScope: ['sleep'], unread: [], recorded: 2 });
  });

  it('throws rather than read as clean when the table cannot be read', async () => {
    const { cleanupCase, leftBehind } = await load();
    plantGemini('zz-conf-e', '$11', 800);
    const core = {
      listSessionRecords: () => [{ id: 's5', tmuxName: 'zz-conf-e', name: 'zz-conf-e', status: 'running' }],
      killSession: async (): Promise<void> => {
        await (await import('../../tmux')).killSession('$11');
      },
      discardSession: (): void => undefined
    } as unknown as GmuxCore;
    await cleanupCase(core, { id: 's5' } as Session, join(harnessDir, 'elsewhere'));
    h.rereadNull = true;
    await expect(leftBehind()).rejects.toThrow();
  });

  it('answers nothing, and reads nothing, when no tree was recorded', async () => {
    const { leftBehind } = await load();
    await expect(leftBehind()).resolves.toEqual({ targets: [], outOfScope: [], unread: [], recorded: 0 });
    expect(h.events).toEqual([]);
  });
});

describe('the closing check cannot read green when it could not look (the tools round)', () => {
  // The reverify ran the capture with `/bin/ps` refused: seven Ends logged that
  // their tree could not be read, and the closing check still printed "0 agent
  // processes of this run are still running", because an unread tree was never
  // recorded. Each row below is red with its clause removed (ablation:p323).
  const productCore = (id: string, tmuxName: string, liveId: string): GmuxCore =>
    ({
      listSessionRecords: () => [{ id, tmuxName, name: tmuxName, status: 'running' }],
      killSession: async (): Promise<void> => {
        await (await import('../../tmux')).killSession(liveId);
      },
      discardSession: (): void => undefined
    }) as unknown as GmuxCore;

  it('says it could not look, and exits red, when the product’s End was recorded with a process table that could not be read', async () => {
    const { cleanupCase, closingVerdict, leftBehind } = await load();
    plantGemini('zz-conf-u', '$20', 1_100);
    h.tableNull = true;
    await cleanupCase(productCore('s7', 'zz-conf-u', '$20'), { id: 's7' } as Session, join(harnessDir, 'elsewhere'));
    const left = await leftBehind();
    expect(left).toEqual({
      targets: [],
      outOfScope: [],
      unread: ['zz-conf-u: the process table could not be read'],
      recorded: 0
    });
    const verdict = closingVerdict(left);
    expect(verdict.code).toBe(1);
    expect(verdict.line).toContain('could not look at 1 session(s)');
    expect(verdict.line).toContain('zz-conf-u: the process table could not be read');
    expect(verdict.line).not.toContain('closing check: 0');
  });

  it('says it could not look when the harness’s own hang-up went out with panes tmux did not answer for', async () => {
    const { killOwnSession, closingVerdict, leftBehind } = await load();
    plantGemini('zz-conf-v', '$21', 1_200);
    h.paneReadThrows = true;
    await expect(killOwnSession('zz-conf-v')).resolves.toBe(true);
    expect(h.events).toContain('kill-session:$21');
    expect(signals()).toEqual([]);
    const left = await leftBehind();
    expect(left.unread).toEqual(['zz-conf-v: its panes could not be read']);
    expect(closingVerdict(left).code).toBe(1);
  });

  it('records a read that threw rather than letting its caller swallow it, a tmux that did not list its sessions included', async () => {
    const { cleanupCase, closingVerdict, leftBehind } = await load();
    plantGemini('zz-conf-w', '$22', 1_300);
    h.listThrows = true;
    await cleanupCase(productCore('s8', 'zz-conf-w', '$22'), { id: 's8' } as Session, join(harnessDir, 'elsewhere'));
    const left = await leftBehind();
    expect(left.unread).toEqual(['zz-conf-w: the read threw (tmux did not answer)']);
    expect(closingVerdict(left).code).toBe(1);
  });

  it('reads a session with no live pane as looked at, never as a check that could not look', async () => {
    const { cleanupCase, closingVerdict, leftBehind } = await load();
    plantGemini('zz-conf-x', '$23', 1_400);
    // The agent exited at start and `remain-on-exit failed` kept its pane dead.
    h.panes.set('$23', '1400 1 100 /dev/ttys01400\n');
    await cleanupCase(productCore('s9', 'zz-conf-x', '$23'), { id: 's9' } as Session, join(harnessDir, 'elsewhere'));
    const left = await leftBehind();
    expect(left).toEqual({ targets: [], outOfScope: [], unread: [], recorded: 0 });
    const verdict = closingVerdict(left);
    expect(verdict.code).toBe(0);
    expect(verdict.line).toContain('0 of the 0 agent process(es) this run read are still running');
  });

  it('is clean only when every session was read and every target is gone, and says out of how many', async () => {
    const { closingVerdict } = await load();
    const clean = closingVerdict({ targets: [], outOfScope: ['sleep'], unread: [], recorded: 2 });
    expect(clean.code).toBe(0);
    expect(clean.line).toBe(
      "[gmux-conf] closing check: 0 of the 2 agent process(es) this run read are still running; 1 that left the session's terminal still running, spared by design (sleep)"
    );
    const both = closingVerdict({ targets: ['node'], outOfScope: [], unread: ['zz-conf-y: its panes could not be read'], recorded: 2 });
    expect(both.code).toBe(1);
    expect(both.line).toContain('could not look at 1 session(s)');
    expect(both.line).toContain('1 of 2 agent process(es) are still running (node)');
    const left = closingVerdict({ targets: ['node', 'node'], outOfScope: [], unread: [], recorded: 2 });
    expect(left.code).toBe(1);
    expect(left.line).toContain('FAIL: 2 agent process(es) of this run are still running (node, node)');
    const noAnswer = closingVerdict({ failed: 'the process table could not be read' });
    expect(noAnswer.code).toBe(1);
    expect(noAnswer.line).toContain('could not look');
  });
});
