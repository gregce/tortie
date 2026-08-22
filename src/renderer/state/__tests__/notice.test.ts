/**
 * What the user actually reads when a durability layer is degraded
 * (Phase 19 item 9).
 *
 * Main sends the fact and the renderer writes the sentence, so this is where
 * the sentences are pinned. Two constraints are asserted rather than assumed.
 * A toast is clamped to two lines of about 29 characters beside its dismiss
 * button, MEASURED in the running app in Phase 13.7, so every line here is
 * checked against that budget. And the backlog that main queued before this
 * window existed must be drained exactly once, because the manifest integrity
 * check fires before there is anything to broadcast to.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DurabilityNotice, GmuxNotice } from '@shared/notice';

/** The two lines a toast really has. */
const TOAST_BUDGET = 58;

let onNoticeCb: ((notice: GmuxNotice) => void) | null = null;
let pending: DurabilityNotice[] = [];
let pendingCalls = 0;
let revealed: string[] = [];
let logFolderOpens = 0;

function installGlobals(): void {
  vi.stubGlobal('window', {
    addEventListener() {},
    removeEventListener() {},
    gmux: {
      sessions: {
        list: () => Promise.resolve([]),
        onChanged() {},
        onStatusChanged() {}
      },
      projects: { list: () => Promise.resolve([]) },
      fs: {
        readFile: () => Promise.resolve({ contents: '' }),
        writeFile: () => Promise.resolve(),
        reveal: (path: string) => {
          revealed.push(path);
          return Promise.resolve();
        }
      },
      scrollback: {
        onNotice: (cb: (notice: GmuxNotice) => void) => {
          onNoticeCb = cb;
          return () => undefined;
        }
      },
      notice: {
        pending: () => {
          pendingCalls += 1;
          return Promise.resolve(pending);
        }
      },
      log: {
        openFolder: () => {
          logFolderOpens += 1;
          return Promise.resolve();
        }
      }
    }
  });
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem() {},
    removeItem() {}
  });
  vi.stubGlobal('document', {
    body: { classList: { add() {}, remove() {}, contains: () => false } }
  });
}

installGlobals();

const { useApp } = await import('../store');
const { bootApp } = await import('../subscriptions');

/** Run the notice through the store and read back the toast it produced. */
function say(notice: GmuxNotice): { text: string; kind: string; action?: string } {
  useApp.setState({ toasts: [] } as never);
  onNoticeCb?.(notice);
  const toast = useApp.getState().toasts[0];
  if (toast === undefined) throw new Error('no toast');
  return {
    text: toast.text,
    kind: toast.kind,
    ...(toast.action !== undefined ? { action: toast.action.label } : {})
  };
}

beforeEach(() => {
  revealed = [];
  logFolderOpens = 0;
  useApp.setState({ toasts: [] } as never);
});

describe('the subscription exists at boot', () => {
  it('and the notice backlog is drained exactly once', async () => {
    pending = [{ kind: 'snapshot-repaired', sessionName: 'auth' }];
    await bootApp();
    expect(onNoticeCb).not.toBeNull();
    expect(pendingCalls).toBe(1);
    const texts = useApp.getState().toasts.map((t) => t.text);
    expect(texts.join('')).toContain('came back from an earlier save');
  });
});

describe('each degraded state says one plain thing', () => {
  it('a full disk names the cause, because that one can be cleared', () => {
    const out = say({ kind: 'snapshot-failed', sessions: 43, outOfSpace: true });
    expect(out.text).toBe('The disk is full. Your sessions are not being saved.');
    expect(out.kind).toBe('error');
  });

  it('a failure with another cause counts the sessions instead', () => {
    expect(
      say({ kind: 'snapshot-failed', sessions: 3, outOfSpace: false }).text
    ).toBe('3 sessions could not be saved.');
    expect(
      say({ kind: 'snapshot-failed', sessions: 1, outOfSpace: false }).text
    ).toBe('1 session could not be saved.');
  });

  it('an end-time failure names the session and what Restore still does', () => {
    // Phase 26.3: the end confirm promised "saved first", so this failure
    // does not hide behind the generic count. The sentence carries the
    // scrollback loss ("was not saved") and the half that still works
    // ("Restore resumes it").
    const out = say({
      kind: 'snapshot-failed',
      sessions: 1,
      outOfSpace: false,
      sessionName: 'auth',
      atSessionEnd: true
    });
    expect(out.text).toBe('"auth" was not saved. Restore resumes it.');
    expect(out.kind).toBe('error');
  });

  it('a full disk at session end still names the cause the user can clear', () => {
    expect(
      say({
        kind: 'snapshot-failed',
        sessions: 1,
        outOfSpace: true,
        sessionName: 'auth',
        atSessionEnd: true
      }).text
    ).toBe('The disk is full. Your sessions are not being saved.');
  });

  it('a repaired snapshot names the session and the loss', () => {
    const out = say({ kind: 'snapshot-repaired', sessionName: 'auth' });
    expect(out.text).toBe('"auth" came back from an earlier save.');
  });

  it('a quarantined manifest offers the file, because a file the user cannot find reads like a delete', () => {
    const out = say({
      kind: 'manifest-quarantined',
      quarantinePath: '/Users/x/manifest.db.damaged-1',
      recoveredAt: 1_700_000_000_000
    });
    expect(out.text).toBe('Session list damaged. It was rebuilt.');
    // The two-line clamp is the constraint, not a style choice. With the action
    // button beside it the text column measured 182 px, so a 57 character
    // sentence was cut off mid-word and the user never read the outcome.
    expect(out.text.length).toBeLessThanOrEqual(46);
    expect(out.action).toBe('Show the file');
    useApp.getState().toasts[0]?.action?.run();
    expect(revealed).toEqual(['/Users/x/manifest.db.damaged-1']);
  });

  it('and says plainly when there was nothing to recover', () => {
    expect(
      say({
        kind: 'manifest-quarantined',
        quarantinePath: '/tmp/x',
        recoveredAt: null
      }).text
    ).toBe('Session list damaged. None came back.');
  });

  it('a manifest that could not be READ is not called damaged', () => {
    const out = say({ kind: 'manifest-unreadable', path: '/Users/x/manifest.db' });
    expect(out.text).toBe('Tortie cannot read your session list.');
    expect(out.action).toBe('Show the file');
    useApp.getState().toasts[0]?.action?.run();
    expect(revealed).toEqual(['/Users/x/manifest.db']);
  });

  it('a restore that came back short says which half is missing', () => {
    expect(say({ kind: 'restore-shortfall', sessionName: 'auth', stage: 'both' }).text).toBe(
      '"auth" came back empty.'
    );
    expect(
      say({ kind: 'restore-shortfall', sessionName: 'auth', stage: 'scrollback' }).text
    ).toBe('"auth" lost its saved output.');
    expect(
      say({ kind: 'restore-shortfall', sessionName: 'auth', stage: 'resume' }).text
    ).toBe('"auth" came back without its agent.');
  });

  it('a shallow tmux server gives both numbers, not an adjective', () => {
    expect(
      say({ kind: 'depth-degraded', actualLines: 2000, requestedLines: 25_000 })
        .text
    ).toBe('Sessions are keeping 2,000 lines, not 25,000.');
  });

  it('an unfinished restore names the session that is still not back', () => {
    expect(
      say({ kind: 'restore-incomplete', sessionName: 'auth' }).text
    ).toBe('"auth" did not finish coming back.');
  });

  it('an unclean exit is quiet, and the details are behind the action', () => {
    // Phase 35. INFO and never error: the crash already happened, and the
    // sessions live in the tmux server. The second research sentence
    // ("Details are in the logs.") does not fit beside the first in 58
    // characters, so the action carries it.
    const out = say({ kind: 'unclean-exit', newDumps: 1 });
    expect(out.text).toBe('Tortie quit unexpectedly last time.');
    expect(out.kind).toBe('info');
    expect(out.action).toBe('View logs');
    useApp.getState().toasts[0]?.action?.run();
    expect(logFolderOpens).toBe(1);
  });

  it('an unclean exit with no dump reads the same, because the sentence is about the quit', () => {
    const out = say({ kind: 'unclean-exit', newDumps: 0 });
    expect(out.text).toBe('Tortie quit unexpectedly last time.');
    expect(out.kind).toBe('info');
  });

  it('a login shell that did not answer says what it costs, not what it was (Phase 81)', () => {
    // The sentence says the consequence rather than the mechanism. "Your
    // shell did not print its PATH" is not something a person can act on and
    // "agents may not start" is. The shell's own name is in the log, which is
    // where the action goes, because a path does not fit in a toast.
    const out = say({ kind: 'shell-path-fallback', shell: '/bin/zsh' });
    expect(out.text).toBe('Your shell did not answer. Agents may not start.');
    expect(out.kind).toBe('error');
    expect(out.action).toBe('View logs');
    useApp.getState().toasts[0]?.action?.run();
    expect(logFolderOpens).toBe(1);
  });

  it('a pane that started without one promised variable names it (Phase 33)', () => {
    const out = say({
      kind: 'env-unresolved',
      sessionId: 's1',
      sessionName: 'auth',
      names: ['FIREWORKS_API_KEY'],
      probeFailed: false
    });
    expect(out.text).toBe('"auth" started without FIREWORKS_API_KEY.');
    expect(out.kind).toBe('error');
    // No button, because there is nothing Tortie can run for the user. The
    // fix is in their own shell startup files.
    expect(out.action).toBeUndefined();
  });

  it('several missing variables become a count, because three names cannot fit', () => {
    const out = say({
      kind: 'env-unresolved',
      sessionId: 's1',
      sessionName: 'auth',
      names: ['A_NAME', 'B_NAME', 'C_NAME'],
      probeFailed: false
    });
    expect(out.text).toBe('"auth" started without 3 of its variables.');
    expect(out.kind).toBe('error');
  });

  it('a probe that failed or timed out says the variables did not arrive at all', () => {
    const out = say({
      kind: 'env-unresolved',
      sessionId: 's1',
      sessionName: 'auth',
      names: ['FIREWORKS_API_KEY'],
      probeFailed: true
    });
    expect(out.text).toBe('"auth" started without its shell variables.');
    expect(out.kind).toBe('error');
  });

  /**
   * PHASE 89. A session on another machine came back and Tortie typed the
   * command that continues its conversation into it without pressing Enter.
   * These three sentences are what a person reads when that did not land once.
   *
   * THE GOOD ANSWER HAS NO SENTENCE HERE AND NO KIND ON THE WIRE. A command
   * that landed exactly once is on the screen of that session, so nothing is
   * degraded and main sends nothing. That is asserted in
   * `src/main/sessions/__tests__/remote-resume-notice.test.ts`, which is where
   * the emitter lives.
   */
  it('two copies of the resume command say to clear the line first', () => {
    const out = say({
      kind: 'remote-resume',
      sessionName: 'auth',
      landing: 'twice'
    });
    expect(out.text).toBe('"auth" was typed twice. Clear the line.');
    expect(out.kind).toBe('error');
    // No button. What to press is in that session on the other machine, and
    // Tortie cannot press it from here.
    expect(out.action).toBeUndefined();
  });

  it('a resume that is not on the screen says the session came back without it', () => {
    const out = say({
      kind: 'remote-resume',
      sessionName: 'auth',
      landing: 'absent'
    });
    expect(out.text).toBe('"auth" came back without its resume.');
    expect(out.kind).toBe('error');
  });

  /**
   * "Could not look" is a different fact from "it is not there", and the two
   * sentences say two different things on purpose. Telling a person their
   * resume is missing when Tortie could not read the screen is the shape of
   * dishonesty the restore gate already split apart for the same reason.
   */
  it('a screen Tortie could not read says so rather than guessing', () => {
    const out = say({
      kind: 'remote-resume',
      sessionName: 'auth',
      landing: 'unknown'
    });
    expect(out.text).toBe('Tortie cannot read "auth" on that machine.');
    expect(out.kind).toBe('error');
  });

  it('none of the three carries a dash the writing rules refuse', () => {
    for (const landing of ['twice', 'absent', 'unknown'] as const) {
      const text = say({ kind: 'remote-resume', sessionName: 'auth', landing })
        .text;
      expect(text).not.toContain('\u2014');
      expect(text).not.toContain('\u2013');
    }
  });
});

/**
 * PHASE 118. A copy onto another machine was ended because the person quit.
 *
 * The path is NOT in the sentence. Two lines of about 26 characters beside the
 * action button have no room for a folder on another computer, so the path is
 * in the log and the action goes there. That is the same split the shell PATH
 * fallback notice already makes for the same reason.
 */
describe('a copy the quit cut off', () => {
  it('names the machine and says the person own quit ended it', () => {
    const out = say({
      kind: 'remote-work-cut-off',
      machineLabel: 'Studio',
      path: '/Users/gdc/gmux',
      count: 1
    });
    expect(out.text).toBe('The copy to "Studio" stopped when you quit.');
    expect(out.kind).toBe('error');
    expect(out.action).toBe('View logs');
    useApp.getState().toasts[0]?.action?.run();
    expect(logFolderOpens).toBe(1);
  });

  it('counts them when more than one was cut off', () => {
    const out = say({
      kind: 'remote-work-cut-off',
      machineLabel: 'Studio',
      path: '/Users/gdc/gmux',
      count: 3
    });
    expect(out.text).toBe('3 copies to machines stopped when you quit.');
  });

  // The budget is the TWO lines a toast has, not one line. The longest text
  // this notice can produce wraps onto the second line, which is what the box
  // is for. It is 53 characters against the 58 the two lines hold.
  it('fits the two lines with the longest label the shortener can produce', () => {
    const out = say({
      kind: 'remote-work-cut-off',
      machineLabel: 'a-machine-label-that-is-far-too-long',
      path: '/Users/gdc/gmux',
      count: 1
    });
    expect(out.text.length).toBe(53);
    expect(out.text.length).toBeLessThanOrEqual(TOAST_BUDGET);
    expect(out.text).toContain('…');
  });

  it('carries neither kind of dash', () => {
    for (const count of [1, 2]) {
      const text = say({
        kind: 'remote-work-cut-off',
        machineLabel: 'Studio',
        path: '/Users/gdc/gmux',
        count
      }).text;
      expect(text).not.toContain('\u2014');
      expect(text).not.toContain('\u2013');
    }
  });
});

describe('every line fits the toast it has to fit in', () => {
  const CASES: GmuxNotice[] = [
    { kind: 'snapshot-failed', sessions: 43, outOfSpace: true },
    { kind: 'snapshot-failed', sessions: 43, outOfSpace: false },
    {
      kind: 'snapshot-failed',
      sessions: 1,
      outOfSpace: false,
      sessionName: 'a-very-long-session-name',
      atSessionEnd: true
    },
    { kind: 'snapshot-repaired', sessionName: 'a-very-long-session-name' },
    {
      kind: 'manifest-quarantined',
      quarantinePath: '/tmp/x',
      recoveredAt: 1
    },
    { kind: 'manifest-quarantined', quarantinePath: '/tmp/x', recoveredAt: null },
    { kind: 'depth-degraded', actualLines: 2000, requestedLines: 25_000 },
    { kind: 'restore-incomplete', sessionName: 'a-very-long-session-name' },
    { kind: 'unclean-exit', newDumps: 3 },
    {
      kind: 'env-unresolved',
      sessionId: 's1',
      sessionName: 'a-very-long-session-name',
      names: ['FIREWORKS_API_KEY'],
      probeFailed: false
    },
    {
      kind: 'env-unresolved',
      sessionId: 's1',
      sessionName: 'a-very-long-session-name',
      names: ['A_NAME', 'B_NAME', 'C_NAME'],
      probeFailed: false
    },
    {
      kind: 'env-unresolved',
      sessionId: 's1',
      sessionName: 'a-very-long-session-name',
      names: ['FIREWORKS_API_KEY'],
      probeFailed: true
    },
    { kind: 'shell-path-fallback', shell: '/bin/zsh' },
    {
      kind: 'remote-resume',
      sessionName: 'a-very-long-session-name',
      landing: 'twice'
    },
    {
      kind: 'remote-resume',
      sessionName: 'a-very-long-session-name',
      landing: 'absent'
    },
    {
      kind: 'remote-resume',
      sessionName: 'a-very-long-session-name',
      landing: 'unknown'
    },
    {
      kind: 'remote-work-cut-off',
      machineLabel: 'a-machine-label-that-is-far-too-long',
      path: '/Users/gdc/a/very/long/path/on/another/computer',
      count: 1
    },
    {
      kind: 'remote-work-cut-off',
      machineLabel: 'a-machine-label-that-is-far-too-long',
      path: '/Users/gdc/a/very/long/path/on/another/computer',
      count: 12
    }
  ];

  for (const notice of CASES) {
    it(`${notice.kind} — ${JSON.stringify(notice).length} bytes in`, () => {
      expect(say(notice).text.length).toBeLessThanOrEqual(TOAST_BUDGET);
    });
  }

  it('a long session name is shortened rather than allowed to overflow', () => {
    const out = say({
      kind: 'snapshot-repaired',
      sessionName: 'this-name-is-far-too-long-for-a-toast'
    });
    expect(out.text).toContain('…');
  });
});

describe('the notices that were already there still work', () => {
  it('discarding', () => {
    expect(say({ kind: 'discarding', sessionName: 'auth' }).text).toBe(
      '"auth" is discarding old output.'
    );
  });

  it('disk-low', () => {
    expect(say({ kind: 'disk-low' }).text).toBe(
      'Low disk space. Sessions may not be saved when you quit.'
    );
  });
});
