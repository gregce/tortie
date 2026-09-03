/**
 * A finished sign in says it finished (Phase 203).
 *
 * The operator reported a sign in that "doesn't login". It had succeeded, and
 * the sign in session ending is the flow working: it runs one vendor command
 * that exits. What was missing was the sentence. This file holds the shape of
 * that sentence and the two things it must not do, being fire before the
 * session has been seen at all, and fire twice.
 *
 * NOTHING HERE OPENS A BRIDGE. `useLogins.load()` finds no preload under the
 * node environment and leaves the held list alone, which is what lets these
 * tests stage a list and read the sentence composed from it.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LoginRow } from '@shared/logins';
import { defaultLoginRow } from '@shared/logins';
import { useLogins } from '../logins';
import {
  SIGN_IN_WATCH_MAX_MS,
  forgetSignInWatches,
  pendingSignInCount,
  settleSignIns,
  watchSignIn
} from '../sign-in-watch';

const T0 = 1_800_000_000_000;

function stage(rows: LoginRow[]): void {
  useLogins.setState({ snapshot: { logins: rows, problems: [], at: T0 } });
}

function said(): { say: (k: 'success' | 'info', t: string) => void; lines: string[] } {
  const lines: string[] = [];
  return { lines, say: (kind, text) => lines.push(`${kind}: ${text}`) };
}

beforeEach(() => {
  forgetSignInWatches();
  stage([defaultLoginRow('claude', true, true, null)]);
});

afterEach(() => {
  forgetSignInWatches();
});

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('settleSignIns', () => {
  it('says the login is signed in when the session lands on restorable', async () => {
    stage([
      defaultLoginRow('claude', true, true, null),
      {
        provider: 'claude',
        name: 'Work',
        isDefault: false,
        chosen: false,
        present: true,
        email: 'work@example.com',
        kept: false,
        restores: false
      }
    ]);
    const { say, lines } = said();
    watchSignIn('s1', 'claude', 'Work', T0);
    // The session is running. Nothing is said.
    settleSignIns([{ id: 's1', status: 'running' }], say, T0 + 1_000);
    await flush();
    expect(lines).toEqual([]);
    // THE ROUTE A FINISHED SIGN IN REALLY TAKES: `remain-on-exit failed`
    // closes the pane and the session together, so reconcile settles it and
    // the status is `restorable` rather than `exited`.
    settleSignIns([{ id: 's1', status: 'restorable' }], say, T0 + 2_000);
    await flush();
    expect(lines).toEqual(['success: Signed in on Work as work@example.com.']);
    expect(pendingSignInCount()).toBe(0);
  });

  it('says nothing was written when no credential appeared', async () => {
    stage([
      defaultLoginRow('claude', true, true, null),
      {
        provider: 'claude',
        name: 'Work',
        isDefault: false,
        chosen: false,
        present: false,
        email: null,
        kept: false,
        restores: false
      }
    ]);
    const { say, lines } = said();
    watchSignIn('s1', 'claude', 'Work', T0);
    settleSignIns([{ id: 's1', status: 'exited' }], say, T0 + 1);
    await flush();
    expect(lines).toEqual(['info: Work is still not signed in. Nothing was written.']);
  });

  it('says it once, however many lists arrive after', async () => {
    const { say, lines } = said();
    watchSignIn('s1', 'claude', 'Default', T0);
    settleSignIns([{ id: 's1', status: 'exited' }], say, T0 + 1);
    settleSignIns([{ id: 's1', status: 'exited' }], say, T0 + 2);
    settleSignIns([], say, T0 + 3);
    await flush();
    expect(lines).toHaveLength(1);
  });

  it('does not read a list that predates the session as the end of it', async () => {
    const { say, lines } = said();
    watchSignIn('s1', 'claude', 'Work', T0);
    // A create resolves before the list holding the new session does, so a
    // list that arrives in between does not hold the id. Reading that as a
    // finished sign in would post the sentence a second after the browser
    // opened.
    settleSignIns([], say, T0 + 10);
    settleSignIns([{ id: 'other', status: 'running' }], say, T0 + 20);
    await flush();
    expect(lines).toEqual([]);
    expect(pendingSignInCount()).toBe(1);
    // Once it HAS been seen, its disappearance is the end of it.
    settleSignIns([{ id: 's1', status: 'running' }], say, T0 + 30);
    settleSignIns([], say, T0 + 40);
    await flush();
    expect(lines).toHaveLength(1);
  });

  it('drops a sign in nobody completed, without a word', async () => {
    const { say, lines } = said();
    watchSignIn('s1', 'claude', 'Work', T0);
    settleSignIns([{ id: 's1', status: 'running' }], say, T0 + 1);
    settleSignIns(
      [{ id: 's1', status: 'running' }],
      say,
      T0 + SIGN_IN_WATCH_MAX_MS + 1
    );
    await flush();
    expect(lines).toEqual([]);
    expect(pendingSignInCount()).toBe(0);
  });

  it('costs nothing at all when no sign in is being watched', () => {
    const { say, lines } = said();
    settleSignIns([{ id: 'a', status: 'exited' }], say, T0);
    expect(lines).toEqual([]);
  });
});
