/**
 * The verb ledger, and the three refusals in front of the one door (Phase 69, M2).
 *
 * NOTHING HERE RUNS A COMMAND. Every test drives the pure checks that stand before
 * the spawn, which is the point: the property being tested is that a command is
 * never HANDED to a machine, and a test that let one through to find out would be
 * the defect it is testing for.
 */

import { execFile } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GmuxError } from '../../errors';
import {
  bumpMachineGeneration,
  resetMachineContexts,
  setMachineRemotePath,
  type RemoteMachineContext
} from '../context';
import {
  REMOTE_EXEC_SHUTDOWN,
  beginRemoteExecutionShutdown,
  liveRemoteExecutions,
  resetRemoteExecutionLedgerForTests,
  settledRemoteExecutions
} from '../execution-ledger';
import {
  ARMED_TEXT_REFUSED,
  PATH_BEFORE_MUTATION,
  REMOTE_VERB_LEDGER,
  REPEAT_UNSAFE,
  VERBS_THIS_RUNG_REFUSES,
  VERB_NOT_IN_LEDGER,
  assertRemoteVerbAllowed,
  composeArmedResumeArgv,
  execOn,
  ledgerRowFor,
  remoteVerbsOf,
  sendArmedResumeText,
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
  resetRemoteExecutionLedgerForTests();
  vi.restoreAllMocks();
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

  it('holds none of the three verbs Tortie refuses to send', () => {
    // This is the scope fence in code rather than in prose. A later rung adds each
    // of these WITH its repeat reasoning written down beside it, which is what
    // Phase 70 did for new-session, kill-session and rename-session.
    for (const verb of VERBS_THIS_RUNG_REFUSES) {
      expect(ledgerRowFor(verb)).toBeNull();
    }
  });

  it('refuses attach-session forever, because attach is a different plane', () => {
    // Attach is a pty rather than a one-shot exec, and a person's keystrokes must
    // never be reachable through this door.
    expect(VERBS_THIS_RUNG_REFUSES).toContain('attach-session');
    expect(ledgerRowFor('attach-session')).toBeNull();
  });

  it('holds every verb this release actually sends', () => {
    for (const verb of [
      'list-sessions',
      'display-message',
      'show-options',
      'show-environment',
      'start-server',
      'set-option',
      'set-environment',
      // Phase 70's three.
      'new-session',
      'kill-session',
      'rename-session'
    ]) {
      expect(ledgerRowFor(verb)).not.toBeNull();
    }
  });

  it('has exactly one unsafe row, and it names the guard that finds a repeat', () => {
    // PHASE 89 GAVE THE CLASS ITS FIRST MEMBER. Before it the list was empty and
    // the refusal in front of it had no member to exercise it. An unsafe row
    // with no guard is refused by every caller, so the guard is what the row is
    // worth.
    const unsafe = REMOTE_VERB_LEDGER.filter((row) => row.repeat === 'unsafe');
    expect(unsafe.map((row) => row.verb)).toEqual(['send-keys']);
    expect(unsafe[0]?.guard).toBe('armed-resume-read-back');
    expect((unsafe[0]?.reason ?? '').length).toBeGreaterThan(120);
  });

  it('gives every safe row no guard, because a safe row needs none', () => {
    for (const row of REMOTE_VERB_LEDGER) {
      if (row.repeat === 'safe') expect(row.guard).toBeUndefined();
    }
  });

  it('marks the four verbs that change something as mutating', () => {
    // A mutating verb is refused until the machine's own program search list has
    // been read for the current connection. Phase 69 wrote that rule with no
    // member to exercise it, Phase 70 gave it its first three, and Phase 89
    // added the fourth.
    expect(
      REMOTE_VERB_LEDGER.filter((row) => row.kind === 'mutating').map(
        (row) => row.verb
      )
    ).toEqual(['new-session', 'kill-session', 'rename-session', 'send-keys']);
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
    // Reading only args[0] would let a verb nobody wrote down cross to a machine
    // behind a verb that is on the ledger, which is the one way the fence could
    // be got round.
    const payload = refusalOf(() => {
      assertRemoteVerbAllowed(CTX, ['start-server', ';', 'kill-server']);
    });
    expect(payload?.message).toBe(VERB_NOT_IN_LEDGER);
    expect(payload?.detail ?? '').toContain('kill-server');
  });
});

describe('the three refusals', () => {
  it('refuses a verb nobody wrote down, and names it in the detail', () => {
    const payload = refusalOf(() => {
      assertRemoteVerbAllowed(CTX, ['respawn-pane', '-t', '$1', '-k']);
    });
    expect(payload?.message).toBe(VERB_NOT_IN_LEDGER);
    expect(payload?.detail ?? '').toContain('respawn-pane');
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
    // A read changes nothing, so it cannot run the wrong copy of anything. The
    // same is true of the two server-setup verbs, which is why the gate asks
    // about the kind rather than about the verb.
    for (const row of REMOTE_VERB_LEDGER) {
      if (row.kind === 'mutating') continue;
      expect(() => assertRemoteVerbAllowed(CTX, [row.verb])).not.toThrow();
    }
  });

  it('refuses each of the three real mutating verbs before the list is read', () => {
    // The synthetic row above proves the branch. These three prove the rule
    // reaches the verbs a person can actually cause, which is what Phase 70
    // added and what the branch was written for.
    bumpMachineGeneration(CTX.machineId);
    for (const verb of ['new-session', 'kill-session', 'rename-session']) {
      const payload = refusalOf(() => {
        assertRemoteVerbAllowed(CTX, [verb]);
      });
      expect(payload?.message).toBe(PATH_BEFORE_MUTATION);
    }
    setMachineRemotePath(CTX.machineId, '/usr/bin:/bin');
    for (const verb of ['new-session', 'kill-session', 'rename-session']) {
      expect(() => assertRemoteVerbAllowed(CTX, [verb])).not.toThrow();
    }
  });
});


// ---------------------------------------------------------------------------
// PHASE 89. The one door that may type on another machine
// ---------------------------------------------------------------------------
//
// NOTHING HERE SENDS ANYTHING EITHER. Every case below is refused before the
// spawn, which is the property being tested: a text Tortie did not compose, and
// a text carrying Enter, never reach a machine at all.

describe('the general door still refuses send-keys', () => {
  it('refuses the verb through assertRemoteVerbAllowed with no guard', () => {
    const payload = refusalOf(() => {
      assertRemoteVerbAllowed(CTX, ['send-keys', '-t', '$1', '-l', 'x']);
    });
    expect(payload?.message).toBe(REPEAT_UNSAFE);
    expect(payload?.detail ?? '').toContain('send-keys');
  });

  it('refuses the verb through execOn, which is the door every caller uses', async () => {
    // Phase 89 gave this refusal its first member in production. Before it, the
    // branch had none and only a synthetic ledger row reached it.
    setMachineRemotePath(CTX.machineId, '/usr/bin:/bin');
    let message = '';
    try {
      await execOn(CTX, ['send-keys', '-t', '$1', '-l', 'x']);
    } catch (err) {
      message = err instanceof GmuxError ? err.payload.message : '';
    }
    expect(message).toBe(REPEAT_UNSAFE);
  });

  it('refuses an unsafe row that names no guard at all', () => {
    const unguarded: LedgerRow = {
      verb: 'probe-unguarded',
      repeat: 'unsafe',
      kind: 'server-setup',
      reason: 'a synthetic row with no guard.'
    };
    const payload = refusalOf(() => {
      assertRemoteVerbAllowed(
        CTX,
        ['probe-unguarded'],
        [...REMOTE_VERB_LEDGER, unguarded],
        'armed-resume-read-back'
      );
    });
    expect(payload?.message).toBe(REPEAT_UNSAFE);
  });
});

describe('the armed resume door', () => {
  /** The refusal a call produced, or null when it did not refuse. */
  async function refusalOfAsync(
    work: () => Promise<unknown>
  ): Promise<GmuxError['payload'] | null> {
    try {
      await work();
      return null;
    } catch (err) {
      return err instanceof GmuxError ? err.payload : null;
    }
  }

  it('composes five elements, carries -l, and carries no key name', () => {
    const argv = composeArmedResumeArgv('$7', 'claude --resume abc');
    expect(argv).toEqual(['send-keys', '-t', '$7', '-l', 'claude --resume abc']);
    expect(argv).toHaveLength(5);
    expect(argv).not.toContain('Enter');
    expect(argv).not.toContain('C-m');
    expect(argv).not.toContain(';');
  });

  it('refuses a text carrying a newline, because that newline is Enter', async () => {
    const payload = await refusalOfAsync(() =>
      sendArmedResumeText(CTX, '$7', 'claude --resume abc\n')
    );
    expect(payload?.message).toBe(ARMED_TEXT_REFUSED);
  });

  it('refuses a text carrying a carriage return', async () => {
    const payload = await refusalOfAsync(() =>
      sendArmedResumeText(CTX, '$7', 'claude --resume abc\r')
    );
    expect(payload?.message).toBe(ARMED_TEXT_REFUSED);
  });

  it('refuses a text carrying any other control character', async () => {
    const payload = await refusalOfAsync(() =>
      sendArmedResumeText(
        CTX,
        '$7',
        `claude --resume abc${String.fromCharCode(1)}`
      )
    );
    expect(payload?.message).toBe(ARMED_TEXT_REFUSED);
  });

  it('refuses an empty text and a text over the cap', async () => {
    expect(
      (await refusalOfAsync(() => sendArmedResumeText(CTX, '$7', '')))?.message
    ).toBe(ARMED_TEXT_REFUSED);
    expect(
      (
        await refusalOfAsync(() =>
          sendArmedResumeText(CTX, '$7', 'x'.repeat(1001))
        )
      )?.message
    ).toBe(ARMED_TEXT_REFUSED);
  });

  it('refuses a target that is not an immutable identifier', async () => {
    // A name can be renamed between the read and the send, and the send would
    // then land on a different session.
    for (const target of ['my-session', '=my-session', '$', '$7:1', '', '%3']) {
      const payload = await refusalOfAsync(() =>
        sendArmedResumeText(CTX, target, 'claude --resume abc')
      );
      expect(payload?.message).toBe(ARMED_TEXT_REFUSED);
    }
  });

  it('refuses before the program search list has been read', async () => {
    // The row is mutating, so the ordering gate applies to it the way it applies
    // to a create. A machine nobody prepared gets nothing typed on it.
    bumpMachineGeneration(CTX.machineId);
    const payload = await refusalOfAsync(() =>
      sendArmedResumeText(CTX, '$7', 'claude --resume abc')
    );
    expect(payload?.message).toBe(PATH_BEFORE_MUTATION);
  });
});

// ---------------------------------------------------------------------------
// PHASE 118. The ledger at the seam.
// ---------------------------------------------------------------------------

/**
 * NOTHING HERE SPAWNS ANYTHING. Every assertion is about a call that was
 * REFUSED, which is the property: after the quit begins, no argv for a remote
 * command is ever composed and no ssh child is ever started. The live half, with
 * a real ssh child under a real clone and a real teardown, is
 * `npm run smoke:p118`.
 */
describe('the remote execution ledger at the spawn seam', () => {
  /** The refusal a call produced, or null when it did not refuse. */
  async function refusalOfAsync(
    work: () => Promise<unknown>
  ): Promise<GmuxError['payload'] | null> {
    try {
      await work();
      return null;
    } catch (err) {
      return err instanceof GmuxError ? err.payload : null;
    }
  }

  it('refuses a remote command once the quit began, before anything is composed', async () => {
    setMachineRemotePath(CTX.machineId, '/usr/bin');
    beginRemoteExecutionShutdown();
    const payload = await refusalOfAsync(() =>
      execOn(CTX, ['list-sessions', '-F', '#{session_id}'])
    );
    expect(payload?.code).toBe('SHUTTING_DOWN');
    expect(payload?.message).toBe(REMOTE_EXEC_SHUTDOWN);
    // A refused call opens no entry, so nothing was spawned and nothing has to
    // be joined.
    expect(liveRemoteExecutions()).toHaveLength(0);
    expect(settledRemoteExecutions()).toHaveLength(0);
  });

  it('refuses an armed resume once the quit began, for the same reason', async () => {
    setMachineRemotePath(CTX.machineId, '/usr/bin');
    beginRemoteExecutionShutdown();
    const payload = await refusalOfAsync(() =>
      sendArmedResumeText(CTX, '$7', 'claude --resume abc')
    );
    expect(payload?.code).toBe('SHUTTING_DOWN');
    expect(liveRemoteExecutions()).toHaveLength(0);
  });

  /**
   * A local `execFile` of tmux on this Mac takes milliseconds and is not what
   * the audit is about. Admitting it would mean a quit refusing the very
   * commands the teardown itself runs.
   */
  it('never admits a local command, so a local exec still runs during a quit', async () => {
    beginRemoteExecutionShutdown();
    // Composed here rather than through `localMachineContext()`, which reads
    // Electron's own app object and has nothing to do with the property.
    const local = {
      kind: 'local',
      machineId: 'local',
      bin: '/does/not/exist/tmux',
      socket: 'gmux-p118-unit',
      confPath: '/does/not/exist/gmux-tmux.conf',
      binSource: 'bundled',
      packaged: false
    } as unknown as Parameters<typeof execOn>[0];
    const payload = await refusalOfAsync(() =>
      execOn(local, ['list-sessions', '-F', '#{session_id}'])
    );
    // It may fail because there is no tmux server on this socket in a unit
    // test. What it must never be is the shutdown refusal.
    expect(payload?.code).not.toBe('SHUTTING_DOWN');
    expect(liveRemoteExecutions()).toHaveLength(0);
    expect(settledRemoteExecutions()).toHaveLength(0);
  });
});

/**
 * PHASE 318 (build/p318/SPEC.md §5.6.3, D22). `ExecTmuxOptions.stdin` carries
 * the phone's message to `load-buffer -` and nowhere else: refused for another
 * machine before anything is composed, and written whole and closed for this
 * Mac's tmux. The local arm runs the VENDORED tmux on a scratch socket of its
 * own with an empty configuration (no session, so no shell is ever started),
 * and ends that server and unlinks its socket in a `finally`. It never names
 * the real socket.
 */
describe('standard input (Phase 318)', () => {
  const WORDS = 'CANARY phone words; -R ls -la\nsecond line';

  async function refusalOfStdin(work: () => Promise<unknown>): Promise<GmuxError | null> {
    try {
      await work();
      return null;
    } catch (err) {
      return err instanceof GmuxError ? err : null;
    }
  }

  it('is refused for a remote context before anything is composed or admitted', async () => {
    setMachineRemotePath(CTX.machineId, '/usr/bin');
    // A missing ssh, so that even a build without this refusal spawns nothing real.
    const err = await refusalOfStdin(() =>
      execOn({ ...CTX, sshBin: '/does/not/exist/ssh' }, ['display-message', '-p', '#{session_id}'], {
        stdin: Buffer.from(WORDS, 'utf8')
      })
    );
    expect(err?.payload.code).toBe('INVALID_INPUT');
    expect(err?.payload.message).toBe('Tortie types only into sessions on this Mac.');
    // Nothing was admitted to the ledger, so nothing was spawned.
    expect(liveRemoteExecutions()).toHaveLength(0);
    expect(settledRemoteExecutions()).toHaveLength(0);
    expect(JSON.stringify(err?.payload)).not.toContain('CANARY');
  });

  it('the same remote read with no stdin is not refused for it', async () => {
    setMachineRemotePath(CTX.machineId, '/usr/bin');
    const err = await refusalOfStdin(() =>
      execOn({ ...CTX, sshBin: '/does/not/exist/ssh' }, ['display-message', '-p', '#{session_id}'])
    );
    expect(err?.payload.message).not.toBe('Tortie types only into sessions on this Mac.');
  });

  const VENDORED = join(__dirname, '..', '..', '..', '..', 'build', 'vendor', 'tmux', 'bin', 'tmux');

  it.skipIf(!existsSync(VENDORED))('is written whole and closed for this Mac, and never appears in an error', async () => {
    const socket = `p318-v-${String(process.pid)}-exec`;
    const local = {
      kind: 'local',
      machineId: 'local',
      bin: VENDORED,
      socket,
      confPath: '/dev/null',
      binSource: 'bundled',
      packaged: false
    } as unknown as Parameters<typeof execOn>[0];
    const socketFile = join(process.env['TMUX_TMPDIR'] ?? '/tmp', `tmux-${String(process.getuid?.() ?? 0)}`, socket);
    try {
      const out = await execOn(
        local,
        ['start-server', ';', 'load-buffer', '-b', 'p318', '-', ';', 'show-buffer', '-b', 'p318'],
        { stdin: Buffer.from(WORDS, 'utf8'), timeoutMs: 5_000 }
      );
      expect(out).toBe(WORDS);
      // A failure's text carries its argv and never the words on stdin.
      const failed = await refusalOfStdin(() =>
        execOn(local, ['load-buffer', '-b', 'p318', '-t', 'no-such-target', '-'], { stdin: Buffer.from(WORDS, 'utf8'), timeoutMs: 5_000 })
      );
      expect(failed).not.toBeNull();
      expect(JSON.stringify(failed?.payload)).not.toContain('CANARY');
    } finally {
      await new Promise<void>((resolve) => {
        execFile(VENDORED, ['-L', socket, '-f', '/dev/null', 'kill-server'], () => resolve());
      });
      rmSync(socketFile, { force: true });
    }
  });
});
