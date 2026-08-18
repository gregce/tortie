/**
 * What a person reads when they end a session that runs on another machine, and
 * what they read when the copy Tortie promised was not written (Phase 84,
 * item 2).
 *
 * WHAT WAS WRONG. The end confirm said "The scrollback is saved first, so you
 * can restore this session later." It had no branch for a session on another
 * machine and both halves were false for one. Main took no copy at all before
 * it killed such a session, so the newest copy was whatever the two minute
 * cadence last took, and up to two minutes of the agent's work could be
 * missing. And a restore on another machine brings back the folder and the
 * program and never the conversation.
 *
 * Main now takes the copy before it kills anything, so "first" is true. These
 * tests pin the words, the same way `./notice.test.ts` pins toast sentences.
 * The ordering half is main's and is pinned in `npm run smoke:remote`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GmuxNotice } from '@shared/notice';
import type { Session, SessionMachine } from '@shared/types';

/** The two lines a toast really has, MEASURED in the running app, Phase 13.7. */
const TOAST_BUDGET = 58;

let onNoticeCb: ((notice: GmuxNotice) => void) | null = null;
let killed: string[] = [];

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {
    sessions: {
      list: () => Promise.resolve([]),
      kill: (id: string) => {
        killed.push(id);
        return Promise.resolve();
      },
      restore: () => Promise.resolve({}),
      discard: () => Promise.resolve(),
      onChanged() {},
      onStatusChanged() {}
    },
    projects: { list: () => Promise.resolve([]) },
    fs: {
      readFile: () => Promise.resolve({ contents: '' }),
      writeFile: () => Promise.resolve()
    },
    scrollback: {
      onNotice: (cb: (notice: GmuxNotice) => void) => {
        onNoticeCb = cb;
        return () => undefined;
      }
    },
    notice: { pending: () => Promise.resolve([]) },
    setSessionsPosition: () => Promise.resolve()
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

const { useApp } = await import('../store');

const STUDIO: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'orange',
  answering: true,
  canRestore: true,
  restoreReason: null
};

function session(over: Partial<Session>): Session {
  return {
    id: 'one',
    name: 'auth',
    projectId: 'p1',
    cwd: '/tmp/p1',
    agent: 'claude',
    status: 'running',
    createdAt: 0,
    ...over
  } as Session;
}

/** Press End on one session and read the confirm back. */
function confirmFor(one: Session): { title: string; body: string; label: string } {
  useApp.setState({ confirm: null, sessions: [one] } as never);
  useApp.getState().endSession(one.id);
  const confirm = useApp.getState().confirm;
  if (confirm === null) throw new Error('no confirm opened');
  return {
    title: confirm.title,
    body: confirm.body,
    label: confirm.confirmLabel ?? ''
  };
}

/** Run one notice through the store and read the toast it produced. */
function say(notice: GmuxNotice): string {
  useApp.setState({ toasts: [] } as never);
  onNoticeCb?.(notice);
  const toast = useApp.getState().toasts[0];
  if (toast === undefined) throw new Error('no toast');
  return toast.text;
}

beforeEach(async () => {
  killed = [];
  useApp.setState({ toasts: [], confirm: null } as never);
  if (onNoticeCb === null) await useApp.getState().boot();
});

describe('the end confirm for a session on another machine', () => {
  it('names the machine, promises the copy first, and withdraws the conversation', () => {
    const out = confirmFor(session({ machine: STUDIO }));
    expect(out.title).toBe("End 'auth'?");
    expect(out.body).toBe(
      'This stops what is running in it on Studio. Tortie saves a copy of ' +
        'what it printed first, so you can read that copy here afterwards. ' +
        'The conversation does not come back.'
    );
    expect(out.label).toBe('End session');
  });

  it('says it whatever the row claims about resuming', () => {
    const armed = session({
      machine: STUDIO,
      resumeCapture: 'armed',
      resumeArgv: ['claude', '--resume', 'x']
    } as Partial<Session>);
    expect(confirmFor(armed).body).toContain('The conversation does not come back.');
  });

  it('names no transport word', () => {
    const body = confirmFor(session({ machine: STUDIO })).body;
    for (const word of ['pane', 'window', 'prefix', 'socket', 'ssh', 'tmux']) {
      expect(body.toLowerCase()).not.toContain(word);
    }
  });

  it('leaves a session on this Mac saying what it always said', () => {
    expect(confirmFor(session({ agent: 'shell', resumeCapture: 'none' })).body).toBe(
      'This stops what is running in it. The scrollback is saved first, so ' +
        'you can restore this session later.'
    );
  });

  it('still ends the session when the person confirms', async () => {
    useApp.setState({ confirm: null, sessions: [session({ machine: STUDIO })] } as never);
    useApp.getState().endSession('one');
    useApp.getState().confirm?.onConfirm?.();
    await Promise.resolve();
    expect(killed).toEqual(['one']);
  });
});

describe('the toast when the end-time copy was not written', () => {
  it('for a session on another machine, offers no restore', () => {
    const text = say({
      kind: 'snapshot-failed',
      sessions: 1,
      outOfSpace: false,
      sessionName: 'auth',
      atSessionEnd: true,
      remote: true
    });
    expect(text).toBe('"auth" was not saved. Nothing more of it is here.');
    expect(text.length).toBeLessThanOrEqual(TOAST_BUDGET);
  });

  it('for a session on this Mac, is the Phase 26.3 sentence, unchanged', () => {
    expect(
      say({
        kind: 'snapshot-failed',
        sessions: 1,
        outOfSpace: false,
        sessionName: 'auth',
        atSessionEnd: true
      })
    ).toBe('"auth" was not saved. Restore resumes it.');
  });

  it('a full disk still names the cause first, remote or not', () => {
    expect(
      say({
        kind: 'snapshot-failed',
        sessions: 1,
        outOfSpace: true,
        sessionName: 'auth',
        atSessionEnd: true,
        remote: true
      })
    ).toBe('The disk is full. Your sessions are not being saved.');
  });
});
