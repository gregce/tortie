/**
 * The door a person reaches reconstruction through (Phase 20 fix round).
 *
 * These pin the words a person is shown and the decisions the door is allowed
 * to make. They do not open a dialog: `buildConfirmPrompt` and
 * `readyCandidates` are the whole decision, and `runOperatorReconstruction` is
 * the two `dialog.showMessageBox` calls around them.
 *
 * What is pinned here.
 *  - A candidate that needs facts nobody recorded is never included by this
 *    door, because a message box has nowhere to type them.
 *  - Cancel is button 0, so it is the default button and the escape key.
 *  - A person is told, in the box, that their current session list is not
 *    touched and that putting the rebuild in place is a separate step.
 *  - A running session that is not Tortie's is named as left alone.
 */

import { describe, expect, it, vi } from 'vitest';
import type { ReconstructionCandidate, ReconstructionPlan } from '../reconstruct';

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp/does-not-matter' },
  dialog: { showMessageBox: () => Promise.resolve({ response: 0 }) },
  shell: { showItemInFolder: () => undefined }
}));

const { buildConfirmPrompt, operatorDecidedBy, readyCandidates } = await import(
  '../reconstruct-operator'
);

function candidate(
  sessionId: string,
  decisionRequired: boolean
): ReconstructionCandidate {
  return {
    sessionId,
    identity: ['capsule'],
    recipe: null,
    capsules: null,
    scrollback: 'none',
    live: [],
    decisionRequired,
    notes: []
  };
}

function plan(overrides: Partial<ReconstructionPlan> = {}): ReconstructionPlan {
  return {
    token: 'token',
    at: 0,
    snapshotsDirectory: '/profile/gmux/snapshots',
    liveManifestPath: '/profile/gmux/manifest.db',
    liveManifestSessions: 0,
    candidates: [],
    unrecordedScrollback: [],
    foreign: [],
    tmuxReachable: true,
    ...overrides
  };
}

describe('what the door is willing to decide', () => {
  it('includes only candidates that need nothing more from a person', () => {
    const p = plan({
      candidates: [candidate('ready-1', false), candidate('needs-facts', true)]
    });
    expect(readyCandidates(p)).toEqual(['ready-1']);
  });

  it('offers no rebuild button when every candidate needs facts', () => {
    const prompt = buildConfirmPrompt(plan({ candidates: [candidate('a', true)] }));
    expect(prompt.confirmIndex).toBeNull();
    expect(prompt.buttons).toEqual(['OK']);
    expect(prompt.message).toBe('There is nothing to rebuild.');
    expect(prompt.detail).toContain('1 more sessions are left out');
  });

  it('puts Cancel first, so it is the default button and the escape key', () => {
    const prompt = buildConfirmPrompt(plan({ candidates: [candidate('a', false)] }));
    expect(prompt.buttons[0]).toBe('Cancel');
    expect(prompt.confirmIndex).toBe(1);
    expect(prompt.buttons[1]).toBe('Rebuild 1 Sessions');
  });

  it('says the current session list is not touched, and that placing it is separate', () => {
    const prompt = buildConfirmPrompt(plan({ candidates: [candidate('a', false)] }));
    expect(prompt.detail).toContain('Your current session list is not');
    expect(prompt.detail).toContain('separate step');
  });

  it('names the running sessions that are not ours as left alone', () => {
    const prompt = buildConfirmPrompt(
      plan({
        candidates: [candidate('a', false)],
        foreign: [{ tmuxId: '$9', tmuxName: 'someone-elses-work' }]
      })
    );
    expect(prompt.detail).toContain("1 running sessions are not Tortie's");
    expect(prompt.detail).toContain('no button here can change that');
    // The survey's own lines travel in the box, so the person sees the session.
    expect(prompt.detail).toContain('someone-elses-work');
  });

  it('warns when the live session list is not empty', () => {
    const prompt = buildConfirmPrompt(
      plan({ candidates: [candidate('a', false)], liveManifestSessions: 37 })
    );
    expect(prompt.detail).toContain('It holds 37 sessions');
  });

  it('records who decided, and marks the route', () => {
    expect(operatorDecidedBy()).toMatch(/\(Tortie menu\)$/);
    expect(operatorDecidedBy().trim().length).toBeGreaterThan(0);
  });
});
