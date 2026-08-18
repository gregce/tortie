/**
 * What Prepare says about a machine it never reached (Phase 71, M4).
 *
 * ## The defect this file exists for
 *
 * MEASURED 2026-08-17, with the scratch sshd killed and the machine therefore
 * unreachable. Tortie's log read:
 *
 *   partitionmachine reports tmux nothing at all and this release has measured
 *   3.6a, 3.7b, so nothing was started
 *
 * and the sentence composed for the person read:
 *
 *   The program at /opt/homebrew/bin/tmux on this machine would not report its
 *   version. Tortie will not use a program it cannot identify.
 *
 * Nothing had reached that machine. Tortie had learned nothing about any program
 * on it, so both sentences were false, and the second one sends a person to look
 * at a program that is very probably fine. The cause was that both version reads
 * were caught and turned into `null`, and `null` had one meaning where it needed
 * two.
 *
 * NOTHING HERE RUNS A COMMAND. The exec plane is replaced by a function that
 * answers with what a real program printed, which is the same instrument
 * ./pane-env-rescue.test.ts uses and for the same reason.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RemoteMachineContext } from '../context';

const CTX: RemoteMachineContext = {
  kind: 'remote',
  machineId: 'popos',
  sshBin: '/usr/bin/ssh',
  host: '127.0.0.1',
  user: 'gdc',
  port: 38_001,
  remoteTmuxPath: '/opt/homebrew/bin/tmux',
  socket: 'gmux-p71-unit',
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' },
  acceptedTmuxVersion: null
};

/** What each door answers with. An Error is thrown, a string is returned. */
let verbAnswer: string | Error = '';
let shellAnswer: string | Error = '';

vi.mock('../exec-plane', () => ({
  execOn: () =>
    verbAnswer instanceof Error
      ? Promise.reject(verbAnswer)
      : Promise.resolve(verbAnswer),
  execRemoteShell: () =>
    shellAnswer instanceof Error
      ? Promise.reject(shellAnswer)
      : Promise.resolve(shellAnswer)
}));

const { readRemoteTmuxVersion } = await import('../prepare');
const { MACHINE_FEED_NOT_STARTED } = await import('../errors');

/** The text tmux prints when nothing of Tortie's is running on that machine. */
const NO_SERVER = new Error(
  'no server running on /private/tmp/tmux-501/gmux-p71-unit'
);

/** The text ssh prints when the machine answers and declines the port. */
const REFUSED = new Error(
  'ssh: connect to host 127.0.0.1 port 38001: Connection refused'
);

/** The text ssh prints when the machine is off or off the network. */
const TIMED_OUT = new Error(
  'ssh: connect to host studio.tail1a2b.ts.net port 22: Operation timed out'
);

beforeEach(() => {
  verbAnswer = '';
  shellAnswer = '';
});

describe('readRemoteTmuxVersion', () => {
  it('reads the version the server reports', async () => {
    verbAnswer = 'tmux 3.6a\n';
    expect(await readRemoteTmuxVersion(CTX)).toEqual({
      kind: 'version',
      version: '3.6a'
    });
  });

  /**
   * The ordinary state of a machine nobody has prepared. The server read fails
   * because there is no server, and the program's own `-V` answers.
   */
  it('falls back to the program itself on a machine with no server', async () => {
    verbAnswer = NO_SERVER;
    shellAnswer = 'tmux 3.7b\n';
    expect(await readRemoteTmuxVersion(CTX)).toEqual({
      kind: 'version',
      version: '3.7b'
    });
  });

  /**
   * THE DEFECT, and the reason this file exists. Nothing reached the machine, so
   * the answer names that rather than making a claim about a program.
   */
  it('says the machine was not reached when the port declines', async () => {
    verbAnswer = REFUSED;
    shellAnswer = REFUSED;
    const read = await readRemoteTmuxVersion(CTX);
    expect(read.kind).toBe('unreached');
    if (read.kind === 'unreached') expect(read.cls).toBe('refused');
  });

  it('says the machine was not reached when it is off the network', async () => {
    verbAnswer = TIMED_OUT;
    shellAnswer = TIMED_OUT;
    const read = await readRemoteTmuxVersion(CTX);
    expect(read.kind).toBe('unreached');
    if (read.kind === 'unreached') expect(read.cls).toBe('unreachable');
  });

  /**
   * The machine answered and the program said something Tortie cannot read. This
   * one IS a statement about the program, and it keeps the sentence it had.
   */
  it('keeps the unreadable answer for a machine that did answer', async () => {
    verbAnswer = NO_SERVER;
    shellAnswer = 'this is not a version\n';
    expect(await readRemoteTmuxVersion(CTX)).toEqual({ kind: 'unreadable' });
  });

  it('keeps the unreadable answer for a failure nothing recognises', async () => {
    verbAnswer = NO_SERVER;
    shellAnswer = new Error('something nobody wrote a phrase for');
    expect(await readRemoteTmuxVersion(CTX)).toEqual({ kind: 'unreadable' });
  });
});

// ---------------------------------------------------------------------------
// The order inside prepareMachine, as source shape
// ---------------------------------------------------------------------------

/**
 * `prepareMachine` needs the confirm gate, the keychain and a registered
 * context, so driving it here would prove the mocks rather than the code. The
 * one property that has to hold is an ordering, and an ordering is readable.
 * This is the instrument ../../sessions/__tests__/unreachable-boundary.test.ts
 * uses for the same kind of claim.
 */
describe('prepareMachine', () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'prepare.ts'),
    'utf8'
  );

  it('answers for a machine it never reached BEFORE it asks the version gate', () => {
    const unreached = src.indexOf("if (read.kind === 'unreached')");
    const gate = src.indexOf('const gate = decideRemoteVersionGate(');
    expect(unreached).toBeGreaterThan(-1);
    expect(gate).toBeGreaterThan(unreached);
  });

  // -------------------------------------------------------------------------
  // Phase 83. The acceptance arms
  // -------------------------------------------------------------------------

  it('asks about a version that does not match the acceptance BEFORE the gate', () => {
    // The gate answers `unmeasured` for that case, and the plain unmeasured
    // sentence would not say what actually happened, which is that the program
    // on that machine is not the program the person accepted.
    const mismatch = src.indexOf('accepted !== null && version !== null');
    const gate = src.indexOf('const gate = decideRemoteVersionGate(');
    expect(mismatch).toBeGreaterThan(-1);
    expect(gate).toBeGreaterThan(mismatch);
  });

  it('hands the acceptance to the gate as its third argument', () => {
    expect(src).toContain('TESTED_REMOTE_TMUX_VERSIONS,\n    accepted\n  );');
  });

  it('lets an accepted version through to the step that starts something', () => {
    // The refusal arm fires for neither `measured` nor `accepted`, so the two
    // are the only ways past it.
    expect(src).toContain(
      "if (gate.kind !== 'measured' && gate.kind !== 'accepted')"
    );
  });

  it('offers a sheet only for a machine that named a version', () => {
    const composer = src.slice(
      src.indexOf('const sheetFor ='),
      src.indexOf('// PHASE 83. The arm that stops')
    );
    expect(composer).toContain("if (reported === null) return null;");
    expect(composer).toContain('acceptedTmuxVersion: reported');
  });

  it('composes no argv out of the accepted version', () => {
    // It reaches the gate and the sheet, and nothing else. A command composed
    // from it would be a value a person typed reaching a process.
    const uses = src.split('acceptedTmuxVersion').length - 1;
    expect(uses).toBeGreaterThan(0);
    expect(src).not.toContain('shellQuoteArgv([ctx.acceptedTmuxVersion');
  });

  it('reports no version at all for a machine it never reached', () => {
    const arm = src.slice(
      src.indexOf("if (read.kind === 'unreached')"),
      src.indexOf('const version =')
    );
    expect(arm).toContain('version: null');
    expect(arm).toContain('class: read.cls');
    // The refusal about a program is never composed on this path.
    expect(arm).not.toContain('version-unmeasured');
  });

  // -------------------------------------------------------------------------
  // PHASE 84, item 4. Preparing a machine is what makes its sessions appear
  //
  // Until this phase Prepare signed in, read the version, started the program
  // and reported success, and started nothing that reads the machine's list of
  // sessions. A machine asleep at launch stayed unread for the whole run, and
  // the badge sent the person to the button that could not fix it.
  //
  // These read the source rather than driving the function, for the reason the
  // arms above do: `prepareMachine` opens a connection to another computer.
  // `npm run smoke:execplane` drives it and reads the feed back.
  // -------------------------------------------------------------------------

  it('starts the machine’s feed in the success arm', () => {
    const arm = src.slice(
      src.indexOf('const server = await ensureRemoteServer(ctx);'),
      src.indexOf("const copy = composeOutcomeCopy('prepared'")
    );
    expect(arm).toContain('await startMachineFeed(input.machineId);');
  });

  it('starts it AFTER the server, because there is nothing to list before it', () => {
    expect(src.indexOf('ensureRemoteServer(ctx)')).toBeLessThan(
      src.indexOf('startMachineFeed(input.machineId)')
    );
  });

  it('starts it only on the success arm, and on no refusal', () => {
    expect(src.split('startMachineFeed(').length - 1).toBe(1);
  });

  /**
   * A feed that will not start does NOT fail the prepare. The machine really
   * was signed in to and the program really is running on it, so the honest
   * answer is the success sentence with one more sentence after it.
   */
  it('says what is still not true rather than reporting a failure', () => {
    expect(src).toContain('feedStarted = false;');
    expect(src).toContain('${copy.detail} ${MACHINE_FEED_NOT_STARTED}');
  });

  it('names the button a person can press again', () => {
    expect(MACHINE_FEED_NOT_STARTED).toContain('Press Prepare again.');
    expect(MACHINE_FEED_NOT_STARTED).not.toMatch(/[—–]/);
    for (const word of ['ssh', 'tmux', 'socket', 'pane']) {
      expect(MACHINE_FEED_NOT_STARTED.toLowerCase()).not.toContain(word);
    }
  });
});
