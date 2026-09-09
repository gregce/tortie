/**
 * A machine nothing reached, described as a machine whose program is broken
 * (Phase 235, item 3).
 *
 * ## The defect, measured rather than reasoned
 *
 * MEASURED 2026-09-08 against 192.0.2.1, documentation address space that
 * routes nowhere, through `build/ssh-run.mjs` with the product's own nine ssh
 * options. ssh took **10,013 ms** and printed
 *
 *   ssh: connect to host 192.0.2.1 port 22: Operation timed out
 *
 * against a version read whose deadline is **10,000 ms**. So the phrase table
 * has the right answer and never sees the string, by THIRTEEN MILLISECONDS:
 * `execFile` kills the child at the deadline, `classifyExecFailure` reads
 * `e.stderr ?? ''`, and what the classifier is handed is the empty string,
 * which is `unknown` and not one of the eight classes that mean unreached. The
 * read fell through to `unreadable`, and what a person read about a machine
 * nothing had ever touched was
 *
 *   The program at /usr/local/bin/tmux on this machine would not report its
 *   version. Tortie will not use a program it cannot identify.
 *
 * driven end to end on his Mac Pro at **20,013 ms**, being the two reads.
 *
 * ## What this file pins
 *
 * That the deadline answers its OWN class. `timed-out` is already a member of
 * `UNREACHED_CLASSES` and already has copy, and until this phase nothing could
 * produce it, because `PHRASE_TABLE` holds no phrase that answers it. The
 * number is READ here and never moved, which is the charter's own refusal.
 *
 * NOTHING HERE RUNS A COMMAND, and nothing here waits ten seconds. The exec
 * plane is replaced by a function that moves a fake clock and then fails the
 * way a killed child fails, which is the instrument `./prepare.test.ts` uses.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemoteMachineContext } from '../context';

const CTX: RemoteMachineContext = {
  kind: 'remote',
  machineId: 'blackhole',
  sshBin: '/usr/bin/ssh',
  host: '192.0.2.1',
  user: 'gdc',
  port: 22,
  remoteTmuxPath: '/usr/local/bin/tmux',
  socket: 'gmux-p235-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' },
  acceptedTmuxVersion: null
};

/** How long each door burns before it fails, and what it fails with. */
let verbSpent = 0;
let shellSpent = 0;
let verbAnswer: string | Error = new Error('');
let shellAnswer: string | Error = new Error('');

const spend = (ms: number): void => {
  vi.setSystemTime(Date.now() + ms);
};

vi.mock('../exec-plane', () => ({
  execOn: () => {
    spend(verbSpent);
    return verbAnswer instanceof Error
      ? Promise.reject(verbAnswer)
      : Promise.resolve(verbAnswer);
  },
  execRemoteShell: () => {
    spend(shellSpent);
    return shellAnswer instanceof Error
      ? Promise.reject(shellAnswer)
      : Promise.resolve(shellAnswer);
  }
}));

const { readRemoteTmuxVersion, REMOTE_VERSION_TIMEOUT_MS } = await import(
  '../prepare'
);
const { classifyMachineOutput, machineOutcomeCopy } = await import('../errors');

/**
 * WHAT A KILLED CHILD LEAVES. `classifyExecFailure` composed its sentence from
 * `e.message` with an empty stderr in front of it, so nothing in the text names
 * a reason. This is the string the classifier really got in the measured run.
 */
const KILLED = new Error(
  'blackhole: tmux  failed: Command failed: /usr/bin/ssh …\n'
);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-08T00:00:00Z'));
  verbSpent = REMOTE_VERSION_TIMEOUT_MS;
  shellSpent = REMOTE_VERSION_TIMEOUT_MS;
  verbAnswer = KILLED;
  shellAnswer = KILLED;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the thirteen milliseconds', () => {
  it('is what the two classifier readings are', () => {
    expect(
      classifyMachineOutput(
        'ssh: connect to host 192.0.2.1 port 22: Operation timed out'
      )
    ).toBe('unreachable');
    expect(classifyMachineOutput('')).toBe('unknown');
  });
});

describe('a version read that used its whole deadline', () => {
  it('is unreached, and the class is the deadline’s own', async () => {
    expect(await readRemoteTmuxVersion(CTX)).toEqual({
      kind: 'unreached',
      cls: 'timed-out',
      detail: KILLED.message
    });
  });

  it('says the test ran out of time, and nothing about any program', async () => {
    const read = await readRemoteTmuxVersion(CTX);
    expect(read.kind).toBe('unreached');
    const copy = machineOutcomeCopy('timed-out');
    expect(copy.headline).toBe('The test ran out of time.');
    expect(copy.detail).not.toContain('version');
    expect(copy.detail).not.toContain(CTX.remoteTmuxPath);
    expect(copy.alarm).toBe(false);
  });

  it('measures THIS read’s deadline and not the first read’s as well', async () => {
    // The verb door burns the whole deadline too, which is what a blackhole
    // machine really does — his Mac Pro's blackhole row spent 20,013 ms. A
    // clock started at the top of the function would call a shell read that
    // failed instantly a timeout.
    shellSpent = 12;
    expect(await readRemoteTmuxVersion(CTX)).toEqual({ kind: 'unreadable' });
  });
});

describe('what the deadline branch must not take', () => {
  it('leaves a machine that answered with a version alone', async () => {
    shellSpent = 0;
    shellAnswer = 'tmux 3.6a\n';
    expect(await readRemoteTmuxVersion(CTX)).toEqual({
      kind: 'version',
      version: '3.6a'
    });
  });

  it('leaves a program that really would not name a version alone', async () => {
    shellSpent = 20;
    shellAnswer = 'usage: tmux [-2CDlNuVv]\n';
    expect(await readRemoteTmuxVersion(CTX)).toEqual({ kind: 'unreadable' });
  });

  it('keeps the words of a machine that answered and said no', async () => {
    // A refusal the taxonomy recognises keeps its OWN class even when the read
    // also used its deadline, because that machine answered and said something.
    shellAnswer = new Error(
      'ssh: connect to host 192.0.2.1 port 22: Permission denied (publickey).'
    );
    expect(await readRemoteTmuxVersion(CTX)).toEqual({
      kind: 'unreached',
      cls: 'auth-refused',
      detail: (shellAnswer as Error).message
    });
  });

  it('keeps tmux’s own no-server sentence as an answer, not a timeout', async () => {
    // `no-server` is deliberately outside `UNREACHED_CLASSES`: it is the
    // ordinary answer for a machine nobody has prepared, and it comes from a
    // machine that DID answer.
    shellSpent = 30;
    shellAnswer = new Error(
      'no server running on /private/tmp/tmux-501/gmux-p235-unit'
    );
    expect(await readRemoteTmuxVersion(CTX)).toEqual({ kind: 'unreadable' });
  });

  it('falls back to unreadable when the clock reads short', async () => {
    // The wall clock can jump backwards. That direction is the safe one: the
    // read behaves the way it did before this phase.
    shellSpent = -5_000;
    expect(await readRemoteTmuxVersion(CTX)).toEqual({ kind: 'unreadable' });
  });
});

describe('the number the charter refuses to move', () => {
  it('is still ten seconds', () => {
    expect(REMOTE_VERSION_TIMEOUT_MS).toBe(10_000);
  });
});
