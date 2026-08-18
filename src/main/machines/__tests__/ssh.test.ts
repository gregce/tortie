/**
 * The carriage, and the short name of the connection Tortie keeps open to one
 * machine (Phase 69, M2).
 *
 * Everything here is pure except the two control path tests, which create a
 * directory inside the temporary directory and remove it again. Nothing runs ssh.
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { GmuxError } from '../../errors';
import {
  composeControlPath,
  controlDirCandidates,
  controlPathLeaf,
  sshOptions,
  CONTROL_DIR_MODE,
  CONTROL_DIR_NAME,
  CONTROL_PATH_MAX_BYTES,
  CONTROL_PATH_TOO_LONG,
  REQUIRED_SSH_OPTIONS,
  SSH_CONTROL_PERSIST_SECONDS,
  SSH_SERVER_ALIVE_COUNT_MAX,
  SSH_SERVER_ALIVE_INTERVAL_SECONDS,
  type SshCarriage
} from '../ssh';

const scratch = mkdtempSync(join(tmpdir(), 'p69-ssh-'));

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true });
});

const CARRIAGE: SshCarriage = {
  sshBin: '/usr/bin/ssh',
  host: 'pop-os.tail1a2b.ts.net',
  user: 'greg',
  port: 2222,
  controlPath: '/tmp/tortie-501/m-0123456789ab',
  hostKeys: {
    tortie: '/Users/x/Library/Application Support/Tortie/gmux/machines/known-machines',
    user: '/Users/x/.ssh/known_hosts'
  }
};

describe('the options every steady state command carries', () => {
  const argv = sshOptions(CARRIAGE);
  const text = argv.join(' ');

  it('carries every required option', () => {
    for (const required of REQUIRED_SSH_OPTIONS) {
      expect(text).toContain(required);
    }
  });

  it('fails fast rather than waiting for a person who is not there', () => {
    expect(text).toContain('BatchMode=yes');
    expect(text).not.toContain('BatchMode=no');
  });

  it('refuses an unknown machine outright, so it can write no record line', () => {
    // Stronger than Phase 68 promised and deliberately so. Under `yes` the client
    // refuses rather than asking, and BatchMode=yes means it could not ask
    // anyway, so the plane cannot add a line to ANY identity record file
    // including the one Tortie owns. First contact belongs to the one visible
    // test, where a person is watching.
    expect(text).toContain('StrictHostKeyChecking=yes');
    expect(text).not.toContain('StrictHostKeyChecking=ask');
    expect(text).not.toContain('StrictHostKeyChecking=no');
  });

  it("names Tortie's own record file first and the person's second", () => {
    const option = argv.find((a) => a.startsWith('UserKnownHostsFile=')) ?? '';
    expect(option.indexOf(CARRIAGE.hostKeys.tortie)).toBeGreaterThan(-1);
    expect(option.indexOf(CARRIAGE.hostKeys.tortie)).toBeLessThan(
      option.indexOf(CARRIAGE.hostKeys.user)
    );
  });

  it('quotes both paths, because one of them has a space in it', () => {
    const option = argv.find((a) => a.startsWith('UserKnownHostsFile=')) ?? '';
    expect(option).toContain(`"${CARRIAGE.hostKeys.tortie}"`);
    expect(option).toContain(`"${CARRIAGE.hostKeys.user}"`);
  });

  it('reuses one connection per machine', () => {
    expect(text).toContain('ControlMaster=auto');
    expect(text).toContain(`ControlPath=${CARRIAGE.controlPath}`);
    expect(text).toContain(`ControlPersist=${String(SSH_CONTROL_PERSIST_SECONDS)}s`);
  });

  it('turns a dropped link into an error inside twenty seconds', () => {
    // MEASURED by build/probe-execplane.mjs, on loopback, by sending SIGSTOP to
    // the scratch sshd. The table is in the header of ../ssh.ts. (5, 3) measured
    // 15.2 s, which is the only candidate at or under 20 s that sends no more
    // than one probe every 5 s.
    expect(SSH_SERVER_ALIVE_INTERVAL_SECONDS).toBe(5);
    expect(SSH_SERVER_ALIVE_COUNT_MAX).toBe(3);
    expect(
      SSH_SERVER_ALIVE_INTERVAL_SECONDS * SSH_SERVER_ALIVE_COUNT_MAX
    ).toBeLessThanOrEqual(20);
  });

  it('passes a port and an account only when the row carries one', () => {
    expect(sshOptions(CARRIAGE)).toContain('-p');
    expect(sshOptions(CARRIAGE)).toContain('-l');
    const bare = sshOptions({ ...CARRIAGE, port: null, user: null });
    expect(bare).not.toContain('-p');
    expect(bare).not.toContain('-l');
  });
});

// ---------------------------------------------------------------------------
// PHASE 84, item 7. The key Tortie made, named on every command
//
// Before this phase `IdentityFile` and a bare `-i` appeared zero times under
// src/main/machines/. The Install button made a key and put its public half on
// the machine, and then nothing named that file, so every sign in depended on
// whatever key the person happened to have loaded.
// ---------------------------------------------------------------------------

const KEY_PATH =
  '/Users/x/Library/Application Support/Tortie/gmux/machines/keys/machine-0123456789ab';

describe('the key Tortie made for one machine', () => {
  const withKey = sshOptions({ ...CARRIAGE, identityFile: KEY_PATH });
  const text = withKey.join(' ');

  it('is named on the command', () => {
    expect(text).toContain(`IdentityFile="${KEY_PATH}"`);
  });

  /**
   * Tortie's own data directory has a space in its name on every Mac, and the
   * client reads this value as a list separated by spaces. It is quoted for the
   * same reason `composeKnownHostsOption` quotes its two paths.
   */
  it('is quoted, because that path holds a space on every Mac', () => {
    const named = withKey[withKey.indexOf('-o', withKey.indexOf('-o') + 1)];
    expect(named).toBeDefined();
    expect(text).toContain('IdentityFile="/Users/x/Library/Application Support/');
  });

  it('sits after the record file option and before the reuse options', () => {
    // The order is fixed so the golden comparison and the conformance gate can
    // read the argv as one string.
    expect(text.indexOf('UserKnownHostsFile')).toBeLessThan(
      text.indexOf('IdentityFile')
    );
    expect(text.indexOf('IdentityFile')).toBeLessThan(
      text.indexOf('ControlMaster')
    );
  });

  /**
   * DELIBERATELY NOT SET, and it is a decision rather than an omission. Setting
   * it would tell the client to offer Tortie's key and nothing else, and the
   * operator's Mac Pro works today through a key he loaded himself. So Tortie
   * names its own key IN ADDITION to whatever the person has.
   */
  it('does not tell the client to offer Tortie’s key and nothing else', () => {
    expect(text).not.toContain('IdentitiesOnly');
  });

  it('names nothing when Tortie has made no key for the machine', () => {
    expect(sshOptions(CARRIAGE).join(' ')).not.toContain('IdentityFile');
    expect(
      sshOptions({ ...CARRIAGE, identityFile: null }).join(' ')
    ).not.toContain('IdentityFile');
  });

  it('changes nothing else about the command', () => {
    const without = sshOptions(CARRIAGE);
    const removed = withKey.filter(
      (one, at) => !(one.startsWith('IdentityFile=') || withKey[at + 1]?.startsWith('IdentityFile='))
    );
    expect(removed).toEqual(without);
  });
});

describe('the name of the connection', () => {
  it('is twelve hex characters after m-, so its length is fixed', () => {
    const leaf = controlPathLeaf({ executionHash: 'a'.repeat(64), uid: 501 });
    expect(leaf).toMatch(/^m-[0-9a-f]{12}$/);
  });

  it('differs for two machines and for two accounts', () => {
    const one = controlPathLeaf({ executionHash: 'a'.repeat(64), uid: 501 });
    const two = controlPathLeaf({ executionHash: 'b'.repeat(64), uid: 501 });
    const other = controlPathLeaf({ executionHash: 'a'.repeat(64), uid: 502 });
    expect(one).not.toBe(two);
    expect(one).not.toBe(other);
  });

  it('is the same answer twice for the same machine and account', () => {
    expect(controlPathLeaf({ executionHash: 'c'.repeat(64), uid: 501 })).toBe(
      controlPathLeaf({ executionHash: 'c'.repeat(64), uid: 501 })
    );
  });

  it('offers the per-user temporary directory first and /tmp second', () => {
    const [first, second] = controlDirCandidates(501, '/var/folders/7f/abc/T');
    expect(first).toBe(join('/var/folders/7f/abc/T', CONTROL_DIR_NAME));
    expect(second).toBe('/tmp/tortie-501');
  });

  it('creates its directory with mode 0700 and answers with the full path', () => {
    const path = composeControlPath({
      executionHash: 'd'.repeat(64),
      uid: process.getuid?.() ?? 0,
      dir: scratch
    });
    const dir = join(scratch, CONTROL_DIR_NAME);
    expect(path.startsWith(dir)).toBe(true);
    expect(existsSync(dir)).toBe(true);
    // eslint-disable-next-line no-bitwise
    expect(statSync(dir).mode & 0o777).toBe(CONTROL_DIR_MODE);
  });

  it('fits inside the byte budget on this machine', () => {
    const path = composeControlPath({
      executionHash: 'e'.repeat(64),
      uid: process.getuid?.() ?? 0,
      dir: scratch
    });
    expect(Buffer.byteLength(path, 'utf8')).toBeLessThanOrEqual(
      CONTROL_PATH_MAX_BYTES
    );
  });

  it('refuses when no directory produces a short enough name', () => {
    // A unix socket path is limited to 104 bytes and the failure otherwise lands
    // at connect time, where it reads as the machine being broken rather than as
    // a limit of this system. So a deep enough directory has to be refused here.
    const deep = join(scratch, 'x'.repeat(90), 'y'.repeat(90));
    mkdirSync(deep, { recursive: true });
    let payload: GmuxError['payload'] | null = null;
    try {
      composeControlPath({
        executionHash: 'f'.repeat(64),
        uid: process.getuid?.() ?? 0,
        dir: deep
      });
    } catch (err) {
      payload = err instanceof GmuxError ? err.payload : null;
    }
    expect(payload?.message).toBe(CONTROL_PATH_TOO_LONG);
    expect(payload?.detail ?? '').toContain('bytes or fewer');
  });
});
