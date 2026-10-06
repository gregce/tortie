/**
 * Phase 340, D14 as revised by §Attack R10: ssh missing and ssh failing to
 * start are two classes, in BOTH runners.
 *
 * Until this phase the connection test and the key install answered "This Mac
 * has no ssh program at /usr/bin/ssh" (`client-missing`) whenever node-pty
 * failed to LAUNCH ssh, even with `/usr/bin/ssh` in place; the operator read it
 * while re-adding his Mac Pro. Now:
 *
 *  - no executable ssh where it lives keeps `client-missing` and its copy, and
 *    is logged naming the path;
 *  - a spawn that throws is `client-failed`, its detail names the path and the
 *    reason in plain words, and the raw message and any code go to the log.
 *
 * node-pty on macOS throws the one string `posix_spawnp failed.` for every
 * failure of its spawn, with no errno (`node_modules/node-pty/src/unix/pty.cc`),
 * so that string answers "did not say why" and never names a terminal.
 *
 * node-pty is replaced by a stand-in that THROWS what the test tells it to. The
 * ssh this file resolves is a scratch executable file named by GMUX_SSH_BIN in a
 * development resolution, so the real ssh is never named and nothing starts. A
 * missing ssh is the carriage's own `missing` answer, forced through its seam.
 */

import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MachineTestEvent, MachineTestOutcome } from '@shared/ipc';

/** What the stand-in does when it is asked to spawn. */
const pty = vi.hoisted(() => ({
  throws: null as unknown,
  calls: [] as { file: string; args: string[] }[]
}));

vi.mock('node-pty', () => ({
  spawn: (file: string, args: string[]) => {
    pty.calls.push({ file, args });
    if (pty.throws !== null) throw pty.throws;
    return {
      pid: 616161,
      onData: () => undefined,
      onExit: () => undefined,
      write: () => undefined,
      kill: () => undefined
    };
  }
}));

/** Every line the machines log was asked to write. */
const log = vi.hoisted(() => ({ lines: [] as string[] }));
vi.mock('../../log', () => ({
  getLog: () => ({
    info: (line: string) => log.lines.push(`info ${line}`),
    warn: (line: string) => log.lines.push(`warn ${line}`),
    error: (line: string) => log.lines.push(`error ${line}`),
    debug: () => undefined
  })
}));

/** The carriage, with one seam: a test may force the `missing` answer. */
const carriage = vi.hoisted(() => ({ missing: false }));
vi.mock('../carriage', async (importOriginal) => {
  const real = await importOriginal<typeof import('../carriage')>();
  return {
    ...real,
    resolveSsh: (input: { packaged: boolean; env: NodeJS.ProcessEnv }) =>
      carriage.missing
        ? { path: null, source: 'missing' as const }
        : real.resolveSsh(input)
  };
});

const {
  PINNED_SSH_PATH,
  machineSshSpawnCount,
  resetMachineTestForTests,
  startKeyInstall,
  startMachineTest
} = await import('../connection-test');
const { clientFailedReason, composeOutcomeCopy, machineOutcomeCopy } = await import(
  '../errors'
);
const { composeKeyInstallCopy } = await import('../key-install');

const KEYS = {
  tortie: '/Users/x/Library/Application Support/Tortie/gmux/machines/known-machines',
  user: '/Users/x/.ssh/known_hosts'
};
const FIELDS = { host: '127.0.0.1', user: 'greg', port: 2222, remoteTmuxPath: null };
const PUBLIC_KEY =
  'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB1cVQpLqRvXn7z8mKdT4wYuHsE2fGjNaPo9rXsUvWxYz ' +
  'tortie-0123456789ab';

/** node-pty's own words for every failure of its spawn on macOS. */
const POSIX = new Error('posix_spawnp failed.');
const withCode = (code: string): Error =>
  Object.assign(new Error(`spawn ${code}`), { code });

const MISSING_HEADLINE = 'This Mac has no ssh program at /usr/bin/ssh.';
const FAILED_HEADLINE = 'Tortie could not start ssh on this Mac.';
const NO_REASON = 'macOS would not start it and did not say why';

let scratch = '';
let fakeSsh = '';

beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), 'tortie-p340-client-'));
  // An executable file that is never run: node-pty is the stand-in.
  fakeSsh = join(scratch, 'ssh');
  writeFileSync(fakeSsh, '#!/bin/sh\nexit 0\n');
  chmodSync(fakeSsh, 0o755);
});

afterAll(() => {
  if (scratch.length > 0) rmSync(scratch, { recursive: true, force: true });
});

beforeEach(() => {
  pty.throws = null;
  pty.calls.length = 0;
  log.lines.length = 0;
  carriage.missing = false;
  resetMachineTestForTests();
});

afterEach(() => {
  resetMachineTestForTests();
});

/** Run one connection test to its end and hand back what it said. */
async function runTest(): Promise<{ outcome: MachineTestOutcome; sshPath: string }> {
  const events: MachineTestEvent[] = [];
  const started = startMachineTest({
    fields: FIELDS,
    sheetId: 'studio',
    keyPath: null,
    packaged: false,
    env: { GMUX_SSH_BIN: fakeSsh },
    hostKeys: KEYS,
    emit: (event) => events.push(event)
  });
  // Both refusals finish on a later turn, so the caller holds its test id first.
  await new Promise((resolve) => setTimeout(resolve, 5));
  const end = events.find((e) => e.kind === 'end');
  if (end === undefined || end.kind !== 'end') throw new Error('no end event');
  return { outcome: end.outcome, sshPath: started.sshPath };
}

/** Run one key install to its end, then compose its copy as the handler does. */
async function runInstall(): Promise<{
  cls: string;
  headline: string;
  detail: string;
}> {
  const run = await startKeyInstall({
    machineId: 'studio',
    fields: FIELDS,
    publicKeyLine: PUBLIC_KEY,
    password: 'not-a-real-password',
    packaged: false,
    env: { GMUX_SSH_BIN: fakeSsh },
    hostKeys: KEYS
  });
  const copy = composeKeyInstallCopy({
    cls: run.cls,
    text: run.transcript,
    exitCode: run.exitCode,
    clientFailure: run.clientFailure
  });
  return { cls: copy.class, headline: copy.headline, detail: copy.detail };
}

const warnings = (): string[] => log.lines.filter((l) => l.startsWith('warn '));

// ---------------------------------------------------------------------------
// The reason, in plain words
// ---------------------------------------------------------------------------

describe('clientFailedReason reads only a code, and says so when there is none', () => {
  it('node-pty’s own string, with no errno, did not say why, and names no terminal', () => {
    expect(clientFailedReason(POSIX)).toBe(NO_REASON);
    expect(clientFailedReason(POSIX)).not.toMatch(/terminal|pty/i);
  });

  it('a refused permission', () => {
    expect(clientFailedReason(withCode('EACCES'))).toBe('macOS would not let Tortie run it');
    expect(clientFailedReason(withCode('EPERM'))).toBe('macOS would not let Tortie run it');
  });

  it('too many files open', () => {
    expect(clientFailedReason(withCode('EMFILE'))).toBe('Tortie has too many files open');
    expect(clientFailedReason(withCode('ENFILE'))).toBe('Tortie has too many files open');
  });

  it('too many programs', () => {
    expect(clientFailedReason(withCode('EAGAIN'))).toBe(
      'this Mac is running too many programs to start another'
    );
  });

  it('anything else did not say why', () => {
    for (const err of [
      withCode('ENOENT'),
      new Error('something else'),
      'a thrown string',
      null,
      undefined,
      { code: 7 }
    ]) {
      expect(clientFailedReason(err)).toBe(NO_REASON);
    }
  });

  it('never reads the message for a cause', () => {
    // A message that NAMES a code is still no code.
    expect(clientFailedReason(new Error('EACCES: permission denied'))).toBe(NO_REASON);
  });
});

describe('the copy of the two classes', () => {
  it('client-missing keeps its headline and its detail', () => {
    const copy = machineOutcomeCopy('client-missing');
    expect(copy.headline).toBe(MISSING_HEADLINE);
    expect(copy.alarm).toBe(false);
  });

  it('client-failed names the path and the reason, and says nothing was sent', () => {
    const copy = composeOutcomeCopy('client-failed', {
      sshPath: '/usr/bin/ssh',
      clientReason: NO_REASON
    });
    expect(copy.headline).toBe(FAILED_HEADLINE);
    expect(copy.detail).toBe(
      `ssh is at /usr/bin/ssh, but ${NO_REASON}. Nothing was sent to any machine.`
    );
    expect(copy.alarm).toBe(false);
    expect(copy.headline).not.toBe(MISSING_HEADLINE);
  });

  it('client-failed with no facts falls back to its fixed sentence', () => {
    expect(composeOutcomeCopy('client-failed', {}).detail).toBe(
      'Nothing was sent to any machine.'
    );
  });
});

// ---------------------------------------------------------------------------
// The connection test
// ---------------------------------------------------------------------------

describe('the connection test tells a missing ssh from one that would not start', () => {
  it('a spawn that throws node-pty’s string is client-failed, with the path, and logged', async () => {
    pty.throws = POSIX;
    const { outcome, sshPath } = await runTest();
    expect(sshPath).toBe(fakeSsh);
    expect(pty.calls).toHaveLength(1);
    expect(pty.calls[0]?.file).toBe(fakeSsh);
    expect(outcome.class).toBe('client-failed');
    expect(outcome.headline).toBe(FAILED_HEADLINE);
    expect(outcome.detail).toBe(
      `ssh is at ${fakeSsh}, but ${NO_REASON}. Nothing was sent to any machine.`
    );
    expect(outcome.sheet).toBeNull();
    expect(outcome.check ?? null).toBeNull();
    // The raw message reaches the log, and the person's sentence does not
    // carry it.
    const warned = warnings();
    expect(warned).toHaveLength(1);
    expect(warned[0]).toContain(fakeSsh);
    expect(warned[0]).toContain('posix_spawnp failed.');
    expect(outcome.detail).not.toContain('posix_spawnp');
  });

  it('a spawn that throws EACCES names that reason, and the code is logged', async () => {
    pty.throws = withCode('EACCES');
    const { outcome } = await runTest();
    expect(outcome.class).toBe('client-failed');
    expect(outcome.detail).toBe(
      `ssh is at ${fakeSsh}, but macOS would not let Tortie run it. Nothing was sent to any machine.`
    );
    const warned = warnings();
    expect(warned).toHaveLength(1);
    expect(warned[0]).toContain('(EACCES)');
  });

  it('every reason reaches the detail', async () => {
    for (const [code, words] of [
      ['EMFILE', 'Tortie has too many files open'],
      ['EAGAIN', 'this Mac is running too many programs to start another']
    ] as const) {
      resetMachineTestForTests();
      log.lines.length = 0;
      pty.throws = withCode(code);
      const { outcome } = await runTest();
      expect(outcome.class, code).toBe('client-failed');
      expect(outcome.detail, code).toContain(words);
    }
  });

  it('no executable ssh is client-missing, starts nothing, and is logged naming the path', async () => {
    carriage.missing = true;
    const { outcome } = await runTest();
    expect(outcome.class).toBe('client-missing');
    expect(outcome.headline).toBe(MISSING_HEADLINE);
    expect(pty.calls).toEqual([]);
    expect(machineSshSpawnCount()).toBe(0);
    const warned = warnings();
    expect(warned).toHaveLength(1);
    expect(warned[0]).toContain(PINNED_SSH_PATH);
  });

  it('a spawn that works is neither', () => {
    const events: MachineTestEvent[] = [];
    startMachineTest({
      fields: FIELDS,
      sheetId: 'studio',
      keyPath: null,
      packaged: false,
      env: { GMUX_SSH_BIN: fakeSsh },
      hostKeys: KEYS,
      emit: (event) => events.push(event)
    });
    expect(pty.calls).toHaveLength(1);
    expect(events.filter((e) => e.kind === 'end')).toEqual([]);
    expect(warnings()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The key install
// ---------------------------------------------------------------------------

describe('the key install tells them apart the same way', () => {
  it('a spawn that throws node-pty’s string is client-failed, with the path, and logged', async () => {
    pty.throws = POSIX;
    const copy = await runInstall();
    expect(copy.cls).toBe('client-failed');
    expect(copy.headline).toBe(FAILED_HEADLINE);
    expect(copy.detail).toBe(
      `ssh is at ${fakeSsh}, but ${NO_REASON}. Nothing was sent to any machine.`
    );
    const warned = warnings();
    expect(warned).toHaveLength(1);
    expect(warned[0]).toContain(fakeSsh);
    expect(warned[0]).toContain('posix_spawnp failed.');
  });

  it('a spawn that throws EPERM names that reason', async () => {
    pty.throws = withCode('EPERM');
    const copy = await runInstall();
    expect(copy.cls).toBe('client-failed');
    expect(copy.detail).toContain('macOS would not let Tortie run it');
    expect(warnings()[0]).toContain('(EPERM)');
  });

  it('no executable ssh is client-missing, starts nothing, and is logged naming the path', async () => {
    carriage.missing = true;
    const copy = await runInstall();
    expect(copy.cls).toBe('client-missing');
    expect(copy.headline).toBe(MISSING_HEADLINE);
    expect(pty.calls).toEqual([]);
    const warned = warnings();
    expect(warned).toHaveLength(1);
    expect(warned[0]).toContain(PINNED_SSH_PATH);
  });

  it('the password reaches no log line on either path', async () => {
    pty.throws = POSIX;
    await runInstall();
    resetMachineTestForTests();
    carriage.missing = true;
    await runInstall();
    expect(log.lines.join('\n')).not.toContain('not-a-real-password');
  });
});

describe('Prepare counts client-failed among the answers that reached nothing', () => {
  it('beside client-missing, in the one list prepare.ts keeps', () => {
    const text = readFileSync(join(__dirname, '..', 'prepare.ts'), 'utf8');
    const at = text.indexOf('const UNREACHED_CLASSES');
    expect(at).toBeGreaterThan(-1);
    const list = text.slice(at, text.indexOf('];', at));
    const members = [...list.matchAll(/^\s*'([a-z-]+)',?$/gm)].map((m) => m[1]);
    expect(members).toContain('client-missing');
    expect(members).toContain('client-failed');
  });
});
