/**
 * Phase 85 — the sentence a remote row's dot carries.
 *
 * WHAT THIS PHASE CHANGED IN THE RENDERER. One new sentence in
 * ../../machines/session-badge.ts, and one branch in `sessionTooltip` that draws it. Before
 * this phase a session on another machine had no second tooltip line at all,
 * because the line a session on this Mac uses says what a restart brings back
 * and Tortie refused to restart a remote session. The dot on that row was read
 * by people with nothing beside it saying how old it could be.
 *
 * WHY THE SENTENCE IS NOT BACK ON THE CREATE SHEET. Phase 87 deleted
 * `POLL_HONESTY`, which said the same two numbers before any session existed,
 * and ./create-copy.test.ts fails if that name returns. This phase does not
 * bring it back. It draws the corrected sentence where the dot is instead.
 *
 * The vitest environment is node, so these read pure functions. The store is
 * built while ../session-actions is imported, so the globals it reads are
 * stubbed before the dynamic import below, which is the shape
 * ./remote-row.test.tsx already uses.
 */

import { describe, expect, it, vi } from 'vitest';
import type { Session, SessionMachine } from '@shared/types';
import type { StatusVisual } from '../status';

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

const { sessionTooltip } = await import('../session-actions');
const { remoteStatusNote } = await import('../../machines/session-badge');

/** A machine that is answering, which is the case the note is drawn for. */
const STUDIO: SessionMachine = {
  id: 'studio',
  label: 'Studio',
  color: 'green',
  answering: true,
  canRestore: true,
  restoreReason: null
};

/** The same machine while it is not answering. */
const STUDIO_QUIET: SessionMachine = { ...STUDIO, answering: false };

/** What every surface passes for a working row. */
const WORKING: StatusVisual = { dot: 'working', label: 'Working' };

function sess(over: Partial<Session>): Session {
  return {
    id: 'sess-1',
    name: 'auth',
    tmuxName: 'auth',
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude',
    status: 'running',
    createdAt: 0,
    ...over
  };
}

/**
 * The words the vocabulary audit in ./machine-vocabulary.test.ts forbids,
 * written out again here so this sentence is checked on its own rather than
 * only as one literal inside a file sweep.
 */
const FORBIDDEN: readonly string[] = [
  'tmux',
  'pane',
  'prefix',
  'socket',
  'ssh',
  'sshd',
  'known_hosts',
  'ControlMaster',
  'BatchMode',
  'attach-session',
  'new-session',
  'kill-session',
  'rename-session',
  'list-sessions',
  '-L gmux'
];

describe('the note a remote row carries', () => {
  it('says both cadences and the one thing the dot cannot say, byte for byte', () => {
    // Pinned in full. The two numbers are the reason the sentence exists, and a
    // later round that changes a cadence has to change this line as well.
    expect(remoteStatusNote('Studio')).toBe(
      'Tortie asks Studio what its sessions are doing every 5 seconds while a ' +
        'Tortie window is in front, and every 30 seconds when none is. A ' +
        'session on another machine never says it needs input, because Tortie ' +
        'works that out from files on this Mac.'
    );
  });

  it('names no word from the transport layer', () => {
    const note = remoteStatusNote('Studio').toLowerCase();
    const found = FORBIDDEN.filter((word) => note.includes(word.toLowerCase()));
    expect(found).toEqual([]);
  });
});

describe('the tooltip for a session on another machine', () => {
  it('draws the note on the second line while the machine is answering', () => {
    const tip = sessionTooltip(sess({ machine: STUDIO }), WORKING, undefined, 0);
    const lines = tip.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe(remoteStatusNote('Studio'));
  });

  it('draws no second line while the machine is not answering', () => {
    // The badge beside the row already says the machine did not answer, and a
    // promise to ask it every 5 seconds beside that badge would be false.
    const tip = sessionTooltip(
      sess({ machine: STUDIO_QUIET }),
      WORKING,
      undefined,
      0
    );
    expect(tip.split('\n')).toHaveLength(1);
  });
});

describe('the tooltip for a session on this Mac', () => {
  it('still carries the resume sentence and none of the new one', () => {
    const tip = sessionTooltip(
      sess({ resumeArgv: ['claude', '--resume', 'abc'] }),
      WORKING,
      undefined,
      0
    );
    const lines = tip.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('Its conversation comes back after a restart.');
    expect(tip).not.toContain('every 5 seconds');
  });
});
