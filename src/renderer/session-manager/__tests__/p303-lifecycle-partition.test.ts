/**
 * Phase 303. The lifecycle partition the session manager's Active | Ended
 * control reads, held EQUAL between main and the renderer.
 *
 * The control reads `row.gates` (`sessionActionGates`, ../../state/resume.ts)
 * and names no status of its own: Active is `live || unknown`, Ended is
 * `ended`. Main draws the same line in `removeRefusal`
 * (../../../main/sessions/lifecycle-gate.ts): it refuses to remove a row
 * whose process may be alive and passes one whose process is over. The two
 * are written separately, by `===` on one side and a `switch` on the other,
 * and neither imports the other, so the real risk is that they drift apart
 * and a segment tells a person a session is over that main still refuses to
 * remove. This file is the guard: over every member of `SESSION_STATUSES`,
 * Active is exactly main's refusal set and Ended is exactly its pass set
 * minus `discarded`, which is the Past tab's alone.
 *
 * A renderer test importing main's leaf is legal: tests are exempt from every
 * import-boundary rule (build/assert-import-boundaries.mjs), and both modules
 * are pure leaves that read nothing and start nothing.
 */

import { describe, expect, it } from 'vitest';
import { SESSION_STATUSES, type Session, type SessionStatus } from '@shared/types';
import { removeRefusal } from '../../../main/sessions/lifecycle-gate';
import { sessionActionGates } from '../../state/resume';

/** A local row: no machine, so `removeRefusal` reaches its switch. */
function local(status: SessionStatus): Session {
  return {
    id: `s-${status}`,
    name: status,
    tmuxName: status,
    projectPath: '/repo',
    cwd: '/repo',
    agent: 'claude',
    status,
    createdAt: 1
  };
}

/** What the gates need beside the row. Nothing here decides the partition. */
const ENV = {
  canRestore: true,
  canDiscard: true,
  shellPathReady: true,
  handback: undefined
};

/** The control's two readings, as ./view.ts's `rowPasses` makes them. */
function segmentOf(status: SessionStatus): 'active' | 'ended' | 'neither' {
  const gates = sessionActionGates(local(status), status, ENV);
  if (gates.live || gates.unknown) return 'active';
  if (gates.ended) return 'ended';
  return 'neither';
}

/** Main's line: a refusal means the process may be alive. */
function mainRefuses(status: SessionStatus): boolean {
  return removeRefusal({ status, machineId: undefined }) !== null;
}

describe('the lifecycle partition agrees between main and the renderer (Phase 303)', () => {
  it('reads every status the alphabet holds, once', () => {
    expect(SESSION_STATUSES).toHaveLength(7);
    expect(new Set(SESSION_STATUSES).size).toBe(7);
  });

  for (const status of SESSION_STATUSES) {
    it(`${status}: Active exactly when main refuses to remove it`, () => {
      const gates = sessionActionGates(local(status), status, ENV);
      expect(gates.live || gates.unknown).toBe(mainRefuses(status));
    });

    it(`${status}: Ended exactly when main passes it and it is not removed`, () => {
      const gates = sessionActionGates(local(status), status, ENV);
      expect(gates.ended).toBe(!mainRefuses(status) && status !== 'discarded');
    });

    it(`${status}: in exactly one of Active, Ended or removed`, () => {
      const gates = sessionActionGates(local(status), status, ENV);
      const active = gates.live || gates.unknown;
      const places = [active, gates.ended, gates.removed].filter(Boolean);
      expect(places).toHaveLength(1);
    });
  }

  it('the table, written out so a drift is read by name', () => {
    const table = Object.fromEntries(
      SESSION_STATUSES.map((status) => [status, segmentOf(status)])
    );
    expect(table).toEqual({
      running: 'active',
      idle: 'active',
      needs_input: 'active',
      unknown: 'active',
      exited: 'ended',
      restorable: 'ended',
      discarded: 'neither'
    });
  });

  it('unknown is Active and never Ended, because Restore never acts on it', () => {
    // The operator defined Ended as "allowing you to restore". An unreachable
    // row offers no Restore, so Ended would promise a verb the row lacks.
    const gates = sessionActionGates(local('unknown'), 'unknown', ENV);
    expect(gates.unknown).toBe(true);
    expect(gates.ended).toBe(false);
    expect(gates.offersRestore).toBe(false);
    expect(gates.canEnd).toBe(false);
    expect(mainRefuses('unknown')).toBe(true);
  });

  it('Active is the statuses End acts on plus unknown, and Ended the statuses Restore acts on', () => {
    for (const status of SESSION_STATUSES) {
      const gates = sessionActionGates(local(status), status, ENV);
      if (gates.canEnd) expect(segmentOf(status), status).toBe('active');
      if (gates.showsRemove) expect(segmentOf(status), status).toBe('ended');
    }
  });
});
