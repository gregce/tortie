/**
 * Phase 337, the keys verb (build/p337/SPEC.md §5.4, D17 to D23, D42; §7.2),
 * driven against the SHIPPING src/main/screen/keys.ts over a fake core, a
 * recording control client and a fake watch.
 *
 * The phone's picture of a screen is made the way the door makes it: the
 * SHIPPING composer over the same reading (`composeScreen(…).screen.turn` and
 * `.dialog`), so every case below that is answered `done` also proves the
 * verb's own reading of a screen agrees with what a picture of that screen
 * carried to the phone. The screens are COMMITTED real captures
 * (build/fixtures/reply/: Codex 0.160.0's approval, Claude Code 2.1.287's Bash
 * question, both at their prompts).
 *
 *  - the exact lines for every item kind, `copy-mode -q` first, a text only as
 *    `-H` hex, every line written in ONE statement after the id moved;
 *  - each final-check refusal writes nothing, moves no id, nudges nothing;
 *  - the one refusal both ways: a changed `turn`, a changed `dialog`, with and
 *    without a question drawn, and the row waiting on him with none drawn;
 *  - `noteUserInput` once on a path that wrote, never on one that did not;
 *  - a rejected `send-keys` line is `failed`; `still()` false is `stopped`;
 *  - another machine: `typeRemote` is the act, `unreachable` writes nothing;
 *  - THE GAP (D42): two writes handed 0 ms apart, the second's first line 50 ms
 *    or more after the first's, the wait before the fresh read;
 *  - `nudge` handed the fresh read's window mark.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { POCKET_WRITE_SENTENCES, type PocketKeyItem } from '@shared/ipc/pocket';
import { LIFECYCLE_SESSION_CHANGED, SESSION_NOT_FOUND } from '@shared/lifecycle-words';
import { REPLY_FAILED, REPLY_TEXT_EMPTY, REPLY_TEXT_LONG } from '@shared/reply-copy';
import { SCREEN_KEY_CHARACTER, SCREEN_NOT_TYPABLE, SCREEN_QUESTION_MOVED } from '@shared/screen-copy';
import type { Session, SessionStatus } from '@shared/types';
import type { PocketKeysInput, PocketReplyOutcome } from '../../pocket/routes';
import { createQuestionIds, type QuestionIds } from '../../reply/question-id';
import { composeScreen, windowMarkOf } from '../compose';
import { SCREEN_KEYS_GAP_MS, createScreenKeys, type ScreenKeysDeps } from '../keys';
import type { ScreenReading } from '../read';

const REPO = join(__dirname, '../../../..');
const fixture = (name: string): string => readFileSync(join(REPO, 'build/fixtures/reply', name), 'utf8');

/** Codex 0.160.0's approval and Claude Code 2.1.287's Bash question: numbered questions drawn. */
const CODEX_QUESTION = fixture('codex-approval-0.160.0.txt');
const CLAUDE_QUESTION = fixture('claude-bash-2.1.287.txt');
/** Each agent at its own empty prompt, styled: no question drawn. */
const CODEX_PROMPT = fixture('codex-prompt-empty-0.160.0.ansi');
const CLAUDE_PROMPT = fixture('claude-prompt-after-decline-2.1.287.ansi');

const PANE = '%5';
const ID = 's1';

/** One reading of a screen, as `readFresh` answers it: 120x40 on pane %5. */
function readingOf(styled: string, pane = PANE): ScreenReading {
  const display = {
    paneId: pane,
    cols: 120,
    rows: 40,
    cursorX: 0,
    cursorY: 0,
    cursorVisible: true,
    alternate: false
  };
  return { styled, display, displayLine: `${pane}\t120\t40\t0\t0\t1\t0` };
}

function rowOf(status: SessionStatus, machine?: string): Session {
  return {
    id: ID,
    status,
    agent: 'codex',
    ...(machine === undefined ? {} : { machine: { id: machine } })
  } as unknown as Session;
}

interface Rig {
  deps: ScreenKeysDeps;
  turns: QuestionIds;
  lines: string[];
  /** Every event, in order: reads, sleeps, lines, nudges, the funnel, the last check. */
  events: string[];
  nudges: { id: string; before: string }[];
  inputs: string[];
  spawned: (readonly string[])[];
  remote: (readonly PocketKeyItem[])[];
  set: {
    screen(text: string): void;
    row(row: Session | undefined): void;
    tmuxId(id: string | null): void;
    connected(on: boolean): void;
    reject(match: (line: string) => boolean): void;
    remote(answer: 'carriage' | 'unreachable'): void;
    /** Called inside the fresh read, after its await: a change the read sees. */
    duringRead(fn: () => void): void;
  };
  clock: { at: number };
}

function rig(): Rig {
  const turns = createQuestionIds('0123456789abcdef');
  const lines: string[] = [];
  const events: string[] = [];
  const nudges: { id: string; before: string }[] = [];
  const inputs: string[] = [];
  const spawned: (readonly string[])[] = [];
  const remote: (readonly PocketKeyItem[])[] = [];
  const clock = { at: 1_000 };
  let screen = CODEX_PROMPT;
  let row: Session | undefined = rowOf('idle');
  let tmuxId: string | null = '$3';
  let connected = true;
  let reject: (line: string) => boolean = () => false;
  let remoteAnswer: 'carriage' | 'unreachable' = 'carriage';
  let duringRead: (() => void) | null = null;
  const core = {
    listSessions: (): Session[] => (row === undefined ? [] : [row]),
    tmuxIdOf: (): string | null => tmuxId,
    manifest: { getSession: (id: string) => (id === ID ? { status: 'idle' } : undefined) },
    control: {
      get connected(): boolean {
        return connected;
      },
      sendCommand: (command: string): Promise<string[]> => {
        lines.push(command);
        events.push(`line@${String(clock.at)}`);
        return reject(command) ? Promise.reject(new Error('no such pane')) : Promise.resolve([]);
      }
    },
    activity: { noteUserInput: (): void => undefined }
  };
  const deps: ScreenKeysDeps = {
    core: () => core as never,
    turns,
    watch: {
      readFresh: async () => {
        events.push(`read@${String(clock.at)}`);
        await Promise.resolve();
        duringRead?.();
        duringRead = null;
        return readingOf(screen);
      },
      nudge: (id, before) => {
        events.push('nudge');
        nudges.push({ id, before });
      }
    },
    noteUserInput: (id) => {
      events.push('funnel');
      inputs.push(id);
    },
    typeRemote: (_id, keys) => {
      events.push('remote');
      remote.push(keys);
      return remoteAnswer;
    },
    run: (args) => {
      events.push('spawn');
      spawned.push([...args]);
      return Promise.resolve('');
    },
    onLastCheck: () => events.push('last-check'),
    now: () => clock.at,
    sleep: (ms) => {
      events.push(`sleep ${String(ms)}`);
      clock.at += ms;
      return Promise.resolve();
    }
  };
  return {
    deps,
    turns,
    lines,
    events,
    nudges,
    inputs,
    spawned,
    remote,
    clock,
    set: {
      screen: (text) => {
        screen = text;
      },
      row: (next) => {
        row = next;
      },
      tmuxId: (next) => {
        tmuxId = next;
      },
      connected: (on) => {
        connected = on;
      },
      reject: (match) => {
        reject = match;
      },
      remote: (answer) => {
        remoteAnswer = answer;
      },
      duringRead: (fn) => {
        duringRead = fn;
      }
    }
  };
}

/** The picture of the screen the phone holds, made by the shipping composer. */
function pictureOf(r: Rig, styled: string, status: SessionStatus): { turn: string; dialog: string | null } {
  const turn = r.turns.current(ID).id;
  const composed = composeScreen(readingOf(styled), { turn, status, typable: true });
  if (composed === 'large') throw new Error('a committed capture composed as large');
  return { turn, dialog: composed.screen.dialog };
}

function input(keys: PocketKeyItem[], picture: { turn: string; dialog: string | null }): PocketKeysInput {
  return { sessionId: ID, keys, turn: picture.turn, dialog: picture.dialog };
}

const ALLOWED = (): boolean => true;
const DONE: PocketReplyOutcome = { outcome: 'done' };

let r: Rig;

beforeEach(() => {
  r = rig();
});

describe('the act on this Mac (D18, D19)', () => {
  it('writes copy-mode -q first, then text as -H hex and a name by name, every line in ONE statement after the id moved', async () => {
    const verb = createScreenKeys(r.deps);
    const n0 = r.turns.current(ID).n;
    const picture = pictureOf(r, CODEX_PROMPT, 'idle');
    const outcome = await verb.keys(input([{ t: 'é😀' }, { k: 'BSpace' }, { t: 'ab' }], picture), ALLOWED);
    expect(outcome).toEqual(DONE);
    expect(r.lines).toEqual([
      'copy-mode -q -t %5',
      'send-keys -t %5 -H c3 a9 f0 9f 98 80',
      'send-keys -t %5 BSpace',
      'send-keys -t %5 -H 61 62'
    ]);
    // The id moved once, for the phone, and the last check came between it and the first line.
    expect(r.turns.current(ID).n).toBe(n0 + 1);
    const lastCheck = r.events.indexOf('last-check');
    expect(lastCheck).toBeGreaterThan(r.events.findIndex((e) => e.startsWith('read@')));
    expect(r.events.slice(lastCheck + 1, lastCheck + 5).every((e) => e.startsWith('line@'))).toBe(true);
  });

  it('writes every line before any answer comes back: one statement, nothing awaited between them', async () => {
    const pending: ((lines: string[]) => void)[] = [];
    const verb = createScreenKeys({
      ...r.deps,
      core: () =>
        ({
          ...(r.deps.core() as object),
          listSessions: () => [rowOf('idle')],
          tmuxIdOf: () => '$3',
          manifest: { getSession: () => undefined },
          control: {
            connected: true,
            sendCommand: (command: string) =>
              new Promise<string[]>((resolve) => {
                r.lines.push(command);
                pending.push(resolve);
              })
          }
        }) as never
    });
    const answer = verb.keys(input([{ t: 'x' }, { t: 'y'.repeat(300) }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED);
    for (let i = 0; i < 10 && r.lines.length === 0; i += 1) await Promise.resolve();
    // All four lines are written while not one of them has been answered.
    expect(r.lines).toHaveLength(4);
    expect(pending).toHaveLength(4);
    for (const resolve of pending) resolve([]);
    expect(await answer).toEqual(DONE);
  });

  it('sends a text only as its hex bytes, so no line carries the text, and splits it at 256 bytes a line', async () => {
    const verb = createScreenKeys(r.deps);
    const text = `echo $HOME; '${'z'.repeat(600)}'`;
    expect(await verb.keys(input([{ t: text }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual(DONE);
    for (const sent of r.lines) {
      expect(sent.includes('$HOME')).toBe(false);
      expect(sent.includes(' -l')).toBe(false);
    }
    const hex = r.lines.slice(1).map((sent) => sent.split(' ').slice(4));
    expect(hex.map((bytes) => bytes.length)).toEqual([256, 256, Buffer.byteLength(text) - 512]);
    expect(Buffer.from(hex.flat().join(''), 'hex').toString('utf8')).toBe(text);
    for (const bytes of hex.flat()) expect(bytes).toMatch(/^[0-9a-f]{2}$/);
  });

  it('writes Ctrl-C, Escape, Up and Enter each by tmux\'s own name, alone in its write', async () => {
    for (const name of ['C-c', 'Escape', 'Up', 'Enter', 'BTab'] as const) {
      r = rig();
      const verb = createScreenKeys(r.deps);
      expect(await verb.keys(input([{ k: name }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual(DONE);
      expect(r.lines).toEqual(['copy-mode -q -t %5', `send-keys -t %5 ${name}`]);
    }
  });

  it('is ONE spawned list when the control client is down, with nothing but hex and names in it', async () => {
    r.set.connected(false);
    const verb = createScreenKeys(r.deps);
    expect(await verb.keys(input([{ t: 'a;b' }, { k: 'BSpace' }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual(DONE);
    expect(r.lines).toEqual([]);
    expect(r.spawned).toEqual([
      ['copy-mode', '-q', '-t', '%5', ';', 'send-keys', '-t', '%5', '-H', '61', '3b', '62', ';', 'send-keys', '-t', '%5', 'BSpace']
    ]);
  });

  it('calls noteUserInput once on a path that typed, and nudges with the fresh read\'s window mark', async () => {
    const verb = createScreenKeys(r.deps);
    expect(await verb.keys(input([{ t: 'a' }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual(DONE);
    expect(r.inputs).toEqual([ID]);
    const composed = composeScreen(readingOf(CODEX_PROMPT), { turn: '', status: 'idle', typable: true });
    if (composed === 'large') throw new Error('large');
    // The mark the answer itself carries, and the same spelling over the composed rows' own text.
    const text = composed.screen.lines.map((runs) => runs.map((run) => run.text).join('')).join('\n');
    expect(windowMarkOf(text)).toBe(composed.mark);
    expect(r.nudges).toEqual([{ id: ID, before: composed.mark }]);
    // The funnel after the act, the nudge after the funnel.
    expect(r.events.indexOf('funnel')).toBeGreaterThan(r.events.lastIndexOf('line@1000'));
    expect(r.events.indexOf('nudge')).toBeGreaterThan(r.events.indexOf('funnel'));
  });

  it('answers failed when a send-keys line is rejected, and calls the funnel only when some key was typed', async () => {
    r.set.reject((sent) => sent.startsWith('send-keys'));
    const verb = createScreenKeys(r.deps);
    expect(await verb.keys(input([{ t: 'a' }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual({
      outcome: 'failed',
      sentence: REPLY_FAILED
    });
    expect(r.inputs).toEqual([]);
    r = rig();
    r.set.reject((sent) => sent.endsWith(' BSpace'));
    const second = createScreenKeys(r.deps);
    expect(await second.keys(input([{ t: 'a' }, { k: 'BSpace' }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual({
      outcome: 'failed',
      sentence: REPLY_FAILED
    });
    expect(r.inputs).toEqual([ID]);
  });

  it('answers failed for a spawned list that failed, and calls no funnel', async () => {
    r.set.connected(false);
    const verb = createScreenKeys({ ...r.deps, run: () => Promise.reject(new Error('no server')) });
    expect(await verb.keys(input([{ t: 'a' }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual({
      outcome: 'failed',
      sentence: REPLY_FAILED
    });
    expect(r.inputs).toEqual([]);
  });
});

describe('the text rule and the write\'s shape: refused before anything is read (step 1)', () => {
  const cases: [string, PocketKeyItem[], PocketReplyOutcome][] = [
    ['a line feed', [{ t: 'a\nb' }], { outcome: 'refused', reason: 'character', sentence: SCREEN_KEY_CHARACTER }],
    ['an ESC', [{ t: `a${String.fromCharCode(0x1b)}[A` }], { outcome: 'refused', reason: 'character', sentence: SCREEN_KEY_CHARACTER }],
    ['a carriage return', [{ t: `a${String.fromCharCode(0x0d)}` }], { outcome: 'refused', reason: 'character', sentence: SCREEN_KEY_CHARACTER }],
    ['DEL', [{ t: String.fromCharCode(0x7f) }], { outcome: 'refused', reason: 'character', sentence: SCREEN_KEY_CHARACTER }],
    ['a C1 control', [{ t: String.fromCharCode(0x9b) }], { outcome: 'refused', reason: 'character', sentence: SCREEN_KEY_CHARACTER }],
    ['a lone surrogate', [{ t: String.fromCharCode(0xd800) }], { outcome: 'refused', reason: 'character', sentence: SCREEN_KEY_CHARACTER }],
    ['an empty text', [{ t: '' }], { outcome: 'refused', reason: 'empty', sentence: REPLY_TEXT_EMPTY }],
    ['1,025 bytes', [{ t: 'x'.repeat(1_025) }], { outcome: 'refused', reason: 'long', sentence: REPLY_TEXT_LONG }],
    ['1,025 bytes across items', [{ t: 'x'.repeat(1_000) }, { t: 'y'.repeat(25) }], { outcome: 'refused', reason: 'long', sentence: REPLY_TEXT_LONG }],
    ['a name not on the list', [{ k: 'M-x' } as unknown as PocketKeyItem], { outcome: 'refused', reason: 'character', sentence: SCREEN_KEY_CHARACTER }],
    ['Escape then text', [{ k: 'Escape' }, { t: 'b' }], { outcome: 'refused', reason: 'character', sentence: SCREEN_KEY_CHARACTER }],
    ['text then Enter', [{ t: 'a' }, { k: 'Enter' }], { outcome: 'refused', reason: 'character', sentence: SCREEN_KEY_CHARACTER }],
    ['two named keys', [{ k: 'Up' }, { k: 'Up' }], { outcome: 'refused', reason: 'character', sentence: SCREEN_KEY_CHARACTER }],
    ['no items', [], { outcome: 'refused', reason: 'character', sentence: SCREEN_KEY_CHARACTER }],
    ['65 items', Array.from({ length: 65 }, () => ({ t: 'a' })), { outcome: 'refused', reason: 'character', sentence: SCREEN_KEY_CHARACTER }]
  ];
  for (const [label, keys, want] of cases) {
    it(`refuses ${label}, reading nothing and typing nothing`, async () => {
      const verb = createScreenKeys(r.deps);
      expect(await verb.keys(input(keys, { turn: r.turns.current(ID).id, dialog: null }), ALLOWED)).toEqual(want);
      expect(r.events).toEqual([]);
      expect(r.lines).toEqual([]);
    });
  }

  it('takes exactly 1,024 bytes, BSpace with text, and 64 items', async () => {
    const verb = createScreenKeys(r.deps);
    const picture = pictureOf(r, CODEX_PROMPT, 'idle');
    expect(await verb.keys(input([{ t: 'x'.repeat(1_024) }], picture), ALLOWED)).toEqual(DONE);
    r.clock.at += 1_000;
    expect(await verb.keys(input([{ k: 'BSpace' }, { k: 'BSpace' }, { t: '日本' }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual(DONE);
    r.clock.at += 1_000;
    expect(await verb.keys(input(Array.from({ length: 64 }, () => ({ t: 'a' })), pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual(DONE);
  });
});

describe('the gate and the final check: each refusal writes nothing, moves no id, nudges nothing', () => {
  async function refusedWithNothingWritten(want: PocketReplyOutcome, still = ALLOWED): Promise<void> {
    const verb = createScreenKeys(r.deps);
    const picture = pictureOf(r, CODEX_PROMPT, 'idle');
    const n0 = r.turns.current(ID).n;
    expect(await verb.keys(input([{ t: 'a' }], picture), still)).toEqual(want);
    expect(r.lines).toEqual([]);
    expect(r.spawned).toEqual([]);
    expect(r.remote).toEqual([]);
    expect(r.nudges).toEqual([]);
    expect(r.inputs).toEqual([]);
    expect(r.turns.current(ID).n).toBe(n0);
  }

  it('a session nobody has is gone, read nothing', async () => {
    r.set.row(undefined);
    const verb = createScreenKeys(r.deps);
    expect(await verb.keys({ sessionId: 'nobody', keys: [{ t: 'a' }], turn: 'x-0', dialog: null }, ALLOWED)).toEqual({
      outcome: 'refused',
      reason: 'gone',
      sentence: SESSION_NOT_FOUND
    });
    expect(r.events).toEqual([]);
  });

  for (const status of ['unknown', 'exited', 'restorable', 'discarded'] as const) {
    it(`a ${status} row takes no key, read nothing`, async () => {
      r.set.row(rowOf(status));
      await refusedWithNothingWritten({ outcome: 'refused', reason: 'unreachable', sentence: SCREEN_NOT_TYPABLE });
      expect(r.events).toEqual([]);
    });
  }

  it('a local row with no $-id takes no key', async () => {
    r.set.tmuxId(null);
    await refusedWithNothingWritten({ outcome: 'refused', reason: 'unreachable', sentence: SCREEN_NOT_TYPABLE });
  });

  it('still() false is stopped', async () => {
    await refusedWithNothingWritten({ outcome: 'refused', reason: 'stopped', sentence: POCKET_WRITE_SENTENCES.stopped }, () => false);
  });

  it('a row that went while the screen was read is gone, in the owner\'s words', async () => {
    r.set.duringRead(() => r.set.row(undefined));
    await refusedWithNothingWritten({ outcome: 'refused', reason: 'gone', sentence: LIFECYCLE_SESSION_CHANGED });
  });

  it('a row that ended while the screen was read takes no key', async () => {
    r.set.duringRead(() => r.set.row(rowOf('exited')));
    await refusedWithNothingWritten({ outcome: 'refused', reason: 'unreachable', sentence: SCREEN_NOT_TYPABLE });
  });

  it('a $-id that moved while the screen was read is changed', async () => {
    r.set.duringRead(() => r.set.tmuxId('$9'));
    await refusedWithNothingWritten({ outcome: 'refused', reason: 'changed', sentence: LIFECYCLE_SESSION_CHANGED });
  });

  it('a row that moved to another machine while the screen was read is changed', async () => {
    r.set.duringRead(() => r.set.row(rowOf('idle', 'far')));
    await refusedWithNothingWritten({ outcome: 'refused', reason: 'changed', sentence: LIFECYCLE_SESSION_CHANGED });
  });

  it('a pane the reading does not name as a %-pane takes no key', async () => {
    const verb = createScreenKeys({
      ...r.deps,
      watch: { ...r.deps.watch, readFresh: () => Promise.resolve(readingOf(CODEX_PROMPT, '$3 ; kill-server')) }
    });
    expect(await verb.keys(input([{ t: 'a' }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual({
      outcome: 'refused',
      reason: 'unreachable',
      sentence: SCREEN_NOT_TYPABLE
    });
    expect(r.lines).toEqual([]);
  });

  it('a screen wider or taller than the phone is shown takes no key: it was never drawn there', async () => {
    for (const [cols, rows] of [[513, 40], [120, 201]] as const) {
      r = rig();
      const big = readingOf(CODEX_PROMPT);
      const verb = createScreenKeys({
        ...r.deps,
        watch: { ...r.deps.watch, readFresh: () => Promise.resolve({ ...big, display: { ...big.display, cols, rows } }) }
      });
      expect(await verb.keys(input([{ t: 'a' }], { turn: r.turns.current(ID).id, dialog: null }), ALLOWED)).toEqual({
        outcome: 'refused',
        reason: 'unreachable',
        sentence: SCREEN_NOT_TYPABLE
      });
      expect(r.lines).toEqual([]);
    }
  });

  it('a read that answers nothing takes no key', async () => {
    const verb = createScreenKeys({ ...r.deps, watch: { ...r.deps.watch, readFresh: () => Promise.resolve(null) } });
    expect(await verb.keys(input([{ t: 'a' }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual({
      outcome: 'refused',
      reason: 'unreachable',
      sentence: SCREEN_NOT_TYPABLE
    });
    expect(r.lines).toEqual([]);
  });
});

describe('THE ONE REFUSAL (D21, D22): keys meant for a question reach that question or nothing', () => {
  const MOVED: PocketReplyOutcome = { outcome: 'refused', reason: 'changed', sentence: SCREEN_QUESTION_MOVED };

  it('the composer draws both committed questions as asking, with a mark, and both prompts as not', () => {
    expect(pictureOf(r, CODEX_QUESTION, 'running').dialog).toMatch(/^[0-9a-f]{12}$/);
    expect(pictureOf(r, CLAUDE_QUESTION, 'running').dialog).toMatch(/^[0-9a-f]{12}$/);
    expect(pictureOf(r, CODEX_PROMPT, 'idle').dialog).toBeNull();
    expect(pictureOf(r, CLAUDE_PROMPT, 'idle').dialog).toBeNull();
  });

  for (const [agent, question] of [['Codex', CODEX_QUESTION], ['Claude Code', CLAUDE_QUESTION]] as const) {
    it(`${agent}: a key sent against the question it shows is typed`, async () => {
      r.set.screen(question);
      const verb = createScreenKeys(r.deps);
      expect(await verb.keys(input([{ k: 'Down' }], pictureOf(r, question, 'running')), ALLOWED)).toEqual(DONE);
      expect(r.lines).toEqual(['copy-mode -q -t %5', 'send-keys -t %5 Down']);
    });

    it(`${agent}: a picture with no question, and a question drawn since: refused, nothing typed`, async () => {
      const picture = pictureOf(r, CODEX_PROMPT, 'idle');
      r.set.screen(question);
      const verb = createScreenKeys(r.deps);
      expect(await verb.keys(input([{ k: 'Enter' }], picture), ALLOWED)).toEqual(MOVED);
      expect(r.lines).toEqual([]);
    });

    it(`${agent}: the same question, and someone typed at the Mac since (the id moved): refused`, async () => {
      r.set.screen(question);
      const picture = pictureOf(r, question, 'running');
      r.turns.bump(ID, 'desk');
      const verb = createScreenKeys(r.deps);
      expect(await verb.keys(input([{ k: 'Enter' }], picture), ALLOWED)).toEqual(MOVED);
      expect(r.lines).toEqual([]);
    });

    it(`${agent}: the picture was a question, answered at the Mac, now its prompt: refused`, async () => {
      const picture = pictureOf(r, question, 'running');
      r.set.screen(agent === 'Codex' ? CODEX_PROMPT : CLAUDE_PROMPT);
      const verb = createScreenKeys(r.deps);
      expect(await verb.keys(input([{ k: 'Enter' }], picture), ALLOWED)).toEqual(MOVED);
      expect(r.lines).toEqual([]);
    });
  }

  it('another question drawn with the same id (no hook, no tick between): refused on the window', async () => {
    r.set.screen(CODEX_QUESTION);
    const picture = pictureOf(r, CODEX_QUESTION, 'running');
    r.set.screen(CLAUDE_QUESTION);
    const verb = createScreenKeys(r.deps);
    expect(await verb.keys(input([{ k: 'Enter' }], picture), ALLOWED)).toEqual(MOVED);
    expect(r.lines).toEqual([]);
  });

  it('a dialog echoed with a valid mark of ANOTHER screen is refused', async () => {
    r.set.screen(CODEX_QUESTION);
    const picture = { turn: r.turns.current(ID).id, dialog: pictureOf(r, CLAUDE_QUESTION, 'running').dialog };
    const verb = createScreenKeys(r.deps);
    expect(await verb.keys(input([{ k: 'Enter' }], picture), ALLOWED)).toEqual(MOVED);
  });

  it('the row waiting on him with no numbered question drawn is asking: its own window mark must match', async () => {
    r.set.row(rowOf('needs_input'));
    r.set.screen(CLAUDE_PROMPT);
    const picture = pictureOf(r, CLAUDE_PROMPT, 'needs_input');
    expect(picture.dialog).toMatch(/^[0-9a-f]{12}$/);
    const verb = createScreenKeys(r.deps);
    expect(await verb.keys(input([{ t: 'y' }], picture), ALLOWED)).toEqual(DONE);
    // A picture of it taken while it was not waiting carries no dialog: refused.
    r = rig();
    r.set.row(rowOf('needs_input'));
    r.set.screen(CLAUDE_PROMPT);
    const stale = pictureOf(r, CLAUDE_PROMPT, 'idle');
    const again = createScreenKeys(r.deps);
    expect(await again.keys(input([{ t: 'y' }], stale), ALLOWED)).toEqual(MOVED);
  });

  it('the hook commits needs_input while the screen is read, before any question is drawn: refused on the row now', async () => {
    const picture = pictureOf(r, CLAUDE_PROMPT, 'idle');
    r.set.screen(CLAUDE_PROMPT);
    r.set.duringRead(() => r.set.row(rowOf('needs_input')));
    const verb = createScreenKeys(r.deps);
    expect(await verb.keys(input([{ k: 'Enter' }], picture), ALLOWED)).toEqual(MOVED);
    expect(r.lines).toEqual([]);
  });

  it('neither asking: the echo is not compared, and a desk keystroke since does not refuse', async () => {
    const picture = pictureOf(r, CODEX_PROMPT, 'idle');
    r.turns.bump(ID, 'desk');
    const verb = createScreenKeys(r.deps);
    expect(await verb.keys(input([{ t: 'ls' }], { turn: picture.turn, dialog: null }), ALLOWED)).toEqual(DONE);
  });

  it('a second Return on the picture the poll handed back after the first is refused once a new question is drawn', async () => {
    r.set.screen(CODEX_QUESTION);
    const verb = createScreenKeys(r.deps);
    const first = pictureOf(r, CODEX_QUESTION, 'running');
    expect(await verb.keys(input([{ k: 'Enter' }], first), ALLOWED)).toEqual(DONE);
    // The poll answers at once with the moved id while the agent still shows its prompt.
    r.set.screen(CODEX_PROMPT);
    const between = pictureOf(r, CODEX_PROMPT, 'running');
    // A new, different question is drawn with no hook and no tick between.
    r.set.screen(CLAUDE_QUESTION);
    r.clock.at += 1_000;
    const linesBefore = r.lines.length;
    expect(await verb.keys(input([{ k: 'Enter' }], between), ALLOWED)).toEqual(MOVED);
    expect(r.lines.length).toBe(linesBefore);
  });
});

describe('another machine (D20): the carriage is the act', () => {
  it('hands the items to typeRemote after the final check, writes nothing here, and answers done', async () => {
    r.set.row(rowOf('idle', 'far'));
    const verb = createScreenKeys(r.deps);
    const keys: PocketKeyItem[] = [{ t: 'echo far' }];
    expect(await verb.keys(input(keys, pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual(DONE);
    expect(r.remote).toEqual([keys]);
    expect(r.lines).toEqual([]);
    expect(r.inputs).toEqual([ID]);
    expect(r.events.indexOf('remote')).toBe(r.events.indexOf('last-check') + 1);
  });

  it('answers unreachable when the carriage refused, with no funnel', async () => {
    r.set.row(rowOf('idle', 'far'));
    r.set.remote('unreachable');
    const verb = createScreenKeys(r.deps);
    expect(await verb.keys(input([{ k: 'C-c' }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual({
      outcome: 'refused',
      reason: 'unreachable',
      sentence: SCREEN_NOT_TYPABLE
    });
    expect(r.inputs).toEqual([]);
    expect(r.lines).toEqual([]);
  });

  it('answers unreachable for a remote read that cannot reach it, typing nothing', async () => {
    r.set.row(rowOf('idle', 'far'));
    const verb = createScreenKeys({ ...r.deps, watch: { ...r.deps.watch, readFresh: () => Promise.resolve('unreachable' as const) } });
    expect(await verb.keys(input([{ t: 'a' }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual({
      outcome: 'refused',
      reason: 'unreachable',
      sentence: SCREEN_NOT_TYPABLE
    });
    expect(r.remote).toEqual([]);
  });

  it('takes no key on another machine when no carriage writer was handed in', async () => {
    r.set.row(rowOf('idle', 'far'));
    const { typeRemote: _none, ...rest } = r.deps;
    const verb = createScreenKeys(rest);
    expect(await verb.keys(input([{ t: 'a' }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual({
      outcome: 'refused',
      reason: 'unreachable',
      sentence: SCREEN_NOT_TYPABLE
    });
    expect(r.events).toEqual([]);
  });
});

describe('THE GAP (D42)', () => {
  it('is 50 ms', () => {
    expect(SCREEN_KEYS_GAP_MS).toBe(50);
  });

  it('two writes handed 0 ms apart: the second\'s first line 50 ms or more after the first\'s, the wait BEFORE its fresh read', async () => {
    // The door holds one write in flight per session across verbs, so the
    // second is handed the moment the first is answered, on the same clock.
    const verb = createScreenKeys(r.deps);
    const picture = pictureOf(r, CODEX_PROMPT, 'idle');
    expect(await verb.keys(input([{ k: 'Escape' }], picture), ALLOWED)).toEqual(DONE);
    const handedAt = r.clock.at;
    expect(await verb.keys(input([{ t: 'b' }], picture), ALLOWED)).toEqual(DONE);
    const lineTimes = r.events.filter((e) => e.startsWith('line@')).map((e) => Number(e.slice(5)));
    expect(lineTimes).toHaveLength(4);
    // Escape's two lines at the start; b's two lines 50 ms later, not before.
    expect(lineTimes[0]).toBe(handedAt);
    expect(lineTimes[2]).toBeGreaterThanOrEqual((lineTimes[1] ?? 0) + SCREEN_KEYS_GAP_MS);
    // The wait is the gap's, and the second write's fresh read comes after it.
    const sleep = r.events.findIndex((e) => e.startsWith('sleep'));
    expect(r.events[sleep]).toBe('sleep 50');
    expect(r.events[sleep + 1]?.startsWith('read@')).toBe(true);
    expect(r.events.filter((e) => e.startsWith('read@'))).toEqual([`read@${String(handedAt)}`, `read@${String(handedAt + 50)}`]);
  });

  it('waits only the remainder, and not at all once 50 ms have passed', async () => {
    const verb = createScreenKeys(r.deps);
    expect(await verb.keys(input([{ t: 'a' }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual(DONE);
    r.clock.at += 30;
    expect(await verb.keys(input([{ t: 'b' }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual(DONE);
    expect(r.events.filter((e) => e.startsWith('sleep'))).toEqual(['sleep 20']);
    r.clock.at += 50;
    expect(await verb.keys(input([{ t: 'c' }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual(DONE);
    expect(r.events.filter((e) => e.startsWith('sleep'))).toEqual(['sleep 20']);
  });

  it('keeps sessions apart: a write on another session waits for nothing', async () => {
    const verb = createScreenKeys(r.deps);
    expect(await verb.keys(input([{ t: 'a' }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual(DONE);
    // A refused write records no act, so the next is not held for it either.
    r.set.row(rowOf('unknown'));
    r.clock.at += 60;
    expect((await verb.keys(input([{ t: 'b' }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).outcome).toBe('refused');
    r.set.row(rowOf('idle'));
    expect(await verb.keys(input([{ t: 'c' }], pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual(DONE);
    expect(r.events.filter((e) => e.startsWith('sleep'))).toEqual([]);
  });
});
