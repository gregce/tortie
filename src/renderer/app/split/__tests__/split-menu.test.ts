/**
 * The group tab menu's "End all sessions…" confirm (Phase 26.3 fix round).
 *
 * That confirm used to say the scrollback "will be discarded. This cannot be
 * undone." Its run() calls window.gmux.sessions.kill for every live member,
 * which is the same killSession that captures a snapshot capsule and keeps
 * each manifest row before it kills anything, so both halves of that sentence
 * became false when Phase 26.3 landed. This test pins the corrected copy the
 * same way notice.test.ts pins toast sentences: the words the user reads are
 * asserted, not the code that produces them.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Session } from '@shared/types';

function installGlobals(): void {
  vi.stubGlobal('window', {
    addEventListener() {},
    removeEventListener() {},
    gmux: {
      sessions: {
        list: () => Promise.resolve([]),
        kill: () => Promise.resolve(),
        onChanged() {},
        onStatusChanged() {}
      },
      projects: { list: () => Promise.resolve([]) },
      fs: {
        readFile: () => Promise.resolve({ contents: '' }),
        writeFile: () => Promise.resolve()
      },
      scrollback: { onNotice: () => () => undefined },
      notice: { pending: () => Promise.resolve([]) }
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

const { useApp } = await import('../../../state/store');
const { groupMenuItems } = await import('../split-menu');

function member(over: Partial<Session>): Session {
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

/** Open the group menu, click "End all sessions…", read back the confirm. */
function confirmBodyFor(members: Session[]): string {
  useApp.setState({ confirm: null } as never);
  const items = groupMenuItems(
    'p1',
    { id: 'surf', leafIds: members.map((m) => m.id) } as never,
    members,
    members[0]?.id ?? ''
  );
  const end = items.find(
    (x) => x !== 'sep' && x.label === 'End all sessions…'
  );
  if (end === undefined || end === 'sep') throw new Error('no end item');
  end.run();
  const confirm = useApp.getState().confirm;
  if (confirm === null) throw new Error('no confirm opened');
  return confirm.body;
}

describe('the group end confirm tells the truth about what survives', () => {
  it('never claims the scrollback is discarded or that ending cannot be undone', () => {
    const body = confirmBodyFor([
      member({ name: 'auth' }),
      member({ name: 'billing' })
    ]);
    expect(body).not.toContain('discarded');
    expect(body).not.toContain('cannot be undone');
  });

  it('promises the conversations only when every member can resume one', () => {
    const body = confirmBodyFor([
      member({ name: 'auth', resumeCapture: 'armed', resumeArgv: ['claude'] }),
      member({ name: 'billing', resumeCapture: 'armed', resumeArgv: ['pi'] })
    ]);
    expect(body).toBe(
      "This stops what is running in 'auth', 'billing'. The scrollback and " +
        'the conversations are saved first, so you can restore each session ' +
        'later.'
    );
  });

  it('a mixed group gets the scrollback-only promise, so it holds for each member', () => {
    const body = confirmBodyFor([
      member({ name: 'auth', resumeCapture: 'armed', resumeArgv: ['claude'] }),
      member({ name: 'scratch', agent: 'shell', resumeCapture: 'none' })
    ]);
    expect(body).toBe(
      "This stops what is running in 'auth', 'scratch'. The scrollback is " +
        'saved first, so you can restore each session later.'
    );
  });
});
