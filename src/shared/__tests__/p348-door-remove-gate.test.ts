/**
 * THE SECOND ENVIRONMENT THE PHONE'S DOOR ASKS THE GATE WITH (Phase 348,
 * build/p348/SPEC.md D6, D47): `DOOR_REMOVE_GATE_ENV` beside
 * `DOOR_GATE_ENV` in src/shared/session-gates.ts.
 *
 *  - It is frozen and turns on `canDiscard` alone; `DOOR_GATE_ENV` does not
 *    move (its own test, ./p317-session-gates.test.ts, is kept).
 *  - Over every status, placement and material, `canRemove` under it is
 *    exactly "the session has ended" (`exited` or `restorable`), on this Mac
 *    and on another machine: an unknown, a removed and a live row are never
 *    offered Remove, so for a session on another machine, where main's own
 *    gate passes every record (ruling R11), this gate is the only lock.
 *  - `canEnd` does not depend on which of the two the door hands, so the door
 *    asking `canEnd` of the first and `canRemove` of the second answers what
 *    either would.
 *  - Restore stays off under it: the phone restores nothing.
 */

import { describe, expect, it } from 'vitest';
import { SESSION_STATUSES } from '@shared/types';
import type { Session, SessionStatus } from '@shared/types';
import { DOOR_GATE_ENV, DOOR_REMOVE_GATE_ENV, sessionActionGates } from '@shared/session-gates';

const PLACEMENTS = ['local', 'gone', 'remote-yes', 'remote-no'] as const;
const MATERIALS = ['bare', 'scrollback', 'conversation'] as const;

function rowOf(status: SessionStatus, placement: (typeof PLACEMENTS)[number], material: (typeof MATERIALS)[number]): Session {
  const s: Record<string, unknown> = {
    id: 'r',
    name: 'row',
    tmuxName: 'row',
    projectPath: '/w',
    cwd: '/w',
    agent: 'claude',
    status,
    createdAt: 1
  };
  if (placement === 'gone') s['machineGone'] = { label: 'Old', lastStatus: status, lastSeenAt: 1, forgottenAt: 2 };
  if (placement === 'remote-yes' || placement === 'remote-no') {
    s['machine'] = {
      id: 'm1',
      label: 'Studio',
      color: 'green',
      answering: true,
      canRestore: placement === 'remote-yes',
      restoreReason: placement === 'remote-yes' ? null : 'not here'
    };
  }
  if (material === 'scrollback') s['hasSavedScrollback'] = true;
  if (material === 'conversation') {
    s['resumeArgv'] = ['/bin/claude', '--resume', 'c'];
    s['agentSessionId'] = 'c';
  }
  return s as unknown as Session;
}

describe('DOOR_REMOVE_GATE_ENV (D47)', () => {
  it('is frozen, turns on canDiscard alone, and leaves DOOR_GATE_ENV as it was', () => {
    expect(Object.isFrozen(DOOR_REMOVE_GATE_ENV)).toBe(true);
    expect(DOOR_REMOVE_GATE_ENV).toEqual({ canRestore: false, canDiscard: true, shellPathReady: false, handback: undefined });
    expect(DOOR_GATE_ENV).toEqual({ canRestore: false, canDiscard: false, shellPathReady: false, handback: undefined });
    expect(DOOR_REMOVE_GATE_ENV).not.toBe(DOOR_GATE_ENV);
  });

  it('offers Remove on exactly the ended rows, on this Mac and on another machine, whatever they hold', () => {
    const wrong: string[] = [];
    for (const status of SESSION_STATUSES) {
      for (const placement of PLACEMENTS) {
        for (const material of MATERIALS) {
          const gates = sessionActionGates(rowOf(status, placement, material), status, DOOR_REMOVE_GATE_ENV);
          const ended = status === 'exited' || status === 'restorable';
          if (gates.canRemove !== ended) wrong.push(`${status}/${placement}/${material}: canRemove ${String(gates.canRemove)}`);
          // Restore is never offered through the door's environments.
          if (gates.offersRestore || gates.canRestoreNow || gates.canRestorePastNow) wrong.push(`${status}/${placement}/${material}: restore`);
        }
      }
    }
    expect(wrong).toEqual([]);
    // The ones that matter most, spelled out: never unknown, removed or live, on another machine too.
    for (const status of ['unknown', 'discarded', 'running', 'idle', 'needs_input'] as const) {
      expect(sessionActionGates(rowOf(status, 'remote-yes', 'conversation'), status, DOOR_REMOVE_GATE_ENV).canRemove, status).toBe(false);
      expect(sessionActionGates(rowOf(status, 'local', 'conversation'), status, DOOR_REMOVE_GATE_ENV).canRemove, status).toBe(false);
    }
  });

  it('under the first environment Remove is never on, which is why the door hands the second', () => {
    for (const status of SESSION_STATUSES) {
      expect(sessionActionGates(rowOf(status, 'local', 'bare'), status, DOOR_GATE_ENV).canRemove, status).toBe(false);
    }
  });

  it('canEnd answers the same under either environment, over every row', () => {
    const spread: string[] = [];
    for (const status of SESSION_STATUSES) {
      for (const placement of PLACEMENTS) {
        for (const material of MATERIALS) {
          const row = rowOf(status, placement, material);
          if (sessionActionGates(row, status, DOOR_GATE_ENV).canEnd !== sessionActionGates(row, status, DOOR_REMOVE_GATE_ENV).canEnd) {
            spread.push(`${status}/${placement}/${material}`);
          }
        }
      }
    }
    expect(spread).toEqual([]);
  });
});
