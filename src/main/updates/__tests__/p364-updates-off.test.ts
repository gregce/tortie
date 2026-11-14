/**
 * Phase 364 (build/p364/SPEC.md D11, §5): the diagnostic build does not
 * update. Rule 7 of src/main/updates/updater.ts.
 *
 * The define is stubbed, never mocked: `vi.stubGlobal('__TORTIE_DIAGNOSTIC__')`
 * before a fresh import, so the real src/main/diagnostic-build/flag.ts reads
 * it exactly as the bundle does, and the real updater and the real dialog
 * module run over the electron and electron-updater seams the other updater
 * tests fake (staged-order.test.ts, updater-ring.test.ts).
 *
 * The diagnostic build: initUpdater writes one line and wires nothing (no
 * logger, no listener, no timer, no feed), so no check, download or install
 * can start, even after hours; checkForUpdatesNow answers `unsupported` and
 * asks nothing; Check for Updates shows §5's sentence. The normal build, the
 * same seams and the same calls: today's behaviour, unchanged.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface DialogCall {
  type?: string;
  message?: string;
  detail?: string;
  buttons?: string[];
}

const h = vi.hoisted(() => {
  const makeEmitter = (): {
    on: (event: string, cb: (...args: unknown[]) => void) => unknown;
    emit: (event: string, ...args: unknown[]) => void;
    events: string[];
    reset: () => void;
  } => {
    let handlers: Record<string, Array<(...args: unknown[]) => void>> = {};
    const emitter = {
      events: [] as string[],
      on(event: string, cb: (...args: unknown[]) => void) {
        (handlers[event] ??= []).push(cb);
        emitter.events.push(event);
        return emitter;
      },
      emit(event: string, ...args: unknown[]) {
        for (const cb of handlers[event] ?? []) cb(...args);
      },
      reset() {
        handlers = {};
        emitter.events = [];
      }
    };
    return emitter;
  };
  const native = makeEmitter();
  const libraryEvents = makeEmitter();
  /** electron-updater's autoUpdater: every touch is recorded. */
  const library: Record<string, unknown> = {
    on: libraryEvents.on,
    emit: libraryEvents.emit,
    checkCalls: 0,
    downloadCalls: 0,
    installCalls: 0,
    feeds: [] as unknown[],
    checkForUpdates: () => {
      library['checkCalls'] = (library['checkCalls'] as number) + 1;
      return Promise.resolve({
        isUpdateAvailable: false,
        updateInfo: { version: '0.114.1' }
      });
    },
    downloadUpdate: () => {
      library['downloadCalls'] = (library['downloadCalls'] as number) + 1;
      return Promise.resolve([]);
    },
    quitAndInstall: () => {
      library['installCalls'] = (library['installCalls'] as number) + 1;
    },
    setFeedURL: (options: unknown) => {
      (library['feeds'] as unknown[]).push(options);
    }
  };
  const resetLibrary = (): void => {
    libraryEvents.reset();
    library['checkCalls'] = 0;
    library['downloadCalls'] = 0;
    library['installCalls'] = 0;
    library['feeds'] = [];
    // The four settings initUpdater writes, unset so a write is visible.
    for (const key of ['logger', 'autoDownload', 'autoInstallOnAppQuit', 'allowDowngrade']) {
      delete library[key];
    }
  };
  return {
    native,
    libraryEvents,
    library,
    resetLibrary,
    packaged: true,
    userData: '',
    lines: [] as Array<{ level: string; message: string }>,
    dialogs: [] as DialogCall[],
    dialogThrows: false
  };
});

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name !== 'userData') throw new Error(`unexpected path: ${name}`);
      return h.userData;
    },
    getVersion: () => '0.114.1',
    get isPackaged() {
      return h.packaged;
    }
  },
  autoUpdater: h.native,
  dialog: {
    showMessageBox: (options: DialogCall) => {
      if (h.dialogThrows) return Promise.reject(new Error('no window to attach to'));
      h.dialogs.push(options);
      return Promise.resolve({ response: 0, checkboxChecked: false });
    }
  },
  BrowserWindow: class {}
}));

vi.mock('electron-updater', () => ({ autoUpdater: h.library }));

vi.mock('../log', () => ({
  logUpdateEvent: (level: string, message: string) => {
    h.lines.push({ level, message });
  }
}));

type Updater = typeof import('../updater');
type Ui = typeof import('../ui');

/** A fresh updater and dialog module, built with the define as given. */
async function freshModules(diagnostic: boolean): Promise<{ updater: Updater; ui: Ui }> {
  vi.stubGlobal('__TORTIE_DIAGNOSTIC__', diagnostic);
  vi.resetModules();
  const ui = await import('../ui');
  const updater = await import('../updater');
  return { updater, ui };
}

const SIX_HOURS_AND_A_BIT = 6 * 60 * 60 * 1000 + 31_000;

beforeEach(() => {
  h.userData = mkdtempSync(join(tmpdir(), 'p364-updates-off-'));
  h.packaged = true;
  h.lines = [];
  h.dialogs = [];
  h.dialogThrows = false;
  h.native.reset();
  h.resetLibrary();
  delete process.env['TORTIE_UPDATE_FEED'];
  delete process.env['GMUX_UPDATE_REHEARSAL'];
  vi.useFakeTimers({
    toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  delete process.env['TORTIE_UPDATE_FEED'];
  rmSync(h.userData, { recursive: true, force: true });
});

describe('the diagnostic build', () => {
  it('initUpdater writes one line and wires nothing: no logger, no listener, no timer, no feed', async () => {
    // A feed in the environment changes nothing: the gate is never reached.
    process.env['TORTIE_UPDATE_FEED'] = 'http://127.0.0.1:9/feed';
    const { updater } = await freshModules(true);
    updater.initUpdater();
    expect(h.lines).toEqual([
      { level: 'info', message: 'updates are off in this diagnostic build' }
    ]);
    for (const key of ['logger', 'autoDownload', 'autoInstallOnAppQuit', 'allowDowngrade']) {
      expect(h.library[key]).toBeUndefined();
    }
    expect(h.libraryEvents.events).toEqual([]);
    expect(h.native.events).toEqual([]);
    expect(h.library['feeds']).toEqual([]);
    expect(vi.getTimerCount()).toBe(0);

    // A second init is the initialized guard's, as today: nothing more.
    updater.initUpdater();
    expect(h.lines).toHaveLength(1);
  });

  it('no check, no download and no install ever start, however long it runs', async () => {
    const { updater } = await freshModules(true);
    updater.initUpdater();
    await vi.advanceTimersByTimeAsync(SIX_HOURS_AND_A_BIT * 2);
    expect(h.library['checkCalls']).toBe(0);
    expect(h.library['downloadCalls']).toBe(0);
    expect(h.library['installCalls']).toBe(0);
    // Nothing listens, so even the OS updater's own event stages nothing,
    // and the quit's hard exit never stands aside for an install.
    h.native.emit('update-downloaded');
    expect(updater.isUpdateStaged()).toBe(false);
    updater.installStagedUpdateNow();
    expect(h.library['installCalls']).toBe(0);
  });

  it('checkForUpdatesNow answers unsupported, asks nothing and draws no ring', async () => {
    const { updater } = await freshModules(true);
    updater.initUpdater();
    const outcome = await updater.checkForUpdatesNow();
    expect(outcome).toEqual({ kind: 'unsupported' });
    expect(h.library['checkCalls']).toBe(0);
    expect(updater.getUpdateUiState().ring).toBe('hidden');
  });

  it('Check for Updates shows the diagnostic sentence and asks nothing', async () => {
    const { ui } = await freshModules(true);
    await ui.runInteractiveUpdateCheck();
    expect(h.dialogs).toEqual([
      {
        type: 'info',
        message: 'Updates are off in this build',
        detail: 'This diagnostic build does not update itself. Install the normal release to go back.',
        buttons: ['OK'],
        defaultId: 0,
        cancelId: 0,
        noLink: true
      }
    ]);
    expect(h.library['checkCalls']).toBe(0);
  });

  it('is the diagnostic sentence in an unpackaged run too, where the development one would be false', async () => {
    h.packaged = false;
    const { ui } = await freshModules(true);
    await ui.runInteractiveUpdateCheck();
    expect(h.dialogs.map((d) => d.message)).toEqual(['Updates are off in this build']);
  });

  it('never rejects when its dialog cannot open, and says so in one line', async () => {
    h.dialogThrows = true;
    const { ui } = await freshModules(true);
    await expect(ui.runInteractiveUpdateCheck()).resolves.toBeUndefined();
    expect(h.lines).toEqual([
      { level: 'warn', message: 'the interactive check did not finish: no window to attach to' }
    ]);
  });
});

describe('the flag', () => {
  it('with no define at all, as a gate importing under tsx sees it, is the normal build and throws nothing', async () => {
    // The integrator's vitest define (or an earlier stub) may have put the
    // global on globalThis; take it off for this one import and put it back.
    const saved = Object.getOwnPropertyDescriptor(globalThis, '__TORTIE_DIAGNOSTIC__');
    delete (globalThis as Record<string, unknown>)['__TORTIE_DIAGNOSTIC__'];
    try {
      vi.resetModules();
      const flag = await import('../../diagnostic-build/flag');
      expect(flag.DIAGNOSTIC_BUILD).toBe(false);
      // build/p3333/sample.mjs reaches the updater this way inside npm run build.
      const updater = await import('../updater');
      updater.initUpdater();
      expect(h.lines.some((l) => l.message.includes('diagnostic'))).toBe(false);
    } finally {
      if (saved !== undefined) Object.defineProperty(globalThis, '__TORTIE_DIAGNOSTIC__', saved);
    }
  });

  it('only the boolean true turns it on', async () => {
    for (const [value, on] of [
      [true, true],
      [false, false],
      ['true', false],
      [1, false]
    ] as const) {
      vi.stubGlobal('__TORTIE_DIAGNOSTIC__', value);
      vi.resetModules();
      const flag = await import('../../diagnostic-build/flag');
      expect([value, flag.DIAGNOSTIC_BUILD]).toEqual([value, on]);
    }
  });
});

describe('the normal build, the same calls: today', () => {
  it('initUpdater wires the library, its listeners and its two timers, with no off line', async () => {
    const { updater } = await freshModules(false);
    updater.initUpdater();
    expect(h.lines.some((l) => l.message.includes('diagnostic'))).toBe(false);
    expect(typeof h.library['logger']).toBe('object');
    expect(h.library['autoDownload']).toBe(true);
    expect(h.library['autoInstallOnAppQuit']).toBe(true);
    expect(h.libraryEvents.events).toEqual(['update-downloaded', 'download-progress', 'error']);
    expect(h.native.events).toEqual(['update-downloaded']);
    expect(vi.getTimerCount()).toBe(2);

    // The first background check runs 30 seconds after the init, never at launch.
    await vi.advanceTimersByTimeAsync(29_000);
    expect(h.library['checkCalls']).toBe(0);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(h.library['checkCalls']).toBe(1);
  });

  it('checkForUpdatesNow asks the library', async () => {
    const { updater } = await freshModules(false);
    updater.initUpdater();
    const outcome = await updater.checkForUpdatesNow();
    expect(outcome).toEqual({ kind: 'none', currentVersion: '0.114.1' });
    expect(h.library['checkCalls']).toBe(1);
  });

  it('Check for Updates on a packaged app says you are up to date', async () => {
    const { ui, updater } = await freshModules(false);
    updater.initUpdater();
    await ui.runInteractiveUpdateCheck();
    expect(h.dialogs.map((d) => [d.message, d.detail])).toEqual([
      ['You are up to date', 'Tortie 0.114.1 is the newest version.']
    ]);
  });

  it('Check for Updates in a development build says so, as today', async () => {
    h.packaged = false;
    const { ui } = await freshModules(false);
    await ui.runInteractiveUpdateCheck();
    expect(h.dialogs.map((d) => [d.message, d.detail])).toEqual([
      ['Updates are not available here', 'This is a development build. It does not update itself.']
    ]);
    expect(h.library['checkCalls']).toBe(0);
  });
});
