/**
 * THE PASTE VERB (Phase 348, build/p348/SPEC.md §4.6 steps 10 to 14, D19 to
 * D22, D50 to D52, D57, D58), driven against the SHIPPING
 * src/main/screen/paste.ts over a fake core, a recording runner and a fake
 * watch.
 *
 * The phone's picture of a screen is made the way the door makes it: the
 * SHIPPING composer over the same reading, so a paste answered `done` also
 * proves the verb's own reading of a screen agrees with the picture the phone
 * pasted against. The screens are COMMITTED real captures
 * (build/fixtures/reply/: Codex 0.160.0's approval, Codex at its prompt).
 *
 *  - D50's order, as events: the text rule; the gate; the gap; the buffer
 *    loaded from standard input; ONE fresh read; the final check; the bump and
 *    the seam; ONE spawned list, `copy-mode -q -t %N ; paste-buffer -p -d -b
 *    <name> -t %N`, never an Enter, never `-S`, never over the control client;
 *    then the funnel once and the nudge;
 *  - the text rule and the gate refuse with NOTHING run, another machine
 *    before the buffer;
 *  - every final-check refusal drops the buffer in the finally, moves no id
 *    and types nothing; a failed list drops it too and answers PASTE_FAILED
 *    with no funnel; a list that landed leaves the buffer to `-d`;
 *  - the one refusal both ways (the question id, the window mark);
 *  - ONE last-act store with the keys verb (D57): a keys write and a paste on
 *    one session at least 50 ms apart whichever came first.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { POCKET_WRITE_SENTENCES } from '@shared/ipc/pocket';
import { LIFECYCLE_SESSION_CHANGED, SESSION_NOT_FOUND } from '@shared/lifecycle-words';
import {
  PASTE_CHARACTER,
  PASTE_EMPTY,
  PASTE_FAILED,
  PASTE_THIS_MAC_ONLY,
  PASTE_TOO_LONG,
  SCREEN_NOT_TYPABLE,
  SCREEN_QUESTION_MOVED
} from '@shared/screen-copy';
import type { Session, SessionStatus } from '@shared/types';
import type { PocketPasteInput, PocketPasteOutcome } from '../../pocket/routes';
import { createQuestionIds, type QuestionIds } from '../../reply/question-id';
import { composeScreen } from '../compose';
import { createScreenKeys, createScreenLastActs, SCREEN_KEYS_GAP_MS, type ScreenLastActs } from '../keys';
import { createScreenPaste, type ScreenPasteDeps } from '../paste';
import type { ScreenReading } from '../read';

const REPO = join(__dirname, '../../../..');
const fixture = (name: string): string => readFileSync(join(REPO, 'build/fixtures/reply', name), 'utf8');
const CODEX_QUESTION = fixture('codex-approval-0.160.0.txt');
const CODEX_PROMPT = fixture('codex-prompt-empty-0.160.0.ansi');

const PANE = '%5';
const ID = 's1';
const ch = (cp: number): string => String.fromCodePoint(cp);

function readingOf(styled: string, pane = PANE): ScreenReading {
  const display = { paneId: pane, cols: 120, rows: 40, cursorX: 0, cursorY: 0, cursorVisible: true, alternate: false, history: 0 };
  return { styled, display, displayLine: `${pane}\t120\t40\t0\t0\t1\t0\t0`, steady: true };
}

function rowOf(status: SessionStatus, machine?: string): Session {
  return { id: ID, status, agent: 'codex', ...(machine === undefined ? {} : { machine: { id: machine } }) } as unknown as Session;
}

interface Rig {
  deps: ScreenPasteDeps;
  turns: QuestionIds;
  lastActs: ScreenLastActs;
  /** Every event, in order. */
  events: string[];
  /** Every spawned argv, with its stdin as text when it had one. */
  runs: { args: string[]; stdin: string | null }[];
  inputs: string[];
  nudges: { id: string; before: string }[];
  /** Lines written to the control client: a paste writes none. */
  lines: string[];
  clock: { at: number };
  set: {
    screen(text: string, pane?: string): void;
    row(row: Session | undefined): void;
    tmuxId(id: string | null): void;
    fail(match: (args: readonly string[]) => boolean): void;
    read(answer: 'unreachable' | null): void;
    duringRead(fn: () => void): void;
  };
}

function rig(lastActs: ScreenLastActs = createScreenLastActs()): Rig {
  const turns = createQuestionIds('0123456789abcdef');
  const events: string[] = [];
  const runs: { args: string[]; stdin: string | null }[] = [];
  const inputs: string[] = [];
  const nudges: { id: string; before: string }[] = [];
  const lines: string[] = [];
  const clock = { at: 1_000 };
  let screen = CODEX_PROMPT;
  let pane = PANE;
  let row: Session | undefined = rowOf('idle');
  let tmuxId: string | null = '$3';
  let fail: (args: readonly string[]) => boolean = () => false;
  let readAnswer: 'unreachable' | null | undefined;
  let duringRead: (() => void) | null = null;
  const core = {
    listSessions: (): Session[] => (row === undefined ? [] : [row]),
    tmuxIdOf: (): string | null => tmuxId,
    manifest: { getSession: (id: string) => (id === ID ? { status: 'idle' } : undefined) },
    control: {
      connected: true,
      sendCommand: (command: string): Promise<string[]> => {
        lines.push(command);
        return Promise.resolve([]);
      }
    },
    activity: { noteUserInput: (): void => undefined }
  };
  const deps: ScreenPasteDeps = {
    core: () => core as never,
    turns,
    lastActs,
    watch: {
      readFresh: async () => {
        events.push(`read@${String(clock.at)}`);
        await Promise.resolve();
        duringRead?.();
        duringRead = null;
        if (readAnswer !== undefined) return readAnswer;
        return readingOf(screen, pane);
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
    run: (args, options) => {
      events.push(`run:${args[0] ?? ''}`);
      runs.push({ args: [...args], stdin: options?.stdin === undefined ? null : options.stdin.toString('utf8') });
      return fail(args) ? Promise.reject(new Error('tmux refused')) : Promise.resolve('');
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
    lastActs,
    events,
    runs,
    inputs,
    nudges,
    lines,
    clock,
    set: {
      screen: (text, p = PANE) => {
        screen = text;
        pane = p;
      },
      row: (next) => {
        row = next;
      },
      tmuxId: (next) => {
        tmuxId = next;
      },
      fail: (match) => {
        fail = match;
      },
      read: (answer) => {
        readAnswer = answer;
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
  const composed = composeScreen(readingOf(styled), { turn, status, typable: true, local: true });
  if (composed === 'large') throw new Error('large');
  // The composer offers a paste on a typable screen on this Mac (D30).
  expect(composed.screen.paste).toBe(true);
  return { turn, dialog: composed.screen.dialog };
}

function input(text: string, picture: { turn: string; dialog: string | null }): PocketPasteInput {
  return { sessionId: ID, text, turn: picture.turn, dialog: picture.dialog };
}

const ALLOWED = (): boolean => true;
const DONE: PocketPasteOutcome = { outcome: 'done' };

/** The buffer name a run loaded, and every run that named it. */
function bufferOf(r: Rig): string {
  const load = r.runs.find((one) => one.args[0] === 'load-buffer');
  if (load === undefined) throw new Error('no load');
  return load.args[2] ?? '';
}

let r: Rig;

beforeEach(() => {
  r = rig();
});

describe('the act (D50, D52, D58)', () => {
  it('loads the words from standard input BEFORE the read, then ONE spawned list: copy-mode -q, then paste-buffer -p -d, no Enter', async () => {
    const verb = createScreenPaste(r.deps);
    const text = `line one${ch(0x0a)}line two${ch(0x09)}tab`;
    const n0 = r.turns.current(ID).n;
    expect(await verb.paste(input(text, pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual(DONE);
    const name = bufferOf(r);
    expect(name).toMatch(/^tortie-paste-[0-9a-f]{32}$/);
    expect(r.runs).toEqual([
      { args: ['load-buffer', '-b', name, '-'], stdin: text },
      { args: ['copy-mode', '-q', '-t', PANE, ';', 'paste-buffer', '-p', '-d', '-b', name, '-t', PANE], stdin: null }
    ]);
    // D50's order: the buffer, the read, the last check, the act, the funnel, the nudge.
    expect(r.events).toEqual(['run:load-buffer', 'read@1000', 'last-check', 'run:copy-mode', 'funnel', 'nudge']);
    // No Enter, no -S, nothing over the control client, no argv element the words.
    for (const one of r.runs) {
      expect(one.args).not.toContain('Enter');
      expect(one.args).not.toContain('send-keys');
      expect(one.args).not.toContain('-S');
      for (const arg of one.args) expect(text.includes(arg) && arg.length > 2).toBe(false);
    }
    expect(r.lines).toEqual([]);
    // The id moved once, for the phone; the funnel once; the nudge with the read's mark.
    expect(r.turns.current(ID).n).toBe(n0 + 1);
    expect(r.inputs).toEqual([ID]);
    const composed = composeScreen(readingOf(CODEX_PROMPT), { turn: '', status: 'idle', typable: true });
    if (composed === 'large') throw new Error('large');
    expect(r.nudges).toEqual([{ id: ID, before: composed.mark }]);
  });

  it('pastes the text exactly as it came: nothing trimmed, replaced or normalized', async () => {
    const verb = createScreenPaste(r.deps);
    const text = `  leading and trailing  ${ch(0x0a)}é ${ch(0x1f600)} 中${ch(0x0a)}`;
    expect(await verb.paste(input(text, pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual(DONE);
    expect(r.runs[0]?.stdin).toBe(text);
  });

  it('a list that fails answers PASTE_FAILED, asks no funnel, and drops the buffer it left on the server', async () => {
    r.set.fail((args) => args[0] === 'copy-mode');
    const verb = createScreenPaste(r.deps);
    expect(await verb.paste(input('hi', pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual({ outcome: 'failed', sentence: PASTE_FAILED });
    const name = bufferOf(r);
    expect(r.runs.at(-1)?.args).toEqual(['delete-buffer', '-b', name]);
    expect(r.inputs).toEqual([]);
    // The id moved (the act was made), and the nudge still came: the screen may have moved.
    expect(r.nudges).toHaveLength(1);
  });

  it('a load that fails is failed, reads nothing, and leaves no buffer behind', async () => {
    r.set.fail((args) => args[0] === 'load-buffer');
    const verb = createScreenPaste(r.deps);
    expect(await verb.paste(input('hi', pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual({ outcome: 'failed', sentence: PASTE_FAILED });
    expect(r.events.some((e) => e.startsWith('read@'))).toBe(false);
    expect(r.runs.map((one) => one.args[0])).toEqual(['load-buffer', 'delete-buffer']);
  });
});

describe('the text rule and the gate: refused with NOTHING run (D50 steps 1 and 2, D22)', () => {
  it('refuses each text rule in its own words', async () => {
    const verb = createScreenPaste(r.deps);
    const picture = pictureOf(r, CODEX_PROMPT, 'idle');
    expect(await verb.paste(input('', picture), ALLOWED)).toEqual({ outcome: 'refused', reason: 'empty', sentence: PASTE_EMPTY });
    expect(await verb.paste(input('a'.repeat(16_385), picture), ALLOWED)).toEqual({ outcome: 'refused', reason: 'long', sentence: PASTE_TOO_LONG });
    for (const cp of [0x1b, 0x0d, 0x7f, 0x00, 0x85]) {
      expect(await verb.paste(input(`a${ch(cp)}b`, picture), ALLOWED), cp.toString(16)).toEqual({
        outcome: 'refused',
        reason: 'character',
        sentence: PASTE_CHARACTER
      });
    }
    expect(r.runs).toEqual([]);
    expect(r.events).toEqual([]);
  });

  it('refuses a session on another machine as `machine`, before the buffer and before any read', async () => {
    r.set.row(rowOf('running', 'm1'));
    const verb = createScreenPaste(r.deps);
    expect(await verb.paste(input('hi', pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual({
      outcome: 'refused',
      reason: 'machine',
      sentence: PASTE_THIS_MAC_ONLY
    });
    expect(r.runs).toEqual([]);
    expect(r.events).toEqual([]);
  });

  it('refuses a row that takes no key, a row with no live $-id and an id nothing holds, each before the buffer', async () => {
    const picture = pictureOf(r, CODEX_PROMPT, 'idle');
    for (const status of ['unknown', 'exited', 'restorable', 'discarded'] as const) {
      r = rig();
      r.set.row(rowOf(status));
      expect(await createScreenPaste(r.deps).paste(input('hi', picture), ALLOWED), status).toEqual({
        outcome: 'refused',
        reason: 'unreachable',
        sentence: SCREEN_NOT_TYPABLE
      });
      expect(r.runs, status).toEqual([]);
    }
    r = rig();
    r.set.tmuxId(null);
    expect(await createScreenPaste(r.deps).paste(input('hi', picture), ALLOWED)).toMatchObject({ reason: 'unreachable' });
    expect(r.runs).toEqual([]);
    r = rig();
    r.set.row(undefined);
    expect(await createScreenPaste(r.deps).paste({ ...input('hi', picture), sessionId: 'nobody' }, ALLOWED)).toEqual({
      outcome: 'refused',
      reason: 'gone',
      sentence: SESSION_NOT_FOUND
    });
    expect(await createScreenPaste(r.deps).paste(input('hi', picture), ALLOWED)).toEqual({
      outcome: 'refused',
      reason: 'gone',
      sentence: LIFECYCLE_SESSION_CHANGED
    });
    expect(r.runs).toEqual([]);
  });

  it('answers failed with no core, and runs nothing', async () => {
    const verb = createScreenPaste({ ...r.deps, core: () => null });
    expect(await verb.paste(input('hi', pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual({ outcome: 'failed', sentence: PASTE_FAILED });
    expect(r.runs).toEqual([]);
  });
});

describe('the final check: every refusal drops the buffer, moves no id and types nothing (D50 step 5)', () => {
  async function refusedAfterLoad(arrange: () => void, still = ALLOWED): Promise<PocketPasteOutcome> {
    const picture = pictureOf(r, CODEX_PROMPT, 'idle');
    arrange();
    const n0 = r.turns.current(ID).n;
    const outcome = await createScreenPaste(r.deps).paste(input('hi', picture), still);
    const name = bufferOf(r);
    expect(r.runs.map((one) => one.args[0])).toEqual(['load-buffer', 'delete-buffer']);
    expect(r.runs[1]?.args).toEqual(['delete-buffer', '-b', name]);
    expect(r.turns.current(ID).n).toBe(n0);
    expect(r.inputs).toEqual([]);
    expect(r.nudges).toEqual([]);
    expect(r.events).not.toContain('last-check');
    return outcome;
  }

  it('the door’s last check asked again: stopped', async () => {
    expect(await refusedAfterLoad(() => undefined, () => false)).toEqual({
      outcome: 'refused',
      reason: 'stopped',
      sentence: POCKET_WRITE_SENTENCES.stopped
    });
  });

  it('a read that could not be made: unreachable', async () => {
    expect(await refusedAfterLoad(() => r.set.read('unreachable'))).toMatchObject({ reason: 'unreachable', sentence: SCREEN_NOT_TYPABLE });
  });

  it('the row gone, ended or moved to another machine during the read', async () => {
    expect(await refusedAfterLoad(() => r.set.duringRead(() => r.set.row(undefined)))).toMatchObject({ reason: 'gone' });
    r = rig();
    expect(await refusedAfterLoad(() => r.set.duringRead(() => r.set.row(rowOf('exited'))))).toMatchObject({ reason: 'unreachable' });
    r = rig();
    expect(await refusedAfterLoad(() => r.set.duringRead(() => r.set.row(rowOf('running', 'm1'))))).toEqual({
      outcome: 'refused',
      reason: 'changed',
      sentence: LIFECYCLE_SESSION_CHANGED
    });
  });

  it('another $-id after the read: changed', async () => {
    expect(await refusedAfterLoad(() => r.set.duringRead(() => r.set.tmuxId('$9')))).toEqual({
      outcome: 'refused',
      reason: 'changed',
      sentence: LIFECYCLE_SESSION_CHANGED
    });
  });

  it('a pane the read named that is not a %-id: unreachable', async () => {
    expect(await refusedAfterLoad(() => r.set.screen(CODEX_PROMPT, '$5'))).toMatchObject({ reason: 'unreachable' });
  });
});

describe('THE ONE REFUSAL, the keys verb’s (D50 step 5)', () => {
  it('pastes into a question the phone was looking at, with its turn and its mark', async () => {
    r.set.screen(CODEX_QUESTION);
    const picture = pictureOf(r, CODEX_QUESTION, 'running');
    expect(picture.dialog).not.toBeNull();
    expect(await createScreenPaste(r.deps).paste(input('y', picture), ALLOWED)).toEqual(DONE);
  });

  it('refuses changed with nothing typed when the question id moved since the picture', async () => {
    r.set.screen(CODEX_QUESTION);
    const picture = pictureOf(r, CODEX_QUESTION, 'running');
    r.turns.bump(ID, 'desk');
    const outcome = await createScreenPaste(r.deps).paste(input('y', picture), ALLOWED);
    expect(outcome).toEqual({ outcome: 'refused', reason: 'changed', sentence: SCREEN_QUESTION_MOVED });
    expect(r.runs.map((one) => one.args[0])).toEqual(['load-buffer', 'delete-buffer']);
  });

  it('refuses a paste sent against a question when the screen no longer asks, and one sent against no question when it does', async () => {
    const asked = pictureOf(r, CODEX_QUESTION, 'running');
    // The question was answered at the desk: the screen is the prompt now.
    expect(await createScreenPaste(r.deps).paste(input('y', asked), ALLOWED)).toMatchObject({ reason: 'changed', sentence: SCREEN_QUESTION_MOVED });
    r = rig();
    const plain = pictureOf(r, CODEX_PROMPT, 'idle');
    r.set.screen(CODEX_QUESTION);
    expect(await createScreenPaste(r.deps).paste(input('y', plain), ALLOWED)).toMatchObject({ reason: 'changed', sentence: SCREEN_QUESTION_MOVED });
  });

  it('a row waiting on him with no question drawn still locks to the turn', async () => {
    const picture = pictureOf(r, CODEX_PROMPT, 'needs_input');
    r.set.row(rowOf('needs_input'));
    r.turns.bump(ID, 'desk');
    expect(await createScreenPaste(r.deps).paste(input('y', picture), ALLOWED)).toMatchObject({ reason: 'changed' });
  });
});

describe('ONE last-act store with the keys verb (D57)', () => {
  it('a paste right after a keys write waits out the gap, and a keys write right after a paste does too', async () => {
    const shared = createScreenLastActs();
    r = rig(shared);
    const keys = createScreenKeys({
      core: r.deps.core,
      turns: r.turns,
      watch: r.deps.watch,
      noteUserInput: () => undefined,
      lastActs: shared,
      now: () => r.clock.at,
      sleep: async (ms) => {
        r.events.push(`keys-sleep ${String(ms)}`);
        r.clock.at += ms;
      }
    });
    const paste = createScreenPaste(r.deps);
    const picture = (): { turn: string; dialog: string | null } => pictureOf(r, CODEX_PROMPT, 'idle');
    expect(await keys.keys({ sessionId: ID, keys: [{ t: 'a' }], turn: picture().turn, dialog: null }, ALLOWED)).toEqual(DONE);
    const keysAt = shared.get(ID);
    expect(keysAt).toBe(1_000);
    expect(await paste.paste(input('b', picture()), ALLOWED)).toEqual(DONE);
    expect(r.events).toContain(`sleep ${String(SCREEN_KEYS_GAP_MS)}`);
    const pasteAt = shared.get(ID) ?? 0;
    expect(pasteAt - (keysAt ?? 0)).toBeGreaterThanOrEqual(SCREEN_KEYS_GAP_MS);
    // And the keys verb waits for the paste's act in turn.
    expect(await keys.keys({ sessionId: ID, keys: [{ t: 'c' }], turn: picture().turn, dialog: null }, ALLOWED)).toEqual(DONE);
    expect(r.events).toContain(`keys-sleep ${String(SCREEN_KEYS_GAP_MS)}`);
    // The gap is waited BEFORE the buffer is loaded and the read made.
    const sleepAt = r.events.indexOf(`sleep ${String(SCREEN_KEYS_GAP_MS)}`);
    expect(r.events.indexOf('run:load-buffer', sleepAt)).toBeGreaterThan(sleepAt);
  });

  it('two sessions do not wait for each other', async () => {
    const shared = createScreenLastActs();
    shared.set('other', 1_000);
    r = rig(shared);
    expect(await createScreenPaste(r.deps).paste(input('x', pictureOf(r, CODEX_PROMPT, 'idle')), ALLOWED)).toEqual(DONE);
    expect(r.events.some((e) => e.startsWith('sleep'))).toBe(false);
  });
});

describe('what it never does, read as text', () => {
  it('logs nothing, reads no error’s text, names no status setter but noteUserInput, and no Enter', () => {
    const code = readFileSync(join(__dirname, '..', 'paste.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(code).not.toMatch(/\bconsole\.|getLog|\.message\b/);
    expect(code).not.toMatch(/setStatus|noteHookEvent|\.status\s*=/);
    expect(code.match(/deps\.noteUserInput\(/g)).toHaveLength(1);
    expect(code).not.toMatch(/'Enter'|'send-keys'|'-l'|'-S'/);
    expect(code).not.toMatch(/\.replace\(|\.trim|\.normalize\(|\.slice\(/);
    expect(code.match(/bump\(/g)).toHaveLength(1);
    expect(code).not.toMatch(/'load-buffer'|'delete-buffer'/);
  });
});
