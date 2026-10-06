/**
 * Phase 340, D24: a removed machine leaves nothing remembered.
 *
 * `./row-facts.ts` holds two facts per machine in memory (the last sign in and
 * the system name). `removeMachineCompletely` forgets them beside
 * `forgetRemoteMachineHome`, so a machine added again under the same id starts
 * with no chip from its previous life, and a removal that could not be recorded,
 * which removes nothing, keeps them.
 *
 * The same stand-ins `removal.test.ts` uses: nothing here opens the manifest,
 * reaches a machine or spawns anything.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const seam = vi.hoisted(() => ({
  plan: [] as { sessionId: string; tombstone: { machineId: string } }[],
  transactionThrows: ''
}));

vi.mock('../remote-record', () => ({
  remoteRecordsForMachine: () => [],
  tombstoneRemoteRows: (entries: readonly unknown[]) => {
    if (seam.transactionThrows !== '') throw new Error(seam.transactionThrows);
    return entries.length;
  }
}));
vi.mock('../remote-sessions', () => ({
  machineTombstonePlan: () => seam.plan,
  dropMachineRowsFromMemory: () => undefined
}));
vi.mock('../remote-capsule', () => ({ stopCapturingMachine: () => undefined }));
vi.mock('../control-plane', () => ({ closeControlPlane: () => undefined }));
vi.mock('../store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../store')>()),
  removeMachineRow: () => undefined
}));
vi.mock('../confirm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../confirm')>()),
  forgetMachine: () => undefined
}));
vi.mock('../context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../context')>()),
  forgetMachineRuntime: () => undefined
}));

const { removeMachineCompletely } = await import('../removal');
const facts = await import('../row-facts');

const PREPARED = {
  class: 'prepared' as const,
  version: '3.6a',
  headline: 'This machine is ready.',
  detail: 'Tortie started the program.'
};

beforeEach(() => {
  seam.plan = [];
  seam.transactionThrows = '';
  facts.resetRowFactsForTests();
});

describe('removing a machine forgets what the row remembered', () => {
  it('both facts go, for that machine only', () => {
    facts.noteRowSignIn('studio', PREPARED);
    facts.noteRowOs('studio', 'Darwin');
    facts.noteRowSignIn('other', PREPARED);
    facts.noteRowOs('other', 'Linux');
    removeMachineCompletely('studio', 9_000);
    expect(facts.rowSignInOf('studio')).toBeNull();
    expect(facts.rowOsOf('studio')).toBeNull();
    expect(facts.rowSignInOf('other')?.class).toBe('prepared');
    expect(facts.rowOsOf('other')).toBe('Linux');
  });

  it('the listener is told, so an open Settings window redraws', () => {
    facts.noteRowOs('studio', 'Darwin');
    let told = 0;
    const off = facts.onRowFactsChanged(() => {
      told += 1;
    });
    removeMachineCompletely('studio', 9_000);
    expect(told).toBe(1);
    off();
  });

  it('a removal that could not be recorded removes nothing, and keeps them', () => {
    seam.plan = [{ sessionId: 's1', tombstone: { machineId: 'studio' } }];
    seam.transactionThrows = 'the disk is full';
    facts.noteRowOs('studio', 'Darwin');
    expect(() => removeMachineCompletely('studio', 9_000)).toThrow();
    expect(facts.rowOsOf('studio')).toBe('Darwin');
  });
});
