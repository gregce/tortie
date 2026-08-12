/**
 * The login item across a bundle-id change (Phase 16.5, rename hazard 3).
 *
 * SMAppService keys its registration on the bundle id, so renaming the app
 * silently un-registers it: the toggle reads back off, the user's sessions
 * stop coming back after a reboot, and nothing anywhere says so. These tests
 * pin the repair — a recorded preference, reconciled against the OS at every
 * boot — and, just as importantly, the two things it must NOT do: it must
 * never turn a login item ON that the user turned off, and it must never
 * report success when macOS refused.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** The OS side of the world, as a fake we can lie with. */
const os = {
  openAtLogin: false,
  /** When set, setLoginItemSettings does nothing (macOS declining). */
  refuse: false,
  /** When set, setLoginItemSettings throws. */
  throws: false,
  calls: [] as boolean[]
};

let userData = '';

vi.mock('electron', () => ({
  app: {
    isPackaged: true,
    getPath: (name: string) => {
      if (name !== 'userData') throw new Error(`unexpected path ${name}`);
      return userData;
    },
    getLoginItemSettings: () => ({ openAtLogin: os.openAtLogin }),
    setLoginItemSettings: ({ openAtLogin }: { openAtLogin: boolean }) => {
      os.calls.push(openAtLogin);
      if (os.throws) throw new Error('SMAppService exploded');
      if (!os.refuse) os.openAtLogin = openAtLogin;
    }
  }
}));

const {
  getLoginItemState,
  reconcileLoginItem,
  setLoginItemState
} = await import('../login-item');

const stampFile = (): string => join(userData, 'gmux', 'login-item.json');

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'gmux-loginitem-'));
  os.openAtLogin = false;
  os.refuse = false;
  os.throws = false;
  os.calls = [];
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  rmSync(userData, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('the recorded preference', () => {
  it('is written when the user turns the login item on', () => {
    expect(setLoginItemState(true)).toEqual({ openAtLogin: true });
    const stamp = JSON.parse(readFileSync(stampFile(), 'utf8')) as {
      version: number;
      openAtLogin: boolean;
    };
    expect(stamp).toMatchObject({ version: 1, openAtLogin: true });
  });

  it('records what the user ASKED for, even when macOS declines', () => {
    os.refuse = true;
    // The caller is told the truth…
    expect(setLoginItemState(true)).toEqual({ openAtLogin: false });
    // …and the next boot still retries the user's actual answer.
    const stamp = JSON.parse(readFileSync(stampFile(), 'utf8')) as {
      openAtLogin: boolean;
    };
    expect(stamp.openAtLogin).toBe(true);
  });

  it('lands inside <userData>/gmux/ — the directory the migration copies', () => {
    setLoginItemState(true);
    expect(stampFile()).toContain(`${join('gmux', 'login-item.json')}`);
  });
});

describe('reconcile at boot', () => {
  it('does nothing when there is no recorded answer (the rename itself)', () => {
    // The gmux build that shipped before this file existed never wrote a
    // stamp, so its setting is genuinely unrecoverable. Say so; touch nothing.
    expect(reconcileLoginItem()).toEqual({
      action: 'unknown',
      openAtLogin: false
    });
    expect(os.calls).toEqual([]);
  });

  it('RE-REGISTERS when the preference says on and the new bundle says off', () => {
    // Exactly the rename: the stamp came across in the migrated userData,
    // the SMAppService registration did not.
    mkdirSync(join(userData, 'gmux'), { recursive: true });
    writeFileSync(
      stampFile(),
      JSON.stringify({
        version: 1,
        openAtLogin: true,
        updatedAt: Date.now(),
        bundleId: 'com.specstory.gmux'
      })
    );
    os.openAtLogin = false;

    expect(reconcileLoginItem()).toEqual({
      action: 're-registered',
      openAtLogin: true
    });
    expect(os.calls).toEqual([true]);
    expect(getLoginItemState().openAtLogin).toBe(true);
  });

  it('reports a refusal instead of claiming success', () => {
    mkdirSync(join(userData, 'gmux'), { recursive: true });
    writeFileSync(
      stampFile(),
      JSON.stringify({
        version: 1,
        openAtLogin: true,
        updatedAt: Date.now(),
        bundleId: 'com.specstory.gmux'
      })
    );
    os.refuse = true;

    expect(reconcileLoginItem()).toEqual({
      action: 'refused',
      openAtLogin: false
    });
    // …and it is LOUD about it, because a dead login item is a reboot with no
    // sessions in it.
    expect(console.error).toHaveBeenCalled();
  });

  it('survives setLoginItemSettings throwing', () => {
    mkdirSync(join(userData, 'gmux'), { recursive: true });
    writeFileSync(
      stampFile(),
      JSON.stringify({
        version: 1,
        openAtLogin: true,
        updatedAt: Date.now(),
        bundleId: 'com.specstory.gmux'
      })
    );
    os.throws = true;
    expect(reconcileLoginItem().action).toBe('refused');
  });

  it('NEVER turns a login item on that the user turned off', () => {
    mkdirSync(join(userData, 'gmux'), { recursive: true });
    writeFileSync(
      stampFile(),
      JSON.stringify({
        version: 1,
        openAtLogin: false,
        updatedAt: Date.now(),
        bundleId: 'com.specstory.tortie'
      })
    );
    os.openAtLogin = true; // the user just enabled it in System Settings

    expect(reconcileLoginItem()).toEqual({ action: 'none', openAtLogin: true });
    expect(os.calls).toEqual([]);
  });

  it('is a no-op when the two already agree', () => {
    mkdirSync(join(userData, 'gmux'), { recursive: true });
    writeFileSync(
      stampFile(),
      JSON.stringify({
        version: 1,
        openAtLogin: true,
        updatedAt: Date.now(),
        bundleId: 'com.specstory.tortie'
      })
    );
    os.openAtLogin = true;
    expect(reconcileLoginItem()).toEqual({ action: 'none', openAtLogin: true });
    expect(os.calls).toEqual([]);
  });

  it('ignores a corrupt stamp rather than acting on it', () => {
    mkdirSync(join(userData, 'gmux'), { recursive: true });
    writeFileSync(stampFile(), 'not json');
    expect(reconcileLoginItem().action).toBe('unknown');
    expect(os.calls).toEqual([]);
  });
});
