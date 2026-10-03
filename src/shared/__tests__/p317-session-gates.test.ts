/**
 * Phase 317. The gate moved from src/renderer/state/resume.ts to
 * src/shared/session-gates.ts, EVERY EXPRESSION MOVED AND NOT REWRITTEN
 * (build/p317/SPEC.md D8, §5.1, §7.2), so main can ask it for the phone's door.
 *
 * WHAT THIS HOLDS. The moved gate answers exactly what the parent's answered,
 * over every status in SESSION_STATUSES, four placements (this Mac, a row whose
 * machine was removed, a machine that can restore, one that cannot), three
 * kinds of material, and every corner of SessionGateEnv: canRestore,
 * canDiscard and shellPathReady each true and false, and the handback absent,
 * left, returning and unconfirmed. 84 rows times 32 environments, 2,688
 * readings of fifteen fields each.
 *
 * THE TABLE IS FROZEN, AND WHERE IT CAME FROM IS THE POINT. It was printed by
 * importing the PARENT's whole src/renderer/state/resume.ts (`git show
 * 551312f7:src/renderer/state/resume.ts`, its one renderer import stubbed) and
 * asking it over the grid below, never by asking the code under test. Each
 * reading is the fifteen fields as four hex digits, FIELDS[0] the highest bit.
 * A field that answers differently for any row in any environment reads red
 * here with the row, the environment and the field named.
 *
 * And the door's half: canEnd reads no environment, so DOOR_GATE_ENV, the one
 * the phone's door asks with, answers exactly what every other corner answers.
 */

import { describe, expect, it } from 'vitest';
import { SESSION_STATUSES } from '@shared/types';
import type { Session, SessionStatus } from '@shared/types';
import { DOOR_GATE_ENV, sessionActionGates } from '@shared/session-gates';
import type { SessionGateEnv } from '@shared/session-gates';

// ---------------------------------------------------------------------------
// The grid, the same one the script that printed the table walked.
// ---------------------------------------------------------------------------

const FIELDS = [
  'unknown',
  'removed',
  'ended',
  'live',
  'remote',
  'canRename',
  'offersRestore',
  'canRestoreNow',
  'canRestorePastNow',
  'offersRestart',
  'offersBare',
  'offersResumeInPlace',
  'canEnd',
  'showsRemove',
  'canRemove'
] as const;
const PLACEMENTS = ['local', 'gone', 'remote-yes', 'remote-no'] as const;
const MATERIALS = ['bare', 'scrollback', 'conversation'] as const;
const HANDBACKS = [undefined, 'left', 'returning', 'unconfirmed'] as const;

/** The 32 environments, in one fixed order. */
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

/** Fifteen booleans as four hex digits, FIELDS[0] the highest bit. */
function wordOf(gates: Record<string, boolean>): string {
  let n = 0;
  for (const f of FIELDS) n = n * 2 + (gates[f] === true ? 1 : 0);
  return n.toString(16).padStart(4, '0');
}

/** The fields two words disagree on, by name. */
function differing(got: string, want: string): string[] {
  const g = parseInt(got, 16);
  const w = parseInt(want, 16);
  return FIELDS.filter((_, i) => ((g >> (FIELDS.length - 1 - i)) & 1) !== ((w >> (FIELDS.length - 1 - i)) & 1));
}

// ---------------------------------------------------------------------------
// The parent's answers, frozen: status/placement/material, then one word per
// environment in envs()' order.
// ---------------------------------------------------------------------------

const PARENT: Readonly<Record<string, string>> = {
  'running/local/bare': '0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04',
  'running/local/scrollback': '0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04',
  'running/local/conversation': '0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04',
  'running/gone/bare': '0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04',
  'running/gone/scrollback': '0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04',
  'running/gone/conversation': '0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04',
  'running/remote-yes/bare': '0f84 0f84 0f84 0f84 0f04 0f04 0f04 0f04 0f84 0f84 0f84 0f84 0f04 0f04 0f04 0f04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04',
  'running/remote-yes/scrollback': '0f84 0f84 0f84 0f84 0f04 0f04 0f04 0f04 0f84 0f84 0f84 0f84 0f04 0f04 0f04 0f04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04',
  'running/remote-yes/conversation': '0f84 0f84 0f84 0f84 0f04 0f04 0f04 0f04 0f84 0f84 0f84 0f84 0f04 0f04 0f04 0f04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04',
  'running/remote-no/bare': '0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04',
  'running/remote-no/scrollback': '0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04',
  'running/remote-no/conversation': '0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04',
  'idle/local/bare': '0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04',
  'idle/local/scrollback': '0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04',
  'idle/local/conversation': '0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04',
  'idle/gone/bare': '0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04',
  'idle/gone/scrollback': '0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04',
  'idle/gone/conversation': '0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04',
  'idle/remote-yes/bare': '0f84 0f84 0f84 0f84 0f04 0f04 0f04 0f04 0f84 0f84 0f84 0f84 0f04 0f04 0f04 0f04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04',
  'idle/remote-yes/scrollback': '0f84 0f84 0f84 0f84 0f04 0f04 0f04 0f04 0f84 0f84 0f84 0f84 0f04 0f04 0f04 0f04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04',
  'idle/remote-yes/conversation': '0f84 0f84 0f84 0f84 0f04 0f04 0f04 0f04 0f84 0f84 0f84 0f84 0f04 0f04 0f04 0f04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04',
  'idle/remote-no/bare': '0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04',
  'idle/remote-no/scrollback': '0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04',
  'idle/remote-no/conversation': '0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04',
  'needs_input/local/bare': '0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04',
  'needs_input/local/scrollback': '0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04',
  'needs_input/local/conversation': '0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04',
  'needs_input/gone/bare': '0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04',
  'needs_input/gone/scrollback': '0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04 0a04',
  'needs_input/gone/conversation': '0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04 0a04 0a0c 0a04 0a04',
  'needs_input/remote-yes/bare': '0f84 0f84 0f84 0f84 0f04 0f04 0f04 0f04 0f84 0f84 0f84 0f84 0f04 0f04 0f04 0f04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04',
  'needs_input/remote-yes/scrollback': '0f84 0f84 0f84 0f84 0f04 0f04 0f04 0f04 0f84 0f84 0f84 0f84 0f04 0f04 0f04 0f04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04',
  'needs_input/remote-yes/conversation': '0f84 0f84 0f84 0f84 0f04 0f04 0f04 0f04 0f84 0f84 0f84 0f84 0f04 0f04 0f04 0f04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04',
  'needs_input/remote-no/bare': '0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04',
  'needs_input/remote-no/scrollback': '0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04',
  'needs_input/remote-no/conversation': '0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04 0e04',
  'exited/local/bare': '1223 1223 1223 1223 1223 1223 1223 1223 1222 1222 1222 1222 1222 1222 1222 1222 1223 1223 1223 1223 1223 1223 1223 1223 1222 1222 1222 1222 1222 1222 1222 1222',
  'exited/local/scrollback': '13a3 13a3 13a3 13a3 1323 1323 1323 1323 13a2 13a2 13a2 13a2 1322 1322 1322 1322 1223 1223 1223 1223 1223 1223 1223 1223 1222 1222 1222 1222 1222 1222 1222 1222',
  'exited/local/conversation': '13b3 13b3 13b3 13b3 1333 1333 1333 1333 13b2 13b2 13b2 13b2 1332 1332 1332 1332 1233 1233 1233 1233 1233 1233 1233 1233 1232 1232 1232 1232 1232 1232 1232 1232',
  'exited/gone/bare': '1223 1223 1223 1223 1223 1223 1223 1223 1222 1222 1222 1222 1222 1222 1222 1222 1223 1223 1223 1223 1223 1223 1223 1223 1222 1222 1222 1222 1222 1222 1222 1222',
  'exited/gone/scrollback': '13a3 13a3 13a3 13a3 1323 1323 1323 1323 13a2 13a2 13a2 13a2 1322 1322 1322 1322 1223 1223 1223 1223 1223 1223 1223 1223 1222 1222 1222 1222 1222 1222 1222 1222',
  'exited/gone/conversation': '13b3 13b3 13b3 13b3 1333 1333 1333 1333 13b2 13b2 13b2 13b2 1332 1332 1332 1332 1233 1233 1233 1233 1233 1233 1233 1233 1232 1232 1232 1232 1232 1232 1232 1232',
  'exited/remote-yes/bare': '1783 1783 1783 1783 1703 1703 1703 1703 1782 1782 1782 1782 1702 1702 1702 1702 1603 1603 1603 1603 1603 1603 1603 1603 1602 1602 1602 1602 1602 1602 1602 1602',
  'exited/remote-yes/scrollback': '1783 1783 1783 1783 1703 1703 1703 1703 1782 1782 1782 1782 1702 1702 1702 1702 1603 1603 1603 1603 1603 1603 1603 1603 1602 1602 1602 1602 1602 1602 1602 1602',
  'exited/remote-yes/conversation': '1783 1783 1783 1783 1703 1703 1703 1703 1782 1782 1782 1782 1702 1702 1702 1702 1603 1603 1603 1603 1603 1603 1603 1603 1602 1602 1602 1602 1602 1602 1602 1602',
  'exited/remote-no/bare': '1603 1603 1603 1603 1603 1603 1603 1603 1602 1602 1602 1602 1602 1602 1602 1602 1603 1603 1603 1603 1603 1603 1603 1603 1602 1602 1602 1602 1602 1602 1602 1602',
  'exited/remote-no/scrollback': '1603 1603 1603 1603 1603 1603 1603 1603 1602 1602 1602 1602 1602 1602 1602 1602 1603 1603 1603 1603 1603 1603 1603 1603 1602 1602 1602 1602 1602 1602 1602 1602',
  'exited/remote-no/conversation': '1603 1603 1603 1603 1603 1603 1603 1603 1602 1602 1602 1602 1602 1602 1602 1602 1603 1603 1603 1603 1603 1603 1603 1603 1602 1602 1602 1602 1602 1602 1602 1602',
  'restorable/local/bare': '13a3 13a3 13a3 13a3 1323 1323 1323 1323 13a2 13a2 13a2 13a2 1322 1322 1322 1322 1223 1223 1223 1223 1223 1223 1223 1223 1222 1222 1222 1222 1222 1222 1222 1222',
  'restorable/local/scrollback': '13a3 13a3 13a3 13a3 1323 1323 1323 1323 13a2 13a2 13a2 13a2 1322 1322 1322 1322 1223 1223 1223 1223 1223 1223 1223 1223 1222 1222 1222 1222 1222 1222 1222 1222',
  'restorable/local/conversation': '13b3 13b3 13b3 13b3 1333 1333 1333 1333 13b2 13b2 13b2 13b2 1332 1332 1332 1332 1233 1233 1233 1233 1233 1233 1233 1233 1232 1232 1232 1232 1232 1232 1232 1232',
  'restorable/gone/bare': '13a3 13a3 13a3 13a3 1323 1323 1323 1323 13a2 13a2 13a2 13a2 1322 1322 1322 1322 1223 1223 1223 1223 1223 1223 1223 1223 1222 1222 1222 1222 1222 1222 1222 1222',
  'restorable/gone/scrollback': '13a3 13a3 13a3 13a3 1323 1323 1323 1323 13a2 13a2 13a2 13a2 1322 1322 1322 1322 1223 1223 1223 1223 1223 1223 1223 1223 1222 1222 1222 1222 1222 1222 1222 1222',
  'restorable/gone/conversation': '13b3 13b3 13b3 13b3 1333 1333 1333 1333 13b2 13b2 13b2 13b2 1332 1332 1332 1332 1233 1233 1233 1233 1233 1233 1233 1233 1232 1232 1232 1232 1232 1232 1232 1232',
  'restorable/remote-yes/bare': '1783 1783 1783 1783 1703 1703 1703 1703 1782 1782 1782 1782 1702 1702 1702 1702 1603 1603 1603 1603 1603 1603 1603 1603 1602 1602 1602 1602 1602 1602 1602 1602',
  'restorable/remote-yes/scrollback': '1783 1783 1783 1783 1703 1703 1703 1703 1782 1782 1782 1782 1702 1702 1702 1702 1603 1603 1603 1603 1603 1603 1603 1603 1602 1602 1602 1602 1602 1602 1602 1602',
  'restorable/remote-yes/conversation': '1783 1783 1783 1783 1703 1703 1703 1703 1782 1782 1782 1782 1702 1702 1702 1702 1603 1603 1603 1603 1603 1603 1603 1603 1602 1602 1602 1602 1602 1602 1602 1602',
  'restorable/remote-no/bare': '1603 1603 1603 1603 1603 1603 1603 1603 1602 1602 1602 1602 1602 1602 1602 1602 1603 1603 1603 1603 1603 1603 1603 1603 1602 1602 1602 1602 1602 1602 1602 1602',
  'restorable/remote-no/scrollback': '1603 1603 1603 1603 1603 1603 1603 1603 1602 1602 1602 1602 1602 1602 1602 1602 1603 1603 1603 1603 1603 1603 1603 1603 1602 1602 1602 1602 1602 1602 1602 1602',
  'restorable/remote-no/conversation': '1603 1603 1603 1603 1603 1603 1603 1603 1602 1602 1602 1602 1602 1602 1602 1602 1603 1603 1603 1603 1603 1603 1603 1603 1602 1602 1602 1602 1602 1602 1602 1602',
  'unknown/local/bare': '4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000',
  'unknown/local/scrollback': '4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000',
  'unknown/local/conversation': '4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000',
  'unknown/gone/bare': '4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000',
  'unknown/gone/scrollback': '4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000',
  'unknown/gone/conversation': '4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000 4000',
  'unknown/remote-yes/bare': '4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400',
  'unknown/remote-yes/scrollback': '4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400',
  'unknown/remote-yes/conversation': '4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400',
  'unknown/remote-no/bare': '4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400',
  'unknown/remote-no/scrollback': '4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400',
  'unknown/remote-no/conversation': '4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400 4400',
  'discarded/local/bare': '2040 2040 2040 2040 2000 2000 2000 2000 2040 2040 2040 2040 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000',
  'discarded/local/scrollback': '2040 2040 2040 2040 2000 2000 2000 2000 2040 2040 2040 2040 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000',
  'discarded/local/conversation': '2040 2040 2040 2040 2000 2000 2000 2000 2040 2040 2040 2040 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000',
  'discarded/gone/bare': '2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000',
  'discarded/gone/scrollback': '2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000',
  'discarded/gone/conversation': '2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000 2000',
  'discarded/remote-yes/bare': '2440 2440 2440 2440 2400 2400 2400 2400 2440 2440 2440 2440 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400',
  'discarded/remote-yes/scrollback': '2440 2440 2440 2440 2400 2400 2400 2400 2440 2440 2440 2440 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400',
  'discarded/remote-yes/conversation': '2440 2440 2440 2440 2400 2400 2400 2400 2440 2440 2440 2440 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400',
  'discarded/remote-no/bare': '2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400',
  'discarded/remote-no/scrollback': '2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400',
  'discarded/remote-no/conversation': '2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400 2400'
};

describe('Phase 317: the moved gate answers what the parent answered', () => {
  it('the table covers every status, placement and material, and nothing else', () => {
    const keys = Object.keys(PARENT).sort();
    const want = SESSION_STATUSES.flatMap((s) =>
      PLACEMENTS.flatMap((p) => MATERIALS.map((m) => `${s}/${p}/${m}`))
    ).sort();
    expect(keys).toEqual(want);
    expect(envs()).toHaveLength(32);
    for (const words of Object.values(PARENT)) expect(words.split(' ')).toHaveLength(32);
  });

  it("every field of every row in every environment equals the parent's", () => {
    const wrong: string[] = [];
    const all = envs();
    for (const status of SESSION_STATUSES) {
      for (const placement of PLACEMENTS) {
        for (const material of MATERIALS) {
          const key = `${status}/${placement}/${material}`;
          const want = (PARENT[key] ?? '').split(' ');
          all.forEach((env, i) => {
            const gates = sessionActionGates(rowOf(status, placement, material), status, env);
            const got = wordOf(gates as unknown as Record<string, boolean>);
            const expected = want[i] ?? '????';
            if (got !== expected) {
              wrong.push(`${key} env #${String(i)} ${JSON.stringify(env)}: ${differing(got, expected).join(', ')}`);
            }
          });
        }
      }
    }
    expect(wrong).toEqual([]);
  });
});

describe("Phase 317: canEnd reads no environment, so the door's is as good as any", () => {
  it('DOOR_GATE_ENV is frozen and asks for nothing', () => {
    expect(Object.isFrozen(DOOR_GATE_ENV)).toBe(true);
    expect(DOOR_GATE_ENV).toEqual({
      canRestore: false,
      canDiscard: false,
      shellPathReady: false,
      handback: undefined
    });
  });

  it('over every row, canEnd is ONE answer across all 32 environments and DOOR_GATE_ENV', () => {
    const spread: string[] = [];
    for (const status of SESSION_STATUSES) {
      for (const placement of PLACEMENTS) {
        for (const material of MATERIALS) {
          const row = rowOf(status, placement, material);
          const door = sessionActionGates(row, status, DOOR_GATE_ENV).canEnd;
          const answers = new Set(envs().map((env) => sessionActionGates(row, status, env).canEnd));
          if (answers.size !== 1 || !answers.has(door)) spread.push(`${status}/${placement}/${material}`);
        }
      }
    }
    expect(spread).toEqual([]);
  });

  it('canEnd is a live row, and only a live row, on this Mac and on a machine', () => {
    const live = new Set<SessionStatus>(['running', 'idle', 'needs_input']);
    for (const status of SESSION_STATUSES) {
      for (const placement of PLACEMENTS) {
        const gates = sessionActionGates(rowOf(status, placement, 'bare'), status, DOOR_GATE_ENV);
        expect(gates.canEnd, `${status}/${placement}`).toBe(live.has(status));
      }
    }
  });
});
