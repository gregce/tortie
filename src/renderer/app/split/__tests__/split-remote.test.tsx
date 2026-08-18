/**
 * A split leaf whose session runs on another machine (Phase 84, items 1 and 2).
 *
 * WHAT WAS WRONG. This surface drew Restart for every leaf. The two other
 * surfaces that draw the same verb, `../../TerminalRegion.tsx` and
 * `../../session-actions.tsx`, have refused it for a session on another machine
 * since Phase 72, and this one was missed. Pressing it created the replacement
 * on this Mac and hard deleted the record of the one still running over there.
 *
 * WHAT IS PINNED HERE. The drawing rule, at every status, for a leaf on a
 * machine and for a leaf on this Mac. The regression half matters as much as
 * the fix: this is one branch in code every leaf goes through.
 *
 * The many session end confirm is pinned here too, because it is this surface's
 * menu. The words a person reads are asserted rather than the code that makes
 * them, which is what `./split-menu.test.ts` already does.
 *
 * The vitest environment is node, so this reads pure functions. What a person
 * sees is a screenshot read, not this file.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Session, SessionMachine, SessionStatus } from '@shared/types';

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {
    sessions: {
      restore: () => Promise.resolve({}),
      discard: () => Promise.resolve(),
      kill: () => Promise.resolve()
    },
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

const { splitLeafOffersRestart } = await import('../SplitSurface');
const { useApp } = await import('../../../state/store');
const { groupMenuItems } = await import('../split-menu');

const STUDIO: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'orange',
  answering: true,
  canRestore: true,
  restoreReason: null
};

const EVERY_STATUS: SessionStatus[] = [
  'running',
  'idle',
  'needs_input',
  'exited',
  'restorable'
];

function leaf(over: Partial<Session>): Session {
  return {
    id: `s-${Math.random().toString(36).slice(2)}`,
    name: 'auth',
    projectId: 'p1',
    cwd: '/tmp/p1',
    agent: 'claude',
    status: 'running',
    createdAt: 0,
    ...over
  } as Session;
}

describe('Restart in a split leaf', () => {
  it('is never drawn for a session on another machine, at any status', () => {
    for (const status of EVERY_STATUS) {
      for (const offersRestore of [true, false]) {
        expect(
          splitLeafOffersRestart(leaf({ status, machine: STUDIO }), offersRestore),
          `${status}, restore offered ${String(offersRestore)}`
        ).toBe(false);
      }
    }
  });

  it('is not drawn even when that machine is not answering', () => {
    const quiet: SessionMachine = { ...STUDIO, answering: false, canRestore: false };
    expect(splitLeafOffersRestart(leaf({ status: 'exited', machine: quiet }), false)).toBe(
      false
    );
  });

  it('is drawn for a session on this Mac exactly as it was before', () => {
    // The Phase 26.3 rule, unchanged: beside Restore on an ended leaf, and on
    // its own when Restore is not offered.
    expect(splitLeafOffersRestart(leaf({ status: 'exited' }), true)).toBe(true);
    expect(splitLeafOffersRestart(leaf({ status: 'exited' }), false)).toBe(true);
    expect(splitLeafOffersRestart(leaf({ status: 'restorable' }), true)).toBe(false);
    expect(splitLeafOffersRestart(leaf({ status: 'restorable' }), false)).toBe(true);
    expect(splitLeafOffersRestart(leaf({ status: 'running' }), false)).toBe(true);
  });
});

/** Open the group menu, press "End all sessions…", read the confirm back. */
function confirmBodyFor(members: Session[]): string {
  useApp.setState({ confirm: null } as never);
  const items = groupMenuItems(
    'p1',
    { id: 'surf', leafIds: members.map((m) => m.id) } as never,
    members,
    members[0]?.id ?? ''
  );
  const end = items.find((x) => x !== 'sep' && x.label === 'End all sessions…');
  if (end === undefined || end === 'sep') throw new Error('no end item');
  end.run();
  const confirm = useApp.getState().confirm;
  if (confirm === null) throw new Error('no confirm opened');
  return confirm.body;
}

describe('the many session end confirm, when one of them is on a machine', () => {
  it('promises a copy of what each one printed, and no conversation', () => {
    const body = confirmBodyFor([
      leaf({ name: 'auth', machine: STUDIO }),
      leaf({ name: 'billing' })
    ]);
    expect(body).toBe(
      "This stops what is running in 'auth', 'billing'. Tortie saves a copy " +
        'of what each one printed first, so you can read those copies here ' +
        'afterwards. A session on another machine does not bring its ' +
        'conversation back.'
    );
  });

  it('never promises a restore that brings a conversation back', () => {
    const body = confirmBodyFor([leaf({ name: 'auth', machine: STUDIO })]);
    expect(body).not.toContain('restore each session later');
    expect(body).not.toContain('conversations are saved');
  });

  it('names no transport word', () => {
    const body = confirmBodyFor([leaf({ name: 'auth', machine: STUDIO })]);
    for (const word of ['pane', 'window', 'prefix', 'socket', 'ssh', 'tmux']) {
      expect(body.toLowerCase()).not.toContain(word);
    }
  });

  it('leaves a group entirely on this Mac saying what it always said', () => {
    const body = confirmBodyFor([
      leaf({ name: 'auth', agent: 'shell', resumeCapture: 'none' }),
      leaf({ name: 'scratch', agent: 'shell', resumeCapture: 'none' })
    ]);
    expect(body).toBe(
      "This stops what is running in 'auth', 'scratch'. The scrollback is " +
        'saved first, so you can restore each session later.'
    );
  });
});
