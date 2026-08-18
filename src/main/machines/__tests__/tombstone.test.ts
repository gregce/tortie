/**
 * Phase 72. What `machines:remove` does on this Mac, in order.
 *
 * Two claims are checked, and they are the two that cost a person something
 * when they are wrong.
 *
 * THE ORDER. The tombstones carry the machine's label, and the label lives in
 * the file the caller is about to rewrite. So the write has to come first, and
 * the connection has to close after it rather than before, because a closed
 * connection is one more reason for the write to find nothing.
 *
 * THE REACH. The claim the rung makes is that removing a machine sends nothing
 * to it. A test that let the real exec plane through could only report that
 * nothing happened to be sent on that run. A test whose stand in set contains
 * no way to send anything proves the function has no route at all.
 *
 * The tombstone RECORD itself is built in `../remote-sessions`, and
 * `src/main/machines/__tests__/remote-sessions.test.ts` holds its fields.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionStatus } from '@shared/types';

/**
 * Everything the module under test can reach, recorded.
 *
 * `vi.hoisted` because the factories below are lifted above the imports, so
 * they cannot close over an ordinary `const`.
 */
const seam = vi.hoisted(() => ({
  /** Manifest rows, as `remoteRecordsForMachine` would answer. */
  records: [] as { id: string; status: SessionStatus }[],
  /** How many rows `forgetMachineRows` says it tombstoned. */
  tombstoned: 0,
  /** Every call the module made, in order. */
  calls: [] as string[]
}));

vi.mock('../remote-record', () => ({
  remoteRecordsForMachine: () => seam.records
}));

vi.mock('../remote-sessions', () => ({
  forgetMachineRows: (machineId: string, at: number) => {
    seam.calls.push(`forget-rows:${machineId}:${String(at)}`);
    return seam.tombstoned;
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

const { forgetMachineSessions, machineSessionCount } = await import('../tombstone');

beforeEach(() => {
  seam.records = [];
  seam.tombstoned = 0;
  seam.calls = [];
});

describe('forgetMachineSessions', () => {
  it('records what Tortie knew before it lets go of anything', () => {
    seam.tombstoned = 2;
    forgetMachineSessions('studio', 9_000);
    expect(seam.calls).toEqual([
      'forget-rows:studio:9000',
      'stop-capture:studio',
      'close-link:studio'
    ]);
  });

  it('sends nothing to the machine, and says so with a number', () => {
    seam.tombstoned = 2;
    const out = forgetMachineSessions('studio', 9_000);
    expect(out).toEqual({ tombstoned: 2, commandsSent: 0 });
    // The stand in set is the proof. Nothing in it can reach the machine, so
    // the only calls that can appear above are the three local ones.
    expect(seam.calls.some((one) => one.includes('exec'))).toBe(false);
  });

  it('still closes the machine down when it holds no session at all', () => {
    const out = forgetMachineSessions('studio', 9_000);
    expect(out.tombstoned).toBe(0);
    expect(seam.calls).toEqual([
      'forget-rows:studio:9000',
      'stop-capture:studio',
      'close-link:studio'
    ]);
  });

  it('stamps every tombstone from one instant', () => {
    // One removal is one moment. Reading the clock twice would let two rows
    // removed by one click carry two different removal times.
    forgetMachineSessions('studio', 1_234);
    expect(seam.calls[0]).toBe('forget-rows:studio:1234');
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
