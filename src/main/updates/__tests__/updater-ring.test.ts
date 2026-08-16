/**
 * The engine's ring surface (Phase 58): the download-progress listener, the
 * 250 millisecond ring throttle with immediate stage changes, and the
 * promise that onUpdateStateChanged call sites did not change — the menu
 * never learns about progress ticks.
 *
 * Same seam mocks as staged-order.test.ts: both emitters are faked, so the
 * test drives the exact events electron-updater and the native autoUpdater
 * would emit, in order, and reads what getUpdateUiState answers.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';

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
  const answer = {
    isUpdateAvailable: true,
    version: '0.26.0',
    fail: false
  };
  library['checkForUpdates'] = () => {
    if (answer.fail) return Promise.reject(new Error('dead feed'));
    return Promise.resolve({
      isUpdateAvailable: answer.isUpdateAvailable,
      updateInfo: { version: answer.version }
    });
  };
  return { native: makeEmitter(), library, answer };
});

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name !== 'userData') throw new Error(`unexpected path: ${name}`);
      return userDataDir;
    },
    getVersion: () => '0.25.0',
    isPackaged: true
  },
  autoUpdater: h.native,
  BrowserWindow: class {}
}));

vi.mock('electron-updater', () => ({ autoUpdater: h.library }));

import {
  checkForUpdatesNow,
  getUpdateUiState,
  initUpdater,
  onUpdateRingChanged,
  onUpdateStateChanged,
  rearmUpdateChecks
} from '../updater';

// ONE fake timer session spans the file. initUpdater schedules its 30 second
// one-shot and its 6 hour interval exactly once (the initialized guard), and
// those timers live in the timer context that was active when it ran, so
// cycling real and fake timers per test would orphan them. setTimeout and
// setInterval cover the check timers and the ring throttle's trailing tick;
// clearTimeout must be faked WITH setTimeout or the throttle's cancel would
// be a real clearTimeout that cannot cancel a fake timer; Date covers the
// throttle's clock.
beforeAll(() => {
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'Date']
  });
});

afterAll(() => {
  vi.useRealTimers();
});

/**
 * Fire at least one background check: long enough for the 30 second
 * one-shot (first use) and for one 6 hour interval tick (every later use).
 */
async function runOneBackgroundCheck(): Promise<void> {
  await vi.advanceTimersByTimeAsync(6 * 60 * 60 * 1000 + 30_000);
}

beforeEach(() => {
  userDataDir = mkdtempSync(join(tmpdir(), 'gmux-updater-ring-test-'));
  delete process.env['TORTIE_UPDATE_FEED'];
  delete process.env['GMUX_TMUX_SOCKET'];
  h.answer.isUpdateAvailable = true;
  h.answer.version = '0.26.0';
  h.answer.fail = false;
  for (const name of ['log', 'warn', 'error'] as const) {
    vi.spyOn(console, name).mockImplementation(() => {});
  }
  // The module keeps run-scoped state; every test starts from a rearmed
  // engine so the previous test's journey cannot leak in.
  initUpdater();
  rearmUpdateChecks();
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(userDataDir, { recursive: true, force: true });
});

describe('the extended state', () => {
  it('carries the four ring fields, hidden and null at rest', () => {
    const state = getUpdateUiState();
    expect(state.ring).toBe('hidden');
    expect(state.ringVersion).toBe(null);
    expect(state.ringPercent).toBe(null);
    expect(state.failedDuring).toBe(null);
  });
});

describe('the user journey through the engine', () => {
  it('walks checking, downloading with real percent, staging, ready', async () => {
    const outcome = await checkForUpdatesNow();
    expect(outcome).toEqual({ kind: 'downloading', version: '0.26.0' });

    // No progress event has arrived yet: the determinate arc at 0 percent.
    let state = getUpdateUiState();
    expect(state.ring).toBe('downloading');
    expect(state.ringVersion).toBe('0.26.0');
    expect(state.ringPercent).toBe(0);

    // The progress listener pairs the version the check reported.
    h.library.emit('download-progress', { percent: 41.9 });
    state = getUpdateUiState();
    expect(state.ring).toBe('downloading');
    expect(state.ringPercent).toBe(41);

    // The hand over: the ring moves to staging, percent gone.
    h.library.emit('update-downloaded', { version: '0.26.0' });
    state = getUpdateUiState();
    expect(state.ring).toBe('staging');
    expect(state.ringPercent).toBe(null);

    // The native staged event: ready.
    h.native.emit('update-downloaded');
    state = getUpdateUiState();
    expect(state.ring).toBe('ready');
    expect(state.ringVersion).toBe('0.26.0');
    expect(state.stagedVersion).toBe('0.26.0');
  });

  it('shows failed with failedDuring checking when the user check throws', async () => {
    h.answer.fail = true;
    const outcome = await checkForUpdatesNow();
    expect(outcome).toEqual({ kind: 'failed' });
    const state = getUpdateUiState();
    expect(state.ring).toBe('failed');
    expect(state.failedDuring).toBe('checking');
  });

  it('hides the ring again when a user check finds nothing', async () => {
    h.answer.isUpdateAvailable = false;
    const outcome = await checkForUpdatesNow();
    expect(outcome).toEqual({ kind: 'none', currentVersion: '0.25.0' });
    expect(getUpdateUiState().ring).toBe('hidden');
  });
});

describe('background silence', () => {
  it('keeps the ring hidden through a whole background download and staging, then shows ready', async () => {
    await runOneBackgroundCheck();
    expect(getUpdateUiState().ring).toBe('hidden');

    // Progress events arrive: the journey tracks them, the ring says nothing.
    h.library.emit('download-progress', { percent: 63.2 });
    let state = getUpdateUiState();
    expect(state.ring).toBe('hidden');
    expect(state.ringVersion).toBe(null);
    expect(state.ringPercent).toBe(null);

    h.library.emit('update-downloaded', { version: '0.26.0' });
    expect(getUpdateUiState().ring).toBe('hidden');

    // Staged is the one moment a background journey may surface.
    h.native.emit('update-downloaded');
    state = getUpdateUiState();
    expect(state.ring).toBe('ready');
    expect(state.ringVersion).toBe('0.26.0');
  });

  it('a user check adopts a background download mid flight and keeps its percent', async () => {
    await runOneBackgroundCheck();
    h.library.emit('download-progress', { percent: 55.5 });
    expect(getUpdateUiState().ring).toBe('hidden');

    await checkForUpdatesNow();
    const state = getUpdateUiState();
    expect(state.ring).toBe('downloading');
    // Adopted, not restarted: the real percent survives, never reset to 0.
    expect(state.ringPercent).toBe(55);
  });

  it('a failed background check paints nothing', async () => {
    h.answer.fail = true;
    await runOneBackgroundCheck();
    h.library.emit('error', new Error('dead feed'));
    expect(getUpdateUiState().ring).toBe('hidden');
  });
});

describe('the ring throttle', () => {
  it('coalesces progress ticks to at most one notify per 250 ms, with a trailing tick', async () => {
    await checkForUpdatesNow();
    const notifies: number[] = [];
    const unsubscribe = onUpdateRingChanged(() => {
      notifies.push(getUpdateUiState().ringPercent ?? -1);
    });

    // Three ticks inside one throttle window: none fires immediately
    // (the stage change a moment ago reset the clock), one trailing tick
    // fires with the LATEST percent.
    h.library.emit('download-progress', { percent: 10 });
    h.library.emit('download-progress', { percent: 20 });
    h.library.emit('download-progress', { percent: 30 });
    expect(notifies).toEqual([]);

    await vi.advanceTimersByTimeAsync(250);
    expect(notifies).toEqual([30]);

    // A quiet spell, then one tick: it fires immediately.
    await vi.advanceTimersByTimeAsync(1_000);
    h.library.emit('download-progress', { percent: 44 });
    expect(notifies).toEqual([30, 44]);

    unsubscribe();
  });

  it('a stage change fires immediately regardless of the throttle', async () => {
    await checkForUpdatesNow();
    const stages: string[] = [];
    const unsubscribe = onUpdateRingChanged(() => {
      stages.push(getUpdateUiState().ring);
    });

    // A progress tick inside the window is held...
    h.library.emit('download-progress', { percent: 99 });
    expect(stages).toEqual([]);

    // ...but the hand over does not wait.
    h.library.emit('update-downloaded', { version: '0.26.0' });
    expect(stages).toEqual(['staging']);

    // And the held trailing tick was cancelled: nothing else fires.
    await vi.advanceTimersByTimeAsync(1_000);
    expect(stages).toEqual(['staging']);

    unsubscribe();
  });
});

describe('the menu listeners are untouched', () => {
  it('never notifies onUpdateStateChanged for a progress tick', async () => {
    let menuNotifies = 0;
    const unsubscribe = onUpdateStateChanged(() => {
      menuNotifies += 1;
    });

    await checkForUpdatesNow();
    // The check completing notifies the menu, exactly as before Phase 58.
    const afterCheck = menuNotifies;
    expect(afterCheck).toBeGreaterThan(0);

    // A storm of progress ticks moves the menu not at all.
    for (let i = 0; i < 50; i += 1) {
      h.library.emit('download-progress', { percent: i * 2 });
      await vi.advanceTimersByTimeAsync(300);
    }
    expect(menuNotifies).toBe(afterCheck);

    // The staged flip notifies the menu once, exactly as before.
    h.library.emit('update-downloaded', { version: '0.26.0' });
    expect(menuNotifies).toBe(afterCheck);
    h.native.emit('update-downloaded');
    expect(menuNotifies).toBe(afterCheck + 1);

    unsubscribe();
  });

  it('every menu notify also reaches the ring listeners', async () => {
    let ringNotifies = 0;
    const unsubscribe = onUpdateRingChanged(() => {
      ringNotifies += 1;
    });
    // rearmUpdateChecks ends in notifyStateChanged; the ring hears it too.
    rearmUpdateChecks();
    expect(ringNotifies).toBeGreaterThan(0);
    unsubscribe();
  });
});

describe('rearm clears the ring', () => {
  it('drops a ready ring, because the staged copy is gone', async () => {
    await checkForUpdatesNow();
    h.library.emit('update-downloaded', { version: '0.26.0' });
    h.native.emit('update-downloaded');
    expect(getUpdateUiState().ring).toBe('ready');

    rearmUpdateChecks();
    const state = getUpdateUiState();
    expect(state.ring).toBe('hidden');
    expect(state.stagedVersion).toBe(null);
  });
});
