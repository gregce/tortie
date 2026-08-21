/**
 * PHASE 101. The renderer's one read of the folder Tortie may save under.
 *
 * WHY THE ANSWER LIVES ON THE LINK STATE. Main pushes the whole list on every
 * change, and the confirmation record is one of the three sources that fire it,
 * so this answer is never older than the last confirmation. The rejected
 * alternative was a field written into a tab when the tab was opened, and it is
 * rejected because it would be stale the moment a person turned saving on or
 * off in Settings. A tab open for an hour would then be read only after they
 * granted saving, or editable after they withdrew it.
 *
 * FOUR SURFACES READ IT, being the Explorer's note and its menu, the Explorer
 * header's two buttons, the editor's band, and the save itself. Every one of
 * them reads it through this function, so none of them can hold a different
 * answer from another.
 */

import { describe, expect, it } from 'vitest';
import { machineWriteRootFor } from '../machines-slice';
import type { MachineStateView } from '@shared/ipc';

function state(over: Partial<MachineStateView>): MachineStateView {
  return {
    id: 'studio',
    label: 'Studio',
    color: 'blue',
    link: 'connected',
    everAnswered: true,
    lastAnsweredAt: 0,
    detail: null,
    ...over
  };
}

describe('machineWriteRootFor', () => {
  it('answers the folder main sent', () => {
    expect(
      machineWriteRootFor([state({ writeRoot: '/Users/gdc' })], 'studio')
    ).toBe('/Users/gdc');
  });

  it('answers null for a machine that carries none', () => {
    expect(machineWriteRootFor([state({ writeRoot: null })], 'studio')).toBe(
      null
    );
  });

  it('answers null when main did not send the field at all', () => {
    // A build whose main is older than this phase sends no such field, and the
    // honest answer is that Tortie holds no statement about it. The default is
    // the safe direction: no saving.
    expect(machineWriteRootFor([state({})], 'studio')).toBe(null);
  });

  it('answers null for a machine with no row here', () => {
    expect(machineWriteRootFor([], 'studio')).toBe(null);
  });

  it('never reads the folder of one machine under another one', () => {
    const states = [
      state({ id: 'studio', writeRoot: '/Users/gdc' }),
      state({ id: 'mac-pro', label: 'mac-pro', writeRoot: null })
    ];
    expect(machineWriteRootFor(states, 'mac-pro')).toBe(null);
    expect(machineWriteRootFor(states, 'studio')).toBe('/Users/gdc');
  });
});
