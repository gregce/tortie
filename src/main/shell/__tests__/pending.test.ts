/**
 * The pending shell-open slot (Phase 51): at most one path, take-and-clear,
 * and a nudge that only fires at a window that exists and finished loading.
 *
 * Take-and-clear is the property that makes the double delivery coverage
 * (hydrate pull + menu-action pull) safe: whichever pull runs first gets
 * the path, and the other gets null.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

interface FakeWindow {
  isDestroyed(): boolean;
  webContents: { isDestroyed(): boolean; isLoading(): boolean };
}

let windows: FakeWindow[] = [];
let settingsWindows: Set<FakeWindow>;
const sendMenuAction = vi.fn();

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => windows
  }
}));
vi.mock('../../menu', () => ({
  sendMenuAction: (action: string) => sendMenuAction(action)
}));
vi.mock('../../settings/window', () => ({
  isSettingsWindow: (win: FakeWindow) => settingsWindows.has(win)
}));
vi.mock('../../log', () => ({
  getLog: () => ({
    error: () => undefined,
    warn: () => undefined,
    info: () => undefined,
    debug: () => undefined
  })
}));

import {
  nudgeRenderer,
  setPendingShellOpen,
  takePendingShellOpen
} from '../pending';

function fakeWindow(loading: boolean): FakeWindow {
  return {
    isDestroyed: () => false,
    webContents: { isDestroyed: () => false, isLoading: () => loading }
  };
}

beforeEach(() => {
  windows = [];
  settingsWindows = new Set();
  sendMenuAction.mockClear();
  takePendingShellOpen(); // drain whatever an earlier test left behind
});

describe('the slot', () => {
  it('is empty until something is set', () => {
    expect(takePendingShellOpen()).toBeNull();
  });

  it('take returns the path and CLEARS the slot', () => {
    setPendingShellOpen('/tmp/one');
    expect(takePendingShellOpen()).toBe('/tmp/one');
    expect(takePendingShellOpen()).toBeNull();
  });

  it('a newer path replaces an older one — at most one is ever held', () => {
    setPendingShellOpen('/tmp/older');
    setPendingShellOpen('/tmp/newer');
    expect(takePendingShellOpen()).toBe('/tmp/newer');
    expect(takePendingShellOpen()).toBeNull();
  });
});

describe('nudgeRenderer', () => {
  it('does nothing when no window exists', () => {
    nudgeRenderer();
    expect(sendMenuAction).not.toHaveBeenCalled();
  });

  it('skips a window that is still loading — its hydrate pull delivers', () => {
    windows = [fakeWindow(true)];
    nudgeRenderer();
    expect(sendMenuAction).not.toHaveBeenCalled();
  });

  it('sends shell-open-pending to a loaded window', () => {
    windows = [fakeWindow(false)];
    nudgeRenderer();
    expect(sendMenuAction).toHaveBeenCalledTimes(1);
    expect(sendMenuAction).toHaveBeenCalledWith('shell-open-pending');
  });

  it('never targets the Settings window', () => {
    const settings = fakeWindow(false);
    windows = [settings];
    settingsWindows = new Set([settings]);
    nudgeRenderer();
    expect(sendMenuAction).not.toHaveBeenCalled();
  });

  it('passes over the Settings window to reach the app window', () => {
    const settings = fakeWindow(false);
    const main = fakeWindow(false);
    windows = [settings, main];
    settingsWindows = new Set([settings]);
    nudgeRenderer();
    expect(sendMenuAction).toHaveBeenCalledWith('shell-open-pending');
  });
});
