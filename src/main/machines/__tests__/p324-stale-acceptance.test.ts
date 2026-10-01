/**
 * Phase 324, the ruled round. Measured beats a stale acceptance, in Prepare's
 * own words.
 *
 * ## The defect this file exists for
 *
 * Found by Phase 324's second reverify, in the real app over identical stored
 * state at both builds. A machine whose stored acceptance names 3.5a and whose
 * program now reports 3.6b was refused by Prepare's mismatch arm, which was
 * asked BEFORE the version gate. At the build that put 3.6b on the measured
 * list it drew "Tortie has not measured the program this machine runs.", the
 * remedy "Wait for a Tortie release that has measured the version that machine
 * runs", and a sheet accepting 3.6b "which Tortie has not measured", beside
 * "Versions Tortie has measured: 3.6, 3.6a, 3.6b, 3.7b, 3.7c". Every one of
 * those was false. The same was already true of 3.6a, 3.7b and 3.7c.
 *
 * His ruling of 2026-09-30, "Build 326 first, then fix and land 324", took the
 * reverifier's option (a): a MEASURED reported version skips the mismatch arm,
 * which is `decideRemoteVersionGate`'s rule 2, measured beats accepted.
 *
 * ## How it is driven
 *
 * `prepareMachine` itself, over stand-ins for the five things it reaches past
 * the version decision: the context (which would ask the confirm record), the
 * exec plane (which would sign in), the server boot, the feed and the agent
 * scan. The version gate, the copy, `describeMachine` and the measured list are
 * the shipping ones, so a row added to or removed from the list moves these
 * answers with it. Nothing here runs a command.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachineExecutionFields } from '../confirm';

/** What the far program prints for `display-message -p '#{version}'`. */
let reported = '';
let booted = 0;
let feeds = 0;

vi.mock('../context', () => ({
  buildRemoteMachineContext: (input: { machineId: string; fields: MachineExecutionFields }) => ({
    kind: 'remote',
    machineId: input.machineId,
    sshBin: '/usr/bin/ssh',
    host: input.fields.host,
    user: input.fields.user,
    port: input.fields.port,
    remoteTmuxPath: input.fields.remoteTmuxPath,
    socket: 'gmux-p324-unit',
    controlPath: '/tmp/tortie-501/m-p324',
    hostKeys: { tortie: '/t/known-machines', user: '/u/known_hosts' },
    acceptedTmuxVersion: input.fields.acceptedTmuxVersion ?? null
  }),
  registerRemoteMachineContext: <T>(ctx: T): T => ctx,
  machineGeneration: () => ({ generation: 1, remotePath: '/usr/bin:/bin' })
}));

vi.mock('../exec-plane', () => ({
  execOn: () => Promise.resolve(`tmux ${reported}\n`),
  execRemoteShell: () => Promise.reject(new Error('the -V read is not reached here'))
}));

vi.mock('../remote-server', () => ({
  ensureRemoteServer: () => {
    booted += 1;
    return Promise.resolve({ born: false, remotePath: '/usr/bin:/bin', options: [], disagreed: [] });
  }
}));

vi.mock('../remote-sessions', () => ({
  startMachineFeed: () => {
    feeds += 1;
    return Promise.resolve();
  }
}));

vi.mock('../machine-agents', () => ({
  scanMachineAgents: () => Promise.resolve()
}));

const { prepareMachine } = await import('../prepare');
const { describeMachine } = await import('../confirm');
const {
  MACHINE_VERSION_ACCEPT_MISMATCH,
  MACHINE_VERSION_ACCEPT_OFFER,
  MACHINE_VERSION_ACCEPTED_HONESTY
} = await import('../errors');
const { TESTED_REMOTE_TMUX_VERSIONS } = await import('../../tmux/version');

const MEASURED = TESTED_REMOTE_TMUX_VERSIONS.filter((row) => row.measured.exec).map(
  (row) => row.version
);

const FIELDS: MachineExecutionFields = {
  host: 'studio.example',
  user: 'gdc',
  port: null,
  remoteTmuxPath: '/usr/bin/tmux',
  acceptedTmuxVersion: null,
  writeRoot: null
};

/** Prepare a machine whose stored acceptance is `accepted` and whose program reports `now`. */
async function prepare(accepted: string | null, now: string) {
  reported = now;
  return prepareMachine({
    machineId: 'studio',
    fields: { ...FIELDS, acceptedTmuxVersion: accepted },
    tortieHostKeys: '/t/known-machines',
    packaged: false,
    env: {},
    home: '/Users/nobody',
    uid: 501
  });
}

/** Every sentence a person reads off a Prepare result, sheet included. */
function words(result: Awaited<ReturnType<typeof prepare>>): string {
  return [result.headline, result.detail, ...(result.acceptSheet?.lines ?? [])].join('\n');
}

beforeEach(() => {
  reported = '';
  booted = 0;
  feeds = 0;
});

describe('a stored acceptance meeting a version Tortie measured (Phase 324)', () => {
  it('holds the five measured versions this round is about', () => {
    expect(MEASURED).toEqual(['3.6', '3.6a', '3.6b', '3.7b', '3.7c']);
  });

  // THE CASE THE REVERIFY DROVE, and the two rows this phase added.
  for (const now of ['3.6', '3.6b']) {
    it(`prepares a machine accepted at 3.5a that now reports ${now}, and asks nothing`, async () => {
      const result = await prepare('3.5a', now);
      expect(result.class).toBe('prepared');
      expect(result.version).toBe(now);
      expect(result.acceptSheet).toBeNull();
      expect(result.headline).toBe('This machine is ready.');
      expect(booted).toBe(1);
      expect(feeds).toBe(1);
      // Not one of the sentences the reverify found false.
      const said = words(result);
      expect(said).not.toContain('has not measured');
      expect(said).not.toContain(MACHINE_VERSION_ACCEPT_MISMATCH);
      expect(said).not.toContain(MACHINE_VERSION_ACCEPTED_HONESTY);
      expect(said).toContain(`The machine reports version ${now}.`);
    });
  }

  // The same class at the parent, for the three versions measured before this
  // phase, which the mismatch arm also called unmeasured.
  for (const now of ['3.6a', '3.7b', '3.7c']) {
    it(`prepares a machine accepted at 3.5a that now reports ${now}, as it now does for 3.6 and 3.6b`, async () => {
      const result = await prepare('3.5a', now);
      expect(result.class).toBe('prepared');
      expect(result.acceptSheet).toBeNull();
      expect(words(result)).not.toContain('has not measured');
    });
  }

  it('answers every measured version that way, from the list rather than from this file', async () => {
    for (const now of MEASURED) {
      for (const accepted of ['3.5a', '3.4', '3.9z']) {
        const result = await prepare(accepted, now);
        expect([now, accepted, result.class]).toEqual([now, accepted, 'prepared']);
        expect(result.acceptSheet).toBeNull();
      }
    }
  });

  it('prepares a machine whose acceptance names the measured version it reports, as measured', async () => {
    // Accepted 3.6 on a build that had not measured it, and it still runs 3.6.
    const result = await prepare('3.6', '3.6');
    expect(result.class).toBe('prepared');
    expect(result.detail).not.toContain(MACHINE_VERSION_ACCEPTED_HONESTY);
  });
});

describe('the refusals that are still true (Phase 324)', () => {
  it('still refuses an acceptance carrying to another version Tortie has not measured', async () => {
    // 3.5a accepted, and the machine now reports 3.4: nothing about that is
    // measured, and the program is not the one the person accepted.
    const result = await prepare('3.5a', '3.4');
    expect(result.class).toBe('version-unmeasured');
    expect(result.headline).toBe('Tortie has not measured the program this machine runs.');
    expect(result.detail).toBe(
      `${MACHINE_VERSION_ACCEPT_MISMATCH} ${MACHINE_VERSION_ACCEPT_OFFER}`
    );
    expect(result.acceptSheet?.lines.at(-1)).toBe(
      'Accepts this version of the program, which Tortie has not measured: 3.4'
    );
    expect(booted).toBe(0);
  });

  it('still starts work on the version a person accepted, and says it was accepted', async () => {
    const result = await prepare('3.5a', '3.5a');
    expect(result.class).toBe('prepared');
    expect(result.detail).toContain(MACHINE_VERSION_ACCEPTED_HONESTY);
    expect(booted).toBe(1);
  });

  it('refuses an unmeasured version on a machine with no acceptance, and offers the sheet', async () => {
    const result = await prepare(null, '3.5a');
    expect(result.class).toBe('version-unmeasured');
    expect(result.detail).not.toContain(MACHINE_VERSION_ACCEPT_MISMATCH);
    expect(result.detail).toContain(MACHINE_VERSION_ACCEPT_OFFER);
    expect(result.acceptSheet).not.toBeNull();
    expect(booted).toBe(0);
  });

  it('treats an acceptance of a measured version as no acceptance when the program falls back', async () => {
    // Accepted 3.6 on an older build; the machine now reports 3.5a. The row no
    // longer draws the 3.6 acceptance, so the refusal does not speak of one: it
    // is the plain refusal any measured machine gets, with its sheet.
    const result = await prepare('3.6', '3.5a');
    expect(result.class).toBe('version-unmeasured');
    expect(result.detail).not.toContain(MACHINE_VERSION_ACCEPT_MISMATCH);
    expect(result.detail).toContain(MACHINE_VERSION_ACCEPT_OFFER);
    expect(result.acceptSheet?.lines.at(-1)).toBe(
      'Accepts this version of the program, which Tortie has not measured: 3.5a'
    );
    expect(booted).toBe(0);
  });
});

describe('the lines a person reads about an acceptance (Phase 324)', () => {
  it('draws no acceptance line for a version Tortie has measured, and keeps it in the hash', () => {
    for (const version of MEASURED) {
      const accepted = describeMachine('studio', { ...FIELDS, acceptedTmuxVersion: version });
      const none = describeMachine('studio', FIELDS);
      expect(accepted.lines).toEqual(none.lines);
      // The value is not dropped: the confirmation stays bound to it, so a
      // person's agreement is never withdrawn by this build reading it.
      expect(accepted.hash).not.toBe(none.hash);
    }
  });

  it('still draws it for a version Tortie has not measured', () => {
    const lines = describeMachine('studio', { ...FIELDS, acceptedTmuxVersion: '3.5a' }).lines;
    expect(lines.at(-1)).toBe(
      'Accepts this version of the program, which Tortie has not measured: 3.5a'
    );
  });

  it('asks the gate byte for byte, so a near miss of a measured version is still drawn', () => {
    for (const version of ['3.6c', '3.6A', '3.60', 'next-3.6']) {
      const lines = describeMachine('studio', { ...FIELDS, acceptedTmuxVersion: version }).lines;
      expect(lines.at(-1)).toBe(
        `Accepts this version of the program, which Tortie has not measured: ${version}`
      );
    }
  });
});
