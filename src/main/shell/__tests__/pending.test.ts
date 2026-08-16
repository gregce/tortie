/**
 * The pending shell-open slot (Phase 51, pair since Phase 61): at most one
 * folder-and-file pair, take-and-clear, and a nudge that only fires at a
 * window that exists and finished loading.
 *
 * Take-and-clear is the property that makes the double delivery coverage
 * (hydrate pull + menu-action pull) safe: whichever pull runs first gets
 * the pair, and the other gets null. The pair is set and taken together,
 * so a newer arrival can never mix its folder with an older arrival's file.
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
/** Every info line the module logged, so replacements can be asserted. */
const infoLines: string[] = [];
vi.mock('../../log', () => ({
  getLog: () => ({
    error: () => undefined,
    warn: () => undefined,
    info: (line: string) => {
      infoLines.push(line);
    },
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
  infoLines.length = 0;
  takePendingShellOpen(); // drain whatever an earlier test left behind
});

describe('the slot', () => {
  it('is empty until something is set', () => {
    expect(takePendingShellOpen()).toBeNull();
  });

  it('take returns the pair and CLEARS the slot', () => {
    setPendingShellOpen('/tmp/one');
    expect(takePendingShellOpen()).toEqual({ folder: '/tmp/one', file: null });
    expect(takePendingShellOpen()).toBeNull();
  });

  it('a file rides along with its folder and comes back with it', () => {
    setPendingShellOpen('/tmp/repo', '/tmp/repo/readme.md');
    expect(takePendingShellOpen()).toEqual({
      folder: '/tmp/repo',
      file: '/tmp/repo/readme.md'
    });
    expect(takePendingShellOpen()).toBeNull();
  });

  it('a newer arrival replaces an older one — at most one pair is ever held', () => {
    setPendingShellOpen('/tmp/older');
    setPendingShellOpen('/tmp/newer');
    expect(takePendingShellOpen()).toEqual({
      folder: '/tmp/newer',
      file: null
    });
    expect(takePendingShellOpen()).toBeNull();
  });

  it('replacement is WHOLE — a folder-only arrival never keeps an older file', () => {
    setPendingShellOpen('/tmp/repo', '/tmp/repo/readme.md');
    setPendingShellOpen('/tmp/other');
    expect(takePendingShellOpen()).toEqual({
      folder: '/tmp/other',
      file: null
    });
  });

  it('two files from one folder still replace each other, and each replacement is logged', () => {
    setPendingShellOpen('/tmp/repo', '/tmp/repo/a.md');
    setPendingShellOpen('/tmp/repo', '/tmp/repo/b.md');
    expect(takePendingShellOpen()).toEqual({
      folder: '/tmp/repo',
      file: '/tmp/repo/b.md'
    });
    expect(infoLines).toEqual([
      'a newer shell open replaced a pending one: /tmp/repo/b.md'
    ]);
  });

  it('setting the identical pair again logs no replacement', () => {
    setPendingShellOpen('/tmp/repo', '/tmp/repo/a.md');
    setPendingShellOpen('/tmp/repo', '/tmp/repo/a.md');
    expect(infoLines).toEqual([]);
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
