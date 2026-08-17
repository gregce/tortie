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

const { badgeMachineOf, silentMachines } = await import('../machines-slice');

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
    expect(badge).toEqual({
      id: 'attic',
      label: 'Attic',
      color: 'green',
      answering: false
    });
  });
});
