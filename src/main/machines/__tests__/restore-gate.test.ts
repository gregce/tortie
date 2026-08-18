/**
 * The restore gate, every arm and every invariant (Phase 72, M5).
 *
 * The gate is the one thing standing between a person and two agents on one
 * conversation, so this file is written the way `./status-truth.test.ts` is:
 * one test per arm, then the invariants no arm may break, kept separate on
 * purpose. An arm test says what one condition does. An invariant says what NO
 * combination may do, and that is the half a later edit would break.
 */

import { describe, expect, it } from 'vitest';
import type { SessionStatus } from '@shared/types';
import {
  REMOTE_RESTORE_REFUSALS,
  remoteRestoreVerdict,
  type RemoteRestoreFacts
} from '../restore-gate';
import {
  MACHINE_NOT_READY,
  RESTORE_FORGOTTEN,
  RESTORE_STILL_RUNNING,
  RESTORE_UNSEEN,
  RESTORE_WRONG_MACHINE
} from '../remote-copy';

/** Every condition true. The only input that is offered. */
const OFFERED: RemoteRestoreFacts = {
  machineKnown: true,
  contextReady: true,
  machineReachable: true,
  completedListSeen: true,
  machineAnswering: true,
  listedNow: false,
  rowMachineId: 'studio',
  targetMachineId: 'studio',
  rowStatus: 'restorable'
};

function facts(over: Partial<RemoteRestoreFacts> = {}): RemoteRestoreFacts {
  return { ...OFFERED, ...over };
}

// ---------------------------------------------------------------------------
// The one input that says yes
// ---------------------------------------------------------------------------

describe('the verdict that offers the verb', () => {
  it('offers it when all six conditions hold, and names no reason', () => {
    expect(remoteRestoreVerdict(OFFERED)).toEqual({
      offered: true,
      reason: null,
      refusal: null
    });
  });

  it('offers it for a row a completed no server answer left restorable', () => {
    expect(remoteRestoreVerdict(facts({ rowStatus: 'restorable' })).offered).toBe(
      true
    );
  });

  /**
   * THE CASE RESTORE EXISTS FOR, and the one the first cut of this gate refused
   * for ever. A machine whose own session server has died can never have a live
   * connection, because the connection is opened only after a read proves that
   * server is running. What it does have is a completed answer over the other
   * route, and that answer is what says the session is not running. Research 51
   * section 4.4 requires the verb here. Fault matrix row 7 drives it.
   */
  it('offers it after that machine’s own session server has died', () => {
    expect(
      remoteRestoreVerdict(
        facts({
          machineReachable: true,
          completedListSeen: true,
          machineAnswering: true,
          listedNow: false,
          rowStatus: 'restorable'
        })
      )
    ).toEqual({ offered: true, reason: null, refusal: null });
  });
});

// ---------------------------------------------------------------------------
// One test per arm
// ---------------------------------------------------------------------------

describe('the six refusals, one per condition', () => {
  it('forgotten: the machine is no longer in the machines file', () => {
    expect(remoteRestoreVerdict(facts({ machineKnown: false }))).toEqual({
      offered: false,
      reason: RESTORE_FORGOTTEN,
      refusal: 'forgotten'
    });
  });

  it('wrong-machine: the row was created on a different machine', () => {
    expect(
      remoteRestoreVerdict(facts({ rowMachineId: 'laptop' }))
    ).toEqual({
      offered: false,
      reason: RESTORE_WRONG_MACHINE,
      refusal: 'wrong-machine'
    });
  });

  it('not-ready: nobody signed in to it, or no program list was read', () => {
    expect(remoteRestoreVerdict(facts({ contextReady: false }))).toEqual({
      offered: false,
      reason: MACHINE_NOT_READY,
      refusal: 'not-ready'
    });
  });

  it('no-route: neither route to the machine answered', () => {
    expect(remoteRestoreVerdict(facts({ machineReachable: false }))).toEqual({
      offered: false,
      reason: RESTORE_UNSEEN,
      refusal: 'no-route'
    });
  });

  it('unseen: no completed list has been read from that machine', () => {
    expect(remoteRestoreVerdict(facts({ completedListSeen: false }))).toEqual({
      offered: false,
      reason: RESTORE_UNSEEN,
      refusal: 'unseen'
    });
  });

  it('unseen: the machine did not answer the last time Tortie asked', () => {
    expect(remoteRestoreVerdict(facts({ machineAnswering: false })).refusal).toBe(
      'unseen'
    );
  });

  /**
   * THE DOUBLE RUN GUARD. Research 28 ranks this failure above every other in
   * the remote design, because pressing the verb over a session that never
   * stopped starts a second agent on the same conversation and both then write.
   */
  it('running: that machine still lists a session carrying this id', () => {
    expect(remoteRestoreVerdict(facts({ listedNow: true }))).toEqual({
      offered: false,
      reason: RESTORE_STILL_RUNNING,
      refusal: 'running'
    });
  });
});

// ---------------------------------------------------------------------------
// The invariants no combination may break
// ---------------------------------------------------------------------------

describe('the invariants', () => {
  /**
   * The whole reason `unknown` exists. It is written by exactly the events that
   * also mean the machine is not answering, and Phase 71 made that state real.
   * A row reading `unknown` may never be offered, whatever else is true.
   */
  it('a row reading unknown is never offered, whatever else holds', () => {
    expect(remoteRestoreVerdict(facts({ rowStatus: 'unknown' })).offered).toBe(
      false
    );
    expect(remoteRestoreVerdict(facts({ rowStatus: 'unknown' })).refusal).toBe(
      'unseen'
    );
  });

  /**
   * The arm order is the sentence a person reads. A machine somebody removed
   * fails every arm below `forgotten` as well, and telling them the link is down
   * would send them to fix something that is not the problem.
   */
  it('a removed machine reads as forgotten even when everything else fails', () => {
    const verdict = remoteRestoreVerdict({
      machineKnown: false,
      contextReady: false,
      machineReachable: false,
      completedListSeen: false,
      machineAnswering: false,
      listedNow: true,
      rowMachineId: 'laptop',
      targetMachineId: 'studio',
      rowStatus: 'unknown'
    });
    expect(verdict.refusal).toBe('forgotten');
  });

  it('a row on another machine reads as wrong-machine before any link arm', () => {
    const verdict = remoteRestoreVerdict(
      facts({
        rowMachineId: 'laptop',
        contextReady: false,
        machineReachable: false,
        machineAnswering: false
      })
    );
    expect(verdict.refusal).toBe('wrong-machine');
  });

  /**
   * The `running` arm is last because it needs every arm above it to be true
   * before its answer means anything. A list Tortie could not read holds
   * nothing, and reading that as "not running" is the mistake the five arms
   * above exist to prevent.
   */
  it('a machine that is not answering is unseen rather than offered', () => {
    const verdict = remoteRestoreVerdict(
      facts({ machineAnswering: false, listedNow: false })
    );
    expect(verdict.refusal).toBe('unseen');
    expect(verdict.offered).toBe(false);
  });

  it('every refusal carries a sentence, and every offer carries none', () => {
    const inputs: RemoteRestoreFacts[] = [
      OFFERED,
      facts({ machineKnown: false }),
      facts({ rowMachineId: 'other' }),
      facts({ contextReady: false }),
      facts({ machineReachable: false }),
      facts({ completedListSeen: false }),
      facts({ listedNow: true })
    ];
    for (const input of inputs) {
      const verdict = remoteRestoreVerdict(input);
      if (verdict.offered) {
        expect(verdict.reason).toBeNull();
        expect(verdict.refusal).toBeNull();
        continue;
      }
      expect(verdict.refusal).not.toBeNull();
      expect(String(verdict.reason).length).toBeGreaterThan(40);
    }
  });

  /**
   * The writing rules refuse a dash of either kind in anything a person reads,
   * and every one of these is drawn beside a session row or inside a dialog.
   */
  it('no sentence carries a dash the writing rules refuse', () => {
    for (const sentence of [
      MACHINE_NOT_READY,
      RESTORE_FORGOTTEN,
      RESTORE_STILL_RUNNING,
      RESTORE_UNSEEN,
      RESTORE_WRONG_MACHINE
    ]) {
      expect(sentence).not.toContain('—');
      expect(sentence).not.toContain('–');
    }
  });

  /** The declared list and the arms are one set, in the order they are asked. */
  it('the declared refusal ids are the arms, in the order they are asked', () => {
    expect([...REMOTE_RESTORE_REFUSALS]).toEqual([
      'forgotten',
      'wrong-machine',
      'not-ready',
      'no-route',
      'unseen',
      'running'
    ]);
    const reached = [
      remoteRestoreVerdict(facts({ machineKnown: false })).refusal,
      remoteRestoreVerdict(facts({ rowMachineId: 'other' })).refusal,
      remoteRestoreVerdict(facts({ contextReady: false })).refusal,
      remoteRestoreVerdict(facts({ machineReachable: false })).refusal,
      remoteRestoreVerdict(facts({ completedListSeen: false })).refusal,
      remoteRestoreVerdict(facts({ listedNow: true })).refusal
    ];
    expect(reached).toEqual([...REMOTE_RESTORE_REFUSALS]);
  });

  /**
   * Every status a row can hold, driven through the gate. Only the two a
   * completed answer can produce may be offered, and no status opens a door on
   * its own.
   */
  it('no status alone opens the verb', () => {
    const statuses: SessionStatus[] = [
      'running',
      'idle',
      'needs_input',
      'exited',
      'restorable',
      'unknown',
      'discarded'
    ];
    for (const rowStatus of statuses) {
      // Every other condition failing means every status is refused.
      expect(
        remoteRestoreVerdict(facts({ rowStatus, machineAnswering: false })).offered
      ).toBe(false);
    }
  });
});
