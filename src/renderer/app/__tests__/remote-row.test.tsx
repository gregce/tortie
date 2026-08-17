/**
 * Phase 70 — the refusal a person can see, on a row that lives on another
 * machine.
 *
 * Main refuses Restore and Restart for a remote id, and a refusal a person
 * only meets after pressing the button teaches them the menu lies. So the
 * verbs are not offered at all, and the words that would have been under the
 * button say what is coming instead.
 *
 * What these tests hold:
 * - A remote row's menu offers neither Restore nor Restart, at every status.
 * - A remote row's `Show what it loaded…` is offered disabled, with the reason
 *   under it, because there is no launch snapshot on this Mac for a session
 *   created somewhere else.
 * - The ended surface draws RESTORE_COMING for a remote row, whatever else is
 *   true of that row.
 * - A LOCAL row's menu is unchanged at every status. That is the regression
 *   this file exists for: everything above is a branch added to code that four
 *   surfaces share.
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
const { NO_SNAPSHOT, RESTORE_COMING } = await import('../machine-copy');

const STUDIO: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'green',
  answering: true
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
  it('offers neither Restore nor Restart, at every status', () => {
    for (const status of EVERY_STATUS) {
      const labels = labelsOf(
        sessionMenuItems(sess({ status, machine: STUDIO }), 'x')
      );
      expect(labels, `status ${status}`).not.toContain('Restore');
      expect(labels, `status ${status}`).not.toContain('Restart');
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
    // Phase 67's own rule first: an unknown row gets exactly two verbs.
    expect(labelsOf(sessionMenuItems(sess({ status: 'unknown' }), 'x'))).toEqual(
      ['Show what it loaded…', 'Copy directory path']
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
  it('says what is coming for a row on another machine, in every combination', () => {
    const session = sess({ machine: STUDIO });
    for (const fastDeath of [true, false]) {
      for (const exited of [true, false]) {
        for (const canRestore of [true, false]) {
          expect(
            endedBodyText({
              session,
              remote: true,
              fastDeath,
              exited,
              // Nothing offers Restore for a remote row, but the branch is
              // proven to outrank it even if something did.
              offersRestore: true,
              canRestore
            })
          ).toBe(RESTORE_COMING);
        }
      }
    }
    expect(RESTORE_COMING).toBe(
      'Bringing a session back on another machine is coming in a later ' +
        'release. Tortie will not offer it here until it can prove what came ' +
        'back.'
    );
  });

  it('draws exactly what it drew before for a row on this Mac', () => {
    const session = sess({});
    expect(
      endedBodyText({
        session,
        remote: false,
        fastDeath: false,
        exited: true,
        offersRestore: false,
        canRestore: true
      })
    ).toBe('Restarting opens a fresh session with the same name and directory.');
    expect(
      endedBodyText({
        session,
        remote: false,
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
      const text = endedBodyText({ session, remote: false, ...args });
      expect(text.length).toBeGreaterThan(0);
      expect(text).not.toBe(RESTORE_COMING);
    }
  });
});
