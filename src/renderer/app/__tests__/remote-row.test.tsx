/**
 * Phase 70, rewritten by Phase 72 — the verbs a person is offered on a row
 * that lives on another machine.
 *
 * PHASE 70 offered neither Restore nor Restart for a remote row, because
 * nothing about such a row was written on this Mac. PHASE 72 writes a manifest
 * row and keeps saved output, so Restore is offered, and it is offered from ONE
 * fact main sends: `machine.canRestore`. Restart is still never offered,
 * because a restart ends a session and starts a new one and the ending half is
 * a verb aimed at another machine that this rung did not build.
 *
 * What these tests hold:
 * - A remote row's menu offers Restore when main says the verb holds, and never
 *   offers it when main says it does not, at every status.
 * - A remote row never offers Restart, at any status, whatever main says.
 * - A remote row's `Show what it loaded…` is offered disabled, with the reason
 *   under it, because there is no launch snapshot on this Mac for a session
 *   created somewhere else.
 * - The ended surface draws what Restore will do when it is offered, and main's
 *   own sentence when it is refused.
 * - A LOCAL row's menu is unchanged at every status. That is the regression
 *   this file exists for: everything above is a branch in code that four
 *   surfaces share, and `src/main/restore/restore.ts` did not move.
 *
 * The vitest environment is node, so this reads pure functions and static
 * markup. What a person sees is a Tier 3 screenshot read, not this file.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Session, SessionMachine, SessionStatus } from '@shared/types';

// The store reads window.gmux while zustand builds its initial state, so the
// globals have to exist before the modules under test are ever imported.
// `sessions.restore` and `sessions.discard` are present so canRestore() and
// canDiscard() answer true, which is what makes the local control cases below
// offer the verbs they are supposed to offer.
vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {
    sessions: {
      restore: () => Promise.resolve({}),
      discard: () => Promise.resolve()
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

const { sessionMenuItems } = await import('../session-actions');
const { endedBodyText } = await import('../TerminalRegion');
const { NO_SNAPSHOT, restoreNotOfferedBody, restoreRemoteBody } = await import(
  '../machine-copy'
);

/** A machine whose gate said yes for this row. */
const STUDIO: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'green',
  answering: true,
  canRestore: true,
  restoreReason: null
};

/** The same machine, with the gate refusing and saying why. */
const REFUSED_REASON =
  'Tortie cannot see that machine right now, so it will not try to bring ' +
  'this session back.';
const STUDIO_REFUSED: SessionMachine = {
  ...STUDIO,
  canRestore: false,
  restoreReason: REFUSED_REASON
};

/** Every status a session row can carry, so no branch is tested by luck. */
const EVERY_STATUS: readonly SessionStatus[] = [
  'running',
  'idle',
  'needs_input',
  'exited',
  'restorable',
  'unknown',
  'discarded'
];

function sess(over: Partial<Session>): Session {
  return {
    id: 'sess-1',
    name: 'auth',
    tmuxName: 'auth',
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude',
    status: 'exited',
    // Material to bring back, so the LOCAL control rows really do offer
    // Restore. Without it the local case would pass for the wrong reason.
    resumeArgv: ['claude', '--resume', 'abc'],
    hasSavedScrollback: true,
    createdAt: 0,
    ...over
  };
}

interface Item {
  label: string;
  disabled?: boolean;
  sublabel?: string;
}

function itemsOf(items: readonly (Item | 'sep')[]): Item[] {
  return items.filter((x): x is Item => x !== 'sep');
}

function labelsOf(items: readonly (Item | 'sep')[]): string[] {
  return itemsOf(items).map((x) => x.label);
}

// ---------------------------------------------------------------------------
// The menu
// ---------------------------------------------------------------------------

describe('the menu for a row on another machine', () => {
  it('never offers Restart, at every status, whatever main says', () => {
    for (const machine of [STUDIO, STUDIO_REFUSED]) {
      for (const status of EVERY_STATUS) {
        const labels = labelsOf(
          sessionMenuItems(sess({ status, machine }), 'x')
        );
        expect(labels, `status ${status}`).not.toContain('Restart');
      }
    }
  });

  it('offers Restore only when main says the verb holds', () => {
    for (const status of EVERY_STATUS) {
      const offered = labelsOf(
        sessionMenuItems(sess({ status, machine: STUDIO }), 'x')
      );
      const refused = labelsOf(
        sessionMenuItems(sess({ status, machine: STUDIO_REFUSED }), 'x')
      );
      // An `unknown` row keeps Phase 67's rule and gets no verb that acts on
      // a session at all, so Restore is absent there whatever the gate says.
      if (status === 'unknown') {
        expect(offered, `status ${status}`).not.toContain('Restore');
      } else {
        expect(offered, `status ${status}`).toContain('Restore');
      }
      expect(refused, `status ${status}`).not.toContain('Restore');
    }
  });

  it('still offers the verbs that are safe there', () => {
    const labels = labelsOf(
      sessionMenuItems(sess({ status: 'running', machine: STUDIO }), 'x')
    );
    expect(labels).toContain('Rename');
    expect(labels).toContain('Copy directory path');
    expect(labels).toContain('End session…');
  });

  it('offers the loaded readout disabled, with the reason under it', () => {
    const item = itemsOf(
      sessionMenuItems(sess({ status: 'running', machine: STUDIO }), 'x')
    ).find((x) => x.label === 'Show what it loaded…');
    expect(item).toBeDefined();
    expect(item?.disabled).toBe(true);
    expect(item?.sublabel).toBe(NO_SNAPSHOT);
    expect(NO_SNAPSHOT).toBe(
      'Tortie has no record of what this session loaded, because that ' +
        'record is only kept for sessions on this Mac.'
    );
  });
});

describe('the menu for a row on this Mac', () => {
  it('is unchanged at every status', () => {
    // Phase 67's own rule first: an unknown row gets only verbs that read
    // Tortie's own records. Phase 72 added a third one of those, being the
    // saved output panel, which reads one file on this Mac and sends nothing.
    expect(labelsOf(sessionMenuItems(sess({ status: 'unknown' }), 'x'))).toEqual(
      ['Show what it loaded…', 'Show saved output…', 'Copy directory path']
    );
    for (const status of ['exited', 'restorable'] as const) {
      const labels = labelsOf(sessionMenuItems(sess({ status }), 'x'));
      expect(labels, `status ${status}`).toContain('Restore');
      expect(labels, `status ${status}`).toContain('Restart');
      expect(labels, `status ${status}`).toContain('Remove');
    }
    for (const status of ['running', 'idle', 'needs_input'] as const) {
      const labels = labelsOf(sessionMenuItems(sess({ status }), 'x'));
      expect(labels, `status ${status}`).toEqual([
        'Rename',
        'Show what it loaded…',
        // Phase 72 added this one, for every row.
        'Show saved output…',
        'Copy directory path',
        'End session…'
      ]);
    }
  });

  it('leaves the loaded readout enabled and gives it no reason line', () => {
    const item = itemsOf(sessionMenuItems(sess({ status: 'running' }), 'x')).find(
      (x) => x.label === 'Show what it loaded…'
    );
    expect(item?.disabled).toBeUndefined();
    expect(item?.sublabel).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// The ended surface
// ---------------------------------------------------------------------------

describe('the ended surface', () => {
  it('says what Restore will do when the verb is offered, in every combination', () => {
    const session = sess({ machine: STUDIO });
    for (const fastDeath of [true, false]) {
      for (const exited of [true, false]) {
        for (const canRestore of [true, false]) {
          expect(
            endedBodyText({
              session,
              fastDeath,
              exited,
              offersRestore: true,
              canRestore
            })
          ).toBe(restoreRemoteBody('Studio'));
        }
      }
    }
    // The three claims, in the order a person needs them. PHASE 89 rewrote the
    // third one, because a remote restore brings some conversations back now
    // and this file cannot know which row will be one of them.
    expect(restoreRemoteBody('Studio')).toBe(
      'Restoring starts this session again on Studio, in the same folder. ' +
        'The output Tortie saved is kept on this Mac and is not put back on ' +
        'Studio. When Tortie recorded this conversation it types the command ' +
        'that continues it into the session and you press Enter, and ' +
        'otherwise the session comes back running the same program with no ' +
        'conversation.'
    );
  });

  it('draws main s own sentence when the verb is refused', () => {
    const session = sess({ machine: STUDIO_REFUSED });
    for (const fastDeath of [true, false]) {
      for (const exited of [true, false]) {
        expect(
          endedBodyText({
            session,
            fastDeath,
            exited,
            offersRestore: false,
            canRestore: true
          })
        ).toBe(REFUSED_REASON);
      }
    }
  });

  it('falls back to a true general sentence when main sent no reason', () => {
    // The projection should never produce this pair. The type allows it, so
    // the branch exists and says something true rather than nothing.
    const machine: SessionMachine = {
      ...STUDIO,
      canRestore: false,
      restoreReason: null
    };
    expect(
      endedBodyText({
        session: sess({ machine }),
        fastDeath: false,
        exited: true,
        offersRestore: false,
        canRestore: true
      })
    ).toBe(restoreNotOfferedBody('Studio'));
  });

  it('draws exactly what it drew before for a row on this Mac', () => {
    const session = sess({});
    expect(
      endedBodyText({
        session,
        fastDeath: false,
        exited: true,
        offersRestore: false,
        canRestore: true
      })
    ).toBe('Restarting opens a fresh session with the same name and directory.');
    expect(
      endedBodyText({
        session,
        fastDeath: false,
        exited: false,
        offersRestore: false,
        canRestore: false
      })
    ).toBe(
      'This session is saved but not running — restart it to pick up in the same directory.'
    );
    // The two that compose their sentence from the session say something, and
    // it is never the remote one.
    for (const args of [
      { fastDeath: true, exited: true, offersRestore: true, canRestore: true },
      { fastDeath: false, exited: true, offersRestore: true, canRestore: true },
      { fastDeath: false, exited: false, offersRestore: true, canRestore: true }
    ]) {
      const text = endedBodyText({ session, ...args });
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toBe(restoreRemoteBody('Studio'));
    }
  });
});
