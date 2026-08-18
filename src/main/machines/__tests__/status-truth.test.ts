/**
 * The section 4.4 case table, one test per row plus the three invariants under
 * it (Phase 71, M4).
 *
 * The table in research 51 section 4.4 is the specification. This file is what
 * makes it executable, so a later edit that quietly gives a lost link the power
 * to write a confirmed death fails here rather than in a person's session list.
 *
 * The three invariants are separate from the six rows on purpose. A row test
 * says what one event does. An invariant says what NO event may do, and that is
 * the half a new arm would break.
 */

import { describe, expect, it } from 'vitest';
import {
  MACHINE_EVENT_KINDS,
  RESTORE_DISABLED_RUNNING,
  RESTORE_DISABLED_UNSEEN,
  machineTruth,
  mayFlipRestorable,
  type MachineEvent,
  type MachineEventKind
} from '../status-truth';

const AT = 1_700_000_000_000;

function event(kind: MachineEventKind, errorClass?: string): MachineEvent {
  return errorClass === undefined ? { kind, at: AT } : { kind, at: AT, errorClass };
}

// ---------------------------------------------------------------------------
// The six rows
// ---------------------------------------------------------------------------

describe('the case table, one test per row', () => {
  it('listed: the list decided every row, so the table decides none', () => {
    expect(machineTruth(event('listed'))).toEqual({
      rows: { kind: 'per-row' },
      restoreOffered: false,
      restoreDisabledReason: RESTORE_DISABLED_RUNNING,
      evidence: `reconcile pass at ${String(AT)}`
    });
  });

  /**
   * Phase 70 wrote 'exited' here. 'exited' is a terminal record that no later
   * evidence revises, and the session is simply not running. The behaviour
   * change is named in the phase report because a person sees a different word.
   */
  it('absent: a completed pass that did not report it is restorable, not exited', () => {
    expect(machineTruth(event('absent'))).toEqual({
      rows: { kind: 'status', status: 'restorable' },
      // PHASE 72 FLIPPED THIS ARM. A machine answered and its answer did not
      // hold the session, which is the one piece of evidence that may open the
      // verb. The per session conditions are asked by ../restore-gate.ts.
      restoreOffered: true,
      restoreDisabledReason: null,
      evidence: `absent from the pass at ${String(AT)}`
    });
  });

  it('transport-lost: unknown, and the error class is recorded verbatim', () => {
    expect(machineTruth(event('transport-lost', 'timed-out'))).toEqual({
      rows: { kind: 'status', status: 'unknown' },
      restoreOffered: false,
      restoreDisabledReason: RESTORE_DISABLED_UNSEEN,
      evidence: `transport timed-out at ${String(AT)}`
    });
  });

  it('transport-lost with no class named still records one word', () => {
    expect(machineTruth(event('transport-lost')).evidence).toBe(
      `transport unknown at ${String(AT)}`
    );
  });

  /**
   * A machine may have gone away while this Mac was asleep, so the last answer
   * is about a world that may no longer be the current one.
   */
  it('woke: unknown, because the last answer is about an older world', () => {
    expect(machineTruth(event('woke'))).toEqual({
      rows: { kind: 'status', status: 'unknown' },
      restoreOffered: false,
      restoreDisabledReason: RESTORE_DISABLED_UNSEEN,
      evidence: `power event at ${String(AT)}`
    });
  });

  it('no-server: the machine answered and holds nothing, so restorable', () => {
    expect(machineTruth(event('no-server'))).toEqual({
      rows: { kind: 'status', status: 'restorable' },
      // The second of the two arms Phase 72 flipped, for the same reason.
      restoreOffered: true,
      restoreDisabledReason: null,
      evidence: `no server on a reachable machine at ${String(AT)}`
    });
  });

  /**
   * A `%exit` says the control connection ended. It does not say the far side's
   * server died and it does not say a session did, so it moves no row.
   */
  it('control-exit: the connection ended, which decides nothing per row', () => {
    expect(machineTruth(event('control-exit'))).toEqual({
      rows: { kind: 'per-row' },
      restoreOffered: false,
      restoreDisabledReason: RESTORE_DISABLED_RUNNING,
      evidence: `control event at ${String(AT)}`
    });
  });
});

// ---------------------------------------------------------------------------
// The three invariants
// ---------------------------------------------------------------------------

describe('the invariants no arm may break', () => {
  /**
   * Status semantics do not move. `needs_input` is a statement about what a
   * session is doing, produced by an oracle reading local disk. A fact about a
   * machine is never that.
   */
  it('no arm ever produces needs_input', () => {
    for (const kind of MACHINE_EVENT_KINDS) {
      const verdict = machineTruth(event(kind)).rows;
      if (verdict.kind === 'status') {
        expect(verdict.status).not.toBe('needs_input');
      }
    }
  });

  /**
   * Research 51 section 4.4's one sentence rule: a session may be offered for
   * restore only when a machine ANSWERED and the answer did not hold it.
   */
  it('mayFlipRestorable is true for exactly absent and no-server', () => {
    const flipping = MACHINE_EVENT_KINDS.filter((kind) =>
      mayFlipRestorable(event(kind))
    );
    expect(flipping).toEqual(['absent', 'no-server']);
  });

  /**
   * And the two halves agree: every arm that WRITES 'restorable' is an arm
   * mayFlipRestorable admits. A later edit that gave 'transport-lost' the power
   * to write a confirmed death would fail here even if it also edited the guard.
   */
  it('only an arm mayFlipRestorable admits ever writes restorable', () => {
    for (const kind of MACHINE_EVENT_KINDS) {
      const verdict = machineTruth(event(kind)).rows;
      const writesRestorable =
        verdict.kind === 'status' && verdict.status === 'restorable';
      expect(writesRestorable).toBe(mayFlipRestorable(event(kind)));
    }
  });

  /**
   * PHASE 72 REPLACED THE OLD VERSION OF THIS INVARIANT, which asserted that no
   * arm offered restore. Two arms do now, and the invariant that replaced it is
   * stronger: the arms that offer restore, the arms that may write `restorable`,
   * and the arms `mayFlipRestorable` admits are ONE set of two. A later edit
   * that opened the verb on a third arm has to break all three at once.
   */
  it('restore is offered on exactly the arms that may write restorable', () => {
    const offering = MACHINE_EVENT_KINDS.filter(
      (kind) => machineTruth(event(kind)).restoreOffered
    );
    expect(offering).toEqual(['absent', 'no-server']);
    for (const kind of MACHINE_EVENT_KINDS) {
      expect(machineTruth(event(kind)).restoreOffered).toBe(
        mayFlipRestorable(event(kind))
      );
    }
  });

  /**
   * An arm that offers the verb names no reason, and an arm that refuses it
   * always names one. A refusal with no sentence is a verb that vanishes from a
   * menu with nothing said, which is the shape this whole rung refuses.
   */
  it('every arm either offers the verb or says why it does not', () => {
    for (const kind of MACHINE_EVENT_KINDS) {
      const truth = machineTruth(event(kind));
      if (truth.restoreOffered) {
        expect(truth.restoreDisabledReason).toBeNull();
        continue;
      }
      expect(truth.restoreDisabledReason).not.toBeNull();
      expect(String(truth.restoreDisabledReason).length).toBeGreaterThan(20);
    }
  });

  it('every arm records evidence carrying the instant it was stamped', () => {
    for (const kind of MACHINE_EVENT_KINDS) {
      expect(machineTruth(event(kind)).evidence).toContain(String(AT));
    }
  });

  /**
   * The writing rules refuse an em dash or an en dash in anything a person
   * reads, and both sentences here are drawn beside a session row.
   */
  it('neither sentence carries a dash the writing rules refuse', () => {
    for (const sentence of [RESTORE_DISABLED_UNSEEN, RESTORE_DISABLED_RUNNING]) {
      expect(sentence).not.toContain('—');
      expect(sentence).not.toContain('–');
    }
  });
});
