/**
 * A fake core, a recording tmux runner and a fake process table for the
 * reader's and the writer's tests (Phase 318, build/p318/SPEC.md §7.2). No tmux
 * server, no process and no agent: every answer is a committed screen.
 */

import { expect, vi, type Mock } from 'vitest';
import type { SessionChoiceOption } from '@shared/ipc/sessions';
import type { Session } from '@shared/types';
import { PANE_FORMAT } from '../../activity/panes';
import { parseProcTable, type ProcSnapshot } from '../../activity/process';
import type { ActivityVerdict } from '../../activity/types';
import { createQuestionIds, type QuestionIds } from '../question-id';
import type { ReplyCore } from '../writer';

export const SID = 's-p318';
export const TMUX_ID = '$7';
export const PANE_ID = '%12';
export const PANE_PID = 4242;
export const PREFIX = 'abcdefabcdef0123';

/** One `list-panes -F PANE_FORMAT` line for the session's pane. */
export function paneLine(over: { tmuxId?: string; paneId?: string; dead?: boolean; title?: string } = {}): string {
  const fields = [
    over.tmuxId ?? TMUX_ID,
    over.paneId ?? PANE_ID,
    String(PANE_PID),
    '1',
    over.dead === true ? '1' : '0',
    '',
    '',
    '1700000000',
    '0',
    '0',
    '0',
    '120',
    '50000',
    'node',
    over.title ?? 'proj'
  ];
  expect(fields.length).toBe(PANE_FORMAT.split('\t').length);
  return `${fields.join('\t')}\n`;
}

/** A table where the pane's own program holds the terminal. */
export const AGENT_HOLDS: ProcSnapshot = parseProcTable(`${String(PANE_PID)} 1 0:01.00 S+\n`, 1);

/** A table where a child of the pane's shell holds the terminal. */
export const CHILD_HOLDS: ProcSnapshot = parseProcTable(
  `${String(PANE_PID)} 1 0:00.10 Ss\n5000 ${String(PANE_PID)} 0:00.01 S+\n`,
  1
);

export function session(over: Partial<Session> = {}): Session {
  return {
    id: SID,
    name: 'p318',
    tmuxName: 'proj--p318',
    projectPath: '/work/proj',
    cwd: '/work/proj',
    agent: 'claude',
    status: 'needs_input',
    createdAt: 1,
    ...over
  } as Session;
}

/** Every read and act, in order, as one log a test can read the sequence from. */
export type Event =
  | { kind: 'run'; args: readonly string[]; stdin?: string }
  | { kind: 'control'; line: string }
  | { kind: 'proc' }
  | { kind: 'command'; pid: number }
  | { kind: 'native' }
  | { kind: 'sleep'; ms: number }
  | { kind: 'lastCheck' };

export interface World {
  events: Event[];
  turns: QuestionIds;
  core: ReplyCore & { sessions: Session[]; connected: boolean };
  /** What the next capture returns, plain (`-p`) and styled (`-p -e`). */
  screen: { plain: string; styled: string };
  /** What a plain capture returns once a press has acted (the read-back); null is `screen.plain`. */
  after: string | null;
  /** A press acted since the last reading began. */
  acted: boolean;
  proc: ProcSnapshot | null;
  command: string | null;
  native: ActivityVerdict | null;
  cursor: string;
  tmuxIds: Map<string, string>;
  records: Map<string, { status: Session['status'] }>;
  noteUserInput: Mock<(id: string) => void>;
  /** Called before a run answers, to move the world under the reader. */
  onRun: ((args: readonly string[]) => void) | null;
  /** A run that should reject, by its verb. */
  failVerb: Set<string>;
  /** A control line that should reject, by its first word. */
  failControl: Set<string>;
}

export function world(over: Partial<Pick<World, 'proc' | 'command' | 'native' | 'cursor'>> & { session?: Session } = {}): World {
  const w = {} as World;
  w.events = [];
  w.turns = createQuestionIds(PREFIX);
  w.screen = { plain: '', styled: '' };
  w.after = null;
  w.acted = false;
  w.proc = over.proc === undefined ? AGENT_HOLDS : over.proc;
  w.command = over.command === undefined ? 'claude --permission-mode default' : over.command;
  w.native = over.native === undefined ? { state: 'idle', tier: 'native' } : over.native;
  w.cursor = over.cursor ?? '2\t9\n';
  w.tmuxIds = new Map([[SID, TMUX_ID]]);
  w.records = new Map([[SID, { status: 'needs_input' }]]);
  w.noteUserInput = vi.fn<(id: string) => void>();
  w.onRun = null;
  w.failVerb = new Set();
  w.failControl = new Set();
  w.core = {
    sessions: [over.session ?? session()],
    connected: true,
    listSessions() {
      return this.sessions;
    },
    tmuxIdOf: (id: string) => w.tmuxIds.get(id) ?? null,
    manifest: { getSession: (id: string) => w.records.get(id) },
    control: {
      get connected(): boolean {
        return w.core.connected;
      },
      sendCommand: (line: string): Promise<string[]> => {
        w.events.push({ kind: 'control', line });
        w.acted = true;
        const word = line.split(' ')[0] ?? '';
        return w.failControl.has(word) ? Promise.reject(new Error(`CANARY control ${line}`)) : Promise.resolve([]);
      }
    },
    activity: {
      noteUserInput: (id: string) => {
        w.noteUserInput(id);
      },
      nativeReadingOf: () => {
        w.events.push({ kind: 'native' });
        return w.native;
      }
    }
  };
  return w;
}

/** The deps a writer or reader is built with, over a world. */
export function depsOf(w: World): {
  core: () => ReplyCore;
  turns: QuestionIds;
  run: (args: readonly string[], options?: { stdin?: Buffer; timeoutMs?: number }) => Promise<string>;
  readProc: () => Promise<ProcSnapshot | null>;
  readCommand: (pid: number) => Promise<string | null>;
  sleep: (ms: number) => Promise<void>;
  onLastCheck: (id: string) => void;
} {
  return {
    core: () => w.core,
    turns: w.turns,
    run: (args, options) => {
      w.events.push({
        kind: 'run',
        args: [...args],
        ...(options?.stdin !== undefined ? { stdin: options.stdin.toString('utf8') } : {})
      });
      w.onRun?.(args);
      const verb = args[0] ?? '';
      if (verb === 'list-panes') w.acted = false;
      if (verb === 'copy-mode') w.acted = true;
      if (w.failVerb.has(verb)) return Promise.reject(new Error(`CANARY ${args.join(' ')}`));
      if (verb === 'list-panes') return Promise.resolve(paneLine());
      if (verb === 'display-message') return Promise.resolve(w.cursor);
      if (verb === 'capture-pane') {
        if (args.includes('-e')) return Promise.resolve(w.screen.styled);
        return Promise.resolve(w.acted && w.after !== null ? w.after : w.screen.plain);
      }
      return Promise.resolve('');
    },
    readProc: () => {
      w.events.push({ kind: 'proc' });
      return Promise.resolve(w.proc);
    },
    readCommand: (pid) => {
      w.events.push({ kind: 'command', pid });
      return Promise.resolve(w.command);
    },
    sleep: (ms) => {
      w.events.push({ kind: 'sleep', ms });
      return Promise.resolve();
    },
    onLastCheck: () => {
      w.events.push({ kind: 'lastCheck' });
    }
  };
}

/** The runs a world saw, as argv. */
export function runs(w: World): (readonly string[])[] {
  return w.events.flatMap((e) => (e.kind === 'run' ? [e.args] : []));
}

/** The options a screen's rows carry, for a `drawn` the door would hand in. */
export type Drawn = { question: string | null; choices: readonly SessionChoiceOption[] };
