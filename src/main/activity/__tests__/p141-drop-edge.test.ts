/**
 * Phase 141 — the drop edge, driven through the whole monitor.
 *
 * The rules next door are pure and are tested on their own. This file drives
 * the loop: fake tmux output in, one fake process table per tick, and the
 * three one-process reads injected so the test never shells out and never
 * needs a process on this machine to play a part.
 *
 * The first two cases are the ones the phase turns on. A session Tortie has
 * restored, with its command armed and unpressed, offers no verb. A session
 * whose agent has actually left offers exactly one, once.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  SessionActivityMonitor,
  type ActivityMonitorDeps,
  type ActivitySession,
  type HandbackFact
} from '../monitor';
import { parseProcTable, type ProcSnapshot } from '../process';

interface FakePane {
  tmuxId: string;
  paneId: string;
  panePid: number;
  command?: string;
  title?: string;
  dead?: boolean;
}

class Harness {
  now = 1_800_000_000_000;
  panes: FakePane[] = [];
  sessions: ActivitySession[] = [];
  /** `ps -axo pid=,ppid=,time=,stat=` for this tick, or '' for no table. */
  procTable = '';
  /** pid -> whole command line, for the one-process reads. */
  commands = new Map<number, string>();
  readonly handbacks: Array<[string, HandbackFact]> = [];
  readonly claudeDir = mkdtempSync(join(tmpdir(), 'gmux-p141-'));
  readonly monitor: SessionActivityMonitor;

  constructor(extra: Partial<ActivityMonitorDeps> = {}) {
    this.monitor = new SessionActivityMonitor({
      sessions: () => this.sessions,
      exec: (async (args: readonly string[]) => {
        if (args[0] !== 'list-panes') throw new Error(`unexpected ${args[0]}`);
        return this.panes
          .map((p) =>
            [
              p.tmuxId,
              p.paneId,
              String(p.panePid),
              '1',
              p.dead === true ? '1' : '0',
              '',
              '',
              String(Math.floor(this.now / 1000)),
              '1',
              '0',
              '0',
              '0',
              '25000',
              p.command ?? 'zsh',
              p.title ?? 'title'
            ].join('\t')
          )
          .join('\n');
      }) as never,
      run: async () => '',
      readProc: async (): Promise<ProcSnapshot | null> =>
        this.procTable.length === 0
          ? null
          : parseProcTable(this.procTable, this.now),
      readWitness: async (pid) => {
        const snap = parseProcTable(this.procTable, this.now);
        const stat = snap.stat.get(pid);
        const ppid = snap.ppid.get(pid);
        return stat === undefined || ppid === undefined
          ? { found: false, stat: '', ppid: null }
          : { found: true, stat, ppid };
      },
      readCommand: async (pid) => this.commands.get(pid) ?? null,
      readChildren: async (pid) => {
        const snap = parseProcTable(this.procTable, this.now);
        return [...(snap.children.get(pid) ?? [])].sort((a, b) => a - b);
      },
      claudeSessionsDir: this.claudeDir,
      onStatus: () => {},
      onActivity: () => {},
      onDead: () => {},
      onHandback: (id, fact) => {
        this.handbacks.push([id, fact]);
      },
      now: () => this.now,
      ...extra
    });
  }

  /** Write one claude registry file, as claude itself does. */
  claudeFile(pid: number, extra: Record<string, unknown> = {}): void {
    writeFileSync(
      join(this.claudeDir, `${String(pid)}.json`),
      JSON.stringify({
        kind: 'interactive',
        status: 'idle',
        pid,
        statusUpdatedAt: this.now,
        ...extra
      })
    );
  }

  async tick(advanceMs = 1_000): Promise<void> {
    await this.monitor.tick();
    this.now += advanceMs;
  }

  dispose(): void {
    this.monitor.dispose();
    rmSync(this.claudeDir, { recursive: true, force: true });
  }
}

let h: Harness;
afterEach(() => {
  h?.dispose();
});

const agentSession = (agent: string): ActivitySession => ({
  id: 's1',
  tmuxId: '$1',
  agent,
  cwd: '/Users/g/projects/auth'
});

describe('THE RESTORED SESSION, first and non negotiable', () => {
  it('offers no verb while its command sits armed and unpressed', async () => {
    h = new Harness();
    h.sessions = [agentSession('claude')];
    h.panes = [{ tmuxId: '$1', paneId: '%1', panePid: 500 }];
    // The login shell, holding the terminal, with nothing under it. This is
    // what a restored session reads as, and it is what a dropped session
    // reads as too.
    h.procTable = '500 1 0:00.31 Ss+\n';
    for (let i = 0; i < 6; i++) await h.tick();
    expect(h.handbacks).toEqual([]);
    expect(h.monitor.handbackFor('s1')).toBe('none');
  });

  it('still offers no verb after an ordinary command runs in it', async () => {
    h = new Harness();
    h.sessions = [agentSession('codex')];
    h.panes = [{ tmuxId: '$1', paneId: '%1', panePid: 500 }];
    h.procTable = '500 1 0:00.31 Ss+\n';
    await h.tick();
    // He types `npm test` at the armed prompt.
    h.procTable = '500 1 0:00.31 Ss\n930 500 0:12.00 S+\n';
    h.commands.set(930, 'npm test');
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, command: 'node' }
    ];
    await h.tick();
    await h.tick();
    // It ends.
    h.procTable = '500 1 0:00.31 Ss+\n';
    h.panes = [{ tmuxId: '$1', paneId: '%1', panePid: 500 }];
    await h.tick();
    await h.tick();
    expect(h.handbacks).toEqual([]);
    expect(h.monitor.handbackFor('s1')).toBe('none');
  });

  it('reads the command line once per process, not once per tick', async () => {
    h = new Harness();
    h.sessions = [agentSession('codex')];
    h.panes = [{ tmuxId: '$1', paneId: '%1', panePid: 500 }];
    h.procTable = '500 1 0:00.31 Ss\n930 500 0:12.00 S+\n';
    let reads = 0;
    h.commands.set(930, 'npm test');
    const original = h.commands.get.bind(h.commands);
    h.commands.get = ((pid: number) => {
      reads++;
      return original(pid);
    }) as typeof h.commands.get;
    for (let i = 0; i < 5; i++) await h.tick();
    expect(reads).toBe(1);
  });
});

describe('the agent leaves', () => {
  it('offers the verb once, within one tick of the process going', async () => {
    h = new Harness();
    h.sessions = [agentSession('codex')];
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, command: 'codex' }
    ];
    h.procTable = '500 1 0:00.31 Ss\n900 500 0:41.00 S+\n';
    h.commands.set(900, '/Users/g/.local/bin/codex');
    await h.tick();
    expect(h.monitor.handbackFor('s1')).toBe('none');
    // He presses Control C twice. The process is gone and his prompt is back.
    h.procTable = '500 1 0:00.40 Ss+\n';
    h.panes = [{ tmuxId: '$1', paneId: '%1', panePid: 500 }];
    const at = h.now;
    await h.tick();
    expect(h.monitor.handbackFor('s1')).toBe('left');
    expect(h.handbacks).toEqual([['s1', { kind: 'left', at, leftAt: at }]]);
    // And it is said once, not once a second.
    await h.tick();
    await h.tick();
    expect(h.handbacks).toHaveLength(1);
  });

  it('says nothing when he presses Control Z', async () => {
    h = new Harness();
    h.sessions = [agentSession('codex')];
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, command: 'codex' }
    ];
    h.procTable = '500 1 0:00.31 Ss\n900 500 0:41.00 S+\n';
    h.commands.set(900, 'codex');
    await h.tick();
    h.procTable = '500 1 0:00.40 Ss+\n900 500 0:41.00 T\n';
    h.panes = [{ tmuxId: '$1', paneId: '%1', panePid: 500 }];
    await h.tick();
    await h.tick();
    expect(h.handbacks).toEqual([]);
  });

  it('never watches a session that is a shell', async () => {
    h = new Harness();
    h.sessions = [agentSession('shell')];
    h.panes = [{ tmuxId: '$1', paneId: '%1', panePid: 500, command: 'zsh' }];
    h.procTable = '500 1 0:00.31 Ss\n900 500 0:41.00 S+\n';
    h.commands.set(900, '/Users/g/.local/bin/codex --resume abc');
    await h.tick();
    h.procTable = '500 1 0:00.40 Ss+\n';
    await h.tick();
    expect(h.handbacks).toEqual([]);
  });

  it('takes claude out of its own record, in the restore shape', async () => {
    h = new Harness();
    h.sessions = [agentSession('claude')];
    h.panes = [{ tmuxId: '$1', paneId: '%1', panePid: 500 }];
    h.procTable = '500 1 0:00.31 Ss\n900 500 0:41.00 S+\n';
    h.claudeFile(900, { sessionId: '7f891378-5855-4776-ae75-57efeeb67bb6' });
    await h.tick();
    h.procTable = '500 1 0:00.40 Ss+\n';
    await h.tick();
    expect(h.handbacks.map(([, f]) => f.kind)).toEqual(['left']);
  });

  it('answers which conversation claude had open in that pane', async () => {
    h = new Harness();
    h.sessions = [agentSession('claude')];
    h.panes = [{ tmuxId: '$1', paneId: '%1', panePid: 500 }];
    h.procTable = '500 1 0:00.31 Ss\n900 500 0:41.00 S+\n';
    h.claudeFile(900, {
      sessionId: '7f891378-5855-4776-ae75-57efeeb67bb6',
      cwd: '/Users/g/projects/auth'
    });
    await h.tick();
    expect(h.monitor.claudeConversationForPane('%1', 900)).toEqual({
      sessionId: '7f891378-5855-4776-ae75-57efeeb67bb6',
      cwd: '/Users/g/projects/auth',
      pid: 900
    });
    expect(h.monitor.claudeConversationForPane('%9')).toBe(null);
  });
});

describe('the way back', () => {
  const drop = async (): Promise<void> => {
    h.sessions = [agentSession('codex')];
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, command: 'codex' }
    ];
    h.procTable = '500 1 0:00.31 Ss\n900 500 0:41.00 S+\n';
    h.commands.set(900, 'codex');
    await h.tick();
    h.procTable = '500 1 0:00.40 Ss+\n';
    h.panes = [{ tmuxId: '$1', paneId: '%1', panePid: 500 }];
    await h.tick();
  };

  it('sees what he typed, and hands over its whole command line', async () => {
    h = new Harness();
    await drop();
    // He pastes the line codex printed as it left, and presses Enter.
    h.procTable = '500 1 0:00.50 Ss\n951 500 0:00.10 S+\n';
    h.commands.set(951, 'codex resume 019febf5-e7fa-7e32-8fd5-c4a56e10a859');
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, command: 'codex' }
    ];
    await h.tick();
    const last = h.handbacks[h.handbacks.length - 1];
    expect(last?.[1]).toMatchObject({
      kind: 'returning',
      pid: 951,
      command: 'codex resume 019febf5-e7fa-7e32-8fd5-c4a56e10a859'
    });
    expect(h.monitor.handbackFor('s1')).toBe('returning');
  });

  it('brings the verb back when the resume he typed fails', async () => {
    h = new Harness();
    await drop();
    const leftAt = h.handbacks[0]?.[1].leftAt;
    h.procTable = '500 1 0:00.50 Ss\n951 500 0:00.10 S+\n';
    h.commands.set(951, 'codex resume nope');
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, command: 'codex' }
    ];
    await h.tick();
    // One to two seconds later it is gone again, which is what a resume that
    // failed looks like.
    h.procTable = '500 1 0:00.60 Ss+\n';
    h.panes = [{ tmuxId: '$1', paneId: '%1', panePid: 500 }];
    await h.tick();
    expect(h.monitor.handbackFor('s1')).toBe('left');
    const last = h.handbacks[h.handbacks.length - 1];
    expect(last?.[1].kind).toBe('left');
    // And it still says the time the AGENT left, not the time this ended.
    expect(last?.[1].leftAt).toBe(leftAt);
  });

  it('clears the whole state when the conversation is confirmed', async () => {
    h = new Harness();
    await drop();
    h.procTable = '500 1 0:00.50 Ss\n951 500 0:00.10 S+\n';
    h.commands.set(951, 'codex resume 019febf5-e7fa-7e32-8fd5-c4a56e10a859');
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, command: 'codex' }
    ];
    await h.tick();
    h.monitor.noteHandbackResolved('s1', 'adopted');
    expect(h.monitor.handbackFor('s1')).toBe('none');
    await h.tick();
    expect(h.monitor.handbackFor('s1')).toBe('none');
  });

  it('stays unconfirmed, and offers no verb, when it cannot be sure', async () => {
    h = new Harness();
    await drop();
    h.procTable = '500 1 0:00.50 Ss\n951 500 0:00.10 S+\n';
    h.commands.set(951, 'codex');
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, command: 'codex' }
    ];
    await h.tick();
    h.monitor.noteHandbackResolved('s1', 'unconfirmed');
    expect(h.monitor.handbackFor('s1')).toBe('unconfirmed');
    await h.tick();
    expect(h.monitor.handbackFor('s1')).toBe('unconfirmed');
  });

  it('looks once and moves on when the trigger finds nothing there', async () => {
    h = new Harness();
    await drop();
    // The field moved but whatever it was has already gone.
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, command: 'git' }
    ];
    await h.tick();
    expect(h.monitor.handbackFor('s1')).toBe('left');
    await h.tick();
    expect(h.handbacks).toHaveLength(1);
  });
});

describe('the accelerator claude gets for free', () => {
  /**
   * FOUND IN THE FIX ROUND, while re-deriving the second verdict, and it is
   * the phase's own promise rather than a verifier's finding.
   *
   * `src/main/sessions/core.ts` forgets the activity state right after the
   * hook, because the agent ended. Forgetting it whole took the drop with it,
   * so the monitor began the next tick knowing nothing at all about this
   * session, could never see the person type their resume, and left the row
   * offering the verb with the agent already back.
   */
  it('still sees the person come back after the hook forgets the session', async () => {
    h = new Harness({ readProc: async () => null });
    h.sessions = [agentSession('claude')];
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, command: 'claude' }
    ];
    h.procTable = '500 1 0:00.31 Ss\n700 500 0:09.00 S+\n';
    h.claudeFile(700, {
      tmux: 'c1:@0.%1',
      sessionId: '7f891378-5855-4776-ae75-57efeeb67bb6'
    });
    await h.tick();
    // The hook path, in the order core.ts runs it.
    h.procTable = '500 1 0:00.31 Ss+\n';
    rmSync(join(h.claudeDir, '700.json'), { force: true });
    await h.monitor.checkWitness('s1');
    h.monitor.forget('s1', true);
    expect(h.monitor.handbackFor('s1')).toBe('left');
    // He types the resume himself.
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, command: 'claude' }
    ];
    h.procTable = '500 1 0:00.31 Ss\n810 500 0:00.20 S+\n';
    h.commands.set(810, '/usr/local/bin/claude --resume 7f891378');
    await h.tick();
    await h.tick();
    expect(h.handbacks.map(([, f]) => f.kind)).toEqual(['left', 'returning']);
  });

  it('reaches the edge without waiting for a tick', async () => {
    h = new Harness();
    h.sessions = [agentSession('claude')];
    h.panes = [{ tmuxId: '$1', paneId: '%1', panePid: 500 }];
    h.procTable = '500 1 0:00.31 Ss\n900 500 0:41.00 S+\n';
    h.claudeFile(900, { sessionId: '7f891378-5855-4776-ae75-57efeeb67bb6' });
    await h.tick();
    expect(h.handbacks).toEqual([]);
    // claude's SessionEnd hook arrives. The process is already gone.
    h.procTable = '500 1 0:00.40 Ss+\n';
    await h.monitor.checkWitness('s1');
    expect(h.monitor.handbackFor('s1')).toBe('left');
  });
});

describe('the hole an oracle leaves, written down rather than hidden', () => {
  /**
   * codex publishes `idle` through its pane title whenever the title is the
   * working directory's name, so such a session never joins the ambiguous set
   * and the fleet process table is never read for it. It can run its whole
   * life with no witness and offer no verb. Closing that costs one table read
   * every few seconds and it is the operator's call, so the capability is
   * here and nothing wires it.
   */
  const idleCodex = (): void => {
    h.sessions = [
      { id: 's1', tmuxId: '$1', agent: 'codex', cwd: '/Users/g/projects/auth' }
    ];
    h.panes = [
      {
        tmuxId: '$1',
        paneId: '%1',
        panePid: 500,
        command: 'codex',
        title: 'auth'
      }
    ];
    h.procTable = '500 1 0:00.31 Ss\n900 500 0:41.00 S+\n';
    h.commands.set(900, '/Users/g/.local/bin/codex');
  };

  it('offers no verb for a codex session that was idle from the start', async () => {
    h = new Harness();
    idleCodex();
    await h.tick();
    h.procTable = '500 1 0:00.40 Ss+\n';
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, title: 'auth' }
    ];
    await h.tick();
    expect(h.handbacks).toEqual([]);
  });

  it('offers it the moment the witness table is wired', async () => {
    h = new Harness({
      readProcForWitness: async () =>
        h.procTable.length === 0
          ? null
          : parseProcTable(h.procTable, h.now)
    });
    idleCodex();
    await h.tick();
    h.procTable = '500 1 0:00.40 Ss+\n';
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, title: 'auth' }
    ];
    await h.tick(6_000);
    expect(h.handbacks.map(([, f]) => f.kind)).toEqual(['left']);
  });
});

/**
 * The two blocking defects the RE-VERIFIER found, driving the shipped modules
 * against a real tmux server after the first fix round. It proved both causes
 * by patching a copy and watching the symptom go, and the real-process version
 * of each case below belongs to it. These are the same two cases driven
 * through the loop's own seams, so they run in the battery rather than only on
 * a machine with claude on it.
 */
describe('the two blocking defects the re-verifier found', () => {
  /**
   * BLOCKING 1. Quitting claude through its own `SessionEnd` hook lost the
   * witness, so there was often no drop and no verb at all, for the agent he
   * uses most.
   *
   * The hook is installed synchronously on purpose, because an asynchronous
   * one loses the event when the process exits, so CLAUDE IS STILL ALIVE when
   * Tortie handles it. The check reads a live process and correctly declares
   * nothing, and forgetting the session then threw the pid away. claude exited
   * a moment later and deleted its own record, so the next tick had no pid to
   * read and could take no new witness either. The re-verifier measured it as a
   * race against the one second tick: it passed only when a tick happened to
   * land inside the second claude took to wind down.
   */
  it('sees the drop when claude is STILL ALIVE as its own hook arrives', async () => {
    h = new Harness({ readProc: async () => null });
    h.sessions = [agentSession('claude')];
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, command: 'claude' }
    ];
    h.procTable = '500 1 0:00.31 Ss\n700 500 0:09.00 S+\n';
    h.claudeFile(700, {
      tmux: 'c1:@0.%1',
      sessionId: '7f891378-5855-4776-ae75-57efeeb67bb6'
    });
    await h.tick();
    // The hook path, in the order core.ts runs it, with claude still there.
    await h.monitor.checkWitness('s1');
    h.monitor.forget('s1', true);
    expect(h.handbacks).toEqual([]);
    expect(h.monitor.handbackFor('s1')).toBe('none');
    // claude exits and deletes its own record on the way out, so nothing but
    // the kept pid can ever see that it went.
    h.procTable = '500 1 0:00.40 Ss+\n';
    rmSync(join(h.claudeDir, '700.json'), { force: true });
    h.panes = [{ tmuxId: '$1', paneId: '%1', panePid: 500, command: 'zsh' }];
    const at = h.now;
    await h.tick();
    expect(h.monitor.handbackFor('s1')).toBe('left');
    expect(h.handbacks).toEqual([['s1', { kind: 'left', at, leftAt: at }]]);
    // And he can still come back into it, which is the other half of the
    // promise the lost witness took with it.
    h.procTable = '500 1 0:00.50 Ss\n810 500 0:00.20 S+\n';
    h.commands.set(810, '/usr/local/bin/claude --resume 7f891378');
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, command: 'claude' }
    ];
    await h.tick();
    expect(h.handbacks.map(([, f]) => f.kind)).toEqual(['left', 'returning']);
  });

  /**
   * BLOCKING 2. A leftover claude record announced that an agent had left a
   * session where NO agent ever ran, which is the cardinal rule and the exact
   * outcome three designs were killed for.
   *
   * The two conditions arrive together in reality. A crash or a reboot kills
   * claude without letting it delete its records AND takes the tmux server
   * with it, so pane ids start again at %0 and the sessions Tortie restores
   * wear exactly the ids the stale records name. This machine did all of that
   * on 2026-08-22.
   */
  it('says nothing on a restored session that a leftover record names', async () => {
    const read: number[] = [];
    h = new Harness({
      readProc: async () => null,
      readWitness: async (pid) => {
        read.push(pid);
        const snap = parseProcTable(h.procTable, h.now);
        const stat = snap.stat.get(pid);
        const ppid = snap.ppid.get(pid);
        return stat === undefined || ppid === undefined
          ? { found: false, stat: '', ppid: null }
          : { found: true, stat, ppid };
      }
    });
    h.sessions = [agentSession('claude')];
    // The login shell, holding the terminal, with its command armed and
    // unpressed and nothing under it.
    h.panes = [{ tmuxId: '$1', paneId: '%1', panePid: 500 }];
    h.procTable = '500 1 0:00.31 Ss+\n';
    // The record the last boot left behind. It names this pane, and its pid
    // died with that boot.
    h.claudeFile(811, {
      tmux: 'c1:@0.%1',
      sessionId: '7f891378-5855-4776-ae75-57efeeb67bb6'
    });
    for (let i = 0; i < 6; i++) await h.tick();
    expect(h.handbacks).toEqual([]);
    expect(h.monitor.handbackFor('s1')).toBe('none');
    // And the dead pid is read once, not once a second.
    expect(read).toEqual([811]);
  });

  /**
   * The same record, with the process it names really there. Refusing the
   * leftover file may not cost a healthy claude its witness, so the case that
   * must keep working is written beside the one that must not.
   */
  it('still witnesses the record when the process it names is really there', async () => {
    h = new Harness({ readProc: async () => null });
    h.sessions = [agentSession('claude')];
    h.panes = [{ tmuxId: '$1', paneId: '%1', panePid: 500 }];
    h.procTable = '500 1 0:00.31 Ss\n811 500 0:09.00 S+\n';
    h.claudeFile(811, {
      tmux: 'c1:@0.%1',
      sessionId: '7f891378-5855-4776-ae75-57efeeb67bb6'
    });
    await h.tick();
    expect(h.handbacks).toEqual([]);
    // He quits it himself.
    h.procTable = '500 1 0:00.40 Ss+\n';
    rmSync(join(h.claudeDir, '811.json'), { force: true });
    await h.tick();
    expect(h.handbacks.map(([, f]) => f.kind)).toEqual(['left']);
  });
});

/**
 * Both cases here were found by the Tier 3 verifier driving the real modules
 * against real processes on a scratch tmux server, and both were false drops.
 * The first announced that an agent had left while it was working; the second
 * took the word away 199 ms after it appeared.
 */
describe('the two false drops the fix round closed', () => {
  it('says nothing about a captured agent, which is a GRANDCHILD of its pane', async () => {
    // SpecStory capture runs the shell, then specstory, then the agent, so the
    // agent's parent is not the pane's own process. The reuse guard used to
    // read the pane's own process as the parent whatever the truth was, and
    // therefore answered "this pid was reused" on every tick of a healthy
    // agent. A claude row is never ambiguous, so no fleet table is read and
    // the targeted read is the only one there is.
    h = new Harness({ readProc: async () => null });
    h.sessions = [agentSession('claude')];
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, command: 'claude' }
    ];
    h.procTable =
      '500 1 0:00.31 Ss\n600 500 0:00.10 S\n700 600 0:09.00 S+\n';
    h.claudeFile(700, {
      tmux: 'c1:@0.%1',
      sessionId: '7f891378-5855-4776-ae75-57efeeb67bb6'
    });
    for (let i = 0; i < 6; i++) await h.tick();
    expect(h.handbacks).toEqual([]);
    expect(h.monitor.handbackFor('s1')).toBe('none');
  });

  it('keeps the verb when the accelerator fires and a background job is there', async () => {
    h = new Harness({ readProc: async () => null });
    h.sessions = [agentSession('claude')];
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, command: 'claude' }
    ];
    // The shell, a background job that does NOT hold the terminal, and claude.
    h.procTable =
      '500 1 0:00.31 Ss\n650 500 0:00.05 SN\n700 500 0:09.00 S+\n';
    h.claudeFile(700, {
      tmux: 'c1:@0.%1',
      sessionId: '7f891378-5855-4776-ae75-57efeeb67bb6'
    });
    await h.tick();
    // claude ends, and its own hook arrives between two ticks carrying the
    // pane facts of the tick before it, on which the command still reads
    // `claude`. The background job stays.
    h.procTable = '500 1 0:00.31 Ss+\n650 500 0:00.05 SN\n';
    h.commands.set(650, 'sleep 900');
    await h.monitor.checkWitness('s1');
    expect(h.monitor.handbackFor('s1')).toBe('left');
    // The tick that follows reads the pane back at the shell. The background
    // job holds no terminal, so it is not the agent coming back.
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, command: 'zsh' }
    ];
    await h.tick();
    await h.tick();
    expect(h.handbacks.map(([, f]) => f.kind)).toEqual(['left']);
    expect(h.monitor.handbackFor('s1')).toBe('left');
  });

  it('still sees the person come back after that accelerated drop', async () => {
    h = new Harness({ readProc: async () => null });
    h.sessions = [agentSession('claude')];
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, command: 'claude' }
    ];
    h.procTable = '500 1 0:00.31 Ss\n700 500 0:09.00 S+\n';
    h.claudeFile(700, {
      tmux: 'c1:@0.%1',
      sessionId: '7f891378-5855-4776-ae75-57efeeb67bb6'
    });
    await h.tick();
    h.procTable = '500 1 0:00.31 Ss+\n';
    await h.monitor.checkWitness('s1');
    expect(h.monitor.handbackFor('s1')).toBe('left');
    // He types the resume himself. It holds the terminal, so it is real.
    h.panes = [
      { tmuxId: '$1', paneId: '%1', panePid: 500, command: 'claude' }
    ];
    h.procTable = '500 1 0:00.31 Ss\n810 500 0:00.20 S+\n';
    h.commands.set(810, '/usr/local/bin/claude --resume 7f891378');
    await h.tick();
    await h.tick();
    expect(h.handbacks.map(([, f]) => f.kind)).toEqual(['left', 'returning']);
  });
});
