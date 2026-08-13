/**
 * The guard that stands between a destructive harness and the user's work.
 *
 * The fault harness sends SIGKILL part way through a snapshot write. Pointed
 * at the real profile or the real tmux socket, that costs the operator live
 * sessions. Two harnesses were each carrying their own copy of this check, the
 * copies had drifted, and the copy in front of the SIGKILL was the one that
 * had drifted: it compared `/var/folders/…` against `/private/var/folders/…`
 * and refused every isolated run, so `npm run smoke:fault` failed 10 of 10.
 *
 * The symlink case is the one to keep. It is the reason the extraction
 * happened and it is not obvious from reading the function.
 */

import { mkdtempSync, mkdirSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';
let socket = '';

vi.mock('electron', () => ({
  app: { getPath: (_name: string) => userData }
}));
/** Every tmux command the teardown would run, in order. */
const ran: string[][] = [];
vi.mock('../../tmux', () => ({
  TMUX_SOCKET: 'gmux',
  getTmuxContext: () => ({ socket }),
  execTmux: (argv: string[]) => {
    ran.push(argv);
    return Promise.resolve('/private/tmp/tmux-501/gmux\n');
  }
}));

const { assertHarnessIsolation, teardownHarnessServer } = await import(
  '../isolation'
);

const ENV = 'GMUX_TEST_ROOT';
let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'gmux-isolation-'));
  socket = 'gmux-test-1';
  delete process.env[ENV];
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env[ENV];
});

describe('assertHarnessIsolation', () => {
  it('accepts a profile inside the root, on a socket that is not the real one', () => {
    process.env[ENV] = dir;
    userData = join(dir, 'profile');
    mkdirSync(userData);
    const iso = assertHarnessIsolation(ENV);
    expect(iso.socket).toBe('gmux-test-1');
    // Resolved, not echoed back. On macOS `$TMPDIR` is under a symlink, so
    // this is the same directory reached by its real name.
    expect(iso.userData).toBe(realpathSync(userData));
  });

  it('accepts a root reached through a symlink, which is the macOS /var case', () => {
    // `os.tmpdir()` answers `/var/folders/…` and Electron answers
    // `/private/var/folders/…` for the same directory. A string compare
    // refuses this, and refusing it is what broke the fault harness.
    const real = join(dir, 'real');
    const link = join(dir, 'link');
    mkdirSync(join(real, 'profile'), { recursive: true });
    symlinkSync(real, link);

    process.env[ENV] = link;
    userData = join(real, 'profile');
    expect(() => assertHarnessIsolation(ENV)).not.toThrow();
  });

  it('refuses when the root variable is not set', () => {
    userData = join(dir, 'profile');
    expect(() => assertHarnessIsolation(ENV)).toThrow(
      `${ENV} is not set. Refusing to run.`
    );
  });

  it('names the variable the caller passed, so the refusal is actionable', () => {
    expect(() => assertHarnessIsolation('GMUX_FAULT_ROOT')).toThrow(
      /GMUX_FAULT_ROOT is not set/
    );
  });

  it('refuses a profile outside the root', () => {
    process.env[ENV] = join(dir, 'inside');
    mkdirSync(join(dir, 'inside'));
    userData = join(dir, 'elsewhere');
    mkdirSync(userData);
    expect(() => assertHarnessIsolation(ENV)).toThrow(/is outside/);
  });

  it('refuses the real tmux socket even when the profile is isolated', () => {
    process.env[ENV] = dir;
    userData = join(dir, 'profile');
    mkdirSync(userData);
    socket = 'gmux';
    expect(() => assertHarnessIsolation(ENV)).toThrow(
      /tmux socket is "gmux", the real one/
    );
  });
});

/**
 * The teardown that cost the operator 48 live sessions when it was written the
 * other way round.
 *
 * The old copy ran `tmux kill-server` FIRST and checked the socket name
 * afterwards, on the line that unlinks the socket file. So a harness whose
 * isolation guard had already refused went on to end the real server. The
 * order is the whole fix, and this test is about the order.
 */
describe('teardownHarnessServer', () => {
  beforeEach(() => {
    ran.length = 0;
  });

  it('sends NOTHING when the socket is the real one', async () => {
    socket = 'gmux';
    await teardownHarnessServer();
    expect(ran).toEqual([]);
  });

  it('ends the server when the socket is a harness socket', async () => {
    socket = 'gmux-test-1';
    await teardownHarnessServer();
    expect(ran.map((a) => a[0])).toEqual(['display-message', 'kill-server']);
  });
});
