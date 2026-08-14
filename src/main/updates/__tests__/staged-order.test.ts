/**
 * Phase 31 unit test: stagedVersion flips only on the NATIVE
 * update-downloaded event, never on the library's, and the ordering is
 * pinned.
 *
 * Why this matters. The library's public update-downloaded fires about 1.6
 * seconds before Squirrel has actually staged anything, and a quit in that
 * gap installs nothing. The operator's first live update was announced off
 * the public event and then never installed. Both emitters are mocked at
 * the seam here, so the pinned order is: library event records the pending
 * promise and stages nothing visible, native event flips the staged state
 * and notifies the surfaces.
 */

import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
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
  return { native: makeEmitter(), library: makeEmitter() };
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
  getUpdateUiState,
  initUpdater,
  onUpdateStateChanged
} from '../updater';

beforeEach(() => {
  userDataDir = mkdtempSync(join(tmpdir(), 'gmux-staged-order-test-'));
  // Only the two timer functions initUpdater schedules with. Date stays
  // real, because pendingRecordedAt is written from Date.now().
  vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval'] });
  delete process.env['TORTIE_UPDATE_FEED'];
  delete process.env['GMUX_TMUX_SOCKET'];
});

afterEach(() => {
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

    // Packaged builds persist both lines to <userData>/logs/updates.log.
    const logText = readFileSync(
      join(userDataDir, 'logs', 'updates.log'),
      'utf8'
    );
    expect(logText).toContain(
      'update 0.19.1 is downloaded and staging has started'
    );
    expect(logText).toContain(
      'update 0.19.1 is staged and installs when you quit'
    );

    unsubscribe();
  });
});
