/**
 * The class rides beside the error the spawn seam builds (Phase 231, item 4).
 *
 * `remote-run.test.ts` and `remote-sessions.test.ts` replace the spawn seam
 * and tag their own errors, so neither of them can prove that the REAL
 * `classifyExecFailure` records the class. This file drives the shipping
 * `execOn` and `execRemoteShell` over a replaced `child_process` whose one
 * program fails with ssh's own words, and reads the class back through
 * `machineClassOf`, which is what the door and the poll ask.
 *
 * Nothing here spawns. The replacement never starts a process; it rejects
 * with the bytes a real ssh printed, taken from the taxonomy's own phrase
 * table, and hands the ledger a child with a pid and a kill and nothing else,
 * which is all the hold reads.
 */

import { describe, expect, it, vi } from 'vitest';
import { GmuxError } from '../../errors';
import type { RemoteMachineContext } from '../context';
import { machineClassOf } from '../errors';
import { execOn, execRemoteShell } from '../exec-plane';
import { LINK_FAILURE_CLASSES, isLinkFailure } from '../liveness';

/** What the next spawn fails with. */
let failure: { message: string; stderr: string; code?: string } = { message: '', stderr: '' };

vi.mock('node:child_process', async (importOriginal) => {
  const real = await importOriginal<typeof import('node:child_process')>();
  const { promisify } = await import('node:util');
  const custom = (): Promise<never> & { child: { pid: number; kill: () => boolean } } => {
    const err = Object.assign(new Error(failure.message), {
      stderr: failure.stderr,
      ...(failure.code !== undefined ? { code: failure.code } : {})
    });
    const rejected = Promise.reject(err) as Promise<never> & {
      child: { pid: number; kill: () => boolean };
    };
    rejected.catch(() => undefined);
    rejected.child = { pid: 4242, kill: () => true };
    return rejected;
  };
  const execFile = Object.assign(
    () => {
      throw new Error('the callback form is not what exec-plane uses');
    },
    { [promisify.custom]: custom }
  );
  return { ...real, execFile };
});

const CTX: RemoteMachineContext = {
  kind: 'remote',
  machineId: 'popos',
  sshBin: '/usr/bin/ssh',
  host: 'pop-os.tail1a2b.ts.net',
  user: null,
  port: null,
  remoteTmuxPath: '/usr/bin/tmux',
  socket: 'gmux-p231-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' }
};

async function failed(work: () => Promise<unknown>): Promise<unknown> {
  try {
    await work();
  } catch (err) {
    return err;
  }
  throw new Error('the spawn did not fail');
}

/** ssh's own words, one per taxonomy class this seam can meet. */
const SSH_SAID: readonly [string, string][] = [
  ['unreachable', 'ssh: connect to host pop-os.tail1a2b.ts.net port 22: No route to host'],
  ['unreachable', 'ssh: connect to host pop-os.tail1a2b.ts.net port 22: Operation timed out'],
  ['refused', 'ssh: connect to host pop-os.tail1a2b.ts.net port 22: Connection refused'],
  ['not-resolved', 'ssh: Could not resolve hostname pop-os.tail1a2b.ts.net: nodename nor servname provided, or not known'],
  ['auth-refused', 'gdc@pop-os.tail1a2b.ts.net: Permission denied (publickey).'],
  ['no-server', 'no server running on /private/tmp/tmux-501/gmux-p231-unit']
];

describe('the class recorded beside the error', () => {
  for (const [cls, stderr] of SSH_SAID) {
    it(`records ${cls} for "${stderr.slice(0, 40)}" through both doors`, async () => {
      failure = { message: 'Command failed', stderr };
      const viaList = await failed(() => execOn(CTX, ['list-sessions']));
      const viaShell = await failed(() => execRemoteShell(CTX, 'printf ok'));
      for (const err of [viaList, viaShell]) {
        expect(err).toBeInstanceOf(GmuxError);
        expect(machineClassOf(err)).toBe(cls);
        expect(isLinkFailure(machineClassOf(err))).toBe(LINK_FAILURE_CLASSES.includes(cls));
      }
    });
  }

  it('records nothing for a child killed at the cap with nothing printed', async () => {
    // The shape of a slow verb: SIGKILL at the timeout, empty stderr. This is
    // the failure that used to take every view dark, and it is no class at all.
    failure = { message: 'Command failed: killed', stderr: '' };
    const err = await failed(() => execRemoteShell(CTX, 'printf ok'));
    expect(err).toBeInstanceOf(GmuxError);
    expect(machineClassOf(err)).toBeNull();
    expect(isLinkFailure(machineClassOf(err))).toBe(false);
  });

  it('records nothing for tmux\'s own sentences about a session', async () => {
    failure = { message: 'Command failed', stderr: "can't find session: $9" };
    const err = await failed(() => execOn(CTX, ['show-environment', '-t', '$9']));
    expect(err).toBeInstanceOf(GmuxError);
    expect((err as GmuxError).payload.code).toBe('SESSION_NOT_FOUND');
    expect(machineClassOf(err)).toBeNull();
  });

  it('records nothing when this Mac has no ssh at all', async () => {
    failure = { message: 'spawn /usr/bin/ssh ENOENT', stderr: '', code: 'ENOENT' };
    const err = await failed(() => execRemoteShell(CTX, 'printf ok'));
    expect((err as GmuxError).payload.code).toBe('TMUX_NOT_FOUND');
    expect(machineClassOf(err)).toBeNull();
  });

  it('answers null for anything that is not an error object', () => {
    expect(machineClassOf(null)).toBeNull();
    expect(machineClassOf('unreachable')).toBeNull();
    expect(machineClassOf(new Error('untagged'))).toBeNull();
  });
});
