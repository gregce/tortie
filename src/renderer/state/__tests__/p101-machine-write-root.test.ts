/**
 * PHASE 101, CARRIED BY PHASE 336. The folder a person typed in an earlier
 * build, as the renderer reads it.
 *
 * Phase 101's `machineWriteRootFor` answered one typed folder per machine and
 * nothing else. PHASE 336 REPLACED IT with `remoteWriteFolderIn`, which answers
 * the open project holding a path on a confirmed machine, and keeps that typed
 * folder as one more candidate, chosen first whenever it holds the path, so a
 * machine that carries one behaves exactly as it did. This file pins that
 * legacy half; `p336-write-folder-in.test.ts` pins the projects.
 *
 * WHY THE ANSWER STILL LIVES ON THE LINK STATE. Main pushes the whole list on
 * every change, and the confirmation record is one of the sources that fire it,
 * so this answer is never older than the last confirmation.
 */

import { describe, expect, it } from 'vitest';
import { remoteWriteFolderIn, writeFolderOf } from '../machines-slice';
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

const FILE = '/Users/gdc/code/api/src/auth.ts';

/** The folder for one file with no project open, from the typed folder alone. */
function folderFor(
  states: readonly MachineStateView[],
  machineId: string
): string | null {
  return writeFolderOf(remoteWriteFolderIn(states, [], machineId, FILE, 'file'));
}

describe('the typed folder of an earlier build', () => {
  it('answers the folder main sent, as a legacy folder', () => {
    expect(
      remoteWriteFolderIn(
        [state({ writeRoot: '/Users/gdc' })],
        [],
        'studio',
        FILE,
        'file'
      )
    ).toEqual({ folder: '/Users/gdc', kind: 'legacy' });
  });

  it('answers none for a machine that carries none and no open project', () => {
    expect(folderFor([state({ writeRoot: null, savesInProjects: true })], 'studio')).toBe(
      null
    );
  });

  it('reads a row with neither field as not confirmed', () => {
    // A build whose main is older than both fields sends neither, and the
    // honest answer is that Tortie holds no statement about it. The default is
    // the safe direction: no saving.
    expect(
      remoteWriteFolderIn([state({})], [], 'studio', FILE, 'file')
    ).toEqual({ refused: 'unconfirmed' });
  });

  it('answers not confirmed for a machine with no row here', () => {
    expect(remoteWriteFolderIn([], [], 'studio', FILE, 'file')).toEqual({
      refused: 'unconfirmed'
    });
  });

  it('never reads the folder of one machine under another one', () => {
    const states = [
      state({ id: 'studio', writeRoot: '/Users/gdc' }),
      state({ id: 'mac-pro', label: 'mac-pro', writeRoot: null })
    ];
    expect(folderFor(states, 'mac-pro')).toBe(null);
    expect(folderFor(states, 'studio')).toBe('/Users/gdc');
  });

  it('refuses a typed folder on a row main says is not confirmed', () => {
    // Main never sends both, and the renderer still fails closed if it did.
    expect(
      remoteWriteFolderIn(
        [state({ writeRoot: '/Users/gdc', savesInProjects: false })],
        [],
        'studio',
        FILE,
        'file'
      )
    ).toEqual({ refused: 'unconfirmed' });
  });
});
