/**
 * One fresh reading, and the offer composed over it (Phase 318,
 * build/p318/SPEC.md §5.4.2, §5.4.5, D13, D14, D18; §Revision R1, R15, R17,
 * R19), over a fake core, a recording runner and a fake process table, with the
 * REAL screens of build/fixtures/reply as what the capture returns.
 */

import { describe, expect, it } from 'vitest';
import { POCKET_NO_REPLY } from '@shared/ipc/pocket';
import type { SessionChoiceInfo } from '@shared/ipc/sessions';
import { choiceMarkOf } from '../../activity/monitor';
import { PANE_FORMAT } from '../../activity/panes';
import { composeQuestion, questionFromHookBody } from '../../activity/question';
import { detectDialogRows, hashScreen, normalizeCapture } from '../../activity/screen';
import { hookBashOf } from '../hook-says';
import {
  CURSOR_FORMAT,
  canSayOver,
  choiceMarkOfRows,
  readReply,
  replyMarkOf,
  replyOffer,
  type ReplyOfferDeps
} from '../reader';
import { hookBodies, plainFixture, styledFixture } from './fixtures';
import {
  CHILD_HOLDS,
  PANE_ID,
  SID,
  TMUX_ID,
  depsOf,
  runs,
  session,
  world,
  type Drawn,
  type World
} from './harness';

function offerDeps(w: World): ReplyOfferDeps {
  const d = depsOf(w);
  return {
    run: (args) => d.run(args),
    readProc: d.readProc,
    readCommand: d.readCommand,
    nativeReadingOf: (...a) => w.core.activity.nativeReadingOf(...a),
    turns: w.turns,
    tmuxIdOf: (id) => w.core.tmuxIdOf(id)
  };
}

/** What the door would draw of a screen, from the same two sources the monitor composes. */
function drawnOf(plain: string, hookAsk: string | null): Drawn {
  const rows = detectDialogRows(normalizeCapture(plain));
  return { question: composeQuestion(hookAsk, rows.question), choices: rows.atChoice ? rows.options : [] };
}

/** A world at the real Claude Bash prompt, its PermissionRequest hooked, the dialog appeared. */
function claudeAtPrompt(index = 0): { w: World; drawn: Drawn } {
  const w = world();
  const body = hookBodies()[index] ?? '';
  const asked = questionFromHookBody(body);
  w.turns.hook(SID, asked, asked === null ? null : hookBashOf(body, asked));
  w.turns.bump(SID, 'choice-appeared');
  const files = ['claude-bash-2.1.287.txt', 'claude-bash-multiline-2.1.287.txt', 'claude-bash-long-2.1.287.txt', 'claude-bash-blank-line-2.1.287.txt'];
  w.screen.plain = plainFixture(files[index] ?? '');
  return { w, drawn: drawnOf(w.screen.plain, asked) };
}

/** A world at a real Codex approval. */
function codexAt(file: string): { w: World; drawn: Drawn } {
  const w = world({ session: session({ agent: 'codex' }), command: 'node /Users/someone/.local/bin/codex --no-daemon' });
  w.turns.bump(SID, 'choice-appeared');
  w.screen.plain = plainFixture(file);
  return { w, drawn: drawnOf(w.screen.plain, null) };
}

describe('readReply', () => {
  it('a press reads the pane, then who holds the terminal, then the screen LAST, plain, aimed at the pane', async () => {
    const { w } = claudeAtPrompt();
    const reading = await readReply(w.core.sessions[0] ?? session(), 'press', TMUX_ID, offerDeps(w));
    expect(w.events.map((e) => e.kind)).toEqual(['run', 'proc', 'command', 'run']);
    expect(runs(w)).toEqual([
      ['list-panes', '-t', TMUX_ID, '-F', PANE_FORMAT],
      ['capture-pane', '-p', '-t', PANE_ID]
    ]);
    expect(reading?.pane.paneId).toBe(PANE_ID);
    expect(reading?.tmuxId).toBe(TMUX_ID);
    expect(reading?.agentHolds).toBe(true);
    expect(reading?.screen).toBe(w.screen.plain);
    expect(reading?.native).toBeNull();
  });

  it('a Codex message reads the agent\'s own reader and tmux\'s cursor, then the styled screen LAST', async () => {
    const w = world({ session: session({ agent: 'codex', status: 'idle' }), command: 'node /x/.local/bin/codex' });
    w.screen.styled = styledFixture('codex-prompt-empty-0.160.0.ansi');
    const reading = await readReply(w.core.sessions[0] ?? session(), 'say', TMUX_ID, offerDeps(w));
    expect(w.events.map((e) => e.kind)).toEqual(['run', 'proc', 'command', 'native', 'run', 'run']);
    expect(runs(w)).toEqual([
      ['list-panes', '-t', TMUX_ID, '-F', PANE_FORMAT],
      ['display-message', '-p', '-t', PANE_ID, CURSOR_FORMAT],
      ['capture-pane', '-p', '-e', '-t', PANE_ID]
    ]);
    expect(CURSOR_FORMAT).toBe('#{cursor_x}\t#{cursor_y}');
    expect(reading?.cursor).toEqual({ x: 2, y: 9 });
    expect(reading?.native?.state).toBe('idle');
  });

  it('a Claude message reads no cursor', async () => {
    const w = world({ session: session({ status: 'idle' }) });
    w.screen.styled = styledFixture('claude-prompt-empty-2.1.287.ansi');
    const reading = await readReply(w.core.sessions[0] ?? session(), 'say', TMUX_ID, offerDeps(w));
    expect(runs(w).map((a) => a[0])).toEqual(['list-panes', 'capture-pane']);
    expect(reading?.cursor).toBeNull();
  });

  it('stops before the screen when the agent does not hold the terminal (D13)', async () => {
    const w = world({ proc: CHILD_HOLDS, command: '/bin/cat /tmp/fake-dialog.txt' });
    const reading = await readReply(w.core.sessions[0] ?? session(), 'press', TMUX_ID, offerDeps(w));
    expect(reading?.agentHolds).toBe(false);
    expect(reading?.screen).toBeNull();
    expect(w.events).toContainEqual({ kind: 'command', pid: 5000 });
    expect(runs(w).map((a) => a[0])).toEqual(['list-panes']);
  });

  it('a program whose ARGUMENT names the agent does not hold it (the gate\'s program-token rule)', async () => {
    const w = world({ command: 'tail -f /tmp/claude-screen' });
    const reading = await readReply(w.core.sessions[0] ?? session(), 'press', TMUX_ID, offerDeps(w));
    expect(reading?.agentHolds).toBe(false);
  });

  it('no process table, no command, or no foreground reads as not the agent', async () => {
    for (const over of [{ proc: null }, { command: null }]) {
      const w = world(over);
      const reading = await readReply(w.core.sessions[0] ?? session(), 'press', TMUX_ID, offerDeps(w));
      expect(reading?.agentHolds).toBe(false);
    }
  });

  it('stops before the screen when the agent\'s own reader is not idle (R15)', async () => {
    for (const state of ['working', 'needs_input', 'starting'] as const) {
      const w = world({ session: session({ status: 'running' }), native: { state, tier: 'native' } });
      const reading = await readReply(w.core.sessions[0] ?? session(), 'say', TMUX_ID, offerDeps(w));
      expect(reading?.screen, state).toBeNull();
      expect(runs(w).map((a) => a[0]), state).toEqual(['list-panes']);
    }
    const silent = world({ session: session({ status: 'idle' }), native: null });
    expect((await readReply(silent.core.sessions[0] ?? session(), 'say', TMUX_ID, offerDeps(silent)))?.screen).toBeNull();
  });

  it('a Codex cursor that cannot be read stops the message reading', async () => {
    for (const cursor of ['', 'x\ty', '2 9', '2\t9\t1']) {
      const w = world({ session: session({ agent: 'codex', status: 'idle' }), command: 'codex', cursor });
      const reading = await readReply(w.core.sessions[0] ?? session(), 'say', TMUX_ID, offerDeps(w));
      expect(reading?.screen, JSON.stringify(cursor)).toBeNull();
    }
  });

  it('a pane that cannot be listed, is missing, or is dead reads nothing', async () => {
    const failing = world();
    failing.failVerb.add('list-panes');
    expect(await readReply(failing.core.sessions[0] ?? session(), 'press', TMUX_ID, offerDeps(failing))).toBeNull();
    const other = world();
    expect(await readReply(other.core.sessions[0] ?? session(), 'press', '$99', offerDeps(other))).toBeNull();
    expect(failing.events.filter((e) => e.kind === 'proc')).toHaveLength(0);
  });

  it('a capture that fails reads as no screen', async () => {
    const { w } = claudeAtPrompt();
    w.failVerb.add('capture-pane');
    const reading = await readReply(w.core.sessions[0] ?? session(), 'press', TMUX_ID, offerDeps(w));
    expect(reading?.screen).toBeNull();
  });
});

describe('the offer: a press', () => {
  it('a hooked Claude Bash prompt whose command is said offers every option, under the id and the reply\'s mark', async () => {
    const { w, drawn } = claudeAtPrompt(0);
    const offer = await replyOffer(w.core.sessions[0] ?? session(), drawn, offerDeps(w));
    const rows = detectDialogRows(normalizeCapture(w.screen.plain));
    expect(offer).toEqual({
      question: w.turns.current(SID).id,
      mark: hashScreen(JSON.stringify([choiceMarkOf({ atChoice: true, options: rows.options }, rows.question ?? ''), ''])),
      pressable: ['1', '2', '3', '4'],
      command: null,
      canSay: false
    });
    expect(offer.question).toMatch(/^[0-9a-f]{16}-[1-9][0-9]*$/);
  });

  it('a command not said whole offers only No', async () => {
    for (const index of [1, 2, 3]) {
      const { w, drawn } = claudeAtPrompt(index);
      const offer = await replyOffer(w.core.sessions[0] ?? session(), drawn, offerDeps(w));
      expect(offer.pressable, String(index)).toEqual(['4']);
    }
  });

  it('a Codex approval offers its command and covers it in the mark', async () => {
    const { w, drawn } = codexAt('codex-approval-0.160.0.txt');
    const offer = await replyOffer(w.core.sessions[0] ?? session(), drawn, offerDeps(w));
    const rows = detectDialogRows(normalizeCapture(w.screen.plain));
    expect(offer.pressable).toEqual(['1', '2', '3']);
    expect(offer.command).toBe('touch p318-one.txt');
    expect(offer.mark).toBe(replyMarkOf(rows, 'touch p318-one.txt'));
  });

  it('two Codex approvals with one choice mark and different $ lines give two reply marks (R19 c)', async () => {
    const one = codexAt('codex-approval-no-reason-0.160.0.txt');
    const twoScreen = one.w.screen.plain.replace('  $ touch p318-plain.txt\n', '  $ touch p318-plain.txt.bak\n');
    const two = codexAt('codex-approval-no-reason-0.160.0.txt');
    two.w.screen.plain = twoScreen;
    const rowsOne = detectDialogRows(normalizeCapture(one.w.screen.plain));
    const rowsTwo = detectDialogRows(normalizeCapture(twoScreen));
    expect(choiceMarkOfRows(rowsOne)).toBe(choiceMarkOfRows(rowsTwo));
    const a = await replyOffer(one.w.core.sessions[0] ?? session(), one.drawn, offerDeps(one.w));
    const b = await replyOffer(two.w.core.sessions[0] ?? session(), drawnOf(twoScreen, null), offerDeps(two.w));
    expect(a.command).toBe('touch p318-plain.txt');
    expect(b.command).toBe('touch p318-plain.txt.bak');
    expect(a.mark).not.toBe(b.mark);
  });

  it('is bound to what the same answer draws: another question or other options offer nothing (R1)', async () => {
    const { w, drawn } = claudeAtPrompt(0);
    const otherQuestion = { ...drawn, question: 'Bash touch p318-other.txt' };
    expect(await replyOffer(w.core.sessions[0] ?? session(), otherQuestion, offerDeps(w))).toEqual(POCKET_NO_REPLY);
    const fewer = { ...drawn, choices: drawn.choices.slice(0, 3) };
    expect(await replyOffer(w.core.sessions[0] ?? session(), fewer, offerDeps(w))).toEqual(POCKET_NO_REPLY);
    const renamed = { ...drawn, choices: drawn.choices.map((c, i) => (i === 1 ? { ...c, text: `${c.text}!` } : c)) };
    expect(await replyOffer(w.core.sessions[0] ?? session(), renamed, offerDeps(w))).toEqual(POCKET_NO_REPLY);
    const remarked = { ...drawn, choices: drawn.choices.map((c, i) => (i === 0 ? { ...c, marker: '9' } : c)) };
    expect(await replyOffer(w.core.sessions[0] ?? session(), remarked, offerDeps(w))).toEqual(POCKET_NO_REPLY);
  });

  it('an id that moves during the reading serves an empty offer, for each agent', async () => {
    const { w, drawn } = claudeAtPrompt(0);
    w.onRun = (args) => {
      if (args[0] === 'capture-pane') w.turns.bump(SID, 'desk');
    };
    expect(await replyOffer(w.core.sessions[0] ?? session(), drawn, offerDeps(w))).toEqual(POCKET_NO_REPLY);
    // Codex needs no hook, so nothing but the count can see the keystroke.
    const codex = codexAt('codex-approval-0.160.0.txt');
    codex.w.onRun = (args) => {
      if (args[0] === 'capture-pane') codex.w.turns.bump(SID, 'desk');
    };
    expect(await replyOffer(codex.w.core.sessions[0] ?? session(), codex.drawn, offerDeps(codex.w))).toEqual(POCKET_NO_REPLY);
  });

  it('a session never bumped (n = 0) is never offered', async () => {
    const w = world();
    w.screen.plain = plainFixture('codex-approval-0.160.0.txt');
    w.core.sessions = [session({ agent: 'codex' })];
    w.command = 'codex';
    const drawn = drawnOf(w.screen.plain, null);
    expect(await replyOffer(w.core.sessions[0] ?? session(), drawn, offerDeps(w))).toEqual(POCKET_NO_REPLY);
  });

  it('a foreground that is not the agent offers nothing, a non-agent dialog included (D13)', async () => {
    const { w, drawn } = claudeAtPrompt(0);
    w.proc = CHILD_HOLDS;
    w.command = '/bin/sh ./scripts/install.sh';
    w.screen.plain = plainFixture('non-agent-proceed-reconstructed.txt');
    expect(await replyOffer(w.core.sessions[0] ?? session(), drawnOf(w.screen.plain, drawn.question), offerDeps(w))).toEqual(
      POCKET_NO_REPLY
    );
  });

  it('a shape with nothing pressable offers nothing: no id or mark without a button', async () => {
    const { w } = claudeAtPrompt(1);
    w.screen.plain = w.screen.plain.replace('   4. No\n', '   4. Not now\n');
    const asked = questionFromHookBody(hookBodies()[1] ?? '');
    expect(await replyOffer(w.core.sessions[0] ?? session(), drawnOf(w.screen.plain, asked), offerDeps(w))).toEqual(
      POCKET_NO_REPLY
    );
  });

  it('a screen that is no measured shape offers nothing', async () => {
    const { w } = claudeAtPrompt(0);
    w.screen.plain = plainFixture('claude-edit.txt');
    expect(await replyOffer(w.core.sessions[0] ?? session(), drawnOf(w.screen.plain, null), offerDeps(w))).toEqual(
      POCKET_NO_REPLY
    );
  });

  it('the choice the offer marks is the monitor\'s own choice mark', () => {
    const rows = detectDialogRows(normalizeCapture(plainFixture('claude-bash-2.1.287.txt')));
    const choice: SessionChoiceInfo = { atChoice: true, options: rows.options };
    expect(choiceMarkOfRows(rows)).toBe(choiceMarkOf(choice, rows.question ?? ''));
    // Claude 2.1.287: the same mark for every command in one folder (R22).
    expect(choiceMarkOfRows(rows)).toBe(
      choiceMarkOfRows(detectDialogRows(normalizeCapture(plainFixture('claude-bash-multiline-2.1.287.txt'))))
    );
  });
});

describe('canSayOver: idle and only idle (R15)', () => {
  it('a reading that holds an empty prompt but whose agent works, or asks, is no box', () => {
    const empty = styledFixture('claude-prompt-empty-2.1.287.ansi');
    const base = {
      tmuxId: TMUX_ID,
      pane: { paneId: PANE_ID } as never,
      agentHolds: true,
      cursor: null,
      screen: empty
    };
    expect(canSayOver('claude', { ...base, native: { state: 'idle', tier: 'native' } })).toBe(true);
    for (const state of ['working', 'needs_input', 'starting'] as const) {
      expect(canSayOver('claude', { ...base, native: { state, tier: 'native' } }), state).toBe(false);
    }
    expect(canSayOver('claude', { ...base, native: null })).toBe(false);
    expect(canSayOver('claude', { ...base, native: { state: 'idle', tier: 'native' }, agentHolds: false })).toBe(false);
    expect(canSayOver('claude', { ...base, native: { state: 'idle', tier: 'native' }, screen: null })).toBe(false);
    expect(canSayOver('claude', null)).toBe(false);
  });
});

describe('the offer: a message', () => {
  const sayWorld = (agent: 'claude' | 'codex', file: string, over: Parameters<typeof world>[0] = {}): World => {
    const w = world({
      session: session({ agent, status: 'idle' }),
      command: agent === 'claude' ? 'claude' : 'node /x/codex',
      ...over
    });
    w.screen.styled = styledFixture(file);
    return w;
  };
  const NONE: Drawn = { question: null, choices: [] };

  it('the box at an idle agent\'s own empty prompt, for each agent', async () => {
    for (const [agent, file] of [
      ['claude', 'claude-prompt-empty-2.1.287.ansi'],
      ['claude', 'claude-prompt-empty-blurred-2.1.287.ansi'],
      ['codex', 'codex-prompt-empty-0.160.0.ansi']
    ] as const) {
      const w = sayWorld(agent, file);
      expect(await replyOffer(w.core.sessions[0] ?? session(), NONE, offerDeps(w)), file).toEqual({
        question: null,
        mark: null,
        pressable: [],
        command: null,
        canSay: true
      });
    }
  });

  it('no box while the agent works, over a draft, or with the agent not holding the terminal (R15)', async () => {
    const working = sayWorld('claude', 'claude-prompt-empty-2.1.287.ansi', { native: { state: 'working', tier: 'native' } });
    working.core.sessions = [session({ status: 'running' })];
    expect((await replyOffer(working.core.sessions[0] ?? session(), NONE, offerDeps(working))).canSay).toBe(false);
    const draft = sayWorld('claude', 'claude-prompt-draft-2.1.287.ansi');
    expect((await replyOffer(draft.core.sessions[0] ?? session(), NONE, offerDeps(draft))).canSay).toBe(false);
    const away = sayWorld('codex', 'codex-prompt-empty-0.160.0.ansi', { proc: CHILD_HOLDS, command: 'vim notes.md' });
    expect((await replyOffer(away.core.sessions[0] ?? session(), NONE, offerDeps(away))).canSay).toBe(false);
  });

  it('no box on a waiting row, and the press half is empty there when nothing is pressable', async () => {
    const w = sayWorld('claude', 'claude-prompt-empty-2.1.287.ansi');
    w.core.sessions = [session({ status: 'needs_input' })];
    const offer = await replyOffer(w.core.sessions[0] ?? session(), NONE, offerDeps(w));
    expect(offer.canSay).toBe(false);
  });

  it('a row on another machine, a shell, or no tmux id: the empty offer with nothing read', async () => {
    const REMOTE = { id: 'popos', label: 'pop-os' } as unknown as NonNullable<ReturnType<typeof session>['machine']>;
    for (const row of [session({ machine: REMOTE, status: 'idle' }), session({ agent: 'shell', status: 'idle' }), session({ status: 'exited' })]) {
      const w = world({ session: row });
      expect(await replyOffer(row, NONE, offerDeps(w))).toEqual(POCKET_NO_REPLY);
      expect(w.events).toEqual([]);
    }
    const noId = world({ session: session({ status: 'idle' }) });
    noId.tmuxIds.clear();
    expect(await replyOffer(noId.core.sessions[0] ?? session(), NONE, offerDeps(noId))).toEqual(POCKET_NO_REPLY);
    expect(noId.events).toEqual([]);
  });

  it('never rejects: a reader that throws reads the empty offer', async () => {
    const w = world({ session: session({ status: 'idle' }) });
    const deps = offerDeps(w);
    const throwing: ReplyOfferDeps = {
      ...deps,
      readProc: () => {
        throw new Error('CANARY ps');
      }
    };
    expect(await replyOffer(w.core.sessions[0] ?? session(), NONE, throwing)).toEqual(POCKET_NO_REPLY);
  });
});
