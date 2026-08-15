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
    await useApp.getState().boot();
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
    { kind: 'unclean-exit', newDumps: 3 }
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
