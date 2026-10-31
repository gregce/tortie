/**
 * Phase 349 (build/p349/SPEC.md D4, §4.3 step 2, §10.3): THE THIRD
 * ENVIRONMENT, `DOOR_RENAME_GATE_ENV`, beside Phase 317's `DOOR_GATE_ENV` and
 * Phase 348's `DOOR_REMOVE_GATE_ENV`, which do not move.
 *
 * Of it the door asks `canRename` and nothing else, and `canRename` reads none
 * of ANY environment: it is `acts`, a row that is neither unknown nor removed.
 * So over every status, four placements and three kinds of material, it is ONE
 * answer across the 32 environments p317-session-gates.test.ts walks, the
 * three the door asks with, and a set of hostile ones (every field set, a
 * handback in each state, fields of the wrong kind), and that answer is
 * exactly "neither unknown nor removed".
 *
 * Nothing here opens a socket or reads anything but this repository's source.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SESSION_STATUSES } from '@shared/types';
import type { Session, SessionStatus } from '@shared/types';
import {
  DOOR_GATE_ENV,
  DOOR_REMOVE_GATE_ENV,
  DOOR_RENAME_GATE_ENV,
  sessionActionGates
} from '@shared/session-gates';
import type { SessionGateEnv } from '@shared/session-gates';

const HERE = dirname(fileURLToPath(import.meta.url));

const PLACEMENTS = ['local', 'gone', 'remote-yes', 'remote-no'] as const;
const MATERIALS = ['bare', 'scrollback', 'conversation'] as const;
const HANDBACKS = [undefined, 'left', 'returning', 'unconfirmed'] as const;

/** The 32 environments, the grid p317-session-gates.test.ts walks. */
function envs(): SessionGateEnv[] {
  const out: SessionGateEnv[] = [];
  for (const canRestore of [true, false]) {
    for (const canDiscard of [true, false]) {
      for (const shellPathReady of [true, false]) {
        for (const h of HANDBACKS) {
          out.push({
            canRestore,
            canDiscard,
            shellPathReady,
            handback: h === undefined ? undefined : { state: h, leftAt: 0 }
          });
        }
      }
    }
  }
  return out;
}

/** Hostile environments: every field set, and fields a caller should never hand. */
const HOSTILE: SessionGateEnv[] = [
  { canRestore: true, canDiscard: true, shellPathReady: true, handback: { state: 'left', leftAt: 1_700_000_000_000 } },
  { canRestore: true, canDiscard: true, shellPathReady: true, handback: { state: 'unconfirmed', leftAt: -1 } },
  { canRestore: 1, canDiscard: 'yes', shellPathReady: null, handback: { state: 'gone', leftAt: Number.NaN } } as unknown as SessionGateEnv,
  {} as unknown as SessionGateEnv
];

function rowOf(
  status: SessionStatus,
  placement: (typeof PLACEMENTS)[number],
  material: (typeof MATERIALS)[number]
): Session {
  const s: Record<string, unknown> = {
    id: 'g',
    name: 'grid',
    tmuxName: 'grid',
    projectPath: '/w',
    cwd: '/w',
    agent: 'claude',
    status,
    createdAt: 1
  };
  if (placement === 'gone') {
    s['machineGone'] = { label: 'Old', lastStatus: status, lastSeenAt: 1, forgottenAt: 2 };
  }
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
    s['capture'] = { provider: 'claude', bin: '/bin/specstory', exitCodeApproximate: false };
  }
  return s as unknown as Session;
}

describe('DOOR_RENAME_GATE_ENV (Phase 349, D4)', () => {
  it('is frozen and asks for nothing: restore, remove and the shell path off', () => {
    expect(Object.isFrozen(DOOR_RENAME_GATE_ENV)).toBe(true);
    expect(DOOR_RENAME_GATE_ENV).toEqual({
      canRestore: false,
      canDiscard: false,
      shellPathReady: false,
      handback: undefined
    });
  });

  it('is its own name, beside the first two, which do not move', () => {
    expect(DOOR_RENAME_GATE_ENV).not.toBe(DOOR_GATE_ENV);
    expect(DOOR_RENAME_GATE_ENV).not.toBe(DOOR_REMOVE_GATE_ENV);
    expect(DOOR_GATE_ENV).toEqual({ canRestore: false, canDiscard: false, shellPathReady: false, handback: undefined });
    expect(DOOR_REMOVE_GATE_ENV).toEqual({ canRestore: false, canDiscard: true, shellPathReady: false, handback: undefined });
  });

  it('is declared once, in session-gates.ts, after the first two, each environment declared once', () => {
    const source = readFileSync(join(HERE, '..', 'session-gates.ts'), 'utf8');
    for (const name of ['DOOR_GATE_ENV', 'DOOR_REMOVE_GATE_ENV', 'DOOR_RENAME_GATE_ENV']) {
      expect(source.split(`export const ${name}: SessionGateEnv = Object.freeze({`), name).toHaveLength(2);
    }
    expect(source.indexOf('export const DOOR_RENAME_GATE_ENV')).toBeGreaterThan(source.indexOf('export const DOOR_REMOVE_GATE_ENV'));
  });
});

describe('canRename reads none of ANY environment (Phase 349, D4, §10.3)', () => {
  it('is ONE answer over the 32 environments, the three door environments and the hostile ones', () => {
    const all = [...envs(), DOOR_GATE_ENV, DOOR_REMOVE_GATE_ENV, DOOR_RENAME_GATE_ENV, ...HOSTILE];
    expect(all).toHaveLength(32 + 3 + HOSTILE.length);
    const spread: string[] = [];
    for (const status of SESSION_STATUSES) {
      for (const placement of PLACEMENTS) {
        for (const material of MATERIALS) {
          const row = rowOf(status, placement, material);
          const door = sessionActionGates(row, status, DOOR_RENAME_GATE_ENV).canRename;
          const answers = new Set(all.map((env) => sessionActionGates(row, status, env).canRename));
          if (answers.size !== 1 || !answers.has(door)) spread.push(`${status}/${placement}/${material}`);
        }
      }
    }
    expect(spread).toEqual([]);
  });

  it('is exactly a row that is neither unknown nor removed, on this Mac and on a machine', () => {
    for (const status of SESSION_STATUSES) {
      for (const placement of PLACEMENTS) {
        const gates = sessionActionGates(rowOf(status, placement, 'bare'), status, DOOR_RENAME_GATE_ENV);
        expect(gates.canRename, `${status}/${placement}`).toBe(status !== 'unknown' && status !== 'discarded');
        expect(gates.canRename, `${status}/${placement}`).toBe(!gates.unknown && !gates.removed);
      }
    }
  });

  it('is asked of the status handed in, never the row\'s own: the gate stays the one reading', () => {
    // A row whose status field says running but is handed `unknown` (main's
    // effective status) refuses, and the other way round passes.
    expect(sessionActionGates(rowOf('running', 'local', 'bare'), 'unknown', DOOR_RENAME_GATE_ENV).canRename).toBe(false);
    expect(sessionActionGates(rowOf('unknown', 'local', 'bare'), 'running', DOOR_RENAME_GATE_ENV).canRename).toBe(true);
  });
});
