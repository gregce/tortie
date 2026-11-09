/**
 * Phase 357.1 — the quit holds the session list open and ends at `will-quit`
 * (build/p3571/SPEC.md D1, D2, D6).
 *
 * THREE THINGS ARE DRIVEN HERE, with electron mocked, against the SHIPPING
 * modules rather than copies of them:
 *
 *   1. `disposeMainCapabilities` (src/main/capabilities.ts), run WHOLE with
 *      nothing installed. On its first synchronous lines, before anything is
 *      awaited, it sets the store's quit hold: a store asked to close in that
 *      same tick holds its connection open; and (round A, W1) it flushes the
 *      windows' storage, which a session not yet reachable cannot turn into a
 *      stopped quit. And it no longer ends the process for a connection left
 *      open, not even one a stopped store holds: Phase 357's last branch is
 *      gone, it answers `proceed`, clears no sentinel and sends no signal.
 *   2. The `will-quit` handler in src/main/index.ts, imported with every one of
 *      its imports stood in for, so nothing but its own module scope runs. It
 *      is registered once, at module scope (before `whenReady`, so before the
 *      log's own `will-quit`). When a session list connection is held at the
 *      quit and no update is staged, it prevents the default quit at once
 *      (round A), flushes the windows' storage, waits for the storage log with
 *      the one bound (`storageWritten`, stood in for here and driven over real
 *      files in src/main/quit/__tests__/storage-landing.test.ts), and only then
 *      clears the run sentinel and sends SIGKILL to this process; a flush that
 *      throws, or a wait that fails, stops neither of the last two (the
 *      landing round's F3). Otherwise, or with an update staged, it does
 *      nothing at all, so the quit proceeds as before and Squirrel's install on
 *      quit is untouched.
 *   3. `isUpdateStaged` (src/main/updates/updater.ts) answers the honest staged
 *      moment: false on the library's own download event, true only on the
 *      native one, false again after a re-arm.
 *
 * NOTHING HERE QUITS, RELAUNCHES OR KILLS ANYTHING: `app` is a recorder and
 * `process.kill` is stubbed before any handler runs. No window, no tmux, no
 * person's data; every database is under a scratch directory this file made.
 */

import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ManifestStore as Store } from '../manifest/store';

type Listener = (...args: unknown[]) => unknown;

/** What the mocked process did, in order. Hoisted: the mock factories read it. */
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
  library['checkForUpdates'] = () =>
    Promise.resolve({ isUpdateAvailable: true, updateInfo: { version: '0.114.2' } });
  return {
    order: [] as string[],
    userData: '',
    isPackaged: false,
    /** Every listener `app.on` and `app.once` were handed, by event. */
    appListeners: new Map<string, ((...args: unknown[]) => unknown)[]>(),
    /** What index.ts's stand-ins answer: the store's count of held connections, and the updater's. */
    held: 0,
    staged: false,
    /** The flush stand-in throws when set (F3). */
    flushThrows: false,
    /** The session's storage path, as `getStoragePath()` answers it (round A). */
    storagePath: '/scratch/profile' as string | null,
    /** What the wait stand-in answers; a case may hand it a promise it settles itself (round A). */
    waitAnswer: (): Promise<unknown> => Promise.resolve({ landing: 'settled', waitedMs: 151, moved: false }),
    lifecycle: 'running' as 'running' | 'quitting',
    native: makeEmitter(),
    library
  };
});

vi.mock('electron', () => {
  const listen = (event: string, cb: (...args: unknown[]) => unknown): void => {
    const list = h.appListeners.get(event) ?? [];
    list.push(cb);
    h.appListeners.set(event, list);
  };
  return {
    app: {
      on: listen,
      once: listen,
      quit: (): void => {
        h.order.push('app.quit');
      },
      relaunch: (): void => {
        h.order.push('app.relaunch');
      },
      exit: (): void => {
        h.order.push('app.exit');
      },
      getPath: (): string => h.userData,
      getVersion: (): string => '0.114.1',
      get isPackaged(): boolean {
        return h.isPackaged;
      },
      name: 'Tortie',
      whenReady: (): Promise<void> => new Promise<void>(() => undefined),
      isReady: (): boolean => false,
      requestSingleInstanceLock: (): boolean => true,
      commandLine: { appendSwitch: (): void => undefined },
      focus: (): void => undefined
    },
    BrowserWindow: class {
      static getAllWindows(): unknown[] {
        return [];
      }
    },
    dialog: { showErrorBox: (): void => undefined },
    ipcMain: { handle: (): void => undefined },
    session: {
      defaultSession: {
        flushStorageData: (): void => {
          h.order.push('flush');
          if (h.flushThrows) throw new Error('the storage flush failed');
        },
        getStoragePath: (): string | null => h.storagePath
      }
    },
    powerMonitor: { on: (): void => undefined, off: (): void => undefined },
    // The ELECTRON BUILTIN autoUpdater, the native Squirrel wrapper.
    autoUpdater: h.native
  };
});

h.userData = mkdtempSync(join(tmpdir(), 'tortie-p3571-quit-'));

const dirs: string[] = [];
const connections: Database.Database[] = [];

function scratchDir(): string {
  const dir = mkdtempSync(join(h.userData, 'case-'));
  dirs.push(dir);
  return dir;
}

function connectionOf(store: Store): Database.Database {
  return (store as unknown as { db: Database.Database }).db;
}

/** `process.kill`, stubbed and recorded: `kill <is this process> <signal>`. */
function stubKill(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
    h.order.push(`kill ${String(pid === process.pid)} ${String(signal)}`);
    return true;
  });
}

beforeEach(() => {
  h.order.length = 0;
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
  for (const db of connections.splice(0)) {
    if (db.open) db.close();
  }
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

afterAll(() => {
  rmSync(h.userData, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 1. The ordered disposer (D1, D2)
// ---------------------------------------------------------------------------

describe('disposeMainCapabilities sets the hold first and no longer ends the process (D1, D2)', () => {
  const STANDS_IN = ['../log', '../log/crash', '../tray'] as const;
  let caps: typeof import('../capabilities');
  let store: typeof import('../manifest/store');

  beforeAll(() => {
    // The sentinel clear, the crash log's repeat counts and the tray (the
    // disposer's last step) are recorded, not run.
    vi.doMock('../log', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../log')>()),
      clearLogRunSentinel: (): void => {
        h.order.push('sentinel');
      }
    }));
    vi.doMock('../log/crash', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../log/crash')>()),
      flushCrashRepeats: (): void => {
        h.order.push('crash.repeats');
      }
    }));
    vi.doMock('../tray', async (importOriginal) => ({
      ...(await importOriginal<typeof import('../tray')>()),
      disposeTray: (): void => {
        h.order.push('tray');
      }
    }));
  });

  afterAll(() => {
    for (const path of STANDS_IN) vi.doUnmock(path);
    vi.resetModules();
  });

  // A fresh disposer and store per case: the hold is module state that only
  // the process's end clears, so every case here is its own launch.
  beforeEach(async () => {
    vi.resetModules();
    caps = await import('../capabilities');
    store = await import('../manifest/store');
    expect(store.manifestConnectionsLeftOpen()).toBe(0);
  }, 60_000);

  it('control: before the disposer runs, a close closes as it always has', () => {
    const s = new store.ManifestStore(join(scratchDir(), 'manifest.db'));
    connections.push(connectionOf(s));
    s.close();
    expect(connectionOf(s).open).toBe(false);
    expect(store.manifestConnectionsLeftOpen()).toBe(0);
  });

  it('holds on its first synchronous lines: a close in the same tick holds, and the quit answers proceed', async () => {
    const s = new store.ManifestStore(join(scratchDir(), 'manifest.db'));
    connections.push(connectionOf(s));
    const kill = stubKill();

    const outcome = caps.disposeMainCapabilities();
    // Only the disposer's synchronous lines have run: nothing is awaited yet.
    // Round A (W1): the windows' storage flush is one of them, before the
    // crash log's repeat counts.
    expect(h.order).toEqual(['flush', 'crash.repeats']);
    s.close();
    expect(connectionOf(s).open).toBe(true);
    expect(store.manifestConnectionsLeftOpen()).toBe(1);

    await expect(outcome).resolves.toBe('proceed');
    // The tray is the disposer's last step; no sentinel clear and no signal
    // follow it, because the hard exit is `will-quit`'s now.
    expect(h.order).toEqual(['flush', 'crash.repeats', 'tray']);
    expect(kill).not.toHaveBeenCalled();
  });

  it('a storage flush that throws (no session yet) stops nothing: the hold is set and the quit answers proceed (round A, W1)', async () => {
    const s = new store.ManifestStore(join(scratchDir(), 'manifest.db'));
    connections.push(connectionOf(s));
    const kill = stubKill();
    h.flushThrows = true;
    try {
      const outcome = caps.disposeMainCapabilities();
      expect(h.order).toEqual(['flush', 'crash.repeats']);
      s.close();
      expect(connectionOf(s).open).toBe(true);
      expect(store.manifestConnectionsLeftOpen()).toBe(1);
      await expect(outcome).resolves.toBe('proceed');
      expect(h.order).toEqual(['flush', 'crash.repeats', 'tray']);
      expect(kill).not.toHaveBeenCalled();
    } finally {
      h.flushThrows = false;
    }
  });

  it('a connection a stopped store holds no longer ends the process inside the disposer (357’s branch moved)', async () => {
    const s = new store.ManifestStore(join(scratchDir(), 'manifest.db'));
    connections.push(connectionOf(s));
    store.setManifestFaultHook((op) => {
      if (op === 'listSessions') {
        throw new Database.SqliteError('database disk image is malformed', 'SQLITE_CORRUPT');
      }
    });
    expect(() => s.listSessions()).toThrow();
    store.setManifestFaultHook(null);
    // The file checked fine, so the store holds its connection open (357's D10).
    expect(store.manifestConnectionsLeftOpen()).toBe(1);
    const kill = stubKill();

    await expect(caps.disposeMainCapabilities()).resolves.toBe('proceed');
    expect(kill).not.toHaveBeenCalled();
    expect(h.order).toEqual(['flush', 'crash.repeats', 'tray']);
    // Still one connection, held, for `will-quit` to find.
    s.close();
    expect(store.manifestConnectionsLeftOpen()).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 2. The `will-quit` hard exit in src/main/index.ts (D2, D6)
// ---------------------------------------------------------------------------

const noop = (): void => undefined;
const never = <T>(): Promise<T> => new Promise<T>(() => undefined);
/** A logger that records only the quit's own line (round A), so its place in the order is read. */
const logger = {
  info: (msg: unknown): void => {
    if (typeof msg === 'string' && msg.startsWith('the remembered settings')) h.order.push('log');
  },
  warn: noop,
  error: noop,
  debug: noop
};

/**
 * Every module src/main/index.ts imports, stood in for, so importing it runs
 * its module scope and nothing else: no logging, no crash handlers, no user
 * data migration, no core. The three it reads at `will-quit` answer from `h`.
 * `./harness/launch-gate` and `@shared/ipc` are pure and stay real.
 */
const INDEX_IMPORTS: readonly (readonly [string, () => Record<string, unknown>])[] = [
  [
    '../capabilities',
    () => ({
      disposeMainCapabilities: (): Promise<string> => {
        h.order.push('dispose');
        // What the real disposer's hold makes of the core's close.
        h.held = 1;
        return Promise.resolve('proceed');
      },
      installMainCapabilities: () => (): Promise<string> => Promise.resolve('proceed')
    })
  ],
  ['../config/store', () => ({ initAgentOverlay: never })],
  ['../diagnostics/native-proof', () => ({ proveNativeModules: never })],
  ['../machines/store', () => ({ initMachines: never })],
  ['../diagnostics/process-gone', () => ({ installProcessGoneLogging: noop })],
  ['../diagnostics/milestones', () => ({ markMilestone: noop, MILESTONES: { appReady: 'a', windowShown: 'w' } })],
  ['../harness', () => ({ dispatchHarness: never })],
  ['../harness/usage-fixture', () => ({ installUsageFixture: noop })],
  ['../harness/keychain-harness', () => ({ installHarnessKeychain: noop })],
  ['../harness/vault-drive', () => ({ installVaultDrive: noop })],
  ['../harness/machine-seam', () => ({ installMachineSeam: noop })],
  ['../harness/push-seam', () => ({ installPushSeam: noop })],
  ['../harness/manifest-fault', () => ({ installManifestFault: noop })],
  ['../logins/ipc', () => ({ observeLoginsAtBoot: never, startLoginsWatch: never })],
  ['../env/watch', () => ({ startEnvWatch: noop, warmEnvAtBoot: never })],
  ['../cache/policy', () => ({ applyCachePolicy: noop })],
  [
    '../log',
    () => ({
      clearLogRunSentinel: (): void => {
        h.order.push('sentinel');
      },
      getLog: () => logger,
      initLogging: noop,
      logEvent: noop,
      runLogBootSequence: noop
    })
  ],
  ['../log/crash', () => ({ startCrashCapture: noop })],
  [
    '../manifest/store',
    () => ({ isManifestStopped: () => false, manifestConnectionsLeftOpen: () => h.held })
  ],
  [
    '../quit/storage-landing',
    () => ({
      storageWritten: (path: string | null, ms: number): Promise<unknown> => {
        h.order.push(`wait ${String(path)} ${String(ms)}`);
        return h.waitAnswer();
      }
    })
  ],
  ['../log/snapshot', () => ({ collectBootEnv: never })],
  ['../notice', () => ({ postDurabilityNotice: () => true })],
  ['../assets', () => ({ registerAssetSchemePrivileged: noop })],
  ['../preview', () => ({ PREVIEW_PRIVILEGED_SCHEME: { scheme: 'gmux-preview' } })],
  ['../sessions', () => ({ getGmuxCore: never })],
  ['../migrate', () => ({ migrateUserDataIfNeeded: () => ({}), showRenameNoticeOnce: never })],
  [
    '../lifecycle',
    () => ({
      appLifecycleState: () => h.lifecycle,
      markAppQuitting: (): void => {
        h.lifecycle = 'quitting';
      }
    })
  ],
  ['../manifest/refusal', () => ({ manifestRefusal: () => null })],
  ['../db/schema-version', () => ({ isSchemaRefusal: () => false })],
  ['../notice/refusal-screen', () => ({ presentManifestRefusal: never })],
  ['../restore', () => ({ reconcileLoginItem: () => ({}) })],
  ['../security/trusted-window', () => ({ applyTrustedWindowPolicy: noop })],
  ['../tray', () => ({ installTray: noop })],
  ['../power', () => ({ installPowerHandlers: noop })],
  ['../typed-events', () => ({ broadcastEvent: noop })],
  ['../proc/identity', () => ({ applyProcessIdentity: noop })],
  ['../proc/orphans', () => ({ reapOrphanedTmuxClients: never })],
  [
    '../settings/chrome',
    () => ({ followChromeHue: noop, schemeArgsNow: () => [], windowBackgroundNow: () => '#000000' })
  ],
  [
    '../shell',
    () => ({
      nudgeRenderer: noop,
      pickShellOpenPath: () => ({ path: null, dropped: [] }),
      setPendingShellOpen: noop
    })
  ],
  ['../shell/arrival', () => ({ resolveShellArrival: () => ({ kind: 'refused', reason: 'test' }) })],
  [
    '../updates/updater',
    () => ({ initUpdater: noop, isUpdateStaged: () => h.staged })
  ],
  ['../updates/self-check', () => ({ runPostUpdateSelfCheck: never })],
  ['../updates/ui', () => ({ announceRefusedInstallIfAny: never })]
];

/** The terms that make index.ts a harness launch; cleared so its branch is the person's. */
const HARNESS_TERMS = ['GMUX_SMOKE', 'GMUX_SHOT', 'GMUX_UPDATE_REHEARSAL', 'GMUX_PROBES'] as const;

describe('the will-quit hard exit (D2, D6)', () => {
  const savedEnv = new Map<string, string | undefined>();

  beforeAll(async () => {
    for (const term of HARNESS_TERMS) {
      savedEnv.set(term, process.env[term]);
      delete process.env[term];
    }
    vi.resetModules();
    for (const [path, factory] of INDEX_IMPORTS) vi.doMock(path, factory);
    h.appListeners.clear();
    await import('../index');
  }, 60_000);

  afterAll(() => {
    for (const [path] of INDEX_IMPORTS) vi.doUnmock(path);
    vi.resetModules();
    for (const term of HARNESS_TERMS) {
      const was = savedEnv.get(term);
      if (was === undefined) delete process.env[term];
      else process.env[term] = was;
    }
  });

  const settledWait = (): Promise<unknown> => Promise.resolve({ landing: 'settled', waitedMs: 151, moved: false });

  beforeEach(() => {
    h.held = 0;
    h.staged = false;
    h.flushThrows = false;
    h.storagePath = '/scratch/profile';
    h.waitAnswer = settledWait;
    h.lifecycle = 'running';
  });

  function listeners(event: string): Listener[] {
    return h.appListeners.get(event) ?? [];
  }

  /** Settles once the exit's last step ran: since round A the exit follows an awaited wait. */
  async function exited(): Promise<void> {
    await vi.waitFor(() => {
      expect(h.order).toContain('kill true SIGKILL');
    });
  }

  /**
   * Runs `fn` with this file's own catcher of unhandled rejections in place of
   * the runner's, and answers what it caught. The exit's async function
   * rejects after its `finally` when the flush or the wait threw; in the real
   * process the SIGKILL in that `finally` has ended everything by then.
   */
  async function catchingRejections(fn: () => Promise<void>): Promise<unknown[]> {
    const caught: unknown[] = [];
    const theirs = process.listeners('unhandledRejection');
    process.removeAllListeners('unhandledRejection');
    const mine = (reason: unknown): void => {
      caught.push(reason);
    };
    process.on('unhandledRejection', mine);
    try {
      await fn();
      await new Promise((r) => setTimeout(r, 25));
    } finally {
      process.off('unhandledRejection', mine);
      for (const l of theirs) process.on('unhandledRejection', l);
    }
    return caught;
  }

  /** One `will-quit`, as Electron emits it after the windows have closed. */
  function willQuit(): void {
    const [handler] = listeners('will-quit');
    expect(handler).toBeDefined();
    handler!({
      preventDefault: (): void => {
        h.order.push('prevent');
      }
    });
  }

  it('is registered once, at module scope, before whenReady and so before the log’s own will-quit', () => {
    // `whenReady` never resolves here, so every listener seen was registered
    // at module scope, and the log's (inside whenReady) can only come after.
    expect(listeners('will-quit')).toHaveLength(1);
    expect(listeners('before-quit')).toHaveLength(1);
  });

  it('with a connection held and nothing staged: prevent at once, flush, the bounded wait, then the sentinel and SIGKILL (round A)', async () => {
    const kill = stubKill();
    h.held = 1;
    willQuit();
    // Synchronously, inside will-quit itself: the default quit prevented (so
    // Node's teardown never runs), the flush, and the wait begun with the
    // session's storage path and the one bound.
    expect(h.order).toEqual(['prevent', 'flush', 'wait /scratch/profile 1000']);
    expect(kill).not.toHaveBeenCalled();
    await exited();
    expect(h.order).toEqual(['prevent', 'flush', 'wait /scratch/profile 1000', 'log', 'sentinel', 'kill true SIGKILL']);
    expect(kill).toHaveBeenCalledTimes(1);
    expect(kill).toHaveBeenCalledWith(process.pid, 'SIGKILL');
  });

  it('nothing ends the process until the wait answers (round A)', async () => {
    const kill = stubKill();
    h.held = 1;
    let answer: (v: unknown) => void = () => undefined;
    h.waitAnswer = () =>
      new Promise((resolve) => {
        answer = resolve;
      });
    willQuit();
    await new Promise((r) => setTimeout(r, 40));
    expect(h.order).toEqual(['prevent', 'flush', 'wait /scratch/profile 1000']);
    expect(kill).not.toHaveBeenCalled();
    answer({ landing: 'bound', waitedMs: 1000, moved: false });
    await exited();
    expect(h.order).toEqual(['prevent', 'flush', 'wait /scratch/profile 1000', 'log', 'sentinel', 'kill true SIGKILL']);
    expect(kill).toHaveBeenCalledTimes(1);
  });

  it('a session with no storage path still waits, with nothing to read, to the same bound (round A)', async () => {
    const kill = stubKill();
    h.held = 1;
    h.storagePath = null;
    willQuit();
    await exited();
    expect(h.order).toEqual(['prevent', 'flush', 'wait null 1000', 'log', 'sentinel', 'kill true SIGKILL']);
    expect(kill).toHaveBeenCalledTimes(1);
  });

  it('a flush that throws skips the wait but none of the exit: the sentinel is cleared and SIGKILL sent (F3)', async () => {
    const kill = stubKill();
    h.held = 1;
    h.flushThrows = true;
    const caught = await catchingRejections(async () => {
      willQuit();
      await exited();
    });
    expect(h.order).toEqual(['prevent', 'flush', 'sentinel', 'kill true SIGKILL']);
    expect(kill).toHaveBeenCalledTimes(1);
    expect(kill).toHaveBeenCalledWith(process.pid, 'SIGKILL');
    // The flush's own error goes on after the exit's steps; in the real
    // process nothing is left to receive it, because SIGKILL ended it.
    expect(caught.map((e) => (e as Error).message)).toEqual(['the storage flush failed']);
  });

  it('a wait that fails is the same: the sentinel is cleared and SIGKILL sent (round A)', async () => {
    const kill = stubKill();
    h.held = 1;
    h.waitAnswer = () => Promise.reject(new Error('the wait failed'));
    const caught = await catchingRejections(async () => {
      willQuit();
      await exited();
    });
    expect(h.order).toEqual(['prevent', 'flush', 'wait /scratch/profile 1000', 'sentinel', 'kill true SIGKILL']);
    expect(kill).toHaveBeenCalledTimes(1);
    expect(caught.map((e) => (e as Error).message)).toEqual(['the wait failed']);
  });

  it('any connection held is enough: two held is the same exit', async () => {
    const kill = stubKill();
    h.held = 2;
    willQuit();
    await exited();
    expect(h.order).toEqual(['prevent', 'flush', 'wait /scratch/profile 1000', 'log', 'sentinel', 'kill true SIGKILL']);
    expect(kill).toHaveBeenCalledTimes(1);
  });

  it('with nothing held (no session list was ever open), the quit proceeds as before', async () => {
    const kill = stubKill();
    h.held = 0;
    // Also a quit whose disposer threw before the core's dispose: nothing is
    // held, so it ends through Node's teardown. Since Phase 362 the menu's 3 s
    // fallback no longer quits once a quit has begun, so a long menu quit
    // reaches the dispose and the exit above (p362-quit-fallback.test.ts).
    willQuit();
    await new Promise((r) => setTimeout(r, 20));
    expect(h.order).toEqual([]);
    expect(kill).not.toHaveBeenCalled();
  });

  it('with an update staged, the quit proceeds as before, so the install on quit is untouched (D6)', async () => {
    const kill = stubKill();
    h.held = 1;
    h.staged = true;
    willQuit();
    await new Promise((r) => setTimeout(r, 20));
    // Not even the flush or the wait: the quit is today's, byte for byte, and
    // the log's own will-quit clears the sentinel as it always has.
    expect(h.order).toEqual([]);
    expect(kill).not.toHaveBeenCalled();
  });

  it('the whole quit: before-quit runs the disposer, quits once more, and will-quit ends it', async () => {
    const kill = stubKill();
    const [beforeQuit] = listeners('before-quit');
    expect(beforeQuit).toBeDefined();
    beforeQuit!({
      preventDefault: (): void => {
        h.order.push('before-quit.prevent');
      }
    });
    await vi.waitFor(() => {
      expect(h.order).toContain('app.quit');
    });
    expect(h.order).toEqual(['before-quit.prevent', 'dispose', 'app.quit']);
    // Electron closes the windows, then emits will-quit.
    willQuit();
    await exited();
    expect(h.order).toEqual([
      'before-quit.prevent',
      'dispose',
      'app.quit',
      'prevent',
      'flush',
      'wait /scratch/profile 1000',
      'log',
      'sentinel',
      'kill true SIGKILL'
    ]);
    expect(kill).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 3. The staged signal (D6)
// ---------------------------------------------------------------------------

describe('isUpdateStaged answers the honest staged moment (D6)', () => {
  let updater: typeof import('../updates/updater');

  beforeAll(async () => {
    vi.resetModules();
    vi.doMock('electron-updater', () => ({ autoUpdater: h.library }));
    updater = await import('../updates/updater');
  }, 60_000);

  afterAll(() => {
    vi.doUnmock('electron-updater');
    vi.resetModules();
  });

  beforeEach(() => {
    // Only the two timers initUpdater schedules with.
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval'] });
    delete process.env['TORTIE_UPDATE_FEED'];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is false until the OS updater stages, true from then, and false again after a re-arm', () => {
    h.isPackaged = true;
    try {
      expect(updater.isUpdateStaged()).toBe(false);
      updater.initUpdater();
      expect(updater.isUpdateStaged()).toBe(false);
      // The library's own event: downloaded, NOT staged. A quit here installs
      // nothing, so the hard exit has nothing to stand aside for.
      h.library.emit('update-downloaded', { version: '0.114.2' });
      expect(updater.isUpdateStaged()).toBe(false);
      // The native event: staged, a quit from here installs.
      h.native.emit('update-downloaded');
      expect(updater.isUpdateStaged()).toBe(true);
      expect(updater.getUpdateUiState().stagedVersion).toBe('0.114.2');
      // The repair's re-arm drops the staging, and the signal with it.
      updater.rearmUpdateChecks();
      expect(updater.isUpdateStaged()).toBe(false);
    } finally {
      h.isPackaged = false;
    }
  });
});
