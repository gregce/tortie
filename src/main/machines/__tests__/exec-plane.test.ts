/**
 * The verb ledger, and the three refusals in front of the one door (Phase 69, M2).
 *
 * NOTHING HERE RUNS A COMMAND. Every test drives the pure checks that stand before
 * the spawn, which is the point: the property being tested is that a command is
 * never HANDED to a machine, and a test that let one through to find out would be
 * the defect it is testing for.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { GmuxError } from '../../errors';
import {
  bumpMachineGeneration,
  resetMachineContexts,
  setMachineRemotePath,
  type RemoteMachineContext
} from '../context';
import {
  PATH_BEFORE_MUTATION,
  REMOTE_VERB_LEDGER,
  REPEAT_UNSAFE,
  VERBS_THIS_RUNG_REFUSES,
  VERB_NOT_IN_LEDGER,
  assertRemoteVerbAllowed,
  ledgerRowFor,
  remoteVerbsOf,
  type LedgerRow
} from '../exec-plane';

const CTX: RemoteMachineContext = {
  kind: 'remote',
  machineId: 'popos',
  sshBin: '/usr/bin/ssh',
  host: 'pop-os.tail1a2b.ts.net',
  user: null,
  port: null,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p69-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' }
};

afterEach(() => {
  resetMachineContexts();
});

/** The refusal a call produced, or null when it did not refuse. */
function refusalOf(work: () => void): GmuxError['payload'] | null {
  try {
    work();
    return null;
  } catch (err) {
    return err instanceof GmuxError ? err.payload : null;
  }
}

describe('the ledger', () => {
  it('says why every row is safe to run twice, in words', () => {
    for (const row of REMOTE_VERB_LEDGER) {
      expect(row.reason.length).toBeGreaterThan(10);
      expect(row.reason.endsWith('.')).toBe(true);
    }
  });

  it('holds none of the six verbs this release refuses', () => {
    // This is the scope fence in code rather than in prose. A later rung adds each
    // of these WITH its repeat reasoning written down beside it.
    for (const verb of VERBS_THIS_RUNG_REFUSES) {
      expect(ledgerRowFor(verb)).toBeNull();
    }
  });

  it('holds every verb this release actually sends', () => {
    for (const verb of [
      'list-sessions',
      'display-message',
      'show-options',
      'show-environment',
      'start-server',
      'set-option',
      'set-environment'
    ]) {
      expect(ledgerRowFor(verb)).not.toBeNull();
    }
  });

  it('has no unsafe row, and no mutating row, in this release', () => {
    expect(REMOTE_VERB_LEDGER.filter((row) => row.repeat === 'unsafe')).toEqual([]);
    expect(REMOTE_VERB_LEDGER.filter((row) => row.kind === 'mutating')).toEqual([]);
  });
});

describe('every verb in one command, because tmux takes more than one', () => {
  it('reads both sides of a chain', () => {
    expect(
      remoteVerbsOf(['start-server', ';', 'set-option', '-s', 'exit-empty', 'off'])
    ).toEqual(['start-server', 'set-option']);
  });

  it('reads a single command as one verb', () => {
    expect(remoteVerbsOf(['list-sessions', '-F', '#{session_id}'])).toEqual([
      'list-sessions'
    ]);
  });

  it('refuses a second verb riding along in a chain', () => {
    // Reading only args[0] would let new-session cross to a machine behind a verb
    // that is on the ledger, which is the one way the fence could be got round.
    const payload = refusalOf(() => {
      assertRemoteVerbAllowed(CTX, ['start-server', ';', 'new-session', '-d']);
    });
    expect(payload?.message).toBe(VERB_NOT_IN_LEDGER);
    expect(payload?.detail ?? '').toContain('new-session');
  });
});

describe('the three refusals', () => {
  it('refuses a verb nobody wrote down, and names it in the detail', () => {
    const payload = refusalOf(() => {
      assertRemoteVerbAllowed(CTX, ['kill-session', '-t', '$1']);
    });
    expect(payload?.message).toBe(VERB_NOT_IN_LEDGER);
    expect(payload?.detail ?? '').toContain('kill-session');
    expect(payload?.detail ?? '').toContain('popos');
  });

  it('refuses a verb whose repeat class is unsafe', () => {
    // The class has no members in this release, so a synthetic row is the only way
    // this branch is ever watched firing. `src/main/machines/exec-smoke.ts` does
    // the same thing against the built bundle, because rollup deletes a branch
    // whose condition it can prove.
    const unsafe: LedgerRow = {
      verb: 'probe-unsafe',
      repeat: 'unsafe',
      kind: 'server-setup',
      reason: 'a synthetic row.'
    };
    const payload = refusalOf(() => {
      assertRemoteVerbAllowed(CTX, ['probe-unsafe'], [...REMOTE_VERB_LEDGER, unsafe]);
    });
    expect(payload?.message).toBe(REPEAT_UNSAFE);
  });

  it('refuses a mutating verb while no program list is recorded', () => {
    const mutating: LedgerRow = {
      verb: 'probe-mutating',
      repeat: 'safe',
      kind: 'mutating',
      reason: 'a synthetic row.'
    };
    bumpMachineGeneration(CTX.machineId);
    const payload = refusalOf(() => {
      assertRemoteVerbAllowed(
        CTX,
        ['probe-mutating'],
        [...REMOTE_VERB_LEDGER, mutating]
      );
    });
    expect(payload?.message).toBe(PATH_BEFORE_MUTATION);
  });

  it('allows the same mutating verb once the program list is recorded', () => {
    const mutating: LedgerRow = {
      verb: 'probe-mutating',
      repeat: 'safe',
      kind: 'mutating',
      reason: 'a synthetic row.'
    };
    bumpMachineGeneration(CTX.machineId);
    setMachineRemotePath(CTX.machineId, '/usr/local/bin:/usr/bin:/bin');
    const rows = assertRemoteVerbAllowed(
      CTX,
      ['probe-mutating'],
      [...REMOTE_VERB_LEDGER, mutating]
    );
    expect(rows.map((row) => row.verb)).toEqual(['probe-mutating']);
  });

  it('refuses again after a new connection drops the recorded list', () => {
    // A server that was just born has a fresh environment, so carrying the
    // previous connection's answer forward is how a stale program list would
    // reach a pane.
    const mutating: LedgerRow = {
      verb: 'probe-mutating',
      repeat: 'safe',
      kind: 'mutating',
      reason: 'a synthetic row.'
    };
    setMachineRemotePath(CTX.machineId, '/usr/bin:/bin');
    bumpMachineGeneration(CTX.machineId);
    const payload = refusalOf(() => {
      assertRemoteVerbAllowed(
        CTX,
        ['probe-mutating'],
        [...REMOTE_VERB_LEDGER, mutating]
      );
    });
    expect(payload?.message).toBe(PATH_BEFORE_MUTATION);
  });

  it('lets every ledger read through with no program list at all', () => {
    // A read changes nothing, so it cannot run the wrong copy of anything.
    for (const row of REMOTE_VERB_LEDGER) {
      expect(() => assertRemoteVerbAllowed(CTX, [row.verb])).not.toThrow();
    }
  });
});
