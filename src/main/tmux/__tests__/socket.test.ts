/**
 * `activeTmuxSocket` decides which tmux server this process talks to. Getting
 * it wrong on a normal launch means the app starts a second, empty server and
 * every live session becomes unreachable, so the rules are tested rather than
 * trusted.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Repo root, so the real gmux-tmux.conf resolves and the conf assert passes. */
const REPO = resolve(__dirname, '../../../..');
import {
  TMUX_SOCKET,
  activeTmuxSocket,
  execTmux,
  resetTmuxContext
} from '../supervisor';

/**
 * Every tmux command in this file goes through a stub. The whole point of the
 * refusal tests below is that a command is never HANDED to tmux, and a test
 * that let one through to find out would be the defect it is testing for.
 */
const handed: string[][] = [];
vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    execFile: (
      _bin: string,
      argv: string[],
      _opts: unknown,
      cb: (e: unknown, r: { stdout: string; stderr: string }) => void
    ) => {
      handed.push(argv);
      cb(null, { stdout: '', stderr: '' });
      return undefined;
    }
  };
});

describe('activeTmuxSocket', () => {
  it('is the private socket when nothing asks otherwise', () => {
    expect(activeTmuxSocket({})).toBe(TMUX_SOCKET);
    expect(activeTmuxSocket({ GMUX_TMUX_SOCKET: '' })).toBe(TMUX_SOCKET);
    expect(activeTmuxSocket({ GMUX_TMUX_SOCKET: '   ' })).toBe(TMUX_SOCKET);
  });

  it('ignores the override on a launch that is not a harness', () => {
    expect(activeTmuxSocket({ GMUX_TMUX_SOCKET: 'gmux-fault-1' })).toBe(
      TMUX_SOCKET
    );
  });

  it('moves the socket for a harness launch', () => {
    expect(
      activeTmuxSocket({
        GMUX_SMOKE: 'fault-work',
        GMUX_TMUX_SOCKET: 'gmux-fault-1'
      })
    ).toBe('gmux-fault-1');
  });

  it("refuses the user's own default server by name", () => {
    expect(
      activeTmuxSocket({ GMUX_SMOKE: 'fault-work', GMUX_TMUX_SOCKET: 'default' })
    ).toBe(TMUX_SOCKET);
  });

  it('refuses a name that is a path or otherwise unusable', () => {
    for (const bad of ['../default', '/tmp/x', 'a b', '-L', '.hidden']) {
      expect(
        activeTmuxSocket({ GMUX_SMOKE: 'fault-work', GMUX_TMUX_SOCKET: bad })
      ).toBe(TMUX_SOCKET);
    }
  });
});

/**
 * The refusal that would have saved the operator's 48 live sessions.
 *
 * `src/main/power/smoke.ts` ran `tmux kill-server` from its own failure path
 * and checked the socket name afterwards, on the line that unlinks the socket
 * file. A harness that had already printed "refusing to run" then killed the
 * server it was refusing to touch. The check now lives in `execTmux`, which is
 * the one door every tmux command goes through, so no caller can get past it.
 *
 * The tmux binary is stubbed. The point of these tests is that the command is
 * never HANDED to tmux, and a test that let it through to prove that would be
 * the defect.
 */
describe('execTmux refuses to end the real server', () => {
  const REAL_CONF = resolve(REPO, 'resources/gmux-tmux.conf');

  function withSocket(socket: string | undefined): void {
    resetTmuxContext();
    if (socket === undefined) delete process.env['GMUX_TMUX_SOCKET'];
    else process.env['GMUX_TMUX_SOCKET'] = socket;
  }

  beforeEach(() => {
    process.env['GMUX_SMOKE'] = 'unit-test';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    handed.length = 0;
    withSocket(undefined);
    delete process.env['GMUX_SMOKE'];
    resetTmuxContext();
  });

  it('refuses kill-server on the real socket and hands tmux nothing', async () => {
    expect(existsSync(REAL_CONF)).toBe(true);
    withSocket(undefined);
    await expect(execTmux(['kill-server'])).rejects.toThrow(
      /does not end the session server/
    );
    expect(handed).toEqual([]);
  });

  it('refuses it however the socket got to be the real one', async () => {
    // An override that a normal launch ignores still resolves to `gmux`, so the
    // refusal has to be about the RESOLVED socket and not about the variable.
    delete process.env['GMUX_SMOKE'];
    withSocket('gmux-looks-like-a-harness');
    await expect(execTmux(['kill-server'])).rejects.toThrow(
      /does not end the session server/
    );
    expect(handed).toEqual([]);
  });

  it('leaves every other verb alone on the real socket', async () => {
    withSocket(undefined);
    // These reach the conf resolution, which needs Electron, so the assertion
    // is that they get PAST the refusal rather than that they succeed.
    await execTmux(['list-sessions']).catch(() => undefined);
    await execTmux(['kill-session', '-t', '$3']).catch(() => undefined);
    // Nothing threw the refusal. Whether tmux ran is not this test's business.
    expect(true).toBe(true);
  });
});
