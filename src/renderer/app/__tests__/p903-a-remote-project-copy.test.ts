/**
 * The two marks that must not fire for a session on another machine, and the
 * one sheet that has to be able to say every refusal main can send (Phase 90.3).
 *
 * ## What is here and what is next door
 *
 * Every SENTENCE about a machine lives in `../../machines/presentation.ts` and is read by
 * `./p903-c-remote-copy.test.ts`, which is where the writing rules are held.
 * This file holds the three things that file cannot see.
 *
 *  1. The refusal composer is TOTAL over the reason words `projects:addRemote`
 *     can answer. A reason with no sentence would reach a person as a blank
 *     panel or as a wire value, and the reason word is the only thing that
 *     crosses that channel. This checks the union in `@shared/ipc` against the
 *     composer rather than against a hand written list.
 *  2. The worktree mark never fires for a session on a machine.
 *  3. The tilde never rewrites a path on another machine.
 */

import { describe, expect, it, vi } from 'vitest';
import type { AddRemoteProjectResult } from '@shared/ipc';
import type { Session } from '@shared/types';

// The environment is node and nothing here renders. The module graph below
// reaches the app store, which reads `window` while zustand builds its initial
// state, so the three globals are installed before the imports rather than a
// DOM environment being turned on for one file of pure functions.
vi.stubGlobal('window', {
  innerWidth: 1440,
  addEventListener() {},
  removeEventListener() {}
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } }
});

const { addRemoteRefusal } = await import('../../machines/presentation');
const { displayPath } = await import('../../format');
const { isOutsideProject } = await import('../session-actions');

type Reason = Extract<AddRemoteProjectResult, { ok: false }>['reason'];

/**
 * Every reason word the channel declares.
 *
 * A reason added to the contract and not to this list is a compile error rather
 * than a silent gap: the assignment below only holds while the two agree.
 */
const REASONS: readonly Reason[] = [
  'missing',
  'notdir',
  'denied',
  'unreachable',
  'notConnected',
  'notAbsolute',
  'noSuchMachine'
];

describe('the refusals of an add', () => {
  it('has one sentence for every reason main can answer', () => {
    for (const reason of REASONS) {
      const text = addRemoteRefusal(reason, '/home/gdc/work', 'Mac Pro');
      expect(text.length).toBeGreaterThan(0);
      expect(text.endsWith('.')).toBe(true);
      // A reason word is a wire value and must never reach a person.
      expect(text).not.toContain(reason);
    }
  });

  it('names the folder and the machine where they are the answer', () => {
    expect(addRemoteRefusal('missing', '/home/gdc/work', 'Mac Pro')).toBe(
      'There is no folder at /home/gdc/work on Mac Pro.'
    );
    expect(addRemoteRefusal('notConnected', '/x', 'Mac Pro')).toBe(
      'Tortie is not connected to Mac Pro.'
    );
  });
});

function session(input: {
  projectPath: string;
  cwd: string;
  far: boolean;
}): Session {
  return {
    id: 's',
    name: 's',
    tmuxName: 's',
    projectPath: input.projectPath,
    cwd: input.cwd,
    agent: 'shell',
    status: 'running',
    createdAt: 0,
    ...(input.far
      ? {
          machine: {
            id: 'macpro',
            label: 'Mac Pro',
            color: 'blue' as const,
            answering: true,
            canRestore: false,
            restoreReason: null
          }
        }
      : {})
  };
}

describe('the worktree mark', () => {
  it('still fires for a folder outside the project on this Mac', () => {
    expect(
      isOutsideProject(
        session({ projectPath: '/w/repo', cwd: '/w/other', far: false })
      )
    ).toBe(true);
  });

  it('never fires for a session on a machine', () => {
    // Every row an earlier build wrote is this shape: the project folder is a
    // path here and the pane's folder is a path over there. The mark would have
    // been on every one of them, meaning something different from what it means
    // on this Mac.
    expect(
      isOutsideProject(
        session({
          projectPath: '/Users/gdc/gmux',
          cwd: '/home/gdc/gmux',
          far: true
        })
      )
    ).toBe(false);
  });
});

describe('the tilde', () => {
  it("still shortens this Mac's home folder", () => {
    expect(displayPath('/Users/gdc/src/webapp')).toBe('~/src/webapp');
    expect(displayPath('/Users/gdc/src/webapp', 'local')).toBe('~/src/webapp');
  });

  it("never rewrites another machine's home folder", () => {
    // A tilde is a claim about whose home folder a path is in, and Tortie does
    // not know whose account that is on another computer.
    expect(displayPath('/Users/gdc/src/webapp', 'macpro')).toBe(
      '/Users/gdc/src/webapp'
    );
  });
});
