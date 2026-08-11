/**
 * SessionActivityMonitor — the state machine, driven over fake tmux output.
 *
 * These are the BACKLOG's acceptance criteria as replayable cases. Every one
 * of them was also run live against the private `-L gmux` server on
 * 2026-08-10 (see the Phase 13 commit); this file is what keeps them true.
 *
 * The regression that started Phase 13 is A11: a session that was once
 * visible and once produced output used to be pinned to "working" for the
 * rest of its life. Here the pin has nowhere to live — every tick recomputes
 * from tmux, and a quiet session reaches idle.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionStatus } from '@shared/types';
import { SessionActivityMonitor, type ActivitySession } from '../monitor';
import { parseProcTable, type ProcSnapshot } from '../process';

const fixture = (name: string): string =>
  readFileSync(join(__dirname, 'fixtures', name), 'utf8');

/** One fake pane, in the order PANE_FORMAT emits. */
interface FakePane {
  tmuxId: string;
  paneId: string;
  panePid: number;
  dead?: boolean;
  deadStatus?: string;
  /** `#{pane_dead_signal}`, e.g. "term" — empty for a real exit. */
  deadSignal?: string;
  /** Epoch SECONDS, as tmux reports. */
  activity: number;
  keypad?: boolean;
  alternate?: boolean;
  inMode?: boolean;
  /** `#{history_size}` / `#{history_limit}` — Phase 13.7's two extra fields. */
  historySize?: number;
  historyLimit?: number;
  command?: string;
  title?: string;
}

class Harness {
  now = 1_800_000_000_000;
  panes: FakePane[] = [];
  sessions: ActivitySession[] = [];
  captures = new Map<string, string>();
  readonly statuses: Array<[string, SessionStatus]> = [];
  readonly dead: Array<[string, number | undefined, string | undefined]> = [];
  readonly monitor: SessionActivityMonitor;
  /** Tier-2 table; hermetic — these tests never shell out to the real `ps`. */
  procTable = '';
  /** Stand-in for ~/.claude/sessions; hermetic — never reads the real home. */
  readonly claudeDir = mkdtempSync(join(tmpdir(), 'gmux-claude-reg-'));

  constructor() {
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
              p.deadStatus ?? '',
              p.deadSignal ?? '',
              String(p.activity),
              p.keypad === true ? '1' : '0',
              p.alternate === true ? '1' : '0',
              p.inMode === true ? '1' : '0',
              String(p.historySize ?? 0),
              String(p.historyLimit ?? 25_000),
              p.command ?? 'zsh',
              p.title ?? ''
            ].join('\t')
          )
          .join('\n');
      }) as never,
      run: async (args: readonly string[]) => {
        const target = args[args.indexOf('-t') + 1] ?? '';
        return this.captures.get(target) ?? '';
      },
      readProc: async (): Promise<ProcSnapshot | null> =>
        parseProcTable(this.procTable, this.now),
      claudeSessionsDir: this.claudeDir,
      onStatus: (id, status) => this.statuses.push([id, status]),
      onActivity: () => undefined,
      onDead: (id, code, signal) => this.dead.push([id, code, signal]),
      now: () => this.now
    });
  }

  /** Advance the clock and run one tick. */
  async tick(seconds = 1): Promise<void> {
    this.now += seconds * 1000;
    await this.monitor.tick();
  }

  /** Mark a pane as having produced output right now. */
  touch(paneId: string): void {
    const pane = this.panes.find((p) => p.paneId === paneId);
    if (pane) pane.activity = Math.floor(this.now / 1000);
  }

  /** Write a claude registry entry exactly as claude does. */
  claudeEntry(pid: number, paneId: string | null, status: string): void {
    writeFileSync(
      join(this.claudeDir, `${pid}.json`),
      JSON.stringify({
        pid,
        kind: 'interactive',
        version: '2.1.226',
        tmux: paneId === null ? null : `whatever-the-old-name-was:@1.${paneId}`,
        status,
        statusUpdatedAt: this.now
      })
    );
  }

  cleanup(): void {
    rmSync(this.claudeDir, { recursive: true, force: true });
  }

  last(sessionId: string): SessionStatus | undefined {
    for (let i = this.statuses.length - 1; i >= 0; i--) {
      const row = this.statuses[i];
      if (row?.[0] === sessionId) return row[1];
    }
    return undefined;
  }
}

let h: Harness;
beforeEach(() => {
  h = new Harness();
});
afterEach(() => {
  h.cleanup();
});

/** A codex session, whose whole state machine is its pane title. */
function codexSession(title: string): void {
  h.sessions = [{ id: 's1', tmuxId: '$1', agent: 'codex', cwd: '/Users/gdc/work' }];
  h.panes = [
    {
      tmuxId: '$1',
      paneId: '%1',
      panePid: 100,
      activity: Math.floor(h.now / 1000),
      title
    }
  ];
}

describe('A2/A1 — codex: submit → working, finish → idle', () => {
  it('flips on the title alone, with no output and no ps', async () => {
    codexSession('work');
    await h.tick();
    expect(h.last('s1')).toBe('idle');

    // A braille frame appears the instant codex starts a turn.
    h.panes[0]!.title = '⠙ work';
    await h.tick();
    expect(h.last('s1')).toBe('running');

    // …and disappears the instant it stops. Tier 0 is instant BOTH ways: no
    // three-tick wait, because the oracle is not an inference.
    h.panes[0]!.title = 'work';
    await h.tick();
    expect(h.last('s1')).toBe('idle');
  });

  it('reads the attention banner as needs input', async () => {
    codexSession('[ ! ] Action Required | work');
    await h.tick();
    expect(h.last('s1')).toBe('needs_input');
  });
});

describe('A6 — a plain shell', () => {
  beforeEach(() => {
    h.sessions = [{ id: 'sh', tmuxId: '$2', agent: 'shell', cwd: '/Users/gdc' }];
    h.panes = [
      {
        tmuxId: '$2',
        paneId: '%2',
        panePid: 200,
        activity: Math.floor(h.now / 1000),
        keypad: true,
        title: 'Gregs-MacBook-Pro-2.local'
      }
    ];
  });

  it('is idle at the prompt and working while a command runs', async () => {
    await h.tick();
    expect(h.last('sh')).toBe('idle');

    h.panes[0]!.keypad = false; // ZLE dropped DECKPAM: a command is running
    h.panes[0]!.command = 'sleep';
    await h.tick();
    expect(h.last('sh')).toBe('running');

    h.panes[0]!.keypad = true;
    h.panes[0]!.command = 'zsh';
    await h.tick();
    expect(h.last('sh')).toBe('idle');
  });

  it('treats a full-screen app (less, vim) as idle, never working', async () => {
    h.panes[0]!.keypad = false;
    h.panes[0]!.alternate = true;
    await h.tick();
    expect(h.last('sh')).toBe('idle');
  });

  it('falls through to the floor for a shell that never sets DECKPAM', async () => {
    // bash+readline leaves enable-keypad off; trusting the oracle blindly
    // would pin every bash pane to "working" forever.
    h.panes[0]!.keypad = false;
    h.panes[0]!.title = 'bash';
    await h.tick(); // output is fresh → working
    expect(h.last('sh')).toBe('running');
    await h.tick(5); // quiet…
    await h.tick();
    await h.tick();
    expect(h.last('sh')).toBe('idle');
  });
});

describe('A4/A7 — the floor: an agent with no oracle', () => {
  beforeEach(() => {
    // `droid` carries no native channel in the registry, so this exercises
    // exactly the path a CLI gmux has never seen would take.
    h.sessions = [{ id: 'f', tmuxId: '$3', agent: 'droid', cwd: '/Users/gdc/w' }];
    h.panes = [
      {
        tmuxId: '$3',
        paneId: '%3',
        panePid: 300,
        activity: Math.floor(h.now / 1000)
      }
    ];
  });

  it('promotes on output in one tick and demotes only after three quiet ones', async () => {
    await h.tick();
    expect(h.last('f')).toBe('running');
    h.statuses.length = 0;

    await h.tick(3); // quiet tick 1 — no verdict yet
    expect(h.last('f')).toBeUndefined();
    await h.tick();
    expect(h.last('f')).toBeUndefined();
    await h.tick(); // quiet tick 3
    expect(h.last('f')).toBe('idle');
  });

  it('holds working while a dialog-free screen keeps changing', async () => {
    h.captures.set('%3', 'frame one');
    await h.tick();
    for (let i = 0; i < 6; i++) {
      h.captures.set('%3', `frame ${i}`);
      await h.tick(3); // output clock is stale; only the screen moves
    }
    expect(h.last('f')).toBe('running');
  });

  it('raises needs_input only after TWO consecutive dialog captures', async () => {
    await h.tick(); // working (fresh output)
    h.captures.set('%3', fixture('claude-permission-prompt.txt'));
    await h.tick(4); // quiet + dialog, first sighting
    expect(h.last('f')).not.toBe('needs_input');
    await h.tick();
    expect(h.last('f')).toBe('needs_input');
  });

  it('never drops needs_input straight to idle', async () => {
    await h.tick();
    h.captures.set('%3', fixture('claude-permission-prompt.txt'));
    await h.tick(4);
    await h.tick();
    expect(h.last('f')).toBe('needs_input');

    // A quiet screen with the dialog gone releases it through WORKING…
    h.captures.set('%3', fixture('claude-post-answer.txt'));
    await h.tick();
    await h.tick();
    expect(h.last('f')).toBe('running');
    // …and only then may it settle: the K-tick screen memory has to run out
    // (the answered screen was itself a change) before the three quiet ticks
    // start counting. Slower than an oracle by design — this is the tier
    // that has to survive codex going screen-silent for five seconds
    // mid-stream without ever reporting it idle.
    for (let i = 0; i < 8; i++) await h.tick();
    expect(h.last('f')).toBe('idle');
  });

  it('clears needs_input the moment the user types (Phase 9.2)', async () => {
    await h.tick();
    h.captures.set('%3', fixture('claude-workspace-trust.txt'));
    await h.tick(4);
    await h.tick();
    expect(h.last('f')).toBe('needs_input');

    h.monitor.noteUserInput('f');
    expect(h.last('f')).toBe('running');
  });
});

describe('copy-mode never reads as working', () => {
  it('freezes the verdict while the user scrolls (Phase 12.3)', async () => {
    h.sessions = [{ id: 'f', tmuxId: '$4', agent: 'droid', cwd: '/w' }];
    h.panes = [
      { tmuxId: '$4', paneId: '%4', panePid: 400, activity: Math.floor(h.now / 1000) }
    ];
    await h.tick();
    expect(h.last('f')).toBe('running');
    h.statuses.length = 0;

    h.panes[0]!.inMode = true;
    for (let i = 0; i < 6; i++) await h.tick(3);
    expect(h.statuses).toEqual([]); // held, neither promoted nor demoted
  });
});

describe('A11 — the reported regression', () => {
  it('a session that produced output hours ago reads idle, not working', async () => {
    h.sessions = [{ id: 'c', tmuxId: '$5', agent: 'droid', cwd: '/w' }];
    h.panes = [
      {
        tmuxId: '$5',
        paneId: '%5',
        panePid: 500,
        // window_activity frozen four hours ago, exactly as the user's
        // claude-1 pane was when the tab still read "working".
        activity: Math.floor(h.now / 1000) - 4 * 3600
      }
    ];
    await h.tick();
    await h.tick();
    await h.tick();
    expect(h.last('c')).toBe('idle');
  });
});

describe('A5 — hidden sessions', () => {
  it('evaluates a session no client has ever attached to', async () => {
    // There is no "visible" concept in the monitor at all: it only ever sees
    // `list-panes -a`, which is identical attached and detached.
    codexSession('⠙ work');
    await h.tick();
    expect(h.last('s1')).toBe('running');
    h.panes[0]!.title = 'work';
    await h.tick();
    expect(h.last('s1')).toBe('idle');
  });
});

describe('dead panes', () => {
  it('hands the exit code to the reaper and forgets the session', async () => {
    h.sessions = [{ id: 'd', tmuxId: '$6', agent: 'shell', cwd: '/w' }];
    h.panes = [
      {
        tmuxId: '$6',
        paneId: '%6',
        panePid: 600,
        activity: Math.floor(h.now / 1000),
        dead: true,
        deadStatus: '143'
      }
    ];
    await h.tick();
    expect(h.dead).toEqual([['d', 143, undefined]]);
    expect(h.statuses).toEqual([]);
  });

  it('hands the SIGNAL to the reaper when there is no exit code at all', async () => {
    // The Phase 12.7 case (research 21 §7): `kill -TERM` on a process that
    // does NOT self-map signals leaves pane_dead_status empty, so the reaper
    // used to record a death with no cause and the UI said only "exited".
    h.sessions = [{ id: 'k', tmuxId: '$7', agent: 'shell', cwd: '/w' }];
    h.panes = [
      {
        tmuxId: '$7',
        paneId: '%7',
        panePid: 700,
        activity: Math.floor(h.now / 1000),
        dead: true,
        deadStatus: '',
        deadSignal: 'term'
      }
    ];
    await h.tick();
    expect(h.dead).toEqual([['k', undefined, 'term']]);
  });
});

describe('cost', () => {
  it('runs exactly ONE tmux exec per tick when everything is settled', async () => {
    let execs = 0;
    const settled = new Harness();
    const monitor = new SessionActivityMonitor({
      sessions: () => settled.sessions,
      exec: (async () => {
        execs++;
        return settled.panes
          .map((p) =>
            [
              p.tmuxId,
              p.paneId,
              String(p.panePid),
              '1',
              '0',
              '',
              '',
              String(p.activity),
              '1',
              '0',
              '0',
              '0',
              '25000',
              'zsh',
              p.title ?? ''
            ].join('\t')
          )
          .join('\n');
      }) as never,
      run: async () => {
        execs++; // a capture would count too — there must be none
        return '';
      },
      readProc: async () => {
        execs++; // so would a `ps` snapshot
        return null;
      },
      onStatus: () => undefined,
      onActivity: () => undefined,
      onDead: () => undefined,
      now: () => settled.now
    });
    settled.sessions = Array.from({ length: 16 }, (_, i) => ({
      id: `s${i}`,
      tmuxId: `$${i}`,
      agent: 'shell',
      cwd: '/w'
    }));
    settled.panes = settled.sessions.map((s, i) => ({
      tmuxId: s.tmuxId,
      paneId: `%${i}`,
      panePid: 1000 + i,
      activity: Math.floor(settled.now / 1000) - 600,
      keypad: true
    }));
    for (let i = 0; i < 5; i++) {
      settled.now += 1000;
      await monitor.tick();
    }
    expect(execs).toBe(5);
  });
});

describe('A1/A2/A3 — claude, through its own session registry', () => {
  beforeEach(() => {
    h.sessions = [{ id: 'c1', tmuxId: '$7', agent: 'claude', cwd: '/Users/gdc/gmux' }];
    h.panes = [
      {
        tmuxId: '$7',
        paneId: '%336',
        panePid: 99276,
        activity: Math.floor(h.now / 1000) - 4 * 3600,
        title: '✳ Claude Code'
      }
    ];
  });

  it('reads idle at the prompt even after hours of silence', async () => {
    h.claudeEntry(99276, '%336', 'idle');
    await h.tick();
    expect(h.last('c1')).toBe('idle');
  });

  it('flips to working the tick a turn starts, and back when it ends', async () => {
    h.claudeEntry(99276, '%336', 'idle');
    await h.tick();
    h.claudeEntry(99276, '%336', 'busy');
    await h.tick();
    expect(h.last('c1')).toBe('running');
    h.claudeEntry(99276, '%336', 'idle');
    await h.tick();
    expect(h.last('c1')).toBe('idle');
  });

  it('reads a permission prompt as needs input', async () => {
    h.claudeEntry(99276, '%336', 'waiting');
    await h.tick();
    expect(h.last('c1')).toBe('needs_input');
  });

  it('maps by pane id even though the session was renamed', async () => {
    // The `tmux` field written here says "whatever-the-old-name-was"; the
    // pane id is the only part that survives an F2 rename.
    h.claudeEntry(99276, '%336', 'busy');
    await h.tick();
    expect(h.last('c1')).toBe('running');
  });

  it('ignores an entry for a DIFFERENT pane', async () => {
    h.claudeEntry(12345, '%999', 'busy');
    await h.tick();
    await h.tick();
    await h.tick();
    expect(h.last('c1')).toBe('idle'); // the floor answered, not the stranger
  });

  it('catches the workspace-trust gate before claude registers a pid file', async () => {
    // ~35 s where the oracle is silent. Gating the expensive tiers on the
    // agent's DECLARED tier would leave this session unexamined; gating on
    // "did tier 0 answer this tick" arms the dialog detector instead.
    h.captures.set('%336', fixture('claude-workspace-trust.txt'));
    await h.tick(4);
    await h.tick();
    expect(h.last('c1')).toBe('needs_input');
  });
});
