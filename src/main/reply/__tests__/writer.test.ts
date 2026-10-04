/**
 * The press and the message (Phase 318, build/p318/SPEC.md §5.6, D5, D8 to D10,
 * D16, D17; §Revision R3, R7, R11, R12, R15, R19), over a fake core, a
 * recording runner and a fake process table, with the REAL screens of
 * build/fixtures/reply as what the capture returns. Nothing here starts a
 * process or a tmux server.
 */

import { describe, expect, it } from 'vitest';
import { POCKET_WRITE_SENTENCES } from '@shared/ipc/pocket';
import { LIFECYCLE_SESSION_CHANGED, SESSION_NOT_FOUND } from '@shared/lifecycle-words';
import {
  REPLY_ANSWER_IN_SESSION,
  REPLY_FAILED,
  REPLY_NOT_READY,
  REPLY_NOT_TAKEN,
  REPLY_TEXT_CHARACTER,
  REPLY_TEXT_EMPTY,
  REPLY_TEXT_LONG,
  REPLY_TYPED_UNREAD
} from '@shared/reply-copy';
import { questionFromHookBody } from '../../activity/question';
import { detectDialogRows, normalizeCapture } from '../../activity/screen';
import { quoteTmuxArg } from '../../tmux/control-client';
import { hookBashOf } from '../hook-says';
import { replyMarkOf } from '../reader';
import { createReplyVerbs, REPLY_READ_BACK_MS } from '../writer';
import { hookBodies, plainFixture, styledFixture } from './fixtures';
import { CHILD_HOLDS, PANE_ID, SID, TMUX_ID, depsOf, runs, session, world, type World } from './harness';

const ALLOWED = (): boolean => true;
const line = (args: string[]): string => args.map(quoteTmuxArg).join(' ');

/** A world at the real Claude Bash prompt, hooked and appeared, and the press the phone was shown. */
function pressWorld(index = 0): { w: World; question: string; mark: string } {
  const w = world();
  const body = hookBodies()[index] ?? '';
  const asked = questionFromHookBody(body);
  w.turns.hook(SID, asked, asked === null ? null : hookBashOf(body, asked));
  w.turns.bump(SID, 'choice-appeared');
  const files = ['claude-bash-2.1.287.txt', 'claude-bash-multiline-2.1.287.txt'];
  w.screen.plain = plainFixture(files[index] ?? '');
  // The read-back sees the dialog gone: the agent took the digit.
  w.after = plainFixture('codex-approval-0.160.0.txt').split('\n').slice(0, 14).join('\n');
  const rows = detectDialogRows(normalizeCapture(w.screen.plain));
  return { w, question: w.turns.current(SID).id, mark: replyMarkOf(rows, null) };
}

function codexPressWorld(file = 'codex-approval-0.160.0.txt', command = 'touch p318-one.txt'): { w: World; question: string; mark: string } {
  const w = world({ session: session({ agent: 'codex' }), command: 'node /x/.local/bin/codex' });
  w.turns.bump(SID, 'choice-appeared');
  w.screen.plain = plainFixture(file);
  w.after = '';
  const rows = detectDialogRows(normalizeCapture(w.screen.plain));
  return { w, question: w.turns.current(SID).id, mark: replyMarkOf(rows, command) };
}

function sayWorld(agent: 'claude' | 'codex' = 'claude'): World {
  const w = world({
    session: session({ agent, status: 'idle' }),
    command: agent === 'claude' ? 'claude' : 'node /x/codex'
  });
  w.screen.styled = styledFixture(agent === 'claude' ? 'claude-prompt-empty-2.1.287.ansi' : 'codex-prompt-empty-0.160.0.ansi');
  return w;
}

/** Every argv element and control line a world saw, one list. */
function everything(w: World): string[] {
  return w.events.flatMap((e) => (e.kind === 'run' ? [...e.args] : e.kind === 'control' ? [e.line] : []));
}

/** The kinds after the reading's capture, which must be empty when the final check refused. */
function afterReading(w: World): string[] {
  const i = w.events.findIndex((e) => e.kind === 'run' && e.args[0] === 'capture-pane');
  return w.events.slice(i + 1).map((e) => (e.kind === 'run' ? `run:${e.args[0] ?? ''}` : e.kind));
}

describe('choose: the act', () => {
  it('a press over the control client: two one-command lines, the digit alone, aimed at the reading\'s pane, never an Enter', async () => {
    const { w, question, mark } = pressWorld();
    const verbs = createReplyVerbs(depsOf(w));
    const outcome = await verbs.choose({ sessionId: SID, question, mark, marker: '1' }, ALLOWED);
    expect(outcome).toEqual({ outcome: 'done' });
    const controls = w.events.flatMap((e) => (e.kind === 'control' ? [e.line] : []));
    expect(controls).toEqual([
      line(['copy-mode', '-q', '-t', PANE_ID]),
      line(['send-keys', '-t', PANE_ID, '-l', '--', '1'])
    ]);
    expect(everything(w).join(' ')).not.toMatch(/Enter|C-m|\r|\n/);
    // The act is aimed at the %-pane, never the $-session.
    expect(controls.every((c) => !c.includes(TMUX_ID))).toBe(true);
  });

  it('a press with the control client down: the one spawned list, exactly', async () => {
    const { w, question, mark } = pressWorld();
    w.core.connected = false;
    const outcome = await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark, marker: '4' }, ALLOWED);
    expect(outcome).toEqual({ outcome: 'done' });
    expect(runs(w)).toContainEqual(['copy-mode', '-q', '-t', PANE_ID, ';', 'send-keys', '-t', PANE_ID, '-l', '--', '4']);
    expect(w.events.filter((e) => e.kind === 'control')).toEqual([]);
  });

  it('the id moves, then the last-check hook, then the act, in that order (D5, Y5)', async () => {
    const { w, question, mark } = pressWorld();
    let nAtAct = -1;
    const d = depsOf(w);
    const n0 = w.turns.current(SID).n;
    w.core.control.sendCommand = (l: string) => {
      if (nAtAct === -1) nAtAct = w.turns.current(SID).n;
      w.events.push({ kind: 'control', line: l });
      return Promise.resolve([]);
    };
    await createReplyVerbs(d).choose({ sessionId: SID, question, mark, marker: '1' }, ALLOWED);
    expect(nAtAct).toBeGreaterThan(n0);
    const kinds = w.events.map((e) => (e.kind === 'run' ? `run:${e.args[0] ?? ''}` : e.kind));
    const last = kinds.indexOf('lastCheck');
    expect(kinds.slice(last, last + 3)).toEqual(['lastCheck', 'control', 'control']);
    // The reading's capture is the last read before the final check.
    expect(kinds.slice(0, last)).toEqual(['run:list-panes', 'proc', 'command', 'run:capture-pane']);
  });

  it('his ruling 2: a widening option is pressed like any other when the command is said', async () => {
    for (const marker of ['2', '3']) {
      const { w, question, mark } = pressWorld();
      expect(await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark, marker }, ALLOWED)).toEqual({
        outcome: 'done'
      });
    }
  });

  it('a Codex press: the reply mark covers the $ line, and No is the digit 3', async () => {
    const { w, question, mark } = codexPressWorld();
    expect(await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark, marker: '3' }, ALLOWED)).toEqual({
      outcome: 'done'
    });
    const otherCommand = replyMarkOf(detectDialogRows(normalizeCapture(w.screen.plain)), 'touch other.txt');
    const again = codexPressWorld();
    expect(
      await createReplyVerbs(depsOf(again.w)).choose({ sessionId: SID, question: again.question, mark: otherCommand, marker: '3' }, ALLOWED)
    ).toEqual({ outcome: 'refused', reason: 'changed', sentence: LIFECYCLE_SESSION_CHANGED });
  });
});

describe('choose: refused before anything is typed', () => {
  it('the gate: gone, unpressable on another machine or a shell, changed when not waiting — nothing read', async () => {
    const REMOTE = { id: 'popos', label: 'pop-os' } as unknown as NonNullable<ReturnType<typeof session>['machine']>;
    const cases: Array<[World, string, unknown]> = [];
    const gone = pressWorld();
    gone.w.core.sessions = [];
    gone.w.records.clear();
    cases.push([gone.w, 'gone, no record', { outcome: 'refused', reason: 'gone', sentence: SESSION_NOT_FOUND }]);
    const listedOff = pressWorld();
    listedOff.w.core.sessions = [];
    cases.push([listedOff.w, 'gone, a record', { outcome: 'refused', reason: 'gone', sentence: LIFECYCLE_SESSION_CHANGED }]);
    const remote = pressWorld();
    remote.w.core.sessions = [session({ machine: REMOTE })];
    cases.push([remote.w, 'remote', { outcome: 'refused', reason: 'unpressable', sentence: REPLY_ANSWER_IN_SESSION }]);
    const shell = pressWorld();
    shell.w.core.sessions = [session({ agent: 'shell' })];
    cases.push([shell.w, 'shell', { outcome: 'refused', reason: 'unpressable', sentence: REPLY_ANSWER_IN_SESSION }]);
    const running = pressWorld();
    running.w.core.sessions = [session({ status: 'running' })];
    cases.push([running.w, 'running', { outcome: 'refused', reason: 'changed', sentence: LIFECYCLE_SESSION_CHANGED }]);
    const noId = pressWorld();
    noId.w.tmuxIds.clear();
    cases.push([noId.w, 'no tmux id', { outcome: 'refused', reason: 'changed', sentence: LIFECYCLE_SESSION_CHANGED }]);
    for (const [w, name, expected] of cases) {
      const outcome = await createReplyVerbs(depsOf(w)).choose(
        { sessionId: SID, question: w.turns.current(SID).id, mark: 'x', marker: '1' },
        ALLOWED
      );
      expect(outcome, name).toEqual(expected);
      expect(w.events, name).toEqual([]);
    }
  });

  it('a question id that is not the session\'s now: changed, nothing read', async () => {
    const { w, mark } = pressWorld();
    for (const question of [`${'abcdefabcdef0123'}-0`, 'abcdefabcdef0123-999', '0000000000000000-1']) {
      expect(await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark, marker: '1' }, ALLOWED)).toEqual({
        outcome: 'refused',
        reason: 'changed',
        sentence: LIFECYCLE_SESSION_CHANGED
      });
    }
    expect(w.events).toEqual([]);
  });

  it('another session\'s valid id is refused, whatever the two screens show (R2)', async () => {
    const { w, mark } = pressWorld();
    w.turns.hook('other', 'Bash ls', 'whole');
    const otherId = w.turns.current('other').id;
    expect(await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question: otherId, mark, marker: '1' }, ALLOWED)).toEqual({
      outcome: 'refused',
      reason: 'changed',
      sentence: LIFECYCLE_SESSION_CHANGED
    });
  });

  it('the door stopped while it read: stopped, nothing typed (D5)', async () => {
    const { w, question, mark } = pressWorld();
    const outcome = await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark, marker: '1' }, () => false);
    expect(outcome).toEqual({ outcome: 'refused', reason: 'stopped', sentence: POCKET_WRITE_SENTENCES.stopped });
    expect(afterReading(w)).toEqual([]);
  });

  it('each final-check refusal types nothing and moves no id (R12, D13, D18)', async () => {
    const changed = { outcome: 'refused', reason: 'changed', sentence: LIFECYCLE_SESSION_CHANGED };
    const arms: Array<[string, (w: World) => void, string?]> = [
      ['a desk keystroke during the reading', (w) => {
        w.onRun = (a) => {
          if (a[0] === 'capture-pane') w.turns.bump(SID, 'desk');
        };
      }],
      ['the session replaced during the reading', (w) => {
        w.onRun = (a) => {
          if (a[0] === 'capture-pane') w.tmuxIds.set(SID, '$8');
        };
      }],
      ['the row stopped waiting during the reading', (w) => {
        w.onRun = (a) => {
          if (a[0] === 'capture-pane') w.core.sessions = [session({ status: 'running' })];
        };
      }],
      ['the foreground is not the agent', (w) => {
        w.proc = CHILD_HOLDS;
        w.command = '/bin/cat dialog.txt';
      }],
      ['the screen moved to another choice', (w) => {
        w.screen.plain = plainFixture('claude-edit.txt');
      }],
      ['the capture failed', (w) => {
        w.failVerb.add('capture-pane');
      }],
      ['the mark the phone echoed is not this screen\'s', () => undefined, 'deadbeefdead'],
      ['a marker that is not one of the rows', () => undefined]
    ];
    for (const [name, arrange, badMark] of arms) {
      const { w, question, mark } = pressWorld();
      arrange(w);
      const nBefore = w.turns.current(SID).n;
      const marker = name.startsWith('a marker') ? '7' : '1';
      const outcome = await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark: badMark ?? mark, marker }, ALLOWED);
      expect(outcome, name).toEqual(changed);
      expect(w.events.filter((e) => e.kind === 'control' || e.kind === 'lastCheck'), name).toEqual([]);
      expect(runs(w).filter((a) => a[0] === 'copy-mode'), name).toEqual([]);
      if (!name.startsWith('a desk')) expect(w.turns.current(SID).n, name).toBe(nBefore);
    }
  });

  it('a desk keystroke during a Codex reading refuses the press: the count is all that sees it', async () => {
    const { w, question, mark } = codexPressWorld();
    w.onRun = (a) => {
      if (a[0] === 'capture-pane') w.turns.bump(SID, 'desk');
    };
    expect(await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark, marker: '1' }, ALLOWED)).toEqual({
      outcome: 'refused',
      reason: 'changed',
      sentence: LIFECYCLE_SESSION_CHANGED
    });
    expect(w.events.filter((e) => e.kind === 'control' || e.kind === 'lastCheck')).toEqual([]);
  });

  it('an allow option is refused when the command is not said: only No may be pressed (D12)', async () => {
    const { w, question, mark } = pressWorld(1);
    const verbs = createReplyVerbs(depsOf(w));
    expect(await verbs.choose({ sessionId: SID, question, mark, marker: '1' }, ALLOWED)).toEqual({
      outcome: 'refused',
      reason: 'changed',
      sentence: LIFECYCLE_SESSION_CHANGED
    });
    expect(await verbs.choose({ sessionId: SID, question, mark, marker: '4' }, ALLOWED)).toEqual({ outcome: 'done' });
  });

  it('a second press on the same offer is refused: the first press moved the id', async () => {
    const { w, question, mark } = pressWorld();
    const verbs = createReplyVerbs(depsOf(w));
    expect(await verbs.choose({ sessionId: SID, question, mark, marker: '1' }, ALLOWED)).toEqual({ outcome: 'done' });
    expect((await verbs.choose({ sessionId: SID, question, mark, marker: '1' }, ALLOWED)).outcome).toBe('refused');
  });
});

describe('choose: the outcome and the read-back (D16, R3, R11, R19 a)', () => {
  it('the outcome is the send-keys line\'s: a refused copy-mode beside a typed digit goes on to the read-back', async () => {
    const { w, question, mark } = pressWorld();
    w.failControl.add('copy-mode');
    const outcome = await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark, marker: '1' }, ALLOWED);
    expect(outcome).toEqual({ outcome: 'done' });
    expect(runs(w).filter((a) => a[0] === 'capture-pane')).toHaveLength(2);
  });

  it('a refused send-keys line, or a refused spawned list, is "could not type"', async () => {
    const { w, question, mark } = pressWorld();
    w.failControl.add('send-keys');
    expect(await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark, marker: '1' }, ALLOWED)).toEqual({
      outcome: 'failed',
      sentence: REPLY_FAILED
    });
    const spawned = pressWorld();
    spawned.w.core.connected = false;
    spawned.w.failVerb.add('copy-mode');
    expect(
      await createReplyVerbs(depsOf(spawned.w)).choose({ sessionId: SID, question: spawned.question, mark: spawned.mark, marker: '1' }, ALLOWED)
    ).toEqual({ outcome: 'failed', sentence: REPLY_FAILED });
    expect(w.noteUserInput).not.toHaveBeenCalled();
  });

  it('reads back at REPLY_READ_BACK_MS: the same window and no hook is not taken, and is never retried', async () => {
    const { w, question, mark } = pressWorld();
    w.after = null; // the read-back sees exactly the reading's screen
    const outcome = await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark, marker: '1' }, ALLOWED);
    expect(outcome).toEqual({ outcome: 'failed', sentence: REPLY_NOT_TAKEN });
    expect(REPLY_READ_BACK_MS).toBe(300);
    const sleeps = w.events.flatMap((e) => (e.kind === 'sleep' ? [e.ms] : []));
    expect(sleeps).toHaveLength(1);
    expect(sleeps[0]).toBeGreaterThan(REPLY_READ_BACK_MS - 50);
    expect(sleeps[0]).toBeLessThanOrEqual(REPLY_READ_BACK_MS);
    expect(w.events.filter((e) => e.kind === 'control')).toHaveLength(2);
    expect(w.noteUserInput).not.toHaveBeenCalled();
  });

  it('a desk keystroke alone after the press is not an answer', async () => {
    const { w, question, mark } = pressWorld();
    w.after = null;
    w.core.control.sendCommand = (l: string) => {
      w.events.push({ kind: 'control', line: l });
      if (l.startsWith('send-keys')) w.turns.bump(SID, 'desk');
      return Promise.resolve([]);
    };
    expect(await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark, marker: '1' }, ALLOWED)).toEqual({
      outcome: 'failed',
      sentence: REPLY_NOT_TAKEN
    });
  });

  it('the agent\'s own hook since the press is an answer, even over the same window — and the hook spoke for the status', async () => {
    const { w, question, mark } = pressWorld();
    w.after = null;
    w.core.control.sendCommand = (l: string) => {
      w.events.push({ kind: 'control', line: l });
      if (l.startsWith('send-keys')) w.turns.hook(SID, null, null);
      return Promise.resolve([]);
    };
    expect(await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark, marker: '1' }, ALLOWED)).toEqual({
      outcome: 'done'
    });
    expect(w.noteUserInput).not.toHaveBeenCalled();
  });

  it('answered with nothing else moving the id: the desk\'s own funnel, once', async () => {
    const { w, question, mark } = pressWorld();
    await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark, marker: '1' }, ALLOWED);
    expect(w.noteUserInput).toHaveBeenCalledTimes(1);
    expect(w.noteUserInput).toHaveBeenCalledWith(SID);
  });

  it('answered and the agent drew the next question: done, and no release of the NEXT question (R11)', async () => {
    const { w, question, mark } = pressWorld();
    // The agent took the digit and drew the next question: the read-back
    // screen holds a different choice, and the tick that saw it moved the id.
    w.after = plainFixture('claude-bash-2.1.287.txt').replace('4. No', '4. No, and tell Claude');
    w.core.control.sendCommand = (l: string) => {
      w.events.push({ kind: 'control', line: l });
      w.acted = true;
      if (l.startsWith('send-keys')) w.turns.bump(SID, 'choice-moved');
      return Promise.resolve([]);
    };
    expect(await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark, marker: '1' }, ALLOWED)).toEqual({
      outcome: 'done'
    });
    expect(w.noteUserInput).not.toHaveBeenCalled();
  });

  it('answered and the same choice still drawn (an identical next question): no release', async () => {
    const { w, question, mark } = pressWorld();
    w.after = plainFixture('claude-bash-2.1.287.txt').replace('Waiting…', 'Running…');
    expect(await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark, marker: '1' }, ALLOWED)).toEqual({
      outcome: 'done'
    });
    expect(w.noteUserInput).not.toHaveBeenCalled();
  });

  it('THE FIX ROUND\'S CASE: the tick saw the dialog go during the read-back, so the id moved, and the release still runs', async () => {
    // Both real agents go from a declined question straight to idle with no
    // hook, the state machine refuses needs_input to idle, and a session at
    // needs_input is captured on every tick: the tick that lands inside the
    // 300 ms read-back answers `gone` and bumps the id. Skipping the release
    // there left the Mac at needs input with nothing on the phone to clear it.
    for (const cause of ['choice-gone', 'status'] as const) {
      const { w, question, mark } = pressWorld();
      w.core.control.sendCommand = (l: string) => {
        w.events.push({ kind: 'control', line: l });
        w.acted = true;
        if (l.startsWith('send-keys')) w.turns.bump(SID, cause);
        return Promise.resolve([]);
      };
      expect(await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark, marker: '4' }, ALLOWED)).toEqual({
        outcome: 'done'
      });
      expect(w.noteUserInput, cause).toHaveBeenCalledTimes(1);
      expect(w.noteUserInput).toHaveBeenCalledWith(SID);
    }
  });

  it('a hook since the press, over a screen with no choice: done, and the hook spoke for the status', async () => {
    const { w, question, mark } = pressWorld();
    w.core.control.sendCommand = (l: string) => {
      w.events.push({ kind: 'control', line: l });
      w.acted = true;
      // Claude approved, ran the command and asked the NEXT question through
      // its hook before drawing it: the read-back screen has no choice yet.
      if (l.startsWith('send-keys')) w.turns.hook(SID, 'Bash ls', 'whole');
      return Promise.resolve([]);
    };
    expect(await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark, marker: '1' }, ALLOWED)).toEqual({
      outcome: 'done'
    });
    expect(w.noteUserInput).not.toHaveBeenCalled();
  });

  it('a read-back that cannot be read says the answer was typed and nothing more', async () => {
    const { w, question, mark } = pressWorld();
    let captures = 0;
    w.onRun = (a) => {
      if (a[0] === 'capture-pane') {
        captures += 1;
        if (captures === 2) w.failVerb.add('capture-pane');
      }
    };
    expect(await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark, marker: '1' }, ALLOWED)).toEqual({
      outcome: 'failed',
      sentence: REPLY_TYPED_UNREAD
    });
  });

  it('a mark that moved, or a window that changed, is an answer', async () => {
    const { w, question, mark } = pressWorld();
    w.after = plainFixture('claude-bash-2.1.287.txt').replace('4. No', '4. No, and tell Claude');
    expect(await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark, marker: '1' }, ALLOWED)).toEqual({
      outcome: 'done'
    });
    const second = pressWorld();
    second.w.after = plainFixture('claude-bash-2.1.287.txt').replace('Waiting…', 'Running…');
    expect(
      await createReplyVerbs(depsOf(second.w)).choose({ sessionId: SID, question: second.question, mark: second.mark, marker: '1' }, ALLOWED)
    ).toEqual({ outcome: 'done' });
  });

  it('an error whose text is a canary never reaches an outcome', async () => {
    const { w, question, mark } = pressWorld();
    w.failControl.add('send-keys');
    const outcome = await createReplyVerbs(depsOf(w)).choose({ sessionId: SID, question, mark, marker: '1' }, ALLOWED);
    expect(JSON.stringify(outcome)).not.toContain('CANARY');
    const thrown = pressWorld();
    thrown.w.core.listSessions = () => {
      throw new Error('CANARY listSessions');
    };
    const t = await createReplyVerbs(depsOf(thrown.w)).choose({ sessionId: SID, question: thrown.question, mark: thrown.mark, marker: '1' }, ALLOWED);
    expect(t).toEqual({ outcome: 'failed', sentence: REPLY_FAILED });
  });

  it('no core yet: could not type', async () => {
    const verbs = createReplyVerbs({ ...depsOf(world()), core: () => null });
    expect(await verbs.choose({ sessionId: SID, question: 'x', mark: 'y', marker: '1' }, ALLOWED)).toEqual({
      outcome: 'failed',
      sentence: REPLY_FAILED
    });
  });
});

describe('say: the message', () => {
  it('loads the words on standard input, then ONE paste list into the reading\'s pane, and deletes nothing after a paste', async () => {
    const w = sayWorld();
    const text = 'hello phone; -R ls -la; /exit !touch x\nsecond line';
    expect(await createReplyVerbs(depsOf(w)).say({ sessionId: SID, text }, ALLOWED)).toEqual({ outcome: 'done' });
    const all = runs(w);
    const load = w.events.find((e) => e.kind === 'run' && e.args[0] === 'load-buffer');
    expect(load).toBeDefined();
    if (load?.kind !== 'run') throw new Error('no load-buffer');
    expect(load.stdin).toBe(text);
    const name = load.args[2] ?? '';
    expect(name).toMatch(/^tortie-say-[0-9a-f]{32}$/);
    expect(load.args).toEqual(['load-buffer', '-b', name, '-']);
    expect(all.at(-1)).toEqual([
      'copy-mode', '-q', '-t', PANE_ID, ';',
      'paste-buffer', '-p', '-d', '-b', name, '-t', PANE_ID, ';',
      'send-keys', '-t', PANE_ID, 'Enter'
    ]);
    expect(all.filter((a) => a[0] === 'delete-buffer')).toEqual([]);
    // The words reach stdin and nothing else: no argv element holds them or any piece of them.
    for (const args of all) for (const arg of args) expect(text.includes(arg) && arg.length > 2, arg).toBe(false);
    expect(w.noteUserInput).not.toHaveBeenCalled();
  });

  it('the buffer before the reading, the reading\'s capture last, then the id, the hook and the paste (D10, Y5)', async () => {
    const w = sayWorld('codex');
    const n0 = w.turns.current(SID).n;
    await createReplyVerbs(depsOf(w)).say({ sessionId: SID, text: 'hi' }, ALLOWED);
    const kinds = w.events.map((e) => (e.kind === 'run' ? `run:${e.args[0] ?? ''}` : e.kind));
    expect(kinds).toEqual([
      'run:load-buffer',
      'run:list-panes',
      'proc',
      'command',
      'native',
      'run:display-message',
      'run:capture-pane',
      'lastCheck',
      'run:copy-mode'
    ]);
    expect(w.turns.current(SID).n).toBeGreaterThan(n0);
  });

  it('two messages never share a buffer name', async () => {
    const w = sayWorld();
    const verbs = createReplyVerbs(depsOf(w));
    await verbs.say({ sessionId: SID, text: 'one' }, ALLOWED);
    await verbs.say({ sessionId: SID, text: 'two' }, ALLOWED);
    const names = runs(w).filter((a) => a[0] === 'load-buffer').map((a) => a[2]);
    expect(new Set(names).size).toBe(2);
  });

  it('the text rules answer first, with their own words, and nothing is run', async () => {
    const w = sayWorld();
    const verbs = createReplyVerbs(depsOf(w));
    expect(await verbs.say({ sessionId: SID, text: '' }, ALLOWED)).toEqual({ outcome: 'refused', reason: 'empty', sentence: REPLY_TEXT_EMPTY });
    expect(await verbs.say({ sessionId: SID, text: 'a'.repeat(4097) }, ALLOWED)).toEqual({ outcome: 'refused', reason: 'long', sentence: REPLY_TEXT_LONG });
    expect(await verbs.say({ sessionId: SID, text: `x${String.fromCharCode(0x1b)}[201~` }, ALLOWED)).toEqual({
      outcome: 'refused',
      reason: 'character',
      sentence: REPLY_TEXT_CHARACTER
    });
    expect(w.events).toEqual([]);
  });

  it('the gate: gone, unsayable on a waiting row, another machine or a shell — nothing run', async () => {
    const REMOTE = { id: 'popos', label: 'pop-os' } as unknown as NonNullable<ReturnType<typeof session>['machine']>;
    for (const [row, expected] of [
      [session({ status: 'needs_input' }), { outcome: 'refused', reason: 'unsayable', sentence: REPLY_NOT_READY }],
      [session({ status: 'idle', machine: REMOTE }), { outcome: 'refused', reason: 'unsayable', sentence: REPLY_NOT_READY }],
      [session({ status: 'idle', agent: 'shell' }), { outcome: 'refused', reason: 'unsayable', sentence: REPLY_NOT_READY }]
    ] as const) {
      const w = sayWorld();
      w.core.sessions = [row];
      expect(await createReplyVerbs(depsOf(w)).say({ sessionId: SID, text: 'hi' }, ALLOWED)).toEqual(expected);
      expect(w.events).toEqual([]);
    }
    const gone = sayWorld();
    gone.core.sessions = [];
    gone.records.clear();
    expect(await createReplyVerbs(depsOf(gone)).say({ sessionId: SID, text: 'hi' }, ALLOWED)).toEqual({
      outcome: 'refused',
      reason: 'gone',
      sentence: SESSION_NOT_FOUND
    });
  });

  it('each final-check refusal pastes nothing and deletes the buffer (R15, R17, D14)', async () => {
    const unsayable = { outcome: 'refused', reason: 'unsayable', sentence: REPLY_NOT_READY };
    const arms: Array<[string, (w: World) => void, unknown?]> = [
      ['the door stopped', () => undefined, { outcome: 'refused', reason: 'stopped', sentence: POCKET_WRITE_SENTENCES.stopped }],
      ['the agent works (R15)', (w) => {
        w.native = { state: 'working', tier: 'native' };
      }],
      ['a draft at the prompt', (w) => {
        w.screen.styled = styledFixture('claude-prompt-draft-2.1.287.ansi');
      }],
      ['a draft typed at the Mac during the reading', (w) => {
        w.onRun = (a) => {
          if (a[0] === 'capture-pane') w.turns.bump(SID, 'desk');
        };
      }],
      ['the session replaced during the reading', (w) => {
        w.onRun = (a) => {
          if (a[0] === 'capture-pane') w.tmuxIds.set(SID, '$9');
        };
      }],
      ['the row started waiting during the reading', (w) => {
        w.onRun = (a) => {
          if (a[0] === 'capture-pane') w.core.sessions = [session({ status: 'needs_input' })];
        };
      }],
      ['the agent left the terminal', (w) => {
        w.proc = CHILD_HOLDS;
        w.command = 'zsh';
      }],
      ['the capture failed', (w) => {
        w.failVerb.add('capture-pane');
      }]
    ];
    for (const [name, arrange, expected] of arms) {
      const w = sayWorld();
      arrange(w);
      const still = name === 'the door stopped' ? (): boolean => false : ALLOWED;
      const nBefore = w.turns.current(SID).n;
      expect(await createReplyVerbs(depsOf(w)).say({ sessionId: SID, text: 'hi there' }, still), name).toEqual(expected ?? unsayable);
      const all = runs(w);
      expect(all.filter((a) => a[0] === 'copy-mode' || a[0] === 'paste-buffer'), name).toEqual([]);
      expect(w.events.filter((e) => e.kind === 'lastCheck'), name).toEqual([]);
      const name0 = all.find((a) => a[0] === 'load-buffer')?.[2];
      expect(all.at(-1), name).toEqual(['delete-buffer', '-b', name0]);
      if (!name.startsWith('a draft typed')) expect(w.turns.current(SID).n, name).toBe(nBefore);
    }
  });

  it('a Codex prompt whose cursor is not after the glyph is not ready', async () => {
    const w = sayWorld('codex');
    w.cursor = '13\t9\n';
    expect(await createReplyVerbs(depsOf(w)).say({ sessionId: SID, text: 'hi' }, ALLOWED)).toEqual({
      outcome: 'refused',
      reason: 'unsayable',
      sentence: REPLY_NOT_READY
    });
  });

  it('a load-buffer or paste list tmux refuses is "could not type", and the buffer is deleted', async () => {
    for (const verb of ['load-buffer', 'copy-mode']) {
      const w = sayWorld();
      w.failVerb.add(verb);
      const outcome = await createReplyVerbs(depsOf(w)).say({ sessionId: SID, text: 'CANARY words' }, ALLOWED);
      expect(outcome, verb).toEqual({ outcome: 'failed', sentence: REPLY_FAILED });
      expect(runs(w).at(-1)?.[0], verb).toBe('delete-buffer');
      expect(JSON.stringify(outcome)).not.toContain('CANARY');
    }
  });

  it('a delete-buffer that fails is swallowed: the answer still says what happened', async () => {
    const w = sayWorld();
    w.native = { state: 'working', tier: 'native' };
    w.failVerb.add('delete-buffer');
    expect((await createReplyVerbs(depsOf(w)).say({ sessionId: SID, text: 'hi' }, ALLOWED)).outcome).toBe('refused');
  });
});

describe('the offer through the writer', () => {
  it('delegates to the reader over the core it was built with, and reads the empty offer with no core', async () => {
    const w = sayWorld();
    const offer = await createReplyVerbs(depsOf(w)).offer(w.core.sessions[0] ?? session(), { question: null, choices: [] });
    expect(offer.canSay).toBe(true);
    const none = await createReplyVerbs({ ...depsOf(w), core: () => null }).offer(session(), { question: null, choices: [] });
    expect(none).toEqual({ question: null, mark: null, pressable: [], command: null, canSay: false });
  });
});
