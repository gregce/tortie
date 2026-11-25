/**
 * Phase 374, the fix round: a run of Tortie's own Antigravity status line is
 * not an agent's tool, whichever way agy starts it (build/p374/SPEC.md §As
 * built; row A1).
 *
 * THE SHIPPING MONITOR over fake tmux, a fake process table and a fake reader
 * of command lines, as p321-foreground.test.ts drives it. Nothing here reaches
 * the host's `ps` or a tmux. Each quiet case is paired with the same child
 * under an agy with no flag, which reads running exactly as it did, so no row
 * is green because nothing could raise it.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { SessionStatus } from '@shared/types';
import { antigravitySettingsJson, antigravityStatusCommand } from '../../usage/antigravity/script';
import { SessionActivityMonitor } from '../monitor';
import { parseProcTable } from '../process';

const T0 = 1_800_000_000_000;
const AGY = 500;
const SCRIPT = '/Users/p/Library/Application Support/Tortie/gmux/antigravity-usage/status.sh';
const SPLICED = `agy --settings ${antigravitySettingsJson(SCRIPT)}`;
const RUN = `sh -c ${antigravityStatusCommand(SCRIPT)}`;

interface Child {
  pid: number;
  stat: string;
  /** What `ps -o command=` prints for it, null when it has gone by then. */
  command: string | null;
  ppid?: number;
}

class Harness {
  now = T0;
  children: Child[] = [];
  readonly asked: number[] = [];
  readonly statuses: SessionStatus[] = [];
  readonly dir = mkdtempSync(join(tmpdir(), 'gmux-p374-runs-'));
  readonly monitor: SessionActivityMonitor;
  constructor(
    readonly agy: string,
    agent = 'antigravity'
  ) {
    this.monitor = new SessionActivityMonitor({
      sessions: () => [{ id: 's1', tmuxId: '$1', agent, cwd: '/w' }],
      exec: (async () =>
        ['$1', '%1', String(AGY), '1', '0', '', '', String(Math.floor((T0 - 60_000) / 1000)), '0', '0', '0', '0', '25000', 'agy', ''].join('\t')) as never,
      run: async () => 'at rest\n',
      readProc: async () =>
        parseProcTable(
          [`${String(AGY)} 1 0:00.10 S+`, ...this.children.map((c) => `${String(c.pid)} ${String(c.ppid ?? AGY)} 0:00.00 ${c.stat}`)].join('\n'),
          this.now
        ),
      readWitness: async (pid: number) => (pid === AGY ? { found: true, stat: 'S+', ppid: 1 } : { found: false, stat: '', ppid: null }),
      readCommand: async (pid: number) => {
        this.asked.push(pid);
        return pid === AGY ? this.agy : (this.children.find((c) => c.pid === pid)?.command ?? null);
      },
      readChildren: async () => [],
      claudeSessionsDir: this.dir,
      onStatus: (_id: string, status: SessionStatus) => void this.statuses.push(status),
      onActivity: () => undefined
    } as never);
  }
  /** Idle first, then `ticks` ticks with these children; every status told from then on. */
  async over(children: Child[], ticks = 6): Promise<SessionStatus[]> {
    for (let i = 0; i < 8; i += 1) await this.tick();
    this.statuses.length = 0;
    this.asked.length = 0;
    this.children = children;
    for (let i = 0; i < ticks; i += 1) await this.tick();
    return this.statuses;
  }
  async tick(): Promise<void> {
    this.now += 1000;
    // Inside the probe window, as a session whose person just pressed a key is.
    this.monitor.noteUserInput('s1');
    await this.monitor.tick();
  }
}

const made: Harness[] = [];
const harness = (agy = SPLICED, agent?: string): Harness => {
  const h = new Harness(agy, agent);
  (h.monitor as unknown as { now: () => number }).now = () => h.now;
  made.push(h);
  return h;
};
afterEach(() => {
  for (const h of made.splice(0)) {
    h.monitor.dispose();
    rmSync(h.dir, { recursive: true, force: true });
  }
});

const RUNS: Array<[string, Child]> = [
  ['leading a session', { pid: 900, stat: 'Ss', command: RUN }],
  ['leading a session on a terminal of its own', { pid: 900, stat: 'Ss+', command: RUN }],
  ['by the shell’s whole path', { pid: 900, stat: 'Ss', command: RUN.replace('sh ', '/bin/sh ') }],
  ['gone by the time it is asked about', { pid: 900, stat: 'Ss', command: null }],
  ['ending', { pid: 900, stat: 'Zs', command: '(sh)' }],
  ['over and not yet collected', { pid: 900, stat: 'Zs', command: '<defunct>' }],
  ['still the copy of agy that has not started it', { pid: 900, stat: 'Ss', command: SPLICED }]
];

describe('A1: Tortie’s own run is not evidence of work', () => {
  it('in every shape a run can be met, an idle agy started with the flag stays idle', async () => {
    for (const [name, child] of RUNS) expect([name, await harness().over([child])]).toEqual([name, []]);
  });

  it('under an agy whose line shows no flag, the run by its own line is still no tool, and everything else reads running, as it did', async () => {
    for (const agy of ['agy', 'agy --settings /mine.json']) {
      for (const [name, child] of RUNS) {
        const own = child.command?.includes('trap ') === true && child.command !== SPLICED;
        expect([agy, name, (await harness(agy).over([child]))[0]]).toEqual([agy, name, own ? undefined : 'running']);
      }
    }
  });

  it('a tool of a flagged agy reads running, alone and beside a run, and is asked about once', async () => {
    for (const stat of ['Ss', 'Ss+']) {
      const tool = { pid: 901, stat, command: 'sleep 25' };
      expect([stat, (await harness().over([tool]))[0]]).toEqual([stat, 'running']);
      const h = harness();
      expect([stat, (await h.over([tool, { pid: 900, stat: 'Ss', command: RUN }]))[0]]).toEqual([stat, 'running']);
      // A terminal's holder is asked about by the foreground gate as well, once.
      const asked = h.asked.filter((pid) => pid === 901).length;
      expect([stat, asked <= 2]).toEqual([stat, true]);
      for (let i = 0; i < 6; i += 1) await h.tick();
      expect([stat, h.asked.filter((pid) => pid === 901).length]).toEqual([stat, asked]);
    }
  });

  it('a command that only names the script is a tool, and a child of a child that has gone is one', async () => {
    for (const command of [`cat ${SCRIPT}`, `sh -c cat ${SCRIPT}`, `sh -c true; ${antigravityStatusCommand(SCRIPT)}`]) {
      expect([command, (await harness().over([{ pid: 901, stat: 'Ss', command }]))[0]]).toEqual([command, 'running']);
    }
    const under = [
      { pid: 910, stat: 'S', command: 'node helper' },
      { pid: 911, stat: 'Ss', command: null, ppid: 910 }
    ];
    expect((await harness().over(under))[0]).toBe('running');
  });

  it('no other agent is asked, and a session with no leader under it costs no read', async () => {
    const pi = harness(SPLICED, 'pi');
    expect((await pi.over([{ pid: 900, stat: 'Ss', command: RUN }]))[0]).toBe('running');
    const quiet = harness();
    await quiet.over([{ pid: 900, stat: 'S', command: RUN }]);
    expect(quiet.asked.filter((pid) => pid === 900)).toEqual([]);
  });
});
