/**
 * Phase 71 — the renderer's copy of the machine link state.
 *
 * What these tests hold:
 * - Only a `quiet` machine counts as one Tortie could not reach. A machine
 *   nobody confirmed, and a machine whose sign in is still in flight, were
 *   never asked or have not failed, so neither may produce a sentence saying
 *   Tortie could not reach it.
 * - The badge's `answering` flag follows the link and nothing else.
 * - The slice replaces the whole list on every push, because main sends the
 *   whole list on every push.
 *
 * The sentences themselves are in ../../app/machine-copy and are covered by
 * the vocabulary audit and by a person reading them.
 */

import { describe, expect, it } from 'vitest';
import type { MachineLink, MachineStateView } from '@shared/ipc';

const { badgeMachineOf, machineAnswering, silentMachines } = await import(
  '../machines-slice'
);

function state(over: Partial<MachineStateView> & { link: MachineLink }): MachineStateView {
  return {
    id: 'studio',
    label: 'Studio',
    color: 'orange',
    everAnswered: false,
    lastAnsweredAt: null,
    detail: null,
    ...over
  };
}

describe('silentMachines', () => {
  it('is exactly the quiet machines', () => {
    const quiet = state({ link: 'quiet' });
    const rows = [
      state({ id: 'a', link: 'connected' }),
      state({ id: 'b', link: 'polling' }),
      state({ id: 'c', link: 'connecting' }),
      state({ id: 'd', link: 'refused' }),
      quiet
    ];
    expect(silentMachines(rows)).toEqual([quiet]);
  });

  it('never counts a machine nobody confirmed', () => {
    // A refused machine was never asked anything. Saying Tortie could not
    // reach it would be a claim about an attempt that never happened.
    expect(silentMachines([state({ link: 'refused' })])).toEqual([]);
  });

  it('never counts a sign in that is still in flight', () => {
    expect(silentMachines([state({ link: 'connecting' })])).toEqual([]);
  });

  it('is empty for a build with no machines at all', () => {
    expect(silentMachines([])).toEqual([]);
  });
});

describe('badgeMachineOf', () => {
  it('reads answering for a live connection and for the timer feed', () => {
    expect(badgeMachineOf(state({ link: 'connected' })).answering).toBe(true);
    expect(badgeMachineOf(state({ link: 'polling' })).answering).toBe(true);
  });

  it('reads not answering for everything else', () => {
    for (const link of ['quiet', 'connecting', 'refused'] as const) {
      expect(badgeMachineOf(state({ link })).answering).toBe(false);
    }
  });

  it('carries the label and the colour the badge draws', () => {
    const badge = badgeMachineOf(
      state({ id: 'attic', label: 'Attic', color: 'green', link: 'quiet' })
    );
    expect(badge).toMatchObject({
      id: 'attic',
      label: 'Attic',
      color: 'green',
      answering: false
    });
    // PHASE 72. This projection describes a MACHINE and not a session, so it
    // cannot answer whether one session may be brought back: two of the six
    // conditions behind that answer are facts about a row and there is no row
    // here. False with the machine's own sentence is the honest answer and the
    // safe one, because a surface reading it hides the verb.
    expect(badge.canRestore).toBe(false);
    // The machine's own sentence, whatever it is. This fixture states none, and
    // in production `machineDetailSentence` always writes one.
    expect(badge.restoreReason).toBe(
      state({ id: 'attic', label: 'Attic', color: 'green', link: 'quiet' }).detail
    );
  });
});

describe('machineAnswering (Phase 90.3 fix round)', () => {
  // The two crossing sidebars read this to decide whether one more read is
  // worth making. Only a machine that is actually up counts. `connecting` is
  // not up yet and would waste the one retry a sign in buys.
  const answers: [MachineLink, boolean][] = [
    ['connected', true],
    ['polling', true],
    ['connecting', false],
    ['quiet', false],
    ['refused', false]
  ];
  for (const [link, want] of answers) {
    it(`answers ${String(want)} for ${link}`, () => {
      expect(machineAnswering([state({ link })], 'studio')).toBe(want);
    });
  }

  it('answers false for a machine it holds no row for', () => {
    // Empty is the state at boot, before main's first push. False there means
    // the sidebars wait for a statement rather than acting on an absence.
    expect(machineAnswering([], 'studio')).toBe(false);
    expect(machineAnswering([state({ link: 'connected' })], 'other')).toBe(false);
  });

  it('agrees with the badge, which draws the same two words', () => {
    for (const [link, want] of answers) {
      expect(badgeMachineOf(state({ link })).answering).toBe(want);
    }
  });
});

/**
 * PHASE 109 — which agents each machine has, held beside the link state.
 */
describe('the machine agents answer (Phase 109)', () => {
  const view = (machineId: string): import('@shared/ipc').MachineAgentsView => ({
    machineId,
    askedAt: 5,
    agents: [{ agentId: 'claude', presence: 'absent', path: null }]
  });

  it('replaces the whole list on every apply, because main sends the whole list', async () => {
    const { createMachinesSlice } = await import('../machines-slice');
    let state: Record<string, unknown> = {};
    const slice = createMachinesSlice(
      ((partial: Record<string, unknown>) => {
        state = { ...state, ...partial };
      }) as never,
      (() => state) as never,
      {} as never
    );
    expect(slice.machineAgents).toEqual([]);
    slice.applyMachineAgents([view('studio')]);
    expect(state['machineAgents']).toEqual([view('studio')]);
    slice.applyMachineAgents([view('attic')]);
    expect(state['machineAgents']).toEqual([view('attic')]);
  });
});

describe('machineAgentsFor (Phase 109)', () => {
  const held: import('@shared/ipc').MachineAgentsView = {
    machineId: 'studio',
    askedAt: 5,
    agents: [{ agentId: 'claude', presence: 'present', path: '/usr/local/bin/claude' }]
  };

  it('is null for this Mac, in each of its three spellings', async () => {
    const { machineAgentsFor } = await import('../machines-slice');
    expect(machineAgentsFor([held], 'local')).toBeNull();
    expect(machineAgentsFor([held], null)).toBeNull();
    expect(machineAgentsFor([held], undefined)).toBeNull();
  });

  it('hands back the held view for a machine main has answered about', async () => {
    const { machineAgentsFor } = await import('../machines-slice');
    expect(machineAgentsFor([held], 'studio')).toBe(held);
  });

  it('hands back an all-unknown view, never null, for a machine nothing is held for', async () => {
    // Null would send the board back to this Mac's scan, which is defect row
    // 1. The all-unknown view greys nothing and names the machine.
    const { machineAgentsFor } = await import('../machines-slice');
    expect(machineAgentsFor([held], 'attic')).toEqual({
      machineId: 'attic',
      askedAt: null,
      agents: []
    });
    expect(machineAgentsFor([], 'studio')).toEqual({
      machineId: 'studio',
      askedAt: null,
      agents: []
    });
  });
});
