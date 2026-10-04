/**
 * PHASE 318 — the monitor's three additions (build/p318/SPEC.md §5.3 item 3,
 * §5.4.2 step 3, §5.6.4): `choiceMarkOf` exported unchanged, the
 * `onChoiceMoved` dependency called at the one caller of `choiceUpdate`
 * exactly when it answers news, and `nativeReadingOf`, a read that writes
 * nothing.
 *
 * Over fake tmux output and committed screens, as ./p311-question.test.ts
 * drives the monitor; it starts no process and reads nothing under a home.
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { SessionChoiceInfo } from '@shared/ipc/sessions';
import type { SessionStatus } from '@shared/types';
import {
  choiceMarkOf,
  SessionActivityMonitor,
  type ActivitySession,
  type ChoiceMove,
  type SessionActivityUpdate
} from '../monitor';
import { parsePaneLines, type PaneFacts } from '../panes';
import { hashScreen } from '../screen';

const fixture = (name: string): string => readFileSync(join(__dirname, 'fixtures', name), 'utf8');

function paneFields(tmuxId: string, paneId: string, now: number, title: string): string {
  return [tmuxId, paneId, '100', '1', '0', '', '', String(Math.floor(now / 1000) - 60), '0', '0', '0', '0', '25000', 'node', title].join(
    '\t'
  );
}

class Harness {
  now = 1_800_000_000_000;
  capture = fixture('claude-permission-prompt.txt');
  codexTitle = 'proj';
  readonly moves: Array<[string, ChoiceMove]> = [];
  readonly statuses: Array<[string, SessionStatus]> = [];
  readonly updates: SessionActivityUpdate[] = [];
  readonly claudeDir = mkdtempSync(join(tmpdir(), 'gmux-p318-'));
  readonly sessions: ActivitySession[] = [
    { id: 's1', tmuxId: '$1', agent: 'claude', cwd: '/Users/example/work' },
    { id: 'c1', tmuxId: '$2', agent: 'codex', cwd: '/Users/example/proj' }
  ];
  readonly monitor: SessionActivityMonitor;

  constructor(withMoves = true) {
    this.monitor = new SessionActivityMonitor({
      sessions: () => this.sessions,
      exec: (async (args: readonly string[]) => {
        if (args[0] !== 'list-panes') throw new Error(`unexpected ${String(args[0])}`);
        return [paneFields('$1', '%1', this.now, ''), paneFields('$2', '%2', this.now, this.codexTitle)].join('\n');
      }) as never,
      run: async () => this.capture,
      readProc: async () => null,
      readWitness: async () => ({ found: false, stat: '', ppid: null }),
      readCommand: async () => null,
      readChildren: async () => [],
      claudeSessionsDir: this.claudeDir,
      onStatus: (id, status) => this.statuses.push([id, status]),
      onActivity: (updates) => this.updates.push(...updates),
      onDead: () => undefined,
      ...(withMoves ? { onChoiceMoved: (id: string, kind: ChoiceMove) => this.moves.push([id, kind]) } : {}),
      now: () => this.now
    });
  }

  async tick(): Promise<void> {
    this.now += 1000;
    await this.monitor.tick();
  }

  choices(id: string): SessionChoiceInfo[] {
    return this.updates.filter((u) => u.sessionId === id && u.choice !== undefined).map((u) => u.choice as SessionChoiceInfo);
  }

  cleanup(): void {
    rmSync(this.claudeDir, { recursive: true, force: true });
  }
}

describe('onChoiceMoved', () => {
  let h: Harness;
  beforeEach(() => {
    h = new Harness();
  });
  afterEach(() => {
    h.cleanup();
  });

  it('appeared, moved and gone, exactly when choiceUpdate answers news, one call per choice on the wire', async () => {
    await h.tick();
    await h.tick();
    // Blocked on the committed dialog: the choice went on the wire once.
    expect(h.choices('s1')).toHaveLength(1);
    expect(h.moves.filter(([id]) => id === 's1')).toEqual([['s1', 'appeared']]);
    // Unchanged screen: no news, no call.
    await h.tick();
    expect(h.moves.filter(([id]) => id === 's1')).toHaveLength(1);
    // A different real choice on the same blocked session: moved.
    h.capture = fixture('codex-signin-choice.txt');
    await h.tick();
    expect(h.moves.filter(([id]) => id === 's1').at(-1)).toEqual(['s1', 'moved']);
    // The screen holds no choice while the session still reads blocked: gone.
    h.capture = fixture('claude-idle.txt');
    await h.tick();
    expect(h.moves.filter(([id]) => id === 's1').at(-1)).toEqual(['s1', 'gone']);
    // Every choice update carried one call, with its kind.
    const kinds = h.choices('s1').map((c) => (c.atChoice ? 'choice' : 'none'));
    const moves = h.moves.filter(([id]) => id === 's1').map(([, k]) => k);
    expect(moves).toHaveLength(kinds.length);
    expect(moves).toEqual(['appeared', 'moved', 'gone']);
  });

  it('is never called for a session that never had a choice', async () => {
    h.capture = fixture('claude-idle.txt');
    for (let i = 0; i < 4; i += 1) await h.tick();
    expect(h.moves).toEqual([]);
  });

  it('is optional: a monitor with no listener ticks exactly as one with it', async () => {
    const plain = new Harness(false);
    try {
      for (const capture of ['claude-permission-prompt.txt', 'claude-permission-prompt.txt', 'codex-signin-choice.txt']) {
        h.capture = fixture(capture);
        plain.capture = fixture(capture);
        await h.tick();
        await plain.tick();
      }
      expect(plain.updates).toEqual(h.updates);
      expect(plain.statuses).toEqual(h.statuses);
    } finally {
      plain.cleanup();
    }
  });
});

describe('choiceMarkOf, exported', () => {
  it('is the hash of the question and the options, and the no-choice mark otherwise', () => {
    const options = [
      { marker: '1', text: 'Yes' },
      { marker: '2', text: 'No' }
    ];
    expect(choiceMarkOf({ atChoice: true, options }, 'Do you want to proceed?')).toBe(
      hashScreen(JSON.stringify(['Do you want to proceed?', options]))
    );
    expect(choiceMarkOf({ atChoice: false }, 'anything')).toBe('-');
  });
});

describe('nativeReadingOf', () => {
  let h: Harness;
  beforeEach(() => {
    h = new Harness();
  });
  afterEach(() => {
    h.cleanup();
  });

  const paneOf = (line: string, tmuxId: string): PaneFacts => {
    const pane = parsePaneLines(line).get(tmuxId);
    if (pane === undefined) throw new Error('no pane');
    return pane;
  };

  it('answers the tier-0 verdict the tick would take, over the facts it is handed', async () => {
    h.capture = fixture('codex-idle.txt');
    await h.tick();
    const idle = paneOf(paneFields('$2', '%2', h.now, 'proj'), '$2');
    expect(h.monitor.nativeReadingOf('c1', 'codex', '/Users/example/proj', idle, null)).toEqual({ state: 'idle', tier: 'native' });
    const working = paneOf(paneFields('$2', '%2', h.now, `${String.fromCodePoint(0x2819)} proj`), '$2');
    expect(h.monitor.nativeReadingOf('c1', 'codex', '/Users/example/proj', working, null)?.state).toBe('working');
    const asking = paneOf(paneFields('$2', '%2', h.now, '[ ! ] Action Required | proj'), '$2');
    expect(h.monitor.nativeReadingOf('c1', 'codex', '/Users/example/proj', asking, null)?.state).toBe('needs_input');
  });

  it('answers null for a session it does not track, and for an agent whose reader has nothing to say', async () => {
    const pane = paneOf(paneFields('$9', '%9', h.now, 'proj'), '$9');
    expect(h.monitor.nativeReadingOf('nobody', 'codex', '/Users/example/proj', pane, null)).toBeNull();
    await h.tick();
    // Claude with no registry entry for the pane: nothing to say.
    const claudePane = paneOf(paneFields('$1', '%1', h.now, ''), '$1');
    expect(h.monitor.nativeReadingOf('s1', 'claude', '/Users/example/work', claudePane, null)).toBeNull();
  });

  it('writes nothing: no status, no update, and the next tick reads as if it was never asked', async () => {
    h.capture = fixture('codex-idle.txt');
    await h.tick();
    const statuses = [...h.statuses];
    const updates = [...h.updates];
    const asking = paneOf(paneFields('$2', '%2', h.now, '[ ! ] Action Required | proj'), '$2');
    for (let i = 0; i < 5; i += 1) h.monitor.nativeReadingOf('c1', 'codex', '/Users/example/proj', asking, null);
    expect(h.statuses).toEqual(statuses);
    expect(h.updates).toEqual(updates);
    await h.tick();
    expect(h.statuses.filter(([id, s]) => id === 'c1' && s === 'needs_input')).toEqual([]);
  });
});
