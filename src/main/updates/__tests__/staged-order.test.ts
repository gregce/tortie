/**
 * Two subjects, both about the moment an update is handed over.
 *
 * PHASE 31. stagedVersion flips only on the NATIVE update-downloaded event,
 * never on the library's, and the ordering is pinned. The library's public
 * update-downloaded fires about 1.6 seconds before Squirrel has actually
 * staged anything, and a quit in that gap installs nothing. The operator's
 * first live update was announced off the public event and then never
 * installed. Both emitters are mocked at the seam here, so the pinned order
 * is: library event records the pending promise and stages nothing visible,
 * native event flips the staged state and notifies the surfaces.
 *
 * PHASE 43. Once an update has been handed to the installer, this run
 * checks no more. electron-updater clears its own download guard as soon as
 * the first cycle ends, so a later check re-stages from the cached zip, and
 * every Squirrel staging deletes the staged bundle the pending install is
 * waiting on. That is how the operator's machine reached a state on
 * 2026-08-15 where no update could install at all. The test below counts the
 * calls that reach the library, which is the only thing that matters: a
 * check that never reaches the library can never re-stage.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userDataDir = '';

const h = vi.hoisted(() => {
  const makeEmitter = (): {
    on: (event: string, cb: (...args: unknown[]) => void) => unknown;
    emit: (event: string, ...args: unknown[]) => void;
  } & Record<string, unknown> => {
    const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
    return {
      on(event: string, cb: (...args: unknown[]) => void) {
        (handlers[event] ??= []).push(cb);
        return this;
      },
      emit(event: string, ...args: unknown[]) {
        for (const cb of handlers[event] ?? []) cb(...args);
      }
    };
  };
  const library = makeEmitter();
  // How many checks reached electron-updater. The Phase 43 guard is proved
  // by this number not moving.
  const counters = { libraryChecks: 0 };
  library['checkForUpdates'] = () => {
    counters.libraryChecks += 1;
    return Promise.resolve({
      isUpdateAvailable: true,
      updateInfo: { version: '0.19.1' }
    });
  };
  return { native: makeEmitter(), library, counters };
});

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name !== 'userData') throw new Error(`unexpected path: ${name}`);
      return userDataDir;
    },
    getVersion: () => '0.19.0',
    isPackaged: true
  },
  // The ELECTRON BUILTIN autoUpdater, the native Squirrel wrapper.
  autoUpdater: h.native,
  BrowserWindow: class {}
}));

vi.mock('electron-updater', () => ({ autoUpdater: h.library }));

import { readUpdateState } from '../state';
import {
  checkForUpdatesNow,
  getUpdateUiState,
  initUpdater,
  onUpdateStateChanged,
  rearmUpdateChecks,
  setUpdaterRepairNeeded
} from '../updater';

/** Every line the shared log's console side wrote during one test. */
const consoleLines: string[] = [];

beforeEach(() => {
  userDataDir = mkdtempSync(join(tmpdir(), 'gmux-staged-order-test-'));
  // Only the two timer functions initUpdater schedules with. Date stays
  // real, because pendingRecordedAt is written from Date.now().
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval'] });
  delete process.env['TORTIE_UPDATE_FEED'];
  delete process.env['GMUX_TMUX_SOCKET'];
  consoleLines.length = 0;
  for (const name of ['log', 'warn', 'error'] as const) {
    vi.spyOn(console, name).mockImplementation((...args: unknown[]) => {
      consoleLines.push(args.map(String).join(' '));
    });
  }
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  rmSync(userDataDir, { recursive: true, force: true });
});

describe('the two staging events', () => {
  it('records on the library event and stages only on the native one', () => {
    const notifications: number[] = [];
    const unsubscribe = onUpdateStateChanged(() => notifications.push(1));

    initUpdater();

    // A native event with no download behind it is ignored.
    h.native.emit('update-downloaded');
    expect(getUpdateUiState().stagedVersion).toBe(null);

    // The library's event: the pending promise lands on disk, nothing is
    // staged, and no surface is notified. The menu must not move here.
    h.library.emit('update-downloaded', { version: '0.19.1' });
    expect(getUpdateUiState().stagedVersion).toBe(null);
    const afterDownload = readUpdateState();
    expect(afterDownload.pendingVersion).toBe('0.19.1');
    expect(afterDownload.pendingRecordedAt).toBeGreaterThan(0);
    expect(notifications).toEqual([]);

    // The native event: staged flips to the version the library recorded,
    // and the surfaces are told exactly once.
    h.native.emit('update-downloaded');
    expect(getUpdateUiState().stagedVersion).toBe('0.19.1');
    expect(notifications).toEqual([1]);

    // PHASE 35: both lines go to the shared log at scope "updates", so the
    // updater story reads in one file beside the boot before it and the boot
    // after it. `<userData>/logs/updates.log` retired with its rotation; the
    // legacy pair on an existing profile ages out through the startup prune.
    // The console side is what this test can read without an Electron
    // process, and it carries the same message the record does.
    const said = consoleLines.join('\n');
    expect(said).toContain(
      '[gmux-updates] update 0.19.1 is downloaded and staging has started'
    );
    expect(said).toContain(
      '[gmux-updates] update 0.19.1 is staged and installs when you quit'
    );

    unsubscribe();
  });
});

const NO_SECOND_STAGING =
  'Tortie is not checking for updates again, because it already handed an update to the installer in this run. ' +
  'A second check would delete the copy the installer is waiting on.';

describe('the no second staging guard (Phase 43)', () => {
  it('stops every check after the hand over and lets the re-arm undo it', async () => {
    initUpdater();
    // A clean slate, because the test above left this run's state behind.
    rearmUpdateChecks();
    h.counters.libraryChecks = 0;

    // Before the hand over the check reaches the library, as it always has.
    expect(await checkForUpdatesNow()).toEqual({
      kind: 'downloading',
      version: '0.19.1'
    });
    expect(h.counters.libraryChecks).toBe(1);

    // The hand over. This is the moment the loopback proxy went up and
    // Squirrel was told to fetch.
    h.library.emit('update-downloaded', { version: '0.19.1' });

    // Every later check answers from what this run already knows. The user
    // still gets the ordinary dialog, so the menu item is not dead.
    expect(await checkForUpdatesNow()).toEqual({
      kind: 'downloading',
      version: '0.19.1'
    });
    h.native.emit('update-downloaded');
    expect(await checkForUpdatesNow()).toEqual({
      kind: 'staged',
      version: '0.19.1'
    });
    expect(h.counters.libraryChecks).toBe(1);
    expect(consoleLines.join('\n')).toContain(NO_SECOND_STAGING);

    // The refusal is one line per run, not one line per check.
    const said = consoleLines.filter((l) => l.includes(NO_SECOND_STAGING));
    expect(said).toHaveLength(1);

    // The re-arm is the one way back, and it drops the staged state too,
    // because the bundle it named has just been removed.
    rearmUpdateChecks();
    expect(getUpdateUiState().stagedVersion).toBe(null);
    expect(await checkForUpdatesNow()).toEqual({
      kind: 'downloading',
      version: '0.19.1'
    });
    expect(h.counters.libraryChecks).toBe(2);
  });
});

describe('the repair flag (Phase 43)', () => {
  it('is false by default, follows the setter, and notifies only on a change', () => {
    let notifications = 0;
    const unsubscribe = onUpdateStateChanged(() => {
      notifications += 1;
    });
    setUpdaterRepairNeeded(false);
    expect(getUpdateUiState().needsUpdateRepair).toBe(false);
    expect(notifications).toBe(0);

    setUpdaterRepairNeeded(true);
    expect(getUpdateUiState().needsUpdateRepair).toBe(true);
    expect(notifications).toBe(1);

    setUpdaterRepairNeeded(true);
    expect(notifications).toBe(1);

    setUpdaterRepairNeeded(false);
    expect(getUpdateUiState().needsUpdateRepair).toBe(false);
    expect(notifications).toBe(2);
    unsubscribe();
  });
});
