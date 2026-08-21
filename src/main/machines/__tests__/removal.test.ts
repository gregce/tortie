/**
 * Phase 72, made one transaction in Phase 118. What `machines:remove` does on
 * this Mac, in order, and what it does when the record cannot be written.
 *
 * Three claims are checked, and they are the three that cost a person something
 * when they are wrong.
 *
 * THE ORDER. The tombstones carry the machine's label, and the label lives in
 * the file the caller is about to rewrite. So the write has to come first, and
 * the connection has to close after it rather than before, because a closed
 * connection is one more reason for the write to find nothing.
 *
 * ALL OR NONE. Before Phase 118 a per row failure was caught, logged and
 * stepped over, and `machines.json` was rewritten anyway. The tests below fail
 * the moment any line after the transaction can run when the transaction threw.
 *
 * THE REACH. The claim the rung makes is that removing a machine sends nothing
 * to it. A test that let the real exec plane through could only report that
 * nothing happened to be sent on that run. A test whose stand in set contains
 * no way to send anything proves the function has no route at all.
 *
 * The tombstone RECORD itself is built in `../remote-sessions`, and
 * `src/main/machines/__tests__/remote-sessions.test.ts` holds its fields. The
 * transaction itself is `../../manifest/sessions-repository.ts`'s, and its own
 * tests hold the rollback against a real database.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionStatus } from '@shared/types';
import type { MachineTombstoneEntry } from '../../manifest/sessions-repository';

/**
 * Everything the module under test can reach, recorded.
 *
 * `vi.hoisted` because the factories below are lifted above the imports, so
 * they cannot close over an ordinary `const`.
 */
const seam = vi.hoisted(() => ({
  /** Manifest rows, as `remoteRecordsForMachine` would answer. */
  records: [] as { id: string; status: SessionStatus }[],
  /** The plan `machineTombstonePlan` hands back. */
  plan: [] as { sessionId: string; tombstone: { machineId: string } }[],
  /** Set to a message to make the transaction throw. */
  transactionThrows: '' as string,
  /** Every call the module made, in order. */
  calls: [] as string[],
  /** Which row indexes the hooks were called for, when they were supplied. */
  hookRows: [] as number[]
}));

vi.mock('../remote-record', () => ({
  remoteRecordsForMachine: () => seam.records,
  tombstoneRemoteRows: (
    entries: readonly MachineTombstoneEntry[],
    hooks?: { beforeRow?: (index: number, entry: MachineTombstoneEntry) => void }
  ) => {
    seam.calls.push(`tombstone:${String(entries.length)}`);
    entries.forEach((entry, index) => {
      if (hooks?.beforeRow === undefined) return;
      seam.hookRows.push(index);
      hooks.beforeRow(index, entry);
    });
    if (seam.transactionThrows !== '') throw new Error(seam.transactionThrows);
    return entries.length;
  }
}));

vi.mock('../remote-sessions', () => ({
  machineTombstonePlan: (machineId: string, at: number) => {
    seam.calls.push(`plan:${machineId}:${String(at)}`);
    return seam.plan;
  },
  dropMachineRowsFromMemory: (machineId: string) => {
    seam.calls.push(`drop-rows:${machineId}`);
  }
}));

vi.mock('../remote-capsule', () => ({
  stopCapturingMachine: (machineId: string) => {
    seam.calls.push(`stop-capture:${machineId}`);
  }
}));

vi.mock('../control-plane', () => ({
  closeControlPlane: (machineId: string) => {
    seam.calls.push(`close-link:${machineId}`);
  }
}));

vi.mock('../store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../store')>()),
  removeMachineRow: (machineId: string) => {
    seam.calls.push(`remove-row:${machineId}`);
  }
}));

vi.mock('../confirm', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../confirm')>()),
  forgetMachine: (machineId: string) => {
    seam.calls.push(`forget-agreement:${machineId}`);
  }
}));

vi.mock('../context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../context')>()),
  forgetMachineRuntime: (machineId: string) => {
    seam.calls.push(`forget-runtime:${machineId}`);
  }
}));

const {
  MACHINE_REMOVAL_NOT_RECORDED,
  armRemovalFault,
  machineSessionCount,
  removeMachineCompletely
} = await import('../removal');
const { GmuxError } = await import('../../errors');

/** Five rows, which is the shape the harness proves the rollback over. */
function fivePlan(): { sessionId: string; tombstone: { machineId: string } }[] {
  return [1, 2, 3, 4, 5].map((n) => ({
    sessionId: `s${String(n)}`,
    tombstone: { machineId: 'studio' }
  }));
}

beforeEach(() => {
  seam.records = [];
  seam.plan = [];
  seam.transactionThrows = '';
  seam.calls = [];
  seam.hookRows = [];
  delete process.env['GMUX_SMOKE'];
});

describe('removeMachineCompletely', () => {
  it('records what Tortie knew before it lets go of anything', () => {
    seam.plan = fivePlan();
    removeMachineCompletely('studio', 9_000);
    expect(seam.calls).toEqual([
      'plan:studio:9000',
      'tombstone:5',
      'drop-rows:studio',
      'stop-capture:studio',
      'close-link:studio',
      'forget-runtime:studio',
      'remove-row:studio',
      'forget-agreement:studio'
    ]);
  });

  it('sends nothing to the machine, and says so with a number', () => {
    seam.plan = fivePlan();
    const out = removeMachineCompletely('studio', 9_000);
    expect(out).toEqual({ tombstoned: 5, commandsSent: 0 });
    // The stand in set is the proof. Nothing in it can reach the machine, so
    // the only calls that can appear above are the local ones.
    expect(seam.calls.some((one) => one.includes('exec'))).toBe(false);
  });

  it('still closes the machine down when it holds no session at all', () => {
    const out = removeMachineCompletely('studio', 9_000);
    expect(out.tombstoned).toBe(0);
    expect(seam.calls).toContain('remove-row:studio');
    expect(seam.calls).toContain('forget-agreement:studio');
  });

  it('stamps every tombstone from one instant', () => {
    // One removal is one moment. Reading the clock twice would let two rows
    // removed by one click carry two different removal times.
    removeMachineCompletely('studio', 1_234);
    expect(seam.calls[0]).toBe('plan:studio:1234');
  });
});

describe('a removal whose record cannot be written', () => {
  it('throws the sentence a person reads, with the code the bridge carries', () => {
    seam.plan = fivePlan();
    seam.transactionThrows = 'the disk is full';
    let thrown: unknown = null;
    try {
      removeMachineCompletely('studio', 9_000);
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(GmuxError);
    const payload = (thrown as InstanceType<typeof GmuxError>).payload;
    expect(payload.code).toBe('FS_FAILED');
    expect(payload.message).toBe(MACHINE_REMOVAL_NOT_RECORDED);
    // The underlying reason is carried, so a log names what really happened.
    expect(payload.detail ?? '').toContain('the disk is full');
  });

  it('removes NOTHING, and the machines file is never rewritten', () => {
    seam.plan = fivePlan();
    seam.transactionThrows = 'the disk is full';
    expect(() => removeMachineCompletely('studio', 9_000)).toThrow();
    // This is the whole of Phase 118's second item. Before it, every one of
    // these ran anyway and the person was left with a machine gone from their
    // list and no record of what it had held.
    expect(seam.calls).toEqual(['plan:studio:9000', 'tombstone:5']);
    expect(seam.calls).not.toContain('remove-row:studio');
    expect(seam.calls).not.toContain('drop-rows:studio');
    expect(seam.calls).not.toContain('forget-agreement:studio');
  });
});

describe('the harness fault seam', () => {
  it('refuses to arm outside a harness launch', () => {
    expect(() => armRemovalFault(3)).toThrow(/harness launch/);
  });

  it('supplies no hooks at all when nothing is armed', () => {
    process.env['GMUX_SMOKE'] = 'p118-verify';
    seam.plan = fivePlan();
    removeMachineCompletely('studio', 9_000);
    expect(seam.hookRows).toEqual([]);
  });

  it('throws before the nth row, counted from 1, and is one shot', () => {
    process.env['GMUX_SMOKE'] = 'p118-verify';
    seam.plan = fivePlan();
    armRemovalFault(3);
    expect(() => removeMachineCompletely('studio', 9_000)).toThrow(
      MACHINE_REMOVAL_NOT_RECORDED
    );
    // Rows 0, 1 and 2 were offered, and the third one threw. Nothing after it
    // was reached.
    expect(seam.hookRows).toEqual([0, 1, 2]);

    // The arm cleared itself, so the retry is the ordinary path.
    seam.calls = [];
    seam.hookRows = [];
    const out = removeMachineCompletely('studio', 9_000);
    expect(out.tombstoned).toBe(5);
    expect(seam.hookRows).toEqual([]);
    expect(seam.calls).toContain('remove-row:studio');
  });

  it('is disarmed by null', () => {
    process.env['GMUX_SMOKE'] = 'p118-verify';
    seam.plan = fivePlan();
    armRemovalFault(2);
    armRemovalFault(null);
    expect(removeMachineCompletely('studio', 9_000).tombstoned).toBe(5);
    expect(seam.hookRows).toEqual([]);
  });
});

describe('machineSessionCount', () => {
  it('counts the rows Tortie still holds for that machine', () => {
    seam.records = [
      { id: 's1', status: 'running' },
      { id: 's2', status: 'idle' }
    ];
    expect(machineSessionCount('studio')).toBe(2);
  });

  it('leaves out a row an earlier removal already tombstoned', () => {
    seam.records = [
      { id: 's1', status: 'running' },
      { id: 's2', status: 'discarded' }
    ];
    expect(machineSessionCount('studio')).toBe(1);
  });

  it('is 0 for a machine Tortie holds nothing for', () => {
    expect(machineSessionCount('studio')).toBe(0);
  });
});
